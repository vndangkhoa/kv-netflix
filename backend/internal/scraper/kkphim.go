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

const KKPhimBaseURL = "https://phimapi.com"

type KKPhimScraper struct {
	client *http.Client
}

func NewKKPhimScraper() *KKPhimScraper {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	return &KKPhimScraper{
		client: &http.Client{
			Transport: tr,
			Timeout:   30 * time.Second,
		},
	}
}

type kkPhimResponse struct {
	Status     bool                  `json:"status"`
	Msg        string                `json:"msg"`
	Data       kkPhimData            `json:"data"`
	Items      []kkPhimItem          `json:"items"`
	Movie      kkPhimMovie           `json:"movie"`
	Episodes   []kkPhimEpisodeServer `json:"episodes"`
	Pagination struct {
		TotalItems        int `json:"totalItems"`
		TotalItemsPerPage int `json:"totalItemsPerPage"`
		CurrentPage       int `json:"currentPage"`
		TotalPages        int `json:"totalPages"`
	} `json:"pagination"`
}

type kkPhimData struct {
	Items    []kkPhimItem          `json:"items"`
	Item     kkPhimMovie           `json:"item"`
	Episodes []kkPhimEpisodeServer `json:"episodes"`
}

type kkPhimItem struct {
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

type kkPhimMovie struct {
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
	Episodes   []kkPhimEpisodeServer `json:"episodes"`
	TrailerURL string                `json:"trailer_url"`
}

type kkPhimEpisodeServer struct {
	ServerName string              `json:"server_name"`
	ServerData []kkPhimEpisodeData `json:"server_data"`
}

type kkPhimEpisodeData struct {
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	Filename  string `json:"filename"`
	LinkEmbed string `json:"link_embed"`
	LinkM3U8  string `json:"link_m3u8"`
}

func (s *KKPhimScraper) GetMoviesByCategory(category string, page int) ([]models.RophimMovie, error) {
	var path string
	switch category {
	case "home", "":
		path = "danh-sach/phim-moi-cap-nhat"
	case "phim-le", "phim-bo", "hoat-hinh", "tv-shows", "phim-sap-chieu", "phim-dang-chieu", "phim-vietsub":
		path = fmt.Sprintf("v1/api/danh-sach/%s", category)
	default:
		path = fmt.Sprintf("v1/api/the-loai/%s", category)
	}

	apiURL := fmt.Sprintf("%s/%s?page=%d", KKPhimBaseURL, path, page)
	return s.fetchAndParseList(apiURL)
}

func (s *KKPhimScraper) Search(query string, page int) ([]models.RophimMovie, error) {
	encoded := url.QueryEscape(query)
	apiURL := fmt.Sprintf("%s/v1/api/tim-kiem?keyword=%s&page=%d", KKPhimBaseURL, encoded, page)
	return s.fetchAndParseList(apiURL)
}

func (s *KKPhimScraper) GetMoviesByCountry(country string, page int) ([]models.RophimMovie, error) {
	return s.GetMoviesByCategory(country, page)
}

func (s *KKPhimScraper) GetGenres() ([]models.Category, error) {
	apiURL := fmt.Sprintf("%s/v1/api/the-loai", KKPhimBaseURL)
	return s.fetchCategories(apiURL)
}

func (s *KKPhimScraper) GetCountries() ([]models.Category, error) {
	apiURL := fmt.Sprintf("%s/v1/api/quoc-gia", KKPhimBaseURL)
	return s.fetchCategories(apiURL)
}

func (s *KKPhimScraper) fetchCategories(apiURL string) ([]models.Category, error) {
	resp, err := s.client.Get(apiURL)
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

func (s *KKPhimScraper) fetchAndParseList(apiURL string) ([]models.RophimMovie, error) {
	resp, err := s.client.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}

	var result kkPhimResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var items []kkPhimItem
	if len(result.Data.Items) > 0 {
		items = result.Data.Items
	} else if len(result.Items) > 0 {
		items = result.Items
	}

	var movies []models.RophimMovie
	for _, item := range items {
		thumb := cleanKKPhimImageURL(item.ThumbURL)
		backdrop := cleanKKPhimImageURL(item.PosterURL)
		movies = append(movies, models.RophimMovie{
			ID:            item.Slug,
			Title:         item.Name,
			OriginalTitle: item.OriginName,
			Slug:          item.Slug,
			Thumbnail:     thumb,
			Backdrop:      backdrop,
			Year:          item.Year,
			Category:      "movies",
			Provider:      "KKPhim",
			Time:          item.Time,
			Quality:       item.Quality,
			Lang:          item.Lang,
		})
	}
	return movies, nil
}

func (s *KKPhimScraper) GetMovieDetail(slug string) (*models.RophimMovie, error) {
	apiURL := fmt.Sprintf("%s/phim/%s", KKPhimBaseURL, slug)
	resp, err := s.client.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}

	var result kkPhimResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	movie := result.Movie
	if movie.Slug == "" {
		movie = result.Data.Item
	}

	thumb := cleanKKPhimImageURL(movie.ThumbURL)
	backdrop := cleanKKPhimImageURL(movie.PosterURL)

	var rawEpisodes []kkPhimEpisodeServer
	if len(result.Episodes) > 0 {
		rawEpisodes = result.Episodes
	} else if len(result.Data.Episodes) > 0 {
		rawEpisodes = result.Data.Episodes
	} else if len(movie.Episodes) > 0 {
		rawEpisodes = movie.Episodes
	}

	var episodes []models.Episode
	digitsRegex := regexp.MustCompile(`\d+`)
	epMap := make(map[string]int)

	for _, server := range rawEpisodes {
		serverLabel := server.ServerName
		if serverLabel == "" {
			serverLabel = "Vietsub"
		}
		for _, ep := range server.ServerData {
			epNum := 0
			if match := digitsRegex.FindString(ep.Name); match != "" {
				epNum, _ = strconv.Atoi(match)
			}
			if epNum <= 0 {
				epNum = 1
			}

			streamURL := ep.LinkM3U8
			if streamURL == "" {
				streamURL = ep.LinkEmbed
			}
			if streamURL == "" {
				continue
			}

			serverKey := fmt.Sprintf("%d-KKPhim-%s", epNum, serverLabel)
			if idx, exists := epMap[serverKey]; exists {
				if episodes[idx].URL == "" && streamURL != "" {
					episodes[idx].URL = streamURL
				}
			} else {
				epMap[serverKey] = len(episodes)
				episodes = append(episodes, models.Episode{
					Number:     epNum,
					Title:      ep.Name,
					URL:        streamURL,
					ServerName: "KKPhim - " + serverLabel,
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
		Category:      "movies",
		Provider:      "KKPhim",
		Episodes:      episodes,
		TrailerURL:    movie.TrailerURL,
	}, nil
}

func cleanKKPhimImageURL(raw string) string {
	if raw == "" {
		return ""
	}
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return raw
	}
	if strings.HasPrefix(raw, "//") {
		return "https:" + raw
	}
	return "https://phimimg.com/" + strings.TrimPrefix(raw, "/")
}
