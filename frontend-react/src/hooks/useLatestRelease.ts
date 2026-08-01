import { useState, useEffect } from 'react';

interface ReleaseDownloads {
    version: string;
    tv: { github: string; forgejo: string };
    mobile: { github: string; forgejo: string };
    releases: { github: string; forgejo: string };
}

interface CacheEntry {
    data: ReleaseDownloads;
    timestamp: number;
}

const CACHE_KEY = 'kv-netflix-latest-release';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const GITHUB_REPO = '/vndangkhoa/kv-netflix';
const FORGEJO_BASE = 'https://git.khoavo.myds.me';
const FORGEJO_OWNER = '/vndangkhoa';
const FORGEJO_REPO = 'kv-netflix';

// Forgejo attachment IDs (static, tied to specific files)
const FORGEJO_ATTACHMENTS = {
    tv: 'af798c5b-376f-4e1a-84bf-bb62d65289e1',
    mobile: '2f36ea33-12b1-4c6f-b228-6573e41aca55',
};

function getCached(): ReleaseDownloads | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const entry: CacheEntry = JSON.parse(raw);
        if (Date.now() - entry.timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return entry.data;
    } catch {
        return null;
    }
}

function setCache(data: ReleaseDownloads) {
    try {
        const entry: CacheEntry = { data, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch { /* ignore */ }
}

function buildFallback(): ReleaseDownloads {
    return {
        version: '1.0.2',
        tv: {
            github: `https://github.com${GITHUB_REPO}/releases/download/v1.0.2/kv-netflix-tv-v1.0.2.apk`,
            forgejo: `${FORGEJO_BASE}/attachments/${FORGEJO_ATTACHMENTS.tv}`,
        },
        mobile: {
            github: `https://github.com${GITHUB_REPO}/releases/download/v1.0.2/kv-netflix-mobile-v1.0.2.apk`,
            forgejo: `${FORGEJO_BASE}/attachments/${FORGEJO_ATTACHMENTS.mobile}`,
        },
        releases: {
            github: `https://github.com${GITHUB_REPO}/releases/tag/v1.0.2`,
            forgejo: `${FORGEJO_BASE}${FORGEJO_OWNER}/${FORGEJO_REPO}/releases/tag/v1.0.2`,
        },
    };
}

async function fetchGitHubLatest(): Promise<ReleaseDownloads | null> {
    try {
        const res = await fetch(`https://api.github.com/repos${GITHUB_REPO}/releases/latest`);
        if (!res.ok) return null;
        const data = await res.json();
        const version = data.tag_name?.replace(/^v/, '') || '1.0.3';
        const assets = data.assets || [];
        const findAsset = (keywords: string[]) =>
            assets.find((a: { name: string }) => keywords.some(k => a.name.toLowerCase().includes(k.toLowerCase())))?.browser_download_url || '';

        const tvUrl = findAsset(['kv-netflix-tv', 'android-tv', 'tv-v', 'tv.apk']) ||
            `https://github.com${GITHUB_REPO}/releases/download/v${version}/kv-netflix-tv-v${version}.apk`;

        const mobileUrl = findAsset(['kv-netflix-mobile', 'android-mobile', 'mobile-v', 'mobile.apk', 'app-debug']) ||
            `https://github.com${GITHUB_REPO}/releases/download/v${version}/kv-netflix-mobile-v${version}.apk`;

        return {
            version,
            tv: {
                github: tvUrl,
                forgejo: `${FORGEJO_BASE}${FORGEJO_OWNER}/${FORGEJO_REPO}/releases/download/v${version}/kv-netflix-tv-v${version}.apk`,
            },
            mobile: {
                github: mobileUrl,
                forgejo: `${FORGEJO_BASE}${FORGEJO_OWNER}/${FORGEJO_REPO}/releases/download/v${version}/kv-netflix-mobile-v${version}.apk`,
            },
            releases: {
                github: data.html_url || `https://github.com${GITHUB_REPO}/releases/tag/v${version}`,
                forgejo: `${FORGEJO_BASE}${FORGEJO_OWNER}/${FORGEJO_REPO}/releases/tag/v${version}`,
            },
        };
    } catch {
        return null;
    }
}

async function fetchForgejoLatest(): Promise<ReleaseDownloads | null> {
    try {
        const res = await fetch(`${FORGEJO_BASE}/api/v1/repos${FORGEJO_OWNER}/${FORGEJO_REPO}/releases/latest`);
        if (!res.ok) return null;
        const data = await res.json();
        const version = data.tag_name?.replace(/^v/, '') || '1.0.3';
        const assets = data.assets || [];
        const findAsset = (keywords: string[]) =>
            assets.find((a: { name: string }) => keywords.some(k => a.name.toLowerCase().includes(k.toLowerCase())))?.browser_download_url || '';

        const tvUrl = findAsset(['kv-netflix-tv', 'android-tv', 'tv']) ||
            `${FORGEJO_BASE}${FORGEJO_OWNER}/${FORGEJO_REPO}/releases/download/v${version}/kv-netflix-tv-v${version}.apk`;

        const mobileUrl = findAsset(['kv-netflix-mobile', 'android-mobile', 'mobile']) ||
            `${FORGEJO_BASE}${FORGEJO_OWNER}/${FORGEJO_REPO}/releases/download/v${version}/kv-netflix-mobile-v${version}.apk`;

        return {
            version,
            tv: {
                github: `https://github.com${GITHUB_REPO}/releases/download/v${version}/kv-netflix-tv-v${version}.apk`,
                forgejo: tvUrl,
            },
            mobile: {
                github: `https://github.com${GITHUB_REPO}/releases/download/v${version}/kv-netflix-mobile-v${version}.apk`,
                forgejo: mobileUrl,
            },
            releases: {
                github: `https://github.com${GITHUB_REPO}/releases/tag/v${version}`,
                forgejo: data.html_url || `${FORGEJO_BASE}${FORGEJO_OWNER}/${FORGEJO_REPO}/releases/tag/v${version}`,
            },
        };
    } catch {
        return null;
    }
}

export function useLatestRelease() {
    const [downloads, setDownloads] = useState<ReleaseDownloads>(() => getCached() || buildFallback());
    const [loading, setLoading] = useState(!getCached());

    useEffect(() => {
        const cached = getCached();
        if (cached) {
            setDownloads(cached);
            setLoading(false);
            return;
        }

        let cancelled = false;

        (async () => {
            const result = await fetchGitHubLatest() || await fetchForgejoLatest();
            if (!cancelled && result) {
                setDownloads(result);
                setCache(result);
            }
            if (!cancelled) setLoading(false);
        })();

        return () => { cancelled = true; };
    }, []);

    return { downloads, loading };
}
