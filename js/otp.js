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

async function otpSend(phone) {
  const res  = await fetch(OTP_API, {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ action:'send', phone }),
  });
  const data = await parseOtpResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengirim kode OTP');
  return data.requestId;
}

async function otpVerify(requestId, otp) {
  const res  = await fetch(OTP_API, {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ action:'verify', requestId, otp }),
  });
  const data = await parseOtpResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || 'Kode OTP salah atau kadaluarsa');
  return true;
}

window.Otp = { send: otpSend, verify: otpVerify };
