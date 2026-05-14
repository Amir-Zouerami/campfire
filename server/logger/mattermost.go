package logger

import (
	"strings"

	"github.com/mattermost/mattermost/server/public/plugin"
)

/*
MattermostLogger adapts the Mattermost plugin API logger to Campfire's Logger interface.
*/
type MattermostLogger struct {
	api plugin.API
}

/*
NewMattermostLogger creates a logger backed by the Mattermost plugin API.
*/
func NewMattermostLogger(api plugin.API) *MattermostLogger {
	return &MattermostLogger{
		api: api,
	}
}

/*
Debug writes a debug log message.
*/
func (l *MattermostLogger) Debug(message string, fields ...Field) {
	l.api.LogDebug(formatMessage(message, fields...))
}

/*
Info writes an informational log message.
*/
func (l *MattermostLogger) Info(message string, fields ...Field) {
	l.api.LogInfo(formatMessage(message, fields...))
}

/*
Warn writes a warning log message.
*/
func (l *MattermostLogger) Warn(message string, fields ...Field) {
	l.api.LogWarn(formatMessage(message, fields...))
}

/*
Error writes an error log message.
*/
func (l *MattermostLogger) Error(message string, fields ...Field) {
	l.api.LogError(formatMessage(message, fields...))
}

/*
formatMessage appends typed fields to a log message.

Mattermost's logger supports variadic key/value pairs, but Campfire keeps its
own logger interface typed and simple.
*/
func formatMessage(message string, fields ...Field) string {
	if len(fields) == 0 {
		return message
	}

	builder := strings.Builder{}
	builder.WriteString(message)

	for _, field := range fields {
		builder.WriteString(" ")
		builder.WriteString(field.Key)
		builder.WriteString("=")
		builder.WriteString(field.Value)
	}

	return builder.String()
}
