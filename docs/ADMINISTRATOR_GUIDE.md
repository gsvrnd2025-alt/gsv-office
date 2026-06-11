# GSV Office — System Administrator Guide

This guide provides instructions for system administrators to configure, manage, and monitor the GSV Office platform.

---

## 1. User Synchronization via Google Sheets

GSV Office includes a two-way synchronization mechanism to populate users, departments, and roles directly from a Google Spreadsheet.

### Setting Up the Integration:
1. Open the target Google Spreadsheet containing sheets for `users`, `departments`, `roles`, and `settings`.
2. Go to **Extensions** -> **Apps Script** and copy the sync code from the `gsv-office-appscript/` folder.
3. Deploy the Apps Script as a **Web App** (execute as "Me", access "Anyone").
4. Copy the deployment URL.
5. In the GSV Office Web Portal, log in as Super Admin (`admin@gsv.local`) and navigate to **Admin Settings** -> **Integrations**.
6. Set the values for:
   * **Google Sheets Deployment ID:** The ID extracted from your Web App URL.
   * **Spreadsheet URL:** The browser link to your Google Spreadsheet.
7. Click **Sync Now** to pull and overwrite database records in PostgreSQL.

---

## 2. Managing Roles & Permissions

Relational authorization is managed using a RBAC (Role-Based Access Control) matrix.

### Default Roles:
* **Super Admin:** Full access to all components, including server logs, backups, and database configurations.
* **Admin:** Managing departments, users, billing, inventory, and ticketing (no system backup/restore access).
* **Manager:** Read-write access to chat, files, and tickets; limited department management.
* **Employee:** Standard read-write access to chat, files, tickets, and personal profile options.
* **Guest:** Read-only access to basic chat streams and public files.

Permissions can be overridden at the individual user level in the **User Details** edit screen.

---

## 3. Configuring Platform Parameters

Core application settings can be adjusted in the Web UI (stored in the `system_settings` table) or using container environment variables:

### File Upload Limits
* **Maximum Upload Limit:** Unified to 5GB (5000MB) for large attachments.
* To adjust this limit, update the `.env` parameter `MAX_FILE_SIZE_MB` and the Nginx proxy `client_max_body_size` configuration, then restart the containers.

### Custom Branding
* **Company Name:** Updates the login subtitle and tab title.
* **Company Logo:** Paste a URL to your custom PNG (e.g. `/assets/logo.png`) to override the default.
* **Primary Theme Color:** Hex color code to customize buttons and header accents.

---

## 4. Reviewing System Logs

Log files are stored persistently on the host at `/mnt/GSVR_Movies/apps/gsv-office/logs/`.
* **API Log:** `app.log` (monitors NestJS service, SQL execution exceptions, authentication failures).
* **Nginx logs:** Access and error logs are piped directly to standard docker stdout/stderr. To inspect them:
  ```bash
  docker logs -f gsv_nginx
  ```
* **PostgreSQL logs:** Inspect query performance and storage constraints:
  ```bash
  docker logs -f gsv_postgres
  ```
