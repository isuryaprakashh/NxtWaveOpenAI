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
    """Call Ollama API with chat messages"""
    # Check dynamically if Ollama is available
    is_running = check_ollama_available()
    if not is_running:
        print("Ollama is not running. Please start Ollama service.")
        return None
    
    try:
        url = f"{OLLAMA_BASE_URL}/api/chat"
        payload = {
            "model": OLLAMA_MODEL,
            "messages": messages,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            },
            "stream": False
        }
        # Use appropriate timeout (120s for cloud models, 60s for local)
        timeout = 120 if "cloud" in OLLAMA_MODEL.lower() else 60
        response = requests.post(url, json=payload, timeout=timeout)
        
        # Handle payment required error (402) for cloud models
        if response.status_code == 402:
            print(f"⚠️ Model '{OLLAMA_MODEL}' requires payment. Switching to local model 'llama3.1:8b'...")
            # Try with local model as fallback
            payload["model"] = "llama3.1:8b"
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
        else:
            response.raise_for_status()
        
        data = response.json()
        content = data.get("message", {}).get("content", "").strip()
        
        if not content:
            # Check for error in response
            if "error" in data:
                error_msg = data.get("error", "Unknown error")
                print(f"Ollama API error: {error_msg}")
                return None
            # Log empty response for debugging
            print(f"⚠️ Ollama returned empty response for model '{OLLAMA_MODEL}'. Response: {data}")
            return None
        
        return content
    except requests.exceptions.ConnectionError:
        print(f"Could not connect to Ollama at {OLLAMA_BASE_URL}. Is Ollama running?")
        return None
    except requests.exceptions.Timeout:
        print(f"Request timed out after {timeout}s. Model may be loading or overloaded.")
        return None
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"Model '{OLLAMA_MODEL}' not found. Available models:")
            try:
                models_resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2)
                models = [m["name"] for m in models_resp.json().get("models", [])]
                print(f"  {', '.join(models)}")
                print(f"\nRun: ollama pull {OLLAMA_MODEL}")
            except:
                pass
        elif e.response.status_code == 402:
            print(f"⚠️ Model '{OLLAMA_MODEL}' requires payment/subscription.")
            print(f"💡 Use a free local model like 'llama3.1:8b' instead.")
        else:
            print(f"Ollama API error (HTTP {e.response.status_code}): {str(e)}")
        return None
    except Exception as e:
        print(f"Ollama API error: {str(e)}")
        return None


def generate_summary(text: str, max_tokens=200) -> str:
    """Generate a concise summary of an email"""
    is_running = check_ollama_available()
    if not is_running:
        return "⚠️ Ollama is not running. Please install and start Ollama.\nInstall: https://ollama.ai/download\nAfter install, pull model: ollama pull llama3.1:8b"
    
    messages = [
        {"role": "system", "content": "You are an assistant that summarizes emails concisely."},
        {"role": "user", "content": f"Summarize the following email in 2-4 concise bullet points and give an actionable next-step.\n\nEMAIL:\n{text}"}
    ]
    
    result = call_ollama(messages, max_tokens=max_tokens, temperature=0.2)
    if result:
        return result
    return f"⚠️ Error generating summary. Ensure:\n1. Ollama is running (check: http://localhost:11434)\n2. Model is downloaded: ollama pull {OLLAMA_MODEL}"


def generate_priority_label(text: str) -> str:
    """Classify email priority as HIGH, MEDIUM, or LOW"""
    is_running = check_ollama_available()
    if not is_running:
        return "MEDIUM"  # Default fallback
    
    messages = [
        {"role": "system", "content": "You are an assistant that classifies email priority. Respond with only one word: HIGH, MEDIUM, or LOW."},
        {"role": "user", "content": f"Classify the priority of this email:\n\n{text}"}
    ]
    
    result = call_ollama(messages, max_tokens=10, temperature=0)
    if result:
        label = result.upper()
        if "HIGH" in label:
            return "HIGH"
        if "MEDIUM" in label:
            return "MEDIUM"
        return "LOW"
    return "MEDIUM"


def analyze_sentiment(text: str) -> dict:
    """Analyze sentiment of email - returns sentiment label and score"""
    is_running = check_ollama_available()
    if not is_running:
        return {"sentiment": "neutral", "score": 0.5}  # Default fallback
    
    messages = [
        {"role": "system", "content": "Analyze the sentiment of the email. Respond ONLY with valid JSON in this exact format: {\"sentiment\": \"positive\" or \"negative\" or \"neutral\", \"score\": number between 0 and 1}"},
        {"role": "user", "content": f"Email text:\n{text}"}
    ]
    
    result = call_ollama(messages, max_tokens=50, temperature=0)
    if result:
        try:
            # Try to parse JSON from response
            result_json = json.loads(result)
            return result_json
        except json.JSONDecodeError:
            # If not JSON, try to extract sentiment from text
            result_lower = result.lower()
            sentiment = "neutral"
            if "positive" in result_lower:
                sentiment = "positive"
            elif "negative" in result_lower:
                sentiment = "negative"
            return {"sentiment": sentiment, "score": 0.5}
    
    return {"sentiment": "neutral", "score": 0.5}


def categorize_email(text: str, subject: str = "") -> str:
    """Categorize email into predefined categories"""
    is_running = check_ollama_available()
    if not is_running:
        return "General"  # Default fallback
    
    categories = ["Urgent Support", "Work/Business", "Personal", "Newsletter", "Spam/Promotional", "General"]
    messages = [
        {"role": "system", "content": f"Categorize this email into ONE of these categories: {', '.join(categories)}. Respond with only the category name."},
        {"role": "user", "content": f"Subject: {subject}\n\nBody: {text}"}
    ]
    
    result = call_ollama(messages, max_tokens=20, temperature=0)
    if result:
        category = result.strip()
        # Validate category
        for cat in categories:
            if cat.lower() in category.lower():
                return cat
    return "General"


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
    if check_ollama_available():
        try:
            messages = [
                {"role": "system", "content": "Extract action items and important dates from the email. Respond ONLY with valid JSON: {\"action_items\": [\"item1\", \"item2\"], \"dates\": [\"date1\", \"date2\"]}"},
                {"role": "user", "content": text}
            ]
            result = call_ollama(messages, max_tokens=200, temperature=0)
            if result:
                ai_info = json.loads(result)
                info["action_items"] = ai_info.get("action_items", [])
                info["dates"] = ai_info.get("dates", [])
        except:
            pass
    
    return info


def generate_reply(email_text: str, tone: str = "professional", instructions: str = "") -> str:
    """Generate a reply draft based on the original email"""
    is_running = check_ollama_available()
    if not is_running:
        return "⚠️ Ollama is not running. Please install and start Ollama.\nInstall: https://ollama.ai/download\nAfter install, pull model: ollama pull llama3.1:8b"
    
    # Verify model is available
    if not check_model_available(OLLAMA_MODEL):
        return f"⚠️ Model '{OLLAMA_MODEL}' not found. Run: ollama pull llama3.1:8b"
    
    system_msg = f"You are an assistant that drafts email replies in a {tone} tone. Do not include signatures. If the email asks questions, answer succinctly. Include 2-3 short paragraphs when needed."
    user_msg = f"Original email:\n{email_text}\n\nAdditional instructions: {instructions}\n\nDraft a reply:"
    
    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg}
    ]
    
    try:
        # Direct API call with better error handling
        url = f"{OLLAMA_BASE_URL}/api/chat"
        payload = {
            "model": OLLAMA_MODEL,
            "messages": messages,
            "options": {
                "temperature": 0.3,
                "num_predict": 400
            },
            "stream": False
        }
        
        timeout = 120 if "cloud" in OLLAMA_MODEL.lower() else 60
        response = requests.post(url, json=payload, timeout=timeout)
        
        # Handle payment required error (402) for cloud models
        if response.status_code == 402:
            print(f"⚠️ Model '{OLLAMA_MODEL}' requires payment. Switching to local model 'llama3.1:8b'...")
            payload["model"] = "llama3.1:8b"
            response = requests.post(url, json=payload, timeout=60)
        
        response.raise_for_status()
        data = response.json()
        content = data.get("message", {}).get("content", "").strip()
        
        if content:
            return content
        
        # If empty response, check for errors in response
        if "error" in data:
            error_msg = data.get("error", "Unknown error")
            print(f"Ollama API error: {error_msg}")
            return f"⚠️ Ollama error: {error_msg}\n\nTry: ollama pull {OLLAMA_MODEL}"
        
        # Empty response without error - likely model issue
        print(f"⚠️ Ollama returned empty response. Response data: {data}")
        return "⚠️ Model returned empty response. Try:\n1. ollama pull llama3.1:8b\n2. Restart Ollama service\n3. Check model is loaded: ollama list"
        
    except requests.exceptions.ConnectionError:
        return f"⚠️ Cannot connect to Ollama at {OLLAMA_BASE_URL}. Is Ollama running?"
    except requests.exceptions.Timeout:
        return "⚠️ Request timed out. The model may be loading or overloaded. Try again in a moment."
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            return f"⚠️ Model '{OLLAMA_MODEL}' not found. Run: ollama pull {OLLAMA_MODEL}"
        elif e.response.status_code == 402:
            return f"⚠️ Model '{OLLAMA_MODEL}' requires payment. Use free model: ollama pull llama3.1:8b"
        else:
            return f"⚠️ HTTP error {e.response.status_code}: {str(e)}"
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Exception in generate_reply: {error_details}")
        return f"⚠️ Error: {str(e)}\n\nEnsure Ollama is running and model is available."
