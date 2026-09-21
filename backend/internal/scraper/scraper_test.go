package scraper

import (
	"testing"
)


func TestVSMOVScraper_Live(t *testing.T) {
	s := NewVSMOVScraper()

	// 1. Test GetMoviesByCategory
	movies, err := s.GetMoviesByCategory("home", 1)
	if err != nil {
		t.Fatalf("VSMOV GetMoviesByCategory failed: %v", err)
	}
	if len(movies) == 0 {
		t.Errorf("VSMOV GetMoviesByCategory returned 0 movies")
	}

	first := movies[0]
	if first.Slug == "" || first.Title == "" {
		t.Errorf("VSMOV movie missing slug or title: %+v", first)
	}

	// 2. Test Search
	searchRes, err := s.Search("batman", 1)
	if err != nil {
		t.Fatalf("VSMOV Search failed: %v", err)
	}
	if len(searchRes) == 0 {
		t.Errorf("VSMOV Search returned 0 results for 'batman'")
	}

	// 3. Test GetMovieDetail
	detail, err := s.GetMovieDetail(searchRes[0].Slug)
	if err != nil {
		t.Fatalf("VSMOV GetMovieDetail(%s) failed: %v", searchRes[0].Slug, err)
	}
	if len(detail.Episodes) > 0 {
		if detail.Episodes[0].URL == "" {
			t.Errorf("Episode 0 has empty URL")
		}
	}

	// 4. Test Categories
	genres, err := s.GetGenres()
	if err != nil {
		t.Fatalf("VSMOV GetGenres failed: %v", err)
	}
	if len(genres) == 0 {
		t.Errorf("VSMOV GetGenres returned 0 genres")
	}

	// 5. Test Subtitle Extraction
	foundSub := false
	for _, ep := range detail.Episodes {
		if ep.EmbedURL != "" {
			subs, err := s.ExtractSubtitlesFromEmbed(ep.EmbedURL)
			if err == nil && len(subs) > 0 {
				foundSub = true
				t.Logf("Found %d subtitles for ep %s: %+v", len(subs), ep.Title, subs)
				break
			}
		}
	}
	t.Logf("Subtitle extraction check completed (foundSub=%v)", foundSub)
}
