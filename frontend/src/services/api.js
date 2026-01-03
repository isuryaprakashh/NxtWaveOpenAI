// API service for communicating with Flask backend

// Helper for JSON requests
async function fetchJSON(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: 'include',  // Include cookies for session
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// Auth APIs
export const checkAuth = () => fetchJSON('/api/auth/check').catch(() => ({ authenticated: false }));
export const logout = () => fetch('/logout', { credentials: 'include' });

// Inbox APIs
export const fetchInbox = (query = '') => {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    return fetchJSON(`/api/inbox${params}`);
};

// Message APIs
export const fetchMessage = (id, refresh = false) => {
    const params = refresh ? '?refresh=1' : '';
    return fetchJSON(`/api/message/${id}${params}`);
};

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
    return `/api/attachment/${messageId}/${attachmentId}?${params}`;
};

// Analytics API
export const fetchAnalytics = () => fetchJSON('/api/analytics');

// Chat API
export const sendChatQuery = (question) =>
    fetchJSON('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ question }),
    });

// Compose Email API
export const composeEmail = (to, subject, body) =>
    fetchJSON('/api/compose', {
        method: 'POST',
        body: JSON.stringify({ to, subject, body }),
    });

// Inbox Check API (for polling)
export const checkInbox = () => fetchJSON('/api/inbox/check');

