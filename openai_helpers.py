"""
OpenAI helper functions using the current Chat Completions API
"""
import os
import json
import re
from openai import OpenAI

# Initialize client - will be None if API key not set
try:
    api_key = os.getenv("OPENAI_API_KEY")
    client = OpenAI(api_key=api_key) if api_key else None
except Exception:
    client = None


def generate_summary(text: str, max_tokens=200) -> str:
    """Generate a concise summary of an email"""
    if not client:
        return "OpenAI API key not configured."
    try:
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an assistant that summarizes emails concisely."},
                {"role": "user", "content": f"Summarize the following email in 2-4 concise bullet points and give an actionable next-step.\n\nEMAIL:\n{text}"}
            ],
            max_tokens=200,
            temperature=0.2,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"Error generating summary: {str(e)}"


def generate_priority_label(text: str) -> str:
    """Classify email priority as HIGH, MEDIUM, or LOW"""
    if not client:
        return "MEDIUM"
    try:
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an assistant that classifies email priority. Respond with only one word: HIGH, MEDIUM, or LOW."},
                {"role": "user", "content": f"Classify the priority of this email:\n\n{text}"}
            ],
            max_tokens=10,
            temperature=0,
        )
        label = resp.choices[0].message.content.strip().upper()
        if "HIGH" in label:
            return "HIGH"
        if "MEDIUM" in label:
            return "MEDIUM"
        return "LOW"
    except Exception as e:
        return "MEDIUM"


def analyze_sentiment(text: str) -> dict:
    """Analyze sentiment of email - returns sentiment label and score"""
    if not client:
        return {"sentiment": "neutral", "score": 0.5}
    try:
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Analyze the sentiment of the email. Respond ONLY with valid JSON in this exact format: {\"sentiment\": \"positive\" or \"negative\" or \"neutral\", \"score\": number between 0 and 1}"},
                {"role": "user", "content": f"Email text:\n{text}"}
            ],
            max_tokens=50,
            temperature=0,
        )
        result = json.loads(resp.choices[0].message.content.strip())
        return result
    except Exception as e:
        return {"sentiment": "neutral", "score": 0.5}


def categorize_email(text: str, subject: str = "") -> str:
    """Categorize email into predefined categories"""
    if not client:
        return "General"
    try:
        categories = ["Urgent Support", "Work/Business", "Personal", "Newsletter", "Spam/Promotional", "General"]
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": f"Categorize this email into ONE of these categories: {', '.join(categories)}. Respond with only the category name."},
                {"role": "user", "content": f"Subject: {subject}\n\nBody: {text}"}
            ],
            max_tokens=20,
            temperature=0,
        )
        category = resp.choices[0].message.content.strip()
        # Validate category
        for cat in categories:
            if cat.lower() in category.lower():
                return cat
        return "General"
    except Exception as e:
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
    if client:
        try:
            resp = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Extract action items and important dates from the email. Respond ONLY with valid JSON: {\"action_items\": [\"item1\", \"item2\"], \"dates\": [\"date1\", \"date2\"]}"},
                    {"role": "user", "content": text}
                ],
                max_tokens=200,
                temperature=0,
            )
            ai_info = json.loads(resp.choices[0].message.content.strip())
            info["action_items"] = ai_info.get("action_items", [])
            info["dates"] = ai_info.get("dates", [])
        except:
            pass
    
    return info


def generate_reply(email_text: str, tone: str = "professional", instructions: str = "") -> str:
    """Generate a reply draft based on the original email"""
    if not client:
        return "OpenAI API key not configured."
    try:
        system_msg = f"You are an assistant that drafts email replies in a {tone} tone. Do not include signatures. If the email asks questions, answer succinctly. Include 2-3 short paragraphs when needed."
        user_msg = f"Original email:\n{email_text}\n\nAdditional instructions: {instructions}\n\nDraft a reply:"
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ],
            max_tokens=400,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"Error generating reply: {str(e)}"
