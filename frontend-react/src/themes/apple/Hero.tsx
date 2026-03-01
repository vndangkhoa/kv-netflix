import { useState, useEffect } from 'react';
import { Plus, Check, Play } from 'lucide-react';
import type { Movie } from '../../types';
import { useMyList } from '../../hooks/useMyList';

export const Hero = ({ movies }: { movies: Movie[] }) => {
    const [index, setIndex] = useState(0);
    const { addToList, removeFromList, isSaved } = useMyList();

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

    return (
        <div className="relative h-[85vh] w-full overflow-hidden group">
            <div className="absolute inset-0 scale-105 transition-transform duration-[10000ms] ease-linear">
                <img
                    key={movie.id}
                    src={`https://wsrv.nl/?url=${encodeURIComponent(movie.backdrop || movie.thumbnail)}&w=1600&output=webp`}
                    alt={movie.title}
                    className="w-full h-full object-cover animate-fade-in"
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

            {/* Carousel Dots */}
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
};
