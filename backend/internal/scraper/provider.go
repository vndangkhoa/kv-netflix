package scraper

import "streamflow-backend/internal/models"

type MovieProvider interface {
	GetMoviesByCategory(category string, page int) ([]models.RophimMovie, error)
	GetMoviesByCountry(country string, page int) ([]models.RophimMovie, error)
	GetMovieDetail(slug string) (*models.RophimMovie, error)
	Search(query string, page int) ([]models.RophimMovie, error)
}
