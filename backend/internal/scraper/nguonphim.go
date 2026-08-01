package scraper

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"streamflow-backend/internal/models"

	"github.com/PuerkitoBio/goquery"
)

const NguonPhimBaseURL = "https://phim.nguonc.com"

type NguonPhimScraper struct {
	client *http.Client
}

func NewNguonPhimScraper() *NguonPhimScraper {
	return &NguonPhimScraper{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type nguonPhimResponse struct {
	Message  string          `json:"message"`
	Alert    string          `json:"alert"`
	Link     json.RawMessage `json:"link"`
	ViewUp   [][]interface{} `json:"view_up"`
	ViewDel  string          `json:"view_delete"`
	BackTop  string          `json:"back_to_top"`
}

func (s *NguonPhimScraper) fetchJSON(url string) (*nguonPhimResponse, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result nguonPhimResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *NguonPhimScraper) fetchDocument(url string) (*goquery.Document, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

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

func (s *NguonPhimScraper) extractHTMLFromResponse(resp *nguonPhimResponse) string {
	for _, item := range resp.ViewUp {
		if len(item) >= 2 {
			key, ok := item[0].(string)
			if ok && key == "#content" {
				html, ok := item[1].(string)
				if ok {
					return html
				}
			}
		}
	}
	return ""
}

func (s *NguonPhimScraper) parseListingHTML(html string) []models.RophimMovie {
	var movies []models.RophimMovie
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return movies
	}

	doc.Find("tr").Each(func(i int, row *goquery.Selection) {
		link := row.Find("a.nc-movie-identity")
		href, exists := link.Attr("href")
		if !exists || href == "" {
			return
		}

		slug := extractSlugFromPath(href)
		if slug == "" {
			return
		}

		title := strings.TrimSpace(row.Find("strong").First().Text())
		origTitle := strings.TrimSpace(row.Find("span.nc-movie-copy span").First().Text())

		thumb := ""
		img := row.Find("img")
		if src, exists := img.Attr("data-src"); exists {
			thumb = src
		} else if src, exists := img.Attr("src"); exists && !strings.HasPrefix(src, "data:image") {
			thumb = src
		}

		yearStr := ""
		row.Find("span.nc-tag").Each(func(j int, tag *goquery.Selection) {
			text := strings.TrimSpace(tag.Text())
			if yearStr == "" {
				if _, err := strconv.Atoi(text); err == nil && len(text) == 4 {
					yearStr = text
				}
			}
		})

		year, _ := strconv.Atoi(yearStr)

		movies = append(movies, models.RophimMovie{
			ID:            slug,
			Title:         title,
			OriginalTitle: origTitle,
			Slug:          slug,
			Thumbnail:     parseNguonPhimImageUrl(thumb),
			Year:          year,
			Category:      "movies",
			Provider:      "NguonPhim",
			Quality:       "HD",
			Lang:          "Vietsub",
		})
	})

	return movies
}

func (s *NguonPhimScraper) GetMoviesByCategory(category string, page int) ([]models.RophimMovie, error) {
	var listURL string
	if page < 1 {
		page = 1
	}

	switch category {
	case "home", "":
		if page <= 1 {
			listURL = fmt.Sprintf("%s/?load=1", NguonPhimBaseURL)
		} else {
			listURL = fmt.Sprintf("%s/danh-sach-phim?page=%d&load=1", NguonPhimBaseURL, page)
		}
	case "phim-le", "phim-bo", "hoat-hinh", "tv-shows", "phim-sap-chieu", "phim-dang-chieu", "phim-long-tieng", "phim-vietsub":
		listURL = fmt.Sprintf("%s/danh-sach/%s?page=%d&load=1", NguonPhimBaseURL, category, page)
	case "han-quoc", "trung-quoc", "nhat-ban", "thai-lan", "au-my", "dai-loan", "hong-kong", "an-do",
		"anh", "phap", "canada", "quoc-gia-khac", "duc", "tay-ban-nha", "tho-nhi-ky", "ha-lan",
		"indonesia", "nga", "mexico", "ba-lan", "uc", "thuy-dien", "malaysia", "brazil",
		"philippines", "bo-dao-nha", "y", "dan-mach", "uae", "na-uy", "thuy-si", "chau-phi",
		"nam-phi", "ukraina", "a-rap-xe-ut", "bi", "ireland", "colombia", "phan-lan", "viet-nam",
		"chile", "hy-lap", "nigeria", "argentina", "singapore":
		listURL = fmt.Sprintf("%s/quoc-gia/%s?page=%d&load=1", NguonPhimBaseURL, category, page)
	default:
		listURL = fmt.Sprintf("%s/the-loai/%s?page=%d&load=1", NguonPhimBaseURL, category, page)
	}

	resp, err := s.fetchJSON(listURL)
	if err != nil {
		return nil, err
	}

	html := s.extractHTMLFromResponse(resp)
	if html == "" {
		return nil, fmt.Errorf("no content in response")
	}

	return s.parseListingHTML(html), nil
}

func (s *NguonPhimScraper) GetMoviesByCountry(country string, page int) ([]models.RophimMovie, error) {
	return s.GetMoviesByCategory(country, page)
}

func (s *NguonPhimScraper) Search(query string, page int) ([]models.RophimMovie, error) {
	encodedQuery := url.QueryEscape(query)
	listURL := fmt.Sprintf("%s/tim-kiem?keyword=%s&page=%d&load=1", NguonPhimBaseURL, encodedQuery, page)

	resp, err := s.fetchJSON(listURL)
	if err != nil {
		return nil, err
	}

	html := s.extractHTMLFromResponse(resp)
	if html == "" {
		return nil, fmt.Errorf("no content in response")
	}

	return s.parseListingHTML(html), nil
}

func parseNguonPhimImageUrl(raw string) string {
	if raw == "" {
		return ""
	}
	raw = strings.TrimSpace(raw)
	if strings.HasPrefix(raw, NguonPhimBaseURL) {
		raw = strings.TrimPrefix(raw, NguonPhimBaseURL)
	}

	if strings.Contains(raw, "{") && strings.Contains(raw, "}") {
		start := strings.Index(raw, "{")
		end := strings.LastIndex(raw, "}")
		if start != -1 && end != -1 && end > start {
			jsonStr := raw[start : end+1]
			var imgMap map[string]string
			if err := json.Unmarshal([]byte(jsonStr), &imgMap); err == nil {
				if path, ok := imgMap["original"]; ok && path != "" {
					raw = path
				} else if path, ok := imgMap["poster"]; ok && path != "" {
					raw = path
				} else if path, ok := imgMap["resize"]; ok && path != "" {
					raw = path
				}
			}
		}
	}

	if raw == "" {
		return ""
	}

	if !strings.HasPrefix(raw, "http://") && !strings.HasPrefix(raw, "https://") {
		if !strings.HasPrefix(raw, "/") {
			raw = "/" + raw
		}
		raw = NguonPhimBaseURL + raw
	}
	return raw
}

func (s *NguonPhimScraper) GetMovieDetail(slug string) (*models.RophimMovie, error) {
	url := fmt.Sprintf("%s/phim/%s", NguonPhimBaseURL, slug)
	doc, err := s.fetchDocument(url)
	if err != nil {
		return nil, err
	}

	movie := &models.RophimMovie{
		ID:       slug,
		Slug:     slug,
		Provider: "NguonPhim",
		Category: "movies",
		Quality:  "HD",
		Lang:     "Vietsub",
	}

	title := strings.TrimSpace(doc.Find("h1").First().Text())
	if title != "" {
		movie.Title = title
	}

	origTitle := ""
	doc.Find("span").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if origTitle == "" && strings.Contains(text, "Tên khác") {
			origTitle = strings.TrimPrefix(text, "Tên khác:")
			origTitle = strings.TrimSpace(origTitle)
		}
	})
	movie.OriginalTitle = origTitle

	thumb, _ := doc.Find("meta[property='og:image']").Attr("content")
	movie.Thumbnail = parseNguonPhimImageUrl(thumb)

	epDataStr := ""
	doc.Find("script#nc-episode-data").Each(func(i int, s *goquery.Selection) {
		epDataStr = s.Text()
	})

	if epDataStr != "" {
		var servers []struct {
			Name string `json:"name"`
			List []struct {
				Name  string `json:"name"`
				Slug  string `json:"slug"`
				Embed string `json:"embed"`
			} `json:"list"`
		}
		if err := json.Unmarshal([]byte(epDataStr), &servers); err == nil {
			for _, server := range servers {
				for _, ep := range server.List {
					epNum, _ := strconv.Atoi(ep.Name)
					if epNum <= 0 {
						epNum = 1
					}
					movie.Episodes = append(movie.Episodes, models.Episode{
						Number:     epNum,
						Title:      fmt.Sprintf("Tập %s", ep.Name),
						URL:        ep.Embed,
						ServerName: server.Name,
					})
				}
			}
		}
	}

	desc, _ := doc.Find("meta[name='description']").Attr("content")
	movie.Description = desc

	yearStr, _ := doc.Find("meta[property='article:published_time']").Attr("content")
	if yearStr != "" && len(yearStr) >= 4 {
		if y, err := strconv.Atoi(yearStr[:4]); err == nil {
			movie.Year = y
		}
	}

	return movie, nil
}

func extractSlugFromPath(path string) string {
	parts := strings.Split(path, "/phim/")
	if len(parts) >= 2 {
		slug := parts[len(parts)-1]
		slug = strings.TrimSuffix(slug, "/")
		slug = strings.Split(slug, "?")[0]
		return slug
	}
	return ""
}
