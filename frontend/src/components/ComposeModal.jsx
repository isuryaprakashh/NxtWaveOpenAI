import { useState, useRef } from 'react';
import { composeEmail } from '../services/api';

export default function ComposeModal({ isOpen, onClose }) {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (upload) => {
                setAttachments(prev => [...prev, {
                    filename: file.name,
                    content: upload.target.result,
                    size: file.size,
                    type: file.type
                }]);
            };
            reader.readAsDataURL(file);
        });
        // Reset input
        e.target.value = '';
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        setStatus(null);
        try {
            // Map attachments to just filename and content for API
            const apiAttachments = attachments.map(a => ({
                filename: a.filename,
                content: a.content
            }));
            const result = await composeEmail(to, subject, body, apiAttachments);
            if (result.error) throw new Error(result.error);
            setStatus({ type: 'success', msg: 'Sent successfully!' });
            setTimeout(() => {
                setTo(''); setSubject(''); setBody(''); setAttachments([]);
                setStatus(null); onClose();
            }, 1500);
        } catch (err) {
            setStatus({ type: 'error', msg: err.message });
        } finally {
            setSending(false);
        }
    };

    const handleClose = () => {
        if (sending) return;
        setStatus(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
            {/* Ultra-frosted Backdrop */}
            <div
                className="absolute inset-0 bg-[#fdfdfc]/80 backdrop-blur-3xl"
                onClick={handleClose}
            />

            {/* Modal Box */}
            <div className="relative w-full max-w-2xl glass !rounded-[40px] shadow-[0_40px_120px_rgba(0,0,0,0.18)] border border-white animate-fade-up px-12 py-10 max-h-[90vh] overflow-y-auto">
                
                {/* Minimalist Header */}
                <div className="flex items-center justify-between mb-10">
                    <h2 className="font-display text-4xl tracking-tighter text-gray-900 leading-none">
                        Compose
                    </h2>
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 rounded-full bg-black/[0.03] hover:bg-black/[0.08] transition-colors flex items-center justify-center text-gray-400 hover:text-gray-900"
                        disabled={sending}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {[
                        { label: 'Recipient', type: 'email', value: to, set: setTo, placeholder: 'name@domain.com' },
                        { label: 'Subject', type: 'text', value: subject, set: setSubject, placeholder: 'Regarding your inquiry...' },
                    ].map(({ label, type, value, set, placeholder }) => (
                        <div key={label} className="group border-b border-black/[0.04] focus-within:border-[#c2a3ff] transition-colors pb-4">
                            <label className="block text-[0.55rem] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">{label}</label>
                            <input
                                type={type}
                                value={value}
                                onChange={e => set(e.target.value)}
                                placeholder={placeholder}
                                className="w-full bg-transparent border-0 p-0 text-[1.05rem] font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-0"
                                required
                                disabled={sending}
                            />
                        </div>
                    ))}

                    <div className="group transition-colors">
                        <label className="block text-[0.55rem] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Message Body</label>
                        <div className="bg-gray-50/50 rounded-2xl border border-black/[0.03] focus-within:border-[#c2a3ff] focus-within:bg-white transition-all p-4 h-48">
                            <textarea
                                value={body}
                                onChange={e => setBody(e.target.value)}
                                placeholder="Type your message..."
                                className="w-full h-full bg-transparent border-0 p-0 text-[0.95rem] font-medium text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-0 resize-none leading-relaxed"
                                required
                                disabled={sending}
                            />
                        </div>
                    </div>

                    {/* Attachments UI */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-[0.55rem] font-bold uppercase tracking-[0.2em] text-gray-400">Attachments</label>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={sending}
                                className="text-[0.65rem] font-bold text-[#6b6bf9] hover:text-[#4b4be9] uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                Attach Files
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                multiple
                            />
                        </div>

                        {attachments.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {attachments.map((file, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-black/[0.03] animate-fade-in">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                                                {file.type.startsWith('image/') ? (
                                                    <img src={file.content} className="w-6 h-6 object-cover rounded" alt="" />
                                                ) : (
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[0.7rem] font-bold text-gray-700 truncate">{file.filename}</p>
                                                <p className="text-[0.6rem] text-gray-400 font-medium">{Math.round(file.size / 1024)} KB</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(i)}
                                            className="p-1.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status Feedback */}
                    {status && (
                        <div className={`px-4 py-3 rounded-2xl text-[0.75rem] font-bold tracking-wide flex items-center gap-2 ${
                            status.type === 'success'
                                ? 'bg-[#e6f4ea] text-[#1e8e3e]'
                                : 'bg-[#ffeceb] text-[#d93025]'
                        }`}>
                            {status.msg}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end pt-6">
                        <button
                            type="submit"
                            disabled={sending || !to || !subject || !body}
                            className="w-full btn-primary !py-4 !rounded-full !text-[0.9rem] disabled:opacity-40 disabled:cursor-not-allowed justify-center shadow-xl hover:shadow-2xl"
                        >
                            {sending ? 'Sending...' : 'Send →'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
