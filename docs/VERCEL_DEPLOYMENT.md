# Vercel Deployment Guide — Hostel Management System

This document provides step-by-step instructions to deploy the **Hostel Management System** frontend to **Vercel** and integrate it with your backend and remote MySQL database.

---

## 1. Architecture Overview

```
┌─────────────────────────────────┐
│        Vercel (Frontend)        │
│   React 19 + Vite + TypeScript  │
│    Root Directory: "client"     │
│   https://<your-app>.vercel.app │
└────────────────┬────────────────┘
                 │
                 │ HTTPS REST API Requests
                 │ (Dual: HttpOnly Cookie + Bearer Token)
                 ▼
┌─────────────────────────────────┐
│        Backend Server           │
│   Node.js + Express + TypeScript│
│   (Render / Railway / AWS / VPS)│
│  https://<your-backend-api>.com │
└────────────────┬────────────────┘
                 │
                 │ TCP (Port 3306)
                 ▼
┌─────────────────────────────────┐
│         Remote MySQL 8+         │
│  (Aiven / PlanetScale / Railway)│
└─────────────────────────────────┘
```

> **Important Deployment Rule:**
> - **Frontend (React + Vite):** Deployed to **Vercel**.
> - **Backend (Express + Node.js):** Deployed to a dedicated server platform (e.g., **Render**, **Railway**, **Fly.io**, **AWS**, or **DigitalOcean**). Express relies on a long-running process with a persistent MySQL connection pool.
> - **Database (MySQL 8+):** Hosted on a managed database cloud service (e.g., **Aiven**, **Railway**, **PlanetScale**, **AWS RDS**).

---

## 2. Vercel Import Settings (Exact Values)

When importing the project in the [Vercel Dashboard](https://vercel.com/new):

| Setting | Value to Enter | Notes |
| :--- | :--- | :--- |
| **Git Repository** | `https://github.com/Meikandaar45/hostelManagement` | Select from your connected GitHub account |
| **Project Name** | `hostel-management` | Or any unique name you prefer |
| **Framework Preset** | **Vite** | Automatically detected once Root Directory is set |
| **Root Directory** | **`client`** | **CRITICAL:** Click *Edit* and select the `client` directory |
| **Build Command** | `npm run build` | Runs `tsc && vite build` |
| **Output Directory** | `dist` | Generated build output directory |
| **Install Command** | `npm install` | Installs frontend dependencies |

---

## 3. Vercel Environment Variables

In the Vercel Import screen (or under **Project Settings > Environment Variables**), configure:

| Variable | Description | Target Environments | Example Value |
| :--- | :--- | :--- | :--- |
| **`VITE_API_URL`** | Full URL of your deployed backend API (must include `/api`) | Production, Preview, Development | `https://hostel-backend.onrender.com/api` |

> [!NOTE]
> Never add database credentials (`DB_PASSWORD`), JWT secrets (`JWT_SECRET`), or private keys to Vercel environment variables. Any variable prefixed with `VITE_` is compiled into the client-side JavaScript bundle.

---

## 4. SPA Routing Configuration (`vercel.json`)

React Router handles client-side routing. To prevent `404: NOT_FOUND` errors when users navigate directly or refresh deep pages (such as `/app/dashboard`, `/login`, or `/app/students`), the following configuration is included in [`client/vercel.json`](file:///c:/Users/meira/Downloads/PRO/SE/V1/hostel-management/client/vercel.json):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 5. Backend Configuration for Vercel Deployment

Deploy your backend folder (`server/`) to a platform that supports long-running Node.js processes (e.g., Render, Railway). Set these environment variables on your backend hosting provider:

```bash
# Server Environment
NODE_ENV=production
PORT=5000

# CORS Configuration (Set to your Vercel domain)
CLIENT_URL=https://<your-project>.vercel.app
CORS_ORIGIN=https://<your-project>.vercel.app

# Database Configuration (Remote MySQL instance)
DATABASE_URL=mysql://<user>:<password>@<remote-host>:3306/<database_name>
# Or individual variables:
# DB_HOST=<remote-host>
# DB_PORT=3306
# DB_USER=<user>
# DB_PASSWORD=<password>
# DB_NAME=<database_name>

# Authentication Secrets
JWT_SECRET=<generate_a_64_character_random_hex_string>
JWT_EXPIRES_IN=7d

# Cross-Domain Cookie Configuration
COOKIE_SECURE=true
COOKIE_SAME_SITE=none

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 6. Cross-Origin Authentication Resilience

The application features a **Dual Authentication Mechanism**:
1. **HttpOnly Cookies:** `auth_token` cookie set by the server. With `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`, modern browsers accept cookies between `*.vercel.app` and `*.onrender.com`.
2. **Authorization Bearer Token:** The client's [`client/src/lib/axios.ts`](file:///c:/Users/meira/Downloads/PRO/SE/V1/hostel-management/client/src/lib/axios.ts) also persists the JWT token to `localStorage` and automatically attaches `Authorization: Bearer <token>` to every outbound request.

This ensures authentication works reliably regardless of third-party cookie restrictions in Safari, Brave, or Chrome.

---

## 7. Remote Database Setup

The deployed application **cannot** connect to `localhost:3306`. You must provision a remote MySQL database:

1. **Recommended Cloud MySQL Providers:**
   - [Aiven for MySQL](https://aiven.io/mysql) (Free tier available)
   - [Railway MySQL](https://railway.app)
   - [PlanetScale](https://planetscale.com)
   - [AWS RDS MySQL](https://aws.amazon.com/rds/mysql/)
2. **Database Migration:**
   Execute the schema scripts from the `sql/` folder against your remote database in order:
   - `sql/01_foundation_auth.sql`
   - `sql/02_students_rooms_fees.sql`
   - `sql/03_complaints_visitors_leave.sql`
   - `sql/04_final_hardening.sql`
3. **Seed Initial Accounts:**
   Run `node server/src/seed_phase3.cjs` with your remote `DATABASE_URL` to seed initial administrator, warden, maintenance, and student accounts.

---

## 8. Common Deployment Errors & Solutions

| Error | Root Cause | Solution |
| :--- | :--- | :--- |
| **404 on page refresh (`/app/dashboard`)** | Missing SPA rewrite rule on Vercel | Verify [`client/vercel.json`](file:///c:/Users/meira/Downloads/PRO/SE/V1/hostel-management/client/vercel.json) rewrite to `/index.html` is present. |
| **CORS policy blocked error** | Backend `CLIENT_URL` does not match Vercel URL | Update `CLIENT_URL` or `CORS_ORIGIN` on backend to your exact Vercel URL. |
| **Network Error / Failed to fetch** | `VITE_API_URL` missing or incorrect | Check Vercel Environment Variables. Ensure it has `/api` at the end (e.g., `https://api.domain.com/api`). |
| **401 Unauthorized after login** | Cross-domain cookies blocked | Set `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true` on the backend. The frontend will also automatically use the Bearer token fallback. |
| **Build fails: missing root directory** | Vercel tried building from repository root | Set **Root Directory** to `client` in Vercel project settings. |

---

## 9. Verification Checklist

- [x] `client/vercel.json` created with SPA rewrite to `/index.html`.
- [x] `client/.env.example` created specifying `VITE_API_URL`.
- [x] Axios updated to use `import.meta.env.VITE_API_URL || '/api'`.
- [x] Bearer token fallback implemented in `client/src/lib/axios.ts` and `server/src/middleware/requireAuth.ts`.
- [x] Flexible CORS configured in `server/src/server.ts` supporting Vercel production and preview subdomains.
- [x] `COOKIE_SAME_SITE` and `CORS_ORIGIN` added to `server/src/config/env.ts` and `server/.env.example`.
- [x] `.vercel` added to `.gitignore`.
- [x] Client production build succeeds (`tsc && vite build`).
- [x] Backend production build succeeds (`tsc`).
- [x] 100% of unit and E2E tests pass.
