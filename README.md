# 🔱 Odin Mail — AI Email Assistant (Technical Documentation)

**Odin Mail** is a high-performance, intelligence-first email management platform. It creates a secondary "Source of Truth" in MongoDB to provide instant responsiveness, while leveraging world-class LLMs (Groq & Gemini) to analyze, prioritize, and interact with your correspondence.

---

## 🗺️ How it Works (System Workflow)

```mermaid
graph LR
    User((User)) <--> FE[React Frontend]
    FE <--> BE[Flask Backend]
    
    subgraph "Intelligent Processing"
        BE --> P[Recursive MIME Parser]
        P --> DB[(MongoDB Cache)]
        BE <--> AI{AI Intelligence}
        AI --> Groq[Groq LLaMA 3.3]
        AI --> Gem[Gemini 2.0]
    end
    
    subgraph "External Integration"
        BE <--> Gmail[(Gmail API)]
        Gmail -.->|OAuth2| User
    end

    Note over DB: Standardized Data<br/>Encrypted Tokens<br/>Text-Search Indexed
```

---

## 🧠 AI Intelligence Layer (Groq & Gemini)

### Intelligence Analysis Loop
The AI performs a comprehensive analysis of every incoming email using the following parameters:
- **Priority Labeling**: High (Action Required), Medium (Information), Low (CC'd/General).
- **Sentiment Scoring**: A 0.0 to 1.0 score mapping to Positive, Neutral, or Negative.
- **Categorization**: Auto-tagging into Work, Social, Promotions, Finance, or Personal.
- **Action Extraction**: Identifying specific dates, tasks, and follow-ups.

### LLM Prompting Strategy
We use **JSON-strict prompting** with an auto-fallback repair mechanism. If the primary model (Groq) fails or rate-limits, the system automatically redirects to **Gemini 2.0 Flash**.

---

## 🗄️ Database Schema & Persistence

### Collections Overview

#### `emails`
The core repository for all synchronized messages.
- **Indexes**: 
  - `id` (Unique, Ascending): Maps to Gmail Message ID.
  - `user_id` (Filtered): Fast retrieval of users' private data.
  - `email_text_search` (Text): Multi-field index (subject, sender, body) for instant search.

#### `tokens` (Encrypted)
Stores OAuth2 credentials.
- **Security**: Blobs are encrypted via **AES-256 Fernet** using a 32-byte key generated at system initialization.

#### `sessions`
Used for cross-domain stability.
- **Token-Auth**: Provides a `X-Odin-Token` mechanism to bypass unreliable browser cookie policies in SaaS environments.

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/inbox` | GET | Returns 50 most recent emails. Uses Smart-Cache threshold (15+). |
| `/api/message/<id>` | GET | Returns full message detail. Features Shallow-Cache detection. |
| `/api/message/<id>/analyze` | POST | Forces a fresh AI analysis of the email content. |
| `/api/message/<id>/reply` | POST | Generates a context-aware AI reply draft based on Tone. |
| `/api/chat` | POST | RAG-powered chatbot that answers questions based on your Inbox data. |
| `/api/analytics` | GET | Returns aggregation data (Priority distribution/Sentiment over time). |

---

## 🛠️ Specialized Engineering Highlights

### 1. The Recursive MIME Parser
Standard Gmail parsers often fail on complex HTML structures (like Google Security Alerts or Invoices). Odin Mail uses a recursive tree-walking algorithm that searches through all `multipart/alternative` and `multipart/mixed` containers to find the highest-quality text content.

### 2. Shallow Cache Repair 
To ensure instant inbox loading, we sometimes sync "thin" metadata. When a user opens a specific message, the system performs a sanity-check on the body length. If `< 5 characters`, it triggers a silent "background repair" from the Gmail API to fill the missing content.

### 3. Socket.IO Real-Time Sync
Background synthesis results are pushed to the frontend via WebSockets.
- **Room Logic**: Users join a private room named after their `user_id` to ensure secure, isolated notification delivery.

---

## 🔧 Environment Configuration (.env)

```env
# Primary LLM Configuration
GROQ_API_KEY=gsk_...           # Primary: Extreme speed
GEMINI_API_KEY=AIza...         # Fallback: High context window

# Core Persistence
MONGO_URI=mongodb+srv://...     # MongoDB Atlas Connection
MONGO_DB_NAME=odin_email_db     # Database Identifier

# OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=...           # Google Cloud Console Client ID
GOOGLE_CLIENT_SECRET=...       # Google Cloud Console Secret

# Internal Security
ENCRYPTION_KEY=...             # 32-byte Fernet Key (base64)
FLASK_SECRET_KEY=...           # Flask Session signing
```

---

## 🏁 Quality & Verification
All modules are verified against `test_ai.py` (API connectivity) and `health_check` (Port stability). The backend is optimized for Windows performance using a threaded execution model.

---
© 2026 Odin Mail — Technical Documentation