#!/usr/bin/env bash
# ==============================================================================
# KV-Netflix iOS Simulator & Interactive Test Harness Runner
# ==============================================================================
# Starts an offline, zero-cloud web-based iOS emulator harness replicating
# the native SwiftUI client, video player, and 6-digit TV pairing.
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SIM_DIR="${ROOT_DIR}/ios-app/simulator-web"
PID_FILE="${SIM_DIR}/.simulator.pid"

DEFAULT_PORT=3270

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# Handle Stop
if [[ "$1" == "--stop" || "$1" == "stop" ]]; then
    if [[ -f "$PID_FILE" ]]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null || true
            echo -e "${YELLOW}Stopped KV-Netflix iOS Simulator (PID: ${PID})${NC}"
        fi
        rm -f "$PID_FILE"
    else
        pkill -f "http.server.*simulator-web" 2>/dev/null || true
        echo -e "${YELLOW}Cleaned up running simulator processes.${NC}"
    fi
    exit 0
fi

# Select Port
TARGET_PORT="${1:-$DEFAULT_PORT}"

# Ensure latest IPA is copied to simulator directory
if [[ -f "${ROOT_DIR}/build/KvNetflix.ipa" ]]; then
    cp -u "${ROOT_DIR}/build/KvNetflix.ipa" "${SIM_DIR}/KvNetflix.ipa" 2>/dev/null || cp "${ROOT_DIR}/build/KvNetflix.ipa" "${SIM_DIR}/KvNetflix.ipa"
fi

# Stop existing running instance on this PID if exists
if [[ -f "$PID_FILE" ]]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        kill "$OLD_PID" 2>/dev/null || true
        sleep 0.5
    fi
    rm -f "$PID_FILE"
fi

# Check if target port is already in use by another process
if ss -tulpn | grep -q ":${TARGET_PORT} "; then
    echo -e "${RED}Port ${TARGET_PORT} is currently in use.${NC}"
    if [[ "$TARGET_PORT" == "3250" ]]; then
        echo -e "${YELLOW}Note: Port 3250 is being used by KV-Tube. Switching to port 3270...${NC}"
        TARGET_PORT=3270
    else
        echo -e "${YELLOW}Trying fallback port 3271...${NC}"
        TARGET_PORT=3271
    fi
fi

# Start Python HTTP Server
echo -e "${BLUE}=================================================================${NC}"
echo -e "${RED}               KV-NETFLIX iOS SIMULATOR HARNESS                  ${NC}"
echo -e "${BLUE}=================================================================${NC}"
echo -e "  Host OS:         Ubuntu Linux (Offline Local Environment)"
echo -e "  Emulated Device: iPhone 16 Pro (Dynamic Island & Status Bar)"
echo -e "  Target Port:     ${TARGET_PORT}"
echo -e "  Document Root:   ${SIM_DIR}"
echo -e "${BLUE}-----------------------------------------------------------------${NC}"

setsid python3 -m http.server "${TARGET_PORT}" --directory "${SIM_DIR}" > "${SIM_DIR}/.simulator.log" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

sleep 1

if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo -e "${GREEN}✓ iOS Simulator Test Harness is LIVE and accessible at:${NC}"
    echo -e ""
    echo -e "   ${CYAN}➜  http://localhost:${TARGET_PORT}${NC}"
    echo -e ""
    echo -e "  Features loaded:"
    echo -e "   • [▶] Adaptive HLS Video Player with Multi-Server Failover"
    echo -e "   • [🛡️] Ad-Blocker Active Webview Engine"
    echo -e "   • [🔢] 6-Digit Android TV Device Pairing"
    echo -e "   • [⬇] Direct Offline Download: http://localhost:${TARGET_PORT}/KvNetflix.ipa"
    echo -e "   • [📱] Photorealistic iPhone 16 Pro Bezel & Dynamic Island"
    echo -e "${BLUE}=================================================================${NC}"
    echo -e "  To stop the simulator at any time, run:  ${YELLOW}./scripts/run-emulator.sh stop${NC}"
else
    echo -e "${RED}Failed to start simulator HTTP server on port ${TARGET_PORT}.${NC}"
    exit 1
fi
