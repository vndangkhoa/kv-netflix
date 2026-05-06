import { useState, useEffect } from 'react';
import { Play, Plus, Check } from 'lucide-react';
import type { Movie } from '../types';
import { useMyList } from '../hooks/useMyList';

interface HeroProps {
    movies: Movie[];
    variant?: 'default' | 'netflix' | 'apple';
}

export const Hero = ({ movies, variant = 'default' }: HeroProps) => {
    const [index, setIndex] = useState(0);
    const { addToList, removeFromList, isSaved } = useMyList();

    // Auto-rotate carousel
    useEffect(() => {
        if (movies.length <= 1) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % movies.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [movies]);

    if (!movies || movies.length === 0) return null;

    const movie = movies[index];
    const saved = isSaved(movie.id);

    const toggleList = () => {
        if (saved) removeFromList(movie.id);
        else addToList(movie);
    };

    // Helper to generate robust image URLs
    const getImageUrl = (url: string | undefined, width: number, blur: number = 0) => {
        if (!url) return '';
        let cleanUrl = url;
        if (url.startsWith('//')) {
            cleanUrl = `https:${url}`;
        } else if (!url.startsWith('http')) {
            cleanUrl = `https://${url}`;
        }
        return cleanUrl;
    };

    // --- Variant-Specific Styles ---

    // 1. Apple Variant (Glassmorphism, Bottom-Aligned)
    if (variant === 'apple') {
        return (
            <div className="relative h-[85vh] w-full overflow-hidden group">
                <div className="absolute inset-0 scale-105 transition-transform duration-[10000ms] ease-linear">
                    <img
                        key={movie.id}
                        src={getImageUrl(movie.backdrop || movie.thumbnail, 1600)}
                        alt={movie.title}
                        className="w-full h-full object-cover animate-fade-in"
                        onError={(e) => {
                            if (movie.thumbnail && e.currentTarget.src !== getImageUrl(movie.thumbnail, 1600)) {
                                e.currentTarget.src = getImageUrl(movie.thumbnail, 1600);
                            }
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 lg:p-24 pb-20 z-10">
                    <div className="max-w-3xl space-y-6">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full animate-slide-up">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-white/90">Premiere</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] line-clamp-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
                            {movie.title}
                        </h1>

                        {movie.original_title && (
                            <p className="text-xl text-white/70 font-medium animate-slide-up" style={{ animationDelay: '200ms' }}>{movie.original_title}</p>
                        )}

                        <div className="flex items-center gap-4 pt-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
                            <a
                                href={`/watch/${movie.slug}`}
                                className="bg-white text-black px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:scale-105 transition-transform duration-200 flex items-center gap-2"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                Play
                            </a>
                            <button
                                onClick={toggleList}
                                className="bg-white/10 backdrop-blur-md text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-wide border border-white/20 hover:bg-white/20 transition-colors flex items-center gap-2"
                            >
                                {saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {saved ? 'In Up Next' : 'Add to Up Next'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Carousel Dots (Bottom Center) */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                    {movies.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-white w-4' : 'bg-white/30 hover:bg-white/50'}`}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // 2. Netflix Variant (Left-Aligned, Sidebar-Aware if needed, Top-10 Badge)
    if (variant === 'netflix') {
        return (
            <div className="relative h-[85vh] w-full overflow-hidden group">
                <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out">
                    <img
                        key={movie.id}
                        src={getImageUrl(movie.backdrop || movie.thumbnail, 1600)}
                        alt={movie.title}
                        className="w-full h-full object-cover mask-image-gradient animate-fade-in"
                        onError={(e) => {
                            if (movie.thumbnail && e.currentTarget.src !== getImageUrl(movie.thumbnail, 1600)) {
                                e.currentTarget.src = getImageUrl(movie.thumbnail, 1600);
                            }
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                </div>

                <div className="absolute inset-0 flex items-center px-4 md:px-12 z-10">
                    <div className="max-w-2xl space-y-6">
                        <div className="flex items-center gap-2 mb-4 animate-slide-up">
                            <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-sm">TOP 10 TODAY</span>
                            <span className="text-gray-300 text-sm font-medium tracking-widest uppercase">#{index + 1} in Movies</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight drop-shadow-xl line-clamp-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
                            {movie.title}
                        </h1>

                        {movie.original_title && (
                            <p className="text-xl text-gray-300 italic animate-slide-up" style={{ animationDelay: '200ms' }}>{movie.original_title}</p>
                        )}

                        <div className="flex items-center gap-3 pt-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
                            <a
                                href={`/watch/${movie.slug}`}
                                className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-bold hover:bg-opacity-90 transition-colors"
                            >
                                <Play className="w-6 h-6 fill-current" />
                                Play
                            </a>
                            <button
                                onClick={toggleList}
                                className="flex items-center gap-2 bg-gray-500/70 text-white px-8 py-3 rounded font-bold backdrop-blur-sm hover:bg-gray-500/50 transition-colors"
                            >
                                {saved ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                                {saved ? 'My List' : 'My List'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Indicators (Vertical Right Side - Classic Netflix) */}
                <div className="absolute right-12 bottom-1/3 flex flex-col gap-2 z-20 hidden md:flex">
                    {movies.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-white scale-125' : 'bg-gray-600 hover:bg-gray-400'}`}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // 3. Default (StreamFlow) Variant - Split Poster Design (Solves Quality & Sizing)
    return (
        <div className="relative w-full h-[60vh] md:h-[70vh] lg:h-[75vh] min-h-[500px] overflow-hidden group">
            {/* 1. Ambient Background (Blurred) */}
            <div className="absolute inset-0 bg-[#0a0a0a]">
                <img
                    key={`bg-${movie.id}`}
                    // Use thumbnail as safe default since we blur it anyway
                    src={getImageUrl(movie.thumbnail || movie.backdrop, 1000)}
                    alt="Background"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                        if (movie.thumbnail && e.currentTarget.src !== getImageUrl(movie.thumbnail, 1000)) {
                            e.currentTarget.src = getImageUrl(movie.thumbnail, 1000);
                        }
                    }}
                    className="w-full h-full object-cover opacity-50 scale-110 blur-xl" // CSS Blur instead of API blur
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/80 to-transparent" />
            </div>

            {/* 2. Main Content Layout */}
            <div className="absolute inset-0 z-10 container mx-auto px-4 sm:px-8 lg:px-12 flex items-center">
                <div className="flex w-full items-center gap-8 lg:gap-16">

                    {/* Left Column: Text Info */}
                    <div className="w-full md:w-3/5 lg:w-1/2 space-y-6 pt-10 md:pt-0">
                        {/* Wrapper for text to ensure readability */}
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4 animate-slide-up">
                                <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded shadow-lg shadow-cyan-500/20">
                                    <span>TOP 10</span>
                                </div>
                                <span className="text-gray-300 text-lg font-bold tracking-wide">#{index + 1} in Movies Today</span>
                            </div>

                            <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight drop-shadow-2xl line-clamp-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
                                {movie.title}
                            </h1>

                            <div className="mt-4 flex items-center gap-4 text-gray-300 text-sm md:text-base animate-slide-up" style={{ animationDelay: '200ms' }}>
                                <span className="text-green-400 font-bold">98% Match</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                <span>{movie.year || '2024'}</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                <span className="border border-gray-600 px-1.5 py-0.5 rounded text-xs">HD</span>
                                {movie.original_title && (
                                    <>
                                        <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                        <span className="italic opacity-80 truncate max-w-[200px]">{movie.original_title}</span>
                                    </>
                                )}
                            </div>

                            <div className="mt-8 flex items-center gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
                                <a
                                    href={`/watch/${movie.slug}`}
                                    className="bg-white text-black px-8 py-3.5 rounded-xl font-bold text-sm md:text-base tracking-wide hover:scale-105 transition-transform duration-200 flex items-center gap-2 shadow-lg shadow-white/10"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    Watch Now
                                </a>
                                <button
                                    onClick={toggleList}
                                    className="bg-white/10 backdrop-blur-md text-white px-8 py-3.5 rounded-xl font-bold text-sm md:text-base tracking-wide border border-white/10 hover:bg-white/20 transition-colors flex items-center gap-2"
                                >
                                    {saved ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    My List
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sharp Poster (Desktop Only) */}
                    <div className="hidden md:flex w-2/5 lg:w-1/2 justify-center lg:justify-end animate-fade-in delay-200">
                        <div className="relative group/poster">
                            {/* Glow Effect */}
                            <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover/poster:opacity-40 transition duration-500" />

                            <img
                                key={`poster-${movie.id}`}
                                src={getImageUrl(movie.thumbnail || movie.backdrop, 600)}
                                alt={movie.title}
                                className="relative w-[280px] lg:w-[350px] aspect-[2/3] object-cover rounded-xl shadow-2xl shadow-black/50 ring-1 ring-white/10 transform transition-all duration-500 group-hover/poster:scale-[1.02] group-hover/poster:-rotate-1"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Indicators */}
            <div className="absolute bottom-6 right-8 lg:bottom-10 lg:right-12 flex gap-2 z-20">
                {movies.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`transition-all duration-300 rounded-full ${i === index
                            ? 'w-6 h-1.5 bg-cyan-500 shadow-lg shadow-cyan-500/50'
                            : 'w-1.5 h-1.5 bg-gray-600 hover:bg-white/50'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};
