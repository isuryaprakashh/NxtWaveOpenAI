import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

export default function Navbar() {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    const navLinks = [
        { path: '/inbox', label: 'Inbox' },
        { path: '/chat', label: 'Chat' },
        { path: '/analytics', label: 'Analytics' },
    ];

    return (
        <nav className="bg-white border-b border-gray-200 px-6 md:px-8 py-4 sticky top-0 z-50">
            <div className="flex justify-between items-center">
                <Link to="/" className="text-xl font-bold text-gray-900 tracking-tight hover:text-gray-700 transition-colors">
                    ODIN
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex gap-6 items-center">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`text-sm font-medium transition-colors ${isActive(link.path) ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <a
                        href="/logout"
                        className="text-sm font-medium text-red-500 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-400 transition-colors"
                    >
                        Logout
                    </a>
                </div>

                {/* Mobile Hamburger Button */}
                <button
                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                    <div className="flex flex-col gap-3">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`text-sm font-medium py-2 px-3 rounded-lg transition-colors ${isActive(link.path)
                                    ? 'text-gray-900 bg-gray-100'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <a
                            href="/logout"
                            className="text-sm font-medium text-red-500 border border-red-300 py-2 px-3 rounded-lg hover:bg-red-50 hover:border-red-400 transition-colors"
                        >
                            Logout
                        </a>
                    </div>
                </div>
            )}
        </nav>
    );
}
