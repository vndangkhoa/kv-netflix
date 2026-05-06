import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Image as ImageIcon } from 'lucide-react';
import type { Movie } from '../types';

interface MovieCardProps {
    movie: Movie;
    className?: string;
    isDragging?: boolean;
}

export const MovieCard = ({ movie, className = '', isDragging = false }: MovieCardProps) => {
    const [imgError, setImgError] = useState(false);

    // Calculate progress percentage
    const progressPercent = movie.watchedTimestamp && movie.duration
        ? (movie.watchedTimestamp / movie.duration) * 100
        : 0;

    const getImageUrl = (url: string, width: number) => {
        if (!url) return '';
        let cleanUrl = url;
        if (url.startsWith('//')) {
            cleanUrl = `https:${url}`;
        } else if (!url.startsWith('http')) {
            cleanUrl = `https://${url}`;
        }
        return cleanUrl;
    };

    return (
        <div className={`group/card relative flex flex-col h-full ${className}`}>
            {/* Poster Image Container */}
            <Link
                to={`/watch/${movie.slug}`}
                className={`block relative aspect-[2/3] rounded-xl overflow-hidden bg-[#1a1a1a] shadow-lg transition-all duration-500 hover:shadow-cyan-500/10 ${isDragging ? 'pointer-events-none' : ''
                    }`}
                draggable={false}
            >
                {!imgError ? (
                    <img
                        src={getImageUrl(movie.thumbnail, 250)}
                        alt={movie.title}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                        loading="lazy"
                        draggable={false}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#222] text-gray-500 p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium leading-tight">{movie.title}</span>
                    </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-all duration-500 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-full translate-y-8 group-hover/card:translate-y-0 transition-all duration-500 shadow-xl border border-white/10">
                        <Play className="w-6 h-6 text-white fill-current" />
                    </div>
                </div>

                {/* Top-Left Tag (Provider) */}
                {movie.provider && (
                    <div className="absolute top-2 left-2">
                        <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold border border-white/10 text-gray-300 uppercase tracking-tighter">
                            {movie.provider}
                        </div>
                    </div>
                )}

                {/* Episode Badge for Continue Watching */}
                {movie.currentEpisode && (
                    <div className="absolute top-2 left-2 mt-7">
                        <div className="bg-cyan-500/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-black border border-cyan-400/20">
                            Tập {movie.currentEpisode}
                        </div>
                    </div>
                )}

                {/* Top-Right Tags (Quality & Lang) */}
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                    {movie.quality && (
                        <div className="bg-cyan-500/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-black uppercase tracking-wider shadow-lg border border-cyan-400/20">
                            {movie.quality}
                        </div>
                    )}
                    {movie.lang && (
                        <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold border border-white/10 text-gray-200">
                            {movie.lang}
                        </div>
                    )}
                </div>

                {/* Bottom Status (Time / Episode Info) */}
                {movie.time && (
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                        <div className="bg-black/70 backdrop-blur-xl px-2 py-1 rounded-md text-[10px] font-semibold border border-white/10 text-white flex items-center gap-1.5 shadow-2xl">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>
                            {movie.time}
                        </div>
                    </div>
                )}

                {/* Progress Bar for Continue Watching */}
                {progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600/50">
                        <div
                            className="h-full bg-cyan-500 transition-all duration-300"
                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                    </div>
                )}
            </Link>

            {/* Info Section */}
            <div className="mt-3 px-1">
                <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 group-hover/card:text-cyan-400 transition-colors duration-300">
                    {movie.title}
                </h3>
                {movie.year && (
                    <p className="text-[11px] text-gray-500 mt-1 font-medium tracking-wide translate-y-0 opacity-100 transition-all">
                        {movie.year} • 98% Match
                    </p>
                )}
            </div>
        </div>
    );
};
