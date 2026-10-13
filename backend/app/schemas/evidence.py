import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict

VerdictType = Literal[
    "REAL",
    "FAKE",
    "MIXED",
    "MISLEADING",
    "UNVERIFIED",
    "VERIFICATION_UNAVAILABLE",
    "NOT_CHECKABLE"
]

LegacyVerdict = Literal["real", "fake", "uncertain"]

class NormalizedEvidence(BaseModel):
    """
    Provider-independent normalized evidence representation.
    Preserves provenance from retrieval through evaluation to response.
    """
    model_config = ConfigDict(extra="ignore")

    evidence_id: str
    provider: Literal["tavily", "google_factcheck", "legacy_registry", "web_direct"]
    title: str = ""
    url: Optional[str] = None
    publisher: str = "Unknown Publisher"
    published_at: Optional[str] = None
    retrieved_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    snippet: str = ""
    relevant_passage: Optional[str] = None
    source_type: Literal["web_search", "fact_check_review", "official_agency", "registry"] = "web_search"
    reviewed_claim: Optional[str] = None
    published_rating: Optional[str] = None
    relevance_score: Optional[float] = None
    retrieval_status: Literal["success", "empty", "cached", "partial", "error"] = "success"
    content_hash: str = ""
    is_live_api: bool = True

    def calculate_hash(self) -> str:
        raw = f"{self.url or ''}|{self.title}|{self.snippet[:200]}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    def to_legacy_evidence_item(self) -> Dict[str, Any]:
        """Convert to existing frontend-compatible EvidenceItem format."""
        display_name = self.publisher if self.publisher and self.publisher != "Unknown Publisher" else self.provider.replace("_", " ").title()
        return {
            "source_name": display_name,
            "title": self.title or f"{display_name} Reference",
            "date": self.published_at or self.retrieved_at[:10],
            "summary": self.snippet or self.relevant_passage or "No textual summary provided.",
            "url": self.url,
            "rating": self.published_rating,
            "claim": self.reviewed_claim,
            "claimant": None,
            "language": "en",
            "publisher": self.publisher,
            "is_live_api": self.is_live_api,
            "evidence_id": self.evidence_id,
            "provider": self.provider
        }

class ClaimEvaluationResult(BaseModel):
    """
    Detailed evidence evaluation for a single discrete factual claim.
    """
    model_config = ConfigDict(extra="ignore")

    claim_number: int
    claim: str
    verdict: Literal["supported", "contradicted", "needs_verification", "unverified", "misleading"]
    explanation: str
    cited_evidence_ids: List[str] = Field(default_factory=list)
    supporting_evidence: List[NormalizedEvidence] = Field(default_factory=list)
    contradicting_evidence: List[NormalizedEvidence] = Field(default_factory=list)
    neutral_evidence: List[NormalizedEvidence] = Field(default_factory=list)
    verified_information: Optional[str] = None
    confidence_score: int = 50  # 0 to 100

    def to_legacy_claim_item(self) -> Dict[str, Any]:
        """Convert to existing frontend-compatible ClaimItem format."""
        # Map verdict to status: 'supported' | 'contradicted' | 'needs_verification'
        status_map = {
            "supported": "supported",
            "contradicted": "contradicted",
            "misleading": "contradicted",
            "needs_verification": "needs_verification",
            "unverified": "needs_verification"
        }
        all_evidence = self.supporting_evidence + self.contradicting_evidence + self.neutral_evidence
        legacy_ev_list = [ev.to_legacy_evidence_item() for ev in all_evidence]
        
        return {
            "claim_number": self.claim_number,
            "claim": self.claim,
            "status": status_map.get(self.verdict, "needs_verification"),
            "explanation": self.explanation,
            "evidence": legacy_ev_list,
            "verified_information": self.verified_information,
            "cited_evidence_ids": self.cited_evidence_ids
        }

class PipelineStatus(BaseModel):
    """
    Runtime health, provider degradation status, and degradation reasons.
    """
    model_config = ConfigDict(extra="ignore")

    pipeline_version: str = "live_v1"
    tavily_status: Literal["ok", "empty", "error", "rate_limited", "not_configured"] = "not_configured"
    google_factcheck_status: Literal["ok", "empty", "error", "rate_limited", "not_configured"] = "not_configured"
    gemini_status: Literal["ok", "error", "rate_limited", "not_configured", "schema_error"] = "not_configured"
    legacy_fallback_used: bool = False
    is_degraded: bool = False
    degradation_reason: Optional[str] = None
    is_cached: bool = False
    cached_at: Optional[str] = None
    latency_ms: int = 0
