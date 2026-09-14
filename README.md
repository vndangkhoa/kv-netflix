<p align="center">
  <img src="frontend/public/favicon.ico" alt="KV-Netflix Logo" width="100" height="100" style="border-radius: 20px; box-shadow: 0 10px 30px rgba(220,38,38,0.3);">
</p>

<h1 align="center">KV-Netflix</h1>

<p align="center">
  <strong>The self-hosted movie streaming platform and media portal with native Android TV support.</strong><br>
  Stream thousands of movies with HLS proxying, cross-device watch history, and 6-digit TV pairing.<br>
  <i>Powered by a Go (Chi + GORM) proxy backend, React 19 + Tailwind v4 PWA, and Kotlin Jetpack Compose TV app.</i>
</p>

<p align="center">
  <a href="https://github.com/vndangkhoa/kv-netflix/stargazers"><img src="https://img.shields.io/github/stars/vndangkhoa/kv-netflix?style=for-the-badge&logo=apachespark&color=f59e0b" alt="GitHub Stars"></a>
  <a href="https://hub.docker.com/r/vndangkhoa/kv-netflix"><img src="https://img.shields.io/docker/pulls/vndangkhoa/kv-netflix?style=for-the-badge&logo=docker&logoColor=white&label=Pulls&color=2563eb" alt="Docker Hub Pulls"></a>
  <a href="https://go.dev/"><img src="https://img.shields.io/badge/Backend-Go_1.25-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19"></a>
  <a href="https://developer.android.com/tv"><img src="https://img.shields.io/badge/TV-Android_TV-34A853?style=for-the-badge&logo=android&logoColor=white" alt="Android TV"></a>
  <a href="#license"><img src="https://img.shields.io/badge/License-MIT-gray?style=for-the-badge" alt="License MIT"></a>
</p>

<p align="center">
  <a href="#-quick-start-30-seconds"><b>Quick Start</b></a> •
  <a href="#-why-kv-netflix"><b>Why KV-Netflix?</b></a> •
  <a href="#-competitive-comparison"><b>Comparison</b></a> •
  <a href="#-killer-features"><b>Features</b></a> •
  <a href="#-tv--device-pairing"><b>Device Pairing</b></a> •
  <a href="#-star-history"><b>Star History</b></a>
</p>

---

## ⚡ Why KV-Netflix?

Setting up self-hosted media usually means hoarding hundreds of gigabytes of disk space on Jellyfin or Plex, setting up complex Radarr/Sonarr downloaders, or fighting ISP bandwidth caps.

**KV-Netflix** gives you an instant, cloud-grade streaming catalog on your home server without using a single byte of disk storage for media files:

- 🌐 **Zero-Storage On-Demand Streaming**: Scrapes and indexes content across multiple CDN sources (Ophim, PhimMoiChill, NguonPhim) and streams HLS chunks via a lightweight Go reverse proxy.
- 📺 **Native Android TV App**: Enjoy true couch navigation with D-pad focus control, 10-second skip, auto-countdown next episode, and audio switcher built with Jetpack Compose.
- 🔢 **Seamless 6-Digit Device Pairing**: Pair your living room smart TV, iPad, or mobile phone by simply typing a 6-digit code—no tedious TV keyboard password typing.
- ⏱️ **Instant Cross-Device Resume**: Watch history and timestamp progress (within a 20-second intelligent buffer) sync seamlessly across your phone, desktop browser, and smart TV.
- 🐳 **1-Container Synology Deployment**: Packaged into a single multi-arch container (`vndangkhoa/kv-netflix:latest`) with embedded SQLite storage and minimal RAM usage.

---

## 📊 Competitive Comparison

| Capability | 🎬 **KV-Netflix** | 🍿 Stremio | 🦁 Jellyfin / Plex |
| :--- | :---: | :---: | :---: |
| **Server Storage Required** | **Zero GB (Stream on demand)** | Zero GB | Hundreds of GBs / TBs |
| **Self-Hosted Controller** | **✅ 1-Container Docker** | ❌ Centralized Cloud | ✅ Self-hosted |
| **Vietnamese & Asian Catalog** | **✅ Multi-Provider Aggregation** | ⚠️ Community Addons | ❌ Manual Downloads |
| **6-Digit TV Login Pairing** | **✅ Yes (Instant QR / Code)** | ❌ QR only | ⚠️ Plex PIN only |
| **HLS Stream CORS Proxy** | **✅ Built-in Go Reverse Proxy** | ⚠️ Torrent / Debrid | N/A |
| **Native Android TV Client** | **✅ Kotlin Jetpack Compose** | ✅ Android TV | ✅ Android TV |

---

## 📸 Interface Preview

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [🔴 KV-NETFLIX]   Home   Movies   Series   Anime   My List       [🔍 Search] [👤 Khoa] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   🎬 FEATURED STREAM: DUNE: PART TWO                                                   │
│   ⭐⭐⭐⭐⭐ 2024 • 2h 46m • 4K UHD • Vietsub / Thuyết minh                             │
│   Paul Atreides unites with Chani and the Fremen while seeking revenge against...      │
│   [ ▶ Play Now ]   [ + My List ]   [ ℹ️ More Info ]                                     │
│                                                                                        │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ ⏱️ CONTINUE WATCHING FOR KHOA                                                           │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ ┌─────────────┐  │
│  │ 🎥 Shōgun          │ │ 🎥 Interstellar    │ │ 🎥 Arcane          │ │ 🎥 Breaking │  │
│  │ Ep 4 • 38:12 / 59m │ │ 1h 42m / 2h 49m    │ │ S2: Ep 1 • 15:20   │ │ S5: Ep 14   │  │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘ └─────────────┘  │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Killer Features

### 1. 🎞️ High-Throughput HLS Stream Proxy
Bypasses cross-origin resource sharing (CORS) blocks and CDN geo-restrictions. Streams fragmented `.m3u8` playlists and `.ts` transport segments through an asynchronous Go pipeline with zero buffering.

### 2. 📺 Android TV with D-Pad Experience
A dedicated Kotlin client designed specifically for television remotes:
- Seamless D-pad navigation with glowing focus borders
- One-click 10-second seek forward/backward
- Overlay countdown for the next episode with thumbnail preview

### 3. 🔢 6-Digit Device Pairing
Logging in on a TV remote is painful. KV-Netflix generates a temporary 6-digit code on the TV screen. Simply open `http://<your-server>/pair` on your phone or PC, enter the code, and your TV is logged in instantly.

### 4. 🌓 Dual-Theme & Bilingual
Includes automatic Dark/Light mode detection and instant English & Vietnamese internationalization (`vi` / `en`).

---

## 🚀 Quick Start (30 Seconds)

### Option A: Run Prebuilt Docker Container

Launch KV-Netflix immediately on port `8088`:

```bash
docker run -d \
  --name kv-netflix \
  -p 8088:8088 \
  -v ./data:/app/data \
  -e JWT_SECRET=change_to_a_secure_random_key \
  --restart unless-stopped \
  vndangkhoa/kv-netflix:latest
```

Open **`http://localhost:8088`** in your browser.

---

### Option B: Docker Compose

```yaml
services:
  kv-netflix:
    image: vndangkhoa/kv-netflix:latest
    container_name: kv-netflix
    restart: unless-stopped
    ports:
      - "8088:8088"
    environment:
      - PORT=8088
      - JWT_SECRET=your-random-jwt-secret-key
    volumes:
      # Persistent SQLite database & device sessions
      - ./data:/app/data
```

Start the stack:
```bash
docker compose up -d
```

---

## 🌟 Support & Community

If KV-Netflix upgrades your home entertainment setup:

- Give the project a **Star ⭐** on GitHub!
- Share your setup on [Reddit r/selfhosted](https://reddit.com/r/selfhosted)
- Submit bug reports or source provider scrapers on [GitHub Issues](https://github.com/vndangkhoa/kv-netflix/issues)

<p align="center">
  <a href="https://star-history.com/#vndangkhoa/kv-netflix&Date">
    <img src="https://api.star-history.com/svg?repos=vndangkhoa/kv-netflix&type=Date" alt="KV-Netflix Star History" width="75%">
  </a>
</p>

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

Developed with ❤️ by **Khoa Vo ([@vndangkhoa](https://github.com/vndangkhoa))**.
