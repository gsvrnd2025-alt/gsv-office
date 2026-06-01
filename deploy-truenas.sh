#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  GSV Office — TrueNAS SCALE Automated ZFS Deployment Helper
#  Credentials: root / Gsv@2018
# ═══════════════════════════════════════════════════════════════════

set -e

# Configuration
TRUENAS_IP="192.168.0.177"  # Change this to your TrueNAS local IP (e.g. 192.168.0.177 or 192.168.0.188)
TRUENAS_USER="root"
TRUENAS_POOL="tank"         # ZFS storage pool name
ZFS_APP_DIR="/mnt/${TRUENAS_POOL}/apps/gsv-office"

echo "=================================================================="
echo "🛡️ GSV Office — TrueNAS SCALE Deployment helper"
echo "=================================================================="
echo ""

echo "👉 Step 1: Initializing persistent ZFS host directories locally..."
echo "------------------------------------------------------------------"
# In standard SCALE, datasets or directories must exist on the pool
mkdir -p ./gsv-truenas-init/db
mkdir -p ./gsv-truenas-init/redis
mkdir -p ./gsv-truenas-init/minio
mkdir -p ./gsv-truenas-init/uploads
mkdir -p ./gsv-truenas-init/plugins
mkdir -p ./gsv-truenas-init/logs
mkdir -p ./gsv-truenas-init/init
mkdir -p ./gsv-truenas-init/nginx/conf.d

# Copy seeding files and configuration
cp ./database/schema.sql ./gsv-truenas-init/init/
cp ./database/seed.sql ./gsv-truenas-init/init/
cp ./nginx/nginx.conf ./gsv-truenas-init/nginx/
cp ./nginx/conf.d/default.conf ./gsv-truenas-init/nginx/conf.d/

echo "✅ Seeding and proxy configuration files prepped."
echo ""

echo "👉 Step 2: Push persistent datasets to TrueNAS SCALE..."
echo "------------------------------------------------------------------"
echo "To copy these prepped persistent directories to your TrueNAS pool, run:"
echo "rsync -avz -e ssh ./gsv-truenas-init/ ${TRUENAS_USER}@${TRUENAS_IP}:${ZFS_APP_DIR}"
echo ""

echo "👉 Step 3: Installing as a TrueNAS Custom App"
echo "------------------------------------------------------------------"
echo "1. Open TrueNAS Web Portal at: http://${TRUENAS_IP} or http://192.168.0.188"
echo "2. Log in with your credentials:"
echo "   👤 Username: root"
echo "   🔑 Password: Gsv@2018"
echo "3. Go to Apps -> Discover Apps -> click 'Custom App' (top-right)."
echo "4. Configure the ZFS host paths mapping in Custom App Settings:"
echo "   - PostgreSQL db:  ${ZFS_APP_DIR}/db      ➡️  /var/lib/postgresql/data"
echo "   - SQL seeds:      ${ZFS_APP_DIR}/init    ➡️  /docker-entrypoint-initdb.d"
echo "   - Nginx Conf:     ${ZFS_APP_DIR}/nginx/nginx.conf  ➡️  /etc/nginx/nginx.conf"
echo "   - Nginx server:   ${ZFS_APP_DIR}/nginx/conf.d      ➡️  /etc/nginx/conf.d"
echo "   - Uploads folder: ${ZFS_APP_DIR}/uploads ➡️  /var/www/uploads"
echo "   - MinIO Object:   ${ZFS_APP_DIR}/minio   ➡️  /data"
echo "5. Map Host Port 8080 (or 80) to container port 80."
echo "6. Save and deploy!"
echo ""
echo "=================================================================="
echo "🎉 GSV Office TrueNAS Deployment Config successfully generated!"
echo "=================================================================="
