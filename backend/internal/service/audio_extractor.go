package service

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type AudioExtractor struct {
	UserAgent string
}

func NewAudioExtractor() *AudioExtractor {
	return &AudioExtractor{
		UserAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	}
}

// ExtractAudio extracts compressed 16kHz mono 32k MP3 audio from a video stream URL (e.g. HLS m3u8)
// outputDir is where the temporary mp3 will be saved.
// maxDurationSec can limit duration (0 = full audio).
func (e *AudioExtractor) ExtractAudio(ctx context.Context, streamURL string, outputDir string, maxDurationSec int) (string, error) {
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create audio output dir: %w", err)
	}

	tempFile := filepath.Join(outputDir, fmt.Sprintf("audio_%d.mp3", time.Now().UnixNano()))

	referer := "https://phimmoichill.my/"
	if parsed, err := url.Parse(streamURL); err == nil && parsed.Scheme != "" && parsed.Host != "" {
		referer = fmt.Sprintf("%s://%s/", parsed.Scheme, parsed.Host)
	}

	args := []string{
		"-y",
		"-allowed_extensions", "ALL",
		"-allowed_segment_extensions", "ALL",
		"-extension_picky", "0",
		"-user_agent", e.UserAgent,
		"-headers", fmt.Sprintf("Referer: %s\r\nOrigin: %s\r\n", referer, referer),
	}

	if maxDurationSec > 0 {
		args = append(args, "-t", fmt.Sprintf("%d", maxDurationSec))
	}

	args = append(args,
		"-i", streamURL,
		"-vn",
		"-ac", "1",
		"-ar", "16000",
		"-b:a", "32k",
		"-f", "mp3",
		tempFile,
	)

	log.Printf("[audio_extractor] Extracting audio from %s to %s", streamURL, tempFile)

	cmd := exec.CommandContext(ctx, "ffmpeg", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		_ = os.Remove(tempFile)
		return "", fmt.Errorf("ffmpeg audio extraction failed: %v, output: %s", err, string(output))
	}

	fileInfo, err := os.Stat(tempFile)
	if err != nil || fileInfo.Size() == 0 {
		_ = os.Remove(tempFile)
		return "", fmt.Errorf("extracted audio file is empty or missing")
	}

	log.Printf("[audio_extractor] Successfully extracted audio: %s (size: %.2f MB)", tempFile, float64(fileInfo.Size())/(1024*1024))
	return tempFile, nil
}
