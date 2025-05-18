from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class EnhancementType(str, Enum):
    """Enhancement types available for AI text processing."""
    GENERAL = "general"
    CONCISENESS = "conciseness"
    CLARITY = "clarity"
    IMPACT = "impact"

class AIEnhancementRequest(BaseModel):
    """
    Request model for AI text enhancement.
    
    Attributes:
        text: The text to be enhanced
        enhancement_type: The type of enhancement to apply
    """
    text: str
    enhancement_type: EnhancementType = Field(
        default=EnhancementType.GENERAL, 
        description="The type of enhancement to apply. Available types: 'general', 'conciseness', 'clarity', 'impact'."
    )
    # Optionally, we can add context or specific instructions for enhancement later
    # e.g., enhancement_type: str = "clarity" 

class AIEnhancementResponse(BaseModel):
    """
    Response model for AI text enhancement.
    
    Attributes:
        original_text: The input text before enhancement
        enhanced_text: The AI-enhanced version of the text
    """
    original_text: str
    enhanced_text: str
    # We could also add a confidence score or other metadata if Gemini provides it 