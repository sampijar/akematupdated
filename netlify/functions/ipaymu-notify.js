/**
 * Netlify Function: ipaymu-notify.js
 * Webhook dari iPaymu setelah pembayaran berhasil/gagal
 * URL: /.netlify/functions/ipaymu-notify
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body = {};
  try {
    const ct = event.headers['content-type'] || '';
    body = ct.includes('application/json')
      ? JSON.parse(event.body)
      : Object.fromEntries(new URLSearchParams(event.body));
  } catch(e) { console.error('[notify] parse error', e); }

  const s       = (v) => String(v ?? '').trim();
  const trxId   = s(body.trx_id   || body.TransactionId);
  const status  = s(body.status   || body.Status);
  const amount  = s(body.amount   || body.Amount);
  const refId   = s(body.reference_id || body.ReferenceId);
  const via     = s(body.via     || body.Via);
  const buyer   = s(body.buyer_name || body.BuyerName);

  const isPaid = ['berhasil','success','1'].includes(status.toLowerCase());
  console.log(`[notify] trxId=${trxId} status=${status} amount=${amount} ref=${refId} via=${via} buyer=${buyer} paid=${isPaid}`);

  if (isPaid) {
    // TODO: update database booking/donation status
    // Contoh integrasi Supabase:
    // const { createClient } = require('@supabase/supabase-js');
    // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    // await supabase.from('transactions').update({status:'paid'}).eq('reference_id', refId);
    //
    // Atau kirim notif WA via WA Business API / Fonnte
    console.log(`[notify] ✅ PAID Rp ${amount} | trxId=${trxId} | ref=${refId}`);
  }

  // WAJIB return 200 agar iPaymu tidak retry
  return { statusCode: 200, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ received: true }) };
};
