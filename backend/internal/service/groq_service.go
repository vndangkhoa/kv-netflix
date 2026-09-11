package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type GroqService struct {
	APIKey         string
	HTTPClient     *http.Client
	AudioExtractor *AudioExtractor
}

func NewGroqService(apiKey string) *GroqService {
	return &GroqService{
		APIKey: apiKey,
		HTTPClient: &http.Client{
			Timeout: 180 * time.Second, // Long timeout for audio upload & transcription
		},
		AudioExtractor: NewAudioExtractor(),
	}
}

// TranscribeAudio calls Groq Cloud Whisper Large-v3 to transcribe audio into WebVTT
func (g *GroqService) TranscribeAudio(ctx context.Context, audioPath string, sourceLang string) (string, error) {
	if g.APIKey == "" {
		return "", fmt.Errorf("GROQ_API_KEY is not configured")
	}

	file, err := os.Open(audioPath)
	if err != nil {
		return "", fmt.Errorf("failed to open audio file: %w", err)
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", filepath.Base(audioPath))
	if err != nil {
		return "", fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err := io.Copy(part, file); err != nil {
		return "", fmt.Errorf("failed to copy audio data: %w", err)
	}

	_ = writer.WriteField("model", "whisper-large-v3")
	_ = writer.WriteField("response_format", "vtt")
	_ = writer.WriteField("temperature", "0")

	if sourceLang != "" {
		_ = writer.WriteField("language", sourceLang)
	}

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close multipart writer: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.groq.com/openai/v1/audio/transcriptions", body)
	if err != nil {
		return "", fmt.Errorf("failed to create groq request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+g.APIKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	log.Printf("[groq_service] Sending audio to Groq Whisper Large-v3 (size: %.2f MB)...", float64(body.Len())/(1024*1024))
	resp, err := g.HTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("groq transcription request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read groq response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("groq transcription returned error (status %d): %s", resp.StatusCode, string(respBody))
	}

	vtt := string(respBody)
	if !strings.HasPrefix(strings.TrimSpace(vtt), "WEBVTT") {
		vtt = "WEBVTT\n\n" + vtt
	}

	log.Printf("[groq_service] Whisper transcription successful (%d bytes)", len(vtt))
	return vtt, nil
}

type groqChatRequest struct {
	Model       string            `json:"model"`
	Messages    []groqChatMessage `json:"messages"`
	Temperature float32           `json:"temperature"`
}

type groqChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// TranslateSubtitles translates WebVTT cues (e.g. Korean to Vietnamese) using Groq Llama 3.3 70B
func (g *GroqService) TranslateSubtitles(ctx context.Context, vttContent string, fromLang string, toLang string) (string, error) {
	if g.APIKey == "" {
		return "", fmt.Errorf("GROQ_API_KEY is not configured")
	}

	if fromLang == "" {
		fromLang = "Korean"
	}
	if toLang == "" || toLang == "vi" {
		toLang = "Vietnamese (Vietsub)"
	}

	systemPrompt := fmt.Sprintf(`You are an expert movie and television subtitle translator specializing in %s to %s translation.
Translate the provided WebVTT subtitle text into natural, colloquial Vietnamese suitable for cinematic dialogue.

CRITICAL RULES:
1. Output ONLY the translated WebVTT content starting with "WEBVTT". Do NOT wrap in markdown codeblocks (no `+"```"+`), do NOT add introductory or concluding remarks.
2. PRESERVE every timestamp line (e.g. 00:00:12.345 --> 00:00:15.678) and cue sequence number EXACTLY unchanged.
3. Natural Vietnamese pronouns (Đại từ nhân xưng):
   - Use contextually appropriate pronouns (anh/em, cô/cậu, mày/tao, bác/cháu, sếp/tôi, bố/mẹ/con). Avoid robotic "tôi / bạn".
4. Translate idioms, emotional exclamations, and slang naturally into everyday Vietnamese dialogue.`, fromLang, toLang)

	// If the WebVTT is large, we can translate in chunks of cues to avoid token limits
	cues := splitVttIntoChunks(vttContent, 100) // ~100 cues per chunk (~15-20 mins of dialogue)
	var translatedChunks []string

	for i, chunk := range cues {
		log.Printf("[groq_service] Translating chunk %d/%d with Llama 3.3 70B...", i+1, len(cues))
		reqData := groqChatRequest{
			Model:       "llama-3.3-70b-versatile",
			Temperature: 0.3,
			Messages: []groqChatMessage{
				{Role: "system", Content: systemPrompt},
				{Role: "user", Content: chunk},
			},
		}

		jsonData, err := json.Marshal(reqData)
		if err != nil {
			return "", fmt.Errorf("failed to marshal groq chat request: %w", err)
		}

		req, err := http.NewRequestWithContext(ctx, "POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(jsonData))
		if err != nil {
			return "", fmt.Errorf("failed to create chat request: %w", err)
		}

		req.Header.Set("Authorization", "Bearer "+g.APIKey)
		req.Header.Set("Content-Type", "application/json")

		resp, err := g.HTTPClient.Do(req)
		if err != nil {
			return "", fmt.Errorf("groq translation request failed: %w", err)
		}
		defer resp.Body.Close()

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return "", fmt.Errorf("failed to read groq chat response: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("groq translation failed (status %d): %s", resp.StatusCode, string(respBody))
		}

		var chatResp groqChatResponse
		if err := json.Unmarshal(respBody, &chatResp); err != nil {
			return "", fmt.Errorf("failed to parse groq chat response: %w", err)
		}

		if len(chatResp.Choices) == 0 {
			return "", fmt.Errorf("groq returned no choices in response")
		}

		chunkResult := cleanVttOutput(chatResp.Choices[0].Message.Content)
		translatedChunks = append(translatedChunks, chunkResult)
	}

	finalVTT := mergeVttChunks(translatedChunks)
	log.Printf("[groq_service] Subtitle translation completed successfully (%d bytes)", len(finalVTT))
	return finalVTT, nil
}

func cleanVttOutput(content string) string {
	cleaned := strings.TrimSpace(content)
	// Remove markdown backticks if present
	if strings.HasPrefix(cleaned, "```vtt") {
		cleaned = strings.TrimPrefix(cleaned, "```vtt")
	} else if strings.HasPrefix(cleaned, "```") {
		cleaned = strings.TrimPrefix(cleaned, "```")
	}
	if strings.HasSuffix(cleaned, "```") {
		cleaned = strings.TrimSuffix(cleaned, "```")
	}
	return strings.TrimSpace(cleaned)
}

func splitVttIntoChunks(vtt string, cuesPerChunk int) []string {
	lines := strings.Split(vtt, "\n")
	var chunks []string
	var currentChunk []string
	cueCount := 0

	for _, line := range lines {
		if strings.Contains(line, "-->") {
			cueCount++
			if cueCount > cuesPerChunk && len(currentChunk) > 0 {
				chunks = append(chunks, strings.Join(currentChunk, "\n"))
				currentChunk = []string{}
				cueCount = 1
			}
		}
		currentChunk = append(currentChunk, line)
	}

	if len(currentChunk) > 0 {
		chunks = append(chunks, strings.Join(currentChunk, "\n"))
	}

	if len(chunks) == 0 {
		return []string{vtt}
	}
	return chunks
}

func mergeVttChunks(chunks []string) string {
	var sb strings.Builder
	sb.WriteString("WEBVTT\n\n")

	for _, chunk := range chunks {
		lines := strings.Split(chunk, "\n")
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed == "WEBVTT" || strings.HasPrefix(trimmed, "NOTE") {
				continue
			}
			sb.WriteString(line)
			sb.WriteString("\n")
		}
	}

	return strings.TrimSpace(sb.String()) + "\n"
}
