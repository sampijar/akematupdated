'use strict';
/**
 * otp.js — Fazpass WhatsApp OTP frontend integration
 * Dipanggil dari app.js untuk verifikasi nomor HP saat registrasi.
 */

const OTP_API = '/api/fazpass-otp';

async function otpSend(phone) {
  const res  = await fetch(OTP_API, {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ action:'send', phone }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengirim kode OTP');
  return data.requestId;
}

async function otpVerify(requestId, otp) {
  const res  = await fetch(OTP_API, {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ action:'verify', requestId, otp }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Kode OTP salah atau kadaluarsa');
  return true;
}

window.Otp = { send: otpSend, verify: otpVerify };
