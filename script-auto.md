# Panduan Otomatisasi Isolir MikroTik

Dokumen ini menjelaskan pemasangan halaman isolir ArD.net pada MikroTik untuk pemasangan baru. Tombol **1-Click Auto Setup (API)** di aplikasi adalah cara yang disarankan; kredensial router tetap disimpan di pengaturan router aplikasi dan tidak dimasukkan ke file `.rsc`.

## Yang dikonfigurasi otomatis

Lewat menu **Admin → Router → Setup Firewall Isolir → 1-Click Auto Setup (API)**, aplikasi:

- Menambahkan IP server billing ke address-list `BILLING` bila IP itu belum ada.
- Membuat atau memperbarui NAT HTTP pelanggan `LIST_ISOLIR`: TCP/80 menuju IP server billing pada port redirector, default `8099`.
- Memastikan rule drop `BLOCK_ISOLIR` aktif; pada router baru rule ini ditempatkan sebelum rule forward umum, lalu izin DNS dan akses ke `BILLING` ditempatkan di atasnya.
- Memasang hook `on-up` dan `on-down` pada profil PPPoE isolir agar IP pelanggan masuk/keluar dari address-list `LIST_ISOLIR`.
- Memasukkan **rentang pool isolir dari Pengaturan RADIUS billing** (`radius_isolir_ip_pool_start` – `radius_isolir_ip_pool_end`) ke address-list `LIST_ISOLIR` (comment `BILLING_ISOLIR_POOL`). Jika pool isolir diubah di billing, jalankan 1-Click Auto Setup lagi: entri lama diganti otomatis, tidak perlu mengubah script. Ini yang membuat pelanggan isolir lewat RADIUS (tanpa profil `on-up`) tetap teralihkan ke halaman isolir.
- Membiarkan konfigurasi HTTPS, WAN, Wi-Fi, DHCP, pool, dan profil PPP lainnya tidak berubah.

Setup ini dapat dijalankan kembali: rule NAT yang dikelola aplikasi diperbarui, rule firewall yang sudah ada tidak ditambahkan ulang, dan address-list tidak digandakan untuk IP yang sama.

## Persiapan sebelum instalasi

1. Pastikan server ArD.net aktif dan redirector isolir berjalan pada port yang dipilih (default `8099`). Router harus dapat menjangkau IP server billing dan port tersebut.
2. Dari **Admin → Pengaturan**, isi **URL Halaman Isolir** dengan URL lengkap yang benar-benar dapat dibuka pelanggan. Contoh server LAN:

   ```text
   http://192.168.10.185:3001/isolated
   ```

   Jangan isi `localhost` atau `127.0.0.1`. Alur otomatis menggunakan host dari URL ini untuk menemukan IP server. Jika memakai nama domain, IP IPv4 domain harus dapat di-resolve dari mesin billing saat setup dijalankan.
3. Pastikan **Port Redirector Isolir** sama dengan port listener redirector (default `8099`).
4. Tambahkan router pada **Admin → Router** dengan host, port API, username, dan password yang benar. Aktifkan layanan API MikroTik dan batasi akses API ke server billing; gunakan akun dengan hak minimum yang diperlukan. Jangan menaruh password di script atau membagikan file backup router.
5. Siapkan terlebih dahulu profil PPPoE isolir di MikroTik beserta pool dan alamat lokal yang sesuai. Profil harus sudah ada. Nama profil yang digunakan pelanggan harus cocok dengan `isolir_profile` pada data pelanggan; bila belum ada data pelanggan, aplikasi mencoba profil bernama `isolir`.

> Tombol setup tidak membuat pool IP, profil PPPoE, server RADIUS, atau service redirector. Itu harus dipersiapkan terpisah sesuai topologi jaringan.

## Langkah pemasangan baru

1. Buat backup konfigurasi MikroTik terlebih dahulu melalui **Files → Backup** atau metode backup RouterOS yang biasa digunakan.
2. Buka **Admin → Router**, pilih router tujuan, lalu buka **Setup Firewall Isolir**.
3. Pilih tab **1-Click Auto Setup (API)** dan pastikan nama/IP router yang dipilih benar.
4. Tekan **Jalankan Setup Firewall & Hook Isolir Sekarang** dan konfirmasi. Tunggu hasilnya. Jika pesan menyebut profil tidak ditemukan, buat/samakan nama profil, lalu jalankan setup kembali.
5. Setelah hook profil terpasang, uji menggunakan satu akun pelanggan uji yang memang berada dalam status isolir. Hook `on-up` berlaku saat sesi PPP tersambung; sesi yang sudah aktif sebelum pemasangan tidak otomatis menjalankan hook baru. Jangan putuskan sesi massal hanya untuk pengujian.

## Pemeriksaan setelah pemasangan

- Di **IP → Firewall → Address Lists**, pastikan `BILLING` memuat IP server billing dan pelanggan uji yang tersambung muncul pada `LIST_ISOLIR`.
- Di **IP → Firewall → NAT**, pastikan rule `BILLING_API_ISOLIR_HTTP` aktif dan menunjuk ke IP server billing serta port redirector yang benar.
- Di **IP → Firewall → Filter Rules**, pastikan izin DNS dan izin tujuan `BILLING` berada sebelum rule drop untuk `LIST_ISOLIR`.
- Di **PPP → Profiles**, pastikan profil isolir memiliki hook `on-up` dan `on-down` untuk `LIST_ISOLIR`.
- Dari pelanggan uji isolir, buka alamat HTTP biasa (misalnya `http://neverssl.com`). Browser seharusnya menerima redirect ke URL halaman isolir. Periksa redirector dan log billing jika tidak.
- Akses langsung ke URL portal juga harus berhasil dari jaringan pelanggan; NAT hanya meneruskan HTTP ke redirector dan redirector yang mengirimkan `302` ke halaman `/isolated`.

## Batasan dan catatan penting

- Redirector di port `8099` adalah HTTP, bukan proxy TLS. Setup otomatis **tidak mengubah HTTPS**. HTTPS tidak dapat dialihkan transparan ke halaman billing HTTP; browser mungkin menampilkan error sertifikat atau koneksi gagal. Gunakan alamat HTTP untuk uji isolir dan siapkan strategi HTTPS tersendiri bila memang diperlukan.
- Setup memakai satu IPv4 yang ditemukan dari URL halaman isolir saat dijalankan. Jika IP server/domain berubah, simpan URL/IP yang benar lalu jalankan setup lagi dan verifikasi address-list `BILLING`.
- Router yang sudah memiliki banyak rule isolir lama/duplikat perlu diaudit terlebih dahulu. Setup tidak menghapus rule lama dengan nama berbeda dan tidak mengubah HTTPS. Jangan mengimpor script manual untuk “membersihkan” router yang sudah berjalan.
- Tab **Copy Script RouterOS (.rsc)** adalah alternatif manual untuk administrator. Tinjau script dan urutan filter sebelum mengimpor; untuk pemasangan baru utamakan tab API karena aplikasi dapat menempatkan izin sebelum rule drop dan melaporkan profil yang tidak ditemukan.
- Setelah pemasangan, lakukan pengujian dan pemantauan pada satu pelanggan terlebih dahulu sebelum menerapkannya ke pelanggan lain.
