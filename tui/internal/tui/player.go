package tui

import (
	"fmt"
	"os"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"kv-netflix-tui/internal/models"
	"kv-netflix-tui/internal/player"
)

func (m *model) launchPlayer() tea.Cmd {
	p := player.New(player.PlayerMode(m.config.PlayerMode), m.config.PlayerCmd)

	switch m.playerVO {
	case "kitty", "sixel":
		p.SetVO(player.VO(m.playerVO))
	case "tct":
		p.SetVO(player.VOTct)
	case "window":
		p.SetVO(player.VOWindow)
	default:
		p.DetectVO()
	}

	streamURL := m.playerStreamURL
	if streamURL == "" {
		return func() tea.Msg {
			return errMsg{err: fmt.Errorf("no stream URL available")}
		}
	}

	cmd, err := p.BuildCmd(streamURL, 0)
	if err != nil {
		return func() tea.Msg {
			return errMsg{err: err}
		}
	}

	return tea.ExecProcess(cmd, func(err error) tea.Msg {
		os.Stdout.WriteString("\033_Ga=d\033\\")
		if err != nil {
			return errMsg{err: fmt.Errorf("mpv: %w", err)}
		}
		return playbackDoneMsg{}
	})
}

func (m *model) saveInitialWatchHistory() tea.Cmd {
	if m.currentMovie == nil || m.client.Token() == "" {
		return nil
	}
	m.playbackStartTime = time.Now()
	req := models.UpdateProgressRequest{
		MovieID:         m.currentMovie.ID,
		Slug:            m.currentMovie.Slug,
		Title:           m.currentMovie.Title,
		Thumbnail:       m.currentMovie.Thumbnail,
		Backdrop:        m.currentMovie.Backdrop,
		Year:            m.currentMovie.Year,
		Category:        m.currentMovie.Category,
		Genre:           m.currentMovie.Genre,
		Country:         m.currentMovie.Country,
		Quality:         m.currentMovie.Quality,
		CurrentEpisode:  m.detailEpCursor + 1,
		WatchedTimestamp: int(time.Now().Unix()),
		Duration:        m.currentMovie.Duration,
		Progress:        0.01,
	}
	return func() tea.Msg {
		m.client.UpdateProgress(req)
		return nil
	}
}

func (m *model) playerView() string {
	width := m.width - 4

	title := PlayerInfoStyle.Render(m.playerInfo)
	sub := PlayerSubInfoStyle.Render(m.playerSubInfo)
	playing := SpinnerStyle.Render("▶ PLAYING")

	barWidth := width - 4
	if barWidth < 40 {
		barWidth = 40
	}
	sep := "  "
	controls := lipgloss.NewStyle().
		Width(barWidth).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(DimColor).
		Padding(0, 1).
		Render(lipgloss.JoinHorizontal(lipgloss.Center,
			HelpStyle.Render("Space"),
			DimText.Render("Play/Pause"),
			sep,
			HelpStyle.Render("← →"),
			DimText.Render("Seek"),
			sep,
			HelpStyle.Render("9 0"),
			DimText.Render("Volume"),
			sep,
			HelpStyle.Render("q"),
			DimText.Render("Quit"),
		))

	voInfo := DimText.Render("Terminal: " + string(m.playerVO))

	content := lipgloss.JoinVertical(lipgloss.Center,
		"",
		title,
		sub,
		"",
		playing,
		"",
		controls,
		"",
		voInfo,
	)

	box := lipgloss.NewStyle().
		Width(width).
		Height(m.height - 6).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(AccentColor).
		Align(lipgloss.Center).
		Render(content)

	return box
}

func (m *model) saveWatchHistory() tea.Cmd {
	if m.currentMovie == nil || m.client.Token() == "" {
		return nil
	}
	elapsed := time.Since(m.playbackStartTime).Seconds()
	duration := float64(m.currentMovie.Duration)
	progress := elapsed / duration
	if progress > 0.95 {
		progress = 0.95
	}
	if progress < 0.01 {
		progress = 0.01
	}
	req := models.UpdateProgressRequest{
		MovieID:          m.currentMovie.ID,
		Slug:             m.currentMovie.Slug,
		Title:            m.currentMovie.Title,
		Thumbnail:        m.currentMovie.Thumbnail,
		Backdrop:         m.currentMovie.Backdrop,
		Year:             m.currentMovie.Year,
		Category:         m.currentMovie.Category,
		Genre:            m.currentMovie.Genre,
		Country:          m.currentMovie.Country,
		Quality:          m.currentMovie.Quality,
		CurrentEpisode:   m.detailEpCursor + 1,
		WatchedTimestamp: int(time.Now().Unix()),
		Duration:         m.currentMovie.Duration,
		Progress:         progress,
	}
	return func() tea.Msg {
		if err := m.client.UpdateProgress(req); err != nil {
			return errMsg{err: fmt.Errorf("save history: %w", err)}
		}
		return nil
	}
}
