import React from 'react';
import { Tv, Smartphone, Download, Github, ExternalLink, Send, MessageCircle, Newspaper, User } from 'lucide-react';
import { useLatestRelease } from '../hooks/useLatestRelease';

const FOOTER_LINKS = [
    { key: 'Hỏi-Đáp', href: '#faq' },
    { key: 'Chính sách bảo mật', href: '#' },
    { key: 'Điều khoản sử dụng', href: '#' },
    { key: 'Giới thiệu', href: '#' },
    { key: 'Liên hệ', href: '#' },
];

const PARTNERS = ['Dongphim', 'Ghienphim', 'Motphim', 'Subnhanh'];

const SOCIALS = [
    { icon: Send, label: 'Telegram', href: '#' },
    { icon: MessageCircle, label: 'Discord', href: '#' },
    { icon: Newspaper, label: 'News', href: '#' },
    { icon: User, label: 'Community', href: '/my-list' },
];

export const Footer: React.FC = () => {
    const { downloads } = useLatestRelease();

    return (
        <footer className="w-full mt-16 py-12 px-4 md:px-8 text-[var(--text-secondary)]" style={{ background: 'var(--footer-bg)' }}>
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Brand & Socials */}
                    <div>
                        <h3 className="text-xl font-black tracking-wider text-[var(--accent)] mb-3">KV-NETFLIX</h3>
                        <p className="text-xs leading-relaxed text-[var(--text-muted)] max-w-sm">
                            Streaming application for Movies, Anime, K-Dramas & TV Shows. Watch seamless content across Web, Android TV, and Mobile devices.
                        </p>
                        <div className="mt-5 flex items-center gap-3">
                            {SOCIALS.map(s => (
                                <a
                                    key={s.label}
                                    href={s.href}
                                    target={s.href.startsWith('http') ? '_blank' : undefined}
                                    rel="noreferrer"
                                    aria-label={s.label}
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-[var(--accent)] transition-colors"
                                    style={{ background: 'rgba(255,255,255,0.06)' }}
                                >
                                    <s.icon size={16} />
                                </a>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                            <span>© {new Date().getFullYear()} kv-netflix</span>
                            <span>•</span>
                            <span>v{downloads.version}</span>
                        </div>
                    </div>

                    {/* Android TV Downloads */}
                    <div className="p-4 rounded-xl border border-[var(--border-subtle)]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                            <Tv size={18} className="text-[var(--accent)]" />
                            <span>Android TV App (v{downloads.version})</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mb-3">Leanback TV UI, D-Pad support & ExoPlayer</p>
                        <div className="flex flex-col gap-2">
                            <a
                                href={downloads.tv.github}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between px-3 py-1.5 text-[var(--accent-contrast)] rounded-lg text-xs font-medium transition-colors"
                                style={{ background: 'var(--accent)' }}
                            >
                                <span className="flex items-center gap-1.5"><Github size={14} /> Download GitHub APK</span>
                                <Download size={13} />
                            </a>
                            <a
                                href={downloads.tv.forgejo}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between px-3 py-1.5 text-[var(--text-primary)] rounded-lg text-xs font-medium border border-[var(--border-primary)] transition-colors hover:bg-white/5"
                                style={{ background: 'var(--bg-3)' }}
                            >
                                <span className="flex items-center gap-1.5">🦊 Download Forgejo APK</span>
                                <Download size={13} />
                            </a>
                        </div>
                    </div>

                    {/* Android Mobile Downloads */}
                    <div className="p-4 rounded-xl border border-[var(--border-subtle)]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                            <Smartphone size={18} className="text-[var(--accent)]" />
                            <span>Android Mobile App (v{downloads.version})</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mb-3">Jetpack Compose UI, PiP mode & mobile controls</p>
                        <div className="flex flex-col gap-2">
                            <a
                                href={downloads.mobile.github}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between px-3 py-1.5 text-[var(--accent-contrast)] rounded-lg text-xs font-medium transition-colors"
                                style={{ background: 'var(--accent)' }}
                            >
                                <span className="flex items-center gap-1.5"><Github size={14} /> Download GitHub APK</span>
                                <Download size={13} />
                            </a>
                            <a
                                href={downloads.mobile.forgejo}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between px-3 py-1.5 text-[var(--text-primary)] rounded-lg text-xs font-medium border border-[var(--border-primary)] transition-colors hover:bg-white/5"
                                style={{ background: 'var(--bg-3)' }}
                            >
                                <span className="flex items-center gap-1.5">🦊 Download Forgejo APK</span>
                                <Download size={13} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Info links */}
                <div className="pt-8 mt-8 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]">
                    {FOOTER_LINKS.map(l => (
                        <a key={l.key} href={l.href} className="hover:text-white transition-colors">
                            {l.key}
                        </a>
                    ))}
                    <span className="flex-1" />
                    {PARTNERS.map(p => (
                        <a key={p} href="#" className="hover:text-white transition-colors">
                            {p}
                        </a>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div className="pt-6 mt-6 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
                    <div>Source code & releases available on GitHub & Forgejo</div>
                    <div className="flex items-center gap-4">
                        <a href={downloads.releases.github} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                            <Github size={14} /> GitHub Releases <ExternalLink size={12} />
                        </a>
                        <a href={downloads.releases.forgejo} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                            🦊 Forgejo Releases <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
