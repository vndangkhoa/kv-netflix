package api

import (
	"fmt"
	"html"
	"net/http"
	"strings"
)

// ogBotUAs lists known social-network / messaging crawlers that fetch a URL
// and render a link preview without executing JavaScript. Facebook and
// Messenger both use the "facebookexternalhit" bot. Serving Open Graph markup
// to these user agents lets a shared link display the movie thumbnail, title,
// and description in the chat.
var ogBotUAs = []string{
	"facebookexternalhit",
	"facebot",
	"twitterbot",
	"linkedinbot",
	"slackbot",
	"discordbot",
	"whatsapp",
	"telegrambot",
	"pinterest",
	"vkShare",
	"vkbot",
	"embedly",
	"quora link preview",
	"yandex",
}

const siteName = "StreamFlow"

// isSocialCrawler reports whether the given User-Agent belongs to a link
// preview / social crawler that needs server-rendered Open Graph tags.
func isSocialCrawler(ua string) bool {
	lower := strings.ToLower(ua)
	for _, bot := range ogBotUAs {
		if strings.Contains(lower, bot) {
			return true
		}
	}
	return false
}

// normalizePath collapses duplicate slashes and lowercases the path so that
// crawler URLs like "//WATCH/soulm8te" still match the OG routes instead of
// falling through to the SPA, where trailing-slash redirects can loop.
func normalizePath(p string) string {
	lower := strings.ToLower(p)
	for strings.Contains(lower, "//") {
		lower = strings.ReplaceAll(lower, "//", "/")
	}
	return lower
}

// OGCrawlerMiddleware intercepts requests for the home page or /watch/* URLs
// coming from social crawlers and serves a prerendered Open Graph page so link
// previews show the relevant image, title, and description. All other requests
// (including normal browsers) pass through to the SPA.
func OGCrawlerMiddleware(h *Handler) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodGet || !isSocialCrawler(r.UserAgent()) {
				next.ServeHTTP(w, r)
				return
			}
			path := normalizePath(r.URL.Path)
			if path == "/" || path == "" {
				h.ServeHomeOG(w, r)
				return
			}
			if strings.HasPrefix(path, "/watch/") {
				h.ServeWatchOG(w, r)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// baseURL resolves the public origin used for og:url / canonical links,
// honoring an explicitly configured PUBLIC_URL and common proxy headers.
func (h *Handler) baseURL(r *http.Request) string {
	if h.PublicURL != "" {
		return strings.TrimRight(h.PublicURL, "/")
	}
	scheme := "http"
	if proto := r.Header.Get("X-Forwarded-Proto"); proto != "" {
		scheme = strings.Split(proto, ",")[0]
	} else if r.TLS != nil {
		scheme = "https"
	}
	return scheme + "://" + r.Host
}

// fallbackImageURL returns the absolute URL of the app's default poster, used
// when a movie has no thumbnail/backdrop so link previews never render broken.
func (h *Handler) fallbackImageURL(r *http.Request) string {
	return h.baseURL(r) + "/poster-default.jpg"
}

// ServeHomeOG renders Open Graph meta tags for the root page.
func (h *Handler) ServeHomeOG(w http.ResponseWriter, r *http.Request) {
	origin := h.baseURL(r)
	h.renderOG(w,
		siteName+" - Watch Movies Online",
		"Stream your favorite movies and TV shows in HD for free.",
		h.fallbackImageURL(r),
		"website",
		origin+"/",
	)
}

// ServeWatchOG renders the Open Graph / Twitter Card meta tags for a
// /watch/:slug (or /watch/:slug/:episode) URL based on the live movie data.
func (h *Handler) ServeWatchOG(w http.ResponseWriter, r *http.Request) {
	// Path is /watch/:slug or /watch/:slug/:episode — take the first segment.
	slug := strings.TrimPrefix(normalizePath(r.URL.Path), "/watch/")
	slug = strings.Trim(slug, "/")
	if i := strings.Index(slug, "/"); i >= 0 {
		slug = slug[:i]
	}

	origin := h.baseURL(r)
	canonical := origin + "/watch/" + slug

	title := siteName + " - Watch Movies Online"
	description := "Stream your favorite movies and TV shows in HD for free."
	image := h.fallbackImageURL(r)
	ogType := "website"

	if slug != "" {
		if movie, err := h.fetchMovieDetail(slug); err == nil && movie != nil {
			if movie.Thumbnail != "" {
				image = movie.Thumbnail
			} else if movie.Backdrop != "" {
				image = movie.Backdrop
			}
			if movie.Title != "" {
				title = movie.Title
			}
			if movie.Description != "" {
				description = movie.Description
			}
			// Movie detail pages are video previews — helps platforms render a
			// play affordance in some clients.
			ogType = "video.other"
			if movie.Year > 0 {
				title = fmt.Sprintf("%s (%d)", movie.Title, movie.Year)
			}
		}
	}

	h.renderOG(w, title, description, image, ogType, canonical)
}

// renderOG writes an HTML page carrying Open Graph and Twitter Card tags.
// og:image must be an absolute, publicly reachable URL for crawlers to fetch.
func (h *Handler) renderOG(w http.ResponseWriter, title, description, image, ogType, canonical string) {
	escTitle := html.EscapeString(title)
	escDesc := html.EscapeString(description)
	escImage := html.EscapeString(image)
	escURL := html.EscapeString(canonical)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=600")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>%s</title>
<meta name="description" content="%s" />
<meta property="og:site_name" content="%s" />
<meta property="og:title" content="%s" />
<meta property="og:description" content="%s" />
<meta property="og:type" content="%s" />
<meta property="og:url" content="%s" />
<meta property="og:image" content="%s" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="%s" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="%s" />
<meta name="twitter:description" content="%s" />
<meta name="twitter:image" content="%s" />
<link rel="canonical" href="%s" />
</head>
<body>
<a href="%s">%s</a>
</body>
</html>
`, escTitle, escDesc, siteName, escTitle, escDesc, ogType, escURL, escImage, escTitle,
		escTitle, escDesc, escImage, escURL, escURL, escTitle)
}
