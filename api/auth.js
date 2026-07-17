/**
 * Vercel Serverless Function: auth.js
 * URL: /api/auth
 *
 * Gabungan endpoint login, register, reset-password, dan delete-account
 * (dulu 4 file terpisah) jadi satu — paket Hobby Vercel dibatasi maksimal
 * 12 Serverless Functions per deployment, dan proyek ini sempat melebihi
 * batas itu sehingga build gagal diam-diam. Pilih aksi lewat field `action`
 * di body request ('login' | 'register' | 'reset-password' | 'delete-account').
 * Logika tiap aksi TIDAK berubah dari file aslinya, cuma dipindah jadi
 * fungsi terpisah di file yang sama.
 */
const { verifyProof } = require('../lib/otpProof');
const { checkRateLimit, clientIp } = require('../lib/rateLimit');
const { passwordPolicyError } = require('../lib/passwordPolicy');
const { verifyTurnstile } = require('../lib/turnstile');

const SUPABASE_URL      = process.env.SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim();
// SUPABASE_SERVICE_ROLE_KEY = nama yang dipakai integrasi otomatis Vercel⇄Supabase;
// SUPABASE_SERVICE_KEY = nama yang dipakai dokumentasi kita sendiri. Terima dua-duanya.
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

// ── Login: proxy tipis ke endpoint password-grant Supabase Auth, dengan
// rate limiting per email+IP yang tidak bisa dilakukan kalau login dipanggil
// langsung dari browser lewat Supabase JS SDK. ─────────────────────────
async function handleLogin(req, res, body) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(500).json({ error: 'Database belum dikonfigurasi.' });
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi.' });

  const ip = clientIp(req);
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return res.status(400).json({ error: 'Verifikasi keamanan gagal, coba lagi.' });
  }
  const limit = await checkRateLimit(`login:${email}:${ip}`, 8, 15);
  if (!limit.allowed) return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.' });

  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error_description || data?.msg || data?.error || 'Email atau password salah.';
      return res.status(401).json({ error: /invalid/i.test(msg) ? 'Email atau password salah.' : msg });
    }
    return res.status(200).json({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user });
  } catch (err) {
    console.error('[auth:login]', err);
    return res.status(500).json({ error: err.message });
  }
}

// ── Register: butuh aksi admin Supabase Auth (email_confirm:true) supaya
// user langsung bisa login tanpa klik link email — verifikasi identitasnya
// lewat WA OTP (proof), bukan email. ────────────────────────────────────
async function handleRegister(req, res, body) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error:'Set SUPABASE_URL dan SUPABASE_SERVICE_KEY (atau SUPABASE_SERVICE_ROLE_KEY) di Vercel Environment Variables' });
  }
  const { name, email, phone, password, role, proof, bankInfo, np, ktpStatus } = body;
  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({ error:'name, email, phone, password, dan role wajib diisi' });
  }
  if (!['patient','nurse','donor'].includes(role)) {
    return res.status(400).json({ error:'role tidak valid' });
  }
  const pwErr = passwordPolicyError(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const digits = normalizePhone(phone);
  if (!verifyProof(digits, proof)) {
    return res.status(401).json({ error:'Verifikasi OTP tidak valid atau sudah kadaluarsa. Kirim ulang kode OTP.' });
  }

  const regLimit = await checkRateLimit(`register:ip:${clientIp(req)}`, 5, 60);
  if (!regLimit.allowed) {
    return res.status(429).json({ error: 'Terlalu banyak percobaan pendaftaran dari jaringan ini. Coba lagi dalam beberapa saat.' });
  }

  try {
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

    const userRow = {
      id: userId, name, email, phone: digits, role,
      address: body.address || null, organization: body.organization || null,
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
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method:'DELETE', headers: supaHeaders() }).catch(()=>{});
      return res.status(502).json({ error:'Gagal menyimpan profil pengguna', detail });
    }

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
    console.error('[auth:register]', err);
    return res.status(500).json({ error: err.message });
  }
}

// ── Reset password: pakai `proof` (token bertanda tangan dari
// /api/fazpass-otp verify) alih-alih memverifikasi ulang kode OTP mentah —
// sebagian provider OTP menganggap kode sekali pakai. ──────────────────
async function handleResetPassword(req, res, body) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error:'Set SUPABASE_URL dan SUPABASE_SERVICE_KEY (atau SUPABASE_SERVICE_ROLE_KEY) di Vercel Environment Variables' });
  }
  const { phone, proof, newPassword } = body;
  if (!phone || !proof || !newPassword) {
    return res.status(400).json({ error:'phone, proof, dan newPassword wajib diisi' });
  }
  const pwErr = passwordPolicyError(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const digits = normalizePhone(phone);
  if (!verifyProof(digits, proof)) {
    return res.status(401).json({ error:'Verifikasi OTP tidak valid atau sudah kadaluarsa. Kirim ulang kode OTP.' });
  }

  const lookupUrl = `${SUPABASE_URL}/rest/v1/users?select=id,phone&phone=eq.${digits}`;
  const lookupRes = await fetch(lookupUrl, { headers: supaHeaders() });
  const rows = await lookupRes.json().catch(() => []);
  const user = Array.isArray(rows) ? rows[0] : null;
  if (!user) return res.status(404).json({ error:'Nomor HP tidak terdaftar' });

  const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: supaHeaders(),
    body: JSON.stringify({ password: newPassword }),
  });
  if (!adminRes.ok) {
    const detail = await adminRes.json().catch(() => ({}));
    return res.status(502).json({ error: detail?.msg || 'Gagal mengubah password', detail });
  }
  return res.status(200).json({ success: true });
}

// ── Hapus akun (hak untuk dihapus, UU PDP): anonimisasi baris `users`,
// bukan hard-delete — kolom lain (bookings, donations, reviews, payouts)
// mereferensi id ini tanpa cascade dan riwayat transaksinya masih
// dibutuhkan. Akun Supabase Auth-nya dihapus permanen supaya tidak bisa
// login lagi sama sekali. ───────────────────────────────────────────────
async function getAuthUser(req) {
  const auth  = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? u : null;
  } catch { return null; }
}
async function sb(pathAndQuery, method, bodyObj) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers: { ...supaHeaders(), 'Prefer': 'return=representation' },
    body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}
async function handleDeleteAccount(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ error: 'Database belum dikonfigurasi.' });
  const authUser = await getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  const uid = authUser.id;

  try {
    const anonEmail = `deleted-${uid}@akematfoundation.invalid`;
    await sb(`users?id=eq.${uid}`, 'PATCH', {
      name: 'Pengguna Dihapus', email: anonEmail, phone: null, address: null,
      organization: null, dob: null, gender: null,
      ktp_status: 'pending', ktp_url: null,
      bank_name: null, bank_account_number: null, bank_account_name: null, bank_verified: false,
    });
    await sb(`patient_profiles?account_id=eq.${uid}`, 'DELETE');
    await sb(`nurse_profiles?user_id=eq.${uid}`, 'PATCH', { is_available: false, bio: '' }).catch(() => {});
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY },
    }).catch(() => {});
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[auth:delete-account]', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method Not Allowed' });

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  switch (body.action) {
    case 'login':          return handleLogin(req, res, body);
    case 'register':       return handleRegister(req, res, body);
    case 'reset-password': return handleResetPassword(req, res, body);
    case 'delete-account': return handleDeleteAccount(req, res);
    default: return res.status(400).json({ error: 'action tidak valid' });
  }
};
