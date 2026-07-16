'use strict';
/**
 * payment.js — DOKU Checkout frontend integration
 * Dipanggil dari app.js untuk donasi dan booking payment
 */

const PAYMENT_API = '/api/doku-payment';

// ── Helpers ────────────────────────────────────────────────
function rpFmtP(n){ return 'Rp '+Number(n||0).toLocaleString('id-ID'); }

function setBtn(btn, loading, label){
  if(!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Memproses…' : label;
}

function genRef(prefix){ return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }

// Layar transisi branded sebelum lompat ke halaman DOKU — supaya perpindahan
// domain terasa seperti hand-off yang disengaja (dan menyampaikan alasannya),
// bukan lompatan mendadak yang bikin pengguna curiga/kaget.
function redirectToPayment(url){
  if(!document.getElementById('akematRedirectOverlay')){
    const style = document.createElement('style');
    style.textContent = `
    #akematRedirectOverlay{position:fixed;inset:0;z-index:9999;background:#FBF7F1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:'Work Sans',sans-serif;text-align:center;padding:24px;animation:akematFadeIn .25s ease}
    #akematRedirectOverlay .aro-spin{width:34px;height:34px;border:3px solid #DDD3C4;border-top-color:#1F4D3F;border-radius:50%;animation:akematSpin .8s linear infinite}
    #akematRedirectOverlay .aro-title{font-family:'Sora',sans-serif;font-weight:800;font-size:1.05rem;color:#1F4D3F;margin:4px 0 0}
    #akematRedirectOverlay .aro-sub{font-size:.84rem;color:#50645C;margin:0;max-width:280px}
    @keyframes akematSpin{to{transform:rotate(360deg)}}
    @keyframes akematFadeIn{from{opacity:0}to{opacity:1}}
    `;
    document.head.appendChild(style);
    const el = document.createElement('div');
    el.id = 'akematRedirectOverlay';
    el.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#1F4D3F"/><path d="M24 36c-7-5.5-13-10.8-13-17A8 8 0 0 1 24 13a8 8 0 0 1 13 6c0 6.2-6 11.5-13 17z" fill="#F2A541"/></svg>
      <div class="aro-spin"></div>
      <p class="aro-title">Mengalihkan ke pembayaran aman…</p>
      <p class="aro-sub">Diproses oleh DOKU, mitra payment gateway resmi Akemat Foundation</p>
    `;
    document.body.appendChild(el);
  }
  setTimeout(()=>{ window.location.href = url; }, 700);
}

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
  redirectToPayment(url);
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
  redirectToPayment(url);
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
