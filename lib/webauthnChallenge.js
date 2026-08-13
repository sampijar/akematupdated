/**
 * lib/webauthnChallenge.js — bukti singkat & aman bahwa sebuah challenge
 * WebAuthn benar-benar diterbitkan server ini, tanpa perlu menyimpan
 * sesi/state di database (serverless function tidak punya memori antar
 * request). Pola & alasan persis sama seperti lib/otpProof.js: server
 * menandatangani (HMAC-SHA256) challenge + waktu kadaluarsa, klien bawa
 * balik token itu di langkah verifikasi, server tinggal cek tanda
 * tangannya valid & belum kedaluwarsa — tidak pernah percaya klaim
 * challenge dari klien begitu saja.
 *
 * NOTE: folder ini di luar api/ supaya Vercel tidak menganggapnya endpoint.
 */
const crypto = require('crypto');

const SECRET = process.env.FAZPASS_MERCHANT_KEY?.trim() || '';
const TTL_MS = 5 * 60 * 1000; // 5 menit — cukup buat prompt biometric selesai

function sign(challenge, expiresAt) {
  return crypto.createHmac('sha256', SECRET).update(`${challenge}.${expiresAt}`).digest('hex');
}

function issueChallengeToken(challenge) {
  const expiresAt = Date.now() + TTL_MS;
  const sig = sign(challenge, expiresAt);
  return Buffer.from(`${challenge}.${expiresAt}.${sig}`).toString('base64');
}

// Balikin challenge asli kalau token valid & belum kedaluwarsa, null kalau tidak.
function verifyChallengeToken(token) {
  try {
    const decoded = Buffer.from(String(token || ''), 'base64').toString('utf8');
    const [challenge, expiresAtStr, sig] = decoded.split('.');
    const expiresAt = Number(expiresAtStr);
    if (!challenge || !expiresAt || Date.now() > expiresAt) return null;
    const expected = sign(challenge, expiresAt);
    const a = Buffer.from(expected);
    const b = Buffer.from(String(sig || ''));
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return challenge;
  } catch { return null; }
}

module.exports = { issueChallengeToken, verifyChallengeToken };
