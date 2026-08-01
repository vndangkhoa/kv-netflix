import React from 'react';
import { X, Tv, Smartphone, Download, ExternalLink, Github } from 'lucide-react';
import { useLatestRelease } from '../hooks/useLatestRelease';

interface AppDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ isOpen, onClose }) => {
    const { downloads } = useLatestRelease();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-5 shadow-2xl overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-accent/10 text-accent rounded-xl">
                        <Download size={22} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Download kv-netflix Apps</h2>
                        <p className="text-xs text-[var(--text-muted)]">v{downloads.version} • Android TV & Mobile</p>
                    </div>
                </div>

                {/* App Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    {/* Android TV Card */}
                    <div className="flex flex-col justify-between p-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl hover:border-accent/50 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-accent/20 text-accent rounded-lg">
                                <Tv size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Android TV App</h3>
                                <span className="text-[10px] font-semibold px-2 py-0.5 bg-accent/20 text-accent rounded-full">Leanback UI</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <a
                                href={downloads.tv.github}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between w-full px-3 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium text-xs transition-colors shadow-md"
                            >
                                <span className="flex items-center gap-2">
                                    <Github size={14} /> GitHub APK
                                </span>
                                <Download size={13} />
                            </a>
                            <a
                                href={downloads.tv.forgejo}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between w-full px-3 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-lg font-medium text-xs transition-colors border border-[var(--border-primary)]"
                            >
                                <span className="flex items-center gap-2">
                                    🦊 Forgejo APK
                                </span>
                                <Download size={13} />
                            </a>
                        </div>
                    </div>

                    {/* Android Mobile Card */}
                    <div className="flex flex-col justify-between p-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl hover:border-accent/50 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                                <Smartphone size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Android Mobile App</h3>
                                <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">Mobile UI</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <a
                                href={downloads.mobile.github}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between w-full px-3 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium text-xs transition-colors shadow-md"
                            >
                                <span className="flex items-center gap-2">
                                    <Github size={14} /> GitHub APK
                                </span>
                                <Download size={13} />
                            </a>
                            <a
                                href={downloads.mobile.forgejo}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between w-full px-3 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--border-primary)] text-[var(--text-primary)] rounded-lg font-medium text-xs transition-colors border border-[var(--border-primary)]"
                            >
                                <span className="flex items-center gap-2">
                                    🦊 Forgejo APK
                                </span>
                                <Download size={13} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer Repositories Links */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                    <span className="font-medium">Releases:</span>
                    <div className="flex items-center gap-4">
                        <a
                            href={downloads.releases.github}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                            <Github size={14} /> GitHub <ExternalLink size={12} />
                        </a>
                        <a
                            href={downloads.releases.forgejo}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                            🦊 Forgejo <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
