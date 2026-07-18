# Changelog

All notable changes to this project will be documented in this file.

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
