from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB # For PostgreSQL
from sqlalchemy.types import JSON # Fallback for other DBs like SQLite if needed during dev
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base

class OPORD(Base):
    __tablename__ = "opords"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    analysis_results = Column(JSONB, nullable=True) # Or JSON for broader compatibility

    # Relationships
    user = relationship("User", back_populates="opords") 