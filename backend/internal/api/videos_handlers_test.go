package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"streamflow-backend/internal/models"
	"streamflow-backend/internal/scraper"
)

func TestHandler_GetHomeVideos_WithVSMOV(t *testing.T) {
	vsmov := scraper.NewVSMOVScraper()
	kkphim := scraper.NewKKPhimScraper()
	h := &Handler{
		Providers: []scraper.MovieProvider{vsmov, kkphim},
	}

	req := httptest.NewRequest(http.MethodGet, "/api/videos/home?page=1", nil)
	w := httptest.NewRecorder()

	h.GetHomeVideos(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", w.Code)
	}

	var movies []models.RophimMovie
	if err := json.NewDecoder(w.Body).Decode(&movies); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(movies) == 0 {
		t.Errorf("Expected movies to be returned, got 0")
	}

	hasVSMOV := false
	hasKKPhim := false
	for _, m := range movies {
		if m.Provider == "VSMOV" {
			hasVSMOV = true
		}
		if m.Provider == "KKPhim" {
			hasKKPhim = true
		}
	}

	t.Logf("Total merged movies: %d (hasVSMOV=%v, hasKKPhim=%v)", len(movies), hasVSMOV, hasKKPhim)
	if !hasVSMOV {
		t.Errorf("Expected VSMOV movies to be present in merged list")
	}
}
