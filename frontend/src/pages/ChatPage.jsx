import { useState } from 'react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';
import { sendChatQuery } from '../services/api';

export default function ChatPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

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
                content: `Error: ${err.message}`,
                isError: true
            }]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />

            <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6">
                <h1 className="text-xl font-semibold text-gray-900 mb-4">Chat with your Inbox</h1>
                <p className="text-sm text-gray-500 mb-6">
                    Ask questions about your emails using natural language. Powered by RAG.
                </p>

                {/* Chat Messages */}
                <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">
                                <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <p>No messages yet. Ask a question about your emails!</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === 'user'
                                        ? 'bg-gray-900 text-white'
                                        : msg.isError
                                            ? 'bg-red-50 text-red-700 border border-red-200'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        {msg.sources?.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-gray-200">
                                                <p className="text-xs text-gray-500">Sources:</p>
                                                <ul className="text-xs text-gray-600">
                                                    {msg.sources.map((src, j) => (
                                                        <li key={j}>• {src.subject || src}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 rounded-lg px-4 py-2">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about your emails..."
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                            disabled={loading}
                        />
                        <Button type="submit" disabled={loading || !input.trim()}>
                            Send
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
