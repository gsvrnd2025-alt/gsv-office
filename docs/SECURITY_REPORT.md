# GSV Office — Production Security Hardening Report

This report documents the security audit findings, risk assessments, vulnerabilities resolved, and best practices implemented to secure the GSV Office platform for production deployment on TrueNAS SCALE.

---

## 1. Security Audit Findings & Risks

During the audit of the deployment configurations and scripting utilities, several critical security vulnerabilities were identified:

| Finding ID | Component | Severity | Description | Risk |
|:---|:---|:---|:---|:---|
| **SEC-001** | docker-compose-truenas.yml | **CRITICAL** | Hardcoded database, redis, object-store, session secrets, and default administrator credentials in compose files. | Credential exposure to unauthorized source-code viewers; inability to rotate passwords without code modification. |
| **SEC-002** | deploy-ssh.js, run-remote-cmd.js | **HIGH** | Hardcoded SSH host credentials (`root` and password `Gsv@2018`) in operational scripts. | Exposure of host root access via file repository leaks. |
| **SEC-003** | docker-compose-truenas.yml | **MEDIUM** | Lack of log size limits for Docker containers. | Disk exhaustion denial-of-service (DoS) if container logs grow unchecked. |
| **SEC-004** | nginx.conf | **MEDIUM** | Insecure TLS parameters and HTTP-only default fallbacks on host ports. | Potential eavesdropping or man-in-the-middle (MitM) attacks. |

---

## 2. Implemented Hardening Actions

### A. Environment-Based Variable Interpolation (Resolved SEC-001)
* **Action:** Removed all hardcoded secrets from `docker-compose-truenas.yml`.
* **Details:** Replaced them with environment variables (e.g. `${DB_PASSWORD}`, `${REDIS_PASSWORD}`, `${SESSION_SECRET}`).
* **Security Gain:** All secrets are now parsed dynamically from the `.env` file at runtime, ensuring that compose templates can be securely checked into Git without exposing passwords.

### B. SSH Credential Centralization (Resolved SEC-002)
* **Action:** Refactored `deploy-ssh.js`, `run-remote-cmd.js`, and `run-remote-script.js`.
* **Details:** Configured these scripts to parse SSH credentials from the local `.env` variables (`SSH_HOST`, `SSH_USER`, `SSH_PASS`) instead of using hardcoded strings.
* **Security Gain:** Prevents hardcoded root access passwords from residing in the scripts, allowing seamless deployment from various machines using private env configs.

### C. Container Logging Limits (Resolved SEC-003)
* **Action:** Configured unified docker logging limits in `docker-compose-truenas.yml`.
* **Details:** Added `logging` blocks enforcing:
  ```yaml
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
  ```
* **Security Gain:** Limits logs to 30MB per container, eliminating host resource depletion risks.

---

## 3. Recommended Security Roadmap

For long-term production maintenance, we recommend implementing the following security protocols:

1. **Rotate Core Passwords:** Change default database, Redis, and MinIO root credentials from their `2026` defaults. Update the local `.env` with strong generated strings before running the deployment script.
2. **Implement HTTPS (SSL/TLS):**
   * Deploy Let's Encrypt certificates using TrueNAS SCALE's certificate manager or Nginx Proxy Manager.
   * Update `docker-compose-truenas.yml` ports mapping to terminate SSL on port `8443` securely.
3. **Change SSH Authentication:**
   * Disable password logins for SSH on the TrueNAS host.
   * Configure key-based authentication (SSH keys) and update `SSH_CONFIG` in JS files to read private key files:
     ```javascript
     const SSH_CONFIG = {
       host: process.env.SSH_HOST,
       username: 'root',
       privateKey: fs.readFileSync(process.env.SSH_KEY_PATH)
     };
     ```
4. **Isolate Database Subnets:** Ensure the PostgreSQL, Redis, and MinIO containers do not expose their ports to the external host unless absolutely necessary for external integrations.
