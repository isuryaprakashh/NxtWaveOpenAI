/**
 * Odin Mail - Central Configuration
 * Manages API endpoints and WebSocket URLs for local vs. production.
 */

const PROD_BACKEND_URL = "https://nxtwaveopenai.onrender.com";

// Use VITE environment variable if available, else fallback to production
// In local dev, you can set VITE_API_URL=http://localhost:5000 in .env.local
export const API_BASE_URL = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '') 
    : PROD_BACKEND_URL;

// Derive WebSocket URL from the API base
// socket.io-client handles the transformation from https://... to wss://...
export const WS_URL = API_BASE_URL;

console.log(`🌐 Odin Frontend initialized with API_BASE_URL: ${API_BASE_URL}`);
