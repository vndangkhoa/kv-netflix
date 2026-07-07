#!/bin/sh
# kv-netflix-tui installer
# Usage: curl -fsSL https://raw.githubusercontent.com/vndangkhoa/kv-netflix/main/tui/install.sh | sh

set -eu

BINARY=kv-netflix-tui
VERSION=${1:-latest}
REPO="vndangkhoa/kv-netflix"
INSTALL_DIR=${INSTALL_DIR:-/usr/local/bin}

# Detect OS/Arch
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64|amd64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

case "$OS" in
  linux|darwin) ;;
  mingw*|cygwin*) OS="windows" ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

# Install dependencies (best-effort, user can skip with SKIP_DEPS=1)
if [ "${SKIP_DEPS:-0}" != "1" ]; then
  echo "Checking dependencies..."
  case "$OS" in
    linux)
      if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get install -y mpv yt-dlp 2>/dev/null || true
      elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S --noconfirm mpv yt-dlp 2>/dev/null || true
      elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y mpv yt-dlp 2>/dev/null || true
      fi
      ;;
    darwin)
      if command -v brew >/dev/null 2>&1; then
        brew install mpv yt-dlp 2>/dev/null || true
      fi
      ;;
    windows)
      echo "Windows: install mpv and yt-dlp manually, or use: scoop install mpv yt-dlp"
      ;;
  esac
fi

# Download binary
EXT=""
[ "$OS" = "windows" ] && EXT=".exe"
URL="https://github.com/$REPO/releases/download/$VERSION/${BINARY}-${OS}-${ARCH}${EXT}"

echo "Downloading $URL ..."
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$URL" -o "/tmp/$BINARY"
elif command -v wget >/dev/null 2>&1; then
  wget -q "$URL" -O "/tmp/$BINARY"
else
  echo "Need curl or wget"
  exit 1
fi

chmod +x "/tmp/$BINARY"

# Install
if [ "$OS" = "windows" ]; then
  mv "/tmp/$BINARY" "./$BINARY$EXT"
  echo "Installed to ./$BINARY$EXT — add to PATH manually"
else
  sudo mv "/tmp/$BINARY" "$INSTALL_DIR/$BINARY"
  echo "Installed $BINARY to $INSTALL_DIR/$BINARY"
  echo ""
  echo "Run: $BINARY --server https://your-server.com"
fi
