import os
import json
import uuid
from pathlib import Path
from flask import Flask, session, redirect, url_for, request, render_template, flash, jsonify
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv
from base64 import urlsafe_b64decode
from openai_helpers import (
    generate_summary, 
    generate_priority_label, 
    generate_reply,
    analyze_sentiment,
    categorize_email,
    extract_information
)
from database import save_email_analysis, get_analytics, get_email_by_id

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY") or "dev-secret"

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:5000/oauth2callback")
SCOPES = os.getenv("SCOPES", "https://www.googleapis.com/auth/gmail.readonly").split()
TOKEN_STORE = Path("./tokens")
TOKEN_STORE.mkdir(exist_ok=True)


def token_path_for_user(user_id: str) -> Path:
    return TOKEN_STORE / f"token_{user_id}.json"


def save_credentials(user_id: str, creds: Credentials):
    data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": creds.scopes,
    }
    token_path_for_user(user_id).write_text(json.dumps(data))


def load_credentials(user_id: str) -> Credentials | None:
    p = token_path_for_user(user_id)
    if not p.exists():
        return None
    data = json.loads(p.read_text())
    return Credentials(
        token=data["token"],
        refresh_token=data.get("refresh_token"),
        token_uri=data["token_uri"],
        client_id=data["client_id"],
        client_secret=data["client_secret"],
        scopes=data.get("scopes"),
    )


def create_flow():
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
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def parse_message_payload(payload):
    """
    Extract snippet and body (best effort) from message payload.
    """
    snippet = payload.get("snippet", "")
    # Try to find text/plain in parts
    body = ""
    def walk_parts(part):
        nonlocal body
        if part.get("mimeType", "").startswith("text/"):
            data = part.get("body", {}).get("data")
            if data:
                decoded = urlsafe_b64decode(data + "===")
                try:
                    body += decoded.decode("utf-8", errors="ignore")
                except Exception:
                    body += str(decoded)
        for p in part.get("parts", []) or []:
            walk_parts(p)

    if "payload" in payload:
        walk_parts(payload["payload"])
    return snippet, body or snippet


# ---------- Routes ----------
@app.before_request
def restore_single_token_session():
    """
    If there's exactly one token file in TOKEN_STORE and the session has no user_id,
    assume that token belongs to the current user and restore the session automatically.
    This makes the inbox view load without having to re-authenticate when only one
    account has previously authorized the app on this machine.
    """
    if session.get("user_id"):
        return
    try:
        files = list(TOKEN_STORE.glob("token_*.json"))
        if len(files) == 1:
            fname = files[0].name
            # extract the user id from filename token_{user_id}.json
            if fname.startswith("token_") and fname.endswith(".json"):
                user_id = fname[len("token_"):-len(".json")]
                # verify credentials can be loaded before restoring session
                creds = load_credentials(user_id)
                if creds is not None:
                    session["user_id"] = user_id
    except Exception:
        # Don't block requests on token-restore errors; fall back to normal flow.
        pass

@app.route("/")
def index():
    if session.get("user_id") and load_credentials(session["user_id"]):
        return redirect(url_for("inbox"))
    return render_template("login.html")


@app.route("/login")
def login():
    flow = create_flow()
    authorization_url, state = flow.authorization_url(access_type="offline", include_granted_scopes="true", prompt="consent")
    session["oauth_state"] = state
    return redirect(authorization_url)


@app.route("/oauth2callback")
def oauth2callback():
    state = session.get("oauth_state")
    flow = create_flow()
    flow.fetch_token(authorization_response=request.url)

    creds = flow.credentials
    # create a simple user id and save token server-side
    user_id = str(uuid.uuid4())
    session["user_id"] = user_id
    save_credentials(user_id, creds)
    flash("Logged in successfully.", "success")
    return redirect(url_for("inbox"))


@app.route("/logout")
def logout():
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


@app.route("/inbox")
def inbox():
    uid = session.get("user_id")
    if not uid:
        return redirect(url_for("index"))

    creds = load_credentials(uid)
    if not creds:
        flash("Please sign in.", "warning")
        return redirect(url_for("index"))

    try:
        service = build_gmail_service(creds)
        # Fetch inbox messages
        resp = service.users().messages().list(userId="me", maxResults=25, labelIds=["INBOX"]).execute()
        msg_list = resp.get("messages", [])
        messages = []

        for m in msg_list:
            msg = service.users().messages().get(
                userId="me", id=m["id"], format="metadata", metadataHeaders=["From", "Subject", "Date"]
            ).execute()
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            messages.append({
                "id": m["id"],
                "snippet": msg.get("snippet", ""),
                "from": headers.get("From", "(Unknown sender)"),
                "subject": headers.get("Subject", "(No subject)"),
                "date": headers.get("Date", "(No date)")
            })

        if not messages:
            flash("No messages found in inbox.", "info")

        return render_template("inbox.html", messages=messages)

    except Exception as e:
        print("Error fetching inbox:", e)
        flash("Error fetching inbox messages. Check console for details.", "danger")
        return render_template("inbox.html", messages=[])



@app.route("/message/<message_id>")
def message_detail(message_id):
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return redirect(url_for("index"))

    # Get full analysis via API endpoint
    response = api_get_message(message_id)
    if isinstance(response, tuple):  # Error response
        flash("Error loading message", "danger")
        return redirect(url_for("inbox"))
    
    data = response.get_json()
    return render_template("message.html", **data)


@app.route("/api/message/<message_id>")
def api_get_message(message_id):
    """Return message details as JSON, including all AI analysis."""
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401
    
    # Check if already in database
    cached = get_email_by_id(message_id)
    if cached:
        return jsonify(cached)
    
    service = build_gmail_service(creds)
    try:
        msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
        snippet, body = parse_message_payload(msg)
        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        
        # Run all AI analysis
        subject = headers.get("Subject", "")
        text = body or snippet
        summary = generate_summary(text)
        priority = generate_priority_label(text)
        sentiment_data = analyze_sentiment(text)
        category = categorize_email(text, subject)
        extracted_info = extract_information(text)
        
        # Prepare data
        email_data = {
            "id": message_id,
            "user_id": uid,
            "snippet": snippet,
            "body": body,
            "headers": headers,
            "subject": subject,
            "sender": headers.get("From", ""),
            "date": headers.get("Date", ""),
            "summary": summary,
            "priority": priority,
            "sentiment": sentiment_data.get("sentiment"),
            "sentiment_score": sentiment_data.get("score"),
            "category": category,
            "extracted_info": extracted_info
        }
        
        # Save to database
        save_email_analysis(email_data)
        
        return jsonify(email_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/generate_reply/<message_id>", methods=["POST"])
def generate_reply_endpoint(message_id):
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401

    service = build_gmail_service(creds)
    msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
    snippet, body = parse_message_payload(msg)
    tone = request.json.get("tone", "professional")
    extra = request.json.get("instructions", "")
    draft = generate_reply(body or snippet, tone=tone, instructions=extra)
    return jsonify({"reply": draft})


# Optional: simple API endpoint to prioritize multiple messages
@app.route("/api/prioritize", methods=["POST"])
def api_prioritize():
    """
    Accepts JSON: { "ids": ["id1","id2", ...] }
    Returns: { "id1": "HIGH", ... }
    """
    uid = session.get("user_id")
    creds = load_credentials(uid)
    if not creds:
        return jsonify({"error": "not authenticated"}), 401
    ids = request.json.get("ids", [])
    service = build_gmail_service(creds)
    results = {}
    for mid in ids:
        msg = service.users().messages().get(userId="me", id=mid, format="full").execute()
        snippet, body = parse_message_payload(msg)
        label = generate_priority_label(body or snippet)
        results[mid] = label
    return jsonify(results)


@app.route("/analytics")
def analytics():
    """Analytics dashboard"""
    uid = session.get("user_id")
    if not uid:
        return redirect(url_for("index"))
    
    creds = load_credentials(uid)
    if not creds:
        return redirect(url_for("index"))
    
    analytics_data = get_analytics(uid)
    return render_template("analytics.html", analytics=analytics_data)


@app.route("/api/analytics")
def api_analytics():
    """Get analytics data as JSON"""
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "not authenticated"}), 401
    
    analytics_data = get_analytics(uid)
    return jsonify(analytics_data)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
