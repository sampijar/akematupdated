/**
 * Vercel Serverless Function: db.js
 * Backend API untuk operasi database Supabase
 * URL: /api/db
 *
 * CARA SETUP SUPABASE:
 * 1. Daftar di https://supabase.com (gratis)
 * 2. Buat project baru
 * 3. Buka Settings → API → copy URL dan anon key
 * 4. Di Vercel Dashboard → Project → Settings → Environment Variables, tambahkan:
 *    SUPABASE_URL = https://xxxx.supabase.co
 *    SUPABASE_ANON_KEY = eyJxxx...
 *    SUPABASE_SERVICE_KEY = eyJxxx... (dari Settings → API → service_role)
 * 5. Push ke GitHub → Vercel auto-deploy
 */

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Database belum dikonfigurasi. Set SUPABASE_URL dan SUPABASE_SERVICE_KEY di Vercel Environment Variables.' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const { action, table, data, filters, id } = body;
  const base = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
    'Prefer': 'return=representation',
  };

  try {
    let url = base;
    let method = 'GET';
    let reqBody;

    if (action === 'select') {
      const params = new URLSearchParams(filters || {});
      url = `${base}?${params}`;
      method = 'GET';
    } else if (action === 'insert') {
      method = 'POST';
      reqBody = JSON.stringify(data);
    } else if (action === 'update') {
      url = `${base}?id=eq.${id}`;
      method = 'PATCH';
      reqBody = JSON.stringify(data);
    } else if (action === 'delete') {
      url = `${base}?id=eq.${id}`;
      method = 'DELETE';
    } else if (action === 'upsert') {
      method = 'POST';
      headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
      reqBody = JSON.stringify(data);
    } else {
      return res.status(400).json({ error: `action tidak dikenal: ${action}` });
    }

    const r = await fetch(url, { method, headers, body: reqBody });
    const result = await r.json();

    if (!r.ok) return res.status(r.status).json({ error: result });
    return res.status(200).json({ success: true, data: result });

  } catch (err) {
    console.error('[db]', err);
    return res.status(500).json({ error: err.message });
  }
};
