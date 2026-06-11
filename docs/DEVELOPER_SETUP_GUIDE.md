# GSV Office — Developer Setup Guide

This guide provides setup instructions for onboarding developers, setting up local workspaces, installing dependencies, and compiling/running the application locally.

---

## 1. Local Workspace Setup

### Prerequisites
* **Node.js:** version 20.x or higher.
* **NPM:** version 10.x or higher.
* **Docker & Docker Compose:** Required to run local Postgres, Redis, and MinIO databases.

---

## 2. Directory Structure

```
gsv-office/
├── backend/            # NestJS Backend API
├── frontend/           # Vite + React Frontend
├── docs/               # System & User Guides
├── scripts/            # Release, Backup, and Health utilities
├── database/           # Schema SQL templates
├── nginx/              # Nginx reverse proxy configuration
└── docker-compose.yml  # Local Docker Compose for development
```

---

## 3. Local Development Steps

### Step 1: Clone and Configure Environment
1. Clone the project locally:
   ```bash
   git clone https://github.com/gsvrnd2025-alt/gsv-office.git
   cd gsv-office
   ```
2. Setup local databases by copying `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Start the local database containers (PostgreSQL, Redis, MinIO):
   ```bash
   docker compose up -d postgres redis minio
   ```

### Step 2: Initialize Database Schemas
The local Postgres container automatically seeds itself using files in `database/schema.sql` and `database/seed.sql` on startup. If you need to seed manually:
```bash
docker exec -i gsv_postgres psql -U gsv_admin -d gsv_office < database/schema.sql
docker exec -i gsv_postgres psql -U gsv_admin -d gsv_office < database/seed.sql
```

### Step 3: Backend API Setup
1. Navigate to the backend folder and install dependencies:
   ```bash
   cd backend
   npm install
   ```
2. Start NestJS in watch (development) mode:
   ```bash
   npm run start:dev
   ```
The backend API will run at: `http://localhost:3000`

### Step 4: Frontend SPA Setup
1. Open a new terminal, navigate to the frontend folder, and install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
The frontend SPA will run at: `http://localhost:5173`

---

## 4. Linting & Building

Before committing or pushing code, verify that compilation succeeds without errors:

* **Backend Compilation Check:**
  ```bash
  cd backend
  npm run lint
  npm run build
  ```
* **Frontend Compilation Check:**
  ```bash
  cd frontend
  npm run lint
  npm run build
  ```
* **Clean Build Cache:**
  If you encounter caching errors during compilation, delete the `node_modules` folders, clear cache, and run a fresh installation:
  ```bash
  npm cache clean --force
  ```
