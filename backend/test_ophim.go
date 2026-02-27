package main

import (
	"encoding/json"
	"fmt"
	"log"
	"streamflow-backend/internal/scraper"
)

func main() {
	p := scraper.NewOphimScraper()
	movie, err := p.GetMovieDetail("vu-tru-cua-doi-ta") // Ophim slugs don't have suffix
	if err != nil {
		log.Fatal(err)
	}

	b, _ := json.MarshalIndent(movie.Episodes, "", "  ")
	fmt.Println(string(b))
}
