package models

type RophimMovie struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	OriginalTitle string    `json:"originalTitle"`
	Slug          string    `json:"slug"`
	Thumbnail     string    `json:"thumbnail"`
	Backdrop      string    `json:"backdrop"`
	Year          int       `json:"year"`
	Rating        string    `json:"rating"`
	Time          string    `json:"time"`
	Duration      int       `json:"duration"`
	Quality       string    `json:"quality"`
	Lang          string    `json:"lang"`
	Genre         string    `json:"genre"`
	Description   string    `json:"description"`
	Category      string    `json:"category"`
	Provider      string    `json:"provider"`
	Cast          []string  `json:"cast"`
	Director      string    `json:"director"`
	Country       string    `json:"country"`
	Episodes      []Episode `json:"episodes"`
	TrailerURL    string    `json:"trailerURL"`
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

type VideoInfo struct {
	Title      string `json:"title"`
	Thumbnail  string `json:"thumbnail"`
	Duration   int    `json:"duration"`
	StreamURL  string `json:"url"`
	FormatID   string `json:"format_id"`
	Resolution string `json:"resolution"`
	Ext        string `json:"ext"`
}

type User struct {
	ID    uint   `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type SavedMovie struct {
	ID        uint   `json:"id"`
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

type WatchHistory struct {
	ID              uint    `json:"id"`
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
	WatchedTimestamp int    `json:"watched_timestamp"`
	Duration        int     `json:"duration"`
	Progress        float64 `json:"progress"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type UpdateProgressRequest struct {
	MovieID         string  `json:"movie_id"`
	Slug            string  `json:"slug"`
	Title           string  `json:"title"`
	Thumbnail       string  `json:"thumbnail"`
	Backdrop        string  `json:"backdrop"`
	Year            int     `json:"year"`
	Category        string  `json:"category"`
	Genre           string  `json:"genre"`
	Country         string  `json:"country"`
	Quality         string  `json:"quality"`
	CurrentEpisode  int     `json:"current_episode"`
	WatchedTimestamp int    `json:"watched_timestamp"`
	Duration        int     `json:"duration"`
	Progress        float64 `json:"progress"`
}

type AddSavedMovieRequest struct {
	MovieID   string `json:"movie_id"`
	Slug      string `json:"slug"`
	Title     string `json:"title"`
	Thumbnail string `json:"thumbnail"`
	Backdrop  string `json:"backdrop"`
	Year      int    `json:"year"`
	Category  string `json:"category"`
	Quality   string `json:"quality"`
	Director  string `json:"director"`
	Cast      string `json:"cast"`
}

type ExtractRequest struct {
	URL string `json:"url"`
}

type BulkSyncRequest struct {
	SavedMovies  []AddSavedMovieRequest  `json:"saved_movies"`
	WatchHistory []UpdateProgressRequest `json:"watch_history"`
}

type DeviceCodeResponse struct {
	Code string `json:"code"`
}

type DeviceStatusResponse struct {
	Token   string `json:"token,omitempty"`
	Paired  bool   `json:"is_paired"`
}
