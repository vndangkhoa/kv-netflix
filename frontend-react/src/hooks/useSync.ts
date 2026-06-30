import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { syncAPI } from '../api/client';
import { useMyList } from './useMyList';
import { useWatchProgress } from './useWatchProgress';

export function useSync() {
    const { isAuthenticated, token } = useAuth();
    const { savedMovies, watchHistory, setSavedMovies, setWatchHistory } = useMyList();
    const { getContinueWatchingMovies, getAllProgress, importFromServer: importProgress } = useWatchProgress();
    const wasAuthenticated = useRef(false);
    const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // On login → push local data first, then pull server data and merge
    useEffect(() => {
        if (!isAuthenticated || !token) {
            wasAuthenticated.current = false;
            return;
        }

        const syncOnLogin = async () => {
            try {
                const localSaved = savedMovies.map(m => ({
                    movie_id: m.id,
                    title: m.title,
                    slug: m.slug,
                    thumbnail: m.thumbnail,
                    backdrop: m.backdrop,
                    year: m.year || 0,
                    category: m.category || '',
                    quality: m.quality || '',
                    director: m.director || '',
                    cast: Array.isArray(m.cast) ? m.cast.join(',') : (m.cast || ''),
                }));

                const localHistory = getAllProgress().map(h => ({
                    movie_id: h.slug,
                    title: h.movieTitle || h.slug,
                    slug: h.slug,
                    thumbnail: h.movieThumbnail || '',
                    backdrop: h.movieBackdrop || '',
                    year: h.movieYear || 0,
                    category: h.movieCategory || '',
                    genre: h.movieGenre || '',
                    country: h.movieCountry || '',
                    quality: '',
                    current_episode: h.episode,
                    watched_timestamp: Math.floor(h.timestamp),
                    duration: Math.floor(h.duration),
                    progress: h.duration > 0 ? h.timestamp / h.duration : 0,
                }));

                const localWatchHistory = watchHistory.map(m => ({
                    movie_id: m.id,
                    title: m.title,
                    slug: m.slug,
                    thumbnail: m.thumbnail,
                    backdrop: m.backdrop || '',
                    year: m.year || 0,
                    category: m.category || '',
                    genre: m.genre || '',
                    country: m.country || '',
                    quality: m.quality || '',
                    current_episode: m.currentEpisode || 0,
                    watched_timestamp: m.watchedTimestamp || 0,
                    duration: m.duration || 0,
                    progress: 0,
                }));

                if (localSaved.length > 0 || localHistory.length > 0 || localWatchHistory.length > 0) {
                    const merged = [...localHistory, ...localWatchHistory];
                    const unique = merged.filter((item, index, self) =>
                        index === self.findIndex(i => i.movie_id === item.movie_id)
                    );
                    const result = await syncAPI.bulkSync(localSaved, unique);

                    if (result.saved_movies?.length > 0) {
                        const serverSaved = result.saved_movies.map(m => ({
                            id: m.movie_id,
                            title: m.title,
                            slug: m.slug,
                            thumbnail: m.thumbnail,
                            backdrop: m.backdrop,
                            year: m.year,
                            category: m.category,
                            quality: m.quality,
                            director: m.director,
                            cast: m.cast ? m.cast.split(',').map(c => c.trim()) : [],
                        }));
                        setSavedMovies(serverSaved);
                    }

                    if (result.watch_history?.length > 0) {
                        const serverHistory = result.watch_history.map(h => ({
                            id: h.movie_id,
                            title: h.title,
                            slug: h.slug,
                            thumbnail: h.thumbnail,
                            backdrop: h.backdrop,
                            year: h.year,
                            category: h.category,
                            quality: h.quality,
                            genre: h.genre,
                            country: h.country,
                            currentEpisode: h.current_episode,
                            watchedTimestamp: h.watched_timestamp,
                            duration: h.duration,
                        }));
                        setWatchHistory(serverHistory);

                        const progressEntries = result.watch_history
                            .filter(h => h.duration > 0)
                            .map(h => ({
                                slug: h.movie_id,
                                episode: h.current_episode,
                                timestamp: h.watched_timestamp,
                                duration: h.duration,
                                updatedAt: h.watched_at || new Date().toISOString(),
                                movieTitle: h.title,
                                movieThumbnail: h.thumbnail,
                                movieBackdrop: h.backdrop,
                                movieYear: h.year,
                                movieCategory: h.category,
                                movieGenre: h.genre,
                                movieCountry: h.country,
                            }));
                        importProgress(progressEntries);
                    }
                } else {
                    const [serverSaved, serverHistory] = await Promise.all([
                        syncAPI.getSavedMovies(),
                        syncAPI.getWatchHistory(),
                    ]);

                    if (serverSaved?.length > 0) {
                        setSavedMovies(serverSaved.map(m => ({
                            id: m.movie_id,
                            title: m.title,
                            slug: m.slug,
                            thumbnail: m.thumbnail,
                            backdrop: m.backdrop,
                            year: m.year,
                            category: m.category,
                            quality: m.quality,
                            director: m.director,
                            cast: m.cast ? m.cast.split(',').map(c => c.trim()) : [],
                        })));
                    }

                    if (serverHistory?.length > 0) {
                        setWatchHistory(serverHistory.map(h => ({
                            id: h.movie_id,
                            title: h.title,
                            slug: h.slug,
                            thumbnail: h.thumbnail,
                            backdrop: h.backdrop,
                            year: h.year,
                            category: h.category,
                            quality: h.quality,
                            genre: h.genre,
                            country: h.country,
                            currentEpisode: h.current_episode,
                            watchedTimestamp: h.watched_timestamp,
                            duration: h.duration,
                        })));

                        const progressEntries = serverHistory
                            .filter(h => h.duration > 0)
                            .map(h => ({
                                slug: h.movie_id,
                                episode: h.current_episode,
                                timestamp: h.watched_timestamp,
                                duration: h.duration,
                                updatedAt: h.watched_at || new Date().toISOString(),
                                movieTitle: h.title,
                                movieThumbnail: h.thumbnail,
                                movieBackdrop: h.backdrop,
                                movieYear: h.year,
                                movieCategory: h.category,
                                movieGenre: h.genre,
                                movieCountry: h.country,
                            }));
                        importProgress(progressEntries);
                    }
                }

                wasAuthenticated.current = true;
            } catch (err) {
                console.error('Initial sync failed:', err);
            }
        };

        if (!wasAuthenticated.current) {
            syncOnLogin();
        }
    }, [isAuthenticated, token]);

    // Push local data to server periodically
    useEffect(() => {
        if (!isAuthenticated) return;

        const pushToServer = async () => {
            try {
                const localSaved = savedMovies.map(m => ({
                    movie_id: m.id,
                    title: m.title,
                    slug: m.slug,
                    thumbnail: m.thumbnail,
                    backdrop: m.backdrop,
                    year: m.year || 0,
                    category: m.category || '',
                    quality: m.quality || '',
                    director: m.director || '',
                    cast: Array.isArray(m.cast) ? m.cast.join(',') : (m.cast || ''),
                }));

                const localHistory = getContinueWatchingMovies().map(h => ({
                    movie_id: h.id,
                    title: h.title,
                    slug: h.slug,
                    thumbnail: h.thumbnail,
                    backdrop: h.backdrop || '',
                    year: h.year || 0,
                    category: h.category || '',
                    genre: h.genre || '',
                    country: h.country || '',
                    quality: h.quality || '',
                    current_episode: h.currentEpisode || 0,
                    watched_timestamp: h.watchedTimestamp || 0,
                    duration: h.duration || 0,
                }));

                if (localSaved.length > 0 || localHistory.length > 0) {
                    await syncAPI.bulkSync(localSaved, localHistory);
                }
            } catch (err) {
                console.error('Push sync failed:', err);
            }
        };

        syncIntervalRef.current = setInterval(pushToServer, 60000);
        window.addEventListener('beforeunload', pushToServer);

        return () => {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
            window.removeEventListener('beforeunload', pushToServer);
        };
    }, [isAuthenticated, savedMovies, getContinueWatchingMovies]);
}
