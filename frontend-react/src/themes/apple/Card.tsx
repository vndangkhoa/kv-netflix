import type { Movie } from '../../types';
import { Play } from 'lucide-react';

export const Card = ({ movie }: { movie: Movie }) => {
    return (
        <div className="group flex flex-col gap-3 cursor-pointer">
            <a href={`/watch/${movie.slug}`} className="relative">
                <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300">
                    <img
                        src={`https://wsrv.nl/?url=${encodeURIComponent(movie.thumbnail)}&w=500&output=webp`}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />

                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="bg-white/90 text-black rounded-full p-4 transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-xl">
                            <Play className="w-6 h-6 fill-current" />
                        </div>
                    </div>

                    {/* Glass Badge */}
                    {movie.quality && (
                        <div className="absolute bottom-3 right-3 bg-white/10 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white/90 font-medium border border-white/10">
                            {movie.quality}
                        </div>
                    )}
                </div>
            </a>

            <div className="px-1 space-y-1">
                <h3 className="font-semibold text-white/90 text-[15px] leading-tight truncate group-hover:text-white transition-colors">
                    {movie.title}
                </h3>
                <p className="text-white/40 text-xs font-medium truncate">
                    {movie.original_title || movie.year || '2024'}
                </p>
            </div>
        </div>
    );
};
