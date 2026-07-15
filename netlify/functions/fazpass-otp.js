/**
 * Netlify Function: fazpass-otp.js
 * Integrasi OTP WhatsApp (Generic Gateway) dari Fazpass.
 * URL: /.netlify/functions/fazpass-otp
 *
 * CARA SETUP:
 * 1. Login ke https://dashboard.fazpass.com
 * 2. Menu Integration → gateway "WA_GENERIC_OTP" (provider Fazpass Generic 7) →
 *    klik "Show Key" untuk melihat gateway key
 * 3. Menu Settings → salin Merchant Key
 * 4. Di Netlify Dashboard → Environment Variables, tambahkan:
 *    FAZPASS_MERCHANT_KEY = merchant key dari dashboard Fazpass
 *    FAZPASS_GATEWAY_KEY  = gateway key WA_GENERIC_OTP (Fazpass Generic 7)
 * 5. Push → Netlify auto-deploy
 *
 * Referensi API (dashboard.fazpass.com/documentation):
 *   POST /v1/otp/request  { phone, gateway_key }        -> data.id, data.otp_length
 *   POST /v1/otp/verify   { otp_id, otp }                -> status:true jika valid
 * Auth: header Authorization: Bearer <merchant_key>
 */

const BASE = 'https://api.fazpass.com';

const MERCHANT_KEY = process.env.FAZPASS_MERCHANT_KEY;
const GATEWAY_KEY   = process.env.FAZPASS_GATEWAY_KEY;

const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type' };
const resp = (s,b) => ({ statusCode:s, headers:{...CORS,'Content-Type':'application/json'}, body:JSON.stringify(b) });

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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode:204, headers:CORS, body:'' };
  if (event.httpMethod !== 'POST')    return resp(405, { error:'Method Not Allowed' });
  if (!MERCHANT_KEY || !GATEWAY_KEY) {
    return resp(500, { error:'Set FAZPASS_MERCHANT_KEY dan FAZPASS_GATEWAY_KEY di Netlify Dashboard → Environment Variables' });
  }

  let p;
  try { p = JSON.parse(event.body); } catch { return resp(400, { error:'Body harus JSON' }); }

  // ── Kirim OTP via WhatsApp (Generic Gateway) ──
  if (p.action === 'send') {
    const phone = normalizePhone(p.phone);
    if (!phone || phone.length < 10) return resp(400, { error:'Nomor HP tidak valid' });

    const { ok, data } = await fazpass('/v1/otp/request', {
      phone,
      gateway_key: GATEWAY_KEY,
    });
    if (!ok || data?.status !== true) {
      return resp(502, { error: data?.message || 'Gagal mengirim OTP', detail: data });
    }
    const otpId = data?.data?.id;
    if (!otpId) return resp(502, { error:'Fazpass tidak mengembalikan id OTP', detail: data });
    return resp(200, { success:true, requestId: otpId });
  }

  // ── Verifikasi kode OTP ──
  if (p.action === 'verify') {
    if (!p.requestId || !p.otp) return resp(400, { error:'requestId dan otp wajib diisi' });

    const { ok, data } = await fazpass('/v1/otp/verify', {
      otp_id: p.requestId,
      otp: String(p.otp).trim(),
    });
    if (!ok || data?.status !== true) {
      return resp(400, { success:false, error: data?.message || 'Kode OTP salah atau kadaluarsa', detail: data });
    }
    return resp(200, { success:true, valid:true });
  }

  return resp(400, { error:`action tidak dikenal: ${p.action}` });
};
