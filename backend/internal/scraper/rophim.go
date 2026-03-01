package scraper

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"streamflow-backend/internal/models"

	"github.com/PuerkitoBio/goquery"
)

const BaseURL = "https://phimmoichill.network"

type RophimScraper struct {
	client *http.Client
}

func NewRophimScraper() *RophimScraper {
	// Create custom client to handle SSL constraints if needed, similar to Python's ssl_context
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{
		Transport: tr,
		Timeout:   30 * time.Second,
	}
	return &RophimScraper{client: client}
}

func (s *RophimScraper) fetchDocument(url string) (*goquery.Document, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Referer", BaseURL)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("status code error: %d %s", resp.StatusCode, resp.Status)
	}

	return goquery.NewDocumentFromReader(resp.Body)
}

func (s *RophimScraper) GetHomepageMovies(page int, limit int) ([]models.RophimMovie, error) {
	url := fmt.Sprintf("%s/danh-sach/phim-le", BaseURL)
	if page > 1 {
		url = fmt.Sprintf("%s/danh-sach/phim-le/page/%d", BaseURL, page)
	}

	doc, err := s.fetchDocument(url)
	if err != nil {
		return nil, err
	}

	return s.parseMovieGrid(doc, limit), nil
}

func (s *RophimScraper) Search(query string, limit int) ([]models.RophimMovie, error) {
	url := fmt.Sprintf("%s/tim-kiem?keyword=%s", BaseURL, query)
	doc, err := s.fetchDocument(url)
	if err != nil {
		return nil, err
	}
	return s.parseMovieGrid(doc, limit), nil
}

func (s *RophimScraper) parseMovieGrid(doc *goquery.Document, limit int) []models.RophimMovie {
	var movies []models.RophimMovie

	doc.Find(".myui-vodlist__box").EachWithBreak(func(i int, s *goquery.Selection) bool {
		if i >= limit {
			return false
		}

		link := s.Find("a.myui-vodlist__thumb")
		if link.Length() == 0 {
			link = s.Find("a[href*='/phim/']")
		}
		if link.Length() == 0 {
			return true
		}

		href, _ := link.Attr("href")
		slug := extractSlug(href)
		if slug == "" {
			return true
		}

		title, _ := link.Attr("title")
		if title == "" {
			title = s.Find("h4.title a").Text()
		}

		style, _ := link.Attr("style")
		thumbnail := extractThumbnail(style)
		if thumbnail == "" {
			thumbnail, _ = s.Find("img").Attr("src")
		}

		quality := s.Find(".pic-tag").Text()
		if quality == "" {
			quality = "HD"
		}

		engTitle := s.Find(".text-muted").Text()

		movie := models.RophimMovie{
			ID:            slug,
			Title:         strings.TrimSpace(title),
			OriginalTitle: strings.TrimSpace(engTitle),
			Slug:          slug,
			Thumbnail:     normalizeURL(thumbnail),
			Quality:       strings.TrimSpace(quality),
			Category:      "movies", // Default
		}
		movies = append(movies, movie)
		return true
	})

	return movies
}

func (s *RophimScraper) GetMovieDetail(slug string) (*models.RophimMovie, error) {
	url := fmt.Sprintf("%s/phim/%s", BaseURL, slug)
	doc, err := s.fetchDocument(url)
	if err != nil {
		return nil, err
	}

	return s.parseMovieDetail(doc, slug), nil
}

func (s *RophimScraper) parseMovieDetail(doc *goquery.Document, slug string) *models.RophimMovie {
	title := doc.Find("h1.movie-title").Text()
	if title == "" {
		title = doc.Find("h1").Text()
	}

	description := doc.Find("meta[name='description']").AttrOr("content", "")
	if description == "" {
		description = doc.Find(".description, .content, .film-description").Text()
	}

	poster := doc.Find("meta[property='og:image']").AttrOr("content", "")

	// Parse Info (Year, Country, etc) - simplified for brevity
	var year int
	doc.Find(".movie-info li, .film-info li").Each(func(i int, s *goquery.Selection) {
		text := s.Text()
		if strings.Contains(text, "Năm") || strings.Contains(text, "Year") {
			re := regexp.MustCompile(`\d{4}`)
			if match := re.FindString(text); match != "" {
				year, _ = strconv.Atoi(match)
			}
		}
	})

	// Parse Episodes
	var episodes []models.Episode
	doc.Find("a[href*='/tap-'], a[href*='episode'], .episode-list a").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		text := strings.TrimSpace(s.Text())

		re := regexp.MustCompile(`tap-(\d+)`)
		match := re.FindStringSubmatch(href)
		if len(match) > 1 {
			epNum, _ := strconv.Atoi(match[1])
			episodes = append(episodes, models.Episode{
				Number: epNum,
				Title:  text,
				URL:    normalizeURL(href),
			})
		}
	})

	// De-duplicate episodes
	seen := make(map[int]bool)
	var uniqueEpisodes []models.Episode
	for _, ep := range episodes {
		if !seen[ep.Number] {
			seen[ep.Number] = true
			uniqueEpisodes = append(uniqueEpisodes, ep)
		}
	}

	return &models.RophimMovie{
		ID:          slug,
		Title:       strings.TrimSpace(title),
		Slug:        slug,
		Thumbnail:   normalizeURL(poster),
		Description: strings.TrimSpace(description),
		Year:        year,
		Episodes:    uniqueEpisodes,
		Category:    "movies",
	}
}

func extractSlug(url string) string {
	re := regexp.MustCompile(`/phim/([^/?#]+)`)
	matches := re.FindStringSubmatch(url)
	if len(matches) > 1 {
		return matches[1]
	}
	// Fallback
	parts := strings.Split(url, "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return ""
}

func extractThumbnail(style string) string {
	re := regexp.MustCompile(`url\(([^)]+)\)`)
	matches := re.FindStringSubmatch(style)
	if len(matches) > 1 {
		return strings.Trim(matches[1], "'\"")
	}
	return ""
}

func normalizeURL(url string) string {
	if url == "" {
		return ""
	}
	if strings.HasPrefix(url, "//") {
		return "https:" + url
	}
	if strings.HasPrefix(url, "/") {
		return BaseURL + url
	}
	return url
}
