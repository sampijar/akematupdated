/**
 * Netlify Function: ipaymu-payment.js
 * URL: /.netlify/functions/ipaymu-payment
 */
const crypto = require('crypto');

const VA      = process.env.IPAYMU_VA;
const API_KEY = process.env.IPAYMU_API_KEY;
const ENV     = process.env.IPAYMU_ENV || 'production';
const BASE    = ENV === 'sandbox' ? 'https://sandbox.ipaymu.com' : 'https://my.ipaymu.com';

const CORS = { 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type' };

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

const resp = (s,b) => ({ statusCode:s, headers:{...CORS,'Content-Type':'application/json'}, body:JSON.stringify(b) });

exports.handler = async (event) => {
  if (event.httpMethod==='OPTIONS') return {statusCode:204,headers:CORS,body:''};
  if (event.httpMethod!=='POST') return resp(405,{error:'Method Not Allowed'});
  if (!VA||!API_KEY) return resp(500,{error:'Set IPAYMU_VA dan IPAYMU_API_KEY di Netlify Dashboard → Environment Variables'});

  let p;
  try { p = JSON.parse(event.body); } catch { return resp(400,{error:'Body harus JSON'}); }

  const site = event.headers.origin || 'https://akematfoundation.org';

  if (p.action === 'redirect') {
    const {amount, productName, description, referenceId, buyerName, buyerEmail, buyerPhone} = p;
    if (!amount||!buyerName||!buyerEmail||!buyerPhone) return resp(400,{error:'amount, buyerName, buyerEmail, buyerPhone wajib'});
    if (+amount < 1000) return resp(400,{error:'Minimal Rp 1.000'});

    const refId = referenceId||`AKM-${Date.now()}`;
    const body = {
      product: [productName||'Pembayaran Akemat'], qty:[1], price:[Math.round(+amount)],
      description: [description||'Akemat Foundation'],
      returnUrl:  `${site}/payment-return.html`,
      cancelUrl:  `${site}/payment-cancel.html`,
      notifyUrl:  `${site}/.netlify/functions/ipaymu-notify`,
      referenceId: refId,
      buyerName, buyerEmail,
      buyerPhone: String(buyerPhone).replace(/\D/g,''),
      expired: 24,
    };

    const r = await iPaymu('/api/v2/payment', body);
    if (r?.Status !== 200) return resp(502,{error:r?.Message||'Gagal membuat transaksi',detail:r});
    // Redirect Payment hanya mengembalikan SessionID & Url — trx_id numerik baru
    // tersedia lewat query string returnUrl setelah pembeli menyelesaikan pembayaran.
    return resp(200,{success:true, sessionId:r.Data?.SessionID, referenceId:refId, paymentUrl:r.Data?.Url});
  }

  if (p.action === 'status') {
    if (!p.transactionId) return resp(400,{error:'transactionId wajib'});
    const r = await iPaymu('/api/v2/transaction', {id:String(p.transactionId)});
    return resp(200,{success:true, data:r?.Data});
  }

  return resp(400,{error:`action tidak dikenal: ${p.action}`});
};
