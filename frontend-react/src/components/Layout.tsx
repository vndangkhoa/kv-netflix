import type { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, Tv, Film, CalendarDays, User } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import Navbar from './Navbar';
import { Footer } from './Footer';

const LEFT_TABS = [
    { nameKey: 'series' as const, path: '/?category=phim-bo', icon: Tv },
    { nameKey: 'movies' as const, path: '/?category=phim-le', icon: Film },
];

const RIGHT_TABS = [
    { nameKey: 'mobileSchedule' as const, path: '/?category=phim-sap-chieu', icon: CalendarDays },
    { nameKey: 'mobileAccount' as const, path: '/my-list', icon: User },
];

export const Layout = ({ children }: { children: ReactNode }) => {
    const location = useLocation();
    const { t } = useLang();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/' && !location.search;
        return location.pathname + location.search === path;
    };

    const renderTab = ({ nameKey, path, icon: Icon }: { nameKey: string; path: string; icon: typeof Home }) => {
        const active = isActive(path);
        return (
            <Link
                key={nameKey}
                to={path}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-200 ${
                    active ? 'text-[var(--accent)]' : 'text-white/50 active:scale-95'
                }`}
            >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[9px] font-medium leading-none mt-1">
                    {t[nameKey as keyof typeof t] as string}
                </span>
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col transition-colors duration-300">
            {/* Top Shared Header */}
            <Navbar />

            {/* Main Content Area */}
            <main className="flex-1 pt-14 pb-24 lg:pb-0 min-h-[calc(100vh-3.5rem)]">
                {children}
            </main>

            {/* Floating pill bottom nav - Mobile & Tablet only (mamphim style) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-3 pointer-events-none safe-area-bottom">
                <div className="pointer-events-auto relative w-full max-w-[380px]">
                    {/* SVG wave top edge */}
                    <svg
                        viewBox="0 0 400 64"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute top-0 left-0 w-full h-[18px]"
                        aria-hidden
                    >
                        <path
                            d="M0,8 H150 Q158,8 164,14 Q172,24 180,34 Q188,44 200,44 Q212,44 220,34 Q228,24 236,14 Q242,8 250,8 H400 V64 H0 Z"
                            fill="#27272a"
                            fillOpacity="0.98"
                        />
                    </svg>

                    <div
                        className="relative flex items-center justify-around h-[60px] rounded-2xl shadow-2xl shadow-black/50 border border-white/5"
                        style={{ background: '#27272a', paddingTop: 6 }}
                    >
                        {LEFT_TABS.map(renderTab)}

                        {/* Raised center home button */}
                        <div className="flex-1 flex justify-center relative">
                            <Link
                                to="/"
                                className={`absolute -top-6 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-lg shadow-black/40 ${
                                    isActive('/')
                                        ? 'bg-[var(--accent-hover)] text-[var(--accent-contrast)]'
                                        : 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                                }`}
                                aria-label={t.home as string}
                            >
                                <Home size={22} strokeWidth={2.2} />
                            </Link>
                        </div>

                        {RIGHT_TABS.map(renderTab)}
                    </div>
                </div>
            </nav>

            {/* Desktop Footer (hidden on mobile to keep bottom nav clean) */}
            <div className="hidden lg:block">
                <Footer />
            </div>
        </div>
    );
};
