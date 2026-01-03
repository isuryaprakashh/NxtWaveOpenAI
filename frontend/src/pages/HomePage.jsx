import React, { useEffect, useState } from "react";
import { checkAuth } from "../services/api";

export default function OdinLanding() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        // Check if user is already signed in
        checkAuth().then(data => {
            setIsAuthenticated(data.authenticated || false);
        });
    }, []);

    return (
        <div className="font-sans text-[#1a1a1a] bg-white">
            {/* Navigation - Shows different button based on auth status */}
            <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
                <h1 className="text-xl font-bold tracking-tight">ODIN</h1>
                <div className="flex items-center gap-6">
                    <a href="#features" className="text-sm font-medium text-gray-500 hover:text-black">Features</a>
                    <a href="#how-it-works" className="text-sm font-medium text-gray-500 hover:text-black">How It Works</a>
                    {isAuthenticated ? (
                        <a href="/inbox" className="rounded-md bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                            Go to Inbox
                        </a>
                    ) : (
                        <a href="/login" className="rounded-md bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                            Sign In
                        </a>
                    )}
                </div>
            </nav>

            {/* Hero */}
            <section className="border-b border-gray-200 bg-gradient-to-b from-white to-gray-50 px-6 py-32 text-center">
                <div className="mx-auto max-w-4xl">
                    <h1 className="mb-6 text-6xl font-bold tracking-tight">ODIN</h1>
                    <p className="mb-8 text-2xl text-gray-500">AI-Powered Email Intelligence</p>
                    <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-500">
                        Transform your inbox into a strategic command center. ODIN uses advanced AI to analyze, prioritize, and respond to your emails with unmatched intelligence and speed.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        {isAuthenticated ? (
                            <a href="/inbox" className="rounded-lg bg-black px-10 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-gray-800">
                                Open Inbox
                            </a>
                        ) : (
                            <a href="/login" className="rounded-lg bg-black px-10 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-gray-800">
                                Get Started
                            </a>
                        )}
                        <a href="#features" className="rounded-lg border border-gray-300 px-10 py-4 text-sm font-semibold uppercase tracking-wide hover:border-black">Learn More</a>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="px-6 py-24">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-20 text-center">
                        <h2 className="mb-4 text-4xl font-bold tracking-tight">Powerful Features</h2>
                        <p className="text-lg text-gray-500">Everything you need to master your inbox</p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {["Smart Priority Detection", "Intelligent Summarization", "AI-Generated Replies", "Smart Categorization", "Sentiment Analysis", "Information Extraction"].map((title, i) => (
                            <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-10 transition hover:-translate-y-1 hover:border-black hover:shadow-xl">
                                <div className="mb-6 text-4xl font-bold tracking-tighter text-black/30">{String(i + 1).padStart(2, "0")}</div>
                                <h3 className="mb-4 text-xl font-semibold">{title}</h3>
                                <p className="text-gray-500">
                                    AI-powered capabilities designed to save time, improve focus, and help you respond smarter and faster.
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="bg-black px-6 py-20 text-white">
                <div className="mx-auto grid max-w-5xl gap-12 text-center md:grid-cols-3">
                    <div>
                        <h3 className="text-5xl font-bold">5x</h3>
                        <p className="mt-2 text-sm uppercase tracking-widest text-gray-400">Faster Processing</p>
                    </div>
                    <div>
                        <h3 className="text-5xl font-bold">100%</h3>
                        <p className="mt-2 text-sm uppercase tracking-widest text-gray-400">Enterprise Security</p>
                    </div>
                    <div>
                        <h3 className="text-5xl font-bold">24/7</h3>
                        <p className="mt-2 text-sm uppercase tracking-widest text-gray-400">Always Available</p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="bg-white px-6 py-24">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-20 text-center">
                        <h2 className="mb-4 text-4xl font-bold tracking-tight">How It Works</h2>
                        <p className="text-lg text-gray-500">Simple, secure, and powerful</p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-3">
                        {[
                            { title: "Connect Your Gmail", desc: "Secure OAuth 2.0 authentication keeps your data private." },
                            { title: "AI Analyzes Emails", desc: "Advanced models process emails in parallel for instant insights." },
                            { title: "Take Action", desc: "Summaries, priorities, and AI replies—directly in your inbox." },
                        ].map((step, i) => (
                            <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-10 transition hover:-translate-y-1 hover:shadow-xl">
                                <div className="mb-6 text-4xl font-bold text-black/30">{i + 1}</div>
                                <h3 className="mb-4 text-xl font-semibold">{step.title}</h3>
                                <p className="text-gray-500">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="border-t border-gray-200 bg-gray-50 px-6 py-24 text-center">
                <h2 className="mb-4 text-4xl font-bold tracking-tight">Ready to Transform Your Inbox?</h2>
                <p className="mx-auto mb-10 max-w-xl text-lg text-gray-500">Join ODIN and experience the future of email management.</p>
                {isAuthenticated ? (
                    <a href="/inbox" className="rounded-lg bg-black px-12 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-gray-800">
                        Open Your Inbox
                    </a>
                ) : (
                    <a href="/login" className="rounded-lg bg-black px-12 py-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-gray-800">
                        Start Using ODIN
                    </a>
                )}
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-800 bg-black px-6 py-12 text-center text-sm text-gray-400">
                © 2025 ODIN. AI Email Assistant powered by Advanced AI.
            </footer>
        </div>
    );
}
