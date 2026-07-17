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
const { sendPushToUser } = require('../lib/webPush');
const { sendEmail, emailLayout, escapeHtml } = require('../lib/email');

const CLIENT_ID   = process.env.DOKU_CLIENT_ID?.trim();
const SECRET_KEY  = process.env.DOKU_SECRET_KEY?.trim();
const ENV         = process.env.DOKU_ENV?.trim() || 'sandbox';
const BASE        = ENV === 'production' ? 'https://api.doku.com' : 'https://api-sandbox.doku.com';

// Dipakai action:'confirm' buat mengkreditkan donasi/booking LANGSUNG di sini
// (bukan lewat api/db.js) setelah verifikasi ulang ke DOKU — supaya status
// "paid" tidak pernah bisa dipalsukan dari klien (lihat catatan keamanan di
// api/db.js, yang sekarang menolak semua tulis payment_status).
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SERVICE_KEY  = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
const FEE_DONATION = 0.05;

async function sb(pathAndQuery, method, bodyObj) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Prefer': 'return=representation',
    },
    body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

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

  // action:'confirm' — SATU-SATUNYA cara payment_status boleh menjadi "paid".
  // Verifikasi ulang LANGSUNG ke DOKU pakai referenceId (bukan percaya klaim
  // klien), lalu kreditkan donasi/booking pakai amount asli dari respons
  // DOKU (bukan amount yang dikirim klien). Idempoten: aman dipanggil ulang.
  if (p.action === 'confirm') {
    const { type, referenceId, campaignId, donorId, donorName, anonymous, bookingId } = p;
    if (!type || !referenceId) return res.status(400).json({ error: 'type dan referenceId wajib' });
    if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Database belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_KEY).' });

    let result;
    try { result = await dokuGet(STATUS_PATH_PREFIX + encodeURIComponent(referenceId)); }
    catch (err) { return res.status(502).json({ error: 'Gagal menghubungi DOKU: ' + err.message }); }
    if (!result.ok) return res.status(502).json({ error: result.data?.response_message || 'Gagal cek status', detail: result.data });

    const d           = result.data;
    const txStatus     = String(d?.transaction?.status || d?.order?.status || '').toUpperCase();
    const orderAmount  = Number(d?.order?.amount) || 0;
    const isPaid        = ['SUCCESS', 'PAID', 'COMPLETED'].includes(txStatus);

    if (!isPaid) return res.status(200).json({ success: true, paid: false, status: txStatus || 'UNKNOWN' });

    if (type === 'booking') {
      if (!bookingId) return res.status(400).json({ error: 'bookingId wajib untuk konfirmasi booking' });
      const upd = await sb(`bookings?id=eq.${encodeURIComponent(bookingId)}&payment_status=eq.unpaid`, 'PATCH', {
        payment_status: 'paid', reference_id: referenceId,
      });
      if (!upd.ok) return res.status(502).json({ error: 'Gagal mengkreditkan booking', detail: upd.data });
      return res.status(200).json({ success: true, paid: true, amount: orderAmount });
    }

    if (type === 'donation') {
      if (!campaignId) return res.status(400).json({ error: 'campaignId wajib untuk konfirmasi donasi' });
      const existing = await sb(`donations?reference_id=eq.${encodeURIComponent(referenceId)}&select=id&limit=1`, 'GET');
      if (existing.data?.[0]) return res.status(200).json({ success: true, paid: true, amount: orderAmount, alreadyCredited: true });

      const amount      = orderAmount;
      const platformFee = Math.round(amount * FEE_DONATION);
      const netAmount    = amount - platformFee;
      const ins = await sb('donations', 'POST', {
        campaign_id: campaignId,
        donor_id: donorId && donorId !== 'guest' ? donorId : null,
        donor_name: donorName || 'Donatur',
        amount, platform_fee: platformFee, net_amount: netAmount,
        is_anonymous: !!anonymous, reference_id: referenceId, payment_status: 'paid',
      });
      if (!ins.ok) return res.status(502).json({ error: 'Gagal mencatat donasi', detail: ins.data });
      await sb('rpc/increment_campaign', 'POST', { p_campaign_id: campaignId, p_amount: amount }).catch(() => {});
      sb(`campaigns?id=eq.${encodeURIComponent(campaignId)}&select=title,created_by`, 'GET').then((camRes) => {
        const cam = camRes.data?.[0];
        if (cam?.created_by) {
          sendPushToUser(cam.created_by, {
            title: 'Donasi baru masuk 💚',
            body: (anonymous ? 'Seseorang' : (donorName || 'Donatur')) + ' menyumbang '+'Rp'+amount.toLocaleString('id-ID')+' untuk "'+(cam.title||'campaign Anda')+'".',
            url: '/#donasi/' + campaignId,
          });
        }
        // Tanda terima donasi — email diambil dari respons status DOKU sendiri
        // (d.customer.email, bagian dari order asli yang diverifikasi di atas),
        // BUKAN dari klaim klien, konsisten dengan prinsip file ini.
        const donorEmail = d?.customer?.email;
        if (donorEmail) {
          sendEmail({
            to: donorEmail,
            subject: 'Tanda Terima Donasi — Akemat Foundation',
            html: emailLayout(`
              <h2 style="color:#1F4D3F;margin:0 0 12px">Terima kasih atas donasi Anda 💚</h2>
              <p>Donasi Anda telah kami terima dan sudah diteruskan ke campaign <strong>${escapeHtml(cam?.title || 'campaign Akemat Foundation')}</strong>.</p>
              <table style="width:100%;font-size:.86rem;margin:16px 0;border-collapse:collapse">
                <tr><td style="padding:6px 0;color:#50645C">No. Referensi</td><td style="text-align:right;font-weight:700">${escapeHtml(referenceId)}</td></tr>
                <tr><td style="padding:6px 0;color:#50645C">Jumlah</td><td style="text-align:right;font-weight:700">Rp${amount.toLocaleString('id-ID')}</td></tr>
                <tr><td style="padding:6px 0;color:#50645C">Tanggal</td><td style="text-align:right">${escapeHtml(new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }))}</td></tr>
              </table>
              <p style="font-size:.8rem;color:#50645C">Simpan email ini sebagai bukti transaksi. Donasi Anda membantu keluarga yang membutuhkan layanan perawatan di rumah.</p>
            `),
          }).catch(() => {});
        }
      }).catch(() => {});
      return res.status(200).json({ success: true, paid: true, amount });
    }

    return res.status(400).json({ error: 'type tidak dikenal (harus "donation" atau "booking")' });
  }

  return res.status(400).json({ error: `action tidak dikenal: ${p.action}` });
};
