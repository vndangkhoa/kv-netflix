package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
)

func (m *model) loadMyList() tea.Cmd {
	m.loading = true
	return func() tea.Msg {
		saved, err := m.client.SavedMovies()
		if err != nil {
			return myListLoadedMsg{err: err}
		}
		history, err := m.client.WatchHistory()
		if err != nil {
			return myListLoadedMsg{err: err}
		}
		user, err := m.client.Me()
		if err != nil {
			user = nil
		}
		m.user = user
		return myListLoadedMsg{saved: saved, history: history}
	}
}

func (m *model) handleMyListKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "j", "down":
		m.mylistCursor++
	case "k", "up":
		if m.mylistCursor > 0 {
			m.mylistCursor--
		}
	case "h", "left":
		if m.mylistTab > 0 {
			m.mylistTab--
			m.mylistCursor = 0
		}
	case "l", "right":
		if m.mylistTab < 2 {
			m.mylistTab++
			m.mylistCursor = 0
		}
	case "enter":
		if m.mylistTab == 1 && m.mylistCursor < len(m.watchHistory) {
			slug := m.watchHistory[m.mylistCursor].Slug
			m.detailLoading = true
			return m, m.loadMovie(slug)
		}
		if m.mylistTab == 0 && m.mylistCursor < len(m.savedMovies) {
			slug := m.savedMovies[m.mylistCursor].Slug
			m.detailLoading = true
			return m, m.loadMovie(slug)
		}
	case "b", "esc":
		m.currentView = ViewHome
		return m, nil
	case "d":
		if m.mylistTab == 0 && m.mylistCursor < len(m.savedMovies) {
			movieID := m.savedMovies[m.mylistCursor].MovieID
			cmd := func() tea.Msg {
				err := m.client.RemoveSavedMovie(movieID)
				if err != nil {
					return saveDoneMsg{err: err}
				}
				return saveDoneMsg{}
			}
			return m, cmd
		}
	case "/":
		m.currentView = ViewSearch
		m.searchActive = true
		return m, nil
	}

	return m, nil
}

func (m *model) myListView() string {
	var b strings.Builder

	tabs := TabBar([]string{"Saved", "History", "Account"}, m.mylistTab)
	b.WriteString(fmt.Sprintf("  %s\n\n", tabs))

	switch m.mylistTab {
	case 0:
		b.WriteString(m.savedMoviesView())
	case 1:
		b.WriteString(m.watchHistoryView())
	case 2:
		b.WriteString(m.accountView())
	}

	return b.String()
}

func (m *model) savedMoviesView() string {
	if len(m.savedMovies) == 0 {
		return InfoStyle.Render("  No saved movies. Browse and press 's' to save.")
	}

	var b strings.Builder
	for i, movie := range m.savedMovies {
		prefix := "  "
		if i == m.mylistCursor {
			prefix = "▶ "
		}
		title := movie.Title
		year := ""
		if movie.Year > 0 {
			year = fmt.Sprintf(" (%d)", movie.Year)
		}
		quality := ""
		if movie.Quality != "" {
			quality = fmt.Sprintf(" [%s]", movie.Quality)
		}
		line := fmt.Sprintf("%s%s%s%s", prefix, title, year, quality)
		if i == m.mylistCursor {
			b.WriteString(MovieCardSelectedStyle.Render(line))
		} else {
			b.WriteString(line)
		}
		b.WriteString("\n")
	}
	return b.String()
}

func (m *model) watchHistoryView() string {
	if len(m.watchHistory) == 0 {
		return InfoStyle.Render("  No watch history. Watch a movie to see it here.")
	}

	var b strings.Builder
	for i, h := range m.watchHistory {
		prefix := "  "
		if i == m.mylistCursor {
			prefix = "▶ "
		}
		title := h.Title
		ep := ""
		if h.CurrentEpisode > 0 {
			ep = fmt.Sprintf(" Ep.%d", h.CurrentEpisode)
		}
		label := ProgressLabel(h.Progress)
		progress := ""
		if h.Progress > 0 {
			bar := ProgressBarStr(8, h.Progress)
			pct := int(h.Progress * 100)
			progress = fmt.Sprintf(" %s %d%%", bar, pct)
		}
		timeAgo := TimeAgo(h.WatchedTimestamp)
		line := fmt.Sprintf("%s%s%s %s%s %s", prefix, title, ep, label, progress, timeAgo)
		if i == m.mylistCursor {
			b.WriteString(MovieCardSelectedStyle.Render(line))
		} else {
			b.WriteString(line)
		}
		b.WriteString("\n")
	}
	return b.String()
}

func (m *model) accountView() string {
	var b strings.Builder

	if m.user != nil {
		b.WriteString(fmt.Sprintf("  Name:  %s\n", m.user.Name))
		b.WriteString(fmt.Sprintf("  Email: %s\n", m.user.Email))
		b.WriteString(fmt.Sprintf("  ID:    %d\n", m.user.ID))
		b.WriteString("\n")
		b.WriteString(HelpStyle.Render("  [l] logout  [b] back"))
	} else {
		b.WriteString(InfoStyle.Render("  Not logged in.\n"))
		b.WriteString("\n")
		b.WriteString(InfoStyle.Render("  Login or register to sync your library."))
	}

	return b.String()
}
