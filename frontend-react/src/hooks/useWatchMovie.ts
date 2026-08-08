import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import type { MovieDetail, VideoSource } from '../types';
import { useWatchProgress } from './useWatchProgress';

export const useWatchMovie = (slug: string | undefined, episode: string | undefined, selectedServer?: string, onServerFallback?: (server: string) => void) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [source, setSource] = useState<VideoSource | null>(null);
    const [loading, setLoading] = useState(true);
    const [buffering, setBuffering] = useState(false);
    const [playerError, setPlayerError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const [levels, setLevels] = useState<{ index: number; height: number }[]>([]);
    const [currentLevel, setCurrentLevel] = useState(-1);
    const [currentEpisode, setCurrentEpisode] = useState(parseInt(episode || '1'));
    const [episodeEnded, setEpisodeEnded] = useState(false);
    const { getProgress, saveProgress, clearProgress } = useWatchProgress();
    const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasTriggeredNearEnd = useRef(false);
    const [videoActuallyEnded, setVideoActuallyEnded] = useState(false);

    // Refs to avoid effect re-running when these functions change
    const getProgressRef = useRef(getProgress);
    const saveProgressRef = useRef(saveProgress);
    const clearProgressRef = useRef(clearProgress);
    const movieRef = useRef(movie);
    // Tracks the stream URL currently loaded in the player. Used to avoid
    // re-initializing hls.js when a server-fallback re-run resolves to the
    // same URL (each re-init revokes the previous blob, which can surface
    // spurious media errors in the browser).
    const activeStreamUrlRef = useRef<string>('');

    // Update refs when values change
    useEffect(() => {
        getProgressRef.current = getProgress;
    }, [getProgress]);

    useEffect(() => {
        saveProgressRef.current = saveProgress;
    }, [saveProgress]);

    useEffect(() => {
        clearProgressRef.current = clearProgress;
    }, [clearProgress]);

    useEffect(() => {
        movieRef.current = movie;
    }, [movie]);

    // Load saved progress on mount
    useEffect(() => {
        if (!slug) return;
        const progress = getProgress(slug);
        if (progress) {
            setCurrentEpisode(progress.episode);
        }
    }, [slug, getProgress]);

    useEffect(() => {
        if (!slug) return;
        const fetchDetails = async () => {
            try {
                const res = await fetch(`/api/videos/${slug}`);
                if (!res.ok) throw new Error('Failed to fetch details');
                const data = await res.json();
                setMovie(data);
            } catch {
                console.error("Failed to fetch details");
            }
        };
        fetchDetails();
    }, [slug]);

    // Save progress when episode changes
    useEffect(() => {
        // Don't clear progress here - it's handled by onEnded or manual episode switch
    }, [currentEpisode]);

    useEffect(() => {
        if (!movie?.episodes || movie.episodes.length === 0) return;
        const hasCurrentEp = movie.episodes.some(e => e.number === currentEpisode);
        if (!hasCurrentEp && movie.episodes.length > 0) {
            setCurrentEpisode(movie.episodes[0].number);
        }
    }, [movie, currentEpisode]);

    useEffect(() => {
        if (!movie) return;

        const fetchStream = async () => {
            setLoading(true);
            try {
                const allServerNames = Array.from(new Set(
                    (movie.episodes ?? [])
                        .map(e => e.serverName || e.server_name)
                        .filter((s): s is string => !!s)
                ));
                const preferred = selectedServer || allServerNames[0] || '';
                // Try the preferred server first, then every other server hosting the episode
                const candidates = preferred
                    ? [preferred, ...allServerNames.filter(s => s !== preferred)]
                    : allServerNames;

                // Strict liveness check: a real HLS manifest starts with #EXTM3U.
                // Rejects 404s, HTML error pages, and encrypted/obfuscated blobs
                // (#ENC-AESGCM whole-playlist encryption is undecodable).
                const probeManifest = async (proxyUrl: string): Promise<boolean> => {
                    const probe = await fetch(proxyUrl, {
                        headers: { Range: 'bytes=0-127' },
                    }).catch(() => null);
                    if (!probe || !probe.ok) return false;
                    try {
                        const head = (await probe.text()).trimStart();
                        return head.startsWith('#EXTM3U') && !head.toLowerCase().includes('enc-aesgcm');
                    } catch {
                        return false;
                    }
                };

                for (const server of candidates) {
                    const ep = movie.episodes?.find(e =>
                        e.number === currentEpisode &&
                        (e.serverName || e.server_name) === server
                    ) || movie.episodes?.find(e => e.number === currentEpisode) || movie.episodes?.[0];

                    // No episode at all or no URL — let WatchPage show "Coming Soon"
                    if (!ep?.url) continue;

                    if (ep.url.includes('.m3u8') || ep.url.includes('index.m3u8')) {
                        const proxyUrl = `/api/stream?url=${encodeURIComponent(ep.url)}`;
                        if (!(await probeManifest(proxyUrl))) continue; // dead server → try next
                        if (server !== preferred) onServerFallback?.(server);
                        // Same URL already playing → keep the current hls instance.
                        if (activeStreamUrlRef.current === proxyUrl) {
                            setLoading(false);
                            return;
                        }
                        activeStreamUrlRef.current = proxyUrl;
                        setSource({
                            stream_url: proxyUrl,
                            resolution: 'HD',
                            format_id: 'hls'
                        });
                        setLoading(false);
                        return;
                    }

                    // Embed page → extract a real stream via the backend
                    const res = await fetch(`/api/extract`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: ep.url })
                    }).catch(() => null);
                    if (!res || !res.ok) continue;
                    const data = await res.json();
                    const rawStreamUrl = data.url || data.stream_url || '';
                    if (!rawStreamUrl) continue;

                    // Proxy media URLs through the backend (headers/cookies/CORS).
                    // Embed PAGES must stay raw: they load in an iframe with their own
                    // origin, and their players use root-relative URLs that would break
                    // inside the proxy path.
                    const isEmbedPage = data.format_id === 'embed' || data.ext === 'embed' || data.isEmbed === true;
                    const needsProxy = !isEmbedPage && rawStreamUrl.startsWith('http');
                    const finalUrl = needsProxy
                        ? `/api/stream?url=${encodeURIComponent(rawStreamUrl)}`
                        : rawStreamUrl;

                    // Validate extracted media before committing; embed pages are last resort
                    if (!isEmbedPage && !(await probeManifest(finalUrl))) continue;

                    if (server !== preferred) onServerFallback?.(server);
                    // Same URL already playing → keep the current player instance.
                    if (activeStreamUrlRef.current === finalUrl) {
                        setLoading(false);
                        return;
                    }
                    activeStreamUrlRef.current = finalUrl;
                    setSource({
                        ...data,
                        stream_url: finalUrl
                    });
                    setLoading(false);
                    return;
                }

                // No server produced a playable stream
                console.error("No playable stream found for episode", currentEpisode);
            } catch {
                console.error("Failed to extract stream");
            } finally {
                setLoading(false);
            }
        };

fetchStream();
    }, [movie, currentEpisode, slug, selectedServer, retryKey, onServerFallback]);

    // Save progress periodically and seek to saved position
    useEffect(() => {
        if (!source || !videoRef.current || !slug) return;

        const video = videoRef.current;
let hls: Hls | null = null;
        let hasSeeked = false;
        // When this instance is torn down (source switch, unmount), its blob
        // gets revoked; any late media error from the stale instance must not
        // flip the error overlay that the fresh instance is about to use.
        let abandoned = false;
        hasTriggeredNearEnd.current = false;
        setBuffering(true);
        setPlayerError(false);

        const getNearEndThreshold = (duration: number): number => {
            if (duration <= 0) return 0;
            if (duration > 1800) return 300;
            if (duration > 600) return 120;
            return 30;
        };

        const saveCurrentProgress = () => {
            if (video && slug && movieRef.current) {
                const currentTime = video.currentTime;
                const duration = video.duration;
                if (duration > 0) {
                    saveProgressRef.current(slug, currentEpisode, currentTime, duration, {
                        title: movieRef.current.title,
                        thumbnail: movieRef.current.thumbnail,
                        backdrop: movieRef.current.backdrop,
                        year: movieRef.current.year,
                        category: movieRef.current.category,
                        genre: movieRef.current.genre,
                        country: movieRef.current.country,
                    });
                }
            }
        };

        const seekToSavedPosition = () => {
            if (hasSeeked) return;
            const progress = getProgressRef.current(slug);
            if (progress && progress.episode === currentEpisode && progress.timestamp > 10) {
                hasSeeked = true;
                video.currentTime = Math.max(0, progress.timestamp - 10);
            }
        };

        const onCanPlay = () => {
            seekToSavedPosition();
        };

        const onPause = () => {
            saveCurrentProgress();
        };

const onEnded = () => {
            clearProgressRef.current(slug);
            setVideoActuallyEnded(true);
            setEpisodeEnded(true);
        };

        const onWaiting = () => setBuffering(true);
        const onPlaying = () => setBuffering(false);
        const onError = () => {
            if (abandoned) return;
            // In the hls.js path the media element's 'error' event is often a
            // zombie fired when the previous MediaSource blob is revoked during
            // recovery/re-init — hls.js reports real failures via its own
            // ERROR event, so only trust the element error for native playback.
            if (isHls) return;
            console.error('[player] media element error:', JSON.stringify({
                code: video.error?.code,
                message: video.error?.message,
                src: (video.currentSrc || '').slice(0, 80),
                networkState: video.networkState,
                readyState: video.readyState,
                srcObject: !!video.srcObject,
            }));
            setPlayerError(true);
        };

        const onTimeUpdate = () => {
            if (!hasTriggeredNearEnd.current && video.duration > 0) {
                const remaining = video.duration - video.currentTime;
                const threshold = getNearEndThreshold(video.duration);
                if (threshold > 0 && remaining <= threshold && remaining > 0) {
                    hasTriggeredNearEnd.current = true;
                    setEpisodeEnded(true);
                }
            }
        };

        const isHls = source.stream_url.includes('.m3u8') || source.format_id === 'hls';

        // Defer init by one macrotask: StrictMode double-mount / rapid source
        // switches tear down the previous hls instance (revoking its blob and
        // calling video.load()) — attaching a new MediaSource in the same tick
        // can make Chrome remove the SourceBuffer mid-append.
        const initTimer = setTimeout(() => {
            if (abandoned) return;
            if (isHls && Hls.isSupported()) {
                hls = new Hls();
                hlsRef.current = hls;
                setLevels([]);
                setCurrentLevel(-1);
                setBuffering(true);
                hls.loadSource(source.stream_url);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    const parsedLevels = hls?.levels.map((l, index) => ({ index, height: l.height || 0 })).filter(l => l.height > 0) || [];
                    setLevels(parsedLevels);
                    setCurrentLevel(hls?.autoLevelEnabled ? -1 : hls?.currentLevel ?? -1);
                    seekToSavedPosition();
                    video.play().catch(() => { });
                });
                hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
                    setCurrentLevel(data.level ?? -1);
                });
                let hlsRecoveryAttempts = 0;
                hls.on(Hls.Events.ERROR, (_e, data) => {
                    console.error('[player] hls error:', JSON.stringify({
                        type: data.type,
                        details: data.details,
                        fatal: data.fatal,
                        msg: (data as { error?: Error }).error?.message || '',
                        url: ((data as { url?: string }).url || '').slice(0, 90),
                        level: (data as { level?: number }).level,
                        frag: ((data as { frag?: { sn?: number; type?: string } }).frag?.sn),
                        bufferError: ((data as { buffer?: { error?: string } }).buffer?.error) || '',
                        reason: (data as { reason?: string }).reason || '',
                    }));
                    if (!data.fatal) return;
                    if (abandoned) return;
                    // Recover from transient network/buffer errors, but only a few
                    // times — a persistent decode failure must surface to the user.
                    if (hlsRecoveryAttempts < 2) {
                        hlsRecoveryAttempts++;
                        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                            hls?.startLoad();
                        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                            hls?.recoverMediaError();
                        } else {
                            setPlayerError(true);
                        }
                        return;
                    }
                    setPlayerError(true);
                });
                hls.on(Hls.Events.FRAG_LOADED, () => {
                    seekToSavedPosition();
                });
            } else {
                video.src = source.stream_url;
                video.play().catch(() => { });
            }
        }, 0);

        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('error', onError);

        // Save progress every 5 seconds
        saveIntervalRef.current = setInterval(saveCurrentProgress, 5000);

        return () => {
            abandoned = true;
            clearTimeout(initTimer);
            if (hls) hls.destroy();
            if (hlsRef.current === hls) hlsRef.current = null;
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('error', onError);
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
                saveIntervalRef.current = null;
            }
            // Save final progress on unmount
            saveCurrentProgress();
        };
    }, [source, slug, currentEpisode]);

    const episodes = movie?.episodes || [];
    const currentServerName = selectedServer || episodes.find(e => e.number === currentEpisode)?.serverName || episodes.find(e => e.number === currentEpisode)?.server_name || '';
    const sameServerEpisodes = episodes.filter(e => (e.serverName || e.server_name) === currentServerName);
    const maxEpisode = sameServerEpisodes.length > 0
        ? Math.max(...sameServerEpisodes.map(e => e.number))
        : 0;
    const minEpisode = sameServerEpisodes.length > 0
        ? Math.min(...sameServerEpisodes.map(e => e.number))
        : 0;

    const hasNextEpisode = currentEpisode < maxEpisode;
    const hasPrevEpisode = currentEpisode > minEpisode;

    const playNextEpisode = useCallback(() => {
        if (hasNextEpisode) {
            setEpisodeEnded(false);
            setCurrentEpisode(currentEpisode + 1);
        }
    }, [currentEpisode, hasNextEpisode]);

    const playPrevEpisode = useCallback(() => {
        if (hasPrevEpisode) {
            setEpisodeEnded(false);
            setCurrentEpisode(currentEpisode - 1);
        }
    }, [currentEpisode, hasPrevEpisode]);

const dismissEndScreen = useCallback(() => {
        setEpisodeEnded(false);
    }, []);

    const selectQuality = useCallback((index: number) => {
        const hls = hlsRef.current;
        if (!hls) return;
        hls.nextLevel = index;
        setCurrentLevel(index);
    }, []);

    const retryStream = useCallback(() => {
        setPlayerError(false);
        setEpisodeEnded(false);
        setRetryKey(k => k + 1);
    }, []);

    // Reset episodeEnded when episode changes
    useEffect(() => {
        setEpisodeEnded(false);
        setVideoActuallyEnded(false);
    }, [currentEpisode]);

    return {
        movie,
        source,
        loading,
        currentEpisode,
        setCurrentEpisode,
        videoRef,
        episodeEnded,
        videoActuallyEnded,
        hasNextEpisode,
        hasPrevEpisode,
        playNextEpisode,
        playPrevEpisode,
        dismissEndScreen,
        maxEpisode,
        buffering,
        playerError,
        retryStream,
        levels,
        currentLevel,
        selectQuality,
    };
};
