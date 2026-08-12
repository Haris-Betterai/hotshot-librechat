#!/usr/bin/env bash
# Deploy Hotshot LibreChat on the SERVER after you git push from your laptop.
#
# On the server:
#   ./deploy.sh          # git pull main + rebuild/restart app
#   ./deploy.sh pull     # only git pull (yaml/branding; no image rebuild)
#   ./deploy.sh restart  # restart containers only
#   ./deploy.sh status   # show git + containers
#
# Full flow: WORKFLOW.md

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

BRANCH="${DEPLOY_BRANCH:-main}"
APP_URL="${APP_URL:-http://127.0.0.1:6041}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml:docker-compose.override.yml}"
export COMPOSE_FILE

HOST_UID="$(id -u)"
HOST_GID="$(id -g)"

log() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

compose() {
  env UID="$HOST_UID" GID="$HOST_GID" docker compose "$@"
}

ensure_server() {
  [[ -f docker-compose.yml ]] || die "Run this from the hotshot-librechat repo root"
  [[ -f .env ]] || die "Missing .env on the server"
  # Local-dev overlay must NOT be used on the server (that points at a laptop tunnel).
  if [[ -f docker-compose.local.yml ]]; then
    die "docker-compose.local.yml exists on the server — remove/rename it. Server uses its own Mongo, not the tunnel overlay."
  fi
}

cmd_status() {
  log "branch: $(git branch --show-current) @ $(git rev-parse --short HEAD)"
  log "remote: $(git rev-parse --short "origin/${BRANCH}" 2>/dev/null || echo '?')"
  compose ps
  curl -fsS --max-time 5 "${APP_URL}/api/config" >/dev/null 2>&1 \
    && log "app: ok ${APP_URL}" \
    || log "app: not reachable at ${APP_URL}"
}

cmd_pull() {
  ensure_server
  log "Fetching + checking out ${BRANCH}..."
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git pull --ff-only origin "${BRANCH}"
  log "Now at $(git rev-parse --short HEAD)"
}

cmd_restart() {
  ensure_server
  log "Restarting api + admin-panel..."
  compose up -d --force-recreate api admin-panel
  wait_ready
}

wait_ready() {
  local i
  for i in $(seq 1 60); do
    if curl -fsS --max-time 2 "${APP_URL}/api/config" >/dev/null 2>&1; then
      log "LibreChat ready: ${APP_URL}"
      return 0
    fi
    sleep 2
  done
  die "LibreChat did not become ready at ${APP_URL} — check: docker logs LibreChat --tail 80"
}

cmd_deploy() {
  ensure_server
  cmd_pull
  log "Building + starting (this can take a while if UI/code changed)..."
  # Sync guest index hashes with the image about to be built is done AFTER build
  compose build api
  # After build, refresh bind-mounted guest index so asset hashes match this image
  if [[ -f admin-branding/guest/index.html ]]; then
    log "Refreshing admin-branding/guest/index.html from new image..."
    docker run --rm --entrypoint cat librechat /app/client/dist/index.html \
      > admin-branding/guest/index.html
    sed -i 's#<title>[^<]*</title>#<title>Hotshot AI</title>#' admin-branding/guest/index.html || true
  fi
  compose up -d
  wait_ready
  log ""
  log "Deploy done. Live site should reflect this commit."
  log "Commit: $(git rev-parse --short HEAD) on $(git branch --show-current)"
}

main() {
  local cmd="${1:-deploy}"
  case "$cmd" in
    deploy|up) cmd_deploy ;;
    pull) cmd_pull ;;
    restart) cmd_restart ;;
    status|ps) cmd_status ;;
    -h|--help|help)
      sed -n '2,12p' "$0"
      ;;
    *)
      die "Unknown command: $cmd (try: deploy|pull|restart|status)"
      ;;
  esac
}

main "$@"
