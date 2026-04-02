import os
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime

# Load env from backend/.env
load_dotenv('backend/.env')

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", "odin_email_db")

def verify_mongo():
    print(f"📡 Connecting to MongoDB: {DB_NAME}...")
    if not MONGO_URI:
        print("🛑 ERROR: MONGO_URI not found in .env!")
        return

    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        
        # 1. Check Emails Collection
        email_count = db.emails.count_documents({})
        print(f"📧 Emails Found: {email_count}")
        
        if email_count > 0:
            # Show last 3 emails
            latest = db.emails.find().sort("timestamp", -1).limit(3)
            print("\n📬 Latest 3 Emails in Cache:")
            for e in latest:
                print(f" - [{e.get('priority', '???')}] {e.get('subject', 'No Subject')} (User: {e.get('user_id')})")
        
        # 2. Check Sessions (Tokens)
        session_count = db.sessions.count_documents({})
        print(f"\n🔑 Active Token Sessions: {session_count}")
        
        # 3. Check GMAIL OAuth Tokens
        token_count = db.tokens.count_documents({})
        print(f"🎫 Encrypted GMAIL Tokens: {token_count}")
        
        print("\n✅ MongoDB Data Retrieval Logic is WORKING.")

    except Exception as e:
        print(f"🛑 MONGODB ERROR: {e}")

if __name__ == "__main__":
    verify_mongo()
