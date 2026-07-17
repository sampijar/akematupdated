/**
 * lib/rateLimit.js — pembatas percobaan berturut-turut (anti-spam/brute-force)
 * berbasis tabel `rate_limits` di Supabase (lihat db-schema.sql).
 *
 * Dipakai server-side saja (api/auth-register.js, api/auth-login.js,
 * api/fazpass-otp.js) lewat service_role key — bukan sesuatu yang klien
 * bisa panggil langsung.
 *
 * NOTE: folder ini di luar api/ supaya Vercel tidak menganggapnya endpoint.
 */
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SERVICE_KEY  = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Balikin { allowed:true } dan CATAT satu percobaan baru kalau masih di
// bawah batas, atau { allowed:false, retryAfterMinutes } kalau sudah
// melebihi `max` percobaan dalam `windowMinutes` menit terakhir untuk
// `key` ini. Gagal-terbuka (allowed:true) kalau Supabase belum
// dikonfigurasi atau errornya — rate limiting adalah lapisan tambahan,
// bukan satu-satunya pertahanan, jadi tidak boleh sampai memblokir
// fungsi utama kalau infra rate-limit-nya sendiri bermasalah.
async function checkRateLimit(key, max, windowMinutes) {
  if (!SUPABASE_URL || !SERVICE_KEY) return { allowed: true };
  try {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/rate_limits?rl_key=eq.${encodeURIComponent(key)}&created_at=gte.${encodeURIComponent(since)}&select=id`,
      { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
    );
    const rows = await r.json().catch(() => []);
    if (!r.ok) return { allowed: true };
    if (Array.isArray(rows) && rows.length >= max) {
      return { allowed: false, retryAfterMinutes: windowMinutes };
    }
    // Catat percobaan ini (best-effort — kalau gagal, tetap izinkan lanjut).
    fetch(`${SUPABASE_URL}/rest/v1/rate_limits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY },
      body: JSON.stringify({ rl_key: key }),
    }).catch(() => {});
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

module.exports = { checkRateLimit, clientIp };
