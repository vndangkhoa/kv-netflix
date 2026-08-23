package config

import (
	"os"
)

type Config struct {
	Port           string
	DatabaseURL    string
	JWTSecret      string
	TMDBAPIKey     string
	GINMode        string
	AllowedOrigins []string
	PublicURL      string
}

func Load() *Config {
	return &Config{
		Port:           getEnv("PORT", "8000"),
		DatabaseURL:    getEnv("DATABASE_URL", "streamflow.db"),
		JWTSecret:      getEnv("JWT_SECRET", "change-me-in-production"),
		TMDBAPIKey:     os.Getenv("TMDB_API_KEY"),
		GINMode:        getEnv("GIN_MODE", "debug"),
		AllowedOrigins: getEnvSlice("ALLOWED_ORIGINS", []string{"*"}),
		PublicURL:      os.Getenv("PUBLIC_URL"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvSlice(key string, fallback []string) []string {
	if val := os.Getenv(key); val != "" {
		return []string{val}
	}
	return fallback
}
