package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type sidebarItem struct {
	label string
	view  View
	tab   int
}

var sidebarItems = []sidebarItem{
	{label: "1  Home",    view: ViewHome,   tab: -1},
	{label: "2  Search",  view: ViewSearch, tab: -1},
	{label: "3  My List", view: ViewMyList, tab: 0},
	{label: "4  History", view: ViewMyList, tab: 1},
	{label: "5  Account", view: ViewAuth,   tab: -1},
}

func (m *model) sidebarView() string {
	var b strings.Builder

	title := lipgloss.NewStyle().
		Background(lipgloss.Color("#1A1A2E")).
		Foreground(AccentColor).
		Bold(true).
		Padding(0, 2).
		Width(SidebarWidth - 2).
		Render("  NAV")

	b.WriteString(title)
	b.WriteString("\n")
	b.WriteString(SidebarSepStyle.Render(strings.Repeat("-", SidebarWidth-2)))
	b.WriteString("\n")

	for _, item := range sidebarItems {
		active := false

		switch item.view {
		case ViewMyList:
			active = m.currentView == ViewMyList && m.mylistTab == item.tab
		default:
			active = m.currentView == item.view
		}

		var style lipgloss.Style
		if active && m.sidebarFocused {
			style = SidebarFocusedStyle
		} else if active {
			style = SidebarActiveStyle
		} else {
			style = SidebarItemStyle
		}

		prefix := "  "
		if active {
			prefix = " >"
		}

		entry := prefix + " " + item.label
		b.WriteString(style.Render(entry))
		b.WriteString("\n")
	}

	b.WriteString(SidebarSepStyle.Render(strings.Repeat("-", SidebarWidth-2)))
	b.WriteString("\n")

	help := lipgloss.NewStyle().
		Background(lipgloss.Color("#1A1A2E")).
		Foreground(lipgloss.Color("#555555")).
		Padding(0, 2).
		Width(SidebarWidth - 2)

	if m.sidebarFocused {
		b.WriteString(help.Render("  [↑/↓]  move"))
		b.WriteString("\n")
		b.WriteString(help.Render("  [Enter] select"))
		b.WriteString("\n")
		b.WriteString(help.Render("  [Tab]  to main"))
		b.WriteString("\n")
	} else {
		b.WriteString(help.Render("  [Tab]  sidebar"))
		b.WriteString("\n")
		b.WriteString(help.Render("  [Esc]  sidebar"))
		b.WriteString("\n")
		b.WriteString(help.Render("  [1-5]  jump"))
		b.WriteString("\n")
	}

	// Preview info for hovered movie on home/detail
	preview := m.sidebarPreview
	if preview == nil && m.currentMovie != nil {
		preview = m.currentMovie
	}
	if preview != nil {
		b.WriteString("\n")
		b.WriteString(SidebarSepStyle.Render(strings.Repeat("-", SidebarWidth-2)))
		b.WriteString("\n")

		style := lipgloss.NewStyle().
			Background(lipgloss.Color("#1A1A2E")).
			Foreground(lipgloss.Color("#FFFFFF")).
			Bold(true).
			Padding(0, 2).
			Width(SidebarWidth - 2)
		info := fmt.Sprintf("  %s", truncate(preview.Title, 16))
		b.WriteString(style.Render(info))
		b.WriteString("\n")
		sub := lipgloss.NewStyle().
			Background(lipgloss.Color("#1A1A2E")).
			Foreground(DimColor).
			Padding(0, 2).
			Width(SidebarWidth - 2)
		b.WriteString(sub.Render(fmt.Sprintf("  %d  %s", preview.Year, preview.Quality)))
		b.WriteString("\n")
	}

	return SidebarStyle.Render(b.String())
}

func (m *model) handleSidebarKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "j", "down":
		if m.sidebarIdx < len(sidebarItems)-1 {
			m.sidebarIdx++
		}
	case "k", "up":
		if m.sidebarIdx > 0 {
			m.sidebarIdx--
		}
	case "enter", " ":
		return m.activateSidebarItem()
	case "tab", "l":
		m.sidebarFocused = false
		return m, nil
	}
	return m, nil
}

func (m *model) activateSidebarItem() (tea.Model, tea.Cmd) {
	item := sidebarItems[m.sidebarIdx]
	m.currentView = item.view
	m.sidebarFocused = false

	switch item.view {
	case ViewMyList:
		m.mylistTab = item.tab
		m.mylistCursor = 0
		return m, m.loadMyList()
	case ViewHome:
		m.homeCursor = 0
		m.homeSection = 1
		m.homePage = 1
		return m, nil
	case ViewSearch:
		m.searchActive = true
		m.searchInput = ""
		m.searchCursor = 0
		m.searchResults = nil
		return m, nil
	case ViewAuth:
		return m, nil
	}

	return m, nil
}
