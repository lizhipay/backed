package auth

import (
	"net/http"
	"time"
)

// RefreshCookieName is the name of the HttpOnly cookie carrying the refresh token.
const RefreshCookieName = "refresh_token"

// refreshCookiePath scopes the cookie to the auth endpoints so it is only sent
// where it is needed.
const refreshCookiePath = "/api/auth"

// SetRefreshCookie writes the refresh token as a secure HttpOnly cookie.
// In production the Secure flag is set and SameSite is Strict; in development
// over plain HTTP Secure is omitted so local testing works.
func SetRefreshCookie(w http.ResponseWriter, token string, expires time.Time, production bool) {
	c := &http.Cookie{
		Name:     RefreshCookieName,
		Value:    token,
		Path:     refreshCookiePath,
		Expires:  expires,
		MaxAge:   int(time.Until(expires).Seconds()),
		HttpOnly: true,
		Secure:   production,
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(w, c)
}

// ClearRefreshCookie expires the refresh cookie immediately.
func ClearRefreshCookie(w http.ResponseWriter, production bool) {
	c := &http.Cookie{
		Name:     RefreshCookieName,
		Value:    "",
		Path:     refreshCookiePath,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   production,
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(w, c)
}

// ReadRefreshCookie extracts the refresh token from the request, if present.
func ReadRefreshCookie(r *http.Request) (string, bool) {
	c, err := r.Cookie(RefreshCookieName)
	if err != nil || c.Value == "" {
		return "", false
	}
	return c.Value, true
}
