import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { fetchMessage, fetchAnalysis, generateReply, sendReply as apiSendReply } from "../services/api";

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
        if (draft.trim()) localStorage.setItem(`email_draft_${id}`, draft);
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

    const handleSendReply = async () => {
        if (!draft.trim()) return;
        if (!window.confirm("Confirm sending this reply?")) return;
        setSending(true);
        try {
            const to = mail.headers?.['Reply-To'] || mail.sender;
            const data = await apiSendReply(id, draft, to, mail.subject);
            if (data.error) throw new Error(data.error);
            localStorage.removeItem(`email_draft_${id}`);
            setDraft('');
            setStatus({ type: "success", msg: "Reply dispatched securely." });
        } catch (e) {
            setStatus({ type: "error", msg: e.message });
        } finally {
            setSending(false);
        }
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

    return (
        <div className="bg-ethereal min-h-screen font-sans relative">
            <Navbar />
            <div className="blob-3"></div>

            <div className="mx-auto max-w-4xl px-8 pt-32 pb-24 relative z-10">

                {/* Ultra-minimal back button */}
                <button onClick={() => navigate('/inbox')} className="flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-widest text-[#a3c2ff] hover:text-[#7b9fef] transition-colors mb-10 group">
                    <span className="transition-transform group-hover:-translate-x-1 text-lg leading-none">←</span>
                    Return to Inbox
                </button>

                {/* Hero Subject & Meta */}
                <div className="mb-12 animate-fade-up">
                    <h1 className="font-display text-[3.5rem] sm:text-[4.5rem] leading-[1.05] text-gray-900 mb-6 tracking-tight" style={{ letterSpacing: '-0em' }}>
                        {mail.subject || "Untitled Message"}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4">
                        <span className="pill-badge !px-4 !py-2 !text-[0.7rem]">
                            <span className="text-gray-400 font-normal">From</span>
                            <strong className="text-gray-900">{mail.sender}</strong>
                        </span>
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
                            <div className="glass p-8 relative overflow-hidden">
                                {/* Subtle inner gradient for the summary block */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#c2a3ff]/20 to-transparent rounded-full blur-[40px] -mr-20 -mt-20 pointer-events-none"></div>
                                
                                <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-[#a3c2ff] mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#a3c2ff] animate-pulse"></span>
                                    Intelligence Brief
                                </h3>
                                
                                {mail.summary ? (
                                    <p className="text-[1.05rem] text-gray-800 leading-relaxed font-medium">
                                        {mail.summary}
                                    </p>
                                ) : (
                                    <div className="text-[1.05rem] text-gray-400 font-medium animate-pulse">
                                        Synthesizing context...
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Exact Message Body */}
                        <div className="glass !bg-white/90 p-10 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
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
                                <div className="text-[0.95rem] leading-relaxed text-gray-800 font-medium opacity-90">
                                    {mail.body.split('\n\n').map((para, i) => (
                                        <p key={i} className="mb-6 last:mb-0">
                                            {para.split('\n').map((line, j) => (
                                                <span key={j}>{line}{j < para.split('\n').length - 1 && <br />}</span>
                                            ))}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Attachments */}
                        {mail.attachments?.length > 0 && (
                            <div className="glass p-8">
                                <h3 className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-5">Attachments</h3>
                                <div className="flex flex-col gap-3">
                                    {mail.attachments.map((att, i) => (
                                        <a key={i}
                                            href={`/api/attachment/${id}/${att.attachmentId}?filename=${encodeURIComponent(att.filename)}&mimeType=${encodeURIComponent(att.mimeType)}`}
                                            target="_blank" rel="noreferrer"
                                            className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white/50 hover:bg-white transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs uppercase tracking-wider group-hover:bg-[#a3c2ff] group-hover:text-white transition-colors">
                                                {att.filename.split('.').pop().substring(0,3)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[0.9rem] font-semibold text-gray-900 truncate">{att.filename}</p>
                                                <p className="text-[0.65rem] font-bold tracking-widest text-[#a3c2ff] uppercase mt-1">View / Download</p>
                                            </div>
                                        </a>
                                    ))}
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
                                        {sending ? 'Dispatching...' : 'Dispatch Reply'}
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
        </div>
    );
}
