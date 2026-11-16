# Cara pasang patch (Armbian)

File di zip ini hanya berisi file yang diubah, jadi `settings.json`, database, dan log TIDAK tersentuh.

```bash
cd ~
cp -r ard-net ard-net.bak-$(date +%F)          # cadangan dulu (tanpa node_modules juga boleh)
unzip -o ard-net-patch.zip -d ~/               # menimpa file yang diubah saja
cd ~/ard-net
node tests/unit/isolir-pool.test.js            # harus: SEMUA LULUS
pm2 restart ard-net
```

Setelah restart:
1. Admin → Router → Setup Firewall Isolir → **1-Click Auto Setup (API)**.
2. Di MikroTik cek:
   ```
   /ip firewall address-list print where list=LIST_ISOLIR
   /ppp profile print detail where name=isolir
   ```
   Harus ada entri comment `BILLING_ISOLIR_POOL` berisi rentang pool isolir billing (mis. 172.16.0.2-172.16.1.254).
3. Entri manual `172.16.0.0/23` yang kamu tambahkan sebelumnya boleh dihapus.
4. Putus-dial ulang pelanggan isolir, buka `http://neverssl.com`.

Kalau pool isolir diubah di billing: simpan pengaturan, lalu jalankan 1-Click Auto Setup lagi.
