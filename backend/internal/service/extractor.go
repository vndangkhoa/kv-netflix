package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"
)

type VideoInfo struct {
	Title      string `json:"title"`
	Thumbnail  string `json:"thumbnail"`
	Duration   int    `json:"duration"`
	StreamURL  string `json:"url"`
	FormatID   string `json:"format_id"`
	Resolution string `json:"resolution"`
	Ext        string `json:"ext"`
}

type VideoExtractor struct {
	resolver *embedResolver
}

func NewVideoExtractor() *VideoExtractor {
	return &VideoExtractor{resolver: newEmbedResolver()}
}

// Extract resolves a provider URL (direct HLS/MP4 or third-party embed page)
// into a playable stream. Pipeline:
//  1. Direct stream URL          -> returned as-is
//  2. Embed crawler (server-side)-> walks nested iframes + player JS, probes result
//  3. yt-dlp                     -> strongest single-shot resolver
//  4. Last resort                -> returns the embed URL itself for web iframes
//
// Clients that cannot render embeds (Android TV / mobile) receive a direct
// m3u8/mp4 URL from stage 2/3 in almost all cases.
func (e *VideoExtractor) Extract(url string, quality string) (*VideoInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	// 1) Direct provider URLs pass straight through.
	lower := strings.ToLower(url)
	if strings.Contains(lower, ".m3u8") || strings.Contains(lower, ".mp4") {
		ext := extOfStream(url)
		return &VideoInfo{
			StreamURL:  url,
			Resolution: "HD",
			Ext:        ext,
			FormatID:   ext,
		}, nil
	}

	// 2) Embed crawler: server-side resolution of nested iframes/JS.
	log.Printf("[extractor] resolving embed page: %s", url)
	if streamURL, ext := e.resolver.ResolveDirectStream(ctx, url); streamURL != "" {
		log.Printf("[extractor] embed resolved to direct stream: %s", streamURL)
		formatID := ext
		resolution := "HD"
		return &VideoInfo{
			StreamURL:  streamURL,
			Resolution: resolution,
			Ext:        ext,
			FormatID:   formatID,
		}, nil
	}

	// 3) yt-dlp as the heavy-duty fallback (handles protected players,
	//    DRM-less obfuscation, known extractors the crawler cannot reach).
	//    Skipped for streamc.xyz embeds: their stream is decrypted in-page by
	//    their own player JS, so the only usable result is the embed itself.
	log.Printf("[extractor] embed crawler failed, trying yt-dlp for: %s", url)
	if !strings.Contains(lower, "streamc.xyz") {
		if info, err := e.extractWithYtDlp(ctx, url, quality); err == nil && info.StreamURL != "" && info.Ext != "embed" {
			return info, nil
		}
	}

	// 4) Last resort: hand the embed back to the client (web iframe only).
	log.Printf("[extractor] all resolution paths failed, returning embed URL as-is: %s", url)
	return &VideoInfo{
		StreamURL:  url,
		Ext:        "embed",
		FormatID:   "embed",
		Resolution: "unknown",
	}, nil
}

func (e *VideoExtractor) extractWithYtDlp(ctx context.Context, url string, quality string) (*VideoInfo, error) {
	formatSelector := "bestvideo+bestaudio/best"
	if quality != "" {
		height := strings.Replace(quality, "p", "", -1)
		formatSelector = fmt.Sprintf("bestvideo[height<=%s]+bestaudio/best[height<=%s]/best", height, height)
	}

	args := []string{
		"--dump-json",
		"--no-playlist",
		"--no-warnings",
		"--no-check-certificates",
		"--extractor-retries", "2",
		"--format", formatSelector,
		url,
	}

	ytDlpCmd := "yt-dlp"
	if _, err := os.Stat("yt-dlp.exe"); err == nil {
		ytDlpCmd = "yt-dlp.exe"
	}

	cmd := exec.CommandContext(ctx, ytDlpCmd, args...)
	output, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return nil, fmt.Errorf("yt-dlp failed (exit %d): %s", exitErr.ExitCode(), string(exitErr.Stderr))
		}
		return nil, fmt.Errorf("yt-dlp execution failed: %v", err)
	}

	var info VideoInfo
	if err := json.Unmarshal(output, &info); err != nil {
		return nil, fmt.Errorf("yt-dlp JSON parse error: %v", err)
	}

	var rawData map[string]interface{}
	json.Unmarshal(output, &rawData)

	if h, ok := rawData["height"].(float64); ok {
		info.Resolution = fmt.Sprintf("%dp", int(h))
	} else if info.Resolution == "" {
		info.Resolution = "unknown"
	}

	if info.StreamURL == "" {
		if u, ok := rawData["url"].(string); ok {
			info.StreamURL = u
		}
	}

	if info.Ext == "" {
		if ext, ok := rawData["ext"].(string); ok {
			info.Ext = ext
		}
	}

	log.Printf("[extractor] yt-dlp result: url=%s ext=%s resolution=%s", info.StreamURL, info.Ext, info.Resolution)
	return &info, nil
}
