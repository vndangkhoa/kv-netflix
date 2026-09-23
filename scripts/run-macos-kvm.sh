#!/usr/bin/env bash
# ==============================================================================
# KV-Netflix - macOS / Xcode KVM Virtualization Runner for Linux
# ==============================================================================
# This script sets up and launches a hardware-accelerated macOS container
# on Linux utilizing Intel VT-x and /dev/kvm.
#
# Allows compiling, running, and debugging native iOS apps with the official
# Apple Xcode & iOS Simulator on this Ubuntu workstation.
# ==============================================================================

set -eo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_APP_DIR="${ROOT_DIR}/ios-app"

echo -e "${BLUE}${BOLD}==================================================================${NC}"
echo -e "${BLUE}${BOLD}  KV-Netflix: macOS & iOS Simulator on Linux via KVM             ${NC}"
echo -e "${BLUE}${BOLD}==================================================================${NC}"

# 1. Verify KVM availability
echo -e "\n${YELLOW}Step 1: Checking KVM hardware acceleration...${NC}"
if [ -e /dev/kvm ]; then
    echo -e "  [${GREEN}✓${NC}] /dev/kvm is available."
else
    echo -e "  [${RED}✗${NC}] /dev/kvm not found! Ensure Intel VT-x / AMD-V is enabled in BIOS."
    exit 1
fi

if [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
    echo -e "  [${GREEN}✓${NC}] Current user has read/write permissions on /dev/kvm."
else
    echo -e "  [${YELLOW}!${NC}] User does not have direct r/w permissions on /dev/kvm."
    echo -e "      Fix with: sudo usermod -aG kvm \$USER && sudo chmod 666 /dev/kvm"
fi

# 2. Check CPU capabilities
CPU_MODEL=$(lscpu | grep "Model name" | head -n 1 | sed 's/Model name:[ \t]*//')
CPU_CORES=$(nproc)
echo -e "  [${GREEN}✓${NC}] CPU Detected: ${BOLD}${CPU_MODEL}${NC} (${CPU_CORES} logical threads)"

if [ "$1" == "--test-kvm" ]; then
    echo -e "\n${GREEN}KVM pre-flight check passed! Hardware virtualization is ready.${NC}"
    exit 0
fi

# 3. Choose runner mode
echo -e "\n${YELLOW}Step 2: Choose macOS Virtualization Runner:${NC}"
echo -e "  ${BOLD}[1] Docker-OSX (Sonoma/Sequoia - Recommended containerized workflow)${NC}"
echo -e "      - Image: sickcodes/docker-osx:sonoma"
echo -e "      - Mounts ./ios-app directly into the VM"
echo -e "      - Runs native iOS Simulator on your Linux X11/Wayland display"
echo -e ""
echo -e "  ${BOLD}[2] Quickemu (Lightweight QEMU CLI workflow)${NC}"
echo -e "      - quickget macos sonoma && quickemu --vm macos-sonoma.conf"
echo -e "      - Native QEMU UI, Spice clipboard, sound & USB redirection"
echo -e ""
echo -e "  ${BOLD}[3] Print Headless Xcode Build Command (for remote Mac / CI)${NC}"
echo ""

read -rp "Select option [1-3, default 1]: " OPTION
OPTION="${OPTION:-1}"

case "$OPTION" in
    1)
        echo -e "\n${GREEN}Launching Docker-OSX with KVM passthrough...${NC}"
        echo -e "Mounting: ${IOS_APP_DIR} -> /home/arch/kv-netflix-ios"
        
        # Check docker
        if ! command -v docker >/dev/null 2>&1; then
            echo -e "${RED}Docker is not installed or not in PATH!${NC}"
            exit 1
        fi

        # Allow local X11 display connections
        if [ -n "$DISPLAY" ]; then
            xhost +local:root || true
        fi

        docker run -it \
            --device /dev/kvm \
            -p 50922:10022 \
            -p 5900:5900 \
            -e RAM=8 \
            -e SMP=6 \
            -e CORES=6 \
            -e EXTRA="-display gtk" \
            -v /tmp/.X11-unix:/tmp/.X11-unix \
            -e "DISPLAY=${DISPLAY:-:0}" \
            -v "${IOS_APP_DIR}:/home/arch/kv-netflix-ios" \
            sickcodes/docker-osx:sonoma
        ;;

    2)
        echo -e "\n${GREEN}Quickemu Setup Instructions:${NC}"
        echo -e "1. Install Quickemu on Ubuntu:"
        echo -e "   sudo add-apt-repository ppa:flexiondotorg/quickemu"
        echo -e "   sudo apt update && sudo apt install -y quickemu"
        echo -e "2. Download and launch macOS Sonoma:"
        echo -e "   quickget macos sonoma"
        echo -e "   quickemu --vm macos-sonoma.conf"
        ;;

    3)
        echo -e "\n${BLUE}Headless xcodebuild commands to build KvNetflix:${NC}"
        cat << 'EOF'
# Generate Xcode project using XcodeGen:
cd ios-app
xcodegen generate

# Build for iOS Simulator (iPhone 16 Pro):
xcodebuild \
    -project KvNetflix.xcodeproj \
    -scheme KvNetflix \
    -destination 'platform=iOS Simulator,name=iPhone 16 Pro,OS=latest' \
    -configuration Debug \
    build

# Run Unit & Integration Tests:
xcodebuild test \
    -project KvNetflix.xcodeproj \
    -scheme KvNetflix \
    -destination 'platform=iOS Simulator,name=iPhone 16 Pro,OS=latest'
EOF
        ;;
    *)
        echo -e "${RED}Invalid selection.${NC}"
        exit 1
        ;;
esac
