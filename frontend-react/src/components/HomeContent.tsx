import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Movie } from '../types';
import MovieRow from './MovieRow';
import { MovieCard } from './MovieCard';
import { Hero } from './Hero';
import { CATEGORIES, GENRES } from '../constants';
import { useLang } from '../context/LanguageContext';

import { useMyList } from '../hooks/useMyList';
import { useSmartRecommendations } from '../hooks/useSmartRecommendations';
import { useWatchProgress } from '../hooks/useWatchProgress';

export const HomeContent = () => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const { watchHistory, savedMovies } = useMyList();
    const { getContinueWatchingMovies } = useWatchProgress();
    const continueWatching = getContinueWatchingMovies();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const { t, lang } = useLang();

    const isFiltered = !!(query || (category && category !== 'home'));

    const observer = useRef<IntersectionObserver | null>(null);
    const [rowMoviesMap, setRowMoviesMap] = useState<Record<string, Movie[]>>({});

    const handleRowMoviesLoaded = useCallback((rowId: string, loadedMovies: Movie[]) => {
        setRowMoviesMap(prev => {
            const existing = prev[rowId];
            if (existing && existing.length === loadedMovies.length && existing.every((m, i) => m.id === loadedMovies[i].id)) {
                return prev;
            }
            return { ...prev, [rowId]: loadedMovies };
        });
    }, []);

    useEffect(() => {
        setRowMoviesMap({});
        setMovies([]);
        setPage(1);
        setHasMore(true);
        setLoading(true);
    }, [query, category]);

    const rowOrder = useMemo(() => [
        'continueWatching',
        'myList',
        'latestUpdates',
        ...CATEGORIES.filter(c => c.id !== 'my-list').map(c => `cat-${c.id}`),
        ...GENRES.slice(0, 8).map(g => `genre-${g.id}`),
    ], []);

    const getExcludeIds = useCallback((rowId: string): Set<string> => {
        const excludeSet = new Set<string>();

        if (movies.length > 0) {
            movies.slice(0, 5).forEach(m => {
                if (m.id) excludeSet.add(m.id);
                if (m.slug) excludeSet.add(m.slug);
                const normTitle = (m.title || '').toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').replace(/[^a-z0-9]/g, '');
                if (normTitle) excludeSet.add(normTitle);
            });
        }

        const targetIdx = rowOrder.indexOf(rowId);
        if (targetIdx > 0) {
            for (let i = 0; i < targetIdx; i++) {
                const prevRowId = rowOrder[i];
                const prevMovies = rowMoviesMap[prevRowId] || [];
                for (const m of prevMovies) {
                    if (m.id) excludeSet.add(m.id);
                    if (m.slug) excludeSet.add(m.slug);
                    const normTitle = (m.title || '').toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').replace(/[^a-z0-9]/g, '');
                    if (normTitle) excludeSet.add(normTitle);
                }
            }
        }
        return excludeSet;
    }, [movies, rowOrder, rowMoviesMap]);

    useEffect(() => {
        const fetchMovies = async () => {
            if (page === 1) setLoading(true);
            else setFetchingMore(true);

            try {
                let endpoint = '/api/videos/home';
                if (query) {
                    endpoint = `/api/videos/search?q=${encodeURIComponent(query)}&page=${page}`;
                } else if (category && category !== 'home') {
                    endpoint = `/api/videos/home?category=${category}&page=${page}`;
                } else {
                    endpoint = `/api/videos/home?page=${page}`;
                }

                const res = await fetch(endpoint);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();

                if (!data || data.length === 0) {
                    setHasMore(false);
                } else {
                    setMovies(prev => {
                        if (page === 1) return data;
                        const existingIds = new Set(prev.map(m => m.id));
                        return [...prev, ...data.filter((m: Movie) => !existingIds.has(m.id))];
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
        if (category === 'phim-le') return t.movies;
        if (category === 'phim-bo') return t.series;
        if (category === 'hoat-hinh') return t.animation;
        if (category === 'tv-shows') return t.tvShows;
        if (category === 'phim-sap-chieu') return t.upcoming;
        if (category === 'phim-hay') return t.movies;
        if (category) return t.movies;
        return t.home;
    };

    const lastWatched = watchHistory.length > 0 ? watchHistory[0] : null;
    const recommendations = useSmartRecommendations(watchHistory);

    // ── Filtered View (search / category) ────────────────────────────
    if (isFiltered) {
        return (
            <div className="px-4 sm:px-6 lg:px-12 pt-6 pb-12">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-[var(--text-primary)]">
                    <span className="w-1 h-6 bg-accent rounded-full" />
                    {getTitle()}
                </h2>

                <div className="grid grid-cols-3 min-[400px]:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
                    {movies.map((movie, index) => (
                        <MovieCard key={`${movie.id}-${index}`} movie={movie} />
                    ))}
                </div>

                <div ref={lastElementRef} className="h-10 w-full" />

                {loading && (
                    <div className="grid grid-cols-3 min-[400px]:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4 mt-4">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="aspect-[2/3] bg-[var(--bg-elevated)] rounded-lg animate-pulse" />
                        ))}
                    </div>
                )}

                {!loading && movies.length === 0 && (
                    <div className="text-center py-16 text-[var(--text-muted)]">
                        {t.exploreEmpty}
                    </div>
                )}
            </div>
        );
    }

    // ── Home View (curated rows) ─────────────────────────────────────
    return (
        <div className="space-y-10 pb-12">
            {/* Hero Carousel Banner at the very top */}
            {movies.length > 0 && (
                <div className="-mt-14 relative z-10">
                    <Hero movies={movies.slice(0, 5)} />
                </div>
            )}

            <div className="px-4 sm:px-6 lg:px-12 space-y-10">
                {/* Personal Section */}
                {(continueWatching.length > 0 || savedMovies.length > 0) && (
                    <section>
                        {continueWatching.length > 0 && (
                            <MovieRow
                                rowId="continueWatching"
                                title={t.continueWatching}
                                movies={continueWatching}
                                onMoviesLoaded={handleRowMoviesLoaded}
                            />
                        )}
                        {savedMovies.length > 0 && (
                            <MovieRow
                                rowId="myList"
                                title={t.myList}
                                movies={savedMovies}
                                excludeIds={getExcludeIds("myList")}
                                onMoviesLoaded={handleRowMoviesLoaded}
                            />
                        )}
                    </section>
                )}

                {/* Smart Recommendations */}
                {recommendations.length > 0 && (
                    <section>
                        {recommendations.map(rec => (
                            <MovieRow key={rec.id} title={rec.title} category={rec.category} />
                        ))}
                    </section>
                )}

                {/* Director / Cast Suggestions */}
                {lastWatched && (lastWatched.director || (lastWatched.cast && lastWatched.cast.length > 0)) && (
                    <section>
                        {lastWatched.director && (
                            <MovieRow
                                title={`${t.director} ${lastWatched.director.replace(/,$/, '').trim()}`}
                                searchQuery={lastWatched.director.replace(/,$/, '').trim()}
                                key={`dir-${lastWatched.id}`}
                            />
                        )}
                        {lastWatched.cast && lastWatched.cast.length > 0 && (
                            <MovieRow
                                title={`${t.castMember} ${lastWatched.cast[0].replace(/,$/, '').trim()}`}
                                searchQuery={lastWatched.cast[0].replace(/,$/, '').trim()}
                                key={`act-${lastWatched.id}`}
                            />
                        )}
                    </section>
                )}

                {/* New Updates */}
                <section>
                    <MovieRow
                        rowId="latestUpdates"
                        title={t.latestUpdates}
                        category="home"
                        excludeIds={getExcludeIds("latestUpdates")}
                        onMoviesLoaded={handleRowMoviesLoaded}
                    />
                </section>

                {/* Top 10 by Category */}
                <section>
                    {CATEGORIES.filter(c => c.id !== 'my-list').map(cat => (
                        <MovieRow
                            key={cat.id}
                            rowId={`cat-${cat.id}`}
                            title={`Top 10 ${cat.id === 'han-quoc' ? 'K-drama' : cat.id === 'trung-quoc' ? 'C-drama' : t[cat.nameKey as keyof typeof t] || cat.nameKey}`}
                            category={cat.id}
                            limit={10}
                            excludeIds={getExcludeIds(`cat-${cat.id}`)}
                            onMoviesLoaded={handleRowMoviesLoaded}
                        />
                    ))}
                </section>

                {/* Genre Rows */}
                <section>
                    {GENRES.slice(0, 8).map(g => (
                        <MovieRow
                            key={g.id}
                            rowId={`genre-${g.id}`}
                            title={lang === 'vi' ? g.vi : g.en}
                            category={g.id}
                            excludeIds={getExcludeIds(`genre-${g.id}`)}
                            onMoviesLoaded={handleRowMoviesLoaded}
                        />
                    ))}
                </section>
            </div>
        </div>
    );
};
