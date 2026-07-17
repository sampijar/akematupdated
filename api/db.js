/**
 * Vercel Serverless Function: db.js
 * Backend API untuk operasi database Supabase
 * URL: /api/db
 *
 * KEAMANAN — PENTING:
 * Endpoint ini dulunya proxy generik TANPA otentikasi ke Supabase pakai
 * service role key (yang melewati Row Level Security sepenuhnya) — siapa pun
 * yang tahu bentuk request-nya bisa baca/ubah/hapus SELURUH data (KTP,
 * rekening bank, status pembayaran "paid", role akun) tanpa login sama
 * sekali. Sekarang setiap request WAJIB menyertakan token sesi Supabase Auth
 * (header Authorization: Bearer <access_token>, dikirim otomatis oleh
 * js/api.js), dan setiap tabel punya aturan eksplisit di bawah: kolom
 * sensitif (role, ktp_status, bank_verified, is_verified, payment_status,
 * dst.) TIDAK PERNAH dipercaya dari input klien, dan filter kepemilikan
 * baris (mis. "cuma boleh update booking milik sendiri") dipaksa dari sisi
 * server, bukan dari filters yang dikirim klien.
 *
 * Status pembayaran "paid" TIDAK BISA diset lewat endpoint ini sama sekali —
 * itu cuma boleh terjadi lewat api/doku-payment.js action:'confirm', yang
 * memverifikasi ulang langsung ke DOKU sebelum mengkreditkan apa pun.
 *
 * CARA SETUP SUPABASE:
 * 1. Daftar di https://supabase.com (gratis)
 * 2. Buat project baru
 * 3. Buka Settings → API → copy URL, anon key, dan service_role key
 * 4. Di Vercel Dashboard → Project → Settings → Environment Variables, tambahkan:
 *    SUPABASE_URL = https://xxxx.supabase.co
 *    SUPABASE_ANON_KEY = eyJxxx...
 *    SUPABASE_SERVICE_KEY = eyJxxx... (dari Settings → API → service_role)
 * 5. Push ke GitHub → Vercel auto-deploy
 */

const { sendPushToUser } = require('../lib/webPush');

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SERVICE_KEY  = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Verifikasi token sesi Supabase Auth yang dikirim klien. Balik null kalau
// tidak ada/tidak valid — dipakai sebagai "anonymous", BUKAN error, karena
// beberapa aksi (baca data publik, donasi tamu) memang boleh tanpa login.
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

async function sbRequest(pathAndQuery, method, bodyObj, extraHeaders) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
    'Prefer': 'return=representation',
    ...(extraHeaders || {}),
  };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method, headers, body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

// Dipakai oleh table:'promo_codes' action:'preview' di bawah (pratinjau
// read-only sebelum booking dibuat) — TIDAK dipakai untuk booking sungguhan,
// itu punya jalur validasi & penghitungan sendiri di action:'insert'
// table:'bookings' supaya perubahan di sini tidak bisa diam-diam mengubah
// perilaku pembayaran yang sudah teruji.
function evaluatePromo(promo, amount, type) {
  if (!promo) return { valid: false, reason: 'Kode promo tidak ditemukan.' };
  if (promo.active === false) return { valid: false, reason: 'Kode promo ini sudah tidak aktif.' };
  if (promo.applies_to && promo.applies_to !== 'all' && promo.applies_to !== type) {
    return { valid: false, reason: 'Kode promo ini tidak berlaku untuk transaksi ini.' };
  }
  const now = new Date();
  if (promo.valid_from && new Date(promo.valid_from) > now) return { valid: false, reason: 'Kode promo ini belum berlaku.' };
  if (promo.valid_until && new Date(promo.valid_until) < now) return { valid: false, reason: 'Kode promo ini sudah kedaluwarsa.' };
  if (promo.max_uses != null && promo.used_count >= promo.max_uses) return { valid: false, reason: 'Kuota kode promo ini sudah habis.' };
  if (promo.min_amount && amount < Number(promo.min_amount)) {
    return { valid: false, reason: `Minimal transaksi Rp${Number(promo.min_amount).toLocaleString('id-ID')} untuk pakai kode ini.` };
  }
  let discount = promo.discount_type === 'percent'
    ? Math.round(amount * Number(promo.discount_value) / 100)
    : Number(promo.discount_value);
  if (promo.max_discount != null) discount = Math.min(discount, Number(promo.max_discount));
  discount = Math.max(0, Math.min(discount, amount));
  return { valid: true, discount, finalAmount: amount - discount };
}

const PUBLIC_USER_FIELDS = 'id,name,role,created_at';
const OWN_USER_FIELDS    = 'id,name,email,phone,role,address,organization,dob,gender,ktp_status,ktp_url,bank_name,bank_account_number,bank_account_name,bank_verified,created_at';
// Dipakai KHUSUS pencarian berdasarkan nomor HP (login/lupa-password pakai
// no. HP) — email perlu ikut kebawa supaya bisa dipakai resolve ke
// Supabase Auth (yang hanya kenal email, bukan nomor HP), tapi field lain
// (bank, KTP, dst.) tetap disembunyikan sama seperti pencarian publik biasa.
const PHONE_LOOKUP_FIELDS = 'id,email';

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Database belum dikonfigurasi. Set SUPABASE_URL dan SUPABASE_SERVICE_KEY (atau SUPABASE_SERVICE_ROLE_KEY) di Vercel Environment Variables.' });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const { action, table, data, filters, id } = body;
  if (!action || !table) return res.status(400).json({ error: 'action dan table wajib diisi' });

  const authUser = await getAuthUser(req);
  const uid = authUser?.id || null;
  const denied = () => res.status(403).json({ error: 'Tidak diizinkan.' });
  const authRequired = () => res.status(401).json({ error: 'Silakan login terlebih dahulu.' });

  try {
    // ── users ──────────────────────────────────────────────
    if (table === 'users') {
      if (action === 'select') {
        const own = uid && filters?.id === `eq.${uid}`;
        const byPhone = !own && (filters?.phone || filters?.or?.includes('phone.'));
        const params = new URLSearchParams(filters || {});
        params.set('select', own ? OWN_USER_FIELDS : byPhone ? PHONE_LOOKUP_FIELDS : PUBLIC_USER_FIELDS);
        const r = await sbRequest(`users?${params}`, 'GET');
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      if (action === 'update') {
        if (!uid) return authRequired();
        const clean = { ...data };
        // Field sensitif TIDAK PERNAH boleh diset lewat request klien biasa.
        delete clean.role; delete clean.bank_verified; delete clean.total_disbursed;
        if ('ktp_status' in clean && clean.ktp_status !== 'uploaded' && clean.ktp_status !== 'pending') delete clean.ktp_status;
        const params = new URLSearchParams({ id: `eq.${uid}` }); // paksa hanya baris sendiri, abaikan filters/id dari klien
        const r = await sbRequest(`users?${params}`, 'PATCH', clean);
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      return denied(); // insert (lewat api/auth.js) & delete tidak diizinkan lewat endpoint ini
    }

    // ── nurse_profiles ─────────────────────────────────────
    if (table === 'nurse_profiles') {
      if (action === 'select') {
        const params = new URLSearchParams(filters || {});
        const r = await sbRequest(`nurse_profiles?${params}`, 'GET');
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      if (action === 'update') {
        if (!uid) return authRequired();
        const clean = { ...data };
        delete clean.is_verified;
        // Tarif minimum kebijakan platform — cegah perawat pasang tarif
        // sangat murah sebagai kedok buat menarik pasien lalu bertransaksi
        // di luar aplikasi (lihat komentar MIN_NURSE_RATE di js/app.js).
        if ('price_per_hour' in clean && Number(clean.price_per_hour) < 100000) {
          return res.status(400).json({ error: 'Tarif minimum Rp100.000/jam.' });
        }
        const params = new URLSearchParams({ user_id: `eq.${uid}` });
        const r = await sbRequest(`nurse_profiles?${params}`, 'PATCH', clean);
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      return denied();
    }

    // ── patient_profiles ───────────────────────────────────
    if (table === 'patient_profiles') {
      if (!uid) return authRequired();
      if (action === 'select') {
        const params = new URLSearchParams(filters || {});
        params.set('account_id', `eq.${uid}`); // paksa cuma profil milik akun sendiri
        const r = await sbRequest(`patient_profiles?${params}`, 'GET');
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      if (action === 'insert') {
        const clean = { ...data, account_id: uid };
        delete clean.ktp_status; delete clean.ktp_url; // upload KTP lewat update terpisah
        const r = await sbRequest('patient_profiles', 'POST', clean);
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      if (action === 'update') {
        const targetId = id || filters?.id?.replace(/^eq\./, '');
        if (!targetId) return res.status(400).json({ error: 'id wajib' });
        const clean = { ...data };
        if ('ktp_status' in clean && clean.ktp_status !== 'uploaded' && clean.ktp_status !== 'pending') delete clean.ktp_status;
        const params = new URLSearchParams({ id: `eq.${targetId}`, account_id: `eq.${uid}` });
        const r = await sbRequest(`patient_profiles?${params}`, 'PATCH', clean);
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      if (action === 'delete') {
        const targetId = id || filters?.id?.replace(/^eq\./, '');
        if (!targetId) return res.status(400).json({ error: 'id wajib' });
        const params = new URLSearchParams({ id: `eq.${targetId}`, account_id: `eq.${uid}` });
        const r = await sbRequest(`patient_profiles?${params}`, 'DELETE');
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true } : { error: r.data });
      }
      return denied();
    }

    // ── campaigns ──────────────────────────────────────────
    if (table === 'campaigns') {
      if (action === 'select') {
        const params = new URLSearchParams(filters || {});
        const r = await sbRequest(`campaigns?${params}`, 'GET');
        // Nomor rekening penerima campaign sengaja tidak ditampilkan ke publik
        // di UI (lihat komentar di js/app.js) — tapi kalau kolomnya ikut
        // kebawa di response API, siapa pun bisa baca langsung lewat network
        // tab. Buang di sini kecuali yang minta adalah pemilik campaign-nya.
        if (r.ok && Array.isArray(r.data)) {
          r.data = r.data.map(row => row.created_by === uid ? row : { ...row, bank_account_number: undefined });
        }
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      if (action === 'insert') {
        if (!uid) return authRequired();
        const clean = { ...data, created_by: uid, is_verified: false, bank_verified: false, current: 0, donor_count: 0 };
        const r = await sbRequest('campaigns', 'POST', clean);
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      if (action === 'update') {
        if (!uid) return authRequired();
        const targetId = id || filters?.id?.replace(/^eq\./, '');
        if (!targetId) return res.status(400).json({ error: 'id wajib' });
        const clean = { ...data };
        delete clean.is_verified; delete clean.current; delete clean.donor_count; delete clean.total_disbursed; delete clean.created_by;
        if (clean.bank_verified !== undefined) clean.bank_verified = false; // edit rekening selalu reset status verifikasi
        const params = new URLSearchParams({ id: `eq.${targetId}`, created_by: `eq.${uid}` });
        const r = await sbRequest(`campaigns?${params}`, 'PATCH', clean);
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      return denied();
    }

    // ── bookings ───────────────────────────────────────────
    if (table === 'bookings') {
      if (action === 'select') {
        if (!uid) return authRequired();
        const params = new URLSearchParams(filters || {});
        params.delete('patient_id'); params.delete('nurse_id');
        params.set('or', `(patient_id.eq.${uid},nurse_id.eq.${uid})`);
        const r = await sbRequest(`bookings?${params}`, 'GET');
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      if (action === 'insert') {
        if (!uid) return authRequired();
        const clean = { ...data, patient_id: uid, status: 'pending', payment_status: 'unpaid' };
        delete clean.transaction_id; delete clean.reference_id;
        if (clean.patient_profile_id) {
          const own = await sbRequest(`patient_profiles?id=eq.${clean.patient_profile_id}&account_id=eq.${uid}&select=id`, 'GET');
          if (!own.data?.length) return res.status(400).json({ error: 'Profil pasien tidak valid.' });
        }
        // Kode promo: diskon TIDAK PERNAH dipercaya dari klien (klien cuma
        // kirim kode-nya) — divalidasi & dihitung ulang di sini dari tabel
        // promo_codes, lalu total_cost/platform_fee/nurse_pay disesuaikan.
        // (Cek pratinjau di action:'preview' table:'promo_codes' di file ini pakai logika yang sama tapi
        // read-only, tidak menambah used_count.)
        const promoCodeInput = typeof clean.promo_code === 'string' ? clean.promo_code.trim() : '';
        delete clean.promo_code; delete clean.discount_amount;
        let appliedPromo = null;
        if (promoCodeInput) {
          const grossTotal = Number(clean.total_cost) || 0;
          const pr = await sbRequest(`promo_codes?code=ilike.${encodeURIComponent(promoCodeInput)}&select=*&limit=1`, 'GET');
          const promo = pr.data?.[0] || null;
          const now = new Date();
          const invalid =
            !promo || promo.active === false ||
            (promo.applies_to && promo.applies_to !== 'all' && promo.applies_to !== 'booking') ||
            (promo.valid_from && new Date(promo.valid_from) > now) ||
            (promo.valid_until && new Date(promo.valid_until) < now) ||
            (promo.max_uses != null && promo.used_count >= promo.max_uses) ||
            (promo.min_amount && grossTotal < Number(promo.min_amount));
          if (invalid) return res.status(400).json({ error: 'Kode promo tidak valid, kedaluwarsa, atau sudah tidak berlaku.' });
          let discount = promo.discount_type === 'percent'
            ? Math.round(grossTotal * Number(promo.discount_value) / 100)
            : Number(promo.discount_value);
          if (promo.max_discount != null) discount = Math.min(discount, Number(promo.max_discount));
          discount = Math.max(0, Math.min(discount, grossTotal));
          const discountedTotal = grossTotal - discount;
          const platformFee = Math.round(discountedTotal * 0.2);
          clean.total_cost = discountedTotal;
          clean.platform_fee = platformFee;
          clean.nurse_pay = discountedTotal - platformFee;
          clean.promo_code = promo.code;
          clean.discount_amount = discount;
          appliedPromo = promo;
        }
        const r = await sbRequest('bookings', 'POST', clean);
        if (r.ok && appliedPromo) {
          // Best-effort — kalau ini gagal, booking tetap valid, cuma
          // penghitung pemakaian kodenya tidak nambah untuk kasus ini.
          await sbRequest(`promo_codes?id=eq.${appliedPromo.id}`, 'PATCH', { used_count: (appliedPromo.used_count || 0) + 1 }).catch(() => {});
        }
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      if (action === 'update') {
        if (!uid) return authRequired();
        const targetId = id || filters?.id?.replace(/^eq\./, '');
        if (!targetId) return res.status(400).json({ error: 'id wajib' });
        const clean = { ...data };
        // Status pembayaran cuma boleh berubah lewat doku-payment.js action:'confirm'
        // (yang cek ulang ke DOKU langsung), bukan lewat endpoint umum ini.
        delete clean.payment_status; delete clean.transaction_id; delete clean.reference_id;
        delete clean.total_cost; delete clean.platform_fee; delete clean.nurse_pay;
        delete clean.patient_id; delete clean.nurse_id;
        const params = new URLSearchParams({ id: `eq.${targetId}` });
        params.set('or', `(patient_id.eq.${uid},nurse_id.eq.${uid})`);
        const r = await sbRequest(`bookings?${params}`, 'PATCH', clean);
        if (r.ok && clean.status) {
          // Notifikasi ke PIHAK LAIN (bukan yang barusan mengubah status
          // sendiri) — pasien yang ubah, perawat dikabari, begitu sebaliknya.
          const bk = r.data?.[0];
          if (bk) {
            const otherId = uid === bk.patient_id ? bk.nurse_id : bk.patient_id;
            const statusLabel = { confirmed: 'dikonfirmasi', completed: 'selesai', cancelled: 'dibatalkan' }[clean.status];
            if (otherId && statusLabel) {
              sendPushToUser(otherId, { title: 'Status janji temu berubah', body: 'Janji temu '+(bk.service||'')+' sekarang '+statusLabel+'.', url: '/#dashboard' });
            }
          }
        }
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      return denied();
    }

    // ── reviews ────────────────────────────────────────────
    // Baca publik (ditampilkan di halaman detail perawat ke semua
    // pengunjung). Insert cuma boleh untuk booking milik pasien yang
    // login sendiri, sudah 'completed', dan belum pernah diulas (UNIQUE
    // booking_id di skema juga menjaga ini di level database).
    if (table === 'reviews') {
      if (action === 'select') {
        const params = new URLSearchParams(filters || {});
        const r = await sbRequest(`reviews?${params}`, 'GET');
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      if (action === 'insert') {
        if (!uid) return authRequired();
        const rating = Number(data?.rating);
        if (!data?.booking_id || !(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'booking_id dan rating (1-5) wajib' });
        const bk = await sbRequest(`bookings?id=eq.${data.booking_id}&patient_id=eq.${uid}&status=eq.completed&select=id,nurse_id`, 'GET');
        const booking = bk.data?.[0];
        if (!booking) return res.status(400).json({ error: 'Janji temu tidak ditemukan atau belum selesai.' });
        // Nama diambil dari data akun sendiri (bukan dari klien) supaya tidak
        // bisa memalsukan nama pengulas lain.
        const me = await sbRequest(`users?id=eq.${uid}&select=name`, 'GET');
        const clean = {
          booking_id: data.booking_id, nurse_id: booking.nurse_id, patient_id: uid,
          patient_name: me.data?.[0]?.name || 'Pasien', rating, comment: data.comment || null,
        };
        const r = await sbRequest('reviews', 'POST', clean);
        if (!r.ok) return res.status(r.status).json({ error: r.data });
        await sbRequest('rpc/recompute_nurse_rating', 'POST', { p_nurse_id: booking.nurse_id }).catch(() => {});
        return res.status(200).json({ success: true, data: r.data });
      }
      return denied();
    }

    // ── donations ──────────────────────────────────────────
    // Baca publik (dipakai buat "Donatur terakhir" di halaman campaign, boleh
    // tanpa login termasuk oleh donatur anonim). Insert/update TIDAK diizinkan
    // sama sekali lewat endpoint ini — donasi "paid" cuma dibuat oleh
    // api/doku-payment.js action:'confirm' setelah verifikasi ulang ke DOKU.
    if (table === 'donations') {
      if (action === 'select') {
        const params = new URLSearchParams(filters || {});
        const r = await sbRequest(`donations?${params}`, 'GET');
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      return denied();
    }

    // ── payouts ────────────────────────────────────────────
    if (table === 'payouts') {
      if (!uid) return authRequired();
      if (action === 'select') {
        if (filters?.recipient_type === 'eq.nurse') {
          const params = new URLSearchParams(filters);
          params.set('user_id', `eq.${uid}`);
          const r = await sbRequest(`payouts?${params}`, 'GET');
          return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
        }
        if (filters?.recipient_type === 'eq.campaign_owner') {
          const own = await sbRequest(`campaigns?created_by=eq.${uid}&select=id`, 'GET');
          const ids = (own.data || []).map(c => c.id);
          if (!ids.length) return res.status(200).json({ success: true, data: [] });
          const params = new URLSearchParams(filters);
          params.set('campaign_id', `in.(${ids.join(',')})`);
          const r = await sbRequest(`payouts?${params}`, 'GET');
          return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
        }
        return denied();
      }
      if (action === 'insert') {
        const clean = { ...data };
        delete clean.status;
        if (clean.recipient_type === 'nurse') {
          clean.user_id = uid; clean.campaign_id = null;
        } else if (clean.recipient_type === 'campaign_owner') {
          const own = await sbRequest(`campaigns?id=eq.${clean.campaign_id}&created_by=eq.${uid}&select=id`, 'GET');
          if (!own.data?.length) return denied();
          clean.user_id = null;
        } else {
          return res.status(400).json({ error: 'recipient_type tidak valid' });
        }
        const r = await sbRequest('payouts', 'POST', clean);
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      return denied();
    }

    // ── promo_codes (pratinjau, read-only) ────────────────
    // Cek & pratinjau kode promo SEBELUM pembayaran (mis. di halaman booking
    // perawat, sebelum tombol "Buat Janji Temu" ditekan) — tidak menambah
    // used_count. Validasi yang sebenarnya berlaku ULANG di action:'insert'
    // table:'bookings' di atas, supaya kode promo tidak bisa
    // dipalsukan/dimanipulasi dari klien.
    if (table === 'promo_codes' && action === 'preview') {
      if (!uid) return authRequired();
      const code = String(data?.code || '').trim();
      const amount = Number(data?.amount);
      const type = String(data?.type || 'booking');
      if (!code) return res.status(400).json({ error: 'Kode promo wajib diisi.' });
      if (!(amount > 0)) return res.status(400).json({ error: 'Jumlah transaksi tidak valid.' });
      const pr = await sbRequest(`promo_codes?code=ilike.${encodeURIComponent(code)}&select=*&limit=1`, 'GET');
      if (!pr.ok) return res.status(pr.status).json({ error: pr.data });
      const promo = pr.data?.[0] || null;
      const result = evaluatePromo(promo, amount, type);
      if (!result.valid) return res.status(400).json({ error: result.reason });
      return res.status(200).json({
        success: true, code: promo.code, discountType: promo.discount_type,
        discount: result.discount, finalAmount: result.finalAmount,
      });
    }

    // ── push_subscriptions (langganan push notification) ──
    // Isi subscription (endpoint + keys) datang dari PushManager.subscribe()
    // di browser — tidak berisi apa pun yang bisa disalahgunakan kalau bocor
    // (cuma alamat buat browser push service), tapi tetap diikat ke akun
    // yang login supaya tidak bisa didaftarkan atas nama pengguna lain.
    if (table === 'push_subscriptions') {
      if (!uid) return authRequired();
      if (action === 'insert') {
        const endpoint = data?.endpoint;
        const p256dh   = data?.keys?.p256dh;
        const authKey  = data?.keys?.auth;
        if (!endpoint || !p256dh || !authKey) return res.status(400).json({ error: 'Data langganan tidak lengkap.' });
        const r = await sbRequest('push_subscriptions', 'POST',
          { user_id: uid, endpoint, p256dh, auth: authKey },
          { Prefer: 'resolution=merge-duplicates,return=representation' });
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true, data: r.data } : { error: r.data });
      }
      if (action === 'delete') {
        const endpoint = data?.endpoint;
        if (!endpoint) return res.status(400).json({ error: 'endpoint wajib diisi.' });
        const params = new URLSearchParams({ endpoint: `eq.${endpoint}`, user_id: `eq.${uid}` });
        const r = await sbRequest(`push_subscriptions?${params}`, 'DELETE');
        return res.status(r.ok ? 200 : r.status).json(r.ok ? { success: true } : { error: r.data });
      }
      return denied();
    }

    return res.status(400).json({ error: `Tabel/aksi tidak diizinkan lewat endpoint ini: ${table}.${action}` });

  } catch (err) {
    console.error('[db]', err);
    return res.status(500).json({ error: err.message });
  }
};
