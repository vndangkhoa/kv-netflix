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

const VSMOVBaseURL = "https://vsmov.com/api"

type VSMOVScraper struct {
	client *http.Client
}

func NewVSMOVScraper() *VSMOVScraper {
	tr := &http.Transport{
		TLSClientConfig:     &tls.Config{InsecureSkipVerify: true},
		MaxIdleConns:        50,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     60 * time.Second,
	}
	return &VSMOVScraper{
		client: &http.Client{
			Transport: tr,
			Timeout:   30 * time.Second,
		},
	}
}

type vsmovListResponse struct {
	Status bool        `json:"status"`
	Items  []vsmovItem `json:"items"`
}

type vsmovItem struct {
	Name       string      `json:"name"`
	OriginName string      `json:"origin_name"`
	Slug       string      `json:"slug"`
	PosterURL  interface{} `json:"poster_url"`
	ThumbURL   interface{} `json:"thumb_url"`
	Year       int         `json:"year"`
	Time       string      `json:"time"`
	Quality    string      `json:"quality"`
	Lang       string      `json:"lang"`
	Type       string      `json:"type"`
	Category   interface{} `json:"category"`
}

type vsmovDetailResponse struct {
	Status   bool                 `json:"status"`
	Movie    vsmovMovie           `json:"movie"`
	Episodes []vsmovEpisodeServer `json:"episodes"`
}

type vsmovMovie struct {
	Name       string            `json:"name"`
	OriginName string            `json:"origin_name"`
	Slug       string            `json:"slug"`
	Content    string            `json:"content"`
	PosterURL  interface{}       `json:"poster_url"`
	ThumbURL   interface{}       `json:"thumb_url"`
	Year       int               `json:"year"`
	Time       string        `json:"time"`
	Quality    string        `json:"quality"`
	Lang       string        `json:"lang"`
	Type       string        `json:"type"`
	Director   interface{}   `json:"director"`
	Actor      interface{}   `json:"actor"`
	Category   []models.Category `json:"category"`
	Country    []models.Category `json:"country"`
	TrailerURL string        `json:"trailer_url"`
	TMDB       struct {
		Type   string          `json:"type"`
		ID     json.RawMessage `json:"id"`
		Season int             `json:"season"`
	} `json:"tmdb"`
	IMDb struct {
		ID string `json:"id"`
	} `json:"imdb"`
}

type vsmovEpisodeServer struct {
	ServerName string             `json:"server_name"`
	ServerData []vsmovEpisodeData `json:"server_data"`
}

type vsmovEpisodeData struct {
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	Filename  string `json:"filename"`
	LinkEmbed string `json:"link_embed"`
	LinkM3U8  string `json:"link_m3u8"`
}

func (s *VSMOVScraper) GetMoviesByCategory(category string, page int) ([]models.RophimMovie, error) {
	var path string
	switch category {
	case "home", "":
		path = "danh-sach/phim-moi-cap-nhat"
	case "phim-le":
		path = "danh-sach/phim-le"
	case "phim-bo":
		path = "danh-sach/phim-bo"
	case "phim-chieu-rap":
		path = "danh-sach/phim-chieu-rap"
	case "han-quoc", "trung-quoc", "nhat-ban", "thai-lan", "au-my", "dai-loan", "hong-kong", "an-do",
		"anh", "phap", "canada", "duc", "tay-ban-nha", "viet-nam":
		path = fmt.Sprintf("quoc-gia/%s", category)
	default:
		path = fmt.Sprintf("the-loai/%s", category)
	}

	apiURL := fmt.Sprintf("%s/%s?page=%d", VSMOVBaseURL, path, page)
	return s.fetchAndParseList(apiURL)
}

func (s *VSMOVScraper) GetMoviesByCountry(country string, page int) ([]models.RophimMovie, error) {
	apiURL := fmt.Sprintf("%s/quoc-gia/%s?page=%d", VSMOVBaseURL, country, page)
	return s.fetchAndParseList(apiURL)
}

func (s *VSMOVScraper) Search(query string, page int) ([]models.RophimMovie, error) {
	encoded := url.QueryEscape(query)
	apiURL := fmt.Sprintf("%s/tim-kiem?keyword=%s&page=%d", VSMOVBaseURL, encoded, page)
	return s.fetchAndParseList(apiURL)
}

func (s *VSMOVScraper) GetGenres() ([]models.Category, error) {
	apiURL := fmt.Sprintf("%s/the-loai", VSMOVBaseURL)
	return s.fetchCategories(apiURL)
}

func (s *VSMOVScraper) GetCountries() ([]models.Category, error) {
	apiURL := fmt.Sprintf("%s/quoc-gia", VSMOVBaseURL)
	return s.fetchCategories(apiURL)
}

func (s *VSMOVScraper) fetchCategories(apiURL string) ([]models.Category, error) {
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	req.Header.Set("Referer", "https://vsmov.com/")

	resp, err := s.client.Do(req)
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

func (s *VSMOVScraper) fetchAndParseList(apiURL string) ([]models.RophimMovie, error) {
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	req.Header.Set("Referer", "https://vsmov.com/")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}

	var result vsmovListResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	var movies []models.RophimMovie
	for _, item := range result.Items {
		category := "movies"
		if item.Type == "series" {
			category = "series"
		}

		quality := item.Quality
		if quality == "" {
			quality = "4K UHD"
		}

		// In VSMOV API, thumb_url is the 2:3 vertical portrait poster (for card grids)
		// and poster_url is the 16:9 widescreen landscape backdrop (for hero/banners).
		cardPoster := parseVSMOVImage(item.ThumbURL)
		backdrop := parseVSMOVImage(item.PosterURL)
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
			Category:      category,
			Provider:      "VSMOV",
			Time:          item.Time,
			Quality:       quality,
			Lang:          item.Lang,
		})
	}

	return movies, nil
}

func parseVSMOVImage(raw interface{}) string {
	switch v := raw.(type) {
	case string:
		return strings.TrimSpace(v)
	case map[string]interface{}:
		if url, ok := v["url"].(string); ok {
			return strings.TrimSpace(url)
		}
	}
	return ""
}

var vsmovStreamRegex = regexp.MustCompile(`(https?://[^/]+)/video/([a-f0-9-]+)`)

func DeriveVSMOVM3U8(linkEmbed, linkM3U8 string) string {
	if linkM3U8 != "" && (strings.Contains(linkM3U8, ".m3u8") || strings.Contains(linkM3U8, ".mp4")) {
		return linkM3U8
	}
	if strings.Contains(linkEmbed, ".m3u8") || strings.Contains(linkEmbed, ".mp4") {
		return linkEmbed
	}
	if match := vsmovStreamRegex.FindStringSubmatch(linkEmbed); len(match) > 2 {
		return fmt.Sprintf("%s/stream/%s/master.m3u8", match[1], match[2])
	}
	return ""
}

func (s *VSMOVScraper) GetMovieDetail(slug string) (*models.RophimMovie, error) {
	apiURL := fmt.Sprintf("%s/phim/%s", VSMOVBaseURL, slug)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
	req.Header.Set("Referer", "https://vsmov.com/")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}

	var result vsmovDetailResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	movie := result.Movie
	if movie.Slug == "" {
		return nil, fmt.Errorf("movie not found")
	}

	digitsRegex := regexp.MustCompile(`\d+`)
	var episodes []models.Episode
	epMap := make(map[string]int)

	for _, server := range result.Episodes {
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

			streamURL := DeriveVSMOVM3U8(ep.LinkEmbed, ep.LinkM3U8)
			if streamURL == "" {
				continue
			}

			serverKey := fmt.Sprintf("%d-VSMOV-%s", epNum, serverLabel)
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
					ServerName: "VSMOV - " + serverLabel,
				})
			}
		}
	}

	category := "movies"
	if movie.Type == "series" {
		category = "series"
	}

	var genreNames []string
	for _, c := range movie.Category {
		genreNames = append(genreNames, c.Name)
	}

	var countryNames []string
	for _, c := range movie.Country {
		countryNames = append(countryNames, c.Name)
	}

	quality := movie.Quality
	if quality == "" {
		quality = "4K UHD"
	}

	var directorStr string
	switch d := movie.Director.(type) {
	case string:
		directorStr = d
	case []interface{}:
		var names []string
		for _, v := range d {
			if s, ok := v.(string); ok {
				names = append(names, s)
			}
		}
		directorStr = strings.Join(names, ", ")
	}

	var castList []string
	switch a := movie.Actor.(type) {
	case string:
		for _, s := range strings.Split(a, ",") {
			if tr := strings.TrimSpace(s); tr != "" {
				castList = append(castList, tr)
			}
		}
	case []interface{}:
		for _, v := range a {
			if s, ok := v.(string); ok {
				castList = append(castList, strings.TrimSpace(s))
			}
		}
	}

	// In VSMOV API, thumb_url is the 2:3 vertical portrait poster (for card grids)
	// and poster_url is the 16:9 widescreen landscape backdrop (for hero/banners).
	cardPoster := parseVSMOVImage(movie.ThumbURL)
	backdrop := parseVSMOVImage(movie.PosterURL)
	if cardPoster == "" {
		cardPoster = backdrop
	}
	if backdrop == "" {
		backdrop = cardPoster
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
		Quality:       quality,
		Category:      category,
		Provider:      "VSMOV",
		TMDBID:        parseRawID(movie.TMDB.ID),
		IMDbID:        movie.IMDb.ID,
		Episodes:      episodes,
		Time:          movie.Time,
		Lang:          movie.Lang,
		Director:      directorStr,
		Cast:          castList,
		Genre:         strings.Join(genreNames, ", "),
		Country:       strings.Join(countryNames, ", "),
		TrailerURL:    movie.TrailerURL,
	}, nil
}
