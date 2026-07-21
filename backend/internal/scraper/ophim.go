package scraper

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"streamflow-backend/internal/models"
)

const OphimBaseURL = "https://ophim1.com"

type OphimScraper struct {
	client *http.Client
}

func NewOphimScraper() *OphimScraper {
	return &OphimScraper{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Response structs for Ophim API

type OphimResponse struct {
	Status   string    `json:"status,omitempty"`
	Message  string    `json:"message,omitempty"`
	Data     ophimData `json:"data"`
	Items    []OphimItem `json:"items"` // For homepage-style responses
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
	case "phim-le", "phim-bo", "hoat-hinh", "tv-shows", "phim-sap-chieu", "phim-dang-chieu":
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
	url := fmt.Sprintf("%s/v1/api/tim-kiem?keyword=%s&page=%d", OphimBaseURL, encodedQuery, page)
	return s.fetchAndParseList(url)
}

func (s *OphimScraper) GetGenres() ([]models.Category, error) {
	return s.fetchCategories("v1/api/the-loai")
}

func (s *OphimScraper) GetCountries() ([]models.Category, error) {
	return s.fetchCategories("v1/api/quoc-gia")
}

func (s *OphimScraper) fetchCategories(path string) ([]models.Category, error) {
	url := fmt.Sprintf("%s/%s", OphimBaseURL, path)
	resp, err := s.client.Get(url)
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
	url := fmt.Sprintf("%s/%s?page=%d", OphimBaseURL, path, page)
	return s.fetchAndParseList(url)
}

func (s *OphimScraper) fetchAndParseList(url string) ([]models.RophimMovie, error) {
	resp, err := s.client.Get(url)
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

	// API usually returns items in "items" (homepage/list) or "data" sometimes?
	// The struct OphimResponse has "items".
	// Search API structure verification:
	// My previous curl showed "data": { "items": [...] } structure for search?
	// Wait, checking the curled output from Step 256.
	// Output: `{"status":true,"msg":"","data":{"seoOnPage":...,"breadCrumb":...,"titlePage":...,"items":[...]`
	// So Search returns data -> items.
	// My OphimResponse struct has "Items []OphimItem" at top level.
	// I need to adjust struct to handle "data" wrapper if present, or "items" if direct.
	// The homepage returns "items" directly?
	// Let's check homepage struct. I previously assumed it was directly status, items.
	// If search has "data", generic parsing might need adjustment.

	// Let's look at the previous successful homepage request.
	// If it worked, then homepage returns "items" at top level.
	// If Search returns "data" -> "items", I need a wrapper struct.

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
		thumb := item.ThumbURL
		if !strings.HasPrefix(thumb, "http") {
			// Search API might return relative paths too
			thumb = "https://img.ophim.live/uploads/movies/" + thumb
		}

		backdrop := item.PosterURL
		if !strings.HasPrefix(backdrop, "http") {
			backdrop = "https://img.ophim.live/uploads/movies/" + backdrop
		}

		movies = append(movies, models.RophimMovie{
			ID:            item.Slug,
			Title:         item.Name,
			OriginalTitle: item.OriginName,
			Slug:          item.Slug,
			Thumbnail:     thumb,
			Backdrop:      backdrop,
			Year:          item.Year,
			Category:      "movies",
			Provider:      "Ophim",
			Time:          item.Time,
			Quality:       item.Quality,
			Lang:          item.Lang,
		})
	}

	return movies, nil
}

func (s *OphimScraper) GetMovieDetail(slug string) (*models.RophimMovie, error) {
	// Correct API endpoint is v1/api/phim/{slug}
	url := fmt.Sprintf("%s/v1/api/phim/%s", OphimBaseURL, slug)
	resp, err := s.client.Get(url)
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

	thumb := movie.ThumbURL
	if !strings.HasPrefix(thumb, "http") {
		thumb = "https://img.ophim.live/uploads/movies/" + thumb
	}

	backdrop := movie.PosterURL
	if !strings.HasPrefix(backdrop, "http") {
		backdrop = "https://img.ophim.live/uploads/movies/" + backdrop
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
	for _, server := range rawEpisodes {
		for _, ep := range server.ServerData {
			epNum := 0
			fmt.Sscanf(ep.Name, "%d", &epNum)
			if epNum == 0 {
				var n int
				if _, err := fmt.Sscanf(ep.Name, "Tap %d", &n); err == nil {
					epNum = n
				}
				if strings.EqualFold(ep.Name, "Full") || strings.EqualFold(ep.Name, "Trailer") {
					epNum = 1 // single-movie or trailer as ep 1
				}

				// If still 0, skip
				if epNum == 0 {
					continue
				}
			}

			serverKey := fmt.Sprintf("%d-%s", epNum, server.ServerName)
			if idx, exists := epMap[serverKey]; exists {
				// If existing is empty, replace with this one
				if episodes[idx].URL == "" && ep.LinkM3U8 != "" {
					episodes[idx].URL = ep.LinkM3U8
					episodes[idx].Title = ep.Name
				}
			} else {
				if ep.LinkM3U8 == "" && ep.LinkEmbed == "" {
					continue
				}

				epMap[serverKey] = len(episodes)
				episodes = append(episodes, models.Episode{
					Number:     epNum,
					Title:      ep.Name,
					URL:        ep.LinkM3U8,
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
		Thumbnail:     thumb,
		Backdrop:      backdrop,
		Description:   movie.Content,
		Year:          movie.Year,
		Quality:       movie.Quality,
		Duration:      0, // String parse needed if we want "90 phut"
		Category:      "movies",
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
