package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"kv-netflix-tui/internal/models"
)

type CategoryTab struct {
	Label string
	Value string // empty = all
}

var categoryTabs = []CategoryTab{
	{Label: "Tất Cả", Value: ""},
	{Label: "Phim Bộ", Value: "phim-bo"},
	{Label: "Phim Lẻ", Value: "phim-le"},
	{Label: "Hoạt Hình", Value: "hoat-hinh"},
	{Label: "TV Shows", Value: "tv-shows"},
	{Label: "Sắp Chiếu", Value: "phim-sap-chieu"},
	{Label: "Đang Chiếu", Value: "phim-dang-chieu"},
}

func (m *model) allCategoryTabs() []CategoryTab {
	if len(m.homeGenres) == 0 {
		return categoryTabs
	}
	tabs := make([]CategoryTab, len(categoryTabs)+len(m.homeGenres))
	n := copy(tabs, categoryTabs)
	for i, g := range m.homeGenres {
		tabs[n+i] = CategoryTab{Label: g.Name, Value: g.Slug}
	}
	return tabs
}

func (m *model) loadHome() tea.Cmd {
	return func() tea.Msg {
		tabs := m.allCategoryTabs()
		cat := tabs[m.homeCategoryIdx].Value
		movies, err := m.client.Home(cat, m.homePage)
		if err != nil {
			return homeLoadedMsg{err: err}
		}

		var continueWatching []models.WatchHistory
		var savedMovies []models.SavedMovie
		if m.client.Token() != "" {
			history, err := m.client.WatchHistory()
			if err == nil {
				continueWatching = history
			}
			saved, err := m.client.SavedMovies()
			if err == nil {
				savedMovies = saved
			}
		}

		var genres []models.Category
		if len(m.homeGenres) == 0 {
			g, err := m.client.Genres()
			if err == nil {
				genres = g
			}
		}

		return homeLoadedMsg{
			movies:           movies,
			continueWatching: continueWatching,
			savedMovies:      savedMovies,
			genres:           genres,
		}
	}
}

func (m *model) loadContinue() tea.Cmd {
	if m.client.Token() == "" {
		return nil
	}
	return func() tea.Msg {
		history, err := m.client.WatchHistory()
		if err != nil {
			return homeLoadedMsg{err: err}
		}
		saved, err := m.client.SavedMovies()
		if err != nil {
			return homeLoadedMsg{continueWatching: history}
		}
		return homeLoadedMsg{continueWatching: history, savedMovies: saved}
	}
}

func (m *model) updatePreview() {
	m.sidebarPreview = nil
	if m.homeSection == 2 && len(m.homeMovies) > 0 && m.homeCursor < len(m.homeMovies) {
		m.sidebarPreview = &m.homeMovies[m.homeCursor]
	}
	if m.homeSection == 1 && len(m.homeSaved) > 0 && m.homeCursor < len(m.homeSaved) {
		m.sidebarPreview = nil // saved movies don't have full movie data loaded
	}
}

func (m *model) handleHomeKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	cols := m.homeCols
	if cols < 1 {
		cols = 1
	}

	hasContinue := len(m.homeContinue) > 0
	hasSaved := len(m.homeSaved) > 0
	hasMovies := len(m.homeMovies) > 0

	switch msg.String() {
	case "j", "down":
		if m.homeSection == 0 {
			if m.homeCursor+1 < len(m.homeContinue) {
				m.homeCursor++
			} else if hasSaved {
				m.homeSection = 1
				m.homeCursor = 0
			} else {
				m.homeSection = 2
				m.homeCursor = 0
			}
		} else if m.homeSection == 1 {
			if m.homeCursor+1 < len(m.homeSaved) {
				m.homeCursor++
			} else if hasMovies {
				m.homeSection = 2
				m.homeCursor = 0
			}
		} else if m.homeCursor+cols < len(m.homeMovies) {
			m.homeCursor += cols
		}
		m.updatePreview()
	case "k", "up":
		if m.homeSection == 0 {
			if m.homeCursor > 0 {
				m.homeCursor--
			}
		} else if m.homeSection == 1 {
			if m.homeCursor > 0 {
				m.homeCursor--
			} else if hasContinue {
				m.homeSection = 0
				m.homeCursor = len(m.homeContinue) - 1
			}
		} else {
			if m.homeCursor-cols >= 0 {
				m.homeCursor -= cols
			} else if hasSaved {
				m.homeSection = 1
				m.homeCursor = len(m.homeSaved) - 1
			} else if hasContinue {
				m.homeSection = 0
				m.homeCursor = len(m.homeContinue) - 1
			}
		}
		m.updatePreview()
	case "l", "right":
		if m.homeSection == 0 {
			if m.homeCursor+1 < len(m.homeContinue) {
				m.homeCursor++
			}
		} else if m.homeSection == 1 {
			if m.homeCursor+1 < len(m.homeSaved) {
				m.homeCursor++
			}
		} else if m.homeCursor%cols < cols-1 && m.homeCursor < len(m.homeMovies)-1 {
			m.homeCursor++
			m.updatePreview()
		} else if m.homeCursor >= len(m.homeMovies)-1 || m.homeCursor%cols == cols-1 {
			tabs := m.allCategoryTabs()
			m.homeCategoryIdx = (m.homeCategoryIdx + 1) % len(tabs)
			m.homeSection = 2
			m.homeCursor = 0
			m.loading = true
			return m, m.loadHome()
		}
	case "h", "left":
		if m.homeSection == 0 {
			if m.homeCursor > 0 {
				m.homeCursor--
			}
		} else if m.homeSection == 1 {
			if m.homeCursor > 0 {
				m.homeCursor--
			}
		} else if m.homeCursor%cols > 0 {
			m.homeCursor--
			m.updatePreview()
		} else if m.homeCursor == 0 {
			tabs := m.allCategoryTabs()
			m.homeCategoryIdx--
			if m.homeCategoryIdx < 0 {
				m.homeCategoryIdx = len(tabs) - 1
			}
			m.homeSection = 2
			m.homeCursor = 0
			m.loading = true
			return m, m.loadHome()
		}
	case "enter", " ":
		if m.homeSection == 0 && hasContinue && m.homeCursor < len(m.homeContinue) {
			h := m.homeContinue[m.homeCursor]
			m.detailLoading = true
			return m, m.loadMovie(h.Slug)
		}
		if m.homeSection == 1 && hasSaved && m.homeCursor < len(m.homeSaved) {
			s := m.homeSaved[m.homeCursor]
			m.detailLoading = true
			return m, m.loadMovie(s.Slug)
		}
		if m.homeSection == 2 && hasMovies && m.homeCursor < len(m.homeMovies) {
			slug := m.homeMovies[m.homeCursor].Slug
			m.detailLoading = true
			return m, m.loadMovie(slug)
		}
	case "/":
		m.currentView = ViewSearch
		m.searchActive = true
	case "m":
		return m, m.loadMyList()
	case "r":
		m.homePage = 1
		m.homeCursor = 0
		m.homeSection = 2
		m.homeMovies = nil
		m.loading = true
		return m, m.loadHome()
	case "tab":
		tabs := m.allCategoryTabs()
		m.homeCategoryIdx = (m.homeCategoryIdx + 1) % len(tabs)
		m.homeCursor = 0
		m.homeSection = 2
		m.loading = true
		return m, m.loadHome()
	case "g":
		m.homePage = 1
		m.homeCursor = 0
		m.homeSection = 2
		return m, nil
	case "n", "pagedown":
		m.homePage++
		m.homeCursor = 0
		m.homeSection = 2
		m.homeMovies = nil
		m.loading = true
		return m, m.loadHome()
	case "p", "pageup":
		if m.homePage > 1 {
			m.homePage--
			m.homeCursor = 0
			m.homeSection = 2
			m.homeMovies = nil
			m.loading = true
			return m, m.loadHome()
		}
	}

	return m, nil
}

func (m *model) homeView() string {
	if m.loading {
		return LoadingView("Loading movies...")
	}

	var b strings.Builder

	// Continue Watching section — aligned columns
	if m.homePage == 1 && len(m.homeContinue) > 0 {
		b.WriteString(SectionHeader("Tiếp Tục Xem", m.contentWidth-4))
		b.WriteString("\n")

		totalW := m.contentWidth - 4
		epW := 5
		barW := 12
		pctW := 4
		taW := 12
		titleW := totalW - epW - barW - pctW - taW - 8
		if titleW < 10 {
			titleW = 10
		}

		for i, h := range m.homeContinue {
			sel := m.homeSection == 0 && i == m.homeCursor

			title := fmt.Sprintf("%-*s", titleW, truncate(h.Title, titleW))
			ep := ""
			if h.CurrentEpisode > 0 {
				ep = fmt.Sprintf("T%d", h.CurrentEpisode)
			}
			ep = fmt.Sprintf("%-*s", epW, ep)
			pct := fmt.Sprintf("%*s", pctW, fmt.Sprintf("%.0f%%", h.Progress*100))
			ta := fmt.Sprintf("%-*s", taW, truncate(TimeAgo(h.WatchedTimestamp), taW))
			bar := plainBar(barW, h.Progress)

			pfx := "   "
			if sel {
				pfx = "▸ "
			}
			line := fmt.Sprintf("%s%s %s %s%s %s", pfx, title, ep, bar, pct, ta)

			if sel {
				b.WriteString(MovieCardSelectedStyle.Render(line) + "\n")
			} else {
				b.WriteString(line + "\n")
			}
		}
		b.WriteString("\n")
	}

	// Saved Movies section — selectable rows
	if m.homePage == 1 && len(m.homeSaved) > 0 {
		b.WriteString(SectionHeader("Đã Lưu", m.contentWidth-4))
		b.WriteString("\n")
		maxShow := 5
		if len(m.homeSaved) < maxShow {
			maxShow = len(m.homeSaved)
		}
		for i, s := range m.homeSaved[:maxShow] {
			sel := m.homeSection == 1 && i == m.homeCursor
			pfx := "   "
			if sel {
				pfx = "▸ "
			}
			line := fmt.Sprintf("%s★ %s", pfx, truncate(s.Title, m.contentWidth-10))
			if sel {
				b.WriteString(MovieCardSelectedStyle.Render(line) + "\n")
			} else {
				b.WriteString(line + "\n")
			}
		}
		if len(m.homeSaved) > maxShow {
			b.WriteString(fmt.Sprintf("  ... và %d phim nữa\n", len(m.homeSaved)-maxShow))
		}
		b.WriteString("\n")
	}

	// Category tabs — wrap to multiple lines
	tabs := m.allCategoryTabs()
	var tabViews []string
	lineWidth := 0
	for i, cat := range tabs {
		var rendered string
		if i == m.homeCategoryIdx {
			rendered = TabActiveStyle.Render(cat.Label)
		} else {
			rendered = TabStyle.Render(cat.Label)
		}
		w := lipgloss.Width(rendered)
		if lineWidth > 0 && lineWidth+w > m.contentWidth-4 {
			b.WriteString(lipgloss.JoinHorizontal(lipgloss.Left, tabViews...) + "\n")
			tabViews = nil
			lineWidth = 0
		}
		tabViews = append(tabViews, rendered)
		lineWidth += w
	}
	if len(tabViews) > 0 {
		b.WriteString(lipgloss.JoinHorizontal(lipgloss.Left, tabViews...) + "\n")
	}
	b.WriteString("\n")

	if len(m.homeMovies) == 0 {
		b.WriteString(InfoStyle.Render("  No movies loaded. Press 'r' to refresh."))
		return b.String()
	}

	// Calculate grid
	cols := m.homeCols
	if cols < 1 {
		cols = 1
	}

	cardWidth := (m.contentWidth - 6) / cols
	if cardWidth < 20 {
		cardWidth = 20
	}
	cardHeight := 3

	// Render grid rows
	for i := 0; i < len(m.homeMovies); i += cols {
		var row []string
		for j := 0; j < cols && i+j < len(m.homeMovies); j++ {
			idx := i + j
			movie := m.homeMovies[idx]
			selected := m.homeSection == 2 && idx == m.homeCursor

			style := MovieCardStyle
			if selected {
				style = MovieCardSelectedStyle
			}

			rendered := lipgloss.JoinVertical(lipgloss.Left,
				MovieTitleStyle.Render(truncate(movie.Title, cardWidth-4)),
				MovieSubtitleStyle.Render(truncate(
					fmt.Sprintf("%d  %s", movie.Year, movie.Quality),
					cardWidth-4)),
			)
			row = append(row, style.Width(cardWidth).Height(cardHeight).Render(rendered))
		}
		b.WriteString(lipgloss.JoinHorizontal(lipgloss.Top, row...))
		b.WriteString("\n")
	}

	// Page navigation
	b.WriteString("\n")
	pageInfo := fmt.Sprintf("  Trang %d  ", m.homePage)
	prevLabel := " < Trang trước"
	nextLabel := "Trang sau > "

	// Show prev button (disabled on page 1)
	if m.homePage > 1 {
		b.WriteString(HelpStyle.Render(fmt.Sprintf("  [p] %s", prevLabel)))
	} else {
		b.WriteString(HelpStyle.Render(fmt.Sprintf("     %s", strings.Repeat(" ", len(prevLabel)+5))))
	}

	b.WriteString(PageNumberStyle.Render(pageInfo))

	b.WriteString(HelpStyle.Render(fmt.Sprintf("  [n] %s", nextLabel)))
	b.WriteString("\n")

	return b.String()
}
