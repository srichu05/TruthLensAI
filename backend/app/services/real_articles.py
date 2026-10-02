import hashlib
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.analysis import Analysis
from app.models.real_article import RealArticle
from app.models.user import User

def generate_content_hash(text: str) -> str:
    cleaned = "".join(text.lower().split())
    return hashlib.sha256(cleaned.encode("utf-8")).hexdigest()

def maybe_create_real_article(
    db: Session,
    analysis_record: Analysis,
    analysis_result: Dict[str, Any],
    user: Optional[User] = None
) -> Optional[RealArticle]:
    """
    Whenever a user analyzes content and TruthLens determines that the content is
    Likely Fake or Uncertain/Misleading, create or update a RealArticle entry IF
    reliable evidence / source information is available.
    """
    if not user:
        return None

    verdict = analysis_record.verdict
    if verdict not in ["fake", "uncertain"]:
        return None

    detailed_claims = analysis_result.get("detailed_claims", [])
    if not detailed_claims:
        return None

    # Collect all sources across claims
    all_sources = []
    contradicted_or_unsupported = []
    verified_explanations = []

    for c in detailed_claims:
        status = c.get("status")
        if status in ["contradicted", "needs_verification"]:
            contradicted_or_unsupported.append(c.get("claim"))
            if c.get("explanation"):
                contradicted_or_unsupported.append(f"Assessment: {c.get('explanation')}")
        if c.get("verified_information"):
            verified_explanations.append(c.get("verified_information"))
        for ev in c.get("evidence", []):
            if ev not in all_sources:
                all_sources.append(ev)

    # If no evidence or verified information is available, do not create
    if not all_sources and not verified_explanations:
        return None

    primary_source = all_sources[0] if all_sources else {
        "source_name": "International Fact-Checking Network (IFCN)",
        "url": "https://www.poynter.org/ifcn/",
        "summary": "Independent fact verification record."
    }

    original_claim_text = (
        contradicted_or_unsupported[0]
        if contradicted_or_unsupported
        else (detailed_claims[0].get("claim") if detailed_claims else analysis_record.title or analysis_record.raw_content[:200])
    )

    what_was_wrong = (
        "\n\n".join(contradicted_or_unsupported[:3])
        if contradicted_or_unsupported
        else analysis_record.summary
    )

    what_actually_happened = (
        "\n\n".join(verified_explanations[:3])
        if verified_explanations
        else (
            primary_source.get("summary")
            or "Available scientific, institutional, and news wire records refute or lack substantiation for the claims in this content."
        )
    )

    content_hash = generate_content_hash(analysis_record.raw_content[:500])

    # Check for existing duplicate for this user
    existing = db.query(RealArticle).filter(
        RealArticle.user_id == user.id,
        RealArticle.content_hash == content_hash
    ).first()

    if existing:
        existing.analysis_id = analysis_record.id
        existing.original_title = analysis_record.title or "Analyzed Article"
        existing.original_claim = original_claim_text
        existing.original_verdict = analysis_record.verdict
        existing.confidence = analysis_record.confidence
        existing.what_was_wrong = what_was_wrong
        existing.what_actually_happened = what_actually_happened
        existing.verified_source_name = primary_source.get("source_name", "Verified Source")
        existing.verified_source_url = primary_source.get("url")
        existing.sources = all_sources
        existing.claims_breakdown = detailed_claims
        db.commit()
        db.refresh(existing)
        return existing

    new_real_article = RealArticle(
        user_id=user.id,
        analysis_id=analysis_record.id,
        input_type=analysis_record.input_type or "text",
        original_title=analysis_record.title or "Analyzed Article",
        original_claim=original_claim_text,
        original_verdict=analysis_record.verdict,
        confidence=analysis_record.confidence,
        what_was_wrong=what_was_wrong,
        what_actually_happened=what_actually_happened,
        verified_source_name=primary_source.get("source_name", "Verified Source"),
        verified_source_url=primary_source.get("url"),
        sources=all_sources,
        claims_breakdown=detailed_claims,
        content_hash=content_hash,
    )
    db.add(new_real_article)
    db.commit()
    db.refresh(new_real_article)
    return new_real_article
