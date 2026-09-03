#!/usr/bin/env bash
# One-command setup for running Hotshot locally.
#
# Verifies .env, creates data directories, builds the image (first time
# only), and starts the stack. Run it from the repo root:
#
#   ./setup.sh
#
# Requires: .env present, Docker, Git, SSH access to the server (for the
# tunnel that reaches the live Mongo where Hotshot Secret AI lives).
#
# After first run, use ./run.sh for daily commands:
#   ./run.sh           start
#   ./run.sh build     rebuild after code changes
#   ./run.sh restart   restart without rebuilding
#   ./run.sh down      stop

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

# --- 1. .env must exist and have the required local settings ---------------
[[ -f .env ]] || die "Missing .env — place the .env file in this directory first."

REQUIRED=(
  "PORT="
  "DOMAIN_CLIENT="
  "DOMAIN_SERVER="
  "PUBLIC_GUEST_MODE="
)
for key in "${REQUIRED[@]}"; do
  grep -qE "^[[:space:]]*${key}" .env || die ".env is missing '${key}' — add it (see QUICKSTART.md Step 2)."
done

if ! grep -qE "^[[:space:]]*PORT=[0-9]+" .env; then
  die ".env PORT must be a number (e.g. PORT=6041) — see QUICKSTART.md Step 2."
fi

# Sensible local values if they are not already set (does not overwrite).
grep -qE "^[[:space:]]*DOMAIN_CLIENT=" .env || echo "DOMAIN_CLIENT=http://localhost:6041" >> .env
grep -qE "^[[:space:]]*DOMAIN_SERVER=" .env || echo "DOMAIN_SERVER=http://localhost:6041" >> .env
grep -qE "^[[:space:]]*PUBLIC_GUEST_MODE=" .env || echo "PUBLIC_GUEST_MODE=true" >> .env
log ".env OK"

# --- 2. Data directories -----------------------------------------------------
mkdir -p logs uploads images skill
for dir in logs uploads images skill; do
  if [[ ! -O "$dir" ]]; then
    if ! chown "$(id -u):$(id -g)" "$dir" 2>/dev/null; then
      die "Permission denied on ./$dir. Run:
  sudo chown -R \"\$(id -u):\$(id -g)\" logs uploads images skill
Then re-run: ./setup.sh"
    fi
  fi
done
log "Data directories ready"

# --- 3. Local compose overlay (points API at live Mongo via the tunnel) -----
if [[ ! -f docker-compose.local.yml ]]; then
  [[ -f docker-compose.local.yml.example ]] \
    || die "Missing docker-compose.local.yml.example"
  cp docker-compose.local.yml.example docker-compose.local.yml
  log "Created docker-compose.local.yml from the example."
fi

# --- 4. Build on first run (only if the image is missing) -------------------
if ! docker image inspect librechat >/dev/null 2>&1; then
  log "Building the librechat image for the first time (can take ~1 hour)..."
  ./run.sh build
else
  log "Image already built — skipping build."
fi

# --- 5. Start ----------------------------------------------------------------
log "Starting Hotshot..."
./run.sh

APP_PORT="$(grep -E '^[[:space:]]*PORT=' .env | tail -1 | tr -d '[:space:]' | cut -d= -f2)"
log ""
log "Done. Open http://localhost:${APP_PORT} in your browser."
log "Keep the tunnel up for Hotshot Secret AI — re-run ./run.sh tunnel if it drops."
