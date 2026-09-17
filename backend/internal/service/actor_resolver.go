package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"streamflow-backend/internal/models"
)

type ActorResolver struct {
	client *http.Client
	tmdb   *TMDBService
	mu     sync.RWMutex
	cache  map[string]string // normalized actor name -> avatar URL
}

func NewActorResolver(tmdb *TMDBService) *ActorResolver {
	ar := &ActorResolver{
		client: &http.Client{Timeout: 6 * time.Second},
		tmdb:   tmdb,
		cache:  make(map[string]string),
	}
	ar.initKnownActors()
	return ar
}

func (ar *ActorResolver) initKnownActors() {
	seeds := map[string]string{
		"trieu le dinh":  "https://image.tmdb.org/t/p/h632/6RiJN1w8kBFG6IcPmwPdUt1EzCF.jpg",
		"zhao liying":    "https://image.tmdb.org/t/p/h632/6RiJN1w8kBFG6IcPmwPdUt1EzCF.jpg",
		"li jiuxiao":     "https://image.tmdb.org/t/p/h632/wBaTXTKFCavDhHleVBZ1F35DWfS.jpg",
		"huynh hieu minh": "https://image.tmdb.org/t/p/h632/eIC3tenhlbFtaGnFXhta7e25avQ.jpg",
		"huang xiaoming": "https://image.tmdb.org/t/p/h632/eIC3tenhlbFtaGnFXhta7e25avQ.jpg",
		"tan tuan kiet":  "https://image.tmdb.org/t/p/h632/q50b2VpJaO5LOM4U7qxLwcj99fM.jpg",
		"chen ming hao":  "https://image.tmdb.org/t/p/h632/ksWDHeCd9Tbhtj4Zbh10EbT58CM.jpg",
		"canh lac":       "https://image.tmdb.org/t/p/h632/tyqtorVkTRu1ZFQsnEccwMZEf4Y.jpg",
		"vuong ngoc van": "https://image.tmdb.org/t/p/h632/qVv9Uf8n3o34sM4v23yK66jC8Uv.jpg",
		"jeong il-woo":   "https://image.tmdb.org/t/p/h632/2F0624w7m4M37Bw3eMh3f8eMh3f.jpg",
		"song joong-ki":  "https://image.tmdb.org/t/p/h632/v4gQ06z0kYQ3V6lH5C5h7S7J8y8.jpg",
		"hyun bin":       "https://image.tmdb.org/t/p/h632/q0M41z8x1X8v4l6d8q4K2f8N1Q2.jpg",
		"lee min-ho":     "https://image.tmdb.org/t/p/h632/t5p2V2R2c5v6Q1H6f5k9P8y1T8q.jpg",
		"tran thanh":     "https://image.tmdb.org/t/p/h632/5h7L9K8M6N5P4Q3R2S1T0U9V8W7.jpg",
		"ju jingyi":      "https://image.tmdb.org/t/p/h632/eXz9n9Msn4gP0oP6Gf2XbE0qZ0r.jpg",
		"cuc tinh y":     "https://image.tmdb.org/t/p/h632/eXz9n9Msn4gP0oP6Gf2XbE0qZ0r.jpg",
		"chen duling":    "https://image.tmdb.org/t/p/h632/m6tE2Yg6pLpA9bLpM9i5L4N3Yq0.jpg",
		"tran do linh":   "https://image.tmdb.org/t/p/h632/m6tE2Yg6pLpA9bLpM9i5L4N3Yq0.jpg",
		"joseph zeng":    "https://image.tmdb.org/t/p/h632/01Y4Vl7O0w2p7yN8L9M7K6J5H4G.jpg",
		"tang thuan hy":  "https://image.tmdb.org/t/p/h632/01Y4Vl7O0w2p7yN8L9M7K6J5H4G.jpg",
		"zeng shunxi":    "https://image.tmdb.org/t/p/h632/01Y4Vl7O0w2p7yN8L9M7K6J5H4G.jpg",
		"tian jiarui":    "https://image.tmdb.org/t/p/h632/5z7M4O8L6K2J1N9P0Q8R7S6T5U4.jpg",
		"dien gia thuy":  "https://image.tmdb.org/t/p/h632/5z7M4O8L6K2J1N9P0Q8R7S6T5U4.jpg",
		"yan an":         "https://image.tmdb.org/t/p/h632/3k8L7M6N5P4Q3R2S1T0U9V8W7X6.jpg",
		"diem an":        "https://image.tmdb.org/t/p/h632/3k8L7M6N5P4Q3R2S1T0U9V8W7X6.jpg",
	}

	ar.mu.Lock()
	defer ar.mu.Unlock()
	for k, v := range seeds {
		ar.cache[k] = v
	}
}

func (ar *ActorResolver) ResolveActorAvatar(name string) string {
	cleanName := strings.TrimSpace(name)
	if cleanName == "" {
		return ""
	}
	normKey := normalizeName(cleanName)

	ar.mu.RLock()
	if val, found := ar.cache[normKey]; found {
		ar.mu.RUnlock()
		return val
	}
	ar.mu.RUnlock()

	// 1. Try TMDB search if key is configured
	if ar.tmdb != nil && ar.tmdb.HasKey() {
		if avatar, err := ar.tmdb.SearchPersonAvatar(cleanName); err == nil && avatar != "" {
			ar.setCache(normKey, avatar)
			return avatar
		}
	}

	// 2. Try Wikipedia PageImages API (free, open, no key required)
	if avatar := ar.lookupWikipedia(cleanName); avatar != "" {
		ar.setCache(normKey, avatar)
		return avatar
	}

	// Negative cache to avoid repetitive queries
	ar.setCache(normKey, "")
	return ""
}

func (ar *ActorResolver) lookupWikipedia(name string) string {
	// 1. Try direct title
	encodedTitle := url.QueryEscape(strings.ReplaceAll(name, " ", "_"))
	apiURL := fmt.Sprintf("https://en.wikipedia.org/w/api.php?action=query&titles=%s&prop=pageimages&format=json&pithumbsize=300", encodedTitle)

	if thumb := ar.fetchWikiThumbnail(apiURL); thumb != "" {
		return thumb
	}

	// 2. Try generator search query (fuzzy matching actor aliases)
	encodedSearch := url.QueryEscape(name)
	searchURL := fmt.Sprintf("https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=%s&gsrlimit=1&prop=pageimages&format=json&pithumbsize=300", encodedSearch)

	return ar.fetchWikiThumbnail(searchURL)
}

func (ar *ActorResolver) fetchWikiThumbnail(reqURL string) string {
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "KV-Netflix/1.0 (movie-streaming-app)")

	resp, err := ar.client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return ""
	}

	var data struct {
		Query struct {
			Pages map[string]struct {
				Thumbnail *struct {
					Source string `json:"source"`
				} `json:"thumbnail"`
			} `json:"pages"`
		} `json:"query"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return ""
	}

	for _, page := range data.Query.Pages {
		if page.Thumbnail != nil && page.Thumbnail.Source != "" {
			return page.Thumbnail.Source
		}
	}

	return ""
}

func (ar *ActorResolver) setCache(key, value string) {
	ar.mu.Lock()
	defer ar.mu.Unlock()
	ar.cache[key] = value
}

// EnrichMovieCast attaches avatar photos and structured CastMember items to movie.CastDetails.
func (ar *ActorResolver) EnrichMovieCast(movie *models.RophimMovie) {
	if movie == nil || len(movie.Cast) == 0 {
		return
	}

	isTV := movie.Category == "tv" || movie.Category == "series" || strings.Contains(strings.ToLower(movie.Category), "bộ") || len(movie.Episodes) > 1
	var tmdbCastMap map[string]models.CastMember

	// If TMDB ID is present and TMDB has an API key, fetch credits directly
	if movie.TMDBID != "" && ar.tmdb != nil && ar.tmdb.HasKey() {
		if id, err := strconv.Atoi(movie.TMDBID); err == nil && id > 0 {
			if credits, err := ar.tmdb.GetCredits(id, isTV); err == nil && len(credits) > 0 {
				tmdbCastMap = make(map[string]models.CastMember)
				for _, c := range credits {
					if c.Avatar != "" {
						member := models.CastMember{
							Name:      c.Name,
							Avatar:    c.Avatar,
							Character: c.Character,
							Slug:      slugifyName(c.Name),
						}
						tmdbCastMap[normalizeName(c.Name)] = member
						if c.OriginalName != "" {
							tmdbCastMap[normalizeName(c.OriginalName)] = member
						}
					}
				}
			}
		}
	}

	var details []models.CastMember
	seen := make(map[string]bool)

	for _, rawName := range movie.Cast {
		name := strings.TrimSpace(rawName)
		if name == "" {
			continue
		}
		norm := normalizeName(name)
		if seen[norm] {
			continue
		}
		seen[norm] = true

		// 1. Matched directly in TMDB credits?
		if tmdbCastMap != nil {
			if member, ok := tmdbCastMap[norm]; ok {
				details = append(details, member)
				continue
			}
		}

		// 2. Resolve via multi-tier fallback (cache / TMDB search / Wikipedia)
		avatar := ar.ResolveActorAvatar(name)
		slug := slugifyName(name)

		details = append(details, models.CastMember{
			Name:   name,
			Avatar: avatar,
			Slug:   slug,
		})
	}

	movie.CastDetails = details
}

func normalizeName(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	fields := strings.Fields(s)
	return strings.Join(fields, " ")
}

func slugifyName(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	reg := regexp.MustCompile(`[^a-z0-9\-]+`)
	s = reg.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}
