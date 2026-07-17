/**
 * Vercel Serverless Function: auth-login.js
 * URL: /api/auth-login
 *
 * Proxy tipis ke endpoint password-grant Supabase Auth. Login SEBELUMNYA
 * dipanggil langsung dari browser lewat Supabase JS SDK
 * (client.auth.signInWithPassword) — itu artinya percobaan login (dan
 * brute-force password) tidak pernah lewat server kita sendiri, jadi tidak
 * bisa dibatasi. Endpoint ini menyisipkan rate limiting (per email+IP)
 * sebelum meneruskan permintaan ke Supabase, lalu klien memakai token yang
 * dikembalikan lewat client.auth.setSession(...) supaya sesi tetap
 * dikelola SDK seperti biasa (js/api.js — SupabaseAuth.signIn).
 */
const { checkRateLimit, clientIp } = require('../lib/rateLimit');

const SUPABASE_URL      = process.env.SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method Not Allowed' });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Database belum dikonfigurasi.' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi.' });

  // Dibatasi per kombinasi email+IP (bukan email saja) supaya satu pengguna
  // yang salah ketik password beberapa kali dari jaringan sendiri tidak
  // memblokir SEMUA orang yang mencoba login ke email itu dari IP lain.
  const ip = clientIp(req);
  const limit = await checkRateLimit(`login:${email}:${ip}`, 8, 15);
  if (!limit.allowed) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.' });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error_description || data?.msg || data?.error || 'Email atau password salah.';
      return res.status(401).json({ error: /invalid/i.test(msg) ? 'Email atau password salah.' : msg });
    }
    return res.status(200).json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
    });
  } catch (err) {
    console.error('[auth-login]', err);
    return res.status(500).json({ error: err.message });
  }
};
