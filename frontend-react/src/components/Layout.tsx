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
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex transition-colors duration-300">
            <aside className="hidden md:flex flex-col w-24 lg:w-64 fixed h-full z-50 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] pt-8 transition-all duration-300">
                <div className="px-6 mb-10">
                    <span className="text-red-600 text-3xl font-bold tracking-tighter">NETFLIX</span>
                </div>

                <nav className="flex-1 space-y-2 px-4">
                    <div className={`flex items-center gap-4 px-4 py-3 rounded-md transition-colors cursor-pointer ${isSearchOpen ? 'bg-[var(--bg-elevated)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}
                        onClick={() => !isSearchOpen && setIsSearchOpen(true)}
                    >
                        <Search className={`w-6 h-6 ${isSearchOpen ? 'text-[var(--text-primary)]' : ''}`} />
                        {isSearchOpen ? (
                            <form onSubmit={handleSearch} className="flex-1">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full bg-transparent border-none focus:ring-0 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-dim)]"
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
                                ? 'text-[var(--text-primary)] font-bold bg-[var(--bg-elevated)]'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                                }`}
                        >
                            <item.icon className="w-6 h-6" />
                            <span className="hidden lg:block text-sm">{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 mt-auto space-y-4">
                    <div className="text-xs text-[var(--text-dim)] text-center lg:text-left pt-2 border-t border-[var(--border-subtle)] font-medium">
                        &copy; 2026 StreamFlow
                    </div>
                </div>
            </aside>

            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] z-50 flex justify-around p-3 items-center">
                {NAV_ITEMS.slice(0, 4).map((item) => (
                    <Link key={item.name} to={item.path} className={`flex flex-col items-center gap-1 ${isActive(item.path) ? 'text-[var(--text-primary)]' : 'text-[var(--text-dim)]'}`}>
                        <item.icon className="w-5 h-5" />
                        <span className="text-[10px]">{item.name}</span>
                    </Link>
                ))}
            </div>

            <main className="flex-1 md:ml-24 lg:ml-64 w-full pb-16 md:pb-0">
                {children}
            </main>
        </div>
    );
};
