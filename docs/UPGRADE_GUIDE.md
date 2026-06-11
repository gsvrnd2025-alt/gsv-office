# GSV Office — System Upgrade & Rollback Guide

This document describes the procedures for upgrading the GSV Office platform, applying database schema migrations, and executing safe rollbacks.

---

## 1. Rolling Out Upgrades (Minor/Patch Bumps)

GSV Office employs containerized semantic tagging, enabling upgrades with zero local code modification on the TrueNAS host.

### Step 1: Run Version Bump & Generate Changelog
On your developer machine, run the release script to bump the version (e.g. from `1.0.1` to `1.0.2`):
```bash
node scripts/release.js patch
```
This updates `package.json`, `.env`, and Helm chart versions, and appends Git logs to `CHANGELOG.md`.

### Step 2: Push Code & Build Images
Commit the changes and push them to GitHub. The GitHub Actions release pipeline will automatically build the images, push them to GHCR, and create a GitHub Release with tags `v1.0.2` and `1.0.2`.
```bash
git add -A
git commit -m "chore(release): bump version to v1.0.2"
git tag -a v1.0.2 -m "Release v1.0.2"
git push origin main --tags
```

### Step 3: Trigger SSH Deployment
Run the deployment script specifying the new version tag:
```bash
node deploy-ssh.js v1.0.2
```
This updates the remote `.env`, copies the new compose template into TrueNAS, pulls `v1.0.2` images, and restarts the containers.

---

## 2. Database Schema Migrations

The NestJS backend API is configured with TypeORM.
* **Development Mode:** `DB_SYNC=true` is used in development to synchronize entities automatically.
* **Production Mode:** `DB_SYNC=false` is enforced in `docker-compose-truenas.yml` for stability.
* Database initialization runs `schema.sql` and `seed.sql` on first start.
* For schema updates (e.g. adding columns or tables), write TypeORM migration scripts:
  ```bash
  npm run migration:generate --name=AddNotesColumn
  ```
* These migrations compile to JS and run automatically when the new NestJS container boots. Alternatively, manual raw SQL migrations can be executed by mounting migration files to the database container or executing `psql` directly on the host.

---

## 3. Rollback Procedure

If a deployed version (e.g., `v1.0.2`) exhibits runtime issues or bugs:

1. **Identify the previous working version:** E.g., `v1.0.1`.
2. **Execute deploy-ssh with the previous tag:**
   ```bash
   node deploy-ssh.js v1.0.1
   ```
3. **Internal database sync:** The deploy script will rewrite the remote `.env` to `APP_VERSION=1.0.1`, copy the compose files, pull `v1.0.1` images, and restart containers via `midclt`.
4. **Verify Rollback Uptime:** Go to the browser and check that the login page displays the rolled-back version.

> [!WARNING]
> If the failed upgrade included database schema changes, you may need to restore the PostgreSQL database from the pre-upgrade daily backup snapshot. See the [Backup & Restore Guide](BACKUP_RESTORE_GUIDE.md) for details.
