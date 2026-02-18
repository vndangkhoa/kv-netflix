# StreamFlow V3.7

StreamFlow is a high-performance video streaming web application featuring a pure Go backend and a modern React + Tailwind frontend.

## 🚀 Features

- **Modern UI**: Built with React, TypeScript, and Tailwind CSS for a premium, responsive experience.
- **High Performance**: Backend written in Go (Golang) for speed and concurrency.
- **Smart Scraping**: Integrated scraping engine (Rophim) with automated episode extraction.
- **HLS Streaming**: Native HLS playback support.
- **Android TV Support**: Optimized TV client with D-pad controls and 10s skip.
- **Performance Optimized**: Parallel API fetching and global image caching for instant loading.
- **Android TV App**: Native TV app support with dedicated APK available for download.
- **Docker Ready**: Multi-stage Docker build optimized for NAS Synology (linux/amd64).
- **PWA Support**: Install as a progressive web app on mobile devices.

## 🛠️ Tech Stack

- **Backend**: Go 1.23 (Chi Router, GORM, GoQuery)
- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS 4
- **Database**: SQLite
- **Deployment**: Docker

## 📦 Installation

### Prerequisites

- Go 1.23+
- Node.js 20+
- Docker (optional)

### Local Development

1. **Backend**
   ```bash
   cd backend
   go mod tidy
   go run ./cmd/server/main.go
   ```
   Server runs at `http://localhost:8000`.

2. **Frontend**
   ```bash
   cd frontend-react
   npm install
   npm run dev
   ```
   Frontend runs at `http://localhost:5173` (proxying to backend).

### Docker Deployment (Recommended for NAS Synology)

1. **Run with Docker Compose**:
   ```yaml
   version: '3.8'

   services:
     streamflow:
       image: git.khoavo.myds.me/vndangkhoa/kv-streamflow:v3.7
       container_name: streamflow
       platform: linux/amd64
       ports:
         - "3478:8000"
       environment:
         - DATABASE_URL=/app/data/streamflow.db
         - TZ=Asia/Ho_Chi_Minh
       volumes:
         - ./data:/app/data
       restart: unless-stopped
   ```

   ```bash
   docker-compose up -d
   ```

Access the application at `http://YOUR_NAS_IP:3478`. You can download the **Android TV App** directly from the navigation bar once the webapp is running.

## 📂 Project Structure

- `backend/` - Go source code
- `frontend-react/` - React source code
- `Dockerfile` - Multi-stage build definition
- `docker-compose.yml` - Deployment configuration

## 📝 License

MIT
