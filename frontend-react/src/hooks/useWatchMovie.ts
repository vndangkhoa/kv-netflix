import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import type { MovieDetail, VideoSource } from '../types';
import { useWatchProgress } from './useWatchProgress';

export const useWatchMovie = (slug: string | undefined, episode: string | undefined) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [source, setSource] = useState<VideoSource | null>(null);
    const [loading, setLoading] = useState(true);
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
        if (!movie) return;

        const fetchStream = async () => {
            setLoading(true);
            try {
                const ep = movie.episodes?.find(e => e.number === currentEpisode);

                // If no episode or no URL, don't try to extract — let WatchPage show "Coming Soon"
                if (!ep?.url) {
                    setLoading(false);
                    return;
                }

                if (ep.url.includes('.m3u8') || ep.url.includes('index.m3u8')) {
                    const isPhimMoi = ep.url.includes('phimmoichill') || ep.url.includes('sotrim') || ep.url.includes('phmchill');
                    setSource({
                        stream_url: isPhimMoi
                            ? `/api/stream?url=${encodeURIComponent(ep.url)}`
                            : ep.url,
                        resolution: 'HD',
                        format_id: 'hls'
                    });
                    setLoading(false);
                    return;
                }

                const targetUrl = ep ? ep.url : `https://phimmoichill.network/xem-phim/${slug}/tap-${currentEpisode}`;

                const res = await fetch(`/api/extract`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: targetUrl })
                });

                if (!res.ok) throw new Error('Failed to extract');
                const data = await res.json();
                setSource({
                    ...data,
                    stream_url: (data.url || data.stream_url).includes('phimmoichill') || (data.url || data.stream_url).includes('sotrim') || (data.url || data.stream_url).includes('phmchill')
                        ? `/api/stream?url=${encodeURIComponent(data.url || data.stream_url)}`
                        : (data.url || data.stream_url)
                });
            } catch {
                console.error("Failed to extract stream");
            } finally {
                setLoading(false);
            }
        };

        fetchStream();
    }, [movie, currentEpisode, slug]);

    // Save progress periodically and seek to saved position
    useEffect(() => {
        if (!source || !videoRef.current || !slug) return;

        const video = videoRef.current;
        let hls: Hls | null = null;
        let hasSeeked = false;
        hasTriggeredNearEnd.current = false;

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

        if (isHls && Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(source.stream_url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                seekToSavedPosition();
                video.play().catch(() => { });
            });
            hls.on(Hls.Events.FRAG_LOADED, () => {
                seekToSavedPosition();
            });
        } else {
            video.src = source.stream_url;
            video.play().catch(() => { });
        }

        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        video.addEventListener('timeupdate', onTimeUpdate);

        // Save progress every 5 seconds
        saveIntervalRef.current = setInterval(saveCurrentProgress, 5000);

        return () => {
            if (hls) hls.destroy();
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('timeupdate', onTimeUpdate);
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
                saveIntervalRef.current = null;
            }
            // Save final progress on unmount
            saveCurrentProgress();
        };
    }, [source, slug, currentEpisode]);

    // Wake Lock Logic (Prevent Screen Sleep)
    useEffect(() => {
        const video = videoRef.current;
        let wakeLock: any = null;

        const requestWakeLock = async () => {
            if (wakeLock !== null) return;
            try {
                if ('wakeLock' in navigator) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                    // console.log('Wake Lock active');
                }
            } catch {
                console.warn('Wake Lock failed');
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLock) {
                try {
                    await wakeLock.release();
                    wakeLock = null;
                    // console.log('Wake Lock released');
                } catch {
                    // console.warn('Wake Lock release failed');
                }
            }
        };

        if (video) {
            const onPlay = () => requestWakeLock();
            const onPause = () => releaseWakeLock();
            const onEnded = () => releaseWakeLock();

            video.addEventListener('play', onPlay);
            video.addEventListener('pause', onPause);
            video.addEventListener('ended', onEnded);

            // If already playing (HLS might auto-start before this effect)
            if (!video.paused) {
                requestWakeLock();
            }

            // Re-acquire on visibility change if playing
            const onVisibilityChange = () => {
                if (document.visibilityState === 'visible' && !video.paused) {
                    requestWakeLock();
                }
            };
            document.addEventListener('visibilitychange', onVisibilityChange);

            return () => {
                video.removeEventListener('play', onPlay);
                video.removeEventListener('pause', onPause);
                video.removeEventListener('ended', onEnded);
                document.removeEventListener('visibilitychange', onVisibilityChange);
                releaseWakeLock();
            };
        }
    }, [source]);

    const episodes = movie?.episodes || [];
    const currentServerName = episodes.find(e => e.number === currentEpisode)?.serverName || episodes.find(e => e.number === currentEpisode)?.server_name || '';
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
    };
};
