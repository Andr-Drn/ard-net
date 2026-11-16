# Pengujian (Testing) — ArD.net

## 1. Uji manual cepat

1. **Landing** `/` — hero, paket, switcher **ID/EN**, link Gitea/Wiki/Lisensi.
2. **Login admin** `/admin/login` → `admin` / `demo-isp123` (data demo / instalasi baru) → dashboard.
3. **Pelanggan** `/customer/login` → nomor HP demo **`081200000001`** (login pelanggan hanya butuh nomor HP; jalankan `node scripts/seed-demo.js` dulu) → dashboard & tagihan.
4. **Health** `/health` (`{"status":"ok","version":...}`) · versi `/version.txt`.

## 2. Unit test & CI

```bash
npm test        # menjalankan tests/unit/area-access.test.js
```

CI (`.gitea/workflows/ci.yml`, `.forgejo/workflows/ci.yml`) menjalankan: `npm ci`, pengecekan sintaks
semua file `.js` (`node --check`), dan unit test di atas. **E2E belum dijalankan di CI.**

## 3. E2E (opsional, manual)

Framework **tester-army/e2e** (`@e2e-dev/web`), tes berbasis locator. Suite + cara jalan: lihat
**[`tests/e2e/README.md`](tests/e2e/README.md)**.

```bash
npm i -D e2e@^0.18 @e2e-dev/web
cp tests/e2e/e2e.config.example.ts e2e.config.ts
```

> Script `test:e2e` **belum didefinisikan** di `package.json`; jalankan dengan perintah CLI `e2e`
> sesuai dokumentasi paket tersebut, dengan `APP_URL=http://localhost:3001` dan
> `E2E_TELEMETRY_DISABLED=1`. Contoh konfigurasi mendeklarasikan agen AI (Vercel AI Gateway); suite itu
> sendiri berbasis locator.

Cakupan: landing & halaman publik, guard admin, login admin, sweep halaman admin, login pelanggan, 404, `/version.txt`.
Kredensial lewat env: `ADMIN_USER`, `ADMIN_PASS`, `CUSTOMER_PHONE`.
