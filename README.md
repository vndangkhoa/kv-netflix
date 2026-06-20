# kv-netflix V7

A high-performance video streaming web application with a pure Go backend and modern React + Tailwind frontend.

## Features

- **Modern UI** - React 19, TypeScript, Vite 7, Tailwind CSS 4
- **Dark/Light Theme** - Auto-detection with manual toggle, CSS custom properties
- **User Accounts** - Register, login, device pairing with 6-digit codes
- **Device Sync** - Saved movies & watch history synced across devices
- **Account Recovery** - Recovery key-based password reset
- **i18n** - Vietnamese & English language support
- **High Performance** - Go backend with concurrent API fetching
- **Smart Scraping** - Multi-provider support (Ophim, PhimMoiChill)
- **HLS Streaming** - Native HLS playback with proxy support
- **Episode Progress Tracking** - Auto-save progress, continue watching with seek
- **Explore Recommendations** - Movies based on your watch history
- **Image Optimization** - Backend proxy with resize, in-memory + disk cache, blur-up placeholders
- **Android TV** - Native TV app with D-pad controls and 10s skip
- **PWA Support** - Install as a progressive web app
- **Docker Ready** - Multi-stage build for Synology NAS (linux/amd64)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Go 1.25, Chi Router, GORM, SQLite |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Auth | bcrypt + JWT (30-day tokens), device pairing codes |
| Mobile | Android TV (Kotlin + Jetpack Compose) |
| Deployment | Docker multi-stage build |

## Quick Start

### Docker (Recommended for Synology NAS)

**Prerequisites:**
- Synology NAS with Container Manager (Docker) installed
- SSH access enabled (optional, for CLI) or use Container Manager GUI

**Option 1: Container Manager GUI (Recommended for Synology)**

1. Open **Container Manager** on your Synology NAS
2. Go to **Registry** tab and add your Forgejo registry:
   - Registry URL: `git.khoavo.myds.me`
   - Username: `vndangkhoa`
   - Password: `Thieugia19`
3. Search for `vndangkhoa/kv-netflix` and download `v7` tag
4. Create a new container:
   - **Image**: `git.khoavo.myds.me/vndangkhoa/kv-netflix:v7`
   - **Container name**: `streamflow`
   - **Network**: Bridge mode, map port `3478` (local) → `8000` (container)
   - **Environment**: Add `TZ=Asia/Ho_Chi_Minh`
   - **Volume**: Create folder `docker/streamflow/data` on NAS, map to `/app/data`
   - **Restart policy**: `Unless stopped`
5. Start the container

**Option 2: Docker Compose (SSH/CLI)**

```bash
# Login to registry first
docker login git.khoavo.myds.me -u vndangkhoa -p Thieugia19

# Pull and start
docker compose up -d

# Check logs
docker compose logs -f
```

Access at: `http://YOUR_NAS_IP:3478`

### Local Development

**Prerequisites:** Go 1.25+, Node.js 20+

```bash
# Backend (port 8000)
cd backend
go mod tidy
go run ./cmd/server/main.go

# Frontend (port 5173)
cd frontend-react
npm install
npm run dev
```

## API Endpoints

### Public
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/videos/home` | GET | Get home page movies |
| `/api/videos/search?q=` | GET | Search movies |
| `/api/videos/{slug}` | GET | Get movie details |
| `/api/extract` | POST | Extract video URL |
| `/api/stream?url=` | GET | Proxy video stream |
| `/api/images/proxy?url=` | GET | Proxy images |
| `/api/categories/genres` | GET | Get genre list |
| `/api/categories/countries` | GET | Get country list |

### Auth (Public)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new account |
| `/api/auth/login` | POST | Login with email/password |
| `/api/auth/device/code` | POST | Generate device pairing code |
| `/api/auth/device/status?code=` | GET | Poll pairing status |
| `/api/auth/device/link-login` | POST | Login with 6-digit code |
| `/api/auth/reset-password` | POST | Reset password with recovery key |

### Auth (Protected)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/me` | GET | Get current user |
| `/api/auth/device/pair` | POST | Pair device with code |
| `/api/auth/device/link-code` | POST | Generate link code for other devices |

### Account Management (Protected)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/account/devices` | GET | List connected devices |
| `/api/account/devices` | DELETE | Remove a device |
| `/api/account/change-password` | POST | Change password |
| `/api/account/recovery-key` | POST | Generate recovery key |

### Sync (Protected)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sync/saved-movies` | GET/POST | Get/save saved movies |
| `/api/sync/saved-movies?movie_id=` | DELETE | Remove saved movie |
| `/api/sync/watch-history` | GET/POST | Get/update watch history |
| `/api/sync/bulk` | POST | Bulk sync movies + history |
| `/api/videos/explore` | GET | Get recommendations |

## Project Structure

```
kv-netflix/
├── backend/
│   ├── cmd/server/main.go          # Entry point
│   ├── internal/
│   │   ├── api/                    # HTTP handlers & routes
│   │   │   ├── routes.go           # Route registration
│   │   │   ├── handlers.go         # Video/scrape handlers
│   │   │   ├── auth_handlers.go    # Auth, device pairing
│   │   │   ├── account_handlers.go # Account management
│   │   │   ├── sync_handlers.go    # Data sync
│   │   │   ├── explore_handler.go  # Recommendations
│   │   │   └── middleware.go       # JWT auth middleware
│   │   ├── database/               # Database layer
│   │   ├── models/                 # Data models
│   │   ├── scraper/                # Movie providers
│   │   └── service/                # Business logic
│   ├── go.mod
│   └── go.sum
├── frontend-react/
│   ├── src/
│   │   ├── api/                    # API client
│   │   ├── components/             # React components
│   │   ├── context/                # Auth, Theme, Language contexts
│   │   ├── hooks/                  # Custom hooks
│   │   ├── i18n/                   # Translations (vi/en)
│   │   ├── pages/                  # Page components
│   │   ├── themes/                 # Theme variants
│   │   └── types/                  # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── android-tv/                     # Android TV app
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Changelog

### v7 (Current)
- **Auth System** - User registration, login, JWT tokens
- **Device Pairing** - Logged-in PC shows 6-digit code, other devices enter to login
- **Account Recovery** - Recovery key-based password reset (modal popup)
- **Account Settings** - Manage devices, change password, generate recovery keys
- **i18n** - Vietnamese & English language toggle in navbar
- **Dark/Light Theme** - Auto-detection, localStorage persistence
- **Explore Tab** - Movie recommendations based on watch history genres
- **Image Optimization** - Backend proxy with resize, in-memory + disk cache, blur-up placeholders
- **Data Sync** - Saved movies & watch history synced to server
- **Login Modal** - Toggle between email/password and code entry
- **Go 1.25** - Updated from Go 1.24
- **Pushed to Forgejo**: `git.khoavo.myds.me/vndangkhoa/kv-netflix:v7`

### v6
- Episode progress tracking with auto-save (every 5s + on pause)
- Continue Watching section with progress bars
- Seek to saved position minus 20 seconds on return
- Fixed ophim image URLs (migrated to img.ophim.live)
- Removed broken wsrv.nl proxy dependency
- Episode badge and progress bar in MovieCard
- Docker multi-stage build optimized for Synology NAS (linux/amd64)

### v4
- Deployed v4 to Forgejo and Docker Registry
- Refactored frontend and cleaned up repository

### v3.9.2
- Fixed Android TV local IP issue by replacing it with production backend URL
- Rebuilt Android TV APK and updated the frontend static bundle

### v3.9.1
- Fix Android TV OOM crash + backend Content-Type headers
- Bundled Android TV APK with the webapp for direct download
- Verified D-pad navigation on Android TV app

### v3.8
- Updated docker compose configuration

### v3.7
- Codebase cleanup and security improvements
- Added SSRF protection with URL validation
- Added graceful shutdown and config module
- Added React ErrorBoundary and lazy loading
- Refactored handlers to reduce code duplication
- Updated to Go 1.24 and Node.js 20
- Added healthcheck to Docker Compose

### v3.6
- Fixed duplicate episodes
- Updated Android TV app

### v3.5
- Fixed extract 500 error
- Fixed Android TV crash

### v3.4
- Prevent screen sleep during playback

### v3.3
- Rebranded to kv-netflix
- Added PWA support

## License

MIT
