# Skema Database — ArD.net v0.6.17

**Mesin:** SQLite 3 (better-sqlite3) · **File:** `database/billing.db` (Docker: `docker-data/database/billing.db`) · **Mode jurnal:** WAL

Dokumen ini dihasilkan dari database hasil instalasi bersih v0.6.17 (45 tabel), November 2026. Skema dibuat dan dimigrasi otomatis oleh `config/database.js` saat aplikasi start; kolom baru ditambahkan lewat migrasi `ALTER TABLE`, jadi **sumber kebenaran adalah database itu sendiri**. Untuk menghasilkan ulang:

```bash
sqlite3 docker-data/database/billing.db ".schema"                    # skema lengkap
sqlite3 docker-data/database/billing.db ".tables"
```

> Catatan: tabel `pppoe_users`, `payments`, `hotspot_*`, `agents`, `vomit_log` dan sejenisnya yang pernah tertulis di versi lama dokumen ini **tidak ada**. Data PPPoE/hotspot pelanggan ada di tabel `customers`; pembayaran dicatat pada `invoices` (`status`, `paid_at`).

## Ringkasan

**1. Pengaturan, sesi & audit** — `app_settings`, `sessions`, `login_sessions`, `audit_trail`, `automation_runs`

**2. Data master** — `packages`, `customers`, `areas`, `routers`, `olts`, `odps`, `genieacs_servers`, `technicians`, `cashiers`, `collectors`

**3. Tagihan & pembayaran** — `invoices`, `discount_logs`, `discount_vouchers`, `webhook_payment_notifs`, `custom_qr_payments`, `collector_payment_requests`, `public_donation_orders`, `public_voucher_orders`, `customer_usage`

**4. Voucher hotspot** — `voucher_batches`, `vouchers`, `voucher_packages`

**5. RADIUS** — `radius_accounting`, `radius_nas`

**6. ACS / TR-069** — `acs_devices`, `acs_tasks`

**7. Inventaris gudang** — `inventory_categories`, `inventory_items`, `inventory_stock`, `inventory_logs`

**8. Operasional, SDM & lainnya** — `expenses`, `expense_categories`, `cash_in`, `attendance`, `payroll_settings`, `payroll_slips`, `tickets`, `promo_slides`, `wa_chat_messages`, `soundbox_events`

## Detail tabel

### 1. Pengaturan, sesi & audit

#### `app_settings`
Penyimpanan key-value pengaturan tambahan di database (pengaturan utama ada di settings.json) — 3 kolom, 1 indeks.

```
key TEXT PK, value TEXT, updated_at DATETIME
```

#### `sessions`
Sesi login (express-session, store SQLite) — 3 kolom, 1 indeks.

```
sid TEXT PK, data TEXT, expires_at INTEGER
```

#### `login_sessions`
Pelacakan sesi per akun untuk batas sesi login — 7 kolom, 2 indeks.

```
sid TEXT PK, role TEXT, account_id TEXT, ip TEXT, user_agent TEXT, created_at INTEGER, last_seen
INTEGER
```

#### `audit_trail`
Log aktivitas sensitif — 11 kolom, 4 indeks.

```
id INTEGER PK, action TEXT, entity_type TEXT, entity_id TEXT, actor_type TEXT, actor_id TEXT,
actor_name TEXT, details TEXT, ip_address TEXT, user_agent TEXT, created_at DATETIME
```

#### `automation_runs`
Riwayat eksekusi otomasi/self-healing — 13 kolom, 1 indeks.

```
id INTEGER PK, type TEXT, template_key TEXT, isolate_day INTEGER, mode TEXT, interval_label TEXT,
target INTEGER, sent INTEGER, failed INTEGER, status TEXT, note TEXT, started_at TEXT, finished_at
TEXT
```

### 2. Data master

#### `packages`
Paket layanan (harga, kecepatan, promo, jam kalong, FUP, profil MikroTik) — 35 kolom.

```
id INTEGER PK, name TEXT, price INTEGER, speed_down INTEGER, speed_up INTEGER, description TEXT,
billing_type TEXT, duration_days INTEGER, is_active INTEGER, created_at DATETIME, use_ppn INTEGER,
ppn_percentage REAL, use_uso INTEGER, uso_percentage REAL, night_speed_down INTEGER, night_speed_up
INTEGER, fup_limit_gb INTEGER, fup_speed_down INTEGER, use_night_speed INTEGER, night_profile_name
TEXT, use_fup INTEGER, fup_profile_name TEXT, promo_price INTEGER, promo_cycles INTEGER,
prorate_first_invoice INTEGER, router_id INTEGER, speed_down_upto INTEGER, speed_up_upto INTEGER,
pool_name TEXT, pool_ranges TEXT, local_address TEXT, only_one INTEGER, parent_queue TEXT,
queue_type TEXT, isolir_profile TEXT
```
FK: `router_id` → `routers.id`.

#### `customers`
Data pelanggan (PPPoE/hotspot/IP statis, router, OLT/ODP, koordinat, saldo) — 47 kolom, 1 indeks.

```
id INTEGER PK, nik TEXT, name TEXT, phone TEXT, address TEXT, area TEXT, package_id INTEGER,
genieacs_tag TEXT, pppoe_username TEXT, isolir_profile TEXT, status TEXT, install_date DATE,
expired_at DATETIME, notes TEXT, created_at DATETIME, reg_voucher_code TEXT, reg_install_fee
INTEGER, reg_prorata INTEGER, reg_discount INTEGER, reg_total INTEGER, reg_due_date TEXT, reg_status
TEXT, auto_isolate INTEGER, isolate_day INTEGER, email TEXT, router_id INTEGER, olt_id INTEGER,
pon_port TEXT, odp_id INTEGER, lat TEXT, lng TEXT, cable_path TEXT, connection_type TEXT, static_ip
TEXT, mac_address TEXT, hotspot_username TEXT, hotspot_password TEXT, hotspot_profile TEXT,
pppoe_password TEXT, pppoe_remote_address TEXT, wifi_ssid TEXT, password_wifi TEXT, collector_id
INTEGER, promo_cycles_used INTEGER, balance INTEGER, is_radius INTEGER, customer_code TEXT
```
FK: `collector_id` → `collectors.id`; `odp_id` → `odps.id`; `olt_id` → `olts.id`; `router_id` → `routers.id`; `package_id` → `packages.id`.

#### `areas`
Area/wilayah kerja — 4 kolom, 1 indeks.

```
id INTEGER PK, name TEXT, description TEXT, created_at DATETIME
```

#### `routers`
Router MikroTik — 9 kolom.

```
id INTEGER PK, name TEXT, host TEXT, port INTEGER, user TEXT, password TEXT, description TEXT,
is_active INTEGER, created_at DATETIME
```

#### `olts`
Perangkat OLT — 14 kolom.

```
id INTEGER PK, name TEXT, host TEXT, snmp_community TEXT, snmp_port INTEGER, brand TEXT, description
TEXT, is_active INTEGER, created_at DATETIME, web_user TEXT, web_password TEXT, api_base_url TEXT,
telnet_port INTEGER, enable_password TEXT
```

#### `odps`
Titik distribusi ODP — 9 kolom.

```
id INTEGER PK, name TEXT, olt_id INTEGER, pon_port TEXT, port_capacity INTEGER, lat TEXT, lng TEXT,
description TEXT, created_at DATETIME
```
FK: `olt_id` → `olts.id`.

#### `genieacs_servers`
Server GenieACS terdaftar — 11 kolom.

```
id INTEGER PK, name TEXT, url TEXT, cwmp_url TEXT, username TEXT, password TEXT, location TEXT,
status TEXT, device_count INTEGER, last_sync DATETIME, created_at DATETIME
```

#### `technicians`
Akun & data teknisi — 8 kolom, 1 indeks.

```
id INTEGER PK, username TEXT, password TEXT, name TEXT, phone TEXT, area TEXT, is_active INTEGER,
created_at DATETIME
```

#### `cashiers`
Akun & data kasir — 7 kolom, 1 indeks.

```
id INTEGER PK, username TEXT, password TEXT, name TEXT, phone TEXT, is_active INTEGER, created_at
DATETIME
```

#### `collectors`
Akun & data kolektor — 9 kolom, 2 indeks.

```
id INTEGER PK, username TEXT, password TEXT, name TEXT, phone TEXT, area TEXT, is_active INTEGER,
auto_approve INTEGER, created_at DATETIME
```

### 3. Tagihan & pembayaran

#### `invoices`
Tagihan bulanan (status, QRIS kode unik, diskon, void) — 26 kolom.

```
id INTEGER PK, customer_id INTEGER, period_month INTEGER, period_year INTEGER, amount INTEGER,
status TEXT, paid_at DATETIME, paid_by_name TEXT, notes TEXT, created_at DATETIME, payment_gateway
TEXT, payment_order_id TEXT, payment_link TEXT, payment_reference TEXT, payment_payload TEXT,
payment_expires_at DATETIME, qris_unique_code INTEGER, qris_amount_unique INTEGER, qris_assigned_at
DATETIME, qris_paid_notif_id INTEGER, discount_type TEXT, discount_value REAL, discount_amount
INTEGER, amount_before_discount INTEGER, voided_at DATETIME, void_reason TEXT
```
FK: `customer_id` → `customers.id`.

#### `discount_logs`
Log pemakaian diskon — 13 kolom.

```
id INTEGER PK, invoice_id INTEGER, customer_id INTEGER, period_month INTEGER, period_year INTEGER,
discount_type TEXT, discount_value REAL, discount_amount REAL, amount_before REAL, amount_after
REAL, applied_by TEXT, note TEXT, created_at DATETIME
```

#### `discount_vouchers`
Voucher diskon — 11 kolom, 1 indeks.

```
id INTEGER PK, code TEXT, type TEXT, value INTEGER, max_discount INTEGER, min_purchase INTEGER,
active INTEGER, max_uses INTEGER, used_count INTEGER, note TEXT, created_at DATETIME
```

#### `webhook_payment_notifs`
Notifikasi pembayaran masuk via webhook — 12 kolom, 2 indeks.

```
id INTEGER PK, service TEXT, content TEXT, parsed_amount INTEGER, parsed_ok INTEGER,
matched_invoice_id INTEGER, matched_voucher_order_id INTEGER, ip TEXT, user_agent TEXT, created_at
DATETIME, matched_donation_order_id INTEGER, matched_custom_qr_id INTEGER
```

#### `custom_qr_payments`
Pembayaran QR kustom — 19 kolom, 3 indeks.

```
id INTEGER PK, title TEXT, category TEXT, amount INTEGER, unique_code INTEGER, amount_unique
INTEGER, status TEXT, share_token TEXT, note TEXT, created_by TEXT, created_at DATETIME, expires_at
TEXT, paid_at DATETIME, paid_by TEXT, notif_id INTEGER, warning_at DATETIME, resolved_by TEXT,
resolved_at DATETIME, resolution_note TEXT
```

#### `collector_payment_requests`
Pengajuan pembayaran oleh kolektor — 12 kolom, 4 indeks.

```
id INTEGER PK, collector_id INTEGER, invoice_id INTEGER, customer_id INTEGER, amount INTEGER, note
TEXT, status TEXT, decided_by_role TEXT, decided_by_name TEXT, decided_note TEXT, created_at
DATETIME, decided_at DATETIME
```
FK: `customer_id` → `customers.id`; `invoice_id` → `invoices.id`; `collector_id` → `collectors.id`.

#### `public_donation_orders`
Pesanan donasi publik — 16 kolom, 2 indeks.

```
id INTEGER PK, donor_name TEXT, donor_phone TEXT, amount INTEGER, qris_amount_unique INTEGER,
qris_unique_code INTEGER, notes TEXT, status TEXT, paid_at DATETIME, qris_paid_notif_id INTEGER,
activation_code TEXT, wa_sent INTEGER, wa_sent_at DATETIME, wa_error TEXT, created_at DATETIME,
updated_at DATETIME
```

#### `public_voucher_orders`
Pesanan voucher publik — 28 kolom, 2 indeks.

```
id INTEGER PK, router_id INTEGER, profile_name TEXT, validity TEXT, price INTEGER, buyer_phone TEXT,
status TEXT, paid_at DATETIME, fulfilled_at DATETIME, voucher_code TEXT, voucher_password TEXT,
voucher_comment TEXT, wa_sent INTEGER, wa_sent_at DATETIME, wa_error TEXT, payment_gateway TEXT,
payment_order_id TEXT, payment_link TEXT, payment_reference TEXT, payment_payload TEXT,
payment_expires_at DATETIME, created_at DATETIME, updated_at DATETIME, qris_unique_code INTEGER,
qris_amount_unique INTEGER, qris_assigned_at DATETIME, qris_paid_notif_id INTEGER, proof_url TEXT
```
FK: `router_id` → `routers.id`.

#### `customer_usage`
Pemakaian data pelanggan (usage tracking) — 9 kolom, 3 indeks.

```
id INTEGER PK, customer_id INTEGER, period_month INTEGER, period_year INTEGER, bytes_in INTEGER,
bytes_out INTEGER, last_total_bytes_in INTEGER, last_total_bytes_out INTEGER, updated_at DATETIME
```
FK: `customer_id` → `customers.id`.

### 4. Voucher hotspot

#### `voucher_batches`
Batch voucher — 16 kolom, 1 indeks.

```
id INTEGER PK, router_id INTEGER, profile_name TEXT, qty_total INTEGER, qty_created INTEGER,
qty_failed INTEGER, price INTEGER, validity TEXT, prefix TEXT, code_length INTEGER, status TEXT,
created_by TEXT, created_at DATETIME, updated_at DATETIME, mode TEXT, charset TEXT
```
FK: `router_id` → `routers.id`.

#### `vouchers`
Kode voucher — 13 kolom, 3 indeks.

```
id INTEGER PK, batch_id INTEGER, router_id INTEGER, code TEXT, password TEXT, profile_name TEXT,
comment TEXT, status TEXT, used_at DATETIME, last_seen_comment TEXT, last_seen_uptime TEXT,
last_seen_at DATETIME, created_at DATETIME
```
FK: `router_id` → `routers.id`; `batch_id` → `voucher_batches.id`.

#### `voucher_packages`
Paket voucher hotspot — 11 kolom, 1 indeks.

```
id INTEGER PK, router_id INTEGER, profile_name TEXT, price INTEGER, validity TEXT, prefix TEXT,
code_length INTEGER, charset TEXT, is_active INTEGER, created_at DATETIME, updated_at DATETIME
```
FK: `router_id` → `routers.id`.

### 5. RADIUS

#### `radius_accounting`
Accounting sesi RADIUS — 16 kolom, 3 indeks.

```
id INTEGER PK, username TEXT, nas_ip TEXT, framed_ip TEXT, session_id TEXT, status_type INTEGER,
input_octets INTEGER, output_octets INTEGER, input_gigawords INTEGER, output_gigawords INTEGER,
session_time INTEGER, terminate_cause INTEGER, calling_station_id TEXT, called_station_id TEXT,
created_at DATETIME, updated_at DATETIME
```

#### `radius_nas`
Daftar NAS/secret RADIUS — 7 kolom, 1 indeks.

```
id INTEGER PK, nasname TEXT, shortname TEXT, secret TEXT, description TEXT, is_active INTEGER,
created_at DATETIME
```

### 6. ACS / TR-069

#### `acs_devices`
Perangkat ACS bawaan (CPE/ONU) — 16 kolom, 3 indeks.

```
id TEXT PK, serial_number TEXT, manufacturer TEXT, product_class TEXT, oui TEXT, software_version
TEXT, hardware_version TEXT, ip_address TEXT, connection_request_url TEXT, connection_request_user
TEXT, connection_request_pass TEXT, tags TEXT, params TEXT, last_inform DATETIME, created_at
DATETIME, updated_at DATETIME
```

#### `acs_tasks`
Antrian tugas TR-069 — 9 kolom, 2 indeks.

```
id INTEGER PK, device_id TEXT, name TEXT, payload TEXT, status TEXT, result TEXT, retry_count
INTEGER, created_at DATETIME, updated_at DATETIME
```

### 7. Inventaris gudang

#### `inventory_categories`
Kategori barang — 4 kolom, 1 indeks.

```
id INTEGER PK, name TEXT, description TEXT, created_at DATETIME
```

#### `inventory_items`
Barang gudang — 9 kolom, 1 indeks.

```
id INTEGER PK, category_id INTEGER, name TEXT, brand TEXT, model TEXT, unit TEXT, min_stock INTEGER,
description TEXT, created_at DATETIME
```
FK: `category_id` → `inventory_categories.id`.

#### `inventory_stock`
Unit/stok barang (FIFO, serial) — 13 kolom, 3 indeks.

```
id INTEGER PK, item_id INTEGER, serial_number TEXT, quantity INTEGER, condition TEXT, location TEXT,
status TEXT, assigned_to_customer_id INTEGER, note TEXT, updated_at DATETIME, created_at DATETIME,
price INTEGER, supplier TEXT
```
FK: `assigned_to_customer_id` → `customers.id`; `item_id` → `inventory_items.id`.

#### `inventory_logs`
Log transaksi stok — 11 kolom, 2 indeks.

```
id INTEGER PK, item_id INTEGER, stock_id INTEGER, type TEXT, quantity INTEGER, actor TEXT, note
TEXT, created_at DATETIME, remaining_stock INTEGER, recipient TEXT, reference_no TEXT
```
FK: `stock_id` → `inventory_stock.id`; `item_id` → `inventory_items.id`.

### 8. Operasional, SDM & lainnya

#### `expenses`
Pengeluaran — 12 kolom.

```
id INTEGER PK, date DATE, category TEXT, subcategory TEXT, amount INTEGER, description TEXT, vendor
TEXT, receipt_number TEXT, payment_method TEXT, recorded_by_role TEXT, recorded_by_name TEXT,
created_at DATETIME
```

#### `expense_categories`
Kategori pengeluaran — 8 kolom, 1 indeks.

```
id INTEGER PK, name TEXT, parent_id INTEGER, description TEXT, icon TEXT, color TEXT, is_active
INTEGER, created_at DATETIME
```
FK: `parent_id` → `expense_categories.id`.

#### `cash_in`
Pemasukan kas — 12 kolom.

```
id INTEGER PK, date DATE, category TEXT, amount INTEGER, description TEXT, reference_type TEXT,
reference_id INTEGER, receipt_number TEXT, payment_method TEXT, recorded_by_role TEXT,
recorded_by_name TEXT, created_at DATETIME
```

#### `attendance`
Absensi — 17 kolom, 3 indeks.

```
id INTEGER PK, employee_type TEXT, employee_id INTEGER, employee_name TEXT, check_in_time DATETIME,
check_in_lat TEXT, check_in_lng TEXT, check_in_note TEXT, check_in_photo TEXT, check_out_time
DATETIME, check_out_lat TEXT, check_out_lng TEXT, check_out_note TEXT, check_out_photo TEXT,
work_duration_minutes INTEGER, status TEXT, created_at DATETIME
```

#### `payroll_settings`
Pengaturan payroll — 15 kolom, 2 indeks.

```
id INTEGER PK, employee_type TEXT, employee_id INTEGER, base_salary INTEGER, transport_allowance
INTEGER, meal_allowance INTEGER, phone_allowance INTEGER, other_allowance INTEGER,
other_allowance_note TEXT, absence_deduction_per_day INTEGER, bonus_per_ticket INTEGER,
commission_percentage REAL, working_days_per_month INTEGER, created_at DATETIME, updated_at DATETIME
```

#### `payroll_slips`
Slip gaji — 33 kolom, 4 indeks.

```
id INTEGER PK, employee_type TEXT, employee_id INTEGER, employee_name TEXT, period_month INTEGER,
period_year INTEGER, base_salary INTEGER, transport_allowance INTEGER, meal_allowance INTEGER,
phone_allowance INTEGER, other_allowance INTEGER, other_allowance_note TEXT, working_days INTEGER,
absent_days INTEGER, late_days INTEGER, overtime_hours REAL, total_tickets_resolved INTEGER,
total_collection_amount INTEGER, ticket_bonus INTEGER, collection_commission INTEGER, overtime_bonus
INTEGER, absence_deduction INTEGER, late_deduction INTEGER, other_deduction INTEGER,
other_deduction_note TEXT, gross_salary INTEGER, total_deductions INTEGER, net_salary INTEGER,
status TEXT, approved_at DATETIME, paid_at DATETIME, notes TEXT, created_at DATETIME
```

#### `tickets`
Tiket dukungan — 13 kolom.

```
id INTEGER PK, customer_id INTEGER, subject TEXT, message TEXT, status TEXT, technician_id INTEGER,
technician_notes TEXT, photos TEXT, photo_metadata TEXT, customer_photos TEXT,
customer_photo_metadata TEXT, created_at DATETIME, updated_at DATETIME
```
FK: `technician_id` → `technicians.id`; `customer_id` → `customers.id`.

#### `promo_slides`
Slide promo landing/portal — 12 kolom.

```
id INTEGER PK, title TEXT, description TEXT, image_path TEXT, url TEXT, open_in_new_tab INTEGER,
sort_order INTEGER, is_active INTEGER, start_date DATE, end_date DATE, created_at DATETIME,
updated_at DATETIME
```

#### `wa_chat_messages`
Pesan live chat WhatsApp — 11 kolom, 2 indeks.

```
id INTEGER PK, direction TEXT, gateway TEXT, sender_phone TEXT, recipient_phone TEXT, customer_id
INTEGER, customer_name TEXT, message_text TEXT, status TEXT, meta_message_id TEXT, created_at
DATETIME
```
FK: `customer_id` → `customers.id`.

#### `soundbox_events`
Event soundbox (alert suara) — 8 kolom, 1 indeks.

```
id INTEGER PK, type TEXT, title TEXT, speech_text TEXT, amount INTEGER, customer_name TEXT, is_read
INTEGER, created_at DATETIME
```

---
Terkait: [BACKUP_CHECKLIST.md](BACKUP_CHECKLIST.md) · [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
