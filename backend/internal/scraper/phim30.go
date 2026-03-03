package scraper

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"streamflow-backend/internal/models"

	"github.com/PuerkitoBio/goquery"
)

func parseEpisodeNumber(title string) int {
	// e.g "Tập 1", "Tập 01", "Full"
	t := strings.ToLower(strings.TrimSpace(title))
	if t == "full" {
		return 1
	}
	t = strings.ReplaceAll(t, "tập ", "")
	t = strings.ReplaceAll(t, "tap ", "")

	// handle multi-spaces
	parts := strings.Fields(t)
	if len(parts) > 0 {
		num, err := strconv.Atoi(parts[0])
		if err == nil {
			return num
		}
	}
	return 1
}

const Phim30BaseURL = "https://phim30.me"

type Phim30Scraper struct {
	client *http.Client
}

func NewPhim30Scraper() *Phim30Scraper {
	return &Phim30Scraper{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (p *Phim30Scraper) Search(query string, page int) ([]models.RophimMovie, error) {
	searchURL := fmt.Sprintf("%s/tim-kiem?keyword=%s&page=%d", Phim30BaseURL, url.QueryEscape(query), page)
	return p.scrapeMovieList(searchURL)
}

func (p *Phim30Scraper) GetMoviesByCategory(category string, page int) ([]models.RophimMovie, error) {
	if category == "" || category == "home" {
		homeURL := fmt.Sprintf("%s/?page=%d", Phim30BaseURL, page)
		return p.scrapeMovieList(homeURL)
	}

	var path string
	switch category {
	case "phim-le", "phim-bo", "phim-sap-chieu":
		path = fmt.Sprintf("danh-sach/%s", category)
	default:
		// Assume everything else is a Genre (e.g., hanh-dong, hoat-hinh, tv-shows)
		path = fmt.Sprintf("the-loai/%s", category)
	}

	catURL := fmt.Sprintf("%s/%s?page=%d", Phim30BaseURL, path, page)
	return p.scrapeMovieList(catURL)
}

func cleanImageUrl(rawURL string) string {
	if strings.Contains(rawURL, "cdn-image-tf.phim30.me") {
		// Example: https://cdn-image-tf.phim30.me/unsafe/360x0/filters:quality(90)/https%3A%2F%2Fphimimg.com%2Fupload%2Fvod%2F...
		parts := strings.SplitN(rawURL, "/https", 2)
		if len(parts) == 2 {
			decoded, err := url.QueryUnescape("https" + parts[1])
			if err == nil {
				return decoded
			}
		}
	}
	return rawURL
}

func (p *Phim30Scraper) scrapeMovieList(targetURL string) ([]models.RophimMovie, error) {
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("phim30 returned status: %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var movies []models.RophimMovie

	doc.Find("a[href^='https://phim30.me/phim/']").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		title, _ := s.Attr("title")

		if title == "" {
			title = strings.TrimSpace(s.Text())
		}

		// Remove the base url to get the slug
		slug := strings.TrimPrefix(href, "https://phim30.me/phim/")

		// Try to find an image child (check data-src for lazy-loaded images)
		thumb := ""
		s.Find("img").Each(func(j int, img *goquery.Selection) {
			src, _ := img.Attr("src")
			dataSrc, _ := img.Attr("data-src")
			lazySrc, _ := img.Attr("lazy-src")
			if dataSrc != "" {
				thumb = dataSrc
			} else if lazySrc != "" {
				thumb = lazySrc
			} else if src != "" && !strings.Contains(src, "data:image") {
				thumb = src
			}
		})

		if title != "" && slug != "" && !strings.Contains(slug, "the-loai") && !strings.Contains(slug, "quoc-gia") && !strings.Contains(slug, "nam-phat-hanh") {
			movies = append(movies, models.RophimMovie{
				ID:            slug,
				Slug:          slug,
				Title:         title,
				OriginalTitle: title,
				Thumbnail:     cleanImageUrl(thumb),
				Backdrop:      cleanImageUrl(thumb),
				Provider:      "Phim30.me",
			})
		}
	})

	// Deduplicate movies because a search page might have multiple links to the same movie
	var uniqueMovies []models.RophimMovie
	seen := make(map[string]bool)
	for _, m := range movies {
		if !seen[m.Slug] {
			seen[m.Slug] = true
			uniqueMovies = append(uniqueMovies, m)
		}
	}

	return uniqueMovies, nil
}

func (p *Phim30Scraper) GetMovieDetail(slug string) (*models.RophimMovie, error) {
	targetURL := fmt.Sprintf("%s/phim/%s", Phim30BaseURL, slug)
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("phim30 returned status: %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	movie := &models.RophimMovie{
		ID:   slug,
		Slug: slug,
	}

	title := doc.Find("h1.movie-title").Text()
	if title == "" {
		title = doc.Find("title").Text()
		title = strings.Split(title, "–")[0]
		title = strings.TrimSpace(title)
	}
	movie.Title = title
	movie.OriginalTitle = title

	thumb := ""
	doc.Find("div.movie-l-img img").Each(func(i int, img *goquery.Selection) {
		if src, ok := img.Attr("src"); ok {
			thumb = src
		}
	})
	if thumb != "" {
		movie.Thumbnail = cleanImageUrl(thumb)
		movie.Backdrop = cleanImageUrl(thumb)
	}

	movie.Provider = "Phim30.me"

	var eps []models.Episode
	doc.Find("a[href*='/xem-phim/']").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		epName := strings.TrimSpace(s.Text())

		if epName != "" && href != "" {
			if !strings.HasPrefix(href, "http") {
				href = Phim30BaseURL + href
			}
			eps = append(eps, models.Episode{
				ServerName: "Phim30",
				Title:      epName,
				Number:     parseEpisodeNumber(epName),
				URL:        href,
			})
		}
	})

	if len(eps) > 0 {
		movie.Episodes = eps
	}

	return movie, nil
}
