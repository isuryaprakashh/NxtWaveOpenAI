"""
Ollama local LLM helper functions
"""
import os
import json
import re
import requests

# Ollama configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
# Using FREE local model (llama3.1:8b) - no payment required
# For cloud models that require payment, set OLLAMA_MODEL in .env file
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")  # FREE local model - working perfectly!

def check_ollama_available():
    """Check if Ollama is running and accessible"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
        return response.status_code == 200
    except Exception:
        return False

def check_model_available(model_name: str) -> bool:
    """Check if a specific model is available"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
        if response.status_code == 200:
            models = response.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            # Check if model name is in the list (handles tags like llama3.1:8b)
            return any(model_name in name or name.startswith(model_name) for name in model_names)
        return False
    except Exception:
        return False

# Check availability dynamically each time (not just at startup)
def get_ollama_status():
    """Get current Ollama status"""
    is_running = check_ollama_available()
    model_available = False
    if is_running:
        model_available = check_model_available(OLLAMA_MODEL)
    return is_running, model_available

ollama_available = check_ollama_available()

def call_ollama(messages: list, max_tokens: int = 200, temperature: float = 0.2) -> str:
    """Call Ollama API with chat messages - automatically falls back to llama3.1:8b if needed"""
    # Check dynamically if Ollama is available
    is_running = check_ollama_available()
    if not is_running:
        print("Ollama is not running. Please start Ollama service.")
        return None
    
    # List of models to try (in order of preference)
    models_to_try = [OLLAMA_MODEL]
    
    # Always add llama3.1:8b as fallback if not already the primary model
    if OLLAMA_MODEL != "llama3.1:8b":
        models_to_try.append("llama3.1:8b")
    
    url = f"{OLLAMA_BASE_URL}/api/chat"
    
    for model_to_use in models_to_try:
        try:
            payload = {
                "model": model_to_use,
                "messages": messages,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                },
                "stream": False
            }
            # Use appropriate timeout (120s for cloud models, 60s for local)
            timeout = 120 if "cloud" in model_to_use.lower() else 60
            response = requests.post(url, json=payload, timeout=timeout)
            
            # Handle payment required error (402) for cloud models
            if response.status_code == 402:
                print(f"⚠️ Model '{model_to_use}' requires payment. Trying next model...")
                continue
            
            response.raise_for_status()
            data = response.json()
            content = data.get("message", {}).get("content", "").strip()
            
            if content:
                return content
            else:
                # Check for error in response
                if "error" in data:
                    error_msg = data.get("error", "Unknown error")
                    print(f"⚠️ Model '{model_to_use}' error: {error_msg}. Trying next model...")
                    continue
                # Log empty response for debugging
                print(f"⚠️ Model '{model_to_use}' returned empty response. Trying next model...")
                continue
                
        except requests.exceptions.ConnectionError:
            print(f"Could not connect to Ollama at {OLLAMA_BASE_URL}. Is Ollama running?")
            return None
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                print(f"⚠️ Model '{model_to_use}' not found. Trying next model...")
                continue
            elif e.response.status_code == 402:
                print(f"⚠️ Model '{model_to_use}' requires payment. Trying next model...")
                continue
            else:
                print(f"⚠️ Model '{model_to_use}' error (HTTP {e.response.status_code}): {str(e)}. Trying next model...")
                continue
        except Exception as e:
            print(f"⚠️ Model '{model_to_use}' error: {str(e)}. Trying next model...")
            continue
    
    # If all models failed, return None
    print(f"⚠️ All models failed. Please check Ollama is running and at least one model is available.")
    return None


def generate_summary(text: str, max_tokens=200) -> str:
    """Generate a concise summary of an email"""
    is_running = check_ollama_available()
    if not is_running:
        return "⚠️ Ollama is not running. Please install and start Ollama.\nInstall: https://ollama.ai/download\nAfter install, pull model: ollama pull llama3.1:8b"
    
    # Ensure we have text to summarize
    if not text or not text.strip():
        return "No email content available to summarize."
    
    messages = [
        {"role": "system", "content": "You are an assistant that summarizes emails concisely. Always provide a summary."},
        {"role": "user", "content": f"Summarize the following email in 2-4 concise bullet points and give an actionable next-step.\n\nEMAIL:\n{text[:2000]}"}  # Limit text length
    ]
    
    result = call_ollama(messages, max_tokens=max_tokens, temperature=0.2)
    if result and result.strip():
        return result
    
    # Fallback: provide a basic summary based on text length
    return f"Email summary:\n• Contains {len(text)} characters\n• Review required\n\n⚠️ AI analysis unavailable. Ensure Ollama is running: http://localhost:11434"


def generate_priority_label(text: str) -> str:
    """Classify email priority as HIGH, MEDIUM, or LOW"""
    is_running = check_ollama_available()
    if not is_running:
        return "MEDIUM"  # Default fallback
    
    # Use simple heuristics if text is very short
    if not text or len(text.strip()) < 10:
        return "MEDIUM"
    
    # Check for urgent keywords
    urgent_keywords = ["urgent", "asap", "immediately", "critical", "emergency", "deadline", "important"]
    text_lower = text.lower()
    if any(keyword in text_lower for keyword in urgent_keywords):
        return "HIGH"
    
    messages = [
        {"role": "system", "content": "You are an assistant that classifies email priority. Respond with ONLY one word: HIGH, MEDIUM, or LOW. Do not include any other text."},
        {"role": "user", "content": f"Classify the priority of this email:\n\n{text[:1000]}"}
    ]
    
    result = call_ollama(messages, max_tokens=10, temperature=0)
    if result:
        label = result.upper().strip()
        # Extract priority from response
        if "HIGH" in label:
            return "HIGH"
        if "MEDIUM" in label:
            return "MEDIUM"
        if "LOW" in label:
            return "LOW"
    return "MEDIUM"  # Default fallback


def analyze_sentiment(text: str) -> dict:
    """Analyze sentiment of email - returns sentiment label and score"""
    is_running = check_ollama_available()
    if not is_running:
        return {"sentiment": "neutral", "score": 0.5}  # Default fallback
    
    if not text or not text.strip():
        return {"sentiment": "neutral", "score": 0.5}
    
    # Simple keyword-based sentiment analysis as fallback
    positive_words = ["thank", "appreciate", "great", "excellent", "good", "pleased", "happy", "excited"]
    negative_words = ["disappointed", "problem", "issue", "error", "failed", "urgent", "concern", "sorry"]
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    messages = [
        {"role": "system", "content": "Analyze the sentiment of the email. Respond ONLY with valid JSON in this exact format: {\"sentiment\": \"positive\" or \"negative\" or \"neutral\", \"score\": number between 0 and 1}. No other text."},
        {"role": "user", "content": f"Email text:\n{text[:1000]}"}
    ]
    
    result = call_ollama(messages, max_tokens=50, temperature=0)
    if result:
        try:
            # Clean up response - sometimes model includes markdown code blocks
            cleaned = result.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()
            
            # Try to parse JSON from response
            result_json = json.loads(cleaned)
            # Validate sentiment value
            if result_json.get("sentiment") in ["positive", "negative", "neutral"]:
                return result_json
        except json.JSONDecodeError:
            # If not JSON, try to extract sentiment from text
            result_lower = result.lower()
            sentiment = "neutral"
            score = 0.5
            if "positive" in result_lower:
                sentiment = "positive"
                score = 0.7
            elif "negative" in result_lower:
                sentiment = "negative"
                score = 0.3
            return {"sentiment": sentiment, "score": score}
    
    # Fallback to keyword-based analysis
    if positive_count > negative_count:
        return {"sentiment": "positive", "score": 0.6}
    elif negative_count > positive_count:
        return {"sentiment": "negative", "score": 0.4}
    
    return {"sentiment": "neutral", "score": 0.5}


def categorize_email(text: str, subject: str = "") -> str:
    """Categorize email into predefined categories"""
    is_running = check_ollama_available()
    if not is_running:
        return "General"  # Default fallback
    
    if not text and not subject:
        return "General"
    
    categories = ["Urgent Support", "Work/Business", "Personal", "Newsletter", "Spam/Promotional", "General"]
    
    # Simple keyword-based categorization as fallback
    combined_text = f"{subject} {text}".lower()
    if any(word in combined_text for word in ["urgent", "support", "help", "issue", "problem", "critical"]):
        return "Urgent Support"
    if any(word in combined_text for word in ["newsletter", "subscribe", "unsubscribe", "promo", "discount"]):
        return "Newsletter"
    if any(word in combined_text for word in ["spam", "promotional", "offer", "deal", "sale"]):
        return "Spam/Promotional"
    if any(word in combined_text for word in ["meeting", "project", "deadline", "work", "business", "team"]):
        return "Work/Business"
    if any(word in combined_text for word in ["family", "friend", "personal", "birthday", "wedding"]):
        return "Personal"
    
    messages = [
        {"role": "system", "content": f"Categorize this email into ONE of these categories: {', '.join(categories)}. Respond with ONLY the category name. No other text."},
        {"role": "user", "content": f"Subject: {subject[:200]}\n\nBody: {text[:800]}"}
    ]
    
    result = call_ollama(messages, max_tokens=20, temperature=0)
    if result:
        category = result.strip()
        # Validate category - check if any of our categories are mentioned
        for cat in categories:
            if cat.lower() in category.lower() or category.lower() in cat.lower():
                return cat
    
    return "General"  # Default fallback


def extract_information(text: str) -> dict:
    """Extract structured information from email"""
    info = {
        "emails": [],
        "phones": [],
        "dates": [],
        "action_items": []
    }
    
    # Extract emails
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    info["emails"] = list(set(re.findall(email_pattern, text)))
    
    # Extract phone numbers (basic patterns)
    phone_pattern = r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b'
    info["phones"] = list(set(re.findall(phone_pattern, text)))
    
    # Use AI to extract action items and dates
    if check_ollama_available() and text:
        try:
            messages = [
                {"role": "system", "content": "Extract action items and important dates from the email. Respond ONLY with valid JSON: {\"action_items\": [\"item1\", \"item2\"], \"dates\": [\"date1\", \"date2\"]}. If none found, use empty arrays."},
                {"role": "user", "content": text[:2000]}  # Limit text length
            ]
            result = call_ollama(messages, max_tokens=200, temperature=0)
            if result:
                # Try to extract JSON from response
                try:
                    # Clean up response - sometimes model includes markdown code blocks
                    cleaned = result.strip()
                    if "```json" in cleaned:
                        cleaned = cleaned.split("```json")[1].split("```")[0].strip()
                    elif "```" in cleaned:
                        cleaned = cleaned.split("```")[1].split("```")[0].strip()
                    
                    ai_info = json.loads(cleaned)
                    info["action_items"] = ai_info.get("action_items", [])
                    info["dates"] = ai_info.get("dates", [])
                except json.JSONDecodeError:
                    # If JSON parsing fails, try to extract action items from text
                    lines = result.split("\n")
                    for line in lines:
                        line = line.strip()
                        if line and (line.startswith("-") or line.startswith("*") or line[0].isdigit()):
                            info["action_items"].append(line.lstrip("-* ").strip())
        except Exception as e:
            print(f"Error extracting AI info: {e}")
            pass
    
    return info


def generate_reply(email_text: str, tone: str = "professional", instructions: str = "") -> str:
    """Generate a reply draft based on the original email"""
    is_running = check_ollama_available()
    if not is_running:
        return "⚠️ Ollama is not running. Please install and start Ollama.\nInstall: https://ollama.ai/download\nAfter install, pull model: ollama pull llama3.1:8b"
    
    if not email_text or not email_text.strip():
        return "No email content available to generate a reply."
    
    system_msg = f"You are an assistant that drafts email replies in a {tone} tone. Do not include signatures. If the email asks questions, answer succinctly. Include 2-3 short paragraphs when needed. Always generate a complete reply."
    
    instruction_text = f"\n\nAdditional instructions: {instructions}" if instructions else ""
    user_msg = f"Original email:\n{email_text[:1500]}{instruction_text}\n\nDraft a reply:"
    
    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg}
    ]
    
    result = call_ollama(messages, max_tokens=400, temperature=0.3)
    if result and result.strip():
        return result
    
    # Final fallback: provide a template reply
    return f"Thank you for your email.\n\nI have reviewed your message and will respond accordingly.\n\nBest regards"
