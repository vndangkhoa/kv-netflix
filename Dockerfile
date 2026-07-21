# Stage 1: Build Frontend
FROM --platform=linux/amd64 node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend-react/package*.json ./
RUN npm install
COPY frontend-react/ .
RUN npm run build

# Stage 2: Build Backend for linux/amd64
FROM --platform=linux/amd64 golang:1.25-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .
# Build static binary for Linux amd64
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o server cmd/server/main.go

# Stage 3: Build TUI (optional, for docker exec terminal access)
FROM --platform=linux/amd64 golang:1.25-alpine AS tui-builder
WORKDIR /app/tui

COPY tui/go.mod tui/go.sum ./
RUN GOPROXY=off go mod download || true

COPY tui/ .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o kv-netflix-tui . 2>/dev/null || true

# Stage 4: Final Image (linux/amd64 only for Synology NAS)
FROM --platform=linux/amd64 alpine:latest AS final
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache sqlite ca-certificates tzdata mpv yt-dlp

# Copy backend binary
COPY --from=backend-builder /app/backend/server .

# Copy frontend build to the expected static directory
COPY --from=frontend-builder /app/frontend/dist ./dist

# Copy TUI binary for docker exec access
COPY --from=tui-builder /app/tui/kv-netflix-tui /usr/local/bin/kv-netflix-tui

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Environment variables
ENV PORT=8000
ENV DATABASE_URL=/app/data/streamflow.db
ENV TZ=Asia/Ho_Chi_Minh

# Expose port
EXPOSE 8000

# Start server
CMD ["./server"]
