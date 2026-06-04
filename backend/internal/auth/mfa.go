package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

// TOTPIssuer is the label shown in authenticator apps for enrolled secrets.
const TOTPIssuer = "Backed Admin"

// GenerateTOTPSecret creates a new TOTP key for the given account name and
// returns the base32 secret and the otpauth:// provisioning URI.
func GenerateTOTPSecret(accountName string) (secret, otpauthURL string, err error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      TOTPIssuer,
		AccountName: accountName,
	})
	if err != nil {
		return "", "", err
	}
	return key.Secret(), key.URL(), nil
}

// OTPAuthURL rebuilds the provisioning URI from a stored secret so a QR code can
// be regenerated without persisting the full URL.
func OTPAuthURL(secret, accountName string) (string, error) {
	key, err := otp.NewKeyFromURL(fmt.Sprintf(
		"otpauth://totp/%s:%s?secret=%s&issuer=%s",
		TOTPIssuer, accountName, secret, TOTPIssuer))
	if err != nil {
		return "", err
	}
	return key.URL(), nil
}

// ValidateTOTP reports whether code is a currently-valid 6-digit TOTP for secret.
func ValidateTOTP(secret, code string) bool {
	return totp.Validate(strings.TrimSpace(code), secret)
}

// recoveryCodeGroups/length define the human-friendly format XXXX-XXXX.
const (
	recoveryCodeGroups = 2
	recoveryGroupLen   = 4
)

// recoveryAlphabet excludes easily confused characters (0/O, 1/I/L).
const recoveryAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

// GenerateRecoveryCodes returns n fresh, human-readable recovery codes.
func GenerateRecoveryCodes(n int) ([]string, error) {
	codes := make([]string, 0, n)
	for i := 0; i < n; i++ {
		code, err := oneRecoveryCode()
		if err != nil {
			return nil, err
		}
		codes = append(codes, code)
	}
	return codes, nil
}

func oneRecoveryCode() (string, error) {
	total := recoveryCodeGroups * recoveryGroupLen
	buf := make([]byte, total)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	var sb strings.Builder
	for i := 0; i < total; i++ {
		if i > 0 && i%recoveryGroupLen == 0 {
			sb.WriteByte('-')
		}
		sb.WriteByte(recoveryAlphabet[int(buf[i])%len(recoveryAlphabet)])
	}
	return sb.String(), nil
}

// NormalizeRecoveryCode strips formatting so codes compare regardless of case or
// dashes the user may have typed.
func NormalizeRecoveryCode(code string) string {
	code = strings.ToUpper(strings.TrimSpace(code))
	code = strings.ReplaceAll(code, "-", "")
	code = strings.ReplaceAll(code, " ", "")
	return code
}

// HashRecoveryCode returns a stable SHA-256 hex hash of the normalized code,
// suitable for storage and constant-time comparison. Recovery codes are high
// entropy, so a fast hash is acceptable here (unlike user passwords).
func HashRecoveryCode(code string) string {
	sum := sha256.Sum256([]byte(NormalizeRecoveryCode(code)))
	return hex.EncodeToString(sum[:])
}

// RecoveryCodeMatches reports whether two recovery-code hashes are equal in
// constant time.
func RecoveryCodeMatches(hashA, hashB string) bool {
	return subtle.ConstantTimeCompare([]byte(hashA), []byte(hashB)) == 1
}
