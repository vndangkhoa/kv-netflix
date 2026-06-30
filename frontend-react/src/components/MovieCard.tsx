import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Image as ImageIcon } from 'lucide-react';
import type { Movie } from '../types';

interface MovieCardProps {
    movie: Movie;
    className?: string;
    isDragging?: boolean;
}

export const MovieCard = ({ movie, className = '', isDragging = false }: MovieCardProps) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
            { rootMargin: '400px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const progressPercent = movie.watchedTimestamp && movie.duration
        ? (movie.watchedTimestamp / movie.duration) * 100
        : 0;

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const remainingTime = movie.watchedTimestamp && movie.duration
        ? movie.duration - movie.watchedTimestamp
        : 0;

    const getRawImageUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('//')) return `https:${url}`;
        if (!url.startsWith('http')) return `https://${url}`;
        return url;
    };

    const rawUrl = getRawImageUrl(movie.thumbnail);
    const proxyUrl = rawUrl ? `/api/images/proxy?url=${encodeURIComponent(rawUrl)}&width=300` : '';

    return (
        <div ref={cardRef} className={`group/card relative flex flex-col h-full ${className}`}>
            <Link
                to={`/watch/${movie.slug}`}
                className={`block relative aspect-[2/3] rounded-xl overflow-hidden bg-[var(--bg-tertiary)] shadow-lg hover:shadow-accent/15 border border-black/5 dark:border-white/5 transition-all duration-500 ${isDragging ? 'pointer-events-none' : ''}`}
                draggable={false}
            >
                {isVisible && !imgError ? (
                    <>
                        <div
                            className={`absolute inset-0 bg-[var(--bg-tertiary)] transition-opacity duration-500 ${imgLoaded ? 'opacity-0' : 'opacity-100'}`}
                        />
                        <img
                            src={proxyUrl}
                            alt={movie.title}
                            onLoad={() => setImgLoaded(true)}
                            onError={() => setImgError(true)}
                            className={`w-full h-full object-cover transition-all duration-700 group-hover/card:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                            draggable={false}
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-elevated)] text-[var(--text-dim)] p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium leading-tight">{movie.title}</span>
                    </div>
                )}

                {/* Hover Play Button Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-all duration-500 flex items-center justify-center">
                    <div className="bg-accent/90 text-white p-4 rounded-full translate-y-8 group-hover/card:translate-y-0 hover:scale-115 transition-all duration-500 shadow-2xl shadow-accent/20 border border-accent/25">
                        <Play className="w-5 h-5 text-white fill-current" />
                    </div>
                </div>

                {/* Status Badges Group */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
                    {/* Episode Badge for Series */}
                    {movie.currentEpisode && (
                        <div className="bg-accent/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-extrabold text-white border border-accent/20 shadow-md">
                            Tập {movie.currentEpisode}
                        </div>
                    )}

                    {/* Remaining Time Badge */}
                    {movie.watchedTimestamp && movie.duration && remainingTime > 0 && (
                        <div className="bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-extrabold text-[var(--text-on-image-dim)] border border-white/10 shadow-md">
                            {formatTime(remainingTime)} left
                        </div>
                    )}
                </div>

                {/* Live Indicator / Top Right Time Badge */}
                {movie.time && (
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-2 pointer-events-none">
                        <div className="bg-[var(--bg-badge)] backdrop-blur-xl px-2 py-1 rounded-lg text-[9px] font-bold border border-white/10 text-[var(--text-on-image)] flex items-center gap-1.5 shadow-2xl">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>
                            {movie.time}
                        </div>
                    </div>
                )}

                {/* Video Playback Progress Bar */}
                {progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                    </div>
                )}
            </Link>

            {/* Movie Title & Info */}
            <div className="mt-3 px-0.5">
                <h3 className="font-semibold text-[var(--text-primary)] text-xs md:text-sm leading-snug line-clamp-2 group-hover/card:text-accent transition-colors duration-300">
                    {movie.title}
                </h3>
                {movie.year && (
                    <p className="text-[10px] md:text-[11px] text-[var(--text-dim)] mt-1 font-medium tracking-wide">
                        {movie.year} • 98% Match
                    </p>
                )}
            </div>
        </div>
    );
};
