package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type PlayerMode string

const (
	ModePassthrough PlayerMode = "passthrough"
	ModeEmbedded    PlayerMode = "embedded"
)

type Config struct {
	ServerURL   string     `json:"server_url"`
	PlayerMode  PlayerMode `json:"player_mode"`
	PlayerCmd   string     `json:"player_cmd"`
	TerminalVO  string     `json:"terminal_vo"`
	PreferredVO string     `json:"preferred_vo"`
	ShowPoster  bool       `json:"show_poster"`
	Language    string     `json:"language"`
	Insecure    bool       `json:"insecure"`
	Token       string     `json:"token,omitempty"`
}

func Default() *Config {
	return &Config{
		ServerURL:   "http://localhost:3478",
		PlayerMode:  ModePassthrough,
		PlayerCmd:   "mpv",
		PreferredVO: "window",
		ShowPoster:  false,
		Language:    "en",
		Insecure:    false,
	}
}

func configDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("home dir: %w", err)
	}
	dir := filepath.Join(home, ".config", "kv-netflix-tui")
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("mkdir config: %w", err)
	}
	return dir, nil
}

func configPath() (string, error) {
	dir, err := configDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "config.json"), nil
}

func tokenPath() (string, error) {
	dir, err := configDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "token"), nil
}

func Load() *Config {
	cfg := Default()
	path, err := configPath()
	if err != nil {
		return cfg
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return cfg
	}
	json.Unmarshal(data, cfg)
	return cfg
}

func (c *Config) Save() error {
	path, err := configPath()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}
	return os.WriteFile(path, data, 0644)
}

func (c *Config) SaveToken(token string) error {
	c.Token = token
	path, err := tokenPath()
	if err != nil {
		return err
	}
	return os.WriteFile(path, []byte(token), 0600)
}

func (c *Config) LoadToken() string {
	if c.Token != "" {
		return c.Token
	}
	path, err := tokenPath()
	if err != nil {
		return ""
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	c.Token = string(data)
	return c.Token
}

func (c *Config) ClearToken() error {
	c.Token = ""
	path, err := tokenPath()
	if err != nil {
		return err
	}
	os.Remove(path)
	return c.Save()
}
