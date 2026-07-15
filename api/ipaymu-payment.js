/**
 * Vercel Serverless Function: ipaymu-payment.js
 * URL: /api/ipaymu-payment
 */
const crypto = require('crypto');

// .trim() jaga-jaga jika ada spasi/newline tak sengaja ikut ter-paste saat
// menyimpan value di Vercel Environment Variables.
const VA      = process.env.IPAYMU_VA?.trim();
const API_KEY = process.env.IPAYMU_API_KEY?.trim();
const ENV     = process.env.IPAYMU_ENV?.trim() || 'production';
const BASE    = ENV === 'sandbox' ? 'https://sandbox.ipaymu.com' : 'https://my.ipaymu.com';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function ts() { const d=new Date(); return [d.getFullYear(),d.getMonth()+1,d.getDate(),d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,'0')).join(''); }

function sign(body) {
  const hash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex').toLowerCase();
  return crypto.createHmac('sha256',API_KEY).update(`POST:${VA}:${hash}:${API_KEY}`).digest('hex');
}

async function iPaymu(endpoint, body) {
  const r = await fetch(`${BASE}${endpoint}`, {
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json','va':VA,'signature':sign(body),'timestamp':ts()},
    body: JSON.stringify(body),
  });
  return r.json();
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error:'Method Not Allowed' });
  if (!VA||!API_KEY) return res.status(500).json({ error:'Set IPAYMU_VA dan IPAYMU_API_KEY di Vercel Environment Variables' });

  const p = typeof req.body === 'object' && req.body ? req.body : {};
  const site = req.headers.origin || 'https://akematfoundation.org';

  if (p.action === 'redirect') {
    const {amount, productName, description, referenceId, buyerName, buyerEmail, buyerPhone} = p;
    if (!amount||!buyerName||!buyerEmail||!buyerPhone) return res.status(400).json({ error:'amount, buyerName, buyerEmail, buyerPhone wajib' });
    if (+amount < 1000) return res.status(400).json({ error:'Minimal Rp 1.000' });

    const refId = referenceId||`AKM-${Date.now()}`;
    const body = {
      product: [productName||'Pembayaran Akemat'], qty:[1], price:[Math.round(+amount)],
      description: [description||'Akemat Foundation'],
      returnUrl:  `${site}/payment-return.html`,
      cancelUrl:  `${site}/payment-cancel.html`,
      notifyUrl:  `${site}/api/ipaymu-notify`,
      referenceId: refId,
      buyerName, buyerEmail,
      buyerPhone: String(buyerPhone).replace(/\D/g,''),
      expired: 24,
    };

    const r = await iPaymu('/api/v2/payment', body);
    if (r?.Status !== 200) return res.status(502).json({ error:r?.Message||'Gagal membuat transaksi', detail:r });
    // Redirect Payment hanya mengembalikan SessionID & Url — trx_id numerik baru
    // tersedia lewat query string returnUrl setelah pembeli menyelesaikan pembayaran.
    return res.status(200).json({ success:true, sessionId:r.Data?.SessionID, referenceId:refId, paymentUrl:r.Data?.Url });
  }

  if (p.action === 'status') {
    if (!p.transactionId) return res.status(400).json({ error:'transactionId wajib' });
    const r = await iPaymu('/api/v2/transaction', {id:String(p.transactionId)});
    return res.status(200).json({ success:true, data:r?.Data });
  }

  return res.status(400).json({ error:`action tidak dikenal: ${p.action}` });
};
