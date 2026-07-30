import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMyList } from '../hooks/useMyList';
import { useWatchProgress } from '../hooks/useWatchProgress';
import { defaultTheme } from '../themes/default';

const Watch = () => {
    const { slug, episode } = useParams();
    const { addToHistory } = useMyList();
    const { saveProgress } = useWatchProgress();

    // Fetch movie detail to get info for history & watch progress
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

                    // Save watch progress so movie immediately appears in "Tiếp Tục Xem" on main page
                    saveProgress(slug, parseInt(episode || '1'), 1, 100, {
                        title: data.title,
                        thumbnail: data.thumbnail,
                        backdrop: data.backdrop,
                        year: data.year,
                        category: data.category || 'movies',
                        genre: data.genre,
                        country: data.country,
                    });
                }
            } catch {
                console.error("Failed to fetch for history");
            }
        };
        fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, episode]);

    const { WatchPage } = defaultTheme.components;

    return <WatchPage slug={slug || ''} episode={episode || '1'} />;
};

export default Watch;
