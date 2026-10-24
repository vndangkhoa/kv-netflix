package api

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"

	"streamflow-backend/internal/models"
	"streamflow-backend/internal/scraper"

	"github.com/go-chi/chi/v5"
)

func newMockedTLSClient(srv *httptest.Server) *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			DialContext: func(ctx context.Context, network, _ string) (net.Conn, error) {
				var d net.Dialer
				return d.DialContext(ctx, network, srv.Listener.Addr().String())
			},
		},
	}
}

func TestNormalizeWebVTT(t *testing.T) {
	cases := []struct {
		name string
		in   []byte
		want string
	}{
		{
			name: "vsmov_malformed_webvtt_with_srt_commas",
			in:   []byte("WEBVTT\r\n\r\n1\r\n00:01:30,780 --> 00:01:34,371\r\n=Thượng Công Chúa="),
			want: "WEBVTT\n\n1\n00:01:30.780 --> 00:01:34.371\n=Thượng Công Chúa=",
		},
		{
			name: "webvtt_single_newline_before_cue",
			in:   []byte("WEBVTT\r\n1\r\n00:01:30,780 --> 00:01:34,371\r\n=Thượng Công Chúa="),
			want: "WEBVTT\n\n1\n00:01:30.780 --> 00:01:34.371\n=Thượng Công Chúa=",
		},
		{
			name: "pure_srt_without_webvtt_header",
			in:   []byte("1\r\n00:01:30,780 --> 00:01:34,371\r\n=Thượng Công Chúa=\r\n\r\n2\r\n00:01:35,000 --> 00:01:38,250\r\nXin chào"),
			want: "WEBVTT\n\n1\n00:01:30.780 --> 00:01:34.371\n=Thượng Công Chúa=\n\n2\n00:01:35.000 --> 00:01:38.250\nXin chào",
		},
		{
			name: "already_valid_webvtt",
			in:   []byte("WEBVTT\n\n1\n00:01:30.780 --> 00:01:34.371\n=Thượng Công Chúa=\n"),
			want: "WEBVTT\n\n1\n00:01:30.780 --> 00:01:34.371\n=Thượng Công Chúa=\n",
		},
		{
			name: "utf8_bom_with_webvtt",
			in:   []byte("\xef\xbb\xbfWEBVTT\r\n\r\n1\r\n00:01:30,780 --> 00:01:34,371\r\n=Thượng Công Chúa="),
			want: "WEBVTT\n\n1\n00:01:30.780 --> 00:01:34.371\n=Thượng Công Chúa=",
		},
		{
			name: "utf8_bom_with_pure_srt",
			in:   []byte("\xef\xbb\xbf1\r\n00:01:30,780 --> 00:01:34,371\r\n=Thượng Công Chúa="),
			want: "WEBVTT\n\n1\n00:01:30.780 --> 00:01:34.371\n=Thượng Công Chúa=",
		},
		{
			name: "short_timestamps_and_dialogue_untouched",
			in:   []byte("WEBVTT\n01:30,780 --> 01:34,371 align:middle\nLúc 10:30,500 người đến"),
			want: "WEBVTT\n\n01:30.780 --> 01:34.371 align:middle\nLúc 10:30,500 người đến",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := string(NormalizeWebVTT(tc.in))
			if got != tc.want {
				t.Errorf("NormalizeWebVTT(%s):\ngot:  %q\nwant: %q", tc.name, got, tc.want)
			}
			if !strings.HasPrefix(got, "WEBVTT\n\n") {
				t.Errorf("NormalizeWebVTT(%s) must start with WEBVTT\\n\\n, got %q", tc.name, got)
			}
		})
	}
}

func TestStreamSubtitleVTT(t *testing.T) {
	var gotReferer, gotUA string
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotReferer = r.Header.Get("Referer")
		gotUA = r.Header.Get("User-Agent")
		switch r.URL.Path {
		case "/video/abc/subtitle/vie_0.vtt":
			w.Header().Set("Content-Type", "text/vtt")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("\xef\xbb\xbfWEBVTT\r\n\r\n1\r\n00:01:30,780 --> 00:01:34,371\r\n=Thượng Công Chúa="))
		case "/subs/en.srt":
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("1\r\n00:00:01,000 --> 00:00:03,500\r\nHello world"))
		default:
			w.Header().Set("Content-Type", "text/html")
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte("<html><body>404 Not Found</body></html>"))
		}
	}))
	defer srv.Close()

	h := &Handler{
		StreamClient: newMockedTLSClient(srv),
	}
	r := chi.NewRouter()
	RegisterRoutes(r, h)

	t.Run("valid_vsmov_upstream_normalized", func(t *testing.T) {
		upstream := "https://v8.streamvsmov.com/video/abc/subtitle/vie_0.vtt"
		req := httptest.NewRequest(http.MethodGet, "/stream/vtt?url="+url.QueryEscape(upstream), nil)
		rec := httptest.NewRecorder()

		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200 (body=%q)", rec.Code, rec.Body.String())
		}
		if gotReferer != "https://vsmov.com/" {
			t.Errorf("Referer = %q, want https://vsmov.com/", gotReferer)
		}
		if gotUA != defaultUserAgent {
			t.Errorf("User-Agent = %q, want %q", gotUA, defaultUserAgent)
		}
		if ct := rec.Header().Get("Content-Type"); ct != "text/vtt; charset=utf-8" {
			t.Errorf("Content-Type = %q, want text/vtt; charset=utf-8", ct)
		}
		if cors := rec.Header().Get("Access-Control-Allow-Origin"); cors != "*" {
			t.Errorf("Access-Control-Allow-Origin = %q, want *", cors)
		}
		if cc := rec.Header().Get("Cache-Control"); cc != "public, max-age=86400" {
			t.Errorf("Cache-Control = %q, want public, max-age=86400", cc)
		}
		wantBody := "WEBVTT\n\n1\n00:01:30.780 --> 00:01:34.371\n=Thượng Công Chúa="
		if rec.Body.String() != wantBody {
			t.Errorf("body = %q, want %q", rec.Body.String(), wantBody)
		}
	})

	t.Run("non_vsmov_referer_uses_origin", func(t *testing.T) {
		upstream := "https://cdn.example.org/subs/en.srt"
		req := httptest.NewRequest(http.MethodGet, "/stream/vtt?url="+url.QueryEscape(upstream), nil)
		rec := httptest.NewRecorder()

		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		if gotReferer != "https://cdn.example.org" {
			t.Errorf("Referer = %q, want https://cdn.example.org", gotReferer)
		}
	})

	t.Run("ssrf_blocked_localhost_and_private_ips", func(t *testing.T) {
		blocked := []string{
			"http://localhost:8080/sub.vtt",
			"http://127.0.0.1:8080/sub.vtt",
			"http://169.254.169.254/latest/meta-data/",
			"http://192.168.1.1/sub.vtt",
			"file:///etc/passwd",
			"",
		}
		for _, target := range blocked {
			req := httptest.NewRequest(http.MethodGet, "/stream/vtt?url="+url.QueryEscape(target), nil)
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)
			if rec.Code != http.StatusBadRequest {
				t.Errorf("target %q: status = %d, want 400 Bad Request", target, rec.Code)
			}
		}
	})

	t.Run("upstream_404_passthrough_not_rewritten_as_webvtt", func(t *testing.T) {
		upstream := "https://v8.streamvsmov.com/video/abc/subtitle/missing.vtt"
		req := httptest.NewRequest(http.MethodGet, "/stream/vtt?url="+url.QueryEscape(upstream), nil)
		rec := httptest.NewRecorder()

		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want 404", rec.Code)
		}
		if strings.Contains(rec.Body.String(), "WEBVTT") {
			t.Errorf("404 response must not be rewritten as WEBVTT, got %q", rec.Body.String())
		}
		if ct := rec.Header().Get("Content-Type"); strings.Contains(ct, "text/vtt") {
			t.Errorf("404 response Content-Type must not be text/vtt, got %q", ct)
		}
		if cc := rec.Header().Get("Cache-Control"); strings.Contains(cc, "max-age=86400") {
			t.Errorf("404 response must not be cached, got Cache-Control=%q", cc)
		}
	})
}

func TestGetStreamSubtitles_RewritesURLWithoutMutatingCache(t *testing.T) {
	var upstreamHits int32
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&upstreamHits, 1)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`<html><script>var cfg = { subtitles: [{"name":"Tiếng Việt","url":"/video/test-cache-id/subtitle/vie_0.vtt","code":"vie"}] };</script></html>`))
	}))
	defer srv.Close()

	embedURL := "https://v8.streamvsmov.com/video/test-cache-id"
	subtitleCache.Delete(embedURL)
	defer subtitleCache.Delete(embedURL)

	h := &Handler{
		StreamClient: newMockedTLSClient(srv),
	}

	rawExpected := "https://v8.streamvsmov.com/video/test-cache-id/subtitle/vie_0.vtt"

	// Request 1: HTTPS via X-Forwarded-Proto on public domain
	req1 := httptest.NewRequest(http.MethodGet, "http://movies.example.com/api/stream/subtitles?embedUrl="+url.QueryEscape(embedURL), nil)
	req1.Header.Set("X-Forwarded-Proto", "https")
	rec1 := httptest.NewRecorder()
	h.GetStreamSubtitles(rec1, req1)

	if rec1.Code != http.StatusOK {
		t.Fatalf("req1 status = %d, body = %s", rec1.Code, rec1.Body.String())
	}
	var subs1 []models.SubtitleTrack
	if err := json.NewDecoder(rec1.Body).Decode(&subs1); err != nil {
		t.Fatalf("decode req1: %v", err)
	}
	want1 := "https://movies.example.com/api/stream/vtt?url=" + url.QueryEscape(rawExpected)
	if len(subs1) != 1 || subs1[0].URL != want1 {
		t.Fatalf("req1 subs = %+v, want URL %q", subs1, want1)
	}

	// Verify subtitleCache still holds raw upstream URL (not baked Host)
	cachedVal, ok := subtitleCache.Load(embedURL)
	if !ok {
		t.Fatalf("expected embedURL to be cached in subtitleCache")
	}
	cachedTracks := cachedVal.([]models.SubtitleTrack)
	if len(cachedTracks) != 1 || cachedTracks[0].URL != rawExpected {
		t.Fatalf("subtitleCache was mutated: got %+v, want raw URL %q", cachedTracks, rawExpected)
	}

	// Request 2: Plain HTTP on LAN host served from cache (no extra upstream hit, no double-wrap)
	req2 := httptest.NewRequest(http.MethodGet, "http://10.0.2.2:8080/api/stream/subtitles?embedUrl="+url.QueryEscape(embedURL), nil)
	rec2 := httptest.NewRecorder()
	h.GetStreamSubtitles(rec2, req2)

	if rec2.Code != http.StatusOK {
		t.Fatalf("req2 status = %d, body = %s", rec2.Code, rec2.Body.String())
	}
	var subs2 []models.SubtitleTrack
	if err := json.NewDecoder(rec2.Body).Decode(&subs2); err != nil {
		t.Fatalf("decode req2: %v", err)
	}
	want2 := "http://10.0.2.2:8080/api/stream/vtt?url=" + url.QueryEscape(rawExpected)
	if len(subs2) != 1 || subs2[0].URL != want2 {
		t.Fatalf("req2 subs = %+v, want URL %q", subs2, want2)
	}
	if hits := atomic.LoadInt32(&upstreamHits); hits != 1 {
		t.Errorf("upstreamHits = %d, want 1 (second call should hit subtitleCache)", hits)
	}
}

type stubSubtitleMovieProvider struct {
	movie *models.RophimMovie
}

func (s *stubSubtitleMovieProvider) GetMoviesByCategory(string, int) ([]models.RophimMovie, error) {
	return nil, nil
}
func (s *stubSubtitleMovieProvider) GetMoviesByCountry(string, int) ([]models.RophimMovie, error) {
	return nil, nil
}
func (s *stubSubtitleMovieProvider) Search(string, int) ([]models.RophimMovie, error) {
	return nil, nil
}
func (s *stubSubtitleMovieProvider) GetMovieDetail(slug string) (*models.RophimMovie, error) {
	if s.movie != nil && s.movie.Slug == slug {
		cp := *s.movie
		return &cp, nil
	}
	return nil, nil
}

func TestGetMovieDetail_RewritesSubtitleTracksWithoutDoubleWrap(t *testing.T) {
	rawSub := "https://v8.streamvsmov.com/video/xyz/subtitle/vie_0.vtt"
	alreadyProxied := "https://preset.example.com/api/stream/vtt?url=https%3A%2F%2Fv8.streamvsmov.com%2Fsub.vtt"

	provider := &stubSubtitleMovieProvider{
		movie: &models.RophimMovie{
			ID:       "test-movie",
			Title:    "Test Movie",
			Slug:     "test-movie",
			Provider: "VSMOV",
			Episodes: []models.Episode{
				{
					Number:     1,
					Title:      "Full",
					URL:        "https://v8.streamvsmov.com/stream/xyz/master.m3u8",
					ServerName: "VSMOV - Vietsub #1",
					Subtitles: []models.SubtitleTrack{
						{Label: "Tiếng Việt", Lang: "vi", URL: rawSub, Default: true},
						{Label: "English", Lang: "en", URL: alreadyProxied},
					},
				},
			},
		},
	}

	h := &Handler{
		Providers: []scraper.MovieProvider{provider},
	}
	r := chi.NewRouter()
	RegisterRoutes(r, h)

	req := httptest.NewRequest(http.MethodGet, "http://tv.local:8080/videos/test-movie", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var got models.RophimMovie
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(got.Episodes) != 1 || len(got.Episodes[0].Subtitles) != 2 {
		t.Fatalf("unexpected episodes/subtitles: %+v", got.Episodes)
	}

	wantSub0 := "https://tv.local:8080/api/stream/vtt?url=" + url.QueryEscape(rawSub)
	if got.Episodes[0].Subtitles[0].URL != wantSub0 {
		t.Errorf("Subtitles[0].URL = %q, want %q", got.Episodes[0].Subtitles[0].URL, wantSub0)
	}
	if got.Episodes[0].Subtitles[1].URL != alreadyProxied {
		t.Errorf("Subtitles[1].URL was double-wrapped: got %q, want %q", got.Episodes[0].Subtitles[1].URL, alreadyProxied)
	}
	if provider.movie.Episodes[0].Subtitles[0].URL != rawSub {
		t.Errorf("provider slice was mutated: got %q, want %q", provider.movie.Episodes[0].Subtitles[0].URL, rawSub)
	}
}
