import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { syncAPI } from '../api/client';
import { useMyList } from './useMyList';
import { useWatchProgress } from './useWatchProgress';

export function useSync() {
    const { isAuthenticated, token } = useAuth();
    const { savedMovies } = useMyList();
    const { getContinueWatchingMovies } = useWatchProgress();
    const syncedRef = useRef(false);
    const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // On login, pull server data
    useEffect(() => {
        if (!isAuthenticated || !token || syncedRef.current) return;

        const pullFromServer = async () => {
            try {
                const [serverSaved, serverHistory] = await Promise.all([
                    syncAPI.getSavedMovies(),
                    syncAPI.getWatchHistory(),
                ]);
                console.log(`Synced: ${serverSaved.length} saved, ${serverHistory.length} watched`);
                syncedRef.current = true;
            } catch (err) {
                console.error('Sync failed:', err);
            }
        };

        pullFromServer();
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
                    year: m.year,
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
                    backdrop: h.backdrop,
                    year: h.year,
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
