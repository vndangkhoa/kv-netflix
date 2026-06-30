import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, X, User, Globe, ChevronDown } from 'lucide-react';
import { CATEGORIES, GENRES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DevicePairPage from '../pages/DevicePairPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import type { Movie } from '../types';

const Navbar = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Movie[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const [searchOpen, setSearchOpen] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [authModal, setAuthModal] = useState<'login' | 'register' | 'reset' | null>(null);
    const [showPairModal, setShowPairModal] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const genreScrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Track page scroll to toggle solid background
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const el = genreScrollRef.current;
        if (!el) return;
        const check = () => {
            setCanScrollLeft(el.scrollLeft > 4);
            setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
        };
        requestAnimationFrame(check);
        el.addEventListener('scroll', check);
        const ro = new ResizeObserver(check);
        ro.observe(el);
        return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
    }, [showMore]);

    const scrollGenres = (dir: 'left' | 'right') => {
        genreScrollRef.current?.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
    };

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated } = useAuth();
    const { lang, t, toggleLang } = useLang();

    const langKey = lang === 'vi' ? 'vi' : 'en';

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/' && !location.search;
        return location.pathname + location.search === path;
    };

    const fetchSuggestions = useCallback(async (q: string) => {
        if (!q.trim()) { setSuggestions([]); return; }
        try {
            const res = await fetch(`/api/videos/search?q=${encodeURIComponent(q)}`);
            if (res.ok) setSuggestions(((await res.json()) || []).slice(0, 8));
        } catch { setSuggestions([]); }
    }, []);

    const handleSearchInput = (value: string) => {
        setSearchQuery(value);
        setHighlightIdx(-1);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
        setShowSuggestions(true);
    };

    const submitSearch = (q: string) => {
        const trimmed = (q || searchQuery).trim();
        if (trimmed) {
            navigate(`/?q=${encodeURIComponent(trimmed)}`);
            setShowSuggestions(false);
            setSearchQuery('');
            setSuggestions([]);
            inputRef.current?.blur();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === 'Enter' && highlightIdx >= 0) {
            e.preventDefault();
            submitSearch(suggestions[highlightIdx].title);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            inputRef.current?.blur();
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showMore) setShowMore(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showMore]);

    useEffect(() => {
        setShowMore(false);
    }, [location.pathname, location.search]);

    const renderSearchSuggestions = (onSelect: (title: string) => void) => (
        showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
                {suggestions.map((movie, idx) => (
                    <button
                        key={movie.id}
                        onClick={() => onSelect(movie.title)}
                        onMouseEnter={() => setHighlightIdx(idx)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${idx === highlightIdx ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                    >
                        <Search className="w-3.5 h-3.5 text-[var(--text-dim)] flex-shrink-0" />
                        <span className="truncate">{movie.title}</span>
                        {movie.year && <span className="text-[var(--text-dim)] text-xs flex-shrink-0">{movie.year}</span>}
                    </button>
                ))}
            </div>
        )
    );

    return (
        <>
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
            scrolled 
                ? 'bg-[var(--bg-secondary)]/95 backdrop-blur-md border-[var(--border-subtle)] shadow-lg shadow-black/10' 
                : 'bg-transparent border-transparent'
        }`}>
            <div className="w-full px-4 sm:px-6 lg:px-12">
                <div className="flex items-center justify-between h-14 gap-3">
                    {/* Left: Logo + Desktop Nav */}
                    <div className="flex items-center gap-1 min-w-0">
                        <Link to="/" className="flex items-center gap-2 mr-2 flex-shrink-0 active:scale-95 transition-transform">
                            <img src="/favicon.svg" alt="KV" className="w-7 h-7" />
                            <span className="text-sm font-bold text-[var(--text-primary)] tracking-wide">KV</span>
                        </Link>

                        {/* Desktop nav - lg+ only */}
                        <div className="hidden lg:flex items-center gap-0.5 flex-shrink-0">
                            {CATEGORIES.filter(c => c.id !== 'my-list').map(c => (
                                <Link
                                    key={c.id}
                                    to={c.path}
                                    className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                        isActive(c.path)
                                            ? 'text-accent bg-accent-bg'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                    }`}
                                >
                                    <c.icon size={14} />
                                    {t[c.nameKey as keyof typeof t] as string}
                                </Link>
                            ))}

                            <Link
                                to="/my-list"
                                className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                    isActive('/my-list')
                                        ? 'text-accent bg-accent-bg'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                }`}
                            >
                                {t.myAccount as string}
                            </Link>

                            {/* Genres toggle */}
                            <button
                                onClick={() => setShowMore(!showMore)}
                                className={`flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                    showMore || GENRES.some(g => isActive(`/?category=${g.id}`))
                                        ? 'text-accent bg-accent-bg'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                }`}
                            >
                                <span>Thể loại</span>
                                <ChevronDown size={12} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Right: Search + Language + Auth */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Search icon & input */}
                        <div ref={searchRef} className="relative">
                            <button
                                onClick={() => setSearchOpen(!searchOpen)}
                                className="lg:hidden p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90"
                                aria-label="Search"
                            >
                                <Search size={18} />
                            </button>

                            <div className="hidden lg:block relative">
                                <form onSubmit={(e) => { e.preventDefault(); submitSearch(searchQuery); }} className="relative group">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => handleSearchInput(e.target.value)}
                                        onFocus={() => { if (searchQuery.trim()) setShowSuggestions(true); }}
                                        onKeyDown={handleKeyDown}
                                        placeholder={t.searchPlaceholder as string}
                                        className="w-48 xl:w-64 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl py-1.5 pl-8 pr-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all duration-300"
                                    />
                                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[var(--text-dim)] group-focus-within:text-accent transition-colors" />
                                </form>
                                {renderSearchSuggestions((title) => submitSearch(title))}
                            </div>

                            {searchOpen && (
                                <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-[var(--bg-secondary)]/95 backdrop-blur-md border-b border-[var(--border-primary)] p-3 shadow-xl">
                                    <div className="relative">
                                        <form onSubmit={(e) => { e.preventDefault(); submitSearch(searchQuery); setSearchOpen(false); }}>
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => handleSearchInput(e.target.value)}
                                                onFocus={() => { if (searchQuery.trim()) setShowSuggestions(true); }}
                                                onKeyDown={handleKeyDown}
                                                placeholder={t.searchPlaceholder as string}
                                                autoFocus
                                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-xl py-2 pl-9 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-accent/40"
                                            />
                                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-dim)]" />
                                            <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }} className="absolute right-3 top-2.5 text-[var(--text-dim)] hover:text-[var(--text-primary)]">
                                                <X size={16} />
                                            </button>
                                        </form>
                                        {renderSearchSuggestions((title) => { submitSearch(title); setSearchOpen(false); })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Language Selector (Globe icon) */}
                        <button
                            onClick={toggleLang}
                            className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90"
                            title={lang === 'vi' ? 'English' : 'Tiếng Việt'}
                        >
                            <Globe size={18} />
                        </button>

                        {/* User Login/Account */}
                        {isAuthenticated ? (
                            <Link
                                to="/my-list"
                                className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-all active:scale-95 truncate max-w-[120px]"
                                title={user?.name || user?.email}
                            >
                                <div className="w-6 h-6 rounded-full bg-accent-bg flex items-center justify-center border border-accent/20">
                                    <User size={13} className="text-accent" />
                                </div>
                                <span className="hidden md:inline truncate max-w-[80px]">{user?.name || 'User'}</span>
                            </Link>
                        ) : (
                            <button
                                onClick={() => setAuthModal('login')}
                                className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-accent hover:bg-accent-hover px-3.5 py-2 rounded-xl transition-all duration-200 shadow-lg shadow-accent/10 hover:shadow-accent/25 active:scale-95"
                            >
                                <User size={13} />
                                <span className="hidden sm:inline">{t.login as string}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>

        {/* Genre sub-navbar - lg+ only */}
        {showMore && (
            <>
                <div className="fixed inset-0 top-14 z-40 animate-fade-in" onClick={() => setShowMore(false)} />
                <div className="hidden lg:flex fixed top-14 left-0 right-0 z-50 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] shadow-md">
                    <div className="relative flex items-center w-full">
                        {canScrollLeft && (
                            <button
                                onClick={() => scrollGenres('left')}
                                className="absolute left-0 z-10 h-full flex items-center justify-center pl-2 pr-6 bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-transparent text-accent hover:text-accent-hover"
                                aria-label="Scroll left"
                            >
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 shadow-lg hover:bg-black/60 transition-colors">
                                    <ChevronDown size={20} className="rotate-90" />
                                </span>
                            </button>
                        )}
                        <div ref={genreScrollRef} className="flex gap-0.5 px-4 sm:px-6 lg:px-12 py-2 overflow-x-auto scrollbar-hide min-w-0 flex-1">
                            {GENRES.map(g => {
                                const active = isActive(`/?category=${g.id}`);
                                return (
                                    <Link
                                        key={g.id}
                                        to={`/?category=${g.id}`}
                                        onClick={() => setShowMore(false)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm whitespace-nowrap rounded-lg transition-colors ${
                                            active
                                                ? 'text-accent bg-accent-bg'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                        }`}
                                    >
                                        <g.icon size={14} />
                                        {g[langKey]}
                                    </Link>
                                );
                            })}
                        </div>
                        {canScrollRight && (
                            <button
                                onClick={() => scrollGenres('right')}
                                className="absolute right-0 z-10 h-full flex items-center justify-center pl-6 pr-2 bg-gradient-to-l from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-transparent text-accent hover:text-accent-hover"
                                aria-label="Scroll right"
                            >
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 shadow-lg hover:bg-black/60 transition-colors">
                                    <ChevronDown size={20} className="-rotate-90" />
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </>
        )}

        {authModal === 'login' && (
            <LoginPage onClose={() => setAuthModal(null)} onSwitchToRegister={() => setAuthModal('register')} onSwitchToReset={() => setAuthModal('reset')} />
        )}
        {authModal === 'register' && (
            <RegisterPage onClose={() => setAuthModal(null)} onSwitchToLogin={() => setAuthModal('login')} />
        )}
        {authModal === 'reset' && (
            <ResetPasswordPage onClose={() => setAuthModal(null)} onSwitchToLogin={() => setAuthModal('login')} />
        )}
        {showPairModal && (
            <DevicePairPage onClose={() => setShowPairModal(false)} />
        )}
        </>
    );
};

export default Navbar;
