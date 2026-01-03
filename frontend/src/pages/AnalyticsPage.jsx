import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { fetchAnalytics } from '../services/api';

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadAnalytics();
    }, []);

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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="py-20">
                    <LoadingSpinner size="lg" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="py-20 text-center text-red-500">{error}</div>
            </div>
        );
    }

    const { total_emails = 0, priority_distribution = {}, sentiment_distribution = {}, category_distribution = {} } = analytics || {};

    // Helper to render a bar chart
    const BarChart = ({ data, colors }) => {
        const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
        return (
            <div className="space-y-2">
                {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                        <div className="w-20 text-xs text-gray-600 capitalize">{key}</div>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${colors[key] || 'bg-gray-400'}`}
                                style={{ width: `${(value / total) * 100}%` }}
                            />
                        </div>
                        <div className="w-8 text-xs text-gray-600 text-right">{value}</div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-6">
                <h1 className="text-2xl font-semibold text-gray-900 mb-6">Analytics Dashboard</h1>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="text-3xl font-bold text-gray-900">{total_emails}</div>
                        <div className="text-sm text-gray-500">Total Emails Analyzed</div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="text-3xl font-bold text-red-600">{priority_distribution.HIGH || 0}</div>
                        <div className="text-sm text-gray-500">High Priority</div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="text-3xl font-bold text-green-600">{sentiment_distribution.positive || 0}</div>
                        <div className="text-sm text-gray-500">Positive Sentiment</div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Priority Distribution */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="font-semibold text-gray-900 mb-4">Priority Distribution</h2>
                        <BarChart
                            data={priority_distribution}
                            colors={{ HIGH: 'bg-red-500', MEDIUM: 'bg-amber-500', LOW: 'bg-green-500' }}
                        />
                    </div>

                    {/* Sentiment Distribution */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="font-semibold text-gray-900 mb-4">Sentiment Distribution</h2>
                        <BarChart
                            data={sentiment_distribution}
                            colors={{ positive: 'bg-green-500', negative: 'bg-red-500', neutral: 'bg-gray-400' }}
                        />
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 md:col-span-2">
                        <h2 className="font-semibold text-gray-900 mb-4">Category Distribution</h2>
                        {Object.keys(category_distribution).length > 0 ? (
                            <div className="flex flex-wrap gap-4">
                                {Object.entries(category_distribution).map(([category, count]) => (
                                    <div key={category} className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                                        <div className="font-semibold text-blue-700">{count}</div>
                                        <div className="text-xs text-blue-600">{category}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm">No category data available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
