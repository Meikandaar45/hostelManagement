# Production Deployment Guide

This guide details the operational requirements, environment configuration, database provisioning, build steps, process management, and troubleshooting procedures for deploying the Hostel Management System to production environments.

---

## 1. System Requirements & Prerequisites

### Infrastructure
- **Operating System**: Linux (Ubuntu 20.04 LTS / 22.04 LTS / Debian 11+ recommended) or Windows Server 2022+
- **CPU**: 2+ vCPUs recommended for concurrent student traffic
- **RAM**: Minimum 2 GB (4 GB recommended for build & database pool)
- **Disk**: 20 GB+ SSD storage (accounting for database growth, audit logs, and backups)

### Runtimes & Databases
- **Node.js**: `v18.18.0` or `v20.x` LTS (Active LTS recommended; supports ESM and global `fetch`)
- **npm**: `v9.x` or `v10.x`
- **MySQL**: `8.0` or higher (InnoDB engine required; uses window functions, check constraints, and native JSON)
- **Reverse Proxy**: Nginx 1.18+ or Caddy 2.x (for SSL termination, gzip/brotli compression, and proxying)
- **Process Manager**: PM2 or systemd (for zero-downtime restarts and background monitoring)

---

## 2. Architecture Overview

```
                      HTTPS :443
 Client Browser ─────────────────────► [ Reverse Proxy: Nginx / Caddy ]
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       │                                                 │
                  Static Assets                                    /api/* Proxy
                 [ /client/dist ]                             [ Node.js Express :5000 ]
                                                                         │
                                                                   mysql2 Pool
                                                                         ▼
                                                             [ MySQL 8+ Database :3306 ]
```

- **Frontend**: Single Page Application (SPA) built with React 19, TypeScript, and Vite, compiled to static HTML/CSS/JS in `client/dist`.
- **Backend**: RESTful API built with Express, TypeScript, and Node.js running on internal port `5000` (or configured `PORT`).
- **Database**: Dedicated MySQL 8+ instance storing ACID-compliant operational data.

---

## 3. Environment Variables Reference

Create a production `.env` file in the root or `server/.env`. **Never commit `.env` into git.**

| Variable | Type | Required | Example / Recommendation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | Yes | `production` | Enables Express production optimizations and error masking |
| `PORT` | Number | Yes | `5000` | Internal HTTP listening port for backend |
| `CLIENT_URL` | String | Yes | `https://hostel.yourdomain.edu` | Canonical client URL used for CORS origin validation |
| `DATABASE_URL` | String | Optional | `mysql://app_user:secret@localhost:3306/hostel_management` | Combined connection URI |
| `DB_HOST` | String | Yes* | `127.0.0.1` | MySQL server host (if `DATABASE_URL` not set) |
| `DB_PORT` | Number | Yes* | `3306` | MySQL server port (if `DATABASE_URL` not set) |
| `DB_USER` | String | Yes* | `hostel_app` | Dedicated non-root MySQL user |
| `DB_PASSWORD` | String | Yes* | `ComplexSecret123!` | Strong password for MySQL user |
| `DB_NAME` | String | Yes* | `hostel_management` | Authoritative database name |
| `JWT_SECRET` | String | Yes | *64+ character random hex* | Key for signing JWT auth tokens (`node -e "console.log(crypto.randomBytes(64).toString('hex'))"`) |
| `JWT_EXPIRES_IN` | String | No | `7d` | Session token lifetime |
| `COOKIE_SECURE` | Boolean | Yes | `true` | Enforces `Secure` flag on auth cookies (Requires HTTPS) |
| `RATE_LIMIT_WINDOW_MS` | Number | No | `900000` | Rate limit sliding window (15 minutes in ms) |
| `RATE_LIMIT_MAX` | Number | No | `20` | Max requests per IP window on auth routes |

---

## 4. Database Setup & Migration

### Step 1: Provision MySQL Database & Dedicated User
Log in to MySQL as root:
```sql
CREATE DATABASE `hostel_management`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- Create least-privilege application user
CREATE USER 'hostel_app'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';

-- Grant required operational privileges
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE TEMPORARY TABLES, LOCK TABLES
  ON `hostel_management`.* TO 'hostel_app'@'localhost';

FLUSH PRIVILEGES;
```

### Step 2: Execute Schema Scripts in Exact Sequence
Execute the 4 numbered SQL scripts from the project root:

```bash
export DB_USER="hostel_app"
export MYSQL_PWD="YOUR_STRONG_PASSWORD"
export DB_NAME="hostel_management"

mysql -u "$DB_USER" "$DB_NAME" < sql/01_foundation_auth.sql
mysql -u "$DB_USER" "$DB_NAME" < sql/02_students_rooms_fees.sql
mysql -u "$DB_USER" "$DB_NAME" < sql/03_complaints_visitors_leave.sql
mysql -u "$DB_USER" "$DB_NAME" < sql/04_final_hardening.sql
```

---

## 5. Application Build & Setup

### Step 1: Clone and Install Dependencies
```bash
git clone https://github.com/your-org/hostel-management.git
cd hostel-management

# Install root, backend, and frontend dependencies
npm run install:all
```

### Step 2: Configure Environment
```bash
cp .env.example .env
cp server/.env.example server/.env
# Edit server/.env with production credentials and set COOKIE_SECURE=true
```

### Step 3: Run Validation & Compilation
```bash
# Verify TypeScript types
npm run typecheck

# Verify code linting
npm run lint

# Run all automated tests
npm test

# Build production assets for backend and frontend
npm run build
```
This produces:
- `server/dist/`: Compiled Node.js ESM server code.
- `client/dist/`: Bundled static production assets.

---

## 6. Process Management (Running in Production)

### Option A: Using PM2 (Recommended)
Install PM2 globally if not installed:
```bash
npm install -g pm2
```

Create `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'hostel-backend',
      cwd: './server',
      script: 'dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        COOKIE_SECURE: 'true',
      },
    },
  ],
};
```

Start the application:
```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

### Option B: Using systemd (Linux)
Create `/etc/systemd/system/hostel-backend.service`:
```ini
[Unit]
Description=Hostel Management System API Server
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/hostel-management/server
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
EnvironmentFile=/var/www/hostel-management/server/.env

[Install]
WantedBy=multi-user.target
```
Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable hostel-backend
sudo systemctl start hostel-backend
```

---

## 7. Reverse Proxy Configuration (Nginx)

Create `/etc/nginx/sites-available/hostel.conf`:

```nginx
server {
    listen 80;
    server_name hostel.yourdomain.edu;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hostel.yourdomain.edu;

    ssl_certificate /etc/letsencrypt/live/hostel.yourdomain.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hostel.yourdomain.edu/privkey.pem;

    # SSL hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static Frontend Assets
    root /var/www/hostel-management/client/dist;
    index index.html;

    # Serve static assets with caching
    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg)$ {
        expires 6M;
        access_log off;
        add_header Cache-Control "public, max-age=15552000, immutable";
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA Client Routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site and test:
```bash
sudo ln -s /etc/nginx/sites-available/hostel.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. Common Deployment Problems & Troubleshooting

### Issue 1: `503 Service Unavailable` from `/api/health`
- **Cause**: Backend running, but cannot connect to MySQL.
- **Troubleshooting**:
  1. Check MySQL service status: `sudo systemctl status mysql`.
  2. Verify credentials in `.env` by testing direct CLI login:
     `mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME`.
  3. Ensure MySQL user has permissions from the specific host (`'hostel_app'@'localhost'` vs `'hostel_app'@'127.0.0.1'`).

### Issue 2: `401 Unauthorized` Loop or Immediate Session Expiry
- **Cause**: `COOKIE_SECURE=true` configured over unencrypted HTTP (without SSL) or mismatched `SameSite`/`domain` cookie flags.
- **Troubleshooting**:
  1. If testing over plain HTTP (e.g. IP address), set `COOKIE_SECURE=false`.
  2. Ensure reverse proxy passes `X-Forwarded-Proto https;` to the backend.

### Issue 3: CORS Errors on API Calls
- **Cause**: `CLIENT_URL` in backend `.env` does not match the exact domain or protocol in the browser URL bar (e.g. `http` vs `https`, or missing port).
- **Troubleshooting**:
  1. Update `CLIENT_URL` in `.env` to match the exact origin (e.g., `https://hostel.yourdomain.edu` without trailing slash).
  2. Restart the backend process: `pm2 restart hostel-backend`.

### Issue 4: React Router 404 on Page Refresh
- **Cause**: Nginx or web server trying to find physical directory instead of falling back to `/index.html`.
- **Troubleshooting**:
  1. Ensure Nginx configuration includes: `try_files $uri $uri/ /index.html;`.

### Issue 5: Schema Migration or Stored Procedure Syntax Errors
- **Cause**: Outdated MySQL version (< 8.0) or executing SQL scripts out of sequence.
- **Troubleshooting**:
  1. Verify MySQL version: `mysql -V` (must be 8.0+).
  2. Confirm scripts were run in order: `01` -> `02` -> `03` -> `04`.
