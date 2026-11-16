#!/usr/bin/env bash
# Jalankan ArD.net otomatis saat Codespace aktif
cd "$(dirname "$0")/.."
if pgrep -f "node app-customer.js" >/dev/null 2>&1; then
  echo "==> [ArD.net] Aplikasi sudah berjalan."
  exit 0
fi
echo "==> [ArD.net] Menjalankan aplikasi di background (port 3001)…"
nohup node app-customer.js > /tmp/ard-net.log 2>&1 &
sleep 3
echo "==> [ArD.net] Log: /tmp/ard-net.log"
