#!/usr/bin/env bash
# ==============================================================================
# KV-Netflix iOS API Contract Verification Suite
# ==============================================================================
# Validates that the KV-Netflix backend endpoints match the Swift Codable
# models and networking requirements of the native iOS app.
# ==============================================================================

set -eo pipefail

BASE_URL="${1:-https://nf.khoavo.myds.me}"
BASE_URL="${BASE_URL%/}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE} KV-Netflix iOS API Verification Suite             ${NC}"
echo -e "${BLUE} Target Server: ${BASE_URL}                        ${NC}"
echo -e "${BLUE}====================================================${NC}"

PASSED=0
FAILED=0

assert_json_field() {
    local endpoint="$1"
    local response="$2"
    local jq_filter="$3"
    local desc="$4"

    if echo "$response" | jq -e "$jq_filter" >/dev/null 2>&1; then
        echo -e "  [${GREEN}PASS${NC}] $desc"
        PASSED=$((PASSED + 1))
    else
        echo -e "  [${RED}FAIL${NC}] $desc (endpoint: $endpoint)"
        echo -e "         Filter: $jq_filter"
        echo -e "         Snippet: $(echo "$response" | head -c 120)..."
        FAILED=$((FAILED + 1))
    fi
}

echo -e "\n${YELLOW}1. Testing Public Content & Feed Endpoints...${NC}"

# Test /api/videos/home
HOME_RES=$(curl -sSL -H "User-Agent: KVNetflix-iOS/1.0" "${BASE_URL}/api/videos/home")
assert_json_field "/api/videos/home" "$HOME_RES" 'type == "array" and length > 0' "Home videos returns array of items"
assert_json_field "/api/videos/home" "$HOME_RES" '.[0] | has("id") and has("title") and has("slug") and has("thumbnail")' "Movie model contains id, title, slug, thumbnail"

# Extract first movie slug for detail test
FIRST_SLUG=$(echo "$HOME_RES" | jq -r '.[0].slug // empty')
if [ -z "$FIRST_SLUG" ]; then
    FIRST_SLUG="hoc-vien-minerva"
fi

# Test /api/videos/{slug}
echo -e "\n${YELLOW}2. Testing Movie Detail & Episode Mapping...${NC}"
DETAIL_RES=$(curl -sSL -H "User-Agent: KVNetflix-iOS/1.0" "${BASE_URL}/api/videos/${FIRST_SLUG}")
assert_json_field "/api/videos/{slug}" "$DETAIL_RES" 'has("title") and has("slug") and has("category")' "MovieDetail has title, slug, category"
assert_json_field "/api/videos/{slug}" "$DETAIL_RES" 'has("episodes") and (.episodes | type == "array")' "MovieDetail has episodes array for player"

# Test /api/categories/genres & countries
echo -e "\n${YELLOW}3. Testing Taxonomy & Filter Taxonomies...${NC}"
GENRES_RES=$(curl -sSL -H "User-Agent: KVNetflix-iOS/1.0" "${BASE_URL}/api/categories/genres")
assert_json_field "/api/categories/genres" "$GENRES_RES" '(type == "array") and (length > 0) and (.[0] | has("Name")) and (.[0] | has("Slug"))' "Genres returns array with Name and Slug"

COUNTRIES_RES=$(curl -sSL -H "User-Agent: KVNetflix-iOS/1.0" "${BASE_URL}/api/categories/countries")
assert_json_field "/api/categories/countries" "$COUNTRIES_RES" '(type == "array") and (length > 0) and (.[0] | has("Name")) and (.[0] | has("Slug"))' "Countries returns array with Name and Slug"

# Test Search
echo -e "\n${YELLOW}4. Testing Search Query...${NC}"
SEARCH_RES=$(curl -sSL -H "User-Agent: KVNetflix-iOS/1.0" "${BASE_URL}/api/videos/search?q=minerva")
assert_json_field "/api/videos/search" "$SEARCH_RES" 'type == "array"' "Search query returns array"

# Test Device Pairing Handshake
echo -e "\n${YELLOW}5. Testing 6-Digit Device Pairing Handshake...${NC}"
PAIR_CODE_RES=$(curl -sSL -X POST -H "Content-Type: application/json" \
    -d '{"device_name":"Test iPhone Simulator","device_type":"ios"}' \
    "${BASE_URL}/api/auth/device/code")

assert_json_field "/api/auth/device/code" "$PAIR_CODE_RES" 'has("code") and (.code | length == 6)' "Generates 6-digit device pairing code"

PAIR_CODE=$(echo "$PAIR_CODE_RES" | jq -r '.code // empty')
if [ -n "$PAIR_CODE" ]; then
    STATUS_RES=$(curl -sSL "${BASE_URL}/api/auth/device/status?code=${PAIR_CODE}")
    assert_json_field "/api/auth/device/status" "$STATUS_RES" 'has("status") or has("paired") or has("is_paired")' "Check pairing status endpoint functions"
fi

# Summary
echo -e "\n${BLUE}====================================================${NC}"
echo -e " Verification Summary: ${GREEN}${PASSED} passed${NC}, ${RED}${FAILED} failed${NC}"
echo -e "${BLUE}====================================================${NC}"

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ All iOS API contracts verified successfully!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some API contracts failed verification.${NC}"
    exit 1
fi
