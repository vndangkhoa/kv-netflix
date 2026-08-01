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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-2xl bg-[#12121A] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/80 overflow-hidden text-white">
                {/* Background Ambient Glow */}
                <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    tabIndex={0}
                    aria-label="Close"
                    className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white hover:bg-white/10 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full transition-all"
                >
                    <X size={22} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3.5 mb-6">
                    <div className="p-3 bg-red-600/20 text-red-500 rounded-xl border border-red-500/30">
                        <Download size={26} />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold tracking-tight text-white">Tải ứng dụng kv-netflix</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold px-2.5 py-0.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-full">
                                v{downloads.version}
                            </span>
                            <span className="text-xs text-gray-400">• Dành cho Android TV & Điện Thoại</span>
                        </div>
                    </div>
                </div>

                {/* App Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Android TV Card */}
                    <div className="flex flex-col justify-between p-5 bg-[#1A1A26] border border-white/10 rounded-xl hover:border-red-500/50 transition-all shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-red-600/20 text-red-400 rounded-xl border border-red-500/30">
                                <Tv size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Ứng dụng Android TV</h3>
                                <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 bg-red-500/20 text-red-300 rounded-full mt-0.5">
                                    Giao diện TV Remote (Leanback)
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <a
                                href={downloads.tv.github}
                                target="_blank"
                                rel="noreferrer"
                                tabIndex={0}
                                className="flex items-center justify-between w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white focus:scale-[1.03] text-white rounded-xl font-semibold text-xs transition-all shadow-md active:scale-95"
                            >
                                <span className="flex items-center gap-2">
                                    <Github size={16} /> Tải từ GitHub APK
                                </span>
                                <Download size={15} />
                            </a>
                            <a
                                href={downloads.tv.forgejo}
                                target="_blank"
                                rel="noreferrer"
                                tabIndex={0}
                                className="flex items-center justify-between w-full px-4 py-2.5 bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:scale-[1.03] text-gray-200 hover:text-white rounded-xl font-semibold text-xs transition-all border border-white/10 active:scale-95"
                            >
                                <span className="flex items-center gap-2">
                                    🦊 Tải từ Forgejo APK
                                </span>
                                <Download size={15} />
                            </a>
                        </div>
                    </div>

                    {/* Android Mobile Card */}
                    <div className="flex flex-col justify-between p-5 bg-[#1A1A26] border border-white/10 rounded-xl hover:border-blue-500/50 transition-all shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                                <Smartphone size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Ứng dụng Mobile</h3>
                                <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-full mt-0.5">
                                    Giao diện Cảm Ứng (Mobile UI)
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <a
                                href={downloads.mobile.github}
                                target="_blank"
                                rel="noreferrer"
                                tabIndex={0}
                                className="flex items-center justify-between w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white focus:scale-[1.03] text-white rounded-xl font-semibold text-xs transition-all shadow-md active:scale-95"
                            >
                                <span className="flex items-center gap-2">
                                    <Github size={16} /> Tải từ GitHub APK
                                </span>
                                <Download size={15} />
                            </a>
                            <a
                                href={downloads.mobile.forgejo}
                                target="_blank"
                                rel="noreferrer"
                                tabIndex={0}
                                className="flex items-center justify-between w-full px-4 py-2.5 bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:scale-[1.03] text-gray-200 hover:text-white rounded-xl font-semibold text-xs transition-all border border-white/10 active:scale-95"
                            >
                                <span className="flex items-center gap-2">
                                    🦊 Tải từ Forgejo APK
                                </span>
                                <Download size={15} />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer Repositories Links */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs text-gray-400">
                    <span className="font-medium text-gray-300">Xem tất cả các bản phát hành:</span>
                    <div className="flex items-center gap-4">
                        <a
                            href={downloads.releases.github}
                            target="_blank"
                            rel="noreferrer"
                            tabIndex={0}
                            className="flex items-center gap-1.5 hover:text-white focus:text-white focus:outline-none focus:underline transition-colors"
                        >
                            <Github size={14} /> GitHub Releases <ExternalLink size={12} />
                        </a>
                        <a
                            href={downloads.releases.forgejo}
                            target="_blank"
                            rel="noreferrer"
                            tabIndex={0}
                            className="flex items-center gap-1.5 hover:text-white focus:text-white focus:outline-none focus:underline transition-colors"
                        >
                            🦊 Forgejo Releases <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
