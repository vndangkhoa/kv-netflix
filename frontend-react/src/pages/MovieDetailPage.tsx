import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Heart, Plus, Check, Share2, MessageSquare, Star, Film, Eye, Sparkles } from 'lucide-react';
import { Layout } from '../components/Layout';
import { MovieCard } from '../components/MovieCard';
import { useMyList } from '../hooks/useMyList';
import { useAuth } from '../context/AuthContext';
import type { MovieDetail, Episode, Movie } from '../types';

export const MovieDetailPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { addToList, removeFromList, isSaved } = useMyList();
    const { isAuthenticated } = useAuth();

    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'episodes' | 'gallery' | 'cast' | 'recommended'>('episodes');
    const [selectedSeason, setSelectedSeason] = useState('Phần 1');
    const [audioMode, setAudioMode] = useState<'vietsub' | 'longtieng'>('vietsub');
    const [isCompact, setIsCompact] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSpoiler, setIsSpoiler] = useState(false);
    const [recommended, setRecommended] = useState<Movie[]>([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!slug) return;
        setLoading(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const fetchMovie = async () => {
            try {
                const res = await fetch(`/api/videos/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setMovie(data);
                }
            } catch (err) {
                console.error('Failed to load movie details:', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchRecommended = async () => {
            try {
                const res = await fetch('/api/videos/home?page=1');
                if (res.ok) {
                    const data = await res.json();
                    setRecommended(Array.isArray(data) ? data.slice(0, 10) : []);
                }
            } catch { /* ignore */ }
        };

        fetchMovie();
        fetchRecommended();
    }, [slug]);

    const rawEpisodes: Episode[] = useMemo(() => movie?.episodes || [], [movie?.episodes]);

    const isEpisodeDubbed = (ep: Episode) => {
        const s = `${ep.serverName || ''} ${ep.server_name || ''} ${ep.title || ''}`.toLowerCase();
        return /lồng\s*tiếng|long\s*tieng|thuyết\s*minh|thuyet\s*minh|dub/i.test(s);
    };

    const hasDubbed = useMemo(() => rawEpisodes.some(isEpisodeDubbed), [rawEpisodes]);
    const hasVietsub = useMemo(() => rawEpisodes.some(ep => !isEpisodeDubbed(ep)), [rawEpisodes]);

    // Automatically default audio mode based on available audio tracks
    useEffect(() => {
        if (hasDubbed && !hasVietsub) {
            setAudioMode('longtieng');
        } else {
            setAudioMode('vietsub');
        }
    }, [hasDubbed, hasVietsub]);

    // Unique episodes across the whole movie (deduplicated by episode number)
    const uniqueEpisodes = useMemo(() => {
        const uniqueMap = new Map<number, Episode>();
        for (const ep of rawEpisodes) {
            if (!uniqueMap.has(ep.number)) {
                uniqueMap.set(ep.number, ep);
            }
        }
        return Array.from(uniqueMap.values()).sort((a, b) => a.number - b.number);
    }, [rawEpisodes]);

    // Filtered episodes based on active audio mode and deduplicated by episode number
    // to prevent duplicate buttons from multiple providers (e.g. VSMOV, KKPhim, Ophim)
    const displayedEpisodes = useMemo(() => {
        if (rawEpisodes.length === 0) return [];

        let filtered = rawEpisodes;
        if (hasDubbed && hasVietsub) {
            filtered = audioMode === 'longtieng'
                ? rawEpisodes.filter(isEpisodeDubbed)
                : rawEpisodes.filter(ep => !isEpisodeDubbed(ep));
        } else if (hasDubbed && !hasVietsub) {
            filtered = rawEpisodes.filter(isEpisodeDubbed);
        } else if (hasVietsub && !hasDubbed) {
            filtered = rawEpisodes.filter(ep => !isEpisodeDubbed(ep));
        }

        const uniqueMap = new Map<number, Episode>();
        for (const ep of filtered) {
            if (!uniqueMap.has(ep.number)) {
                uniqueMap.set(ep.number, ep);
            }
        }
        return Array.from(uniqueMap.values()).sort((a, b) => a.number - b.number);
    }, [rawEpisodes, audioMode, hasDubbed, hasVietsub]);

    const saved = movie ? isSaved(movie.id) : false;
    const firstEp = displayedEpisodes.length > 0
        ? displayedEpisodes[0].number
        : (uniqueEpisodes.length > 0 ? uniqueEpisodes[0].number : 1);
    const backdropUrl = movie ? (movie.backdrop || movie.thumbnail || '') : '';
    const posterUrl = movie ? (movie.thumbnail || movie.backdrop || '') : '';

    const handleToggleSave = () => {
        if (!movie) return;
        if (saved) {
            removeFromList(movie.id);
        } else {
            addToList(movie);
        }
    };

    const handleShare = () => {
        if (!movie) return;
        if (navigator.share) {
            navigator.share({
                title: movie.title,
                url: window.location.href,
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Genres parsed as array
    const genreList = movie?.genre
        ? movie.genre.split(',').map(g => g.trim()).filter(Boolean)
        : ['Chính kịch', 'Tình Cảm'];

    if (loading) {
        return (
            <Layout>
                <div className="min-h-screen flex items-center justify-center bg-[#191b24]">
                    <div className="w-12 h-12 border-4 border-[#ffd875] border-t-transparent rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    if (!movie) {
        return (
            <Layout>
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#191b24] text-white px-4 text-center">
                    <h2 className="text-2xl font-bold mb-3">Không tìm thấy phim</h2>
                    <p className="text-[#aaa] mb-6">Nội dung này có thể đã bị gỡ hoặc đường dẫn không đúng.</p>
                    <Link to="/" className="px-6 py-2.5 rounded-full bg-[#ffd875] text-[#191b24] font-bold text-sm">
                        Về trang chủ
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-[#191b24] text-white pb-20">
                {/* 1. Backdrop atmospheric hero (RoPhim top-detail-wrap) */}
                <div className="relative w-full h-[550px] md:h-[700px] lg:h-[800px] overflow-hidden bg-[#202331]">
                    {backdropUrl && (
                        <>
                            {/* Deep blurred ambient backing */}
                            <img
                                src={backdropUrl}
                                alt=""
                                aria-hidden
                                className="absolute inset-0 w-full h-full object-cover blur-[80px] opacity-25 scale-110"
                            />
                            {/* Masked center backdrop */}
                            <div
                                className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-700 opacity-60"
                                style={{
                                    backgroundImage: `url(${backdropUrl})`,
                                    maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 15%, #000 35%, #000 65%, rgba(0,0,0,0.4) 85%, transparent 100%)',
                                    WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.4) 15%, #000 35%, #000 65%, rgba(0,0,0,0.4) 85%, transparent 100%)',
                                }}
                            />
                        </>
                    )}

                    {/* Dotted texture overlay */}
                    <div className="dotted-overlay absolute inset-0 pointer-events-none" />

                    {/* Top gradient for navbar blending */}
                    <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-[#0f111a] via-[#191b24]/80 to-transparent z-1 pointer-events-none" />

                    {/* Bottom gradient fade into page background */}
                    <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-[#191b24] via-[#191b24]/90 to-transparent z-1 pointer-events-none" />
                </div>

                {/* 2. Floating 2-Column Detail Container (RoPhim detail-container) */}
                <div className="max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 -mt-72 md:-mt-80 lg:-mt-96 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                        {/* ── Left Sidebar (dc-side): 4 cols (~420px) ── */}
                        <div className="lg:col-span-4 xl:col-span-4 glass-rophim-dark rounded-3xl lg:rounded-tr-[3.5rem] p-6 sm:p-8 border border-white/10 shadow-2xl">
                            <div className="space-y-6">
                                {/* Poster with nice shadow & rounded corners */}
                                <div className="relative aspect-[2/3] w-3/4 max-w-[280px] mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-white/10">
                                    <img
                                        src={posterUrl}
                                        alt={movie.title}
                                        className="w-full h-full object-cover"
                                    />
                                    {movie.quality && (
                                        <span className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/10">
                                            {movie.quality}
                                        </span>
                                    )}
                                </div>

                                {/* Titles */}
                                <div className="text-center sm:text-left space-y-1">
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                                        {movie.title}
                                    </h1>
                                    <p className="text-sm font-semibold text-[#ffd875]">
                                        {movie.original_title || movie.title}
                                    </p>
                                </div>

                                {/* Badges list */}
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-medium">
                                    <span className="tag-imdb">{movie.rating || '6.8'}</span>
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-white border border-white/5">T16</span>
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-white border border-white/5">{movie.year || 2026}</span>
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-white border border-white/5">{selectedSeason}</span>
                                    {uniqueEpisodes.length > 0 && (
                                        <span className="bg-white/10 px-2 py-0.5 rounded text-white border border-white/5">
                                            Tập {uniqueEpisodes.length}
                                        </span>
                                    )}
                                </div>

                                {/* Genre Tags */}
                                <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                                    {genreList.map((g, idx) => (
                                        <span
                                            key={idx}
                                            className="bg-[#2f3346]/80 hover:bg-[#3e435c] text-xs px-2.5 py-1 rounded-md text-white/90 transition-colors"
                                        >
                                            {g}
                                        </span>
                                    ))}
                                </div>

                                {/* Completion status pill */}
                                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>
                                        {uniqueEpisodes.length <= 1
                                            ? 'Phim trọn bộ'
                                            : movie.quality?.toLowerCase().includes('hoàn tất')
                                                ? `Đã hoàn thành: Trọn bộ ${uniqueEpisodes.length} tập`
                                                : `Đang phát sóng: Tập ${uniqueEpisodes.length}`}
                                    </span>
                                </div>

                                {/* Synopsis */}
                                <div className="space-y-2 pt-4 border-t border-white/10">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Giới thiệu:</h3>
                                    <p
                                        className="text-xs sm:text-sm leading-relaxed text-[#ccc] font-light max-h-36 overflow-y-auto pr-1"
                                        dangerouslySetInnerHTML={{ __html: movie.description || 'Chưa có thông tin giới thiệu.' }}
                                    />
                                </div>

                                {/* Metadata List */}
                                <div className="space-y-2 pt-4 border-t border-white/10 text-xs sm:text-sm">
                                    <div className="flex justify-between py-1">
                                        <span className="text-[#888]">Thời lượng:</span>
                                        <span className="text-white font-medium">{movie.time || `${movie.duration || 45}m`}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-[#888]">Quốc gia:</span>
                                        <span className="text-white font-medium">{movie.country || 'Hàn Quốc'}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-[#888]">Đạo diễn:</span>
                                        <span className="text-white font-medium">{movie.director || 'Đang cập nhật'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Right Content (dc-main): 8 cols ── */}
                        <div className="lg:col-span-8 xl:col-span-8 glass-rophim rounded-3xl lg:rounded-tl-[3.5rem] p-6 sm:p-8 border border-white/10 shadow-2xl flex flex-col space-y-8">
                            {/* Top Action Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Primary Play Button */}
                                    <button
                                        onClick={() => navigate(`/watch/${movie.slug}/${firstEp}`)}
                                        className="primary-gradient font-bold px-6 py-3 rounded-full flex items-center gap-2.5 shadow-xl hover:scale-105 transition-all text-sm group"
                                    >
                                        <Play className="w-5 h-5 fill-[#191b24] text-[#191b24]" />
                                        <div className="text-left">
                                            <div className="text-xs uppercase tracking-wider leading-none">Xem Phim</div>
                                            <div className="text-[10px] font-normal opacity-80 leading-none mt-0.5">Tập 1</div>
                                        </div>
                                    </button>

                                    {/* Action Icons */}
                                    <button
                                        onClick={handleToggleSave}
                                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all ${saved ? 'text-[#ffd875]' : 'text-white'}`}
                                        title={saved ? 'Đã yêu thích' : 'Yêu thích'}
                                    >
                                        <Heart size={18} className={saved ? 'fill-[#ffd875]' : ''} />
                                        <span className="text-[9px] mt-0.5">Yêu thích</span>
                                    </button>

                                    <button
                                        onClick={handleToggleSave}
                                        className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-white"
                                        title="Thêm vào danh sách"
                                    >
                                        {saved ? <Check size={18} className="text-[#ffd875]" /> : <Plus size={18} />}
                                        <span className="text-[9px] mt-0.5">Thêm vào</span>
                                    </button>

                                    <button
                                        onClick={handleShare}
                                        className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-white"
                                        title="Chia sẻ"
                                    >
                                        <Share2 size={18} />
                                        <span className="text-[9px] mt-0.5">{copied ? 'Đã copy' : 'Chia sẻ'}</span>
                                    </button>

                                    <a
                                        href="#comments"
                                        className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-white"
                                        title="Bình luận"
                                    >
                                        <MessageSquare size={18} />
                                        <span className="text-[9px] mt-0.5">Bình luận</span>
                                    </a>
                                </div>

                                {/* Rating Pill */}
                                <div className="bg-[#2563eb] text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1.5 shadow-lg">
                                    <Star size={16} className="fill-white" />
                                    <span>{movie.rating ? Math.round(Number(movie.rating) || 10) : 10}</span>
                                    <span className="text-xs font-normal opacity-90">Đánh giá</span>
                                </div>
                            </div>

                            {/* Secondary Tabs (Tập phim, Gallery, Diễn viên, Đề xuất) */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-8 border-b border-white/10 pb-3 text-sm font-semibold">
                                    <button
                                        onClick={() => setActiveTab('episodes')}
                                        className={`relative pb-3 transition-colors ${activeTab === 'episodes' ? 'text-[#ffd875]' : 'text-white/70 hover:text-white'}`}
                                    >
                                        Tập phim
                                        {activeTab === 'episodes' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffd875] rounded-full" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('gallery')}
                                        className={`relative pb-3 transition-colors ${activeTab === 'gallery' ? 'text-[#ffd875]' : 'text-white/70 hover:text-white'}`}
                                    >
                                        Gallery
                                        {activeTab === 'gallery' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffd875] rounded-full" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('cast')}
                                        className={`relative pb-3 transition-colors ${activeTab === 'cast' ? 'text-[#ffd875]' : 'text-white/70 hover:text-white'}`}
                                    >
                                        Diễn viên
                                        {activeTab === 'cast' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffd875] rounded-full" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('recommended')}
                                        className={`relative pb-3 transition-colors ${activeTab === 'recommended' ? 'text-[#ffd875]' : 'text-white/70 hover:text-white'}`}
                                    >
                                        Đề xuất
                                        {activeTab === 'recommended' && (
                                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffd875] rounded-full" />
                                        )}
                                    </button>
                                </div>

                                {/* Tab 1: Episodes Section */}
                                {activeTab === 'episodes' && (
                                    <div className="space-y-6">
                                        {/* Season / Translation selectors & compact toggle */}
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="flex flex-wrap items-center gap-3">
                                                {/* Season Dropdown */}
                                                <div className="relative">
                                                    <select
                                                        value={selectedSeason}
                                                        onChange={(e) => setSelectedSeason(e.target.value)}
                                                        className="bg-[#282b3a] text-white text-xs sm:text-sm font-semibold py-2 pl-3 pr-8 rounded-lg border border-white/10 appearance-none cursor-pointer focus:outline-none focus:border-[#ffd875]"
                                                    >
                                                        <option value="Phần 1">Phần 1</option>
                                                    </select>
                                                </div>

                                                {/* Audio mode pills */}
                                                <div className="flex items-center bg-[#202331] rounded-lg p-1 border border-white/5 text-xs font-medium">
                                                    <button
                                                        onClick={() => setAudioMode('vietsub')}
                                                        disabled={!hasVietsub}
                                                        className={`px-3 py-1.5 rounded-md transition-colors ${
                                                            !hasVietsub
                                                                ? 'opacity-40 cursor-not-allowed text-[#666]'
                                                                : audioMode === 'vietsub'
                                                                    ? 'bg-[#2f3346] text-[#ffd875] font-semibold'
                                                                    : 'text-[#888] hover:text-white'
                                                        }`}
                                                        title={!hasVietsub ? 'Không có bản Vietsub' : 'Vietsub'}
                                                    >
                                                        Vietsub
                                                    </button>
                                                    <button
                                                        onClick={() => hasDubbed && setAudioMode('longtieng')}
                                                        disabled={!hasDubbed}
                                                        className={`px-3 py-1.5 rounded-md transition-colors ${
                                                            !hasDubbed
                                                                ? 'opacity-40 cursor-not-allowed text-[#666]'
                                                                : audioMode === 'longtieng'
                                                                    ? 'bg-[#2f3346] text-[#ffd875] font-semibold'
                                                                    : 'text-[#888] hover:text-white'
                                                        }`}
                                                        title={!hasDubbed ? 'Chưa có bản Lồng Tiếng / Thuyết Minh' : 'Lồng Tiếng'}
                                                    >
                                                        Lồng Tiếng
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Rút gọn switch */}
                                            <div className="flex items-center gap-2 text-xs text-[#aaa]">
                                                <span>Rút gọn</span>
                                                <button
                                                    onClick={() => setIsCompact(!isCompact)}
                                                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${isCompact ? 'bg-[#ffd875]' : 'bg-[#2f3346]'}`}
                                                    aria-label="Toggle compact episode list"
                                                >
                                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isCompact ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Episode Buttons Grid */}
                                        <div className={`grid ${isCompact ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3'}`}>
                                            {displayedEpisodes.map((ep) => (
                                                <button
                                                    key={ep.number}
                                                    onClick={() => navigate(`/watch/${movie.slug}/${ep.number}`)}
                                                    className="bg-[#202331] hover:bg-[#ffd875] hover:text-[#191b24] text-white font-medium py-2.5 px-3 rounded-xl border border-white/5 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all group active:scale-95 shadow-sm"
                                                >
                                                    <Play className="w-3.5 h-3.5 fill-current opacity-60 group-hover:opacity-100" />
                                                    <span>Tập {ep.number}</span>
                                                </button>
                                            ))}
                                            {displayedEpisodes.length === 0 && rawEpisodes.length > 0 && (
                                                <div className="col-span-full text-center py-6 text-sm text-[#888]">
                                                    Chưa có tập phim cho tùy chọn này.
                                                </div>
                                            )}
                                            {displayedEpisodes.length === 0 && rawEpisodes.length === 0 && (
                                                <button
                                                    onClick={() => navigate(`/watch/${movie.slug}/1`)}
                                                    className="bg-[#202331] hover:bg-[#ffd875] hover:text-[#191b24] text-white font-medium py-3 px-4 rounded-xl border border-white/5 flex items-center justify-center gap-2 text-sm transition-all col-span-2"
                                                >
                                                    <Play className="w-4 h-4 fill-current" />
                                                    <span>Xem Full Phim</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Tab 2: Gallery */}
                                {activeTab === 'gallery' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {[backdropUrl, posterUrl].map((img, idx) => (
                                            <div key={idx} className="aspect-video rounded-xl overflow-hidden border border-white/10 shadow-lg">
                                                <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Tab 3: Cast */}
                                {activeTab === 'cast' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {movie.cast && movie.cast.length > 0 ? (
                                            movie.cast.map((actor, idx) => (
                                                <Link
                                                    key={idx}
                                                    to={`/dien-vien/${encodeURIComponent(actor.toLowerCase().replace(/\s+/g, '-'))}`}
                                                    className="p-3 rounded-xl bg-[#202331] hover:bg-[#282b3a] border border-white/5 flex items-center gap-3 transition-colors group"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-[#2f3346] flex items-center justify-center font-bold text-white/70 overflow-hidden border border-white/10">
                                                        {actor.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="text-xs font-semibold text-white group-hover:text-[#ffd875] truncate">{actor}</div>
                                                        <div className="text-[10px] text-[#888]">Diễn viên</div>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <p className="text-sm text-[#888]">Thông tin diễn viên đang được cập nhật.</p>
                                        )}
                                    </div>
                                )}

                                {/* Tab 4: Recommended */}
                                {activeTab === 'recommended' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {recommended.map(rec => (
                                            <MovieCard key={rec.id} movie={rec} linkTo="detail" />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 3. Comments Section (RoPhim Bình luận) */}
                            <div id="comments" className="pt-8 border-t border-white/10 space-y-4">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-[#ffd875]" />
                                    <h3 className="text-lg font-bold text-white">Bình luận (27)</h3>
                                </div>

                                <p className="text-xs text-[#aaa]">
                                    Vui lòng <button onClick={() => navigate('/my-list')} className="text-[#ffd875] font-semibold hover:underline">đăng nhập</button> để tham gia bình luận.
                                </p>

                                {/* Comment Form */}
                                <div className="bg-[#202331] rounded-2xl p-4 border border-white/5 space-y-3">
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value.slice(0, 1000))}
                                        placeholder="Viết bình luận..."
                                        rows={3}
                                        className="w-full bg-transparent text-sm text-white placeholder-[#777] focus:outline-none resize-none"
                                    />
                                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-1.5 text-[#aaa] cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isSpoiler}
                                                    onChange={(e) => setIsSpoiler(e.target.checked)}
                                                    className="rounded border-white/20 bg-transparent text-[#ffd875] focus:ring-0"
                                                />
                                                <span>Tiết lộ?</span>
                                            </label>
                                            <span className="text-[#666]">{commentText.length} / 1000</span>
                                        </div>

                                        <button
                                            onClick={() => {
                                                if (commentText.trim()) {
                                                    setCommentText('');
                                                }
                                            }}
                                            className="px-4 py-1.5 rounded-full bg-[#ffd875] hover:bg-[#ffde8a] text-[#191b24] font-bold text-xs flex items-center gap-1 shadow transition-all active:scale-95"
                                        >
                                            <span>Gửi</span>
                                            <span>➔</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default MovieDetailPage;
