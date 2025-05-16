import os
import logging
import google.generativeai as genai

from app.models.ai import AIEnhancementRequest, AIEnhancementResponse, EnhancementType

logger = logging.getLogger(__name__)

# Configure Gemini (similar to tactical_analysis_service)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.error("GOOGLE_API_KEY not found. AI Enhancer service will not function.")
    enhancer_model = None
else:
    genai.configure(api_key=GOOGLE_API_KEY)
    # Consider using a model suited for instruction-following and creative/suggestive text generation
    TEXT_ENHANCEMENT_MODEL_NAME = os.getenv("TEXT_ENHANCEMENT_MODEL_NAME", "gemini-2.0-flash")
    enhancer_model = genai.GenerativeModel(TEXT_ENHANCEMENT_MODEL_NAME)

async def enhance_text_with_ai(
    request: AIEnhancementRequest
) -> AIEnhancementResponse:
    """
    Uses Gemini to provide enhancement suggestions for the input military text,
    optionally focusing on a specific enhancement type.
    """
    if not enhancer_model:
        logger.error("AI Enhancer model not initialized. Cannot perform enhancement.")
        # Return the original text or raise an error, depending on desired behavior
        return AIEnhancementResponse(original_text=request.text, enhanced_text=request.text) 

    focus_instruction = ""
    if request.enhancement_type == EnhancementType.CONCISENESS:
        focus_instruction = "Focus particularly on making the text more concise by removing redundancy and unnecessary jargon, while preserving all critical information."
    elif request.enhancement_type == EnhancementType.CLARITY:
        focus_instruction = "Focus particularly on improving clarity by simplifying sentence structures and ensuring the meaning is unambiguous."
    elif request.enhancement_type == EnhancementType.IMPACT:
        focus_instruction = "Focus particularly on increasing the impact of the text by using stronger verbs, active voice, and more direct language."
    else: # General or unknown type (defaults to EnhancementType.GENERAL)
        focus_instruction = "Focus on improving overall clarity, conciseness, and adherence to a professional military tone. Ensure the meaning remains the same but the language is more impactful and direct."

    # Few-shot examples
    examples = """

Here are some examples of desired enhancements:

Example 1 (Focus: Conciseness & Clarity):
Original Text:
It is imperative that all personnel make an effort to be cognizant of the fact that the upcoming operational phase will necessitate a high degree of readiness and a proactive stance towards potential emergent threats.
Enhanced Text:
All personnel must maintain a high degree of readiness and a proactive stance against potential threats for the upcoming operational phase.

Example 2 (Focus: Impact & Active Voice):
Original Text:
The bridge is to be seized by Alpha Company, after which control will be handed over to Bravo Company for security to be established by them.
Enhanced Text:
Alpha Company will seize the bridge. Bravo Company will then establish security.

Example 3 (Focus: General Refinement):
Original Text:
We need to get the guys to move faster when they are going to the objective because it's important for success that they are on time.
Enhanced Text:
Units will increase speed and maintain momentum when advancing to the objective to ensure timely arrival and mission success.
"""

    prompt = f"""You are an AI assistant specialized in refining military operational text.
Your task is to review the provided military text and provide an enhanced version.
{focus_instruction}
{examples}

Now, please enhance the following text:

Original Text:
---
{request.text}
---

Enhanced Text:
""" # The model should complete this section

    try:
        logger.debug(f"Sending text to Gemini for enhancement. Type: {request.enhancement_type.value}. Text length: {len(request.text)} chars.")
        
        # Placeholder for actual Gemini API call
        # response = await enhancer_model.generate_content_async(prompt) # If using async client
        response = enhancer_model.generate_content(prompt) # For synchronous client as in tactical_analysis_service
        
        enhanced_suggestion = response.text.strip()
        
        # Basic post-processing (can be expanded)
        if not enhanced_suggestion:
            logger.warning("Gemini returned an empty enhancement suggestion.")
            enhanced_suggestion = request.text # Fallback to original
            
        logger.info(f"Successfully received enhancement from Gemini.")
        return AIEnhancementResponse(
            original_text=request.text,
            enhanced_text=enhanced_suggestion
        )

    except Exception as e:
        logger.error(f"Error during AI text enhancement: {e}", exc_info=True)
        # Fallback to original text in case of error
        return AIEnhancementResponse(original_text=request.text, enhanced_text=request.text) 