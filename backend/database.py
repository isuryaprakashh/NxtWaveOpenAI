"""
MongoDB Database module for storing email metadata and analytics.
Optimized for JSON-native data and performance.
"""
import os
import secrets
import json
from datetime import datetime
from typing import Dict, List, Optional
from pymongo import MongoClient, UpdateOne, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure
from cryptography.fernet import Fernet
from email.utils import parsedate_to_datetime

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "odin_email_db")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

_client = None
_fernet = None

def get_fernet():
    """Get Fernet instance for encryption/decryption."""
    global _fernet
    if _fernet is None:
        if not ENCRYPTION_KEY:
            # Fallback for development if key isn't set yet
            print("🚀 WARNING: ENCRYPTION_KEY not set. Generating a temporary key...")
            key = Fernet.generate_key().decode()
            _fernet = Fernet(key.encode())
        else:
            _fernet = Fernet(ENCRYPTION_KEY.encode())
    return _fernet

def get_db():
    """Get MongoDB database instance with lazy initialization and connection pooling."""
    global _client
    if _client is None:
        try:
            _client = MongoClient(MONGO_URI, maxPoolSize=50)
            # Verify connection
            _client.admin.command('ping')
        except ConnectionFailure as e:
            print(f"Could not connect to MongoDB: {e}")
            raise
    return _client[DB_NAME]

def init_db() -> None:
    """Initialize MongoDB with required indexes for efficiency."""
    db = get_db()
    emails = db.emails
    
    # Create unique index on email ID
    emails.create_index([("id", ASCENDING)], unique=True)
    
    # Create index on user_id for fast retrieval of user data
    emails.create_index([("user_id", ASCENDING)])
    
    # Create index on subject, sender, and snippet for text search
    # MongoDB Text Index allows for efficient searching across multiple fields
    emails.create_index([
        ("subject", "text"),
        ("sender", "text"),
        ("snippet", "text"),
        ("body", "text")
    ], name="email_text_search")
    
    # Tokens collection - ensure unique user_id
    db.tokens.create_index([("user_id", ASCENDING)], unique=True)
    
    # Create index on timestamp for temporal queries
    db.emails.create_index([("timestamp", DESCENDING)])
    
    print(f"MongoDB initialized: {DB_NAME}")

def save_email_analysis(email_data: Dict) -> bool:
    """
    Save or update email and its AI analysis to MongoDB.
    Highly efficient: embeds everything in one document.
    """
    db = get_db()
    try:
        # Standardize data types
        payload = email_data.copy()
        
        # Ensure primitive types for top-level fields
        def ensure_str(val): return str(val) if val is not None else ""
        
        # Consistent summary handling (ensure it's a string as per previous fixes)
        summary = payload.get('summary', "")
        if isinstance(summary, list):
            summary = "\n".join([str(s) for s in summary])
        
        # Prepare the document
        doc = {
            "id": ensure_str(payload.get('id')),
            "user_id": ensure_str(payload.get('user_id')),
            "subject": ensure_str(payload.get('subject')),
            "sender": ensure_str(payload.get('sender')),
            "recipient": ensure_str(payload.get('to')),
            "date": ensure_str(payload.get('date')),
            "snippet": ensure_str(payload.get('snippet')),
            "body": ensure_str(payload.get('body')),
            "summary": summary,
            "priority": ensure_str(payload.get('priority', "MEDIUM")),
            "sentiment": ensure_str(payload.get('sentiment', "neutral")),
            "sentiment_score": float(payload.get('sentiment_score', 0.5)),
            "category": ensure_str(payload.get('category', "General")),
            "extracted_info": payload.get('extracted_info', {}), # Nested JSON is native to Mongo
            "processed_at": datetime.utcnow(),
            "timestamp": email_date_to_timestamp(payload.get('date'))
        }

        # Upsert: Update if exists, insert if not
        db.emails.update_one(
            {"id": doc["id"]},
            {"$set": doc},
            upsert=True
        )
        return True
    except Exception as e:
        print(f"Error saving to MongoDB: {e}")
        return False

def save_emails_batch(email_list: List[Dict]) -> bool:
    """
    Save multiple emails to MongoDB efficiently using bulk operations.
    Skips AI fields to enable fast initial sync.
    """
    db = get_db()
    try:
        operations = []
        for payload in email_list:
            # Ensure primitive types
            def ensure_str(val): return str(val) if val is not None else ""
            
            doc = {
                "id": ensure_str(payload.get('id')),
                "user_id": ensure_str(payload.get('user_id')),
                "subject": ensure_str(payload.get('subject')),
                "sender": ensure_str(payload.get('from') or payload.get('sender')),
                "recipient": ensure_str(payload.get('to')),
                "date": ensure_str(payload.get('date')),
                "snippet": ensure_str(payload.get('snippet')),
                "body": ensure_str(payload.get('body')),
                "processed_at": datetime.utcnow(),
                "timestamp": email_date_to_timestamp(payload.get('date'))
            }
            
            # Using update_one with $set for basic info, but not touching labels/summaries if they exist
            operations.append(UpdateOne(
                {"id": doc["id"]},
                {"$set": doc},
                upsert=True
            ))
            
        if operations:
            db.emails.bulk_write(operations)
        return True
    except Exception as e:
        print(f"Error bulk saving to MongoDB: {e}")
        return False

def get_emails_by_user(user_id: str, limit: int = 50) -> List[Dict]:
    """Retrieve indexed emails for a specific user from MongoDB."""
    db = get_db()
    try:
        # Sort by actual email timestamp instead of processed_at
        results = db.emails.find({"user_id": user_id}).sort("timestamp", DESCENDING).limit(limit)
        email_list = []
        for r in results:
            if '_id' in r: del r['_id']
            if 'processed_at' in r: r['processed_at'] = r['processed_at'].isoformat()
            # Map back to 'from' for frontend compatibility if saved as 'sender'
            if 'sender' in r: r['from'] = r['sender']
            email_list.append(r)
        return email_list
    except Exception as e:
        print(f"Error fetching from MongoDB for user {user_id}: {e}")
        return []

def get_analytics(user_id: str) -> Dict:
    """
    Get analytics data using MongoDB aggregation framework for maximum efficiency.
    """
    db = get_db()
    analytics = {
        'total_emails': 0,
        'priority_distribution': {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0},
        'sentiment_distribution': {'positive': 0, 'negative': 0, 'neutral': 0},
        'category_distribution': {},
        'recent_emails': []
    }

    try:
        # 1. Total Count
        analytics['total_emails'] = db.emails.count_documents({"user_id": user_id})

        # 2. Distributions using Aggregation
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$facet": {
                "priority": [{"$group": {"_id": "$priority", "count": {"$sum": 1}}}],
                "sentiment": [{"$group": {"_id": "$sentiment", "count": {"$sum": 1}}}],
                "category": [{"$group": {"_id": "$category", "count": {"$sum": 1}}}]
            }}
        ]
        
        results = list(db.emails.aggregate(pipeline))[0]

        for p in results['priority']:
            if p['_id'] in analytics['priority_distribution']:
                analytics['priority_distribution'][p['_id']] = p['count']
        
        for s in results['sentiment']:
            if s['_id'] in analytics['sentiment_distribution']:
                analytics['sentiment_distribution'][s['_id']] = s['count']
        
        for c in results['category']:
            if c['_id']:
                analytics['category_distribution'][c['_id']] = c['count']

        # 3. Recent Emails
        recent = db.emails.find(
            {"user_id": user_id},
            {"id": 1, "subject": 1, "sender": 1, "priority": 1, "sentiment": 1, "category": 1, "processed_at": 1}
        ).sort("processed_at", DESCENDING).limit(10)

        for r in recent:
            r['processed_at'] = r['processed_at'].isoformat()
            if 'timestamp' in r and r['timestamp']:
                r['timestamp'] = r['timestamp'].isoformat()
            if '_id' in r: del r['_id']
            analytics['recent_emails'].append(r)

    except Exception as e:
        print(f"Error fetching analytics from MongoDB: {e}")
    
    return analytics

def search_emails(query_text: str, user_id: str, limit: int = 20) -> List[Dict]:
    """
    Search emails using MongoDB's text search or partial matching.
    """
    db = get_db()
    try:
        # Using regex for partial matching (more flexible for partial words)
        query = {
            "user_id": user_id,
            "$or": [
                {"subject": {"$regex": query_text, "$options": "i"}},
                {"body": {"$regex": query_text, "$options": "i"}},
                {"sender": {"$regex": query_text, "$options": "i"}},
                {"snippet": {"$regex": query_text, "$options": "i"}}
            ]
        }
        
        # Sort by actual email timestamp
        results = db.emails.find(query).limit(limit).sort("timestamp", DESCENDING)
        
        email_list = []
        for r in results:
            if '_id' in r: del r['_id']
            # Convert datetime to string for JSON serialization
            if 'processed_at' in r: r['processed_at'] = r['processed_at'].isoformat()
            email_list.append(r)
        return email_list
    except Exception as e:
        print(f"Error searching MongoDB: {e}")
        return []

def get_email_by_id(email_id: str, user_id: Optional[str] = None) -> Optional[Dict]:
    """Retrieve email from MongoDB."""
    db = get_db()
    query = {"id": email_id}
    if user_id:
        query["user_id"] = user_id
    
    try:
        res = db.emails.find_one(query)
        if res:
            if '_id' in res: del res['_id']
            # Map 'recipient' back to 'to' for frontend compatibility if needed
            if 'recipient' in res: res['to'] = res['recipient']
            if 'processed_at' in res: res['processed_at'] = res['processed_at'].isoformat()
            return res
    except Exception as e:
        print(f"Error getting email from MongoDB: {e}")
    return None

def delete_email_by_id(email_id: str, user_id: Optional[str] = None) -> bool:
    """Delete email from MongoDB."""
    db = get_db()
    query = {"id": email_id}
    if user_id:
        query["user_id"] = user_id
        
    try:
        res = db.emails.delete_one(query)
        return res.deleted_count > 0
    except Exception as e:
        print(f"Error deleting from MongoDB: {e}")
        return False


def email_date_to_timestamp(date_str: Optional[str]) -> Optional[datetime]:
    """Parse Gmail date string to Python datetime."""
    if not date_str:
        return datetime.utcnow()
    try:
        dt = parsedate_to_datetime(date_str)
        # Convert to UTC for consistency in database
        return dt.astimezone(datetime.utcnow().astimezone().tzinfo).replace(tzinfo=None)
    except Exception:
        return datetime.utcnow()

# ============ Token Encryption & Storage ============

def save_user_token(user_id: str, token_data: Dict) -> bool:
    """Encrypt and save OAuth tokens to MongoDB."""
    db = get_db()
    fernet = get_fernet()
    try:
        # Serialize to JSON and encrypt
        json_data = json.dumps(token_data)
        encrypted_data = fernet.encrypt(json_data.encode()).decode()
        
        db.tokens.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "token_blob": encrypted_data,
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )
        return True
    except Exception as e:
        print(f"Error saving encrypted token: {e}")
        return False

def load_user_token(user_id: str) -> Optional[Dict]:
    """Load and decrypt OAuth tokens from MongoDB."""
    db = get_db()
    fernet = get_fernet()
    try:
        res = db.tokens.find_one({"user_id": user_id})
        if not res:
            return None
        
        encrypted_data = res["token_blob"]
        decrypted_json = fernet.decrypt(encrypted_data.encode()).decode()
        return json.loads(decrypted_json)
    except Exception as e:
        print(f"Error loading/decrypting token: {e}")
        return None

# ============ Session Token Management (No-Cookie Auth) ============

def create_session_token(user_id: str) -> str:
    """Generate a secure session token and store it in MongoDB."""
    db = get_db()
    token = secrets.token_urlsafe(48)
    try:
        # Sessions expire in 24 hours
        db.sessions.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "token": token,
                "created_at": datetime.utcnow()
            }},
            upsert=True
        )
        return token
    except Exception as e:
        print(f"Error creating session token: {e}")
        return ""

def validate_session_token(token: str) -> Optional[str]:
    """Retrieve user_id for a given session token if valid."""
    if not token:
        return None
    db = get_db()
    try:
        res = db.sessions.find_one({"token": token})
        if res:
            # Simple check: is it older than 24h?
            delta = datetime.utcnow() - res["created_at"]
            if delta.total_seconds() < 86400: # 1 day
                return res["user_id"]
        return None
    except Exception as e:
        print(f"Error validating session token: {e}")
        return None

# Initialize on import
try:
    init_db()
except Exception:
    pass # Might fail if server isn't running yet, app.py will handle it
