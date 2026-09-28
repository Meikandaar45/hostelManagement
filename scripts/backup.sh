#!/usr/bin/env bash
# ==============================================================================
# Hostel Management System - Database Backup Helper Script (POSIX Bash)
# Relies strictly on environment variables for credentials (no hardcoding).
# ==============================================================================

set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-hostel_management}"

mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="${OUTPUT_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql"

echo "=========================================="
echo "Hostel Management System — Database Backup"
echo "Target Database : $DB_NAME"
echo "Target Host     : $DB_HOST:$DB_PORT"
echo "Backup File     : $DUMP_FILE"
echo "=========================================="

mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --result-file="$DUMP_FILE" \
  "$DB_NAME"

echo "✅ Backup successfully created at: $DUMP_FILE"
