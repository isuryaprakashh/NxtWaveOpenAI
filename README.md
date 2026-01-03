# 🤖 ODIN - AI Email Assistant

A comprehensive AI-powered email management system that automates email analysis, categorization, and response generation using **Google Gemini 2.5 Flash**.

## ✨ Features

### Core Functionality
- ✅ **Gmail Integration** - Seamless OAuth 2.0 authentication
- ✅ **AI Summarization** - Concise bullet-point summaries with action items
- ✅ **Priority Classification** - Automatic HIGH/MEDIUM/LOW priority assignment
- ✅ **Sentiment Analysis** - Positive/Negative/Neutral detection with confidence scores
- ✅ **Smart Categorization** - Auto-categorize into Urgent Support, Work, Personal, Newsletter, Spam
- ✅ **Auto-Labeling** - Automatically creates Gmail labels based on AI categories
- ✅ **Information Extraction** - Extract emails, phones, dates, and action items
- ✅ **Quick Replies** - AI-suggested contextual reply options
- ✅ **Reply Generation** - Context-aware drafts with customizable tone
- ✅ **Chat with Inbox** - Ask natural language questions about your emails (RAG)
- ✅ **Analytics Dashboard** - Visual insights with charts and statistics
- ✅ **Database Storage** - SQLite for historical data and analytics

### UI Features
- 🎨 **Beautiful Minimal Design** - Clean, modern interface
- 📊 **Interactive Charts** - Priority, sentiment, and category visualizations
- 🔍 **Batch Analysis** - Analyze multiple emails at once
- 🔎 **Email Search** - Search your inbox with Gmail query syntax
- 📱 **Responsive** - Works on desktop and mobile
- ⚡ **Fast & Smooth** - Optimized performance with Gemini 2.5 Flash

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file:
```env
# Flask Configuration
FLASK_SECRET_KEY=your-secure-secret-key-here
FLASK_DEBUG=true

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5000/oauth2callback

# Gmail API Scopes (optional - defaults shown)
SCOPES=https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send
```

### 3. Get a Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create or select a project
3. Generate an API key
4. Add it to your `.env` file as `GEMINI_API_KEY`

### 4. Set Up Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Web application)
5. Add `http://localhost:5000/oauth2callback` as authorized redirect URI
6. Add your email as a test user in OAuth consent screen

### 5. Run the Application
```bash
python app.py
```

Visit `http://localhost:5000`

## 📖 Usage Guide

### Inbox View
- View all your emails with sender, subject, and snippet
- Select multiple emails for batch analysis
- Click "Analyze Selected" to get AI insights
- Sort by date (newest/oldest)
- Filter by category
- Search with Gmail query syntax

### Email Detail View
- See complete AI analysis:
  - Priority level with color coding
  - Sentiment analysis with confidence score
  - Category classification
  - AI-generated summary
  - Extracted information (action items, dates, contacts)
- Use Quick Replies for fast responses
- Generate custom replies with different tones:
  - Professional / Friendly / Concise / Formal / Empathetic

### Chat with Inbox
- Ask natural language questions about your emails
- "What are my upcoming deadlines?"
- "Summarize emails from last week"
- "Any urgent action items?"

### Analytics Dashboard
- Total emails analyzed
- Priority distribution (pie chart)
- Sentiment breakdown (pie chart)
- Category statistics (bar chart)
- Recently analyzed emails list

## 🏗️ Architecture

```
ODIN - AI Email Assistant
├── app.py                 # Main Flask application
├── openai_helpers.py      # Gemini AI analysis functions
├── database.py            # SQLite database operations
├── static/
│   └── styles.css         # Shared CSS styles
├── templates/
│   ├── base.html          # Base template
│   ├── home.html          # Landing page
│   ├── login.html         # OAuth login page
│   ├── inbox.html         # Email list view
│   ├── message.html       # Email detail view
│   ├── chat.html          # Chat with inbox
│   └── analytics.html     # Analytics dashboard
├── tokens/                # OAuth tokens (auto-created)
└── email_data.db          # SQLite database (auto-created)
```

## 🔧 Technical Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Python 3.10+, Flask |
| **AI/ML** | Google Gemini 2.5 Flash |
| **Database** | SQLite |
| **Email API** | Gmail API |
| **Frontend** | HTML, CSS, JavaScript |
| **Charts** | Chart.js |
| **Authentication** | Google OAuth 2.0 |

## 📊 Database Schema

### emails table
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Gmail message ID |
| user_id | TEXT | User identifier |
| subject | TEXT | Email subject |
| sender | TEXT | Sender address |
| date | TEXT | Email date |
| snippet | TEXT | Email preview |
| body | TEXT | Full email body |
| priority | TEXT | HIGH/MEDIUM/LOW |
| sentiment | TEXT | positive/negative/neutral |
| sentiment_score | REAL | 0.0 to 1.0 |
| category | TEXT | Email category |
| processed_at | TIMESTAMP | Analysis timestamp |

### extracted_info table
| Column | Type | Description |
|--------|------|-------------|
| email_id | TEXT | Reference to email |
| info_type | TEXT | email/phone/date/action_item |
| info_value | TEXT | Extracted value |

## 🎯 AI Features

| Feature | Description |
|---------|-------------|
| **Summarization** | 2-4 bullet points with actionable next steps |
| **Priority** | Analyzes urgency and importance |
| **Sentiment** | Detects tone with confidence score |
| **Categorization** | Urgent Support, Work, Personal, Newsletter, Spam, General |
| **Extraction** | Emails, phones (regex), dates, action items (AI) |
| **Quick Replies** | 3 contextual reply suggestions |
| **Reply Generation** | Full drafts with customizable tone |

## 🔐 Security

- ✅ OAuth 2.0 for secure Gmail access
- ✅ Server-side token storage
- ✅ No passwords stored
- ✅ API keys in environment variables only
- ✅ Session-based authentication
- ✅ User-scoped database queries
- ✅ Conditional debug mode

## 🐛 Troubleshooting

### "Access blocked" error
- Add your email as a test user in Google Cloud Console
- Ensure OAuth consent screen is configured

### "GEMINI_API_KEY not set" warning
- Get an API key from [Google AI Studio](https://aistudio.google.com/apikey)
- Add `GEMINI_API_KEY=your-key` to `.env` file

### AI features not working
- Check if Gemini API key is valid
- Verify API key has no restrictions blocking access
- Check console for error messages

### Database errors
- Delete `email_data.db` and restart (will recreate)

### OAuth issues
- Verify redirect URI matches exactly in Google Cloud Console
- Clear browser cookies and try again

## 📈 Future Enhancements

- [ ] Multi-account support
- [ ] Email threading
- [ ] Smart scheduling
- [ ] Follow-up reminders
- [ ] Template library
- [ ] Multi-language support
- [ ] Advanced RAG with embeddings
- [ ] Slack/Teams integration

## 📝 License

MIT License - Feel free to use and modify!

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

Built with ❤️ using Google Gemini 2.5 Flash
