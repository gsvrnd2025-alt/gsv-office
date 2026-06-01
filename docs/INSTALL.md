# ═══════════════════════════════════════════════════════════════════
#  GSV Office — Installation Guide
#  Self-Hosted Workspace Platform Deployment Instructions
# ═══════════════════════════════════════════════════════════════════

This document provides complete, step-by-step instructions for deploying GSV Office in production on a local network server, with a specific focus on **TrueNAS SCALE** and standard **Docker Compose** environments.

---

## 📋 System Requirements

* **Operating System**: TrueNAS SCALE (Cobia 23.10+, Dragonfish 24.04+, or Electric Eel 24.10+) OR any Linux distribution (Ubuntu 22.04 LTS recommended).
* **Hardware Requirements**:
  * **Minimum**: 2 Cores CPU, 4 GB RAM, 20 GB SSD storage.
  * **Recommended**: 4+ Cores CPU, 8+ GB RAM, 100+ GB SSD storage (plus mechanical HDD pool for file storage).
* **Network**: A static IP address on your local area network (LAN), and local DNS resolution (optional, but highly recommended).

---

## 🐳 Option 1: TrueNAS SCALE Deployment

TrueNAS SCALE allows you to deploy custom container stacks using the **Custom App** feature (based on Kubernetes / Helm under the hood, or Docker in Electric Eel+).

### Step 1: Create Storage Datasets
Before installing the application, you must create dedicated datasets on your TrueNAS ZFS storage pool to ensure persistent data and proper user ownership permissions.

1. Navigate to the **Storage** page in the TrueNAS dashboard.
2. Select your pool (e.g., `tank`) and click **Add Dataset**.
3. Create the parent dataset:
   * **Name**: `gsv-office`
4. Under `gsv-office`, create the following child datasets:
   * `db` (for PostgreSQL data)
   * `redis` (for Redis data)
   * `minio` (for S3 storage)
   * `uploads` (for File Manager direct storage - configure this as a SMB share if desired!)
   * `plugins` (for platform custom plugins)
   * `logs` (for system error/access logs)
   * `init` (for database seed and schema SQL files)
   * `nginx` (for reverse proxy configuration files)

### Step 2: Configure Permissions
Ensure that the containers have permission to write to these datasets.
1. For each dataset, edit the **Permissions** (ACL).
2. Set the owner user and group ID to `1001` (matches the `nestjs` runtime user in the Dockerfile). Alternatively, grant full read/write/execute permissions to user `1001` or set the ACL to **Apps** mode.

### Step 3: Copy Initialization Files to Host Path
To seed the database and configure Nginx upon the first deployment, copy the following files from this repository into the host paths on your TrueNAS system:

* Copy `database/schema.sql` and `database/seed.sql` to your TrueNAS dataset path: `/mnt/tank/apps/gsv-office/init/`
* Create a directory `/mnt/tank/apps/gsv-office/nginx/` and `/mnt/tank/apps/gsv-office/nginx/conf.d/`
* Copy `nginx/nginx.conf` to `/mnt/tank/apps/gsv-office/nginx/nginx.conf`
* Copy `nginx/conf.d/default.conf` to `/mnt/tank/apps/gsv-office/nginx/conf.d/default.conf`

### Step 4: Deploy the Custom App
1. Go to **Apps** -> **Discover Apps** -> **Custom App** (or **Install Custom App**).
2. Use the parameters defined in [truenas-scale-app.yaml](../truenas-scale-app.yaml):
   * **Application Name**: `gsv-office`
   * **Container Image**: Use `nginx:1.25-alpine` for Nginx and build/pull the customized backend image.
   * **Host Path Volume Mounts**: Map the host paths to container mounts precisely as defined in the YAML file:
     * `/mnt/tank/apps/gsv-office/db` ➡️ `/var/lib/postgresql/data`
     * `/mnt/tank/apps/gsv-office/init` ➡️ `/docker-entrypoint-initdb.d`
     * `/mnt/tank/apps/gsv-office/nginx/nginx.conf` ➡️ `/etc/nginx/nginx.conf`
     * `/mnt/tank/apps/gsv-office/nginx/conf.d` ➡️ `/etc/nginx/conf.d`
     * `/mnt/tank/apps/gsv-office/uploads` ➡️ `/var/www/uploads` (Nginx) and `/app/uploads` (Backend)
     * `/mnt/tank/apps/gsv-office/minio` ➡️ `/data`
3. Configure the environment variables for the API container using your values from the `.env` configuration.
4. Set up the **Network Configuration**:
   * Add Port Forwarding for Port `80` to Host Port `8080` (or `80` if available).
   * Map Host Port `443` to `8443` for SSL traffic.
5. Click **Save** and wait for the deployment to finish and transition to **Active**.

---

## 💻 Option 2: Linux Server Deployment (Docker Compose)

For standard Linux servers running Docker and Docker Compose:

### Step 1: Install Prerequisites
Install Docker and Docker Compose on your server:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
```

### Step 2: Configure Environment Variables
1. Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and configure your credentials, database passwords, keys, and SMTP configurations:
   ```bash
   nano .env
   ```
3. Generate secure secrets for JWT and sessions:
   * You can use: `openssl rand -hex 32` to generate secure strings.

### Step 3: Build & Start the Stack
Build and deploy the containers in the background:
```bash
docker-compose up -d --build
```

Verify that all containers are healthy:
```bash
docker-compose ps
```

The database container will automatically load `schema.sql` and `seed.sql` on the first start, configuring the default roles, departments, system settings, and creating the default administrator account.

---

## 🚀 Post-Installation & Initial Login

Once successfully deployed:

1. Open your browser and navigate to your server's local IP address or host:
   * **URL**: `http://<your-server-ip>` (or `http://localhost` if running locally)
2. You will be redirected to the **GSV Office Login Page**.
3. Use the default administrator credentials:
   * **Login ID / Email**: `admin` or `admin@gsv.local`
   * **Password**: `Admin@GSV2024`
4. **CRITICAL SECURITY STEP**: Immediately navigate to **Profile Settings** -> **Security** and change the administrator password.

---

## 🛠 Troubleshooting

### 1. Nginx Fails to Start (Bind Port Conflict)
If port `80` or `443` is already in use by the TrueNAS Web UI or another service on your host, you will see an error.
* **Solution**: In `.env`, change `HTTP_PORT` to `8080` and `HTTPS_PORT` to `8443`. On TrueNAS, map host ports accordingly. Access the app via `http://<server-ip>:8080`.

### 2. Database Connection Error
If the backend fails to connect to the database container:
* **Solution**: Verify that `DB_HOST` in `.env` is set to `postgres` (the name of the container service in the docker-compose network) and that the database container is fully healthy and initialized.

### 3. File Permissions / Read-Only Errors
If the backend cannot upload files or avatars:
* **Solution**: Check that `/mnt/tank/apps/gsv-office/uploads` has the correct UID (`1001`) ownership. Run `sudo chown -R 1001:1001 /mnt/tank/apps/gsv-office/uploads` on the host.
