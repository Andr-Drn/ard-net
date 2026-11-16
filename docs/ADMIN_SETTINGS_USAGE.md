# Pengaturan Multi-Router (Admin → Pengaturan → MikroTik)

Halaman: `/admin/settings`, bagian **Mode Multi-Router**. Perubahan langsung berlaku tanpa restart
(restart hanya perlu bila `settings.json` diedit manual di luar UI).

## Dua kolom pengaturan

| Kunci | Nilai | Bawaan | Fungsi |
|---|---|---|---|
| `multi_router_mode` | `active` / `disabled` | `disabled` | Aktif = banyak router; Nonaktif = satu router utama dengan fallback otomatis |
| `default_router_id` | angka > 0 atau kosong | kosong | Router untuk pelanggan yang `router_id`-nya kosong |

Di UI, label "Aktif (Multi-Router)" = `active`, "Nonaktif (Single Router Mode)" = `disabled`.
Kolom **Default Router ID** hanya tampil saat mode **Nonaktif**.

> Catatan: bila `multi_router_mode` belum pernah disimpan, backend memperlakukannya sebagai
> `disabled`, tetapi dropdown di UI menampilkan "Aktif". Pilih mode secara eksplisit lalu simpan.

## Cara router ditentukan untuk satu pelanggan

1. Pelanggan punya `router_id` → dipakai.
2. Bila kosong dan `default_router_id` terisi → dipakai.
3. Bila masih kosong:
   - mode **Nonaktif** → router aktif dengan ID terkecil;
   - mode **Aktif** → dipakai hanya bila **tepat satu** router aktif; selain itu tidak ada router
     (operasi isolir/aktivasi untuk pelanggan itu tidak bisa menemukan router).

## Skenario

**A. Satu router (sederhana)** — mode `Nonaktif`, Default Router ID kosong. Semua pelanggan memakai
router aktif pertama (atau kredensial di `settings.json` bila tabel router kosong; lihat
[ROUTER_CONNECTION_FLOW.md](ROUTER_CONNECTION_FLOW.md)).

**B. Satu router utama + router lain disimpan** — mode `Nonaktif`, Default Router ID = ID router utama.
Pelanggan tanpa `router_id` otomatis ke router itu.

**C. Banyak router / lokasi** — mode `Aktif`. Setiap pelanggan baru sebaiknya dipilihkan router
secara eksplisit. Isolir dan aktivasi berjalan di router masing-masing pelanggan.

## Saat mode diubah Nonaktif → Aktif

Sistem otomatis mengisi `router_id` pelanggan yang masih kosong (dan punya PPPoE/hotspot/IP statis):

- memakai `default_router_id` bila diisi (kolom ini disembunyikan saat mode Aktif, jadi isi **sebelum**
  beralih, simpan, lalu ganti mode — atau biarkan kosong);
- bila kosong, memakai router aktif dengan ID terkecil.

Log: `[Settings] Auto-assigned router X to Y customers with NULL router_id` di `logs/combined.log`.
Perpindahan Aktif → Nonaktif **tidak** mengubah data pelanggan.

## Verifikasi

```bash
# log (Docker)
docker compose logs ard-net | grep -i "auto-assigned\|default router"

# database (jalankan dari host; hentikan penulisan besar bila memungkinkan)
sqlite3 docker-data/database/billing.db "SELECT id, name, router_id FROM customers LIMIT 10;"
sqlite3 docker-data/database/billing.db "SELECT id, name, host, is_active FROM routers;"
```

Uji isolir: isolir satu pelanggan dari admin → profil PPPoE di router yang dimaksud berubah ke profil
isolir; log menampilkan `Using default router from database: <nama>` bila memakai router bawaan.

## Troubleshooting

| Masalah | Cek |
|---|---|
| Isolir gagal / "Router not found" | `router_id` pelanggan ada di tabel `routers`? router `is_active = 1`? |
| Pelanggan tanpa router di mode Aktif | Isi `router_id` pelanggan, atau pastikan hanya satu router aktif, atau isi `default_router_id` |
| Setelah ganti setting, pelanggan yang sudah terisolir tetap di router lama | Normal — setting hanya berlaku untuk operasi baru. Aktifkan lalu isolir ulang bila perlu |
| Koneksi MikroTik gagal | Admin → Router → Tes Koneksi; cek port API (8728, atau 8729 bila TLS) dan firewall |

## Alur kerja yang disarankan

1. Mulai dengan satu router: mode `Nonaktif`, uji isolir dan aktivasi.
2. Tambah router di **Admin → Router**.
3. Beralih ke `Aktif` bila memang perlu banyak router; pelanggan lama otomatis diberi `router_id`.
