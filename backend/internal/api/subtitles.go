package api

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"streamflow-backend/internal/models"
)

const maxSubtitleBytes = 10 * 1024 * 1024

var srtCueTimestampRegex = regexp.MustCompile(`(\d{2,}:\d{2}(?::\d{2})?),(\d{3})`)

func isWebVTTHeaderMetadataLine(line string) bool {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" || strings.Contains(trimmed, "-->") {
		return false
	}
	lower := strings.ToLower(trimmed)
	return strings.HasPrefix(lower, "x-timestamp-map=") ||
		strings.HasPrefix(lower, "x-timestamp-map:") ||
		strings.HasPrefix(lower, "kind:") ||
		strings.HasPrefix(lower, "language:")
}

// NormalizeWebVTT normalizes raw WebVTT or SRT subtitle bytes into strict WebVTT
// compatible with HTML5 <track>, Android Media3 ExoPlayer, and Apple AVPlayer.
func NormalizeWebVTT(raw []byte) []byte {
	s := string(bytes.TrimPrefix(raw, []byte("\xef\xbb\xbf")))
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")
	s = strings.TrimLeft(s, " \t\n\ufeff")

	if s == "" {
		return []byte("WEBVTT\n\n")
	}

	lines := strings.Split(s, "\n")
	for i, line := range lines {
		if strings.Contains(line, "-->") {
			lines[i] = srtCueTimestampRegex.ReplaceAllString(line, "${1}.${2}")
		}
	}

	firstTrimmed := strings.TrimRight(lines[0], " \t")
	hasWebVTTMagic := firstTrimmed == "WEBVTT" ||
		strings.HasPrefix(firstTrimmed, "WEBVTT ") ||
		strings.HasPrefix(firstTrimmed, "WEBVTT\t")

	if !hasWebVTTMagic {
		return []byte("WEBVTT\n\n" + strings.Join(lines, "\n"))
	}

	lines[0] = firstTrimmed
	if len(lines) == 1 {
		return []byte(firstTrimmed + "\n\n")
	}

	headerEnd := 1
	for headerEnd < len(lines) && isWebVTTHeaderMetadataLine(lines[headerEnd]) {
		headerEnd++
	}

	if headerEnd >= len(lines) {
		return []byte(strings.Join(lines, "\n") + "\n\n")
	}

	if strings.TrimSpace(lines[headerEnd]) == "" {
		lines[headerEnd] = ""
		if headerEnd == len(lines)-1 {
			return []byte(strings.Join(lines[:headerEnd], "\n") + "\n\n")
		}
		return []byte(strings.Join(lines, "\n"))
	}

	out := make([]string, 0, len(lines)+1)
	out = append(out, lines[:headerEnd]...)
	out = append(out, "")
	out = append(out, lines[headerEnd:]...)
	return []byte(strings.Join(out, "\n"))
}

// StreamSubtitleVTT fetches an external subtitle file, normalizes SRT/malformed VTT
// timestamps into strict WebVTT, and serves it with permissive CORS headers.
func (h *Handler) StreamSubtitleVTT(w http.ResponseWriter, r *http.Request) {
	targetURL := r.URL.Query().Get("url")
	if targetURL == "" {
		http.Error(w, "url parameter required", http.StatusBadRequest)
		return
	}

	if err := validateURL(targetURL); err != nil {
		http.Error(w, "invalid URL: "+err.Error(), http.StatusBadRequest)
		return
	}

	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		http.Error(w, "invalid URL", http.StatusBadRequest)
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, targetURL, nil)
	if err != nil {
		http.Error(w, "invalid URL", http.StatusBadRequest)
		return
	}

	req.Header.Set("User-Agent", defaultUserAgent)
	if strings.Contains(strings.ToLower(parsedURL.Host), "vsmov") {
		req.Header.Set("Referer", "https://vsmov.com/")
	} else {
		req.Header.Set("Referer", fmt.Sprintf("%s://%s", parsedURL.Scheme, parsedURL.Host))
	}

	client := h.StreamClient
	if client == nil {
		client = http.DefaultClient
	}

	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "upstream error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Cache-Control", "no-store")
		http.Error(w, fmt.Sprintf("upstream returned status %d", resp.StatusCode), resp.StatusCode)
		return
	}

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, maxSubtitleBytes))
	if err != nil {
		http.Error(w, "upstream read error: "+err.Error(), http.StatusBadGateway)
		return
	}

	normalized := NormalizeWebVTT(bodyBytes)

	w.Header().Set("Content-Type", "text/vtt; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(normalized)
}

func rewriteSubtitleTracks(origin string, tracks []models.SubtitleTrack) []models.SubtitleTrack {
	if tracks == nil {
		return nil
	}
	if len(tracks) == 0 {
		return []models.SubtitleTrack{}
	}
	origin = strings.TrimRight(origin, "/")
	out := make([]models.SubtitleTrack, len(tracks))
	for i, track := range tracks {
		out[i] = track
		rawSubURL := strings.TrimSpace(track.URL)
		if rawSubURL == "" || strings.Contains(rawSubURL, "/api/stream/vtt") {
			continue
		}
		out[i].URL = fmt.Sprintf("%s/api/stream/vtt?url=%s", origin, url.QueryEscape(rawSubURL))
	}
	return out
}
