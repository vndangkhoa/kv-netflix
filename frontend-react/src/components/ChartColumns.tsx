import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clapperboard, HeartHandshake, FolderPlus, ChevronRight } from 'lucide-react';
import type { Movie } from '../types';
import { GENRES } from '../constants';
import { useLang } from '../context/LanguageContext';

// Rotating pill palette cloned from mamphim .chart-list colors
const GENRE_PILL_COLORS = [
    '#742d4b', '#387fda', '#7356b1', '#91ab47', '#a98762',
    '#218a8f', '#9616d1', '#c9512c', '#616994', '#b8860b',
];

interface ChartColumn {
    id: string;
    titleKey: 'chartTrending' | 'chartFavorite' | 'chartHotGenre';
    icon: typeof Clapperboard;
    link: string;
}

const COLUMNS: ChartColumn[] = [
    { id: 'trending', titleKey: 'chartTrending', icon: Clapperboard, link: '/?category=phim-le' },
    { id: 'favorite', titleKey: 'chartFavorite', icon: HeartHandshake, link: '/?category=phim-bo' },
    { id: 'hot-genre', titleKey: 'chartHotGenre', icon: FolderPlus, link: '/' },
];

const getRawImageUrl = (url: string | undefined) => {
    if (!url) return '';
    let clean = url;
    if (clean.includes('{') && clean.includes('}')) {
        try {
            const start = clean.indexOf('{');
            const end = clean.lastIndexOf('}');
            const parsed = JSON.parse(clean.substring(start, end + 1));
            const path = parsed.original || parsed.poster || parsed.resize || '';
            if (path) clean = path.startsWith('http') ? path : `https://phim.nguonc.com${path.startsWith('/') ? '' : '/'}${path}`;
        } catch { /* ignore */ }
    }
    if (clean.startsWith('//')) return `https:${clean}`;
    if (!clean.startsWith('http')) return `https://${clean}`;
    return clean;
};

export const ChartColumns = () => {
    const { t, lang } = useLang();
    const [movies, setMovies] = useState<Record<string, Movie[]>>({});
    const [genreSamples, setGenreSamples] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;

        const fetchColumn = async (key: string, category: string) => {
            try {
                const res = await fetch(`/api/videos/home?category=${category}&limit=10`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && Array.isArray(data)) setMovies(prev => ({ ...prev, [key]: data.slice(0, 10) }));
            } catch { /* ignore */ }
        };

        const fetchGenreSamples = async () => {
            const results = await Promise.allSettled(
                GENRES.slice(0, 10).map(async (g) => {
                    const res = await fetch(`/api/videos/home?category=${g.id}&limit=1`);
                    if (!res.ok) return null;
                    const data = await res.json();
                    return Array.isArray(data) && data.length > 0 ? { id: g.id, title: (data[0] as Movie).title } : null;
                })
            );
            if (cancelled) return;
            const samples: Record<string, string> = {};
            results.forEach((r) => {
                if (r.status === 'fulfilled' && r.value) samples[r.value.id] = r.value.title;
            });
            setGenreSamples(samples);
        };

        fetchColumn('trending', 'phim-le');
        fetchColumn('favorite', 'phim-bo');
        fetchGenreSamples();
        return () => { cancelled = true; };
    }, []);

    const renderChartItems = (movies: Movie[] | undefined) => {
        if (!movies || movies.length === 0) {
            return (
                <div className="text-xs text-[var(--text-dim)] py-6 text-center">{t.loading}</div>
            );
        }
        return movies.map((m, i) => (
            <Link
                key={`${m.id}-${i}`}
                to={`/watch/${m.slug}`}
                tabIndex={0}
                className="flex items-center gap-3 h-[50px] group/item rounded-lg hover:bg-white/5 px-1 -mx-1 transition-colors"
            >
                <span className="opacity-30 font-semibold text-lg w-4 shrink-0">{i + 1}</span>
                {m.thumbnail && (
                    <img
                        src={`/api/images/proxy?url=${encodeURIComponent(getRawImageUrl(m.thumbnail))}&width=60`}
                        alt=""
                        loading="lazy"
                        className="w-[25px] h-[37px] object-cover clip-mamphim shrink-0 bg-[var(--bg-3)]"
                    />
                )}
                <span className="text-white flex-1 truncate text-sm group-hover/item:text-[var(--accent)] transition-colors">
                    {m.title}
                </span>
                {m.quality && <span className="text-[10px] text-[var(--text-dim)] shrink-0">{m.quality}</span>}
            </Link>
        ));
    };

    const renderGenreItems = () => (
        GENRES.slice(0, 10).map((g, i) => (
            <Link
                key={g.id}
                to={`/?category=${g.id}`}
                tabIndex={0}
                className="flex items-center gap-3 h-[50px] group/item rounded-lg hover:bg-white/5 px-1 -mx-1 transition-colors"
            >
                <span className="opacity-30 font-semibold text-lg w-4 shrink-0">{i + 1}</span>
                <span
                    className="text-white rounded-full h-7 px-3 flex items-center text-xs shrink-0"
                    style={{ backgroundColor: GENRE_PILL_COLORS[i % GENRE_PILL_COLORS.length] }}
                >
                    {lang === 'vi' ? g.vi : g.en}
                </span>
                {genreSamples[g.id] && (
                    <span className="text-white/80 truncate text-sm flex-1 min-w-0 group-hover/item:text-[var(--accent)] transition-colors">
                        {genreSamples[g.id]}
                    </span>
                )}
            </Link>
        ))
    );

    return (
        <section className="px-4 sm:px-6 lg:px-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {COLUMNS.map(col => (
                    <div key={col.id} className="rounded-xl p-4 sm:p-5 border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/60">
                        <div className="flex items-center gap-2.5 mb-3">
                            <col.icon size={17} className="text-[var(--accent)] shrink-0" />
                            <span className="text-white font-semibold text-sm flex-1">{t[col.titleKey]}</span>
                            <Link
                                to={col.link}
                                tabIndex={0}
                                className="flex items-center gap-0.5 text-[11px] text-white/50 hover:text-[var(--accent)] transition-colors shrink-0"
                            >
                                {t.viewMore}
                                <ChevronRight size={12} />
                            </Link>
                        </div>
                        <div className="flex flex-col">
                            {col.id === 'hot-genre' ? renderGenreItems() : renderChartItems(movies[col.id])}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
