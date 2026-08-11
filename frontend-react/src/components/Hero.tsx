import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, Plus, Check } from 'lucide-react';
import type { Movie } from '../types';
import { useMyList } from '../hooks/useMyList';
import { useLang } from '../context/LanguageContext';

interface HeroProps {
    movies: Movie[];
}

export const Hero = ({ movies }: HeroProps) => {
    const [index, setIndex] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const { addToList, removeFromList, isSaved } = useMyList();
    const { t } = useLang();

    useEffect(() => {
        if (movies.length <= 1 || isFocused) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % movies.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [movies, isFocused]);

    // Helper to generate robust image URLs
    const getImageUrl = (url: string | undefined) => {
        if (!url) return '';
        let cleanUrl = url;
        if (url.startsWith('//')) {
            cleanUrl = `https:${url}`;
        } else if (!url.startsWith('http')) {
            cleanUrl = `https://${url}`;
        }
        return cleanUrl;
    };

    const getProxyUrl = (url: string | undefined, width: number) => {
        const raw = getImageUrl(url);
        if (!raw) return '';
        return `/api/images/proxy?url=${encodeURIComponent(raw)}&width=${width}`;
    };

    // Preload next 2 backdrop images
    const preloadImages = useMemo(() => {
        if (!movies || movies.length === 0) return [];
        return movies.slice(index + 1, index + 3).map(m => getImageUrl(m.backdrop || m.thumbnail));
    }, [movies, index]);

    useEffect(() => {
        preloadImages.forEach(src => {
            if (!src) return;
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = src;
            document.head.appendChild(link);
        });
    }, [preloadImages]);

    if (!movies || movies.length === 0) return null;

    const movie = movies[index];
    const saved = isSaved(movie.id);
    const backdropUrl = getProxyUrl(movie.backdrop || movie.thumbnail, 1280);

    const toggleList = () => {
        if (saved) removeFromList(movie.id);
        else addToList(movie);
    };

    return (
        <div className="relative w-full h-[60vh] sm:h-[70vh] md:h-[80vh] lg:h-[85vh] min-h-[460px] overflow-hidden group bg-[var(--bg-secondary)]">
            {/* Mamphim style backdrop: blurred ambient + masked cover + dotted texture */}
            <div className="absolute inset-0">
                <img
                    key={`bg-blur-${movie.id}`}
                    src={backdropUrl}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover object-top blur-[80px] opacity-20 scale-110"
                />
                <img
                    key={`bg-${movie.id}`}
                    src={backdropUrl}
                    alt={movie.title}
                    className="absolute top-0 right-0 h-full w-full lg:w-[75%] object-cover object-top sm:object-center transition-all duration-[1000ms] ease-in-out"
                    style={{
                        maskImage: 'linear-gradient(90deg, transparent 0px, rgba(0,0,0,0.3) 15%, #000 40% 80%, transparent 99%)',
                        WebkitMaskImage: 'linear-gradient(90deg, transparent 0px, rgba(0,0,0,0.3) 15%, #000 40% 80%, transparent 99%)',
                    }}
                    onError={(e) => {
                        if (movie.thumbnail && e.currentTarget.src !== getProxyUrl(movie.thumbnail, 1280)) {
                            e.currentTarget.src = getProxyUrl(movie.thumbnail, 1280);
                        }
                    }}
                />
                {/* Dotted texture overlay */}
                <div className="dotted-overlay absolute inset-0" />

                {/* Header Navigation Gradient */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none z-1" />

                {/* Left Text Protection */}
                <div className="absolute inset-y-0 left-0 w-full md:w-3/5 bg-gradient-to-r from-[var(--bg-primary)]/95 via-[var(--bg-primary)]/60 to-transparent pointer-events-none z-1" />

                {/* Bottom Seamless Transition into page background */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/70 to-transparent pointer-events-none z-1" />
            </div>

            {/* Movie Details Content */}
            <div className="absolute inset-0 z-10 flex items-end pb-12 md:pb-16 px-4 sm:px-8 lg:px-14">
                <div className="max-w-2xl space-y-4">
                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-xs md:text-sm text-white/90 font-medium drop-shadow-md animate-slide-up">
                        <span className="text-[var(--accent)] font-extrabold tracking-wide">
                            {movie.rating ? `★ ${movie.rating}` : '98% Match'}
                        </span>
                        <span className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                        <span>{movie.year || '2024'}</span>
                        {movie.quality && (
                            <>
                                <span className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                                <span className="border border-white/30 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-white">
                                    {movie.quality}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Movie Title */}
                    <h1
                        className="text-3xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.15] tracking-tight drop-shadow-[0_2px_1px_rgba(0,0,0,0.5)] line-clamp-2 animate-slide-up"
                        style={{ animationDelay: '100ms' }}
                    >
                        {movie.title}
                    </h1>

                    {/* Description */}
                    {movie.description && (
                        <p
                            className="hidden md:block text-white/90 text-sm md:text-base leading-relaxed line-clamp-3 max-w-xl font-light drop-shadow-lg animate-slide-up"
                            style={{ animationDelay: '250ms' }}
                            dangerouslySetInnerHTML={{ __html: movie.description }}
                        />
                    )}

                    {/* Mamphim touch area: gold circular play + action group */}
                    <div className="flex items-center gap-4 pt-2 animate-slide-up" style={{ animationDelay: '300ms' }}>
                        <Link
                            to={`/watch/${movie.slug}`}
                            tabIndex={0}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            className="btn-play-circle shadow-2xl shadow-black/60 focus-visible:ring-4 focus-visible:ring-accent"
                            aria-label={`Play ${movie.title}`}
                        >
                            <Play className="w-7 h-7 fill-current -mr-1" />
                        </Link>

                        <div className="flex items-center border-2 border-[var(--border-primary)] rounded-full overflow-hidden bg-black/20 backdrop-blur-sm hover:border-white/60 transition-colors">
                            <button
                                onClick={toggleList}
                                tabIndex={0}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                className="flex flex-col items-center justify-center gap-0.5 min-w-[68px] h-[50px] px-2 hover:bg-white/10 transition-colors"
                            >
                                {saved
                                    ? <Check className="w-5 h-5 text-[var(--accent)]" />
                                    : <Plus className="w-5 h-5 text-white" />}
                                <span className="text-[10px] text-white/70 leading-none">{saved ? t.inList : t.myList}</span>
                            </button>
                            <span className="w-0.5 h-7 bg-[var(--border-primary)]" />
                            <div className="flex flex-col items-center justify-center gap-0.5 min-w-[68px] h-[50px] px-2">
                                <span className="text-[10px] text-white/70 leading-none">{t.quality}</span>
                                <span className="text-xs font-bold text-white leading-none">
                                    {movie.quality || 'HD'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Carousel Dot Indicators */}
            <div className="absolute bottom-5 right-6 md:bottom-8 md:right-10 lg:bottom-10 lg:right-14 flex gap-2 z-20">
                {movies.map((_, i) => (
                    <button
                        key={i}
                        tabIndex={0}
                        onClick={() => setIndex(i)}
                        onFocus={() => { setIndex(i); setIsFocused(true); }}
                        onBlur={() => setIsFocused(false)}
                        className={`transition-all duration-300 rounded-full h-2 focus-visible:ring-2 focus-visible:ring-accent ${
                            i === index
                                ? 'w-8 bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/30'
                                : 'w-2 bg-white/30 hover:bg-white/60'
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};
