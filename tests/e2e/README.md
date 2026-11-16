# E2E — ArD.net (tester-army/e2e)

Suite **locator-based** (tanpa langkah AI/model). tes: publik, guard admin, sweep 13 halaman admin, login pelanggan, 404, versi.

## Setup

```bash
npm i -D e2e@^0.18 @e2e-dev/web
cp tests/e2e/e2e.config.example.ts e2e.config.ts
```

## Jalankan (aplikasi harus jalan)

```bash
APP_URL=http://localhost:3001 E2E_TELEMETRY_DISABLED=1 npx e2e   # sesuaikan dengan CLI e2e yang terpasang
# (script `test:e2e` belum ada di package.json)
```

Kredensial via env: `ADMIN_USER`, `ADMIN_PASS`, `CUSTOMER_PHONE`.

## Catatan

- **Login pelanggan cukup nomor HP** (tanpa password) — `081200000001` untuk data demo.
- Suite **mengonsolidasikan login** (login sekali → sweep halaman) agar tidak kena rate-limit login (30 / 15 menit).
- Bug yang ditemukan suite ini: tabel `discount_logs` tidak dibuat saat fresh-install (500 di `/admin/discounts`) — sudah diperbaiki di `config/database.js`.
