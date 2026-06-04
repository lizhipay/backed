package sessionstore

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/backed/backend/internal/store"
	"github.com/redis/go-redis/v9"
)

func newTestStore(t *testing.T) (*Store, func()) {
	t.Helper()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	return New(client, "backed:test", time.Hour), func() {
		_ = client.Close()
		server.Close()
	}
}

func TestSessionRefreshRotationAndRevocation(t *testing.T) {
	ctx := context.Background()
	sessions, cleanup := newTestStore(t)
	defer cleanup()

	expiresAt := time.Now().Add(time.Hour)
	id, err := sessions.CreateSession(ctx, CreateSessionParams{
		AdminID:          "admin-1",
		RefreshTokenHash: "hash-a",
		AccessJTI:        "jti-a",
		UserAgent:        "test-agent",
		IP:               "127.0.0.1",
		ExpiresAt:        expiresAt,
	})
	if err != nil {
		t.Fatalf("CreateSession: %v", err)
	}

	loaded, err := sessions.GetSessionByRefreshHash(ctx, "hash-a")
	if err != nil {
		t.Fatalf("GetSessionByRefreshHash: %v", err)
	}
	if loaded.ID != id || loaded.AdminID != "admin-1" {
		t.Fatalf("loaded session mismatch: %#v", loaded)
	}

	if err := sessions.RotateSession(ctx, id, "hash-b", "jti-b", expiresAt); err != nil {
		t.Fatalf("RotateSession: %v", err)
	}
	if _, err := sessions.GetSessionByRefreshHash(ctx, "hash-a"); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("old refresh hash should be invalid, got %v", err)
	}
	if _, err := sessions.GetSessionByRefreshHash(ctx, "hash-b"); err != nil {
		t.Fatalf("new refresh hash should load session: %v", err)
	}

	if err := sessions.RevokeSession(ctx, id, "test_revoke"); err != nil {
		t.Fatalf("RevokeSession: %v", err)
	}
	if _, err := sessions.GetSessionByRefreshHash(ctx, "hash-b"); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("revoked refresh hash should be invalid, got %v", err)
	}
	revoked, err := sessions.GetSession(ctx, id)
	if err != nil {
		t.Fatalf("GetSession after revoke: %v", err)
	}
	if revoked.RevokedAt == nil || revoked.RevokedReason == nil || *revoked.RevokedReason != "test_revoke" {
		t.Fatalf("revoked fields were not preserved: %#v", revoked)
	}

	all, err := sessions.ListSessionsForAdmin(ctx, "admin-1", false)
	if err != nil {
		t.Fatalf("ListSessionsForAdmin: %v", err)
	}
	if len(all) != 1 {
		t.Fatalf("expected revoked session in history, got %d", len(all))
	}
	active, err := sessions.ListSessionsForAdmin(ctx, "admin-1", true)
	if err != nil {
		t.Fatalf("ListSessionsForAdmin active: %v", err)
	}
	if len(active) != 0 {
		t.Fatalf("expected no active sessions, got %d", len(active))
	}
}

func TestMFAChallengeIsSingleUse(t *testing.T) {
	ctx := context.Background()
	sessions, cleanup := newTestStore(t)
	defer cleanup()

	expiresAt := time.Now().Add(5 * time.Minute)
	id, err := sessions.CreateMFAChallenge(ctx, "admin-1", "token-hash", expiresAt, "127.0.0.1", "test-agent")
	if err != nil {
		t.Fatalf("CreateMFAChallenge: %v", err)
	}

	challenge, err := sessions.ConsumeMFAChallenge(ctx, "token-hash")
	if err != nil {
		t.Fatalf("ConsumeMFAChallenge: %v", err)
	}
	if challenge.ID != id || challenge.AdminID != "admin-1" || challenge.ConsumedAt == nil {
		t.Fatalf("challenge mismatch: %#v", challenge)
	}
	if _, err := sessions.ConsumeMFAChallenge(ctx, "token-hash"); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("challenge should be single-use, got %v", err)
	}
}
