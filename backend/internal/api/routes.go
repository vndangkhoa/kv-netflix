package api

import "github.com/go-chi/chi/v5"

func RegisterRoutes(r chi.Router, h *Handler) {
	// Public routes
	r.Get("/videos/home", h.GetHomeVideos)
	r.Get("/videos/search", h.SearchVideos)
	r.Get("/videos/{slug}", h.GetMovieDetail)
	r.Post("/extract", h.ExtractVideo)
	r.Get("/images/proxy", h.ProxyImage)
	r.Get("/categories/genres", h.GetGenres)
	r.Get("/categories/countries", h.GetCountries)
	r.Get("/stream", h.StreamVideo)

	// Auth routes (public)
	r.Post("/auth/register", h.Register)
	r.Post("/auth/login", h.Login)

	// Device pairing (public - no auth needed for generating/checking codes)
	r.Post("/auth/device/code", h.GenerateDeviceCode)
	r.Get("/auth/device/status", h.CheckDeviceStatus)
	r.Post("/auth/device/link-login", h.LoginWithCode)
	r.Post("/auth/reset-password", h.ResetPasswordWithKey)

	// Protected routes (require auth)
	r.Group(func(r chi.Router) {
		r.Use(h.AuthMiddleware)

		r.Get("/auth/me", h.GetMe)
		r.Post("/auth/device/pair", h.PairDevice)
		r.Post("/auth/device/link-code", h.GenerateLinkCode)

		// Account management
		r.Get("/account/devices", h.GetDevices)
		r.Delete("/account/devices", h.RemoveDevice)
		r.Post("/account/change-password", h.ChangePassword)
		r.Post("/account/recovery-key", h.GenerateRecoveryKey)

		// Explore
		r.Get("/videos/explore", h.ExploreMovies)
		r.Get("/videos/explore/category", h.ExploreCategory)

		// Sync routes
		r.Get("/sync/saved-movies", h.GetSavedMovies)
		r.Post("/sync/saved-movies", h.AddSavedMovie)
		r.Delete("/sync/saved-movies", h.RemoveSavedMovie)
		r.Get("/sync/watch-history", h.GetWatchHistory)
		r.Post("/sync/watch-history", h.UpdateWatchProgress)
		r.Post("/sync/bulk", h.BulkSync)
	})
}
