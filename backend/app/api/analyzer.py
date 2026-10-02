from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.core.limiter import limiter
from app.db.session import get_db
from app.models.analysis import Analysis
from app.models.user import User
from app.schemas.analysis import AnalyzeRequest, AnalysisResponse
from app.services.nlp_analyzer import analyze_text_content
from app.services.web_scraper import extract_article_from_url
from app.services.real_articles import maybe_create_real_article
from app.api.deps import get_current_user

router = APIRouter(tags=["Analyzer"])

@router.post("/analyze", response_model=AnalysisResponse)
@limiter.limit(settings.RATE_LIMIT_ANALYZE)
async def analyze_news(
    request: Request,
    payload: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    content_to_analyze = ""
    title = payload.title or ""
    source_url = None

    if payload.mode == "url":
        if not payload.url:
            raise HTTPException(status_code=400, detail="URL is required in URL mode")
        source_url = payload.url
        try:
            extracted_title, extracted_content = await extract_article_from_url(payload.url)
            title = title or extracted_title
            content_to_analyze = extracted_content
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch content from URL: {str(e)}")
    else:
        if not payload.content or len(payload.content.strip()) < 10:
            raise HTTPException(status_code=400, detail="Please provide at least 10 characters of text to analyze.")
        content_to_analyze = payload.content

    # Run AI/NLP Analysis
    analysis_result = analyze_text_content(content_to_analyze, title=title)

    # Derive a display title if empty
    if not title:
        first_line = content_to_analyze.strip().split("\n")[0]
        title = first_line[:80] + ("..." if len(first_line) > 80 else "")

    # Save to SQLite
    record = Analysis(
        user_id=current_user.id if current_user else None,
        input_type=payload.mode,
        title=title,
        source_url=source_url,
        raw_content=content_to_analyze,
        verdict=analysis_result["verdict"],
        confidence=analysis_result["confidence"],
        summary=analysis_result["summary"],
        claims=analysis_result["claims"],
        metrics=analysis_result["metrics"],
        metadata_info={
            **analysis_result.get("metadata", {}),
            "detailed_claims": analysis_result.get("detailed_claims", [])
        },
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # If content was fake/misleading and user is authenticated, create/update RealArticle record
    real_article_rec = None
    if current_user:
        try:
            real_article_rec = maybe_create_real_article(db, record, analysis_result, current_user)
        except Exception:
            pass

    response_meta = {
        **record.metadata_info,
        "real_article_id": real_article_rec.id if real_article_rec else None
    }

    return AnalysisResponse(
        id=record.id,
        input_type=record.input_type,
        source_url=record.source_url,
        raw_content=record.raw_content,
        verdict=record.verdict,
        conf=record.confidence,
        title=record.title,
        summary=record.summary,
        claims=record.claims,
        detailed_claims=analysis_result.get("detailed_claims", []),
        metrics=record.metrics,
        metadata=response_meta,
        explanation_breakdown=analysis_result.get("explanation_breakdown"),
        is_bookmarked=record.is_bookmarked,
        created_at=record.created_at,
    )

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB limit

@router.post("/analyze/upload", response_model=AnalysisResponse)
@limiter.limit(settings.RATE_LIMIT_UPLOAD)
async def analyze_file_upload(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    try:
        raw_bytes = await file.read()
        if len(raw_bytes) > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Uploaded file exceeds the maximum allowed size of {MAX_UPLOAD_SIZE // (1024 * 1024)}MB."
            )
        filename = (file.filename or "").lower()
        if filename.endswith(".pdf") or raw_bytes.startswith(b"%PDF"):
            try:
                import io
                import PyPDF2
                reader = PyPDF2.PdfReader(io.BytesIO(raw_bytes))
                extracted = [page.extract_text() or "" for page in reader.pages]
                text_content = "\n".join(extracted).strip()
            except Exception:
                text_content = raw_bytes.decode("utf-8", errors="ignore")
        else:
            text_content = raw_bytes.decode("utf-8", errors="ignore")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read uploaded file: {str(e)}")

    if len(text_content.strip()) < 10:
        raise HTTPException(status_code=400, detail="The uploaded file contains insufficient text.")

    title = file.filename or "Uploaded Document"
    analysis_result = analyze_text_content(text_content, title=title)

    record = Analysis(
        user_id=current_user.id if current_user else None,
        input_type="file",
        title=title,
        raw_content=text_content,
        verdict=analysis_result["verdict"],
        confidence=analysis_result["confidence"],
        summary=analysis_result["summary"],
        claims=analysis_result["claims"],
        metrics=analysis_result["metrics"],
        metadata_info={
            **analysis_result.get("metadata", {}),
            "detailed_claims": analysis_result.get("detailed_claims", [])
        },
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    real_article_rec = None
    if current_user:
        try:
            real_article_rec = maybe_create_real_article(db, record, analysis_result, current_user)
        except Exception:
            pass

    response_meta = {
        **record.metadata_info,
        "real_article_id": real_article_rec.id if real_article_rec else None
    }

    return AnalysisResponse(
        id=record.id,
        input_type=record.input_type,
        source_url=record.source_url,
        raw_content=record.raw_content,
        verdict=record.verdict,
        conf=record.confidence,
        title=record.title,
        summary=record.summary,
        claims=record.claims,
        detailed_claims=analysis_result.get("detailed_claims", []),
        metrics=record.metrics,
        metadata=response_meta,
        explanation_breakdown=analysis_result.get("explanation_breakdown"),
        is_bookmarked=record.is_bookmarked,
        created_at=record.created_at,
    )


@router.get("/analyze/{item_id}", response_model=AnalysisResponse)
def get_analysis_by_id(
    item_id: int,
    db: Session = Depends(get_db)
):
    record = db.query(Analysis).filter(Analysis.id == item_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis result not found")

    meta = record.metadata_info or {}
    detailed_claims = meta.get("detailed_claims")
    exp_breakdown = meta.get("explanation_breakdown")
    if not detailed_claims and record.raw_content:
        # Generate dynamically if an older record didn't store it
        re_eval = analyze_text_content(record.raw_content, title=record.title or "")
        detailed_claims = re_eval.get("detailed_claims", [])
        exp_breakdown = exp_breakdown or re_eval.get("explanation_breakdown")

    return AnalysisResponse(
        id=record.id,
        input_type=record.input_type,
        source_url=record.source_url,
        raw_content=record.raw_content,
        verdict=record.verdict,
        conf=record.confidence,
        title=record.title,
        summary=record.summary,
        claims=record.claims or [],
        detailed_claims=detailed_claims or [],
        metrics=record.metrics or [],
        metadata=meta,
        explanation_breakdown=exp_breakdown,
        is_bookmarked=record.is_bookmarked,
        created_at=record.created_at,
    )


