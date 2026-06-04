package auth

import (
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestHashPasswordUsesArgon2id(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}
	if !strings.HasPrefix(hash, "$argon2id$") {
		t.Fatalf("expected argon2id hash, got %q", hash)
	}
	if err := VerifyPassword(hash, "correct horse battery staple"); err != nil {
		t.Fatalf("VerifyPassword rejected matching password: %v", err)
	}
	if err := VerifyPassword(hash, "wrong password"); err != ErrInvalidCredentials {
		t.Fatalf("expected invalid credentials for wrong password, got %v", err)
	}
}

func TestVerifyPasswordAcceptsLegacyBcrypt(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("legacy password"), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("bcrypt hash failed: %v", err)
	}
	if err := VerifyPassword(string(hash), "legacy password"); err != nil {
		t.Fatalf("VerifyPassword rejected legacy bcrypt hash: %v", err)
	}
}
