package models

import "time"

// Video - persisted DB model
type Video struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Title       string    `json:"title" gorm:"index;size:500"`
	Description string    `json:"description"`
	Thumbnail   string    `json:"thumbnail" gorm:"size:1000"`
	SourceURL   string    `json:"source_url" gorm:"uniqueIndex;size:2000"`
	Duration    int       `json:"duration" gorm:"default:0"`
	Resolution  string    `json:"resolution" gorm:"size:20"`
	Category    string    `json:"category" gorm:"index;size:100"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// RophimMovie - in-memory DTO for scraped movie data (NOT persisted)
type RophimMovie struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	OriginalTitle   string    `json:"originalTitle"`
	Slug            string    `json:"slug"`
	Thumbnail       string    `json:"thumbnail"`
	Backdrop        string    `json:"backdrop"`
	Year            int       `json:"year"`
	Rating          string    `json:"rating"`
	Time            string    `json:"time"`
	Duration        int       `json:"duration"`
	Quality         string    `json:"quality"`
	Lang            string    `json:"lang"`
	Genre           string    `json:"genre"`
	Description     string    `json:"description"`
	Category        string    `json:"category"`
	Provider        string    `json:"provider"`
	Cast            []string  `json:"cast"`
	Director        string    `json:"director"`
	Country         string    `json:"country"`
	Episodes        []Episode `json:"episodes" gorm:"-"`
	TrailerURL      string    `json:"trailerURL"`
}

type Episode struct {
	Number     int    `json:"number"`
	Title      string `json:"title"`
	URL        string `json:"url"`
	ServerName string `json:"serverName"`
}

type Category struct {
	Name string
	Slug string
}

// ── Auth Models ─────────────────────────────────────────────────────

type User struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	Email        string    `json:"email" gorm:"uniqueIndex;size:255"`
	PasswordHash string    `json:"-" gorm:"size:255"`
	Name         string    `json:"name" gorm:"size:255"`
	CreatedAt    time.Time `json:"created_at"`
}

type Device struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"index"`
	Code      string    `json:"-" gorm:"size:10;uniqueIndex"`
	Name      string    `json:"name" gorm:"size:255"`
	IsPaired  bool      `json:"is_paired" gorm:"default:false"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type SavedMovie struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"index;uniqueIndex:idx_user_movie"`
	MovieID   string    `json:"movie_id" gorm:"size:100;uniqueIndex:idx_user_movie"`
	Title     string    `json:"title" gorm:"size:500"`
	Slug      string    `json:"slug" gorm:"size:500"`
	Thumbnail string    `json:"thumbnail" gorm:"size:1000"`
	Backdrop  string    `json:"backdrop" gorm:"size:1000"`
	Year      int       `json:"year"`
	Category  string    `json:"category" gorm:"size:100"`
	Quality   string    `json:"quality" gorm:"size:20"`
	Director  string    `json:"director" gorm:"size:500"`
	Cast      string    `json:"cast" gorm:"size:1000"`
	SavedAt   time.Time `json:"saved_at"`
}

type WatchHistory struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	UserID          uint      `json:"user_id" gorm:"index;uniqueIndex:idx_user_watch"`
	MovieID         string    `json:"movie_id" gorm:"size:100;uniqueIndex:idx_user_watch"`
	Title           string    `json:"title" gorm:"size:500"`
	Slug            string    `json:"slug" gorm:"size:500"`
	Thumbnail       string    `json:"thumbnail" gorm:"size:1000"`
	Backdrop        string    `json:"backdrop" gorm:"size:1000"`
	Year            int       `json:"year"`
	Category        string    `json:"category" gorm:"size:100"`
	Genre           string    `json:"genre" gorm:"size:500"`
	Country         string    `json:"country" gorm:"size:200"`
	Quality         string    `json:"quality" gorm:"size:20"`
	CurrentEpisode  int       `json:"current_episode"`
	WatchedTimestamp int       `json:"watched_timestamp"`
	Duration        int       `json:"duration"`
	Progress        float64   `json:"progress"`
	WatchedAt       time.Time `json:"watched_at"`
}

type RecoveryKey struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	UserID    uint      `json:"user_id" gorm:"index"`
	Key       string    `json:"key" gorm:"size:64;uniqueIndex"`
	Used      bool      `json:"used" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
}
