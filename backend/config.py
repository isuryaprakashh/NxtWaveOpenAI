import os

# ============ Production Defaults ============
PROD_BACKEND_URL = "https://nxtwaveopenai.onrender.com"
PROD_FRONTEND_URL = "https://odin-mail-dusky.vercel.app"

# ============ Local Development Defaults ============
LOCAL_BACKEND_PORT = 5000
LOCAL_FRONTEND_PORT = 5173

LOCAL_BACKEND_URL = f"http://localhost:{LOCAL_BACKEND_PORT}"
LOCAL_FRONTEND_URL = f"http://localhost:{LOCAL_FRONTEND_PORT}"

# ============ Logic for Environment Resolution ============

def get_backend_port():
    """Retrieve the port for the backend server (default 5000)."""
    return int(os.environ.get("PORT", LOCAL_BACKEND_PORT))

def get_frontend_url():
    """Retrieve the frontend URL for CORS and redirects."""
    raw_url = os.environ.get("FRONTEND_URL", PROD_FRONTEND_URL)
    return raw_url.rstrip('/')

def get_redirect_uri():
    """Retrieve the Google OAuth redirect URI."""
    # Always prioritize the environment variable if set
    env_uri = os.environ.get("GOOGLE_OAUTH_REDIRECT_URI")
    if env_uri:
        return env_uri
    
    # Fallback to production Render URL if not local
    if os.environ.get("RENDER"):
        return f"{PROD_BACKEND_URL}/oauth2callback"
    
    return f"{LOCAL_BACKEND_URL}/oauth2callback"

def get_cors_origins():
    """Generate the list of allowed CORS origins."""
    fe_url = get_frontend_url()
    return [
        fe_url,
        f"{fe_url}/",
        LOCAL_FRONTEND_URL,
        f"{LOCAL_FRONTEND_URL}/"
    ]
