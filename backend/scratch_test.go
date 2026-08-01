package main

import (
	"fmt"
	"log"
	"streamflow-backend/internal/scraper"
)

func main() {
	s := scraper.NewOphimScraper()
	movie, err := s.GetMovieDetail("bat-song-tinh-duyen")
	if err != nil {
		log.Fatalf("Error: %v", err)
	}
	fmt.Printf("Title: %s, Slug: %s, Episodes: %d\n", movie.Title, movie.Slug, len(movie.Episodes))
	for _, ep := range movie.Episodes[:5] {
		fmt.Printf("  Ep %d: %s | Server: %s | URL: %s\n", ep.Number, ep.Title, ep.ServerName, ep.URL)
	}
}
