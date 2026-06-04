package auth

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strings"
)

// encPrefix tags a stored value as ciphertext produced by SecretCipher. Values
// without this prefix are treated as not-encrypted so we never attempt to
// decrypt arbitrary plaintext.
const encPrefix = "enc:v1:"

// ErrNotEncrypted is returned when Decrypt is given a value lacking encPrefix.
var ErrNotEncrypted = errors.New("value is not encrypted")

// SecretCipher performs authenticated symmetric encryption of small secrets
// (such as TOTP shared secrets) using AES-GCM. The key never touches disk; it
// is supplied via the environment and held only in memory.
type SecretCipher struct {
	aead cipher.AEAD
}

// NewSecretCipher builds a cipher from a key string. The key may be supplied as
// hex or standard base64 and must decode to 16, 24, or 32 bytes (AES-128/192/256).
// An empty or malformed key is an error, which callers surface only when an MFA
// operation is actually requested.
func NewSecretCipher(key string) (*SecretCipher, error) {
	raw, err := decodeKey(key)
	if err != nil {
		return nil, err
	}
	switch len(raw) {
	case 16, 24, 32:
	default:
		return nil, fmt.Errorf("encryption key must decode to 16, 24, or 32 bytes, got %d", len(raw))
	}
	block, err := aes.NewCipher(raw)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &SecretCipher{aead: aead}, nil
}

// decodeKey accepts hex first (when the input is valid hex of the right length)
// and falls back to standard base64, then raw bytes.
func decodeKey(key string) ([]byte, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, errors.New("encryption key is empty")
	}
	if b, err := hex.DecodeString(key); err == nil && (len(b) == 16 || len(b) == 24 || len(b) == 32) {
		return b, nil
	}
	if b, err := base64.StdEncoding.DecodeString(key); err == nil && (len(b) == 16 || len(b) == 24 || len(b) == 32) {
		return b, nil
	}
	// Fall back to raw bytes so a 32-character passphrase also works.
	return []byte(key), nil
}

// Encrypt seals plaintext and returns a prefixed, base64-encoded token.
func (c *SecretCipher) Encrypt(plaintext string) (string, error) {
	nonce := make([]byte, c.aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	sealed := c.aead.Seal(nonce, nonce, []byte(plaintext), nil)
	return encPrefix + base64.RawStdEncoding.EncodeToString(sealed), nil
}

// Decrypt reverses Encrypt. It returns ErrNotEncrypted if the value was not
// produced by Encrypt (missing prefix).
func (c *SecretCipher) Decrypt(stored string) (string, error) {
	if !strings.HasPrefix(stored, encPrefix) {
		return "", ErrNotEncrypted
	}
	sealed, err := base64.RawStdEncoding.DecodeString(strings.TrimPrefix(stored, encPrefix))
	if err != nil {
		return "", fmt.Errorf("decode ciphertext: %w", err)
	}
	ns := c.aead.NonceSize()
	if len(sealed) < ns {
		return "", errors.New("ciphertext too short")
	}
	nonce, ct := sealed[:ns], sealed[ns:]
	plain, err := c.aead.Open(nil, nonce, ct, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: %w", err)
	}
	return string(plain), nil
}

// IsEncrypted reports whether a stored value carries the ciphertext prefix.
func IsEncrypted(stored string) bool {
	return strings.HasPrefix(stored, encPrefix)
}
