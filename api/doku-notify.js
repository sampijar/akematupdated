/**
 * Vercel Serverless Function: doku-notify.js
 * Webhook (notification) dari DOKU setelah status pembayaran berubah.
 * URL: /api/doku-notify (didaftarkan sebagai additional_info.override_notification_url
 * saat membuat pembayaran di api/doku-payment.js)
 *
 * Keamanan: DOKU menandatangani balik notifikasi dengan skema yang sama
 * seperti request (Client-Id/Request-Id/Request-Timestamp/Signature/Digest,
 * lihat lib/dokuSignature.js) — wajib diverifikasi sebelum dipercaya.
 *
 * Nama field body notifikasi mengikuti pola order/transaction DOKU; kalau
 * field yang sebenarnya beda dari yang diasumsikan di sini (belum sempat
 * dikonfirmasi lewat dokumentasi "Notification"), sesuaikan bagian parsing
 * di bawah — signature check & respons 200 tidak perlu diubah.
 *
 * bodyParser dimatikan karena verifikasi signature butuh raw body, bukan hasil parse.
 */
const { verifyNotificationSignature } = require('../lib/dokuSignature');

const SECRET_KEY = process.env.DOKU_SECRET_KEY?.trim();
const CLIENT_ID  = process.env.DOKU_CLIENT_ID?.trim();

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const rawBody = await readRawBody(req);
  const h = req.headers;
  const signatureOk = SECRET_KEY && CLIENT_ID && verifyNotificationSignature({
    secretKey: SECRET_KEY,
    clientId: h['client-id'] || CLIENT_ID,
    requestId: h['request-id'],
    timestamp: h['request-timestamp'],
    requestTarget: '/api/doku-notify',
    rawBody,
    signatureHeader: h['signature'],
  });
  if (!signatureOk) {
    console.warn('[doku-notify] ⚠️ signature tidak valid atau tidak ada — notifikasi diabaikan');
  }

  let body = {};
  try { body = JSON.parse(rawBody); } catch (e) { console.error('[doku-notify] parse error', e); }

  const s = (v) => String(v ?? '').trim();
  const invoiceNumber = s(body.order?.invoice_number || body.invoice_number);
  const amount        = s(body.order?.amount || body.amount);
  const status        = s(body.transaction?.status || body.transaction_status || body.status).toUpperCase();

  const isPaid = signatureOk && ['SUCCESS', 'PAID', 'COMPLETED'].includes(status);
  console.log(`[doku-notify] invoice=${invoiceNumber} status=${status} amount=${amount} signatureOk=${signatureOk} paid=${isPaid}`);

  if (isPaid) {
    // Konfirmasi pembayaran yang benar-benar dipakai untuk mengkreditkan
    // donasi/booking dilakukan client-side di payment-return.html (lihat
    // finalizePaid()) setelah pengguna diarahkan balik dan kita cek status
    // ke DOKU langsung. Notifikasi ini adalah catatan server-to-server
    // tambahan (berguna kalau pengguna menutup tab sebelum redirect balik).
    console.log(`[doku-notify] ✅ PAID Rp ${amount} | invoice=${invoiceNumber}`);
  }

  // WAJIB return 200 supaya DOKU tidak retry terus, meski signature tidak valid.
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ received: true });
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
