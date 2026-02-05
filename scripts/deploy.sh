#!/bin/bash
###############################################################################
# Trading Forge - Production Deployment Script
# Usage: sudo ./scripts/deploy.sh [--no-pull] [--no-cache] [--rollback]
###############################################################################
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="database/backups"
DEPLOY_LOG="logs/deploy.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERR]${NC} $1"; }

# Parse flags
NO_PULL=false
NO_CACHE=""
ROLLBACK=false
for arg in "$@"; do
    case $arg in
        --no-pull)  NO_PULL=true ;;
        --no-cache) NO_CACHE="--no-cache" ;;
        --rollback) ROLLBACK=true ;;
    esac
done

# Must run from project root
if [ ! -f "$COMPOSE_FILE" ]; then
    err "Run from project root (where $COMPOSE_FILE lives)"
    exit 1
fi

mkdir -p logs "$BACKUP_DIR"

###############################################################################
# ROLLBACK
###############################################################################
if [ "$ROLLBACK" = true ]; then
    log "Rolling back to previous images..."
    if docker compose -f "$COMPOSE_FILE" ps --quiet backend | head -1 > /dev/null 2>&1; then
        PREV_BACKEND=$(docker inspect crypto_backend --format='{{.Image}}' 2>/dev/null || echo "")
        PREV_FRONTEND=$(docker inspect crypto_frontend --format='{{.Image}}' 2>/dev/null || echo "")
    fi

    git stash 2>/dev/null || true
    PREV_COMMIT=$(git log --oneline -2 | tail -1 | awk '{print $1}')
    if [ -n "$PREV_COMMIT" ]; then
        log "Checking out previous commit: $PREV_COMMIT"
        git checkout "$PREV_COMMIT" -- backend/ frontend/
        docker compose -f "$COMPOSE_FILE" up -d --build backend frontend
        git checkout HEAD -- backend/ frontend/
        git stash pop 2>/dev/null || true
        ok "Rollback complete"
    else
        err "No previous commit found for rollback"
        exit 1
    fi
    exit 0
fi

###############################################################################
# PRE-FLIGHT CHECKS
###############################################################################
log "Pre-flight checks..."

command -v docker >/dev/null 2>&1 || { err "Docker not installed"; exit 1; }
docker compose version >/dev/null 2>&1 || { err "Docker Compose v2 not installed"; exit 1; }

if [ ! -f "$ENV_FILE" ]; then
    err "Missing $ENV_FILE -- copy .env.example to $ENV_FILE and fill in values"
    exit 1
fi

# Validate required env vars
set -a; source "$ENV_FILE"; set +a
REQUIRED_VARS="DB_USER DB_PASSWORD DATABASE_URL REDIS_PASSWORD REDIS_URL JWT_SECRET_KEY"
for var in $REQUIRED_VARS; do
    if [ -z "${!var:-}" ]; then
        err "Required variable $var is empty in $ENV_FILE"
        exit 1
    fi
done
ok "Environment validated"

###############################################################################
# GIT PULL
###############################################################################
if [ "$NO_PULL" = false ] && git rev-parse --git-dir >/dev/null 2>&1; then
    log "Pulling latest code..."
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    git pull origin "$BRANCH" --ff-only 2>&1 || {
        warn "git pull failed (conflicts?). Continuing with local code."
    }
    ok "Code updated ($(git log --oneline -1))"
fi

###############################################################################
# PRE-DEPLOY BACKUP (postgres only if running)
###############################################################################
if docker ps --format '{{.Names}}' | grep -q crypto_db; then
    log "Backing up database before deploy..."
    STAMP=$(date +%Y%m%d_%H%M%S)
    docker exec crypto_db pg_dump -U "${DB_USER}" crypto_platform \
        | gzip > "${BACKUP_DIR}/pre_deploy_${STAMP}.sql.gz" 2>/dev/null && \
        ok "Backup saved: pre_deploy_${STAMP}.sql.gz" || \
        warn "Backup failed (DB may be initializing). Continuing."
fi

###############################################################################
# BUILD & DEPLOY
###############################################################################
log "Building images..."
docker compose -f "$COMPOSE_FILE" build $NO_CACHE 2>&1 | tail -5
ok "Images built"

log "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d 2>&1
ok "Containers started"

###############################################################################
# HEALTH CHECKS
###############################################################################
log "Running health checks..."

check_health() {
    local name=$1
    local url=$2
    local max_attempts=${3:-20}
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" >/dev/null 2>&1; then
            ok "$name is healthy"
            return 0
        fi
        sleep 3
        attempt=$((attempt + 1))
    done

    err "$name failed health check after $max_attempts attempts"
    docker compose -f "$COMPOSE_FILE" logs --tail=30 "$name" 2>/dev/null || true
    return 1
}

# Wait for DB and Redis to be ready first (they're dependencies)
log "Waiting for database..."
ATTEMPT=1
while [ $ATTEMPT -le 30 ]; do
    if docker exec crypto_db pg_isready -U "${DB_USER}" -d crypto_platform >/dev/null 2>&1; then
        ok "PostgreSQL is ready"
        break
    fi
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done
if [ $ATTEMPT -gt 30 ]; then
    err "PostgreSQL failed to start"
    docker compose -f "$COMPOSE_FILE" logs --tail=30 postgres
    exit 1
fi

log "Waiting for Redis..."
ATTEMPT=1
while [ $ATTEMPT -le 15 ]; do
    if docker exec crypto_redis redis-cli -a "${REDIS_PASSWORD}" ping 2>/dev/null | grep -q PONG; then
        ok "Redis is ready"
        break
    fi
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done
if [ $ATTEMPT -gt 15 ]; then
    err "Redis failed to start"
    docker compose -f "$COMPOSE_FILE" logs --tail=20 redis
    exit 1
fi

DEPLOY_OK=true
check_health "backend" "http://127.0.0.1:8000/health" 20 || DEPLOY_OK=false
check_health "frontend" "http://127.0.0.1:3001" 20 || DEPLOY_OK=false

###############################################################################
# CLEANUP
###############################################################################
log "Cleaning up old images..."
docker image prune -f >/dev/null 2>&1 || true

###############################################################################
# RESULT
###############################################################################
echo ""
if [ "$DEPLOY_OK" = true ]; then
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  DEPLOY SUCCESSFUL${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "  Frontend:  ${BLUE}http://127.0.0.1:3001${NC}"
    echo -e "  Backend:   ${BLUE}http://127.0.0.1:8000${NC}"
    echo -e "  API Docs:  ${BLUE}http://127.0.0.1:8000/docs${NC}"
    echo -e "  Health:    ${BLUE}http://127.0.0.1:3001/health${NC}"
    echo ""
    docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
else
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}  DEPLOY FAILED -- check logs above${NC}"
    echo -e "${RED}============================================${NC}"
    echo ""
    echo -e "  Rollback: ${YELLOW}sudo ./scripts/deploy.sh --rollback${NC}"
    echo -e "  Logs:     ${YELLOW}docker compose -f $COMPOSE_FILE logs -f${NC}"
    exit 1
fi
