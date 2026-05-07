# kv-netflix V6

A high-performance video streaming web application with a pure Go backend and modern React + Tailwind frontend.

## Features

- **Modern UI** - React 19, TypeScript, Vite 7, Tailwind CSS 4
- **High Performance** - Go backend with concurrent API fetching
- **Smart Scraping** - Multi-provider support (Ophim, PhimMoiChill)
- **HLS Streaming** - Native HLS playback with proxy support
- **Android TV** - Native TV app with D-pad controls and 10s skip
- **PWA Support** - Install as a progressive web app
- **Episode Progress Tracking** - Auto-save progress, continue watching with seek
- **Docker Ready** - Multi-stage build for Synology NAS (linux/amd64)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Go 1.24, Chi Router, GORM, SQLite |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
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
3. Search for `vndangkhoa/kv-netflix` and download `v6` tag
4. Create a new container:
   - **Image**: `git.khoavo.myds.me/vndangkhoa/kv-netflix:v6`
   - **Container name**: `streamflow`
   - **Network**: Bridge mode, map port `3478` (local) → `8000` (container)
   - **Environment**: Add `TZ=Asia/Ho_Chi_Minh`
   - **Volume**: Create folder `docker/streamflow/data` on NAS, map to `/app/data`
   - **Restart policy**: `Unless stopped`
5. Start the container

**Option 2: Docker Compose (SSH/CLI)**

Create `docker-compose.yml` on your NAS:
```yaml
version: '3.8'

services:
  streamflow:
    image: git.khoavo.myds.me/vndangkhoa/kv-netflix:v6
    container_name: streamflow
    platform: linux/amd64
    ports:
      - "3478:8000"
    environment:
      - DATABASE_URL=/app/data/streamflow.db
      - PORT=8000
      - TZ=Asia/Ho_Chi_Minh
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

```bash
# Login to registry first
docker login git.khoavo.myds.me -u vndangkhoa -p Thieugia19

# Start container
docker-compose up -d

# Check logs
docker-compose logs -f
```

Access at: `http://YOUR_NAS_IP:3478`

### Local Development

**Prerequisites:** Go 1.24+, Node.js 20+

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

## Project Structure

```
Streamflow/
├── backend/
│   ├── cmd/server/main.go      # Entry point
│   ├── internal/
│   │   ├── api/                # HTTP handlers & routes
│   │   ├── config/             # Configuration
│   │   ├── database/           # Database layer
│   │   ├── models/             # Data models
│   │   ├── scraper/            # Movie providers
│   │   └── service/            # Business logic
│   ├── go.mod
│   └── go.sum
├── frontend-react/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── context/            # React context
│   │   ├── hooks/              # Custom hooks
│   │   ├── pages/              # Page components
│   │   ├── themes/             # Theme variants
│   │   └── types/              # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── android-tv/                 # Android TV app
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Changelog

### v6 (Current)
- Episode progress tracking with auto-save (every 5s + on pause)
- Continue Watching section with progress bars
- Seek to saved position minus 20 seconds on return
- Fixed ophim image URLs (migrated to img.ophim.live)
- Removed broken wsrv.nl proxy dependency
- Episode badge and progress bar in MovieCard
- Pushed to Forgejo: `git.khoavo.myds.me/vndangkhoa/kv-netflix:v6`
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
