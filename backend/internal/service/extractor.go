package service

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
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

type VideoExtractor struct{}

func NewVideoExtractor() *VideoExtractor {
	return &VideoExtractor{}
}

func (e *VideoExtractor) Extract(url string, quality string) (*VideoInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	log.Printf("[extractor] Attempting generic embed extraction for: %s", url)
	if streamURL, err := e.parseGenericEmbed(ctx, url); err == nil && streamURL != "" {
		log.Printf("[extractor] Generic embed extracted direct stream: %s", streamURL)
		ext := "m3u8"
		if strings.Contains(streamURL, ".mp4") {
			ext = "mp4"
		}
		return &VideoInfo{
			StreamURL:  streamURL,
			Resolution: "HD",
			Ext:        ext,
			FormatID:   ext,
		}, nil
	}

	if strings.Contains(url, "streamc.xyz") {
		log.Printf("[extractor] streamc.xyz URL detected: %s", url)
		return e.extractStreamC(ctx, url, quality)
	}

	if strings.Contains(url, "phim30.me") {
		log.Printf("[extractor] phim30.me URL detected: %s", url)
		return e.extractPhim30(ctx, url)
	}

	log.Printf("[extractor] yt-dlp extraction for: %s", url)
	return e.extractWithYtDlp(ctx, url, quality)
}

func (e *VideoExtractor) parseGenericEmbed(ctx context.Context, embedURL string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", embedURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "*/*")
	req.Header.Set("Referer", embedURL)

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{
		Transport: tr,
		Timeout:   20 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	htmlContent := string(body)
	htmlContent = strings.ReplaceAll(htmlContent, `\/`, `/`)

	m3u8Regex := regexp.MustCompile(`https?://[^\s"'<>]+\.m3u8[^\s"'<>]*`)
	if match := m3u8Regex.FindString(htmlContent); match != "" {
		return match, nil
	}

	mp4Regex := regexp.MustCompile(`https?://[^\s"'<>]+\.mp4[^\s"'<>]*`)
	if match := mp4Regex.FindString(htmlContent); match != "" {
		return match, nil
	}

	return "", fmt.Errorf("no direct stream URL found in embed page")
}

func (e *VideoExtractor) extractStreamC(ctx context.Context, url string, quality string) (*VideoInfo, error) {
	info, err := e.extractWithYtDlp(ctx, url, quality)
	if err == nil && info.StreamURL != "" && info.Ext != "embed" {
		log.Printf("[extractor] streamc.xyz extracted via yt-dlp: %s", info.StreamURL)
		return info, nil
	}
	log.Printf("[extractor] streamc.xyz yt-dlp failed (%v), parsing embed page", err)
	extracted, parseErr := e.parseStreamCEmbed(ctx, url)
	if parseErr == nil && extracted != "" {
		return &VideoInfo{
			StreamURL:  extracted,
			Resolution: "unknown",
			Ext:        "mp4",
		}, nil
	}
	log.Printf("[extractor] streamc.xyz embed parse failed (%v), returning as embed", parseErr)
	return &VideoInfo{
		StreamURL:  url,
		Ext:        "embed",
		FormatID:   "embed",
		Resolution: "unknown",
	}, nil
}

func (e *VideoExtractor) parseStreamCEmbed(ctx context.Context, url string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://phim.nguonc.com/")

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{
		Transport: tr,
		Timeout:   15 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("status %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return "", err
	}

	if src, exists := doc.Find("video").Attr("src"); exists && src != "" {
		return src, nil
	}
	if src, exists := doc.Find("source").Attr("src"); exists && src != "" {
		return src, nil
	}
	if src, exists := doc.Find("iframe").Attr("src"); exists && src != "" {
		if strings.Contains(src, ".m3u8") || strings.Contains(src, ".mp4") {
			return src, nil
		}
	}

	var found string
	doc.Find("script").Each(func(i int, s *goquery.Selection) {
		if found != "" {
			return
		}
		text := s.Text()
		for _, pattern := range []string{"file:", "src:", "source:", "url:"} {
			idx := strings.Index(text, pattern)
			if idx == -1 {
				continue
			}
			rest := text[idx+len(pattern):]
			rest = strings.TrimSpace(rest)
			rest = strings.Trim(rest, "\"',")
			if strings.HasPrefix(rest, "http") && (strings.Contains(rest, ".m3u8") || strings.Contains(rest, ".mp4")) {
				found = rest
				return
			}
		}
	})

	return found, nil
}

func (e *VideoExtractor) extractPhim30(ctx context.Context, url string) (*VideoInfo, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create phim30 request: %v", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{
		Transport: tr,
		Timeout:   30 * time.Second,
	}
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

	if src, exists := doc.Find("iframe").Attr("src"); exists && src != "" {
		if strings.Contains(src, ".m3u8") || strings.Contains(src, ".mp4") {
			return &VideoInfo{StreamURL: src, Resolution: "unknown"}, nil
		}
	}

	return nil, fmt.Errorf("could not find stream URL on phim30 page")
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
