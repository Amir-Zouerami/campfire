package main

import (
	"encoding/json"
	"os"
	"testing"
)

/*
TestManifestConstantsMatchPluginJSON stops the Go constants drifting from the
manifest Mattermost actually reads.
*/
func TestManifestConstantsMatchPluginJSON(t *testing.T) {
	raw, err := os.ReadFile("../plugin.json")
	if err != nil {
		t.Fatalf("read plugin.json: %v", err)
	}

	var manifest struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Version string `json:"version"`
	}
	if err := json.Unmarshal(raw, &manifest); err != nil {
		t.Fatalf("parse plugin.json: %v", err)
	}

	if PluginID != manifest.ID {
		t.Errorf("PluginID = %q, plugin.json id = %q", PluginID, manifest.ID)
	}
	if PluginName != manifest.Name {
		t.Errorf("PluginName = %q, plugin.json name = %q", PluginName, manifest.Name)
	}
	if PluginVersion != manifest.Version {
		t.Errorf("PluginVersion = %q, plugin.json version = %q", PluginVersion, manifest.Version)
	}
}
