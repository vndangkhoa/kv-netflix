package models

import (
	"time"
)

// Video metadata model matches SQLAlchemy Video class
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

// RophimMovie represents the scraped movie data
type RophimMovie struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	OriginalTitle string    `json:"original_title,omitempty"`
	Slug          string    `json:"slug"`
	Thumbnail     string    `json:"thumbnail"`
	Backdrop      string    `json:"backdrop,omitempty"`
	Year          int       `json:"year,omitempty"`
	Rating        string    `json:"rating,omitempty"`
	Duration      int       `json:"duration,omitempty"`
	Time          string    `json:"time,omitempty"` // Raw time string
	Quality       string    `json:"quality,omitempty"`
	Lang          string    `json:"lang,omitempty"`
	Genre         string    `json:"genre,omitempty"`
	Description   string    `json:"description,omitempty"`
	Category      string    `json:"category"`
	Provider      string    `json:"provider,omitempty"`
	Cast          []string  `json:"cast,omitempty" gorm:"-"`
	Director      string    `json:"director,omitempty"`
	Country       string    `json:"country,omitempty"`
	Episodes      []Episode `json:"episodes,omitempty" gorm:"-"`
	TrailerURL    string    `json:"trailer_url,omitempty"`
}

type Episode struct {
	Number     int    `json:"number"`
	Title      string `json:"title"`
	URL        string `json:"url"`
	ServerName string `json:"server_name"`
}

type Category struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}
