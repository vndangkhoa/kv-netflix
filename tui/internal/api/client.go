package api

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"kv-netflix-tui/internal/models"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
	token      string
}

func New(baseURL string, insecure bool) *Client {
	baseURL = strings.TrimRight(baseURL, "/")
	tr := &http.Transport{}
	if insecure {
		tr.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	}
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Transport: tr,
			Timeout:   60 * time.Second,
		},
	}
}

func (c *Client) SetToken(token string) {
	c.token = token
}

func (c *Client) Token() string {
	return c.token
}

func (c *Client) url(path string) string {
	return c.baseURL + "/api" + path
}

func (c *Client) do(req *http.Request) (*http.Response, error) {
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	req.Header.Set("User-Agent", "kv-netflix-tui/1.0")
	req.Header.Set("Accept", "application/json")
	return c.httpClient.Do(req)
}

func (c *Client) get(path string, query url.Values) (*http.Response, error) {
	u := c.url(path)
	if len(query) > 0 {
		u += "?" + query.Encode()
	}
	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return nil, err
	}
	return c.do(req)
}

func (c *Client) post(path string, body interface{}) (*http.Response, error) {
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			return nil, err
		}
	}
	req, err := http.NewRequest("POST", c.url(path), &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	return c.do(req)
}

func (c *Client) del(path string, query url.Values) (*http.Response, error) {
	u := c.url(path)
	if len(query) > 0 {
		u += "?" + query.Encode()
	}
	req, err := http.NewRequest("DELETE", u, nil)
	if err != nil {
		return nil, err
	}
	return c.do(req)
}

func decode[T any](resp *http.Response) (*T, error) {
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var v T
	if err := json.NewDecoder(resp.Body).Decode(&v); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	return &v, nil
}

func decodeSlice[T any](resp *http.Response) ([]T, error) {
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var v []T
	if err := json.NewDecoder(resp.Body).Decode(&v); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	return v, nil
}

func (c *Client) Home(category string, page int) ([]models.RophimMovie, error) {
	q := url.Values{}
	if category != "" {
		q.Set("category", category)
	}
	q.Set("page", strconv.Itoa(page))
	resp, err := c.get("/videos/home", q)
	if err != nil {
		return nil, err
	}
	return decodeSlice[models.RophimMovie](resp)
}

func (c *Client) Search(query string, page int) ([]models.RophimMovie, error) {
	q := url.Values{}
	q.Set("q", query)
	q.Set("page", strconv.Itoa(page))
	resp, err := c.get("/videos/search", q)
	if err != nil {
		return nil, err
	}
	return decodeSlice[models.RophimMovie](resp)
}

func (c *Client) Detail(slug string) (*models.RophimMovie, error) {
	resp, err := c.get("/videos/"+url.PathEscape(slug), nil)
	if err != nil {
		return nil, err
	}
	return decode[models.RophimMovie](resp)
}

func (c *Client) Extract(episodeURL string) (*models.VideoInfo, error) {
	resp, err := c.post("/extract", models.ExtractRequest{URL: episodeURL})
	if err != nil {
		return nil, err
	}
	return decode[models.VideoInfo](resp)
}

func (c *Client) Genres() ([]models.Category, error) {
	resp, err := c.get("/categories/genres", nil)
	if err != nil {
		return nil, err
	}
	return decodeSlice[models.Category](resp)
}

func (c *Client) Countries() ([]models.Category, error) {
	resp, err := c.get("/categories/countries", nil)
	if err != nil {
		return nil, err
	}
	return decodeSlice[models.Category](resp)
}

func (c *Client) Login(email, password string) (*models.AuthResponse, error) {
	resp, err := c.post("/auth/login", models.LoginRequest{Email: email, Password: password})
	if err != nil {
		return nil, err
	}
	return decode[models.AuthResponse](resp)
}

func (c *Client) Register(email, password, name string) (*models.AuthResponse, error) {
	resp, err := c.post("/auth/register", models.RegisterRequest{Email: email, Password: password, Name: name})
	if err != nil {
		return nil, err
	}
	return decode[models.AuthResponse](resp)
}

func (c *Client) Me() (*models.User, error) {
	resp, err := c.get("/auth/me", nil)
	if err != nil {
		return nil, err
	}
	return decode[models.User](resp)
}

func (c *Client) WatchHistory() ([]models.WatchHistory, error) {
	resp, err := c.get("/sync/watch-history", nil)
	if err != nil {
		return nil, err
	}
	return decodeSlice[models.WatchHistory](resp)
}

func (c *Client) UpdateProgress(req models.UpdateProgressRequest) error {
	resp, err := c.post("/sync/watch-history", req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("update progress: %d %s", resp.StatusCode, string(body))
	}
	return nil
}

func (c *Client) SavedMovies() ([]models.SavedMovie, error) {
	resp, err := c.get("/sync/saved-movies", nil)
	if err != nil {
		return nil, err
	}
	return decodeSlice[models.SavedMovie](resp)
}

func (c *Client) AddSavedMovie(req models.AddSavedMovieRequest) error {
	resp, err := c.post("/sync/saved-movies", req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("save movie: %d %s", resp.StatusCode, string(body))
	}
	return nil
}

func (c *Client) RemoveSavedMovie(movieID string) error {
	q := url.Values{}
	q.Set("movie_id", movieID)
	resp, err := c.del("/sync/saved-movies", q)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("remove saved movie: %d %s", resp.StatusCode, string(body))
	}
	return nil
}

func (c *Client) Explore(limit int) ([]models.RophimMovie, error) {
	q := url.Values{}
	q.Set("limit", strconv.Itoa(limit))
	resp, err := c.get("/videos/explore", q)
	if err != nil {
		return nil, err
	}
	return decodeSlice[models.RophimMovie](resp)
}

func (c *Client) BulkSync(movies []models.AddSavedMovieRequest, history []models.UpdateProgressRequest) error {
	resp, err := c.post("/sync/bulk", models.BulkSyncRequest{SavedMovies: movies, WatchHistory: history})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("bulk sync: %d %s", resp.StatusCode, string(body))
	}
	return nil
}

func (c *Client) DeviceCode() (*models.DeviceCodeResponse, error) {
	resp, err := c.post("/auth/device/code", nil)
	if err != nil {
		return nil, err
	}
	return decode[models.DeviceCodeResponse](resp)
}

func (c *Client) DeviceStatus(code string) (*models.DeviceStatusResponse, error) {
	q := url.Values{}
	q.Set("code", code)
	resp, err := c.get("/auth/device/status", q)
	if err != nil {
		return nil, err
	}
	return decode[models.DeviceStatusResponse](resp)
}

func (c *Client) LinkLogin(code string) (*models.AuthResponse, error) {
	resp, err := c.post("/auth/device/link-login", map[string]string{"code": code})
	if err != nil {
		return nil, err
	}
	return decode[models.AuthResponse](resp)
}

func (c *Client) Devices() ([]map[string]interface{}, error) {
	resp, err := c.get("/account/devices", nil)
	if err != nil {
		return nil, err
	}
	return decodeSlice[map[string]interface{}](resp)
}

func (c *Client) RemoveDevice(deviceID uint) error {
	resp, err := c.del("/account/devices", url.Values{"id": []string{strconv.FormatUint(uint64(deviceID), 10)}})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("remove device: %d %s", resp.StatusCode, string(body))
	}
	return nil
}

func (c *Client) ChangePassword(oldPwd, newPwd string) error {
	resp, err := c.post("/account/change-password", map[string]string{"old_password": oldPwd, "new_password": newPwd})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("change password: %d %s", resp.StatusCode, string(body))
	}
	return nil
}
