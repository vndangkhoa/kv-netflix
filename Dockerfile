# Stage 1: Build Image (Frontend)
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend-react/package*.json ./
RUN npm install
COPY frontend-react/ .
RUN npm run build

# Stage 2: Build Image (Backend)
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app/backend
# Install build dependencies
RUN apk add --no-cache gcc musl-dev

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .
# Build static binary for Linux amd64
RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o server cmd/server/main.go

# Stage 3: Final Image
FROM alpine:latest
WORKDIR /app

# Install runtime dependencies (sqlite + yt-dlp for video extraction fallback)
RUN apk add --no-cache sqlite ca-certificates tzdata python3 py3-pip && \
    pip3 install --break-system-packages yt-dlp

# Copy backend binary
COPY --from=backend-builder /app/backend/server .

# Copy frontend build to the expected static directory
# The backend expects ../frontend-react/dist relative to itself, or we configure it.
# Let's align with the standard deployment structure: /app/server and /app/dist
COPY --from=frontend-builder /app/frontend/dist ./dist

# Create data directory
RUN mkdir -p data

# Environment variables
ENV PORT=8000
ENV DATABASE_URL=/app/data/streamflow.db
ENV GIN_MODE=release

# Expose port
EXPOSE 8000

# Start server
CMD ["./server"]
