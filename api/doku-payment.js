/**
 * Vercel Serverless Function: doku-payment.js
 * DOKU Checkout API — bikin sesi pembayaran (payment.url) & cek status.
 * URL: /api/doku-payment
 *
 * Docs: developers.doku.com → Accept Payments → DOKU Checkout →
 * Integration Guide → Backend Integration.
 *
 * CARA SETUP:
 * 1. Daftar/login ke DOKU Back Office, ambil Client Id + Secret Key
 *    (sandbox dulu untuk testing: sandbox.doku.com)
 * 2. Di Vercel Dashboard → Project → Settings → Environment Variables:
 *    DOKU_CLIENT_ID = MCH-0001-xxxxxxxxxxxxx
 *    DOKU_SECRET_KEY = xxxxx
 *    DOKU_ENV = sandbox   (atau production)
 * 3. Push ke GitHub → Vercel auto-deploy
 */
const { buildRequestHeaders } = require('../lib/dokuSignature');

const CLIENT_ID   = process.env.DOKU_CLIENT_ID?.trim();
const SECRET_KEY  = process.env.DOKU_SECRET_KEY?.trim();
const ENV         = process.env.DOKU_ENV?.trim() || 'sandbox';
const BASE        = ENV === 'production' ? 'https://api.doku.com' : 'https://api-sandbox.doku.com';

const PAYMENT_PATH = '/checkout/v1/payment';
// Endpoint cek status non-SNAP DOKU — pola umum {invoiceNumber} di path,
// signature GET tanpa body. Kalau path ini ternyata beda di dokumentasi
// "Check Status API", sesuaikan di sini saja (satu tempat).
const STATUS_PATH_PREFIX = '/orders/v1/status/';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function dokuPost(path, bodyObj) {
  const rawBody = JSON.stringify(bodyObj);
  const { headers } = buildRequestHeaders({ clientId: CLIENT_ID, secretKey: SECRET_KEY, requestTarget: path, rawBody });
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: rawBody,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: r.ok, status: r.status, data };
}

async function dokuGet(path) {
  // Request GET tanpa body → Digest dihitung dari string kosong (lihat
  // "Signature from API Get Method" di dokumentasi DOKU).
  const { headers } = buildRequestHeaders({ clientId: CLIENT_ID, secretKey: SECRET_KEY, requestTarget: path, rawBody: '' });
  const r = await fetch(`${BASE}${path}`, { method: 'GET', headers });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: r.ok, status: r.status, data };
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!CLIENT_ID || !SECRET_KEY) return res.status(500).json({ error: 'Set DOKU_CLIENT_ID dan DOKU_SECRET_KEY di Vercel Environment Variables' });

  const p = typeof req.body === 'object' && req.body ? req.body : {};
  const site = req.headers.origin || 'https://akematfoundation.org';

  if (p.action === 'redirect') {
    const { amount, productName, description, referenceId, buyerName, buyerEmail, buyerPhone } = p;
    if (!amount || !buyerName || !buyerEmail || !buyerPhone) return res.status(400).json({ error: 'amount, buyerName, buyerEmail, buyerPhone wajib' });
    if (+amount < 1000) return res.status(400).json({ error: 'Minimal Rp 1.000' });

    const invoiceNumber = referenceId || `AKM-${Date.now()}`;
    const body = {
      order: {
        amount: Math.round(+amount),
        invoice_number: invoiceNumber,
        currency: 'IDR',
        callback_url: `${site}/payment-return.html`,
        callback_url_cancel: `${site}/payment-cancel.html`,
        callback_url_result: `${site}/payment-return.html`,
        line_items: [{
          id: '1',
          name: (productName || description || 'Pembayaran Akemat Foundation').slice(0, 60),
          quantity: 1,
          price: Math.round(+amount),
        }],
      },
      payment: {
        payment_due_date: 60,
      },
      customer: {
        id: invoiceNumber,
        name: buyerName,
        email: buyerEmail,
        phone: String(buyerPhone).replace(/\D/g, ''),
        country: 'ID',
      },
      additional_info: {
        override_notification_url: `${site}/api/doku-notify`,
      },
    };

    let result;
    try { result = await dokuPost(PAYMENT_PATH, body); }
    catch (err) { return res.status(502).json({ error: 'Gagal menghubungi DOKU: ' + err.message }); }

    if (!result.ok) {
      const msg = result.data?.error?.message || result.data?.response_message || result.data?.message || 'Gagal membuat transaksi DOKU';
      return res.status(502).json({ error: msg, detail: result.data });
    }
    const paymentUrl = result.data?.response?.payment?.url || result.data?.payment?.url;
    if (!paymentUrl) return res.status(502).json({ error: 'URL pembayaran tidak ditemukan pada respons DOKU', detail: result.data });

    return res.status(200).json({ success: true, referenceId: invoiceNumber, paymentUrl });
  }

  if (p.action === 'status') {
    if (!p.transactionId) return res.status(400).json({ error: 'transactionId (invoice_number) wajib' });
    let result;
    try { result = await dokuGet(STATUS_PATH_PREFIX + encodeURIComponent(p.transactionId)); }
    catch (err) { return res.status(502).json({ error: 'Gagal menghubungi DOKU: ' + err.message }); }
    if (!result.ok) return res.status(502).json({ error: result.data?.response_message || 'Gagal cek status', detail: result.data });
    return res.status(200).json({ success: true, data: result.data });
  }

  return res.status(400).json({ error: `action tidak dikenal: ${p.action}` });
};
