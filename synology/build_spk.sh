#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Synology NAS SPK Builder for Kv-Netflix (x86_64)
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SYNOLOGY_DIR="$ROOT_DIR/synology"
BUILD_DIR="$ROOT_DIR/build"
STAGE_DIR="$BUILD_DIR/stage"
PACKAGE_ROOT="$BUILD_DIR/package_root"
OUTPUT_SPK="$ROOT_DIR/kv-netflix.spk"

echo "========================================================"
echo "  Building Kv-Netflix Synology SPK Package"
echo "========================================================"

# Clean previous build artifacts
rm -rf "$BUILD_DIR" "$OUTPUT_SPK"
mkdir -p "$STAGE_DIR" "$PACKAGE_ROOT" "$PACKAGE_ROOT/dist" "$PACKAGE_ROOT/scripts" "$PACKAGE_ROOT/etc" "$PACKAGE_ROOT/var"

# 1. Build Frontend React
echo "--> [1/4] Building Frontend (Vite)..."
(
    cd "$ROOT_DIR/frontend-react"
    npm run build
)
cp -r "$ROOT_DIR/frontend-react/dist/"* "$PACKAGE_ROOT/dist/"

# 2. Build Go Backend (Static Linux amd64)
echo "--> [2/4] Compiling Go Backend (CGO_ENABLED=0 GOOS=linux GOARCH=amd64)..."
(
    cd "$ROOT_DIR/backend"
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o "$PACKAGE_ROOT/server" ./cmd/server/main.go
)
chmod +x "$PACKAGE_ROOT/server"

# Copy helper scripts
if [ -f "$ROOT_DIR/scripts/yt-dlp" ]; then
    cp "$ROOT_DIR/scripts/yt-dlp" "$PACKAGE_ROOT/scripts/"
    chmod +x "$PACKAGE_ROOT/scripts/yt-dlp"
fi

# 3. Create package.tgz
echo "--> [3/4] Creating package.tgz..."
(
    cd "$PACKAGE_ROOT"
    tar -czf "$STAGE_DIR/package.tgz" .
)

# 4. Assemble final .spk archive
echo "--> [4/4] Assembling final kv-netflix.spk..."
chmod +x "$SYNOLOGY_DIR/scripts/"*

# Copy metadata, icons, conf, and scripts to staging
cp "$SYNOLOGY_DIR/INFO" "$STAGE_DIR/"
cp "$SYNOLOGY_DIR/PACKAGE_ICON.PNG" "$STAGE_DIR/"
cp "$SYNOLOGY_DIR/PACKAGE_ICON_256.PNG" "$STAGE_DIR/"
cp -r "$SYNOLOGY_DIR/conf" "$STAGE_DIR/"
cp -r "$SYNOLOGY_DIR/scripts" "$STAGE_DIR/"

(
    cd "$STAGE_DIR"
    tar -cvf "$OUTPUT_SPK" \
        INFO \
        PACKAGE_ICON.PNG \
        PACKAGE_ICON_256.PNG \
        conf \
        scripts \
        package.tgz
)

# Clean temporary stage
rm -rf "$BUILD_DIR"

echo "========================================================"
echo "  Build Complete!"
echo "  Output: $OUTPUT_SPK"
echo "  Size:   $(du -h "$OUTPUT_SPK" | cut -f1)"
echo "  SHA256: $(sha256sum "$OUTPUT_SPK" | cut -d' ' -f1)"
echo "========================================================"
echo "To install on your Synology NAS:"
echo "1. Open Synology DSM -> Package Center"
echo "2. Click 'Manual Install' at top right"
echo "3. Browse and select '$OUTPUT_SPK'"
echo "4. Follow prompts to complete installation"
echo "========================================================"
