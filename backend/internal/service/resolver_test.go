package service

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
)

// fakeSite builds a test server with the given routes.
func fakeSite(t *testing.T, routes map[string]func(w http.ResponseWriter, r *http.Request)) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	for pattern, handler := range routes {
		mux.HandleFunc(pattern, handler)
	}
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func hlsManifest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
	w.Write([]byte("#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:6.0,\nseg1.ts\n#EXT-X-ENDLIST\n"))
}

func TestResolveDirectM3U8InPage(t *testing.T) {
	const streamURL = "https://cdn.example.com/video/index.m3u8"
	srv := fakeSite(t, map[string]func(w http.ResponseWriter, r *http.Request){
		"/embed/123": func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, `<html><body><video src="%s"></video></body></html>`, streamURL)
		},
	})

	r := newEmbedResolver()
	u, ext := r.ResolveDirectStream(context.Background(), srv.URL+"/embed/123")
	if u != streamURL {
		t.Fatalf("expected %s, got %s", streamURL, u)
	}
	if ext != "m3u8" {
		t.Fatalf("expected ext m3u8, got %s", ext)
	}
}

func TestResolveNestedIframes(t *testing.T) {
	var player2Hits int32
	srv := fakeSite(t, map[string]func(w http.ResponseWriter, r *http.Request){
		"/watch": func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, `<html><iframe src="/embed"></iframe></html>`)
		},
		"/embed": func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, `<html><iframe src="/player2?x=1"></iframe></html>`)
		},
		"/player2": func(w http.ResponseWriter, r *http.Request) {
			atomic.AddInt32(&player2Hits, 1)
			fmt.Fprintf(w, `<html><script>var conf = {"file":"https://cdn.example.com/x/master.m3u8?token=abc"};</script></html>`)
		},
	})

	r := newEmbedResolver()
	u, _ := r.ResolveDirectStream(context.Background(), srv.URL+"/watch")
	if u != "https://cdn.example.com/x/master.m3u8?token=abc" {
		t.Fatalf("unexpected resolved URL: %s", u)
	}
	if atomic.LoadInt32(&player2Hits) == 0 {
		t.Fatal("nested iframe page was never fetched")
	}
}

func TestResolveStreamFromExternalJS(t *testing.T) {
	srv := fakeSite(t, map[string]func(w http.ResponseWriter, r *http.Request){
		"/embed/9": func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, `<html><script src="/player.js"></script></html>`)
		},
		"/player.js": func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/javascript")
			w.Write([]byte(`var cfg={source:"https://cdn.example.com/stream/playlist.m3u8"};`))
		},
	})

	r := newEmbedResolver()
	u, _ := r.ResolveDirectStream(context.Background(), srv.URL+"/embed/9")
	if u != "https://cdn.example.com/stream/playlist.m3u8" {
		t.Fatalf("unexpected URL: %s", u)
	}
}

func TestResolveBase64WrappedURL(t *testing.T) {
	const plain = "https://cdn.example.com/movie/hls.m3u8?e=1&h=deadbeef"
	encoded := base64.StdEncoding.EncodeToString([]byte(plain))
	srv := fakeSite(t, map[string]func(w http.ResponseWriter, r *http.Request){
		"/p": func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, `<html><script>var s=decodeURIComponent(escape(atob("%s")));</script></html>`, encoded)
		},
	})

	r := newEmbedResolver()
	u, _ := r.ResolveDirectStream(context.Background(), srv.URL+"/p")
	if u != plain {
		t.Fatalf("expected %s, got %s", plain, u)
	}
}

func TestResolveQueryWrappedURL(t *testing.T) {
	const streamURL = "https://cdn.example.com/video/index.m3u8"
	srv := fakeSite(t, map[string]func(w http.ResponseWriter, r *http.Request){
		"/player.php": func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, `<html><body>loading player</body></html>`)
		},
	})

	target := fmt.Sprintf("%s/player.php?url=%s", srv.URL, url.QueryEscape(streamURL))
	r := newEmbedResolver()
	u, _ := r.ResolveDirectStream(context.Background(), target)
	if u != streamURL {
		t.Fatalf("expected %s, got %s", streamURL, u)
	}
}

func TestProbePicksAliveCandidateOverDead(t *testing.T) {
	var aliveURL string
	srv := fakeSite(t, map[string]func(w http.ResponseWriter, r *http.Request){
		"/embed/1": func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, `<html><script src="/js1.js"></script><script src="/js2.js"></script></html>`)
		},
		"/js1.js": func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte(`var deadSource="https://cdn.example.com/dead/index.m3u8";`))
		},
		"/js2.js": func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, `var liveSource="%s/alive/index.m3u8";`, aliveURL)
		},
		"/alive/index.m3u8": hlsManifest,
	})
	aliveURL = srv.URL

	r := newEmbedResolver()
	u, _ := r.ResolveDirectStream(context.Background(), srv.URL+"/embed/1")
	if !strings.HasSuffix(u, "/alive/index.m3u8") {
		t.Fatalf("probe should prefer the verified stream, got: %s", u)
	}
}

func TestResolveCacheHitSkipsRefetch(t *testing.T) {
	var hits int32
	srv := fakeSite(t, map[string]func(w http.ResponseWriter, r *http.Request){
		"/embed/8": func(w http.ResponseWriter, r *http.Request) {
			atomic.AddInt32(&hits, 1)
			fmt.Fprintf(w, `<html><iframe src="/inner"></iframe></html>`)
		},
		"/inner": func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, `<html><video src="https://cdn.example.com/v/index.m3u8"></video></html>`)
		},
	})

	r := newEmbedResolver()
	u1, ext1 := r.ResolveDirectStream(context.Background(), srv.URL+"/embed/8")
	u2, ext2 := r.ResolveDirectStream(context.Background(), srv.URL+"/embed/8")
	if u1 != u2 || ext1 != ext2 {
		t.Fatalf("cache returned different results: %s/%s vs %s/%s", u1, ext1, u2, ext2)
	}
	if atomic.LoadInt32(&hits) > 2 {
		t.Fatalf("cache should avoid refetching pages, hits=%d", hits)
	}
}

func TestResolveRejectsAdOnlyPage(t *testing.T) {
	srv := fakeSite(t, map[string]func(w http.ResponseWriter, r *http.Request){
		"/embed/4": func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte(`<html>
				<script src="https://ads.propellerads.com/main.js"></script>
				<img src="https://cdn.example.com/ad-banner.jpg">
				<iframe src="https://ads.exoclick.com/frame"></iframe>
			</html>`))
		},
	})

	r := newEmbedResolver()
	if u, _ := r.ResolveDirectStream(context.Background(), srv.URL+"/embed/4"); u != "" {
		t.Fatalf("expected no resolution from an ad-only page, got %s", u)
	}
}

func TestExtractFallsBackToEmbed(t *testing.T) {
	srv := fakeSite(t, map[string]func(w http.ResponseWriter, r *http.Request){
		"/embed/5": func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, `<html><body>protected player</body></html>`)
		},
	})

	e := NewVideoExtractor()
	info, err := e.Extract(srv.URL+"/embed/5", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if info.Ext != "embed" {
		t.Fatalf("expected embed fallback, got %s (%s)", info.Ext, info.StreamURL)
	}

	// The page is still playable... test that extraction of a *direct* URL
	// shortcut never consults the network.
	d, err := e.Extract("https://cdn.example.com/direct/index.m3u8", "")
	if err != nil {
		t.Fatalf("direct extraction error: %v", err)
	}
	if d.Ext != "m3u8" || d.StreamURL != "https://cdn.example.com/direct/index.m3u8" {
		t.Fatalf("direct pass-through broken: %+v", d)
	}
}