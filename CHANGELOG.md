# Changelog

All notable changes to this project will be documented in this file.

## [v9.2.7] - 2026-09-11
### Changed
- **Desktop Player UI Optimization**:
  - Removed redundant floating mobile buttons (`[|<] [>|]` skip buttons and floating volume/settings buttons) on desktop viewports (`md:hidden`).
  - Integrated native volume control slider (`'mute'`, `'volume'`) directly into Plyr's bottom control bar.
  - Injected Subtitles (`CC`) and Settings (`Gauge`) buttons into Plyr's bottom control bar on desktop, matching Netflix/YouTube player layout.
  - Decoupled Subtitles and Quality/Speed settings popup menus to anchor cleanly above the bottom control bar on both desktop and mobile.

### Fixed
- **Missing Thumbnails & Placeholder Lock**:
  - Fixed race condition in `MovieCard.tsx` where duplicate movies across rows (e.g. "Mới Cập Nhật" and "Top Phim Bộ") caused `isAlreadyCached` state transitions to disconnect the `IntersectionObserver` before `isVisible` was set, permanently trapping cards in the error placeholder state.
  - Replaced error placeholder with an animated skeleton loader while images are downloading.
  - Implemented 4-tier image fallback cascade: proxy primary -> direct primary -> proxy secondary (backdrop) -> direct secondary, before showing error state.
  - Added `referrerPolicy="no-referrer"` to `<img>` tags to prevent cross-origin referrer CDN blocks.
  - Made movie keys unique per row in `MovieRow.tsx` (`${rowId || title}-${movie.id || movie.slug || movie.title}`).
  - Increased backend image service timeout to 15s, raised connection pool limits (`MaxIdleConns: 100`, `MaxConnsPerHost: 50`), and added upstream `Referer` headers to proxy requests.

## [v9.2.6] - 2026-09-11
### Added
- **Closed Captions (CC) & Multi-Language Subtitles**:
  - Dedicated Subtitles / CC button added to player control bar with active track highlight.
  - Interactive subtitle selection popup menu displaying all available stream subtitle tracks (Vietnamese, English, etc.) and an "Off" toggle.
  - **Vietnamese Default Preference**:
    - Automatically activates Vietnamese subtitle tracks (`vi`, `vie`, `Tiếng Việt`) by default whenever available in the stream manifest.
    - Remembers user's preferred subtitle selection across movies and episodes via `localStorage`.
  - **External Subtitle Upload (.srt / .vtt)**:
    - User can upload custom `.srt` or `.vtt` files directly in the player.
    - Automatic client-side SRT to WebVTT format conversion with normalized timestamp timing.
  - **Keyboard Shortcut**:
    - Press `c` or `C` to quickly toggle subtitles on/off during video playback.
- **Enhanced Subtitle Typography & Styling**:
  - Crisp readability with semi-transparent background (`rgba(0, 0, 0, 0.78)`), high-contrast white text, subtle text drop-shadow, and responsive font sizing for both Plyr captions and native HTML5 video cues (`::cue`).

## [v9.2.5] - 2026-09-11
### Added
- **VSMOV Direct 4K/HD Streaming Provider**:
  - Integrated high-speed video provider (`https://vsmov.com/api`) delivering direct master HLS (`.m3u8`) playlists with open CORS and real video chunks.
  - Mitigates peak evening hours (7–9 PM) slowdowns caused by dead mirrors and congested single-provider CDNs.
- **Concurrent Stream Latency Probing**:
  - Web player concurrently probes all available server streams in parallel using byte-range manifest requests (`bytes=0-127`) and `performance.now()`.
  - Automatically selects the fastest responding source when no server is manually pinned.
- **Automatic Buffering Stall & Network Failover**:
  - Added continuous buffer stall monitoring (`onWaiting` > 6s) and fatal HLS network error failover.
  - Automatically saves current playback position (`currentTime`), switches to the alternative server candidate, and seamlessly resumes playback without user interruption.
- **Auto-Switch Notification**:
  - Toast alert notifies users when the player switches to a faster stream (`Đang tự động chuyển sang nguồn phát nhanh hơn: [Tên Server]`).

### Optimized
- **Backend Proxy Connection Pooling**:
  - Configured HTTP transport pooling (`MaxIdleConns: 100`, `MaxIdleConnsPerHost: 20`, `IdleConnTimeout: 90s`) to eliminate repeated TCP+TLS handshake latency on streaming segments.
- **Browser Segment Caching**:
  - Enabled 24-hour browser caching (`Cache-Control: public, max-age=86400, stale-while-revalidate=3600`) for immutable video chunks (`.ts`, `.m4s`, `.mp4`).
- **Player HLS Buffering Cushion**:
  - Increased `maxBufferLength` to 60s and `maxMaxBufferLength` to 120s to absorb peak-hour network jitter, and lowered fragment timeout to 12s.
- **Scraper Timeout Resilience**:
  - Lowered Ophim mirror timeout from 30s to 5s so dead external mirrors fail fast without delaying aggregation.

---

## [v9.2.4] - 2026-09-07
### Fixed
- **Authentication & Registration**:
  - Fixed 500 runtime panics (`nil.(uint)`) on all authenticated routes (`/account/*`, `/sync/*`, `/videos/explore`) by correcting request context key handling between middleware and handlers.
  - Normalized email addresses (trimming and lowercasing) across registration and login to prevent casing/whitespace authentication errors.
  - Added email format validation and username fallback on registration.
- **Device Pairing (Pair Code)**:
  - Added expired code cleanup and collision handling for 6-digit device pairing codes.
  - Populated complete user claims (UserID + Email) in JWT tokens generated during device pairing.
  - Added live status polling (every 2s) in web `DevicePairPage` so web UI updates immediately upon successful device connection.
  - Supported two-way pairing on web: generating link codes for other devices and entering TV/device codes.
- **Latest Movies Sorting**:
  - Ensured backend API (`/videos/home`, `/videos/search`) and frontend views (`HomeContent`, `MovieRow`, `ChartColumns`, explore, and search suggestions) always sort and show latest movies first by release year descending.

### Removed
- Removed login promo banner from the home page.

---

## [v9.2.3] - 2026-08-24
### Fixed
- **Android app: saved movies disappearing from My List**: login triggered two concurrent remote syncs, and a sync response that was requested *before* a save but returned *after* it overwrote the local list with the stale server snapshot — wiping freshly saved movies from the UI (they reappeared only after an app restart). Syncs are now serialized against save/remove/history mutations and merge local + remote lists instead of blind overwrite.
- Removed redundant duplicate `syncWithRemote()` calls on login/registration (MainActivity's auth collector already runs one).

---

## [v9.2.2] - 2026-08-24
### Fixed
- **Android app crash on "Check for Update"**: R8 minification (v9.2.1) obfuscated the release-parsing models (`ReleaseInfo`/`ReleaseAsset` live in `data.api`, not `data.model`), making Moshi's reflective adapter throw uncatchable `Error`s on tap. Added a `@JsonClass` ProGuard keep rule and `Throwable` guards so update-check failures now show an error state instead of crashing.
- **APK install**: on Android 8+ the installer silently no-oped without the "Install unknown apps" permission; users are now routed to grant it, then can retry.
- **Watch screen**: removed a force-unwrap (`uiState.source!!`) that could NPE if player state flipped between null check and use.
- **Update download**: survives configuration changes (ViewModel now lifecycle-scoped); guarded package-info lookup and unavailable external storage.

### Changed
- Removed unused duplicate GitHub API client (`data/api/GitHubApi.kt`).

---

## [v9.2.1] - 2026-08-23
### Fixed
- **Android app performance**: parallel category page loading for Phim Lẻ / Phim Bộ (was 10 sequential requests), stream playback no longer blocked by recommendations fetch, HTTP body logging disabled in release builds, added OkHttp response cache.
- **ExoPlayer**: fixed listener leak on episode/server changes and broken retry path for progressive (non-HLS) streams; failed streams now fall back to WebView embed cleanly.
- **Backend stream proxy**: dead CDN 404 pages are passed through untouched instead of being rewritten into broken HLS playlists; video segments stream via `io.Copy` instead of full in-memory buffering; `Range` passthrough verified.
- **Backend movie detail**: provider lookups and cross-provider metadata merge now run in parallel.

### Changed
- Release APK is now minified with R8 + resource shrinking: **17.2 MB → 3.3 MB** (much faster download & install).
- In-app update downloads throttle progress UI updates and use a larger copy buffer.

---

## [v9.2.0] - 2026-07-18
### Added
- **Android Mobile App** (`android-app/`): native Jetpack Compose client for Android phones and tablets.
  - Browse Home, Movies, Series, Animation, and TV Shows with a server-personalized Explore feed.
  - Inline search with live suggestions and multi-server ExoPlayer playback with resume-from-progress.
  - My List (saved movies), watch History, and server-side sync of saved movies & watch progress.
  - Account tools: change password, account recovery key, device pairing, and connected-device management.
  - Vietnamese / English language switcher and dark / light theming.

---

## [v9.1.0] - 2026-07-18
### Added
- Integrated **Plyr** (v3.8.4) as the video player library, replacing native `<video>` controls for a consistent playback UI.
- Added **Picture-in-Picture (PiP)** support via `usePiP` hook, with a dedicated button in the Plyr controls toolbar and iOS WebKit fallback for mobile Safari.
- Added CSS gradient overlay on Plyr controls and proper video aspect ratio containment.

### Changed
- Plyr instance now persists across episode changes; only HLS.js re-initializes, eliminating re-mount flicker.
- Moved PiP toggle from an absolute-positioned overlay button into Plyr's native toolbar.

### Fixed
- Eliminated iOS native fullscreen button overlap with the back-to-menu button by using Plyr's custom controls DOM.

---

## [v9.0.0] - 2026-07-17
### Added
- Built a keyboard-driven Terminal User Interface (TUI) client in Go using Bubble Tea and Lip Gloss.
  - Supports movie browsing, search, detail view, personal watch list, and user authentication/device pairing.
  - Integrates direct video playback within kitty-compatible terminals (Terminal VO) or via external mpv GPU windows (Window VO).
  - Includes local configuration storage for saving server URLs, preferred video output options, and authentication state.
- Added cross-platform release build system (`tui/Makefile`) and automated installer (`tui/install.sh`) supporting Linux, macOS, and Windows on both AMD64 and ARM64 architectures.
- Added startup dependency checker to verify that the required runtimes (`mpv` and `yt-dlp`) are installed.
- Integrated `yt-dlp` into the project Dockerfile to support background stream extraction and playback capabilities.

### Changed
- Configured mpv playback to default to the standalone GPU window (`--vo=window`) for smoother hardware-accelerated rendering.
- Bypassed broken backend CORS proxies in the TUI client by passing HLS stream URLs directly to mpv using the `--ytdl=yes` flag.
- Set a default 60-second HTTP timeout in the TUI client to prevent application hangs during slow backend operations.

### Fixed
- Fixed HLS manifest parser in backend API handlers to resolve relative stream URLs correctly.

---

## [v8.0.0] - 2026-06-30
### Added
- Created a global responsive navigation and shell structure (`Layout.tsx`) for fluid screen resizing.
- Added a sticky bottom tab bar for compact, mobile-friendly navigation on screens smaller than `1024px`.
- Built customizable Crimson Red color tokens (`#e50914`) in Tailwind CSS v4 configurations.

### Changed
- Overhauled page layouts, headers, buttons, progress bars, and tab panels to align with a cohesive cinematic Crimson Red theme.
- Revamped the homepage Hero carousel to display full-bleed high-resolution backdrops with dark top/bottom gradient overlays.
- Set movie row sliders to adapt card dimensions dynamically from mobile (`115px`) up to desktop (`215px`).
- Integrated transparent-to-solid transitions for navigation bars on scroll.
- Centered the main account settings dashboard and content pages on wide viewports.
- Rebranded SVG logos (`favicon.svg`, `icon.svg`, and `mask-icon.svg`) to use Crimson Red gradients instead of the legacy cyan colors.
- Renamed the Vietnamese translation for the Heart tab from `"Danh sách của tôi"` to `"Của tôi"` for a cleaner layout.
- Brightened top navigation link text to improve legibility on transparent dark backgrounds.

### Fixed
- Fixed Safari/Webkit console errors by replacing HTML `playsinline` attributes with camelCased React properties (`playsInline`).
- Fixed multiple TypeScript build issues (unused imports, missing types, interface descriptions).
- Verified production build compile succeeds with zero warnings.

---

## [v7.0.0] - 2026-06-15
### Added
- User registration, login, and secure JWT authentication.
- Device pairing via 6-digit code polling.
- Account recovery keys and password reset.
- Save list & watch progress synchronization.
- Vietnamese/English translations switcher in the Navbar.
- Light/Dark mode auto-detection and persistence.
- Recommendation algorithm based on user genre preferences.

---

## [v6.0.0] - 2026-05-20
### Added
- Progress tracking save loops.
- Continue watching lists with dynamic progress bars.
- Multi-server backup streams.
- Alpine-based Docker multi-stage configuration optimized for Synology NAS.
