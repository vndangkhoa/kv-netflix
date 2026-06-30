import { useState, useEffect, useMemo } from 'react';
import { Play, Plus, Check } from 'lucide-react';
import type { Movie } from '../types';
import { useMyList } from '../hooks/useMyList';

interface HeroProps {
    movies: Movie[];
}

export const Hero = ({ movies }: HeroProps) => {
    const [index, setIndex] = useState(0);
    const { addToList, removeFromList, isSaved } = useMyList();

    useEffect(() => {
        if (movies.length <= 1) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % movies.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [movies]);

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
        <div className="relative w-full h-[55vh] sm:h-[65vh] md:h-[75vh] lg:h-[80vh] min-h-[420px] overflow-hidden group bg-[#0a0a0a]">
            {/* Backdrop Image & Ambient Mask */}
            <div className="absolute inset-0">
                <img
                    key={`bg-${movie.id}`}
                    src={getProxyUrl(movie.backdrop || movie.thumbnail, 1280)}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-all duration-[1000ms] ease-in-out scale-105"
                    onError={(e) => {
                        if (movie.thumbnail && e.currentTarget.src !== getProxyUrl(movie.thumbnail, 1280)) {
                            e.currentTarget.src = getProxyUrl(movie.thumbnail, 1280);
                        }
                    }}
                />
                {/* Responsive Dark Overlays */}
                {/* 1. Header Safe Mask */}
                <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
                {/* 2. Side Mask (Desktop focus on left-aligned text) */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent hidden md:block pointer-events-none" />
                {/* 3. Bottom Safe Mask */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-black/35 to-transparent pointer-events-none" />
            </div>

            {/* Movie Details Content */}
            <div className="absolute inset-0 z-10 flex items-end pb-12 md:pb-20 px-4 sm:px-8 lg:px-12">
                <div className="max-w-2xl space-y-4">
                    {/* Top 10 Badge */}
                    <div className="flex items-center gap-2 animate-slide-up">
                        <span className="bg-accent text-white text-[9px] md:text-[10px] font-extrabold px-2 py-0.5 rounded shadow-lg shadow-accent/15 tracking-wider uppercase">
                            TOP 10
                        </span>
                        <span className="text-white/80 text-xs md:text-sm font-bold tracking-wide drop-shadow-md">
                            #{index + 1} in Movies Today
                        </span>
                    </div>

                    {/* Movie Title */}
                    <h1 
                        className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] line-clamp-2 animate-slide-up"
                        style={{ animationDelay: '100ms' }}
                    >
                        {movie.title}
                    </h1>

                    {/* Meta info */}
                    <div 
                        className="flex items-center gap-3 text-xs md:text-sm text-gray-300 font-medium drop-shadow-md animate-slide-up"
                        style={{ animationDelay: '200ms' }}
                    >
                        <span className="text-green-500 font-extrabold">98% Match</span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full" />
                        <span>{movie.year || '2024'}</span>
                        {movie.quality && (
                            <>
                                <span className="w-1 h-1 bg-gray-400 rounded-full" />
                                <span className="border border-white/30 px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase">
                                    {movie.quality}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Description (hidden on mobile to reduce clutter) */}
                    {movie.description && (
                        <p 
                            className="hidden md:block text-gray-300 text-sm md:text-base leading-relaxed line-clamp-3 max-w-xl font-light drop-shadow-md animate-slide-up"
                            style={{ animationDelay: '250ms' }}
                            dangerouslySetInnerHTML={{ __html: movie.description }}
                        />
                    )}

                    {/* Action Call-to-actions */}
                    <div 
                        className="flex items-center gap-3 pt-2 animate-slide-up"
                        style={{ animationDelay: '300ms' }}
                    >
                        <a
                            href={`/watch/${movie.slug}`}
                            className="bg-white text-black px-6 md:px-8 py-2.5 md:py-3.5 rounded-xl font-bold text-xs md:text-sm tracking-wide hover:bg-white/90 active:scale-95 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-white/5"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            Watch Now
                        </a>
                        <button
                            onClick={toggleList}
                            className="bg-white/10 backdrop-blur-md text-white px-6 md:px-8 py-2.5 md:py-3.5 rounded-xl font-bold text-xs md:text-sm tracking-wide border border-white/20 hover:bg-white/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            My List
                        </button>
                    </div>
                </div>
            </div>

            {/* Carousel Dot Indicators */}
            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-8 lg:bottom-10 lg:right-12 flex gap-1.5 z-20">
                {movies.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`transition-all duration-300 rounded-full h-1.5 ${
                            i === index
                                ? 'w-6 bg-accent shadow-lg shadow-accent/40'
                                : 'w-1.5 bg-white/40 hover:bg-white/70'
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};
