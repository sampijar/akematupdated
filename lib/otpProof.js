/**
 * lib/otpProof.js — bukti singkat & aman bahwa nomor HP sudah diverifikasi OTP.
 *
 * Registrasi punya alur 2 langkah: verifikasi OTP dulu, isi sisa form &
 * submit belakangan. Supaya endpoint pembuatan akun tidak bisa dipanggil
 * tanpa OTP asli (klaim "sudah diverifikasi" dari client tidak bisa
 * dipercaya begitu saja), server yang menangani /v1/otp/verify menerbitkan
 * token singkat yang ditandatangani (HMAC-SHA256) dan mengikat nomor HP +
 * waktu kadaluarsa. Endpoint registrasi wajib validasi ulang token ini.
 *
 * NOTE: folder ini di luar api/ supaya Vercel tidak menganggapnya endpoint.
 */
const crypto = require('crypto');

const SECRET = process.env.FAZPASS_MERCHANT_KEY?.trim() || '';
const TTL_MS = 15 * 60 * 1000; // 15 menit

function sign(phone, expiresAt) {
  return crypto.createHmac('sha256', SECRET).update(`${phone}.${expiresAt}`).digest('hex');
}

function issueProof(phone) {
  const expiresAt = Date.now() + TTL_MS;
  const sig = sign(phone, expiresAt);
  return Buffer.from(`${phone}.${expiresAt}.${sig}`).toString('base64');
}

function verifyProof(phone, token) {
  try {
    const decoded = Buffer.from(String(token||''), 'base64').toString('utf8');
    const [tokenPhone, expiresAtStr, sig] = decoded.split('.');
    if (tokenPhone !== phone) return false;
    const expiresAt = Number(expiresAtStr);
    if (!expiresAt || Date.now() > expiresAt) return false;
    const expected = sign(tokenPhone, expiresAt);
    const a = Buffer.from(expected);
    const b = Buffer.from(String(sig||''));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

module.exports = { issueProof, verifyProof };
