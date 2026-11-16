/**
 * Uji: LIST_ISOLIR mengikuti pengaturan RADIUS billing, hook on-up memakai $"remote-address".
 * Jalankan: node tests/unit/isolir-pool.test.js  (tanpa node_modules / MikroTik; dependensi di-stub)
 */
const assert = require('assert');
const Module = require('module');
const path = require('path');

let SETTINGS = {};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'routeros-client') return { RouterOSClient: class {} };
  if (request.startsWith('node-routeros')) throw new Error('stub');
  if (request.endsWith('config/settingsManager')) return { getSettingsWithCache: () => SETTINGS, getSetting: (k, d) => (SETTINGS[k] ?? d) };
  if (request.endsWith('config/logger')) return { logger: { info() {}, warn() {}, error() {}, debug() {} } };
  if (request.endsWith('config/database')) return { prepare: () => ({ all: () => [], get: () => ({}), run: () => ({}) }) };
  return origLoad.apply(this, arguments);
};
const svc = require(path.join(__dirname, '../../services/mikrotikService'));

function fakeMenu(rows) {
  let n = 100;
  return {
    rows,
    async get() { return rows.map((r) => ({ ...r })); },
    async add(o) { rows.push({ '.id': `*${n++}`, ...o }); },
    async set(o, id) { Object.assign(rows.find((r) => r['.id'] === id), o); },
    async remove(id) { rows.splice(rows.findIndex((r) => r['.id'] === id), 1); },
  };
}

(async () => {
  // 1. rentang mengikuti pengaturan
  assert.strictEqual(svc.getIsolirPoolAddressRange({ radius_isolir_ip_pool_start: '172.16.0.2', radius_isolir_ip_pool_end: '172.16.1.254' }), '172.16.0.2-172.16.1.254');
  assert.strictEqual(svc.getIsolirPoolAddressRange({}), '10.10.99.2-10.10.99.254');
  assert.strictEqual(svc.getIsolirPoolAddressRange({ radius_isolir_action: 'reject' }), null);
  assert.strictEqual(svc.getIsolirPoolAddressRange({ radius_isolir_ip_pool_start: 'x', radius_isolir_ip_pool_end: '1.1.1.1' }), null);
  assert.strictEqual(svc.getIsolirPoolAddressRange({ radius_isolir_ip_pool_start: '10.0.0.5', radius_isolir_ip_pool_end: '10.0.0.5' }), '10.0.0.5');

  // 2. sinkron address-list: tambah, idempotent, ganti saat pool berubah, tidak menyentuh entri lain
  const rows = [{ '.id': '*1', list: 'LIST_ISOLIR', address: '9.9.9.9', comment: 'manual-user' }];
  const menu = fakeMenu(rows);
  const conn = { client: { menu: () => menu } };
  const S1 = { radius_isolir_ip_pool_start: '172.16.0.2', radius_isolir_ip_pool_end: '172.16.1.254' };
  let r = await svc.ensureIsolirPoolAddressList(conn, S1);
  assert.ok(r.changed && r.range === '172.16.0.2-172.16.1.254');
  r = await svc.ensureIsolirPoolAddressList(conn, S1);
  assert.strictEqual(r.changed, false, 'kedua kali tidak boleh mengubah apa pun');
  r = await svc.ensureIsolirPoolAddressList(conn, { radius_isolir_ip_pool_start: '10.10.99.2', radius_isolir_ip_pool_end: '10.10.99.254' });
  assert.ok(r.changed);
  const managed = rows.filter((x) => x.comment === 'BILLING_ISOLIR_POOL');
  assert.strictEqual(managed.length, 1);
  assert.strictEqual(managed[0].address, '10.10.99.2-10.10.99.254');
  assert.ok(rows.some((x) => x.comment === 'manual-user'), 'entri manual tidak boleh terhapus');
  await svc.ensureIsolirPoolAddressList(conn, { radius_isolir_action: 'reject' });
  assert.strictEqual(rows.filter((x) => x.comment === 'BILLING_ISOLIR_POOL').length, 0);

  // 3. hook on-up: kutip variabel + migrasi hook lama
  const prof = [{ '.id': '*9', name: 'isolir', 'on-up': '/ip firewall address-list add list=LIST_ISOLIR address=$remote-address comment=$user timeout=23h', 'on-down': '' }];
  const pm = { async get() { return prof.map((p) => ({ ...p })); }, async set(o, id) { Object.assign(prof.find((p) => p['.id'] === id), o); } };
  const res = await svc.ensurePppProfileIsolirAddressListHook('isolir', 1, { client: { menu: () => pm } });
  assert.ok(res.ok);
  assert.ok(!/\$remote-address/.test(prof[0]['on-up']), 'sisa $remote-address tanpa kutip');
  assert.ok(prof[0]['on-up'].includes('address=$"remote-address"'));
  assert.ok(prof[0]['on-down'].includes('$"remote-address"'));
  assert.strictEqual((prof[0]['on-up'].match(/address-list add/g) || []).length, 1, 'hook tidak boleh dobel');

  // 4. script manual
  SETTINGS = { isolir_portal_url: 'http://192.168.10.185:3001/isolated', radius_isolir_ip_pool_start: '172.16.0.2', radius_isolir_ip_pool_end: '172.16.1.254' };
  const gen = await svc.generateIsolirPortalScript();
  assert.ok(gen.script.includes('/ip firewall address-list add list=LIST_ISOLIR address=172.16.0.2-172.16.1.254 comment="BILLING_ISOLIR_POOL"'));
  assert.ok(gen.script.includes('to-addresses=192.168.10.185 to-ports=8099'));
  assert.ok(!/address=\$remote-address/.test(gen.script));
  assert.ok(gen.script.includes('\\$\\"remote-address\\"'));
  SETTINGS = { ...SETTINGS, radius_isolir_ip_pool_start: '10.50.0.2', radius_isolir_ip_pool_end: '10.50.0.254' };
  assert.ok((await svc.generateIsolirPortalScript()).script.includes('address=10.50.0.2-10.50.0.254'), 'script harus ikut pengaturan baru');

  console.log('isolir-pool.test.js: SEMUA LULUS');
})().catch((e) => { console.error('GAGAL:', e.message); process.exit(1); });
