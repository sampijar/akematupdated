/**
 * Vercel Serverless Function: webauthn.js
 * Login/pendaftaran biometric (WebAuthn/passkey — Face ID, Touch ID,
 * Windows Hello, fingerprint Android) lewat platform authenticator.
 * URL: /api/webauthn
 *
 * Kripto verifikasi (parsing attestation/assertion, cek signature) dilakukan
 * oleh @simplewebauthn/server (open-source, gratis) — SENGAJA tidak
 * direimplementasi manual, karena kesalahan kecil di verifikasi signature
 * WebAuthn adalah celah keamanan login, bukan sekadar bug kosmetik.
 *
 * Aksi (field `action` di body):
 * - 'reg-options' / 'reg-verify' : daftarkan kredensial baru (butuh login —
 *   Authorization: Bearer <access_token>), dipanggil dari halaman Profil.
 * - 'auth-options' / 'auth-verify' : login pakai biometric (TANPA login
 *   dulu — ini caranya login), dipanggil dari halaman Masuk.
 * - 'list' / 'delete' : kelola kredensial yang sudah didaftarkan (butuh login).
 *
 * Alur login biometric TIDAK punya password untuk ditukar ke Supabase Auth,
 * jadi sesi asli diterbitkan lewat admin generate_link (magiclink) yang
 * hasil token-nya langsung "ditukar" sendiri oleh server ini (BUKAN dikirim
 * ke email pengguna) lewat endpoint verify publik — hasil akhirnya
 * access_token/refresh_token asli, identik dengan hasil login password biasa.
 */
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const { issueChallengeToken, verifyChallengeToken } = require('../lib/webauthnChallenge');
const { checkRateLimit, clientIp } = require('../lib/rateLimit');

const SUPABASE_URL      = process.env.SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

const RP_NAME = 'Akemat Foundation';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
function supaHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY };
}
async function sb(pathAndQuery, method, bodyObj) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method, headers: { ...supaHeaders(), 'Prefer': 'return=representation' },
    body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}
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
// RP ID diturunkan dari Host header (tanpa port) di tiap request, BUKAN
// hardcode satu domain — supaya opsi generate & verify selalu pakai RP ID
// yang identik (syarat mutlak WebAuthn), termasuk saat diuji dari
// localhost/preview deployment, bukan cuma domain produksi.
// PENTING: RP ID harus SAMA PERSIS antara saat kredensial didaftarkan dan
// saat dipakai login lagi — kalau tidak, browser bilang "No passkeys
// available" walau kredensialnya sebenarnya ada (WebAuthn menganggapnya
// situs yang beda). Situs ini bisa diakses lewat "akematfoundation.org"
// ATAU "www.akematfoundation.org" — keduanya harus dianggap RP ID yang
// SAMA, jadi awalan "www." selalu dibuang di sini. Ini aman menurut spec
// WebAuthn: RP ID boleh berupa domain induk (root domain) dari origin
// aslinya (www.akematfoundation.org tetap valid pakai RP ID
// akematfoundation.org), tapi TIDAK BOLEH beda-beda tiap request.
function rpIdFromReq(req) {
  let host = String(req.headers.host || 'akematfoundation.org').split(':')[0];
  if (host.startsWith('www.')) host = host.slice(4);
  return host;
}
function originFromReq(req, rpId) {
  return req.headers.origin || `https://${rpId}`;
}

// ── Pendaftaran kredensial baru (butuh login) ─────────────────────────
async function handleRegOptions(req, res) {
  const authUser = await getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });

  const profRes = await sb(`users?id=eq.${authUser.id}&select=email,name`, 'GET');
  const profile = profRes.data?.[0];
  if (!profile) return res.status(404).json({ error: 'Profil tidak ditemukan.' });

  const existing = await sb(`webauthn_credentials?user_id=eq.${authUser.id}&select=credential_id,transports`, 'GET');
  const excludeCredentials = (existing.data || []).map(c => ({ id: c.credential_id, transports: c.transports || undefined }));

  const rpID = rpIdFromReq(req);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: new TextEncoder().encode(authUser.id),
    userName: profile.email,
    userDisplayName: profile.name || profile.email,
    attestationType: 'none',
    excludeCredentials,
    // authenticatorAttachment:'platform' — sengaja dibatasi ke authenticator
    // BAWAAN perangkat (Face ID/Touch ID/Windows Hello/fingerprint), bukan
    // kunci keamanan USB terpisah, sesuai yang diminta ("biometric").
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred', authenticatorAttachment: 'platform' },
  });
  const challengeToken = issueChallengeToken(options.challenge);
  return res.status(200).json({ options, challengeToken });
}

async function handleRegVerify(req, res, body) {
  const authUser = await getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });

  const { challengeToken, credential, deviceName } = body;
  const challenge = verifyChallengeToken(challengeToken);
  if (!challenge) return res.status(400).json({ error: 'Sesi pendaftaran biometric sudah kedaluwarsa, coba lagi.' });
  if (!credential) return res.status(400).json({ error: 'Data kredensial tidak lengkap.' });

  const rpID = rpIdFromReq(req);
  const origin = originFromReq(req, rpID);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: credential, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID,
    });
  } catch (err) {
    return res.status(400).json({ error: 'Verifikasi biometric gagal: ' + err.message });
  }
  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: 'Verifikasi biometric gagal.' });
  }

  const cred = verification.registrationInfo.credential;
  const row = {
    user_id: authUser.id,
    credential_id: cred.id,
    public_key: Buffer.from(cred.publicKey).toString('base64'),
    counter: cred.counter,
    transports: credential.response?.transports || [],
    device_name: (deviceName || 'Perangkat tidak dikenal').slice(0, 80),
  };
  const ins = await sb('webauthn_credentials', 'POST', row);
  if (!ins.ok) {
    const msg = ins.data?.message || ins.data?.details || '';
    if (/duplicate|unique/i.test(String(msg))) return res.status(409).json({ error: 'Kredensial ini sudah terdaftar.' });
    return res.status(502).json({ error: 'Gagal menyimpan kredensial biometric.', detail: ins.data });
  }
  return res.status(200).json({ success: true, credential: ins.data?.[0] });
}

// ── Login biometric (TANPA sesi — ini caranya login) ──────────────────
async function handleAuthOptions(req, res) {
  const rpID = rpIdFromReq(req);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    // allowCredentials sengaja dikosongkan → alur "discoverable credential"
    // (usernameless): browser sendiri yang menampilkan daftar passkey
    // tersimpan untuk situs ini, pengguna tidak perlu ketik email dulu.
  });
  const challengeToken = issueChallengeToken(options.challenge);
  return res.status(200).json({ options, challengeToken });
}

async function issueSessionForEmail(email) {
  const genRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST', headers: supaHeaders(),
    body: JSON.stringify({ type: 'magiclink', email }),
  });
  const genData = await genRes.json().catch(() => ({}));
  if (!genRes.ok) throw new Error(genData?.msg || genData?.message || 'Gagal membuat token sesi');
  const tokenHash = genData?.properties?.hashed_token || genData?.hashed_token;
  if (!tokenHash) throw new Error('Token sesi tidak ditemukan pada respons Supabase');

  // Token dari generate_link di atas TIDAK PERNAH dikirim ke email
  // pengguna — server ini langsung "menukarnya" sendiri lewat endpoint
  // verify publik supaya hasil akhirnya access_token/refresh_token asli,
  // sama seperti hasil login password biasa (lihat SupabaseAuth.signIn di
  // js/api.js, yang tidak perlu tahu bedanya sama sekali).
  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ type: 'magiclink', token_hash: tokenHash }),
  });
  const verifyData = await verifyRes.json().catch(() => ({}));
  if (!verifyRes.ok) throw new Error(verifyData?.msg || verifyData?.error_description || 'Gagal menukar token sesi');
  return verifyData;
}

async function handleAuthVerify(req, res, body) {
  const ip = clientIp(req);
  const limit = await checkRateLimit(`webauthn-auth:${ip}`, 15, 15);
  if (!limit.allowed) return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.' });

  const { challengeToken, credential } = body;
  const challenge = verifyChallengeToken(challengeToken);
  if (!challenge) return res.status(400).json({ error: 'Sesi login biometric sudah kedaluwarsa, coba lagi.' });
  if (!credential?.id) return res.status(400).json({ error: 'Kredensial biometric tidak valid.' });

  const credRes = await sb(`webauthn_credentials?credential_id=eq.${encodeURIComponent(credential.id)}&select=*`, 'GET');
  const stored = credRes.data?.[0];
  if (!stored) return res.status(401).json({ error: 'Biometric ini belum terdaftar di Akemat. Masuk pakai email/password dulu, lalu aktifkan biometric di halaman Profil.' });

  const rpID = rpIdFromReq(req);
  const origin = originFromReq(req, rpID);
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: credential, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID,
      credential: {
        id: stored.credential_id,
        publicKey: Buffer.from(stored.public_key, 'base64'),
        counter: Number(stored.counter),
        transports: stored.transports || undefined,
      },
    });
  } catch (err) {
    return res.status(400).json({ error: 'Verifikasi biometric gagal: ' + err.message });
  }
  if (!verification.verified) return res.status(401).json({ error: 'Verifikasi biometric gagal.' });

  // Naikkan counter (pencegah replay attack — signature lama tidak bisa
  // dipakai ulang) & catat kapan terakhir dipakai, best-effort.
  sb(`webauthn_credentials?id=eq.${stored.id}`, 'PATCH', {
    counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString(),
  }).catch(() => {});

  const userRes = await sb(`users?id=eq.${stored.user_id}&select=id,email`, 'GET');
  const user = userRes.data?.[0];
  if (!user) return res.status(404).json({ error: 'Akun tidak ditemukan.' });

  try {
    const session = await issueSessionForEmail(user.email);
    return res.status(200).json({ access_token: session.access_token, refresh_token: session.refresh_token, user: session.user });
  } catch (err) {
    return res.status(502).json({ error: 'Verifikasi biometric berhasil, tapi gagal membuat sesi: ' + err.message });
  }
}

// ── Kelola kredensial terdaftar (butuh login) ──────────────────────────
async function handleList(req, res) {
  const authUser = await getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  const r = await sb(`webauthn_credentials?user_id=eq.${authUser.id}&select=id,device_name,created_at,last_used_at&order=created_at.desc`, 'GET');
  // PENTING: kalau query gagal (mis. tabel webauthn_credentials belum
  // dibuat karena db-schema.sql belum dijalankan ulang di Supabase), r.data
  // berisi OBJEK error dari PostgREST, bukan array — kalau ini lolos ke
  // klien sebagai "data", biometricSection() di profile.js akan crash
  // (credentials.map bukan fungsi) dan bikin SELURUH halaman Profil gagal
  // render sama sekali. Wajib cek r.ok dulu, balikin list kosong kalau gagal.
  if (!r.ok) return res.status(200).json({ success: true, data: [] });
  return res.status(200).json({ success: true, data: Array.isArray(r.data) ? r.data : [] });
}

async function handleDelete(req, res, body) {
  const authUser = await getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
  const id = body.id;
  if (!id) return res.status(400).json({ error: 'id wajib diisi' });
  const del = await sb(`webauthn_credentials?id=eq.${id}&user_id=eq.${authUser.id}`, 'DELETE');
  if (!del.ok) return res.status(502).json({ error: 'Gagal menghapus kredensial.', detail: del.data });
  return res.status(200).json({ success: true });
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Database belum dikonfigurasi (SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_KEY).' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  try {
    switch (body.action) {
      case 'reg-options':  return await handleRegOptions(req, res);
      case 'reg-verify':   return await handleRegVerify(req, res, body);
      case 'auth-options': return await handleAuthOptions(req, res);
      case 'auth-verify':  return await handleAuthVerify(req, res, body);
      case 'list':          return await handleList(req, res);
      case 'delete':        return await handleDelete(req, res, body);
      default: return res.status(400).json({ error: 'action tidak dikenal' });
    }
  } catch (err) {
    console.error('[webauthn]', err);
    return res.status(500).json({ error: err.message });
  }
};
