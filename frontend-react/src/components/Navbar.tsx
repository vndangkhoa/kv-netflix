import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Film, Menu, X } from 'lucide-react';
import { NAV_ITEMS } from '../constants'; // Unified Categories

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // Helper to check active state
    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/' && !location.search;
        return location.pathname + location.search === path;
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/?q=${encodeURIComponent(searchQuery)}`);
            setIsMenuOpen(false);
        }
    };

    return (
        <nav className="fixed top-0 w-full z-50 bg-[#141414]/95 backdrop-blur-md border-b border-white/5 font-sans">
            <div className="w-full px-4 sm:px-6 lg:px-12">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-lg group-hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300">
                                <Film className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                StreamFlow
                            </span>
                        </Link>

                        <div className="hidden lg:flex items-center gap-6">
                            {/* Unified Links */}
                            {NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`text-sm font-medium transition-colors ${isActive(item.path)
                                        ? 'text-white'
                                        : 'text-gray-300 hover:text-cyan-400'
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:block flex-1 max-w-xs mx-8">
                            <form onSubmit={handleSearch} className="relative group">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm kiếm..."
                                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-300 focus:bg-white/10"
                                />
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                            </form>
                        </div>

                        {/* Install App Button */}
                        <a
                            href="/streamflow-tv.apk"
                            download="streamflow-tv.apk"
                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white text-sm font-bold rounded-full shadow-lg shadow-cyan-900/20 hover:shadow-cyan-500/40 transition-all duration-300 active:scale-95 border border-white/10"
                        >
                            <svg 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                className="w-4 h-4"
                            >
                                <rect width="20" height="15" x="2" y="7" rx="2" ry="2"/>
                                <polyline points="17 2 12 7 7 2"/>
                            </svg>
                            <span>Install App</span>
                        </a>

                        <div className="lg:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="text-gray-300 hover:text-white p-2"
                            >
                                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isMenuOpen && (
                <div className="lg:hidden bg-[#1a1a1a] border-b border-white/10 max-h-[80vh] overflow-y-auto">
                    <div className="px-4 pt-2 pb-4 space-y-3">
                        {/* Mobile Install App Button */}
                        <a
                            href="/streamflow-tv.apk"
                            download="streamflow-tv.apk"
                            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold rounded-lg mb-4"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <svg 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                className="w-5 h-5"
                            >
                                <rect width="20" height="15" x="2" y="7" rx="2" ry="2"/>
                                <polyline points="17 2 12 7 7 2"/>
                            </svg>
                            <span>Download Android TV App</span>
                        </a>

                        <form onSubmit={handleSearch} className="relative mb-4">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm kiếm..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white"
                            />
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        </form>

                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                onClick={() => setIsMenuOpen(false)}
                                className={`block px-3 py-2 rounded-md text-base font-medium hover:bg-white/10 ${isActive(item.path) ? 'text-white bg-white/5' : 'text-gray-300'}`}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
