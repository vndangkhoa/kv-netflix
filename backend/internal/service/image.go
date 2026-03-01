package service

import (
	"bytes"
	"crypto/md5"
	"crypto/tls"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/image/draw"
)

const CacheDir = "cache/images"

type ImageService struct {
	client *http.Client
}

func NewImageService() *ImageService {
	os.MkdirAll(CacheDir, 0755)

	// Use custom transport to skip SSL verification
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}

	return &ImageService{
		client: &http.Client{
			Transport: tr,
			Timeout:   15 * time.Second,
		},
	}
}

func (s *ImageService) GetProxiedImage(url string, width int) ([]byte, string, error) {
	hash := md5.Sum([]byte(fmt.Sprintf("%s_%d", url, width)))
	cacheKey := fmt.Sprintf("%x.jpg", hash)
	cachePath := filepath.Join(CacheDir, cacheKey)

	// Check cache
	if _, err := os.Stat(cachePath); err == nil {
		data, err := os.ReadFile(cachePath)
		if err == nil {
			return data, "image/jpeg", nil
		}
	}

	// Fetch with custom request to set headers
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://ophim1.com/")

	resp, err := s.client.Do(req)
	if err != nil {
		fmt.Printf("GetProxiedImage fetch error: %v\n", err)
		return nil, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		fmt.Printf("GetProxiedImage status error: %d for url: %s\n", resp.StatusCode, url)
		return nil, "", fmt.Errorf("image fetch failed: %d", resp.StatusCode)
	}

	// Decode
	var img image.Image
	contentType := resp.Header.Get("Content-Type")

	switch contentType {
	case "image/jpeg":
		img, err = jpeg.Decode(resp.Body)
	case "image/png":
		img, err = png.Decode(resp.Body)
	default:
		// Attempt agnostic decode
		img, _, err = image.Decode(resp.Body)
	}

	if err != nil {
		fmt.Printf("GetProxiedImage decode error: %v for content-type: %s and url: %s\n", err, contentType, url)
		return nil, "", fmt.Errorf("decode error: %v", err)
	}

	// Resize if needed
	if width > 0 && img.Bounds().Dx() > width {
		bounds := img.Bounds()
		ratio := float64(width) / float64(bounds.Dx())
		height := int(float64(bounds.Dy()) * ratio)

		dst := image.NewRGBA(image.Rect(0, 0, width, height))
		draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
		img = dst
	}

	// Encode to JPEG
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 80}); err != nil {
		return nil, "", fmt.Errorf("jpeg encode error: %v", err)
	}

	jpegData := buf.Bytes()

	// Write cache
	os.WriteFile(cachePath, jpegData, 0644)

	return jpegData, "image/jpeg", nil
}
