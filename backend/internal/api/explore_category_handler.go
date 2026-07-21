package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"streamflow-backend/internal/scraper"
	"streamflow-backend/internal/models"
)

// ── Explore by Category: K-drama / C-drama ─────────────────────────────

func (h *Handler) ExploreCategory(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	if category == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "category parameter is required"})
		return
	}

	movies := h.fetchAndMergeMovies(func(p scraper.MovieProvider) ([]models.RophimMovie, error) {
		if category == "korean-drama" {
			return p.GetMoviesByCountry("han-quoc", 1)
		} else if category == "chinese-drama" {
			return p.GetMoviesByCountry("trung-quoc", 1)
		}
		return nil, fmt.Errorf("unsupported category: %s", category)
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(movies)
}
