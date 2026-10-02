from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("profiles.id"), nullable=True, index=True)
    
    input_type = Column(String, default="text")  # 'text', 'url', 'file'
    title = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    raw_content = Column(Text, nullable=False)
    
    verdict = Column(String, nullable=False)     # 'fake', 'real', 'uncertain'
    confidence = Column(Integer, nullable=False)  # 0 to 100
    summary = Column(Text, nullable=False)
    
    # Store list of claims as JSON: [{"claim": "...", "finding": "...", "status": "debunked" | "verified" | "unverified"}]
    claims = Column(JSON, default=list)
    
    # Store metric breakdown: [{"label": "Emotional Language", "val": 72}, ...]
    metrics = Column(JSON, default=list)
    
    # Additional AI metadata: key entities, detected tone, etc.
    metadata_info = Column(JSON, default=dict)
    
    is_bookmarked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="analyses")
