package sessionstore

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/backed/backend/internal/store"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// Store keeps short-lived authentication state in Redis.
type Store struct {
	client     *redis.Client
	prefix     string
	refreshTTL time.Duration
}

// New constructs a Redis-backed session store.
func New(client *redis.Client, keyPrefix string, refreshTTL time.Duration) *Store {
	keyPrefix = strings.TrimRight(strings.TrimSpace(keyPrefix), ":")
	if keyPrefix == "" {
		keyPrefix = "backed:admin"
	}
	return &Store{client: client, prefix: keyPrefix, refreshTTL: refreshTTL}
}

// Ping checks whether Redis is reachable.
func (s *Store) Ping(ctx context.Context) error {
	return s.client.Ping(ctx).Err()
}

// CreateSessionParams holds inputs for opening a session.
type CreateSessionParams struct {
	AdminID          string
	RefreshTokenHash string
	AccessJTI        string
	UserAgent        string
	IP               string
	ExpiresAt        time.Time
}

type redisSession struct {
	ID               string     `json:"id"`
	AdminID          string     `json:"admin_id"`
	RefreshTokenHash string     `json:"refresh_token_hash"`
	AccessJTI        string     `json:"access_jti"`
	UserAgent        string     `json:"user_agent"`
	IP               string     `json:"ip"`
	ExpiresAt        time.Time  `json:"expires_at"`
	LastSeenAt       time.Time  `json:"last_seen_at"`
	RevokedAt        *time.Time `json:"revoked_at,omitempty"`
	RevokedReason    *string    `json:"revoked_reason,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

// CreateSession opens a new Redis session and indexes it by refresh hash.
func (s *Store) CreateSession(ctx context.Context, p CreateSessionParams) (string, error) {
	now := time.Now()
	session := redisSession{
		ID:               uuid.NewString(),
		AdminID:          p.AdminID,
		RefreshTokenHash: p.RefreshTokenHash,
		AccessJTI:        p.AccessJTI,
		UserAgent:        p.UserAgent,
		IP:               p.IP,
		ExpiresAt:        p.ExpiresAt,
		LastSeenAt:       now,
		CreatedAt:        now,
	}
	if err := s.saveSession(ctx, session); err != nil {
		return "", err
	}
	return session.ID, nil
}

// GetSessionByRefreshHash loads a session by the hash of its refresh token.
func (s *Store) GetSessionByRefreshHash(ctx context.Context, hash string) (*store.Session, error) {
	id, err := s.client.Get(ctx, s.refreshKey(hash)).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}
	session, err := s.getRedisSession(ctx, id)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			_ = s.client.Del(ctx, s.refreshKey(hash)).Err()
		}
		return nil, err
	}
	return session.toPublic(), nil
}

// RotateSession replaces the refresh hash and access JTI for an existing session.
func (s *Store) RotateSession(ctx context.Context, id, newHash, newJTI string, expiresAt time.Time) error {
	session, err := s.getRedisSession(ctx, id)
	if err != nil {
		return err
	}
	oldHash := session.RefreshTokenHash
	session.RefreshTokenHash = newHash
	session.AccessJTI = newJTI
	session.ExpiresAt = expiresAt
	session.LastSeenAt = time.Now()
	if time.Until(session.ExpiresAt) <= 0 {
		return store.ErrNotFound
	}

	payload, err := json.Marshal(session)
	if err != nil {
		return err
	}
	ttl := ttlUntil(session.ExpiresAt)
	pipe := s.client.TxPipeline()
	pipe.Set(ctx, s.sessionKey(session.ID), payload, ttl)
	pipe.Del(ctx, s.refreshKey(oldHash))
	pipe.Set(ctx, s.refreshKey(newHash), session.ID, ttl)
	_, err = pipe.Exec(ctx)
	return err
}

// GetSession loads a session by id.
func (s *Store) GetSession(ctx context.Context, id string) (*store.Session, error) {
	session, err := s.getRedisSession(ctx, id)
	if err != nil {
		return nil, err
	}
	return session.toPublic(), nil
}

// ListSessionsForAdmin returns sessions for one admin, newest first.
func (s *Store) ListSessionsForAdmin(ctx context.Context, adminID string, activeOnly bool) ([]store.Session, error) {
	ids, err := s.client.SMembers(ctx, s.adminSessionsKey(adminID)).Result()
	if err != nil {
		return nil, err
	}
	return s.sessionsFromIDs(ctx, ids, activeOnly, 0)
}

// ListSessions returns all sessions, newest first, capped to match the old API.
func (s *Store) ListSessions(ctx context.Context, activeOnly bool) ([]store.Session, error) {
	ids, err := s.client.SMembers(ctx, s.sessionsIndexKey()).Result()
	if err != nil {
		return nil, err
	}
	return s.sessionsFromIDs(ctx, ids, activeOnly, 200)
}

// RevokeSession marks one active session revoked and removes its refresh lookup.
func (s *Store) RevokeSession(ctx context.Context, id, reason string) error {
	session, err := s.getRedisSession(ctx, id)
	if err != nil {
		return err
	}
	if session.RevokedAt != nil {
		return store.ErrNotFound
	}
	now := time.Now()
	session.RevokedAt = &now
	session.RevokedReason = &reason
	payload, err := json.Marshal(session)
	if err != nil {
		return err
	}
	ttl := ttlUntil(session.ExpiresAt)
	pipe := s.client.TxPipeline()
	pipe.Set(ctx, s.sessionKey(session.ID), payload, ttl)
	pipe.Del(ctx, s.refreshKey(session.RefreshTokenHash))
	_, err = pipe.Exec(ctx)
	return err
}

// RevokeAllSessions marks every active session for an admin revoked.
func (s *Store) RevokeAllSessions(ctx context.Context, adminID, reason string) (int64, error) {
	ids, err := s.client.SMembers(ctx, s.adminSessionsKey(adminID)).Result()
	if err != nil {
		return 0, err
	}
	var revoked int64
	for _, id := range ids {
		err := s.RevokeSession(ctx, id, reason)
		if err == nil {
			revoked++
			continue
		}
		if errors.Is(err, store.ErrNotFound) {
			continue
		}
		return revoked, err
	}
	return revoked, nil
}

// CreateMFAChallenge stores a single-use MFA challenge with a short TTL.
func (s *Store) CreateMFAChallenge(ctx context.Context, adminID, tokenHash string, expiresAt time.Time, ip, ua string) (string, error) {
	challenge := mfaChallenge{
		ID:        uuid.NewString(),
		AdminID:   adminID,
		ExpiresAt: expiresAt,
		IP:        ip,
		UserAgent: ua,
		CreatedAt: time.Now(),
	}
	payload, err := json.Marshal(challenge)
	if err != nil {
		return "", err
	}
	if err := s.client.Set(ctx, s.mfaChallengeKey(tokenHash), payload, ttlUntil(expiresAt)).Err(); err != nil {
		return "", err
	}
	return challenge.ID, nil
}

type mfaChallenge struct {
	ID        string    `json:"id"`
	AdminID   string    `json:"admin_id"`
	ExpiresAt time.Time `json:"expires_at"`
	IP        string    `json:"ip"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
}

// ConsumeMFAChallenge atomically consumes one unexpired MFA challenge.
func (s *Store) ConsumeMFAChallenge(ctx context.Context, tokenHash string) (*store.MFAChallenge, error) {
	raw, err := s.client.GetDel(ctx, s.mfaChallengeKey(tokenHash)).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}
	var challenge mfaChallenge
	if err := json.Unmarshal(raw, &challenge); err != nil {
		return nil, err
	}
	if challenge.ExpiresAt.Before(time.Now()) {
		return nil, store.ErrNotFound
	}
	consumedAt := time.Now()
	return &store.MFAChallenge{
		ID:         challenge.ID,
		AdminID:    challenge.AdminID,
		ExpiresAt:  challenge.ExpiresAt,
		ConsumedAt: &consumedAt,
	}, nil
}

func (s *Store) saveSession(ctx context.Context, session redisSession) error {
	payload, err := json.Marshal(session)
	if err != nil {
		return err
	}
	ttl := ttlUntil(session.ExpiresAt)
	pipe := s.client.TxPipeline()
	pipe.Set(ctx, s.sessionKey(session.ID), payload, ttl)
	pipe.Set(ctx, s.refreshKey(session.RefreshTokenHash), session.ID, ttl)
	pipe.SAdd(ctx, s.adminSessionsKey(session.AdminID), session.ID)
	pipe.SAdd(ctx, s.sessionsIndexKey(), session.ID)
	pipe.Expire(ctx, s.adminSessionsKey(session.AdminID), s.indexTTL())
	pipe.Expire(ctx, s.sessionsIndexKey(), s.indexTTL())
	_, err = pipe.Exec(ctx)
	return err
}

func (s *Store) getRedisSession(ctx context.Context, id string) (redisSession, error) {
	raw, err := s.client.Get(ctx, s.sessionKey(id)).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return redisSession{}, store.ErrNotFound
		}
		return redisSession{}, err
	}
	var session redisSession
	if err := json.Unmarshal(raw, &session); err != nil {
		return redisSession{}, err
	}
	if session.ExpiresAt.Before(time.Now()) {
		s.removeSessionRefs(ctx, session)
		return redisSession{}, store.ErrNotFound
	}
	return session, nil
}

func (s *Store) sessionsFromIDs(ctx context.Context, ids []string, activeOnly bool, limit int) ([]store.Session, error) {
	now := time.Now()
	out := make([]store.Session, 0, len(ids))
	for _, id := range ids {
		session, err := s.getRedisSession(ctx, id)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				continue
			}
			return nil, err
		}
		if activeOnly && (session.RevokedAt != nil || session.ExpiresAt.Before(now)) {
			continue
		}
		out = append(out, *session.toPublic())
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].LastSeenAt.After(out[j].LastSeenAt)
	})
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (s *Store) removeSessionRefs(ctx context.Context, session redisSession) {
	pipe := s.client.Pipeline()
	pipe.Del(ctx, s.sessionKey(session.ID), s.refreshKey(session.RefreshTokenHash))
	pipe.SRem(ctx, s.adminSessionsKey(session.AdminID), session.ID)
	pipe.SRem(ctx, s.sessionsIndexKey(), session.ID)
	_, _ = pipe.Exec(ctx)
}

func (s redisSession) toPublic() *store.Session {
	var accessJTI *string
	if s.AccessJTI != "" {
		accessJTI = &s.AccessJTI
	}
	return &store.Session{
		ID:            s.ID,
		AdminID:       s.AdminID,
		AccessJTI:     accessJTI,
		UserAgent:     s.UserAgent,
		IP:            s.IP,
		ExpiresAt:     s.ExpiresAt,
		LastSeenAt:    s.LastSeenAt,
		RevokedAt:     s.RevokedAt,
		RevokedReason: s.RevokedReason,
		CreatedAt:     s.CreatedAt,
	}
}

func ttlUntil(t time.Time) time.Duration {
	ttl := time.Until(t)
	if ttl <= 0 {
		return time.Second
	}
	return ttl
}

func (s *Store) indexTTL() time.Duration {
	if s.refreshTTL <= 0 {
		return 31 * 24 * time.Hour
	}
	return s.refreshTTL + 24*time.Hour
}

func (s *Store) sessionKey(id string) string {
	return s.prefix + ":session:" + id
}

func (s *Store) refreshKey(hash string) string {
	return s.prefix + ":session_by_refresh:" + hash
}

func (s *Store) adminSessionsKey(adminID string) string {
	return s.prefix + ":admin_sessions:" + adminID
}

func (s *Store) sessionsIndexKey() string {
	return s.prefix + ":sessions:index"
}

func (s *Store) mfaChallengeKey(hash string) string {
	return s.prefix + ":mfa_challenge:" + hash
}
