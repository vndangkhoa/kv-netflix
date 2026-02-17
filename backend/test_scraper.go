package main

import (
	"fmt"
	"log"
	"streamflow-backend/internal/scraper"
)

func main() {
	s := scraper.NewPhimMoiChillScraper()
	movies, err := s.GetMoviesByCategory("home", 1)
	if err != nil {
		log.Fatalf("Error: %v", err)
	}

	fmt.Printf("Found %d movies\n", len(movies))
	for i, m := range movies {
		if i >= 5 {
			break
		}
		fmt.Printf("- %s (ID: %s)\n", m.Title, m.ID)
	}
}
