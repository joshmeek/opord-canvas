from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.database import Base

class User(Base):
    """
    User model representing application users.
    
    Attributes:
        id: Primary key
        email: Unique email address for user identification
        hashed_password: Securely hashed user password
        created_at: Timestamp of user creation
        updated_at: Timestamp of last user update
        opords: Relationship to user's OPORDs
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    opords = relationship("OPORD", back_populates="user") 