import React from 'react';
import { Tv, Smartphone, Download, Github, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
    return (
        <footer className="w-full bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] mt-16 py-12 px-4 md:px-8 text-[var(--text-secondary)]">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Brand & Description */}
                <div>
                    <h3 className="text-xl font-black tracking-wider text-accent mb-3">KV-NETFLIX</h3>
                    <p className="text-xs leading-relaxed text-[var(--text-muted)] max-w-sm">
                        Streaming application for Movies, Anime, K-Dramas & TV Shows. Watch seamless content across Web, Android TV, and Mobile devices.
                    </p>
                    <div className="mt-4 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span>© {new Date().getFullYear()} kv-netflix</span>
                        <span>•</span>
                        <span>v1.0.1</span>
                    </div>
                </div>

                {/* Android TV Downloads */}
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                        <Tv size={18} className="text-accent" />
                        <span>Android TV App (v1.0.1)</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mb-3">Leanback TV UI, D-Pad support & ExoPlayer</p>
                    <div className="flex flex-col gap-2">
                        <a
                            href="https://github.com/vndangkhoa/kv-netflix/releases/download/v1.0.1/kv-netflix-tv-v1.0.1.apk"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                            <span className="flex items-center gap-1.5"><Github size={14} /> Download GitHub APK</span>
                            <Download size={13} />
                        </a>
                        <a
                            href="https://git.khoavo.myds.me/attachments/af798c5b-376f-4e1a-84bf-bb62d65289e1"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-xs font-medium border border-[var(--border-primary)] transition-colors"
                        >
                            <span className="flex items-center gap-1.5">🦊 Download Forgejo APK</span>
                            <Download size={13} />
                        </a>
                    </div>
                </div>

                {/* Android Mobile Downloads */}
                <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                        <Smartphone size={18} className="text-blue-400" />
                        <span>Android Mobile App (v1.0.1)</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mb-3">Jetpack Compose UI, PiP mode & mobile controls</p>
                    <div className="flex flex-col gap-2">
                        <a
                            href="https://github.com/vndangkhoa/kv-netflix/releases/download/v1.0.1/kv-netflix-mobile-v1.0.1.apk"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                            <span className="flex items-center gap-1.5"><Github size={14} /> Download GitHub APK</span>
                            <Download size={13} />
                        </a>
                        <a
                            href="https://git.khoavo.myds.me/attachments/2f36ea33-12b1-4c6f-b228-6573e41aca55"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-lg text-xs font-medium border border-[var(--border-primary)] transition-colors"
                        >
                            <span className="flex items-center gap-1.5">🦊 Download Forgejo APK</span>
                            <Download size={13} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Bottom Links */}
            <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
                <div>Source code & releases available on GitHub & Forgejo</div>
                <div className="flex items-center gap-4">
                    <a href="https://github.com/vndangkhoa/kv-netflix/releases/tag/v1.0.1" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                        <Github size={14} /> GitHub Releases <ExternalLink size={12} />
                    </a>
                    <a href="https://git.khoavo.myds.me/vndangkhoa/kv-netflix/releases/tag/v1.0.1" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                        🦊 Forgejo Releases <ExternalLink size={12} />
                    </a>
                </div>
            </div>
        </footer>
    );
};
