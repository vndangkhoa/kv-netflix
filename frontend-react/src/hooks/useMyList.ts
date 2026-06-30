import { useState, useEffect } from 'react';
import type { Movie } from '../types';

interface MyListState {
    saved: Movie[];
    history: Movie[];
}

export const useMyList = () => {
    const [list, setList] = useState<MyListState>(() => {
        const saved = localStorage.getItem('streamflow_mylist');
        return saved ? JSON.parse(saved) : { saved: [], history: [] };
    });

    useEffect(() => {
        localStorage.setItem('streamflow_mylist', JSON.stringify(list));
    }, [list]);

    const addToList = (movie: Movie) => {
        setList(prev => {
            if (prev.saved.some(m => m.id === movie.id)) return prev;
            return { ...prev, saved: [movie, ...prev.saved] };
        });
    };

    const removeFromList = (movieId: string) => {
        setList(prev => ({
            ...prev,
            saved: prev.saved.filter(m => m.id !== movieId)
        }));
    };

    const addToHistory = (movie: Movie) => {
        setList(prev => {
            const filtered = prev.history.filter(m => m.id !== movie.id);

            // Normalize Category to ensure it works with Recommendations
            let cat = movie.category?.toLowerCase() || 'phim-le';
            if (cat === 'movies') cat = 'phim-le';
            if (cat === 'series') cat = 'phim-bo';
            if (cat === 'animation') cat = 'hoat-hinh';
            if (cat === 'cartoon') cat = 'hoat-hinh';
            if (cat === 'tv') cat = 'tv-shows';

            const normalizedMovie = { ...movie, category: cat };

            return { ...prev, history: [normalizedMovie, ...filtered].slice(0, 50) };
        });
    };

    const isSaved = (movieId: string) => list.saved.some(m => m.id === movieId);

    const importFromServer = (saved: Movie[], history: Movie[]) => {
        setList(prev => {
            const mergedSaved = [...saved];
            for (const m of prev.saved) {
                if (!mergedSaved.some(s => s.id === m.id)) {
                    mergedSaved.push(m);
                }
            }
            const mergedHistory = [...history];
            for (const m of prev.history) {
                if (!mergedHistory.some(s => s.id === m.id)) {
                    mergedHistory.push(m);
                }
            }
            return { saved: mergedSaved, history: mergedHistory.slice(0, 50) };
        });
    };

    const setSavedMovies = (movies: Movie[]) => {
        setList(prev => ({ ...prev, saved: movies }));
    };

    const setWatchHistory = (movies: Movie[]) => {
        setList(prev => ({ ...prev, history: movies.slice(0, 50) }));
    };

    return {
        savedMovies: list.saved,
        watchHistory: list.history,
        addToList,
        removeFromList,
        addToHistory,
        isSaved,
        importFromServer,
        setSavedMovies,
        setWatchHistory,
    };
};
