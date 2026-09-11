package service

import (
	"strings"
	"testing"
)

func TestCleanVttOutput(t *testing.T) {
	raw := "```vtt\nWEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nXin chào\n```"
	cleaned := cleanVttOutput(raw)
	if strings.Contains(cleaned, "```") {
		t.Errorf("Expected markdown code blocks to be removed, got: %s", cleaned)
	}
	if !strings.HasPrefix(cleaned, "WEBVTT") {
		t.Errorf("Expected WEBVTT header, got: %s", cleaned)
	}
}

func TestSplitAndMergeVttChunks(t *testing.T) {
	vtt := `WEBVTT

1
00:00:01.000 --> 00:00:03.000
오빠, 밥 먹었어?

2
00:00:04.000 --> 00:00:06.000
응, 방금 먹었어.

3
00:00:07.000 --> 00:00:09.000
빨리 가자!`

	chunks := splitVttIntoChunks(vtt, 2)
	if len(chunks) != 2 {
		t.Fatalf("Expected 2 chunks, got %d", len(chunks))
	}

	merged := mergeVttChunks(chunks)
	if !strings.HasPrefix(merged, "WEBVTT") {
		t.Errorf("Expected merged VTT to start with WEBVTT")
	}
	if !strings.Contains(merged, "오빠, 밥 먹었어?") || !strings.Contains(merged, "빨리 가자!") {
		t.Errorf("Merged VTT missing content: %s", merged)
	}
}
