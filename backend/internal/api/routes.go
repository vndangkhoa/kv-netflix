package api

import (
	"github.com/go-chi/chi/v5"
)

func RegisterRoutes(r chi.Router, h *Handler) {
	r.Get("/videos/home", h.GetHomeVideos)
	r.Get("/videos/search", h.SearchVideos)
	r.Get("/videos/{slug}", h.GetMovieDetail)
	r.Post("/extract", h.ExtractVideo)
	r.Get("/images/proxy", h.ProxyImage)
	r.Get("/categories/genres", h.GetGenres)
	r.Get("/categories/countries", h.GetCountries)
	r.Get("/stream", h.StreamVideo)
}
