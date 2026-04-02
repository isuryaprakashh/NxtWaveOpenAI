import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { fetchMessage, fetchAnalysis, generateReply, sendReply as apiSendReply, deleteEmail } from "../services/api";
import { WS_URL } from "../config";
import { io } from "socket.io-client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MessagePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [mail, setMail] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [tone, setTone] = useState("professional");
    const [instructions, setInstructions] = useState("");
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false, confirmLabel: 'Confirm' });
    const [previewAtt, setPreviewAtt] = useState(null); // { filename, mimeType, url }

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const currentFolder = queryParams.get('folder') || 'inbox';
    const backPath = currentFolder === 'sent' ? '/sent' : '/inbox';

    const showConfirm = (title, message, onConfirm, opts = {}) => setConfirmModal({ open: true, title, message, onConfirm, danger: opts.danger || false, confirmLabel: opts.confirmLabel || 'Confirm' });
    const closeConfirm = () => setConfirmModal(prev => ({ ...prev, open: false }));

    const getAttUrl = (att) => `/api/attachment/${id}/${att.attachmentId}?filename=${encodeURIComponent(att.filename)}&mimeType=${encodeURIComponent(att.mimeType)}`;

    // Real-time AI analysis updates
    useEffect(() => {
        const socket = io(WS_URL, {
            withCredentials: true,
            transports: ["websocket"]
        });

        socket.on("connect", () => {
            console.log("📡 Message View: Real-time connected");
        });

        socket.on("analysis_complete", (data) => {
            if (data.id === id) {
                console.log("✨ AI Analysis finished in background!");
                setMail(prev => ({ ...prev, ...data, ai_loaded: true }));
                setAiLoading(false);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [id]);

    useEffect(() => {
        fetchMessage(id, { lazy: true })
            .then(data => {
                setMail(data);
                if (!data.ai_loaded && !data.summary) {
                    setAiLoading(true);
                    fetchAnalysis(id)
                        .then(aiData => setMail(prev => ({ ...prev, ...aiData })))
                        .catch(err => console.error("AI analysis failed:", err))
                        .finally(() => setAiLoading(false));
                }
            })
            .catch(err => console.error("Failed to load message:", err));

        const saved = localStorage.getItem(`email_draft_${id}`);
        if (saved) setDraft(saved);
    }, [id]);

    useEffect(() => {
        if (draft.trim()) {
            localStorage.setItem(`email_draft_${id}`, draft);
        } else {
            localStorage.removeItem(`email_draft_${id}`);
        }
    }, [draft, id]);

    const handleGenerateReply = async () => {
        setLoading(true);
        setStatus(null);
        try {
            const data = await generateReply(id, tone, instructions);
            if (data.error) throw new Error(data.error);
            setDraft(data.reply || data.draft || "");
            setStatus({ type: "success", msg: "Reply generated flawlessly." });
        } catch (e) {
            setStatus({ type: "error", msg: e.message });
        }
        setLoading(false);
    };

    const handleSendReply = () => {
        if (!draft.trim()) return;
        showConfirm('Send this reply?', 'Your message will be sent through Gmail. Attachment support coming soon for replies.', async () => {
            closeConfirm();
            setSending(true);
            try {
                const to = mail.headers?.['Reply-To'] || mail.sender;
                const data = await apiSendReply(id, draft, to, mail.subject);
                if (data.error) throw new Error(data.error);
                localStorage.removeItem(`email_draft_${id}`);
                setDraft('');
                setStatus({ type: "success", msg: "Reply sent successfully." });
            } catch (e) {
                setStatus({ type: "error", msg: e.message });
            } finally {
                setSending(false);
            }
        }, { confirmLabel: 'Send' });
    };

    const handleDeleteMessage = () => {
        showConfirm('Move to Trash?', `"${mail?.subject || 'This email'}" will be moved to your Gmail trash.`, async () => {
            closeConfirm();
            try {
                await deleteEmail(id);
                sessionStorage.removeItem('odin_inbox_data');
                navigate(backPath);
            } catch (err) {
                setStatus({ type: 'error', msg: 'Failed to delete: ' + err.message });
            }
        }, { danger: true, confirmLabel: 'Move to Trash' });
    };

    const priorityColors = {
        HIGH: 'bg-[#ffeceb] text-[#d93025]',
        MEDIUM: 'bg-[#fef7e0] text-[#f29900]',
        LOW: 'bg-[#e6f4ea] text-[#1e8e3e]',
    };

    if (!mail) {
        return (
            <div className="bg-ethereal min-h-screen font-sans">
                <Navbar />
                <div className="flex flex-col items-center justify-center pt-48 gap-6">
                    <div className="w-12 h-12 rounded-full border-[3px] border-[#a3c2ff] border-t-transparent animate-spin"></div>
                    <p className="font-display text-3xl tracking-tighter text-gray-500">Retrieving message...</p>
                </div>
            </div>
        );
    }

    const renderLineWithLinks = (text) => {
        // Match URLs properly, avoiding trailing brackets/parentheses often found in plain text emails
        const regex = /(https?:\/\/[^\s\]\)]+)/g;
        const parts = text.split(regex);
        return parts.map((part, i) => {
            if (part.match(regex)) {
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#6b6bf9] hover:text-[#a3c2ff] underline underline-offset-2 break-all">
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <div className="bg-ethereal min-h-screen font-sans relative">
            <Navbar />
            <div className="blob-3"></div>

            <div className="mx-auto max-w-6xl px-8 pt-28 pb-24 relative z-10">

                {/* Header row with back + delete */}
                <div className="flex items-center justify-between mb-10">
                    <button aria-label={`Return to ${currentFolder}`} onClick={() => navigate(backPath)} className="flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-widest text-[#a3c2ff] hover:text-[#7b9fef] transition-colors group">
                        <span className="transition-transform group-hover:-translate-x-1 text-lg leading-none">←</span>
                        Return to {currentFolder}
                    </button>
                    <button
                        aria-label="Delete message and move to trash"
                        onClick={handleDeleteMessage}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Move to trash"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>
                </div>

                {/* Hero Subject & Meta */}
                <div className="mb-8 animate-fade-up">
                    <h1 className="font-display text-[1.75rem] sm:text-[2.25rem] leading-[1.2] text-gray-900 mb-4 tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                        {mail.subject || "Untitled Message"}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4">
                        <span className="pill-badge !px-4 !py-2 !text-[0.7rem]">
                            <span className="text-gray-400 font-normal">{currentFolder === 'sent' ? 'To' : 'From'}</span>
                            <strong className="text-gray-900">{currentFolder === 'sent' ? mail.to : mail.sender}</strong>
                        </span>
                        {currentFolder === 'sent' && mail.sender && (
                             <span className="pill-badge !px-4 !py-2 !text-[0.7rem]">
                                <span className="text-gray-400 font-normal">From</span>
                                <strong className="text-gray-900">{mail.sender}</strong>
                            </span>
                        )}
                        {currentFolder !== 'sent' && mail.to && (
                             <span className="pill-badge !px-4 !py-2 !text-[0.7rem]">
                                <span className="text-gray-400 font-normal">To</span>
                                <strong className="text-gray-900">{mail.to}</strong>
                            </span>
                        )}
                        <span className="pill-badge !px-4 !py-2 !text-[0.7rem] !text-gray-500 font-medium">
                            {new Date(mail.date).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-8 animate-fade-up delay-100">
                        
                        {/* Summary Block */}
                        {(mail.summary || (aiLoading && !mail.summary)) && (
                            <div className="glass p-6 relative overflow-hidden">
                                {/* Subtle inner gradient for the summary block */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#c2a3ff]/20 to-transparent rounded-full blur-[40px] -mr-20 -mt-20 pointer-events-none"></div>
                                
                                <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-[#a3c2ff] mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#a3c2ff] animate-pulse"></span>
                                    Intelligence Brief
                                </h3>
                                
                                {mail.summary ? (
                                    <div className="markdown-body text-[1.05rem] text-gray-800 leading-relaxed font-medium">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1.5 marker:text-[#a3c2ff]" {...props} />,
                                                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1.5 marker:text-gray-400 font-bold" {...props} />,
                                                li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                                strong: ({node, ...props}) => <strong className="font-bold text-black" {...props} />,
                                                a: ({node, ...props}) => <a className="text-[#6b6bf9] hover:text-[#4b4be9] underline underline-offset-2 break-all font-semibold transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                                                h1: ({node, ...props}) => <h1 className="text-xl font-display font-bold text-black mb-4 mt-6 first:mt-0 tracking-tight" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="text-lg font-display font-bold text-gray-900 mb-3 mt-5 tracking-tight" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-[1.05rem] font-bold text-gray-800 mb-2 mt-4" {...props} />,
                                                code: ({node, inline, ...props}) => 
                                                    inline ? <code className="px-1.5 py-0.5 bg-gray-100 rounded-md text-[0.9rem] font-mono text-gray-800" {...props} /> 
                                                           : <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto text-[0.85rem] font-mono mb-4"><code {...props} /></pre>,
                                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-[#c2a3ff] pl-4 py-1 italic text-gray-600 bg-gray-50/50 rounded-r-lg mb-4" {...props} />
                                            }}
                                        >
                                            {Array.isArray(mail.summary) ? mail.summary.join("\n") : (mail.summary || "")}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="text-[1.05rem] text-gray-400 font-medium animate-pulse">
                                        Synthesizing context...
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Exact Message Body */}
                        <div className="glass !bg-white/90 p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                            {mail.body.includes('<') && mail.body.includes('>') ? (
                                <iframe
                                    title="Email Content"
                                    srcDoc={mail.body}
                                    className="w-full"
                                    style={{ minHeight: '400px', height: 'auto', border: 'none' }}
                                    sandbox="allow-same-origin"
                                    onLoad={(e) => {
                                        try {
                                            const h = e.target.contentWindow.document.body.scrollHeight;
                                            e.target.style.height = Math.max(h + 40, 400) + 'px';
                                        } catch { e.target.style.height = '600px'; }
                                    }}
                                />
                            ) : (
                                <div className="text-[0.95rem] leading-relaxed text-gray-800 font-medium opacity-90 break-words">
                                    {mail.body.split('\n\n').map((para, i) => (
                                        <p key={i} className="mb-6 last:mb-0">
                                            {para.split('\n').map((line, j) => (
                                                <span key={j}>{renderLineWithLinks(line)}{j < para.split('\n').length - 1 && <br />}</span>
                                            ))}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Attachments */}
                        {mail.attachments?.length > 0 && (
                            <div className="glass p-6">
                                <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-4">Attachments</h3>
                                <div className="flex flex-col gap-5">
                                    {mail.attachments.map((att, i) => {
                                        const url = getAttUrl(att);
                                        const ext = att.filename.split('.').pop().toLowerCase();
                                        const isImage = att.mimeType.startsWith('image/');
                                        const isPdf = att.mimeType === 'application/pdf';
                                        const isText = att.mimeType.startsWith('text/');

                                        return (
                                            <div key={i} className="rounded-2xl border border-gray-100 bg-white/60 overflow-hidden">
                                                {/* Inline Preview */}
                                                {isImage ? (
                                                    <div className="p-3 bg-gray-50/50">
                                                        <img src={url} alt={att.filename} className="w-full max-h-[400px] object-contain rounded-xl" />
                                                    </div>
                                                ) : isPdf ? (
                                                    <div className="p-3 bg-gray-50/50">
                                                        <iframe src={url} title={att.filename} className="w-full h-[350px] rounded-xl border border-gray-200" />
                                                    </div>
                                                ) : isText ? (
                                                    <div className="p-3 bg-gray-50/50">
                                                        <iframe src={url} title={att.filename} className="w-full h-[250px] rounded-xl border border-gray-200 bg-white" />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center py-8 bg-gray-50/50">
                                                        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                                                            <span className="text-sm font-bold text-gray-400 uppercase">{ext}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* File info + Download */}
                                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[0.85rem] font-semibold text-gray-900 truncate">{att.filename}</p>
                                                        <p className="text-[0.6rem] text-gray-400 font-medium">
                                                            {att.mimeType}{att.size ? ` · ${(att.size / 1024).toFixed(1)} KB` : ''}
                                                        </p>
                                                    </div>
                                                    <a
                                                        aria-label={`Download ${att.filename}`}
                                                        href={url}
                                                        download={att.filename}
                                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-[0.75rem] font-bold hover:bg-black transition-all flex-shrink-0 ml-3"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                                                        </svg>
                                                        Download
                                                    </a>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar / AI Agent Tools */}
                    <div className="glass p-8 animate-fade-up delay-200 sticky top-32">
                        
                        {/* Meta Tags */}
                        {(!aiLoading && (mail.priority || mail.sentiment || mail.category)) && (
                            <div className="mb-8 pb-8 border-b border-gray-200/50">
                                <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-4">Metadata Analysis</h3>
                                <div className="flex flex-col gap-3">
                                    {mail.priority && (
                                        <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${priorityColors[mail.priority]}`}>
                                            <span className="text-[0.65rem] font-bold uppercase tracking-widest opacity-80">Priority</span>
                                            <span className="text-[0.75rem] font-bold tracking-widest">{mail.priority}</span>
                                        </div>
                                    )}
                                    {mail.sentiment && (
                                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 text-gray-600 border border-gray-100">
                                            <span className="text-[0.65rem] font-bold uppercase tracking-widest opacity-60">Sentiment</span>
                                            <span className="text-[0.75rem] font-bold tracking-widest capitalize">{mail.sentiment}</span>
                                        </div>
                                    )}
                                    {mail.category && (
                                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#c2a3ff]/10 text-[#7a48df] border border-[#c2a3ff]/30">
                                            <span className="text-[0.65rem] font-bold uppercase tracking-widest opacity-80">Category</span>
                                            <span className="text-[0.75rem] font-bold tracking-widest uppercase">{mail.category}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-[#ff9b5e] mb-5">AI Composer</h3>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-2">Voice / Tone</label>
                                <select
                                    value={tone}
                                    onChange={e => setTone(e.target.value)}
                                    className="w-full glass !bg-white/60 border-0 px-4 py-3 text-[0.85rem] font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#ff9b5e]/50 transition-all rounded-xl"
                                >
                                    <option>Professional</option>
                                    <option>Friendly</option>
                                    <option>Concise</option>
                                    <option>Formal</option>
                                    <option>Empathetic</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-2">Directives</label>
                                <textarea
                                    value={instructions}
                                    onChange={e => setInstructions(e.target.value)}
                                    className="w-full glass !bg-white/60 border-0 px-4 py-3 text-[0.85rem] font-medium text-gray-700 outline-none focus:ring-2 focus:ring-[#ff9b5e]/50 transition-all rounded-xl resize-none"
                                    rows={2}
                                    placeholder="Optional instructions..."
                                />
                            </div>

                            <button
                                onClick={handleGenerateReply}
                                disabled={loading}
                                className="w-full btn-primary !py-3 justify-center text-[0.85rem] disabled:opacity-50"
                            >
                                {loading ? 'Synthesizing...' : 'Generate Response'}
                            </button>

                            <div className="pt-4">
                                <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[#c2a3ff] mb-2">Draft</label>
                                <textarea
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    className="w-full glass !bg-white/80 border border-[#c2a3ff]/20 px-4 py-4 text-[0.85rem] leading-relaxed font-medium text-gray-800 outline-none focus:ring-2 focus:ring-[#c2a3ff]/50 transition-all rounded-xl resize-none shadow-inner"
                                    rows={8}
                                />
                            </div>

                            {draft.trim() && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSendReply}
                                        disabled={sending}
                                        className="flex-1 btn-primary !bg-none !bg-[#111] hover:!bg-black !py-3 justify-center text-[0.85rem] disabled:opacity-50 !shadow-none"
                                    >
                                        {sending ? 'Sending...' : 'Send'}
                                    </button>
                                </div>
                            )}

                            {status && (
                                <div className={`px-4 py-3 rounded-xl text-[0.75rem] font-bold tracking-wide flex items-center gap-2 ${
                                    status.type === 'success' ? 'bg-[#e6f4ea] text-[#1e8e3e]' : 'bg-[#ffeceb] text-[#d93025]'
                                }`}>
                                    {status.msg}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Attachment Preview Modal */}
            {previewAtt && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setPreviewAtt(null)} />
                    <div className="relative glass !rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.2)] border border-white/80 w-full max-w-3xl max-h-[85vh] flex flex-col animate-fade-up overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-[#a3c2ff]/20 text-[#6b6bf9] flex items-center justify-center font-bold text-xs uppercase tracking-wider flex-shrink-0">
                                    {previewAtt.filename.split('.').pop().substring(0,3)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[0.9rem] font-semibold text-gray-900 truncate">{previewAtt.filename}</p>
                                    <p className="text-[0.65rem] text-gray-400 font-medium">
                                        {previewAtt.mimeType}{previewAtt.size ? ` • ${(previewAtt.size / 1024).toFixed(1)} KB` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <a
                                    href={previewAtt.url}
                                    download={previewAtt.filename}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-[0.8rem] font-bold hover:bg-black transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                                    </svg>
                                    Download
                                </a>
                                <button onClick={() => setPreviewAtt(null)} className="w-9 h-9 rounded-full bg-black/[0.03] hover:bg-black/[0.08] transition-colors flex items-center justify-center text-gray-400 hover:text-gray-900">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        {/* Preview Content */}
                        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-gray-50/50 min-h-[300px]">
                            {previewAtt.mimeType.startsWith('image/') ? (
                                <img src={previewAtt.url} alt={previewAtt.filename} className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg" />
                            ) : previewAtt.mimeType === 'application/pdf' ? (
                                <iframe src={previewAtt.url} title={previewAtt.filename} className="w-full h-[65vh] rounded-xl border border-gray-200" />
                            ) : previewAtt.mimeType.startsWith('text/') ? (
                                <iframe src={previewAtt.url} title={previewAtt.filename} className="w-full h-[65vh] rounded-xl border border-gray-200 bg-white" />
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gray-100 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-400 uppercase">{previewAtt.filename.split('.').pop()}</span>
                                    </div>
                                    <p className="text-gray-900 font-semibold mb-1">{previewAtt.filename}</p>
                                    <p className="text-sm text-gray-400 mb-6">Preview not available for this file type</p>
                                    <a
                                        href={previewAtt.url}
                                        download={previewAtt.filename}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white text-[0.85rem] font-bold hover:bg-black transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                                        </svg>
                                        Download File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-fade-in">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={closeConfirm} />
                    <div className="relative glass !rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.15)] border border-white/80 px-8 py-8 max-w-sm w-full animate-fade-up">
                        <h3 className="font-display text-xl tracking-tight text-gray-900 mb-2">{confirmModal.title}</h3>
                        <p className="text-[0.9rem] text-gray-500 mb-6 leading-relaxed">{confirmModal.message}</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={closeConfirm} className="px-5 py-2.5 rounded-xl text-[0.85rem] font-semibold text-gray-500 hover:bg-gray-100 transition-all">
                                Cancel
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`px-5 py-2.5 rounded-xl text-[0.85rem] font-bold text-white transition-all ${
                                    confirmModal.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-900 hover:bg-black'
                                }`}
                            >
                                {confirmModal.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
