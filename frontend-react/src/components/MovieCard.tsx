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
    linkTo?: 'detail' | 'watch';
}

export const MovieCard = ({ movie, className = '', isDragging = false, aspectRatio = 'poster', rank, linkTo = 'detail' }: MovieCardProps) => {
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
    const targetUrl = linkTo === 'watch' ? `/watch/${movie.slug}` : `/phim/${movie.slug}`;

    // Status / Translation tag format (P.Đề, TM, LT)
    const getBadgeLabel = () => {
        if (movie.lang) {
            const l = movie.lang.toLowerCase();
            if (l.includes('lồng tiếng')) return 'L.Tiếng';
            if (l.includes('thuyết minh')) return 'T.Minh';
            if (l.includes('vietsub') || l.includes('phụ đề')) return 'P.Đề';
            return movie.lang;
        }
        return 'P.Đề';
    };

    return (
        <div className={`group/card relative flex flex-col h-full ${className}`}>
            <Link
                to={targetUrl}
                tabIndex={0}
                onFocus={(e) => {
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                className={`block relative ${aspectClass} rounded-lg overflow-hidden bg-[var(--bg-2)] border border-white/5 shadow-md hover:shadow-xl hover:shadow-[var(--accent)]/10 transition-all duration-300 tv-card-focus focus-visible:ring-4 focus-visible:ring-accent focus-visible:scale-105 ${isDragging ? 'pointer-events-none' : ''}`}
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
                                className={`w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105 group-focus-within/card:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                                draggable={false}
                            />
                        )}
                        {/* RoPhim hover mask */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-elevated)] text-[var(--text-dim)] p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium leading-tight">{movie.title}</span>
                    </div>
                )}

                {/* Rank number top-right */}
                {rank !== undefined && (
                    <div
                        className="absolute top-0 right-2 z-10 pointer-events-none text-white text-4xl md:text-5xl font-extrabold leading-none text-right"
                        style={{ textShadow: '0 2px 3px rgba(0,0,0,0.6)', lineHeight: 1.1 }}
                    >
                        {rank}
                    </div>
                )}

                {/* RoPhim Center Play Button on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none">
                    <div className="btn-play-rophim p-3.5 rounded-full shadow-xl">
                        <Play className="w-5 h-5 fill-current text-[#191b24]" />
                    </div>
                </div>

                {/* RoPhim bottom center badge (P.Đề / TM / LT) */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                    <span className="inline-block bg-black/65 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-medium text-white/90 border border-white/10 shadow">
                        {getBadgeLabel()}
                    </span>
                </div>

                {/* Top badges (Tập / Time remaining) */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
                    {movie.currentEpisode && (
                        <div className="bg-[var(--accent)] text-[var(--primary-button-text)] px-1.5 py-0.5 rounded text-[9px] font-bold shadow">
                            Tập {movie.currentEpisode}
                        </div>
                    )}
                    {movie.watchedTimestamp && movie.duration && remainingTime > 0 && (
                        <div className="bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-medium text-white/90 border border-white/10">
                            {formatTime(remainingTime)} left
                        </div>
                    )}
                </div>

                {/* Video Playback Progress Bar */}
                {progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div
                            className="h-full bg-[var(--accent)] transition-all duration-300"
                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                    </div>
                )}
            </Link>

            {/* RoPhim Title & Subtitle (2 Lines) */}
            <div className="mt-2 text-left px-0.5">
                <Link
                    to={targetUrl}
                    className="font-medium text-white text-xs md:text-sm leading-tight line-clamp-1 group-hover/card:text-[var(--accent)] transition-colors"
                    title={movie.title}
                >
                    {movie.title}
                </Link>
                <p className="text-[11px] text-[var(--text-base)] line-clamp-1 mt-0.5 font-normal">
                    {movie.original_title || movie.year || (movie.rating ? `★ ${movie.rating}` : '')}
                </p>
            </div>
        </div>
    );
};
