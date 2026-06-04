package permissions

import "sort"

// Wildcard grants every permission. It is held by the super_admin role so that
// new permission keys are covered automatically without re-seeding roles.
const Wildcard = "*"

// Set is an immutable-by-convention collection of permission keys held by an
// admin, computed from their directly assigned roles.
type Set struct {
	keys map[string]struct{}
}

// NewSet builds a Set from a list of permission keys.
func NewSet(keys []string) Set {
	m := make(map[string]struct{}, len(keys))
	for _, k := range keys {
		m[k] = struct{}{}
	}
	return Set{keys: m}
}

// Has reports whether the set grants the given permission key. A set that
// contains the wildcard grants every key.
func (s Set) Has(key string) bool {
	if s.keys == nil {
		return false
	}
	if _, ok := s.keys[Wildcard]; ok {
		return true
	}
	_, ok := s.keys[key]
	return ok
}

// HasAll reports whether the set grants every one of the given keys.
func (s Set) HasAll(keys ...string) bool {
	for _, k := range keys {
		if !s.Has(k) {
			return false
		}
	}
	return true
}

// HasAny reports whether the set grants at least one of the given keys.
func (s Set) HasAny(keys ...string) bool {
	for _, k := range keys {
		if s.Has(k) {
			return true
		}
	}
	return false
}

// IsSuperAdmin reports whether the set holds the wildcard permission.
func (s Set) IsSuperAdmin() bool {
	_, ok := s.keys[Wildcard]
	return ok
}

// List returns the granted keys in sorted order. If the wildcard is present it
// is expanded to the full concrete catalog so callers (e.g. /api/me/permissions)
// receive an explicit list the frontend can match against.
func (s Set) List() []string {
	if s.IsSuperAdmin() {
		return Keys()
	}
	out := make([]string, 0, len(s.keys))
	for k := range s.keys {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}
