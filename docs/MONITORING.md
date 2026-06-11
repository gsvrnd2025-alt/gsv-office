# GSV Office — System Monitoring & Logging Guide

This document outlines the container health dashboard, alerting strategy, and log retention/rotation policies designed for the GSV Office production deployment on TrueNAS SCALE.

---

## 1. Health Dashboard Design

To monitor the health of the six core services in real-time, we recommend deploying a lightweight health dashboard. 

### Recommended Stack: Netdata (Lightweight, Native TrueNAS app)
Netdata is highly recommended for single-node TrueNAS deployments. It is available as a Catalog App in TrueNAS SCALE and offers out-of-the-box monitoring for:
1. **Container States:** CPU, Memory, and Network usage per container namespace.
2. **PostgreSQL metrics:** Connection pool sizes, query execution time, read-write transaction ratios.
3. **Redis engine:** Key hit rate, memory utilization, cache eviction ratios.
4. **Active Disk Pools:** Disk I/O bottlenecks and free capacities on ZFS.

### Alternative Stack: Prometheus & Grafana (Advanced Enterprise Stack)
For cluster deployments or advanced requirements, deploy Prometheus and Grafana.
* **Prometheus Configuration:** Scrapes metrics from:
  * Node Exporter (runs on TrueNAS host).
  * cAdvisor (scrapes Docker container statuses).
  * postgres_exporter (scrapes database statistics).
  * redis_exporter (scrapes queue performance).
* **Grafana Dashboard:** Configure a unified dashboard visualizing:
  * Platform Uptime & HTTP Response Status Codes.
  * Socket.io connections count (active webchat users).
  * Database transaction latency.
  * ZFS pool read/write activity.

---

## 2. Health Monitoring Cron Job

We provide a custom script `scripts/health-check.sh` on the TrueNAS host.
* **Functionality:** 
  1. Checks if all six containers (`gsv_nginx`, `gsv_api`, `gsv_postgres`, `gsv_redis`, `gsv_minio`, `gsv_mailserver`) are in the `running` state.
  2. Queries the `/api/health` HTTP endpoint on the API container.
  3. Inspects ZFS pool capacity (`GSVR_Movies`) and database storage size.
  4. Triggers automatic container recovery restarts if services fail.

### Configuration on TrueNAS SCALE:
To run this script every 5 minutes:
1. Log in to the TrueNAS SCALE Web Portal.
2. Go to **System Settings** -> **Advanced** -> **Cron Jobs** -> **Add**.
3. Configure:
   * **Description:** `GSV Office Container & API Health Check`
   * **Command:** `bash /mnt/GSVR_Movies/apps/gsv-office/scripts/health-check.sh`
   * **User:** `root`
   * **Schedule:** `*/5 * * * *` (Every 5 minutes)
4. Save the job.

---

## 3. Alerting Strategy

When a failure is detected by the health check script, the alert protocol runs:
1. **Log Entry:** Writes a warning block to `/var/log/gsv_health.log`.
2. **Email Alerts:** Calls the internal mail container `gsv_mailserver` to send an alert email to `admin@gsv.local`.
3. **Webhook Integration (Optional):** We recommend adding a webhook command to `scripts/health-check.sh` to post alerts directly to Microsoft Teams or Discord:
   ```bash
   curl -H "Content-Type: application/json" -d '{"content":"🚨 GSV Office Alert: Container Stopped!"}' <discord-webhook-url>
   ```

---

## 4. Log Retention & Rotation Policy

To prevent the system disk from filling up, log rotation is enforced at the container level and application levels.

### A. Container Logs (Docker Engine)
All services in `docker-compose-truenas.yml` are configured with log size limits:
```yaml
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```
* **Effect:** Each container keeps a maximum of 3 log files of 10MB each. Maximum space per container is capped at 30MB, totaling 180MB for the entire suite.

### B. Application Logs (NestJS & Nginx)
1. **NestJS API Logs:** Managed by NestJS config, stored under `/app/logs` inside the container (mounted to host path). Logs are set to rotate automatically daily or at 20MB limits.
2. **Nginx access/error logs:** Written to standard docker stdout/stderr, which are routed to the Docker logging engine (and thus rotated by the 30MB limit above).
