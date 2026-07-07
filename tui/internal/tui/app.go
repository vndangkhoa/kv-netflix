package tui

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/spinner"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"kv-netflix-tui/internal/api"
	"kv-netflix-tui/internal/config"
	"kv-netflix-tui/internal/models"
)

type View int

const (
	ViewHome View = iota
	ViewSearch
	ViewDetail
	ViewPlayer
	ViewAuth
	ViewMyList
	ViewServerSetup
)

type model struct {
	config *config.Config
	client *api.Client

	width  int
	height int
	contentWidth int // width minus sidebar

	currentView View
	previousView View
	err         error

	spinner spinner.Model
	loading bool
	loadingMsg string

	// Server setup view
	setupInput string

	// Home view
	homeMovies      []models.RophimMovie
	homeCategories  []string
	homeCategoryIdx int
	homeCursor      int
	homeCols        int
	homeSection     int // 0=continue watching, 1=saved, 2=grid
	homeContinue    []models.WatchHistory
	homeSaved       []models.SavedMovie
	homeGenres      []models.Category
	homePage        int

	// Search view
	searchInput    string
	searchResults  []models.RophimMovie
	searchCursor   int
	searchPage     int
	searchActive   bool

	// Detail view
	currentMovie   *models.RophimMovie
	detailCursor   int
	detailEpCursor int
	detailLoading  bool

	// Player view
	playerState       string
	playerInfo        string
	playerSubInfo     string
	playerStreamURL   string
	playerVO          string // "auto", "kitty", "sixel", "tct"
	playbackStartTime time.Time

	// Sidebar
	sidebarIdx       int
	sidebarFocused   bool
	sidebarPreview   *models.RophimMovie

	// Auth view
	authCode string

	// My List view
	mylistTab        int // 0=saved, 1=history, 2=account
	mylistCursor     int
	savedMovies      []models.SavedMovie
	watchHistory     []models.WatchHistory
	user             *models.User

	// Help
	showHelp bool

	// Dependency warnings
	missingDeps []string

	// Error overlay
	showErrorOverlay bool
	errorMessage     string
}

func NewModel(cfg *config.Config, cl *api.Client) *model {
	s := NewSpinner()

	return &model{
		config:          cfg,
		client:          cl,
		spinner:         s,
		width:           80,
		height:          24,
		currentView:     ViewHome,
		homeCategories:  []string{"", "phim-bo", "phim-le", "hoat-hinh"},
		homeCategoryIdx: 0,
		homePage:        1,
		homeSection:     2,
		homeCols:        3,
		searchPage:      1,
		detailEpCursor:  -1,
		playerVO:        cfg.TerminalVO,
		contentWidth:    60,
	}
}

func (m *model) SetClientToken(token string) {
	m.client.SetToken(token)
	m.config.Token = token
}

func (m *model) Init() tea.Cmd {
	m.checkDeps()
	return tea.Batch(
		m.spinner.Tick,
		m.loadHome(),
		m.loadContinue(),
	)
}

func (m *model) checkDeps() {
	var missing []string
	for _, name := range []string{"mpv", "yt-dlp"} {
		if _, err := exec.LookPath(name); err != nil {
			missing = append(missing, name)
		}
	}
	if len(missing) > 0 {
		m.missingDeps = missing
	}
}

func (m *model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.contentWidth = m.width - SidebarWidth - 2
		if m.contentWidth < 40 {
			m.contentWidth = 40
		}
		m.homeCols = (m.contentWidth - 4) / 30
		if m.homeCols < 1 {
			m.homeCols = 1
		}
		return m, nil

	case tea.KeyMsg:
		if m.showErrorOverlay {
			m.showErrorOverlay = false
			m.errorMessage = ""
			return m, nil
		}
		if m.showHelp {
			switch msg.String() {
			case "?", "h", "q", "esc":
				m.showHelp = false
			}
			return m, nil
		}

		if m.loading {
			return m, nil
		}

		switch msg.String() {
		case "q":
			if m.currentView != ViewPlayer {
				m.currentView = ViewHome
				m.sidebarFocused = false
				return m, nil
			}
		case "ctrl+c":
			return m, tea.Quit
		case "?":
			if m.currentView != ViewPlayer {
				m.showHelp = true
				return m, nil
			}
		case "tab":
			if m.sidebarFocused {
				m.sidebarFocused = false
				return m, nil
			}
			if m.currentView == ViewAuth {
				break
			}
			break
		case "esc":
			if m.currentView == ViewAuth {
				m.currentView = ViewHome
				m.sidebarFocused = false
				return m, nil
			}
			if m.currentView != ViewPlayer && !m.sidebarFocused {
				m.sidebarFocused = true
				return m, nil
			}
		case "1":
			if m.currentView == ViewAuth {
				break
			}
			m.sidebarFocused = false
			m.currentView = ViewHome
			return m, nil
		case "2":
			if m.currentView == ViewAuth {
				break
			}
			m.sidebarFocused = false
			m.currentView = ViewSearch
			return m, nil
		case "3":
			if m.currentView == ViewAuth {
				break
			}
			m.sidebarFocused = false
			m.currentView = ViewMyList
			m.mylistTab = 0
			return m, m.loadMyList()
		case "4":
			if m.currentView == ViewAuth {
				break
			}
			m.sidebarFocused = false
			m.currentView = ViewMyList
			m.mylistTab = 1
			return m, m.loadMyList()
		case "5":
			if m.currentView == ViewAuth {
				break
			}
			m.sidebarFocused = false
			m.currentView = ViewAuth
			m.err = nil
			m.authCode = ""
			return m, nil
		}

		if m.sidebarFocused && m.currentView != ViewPlayer {
			return m.handleSidebarKey(msg)
		}

		switch m.currentView {
		case ViewHome:
			return m.handleHomeKey(msg)
		case ViewSearch:
			return m.handleSearchKey(msg)
		case ViewDetail:
			return m.handleDetailKey(msg)
		case ViewPlayer:
			// mpv takes over via ExecProcess, no keys handled here
			return m, nil
		case ViewAuth:
			return m.handleAuthKey(msg)
		case ViewMyList:
			return m.handleMyListKey(msg)
		case ViewServerSetup:
			return m.handleSetupKey(msg)
		}

	case homeLoadedMsg:
		m.loading = false
		if msg.err != nil {
			m.err = msg.err
			return m, nil
		}
		m.err = nil
		m.homeMovies = msg.movies
		m.homeContinue = msg.continueWatching
		m.homeSaved = msg.savedMovies
		if msg.genres != nil {
			m.homeGenres = msg.genres
		}
		m.updatePreview()
		return m, nil

	case searchResultsMsg:
		m.loading = false
		if msg.err != nil {
			m.err = msg.err
			return m, nil
		}
		m.err = nil
		m.searchResults = msg.movies
		return m, nil

	case movieLoadedMsg:
		m.detailLoading = false
		m.loading = false
		if msg.err != nil {
			m.err = msg.err
			return m, nil
		}
		m.err = nil
		m.currentMovie = msg.movie
		m.sidebarPreview = msg.movie
		m.detailEpCursor = 0
		m.currentView = ViewDetail
		return m, nil

	case extractDoneMsg:
		m.loading = false
		if msg.err != nil {
			m.err = msg.err
			return m, nil
		}
		m.playerInfo = msg.info.Title
		m.playerSubInfo = msg.info.Resolution
		return m, tea.Batch(
			m.saveInitialWatchHistory(),
			m.launchPlayer(),
		)

	case authDoneMsg:
		m.loading = false
		if msg.err != nil {
			m.err = msg.err
			return m, nil
		}
		m.config.Token = msg.token
		m.config.SaveToken(msg.token)
		m.client.SetToken(msg.token)
		m.user = msg.user
		m.currentView = ViewHome
		m.loadContinue()
		return m, nil

	case myListLoadedMsg:
		m.loading = false
		if msg.err != nil {
			m.err = msg.err
			return m, nil
		}
		m.err = nil
		m.savedMovies = msg.saved
		m.watchHistory = msg.history
		m.currentView = ViewMyList
		return m, nil

	case saveDoneMsg:
		m.loading = false
		if msg.err != nil {
			m.err = msg.err
			return m, nil
		}
		m.err = nil
		return m, m.loadMyList()

	case playbackDoneMsg:
		m.loading = false
		return m, tea.Batch(
			m.saveWatchHistory(),
			func() tea.Msg {
				return goHomeAfterPlaybackMsg{}
			},
		)

	case goHomeAfterPlaybackMsg:
		m.currentView = ViewHome
		m.sidebarFocused = false
		return m, nil

	case spinner.TickMsg:
		var cmd tea.Cmd
		m.spinner, cmd = m.spinner.Update(msg)
		return m, cmd

	case errMsg:
		m.loading = false
		m.showErrorOverlay = true
		m.errorMessage = msg.err.Error()
		if m.currentView == ViewPlayer {
			m.currentView = ViewDetail
		}
		return m, nil
	}

	return m, nil
}

func (m *model) View() string {
	if m.showHelp {
		return m.helpView()
	}

	if m.currentView == ViewServerSetup {
		return m.serverSetupView()
	}

	header := m.headerView()

	var content string
	switch m.currentView {
	case ViewHome:
		content = m.homeView()
	case ViewSearch:
		content = m.searchView()
	case ViewDetail:
		content = m.detailView()
	case ViewPlayer:
		content = m.playerView()
	case ViewAuth:
		content = m.authView()
	case ViewMyList:
		content = m.myListView()
	default:
		content = "unknown view"
	}

	// Pad content to push footer to bottom of terminal
	contentLines := strings.Count(content, "\n") + 1
	availContentHeight := m.height - 2 // minus header and footer
	if contentLines < availContentHeight {
		content += strings.Repeat("\n", availContentHeight-contentLines)
	}

	footer := HelpFooter()
	if m.err != nil {
		footer = ErrorStyle.Render("✗ " + m.err.Error())
	}
	if len(m.missingDeps) > 0 && m.err == nil {
		deps := strings.Join(m.missingDeps, ", ")
		install := map[string]string{
			"darwin":  "brew install " + strings.Join(m.missingDeps, " "),
			"windows": "scoop install " + strings.Join(m.missingDeps, " ") + "  (or winget install)",
			"linux":   "apt install " + strings.Join(m.missingDeps, " ") + "  (or your distro's equivalent)",
		}
		cmd := install[runtime.GOOS]
		if cmd == "" {
			cmd = "install " + deps + " for your OS"
		}
		footer = WarningStyle.Render("⚠ " + deps + " not found — " + cmd)
	}

	mainBody := AppStyle.Render(
		lipgloss.JoinVertical(lipgloss.Left,
			header,
			content,
			footer,
		),
	)

	// Add sidebar (except in player view which is full-screen)
	if m.currentView != ViewPlayer {
		mainBody = lipgloss.JoinHorizontal(lipgloss.Top,
			m.sidebarView(),
			" ",
			mainBody,
		)
	}

	if m.showErrorOverlay {
		overlay := errorOverlay(m.errorMessage, m.width, m.height)
		mainBody = overlay
	}

	return mainBody
}

func (m *model) headerView() string {
	title := " KV-NETFLIX "
	status := ""
	if m.user != nil {
		status = fmt.Sprintf("🔒 %s", m.user.Name)
	} else if m.config.Token != "" {
		status = "🔒"
	} else {
		status = "🔓"
	}
	url := m.config.ServerURL

	left := HeaderTitleStyle.Render(title)
	right := lipgloss.NewStyle().
		Background(AccentColor).
		Foreground(lipgloss.Color("#FFFFFF")).
		Padding(0, 1).
		Render(fmt.Sprintf(" %s  %s ", url, status))

	spacing := m.width - lipgloss.Width(left) - lipgloss.Width(right)
	if spacing < 1 {
		spacing = 1
	}

	return HeaderStyle.Width(m.width).Render(
		lipgloss.JoinHorizontal(lipgloss.Top,
			left,
			strings.Repeat(" ", spacing),
			right,
		),
	)
}

func (m *model) helpView() string {
	lines := []string{
		"┌─ KV-NETFLIX TUI Help ──────────────────────────────",
		"│",
		"│  Navigation:",
		"│    ↑/k     Move cursor up",
		"│    ↓/j     Move cursor down",
		"│    ←/h     Previous page / back",
		"│    →/l     Next page",
		"│    Enter   Select / confirm",
		"│",
		"│  Views:",
		"│    1-5    Switch views via sidebar",
		"│    Tab    Toggle sidebar / content focus",
		"│    ←      Focus sidebar",
		"│    j/k    Navigate sidebar items",
		"│    /      Search movies",
		"│    m      My List (saved, history, account)",
		"│    b      Back to home",
		"│",
		"│  Detail / Ready:",
		"│    w      Toggle window/terminal video output",
		"│    s      Save/unsave movie",
		"│",
		"│  Player:",
		"│    Space  Play/Pause (passthrough = mpv)",
		"│    →/←    Seek +/-10s",
		"│    q      Quit player",
		"│",
		"│  General:",
		"│    ?      Toggle help",
		"│    q      Quit application",
		"│    Ctrl+C Force quit",
		"│",
		"└──────────────────────────────────────────────────",
		"",
		"  Press ?, q, or Esc to close help",
	}
	return lipgloss.JoinVertical(lipgloss.Left, lines...)
}

func (m *model) setLoading(msg string) tea.Cmd {
	m.loading = true
	m.loadingMsg = msg
	return nil
}

// Messages
type homeLoadedMsg struct {
	movies           []models.RophimMovie
	continueWatching []models.WatchHistory
	savedMovies      []models.SavedMovie
	genres           []models.Category
	err              error
}

type searchResultsMsg struct {
	movies []models.RophimMovie
	err    error
}

type movieLoadedMsg struct {
	movie *models.RophimMovie
	err   error
}

type extractDoneMsg struct {
	info *models.VideoInfo
	err  error
}

type authDoneMsg struct {
	token string
	user  *models.User
	err   error
}

type myListLoadedMsg struct {
	saved   []models.SavedMovie
	history []models.WatchHistory
	err     error
}

type saveDoneMsg struct {
	err error
}

type playbackDoneMsg struct{}
type goHomeAfterPlaybackMsg struct{}
type errMsg struct{ err error }

func (m *model) serverSetupView() string {
	var b strings.Builder
	b.WriteString("\n")
	b.WriteString(lipgloss.NewStyle().Bold(true).Padding(0, 1).Render("  ⚡ KV-NETFLIX TUI"))
	b.WriteString("\n\n")
	b.WriteString(InfoStyle.Render(fmt.Sprintf("  Can't reach backend at: %s", m.config.ServerURL)))
	b.WriteString("\n")
	b.WriteString(InfoStyle.Render("  Make sure the server is running (Docker or local)."))
	b.WriteString("\n\n")
	b.WriteString(fmt.Sprintf("  Enter server URL: [%s]", m.setupInput))
	if m.err != nil {
		b.WriteString(fmt.Sprintf("\n\n  %s", ErrorStyle.Render(m.err.Error())))
	}
	b.WriteString("\n\n")
	b.WriteString(HelpStyle.Render("  [Enter] connect  [Ctrl+C] quit"))
	return b.String()
}

func (m *model) handleSetupKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "enter":
		url := strings.TrimSpace(m.setupInput)
		if url == "" {
			url = m.config.ServerURL
		}
		m.config.ServerURL = url
		m.config.Save()
		m.client = api.New(url, m.config.Insecure)
		m.loading = true
		return m, m.loadHome()
	case "backspace":
		if len(m.setupInput) > 0 {
			m.setupInput = m.setupInput[:len(m.setupInput)-1]
		}
	case "ctrl+c":
		return m, tea.Quit
	default:
		if len(msg.String()) == 1 {
			m.setupInput += msg.String()
		}
	}
	return m, nil
}
