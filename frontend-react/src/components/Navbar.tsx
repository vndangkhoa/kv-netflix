import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, User, LogOut, Globe } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DevicePairPage from '../pages/DevicePairPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import type { Movie } from '../types';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Movie[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const [searchOpen, setSearchOpen] = useState(false);
    const [authModal, setAuthModal] = useState<'login' | 'register' | 'reset' | null>(null);
    const [showPairModal, setShowPairModal] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, logout } = useAuth();
    const { lang, t, toggleLang } = useLang();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/' && !location.search;
        return location.pathname + location.search === path;
    };

    const fetchSuggestions = useCallback(async (q: string) => {
        if (!q.trim()) {
            setSuggestions([]);
            return;
        }
        try {
            const res = await fetch(`/api/videos/search?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const data = await res.json();
                setSuggestions((data || []).slice(0, 8));
            }
        } catch {
            setSuggestions([]);
        }
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

    return (
        <>
        <nav className="fixed top-0 w-full z-50 bg-[var(--bg-secondary)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] font-sans transition-colors duration-300">
            <div className="w-full px-4 sm:px-6 lg:px-12">
                <div className="flex items-center justify-between h-14 gap-4">
                    {/* Left: Hamburger + Logo */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <Link to="/" className="flex-shrink-0">
                            <img src="/favicon.svg" alt="KV" className="w-7 h-7" />
                        </Link>
                        {/* Desktop nav items */}
                        <div className="hidden lg:flex items-center gap-1">
                            {NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.nameKey}
                                    to={item.path}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${isActive(item.path)
                                        ? 'text-[var(--text-primary)] bg-[var(--bg-tertiary)]'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    {t[item.nameKey as keyof typeof t]}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right: Search + Lang + Auth */}
                    <div className="flex items-center gap-2 ml-auto">
                        {/* Search - Mobile: icon toggle, Desktop: inline */}
                        <div ref={searchRef} className="relative">
                            {/* Mobile search toggle */}
                            <button
                                onClick={() => setSearchOpen(!searchOpen)}
                                className="md:hidden p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <Search size={18} />
                            </button>

                            {/* Desktop inline search */}
                            <div className="hidden md:block relative">
                                <form onSubmit={(e) => { e.preventDefault(); submitSearch(searchQuery); }} className="relative group">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => handleSearchInput(e.target.value)}
                                        onFocus={() => { if (searchQuery.trim()) setShowSuggestions(true); }}
                                        onKeyDown={handleKeyDown}
                                        placeholder={t.searchPlaceholder}
                                        className="w-64 sm:w-80 lg:w-[28rem] bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-full py-1.5 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 focus:w-80 sm:focus:w-96 lg:focus:w-[32rem] transition-all duration-300"
                                    />
                                    <Search className="absolute left-3 top-1.5 w-4 h-4 text-[var(--text-dim)] group-focus-within:text-cyan-500 dark:group-focus-within:text-cyan-400 transition-colors" />
                                </form>

                                {/* Desktop suggestions dropdown */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
                                        {suggestions.map((movie, idx) => (
                                            <button
                                                key={movie.id}
                                                onClick={() => submitSearch(movie.title)}
                                                onMouseEnter={() => setHighlightIdx(idx)}
                                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${idx === highlightIdx
                                                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                                    }`}
                                            >
                                                <Search className="w-3.5 h-3.5 text-[var(--text-dim)] flex-shrink-0" />
                                                <span className="truncate">{movie.title}</span>
                                                {movie.year && (
                                                    <span className="text-[var(--text-dim)] text-xs flex-shrink-0">{movie.year}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Mobile full-width search overlay */}
                            {searchOpen && (
                                <div className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] p-3">
                                    <div className="relative">
                                        <form onSubmit={(e) => { e.preventDefault(); submitSearch(searchQuery); setSearchOpen(false); }} className="relative group">
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => handleSearchInput(e.target.value)}
                                                onFocus={() => { if (searchQuery.trim()) setShowSuggestions(true); }}
                                                onKeyDown={handleKeyDown}
                                                placeholder={t.searchPlaceholder}
                                                autoFocus
                                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-full py-2 pl-9 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                            />
                                            <Search className="absolute left-3 top-2 w-4 h-4 text-[var(--text-dim)]" />
                                            <button
                                                type="button"
                                                onClick={() => { setSearchOpen(false); setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }}
                                                className="absolute right-3 top-2 text-[var(--text-dim)] hover:text-[var(--text-primary)]"
                                            >
                                                <X size={16} />
                                            </button>
                                        </form>

                                        {/* Mobile suggestions dropdown */}
                                        {showSuggestions && suggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
                                                {suggestions.map((movie, idx) => (
                                                    <button
                                                        key={movie.id}
                                                        onClick={() => { submitSearch(movie.title); setSearchOpen(false); }}
                                                        onMouseEnter={() => setHighlightIdx(idx)}
                                                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${idx === highlightIdx
                                                            ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                                                            }`}
                                                    >
                                                        <Search className="w-3.5 h-3.5 text-[var(--text-dim)] flex-shrink-0" />
                                                        <span className="truncate">{movie.title}</span>
                                                        {movie.year && (
                                                            <span className="text-[var(--text-dim)] text-xs flex-shrink-0">{movie.year}</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Language toggle */}
                        <button
                            onClick={toggleLang}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
                            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
                        >
                            <Globe size={14} />
                            <span className="hidden sm:inline">{lang === 'vi' ? 'EN' : 'VI'}</span>
                        </button>

                        {/* Auth buttons */}
                        {isAuthenticated ? (
                            <div className="hidden sm:flex items-center gap-2">
                                <button onClick={() => setShowPairModal(true)} className="text-xs text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors px-2 py-1">
                                    {t.pairDevice}
                                </button>
                                <Link to="/my-list" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 truncate max-w-[100px]" title={user?.name || user?.email}>
                                    {user?.name || user?.email}
                                </Link>
                                <button
                                    onClick={() => { logout(); navigate('/'); }}
                                    className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                    title={t.logout}
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setAuthModal('login')}
                                className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                                <User size={14} />
                                {t.login}
                            </button>
                        )}

                    </div>
                </div>
            </div>

            {/* Mobile menu dropdown */}
            {isMenuOpen && (
                <div className="lg:hidden bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)] max-h-[70vh] overflow-y-auto">
                    <div className="px-4 py-3 space-y-1">
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.nameKey}
                                to={item.path}
                                onClick={() => setIsMenuOpen(false)}
                                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.path) ? 'text-[var(--text-primary)] bg-[var(--bg-elevated)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}
                            >
                                {t[item.nameKey as keyof typeof t]}
                            </Link>
                        ))}

                        {/* Language toggle mobile */}
                        <button
                            onClick={toggleLang}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                        >
                            <Globe size={14} />
                            {lang === 'vi' ? 'English' : 'Tiếng Việt'}
                        </button>

                        {/* Mobile auth links */}
                        <div className="border-t border-[var(--border-primary)] pt-2 mt-2 space-y-1">
                            {isAuthenticated ? (
                                <>
                                    <div className="px-3 py-1 text-xs text-[var(--text-dim)]">
                                        {user?.name || user?.email}
                                    </div>
                                    <button onClick={() => { setShowPairModal(true); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
                                        {t.pairDevice}
                                    </button>
                                    <button onClick={() => { logout(); setIsMenuOpen(false); navigate('/'); }} className="block w-full text-left px-3 py-2 rounded-md text-sm text-red-500 hover:bg-[var(--bg-elevated)]">
                                        {t.logout}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => { setAuthModal('login'); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
                                        {t.login}
                                    </button>
                                    <button onClick={() => { setAuthModal('register'); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
                                        {t.register}
                                    </button>
                                    <Link to="/device-login" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">
                                        {t.enterPairCode}
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>

        {/* Auth modals */}
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
