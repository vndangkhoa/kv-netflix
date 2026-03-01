import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Movie } from '../types';
import { MovieCard } from './MovieCard';

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
            } catch {
                console.error(`Failed to fetch movies for row ${title}`);
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
                <div className="grid grid-cols-3 min-[480px]:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-white/5 rounded-lg animate-pulse" />
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
            <h2 className="text-lg md:text-xl font-bold mb-4 text-white flex items-center gap-3">
                <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                {title}
                <Link to={`/?category=${category}`} className="text-[10px] font-normal text-gray-500 hover:text-cyan-400 ml-2 transition-colors uppercase tracking-wider">
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
                        className={`flex gap-2 md:gap-4 overflow-x-auto px-4 md:px-12 pb-4 scrollbar-hide select-none overscroll-x-contain ${isDragging ? 'cursor-grabbing snap-none' : 'cursor-grab snap-x snap-mandatory'}`}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerMove={handlePointerMove}
                    >
                        {movies.map((movie) => (
                            <div key={movie.id} className="w-[110px] sm:w-[150px] md:w-[180px] lg:w-[200px] flex-shrink-0 snap-start">
                                <MovieCard
                                    movie={movie}
                                    isDragging={isDragging}
                                />
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
                <div className="grid grid-cols-3 min-[480px]:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
                    {movies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                    ))}
                </div>
            )}
        </div >
    );
};

export default MovieRow;
