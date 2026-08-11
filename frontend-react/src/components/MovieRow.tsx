import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Movie } from '../types';
import { MovieCard } from './MovieCard';
import { useLang } from '../context/LanguageContext';

interface MovieRowProps {
    rowId?: string;
    title: string;
    category?: string;
    searchQuery?: string;
    limit?: number;
    layout?: 'row' | 'grid';
    cardAspect?: 'poster' | 'landscape';
    movies?: Movie[];
    excludeIds?: Set<string>;
    onMoviesLoaded?: (rowId: string, movies: Movie[]) => void;
}

function deduplicateMovies(list: Movie[], excludeIds?: Set<string>): Movie[] {
    const localSeen = new Set<string>();
    const unique: Movie[] = [];
    for (const m of list) {
        if (!m) continue;

        const normTitle = (m.title || '')
            .toLowerCase()
            .replace(/[[({].*?[)\]}]/g, '')
            .replace(/[^a-z0-9]/g, '');

        const key = m.id || m.slug || normTitle;

        const isExcluded = excludeIds && (
            (m.id && excludeIds.has(m.id)) ||
            (m.slug && excludeIds.has(m.slug)) ||
            (normTitle && excludeIds.has(normTitle))
        );

        if (!isExcluded && key && !localSeen.has(key) && (!normTitle || !localSeen.has(normTitle))) {
            if (key) localSeen.add(key);
            if (normTitle) localSeen.add(normTitle);
            unique.push(m);
        }
    }
    return unique;
}

const rowFetchCache = new Map<string, Movie[]>();

const MovieRow = ({ rowId, title, category, searchQuery, limit, layout = 'row', cardAspect = 'poster', movies: manualMovies, excludeIds, onMoviesLoaded }: MovieRowProps) => {
    const { t } = useLang();
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const rowRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const prevLoadedKeysRef = useRef<string>('');
    const prevRenderedKeysRef = useRef<string>('');

    useEffect(() => {
        const fetchMovies = async () => {
            if (manualMovies) {
                let result = deduplicateMovies(manualMovies, excludeIds);
                if (limit && result.length > 0) {
                    result = result.slice(0, limit);
                }
                const keys = result.map(m => m.id || m.slug || m.title).join(',');
                if (prevRenderedKeysRef.current !== keys) {
                    prevRenderedKeysRef.current = keys;
                    setMovies(result);
                }
                setLoading(false);
                if (rowId && onMoviesLoaded && prevLoadedKeysRef.current !== keys) {
                    prevLoadedKeysRef.current = keys;
                    onMoviesLoaded(rowId, result);
                }
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

                let data: Movie[];
                if (rowFetchCache.has(endpoint)) {
                    data = rowFetchCache.get(endpoint)!;
                } else {
                    const res = await fetch(endpoint);
                    data = (await res.json()) || [];
                    if (Array.isArray(data) && data.length > 0) {
                        rowFetchCache.set(endpoint, data);
                    }
                }

                let result = deduplicateMovies(data, excludeIds);

                if (limit && result.length > 0) {
                    result = result.slice(0, limit);
                }

                const keys = result.map(m => m.id || m.slug || m.title).join(',');
                if (prevRenderedKeysRef.current !== keys) {
                    prevRenderedKeysRef.current = keys;
                    setMovies(result);
                }
                if (rowId && onMoviesLoaded && prevLoadedKeysRef.current !== keys) {
                    prevLoadedKeysRef.current = keys;
                    onMoviesLoaded(rowId, result);
                }
            } catch {
                console.error(`Failed to fetch movies for row ${title}`);
            } finally {
                setLoading(false);
            }
        };
        fetchMovies();
    }, [category, searchQuery, limit, manualMovies, title, excludeIds, rowId, onMoviesLoaded]);

    const scroll = (direction: 'left' | 'right') => {
        if (rowRef.current) {
            const { current } = rowRef;
            const scrollAmount = direction === 'left' ? -current.clientWidth * 0.85 : current.clientWidth * 0.85;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const cardWidthClass = cardAspect === 'landscape'
        ? 'w-[200px] sm:w-[240px] md:w-[280px] lg:w-[320px] xl:w-[360px]'
        : 'w-[115px] sm:w-[140px] md:w-[165px] lg:w-[190px] xl:w-[215px]';

    const skeletonWidthClass = cardAspect === 'landscape'
        ? 'min-w-[200px] sm:min-w-[240px] md:min-w-[280px] lg:min-w-[320px] xl:min-w-[360px] aspect-video'
        : 'min-w-[115px] sm:min-w-[140px] md:min-w-[165px] lg:min-w-[190px] xl:min-w-[215px] aspect-[2/3]';

    const gridColsClass = cardAspect === 'landscape'
        ? 'grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-4'
        : 'grid-cols-3 min-[480px]:grid-cols-4 lg:grid-cols-6';

    if (loading) return (
        <div className="mb-8 space-y-4">
            <div className="h-6 w-48 bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
            {layout === 'row' ? (
                <div className="flex gap-3 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <div 
                            key={i} 
                            className={`${skeletonWidthClass} bg-[var(--bg-elevated)] rounded-xl animate-pulse`} 
                        />
                    ))}
                </div>
            ) : (
                <div className={`grid ${gridColsClass} gap-2 md:gap-4`}>
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className={`${cardAspect === 'landscape' ? 'aspect-video' : 'aspect-[2/3]'} bg-[var(--bg-elevated)] rounded-lg animate-pulse`} />
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
                        tabIndex={0}
                        className="text-[9px] font-bold text-[var(--text-dim)] hover:text-accent focus-visible:text-accent focus-visible:ring-2 focus-visible:ring-accent ml-1.5 px-1 py-0.5 rounded transition-colors uppercase tracking-widest"
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
                                className={`${cardWidthClass} flex-shrink-0 snap-start`}
                            >
                                <MovieCard
                                    movie={movie}
                                    isDragging={isDragging}
                                    aspectRatio={cardAspect}
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
                <div className={`grid ${gridColsClass} gap-2 md:gap-4`}>
                    {movies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} aspectRatio={cardAspect} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MovieRow;
