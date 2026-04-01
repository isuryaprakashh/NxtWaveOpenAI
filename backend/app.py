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
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from concurrent.futures import ThreadPoolExecutor
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv
load_dotenv()
from base64 import urlsafe_b64decode, urlsafe_b64encode
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

from openai_helpers import (
    analyze_email_comprehensive, 
    generate_reply,
)
from database import (
    save_email_analysis, 
    get_analytics, 
    get_email_by_id, 
    search_emails, 
    delete_email_by_id,
    save_emails_batch,
    get_emails_by_user,
    save_user_token,
    load_user_token
)

# ============ Configuration ============
DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"

# Only allow insecure transport in debug mode
if DEBUG:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
analysis_executor = ThreadPoolExecutor(max_workers=5)

# Secret key - require strong key in production
SECRET_KEY = os.getenv("FLASK_SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = os.urandom(24).hex()
        print("WARNING: Using random development secret key. Sessions will reset on restart. Set FLASK_SECRET_KEY in production!")
    else:
        raise EnvironmentError("FLASK_SECRET_KEY environment variable is required in production")
        
app.secret_key = SECRET_KEY

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:5000/oauth2callback")
SCOPES = os.getenv(
    "SCOPES", 
    "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send"
).split()

TOKEN_STORE = Path("./tokens")
TOKEN_STORE.mkdir(exist_ok=True)

DEBUG = os.getenv("FLASK_DEBUG", "True").lower() == "true"
# Frontend URL for redirects - fallback to localhost if not set
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Enable CORS for the frontend
CORS(app, supports_credentials=True, origins=[FRONTEND_URL, "http://localhost:5173"])

# ============ Regex Patterns ============
EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_PATTERN = re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b')


# ============ Helper Functions ============

def save_credentials(user_id: str, creds: Credentials) -> None:
    """Save OAuth credentials to MongoDB with encryption."""
    data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": creds.scopes,
    }
    save_user_token(user_id, data)


def load_credentials(user_id: str) -> Optional[Credentials]:
    """Load and decrypt OAuth credentials from MongoDB."""
    if not user_id:
        return None
    
    data = load_user_token(user_id)
    if not data:
        return None
        
    try:
        return Credentials(
            token=data["token"],
            refresh_token=data.get("refresh_token"),
            token_uri=data["token_uri"],
            client_id=data["client_id"],
            client_secret=data["client_secret"],
            scopes=data.get("scopes"),
        )
    except Exception as e:
        print(f"Error reconstruct credentials: {e}")
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
        # Remove style and script blocks entirely (including content)
        clean_html = re.sub(r'<style[^>]*>.*?</style>', '', html_body, flags=re.DOTALL | re.IGNORECASE)
        clean_html = re.sub(r'<script[^>]*>.*?</script>', '', clean_html, flags=re.DOTALL | re.IGNORECASE)
        # Remove comments
        clean_html = re.sub(r'<!--.*?-->', '', clean_html, flags=re.DOTALL)
        # Convert block elements to newlines for paragraph structure
        clean_html = re.sub(r'</?(p|div|br|h[1-6]|li|tr)[^>]*>', '\n', clean_html, flags=re.IGNORECASE)
        # Now strip remaining HTML tags
        clean_text = re.sub(r'<[^>]+>', ' ', clean_html)
        # Clean up multiple spaces on same line, but preserve newlines
        clean_text = re.sub(r'[^\S\n]+', ' ', clean_text)
        # Clean up multiple consecutive newlines (keep max 2)
        clean_text = re.sub(r'\n{3,}', '\n\n', clean_text)
        body_text = clean_text.strip()
    else:
        body_text = snippet

    # Clean up quoted replies and forwarded content
    body_text = _clean_email_body(body_text)
    
    return snippet, body_text


def _clean_email_body(body_text: str) -> str:
    """
    Clean email body while preserving forwarded content.
    Only removes actual quoted lines (starting with >) and excessive signatures.
    """
    lines = body_text.splitlines()
    clean_lines = []
    consecutive_empty = 0
    
    for line in lines:
        stripped = line.strip()
        
        # Skip lines that are quoted replies (starting with >)
        if stripped.startswith(">"):
            continue
        
        # Track consecutive empty lines to avoid excessive whitespace
        if not stripped:
            consecutive_empty += 1
            if consecutive_empty <= 2:
                clean_lines.append("")
            continue
        else:
            consecutive_empty = 0
        
        clean_lines.append(line)
    
    result = "\n".join(clean_lines).strip()
    
    # If result is too short (likely just a signature), return original
    if len(result) < 50 and len(body_text) > 100:
        return body_text.strip()
    
    return result


# ============ API Routes ============

@app.route("/api/auth/check")
def api_auth_check():
    """Check if user is authenticated."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if creds:
        return jsonify({"authenticated": True, "user_id": uid})
    return jsonify({"authenticated": False})


@app.route("/api/inbox")
def api_inbox():
    """Return inbox emails as JSON for React frontend. Checks MongoDB first for speed."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401
    
    query = request.args.get("q", "")
    page_token = request.args.get("pageToken", None)
    folder = request.args.get("folder", "inbox").lower()
    
    # Try to fetch from MongoDB first if it's a standard inbox view without search/paging
    if not query and not page_token and folder == "inbox":
        db_emails = get_emails_by_user(uid, limit=50)
        if len(db_emails) >= 50:
            print(f"🚀 Serving 50 emails from MongoDB for {uid}")
            return jsonify({
                "messages": db_emails,
                "nextPageToken": None, # Paging still requires Gmail API for now
                "from_cache": True
            })

    # If not in DB or special request, fetch from Gmail
    service = build_gmail_service(creds)
    label_id = "INBOX"
    if folder == "sent":
        label_id = "SENT"
        
    try:
        req = service.users().messages().list(
            userId="me", maxResults=50, q=query, labelIds=[label_id], pageToken=page_token
        )
        response = req.execute()
        
        msg_list = response.get("messages", [])
        next_page_token = response.get("nextPageToken")
        
        messages = []
        sync_list = [] # List for background sync (metadata only for list)
        
        for m in msg_list:
            # Metadata-only fetch is 10x faster for the inbox list
            msg = service.users().messages().get(
                userId="me", id=m["id"], format="metadata",
                metadataHeaders=["From", "To", "Subject", "Date", "Delivered-To"]
            ).execute()
            
            headers_list = msg.get("payload", {}).get("headers", [])
            labels = msg.get("labelIds", [])
            snippet = msg.get("snippet", "")
            
            # Helper to get header case-insensitively
            def get_header(name, default):
                return next((h["value"] for h in headers_list if h["name"].lower() == name.lower()), default)

            # Metadata fetch doesn't include attachments info in 'full' way, 
            # but we can check for the 'Has Attachment' label or look at headers.
            has_attachments = "ATTACHMENT" in labels or any("attachment" in h["value"].lower() for h in headers_list if h["name"].lower() == "content-type")
            
            email_item = {
                "id": m["id"],
                "user_id": uid,
                "snippet": snippet,
                "body": None, # Will be fetched via lazy-load when clicked
                "from": get_header("From", "Unknown Sender"),
                "to": get_header("To", get_header("Delivered-To", "Unknown Recipient")),
                "subject": get_header("Subject", "No Subject"),
                "date": get_header("Date", "No Date"),
                "is_spam": "SPAM" in labels,
                "labels": labels,
                "has_attachments": has_attachments,
                "attachments": [] # Lazy loaded
            }
            messages.append(email_item)
            sync_list.append(email_item)
        
        # Save to MongoDB for RAG and future fast access
        if not query and folder == "inbox":
            save_emails_batch(sync_list)
            print(f"✅ Synced {len(sync_list)} emails to MongoDB for {uid}")
        
        return jsonify({
            "messages": messages,
            "nextPageToken": next_page_token,
            "from_cache": False
        })
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An internal error occurred while fetching the inbox. Please try again later."}), 500


@app.route("/api/message/<message_id>")
def api_get_message(message_id: str):
    """Return message details as JSON. Use lazy=1 for instant load without AI."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401
    
    # Check for refresh parameter to force re-fetch
    refresh = request.args.get("refresh", "0") == "1"
    lazy = request.args.get("lazy", "0") == "1"  # Skip AI for instant load
    
    if refresh:
        delete_email_by_id(message_id, uid)
    
    # Check if already in database (skip if refresh requested)
    if not refresh:
        cached = get_email_by_id(message_id, uid)
        if cached:
            if "quick_replies" not in cached:
                cached["quick_replies"] = []
            if "attachments" not in cached:
                cached["attachments"] = []
            if "has_attachments" not in cached:
                cached["has_attachments"] = len(cached.get("attachments", [])) > 0
            return jsonify(cached)
    
    service = build_gmail_service(creds)
    try:
        msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
        snippet, body = parse_message_payload(msg)
        headers_list = msg.get("payload", {}).get("headers", [])
        headers = {h["name"].lower(): h["value"] for h in headers_list}
        
        subject = next((h["value"] for h in headers_list if h["name"].lower() == "subject"), "")
        text = body or snippet
        
        # Extract attachments first (fast)
        attachments = []
        def find_attachments(part):
            body_data = part.get("body", {})
            filename = part.get("filename", "")
            mime = part.get("mimeType", "")
            att_id = body_data.get("attachmentId", "")
            # Check Content-Disposition header for attachment indicator
            part_headers = {h["name"].lower(): h["value"] for h in part.get("headers", [])}
            disposition = part_headers.get("content-disposition", "")
            
            if filename and att_id:
                attachments.append({
                    "filename": filename,
                    "mimeType": mime,
                    "size": body_data.get("size", 0),
                    "attachmentId": att_id
                })
            elif att_id and not mime.startswith("multipart/") and not mime.startswith("text/"):
                # Has attachment data but no filename — generate one
                ext = mime.split("/")[-1].split(";")[0] if "/" in mime else "bin"
                gen_name = f"attachment.{ext}"
                attachments.append({
                    "filename": gen_name,
                    "mimeType": mime,
                    "size": body_data.get("size", 0),
                    "attachmentId": att_id
                })
            elif "attachment" in disposition and att_id:
                # Content-Disposition says attachment
                gen_name = filename or "attachment"
                attachments.append({
                    "filename": gen_name,
                    "mimeType": mime,
                    "size": body_data.get("size", 0),
                    "attachmentId": att_id
                })
            for subpart in part.get("parts", []):
                find_attachments(subpart)
        
        payload = msg.get("payload", {})
        find_attachments(payload)
        
        # Base email data (fast - no AI)
        email_data = {
            "id": message_id,
            "user_id": uid,
            "snippet": snippet,
            "body": body,
            "headers": headers,
            "subject": subject,
            "sender": next((h["value"] for h in headers_list if h["name"].lower() == "from"), ""),
            "to": next((h["value"] for h in headers_list if h["name"].lower() == "to"), next((h["value"] for h in headers_list if h["name"].lower() == "delivered-to"), "")),
            "date": next((h["value"] for h in headers_list if h["name"].lower() == "date"), ""),
            "attachments": attachments,
            "has_attachments": len(attachments) > 0,
            # AI fields - will be empty if lazy
            "summary": None,
            "priority": None,
            "sentiment": None,
            "sentiment_score": None,
            "category": None,
            "extracted_info": {"emails": list(set(EMAIL_PATTERN.findall(text))), "phones": list(set(PHONE_PATTERN.findall(text)))},
            "quick_replies": [],
            "ai_loaded": False
        }
        
        # Skip AI if lazy mode
        if not lazy:
            ai_result = analyze_email_comprehensive(text, subject)
            summary = ai_result.get("summary", "")
            if isinstance(summary, list):
                summary = "\n".join([str(s) for s in summary])
            
            email_data["summary"] = summary
            email_data["priority"] = ai_result.get("priority", "MEDIUM")
            email_data["sentiment"] = ai_result.get("sentiment", {}).get("sentiment", "neutral")
            email_data["sentiment_score"] = ai_result.get("sentiment", {}).get("score", 0.5)
            email_data["category"] = ai_result.get("category", "General")
            extracted_info = ai_result.get("extracted_info", {})
            email_data["extracted_info"]["action_items"] = extracted_info.get("action_items", [])
            email_data["extracted_info"]["dates"] = extracted_info.get("dates", [])
            email_data["quick_replies"] = ai_result.get("quick_replies", [])
            email_data["ai_loaded"] = True
            save_email_analysis(email_data)
        
        return jsonify(email_data)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An internal error occurred while loading the message."}), 500


@app.route("/api/message/<message_id>/analyze")
def api_analyze_message(message_id: str):
    """Get AI analysis for a message (for lazy loading).
    Also persists the email + analysis to DB so RAG chat can find it.
    """
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401
    
    # Check cache first
    cached = get_email_by_id(message_id, uid)
    if cached and cached.get("summary"):
        return jsonify({
            "summary": cached.get("summary"),
            "priority": cached.get("priority"),
            "sentiment": cached.get("sentiment"),
            "sentiment_score": cached.get("sentiment_score"),
            "category": cached.get("category"),
            "quick_replies": cached.get("quick_replies", []),
            "extracted_info": cached.get("extracted_info", {}),
            "ai_loaded": True
        })
    
    service = build_gmail_service(creds)
    try:
        msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
        snippet, body = parse_message_payload(msg)
        headers_list = msg.get("payload", {}).get("headers", [])
        headers = {h["name"].lower(): h["value"] for h in headers_list}
        
        # Helper to get header case-insensitively
        def get_header(name, default):
            return next((h["value"] for h in headers_list if h["name"].lower() == name.lower()), default)

        subject = get_header("subject", "")
        text = body or snippet
        
        # Run AI analysis in background if not cached
        def run_background_analysis(msg_id, uid_val, email_text, subj):
            with app.app_context():
                try:
                    result = analyze_email_comprehensive(email_text, subj)
                    # Save results to DB
                    email_data = {
                         "id": msg_id,
                         "user_id": uid_val,
                         "summary": result.get("summary", ""),
                         "priority": result.get("priority", "MEDIUM"),
                         "sentiment": result.get("sentiment", {}).get("sentiment", "neutral"),
                         "sentiment_score": result.get("sentiment", {}).get("score", 0.5),
                         "category": result.get("category", "General"),
                         "extracted_info": result.get("extracted_info", {}),
                    }
                    save_email_analysis(email_data)
                    # Push result to user via Sockets
                    socketio.emit('analysis_complete', email_data, room=uid_val)
                    print(f"✅ Background analysis complete for {msg_id}")
                except Exception as e:
                    print(f"❌ Background analysis failed: {e}")

        # Trigger analysis if not already analyzed (check fields)
        if not cached or not cached.get('summary'):
            analysis_executor.submit(run_background_analysis, message_id, uid, text, subject)

        return jsonify({
            "id": message_id,
            "snippet": snippet,
            "body": body,
            "subject": subject,
            "sender": next((h["value"] for h in headers_list if h["name"].lower() == "from"), ""),
            "date": next((h["value"] for h in headers_list if h["name"].lower() == "date"), ""),
            "attachments": attachments,
            "has_attachments": len(attachments) > 0,
            # Return cached data if exist, else return placeholders
            "summary": cached.get("summary") if cached else None,
            "priority": cached.get("priority") if cached else "ANALYZING...",
            "category": cached.get("category") if cached else "ANALYZING...",
            "ai_loaded": bool(cached and cached.get('summary'))
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An internal error occurred while analyzing the message."}), 500


@app.route("/api/attachment/<message_id>/<attachment_id>")
def api_get_attachment(message_id: str, attachment_id: str):
    """Download an attachment from a Gmail message."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401
    
    service = build_gmail_service(creds)
    try:
        # Get the attachment data
        attachment = service.users().messages().attachments().get(
            userId="me", 
            messageId=message_id, 
            id=attachment_id
        ).execute()
        
        data = attachment.get("data", "")
        if not data:
            return jsonify({"error": "No attachment data"}), 404
        
        # Decode the attachment
        file_data = urlsafe_b64decode(data + "===")
        
        # Get filename from query param
        filename = request.args.get("filename", "attachment")
        mime_type = request.args.get("mimeType", "application/octet-stream")
        
        # Return the file
        from flask import Response
        response = Response(file_data, mimetype=mime_type)
        response.headers["Content-Disposition"] = f'inline; filename="{filename}"'
        return response
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An internal error occurred while downloading the attachment."}), 500


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
    
    # Fallback: If no keywords match, fetch recent emails
    # This enables questions like "Summarize my inbox" or "What's new?"
    is_fallback = False
    if not relevant_emails:
        relevant_emails = search_emails("", user_id=uid, limit=30)
        is_fallback = True
        
    if not relevant_emails:
        return jsonify({
            "answer": "I couldn't find any emails in your inbox to analyze. Please try refreshing your inbox.",
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


# ============ Page Routes ============


@app.route("/")
def index():
    """Redirect to React home page."""
    return redirect(FRONTEND_URL)


@app.route("/login-page")
def login_page():
    """Redirect to React (login handled by Flask OAuth)."""
    return redirect(FRONTEND_URL)


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
    
    # Use user's email as persistent ID instead of random UUID
    service = build_gmail_service(creds)
    profile = service.users().getProfile(userId='me').execute()
    user_id = profile.get('emailAddress')
    
    session["user_id"] = user_id
    save_credentials(user_id, creds)
    # Redirect to React frontend
    return redirect(f"{FRONTEND_URL}/inbox")


@app.route("/logout")
def logout():
    """Log out and clear session, including cached data."""
    uid = session.get("user_id")
    if uid:
        # Delete token file
        p = token_path_for_user(uid)
        try:
            p.unlink()
        except FileNotFoundError:
            pass
            
    session.clear()
    # Redirect to React frontend
    return redirect(FRONTEND_URL)


@app.route("/chat")
def chat_page():
    """Redirect to React chat page."""
    return redirect(f"{FRONTEND_URL}/chat")


@app.route("/inbox")
def inbox():
    """Redirect to React inbox page."""
    return redirect(f"{FRONTEND_URL}/inbox")




@app.route("/message/<message_id>")
def message_detail(message_id: str):
    """Redirect to React message page."""
    return redirect(f"{FRONTEND_URL}/message/{message_id}")


@app.route("/api/analytics")
def analytics():
    """Redirect to React analytics page."""
    return redirect(f"{FRONTEND_URL}/analytics")


# ============ SocketIO Event Handlers ============


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
        return jsonify({"error": "An internal error occurred while generating a reply."}), 500


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
            "message": "Email sent successfully!"
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Failed to send the email. Please try again."}), 500


@app.route("/api/compose", methods=["POST"])
def api_compose():
    """Compose and send a new email."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401

    try:
        service = build_gmail_service(creds)
        
        data = request.json or {}
        to = data.get("to")
        subject = data.get("subject")
        body = data.get("body")
        attachments = data.get("attachments", []) # List of {filename, content (base64)}
        
        if not to:
            return jsonify({"error": "Recipient (to) is required"}), 400
        if not subject:
            return jsonify({"error": "Subject is required"}), 400
        if not body:
            return jsonify({"error": "Email body is required"}), 400
        
        # Create message
        if not attachments:
            message_obj = MIMEText(body)
        else:
            message_obj = MIMEMultipart()
            message_obj.attach(MIMEText(body))
            
            for att in attachments:
                try:
                    filename = att.get("filename", "attachment")
                    content_b64 = att.get("content", "")
                    if not content_b64: continue
                    
                    # Handle raw base64 or data URI
                    if "," in content_b64:
                        content_b64 = content_b64.split(",")[1]
                    
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(urlsafe_b64decode(content_b64))
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename=\"{filename}\"",
                    )
                    message_obj.attach(part)
                except Exception as att_err:
                    print(f"Error attaching file {att.get('filename')}: {att_err}")

        message_obj['To'] = to
        message_obj['Subject'] = subject
        
        raw_message = urlsafe_b64encode(message_obj.as_bytes()).decode('utf-8')
        
        send_message = service.users().messages().send(
            userId="me",
            body={'raw': raw_message}
        ).execute()
        
        return jsonify({
            "success": True,
            "message_id": send_message.get("id"),
            "message": "Email sent successfully!"
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Failed to send the composed email. Please try again."}), 500


@app.route("/api/inbox/check")
def api_inbox_check():
    """Quick check for new emails - returns count and latest ID for polling."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401

    try:
        service = build_gmail_service(creds)
        results = service.users().messages().list(
            userId="me",
            maxResults=1,
            labelIds=["INBOX"]
        ).execute()
        
        messages = results.get("messages", [])
        latest_id = messages[0]["id"] if messages else None
        total = results.get("resultSizeEstimate", 0)
        
        import time as _time
        return jsonify({
            "latest_id": latest_id,
            "total": total,
            "timestamp": int(_time.time())
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An internal error occurred while polling the inbox."}), 500


@app.route("/api/message/<message_id>/delete", methods=["POST"])
def api_delete_message(message_id: str):
    """Move a message to Gmail trash and remove from local cache."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401

    try:
        service = build_gmail_service(creds)
        # Move to trash in Gmail
        service.users().messages().trash(userId="me", id=message_id).execute()
        
        # Also remove from local DB cache
        try:
            delete_email_by_id(message_id, uid)
        except Exception:
            pass  # Local cache cleanup is best-effort
        
        return jsonify({"success": True, "message": "Email moved to trash"})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Failed to delete the email. It may have already been removed."}), 500


# ============ Health Check ============

@app.route("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return jsonify({"status": "healthy", "debug": DEBUG})


# ============ SocketIO Event Handlers ============

@socketio.on('connect')
def handle_connect():
    uid = session.get("user_id")
    if uid:
        join_room(uid)
        print(f"📡 User {uid} connected to WebSockets")

@socketio.on('disconnect')
def handle_disconnect():
    uid = session.get("user_id")
    if uid:
        leave_room(uid)
        print(f"📡 User {uid} disconnected")


# ============ Entry Point ============

if __name__ == "__main__":
    # Render provides $PORT, fallback to 5000 for local
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, debug=DEBUG, port=port, host="0.0.0.0")
