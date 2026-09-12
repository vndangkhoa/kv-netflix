import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tv, Smartphone, Globe, Github, Download, Sparkles, ExternalLink, HelpCircle, Film, Layers } from 'lucide-react';
import { useLatestRelease } from '../hooks/useLatestRelease';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { AppDownloadModal } from './AppDownloadModal';

export const Footer: React.FC = () => {
    const { downloads } = useLatestRelease();
    const { lang, toggleLang } = useLang();
    const { layoutTheme, toggleLayoutTheme } = useTheme();
    const [showDownloadModal, setShowDownloadModal] = useState(false);

    const isVi = lang === 'vi';

    return (
        <footer className="w-full mt-24 border-t border-[var(--border-subtle)] bg-gradient-to-b from-transparent via-[var(--bg-primary)]/80 to-[var(--bg-primary)] text-sm text-[var(--text-muted)]">
            <div className="max-w-7xl mx-auto px-6 md:px-12 pt-14 pb-12">
                
                {/* 1. Header Row: Brand, Support & Quick Download Pills */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-10 border-b border-[var(--border-subtle)]">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <Link to="/" className="flex items-center gap-2.5 group">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#fecf59] to-[#fff1cc] flex items-center justify-center shadow-md shadow-[#fecf59]/20 group-hover:scale-105 transition-transform">
                                    <span className="font-black text-[#191b24] text-[11px] tracking-tighter">KV</span>
                                </div>
                                <span className="text-xl font-black tracking-tight text-white group-hover:text-[var(--accent)] transition-colors">
                                    KV<span className="text-[var(--accent)]">-NETFLIX</span>
                                </span>
                            </Link>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium border border-[var(--accent)]/20">
                                v{downloads.version}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-[var(--text-dim)]">
                            <span>{isVi ? 'Bạn có thắc mắc hoặc cần hỗ trợ?' : 'Questions or need support?'}</span>
                            <a
                                href="#faq"
                                className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-white underline underline-offset-2 transition-colors"
                            >
                                <HelpCircle size={12} className="text-[var(--accent)]" />
                                {isVi ? 'Câu hỏi thường gặp' : 'FAQ'}
                            </a>
                            <span>•</span>
                            <a
                                href="https://github.com/vndangkhoa/kv-netflix/issues"
                                target="_blank"
                                rel="noreferrer"
                                className="text-[var(--text-secondary)] hover:text-white underline underline-offset-2 transition-colors"
                            >
                                {isVi ? 'Báo lỗi trên GitHub' : 'Report issue on GitHub'}
                            </a>
                        </div>
                    </div>

                    {/* Quick App Download Actions */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <a
                            href={downloads.tv.github}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium border border-[var(--border-subtle)] hover:border-[var(--accent)]/50 transition-all shadow-sm active:scale-95"
                            title="Tải ứng dụng Android TV APK"
                        >
                            <Tv size={14} className="text-[var(--accent)]" />
                            <span>Android TV</span>
                            <Download size={12} className="text-[var(--text-dim)]" />
                        </a>
                        <a
                            href={downloads.mobile.github}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium border border-[var(--border-subtle)] hover:border-[var(--accent)]/50 transition-all shadow-sm active:scale-95"
                            title="Tải ứng dụng Android Mobile APK"
                        >
                            <Smartphone size={14} className="text-[var(--accent)]" />
                            <span>Android Mobile</span>
                            <Download size={12} className="text-[var(--text-dim)]" />
                        </a>
                        <button
                            onClick={() => setShowDownloadModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium border border-[var(--accent)]/30 transition-all active:scale-95"
                        >
                            <Layers size={13} />
                            <span>{isVi ? 'Tất cả bản cài đặt' : 'All downloads'}</span>
                        </button>
                    </div>
                </div>

                {/* 2. Structured 4-Column Navigation Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 text-xs">
                    {/* Column 1: Khám phá / Browse */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-white tracking-wider uppercase text-[11px] flex items-center gap-1.5">
                            <Film size={13} className="text-[var(--accent)]" />
                            {isVi ? 'Khám phá phim' : 'Browse Movies'}
                        </h4>
                        <ul className="space-y-2.5">
                            <li><Link to="/phim-le" className="hover:text-white hover:underline underline-offset-2 transition-colors">{isVi ? 'Phim lẻ chiếu rạp' : 'Feature Movies'}</Link></li>
                            <li><Link to="/phim-bo" className="hover:text-white hover:underline underline-offset-2 transition-colors">{isVi ? 'Phim bộ dài tập' : 'TV Series'}</Link></li>
                            <li><Link to="/hoat-hinh" className="hover:text-white hover:underline underline-offset-2 transition-colors">{isVi ? 'Anime & Hoạt hình' : 'Animation & Anime'}</Link></li>
                            <li><Link to="/tv-shows" className="hover:text-white hover:underline underline-offset-2 transition-colors">{isVi ? 'Chương trình truyền hình' : 'TV Shows'}</Link></li>
                            <li><Link to="/lich-chieu" className="hover:text-white hover:underline underline-offset-2 transition-colors">{isVi ? 'Lịch chiếu phim mới' : 'Release Schedule'}</Link></li>
                        </ul>
                    </div>

                    {/* Column 2: Tính năng / Features */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-white tracking-wider uppercase text-[11px]">
                            {isVi ? 'Tính năng' : 'Features'}
                        </h4>
                        <ul className="space-y-2.5">
                            <li><Link to="/my-list" className="hover:text-white hover:underline underline-offset-2 transition-colors">{isVi ? 'Danh sách xem sau' : 'My Watchlist'}</Link></li>
                            <li><Link to="/device-login" className="hover:text-white hover:underline underline-offset-2 transition-colors">{isVi ? 'Ghép đôi Smart TV (Pair)' : 'Pair Smart TV'}</Link></li>
                            <li><Link to="/dien-vien" className="hover:text-white hover:underline underline-offset-2 transition-colors">{isVi ? 'Tra cứu diễn viên & đạo diễn' : 'Cast & Directors'}</Link></li>
                            <li><span className="text-[var(--text-dim)]">{isVi ? 'Phụ đề đa ngôn ngữ & CC' : 'CC Subtitles & Vietsub'}</span></li>
                            <li><span className="text-[var(--text-dim)]">{isVi ? 'Chất lượng Full HD & 4K' : 'Full HD & 4K Streaming'}</span></li>
                        </ul>
                    </div>

                    {/* Column 3: Nền tảng hỗ trợ / Platforms */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-white tracking-wider uppercase text-[11px]">
                            {isVi ? 'Thiết bị hỗ trợ' : 'Supported Devices'}
                        </h4>
                        <ul className="space-y-2.5">
                            <li>
                                <a href={downloads.tv.github} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white hover:underline underline-offset-2 transition-colors">
                                    <Tv size={13} className="text-[var(--accent)]" />
                                    <span>Android TV (Remote UI)</span>
                                </a>
                            </li>
                            <li>
                                <a href={downloads.mobile.github} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white hover:underline underline-offset-2 transition-colors">
                                    <Smartphone size={13} className="text-[var(--accent)]" />
                                    <span>Android Phone &amp; Tablet</span>
                                </a>
                            </li>
                            <li>
                                <span className="text-[var(--text-dim)]">{isVi ? 'LG webOS & TV Browser' : 'LG webOS & TV Browser'}</span>
                            </li>
                            <li>
                                <span className="text-[var(--text-dim)]">{isVi ? 'Synology NAS (SPK Package)' : 'Synology NAS (SPK Package)'}</span>
                            </li>
                            <li>
                                <span className="text-[var(--text-dim)]">{isVi ? 'Chrome, Safari, Firefox, Edge' : 'Web Browsers'}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Dự án & Mã nguồn / Project */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-white tracking-wider uppercase text-[11px]">
                            {isVi ? 'Dự án & Nguồn' : 'Project & Source'}
                        </h4>
                        <ul className="space-y-2.5">
                            <li>
                                <a
                                    href="https://github.com/vndangkhoa/kv-netflix"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 hover:text-white hover:underline underline-offset-2 transition-colors"
                                >
                                    <Github size={13} />
                                    <span>GitHub Repository</span>
                                    <ExternalLink size={10} className="text-[var(--text-dim)]" />
                                </a>
                            </li>
                            <li>
                                <a
                                    href={downloads.releases.github}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 hover:text-white hover:underline underline-offset-2 transition-colors"
                                >
                                    <span>GitHub Releases</span>
                                    <ExternalLink size={10} className="text-[var(--text-dim)]" />
                                </a>
                            </li>
                            <li>
                                <a
                                    href={downloads.releases.forgejo}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 hover:text-white hover:underline underline-offset-2 transition-colors"
                                >
                                    <span>🦊 Forgejo Server</span>
                                    <ExternalLink size={10} className="text-[var(--text-dim)]" />
                                </a>
                            </li>
                            <li>
                                <span className="text-[var(--text-dim)]">{isVi ? 'Mã nguồn mở phi thương mại' : 'Open Source & Non-profit'}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 3. Utility Controls & Sovereign Note */}
                <div className="pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Language Switcher */}
                        <button
                            onClick={toggleLang}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:border-white/30 bg-white/[0.03] hover:bg-white/[0.06] text-xs text-white transition-colors"
                            title="Chuyển đổi ngôn ngữ"
                        >
                            <Globe size={13} className="text-[var(--accent)]" />
                            <span>{isVi ? 'Tiếng Việt' : 'English'}</span>
                        </button>

                        {/* Theme Switcher */}
                        <button
                            onClick={toggleLayoutTheme}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:border-white/30 bg-white/[0.03] hover:bg-white/[0.06] text-xs text-[var(--text-secondary)] hover:text-white transition-colors"
                            title="Đổi chủ đề màu sắc"
                        >
                            <Sparkles size={12} className="text-[var(--accent)]" />
                            <span>{isVi ? 'Giao diện' : 'Theme'}: <span className="capitalize font-semibold text-white">{layoutTheme}</span></span>
                        </button>
                    </div>

                    {/* Sovereign statement styled tastefully & dignified */}
                    <div className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] bg-white/[0.02] border border-[var(--border-subtle)] px-3 py-1 rounded-full">
                        <span>🇻🇳</span>
                        <span className="font-medium text-[var(--text-secondary)]">Hoàng Sa &amp; Trường Sa là của Việt Nam!</span>
                    </div>
                </div>

                {/* 4. Bottom Copyright & Spec line */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[var(--text-dim)]">
                    <div>
                        © {new Date().getFullYear()} KV-Netflix. {isVi ? 'Nền tảng xem phim cá nhân trực tuyến.' : 'Personal streaming media platform.'}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-mono">v{downloads.version}</span>
                        <span>•</span>
                        <span>Multi-source HLS</span>
                        <span>•</span>
                        <span>4K Ultra HD</span>
                    </div>
                </div>

            </div>

            {/* App Download Modal for detailed APK & Mirror access */}
            <AppDownloadModal
                isOpen={showDownloadModal}
                onClose={() => setShowDownloadModal(false)}
            />
        </footer>
    );
};
