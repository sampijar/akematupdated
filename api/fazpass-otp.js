/**
 * Vercel Serverless Function: fazpass-otp.js
 * Integrasi OTP WhatsApp (Generic Gateway) dari Fazpass.
 * URL: /api/fazpass-otp
 *
 * CARA SETUP:
 * 1. Login ke https://dashboard.fazpass.com
 * 2. Menu Integration → gateway "WA_GENERIC_OTP" (provider Fazpass Generic 7) →
 *    klik "Show Key" untuk melihat gateway key
 * 3. Menu Settings → salin Merchant Key
 * 4. Di Vercel Dashboard → Project → Settings → Environment Variables, tambahkan:
 *    FAZPASS_MERCHANT_KEY = merchant key dari dashboard Fazpass
 *    FAZPASS_GATEWAY_KEY  = gateway key WA_GENERIC_OTP (Fazpass Generic 7)
 * 5. Push → Vercel auto-deploy
 *
 * Referensi API (dashboard.fazpass.com/documentation):
 *   POST /v1/otp/request  { phone, gateway_key }        -> data.id, data.otp_length
 *   POST /v1/otp/verify   { otp_id, otp }                -> status:true jika valid
 * Auth: header Authorization: Bearer <merchant_key>
 */

const BASE = 'https://api.fazpass.com';

// .trim() jaga-jaga jika ada spasi/newline tak sengaja ikut ter-paste saat
// menyimpan value di Vercel Environment Variables.
const MERCHANT_KEY = process.env.FAZPASS_MERCHANT_KEY?.trim();
const GATEWAY_KEY   = process.env.FAZPASS_GATEWAY_KEY?.trim();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Normalisasi ke format internasional (62xxxxxxxxxx) tanpa tanda + / spasi
function normalizePhone(raw) {
  let p = String(raw||'').replace(/\D/g,'');
  if (p.startsWith('0'))       p = '62' + p.slice(1);
  else if (p.startsWith('8'))  p = '62' + p;
  return p;
}

async function fazpass(endpoint, body) {
  const r = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'Authorization': `Bearer ${MERCHANT_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data };
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error:'Method Not Allowed' });
  if (!MERCHANT_KEY || !GATEWAY_KEY) {
    const missing = [!MERCHANT_KEY && 'FAZPASS_MERCHANT_KEY', !GATEWAY_KEY && 'FAZPASS_GATEWAY_KEY'].filter(Boolean).join(', ');
    return res.status(500).json({ error:`Env var ${missing} kosong di deployment ini. Jika sudah diisi di Vercel Dashboard, pastikan di-set untuk environment "Production" (bukan cuma Preview) dan redeploy — menambah/mengubah env var TIDAK otomatis redeploy deployment yang sudah ada.` });
  }

  const p = typeof req.body === 'object' && req.body ? req.body : {};

  // ── Kirim OTP via WhatsApp (Generic Gateway) ──
  if (p.action === 'send') {
    const phone = normalizePhone(p.phone);
    if (!phone || phone.length < 10) return res.status(400).json({ error:'Nomor HP tidak valid' });

    const { ok, data } = await fazpass('/v1/otp/request', {
      phone,
      gateway_key: GATEWAY_KEY,
    });
    if (!ok || data?.status !== true) {
      return res.status(502).json({ error: data?.message || 'Gagal mengirim OTP', detail: data });
    }
    const otpId = data?.data?.id;
    if (!otpId) return res.status(502).json({ error:'Fazpass tidak mengembalikan id OTP', detail: data });
    return res.status(200).json({ success:true, requestId: otpId });
  }

  // ── Verifikasi kode OTP ──
  if (p.action === 'verify') {
    if (!p.requestId || !p.otp) return res.status(400).json({ error:'requestId dan otp wajib diisi' });

    const { ok, data } = await fazpass('/v1/otp/verify', {
      otp_id: p.requestId,
      otp: String(p.otp).trim(),
    });
    if (!ok || data?.status !== true) {
      return res.status(400).json({ success:false, error: data?.message || 'Kode OTP salah atau kadaluarsa', detail: data });
    }
    return res.status(200).json({ success:true, valid:true });
  }

  return res.status(400).json({ error:`action tidak dikenal: ${p.action}` });
};
