#!/usr/bin/env bash
set -euo pipefail

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend-react"
TUI_DIR="$ROOT_DIR/tui"

PIDS=()
cleanup() {
  echo "Shutting down services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "All services stopped."
}
trap cleanup SIGINT SIGTERM EXIT

usage() {
  cat <<EOF
Usage: ./start.sh <command> [options]

Commands:
  backend          Start backend server (build + run)
  backend:dev      Start backend in dev mode (go run)
  frontend         Start frontend dev server (Vite)
  tui              Build and run TUI client
  docker           Start via docker-compose
  all              Start backend + frontend concurrently
  help             Show this help

Environment variables (backend):
  PORT             Server port (default: 8000)
  DATABASE_URL     SQLite database path (default: streamflow.db)
  JWT_SECRET       JWT signing secret (default: change-me-in-production)
  TMDB_API_KEY     TMDB API key (optional)
  GIN_MODE         Gin mode (default: debug)
  ALLOWED_ORIGINS  CORS origins (default: *)
EOF
  exit 0
}

CMD="${1:-help}"
shift || true

start_backend() {
  echo "Building backend..."
  (cd "$BACKEND_DIR" && go build -o server ./cmd/server/main.go)
  echo "Starting backend on http://localhost:${PORT:-8000}..."
  (cd "$BACKEND_DIR" && exec ./server) &
  PIDS+=($!)
}

start_backend_dev() {
  echo "Starting backend in dev mode on http://localhost:${PORT:-8000}..."
  (cd "$BACKEND_DIR" && exec go run ./cmd/server/main.go) &
  PIDS+=($!)
}

start_frontend() {
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
  echo "Starting frontend dev server..."
  (cd "$FRONTEND_DIR" && exec npm run dev) &
  PIDS+=($!)
}

start_tui() {
  echo "Building TUI..."
  (cd "$TUI_DIR" && go build -o kv-netflix-tui .)
  echo "Starting TUI..."
  exec "$TUI_DIR/kv-netflix-tui" "$@"
}

start_docker() {
  echo "Starting via docker-compose..."
  exec docker-compose -f "$ROOT_DIR/docker-compose.yml" up "$@"
}

start_all() {
  start_backend
  start_frontend
  echo "================================================"
  echo "  Backend:  http://localhost:${PORT:-8000}"
  echo "  Frontend: http://localhost:5173"
  echo "  Press Ctrl+C to stop all services."
  echo "================================================"
  wait
}

case "$CMD" in
  backend)     start_backend ;;
  backend:dev) start_backend_dev ;;
  frontend)    start_frontend ;;
  tui)         start_tui "$@" ;;
  docker)      start_docker "$@" ;;
  all)         start_all ;;
  help|--help|-h) usage ;;
  *)
    echo "Unknown command: $CMD"
    usage
    ;;
esac
