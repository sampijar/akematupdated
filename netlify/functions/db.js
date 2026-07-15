/**
 * Netlify Function: db.js
 * Backend API untuk operasi database Supabase
 * URL: /.netlify/functions/db
 *
 * CARA SETUP SUPABASE:
 * 1. Daftar di https://supabase.com (gratis)
 * 2. Buat project baru
 * 3. Buka Settings → API → copy URL dan anon key
 * 4. Di Netlify Dashboard → Environment Variables, tambahkan:
 *    SUPABASE_URL = https://xxxx.supabase.co
 *    SUPABASE_ANON_KEY = eyJxxx...
 *    SUPABASE_SERVICE_KEY = eyJxxx... (dari Settings → API → service_role)
 * 5. Push file ini ke GitHub → Netlify auto-deploy
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const resp = (s, b) => ({
  statusCode: s,
  headers: { ...CORS, 'Content-Type': 'application/json' },
  body: JSON.stringify(b),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return resp(500, { error: 'Database belum dikonfigurasi. Set SUPABASE_URL dan SUPABASE_SERVICE_KEY di Netlify Environment Variables.' });
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

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
      return resp(400, { error: `action tidak dikenal: ${action}` });
    }

    const r = await fetch(url, { method, headers, body: reqBody });
    const result = await r.json();

    if (!r.ok) return resp(r.status, { error: result });
    return resp(200, { success: true, data: result });

  } catch (err) {
    console.error('[db]', err);
    return resp(500, { error: err.message });
  }
};
