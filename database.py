"""
Database module for storing email metadata and analytics.
Uses SQLite for persistent storage.
"""
import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

DB_PATH = Path("./email_data.db")


def get_db_connection() -> sqlite3.Connection:
    """
    Get a database connection with row factory enabled.
    
    Returns:
        SQLite connection with Row factory for dict-like access
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize the database with required tables."""
    conn = get_db_connection()
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
    
    # Create index on user_id for faster queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id)
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


def save_email_analysis(email_data: Dict) -> bool:
    """
    Save email and its AI analysis to database.
    
    Args:
        email_data: Dictionary containing email data and analysis
        
    Returns:
        True if saved successfully, False otherwise
    """
    conn = get_db_connection()
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
            
            # Clear old extracted info for this email
            cursor.execute('DELETE FROM extracted_info WHERE email_id = ?', (email_id,))
            
            for email in info.get('emails', []):
                cursor.execute('INSERT INTO extracted_info VALUES (?, ?, ?)', (email_id, 'email', email))
            for phone in info.get('phones', []):
                cursor.execute('INSERT INTO extracted_info VALUES (?, ?, ?)', (email_id, 'phone', phone))
            for date in info.get('dates', []):
                cursor.execute('INSERT INTO extracted_info VALUES (?, ?, ?)', (email_id, 'date', date))
            for action in info.get('action_items', []):
                cursor.execute('INSERT INTO extracted_info VALUES (?, ?, ?)', (email_id, 'action_item', action))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"Error saving email: {e}")
        return False
    finally:
        conn.close()


def get_analytics(user_id: str) -> Dict:
    """
    Get analytics data for dashboard.
    
    Args:
        user_id: The user's unique identifier
        
    Returns:
        Dictionary containing analytics data
    """
    conn = get_db_connection()
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
        result = cursor.fetchone()
        analytics['total_emails'] = result[0] if result else 0
        
        # Priority distribution
        cursor.execute('SELECT priority, COUNT(*) FROM emails WHERE user_id = ? GROUP BY priority', (user_id,))
        for row in cursor.fetchall():
            priority, count = row[0], row[1]
            if priority:
                analytics['priority_distribution'][priority] = count
        
        # Sentiment distribution
        cursor.execute('SELECT sentiment, COUNT(*) FROM emails WHERE user_id = ? GROUP BY sentiment', (user_id,))
        for row in cursor.fetchall():
            sentiment, count = row[0], row[1]
            if sentiment:
                analytics['sentiment_distribution'][sentiment] = count
        
        # Category distribution
        cursor.execute('SELECT category, COUNT(*) FROM emails WHERE user_id = ? GROUP BY category', (user_id,))
        for row in cursor.fetchall():
            category, count = row[0], row[1]
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
                'id': row['id'],
                'subject': row['subject'],
                'sender': row['sender'],
                'priority': row['priority'],
                'sentiment': row['sentiment'],
                'category': row['category'],
                'processed_at': row['processed_at']
            }
            for row in cursor.fetchall()
        ]
        
    except Exception as e:
        print(f"Error getting analytics: {e}")
    finally:
        conn.close()
    
    return analytics


def search_emails(query_text: str, user_id: str, limit: int = 20) -> List[Dict]:
    """
    Search emails by keyword in subject, body, or sender.
    
    Args:
        query_text: The search query
        user_id: The user's unique identifier (REQUIRED for security)
        limit: Maximum number of results to return
        
    Returns:
        List of matching email dictionaries
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    wildcard_query = f"%{query_text}%"
    
    try:
        cursor.execute("""
            SELECT id, subject, sender, date, snippet, body
            FROM emails
            WHERE user_id = ?
              AND (subject LIKE ? 
                   OR body LIKE ? 
                   OR sender LIKE ?
                   OR snippet LIKE ?)
            ORDER BY date DESC
            LIMIT ?
        """, (user_id, wildcard_query, wildcard_query, wildcard_query, wildcard_query, limit))
        
        results = []
        for row in cursor.fetchall():
            results.append({
                "id": row["id"],
                "subject": row["subject"],
                "sender": row["sender"],
                "date": row["date"],
                "snippet": row["snippet"],
                "body": row["body"]
            })
        return results
    except Exception as e:
        print(f"Error searching emails: {e}")
        return []
    finally:
        conn.close()


def get_email_by_id(email_id: str, user_id: Optional[str] = None) -> Optional[Dict]:
    """
    Retrieve email data from database.
    
    Args:
        email_id: The email's unique identifier
        user_id: Optional user_id for access control
        
    Returns:
        Email data dictionary or None if not found
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if user_id:
            cursor.execute('SELECT * FROM emails WHERE id = ? AND user_id = ?', (email_id, user_id))
        else:
            cursor.execute('SELECT * FROM emails WHERE id = ?', (email_id,))
        
        row = cursor.fetchone()
        if row:
            return {
                'id': row['id'],
                'user_id': row['user_id'],
                'subject': row['subject'],
                'sender': row['sender'],
                'date': row['date'],
                'snippet': row['snippet'],
                'body': row['body'],
                'priority': row['priority'],
                'sentiment': row['sentiment'],
                'sentiment_score': row['sentiment_score'],
                'category': row['category'],
                'processed_at': row['processed_at']
            }
    except Exception as e:
        print(f"Error retrieving email: {e}")
    finally:
        conn.close()
    
    return None


def delete_email_by_id(email_id: str, user_id: Optional[str] = None) -> bool:
    """
    Delete email data from database.
    
    Args:
        email_id: The email's unique identifier
        user_id: Optional user_id for access control
        
    Returns:
        True if deleted successfully, False otherwise
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if user_id:
            cursor.execute('DELETE FROM emails WHERE id = ? AND user_id = ?', (email_id, user_id))
            cursor.execute('DELETE FROM extracted_info WHERE email_id = ?', (email_id,))
        else:
            cursor.execute('DELETE FROM emails WHERE id = ?', (email_id,))
            cursor.execute('DELETE FROM extracted_info WHERE email_id = ?', (email_id,))
        
        conn.commit()
        return cursor.rowcount > 0
    except Exception as e:
        print(f"Error deleting email: {e}")
        return False
    finally:
        conn.close()


# Initialize database on import
init_db()
