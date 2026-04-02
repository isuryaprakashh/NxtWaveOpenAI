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
    """Retrieve the frontend URL for CORS and redirects, auto-detecting for debug mode."""
    # Detect local vs production
    # 1. Check FLASK_DEBUG
    # 2. Check if we are NOT on Render (which sets RENDER_EXTERNAL_URL)
    is_debug_flag = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    is_on_render = os.environ.get("RENDER") is not None
    
    is_local = is_debug_flag or (not is_on_render)
    
    default_url = LOCAL_FRONTEND_URL if is_local else PROD_FRONTEND_URL
    
    raw_url = os.environ.get("FRONTEND_URL")
    if not raw_url:
        raw_url = default_url
        
    return raw_url.rstrip('/')

def get_redirect_uri():
    """Retrieve the Google OAuth redirect URI."""
    # 1. Check FLASK_DEBUG
    # 2. Check if we are NOT on Render (which sets RENDER environment variable)
    is_debug_flag = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    is_on_render = os.environ.get("RENDER") is not None
    
    is_local = is_debug_flag or (not is_on_render)

    if is_local:
        return f"{LOCAL_BACKEND_URL}/oauth2callback"
    
    return f"{PROD_BACKEND_URL}/oauth2callback"

def get_cors_origins():
    """Generate the list of allowed CORS origins."""
    fe_url = get_frontend_url()
    origins = [
        fe_url,
        f"{fe_url}/",
        LOCAL_FRONTEND_URL,
        f"{LOCAL_FRONTEND_URL}/"
    ]
    print(f"🔓 CORS origins enabled for: {origins}")
    return origins
