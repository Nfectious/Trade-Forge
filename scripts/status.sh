#!/bin/bash
###############################################################################
# Trading Forge - Status Dashboard
# Usage: ./scripts/status.sh
###############################################################################
set -uo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Fall back to dev compose if prod doesn't exist
if [ ! -f "$COMPOSE_FILE" ]; then
    COMPOSE_FILE="docker-compose.yml"
fi

if [ -f "$ENV_FILE" ]; then
    set -a; source "$ENV_FILE" 2>/dev/null; set +a
fi

echo ""
echo -e "${BOLD}${CYAN}========================================${NC}"
echo -e "${BOLD}${CYAN}   TRADING FORGE - STATUS DASHBOARD${NC}"
echo -e "${BOLD}${CYAN}========================================${NC}"
echo -e "  ${BLUE}$(date '+%Y-%m-%d %H:%M:%S %Z')${NC}"
echo ""

###############################################################################
# CONTAINER STATUS
###############################################################################
echo -e "${BOLD}CONTAINERS${NC}"
echo -e "${BLUE}──────────────────────────────────────${NC}"

SERVICES=("crypto_db:PostgreSQL" "crypto_redis:Redis" "crypto_backend:Backend" "crypto_frontend:Frontend")

for entry in "${SERVICES[@]}"; do
    CONTAINER="${entry%%:*}"
    LABEL="${entry##*:}"

    STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER" 2>/dev/null || echo "not found")
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "n/a")
    UPTIME=$(docker inspect --format='{{.State.StartedAt}}' "$CONTAINER" 2>/dev/null || echo "")

    if [ "$STATUS" = "running" ]; then
        STATUS_COLOR="${GREEN}running${NC}"
    else
        STATUS_COLOR="${RED}${STATUS}${NC}"
    fi

    if [ "$HEALTH" = "healthy" ]; then
        HEALTH_COLOR="${GREEN}healthy${NC}"
    elif [ "$HEALTH" = "unhealthy" ]; then
        HEALTH_COLOR="${RED}unhealthy${NC}"
    else
        HEALTH_COLOR="${YELLOW}${HEALTH}${NC}"
    fi

    # Calculate uptime
    UP_STR=""
    if [ -n "$UPTIME" ] && [ "$UPTIME" != "" ] && [ "$STATUS" = "running" ]; then
        START_EPOCH=$(date -d "$UPTIME" +%s 2>/dev/null || echo "0")
        NOW_EPOCH=$(date +%s)
        if [ "$START_EPOCH" -gt 0 ]; then
            DIFF=$((NOW_EPOCH - START_EPOCH))
            DAYS=$((DIFF / 86400))
            HOURS=$(( (DIFF % 86400) / 3600 ))
            MINS=$(( (DIFF % 3600) / 60 ))
            if [ $DAYS -gt 0 ]; then
                UP_STR="${DAYS}d ${HOURS}h"
            elif [ $HOURS -gt 0 ]; then
                UP_STR="${HOURS}h ${MINS}m"
            else
                UP_STR="${MINS}m"
            fi
        fi
    fi

    printf "  %-12s  %-20b  %-20b  %s\n" "$LABEL" "$STATUS_COLOR" "$HEALTH_COLOR" "$UP_STR"
done

###############################################################################
# RESOURCE USAGE
###############################################################################
echo ""
echo -e "${BOLD}RESOURCE USAGE${NC}"
echo -e "${BLUE}──────────────────────────────────────${NC}"
docker stats --no-stream --format "  {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
    crypto_db crypto_redis crypto_backend crypto_frontend 2>/dev/null | \
    column -t -s $'\t' || echo "  (containers not running)"

###############################################################################
# DATABASE
###############################################################################
echo ""
echo -e "${BOLD}DATABASE${NC}"
echo -e "${BLUE}──────────────────────────────────────${NC}"

if docker exec crypto_db pg_isready -U "${DB_USER:-crypto_admin}" -d crypto_platform >/dev/null 2>&1; then
    # Connection count
    CONN=$(docker exec crypto_db psql -U "${DB_USER:-crypto_admin}" -d crypto_platform -t -c \
        "SELECT count(*) FROM pg_stat_activity WHERE datname='crypto_platform';" 2>/dev/null | tr -d ' ')
    MAX_CONN=$(docker exec crypto_db psql -U "${DB_USER:-crypto_admin}" -d crypto_platform -t -c \
        "SHOW max_connections;" 2>/dev/null | tr -d ' ')

    # DB size
    DB_SIZE=$(docker exec crypto_db psql -U "${DB_USER:-crypto_admin}" -d crypto_platform -t -c \
        "SELECT pg_size_pretty(pg_database_size('crypto_platform'));" 2>/dev/null | tr -d ' ')

    # User count
    USER_COUNT=$(docker exec crypto_db psql -U "${DB_USER:-crypto_admin}" -d crypto_platform -t -c \
        "SELECT count(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "?")

    # Trade count
    TRADE_COUNT=$(docker exec crypto_db psql -U "${DB_USER:-crypto_admin}" -d crypto_platform -t -c \
        "SELECT count(*) FROM trades;" 2>/dev/null | tr -d ' ' || echo "?")

    echo -e "  Connections: ${GREEN}${CONN}${NC} / ${MAX_CONN}"
    echo -e "  DB Size:     ${CYAN}${DB_SIZE}${NC}"
    echo -e "  Users:       ${CYAN}${USER_COUNT}${NC}"
    echo -e "  Trades:      ${CYAN}${TRADE_COUNT}${NC}"
else
    echo -e "  ${RED}PostgreSQL not reachable${NC}"
fi

###############################################################################
# REDIS
###############################################################################
echo ""
echo -e "${BOLD}REDIS${NC}"
echo -e "${BLUE}──────────────────────────────────────${NC}"

if docker exec crypto_redis redis-cli -a "${REDIS_PASSWORD:-}" ping 2>/dev/null | grep -q PONG; then
    INFO=$(docker exec crypto_redis redis-cli -a "${REDIS_PASSWORD:-}" INFO memory 2>/dev/null)
    USED_MEM=$(echo "$INFO" | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
    MAX_MEM=$(echo "$INFO" | grep "maxmemory_human:" | cut -d: -f2 | tr -d '\r')
    KEYS=$(docker exec crypto_redis redis-cli -a "${REDIS_PASSWORD:-}" DBSIZE 2>/dev/null | awk '{print $NF}')
    CONNECTED=$(docker exec crypto_redis redis-cli -a "${REDIS_PASSWORD:-}" INFO clients 2>/dev/null | \
        grep "connected_clients:" | cut -d: -f2 | tr -d '\r')

    echo -e "  Memory:      ${CYAN}${USED_MEM}${NC} / ${MAX_MEM}"
    echo -e "  Keys:        ${CYAN}${KEYS}${NC}"
    echo -e "  Clients:     ${CYAN}${CONNECTED}${NC}"
else
    echo -e "  ${RED}Redis not reachable${NC}"
fi

###############################################################################
# RECENT ERRORS
###############################################################################
echo ""
echo -e "${BOLD}RECENT ERRORS (last 10)${NC}"
echo -e "${BLUE}──────────────────────────────────────${NC}"

ERROR_COUNT=$(docker compose -f "$COMPOSE_FILE" logs --tail=500 backend 2>/dev/null | \
    grep -iE "error|exception|traceback|critical" | wc -l)

if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "  ${YELLOW}${ERROR_COUNT} errors in last 500 log lines${NC}"
    docker compose -f "$COMPOSE_FILE" logs --tail=500 backend 2>/dev/null | \
        grep -iE "error|exception|traceback|critical" | tail -5 | \
        while read -r line; do echo "  $line"; done
else
    echo -e "  ${GREEN}No errors found${NC}"
fi

###############################################################################
# DISK SPACE
###############################################################################
echo ""
echo -e "${BOLD}DISK SPACE${NC}"
echo -e "${BLUE}──────────────────────────────────────${NC}"

# Host disk
DISK_USAGE=$(df -h / | tail -1 | awk '{printf "  Root: %s used of %s (%s)\n", $3, $2, $5}')
echo -e "  $DISK_USAGE"

# Docker disk
DOCKER_USAGE=$(docker system df --format "  Images: {{.Size}} ({{.Reclaimable}} reclaimable)" 2>/dev/null | head -1)
echo -e "  $DOCKER_USAGE"

# Backup dir size
if [ -d "database/backups" ]; then
    BACKUP_SIZE=$(du -sh database/backups 2>/dev/null | cut -f1)
    BACKUP_COUNT=$(find database/backups -type f 2>/dev/null | wc -l)
    echo -e "  Backups: ${BACKUP_SIZE} (${BACKUP_COUNT} files)"
fi

###############################################################################
# ENDPOINTS
###############################################################################
echo ""
echo -e "${BOLD}ENDPOINTS${NC}"
echo -e "${BLUE}──────────────────────────────────────${NC}"

check_endpoint() {
    local label=$1
    local url=$2
    HTTP_CODE=$(curl -so /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "  ${GREEN}$HTTP_CODE${NC}  $label  ($url)"
    elif [ "$HTTP_CODE" = "000" ]; then
        echo -e "  ${RED}DOWN${NC} $label  ($url)"
    else
        echo -e "  ${YELLOW}$HTTP_CODE${NC}  $label  ($url)"
    fi
}

check_endpoint "Backend Health" "http://127.0.0.1:8000/health"
check_endpoint "API Docs"       "http://127.0.0.1:8000/docs"
check_endpoint "Frontend"       "http://127.0.0.1:3001"

echo ""
echo -e "${CYAN}========================================${NC}"
echo ""
