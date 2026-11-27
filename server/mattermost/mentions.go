package mattermost

import "regexp"

var broadcastMention = regexp.MustCompile(`(?i)(^|[^\w.])@(channel|all|here)\b`)

/*
neutralizeBroadcastMentions stops member-typed text from notifying a whole
channel. A zero-width space keeps the text readable. It must not be applied to
messages where Campfire itself mentions @all.
*/
func neutralizeBroadcastMentions(message string) string {
	// Twice, because adjacent mentions share the separating character.
	for range 2 {
		message = broadcastMention.ReplaceAllString(message, "${1}@​${2}")
	}

	return message
}
