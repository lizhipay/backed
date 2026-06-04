package httpapi

import (
	"net/http"
	"strings"

	"github.com/backed/backend/internal/auth"
	"github.com/backed/backend/internal/platform/response"
	"github.com/backed/backend/internal/store"
	"github.com/go-chi/chi/v5"
)

func (s *Server) mountMe(r chi.Router) {
	r.Route("/me", func(r chi.Router) {
		r.Get("/", s.handleMe)
		r.Patch("/", s.handleUpdateMe)
		r.Get("/permissions", s.handleMyPermissions)
		r.Post("/change-password", s.handleChangePassword)
		r.Get("/sessions", s.handleMySessions)
		r.Delete("/sessions/{id}", s.handleRevokeMySession)
		r.Post("/avatar", s.handleUploadAvatar)
		r.Delete("/avatar", s.handleDeleteAvatar)
		r.Post("/mfa/setup", s.handleMFASetup)
		r.Post("/mfa/confirm", s.handleMFAConfirm)
		r.Post("/mfa/disable", s.handleMFADisable)
	})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	p := principal(r)
	admin, err := s.store.GetAdminByID(r.Context(), p.AdminID)
	if err != nil {
		response.Error(w, s.log, response.NotFound("account not found"))
		return
	}
	if admin.MFAEnabled {
		if remaining, err := s.store.CountActiveRecoveryCodes(r.Context(), admin.ID); err == nil {
			admin.MFARecoveryCodesRemaining = remaining
		}
	}
	roles, _ := s.store.AdminRoles(r.Context(), admin.ID)
	response.JSON(w, http.StatusOK, map[string]any{
		"admin": admin,
		"roles": roles,
	})
}

type updateMeRequest struct {
	Username           *string `json:"username"`
	DisplayName        *string `json:"display_name"`
	ThemePreference    *string `json:"theme_preference"`
	LanguagePreference *string `json:"language_preference"`
}

func (s *Server) handleUpdateMe(w http.ResponseWriter, r *http.Request) {
	p := principal(r)
	var req updateMeRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	if req.ThemePreference != nil {
		switch *req.ThemePreference {
		case "dark", "light", "auto":
			if err := s.store.UpdateThemePreference(r.Context(), p.AdminID, *req.ThemePreference); err != nil {
				response.Error(w, s.log, response.Internal("could not update theme"))
				return
			}
		default:
			response.Error(w, s.log, response.BadRequest("theme_preference must be dark, light, or auto"))
			return
		}
	}
	if req.LanguagePreference != nil {
		switch *req.LanguagePreference {
		case "auto", "zh-CN", "zh-TW", "ja-JP", "en-US":
			if err := s.store.UpdateLanguagePreference(r.Context(), p.AdminID, *req.LanguagePreference); err != nil {
				response.Error(w, s.log, response.Internal("could not update language"))
				return
			}
		default:
			response.Error(w, s.log, response.BadRequest("language_preference must be auto, zh-CN, zh-TW, ja-JP, or en-US"))
			return
		}
	}
	if req.Username != nil || req.DisplayName != nil {
		if req.DisplayName != nil {
			trimmed := strings.TrimSpace(*req.DisplayName)
			if len(trimmed) > 120 {
				response.Error(w, s.log, response.BadRequest("display_name must be 120 characters or fewer"))
				return
			}
			req.DisplayName = &trimmed
		}
		if _, err := s.store.UpdateAdmin(r.Context(), p.AdminID, store.UpdateAdminParams{
			Username:    req.Username,
			DisplayName: req.DisplayName,
		}); err != nil {
			response.Error(w, s.log, response.Internal("could not update profile"))
			return
		}
	}
	admin, err := s.store.GetAdminByID(r.Context(), p.AdminID)
	if err != nil {
		response.Error(w, s.log, response.Internal("could not load profile"))
		return
	}
	if admin.MFAEnabled {
		if remaining, err := s.store.CountActiveRecoveryCodes(r.Context(), admin.ID); err == nil {
			admin.MFARecoveryCodesRemaining = remaining
		}
	}
	s.audit(r, "me.update_profile", "admin", p.AdminID, nil)
	response.JSON(w, http.StatusOK, admin)
}

func (s *Server) handleMyPermissions(w http.ResponseWriter, r *http.Request) {
	p := principal(r)
	response.JSON(w, http.StatusOK, map[string]any{
		"permissions":    p.Permissions.List(),
		"is_super_admin": p.Permissions.IsSuperAdmin(),
	})
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (s *Server) handleChangePassword(w http.ResponseWriter, r *http.Request) {
	p := principal(r)
	var req changePasswordRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	admin, err := s.store.GetAdminByID(r.Context(), p.AdminID)
	if err != nil {
		response.Error(w, s.log, response.NotFound("account not found"))
		return
	}
	if err := auth.VerifyPassword(admin.PasswordHash, req.CurrentPassword); err != nil {
		response.Error(w, s.log, response.Unauthorized("current password is incorrect"))
		return
	}
	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		response.Error(w, s.log, response.BadRequest(err.Error()))
		return
	}
	if err := s.store.UpdatePassword(r.Context(), admin.ID, hash, false); err != nil {
		response.Error(w, s.log, response.Internal("could not update password"))
		return
	}
	// Revoke all other sessions on password change for safety.
	if _, err := s.sessionStore.RevokeAllSessions(r.Context(), admin.ID, "password_changed"); err != nil {
		s.log.Error("revoke sessions after password change", "err", err)
	}
	s.audit(r, "me.change_password", "admin", admin.ID, nil)
	response.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleMySessions(w http.ResponseWriter, r *http.Request) {
	p := principal(r)
	sessions, err := s.sessionStore.ListSessionsForAdmin(r.Context(), p.AdminID, false)
	if err != nil {
		response.Error(w, s.log, response.Internal("could not list sessions"))
		return
	}
	response.JSON(w, http.StatusOK, sessions)
}

func (s *Server) handleRevokeMySession(w http.ResponseWriter, r *http.Request) {
	p := principal(r)
	id := chi.URLParam(r, "id")
	sess, err := s.sessionStore.GetSession(r.Context(), id)
	if err != nil || sess.AdminID != p.AdminID {
		response.Error(w, s.log, response.NotFound("session not found"))
		return
	}
	if err := s.sessionStore.RevokeSession(r.Context(), id, "self_revoked"); err != nil {
		response.Error(w, s.log, response.Internal("could not revoke session"))
		return
	}
	s.audit(r, "me.session_revoke", "session", id, nil)
	response.JSON(w, http.StatusOK, map[string]any{"ok": true})
}
