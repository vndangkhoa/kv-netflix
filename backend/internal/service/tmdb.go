package service

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"
)

const (
	TMDBBaseURL      = "https://api.themoviedb.org/3"
	TMDBImageBaseURL = "https://image.tmdb.org/t/p"
)

type TMDBService struct {
	client *http.Client
	apiKey string
}

func NewTMDBService() *TMDBService {
	return &TMDBService{
		client: &http.Client{Timeout: 10 * time.Second},
		apiKey: os.Getenv("TMDB_API_KEY"),
	}
}

type TMDBMovieResult struct {
	ID           int     `json:"id"`
	Title        string  `json:"title"`
	Overview     string  `json:"overview"`
	PosterPath   string  `json:"poster_path"`
	BackdropPath string  `json:"backdrop_path"`
	ReleaseDate  string  `json:"release_date"`
	VoteAverage  float64 `json:"vote_average"`
}

type TMDBSearchResponse struct {
	Results []TMDBMovieResult `json:"results"`
}

type TMDBMovieDetails struct {
	ID           int     `json:"id"`
	Title        string  `json:"title"`
	Overview     string  `json:"overview"`
	Runtime      int     `json:"runtime"`
	Budget       int64   `json:"budget"`
	Revenue      int64   `json:"revenue"`
	Tagline      string  `json:"tagline"`
	VoteAverage  float64 `json:"vote_average"`
	PosterPath   string  `json:"poster_path"`
	BackdropPath string  `json:"backdrop_path"`
	Credits      struct {
		Cast []struct {
			Name        string `json:"name"`
			Character   string `json:"character"`
			ProfilePath string `json:"profile_path"`
		} `json:"cast"`
		Crew []struct {
			Name string `json:"name"`
			Job  string `json:"job"`
		} `json:"crew"`
	} `json:"credits"`
}

func (s *TMDBService) SearchMovie(title string, year int) (*TMDBMovieResult, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY not set")
	}

	params := url.Values{}
	params.Add("api_key", s.apiKey)
	params.Add("query", title)
	params.Add("language", "en-US")
	if year > 0 {
		params.Add("year", fmt.Sprintf("%d", year))
	}

	resp, err := s.client.Get(fmt.Sprintf("%s/search/movie?%s", TMDBBaseURL, params.Encode()))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("TMDB API returned status: %d", resp.StatusCode)
	}

	var searchResp TMDBSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return nil, err
	}

	if len(searchResp.Results) > 0 {
		return &searchResp.Results[0], nil
	}
	return nil, nil
}

func (s *TMDBService) GetMovieDetails(tmdbID int) (*TMDBMovieDetails, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY not set")
	}

	params := url.Values{}
	params.Add("api_key", s.apiKey)
	params.Add("append_to_response", "credits")
	params.Add("language", "en-US")

	resp, err := s.client.Get(fmt.Sprintf("%s/movie/%d?%s", TMDBBaseURL, tmdbID, params.Encode()))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("TMDB API returned status: %d", resp.StatusCode)
	}

	var details TMDBMovieDetails
	if err := json.NewDecoder(resp.Body).Decode(&details); err != nil {
		return nil, err
	}

	return &details, nil
}

func (s *TMDBService) HasKey() bool {
	return s != nil && s.apiKey != ""
}

type TMDBCreditsResponse struct {
	Cast []struct {
		Name         string `json:"name"`
		OriginalName string `json:"original_name"`
		Character    string `json:"character"`
		ProfilePath  string `json:"profile_path"`
	} `json:"cast"`
}

func (s *TMDBService) GetCredits(tmdbID int, isTV bool) ([]TMDBCastItem, error) {
	if !s.HasKey() {
		return nil, fmt.Errorf("TMDB_API_KEY not set")
	}

	endpoint := "movie"
	if isTV {
		endpoint = "tv"
	}

	params := url.Values{}
	params.Add("api_key", s.apiKey)
	params.Add("language", "vi-VN,en-US")

	resp, err := s.client.Get(fmt.Sprintf("%s/%s/%d/credits?%s", TMDBBaseURL, endpoint, tmdbID, params.Encode()))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("TMDB credits returned status: %d", resp.StatusCode)
	}

	var data TMDBCreditsResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}

	var items []TMDBCastItem
	for _, c := range data.Cast {
		avatar := ""
		if c.ProfilePath != "" {
			avatar = fmt.Sprintf("%s/w185%s", TMDBImageBaseURL, c.ProfilePath)
		}
		items = append(items, TMDBCastItem{
			Name:         c.Name,
			OriginalName: c.OriginalName,
			Character:    c.Character,
			Avatar:       avatar,
		})
	}
	return items, nil
}

type TMDBCastItem struct {
	Name         string
	OriginalName string
	Character    string
	Avatar       string
}

func (s *TMDBService) SearchPersonAvatar(name string) (string, error) {
	if !s.HasKey() {
		return "", fmt.Errorf("TMDB_API_KEY not set")
	}

	params := url.Values{}
	params.Add("api_key", s.apiKey)
	params.Add("query", name)

	resp, err := s.client.Get(fmt.Sprintf("%s/search/person?%s", TMDBBaseURL, params.Encode()))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("TMDB search person returned status: %d", resp.StatusCode)
	}

	var data struct {
		Results []struct {
			ProfilePath string `json:"profile_path"`
		} `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", err
	}

	if len(data.Results) > 0 && data.Results[0].ProfilePath != "" {
		return fmt.Sprintf("%s/w185%s", TMDBImageBaseURL, data.Results[0].ProfilePath), nil
	}
	return "", nil
}

func (s *TMDBService) GetPosterURL(path string, size string) string {
	if path == "" {
		return ""
	}
	if size == "" {
		size = "w500"
	}
	return fmt.Sprintf("%s/%s%s", TMDBImageBaseURL, size, path)
}
