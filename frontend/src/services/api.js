// API service for communicating with Flask backend
export { API_BASE_URL as BASE_URL } from '../config';
console.log("🛡️ Odin Security: v2.0 (Token Auth Active)");

// Helper for JSON requests
async function fetchJSON(url, options = {}) {
    // Prefix URL with base if absolute path
    const targetUrl = url.startsWith('/') ? `${BASE_URL}${url}` : url;
    
    const token = localStorage.getItem('odin_auth_token');
    
    const response = await fetch(targetUrl, {
        ...options,
        credentials: 'include',  // Include cookies for session
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'X-Odin-Token': token } : {}), // Add token header if available
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    const json = await response.json();
    if (url === '/api/auth/check') {
        console.log("🔒 Auth Check Result:", json.authenticated ? "Authenticated ✅" : "Not Authenticated 🛑");
    }
    return json;
}

// Auth APIs
export const checkAuth = () => {
    // 1. Check if token is in URL (first visit after Google login)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        localStorage.setItem('odin_auth_token', token);
        // Clean the URL to keep it pretty
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    return fetchJSON('/api/auth/check').catch(() => ({ authenticated: false }));
};

export const logout = () => {
    localStorage.removeItem('odin_auth_token');
    return fetch(`${BASE_URL}/logout`, { credentials: 'include' });
};

// Inbox APIs
export const fetchInbox = (query = '', pageToken = '', folder = 'inbox') => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (pageToken) params.set('pageToken', pageToken);
    if (folder) params.set('folder', folder);
    
    const queryString = params.toString();
    return fetchJSON(`/api/inbox${queryString ? '?' + queryString : ''}`);
};

// Message APIs
export const fetchMessage = (id, options = {}) => {
    const params = new URLSearchParams();
    if (options.refresh) params.set('refresh', '1');
    if (options.lazy) params.set('lazy', '1');
    const queryString = params.toString();
    return fetchJSON(`/api/message/${id}${queryString ? '?' + queryString : ''}`);
};

// Fetch AI analysis separately (for lazy loading)
export const fetchAnalysis = (id) => fetchJSON(`/api/message/${id}/analyze`);

export const generateReply = (id, tone, instructions) =>
    fetchJSON(`/generate_reply/${id}`, {
        method: 'POST',
        body: JSON.stringify({ tone, instructions }),
    });

export const sendReply = (id, replyText, to, subject) =>
    fetchJSON(`/send_reply/${id}`, {
        method: 'POST',
        body: JSON.stringify({ reply_text: replyText, to, subject }),
    });

// Attachment API
export const getAttachmentUrl = (messageId, attachmentId, filename, mimeType) => {
    const params = new URLSearchParams({ filename, mimeType });
    return `${BASE_URL}/api/attachment/${messageId}/${attachmentId}?${params}`;
};

// Chat API
export const sendChatQuery = (question) =>
    fetchJSON('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ question }),
    });

// Compose Email API
export const composeEmail = (to, subject, body, attachments = []) =>
    fetchJSON('/api/compose', {
        method: 'POST',
        body: JSON.stringify({ to, subject, body, attachments }),
    });

// Delete Email API
export const deleteEmail = (id) =>
    fetchJSON(`/api/message/${id}/delete`, {
        method: 'POST',
    });

// Inbox Check API (for polling)
export const checkInbox = () => fetchJSON('/api/inbox/check');

