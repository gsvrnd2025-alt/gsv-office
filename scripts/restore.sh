#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  GSV Office — TrueNAS SCALE Production Restore Script
#  Safe, consistent database and volume recovery from backup.
# ═══════════════════════════════════════════════════════════════

set -e

# Configuration
APP_DIR="/mnt/GSVR_Movies/apps/gsv-office"
BACKUP_ARCHIVE=$1
TEMP_DIR="/tmp/gsv_restore_tmp"

echo "=================================================================="
echo "🛡️ GSV Office — Database & File Restoration Utility"
echo "=================================================================="
echo "Time: $(date)"

# Check if backup file is provided
if [ -z "$BACKUP_ARCHIVE" ]; then
    echo "❌ Error: No backup archive file specified!"
    echo "Usage: $0 <path-to-backup-tar-gz>"
    echo "Example: $0 /mnt/GSVR_Movies/apps/gsv-office-backups/daily/gsv_office_backup_20260607_120000.tar.gz"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_ARCHIVE" ]; then
    echo "❌ Error: Backup archive file not found: $BACKUP_ARCHIVE"
    exit 1
fi

# Prompt user for confirmation
read -p "⚠️  WARNING: This will overwrite ALL current data. Are you sure you want to proceed? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "🛑 Restoration aborted."
    exit 0
fi

# Load configuration and secrets from local env if it exists
if [ -f "$APP_DIR/.env" ]; then
    export $(grep -v '^#' "$APP_DIR/.env" | xargs)
fi
DB_PASSWORD=${DB_PASSWORD:-"gsv_secure_password_2026"}
REDIS_PASSWORD=${REDIS_PASSWORD:-"gsv_redis_password_2026"}

# Clean and create temp extraction folder
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

echo "👉 Step 1: Extracting backup package..."
tar -xzf "$BACKUP_ARCHIVE" -C "$TEMP_DIR"
echo "  ✓ Archive extracted."

# ─── Step 2: Stop App Workloads ─────────────────────────────────
echo "👉 Step 2: Stopping GSV Office services to prevent locks..."
midclt call app.stop "gsv-office" || true
# Stop any orphan containers just in case
docker stop gsv_nginx gsv_api gsv_postgres gsv_redis gsv_minio gsv_mailserver || true
echo "  ✓ Services stopped."

# ─── Step 3: Restore Configs ────────────────────────────────────
if [ -f "$TEMP_DIR/configs.tar.gz" ]; then
    echo "👉 Step 3: Restoring system configurations..."
    tar -xzf "$TEMP_DIR/configs.tar.gz" -C "$APP_DIR"
    echo "  ✓ Configuration files restored."
fi

# ─── Step 4: Restore PostgreSQL Database ────────────────────────
echo "👉 Step 4: Starting database to import dump..."
docker start gsv_postgres
echo "Waiting 8 seconds for database engine to start..."
sleep 8

if [ -f "$TEMP_DIR/database.dump" ]; then
    echo "Recreating PostgreSQL database..."
    # Recreate clean database
    docker exec -e PGPASSWORD="$DB_PASSWORD" gsv_postgres psql -U gsv_admin -d postgres -c "DROP DATABASE IF EXISTS gsv_office WITH (FORCE);"
    docker exec -e PGPASSWORD="$DB_PASSWORD" gsv_postgres psql -U gsv_admin -d postgres -c "CREATE DATABASE gsv_office OWNER gsv_admin;"
    
    echo "Restoring database dump..."
    docker exec -i -e PGPASSWORD="$DB_PASSWORD" gsv_postgres pg_restore -U gsv_admin -d gsv_office -v < "$TEMP_DIR/database.dump" || echo "⚠️  pg_restore warnings logged."
    echo "  ✓ Database restored successfully."
else
    echo "⚠️  No database dump found in backup, skipping database restore."
fi

# ─── Step 5: Restore Redis Cache ────────────────────────────────
if [ -f "$TEMP_DIR/redis_cache.rdb" ]; then
    echo "👉 Step 5: Restoring Redis cache snapshot..."
    docker start gsv_redis
    sleep 3
    docker stop gsv_redis || true
    
    REDIS_VOL_PATH="/mnt/.ix-apps/docker/volumes/ix-gsv-office_redis_data/_data"
    if [ -d "$REDIS_VOL_PATH" ]; then
        cp "$TEMP_DIR/redis_cache.rdb" "$REDIS_VOL_PATH/dump.rdb"
        chown 999:999 "$REDIS_VOL_PATH/dump.rdb" || true # Redis default UID
        echo "  ✓ Redis snapshot restored."
    else
        echo "⚠️  Redis volume path not found, skipping cache restoration."
    fi
fi

# ─── Step 6: Restore MinIO Object Storage ───────────────────────
MINIO_VOL_PATH="/mnt/.ix-apps/docker/volumes/ix-gsv-office_minio_data/_data"
if [ -f "$TEMP_DIR/minio_data.tar.gz" ]; then
    echo "👉 Step 6: Restoring MinIO buckets..."
    if [ -d "$MINIO_VOL_PATH" ]; then
        rm -rf "${MINIO_VOL_PATH:?}"/*
        tar -xzf "$TEMP_DIR/minio_data.tar.gz" -C "$MINIO_VOL_PATH"
        echo "  ✓ MinIO storage restored."
    else
        echo "❌ MinIO volume path not found at $MINIO_VOL_PATH"
        exit 1
    fi
fi

# ─── Step 7: Restore User File Uploads ──────────────────────────
UPLOADS_VOL_PATH="/mnt/.ix-apps/docker/volumes/ix-gsv-office_uploads_data/_data"
if [ -f "$TEMP_DIR/uploads_data.tar.gz" ]; then
    echo "👉 Step 7: Restoring user file uploads..."
    if [ -d "$UPLOADS_VOL_PATH" ]; then
        rm -rf "${UPLOADS_VOL_PATH:?}"/*
        tar -xzf "$TEMP_DIR/uploads_data.tar.gz" -C "$UPLOADS_VOL_PATH"
        echo "  ✓ User uploads restored."
    else
        echo "❌ User uploads volume path not found at $UPLOADS_VOL_PATH"
        exit 1
    fi
fi

# ─── Step 8: Clean up and Restart App ───────────────────────────
echo "👉 Step 8: Cleaning up temporary folder and starting services..."
rm -rf "$TEMP_DIR"

# Restart all containers using TrueNAS middleware
midclt call app.start "gsv-office"
echo "Waiting 10 seconds for service health..."
sleep 10

echo "=================================================================="
echo "🎉 Restoration completed successfully!"
echo "App is active and running."
echo "=================================================================="
