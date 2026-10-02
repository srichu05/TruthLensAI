from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base

class RealArticle(Base):
    __tablename__ = "real_articles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("profiles.id"), nullable=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=True, index=True)

    input_type = Column(String, default="text")  # 'text', 'url', 'file', 'pdf', 'txt'
    original_title = Column(String, nullable=False)
    original_claim = Column(Text, nullable=False)
    original_verdict = Column(String, nullable=False)  # 'fake', 'uncertain'
    confidence = Column(Integer, default=80)

    what_was_wrong = Column(Text, nullable=False)
    what_actually_happened = Column(Text, nullable=False)

    verified_source_name = Column(String, nullable=False)
    verified_source_url = Column(String, nullable=True)

    # Detailed sources: [{"source_name": "...", "title": "...", "date": "...", "summary": "...", "url": "..."}]
    sources = Column(JSON, default=list)

    # Detailed claim items: [{"claim_number": 1, "claim": "...", "status": "...", "explanation": "...", "evidence": [...]}]
    claims_breakdown = Column(JSON, default=list)

    content_hash = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="real_articles")
    analysis = relationship("Analysis")
