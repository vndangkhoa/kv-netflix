import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, Share2, Film, User, ChevronRight, Search, Play } from 'lucide-react';
import { Layout } from '../components/Layout';
import type { Movie } from '../types';

interface ActorItem {
    slug: string;
    name: string;
    avatar: string;
    region: string;
    role?: string;
    filmCount?: number;
}

interface ActorDetailResponse {
    actor: ActorItem;
    otherNames: string;
    bio: string;
    gender: string;
    birthday: string;
    movies: Movie[];
}

const REGIONS = ['Tất cả', 'Trung Quốc', 'Hàn Quốc', 'Âu Mỹ', 'Việt Nam', 'Nhật Bản'];

export const ActorPage: React.FC = () => {
    const { name } = useParams<{ name?: string }>();
    const isDirectoryMode = !name;
    const actorParam = name ? decodeURIComponent(name) : '';

    // Directory state
    const [actors, setActors] = useState<ActorItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('Tất cả');

    // Specific actor state
    const [actorDetail, setActorDetail] = useState<ActorDetailResponse | null>(null);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowed, setIsFollowed] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'time'>('all');
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    // Load data based on mode
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (isDirectoryMode) {
            // Load real actors from backend API
            fetch('/api/actors?limit=100')
                .then(res => res.json())
                .then(data => {
                    if (isMounted) {
                        const items = Array.isArray(data) ? data : (data?.items || []);
                        setActors(items);
                    }
                })
                .catch(err => {
                    console.error('Failed to load actors list:', err);
                })
                .finally(() => {
                    if (isMounted) setLoading(false);
                });
        } else {
            // Specific actor mode: fetch actor profile and their real filmography
            fetch(`/api/actors/${encodeURIComponent(actorParam)}`)
                .then(res => {
                    if (!res.ok) throw new Error('Actor not found');
                    return res.json();
                })
                .then((data: ActorDetailResponse) => {
                    if (isMounted) {
                        setActorDetail(data);
                        setMovies(data.movies || []);
                    }
                })
                .catch(err => {
                    console.error('Failed to load actor works:', err);
                    // Fallback to title search if actor not in rophim directory
                    fetch(`/api/videos/search?q=${encodeURIComponent(actorParam)}`)
                        .then(r => r.json())
                        .then(searchData => {
                            if (isMounted && Array.isArray(searchData)) {
                                setMovies(searchData);
                            }
                        })
                        .catch(() => {});
                })
                .finally(() => {
                    if (isMounted) setLoading(false);
                });
        }

        return () => { isMounted = false; };
    }, [isDirectoryMode, actorParam]);

    // Filter actors in directory mode
    const filteredActors = useMemo(() => {
        return actors.filter(actor => {
            const matchesRegion =
                selectedRegion === 'Tất cả' ||
                actor.region?.toLowerCase().includes(selectedRegion.toLowerCase());
            const matchesSearch =
                !searchTerm ||
                actor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                actor.slug.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesRegion && matchesSearch;
        });
    }, [actors, selectedRegion, searchTerm]);

    const handleShare = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            showToast('Đã sao chép liên kết trang diễn viên!');
        }
    };

    const handleFollow = () => {
        setIsFollowed(prev => !prev);
        const displayName = actorDetail?.actor?.name || actorParam;
        showToast(!isFollowed ? `Đã thêm ${displayName} vào mục yêu thích` : `Đã bỏ yêu thích ${displayName}`);
    };

    // Filter or sort movies
    const displayedMovies = useMemo(() => {
        const list = [...movies];
        if (activeTab === 'time') {
            return list.sort((a, b) => (b.year || 0) - (a.year || 0));
        }
        return list;
    }, [movies, activeTab]);

    const actorDisplayName = actorDetail?.actor?.name || actorParam;
    const actorAvatar = actorDetail?.actor?.avatar || '';

    // ==========================================
    // 1. DIRECTORY MODE (/dien-vien)
    // ==========================================
    if (isDirectoryMode) {
        return (
            <Layout>
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                                <span className="w-2 h-6 bg-[#ffd875] rounded-full inline-block shadow-sm shadow-[#ffd875]/40"></span>
                                Danh Sách Diễn Viên &amp; Nghệ Sĩ
                            </h1>
                            <p className="text-xs md:text-sm text-gray-400 mt-1 font-light">
                                Khám phá các gương mặt diễn viên điện ảnh và truyền hình nổi tiếng trên KV-Netflix.
                            </p>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-72">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Tìm diễn viên theo tên..."
                                className="w-full bg-[#202331] text-xs text-white pl-9 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-[#ffd875] focus:outline-none transition-all placeholder:text-gray-500"
                            />
                        </div>
                    </div>

                    {/* Region Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 text-xs">
                        {REGIONS.map(reg => (
                            <button
                                key={reg}
                                onClick={() => setSelectedRegion(reg)}
                                className={`px-4 py-2 rounded-xl font-semibold transition-all whitespace-nowrap border ${
                                    selectedRegion === reg
                                        ? 'bg-[#ffd875] text-[#191b24] border-[#ffd875] shadow-md shadow-[#ffd875]/20 font-bold'
                                        : 'bg-[#202331] text-gray-300 border-white/5 hover:bg-[#282b3a] hover:text-white'
                                }`}
                            >
                                {reg}
                            </button>
                        ))}
                    </div>

                    {/* Real Actors Grid */}
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {Array.from({ length: 18 }).map((_, i) => (
                                <div key={i} className="bg-[#202331] rounded-2xl p-4 animate-pulse flex flex-col items-center space-y-3 border border-white/5">
                                    <div className="w-24 h-24 rounded-full bg-[#191b24]"></div>
                                    <div className="h-3 bg-[#191b24] rounded w-20"></div>
                                    <div className="h-2 bg-[#191b24] rounded w-14"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredActors.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filteredActors.map((actor, idx) => (
                                <Link
                                    key={actor.slug || idx}
                                    to={`/dien-vien/${actor.slug}`}
                                    className="group flex flex-col items-center text-center bg-[#202331] hover:bg-[#282b3a] rounded-2xl p-4 sm:p-5 border border-white/5 hover:border-[#ffd875]/50 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[#ffd875]/10"
                                >
                                    {/* Avatar */}
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#ffd875] transition-all mb-3 bg-[#191b24] relative shadow-md">
                                        {actor.avatar ? (
                                            <img
                                                src={`/api/images/proxy?url=${encodeURIComponent(actor.avatar)}&width=250`}
                                                alt={actor.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                loading="lazy"
                                                onError={(e) => {
                                                    // fallback to raw avatar
                                                    (e.currentTarget as HTMLImageElement).src = actor.avatar;
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">
                                                {actor.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Name & Region */}
                                    <h3 className="font-bold text-sm text-white group-hover:text-[#ffd875] transition-colors line-clamp-1">
                                        {actor.name}
                                    </h3>
                                    <span className="text-[11px] text-gray-400 mt-1">
                                        {actor.region || 'Diễn viên'}
                                    </span>
                                    <span className="mt-2 text-[10px] bg-[#ffd875]/10 text-[#ffd875] border border-[#ffd875]/20 px-2.5 py-0.5 rounded-full font-semibold group-hover:bg-[#ffd875] group-hover:text-[#191b24] transition-all">
                                        Xem phim ➔
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[#202331] rounded-2xl p-12 text-center border border-white/5 my-8">
                            <User className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                            <p className="text-gray-400 text-sm">Không tìm thấy diễn viên phù hợp với từ khóa "{searchTerm}".</p>
                        </div>
                    )}
                </div>
            </Layout>
        );
    }

    // ==========================================
    // 2. SPECIFIC ACTOR PROFILE (/dien-vien/:name)
    // ==========================================
    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Link to="/" className="hover:text-white transition-colors">Trang chủ</Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <Link to="/dien-vien" className="hover:text-white transition-colors">Diễn viên</Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-[#ffd875] font-semibold">{actorDisplayName}</span>
                </div>

                {/* 2-Column Main Section matching reference */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Actor Profile Sidebar */}
                    <div className="lg:col-span-4 bg-[#202331] rounded-2xl p-6 border border-white/5 space-y-6 shadow-xl sticky top-20">
                        {/* Profile Image Squircle matching screenshot */}
                        <div className="aspect-square w-44 sm:w-56 mx-auto rounded-2xl overflow-hidden shadow-2xl bg-[#191b24] border-2 border-white/10 relative group">
                            {actorAvatar ? (
                                <img
                                    src={`/api/images/proxy?url=${encodeURIComponent(actorAvatar)}&width=400`}
                                    alt={actorDisplayName}
                                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = actorAvatar;
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                                    <User className="w-16 h-16 stroke-1 mb-2" />
                                    <span className="text-xs">Chưa có ảnh</span>
                                </div>
                            )}
                        </div>

                        {/* Name */}
                        <div className="text-center space-y-1">
                            <h1 className="text-2xl font-black text-white tracking-tight">{actorDisplayName}</h1>
                            <p className="text-xs text-gray-400 font-light">Diễn viên điện ảnh &amp; truyền hình</p>
                        </div>

                        {/* Action Buttons: Yêu thích & Chia sẻ */}
                        <div className="flex items-center gap-3 justify-center">
                            <button
                                onClick={handleFollow}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                                    isFollowed
                                        ? 'bg-[#ffd875] text-[#191b24]'
                                        : 'bg-[#282b3a] hover:bg-[#323649] text-white border border-white/10'
                                }`}
                            >
                                <Heart className={`w-4 h-4 ${isFollowed ? 'fill-current' : ''}`} />
                                <span>{isFollowed ? 'Đã yêu thích' : 'Yêu thích'}</span>
                            </button>

                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#282b3a] hover:bg-[#323649] text-white border border-white/10 rounded-xl font-bold text-xs transition-all"
                            >
                                <Share2 className="w-4 h-4" />
                                <span>Chia sẻ</span>
                            </button>
                        </div>

                        {/* Metadata Details Table matching Reference Screenshot */}
                        <div className="border-t border-white/5 pt-4 space-y-3 text-xs">
                            <div className="flex flex-col gap-1 py-1 border-b border-white/5">
                                <span className="text-gray-400">Tên gọi khác:</span>
                                <span className="text-gray-200 font-medium">
                                    {actorDetail?.otherNames || actorDisplayName}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1 py-1 border-b border-white/5">
                                <span className="text-gray-400">Giới thiệu:</span>
                                <p className="text-gray-300 font-light leading-relaxed">
                                    {actorDetail?.bio && actorDetail.bio !== 'Đang cập nhật'
                                        ? actorDetail.bio
                                        : `${actorDisplayName} là gương mặt diễn viên nổi bật với nhiều tác phẩm điện ảnh và truyền hình đặc sắc trên KV-Netflix.`}
                                </p>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="text-gray-400">Giới tính:</span>
                                <span className="text-gray-200 font-semibold">
                                    {actorDetail?.gender || 'Nam'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="text-gray-400">Ngày sinh:</span>
                                <span className="text-gray-200 font-medium">
                                    {actorDetail?.birthday || 'Đang cập nhật'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-1">
                                <span className="text-gray-400">Tổng số phim:</span>
                                <span className="text-[#ffd875] font-bold">
                                    {movies.length} phim
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Filmography / Works */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Header Box with Filter Tabs: Tất cả | Thời gian */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#202331] rounded-2xl p-4 sm:p-5 border border-white/5">
                            <div className="flex items-center gap-2.5">
                                <Film className="w-5 h-5 text-[#ffd875]" />
                                <h2 className="text-lg font-bold text-white">
                                    Các phim đã tham gia{' '}
                                    <span className="text-[#ffd875]">({displayedMovies.length})</span>
                                </h2>
                            </div>

                            <div className="flex items-center gap-1.5 bg-[#191b24] p-1 rounded-xl border border-white/5 text-xs">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                                        activeTab === 'all'
                                            ? 'bg-[#ffd875] text-[#191b24] font-bold shadow-sm'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Tất cả
                                </button>
                                <button
                                    onClick={() => setActiveTab('time')}
                                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                                        activeTab === 'time'
                                            ? 'bg-[#ffd875] text-[#191b24] font-bold shadow-sm'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Thời gian
                                </button>
                            </div>
                        </div>

                        {/* Real Filmography Grid matching Image 2 */}
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className="animate-pulse space-y-2">
                                        <div className="aspect-[2/3] bg-[#202331] rounded-xl"></div>
                                        <div className="h-3 bg-[#202331] rounded w-3/4"></div>
                                        <div className="h-2 bg-[#202331] rounded w-1/2"></div>
                                    </div>
                                ))}
                            </div>
                        ) : displayedMovies.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {displayedMovies.map((movie) => {
                                    const posterUrl = movie.thumbnail || movie.backdrop || '';
                                    const qualityBadges = (movie.quality || 'FHD').split(' ').filter(Boolean);
                                    const aliasTitle = movie.original_title || (movie as any).originalTitle || '';

                                    return (
                                        <div key={movie.id || movie.slug} className="group/card flex flex-col h-full">
                                            <Link
                                                to={`/phim/${movie.slug}`}
                                                className="block relative aspect-[2/3] rounded-xl overflow-hidden bg-[#191b24] border border-white/5 shadow-md hover:shadow-xl hover:shadow-[#ffd875]/10 transition-all duration-300 group-hover/card:-translate-y-1"
                                            >
                                                {/* Poster */}
                                                {posterUrl ? (
                                                    <img
                                                        src={`/api/images/proxy?url=${encodeURIComponent(posterUrl)}&width=300`}
                                                        alt={movie.title}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLImageElement).src = posterUrl;
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs p-2 text-center">
                                                        {movie.title}
                                                    </div>
                                                )}

                                                {/* Badges on bottom or top matching rophim style */}
                                                <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10 pointer-events-none">
                                                    {qualityBadges.map((badge, bIdx) => {
                                                        const isGreen = badge.includes('T.Minh') || badge.includes('TM');
                                                        return (
                                                            <span
                                                                key={bIdx}
                                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow ${
                                                                    isGreen
                                                                        ? 'bg-emerald-600/90 text-white'
                                                                        : 'bg-black/75 backdrop-blur-md text-white/90 border border-white/10'
                                                                }`}
                                                            >
                                                                {badge.length <= 4 && !badge.includes('.') && !isNaN(Number(badge))
                                                                    ? `PD. ${badge}`
                                                                    : badge === 'Full'
                                                                    ? 'PD. Full'
                                                                    : badge}
                                                            </span>
                                                        );
                                                    })}
                                                </div>

                                                {/* Center Play Button on Hover */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none">
                                                    <div className="p-3 bg-[#ffd875] text-[#191b24] rounded-full shadow-xl transform scale-90 group-hover/card:scale-100 transition-transform">
                                                        <Play className="w-5 h-5 fill-current" />
                                                    </div>
                                                </div>
                                            </Link>

                                            {/* Titles below poster */}
                                            <div className="mt-2 px-0.5 text-left">
                                                <Link
                                                    to={`/phim/${movie.slug}`}
                                                    className="font-semibold text-white text-xs md:text-sm leading-snug line-clamp-1 group-hover/card:text-[#ffd875] transition-colors"
                                                    title={movie.title}
                                                >
                                                    {movie.title}
                                                </Link>
                                                <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 font-light" title={aliasTitle}>
                                                    {aliasTitle || (movie.year ? `Năm ${movie.year}` : '')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-[#202331] rounded-2xl p-12 text-center border border-white/5">
                                <p className="text-gray-400 text-sm">Chưa có danh sách phim nào của diễn viên này.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Toast */}
                {toast && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                        <div className="px-5 py-2.5 bg-[#202331] border border-[#ffd875]/30 text-white text-xs font-semibold rounded-2xl shadow-2xl backdrop-blur-xl">
                            {toast}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ActorPage;
