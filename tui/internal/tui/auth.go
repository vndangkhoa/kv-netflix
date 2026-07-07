package tui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

func (m *model) handleAuthKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "enter":
		if m.authCode != "" {
			m.loading = true
			return m, m.doLinkLogin()
		}
	case "esc", "b":
		m.currentView = ViewHome
		return m, nil
	case "backspace":
		if len(m.authCode) > 0 {
			m.authCode = m.authCode[:len(m.authCode)-1]
		}
	default:
		s := msg.String()
		if len(s) == 1 && s[0] >= '0' && s[0] <= '9' {
			m.authCode += s
		} else if len(msg.Runes) > 0 {
			s = string(msg.Runes)
			for _, r := range s {
				if r >= '0' && r <= '9' {
					m.authCode += string(r)
				}
			}
		}
	}

	return m, nil
}

func (m *model) doLinkLogin() tea.Cmd {
	return func() tea.Msg {
		resp, err := m.client.LinkLogin(m.authCode)
		if err != nil {
			return authDoneMsg{err: err}
		}
		return authDoneMsg{token: resp.Token, user: &resp.User}
	}
}

func (m *model) authView() string {
	var b strings.Builder

	b.WriteString("\n")
	b.WriteString(lipgloss.NewStyle().Bold(true).Padding(0, 1).Render("  Link Device"))
	b.WriteString("\n\n")

	url := m.config.ServerURL
	b.WriteString(fmt.Sprintf("  Go to %s and log in to your\n",
		lipgloss.NewStyle().Foreground(AccentColor).Bold(true).Render(url)))
	b.WriteString("  account, then generate a pairing code.\n\n")

	codeLabel := "  Pairing Code: "
	codeVal := m.authCode
	codeVal += "█"
	b.WriteString(fmt.Sprintf("%s%s\n\n", codeLabel, codeVal))

	b.WriteString("  [Enter] Link Device  [Esc] back\n")

	if m.err != nil {
		b.WriteString(fmt.Sprintf("\n  %s\n", ErrorStyle.Render(m.err.Error())))
	}

	return b.String()
}
