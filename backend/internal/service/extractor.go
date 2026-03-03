package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
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
	if strings.Contains(url, "phim30.me") {
		req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create phim30 request: %v", err)
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch phim30 page: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("phim30 returned status: %d", resp.StatusCode)
		}

		doc, err := goquery.NewDocumentFromReader(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to parse phim30 page: %v", err)
		}

		streamURL, _ := doc.Find("[data-movie-player-src-value]").Attr("data-movie-player-src-value")
		if streamURL != "" {
			return &VideoInfo{
				StreamURL:  streamURL,
				Resolution: "unknown",
			}, nil
		}
		return nil, fmt.Errorf("could not find stream URL on phim30 page")
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
