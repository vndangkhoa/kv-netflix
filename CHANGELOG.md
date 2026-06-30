# Changelog

All notable changes to this project will be documented in this file.

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
