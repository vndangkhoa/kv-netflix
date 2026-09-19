import React, { useRef, useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { GENRES } from '../constants';
import { useLang } from '../context/LanguageContext';

export const MobileGenreBar: React.FC = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const currentCategory = searchParams.get('category');
    const { lang } = useLang();
    const activeRef = useRef<HTMLAnchorElement | null>(null);

    // Auto-scroll active chip horizontally into view on selection change
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        }
    }, [currentCategory, location.pathname]);

    // Check if "All" is active (home without category or query)
    const isAllActive = !currentCategory && location.pathname === '/' && !location.search;

    return (
        <div className="lg:hidden w-full overflow-x-auto scrollbar-hide py-2 px-3 sm:px-4 flex items-center gap-1.5 bg-[#12141d]/90 backdrop-blur-md border-b border-white/5 sticky top-14 z-20 transition-all">
            {/* "Tất cả" chip */}
            <Link
                to="/"
                ref={isAllActive ? activeRef : null}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                    isAllActive
                        ? 'bg-[var(--accent,#ffd875)] text-[#191b24] shadow-md shadow-[#ffd875]/25 font-bold'
                        : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                }`}
            >
                <Sparkles size={13} className={isAllActive ? 'text-[#191b24]' : 'text-gray-400'} />
                <span>{lang === 'vi' ? 'Tất cả' : 'All'}</span>
            </Link>

            {/* Genre chips */}
            {GENRES.map((g) => {
                const isActive =
                    currentCategory === g.id ||
                    location.pathname === `/the-loai/${g.id}`;
                const Icon = g.icon;

                return (
                    <Link
                        key={g.id}
                        to={`/?category=${g.id}`}
                        ref={isActive ? activeRef : null}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
                            isActive
                                ? 'bg-[var(--accent,#ffd875)] text-[#191b24] shadow-md shadow-[#ffd875]/25 font-bold'
                                : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
                        }`}
                    >
                        <Icon size={13} className={isActive ? 'text-[#191b24]' : 'text-[var(--accent,#ffd875)]'} />
                        <span>{lang === 'vi' ? g.vi : g.en}</span>
                    </Link>
                );
            })}
        </div>
    );
};

export default MobileGenreBar;
