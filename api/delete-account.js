/**
 * Vercel Serverless Function: delete-account.js
 * URL: /api/delete-account
 *
 * "Hak untuk dihapus" (UU PDP) untuk akun sendiri. Bukan hard-delete baris
 * `users` — kolom lain (bookings, donations, reviews, payouts) mereferensi
 * id ini lewat foreign key TANPA cascade, dan riwayat transaksi itu
 * dibutuhkan pihak lain (mis. perawat tetap butuh riwayat janji temunya)
 * serta kewajiban pencatatan keuangan (sudah disebutkan sebagai
 * pengecualian di Kebijakan Privasi). Jadi datanya DI-ANONIMKAN: semua
 * field identitas & sensitif dikosongkan/diacak, baris tetap ada supaya
 * data transaksi historis tidak rusak, dan akun Supabase Auth-nya dihapus
 * permanen supaya tidak bisa login lagi sama sekali.
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
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method Not Allowed' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Database belum dikonfigurasi.' });

  const authUser = await getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  const uid = authUser.id;

  try {
    // 1) Anonimkan baris profil di tabel `users` — email diacak (tetap unik,
    //    supaya kolom UNIQUE tidak bentrok) supaya tidak bisa dipakai login
    //    ulang / dicari lagi.
    const anonEmail = `deleted-${uid}@akematfoundation.invalid`;
    await sb(`users?id=eq.${uid}`, 'PATCH', {
      name: 'Pengguna Dihapus', email: anonEmail, phone: null, address: null,
      organization: null, dob: null, gender: null,
      ktp_status: 'pending', ktp_url: null,
      bank_name: null, bank_account_number: null, bank_account_name: null, bank_verified: false,
    });

    // 2) Hapus semua profil pasien (KTP anggota keluarga dst.) milik akun ini.
    await sb(`patient_profiles?account_id=eq.${uid}`, 'DELETE');

    // 3) Kalau perawat: matikan dari daftar pencarian (nama/bio publik ikut
    //    diredam) — nurse_name di riwayat booking sudah tersalin terpisah
    //    saat booking dibuat, jadi aman dihapus/dimatikan di sini.
    await sb(`nurse_profiles?user_id=eq.${uid}`, 'PATCH', { is_available: false, bio: '' }).catch(() => {});

    // 4) Hapus akun Supabase Auth-nya secara permanen — titik akhir dari
    //    penghapusan: setelah ini akun tidak bisa dipakai login lagi sama
    //    sekali, dengan atau tanpa password yang benar.
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY },
    }).catch(() => {});

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[delete-account]', err);
    return res.status(500).json({ error: err.message });
  }
};
