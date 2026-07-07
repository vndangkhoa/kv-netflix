package tui

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"kv-netflix-tui/internal/models"
)

var htmlTagRx = regexp.MustCompile(`<[^>]*>`)

var htmlEntities = map[string]string{
	"&amp;":  "&",
	"&lt;":   "<",
	"&gt;":   ">",
	"&quot;": "\"",
	"&#39;":  "'",
	"&nbsp;": " ",
}

func stripHTML(s string) string {
	s = htmlTagRx.ReplaceAllString(s, "")
	for k, v := range htmlEntities {
		s = strings.ReplaceAll(s, k, v)
	}
	// Collapse multiple spaces/newlines into single space
	s = regexp.MustCompile(`\s+`).ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

func (m *model) loadMovie(slug string) tea.Cmd {
	return func() tea.Msg {
		movie, err := m.client.Detail(slug)
		return movieLoadedMsg{movie: movie, err: err}
	}
}

func (m *model) handleDetailKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "j", "down":
		if m.detailEpCursor < len(m.currentMovie.Episodes)-1 {
			m.detailEpCursor++
		}
	case "k", "up":
		if m.detailEpCursor > 0 {
			m.detailEpCursor--
		}
	case "enter", " ":
		if len(m.currentMovie.Episodes) > 0 && m.detailEpCursor >= 0 {
			ep := m.currentMovie.Episodes[m.detailEpCursor]
			if ep.URL != "" {
				return m, m.extractAndPlay(ep.URL)
			}
		}
	case "s":
		return m, m.toggleSaveMovie()
	case "b", "h", "left":
		if m.previousView == ViewSearch {
			m.currentView = ViewSearch
		} else {
			m.currentView = ViewHome
		}
		return m, nil
	case "/":
		m.currentView = ViewSearch
		m.searchActive = true
		return m, nil
	case "w":
		if m.playerVO == "window" {
			m.playerVO = "auto"
		} else {
			m.playerVO = "window"
		}
		m.config.PreferredVO = m.playerVO
		m.config.Save()
		return m, nil
	case "m":
		return m, m.loadMyList()
	}

	return m, nil
}

func (m *model) proxyStreamURL(rawURL string) string {
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		return rawURL
	}
	base := strings.TrimRight(m.config.ServerURL, "/")
	return fmt.Sprintf("%s/api/stream?url=%s", base, url.QueryEscape(rawURL))
}

func (m *model) extractAndPlay(episodeURL string) tea.Cmd {
	return func() tea.Msg {
		info, err := m.client.Extract(episodeURL)
		if err != nil {
			// Fallback: pass the episode URL directly to mpv (it has built-in yt-dlp)
			m.playerStreamURL = episodeURL
			return extractDoneMsg{info: &models.VideoInfo{
				Title:      episodeURL,
				StreamURL:  episodeURL,
				Resolution: "direct",
			}}
		}
		m.playerStreamURL = m.proxyStreamURL(info.StreamURL)
		return extractDoneMsg{info: info}
	}
}

func (m *model) toggleSaveMovie() tea.Cmd {
	if m.currentMovie == nil || m.client.Token() == "" {
		return nil
	}
	return func() tea.Msg {
		for _, s := range m.savedMovies {
			if s.MovieID == m.currentMovie.ID {
				err := m.client.RemoveSavedMovie(m.currentMovie.ID)
				return saveDoneMsg{err: err}
			}
		}
		err := m.client.AddSavedMovie(models.AddSavedMovieRequest{
			MovieID:   m.currentMovie.ID,
			Slug:      m.currentMovie.Slug,
			Title:     m.currentMovie.Title,
			Thumbnail: m.currentMovie.Thumbnail,
			Backdrop:  m.currentMovie.Backdrop,
			Year:      m.currentMovie.Year,
			Category:  m.currentMovie.Category,
			Quality:   m.currentMovie.Quality,
			Director:  m.currentMovie.Director,
			Cast:      strings.Join(m.currentMovie.Cast, ", "),
		})
		return saveDoneMsg{err: err}
	}
}

func (m *model) detailView() string {
	if m.currentMovie == nil {
		return LoadingView("Loading...")
	}

	movie := m.currentMovie
	var b strings.Builder

	// Title
	b.WriteString(lipgloss.NewStyle().Bold(true).Padding(0, 1).Render(
		fmt.Sprintf("  %s", movie.Title),
	))
	b.WriteString("\n")

	// Original title if different
	if movie.OriginalTitle != "" && movie.OriginalTitle != movie.Title {
		b.WriteString(InfoStyle.Render(fmt.Sprintf("  %s", movie.OriginalTitle)))
		b.WriteString("\n")
	}

	// Meta row
	var meta []string
	if movie.Year > 0 {
		meta = append(meta, fmt.Sprintf("%d", movie.Year))
	}
	if movie.Quality != "" {
		meta = append(meta, fmt.Sprintf("[%s]", movie.Quality))
	}
	if movie.Time != "" {
		meta = append(meta, movie.Time)
	}
	if movie.Lang != "" {
		meta = append(meta, movie.Lang)
	}
	if len(meta) > 0 {
		b.WriteString(fmt.Sprintf("  %s\n", strings.Join(meta, "  |  ")))
	}

	// Rating
	if movie.Rating != "" {
		b.WriteString(fmt.Sprintf("  ★ %s\n", movie.Rating))
	}

	// Genres
	if movie.Genre != "" {
		genres := strings.Split(movie.Genre, ",")
		var badges []string
		for _, g := range genres {
			g = strings.TrimSpace(g)
			if g != "" {
				badges = append(badges, GenreBadge(g))
			}
		}
		if len(badges) > 0 {
			b.WriteString(fmt.Sprintf("  %s\n\n", lipgloss.JoinHorizontal(lipgloss.Top, badges...)))
		}
	}

	// Director & Cast
	infoWidth := m.contentWidth - 20
	if infoWidth < 20 {
		infoWidth = 20
	}
	if movie.Director != "" {
		b.WriteString(fmt.Sprintf("  Đạo diễn: %s\n", movie.Director))
	}
	if len(movie.Cast) > 0 {
		cast := strings.Join(movie.Cast, ", ")
		wrappedCast := lipgloss.NewStyle().Width(infoWidth).Render(cast)
		b.WriteString(fmt.Sprintf("  Diễn viên: %s\n", wrappedCast))
	}
	if movie.Country != "" {
		b.WriteString(fmt.Sprintf("  Quốc gia: %s\n", movie.Country))
	}
	b.WriteString("\n")

	// Description (strip HTML tags)
	if movie.Description != "" {
		descWidth := m.contentWidth - 6
		if descWidth < 20 {
			descWidth = 20
		}
		clean := stripHTML(movie.Description)
		wrapped := lipgloss.NewStyle().Width(descWidth).Render(clean)
		b.WriteString(fmt.Sprintf("  %s\n\n", wrapped))
	}

	// Video output mode
	voLabel := "auto"
	if m.playerVO == "window" {
		voLabel = "window"
	}
	b.WriteString(DimText.Render(fmt.Sprintf("  [w] Phát với: %s", voLabel)))
	b.WriteString("\n\n")

	// Episodes
	if len(movie.Episodes) > 0 {
		b.WriteString(SectionHeader("Tập Phim", m.contentWidth-4))
		b.WriteString("\n")

		maxEps := m.height - 20
		if maxEps > len(movie.Episodes) {
			maxEps = len(movie.Episodes)
		}
		if maxEps < 1 {
			maxEps = 1
		}

		// Calculate visible range based on cursor
		start := m.detailEpCursor - maxEps/2
		if start < 0 {
			start = 0
		}
		end := start + maxEps
		if end > len(movie.Episodes) {
			end = len(movie.Episodes)
			start = end - maxEps
			if start < 0 {
				start = 0
			}
		}

		for i := start; i < end; i++ {
			ep := movie.Episodes[i]
			selected := i == m.detailEpCursor
			b.WriteString(EpisodeItem(ep, selected, m.contentWidth-4))
			b.WriteString("\n")
		}
	} else {
		b.WriteString(InfoStyle.Render("  No episodes available."))
	}

	return b.String()
}
