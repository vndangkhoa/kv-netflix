package scraper

import (
	"fmt"
	"testing"
)

func TestPhimMoiChillScraper(t *testing.T) {
	scraper := NewPhimMoiChillScraper()

	// Test GetMoviesByCategory
	t.Run("GetMoviesByCategory", func(t *testing.T) {
		movies, err := scraper.GetMoviesByCategory("phim-le", 1)
		if err != nil {
			t.Fatalf("Error getting movies: %v", err)
		}
		if len(movies) == 0 {
			t.Fatal("No movies found")
		}
		fmt.Printf("GetMoviesByCategory found %d movies\n", len(movies))
		fmt.Printf("First movie: %+v\n", movies[0])
	})

	// Test Search
	t.Run("Search", func(t *testing.T) {
		movies, err := scraper.Search("batman", 1)
		if err != nil {
			t.Fatalf("Error searching: %v", err)
		}
		if len(movies) == 0 {
			t.Log("No movies found for search 'batman' (might be possible if site changed)")
		} else {
			fmt.Printf("Search found %d movies\n", len(movies))
			fmt.Printf("First search result: %+v\n", movies[0])
		}
	})

	// Test GetMovieDetail
	// Use a hardcoded known slug or pick from search
	t.Run("GetMovieDetail", func(t *testing.T) {
		// Try to search effectively first
		list, _ := scraper.GetMoviesByCategory("phim-le", 1)
		if len(list) > 0 {
			slug := list[0].Slug
			fmt.Printf("Testing detail for slug: %s\n", slug)
			movie, err := scraper.GetMovieDetail(slug)
			if err != nil {
				t.Fatalf("Error getting detail: %v", err)
			}
			if movie == nil {
				t.Fatal("Movie detail is nil")
			}
			fmt.Printf("Movie Detail: Title=%s, Episodes=%d\n", movie.Title, len(movie.Episodes))
			if len(movie.Episodes) > 0 {
				fmt.Printf("First Episode URL: %s\n", movie.Episodes[0].URL)
			}
		}
	})
}
