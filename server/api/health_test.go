package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/amir-zouerami/campfire/server/logger"
)

/*
TestHealthReportsPluginVersion stops the health endpoint reporting a stale version.
*/
func TestHealthReportsPluginVersion(t *testing.T) {
	raw, err := os.ReadFile("../../plugin.json")
	if err != nil {
		t.Fatalf("read plugin.json: %v", err)
	}

	var manifest struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal(raw, &manifest); err != nil {
		t.Fatalf("parse plugin.json: %v", err)
	}

	recorder := httptest.NewRecorder()
	handleHealth(silentLogger{})(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/health", nil))

	var health HealthResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &health); err != nil {
		t.Fatalf("parse health response: %v", err)
	}

	if health.Version != manifest.Version {
		t.Errorf("health version = %q, plugin.json version = %q", health.Version, manifest.Version)
	}
}

type silentLogger struct{}

func (silentLogger) Debug(string, ...logger.Field) {}
func (silentLogger) Info(string, ...logger.Field)  {}
func (silentLogger) Warn(string, ...logger.Field)  {}
func (silentLogger) Error(string, ...logger.Field) {}
