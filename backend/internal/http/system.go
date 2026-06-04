package httpapi

import (
	"net/http"

	"github.com/backed/backend/internal/platform/response"
)

// Build-time version info, overridable via -ldflags.
var (
	Version   = "0.1.0"
	Commit    = "dev"
	BuildTime = "unknown"
)

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	dbOK := s.store.Pool().Ping(r.Context()) == nil
	redisOK := s.sessionStore.Ping(r.Context()) == nil
	ok := dbOK && redisOK
	status := "ok"
	if !ok {
		status = "degraded"
	}
	response.JSON(w, statusCode(ok), map[string]any{
		"status": status,
		"db":     dbOK,
		"redis":  redisOK,
	})
}

func statusCode(ok bool) int {
	if ok {
		return http.StatusOK
	}
	return http.StatusServiceUnavailable
}

func (s *Server) handleVersion(w http.ResponseWriter, r *http.Request) {
	response.JSON(w, http.StatusOK, map[string]any{
		"version":    Version,
		"commit":     Commit,
		"build_time": BuildTime,
		"env":        s.cfg.AppEnv,
	})
}
