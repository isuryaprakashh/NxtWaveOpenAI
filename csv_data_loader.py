"""
CSV Data Loader for synthetic email data
"""
import csv
import json
from typing import List, Dict, Optional

class EmailDataLoader:
    def __init__(self, csv_file_path: str = "synthetic_emails_large.csv"):
        self.csv_file_path = csv_file_path
        self.emails = []
        self.load_emails()
    
    def load_emails(self):
        """Load emails from CSV file"""
        try:
            with open(self.csv_file_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    # Convert CSV row to email format matching your app
                    email = {
                        "id": row.get("id", ""),
                        "subject": row.get("subject", ""),
                        "sender": row.get("sender", ""),
                        "date": row.get("date", ""),
                        "snippet": row.get("snippet", ""),
                        "body": row.get("body", ""),
                        "priority": row.get("priority", "MEDIUM"),
                        "sentiment": row.get("sentiment", "neutral"),
                        "sentiment_score": float(row.get("sentiment_score", 0.5)),
                        "category": row.get("category", "General"),
                        # Additional fields for compatibility
                        "user_id": "demo_user",
                        "headers": {
                            "From": row.get("sender", ""),
                            "Subject": row.get("subject", ""),
                            "Date": row.get("date", "")
                        },
                        "summary": f"Email from {row.get('sender', 'Unknown')} about {row.get('subject', 'No subject')}",
                        "extracted_info": {
                            "emails": [row.get("sender", "")],
                            "phones": [],
                            "dates": [row.get("date", "")],
                            "action_items": []
                        }
                    }
                    self.emails.append(email)
            print(f"Loaded {len(self.emails)} emails from {self.csv_file_path}")
        except Exception as e:
            print(f"Error loading CSV: {e}")
            self.emails = []
    
    def get_inbox_messages(self, max_results: int = 25) -> List[Dict]:
        """Get inbox messages in the format expected by the app"""
        messages = []
        for email in self.emails[:max_results]:
            messages.append({
                "id": email["id"],
                "snippet": email["snippet"],
                "from": email["sender"],
                "subject": email["subject"],
                "date": email["date"]
            })
        return messages
    
    def get_message_by_id(self, message_id: str) -> Optional[Dict]:
        """Get a specific message by ID"""
        for email in self.emails:
            if email["id"] == message_id:
                return email
        return None
    
    def get_analytics_data(self) -> Dict:
        """Generate analytics data from the loaded emails"""
        if not self.emails:
            return {
                "total_emails": 0,
                "priority_distribution": {},
                "sentiment_distribution": {},
                "category_distribution": {},
                "recent_activity": []
            }
        
        # Count priorities
        priority_counts = {}
        for email in self.emails:
            priority = email.get("priority", "MEDIUM")
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        # Count sentiments
        sentiment_counts = {}
        for email in self.emails:
            sentiment = email.get("sentiment", "neutral")
            sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
        
        # Count categories
        category_counts = {}
        for email in self.emails:
            category = email.get("category", "General")
            category_counts[category] = category_counts.get(category, 0) + 1
        
        return {
            "total_emails": len(self.emails),
            "priority_distribution": priority_counts,
            "sentiment_distribution": sentiment_counts,
            "category_distribution": category_counts,
            "recent_activity": self.emails[:10]  # Last 10 emails
        }

# Global instance
email_loader = EmailDataLoader()