package service

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
)

const (
	resolverUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"

	resolverMaxDepth       = 6
	resolverMaxPages       = 12
	resolverMaxScripts     = 6
	resolverMaxBodyBytes   = 8 << 20
	resolverMaxScriptBytes = 2 << 20
	resolverProbeTimeout   = 8 * time.Second
	resolverProbeMax       = 6
	resolverCacheTTL       = 45 * time.Minute
)

var (
	reM3U8  = regexp.MustCompile(`(?:https?:)?//[^"'\s<>\\]+\.(?:m3u8|mpd)[^"'\s<>\\]*`)
	reMP4   = regexp.MustCompile(`(?:https?:)?//[^"'\s<>\\]+\.(?:mp4|webm|mkv)[^"'\s<>\\]*`)
	reAtob  = regexp.MustCompile(`(?:atob|decodeURIComponent)\(\s*["']([A-Za-z0-9+/=]{24,})["']\s*\)`)
	reQMedia = regexp.MustCompile(`[?&](?:hls|mp4|url|file|src|source|play)url?=([^&"'\s\\]+)`)

	adHostPatterns = []string{
		"propellerads", "exoclick", "adserver", "adservice", "doubleclick",
		"google-analytics", "googletagmanager", "facebook.com/tr", "hotjar",
		"taboola", "outbrain", "cookiebot", "consent",
	}
	adExtPatterns = []string{".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".css", ".woff", ".woff2", ".ico", ".webmanifest", ".xml.gz", ".js"}
)

// embedResolver crawls third-party embed player pages (nested iframes and
// player scripts) server-side and returns a direct HLS/MP4 stream URL when
// possible. This replaces handing "embed" URLs to clients, where Android TV
// and mobile apps had to render unreliable WebView iframes.
type embedResolver struct {
	client *http.Client

	mu    sync.Mutex
	cache map[string]resolverCacheEntry
}

type resolverCacheEntry struct {
	url       string
	ext       string
	fetchedAt time.Time
}

func newEmbedResolver() *embedResolver {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:    16,
		IdleConnTimeout: 30 * time.Second,
	}
	jar, _ := cookiejar.New(nil)
	return &embedResolver{
		client: &http.Client{Transport: tr, Jar: jar},
		cache:  make(map[string]resolverCacheEntry),
	}
}

func (r *embedResolver) fetch(ctx context.Context, rawURL, referer string, maxBytes int64) ([]byte, int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("User-Agent", resolverUserAgent)
	req.Header.Set("Accept", "*/*")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")
	req.Header.Set("Sec-Fetch-Dest", "document")
	req.Header.Set("Sec-Fetch-Mode", "navigate")
	req.Header.Set("Sec-Fetch-Site", "cross-site")
	if u, err := url.Parse(rawURL); err == nil {
		req.Header.Set("Origin", u.Scheme+"://"+u.Host)
	}
	if referer != "" {
		req.Header.Set("Referer", referer)
	}

	resp, err := r.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	// Surface session cookies so other components (e.g. the stream proxy)
	// can replay Cloudflare-cleared sessions for the same host.
	registerStreamCookies(resp)

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes))
	if err != nil {
		return nil, resp.StatusCode, err
	}
	return body, resp.StatusCode, nil
}

// ---------------------------------------------------------------------------
// Shared session-cookie registry, consumed by the /api/stream proxy so that
// HLS manifests/segments behind Cloudflare (streamc.xyz) keep working after
// the resolver established a cleared session.
// ---------------------------------------------------------------------------

var (
	cookieRegistryMu sync.RWMutex
	cookieRegistry   = map[string]string{} // host -> "name=value; name2=value2"
)

func registerStreamCookies(resp *http.Response) {
	u, err := url.Parse(resp.Request.URL.String())
	if err != nil {
		return
	}
	cookies := resp.Cookies()
	if len(cookies) == 0 {
		return
	}
	cookieRegistryMu.Lock()
	defer cookieRegistryMu.Unlock()
	existing := cookieRegistry[u.Host]
	parts := []string{}
	if existing != "" {
		parts = append(parts, strings.Split(existing, "; ")...)
	}
	seen := map[string]bool{}
	if existing != "" {
		for _, p := range parts {
			if k, _, ok := strings.Cut(p, "="); ok {
				seen[k] = true
			}
		}
	}
	for _, c := range cookies {
		if seen[c.Name] {
			continue
		}
		seen[c.Name] = true
		parts = append(parts, c.Name+"="+c.Value)
	}
	cookieRegistry[u.Host] = strings.Join(parts, "; ")
}

// StreamCookies returns the recorded Cookie header value for a host,
// or "" if no session was established.
func StreamCookies(host string) string {
	cookieRegistryMu.RLock()
	defer cookieRegistryMu.RUnlock()
	return cookieRegistry[host]
}

// normalizeURL resolves protocol-relative and relative references against base.
func normalizeURL(raw, base string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	baseURL, err := url.Parse(base)
	if err != nil {
		return ""
	}
	if strings.HasPrefix(raw, "//") {
		raw = baseURL.Scheme + ":" + raw
	} else if !strings.HasPrefix(raw, "http://") && !strings.HasPrefix(raw, "https://") {
		ref, err := url.Parse(raw)
		if err != nil {
			return ""
		}
		raw = baseURL.ResolveReference(ref).String()
	}
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return ""
	}
	return parsed.String()
}

// scanText extracts candidate stream URLs from page/JS text. It handles the
// common obfuscations found in stream player pages (escaped slashes, base64
// wrapping, query-parameter URLs).
func (r *embedResolver) scanText(text, pageURL string) []string {
	clean := strings.ReplaceAll(text, `\/`, `/`)
	var out []string

	push := func(urls []string) {
		for _, u := range urls {
			if norm := normalizeURL(u, pageURL); norm != "" && isMediaURL(norm) {
				out = append(out, norm)
			}
		}
	}

	push(reM3U8.FindAllString(clean, -1))
	push(reMP4.FindAllString(clean, -1))

	// base64/decodeURIComponent-wrapped URLs: atob("..."), decodeURIComponent("...")
	for _, m := range reAtob.FindAllStringSubmatch(clean, -1) {
		decoded, err := base64.StdEncoding.DecodeString(m[1])
		if err != nil {
			continue
		}
		decStr := string(decoded)
		if strings.Contains(decStr, ".m3u8") || strings.Contains(decStr, ".mp4") {
			push(reM3U8.FindAllString(decStr, -1))
			push(reMP4.FindAllString(decStr, -1))
		}
	}

	// query-parameter embedded URLs (?url=..., &source=...)
	for _, m := range reQMedia.FindAllStringSubmatch(clean, -1) {
		val := m[1]
		if unescaped, err := url.QueryUnescape(val); err == nil &&
			(strings.HasPrefix(unescaped, "http://") || strings.HasPrefix(unescaped, "https://")) {
			val = unescaped
		}
		push([]string{val})
	}

	return out
}

// sameSite reports whether base and next share a registrable domain, so the
// crawler never follows cross-site ad/tracker frames.
func sameSite(base, next string) bool {
	b, err := url.Parse(base)
	if err != nil {
		return false
	}
	n, err := url.Parse(next)
	if err != nil {
		return false
	}
	return b.Hostname() == n.Hostname() ||
		strings.HasSuffix(n.Hostname(), "."+b.Hostname()) ||
		strings.HasSuffix(b.Hostname(), "."+n.Hostname())
}

// unwrapQueryURL returns the real stream URL when raw is a player endpoint
// wrapping it in query params (e.g. /player.php?url=https%3A%2F%2Fcdn...).
func unwrapQueryURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	for _, key := range []string{"url", "hls", "mp4", "src", "source", "file", "play"} {
		if v := parsed.Query().Get(key); v != "" {
			if (strings.Contains(v, ".m3u8") || strings.Contains(v, ".mp4")) && strings.HasPrefix(v, "http") {
				return v
			}
		}
	}
	return raw
}

func isMediaURL(raw string) bool {
	lower := strings.ToLower(raw)
	for _, ad := range adHostPatterns {
		if strings.Contains(lower, ad) {
			return false
		}
	}
	u, err := url.Parse(lower)
	if err == nil {
		path := u.Path
		for _, ext := range adExtPatterns {
			if strings.HasSuffix(path, ext) {
				return false
			}
		}
	}
	return strings.Contains(lower, ".m3u8") || strings.Contains(lower, ".mp4") ||
		strings.Contains(lower, ".mpd")
}

// probeAlive returns the first candidate that responds like a real media
// stream (HLS manifests must start with #EXTM3U). If nothing verifies it
// returns an empty string so callers can decide whether to fall through.
func (r *embedResolver) probeAlive(ctx context.Context, candidates []string) string {
	if len(candidates) == 0 {
		return ""
	}
	probeCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	results := make(chan probeResult, len(candidates))
	started := 0
	for i, u := range candidates {
		if i >= resolverProbeMax {
			break
		}
		started++
		go func(url string) {
			results <- r.probeOne(probeCtx, url)
		}(u)
	}

	for i := 0; i < started; i++ {
		if res := <-results; res.ok {
			cancel()
			return res.url
		}
	}
	return ""
}

type probeResult struct {
	url string
	ext string
	ok  bool
}

func (r *embedResolver) probeOne(ctx context.Context, rawURL string) probeResult {
	probeCtx, cancel := context.WithTimeout(ctx, resolverProbeTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(probeCtx, http.MethodGet, rawURL, nil)
	if err != nil {
		return probeResult{}
	}
	req.Header.Set("User-Agent", resolverUserAgent)
	if o := originOf(rawURL); o != "" {
		req.Header.Set("Referer", o)
	}
	req.Header.Set("Range", "bytes=0-511")

	resp, err := r.client.Do(req)
	if err != nil {
		return probeResult{}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
		return probeResult{}
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<10))
	isHLS := bytes.HasPrefix(bytes.ToLower(body), []byte("#extm3u"))
	if strings.Contains(strings.ToLower(rawURL), ".m3u8") || isHLS {
		if !isHLS || IsEncryptedManifest(body) {
			return probeResult{}
		}
		return probeResult{url: rawURL, ext: "m3u8", ok: true}
	}
	return probeResult{url: rawURL, ext: "mp4", ok: true}
}

// IsEncryptedManifest reports whether body is the whole-playlist AES-GCM
// encrypted HLS variant some embed hosts serve (marker: #ENC-AESGCM).
// No standard HLS client (hls.js / native player) can decode it — only the
// host's own JS player, so it must never be handed to a direct-stream player.
func IsEncryptedManifest(body []byte) bool {
	return bytes.Contains(bytes.ToLower(body), []byte("enc-aesgcm"))
}

func originOf(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	return u.Scheme + "://" + u.Host
}

func (r *embedResolver) cached(key string) (resolverCacheEntry, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	entry, ok := r.cache[key]
	if !ok || time.Since(entry.fetchedAt) > resolverCacheTTL {
		return resolverCacheEntry{}, false
	}
	return entry, true
}

func (r *embedResolver) store(key, url, ext string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.cache[key] = resolverCacheEntry{url: url, ext: ext, fetchedAt: time.Now()}
}

// ResolveDirectStream turns an embed/player URL into a direct m3u8/mp4 URL.
// Returns ("", "") if the embed could not be resolved.
func (r *embedResolver) ResolveDirectStream(ctx context.Context, embedURL string) (string, string) {
	key := strings.TrimSpace(embedURL)
	if entry, ok := r.cached(key); ok {
		return entry.url, entry.ext
	}

	// streamc.xyz hides its real stream behind an obfuscated token; the
	// manifest it serves is whole-playlist AES-GCM encrypted, so no standard
	// HLS client can decode it — only the site's own JS player. When the
	// token does not verify as a plain manifest, fall through so the
	// extractor hands the embed page itself to the client for iframe playback.
	if strings.Contains(key, "streamc.xyz") {
		if u := r.resolveStreamcToken(ctx, key); u != "" {
			if res := r.probeOne(ctx, u); res.ok && res.url != "" {
				r.store(key, res.url, res.ext)
				return res.url, res.ext
			}
			log.Printf("[resolver] streamc token not directly playable (encrypted manifest), falling back to embed page")
		}
	}

	var found []string
	seenPages := map[string]bool{key: true}
	seenURLs := map[string]bool{}
	pageCount, scriptCount := 0, 0

	// The embed URL itself may carry the stream in query params.
	for _, u := range r.scanText(key, key) {
		if unwrapped := unwrapQueryURL(u); unwrapped != u {
			u = unwrapped
		}
		if !seenURLs[u] {
			seenURLs[u] = true
			found = append(found, u)
		}
	}

	var walk func(current, referer string, depth int)
	walk = func(current, referer string, depth int) {
		if depth > resolverMaxDepth || pageCount >= resolverMaxPages || ctx.Err() != nil {
			return
		}
		body, status, err := r.fetch(ctx, current, referer, resolverMaxBodyBytes)
		if err != nil || status >= 400 {
			log.Printf("[resolver] fetch %s -> status %d err %v", current, status, err)
			return
		}
		pageCount++

		for _, u := range r.scanText(string(body), current) {
			if unwrapped := unwrapQueryURL(u); unwrapped != u {
				u = unwrapped
			}
			if !seenURLs[u] {
				seenURLs[u] = true
				found = append(found, u)
			}
		}

		doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
		if err != nil {
			return
		}
		doc.Find("iframe").Each(func(_ int, sel *goquery.Selection) {
			src, ok := sel.Attr("src")
			if !ok {
				return
			}
			next := normalizeURL(src, current)
			if next == "" || seenPages[next] || !sameSite(current, next) {
				return
			}
			seenPages[next] = true
			walk(next, current, depth+1)
		})
		doc.Find("script").Each(func(_ int, sel *goquery.Selection) {
			if scriptCount >= resolverMaxScripts {
				return
			}
			src, ok := sel.Attr("src")
			if !ok || src == "" {
				return
			}
			next := normalizeURL(src, current)
			if next == "" || seenPages[next] || !sameSite(current, next) {
				return
			}
			seenPages[next] = true
			scriptCount++
			jsBody, jsStatus, err := r.fetch(ctx, next, current, resolverMaxScriptBytes)
			if err != nil || jsStatus >= 400 {
				return
			}
			for _, u := range r.scanText(string(jsBody), next) {
				if unwrapped := unwrapQueryURL(u); unwrapped != u {
					u = unwrapped
				}
				if !seenURLs[u] {
					seenURLs[u] = true
					found = append(found, u)
				}
			}
		})
	}

	walk(embedURL, "", 0)
	if len(found) == 0 {
		return "", ""
	}

	chosen := r.probeAlive(ctx, found)
	if chosen == "" {
		chosen = found[0]
	}
	ext := extOfStream(chosen)
	if res := r.probeOne(ctx, chosen); res.ok {
		ext = res.ext
	}
	r.store(key, chosen, ext)
	return chosen, ext
}

func extOfStream(raw string) string {
	switch {
	case strings.Contains(raw, ".m3u8"):
		return "m3u8"
	case strings.Contains(raw, ".mpd"):
		return "mpd"
	default:
		return "mp4"
	}
}

// resolveStreamcToken implements the streamc.xyz embed algorithm:
//  1. Fetch the embed page (e.g. embed15.streamc.xyz/embed.php?hash=...)
//  2. Find the element carrying data-obf="<base64 JSON>" whose JSON holds the
//     "sUb" token (a base64 string that doubles as the stream path)
//  3. The resulting "https://<host>/<sUb>" manifest is whole-playlist
//     AES-GCM encrypted (#ENC-AESGCM) and only the site's JS player can
//     decode it — callers must probe before returning it as a direct stream.
func (r *embedResolver) resolveStreamcToken(ctx context.Context, embedURL string) string {
	origin := originOf(embedURL)
	if origin == "" {
		return ""
	}
	body, status, err := r.fetch(ctx, embedURL, "", resolverMaxBodyBytes)
	if err != nil || status >= 400 {
		log.Printf("[resolver] streamc page fetch failed: status=%d err=%v", status, err)
		return ""
	}

	var token string
	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(body))
	if err == nil {
		doc.Find("*").EachWithBreak(func(_ int, sel *goquery.Selection) bool {
			for _, attr := range []string{"data-obf", "data-config", "data-player", "data-source"} {
				raw, ok := sel.Attr(attr)
				if !ok || raw == "" {
					continue
				}
				decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(raw))
				if err != nil {
					continue
				}
				var cfg map[string]interface{}
				if json.Unmarshal(decoded, &cfg) == nil {
					if s, ok := cfg["sUb"].(string); ok && s != "" {
						token = s
						return false
					}
				}
			}
			return true
		})
	}

	if token == "" {
		// Fallback: the JS may hold it in an escaped form.
		if m := regexp.MustCompile(`sUb["']?\s*[:=]\s*["']([A-Za-z0-9+/=]{40,})["']`).FindStringSubmatch(string(body)); len(m) > 1 {
			token = m[1]
		}
	}
	if token == "" {
		log.Printf("[resolver] no sUb token found in streamc page")
		return ""
	}
	return origin + "/" + token
}