#!/usr/bin/env bash

set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${DEV_ENV_FILE:-$ROOT_DIR/.env.local}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

set -u

export APP_ENV="${APP_ENV:-development}"
export APP_PORT="${APP_PORT:-5175}"
export ADMIN_BASE_PATH="${ADMIN_BASE_PATH:-/admin}"
export ADMIN_FRONTEND_DIR="${ADMIN_FRONTEND_DIR:-$ROOT_DIR/frontend/dist}"
export VITE_ADMIN_BASE="${VITE_ADMIN_BASE:-$ADMIN_BASE_PATH}"
export CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-http://127.0.0.1:$APP_PORT,http://localhost:$APP_PORT,http://localhost:5173}"
export REDIS_DB="${REDIS_DB:-0}"
export REDIS_KEY_PREFIX="${REDIS_KEY_PREFIX:-backed:admin}"

missing_env=()
if [[ -z "${DATABASE_URL:-}" ]]; then
  missing_env+=("DATABASE_URL")
fi
if [[ -z "${JWT_SECRET:-}" ]]; then
  missing_env+=("JWT_SECRET")
fi
if [[ -z "${REFRESH_TOKEN_SECRET:-}" ]]; then
  missing_env+=("REFRESH_TOKEN_SECRET")
fi
if [[ -z "${REDIS_ADDR:-}" ]]; then
  missing_env+=("REDIS_ADDR")
fi

if (( ${#missing_env[@]} > 0 )); then
  echo "Missing required environment: ${missing_env[*]}" >&2
  echo "Copy .env.example to .env.local, fill the values, then run ./dev.sh again." >&2
  exit 1
fi

export DATABASE_URL JWT_SECRET REFRESH_TOKEN_SECRET REDIS_ADDR
export REDIS_PASSWORD="${REDIS_PASSWORD:-}"

if (( ${#JWT_SECRET} < 16 )); then
  echo "JWT_SECRET must be at least 16 bytes." >&2
  exit 1
fi

if (( ${#REFRESH_TOKEN_SECRET} < 16 )); then
  echo "REFRESH_TOKEN_SECRET must be at least 16 bytes." >&2
  exit 1
fi

if command -v lsof >/dev/null 2>&1; then
  port_pids="$(lsof -tiTCP:"$APP_PORT" -sTCP:LISTEN || true)"
  if [[ -n "$port_pids" ]]; then
    echo "Port $APP_PORT is already in use:" >&2
    lsof -nP -iTCP:"$APP_PORT" -sTCP:LISTEN >&2 || true
    if [[ "${DEV_KILL_PORT:-1}" != "0" ]]; then
      echo "Stopping process(es) on port $APP_PORT..."
      kill $port_pids
      for _ in {1..10}; do
        sleep 1
        port_pids="$(lsof -tiTCP:"$APP_PORT" -sTCP:LISTEN || true)"
        if [[ -z "$port_pids" ]]; then
          break
        fi
      done
      if [[ -n "$port_pids" ]]; then
        echo "Port $APP_PORT is still in use after waiting." >&2
        lsof -nP -iTCP:"$APP_PORT" -sTCP:LISTEN >&2 || true
        exit 1
      fi
    else
      echo >&2
      echo "Set DEV_KILL_PORT=1 or unset DEV_KILL_PORT to stop the existing process automatically." >&2
      exit 1
    fi
  fi
fi

echo "Building frontend for $ADMIN_BASE_PATH..."
(
  cd "$ROOT_DIR/frontend"
  VITE_ADMIN_BASE="$VITE_ADMIN_BASE" npm run build
)

echo "Starting Go API at http://127.0.0.1:$APP_PORT$ADMIN_BASE_PATH"
echo "Press Ctrl+C to stop."
(
  cd "$ROOT_DIR/backend"
  go run ./cmd/api
)
