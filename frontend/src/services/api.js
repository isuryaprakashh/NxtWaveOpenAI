// API service for communicating with Flask backend
export const BASE_URL = import.meta.env.VITE_API_URL || '';

// Helper for JSON requests
async function fetchJSON(url, options = {}) {
    // Prefix URL with base if absolute path
    const targetUrl = url.startsWith('/') ? `${BASE_URL}${url}` : url;
    
    const response = await fetch(targetUrl, {
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
    return `/api/attachment/${messageId}/${attachmentId}?${params}`;
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

