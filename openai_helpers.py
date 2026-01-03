"""
Gemini API helper functions
AI-powered email analysis using Google's Gemini 2.5 Flash
"""
import os
import json
import re
from typing import Optional, Dict, List
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# ============ Configuration Constants ============
MAX_OUTPUT_TOKENS = 1000
EMAIL_BODY_TRUNCATE_LIMIT = 8000
REPLY_CONTEXT_LIMIT = 4000
TEMPERATURE = 0.2

# Configure Gemini - API key should be set via environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not set. AI features will not work.")
    print("Please set GEMINI_API_KEY in your .env file.")
else:
    genai.configure(api_key=GEMINI_API_KEY)

# Use Gemini 2.5 Flash - fast and efficient for email analysis
MODEL_NAME = "gemini-2.5-flash"


def get_model() -> genai.GenerativeModel:
    """Get the configured GenerativeModel instance."""
    return genai.GenerativeModel(MODEL_NAME)


def call_gemini(prompt: str, json_mode: bool = False) -> Optional[str]:
    """
    Call Gemini API with the given prompt.
    
    Args:
        prompt: The text prompt to send to the model
        json_mode: If True, request JSON-formatted response
        
    Returns:
        The model's response text, or None if an error occurred
    """
    try:
        model = get_model()
        
        generation_config = {
            "temperature": TEMPERATURE,
            "max_output_tokens": MAX_OUTPUT_TOKENS,
        }
        
        if json_mode:
            generation_config["response_mime_type"] = "application/json"

        response = model.generate_content(
            prompt,
            generation_config=generation_config,
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
        )
        
        return response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None


def analyze_email_comprehensive(text: str, subject: str = "") -> Dict:
    """
    Perform ALL email analysis in a single API call for maximum speed.
    
    Args:
        text: The email body text
        subject: The email subject line
        
    Returns:
        Dict with: summary, priority, sentiment, category, extracted_info, quick_replies
    """
    if not text:
        return _get_fallback_analysis()
        
    prompt = f"""
    Analyze this email and provide the following in a SINGLE JSON object:
    1. "summary": 2-4 bullet points with an actionable next step.
    2. "priority": "HIGH", "MEDIUM", or "LOW" based on urgency.
    3. "sentiment": object with "sentiment" ("positive", "negative", "neutral") and "score" (0.0-1.0).
    4. "category": One of ["Urgent Support", "Work/Business", "Personal", "Newsletter", "Spam/Promotional", "General"].
    5. "extracted_info": object with "action_items" (list) and "dates" (list).
    6. "quick_replies": list of 3 distinct, short, professional reply options that directly address the sender's specific questions or content. Avoid generic responses; tailor them to the email's actual topic.

    SUBJECT: {subject}
    EMAIL BODY:
    {text[:EMAIL_BODY_TRUNCATE_LIMIT]}
    """
    
    result = call_gemini(prompt, json_mode=True)
    if result:
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            print("Failed to decode JSON from comprehensive analysis")
            
    return _get_fallback_analysis()


def _get_fallback_analysis() -> Dict:
    """Return fallback analysis structure when API fails."""
    return {
        "summary": "Analysis unavailable",
        "priority": "MEDIUM",
        "sentiment": {"sentiment": "neutral", "score": 0.5},
        "category": "General",
        "extracted_info": {"action_items": [], "dates": []},
        "quick_replies": []
    }


# Legacy wrappers for backward compatibility
def generate_summary(text: str, max_tokens: int = 200) -> str:
    """Generate a summary of the email text."""
    return analyze_email_comprehensive(text).get("summary", "")


def generate_priority_label(text: str) -> str:
    """Generate priority label for the email."""
    return analyze_email_comprehensive(text).get("priority", "MEDIUM")


def analyze_sentiment(text: str) -> Dict:
    """Analyze the sentiment of the email."""
    return analyze_email_comprehensive(text).get("sentiment", {"sentiment": "neutral", "score": 0.5})


def categorize_email(text: str, subject: str = "") -> str:
    """Categorize the email into predefined categories."""
    return analyze_email_comprehensive(text, subject).get("category", "General")


def extract_information(text: str) -> Dict:
    """Extract structured information from the email."""
    return analyze_email_comprehensive(text).get("extracted_info", {})


def ask_gemini_with_context(question: str, context: str) -> str:
    """
    Ask Gemini a question based on provided email context.
    
    Args:
        question: The user's question
        context: Relevant email content to use as context
        
    Returns:
        The AI's answer based on the context
    """
    if not context:
        return "I couldn't find any relevant emails to answer your question."
        
    prompt = f"""
    You are a helpful AI Email Assistant. 
    Answer the user's question mostly using the provided email context.
    If the answer isn't in the context, say you don't know based on the emails found.
    Cite specific emails by their Subject or Sender if relevant.
    
    USER QUESTION: 
    {question}
    
    RELEVANT EMAILS FOUND:
    {context}
    
    ANSWER:
    """
    
    result = call_gemini(prompt)
    return result if result else "Sorry, I couldn't generate a response. Please try again."


def generate_reply(email_text: str, tone: str = "professional", instructions: str = "") -> str:
    """
    Generate a reply draft based on the original email.
    
    Args:
        email_text: The original email content
        tone: The desired tone (professional, friendly, concise, formal, empathetic)
        instructions: Additional instructions for the reply
        
    Returns:
        Generated reply text
    """
    if not email_text:
        return ""
        
    prompt = f"""
    Draft a reply to the following email.
    Tone: {tone}
    Additional Instructions: {instructions}
    
    - Do not include placeholders like "[Your Name]".
    - Keep it concise and natural.
    
    ORIGINAL EMAIL:
    {email_text[:REPLY_CONTEXT_LIMIT]}
    """
    
    result = call_gemini(prompt)
    return result.strip() if result else "Error generating reply."
