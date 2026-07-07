package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
)

func (m *model) loadSearch() tea.Cmd {
	return func() tea.Msg {
		movies, err := m.client.Search(m.searchInput, m.searchPage)
		return searchResultsMsg{movies: movies, err: err}
	}
}

func (m *model) handleSearchKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "j", "down":
		if m.searchCursor < len(m.searchResults)-1 {
			m.searchCursor++
		}
	case "k", "up":
		if m.searchCursor > 0 {
			m.searchCursor--
		}
	case "enter":
		if m.searchActive {
			m.searchActive = false
			m.searchPage = 1
			m.searchCursor = 0
			m.searchResults = nil
			m.loading = true
			return m, m.loadSearch()
		}
		if len(m.searchResults) > 0 {
			slug := m.searchResults[m.searchCursor].Slug
			m.detailLoading = true
			m.currentView = ViewHome
			return m, m.loadMovie(slug)
		}
	case "esc":
		m.currentView = ViewHome
		m.searchActive = false
		return m, nil
	case "/":
		m.searchActive = true
		m.searchInput = ""
		m.searchCursor = 0
		m.searchResults = nil
	case "backspace":
		if m.searchActive && len(m.searchInput) > 0 {
			m.searchInput = m.searchInput[:len(m.searchInput)-1]
		}
	case "tab":
		m.searchActive = !m.searchActive
	default:
		if m.searchActive && len(msg.String()) == 1 {
			m.searchInput += msg.String()
		}
	}

	return m, nil
}

func (m *model) searchView() string {
	var b strings.Builder

	// Search input
	prompt := "Search: "
	if m.searchActive {
		prompt = "» Search: "
	}
	input := m.searchInput
	if m.searchActive {
		input += "█"
	}
	b.WriteString(fmt.Sprintf("  %s%s\n\n", prompt, input))

	if m.loading {
		b.WriteString(LoadingView("Searching..."))
		return b.String()
	}

	if len(m.searchResults) == 0 && m.searchInput != "" {
		b.WriteString(InfoStyle.Render("  No results. Try a different query."))
		return b.String()
	}

	for i, movie := range m.searchResults {
		prefix := "  "
		if i == m.searchCursor && !m.searchActive {
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
		if i == m.searchCursor && !m.searchActive {
			b.WriteString(MovieCardSelectedStyle.Render(line))
		} else {
			b.WriteString(line)
		}
		b.WriteString("\n")
	}

	if len(m.searchResults) > 0 {
		b.WriteString(fmt.Sprintf("\n  Page %d  (%d results)", m.searchPage, len(m.searchResults)))
	}

	return b.String()
}
