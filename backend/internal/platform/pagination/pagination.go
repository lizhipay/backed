package pagination

import (
	"net/http"
	"strconv"
)

const (
	defaultPage     = 1
	defaultPageSize = 20
	maxPageSize     = 100
)

// Params holds normalized pagination input.
type Params struct {
	Page     int
	PageSize int
	Search   string
}

// Offset returns the SQL offset for the current page.
func (p Params) Offset() int { return (p.Page - 1) * p.PageSize }

// Limit returns the SQL limit for the current page.
func (p Params) Limit() int { return p.PageSize }

// FromRequest parses page, page_size and q query parameters with safe bounds.
func FromRequest(r *http.Request) Params {
	q := r.URL.Query()
	page := atoiDefault(q.Get("page"), defaultPage)
	if page < 1 {
		page = defaultPage
	}
	size := atoiDefault(q.Get("page_size"), defaultPageSize)
	if size < 1 {
		size = defaultPageSize
	}
	if size > maxPageSize {
		size = maxPageSize
	}
	return Params{Page: page, PageSize: size, Search: q.Get("q")}
}

func atoiDefault(s string, fallback int) int {
	if s == "" {
		return fallback
	}
	if n, err := strconv.Atoi(s); err == nil {
		return n
	}
	return fallback
}
