/**
 * Vercel Serverless Function: promo.js
 * Cek & pratinjau kode promo SEBELUM pembayaran (mis. di halaman booking
 * perawat, sebelum tombol "Buat Janji Temu" ditekan).
 * URL: /api/promo
 *
 * Ini cuma endpoint PRATINJAU (read-only, tidak menambah pemakaian kode) —
 * validasi yang sebenarnya berlaku ULANG di server saat booking benar-benar
 * dibuat (lihat action:'insert' table:'bookings' di api/db.js), supaya kode
 * promo tidak bisa dipalsukan/dimanipulasi dari klien. Endpoint ini murni
 * untuk menampilkan potongan harga ke pengguna sebelum mereka submit.
 *
 * Kalau belum ada kode promo di tabel `promo_codes`, endpoint ini akan
 * selalu bilang "kode tidak ditemukan" — tabelnya kosong sampai ada yang
 * dibuat manual lewat Supabase Table Editor (lihat db-schema.sql untuk
 * kolom-kolomnya: code, discount_type, discount_value, dst.).
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

async function sbGet(pathAndQuery) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY },
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

// Dipakai juga oleh api/db.js secara terpisah (lihat komentar di sana) —
// logikanya sengaja diduplikasi, bukan di-share, supaya tiap serverless
// function tetap independen (pola yang sama dipakai di admin.js/db.js).
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

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Database belum dikonfigurasi.' });

  const authUser = await getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  const code = String(body.code || '').trim();
  const amount = Number(body.amount);
  const type = String(body.type || 'booking');
  if (!code) return res.status(400).json({ error: 'Kode promo wajib diisi.' });
  if (!(amount > 0)) return res.status(400).json({ error: 'Jumlah transaksi tidak valid.' });

  try {
    const r = await sbGet(`promo_codes?code=ilike.${encodeURIComponent(code)}&select=*&limit=1`);
    if (!r.ok) return res.status(r.status).json({ error: r.data });
    const promo = r.data?.[0] || null;
    const result = evaluatePromo(promo, amount, type);
    if (!result.valid) return res.status(400).json({ error: result.reason });
    return res.status(200).json({
      success: true,
      code: promo.code,
      discountType: promo.discount_type,
      discount: result.discount,
      finalAmount: result.finalAmount,
    });
  } catch (err) {
    console.error('[promo]', err);
    return res.status(500).json({ error: err.message });
  }
};
