package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port           string
	DatabaseURL    string
	TMDBAPIKey     string
	GINMode        string
	AllowedOrigins []string
}

func Load() *Config {
	return &Config{
		Port:           getEnv("PORT", "8000"),
		DatabaseURL:    getEnv("DATABASE_URL", "streamflow.db"),
		TMDBAPIKey:     os.Getenv("TMDB_API_KEY"),
		GINMode:        getEnv("GIN_MODE", "debug"),
		AllowedOrigins: getEnvSlice("ALLOWED_ORIGINS", []string{"*"}),
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

func getEnvInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return fallback
}
