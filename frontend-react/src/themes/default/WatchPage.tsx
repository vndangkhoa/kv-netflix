import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, ChevronDown, ChevronUp, ChevronRight, SkipForward, SkipBack, X,
    Heart, Bookmark, Settings, Check, Subtitles, Upload,
    Share2, Users, AlertTriangle, Star, ArrowUp, Send, ThumbsUp, MessageSquare, Film, Play
} from 'lucide-react';
import { useWatchMovie } from '../../hooks/useWatchMovie';
import { usePiP } from '../../hooks/usePiP';
import MovieRow from '../../components/MovieRow';
import Navbar from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import type { Movie, CastMember } from '../../types';
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
const SUBTITLES_ICON = '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h4v1.5H7.5v2H10V15H6c-.55 0-1-.45-1-1v-3c0-.55.45-1 1-1zm8 0h4v1.5h-2.5v2H18V15h-4c-.55 0-1-.45-1-1v-3c0-.55.45-1 1-1z" fill="currentColor" fill-rule="evenodd"/></svg>';
const SETTINGS_ICON = '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor" fill-rule="evenodd"/></svg>';

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
            crossOrigin="anonymous"
            playsInline
            className={className}
            poster={poster}
        />
    );
};


export const WatchPage = ({ slug, episode }: { slug: string, episode: string }) => {
    const navigate = useNavigate();
    const { t } = useLang();
    const [selectedServer, setSelectedServer] = useState<string>('');
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((message: string) => {
        setToast({ message, visible: true });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => {
            setToast({ message: '', visible: false });
        }, 3500);
    }, []);

    const handleAutoSwitched = useCallback((newServer: string) => {
        setSelectedServer(newServer);
        showToast(`${t.autoSwitchFaster} ${newServer}`);
    }, [t.autoSwitchFaster, showToast]);

    const {
        movie, loading, currentEpisode, setCurrentEpisode, videoRef,
        episodeEnded, videoActuallyEnded, hasNextEpisode, hasPrevEpisode,
        playNextEpisode, dismissEndScreen,
        source,
        buffering, playerError, retryStream, levels, currentLevel, selectQuality,
        subtitles, currentSubtitle, selectSubtitle, loadCustomSubtitle, toggleSubtitles,
    } = useWatchMovie(slug, episode, selectedServer, setSelectedServer, handleAutoSwitched);
    const [expanded, setExpanded] = useState(false);
    const togglePiPRef = useRef<(() => Promise<void>) | null>(null);
    const { togglePiP } = usePiP(videoRef);
    const [playerControlsVisible, setPlayerControlsVisible] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [subtitlesOpen, setSubtitlesOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [seekFlash, setSeekFlash] = useState<{ dir: 'back' | 'forward'; ts: number } | null>(null);
    const lastTapRef = useRef<{ x: number; t: number }>({ x: 0, t: 0 });
    const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        togglePiPRef.current = togglePiP;
    }, [togglePiP]);
    const { isSaved, addToList, removeFromList } = useMyList();
    const { isAuthenticated } = useAuth();

    const movieId = movie?.id || slug;
    const isMovieSaved = isSaved(movieId);

    const [theaterMode, setTheaterMode] = useState(false);
    const [autoNext, setAutoNext] = useState(true);
    const [skipIntro, setSkipIntro] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
    const [comments, setComments] = useState([
        { id: '1', user: 'Minh Tuấn', time: '1 giờ trước', text: 'Phim xem mượt nét căng, sub chuẩn quá ad ơi! Cảm ơn KV-Netflix!', likes: 12 },
        { id: '2', user: 'Ngọc Lan', time: '3 giờ trước', text: 'Diễn viên diễn xuất đỉnh thật sự, tập này cuốn quá không dứt ra được.', likes: 8 },
        { id: '3', user: 'Hoàng Long', time: 'Hôm qua', text: 'Âm thanh hình ảnh đều chất lượng, xem trên KV-Netflix lúc nào cũng sướng nhất.', likes: 5 },
    ]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        fetch('/api/videos/home?page=1')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setRecommendedMovies(data.filter((m: Movie) => m.slug !== slug));
                }
            })
            .catch(() => {});
    }, [slug]);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleScrollTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleShare = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            showToast('Đã sao chép liên kết xem phim!');
        }
    };

    const handleReport = () => {
        showToast('Cảm ơn bạn! Báo cáo lỗi đã được gửi đến quản trị viên.');
    };

    const handleSendComment = () => {
        if (!newComment.trim()) return;
        setComments(prev => [
            {
                id: String(Date.now()),
                user: 'Bạn',
                time: 'Vừa xong',
                text: newComment.trim(),
                likes: 0
            },
            ...prev
        ]);
        setNewComment('');
        showToast('Đã đăng bình luận thành công!');
    };

    const handleLikeComment = (id: string) => {
        setComments(prev => prev.map(c => c.id === id ? { ...c, likes: c.likes + 1 } : c));
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
    const toggleSubtitlesRef = useRef<() => void>(() => {});
    const toggleSettingsRef = useRef<() => void>(() => {});
    // Latest-value refs so the DOM buttons injected into the Plyr bar never
    // capture stale episode or modal state (the Plyr init effect only re-runs when the
    // stream URL changes). Kept above the init effect that reads them.
    useEffect(() => { playNextEpisodeRef.current = playNextEpisode; });
    useEffect(() => { hasNextEpisodeRef.current = hasNextEpisode; });
    useEffect(() => {
        toggleSubtitlesRef.current = () => {
            setSubtitlesOpen(o => !o);
            setSettingsOpen(false);
        };
        toggleSettingsRef.current = () => {
            setSettingsOpen(o => !o);
            setSubtitlesOpen(false);
        };
    });

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
            controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume'],
            invertTime: false,
            seekTime: 10,
            keyboard: { focused: true, global: true },
            captions: { active: true, update: true },
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

            // Subtitles (CC) button
            if (!ctrl.querySelector('[data-kv-subtitles]')) {
                const ccBtn = document.createElement('button');
                ccBtn.className = 'plyr__controls__item plyr__control';
                ccBtn.setAttribute('data-kv-subtitles', '');
                ccBtn.setAttribute('type', 'button');
                ccBtn.setAttribute('aria-label', 'Subtitles');
                ccBtn.title = 'Subtitles (C)';
                ccBtn.innerHTML = SUBTITLES_ICON;
                ccBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleSubtitlesRef.current?.();
                });
                ctrl.appendChild(ccBtn);
            }

            // Settings button (Quality & Speed)
            if (!ctrl.querySelector('[data-kv-settings]')) {
                const settingsBtn = document.createElement('button');
                settingsBtn.className = 'plyr__controls__item plyr__control';
                settingsBtn.setAttribute('data-kv-settings', '');
                settingsBtn.setAttribute('type', 'button');
                settingsBtn.setAttribute('aria-label', 'Settings');
                settingsBtn.title = 'Settings';
                settingsBtn.innerHTML = SETTINGS_ICON;
                settingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleSettingsRef.current?.();
                });
                ctrl.appendChild(settingsBtn);
            }

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
        const onControlsHide = () => { setPlayerControlsVisible(false); setSettingsOpen(false); setSubtitlesOpen(false); };
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

    // Highlight CC button in Plyr bar when subtitles are active
    // Highlight CC button in Plyr bar when subtitles are active or open
    useEffect(() => {
        const ccBtn = document.querySelector<HTMLElement>('.plyr__controls [data-kv-subtitles]');
        if (ccBtn) {
            const isActive = currentSubtitle !== -1;
            ccBtn.style.color = (isActive || subtitlesOpen) ? 'var(--accent)' : '';
            ccBtn.style.filter = (isActive || subtitlesOpen) ? 'drop-shadow(0 0 6px var(--accent))' : '';
        }
    }, [currentSubtitle, subtitlesOpen]);

    // Highlight Settings button in Plyr bar when settings menu is open
    useEffect(() => {
        const setBtn = document.querySelector<HTMLElement>('.plyr__controls [data-kv-settings]');
        if (setBtn) {
            setBtn.style.color = settingsOpen ? 'var(--accent)' : '';
            setBtn.style.filter = settingsOpen ? 'drop-shadow(0 0 6px var(--accent))' : '';
        }
    }, [settingsOpen]);

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

    // Keyboard shortcut: 'c' to toggle subtitles
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            if (e.key === 'c' || e.key === 'C') {
                e.preventDefault();
                toggleSubtitles();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleSubtitles]);

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
        return server.includes('KKPhim') || server.includes('VSMOV') || server.includes('OPhim');
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

    const visibleEpisodes = expanded ? currentServerEpisodes : currentServerEpisodes.slice(0, 30);

    const nextEp = hasNextEpisode
        ? currentServerEpisodes.find(e => e.number === currentEpisode + 1)
        : null;
    const prevEp = hasPrevEpisode
        ? currentServerEpisodes.find(e => e.number === currentEpisode - 1)
        : null;

    const castMembers: CastMember[] = (movie.castDetails && movie.castDetails.length > 0)
        ? movie.castDetails
        : (Array.isArray(movie.cast)
            ? movie.cast.map(c => ({ name: c, slug: c }))
            : (typeof movie.cast === 'string'
                ? (movie.cast as string).split(',').map(s => s.trim()).filter(Boolean).map(c => ({ name: c, slug: c }))
                : []));

    return (
        <div className="min-h-screen bg-[#191b24] text-gray-100 font-sans selection:bg-[#ffd875]/30 flex flex-col transition-colors duration-300">
            {/* Top RoPhim Header */}
            <Navbar />

            <div className={`flex-1 pt-14 ${theaterMode ? 'w-full px-0' : 'max-w-7xl mx-auto px-4 md:px-6 w-full'}`}>
                {/* Breadcrumb / Back Link */}
                <div className={`py-2.5 sm:py-3 flex items-center justify-between gap-3 ${theaterMode ? 'max-w-7xl mx-auto px-4' : ''}`}>
                    <Link
                        to={`/phim/${movie.slug}`}
                        className="flex items-center gap-1.5 sm:gap-2 text-sm md:text-base font-semibold text-gray-300 hover:text-[#ffd875] transition-colors group min-w-0"
                    >
                        <ArrowLeft className="w-4 h-4 text-[#ffd875] group-hover:-translate-x-1 transition-transform shrink-0" />
                        <span className="truncate">Xem phim <strong className="text-white">{movie.title}</strong></span>
                    </Link>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="bg-[#202331] text-[11px] sm:text-xs text-gray-300 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium border border-white/5">
                            {movie.quality || 'FHD'}
                        </span>
                        <span className="bg-[#202331] text-[11px] sm:text-xs text-[#ffd875] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium border border-[#ffd875]/20">
                            {movie.year || '2025'}
                        </span>
                    </div>
                </div>

                {/* 1. Cinema Player Section */}
                <div
                    ref={playerContainerRef}
                    className={`bg-black relative shadow-2xl overflow-hidden transition-all duration-300 ${
                        theaterMode
                            ? 'w-full h-[65vh] md:h-[85vh] z-40 rounded-none'
                            : 'w-full aspect-video max-h-[75vh] rounded-xl border border-white/10'
                    }`}
                >
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
                        (rawStreamUrl && (rawStreamUrl.includes('embed.php') || rawStreamUrl.includes('streamc.xyz/embed') || rawStreamUrl.includes('/embed/') || rawStreamUrl.includes('vidlink.pro') || rawStreamUrl.includes('vidsrc') || rawStreamUrl.includes('autoembed')));

                    return (
                        <>
                            <div className="absolute inset-0">
                                {isEmbedStream ? (
                                    <>
                                        <iframe
                                            src={rawStreamUrl}
                                            className="w-full h-full border-0"
                                            allowFullScreen
                                            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
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
                                                setSubtitlesOpen(false);
                                                retryStream();
                                            }}
                                            className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-full text-sm font-bold transition-colors shadow-[0_0_20px_var(--accent-glow-soft)]"
                                        >
                                            Retry stream
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* Subtitles & Settings Dropdown Menus (Accessible on both Desktop & Mobile via Plyr control bar) */}
                            {!source?.isEmbed && !String(source?.stream_url || '').includes('embed') && !episodeEnded && (
                                <>
                                    {/* Subtitles Dropdown Menu (Accessible on both Desktop & Mobile) */}
                                    {subtitlesOpen && (
                                        <div className="absolute bottom-16 md:bottom-20 right-3 md:right-8 w-64 glass-panel bg-[var(--bg-secondary)]/95 backdrop-blur-xl rounded-2xl border border-[var(--border-primary)] shadow-2xl p-2 animate-fade-in z-50">
                                            <div className="flex items-center justify-between px-3 pt-2 pb-1 border-b border-[var(--border-subtle)] mb-1">
                                                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{t.subtitles}</span>
                                                <span className="text-[10px] text-[var(--text-dim)] font-mono">Phím 'C'</span>
                                            </div>

                                            <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
                                                {/* Off option */}
                                                <button
                                                    onClick={() => {
                                                        selectSubtitle(-1);
                                                    }}
                                                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-[var(--bg-elevated)] transition-colors text-left"
                                                >
                                                    <span className={currentSubtitle === -1 ? 'text-accent font-semibold' : 'text-[var(--text-secondary)]'}>
                                                        {t.subtitlesOff}
                                                    </span>
                                                    {currentSubtitle === -1 && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
                                                </button>

                                                {/* Subtitle tracks */}
                                                {subtitles.map(sub => {
                                                    const isVN = sub.lang.toLowerCase().startsWith('vi') || sub.name.toLowerCase().includes('việt') || sub.name.toLowerCase().includes('viet') || sub.name.toLowerCase().includes('vn');
                                                    const isEN = sub.lang.toLowerCase().startsWith('en') || sub.name.toLowerCase().includes('eng');
                                                    const displayName = isVN ? t.subtitlesVN : isEN ? t.subtitlesEN : sub.name;

                                                    return (
                                                        <button
                                                            key={sub.id}
                                                            onClick={() => selectSubtitle(sub.id)}
                                                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm hover:bg-[var(--bg-elevated)] transition-colors text-left"
                                                        >
                                                            <div className="flex flex-col min-w-0 pr-2">
                                                                <span className={`truncate ${currentSubtitle === sub.id ? 'text-accent font-semibold' : 'text-[var(--text-secondary)]'}`}>
                                                                    {displayName}
                                                                </span>
                                                                {sub.isCustom && (
                                                                    <span className="text-[10px] text-[var(--text-dim)]">File người dùng tải lên</span>
                                                                )}
                                                            </div>
                                                            {currentSubtitle === sub.id && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
                                                        </button>
                                                    );
                                                })}

                                                {subtitles.length === 0 && (
                                                    <div className="px-3 py-2 text-xs text-[var(--text-muted)] italic">
                                                        {t.noSubtitlesFound}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Subtitle Actions: Upload */}
                                            <div className="pt-2 mt-1 border-t border-[var(--border-subtle)] space-y-1">
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".vtt,.srt"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const ok = await loadCustomSubtitle(file);
                                                            if (ok) {
                                                                showToast(t.subtitleLoaded as string);
                                                            }
                                                            if (fileInputRef.current) {
                                                                fileInputRef.current.value = '';
                                                            }
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                                                >
                                                    <Upload className="w-4 h-4 text-accent" />
                                                    <span>{t.uploadSubtitle}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Settings Dropdown Menu (Accessible on both Desktop & Mobile) */}
                                    {settingsOpen && (
                                        <div className="absolute bottom-16 md:bottom-20 right-3 md:right-8 w-52 glass-panel bg-[var(--bg-secondary)]/95 backdrop-blur-xl rounded-2xl border border-[var(--border-primary)] shadow-2xl p-2 animate-fade-in z-50">
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

            {/* Player Toolbar directly beneath player */}
            <div className="relative my-3">
                <div className={`py-2 px-2.5 sm:px-3 bg-[#202331] rounded-xl border border-white/5 flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none text-xs touch-pan-x ${
                    theaterMode ? 'max-w-7xl mx-auto' : ''
                }`}>
                    {/* Left / Main button group */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        {/* Yêu thích (deduplicated) */}
                        <button
                            onClick={handleToggleSave}
                            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all border shrink-0 ${
                                isMovieSaved
                                    ? 'bg-[#ffd875]/15 text-[#ffd875] border-[#ffd875]/40 shadow-sm shadow-[#ffd875]/10'
                                    : 'bg-[#282b3a] text-gray-300 border-white/5 hover:bg-[#323649] hover:text-white'
                            }`}
                        >
                            <Heart className={`w-3.5 h-3.5 ${isMovieSaved ? 'fill-current text-[#ffd875]' : ''}`} />
                            <span>{isMovieSaved ? 'Đã thích' : 'Yêu thích'}</span>
                        </button>

                        {/* Tự chuyển tập */}
                        <button
                            onClick={() => {
                                setAutoNext(v => !v);
                                showToast(`Tự chuyển tập: ${!autoNext ? 'BẬT' : 'TẮT'}`);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all border shrink-0 ${
                                autoNext
                                    ? 'bg-[#ffd875]/10 text-[#ffd875] border-[#ffd875]/30'
                                    : 'bg-[#282b3a] text-gray-400 border-white/5 hover:bg-[#323649]'
                            }`}
                        >
                            <SkipForward className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Chuyển tập: <strong>{autoNext ? 'BẬT' : 'TẮT'}</strong></span>
                            <span className="sm:hidden">Tự chuyển</span>
                            <span className={`sm:hidden w-1.5 h-1.5 rounded-full ${autoNext ? 'bg-[#ffd875]' : 'bg-gray-500'}`} />
                        </button>

                        {/* Bỏ qua intro */}
                        <button
                            onClick={() => {
                                setSkipIntro(v => !v);
                                showToast(`Bỏ qua giới thiệu: ${!skipIntro ? 'BẬT' : 'TẮT'}`);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all border shrink-0 ${
                                skipIntro
                                    ? 'bg-[#ffd875]/10 text-[#ffd875] border-[#ffd875]/30'
                                    : 'bg-[#282b3a] text-gray-400 border-white/5 hover:bg-[#323649]'
                            }`}
                        >
                            <Play className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Bỏ qua intro: <strong>{skipIntro ? 'BẬT' : 'TẮT'}</strong></span>
                            <span className="sm:hidden">Bỏ intro</span>
                            <span className={`sm:hidden w-1.5 h-1.5 rounded-full ${skipIntro ? 'bg-[#ffd875]' : 'bg-gray-500'}`} />
                        </button>

                        {/* Rạp phim (hidden on small mobile screens where viewport is already 100% width) */}
                        <button
                            onClick={() => {
                                setTheaterMode(v => !v);
                                showToast(`Chế độ rạp phim: ${!theaterMode ? 'BẬT' : 'TẮT'}`);
                            }}
                            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all border shrink-0 ${
                                theaterMode
                                    ? 'bg-[#ffd875]/10 text-[#ffd875] border-[#ffd875]/30'
                                    : 'bg-[#282b3a] text-gray-400 border-white/5 hover:bg-[#323649]'
                            }`}
                        >
                            <Film className="w-3.5 h-3.5" />
                            <span>Rạp phim: <strong>{theaterMode ? 'BẬT' : 'TẮT'}</strong></span>
                        </button>

                        {/* Chia sẻ */}
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium whitespace-nowrap bg-[#282b3a] text-gray-300 border border-white/5 hover:bg-[#323649] hover:text-white transition-all shrink-0"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Chia sẻ</span>
                        </button>

                        {/* Xem chung */}
                        <button
                            onClick={() => showToast('Tính năng Xem chung sắp ra mắt!')}
                            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium whitespace-nowrap bg-[#282b3a] text-gray-300 border border-white/5 hover:bg-[#323649] hover:text-white transition-all shrink-0"
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>Xem chung</span>
                        </button>
                    </div>

                    {/* Right button group */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-2">
                        <button
                            onClick={handleReport}
                            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all shrink-0"
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Báo lỗi</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Main 2-Column Section */}
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 my-4 sm:my-6 ${theaterMode ? 'max-w-7xl mx-auto px-4' : ''}`}>
                {/* Left Column: 8 cols (Episodes, Movie summary, Comments) */}
                <div className="lg:col-span-8 space-y-4 sm:space-y-6">
                    {/* Mini summary box */}
                    <div className="bg-[#202331] rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/5 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{movie.title}</h1>
                                {movie.original_title && (
                                    <p className="text-sm text-gray-400 font-medium italic mt-0.5">{movie.original_title}</p>
                                )}
                            </div>
                            <Link
                                to={`/phim/${movie.slug}`}
                                className="flex-shrink-0 flex items-center gap-1 text-xs text-[#ffd875] hover:underline font-semibold bg-[#ffd875]/10 px-3 py-1.5 rounded-lg border border-[#ffd875]/20"
                            >
                                <span>Thông tin phim</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed font-light">
                            {movie.description?.replace(/<[^>]*>?/gm, '') || 'Đang cập nhật nội dung...'}
                        </p>
                    </div>

                    {/* Server / Audio Switcher */}
                    {serverNames.length > 1 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mr-1">Server:</span>
                            {serverNames.map(server => (
                                <button
                                    key={server}
                                    onClick={() => setSelectedServer(server)}
                                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                                        activeServer === server
                                            ? 'bg-[#ffd875] text-[#191b24] border-[#ffd875] shadow-md font-bold'
                                            : 'bg-[#282b3a] text-gray-300 border-white/10 hover:bg-[#323649]'
                                    }`}
                                >
                                    {server}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Episodes Grid */}
                    {currentServerEpisodes.length > 0 && (
                        <div className="bg-[#202331] rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/5 space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-[#ffd875] rounded-full inline-block"></span>
                                    Danh sách tập
                                </h3>
                                <span className="text-xs text-gray-400 bg-[#282b3a] px-2.5 py-1 rounded-full border border-white/5">
                                    {currentServerEpisodes.length} tập
                                </span>
                            </div>

                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                                {visibleEpisodes.map((ep) => {
                                    const isCurrent = currentEpisode === ep.number;
                                    return (
                                        <button
                                            key={`${ep.number}-${selectedServer}`}
                                            onClick={() => handleEpisodeClick(ep.number)}
                                            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 border text-center ${
                                                isCurrent
                                                    ? 'bg-[#ffd875] text-[#191b24] border-[#ffd875] font-bold shadow-md shadow-[#ffd875]/20 scale-105'
                                                    : 'bg-[#282b3a] text-gray-300 border-white/5 hover:bg-[#323649] hover:text-white'
                                            }`}
                                        >
                                            {ep.title && ep.title !== '0' && !ep.title.startsWith('0') && !ep.title.startsWith('Tập 0')
                                                ? ep.title
                                                : (ep.number === 0 ? (ep.title || 'Full') : `Tập ${ep.number}`)}
                                        </button>
                                    );
                                })}
                            </div>

                            {currentServerEpisodes.length > 30 && (
                                <button
                                    onClick={() => setExpanded(!expanded)}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-[#ffd875] hover:underline mx-auto pt-2"
                                >
                                    {expanded ? (
                                        <>Thu gọn <ChevronUp className="w-4 h-4" /></>
                                    ) : (
                                        <>Xem tất cả {currentServerEpisodes.length} tập <ChevronDown className="w-4 h-4" /></>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Comments Section */}
                    <div className="bg-[#202331] rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/5 space-y-4 sm:space-y-5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-[#ffd875]" />
                                <h3 className="text-base md:text-lg font-bold text-white">Bình luận ({comments.length})</h3>
                            </div>
                            <span className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer">
                                Nội quy bình luận
                            </span>
                        </div>

                        {/* Comment input form */}
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-sm text-[#191b24] flex-shrink-0 shadow-md">
                                U
                            </div>
                            <div className="flex-1 space-y-2">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Viết bình luận của bạn..."
                                    className="w-full bg-[#191b24] rounded-xl p-3 text-sm text-gray-200 border border-white/10 focus:border-[#ffd875] focus:outline-none transition-all placeholder:text-gray-500 resize-none h-20"
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSendComment}
                                        disabled={!newComment.trim()}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-[#ffd875] hover:bg-[#e6c15c] text-[#191b24] font-bold text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Gửi bình luận</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Comments list */}
                        <div className="space-y-4 pt-2">
                            {comments.map((c) => (
                                <div key={c.id} className="flex gap-3 text-xs border-b border-white/5 pb-4 last:border-0 last:pb-0">
                                    <div className="w-9 h-9 rounded-full bg-[#282b3a] border border-white/10 flex items-center justify-center font-bold text-white flex-shrink-0">
                                        {c.user.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-sm">{c.user}</span>
                                            <span className="text-[10px] bg-[#ffd875]/20 text-[#ffd875] px-1.5 py-0.5 rounded font-semibold">Thành viên</span>
                                            <span className="text-gray-500 text-[11px]">{c.time}</span>
                                        </div>
                                        <p className="text-gray-300 leading-relaxed">{c.text}</p>
                                        <div className="flex items-center gap-4 pt-1 text-gray-400">
                                            <button
                                                onClick={() => handleLikeComment(c.id)}
                                                className="flex items-center gap-1 hover:text-[#ffd875] transition-colors"
                                            >
                                                <ThumbsUp className="w-3.5 h-3.5" />
                                                <span>{c.likes > 0 ? c.likes : 'Thích'}</span>
                                            </button>
                                            <button className="hover:text-white transition-colors">
                                                Trả lời
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: 4 cols (Rating, Cast, Recommendations) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Rating box */}
                    <div className="bg-[#202331] rounded-2xl p-5 border border-white/5 space-y-3">
                        <h4 className="text-xs uppercase tracking-wider text-gray-400 font-bold">Đánh giá phim</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-[#ffd875]">{movie.rating || '9.8'}</span>
                            <span className="text-xs text-gray-400">/ 10</span>
                            <div className="flex items-center text-[#ffd875] ml-auto">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <Star key={i} className="w-4 h-4 fill-current" />
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-gray-400">Dựa trên 4,520 lượt đánh giá</p>
                    </div>

                    {/* Cast (Diễn viên) */}
                    {castMembers.length > 0 && (
                        <div className="bg-[#202331] rounded-2xl p-5 border border-white/5 space-y-4">
                            <h4 className="text-xs uppercase tracking-wider text-gray-400 font-bold">Diễn viên</h4>
                            <div className="grid grid-cols-3 gap-3">
                                {castMembers.slice(0, 6).map((actor, idx) => {
                                    const actorSlug = actor.slug || actor.name.trim();
                                    return (
                                        <Link
                                            key={idx}
                                            to={`/dien-vien/${encodeURIComponent(actorSlug)}`}
                                            className="flex flex-col items-center text-center group cursor-pointer"
                                        >
                                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#ffd875] transition-all mb-2 bg-[#282b3a] flex items-center justify-center relative shadow-md">
                                                {actor.avatar ? (
                                                    <img
                                                        src={getProxyUrl(actor.avatar, 150)}
                                                        alt={actor.name}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                ) : null}
                                                <span className="text-sm font-bold text-gray-300 group-hover:text-[#ffd875] absolute -z-0">
                                                    {actor.name.trim().charAt(0)}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-300 font-medium line-clamp-2 group-hover:text-[#ffd875] transition-colors leading-tight">
                                                {actor.name.trim()}
                                            </span>
                                            {actor.character && (
                                                <span className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                                                    {actor.character}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recommendations (Đề xuất cho bạn) */}
                    {recommendedMovies.length > 0 && (
                        <div className="bg-[#202331] rounded-2xl p-5 border border-white/5 space-y-4">
                            <h4 className="text-xs uppercase tracking-wider text-gray-400 font-bold">Đề xuất cho bạn</h4>
                            <div className="space-y-3">
                                {recommendedMovies.slice(0, 6).map((rec) => (
                                    <Link
                                        key={rec.id || rec.slug}
                                        to={`/phim/${rec.slug}`}
                                        className="flex items-center gap-3 group rounded-xl p-2 hover:bg-white/5 transition-all"
                                    >
                                        <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-[#191b24] relative">
                                            <img
                                                src={getProxyUrl(rec.thumbnail || rec.backdrop, 160)}
                                                alt={rec.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <h5 className="text-xs font-bold text-gray-200 group-hover:text-[#ffd875] transition-colors line-clamp-2 leading-snug">
                                                {rec.title}
                                            </h5>
                                            <p className="text-[11px] text-gray-400 truncate">
                                                {rec.original_title || rec.year}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-[#ffd875]/20 text-[#ffd875] px-1.5 py-0.5 rounded font-bold">
                                                    {rec.quality || 'HD'}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    {rec.year || '2025'}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Related Row */}
            <div className={`space-y-8 pt-8 border-t border-white/5 my-8 ${theaterMode ? 'max-w-7xl mx-auto px-4' : ''}`}>
                <MovieRow title="Có thể bạn sẽ thích" category={movie.category || 'phim-le'} limit={10} key={`related-${movie.slug}`} />
            </div>
        </div>

        {/* Scroll to top floating button */}
        {showScrollTop && (
            <button
                onClick={handleScrollTop}
                className="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-4 py-2.5 bg-[#202331]/95 hover:bg-[#ffd875] hover:text-[#191b24] text-white rounded-full border border-white/10 shadow-2xl backdrop-blur-md transition-all text-xs font-bold"
                aria-label="Đầu trang"
            >
                <ArrowUp className="w-4 h-4" />
                <span className="hidden sm:inline">ĐẦU TRANG</span>
            </button>
        )}

        {/* Toast Notification */}
        {toast.visible && (
            <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                <div className="flex items-center gap-2.5 px-5 py-3 bg-[#202331] border border-[#ffd875]/30 text-white rounded-2xl shadow-2xl backdrop-blur-xl">
                    <Bookmark size={16} className="text-[#ffd875] flex-shrink-0" />
                    <p className="text-sm font-medium">{toast.message}</p>
                </div>
            </div>
        )}

        {/* RoPhim Footer */}
        <Footer />
    </div>
);
};
