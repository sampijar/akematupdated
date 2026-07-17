'use strict';
/**
 * otp.js — Fazpass WhatsApp OTP frontend integration
 * Dipanggil dari app.js untuk verifikasi nomor HP saat registrasi.
 */

const OTP_API = '/api/fazpass-otp';

// Parse response defensif: kalau server balas HTML (mis. 404 platform) alih-alih
// JSON, jangan biarkan error parsing mentah bocor ke pengguna.
async function parseOtpResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error('Server OTP tidak merespons dengan benar (HTTP '+res.status+'). Coba lagi sebentar lagi.'); }
}

// Kalau provider OTP di sisi server lambat/menggantung, fetch tanpa timeout bisa
// membuat tombol "Mengirim…" macet selamanya tanpa pesan error apa pun ke
// pengguna. Batasi max 20 detik supaya UI selalu balik ke keadaan bisa dicoba
// lagi, dengan pesan yang jelas.
async function fetchWithTimeout(url, opts, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Server OTP tidak merespons. Coba lagi sebentar lagi.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

async function otpSend(phone, turnstileToken) {
  const res  = await fetchWithTimeout(OTP_API, {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ action:'send', phone, turnstileToken }),
  });
  const data = await parseOtpResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengirim kode OTP');
  return data.requestId;
}

async function otpVerify(requestId, otp, phone) {
  const res  = await fetchWithTimeout(OTP_API, {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ action:'verify', requestId, otp, phone }),
  });
  const data = await parseOtpResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || 'Kode OTP salah atau kadaluarsa');
  return data.proof; // token bukti OTP tervalidasi, dibutuhkan endpoint registrasi/reset-password
}

window.Otp = { send: otpSend, verify: otpVerify };
