package httpapi

import (
	"context"
	"net/http"

	"github.com/backed/backend/internal/auth"
	"github.com/backed/backend/internal/permissions"
	"github.com/backed/backend/internal/platform/pagination"
	"github.com/backed/backend/internal/platform/response"
	"github.com/backed/backend/internal/store"
	"github.com/go-chi/chi/v5"
)

func (s *Server) mountAdmins(r chi.Router) {
	r.Route("/admins", func(r chi.Router) {
		r.With(s.can(permissions.AdminsView)).Get("/", s.handleListAdmins)
		r.With(s.can(permissions.AdminsCreate)).Post("/", s.handleCreateAdmin)
		r.With(s.can(permissions.AdminsView)).Get("/{id}", s.handleGetAdmin)
		r.With(s.can(permissions.AdminsUpdate)).Patch("/{id}", s.handleUpdateAdmin)
		r.With(s.can(permissions.AdminsDelete)).Delete("/{id}", s.handleDeleteAdmin)
		r.With(s.can(permissions.AdminsDisable)).Post("/{id}/disable", s.handleDisableAdmin)
		r.With(s.can(permissions.AdminsDisable)).Post("/{id}/enable", s.handleEnableAdmin)
		r.With(s.can(permissions.AdminsUpdate)).Post("/{id}/roles", s.handleSetAdminRoles)
		r.With(s.can(permissions.SessionsRevoke)).Post("/{id}/force-logout", s.handleForceLogoutAdmin)
	})
}

func (s *Server) handleListAdmins(w http.ResponseWriter, r *http.Request) {
	p := pagination.FromRequest(r)
	admins, total, err := s.store.ListAdmins(r.Context(), store.ListAdminsParams{
		Search: p.Search, Status: r.URL.Query().Get("status"), Limit: p.Limit(), Offset: p.Offset(),
	})
	if err != nil {
		response.Error(w, s.log, response.Internal("could not list admins"))
		return
	}
	response.List(w, admins, &response.Meta{Page: p.Page, PageSize: p.PageSize, Total: total})
}

func (s *Server) handleGetAdmin(w http.ResponseWriter, r *http.Request) {
	admin, err := s.store.GetAdminByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, s.log, response.NotFound("admin not found"))
		return
	}
	roles, _ := s.store.AdminRoleIDs(r.Context(), admin.ID)
	response.JSON(w, http.StatusOK, map[string]any{"admin": admin, "role_ids": roles})
}

type createAdminRequest struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Password string `json:"password"`
}

func (s *Server) handleCreateAdmin(w http.ResponseWriter, r *http.Request) {
	var req createAdminRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		response.Error(w, s.log, response.BadRequest(err.Error()))
		return
	}
	actor := principal(r).AdminID
	admin, err := s.store.CreateAdmin(r.Context(), store.CreateAdminParams{
		Email: req.Email, Username: req.Username, PasswordHash: hash, CreatedBy: &actor,
	})
	if err != nil {
		response.Error(w, s.log, response.Conflict("could not create admin"))
		return
	}
	s.audit(r, "admins.create", "admin", admin.ID, nil)
	response.JSON(w, http.StatusCreated, admin)
}

type updateAdminRequest struct {
	Email       *string `json:"email"`
	Username    *string `json:"username"`
	DisplayName *string `json:"display_name"`
	Status      *string `json:"status"`
}

func (s *Server) handleUpdateAdmin(w http.ResponseWriter, r *http.Request) {
	var req updateAdminRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	id := chi.URLParam(r, "id")
	if req.Status != nil && *req.Status != "active" {
		if s.protectSuperAdmin(w, r, id, "admins.update_status") {
			return
		}
	}
	admin, err := s.store.UpdateAdmin(r.Context(), id, store.UpdateAdminParams{
		Email:       req.Email,
		Username:    req.Username,
		DisplayName: req.DisplayName,
		Status:      req.Status,
	})
	if err != nil {
		response.Error(w, s.log, response.NotFound("admin not found"))
		return
	}
	s.audit(r, "admins.update", "admin", id, nil)
	response.JSON(w, http.StatusOK, admin)
}

func (s *Server) handleDeleteAdmin(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if s.protectSuperAdmin(w, r, id, "admins.delete") {
		return
	}
	if err := s.store.SoftDeleteAdmin(r.Context(), id); err != nil {
		response.Error(w, s.log, response.NotFound("admin not found"))
		return
	}
	s.audit(r, "admins.delete", "admin", id, nil)
	response.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleDisableAdmin(w http.ResponseWriter, r *http.Request) {
	s.setAdminStatus(w, r, "disabled")
}

func (s *Server) handleEnableAdmin(w http.ResponseWriter, r *http.Request) {
	s.setAdminStatus(w, r, "active")
}

func (s *Server) setAdminStatus(w http.ResponseWriter, r *http.Request, status string) {
	id := chi.URLParam(r, "id")
	if status != "active" && s.protectSuperAdmin(w, r, id, "admins."+status) {
		return
	}
	if err := s.store.SetAdminStatus(r.Context(), id, status); err != nil {
		response.Error(w, s.log, response.NotFound("admin not found"))
		return
	}
	s.audit(r, "admins."+status, "admin", id, map[string]any{"status": status})
	response.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

type idsRequest struct {
	IDs []string `json:"ids"`
}

func (s *Server) handleSetAdminRoles(w http.ResponseWriter, r *http.Request) {
	var req idsRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	id := chi.URLParam(r, "id")
	if protected, err := s.superAdminRoleRemovalProtected(r.Context(), id, req.IDs); err != nil {
		response.Error(w, s.log, response.Internal("could not validate role assignment"))
		return
	} else if protected {
		s.audit(r, "admins.assign_roles", "admin", id, map[string]any{"denied": "super_admin_protected"})
		response.Error(w, s.log, superAdminProtectedError())
		return
	}
	actor := principal(r).AdminID
	if err := s.store.SetAdminRoles(r.Context(), id, req.IDs, &actor); err != nil {
		response.Error(w, s.log, response.Internal("could not assign roles"))
		return
	}
	s.audit(r, "admins.assign_roles", "admin", id, map[string]any{"role_ids": req.IDs})
	response.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleForceLogoutAdmin(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	n, err := s.sessionStore.RevokeAllSessions(r.Context(), id, "forced_by_admin")
	if err != nil {
		response.Error(w, s.log, response.Internal("could not revoke sessions"))
		return
	}
	s.audit(r, "sessions.force_logout", "admin", id, map[string]any{"revoked": n})
	response.JSON(w, http.StatusOK, map[string]any{"revoked": n})
}

func superAdminProtectedError() *response.APIError {
	return response.New(http.StatusConflict, "super_admin_protected", "super administrators cannot be disabled, deleted, locked, or stripped of the super admin role")
}

func (s *Server) protectSuperAdmin(w http.ResponseWriter, r *http.Request, adminID, action string) bool {
	isSuper, err := s.store.IsSuperAdmin(r.Context(), adminID)
	if err != nil {
		response.Error(w, s.log, response.Internal("could not validate administrator protection"))
		return true
	}
	if !isSuper {
		return false
	}
	s.audit(r, action, "admin", adminID, map[string]any{"denied": "super_admin_protected"})
	response.Error(w, s.log, superAdminProtectedError())
	return true
}

func (s *Server) superAdminRoleRemovalProtected(ctx context.Context, adminID string, roleIDs []string) (bool, error) {
	isSuper, err := s.store.IsSuperAdmin(ctx, adminID)
	if err != nil {
		return false, err
	}
	if !isSuper {
		return false, nil
	}
	stillSuper, err := s.store.RoleIDsContainSlug(ctx, roleIDs, "super_admin")
	if err != nil {
		return false, err
	}
	return !stillSuper, nil
}

func (s *Server) mountRoles(r chi.Router) {
	r.Route("/roles", func(r chi.Router) {
		r.With(s.can(permissions.RolesView)).Get("/", s.handleListRoles)
		r.With(s.can(permissions.RolesCreate)).Post("/", s.handleCreateRole)
		r.With(s.can(permissions.RolesView)).Get("/{id}", s.handleGetRole)
		r.With(s.can(permissions.RolesUpdate)).Patch("/{id}", s.handleUpdateRole)
		r.With(s.can(permissions.RolesDelete)).Delete("/{id}", s.handleDeleteRole)
		r.With(s.can(permissions.RolesAssignPermissions)).Put("/{id}/permissions", s.handleSetRolePermissions)
	})
}

func (s *Server) handleListRoles(w http.ResponseWriter, r *http.Request) {
	p := pagination.FromRequest(r)
	roles, total, err := s.store.ListRoles(r.Context(), p.Search, p.Limit(), p.Offset())
	if err != nil {
		response.Error(w, s.log, response.Internal("could not list roles"))
		return
	}
	response.List(w, roles, &response.Meta{Page: p.Page, PageSize: p.PageSize, Total: total})
}

func (s *Server) handleGetRole(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	role, err := s.store.GetRole(r.Context(), id)
	if err != nil {
		response.Error(w, s.log, response.NotFound("role not found"))
		return
	}
	keys, _ := s.store.RolePermissionKeys(r.Context(), id)
	response.JSON(w, http.StatusOK, map[string]any{"role": role, "permission_keys": keys})
}

type roleRequest struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
}

func (s *Server) handleCreateRole(w http.ResponseWriter, r *http.Request) {
	var req roleRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	if req.Slug == "" {
		req.Slug = slugify(req.Name)
	}
	role, err := s.store.CreateRole(r.Context(), req.Name, req.Slug, req.Description, false)
	if err != nil {
		response.Error(w, s.log, response.Conflict("could not create role"))
		return
	}
	s.audit(r, "roles.create", "role", role.ID, nil)
	response.JSON(w, http.StatusCreated, role)
}

func (s *Server) handleUpdateRole(w http.ResponseWriter, r *http.Request) {
	var req roleRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	id := chi.URLParam(r, "id")
	role, err := s.store.UpdateRole(r.Context(), id, req.Name, req.Description)
	if err != nil {
		response.Error(w, s.log, response.NotFound("role not found"))
		return
	}
	s.audit(r, "roles.update", "role", id, nil)
	response.JSON(w, http.StatusOK, role)
}

func (s *Server) handleDeleteRole(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	role, err := s.store.GetRole(r.Context(), id)
	if err != nil {
		response.Error(w, s.log, response.NotFound("role not found"))
		return
	}
	if role.IsSystem {
		response.Error(w, s.log, response.BadRequest("system roles cannot be deleted"))
		return
	}
	if err := s.store.DeleteRole(r.Context(), id); err != nil {
		response.Error(w, s.log, response.Internal("could not delete role"))
		return
	}
	s.audit(r, "roles.delete", "role", id, nil)
	response.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

type permissionKeysRequest struct {
	Keys []string `json:"keys"`
}

func (s *Server) handleSetRolePermissions(w http.ResponseWriter, r *http.Request) {
	var req permissionKeysRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	id := chi.URLParam(r, "id")
	if err := s.store.SetRolePermissions(r.Context(), id, req.Keys); err != nil {
		response.Error(w, s.log, response.Internal("could not assign permissions"))
		return
	}
	s.audit(r, "roles.assign_permissions", "role", id, map[string]any{"permission_keys": req.Keys})
	response.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) mountPermissions(r chi.Router) {
	r.Route("/permissions", func(r chi.Router) {
		r.With(s.can(permissions.PermissionsView)).Get("/", s.handleListPermissions)
	})
	r.With(s.can(permissions.PermissionsView)).Get("/meta/permissions", s.handleListPermissions)
}

func (s *Server) handleListPermissions(w http.ResponseWriter, r *http.Request) {
	perms, err := s.store.ListPermissions(r.Context())
	if err != nil {
		response.Error(w, s.log, response.Internal("could not list permissions"))
		return
	}
	response.JSON(w, http.StatusOK, perms)
}

func (s *Server) mountSessions(r chi.Router) {
	r.Route("/sessions", func(r chi.Router) {
		r.With(s.can(permissions.SessionsView)).Get("/", s.handleListSessions)
		r.With(s.can(permissions.SessionsRevoke)).Delete("/{id}", s.handleRevokeSession)
	})
}

func (s *Server) handleListSessions(w http.ResponseWriter, r *http.Request) {
	sessions, err := s.sessionStore.ListSessions(r.Context(), r.URL.Query().Get("active") == "true")
	if err != nil {
		response.Error(w, s.log, response.Internal("could not list sessions"))
		return
	}
	response.JSON(w, http.StatusOK, sessions)
}

func (s *Server) handleRevokeSession(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.sessionStore.RevokeSession(r.Context(), id, "revoked_by_admin"); err != nil {
		response.Error(w, s.log, response.NotFound("session not found"))
		return
	}
	s.audit(r, "sessions.revoke", "session", id, nil)
	response.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) mountAudit(r chi.Router) {
	r.Route("/audit-logs", func(r chi.Router) {
		r.With(s.can(permissions.AuditLogsView)).Get("/", s.handleListAudit)
		r.With(s.can(permissions.AuditLogsView)).Get("/{id}", s.handleGetAudit)
	})
}

func (s *Server) handleListAudit(w http.ResponseWriter, r *http.Request) {
	p := pagination.FromRequest(r)
	logs, total, err := s.store.ListAudit(r.Context(), store.ListAuditParams{
		Action: r.URL.Query().Get("action"), ResourceType: r.URL.Query().Get("resource_type"),
		ActorID: r.URL.Query().Get("actor_id"), Status: r.URL.Query().Get("status"),
		Limit: p.Limit(), Offset: p.Offset(),
	})
	if err != nil {
		response.Error(w, s.log, response.Internal("could not list audit logs"))
		return
	}
	response.List(w, logs, &response.Meta{Page: p.Page, PageSize: p.PageSize, Total: total})
}

func (s *Server) handleGetAudit(w http.ResponseWriter, r *http.Request) {
	log, err := s.store.GetAudit(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, s.log, response.NotFound("audit log not found"))
		return
	}
	response.JSON(w, http.StatusOK, log)
}

func (s *Server) mountSettings(r chi.Router) {
	r.Route("/settings", func(r chi.Router) {
		r.With(s.can(permissions.SettingsView)).Get("/", s.handleGetSettings)
		r.With(s.can(permissions.SettingsUpdate)).Patch("/", s.handleUpdateSettings)
	})
}

func (s *Server) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := s.store.GetAllSettings(r.Context())
	if err != nil {
		response.Error(w, s.log, response.Internal("could not load settings"))
		return
	}
	response.JSON(w, http.StatusOK, settings)
}

func (s *Server) handleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var body map[string]map[string]any
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, s.log, err)
		return
	}
	actor := principal(r).AdminID
	for key, value := range body {
		if err := s.store.UpsertSetting(r.Context(), key, value, &actor); err != nil {
			response.Error(w, s.log, response.Internal("could not save settings"))
			return
		}
	}
	s.audit(r, "settings.update", "settings", "", map[string]any{"keys": body})
	response.JSON(w, http.StatusOK, map[string]any{"ok": true})
}
