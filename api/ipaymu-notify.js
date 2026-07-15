/**
 * Vercel Serverless Function: ipaymu-notify.js
 * Webhook (callback) dari iPaymu setelah pembayaran berhasil/gagal/expired.
 * URL: /api/ipaymu-notify
 *
 * Keamanan: iPaymu mengirim header X-Signature (HMAC-SHA256) yang wajib
 * divalidasi sebelum memproses callback — gunakan Nomor VA sebagai secret key
 * (docs.ipaymu.com/id/docs/callback → "Secret Key untuk Validasi Signature").
 * Catatan: dokumentasi yang tersedia tidak menunjukkan contoh kode HMAC secara
 * eksplisit untuk callback ini — implementasi di bawah memakai HMAC-SHA256(raw
 * body, VA), pola paling umum untuk validasi webhook. Jika signature selalu
 * gagal cocok di production, cek ulang formula di dashboard iPaymu →
 * Integration → Callback, atau hubungi support@ipaymu.com.
 *
 * bodyParser dimatikan karena validasi signature butuh raw body, bukan hasil parse.
 */
const crypto = require('crypto');

const VA = process.env.IPAYMU_VA;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function validSignature(rawBody, signatureHeader) {
  if (!VA || !signatureHeader) return false;
  const expected = crypto.createHmac('sha256', VA).update(rawBody || '').digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureHeader));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const rawBody = await readRawBody(req);
  const sigHeader = req.headers['x-signature'];
  const signatureOk = validSignature(rawBody, sigHeader);
  if (!signatureOk) {
    console.warn('[notify] ⚠️ signature tidak valid atau tidak ada — callback diabaikan');
  }

  let body = {};
  try {
    const ct = req.headers['content-type'] || '';
    body = ct.includes('application/json')
      ? JSON.parse(rawBody)
      : Object.fromEntries(new URLSearchParams(rawBody));
  } catch(e) { console.error('[notify] parse error', e); }

  const s       = (v) => String(v ?? '').trim();
  const trxId   = s(body.trx_id   || body.TransactionId);
  const status  = s(body.status   || body.Status);
  const amount  = s(body.amount   || body.Amount);
  const refId   = s(body.reference_id || body.ReferenceId);
  const via     = s(body.via     || body.Via);
  const buyer   = s(body.buyer_name || body.BuyerName);

  const isPaid = signatureOk && ['berhasil','success','1'].includes(status.toLowerCase());
  console.log(`[notify] trxId=${trxId} status=${status} amount=${amount} ref=${refId} via=${via} buyer=${buyer} signatureOk=${signatureOk} paid=${isPaid}`);

  if (isPaid) {
    // TODO: update database booking/donation status setelah Supabase terhubung.
    // Contoh integrasi Supabase:
    // const { createClient } = require('@supabase/supabase-js');
    // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    // await supabase.from('transactions').update({status:'paid'}).eq('reference_id', refId);
    //
    // Atau kirim notif WA via WA Business API / Fonnte
    console.log(`[notify] ✅ PAID Rp ${amount} | trxId=${trxId} | ref=${refId}`);
  }

  // WAJIB return 200 agar iPaymu tidak retry, meski signature tidak valid.
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ received: true });
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
