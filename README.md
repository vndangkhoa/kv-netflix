<div align="center">

# KV-NETFLIX

### Modern Movie Streaming Platform

A full-stack video streaming application with Go backend, React frontend, and Android TV support.

[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat&logo=go&logoColor=white)](https://go.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](#license)

[Deploy](#deployment) | [Features](#features) | [API](#api-reference) | [Development](#local-development) | [Docker](#docker-deployment)

</div>

---

## Overview

KV-NETFLIX is a self-hosted movie streaming platform designed for Synology NAS and personal servers. It scrapes Vietnamese movie content from multiple providers, serves HLS streams, and provides a Netflix-like UI with user accounts, device sync, and cross-platform support.

**Key Highlights:**

- Scrape movies from Ophim and PhimMoiChill providers
- HLS streaming with backend proxy (bypasses CORS)
- User accounts with JWT authentication
- Device pairing: PC generates code, TV enters code to login
- Saved movies & watch history synced across devices
- Vietnamese & English language support
- Dark & light theme with system detection
- Movie recommendations based on watch history
- Android TV app with D-pad navigation

---

## Features

### Streaming & Playback

| Feature | Description |
|---------|-------------|
| HLS Streaming | Native HLS.js playback with backend proxy |
| Multi-Server | Multiple CDN sources per episode |
| Episode Progress | Auto-save every 5s + on pause, seek to last position |
| Continue Watching | Resume from where you left off (minus 20s buffer) |
| Auto-Play Next | 10s countdown overlay with next/prev thumbnails |
| Keyboard Shortcuts | Space (play/pause), arrows (seek/volume), F (fullscreen) |

### User System

| Feature | Description |
|---------|-------------|
| Registration | Email + password account creation |
| Login | Email/password or 6-digit code entry |
| Device Pairing | Logged-in PC shows code, other devices enter to login |
| Account Recovery | Recovery key-based password reset |
| Device Management | View and remove connected devices |
| Cross-Device Sync | Saved movies & history synced via API |

### UI/UX

| Feature | Description |
|---------|-------------|
| Dark/Light Theme | Auto-detection based on system preference |
| i18n | Vietnamese & English toggle in navbar |
| Responsive | Mobile-first design, collapsible navbar |
| Blur-Up Images | Lazy loading with low-res placeholder blur |
| Scroll Fade | Smooth gradient arrows on movie rows |
| Search Autocomplete | Real-time suggestions with keyboard navigation |
| PWA | Installable as a progressive web app |

---

## Tech Stack

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│  React 19 · TypeScript · Vite 7 · Tailwind CSS 4  │
│  HLS.js · Lucide Icons · PWA (Workbox)             │
├─────────────────────────────────────────────────────┤
│                    BACKEND                          │
│  Go 1.25 · Chi Router · GORM · SQLite             │
│  bcrypt · JWT · Concurrent scraping                │
├─────────────────────────────────────────────────────┤
│                   MOBILE                            │
│  Android TV · Kotlin · Jetpack Compose             │
│  D-pad navigation · 10s skip                       │
├─────────────────────────────────────────────────────┤
│                 DEPLOYMENT                          │
│  Docker multi-stage · Forgejo Registry              │
│  Synology NAS optimized (linux/amd64)              │
└─────────────────────────────────────────────────────┘
```

---

## Deployment

### Docker (Recommended)

The easiest way to run KV-NETFLIX is with Docker on a Synology NAS or any Docker host.

#### Option 1: Container Manager GUI (Synology)

1. Open **Container Manager** on your Synology NAS
2. Go to **Registry** and add the Forgejo registry:
   - Registry: `git.khoavo.myds.me`
   - Username: `vndangkhoa`
   - Password: `Thieugia19`
3. Search `vndangkhoa/kv-netflix` and pull the `v7` tag
4. Create a container:
   - **Image**: `git.khoavo.myds.me/vndangkhoa/kv-netflix:v7`
   - **Name**: `streamflow`
   - **Ports**: `3478` (local) → `8000` (container)
   - **Environment**: `TZ=Asia/Ho_Chi_Minh`
   - **Volume**: Create `docker/streamflow/data` on NAS → map to `/app/data`
   - **Restart**: Unless stopped
5. Start the container

#### Option 2: Docker Compose (CLI)

```bash
# Login to registry
docker login git.khoavo.myds.me -u vndangkhoa -p Thieugia19

# Pull and start
docker compose up -d

# View logs
docker compose logs -f
```

<details>
<summary>docker-compose.yml</summary>

```yaml
services:
  streamflow:
    image: git.khoavo.myds.me/vndangkhoa/kv-netflix:v7
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

</details>

### Build from Source

```bash
# Clone the repo
git clone https://git.khoavo.myds.me/vndangkhoa/kv-netflix.git
cd kv-netflix

# Build Docker image
docker build --platform linux/amd64 -t kv-netflix:latest .

# Run
docker run -d \
  --name streamflow \
  -p 3478:8000 \
  -v ./data:/app/data \
  -e TZ=Asia/Ho_Chi_Minh \
  kv-netflix:latest
```

---

## Local Development

**Prerequisites:** Go 1.25+, Node.js 20+

### Backend (port 8000)

```bash
cd backend
go mod tidy
go run ./cmd/server/main.go
```

### Frontend (port 5173)

```bash
cd frontend-react
npm install
npm run dev
```

The frontend dev server proxies `/api` requests to the backend on port 8000.

---

## Project Structure

```
kv-netflix/
├── backend/
│   ├── cmd/server/main.go              # Entry point
│   └── internal/
│       ├── api/
│       │   ├── routes.go               # Route registration
│       │   ├── handlers.go             # Video/scrape handlers
│       │   ├── auth_handlers.go        # Auth, device pairing, recovery
│       │   ├── account_handlers.go     # Devices, password, recovery key
│       │   ├── sync_handlers.go        # Saved movies & watch history
│       │   ├── explore_handler.go      # Genre-based recommendations
│       │   └── middleware.go           # JWT auth middleware
│       ├── database/database.go        # SQLite + GORM setup
│       ├── models/models.go            # User, Device, WatchHistory, etc.
│       ├── scraper/                    # Ophim, PhimMoiChill providers
│       └── service/image.go            # Image proxy with cache
│
├── frontend-react/
│   └── src/
│       ├── api/client.ts               # Typed API client
│       ├── components/
│       │   ├── Navbar.tsx               # Hamburger + logo + search + auth
│       │   ├── Modal.tsx                # Reusable modal with backdrop
│       │   ├── MovieCard.tsx            # Blur-up cards with badges
│       │   └── MovieRow.tsx             # Horizontal scroll rows
│       ├── context/
│       │   ├── AuthContext.tsx           # Login, register, token mgmt
│       │   ├── ThemeContext.tsx          # Dark/light + system detect
│       │   └── LanguageContext.tsx       # i18n (vi/en)
│       ├── hooks/
│       │   ├── useWatchMovie.ts         # HLS + auto-play + resume
│       │   ├── useWatchProgress.ts      # localStorage progress
│       │   └── useSync.ts              # Server sync
│       ├── i18n/translations.ts         # All UI strings
│       ├── pages/
│       │   ├── LoginPage.tsx             # Email/password + code toggle
│       │   ├── RegisterPage.tsx          # Registration modal
│       │   ├── DevicePairPage.tsx        # Show 6-digit code
│       │   ├── DeviceLoginPage.tsx       # Enter code to login
│       │   ├── ResetPasswordPage.tsx     # Recovery key reset
│       │   └── MyList.tsx                # Explore/History/Account tabs
│       └── themes/default/
│           ├── DefaultHome.tsx           # Home page layout
│           └── WatchPage.tsx             # Player + episodes
│
├── android-tv/                          # Android TV app (Kotlin)
├── Dockerfile                           # Multi-stage build
├── docker-compose.yml
└── README.md
```

---

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/videos/home` | Home page movies by category |
| `GET` | `/api/videos/search?q=` | Search movies by title |
| `GET` | `/api/videos/{slug}` | Movie detail + episodes |
| `POST` | `/api/extract` | Extract video stream URL |
| `GET` | `/api/stream?url=` | Proxy video stream (bypass CORS) |
| `GET` | `/api/images/proxy?url=` | Proxy & resize images |
| `GET` | `/api/categories/genres` | Genre list |
| `GET` | `/api/categories/countries` | Country list |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | Login with email/password |
| `POST` | `/api/auth/device/code` | No | Generate pairing code (for TV) |
| `GET` | `/api/auth/device/status?code=` | No | Poll pairing status (for TV) |
| `POST` | `/api/auth/device/link-login` | No | Login with 6-digit code |
| `POST` | `/api/auth/reset-password` | No | Reset password with recovery key |
| `GET` | `/api/auth/me` | Yes | Get current user |
| `POST` | `/api/auth/device/pair` | Yes | Pair device with code |
| `POST` | `/api/auth/device/link-code` | Yes | Generate code for other devices |

### Account Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/account/devices` | List connected devices |
| `DELETE` | `/api/account/devices` | Remove a device |
| `POST` | `/api/account/change-password` | Change password |
| `POST` | `/api/account/recovery-key` | Generate recovery key |

### Data Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sync/saved-movies` | Get saved movies |
| `POST` | `/api/sync/saved-movies` | Save a movie |
| `DELETE` | `/api/sync/saved-movies?movie_id=` | Remove saved movie |
| `GET` | `/api/sync/watch-history` | Get watch history |
| `POST` | `/api/sync/watch-history` | Update watch progress |
| `POST` | `/api/sync/bulk` | Bulk sync movies + history |
| `GET` | `/api/videos/explore` | Get recommendations |

---

## Device Pairing Flow

```
┌──────────────┐         ┌──────────────┐
│  PC (Logged  │         │  TV (Not     │
│    In)       │         │   Logged In) │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │  1. Click "Ghép nối"   │
       │  ─────────────────>    │
       │                        │
       │  2. PC shows code      │
       │     "1 2 3 4 5 6"      │
       │  <─────────────────    │
       │                        │
       │                        │  3. TV goes to
       │                        │     /device-login
       │                        │     enters "123456"
       │                        │
       │  4. PC detects         │
       │     code was used      │
       │  <─────────────────    │
       │                        │
       │                        │  5. TV receives
       │                        │     JWT token
       │                        │     → logged in!
       │                        │
```

---

## Changelog

<details>
<summary>v7 (Current) — Auth, Sync, i18n, Theme</summary>

- **Auth System** — User registration, login, JWT tokens (30-day expiry)
- **Device Pairing** — Logged-in PC shows 6-digit code, other devices enter to login
- **Account Recovery** — Recovery key-based password reset (modal popup)
- **Account Settings** — Manage devices, change password, generate recovery keys
- **i18n** — Vietnamese & English language toggle in navbar
- **Dark/Light Theme** — Auto-detection based on system preference, localStorage persistence
- **Explore Tab** — Movie recommendations based on watch history genres
- **Image Optimization** — Backend proxy with resize, in-memory + disk cache, blur-up placeholders
- **Data Sync** — Saved movies & watch history synced to server
- **Login Modal** — Toggle between email/password and code entry
- **Go 1.25** — Updated from Go 1.24

</details>

<details>
<summary>v6 — Progress Tracking & Streaming</summary>

- Episode progress tracking with auto-save (every 5s + on pause)
- Continue Watching section with progress bars
- Seek to saved position minus 20 seconds on return
- Fixed ophim image URLs (migrated to img.ophim.live)
- Removed broken wsrv.nl proxy dependency
- Episode badge and progress bar in MovieCard
- Docker multi-stage build optimized for Synology NAS (linux/amd64)

</details>

<details>
<summary>v3.x — Foundation</summary>

- **v3.7** — SSRF protection, ErrorBoundary, Go 1.24, healthcheck
- **v3.6** — Fixed duplicate episodes, Android TV updates
- **v3.5** — Fixed extract 500 error, Android TV crash
- **v3.4** — Prevent screen sleep during playback
- **v3.3** — Rebranded to kv-netflix, PWA support

</details>

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Server port |
| `DATABASE_URL` | `./streamflow.db` | SQLite database path |
| `TZ` | `UTC` | Timezone |

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**[Deploy](#deployment)** · **[Features](#features)** · **[API](#api-reference)** · **[Development](#local-development)**

Made with Go + React for Synology NAS

</div>
