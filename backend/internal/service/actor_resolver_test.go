package service

import (
	"testing"

	"streamflow-backend/internal/models"
)

func TestActorResolver(t *testing.T) {
	resolver := NewActorResolver(nil)

	// Test known seed actors
	avatar := resolver.ResolveActorAvatar("Ju Jingyi")
	if avatar == "" {
		t.Errorf("expected avatar for Ju Jingyi, got empty string")
	}

	avatar2 := resolver.ResolveActorAvatar("Chen Duling")
	if avatar2 == "" {
		t.Errorf("expected avatar for Chen Duling, got empty string")
	}

	// Test EnrichMovieCast
	movie := &models.RophimMovie{
		Title: "Test Movie",
		Cast:  []string{"Ju Jingyi", "Chen Duling", "Joseph Zeng"},
	}

	resolver.EnrichMovieCast(movie)

	if len(movie.CastDetails) != 3 {
		t.Fatalf("expected 3 cast details, got %d", len(movie.CastDetails))
	}

	if movie.CastDetails[0].Name != "Ju Jingyi" || movie.CastDetails[0].Avatar == "" {
		t.Errorf("expected first cast detail to be Ju Jingyi with avatar, got %+v", movie.CastDetails[0])
	}

	// Ensure movie.Cast is still preserved for mobile/TV backwards compatibility
	if len(movie.Cast) != 3 || movie.Cast[0] != "Ju Jingyi" {
		t.Errorf("original movie.Cast was altered: %+v", movie.Cast)
	}
}
