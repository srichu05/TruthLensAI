from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    """
    Application profile model mapped to Supabase 'profiles' table.
    Mirrors the Supabase Auth user record (auth.users.id -> profiles.id).
    """
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, index=True)  # Supabase Auth UUID
    name = Column(String, nullable=False, default="")
    email = Column(String, unique=True, index=True, nullable=False)
    avatar = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")
    real_articles = relationship("RealArticle", back_populates="user", cascade="all, delete-orphan")

# Backward-compatibility alias
Profile = User

