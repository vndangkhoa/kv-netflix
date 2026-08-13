package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestIsSocialCrawler(t *testing.T) {
	cases := []struct {
		ua   string
		want bool
	}{
		{"facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", true},
		{"Facebot", true},
		{"Mozilla/5.0 (compatible; Twitterbot/1.0)", true},
		{"Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)", true},
		{"TelegramBot (like TwitterBot)", true},
		{"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36", false},
		{"curl/7.81.0", false},
	}
	for _, c := range cases {
		if got := isSocialCrawler(c.ua); got != c.want {
			t.Errorf("isSocialCrawler(%q) = %v, want %v", c.ua, got, c.want)
		}
	}
}

func TestServeWatchOGFallsBackToDefaults(t *testing.T) {
	h := &Handler{} // nil providers -> fetchMovieDetail returns not found -> defaults
	req := httptest.NewRequest(http.MethodGet, "https://example.com/watch/some-movie/1", nil)
	req.Header.Set("User-Agent", "facebookexternalhit/1.1")
	rec := httptest.NewRecorder()

	h.ServeWatchOG(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	body := rec.Body.String()
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
		t.Errorf("Content-Type = %q, want text/html", ct)
	}
	for _, want := range []string{
		`og:title`,
		`og:type`,
		`og:url`,
		`https://example.com/watch/some-movie`,
		`twitter:card`,
	} {
		if !strings.Contains(body, want) {
			t.Errorf("response missing %q", want)
		}
	}
}

func TestServeWatchOGCrawlerMiddleware(t *testing.T) {
	h := &Handler{}
	passed := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { passed = true; w.WriteHeader(200) })
	mw := OGCrawlerMiddleware(h)

	// Crawler on a /watch/ path is intercepted (next NOT called).
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/watch/some-movie", nil)
	req.Header.Set("User-Agent", "facebookexternalhit/1.1")
	mw(next).ServeHTTP(rec, req)
	if !strings.Contains(rec.Body.String(), "og:title") {
		t.Errorf("crawler request not intercepted; body=%q", rec.Body.String())
	}
	if passed {
		t.Errorf("crawler request should not reach the SPA handler")
	}

	// Normal browser passes through to the SPA handler.
	passed = false
	rec2 := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "/watch/some-movie", nil)
	req2.Header.Set("User-Agent", "Mozilla/5.0 Chrome/120 Safari/537.36")
	mw(next).ServeHTTP(rec2, req2)
	if !passed {
		t.Errorf("normal browser should pass through to SPA")
	}
}
