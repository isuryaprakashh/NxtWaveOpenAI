import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { fetchAnalytics } from '../services/api';

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => { loadAnalytics(); }, []);

    async function loadAnalytics() {
        setLoading(true);
        try {
            const data = await fetchAnalytics();
            setAnalytics(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return (
        <div className="bg-ethereal min-h-screen font-sans">
            <Navbar />
            <div className="flex flex-col items-center justify-center pt-48 gap-6">
                <div className="w-12 h-12 rounded-full border-[3px] border-[#c2a3ff] border-t-transparent animate-spin"></div>
                <p className="font-display text-3xl tracking-tighter text-gray-500">Aggregating telemetry...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="bg-ethereal min-h-screen font-sans">
            <Navbar />
            <div className="flex items-center justify-center pt-48">
                <div className="glass p-12 text-center max-w-md">
                    <p className="font-display text-4xl mb-4 text-[#d93025]">Telemetry Failure</p>
                    <p className="text-[0.85rem] text-gray-600 font-medium mb-8 leading-relaxed">{error}</p>
                    <button onClick={loadAnalytics} className="btn-primary !px-8">Re-Establish Connection</button>
                </div>
            </div>
        </div>
    );

    const { total_emails = 0, priority_distribution = {}, sentiment_distribution = {}, category_distribution = {}, recent_emails = [] } = analytics || {};

    const BarChart = ({ data, colors }) => {
        const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
        return (
            <div className="space-y-4">
                {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-4">
                        <div className="w-24 text-[0.65rem] font-bold uppercase tracking-widest text-gray-500 text-right">{key}</div>
                        <div className="flex-1 h-3 bg-white/40 rounded-full overflow-hidden shadow-inner backdrop-blur-md">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${colors[key] || 'bg-gray-400'}`}
                                style={{ width: `${(value / total) * 100}%` }}
                            />
                        </div>
                        <div className="w-10 text-[0.85rem] font-bold text-gray-800 text-right">{value}</div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="bg-ethereal min-h-screen flex flex-col font-sans relative">
            <Navbar />
            <div className="blob-3"></div>

            <div className="max-w-[72rem] mx-auto px-6 pt-32 pb-24 relative z-10 w-full">
                
                {/* Header */}
                <div className="mb-16 text-center animate-fade-up">
                    <h1 className="font-display text-[4rem] sm:text-[5rem] tracking-tight text-gray-900 leading-none mb-4">
                        Global Analytics
                    </h1>
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[#a3c2ff]">
                        Strategic Overview of {total_emails} Communications
                    </p>
                </div>

                {/* Massive KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-fade-up delay-100">
                    {[
                        {
                            label: "Total Volume", value: total_emails,
                            gradient: 'from-white/60 to-white/40',
                            textHighlight: 'text-gray-900'
                        },
                        {
                            label: "Critical Priority", value: priority_distribution.HIGH || 0,
                            gradient: 'from-[#ffeceb]/80 to-[#f5c6c4]/40',
                            textHighlight: 'text-[#d93025]'
                        },
                        {
                            label: "Positive Sentiment", value: sentiment_distribution.positive || 0,
                            gradient: 'from-[#e6f4ea]/80 to-[#ceead6]/40',
                            textHighlight: 'text-[#1e8e3e]'
                        },
                    ].map((kpi, i) => (
                        <div key={i} className={`glass !rounded-[32px] p-8 bg-gradient-to-br ${kpi.gradient} border border-white/60 text-center`}>
                            <div className={`font-display text-[4.5rem] leading-none tracking-tighter mb-2 ${kpi.textHighlight}`}>
                                {kpi.value}
                            </div>
                            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-500">{kpi.label}</p>
                        </div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 animate-fade-up delay-200">
                    <div className="glass !rounded-[32px] p-10 border border-white/60 text-center">
                        <h2 className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-8 mt-2">Priority Distribution</h2>
                        <BarChart
                            data={priority_distribution}
                            colors={{ HIGH: 'bg-[#d93025]', MEDIUM: 'bg-[#f29900]', LOW: 'bg-[#1e8e3e]' }}
                        />
                    </div>
                    <div className="glass !rounded-[32px] p-10 border border-white/60 text-center">
                        <h2 className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-8 mt-2">Sentiment Topology</h2>
                        <BarChart
                            data={sentiment_distribution}
                            colors={{ positive: 'bg-[#1e8e3e]', negative: 'bg-[#d93025]', neutral: 'bg-gray-400' }}
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="glass !rounded-[32px] p-10 mb-10 text-center animate-fade-up delay-300 border border-white/60">
                    <h2 className="text-[0.65rem] font-bold uppercase tracking-widest text-[#c2a3ff] mb-8">Classification Vectors</h2>
                    {Object.keys(category_distribution).length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-4">
                            {Object.entries(category_distribution).map(([cat, count]) => (
                                <div key={cat} className="pill-badge !py-3 !px-6 border border-[#c2a3ff]/30 !bg-[#c2a3ff]/10">
                                    <span className="text-xl font-display text-[#7a48df] -mt-1">{count}</span>
                                    <span className="text-[0.65rem] font-bold text-[#7a48df] tracking-wider uppercase">{cat}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[0.85rem] font-medium text-gray-400 opacity-80">Insufficient classification data available.</p>
                    )}
                </div>

            </div>
        </div>
    );
}
