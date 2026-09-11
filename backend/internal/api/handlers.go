package api

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
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
	Repo         *database.VideoRepository
	Providers    []scraper.MovieProvider
	TMDB         *service.TMDBService
	Extractor    *service.VideoExtractor
	Image        *service.ImageService
	JWTSecret    []byte
	StreamClient *http.Client
	PublicURL    string
	Groq         *service.GroqService
	SubtitlesDir string
}

func NewHandler(
	repo *database.VideoRepository,
	providers []scraper.MovieProvider,
	tmdb *service.TMDBService,
	extractor *service.VideoExtractor,
	image *service.ImageService,
	jwtSecret string,
) *Handler {
	tr := &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
	}
	streamClient := &http.Client{
		Transport: tr,
		Timeout:   45 * time.Second,
	}

	return &Handler{
		Repo:         repo,
		Providers:    providers,
		TMDB:         tmdb,
		Extractor:    extractor,
		Image:        image,
		JWTSecret:    []byte(jwtSecret),
		StreamClient: streamClient,
		SubtitlesDir: "cache/subtitles",
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
	_ = json.NewEncoder(w).Encode(movies)
}

func extractYear(query string) (string, int) {
	re := regexp.MustCompile(`\b(19\d{2}|20\d{2})\b`)
	match := re.FindString(query)
	if match == "" {
		return query, 0
	}
	year, _ := strconv.Atoi(match)
	clean := re.ReplaceAllString(query, "")
	clean = strings.TrimSpace(clean)
	clean = regexp.MustCompile(`\s+`).ReplaceAllString(clean, " ")
	if clean == "" {
		return query, year
	}
	return clean, year
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

	cleanQuery, extractedYear := extractYear(query)

	movies := h.fetchAndMergeMovies(func(p scraper.MovieProvider) ([]models.RophimMovie, error) {
		return p.Search(cleanQuery, page)
	})

	if extractedYear > 0 {
		filtered := make([]models.RophimMovie, 0, len(movies))
		for _, m := range movies {
			if m.Year == extractedYear || m.Year == 0 {
				filtered = append(filtered, m)
			}
		}
		if len(filtered) > 0 {
			movies = filtered
		}
	}

	if len(movies) == 0 && cleanQuery != query {
		movies = h.fetchAndMergeMovies(func(p scraper.MovieProvider) ([]models.RophimMovie, error) {
			return p.Search(query, page)
		})
	}

	sort.SliceStable(movies, func(i, j int) bool {
		return movies[i].Year > movies[j].Year
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(movies)
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

	// Always sort latest movies first (by Year descending)
	sort.SliceStable(filtered, func(i, j int) bool {
		return filtered[i].Year > filtered[j].Year
	})

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

				// Check 2: Slug match
				slugKey := normalizeKey(movie.Slug)
				if slugKey != "" {
					if idx, found := seenSlug[slugKey]; found {
						h.mergeMovieMetadata(&allMovies[idx], &movie)
						continue
					}
				}

				// Check 3: Normalized title match (check both Title and OriginalTitle)
				titleKey := normalizeKey(movie.Title)
				origTitleKey := normalizeKey(movie.OriginalTitle)

				matchedIdx := -1
				if titleKey != "" {
					if idx, found := seenTitle[titleKey]; found {
						matchedIdx = idx
					}
				}
				if matchedIdx == -1 && origTitleKey != "" {
					if idx, found := seenTitle[origTitleKey]; found {
						matchedIdx = idx
					}
				}

				if matchedIdx != -1 {
					h.mergeMovieMetadata(&allMovies[matchedIdx], &movie)
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
				if origTitleKey != "" {
					seenTitle[origTitleKey] = currIdx
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
	_ = json.NewEncoder(w).Encode(info)
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
	_, _ = w.Write(data)
}

func (h *Handler) GetMovieDetail(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	movie, err := h.fetchMovieDetail(slug)
	if err != nil {
		if slug == "" {
			http.Error(w, "slug required", http.StatusBadRequest)
		} else {
			http.Error(w, "movie not found", http.StatusNotFound)
		}
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(movie)
}

// fetchMovieDetail resolves a slug against all providers and returns the
// merged movie. It is shared by the JSON API and the Open Graph crawler page.
func (h *Handler) fetchMovieDetail(slug string) (*models.RophimMovie, error) {
	if slug == "" {
		return nil, fmt.Errorf("slug required")
	}

	var primaryMovie *models.RophimMovie
	var primaryProviderIdx int = -1
	var success bool

	// Fetch detail from all providers in parallel for exact slug.
	type detailResult struct {
		idx   int
		movie *models.RophimMovie
	}
	detailResults := make([]detailResult, len(h.Providers))
	var detailWg sync.WaitGroup
	for i, provider := range h.Providers {
		detailWg.Add(1)
		go func(idx int, p scraper.MovieProvider) {
			defer detailWg.Done()
			movie, err := p.GetMovieDetail(slug)
			if err == nil && movie != nil {
				providerName := movie.Provider
				if providerName == "" {
					providerName = "Server"
				}
				for j := range movie.Episodes {
					if !strings.HasPrefix(movie.Episodes[j].ServerName, providerName) {
						movie.Episodes[j].ServerName = fmt.Sprintf("%s - %s", providerName, movie.Episodes[j].ServerName)
					}
				}
				detailResults[idx] = detailResult{idx: idx, movie: movie}
			}
		}(i, provider)
	}
	detailWg.Wait()

	for _, res := range detailResults {
		if res.movie == nil {
			continue
		}
		if primaryMovie == nil {
			primaryMovie = res.movie
			primaryProviderIdx = res.idx
			success = true
		} else {
			h.mergeMovieMetadata(primaryMovie, res.movie)
		}
	}

	if !success || primaryMovie == nil {
		// Fallback: Try searching provider with slug terms (e.g. "ham-silo-phan-3" -> "ham silo phan 3" or "silo phan 3")
		searchQuery := strings.ReplaceAll(slug, "-", " ")
		for i, provider := range h.Providers {
			results, err := provider.Search(searchQuery, 1)
			if err == nil && len(results) > 0 {
				movie, err := provider.GetMovieDetail(results[0].Slug)
				if err == nil && movie != nil {
					primaryMovie = movie
					primaryProviderIdx = i
					success = true
					break
				}
			}
		}
	}

	if !success || primaryMovie == nil {
		return nil, fmt.Errorf("movie not found")
	}

	// Merge episodes/metadata from other providers in parallel.
	// Snapshot the identity fields up front: mergeMovieMetadata never
	// mutates Title/OriginalTitle, so goroutines can safely compare against
	// these local copies while other providers merge in parallel.
	mergeSearchQuery := primaryMovie.OriginalTitle
	if mergeSearchQuery == "" {
		mergeSearchQuery = primaryMovie.Title
	}
	mergeTitleKey := normalizeKey(primaryMovie.Title)
	mergeOrigKey := ""
	if primaryMovie.OriginalTitle != "" {
		mergeOrigKey = normalizeKey(primaryMovie.OriginalTitle)
	}

	var mergeWg sync.WaitGroup
	var mergeMu sync.Mutex
	for i, provider := range h.Providers {
		if i == primaryProviderIdx {
			continue
		}

		mergeWg.Add(1)
		go func(p scraper.MovieProvider) {
			defer mergeWg.Done()

			results, err := p.Search(mergeSearchQuery, 1)
			if err != nil {
				return
			}
			for _, res := range results {
				titleMatch := normalizeKey(res.Title) == mergeTitleKey
				origMatch := mergeOrigKey != "" && normalizeKey(res.OriginalTitle) == mergeOrigKey
				if titleMatch || origMatch {
					details, err := p.GetMovieDetail(res.Slug)
					if err == nil && details != nil {
						providerName := details.Provider
						if providerName == "" {
							providerName = "Server"
						}
						for j := range details.Episodes {
							if !strings.HasPrefix(details.Episodes[j].ServerName, providerName) {
								details.Episodes[j].ServerName = fmt.Sprintf("%s - %s", providerName, details.Episodes[j].ServerName)
							}
						}
						mergeMu.Lock()
						h.mergeMovieMetadata(primaryMovie, details)
						mergeMu.Unlock()
					}
					break
				}
			}
		}(provider)
	}
	mergeWg.Wait()

	sort.SliceStable(primaryMovie.Episodes, func(i, j int) bool {
		epI, epJ := primaryMovie.Episodes[i], primaryMovie.Episodes[j]
		if epI.Number != epJ.Number {
			return epI.Number < epJ.Number
		}

		// Deprioritize known offline/broken CDN domains
		isBrokenI := strings.Contains(epI.URL, "opstream90") || strings.Contains(epI.URL, "opstream10")
		isBrokenJ := strings.Contains(epJ.URL, "opstream90") || strings.Contains(epJ.URL, "opstream10")
		if !isBrokenI && isBrokenJ {
			return true
		}
		if isBrokenI && !isBrokenJ {
			return false
		}

		// Prioritize fast direct HLS servers (VSMOV first, then KKPhim / direct m3u8)
		isVsmovI := strings.Contains(epI.ServerName, "VSMOV")
		isVsmovJ := strings.Contains(epJ.ServerName, "VSMOV")
		if isVsmovI && !isVsmovJ {
			return true
		}
		if !isVsmovI && isVsmovJ {
			return false
		}

		isDirectI := strings.Contains(epI.ServerName, "KKPhim") || strings.Contains(epI.ServerName, "Ophim") || strings.Contains(epI.URL, ".m3u8")
		isDirectJ := strings.Contains(epJ.ServerName, "KKPhim") || strings.Contains(epJ.ServerName, "Ophim") || strings.Contains(epJ.URL, ".m3u8")
		if isDirectI && !isDirectJ {
			return true
		}
		if !isDirectI && isDirectJ {
			return false
		}
		return false
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

	return primaryMovie, nil
}

func (h *Handler) GetGenres(w http.ResponseWriter, r *http.Request) {
	for _, p := range h.Providers {
		if gp, ok := p.(interface {
			GetGenres() ([]models.Category, error)
		}); ok {
			genres, err := gp.GetGenres()
			if err == nil {
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(genres)
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
				_ = json.NewEncoder(w).Encode(countries)
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

	// Use browser-grade headers for embed hosts (streamc.xyz) and their CDNs
	// (indoss*.amass15.top disguise TS segments as .png) to bypass bot
	// protection on manifests and segments.
	isStreamcCDN := strings.Contains(videoURL, "amass15.top")
	isEmbedHost := strings.Contains(videoURL, "streamc.xyz") || isStreamcCDN
	if isEmbedHost {
		embedOrigin := fmt.Sprintf("%s://%s", parsedURL.Scheme, parsedURL.Host)
		if isStreamcCDN {
			embedOrigin = "https://streamc.xyz/"
		}
		req.Header.Set("User-Agent", defaultUserAgent)
		req.Header.Set("Accept", "*/*")
		req.Header.Set("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")
		req.Header.Set("sec-ch-ua", `"Chromium";v="148", "Google Chrome";v="148", ";Not A Brand";v="99"`)
		req.Header.Set("sec-ch-ua-mobile", "?0")
		req.Header.Set("sec-ch-ua-platform", `"Windows"`)
		req.Header.Set("Sec-Fetch-Dest", "empty")
		req.Header.Set("Sec-Fetch-Mode", "cors")
		req.Header.Set("Sec-Fetch-Site", "same-origin")
		req.Header.Set("Priority", "u=1, i")
		req.Header.Set("Origin", embedOrigin)
		req.Header.Set("Referer", embedOrigin)
		// Reuse the Cloudflare-cleared session recorded during extraction.
		if cookie := service.StreamCookies(parsedURL.Host); cookie != "" {
			req.Header.Set("Cookie", cookie)
		}
	} else {
		req.Header.Set("Referer", defaultReferer)
		req.Header.Set("User-Agent", defaultUserAgent)
	}
	// Manifests are always fetched complete: a ranged 206 on an HLS playlist
	// (without proper Content-Range semantics) can be mis-cached by browsers
	// and then served truncated to hls.js, breaking playback.
	isManifestTarget := strings.HasSuffix(parsedURL.Path, ".m3u8")
	if !isManifestTarget {
		if q := r.URL.Query().Get("url"); q != "" {
			if target, err := url.Parse(q); err == nil {
				isManifestTarget = strings.HasSuffix(target.Path, ".m3u8")
			}
		}
	}
	if !isManifestTarget {
		req.Header.Set("Range", r.Header.Get("Range"))
	}

	resp, err := h.StreamClient.Do(req)
	if err != nil {
		http.Error(w, "upstream error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	contentType := resp.Header.Get("Content-Type")

	// Manifests must be buffered completely so relative URIs can be
	// rewritten. Everything else (TS/fMP4 segments, MP4s, error pages)
	// is streamed straight through without buffering.
	pathIsManifest := strings.HasSuffix(parsedURL.Path, ".m3u8")
	declaredManifest := strings.Contains(contentType, "mpegurl") ||
		strings.Contains(contentType, "m3u8")
	var bodyBytes []byte
	if pathIsManifest || declaredManifest {
		bodyBytes, err = io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "upstream read error: "+err.Error(), http.StatusBadGateway)
			return
		}
	}

	// Only rewrite genuine playlists served with a success status. A dead CDN
	// answering an .m3u8 request with a 404 HTML page must be passed through
	// untouched so players fail fast instead of choking on mangled markup.
	isHLS := resp.StatusCode == http.StatusOK &&
		(bytes.HasPrefix(bodyBytes, []byte("#EXTM3U")) ||
			declaredManifest ||
			(pathIsManifest && len(bodyBytes) > 0 && bodyBytes[0] == '#'))

	if isHLS {
		// Whole-playlist AES-GCM encrypted manifests (#ENC-AESGCM) cannot be
		// decoded by any standard HLS client — reject rather than serve garbage.
		if service.IsEncryptedManifest(bodyBytes) {
			http.Error(w, "stream is encrypted and cannot be proxied", http.StatusUnprocessableEntity)
			return
		}
		// Always serve the complete rewritten manifest with 200 so browsers
		// never cache a partial playlist.
		h.handleHLSManifest(w, http.StatusOK, bodyBytes, videoURL)
		return
	}

	for k, v := range resp.Header {
		w.Header()[k] = v
	}

	// Immutable media segments (.ts, .m4s, .png, .mp4) can be safely cached
	// by browser cache to avoid repeated roundtrips during playback/seeking.
	isSegment := strings.HasSuffix(parsedURL.Path, ".ts") ||
		strings.HasSuffix(parsedURL.Path, ".m4s") ||
		strings.HasSuffix(parsedURL.Path, ".png") ||
		strings.HasSuffix(parsedURL.Path, ".mp4") ||
		strings.Contains(contentType, "video/") ||
		strings.Contains(contentType, "octet-stream")

	if isSegment && resp.StatusCode == http.StatusOK {
		w.Header().Set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600")
	} else {
		w.Header().Set("Cache-Control", "no-store")
	}

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

func (h *Handler) handleHLSManifest(w http.ResponseWriter, statusCode int, body []byte, baseURL string) {
	baseParsed, err := url.Parse(baseURL)
	if err != nil {
		http.Error(w, "invalid base URL", http.StatusInternalServerError)
		return
	}

	proxyBase := "/api/stream?url="
	lines := strings.Split(string(body), "\n")
	reURI := regexp.MustCompile(`URI="([^"]+)"`)

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		if strings.HasPrefix(trimmed, "#") {
			if strings.Contains(trimmed, `URI=`) {
				lines[i] = reURI.ReplaceAllStringFunc(line, func(match string) string {
					subMatch := reURI.FindStringSubmatch(match)
					if len(subMatch) > 1 {
						rawURI := subMatch[1]
						var resolved string
						if strings.HasPrefix(rawURI, "http://") || strings.HasPrefix(rawURI, "https://") {
							resolved = rawURI
						} else {
							rel, err := url.Parse(rawURI)
							if err != nil {
								return match
							}
							resolved = baseParsed.ResolveReference(rel).String()
						}
						return fmt.Sprintf(`URI="%s%s"`, proxyBase, url.QueryEscape(resolved))
					}
					return match
				})
			}
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
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(statusCode)
	_, _ = w.Write([]byte(newContent))
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

var tagCleanerRegex = regexp.MustCompile(`(?i)\b(thuyet\s*minh|vietsub|long\s*tieng|full|hd|cam|raw|20\d\d|19\d\d)\b|[\(\[\{].*?[\)\]\}]`)

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
	// Clean common tags (e.g. (Thuyết Minh), (Vietsub), 2024, etc.)
	s = tagCleanerRegex.ReplaceAllString(s, "")
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

var aiSubJobs sync.Map

type GenerateSubtitleRequest struct {
	Episode    int    `json:"episode"`
	StreamURL  string `json:"stream_url"`
	ServerName string `json:"server_name"`
	SourceLang string `json:"source_lang"`
	TargetLang string `json:"target_lang"`
}

func (h *Handler) GetSubtitles(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	epStr := r.URL.Query().Get("episode")
	episode, _ := strconv.Atoi(epStr)
	if episode <= 0 {
		episode = 1
	}

	var subs []models.MovieSubtitle
	database.DB.Where("slug = ? AND episode = ?", slug, episode).Order("created_at asc").Find(&subs)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(subs)
}

func (h *Handler) GenerateAISubtitle(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		http.Error(w, `{"error":"slug required"}`, http.StatusBadRequest)
		return
	}

	var req GenerateSubtitleRequest
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	// Fallback to query parameters if fields are missing in body
	if req.Episode <= 0 {
		epStr := r.URL.Query().Get("episode")
		req.Episode, _ = strconv.Atoi(epStr)
	}
	if req.StreamURL == "" {
		req.StreamURL = r.URL.Query().Get("stream_url")
	}
	if req.ServerName == "" {
		req.ServerName = r.URL.Query().Get("server_name")
	}
	if req.SourceLang == "" {
		req.SourceLang = r.URL.Query().Get("source_lang")
	}
	if req.TargetLang == "" {
		req.TargetLang = r.URL.Query().Get("target_lang")
	}

	if req.Episode <= 0 {
		req.Episode = 1
	}
	if req.TargetLang == "" {
		req.TargetLang = "vi"
	}
	if req.SourceLang == "" {
		req.SourceLang = "ko"
	}

	w.Header().Set("Content-Type", "application/json")

	// 1. Check if subtitle already exists in cache/DB
	var existing models.MovieSubtitle
	if err := database.DB.Where("slug = ? AND episode = ? AND language = ?", slug, req.Episode, req.TargetLang).First(&existing).Error; err == nil {
		_ = json.NewEncoder(w).Encode(existing)
		return
	}

	// 2. Check Groq Service configuration
	if h.Groq == nil || h.Groq.APIKey == "" {
		http.Error(w, `{"error":"GROQ_API_KEY is not configured. Please configure it in the Synology Package Wizard or environment variables."}`, http.StatusServiceUnavailable)
		return
	}

	jobKey := fmt.Sprintf("%s:%d:%s", slug, req.Episode, req.TargetLang)
	if _, loaded := aiSubJobs.LoadOrStore(jobKey, "processing"); loaded {
		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "processing",
			"message": "AI subtitles are currently being generated. Please poll status.",
			"slug":    slug,
			"episode": req.Episode,
		})
		return
	}

	// 3. Launch background generation job with independent 10-minute timeout
	go func(targetSlug string, ep int, targetLang, sourceLang, clientStreamURL, serverName string) {
		defer aiSubJobs.Delete(jobKey)

		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()

		if h.SubtitlesDir == "" {
			h.SubtitlesDir = "cache/subtitles"
		}
		_ = os.MkdirAll(h.SubtitlesDir, 0755)

		// Helper to unwrap proxy URLs
		unwrapURL := func(raw string) string {
			raw = strings.TrimSpace(raw)
			if strings.Contains(raw, "url=") {
				if parsed, err := url.Parse(raw); err == nil {
					if u := parsed.Query().Get("url"); u != "" {
						return u
					}
				}
				if idx := strings.Index(raw, "url="); idx != -1 {
					q := raw[idx+4:]
					if end := strings.IndexByte(q, '&'); end != -1 {
						q = q[:end]
					}
					if unescaped, err := url.QueryUnescape(q); err == nil && unescaped != "" {
						return unescaped
					}
				}
			}
			return raw
		}

		// Collect candidate stream URLs across providers
		var candidates []string
		if direct := unwrapURL(clientStreamURL); direct != "" && strings.HasPrefix(direct, "http") {
			candidates = append(candidates, direct)
		}

		for _, provider := range h.Providers {
			m, err := provider.GetMovieDetail(targetSlug)
			if err == nil && m != nil && len(m.Episodes) > 0 {
				for _, episodeItem := range m.Episodes {
					if episodeItem.Number == ep && episodeItem.URL != "" {
						u := unwrapURL(episodeItem.URL)
						if strings.HasPrefix(u, "http") {
							// If server matches requested serverName, prioritize it first
							if serverName != "" && strings.Contains(strings.ToLower(episodeItem.ServerName), strings.ToLower(serverName)) {
								candidates = append([]string{u}, candidates...)
							} else {
								candidates = append(candidates, u)
							}
						}
					}
				}
			}
		}

		// Deduplicate candidates preserving order
		var uniqueCandidates []string
		seen := make(map[string]bool)
		for _, c := range candidates {
			if !seen[c] {
				seen[c] = true
				uniqueCandidates = append(uniqueCandidates, c)
			}
		}

		if len(uniqueCandidates) == 0 {
			log.Printf("[GenerateAISubtitle] No candidate streams found for %s ep %d", targetSlug, ep)
			return
		}

		// Try extracting audio from candidates until one succeeds
		var audioPath string
		var lastExtractErr error
		for _, cand := range uniqueCandidates {
			log.Printf("[GenerateAISubtitle] Attempting audio extraction for %s ep %d from %s", targetSlug, ep, cand)
			audioPath, lastExtractErr = h.Groq.AudioExtractor.ExtractAudio(bgCtx, cand, h.SubtitlesDir, 0)
			if lastExtractErr == nil && audioPath != "" {
				log.Printf("[GenerateAISubtitle] Audio extracted successfully from %s", cand)
				break
			}
			log.Printf("[GenerateAISubtitle] Audio extraction failed for %s: %v", cand, lastExtractErr)
		}

		if audioPath == "" {
			log.Printf("[GenerateAISubtitle] Failed to extract audio from all candidates for %s ep %d: %v", targetSlug, ep, lastExtractErr)
			return
		}
		defer os.Remove(audioPath)

		// Transcribe with Groq Whisper Large-v3
		sourceVTT, err := h.Groq.TranscribeAudio(bgCtx, audioPath, sourceLang)
		if err != nil {
			log.Printf("[GenerateAISubtitle] Groq Whisper transcription failed for %s ep %d: %v", targetSlug, ep, err)
			return
		}

		// Translate with Groq Llama 3.3
		translatedVTT := sourceVTT
		if targetLang != sourceLang {
			translated, err := h.Groq.TranslateSubtitles(bgCtx, sourceVTT, sourceLang, targetLang)
			if err != nil {
				log.Printf("[GenerateAISubtitle] Groq Llama translation failed for %s ep %d: %v", targetSlug, ep, err)
				return
			}
			translatedVTT = translated
		}

		// Save WebVTT to disk
		vttFilename := fmt.Sprintf("%s_ep%d_%s.vtt", targetSlug, ep, targetLang)
		vttFilePath := filepath.Join(h.SubtitlesDir, vttFilename)
		if err := os.WriteFile(vttFilePath, []byte(translatedVTT), 0644); err != nil {
			log.Printf("[GenerateAISubtitle] Failed to write subtitle file %s: %v", vttFilePath, err)
			return
		}

		// Save record in database
		label := "Tiếng Việt (AI Auto CC)"
		if targetLang == "en" {
			label = "English (AI Auto CC)"
		}
		vttURL := fmt.Sprintf("/api/subtitles/%s", vttFilename)

		sub := models.MovieSubtitle{
			Slug:      targetSlug,
			Episode:   ep,
			Language:  targetLang,
			Label:     label,
			VTTPath:   vttFilePath,
			VTTURL:    vttURL,
			IsAI:      true,
			CreatedAt: time.Now(),
		}

		if err := database.DB.Create(&sub).Error; err != nil {
			log.Printf("[GenerateAISubtitle] Failed to save subtitle record to DB: %v", err)
			return
		}
		log.Printf("[GenerateAISubtitle] Subtitle generated successfully for %s ep %d: %s", targetSlug, ep, vttURL)
	}(slug, req.Episode, req.TargetLang, req.SourceLang, req.StreamURL, req.ServerName)

	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "processing",
		"message": "AI subtitles generation started in background",
		"slug":    slug,
		"episode": req.Episode,
	})
}

func (h *Handler) ServeSubtitle(w http.ResponseWriter, r *http.Request) {
	filename := chi.URLParam(r, "filename")
	if filename == "" || strings.Contains(filename, "..") || !strings.HasSuffix(filename, ".vtt") {
		http.Error(w, "invalid subtitle filename", http.StatusBadRequest)
		return
	}

	if h.SubtitlesDir == "" {
		h.SubtitlesDir = "cache/subtitles"
	}
	filePath := filepath.Join(h.SubtitlesDir, filename)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.Error(w, "subtitle not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "text/vtt; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	http.ServeFile(w, r, filePath)
}

