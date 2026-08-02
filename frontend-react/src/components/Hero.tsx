import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, Plus, Check } from 'lucide-react';
import type { Movie } from '../types';
import { useMyList } from '../hooks/useMyList';

interface HeroProps {
    movies: Movie[];
}

export const Hero = ({ movies }: HeroProps) => {
    const [index, setIndex] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const { addToList, removeFromList, isSaved } = useMyList();

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

    const toggleList = () => {
        if (saved) removeFromList(movie.id);
        else addToList(movie);
    };

    return (
        <div className="relative w-full h-[60vh] sm:h-[70vh] md:h-[80vh] lg:h-[85vh] min-h-[460px] overflow-hidden group bg-[#050507]">
            {/* Backdrop Image & Apple TV Style Vignettes */}
            <div className="absolute inset-0">
                <img
                    key={`bg-${movie.id}`}
                    src={getProxyUrl(movie.backdrop || movie.thumbnail, 1280)}
                    alt={movie.title}
                    className="w-full h-full object-cover object-top sm:object-center transition-all duration-[1000ms] ease-in-out scale-102"
                    onError={(e) => {
                        if (movie.thumbnail && e.currentTarget.src !== getProxyUrl(movie.thumbnail, 1280)) {
                            e.currentTarget.src = getProxyUrl(movie.thumbnail, 1280);
                        }
                    }}
                />

                {/* Apple TV+ Style Vignette Masks (No light/white fog cutting into the picture) */}
                {/* 1. Header Navigation Gradient */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none z-1" />

                {/* 2. Left Text Protection Vignette (Left 60% only, leaving middle & right artwork 100% clear) */}
                <div className="absolute inset-y-0 left-0 w-full md:w-3/5 bg-gradient-to-r from-black/90 via-black/50 to-transparent pointer-events-none z-1" />

                {/* 3. Bottom Seamless Dark Edge Transition */}
                <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#0a0a0a] via-black/50 to-transparent pointer-events-none z-1" />
            </div>

            {/* Movie Details Content */}
            <div className="absolute inset-0 z-10 flex items-end pb-10 md:pb-16 px-4 sm:px-8 lg:px-14">
                <div className="max-w-2xl space-y-4">
                    {/* Apple TV+ Style Category / Top 10 Pill Badge */}
                    <div className="flex items-center gap-2.5 animate-slide-up">
                        <span className="bg-accent text-white text-[10px] md:text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-lg shadow-accent/25 tracking-widest uppercase">
                            TOP 10
                        </span>
                        <span className="text-white/90 text-xs md:text-sm font-bold tracking-wide drop-shadow-md">
                            #{index + 1} in Movies Today
                        </span>
                    </div>

                    {/* Movie Title */}
                    <h1 
                        className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] line-clamp-2 animate-slide-up"
                        style={{ animationDelay: '100ms' }}
                    >
                        {movie.title}
                    </h1>

                    {/* Meta info */}
                    <div 
                        className="flex items-center gap-3 text-xs md:text-sm text-gray-200 font-medium drop-shadow-md animate-slide-up"
                        style={{ animationDelay: '200ms' }}
                    >
                        <span className="text-green-400 font-extrabold">98% Match</span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                        <span>{movie.year || '2024'}</span>
                        {movie.quality && (
                            <>
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                <span className="bg-white/15 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase text-white">
                                    {movie.quality}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Description */}
                    {movie.description && (
                        <p 
                            className="hidden md:block text-gray-200/90 text-sm md:text-base leading-relaxed line-clamp-3 max-w-xl font-light drop-shadow-lg animate-slide-up"
                            style={{ animationDelay: '250ms' }}
                            dangerouslySetInnerHTML={{ __html: movie.description }}
                        />
                    )}

                    {/* Apple TV+ Pill Action Buttons */}
                    <div 
                        className="flex items-center gap-3.5 pt-2 animate-slide-up"
                        style={{ animationDelay: '300ms' }}
                    >
                        <Link
                            to={`/watch/${movie.slug}`}
                            tabIndex={0}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            className="bg-white text-black px-7 md:px-9 py-3 md:py-3.5 rounded-full font-bold text-xs md:text-sm tracking-wide hover:bg-white/90 hover:scale-105 focus-visible:ring-4 focus-visible:ring-accent focus-visible:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2.5 shadow-2xl shadow-black/50"
                        >
                            <Play className="w-4 h-4 fill-current text-black" />
                            Watch Now
                        </Link>
                        <button
                            onClick={toggleList}
                            tabIndex={0}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            className="bg-white/15 backdrop-blur-xl text-white px-7 md:px-9 py-3 md:py-3.5 rounded-full font-bold text-xs md:text-sm tracking-wide border border-white/25 hover:bg-white/25 hover:scale-105 focus-visible:ring-4 focus-visible:ring-accent focus-visible:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2.5 shadow-xl"
                        >
                            {saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            My List
                        </button>
                    </div>
                </div>
            </div>

            {/* Apple TV+ Style Carousel Dot Indicators */}
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
                                ? 'w-8 bg-white shadow-lg shadow-white/30'
                                : 'w-2 bg-white/30 hover:bg-white/60'
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};
