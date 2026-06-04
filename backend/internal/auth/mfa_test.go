package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/pquerna/otp/totp"
)

func TestSecretCipherRoundTrip(t *testing.T) {
	c, err := NewSecretCipher("0123456789abcdef0123456789abcdef") // 32 raw bytes
	if err != nil {
		t.Fatalf("NewSecretCipher: %v", err)
	}
	const plaintext = "JBSWY3DPEHPK3PXP"
	enc, err := c.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if !strings.HasPrefix(enc, encPrefix) {
		t.Fatalf("ciphertext missing prefix: %q", enc)
	}
	if !IsEncrypted(enc) {
		t.Fatalf("IsEncrypted false for ciphertext")
	}
	if enc == plaintext || strings.Contains(enc, plaintext) {
		t.Fatalf("ciphertext leaks plaintext")
	}
	got, err := c.Decrypt(enc)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if got != plaintext {
		t.Fatalf("round trip mismatch: got %q want %q", got, plaintext)
	}
}

func TestSecretCipherEncryptIsNondeterministic(t *testing.T) {
	c, _ := NewSecretCipher("0123456789abcdef0123456789abcdef")
	a, _ := c.Encrypt("same")
	b, _ := c.Encrypt("same")
	if a == b {
		t.Fatalf("expected distinct ciphertexts for repeated encryption (nonce reuse?)")
	}
}

func TestSecretCipherDecryptRejectsPlaintext(t *testing.T) {
	c, _ := NewSecretCipher("0123456789abcdef0123456789abcdef")
	if _, err := c.Decrypt("not-encrypted"); err != ErrNotEncrypted {
		t.Fatalf("expected ErrNotEncrypted, got %v", err)
	}
}

func TestSecretCipherWrongKeyFails(t *testing.T) {
	c1, _ := NewSecretCipher("0123456789abcdef0123456789abcdef")
	c2, _ := NewSecretCipher("ffffffffffffffffffffffffffffffff")
	enc, _ := c1.Encrypt("secret")
	if _, err := c2.Decrypt(enc); err == nil {
		t.Fatalf("expected decryption with wrong key to fail")
	}
}

func TestNewSecretCipherRejectsBadKey(t *testing.T) {
	if _, err := NewSecretCipher(""); err == nil {
		t.Fatalf("expected error for empty key")
	}
	if _, err := NewSecretCipher("tooshort"); err == nil {
		t.Fatalf("expected error for short key")
	}
}

func TestNewSecretCipherAcceptsHexAndBase64(t *testing.T) {
	if _, err := NewSecretCipher("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"); err != nil {
		t.Fatalf("hex 32-byte key rejected: %v", err)
	}
	// 32 raw bytes base64-encoded.
	if _, err := NewSecretCipher("MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="); err != nil {
		t.Fatalf("base64 key rejected: %v", err)
	}
}

func TestValidateTOTP(t *testing.T) {
	secret, url, err := GenerateTOTPSecret("admin@backed.local")
	if err != nil {
		t.Fatalf("GenerateTOTPSecret: %v", err)
	}
	if !strings.HasPrefix(url, "otpauth://totp/") {
		t.Fatalf("unexpected otpauth url: %q", url)
	}
	code, err := totp.GenerateCode(secret, time.Now())
	if err != nil {
		t.Fatalf("GenerateCode: %v", err)
	}
	if !ValidateTOTP(secret, code) {
		t.Fatalf("valid code rejected")
	}
	if ValidateTOTP(secret, "000000") && code != "000000" {
		t.Fatalf("clearly wrong code accepted")
	}
}

func TestRecoveryCodeHashingAndNormalization(t *testing.T) {
	codes, err := GenerateRecoveryCodes(10)
	if err != nil {
		t.Fatalf("GenerateRecoveryCodes: %v", err)
	}
	if len(codes) != 10 {
		t.Fatalf("expected 10 codes, got %d", len(codes))
	}
	seen := map[string]bool{}
	for _, c := range codes {
		if seen[c] {
			t.Fatalf("duplicate recovery code generated: %q", c)
		}
		seen[c] = true
	}
	// Normalization: dashed/lowercased input hashes the same as canonical form.
	c := codes[0]
	if HashRecoveryCode(c) != HashRecoveryCode(strings.ToLower(c)) {
		t.Fatalf("hash not case-insensitive")
	}
	noDash := strings.ReplaceAll(c, "-", "")
	if HashRecoveryCode(c) != HashRecoveryCode(noDash) {
		t.Fatalf("hash sensitive to dashes")
	}
	if HashRecoveryCode(c) == HashRecoveryCode(codes[1]) {
		t.Fatalf("distinct codes hash equal")
	}
	if !RecoveryCodeMatches(HashRecoveryCode(c), HashRecoveryCode(c)) {
		t.Fatalf("matching hashes reported unequal")
	}
}
