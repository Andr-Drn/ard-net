/**
 * Service: Impor secret PPPoE dari MikroTik menjadi data pelanggan.
 *
 * - HANYA MEMBACA dari MikroTik; tidak pernah menambah/mengubah/menghapus secret di router.
 * - Pelanggan dibuat langsung ke database (customerService.createCustomer), mode MikroTik API (is_radius = 0).
 * - Secret yang username-nya sudah ada di data pelanggan dilewati (tidak ditimpa).
 */
const db = require('../config/database');
const { logger } = require('../config/logger');
const { getSetting } = require('../config/settingsManager');
const customerSvc = require('./customerService');
const mikrotikSvc = require('./mikrotikService');

const norm = (s) => String(s || '').trim().toLowerCase();

/** Router yang dipakai: id yang dipilih, atau router aktif pertama (sama seperti getConnection). */
function resolveRouterId(routerId) {
  const n = Number(routerId);
  if (Number.isFinite(n) && n > 0) {
    const r = db.prepare('SELECT id FROM routers WHERE id = ?').get(n);
    if (!r) throw new Error('Router dengan ID ' + n + ' tidak ditemukan');
    return n;
  }
  const def = db.prepare('SELECT id FROM routers WHERE is_active = 1 ORDER BY id ASC LIMIT 1').get();
  return def ? def.id : null;
}

function buildContext(routerId) {
  const rid = routerId ? Number(routerId) : null;
  const packages = db.prepare('SELECT * FROM packages').all();
  const pkgByProfile = new Map();
  for (const p of packages) {
    // Paket yang terikat ke router lain tidak dipakai untuk pencocokan
    if (p.router_id && rid && Number(p.router_id) !== rid) continue;
    pkgByProfile.set(norm(p.name), p);
  }
  const isolirNames = new Set(['isolir', norm(getSetting('mikrotik_isolir_profile', 'isolir'))]);
  for (const p of packages) if (p.isolir_profile) isolirNames.add(norm(p.isolir_profile));

  const existingUsers = new Set(
    db.prepare("SELECT pppoe_username FROM customers WHERE pppoe_username IS NOT NULL AND pppoe_username != ''")
      .all().map(r => r.pppoe_username)
  );
  const existingNames = new Set(
    db.prepare("SELECT name FROM customers WHERE name IS NOT NULL AND name != ''").all().map(r => norm(r.name))
  );
  return { pkgByProfile, isolirNames, existingUsers, existingNames };
}

function classify(secret, ctx) {
  const exists = ctx.existingUsers.has(secret.name);
  const isIsolir = ctx.isolirNames.has(norm(secret.profile));
  const pkg = isIsolir ? null : (ctx.pkgByProfile.get(norm(secret.profile)) || null);
  let status = 'active';
  if (isIsolir || secret.disabled) status = 'suspended';
  const notes = [];
  if (exists) notes.push('Sudah ada di data pelanggan');
  if (secret.disabled) notes.push('Secret disabled di MikroTik');
  if (isIsolir) notes.push('Profil isolir');
  else if (!pkg) notes.push('Profil "' + (secret.profile || '-') + '" belum cocok dengan nama paket');
  if (!secret.password) notes.push('Password tidak terbaca');
  return {
    username: secret.name,
    name: secret.comment || secret.name,
    profile: secret.profile,
    packageId: pkg ? pkg.id : null,
    packageName: pkg ? pkg.name : '',
    status,
    disabled: secret.disabled,
    isolir: isIsolir,
    hasPassword: !!secret.password,
    exists,
    remoteAddress: secret.remoteAddress || '',
    notes
  };
}

/** Pratinjau: baca semua secret dan tandai mana yang bisa diimpor. */
async function previewSecrets(routerId) {
  const rid = resolveRouterId(routerId);
  const secrets = await mikrotikSvc.getPppoeSecretsFull(rid);
  const ctx = buildContext(rid);
  const rows = secrets.map(s => classify(s, ctx));
  const summary = {
    total: rows.length,
    importable: rows.filter(r => !r.exists && !r.disabled).length,
    existing: rows.filter(r => r.exists).length,
    disabled: rows.filter(r => r.disabled && !r.exists).length,
    noPackage: rows.filter(r => !r.exists && !r.isolir && !r.packageId).length,
    noPassword: rows.filter(r => !r.exists && !r.hasPassword).length
  };
  return { routerId: rid, summary, rows };
}

/**
 * Impor: baca ulang secret dari router (data dari browser TIDAK dipercaya), lalu buat pelanggan.
 * @param {object} p
 * @param {number|string|null} p.routerId
 * @param {string[]|null} p.usernames  daftar username yang dipilih; null/[] = semua yang bisa diimpor
 * @param {boolean} p.includeDisabled  ikut impor secret yang disabled (status => suspended)
 */
async function importSecrets({ routerId, usernames, includeDisabled = false } = {}) {
  const rid = resolveRouterId(routerId);
  const secrets = await mikrotikSvc.getPppoeSecretsFull(rid);
  const ctx = buildContext(rid);
  const wanted = Array.isArray(usernames) && usernames.length ? new Set(usernames.map(String)) : null;
  const stamp = new Date().toISOString().slice(0, 10);

  const result = { created: 0, skippedExisting: 0, skippedDisabled: 0, failed: [], total: 0 };
  for (const secret of secrets) {
    if (wanted && !wanted.has(secret.name)) continue;
    result.total++;
    const c = classify(secret, ctx);
    if (c.exists) { result.skippedExisting++; continue; }
    if (c.disabled && !includeDisabled) { result.skippedDisabled++; continue; }

    // Nama pelanggan harus unik: bila bentrok, tambahkan username di belakangnya
    let name = c.name;
    if (ctx.existingNames.has(norm(name))) name = c.name + ' (' + c.username + ')';
    if (ctx.existingNames.has(norm(name))) { result.failed.push({ username: c.username, error: 'Nama pelanggan bentrok' }); continue; }

    const pkg = c.packageId ? db.prepare('SELECT isolir_profile FROM packages WHERE id = ?').get(c.packageId) : null;
    try {
      customerSvc.createCustomer({
        name,
        phone: '',
        address: '',
        package_id: c.packageId,
        router_id: rid,
        pppoe_username: c.username,
        pppoe_password: secret.password || '',
        pppoe_remote_address: c.remoteAddress,
        isolir_profile: (pkg && pkg.isolir_profile) || 'isolir',
        status: c.status,
        connection_type: 'pppoe',
        is_radius: 0,
        auto_isolate: 1,
        isolate_day: 10,
        notes: 'Diimpor dari secret MikroTik (' + stamp + ')' + (c.profile ? ', profil: ' + c.profile : '')
      });
      ctx.existingUsers.add(c.username);
      ctx.existingNames.add(norm(name));
      result.created++;
    } catch (e) {
      result.failed.push({ username: c.username, error: e.message });
      logger.warn('[SecretImport] Gagal impor ' + c.username + ': ' + e.message);
    }
  }
  logger.info('[SecretImport] Selesai: ' + result.created + ' dibuat, ' + result.skippedExisting + ' sudah ada, ' + result.failed.length + ' gagal');
  return result;
}

module.exports = { previewSecrets, importSecrets };
