import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ComposeModal from "../components/ComposeModal";
import { fetchInbox, fetchMessage, fetchAnalysis, checkInbox, checkAuth, deleteEmail } from "../services/api";
import { WS_URL } from "../config";
import { saveEmailsToDB, getEmailsFromDB, clearEmailsForUser } from "../services/db";
import { io } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Custom Confirm Modal ───
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "Confirm", danger = false }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative glass !rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.15)] border border-white/80 px-8 py-8 max-w-sm w-full animate-fade-up">
                <h3 className="font-display text-xl tracking-tight text-gray-900 mb-2">{title}</h3>
                <p className="text-[0.9rem] text-gray-500 mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-[0.85rem] font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2.5 rounded-xl text-[0.85rem] font-bold text-white transition-all ${
                            danger ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-900 hover:bg-black'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Analysis Progress Modal ───
function AnalysisModal({ isOpen, onClose, progress, total, currentSubject, results }) {
    if (!isOpen) return null;
    const isComplete = results && results.length > 0;
    const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

    const priorityColor = p => p === 'HIGH' ? 'bg-[#ffeceb] text-[#d93025]' : p === 'LOW' ? 'bg-[#e6f4ea] text-[#1e8e3e]' : 'bg-[#fef7e0] text-[#f29900]';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={isComplete ? onClose : undefined} />
            <div className="relative glass !rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.15)] border border-white/80 px-8 py-8 max-w-lg w-full animate-fade-up max-h-[80vh] flex flex-col">
                
                {!isComplete ? (
                    /* ─ Progress View ─ */
                    <div className="text-center py-6">
                        <div className="w-14 h-14 mx-auto mb-5 rounded-full border-[3px] border-[#c2a3ff] border-t-transparent animate-spin" />
                        <h3 className="font-display text-2xl tracking-tight text-gray-900 mb-2">
                            Analyzing {progress} of {total}
                        </h3>
                        <p className="text-sm text-gray-400 mb-6 truncate max-w-xs mx-auto">
                            {currentSubject || 'Preparing...'}
                        </p>
                        {/* Real progress bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{
                                    width: `${pct}%`,
                                    background: 'linear-gradient(90deg, #a3c2ff, #c2a3ff)'
                                }}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-2 font-bold tracking-widest">{pct}%</p>
                    </div>
                ) : (
                    /* ─ Results View ─ */
                    <>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-display text-xl tracking-tight text-gray-900">
                                Analysis Complete
                            </h3>
                            <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/[0.03] hover:bg-black/[0.08] transition-colors flex items-center justify-center text-gray-400 hover:text-gray-900">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
                            {results.map((r, i) => (
                                <div key={i} className="p-4 rounded-2xl bg-white/60 border border-gray-100">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <h4 className="font-semibold text-[0.9rem] text-gray-900 truncate">{r.subject || 'Untitled'}</h4>
                                        {r.priority && (
                                            <span className={`text-[0.6rem] font-bold tracking-widest uppercase px-2 py-1 rounded-lg flex-shrink-0 ${priorityColor(r.priority)}`}>
                                                {r.priority}
                                            </span>
                                        )}
                                    </div>
                                    <div className="markdown-body text-[0.8rem] text-gray-500 leading-relaxed font-medium">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1 marker:text-[#a3c2ff]" {...props} />,
                                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1 marker:text-gray-400 font-bold" {...props} />,
                                                li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                                strong: ({node, ...props}) => <strong className="font-bold text-gray-800" {...props} />,
                                                a: ({node, ...props}) => <a className="text-[#6b6bf9] hover:text-[#4b4be9] underline break-all font-semibold transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                                                h1: ({node, ...props}) => <h1 className="text-base font-bold text-gray-800 mb-2 mt-3 first:mt-0 tracking-tight" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="text-[0.9rem] font-bold text-gray-800 mb-2 mt-2" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-[0.85rem] font-bold text-gray-700 mb-1 mt-2" {...props} />,
                                                code: ({node, inline, ...props}) => 
                                                    inline ? <code className="px-1 py-0.5 bg-gray-100 rounded text-[0.75rem] font-mono text-gray-700" {...props} /> 
                                                           : <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto text-[0.75rem] font-mono mb-2"><code {...props} /></pre>,
                                                blockquote: ({node, ...props}) => <blockquote className="border-l-3 border-[#c2a3ff] pl-3 py-0.5 italic text-gray-500 bg-gray-50/50 rounded-r-md mb-2" {...props} />
                                            }}
                                        >
                                            {Array.isArray(r.summary) ? r.summary.join("\n") : (r.summary || 'No summary available')}
                                        </ReactMarkdown>
                                    </div>
                                    {r.category && (
                                        <span className="inline-block mt-2 text-[0.6rem] font-bold tracking-widest uppercase text-[#7a48df] bg-[#c2a3ff]/10 px-2 py-1 rounded-lg">
                                            {r.category}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function InboxPage({ folder = 'inbox' }) {
    const navigate = useNavigate();
    const isSentFolder = folder === 'sent';
    const [emails, setEmails] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [query, setQuery] = useState("");
    const [sortOrder, setSortOrder] = useState("date_desc");
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [composeOpen, setComposeOpen] = useState(false);
    const [newEmailCount, setNewEmailCount] = useState(0);
    const [lastEmailId, setLastEmailId] = useState(null);
    const [nextPageToken, setNextPageToken] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [userId, setUserId] = useState(sessionStorage.getItem('odin_user_id'));
    const [hasNewEmails, setHasNewEmails] = useState(false);

    // Custom confirm modal state
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false, confirmLabel: 'Confirm' });

    // Analysis modal state
    const [analysisModal, setAnalysisModal] = useState({ open: false, progress: 0, total: 0, currentSubject: '', results: null });

    const showConfirm = useCallback((title, message, onConfirm, { danger = false, confirmLabel = 'Confirm' } = {}) => {
        setConfirmModal({ open: true, title, message, onConfirm, danger, confirmLabel });
    }, []);
    const closeConfirm = useCallback(() => setConfirmModal(prev => ({ ...prev, open: false })), []);

    useEffect(() => {
        const initInbox = async () => {
            let currentUserId = null;
            try {
                const auth = await checkAuth();
                currentUserId = auth.user_id;

                if (!currentUserId) {
                    setEmails([]);
                    setInitialLoading(false);
                    return;
                }

                const cachedUserId = sessionStorage.getItem('odin_user_id');

                // If user changed or logged out, clear EVERYTHING related to old sessions
                if (cachedUserId && cachedUserId !== currentUserId) {
                    sessionStorage.clear();
                    setEmails([]); // Force clear state immediately
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('email_draft_')) {
                            localStorage.removeItem(key);
                        }
                    });
                }

                setUserId(currentUserId);
                sessionStorage.setItem('odin_user_id', currentUserId);
            } catch (err) {
                console.error("Auth check failed:", err);
                setEmails([]);
                setInitialLoading(false);
                return;
            }

            // Use IndexedDB for SaaS-Level Scaling (GBs instead of 5MB sessionStorage)
            const cached = await getEmailsFromDB(currentUserId, folder);
            
            if (cached && cached.length > 0) {
                setEmails(cached);
                // Last page token still in session storage (small data)
                const tokenKey = `odin_v3_${currentUserId}_token_${folder}`;
                const cachedToken = sessionStorage.getItem(tokenKey);
                if (cachedToken) setNextPageToken(cachedToken);
                setInitialLoading(false);
                setLastEmailId(cached[0].id);
            } else {
                // No cache in IndexedDB — clear previous list and show loading
                setEmails([]);
                setInitialLoading(true);
                loadEmails(currentUserId);
            }
        };
        initInbox();
    }, [folder]);

    // Real-time updates via SocketIO
    useEffect(() => {
        if (!userId) return;
        const token = localStorage.getItem('odin_auth_token');

        const socket = io(WS_URL, {
            withCredentials: true,
            transports: ["websocket"],
            auth: { token }
        });

        socket.on("connect", () => {
            console.log("📡 Connected to Odin Real-time");
        });

        socket.on("new_email", (data) => {
            console.log("📬 New email detected via SocketIO");
            setHasNewEmails(true);
            setNewEmailCount(prev => prev + 1);
        });

        return () => {
            socket.disconnect();
        };
    }, [userId]);

    const loadEmails = async (providedUid = null, isRefresh = false) => {
        if (!isRefresh && (!emails || emails.length === 0)) setInitialLoading(true);
        else setLoading(true);
        
        let uid = providedUid;
        if (!uid) {
            const auth = await checkAuth();
            uid = auth.user_id;
        }

        if (!uid) {
            setInitialLoading(false);
            setLoading(false);
            return;
        }

        const cacheKey = `odin_v3_${uid}_cache_${folder}`;
        const tokenKey = `odin_v3_${uid}_token_${folder}`;

        try {
            const data = await fetchInbox(query, '', folder);
            if (data.messages) {
                setEmails(data.messages);
                setNextPageToken(data.nextPageToken || null);
                
                // Save to IndexedDB
                await saveEmailsToDB(data.messages, uid, folder);
                
                const tokenKey = `odin_v3_${uid}_token_${folder}`;
                if (data.nextPageToken) {
                    sessionStorage.setItem(tokenKey, data.nextPageToken);
                } else {
                    sessionStorage.removeItem(tokenKey);
                }
                
                if (data.messages.length > 0) setLastEmailId(data.messages[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setInitialLoading(false);
            setLoading(false);
        }
    };

    const loadMoreEmails = async () => {
        if (!nextPageToken || loadingMore) return;
        setLoadingMore(true);

        const auth = await checkAuth();
        const uid = auth.user_id;
        if (!uid) {
            setLoadingMore(false);
            return;
        }

        const cacheKey = `odin_v3_${uid}_cache_${folder}`;
        const tokenKey = `odin_v3_${uid}_token_${folder}`;

        try {
            const data = await fetchInbox(query, nextPageToken, folder);
            if (data.messages) {
                const updatedMails = [...emails, ...data.messages];
                setEmails(updatedMails);
                setNextPageToken(data.nextPageToken || null);
                
                sessionStorage.setItem(cacheKey, JSON.stringify(updatedMails));
                if (data.nextPageToken) {
                    sessionStorage.setItem(tokenKey, data.nextPageToken);
                } else {
                    sessionStorage.removeItem(tokenKey);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMore(false);
        }
    };

    const filteredEmails = useMemo(() => {
        let list = emails.filter(e =>
            (e.subject || "").toLowerCase().includes(query.toLowerCase()) ||
            (e.from || e.to || "").toLowerCase().includes(query.toLowerCase())
        );
        list.sort((a, b) => {
            const dA = new Date(a.date).getTime();
            const dB = new Date(b.date).getTime();
            return sortOrder === "date_desc" ? dB - dA : dA - dB;
        });
        return list;
    }, [emails, query, sortOrder]);

    const toggleSelect = id => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const openMail = id => navigate(`/message/${id}${isSentFolder ? '?folder=sent' : ''}`);
    const selectAll = () => setSelectedIds(new Set(filteredEmails.map(e => e.id)));
    const clearSelection = () => setSelectedIds(new Set());

    // ── Delete single email (with custom modal) ──
    const handleDelete = (e, id) => {
        e.stopPropagation();
        const mail = emails.find(m => m.id === id);
        showConfirm(
            'Move to Trash?',
            `"${mail?.subject || 'This email'}" will be moved to your Gmail trash.`,
            async () => {
                closeConfirm();
                try {
                    await deleteEmail(id);
                    setEmails(prev => prev.filter(m => m.id !== id));
                    sessionStorage.removeItem('odin_inbox_data');
                } catch (err) {
                    console.error('Delete failed:', err);
                }
            },
            { danger: true, confirmLabel: 'Move to Trash' }
        );
    };

    // ── Bulk delete (with custom modal) ──
    const handleBulkDelete = () => {
        showConfirm(
            'Delete Selected?',
            `${selectedIds.size} email(s) will be moved to your Gmail trash.`,
            async () => {
                closeConfirm();
                setLoading(true);
                try {
                    await Promise.all([...selectedIds].map(id => deleteEmail(id)));
                    setEmails(prev => prev.filter(m => !selectedIds.has(m.id)));
                    sessionStorage.removeItem('odin_inbox_data');
                    clearSelection();
                } catch (err) {
                    console.error('Bulk delete failed:', err);
                } finally {
                    setLoading(false);
                }
            },
            { danger: true, confirmLabel: 'Delete All' }
        );
    };

    // ── Analyze with real progress ──
    const analyzeSelected = async () => {
        if (!selectedIds.size) return;
        const ids = [...selectedIds];
        const total = ids.length;

        // Open modal with progress view
        setAnalysisModal({ open: true, progress: 0, total, currentSubject: 'Starting...', results: null });

        const results = [];
        for (let i = 0; i < ids.length; i++) {
            const mail = emails.find(m => m.id === ids[i]);
            setAnalysisModal(prev => ({
                ...prev,
                progress: i,
                currentSubject: mail?.subject || `Email ${i + 1}`
            }));

            try {
                // Fetch the message with full AI analysis
                const data = await fetchMessage(ids[i]);
                // If AI isn't loaded yet, explicitly trigger analysis
                if (!data.summary) {
                    const aiData = await fetchAnalysis(ids[i]);
                    Object.assign(data, aiData);
                }
                results.push(data);
            } catch (err) {
                results.push({ subject: mail?.subject || 'Error', summary: 'Analysis failed', priority: null });
            }

            // Update progress after completion
            setAnalysisModal(prev => ({
                ...prev,
                progress: i + 1
            }));
        }

        // Show results
        setAnalysisModal(prev => ({ ...prev, results }));
    };

    const closeAnalysis = () => setAnalysisModal({ open: false, progress: 0, total: 0, currentSubject: '', results: null });

    const priorityColor = p => p === 'HIGH' ? 'bg-[#ffeceb] text-[#d93025]' : p === 'LOW' ? 'bg-[#e6f4ea] text-[#1e8e3e]' : 'bg-[#fef7e0] text-[#f29900]';

    return (
        <div className="min-h-screen bg-[#fdfdfc]">
            <Navbar />
            
            <div className="mx-auto max-w-7xl px-8 pt-32 pb-20 flex gap-8">
                
                {/* ─── Sidebar ─── */}
                <aside className="w-48 flex-shrink-0 hidden lg:block">
                    <nav className="sticky top-32 space-y-2">
                        {[
                            { id: 'inbox', label: 'Inbox', icon: (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                            )},
                            { id: 'sent', label: 'Sent', icon: (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )},
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.id === 'inbox' ? '/inbox' : '/sent')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[0.8rem] font-bold tracking-tight transition-all ${
                                    folder === item.id 
                                        ? 'bg-[#c2a3ff]/10 text-[#7a48df] shadow-sm' 
                                        : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* ─── Main Content ─── */}
                <main className="flex-1 min-w-0">
                    <div className="text-center mb-12 animate-fade-up">
                        <h1 className="font-display text-4xl sm:text-6xl tracking-tighter text-gray-900 mb-2">
                            {isSentFolder ? 'Sent Mails' : 'Inbox Intelligence'}
                        </h1>
                        <p className="text-sm font-bold tracking-[0.2em] uppercase text-[#6b6bf9]">
                            {filteredEmails.length} messages available
                        </p>
                    </div>

                    {/* Ultra premium search bar layout */}
                    <div className="flex gap-3 justify-center w-full animate-fade-up delay-100">
                        <div className="relative w-full max-w-lg">
                            <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                className="w-full glass !bg-white/80 border border-gray-100 pl-12 pr-6 py-4 text-[0.95rem] font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c2a3ff]/50 transition-all rounded-[32px] shadow-sm"
                                placeholder="Find people, subjects, or keywords..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex items-center justify-between animate-fade-up delay-200 px-2 mt-8">
                        <div className="flex gap-2">
                            <button aria-label="Select all current emails" onClick={selectAll} className="pill-badge text-[0.65rem] uppercase tracking-widest text-gray-500 hover:text-gray-900">
                                Select All
                            </button>
                            <button aria-label="Toggle sort order" onClick={() => setSortOrder(o => o === 'date_desc' ? 'date_asc' : 'date_desc')} className="pill-badge text-[0.65rem] uppercase tracking-widest text-gray-500 hover:text-gray-900">
                                Sort: {sortOrder === 'date_desc' ? 'Newest' : 'Oldest'}
                            </button>
                            <button aria-label="Refresh folder" onClick={() => loadEmails(true)} disabled={loading} className="pill-badge text-[0.65rem] uppercase tracking-widest text-gray-500 hover:text-gray-900">
                                Refresh {loading && ' ↺'}
                            </button>
                        </div>
                    </div>

                    {/* Glass email list */}
                    <div className="glass overflow-hidden animate-fade-up delay-300 backdrop-blur-3xl shadow-[0_12px_48px_rgba(0,0,0,0.06)] border border-white/60 mt-8 rounded-[32px]">
                        {initialLoading ? (
                            <div className="py-32 flex flex-col items-center justify-center">
                                <div className="w-10 h-10 border-2 border-[#ff9b5e] border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-display text-2xl text-gray-400">Loading your world...</p>
                            </div>
                        ) : filteredEmails.length === 0 ? (
                            <div className="py-24 flex flex-col items-center justify-center text-center px-6">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f8f9fa] to-white flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                                    <span className="text-4xl">📭</span>
                                </div>
                                <h3 className="font-display text-2xl text-gray-800 mb-2">Nothing found here.</h3>
                                <p className="text-[0.9rem] text-gray-400 font-medium max-w-sm">
                                    {query ? "We couldn't find any emails matching your search criteria. Try a different keyword." : "This folder is completely empty right now."}
                                </p>
                                {query && (
                                    <button onClick={() => setQuery('')} className="mt-6 pill-badge !bg-white hover:!bg-gray-50 border border-gray-200">
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="divide-y divide-black/[0.04]">
                                {filteredEmails.map((mail, idx) => {
                                    const selected = selectedIds.has(mail.id);
                                    return (
                                        <div
                                            key={mail.id}
                                            className={`group flex items-start gap-5 px-6 sm:px-8 py-6 cursor-pointer transition-all duration-300 hover:bg-white/40 ${
                                                selected ? 'bg-white/60' : ''
                                            }`}
                                            onClick={() => openMail(mail.id)}
                                        >
                                            <div className="pt-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleSelect(mail.id)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="w-4 h-4 rounded-md border-gray-300 text-[#a3c2ff] focus:ring-[#a3c2ff] transition-all cursor-pointer"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <h3 className="font-semibold text-gray-900 text-[0.95rem] truncate pr-4">{isSentFolder ? `To: ${mail.to || 'Unknown'}` : mail.from}</h3>
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        <span className="text-[0.65rem] font-bold tracking-widest uppercase text-gray-400">
                                                            {new Date(mail.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <button
                                                            onClick={(e) => handleDelete(e, mail.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                                                            title="Move to trash"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <h4 className="font-medium text-gray-700 text-[0.9rem] mb-1.5 truncate">{mail.subject}</h4>
                                                <p className="text-[0.85rem] text-gray-500 line-clamp-2 leading-relaxed opacity-80">{mail.snippet}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {/* Pagination Button */}
                                {nextPageToken && !query && (
                                    <div className="p-8 flex justify-center">
                                        <button
                                            onClick={loadMoreEmails}
                                            disabled={loadingMore}
                                            className="px-8 py-3 rounded-full bg-white border border-gray-200 text-[0.8rem] font-bold text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all disabled:opacity-50"
                                        >
                                            {loadingMore ? 'Loading...' : 'Load Older Messages'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Smart selection floating action bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
                    <div className="glass-dark px-8 py-4 flex items-center gap-6 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/20 bg-black/80 backdrop-blur-xl">
                        <span className="text-white text-sm font-medium tracking-wide">
                            <strong className="text-[#a3c2ff]">{selectedIds.size}</strong> selected
                        </span>
                        <div className="w-px h-6 bg-white/20" />
                        <button onClick={analyzeSelected} className="flex items-center gap-2 text-sm font-bold tracking-wide text-white hover:text-[#c2a3ff] transition-all">
                            ✦ Analyze
                        </button>
                        <div className="w-px h-6 bg-white/20" />
                        <button onClick={handleBulkDelete} disabled={loading} className="flex items-center gap-2 text-sm font-bold tracking-wide text-white hover:text-red-400 transition-all">
                            🗑 Delete
                        </button>
                        <button onClick={clearSelection} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all ml-2">
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* New email FAB */}
            <button
                aria-label="Compose new email"
                onClick={() => setComposeOpen(true)}
                className="fixed bottom-10 right-10 z-[60] w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-[0_12px_32px_rgba(0,0,0,0.2)]"
                style={{ background: 'linear-gradient(180deg, #2a2a2a 0%, #111 100%)' }}
            >
                +
            </button>

            <ComposeModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />

            {/* Custom Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.open}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirm}
                danger={confirmModal.danger}
                confirmLabel={confirmModal.confirmLabel}
            />

            {/* Analysis Progress + Results Modal */}
            <AnalysisModal
                isOpen={analysisModal.open}
                onClose={closeAnalysis}
                progress={analysisModal.progress}
                total={analysisModal.total}
                currentSubject={analysisModal.currentSubject}
                results={analysisModal.results}
            />
        </div>
    );
}
