import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { netflixTheme } from '../themes/netflix';
import { appleTheme } from '../themes/apple';
import { useMyList } from '../hooks/useMyList';

import { defaultTheme } from '../themes/default';

const themes = {
    netflix: netflixTheme,
    apple: appleTheme,
    default: defaultTheme,
};

const Watch = () => {
    const { slug, episode } = useParams();
    const { currentTheme } = useTheme();
    const { addToHistory } = useMyList();

    // Fetch movie detail to get info for history
    useEffect(() => {
        if (!slug) return;
        const fetchDetail = async () => {
            try {
                const res = await fetch(`/api/videos/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    // Add to history when loaded
                    addToHistory({
                        id: data.id,
                        title: data.title,
                        original_title: data.original_title,
                        slug: data.slug,
                        thumbnail: data.thumbnail,
                        backdrop: data.backdrop,
                        year: data.year,
                        category: data.category || 'movies',
                        quality: data.quality,
                        director: data.director,
                        cast: data.cast
                    });
                }
            } catch {
                console.error("Failed to fetch for history");
            }
        };
        fetchDetail();
    }, [slug]);

    // Select the current theme components
    const ActiveTheme = themes[currentTheme];
    const { WatchPage } = ActiveTheme.components;

    return <WatchPage slug={slug || ''} episode={episode || '1'} />;
};

export default Watch;
