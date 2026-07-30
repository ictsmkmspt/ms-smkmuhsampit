#!/bin/bash
set -e
cd /var/www/ms-smkmuhsampit

echo ">> Backup .env"
cp backend/.env /tmp/.env.backup

echo ">> Backup database"
mysqldump --no-tablespaces -u ict -pMerak47a ms_ict > /tmp/db_backup_$(date +%Y%m%d_%H%M%S).sql

echo ">> Git pull (hard reset)"
git fetch --all
git reset --hard origin/main

echo ">> Restore .env"
cp /tmp/.env.backup backend/.env

echo ">> Backend update"
cd backend
composer install --optimize-autoloader --no-dev
php artisan migrate --force
php artisan storage:link
php artisan config:clear
php artisan config:cache

echo ">> Frontend build"
cd ../frontend
npm install
npm run build

echo ">> Fix permission"
sudo chown -R www-data:www-data /var/www/ms-smkmuhsampit/backend/storage
sudo chown -R www-data:www-data /var/www/ms-smkmuhsampit/backend/bootstrap/cache
sudo chmod -R 775 /var/www/ms-smkmuhsampit/backend/storage
sudo chmod -R 775 /var/www/ms-smkmuhsampit/backend/bootstrap/cache

echo ">> Reload PHP-FPM"
sudo systemctl reload php8.4-fpm

echo ">> Deploy selesai!"
