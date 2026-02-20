package main

import (
	"encoding/json"
	"fmt"
	"log"
	"streamflow-backend/internal/scraper"
)

func main() {
	p := scraper.NewPhimMoiChillScraper()
	movies, err := p.Search("vũ trụ của đôi ta", 1)
	if err != nil {
		log.Fatal(err)
	}

	b, _ := json.MarshalIndent(movies, "", "  ")
	fmt.Println(string(b))
}
