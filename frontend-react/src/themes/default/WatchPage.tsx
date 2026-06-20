import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, SkipForward, SkipBack, X } from 'lucide-react';
import { useWatchMovie } from '../../hooks/useWatchMovie';
import MovieRow from '../../components/MovieRow';
import { useLang } from '../../context/LanguageContext';

function AutoPlayCountdown({ onComplete }: { onComplete: () => void }) {
    const [count, setCount] = useState(10);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countRef = useRef(10);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            countRef.current -= 1;
            if (countRef.current <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = null;
                onComplete();
            } else {
                setCount(countRef.current);
            }
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [onComplete]);

    return (
        <div className="absolute top-2 right-2 w-8 h-8">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                <circle
                    cx="18" cy="18" r="16" fill="none"
                    stroke="rgb(6,182,212)" strokeWidth="2"
                    strokeDasharray={`${(count / 10) * 100.53} 100.53`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                {count}
            </span>
        </div>
    );
}

export const WatchPage = ({ slug, episode }: { slug: string, episode: string }) => {
    const navigate = useNavigate();
    const {
        movie, loading, currentEpisode, setCurrentEpisode, videoRef,
        episodeEnded, hasNextEpisode, hasPrevEpisode,
        playNextEpisode, dismissEndScreen,
    } = useWatchMovie(slug, episode);
    const [selectedServer, setSelectedServer] = useState<string>('');
    const [expanded, setExpanded] = useState(false);
    const { t } = useLang();

    const getImageUrl = (url: string | undefined) => {
        if (!url) return '';
        let cleanUrl = url;
        if (url.startsWith('//')) cleanUrl = `https:${url}`;
        else if (!url.startsWith('http')) cleanUrl = `https://${url}`;
        return cleanUrl;
    };

    const getProxyUrl = (url: string | undefined, width: number) => {
        const raw = getImageUrl(url);
        if (!raw) return '';
        return `/api/images/proxy?url=${encodeURIComponent(raw)}&width=${width}`;
    };

    // Navigate to next episode URL when episode changes
    useEffect(() => {
        if (currentEpisode && slug) {
            navigate(`/watch/${slug}/${currentEpisode}`, { replace: true });
        }
    }, [currentEpisode, slug, navigate]);

    const handleEpisodeClick = useCallback((epNumber: number) => {
        dismissEndScreen();
        setCurrentEpisode(epNumber);
    }, [dismissEndScreen, setCurrentEpisode]);

    if (!movie) return (
        <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[var(--text-muted)] animate-pulse">{t.loadingStream}</p>
            </div>
        </div>
    );

    const episodesByServer = movie?.episodes?.reduce((acc, ep) => {
        const server = ep.server_name || 'Default';
        if (!acc[server]) acc[server] = [];
        acc[server].push(ep);
        return acc;
    }, {} as Record<string, typeof movie.episodes>) || {};

    const serverNames = Object.keys(episodesByServer);

    if (serverNames.length > 0 && !selectedServer) {
        const defaultServer = serverNames.find(s => s.toLowerCase().includes('vietsub #1')) || serverNames[0];
        setSelectedServer(defaultServer);
    }

    const currentServerEpisodes = episodesByServer[selectedServer] || [];
    const visibleEpisodes = expanded ? currentServerEpisodes : currentServerEpisodes.slice(0, 20);

    const nextEp = hasNextEpisode
        ? currentServerEpisodes.find(e => e.number === currentEpisode + 1)
        : null;
    const prevEp = hasPrevEpisode
        ? currentServerEpisodes.find(e => e.number === currentEpisode - 1)
        : null;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-cyan-500/30 pb-20 transition-colors duration-300">
            {/* Back Navigation */}
            <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-[var(--bg-primary)]/80 to-transparent pointer-events-none">
                <button
                    onClick={() => navigate('/')}
                    className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)]/80 hover:bg-[var(--bg-elevated)] backdrop-blur-md rounded-full transition-all group border border-[var(--border-primary)]"
                >
                    <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)] group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium text-sm text-[var(--text-primary)]">{t.backToHome}</span>
                </button>
            </div>

            {/* 1. Cinema Player Section */}
            <div className="w-full h-[50vh] md:h-[80vh] bg-black relative shadow-2xl z-40">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500 border-t-transparent shadow-[0_0_20px_rgba(6,182,212,0.5)]"></div>
                    </div>
                )}
                {(() => {
                    const activeEpisode = currentServerEpisodes?.find(e => e.number === currentEpisode);
                    if (!activeEpisode?.url) {
                        return (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90">
                                <div className="text-center px-6 max-w-lg">
                                    <h2 className="text-3xl font-bold text-white mb-4">{t.comingSoon}</h2>
                                    <p className="text-gray-400 text-lg mb-6">
                                        We're busy uploading the best quality version of this movie.
                                    </p>
                                </div>
                                <div
                                    className="absolute inset-0 -z-10 opacity-30 bg-cover bg-center blur-2xl grayscale"
                                    style={{ backgroundImage: `url(${getProxyUrl(movie.backdrop || movie.thumbnail, 640)})` }}
                                />
                            </div>
                        );
                    }

                    return (
                        <>
                            <video
                                key={activeEpisode.url}
                                ref={videoRef}
                                controls
                                className="w-full h-full max-h-screen object-contain"
                                poster={getProxyUrl(movie.backdrop || movie.thumbnail, 1280)}
                            />

                            {/* Auto-Play End Screen Overlay */}
                            {episodeEnded && (
                                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in">
                                    <div className="flex flex-col items-center gap-6 max-w-2xl w-full px-4">
                                        <div className="text-center">
                                            <p className="text-gray-400 text-sm mb-1">Up Next</p>
                                            <h3 className="text-2xl md:text-3xl font-bold text-white">
                                                {nextEp ? `${t.episode} ${nextEp.number}` : 'End of Episodes'}
                                            </h3>
                                        </div>

                                        <div className="flex items-center gap-3 sm:gap-4 md:gap-6 overflow-x-auto max-w-full">
                                            {/* Previous Episode */}
                                            {prevEp && (
                                                <button
                                                    onClick={() => handleEpisodeClick(prevEp.number)}
                                                    className="group relative flex-shrink-0 w-[120px] sm:w-[140px] md:w-[180px] rounded-xl overflow-hidden border-2 border-transparent hover:border-white/30 transition-all"
                                                >
                                                    <div className="aspect-video bg-[#1a1a1a] relative">
                                                        <img
                                                            src={getProxyUrl(movie.backdrop || movie.thumbnail, 320)}
                                                            alt={`Episode ${prevEp.number}`}
                                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <SkipBack className="w-8 h-8 text-white/70 group-hover:text-white transition-colors" />
                                                        </div>
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                                            <p className="text-xs text-gray-300 font-medium">{t.episode} {prevEp.number}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            )}

                                            {/* Next Episode (Main Focus) */}
                                            {nextEp && (
                                                <button
                                                    onClick={playNextEpisode}
                                                    className="group relative flex-shrink-0 w-[160px] sm:w-[220px] md:w-[300px] rounded-xl overflow-hidden border-2 border-cyan-500/50 hover:border-cyan-400 transition-all shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                                                >
                                                    <div className="aspect-video bg-[#1a1a1a] relative">
                                                        <img
                                                            src={getProxyUrl(movie.backdrop || movie.thumbnail, 480)}
                                                            alt={`Episode ${nextEp.number}`}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="bg-cyan-500/90 rounded-full p-3 group-hover:scale-110 transition-transform">
                                                                <SkipForward className="w-6 h-6 text-black" />
                                                            </div>
                                                        </div>
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                                            <p className="text-sm text-white font-bold">{t.episode} {nextEp.number}</p>
                                                        </div>
                                                    </div>
                                                    <AutoPlayCountdown
                                                        key={`countdown-${currentEpisode}`}
                                                        onComplete={playNextEpisode}
                                                    />
                                                </button>
                                            )}

                                            {!nextEp && (
                                                <div className="text-center py-8">
                                                    <p className="text-gray-400 text-lg">You've finished all episodes!</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={dismissEndScreen}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-colors border border-white/10"
                                            >
                                                <X className="w-4 h-4" />
                                                {t.close}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>

            {/* 2. Content Info & Rows */}
            <div className="max-w-[1600px] mx-auto px-4 md:px-12 py-8 md:py-12 space-y-12">
                {/* Glass Info Card */}
                <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-xl rounded-2xl p-4 sm:p-6 md:p-10 shadow-2xl border border-[var(--border-subtle)] mx-2 md:mx-0 transition-colors duration-300">
                    <h1 className="text-xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4 tracking-tight">{movie.title}</h1>

                    {/* Meta Tags */}
                    <div className="flex items-center gap-4 text-sm md:text-base mb-6">
                        <span className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                            {movie.quality || 'HD'}
                        </span>
                        <span className="text-[var(--text-muted)]">{movie.year || '2024'}</span>
                        <span className="text-green-500 dark:text-green-400 font-medium">98% Match</span>
                        <span className="text-[var(--text-muted)]">{movie.original_title}</span>
                    </div>

                    <div
                        className="text-[var(--text-secondary)] leading-relaxed max-w-4xl text-base md:text-lg font-light"
                        dangerouslySetInnerHTML={{ __html: movie.description }}
                    />
                </div>

                {/* Episodes Section */}
                {currentServerEpisodes.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-6">
                                <h3 className="text-2xl font-bold border-l-4 border-cyan-500 pl-4 whitespace-nowrap">Episodes</h3>

                                {serverNames.length > 1 && (
                                    <div className="flex flex-wrap gap-2">
                                        {serverNames.map(server => (
                                            <button
                                                key={server}
                                                onClick={() => setSelectedServer(server)}
                                                className={`px-3 py-1 text-xs font-bold rounded-full transition-all border ${selectedServer === server
                                                    ? 'bg-cyan-500 text-black border-cyan-500'
                                                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                                                    }`}
                                            >
                                                {server}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="text-[var(--text-muted)] text-sm font-medium bg-[var(--bg-elevated)] px-3 py-1 rounded-full w-fit">{currentServerEpisodes.length} Items</div>
                        </div>

                        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1 sm:gap-2">
                            {visibleEpisodes.map((ep) => (
                                <button
                                    key={`${ep.number}-${selectedServer}`}
                                    onClick={() => handleEpisodeClick(ep.number)}
                                    className={`group relative py-2 rounded-lg border transition-all duration-300 ${currentEpisode === ep.number
                                        ? 'border-cyan-500 bg-cyan-100 dark:bg-cyan-950/30'
                                        : 'border-transparent bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-primary)]'
                                        }`}
                                >
                                    <div className="flex items-center justify-center">
                                        <span className={`font-bold text-sm ${currentEpisode === ep.number ? 'text-cyan-600 dark:text-cyan-400' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                                            }`}>
                                            {ep.number}
                                        </span>
                                    </div>
                                    {currentEpisode === ep.number && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {currentServerEpisodes.length > 20 && (
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-4 mx-auto"
                            >
                                {expanded ? (
                                    <>Show Less <ChevronUp className="w-4 h-4" /></>
                                ) : (
                                    <>Show All Episodes <ChevronDown className="w-4 h-4" /></>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Related Content Section */}
                <div className="space-y-12 pt-8 border-t border-[var(--border-subtle)]">
                    <MovieRow title="Có thể bạn sẽ thích" category={movie.category || 'phim-le'} limit={10} key={`related-${movie.slug}`} />
                    <MovieRow title={t.latestUpdates} category="home" limit={10} key="trending" />
                    <MovieRow title="Top Phim Lẻ" category="phim-le" limit={10} key="top-movies" />
                    <MovieRow title="Top Phim Bộ" category="phim-bo" limit={10} key="top-series" />
                </div>
            </div>
        </div>
    );
};
