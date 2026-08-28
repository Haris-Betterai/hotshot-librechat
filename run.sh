#!/usr/bin/env bash
# Start Hotshot LibreChat locally against the live MongoDB.
#
# Full guide: LOCAL_DEV.md
#
# Usage:
#   ./run.sh           # start tunnel + stack, wait until ready
#   ./run.sh build     # rebuild the librechat image after code changes
#   ./run.sh down      # stop local stack (keeps SSH tunnel)
#   ./run.sh restart   # recreate api + admin-panel
#   ./run.sh status    # show containers + health
#   ./run.sh tunnel    # only ensure SSH tunnel is up
#
# Requires .env. Creates docker-compose.local.yml from the example if missing
# so the API uses the SSH-tunneled live Mongo (where Hotshot Secret AI lives).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SERVER_SSH="${SERVER_SSH:-root@187.77.205.200}"
TUNNEL_LOCAL_PORT="${TUNNEL_LOCAL_PORT:-27018}"
TUNNEL_REMOTE="127.0.0.1:27017"
ADMIN_URL="${ADMIN_URL:-http://localhost:3000}"

port_from_dotenv() {
  local line value
  line="$(grep -E '^[[:space:]]*PORT=' .env 2>/dev/null | tail -1 || true)"
  value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

# Same port as the server (.env PORT, default 6041). Do not remap to 3080.
APP_URL="${APP_URL:-http://localhost:$(port_from_dotenv)}"
APP_URL="${APP_URL%/}"
if [[ "$APP_URL" == "http://localhost:" ]]; then
  APP_URL="http://localhost:6041"
fi

# UID is readonly in bash — pass via env when invoking compose
HOST_UID="$(id -u)"
HOST_GID="$(id -g)"
export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml:docker-compose.override.yml:docker-compose.local.yml}"

log() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

compose() {
  env UID="$HOST_UID" GID="$HOST_GID" docker compose "$@"
}

ensure_docker() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi

  local err
  err="$(docker info 2>&1 || true)"

  if command -v colima >/dev/null 2>&1; then
    log "Starting Colima..."
    colima start
    docker info >/dev/null 2>&1 && return 0
  fi

  if printf '%s' "$err" | grep -qiE 'permission denied|connect: permission denied|dial unix .*docker.sock'; then
    die "Docker is running but your user cannot access it (permission denied on docker.sock).

Fix (pick one):
  1) Add yourself to the docker group (recommended), then log out/in or reboot:
       sudo usermod -aG docker \"\$USER\"
       newgrp docker
  2) Or test with: sudo docker info

Then re-run: ./run.sh"
  fi

  if ! command -v docker >/dev/null 2>&1; then
    die "Docker CLI not found. Install Docker Engine, then re-run ./run.sh"
  fi

  die "Docker daemon is not reachable. Check: sudo systemctl status docker
Then: docker info"
}

tunnel_up() {
  if lsof -nP -iTCP:"$TUNNEL_LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "SSH tunnel already on :${TUNNEL_LOCAL_PORT}"
    return 0
  fi
  # Bind 0.0.0.0 so Docker containers can reach the tunnel via host.docker.internal
  # (default SSH -L only listens on 127.0.0.1, which containers cannot use).
  log "Opening SSH tunnel 0.0.0.0:${TUNNEL_LOCAL_PORT} -> ${SERVER_SSH}:${TUNNEL_REMOTE}"
  ssh -o BatchMode=yes -o ExitOnForwardFailure=yes -fN \
    -L "0.0.0.0:${TUNNEL_LOCAL_PORT}:${TUNNEL_REMOTE}" \
    "$SERVER_SSH" \
    || die "Could not open SSH tunnel to ${SERVER_SSH}"
  log "Tunnel ready"
}

wait_http() {
  local url="$1"
  local label="$2"
  local i
  for i in $(seq 1 60); do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      log "${label} ready: ${url}"
      return 0
    fi
    sleep 2
  done
  die "${label} did not become ready: ${url}"
}

cmd_status() {
  compose ps
  echo
  if curl -fsS --max-time 3 "${APP_URL}/api/config" >/tmp/librechat-config.json 2>/dev/null; then
    python3 - <<'PY'
import json
d=json.load(open("/tmp/librechat-config.json"))
print("appTitle:", d.get("appTitle"))
specs=(d.get("modelSpecs") or {}).get("list") or []
for s in specs:
    preset=s.get("preset") or {}
    print("modelSpec:", s.get("name"), "default=", s.get("default"), "agent_id=", preset.get("agent_id") or preset.get("model"))
if not specs:
    print("modelSpecs: (none)")
PY
  else
    log "API not reachable at ${APP_URL}"
  fi
  if lsof -nP -iTCP:"$TUNNEL_LOCAL_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "tunnel: up on :${TUNNEL_LOCAL_PORT}"
  else
    log "tunnel: down — Hotshot agent will not load from live Mongo"
  fi
}

ensure_local_compose() {
  if [[ -f docker-compose.local.yml ]]; then
    return 0
  fi
  [[ -f docker-compose.local.yml.example ]] \
    || die "Missing docker-compose.local.yml.example (live Mongo tunnel template)"
  cp docker-compose.local.yml.example docker-compose.local.yml
  log "Created docker-compose.local.yml from example (points API at live Mongo via :${TUNNEL_LOCAL_PORT})"
}

ensure_data_dirs() {
  local dir
  for dir in logs uploads images skill; do
    mkdir -p "$dir"
  done
  # Container runs as host UID:GID; root-owned bind mounts cause EACCES on log files.
  if [[ -O logs && -O uploads && -O images ]]; then
    return 0
  fi
  if chown -R "${HOST_UID}:${HOST_GID}" logs uploads images skill 2>/dev/null; then
    return 0
  fi
  die "Permission denied on ./logs (or uploads/images). Fix with:
  sudo chown -R \"\$(id -u):\$(id -g)\" logs uploads images skill
Then re-run: ./run.sh"
}

refresh_guest_index() {
  # Bind-mounted guest HTML must match JS hashes inside the librechat image.
  # After a rebuild, old hashes 404 (Staff login JS never loads).
  if ! docker image inspect librechat >/dev/null 2>&1; then
    return 0
  fi
  [[ -f admin-branding/guest/index.html ]] || return 0
  log "Refreshing admin-branding/guest/index.html from librechat image..."
  if ! docker run --rm --entrypoint cat librechat /app/client/dist/index.html \
    > admin-branding/guest/index.html; then
    die "Image librechat is missing /app/client/dist/index.html (frontend build did not land in the image).
Rebuild with:
  ./run.sh build
Then:
  ./run.sh restart"
  fi
  sed -i 's#<title>[^<]*</title>#<title>Hotshot AI</title>#' admin-branding/guest/index.html || true
}

cmd_up() {
  ensure_docker
  [[ -f .env ]] || die "Missing .env — copy from .env.example first"
  ensure_local_compose
  ensure_data_dirs
  tunnel_up
  refresh_guest_index
  log "Starting containers (API -> host.docker.internal:${TUNNEL_LOCAL_PORT}/LibreChat)..."
  compose up -d
  wait_http "${APP_URL}/api/config" "LibreChat"
  log ""
  log "Guest:  ${APP_URL}"
  log "Admin:  ${ADMIN_URL}"
  log ""
  log "Hotshot Secret AI comes from live Mongo — keep the tunnel up."
  log "Re-run ./run.sh tunnel if it drops."
}

cmd_down() {
  ensure_docker
  compose down
  log "Stack stopped. SSH tunnel left running (kill via: lsof -tiTCP:${TUNNEL_LOCAL_PORT} | xargs kill)."
}

cmd_build() {
  ensure_docker
  log "Building librechat image (do not set UID=... — it is readonly in bash)..."
  compose build api
}

cmd_restart() {
  ensure_docker
  tunnel_up
  refresh_guest_index
  compose up -d --force-recreate api admin-panel
  wait_http "${APP_URL}/api/config" "LibreChat"
  log "Restarted. Guest ${APP_URL} · Admin ${ADMIN_URL}"
}

main() {
  local cmd="${1:-up}"
  case "$cmd" in
    up|start|run) cmd_up ;;
    down|stop) cmd_down ;;
    build) cmd_build ;;
    restart) cmd_restart ;;
    status|ps) cmd_status ;;
    tunnel) ensure_docker; tunnel_up ;;
    -h|--help|help)
      cat <<'EOF'
Start Hotshot LibreChat locally against the live MongoDB.

  ./run.sh           start SSH tunnel + Docker stack
  ./run.sh build     rebuild the librechat image (needed after code changes)
  ./run.sh down      stop containers (tunnel keeps running)
  ./run.sh restart   recreate api + admin-panel
  ./run.sh status    containers + tunnel
  ./run.sh tunnel    ensure SSH tunnel only

Guide: LOCAL_DEV.md
EOF
      ;;
    *)
      die "Unknown command: $cmd (try: up|down|restart|status|tunnel)"
      ;;
  esac
}

main "$@"
