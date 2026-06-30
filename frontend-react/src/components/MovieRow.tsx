import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Movie } from '../types';
import { MovieCard } from './MovieCard';
import { useLang } from '../context/LanguageContext';

interface MovieRowProps {
    title: string;
    category?: string;
    searchQuery?: string;
    limit?: number;
    layout?: 'row' | 'grid';
    movies?: Movie[];
}

const MovieRow = ({ title, category, searchQuery, limit, layout = 'row', movies: manualMovies }: MovieRowProps) => {
    const { t } = useLang();
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const rowRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    useEffect(() => {
        const fetchMovies = async () => {
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
                if (searchQuery) {
                    endpoint = `/api/videos/search?q=${encodeURIComponent(searchQuery)}`;
                } else if (category && category !== 'home') {
                    endpoint = `/api/videos/home?category=${category}`;
                } else {
                    endpoint = '/api/videos/home';
                }

                const res = await fetch(endpoint);
                const data = await res.json();
                let result = data || [];

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
    }, [category, searchQuery, limit, manualMovies, title]);

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const { current } = rowRef;
            const scrollAmount = direction === 'left' ? -current.clientWidth * 0.85 : current.clientWidth * 0.85;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading) return (
        <div className="mb-8 space-y-4">
            <div className="h-6 w-48 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
            {layout === 'row' ? (
                <div className="flex gap-3 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <div 
                            key={i} 
                            className="min-w-[115px] sm:min-w-[140px] md:min-w-[165px] lg:min-w-[190px] xl:min-w-[215px] aspect-[2/3] bg-[var(--bg-elevated)] rounded-xl animate-pulse" 
                        />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 min-[480px]:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
                    ))}
                </div>
            )}
        </div>
    );

    const handlePointerDown = (e: React.PointerEvent) => {
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
        const walk = (x - startX.current) * 2;

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
        <div className="mb-8 group/row relative">
            <h2 className="text-base md:text-lg font-bold mb-3.5 text-[var(--text-primary)] flex items-center gap-2">
                <span className="w-1 h-5 bg-accent rounded-full" />
                {title}
                {category && (
                    <Link 
                        to={`/?category=${category}`} 
                        className="text-[9px] font-bold text-[var(--text-dim)] hover:text-accent ml-1.5 transition-colors uppercase tracking-widest"
                    >
                        {t.viewAll}
                    </Link>
                )}
            </h2>

            {layout === 'row' ? (
                <div className="relative group">
                    {/* Left scroll fade & button */}
                    <div className="hidden lg:block absolute left-0 top-0 bottom-0 z-20 w-14 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none scroll-fade-left" />
                    <button
                        onClick={() => scroll('left')}
                        className="hidden lg:flex absolute left-0 top-0 bottom-0 z-20 w-12 items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/50 active:scale-95 transition-all duration-300 rounded-r-lg"
                        aria-label="Scroll left"
                    >
                        <ChevronLeft size={36} className="text-[var(--text-primary)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" strokeWidth={2} />
                    </button>

                    <div
                        ref={rowRef}
                        className={`flex gap-3 overflow-x-auto pb-4 scrollbar-hide select-none overscroll-x-contain ${
                            isDragging ? 'cursor-grabbing snap-none' : 'cursor-grab snap-x snap-mandatory'
                        }`}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerMove={handlePointerMove}
                    >
                        {movies.map((movie) => (
                            <div 
                                key={movie.id} 
                                className="w-[115px] sm:w-[140px] md:w-[165px] lg:w-[190px] xl:w-[215px] flex-shrink-0 snap-start"
                            >
                                <MovieCard
                                    movie={movie}
                                    isDragging={isDragging}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Right scroll fade & button */}
                    <div className="hidden lg:block absolute right-0 top-0 bottom-0 z-20 w-14 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none scroll-fade-right" />
                    <button
                        onClick={() => scroll('right')}
                        className="hidden lg:flex absolute right-0 top-0 bottom-0 z-20 w-12 items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/50 active:scale-95 transition-all duration-300 rounded-l-lg"
                        aria-label="Scroll right"
                    >
                        <ChevronRight size={36} className="text-[var(--text-primary)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" strokeWidth={2} />
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-3 min-[480px]:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
                    {movies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MovieRow;
