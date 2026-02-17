package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type VideoInfo struct {
	Title      string `json:"title"`
	Thumbnail  string `json:"thumbnail"`
	Duration   int    `json:"duration"`
	StreamURL  string `json:"url"` // yt-dlp JSON key is 'url'
	FormatID   string `json:"format_id"`
	Resolution string `json:"resolution"` // Custom field
	Ext        string `json:"ext"`
}

type VideoExtractor struct{}

func NewVideoExtractor() *VideoExtractor {
	return &VideoExtractor{}
}

func (e *VideoExtractor) Extract(url string, quality string) (*VideoInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Check for custom extractors
	if strings.Contains(url, "phimmoichill") {
		return e.extractPhimMoiChill(url)
	}

	// Build format selector
	formatSelector := "bestvideo+bestaudio/best"
	if quality != "" {
		height := strings.Replace(quality, "p", "", -1)
		formatSelector = fmt.Sprintf("bestvideo[height<=%s]+bestaudio/best[height<=%s]/best", height, height)
	}

	args := []string{
		"--dump-json",
		"--no-playlist",
		"--no-warnings",
		"--format", formatSelector,
		url,
	}

	// Check for local yt-dlp.exe
	ytDlpCmd := "yt-dlp"
	// Only on windows for simplicity or check OS
	if _, err := os.Stat("yt-dlp.exe"); err == nil {
		path, _ := filepath.Abs("yt-dlp.exe")
		ytDlpCmd = path
	}

	cmd := exec.CommandContext(ctx, ytDlpCmd, args...)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("extraction failed: %v", err)
	}

	var info VideoInfo
	// yt-dlp dumps JSON. Unmarshal it.
	// Note: yt-dlp JSON has many fields, we only map the ones in VideoInfo struct
	if err := json.Unmarshal(output, &info); err != nil {
		return nil, fmt.Errorf("json parse error: %v", err)
	}

	// Post-process resolution if not directly available or custom logic needed
	// In strict parsing, we might need a custom struct to catch 'height' and 'width' to form resolution
	// allowing dynamic map parsing for simplicity:
	var rawData map[string]interface{}
	json.Unmarshal(output, &rawData)

	if h, ok := rawData["height"].(float64); ok {
		info.Resolution = fmt.Sprintf("%dp", int(h))
	} else {
		info.Resolution = "unknown"
	}

	// Ensure StreamURL is populated (sometimes 'url' is the stream url)
	if info.StreamURL == "" {
		if u, ok := rawData["url"].(string); ok {
			info.StreamURL = u
		}
	}

	return &info, nil
}

func (e *VideoExtractor) extractPhimMoiChill(pageURL string) (*VideoInfo, error) {
	// 1. Fetch the watch page
	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	req, err := http.NewRequest("GET", pageURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch page: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("failed to fetch page: status code %d", resp.StatusCode)
	}

	// Capture cookies for the session
	cookies := resp.Cookies()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read page body: %v", err)
	}
	body := string(bodyBytes)

	// 2. Extract IDs: filmId and episodeID
	// 2. Extract IDs: filmId and episodeID
	reID := regexp.MustCompile(`chillplay\("(\d+)"\)`)
	matchesID := reID.FindStringSubmatch(body)
	var episodeID string
	if len(matchesID) >= 2 {
		episodeID = matchesID[1]
	} else {
		// Fallback: extract from URL
		// URL format: ...-tap-X-pm(\d+) or ...-pm(\d+)
		reURL := regexp.MustCompile(`-pm(\d+)`)
		matchesURL := reURL.FindStringSubmatch(pageURL)
		if len(matchesURL) >= 2 {
			episodeID = matchesURL[1]
		} else {
			return nil, fmt.Errorf("failed to extract episode ID from page or URL")
		}
	}

	reFilmID := regexp.MustCompile(`filmId\s*[:=]\s*(\d+)`)
	matchesFilm := reFilmID.FindStringSubmatch(body)
	filmID := ""
	if len(matchesFilm) > 1 {
		filmID = matchesFilm[1]
	}

	// 2.1 Simulate movie_update_view AJAX session (handshake)
	if filmID != "" {
		updateURL := "https://phimmoichill.my/movie_update_view"
		updateData := url.Values{}
		updateData.Set("film_id", filmID)
		updateReq, _ := http.NewRequest("POST", updateURL, strings.NewReader(updateData.Encode()))
		updateReq.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
		updateReq.Header.Set("X-Requested-With", "XMLHttpRequest")
		updateReq.Header.Set("Referer", pageURL)
		updateReq.Header.Set("User-Agent", req.Header.Get("User-Agent"))
		for _, c := range cookies {
			updateReq.AddCookie(c)
		}
		updateResp, err := client.Do(updateReq)
		if err == nil {
			updateResp.Body.Close()
		}
	}

	// 3. POST to chillsplayer.php, trying multiple servers if needed
	playerURL := "https://phimmoichill.my/chillsplayer.php"
	var streamHash string

	for sv := 0; sv <= 3; sv++ {
		data := url.Values{}
		data.Set("qcao", episodeID)
		if sv > 0 {
			data.Set("sv", fmt.Sprintf("%d", sv))
		}

		reqPost, err := http.NewRequest("POST", playerURL, strings.NewReader(data.Encode()))
		if err != nil {
			continue
		}
		reqPost.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		reqPost.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		reqPost.Header.Set("Referer", pageURL)
		reqPost.Header.Set("Origin", "https://phimmoichill.my")
		reqPost.Header.Set("X-Requested-With", "XMLHttpRequest")
		for _, c := range cookies {
			reqPost.AddCookie(c)
		}

		respPost, err := client.Do(reqPost)
		if err != nil {
			continue
		}

		playerBodyBytes, err := io.ReadAll(respPost.Body)
		respPost.Body.Close()
		if err != nil {
			continue
		}
		playerBody := string(playerBodyBytes)

		// 4. Extract Hash or Playlist URL
		reHash := regexp.MustCompile(`src="https://pmc\.phimmoichill\.my/player/index\.php\?id=([^"&]+)"`)
		matchesHash := reHash.FindStringSubmatch(playerBody)
		if len(matchesHash) > 1 {
			streamHash = matchesHash[1]
			break
		}

		reIni := regexp.MustCompile(`iniPlayers\("([^"]+)"`)
		matchesIni := reIni.FindStringSubmatch(playerBody)
		if len(matchesIni) > 1 {
			streamHash = matchesIni[1]
			break
		}
	}

	if streamHash == "" {
		return nil, fmt.Errorf("failed to extract stream hash from player response after trying all servers")
	}

	// 5. Construct HLS URL
	streamURL := fmt.Sprintf("https://sotrim.topphimmoi.org/mpeg/%s/index.m3u8", streamHash)

	title := "Unknown Title"
	reTitle := regexp.MustCompile(`<title>(.*?)</title>`)
	if match := reTitle.FindStringSubmatch(body); len(match) > 1 {
		title = strings.Replace(match[1], " - PhimMoiChill", "", -1)
	}

	return &VideoInfo{
		Title:      title,
		StreamURL:  streamURL,
		FormatID:   "hls",
		Resolution: "Auto",
		Ext:        "m3u8",
	}, nil
}
