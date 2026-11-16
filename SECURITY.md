# Kebijakan Keamanan

## Versi yang Didukung

| Versi | Didukung |
|---|---|
| 0.6.x (terbaru) | ✅ |
| 0.5.x | ❌ — perbarui ke 0.6.x |

## Melaporkan Kerentanan

**Jangan** membuka Issue publik untuk masalah keamanan.

Gunakan tab **Security → Report a vulnerability** (Gitea Security Advisories) pada repositori ini, atau hubungi pengelola secara privat melalui Gitea.

Sertakan: deskripsi, langkah reproduksi, dampak, dan (bila ada) saran perbaikan. Kami akan berusaha merespons secepatnya.

## Praktik Aman

- Ganti password admin default (`demo-isp123`) dan pastikan `session_secret` acak (≥ 32 karakter).
- Isi `webhook_secret` dan `gowa_webhook_secret` dengan nilai acak (`openssl rand -hex 32`).
- Jalankan di belakang HTTPS/reverse proxy dan set `"cookie_secure": true`.
- Batasi akses jaringan ke port 3001, RADIUS (1812/1813 UDP), dan API MikroTik.
- Jangan pernah meng-commit atau membagikan `settings.json`, `.env`, `.env.gowa`, `database/`, `docker-data/`, `uploads/`. Berkas ini berisi token, API key, password, dan data pelanggan.
- Bila rahasia pernah terbagikan, ganti segera (token Telegram, API key AI, secret RADIUS/webhook, password admin).

Selengkapnya: [Wiki — Keamanan](https://gitea.oxpoe.xyz/oxpoe/open-isp/wiki/Keamanan).
