import React from 'react';
import { X, Tv, Smartphone, Download, ExternalLink, Github } from 'lucide-react';

interface AppDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-6 shadow-2xl overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-accent/10 text-accent rounded-xl">
                        <Download size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Download kv-netflix Apps</h2>
                        <p className="text-xs text-[var(--text-muted)]">Get the official apps for Android TV and Android Mobile</p>
                    </div>
                </div>

                {/* App Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Android TV Card */}
                    <div className="flex flex-col justify-between p-5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl hover:border-accent/50 transition-all">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-accent/20 text-accent rounded-lg">
                                    <Tv size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">Android TV App</h3>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-accent/20 text-accent rounded-full">v1.0.1 • Leanback UI</span>
                                </div>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                                Tailored for Android TV, Smart TVs & TV Boxes with full D-Pad navigation, ExoPlayer & YouTube TV UI.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <a
                                href="https://github.com/vndangkhoa/kv-netflix/releases/download/v1.0.1/kv-netflix-tv-v1.0.1.apk"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between w-full px-3.5 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium text-xs transition-colors shadow-md"
                            >
                                <span className="flex items-center gap-2">
                                    <Github size={16} /> Download APK (GitHub)
                                </span>
                                <Download size={14} />
                            </a>

                            <a
                                href="https://git.khoavo.myds.me/attachments/af798c5b-376f-4e1a-84bf-bb62d65289e1"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between w-full px-3.5 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-lg font-medium text-xs transition-colors border border-[var(--border-primary)]"
                            >
                                <span className="flex items-center gap-2">
                                    🦊 Download APK (Forgejo)
                                </span>
                                <Download size={14} />
                            </a>
                        </div>
                    </div>

                    {/* Android Mobile Card */}
                    <div className="flex flex-col justify-between p-5 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl hover:border-accent/50 transition-all">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">Android Mobile App</h3>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">v1.0.1 • Mobile UI</span>
                                </div>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                                Native Jetpack Compose mobile app with Picture-in-Picture (PiP), gesture controls & mobile layout.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <a
                                href="https://github.com/vndangkhoa/kv-netflix/releases/download/v1.0.1/kv-netflix-mobile-v1.0.1.apk"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between w-full px-3.5 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium text-xs transition-colors shadow-md"
                            >
                                <span className="flex items-center gap-2">
                                    <Github size={16} /> Download APK (GitHub)
                                </span>
                                <Download size={14} />
                            </a>

                            <a
                                href="https://git.khoavo.myds.me/attachments/2f36ea33-12b1-4c6f-b228-6573e41aca55"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between w-full px-3.5 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-lg font-medium text-xs transition-colors border border-[var(--border-primary)]"
                            >
                                <span className="flex items-center gap-2">
                                    🦊 Download APK (Forgejo)
                                </span>
                                <Download size={14} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer Repositories Links */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                    <span className="font-medium">Release Repositories:</span>
                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/vndangkhoa/kv-netflix/releases/tag/v1.0.1"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                            <Github size={14} /> GitHub Releases <ExternalLink size={12} />
                        </a>
                        <a
                            href="https://git.khoavo.myds.me/vndangkhoa/kv-netflix/releases/tag/v1.0.1"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                            🦊 Forgejo Releases <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
