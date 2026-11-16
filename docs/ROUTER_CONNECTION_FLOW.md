# Alur Koneksi Router (MikroTik)

Fungsi: `getConnection(routerId)` di `services/mikrotikService.js`.
Router dapat didaftarkan di **Admin → Router** (tabel `routers`) atau — untuk satu router saja — lewat
kunci `mikrotik_*` di `settings.json`. Mendaftarkan router di Admin → Router **tidak wajib** bila
`settings.json` sudah berisi kredensial.

## Urutan pemilihan

```
getConnection(routerId)
 ├─ routerId = "settings_json" / "settings" → pakai settings.json (diminta eksplisit)
 ├─ routerId berupa angka                   → ambil dari tabel routers (id = routerId);
 │                                            tidak ada → error "Router with ID X not found"
 └─ routerId kosong
      ├─ ada router is_active = 1 → pakai yang ID terkecil
      └─ tidak ada                → fallback ke settings.json
```

Kunci `settings.json` yang dipakai: `mikrotik_host`, `mikrotik_user`, `mikrotik_password`,
`mikrotik_port` (bawaan 8728). Bila `host`/`user` kosong → error `MikroTik settings not configured`.
Setelah host dipilih, aplikasi mencoba port yang dikonfigurasi dan port cadangannya
(8728 ↔ 8729 untuk TLS); TLS diatur lewat `mikrotik_tls`.

## Skenario

| Situasi | Hasil |
|---|---|
| Hanya `settings.json`, tabel routers kosong | Selalu `settings.json` |
| Tabel routers punya router aktif | `getConnection(id)` → router itu; `getConnection()` → router aktif pertama; `settings.json` tidak dipakai |
| Semua router dinonaktifkan | Kembali ke `settings.json` |
| Router dipilih per pelanggan | Lihat [ADMIN_SETTINGS_USAGE.md](ADMIN_SETTINGS_USAGE.md) |

Peralihan single → multi-router bisa dilakukan tanpa downtime: biarkan `settings.json`, tambah router
di Admin → Router, lalu atur mode di Pengaturan.

## FAQ

**Beda Admin → Router dan settings.json?** `settings.json` hanya satu router dan diedit sebagai file;
Admin → Router untuk banyak router dan dikelola dari UI.

**Hapus kredensial di settings.json?** Aman bila tabel `routers` berisi router aktif. Bila keduanya
kosong, terjadi error `MikroTik settings not configured`.

**Isolir lewat bot (Telegram/WhatsApp) mendukung multi-router?** Ya — memakai `getEffectiveRouterId()`
yang sama (pelanggan → `default_router_id` → router aktif, tergantung mode).

## Menguji

```bash
# Log saat operasi berjalan
docker compose logs ard-net | grep "\[MikroTik\] Using"
#   "Using default router from database: <nama>"  → memakai tabel routers
#   "Using router from settings.json ..."         → fallback settings.json
```

Uji koneksi juga tersedia lewat tombol **Tes Koneksi** di Admin → Router.

> Jangan menaruh kredensial nyata di dokumentasi atau repositori publik; gunakan akun MikroTik khusus
> API dengan hak minimum.
