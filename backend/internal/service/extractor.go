package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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
	if strings.Contains(url, "phim30.me") {
		// Currently returning the URL as-is, letting yt-dlp attempt extraction
		// or allowing the frontend iframe to handle it directly if it's embeddable
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
