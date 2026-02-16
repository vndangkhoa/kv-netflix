import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { Movie } from '../types';

interface MovieRowProps {
    title: string;
    category?: string;
    searchQuery?: string;
    limit?: number;
    layout?: 'row' | 'grid';
    movies?: Movie[];
}

const MovieRow = ({ title, category, searchQuery, limit, layout = 'row', movies: manualMovies }: MovieRowProps) => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const rowRef = useRef<HTMLDivElement>(null);

    // Drag to scroll logic state
    const [isDragging, setIsDragging] = useState(false);

    // Drag to scroll logic state refs
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    useEffect(() => {
        const fetchMovies = async () => {
            // If manual movies are provided (e.g. History, My List), use them directly
            if (manualMovies) {
                let result = manualMovies;
                if (limit && result.length > 0) {
                    result = result.slice(0, limit);
                }
                setMovies(result);
                setLoading(false);
                return;
            }

            try {
                let endpoint = '';
                if (searchQuery) { // ... unchanged fetch logic
                    endpoint = `/api/videos/search?q=${encodeURIComponent(searchQuery)}`;
                } else if (category && category !== 'home') {
                    endpoint = `/api/videos/home?category=${category}`;
                } else {
                    endpoint = '/api/videos/home';
                }

                const res = await fetch(endpoint);
                const data = await res.json();
                let result = data || [];

                // Search API usually returns unfiltered list, so we might need to be careful.
                // But generally it returns an array of movies.

                if (limit && result.length > 0) {
                    result = result.slice(0, limit);
                }
                setMovies(result);
            } catch (err) {
                console.error(`Failed to fetch movies for row ${title}`, err);
            } finally {
                setLoading(false);
            }
        };
        fetchMovies();
    }, [category, searchQuery, limit, manualMovies]);

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const { current } = rowRef;
            const scrollAmount = direction === 'left' ? -current.clientWidth * 0.8 : current.clientWidth * 0.8;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading) return (
        <div className="mb-8 space-y-4">
            <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
            {layout === 'row' ? (
                <div className="flex gap-4 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="min-w-[160px] md:min-w-[200px] aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 min-[450px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            )}
        </div>
    );

    // Drag to scroll logic handlers

    // Drag to scroll logic handlers

    const handlePointerDown = (e: React.PointerEvent) => {
        // Only enable custom drag for mouse. Touch uses native browser scroll.
        if (e.pointerType !== 'mouse' || !rowRef.current) return;

        isDown.current = true;
        startX.current = e.pageX - rowRef.current.offsetLeft;
        scrollLeft.current = rowRef.current.scrollLeft;
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDown.current) return;

        isDown.current = false;
        if (isDragging) {
            setIsDragging(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDown.current || !rowRef.current) return;

        e.preventDefault();
        const x = e.pageX - rowRef.current.offsetLeft;
        const walk = (x - startX.current) * 2; // Scroll-fast

        // Only trigger dragging state if moved significantly to prevent accidental clicks being blocked
        if (Math.abs(x - startX.current) > 5) {
            if (!isDragging) {
                setIsDragging(true);
                e.currentTarget.setPointerCapture(e.pointerId);
            }
        }

        if (isDragging) {
            rowRef.current.scrollLeft = scrollLeft.current - walk;
        }
    };



    if (movies.length === 0) return null;

    return (
        <div className="mb-10 group/row relative">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-white flex items-center gap-3">
                <span className="w-1.5 h-8 bg-cyan-500 rounded-full"></span>
                {title}
                <Link to={`/?category=${category}`} className="text-xs font-normal text-gray-500 hover:text-cyan-400 ml-2 transition-colors">
                    Xem tất cả
                </Link>
            </h2>

            {layout === 'row' ? (
                <div className="relative group">
                    <button
                        onClick={() => scroll('left')}
                        className="hidden md:flex absolute left-0 top-0 bottom-0 z-20 w-12 items-center justify-center bg-transparent group-hover:bg-gradient-to-r group-hover:from-black/80 group-hover:to-transparent transition-all duration-300 opacity-0 group-hover:opacity-100"
                    >
                        <ChevronLeft size={40} className="text-white drop-shadow-lg" strokeWidth={1} />
                    </button>

                    <div
                        ref={rowRef}
                        className={`flex gap-4 overflow-x-auto px-4 md:px-12 pb-4 scrollbar-hide select-none overscroll-x-contain ${isDragging ? 'cursor-grabbing snap-none' : 'cursor-grab snap-x snap-mandatory'}`}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerMove={handlePointerMove}
                    >
                        {movies.map((movie) => (
                            <div key={movie.id} className="min-w-[130px] sm:min-w-[150px] md:min-w-[180px] lg:min-w-[200px] snap-start relative group/card">
                                <Link
                                    to={`/watch/${movie.slug}`}
                                    className={`block relative aspect-[2/3] rounded-xl overflow-hidden bg-white/5 ${isDragging ? 'pointer-events-none' : ''}`}
                                    draggable={false}
                                >
                                    <img
                                        src={`https://wsrv.nl/?url=${encodeURIComponent(movie.thumbnail.replace(/^https?:\/\//, '').replace('img.ophim1.com', 'ssl:img.ophim1.com'))}&w=300&output=webp`}
                                        alt={movie.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                        draggable={false}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-full translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                            <Play className="w-5 h-5 text-white fill-current" />
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                        {movie.quality && (
                                            <div className="bg-cyan-500/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-black uppercase tracking-wider shadow-lg">
                                                {movie.quality}
                                            </div>
                                        )}
                                        {movie.lang && (
                                            <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold border border-white/20 text-gray-200">
                                                {movie.lang}
                                            </div>
                                        )}
                                    </div>
                                    {movie.time && (
                                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/10 text-white flex items-center gap-1">
                                            {movie.time}
                                        </div>
                                    )}
                                </Link>
                                <div className="mt-2 text-left">
                                    <h3 className="font-medium text-white text-sm truncate group-hover/card:text-cyan-400 transition-colors">
                                        {movie.title}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => scroll('right')}
                        className="hidden md:flex absolute right-0 top-0 bottom-0 z-20 w-12 items-center justify-center bg-transparent group-hover:bg-gradient-to-l group-hover:from-black/80 group-hover:to-transparent transition-all duration-300 opacity-0 group-hover:opacity-100"
                    >
                        <ChevronRight size={40} className="text-white drop-shadow-lg" strokeWidth={1} />
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 min-[450px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
                    {movies.map((movie) => (
                        <div key={movie.id} className="relative group flex flex-col h-full">
                            <Link to={`/watch/${movie.slug}`} className="block relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#1a1a1a]">
                                <img
                                    src={`https://wsrv.nl/?url=${encodeURIComponent(movie.thumbnail.replace(/^https?:\/\//, '').replace('img.ophim1.com', 'ssl:img.ophim1.com'))}&w=300&output=webp`}
                                    alt={movie.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        <Play className="w-5 h-5 text-white fill-current" />
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                    {movie.quality && (
                                        <div className="bg-cyan-500/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-black uppercase tracking-wider shadow-lg">
                                            {movie.quality}
                                        </div>
                                    )}
                                </div>
                            </Link>
                            <div className="mt-2">
                                <h3 className="font-medium text-white text-sm truncate group-hover:text-cyan-400 transition-colors">
                                    {movie.title}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div >
    );
};

export default MovieRow;
