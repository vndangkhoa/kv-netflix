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
	"sync"
	"time"

	"golang.org/x/image/draw"
)

const CacheDir = "cache/images"

type cacheEntry struct {
	data        []byte
	contentType string
	created     time.Time
}

type ImageService struct {
	client      *http.Client
	memCache    map[string]*cacheEntry
	memCacheMu  sync.RWMutex
	memCacheMax int
}

func NewImageService() *ImageService {
	os.MkdirAll(CacheDir, 0755)

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:    20,
		IdleConnTimeout: 90 * time.Second,
	}

	svc := &ImageService{
		client: &http.Client{
			Transport: tr,
			Timeout:   10 * time.Second,
		},
		memCache:    make(map[string]*cacheEntry),
		memCacheMax: 500,
	}

	// Evict stale memcache entries periodically
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			svc.evictMemCache()
		}
	}()

	return svc
}

func (s *ImageService) evictMemCache() {
	s.memCacheMu.Lock()
	defer s.memCacheMu.Unlock()
	cutoff := time.Now().Add(-10 * time.Minute)
	for k, v := range s.memCache {
		if v.created.Before(cutoff) {
			delete(s.memCache, k)
		}
	}
}

func (s *ImageService) GetProxiedImage(url string, width int) ([]byte, string, error) {
	hash := md5.Sum([]byte(fmt.Sprintf("%s_%d", url, width)))
	cacheKey := fmt.Sprintf("%x", hash)

	// 1. Check in-memory cache (fast path)
	s.memCacheMu.RLock()
	if entry, ok := s.memCache[cacheKey]; ok {
		s.memCacheMu.RUnlock()
		return entry.data, entry.contentType, nil
	}
	s.memCacheMu.RUnlock()

	// 2. Check disk cache
	cachePath := filepath.Join(CacheDir, cacheKey+".jpg")
	if data, err := os.ReadFile(cachePath); err == nil {
		s.setMemCache(cacheKey, data, "image/jpeg")
		return data, "image/jpeg", nil
	}

	// 3. Fetch from upstream
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://ophim1.com/")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, "", fmt.Errorf("image fetch failed: %d", resp.StatusCode)
	}

	// 4. Decode
	var img image.Image
	contentType := resp.Header.Get("Content-Type")

	switch contentType {
	case "image/jpeg":
		img, err = jpeg.Decode(resp.Body)
	case "image/png":
		img, err = png.Decode(resp.Body)
	default:
		img, _, err = image.Decode(resp.Body)
	}

	if err != nil {
		return nil, "", fmt.Errorf("decode error: %v", err)
	}

	// 5. Resize if needed (skip if already small enough)
	bounds := img.Bounds()
	if width > 0 && bounds.Dx() > width {
		ratio := float64(width) / float64(bounds.Dx())
		height := int(float64(bounds.Dy()) * ratio)

		dst := image.NewRGBA(image.Rect(0, 0, width, height))
		// Use NearestNeighbor for tiny thumbnails (fast), CatmullRom for larger
		if width <= 200 {
			draw.NearestNeighbor.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
		} else {
			draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
		}
		img = dst
	}

	// 6. Encode to JPEG with adaptive quality
	quality := 80
	if width <= 200 {
		quality = 60 // Lower quality for small thumbnails = much smaller files
	} else if width <= 400 {
		quality = 70
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
		return nil, "", fmt.Errorf("jpeg encode error: %v", err)
	}

	jpegData := buf.Bytes()

	// 7. Write to disk cache (async)
	go os.WriteFile(cachePath, jpegData, 0644)

	// 8. Store in memory cache
	s.setMemCache(cacheKey, jpegData, "image/jpeg")

	return jpegData, "image/jpeg", nil
}

func (s *ImageService) setMemCache(key string, data []byte, contentType string) {
	s.memCacheMu.Lock()
	defer s.memCacheMu.Unlock()

	// Evict oldest if at capacity
	if len(s.memCache) >= s.memCacheMax {
		var oldestKey string
		var oldestTime time.Time
		for k, v := range s.memCache {
			if oldestKey == "" || v.created.Before(oldestTime) {
				oldestKey = k
				oldestTime = v.created
			}
		}
		if oldestKey != "" {
			delete(s.memCache, oldestKey)
		}
	}

	s.memCache[key] = &cacheEntry{
		data:        data,
		contentType: contentType,
		created:     time.Now(),
	}
}
