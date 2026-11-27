package mattermost

import "testing"

func TestNeutralizeBroadcastMentions(t *testing.T) {
	cases := map[string]string{
		"ping @channel now":  "ping @​channel now",
		"@ALL, @Here.":       "@​ALL, @​Here.",
		"ask @alice":         "ask @alice",
		"@channel_ops owns":  "@channel_ops owns",
		"mail a@example.com": "mail a@example.com",
	}

	for input, want := range cases {
		if got := neutralizeBroadcastMentions(input); got != want {
			t.Errorf("neutralizeBroadcastMentions(%q) = %q, want %q", input, got, want)
		}
	}
}
