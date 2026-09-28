<#
.SYNOPSIS
    Hostel Management System - Database Backup Helper Script (PowerShell)
.DESCRIPTION
    Creates a timestamped compressed backup of the MySQL database.
    Relies strictly on environment variables for credentials (no hardcoding).
.EXAMPLE
    $env:DB_HOST="localhost"
    $env:DB_PORT="3306"
    $env:DB_USER="root"
    $env:DB_NAME="hostel_management"
    .\scripts\backup.ps1
#>

param(
    [string]$OutputDir = "./backups"
)

$ErrorActionPreference = "Stop"

$dbHost = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$dbPort = if ($env:DB_PORT) { $env:DB_PORT } else { "3306" }
$dbUser = if ($env:DB_USER) { $env:DB_USER } else { "root" }
$dbName = if ($env:DB_NAME) { $env:DB_NAME } else { "hostel_management" }

if (-not (Test-Path -Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dumpFile = Join-Path $OutputDir "${dbName}_backup_${timestamp}.sql"

Write-Host "=========================================="
Write-Host "Hostel Management System — Database Backup"
Write-Host "Target Database : $dbName"
Write-Host "Target Host     : $dbHost:$dbPort"
Write-Host "Backup File     : $dumpFile"
Write-Host "=========================================="

# If DB_PASSWORD environment variable is present, mysqldump will read it or prompt safely
$mysqldumpCmd = "mysqldump"

# Execute mysqldump with single transaction and quick options for zero downtime
& $mysqldumpCmd --host=$dbHost --port=$dbPort --user=$dbUser --single-transaction --quick --routines --triggers --result-file=$dumpFile $dbName

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup successfully created at: $dumpFile" -ForegroundColor Green
    $fileInfo = Get-Item $dumpFile
    Write-Host "Size: $([math]::Round($fileInfo.Length / 1KB, 2)) KB"
} else {
    Write-Host "❌ Backup failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
