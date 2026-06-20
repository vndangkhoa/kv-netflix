package api

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"streamflow-backend/internal/database"
	"streamflow-backend/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte("streamflow-secret-key-change-in-production")

type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func generateToken(user *models.User) (string, error) {
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func generateDeviceCode() string {
	return strconv.Itoa(100000 + rand.Intn(900000))
}

// ── Register ────────────────────────────────────────────────────────

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email and password are required", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	// Check if user already exists
	var existing models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		http.Error(w, "Email already registered", http.StatusConflict)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	user := &models.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		Name:         req.Name,
	}

	if err := database.DB.Create(user).Error; err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	token, err := generateToken(user)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

// ── Login ───────────────────────────────────────────────────────────

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	token, err := generateToken(&user)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

// ── Get Current User ────────────────────────────────────────────────

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// ── Device Pairing: Generate Code ──────────────────────────────────

func (h *Handler) GenerateDeviceCode(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DeviceName string `json:"device_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.DeviceName = "Unknown Device"
	}

	code := generateDeviceCode()
	device := &models.Device{
		Code:      code,
		Name:      req.DeviceName,
		IsPaired:  false,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}

	if err := database.DB.Create(device).Error; err != nil {
		http.Error(w, "Failed to generate code", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"code":      code,
		"expires_at": device.ExpiresAt,
	})
}

// ── Device Pairing: Verify Code (called from PC) ──────────────────

type PairDeviceRequest struct {
	Code string `json:"code"`
}

func (h *Handler) PairDevice(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req PairDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var device models.Device
	if err := database.DB.Where("code = ? AND is_paired = false", req.Code).First(&device).Error; err != nil {
		http.Error(w, "Invalid or expired code", http.StatusBadRequest)
		return
	}

	if time.Now().After(device.ExpiresAt) {
		database.DB.Delete(&device)
		http.Error(w, "Code has expired", http.StatusBadRequest)
		return
	}

	device.UserID = userID
	device.IsPaired = true
	database.DB.Save(&device)

	// Generate token for the paired device
	token, err := generateToken(&models.User{ID: userID})
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token":  token,
		"device": device,
	})
}

// ── Device Pairing: Check Status (called from Android polling) ────

func (h *Handler) CheckDeviceStatus(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Code is required", http.StatusBadRequest)
		return
	}

	var device models.Device
	if err := database.DB.Where("code = ?", code).First(&device).Error; err != nil {
		http.Error(w, "Device not found", http.StatusNotFound)
		return
	}

	if time.Now().After(device.ExpiresAt) {
		database.DB.Delete(&device)
		http.Error(w, "Code has expired", http.StatusGone)
		return
	}

	if !device.IsPaired {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "waiting",
		})
		return
	}

	// Device was paired — generate token
	token, err := generateToken(&models.User{ID: device.UserID})
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "paired",
		"token":  token,
	})
}

// ── Generate Link Code (logged-in user shows code for other device) ──

func (h *Handler) GenerateLinkCode(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	// Invalidate any existing unused link codes for this user
	database.DB.Where("user_id = ? AND is_paired = false AND name = ?", userID, "link-code").Delete(&models.Device{})

	code := generateDeviceCode()
	device := &models.Device{
		Code:      code,
		Name:      "link-code",
		UserID:    userID,
		IsPaired:  false,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}

	if err := database.DB.Create(device).Error; err != nil {
		http.Error(w, "Failed to generate code", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"code":       code,
		"expires_at": device.ExpiresAt,
	})
}

// ── Login With Code (non-logged-in device enters code) ────────────────

type LoginWithCodeRequest struct {
	Code string `json:"code"`
}

func (h *Handler) LoginWithCode(w http.ResponseWriter, r *http.Request) {
	var req LoginWithCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Code == "" {
		http.Error(w, "Code is required", http.StatusBadRequest)
		return
	}

	var device models.Device
	if err := database.DB.Where("code = ? AND name = ? AND is_paired = false", req.Code, "link-code").First(&device).Error; err != nil {
		http.Error(w, "Invalid or expired code", http.StatusBadRequest)
		return
	}

	if time.Now().After(device.ExpiresAt) {
		database.DB.Delete(&device)
		http.Error(w, "Code has expired", http.StatusBadRequest)
		return
	}

	// Mark as paired (consumed)
	device.IsPaired = true
	database.DB.Save(&device)

	token, err := generateToken(&models.User{ID: device.UserID})
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	var user models.User
	database.DB.First(&user, device.UserID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": token,
		"user":  user,
	})
}
