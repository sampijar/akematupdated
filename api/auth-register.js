/**
 * Vercel Serverless Function: auth-register.js
 * URL: /api/auth-register
 *
 * Registrasi lewat Supabase Auth butuh aksi admin (buat user dengan
 * email_confirm:true, supaya user bisa langsung login tanpa perlu klik link
 * konfirmasi email — verifikasi identitasnya sudah dilakukan lewat WA OTP,
 * bukan email) — ini tidak bisa dilakukan client SDK, harus pakai
 * SUPABASE_SERVICE_KEY server-side.
 *
 * proof (dari respons /api/fazpass-otp verify) wajib disertakan dan cocok
 * dengan nomor HP yang didaftarkan, supaya endpoint ini tidak bisa dipanggil
 * langsung tanpa OTP asli.
 */
const { verifyProof } = require('../lib/otpProof');
const { checkRateLimit, clientIp } = require('../lib/rateLimit');

// SUPABASE_SERVICE_ROLE_KEY = nama yang dipakai integrasi otomatis Vercel⇄Supabase;
// SUPABASE_SERVICE_KEY = nama yang dipakai dokumentasi kita sendiri. Terima dua-duanya.
const SUPABASE_URL         = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normalizePhone(raw) {
  let p = String(raw||'').replace(/\D/g,'');
  if (p.startsWith('0'))      p = '62' + p.slice(1);
  else if (p.startsWith('8')) p = '62' + p;
  return p;
}

function supaHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'apikey': SUPABASE_SERVICE_KEY,
  };
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error:'Method Not Allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error:'Set SUPABASE_URL dan SUPABASE_SERVICE_KEY (atau SUPABASE_SERVICE_ROLE_KEY) di Vercel Environment Variables' });
  }

  const p = typeof req.body === 'object' && req.body ? req.body : {};
  const { name, email, phone, password, role, proof, bankInfo, np, ktpStatus } = p;
  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({ error:'name, email, phone, password, dan role wajib diisi' });
  }
  if (!['patient','nurse','donor'].includes(role)) {
    return res.status(400).json({ error:'role tidak valid' });
  }

  const digits = normalizePhone(phone);
  if (!verifyProof(digits, proof)) {
    return res.status(401).json({ error:'Verifikasi OTP tidak valid atau sudah kadaluarsa. Kirim ulang kode OTP.' });
  }

  // Batasi pendaftaran akun baru per IP — mencegah bot bikin akun massal
  // (OTP WA sudah jadi penghalang utama, ini lapisan tambahan).
  const regLimit = await checkRateLimit(`register:ip:${clientIp(req)}`, 5, 60);
  if (!regLimit.allowed) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan pendaftaran dari jaringan ini. Coba lagi dalam beberapa saat.' });
  }

  try {
    // 1) Buat user di Supabase Auth (admin, pre-confirmed)
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: supaHeaders(),
      body: JSON.stringify({ email, password, phone: digits, email_confirm: true }),
    });
    const authData = await authRes.json().catch(() => ({}));
    if (!authRes.ok) {
      const msg = authData?.msg || authData?.message || 'Gagal membuat akun';
      return res.status(authRes.status === 422 ? 409 : 502).json({ error: msg.includes('already') ? 'Email sudah terdaftar.' : msg });
    }
    const userId = authData.id;

    // 2) Insert baris profil ke tabel `users`
    const userRow = {
      id: userId, name, email, phone: digits, role,
      address: p.address || null, organization: p.organization || null,
      ktp_status: ktpStatus || 'pending',
      bank_name: bankInfo?.bankName || null,
      bank_account_number: bankInfo?.accountNumber || null,
      bank_account_name: bankInfo?.accountName || null,
      bank_verified: false,
    };
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=representation' },
      body: JSON.stringify(userRow),
    });
    if (!profileRes.ok) {
      const detail = await profileRes.json().catch(() => ({}));
      // Rollback auth user supaya tidak ada akun "setengah jadi"
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method:'DELETE', headers: supaHeaders() }).catch(()=>{});
      return res.status(502).json({ error:'Gagal menyimpan profil pengguna', detail });
    }

    // 3) Kalau nurse, insert baris nurse_profiles juga
    if (role === 'nurse' && np) {
      const npRow = {
        user_id: userId, specialty: np.specialty, education: np.education,
        experience: np.exp || 0, price_per_hour: np.price || 100000,
        city: np.loc, bio: np.bio || '', schedule: np.schedule || [], services: np.services || [],
        is_available: true, is_verified: false,
      };
      const npRes = await fetch(`${SUPABASE_URL}/rest/v1/nurse_profiles`, {
        method: 'POST', headers: { ...supaHeaders(), Prefer: 'return=representation' },
        body: JSON.stringify(npRow),
      });
      if (!npRes.ok) {
        const detail = await npRes.json().catch(() => ({}));
        return res.status(502).json({ error:'Gagal menyimpan profil perawat', detail });
      }
    }

    return res.status(200).json({ success: true, userId });
  } catch (err) {
    console.error('[auth-register]', err);
    return res.status(500).json({ error: err.message });
  }
};
