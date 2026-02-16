import { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import type { MovieDetail, VideoSource } from '../types';

export const useWatchMovie = (slug: string | undefined, episode: string | undefined) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [movie, setMovie] = useState<MovieDetail | null>(null);
    const [source, setSource] = useState<VideoSource | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentEpisode, setCurrentEpisode] = useState(parseInt(episode || '1'));

    useEffect(() => {
        if (!slug) return;
        const fetchDetails = async () => {
            try {
                const res = await fetch(`/api/videos/${slug}`);
                if (!res.ok) throw new Error('Failed to fetch details');
                const data = await res.json();
                setMovie(data);
            } catch (err) {
                console.error("Failed to fetch details", err);
            }
        };
        fetchDetails();
    }, [slug]);

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
                    setSource({
                        stream_url: ep.url,
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
                    body: JSON.stringify({ url: targetUrl }) // Changed to JSON payload
                });

                if (!res.ok) throw new Error('Failed to extract');
                const data = await res.json();
                setSource(data);
            } catch (err) {
                console.error("Failed to extract stream", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStream();
    }, [movie, currentEpisode, slug]);

    useEffect(() => {
        if (source && videoRef.current) {
            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(source.stream_url);
                hls.attachMedia(videoRef.current);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoRef.current?.play().catch(() => { });
                });
                return () => {
                    hls.destroy();
                };
            } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                videoRef.current.src = source.stream_url;
                videoRef.current.play().catch(() => { });
            }
        }
    }, [source]);

    // Wake Lock Logic (Prevent Screen Sleep)
    useEffect(() => {
        const video = videoRef.current;
        let wakeLock: any = null;

        const requestWakeLock = async () => {
            if (wakeLock !== null) return;
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                    // console.log('Wake Lock active');
                }
            } catch (err) {
                console.warn('Wake Lock failed:', err);
            }
        };

        const releaseWakeLock = async () => {
            if (wakeLock) {
                try {
                    await wakeLock.release();
                    wakeLock = null;
                    // console.log('Wake Lock released');
                } catch (err) {
                    // console.warn('Wake Lock release failed:', err);
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

    return {
        movie,
        source,
        loading,
        currentEpisode,
        setCurrentEpisode,
        videoRef
    };
};
