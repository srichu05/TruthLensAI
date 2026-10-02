from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.models.real_article import RealArticle
from app.models.user import User
from app.schemas.analysis import RealArticleOut
from app.api.deps import require_current_user

router = APIRouter(prefix="/real-articles", tags=["Real Articles"])

@router.get("", response_model=List[RealArticleOut])
def get_real_articles(
    search: Optional[str] = None,
    verdict: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user)
):
    query = db.query(RealArticle).filter(RealArticle.user_id == current_user.id)

    if verdict and verdict != "all":
        if verdict.lower() in ["fake", "likely fake"]:
            query = query.filter(RealArticle.original_verdict == "fake")
        elif verdict.lower() in ["uncertain", "mixed", "misleading"]:
            query = query.filter(RealArticle.original_verdict == "uncertain")

    if search:
        search_fmt = f"%{search.lower()}%"
        query = query.filter(
            (RealArticle.original_title.ilike(search_fmt)) |
            (RealArticle.original_claim.ilike(search_fmt)) |
            (RealArticle.what_actually_happened.ilike(search_fmt)) |
            (RealArticle.verified_source_name.ilike(search_fmt))
        )

    records = query.order_by(RealArticle.created_at.desc()).limit(limit).all()
    return records

@router.get("/{article_id}", response_model=RealArticleOut)
def get_real_article_by_id(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user)
):
    record = db.query(RealArticle).filter(
        RealArticle.id == article_id,
        RealArticle.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Real Article not found")

    return record
