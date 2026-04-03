/**
 * Odin Mail - Central Configuration
 * Manages API endpoints and WebSocket URLs for local vs. production.
 */

const LOCAL_BACKEND_URL = "http://localhost:5000";
const PROD_BACKEND_URL = "https://nxtwaveopenai.onrender.com";

// Auto-detect if we are running locally to switch between dev and production backends
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// Use VITE environment variable if available, else auto-detect based on current site
export const API_BASE_URL = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '') 
    : (isLocal ? LOCAL_BACKEND_URL : PROD_BACKEND_URL);

// Derive WebSocket URL from the API base
export const WS_URL = API_BASE_URL;

console.log(`🌐 Odin Frontend initialized with API_BASE_URL: ${API_BASE_URL}`);
