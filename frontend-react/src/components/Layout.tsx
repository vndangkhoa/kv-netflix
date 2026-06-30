import type { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, Film, Tv, Heart } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import Navbar from './Navbar';

const BOTTOM_TABS = [
    { nameKey: 'home' as const, path: '/', icon: Home },
    { nameKey: 'movies' as const, path: '/?category=phim-le', icon: Film },
    { nameKey: 'series' as const, path: '/?category=phim-bo', icon: Tv },
    { nameKey: 'myList' as const, path: '/my-list', icon: Heart },
];

export const Layout = ({ children }: { children: ReactNode }) => {
    const location = useLocation();
    const { t } = useLang();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/' && !location.search;
        return location.pathname + location.search === path;
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col transition-colors duration-300">
            {/* Top Shared Header */}
            <Navbar />

            {/* Main Content Area */}
            <main className="flex-1 pt-14 pb-16 lg:pb-0 min-h-[calc(100vh-3.5rem)]">
                {children}
            </main>

            {/* Bottom Tab Bar - Mobile & Tablet only (lg:hidden) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-secondary)]/95 backdrop-blur-lg border-t border-[var(--border-subtle)] safe-area-bottom">
                <div className="flex items-center justify-around h-14 px-2">
                    {BOTTOM_TABS.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.nameKey}
                                to={item.path}
                                className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1 rounded-xl transition-all duration-200 ${
                                    active ? 'text-accent' : 'text-[var(--text-dim)] active:scale-95'
                                }`}
                            >
                                <div className="relative flex flex-col items-center">
                                    <item.icon size={20} strokeWidth={active ? 2.5 : 1.8} className="transition-transform duration-200 group-hover:scale-105" />
                                    {active && (
                                        <span className="absolute -bottom-1 w-3 h-0.5 bg-accent rounded-full animate-fade-in" />
                                    )}
                                </div>
                                <span className="text-[9px] font-medium leading-none mt-1">
                                    {t[item.nameKey === 'myList' ? 'myList' : item.nameKey]}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};
