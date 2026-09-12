import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Filter, ChevronRight, ChevronLeft, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Layout } from '../components/Layout';
import { MovieCard } from '../components/MovieCard';
import type { Movie } from '../types';

const SORT_OPTIONS = [
    { id: 'update', label: 'Mới cập nhật' },
    { id: 'created', label: 'Thời gian đăng' },
    { id: 'year', label: 'Năm sản xuất' },
    { id: 'views', label: 'Lượt xem' },
    { id: 'rating', label: 'Điểm đánh giá' },
];

const FORMAT_OPTIONS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'phim-le', label: 'Phim Lẻ' },
    { id: 'phim-bo', label: 'Phim Bộ' },
    { id: 'hoat-hinh', label: 'Hoạt Hình' },
    { id: 'tv-shows', label: 'TV Shows' },
];

const GENRE_OPTIONS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'hanh-dong', label: 'Hành Động' },
    { id: 'co-trang', label: 'Cổ Trang' },
    { id: 'chien-tranh', label: 'Chiến Tranh' },
    { id: 'vien-tuong', label: 'Viễn Tưởng' },
    { id: 'kinh-di', label: 'Kinh Dị' },
    { id: 'tai-lieu', label: 'Tài Liệu' },
    { id: 'bi-an', label: 'Bí Ẩn' },
    { id: 'tinh-cam', label: 'Tình Cảm' },
    { id: 'tam-ly', label: 'Tâm Lý' },
    { id: 'the-thao', label: 'Thể Thao' },
    { id: 'phi-luu', label: 'Phiêu Lưu' },
    { id: 'am-nhac', label: 'Âm Nhạc' },
    { id: 'gia-dinh', label: 'Gia Đình' },
    { id: 'hai-huoc', label: 'Hài Hước' },
    { id: 'hinh-su', label: 'Hình Sự' },
    { id: 'vo-thuat', label: 'Võ Thuật' },
    { id: 'khoa-hoc', label: 'Khoa Học' },
    { id: 'than-thoai', label: 'Thần Thoại' },
    { id: 'chinh-kich', label: 'Chính Kịch' },
];

const COUNTRY_OPTIONS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'trung-quoc', label: 'Trung Quốc' },
    { id: 'han-quoc', label: 'Hàn Quốc' },
    { id: 'nhat-ban', label: 'Nhật Bản' },
    { id: 'au-my', label: 'Âu Mỹ' },
    { id: 'thai-lan', label: 'Thái Lan' },
    { id: 'dai-loan', label: 'Đài Loan' },
    { id: 'an-do', label: 'Ấn Độ' },
    { id: 'viet-nam', label: 'Việt Nam' },
    { id: 'hong-kong', label: 'Hồng Kông' },
];

const YEAR_OPTIONS = [
    { id: 'all', label: 'Tất cả' },
    { id: '2026', label: '2026' },
    { id: '2025', label: '2025' },
    { id: '2024', label: '2024' },
    { id: '2023', label: '2023' },
    { id: '2022', label: '2022' },
    { id: '2021', label: '2021' },
    { id: '2020', label: '2020' },
    { id: '2019', label: '2019' },
    { id: '2018', label: '2018' },
    { id: '2017', label: '2017' },
    { id: '2016', label: '2016' },
    { id: '2015', label: '2015' },
    { id: 'truoc-2015', label: 'Trước 2015' },
];

export const CatalogPage: React.FC = () => {
    const location = useLocation();
    const params = useParams<{ slug?: string }>();
    const navigate = useNavigate();

    // Determine initial active filters based on URL route
    const isMoviesRoute = location.pathname.includes('/phim-le');
    const isSeriesRoute = location.pathname.includes('/phim-bo');
    const isGenreRoute = location.pathname.includes('/the-loai');
    const isCountryRoute = location.pathname.includes('/quoc-gia');

    const [selectedSort, setSelectedSort] = useState('update');
    const [selectedFormat, setSelectedFormat] = useState(
        isMoviesRoute ? 'phim-le' : isSeriesRoute ? 'phim-bo' : 'all'
    );
    const [selectedGenre, setSelectedGenre] = useState(
        isGenreRoute && params.slug ? params.slug : 'all'
    );
    const [selectedCountry, setSelectedCountry] = useState(
        isCountryRoute && params.slug ? params.slug : 'all'
    );
    const [selectedYear, setSelectedYear] = useState('all');

    const [page, setPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');
    const [filterOpen, setFilterOpen] = useState(true);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);

    // Sync route parameters if user navigates via navbar dropdown
    useEffect(() => {
        if (isMoviesRoute) setSelectedFormat('phim-le');
        else if (isSeriesRoute) setSelectedFormat('phim-bo');

        if (isGenreRoute && params.slug) {
            setSelectedGenre(params.slug);
        }
        if (isCountryRoute && params.slug) {
            setSelectedCountry(params.slug);
        }
        setPage(1);
        setPageInput('1');
    }, [location.pathname, params.slug, isMoviesRoute, isSeriesRoute, isGenreRoute, isCountryRoute]);

    // Fetch movies when any filter or page changes
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const fetchCatalog = async () => {
            try {
                let categoryParam = '';
                if (selectedGenre !== 'all') {
                    categoryParam = selectedGenre;
                } else if (selectedFormat !== 'all') {
                    categoryParam = selectedFormat;
                } else if (selectedCountry !== 'all') {
                    categoryParam = selectedCountry;
                }

                const endpoint = categoryParam
                    ? `/api/videos/home?category=${categoryParam}&page=${page}`
                    : `/api/videos/home?page=${page}`;

                const res = await fetch(endpoint);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                if (!isMounted) return;

                if (Array.isArray(data)) {
                    let result = [...data];

                    // Client-side year filter if specified
                    if (selectedYear !== 'all') {
                        if (selectedYear === 'truoc-2015') {
                            result = result.filter(m => (m.year || 0) < 2015);
                        } else {
                            const y = parseInt(selectedYear);
                            result = result.filter(m => m.year === y);
                        }
                    }

                    // Client-side sorting
                    if (selectedSort === 'year') {
                        result.sort((a, b) => (b.year || 0) - (a.year || 0));
                    } else if (selectedSort === 'rating') {
                        result.sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'));
                    }

                    setMovies(result);
                } else {
                    setMovies([]);
                }
            } catch (err) {
                console.error('Failed to load catalog movies:', err);
                if (isMounted) setMovies([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchCatalog();
        return () => { isMounted = false; };
    }, [selectedFormat, selectedGenre, selectedCountry, selectedYear, selectedSort, page]);

    // Compute dynamic title
    const getPageTitle = () => {
        if (selectedGenre !== 'all') {
            const found = GENRE_OPTIONS.find(g => g.id === selectedGenre);
            return found ? `Phim ${found.label}` : 'Danh sách phim';
        }
        if (selectedCountry !== 'all') {
            const found = COUNTRY_OPTIONS.find(c => c.id === selectedCountry);
            return found ? `Phim ${found.label}` : 'Danh sách phim';
        }
        if (selectedFormat === 'phim-le') return 'Phim Lẻ Mới Cập Nhật';
        if (selectedFormat === 'phim-bo') return 'Phim Bộ Mới Cập Nhật';
        if (selectedFormat === 'hoat-hinh') return 'Phim Hoạt Hình';
        if (selectedFormat === 'tv-shows') return 'Chương Trình TV';
        return 'Tất Cả Phim';
    };

    const handlePageJump = (e: React.FormEvent) => {
        e.preventDefault();
        const p = parseInt(pageInput);
        if (!isNaN(p) && p > 0) {
            setPage(p);
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
                {/* Header Title & Subtitle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                            <span className="w-2 h-6 bg-[#ffd875] rounded-full inline-block"></span>
                            {getPageTitle()}
                        </h1>
                        <p className="text-xs md:text-sm text-gray-400 mt-1 font-light">
                            Kho phim tuyển chọn phong phú, cập nhật liên tục các tập mới nhất với chất lượng cao Full HD.
                        </p>
                    </div>

                    <button
                        onClick={() => setFilterOpen(v => !v)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#202331] hover:bg-[#282b3a] text-sm font-semibold text-gray-200 rounded-xl border border-white/10 transition-all self-start md:self-auto"
                    >
                        <SlidersHorizontal className="w-4 h-4 text-[#ffd875]" />
                        <span>{filterOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}</span>
                    </button>
                </div>

                {/* Collapsible Filter Matrix */}
                {filterOpen && (
                    <div className="bg-[#202331] rounded-2xl p-4 sm:p-6 border border-white/5 space-y-4 shadow-xl animate-fade-in text-xs">
                        {/* 1. Sắp xếp */}
                        <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap">
                            <span className="text-gray-400 font-bold uppercase tracking-wider w-20 flex-shrink-0 pt-1.5">
                                Sắp xếp:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap flex-1">
                                {SORT_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setSelectedSort(opt.id); setPage(1); }}
                                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                            selectedSort === opt.id
                                                ? 'bg-[#ffd875] text-[#191b24] font-bold shadow-md shadow-[#ffd875]/20'
                                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Định dạng */}
                        <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap pt-2 border-t border-white/5">
                            <span className="text-gray-400 font-bold uppercase tracking-wider w-20 flex-shrink-0 pt-1.5">
                                Định dạng:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap flex-1">
                                {FORMAT_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setSelectedFormat(opt.id); setPage(1); }}
                                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                            selectedFormat === opt.id
                                                ? 'bg-[#ffd875] text-[#191b24] font-bold shadow-md shadow-[#ffd875]/20'
                                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Thể loại */}
                        <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap pt-2 border-t border-white/5">
                            <span className="text-gray-400 font-bold uppercase tracking-wider w-20 flex-shrink-0 pt-1.5">
                                Thể loại:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap flex-1">
                                {GENRE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setSelectedGenre(opt.id); setPage(1); }}
                                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                            selectedGenre === opt.id
                                                ? 'bg-[#ffd875] text-[#191b24] font-bold shadow-md shadow-[#ffd875]/20'
                                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. Quốc gia */}
                        <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap pt-2 border-t border-white/5">
                            <span className="text-gray-400 font-bold uppercase tracking-wider w-20 flex-shrink-0 pt-1.5">
                                Quốc gia:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap flex-1">
                                {COUNTRY_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setSelectedCountry(opt.id); setPage(1); }}
                                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                            selectedCountry === opt.id
                                                ? 'bg-[#ffd875] text-[#191b24] font-bold shadow-md shadow-[#ffd875]/20'
                                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 5. Năm */}
                        <div className="flex items-start gap-2 flex-wrap sm:flex-nowrap pt-2 border-t border-white/5">
                            <span className="text-gray-400 font-bold uppercase tracking-wider w-20 flex-shrink-0 pt-1.5">
                                Năm:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap flex-1">
                                {YEAR_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setSelectedYear(opt.id); setPage(1); }}
                                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                            selectedYear === opt.id
                                                ? 'bg-[#ffd875] text-[#191b24] font-bold shadow-md shadow-[#ffd875]/20'
                                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Movies Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                        {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className="animate-pulse space-y-2">
                                <div className="aspect-[2/3] bg-[#202331] rounded-xl"></div>
                                <div className="h-3 bg-[#202331] rounded w-3/4"></div>
                                <div className="h-2 bg-[#202331] rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : movies.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
                        {movies.map(movie => (
                            <MovieCard key={movie.id || movie.slug} movie={movie} linkTo="detail" />
                        ))}
                    </div>
                ) : (
                    <div className="bg-[#202331] rounded-2xl p-12 text-center border border-white/5 my-8">
                        <p className="text-gray-400 text-base">Không tìm thấy phim phù hợp với bộ lọc hiện tại.</p>
                        <button
                            onClick={() => {
                                setSelectedGenre('all');
                                setSelectedCountry('all');
                                setSelectedYear('all');
                                setSelectedFormat('all');
                                setSelectedSort('update');
                                setPage(1);
                            }}
                            className="mt-4 px-5 py-2 bg-[#ffd875] text-[#191b24] font-bold text-xs rounded-xl shadow-md"
                        >
                            Đặt lại bộ lọc
                        </button>
                    </div>
                )}

                {/* Pagination */}
                {!loading && movies.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 border-t border-white/5 text-xs">
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg bg-[#202331] text-gray-300 hover:text-white hover:bg-[#282b3a] border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                aria-label="Trang trước"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {/* Page numbers */}
                            {[Math.max(1, page - 2), Math.max(1, page - 1), page, page + 1, page + 2]
                                .filter((p, idx, arr) => arr.indexOf(p) === idx && p > 0)
                                .map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 rounded-lg font-bold transition-all ${
                                            p === page
                                                ? 'bg-[#ffd875] text-[#191b24] shadow-md shadow-[#ffd875]/20'
                                                : 'bg-[#202331] text-gray-300 hover:text-white hover:bg-[#282b3a] border border-white/5'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}

                            <button
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 rounded-lg bg-[#202331] text-gray-300 hover:text-white hover:bg-[#282b3a] border border-white/5 transition-all"
                                aria-label="Trang sau"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Page input jump */}
                        <form onSubmit={handlePageJump} className="flex items-center gap-2">
                            <span className="text-gray-400">Đến trang:</span>
                            <input
                                type="number"
                                min="1"
                                value={pageInput}
                                onChange={(e) => setPageInput(e.target.value)}
                                className="w-14 bg-[#191b24] border border-white/10 rounded-lg px-2 py-1 text-center text-white focus:outline-none focus:border-[#ffd875]"
                            />
                            <button
                                type="submit"
                                className="px-3 py-1 bg-[#202331] hover:bg-[#ffd875] hover:text-[#191b24] text-gray-300 rounded-lg border border-white/10 font-bold transition-all"
                            >
                                Đi
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CatalogPage;
