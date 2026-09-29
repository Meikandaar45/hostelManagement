@echo off
title Hostel Management - MySQL Database Viewer
cls
echo ================================================================
echo           HOSTEL MANAGEMENT SYSTEM - DATABASE VIEWER
echo ================================================================
echo Database: hostel_management
echo Host: localhost:3306
echo User: root
echo ================================================================
echo.
echo Choose an option:
echo   [1] Open Interactive MySQL Terminal (SHOW TABLES, SELECT, etc.)
echo   [2] View All Users and Roles
echo   [3] View All Students and Allocations
echo   [4] View All Leave Requests and Gate Passes
echo   [5] View All Fees and Payments
echo   [6] View All Complaints and Maintenance Tickets
echo   [7] Launch MySQL Workbench GUI
echo   [8] Exit
echo.
set /p opt="Enter choice (1-8): "

if "%opt%"=="1" (
    cls
    echo Opening interactive MySQL session... Type 'exit' to quit.
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot123 hostel_management
)
if "%opt%"=="2" (
    cls
    echo --- USERS TABLE ---
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot123 hostel_management -t -e "SELECT id, username, full_name, email, role, is_active, last_login_at FROM users;"
    pause
    goto :EOF
)
if "%opt%"=="3" (
    cls
    echo --- STUDENTS AND ROOM ALLOCATIONS ---
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot123 hostel_management -t -e "SELECT s.id, s.student_id, s.full_name, s.department, s.contact_number, r.room_number, r.block FROM students s LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.vacated_at IS NULL LEFT JOIN rooms r ON ra.room_id = r.id;"
    pause
    goto :EOF
)
if "%opt%"=="4" (
    cls
    echo --- LEAVE REQUESTS AND GATE PASSES ---
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot123 hostel_management -t -e "SELECT lr.id, s.full_name as student, lr.from_datetime, lr.to_datetime, lr.status, lr.gate_pass_number, lr.reason FROM leave_requests lr JOIN students s ON lr.student_id = s.id ORDER BY lr.id DESC;"
    pause
    goto :EOF
)
if "%opt%"=="5" (
    cls
    echo --- FEES AND PAYMENTS ---
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot123 hostel_management -t -e "SELECT p.id, p.receipt_number, f.fee_type, p.amount, p.payment_method, p.paid_at FROM payments p JOIN fees f ON p.fee_id = f.id;"
    pause
    goto :EOF
)
if "%opt%"=="6" (
    cls
    echo --- COMPLAINTS AND MAINTENANCE TICKETS ---
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot123 hostel_management -t -e "SELECT c.id, c.ticket_id, s.full_name as student, c.category, c.priority, c.status, LEFT(c.description, 40) as description FROM complaints c JOIN students s ON c.student_id = s.id;"
    pause
    goto :EOF
)
if "%opt%"=="7" (
    echo Starting MySQL Workbench...
    start "" "C:\Program Files\MySQL\MySQL Workbench 8.0\MySQLWorkbench.exe"
)
