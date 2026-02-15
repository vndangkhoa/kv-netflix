import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Apple, Home, Film, Tv, Sparkles, MonitorPlay } from 'lucide-react';
import { CATEGORIES } from '../../constants';

export const Layout = ({ children }: { children: ReactNode }) => {
    const [scrolled, setScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/?q=${encodeURIComponent(searchQuery)}`);
            setIsSearchOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#000000] text-white selection:bg-white/20">
            {/* Glass Navbar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled || isSearchOpen
                ? 'bg-[#1a1a1a]/90 backdrop-blur-xl border-b border-white/5'
                : 'bg-gradient-to-b from-black/80 to-transparent'
                }`}>
                <div className="max-w-[1600px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <Link to="/" className="text-white hover:opacity-80 transition-opacity">
                            {/* Mock Apple Logo */}
                            <div className="flex items-center gap-1 font-semibold tracking-tight text-xl">
                                <Apple className="w-5 h-5 mb-1" />
                                <span>TV+</span>
                            </div>
                        </Link>

                        <div className="hidden md:flex items-center gap-8">
                            <Link to="/" className="text-sm font-medium text-white/90 hover:text-white transition-colors">Home</Link>
                            {CATEGORIES.map((item) => (
                                <Link
                                    key={item.id}
                                    to={item.path}
                                    className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Install App Button (PC/Tablet) */}
                        <a
                            href="/streamflow-tv.apk"
                            download="streamflow-tv.apk"
                            className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-white/90 text-sm font-bold rounded-full transition-all duration-300 shadow-xl shadow-white/5 active:scale-95"
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
                                <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
                                <polyline points="17 2 12 7 7 2" />
                            </svg>
                            <span>TV APP</span>
                        </a>

                        <div className={`relative group flex items-center transition-all duration-300 ${isSearchOpen ? 'w-64 bg-white/10 rounded-lg px-2' : 'w-8'}`}>
                            <Search
                                className="w-4 h-4 text-white/70 group-hover:text-white transition-colors cursor-pointer"
                                onClick={() => setIsSearchOpen(true)}
                            />
                            {isSearchOpen && (
                                <form onSubmit={handleSearch} className="flex-1">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search movies..."
                                        className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-white text-sm placeholder:text-gray-400 ml-2 h-8"
                                        autoFocus
                                        onBlur={() => !searchQuery && setIsSearchOpen(false)}
                                    />
                                </form>
                            )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[1px]">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-bold">
                                K
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#161616]/80 backdrop-blur-2xl border-t border-white/5 pb-safe">
                <div className="flex items-center justify-around h-20 px-2 pb-2">
                    <Link to="/" className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${location.pathname === '/' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}>
                        <Home className={`w-6 h-6 ${location.pathname === '/' ? 'fill-current' : ''}`} strokeWidth={location.pathname === '/' ? 2.5 : 2} />
                        <span className="text-[10px] font-medium tracking-wide">Home</span>
                    </Link>
                    {CATEGORIES.slice(0, 3).map((item) => {
                        const getCategoryIcon = (id: string) => {
                            switch (id) {
                                case 'phim-le': return Film;
                                case 'phim-bo': return Tv; // Series implies TV
                                case 'hoat-hinh': return Sparkles; // Animation
                                case 'tv-shows': return MonitorPlay;
                                default: return Film;
                            }
                        };
                        const Icon = getCategoryIcon(item.id);
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.id}
                                to={item.path}
                                className={`flex flex-col items-center gap-1.5 p-2 transition-colors ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                            >
                                <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-medium tracking-wide">{item.name}</span>
                            </Link>
                        );
                    })}
                    {/* APK Download in Mobile Nav */}
                    <a
                        href="/streamflow-tv.apk"
                        download="streamflow-tv.apk"
                        className="flex flex-col items-center gap-1.5 p-2 text-white animate-pulse"
                    >
                        <div className="p-1 rounded bg-white text-black">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5"
                            >
                                <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
                                <polyline points="17 2 12 7 7 2" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-bold tracking-wide">TV APP</span>
                    </a>
                </div>
            </nav>

            <main className="w-full pb-20 md:pb-0">
                {children}
            </main>
        </div>
    );
};
