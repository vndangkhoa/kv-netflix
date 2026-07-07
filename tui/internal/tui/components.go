package tui

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/textinput"
	"github.com/charmbracelet/lipgloss"

	"kv-netflix-tui/internal/models"
)

func MovieCard(m models.RophimMovie, width int, selected bool) string {
	style := MovieCardStyle
	if selected {
		style = MovieCardSelectedStyle
	}
	title := m.Title
	if m.Quality != "" {
		title = fmt.Sprintf("%s  [%s]", title, m.Quality)
	}
	year := ""
	if m.Year > 0 {
		year = fmt.Sprintf("%d", m.Year)
	}
	rating := ""
	if m.Rating != "" {
		rating = fmt.Sprintf("★ %s", m.Rating)
	}
	info := strings.TrimSpace(strings.Join([]string{year, rating}, "  |  "))

	return style.Width(width-2).Render(
		lipgloss.JoinVertical(lipgloss.Left,
			MovieTitleStyle.Render(truncate(title, width-6)),
			MovieSubtitleStyle.Render(truncate(info, width-6)),
		),
	)
}

func SectionHeader(title string, width int) string {
	n := width - lipgloss.Width(title) - 4
	if n < 1 {
		n = 1
	}
	sep := strings.Repeat("─", n)
	return SectionStyle.Render(fmt.Sprintf(" %s %s ", title, sep))
}

func TabBar(tabs []string, active int) string {
	var items []string
	for i, t := range tabs {
		if i == active {
			items = append(items, TabActiveStyle.Render(t))
		} else {
			items = append(items, TabStyle.Render(t))
		}
	}
	return lipgloss.JoinHorizontal(lipgloss.Left, items...)
}

func HelpBar(items ...string) string {
	return HelpStyle.Render(strings.Join(items, "  ·  "))
}

func DurationStr(seconds int) string {
	h := seconds / 3600
	m := (seconds % 3600) / 60
	s := seconds % 60
	if h > 0 {
		return fmt.Sprintf("%d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%d:%02d", m, s)
}

func TimeAgo(unixTS int) string {
	d := time.Since(time.Unix(int64(unixTS), 0))
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		m := int(d.Minutes())
		return fmt.Sprintf("%dm ago", m)
	case d < 24*time.Hour:
		h := int(d.Hours())
		m := int(d.Minutes()) % 60
		return fmt.Sprintf("%dh %dm ago", h, m)
	default:
		days := int(d.Hours() / 24)
		return fmt.Sprintf("%dd ago", days)
	}
}

func ProgressLabel(progress float64) string {
	switch {
	case progress <= 0:
		return ""
	case progress < 0.05:
		return DimText.Render("Started")
	case progress < 0.50:
		return DimText.Render("In Progress")
	case progress < 0.90:
		return DimText.Render("Almost Done")
	default:
		// Not 100% to distinguish from actually finished
		return DimText.Render("Watched")
	}
}

func ProgressBarStr(width int, progress float64) string {
	if width < 2 {
		return ""
	}
	if progress < 0 {
		progress = 0
	}
	if progress > 1 {
		progress = 1
	}
	filled := int(float64(width) * progress)
	empty := width - filled

	bar := strings.Builder{}
	if filled > 0 {
		bar.WriteString(lipgloss.NewStyle().Foreground(AccentColor).Render(
			strings.Repeat("█", filled),
		))
	}
	if empty > 0 {
		bar.WriteString(lipgloss.NewStyle().Foreground(ProgressBarEmpty).Render(
			strings.Repeat("█", empty),
		))
	}
	return bar.String()
}

func plainBar(width int, progress float64) string {
	if width < 2 {
		return ""
	}
	if progress < 0 {
		progress = 0
	}
	if progress > 1 {
		progress = 1
	}
	filled := int(float64(width) * progress)
	empty := width - filled
	return strings.Repeat("=", filled) + strings.Repeat("-", empty)
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	if max < 3 {
		return s[:max]
	}
	return s[:max-2] + ".."
}

func NewSpinner() spinner.Model {
	s := spinner.New()
	s.Style = SpinnerStyle
	s.Spinner = spinner.Dot
	return s
}

func NewTextInput() textinput.Model {
	ti := textinput.New()
	ti.PromptStyle = lipgloss.NewStyle().Foreground(AccentColor)
	ti.TextStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#FFFFFF"))
	ti.PlaceholderStyle = lipgloss.NewStyle().Foreground(MutedColor)
	ti.Cursor.Style = lipgloss.NewStyle().Foreground(AccentColor)
	ti.CharLimit = 100
	return ti
}

func LoadingView(msg string) string {
	s := NewSpinner()
	return LoadingStyle.Render(s.View() + " " + msg)
}

func ErrorView(msg string) string {
	return ErrorStyle.Render("✗ " + msg)
}

func GenreBadge(genre string) string {
	return lipgloss.NewStyle().
		Foreground(lipgloss.Color("#CCCCCC")).
		Background(lipgloss.Color("#2A2A2A")).
		Padding(0, 1).
		Margin(0, 0, 0, 0).
		Render(genre)
}

func EpisodeItem(ep models.Episode, selected bool, width int) string {
	title := ep.Title
	if title == "" {
		title = fmt.Sprintf("Tập %d", ep.Number)
	}
	style := EpisodeItemStyle
	if selected {
		style = EpisodeSelectedStyle
	}
	prefix := "  "
	if selected {
		prefix = "▶ "
	}
	return style.Width(width - 2).Render(
		prefix + truncate(title, width-6),
	)
}

func HelpFooter() string {
	return HelpBar(
		"↑↓ navigate",
		"Enter select",
		"/ search",
		"n/p page",
		"Tab sidebar",
		"q home",
	)
}

func errorOverlay(msg string, width, height int) string {
	popupWidth := width - 10
	if popupWidth < 40 {
		popupWidth = 40
	}
	if popupWidth > 60 {
		popupWidth = 60
	}

	lines := strings.Split(msg, "\n")
	if len(lines) == 1 {
		lines = wrapText(msg, popupWidth-8)
	}

	popupContent := lipgloss.JoinVertical(lipgloss.Center,
		lipgloss.NewStyle().Bold(true).Foreground(AccentColor).Render("⚠ Error"),
		"",
	)
	for _, line := range lines {
		popupContent = lipgloss.JoinVertical(lipgloss.Center,
			popupContent,
			InfoStyle.Render(line),
		)
	}
	popupContent = lipgloss.JoinVertical(lipgloss.Center,
		popupContent,
		"",
		HelpStyle.Render("Press any key to dismiss"),
	)

	popup := lipgloss.NewStyle().
		Width(popupWidth).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(AccentColor).
		Align(lipgloss.Center).
		Render(popupContent)

	// Center on screen
	vPad := (height - strings.Count(popup, "\n") - 4) / 2
	if vPad < 0 {
		vPad = 0
	}
	hPad := (width - popupWidth) / 2
	if hPad < 0 {
		hPad = 0
	}

	return strings.Repeat("\n", vPad) +
		strings.Repeat(" ", hPad) + popup
}

func wrapText(s string, maxWidth int) []string {
	var result []string
	words := strings.Fields(s)
	if len(words) == 0 {
		return []string{s}
	}
	line := ""
	for _, word := range words {
		if len(line)+len(word)+1 > maxWidth {
			if line != "" {
				result = append(result, line)
			}
			line = word
		} else {
			if line != "" {
				line += " "
			}
			line += word
		}
	}
	if line != "" {
		result = append(result, line)
	}
	return result
}
