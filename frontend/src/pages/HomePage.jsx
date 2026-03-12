import React, { useEffect, useState } from "react";
import { checkAuth } from "../services/api";
import Navbar from "../components/Navbar";

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

    return (
        <div className="bg-ethereal min-h-screen flex flex-col font-sans">
            <Navbar />
            
            {/* 3 moving blobs for background (classes defined in index.css) */}
            <div className="blob-3"></div>

            <main className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10 -mt-10">
                
                <div className="animate-fade-up">
                    <Ornament />
                </div>

                {/* Pill badge matching reference */}
                <div className="flex justify-center mb-8 animate-fade-up delay-100">
                    <span className="pill-badge text-[#6b6bf9] font-medium tracking-wide">
                        Your Intelligent Email Assistant
                    </span>
                </div>

                {/* Massive sharp serif heading */}
                <h1 className="font-display text-[4rem] sm:text-[5.5rem] md:text-[6.5rem] leading-[1.05] tracking-tight mb-6 text-gray-900 animate-fade-up delay-200" style={{ letterSpacing: '-0.04em' }}>
                    Clarity for all from ODIN
                </h1>

                {/* Subtitle matching Sarvam layout */}
                <p className="text-lg md:text-xl text-[#555] max-w-2xl mx-auto mb-10 leading-relaxed font-medium animate-fade-up delay-300">
                    Built on secure compute. Powered by frontier-class Gemini models.<br />
                    Delivering absolute inbox Intelligence.
                </p>

                {/* Button matching Sarvam "Experience Sarvam" */}
                <div className="flex justify-center animate-fade-up delay-400">
                    {isAuthenticated ? (
                        <a href="/inbox" className="btn-primary !px-10 !py-4 shadow-xl">
                            Experience ODIN
                        </a>
                    ) : (
                        <a href="/login" className="btn-primary !px-10 !py-4 shadow-xl text-[1.05rem]">
                            Experience ODIN
                        </a>
                    )}
                </div>

            </main>

            {/* Bottom logos strip matching Sarvam reference */}
            <div className="relative z-10 pb-16 pt-10 text-center animate-fade-up delay-500">
                <p className="text-[0.65rem] font-bold tracking-[0.2em] text-[#888] uppercase mb-10">
                    Built With Powerful Integrations
                </p>
                <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
                    <div className="text-xl font-bold font-serif italic tracking-tighter">Gmail</div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🛡️</span>
                        <span className="text-sm font-bold tracking-tight uppercase">OAuth</span>
                    </div>
                    <div className="flex flex-col items-center leading-none">
                        <span className="text-xl font-bold tracking-tighter">Google</span>
                        <span className="text-[0.55rem] font-semibold tracking-widest uppercase">Workspace</span>
                    </div>
                    <div className="text-2xl font-bold tracking-tight">Gemini</div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <span className="text-lg font-bold">Groq</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
