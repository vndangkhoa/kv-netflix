package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"streamflow-backend/internal/database"
	"streamflow-backend/internal/models"
	"streamflow-backend/internal/scraper"
	"streamflow-backend/internal/service"

	"regexp"
	"sync"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	Repo      *database.VideoRepository
	Providers []scraper.MovieProvider
	TMDB      *service.TMDBService
	Extractor *service.VideoExtractor
	Image     *service.ImageService
}

func NewHandler(
	repo *database.VideoRepository,
	providers []scraper.MovieProvider,
	tmdb *service.TMDBService,
	extractor *service.VideoExtractor,
	image *service.ImageService,
) *Handler {
	return &Handler{
		Repo:      repo,
		Providers: providers,
		TMDB:      tmdb,
		Extractor: extractor,
		Image:     image,
	}
}

func (h *Handler) GetHomeVideos(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	category := r.URL.Query().Get("category")

	var providerResults [][]models.RophimMovie
	maxLen := 0
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, provider := range h.Providers {
		wg.Add(1)
		go func(p scraper.MovieProvider) {
			defer wg.Done()
			movies, err := p.GetMoviesByCategory(category, page)
			if err == nil {
				mu.Lock()
				providerResults = append(providerResults, movies)
				if len(movies) > maxLen {
					maxLen = len(movies)
				}
				mu.Unlock()
			}
		}(provider)
	}
	wg.Wait()

	if len(providerResults) == 0 {
		json.NewEncoder(w).Encode([]models.RophimMovie{})
		return
	}

	var allMovies []models.RophimMovie
	seenID := make(map[string]int)
	seenTitle := make(map[string]int)

	// Interleave results and deduplicate
	for i := 0; i < maxLen; i++ {
		for _, movies := range providerResults {
			if i < len(movies) {
				movie := movies[i]

				// Dedup by ID
				if idx, found := seenID[movie.ID]; found {
					h.mergeMovieMetadata(&allMovies[idx], &movie)
					continue
				}

				// Dedup by Title
				titleKey := normalizeKey(movie.OriginalTitle)
				if titleKey == "" {
					titleKey = normalizeKey(movie.Title)
				}
				if idx, found := seenTitle[titleKey]; found && titleKey != "" {
					h.mergeMovieMetadata(&allMovies[idx], &movie)
					continue
				}

				allMovies = append(allMovies, movie)
				currIdx := len(allMovies) - 1
				seenID[movie.ID] = currIdx
				if titleKey != "" {
					seenTitle[titleKey] = currIdx
				}
			}
		}
	}

	json.NewEncoder(w).Encode(allMovies)
}

func (h *Handler) SearchVideos(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "query parameter required", http.StatusBadRequest)
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	var providerResults [][]models.RophimMovie
	maxLen := 0
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, provider := range h.Providers {
		wg.Add(1)
		go func(p scraper.MovieProvider) {
			defer wg.Done()
			movies, err := p.Search(query, page)
			if err == nil {
				mu.Lock()
				providerResults = append(providerResults, movies)
				if len(movies) > maxLen {
					maxLen = len(movies)
				}
				mu.Unlock()
			}
		}(provider)
	}
	wg.Wait()

	var allMovies []models.RophimMovie
	seenID := make(map[string]int)
	seenTitle := make(map[string]int)

	for i := 0; i < maxLen; i++ {
		for _, movies := range providerResults {
			if i < len(movies) {
				movie := movies[i]

				if idx, found := seenID[movie.ID]; found {
					h.mergeMovieMetadata(&allMovies[idx], &movie)
					continue
				}

				titleKey := normalizeKey(movie.OriginalTitle)
				if titleKey == "" {
					titleKey = normalizeKey(movie.Title)
				}
				if idx, found := seenTitle[titleKey]; found && titleKey != "" {
					h.mergeMovieMetadata(&allMovies[idx], &movie)
					continue
				}

				allMovies = append(allMovies, movie)
				currIdx := len(allMovies) - 1
				seenID[movie.ID] = currIdx
				if titleKey != "" {
					seenTitle[titleKey] = currIdx
				}
			}
		}
	}

	json.NewEncoder(w).Encode(allMovies)
}

func (h *Handler) ExtractVideo(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Direct HLS check: if URL ends with .m3u8, just return it as source
	// But the frontend usually calls this if it needs to extract.
	// If frontend handles m3u8 directly (as planned), this is fallback.

	info, err := h.Extractor.Extract(req.URL, "1080p")
	if err != nil {
		fmt.Printf("Extraction error: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(info)
}

func (h *Handler) ProxyImage(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	width, _ := strconv.Atoi(r.URL.Query().Get("width"))

	if url == "" {
		http.Error(w, "url parameter required", http.StatusBadRequest)
		return
	}

	data, contentType, err := h.Image.GetProxiedImage(url, width)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Write(data)
}

func (h *Handler) GetMovieDetail(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		http.Error(w, "slug required", http.StatusBadRequest)
		return
	}

	var primaryMovie *models.RophimMovie
	var primaryProviderIdx int = -1
	var success bool

	// 1. Find the primary movie from the provider that owns this slug
	for i, provider := range h.Providers {
		movie, err := provider.GetMovieDetail(slug)
		if err == nil && movie != nil {
			primaryMovie = movie
			primaryProviderIdx = i
			success = true
			break
		}
	}

	if !success || primaryMovie == nil {
		http.Error(w, "movie not found", http.StatusNotFound)
		return
	}

	// 2. Try to find the same movie in other providers to get more episodes
	for i, provider := range h.Providers {
		if i == primaryProviderIdx {
			continue
		}

		// Search by OriginalTitle or Title
		searchQuery := primaryMovie.OriginalTitle
		if searchQuery == "" {
			searchQuery = primaryMovie.Title
		}

		results, err := provider.Search(searchQuery, 1)
		if err == nil {
			for _, res := range results {
				// Fuzzy match on normalized title
				if normalizeKey(res.Title) == normalizeKey(primaryMovie.Title) ||
					(primaryMovie.OriginalTitle != "" && normalizeKey(res.OriginalTitle) == normalizeKey(primaryMovie.OriginalTitle)) {
					// Found a match! Get details to retrieve episodes
					details, err := provider.GetMovieDetail(res.Slug)
					if err == nil && details != nil {
						h.mergeMovieMetadata(primaryMovie, details)
					}
					break // Only one match per provider
				}
			}
		}
	}

	// 3. Sort episodes numerically
	// 3. Sort episodes numerically
	sort.Slice(primaryMovie.Episodes, func(i, j int) bool {
		return primaryMovie.Episodes[i].Number < primaryMovie.Episodes[j].Number
	})

	// Final pass: Consolidate episodes by number to remove duplicates from single provider (e.g. Ophim multi-server)
	// We re-build the slice, keeping only the first occurrence of each episode number.
	if len(primaryMovie.Episodes) > 0 {
		uniqueEps := make([]models.Episode, 0)
		seenEpNums := make(map[int]bool)
		for _, ep := range primaryMovie.Episodes {
			if !seenEpNums[ep.Number] {
				seenEpNums[ep.Number] = true
				uniqueEps = append(uniqueEps, ep)
			}
		}
		primaryMovie.Episodes = uniqueEps
	}

	json.NewEncoder(w).Encode(primaryMovie)
}

func (h *Handler) GetGenres(w http.ResponseWriter, r *http.Request) {
	for _, p := range h.Providers {
		if gp, ok := p.(interface {
			GetGenres() ([]models.Category, error)
		}); ok {
			genres, err := gp.GetGenres()
			if err == nil {
				json.NewEncoder(w).Encode(genres)
				return
			}
		}
	}
	http.Error(w, "not found", http.StatusNotFound)
}

func (h *Handler) GetCountries(w http.ResponseWriter, r *http.Request) {
	for _, p := range h.Providers {
		if cp, ok := p.(interface {
			GetCountries() ([]models.Category, error)
		}); ok {
			countries, err := cp.GetCountries()
			if err == nil {
				json.NewEncoder(w).Encode(countries)
				return
			}
		}
	}
	http.Error(w, "not found", http.StatusNotFound)
}

func (h *Handler) StreamVideo(w http.ResponseWriter, r *http.Request) {
	videoURL := r.URL.Query().Get("url")
	if videoURL == "" {
		http.Error(w, "url required", http.StatusBadRequest)
		return
	}

	// Create request to upstream video server
	req, err := http.NewRequest("GET", videoURL, nil)
	if err != nil {
		http.Error(w, "invalid url", http.StatusBadRequest)
		return
	}

	// Set headers to mimic browser request
	req.Header.Set("Referer", "https://phimmoichill.my/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Range", r.Header.Get("Range"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "upstream error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Check if this is a manifest (.m3u8)
	if strings.Contains(videoURL, ".m3u8") {
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Printf("Stream proxy read error: %v\n", err)
			http.Error(w, "read error", http.StatusInternalServerError)
			return
		}

		content := string(body)

		// Regex to find absolute URLs in the manifest
		re := regexp.MustCompile(`(https?://[^\s"']+)`)

		// Use a relative path so it works through the Vite proxy (localhost:5173 -> localhost:8000)
		// and doesn't trigger CORS on its own.
		proxyBase := "/api/stream?url="

		newContent := re.ReplaceAllStringFunc(content, func(match string) string {
			// Proxy everything for these masters to be safe
			return proxyBase + url.QueryEscape(match)
		})

		w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(resp.StatusCode)
		w.Write([]byte(newContent))
		return
	}

	// For normal segments (TS, MP4), stream the body directly
	for k, v := range resp.Header {
		w.Header()[k] = v
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
func (h *Handler) mergeMovieMetadata(existing, new *models.RophimMovie) {
	// Prioritize Ophim thumbnail
	isNewOphim := strings.Contains(new.Thumbnail, "ophim") || strings.Contains(new.Thumbnail, "img.ophim1.com")
	isExistingOphim := strings.Contains(existing.Thumbnail, "ophim") || strings.Contains(existing.Thumbnail, "img.ophim1.com")

	if isNewOphim && !isExistingOphim {
		existing.Thumbnail = new.Thumbnail
	}

	// Prioritize Quality label that contains episode info (e.g. "Tập" or "Hoàn tất")
	isNewDetailed := strings.Contains(new.Quality, "Tập") || strings.Contains(new.Quality, "Hoàn tất")
	isExistingDetailed := strings.Contains(existing.Quality, "Tập") || strings.Contains(existing.Quality, "Hoàn tất")

	if isNewDetailed && !isExistingDetailed {
		existing.Quality = new.Quality
	}

	// Merge episodes by number ONLY to prevent duplicates in UI
	// This means we prioritized the Provider that came first (usually Ophim)
	// unless the existing episode has no URL.
	epMap := make(map[int]int) // map[epNum]existingSliceIndex
	for i := range existing.Episodes {
		epMap[existing.Episodes[i].Number] = i
	}

	for i := range new.Episodes {
		newEp := &new.Episodes[i]
		if idx, exists := epMap[newEp.Number]; exists {
			// If duplicate number, only replace if existing is empty
			if existing.Episodes[idx].URL == "" && newEp.URL != "" {
				existing.Episodes[idx].URL = newEp.URL
				existing.Episodes[idx].Title = newEp.Title
				existing.Episodes[idx].ServerName = newEp.ServerName
			}
		} else {
			// New episode number
			epMap[newEp.Number] = len(existing.Episodes)
			existing.Episodes = append(existing.Episodes, *newEp)
		}
	}
}

func normalizeKey(s string) string {
	s = strings.ToLower(s)
	// Remove all non-alphanumeric characters for fuzzy title match
	reg := regexp.MustCompile("[^a-z0-9]+")
	return reg.ReplaceAllString(s, "")
}
