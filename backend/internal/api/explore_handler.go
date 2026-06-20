package api

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"strings"

	"streamflow-backend/internal/database"
	"streamflow-backend/internal/models"
	"streamflow-backend/internal/scraper"
)

// Map Vietnamese genre names to Ophim slugs
var genreSlugMap = map[string]string{
	"hành động":   "hanh-dong",
	"tình cảm":    "tinh-cam",
	"hài hước":    "hai-huoc",
	"kinh dị":     "kinh-di",
	"viễn tưởng":  "vien-tuong",
	"phiêu lưu":   "phieu-luu",
	"hình sự":     "hinh-su",
	"chiến tranh": "chien-tranh",
	"tâm lý":      "tam-ly",
	"âm nhạc":     "am-nhac",
	"thần thoại":   "than-thoai",
	"co trang":    "co-trang",
	"hoạt hình":   "hoat-hinh",
	"hockey":      "hoat-hinh",
	"thể thao":    "the-thao",
	"tài liệu":    "tai-lieu",
	"võ thuật":    "vo-thuat",
	"bí ẩn":       "bi-an",
	"học đường":   "hoc-duong",
	"gia đình":    "gia-dinh",
	"phi hình":    "phim-le",
}

func normalizeGenreSlug(genre string) string {
	genre = strings.ToLower(strings.TrimSpace(genre))
	if slug, ok := genreSlugMap[genre]; ok {
		return slug
	}
	// Try direct slug: remove spaces, normalize
	slug := strings.ReplaceAll(genre, " ", "-")
	slug = strings.ReplaceAll(slug, ".", "")
	return slug
}

// ── Explore: Movies related to user's watch history ───────────────────

func (h *Handler) ExploreMovies(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	// Get user's watch history
	var history []models.WatchHistory
	database.DB.Where("user_id = ?", userID).Order("watched_at DESC").Limit(20).Find(&history)

	// Extract unique genres from watch history
	genreSet := make(map[string]bool)
	for _, entry := range history {
		if entry.Genre != "" {
			parts := strings.Split(entry.Genre, ",")
			for _, g := range parts {
				g = strings.TrimSpace(g)
				if g != "" {
					genreSet[g] = true
				}
			}
		}
	}

	// Collect watched slugs to exclude from results
	watchedSlugs := make(map[string]bool)
	for _, entry := range history {
		watchedSlugs[entry.Slug] = true
	}

	// If no genres from history, fall back to popular categories
	var genreSlugs []string
	for genre := range genreSet {
		genreSlugs = append(genreSlugs, normalizeGenreSlug(genre))
	}

	if len(genreSlugs) == 0 {
		// No watch history — return a random mix of popular categories
		genreSlugs = []string{"hanh-dong", "tinh-cam", "hai-huoc", "vien-tuong", "kinh-di"}
	}

	// Shuffle and limit to 3 genres to avoid too many requests
	rand.Shuffle(len(genreSlugs), func(i, j int) {
		genreSlugs[i], genreSlugs[j] = genreSlugs[j], genreSlugs[i]
	})
	if len(genreSlugs) > 3 {
		genreSlugs = genreSlugs[:3]
	}

	// Fetch movies by genre from all providers
	var allMovies []models.RophimMovie
	seenSlug := make(map[string]bool)

	for _, genreSlug := range genreSlugs {
		movies := h.fetchAndMergeMovies(func(p scraper.MovieProvider) ([]models.RophimMovie, error) {
			return p.GetMoviesByCategory(genreSlug, 1)
		})

		for _, m := range movies {
			if !seenSlug[m.Slug] && !watchedSlugs[m.Slug] && m.Thumbnail != "" {
				seenSlug[m.Slug] = true
				allMovies = append(allMovies, m)
			}
		}
	}

	// If results are sparse, add some from "home" (latest) to fill
	if len(allMovies) < 20 {
		extraMovies := h.fetchAndMergeMovies(func(p scraper.MovieProvider) ([]models.RophimMovie, error) {
			return p.GetMoviesByCategory("home", 1)
		})
		for _, m := range extraMovies {
			if len(allMovies) >= 30 {
				break
			}
			if !seenSlug[m.Slug] && !watchedSlugs[m.Slug] && m.Thumbnail != "" {
				seenSlug[m.Slug] = true
				allMovies = append(allMovies, m)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(allMovies)
}
