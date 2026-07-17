/**
 * lib/turnstile.js — Verifikasi token Cloudflare Turnstile (CAPTCHA) di
 * server. Site key (publik, aman ditaruh di frontend) ada di index.html;
 * TURNSTILE_SECRET_KEY di sini RAHASIA, cuma dipakai server-side.
 *
 * NOTE: folder ini di luar api/ supaya Vercel tidak menganggapnya endpoint
 * (sama seperti lib/rateLimit.js).
 */
const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY?.trim();

// Gagal-terbuka (true) HANYA kalau belum dikonfigurasi sama sekali — supaya
// deploy kode ini tidak langsung mengunci login/registrasi sebelum env var
// diisi di Vercel. Begitu SECRET_KEY terisi, token kosong/tidak valid/gagal
// diverifikasi ke Cloudflare SEMUA dianggap gagal (fail-closed).
async function verifyTurnstile(token, remoteIp) {
  if (!SECRET_KEY) return true;
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: SECRET_KEY, response: token, remoteip: remoteIp || '' }),
    });
    const data = await r.json().catch(() => ({}));
    return data?.success === true;
  } catch {
    return false;
  }
}

module.exports = { verifyTurnstile };
