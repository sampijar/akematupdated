'use strict';
/**
 * payment.js — iPaymu frontend integration
 * Dipanggil dari app.js untuk donasi dan booking payment
 */

const PAYMENT_API = '/api/ipaymu-payment';

// ── Helpers ────────────────────────────────────────────────
function rpFmtP(n){ return 'Rp '+Number(n||0).toLocaleString('id-ID'); }

function setBtn(btn, loading, label){
  if(!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Memproses…' : label;
}

function genRef(prefix){ return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }

// Parse response defensif: kalau server balas HTML (mis. 404 platform) alih-alih
// JSON, jangan biarkan error parsing mentah bocor ke pengguna.
async function parsePaymentResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error('Server pembayaran tidak merespons dengan benar (HTTP '+res.status+'). Coba lagi sebentar lagi.'); }
}

// ── Core: create iPaymu redirect payment ──────────────────
async function createPayment({ amount, productName, description, referenceId, buyerName, buyerEmail, buyerPhone }){
  const res = await fetch(PAYMENT_API, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action:'redirect', amount, productName, description, referenceId, buyerName, buyerEmail, buyerPhone }),
  });
  const data = await parsePaymentResponse(res);
  if (!res.ok || !data.success) throw new Error(data.error || 'Gagal membuat transaksi');
  if (!data.paymentUrl)          throw new Error('URL pembayaran tidak ditemukan');
  // Simpan metadata di sessionStorage untuk halaman return
  sessionStorage.setItem('akemat_tx', JSON.stringify({ ...data, amount, productName, buyerName, createdAt: new Date().toISOString() }));
  return data.paymentUrl;
}

// ── Donasi Campaign ────────────────────────────────────────
async function payDonation({ amount, campaignId, campaignTitle, buyerName, buyerEmail, buyerPhone, anonymous, donorId }){
  const refId = genRef('DON');
  const url   = await createPayment({
    amount,
    productName: campaignTitle.slice(0,60),
    description: 'Donasi: ' + campaignTitle.slice(0,50),
    referenceId: refId,
    buyerName, buyerEmail, buyerPhone,
  });
  // Catat di localStorage dulu (akan dikonfirmasi via webhook)
  const tx = JSON.parse(sessionStorage.getItem('akemat_tx') || '{}');
  sessionStorage.setItem('akemat_tx', JSON.stringify({ ...tx, type:'donation', campaignId, donorId, anonymous }));
  window.location.href = url;
}

// ── Booking Perawat ────────────────────────────────────────
async function payBooking({ bookingId, totalCost, nurseName, service, buyerName, buyerEmail, buyerPhone }){
  const refId = genRef('BKG');
  const url   = await createPayment({
    amount:      totalCost,
    productName: `Booking ${nurseName.split(',')[0]}`,
    description: `Perawatan: ${service}`,
    referenceId: refId,
    buyerName, buyerEmail, buyerPhone,
  });
  const tx = JSON.parse(sessionStorage.getItem('akemat_tx') || '{}');
  sessionStorage.setItem('akemat_tx', JSON.stringify({ ...tx, type:'booking', bookingId }));
  window.location.href = url;
}

// ── Check status ───────────────────────────────────────────
async function checkStatus(transactionId){
  const res  = await fetch(PAYMENT_API, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ action:'status', transactionId }),
  });
  const data = await parsePaymentResponse(res).catch(() => null);
  return data?.data || null;
}

window.Payment = { createPayment, payDonation, payBooking, checkStatus };
