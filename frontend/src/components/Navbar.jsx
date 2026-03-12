import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { checkAuth } from '../services/api';

export default function Navbar() {
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        
        // Check auth status
        checkAuth().then(data => setIsAuthenticated(data.authenticated || false));
        
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (path) => location.pathname === path;

    const navLinks = [
        { path: '/inbox', label: 'INBOX' },
        { path: '/chat', label: 'CHAT' },
        { path: '/analytics', label: 'ANALYTICS' },
    ];

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
            scrolled ? 'bg-white/60 backdrop-blur-2xl border-b border-black/5 shadow-sm' : 'bg-white/20 backdrop-blur-md border-b border-transparent'
        }`}>
            <div className="mx-auto max-w-7xl px-8 h-20 flex items-center justify-between">
                
                {/* Logo Area */}
                <Link 
                    to="/" 
                    className="flex items-center gap-2 group w-48" // w-48 keeps logo area balanced with right CTA area
                >
                    <span className="font-display text-2xl tracking-tighter text-gray-900 group-hover:opacity-70 transition-opacity">
                        odin.
                    </span>
                </Link>

                {/* Center Links (Matching "PLATFORM > DEVELOPERS > BLOGS") */}
                <div className="flex-1 hidden md:flex items-center justify-center gap-10">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className="flex items-center gap-1.5 focus:outline-none group"
                        >
                            <span className={`text-[0.65rem] tracking-[0.2em] font-bold uppercase transition-colors duration-300 ${
                                isActive(link.path)
                                    ? 'text-gray-900'
                                    : 'text-gray-500 group-hover:text-gray-900'
                            }`}>
                                {link.label}
                            </span>
                            <span className="text-gray-400 text-[0.55rem] font-bold group-hover:translate-x-0.5 transition-transform">
                                ❯
                            </span>
                        </Link>
                    ))}
                </div>

                {/* Right Area (Matching "Experience Sarvam" "Talk to Sales") */}
                <div className="hidden md:flex items-center justify-end w-48 gap-3">
                    {isAuthenticated ? (
                        <a 
                            href="/logout" 
                            className="btn-primary !bg-none !bg-gray-100 hover:!bg-gray-200 !text-gray-700 !px-5 !py-2.5 !text-[0.75rem] !font-bold uppercase tracking-wider !shadow-none"
                        >
                            Log Out
                        </a>
                    ) : (
                        <a 
                            href="/login" 
                            className="btn-primary !px-5 !py-2.5 !text-[0.75rem] !font-bold uppercase tracking-wider !shadow-md"
                        >
                            Sign In
                        </a>
                    )}
                </div>
                
                {/* Mobile placeholder */}
                <div className="md:hidden flex items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Menu</span>
                </div>
            </div>
        </nav>
    );
}
