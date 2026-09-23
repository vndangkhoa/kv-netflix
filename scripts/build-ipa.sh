#!/usr/bin/env bash
# ==============================================================================
# KV-Netflix iOS IPA Build & Packaging Utility
# ==============================================================================
# This script explains and automates the process of building the KvNetflix.ipa
# on Linux through either:
# 1. GitHub Actions Cloud Builder (Free macOS Apple Silicon runners)
# 2. Local KVM macOS Virtual Machine (Docker-OSX)
# 3. Direct IPA archive packaging structure
# ==============================================================================

set -eo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${ROOT_DIR}/build"
IPA_PATH="${OUTPUT_DIR}/KvNetflix.ipa"

echo -e "${BLUE}${BOLD}==================================================================${NC}"
echo -e "${BLUE}${BOLD}  KV-Netflix: iOS IPA Builder & Packager                          ${NC}"
echo -e "${BLUE}${BOLD}==================================================================${NC}"

echo -e "\n${YELLOW}Choose an IPA Build Method:${NC}"
echo -e "  ${BOLD}[1] Trigger GitHub Actions Cloud Build (Automated macOS-14 runner)${NC}"
echo -e "      - Uses Apple Silicon Mac runners in GitHub Actions"
echo -e "      - Automatically compiles with xcodebuild and outputs KvNetflix.ipa"
echo -e "      - Requires pushing current commit or tag to github remote"
echo -e ""
echo -e "  ${BOLD}[2] Build inside Local macOS KVM VM (Docker-OSX)${NC}"
echo -e "      - Uses your local Intel Core i5-12400F with /dev/kvm"
echo -e "      - Runs Xcode inside local container and builds KvNetflix.ipa locally"
echo -e ""
echo -e "  ${BOLD}[3] Package IPA Payload Skeleton (Direct on Linux)${NC}"
echo -e "      - Creates the standard iOS IPA archive structure ready for code injection"
echo ""

read -rp "Select option [1-3, default 1]: " OPTION
OPTION="${OPTION:-1}"

case "$OPTION" in
    1)
        echo -e "\n${GREEN}Triggering GitHub Actions Build:${NC}"
        echo -e "To trigger the cloud build right now, commit and push your changes:"
        echo -e "  ${BOLD}git add .${NC}"
        echo -e "  ${BOLD}git commit -m 'feat: Add native iOS app and IPA build pipeline'${NC}"
        echo -e "  ${BOLD}git push github main${NC}"
        echo -e "\nOr tag a release to build TV APK, Mobile APK, and iOS IPA together:"
        echo -e "  ${BOLD}git tag v1.0.8 && git push github v1.0.8${NC}"
        echo -e "\nGitHub Actions will automatically build and publish ${BOLD}KvNetflix.ipa${NC}!"
        ;;

    2)
        echo -e "\n${GREEN}Launching local macOS KVM container to compile IPA...${NC}"
        "${ROOT_DIR}/scripts/run-macos-kvm.sh"
        ;;

    3)
        echo -e "\n${GREEN}Generating IPA archive package structure...${NC}"
        mkdir -p "${OUTPUT_DIR}/Payload/KvNetflix.app"
        
        # Copy Info.plist and resources
        cp "${ROOT_DIR}/ios-app/Resources/Info.plist" "${OUTPUT_DIR}/Payload/KvNetflix.app/Info.plist"
        if [ -d "${ROOT_DIR}/ios-app/Resources/vi.lproj" ]; then
            cp -r "${ROOT_DIR}/ios-app/Resources/vi.lproj" "${OUTPUT_DIR}/Payload/KvNetflix.app/"
        fi
        if [ -d "${ROOT_DIR}/ios-app/Resources/en.lproj" ]; then
            cp -r "${ROOT_DIR}/ios-app/Resources/en.lproj" "${OUTPUT_DIR}/Payload/KvNetflix.app/"
        fi

        # Create IPA zip
        cd "${OUTPUT_DIR}"
        zip -qr "${IPA_PATH}" Payload
        rm -rf Payload

        echo -e "  [${GREEN}✓${NC}] Package structure created at: ${BOLD}${IPA_PATH}${NC}"
        echo -e "  Size: $(du -h "${IPA_PATH}" | cut -f1)"
        ;;

    *)
        echo -e "${RED}Invalid selection.${NC}"
        exit 1
        ;;
esac
