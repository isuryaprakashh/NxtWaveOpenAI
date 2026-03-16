import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ComposeModal from "../components/ComposeModal";
import { fetchInbox, fetchMessage, checkInbox, checkAuth } from "../services/api";

export default function InboxPage() {
    const navigate = useNavigate();
    const [emails, setEmails] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [query, setQuery] = useState("");
    const [sortOrder, setSortOrder] = useState("date_desc");
    const [analysisResults, setAnalysisResults] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [composeOpen, setComposeOpen] = useState(false);
    const [newEmailCount, setNewEmailCount] = useState(0);
    const [lastEmailId, setLastEmailId] = useState(null);

    useEffect(() => {
        const initInbox = async () => {
            // Check identity: clear stale cache if user changed
            try {
                const auth = await checkAuth();
                const currentUserId = auth.user_id;
                const cachedUserId = sessionStorage.getItem('odin_user_id');

                if (cachedUserId && cachedUserId !== currentUserId) {
                    // User changed — clear ALL stale cached data
                    sessionStorage.removeItem('odin_inbox_data');
                    sessionStorage.removeItem('odin_user_id');
                    // Clear any email draft keys from localStorage
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('email_draft_')) {
                            localStorage.removeItem(key);
                        }
                    });
                }

                // Store current user id for future comparisons
                if (currentUserId) {
                    sessionStorage.setItem('odin_user_id', currentUserId);
                }
            } catch { /* auth check failed, proceed normally */ }

            const cached = sessionStorage.getItem('odin_inbox_data');
            if (cached) {
                const parsed = JSON.parse(cached);
                setEmails(parsed);
                setInitialLoading(false);
                if (parsed.length > 0) setLastEmailId(parsed[0].id);
            } else {
                loadEmails();
            }
        };
        initInbox();
    }, []);

    useEffect(() => {
        const poll = setInterval(async () => {
            try {
                const result = await checkInbox();
                if (result.latest_id && lastEmailId && result.latest_id !== lastEmailId) {
                    setNewEmailCount(prev => prev + 1);
                }
            } catch { /* silent fail */ }
        }, 30000);
        return () => clearInterval(poll);
    }, [lastEmailId]);

    const loadEmails = async (isRefresh = false) => {
        if (!isRefresh) setInitialLoading(true);
        else setLoading(true);
        try {
            const data = await fetchInbox();
            if (data.messages) {
                setEmails(data.messages);
                sessionStorage.setItem('odin_inbox_data', JSON.stringify(data.messages));
                if (data.messages.length > 0) setLastEmailId(data.messages[0].id);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setInitialLoading(false);
            setLoading(false);
        }
    };

    const filteredEmails = useMemo(() => {
        let list = emails.filter(e =>
            (e.subject || "").toLowerCase().includes(query.toLowerCase()) ||
            (e.from || "").toLowerCase().includes(query.toLowerCase())
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

    const openMail = id => navigate(`/message/${id}`);
    const selectAll = () => setSelectedIds(new Set(filteredEmails.map(e => e.id)));
    const clearSelection = () => { setSelectedIds(new Set()); setShowDetail(false); setAnalysisResults(null); };

    const analyzeSelected = async () => {
        if (!selectedIds.size) return;
        setLoading(true);
        setShowDetail(true);
        setAnalysisResults(null);
        try {
            const results = await Promise.all([...selectedIds].map(id => fetchMessage(id)));
            setAnalysisResults(results);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const priorityColor = p => p === 'HIGH' ? 'bg-[#ffeceb] text-[#d93025]' : p === 'LOW' ? 'bg-[#e6f4ea] text-[#1e8e3e]' : 'bg-[#fef7e0] text-[#f29900]';

    return (
        <div className="bg-ethereal min-h-screen font-sans flex flex-col items-center">
            <Navbar />
            <div className="blob-3"></div>

            <div className="w-full max-w-4xl px-6 pt-32 pb-24 relative z-10 flex-col flex gap-8">
                
                {/* Minimalist Header */}
                <div className="flex flex-col items-center justify-center text-center animate-fade-up">
                    <h1 className="font-display text-5xl sm:text-6xl text-gray-900 mb-2" style={{ letterSpacing: '-0.04em' }}>
                        Inbox Intelligence
                    </h1>
                    <p className="text-[#6b6bf9] font-medium tracking-wide">
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
                            className="w-full glass border-0 pl-12 pr-6 py-4 text-[0.95rem] font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c2a3ff]/50 transition-all rounded-[32px]"
                            placeholder="Find people, subjects, or keywords..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between animate-fade-up delay-200 px-2">
                    <div className="flex gap-2">
                        <button onClick={selectAll} className="pill-badge text-[0.65rem] uppercase tracking-widest text-gray-500 hover:text-gray-900">
                            Select All
                        </button>
                        <button onClick={() => setSortOrder(o => o === 'date_desc' ? 'date_asc' : 'date_desc')} className="pill-badge text-[0.65rem] uppercase tracking-widest text-gray-500 hover:text-gray-900">
                            Sort: {sortOrder === 'date_desc' ? 'Newest' : 'Oldest'}
                        </button>
                        <button onClick={() => loadEmails(true)} disabled={loading} className="pill-badge text-[0.65rem] uppercase tracking-widest text-gray-500 hover:text-gray-900">
                            Refresh {loading && ' ↺'}
                        </button>
                    </div>
                </div>

                {/* Glass email list */}
                <div className="glass overflow-hidden animate-fade-up delay-300 backdrop-blur-3xl shadow-[0_12px_48px_rgba(0,0,0,0.06)] border border-white/60">
                    {initialLoading ? (
                        <div className="py-32 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-2 border-[#ff9b5e] border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="font-display text-2xl text-gray-400">Loading your world...</p>
                        </div>
                    ) : filteredEmails.length === 0 ? (
                        <div className="py-32 flex flex-col items-center justify-center text-center">
                            <span className="text-4xl mb-4 opacity-50">📭</span>
                            <p className="font-display text-2xl text-gray-400">Your inbox is clear.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-black/[0.04]">
                            {filteredEmails.map((mail, idx) => {
                                const selected = selectedIds.has(mail.id);
                                return (
                                    <div
                                        key={mail.id}
                                        className={`flex items-start gap-5 px-6 sm:px-8 py-6 cursor-pointer transition-all duration-300 hover:bg-white/40 ${
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
                                                <h3 className="font-semibold text-gray-900 text-[0.95rem] truncate pr-4">{mail.from}</h3>
                                                <span className="text-[0.65rem] font-bold tracking-widest uppercase text-gray-400 flex-shrink-0">
                                                    {new Date(mail.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <h4 className="font-medium text-gray-700 text-[0.9rem] mb-1.5 truncate">{mail.subject}</h4>
                                            <p className="text-[0.85rem] text-gray-500 line-clamp-2 leading-relaxed opacity-80">{mail.snippet}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Smart selection floating action bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
                    <div className="glass-dark px-8 py-4 flex items-center gap-6 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/20">
                        <span className="text-white text-sm font-medium tracking-wide">
                            <strong className="text-[#a3c2ff]">{selectedIds.size}</strong> selected
                        </span>
                        <div className="w-px h-6 bg-white/20" />
                        <button onClick={analyzeSelected} className="flex items-center gap-2 text-sm font-bold tracking-wide text-white hover:text-[#c2a3ff] transition-all">
                            ✦ Analyze with AI
                        </button>
                        <button onClick={clearSelection} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all ml-2">
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* New email FAB matching "Experience Sarvam" black button style */}
            <button
                onClick={() => setComposeOpen(true)}
                className="fixed bottom-10 right-10 z-50 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-[0_12px_32px_rgba(0,0,0,0.2)]"
                style={{ background: 'linear-gradient(180deg, #2a2a2a 0%, #111 100%)' }}
            >
                +
            </button>

            <ComposeModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />
        </div>
    );
}
