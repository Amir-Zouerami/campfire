package api

import "testing"

func TestWorkspaceScopeFromPath(t *testing.T) {
	cases := []struct {
		path        string
		workspaceID string
		channelID   string
	}{
		{"/api/v1/workspaces/abc/members", "abc", ""},
		{"/api/v1/workspaces/abc", "abc", ""},
		{"/api/v1/workspaces/by-channel/chan1", "", "chan1"},
		{"/api/v1/workspaces/by-channel", "", ""},
		{"/api/v1/workspaces", "", ""},
		{"/api/v1/leaves/123/decision", "", ""},
		{"/api/v1/reports/global/time-summary", "", ""},
	}

	for _, testCase := range cases {
		workspaceID, channelID := workspaceScopeFromPath(testCase.path)
		if workspaceID != testCase.workspaceID || channelID != testCase.channelID {
			t.Errorf("%s: got (%q, %q), want (%q, %q)", testCase.path, workspaceID, channelID, testCase.workspaceID, testCase.channelID)
		}
	}
}
