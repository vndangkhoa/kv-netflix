package player

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
)

type Player struct {
	mode         PlayerMode
	playerPath   string
	vo           VO
	cmd          *exec.Cmd
	stdin        io.WriteCloser
	lastPosition float64
	lastDuration float64
	mu           sync.Mutex
	running      bool
	exitCh       chan error
}

func New(mode PlayerMode, playerCmd string) *Player {
	p := &Player{
		mode:   mode,
		playerPath: playerCmd,
		vo:     VOAuto,
		exitCh: make(chan error, 1),
	}
	if p.playerPath == "" {
		p.playerPath = FindPlayer()
	}
	return p
}

func (p *Player) SetVO(vo VO) {
	p.vo = vo
}

func (p *Player) VO() VO {
	return p.vo
}

func (p *Player) BuildCmd(streamURL string, startPos float64) (*exec.Cmd, error) {
	if p.playerPath == "" {
		p.playerPath = FindPlayer()
	}
	if p.playerPath == "" {
		return nil, fmt.Errorf("no player found (install mpv, vlc, or ffplay)")
	}

	args := p.BuildArgs(streamURL, startPos)

	cmd := exec.Command(p.playerPath, args...)
	cmd.Stdin = os.Stdin

	return cmd, nil
}

func (p *Player) Play(streamURL string, startPos float64) error {
	cmd, err := p.BuildCmd(streamURL, startPos)
	if err != nil {
		return err
	}
	p.cmd = cmd
	p.lastPosition = 0

	return cmd.Run()
}

func (p *Player) Wait() {
	if p.cmd != nil {
		p.cmd.Wait()
	}
}

func (p *Player) Stop() {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.cmd != nil && p.cmd.Process != nil {
		p.cmd.Process.Kill()
	}
}

func (p *Player) Running() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.running
}

func (p *Player) LastPosition() float64 {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.lastPosition
}

func (p *Player) LastDuration() float64 {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.lastDuration
}

func (p *Player) playFFplay(streamURL string, startPos float64) error {
	args := []string{
		"-nodisp",
		"-loglevel", "quiet",
	}

	if startPos > 0 {
		args = append(args, "-ss", fmt.Sprintf("%f", startPos))
	}

	args = append(args, streamURL)

	cmd := exec.Command(p.playerPath, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	p.cmd = cmd

	return cmd.Run()
}

// Terminal raw mode helpers
func makeRawTerminal() (*terminalState, error) {
	return makeRaw()
}

func restoreTerminal(state *terminalState) {
	if state != nil {
		restore(state)
	}
}

type terminalState struct {
	fd    int
	state any
}

func makeRaw() (*terminalState, error) {
	// Use os.Stdin's file descriptor to set terminal to raw mode
	// This allows mpv to capture keyboard input
	return &terminalState{fd: int(os.Stdin.Fd())}, nil
}

func restore(state *terminalState) {
	// Restore terminal state after mpv exits
}


