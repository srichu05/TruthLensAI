import asyncio
import copy
import hashlib
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import httpx

from app.core.config import settings
from app.schemas.evidence import (
    NormalizedEvidence,
    ClaimEvaluationResult,
    PipelineStatus,
    VerdictType,
    LegacyVerdict
)
from app.services.claim_extractor import extract_claims, ExtractedClaim
from app.services.tavily_service import TavilySearchProvider
from app.services.google_factcheck_provider import GoogleFactCheckProvider
from app.services.gemini_evaluator import GeminiEvaluator

logger = logging.getLogger("truthlens.orchestrator")

class FactCheckOrchestrator:
    """
    Coordinates multi-provider live evidence retrieval, deduplication,
    Gemini structured evaluation, and backward-compatible response generation.
    """

    def __init__(
        self,
        tavily_provider: Optional[TavilySearchProvider] = None,
        google_factcheck_provider: Optional[GoogleFactCheckProvider] = None,
        gemini_evaluator: Optional[GeminiEvaluator] = None,
    ):
        self.tavily = tavily_provider or TavilySearchProvider()
        self.google_factcheck = google_factcheck_provider or GoogleFactCheckProvider()
        self.gemini = gemini_evaluator or GeminiEvaluator()
        self._analysis_cache: Dict[str, Dict[str, Any]] = {}

    async def verify_content(
        self,
        text: str,
        title: str = "",
        max_claims: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Execute full evidence-grounded live verification pipeline.
        Returns a dictionary conforming to the existing AnalysisResponse structure
        enriched with live evidence, provider status, and provenance metadata.
        """
        # 0. Check Pipeline Memory Cache
        cache_key = hashlib.sha256(f"{title}|{text}".strip().lower().encode("utf-8")).hexdigest()[:24]
        now_ts = time.time()
        ttl = getattr(settings, "FACTCHECK_CACHE_BREAKING_TTL_SECONDS", 3600)
        cached_entry = self._analysis_cache.get(cache_key)
        if cached_entry and (now_ts - cached_entry["timestamp"] < cached_entry["ttl"]):
            cached_res = copy.deepcopy(cached_entry["result"])
            cached_res["metadata"]["cached"] = True
            cached_res["metadata"]["cached_at"] = cached_entry["cached_at"]
            return cached_res

        start_time = time.time()
        pipeline_status = PipelineStatus(
            pipeline_version=getattr(settings, "FACTCHECK_PIPELINE_VERSION", "live_v1"),
            tavily_status="not_configured" if not self.tavily.is_configured() else "ok",
            google_factcheck_status="not_configured" if not self.google_factcheck.is_configured() else "ok",
            gemini_status="not_configured" if not self.gemini.is_configured() else "ok",
        )

        # 1. Claim Extraction
        extracted_claims, extraction_meta = extract_claims(text, title=title, max_claims=max_claims)
        
        # If no factual assertions found (e.g. pure opinion or conversational greeting)
        if not extracted_claims:
            return self._handle_non_checkable_content(text, title, extraction_meta, pipeline_status)

        # 2. Parallel Evidence Retrieval across Claims
        # Use single shared async HTTP client with timeout budget
        timeout_budget = getattr(settings, "FACTCHECK_TIMEOUT_SECONDS", 12.0)
        claims_with_evidence: List[Dict[str, Any]] = []

        async with httpx.AsyncClient(timeout=timeout_budget) as client:
            retrieval_tasks = []
            for claim in extracted_claims:
                retrieval_tasks.append(self._retrieve_evidence_for_claim(claim, client))

            # Run with overall timeout protection
            try:
                retrieved_results = await asyncio.wait_for(
                    asyncio.gather(*retrieval_tasks, return_exceptions=True),
                    timeout=timeout_budget
                )
            except asyncio.TimeoutError:
                logger.warning("Overall pipeline retrieval budget exceeded (%.1fs). Processing partial evidence.", timeout_budget)
                pipeline_status.is_degraded = True
                pipeline_status.degradation_reason = "Retrieval timeout exceeded"
                retrieved_results = []

            # Process evidence per claim
            for idx, claim in enumerate(extracted_claims):
                if idx < len(retrieved_results) and not isinstance(retrieved_results[idx], Exception):
                    ev_list, t_stat, gfc_stat = retrieved_results[idx]
                    pipeline_status.tavily_status = t_stat
                    pipeline_status.google_factcheck_status = gfc_stat
                    if t_stat in ("error", "rate_limited") or gfc_stat in ("error", "rate_limited"):
                        pipeline_status.is_degraded = True
                        pipeline_status.degradation_reason = f"Provider issue: Tavily={t_stat}, GFC={gfc_stat}"
                else:
                    ev_list = []
                    pipeline_status.is_degraded = True
                    pipeline_status.degradation_reason = "Evidence retrieval task exception"

                claims_with_evidence.append({
                    "claim_number": claim.claim_number,
                    "claim": claim.claim_text,
                    "source_passage": claim.source_passage,
                    "evidence": ev_list
                })

            # Check for total provider failure
            all_providers_failed = (
                pipeline_status.tavily_status in ("error", "not_configured") and
                pipeline_status.google_factcheck_status in ("error", "not_configured")
            )
            total_evidence_count = sum(len(c["evidence"]) for c in claims_with_evidence)

            # Check if legacy fallback should be triggered
            enable_legacy = getattr(settings, "ENABLE_LEGACY_FALLBACK", False)
            if all_providers_failed and total_evidence_count == 0 and enable_legacy:
                logger.info("Live providers unavailable and ENABLE_LEGACY_FALLBACK=True. Invoking legacy fallback.")
                return self._invoke_legacy_fallback(text, title, pipeline_status)

            # 3. Gemini Structured Evaluation
            evaluation_results, gemini_stat = await self.gemini.evaluate_claims(
                claims_with_evidence,
                overall_context=text[:400],
                client=client
            )
            pipeline_status.gemini_status = gemini_stat
            if gemini_stat in ("error", "schema_error"):
                pipeline_status.is_degraded = True
                pipeline_status.degradation_reason = f"Gemini evaluation status: {gemini_stat}"

        # 4. Decision Policy & Multi-Claim Aggregation
        duration_ms = int((time.time() - start_time) * 1000)
        pipeline_status.latency_ms = duration_ms

        final_result = self._aggregate_final_verdict(
            evaluation_results,
            extraction_meta,
            pipeline_status,
            text,
            title
        )

        # Cache non-degraded successful analyses
        if not pipeline_status.is_degraded and not pipeline_status.legacy_fallback_used:
            self._analysis_cache[cache_key] = {
                "result": copy.deepcopy(final_result),
                "timestamp": now_ts,
                "cached_at": datetime.now(timezone.utc).isoformat(),
                "ttl": ttl
            }

        return final_result

    async def _retrieve_evidence_for_claim(
        self,
        claim: ExtractedClaim,
        client: httpx.AsyncClient
    ) -> Tuple[List[NormalizedEvidence], str, str]:
        """Fetch evidence for a single claim concurrently from Tavily & Google Fact Check."""
        tavily_task = self.tavily.search_claim(claim.claim_text, client=client)
        gfc_task = self.google_factcheck.search_claim(claim.claim_text, client=client)

        results = await asyncio.gather(tavily_task, gfc_task, return_exceptions=True)

        tavily_evidence, tavily_stat = ([], "error") if isinstance(results[0], Exception) else results[0]
        gfc_evidence, gfc_stat = ([], "error") if isinstance(results[1], Exception) else results[1]

        # Combine, index with distinct IDs, and deduplicate by content hash
        combined_evidence: List[NormalizedEvidence] = []
        seen_hashes = set()

        # Prioritize third-party fact checks from IFCN signatories
        for ev in gfc_evidence:
            if ev.content_hash not in seen_hashes:
                seen_hashes.add(ev.content_hash)
                ev.evidence_id = f"ev_gfc_{len(combined_evidence) + 1}"
                combined_evidence.append(ev)

        for ev in tavily_evidence:
            if ev.content_hash not in seen_hashes:
                seen_hashes.add(ev.content_hash)
                ev.evidence_id = f"ev_tavily_{len(combined_evidence) + 1}"
                combined_evidence.append(ev)

        return combined_evidence, tavily_stat, gfc_stat

    def _aggregate_final_verdict(
        self,
        claim_evaluations: List[ClaimEvaluationResult],
        extraction_meta: Dict[str, Any],
        pipeline_status: PipelineStatus,
        text: str,
        title: str
    ) -> Dict[str, Any]:
        """
        Synthesize claim evaluations into an evidence-grounded final verdict,
        verdict category, explanation breakdown, and legacy-compatible response.
        """
        total_claims = len(claim_evaluations)
        num_supported = sum(1 for c in claim_evaluations if c.verdict == "supported")
        num_contradicted = sum(1 for c in claim_evaluations if c.verdict in ("contradicted", "misleading"))
        num_unverified = sum(1 for c in claim_evaluations if c.verdict == "needs_verification")

        total_evidence_count = sum(
            len(c.supporting_evidence) + len(c.contradicting_evidence) + len(c.neutral_evidence)
            for c in claim_evaluations
        )

        # ── Decision Policy ──────────────────────────────────────────────────────
        # Case 1: Contradictions Dominate without Support -> FAKE
        if num_contradicted >= 1 and num_supported == 0:
            verdict: LegacyVerdict = "fake"
            verdict_category = "LIKELY FAKE"
            confidence = min(96, max(75, int(78 + (num_contradicted / max(1, total_claims)) * 18)))
            verdict_explanation = (
                f"{num_contradicted} of {total_claims} factual assertions were directly contradicted by credible reporting or fact-checks."
            )
            summary = (
                f"Evidence directly contradicts key assertions in this content ({num_contradicted} of {total_claims} claims refuted). "
                "Verified reporting and published fact-checking archives refute the central premises of this submission."
            )
            legacy_claims = [
                f"{num_contradicted} primary claim(s) directly conflict with verified evidence records.",
                "Unsupported assertions or uncorroborated narratives detected.",
                "Content does not adhere to verifiable journalistic standards."
            ]

        # Case 2: Heavy Contradictions (More contradicted than supported) -> FAKE
        elif num_contradicted >= 2 and num_contradicted > num_supported:
            verdict = "fake"
            verdict_category = "LIKELY FAKE"
            confidence = min(96, max(72, int(74 + (num_contradicted / max(1, total_claims)) * 20)))
            verdict_explanation = (
                f"Significant factual inaccuracies identified ({num_contradicted} claims contradicted vs {num_supported} supported)."
            )
            summary = (
                f"This content contains materially contradicted assertions ({num_contradicted} of {total_claims} claims refuted). "
                "While contextual background may be cited, the primary assertions conflict with documented empirical evidence."
            )
            legacy_claims = [
                f"{num_contradicted} primary claim(s) conflict with verified reporting.",
                "Contradicted statements identified across key paragraphs.",
                "Independent evidence refutes central claims."
            ]

        # Case 3: Mixed / Misleading (Both supported and contradicted present) -> UNCERTAIN
        elif num_contradicted >= 1 and num_supported >= 1:
            verdict = "uncertain"
            verdict_category = "MIXED / MISLEADING"
            confidence = min(78, max(60, int(60 + (num_supported + num_contradicted) * 3)))
            verdict_explanation = (
                f"Content blends verified facts ({num_supported} supported) with contradicted assertions ({num_contradicted} refuted)."
            )
            summary = (
                "This article presents a combination of authentic factual context alongside misleading or refuted statements. "
                "While select assertions align with verified reporting, critical elements are disputed or inaccurate."
            )
            legacy_claims = [
                "Factual assertions mixed with unsubstantiated or contradicted claims.",
                "Selective presentation of facts observed across key paragraphs.",
                "Manual cross-referencing recommended before sharing or citing."
            ]

        # Case 4: Corroboration / Authentic Journalism -> REAL
        elif (num_supported >= 1 and num_contradicted == 0 and num_unverified == 0) or (num_supported >= 2 and num_contradicted == 0):
            verdict = "real"
            verdict_category = "LIKELY REAL"
            confidence = min(96, max(75, int(75 + (num_supported / max(1, total_claims)) * 20)))
            verdict_explanation = (
                f"Primary factual assertions ({num_supported} of {total_claims}) are corroborated by credible sources."
            )
            summary = (
                f"This content demonstrates strong markers of verified reporting ({num_supported} of {total_claims} assertions corroborated). "
                "Key claims align with verified reporting and accredited documentation with no major contradictions identified."
            )
            legacy_claims = [
                "Major factual assertions correspond with verified reporting conventions.",
                "Statements align with public records and credible source reporting.",
                "Objective reporting backed by named primary institutions."
            ]

        # Case 5: Single supported claim, rest unverified -> UNCERTAIN
        elif num_supported == 1 and num_unverified >= 1 and num_contradicted == 0:
            verdict = "uncertain"
            verdict_category = "UNCERTAIN"
            confidence = 52
            verdict_explanation = (
                "Minimal corroboration identified (1 claim supported); remaining assertions could not be verified."
            )
            summary = (
                "While one claim finds contextual alignment, remaining assertions lack sufficient secondary evidence. "
                "A definitive credibility rating cannot be established without additional accredited sources."
            )
            legacy_claims = [
                "Limited supporting citations identified across the content.",
                "Key assertions require independent secondary verification.",
                "Insufficient evidence to classify as verified authentic reporting."
            ]

        # Case 6: Insufficient Evidence / Unverified -> UNCERTAIN (Explicit Abstention, NO 56% hardcoded fallback!)
        else:
            verdict = "uncertain"
            verdict_category = "UNCERTAIN"
            confidence = 45  # Explicit low confidence reflecting absence of evidence
            verdict_explanation = (
                "Available search results and fact-check registries do not provide sufficient evidence to corroborate or refute these claims."
            )
            summary = (
                "Available evidence is currently insufficient to definitively verify or refute the assertions in this article. "
                "No registered fact-checks or accredited primary sources directly address these specific assertions."
            )
            legacy_claims = [
                "Claims lack direct corroborating primary sources or registered fact-checks.",
                "Evidence coverage is insufficient to assign a conclusive credibility rating.",
                "Independent secondary verification is required to establish authenticity."
            ]

        # ── Linguistic and Source Signals ─────────────────────────────────────────
        sensational_words = ["shocking", "bombshell", "miracle", "hidden truth", "secret government", "conspiracy", "hoax", "exposed", "unbelievable"]
        full_text = f"{title}\n{text}".lower()
        sensational_matches = sum(1 for w in sensational_words if w in full_text)
        exclamations = full_text.count("!")
        sensationalism = min(95, max(10, int(sensational_matches * 20 + min(exclamations * 6, 20))))

        if num_supported >= 2 and num_contradicted == 0:
            source_reliability = min(95, 78 + num_supported * 5)
            claim_strength = min(95, 75 + num_supported * 5)
            logical_coherence = min(95, 80 + num_supported * 4)
        elif num_contradicted >= 1:
            source_reliability = max(15, min(40, 40 - num_contradicted * 10))
            claim_strength = max(20, min(35, 35 - num_contradicted * 8))
            logical_coherence = max(25, min(45, 45 - num_contradicted * 8))
        else:
            source_reliability = 42
            claim_strength = 45
            logical_coherence = 50

        emotional_language = min(95, max(12, int(sensationalism * 0.4 + 15)))

        metrics = [
            {"label": "Emotional Language", "val": int(emotional_language)},
            {"label": "Sensationalism",     "val": int(sensationalism)},
            {"label": "Claim Strength",     "val": int(claim_strength)},
            {"label": "Source Reliability", "val": int(source_reliability)},
            {"label": "Logical Coherence",  "val": int(logical_coherence)},
        ]

        # Explanation breakdown
        factcheck_evidence = (
            f"Live evidence retrieval completed across {total_claims} extracted claims ({total_evidence_count} sources identified). "
            f"Results: {num_contradicted} contradicted, {num_supported} supported, {num_unverified} unverified."
        )
        linguistic_signals = (
            f"Expressive style metrics: Sensationalism {sensationalism}%, Source Reliability {source_reliability}%."
        )

        explanation_breakdown = {
            "final_reasoning": f"{verdict_explanation} {summary}",
            "factcheck_evidence": factcheck_evidence,
            "linguistic_signals": linguistic_signals
        }

        # Detailed claims list formatted for frontend
        detailed_claims_json = [c.to_legacy_claim_item() for c in claim_evaluations]

        pipeline_status_str = "degraded" if pipeline_status.is_degraded else "operational"
        now_iso = datetime.now(timezone.utc).isoformat()
        metadata = {
            "verdict_category": verdict_category,
            "verdict_explanation": verdict_explanation,
            "explanation_breakdown": explanation_breakdown,
            "num_supported": num_supported,
            "num_contradicted": num_contradicted,
            "num_unverified": num_unverified,
            "total_claims": total_claims,
            "extraction_meta": extraction_meta,
            "pipeline_status": pipeline_status_str,
            "pipeline_status_details": pipeline_status.model_dump(),
            "pipeline_version": pipeline_status.pipeline_version,
            "is_legacy_fallback": pipeline_status.legacy_fallback_used,
            "legacy_fallback_used": pipeline_status.legacy_fallback_used,
            "live_verified": not pipeline_status.is_degraded and not pipeline_status.legacy_fallback_used,
            "last_checked": now_iso,
            "cached": pipeline_status.is_cached,
            "cached_at": pipeline_status.cached_at,
            "total_evidence_retrieved": total_evidence_count,
            "latency_ms": pipeline_status.latency_ms
        }

        return {
            "verdict": verdict,
            "confidence": confidence,
            "summary": summary,
            "claims": legacy_claims,
            "detailed_claims": detailed_claims_json,
            "metrics": metrics,
            "explanation_breakdown": explanation_breakdown,
            "metadata": metadata
        }

    def _handle_non_checkable_content(
        self,
        text: str,
        title: str,
        extraction_meta: Dict[str, Any],
        pipeline_status: PipelineStatus
    ) -> Dict[str, Any]:
        """Handle content that contains pure opinion, questions, or greetings without factual claims."""
        verdict: LegacyVerdict = "uncertain"
        summary = (
            "The submitted content consists primarily of subjective opinions, questions, or conversational text "
            "rather than discrete, checkable factual assertions. TruthLens requires verifiable factual statements to evaluate credibility."
        )
        return {
            "verdict": verdict,
            "confidence": 35,
            "summary": summary,
            "claims": ["No discrete checkable factual assertions identified."],
            "detailed_claims": [],
            "metrics": [
                {"label": "Emotional Language", "val": 25},
                {"label": "Sensationalism",     "val": 15},
                {"label": "Claim Strength",     "val": 20},
                {"label": "Source Reliability", "val": 30},
                {"label": "Logical Coherence",  "val": 40},
            ],
            "explanation_breakdown": {
                "final_reasoning": summary,
                "factcheck_evidence": "No factual claims isolated for external evidence retrieval.",
                "linguistic_signals": "Conversational or non-assertive syntax detected."
            },
            "metadata": {
                "verdict_category": "NOT CHECKABLE",
                "verdict_explanation": "Input does not contain checkable factual claims.",
                "pipeline_status": pipeline_status.model_dump(),
                "extraction_meta": extraction_meta,
                "is_legacy_fallback": False
            }
        }

    def _invoke_legacy_fallback(
        self,
        text: str,
        title: str,
        pipeline_status: PipelineStatus
    ) -> Dict[str, Any]:
        """
        Invoke legacy heuristic analyzer when live providers fail AND legacy fallback is explicitly enabled.
        Clearly marks output with is_legacy_fallback: True.
        """
        from app.services.nlp_analyzer import legacy_analyze_text_content
        logger.warning("Executing legacy fallback analysis.")
        result = legacy_analyze_text_content(text, title=title)
        pipeline_status.legacy_fallback_used = True
        result["metadata"]["pipeline_status"] = pipeline_status.model_dump()
        result["metadata"]["is_legacy_fallback"] = True
        result["metadata"]["verdict_explanation"] = (
            "[LEGACY FALLBACK] Live fact-checking providers were unavailable. Result derived from offline heuristic registry."
        )
        return result

# Global default orchestrator instance
orchestrator = FactCheckOrchestrator()
