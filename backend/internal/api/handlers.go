package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"unicode"

	"streamflow-backend/internal/database"
	"streamflow-backend/internal/models"
	"streamflow-backend/internal/scraper"
	"streamflow-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

const (
	defaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
	defaultReferer   = "https://phimmoichill.my/"
)

var (
	blockedHosts = []string{
		"localhost",
		"127.0.0.1",
		"0.0.0.0",
		"169.254.169.254",
		"[::1]",
	}
	privateIPRegex = regexp.MustCompile(`^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.)`)
)

type Handler struct {
	Repo      *database.VideoRepository
	Providers []scraper.MovieProvider
	TMDB      *service.TMDBService
	Extractor *service.VideoExtractor
	Image     *service.ImageService
	JWTSecret []byte
}

func NewHandler(
	repo *database.VideoRepository,
	providers []scraper.MovieProvider,
	tmdb *service.TMDBService,
	extractor *service.VideoExtractor,
	image *service.ImageService,
	jwtSecret string,
) *Handler {
	return &Handler{
		Repo:      repo,
		Providers: providers,
		TMDB:      tmdb,
		Extractor: extractor,
		Image:     image,
		JWTSecret: []byte(jwtSecret),
	}
}

func (h *Handler) GetHomeVideos(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	category := r.URL.Query().Get("category")
	movies := h.fetchAndMergeMovies(func(p scraper.MovieProvider) ([]models.RophimMovie, error) {
		return p.GetMoviesByCategory(category, page)
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(movies)
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

	movies := h.fetchAndMergeMovies(func(p scraper.MovieProvider) ([]models.RophimMovie, error) {
		return p.Search(query, page)
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(movies)
}

type movieFetcher func(p scraper.MovieProvider) ([]models.RophimMovie, error)

func (h *Handler) fetchAndMergeMovies(fetch movieFetcher) []models.RophimMovie {
	var providerResults [][]models.RophimMovie
	maxLen := 0
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, provider := range h.Providers {
		wg.Add(1)
		go func(p scraper.MovieProvider) {
			defer wg.Done()
			movies, err := fetch(p)
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
		return []models.RophimMovie{}
	}

	merged := h.mergeMovies(providerResults, maxLen)

	// Filter out movies with empty thumbnails to avoid blank cover cards
	filtered := make([]models.RophimMovie, 0, len(merged))
	for _, m := range merged {
		if m.Thumbnail != "" {
			filtered = append(filtered, m)
		}
	}
	return filtered
}

func (h *Handler) mergeMovies(providerResults [][]models.RophimMovie, maxLen int) []models.RophimMovie {
	var allMovies []models.RophimMovie
	seenID := make(map[string]int)
	seenSlug := make(map[string]int)
	seenTitle := make(map[string]int)

	for i := 0; i < maxLen; i++ {
		for _, movies := range providerResults {
			if i < len(movies) {
				movie := movies[i]

				// Check 1: Exact ID match
				if idx, found := seenID[movie.ID]; found {
					h.mergeMovieMetadata(&allMovies[idx], &movie)
					continue
				}

				// Check 2: Slug match (e.g. "vu-tru-cua-doi-ta" from both providers)
				slugKey := normalizeKey(movie.Slug)
				if slugKey != "" {
					if idx, found := seenSlug[slugKey]; found {
						h.mergeMovieMetadata(&allMovies[idx], &movie)
						continue
					}
				}

				// Check 3: Normalized title match
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
				if slugKey != "" {
					seenSlug[slugKey] = currIdx
				}
				if titleKey != "" {
					seenTitle[titleKey] = currIdx
				}
			}
		}
	}

	return allMovies
}

func (h *Handler) ExtractVideo(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := validateURL(req.URL); err != nil {
		http.Error(w, "invalid URL: "+err.Error(), http.StatusBadRequest)
		return
	}

	info, err := h.Extractor.Extract(req.URL, "")
	if err != nil {
		fmt.Printf("Extraction error: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(info)
}

func (h *Handler) ProxyImage(w http.ResponseWriter, r *http.Request) {
	imgURL := r.URL.Query().Get("url")
	width, _ := strconv.Atoi(r.URL.Query().Get("width"))

	if imgURL == "" {
		http.Error(w, "url parameter required", http.StatusBadRequest)
		return
	}

	if err := validateURL(imgURL); err != nil {
		http.Error(w, "invalid URL: "+err.Error(), http.StatusBadRequest)
		return
	}

	data, contentType, err := h.Image.GetProxiedImage(imgURL, width)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=259200, stale-while-revalidate=86400")
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
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

	for i, provider := range h.Providers {
		if i == primaryProviderIdx {
			continue
		}

		searchQuery := primaryMovie.OriginalTitle
		if searchQuery == "" {
			searchQuery = primaryMovie.Title
		}

		results, err := provider.Search(searchQuery, 1)
		if err == nil {
			for _, res := range results {
				if normalizeKey(res.Title) == normalizeKey(primaryMovie.Title) ||
					(primaryMovie.OriginalTitle != "" && normalizeKey(res.OriginalTitle) == normalizeKey(primaryMovie.OriginalTitle)) {
					details, err := provider.GetMovieDetail(res.Slug)
					if err == nil && details != nil {
						h.mergeMovieMetadata(primaryMovie, details)
					}
					break
				}
			}
		}
	}

	sort.Slice(primaryMovie.Episodes, func(i, j int) bool {
		return primaryMovie.Episodes[i].Number < primaryMovie.Episodes[j].Number
	})

	if len(primaryMovie.Episodes) > 0 {
		uniqueEps := make([]models.Episode, 0)
		seenEpNums := make(map[string]bool)
		for _, ep := range primaryMovie.Episodes {
			key := fmt.Sprintf("%d-%s", ep.Number, ep.ServerName)
			if !seenEpNums[key] {
				seenEpNums[key] = true
				uniqueEps = append(uniqueEps, ep)
			}
		}
		primaryMovie.Episodes = uniqueEps
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(primaryMovie)
}

func (h *Handler) GetGenres(w http.ResponseWriter, r *http.Request) {
	for _, p := range h.Providers {
		if gp, ok := p.(interface {
			GetGenres() ([]models.Category, error)
		}); ok {
			genres, err := gp.GetGenres()
			if err == nil {
				w.Header().Set("Content-Type", "application/json")
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
				w.Header().Set("Content-Type", "application/json")
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

	if err := validateURL(videoURL); err != nil {
		http.Error(w, "invalid URL: "+err.Error(), http.StatusBadRequest)
		return
	}

	parsedURL, err := url.Parse(videoURL)
	if err != nil {
		http.Error(w, "invalid url", http.StatusBadRequest)
		return
	}

	req, err := http.NewRequest("GET", videoURL, nil)
	if err != nil {
		http.Error(w, "invalid url", http.StatusBadRequest)
		return
	}

	req.Header.Set("Referer", defaultReferer)
	req.Header.Set("User-Agent", defaultUserAgent)
	req.Header.Set("Range", r.Header.Get("Range"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "upstream error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if strings.HasSuffix(parsedURL.Path, ".m3u8") {
		h.handleHLSManifest(w, resp, videoURL)
		return
	}

	for k, v := range resp.Header {
		w.Header()[k] = v
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func (h *Handler) handleHLSManifest(w http.ResponseWriter, resp *http.Response, baseURL string) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Stream proxy read error: %v\n", err)
		http.Error(w, "read error", http.StatusInternalServerError)
		return
	}

	baseParsed, err := url.Parse(baseURL)
	if err != nil {
		http.Error(w, "invalid base URL", http.StatusInternalServerError)
		return
	}

	proxyBase := "/api/stream?url="
	lines := strings.Split(string(body), "\n")

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}

		var resolved string
		if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
			resolved = trimmed
		} else {
			rel, err := url.Parse(trimmed)
			if err != nil {
				continue
			}
			resolved = baseParsed.ResolveReference(rel).String()
		}
		lines[i] = proxyBase + url.QueryEscape(resolved)
	}

	newContent := strings.Join(lines, "\n")

	w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(resp.StatusCode)
	w.Write([]byte(newContent))
}

func (h *Handler) mergeMovieMetadata(existing, new *models.RophimMovie) {
	isNewOphim := strings.Contains(new.Thumbnail, "ophim") || strings.Contains(new.Thumbnail, "img.ophim1.com")
	isExistingOphim := strings.Contains(existing.Thumbnail, "ophim") || strings.Contains(existing.Thumbnail, "img.ophim1.com")

	if isNewOphim && !isExistingOphim {
		existing.Thumbnail = new.Thumbnail
	}

	isNewDetailed := strings.Contains(new.Quality, "Tập") || strings.Contains(new.Quality, "Hoàn tất")
	isExistingDetailed := strings.Contains(existing.Quality, "Tập") || strings.Contains(existing.Quality, "Hoàn tất")

	if isNewDetailed && !isExistingDetailed {
		existing.Quality = new.Quality
	}

	epMap := make(map[string]int)
	for i, ep := range existing.Episodes {
		key := fmt.Sprintf("%d-%s", ep.Number, ep.ServerName)
		epMap[key] = i
	}

	for i := range new.Episodes {
		newEp := &new.Episodes[i]
		key := fmt.Sprintf("%d-%s", newEp.Number, newEp.ServerName)
		if idx, exists := epMap[key]; exists {
			if existing.Episodes[idx].URL == "" && newEp.URL != "" {
				existing.Episodes[idx].URL = newEp.URL
				existing.Episodes[idx].Title = newEp.Title
				existing.Episodes[idx].ServerName = newEp.ServerName
			}
		} else {
			epMap[key] = len(existing.Episodes)
			existing.Episodes = append(existing.Episodes, *newEp)
		}
	}
}

func normalizeKey(s string) string {
	if s == "" {
		return ""
	}
	s = strings.ToLower(s)
	// Strip Vietnamese diacritics: Vũ Trụ Của Đôi Ta → vu tru cua doi ta
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	result, _, err := transform.String(t, s)
	if err == nil {
		s = result
	}
	// Replace đ/Đ which NFD doesn't decompose
	s = strings.ReplaceAll(s, "đ", "d")
	// Keep only alphanumeric
	reg := regexp.MustCompile("[^a-z0-9]+")
	return reg.ReplaceAllString(s, "")
}

func validateURL(rawURL string) error {
	if rawURL == "" {
		return fmt.Errorf("URL is empty")
	}

	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL format")
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("only http and https protocols are allowed")
	}

	host := strings.ToLower(parsed.Hostname())

	for _, blocked := range blockedHosts {
		if host == blocked || strings.HasPrefix(host, blocked+".") {
			return fmt.Errorf("access to this host is blocked")
		}
	}

	if privateIPRegex.MatchString(host) {
		return fmt.Errorf("access to private IP addresses is blocked")
	}

	return nil
}
