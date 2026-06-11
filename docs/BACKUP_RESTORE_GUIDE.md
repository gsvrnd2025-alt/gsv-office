# GSV Office — Backup & Restore Guide

This guide provides practical instructions for configuring, scheduling, and restoring database and volume backups for the GSV Office platform.

---

## 1. Backup Configuration

Backups are executed using a bash script located at `scripts/backup.sh`.

### Storage Path
Backups are saved to: `/mnt/GSVR_Movies/apps/gsv-office-backups/`
* **`/mnt/GSVR_Movies/apps/gsv-office-backups/daily/`**: Holds the last 7 daily archives.
* **`/mnt/GSVR_Movies/apps/gsv-office-backups/weekly/`**: Holds the last 4 weekly archives.
* **`/mnt/GSVR_Movies/apps/gsv-office-backups/monthly/`**: Holds the last 12 monthly archives.

### Script Capabilities
* PostgreSQL dump via `pg_dump` inside container.
* Redis snapshot saving via `save` command and copying `dump.rdb`.
* Tar archiver for MinIO data (`minio_data` named volume).
* Tar archiver for user file uploads (`uploads_data` named volume).
* Tar archiver for system configurations (`.env`, nginx configs, mailserver credentials).

---

## 2. Scheduling Daily Backups on TrueNAS SCALE

To schedule the backup script to run automatically every night at 2:00 AM:

1. Log in to the TrueNAS SCALE Web Interface.
2. Go to **System Settings** -> **Advanced** -> **Cron Jobs**.
3. Click **Add** (top right) and fill in:
   * **Description:** `GSV Office Daily ZFS Backup`
   * **Command:** `bash /mnt/GSVR_Movies/apps/gsv-office/scripts/backup.sh`
   * **User:** `root`
   * **Schedule:** Custom cron expression: `0 2 * * *` (Every day at 2:00 AM)
4. Click **Save**.

---

## 3. Safe Restoration Procedure

Restoration is performed using `scripts/restore.sh`.

### Step 1: Locate the Backup File
Find the path to the backup file you want to restore, for example:
`/mnt/GSVR_Movies/apps/gsv-office-backups/daily/gsv_office_backup_20260607_120000.tar.gz`

### Step 2: Run the Restore Script
SSH into the TrueNAS SCALE host as root and execute the script:
```bash
bash /mnt/GSVR_Movies/apps/gsv-office/scripts/restore.sh /mnt/GSVR_Movies/apps/gsv-office-backups/daily/gsv_office_backup_20260607_120000.tar.gz
```

### Step 3: Action Flow
The script will automate the following operations:
1. Prompts for explicit "yes" confirmation to prevent accidental data overwrites.
2. Stops the `gsv-office` app via middleware client (`midclt`).
3. Restores configurations (`.env`, `docker-compose.yml`, `nginx.conf`).
4. Recreates a clean PostgreSQL database `gsv_office` and imports `database.dump`.
5. Replaces MinIO named volume files with the backup archive.
6. Replaces Web uploads named volume files with the backup archive.
7. Overwrites the Redis RDB cache file.
8. Starts the `gsv-office` app services.

---

## 4. Verification Check
After the restoration finishes, confirm the restore was successful:
1. Verify the container states:
   ```bash
   docker ps | grep gsv_
   ```
2. Log in to the application and ensure your files, notes, chats, and ticket histories are fully visible.
