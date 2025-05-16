from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from pgvector.sqlalchemy import Vector
from db.database import Base

class TacticalTask(Base):
    __tablename__ = "tactical_tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    definition = Column(Text)
    page_number = Column(String)  # Store as string to handle format like "B-10"
    image_path = Column(String, nullable=True)
    embedding = Column(Vector(1536))  # For Gemini embeddings
    source_reference = Column(String)  # e.g., "FM 3-90"
    related_figures = Column(ARRAY(String), nullable=True)  # e.g., ["Figure B-23"] 