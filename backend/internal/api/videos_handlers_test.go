package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestHandler_GetMovieDetail_DirectStreamsOnly(t *testing.T) {
	kkphim := scraper.NewKKPhimScraper()
	vsmov := scraper.NewVSMOVScraper()
	vidlink := scraper.NewVidLinkProvider()
	h := &Handler{
		Providers: []scraper.MovieProvider{vsmov, kkphim, vidlink},
	}

	movie, err := h.fetchMovieDetail("trung-so-doc-dac-van-phai-di-lam")
	if err != nil {
		t.Fatalf("fetchMovieDetail failed: %v", err)
	}

	t.Logf("Movie: %s, TMDB: %s, Episodes: %d", movie.Title, movie.TMDBID, len(movie.Episodes))
	if len(movie.Episodes) == 0 {
		t.Fatalf("Expected movie to have episodes")
	}

	hasDirect := false
	for _, ep := range movie.Episodes {
		lowerURL := strings.ToLower(ep.URL)
		isDirect := strings.Contains(lowerURL, ".m3u8") || strings.Contains(lowerURL, ".mp4") || strings.Contains(lowerURL, ".mpd")
		if !isDirect {
			t.Errorf("Episode %d (%s) is not a direct stream: %s", ep.Number, ep.ServerName, ep.URL)
		}
		if strings.Contains(ep.ServerName, "KKPhim") || strings.Contains(ep.ServerName, "VSMOV") {
			hasDirect = true
		}
	}

	if !hasDirect {
		t.Errorf("Expected direct stream server (KKPhim/VSMOV)")
	}
	t.Logf("Servers verified: hasDirect=%v, allDirectStreams=true", hasDirect)
}
