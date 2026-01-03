"""
AI Email Assistant - Main Flask Application
Provides Gmail integration with AI-powered analysis using Gemini.
"""
import os
import re
import json
import uuid
import traceback
from pathlib import Path
from typing import Optional, Dict, Tuple, Any

from flask import Flask, session, redirect, url_for, request, render_template, flash, jsonify
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv
from base64 import urlsafe_b64decode, urlsafe_b64encode
from email.mime.text import MIMEText

from openai_helpers import (
    analyze_email_comprehensive, 
    generate_reply,
)
from database import save_email_analysis, get_analytics, get_email_by_id, search_emails

# Load environment variables
load_dotenv()

# ============ Configuration ============
DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"

# Only allow insecure transport in debug mode
if DEBUG:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

app = Flask(__name__)

# Secret key - require strong key in production
SECRET_KEY = os.getenv("FLASK_SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "dev-secret-key-do-not-use-in-production"
        print("WARNING: Using development secret key. Set FLASK_SECRET_KEY in production!")
    else:
        raise EnvironmentError("FLASK_SECRET_KEY environment variable is required in production")
        
app.secret_key = SECRET_KEY

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:5000/oauth2callback")
SCOPES = os.getenv(
    "SCOPES", 
    "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify"
).split()

TOKEN_STORE = Path("./tokens")
TOKEN_STORE.mkdir(exist_ok=True)

# ============ Regex Patterns ============
EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_PATTERN = re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b')


# ============ Helper Functions ============

def token_path_for_user(user_id: str) -> Path:
    """Get the token file path for a given user ID."""
    return TOKEN_STORE / f"token_{user_id}.json"


def save_credentials(user_id: str, creds: Credentials) -> None:
    """Save OAuth credentials to disk for a user."""
    data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": creds.scopes,
    }
    token_path_for_user(user_id).write_text(json.dumps(data))


def load_credentials(user_id: str) -> Optional[Credentials]:
    """Load OAuth credentials from disk for a user."""
    if not user_id:
        return None
    p = token_path_for_user(user_id)
    if not p.exists():
        return None
    try:
        data = json.loads(p.read_text())
        return Credentials(
            token=data["token"],
            refresh_token=data.get("refresh_token"),
            token_uri=data["token_uri"],
            client_id=data["client_id"],
            client_secret=data["client_secret"],
            scopes=data.get("scopes"),
        )
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Error loading credentials: {e}")
        return None


def create_flow() -> Flow:
    """Create an OAuth flow for Google authentication."""
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }
    return Flow.from_client_config(
        client_config=client_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
    )


def build_gmail_service(creds: Credentials):
    """Build and return a Gmail API service client."""
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


# ============ Label Management ============

def ensure_label_exists(service, label_name: str) -> Optional[str]:
    """
    Ensure a label exists in Gmail. Creates it if not found.
    
    Args:
        service: Gmail API service
        label_name: Name of the label to find or create
        
    Returns:
        Label ID if found/created, None on error
    """
    try:
        response = service.users().labels().list(userId="me").execute()
        labels = response.get("labels", [])
        
        for label in labels:
            if label["name"].lower() == label_name.lower():
                return label["id"]
        
        # Create label if not found
        label_object = {
            "name": label_name,
            "labelListVisibility": "labelShow",
            "messageListVisibility": "show"
        }
        created = service.users().labels().create(userId="me", body=label_object).execute()
        return created["id"]
    except Exception as e:
        print(f"Error creating/finding label {label_name}: {e}")
        return None


def apply_label(service, message_id: str, label_id: str) -> None:
    """Apply a label to a Gmail message."""
    try:
        if not label_id:
            return
            
        body = {
            "addLabelIds": [label_id],
            "removeLabelIds": []
        }
        service.users().messages().modify(userId="me", id=message_id, body=body).execute()
    except Exception as e:
        print(f"Error applying label: {e}")


# ============ Email Parsing ============

def parse_message_payload(payload: Dict) -> Tuple[str, str]:
    """
    Extract snippet and body from message payload.
    Prioritizes text/plain, falls back to text/html (stripped).
    
    Args:
        payload: Gmail message payload
        
    Returns:
        Tuple of (snippet, cleaned_body)
    """
    snippet = payload.get("snippet", "")
    plain_body = ""
    html_body = ""
    
    def walk_parts(part: Dict) -> None:
        nonlocal plain_body, html_body
        mime_type = part.get("mimeType", "")
        data = part.get("body", {}).get("data")
        
        if data:
            try:
                decoded = urlsafe_b64decode(data + "===").decode("utf-8", errors="ignore")
            except Exception:
                decoded = ""
            
            if mime_type == "text/plain":
                plain_body += decoded
            elif mime_type == "text/html":
                html_body += decoded
                
        for p in part.get("parts", []) or []:
            walk_parts(p)

    if "payload" in payload:
        walk_parts(payload["payload"])
        
    # Prefer plain text if available
    if plain_body.strip():
        body_text = plain_body
    elif html_body.strip():
        # Strip HTML tags
        clean_text = re.sub(r'<[^>]+>', ' ', html_body)
        body_text = re.sub(r'\s+', ' ', clean_text).strip()
    else:
        body_text = snippet

    # Clean up quoted replies and forwarded content
    body_text = _clean_email_body(body_text)
    
    return snippet, body_text


def _clean_email_body(body_text: str) -> str:
    """Remove quoted replies and forwarded headers from email body."""
    split_patterns = [
        r'On\s+.*,\s+.*wrote:',
        r'-+\s*Forwarded message\s*-+',
        r'From:\s+.*',
        r'_{20,}',
    ]
    
    lines = body_text.splitlines()
    clean_lines = []
    
    for line in lines:
        line = line.strip()
        
        # Check if line marks start of quote
        is_quote_start = any(re.match(pattern, line, re.IGNORECASE) for pattern in split_patterns)
        
        if is_quote_start:
            break
            
        # Skip lines that look like quoted text
        if line.startswith(">"):
            continue
            
        clean_lines.append(line)
        
    return "\n".join(clean_lines).strip()


# ============ API Routes ============

@app.route("/api/message/<message_id>")
def api_get_message(message_id: str):
    """Return message details as JSON, including all AI analysis."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401
    
    # Check if already in database
    cached = get_email_by_id(message_id, uid)
    if cached:
        if "quick_replies" not in cached:
            cached["quick_replies"] = []
        return jsonify(cached)
    
    service = build_gmail_service(creds)
    try:
        msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
        snippet, body = parse_message_payload(msg)
        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        
        subject = headers.get("Subject", "")
        text = body or snippet
        
        # Run comprehensive AI Analysis
        ai_result = analyze_email_comprehensive(text, subject)
        
        # Auto-Labeling
        category = ai_result.get("category", "General")
        if category and category != "General":
            label_name = f"ODIN/{category}"
            label_id = ensure_label_exists(service, label_name)
            if label_id:
                apply_label(service, message_id, label_id)
        
        # Extract regex-based info
        extracted_info = ai_result.get("extracted_info", {})
        if "emails" not in extracted_info:
            extracted_info["emails"] = list(set(EMAIL_PATTERN.findall(text)))
        if "phones" not in extracted_info:
            extracted_info["phones"] = list(set(PHONE_PATTERN.findall(text)))
        
        email_data = {
            "id": message_id,
            "user_id": uid,
            "snippet": snippet,
            "body": body,
            "headers": headers,
            "subject": subject,
            "sender": headers.get("From", ""),
            "date": headers.get("Date", ""),
            "summary": ai_result.get("summary", ""),
            "priority": ai_result.get("priority", "MEDIUM"),
            "sentiment": ai_result.get("sentiment", {}).get("sentiment", "neutral"),
            "sentiment_score": ai_result.get("sentiment", {}).get("score", 0.5),
            "category": category,
            "extracted_info": extracted_info,
            "quick_replies": ai_result.get("quick_replies", [])
        }
        
        save_email_analysis(email_data)
        
        return jsonify(email_data)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat", methods=["POST"])
def api_chat():
    """Handle chat requests for the RAG-powered inbox chat."""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json or {}
    question = data.get("question", "")
    
    if not question:
        return jsonify({"answer": "Please ask a question."})
    
    # Search database with user_id for security
    relevant_emails = search_emails(question, user_id=uid, limit=20)
    
    if not relevant_emails:
        return jsonify({
            "answer": "I couldn't find any emails matching your query in the database. Try different keywords.",
            "sources": []
        })
    
    # Format context
    context_text = ""
    for email in relevant_emails:
        content = email.get("body") or email.get("snippet", "")
        context_text += f"""
        ---
        ID: {email['id']}
        From: {email['sender']}
        Date: {email['date']}
        Subject: {email['subject']}
        Body: {content[:4000]} 
        ---
        """
    
    # Ask AI
    from openai_helpers import ask_gemini_with_context
    answer = ask_gemini_with_context(question, context_text)
    
    return jsonify({
        "answer": answer,
        "sources": relevant_emails[:5]
    })


@app.route("/api/prioritize", methods=["POST"])
def api_prioritize():
    """Prioritize multiple messages at once."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401
    
    data = request.json or {}
    ids = data.get("ids", [])
    
    if not ids:
        return jsonify({"error": "No message IDs provided"}), 400
    
    service = build_gmail_service(creds)
    results = {}
    
    for mid in ids:
        try:
            msg = service.users().messages().get(userId="me", id=mid, format="full").execute()
            snippet, body = parse_message_payload(msg)
            ai_result = analyze_email_comprehensive(body or snippet)
            results[mid] = ai_result.get("priority", "MEDIUM")
        except Exception as e:
            results[mid] = "ERROR"
            print(f"Error prioritizing {mid}: {e}")
    
    return jsonify(results)


@app.route("/api/analytics")
def api_analytics():
    """Get analytics data as JSON."""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "not authenticated"}), 401
    
    analytics_data = get_analytics(uid)
    return jsonify(analytics_data)


# ============ Page Routes ============

@app.before_request
def restore_single_token_session():
    """
    Auto-restore session if there's exactly one token file.
    Improves UX for single-user deployments.
    """
    if session.get("user_id"):
        return
    try:
        files = list(TOKEN_STORE.glob("token_*.json"))
        if len(files) == 1:
            fname = files[0].name
            if fname.startswith("token_") and fname.endswith(".json"):
                user_id = fname[len("token_"):-len(".json")]
                creds = load_credentials(user_id)
                if creds is not None:
                    session["user_id"] = user_id
    except Exception as e:
        print(f"Error restoring session: {e}")


@app.route("/")
def index():
    """Home page - redirects to inbox if authenticated."""
    if session.get("user_id"):
        if load_credentials(session["user_id"]):
            return redirect(url_for("inbox"))
    return render_template("home.html")


@app.route("/login-page")
def login_page():
    """Login page with Google OAuth button."""
    if session.get("user_id") and load_credentials(session["user_id"]):
        return redirect(url_for("inbox"))
    return render_template("login.html")


@app.route("/login")
def login():
    """Initiate Google OAuth flow."""
    flow = create_flow()
    authorization_url, state = flow.authorization_url(
        access_type="offline", 
        include_granted_scopes="true", 
        prompt="consent"
    )
    session["oauth_state"] = state
    return redirect(authorization_url)


@app.route("/oauth2callback")
def oauth2callback():
    """Handle OAuth callback from Google."""
    flow = create_flow()
    flow.fetch_token(authorization_response=request.url)

    creds = flow.credentials
    user_id = str(uuid.uuid4())
    session["user_id"] = user_id
    save_credentials(user_id, creds)
    flash("Logged in successfully.", "success")
    return redirect(url_for("inbox"))


@app.route("/logout")
def logout():
    """Log out and clear session."""
    uid = session.get("user_id")
    if uid:
        p = token_path_for_user(uid)
        try:
            p.unlink()
        except FileNotFoundError:
            pass
    session.clear()
    flash("Logged out.", "info")
    return redirect(url_for("index"))


@app.route("/chat")
def chat_page():
    """Chat with inbox page."""
    uid = session.get("user_id")
    if not uid:
        return redirect(url_for("index"))
    return render_template("chat.html")


@app.route("/inbox")
def inbox():
    """Main inbox view."""
    uid = session.get("user_id")
    if not uid:
        return redirect(url_for("index"))

    creds = load_credentials(uid)
    if not creds:
        flash("Please sign in.", "warning")
        return redirect(url_for("index"))

    try:
        service = build_gmail_service(creds)
        
        query = request.args.get("q", "")
        gmail_query = query if query else "in:inbox OR in:spam"
        
        resp = service.users().messages().list(
            userId="me", 
            maxResults=30, 
            q=gmail_query,
            includeSpamTrash=True 
        ).execute()
        
        msg_list = resp.get("messages", [])
        messages = []

        for m in msg_list:
            msg = service.users().messages().get(
                userId="me", id=m["id"], format="metadata", 
                metadataHeaders=["From", "Subject", "Date"]
            ).execute()
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            labels = msg.get("labelIds", [])
            
            messages.append({
                "id": m["id"],
                "snippet": msg.get("snippet", ""),
                "from": headers.get("From", "(Unknown sender)"),
                "subject": headers.get("Subject", "(No subject)"),
                "date": headers.get("Date", "(No date)"),
                "is_spam": "SPAM" in labels,
                "labels": labels
            })

        if not messages:
            flash("No messages found.", "info")

        return render_template("inbox.html", messages=messages)

    except Exception as e:
        print(f"Error fetching inbox: {e}")
        traceback.print_exc()
        flash("Error fetching inbox messages. Check console for details.", "danger")
        return render_template("inbox.html", messages=[])


@app.route("/message/<message_id>")
def message_detail(message_id: str):
    """Individual message detail view."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return redirect(url_for("index"))

    response = api_get_message(message_id)
    if isinstance(response, tuple):
        flash("Error loading message", "danger")
        return redirect(url_for("inbox"))
    
    data = response.get_json()
    return render_template("message.html", **data)


@app.route("/analytics")
def analytics():
    """Analytics dashboard view."""
    uid = session.get("user_id")
    if not uid:
        return redirect(url_for("index"))
    
    creds = load_credentials(uid)
    if not creds:
        return redirect(url_for("index"))
    
    analytics_data = get_analytics(uid)
    return render_template("analytics.html", analytics=analytics_data)


@app.route("/generate_reply/<message_id>", methods=["POST"])
def generate_reply_endpoint(message_id: str):
    """Generate an AI-powered reply for a message."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401

    try:
        service = build_gmail_service(creds)
        msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
        snippet, body = parse_message_payload(msg)
        
        data = request.json or {}
        tone = data.get("tone", "professional")
        extra = data.get("instructions", "")
        
        draft = generate_reply(body or snippet, tone=tone, instructions=extra)
        return jsonify({"reply": draft})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/send_reply/<message_id>", methods=["POST"])
def send_reply_endpoint(message_id: str):
    """Send a reply email via Gmail API."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401

    try:
        service = build_gmail_service(creds)
        
        msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        original_from = headers.get("From", "")
        original_subject = headers.get("Subject", "")
        
        # Extract email address
        email_match = EMAIL_PATTERN.search(original_from)
        reply_to = email_match.group(0) if email_match else original_from
        
        data = request.json or {}
        reply_text = data.get("reply_text", "")
        if not reply_text:
            return jsonify({"error": "Reply text is required"}), 400
        
        # Create reply subject
        reply_subject = f"Re: {original_subject}" if not original_subject.startswith("Re:") else original_subject
        
        # Create message
        message_obj = MIMEText(reply_text)
        message_obj['To'] = reply_to
        message_obj['Subject'] = reply_subject
        message_obj['In-Reply-To'] = headers.get("Message-ID", "")
        message_obj['References'] = headers.get("Message-ID", "")
        
        raw_message = urlsafe_b64encode(message_obj.as_bytes()).decode('utf-8')
        
        send_message = service.users().messages().send(
            userId="me",
            body={'raw': raw_message}
        ).execute()
        
        return jsonify({
            "success": True,
            "message_id": send_message.get("id"),
            "message": "Reply sent successfully"
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Failed to send reply: {str(e)}"}), 500


# ============ Health Check ============

@app.route("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return jsonify({"status": "healthy", "debug": DEBUG})


# ============ Entry Point ============

if __name__ == "__main__":
    app.run(debug=DEBUG, port=5000)
