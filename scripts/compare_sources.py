#!/usr/bin/env python3
"""
Compare movies from nguonc.com vs ophim1.com.
Fetches movie listing pages from nguonc.com, extracts slugs,
then cross-references against the ophim1.com API.
"""
import sys
import re
import json
import time
import urllib.request
import urllib.error
import concurrent.futures

NGUONC_URL = "https://phim.nguonc.com"
OPHIM_API = "https://ophim1.com/v1/api/phim"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

def fetch(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.read().decode("utf-8")
        except Exception as e:
            if attempt == retries - 1:
                return None
            time.sleep(1)

def extract_slugs_from_response(data):
    """Parse the AJAX JSON response and extract movie slugs from embedded HTML."""
    slugs = set()
    try:
        parsed = json.loads(data)
        view_up = parsed.get("view_up", [])
        for item in view_up:
            if isinstance(item, (list, tuple)) and len(item) >= 2 and item[0] == "#content":
                html_content = item[1]
                for m in re.finditer(r'/phim/([a-z0-9-]+)', html_content):
                    slugs.add(m.group(1))
    except (json.JSONDecodeError, TypeError, KeyError):
        pass
    return slugs

def movie_on_ophim(slug):
    url = f"{OPHIM_API}/{slug}"
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = resp.read().decode()
            result = json.loads(data)
            return True  # got a 200 response -> movie exists
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return False  # 404 = movie not on ophim1
            if attempt == 1:
                return None
            time.sleep(1)
        except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as e:
            if attempt == 1:
                return None
            time.sleep(1)
    return None

def main():
    pages_to_check = 5  # first 5 pages of newest movies
    all_slugs = set()

    for page in range(1, pages_to_check + 1):
        print(f"Fetching nguonc page {page}...")
        if page == 1:
            url = f"{NGUONC_URL}/?load=1"
        else:
            url = f"{NGUONC_URL}/danh-sach-phim?page={page}&load=1"
        data = fetch(url)
        if not data:
            print(f"  Failed to fetch page {page}")
            continue
        slugs = extract_slugs_from_response(data)
        print(f"  Found {len(slugs)} movies")
        all_slugs.update(slugs)

    print(f"\nTotal unique movies from nguonc: {len(all_slugs)}")
    print(f"Checking {len(all_slugs)} movies against ophim1.com...\n")

    on_ophim = 0
    not_on_ophim = 0
    errors = 0
    unique_movies = []
    existing_movies = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        future_to_slug = {
            executor.submit(movie_on_ophim, slug): slug for slug in sorted(all_slugs)
        }
        for future in concurrent.futures.as_completed(future_to_slug):
            slug = future_to_slug[future]
            try:
                result = future.result()
                if result is None:
                    errors += 1
                elif result:
                    on_ophim += 1
                    existing_movies.append(slug)
                else:
                    not_on_ophim += 1
                    unique_movies.append(slug)
            except Exception as e:
                errors += 1

    total_ok = len(all_slugs) - errors
    print("=" * 60)
    print(f"Total nguonc movies checked: {len(all_slugs)}")
    print(f"  Also on ophim1.com: {on_ophim} ({on_ophim/total_ok*100:.1f}%)")
    print(f"  UNIQUE to nguonc.com: {not_on_ophim} ({not_on_ophim/total_ok*100:.1f}%)")
    print(f"  Errors: {errors}")
    print("=" * 60)

    if unique_movies:
        print(f"\nSample unique movies (first 30):")
        for slug in unique_movies[:30]:
            title = slug.replace("-", " ").title()
            print(f"  - {title}")
            print(f"    https://phim.nguonc.com/phim/{slug}")

if __name__ == "__main__":
    main()
