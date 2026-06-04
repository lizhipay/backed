package response

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

// Envelope is the uniform success response body.
type Envelope struct {
	Data any   `json:"data,omitempty"`
	Meta *Meta `json:"meta,omitempty"`
}

// Meta carries pagination metadata for list endpoints.
type Meta struct {
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
	Total    int64 `json:"total"`
}

// ErrorBody is the uniform error response body.
type ErrorBody struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail describes a single error returned to the client.
type ErrorDetail struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Fields  map[string]any `json:"fields,omitempty"`
}

// APIError is an error that maps cleanly onto an HTTP status and error code.
type APIError struct {
	Status  int
	Code    string
	Message string
	Fields  map[string]any
}

func (e *APIError) Error() string { return e.Message }

// New builds an APIError.
func New(status int, code, message string) *APIError {
	return &APIError{Status: status, Code: code, Message: message}
}

// Common constructors for frequently used errors.
func BadRequest(msg string) *APIError   { return New(http.StatusBadRequest, "bad_request", msg) }
func Unauthorized(msg string) *APIError { return New(http.StatusUnauthorized, "unauthorized", msg) }
func Forbidden(msg string) *APIError    { return New(http.StatusForbidden, "forbidden", msg) }
func NotFound(msg string) *APIError     { return New(http.StatusNotFound, "not_found", msg) }
func Conflict(msg string) *APIError     { return New(http.StatusConflict, "conflict", msg) }
func Internal(msg string) *APIError     { return New(http.StatusInternalServerError, "internal", msg) }

// WithFields attaches field-level validation detail.
func (e *APIError) WithFields(f map[string]any) *APIError {
	e.Fields = f
	return e
}

// JSON writes a success payload with the given status code.
func JSON(w http.ResponseWriter, status int, data any) {
	write(w, status, Envelope{Data: data})
}

// List writes a paginated success payload.
func List(w http.ResponseWriter, data any, meta *Meta) {
	write(w, http.StatusOK, Envelope{Data: data, Meta: meta})
}

// Error inspects err and writes the appropriate error envelope. Unknown errors
// are surfaced as 500 without leaking internal detail.
func Error(w http.ResponseWriter, logger *slog.Logger, err error) {
	var apiErr *APIError
	if errors.As(err, &apiErr) {
		if apiErr.Status >= 500 && logger != nil {
			logger.Error("request failed", "code", apiErr.Code, "err", apiErr.Message)
		}
		write(w, apiErr.Status, ErrorBody{Error: ErrorDetail{
			Code:    apiErr.Code,
			Message: apiErr.Message,
			Fields:  apiErr.Fields,
		}})
		return
	}
	if logger != nil {
		logger.Error("unhandled error", "err", err.Error())
	}
	write(w, http.StatusInternalServerError, ErrorBody{Error: ErrorDetail{
		Code:    "internal",
		Message: "internal server error",
	}})
}

func write(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if body != nil {
		_ = json.NewEncoder(w).Encode(body)
	}
}
