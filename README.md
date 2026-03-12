# 🤖 ODIN - AI Email Assistant

A comprehensive AI-powered email management system with **React frontend** and **Flask backend**, using **Google Gemini 2.5 Flash** for intelligent email analysis with **Groq fallback** for reliability.

## ✨ Features

### Core AI Features
- ✅ **AI Summarization** - Concise summaries with action items
- ✅ **Priority Classification** - HIGH/MEDIUM/LOW auto-assignment
- ✅ **Sentiment Analysis** - Positive/Negative/Neutral detection
- ✅ **Smart Categorization** - Urgent Support, Work, Personal, Newsletter, Spam
- ✅ **Quick Replies** - AI-suggested contextual reply options
- ✅ **Reply Generation** - Context-aware drafts with customizable tone
- ✅ **Chat with Inbox** - Ask natural language questions (RAG)
- ✅ **Analytics Dashboard** - Visual insights with charts
- ✅ **Groq Fallback** - Automatic fallback to Groq if Gemini fails

### New Features
- ✅ **Compose Email** - Write and send new emails directly
- ✅ **Real-time Sync** - 30-second polling with notification badges
- ✅ **Mobile Responsive** - Hamburger menu for mobile devices
- ✅ **Error Boundary** - Graceful error handling

### UI/UX
- 🎨 **Modern Design** - Inter font, smooth animations, custom scrollbars
- 📱 **Responsive Navbar** - Desktop & mobile support
- ⌨️ **Keyboard Shortcuts** - Ctrl+Enter to send in Chat
- ⚡ **Instant Loading** - Session-based inbox caching

## 🏗️ Architecture

```
ODIN/
├── frontend/                   # React + Tailwind CSS (Vite)
│   └── src/
│       ├── components/
│       │   ├── Navbar.jsx      # Responsive navigation
│       │   ├── ComposeModal.jsx # Email compose
│       │   └── ErrorBoundary.jsx
│       ├── pages/
│       │   ├── HomePage.jsx    # Landing page
│       │   ├── InboxPage.jsx   # Email list + FAB
│       │   ├── MessagePage.jsx # Email detail + AI
│       │   ├── ChatPage.jsx    # RAG chat
│       │   └── AnalyticsPage.jsx
│       └── services/api.js     # API layer
├── app.py                      # Flask backend
├── openai_helpers.py           # AI functions (Gemini + Groq)
├── database.py                 # SQLite operations
└── email_data.db               # Database (auto-created)
```

## 🚀 Quick Start

### 1. Backend Setup
```bash
pip install -r requirements.txt
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

### 3. Configure `.env`
```env
FLASK_SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key    # Optional: Fallback AI
```

> **Note:** Gemini is the primary AI. If Gemini fails, the system automatically falls back to Groq (LLaMA 3.3 70B).

### 4. Run the Application
```bash
# Terminal 1 - Backend
python app.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173`

## 🔧 Technical Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React, Tailwind CSS, Vite |
| **Backend** | Python, Flask |
| **AI (Primary)** | Google Gemini 2.5 Flash |
| **AI (Fallback)** | Groq (LLaMA 3.3 70B Versatile) |
| **Database** | SQLite |
| **Email** | Gmail API |
| **Auth** | Google OAuth 2.0 |

## � API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/check` | GET | Check authentication |
| `/api/inbox` | GET | Fetch inbox emails |
| `/api/inbox/check` | GET | Poll for new emails |
| `/api/message/<id>` | GET | Get email details + AI analysis |
| `/api/compose` | POST | Send new email |
| `/api/chat` | POST | Chat with inbox (RAG) |
| `/api/analytics` | GET | Analytics data |
| `/generate_reply/<id>` | POST | Generate AI reply |
| `/send_reply/<id>` | POST | Send reply |

## 🐛 Troubleshooting

### "GEMINI_API_KEY not set"
- Get key from [Google AI Studio](https://aistudio.google.com/apikey)
- Add to `.env` file (no quotes!)

### OAuth "Access blocked"
- Add email as test user in Google Cloud Console

### CSS/Build errors
- Restart frontend: `npm run dev`

## 📝 License

MIT License

---

Built with ❤️ using Google Gemini 2.5 Flash + React
