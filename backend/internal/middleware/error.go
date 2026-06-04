package middleware

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// writeJSONError writes the uniform error envelope. It mirrors the response
// package shape but is duplicated here to avoid an import cycle.
func writeJSONError(w http.ResponseWriter, log *slog.Logger, status int, code, msg string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	body := map[string]any{
		"error": map[string]any{"code": code, "message": msg},
	}
	if err := json.NewEncoder(w).Encode(body); err != nil && log != nil {
		log.Error("write error response", "err", err)
	}
}
