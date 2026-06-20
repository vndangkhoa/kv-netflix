package api

import (
	"encoding/json"
	"net/http"
	"time"

	"streamflow-backend/internal/database"
	"streamflow-backend/internal/models"
)

// ── Saved Movies ────────────────────────────────────────────────────

type SavedMovieRequest struct {
	MovieID   string `json:"movie_id"`
	Title     string `json:"title"`
	Slug      string `json:"slug"`
	Thumbnail string `json:"thumbnail"`
	Backdrop  string `json:"backdrop"`
	Year      int    `json:"year"`
	Category  string `json:"category"`
	Quality   string `json:"quality"`
	Director  string `json:"director"`
	Cast      string `json:"cast"`
}

func (h *Handler) GetSavedMovies(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var movies []models.SavedMovie
	database.DB.Where("user_id = ?", userID).Order("saved_at DESC").Find(&movies)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(movies)
}

func (h *Handler) AddSavedMovie(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req SavedMovieRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	movie := models.SavedMovie{
		UserID:    userID,
		MovieID:   req.MovieID,
		Title:     req.Title,
		Slug:      req.Slug,
		Thumbnail: req.Thumbnail,
		Backdrop:  req.Backdrop,
		Year:      req.Year,
		Category:  req.Category,
		Quality:   req.Quality,
		Director:  req.Director,
		Cast:      req.Cast,
		SavedAt:   time.Now(),
	}

	// Upsert: if already saved, skip
	var existing models.SavedMovie
	if err := database.DB.Where("user_id = ? AND movie_id = ?", userID, req.MovieID).First(&existing).Error; err == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(existing)
		return
	}

	if err := database.DB.Create(&movie).Error; err != nil {
		http.Error(w, "Failed to save movie", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(movie)
}

func (h *Handler) RemoveSavedMovie(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)
	movieID := r.URL.Query().Get("movie_id")

	if movieID == "" {
		http.Error(w, "movie_id is required", http.StatusBadRequest)
		return
	}

	database.DB.Where("user_id = ? AND movie_id = ?", userID, movieID).Delete(&models.SavedMovie{})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "removed"})
}

// ── Watch History ───────────────────────────────────────────────────

type WatchHistoryRequest struct {
	MovieID         string  `json:"movie_id"`
	Title           string  `json:"title"`
	Slug            string  `json:"slug"`
	Thumbnail       string  `json:"thumbnail"`
	Backdrop        string  `json:"backdrop"`
	Year            int     `json:"year"`
	Category        string  `json:"category"`
	Genre           string  `json:"genre"`
	Country         string  `json:"country"`
	Quality         string  `json:"quality"`
	CurrentEpisode  int     `json:"current_episode"`
	WatchedTimestamp int     `json:"watched_timestamp"`
	Duration        int     `json:"duration"`
	Progress        float64 `json:"progress"`
}

func (h *Handler) GetWatchHistory(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var history []models.WatchHistory
	database.DB.Where("user_id = ?", userID).Order("watched_at DESC").Find(&history)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

func (h *Handler) UpdateWatchProgress(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req WatchHistoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var existing models.WatchHistory
	if err := database.DB.Where("user_id = ? AND movie_id = ?", userID, req.MovieID).First(&existing).Error; err == nil {
		// Update existing
		existing.CurrentEpisode = req.CurrentEpisode
		existing.WatchedTimestamp = req.WatchedTimestamp
		existing.Duration = req.Duration
		existing.Progress = req.Progress
		existing.WatchedAt = time.Now()
		if req.Genre != "" {
			existing.Genre = req.Genre
		}
		if req.Country != "" {
			existing.Country = req.Country
		}
		database.DB.Save(&existing)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(existing)
		return
	}

	// Create new
	entry := models.WatchHistory{
		UserID:          userID,
		MovieID:         req.MovieID,
		Title:           req.Title,
		Slug:            req.Slug,
		Thumbnail:       req.Thumbnail,
		Backdrop:        req.Backdrop,
		Year:            req.Year,
		Category:        req.Category,
		Genre:           req.Genre,
		Country:         req.Country,
		Quality:         req.Quality,
		CurrentEpisode:  req.CurrentEpisode,
		WatchedTimestamp: req.WatchedTimestamp,
		Duration:        req.Duration,
		Progress:        req.Progress,
		WatchedAt:       time.Now(),
	}

	if err := database.DB.Create(&entry).Error; err != nil {
		http.Error(w, "Failed to update watch progress", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entry)
}

// ── Bulk Sync (initial login sync) ─────────────────────────────────

type BulkSyncRequest struct {
	SavedMovies  []SavedMovieRequest  `json:"saved_movies"`
	WatchHistory []WatchHistoryRequest `json:"watch_history"`
}

func (h *Handler) BulkSync(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req BulkSyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Sync saved movies
	for _, m := range req.SavedMovies {
		var existing models.SavedMovie
		if err := database.DB.Where("user_id = ? AND movie_id = ?", userID, m.MovieID).First(&existing).Error; err != nil {
			database.DB.Create(&models.SavedMovie{
				UserID:    userID,
				MovieID:   m.MovieID,
				Title:     m.Title,
				Slug:      m.Slug,
				Thumbnail: m.Thumbnail,
				Backdrop:  m.Backdrop,
				Year:      m.Year,
				Category:  m.Category,
				Quality:   m.Quality,
				Director:  m.Director,
				Cast:      m.Cast,
				SavedAt:   time.Now(),
			})
		}
	}

	// Sync watch history
	for _, wh := range req.WatchHistory {
		var existing models.WatchHistory
		if err := database.DB.Where("user_id = ? AND movie_id = ?", userID, wh.MovieID).First(&existing).Error; err != nil {
			database.DB.Create(&models.WatchHistory{
				UserID:          userID,
				MovieID:         wh.MovieID,
				Title:           wh.Title,
				Slug:            wh.Slug,
				Thumbnail:       wh.Thumbnail,
				Backdrop:        wh.Backdrop,
				Year:            wh.Year,
				Category:        wh.Category,
				Genre:           wh.Genre,
				Country:         wh.Country,
				Quality:         wh.Quality,
				CurrentEpisode:  wh.CurrentEpisode,
				WatchedTimestamp: wh.WatchedTimestamp,
				Duration:        wh.Duration,
				Progress:        wh.Progress,
				WatchedAt:       time.Now(),
			})
		}
	}

	// Return all user data
	var savedMovies []models.SavedMovie
	database.DB.Where("user_id = ?", userID).Order("saved_at DESC").Find(&savedMovies)

	var history []models.WatchHistory
	database.DB.Where("user_id = ?", userID).Order("watched_at DESC").Find(&history)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"saved_movies":  savedMovies,
		"watch_history": history,
	})
}
