package logger

/*
Field is a typed structured logging field.

Campfire application code uses this type instead of passing loosely typed
key/value arguments through the codebase.
*/
type Field struct {
	Key   string
	Value string
}

/*
String creates a typed string logging field.
*/
func String(key string, value string) Field {
	return Field{
		Key:   key,
		Value: value,
	}
}

/*
Logger defines Campfire's structured logging boundary.

Application code should depend on this interface instead of directly calling
Mattermost plugin APIs everywhere.
*/
type Logger interface {
	Debug(message string, fields ...Field)
	Info(message string, fields ...Field)
	Warn(message string, fields ...Field)
	Error(message string, fields ...Field)
}
