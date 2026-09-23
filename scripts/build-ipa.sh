#!/usr/bin/env bash
# ==============================================================================
# KV-Netflix - Local Offline IPA Builder
# ==============================================================================
# Builds the iOS IPA completely offline on this Linux machine.
# ==============================================================================

set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Run pure local offline builder
exec "${ROOT_DIR}/scripts/build-ipa-offline.sh" "$@"
