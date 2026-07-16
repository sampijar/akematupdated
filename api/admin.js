/**
 * Vercel Serverless Function: admin.js
 * Panel review manual untuk verifikasi KTP & campaign — HANYA bisa diakses
 * akun yang emailnya terdaftar di env var ADMIN_EMAILS.
 * URL: /api/admin
 *
 * Ini sengaja terpisah total dari api/db.js (yang menolak keras field
 * sensitif seperti ktp_status/is_verified dari klien biasa) — endpoint ini
 * satu-satunya jalan sah untuk mengubah status verifikasi, dan aksesnya
 * dibatasi lewat allowlist email, bukan lewat kolom "role" di tabel users
 * (supaya tidak ada cara bagi pengguna biasa untuk menaikkan hak akses
 * sendiri lewat data yang bisa mereka tulis).
 *
 * CARA SETUP:
 * Di Vercel Dashboard → Project → Settings → Environment Variables:
 *   ADMIN_EMAILS = email1@akematfoundation.org,email2@akematfoundation.org
 * (harus sama persis dengan email akun yang dipakai login di app)
 */

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SERVICE_KEY  = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

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
    return await r.json();
  } catch { return null; }
}

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

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Database belum dikonfigurasi.' });
  if (!ADMIN_EMAILS.length) return res.status(500).json({ error: 'ADMIN_EMAILS belum diset di Vercel Environment Variables.' });

  const authUser = await getAuthUser(req);
  const email = authUser?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ error: 'Akun ini tidak punya akses admin.' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const { action, id } = body;

  try {
    if (action === 'listPendingKtp') {
      const r = await sb('users?ktp_status=eq.uploaded&select=id,name,email,phone,ktp_url,created_at&order=created_at.asc', 'GET');
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'approveKtp') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`users?id=eq.${encodeURIComponent(id)}`, 'PATCH', { ktp_status: 'verified' });
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'rejectKtp') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`users?id=eq.${encodeURIComponent(id)}`, 'PATCH', { ktp_status: 'pending' });
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }

    if (action === 'listPendingPatientKtp') {
      const r = await sb('patient_profiles?ktp_status=eq.uploaded&select=id,name,relationship,account_id,ktp_url,created_at&order=created_at.asc', 'GET');
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'approvePatientKtp') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`patient_profiles?id=eq.${encodeURIComponent(id)}`, 'PATCH', { ktp_status: 'verified' });
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'rejectPatientKtp') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`patient_profiles?id=eq.${encodeURIComponent(id)}`, 'PATCH', { ktp_status: 'pending' });
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }

    if (action === 'listPendingCampaigns') {
      const r = await sb('campaigns?is_verified=eq.false&select=id,title,creator_name,category,target,bank_name,bank_account_name,bank_account_number,bank_verified,created_at&order=created_at.asc', 'GET');
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'approveCampaign') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`campaigns?id=eq.${encodeURIComponent(id)}`, 'PATCH', { is_verified: true, bank_verified: true });
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'deleteCampaign') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`campaigns?id=eq.${encodeURIComponent(id)}`, 'DELETE');
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true } : { error: r.data });
    }

    return res.status(400).json({ error: `action tidak dikenal: ${action}` });
  } catch (err) {
    console.error('[admin]', err);
    return res.status(500).json({ error: err.message });
  }
};
