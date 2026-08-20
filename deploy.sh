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

echo ">> Cek ekstensi PHP yang dibutuhkan (export Word/Excel pakai PhpWord/PhpSpreadsheet)"
# Pemetaan modul PHP -> nama paket apt: "dom" & "simplexml" ikut satu paket
# php8.4-xml (tidak ada paket php8.4-dom terpisah) — kalau salah nama paket
# di sini, apt-get install gagal dan deploy berhenti total (set -e di atas).
declare -A PHP_EXT_PAKET=( [zip]="php8.4-zip" [gd]="php8.4-gd" [mbstring]="php8.4-mbstring" [dom]="php8.4-xml" )
PHP_PAKET_KURANG=""
for ext in "${!PHP_EXT_PAKET[@]}"; do
    if ! php -m | grep -qi "^${ext}$"; then
        PHP_PAKET_KURANG="$PHP_PAKET_KURANG ${PHP_EXT_PAKET[$ext]}"
    fi
done
if [ -n "$PHP_PAKET_KURANG" ]; then
    echo "   Ekstensi belum terpasang, memasang paket:$PHP_PAKET_KURANG"
    sudo apt-get update -y
    sudo apt-get install -y $PHP_PAKET_KURANG
    sudo systemctl restart php8.4-fpm
fi

echo ">> Backend update"
cd backend
composer install --optimize-autoloader --no-dev
php artisan migrate --force
php artisan storage:link
php artisan config:clear
php artisan config:cache

echo ">> Pasang cron scheduler (kalau belum ada)"
CRON_FILE=/etc/cron.d/ms-smkmuhsampit-scheduler
if [ ! -f "$CRON_FILE" ]; then
    echo "* * * * * www-data cd /var/www/ms-smkmuhsampit/backend && php artisan schedule:run >> /dev/null 2>&1" | sudo tee "$CRON_FILE" > /dev/null
    sudo chmod 644 "$CRON_FILE"
fi

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
