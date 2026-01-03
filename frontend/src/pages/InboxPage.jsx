import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ComposeModal from "../components/ComposeModal";
import { fetchInbox, fetchMessage, checkInbox } from "../services/api";

export default function Inbox() {
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


    // Load emails from API on mount
    useEffect(() => {
        // Check cache first for instant load
        const cached = sessionStorage.getItem('odin_inbox_data');
        if (cached) {
            setEmails(JSON.parse(cached));
            setInitialLoading(false);
            // Track last email ID for polling
            const parsedCache = JSON.parse(cached);
            if (parsedCache.length > 0) {
                setLastEmailId(parsedCache[0].id);
            }
        } else {
            loadEmails();
        }
    }, []);

    // Polling for new emails every 30 seconds
    useEffect(() => {
        const pollInterval = setInterval(async () => {
            try {
                const result = await checkInbox();
                if (result.latest_id && lastEmailId && result.latest_id !== lastEmailId) {
                    setNewEmailCount(prev => prev + 1);
                }
            } catch (err) {
                console.log('Polling check failed:', err);
            }
        }, 30000); // 30 seconds

        return () => clearInterval(pollInterval);
    }, [lastEmailId]);

    const loadEmails = async (isRefresh = false) => {
        if (!isRefresh) setInitialLoading(true);
        else setLoading(true); // Show local loading state if refreshing

        try {
            const data = await fetchInbox();
            if (data.messages) {
                setEmails(data.messages);
                sessionStorage.setItem('odin_inbox_data', JSON.stringify(data.messages));
            }
        } catch (error) {
            console.error("Failed to load inbox:", error);
        } finally {
            setInitialLoading(false);
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        loadEmails(true);
    };

    const filteredEmails = useMemo(() => {
        let list = emails.filter(e =>
            (e.subject || "").toLowerCase().includes(query.toLowerCase()) ||
            (e.from || "").toLowerCase().includes(query.toLowerCase())
        );

        list.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === "date_desc" ? dateB - dateA : dateA - dateB;
        });

        return list;
    }, [emails, query, sortOrder]);

    const toggleSelect = id => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const openMail = id => {
        navigate(`/message/${id}`);
    };

    const selectAll = () => setSelectedIds(new Set(filteredEmails.map(e => e.id)));

    const clearSelection = () => {
        setSelectedIds(new Set());
        setShowDetail(false);
        setAnalysisResults(null);
    };

    const analyzeSelected = async () => {
        if (!selectedIds.size) return alert("Select at least one email");
        setLoading(true);
        setShowDetail(true);
        setAnalysisResults(null);

        try {
            const results = await Promise.all(
                [...selectedIds].map(id => fetchMessage(id))
            );
            setAnalysisResults(results);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <Navbar />

            <div className="mx-auto max-w-6xl px-8 py-8">
                {/* Search & Refresh */}
                <div className="mx-auto mb-10 max-w-3xl flex gap-4">
                    <div className="relative flex-1">
                        <input
                            className="w-full rounded-xl border px-12 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                            placeholder="Search emails..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={loading || initialLoading}
                        className={`px-6 py-3 rounded-xl border bg-white shadow-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-all ${loading ? 'opacity-75' : ''}`}
                        title="Refresh Inbox"
                    >
                        <span className={loading ? "animate-spin" : ""}>🔄</span>
                        Refresh
                    </button>
                </div>

                {/* Stats */}
                <div className="mb-8 grid grid-cols-2 gap-4">
                    <Stat label="Total Emails" value={filteredEmails.length} />
                    <Stat label="Selected" value={selectedIds.size} active={selectedIds.size > 0} />
                </div>

                {/* Inbox List */}
                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                    {initialLoading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                            <div className="text-2xl animate-spin">⏳</div>
                            <div>Loading your inbox...</div>
                        </div>
                    ) : filteredEmails.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <div className="mb-2 text-2xl">📭</div>
                            No emails found
                        </div>
                    ) : (
                        filteredEmails.map(mail => {
                            const selected = selectedIds.has(mail.id);
                            return (
                                <div
                                    key={mail.id}
                                    className={`flex gap-4 p-6 border-b cursor-pointer transition-all animate-in slide-in-from-bottom-2 duration-500
                    ${selected ? "bg-gray-50" : "hover:bg-gray-50 hover:shadow-sm"}`}
                                    onClick={() => openMail(mail.id)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() => toggleSelect(mail.id)}
                                        onClick={e => e.stopPropagation()}
                                        className="mt-1 h-5 w-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <div className="mb-1 flex justify-between items-center">
                                            <span className="font-semibold text-gray-900">{mail.from}</span>
                                            <span className="text-sm text-gray-400">{mail.date}</span>
                                        </div>
                                        <h3 className="font-medium text-gray-800 mb-1">{mail.subject}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-1">{mail.snippet}</p>

                                        {mail.has_attachments && (
                                            <div className="mt-2 flex gap-2">
                                                {mail.attachments?.slice(0, 3).map((att, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 border border-gray-200">
                                                        📎 {att.filename?.length > 20 ? att.filename.substring(0, 20) + '...' : att.filename}
                                                    </span>
                                                ))}
                                                {mail.attachments?.length > 3 && <span className="text-xs text-gray-400 self-center">+{mail.attachments.length - 3} more</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Floating Action Bar */}
                {selectedIds.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-4 rounded-xl bg-black px-6 py-3 shadow-xl items-center animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <span className="text-white text-sm font-medium">{selectedIds.size} selected</span>
                        <div className="h-4 w-px bg-gray-700"></div>
                        <button onClick={analyzeSelected} className="text-sm font-semibold text-white hover:text-gray-200 transition-colors">
                            Analyze
                        </button>
                        <button onClick={clearSelection} className="text-sm text-gray-400 hover:text-white transition-colors">
                            Clear
                        </button>
                    </div>
                )}

                {/* Analysis Panel */}
                {showDetail && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none p-4">
                        <div className="pointer-events-auto bg-white border shadow-2xl rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300 ring-1 ring-black/5">
                            <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                                <h2 className="text-xl font-bold tracking-tight">AI Analysis Results</h2>
                                <button onClick={() => setShowDetail(false)} className="rounded-full p-2 hover:bg-gray-100 transition-colors text-gray-500">
                                    ✕
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto bg-gray-50">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4 text-gray-500">
                                        <div className="animate-spin text-2xl">⏳</div>
                                        <span className="font-medium">ODIN is analyzing {selectedIds.size} emails...</span>
                                    </div>
                                ) : analysisResults ? (
                                    <div className="space-y-6">
                                        {analysisResults.map((d, i) => (
                                            <div key={d.id || i} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                                                <h3 className="font-bold text-lg mb-4 text-gray-900">{d.subject || "No Subject"}</h3>

                                                <div className="flex gap-3 mb-4 flex-wrap">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${d.priority === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        d.priority === 'LOW' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                        {d.priority || 'Medium'}
                                                    </span>
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${d.sentiment === 'positive' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        d.sentiment === 'negative' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            'bg-gray-50 text-gray-700 border-gray-200'
                                                        }`}>
                                                        {d.sentiment || 'Neutral'}
                                                    </span>
                                                </div>

                                                <div className="bg-gray-50 rounded-lg p-5 text-sm text-gray-700 leading-relaxed border border-gray-100">
                                                    {d.summary}
                                                </div>

                                                {d.extracted_info?.action_items?.length > 0 && (
                                                    <div className="mt-5">
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Action Items</h4>
                                                        <ul className="space-y-2">
                                                            {d.extracted_info.action_items.map((item, idx) => (
                                                                <li key={idx} className="flex gap-2 text-sm text-gray-700">
                                                                    <span className="text-blue-500">•</span>
                                                                    {item}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-red-500">Failed to load analysis.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Compose Button (FAB) */}
            <button
                onClick={() => setComposeOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-black text-white rounded-full shadow-xl hover:bg-gray-800 transition-all hover:scale-110 flex items-center justify-center"
                title="Compose new email"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {/* New Email Notification Badge */}
            {newEmailCount > 0 && (
                <div
                    className="fixed top-20 right-6 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in cursor-pointer"
                    onClick={() => {
                        setNewEmailCount(0);
                        loadEmails(true);
                    }}
                >
                    <span>📬</span>
                    <span className="font-medium">{newEmailCount} new email{newEmailCount > 1 ? 's' : ''}</span>
                    <span className="text-blue-200">Click to refresh</span>
                </div>
            )}

            {/* Compose Modal */}
            <ComposeModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />
        </div>
    );
}

function Stat({ label, value, active }) {
    return (
        <div className={`rounded-xl border p-6 text-center shadow-sm transition-colors ${active ? "bg-black text-white border-black" : "bg-white border-gray-200"}`}>
            <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
            <p className={`text-sm font-medium uppercase tracking-wider mt-1 ${active ? "text-gray-400" : "text-gray-500"}`}>{label}</p>
        </div>
    );
}
