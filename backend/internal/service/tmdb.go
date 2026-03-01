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

func (s *TMDBService) GetPosterURL(path string, size string) string {
	if path == "" {
		return ""
	}
	if size == "" {
		size = "w500"
	}
	return fmt.Sprintf("%s/%s%s", TMDBImageBaseURL, size, path)
}
