package logger

import (
	"log/slog"
	"os"
)

// New builds a structured slog logger. JSON in production, text otherwise.
func New(env string) *slog.Logger {
	level := slog.LevelInfo
	if env == "development" || env == "dev" {
		level = slog.LevelDebug
	}
	opts := &slog.HandlerOptions{Level: level}

	var handler slog.Handler
	if env == "production" || env == "prod" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}
	return slog.New(handler)
}
