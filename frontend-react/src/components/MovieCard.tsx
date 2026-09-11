import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Image as ImageIcon } from 'lucide-react';
import type { Movie } from '../types';

const loadedImageCache = new Set<string>();

interface MovieCardProps {
    movie: Movie;
    className?: string;
    isDragging?: boolean;
    aspectRatio?: 'poster' | 'landscape';
    rank?: number;
}

export const MovieCard = ({ movie, className = '', isDragging = false, aspectRatio = 'poster', rank }: MovieCardProps) => {
    const getCleanUrl = (url?: string) => {
        if (!url) return '';
        if (url.includes('{') && url.includes('}')) {
            try {
                const start = url.indexOf('{');
                const end = url.lastIndexOf('}');
                const jsonStr = url.substring(start, end + 1);
                const parsed = JSON.parse(jsonStr);
                const path = parsed.original || parsed.poster || parsed.resize || '';
                if (path) {
                    url = path.startsWith('http') ? path : `https://phim.nguonc.com${path.startsWith('/') ? '' : '/'}${path}`;
                }
            } catch { /* ignore malformed JSON thumbnails */ }
        }
        if (url.startsWith('//')) return `https:${url}`;
        if (!url.startsWith('http')) return `https://${url}`;
        return url;
    };

    const imageWidth = aspectRatio === 'landscape' ? 480 : 300;
    const primaryRaw = getCleanUrl(aspectRatio === 'landscape' ? (movie.backdrop || movie.thumbnail) : (movie.thumbnail || movie.backdrop));
    const secondaryRaw = getCleanUrl(aspectRatio === 'landscape' ? movie.thumbnail : movie.backdrop);

    // Build fallback candidates cascade:
    // 1. Primary via backend proxy
    // 2. Primary direct
    // 3. Secondary via backend proxy (if different)
    // 4. Secondary direct (if different)
    const candidates: string[] = [];
    if (primaryRaw) {
        candidates.push(`/api/images/proxy?url=${encodeURIComponent(primaryRaw)}&width=${imageWidth}`);
        candidates.push(primaryRaw);
    }
    if (secondaryRaw && secondaryRaw !== primaryRaw) {
        candidates.push(`/api/images/proxy?url=${encodeURIComponent(secondaryRaw)}&width=${imageWidth}`);
        candidates.push(secondaryRaw);
    }

    const [candidateIndex, setCandidateIndex] = useState(0);
    const [imgLoaded, setImgLoaded] = useState(() => {
        return candidates.length > 0 && loadedImageCache.has(candidates[0]);
    });
    const [imgError, setImgError] = useState(false);

    const currentCandidate = candidates[candidateIndex] || '';

    // Reset image state whenever candidate URLs change (e.g. card re-used for different movie)
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        setCandidateIndex(0);
        setImgError(candidates.length === 0);
        if (candidates[0] && loadedImageCache.has(candidates[0])) {
            setImgLoaded(true);
        } else {
            setImgLoaded(false);
        }
    }, [primaryRaw, secondaryRaw]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleImgLoad = () => {
        if (currentCandidate) loadedImageCache.add(currentCandidate);
        setImgLoaded(true);
    };

    const handleImgError = () => {
        if (candidateIndex + 1 < candidates.length) {
            setCandidateIndex(i => i + 1);
        } else {
            setImgError(true);
        }
    };

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

    const aspectClass = aspectRatio === 'landscape' ? 'aspect-video' : 'aspect-[2/3]';

    return (
        <div className={`group/card relative flex flex-col h-full ${className}`}>
            <Link
                to={`/watch/${movie.slug}`}
                tabIndex={0}
                onFocus={(e) => {
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className={`block relative ${aspectClass} clip-mamphim overflow-hidden bg-[var(--bg-tertiary)] shadow-lg hover:shadow-[var(--accent)]/15 transition-all duration-500 tv-card-focus focus-visible:ring-4 focus-visible:ring-accent focus-visible:scale-105 ${isDragging ? 'pointer-events-none' : ''}`}
                draggable={false}
            >
                {!imgError ? (
                    <>
                        {/* Animated loading skeleton */}
                        {!imgLoaded && (
                            <div className="absolute inset-0 bg-[var(--bg-tertiary)] animate-pulse flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-[var(--text-dim)] opacity-20" />
                            </div>
                        )}
                        {currentCandidate && (
                            <img
                                src={currentCandidate}
                                alt={movie.title}
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                onLoad={handleImgLoad}
                                onError={handleImgError}
                                className={`w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110 group-focus-within/card:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                                draggable={false}
                            />
                        )}
                        {/* Gold hover mask (mamphim .v-thumbnail:hover .mask) */}
                        <div className="absolute inset-0 bg-[var(--accent)] opacity-0 group-hover/card:opacity-25 group-focus-within/card:opacity-25 transition-opacity duration-500 pointer-events-none" />
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-elevated)] text-[var(--text-dim)] p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium leading-tight">{movie.title}</span>
                    </div>
                )}

                {/* Rank number top-right (mamphim .pin-top) */}
                {rank !== undefined && (
                    <div
                        className="absolute top-0 right-2 z-10 pointer-events-none text-white text-4xl md:text-5xl font-extrabold leading-none text-right"
                        style={{ textShadow: '0 2px 3px rgba(0,0,0,0.6)', lineHeight: 1.1 }}
                    >
                        {rank}
                    </div>
                )}

                {/* Hover / Focus Play Button Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-all duration-500 flex items-center justify-center">
                    <div className="bg-[var(--accent)] text-[var(--accent-contrast)] p-4 rounded-full translate-y-8 group-hover/card:translate-y-0 group-focus-within/card:translate-y-0 hover:scale-115 transition-all duration-500 shadow-2xl shadow-[var(--accent)]/20">
                        <Play className="w-5 h-5 fill-current text-[var(--accent-contrast)]" />
                    </div>
                </div>

                {/* Status Badges Group */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
                    {/* Episode Badge for Series */}
                    {movie.currentEpisode && (
                        <div className="bg-[var(--accent)] text-[var(--accent-contrast)] backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-extrabold border border-black/20 shadow-md">
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
                        {movie.year} • {movie.rating ? `★ ${movie.rating}` : '98% Match'}
                    </p>
                )}
            </div>
        </div>
    );
};
