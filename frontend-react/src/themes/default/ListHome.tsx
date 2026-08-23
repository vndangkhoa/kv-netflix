import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Heart, Clock, BookmarkCheck, Users, ChevronRight } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { GENRES } from '../../constants';
import { useLang } from '../../context/LanguageContext';
import { useMyList } from '../../hooks/useMyList';
import { useWatchProgress } from '../../hooks/useWatchProgress';
import { useSmartRecommendations } from '../../hooks/useSmartRecommendations';
import { useAuth } from '../../context/AuthContext';
import type { Movie } from '../../types';

const GENRE_COLORS: Record<string, string> = {
    'hanh-dong': 'bg-emerald-500',
    'tinh-cam': 'bg-red-500',
    'hai-huoc': 'bg-amber-500',
    'co-trang': 'bg-purple-500',
    'tam-ly': 'bg-yellow-500',
    'hinh-su': 'bg-red-400',
    'chien-tranh': 'bg-blue-500',
    'the-thao': 'bg-orange-500',
    'vo-thuat': 'bg-cyan-500',
    'vien-tuong': 'bg-indigo-500',
    'phieu-luu': 'bg-teal-500',
    'khoa-hoc': 'bg-sky-500',
    'kinh-di': 'bg-slate-600',
    'am-nhac': 'bg-pink-500',
    'than-thoai': 'bg-violet-500',
    'tai-lieu': 'bg-stone-500',
    'gia-dinh': 'bg-lime-500',
    'chinh-kich': 'bg-rose-500',
    'bi-an': 'bg-gray-500',
    'hoc-duong': 'bg-cyan-400',
    'kinh-dien': 'bg-amber-600',
    'phim-18': 'bg-red-700',
    'short-drama': 'bg-fuchsia-500',
};

function getGenreColor(id: string): string {
    return GENRE_COLORS[id] || 'bg-gray-500';
}

interface NumberedListProps {
    title: string;
    icon: React.ReactNode;
    movies: Movie[];
    maxItems?: number;
    onNavigate: (slug: string) => void;
}

const NumberedList = ({ title, icon, movies, maxItems = 10, onNavigate }: NumberedListProps) => (
    <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                {icon}
                {title}
            </h3>
            <span className="text-xs text-[var(--text-dim)] flex items-center gap-0.5 cursor-pointer hover:text-[var(--accent)]">
                Xem thêm <ChevronRight size={12} />
            </span>
        </div>
        <div className="space-y-0.5">
            {movies.slice(0, maxItems).map((movie, idx) => (
                <div
                    key={`${movie.id}-${idx}`}
                    onClick={() => onNavigate(movie.slug)}
                    className="flex items-center gap-2.5 py-1.5 cursor-pointer hover:bg-[var(--bg-tertiary)] rounded-lg px-1.5 transition-colors group"
                >
                    <span className="text-xs font-bold text-[var(--text-dim)] w-4 text-center flex-shrink-0">{idx + 1}</span>
                    <img
                        src={movie.thumbnail || movie.backdrop || ''}
                        alt={movie.title}
                        className="w-8 h-10 object-cover rounded flex-shrink-0"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">{movie.title}</p>
                    </div>
                    {movie.quality && (
                        <span className="text-[10px] font-medium text-[var(--accent)] flex-shrink-0">{movie.quality}</span>
                    )}
                </div>
            ))}
        </div>
    </div>
);

interface GenreListProps {
    title: string;
    maxItems?: number;
}

const GenreList = ({ title, maxItems = 10 }: GenreListProps) => {
    const navigate = useNavigate();
    return (
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    {title}
                </h3>
                <span className="text-xs text-[var(--text-dim)] flex items-center gap-0.5 cursor-pointer hover:text-[var(--accent)]">
                    Xem thêm <ChevronRight size={12} />
                </span>
            </div>
            <div className="space-y-0.5">
                {GENRES.slice(0, maxItems).map((genre, idx) => (
                    <div
                        key={genre.id}
                        onClick={() => navigate(`/?category=${genre.id}`)}
                        className="flex items-center gap-2.5 py-1.5 cursor-pointer hover:bg-[var(--bg-tertiary)] rounded-lg px-1.5 transition-colors group"
                    >
                        <span className="text-xs font-bold text-[var(--text-dim)] w-4 text-center flex-shrink-0">{idx + 1}</span>
                        <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded ${getGenreColor(genre.id)} flex-shrink-0`}>
                            {genre.vi}
                        </span>
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                            {genre.en}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ListHome = () => {
    const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
    const [, setLoading] = useState(true);
    const navigate = useNavigate();
    const { t } = useLang();
    const { isAuthenticated } = useAuth();
    const { savedMovies } = useMyList();
    const { getContinueWatchingMovies } = useWatchProgress();
    const continueWatching = getContinueWatchingMovies();
    const recommendations = useSmartRecommendations([]);

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const res = await fetch('/api/videos/home');
                if (res.ok) {
                    const data = await res.json();
                    setTrendingMovies(data || []);
                }
            } catch {
                console.error('Failed to fetch movies');
            } finally {
                setLoading(false);
            }
        };
        fetchMovies();
    }, []);

    const handleNavigate = (slug: string) => {
        navigate(`/phim/${slug}`);
    };

    return (
        <Layout>
            <div className="px-4 sm:px-6 lg:px-12 pt-6 pb-12 space-y-8">
                {/* Login Prompt Banner */}
                {!isAuthenticated && (
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Đăng nhập để lưu phim xem tiếp</h2>
                                <p className="text-xs text-[var(--text-muted)] mb-3">Lưu phim đang xem, đồng bộ trên nhiều thiết bị, tạo danh sách riêng – hoàn toàn miễn phí.</p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="flex items-center gap-2 text-sm font-bold text-[var(--accent)] bg-[var(--accent-bg)] hover:bg-[var(--accent-bg-hover)] px-4 py-2 rounded-xl transition-colors"
                                >
                                    <LogIn size={14} />
                                    Đăng nhập
                                </button>
                            </div>
                            <div className="hidden sm:grid grid-cols-2 gap-3 text-xs text-[var(--text-muted)]">
                                <div className="flex items-center gap-2"><Clock size={13} className="text-[var(--accent)]" /> Lưu tiến trình xem</div>
                                <div className="flex items-center gap-2"><Heart size={13} className="text-[var(--accent)]" /> Thêm phim yêu thích</div>
                                <div className="flex items-center gap-2"><BookmarkCheck size={13} className="text-[var(--accent)]" /> Đồng bộ đã thiết bị</div>
                                <div className="flex items-center gap-2"><Users size={13} className="text-[var(--accent)]" /> Tạo danh sách riêng</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Three Column Numbered Lists */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <NumberedList
                        title="Sôi nổi nhất"
                        icon={<span className="text-[var(--accent)]">🔥</span>}
                        movies={trendingMovies}
                        onNavigate={handleNavigate}
                    />
                    <NumberedList
                        title="Yêu thích nhất"
                        icon={<Heart size={14} className="text-[var(--accent)]" />}
                        movies={savedMovies.length > 0 ? savedMovies : trendingMovies.slice(10, 20)}
                        onNavigate={handleNavigate}
                    />
                    <GenreList
                        title="Thể loại Hot"
                    />
                </div>

                {/* Continue Watching */}
                {continueWatching.length > 0 && (
                    <section>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <span className="w-1 h-5 bg-[var(--accent)] rounded-full" />
                            {t.continueWatching}
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                            {continueWatching.map((movie, idx) => (
                                <div
                                    key={`${movie.id}-${idx}`}
                                    onClick={() => handleNavigate(movie.slug)}
                                    className="group cursor-pointer"
                                >
                                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[var(--bg-elevated)]">
                                        <img
                                            src={movie.thumbnail || movie.backdrop || ''}
                                            alt={movie.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                        {movie.currentEpisode && (
                                            <div className="absolute top-1.5 left-1.5 bg-[var(--accent)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                Tập {movie.currentEpisode}
                                            </div>
                                        )}
                                        {movie.watchedTimestamp && movie.duration && movie.duration > 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                                                <div
                                                    className="h-full bg-[var(--accent)]"
                                                    style={{ width: `${Math.min(100, (movie.watchedTimestamp / movie.duration) * 100)}%` }}
                                                />
                                            </div>
                                        )}
                                        <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            {movie.watchedTimestamp && movie.duration
                                                ? `${Math.floor((movie.duration - movie.watchedTimestamp) / 60)} left`
                                                : ''}
                                        </div>
                                    </div>
                                    <p className="text-xs font-medium text-[var(--text-primary)] mt-1.5 truncate group-hover:text-[var(--accent)] transition-colors">{movie.title}</p>
                                    {movie.year && <p className="text-[10px] text-[var(--text-dim)]">{movie.year}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                    <section>
                        {recommendations.map(rec => (
                            <div key={rec.id} className="mb-6">
                                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <span className="w-1 h-5 bg-[var(--accent)] rounded-full" />
                                    {rec.title}
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                                    {trendingMovies.slice(0, 6).map((movie, idx) => (
                                        <div
                                            key={`${movie.id}-${idx}`}
                                            onClick={() => handleNavigate(movie.slug)}
                                            className="group cursor-pointer"
                                        >
                                            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[var(--bg-elevated)]">
                                                <img
                                                    src={movie.thumbnail || movie.backdrop || ''}
                                                    alt={movie.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    loading="lazy"
                                                />
                                                {movie.quality && (
                                                    <div className="absolute top-1.5 right-1.5 bg-[var(--accent)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                        {movie.quality}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs font-medium text-[var(--text-primary)] mt-1.5 truncate group-hover:text-[var(--accent)] transition-colors">{movie.title}</p>
                                            {movie.year && <p className="text-[10px] text-[var(--text-dim)]">{movie.year}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                )}
            </div>
        </Layout>
    );
};
