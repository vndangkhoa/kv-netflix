import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Play, ChevronUp } from 'lucide-react';
import { useWatchMovie } from '../../hooks/useWatchMovie';
import { useState } from 'react';
import MovieRow from '../../components/MovieRow';

export const WatchPage = ({ slug, episode }: { slug: string, episode: string }) => {
    const navigate = useNavigate();
    const { movie, loading, currentEpisode, setCurrentEpisode, videoRef } = useWatchMovie(slug, episode);
    const [expanded, setExpanded] = useState(false);
    const [selectedServer, setSelectedServer] = useState<string>('');

    if (!movie) return <div className="text-white p-10">Loading...</div>;

    // Group episodes by server
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
        <div className="min-h-screen bg-black text-white selection:bg-white/20 font-sans">
            {/* Navigation */}
            <div className={`fixed top-0 left-0 z-50 p-4 md:p-6 transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100 hover:opacity-100'}`}>
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium text-sm hidden md:inline">Main Menu</span>
                </button>
            </div>

            <div className="flex flex-col pb-20">
                {/* Player Section - Sticky on larger screens for cinema feel */}
                <div className="sticky top-0 z-40 w-full aspect-video md:h-[75vh] bg-black relative shadow-2xl">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        </div>
                    )}
                    {(() => {
                        const activeEpisode = currentServerEpisodes?.find(e => e.number === currentEpisode);
                        if (!activeEpisode?.url) {
                            return (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-900/50 backdrop-blur-3xl">
                                    <div className="text-center space-y-4 px-4">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 backdrop-blur-md mb-2 border border-white/10">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Processing Content</h2>
                                        <p className="text-white/60 text-sm max-w-xs mx-auto">
                                            This title is currently being prepared for streaming.
                                        </p>
                                    </div>
                                    {/* Subtle Background */}
                                    <div
                                        className="absolute inset-0 -z-10 opacity-30 bg-cover bg-center blur-3xl"
                                        style={{
                                            backgroundImage: `url(https://wsrv.nl/?url=${encodeURIComponent(movie.thumbnail?.replace(/^https?:\/\//, '').replace('img.ophim1.com', 'ssl:img.ophim1.com') || '')}&w=400&output=webp)`
                                        }}
                                    />
                                </div>
                            );
                        }

                        return (
                            <video
                                key={activeEpisode.url}
                                ref={videoRef}
                                controls
                                className="w-full h-full object-contain bg-black"
                                poster={`https://wsrv.nl/?url=${encodeURIComponent(movie.thumbnail?.replace(/^https?:\/\//, '').replace('img.ophim1.com', 'ssl:img.ophim1.com') || '')}&w=1600&output=webp`}
                            />
                        );
                    })()}
                </div>

                {/* Content Section - Scrolls over the bottom of the player if sticky, or just below */}
                {/* Content Section - Scrolls over the bottom of the player if sticky, or just below */}
                <div className="relative z-50 bg-black rounded-t-3xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] px-4 md:px-12 py-8 md:py-12 max-w-[1800px] mx-auto w-full space-y-12 min-h-screen">

                    {/* Movie Info */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">{movie.title}</h1>
                            <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                                <span className="px-2 py-0.5 border border-white/20 rounded text-xs uppercase">HD</span>
                                <span>{movie.year || '2024'}</span>
                                <span>{movie.episodes?.length || 0} Episodes</span>
                            </div>
                        </div>
                        <p className="text-gray-400 text-base md:text-lg max-w-4xl leading-relaxed">{movie.description}</p>
                    </div>

                    {/* Episodes Grid */}
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                            <div className="flex flex-wrap items-center gap-6">
                                <h3 className="text-lg font-bold">Episodes</h3>

                                {/* Server Selector */}
                                {serverNames.length > 1 && (
                                    <div className="flex flex-wrap gap-2">
                                        {serverNames.map(server => (
                                            <button
                                                key={server}
                                                onClick={() => setSelectedServer(server)}
                                                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${selectedServer === server
                                                    ? 'bg-white text-black'
                                                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                {server}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="text-sm text-gray-500">{currentServerEpisodes.length} available</span>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                            {visibleEpisodes.map((ep) => (
                                <button
                                    key={`${ep.number}-${selectedServer}`}
                                    onClick={() => {
                                        setCurrentEpisode(ep.number);
                                        navigate(`/watch/${slug}/${ep.number}`);
                                    }}
                                    className={`group relative py-2 rounded-lg flex items-center justify-center transition-all duration-300 border ${currentEpisode === ep.number
                                        ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                        : 'bg-zinc-900/50 hover:bg-zinc-800 text-white border-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <span className="font-bold text-sm">
                                        {ep.number}
                                    </span>
                                    {currentEpisode === ep.number && (
                                        <div className="absolute top-1 right-1">
                                            <Play className="w-2.5 h-2.5 fill-current" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {currentServerEpisodes.length > 20 && (
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="w-full py-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors bg-zinc-900/50 hover:bg-zinc-900 rounded-xl"
                            >
                                {expanded ? (
                                    <>Show Less <ChevronUp className="w-4 h-4" /></>
                                ) : (
                                    <>Show All Episodes <ChevronDown className="w-4 h-4" /></>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Related Categories */}
                    <div className="space-y-12 pt-12 border-t border-white/10">
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold">More Like This</h3>
                            <MovieRow title="" category={movie.category || 'phim-le'} limit={10} key="related" />
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold">Trending Now</h3>
                            <MovieRow title="" category="home" limit={10} key="trending" />
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold">Top Movies</h3>
                            <MovieRow title="" category="phim-le" limit={10} key="top" />
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold">Animation</h3>
                            <MovieRow title="" category="hoat-hinh" limit={10} key="anim" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
