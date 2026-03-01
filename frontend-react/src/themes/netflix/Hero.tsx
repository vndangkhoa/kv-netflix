import { useState, useEffect } from 'react';
import { Play, Plus, Check } from 'lucide-react';
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
        <div className="relative h-[85vh] w-full mr-4 overflow-hidden group">
            <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out">
                <img
                    key={movie.id}
                    src={`https://wsrv.nl/?url=${encodeURIComponent(movie.backdrop || movie.thumbnail)}&w=1600&output=webp`}
                    alt={movie.title}
                    className="w-full h-full object-cover mask-image-gradient animate-fade-in"
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

            {/* Indicators */}
            <div className="absolute right-12 bottom-1/3 flex flex-col gap-2 z-20">
                {movies.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-white scale-125' : 'bg-gray-500 hover:bg-gray-400'}`}
                    />
                ))}
            </div>
        </div>
    );
};
