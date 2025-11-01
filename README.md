# 🤖 AI Email Assistant

A comprehensive AI-powered email management system that automates email analysis, categorization, and response generation using OpenAI GPT models.

## ✨ Features

### Core Functionality
- ✅ **Gmail Integration** - Seamless OAuth authentication
- ✅ **AI Summarization** - Concise bullet-point summaries with action items
- ✅ **Priority Classification** - Automatic HIGH/MEDIUM/LOW priority assignment
- ✅ **Sentiment Analysis** - Positive/Negative/Neutral detection with confidence scores
- ✅ **Smart Categorization** - Auto-categorize into Urgent Support, Work, Personal, Newsletter, Spam
- ✅ **Information Extraction** - Extract emails, phones, dates, and action items
- ✅ **Reply Generation** - Context-aware drafts with customizable tone
- ✅ **Analytics Dashboard** - Visual insights with charts and statistics
- ✅ **Database Storage** - SQLite for historical data and analytics

### UI Features
- 🎨 **Beautiful Minimal Design** - Clean, modern interface
- 📊 **Interactive Charts** - Priority, sentiment, and category visualizations
- 🔍 **Batch Analysis** - Analyze multiple emails at once
- 📱 **Responsive** - Works on desktop and mobile
- ⚡ **Fast & Smooth** - Optimized performance

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env` file:
```env
# Flask
FLASK_SECRET_KEY=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5000/oauth2callback

# Gmail API Scopes
SCOPES=https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

### 3. Set Up Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:5000/oauth2callback` as redirect URI
6. Add your email as a test user

### 4. Run the Application
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

### Email Detail View
- See complete AI analysis:
  - Priority level with color coding
  - Sentiment analysis with confidence score
  - Category classification
  - AI-generated summary
  - Extracted information (action items, dates, contacts)
- Generate custom replies with different tones:
  - Professional
  - Friendly
  - Concise
  - Formal
  - Empathetic

### Analytics Dashboard
- Total emails analyzed
- Priority distribution (pie chart)
- Sentiment breakdown (pie chart)
- Category statistics (bar chart)
- Recently analyzed emails list

## 🏗️ Architecture

```
AI Email Assistant
├── app.py                 # Main Flask application
├── openai_helpers.py      # AI analysis functions
├── database.py            # SQLite database operations
├── templates/
│   ├── login.html         # OAuth login page
│   ├── inbox.html         # Email list view
│   ├── message.html       # Email detail view
│   └── analytics.html     # Analytics dashboard
└── email_data.db          # SQLite database (auto-created)
```

## 🔧 Technical Stack

- **Backend**: Python, Flask
- **AI/ML**: OpenAI GPT-3.5-turbo
- **Database**: SQLite
- **Email API**: Gmail API
- **Frontend**: HTML, CSS, JavaScript
- **Charts**: Chart.js
- **Authentication**: Google OAuth 2.0

## 📊 Database Schema

### emails table
- id, user_id, subject, sender, date
- snippet, body
- priority, sentiment, sentiment_score, category
- processed_at

### extracted_info table
- email_id, info_type, info_value

## 🎯 AI Features Explained

### 1. Summarization
Uses GPT-3.5-turbo to generate 2-4 bullet points with actionable next steps.

### 2. Priority Classification
Analyzes urgency, importance, and context to assign HIGH/MEDIUM/LOW priority.

### 3. Sentiment Analysis
Detects emotional tone (positive/negative/neutral) with confidence score (0-1).

### 4. Categorization
Classifies emails into:
- 🔴 Urgent Support
- 💼 Work/Business
- 👤 Personal
- 📧 Newsletter
- ⚠️ Spam/Promotional
- 📁 General

### 5. Information Extraction
- **Regex-based**: Emails, phone numbers
- **AI-powered**: Action items, important dates

### 6. Reply Generation
Context-aware responses with customizable tone and additional instructions.

## 🔐 Security

- OAuth 2.0 for secure Gmail access
- Server-side token storage
- No passwords stored
- API keys in environment variables
- Session-based authentication

## 📈 Future Enhancements

- [ ] Multi-account support
- [ ] Email threading
- [ ] Smart scheduling
- [ ] Follow-up reminders
- [ ] Template library
- [ ] Voice-based email management
- [ ] Integration with Slack, Teams, CRMs
- [ ] Auto-send mode for trusted responses
- [ ] Multi-language support
- [ ] Advanced RAG with embeddings

## 🐛 Troubleshooting

### "Access blocked" error
- Add your email as a test user in Google Cloud Console
- Ensure OAuth consent screen is configured

### "OpenAI API key not configured"
- Check `.env` file has `OPENAI_API_KEY`
- Restart the application

### Database errors
- Delete `email_data.db` and restart (will recreate)

## 📝 License

MIT License - Feel free to use and modify!

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📧 Support

For issues or questions, please open a GitHub issue.

---

Built with ❤️ using OpenAI GPT-3.5-turbo
