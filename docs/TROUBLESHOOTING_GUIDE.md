# GSV Office — System Troubleshooting Guide

This guide helps administrators diagnose and resolve common operational issues, connection failures, and error codes on the GSV Office platform.

---

## 1. Quick Diagnostic Commands

Run these command sequences from the TrueNAS host shell to get a rapid system health overview:

* **Check running container states:**
  ```bash
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  ```
* **Follow NestJS Backend logs in real-time:**
  ```bash
  docker logs -f gsv_api
  ```
* **Verify PostgreSQL database connection availability:**
  ```bash
  docker exec -it gsv_postgres pg_isready -U gsv_admin -d gsv_office
  ```
* **Verify Redis connection health:**
  ```bash
  docker exec -it gsv_redis redis-cli -a gsv_redis_password_2026 ping
  ```
* **Verify MinIO storage health response:**
  ```bash
  curl -I http://localhost:9000/minio/health/live
  ```

---

## 2. Common Issues & Solutions

### A. Blank UI Screen or "Site is not available"
* **Symptoms:** Browser displays infinite loading circle, connection timed out error, or a blank page.
* **Possible Causes:** Nginx is running but the backend API is stopped or crashed, resulting in proxy connection failures.
* **Resolution:**
  1. Check if both frontend and backend containers are active:
     ```bash
     docker ps | grep gsv_
     ```
  2. If `gsv_api` is down, check its crash logs:
     ```bash
     docker logs --tail 100 gsv_api
     ```
  3. Look for database authentication or port conflict exceptions. Re-start the container:
     ```bash
     docker start gsv_api
     ```

### B. "504 Gateway Timeout" during large file uploads
* **Symptoms:** Upload progress bar gets stuck at 99%, or drops with an HTTP 504 status code after uploading large files.
* **Possible Causes:** File upload size exceeds default timeouts or proxy size limits.
* **Resolution:**
  1. Check that `client_max_body_size 5000M;` is configured inside `/mnt/GSVR_Movies/apps/gsv-office/nginx/conf.d/default.conf` and `/mnt/GSVR_Movies/apps/gsv-office/nginx/nginx.conf`.
  2. Verify that the host disk dataset has sufficient space:
     ```bash
     df -h /mnt/GSVR_Movies/apps/gsv-office/uploads
     ```
  3. Increase Nginx timeouts:
     ```nginx
     proxy_connect_timeout 600s;
     proxy_send_timeout 600s;
     proxy_read_timeout 600s;
     ```

### C. Database locks or "Too many connections" errors
* **Symptoms:** NestJS API logs display `QueryFailedError: remaining connection slots are reserved` or `TimeoutError`.
* **Possible Causes:** Orphan processes or heavy concurrent sheet sync requests holding Postgres connections.
* **Resolution:**
  1. Connect to PostgreSQL and identify blocking connection processes:
     ```bash
     docker exec -it gsv_postgres psql -U gsv_admin -d gsv_office -c "SELECT pid, query, state, age(clock_timestamp(), query_start) FROM pg_stat_activity WHERE state != 'idle';"
     ```
  2. Kill a specific blocking process ID:
     ```bash
     docker exec -it gsv_postgres psql -U gsv_admin -d gsv_office -c "SELECT pg_terminate_backend(<PID>);"
     ```
  3. Restart the database and API containers:
     ```bash
     docker restart gsv_postgres gsv_api
     ```

### D. Redis queue backing up (Emails not sending)
* **Symptoms:** Notification emails get stuck in queue; BullMQ dashboard shows growing number of "Active" or "Delayed" jobs.
* **Possible Causes:** Redis connection credentials mismatches or crashed queue consumer threads.
* **Resolution:**
  1. Flush the Redis queues:
     ```bash
     docker exec -it gsv_redis redis-cli -a gsv_redis_password_2026 flushall
     ```
  2. Restart the API service to initialize new queue consumers:
     ```bash
     docker restart gsv_api
     ```
