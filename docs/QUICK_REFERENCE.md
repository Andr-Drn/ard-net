# Quick Reference — ArD.net (v0.6.x)

## Menjalankan

```bash
docker compose up -d --build        # Docker (disarankan) — lihat README untuk persiapan awal
npm start                           # manual (Node.js ≥ 20)
npm run dev                         # pengembangan (nodemon)
pm2 start ecosystem.config.js       # PM2 (nama proses: ard-net)
npm test                            # unit test
```

## Portal

| Portal | URL | Login awal |
|---|---|---|
| Admin | `/admin/login` | `admin` / `demo-isp123` (**ganti segera**) |
| Pelanggan | `/customer/login` | nomor HP |
| Teknisi | `/tech/login` | akun teknisi |
| Kolektor | `/collector/login` | akun kolektor |
| Health | `/health` | — (`{"status":"ok","version":"..."}`) |
| Versi | `/version.txt` | — |

`/` menampilkan landing page publik. Portal agen sudah dihapus dari fork ini.

## File penting

```
app-customer.js            ← entry point
config/database.js         ← skema & migrasi otomatis
config/settingsManager.js  ← baca/tulis settings.json
routes/adminPortal.js      ← rute admin     routes/customerPortal.js ← rute pelanggan
services/billingService.js ← logika tagihan services/mikrotikService.js ← API MikroTik
services/oltService.js     ← OLT (SNMP/CLI) services/cronService.js ← semua jadwal
```

Lokasi `settings.json`: root proyek, atau path dari env `SETTINGS_PATH`
(Docker: `docker-data/config/settings.json`). Perubahan lewat UI langsung berlaku;
bila file diedit manual, restart aplikasi.

## Pengaturan umum

Hampir semua diatur lewat **Admin → Pengaturan**. Kunci dasar di `settings.json`:

```json
{ "server_port": 3001, "company_header": "NAMA ISP", "cookie_secure": false,
  "mikrotik_host": "192.168.88.1", "mikrotik_user": "api-user", "mikrotik_password": "...", "mikrotik_port": 8728 }
```

## Checklist keamanan sebelum produksi

1. Ganti `admin_username` / `admin_password` (default `demo-isp123`).
2. Pastikan `session_secret` acak, minimal 32 karakter.
3. Aktifkan HTTPS di reverse proxy dan set `"cookie_secure": true`.
4. Isi `webhook_secret` (dan `gowa_webhook_secret`) dengan nilai acak: `openssl rand -hex 32`.
5. Batasi akses port 3001, RADIUS (1812/1813 UDP), dan API MikroTik ke jaringan tepercaya.
6. Jangan commit/bagikan `settings.json`, `docker-data/`, `.env`, `.env.gowa`.

## Endpoint penting

- Publik: `GET /health`, `GET /version.txt`, `GET /isolated` (halaman isolir)
- Webhook masuk: `POST /api/webhook/v1/payment-notif` (notifikasi pembayaran, perlu secret),
  `POST /api/webhook/gowa`, `POST /api/webhook/mayar`, `POST /api/webhook/fonnte`
- Billing (admin, sesi login): `GET /admin/billing`, `POST /admin/billing/generate`,
  `POST /admin/billing/:id/pay`, `POST /admin/billing/:id/unpay`, `POST /admin/billing/pay-bulk`
- Backup (admin): `POST /admin/backup/create`, `/restore`, `/upload-restore`, `/delete`, `/cleanup`
- Bahasa: `GET /lang/id`, `GET /lang/en`

## Jadwal otomatis (`services/cronService.js`, zona waktu dari pengaturan)

| Jadwal | Tugas |
|---|---|
| Tgl 1, 00:01 | Generate tagihan bulanan |
| Tgl 1, 00:30 | Rekap bulanan auto-lunas ke admin |
| Harian 02:00 | Isolir otomatis |
| Harian 03:30 | Auto-nonaktif pelanggan menunggak ≥ N bulan (default 3) |
| Harian 04:15 / 04:45 | Bersihkan sampah ACS / hapus notif webhook lama |
| Harian 09:00 | Pengingat tagihan (WhatsApp) |
| Harian 00:00 & 06:00 | Jam kalong: mulai / akhiri profil malam |
| Tiap 10 menit | Sinkron pemakaian (usage tracking) |
| Tiap jam | Cek FUP |
| Tiap 5 menit | Refresh ACS & sinkron IP; refresh cache status layanan |
| Tiap 30 menit | AI Self-Healing (bila diaktifkan) |
| Tiap 2 menit | Security Watchdog (login gagal MikroTik) |
| Harian 02:00 (default) | Backup otomatis (`auto_backup_schedule`) |

## Database

```bash
node scripts/verify-database.js      # cek struktur
bash scripts/fix-database.sh         # perbaikan kolom/tabel (cadangkan dulu)
```

Backup/restore: [BACKUP_CHECKLIST.md](BACKUP_CHECKLIST.md) · Skema: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

## Skrip bantu (`scripts/`)

`seed-demo.js` (data demo) · `olt-probe.js` (deteksi OLT baru) · `sync-onu-names.js` ·
`verify-database.js` · `check-mikhmon-data.js` · `test-mikhmon-parser.js` · `test-admin.js` · `test-message.js`

## Troubleshooting

| Gejala | Tindakan |
|---|---|
| Port 3001 terpakai | `ss -ltnp \| grep 3001`; ganti `server_port` atau hentikan proses lain |
| Database locked | Pastikan hanya satu proses yang memakai DB (hentikan instance ganda). **Jangan hapus `billing.db-wal`/`-shm`** — berisi transaksi yang belum ter-checkpoint. Bila perlu: hentikan aplikasi, lalu `sqlite3 billing.db "PRAGMA wal_checkpoint(TRUNCATE); PRAGMA integrity_check;"` |
| GenieACS gagal | Cek `genieacs_url`, lalu `curl http://IP:7557/devices?limit=1` |
| WhatsApp tidak terkirim | Admin → WhatsApp: cek status gateway (GOWA) dan webhook secret |
| Pembayaran tidak tercatat | cek log notifikasi webhook di panel admin dan `logs/combined.log`; input manual bila perlu |
| Settings tidak tersimpan (Docker) | Pastikan `docker-data/config/settings.json` adalah **file**, bukan folder |

## Bahasa antarmuka

`locales/id.json` (bawaan) dan `locales/en.json` — kunci keduanya identik. Bahasa baru: salin
`id.json` ke `locales/<kode>.json`, terjemahkan, lalu daftarkan kodenya di `SUPPORTED_LANGS` dan `dictionaries` pada `config/i18n.js`.

## Checklist sebelum go-live

- [ ] Backup & uji restore ([BACKUP_CHECKLIST.md](BACKUP_CHECKLIST.md))
- [ ] Koneksi MikroTik / OLT / GenieACS teruji
- [ ] Pembayaran (QRIS/webhook) teruji
- [ ] WhatsApp & Telegram teruji
- [ ] Semua poin keamanan di atas selesai
- [ ] Jadwal cron dipantau di `logs/combined.log`

---
Diperbarui: November 2026 · Versi aplikasi: 0.6.17
