#!/usr/bin/env node
/**
 * scripts/preflight.js — Cek cepat sebelum push, supaya kejadian yang
 * pernah terjadi (build Vercel gagal diam-diam berjam-jam karena lebih
 * dari 12 Serverless Functions, package-lock.json ketinggalan, dst) bisa
 * ketahuan SEBELUM push, bukan setelah ditemukan pengguna.
 *
 * Jalankan manual: node scripts/preflight.js  (atau: npm run preflight)
 * Bukan bagian dari build Vercel — murni alat bantu lokal sebelum push.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
let failed = false;
function fail(msg) { console.error('✗ ' + msg); failed = true; }
function ok(msg)   { console.log('✓ ' + msg); }

function trackedFiles(pattern) {
  try {
    return execSync(`git ls-files "${pattern}"`, { cwd: ROOT })
      .toString().trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

// 1) Syntax check semua .js yang di-track git.
const jsFiles = trackedFiles('*.js');
let syntaxErrors = 0;
for (const file of jsFiles) {
  try {
    execSync(`node -c "${file}"`, { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    fail(`Syntax error di ${file}:\n${(e.stderr || e.message).toString().trim()}`);
    syntaxErrors++;
  }
}
if (!syntaxErrors) ok(`Syntax OK di ${jsFiles.length} file .js`);

// 2) Validasi file JSON penting.
['vercel.json', 'package.json', 'manifest.json'].forEach((f) => {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) return;
  try {
    JSON.parse(fs.readFileSync(p, 'utf8'));
    ok(`${f} valid JSON`);
  } catch (e) {
    fail(`${f} bukan JSON yang valid: ${e.message}`);
  }
});

// 3) Jumlah Serverless Functions — Vercel Hobby dibatasi maks 12/deployment.
const apiDir = path.join(ROOT, 'api');
if (fs.existsSync(apiDir)) {
  const apiFiles = fs.readdirSync(apiDir).filter((f) => f.endsWith('.js'));
  if (apiFiles.length > 12) {
    fail(`${apiFiles.length} file di api/ — Vercel Hobby maks 12, DEPLOY AKAN GAGAL. Gabung beberapa endpoint pakai pola action:'...' (contoh: api/db.js, api/auth.js).`);
  } else {
    ok(`${apiFiles.length}/12 Serverless Functions dipakai di api/`);
  }
}

// 4) package-lock.json wajib ada kalau package.json punya dependencies
// (Vercel default install pakai `npm ci`, yang GAGAL tanpa lockfile).
const pkgPath = path.join(ROOT, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const hasDeps = Object.keys(pkg.dependencies || {}).length > 0;
  const hasLock = fs.existsSync(path.join(ROOT, 'package-lock.json'));
  if (hasDeps && !hasLock) {
    fail('package.json punya dependencies tapi package-lock.json tidak ada — build Vercel (npm ci) akan gagal. Jalankan: npm install --package-lock-only');
  } else {
    ok('package-lock.json ada / tidak dibutuhkan');
  }
}

// 5) .env.example tidak boleh berisi nilai asli — semua baris KEY= harus
// kosong (nilai asli dikirim terpisah lewat chat, tidak pernah ke git),
// KECUALI beberapa default non-rahasia yang memang sengaja diisi (bukan
// kunci/token, cuma pilihan mode/konfigurasi biasa).
const SAFE_NON_EMPTY_DEFAULTS = ['DOKU_ENV'];
const envExamplePath = path.join(ROOT, '.env.example');
if (fs.existsSync(envExamplePath)) {
  const lines = fs.readFileSync(envExamplePath, 'utf8').split('\n');
  const leaked = lines.filter((l) => {
    const t = l.trim();
    if (!/^[A-Z][A-Z0-9_]*=./.test(t)) return false;
    const key = t.split('=')[0];
    return !SAFE_NON_EMPTY_DEFAULTS.includes(key);
  });
  if (leaked.length) {
    fail('.env.example kelihatannya berisi NILAI ASLI (bukan kosong):\n    ' + leaked.join('\n    ') + '\n  Kosongkan nilainya — jangan pernah commit secret asli ke git.');
  } else {
    ok('.env.example semua variabel kosong (tidak ada secret ke-commit)');
  }
}

console.log('');
if (failed) {
  console.error('❌ Preflight GAGAL — perbaiki dulu sebelum push.');
  process.exit(1);
} else {
  console.log('✅ Semua cek preflight lolos — aman buat push.');
}
