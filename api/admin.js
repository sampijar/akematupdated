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
 *
 * 2FA: selain email+password (Supabase Auth), setiap aksi di sini WAJIB
 * menyertakan bukti OTP WhatsApp yang masih berlaku (adminOtpProof),
 * terikat ke nomor HP akun admin itu SENDIRI (diambil dari database,
 * bukan dipercaya dari klien). Proof-nya didapat lewat alur OTP yang
 * sudah ada di /api/fazpass-otp (action:'send' lalu 'verify') — tidak
 * ada integrasi OTP baru, cuma dipakai ulang & diwajibkan khusus untuk
 * akses Panel Admin, supaya akun admin (yang bisa lihat semua KTP & data
 * rekening) tidak cukup dibobol lewat password saja.
 */
const { verifyProof } = require('../lib/otpProof');

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

// Jejak audit — dipanggil best-effort (tidak menunda/menggagalkan respons
// utama) setiap admin berhasil melakukan aksi yang mengubah data sensitif.
function logAdmin(adminEmail, action, table, targetId) {
  sb('admin_audit_log', 'POST', { admin_email: adminEmail, action, target_table: table, target_id: targetId ? String(targetId) : null }).catch(() => {});
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Database belum dikonfigurasi.' });
  if (!ADMIN_EMAILS.length) return res.status(500).json({ error: 'ADMIN_EMAILS belum diset di Vercel Environment Variables.' });

  const authUser = await getAuthUser(req);
  const email = authUser?.email?.toLowerCase();
  if (!email) {
    return res.status(403).json({ error: 'Sesi login tidak terdeteksi. Silakan logout lalu login lagi.' });
  }
  if (!ADMIN_EMAILS.includes(email)) {
    // Sertakan email yang terdeteksi (milik akun yang sedang login sendiri, jadi
    // aman ditampilkan) supaya gampang dicocokkan dengan ADMIN_EMAILS di Vercel.
    return res.status(403).json({ error: `Akun ini (${email}) tidak punya akses admin.` });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const { action, id, data } = body;

  // 2FA — wajib untuk SEMUA aksi di endpoint ini, tanpa kecuali.
  const meRes = await sb(`users?id=eq.${authUser.id}&select=phone`, 'GET');
  const adminPhone = meRes.data?.[0]?.phone;
  if (!adminPhone) {
    return res.status(400).json({ error: 'Akun admin ini belum punya nomor HP terdaftar, jadi verifikasi 2FA tidak bisa dilakukan. Isi nomor HP di halaman Profil dulu.' });
  }
  if (!verifyProof(adminPhone, body.adminOtpProof)) {
    return res.status(401).json({ error: 'Verifikasi OTP diperlukan untuk mengakses Panel Admin.', code: 'OTP_REQUIRED' });
  }

  try {
    if (action === 'listPendingKtp') {
      const r = await sb('users?ktp_status=eq.uploaded&select=id,name,email,phone,ktp_url,created_at&order=created_at.asc', 'GET');
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'approveKtp') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`users?id=eq.${encodeURIComponent(id)}`, 'PATCH', { ktp_status: 'verified' });
      if (r.ok) logAdmin(email, 'approveKtp', 'users', id);
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'rejectKtp') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`users?id=eq.${encodeURIComponent(id)}`, 'PATCH', { ktp_status: 'rejected' });
      if (r.ok) logAdmin(email, 'rejectKtp', 'users', id);
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }

    if (action === 'listPendingPatientKtp') {
      const r = await sb('patient_profiles?ktp_status=eq.uploaded&select=id,name,relationship,account_id,ktp_url,created_at&order=created_at.asc', 'GET');
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'approvePatientKtp') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`patient_profiles?id=eq.${encodeURIComponent(id)}`, 'PATCH', { ktp_status: 'verified' });
      if (r.ok) logAdmin(email, 'approvePatientKtp', 'patient_profiles', id);
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'rejectPatientKtp') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`patient_profiles?id=eq.${encodeURIComponent(id)}`, 'PATCH', { ktp_status: 'rejected' });
      if (r.ok) logAdmin(email, 'rejectPatientKtp', 'patient_profiles', id);
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }

    if (action === 'listPendingCampaigns') {
      const r = await sb('campaigns?is_verified=eq.false&select=id,title,creator_name,category,target,bank_name,bank_account_name,bank_account_number,bank_verified,created_at&order=created_at.asc', 'GET');
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'approveCampaign') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`campaigns?id=eq.${encodeURIComponent(id)}`, 'PATCH', { is_verified: true, bank_verified: true });
      if (r.ok) logAdmin(email, 'approveCampaign', 'campaigns', id);
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'deleteCampaign') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`campaigns?id=eq.${encodeURIComponent(id)}`, 'DELETE');
      if (r.ok) logAdmin(email, 'deleteCampaign', 'campaigns', id);
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true } : { error: r.data });
    }

    // ── Kode promo ────────────────────────────────────────
    if (action === 'listPromoCodes') {
      const r = await sb('promo_codes?select=*&order=created_at.desc', 'GET');
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'createPromoCode') {
      const code = String(data?.code || '').trim().toUpperCase();
      const discountType = data?.discountType === 'fixed' ? 'fixed' : 'percent';
      const discountValue = Number(data?.discountValue);
      if (!code) return res.status(400).json({ error: 'Kode wajib diisi.' });
      if (!(discountValue > 0)) return res.status(400).json({ error: 'Nilai diskon harus lebih dari 0.' });
      const row = {
        code,
        discount_type: discountType,
        discount_value: discountValue,
        max_discount: data?.maxDiscount != null && data.maxDiscount !== '' ? Number(data.maxDiscount) : null,
        min_amount: data?.minAmount != null && data.minAmount !== '' ? Number(data.minAmount) : 0,
        max_uses: data?.maxUses != null && data.maxUses !== '' ? Number(data.maxUses) : null,
        active: data?.active !== false,
        valid_from: data?.validFrom || null,
        valid_until: data?.validUntil || null,
        applies_to: ['booking','donation','all'].includes(data?.appliesTo) ? data.appliesTo : 'booking',
      };
      const r = await sb('promo_codes', 'POST', row);
      if (!r.ok && String(r.data?.message || r.data).includes('duplicate')) {
        return res.status(409).json({ error: 'Kode promo ini sudah ada.' });
      }
      if (r.ok) logAdmin(email, 'createPromoCode', 'promo_codes', r.data?.[0]?.id);
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'togglePromoCode') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`promo_codes?id=eq.${encodeURIComponent(id)}`, 'PATCH', { active: !!data?.active });
      if (r.ok) logAdmin(email, data?.active ? 'activatePromoCode' : 'deactivatePromoCode', 'promo_codes', id);
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }
    if (action === 'deletePromoCode') {
      if (!id) return res.status(400).json({ error: 'id wajib' });
      const r = await sb(`promo_codes?id=eq.${encodeURIComponent(id)}`, 'DELETE');
      if (r.ok) logAdmin(email, 'deletePromoCode', 'promo_codes', id);
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true } : { error: r.data });
    }

    // ── Log audit ──────────────────────────────────────────
    if (action === 'listAuditLog') {
      const r = await sb('admin_audit_log?select=*&order=created_at.desc&limit=50', 'GET');
      return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
    }

    return res.status(400).json({ error: `action tidak dikenal: ${action}` });
  } catch (err) {
    console.error('[admin]', err);
    return res.status(500).json({ error: err.message });
  }
};
