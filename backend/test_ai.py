
import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv

# Force reload .env
load_dotenv(override=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

print(f"--- AI Diagnostic Tool ---")
print(f"Gemini Key: {'LOADED' if GEMINI_API_KEY else 'MISSING'}")
print(f"Groq Key: {'LOADED' if GROQ_API_KEY else 'MISSING'}")
if GROQ_API_KEY:
    print(f"Groq Prefix: {GROQ_API_KEY[:8]}...")

def test_groq():
    print("\n[TEST] Groq API...")
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": "Say hello!"}],
        "max_tokens": 10
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Response:", response.json()['choices'][0]['message']['content'])
            return True
        else:
            print("Error Body:", response.text)
            return False
    except Exception as e:
        print(f"Exception: {e}")
        return False

def test_gemini():
    print("\n[TEST] Gemini API...")
    if not GEMINI_API_KEY: return False
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Say hello!")
        print("Response:", response.text)
        return True
    except Exception as e:
        print(f"Exception: {e}")
        return False

if __name__ == "__main__":
    groq_ok = test_groq()
    gemini_ok = test_gemini()
    
    print(f"\n--- Final Verdict ---")
    print(f"Groq: {'✅' if groq_ok else '❌'}")
    print(f"Gemini: {'✅' if gemini_ok else '❌'}")
