package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"streamflow-backend/internal/database"
	"streamflow-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
)

// ── List Devices ──────────────────────────────────────────────────────

func (h *Handler) GetDevices(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var devices []models.Device
	database.DB.Where("user_id = ? AND is_paired = ?", userID, true).Find(&devices)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(devices)
}

// ── Remove Device ─────────────────────────────────────────────────────

type RemoveDeviceRequest struct {
	DeviceID uint `json:"device_id"`
}

func (h *Handler) RemoveDevice(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req RemoveDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	result := database.DB.Where("id = ? AND user_id = ?", req.DeviceID, userID).Delete(&models.Device{})
	if result.RowsAffected == 0 {
		http.Error(w, "Device not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// ── Change Password ──────────────────────────────────────────────────

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		http.Error(w, "Current and new password are required", http.StatusBadRequest)
		return
	}

	if len(req.NewPassword) < 6 {
		http.Error(w, "New password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		http.Error(w, "Current password is incorrect", http.StatusUnauthorized)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	database.DB.Model(&user).Update("password_hash", string(hash))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "password_changed"})
}

// ── Generate Recovery Key ─────────────────────────────────────────────

func generateRecoveryKey() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (h *Handler) GenerateRecoveryKey(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(uint)

	// Invalidate any existing unused keys
	database.DB.Where("user_id = ? AND used = ?", userID, false).Delete(&models.RecoveryKey{})

	key, err := generateRecoveryKey()
	if err != nil {
		http.Error(w, "Failed to generate key", http.StatusInternalServerError)
		return
	}

	// Format as XXXX-XXXX-XXXX-XXXX for readability
	formatted := key[:4] + "-" + key[4:8] + "-" + key[8:12] + "-" + key[12:]

	recoveryKey := &models.RecoveryKey{
		UserID: userID,
		Key:    key, // store raw key without dashes
	}

	if err := database.DB.Create(recoveryKey).Error; err != nil {
		http.Error(w, "Failed to save key", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"key":       formatted,
		"created_at": recoveryKey.CreatedAt,
	})
}

// ── Reset Password with Recovery Key (public, no auth) ────────────────

type ResetPasswordRequest struct {
	Key        string `json:"key"`
	NewPassword string `json:"new_password"`
}

func (h *Handler) ResetPasswordWithKey(w http.ResponseWriter, r *http.Request) {
	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Key == "" || req.NewPassword == "" {
		http.Error(w, "Key and new password are required", http.StatusBadRequest)
		return
	}

	if len(req.NewPassword) < 6 {
		http.Error(w, "Password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	// Remove dashes and normalize
	rawKey := ""
	for _, c := range req.Key {
		if c != '-' {
			rawKey += string(c)
		}
	}

	var recoveryKey models.RecoveryKey
	if err := database.DB.Where("key = ? AND used = ?", rawKey, false).First(&recoveryKey).Error; err != nil {
		http.Error(w, "Invalid or already used key", http.StatusBadRequest)
		return
	}

	// Mark key as used
	database.DB.Model(&recoveryKey).Update("used", true)

	// Hash new password and update user
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	database.DB.Model(&models.User{}).Where("id = ?", recoveryKey.UserID).Update("password_hash", string(hash))

	// Delete all devices for this user (force re-login on all devices)
	database.DB.Where("user_id = ?", recoveryKey.UserID).Delete(&models.Device{})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "password_reset"})
}
