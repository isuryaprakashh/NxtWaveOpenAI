import React, { useEffect, useState } from "react";
import { checkAuth, BASE_URL } from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function HomePage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuth().then(data => setIsAuthenticated(data.authenticated || false));
    }, []);

    // The beautiful Sarvam-style SVG ornament
    const Ornament = () => (
        <svg width="180" height="40" viewBox="0 0 180 40" className="mx-auto mb-6 opacity-60">
            <path d="M70,25 C75,18 85,18 90,25" className="flourish" />
            <path d="M60,20 C68,10 82,10 90,20" className="flourish" />
            <path d="M50,15 C60,5 80,5 90,15" className="flourish" />
            <path d="M110,25 C105,18 95,18 90,25" className="flourish" />
            <path d="M120,20 C112,10 98,10 90,20" className="flourish" />
            <path d="M130,15 C120,5 100,5 90,15" className="flourish" />
            
            <circle cx="90" cy="15" r="3" fill="#d1d1d1" />
            <circle cx="65" cy="22" r="2" fill="#d1d1d1" />
            <circle cx="115" cy="22" r="2" fill="#d1d1d1" />
            
            <path d="M20,25 L45,25" className="flourish" />
            <path d="M160,25 L135,25" className="flourish" />
        </svg>
    );

    // SVG Icons for Features
    const SummaryIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6b6bf9]">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
    );

    const PriorityIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#ff9b5e]">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    );

    const ReplyIcon = () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#c2a3ff]">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );

    // Feature data
    const features = [
        {
            title: "Smart Summaries",
            desc: "ODIN distills long threads into concise, actionable bullet points, saving you hours of reading time.",
            icon: <SummaryIcon />
        },
        {
            title: "Intelligent Priority",
            desc: "Our neural engine identifies urgent requests and critical deadlines, bringing them to your attention.",
            icon: <PriorityIcon />
        },
        {
            title: "Contextual Replies",
            desc: "Generate professional, context-aware reply drafts in your personal voice with a single click.",
            icon: <ReplyIcon />
        }
    ];

    const integrations = [
        { name: "Gmail", type: "text", val: "Gmail" },
        { name: "OAuth", type: "icon", val: "🛡️", label: "OAuth" },
        { name: "Gemini", type: "text", val: "Gemini" },
        { name: "Groq", type: "icon", val: "⚡", label: "Groq" },
        { name: "Anthropic", type: "text", val: "Anthropic" },
        { name: "OpenAI", type: "text", val: "OpenAI" }
    ];

    return (
        <div className="bg-ethereal min-h-screen flex flex-col font-sans selection:bg-[#c2a3ff]/30">
            <Navbar />
            
            {/* Background Decorations */}
            <div className="blob-3"></div>
            <div className="absolute top-[120vh] -left-[10%] w-[50vw] h-[50vw] bg-radial-gradient from-[#ff9b5e]/20 to-transparent blur-[120px] rounded-full pointer-events-none opacity-40"></div>
            <div className="absolute top-[200vh] -right-[5%] w-[40vw] h-[40vw] bg-radial-gradient from-[#a3c2ff]/20 to-transparent blur-[100px] rounded-full pointer-events-none opacity-40"></div>

            {/* Hero Section */}
            <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative z-10 pt-20">
                <div className="animate-fade-up">
                    <Ornament />
                </div>

                <div className="flex justify-center mb-6 animate-fade-up delay-100">
                    <span className="pill-badge text-[#6b6bf9]">
                        Revolutionizing Email with Compound Intelligence
                    </span>
                </div>

                <h1 className="font-display text-[3rem] sm:text-[4rem] md:text-[5.5rem] leading-[1] tracking-tight mb-8 text-gray-900 animate-fade-up delay-200" style={{ letterSpacing: '-0.05em' }}>
                    Your Inbox,<br />Reimagined.
                </h1>

                <p className="text-lg md:text-xl text-[#555] max-w-2xl mx-auto mb-12 leading-relaxed font-medium animate-fade-up delay-300">
                    ODIN is the AI-first email layer that handles the noise, prioritizes what matters, and writes for you.
                </p>

                <div className="flex flex-col items-center animate-fade-up delay-400 mb-20">
                    {isAuthenticated ? (
                        <a href="/inbox" className="btn-primary !px-10 !py-4 shadow-xl hover:scale-105 transition-transform">
                            Go to Inbox ❯
                        </a>
                    ) : (
                        <>
                            <a href={`${BASE_URL}/login`} className="btn-primary !px-10 !py-4 shadow-xl text-[1.05rem] hover:scale-105 transition-transform">
                                Unlock Your Intelligence ❯
                            </a>
                        </>
                    )}
                </div>

                {/* Integrations Marquee - Moved to Top */}
                <div className="w-full overflow-hidden py-10 border-y border-black/5 animate-fade-up delay-500">
                    <div className="animate-marquee group-hover:pause flex items-center gap-20">
                        {[...integrations, ...integrations, ...integrations].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 opacity-40 hover:opacity-100 transition-opacity duration-500 grayscale hover:grayscale-0 px-4">
                                {item.type === "text" ? (
                                    <span className={`text-2xl font-bold tracking-tighter ${item.name === "Gmail" ? "font-serif italic" : ""}`}>{item.val}</span>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{item.val}</span>
                                        <span className="text-sm font-extrabold tracking-widest uppercase mb-[-2px]">{item.label}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-30">
                    <div className="w-[1px] h-10 bg-gradient-to-b from-gray-700 to-transparent mx-auto"></div>
                </div>
            </main>

            {/* Feature Grid */}
            <section className="py-24 px-8 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 animate-fade-up">
                        <h2 className="font-display text-[3rem] md:text-[3.5rem] text-gray-900 mb-4">Built for Focus</h2>
                        <p className="text-gray-500 max-w-lg mx-auto text-base leading-relaxed">
                            We've stripped away the clutter to build an experience that amplifies your productivity.
                        </p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="card-premium p-10 flex flex-col items-start text-left group animate-fade-up" style={{ animationDelay: `${i * 0.15}s` }}>
                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 border border-gray-100">
                                    {f.icon}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3 tracking-tight">{f.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed font-medium">
                                    {f.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* AI Showcase Deep-dive */}
            <section className="py-24 px-8 bg-black/[0.02] relative overflow-hidden">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
                    <div className="animate-fade-up">
                        <span className="text-[#6b6bf9] font-bold tracking-[0.2em] text-[0.6rem] uppercase mb-4 block opacity-70">The Intelligence Brief</span>
                        <h2 className="font-display text-[3rem] text-gray-900 leading-[1.1] mb-6">Never read a full thread again.</h2>
                        <p className="text-gray-500 text-base leading-relaxed mb-10 font-medium">
                            ODIN's neural engine analyzes every incoming message in real-time, providing you with a high-fidelity summary before you even open it.
                        </p>
                        <ul className="space-y-4">
                            {["Action items extracted automatically", "Sentiment & urgency detection", "Smart attachment indexing"].map((item, i) => (
                                <li key={i} className="flex items-center gap-4 text-gray-700 text-sm font-semibold">
                                    <span className="w-5 h-5 rounded-full bg-[#c2a3ff]/20 flex items-center justify-center text-[#6b6bf9] text-[0.6rem]">✓</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    {/* Simulated UI Mockup */}
                    <div className="glass p-1 shadow-2xl rounded-[32px] rotate-1 hover:rotate-0 transition-all duration-700 animate-fade-up">
                        <div className="bg-white rounded-[30px] p-8 overflow-hidden">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ff9b5e] to-[#c2a3ff]"></div>
                                <div>
                                    <div className="h-2.5 w-32 bg-gray-100 rounded-full mb-2"></div>
                                    <div className="h-1.5 w-20 bg-gray-50 rounded-full"></div>
                                </div>
                            </div>
                            <div className="space-y-4 mb-10">
                                <div className="h-3 w-full bg-gray-100 rounded-full"></div>
                                <div className="h-3 w-[90%] bg-gray-100 rounded-full"></div>
                                <div className="h-3 w-[95%] bg-gray-100 rounded-full"></div>
                            </div>
                            <div className="bg-[#6b6bf9]/5 p-6 rounded-2xl border border-[#6b6bf9]/10">
                                <div className="text-[0.55rem] font-black text-[#6b6bf9] tracking-widest uppercase mb-4 opacity-50">ODIN SUMMARY</div>
                                <div className="h-2.5 w-[85%] bg-[#6b6bf9]/20 rounded-full mb-3"></div>
                                <div className="h-2.5 w-[70%] bg-[#6b6bf9]/20 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
