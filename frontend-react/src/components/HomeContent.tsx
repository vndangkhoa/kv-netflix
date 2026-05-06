import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Movie } from '../types';
import MovieRow from './MovieRow';
import { MovieCard } from './MovieCard';
import { CATEGORIES } from '../constants';

import { useMyList } from '../hooks/useMyList';
import { useSmartRecommendations } from '../hooks/useSmartRecommendations';
import { useWatchProgress } from '../hooks/useWatchProgress';

interface HomeContentProps {
    topPadding?: string;
}

export const HomeContent = ({ topPadding = "pt-24" }: HomeContentProps) => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const { watchHistory, savedMovies } = useMyList(); // Access History and MyList
    const { getContinueWatchingMovies } = useWatchProgress();
    const continueWatching = getContinueWatchingMovies();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q');
    const category = searchParams.get('category');

    // Filtered view if search or specific category is selected
    const isFiltered = !!(query || (category && category !== 'home'));

    // On main home page, we show rows AND infinite grid at bottom
    // If filtered, we ONLY show the grid
    const showRows = !isFiltered;

    const observer = useRef<IntersectionObserver | null>(null);

    // ... (rest of useEffects same as before) ...

    // Reset grid when query/category changes
    useEffect(() => {
        setMovies([]);
        setPage(1);
        setHasMore(true);
        setLoading(true);
    }, [query, category]);

    // Fetch movies for the Infinite Grid
    useEffect(() => {
        const fetchMovies = async () => {
            if (page === 1) setLoading(true);
            else setFetchingMore(true);

            try {
                let endpoint = '/api/videos/home';
                if (query) {
                    endpoint = `/api/videos/search?q=${query}&page=${page}`;
                } else if (category && category !== 'home') {
                    endpoint = `/api/videos/home?category=${category}&page=${page}`;
                } else {
                    endpoint = `/api/videos/home?page=${page}`;
                }

                const res = await fetch(endpoint);
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                const data = await res.json();

                if (!data || data.length === 0) {
                    setHasMore(false);
                } else {
                    setMovies(prev => {
                        if (page === 1) return data;
                        // Deduplicate arrays when appending to prevent React StrictMode or fast-scroll double fetches
                        const existingIds = new Set(prev.map(m => m.id));
                        const newUniqueMovies = data.filter((m: Movie) => !existingIds.has(m.id));
                        return [...prev, ...newUniqueMovies];
                    });
                }
            } catch {
                console.error("Failed to fetch movies");
            } finally {
                setLoading(false);
                setFetchingMore(false);
            }
        };

        fetchMovies();
    }, [page, query, category]);

    // Sentinel observer for infinite scroll
    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (loading || fetchingMore) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, fetchingMore, hasMore]);

    const getTitle = () => {
        if (query) return `Kết quả cho "${query}"`;
        if (category === 'phim-le') return 'Phim Lẻ';
        if (category === 'phim-bo') return 'Phim Bộ';
        if (category === 'hoat-hinh') return 'Hoạt Hình';
        if (category === 'tv-shows') return 'TV Shows';
        if (category === 'phim-sap-chieu') return 'Phim Sắp Chiếu';
        if (category === 'phim-hay') return 'Phim Hay';
        if (category) return 'Danh Sách Phim';
        return 'Tất Cả Phim';
    };

    // Calculate Smart Suggestions based on last watched item
    const lastWatched = watchHistory.length > 0 ? watchHistory[0] : null;

    // Get Category-based recommendations
    const recommendations = useSmartRecommendations(watchHistory);

    return (
        <div className={`w-full px-4 sm:px-6 lg:px-12 pb-12 ${topPadding}`}>
            {showRows && (
                <div className="space-y-4 relative z-10 mb-12">
                    {/* Continue Watching Row */}
                    {continueWatching.length > 0 && (
                        <MovieRow title="Tiếp tục xem" movies={continueWatching} />
                    )}

                    {/* My List Row */}
                    {savedMovies.length > 0 && (
                        <MovieRow title="Danh sách của tôi" movies={savedMovies} />
                    )}

                    {/* Smart Category Recommendations */}
                    {recommendations.map(rec => (
                        <MovieRow
                            key={rec.id}
                            title={rec.title}
                            category={rec.category}
                        />
                    ))}

                    {/* Smart Suggestions using SEARCH API */}
                    {lastWatched && (
                        <>
                            {lastWatched.director && (
                                <MovieRow
                                    title={`Đạo diễn ${lastWatched.director.replace(/,$/, '').trim()}`}
                                    searchQuery={lastWatched.director.replace(/,$/, '').trim()}
                                    key={`dir-${lastWatched.id}`}
                                />
                            )}
                            {lastWatched.cast && lastWatched.cast.length > 0 && (
                                <MovieRow
                                    title={`Diễn viên ${lastWatched.cast[0].replace(/,$/, '').trim()}`}
                                    searchQuery={lastWatched.cast[0].replace(/,$/, '').trim()}
                                    key={`act-${lastWatched.id}`}
                                />
                            )}
                        </>
                    )}

                    {/* Phim Mới Horizontal Carousel */}
                    <MovieRow title="Phim Mới Cập Nhật" category="home" />

                    {/* Top 10 Grids for each Category */}
                    {CATEGORIES.filter(c => c.id !== 'my-list').map((cat) => (
                        <MovieRow
                            key={cat.id}
                            title={`Top 10 ${cat.name}`}
                            category={cat.id}
                            limit={10}
                        // layout="row" is default
                        />
                    ))}

                    {/* Other Curated Sections */}
                    <MovieRow title="Hành Động & Phiêu Lưu" category="hanh-dong" />
                    <MovieRow title="Tâm Lý & Tình Cảm" category="tinh-cam" />
                </div>
            )}

            {/* Infinite Scroll Grid */}
            <div>
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-white">
                    <span className="w-1.5 h-8 bg-cyan-500 rounded-full"></span>
                    {getTitle()}
                </h2>

                <div className="grid grid-cols-3 min-[400px]:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
                    {movies.map((movie, index) => (
                        <MovieCard key={`${movie.id}-${index}`} movie={movie} />
                    ))}
                </div>

                {/* Sentinel element for infinite scroll */}
                <div ref={lastElementRef} className="h-10 w-full" />

                {loading && (
                    <div className="grid grid-cols-3 min-[400px]:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4 mt-4">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="aspect-[2/3] bg-white/5 rounded-lg animate-pulse" />
                        ))}
                    </div>
                )}

                {!loading && movies.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        Không tìm thấy phim nào.
                    </div>
                )}
            </div>
        </div>
    );
};
