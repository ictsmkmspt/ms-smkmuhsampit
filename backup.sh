#!/bin/bash
set -e
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/backup-full-$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo ">> Copy project files"
rsync -a --exclude='node_modules' --exclude='vendor' /var/www/ms-smkmuhsampit/ "$BACKUP_DIR/ms-smkmuhsampit/"

echo ">> Dump database"
mysqldump -u ict -pMerak47a --no-tablespaces ms_ict > "$BACKUP_DIR/database.sql"

echo ">> Compress"
cd "$BACKUP_DIR"
tar -czvf /tmp/backup-smkmuhsampit-$TIMESTAMP.tar.gz .

echo ">> Cleanup"
rm -rf "$BACKUP_DIR"

echo ">> Selesai: /tmp/backup-smkmuhsampit-$TIMESTAMP.tar.gz"
