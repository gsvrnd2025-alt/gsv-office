# 🏢 GSV Office — Enterprise Self-Hosted Workspace Platform

[![Docker](https://img.shields.io/badge/docker-compatible-blue?logo=docker)](https://www.docker.com/)
[![TrueNAS SCALE](https://img.shields.io/badge/TrueNAS%20SCALE-Cobia%20%7C%20Dragonfish%20%7C%20Electric%20Eel-cyan?logo=truenas)](https://www.truenas.com/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red?logo=nestjs)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)

**GSV Office** is a complete, production-ready, self-hosted enterprise workspace platform designed specifically for local area network (LAN) servers and **TrueNAS SCALE** environments. It runs entirely on your local infrastructure without relying on external cloud hosting, public domains, or paid subscription services.

All your communications, document uploads, sales invoices, ticketing data, and email remains 100% on your own local hard drives, fully secured under your control.

---

## 🌟 Key Features

* **💬 Team Chat**: Real-time messaging (Socket.IO) with support for private channels, department groups, attachment uploads, reactions, and pinning.
* **📁 Document Management & File Manager**: Drag-and-drop file upload, version tracking, file/folder sharing, and direct host dataset synchronization.
* **🎫 Helpdesk & Ticket Management**: Customer support workflow, service department allocation, SLA trackers, internal IT comments, and service history.
* **🧾 Invoicing & Billing Module**: Quotations, estimations, sales invoices, credit notes, payments ledger, and PDF export with full Indian GST rate rules.
* **📦 Inventory & Purchase Orders**: Multi-warehouse stock tracking, product SKUs, restock alerts, suppliers registry, and purchase procurement flows.
* **✉️ Email Management**: A built-in webmail client that integrates seamlessly with your local mail server or external SMTP/IMAP configurations.
* **👤 User Management & RBAC**: Advanced Role-Based Access Control, employee ID generation, designation assignment, profile details, and account moderation (suspend/block).
* **🖥️ Server Administration**: Dynamic server resource indicators (CPU, memory, storage), real-time container log streaming, and dynamic system settings database.
* **🔌 Extensible Plugin Runtime**: Expand features by hot-uploading plugins without restarting core containers.

---

## 🛠 Tech Stack

### Backend API
* **NestJS** (TypeScript backend framework)
* **TypeORM** + **PostgreSQL 16** (Relational storage with full schema and seed files)
* **Socket.IO** (Real-time gateway communication)
* **MinIO Node SDK** (Local S3 object storage helper)
* **bcrypt** (Secure, salted password hashing)
* **Bull Queue** (Redis-backed job queue processor)
* **Swagger** (Interactive API testing console at `/api/docs`)

### Frontend Web UI
* **React 18** + **TypeScript**
* **Vite** (Ultra-fast build pipeline)
* **Zustand** (Sleek global store client-side state)
* **TanStack Query (React Query v5)** (Server state management & caching)
* **Recharts** (Interactive reports and analytics charts)
* **Lucide Icons** (Premium modern icon pack)

---

## 📂 Project Directory Structure

```
gsv-office/
├── docker-compose.yml        # Docker production stack orchestrator
├── .env.example              # Core environment configuration template
├── truenas-scale-app.yaml    # TrueNAS Custom App definition sheet
│
├── database/                 # SQL database setup
│   ├── schema.sql            # Table structures & indexes
│   └── seed.sql              # Default system roles, parameters, and admin account
│
├── nginx/                    # Reverse Proxy configurations
│   ├── nginx.conf
│   └── conf.d/
│       └── default.conf      # Virtual Host routing rules and rate limits
│
├── backend/                  # NestJS API application files
│   ├── Dockerfile
│   ├── src/                  # Controllers, Modules, Entities, and Gateways
│   └── tsconfig.json
│
├── frontend/                 # React UI application files
│   ├── Dockerfile
│   ├── src/                  # React screens, components, API client, hooks, and pages
│   └── tsconfig.json
│
└── docs/                     # System Guides
    ├── INSTALL.md            # TrueNAS & Linux docker-compose setup manual
    └── ADMIN_MANUAL.md        # Comprehensive administrator procedures guide
```

---

## 🚀 Quick Start (Development Mode)

To run the platform locally in development mode:

### 1. Install Node Dependencies
In both the `/backend` and `/frontend` folders, install required packages:
```bash
# In backend/
npm install

# In frontend/
npm install
```

### 2. Copy and Configure Environment
Copy `.env.example` in the root folder as `.env` and fill in your passwords and database settings.

### 3. Launch Development Database & Cache Services
Run standard Postgres, Redis, and MinIO locally:
```bash
docker-compose up -d postgres redis minio
```

### 4. Run Applications
```bash
# Start backend in watch mode (terminal 1)
cd backend
npm run start:dev

# Start frontend in development mode (terminal 2)
cd frontend
npm run dev
```

---

## 🛡 Security & Compliance

* All communication passes through Nginx rate limiting rules to block DDoS/Brute-force attempts.
* Short-lived JWT Access Tokens are kept securely and refreshed via server-signed HTTP-Only cookies.
* Complete database action audit logging tracking changes in users, permissions, and invoice configurations.

---

## 📖 Deployment Documentation

For detailed production guidelines:
* 💽 Go to the [TrueNAS SCALE Custom App Install Guide](docs/INSTALL.md) to launch the app.
* 🛠 Go to the [System Administrator Manual](docs/ADMIN_MANUAL.md) for management details.
