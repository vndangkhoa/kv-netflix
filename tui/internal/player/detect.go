package player

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

type VO string

const (
	VOKitty   VO = "kitty"
	VOSixel   VO = "sixel"
	VOTct     VO = "tct"
	VOAuto    VO = "auto"
	VONull    VO = "null"
	VOWindow  VO = "window"
)

var terminalVOs = []VO{VOKitty, VOSixel, VOTct}
var windowVOs = []VO{"gpu-next", "x11", "wayland", "gpu"}
var allVOs = []VO{VOKitty, VOSixel, VOTct, VOWindow}

func (v VO) IsTerminal() bool {
	for _, t := range terminalVOs {
		if v == t {
			return true
		}
	}
	return false
}

func (v VO) String() string {
	switch v {
	case VOKitty:
		return "kitty terminal (highest quality)"
	case VOSixel:
		return "sixel terminal (pixel graphics)"
	case VOTct:
		return "tct terminal (ASCII art)"
	case VOWindow:
		return "separate window (full resolution)"
	default:
		return string(v)
	}
}

type PlayerMode string

const (
	ModePassthrough PlayerMode = "passthrough"
	ModeEmbedded    PlayerMode = "embedded"
)

var availablePlayers []string

func init() {
	availablePlayers = detectPlayers()
}

func detectPlayers() []string {
	var found []string
	for _, name := range []string{"mpv", "vlc", "ffplay"} {
		if p, err := exec.LookPath(name); err == nil {
			found = append(found, p)
		}
	}
	return found
}

func FindPlayer() string {
	if len(availablePlayers) > 0 {
		return availablePlayers[0]
	}
	return ""
}

func HasPlayer(name string) bool {
	for _, p := range availablePlayers {
		if strings.HasSuffix(p, "/"+name) || strings.HasSuffix(p, "\\"+name) {
			return true
		}
	}
	return false
}

func DetectBestVO() VO {
	// kitty detection
	if os.Getenv("KITTY_WINDOW_ID") != "" {
		return VOKitty
	}

	// Check if terminal supports sixel via TERM
	term := os.Getenv("TERM")
	if strings.Contains(term, "sixel") || strings.Contains(term, "mlterm") {
		return VOSixel
	}

	// iTerm2 supports sixel
	if os.Getenv("TERM_PROGRAM") == "iTerm.app" {
		return VOSixel
	}

	// WezTerm supports sixel
	if os.Getenv("TERM_PROGRAM") == "WezTerm" {
		return VOSixel
	}

	// Check sixel by trying to query terminal
	if checkSixelSupport() {
		return VOSixel
	}

	// Fallback to tct (ASCII art, works everywhere)
	return VOTct
}

func DetectWindowVO() string {
	for _, vo := range windowVOs {
		// Check if the VO driver exists in mpv's help
		cmd := exec.Command("mpv", "--vo=help")
		out, err := cmd.Output()
		if err != nil {
			continue
		}
		if strings.Contains(string(out), string(vo)) {
			return string(vo)
		}
	}
	// If mpv not found or no VO matched, return empty
	return ""
}

func checkSixelSupport() bool {
	term := os.Getenv("TERM")

	// VTE-based terminals (GNOME Terminal, Tilix, etc.) do NOT support sixel
	// regardless of what TERM says. Their VTE_VERSION env var reveals them.
	if os.Getenv("VTE_VERSION") != "" {
		return false
	}

	// Specific terminals known to support sixel
	sixelTerms := []string{
		"foot",
		"foot-extra",
		"contour",
		"mlterm",
	}
	for _, t := range sixelTerms {
		if term == t {
			return true
		}
	}

	// xterm and xterm-256color — only claim sixel support if XTERM_VERSION is set,
	// meaning real xterm (not a VTE/gnome-terminal pretending)
	if term == "xterm" || term == "xterm-256color" {
		if os.Getenv("XTERM_VERSION") != "" {
			return true
		}
	}

	// tmux and screen may pass-through sixel; trust COLORTERM as signal
	if term == "screen" || term == "screen-256color" || term == "tmux" || term == "tmux-256color" {
		if os.Getenv("COLORTERM") == "truecolor" || os.Getenv("COLORTERM") == "24bit" {
			return true
		}
	}

	return false
}

func (p *Player) DetectVO() {
	if p.vo == VOAuto || p.vo == "" {
		p.vo = DetectBestVO()
	}
}

func (p *Player) BuildArgs(streamURL string, startPos float64) []string {
	args := []string{}

	if p.mode == ModePassthrough {
		if p.vo == VOWindow {
			// Auto-select best window VO
			vo := DetectWindowVO()
			if vo != "" {
				args = append(args, fmt.Sprintf("--vo=%s", vo))
			}
		} else {
			args = append(args, fmt.Sprintf("--vo=%s", string(p.vo)))
		}
		args = append(args,
			"--ytdl=yes",
			"--no-config",
			"--no-resume-playback",
			"--profile=fast",
			"--hwdec=auto",
			"--framedrop=vo",
			"--really-quiet",
			"--vd-lavc-threads=4",
			"--vo-kitty-cols=80",
			"--vo-kitty-use-shm=yes",
			"--osd-level=3",
			"--osd-align-x=center",
			"--osd-align-y=bottom",
			"--osd-margin-y=25",
			"--osd-font-size=14",
			"--osd-msg3=  q=Quit  |  Space=Play/Pause  |  \u2190\u2192=Seek  |  9=Vol\u2212  0=Vol+  ",
		)
	} else {
		// Embedded mode: audio only, we render frames via libmpv
		args = append(args, "--vo=null", "--no-video")
	}

	// Set referrer for video streams
	args = append(args,
		"--referrer=https://phimmoichill.my/",
		"--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		"--http-header-fields=Origin: https://phimmoichill.my",
		"--hls-bitrate=max",
		"--cache=yes",
		"--cache-secs=60",
		"--cache-pause=no",
		"--demuxer-max-bytes=150M",
		"--demuxer-max-back-bytes=50M",
	)

	if startPos > 0 {
		args = append(args, fmt.Sprintf("--start=%f", startPos))
	}

	args = append(args, streamURL)

	return args
}
