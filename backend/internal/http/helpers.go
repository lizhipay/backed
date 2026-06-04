package httpapi

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/backed/backend/internal/auth"
	"github.com/backed/backend/internal/middleware"
	"github.com/backed/backend/internal/platform/response"
	"github.com/backed/backend/internal/store"
)

// decodeJSON parses the request body into dst, rejecting unknown fields.
func decodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return response.BadRequest("invalid request body: " + err.Error())
	}
	return nil
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

// slugify normalizes a name into a url-safe slug.
func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

// principal extracts the authenticated principal; callers behind auth
// middleware can rely on it being present.
func principal(r *http.Request) *auth.Principal {
	p, _ := auth.PrincipalFrom(r.Context())
	return p
}

// audit appends an audit entry derived from the request context, attaching the
// actor, client IP, user agent and request id automatically.
func (s *Server) audit(r *http.Request, action, resourceType, resourceID string, changes map[string]any) {
	var actorID *string
	var label string
	if p := principal(r); p != nil {
		actorID = &p.AdminID
		label = p.Email
	}
	_ = s.store.AppendAudit(r.Context(), store.AuditEntry{
		ActorAdminID: actorID,
		ActorLabel:   label,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Changes:      changes,
		Status:       "success",
		IP:           middleware.ClientIP(r),
		UserAgent:    r.UserAgent(),
		RequestID:    middleware.RequestIDFrom(r.Context()),
	})
}
