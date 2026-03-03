import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { NAV_ITEMS } from '../constants';

export const Layout = ({ children }: { children: ReactNode }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/' && !location.search;
        return location.pathname + location.search === path;
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/?q=${encodeURIComponent(searchQuery)}`);
            // Optional: close search or keep it open
        }
    };

    return (
        <div className="min-h-screen bg-[#141414] text-white flex">
            {/* Sidebar Navigation */}
            <aside className="hidden md:flex flex-col w-24 lg:w-64 fixed h-full z-50 bg-black border-r border-white/10 pt-8 transition-all duration-300">
                <div className="px-6 mb-10">
                    <span className="text-red-600 text-3xl font-bold tracking-tighter">NETFLIX</span>
                </div>

                <nav className="flex-1 space-y-2 px-4">
                    {/* Search Item */}
                    <div className={`flex items-center gap-4 px-4 py-3 rounded-md transition-colors cursor-pointer ${isSearchOpen ? 'bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        onClick={() => !isSearchOpen && setIsSearchOpen(true)}
                    >
                        <Search className={`w-6 h-6 ${isSearchOpen ? 'text-white' : ''}`} />
                        {isSearchOpen ? (
                            <form onSubmit={handleSearch} className="flex-1">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full bg-transparent border-none focus:ring-0 text-white text-sm placeholder:text-gray-500"
                                    autoFocus
                                    onBlur={() => !searchQuery && setIsSearchOpen(false)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </form>
                        ) : (
                            <span className="hidden lg:block text-sm">Search</span>
                        )}
                    </div>

                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-4 px-4 py-3 rounded-md transition-colors ${isActive(item.path)
                                ? 'text-white font-bold bg-white/10'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <item.icon className="w-6 h-6" />
                            <span className="hidden lg:block text-sm">{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 mt-auto space-y-4">
                    {/* PC/Tablet Sidebar Install Link */}
                    <a
                        href="/streamflow-tv.apk"
                        download="streamflow-tv.apk"
                        className="flex items-center gap-4 px-4 py-3 rounded-md transition-all duration-300 text-red-600 border border-red-900/30 hover:bg-red-600/10 group shadow-[0_0_15px_rgba(220,38,38,0.1)] hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] bg-gradient-to-r from-red-600/5 to-transparent"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-6 h-6 group-hover:scale-110 transition-transform"
                        >
                            <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
                            <polyline points="17 2 12 7 7 2" />
                        </svg>
                        <span className="hidden lg:block text-sm font-bold tracking-wide">TV APP</span>
                    </a>

                    <div className="text-xs text-gray-500 text-center lg:text-left pt-2 border-t border-white/5 font-medium">
                        &copy; 2026 StreamFlow
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Nav (Visible only on small screens) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-white/10 z-50 flex justify-around p-3 items-center">
                {NAV_ITEMS.slice(0, 4).map((item) => (
                    <Link key={item.name} to={item.path} className={`flex flex-col items-center gap-1 ${isActive(item.path) ? 'text-white' : 'text-gray-500'}`}>
                        <item.icon className="w-5 h-5" />
                        <span className="text-[10px]">{item.name}</span>
                    </Link>
                ))}
                {/* APK Download in Mobile Nav */}
                <a
                    href="/streamflow-tv.apk"
                    download="streamflow-tv.apk"
                    className="flex flex-col items-center gap-1 text-red-600 animate-pulse font-bold"
                >
                    <div className="bg-red-600 rounded-lg p-1">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-4 h-4"
                        >
                            <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
                            <polyline points="17 2 12 7 7 2" />
                        </svg>
                    </div>
                    <span className="text-[10px]">TV App</span>
                </a>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-24 lg:ml-64 w-full pb-16 md:pb-0">
                {children}
            </main>
        </div>
    );
};
