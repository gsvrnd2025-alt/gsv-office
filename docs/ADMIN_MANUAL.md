# ═══════════════════════════════════════════════════════════════════
#  GSV Office — System Administrator Manual
#  Comprehensive Guide for Server & Platform Management
# ═══════════════════════════════════════════════════════════════════

Welcome to the **GSV Office Admin Manual**. This guide is designed to help IT administrators manage the GSV Office platform, monitor server health, manage users, customize system permissions, and configure local network services.

---

## 👥 User & Department Management

As an administrator, you have full control over user accounts, department assignments, and job designations.

### Creating and Managing Users
1. Log in as an administrator and go to **User Management** in the sidebar.
2. Click **Create User**.
3. Fill in the user profile details:
   * **Login ID**: Unique identifier used for login.
   * **Full Name**, **Email**, **Designation**.
   * **Department**: Assign the user to their respective operational unit.
   * **System Role**: Assign their base RBAC role (e.g., Employee, Manager, Admin).
4. Save the user. An auto-generated Employee ID (e.g., `EMP-0002`) will be assigned automatically.

### Account Moderation
* **Disable Account**: Prevents the user from logging in without deleting their chat logs, documents, and history. Useful for temporary suspensions or offboarding.
* **Block Account**: Blocks the user's IP address and revokes all active JWT tokens immediately.
* **Reset Password**: Reset a user's password directly if they forget it. You can enforce a mandatory password change on their next login.

---

## 🔐 Role-Based Access Control (RBAC)

GSV Office includes a granular RBAC engine. Permissions can be assigned globally to **Roles** or overridden on a **Per-User** level.

### Modifying Role Permissions
1. Navigate to **Roles & Permissions**.
2. Select a Role card (e.g., `Manager` or `Employee`).
3. The **Permission Matrix** will display all functional modules (Chat, Files, Tickets, Invoices, Inventory, Server, etc.) and their respective actions (Read, Create, Update, Delete, Share).
4. Click checkmarks to grant or revoke permissions.
5. Click **Save Changes** to apply. Changes take effect on the user's next API request (or immediately once WebSocket sync occurs).

### Per-User Overrides
If a specific employee requires temporary access to a module (e.g., an IT intern needing server log access):
1. Go to **User Management** and edit the user.
2. Select the **Permissions** tab.
3. Toggle custom overrides to explicitly `Grant` or `Revoke` permissions, superseding their role permissions.

---

## 💾 Storage & SMB Integration

GSV Office utilizes a unified storage layer that combines high-performance object storage with local storage.

### local Object Storage (MinIO)
All chat attachments, avatars, and platform system assets are stored in MinIO.
* Access the MinIO web console at `http://<your-server-ip>:9001` using your configured root user and password in `.env`.
* Data is stored in buckets: `gsv-files`, `gsv-avatars`, `gsv-chat`.

### SMB Share Bindings (TrueNAS Datasets)
For the enterprise Document Management System (DMS), files are stored directly on the ZFS files dataset.
* To make files accessible via the local network directly (outside the web interface), configure an **SMB Share** on the `uploads` dataset.
* Go to TrueNAS SCALE -> **Sharing** -> **Windows Shares (SMB)** and add your dataset path `/mnt/tank/apps/gsv-office/uploads`.
* Set permissions for your local users. Employees can mount `\\<truenas-ip>\gsv_storage` to drag and drop files from Windows Explorer, and they will be indexed within the GSV Office File Manager!

---

## ✉️ Email Module & Mail Server Setup

GSV Office is pre-configured with a secure SMTP and IMAP system powered by `docker-mailserver`.

### Connecting to Your Enterprise Mail
In the `.env` configuration file, configure the connection:
* Set `MAIL_HOST` to your external relay or keep it as `mailserver` for the built-in local mail.
* Configure SMTP relay credentials in `mailserver.env` if you wish to deliver outgoing mail to public email domains (e.g., Gmail, Microsoft 365) from your local offline server.

### Creating Local Accounts
To manage internal mail accounts using the local domain:
```bash
docker exec -it gsv_mailserver setup email add sales@gsv.local "SecurePassword"
docker exec -it gsv_mailserver setup email add support@gsv.local "SecurePassword"
```
Staff can connect via standard desktop mail clients (Outlook, Thunderbird) or use the built-in GSV Office Webmail client.

---

## 🔌 Custom Plugin Management

GSV Office is built around an extensible runtime plugin framework.

### Installing a Plugin
1. Custom plugin archives (`.zip`) can be uploaded in **Server Admin** -> **Plugins**.
2. Once extracted into `/app/plugins`, the platform loads the plugin manifest.
3. Select **Enable** on the plugin card. The server will hot-reload the dynamic routes and inject front-end component hook overrides dynamically.

---

## 📊 Server Administration & Monitoring

The **Server Admin Panel** provides real-time oversight of system resources and health metrics.

### System Performance Logs
* Monitor **CPU**, **RAM**, and **Disk I/O** indicators.
* Review real-time container logs for the API, Nginx, and database services.

### Backups & Restore
To perform a complete backup of the database and files:
```bash
# Backup the database
docker exec -t gsv_postgres pg_dumpall -c -U gsv_admin > /mnt/tank/apps/gsv-office/backups/backup_$(date +%F).sql

# Backup files
tar -czf /mnt/tank/apps/gsv-office/backups/files_$(date +%F).tar.gz /mnt/tank/apps/gsv-office/uploads
```
To restore, import the SQL script into `gsv_postgres` and extract the files archive back into the volume.
