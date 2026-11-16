# Backup & Restore — ArD.net

Panduan ini untuk instalasi **Docker** (data di `docker-data/`). Untuk instalasi manual, ganti
`docker-data/config/settings.json` → `settings.json`, `docker-data/database` → `database`,
`docker-data/uploads` → `public/uploads`, `docker-data/backups` → `backups`.

## Apa yang harus di-backup

| Data | Lokasi (Docker) | Catatan |
|---|---|---|
| Database | `docker-data/database/billing.db` | Mode WAL — **jangan** salin file mentah saat aplikasi berjalan |
| Pengaturan | `docker-data/config/settings.json` | Berisi rahasia (token, API key, password) — simpan terenkripsi |
| Upload | `docker-data/uploads/` | QRIS, bukti pembayaran, foto |
| Sesi WhatsApp | `docker-data/baileys/` | Opsional; tanpa ini cukup scan QR ulang |
| Rahasia `.env` / `.env.gowa` | di folder proyek | Bila dipakai |

## 1. Backup bawaan aplikasi (disarankan)

- **Admin → Backup**: buat, unduh, restore, unggah-restore, hapus, dan bersihkan backup lama.
- Backup otomatis aktif secara bawaan, **harian 02:00** (`auto_backup_enabled`, `auto_backup_schedule`
  di pengaturan). Backup database memakai `VACUUM INTO` sehingga snapshot konsisten walau WAL aktif.
- Hasilnya disimpan di `docker-data/backups/` (sudah di-mount oleh `docker-compose.yml`).
  Retensi bawaan pembersihan: 30 hari.
- **Salin folder `docker-data/backups/` ke lokasi lain** (USB/NAS/cloud). Backup yang hanya ada di
  server yang sama tidak melindungi dari disk rusak.

## 2. Backup manual dari host

Butuh `sqlite3` di **host** (tidak ada di dalam image Docker).

```bash
cd /path/ke/ard-net
TS=$(date +%Y-%m-%d-%H%M%S)
mkdir -p backup-manual

# Snapshot database yang konsisten (aman saat aplikasi berjalan)
sqlite3 docker-data/database/billing.db "VACUUM INTO '$PWD/backup-manual/billing-$TS.db'"

# Pengaturan + upload
cp docker-data/config/settings.json backup-manual/settings-$TS.json
tar -czf backup-manual/uploads-$TS.tar.gz -C docker-data uploads

# Verifikasi
sqlite3 backup-manual/billing-$TS.db "PRAGMA integrity_check; SELECT COUNT(*) FROM customers;"
chmod 600 backup-manual/settings-*.json
```

Cara paling sederhana lain: `docker compose stop` → salin seluruh `docker-data/` → `docker compose start`.

## 3. Restore

**Lewat UI (disarankan):** Admin → Backup → Restore / Unggah & Restore. Restore diterapkan saat
startup (sebelum koneksi DB dibuka) dan aplikasi restart otomatis.

**Manual:**

```bash
docker compose stop
cp backup-manual/billing-YYYY-MM-DD-HHMMSS.db docker-data/database/billing.db
rm -f docker-data/database/billing.db-wal docker-data/database/billing.db-shm   # WAL lama milik DB yang ditimpa
cp backup-manual/settings-YYYY-MM-DD-HHMMSS.json docker-data/config/settings.json
tar -xzf backup-manual/uploads-YYYY-MM-DD-HHMMSS.tar.gz -C docker-data   # opsional
docker compose start
curl -fsS http://localhost:3001/health
```

> Hapus `-wal`/`-shm` **hanya** setelah file `.db` diganti dengan snapshot bersih. Jangan pernah
> menghapusnya pada database yang sedang dipakai: transaksi yang belum ter-checkpoint ikut hilang.

## 4. Otomatisasi dari host (opsional)

```bash
# crontab -e   (harian 03:00, simpan 30 hari)
0 3 * * * cd /path/ke/ard-net && sqlite3 docker-data/database/billing.db "VACUUM INTO '/backup/billing-$(date +\%F).db'" && find /backup -name 'billing-*.db' -mtime +30 -delete
```

## 5. Skenario darurat

| Masalah | Tindakan |
|---|---|
| Database rusak | `docker compose stop` → restore backup terakhir (bagian 3) → start |
| Aplikasi crash loop | `docker compose logs --tail 100 ard-net`; periksa `docker-data/logs/error.log` |
| Settings salah | Ganti `docker-data/config/settings.json` dengan salinan terakhir yang baik, `docker compose restart` |
| Disk penuh | `df -h`; hapus backup lama (Admin → Backup → Bersihkan); log berotasi otomatis (10 MB × 5) |
| Izin file | `sudo chown -R $USER:$USER docker-data` lalu `chmod 600 docker-data/config/settings.json` |
| Setelah restore, DB "locked" | Pastikan hanya satu proses memakai DB; `PRAGMA integrity_check;` — jangan hapus `-wal` |

## 6. Verifikasi backup (lakukan berkala, minimal bulanan)

```bash
sqlite3 backup.db "PRAGMA integrity_check;"      # harus: ok
sqlite3 backup.db "SELECT COUNT(*) FROM customers; SELECT COUNT(*) FROM invoices;"
sqlite3 backup.db "SELECT MAX(created_at) FROM invoices;"   # data terbaru ada?
```

Uji restore sungguhan di mesin lain/staging: backup yang belum pernah diuji restore belum bisa dianggap aman.

## 7. Checklist

- [ ] Backup otomatis aktif dan `docker-data/backups/` terisi tiap hari
- [ ] Salinan di lokasi lain (USB / NAS / cloud), `settings.json` terenkripsi
- [ ] Integrity check backup terakhir = `ok`
- [ ] Restore diuji (tanggal: ________)
- [ ] Catatan lokasi & retensi backup terdokumentasi

Terkait: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
