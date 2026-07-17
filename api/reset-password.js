/**
 * Vercel Serverless Function: reset-password.js
 * URL: /api/reset-password
 *
 * Forgot-password lewat WA OTP butuh aksi admin di Supabase Auth (set
 * password user lain tanpa mereka login) — ini TIDAK BISA dilakukan dari
 * client SDK, harus server-side pakai SUPABASE_SERVICE_KEY.
 *
 * Memakai `proof` (token bertanda tangan dari /api/fazpass-otp verify,
 * lihat lib/otpProof.js) alih-alih memverifikasi ulang kode OTP mentah ke
 * Fazpass — sebagian provider OTP menganggap kode sekali pakai, jadi
 * verifikasi kedua bisa gagal walau kode aslinya valid. proof menghindari
 * itu sekaligus tetap membuktikan OTP benar-benar sudah divalidasi server.
 */
const { verifyProof } = require('../lib/otpProof');
const { passwordPolicyError } = require('../lib/passwordPolicy');

// SUPABASE_SERVICE_ROLE_KEY = nama yang dipakai integrasi otomatis Vercel⇄Supabase;
// SUPABASE_SERVICE_KEY = nama yang dipakai dokumentasi kita sendiri. Terima dua-duanya.
const SUPABASE_URL         = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normalizePhone(raw) {
  let p = String(raw||'').replace(/\D/g,'');
  if (p.startsWith('0'))      p = '62' + p.slice(1);
  else if (p.startsWith('8')) p = '62' + p;
  return p;
}

function supaHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'apikey': SUPABASE_SERVICE_KEY,
  };
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error:'Method Not Allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error:'Set SUPABASE_URL dan SUPABASE_SERVICE_KEY (atau SUPABASE_SERVICE_ROLE_KEY) di Vercel Environment Variables' });
  }

  const p = typeof req.body === 'object' && req.body ? req.body : {};
  const { phone, proof, newPassword } = p;
  if (!phone || !proof || !newPassword) {
    return res.status(400).json({ error:'phone, proof, dan newPassword wajib diisi' });
  }
  const pwErr = passwordPolicyError(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const digits = normalizePhone(phone);
  if (!verifyProof(digits, proof)) {
    return res.status(401).json({ error:'Verifikasi OTP tidak valid atau sudah kadaluarsa. Kirim ulang kode OTP.' });
  }

  // Cari user berdasarkan nomor HP di tabel profil `users` (id = auth.users.id).
  const lookupUrl = `${SUPABASE_URL}/rest/v1/users?select=id,phone&phone=eq.${digits}`;
  const lookupRes = await fetch(lookupUrl, { headers: supaHeaders() });
  const rows = await lookupRes.json().catch(() => []);
  const user = Array.isArray(rows) ? rows[0] : null;
  if (!user) return res.status(404).json({ error:'Nomor HP tidak terdaftar' });

  // Set password baru lewat Supabase Auth Admin API.
  const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: supaHeaders(),
    body: JSON.stringify({ password: newPassword }),
  });
  if (!adminRes.ok) {
    const detail = await adminRes.json().catch(() => ({}));
    return res.status(502).json({ error: detail?.msg || 'Gagal mengubah password', detail });
  }

  return res.status(200).json({ success: true });
};
