"""
Database module for storing email metadata and analytics
"""
import sqlite3
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path("./email_data.db")


def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create emails table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS emails (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            subject TEXT,
            sender TEXT,
            date TEXT,
            snippet TEXT,
            body TEXT,
            priority TEXT,
            sentiment TEXT,
            sentiment_score REAL,
            category TEXT,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create extracted_info table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS extracted_info (
            email_id TEXT,
            info_type TEXT,
            info_value TEXT,
            FOREIGN KEY (email_id) REFERENCES emails(id)
        )
    ''')
    
    conn.commit()
    conn.close()


def save_email_analysis(email_data: dict):
    """Save email and its AI analysis to database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT OR REPLACE INTO emails 
            (id, user_id, subject, sender, date, snippet, body, priority, sentiment, sentiment_score, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            email_data.get('id'),
            email_data.get('user_id'),
            email_data.get('subject'),
            email_data.get('sender'),
            email_data.get('date'),
            email_data.get('snippet'),
            email_data.get('body'),
            email_data.get('priority'),
            email_data.get('sentiment'),
            email_data.get('sentiment_score'),
            email_data.get('category')
        ))
        
        # Save extracted information
        if 'extracted_info' in email_data:
            info = email_data['extracted_info']
            email_id = email_data.get('id')
            
            for email in info.get('emails', []):
                cursor.execute('INSERT INTO extracted_info VALUES (?, ?, ?)', (email_id, 'email', email))
            for phone in info.get('phones', []):
                cursor.execute('INSERT INTO extracted_info VALUES (?, ?, ?)', (email_id, 'phone', phone))
            for date in info.get('dates', []):
                cursor.execute('INSERT INTO extracted_info VALUES (?, ?, ?)', (email_id, 'date', date))
            for action in info.get('action_items', []):
                cursor.execute('INSERT INTO extracted_info VALUES (?, ?, ?)', (email_id, 'action_item', action))
        
        conn.commit()
    except Exception as e:
        print(f"Error saving email: {e}")
    finally:
        conn.close()


def get_analytics(user_id: str) -> dict:
    """Get analytics data for dashboard"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    analytics = {
        'total_emails': 0,
        'priority_distribution': {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0},
        'sentiment_distribution': {'positive': 0, 'negative': 0, 'neutral': 0},
        'category_distribution': {},
        'recent_emails': []
    }
    
    try:
        # Total emails
        cursor.execute('SELECT COUNT(*) FROM emails WHERE user_id = ?', (user_id,))
        analytics['total_emails'] = cursor.fetchone()[0]
        
        # Priority distribution
        cursor.execute('SELECT priority, COUNT(*) FROM emails WHERE user_id = ? GROUP BY priority', (user_id,))
        for priority, count in cursor.fetchall():
            if priority:
                analytics['priority_distribution'][priority] = count
        
        # Sentiment distribution
        cursor.execute('SELECT sentiment, COUNT(*) FROM emails WHERE user_id = ? GROUP BY sentiment', (user_id,))
        for sentiment, count in cursor.fetchall():
            if sentiment:
                analytics['sentiment_distribution'][sentiment] = count
        
        # Category distribution
        cursor.execute('SELECT category, COUNT(*) FROM emails WHERE user_id = ? GROUP BY category', (user_id,))
        for category, count in cursor.fetchall():
            if category:
                analytics['category_distribution'][category] = count
        
        # Recent emails
        cursor.execute('''
            SELECT id, subject, sender, priority, sentiment, category, processed_at 
            FROM emails WHERE user_id = ? 
            ORDER BY processed_at DESC LIMIT 10
        ''', (user_id,))
        analytics['recent_emails'] = [
            {
                'id': row[0],
                'subject': row[1],
                'sender': row[2],
                'priority': row[3],
                'sentiment': row[4],
                'category': row[5],
                'processed_at': row[6]
            }
            for row in cursor.fetchall()
        ]
        
    except Exception as e:
        print(f"Error getting analytics: {e}")
    finally:
        conn.close()
    
    return analytics


def get_email_by_id(email_id: str) -> dict:
    """Retrieve email data from database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute('SELECT * FROM emails WHERE id = ?', (email_id,))
        row = cursor.fetchone()
        if row:
            return {
                'id': row[0],
                'user_id': row[1],
                'subject': row[2],
                'sender': row[3],
                'date': row[4],
                'snippet': row[5],
                'body': row[6],
                'priority': row[7],
                'sentiment': row[8],
                'sentiment_score': row[9],
                'category': row[10],
                'processed_at': row[11]
            }
    except Exception as e:
        print(f"Error retrieving email: {e}")
    finally:
        conn.close()
    
    return None


# Initialize database on import
init_db()
