"""
AI API helper functions
AI-powered email analysis using Google's Gemini 2.5 Flash with Groq fallback
"""
import os
import json
import re
import hashlib
import time
import requests
from typing import Optional, Dict, List
from functools import lru_cache
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# ============ Configuration Constants ============
MAX_OUTPUT_TOKENS = 1000
EMAIL_BODY_TRUNCATE_LIMIT = 8000
REPLY_CONTEXT_LIMIT = 4000
TEMPERATURE = 0.2

# ============ Cache Configuration ============
CACHE_ENABLED = True
CACHE_TTL_SECONDS = 3600  # 1 hour
CACHE_MAX_SIZE = 500  # Max cached items

# In-memory cache: {hash: {"data": result, "timestamp": time}}
_response_cache: Dict[str, Dict] = {}

# Configure Gemini - API key should be set via environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not set. Will use Groq as fallback if available.")
else:
    genai.configure(api_key=GEMINI_API_KEY)

# Use Gemini 1.5 Flash - fast and efficient fallback
MODEL_NAME = "gemini-1.5-flash"

# ============ Groq Fallback Configuration ============
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # Latest high-speed model on Groq

if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY not set. Fallback AI will not be available.")
else:
    # Debug: Verify key is loaded correctly
    print(f"Groq key loaded: True")
    print(f"Groq key prefix: {GROQ_API_KEY[:8] if len(GROQ_API_KEY) > 8 else 'too_short'}...")


# ============ Cache Helper Functions ============
def _get_cache_key(text: str, subject: str = "") -> str:
    """Generate a cache key from email content."""
    content = f"{subject}:{text[:500]}"  # Use first 500 chars for key
    return hashlib.md5(content.encode()).hexdigest()


def _get_cached(cache_key: str) -> Optional[Dict]:
    """Get cached result if exists and not expired."""
    if not CACHE_ENABLED or cache_key not in _response_cache:
        return None
    
    cached = _response_cache[cache_key]
    if time.time() - cached["timestamp"] > CACHE_TTL_SECONDS:
        del _response_cache[cache_key]
        return None
    
    print(f"📦 Cache HIT for key {cache_key[:8]}...")
    return cached["data"]


def _set_cached(cache_key: str, data: Dict) -> None:
    """Store result in cache."""
    if not CACHE_ENABLED:
        return
    
    # Cleanup if cache is full
    if len(_response_cache) >= CACHE_MAX_SIZE:
        _cleanup_cache()
    
    _response_cache[cache_key] = {
        "data": data,
        "timestamp": time.time()
    }
    print(f"💾 Cached result for key {cache_key[:8]}...")


def _cleanup_cache() -> None:
    """Remove oldest entries when cache is full."""
    if len(_response_cache) < CACHE_MAX_SIZE // 2:
        return
    
    # Remove expired entries first
    current_time = time.time()
    expired_keys = [
        k for k, v in _response_cache.items() 
        if current_time - v["timestamp"] > CACHE_TTL_SECONDS
    ]
    for key in expired_keys:
        del _response_cache[key]
    
    # If still too many, remove oldest
    while len(_response_cache) >= CACHE_MAX_SIZE:
        oldest_key = min(_response_cache, key=lambda k: _response_cache[k]["timestamp"])
        del _response_cache[oldest_key]


def get_cache_stats() -> Dict:
    """Get cache statistics."""
    return {
        "enabled": CACHE_ENABLED,
        "size": len(_response_cache),
        "max_size": CACHE_MAX_SIZE,
        "ttl_seconds": CACHE_TTL_SECONDS
    }


def get_model() -> genai.GenerativeModel:
    """Get the configured GenerativeModel instance."""
    return genai.GenerativeModel(MODEL_NAME)


def call_groq(prompt: str, json_mode: bool = False) -> Optional[str]:
    """
    Call Groq API with the given prompt.
    
    Args:
        prompt: The text prompt to send to the model
        json_mode: If True, instruct model to return JSON
        
    Returns:
        The model's response text, or None if an error occurred
    """
    if not GROQ_API_KEY:
        print("Groq API key not configured")
        return None
        
    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY.strip()}",
            "Content-Type": "application/json",
        }
        
        # Build messages with system prompt for JSON mode
        messages = []
        if json_mode:
            messages.append({
                "role": "system", 
                "content": "You are a helpful assistant. Always respond with valid JSON only, no markdown, no explanation."
            })
        messages.append({"role": "user", "content": prompt})
        
        payload = {
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": TEMPERATURE,
            "max_tokens": MAX_OUTPUT_TOKENS,
        }
        
        # Note: Compound models may not support response_format, so we rely on system prompt
        
        response = requests.post(
            GROQ_API_URL,
            headers=headers,
            json=payload,
            timeout=15,  # Fast timeout - fail quickly if slow
        )
        
        if response.status_code == 401:
            print("❌ Groq AUTH FAILED → Check API key (must start with gsk_)")
            return None
        
        if response.status_code != 200:
            print(f"Groq API Error: {response.status_code} {response.text[:300]}")
            return None
        
        data = response.json()
        
        # Handle both standard and compound model response formats
        if "choices" in data and len(data["choices"]) > 0:
            return data["choices"][0]["message"]["content"]
        elif "output" in data:
            # Compound model response format
            for item in data.get("output", []):
                if item.get("type") == "message":
                    content = item.get("content", [])
                    for c in content:
                        if c.get("type") == "output_text":
                            return c.get("text", "")
        
        print(f"Groq unexpected response format: {str(data)[:200]}")
        return None
        
    except Exception as e:
        print(f"Groq Exception: {e}")
        return None


def _call_gemini_internal(prompt: str, json_mode: bool = False) -> Optional[str]:
    """
    Internal function to call Gemini API.
    
    Args:
        prompt: The text prompt to send to the model
        json_mode: If True, request JSON-formatted response
        
    Returns:
        The model's response text, or None if an error occurred
    """
    if not GEMINI_API_KEY:
        return None
        
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


def call_gemini(prompt: str, json_mode: bool = False) -> Optional[str]:
    """
    Call Gemini API with the given prompt, with automatic Groq fallback.
    
    Tries Gemini first, falls back to Groq if Gemini fails.
    
    Args:
        prompt: The text prompt to send to the model
        json_mode: If True, request JSON-formatted response
        
    Returns:
        The model's response text, or None if both APIs failed
    """
    # Try Groq first as requested
    print("AI Call: Trying Groq first...")
    result = call_groq(prompt, json_mode)
    if result:
        return result
    
    # Fallback to Gemini
    print("Groq failed or unavailable, falling back to Gemini...")
    result = _call_gemini_internal(prompt, json_mode)
    if result:
        print("Gemini fallback successful")
        return result
    
    print("Both Gemini and Groq failed")
    return None


def analyze_email_comprehensive(text: str, subject: str = "") -> Dict:
    """
    Perform ALL email analysis in a single API call for maximum speed.
    Uses caching to avoid repeated API calls for the same content.
    
    Args:
        text: The email body text
        subject: The email subject line
        
    Returns:
        Dict with: summary, priority, sentiment, category, extracted_info, quick_replies
    """
    if not text:
        return _get_fallback_analysis()
    
    # Check cache first
    cache_key = _get_cache_key(text, subject)
    cached_result = _get_cached(cache_key)
    if cached_result:
        return cached_result
        
    prompt = f"""Analyze this email and respond with ONLY a JSON object (no markdown, no explanation):
{{
  "summary": "2-4 bullet points with actionable next step",
  "priority": "HIGH" or "MEDIUM" or "LOW",
  "sentiment": {{"sentiment": "positive/negative/neutral", "score": 0.0-1.0}},
  "category": "Urgent Support" or "Work/Business" or "Personal" or "Newsletter" or "Spam/Promotional" or "General",
  "extracted_info": {{"action_items": [], "dates": []}},
  "quick_replies": ["reply1", "reply2", "reply3"]
}}

SUBJECT: {subject}
EMAIL BODY:
{text[:EMAIL_BODY_TRUNCATE_LIMIT]}
"""
    
    result = call_gemini(prompt, json_mode=True)
    if result:
        # Try to extract JSON from response (handles markdown code blocks, text wrapping, etc.)
        parsed = _extract_json(result)
        if parsed:
            # Cache the successful result
            _set_cached(cache_key, parsed)
            return parsed
        print(f"Failed to decode JSON. Raw response: {result[:200]}...")
            
    return _get_fallback_analysis()


def _extract_json(text: str) -> Optional[Dict]:
    """Extract JSON from text that may contain markdown or extra content."""
    if not text:
        return None
    
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON in markdown code block
    import re
    json_patterns = [
        r'```json\s*(.*?)\s*```',  # ```json ... ```
        r'```\s*(.*?)\s*```',       # ``` ... ```
        r'\{[\s\S]*\}',             # Raw { ... }
    ]
    
    for pattern in json_patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                json_str = match.group(1) if '```' in pattern else match.group(0)
                return json.loads(json_str)
            except (json.JSONDecodeError, IndexError):
                continue
    
    return None


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


def ask_ai_about_emails(question: str, context: str) -> str:
    """
    Ask the AI a question based on provided email context.
    
    Args:
        question: The user's question
        context: Relevant email content to use as context
        
    Returns:
        The AI's answer based on the context
    """
    if not context:
        return "I couldn't find any relevant emails to answer your question."
        
    from datetime import datetime
    today = datetime.now().strftime("%A, %B %d, %Y")
    
    prompt = f"""
    You are a helpful AI Email Assistant. 
    TODAY'S DATE: {today}
    
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
