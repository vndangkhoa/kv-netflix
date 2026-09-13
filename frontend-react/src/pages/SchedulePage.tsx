import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Sparkles, ChevronRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import type { Movie } from '../types';

const DAYS = [
    { id: 1, label: 'Thứ 2', short: 'T2' },
    { id: 2, label: 'Thứ 3', short: 'T3' },
    { id: 3, label: 'Thứ 4', short: 'T4' },
    { id: 4, label: 'Thứ 5', short: 'T5' },
    { id: 5, label: 'Thứ 6', short: 'T6' },
    { id: 6, label: 'Thứ 7', short: 'T7' },
    { id: 0, label: 'Chủ Nhật', short: 'CN' },
];

export const SchedulePage: React.FC = () => {
    // Current day of week (0 = Sunday, 1 = Monday, etc.)
    const todayId = new Date().getDay();
    const [selectedDay, setSelectedDay] = useState<number>(todayId);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const fetchScheduleMovies = async () => {
            try {
                // Fetch series and ongoing shows
                const res = await fetch('/api/videos/home?category=phim-bo&page=1');
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted && Array.isArray(data)) {
                        setMovies(data);
                    }
                } else {
                    const fallbackRes = await fetch('/api/videos/home?page=1');
                    if (fallbackRes.ok) {
                        const fallbackData = await fallbackRes.json();
                        if (isMounted && Array.isArray(fallbackData)) {
                            setMovies(fallbackData);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load schedule movies:', err);
                if (isMounted) setMovies([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchScheduleMovies();
        return () => { isMounted = false; };
    }, []);

    // Filter or distribute movies across days deterministically
    const scheduledMovies = movies.filter((movie, index) => {
        // Group movies predictably by day using string hash or index
        const hash = (movie.slug || movie.title || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return (hash + index) % 7 === selectedDay;
    });

    const displayMovies = scheduledMovies.length > 0 ? scheduledMovies : movies.slice(0, 10);

    const getProxyUrl = (url: string | undefined, width: number) => {
        if (!url) return '';
        let cleanUrl = url;
        if (url.startsWith('//')) cleanUrl = `https:${url}`;
        else if (!url.startsWith('http')) cleanUrl = `https://${url}`;
        return `/api/images/proxy?url=${encodeURIComponent(cleanUrl)}&width=${width}`;
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
                {/* Header Title */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                            <span className="w-2 h-6 bg-[#ffd875] rounded-full inline-block"></span>
                            Lịch Chiếu Phim
                        </h1>
                        <p className="text-xs md:text-sm text-gray-400 mt-1 font-light">
                            Lịch phát sóng các tập phim bộ, phim truyền hình và anime mới nhất trong tuần trên KV-Netflix.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#202331] rounded-xl border border-white/5 text-xs text-gray-300 self-start md:self-auto">
                        <Clock className="w-4 h-4 text-[#ffd875]" />
                        <span>Múi giờ: <strong>GMT+7 (Hà Nội)</strong></span>
                    </div>
                </div>

                {/* Day of Week Navigation Tabs */}
                <div className="bg-[#202331] rounded-2xl p-2 border border-white/5 shadow-xl overflow-x-auto scrollbar-none">
                    <div className="flex items-center gap-1.5 min-w-max">
                        {DAYS.map(day => {
                            const isToday = day.id === todayId;
                            const isSelected = day.id === selectedDay;
                            return (
                                <button
                                    key={day.id}
                                    onClick={() => setSelectedDay(day.id)}
                                    className={`relative flex flex-col items-center justify-center px-4 py-2.5 rounded-xl transition-all font-semibold text-xs md:text-sm ${
                                        isSelected
                                            ? 'bg-[#ffd875] text-[#191b24] font-bold shadow-md shadow-[#ffd875]/20 scale-105 z-10'
                                            : 'text-gray-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span>{day.label}</span>
                                    {isToday && (
                                        <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                                            isSelected ? 'text-[#191b24]' : 'text-[#ffd875]'
                                        }`}>
                                            Hôm nay
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Movies Grid for Selected Day */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="animate-pulse space-y-2">
                                <div className="aspect-[2/3] bg-[#202331] rounded-xl"></div>
                                <div className="h-3 bg-[#202331] rounded w-3/4"></div>
                                <div className="h-2 bg-[#202331] rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : displayMovies.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {displayMovies.map((movie, idx) => {
                            const airHour = 18 + (idx % 4);
                            const airMinute = (idx * 15) % 60 === 0 ? '00' : (idx * 15) % 60;
                            const airTime = `${airHour}:${airMinute}`;

                            return (
                                <Link
                                    key={movie.id || movie.slug}
                                    to={`/phim/${movie.slug}`}
                                    className="group flex flex-col bg-[#202331] rounded-2xl overflow-hidden border border-white/5 hover:border-[#ffd875]/40 transition-all duration-300 hover:-translate-y-1 shadow-lg"
                                >
                                    {/* Poster Image */}
                                    <div className="aspect-[2/3] relative overflow-hidden bg-[#191b24]">
                                        <img
                                            src={getProxyUrl(movie.thumbnail || movie.backdrop, 500)}
                                            alt={movie.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />

                                        {/* Air Time Badge (Top Left) */}
                                        <div className="absolute top-2 left-2 z-10">
                                            <span className="bg-[#ffd875] text-[#191b24] font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{airTime}</span>
                                            </span>
                                        </div>

                                        {/* Status Tag (Bottom Center) */}
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                                            <span className="bg-black/75 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/10 shadow">
                                                {movie.currentEpisode ? `Tập ${movie.currentEpisode}` : 'Tập mới'}
                                            </span>
                                        </div>

                                        {/* Hover Overlay with Play Button */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                            <div className="w-10 h-10 rounded-full bg-[#ffd875] text-[#191b24] flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                <Play className="w-5 h-5 fill-current ml-0.5" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-xs text-gray-200 group-hover:text-[#ffd875] transition-colors line-clamp-2 leading-snug">
                                                {movie.title}
                                            </h3>
                                            {movie.original_title && (
                                                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                                    {movie.original_title}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-gray-400">
                                            <span className="text-[#ffd875] font-semibold">{movie.quality || 'FHD'}</span>
                                            <span>{movie.year || '2025'}</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-[#202331] rounded-2xl p-12 text-center border border-white/5 my-8">
                        <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                        <p className="text-gray-400 text-sm">Chưa có lịch phát sóng cho ngày này.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default SchedulePage;
