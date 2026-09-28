@echo off
title Hostel Management System
echo ========================================================
echo Starting Hostel Management System...
echo ========================================================

echo [1/3] Starting Backend Server on http://localhost:5000...
start "Hostel Backend (Port 5000)" cmd /k "cd /d %~dp0server && npx tsx src/server.ts"

echo [2/3] Starting Frontend Client on http://localhost:5173...
start "Hostel Frontend (Port 5173)" cmd /k "cd /d %~dp0client && npx vite"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo ========================================================
echo System is running!
echo Login Credentials:
echo   Username: admin
echo   Password: password123
echo ========================================================
pause
