package main

import (
	"encoding/json"
	"fmt"
	"log"
	"streamflow-backend/internal/scraper"
)

func main() {
	p := scraper.NewPhimMoiChillScraper()
	movie, err := p.GetMovieDetail("vu-tru-cua-doi-ta-pm17193")
	if err != nil {
		log.Fatal(err)
	}

	b, _ := json.MarshalIndent(movie, "", "  ")
	fmt.Println(string(b))
}
