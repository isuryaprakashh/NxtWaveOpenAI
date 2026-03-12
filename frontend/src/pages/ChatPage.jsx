import { useState, useRef, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { sendChatQuery } from '../services/api';

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const result = await sendChatQuery(userMessage);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: result.response || result.answer || 'No response',
                sources: result.sources || []
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Systems failed: ${err.message}`,
                isError: true
            }]);
        } finally {
            setLoading(false);
        }
    }

    const starters = [
        "Synthesize yesterday's updates",
        "Locate urgent matters",
        "Extract critical action items",
    ];

    return (
        <div className="bg-ethereal min-h-screen flex flex-col font-sans relative">
            <Navbar />
            <div className="blob-3"></div>

            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 pt-32 md:pt-[280px] pb-6 relative z-10 transition-all duration-300">
                
                {/* Header */}
                <div className="mb-8 text-center animate-fade-up shrink-0">
                    <h1 className="font-display text-[4rem] sm:text-[5rem] tracking-tight text-gray-900 leading-none mb-2">
                        Omniscient Dialogue
                    </h1>
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[#a3c2ff]">
                        Conversational Intelligence Interface
                    </p>
                </div>

                {/* Glass Chat Interface */}
                <div className="flex-1 flex flex-col glass animate-fade-up delay-100 shadow-[0_24px_80px_rgba(0,0,0,0.08)] border border-white/60 mb-2 min-h-[600px]">
                    
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ff9b5e]/20 to-[#c2a3ff]/20 flex items-center justify-center mb-8 animate-float">
                                    <div className="w-6 h-6 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.1)]"></div>
                                </div>
                                <h2 className="text-xl font-medium text-gray-800 mb-3 tracking-tight">How may I assist?</h2>
                                <p className="text-[0.85rem] text-gray-400 max-w-sm mx-auto mb-10 leading-relaxed font-medium">
                                    Directly interrogate your entire email corpus using natural semantic language.
                                </p>
                                
                                <div className="flex flex-wrap justify-center gap-3">
                                    {starters.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInput(s)}
                                            className="pill-badge !text-[0.65rem] !uppercase !tracking-widest !bg-white/40 hover:!bg-white"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`} style={{ animationDuration: '0.4s' }}>
                                    
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c2a3ff] to-[#a3c2ff] flex items-center justify-center text-[0.6rem] font-bold text-white mr-4 shadow-md flex-shrink-0 mt-2 tracking-widest">
                                            ODIN
                                        </div>
                                    )}
                                    
                                    <div className={`max-w-[80%] px-6 py-5 text-[0.95rem] font-medium leading-[1.6] ${
                                        msg.role === 'user'
                                            ? 'bg-gray-900 text-white rounded-[24px] rounded-tr-sm shadow-[0_8px_24px_rgba(0,0,0,0.2)]'
                                            : msg.isError
                                                ? 'bg-[#ffeceb] text-[#d93025] border border-[#f5c6c4] rounded-[24px] rounded-tl-sm'
                                                : 'glass !bg-white/80 text-gray-800 rounded-[24px] rounded-tl-sm border border-white/60'
                                    }`}>
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                        
                                        {msg.sources?.length > 0 && (
                                            <div className="mt-5 pt-4 border-t border-gray-200/50">
                                                <p className="text-[0.55rem] font-bold uppercase tracking-widest text-gray-400 mb-2">Verified Sources</p>
                                                <ul className="space-y-1.5 border-l-2 border-[#a3c2ff] pl-3">
                                                    {msg.sources.map((src, j) => (
                                                        <li key={j}>
                                                            <a href={`/message/${src.id}`}
                                                                className="text-[0.8rem] text-[#6b6bf9] hover:text-[#4b4be9] transition-colors font-semibold truncate block">
                                                                {src.subject || src.sender || 'Anonymous Reference'}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {loading && (
                            <div className="flex justify-start items-end gap-4 animate-fade-in">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c2a3ff] to-[#a3c2ff] flex items-center justify-center text-[0.6rem] font-bold text-white shadow-md">
                                    ODIN
                                </div>
                                <div className="glass !bg-white/80 rounded-[20px] rounded-tl-sm px-6 py-4">
                                    <div className="flex gap-1.5 items-center h-4">
                                        <div className="w-1.5 h-1.5 bg-[#a3c2ff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-[#c2a3ff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-[#ff9b5e] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-white/40 border-t border-white/60">
                        <form onSubmit={handleSubmit} className="flex gap-4">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Interrogate your inbox..."
                                className="flex-1 px-6 py-4 glass !bg-white/60 border-0 rounded-full text-[0.95rem] font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c2a3ff] transition-all"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="w-16 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                            >
                                <svg className="w-5 h-5 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
