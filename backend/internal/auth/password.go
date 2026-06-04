package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
)

// ErrInvalidCredentials is returned when a password does not match a hash.
var ErrInvalidCredentials = errors.New("invalid credentials")

const (
	argonMemory      = 64 * 1024
	argonIterations  = 3
	argonParallelism = 2
	argonSaltLength  = 16
	argonKeyLength   = 32
)

// HashPassword returns an Argon2id hash of the plaintext password.
func HashPassword(plaintext string) (string, error) {
	if len(plaintext) < 8 {
		return "", errors.New("password must be at least 8 characters")
	}

	salt := make([]byte, argonSaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	key := argon2.IDKey([]byte(plaintext), salt, argonIterations, argonMemory, argonParallelism, argonKeyLength)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s",
		argonMemory,
		argonIterations,
		argonParallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

type argonParams struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
}

func parseArgon2idHash(hash string) (argonParams, []byte, []byte, error) {
	parts := strings.Split(hash, "$")
	if len(parts) != 6 || parts[1] != "argon2id" || parts[2] != "v=19" {
		return argonParams{}, nil, nil, errors.New("invalid argon2id hash")
	}

	params := argonParams{}
	for _, part := range strings.Split(parts[3], ",") {
		key, value, ok := strings.Cut(part, "=")
		if !ok {
			return argonParams{}, nil, nil, errors.New("invalid argon2id params")
		}
		n, err := strconv.ParseUint(value, 10, 32)
		if err != nil {
			return argonParams{}, nil, nil, errors.New("invalid argon2id params")
		}
		switch key {
		case "m":
			params.memory = uint32(n)
		case "t":
			params.iterations = uint32(n)
		case "p":
			if n > 255 {
				return argonParams{}, nil, nil, errors.New("invalid argon2id parallelism")
			}
			params.parallelism = uint8(n)
		default:
			return argonParams{}, nil, nil, errors.New("invalid argon2id params")
		}
	}
	if params.memory == 0 || params.iterations == 0 || params.parallelism == 0 {
		return argonParams{}, nil, nil, errors.New("invalid argon2id params")
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return argonParams{}, nil, nil, errors.New("invalid argon2id salt")
	}
	key, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return argonParams{}, nil, nil, errors.New("invalid argon2id key")
	}
	return params, salt, key, nil
}

// VerifyPassword reports whether plaintext matches the stored password hash.
func VerifyPassword(hash, plaintext string) error {
	if strings.HasPrefix(hash, "$argon2id$") {
		params, salt, key, err := parseArgon2idHash(hash)
		if err != nil {
			return ErrInvalidCredentials
		}
		candidate := argon2.IDKey([]byte(plaintext), salt, params.iterations, params.memory, params.parallelism, uint32(len(key)))
		if subtle.ConstantTimeCompare(candidate, key) != 1 {
			return ErrInvalidCredentials
		}
		return nil
	}

	// Legacy compatibility for any rows created before the Argon2id migration.
	if strings.HasPrefix(hash, "$2a$") || strings.HasPrefix(hash, "$2b$") || strings.HasPrefix(hash, "$2y$") {
		if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(plaintext)); err != nil {
			return ErrInvalidCredentials
		}
		return nil
	}

	if hash == "" {
		return ErrInvalidCredentials
	}
	return ErrInvalidCredentials
}
