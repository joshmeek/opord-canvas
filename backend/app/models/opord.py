from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB # For PostgreSQL
from sqlalchemy.types import JSON # Fallback for other DBs like SQLite if needed during dev
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base

class OPORD(Base):
    """
    Operations Order (OPORD) model representing military operation plans.
    
    Attributes:
        id: Primary key
        title: Title of the OPORD
        content: Full text content of the OPORD
        user_id: Foreign key to the user who created the OPORD
        created_at: Timestamp of OPORD creation
        updated_at: Timestamp of last OPORD update
        analysis_results: JSON field storing tactical task analysis results
        user: Relationship to the OPORD's creator
    """
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