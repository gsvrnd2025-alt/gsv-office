#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  GSV Office — TrueNAS SCALE Production Health Monitoring Script
# ═══════════════════════════════════════════════════════════════

# Log file path on host
LOG_FILE="/var/log/gsv_health.log"
ALERT_EMAIL="admin@gsv.local"

# Thresholds
DISK_THRESHOLD=90 # Alert if pool is > 90% full

echo "[$(date)] Running GSV Office Health Check..." >> "$LOG_FILE"

# Helper for alerts
send_alert() {
    local subject="🚨 GSV Office Alert: $1"
    local message="$2"
    echo "[ALERT] $subject - $message" >> "$LOG_FILE"
    
    # Try sending email via docker mailserver if it's running
    if docker ps | grep -q gsv_mailserver; then
        docker exec gsv_mailserver /bin/sh -c "echo \"$message\" | mail -s \"$subject\" \"$ALERT_EMAIL\"" || true
    fi
}

# ─── 1. Check Docker Containers ─────────────────────────────────
CONTAINERS=("gsv_nginx" "gsv_api" "gsv_postgres" "gsv_redis" "gsv_minio" "gsv_mailserver")
for container in "${CONTAINERS[@]}"; do
    STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
    if [ "$STATUS" != "running" ]; then
        send_alert "Container Stopped: $container" "Container '$container' status is currently '$STATUS'. Re-starting..."
        docker start "$container" || true
    fi
done

# ─── 2. Check API Health Endpoint ──────────────────────────────
API_HEALTH_URL="http://localhost:8080/api/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_HEALTH_URL" || echo "failed")

if [ "$HTTP_STATUS" != "200" ]; then
    # Double check internal container API health
    INTERNAL_STATUS=$(docker exec gsv_api curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "failed")
    if [ "$INTERNAL_STATUS" != "200" ]; then
        send_alert "API Health Failed" "Endpoint /api/health returned HTTP status '$HTTP_STATUS' (internal status '$INTERNAL_STATUS'). API service may be down."
    fi
fi

# ─── 3. Check ZFS Pool Storage Space ─────────────────────────────
POOL_USAGE=$(zpool list -H -o cap GSVR_Movies | tr -d '%' | tr -d ' ' || echo "0")
if [ "$POOL_USAGE" -gt "$DISK_THRESHOLD" ]; then
    send_alert "High Disk Usage on ZFS Pool" "Storage pool 'GSVR_Movies' capacity is currently at ${POOL_USAGE}% (Threshold: ${DISK_THRESHOLD}%)."
fi

# ─── 4. Database Status and Size ────────────────────────────────
if docker ps | grep -q gsv_postgres; then
    DB_SIZE=$(docker exec gsv_postgres psql -U gsv_admin -d gsv_office -t -c "SELECT pg_size_pretty(pg_database_size('gsv_office'));" | tr -d ' ' || echo "unknown")
    echo "  ✓ PostgreSQL running. Database Size: $DB_SIZE" >> "$LOG_FILE"
fi

echo "[$(date)] Health check finished successfully." >> "$LOG_FILE"
