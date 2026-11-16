#!/usr/bin/env bash
# Setup otomatis ArD.net di GitHub Codespaces
set -e
cd "$(dirname "$0")/.."

echo "==> [ArD.net] Menyiapkan dependensi sistem…"
sudo apt-get update -qq && sudo apt-get install -y -qq build-essential python3 >/dev/null 2>&1 || true

echo "==> [ArD.net] Install dependensi npm…"
npm ci --omit=dev || npm install --omit=dev

echo "==> [ArD.net] Siapkan file .env…"
[ -f .env ] || cp env-example.txt .env

echo "==> [ArD.net] Siapkan data demo…"
node scripts/seed-demo.js || true

echo "==> [ArD.net] Selesai. Aplikasi akan dijalankan otomatis di port 3001."
