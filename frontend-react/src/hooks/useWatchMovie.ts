import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import type { MovieDetail, VideoSource } from '../types';
import { useWatchProgress } from './useWatchProgress';

export interface SubtitleTrack {
    id: number;
    name: string;
    lang: string;
    isCustom?: boolean;
}

export const convertSrtToVtt = (srtContent: string): string => {
    let vtt = 'WEBVTT\n\n' + srtContent
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
    return vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
};

export const useWatchMovie = (
    slug: string | undefined,
    episode: string | undefined,
    selectedServer?: string,
    onServerFallback?: (server: string) => void,
    onAutoSwitched?: (server: string) => void
) => {
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
    const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
    const [currentSubtitle, setCurrentSubtitle] = useState<number>(-1);
    const customTracksRef = useRef<{ el: HTMLTrackElement; url: string }[]>([]);
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
    const onServerFallbackRef = useRef(onServerFallback);
    const onAutoSwitchedRef = useRef(onAutoSwitched);
    const currentServerRef = useRef<string>('');
    const pendingSeekTimeRef = useRef<number>(0);
    const lastSwitchTimeRef = useRef<number>(0);
    const failedServersRef = useRef<Set<string>>(new Set());
    const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    useEffect(() => {
        onServerFallbackRef.current = onServerFallback;
    }, [onServerFallback]);

    useEffect(() => {
        onAutoSwitchedRef.current = onAutoSwitched;
    }, [onAutoSwitched]);

    // Reset failed servers tracking on movie or episode switch
    useEffect(() => {
        failedServersRef.current.clear();
        lastSwitchTimeRef.current = 0;
        pendingSeekTimeRef.current = 0;
    }, [slug, currentEpisode]);

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

    // Fast-streaming & Multi-source probing
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

                // Strict liveness check: a real HLS manifest starts with #EXTM3U.
                // Rejects 404s, HTML error pages, and encrypted/obfuscated blobs
                // (#ENC-AESGCM whole-playlist encryption is undecodable).
                const probeDirectServer = async (serverName: string, directUrl: string): Promise<{ server: string; proxyUrl: string; latency: number } | null> => {
                    const proxyUrl = `/api/stream?url=${encodeURIComponent(directUrl)}`;
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), 3500);
                    const start = performance.now();
                    try {
                        const probe = await fetch(proxyUrl, {
                            headers: { Range: 'bytes=0-127' },
                            signal: controller.signal,
                        });
                        clearTimeout(timer);
                        if (!probe || !probe.ok) return null;
                        const head = (await probe.text()).trimStart();
                        if (head.startsWith('#EXTM3U') && !head.toLowerCase().includes('enc-aesgcm')) {
                            const latency = performance.now() - start;
                            return { server: serverName, proxyUrl, latency };
                        }
                        return null;
                    } catch {
                        clearTimeout(timer);
                        return null;
                    }
                };

                const probeManifest = async (proxyUrl: string): Promise<boolean> => {
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), 3500);
                    try {
                        const probe = await fetch(proxyUrl, {
                            headers: { Range: 'bytes=0-127' },
                            signal: controller.signal,
                        });
                        clearTimeout(timer);
                        if (!probe || !probe.ok) return false;
                        const head = (await probe.text()).trimStart();
                        return head.startsWith('#EXTM3U') && !head.toLowerCase().includes('enc-aesgcm');
                    } catch {
                        clearTimeout(timer);
                        return false;
                    }
                };

                // If user pinned a specific server, probe that preferred server first
                if (selectedServer) {
                    const preferredEp = movie.episodes?.find(e =>
                        e.number === currentEpisode &&
                        (e.serverName || e.server_name) === selectedServer
                    );
                    if (preferredEp?.url && (preferredEp.url.includes('.m3u8') || preferredEp.url.includes('index.m3u8'))) {
                        const probeRes = await probeDirectServer(selectedServer, preferredEp.url);
                        if (probeRes) {
                            currentServerRef.current = selectedServer;
                            if (activeStreamUrlRef.current === probeRes.proxyUrl) {
                                setLoading(false);
                                return;
                            }
                            activeStreamUrlRef.current = probeRes.proxyUrl;
                            setSource({
                                stream_url: probeRes.proxyUrl,
                                resolution: 'HD',
                                format_id: 'hls'
                            });
                            setLoading(false);
                            return;
                        }
                    }
                }

                // Concurrent probing: probe all available direct HLS servers in parallel
                // to automatically pick the stream with lowest latency.
                const directCandidates: { server: string; url: string }[] = [];
                for (const server of allServerNames) {
                    const ep = movie.episodes?.find(e =>
                        e.number === currentEpisode &&
                        (e.serverName || e.server_name) === server
                    );
                    if (ep?.url && (ep.url.includes('.m3u8') || ep.url.includes('index.m3u8'))) {
                        directCandidates.push({ server, url: ep.url });
                    }
                }

                if (directCandidates.length > 0) {
                    const probeResults = await Promise.all(
                        directCandidates.map(c => probeDirectServer(c.server, c.url))
                    );
                    const validProbes = probeResults
                        .filter((p): p is { server: string; proxyUrl: string; latency: number } => p !== null)
                        .sort((a, b) => a.latency - b.latency);

                    if (validProbes.length > 0) {
                        const fastest = validProbes[0];
                        currentServerRef.current = fastest.server;
                        if (selectedServer && selectedServer !== fastest.server) {
                            onServerFallbackRef.current?.(fastest.server);
                        } else if (!selectedServer && fastest.server !== allServerNames[0]) {
                            onServerFallbackRef.current?.(fastest.server);
                        }

                        if (activeStreamUrlRef.current === fastest.proxyUrl) {
                            setLoading(false);
                            return;
                        }
                        activeStreamUrlRef.current = fastest.proxyUrl;
                        setSource({
                            stream_url: fastest.proxyUrl,
                            resolution: 'HD',
                            format_id: 'hls'
                        });
                        setLoading(false);
                        return;
                    }
                }

                // Fallback sequential path (including embed extractors if direct m3u8 is not available)
                const candidates = selectedServer
                    ? [selectedServer, ...allServerNames.filter(s => s !== selectedServer)]
                    : allServerNames;

                for (const server of candidates) {
                    const ep = movie.episodes?.find(e =>
                        e.number === currentEpisode &&
                        (e.serverName || e.server_name) === server
                    ) || movie.episodes?.find(e => e.number === currentEpisode) || movie.episodes?.[0];

                    if (!ep?.url) continue;

                    if (ep.url.includes('.m3u8') || ep.url.includes('index.m3u8')) {
                        const proxyUrl = `/api/stream?url=${encodeURIComponent(ep.url)}`;
                        if (!(await probeManifest(proxyUrl))) continue;
                        currentServerRef.current = server;
                        if (server !== selectedServer) onServerFallbackRef.current?.(server);
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

                    const isEmbedPage = data.format_id === 'embed' || data.ext === 'embed' || data.isEmbed === true;
                    const needsProxy = !isEmbedPage && rawStreamUrl.startsWith('http');
                    const finalUrl = needsProxy
                        ? `/api/stream?url=${encodeURIComponent(rawStreamUrl)}`
                        : rawStreamUrl;

                    if (!isEmbedPage && !(await probeManifest(finalUrl))) continue;

                    currentServerRef.current = server;
                    if (server !== selectedServer) onServerFallbackRef.current?.(server);
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
    }, [movie, currentEpisode, slug, selectedServer, retryKey]);

    // Automatic stream switching on stall or fatal network errors
    const triggerAutoSwitch = useCallback((reason: string): boolean => {
        if (!movieRef.current?.episodes) return false;
        const now = Date.now();
        // Cooldown of 15 seconds to prevent rapid ping-pong
        if (now - lastSwitchTimeRef.current < 15000) return false;

        const currentServer = currentServerRef.current || selectedServer || '';
        if (currentServer) {
            failedServersRef.current.add(currentServer);
        }

        const candidateEpisodes = (movieRef.current.episodes || []).filter(
            e => e.number === currentEpisode && !!e.url
        );
        const candidateServers = Array.from(new Set(
            candidateEpisodes
                .map(e => e.serverName || e.server_name)
                .filter((s): s is string => !!s)
        ));

        let alternatives = candidateServers.filter(s => s !== currentServer && !failedServersRef.current.has(s));
        if (alternatives.length === 0) {
            alternatives = candidateServers.filter(s => s !== currentServer);
        }

        if (alternatives.length === 0) {
            console.warn(`[player] auto-switch: no alternative servers available for episode ${currentEpisode}`);
            return false;
        }

        const nextServer = alternatives[0];
        console.log(`[player] auto-switch triggered (${reason}): switching from "${currentServer}" to "${nextServer}"`);

        lastSwitchTimeRef.current = now;

        // Remember current playback position so stream switches seamlessly
        if (videoRef.current && videoRef.current.currentTime > 0) {
            pendingSeekTimeRef.current = videoRef.current.currentTime;
        }

        onAutoSwitchedRef.current?.(nextServer);
        onServerFallbackRef.current?.(nextServer);
        return true;
    }, [currentEpisode, selectedServer]);

    const triggerAutoSwitchRef = useRef(triggerAutoSwitch);
    useEffect(() => {
        triggerAutoSwitchRef.current = triggerAutoSwitch;
    }, [triggerAutoSwitch]);

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

        // Reset subtitles and revoke custom tracks on source change
        customTracksRef.current.forEach(({ el, url }) => {
            try { el.remove(); } catch { }
            URL.revokeObjectURL(url);
        });
        customTracksRef.current = [];
        setSubtitles([]);
        setCurrentSubtitle(-1);

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
            // First check if an auto-switch position was preserved
            if (pendingSeekTimeRef.current > 0) {
                hasSeeked = true;
                const target = Math.max(0, pendingSeekTimeRef.current - 2);
                pendingSeekTimeRef.current = 0;
                video.currentTime = target;
                return;
            }
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
            if (stallTimerRef.current) {
                clearTimeout(stallTimerRef.current);
                stallTimerRef.current = null;
            }
            saveCurrentProgress();
        };

        const onEnded = () => {
            if (stallTimerRef.current) {
                clearTimeout(stallTimerRef.current);
                stallTimerRef.current = null;
            }
            clearProgressRef.current(slug);
            setVideoActuallyEnded(true);
            setEpisodeEnded(true);
        };

        const onWaiting = () => {
            setBuffering(true);
            if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
            stallTimerRef.current = setTimeout(() => {
                if (!abandoned && video && !video.paused && !video.ended) {
                    triggerAutoSwitchRef.current?.('stall_timeout');
                }
            }, 6000);
        };

        const onPlaying = () => {
            setBuffering(false);
            if (stallTimerRef.current) {
                clearTimeout(stallTimerRef.current);
                stallTimerRef.current = null;
            }
        };

        const onSeeking = () => {
            if (stallTimerRef.current) {
                clearTimeout(stallTimerRef.current);
                stallTimerRef.current = null;
            }
        };

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
            if (!triggerAutoSwitchRef.current?.('native_media_error')) {
                setPlayerError(true);
            }
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
                hls = new Hls({
                    maxBufferLength: 60,
                    maxMaxBufferLength: 120,
                    fragLoadingTimeOut: 12000,
                    manifestLoadingTimeOut: 10000,
                    levelLoadingTimeOut: 10000,
                    lowLatencyMode: false,
                    enableWorker: true,
                    backBufferLength: 30,
                });
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
                hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_e, data) => {
                    const hlsTracks: SubtitleTrack[] = (data.subtitleTracks || []).map((t, idx) => ({
                        id: t.id ?? idx,
                        name: t.name || t.lang || `Track ${idx + 1}`,
                        lang: t.lang || '',
                        isCustom: false,
                    }));

                    setSubtitles(prev => {
                        const customs = prev.filter(p => p.isCustom);
                        return [...hlsTracks, ...customs];
                    });

                    const pref = localStorage.getItem('preferred_subtitle_lang') || 'vi';
                    if (pref !== 'off') {
                        const viTrack = hlsTracks.find(t =>
                            t.lang.toLowerCase().startsWith('vi') ||
                            t.name.toLowerCase().includes('việt') ||
                            t.name.toLowerCase().includes('viet') ||
                            t.name.toLowerCase().includes('vn')
                        );
                        if (viTrack) {
                            if (hlsRef.current) {
                                hlsRef.current.subtitleTrack = viTrack.id;
                            }
                            setCurrentSubtitle(viTrack.id);
                        } else if (pref !== 'vi') {
                            const prefTrack = hlsTracks.find(t => t.lang.toLowerCase().startsWith(pref.toLowerCase()));
                            if (prefTrack) {
                                if (hlsRef.current) {
                                    hlsRef.current.subtitleTrack = prefTrack.id;
                                }
                                setCurrentSubtitle(prefTrack.id);
                            }
                        }
                    }
                });
                hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_e, data) => {
                    setCurrentSubtitle(data.id);
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
                    // times — if recovery fails, automatically switch to alternative server.
                    if (hlsRecoveryAttempts < 2) {
                        hlsRecoveryAttempts++;
                        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                            hls?.startLoad();
                        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                            hls?.recoverMediaError();
                        } else {
                            if (!triggerAutoSwitchRef.current?.('hls_fatal_other')) {
                                setPlayerError(true);
                            }
                        }
                        return;
                    }
                    if (!triggerAutoSwitchRef.current?.('hls_recovery_exhausted')) {
                        setPlayerError(true);
                    }
                });
                hls.on(Hls.Events.FRAG_LOADED, () => {
                    seekToSavedPosition();
                });
            } else {
                video.src = source.stream_url;
                video.play().catch(() => { });
            }
        }, 0);

        const syncNativeTracks = () => {
            if (!video) return;
            const textTracks = video.textTracks;
            if (!textTracks || textTracks.length === 0) return;
            const tracks: SubtitleTrack[] = [];
            for (let i = 0; i < textTracks.length; i++) {
                const t = textTracks[i];
                if (t.kind === 'subtitles' || t.kind === 'captions') {
                    tracks.push({
                        id: i,
                        name: t.label || t.language || `Track ${i + 1}`,
                        lang: t.language || '',
                        isCustom: false,
                    });
                }
            }
            if (tracks.length > 0) {
                setSubtitles(prev => {
                    const customs = prev.filter(p => p.isCustom);
                    return [...tracks, ...customs];
                });
                const pref = localStorage.getItem('preferred_subtitle_lang') || 'vi';
                if (pref !== 'off') {
                    const viIndex = tracks.findIndex(t =>
                        t.lang.toLowerCase().startsWith('vi') ||
                        t.name.toLowerCase().includes('việt') ||
                        t.name.toLowerCase().includes('viet') ||
                        t.name.toLowerCase().includes('vn')
                    );
                    const target = viIndex !== -1 ? viIndex : (pref !== 'vi' ? tracks.findIndex(t => t.lang.toLowerCase().startsWith(pref.toLowerCase())) : -1);
                    if (target !== -1) {
                        for (let i = 0; i < textTracks.length; i++) {
                            textTracks[i].mode = i === target ? 'showing' : 'disabled';
                        }
                        setCurrentSubtitle(target);
                    }
                }
            }
        };
        video.addEventListener('loadedmetadata', syncNativeTracks);

        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);
        video.addEventListener('seeking', onSeeking);
        video.addEventListener('error', onError);

        // Save progress every 5 seconds
        saveIntervalRef.current = setInterval(saveCurrentProgress, 5000);

        return () => {
            abandoned = true;
            if (stallTimerRef.current) {
                clearTimeout(stallTimerRef.current);
                stallTimerRef.current = null;
            }
            clearTimeout(initTimer);
            if (hls) hls.destroy();
            if (hlsRef.current === hls) hlsRef.current = null;
            video.removeEventListener('loadedmetadata', syncNativeTracks);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('seeking', onSeeking);
            video.removeEventListener('error', onError);
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
                saveIntervalRef.current = null;
            }
            // Revoke and clear custom subtitle tracks
            customTracksRef.current.forEach(({ el, url }) => {
                try { el.remove(); } catch { }
                URL.revokeObjectURL(url);
            });
            customTracksRef.current = [];
            // Save final progress on unmount
            saveCurrentProgress();
        };
    }, [source, slug, currentEpisode]);

    const episodes = movie?.episodes || [];
    const currentServerName = selectedServer || currentServerRef.current || episodes.find(e => e.number === currentEpisode)?.serverName || episodes.find(e => e.number === currentEpisode)?.server_name || '';
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

    const selectSubtitle = useCallback((id: number) => {
        const video = videoRef.current;
        const hls = hlsRef.current;

        if (id === -1) {
            if (hls) hls.subtitleTrack = -1;
            if (video && video.textTracks) {
                for (let i = 0; i < video.textTracks.length; i++) {
                    video.textTracks[i].mode = 'disabled';
                }
            }
            setCurrentSubtitle(-1);
            localStorage.setItem('preferred_subtitle_lang', 'off');
            return;
        }

        const track = subtitles.find(t => t.id === id);
        if (!track) return;

        if (track.isCustom) {
            if (hls) hls.subtitleTrack = -1;
            if (video && video.textTracks) {
                for (let i = 0; i < video.textTracks.length; i++) {
                    const t = video.textTracks[i];
                    t.mode = (t.label === track.name) ? 'showing' : 'disabled';
                }
            }
            setCurrentSubtitle(id);
        } else {
            if (video && video.textTracks) {
                for (let i = 0; i < video.textTracks.length; i++) {
                    if (!hls) {
                        video.textTracks[i].mode = (i === id) ? 'showing' : 'disabled';
                    } else {
                        video.textTracks[i].mode = 'disabled';
                    }
                }
            }
            if (hls) {
                hls.subtitleTrack = id;
            }
            setCurrentSubtitle(id);
            if (track.lang) {
                localStorage.setItem('preferred_subtitle_lang', track.lang);
            }
        }
    }, [subtitles]);

    const loadCustomSubtitle = useCallback(async (file: File): Promise<boolean> => {
        try {
            const text = await file.text();
            const vttContent = file.name.endsWith('.srt')
                ? convertSrtToVtt(text)
                : (text.startsWith('WEBVTT') ? text : 'WEBVTT\n\n' + text);
            const blob = new Blob([vttContent], { type: 'text/vtt' });
            const blobUrl = URL.createObjectURL(blob);

            const video = videoRef.current;
            if (!video) return false;

            const trackLabel = file.name.replace(/\.[^/.]+$/, '');
            const trackEl = document.createElement('track');
            trackEl.kind = 'subtitles';
            trackEl.label = trackLabel;
            trackEl.srclang = 'custom';
            trackEl.src = blobUrl;
            trackEl.default = true;

            video.appendChild(trackEl);
            customTracksRef.current.push({ el: trackEl, url: blobUrl });

            const customId = 1000 + Math.floor(Math.random() * 9000);
            const newTrack: SubtitleTrack = {
                id: customId,
                name: trackLabel,
                lang: 'custom',
                isCustom: true,
            };

            setSubtitles(prev => [...prev, newTrack]);

            setTimeout(() => {
                if (hlsRef.current) {
                    hlsRef.current.subtitleTrack = -1;
                }
                if (video.textTracks) {
                    for (let i = 0; i < video.textTracks.length; i++) {
                        const t = video.textTracks[i];
                        if (t.label === trackLabel) {
                            t.mode = 'showing';
                        } else {
                            t.mode = 'disabled';
                        }
                    }
                }
                setCurrentSubtitle(customId);
            }, 100);

            return true;
        } catch (err) {
            console.error('Failed to load custom subtitle', err);
            return false;
        }
    }, []);

    const toggleSubtitles = useCallback(() => {
        if (currentSubtitle !== -1) {
            selectSubtitle(-1);
        } else if (subtitles.length > 0) {
            const viTrack = subtitles.find(t =>
                t.lang.toLowerCase().startsWith('vi') ||
                t.name.toLowerCase().includes('việt') ||
                t.name.toLowerCase().includes('viet') ||
                t.name.toLowerCase().includes('vn')
            );
            selectSubtitle(viTrack ? viTrack.id : subtitles[0].id);
        }
    }, [currentSubtitle, subtitles, selectSubtitle]);

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
        subtitles,
        currentSubtitle,
        selectSubtitle,
        loadCustomSubtitle,
        toggleSubtitles,
    };
};
