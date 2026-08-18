import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, SkipForward, SkipBack, X, Heart, Bookmark, Gauge, Check, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useWatchMovie } from '../../hooks/useWatchMovie';
import { usePiP } from '../../hooks/usePiP';
import MovieRow from '../../components/MovieRow';
import 'plyr/dist/plyr.css';
import Plyr from 'plyr';
import { useLang } from '../../context/LanguageContext';
import { useMyList } from '../../hooks/useMyList';
import { useAuth } from '../../context/AuthContext';
import { syncAPI } from '../../api/client';
import { registerWebOSBackHandler, WEBOS_KEY_CODES } from '../../hooks/useWebOS';

// Icons for the custom controls injected into the Plyr control bar
const NEXT_EPISODE_ICON = '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4" fill="currentColor"/><line x1="19" x2="19" y1="5" y2="19" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const FULLSCREEN_ICON_ENTER = '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/></svg>';
const FULLSCREEN_ICON_EXIT = '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" fill="currentColor"/></svg>';

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
                    stroke="var(--accent)" strokeWidth="2"
                    strokeDasharray={`${(count / 10) * 100.53} 100.53`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-accent">
                {count}
            </span>
        </div>
    );
}

// Plyr re-parents the <video> into its own .plyr container (wrapper + controls).
// When React unmounts this element (stream source change) it calls
// parent.removeChild(video), which throws "The node to be removed is not a
// child of this node" because the video now lives inside Plyr's wrapper.
// Patch the React div's removeChild to put the video back under React's div
// first. Runs only on real removals (StrictMode re-mounts never detach nodes).
const PlyrVideo = ({ ref, className, poster }: { ref: React.Ref<HTMLVideoElement>; className?: string; poster?: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useLayoutEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const parent = video.parentElement as HTMLElement | null;
        if (!parent) return;
        const origRemoveChild = parent.removeChild.bind(parent);
        // Deliberately not restored on cleanup: React runs this cleanup BEFORE
        // detaching the node, so unpatching here would let the unpatched
        // removeChild(video) throw. The patched div is discarded together with
        // the video, and each new video re-patches with its own element.
        parent.removeChild = <T extends Node>(child: T): T => {
            if (child === (video as Node)) {
                const plyr = video.closest('.plyr');
                if (plyr && plyr.parentElement === parent) {
                    parent.insertBefore(video, plyr);
                    plyr.remove();
                }
            }
            return origRemoveChild(child);
        };
    }, []);

    return (
        <video
            ref={(node) => {
                videoRef.current = node;
                if (typeof ref === 'function') ref(node);
                else if (ref) ref.current = node;
            }}
            playsInline
            className={className}
            poster={poster}
        />
    );
};

const VerticalVolume = ({ ref }: { ref: React.RefObject<HTMLVideoElement | null> }) => {
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);

    useEffect(() => {
        const video = ref.current;
        if (!video) return;
        const sync = () => {
            setVolume(video.volume);
            setMuted(video.muted);
        };
        sync();
        video.addEventListener('volumechange', sync);
        return () => video.removeEventListener('volumechange', sync);
    }, [ref]);

    const setVol = (v: number) => {
        const video = ref.current;
        if (!video) return;
        video.volume = v;
        video.muted = v === 0;
    };

    const toggleMute = () => {
        const video = ref.current;
        if (!video) return;
        video.muted = !video.muted;
    };

    const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
        <div className="group/vol relative">
            {/* Vertical volume slider, revealed on hover */}
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center justify-center opacity-0 translate-y-2 pointer-events-none transition-all duration-200 group-hover/vol:opacity-100 group-hover/vol:translate-y-0 group-hover/vol:pointer-events-auto focus-within:opacity-100 focus-within:translate-y-0 focus-within:pointer-events-auto">
                <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-2xl py-3 px-1.5 shadow-2xl">
                    <div className="relative h-36 w-8">
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={muted ? 0 : volume}
                            onChange={(e) => setVol(parseFloat(e.target.value))}
                            aria-label="Volume"
                            className="absolute top-1/2 left-1/2 w-32 -translate-x-1/2 -translate-y-1/2 -rotate-90 accent-[var(--accent)] cursor-pointer"
                        />
                    </div>
                </div>
            </div>
            <button
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all hover:scale-110"
            >
                <VolumeIcon className="w-5 h-5 text-white" />
            </button>
        </div>
    );
};

export const WatchPage = ({ slug, episode }: { slug: string, episode: string }) => {
    const navigate = useNavigate();
    const [selectedServer, setSelectedServer] = useState<string>('');
    const {
        movie, loading, currentEpisode, setCurrentEpisode, videoRef,
        episodeEnded, videoActuallyEnded, hasNextEpisode, hasPrevEpisode,
        playNextEpisode, dismissEndScreen,
        source,
        buffering, playerError, retryStream, levels, currentLevel, selectQuality,
    } = useWatchMovie(slug, episode, selectedServer, setSelectedServer);
    const [expanded, setExpanded] = useState(false);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const togglePiPRef = useRef<(() => Promise<void>) | null>(null);
    const { togglePiP } = usePiP(videoRef);
    const [playerControlsVisible, setPlayerControlsVisible] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [seekFlash, setSeekFlash] = useState<{ dir: 'back' | 'forward'; ts: number } | null>(null);
    const lastTapRef = useRef<{ x: number; t: number }>({ x: 0, t: 0 });
    const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        togglePiPRef.current = togglePiP;
    }, [togglePiP]);
    const { t } = useLang();
    const { isSaved, addToList, removeFromList } = useMyList();
    const { isAuthenticated } = useAuth();

    const movieId = movie?.id || slug;
    const isMovieSaved = isSaved(movieId);

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => {
            setToast({ message: '', visible: false });
        }, 3500);
    };

    const handleToggleSave = useCallback(() => {
        if (!movie) return;

        if (isMovieSaved) {
            removeFromList(movieId);
            if (isAuthenticated) {
                syncAPI.removeSavedMovie(movieId).catch(() => {});
            }
            return;
        }

        const movieData = {
            id: movie.slug,
            title: movie.title,
            original_title: movie.original_title,
            slug: movie.slug,
            thumbnail: movie.thumbnail,
            backdrop: movie.backdrop,
            year: movie.year,
            category: movie.category || 'movies',
            quality: movie.quality,
            director: movie.director,
            cast: movie.cast,
            genre: movie.genre,
            country: movie.country,
        };
        addToList(movieData);
        showToast(t.savedToMyList as string);

        if (isAuthenticated) {
            syncAPI.addSavedMovie({
                movie_id: movie.slug,
                title: movie.title,
                slug: movie.slug,
                thumbnail: movie.thumbnail,
                backdrop: movie.backdrop,
                year: movie.year || 0,
                category: movie.category || '',
                quality: movie.quality || '',
                director: movie.director || '',
                cast: Array.isArray(movie.cast) ? movie.cast.join(',') : (movie.cast || ''),
            }).catch(() => {});
        } else {
            setTimeout(() => {
                showToast(t.saveToSync as string);
            }, 1200);
        }
    }, [movie, isMovieSaved, movieId, isAuthenticated, addToList, removeFromList, t]);

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

    const qualityLabel = (height: number) =>
        height >= 1080 ? '1080p' : height >= 720 ? '720p' : height >= 480 ? '480p' : height >= 360 ? '360p' : `${height}p`;

    const getEmbedHost = (url: string): string => {
        try {
            return new URL(url).hostname;
        } catch {
            // Proxied relative URLs (/api/stream?url=...) — read the real host from the query param
            try {
                const param = new URL(url, window.location.origin).searchParams.get('url');
                return param ? new URL(param).hostname : '';
            } catch {
                return '';
            }
        }
    };

    const getRawStreamUrl = (url: string): string => {
        try {
            const u = new URL(url, window.location.origin);
            return u.searchParams.get('url') || url;
        } catch {
            return url;
        }
    };

    const plyrRef = useRef<Plyr | null>(null);
    const plyrInitRef = useRef(false);
    const prevPlyrParentRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        togglePiPRef.current = togglePiP;
    }, [togglePiP]);

    // Detect when Plyr recreates the video element (during episode change or seek)
    useEffect(() => {
        if (!source || !videoRef.current) return;

        const parentDiv = videoRef.current.parentElement;
        if (!parentDiv || parentDiv.tagName !== 'DIV') return;

        // If Plyr recreated a new container, re-init HLS on the new video element
        if (prevPlyrParentRef.current && prevPlyrParentRef.current !== parentDiv) {
            const newVideo = videoRef.current as HTMLVideoElement;
            void fetch(`/api/videos/${slug}`).then(async () => {
                // HLS re-initialization happens in useWatchMovie when source changes
                // We just need to ensure the event listeners are on this new DOM node
                if (newVideo.src && !newVideo.paused) {
                    const duration = newVideo.duration;
                    if (duration > 0 && duration - newVideo.currentTime < 30) {
                        newVideo.currentTime = Math.max(0, duration - 10);
                    }
                }
            }).catch(() => {});
        }

        prevPlyrParentRef.current = parentDiv;
    }, [source, currentEpisode]);

    const playerContainerRef = useRef<HTMLDivElement | null>(null);
    const toggleFullscreenRef = useRef<(() => void) | null>(null);
    const playNextEpisodeRef = useRef(playNextEpisode);
    const hasNextEpisodeRef = useRef(hasNextEpisode);
    // Latest-value refs so the DOM buttons injected into the Plyr bar never
    // capture stale episode state (the Plyr init effect only re-runs when the
    // stream URL changes). Kept above the init effect that reads them.
    useEffect(() => { playNextEpisodeRef.current = playNextEpisode; });
    useEffect(() => { hasNextEpisodeRef.current = hasNextEpisode; });

    // Cross-platform fullscreen toggle.
    // - iPhone/iPod: the Fullscreen API only supports <video> elements there,
    //   and Plyr's default handling degrades to a CSS "fill the viewport" zoom
    //   instead of a real fullscreen player — so use the native iOS fullscreen
    //   player instead (webkitEnterFullscreen on all iOS versions, or
    //   requestFullscreen on the video element for iOS 16.4+).
    // - Android / desktop / iPad: fullscreen the player container so our custom
    //   controls (skip, next episode, volume, settings) stay visible.
    const toggleFullscreen = useCallback(async () => {
        const video = videoRef.current;
        const container = playerContainerRef.current;
        if (!container) return;

        const doc = document as Document & {
            webkitFullscreenElement?: Element | null;
            webkitExitFullscreen?: () => void;
        };
        const isFullscreen = !!(document.fullscreenElement || doc.webkitFullscreenElement);
        const exitFullscreen = async () => {
            if (document.exitFullscreen) await document.exitFullscreen().catch(() => {});
            else doc.webkitExitFullscreen?.();
        };

        if (/iPhone|iPod/.test(navigator.userAgent) && video &&
            typeof (video as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen === 'function') {
            if (isFullscreen) {
                await exitFullscreen();
            } else {
                try {
                    (video as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
                } catch {
                    try { await video.requestFullscreen(); } catch { /* unsupported */ }
                }
            }
            return;
        }

        const el = container as HTMLElement & { webkitRequestFullscreen?: () => void };
        if (isFullscreen) {
            await exitFullscreen();
        } else if (el.requestFullscreen) {
            await el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else if (video?.requestFullscreen) {
            // Last resort for browsers that only allow fullscreen on <video>
            await video.requestFullscreen().catch(() => {});
        }
    }, [videoRef]);

    useEffect(() => {
        toggleFullscreenRef.current = toggleFullscreen;
    }, [toggleFullscreen]);

    // Plyr wraps the <video> element, which is keyed by stream URL — every
    // source change mounts a fresh video element, so Plyr must be rebuilt.
    useEffect(() => {
        if (!source || !videoRef.current) return;

        if (plyrInitRef.current) {
            try {
                plyrRef.current?.destroy?.();
            } catch {
                // element already removed from the DOM — ignore
            }
            plyrRef.current = null;
            plyrInitRef.current = false;
        }

        const player = new Plyr(videoRef.current, {
            controls: ['play-large', 'rewind', 'play', 'fast-forward', 'progress', 'current-time'],
            invertTime: false,
            seekTime: 10,
            keyboard: { focused: true, global: true },
            // Plyr's own fullscreen is unreliable on iPhone (it degrades to a
            // CSS "fill the viewport" zoom instead of a real fullscreen
            // player), so it is disabled here — a custom cross-platform
            // fullscreen button is injected instead.
            fullscreen: { enabled: false },
        });
        plyrRef.current = player;
        plyrInitRef.current = true;

        const injectCustomControls = () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ctrl = (player as any).elements?.controls as HTMLElement | undefined;
            if (!ctrl) return;

            // Picture-in-Picture (native API only)
            if (document.pictureInPictureEnabled && !ctrl.querySelector('[data-plyr="pip"]')) {
                // Ensure the container has the pip-supported class so Plyr CSS shows the button
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (player as any).elements?.container?.classList?.add('plyr--pip-supported');

                const pipBtn = document.createElement('button');
                pipBtn.className = 'plyr__controls__item plyr__control';
                pipBtn.setAttribute('data-plyr', 'pip');
                pipBtn.setAttribute('type', 'button');
                pipBtn.setAttribute('aria-label', 'Picture-in-Picture');
                pipBtn.innerHTML = '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 18 18"><path d="M16 1H2a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm-1 14H3V3h12v12z" fill="currentColor"/><path d="M10 7h5v5h-5V7z" fill="currentColor"/></svg>';
                pipBtn.addEventListener('click', () => togglePiPRef.current?.());
                ctrl.appendChild(pipBtn);
            }

            // Next episode button (hidden when there is no next episode)
            if (!ctrl.querySelector('[data-kv-next]')) {
                const nextBtn = document.createElement('button');
                nextBtn.className = 'plyr__controls__item plyr__control';
                nextBtn.setAttribute('data-kv-next', '');
                nextBtn.setAttribute('type', 'button');
                nextBtn.setAttribute('aria-label', 'Next episode');
                nextBtn.title = 'Next episode';
                nextBtn.innerHTML = NEXT_EPISODE_ICON;
                nextBtn.style.display = hasNextEpisodeRef.current ? '' : 'none';
                nextBtn.addEventListener('click', () => playNextEpisodeRef.current?.());
                ctrl.appendChild(nextBtn);
            }

            // Cross-platform fullscreen (works on iPhone via the native player)
            if (!ctrl.querySelector('[data-kv-fullscreen]')) {
                const fsBtn = document.createElement('button');
                fsBtn.className = 'plyr__controls__item plyr__control';
                fsBtn.setAttribute('data-kv-fullscreen', '');
                fsBtn.setAttribute('type', 'button');
                fsBtn.setAttribute('aria-label', 'Toggle fullscreen');
                fsBtn.title = 'Toggle fullscreen';
                fsBtn.innerHTML = FULLSCREEN_ICON_ENTER;
                fsBtn.addEventListener('click', () => toggleFullscreenRef.current?.());
                ctrl.appendChild(fsBtn);
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((player as any).elements?.controls) {
            injectCustomControls();
        } else {
            player.on('ready', injectCustomControls);
        }

        const onControlsShow = () => setPlayerControlsVisible(true);
        const onControlsHide = () => { setPlayerControlsVisible(false); setSettingsOpen(false); };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (player as any).on('controlsshown', onControlsShow);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (player as any).on('controlshidden', onControlsHide);
        return () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (player as any).off('controlsshown', onControlsShow);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (player as any).off('controlshidden', onControlsHide);
        };
    }, [source?.stream_url]);

    // Keep the injected next-episode button in the Plyr bar in sync with the
    // current episode (the button is re-injected per stream, but the episode
    // can change without the stream URL changing).
    useEffect(() => {
        const btn = document.querySelector<HTMLElement>('.plyr__controls [data-kv-next]');
        if (btn) btn.style.display = hasNextEpisode ? '' : 'none';
    }, [hasNextEpisode]);

    // Apply playback speed to the video element (survives HLS re-creation)
    useEffect(() => {
        const video = videoRef.current;
        if (video) video.playbackRate = playbackSpeed;
    }, [playbackSpeed, source]);

    const seekRelative = useCallback((seconds: number) => {
        const video = videoRef.current;
        if (!video) return;
        const target = Math.min(Math.max(video.currentTime + seconds, 0), video.duration || video.currentTime + seconds);
        video.currentTime = target;
    }, [videoRef]);

    // Single / double tap gesture on the video: double-tap seeks ±15s, single tap toggles play
    const handleVideoTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        if (!video || !(e.target instanceof HTMLVideoElement)) return;
        const now = Date.now();
        if (now - lastTapRef.current.t < 320) {
            if (singleTapTimerRef.current) {
                clearTimeout(singleTapTimerRef.current);
                singleTapTimerRef.current = null;
            }
            const rect = video.getBoundingClientRect();
            const goBack = e.clientX < rect.left + rect.width / 2;
            seekRelative(goBack ? -15 : 15);
            const ts = now;
            setSeekFlash({ dir: goBack ? 'back' : 'forward', ts });
            setTimeout(() => setSeekFlash(f => (f && f.ts === ts ? null : f)), 650);
        } else {
            lastTapRef.current = { x: e.clientX, t: now };
            singleTapTimerRef.current = setTimeout(() => {
                singleTapTimerRef.current = null;
                if (video.paused) { video.play().catch(() => { }); } else { video.pause(); }
            }, 380);
        }
    }, [seekRelative, videoRef]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFS = !!document.fullscreenElement;

            // Swap the injected fullscreen button icon between enter/exit
            const fsBtn = document.querySelector<HTMLElement>('.plyr__controls [data-kv-fullscreen]');
            if (fsBtn) fsBtn.innerHTML = isFS ? FULLSCREEN_ICON_EXIT : FULLSCREEN_ICON_ENTER;

            if (isFS) {
                if ('orientation' in screen && typeof (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock === 'function') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (screen.orientation as any).lock('landscape').catch(() => {});
                }
            } else {
                if ('orientation' in screen && typeof screen.orientation.unlock === 'function') {
                    screen.orientation.unlock();
                }
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // WebOS TV Remote Media Keys & Back Button integration
    useEffect(() => {
        const handleTVMediaKey = (e: KeyboardEvent) => {
            const video = videoRef.current;
            const plyr = plyrRef.current;
            if (!video && !plyr) return;

            switch (e.keyCode) {
                case WEBOS_KEY_CODES.PLAY:
                    if (plyr) plyr.play(); else video?.play();
                    break;
                case WEBOS_KEY_CODES.PAUSE:
                    if (plyr) plyr.pause(); else video?.pause();
                    break;
                case WEBOS_KEY_CODES.PLAY_PAUSE:
                    if (plyr) {
                        if (plyr.playing) plyr.pause(); else plyr.play();
                    } else if (video) {
                        if (video.paused) video.play(); else video.pause();
                    }
                    break;
                case WEBOS_KEY_CODES.FAST_FORWARD:
                    if (plyr) plyr.forward(10); else if (video) video.currentTime += 10;
                    break;
                case WEBOS_KEY_CODES.REWIND:
                    if (plyr) plyr.rewind(10); else if (video) video.currentTime -= 10;
                    break;
                case WEBOS_KEY_CODES.STOP:
                    if (plyr) { plyr.stop(); } else if (video) { video.pause(); video.currentTime = 0; }
                    break;
            }
        };

        window.addEventListener('keydown', handleTVMediaKey);
        return () => window.removeEventListener('keydown', handleTVMediaKey);
    }, [videoRef]);

    useEffect(() => {
        return registerWebOSBackHandler(() => {
            if (episodeEnded) {
                dismissEndScreen();
                return true;
            }
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
                return true;
            }
            navigate('/');
            return true;
        });
    }, [episodeEnded, dismissEndScreen, navigate]);

    // Do NOT call navigate() inside useEffect — it causes WatchPage to unmount and remount,
    // which destroys useWatchMovie's internal state (HLS instance, event listeners).
    // Let the URL update naturally when React Router detects route changes.

    const handleEpisodeClick = useCallback((epNumber: number) => {
        dismissEndScreen();
        setCurrentEpisode(epNumber);
    }, [dismissEndScreen, setCurrentEpisode]);

    const episodesByServer = movie?.episodes?.reduce((acc, ep) => {
        const server = ep.serverName || ep.server_name || 'Default';
        if (!acc[server]) acc[server] = [];
        acc[server].push(ep);
        return acc;
    }, {} as Record<string, typeof movie.episodes>) || {};

    const serverNames = Object.keys(episodesByServer);

    // Prefer servers with embed URLs (more reliable) over raw m3u8 CDN links that can go stale
    const epNum = parseInt(episode || '1');
    const serversWithEpisode = serverNames.filter(server => {
        const eps = episodesByServer[server] || [];
        return eps.some(e => (e.number === epNum || eps.length === 1) && !!e.url);
    });
    const defaultServer = serversWithEpisode.find(server => {
        const eps = episodesByServer[server] || [];
        const ep = eps.find(e => e.number === epNum) || eps[0];
        return ep?.url && (ep.url.includes('embed') || ep.url.includes('streamc'));
    }) || serversWithEpisode[0] || serverNames[0] || '';
    const activeServer = selectedServer && serverNames.includes(selectedServer) ? selectedServer : defaultServer;

    // Seed the selected server once the default becomes known (loaded async
    // from the API); afterwards only explicit user clicks change it.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (defaultServer && !selectedServer) {
            setSelectedServer(defaultServer);
        }
    }, [defaultServer, selectedServer]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const currentServerEpisodes = episodesByServer[activeServer] || [];

    useEffect(() => {
        if (!currentServerEpisodes || currentServerEpisodes.length === 0) return;
        const hasCurrentEp = currentServerEpisodes.some(e => e.number === currentEpisode);
        if (!hasCurrentEp) {
            setCurrentEpisode(currentServerEpisodes[0].number);
        }
    }, [currentServerEpisodes, currentEpisode, setCurrentEpisode]);

    if (!movie) return (
        <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[var(--text-muted)] animate-pulse">{t.loadingStream}</p>
            </div>
        </div>
    );

    const visibleEpisodes = expanded ? currentServerEpisodes : currentServerEpisodes.slice(0, 20);

    const nextEp = hasNextEpisode
        ? currentServerEpisodes.find(e => e.number === currentEpisode + 1)
        : null;
    const prevEp = hasPrevEpisode
        ? currentServerEpisodes.find(e => e.number === currentEpisode - 1)
        : null;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-accent/30 pb-20 transition-colors duration-300">
            {/* Back Navigation */}
            <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-[var(--bg-primary)]/80 to-transparent pointer-events-none flex items-center justify-between">
                <button
                    onClick={() => navigate('/')}
                    tabIndex={0}
                    className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)]/80 hover:bg-[var(--bg-elevated)] backdrop-blur-md rounded-full transition-all group border border-[var(--border-primary)] shadow-lg focus-visible:ring-4 focus-visible:ring-accent focus-visible:scale-105"
                >
                    <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)] group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium text-sm text-[var(--text-primary)]">{t.backToHome}</span>
                </button>
            </div>

            {/* 1. Cinema Player Section */}
            <div ref={playerContainerRef} className="w-full h-[50vh] md:h-[80vh] bg-black relative shadow-2xl z-40">
                {(loading || (buffering && !episodeEnded)) && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent border-t-transparent shadow-[0_0_20px_var(--accent-glow-soft)]"></div>
                    </div>
                )}
                {(() => {
                    const activeEpisode = currentServerEpisodes?.find(e => e.number === currentEpisode) || currentServerEpisodes?.[0];
                    // Movie has no episodes at all (e.g. upcoming / now-showing):
                    // invite the user to save it and check back later.
                    if (!activeEpisode?.url && currentServerEpisodes.length === 0) {
                        return (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
                                <div className="max-w-lg relative z-10 flex flex-col items-center">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{t.notAvailableYet}</h2>
                                    <p className="text-gray-400 text-sm md:text-base mb-6 leading-relaxed">{t.checkBackLater}</p>
                                    <button
                                        onClick={handleToggleSave}
                                        tabIndex={0}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg focus-visible:ring-4 focus-visible:ring-accent active:scale-95 ${
                                            isMovieSaved
                                                ? 'bg-[var(--bg-3)] text-[var(--accent)] border border-[var(--accent)]/40'
                                                : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-contrast)]'
                                        }`}
                                    >
                                        {isMovieSaved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                                        {isMovieSaved ? (t.savedMovie as string) : (t.saveForLater as string)}
                                    </button>
                                </div>
                                <div
                                    className="absolute inset-0 -z-10 opacity-30 bg-cover bg-center blur-2xl grayscale"
                                    style={{ backgroundImage: `url(${getProxyUrl(movie.backdrop || movie.thumbnail, 640)})` }}
                                />
                            </div>
                        );
                    }
                    if (!activeEpisode?.url) {
                        return (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
                                <div className="max-w-lg">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Tập {currentEpisode} không có trên server này</h2>
                                    <p className="text-gray-400 text-sm md:text-base mb-6">
                                        Vui lòng chọn server khác bên dưới để tiếp tục xem:
                                    </p>
                                    {serverNames.length > 1 && (
                                        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                                            {serverNames.map(server => (
                                                <button
                                                    key={server}
                                                    onClick={() => setSelectedServer(server)}
                                                    className={`px-4 py-2 text-xs md:text-sm font-bold rounded-full transition-all border ${activeServer === server
                                                        ? 'bg-accent text-white border-accent'
                                                        : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'
                                                        }`}
                                                >
                                                    {server}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div
                                    className="absolute inset-0 -z-10 opacity-30 bg-cover bg-center blur-2xl grayscale"
                                    style={{ backgroundImage: `url(${getProxyUrl(movie.backdrop || movie.thumbnail, 640)})` }}
                                />
                            </div>
                        );
                    }

                    const rawStreamUrl = source?.stream_url ? getRawStreamUrl(source.stream_url) : '';
                    const isEmbedStream = !!source?.isEmbed || source?.ext === 'embed' || source?.format_id === 'embed' ||
                        (rawStreamUrl && (rawStreamUrl.includes('embed.php') || rawStreamUrl.includes('streamc.xyz/embed') || rawStreamUrl.includes('/embed/')));

                    return (
                        <>
                            <div className="absolute inset-0">
                                {isEmbedStream ? (
                                    <>
                                        <iframe
                                            src={rawStreamUrl}
                                            className="w-full h-full"
                                            allowFullScreen
                                            allow="autoplay; fullscreen"
                                            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-downloads"
                                        />
                                        {getEmbedHost(rawStreamUrl) && (
                                            <style>{`
                                                iframe[src*="${getEmbedHost(rawStreamUrl)}"] ~ .ad-overlay { display: none; }
                                            `}</style>
                                        )}
                                        <div className="ad-overlay absolute inset-0 pointer-events-none z-10" />
                                    </>
                                ) : (
                                    <div className="absolute inset-0" onClick={handleVideoTap}>
                                        <PlyrVideo
                                            key={source?.stream_url || 'none'}
                                            ref={videoRef}
                                            className="w-full h-full cursor-pointer"
                                            poster={getProxyUrl(movie.backdrop || movie.thumbnail, 1280)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Double-tap seek flash */}
                            {seekFlash && (
                                <div key={seekFlash.ts} className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center animate-fade-in">
                                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/15">
                                        {seekFlash.dir === 'back' ? <SkipBack className="w-6 h-6 text-white" /> : <SkipForward className="w-6 h-6 text-white" />}
                                        <span className="text-white font-bold">{seekFlash.dir === 'back' ? '-15s' : '+15s'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Stream error overlay with retry */}
                            {playerError && !episodeEnded && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm">
                                    <div className="text-center">
                                        <p className="text-white font-semibold text-lg mb-1">Stream interrupted</p>
                                        <p className="text-gray-400 text-sm mb-4">The stream failed to load. Please try again.</p>
                                        <button
                                            onClick={() => {
                                                setSettingsOpen(false);
                                                retryStream();
                                            }}
                                            className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-full text-sm font-bold transition-colors shadow-[0_0_20px_var(--accent-glow-soft)]"
                                        >
                                            Retry stream
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Floating action bar: skip ±10s + settings (direct streams only) */}
                            {!source?.isEmbed && !String(source?.stream_url || '').includes('embed') && !episodeEnded && (
                                <>
                                    <div className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 transition-opacity duration-300"
                                         style={{ opacity: playerControlsVisible ? 1 : 0, pointerEvents: playerControlsVisible ? 'auto' : 'none' }}>
                                        <button
                                            onClick={() => seekRelative(-10)}
                                            className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all hover:scale-110"
                                            aria-label="Back 10 seconds"
                                        >
                                            <SkipBack className="w-5 h-5 text-white" />
                                        </button>
                                        <button
                                            onClick={() => seekRelative(10)}
                                            className="w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all hover:scale-110"
                                            aria-label="Forward 10 seconds"
                                        >
                                            <SkipForward className="w-5 h-5 text-white" />
                                        </button>
                                    </div>

                                    {/* Volume + Settings */}
                                    <div className="absolute bottom-24 md:bottom-28 right-3 md:right-6 z-40 flex items-center gap-3 transition-opacity duration-300"
                                         style={{ opacity: playerControlsVisible ? 1 : 0, pointerEvents: playerControlsVisible ? 'auto' : 'none' }}>
                                        <VerticalVolume ref={videoRef} key={source?.stream_url} />
                                        <div className="relative">
                                            <button
                                                onClick={() => setSettingsOpen(o => !o)}
                                                className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all hover:scale-110 ${settingsOpen ? 'bg-accent border-accent' : 'bg-black/60 hover:bg-black/80 border-white/20'}`}
                                                aria-label="Settings"
                                            >
                                                <Gauge className="w-5 h-5 text-white" />
                                            </button>
                                            {settingsOpen && (
                                                <div className="absolute bottom-14 right-0 w-52 glass-panel bg-[var(--bg-secondary)]/95 backdrop-blur-xl rounded-2xl border border-[var(--border-primary)] shadow-2xl p-2 animate-fade-in">
                                                {levels.length > 0 && (
                                                    <>
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-3 pt-2 pb-1">Quality</p>
                                                        {[-1, ...levels].map(lv => {
                                                            const index = typeof lv === 'number' ? lv : lv.index;
                                                            const height = typeof lv === 'number' ? 0 : lv.height;
                                                            return (
                                                                <button
                                                                    key={index}
                                                                    onClick={() => selectQuality(index)}
                                                                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-[var(--bg-elevated)] transition-colors"
                                                                >
                                                                    <span className={currentLevel === index ? 'text-accent font-semibold' : 'text-[var(--text-secondary)]'}>
                                                                        {index === -1 ? 'Auto' : qualityLabel(height)}
                                                                    </span>
                                                                    {currentLevel === index && <Check className="w-4 h-4 text-accent" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                                <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Speed</p>
                                                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(spd => (
                                                    <button
                                                        key={spd}
                                                        onClick={() => setPlaybackSpeed(spd)}
                                                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-sm hover:bg-[var(--bg-elevated)] transition-colors"
                                                    >
                                                        <span className={playbackSpeed === spd ? 'text-accent font-semibold' : 'text-[var(--text-secondary)]'}>{spd}x</span>
                                                        {playbackSpeed === spd && <Check className="w-4 h-4 text-accent" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                </>
                            )}

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
                                                    className="group relative flex-shrink-0 w-[160px] sm:w-[220px] md:w-[300px] rounded-xl overflow-hidden border-2 border-accent/50 hover:border-accent transition-all shadow-[0_0_30px_var(--accent-glow-faint)]"
                                                >
                                                    <div className="aspect-video bg-[#1a1a1a] relative">
                                                        <img
                                                            src={getProxyUrl(movie.backdrop || movie.thumbnail, 480)}
                                                            alt={`Episode ${nextEp.number}`}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="bg-accent/90 rounded-full p-3 group-hover:scale-110 transition-transform">
                                                                <SkipForward className="w-6 h-6 text-white fill-current" />
                                                            </div>
                                                        </div>
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                                            <p className="text-sm text-white font-bold">{t.episode} {nextEp.number}</p>
                                                        </div>
                                                    </div>
                                                    {videoActuallyEnded && (
                                                        <AutoPlayCountdown
                                                            key={`countdown-${currentEpisode}`}
                                                            onComplete={playNextEpisode}
                                                        />
                                                    )}
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
                    <div className="flex items-center gap-3 text-sm md:text-base mb-4 flex-wrap">
                        <span className="bg-accent-bg text-accent border border-accent/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                            {movie.quality || 'HD'}
                        </span>
                        <span className="text-[var(--text-muted)]">{movie.year || '2024'}</span>
                        <span className="text-green-500 dark:text-green-400 font-medium">98% Match</span>
                        <span className="text-[var(--text-muted)]">{movie.original_title}</span>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-3 mb-5">
                        <button
                            onClick={handleToggleSave}
                            tabIndex={0}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all border focus-visible:ring-4 focus-visible:ring-accent focus-visible:scale-105 ${
                                isMovieSaved
                                    ? 'bg-accent-bg text-accent border-accent/30'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border-[var(--border-subtle)]'
                            }`}
                        >
                            <Heart size={16} className={isMovieSaved ? 'fill-accent text-accent' : ''} />
                            {isMovieSaved ? (t.savedMovie as string) : (t.saveMovie as string)}
                        </button>
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
                                <h3 className="text-2xl font-bold border-l-4 border-accent pl-4 whitespace-nowrap">Episodes</h3>

                                {serverNames.length > 1 && (
                                    <div className="flex flex-wrap gap-2">
                                        {serverNames.map(server => (
                                            <button
                                                key={server}
                                                tabIndex={0}
                                                onClick={() => setSelectedServer(server)}
                                                className={`px-3 py-1 text-xs font-bold rounded-full transition-all border focus-visible:ring-4 focus-visible:ring-accent focus-visible:scale-105 ${selectedServer === server
                                                    ? 'bg-accent text-white border-accent'
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

                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 sm:gap-2">
                            {visibleEpisodes.map((ep) => (
                                <button
                                    key={`${ep.number}-${selectedServer}`}
                                    tabIndex={0}
                                    onClick={() => handleEpisodeClick(ep.number)}
                                    className={`group relative py-2 rounded-lg border transition-all duration-300 focus-visible:ring-4 focus-visible:ring-accent focus-visible:scale-105 ${currentEpisode === ep.number
                                        ? 'border-accent bg-accent-bg'
                                        : 'border-transparent bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-primary)]'
                                        }`}
                                >
                                    <div className="flex items-center justify-center">
                                        <span className={`font-bold text-sm ${currentEpisode === ep.number ? 'text-accent' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                                            }`}>
                                            {ep.title && ep.title !== '0' && !ep.title.startsWith('0') && !ep.title.startsWith('Tập 0')
                                                ? ep.title
                                                : (ep.number === 0 ? (ep.title || 'Full') : ep.number)}
                                        </span>
                                    </div>
                                    {currentEpisode === ep.number && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {currentServerEpisodes.length > 20 && (
                            <button
                                onClick={() => setExpanded(!expanded)}
                                tabIndex={0}
                                className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-accent transition-colors mt-4 mx-auto p-1 rounded-lg"
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

            {/* Toast Notification */}
            {toast.visible && (
                <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                    <div className="flex items-center gap-2.5 px-5 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl backdrop-blur-xl">
                        <Bookmark size={16} className="text-accent flex-shrink-0" />
                        <p className="text-sm text-[var(--text-primary)] font-medium">{toast.message}</p>
                    </div>
                </div>
            )}
        </div>
    );
};
