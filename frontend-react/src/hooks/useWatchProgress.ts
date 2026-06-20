import { useState, useEffect, useCallback } from 'react';
import type { Movie } from '../types';

const STORAGE_KEY = 'streamflow_watch_progress';

interface ProgressData {
    episode: number;
    timestamp: number;
    duration: number;
    updatedAt: string;
    movieTitle?: string;
    movieThumbnail?: string;
    movieBackdrop?: string;
    movieYear?: number;
    movieCategory?: string;
    movieGenre?: string;
    movieCountry?: string;
}

interface StoredProgress {
    [slug: string]: ProgressData;
}

export interface WatchProgress extends ProgressData {
    slug: string;
    movieTitle?: string;
    movieThumbnail?: string;
    movieBackdrop?: string;
    movieYear?: number;
    movieCategory?: string;
    movieGenre?: string;
    movieCountry?: string;
}

export const useWatchProgress = () => {
    const [progressMap, setProgressMap] = useState<StoredProgress>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progressMap));
        } catch (e) {
            console.error('Failed to save watch progress:', e);
        }
    }, [progressMap]);

    const getProgress = useCallback((slug: string): ProgressData | null => {
        return progressMap[slug] || null;
    }, [progressMap]);

    const saveProgress = useCallback((slug: string, episode: number, timestamp: number, duration: number, movieInfo?: {
        title?: string;
        thumbnail?: string;
        backdrop?: string;
        year?: number;
        category?: string;
        genre?: string;
        country?: string;
    }) => {
        setProgressMap(prev => ({
            ...prev,
            [slug]: {
                episode,
                timestamp,
                duration,
                updatedAt: new Date().toISOString(),
                movieTitle: movieInfo?.title,
                movieThumbnail: movieInfo?.thumbnail,
                movieBackdrop: movieInfo?.backdrop,
                movieYear: movieInfo?.year,
                movieCategory: movieInfo?.category,
                movieGenre: movieInfo?.genre,
                movieCountry: movieInfo?.country,
            }
        }));
    }, []);

    const getAllProgress = useCallback((): WatchProgress[] => {
        return Object.entries(progressMap)
            .map(([slug, data]) => ({
                slug,
                ...data,
            }))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [progressMap]);

    const getContinueWatchingMovies = useCallback(() => {
        return Object.entries(progressMap)
            .map(([slug, data]) => ({
                id: slug,
                title: data.movieTitle || slug,
                slug: slug,
                thumbnail: data.movieThumbnail || '',
                backdrop: data.movieBackdrop || undefined,
                year: data.movieYear || undefined,
                category: data.movieCategory || 'movies',
                genre: data.movieGenre,
                country: data.movieCountry,
                // Add progress info for display
                currentEpisode: data.episode,
                watchedTimestamp: data.timestamp,
                duration: data.duration,
            } as Movie))
            .sort((a, b) => new Date(progressMap[b.slug!].updatedAt).getTime() - new Date(progressMap[a.slug!].updatedAt).getTime());
    }, [progressMap]);

    const clearProgress = useCallback((slug: string) => {
        setProgressMap(prev => {
            const newMap = { ...prev };
            delete newMap[slug];
            return newMap;
        });
    }, []);

    const clearAllProgress = useCallback(() => {
        setProgressMap({});
    }, []);

    return {
        getProgress,
        saveProgress,
        getAllProgress,
        getContinueWatchingMovies,
        clearProgress,
        clearAllProgress,
    };
};
