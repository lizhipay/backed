package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims is the JWT payload carried by an access token.
type Claims struct {
	jwt.RegisteredClaims
	AdminID string `json:"adm"`
	Email   string `json:"email"`
}

// TokenManager issues and validates access tokens and produces refresh tokens.
type TokenManager struct {
	jwtSecret     []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
	issuer        string
}

// NewTokenManager constructs a TokenManager.
func NewTokenManager(jwtSecret, refreshSecret []byte, accessTTL, refreshTTL time.Duration) *TokenManager {
	return &TokenManager{
		jwtSecret:     jwtSecret,
		refreshSecret: refreshSecret,
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
		issuer:        "backed-api",
	}
}

// AccessTTL exposes the configured access token lifetime.
func (m *TokenManager) AccessTTL() time.Duration { return m.accessTTL }

// RefreshTTL exposes the configured refresh token lifetime.
func (m *TokenManager) RefreshTTL() time.Duration { return m.refreshTTL }

// IssueAccessToken signs a short-lived JWT for the admin and returns it along
// with its unique JTI so the caller can pin it to a session.
func (m *TokenManager) IssueAccessToken(adminID, email string) (token, jti string, err error) {
	jti = uuid.NewString()
	now := time.Now()
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   adminID,
			ID:        jti,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.accessTTL)),
		},
		AdminID: adminID,
		Email:   email,
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.jwtSecret)
	if err != nil {
		return "", "", err
	}
	return signed, jti, nil
}

// ParseAccessToken validates a JWT and returns its claims.
func (m *TokenManager) ParseAccessToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return m.jwtSecret, nil
	}, jwt.WithIssuer(m.issuer))
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

// NewRefreshToken returns a cryptographically random opaque refresh token. The
// raw token is delivered to the client (in an HttpOnly cookie); only its hash
// is stored server-side.
func (m *TokenManager) NewRefreshToken() (raw string, err error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// HashRefreshToken derives a stable, non-reversible hash of a refresh token
// using HMAC-SHA256 keyed by the refresh secret, suitable for DB lookup.
func (m *TokenManager) HashRefreshToken(raw string) string {
	mac := hmac.New(sha256.New, m.refreshSecret)
	mac.Write([]byte(raw))
	return hex.EncodeToString(mac.Sum(nil))
}

// RefreshExpiry returns the absolute expiry for a newly minted refresh token.
func (m *TokenManager) RefreshExpiry() time.Time {
	return time.Now().Add(m.refreshTTL)
}
