import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
            <Link to="/" className="text-xl font-bold text-gray-900 tracking-tight hover:text-gray-700 transition-colors">
                ODIN
            </Link>
            <div className="flex gap-6 items-center">
                <Link
                    to="/inbox"
                    className={`text-sm font-medium transition-colors ${isActive('/inbox') ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Inbox
                </Link>
                <Link
                    to="/chat"
                    className={`text-sm font-medium transition-colors ${isActive('/chat') ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Chat
                </Link>
                <Link
                    to="/analytics"
                    className={`text-sm font-medium transition-colors ${isActive('/analytics') ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Analytics
                </Link>
                <a
                    href="/logout"
                    className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                    Logout
                </a>
            </div>
        </nav>
    );
}
