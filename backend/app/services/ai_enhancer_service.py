import os
import logging
import google.generativeai as genai

from app.models.ai import AIEnhancementRequest, AIEnhancementResponse, EnhancementType

logger = logging.getLogger(__name__)

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.error("GOOGLE_API_KEY not found. AI Enhancer service will not function.")
    enhancer_model = None
else:
    genai.configure(api_key=GOOGLE_API_KEY)
    TEXT_ENHANCEMENT_MODEL_NAME = os.getenv("TEXT_ENHANCEMENT_MODEL_NAME", "gemini-2.0-flash")
    enhancer_model = genai.GenerativeModel(TEXT_ENHANCEMENT_MODEL_NAME)

async def enhance_text_with_ai(
    request: AIEnhancementRequest
) -> AIEnhancementResponse:
    """
    Enhances military text using Gemini AI based on specified enhancement type.
    
    Args:
        request: AIEnhancementRequest containing text and enhancement type
    
    Returns:
        AIEnhancementResponse with original and enhanced text
        
    Note:
        If the AI service is unavailable, returns original text as enhanced text.
    """
    if not enhancer_model:
        logger.error("AI Enhancer model not initialized. Cannot perform enhancement.")
        return AIEnhancementResponse(original_text=request.text, enhanced_text=request.text)

    # Build enhancement-specific instructions
    focus_instruction = {
        EnhancementType.GENERAL: "Enhance this military text while maintaining accuracy and clarity.",
        EnhancementType.CONCISENESS: "Make this military text more concise while preserving key information.",
        EnhancementType.CLARITY: "Improve the clarity of this military text while maintaining technical accuracy.",
        EnhancementType.IMPACT: "Enhance the impact and directness of this military text."
    }.get(request.enhancement_type, "Enhance this military text.")

    prompt = f"""You are a military writing expert. Your task is to enhance the following text.

Instructions: {focus_instruction}
- Preserve all tactical and operational meaning
- Maintain military terminology and doctrine
- Keep the same level of detail and specificity
- Focus on readability and effectiveness

Text to enhance:
{request.text}

Enhanced version:"""

    try:
        logger.debug(f"Sending text to Gemini for enhancement. Type: {request.enhancement_type.value}. Text length: {len(request.text)} chars.")
        response = enhancer_model.generate_content(prompt)
        enhanced_suggestion = response.text.strip()
        
        if not enhanced_suggestion:
            logger.warning("Gemini returned an empty enhancement suggestion.")
            enhanced_suggestion = request.text
            
        logger.info("Successfully received enhancement from Gemini.")
        return AIEnhancementResponse(
            original_text=request.text,
            enhanced_text=enhanced_suggestion
        )

    except Exception as e:
        logger.error(f"Error during AI text enhancement: {e}", exc_info=True)
        return AIEnhancementResponse(original_text=request.text, enhanced_text=request.text) 