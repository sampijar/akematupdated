/**
 * Vercel Serverless Function: push-subscribe.js
 * URL: /api/push-subscribe
 *
 * Simpan/hapus langganan push notification milik akun yang sedang login.
 * Isi subscription (endpoint + keys) datang dari
 * PushManager.subscribe() di browser — tidak berisi apa pun yang bisa
 * disalahgunakan kalau bocor (cuma alamat buat browser push service),
 * tapi tetap diikat ke akun yang login supaya tidak bisa didaftarkan
 * atas nama pengguna lain.
 */
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SERVICE_KEY  = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function getAuthUser(req) {
  const auth  = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? u : null;
  } catch { return null; }
}

async function sb(pathAndQuery, method, bodyObj, extraHeaders) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Prefer': 'return=representation',
      ...(extraHeaders || {}),
    },
    body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method Not Allowed' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Database belum dikonfigurasi.' });

  const authUser = await getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const { action, subscription } = body;

  try {
    if (action === 'subscribe') {
      const endpoint = subscription?.endpoint;
      const p256dh = subscription?.keys?.p256dh;
      const auth   = subscription?.keys?.auth;
      if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: 'Data langganan tidak lengkap.' });
      const r = await sb('push_subscriptions', 'POST',
        { user_id: authUser.id, endpoint, p256dh, auth },
        { Prefer: 'resolution=merge-duplicates,return=representation' });
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true } : { error: r.data });
    }
    if (action === 'unsubscribe') {
      const endpoint = subscription?.endpoint;
      if (!endpoint) return res.status(400).json({ error: 'endpoint wajib diisi.' });
      const r = await sb(`push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}&user_id=eq.${authUser.id}`, 'DELETE');
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true } : { error: r.data });
    }
    return res.status(400).json({ error: `action tidak dikenal: ${action}` });
  } catch (err) {
    console.error('[push-subscribe]', err);
    return res.status(500).json({ error: err.message });
  }
};
