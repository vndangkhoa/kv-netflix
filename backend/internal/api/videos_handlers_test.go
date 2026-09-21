package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"streamflow-backend/internal/models"
	"streamflow-backend/internal/scraper"
	"streamflow-backend/internal/service"
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

func TestHandler_GetMovieDetail_CastEnrichment(t *testing.T) {
	vsmov := scraper.NewVSMOVScraper()
	kkphim := scraper.NewKKPhimScraper()
	tmdb := service.NewTMDBService()
	resolver := service.NewActorResolver(tmdb)

	h := &Handler{
		Providers:     []scraper.MovieProvider{vsmov, kkphim},
		TMDB:          tmdb,
		ActorResolver: resolver,
	}

	movie, err := h.fetchMovieDetail("nguyet-lan-mat-an")
	if err != nil {
		t.Fatalf("fetchMovieDetail failed: %v", err)
	}

	if len(movie.Cast) == 0 {
		t.Fatalf("Expected movie.Cast to have actors")
	}

	if len(movie.CastDetails) == 0 {
		t.Fatalf("Expected movie.CastDetails to be populated, got 0")
	}

	t.Logf("Movie: %s", movie.Title)
	for _, c := range movie.CastDetails {
		t.Logf("Actor: %s | Avatar: %s | Slug: %s", c.Name, c.Avatar, c.Slug)
	}

	// At least one actor should have a resolved avatar
	hasAvatar := false
	for _, c := range movie.CastDetails {
		if c.Avatar != "" {
			hasAvatar = true
			break
		}
	}

	if !hasAvatar {
		t.Errorf("Expected at least one cast member to have a resolved avatar URL")
	}
}

func TestHandler_GetStreamSubtitles(t *testing.T) {
	h := &Handler{}

	embedURL := "https://v9.streamvsmov.com/video/e3fe5bb8-1578-47b0-a466-f76f09d3fc38"
	req := httptest.NewRequest(http.MethodGet, "/api/stream/subtitles?embedUrl="+embedURL, nil)
	w := httptest.NewRecorder()

	h.GetStreamSubtitles(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d: %s", w.Code, w.Body.String())
	}

	var subs []models.SubtitleTrack
	if err := json.NewDecoder(w.Body).Decode(&subs); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if len(subs) == 0 {
		t.Errorf("Expected subtitles to be returned, got 0")
	}

	t.Logf("Returned %d subtitles: %+v", len(subs), subs)
	hasVietnamese := false
	for _, sub := range subs {
		if sub.Lang == "vi" && strings.HasPrefix(sub.URL, "https://") && strings.HasSuffix(sub.URL, ".vtt") {
			hasVietnamese = true
		}
	}
	if !hasVietnamese {
		t.Errorf("Expected valid Vietnamese .vtt subtitle track")
	}
}

