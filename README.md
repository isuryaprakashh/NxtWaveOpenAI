# 🔱 Odin Mail — AI Email Assistant

**Odin Mail** is a premium, high-performance AI email management platform that turns your cluttered inbox into a strategic asset. Built with **React** and **Flask**, it leverages **Google Gemini 2.0 Flash** (with **Groq LLaMA 3.3 70B fallback**) to provide instant summaries, priority assessment, and a RAG-powered chat interface to talk directly to your data.

---

## ✨ Key Features

### 🧠 Intelligent Inbox
- **AI Summarization**: Get the "gist" of long threads in a single sentence.
- **Priority Detection**: Automated **HIGH / MEDIUM / LOW** labeling based on content and urgency.
- **Sentiment & Category**: Instant detection of sender mood and category (Work, Support, Personal, etc.).
- **Smart Replies**: One-tap AI-suggested responses tailored to the email context.

### 💬 RAG Chat (Chat with Inbox)
- Ask natural language questions like *"What were the action items from John's last email?"* or *"Summarize my recent invoices."*
- Uses **Retrieve-Augmented Generation** to search your MongoDB cache for instant, accurate answers.

### 📊 Professional Analytics
- Visual distribution of your inbox by priority and sentiment.
- Category breakdown to see where your time is going.

### 🔒 Enterprise-Grade Stability
- **Token-Based Authentication**: Custom auth system designed specifically for cross-domain stability (Vercel + Render).
- **Socket.io Integration**: Real-time notifications for new emails.
- **Encryption**: sensitive GMAIL OAuth tokens are encrypted at rest using AES (Fernet).

---

## 🏗️ Project Architecture

```text
ODIN-MAIL/
├── backend/                # Flask Python Server
│   ├── app.py              # Main API & WebSocket logic
│   ├── database.py         # MongoDB Operations (Encrypted)
│   ├── config.py           # Environment-aware configuration
│   └── openai_helpers.py   # AI Core (Gemini + Groq)
├── frontend/               # React + Vite Client
│   ├── src/
│   │   ├── services/api.js # Auth-Token-Aware API layer
│   │   ├── config.js       # Centralized service discovery
│   │   └── pages/          # Inbox, Chat, Analytics, Message
└── README.md               # You are here
```

---

## 🚀 Quick Start

### 1. Backend Setup (Flask)
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 2. Frontend Setup (React)
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Variables (.env)
Create a `.env` in the `backend/` folder:
```env
# AI Keys
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key_fallback

# Database (MongoDB)
MONGO_URI=your_mongodb_atlas_uri

# Google OAuth
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret

# Security
ENCRYPTION_KEY=generate_with_fernet
FLASK_SECRET_KEY=your_system_secret
```

---

## 🔧 Technical Stack

| Category | Technology |
| :--- | :--- |
| **Frontend** | React 18, Tailwind CSS, Vite |
| **Backend** | Python 3.12, Flask, Flask-SocketIO |
| **AI Models** | Google Gemini 2.0 Flash, LLaMA 3.3 70B (Groq) |
| **Database** | MongoDB (NoSQL) |
| **Real-time** | Socket.IO |
| **Authentication** | Google OAuth 2.0 + Custom Token Persistence |

---

## 🐛 Build & Deployment

- **Frontend**: Professionally deployed on **Vercel**.
- **Backend**: Scalable containerized service on **Render**.
- **Database**: **MongoDB Atlas** for managed high-availability data storage.

---

Built with ❤️ for the next generation of productivity.
