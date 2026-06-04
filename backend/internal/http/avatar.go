package httpapi

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/backed/backend/internal/platform/response"
	"github.com/backed/backend/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

const (
	maxAvatarBytes  = 2 << 20 // 2 MB
	avatarSubdir    = "avatars"
	avatarFormField = "avatar"
)

// allowedAvatarTypes maps a detected content type to the file extension we store.
var allowedAvatarTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// mountUploads serves previously uploaded public assets (avatars) from the local
// upload directory under the configured public base path.
func (s *Server) mountUploads(r chi.Router) {
	base := normalizeUploadBase(s.cfg.AdminPublicUploadBase)
	dir := s.cfg.AdminUploadDir
	if dir == "" {
		return
	}
	fs := http.StripPrefix(base+"/", http.FileServer(http.Dir(dir)))
	r.Get(base+"/*", func(w http.ResponseWriter, req *http.Request) {
		// Only the avatars subtree is publicly served; reject traversal attempts.
		rel := strings.TrimPrefix(req.URL.Path, base+"/")
		cleaned := path.Clean("/" + rel)
		if !strings.HasPrefix(cleaned, "/"+avatarSubdir+"/") {
			http.NotFound(w, req)
			return
		}
		fs.ServeHTTP(w, req)
	})
}

func normalizeUploadBase(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		value = "/uploads"
	}
	if !strings.HasPrefix(value, "/") {
		value = "/" + value
	}
	return strings.TrimRight(value, "/")
}

func (s *Server) handleUploadAvatar(w http.ResponseWriter, r *http.Request) {
	p := principal(r)

	// Cap the whole request body before parsing so oversized uploads are
	// rejected without buffering them fully.
	r.Body = http.MaxBytesReader(w, r.Body, maxAvatarBytes+1024)
	if err := r.ParseMultipartForm(maxAvatarBytes + 1024); err != nil {
		response.Error(w, s.log, response.BadRequest("could not parse upload (max 2MB)"))
		return
	}
	defer r.MultipartForm.RemoveAll()

	file, header, err := r.FormFile(avatarFormField)
	if err != nil {
		response.Error(w, s.log, response.BadRequest("missing file field 'avatar'"))
		return
	}
	defer file.Close()

	if header.Size > maxAvatarBytes {
		response.Error(w, s.log, response.BadRequest("avatar must be 2MB or smaller"))
		return
	}

	// Sniff the content type from the first 512 bytes rather than trusting the
	// client-supplied header.
	head := make([]byte, 512)
	n, _ := io.ReadFull(file, head)
	contentType := http.DetectContentType(head[:n])
	ext, ok := allowedAvatarTypes[contentType]
	if !ok {
		response.Error(w, s.log, response.BadRequest("avatar must be a jpg, png, or webp image"))
		return
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		response.Error(w, s.log, response.Internal("could not read upload"))
		return
	}

	admin, err := s.store.GetAdminByID(r.Context(), p.AdminID)
	if err != nil {
		response.Error(w, s.log, response.NotFound("account not found"))
		return
	}

	objectKey := path.Join(avatarSubdir, uuid.NewString()+ext)
	if err := s.writeUploadFile(objectKey, file, header.Size); err != nil {
		s.log.Error("write avatar", "err", err)
		response.Error(w, s.log, response.Internal("could not store avatar"))
		return
	}

	publicURL := normalizeUploadBase(s.cfg.AdminPublicUploadBase) + "/" + objectKey
	displayURL := publicURL
	oldKey := admin.AvatarObjectKey
	updated, err := s.store.UpdateAdmin(r.Context(), p.AdminID, store.UpdateAdminParams{
		AvatarURL:       &displayURL,
		AvatarObjectKey: &objectKey,
	})
	if err != nil {
		// Roll back the just-written file so we don't orphan it.
		s.removeUploadFile(objectKey)
		response.Error(w, s.log, response.Internal("could not update profile"))
		return
	}

	// Best-effort cleanup of the previously stored avatar.
	if oldKey != "" && oldKey != objectKey {
		s.removeUploadFile(oldKey)
	}
	if updated.MFAEnabled {
		if remaining, err := s.store.CountActiveRecoveryCodes(r.Context(), updated.ID); err == nil {
			updated.MFARecoveryCodesRemaining = remaining
		}
	}

	s.audit(r, "me.avatar_upload", "admin", p.AdminID, map[string]any{
		"avatar_url":   publicURL,
		"content_type": contentType,
	})
	response.JSON(w, http.StatusOK, updated)
}

func (s *Server) handleDeleteAvatar(w http.ResponseWriter, r *http.Request) {
	p := principal(r)
	admin, err := s.store.GetAdminByID(r.Context(), p.AdminID)
	if err != nil {
		response.Error(w, s.log, response.NotFound("account not found"))
		return
	}
	oldKey := admin.AvatarObjectKey
	empty := ""
	updated, err := s.store.UpdateAdmin(r.Context(), p.AdminID, store.UpdateAdminParams{
		AvatarURL:       &empty,
		AvatarObjectKey: &empty,
	})
	if err != nil {
		response.Error(w, s.log, response.Internal("could not update profile"))
		return
	}
	if oldKey != "" {
		s.removeUploadFile(oldKey)
	}
	if updated.MFAEnabled {
		if remaining, err := s.store.CountActiveRecoveryCodes(r.Context(), updated.ID); err == nil {
			updated.MFARecoveryCodesRemaining = remaining
		}
	}
	s.audit(r, "me.avatar_delete", "admin", p.AdminID, nil)
	response.JSON(w, http.StatusOK, updated)
}

// writeUploadFile persists an uploaded reader to objectKey within the upload
// directory, creating parent directories as needed. objectKey is a trusted,
// server-generated relative path.
func (s *Server) writeUploadFile(objectKey string, src io.Reader, size int64) error {
	dest := filepath.Join(s.cfg.AdminUploadDir, filepath.FromSlash(objectKey))
	if err := os.MkdirAll(filepath.Dir(dest), 0o750); err != nil {
		return err
	}
	f, err := os.OpenFile(dest, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o640)
	if err != nil {
		return err
	}
	defer f.Close()
	written, err := io.Copy(f, io.LimitReader(src, maxAvatarBytes+1))
	if err != nil {
		return err
	}
	if written > maxAvatarBytes {
		return fmt.Errorf("avatar exceeds size limit")
	}
	return nil
}

// removeUploadFile deletes a stored object best-effort, logging but not failing
// on error. The key is validated to stay within the avatars subtree.
func (s *Server) removeUploadFile(objectKey string) {
	cleaned := path.Clean("/" + objectKey)
	if !strings.HasPrefix(cleaned, "/"+avatarSubdir+"/") {
		return
	}
	dest := filepath.Join(s.cfg.AdminUploadDir, filepath.FromSlash(strings.TrimPrefix(cleaned, "/")))
	if err := os.Remove(dest); err != nil && !os.IsNotExist(err) {
		s.log.Warn("remove old avatar", "key", objectKey, "err", err)
	}
}
