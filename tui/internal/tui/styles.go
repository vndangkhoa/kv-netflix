package tui

import "github.com/charmbracelet/lipgloss"

var (
	// Colors
	AccentColor     = lipgloss.Color("#E50914")
	AccentDimColor  = lipgloss.Color("#B20710")
	BgColor         = lipgloss.Color("#141414")
	FgColor         = lipgloss.Color("#FFFFFF")
	DimColor        = lipgloss.Color("#808080")
	MutedColor      = lipgloss.Color("#555555")
	SuccessColor    = lipgloss.Color("#46D369")
	WarningColor    = lipgloss.Color("#E5A00D")
	BorderColor     = lipgloss.Color("#333333")
	SelectedBgColor = lipgloss.Color("#333333")
	CardBgColor     = lipgloss.Color("#1A1A1A")

	// Layout
	DocStyle = lipgloss.NewStyle().
		Padding(0, 1)

	AppStyle = lipgloss.NewStyle().
		Background(BgColor).
		Foreground(FgColor)

	HeaderStyle = lipgloss.NewStyle().
		Background(AccentColor).
		Foreground(lipgloss.Color("#FFFFFF")).
		Bold(true).
		Padding(0, 1)

	HeaderTitleStyle = lipgloss.NewStyle().
		Background(AccentColor).
		Foreground(lipgloss.Color("#FFFFFF")).
		Bold(true).
		Padding(0, 1)

	TabStyle = lipgloss.NewStyle().
		Padding(0, 2).
		Foreground(DimColor)

	TabActiveStyle = lipgloss.NewStyle().
		Padding(0, 2).
		Foreground(lipgloss.Color("#FFFFFF")).
		Bold(true).
		Underline(true)

	HelpStyle = lipgloss.NewStyle().
		Foreground(MutedColor).
		Padding(0, 1)

	SectionStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#CCCCCC")).
		Bold(true).
		Padding(0, 1)

	MovieTitleStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#FFFFFF")).
		Bold(true)

	MovieSubtitleStyle = lipgloss.NewStyle().
		Foreground(DimColor)

	MovieCardStyle = lipgloss.NewStyle().
		Background(CardBgColor).
		Padding(0, 1).
		Margin(0, 1)

	MovieCardSelectedStyle = lipgloss.NewStyle().
		Background(SelectedBgColor).
		Padding(0, 1).
		Margin(0, 1).
		Border(lipgloss.RoundedBorder(), false, false, false, false).
		BorderForeground(AccentColor)

	ProgressBarEmpty = lipgloss.Color("#333333")
	ProgressBarFull  = AccentColor

	ErrorStyle = lipgloss.NewStyle().
		Foreground(AccentColor).
		Bold(true).
		Padding(0, 1)

	SuccessStyle = lipgloss.NewStyle().
		Foreground(SuccessColor).
		Bold(true).
		Padding(0, 1)

	LoadingStyle = lipgloss.NewStyle().
		Foreground(DimColor).
		Padding(0, 1)

	InfoStyle = lipgloss.NewStyle().
		Foreground(DimColor).
		Padding(0, 1)

	EpisodeListStyle = lipgloss.NewStyle().
		Padding(0, 1)

	EpisodeItemStyle = lipgloss.NewStyle().
		Padding(0, 1).
		Foreground(lipgloss.Color("#CCCCCC"))

	EpisodeSelectedStyle = lipgloss.NewStyle().
		Padding(0, 1).
		Background(AccentColor).
		Foreground(lipgloss.Color("#FFFFFF")).
		Bold(true)

	PlayerInfoStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#FFFFFF")).
		Bold(true).
		Align(lipgloss.Center)

	PlayerSubInfoStyle = lipgloss.NewStyle().
		Foreground(DimColor).
		Align(lipgloss.Center)

	SpinnerStyle = lipgloss.NewStyle().
		Foreground(AccentColor)

	PageNumberStyle = lipgloss.NewStyle().
		Foreground(AccentColor).
		Bold(true).
		Padding(0, 2)

	DimText = lipgloss.NewStyle().
		Foreground(DimColor).
		Padding(0, 1)

	// Sidebar
	SidebarWidth = 22

	SidebarStyle = lipgloss.NewStyle().
		Background(lipgloss.Color("#1A1A2E")).
		Foreground(lipgloss.Color("#CCCCCC")).
		Width(SidebarWidth)

	SidebarItemStyle = lipgloss.NewStyle().
		Background(lipgloss.Color("#1A1A2E")).
		Foreground(lipgloss.Color("#AAAAAA")).
		Padding(0, 2).
		Width(SidebarWidth - 2)

	SidebarActiveStyle = lipgloss.NewStyle().
		Background(lipgloss.Color("#E50914")).
		Foreground(lipgloss.Color("#FFFFFF")).
		Bold(true).
		Padding(0, 2).
		Width(SidebarWidth - 2)

	SidebarFocusedStyle = lipgloss.NewStyle().
		Background(lipgloss.Color("#2A2A4E")).
		Foreground(lipgloss.Color("#FFFFFF")).
		Padding(0, 2).
		Width(SidebarWidth - 2)

	SidebarSepStyle = lipgloss.NewStyle().
		Background(lipgloss.Color("#1A1A2E")).
		Foreground(lipgloss.Color("#333333")).
		Width(SidebarWidth)
)


