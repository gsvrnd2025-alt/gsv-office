# GSV Office — Production Deployment Guide

This guide details the step-by-step instructions to deploy the GSV Office platform on TrueNAS SCALE.

---

## 1. Host System Prerequisites

Before deploying, ensure the following are prepared on the TrueNAS SCALE host:
1. **ZFS Dataset creation:** Recreate or verify the active dataset path:
   ```bash
   mkdir -p /mnt/GSVR_Movies/apps/gsv-office/downloads
   ```
2. **Access permissions:** Ensure the dataset directories are accessible by `root`.
3. **Ports check:** Ensure ports `8080`, `8443`, `25`, `143`, `465`, `587`, and `993` are not in use by other TrueNAS Catalog apps.

---

## 2. Configuration Setup (.env)

Duplicate the `.env.example` file to `.env` in the root of the project:
```bash
cp .env.example .env
```
Fill in the custom configuration settings. Ensure that the secrets are strong:
* **`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`:** Random 64-character hex strings.
* **`DB_PASSWORD`:** Strong database password.
* **`REDIS_PASSWORD`:** Strong Redis authentication password.
* **`MINIO_ROOT_PASSWORD`:** Strong MinIO admin console password.
* **`SESSION_SECRET`:** Unique session identifier string.
* **`SSH_PASS`:** Password for SSH root deployment (`Gsv@2018` or your updated TrueNAS root password).

---

## 3. Deployment Steps (Remote SSH deploy)

The automated script builds code, pushes images, copies configuration templates, and recreates the app on the remote TrueNAS SCALE server.

1. **Verify your local GitHub authentication:**
   Ensure you are logged into the GitHub CLI so the script can access your GHCR registries:
   ```bash
   gh auth login
   ```
2. **Build and Tag Version:**
   Bump the version and update all package and Helm parameters:
   ```bash
   node scripts/release.js patch
   ```
3. **Execute Deployer:**
   Run the SSH deployment utility, specifying the target version:
   ```bash
   node deploy-ssh.js v1.0.1
   ```
4. **Middleware synchronization:**
   The deployer will SFTP copy configs, update the remote `.env`, copy templates into `/mnt/.ix-apps/app_configs/gsv-office/versions/1.0.0/user_config.yaml`, and call the middleware to restart:
   ```bash
   midclt call app.start "gsv-office"
   ```

---

## 4. TrueNAS SCALE Web UI Custom App Verification

If you prefer to inspect or create the Custom App manually via the TrueNAS SCALE Web UI:

1. Navigate to **Apps** -> **Discover Apps** -> **Custom App** (top-right).
2. Enter the parameters:
   * **Application Name:** `gsv-office`
   * **Compose Content:** Paste the contents of [docker-compose-truenas.yml](file:///c:/Users/GSVPC_F2/Documents/A%20gsv%20office%20plugin/docker-compose-truenas.yml).
3. Under **Environment variables**, make sure to add:
   * `APP_VERSION`: e.g. `1.0.1` (matching the release tag).
4. Save and click **Install**. TrueNAS will parse the YAML, mount the ZFS datasets, and start the Docker Compose containers under the `ix-gsv-office` namespace.
5. Uptime verification: Once the state changes to **Running**, access the Web UI at: `http://192.168.0.177:8080` (or `https://192.168.0.177:8443`).
