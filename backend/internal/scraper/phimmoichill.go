package scraper

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"streamflow-backend/internal/models"

	"github.com/PuerkitoBio/goquery"
)

const PhimMoiChillBaseURL = "https://phimmoichill.my"

type PhimMoiChillScraper struct {
	client *http.Client
}

func NewPhimMoiChillScraper() *PhimMoiChillScraper {
	return &PhimMoiChillScraper{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (s *PhimMoiChillScraper) GetMoviesByCategory(category string, page int) ([]models.RophimMovie, error) {
	// Map categories to URL paths
	// Home -> list/phim-moi-cap-nhat (or just use list/phim-le for now as default)
	// category "phim-le", "phim-bo" -> list/phim-le
	// others -> genre/category

	var path string
	switch category {
	case "home", "":
		path = "list/phim-moi" // Better for home than phim-le
	case "phim-le", "phim-bo", "hoat-hinh", "tv-shows":
		path = fmt.Sprintf("list/%s", category)
	default:
		path = fmt.Sprintf("genre/phim-%s", category)
	}

	targetURL := fmt.Sprintf("%s/%s", PhimMoiChillBaseURL, path)
	if page > 1 {
		targetURL = fmt.Sprintf("%s?page=%d", targetURL, page)
	}

	return s.scrapeList(targetURL)
}

func (s *PhimMoiChillScraper) Search(query string, page int) ([]models.RophimMovie, error) {
	encodedQuery := strings.ReplaceAll(query, " ", "+")
	targetURL := fmt.Sprintf("%s/tim-kiem/%s/", PhimMoiChillBaseURL, encodedQuery)
	// If page > 1, might need suffix. Let's append ?page= just in case
	if page > 1 {
		targetURL = fmt.Sprintf("%s/tim-kiem/%s/page/%d", PhimMoiChillBaseURL, encodedQuery, page)
	}
	return s.scrapeList(targetURL)
}

func (s *PhimMoiChillScraper) scrapeList(targetURL string) ([]models.RophimMovie, error) {
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
	req.Header.Set("Accept-Language", "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7")
	req.Header.Set("Referer", PhimMoiChillBaseURL)
	req.Header.Set("Connection", "keep-alive")

	res, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return nil, fmt.Errorf("status code error: %d %s", res.StatusCode, res.Status)
	}

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return nil, err
	}

	var movies []models.RophimMovie

	// Selectors based on inspection (list-film item is common)
	// Assuming structure similar to: <ul class="list-film"> <li class="item"> ...
	doc.Find(".list-film .item").Each(func(i int, s *goquery.Selection) {
		linkTag := s.Find("a").First()
		href, _ := linkTag.Attr("href")
		title := linkTag.AttrOr("title", "")

		// Slug from href: https://phimmoichill.my/info/slug-pmID
		slug := ""
		if parts := strings.Split(href, "/info/"); len(parts) > 1 {
			slug = parts[1]
		}

		// Image
		imgTag := s.Find("img").First()
		thumb := imgTag.AttrOr("src", "")
		if dataSrc, exists := imgTag.Attr("data-src"); exists && dataSrc != "" {
			thumb = dataSrc
		}

		// Cleanup Name (Remove " - NameEN")
		name := title
		originName := ""
		if parts := strings.Split(title, " - "); len(parts) > 1 {
			name = parts[0]
			originName = parts[1]
		}

		// Episode Label / Status
		label := strings.TrimSpace(s.Find(".label .status").Text())
		if label == "" {
			label = strings.TrimSpace(s.Find(".label").Text())
		}

		movies = append(movies, models.RophimMovie{
			ID:            slug,
			Slug:          slug,
			Title:         name,
			OriginalTitle: originName,
			Thumbnail:     thumb,
			Quality:       label,
			Category:      "movies",
			Provider:      "PhimMoiChill",
		})
	})

	return movies, nil
}

func (s *PhimMoiChillScraper) GetMovieDetail(slug string) (*models.RophimMovie, error) {
	// slug likely includes the ID suffix, e.g. "linh-truong-pm17080"
	targetURL := fmt.Sprintf("%s/info/%s", PhimMoiChillBaseURL, slug)

	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	res, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != 200 {
		return nil, fmt.Errorf("status code error: %d %s", res.StatusCode, res.Status)
	}

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return nil, err
	}

	movie := &models.RophimMovie{
		ID:   slug,
		Slug: slug,
	}

	// Info
	// Selectors need guessing or checking. Assuming .entry-title, .name-real
	movie.Title = doc.Find("h1.entry-title, h1.title, h1").First().Text()
	movie.OriginalTitle = doc.Find(".name-real, h2.real-name").First().Text()
	movie.Description = doc.Find(".film-content, .entry-content, #info-film").Text()
	movie.Thumbnail = doc.Find(".film-info .poster img, .image img").AttrOr("src", "")

	// Details
	doc.Find(".list-info li, .film-info li").Each(func(i int, s *goquery.Selection) {
		text := s.Text()
		if strings.Contains(text, "Quốc gia:") {
			movie.Country = strings.TrimSpace(strings.Replace(text, "Quốc gia:", "", 1))
		}
		if strings.Contains(text, "Đạo diễn:") {
			movie.Director = strings.TrimSpace(strings.Replace(text, "Đạo diễn:", "", 1))
		}
		if strings.Contains(text, "Thể loại:") {
			movie.Genre = strings.TrimSpace(strings.Replace(text, "Thể loại:", "", 1))
		}
		if strings.Contains(text, "Năm phát hành:") {
			yearStr := strings.TrimSpace(strings.Replace(text, "Năm phát hành:", "", 1))
			if y, err := strconv.Atoi(yearStr); err == nil {
				movie.Year = y
			}
		}
	})

	// Episodes
	// Look for latest-episode links
	var episodes []models.Episode
	epMap := make(map[int]int) // map[epNum]sliceIndex
	doc.Find(".latest-episode a").Each(func(i int, s *goquery.Selection) {
		epName := strings.TrimSpace(s.Text())
		href, _ := s.Attr("href")

		epNum := 0
		if strings.EqualFold(epName, "Full") {
			epNum = 1
		} else {
			// Try "Tập 1", "Tập 2"
			fmt.Sscanf(epName, "Tập %d", &epNum)
		}

		if epNum == 0 {
			// Try to extract from title if current text is just "Tap X"
			fmt.Sscanf(epName, "%d", &epNum)
		}

		if epNum == 0 {
			epNum = i + 1
		}

		if idx, exists := epMap[epNum]; exists {
			if episodes[idx].URL == "" && href != "" {
				episodes[idx].URL = href
				episodes[idx].Title = epName
			}
		} else {
			epMap[epNum] = len(episodes)
			episodes = append(episodes, models.Episode{
				Number:     epNum,
				Title:      epName,
				URL:        href,
				ServerName: "PhimMoiChill",
			})
		}
	})

	// Fallback: If no episodes found, finding "Xem phim" button for single movie
	if len(episodes) == 0 {
		// Common selectors for "Watch" button: .btn-watch, a:contains("Xem phim")
		watchBtn := doc.Find("a.btn-watch, a.btn-see, ul.btn-block a")
		if watchBtn.Length() > 0 {
			href, _ := watchBtn.Attr("href")
			if strings.Contains(href, "/xem/") {
				episodes = append(episodes, models.Episode{
					Number:     1,
					Title:      "Full",
					URL:        href,
					ServerName: "PhimMoiChill",
				})
			}
		} else {
			// Try text content
			doc.Find("a").Each(func(i int, s *goquery.Selection) {
				if strings.Contains(strings.ToLower(s.Text()), "xem phim") {
					href, _ := s.Attr("href")
					if strings.Contains(href, "/xem/") {
						episodes = append(episodes, models.Episode{
							Number:     1,
							Title:      "Full",
							URL:        href,
							ServerName: "PhimMoiChill",
						})
						return // Break
					}
				}
			})
		}
	}

	movie.Episodes = episodes

	return movie, nil
}
