import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useWatchMovie } from '../../hooks/useWatchMovie';
import MovieRow from '../../components/MovieRow';

export const WatchPage = ({ slug, episode }: { slug: string, episode: string }) => {
    const navigate = useNavigate();
    const { movie, loading, currentEpisode, setCurrentEpisode, videoRef } = useWatchMovie(slug, episode);
    const [selectedServer, setSelectedServer] = useState<string>('');
    const [expanded, setExpanded] = useState(false);

    if (!movie) return (
        <div className="h-screen w-full flex items-center justify-center bg-[#141414] text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 animate-pulse">Loading StreamFlow...</p>
            </div>
        </div>
    );

    // Helper for URL safety (same as Hero)
    const getImageUrl = (url: string | undefined, width: number) => {
        if (!url) return '';
        const cleanUrl = url.replace('img.ophim1.com', 'ssl:img.ophim1.com');
        return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&output=webp`;
    };
    const episodesByServer = movie?.episodes?.reduce((acc, ep) => {
        const server = ep.server_name || 'Default';
        if (!acc[server]) acc[server] = [];
        acc[server].push(ep);
        return acc;
    }, {} as Record<string, typeof movie.episodes>) || {};

    const serverNames = Object.keys(episodesByServer);

    // Initialize selected server
    if (serverNames.length > 0 && !selectedServer) {
        const defaultServer = serverNames.find(s => s.toLowerCase().includes('vietsub #1')) || serverNames[0];
        setSelectedServer(defaultServer);
    }

    const currentServerEpisodes = episodesByServer[selectedServer] || [];
    const visibleEpisodes = expanded ? currentServerEpisodes : currentServerEpisodes.slice(0, 20);

    return (

        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-cyan-500/30 pb-20">
            {/* Back Navigation */}
            <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <button
                    onClick={() => navigate('/')}
                    className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-black/50 hover:bg-white/20 backdrop-blur-md rounded-full transition-all group border border-white/5"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-200 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium text-sm">Back to Home</span>
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
                                    <h2 className="text-3xl font-bold text-white mb-4">Coming Soon</h2>
                                    <p className="text-gray-400 text-lg mb-6">
                                        We're busy uploading the best quality version of this movie.
                                    </p>
                                </div>
                                <div
                                    className="absolute inset-0 -z-10 opacity-30 bg-cover bg-center blur-2xl grayscale"
                                    style={{ backgroundImage: `url(${getImageUrl(movie.backdrop || movie.thumbnail, 400)})` }}
                                />
                            </div>
                        );
                    }

                    return (
                        <video
                            key={activeEpisode.url}
                            ref={videoRef}
                            controls
                            className="w-full h-full max-h-screen object-contain"
                            poster={getImageUrl(movie.backdrop || movie.thumbnail, 1280)}
                        />
                    );
                })()}
            </div>

            {/* 2. Content Info & Rows */}
            {/* 2. Content Info & Rows */}
            <div className="max-w-[1600px] mx-auto px-4 md:px-12 py-8 md:py-12 space-y-12">
                {/* Glass Info Card */}
                <div className="bg-[#141414]/90 backdrop-blur-xl rounded-2xl p-6 md:p-10 shadow-2xl border border-white/5 mx-2 md:mx-0">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">{movie.title}</h1>

                    {/* Meta Tags */}
                    <div className="flex items-center gap-4 text-sm md:text-base mb-6">
                        <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                            {movie.quality || 'HD'}
                        </span>
                        <span className="text-gray-400">{movie.year || '2024'}</span>
                        <span className="text-green-400 font-medium">98% Match</span>
                        <span className="text-gray-400">{movie.original_title}</span>
                    </div>

                    <div
                        className="text-gray-300 leading-relaxed max-w-4xl text-base md:text-lg font-light"
                        dangerouslySetInnerHTML={{ __html: movie.description }}
                    />
                </div>

                {/* Episodes Section - Compact Grid */}
                {currentServerEpisodes.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-6">
                                <h3 className="text-2xl font-bold border-l-4 border-cyan-500 pl-4 whitespace-nowrap">Episodes</h3>

                                {/* Server Selector */}
                                {serverNames.length > 1 && (
                                    <div className="flex flex-wrap gap-2">
                                        {serverNames.map(server => (
                                            <button
                                                key={server}
                                                onClick={() => setSelectedServer(server)}
                                                className={`px-3 py-1 text-xs font-bold rounded-full transition-all border ${selectedServer === server
                                                    ? 'bg-cyan-500 text-black border-cyan-500'
                                                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                {server}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="text-gray-400 text-sm font-medium bg-white/5 px-3 py-1 rounded-full w-fit">{currentServerEpisodes.length} Items</div>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                            {visibleEpisodes.map((ep) => (
                                <button
                                    key={`${ep.number}-${selectedServer}`}
                                    onClick={() => {
                                        setCurrentEpisode(ep.number);
                                        navigate(`/watch/${slug}/${ep.number}`);
                                    }}
                                    className={`group relative py-2 rounded-lg border transition-all duration-300 ${currentEpisode === ep.number
                                        ? 'border-cyan-500 bg-cyan-950/30'
                                        : 'border-transparent bg-[#111] hover:bg-[#222] hover:border-white/10'
                                        }`}
                                >
                                    <div className="flex items-center justify-center">
                                        <span className={`font-bold text-sm ${currentEpisode === ep.number ? 'text-cyan-400' : 'text-gray-400 group-hover:text-white'
                                            }`}>
                                            {ep.number}
                                        </span>
                                    </div>
                                    {currentEpisode === ep.number && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {currentServerEpisodes.length > 20 && (
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors mt-4 mx-auto"
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
                <div className="space-y-12 pt-8 border-t border-white/5">
                    <MovieRow title="Có thể bạn sẽ thích" category={movie.category || 'phim-le'} limit={10} key={`related-${movie.slug}`} />
                    <MovieRow title="Phim Mới Cập Nhật" category="home" limit={10} key="trending" />
                    <MovieRow title="Top Phim Lẻ" category="phim-le" limit={10} key="top-movies" />
                    <MovieRow title="Top Phim Bộ" category="phim-bo" limit={10} key="top-series" />
                </div>
            </div>
        </div>
    );
};
