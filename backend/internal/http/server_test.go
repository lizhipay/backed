package httpapi

import (
	"errors"
	"testing"

	"github.com/backed/backend/internal/config"
)

func TestMFACipherFromConfigUsesDerivedDevelopmentKey(t *testing.T) {
	cipher, err := mfaCipherFromConfig(&config.Config{
		AppEnv:        "development",
		RefreshSecret: []byte("refresh-secret-for-development"),
	})
	if err != nil {
		t.Fatalf("mfaCipherFromConfig: %v", err)
	}
	encrypted, err := cipher.Encrypt("totp-secret")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	decrypted, err := cipher.Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if decrypted != "totp-secret" {
		t.Fatalf("decrypted secret mismatch: %q", decrypted)
	}
}

func TestMFACipherFromConfigRequiresProductionKey(t *testing.T) {
	_, err := mfaCipherFromConfig(&config.Config{
		AppEnv:        "production",
		RefreshSecret: []byte("refresh-secret-for-production"),
	})
	if !errors.Is(err, errMFANotConfigured) {
		t.Fatalf("expected errMFANotConfigured, got %v", err)
	}
}

func TestMFACipherFromConfigRejectsInvalidExplicitKey(t *testing.T) {
	_, err := mfaCipherFromConfig(&config.Config{
		AppEnv:                 "development",
		RefreshSecret:          []byte("refresh-secret-for-development"),
		MFASecretEncryptionKey: "too-short",
	})
	if err == nil {
		t.Fatal("expected invalid explicit MFA key error")
	}
}
