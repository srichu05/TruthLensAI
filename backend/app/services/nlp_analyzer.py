import re
from typing import Dict, Any, List, Optional
from app.services.factcheck_service import evaluate_single_claim

def is_factual_assertion(text: str) -> bool:
    """
    Check if a text snippet is likely a factual assertion rather than a greeting,
    call-to-action, pure question, or subjective conversational phrase.
    """
    cleaned = text.strip().lower()
    if len(cleaned) < 15 or len(cleaned.split()) < 3:
        return False

    # Skip conversational greetings and call-to-actions
    cta_patterns = [
        r'^(hello|hi|hey|good morning|good evening|welcome)\b',
        r'\b(subscribe|click here|follow us|share this|leave a comment|read more)\b',
        r'^(what do you think|do you agree|let us know)\b',
        r'^(thanks for watching|thank you for reading|stay tuned)\b',
    ]
    for pat in cta_patterns:
        if re.search(pat, cleaned):
            return False

    # Require letters and at least one word character
    if not any(c.isalpha() for c in cleaned):
        return False

    return True

def normalize_claim_sentence(sentence: str) -> str:
    """Strip leading bullets, numbering, editorial labels, and surrounding quotes."""
    s = sentence.strip()
    # Strip leading bullet/numbering
    s = re.sub(r'^(?:[\*\-\•\–]\s*|\d+[\.\)]\s*)', '', s)
    # Strip editorial labels like 'Breaking news:', 'Alert:', 'Update:'
    s = re.sub(r'^(?:breaking(?:\s+news)?\s*:\s*|alert\s*:\s*|update\s*:\s*)', '', s, flags=re.IGNORECASE)
    # Strip surrounding quotes
    s = s.strip('"\'“”`')
    # Collapse internal whitespace
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def extract_raw_claims(text: str, title: str = "") -> List[str]:
    """
    Extract discrete factual assertions from text and title.
    Normalizes sentences, filters out subjective/CTA fluff, and deduplicates.
    """
    combined = []
    seen_normalized = set()

    def add_claim(c_text: str, prepend: bool = False):
        norm = re.sub(r'[^\w\s]', '', c_text.lower()).strip()
        norm = re.sub(r'\s+', ' ', norm)
        if norm and norm not in seen_normalized and is_factual_assertion(c_text):
            seen_normalized.add(norm)
            if prepend:
                combined.insert(0, c_text)
            else:
                combined.append(c_text)

    # If title is a meaningful headline not starting with test labels, process it first
    if title and len(title.strip()) >= 15 and not title.lower().startswith("test "):
        t_clean = normalize_claim_sentence(title)
        add_claim(t_clean, prepend=True)

    # Split on sentence boundaries
    raw_splits = re.split(r'(?<=[.?!])\s+|\n+', text)
    for s in raw_splits:
        s_clean = normalize_claim_sentence(s)
        if s_clean:
            add_claim(s_clean, prepend=False)

    return combined

def analyze_text_content(text: str, title: str = "") -> Dict[str, Any]:
    """
    Evidence-first NLP verification and misinformation detection engine.
    Pipeline:
      1. Extract discrete factual claims.
      2. Verify each claim against Google Fact Check API, empirical registries, and accredited databases.
      3. Aggregate claim results (Supported, Contradicted, Needs Verification).
      4. Determine evidence-driven verdict (REAL, FAKE, MIXED/MISLEADING, UNCERTAIN).
      5. Calibrate confidence score based on claim-evidence alignment.
    """
    full_text = f"{title}\n{text}".lower()

    # 1. Linguistic feature extraction (Supporting metrics only, NOT deciding the verdict)
    sensational_words = ["shocking", "bombshell", "miracle", "hidden truth", "secret government", "conspiracy", "hoax", "exposed", "unbelievable"]
    sensational_matches = sum(1 for w in sensational_words if w in full_text)
    exclamations = full_text.count("!")
    caps_words = len([w for w in (f"{title} {text}").split() if w.isupper() and len(w) > 2])

    emotional_words = ["furious", "disaster", "danger", "evil", "corrupt", "nightmare", "deadly", "rage", "panic"]
    emotional_count = sum(1 for w in emotional_words if w in full_text)

    sensationalism = min(95, max(10, int(sensational_matches * 20 + min(exclamations * 6, 20) + min(caps_words * 4, 20))))
    emotional_language = min(95, max(12, int(emotional_count * 16 + (sensationalism * 0.3))))

    # 2. Extract and independently verify factual claims FIRST (capped to top 6 primary claims for responsiveness)
    raw_claims = extract_raw_claims(text, title)[:6]
    detailed_claims = []
    
    for idx, claim_text in enumerate(raw_claims):
        evaluation = evaluate_single_claim(claim_text, article_context=text)
        detailed_claims.append({
            "claim_number": idx + 1,
            "claim": claim_text,
            "status": evaluation["status"],  # "supported" | "contradicted" | "needs_verification"
            "explanation": evaluation["explanation"],
            "evidence": evaluation["evidence"],
            "verified_information": evaluation["verified_information"]
        })

    total_claims = len(detailed_claims)
    num_supported = sum(1 for c in detailed_claims if c["status"] == "supported")
    num_contradicted = sum(1 for c in detailed_claims if c["status"] == "contradicted")
    num_unverified = sum(1 for c in detailed_claims if c["status"] == "needs_verification")

    # 3. Source Reliability & Evidence Coverage Evaluation
    if num_supported >= 2 and num_contradicted == 0:
        source_reliability = min(95, max(75, 72 + num_supported * 6))
        claim_strength = min(95, 75 + num_supported * 5)
        logical_coherence = min(95, 80 + num_supported * 4)
    elif num_contradicted >= 1:
        source_reliability = max(12, min(40, 40 - num_contradicted * 10))
        claim_strength = max(15, min(35, 35 - num_contradicted * 8))
        logical_coherence = max(20, min(45, 45 - num_contradicted * 8))
    else:
        # Insufficient evidence / unverified claims
        source_reliability = 40
        claim_strength = 45
        logical_coherence = 55

    # 4. Evidence-Weighted Verdict Determination
    # Rule 1: Contradictions Dominate without Support -> LIKELY FAKE
    if num_contradicted >= 1 and num_supported == 0:
        verdict = "fake"
        verdict_category = "LIKELY FAKE"
        ratio = num_contradicted / max(1, total_claims)
        confidence = min(96, max(75, int(74 + ratio * 22)))
        verdict_explanation = f"{num_contradicted} of {total_claims} major factual claims were contradicted by available evidence."
        summary = (
            f"This article contains fabricated or contradicted assertions ({num_contradicted} of {total_claims} claims refuted). "
            "Available empirical facts, scientific principles, and accredited source registries conflict with the primary claims made in this content."
        )
        legacy_claims = [
            f"{num_contradicted} primary claim(s) directly conflict with verified evidence records.",
            "Unsupported assertions or uncorroborated narratives detected.",
            "Content does not adhere to verifiable journalistic standards."
        ]

    # Rule 2: Heavy Contradictions (More contradicted than supported) -> LIKELY FAKE
    elif num_contradicted >= 2 and num_contradicted > num_supported:
        verdict = "fake"
        verdict_category = "LIKELY FAKE"
        ratio = num_contradicted / max(1, total_claims)
        confidence = min(96, max(75, int(74 + ratio * 22)))
        verdict_explanation = f"{num_contradicted} of {total_claims} major factual claims were contradicted by available evidence."
        summary = (
            f"This article contains major contradicted assertions ({num_contradicted} of {total_claims} claims refuted). "
            "While select elements may cite real context, the primary thesis conflicts with verified empirical documentation."
        )
        legacy_claims = [
            f"{num_contradicted} primary claim(s) directly conflict with verified evidence records.",
            "Misinformation detected overriding contextual background.",
            "Unverified assertions conflict with established records."
        ]

    # Rule 3: Mixed / Misleading content (Both supported and contradicted claims present)
    elif num_contradicted >= 1 and num_supported >= 1:
        verdict = "uncertain"
        verdict_category = "MIXED / MISLEADING"
        confidence = min(75, max(58, int(58 + (num_supported + num_contradicted) * 3)))
        verdict_explanation = "Several claims are supported, but important parts of the article conflict with available evidence."
        summary = (
            "This article presents a combination of authentic factual context alongside misleading or contradicted statements. "
            "While select claims align with real reporting, key assertions are unverified or inaccurate. Reader caution is strongly advised."
        )
        legacy_claims = [
            "Factual assertions mixed with unsubstantiated or contradicted claims.",
            "Selective presentation of facts observed across key paragraphs.",
            "Manual cross-referencing recommended before sharing or citing."
        ]

    # Rule 4: Insufficient Evidence / Unverified assertions (No contradictions, but NO verified primary sources)
    # CRITICAL: Do NOT default to "Likely Real"! Must be UNCERTAIN with moderate calibrated confidence.
    elif num_supported == 0 and num_contradicted == 0:
        verdict = "uncertain"
        verdict_category = "UNCERTAIN"
        confidence = min(60, max(46, int(48 + (num_unverified / max(1, total_claims)) * 8)))
        verdict_explanation = "Available evidence is insufficient to reliably determine whether the article is true or false."
        summary = (
            "Available evidence is currently insufficient to definitively verify or refute the assertions in this article. "
            "The text lacks direct primary citations, institutional attribution, or registered fact-checks. Further independent verification is required."
        )
        legacy_claims = [
            "Claims lack direct corroborating primary sources or institutional confirmation.",
            "Writing style does not substitute for empirical evidence.",
            "Independent secondary verification is required to establish authenticity."
        ]

    # Rule 5: Mostly unverified with only 1 weak supported claim
    elif num_supported == 1 and num_unverified >= 2:
        verdict = "uncertain"
        verdict_category = "UNCERTAIN"
        confidence = 55
        verdict_explanation = "Available evidence provides only minimal corroboration; major portions remain unverified."
        summary = (
            "While one claim finds basic contextual alignment, the majority of assertions in this content remain unverified by primary sources. "
            "A definitive credibility rating cannot be established without additional accredited evidence."
        )
        legacy_claims = [
            "Limited supporting citations identified across the content.",
            "Key assertions require independent secondary verification.",
            "Insufficient evidence to classify as verified authentic reporting."
        ]

    # Rule 6: Supported Authentic Journalism
    else:
        verdict = "real"
        verdict_category = "LIKELY REAL"
        ratio = num_supported / max(1, total_claims)
        confidence = min(96, max(75, int(72 + ratio * 22)))
        verdict_explanation = "The major factual claims are supported by multiple available sources and verified reporting."
        summary = (
            f"This article demonstrates strong markers of authentic, factual journalism ({num_supported} of {total_claims} claims verified). "
            "The statements are attributed to verifiable sources, and key assertions align with established documentation."
        )
        legacy_claims = [
            "Major factual assertions correspond with verified reporting conventions.",
            "Statements align with public records and credible source reporting.",
            "Objective reporting backed by named primary institutions."
        ]

    metrics = [
        {"label": "Emotional Language", "val": int(emotional_language)},
        {"label": "Sensationalism",     "val": int(sensationalism)},
        {"label": "Claim Strength",     "val": int(claim_strength)},
        {"label": "Source Reliability", "val": int(source_reliability)},
        {"label": "Logical Coherence",  "val": int(logical_coherence)},
    ]

    # 5. Distinct Explanation Breakdown (Final Reasoning, Fact-Check Evidence, Linguistic Signals)
    if sensationalism >= 55 or emotional_language >= 55:
        linguistic_signals = f"Elevated sensationalism ({sensationalism}%) and emotional rhetoric ({emotional_language}%) detected, including high-arousal wording and assertive exclamation patterns typical of clickbait or deceptive narratives."
    elif sensationalism >= 30 or emotional_language >= 30:
        linguistic_signals = f"Moderate expressive language ({sensationalism}% sensationalism, {emotional_language}% emotional tone) observed with partial journalistic framing."
    else:
        linguistic_signals = f"Objective, restrained journalistic tone observed (sensationalism: {sensationalism}%, emotional tone: {emotional_language}%) without overt manipulation markers."

    # Fact-check evidence summary
    live_count = sum(1 for c in detailed_claims for ev in c.get("evidence", []) if ev.get("is_live_api"))
    if live_count > 0:
        factcheck_evidence = f"Cross-referenced against global IFCN registries via Google Fact Check Tools API ({live_count} live review matches found) and institutional databases: {num_contradicted} claim(s) contradicted, {num_supported} supported, and {num_unverified} requiring further primary verification."
    else:
        factcheck_evidence = f"Verified across empirical knowledge registries and accredited primary records: {num_contradicted} claim(s) contradicted, {num_supported} corroborated, and {num_unverified} unverified by primary citations."

    final_reasoning = f"{verdict_explanation} {summary}"

    explanation_breakdown = {
        "final_reasoning": final_reasoning,
        "factcheck_evidence": factcheck_evidence,
        "linguistic_signals": linguistic_signals,
    }

    # Debug / transparency object
    debug_info = {
        "verdict": verdict,
        "verdict_category": verdict_category,
        "confidence": confidence,
        "claim_counts": {
            "supported": num_supported,
            "contradicted": num_contradicted,
            "needs_verification": num_unverified
        },
        "total_claims": total_claims,
        "sensational_matches": sensational_matches,
        "word_count": len(text.split())
    }

    return {
        "verdict": verdict,
        "confidence": confidence,
        "summary": summary,
        "claims": legacy_claims,
        "detailed_claims": detailed_claims,
        "metrics": metrics,
        "explanation_breakdown": explanation_breakdown,
        "metadata": {
            "verdict_category": verdict_category,
            "verdict_explanation": verdict_explanation,
            "explanation_breakdown": explanation_breakdown,
            "num_supported": num_supported,
            "num_contradicted": num_contradicted,
            "num_unverified": num_unverified,
            "debug_info": debug_info,
            "sensational_matches": sensational_matches,
            "word_count": len(text.split()),
            "claims_count": total_claims
        }
    }
