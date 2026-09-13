package scraper

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"streamflow-backend/internal/models"
)

var defaultOphimMirrors = []string{
	"https://ophim17.cc",
	"https://ophim.live",
	"https://ophim.cc",
	"https://ophim6.cc",
	"https://ophim1.com",
}

type OphimScraper struct {
	client    *http.Client
	mirrors   []string
	activeIdx int
}

func NewOphimScraper() *OphimScraper {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	return &OphimScraper{
		client: &http.Client{
			Transport: tr,
			Timeout:   8 * time.Second,
		},
		mirrors:   defaultOphimMirrors,
		activeIdx: 0,
	}
}

func (s *OphimScraper) fetchFromMirrors(path string) (*http.Response, error) {
	var lastErr error
	n := len(s.mirrors)
	start := s.activeIdx
	for i := 0; i < n; i++ {
		idx := (start + i) % n
		baseURL := s.mirrors[idx]
		targetURL := fmt.Sprintf("%s/%s", baseURL, strings.TrimPrefix(path, "/"))

		req, err := http.NewRequest("GET", targetURL, nil)
		if err != nil {
			lastErr = err
			continue
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		req.Header.Set("Accept", "application/json, text/plain, */*")
		req.Header.Set("Referer", baseURL+"/")

		resp, err := s.client.Do(req)
		if err == nil && resp.StatusCode == http.StatusOK {
			s.activeIdx = idx
			return resp, nil
		}
		if resp != nil {
			resp.Body.Close()
			lastErr = fmt.Errorf("status %d from %s", resp.StatusCode, baseURL)
		} else {
			lastErr = err
		}
	}
	return nil, fmt.Errorf("all ophim mirrors failed: %v", lastErr)
}

// Response structs for Ophim API

type OphimResponse struct {
	Status   json.RawMessage `json:"status,omitempty"`
	Message  string          `json:"message,omitempty"`
	Data     ophimData       `json:"data"`
	Items    []OphimItem     `json:"items"` // For homepage-style responses
	Movie      OphimMovie           `json:"movie"`
	Episodes   []OphimEpisodeServer `json:"episodes"`
	Pagination struct {
		TotalItems        int `json:"totalItems"`
		TotalItemsPerPage int `json:"totalItemsPerPage"`
		CurrentPage       int `json:"currentPage"`
		TotalPages        int `json:"totalPages"`
	} `json:"pagination"`
}

type ophimData struct {
	SEOOnPage   map[string]interface{} `json:"seoOnPage,omitempty"`
	BreadCrumb  []struct{ Name string `json:"name"`; Slug string `json:"slug"` } `json:"breadCrumb,omitempty"`
	TitlePage   string                `json:"titlePage,omitempty"`
	Items       []OphimItem           `json:"items"`
	Item        OphimMovie            `json:"item"`
	Episodes    []OphimEpisodeServer  `json:"episodes,omitempty"`
}

type OphimItem struct {
	Name       string `json:"name"`
	OriginName string `json:"origin_name"`
	Slug       string `json:"slug"`
	ThumbURL   string `json:"thumb_url"`
	PosterURL  string `json:"poster_url"`
	Year       int    `json:"year"`
	Time       string `json:"time"`
	Quality    string `json:"quality"`
	Lang       string `json:"lang"`
}

type OphimMovie struct {
	ID         string   `json:"_id"`
	Name       string   `json:"name"`
	OriginName string   `json:"origin_name"`
	Slug       string   `json:"slug"`
	Content    string   `json:"content"`
	ThumbURL   string   `json:"thumb_url"`
	PosterURL  string   `json:"poster_url"`
	Year       int      `json:"year"`
	Time       string   `json:"time"`
	Quality    string   `json:"quality"`
	Lang       string   `json:"lang"`
	Director   []string `json:"director"`
	Category   []struct {
		Name string `json:"name"`
	} `json:"category"`
	Country []struct {
		Name string `json:"name"`
	} `json:"country"`
	Episodes   []OphimEpisodeServer `json:"episodes,omitempty"` // Nested episodes?
	TrailerURL string               `json:"trailer_url"`
}

type OphimEpisodeServer struct {
	ServerName string             `json:"server_name"`
	ServerData []OphimEpisodeData `json:"server_data"`
}

type OphimEpisodeData struct {
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	Filename  string `json:"filename"`
	LinkEmbed string `json:"link_embed"`
	LinkM3U8  string `json:"link_m3u8"`
}

func (s *OphimScraper) GetMoviesByCategory(category string, page int) ([]models.RophimMovie, error) {
	// Logic to distinguish between "Lists" (danh-sach), "Genres" (the-loai), and "Countries" (quoc-gia)
	// Known lists: phim-le, phim-bo, hoat-hinh, tv-shows, phim-sap-chieu, phim-dang-chieu
	var path string
	switch category {
	case "home", "":
		path = "danh-sach/phim-moi-cap-nhat"
	case "phim-le", "phim-bo", "hoat-hinh", "tv-shows", "phim-sap-chieu", "phim-dang-chieu", "phim-long-tieng", "phim-vietsub":
		path = fmt.Sprintf("danh-sach/%s", category)
	case "han-quoc", "trung-quoc", "nhat-ban", "thai-lan", "au-my", "dai-loan", "hong-kong", "an-do",
	     "anh", "phap", "canada", "quoc-gia-khac", "duc", "tay-ban-nha", "tho-nhi-ky", "ha-lan",
	     "indonesia", "nga", "mexico", "ba-lan", "uc", "thuy-dien", "malaysia", "brazil",
	     "philippines", "bo-dao-nha", "y", "dan-mach", "uae", "na-uy", "thuy-si", "chau-phi",
	     "nam-phi", "ukraina", "a-rap-xe-ut", "bi", "ireland", "colombia", "phan-lan", "viet-nam",
	     "chile", "hy-lap", "nigeria", "argentina", "singapore":
		// Country endpoint uses /quoc-gia/{slug}
		path = fmt.Sprintf("quoc-gia/%s", category)
	default:
		// Assume everything else is a Genre (e.g., hanh-dong, tinh-cam, co-trang)
		// Ophim uses "the-loai" for these.
		path = fmt.Sprintf("the-loai/%s", category)
	}

	finalPath := fmt.Sprintf("v1/api/%s", path)
	return s.getList(finalPath, page)
}

func (s *OphimScraper) GetMoviesByCountry(country string, page int) ([]models.RophimMovie, error) {
	// Country endpoint uses /quoc-gia/{slug}
	path := fmt.Sprintf("v1/api/quoc-gia/%s", country)
	return s.getList(path, page)
}

func (s *OphimScraper) GetHomepageMovies(page int) ([]models.RophimMovie, error) {
	return s.GetMoviesByCategory("home", page)
}

func (s *OphimScraper) Search(query string, page int) ([]models.RophimMovie, error) {
	encodedQuery := url.QueryEscape(query)
	path := fmt.Sprintf("v1/api/tim-kiem?keyword=%s&page=%d", encodedQuery, page)
	return s.fetchAndParseList(path)
}

func (s *OphimScraper) GetGenres() ([]models.Category, error) {
	return s.fetchCategories("v1/api/the-loai")
}

func (s *OphimScraper) GetCountries() ([]models.Category, error) {
	return s.fetchCategories("v1/api/quoc-gia")
}

func (s *OphimScraper) fetchCategories(path string) ([]models.Category, error) {
	resp, err := s.fetchFromMirrors(path)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Data struct {
			Items []struct {
				Name string `json:"name"`
				Slug string `json:"slug"`
			} `json:"items"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var categories []models.Category
	for _, item := range result.Data.Items {
		categories = append(categories, models.Category{
			Name: item.Name,
			Slug: item.Slug,
		})
	}
	return categories, nil
}

func (s *OphimScraper) getList(path string, page int) ([]models.RophimMovie, error) {
	subPath := fmt.Sprintf("%s?page=%d", strings.TrimPrefix(path, "/"), page)
	return s.fetchAndParseList(subPath)
}

func (s *OphimScraper) fetchAndParseList(path string) ([]models.RophimMovie, error) {
	resp, err := s.fetchFromMirrors(path)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("status code error: %d %s", resp.StatusCode, resp.Status)
	}

	var result OphimResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var movies []models.RophimMovie
	
	// Country endpoint returns items in data.items, not top-level
	// Homepage returns items at top level (but also has data.items)
	var items []OphimItem
	if len(result.Data.Items) > 0 {
		items = result.Data.Items
	} else if len(result.Items) > 0 {
		items = result.Items
	}

	for _, item := range items {
		// In Ophim API, PosterURL (-poster.jpg) is the 2:3 portrait poster (for card grids)
		// and ThumbURL (-thumb.jpg) is the 16:9 widescreen landscape backdrop (for hero/banners).
		cardPoster := cleanOphimImageURL(item.PosterURL)
		backdrop := cleanOphimImageURL(item.ThumbURL)
		if cardPoster == "" {
			cardPoster = backdrop
		}
		if backdrop == "" {
			backdrop = cardPoster
		}

		movies = append(movies, models.RophimMovie{
			ID:            item.Slug,
			Title:         item.Name,
			OriginalTitle: item.OriginName,
			Slug:          item.Slug,
			Thumbnail:     cardPoster,
			Backdrop:      backdrop,
			Year:          item.Year,
			Category:      "movies",
			Provider:      "OPhim",
			Time:          item.Time,
			Quality:       item.Quality,
			Lang:          item.Lang,
		})
	}

	return movies, nil
}

func (s *OphimScraper) GetMovieDetail(slug string) (*models.RophimMovie, error) {
	path := fmt.Sprintf("v1/api/phim/%s", slug)
	resp, err := s.fetchFromMirrors(path)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("status code error: %d %s", resp.StatusCode, resp.Status)
	}

	var result OphimResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	// Try to get movie from Top Level or Data.Item
	movie := result.Movie
	if movie.Slug == "" {
		movie = result.Data.Item
	}

	// In Ophim API, PosterURL (-poster.jpg) is the 2:3 portrait poster (for card grids)
	// and ThumbURL (-thumb.jpg) is the 16:9 widescreen landscape backdrop (for hero/banners).
	cardPoster := cleanOphimImageURL(movie.PosterURL)
	backdrop := cleanOphimImageURL(movie.ThumbURL)
	if cardPoster == "" {
		cardPoster = backdrop
	}
	if backdrop == "" {
		backdrop = cardPoster
	}

	var episodes []models.Episode
	// Try Top Level Episodes, then Data.Episodes, then Movie.Episodes?
	rawEpisodes := result.Episodes
	if len(rawEpisodes) == 0 {
		// New API might put episodes inside "item.episodes" or "data.episodes"
		// Based on typical Ophim structures:
		if len(result.Data.Episodes) > 0 {
			rawEpisodes = result.Data.Episodes
		} else if len(movie.Episodes) > 0 {
			rawEpisodes = movie.Episodes
		}
	}

	epMap := make(map[string]int) // map[epNum-serverName]sliceIndex
	digitsRegex := regexp.MustCompile(`\d+`)
	for _, server := range rawEpisodes {
		for _, ep := range server.ServerData {
			epNum := 0
			if match := digitsRegex.FindString(ep.Name); match != "" {
				epNum, _ = strconv.Atoi(match)
			}
			if epNum <= 0 {
				if strings.EqualFold(ep.Name, "Full") || strings.EqualFold(ep.Name, "Trailer") || ep.Name != "" {
					epNum = 1
				} else {
					continue
				}
			}

			streamURL := ep.LinkM3U8
			if streamURL == "" {
				streamURL = ep.LinkEmbed
			}
			if streamURL == "" {
				continue
			}

			serverKey := fmt.Sprintf("%d-%s", epNum, server.ServerName)
			if idx, exists := epMap[serverKey]; exists {
				if episodes[idx].URL == "" && streamURL != "" {
					episodes[idx].URL = streamURL
					episodes[idx].Title = ep.Name
				}
			} else {
				epMap[serverKey] = len(episodes)
				episodes = append(episodes, models.Episode{
					Number:     epNum,
					Title:      ep.Name,
					URL:        streamURL,
					ServerName: server.ServerName,
				})
			}
		}
	}

	return &models.RophimMovie{
		ID:            movie.Slug,
		Title:         movie.Name,
		OriginalTitle: movie.OriginName,
		Slug:          movie.Slug,
		Thumbnail:     cardPoster,
		Backdrop:      backdrop,
		Description:   movie.Content,
		Year:          movie.Year,
		Quality:       movie.Quality,
		Duration:      0, // String parse needed if we want "90 phut"
		Category:      "movies",
		Provider:      "OPhim",
		Episodes:      episodes,
		Country:       safeGetName(movie.Country),
		Director:      strings.Join(movie.Director, ", "),
		Genre:         safeGetName(movie.Category),
		TrailerURL:    movie.TrailerURL,
	}, nil
}

func safeGetName(items []struct {
	Name string `json:"name"`
}) string {
	var names []string
	for _, i := range items {
		names = append(names, i.Name)
	}
	return strings.Join(names, ", ")
}

func cleanOphimImageURL(raw string) string {
	if raw == "" {
		return ""
	}
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return raw
	}
	if strings.HasPrefix(raw, "//") {
		return "https:" + raw
	}
	trimmed := strings.TrimPrefix(raw, "/")
	if idx := strings.Index(trimmed, "/"); idx != -1 {
		hostPart := trimmed[:idx]
		if strings.Contains(hostPart, ".") && !strings.HasPrefix(hostPart, "upload") {
			return "https://" + trimmed
		}
	}
	trimmed = strings.TrimPrefix(trimmed, "uploads/movies/")
	return "https://img.ophim.live/uploads/movies/" + trimmed
}
