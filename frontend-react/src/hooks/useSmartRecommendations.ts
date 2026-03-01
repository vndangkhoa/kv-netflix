import { useMemo } from 'react';
import type { Movie } from '../types';
import { CATEGORIES } from '../constants';

interface Recommendation {
    id: string;
    title: string;
    category: string;
    reason: string;
}

export const useSmartRecommendations = (history: Movie[]): Recommendation[] => {
    return useMemo(() => {
        if (!history || history.length === 0) return [];

        // Pre-defined mapping for data normalization
        const NORMALIZE_MAP: Record<string, string> = {
            'movies': 'phim-le',
            'phim-le': 'phim-le',
            'series': 'phim-bo',
            'phim-bo': 'phim-bo',
            'cartoon': 'hoat-hinh',
            'animation': 'hoat-hinh',
            'hoat-hinh': 'hoat-hinh',
            'tv-shows': 'tv-shows',
            'tv': 'tv-shows',
            'shows': 'tv-shows'
        };

        // 1. Frequency Map of Categories
        const categoryCounts: Record<string, number> = {};
        history.forEach(movie => {
            if (movie.category) {
                const raw = movie.category.toLowerCase();
                const normalized = NORMALIZE_MAP[raw] || (CATEGORIES.some(c => c.id === raw) ? raw : 'phim-le');

                if (CATEGORIES.some(c => c.id === normalized)) {
                    categoryCounts[normalized] = (categoryCounts[normalized] || 0) + 1;
                }
            }
        });

        // 2. Sort by frequency
        const sortedCategories = Object.entries(categoryCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([cat]) => cat);

        // 3. Get Top 2 Categories
        const topCategories = sortedCategories.slice(0, 2);

        // 4. Map to Recommendation Objects
        const recommendations: Recommendation[] = topCategories.map(catSlug => {
            const catName = CATEGORIES.find(c => c.id === catSlug)?.name || 'Phim';
            return {
                id: `rec-${catSlug}`,
                title: `Gợi ý từ ${catName}`,
                category: catSlug,
                reason: `Based on your interest in ${catName}`
            };
        });

        return recommendations;
    }, [history]);
};
