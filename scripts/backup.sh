#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  GSV Office — TrueNAS SCALE Production Backup Script
#  Runs daily/weekly/monthly rotations on ZFS pools.
# ═══════════════════════════════════════════════════════════════

set -e

# Configuration
APP_DIR="/mnt/GSVR_Movies/apps/gsv-office"
BACKUP_DIR="/mnt/GSVR_Movies/apps/gsv-office-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEMP_DIR="/tmp/gsv_backup_tmp"

# Retention limits
KEEP_DAILY=7
KEEP_WEEKLY=4
KEEP_MONTHLY=12

echo "=================================================================="
echo "🛡️ GSV Office — Automated Backup System: Started"
echo "=================================================================="
echo "Time: $(date)"

# Load configuration and secrets from the active remote env
if [ -f "$APP_DIR/.env" ]; then
    echo "🔑 Loading environment configuration..."
    # Parse env file while ignoring comments and blank lines
    export $(grep -v '^#' "$APP_DIR/.env" | xargs)
else
    echo "⚠️  Warning: Active .env file not found at $APP_DIR/.env. Falling back to defaults."
fi

# Define database and redis passwords with fallback
DB_PASSWORD=${DB_PASSWORD:-"gsv_secure_password_2026"}
REDIS_PASSWORD=${REDIS_PASSWORD:-"gsv_redis_password_2026"}

# Create backup folders
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/monthly"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# ─── Step 1: PostgreSQL Database Dump ───────────────────────────
echo "👉 Step 1: Backing up PostgreSQL database..."
if docker ps | grep -q gsv_postgres; then
    docker exec -e PGPASSWORD="$DB_PASSWORD" gsv_postgres pg_dump -U gsv_admin -d gsv_office -F c -b -v > "$TEMP_DIR/database.dump"
    echo "  ✓ Database dump generated."
else
    echo "❌ PostgreSQL container is not running!"
    exit 1
fi

# ─── Step 2: Redis Data Cache Snapshot ──────────────────────────
echo "👉 Step 2: Backing up Redis cache..."
if docker ps | grep -q gsv_redis; then
    # Force a database save
    docker exec gsv_redis redis-cli -a "$REDIS_PASSWORD" save || true
    # Copy the snapshot rdb file from the redis container volume
    docker cp gsv_redis:/data/dump.rdb "$TEMP_DIR/redis_cache.rdb"
    echo "  ✓ Redis RDB cache snapshot copied."
else
    echo "⚠️  Redis container not running, skipping cache backup."
fi

# ─── Step 3: MinIO Object Storage buckets ───────────────────────
echo "👉 Step 3: Archiving MinIO Object Storage..."
MINIO_VOL_PATH="/mnt/.ix-apps/docker/volumes/ix-gsv-office_minio_data/_data"
if [ -d "$MINIO_VOL_PATH" ]; then
    tar -czf "$TEMP_DIR/minio_data.tar.gz" -C "$MINIO_VOL_PATH" .
    echo "  ✓ MinIO data archived."
else
    echo "⚠️  MinIO Docker Volume path not found at $MINIO_VOL_PATH. Attempting docker container copy..."
    if docker ps | grep -q gsv_minio; then
        docker cp gsv_minio:/data "$TEMP_DIR/minio_data_raw"
        tar -czf "$TEMP_DIR/minio_data.tar.gz" -C "$TEMP_DIR/minio_data_raw" .
        rm -rf "$TEMP_DIR/minio_data_raw"
        echo "  ✓ MinIO data copied from container and archived."
    else
        echo "❌ MinIO data backup failed: volume and container unavailable."
        exit 1
    fi
fi

# ─── Step 4: Web Uploads Storage ────────────────────────────────
echo "👉 Step 4: Archiving user file uploads..."
UPLOADS_VOL_PATH="/mnt/.ix-apps/docker/volumes/ix-gsv-office_uploads_data/_data"
if [ -d "$UPLOADS_VOL_PATH" ]; then
    tar -czf "$TEMP_DIR/uploads_data.tar.gz" -C "$UPLOADS_VOL_PATH" .
    echo "  ✓ User uploads archived."
else
    echo "❌ User uploads volume not found at $UPLOADS_VOL_PATH!"
    exit 1
fi

# ─── Step 5: System Configurations ──────────────────────────────
echo "👉 Step 5: Archiving system configuration files..."
tar -czf "$TEMP_DIR/configs.tar.gz" -C "$APP_DIR" .env docker-compose.yml nginx mailserver.env mailserver/config || true
echo "  ✓ Configurations archived."

# ─── Step 6: Create Final Consolidated Archive ──────────────────
echo "👉 Step 6: Compiling consolidated backup file..."
ARCHIVE_NAME="gsv_office_backup_${TIMESTAMP}.tar.gz"
tar -czf "$BACKUP_DIR/daily/$ARCHIVE_NAME" -C "$TEMP_DIR" .
echo "  ✓ Consolidated daily archive created: $ARCHIVE_NAME"

# Copy to weekly / monthly folders based on calendar
DAY_OF_WEEK=$(date +"%u")  # 1-7 (Monday-Sunday)
DAY_OF_MONTH=$(date +"%d") # 01-31

if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp "$BACKUP_DIR/daily/$ARCHIVE_NAME" "$BACKUP_DIR/weekly/gsv_office_weekly_${TIMESTAMP}.tar.gz"
    echo "  ✓ Copied weekly backup."
fi

if [ "$DAY_OF_MONTH" -eq "01" ]; then
    cp "$BACKUP_DIR/daily/$ARCHIVE_NAME" "$BACKUP_DIR/monthly/gsv_office_monthly_${TIMESTAMP}.tar.gz"
    echo "  ✓ Copied monthly backup."
fi

# Clean up temp files
rm -rf "$TEMP_DIR"

# ─── Step 7: Rotate/Prune Old Backups ───────────────────────────
echo "👉 Step 7: Executing backup rotation cleanup..."

# Keep daily: find daily files and delete those older than KEEP_DAILY
cd "$BACKUP_DIR/daily"
ls -t gsv_office_backup_*.tar.gz 2>/dev/null | tail -n +$((KEEP_DAILY + 1)) | xargs -r rm --
echo "  ✓ Daily rotation completed (kept last $KEEP_DAILY)."

# Keep weekly
cd "$BACKUP_DIR/weekly"
ls -t gsv_office_weekly_*.tar.gz 2>/dev/null | tail -n +$((KEEP_WEEKLY + 1)) | xargs -r rm --
echo "  ✓ Weekly rotation completed (kept last $KEEP_WEEKLY)."

# Keep monthly
cd "$BACKUP_DIR/monthly"
ls -t gsv_office_monthly_*.tar.gz 2>/dev/null | tail -n +$((KEEP_MONTHLY + 1)) | xargs -r rm --
echo "  ✓ Monthly rotation completed (kept last $KEEP_MONTHLY)."

echo "=================================================================="
echo "🎉 Backup completed successfully!"
echo "Saved to: $BACKUP_DIR/daily/$ARCHIVE_NAME"
echo "=================================================================="
