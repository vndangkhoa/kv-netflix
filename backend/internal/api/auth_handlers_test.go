package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"streamflow-backend/internal/database"
	"streamflow-backend/internal/models"
)

func setupTestDB(t *testing.T) *Handler {
	t.Helper()
	testDBPath := "test_streamflow_" + t.Name() + ".db"
	_ = os.Remove(testDBPath)
	t.Cleanup(func() {
		_ = os.Remove(testDBPath)
	})

	database.InitDB(testDBPath)
	h := &Handler{
		JWTSecret: []byte("test-secret-key-12345"),
	}
	return h
}

func TestRegisterAndLoginNormalizedEmail(t *testing.T) {
	h := setupTestDB(t)

	// 1. Register with uppercase and spaces
	regBody := []byte(`{"email": "  TestUser@Example.COM  ", "password": "password123", "name": "Test User"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(regBody))
	w := httptest.NewRecorder()
	h.Register(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Register failed with status %d: %s", w.Code, w.Body.String())
	}

	var regResp struct {
		Token string      `json:"token"`
		User  models.User `json:"user"`
	}
	if err := json.NewDecoder(w.Body).Decode(&regResp); err != nil {
		t.Fatalf("Failed to decode register response: %v", err)
	}

	if regResp.User.Email != "testuser@example.com" {
		t.Errorf("Expected normalized email 'testuser@example.com', got %q", regResp.User.Email)
	}
	if regResp.Token == "" {
		t.Error("Expected non-empty token")
	}

	// 2. Duplicate registration should return 409
	reqDup := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(regBody))
	wDup := httptest.NewRecorder()
	h.Register(wDup, reqDup)
	if wDup.Code != http.StatusConflict {
		t.Errorf("Expected 409 Conflict for duplicate email, got %d", wDup.Code)
	}

	// 3. Login with lowercase / mixed casing and spaces
	loginBody := []byte(`{"email": "testuser@example.com ", "password": "password123"}`)
	reqLogin := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewReader(loginBody))
	wLogin := httptest.NewRecorder()
	h.Login(wLogin, reqLogin)

	if wLogin.Code != http.StatusOK {
		t.Fatalf("Login failed with status %d: %s", wLogin.Code, wLogin.Body.String())
	}

	var loginResp struct {
		Token string      `json:"token"`
		User  models.User `json:"user"`
	}
	if err := json.NewDecoder(wLogin.Body).Decode(&loginResp); err != nil {
		t.Fatalf("Failed to decode login response: %v", err)
	}
	if loginResp.User.ID != regResp.User.ID {
		t.Errorf("User ID mismatch: expected %d, got %d", regResp.User.ID, loginResp.User.ID)
	}
}

func TestDevicePairingFlows(t *testing.T) {
	h := setupTestDB(t)

	// Create a user in DB
	user := &models.User{
		Email: "tvuser@test.com",
		Name:  "TV User",
	}
	database.DB.Create(user)

	// Flow 1: Logged-in user generates link code, TV enters it with LoginWithCode
	reqGenLink := httptest.NewRequest(http.MethodPost, "/api/auth/device/link-code", nil)
	ctx := context.WithValue(reqGenLink.Context(), ContextUserIDKey, user.ID)
	reqGenLink = reqGenLink.WithContext(ctx)
	wGenLink := httptest.NewRecorder()
	h.GenerateLinkCode(wGenLink, reqGenLink)

	if wGenLink.Code != http.StatusOK {
		t.Fatalf("GenerateLinkCode failed: %d %s", wGenLink.Code, wGenLink.Body.String())
	}

	var linkCodeResp struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(wGenLink.Body).Decode(&linkCodeResp); err != nil {
		t.Fatalf("Failed to decode link code response: %v", err)
	}

	// TV checks status before pairing -> should be waiting
	reqStatusWait := httptest.NewRequest(http.MethodGet, "/api/auth/device/status?code="+linkCodeResp.Code, nil)
	wStatusWait := httptest.NewRecorder()
	h.CheckDeviceStatus(wStatusWait, reqStatusWait)
	if wStatusWait.Code != http.StatusOK {
		t.Fatalf("CheckDeviceStatus failed: %d", wStatusWait.Code)
	}
	var statusWaitResp struct {
		Status string `json:"status"`
	}
	_ = json.NewDecoder(wStatusWait.Body).Decode(&statusWaitResp)
	if statusWaitResp.Status != "waiting" {
		t.Errorf("Expected status 'waiting', got %q", statusWaitResp.Status)
	}

	// TV logs in with code
	loginCodeBody := []byte(`{"code":"` + linkCodeResp.Code + `"}`)
	reqLinkLogin := httptest.NewRequest(http.MethodPost, "/api/auth/device/link-login", bytes.NewReader(loginCodeBody))
	wLinkLogin := httptest.NewRecorder()
	h.LoginWithCode(wLinkLogin, reqLinkLogin)

	if wLinkLogin.Code != http.StatusOK {
		t.Fatalf("LoginWithCode failed: %d %s", wLinkLogin.Code, wLinkLogin.Body.String())
	}

	var linkLoginResp struct {
		Token string      `json:"token"`
		User  models.User `json:"user"`
	}
	_ = json.NewDecoder(wLinkLogin.Body).Decode(&linkLoginResp)
	if linkLoginResp.User.ID != user.ID || linkLoginResp.Token == "" {
		t.Errorf("LoginWithCode returned invalid user/token: %+v", linkLoginResp)
	}

	// Now PC polling CheckDeviceStatus should report paired
	reqStatusPaired := httptest.NewRequest(http.MethodGet, "/api/auth/device/status?code="+linkCodeResp.Code, nil)
	wStatusPaired := httptest.NewRecorder()
	h.CheckDeviceStatus(wStatusPaired, reqStatusPaired)
	if wStatusPaired.Code != http.StatusOK {
		t.Fatalf("CheckDeviceStatus paired failed: %d", wStatusPaired.Code)
	}
	var statusPairedResp struct {
		Status string `json:"status"`
		Token  string `json:"token"`
	}
	_ = json.NewDecoder(wStatusPaired.Body).Decode(&statusPairedResp)
	if statusPairedResp.Status != "paired" || statusPairedResp.Token == "" {
		t.Errorf("Expected paired status with token, got %+v", statusPairedResp)
	}

	// Flow 2: TV generates device code, logged-in PC user calls PairDevice
	reqGenDevice := httptest.NewRequest(http.MethodPost, "/api/auth/device/code", bytes.NewReader([]byte(`{"device_name":"Living Room TV"}`)))
	wGenDevice := httptest.NewRecorder()
	h.GenerateDeviceCode(wGenDevice, reqGenDevice)

	var devCodeResp struct {
		Code string `json:"code"`
	}
	_ = json.NewDecoder(wGenDevice.Body).Decode(&devCodeResp)

	// PC pairs device
	pairBody := []byte(`{"code":"` + devCodeResp.Code + `"}`)
	reqPair := httptest.NewRequest(http.MethodPost, "/api/auth/device/pair", bytes.NewReader(pairBody))
	ctxPair := context.WithValue(reqPair.Context(), ContextUserIDKey, user.ID)
	reqPair = reqPair.WithContext(ctxPair)
	wPair := httptest.NewRecorder()
	h.PairDevice(wPair, reqPair)

	if wPair.Code != http.StatusOK {
		t.Fatalf("PairDevice failed: %d %s", wPair.Code, wPair.Body.String())
	}
}

func TestGetUserIDFromRequest(t *testing.T) {
	// 1. With ContextUserIDKey
	req1 := httptest.NewRequest(http.MethodGet, "/", nil)
	ctx1 := context.WithValue(req1.Context(), ContextUserIDKey, uint(42))
	req1 = req1.WithContext(ctx1)
	if id, ok := GetUserIDFromRequest(req1); !ok || id != 42 {
		t.Errorf("GetUserIDFromRequest with ContextUserIDKey failed: got (%d, %v)", id, ok)
	}

	// 2. With string key "user_id"
	req2 := httptest.NewRequest(http.MethodGet, "/", nil)
	ctx2 := context.WithValue(req2.Context(), "user_id", uint(99))
	req2 = req2.WithContext(ctx2)
	if id, ok := GetUserIDFromRequest(req2); !ok || id != 99 {
		t.Errorf("GetUserIDFromRequest with string 'user_id' failed: got (%d, %v)", id, ok)
	}

	// 3. Missing user_id
	req3 := httptest.NewRequest(http.MethodGet, "/", nil)
	if _, ok := GetUserIDFromRequest(req3); ok {
		t.Error("Expected ok=false for missing user_id")
	}
}
