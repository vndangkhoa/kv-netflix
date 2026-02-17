import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import type { Movie } from '../types';

interface MovieCardProps {
    movie: Movie;
    className?: string;
    isDragging?: boolean;
}

export const MovieCard = ({ movie, className = '', isDragging = false }: MovieCardProps) => {
    const getImageUrl = (url: string, width: number) => {
        if (!url) return '';
        const cleanUrl = url.replace('img.ophim1.com', 'ssl:img.ophim1.com');
        return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl.replace(/^https?:\/\//, ''))}&w=${width}&output=webp`;
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
                <img
                    src={getImageUrl(movie.thumbnail, 400)}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                    loading="lazy"
                    draggable={false}
                />

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
