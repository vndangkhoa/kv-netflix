package api

import (
	"os"
	"testing"
)

var testClient *Client

func setup() {
	testClient = New("http://localhost:8000", false)
}

func TestMain(m *testing.M) {
	setup()
	code := m.Run()
	os.Exit(code)
}

func TestHealth(t *testing.T) {
	_, err := testClient.Home("", 1)
	if err != nil {
		t.Fatalf("Home endpoint failed: %v", err)
	}
}

func TestSearch(t *testing.T) {
	movies, err := testClient.Search("dune", 1)
	if err != nil {
		t.Fatalf("Search endpoint failed: %v", err)
	}
	t.Logf("Search results: %d movies", len(movies))
	if len(movies) > 0 {
		t.Logf("First result: %s (%d)", movies[0].Title, movies[0].Year)
	}
}

func TestDetail(t *testing.T) {
	// First search to find a movie slug
	movies, err := testClient.Search("dune", 1)
	if err != nil || len(movies) == 0 {
		t.Skip("No movies found to test detail")
	}
	movie, err := testClient.Detail(movies[0].Slug)
	if err != nil {
		t.Fatalf("Detail endpoint failed: %v", err)
	}
	t.Logf("Movie: %s (episodes: %d)", movie.Title, len(movie.Episodes))
}
