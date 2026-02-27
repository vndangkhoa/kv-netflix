package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
)

func main() {
	resp, err := http.Get("http://localhost:8000/api/videos/vu-tru-cua-doi-ta-pm17193")
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	fmt.Printf("Size in bytes: %d\n", len(b))
}
