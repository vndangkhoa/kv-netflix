import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, X, User, Globe, ChevronDown, Download, LayoutDashboard, Tv, Play, ChevronRight, SlidersHorizontal, Sparkles } from 'lucide-react';
import { CATEGORIES, GENRES, COUNTRIES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { registerWebOSBackHandler } from '../hooks/useWebOS';
import { AppDownloadModal } from './AppDownloadModal';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DevicePairPage from '../pages/DevicePairPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import type { Movie } from '../types';

interface SearchSuggestionsProps {
    suggestions: Movie[];
    highlightIdx: number;
    onSelect: (title: string) => void;
    onHover: (idx: number) => void;
}

const SearchSuggestions = ({ suggestions, highlightIdx, onSelect, onHover }: SearchSuggestionsProps) => (
    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
        {suggestions.map((movie, idx) => (
            <button
                key={movie.id}
                onClick={() => onSelect(movie.title)}
                onMouseEnter={() => onHover(idx)}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${idx === highlightIdx ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
            >
                <Search className="w-3.5 h-3.5 text-[var(--text-dim)] flex-shrink-0" />
                <span className="truncate">{movie.title}</span>
                {movie.year && <span className="text-[var(--text-dim)] text-xs flex-shrink-0">{movie.year}</span>}
            </button>
        ))}
    </div>
);

const Navbar = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Movie[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const [searchOpen, setSearchOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [showCountries, setShowCountries] = useState(false);
    const [authModal, setAuthModal] = useState<'login' | 'register' | 'reset' | null>(null);
    const [showPairModal, setShowPairModal] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
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
    const { layoutTheme, toggleLayoutTheme } = useTheme();

    const langKey = lang === 'vi' ? 'vi' : 'en';

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/' && !location.search;
        return location.pathname + location.search === path;
    };

    const fetchSuggestions = useCallback(async (q: string) => {
        if (!q.trim()) { setSuggestions([]); return; }
        try {
            const res = await fetch(`/api/videos/search?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const data: Movie[] = (await res.json()) || [];
                data.sort((a, b) => (b.year || 0) - (a.year || 0));
                setSuggestions(data.slice(0, 8));
            }
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
            if (e.key === 'Escape') {
                setShowMore(false);
                setShowCountries(false);
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        return registerWebOSBackHandler(() => {
            if (authModal) { setAuthModal(null); return true; }
            if (showPairModal) { setShowPairModal(false); return true; }
            if (showDownloadModal) { setShowDownloadModal(false); return true; }
            if (searchOpen) { setSearchOpen(false); return true; }
            if (showSuggestions) { setShowSuggestions(false); return true; }
            if (mobileMenuOpen) { setMobileMenuOpen(false); return true; }
            if (showMore) { setShowMore(false); return true; }
            if (showCountries) { setShowCountries(false); return true; }
            return false;
        });
    }, [authModal, showPairModal, showDownloadModal, searchOpen, showSuggestions, mobileMenuOpen, showMore, showCountries]);

    // Close dropdowns whenever the route changes (URL is an external system).
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        setShowMore(false);
        setShowCountries(false);
        setMobileMenuOpen(false);
    }, [location.pathname, location.search]);
    /* eslint-enable react-hooks/set-state-in-effect */

    return (
        <>
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
            scrolled 
                ? 'bg-[#0f111a] border-b border-white/5 shadow-xl' 
                : 'bg-gradient-to-b from-[#191b24] via-[#191b24]/80 to-transparent'
        }`}>
            <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
                <div className="flex items-center justify-between h-16 gap-3">
                    {/* Left: RoPhim Logo + Search */}
                    <div className="flex items-center gap-3 xl:gap-5 min-w-0">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                        >
                            <div className="w-5 flex flex-col gap-1">
                                <span className={`block h-0.5 w-full bg-white transition-transform duration-200 ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                                <span className={`block h-0.5 w-4/5 bg-white transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                                <span className={`block h-0.5 w-full bg-white transition-transform duration-200 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                            </div>
                        </button>

                        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 active:scale-95 transition-transform group">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#fecf59] to-[#fff1cc] flex items-center justify-center shadow-lg shadow-[#fecf59]/25 group-hover:scale-105 transition-transform">
                                <span className="font-black text-[#191b24] text-xs tracking-tighter">KV</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-white tracking-tight leading-none">KV-Netflix</span>
                                <span className="text-[9px] text-[#ffd875] tracking-wider leading-none mt-0.5 font-medium">Phim hay chất lượng cao</span>
                            </div>
                        </Link>

                        {/* RoPhim Desktop Search Bar */}
                        <div ref={searchRef} className="relative hidden md:block">
                            <form onSubmit={(e) => { e.preventDefault(); submitSearch(searchQuery); }} className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 group-focus-within:text-[var(--accent)] transition-colors pointer-events-none" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchInput(e.target.value)}
                                    onFocus={() => { if (searchQuery.trim()) setShowSuggestions(true); }}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Tìm kiếm phim, diễn viên"
                                    className="w-52 lg:w-64 xl:w-72 bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.15] border border-transparent focus:border-white/20 rounded-md py-1.5 pl-9 pr-3 text-xs md:text-sm text-white placeholder-white/50 focus:outline-none transition-all duration-200"
                                />
                            </form>
                            {showSuggestions && suggestions.length > 0 && (
                                <SearchSuggestions
                                    suggestions={suggestions}
                                    highlightIdx={highlightIdx}
                                    onSelect={(title) => submitSearch(title)}
                                    onHover={setHighlightIdx}
                                />
                            )}
                        </div>
                    </div>

                    {/* Center / Navigation Menu - lg+ only */}
                    <div className="hidden lg:flex items-center gap-1 xl:gap-2 flex-shrink-0">
                        <Link
                            to="/danh-sach"
                            className={`text-xs xl:text-sm font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                                isActive('/danh-sach')
                                    ? 'text-[var(--accent)]'
                                    : 'text-white hover:text-[var(--accent)]'
                            }`}
                        >
                            Chủ Đề
                        </Link>

                        {/* Thể loại Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowMore(!showMore); setShowCountries(false); }}
                                className={`flex items-center gap-1 text-xs xl:text-sm font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                                    showMore || GENRES.some(g => isActive(`/the-loai/${g.id}`))
                                        ? 'text-[var(--accent)]'
                                        : 'text-white hover:text-[var(--accent)]'
                                }`}
                            >
                                <span>Thể loại</span>
                                <ChevronDown size={12} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        <Link
                            to="/phim-le"
                            className={`text-xs xl:text-sm font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                                isActive('/phim-le')
                                    ? 'text-[var(--accent)]'
                                    : 'text-white hover:text-[var(--accent)]'
                            }`}
                        >
                            Phim Lẻ
                        </Link>

                        <Link
                            to="/phim-bo"
                            className={`text-xs xl:text-sm font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                                isActive('/phim-bo')
                                    ? 'text-[var(--accent)]'
                                    : 'text-white hover:text-[var(--accent)]'
                            }`}
                        >
                            Phim Bộ
                        </Link>

                        {/* Quốc gia Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowCountries(!showCountries); setShowMore(false); }}
                                className={`flex items-center gap-1 text-xs xl:text-sm font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                                    showCountries || COUNTRIES.some(c => isActive(`/quoc-gia/${c.id}`))
                                        ? 'text-[var(--accent)]'
                                        : 'text-white hover:text-[var(--accent)]'
                                }`}
                            >
                                <span>Quốc gia</span>
                                <ChevronDown size={12} className={`transition-transform ${showCountries ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        <Link
                            to="/dien-vien"
                            className={`text-xs xl:text-sm font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                                isActive('/dien-vien')
                                    ? 'text-[var(--accent)]'
                                    : 'text-white hover:text-[var(--accent)]'
                            }`}
                        >
                            Diễn Viên
                        </Link>

                        <Link
                            to="/lich-chieu"
                            className={`text-xs xl:text-sm font-medium px-2.5 py-1.5 rounded-md transition-colors ${
                                isActive('/lich-chieu')
                                    ? 'text-[var(--accent)]'
                                    : 'text-white hover:text-[var(--accent)]'
                            }`}
                        >
                            Lịch Chiếu
                        </Link>
                    </div>

                    {/* Right: Search mobile + Utility controls + Member button */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Mobile search toggle button */}
                        <button
                            onClick={() => setSearchOpen(!searchOpen)}
                            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                            aria-label="Search"
                        >
                            <Search size={18} />
                        </button>

                        {searchOpen && (
                            <div className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-[#0f111a] border-b border-white/10 p-3 shadow-2xl">
                                <div className="relative">
                                    <form onSubmit={(e) => { e.preventDefault(); submitSearch(searchQuery); setSearchOpen(false); }}>
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => handleSearchInput(e.target.value)}
                                            onFocus={() => { if (searchQuery.trim()) setShowSuggestions(true); }}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Tìm kiếm phim, diễn viên"
                                            autoFocus
                                            className="w-full bg-white/10 border border-white/20 rounded-md py-2 pl-9 pr-10 text-sm text-white placeholder-white/50 focus:outline-none"
                                        />
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/50" />
                                        <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery(''); setSuggestions([]); setShowSuggestions(false); }} className="absolute right-3 top-2.5 text-white/50 hover:text-white">
                                            <X size={16} />
                                        </button>
                                    </form>
                                    {showSuggestions && suggestions.length > 0 && (
                                        <SearchSuggestions
                                            suggestions={suggestions}
                                            highlightIdx={highlightIdx}
                                            onSelect={(title) => { submitSearch(title); setSearchOpen(false); }}
                                            onHover={setHighlightIdx}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Download App & Device Pairing icons */}
                        <button
                            onClick={() => setShowDownloadModal(true)}
                            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors hidden sm:flex items-center gap-1"
                            title="Tải ứng dụng"
                        >
                            <Download size={16} />
                        </button>

                        {isAuthenticated && (
                            <button
                                onClick={() => setShowPairModal(true)}
                                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                title={t.pairDevice as string}
                            >
                                <Tv size={16} />
                            </button>
                        )}

                        {/* RoPhim "Thành viên" White Pill Button */}
                        {isAuthenticated ? (
                            <Link
                                to="/my-list"
                                className="bg-white hover:bg-white/90 text-[#191b24] px-3.5 py-1.5 rounded-full font-medium text-xs md:text-sm flex items-center gap-1.5 shadow transition-all active:scale-95"
                                title={user?.name || user?.email}
                            >
                                <User size={14} className="text-[#191b24]" />
                                <span className="truncate max-w-[90px]">{user?.name || 'Thành viên'}</span>
                            </Link>
                        ) : (
                            <button
                                onClick={() => setAuthModal('login')}
                                className="bg-white hover:bg-white/90 text-[#191b24] px-3.5 py-1.5 rounded-full font-medium text-xs md:text-sm flex items-center gap-1.5 shadow transition-all active:scale-95"
                            >
                                <User size={14} className="text-[#191b24]" />
                                <span>Thành viên</span>
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

        {/* Countries sub-navbar - lg+ only */}
        {showCountries && (
            <>
                <div className="fixed inset-0 top-14 z-40 animate-fade-in" onClick={() => setShowCountries(false)} />
                <div className="hidden lg:flex fixed top-14 left-0 right-0 z-50 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] shadow-md">
                    <div className="flex gap-0.5 px-4 sm:px-6 lg:px-12 py-2 overflow-x-auto scrollbar-hide min-w-0 flex-1">
                        {COUNTRIES.map(c => {
                            const active = isActive(`/?category=${c.id}`);
                            return (
                                <Link
                                    key={c.id}
                                    to={`/?category=${c.id}`}
                                    onClick={() => setShowCountries(false)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm whitespace-nowrap rounded-lg transition-colors ${
                                        active
                                            ? 'text-accent bg-accent-bg'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                    }`}
                                >
                                    {c[langKey]}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-[70] flex">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in-backdrop"
                    onClick={() => setMobileMenuOpen(false)}
                />

                {/* Drawer Panel */}
                <aside className="relative w-[85vw] max-w-[340px] bg-[#12141d] border-r border-white/10 h-full flex flex-col z-10 shadow-2xl animate-slide-in-left">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                        <Link
                            to="/"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-2.5"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#fecf59] to-[#fff1cc] flex items-center justify-center shadow-md">
                                <span className="font-black text-[#191b24] text-[10px] tracking-tighter">KV</span>
                            </div>
                            <span className="text-base font-black text-white tracking-tight">KV-Netflix</span>
                        </Link>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            aria-label="Close menu"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Scrollable Navigation Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
                        {/* 1. Khám Phá */}
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 px-1">
                                Khám Phá
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                <Link
                                    to="/danh-sach"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                        isActive('/danh-sach')
                                            ? 'bg-[var(--accent)] text-[#191b24] border-[var(--accent)] font-bold'
                                            : 'bg-white/5 text-gray-200 border-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <SlidersHorizontal size={14} className="text-[var(--accent)]" />
                                        <span>Chủ Đề & Lọc</span>
                                    </div>
                                    <ChevronRight size={13} className="opacity-60" />
                                </Link>
                                <Link
                                    to="/lich-chieu"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                        isActive('/lich-chieu')
                                            ? 'bg-[var(--accent)] text-[#191b24] border-[var(--accent)] font-bold'
                                            : 'bg-white/5 text-gray-200 border-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    <span>Lịch Chiếu</span>
                                    <ChevronRight size={13} className="opacity-60" />
                                </Link>
                                <Link
                                    to="/phim-le"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                        isActive('/phim-le')
                                            ? 'bg-[var(--accent)] text-[#191b24] border-[var(--accent)] font-bold'
                                            : 'bg-white/5 text-gray-200 border-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    <span>Phim Lẻ</span>
                                    <ChevronRight size={13} className="opacity-60" />
                                </Link>
                                <Link
                                    to="/phim-bo"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                        isActive('/phim-bo')
                                            ? 'bg-[var(--accent)] text-[#191b24] border-[var(--accent)] font-bold'
                                            : 'bg-white/5 text-gray-200 border-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    <span>Phim Bộ</span>
                                    <ChevronRight size={13} className="opacity-60" />
                                </Link>
                                <Link
                                    to="/dien-vien"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all col-span-2 ${
                                        isActive('/dien-vien')
                                            ? 'bg-[var(--accent)] text-[#191b24] border-[var(--accent)] font-bold'
                                            : 'bg-white/5 text-gray-200 border-white/5 hover:bg-white/10'
                                    }`}
                                >
                                    <span>Diễn Viên Nổi Bật</span>
                                    <ChevronRight size={13} className="opacity-60" />
                                </Link>
                            </div>
                        </div>

                        {/* 2. Thể loại phim */}
                        <div>
                            <div className="flex items-center justify-between mb-2.5 px-1">
                                <span className="text-[10px] font-bold text-[var(--accent,#ffd875)] uppercase tracking-wider">
                                    Thể Loại Phim ({GENRES.length})
                                </span>
                                <Link
                                    to="/danh-sach"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-[10px] text-gray-400 hover:text-white"
                                >
                                    Tất cả &rarr;
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {GENRES.map(g => {
                                    const active =
                                        location.search.includes(`category=${g.id}`) ||
                                        location.pathname === `/the-loai/${g.id}`;
                                    const Icon = g.icon;
                                    return (
                                        <Link
                                            key={g.id}
                                            to={`/?category=${g.id}`}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium transition-all ${
                                                active
                                                    ? 'bg-[var(--accent)] text-[#191b24] font-bold shadow-md shadow-[var(--accent)]/20'
                                                    : 'bg-white/[0.04] text-gray-300 hover:bg-white/10 hover:text-white active:scale-95'
                                            }`}
                                        >
                                            <Icon size={14} className={active ? 'text-[#191b24]' : 'text-[var(--accent,#ffd875)] flex-shrink-0'} />
                                            <span className="truncate">{g[langKey]}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 3. Quốc gia */}
                        <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2 px-1">
                                Quốc Gia
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                                {COUNTRIES.map(c => {
                                    const active =
                                        location.search.includes(`category=${c.id}`) ||
                                        location.pathname === `/quoc-gia/${c.id}`;
                                    return (
                                        <Link
                                            key={c.id}
                                            to={`/?category=${c.id}`}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-all ${
                                                active
                                                    ? 'bg-[var(--accent)] text-[#191b24] font-bold shadow-md'
                                                    : 'bg-white/[0.04] text-gray-300 hover:bg-white/10 hover:text-white active:scale-95'
                                            }`}
                                        >
                                            <span className="truncate">{c[langKey]}</span>
                                            <ChevronRight size={12} className="opacity-40" />
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 4. Tiện ích & Tài khoản */}
                        <div className="pt-3 border-t border-white/10 space-y-2">
                            {isAuthenticated ? (
                                <Link
                                    to="/my-list"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-200 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <User size={14} className="text-[var(--accent)]" />
                                        <span>Tài khoản ({user?.name || user?.email || 'Thành viên'})</span>
                                    </div>
                                    <ChevronRight size={13} className="opacity-60" />
                                </Link>
                            ) : (
                                <button
                                    onClick={() => { setMobileMenuOpen(false); setAuthModal('login'); }}
                                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--accent)] text-[#191b24] font-bold text-xs shadow-md active:scale-95 transition-all"
                                >
                                    <User size={14} />
                                    <span>Đăng nhập / Đăng ký</span>
                                </button>
                            )}

                            <button
                                onClick={() => { setMobileMenuOpen(false); setShowDownloadModal(true); }}
                                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors"
                            >
                                <Download size={14} className="text-[var(--accent)]" />
                                <span>Tải ứng dụng KV-Netflix</span>
                            </button>
                            {isAuthenticated && (
                                <button
                                    onClick={() => { setMobileMenuOpen(false); setShowPairModal(true); }}
                                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors"
                                >
                                    <Tv size={14} className="text-[var(--accent)]" />
                                    <span>{t.pairDevice as string}</span>
                                </button>
                            )}
                            <button
                                onClick={toggleLang}
                                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Globe size={14} className="text-[var(--accent)]" />
                                    <span>Ngôn ngữ / Language</span>
                                </div>
                                <span className="uppercase text-[11px] font-bold text-[var(--accent)] bg-white/10 px-2 py-0.5 rounded">
                                    {lang}
                                </span>
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
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
        <AppDownloadModal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} />
        </>
    );
};

export default Navbar;
