package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"

	tea "github.com/charmbracelet/bubbletea"

	"kv-netflix-tui/internal/api"
	"kv-netflix-tui/internal/config"
	"kv-netflix-tui/internal/tui"
)

func main() {
	var (
		serverURL  string
		playerMode string
		playerCmd  string
		terminalVO string
		poster     bool
		insecure   bool
		showHelp   bool
	)

	flag.StringVar(&serverURL, "server", "", "Backend server URL")
	flag.StringVar(&playerMode, "mode", "", "Player mode: passthrough or embedded")
	flag.StringVar(&playerCmd, "player", "", "Player binary: mpv, vlc, ffplay")
	flag.StringVar(&terminalVO, "vo", "", "Video output: auto, kitty, sixel, tct, window")
	flag.BoolVar(&poster, "poster", false, "Show movie poster images (requires sixel/kitty)")
	flag.BoolVar(&insecure, "insecure", false, "Skip TLS certificate verification")
	flag.BoolVar(&showHelp, "help", false, "Show help")
	flag.Parse()

	if showHelp {
		fmt.Println("KV-Netflix TUI — Terminal movie browser and player")
		fmt.Println()
		fmt.Println("Usage: kv-netflix-tui [flags]")
		fmt.Println()
		fmt.Println("Flags:")
		flag.PrintDefaults()
		fmt.Println()
		fmt.Println("Config file: ~/.config/kv-netflix-tui/config.json")
		fmt.Println()
		fmt.Println("Modes:")
		fmt.Println("  passthrough  (default) mpv takes over terminal — real video")
		fmt.Println("  embedded     mpv in background, styled TUI player view")
		fmt.Println()
		fmt.Println("Player detection (auto): mpv → vlc → ffplay")
		fmt.Println()
		fmt.Println("Video output (--vo):")
		fmt.Println("  auto     (default) kitty → sixel → tct")
		fmt.Println("  kitty    highest quality, kitty terminal only")
		fmt.Println("  sixel    pixel graphics, many modern terminals")
		fmt.Println("  tct      ASCII art, works everywhere")
		fmt.Println("  window   separate GUI window (full resolution)")
		fmt.Println()
		fmt.Println("Kitty auto-wrap:")
		fmt.Println("  When launched from a non-Kitty terminal, the TUI")
		fmt.Println("  automatically opens inside Kitty for full-quality")
		fmt.Println("  video output. Install kitty and just run normally.")
		fmt.Println()
		fmt.Println("Examples:")
		fmt.Println("  kv-netflix-tui")
		fmt.Println("  kv-netflix-tui --server https://nf.khoavo.myds.me")
		fmt.Println("  kv-netflix-tui --mode=embedded --poster")
		fmt.Println("  kv-netflix-tui --vo=kitty")
		os.Exit(0)
	}

	// Auto-launch inside Kitty for full-res in-terminal video.
	if os.Getenv("KITTY_WINDOW_ID") == "" && os.Getenv("KV_KITTY_WRAPPED") == "" {
		if kittyPath, err := exec.LookPath("kitty"); err == nil {
			wrapArgs := append([]string{"-e", os.Args[0]}, os.Args[1:]...)
			cmd := exec.Command(kittyPath, wrapArgs...)
			cmd.Stdin = os.Stdin
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			cmd.Env = append(os.Environ(), "KV_KITTY_WRAPPED=1")
			cmd.Run()
			os.Exit(0)
		}
	}

	cfg := config.Load()

	if serverURL != "" {
		cfg.ServerURL = serverURL
	}
	if playerMode != "" {
		cfg.PlayerMode = config.PlayerMode(playerMode)
	}
	if playerCmd != "" {
		cfg.PlayerCmd = playerCmd
	}
	// Apply --vo flag if provided; otherwise use saved PreferredVO.
	if terminalVO != "" {
		cfg.TerminalVO = terminalVO
		cfg.PreferredVO = terminalVO // remember for next launch
	} else if cfg.PreferredVO != "" {
		cfg.TerminalVO = cfg.PreferredVO
	} else {
		cfg.TerminalVO = "" // auto-detect
	}

	if poster {
		cfg.ShowPoster = poster
	}
	if insecure {
		cfg.Insecure = insecure
	}

	cfg.PreferredVO = cfg.TerminalVO // persist chosen VO
	cfg.Save()

	if token := cfg.LoadToken(); token != "" {
		// Token will be set on the client after creation
	}

	m := tui.NewModel(cfg, api.New(cfg.ServerURL, cfg.Insecure))
	if token := cfg.LoadToken(); token != "" {
		m.SetClientToken(token)
	}

	p := tea.NewProgram(m, tea.WithAltScreen())

	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
