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
)

// VidLinkProvider provides global Hollywood, Netflix, Disney+, HBO, and international
// streaming servers mapped to TMDB / IMDb identifiers.
type VidLinkProvider struct {
	client *http.Client
}

func NewVidLinkProvider() *VidLinkProvider {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	return &VidLinkProvider{
		client: &http.Client{
			Transport: tr,
			Timeout:   10 * time.Second,
		},
	}
}

// GenerateGlobalEpisodes synthesizes global stream servers (VidLink, VidSrc, AutoEmbed)
// for any movie or TV series given its TMDB or IMDb identifier.
func GenerateGlobalEpisodes(tmdbID string, imdbID string, isSeries bool, season int, totalEpisodes int) []models.Episode {
	targetID := tmdbID
	if targetID == "" {
		targetID = imdbID
	}
	if targetID == "" {
		return nil
	}

	if season <= 0 {
		season = 1
	}
	if totalEpisodes <= 0 {
		totalEpisodes = 1
	}

	var episodes []models.Episode

	if !isSeries || totalEpisodes == 1 {
		// Single movie
		episodes = append(episodes, models.Episode{
			Number:     1,
			Title:      "Full",
			URL:        fmt.Sprintf("https://vidlink.pro/movie/%s?primaryColor=e50914&autoplay=false", targetID),
			ServerName: "Global - VidLink 1080p",
		})
	} else {
		// TV series
		for i := 1; i <= totalEpisodes; i++ {
			episodes = append(episodes, models.Episode{
				Number:     i,
				Title:      fmt.Sprintf("Tập %d", i),
				URL:        fmt.Sprintf("https://vidlink.pro/tv/%s/%d/%d?primaryColor=e50914&autoplay=false", targetID, season, i),
				ServerName: "Global - VidLink 1080p",
			})
		}
	}

	return episodes
}

func (p *VidLinkProvider) GetMoviesByCategory(category string, page int) ([]models.RophimMovie, error) {
	return nil, nil
}

func (p *VidLinkProvider) GetMoviesByCountry(country string, page int) ([]models.RophimMovie, error) {
	return nil, nil
}

func (p *VidLinkProvider) Search(query string, page int) ([]models.RophimMovie, error) {
	// If query is directly a TMDB ID (e.g. "tmdb-550" or "tt0137523")
	trimmed := strings.TrimSpace(query)
	if strings.HasPrefix(trimmed, "tmdb-") || strings.HasPrefix(trimmed, "tt") {
		movie, err := p.GetMovieDetail(trimmed)
		if err == nil && movie != nil {
			return []models.RophimMovie{*movie}, nil
		}
	}
	return nil, nil
}

func (p *VidLinkProvider) GetMovieDetail(slug string) (*models.RophimMovie, error) {
	if !strings.HasPrefix(slug, "tmdb-") && !strings.HasPrefix(slug, "tt") {
		return nil, fmt.Errorf("not a direct global slug")
	}

	rawID := strings.TrimPrefix(slug, "tmdb-")
	isSeries := false
	season := 1
	totalEpisodes := 1

	re := regexp.MustCompile(`^(\d+)-s(\d+)-e(\d+)$`)
	if match := re.FindStringSubmatch(rawID); len(match) == 4 {
		rawID = match[1]
		season, _ = strconv.Atoi(match[2])
		totalEpisodes, _ = strconv.Atoi(match[3])
		isSeries = true
	}

	episodes := GenerateGlobalEpisodes(rawID, "", isSeries, season, totalEpisodes)

	return &models.RophimMovie{
		ID:          slug,
		Title:       fmt.Sprintf("Global Stream (TMDB #%s)", rawID),
		Slug:        slug,
		Category:    "movies",
		Provider:    "Global",
		Episodes:    episodes,
		Quality:     "1080p FHD",
		Lang:        "Multi-Sub / Vietsub",
		Year:        time.Now().Year(),
		Description: "Nguồn phát quốc tế chất lượng cao 1080p (VidLink / VidSrc) hỗ trợ phụ đề đa ngôn ngữ.",
	}, nil
}
