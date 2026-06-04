package httpapi

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
)

func (s *Server) mountAdminFrontend(r chi.Router) {
	if strings.TrimSpace(s.cfg.AdminFrontendDir) == "" {
		return
	}
	base := normalizeAdminBasePath(s.cfg.AdminBasePath)
	redirectToAdminRoot := func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, base+"/", http.StatusMovedPermanently)
	}
	r.Get(base, redirectToAdminRoot)
	r.Head(base, redirectToAdminRoot)
	r.Handle(base+"/*", adminFrontendHandler(base, s.cfg.AdminFrontendDir))
}

func normalizeAdminBasePath(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || value == "/" {
		return "/admin"
	}
	if !strings.HasPrefix(value, "/") {
		value = "/" + value
	}
	return strings.TrimRight(value, "/")
}

func adminFrontendHandler(base, root string) http.Handler {
	fileServer := http.StripPrefix(base, http.FileServer(http.Dir(root)))
	indexPath := filepath.Join(root, "index.html")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
			return
		}

		rel := strings.TrimPrefix(r.URL.Path, base)
		cleaned := path.Clean("/" + rel)
		if cleaned == "/" {
			http.ServeFile(w, r, indexPath)
			return
		}

		fsPath := filepath.Join(root, filepath.FromSlash(strings.TrimPrefix(cleaned, "/")))
		if info, err := os.Stat(fsPath); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}

		if strings.HasPrefix(cleaned, "/assets/") || path.Ext(cleaned) != "" {
			http.NotFound(w, r)
			return
		}
		http.ServeFile(w, r, indexPath)
	})
}
