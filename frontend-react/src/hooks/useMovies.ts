import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Movie } from '../types';

export const useMovies = () => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q');
    const category = searchParams.get('category');

    useEffect(() => {
        const fetchMovies = async () => {
            setLoading(true);
            try {
                let endpoint = '/api/videos/home';
                if (query) {
                    endpoint = `/api/videos/search?q=${query}`;
                } else if (category && category !== 'home') {
                    endpoint = `/api/videos/home?category=${category}`;
                }

                const res = await fetch(endpoint);
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                const data = await res.json();
                setMovies(data || []);
            } catch {
                console.error("Failed to fetch movies");
            } finally {
                setLoading(false);
            }
        };

        fetchMovies();
    }, [query, category]);

    const getTitle = () => {
        if (query) return `Results for "${query}"`;
        if (category === 'phim-le') return 'Movies';
        if (category === 'phim-bo') return 'Series';
        if (category === 'hoat-hinh') return 'Cartoons';
        if (category === 'tv-shows') return 'TV Shows';
        return 'Latest Movies';
    };

    return { movies, loading, title: getTitle() };
};
