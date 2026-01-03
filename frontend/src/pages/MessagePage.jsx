import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { fetchMessage, generateReply, sendReply as apiSendReply } from "../services/api";

// Single Email View – React version of your HTML
// Uses user-provided theme with shared Navbar and API service

export default function MessagePage() {
    const { id } = useParams();
    const [mail, setMail] = useState(null);
    const [tone, setTone] = useState("professional");
    const [instructions, setInstructions] = useState("");
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    // Fetch mail
    useEffect(() => {
        // Use our API service which handles this endpoint
        fetchMessage(id)
            .then(data => setMail(data))
            .catch(err => console.error("Failed to load message:", err));

        const savedDraft = localStorage.getItem(`email_draft_${id}`);
        if (savedDraft) setDraft(savedDraft);
    }, [id]);

    useEffect(() => {
        if (draft.trim()) {
            localStorage.setItem(`email_draft_${id}`, draft);
        }
    }, [draft, id]);

    const handleGenerateReply = async () => {
        setLoading(true);
        setStatus(null);
        try {
            // Use API service
            const data = await generateReply(id, tone, instructions);
            if (data.error) throw new Error(data.error);
            setDraft(data.reply || data.draft || "");
            setStatus({ type: "success", msg: "Reply generated" });
        } catch (e) {
            setStatus({ type: "error", msg: e.message });
        }
        setLoading(false);
    };

    const handleSendReply = async () => {
        if (!draft.trim()) return;
        if (!window.confirm("Send this reply?")) return;

        try {
            // Use API service
            // Note: User's code sent { reply_text: draft }
            // My API service signature is sendReply(id, replyText, to, subject)
            // I should check if I need 'to' and 'subject'. The backend handles it?
            // Step 375 api.js had `sendReply: (id, replyText)`.
            // Step 475 api.js update had `sendReply(id, replyText, to, subject)`.
            // I should extract 'to' and 'subject' from 'mail' state.

            const to = mail.headers?.['Reply-To'] || mail.from; // Simplified logic
            const subject = mail.subject;

            // Ensure API service matches backend expectation.
            // Flask /send_reply/<message_id> expects 'reply_text'. ('to' and 'subject' might be optional or inferred if backend logic exists, but let's pass them if api service demands)
            // Actually backend `app.py` /send_reply implementation:
            // data = request.json; reply_text = data.get('reply_text')
            // It creates draft/sends using Gmail API.
            // Let's pass what we have.

            const data = await apiSendReply(id, draft, to, subject);

            if (data.error) throw new Error(data.error);
            localStorage.removeItem(`email_draft_${id}`);
            setStatus({ type: "success", msg: "Reply sent successfully" });

            // Navigate back after delay? User code didn't have it, so I'll leave it out to match "theme".
        } catch (e) {
            setStatus({ type: "error", msg: e.message });
        }
    };

    if (!mail) {
        return (
            <div className="min-h-screen bg-gray-100 font-sans">
                <Navbar />
                <div className="p-10 text-center text-gray-500">Loading email…</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <Navbar />

            <div className="mx-auto max-w-3xl px-6 py-8">
                {/* Mail Card */}
                <div className="rounded-xl border bg-white p-8 shadow-sm animate-in slide-in-from-bottom-2 duration-500">
                    <h1 className="mb-4 text-2xl font-semibold text-gray-900">{mail.subject || "No Subject"}</h1>

                    <div className="mb-4 text-sm text-gray-500 flex justify-between items-start">
                        <div>
                            <strong>From:</strong> {mail.from}<br />
                            <strong>Date:</strong> {mail.date}
                        </div>
                    </div>

                    {/* Badges */}
                    <div className="mb-6 flex flex-wrap gap-2">
                        {mail.priority && <Badge>{mail.priority}</Badge>}
                        {mail.sentiment && <Badge>{mail.sentiment}</Badge>}
                        {mail.category && <Badge>{mail.category}</Badge>}
                    </div>

                    {mail.summary && (
                        <Section title="Summary">
                            <div className="rounded-lg bg-gray-50 p-4 text-sm leading-relaxed border border-gray-100">{mail.summary}</div>
                        </Section>
                    )}

                    {mail.extracted_info?.action_items?.length > 0 && (
                        <Section title="Action Items">
                            <div className="rounded-lg bg-blue-50 p-4 text-sm border border-blue-100">
                                <ul className="list-disc list-inside space-y-1 text-blue-900">
                                    {mail.extracted_info.action_items.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </Section>
                    )}

                    {mail.body && (
                        <Section title="Email Body">
                            <div className="max-h-96 overflow-y-auto rounded-lg bg-gray-50 p-4 text-sm whitespace-pre-wrap border border-gray-100 text-gray-800">
                                {mail.body}
                            </div>
                        </Section>
                    )}

                    {mail.attachments && mail.attachments.length > 0 && (
                        <Section title="Attachments">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {mail.attachments.map((att, i) => (
                                    <a
                                        key={i}
                                        href={`/api/attachment/${id}/${att.attachmentId}?filename=${encodeURIComponent(att.filename)}&mimeType=${encodeURIComponent(att.mimeType)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-all hover:bg-gray-50"
                                    >
                                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                                            📎
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium text-gray-900 truncate">{att.filename}</div>
                                            <div className="text-xs text-gray-500 uppercase">{att.mimeType.split('/').pop()}</div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>

                {/* Reply */}
                <div className="mt-6 rounded-xl border bg-white p-8 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Compose Reply</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">Tone</label>
                            <select
                                value={tone}
                                onChange={e => setTone(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                            >
                                <option>professional</option>
                                <option>friendly</option>
                                <option>concise</option>
                                <option>formal</option>
                                <option>empathetic</option>
                            </select>
                        </div>

                        {/* Quick Replies Buttons could go here if data available */}
                    </div>

                    <label className="mb-1 block text-sm font-semibold text-gray-700">Instructions</label>
                    <textarea
                        value={instructions}
                        onChange={e => setInstructions(e.target.value)}
                        className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all"
                        rows={2}
                        placeholder="E.g., mentioning specific dates or details..."
                    />

                    <button
                        onClick={handleGenerateReply}
                        disabled={loading}
                        className="mb-6 rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full md:w-auto"
                    >
                        {loading ? "Generating..." : "✨ Generate Reply with AI"}
                    </button>

                    <label className="mb-1 block text-sm font-semibold text-gray-700">Draft</label>
                    <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all font-mono text-sm"
                        rows={10}
                        placeholder="Your reply will appear here..."
                    />

                    {draft.trim() && (
                        <div className="mt-6 flex gap-3">
                            <button onClick={handleSendReply} className="rounded-lg bg-green-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors shadow-sm">
                                Send Reply
                            </button>
                            <button onClick={() => setDraft("")} className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
                                Clear
                            </button>
                        </div>
                    )}

                    {status && (
                        <div
                            className={`mt-4 rounded-lg p-3 text-sm flex items-center gap-2 ${status.type === "success"
                                ? "bg-green-50 text-green-700 border border-green-100"
                                : "bg-red-50 text-red-700 border border-red-100"}`}
                        >
                            <span>{status.type === 'success' ? '✅' : '⚠️'}</span>
                            {status.msg}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="mb-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">{title}</h3>
            {children}
        </div>
    );
}

function Badge({ children }) {
    // Determine color based on content text simply
    let colorClass = "bg-gray-100 text-gray-700 border-gray-200";
    const text = String(children).toLowerCase();

    if (text === 'high' || text === 'negative' || text === 'urgent') colorClass = "bg-red-50 text-red-700 border-red-200";
    else if (text === 'positive' || text === 'low') colorClass = "bg-green-50 text-green-700 border-green-200";
    else if (text === 'medium') colorClass = "bg-amber-50 text-amber-700 border-amber-200";

    return (
        <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${colorClass}`}>
            {children}
        </span>
    );
}
