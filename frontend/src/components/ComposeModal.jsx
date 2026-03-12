import { useState } from 'react';
import { composeEmail } from '../services/api';

export default function ComposeModal({ isOpen, onClose }) {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        setStatus(null);
        try {
            const result = await composeEmail(to, subject, body);
            if (result.error) throw new Error(result.error);
            setStatus({ type: 'success', msg: 'Dispatch confirmed.' });
            setTimeout(() => {
                setTo(''); setSubject(''); setBody('');
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
                className="absolute inset-0 bg-[#fdfdfc]/60 backdrop-blur-3xl"
                onClick={handleClose}
            />

            {/* Modal Box */}
            <div className="relative w-full max-w-2xl glass !rounded-[40px] shadow-[0_32px_100px_rgba(0,0,0,0.12)] border border-white/80 animate-fade-up px-12 py-10">
                
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

                    <div className="group border-b border-black/[0.04] focus-within:border-[#c2a3ff] transition-colors pb-4 h-48">
                        <label className="block text-[0.55rem] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Message Body</label>
                        <textarea
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            placeholder="Type your message..."
                            className="w-full h-full bg-transparent border-0 p-0 text-[0.95rem] font-medium text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-0 resize-none leading-relaxed"
                            required
                            disabled={sending}
                        />
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
                            {sending ? 'Dispatching Protocol...' : 'Dispatch Protocol →'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
