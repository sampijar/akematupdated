-- =========================================================
-- Akemat Foundation — Supabase Database Schema
-- Jalankan ini di Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor → New Query
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL CHECK (role IN ('patient','nurse','donor')),
  address     TEXT,
  organization TEXT,
  ktp_status  TEXT DEFAULT 'pending' CHECK (ktp_status IN ('pending','uploaded','verified','rejected')),
  ktp_url     TEXT,
  bank_name   TEXT,
  bank_account_number TEXT,
  bank_account_name   TEXT,
  bank_verified BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Nurse Profiles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nurse_profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  specialty   TEXT NOT NULL,
  education   TEXT NOT NULL,
  experience  INT DEFAULT 0,
  price_per_hour INT NOT NULL,
  rating      NUMERIC(3,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  city        TEXT,
  is_available BOOLEAN DEFAULT true,
  is_verified  BOOLEAN DEFAULT false,
  bio         TEXT,
  schedule    TEXT[] DEFAULT '{}',
  services    TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ── Campaigns ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  story        TEXT NOT NULL,
  category     TEXT,
  target       BIGINT NOT NULL,
  current      BIGINT DEFAULT 0,
  donor_count  INT DEFAULT 0,
  deadline     DATE NOT NULL,
  created_by   UUID REFERENCES users(id),
  creator_name TEXT,
  is_verified  BOOLEAN DEFAULT false,
  bank_name    TEXT,
  bank_account_number TEXT,
  bank_account_name   TEXT,
  bank_verified BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bookings ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID REFERENCES users(id),
  nurse_id        UUID REFERENCES users(id),
  nurse_name      TEXT,
  nurse_specialty TEXT,
  service         TEXT NOT NULL,
  booking_date    DATE NOT NULL,
  booking_time    TEXT NOT NULL,
  duration_hours  INT NOT NULL,
  address         TEXT NOT NULL,
  notes           TEXT,
  total_cost      BIGINT NOT NULL,
  platform_fee    BIGINT NOT NULL,
  nurse_pay       BIGINT NOT NULL,
  promo_code      TEXT,
  discount_amount BIGINT DEFAULT 0,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled','pending_payment')),
  reference_id    TEXT,
  transaction_id  TEXT,
  payment_status  TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Promo Codes ────────────────────────────────────────────
-- Dibuat manual lewat Supabase Table Editor (belum ada UI admin untuk ini).
-- discount_type: 'percent' (mis. 10 = 10%) atau 'fixed' (potongan Rp tetap).
-- applies_to: 'booking', 'donation', atau 'all'. max_uses NULL = tanpa batas.
CREATE TABLE IF NOT EXISTS promo_codes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           TEXT UNIQUE NOT NULL,
  discount_type  TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_discount   NUMERIC,
  min_amount     NUMERIC DEFAULT 0,
  max_uses       INTEGER,
  used_count     INTEGER DEFAULT 0,
  active         BOOLEAN DEFAULT true,
  valid_from     TIMESTAMPTZ,
  valid_until    TIMESTAMPTZ,
  applies_to     TEXT DEFAULT 'booking' CHECK (applies_to IN ('booking','donation','all')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Donations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id    UUID REFERENCES campaigns(id),
  donor_id       UUID REFERENCES users(id),
  donor_name     TEXT NOT NULL,
  amount         BIGINT NOT NULL,
  platform_fee   BIGINT NOT NULL,
  net_amount     BIGINT NOT NULL,
  is_anonymous   BOOLEAN DEFAULT false,
  reference_id   TEXT,
  transaction_id TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Transactions (peninggalan integrasi iPaymu lama, sebelum pindah ke
--    DOKU — tidak dipakai kode manapun lagi saat ini. Aman dihapus lewat
--    Supabase SQL Editor: DROP TABLE IF EXISTS transactions;) ───────────
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_id   TEXT UNIQUE NOT NULL,
  transaction_id TEXT,
  type           TEXT NOT NULL CHECK (type IN ('booking','donation')),
  related_id     UUID, -- booking_id or donation_id
  amount         BIGINT NOT NULL,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','expired')),
  payment_via    TEXT,
  payment_channel TEXT,
  buyer_name     TEXT,
  buyer_email    TEXT,
  raw_notify     JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Payouts (pencairan dana) ───────────────────────────────
-- Ledger pencairan dana untuk perawat (penghasilan booking) dan
-- pemilik campaign (donasi terkumpul). Satu baris = satu pengajuan pencairan.
CREATE TABLE IF NOT EXISTS payouts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_type      TEXT NOT NULL CHECK (recipient_type IN ('nurse','campaign_owner')),
  user_id             UUID REFERENCES users(id),      -- diisi jika recipient_type = 'nurse'
  campaign_id         UUID REFERENCES campaigns(id),  -- diisi jika recipient_type = 'campaign_owner'
  amount              BIGINT NOT NULL CHECK (amount > 0),
  bank_name           TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_name   TEXT NOT NULL,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
  notes               TEXT,
  requested_at        TIMESTAMPTZ DEFAULT NOW(),
  processed_at        TIMESTAMPTZ
);

-- Tanggal lahir & jenis kelamin akun — sebelumnya cuma ada di patient_profiles,
-- disamakan ke users juga supaya data pribadi yang wajib diisi konsisten di
-- semua role (pasien/perawat/penggalang dana), bukan cuma pasien.
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob    DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;

-- Kolom ringkasan total yang sudah dicairkan (memudahkan query saldo tanpa agregasi payouts)
ALTER TABLE users     ADD COLUMN IF NOT EXISTS total_disbursed BIGINT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_disbursed BIGINT DEFAULT 0;

-- 2FA opsional (WA OTP) — toggle sendiri oleh pengguna di halaman Profil.
-- Kalau aktif, login butuh kode OTP WA (ke nomor HP yang sudah terverifikasi
-- saat registrasi) SETELAH password benar, sebelum sesi benar-benar dibuat.
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

-- Foto sampul campaign (disimpan sebagai data URL base64 terkompresi di klien —
-- tidak ada bucket storage terpisah, jadi kolom TEXT biasa cukup untuk ukuran
-- yang sudah dikecilkan sebelum diunggah).
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── Profil Pasien (multi-pasien per akun) ───────────────────
-- Satu akun (role='patient') bisa punya lebih dari satu profil pasien —
-- mis. orang tua booking-kan perawat untuk anak/pasangan/ortu-nya sendiri.
-- Tiap profil punya KTP & status verifikasi sendiri (terpisah dari KTP
-- akun) karena secara identitas memang orang yang berbeda.
CREATE TABLE IF NOT EXISTS patient_profiles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  relationship TEXT DEFAULT 'Diri Sendiri',
  dob          DATE,
  gender       TEXT,
  phone        TEXT,
  address      TEXT,
  notes        TEXT,
  ktp_status   TEXT DEFAULT 'pending' CHECK (ktp_status IN ('pending','uploaded','verified','rejected')),
  ktp_url      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_account ON patient_profiles(account_id);

-- Booking dibuat oleh akun (patient_id = siapa yang login & bayar) TAPI
-- untuk pasien tertentu (patient_profile_id) — dua hal ini bisa beda orang.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_profile_id UUID REFERENCES patient_profiles(id);
-- Nama pasien disalin ke booking saat dibuat (sama seperti nurse_name/
-- nurse_specialty) supaya perawat & tabel riwayat tidak perlu join —
-- dan tetap ada meski profil pasiennya kemudian dihapus.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_profile_name TEXT;

-- ── Ulasan & Rating Perawat ──────────────────────────────────
-- Satu ulasan per booking (UNIQUE booking_id) — cuma bisa dibuat kalau
-- booking-nya benar-benar milik pasien tsb & sudah 'completed' (lihat
-- pengecekan di api/db.js). rating/review_count di nurse_profiles
-- dihitung ulang lewat RPC recompute_nurse_rating tiap ada ulasan baru
-- (rata-rata dihitung di database, bukan read-modify-write dari app, biar
-- tidak rawan race condition kalau dua ulasan masuk bersamaan).
CREATE TABLE IF NOT EXISTS reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id   UUID REFERENCES bookings(id) UNIQUE,
  nurse_id     UUID REFERENCES users(id),
  patient_id   UUID REFERENCES users(id),
  patient_name TEXT NOT NULL,
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_nurse ON reviews(nurse_id);

CREATE OR REPLACE FUNCTION recompute_nurse_rating(p_nurse_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE nurse_profiles SET
    rating       = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE nurse_id = p_nurse_id), 0),
    review_count = (SELECT COUNT(*) FROM reviews WHERE nurse_id = p_nurse_id)
  WHERE user_id = p_nurse_id;
END;
$$ LANGUAGE plpgsql;

-- ── Rate limiting ────────────────────────────────────────────
-- Dipakai server-side (api/auth.js,
-- api/fazpass-otp.js) untuk membatasi percobaan berturut-turut per
-- IP/nomor HP/email dalam jendela waktu tertentu — bukan diakses klien
-- sama sekali (cuma lewat service_role key), jadi tidak perlu RLS publik.
CREATE TABLE IF NOT EXISTS rate_limits (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rl_key       TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_time ON rate_limits(rl_key, created_at);

-- ── Log audit admin ──────────────────────────────────────────
-- Jejak siapa (email admin) melakukan aksi apa ke data siapa dan kapan —
-- dibutuhkan untuk akuntabilitas/audit terkait data sensitif (KTP,
-- campaign, kode promo) sesuai prinsip UU PDP.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_email  TEXT NOT NULL,
  action       TEXT NOT NULL,
  target_table TEXT,
  target_id    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);

-- ── Row Level Security (RLS) ───────────────────────────────
ALTER TABLE users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurse_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies: semua user bisa baca data publik
-- DROP IF EXISTS dulu di tiap policy/trigger supaya seluruh file ini AMAN
-- dijalankan ulang kapan saja (CREATE POLICY/CREATE TRIGGER polos, beda
-- dari CREATE TABLE/INDEX, tidak punya IF NOT EXISTS di Postgres — re-run
-- tanpa DROP dulu akan gagal dengan error "already exists").
DROP POLICY IF EXISTS "Public read nurses"    ON nurse_profiles;
DROP POLICY IF EXISTS "Public read campaigns" ON campaigns;
DROP POLICY IF EXISTS "Public read donations" ON donations;
DROP POLICY IF EXISTS "Public read reviews"   ON reviews;
DROP POLICY IF EXISTS "Own bookings"  ON bookings;
DROP POLICY IF EXISTS "Own profile"   ON users;
DROP POLICY IF EXISTS "Own payouts"   ON payouts;
DROP POLICY IF EXISTS "Own patient profiles" ON patient_profiles;

CREATE POLICY "Public read nurses"    ON nurse_profiles FOR SELECT USING (true);
CREATE POLICY "Public read campaigns" ON campaigns      FOR SELECT USING (true);
CREATE POLICY "Public read donations" ON donations      FOR SELECT USING (true);
CREATE POLICY "Public read reviews"   ON reviews         FOR SELECT USING (true);

-- User hanya bisa lihat data sendiri
CREATE POLICY "Own bookings"  ON bookings USING (auth.uid() = patient_id OR auth.uid() = nurse_id);
CREATE POLICY "Own profile"   ON users    USING (auth.uid() = id);
CREATE POLICY "Own payouts"   ON payouts  USING (
  auth.uid() = user_id
  OR campaign_id IN (SELECT id FROM campaigns WHERE created_by = auth.uid())
);
CREATE POLICY "Own patient profiles" ON patient_profiles USING (auth.uid() = account_id);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_patient  ON bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_bookings_nurse    ON bookings(nurse_id);
CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor   ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ref  ON transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_payouts_user      ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_campaign  ON payouts(campaign_id);

-- ── Trigger: update updated_at otomatis ────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated     ON users;
DROP TRIGGER IF EXISTS trg_bookings_updated  ON bookings;
DROP TRIGGER IF EXISTS trg_campaigns_updated ON campaigns;
DROP TRIGGER IF EXISTS trg_np_updated        ON nurse_profiles;
DROP TRIGGER IF EXISTS trg_pp_updated        ON patient_profiles;

CREATE TRIGGER trg_users_updated     BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated  BEFORE UPDATE ON bookings      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON campaigns     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_np_updated        BEFORE UPDATE ON nurse_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pp_updated        BEFORE UPDATE ON patient_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RPC: tambah saldo campaign secara atomik ────────────────
-- Dipanggil lewat POST {SUPABASE_URL}/rest/v1/rpc/increment_campaign.
-- Read-then-write biasa dari aplikasi rawan race condition kalau ada dua
-- donasi masuk bersamaan; UPDATE ... SET x = x + n di dalam function ini
-- atomik di level database.
CREATE OR REPLACE FUNCTION increment_campaign(p_campaign_id UUID, p_amount BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET current = current + p_amount, donor_count = donor_count + 1
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- ── Migrasi: tambah status 'rejected' untuk ktp_status ─────
-- (Aman dijalankan berkali-kali — untuk database yang sudah ada sebelum
-- status 'rejected' ditambahkan. Kalau baru CREATE TABLE dari nol, baris
-- di atas sudah termasuk 'rejected' jadi ini tidak akan mengubah apa-apa.)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ktp_status_check;
ALTER TABLE users ADD CONSTRAINT users_ktp_status_check CHECK (ktp_status IN ('pending','uploaded','verified','rejected'));
ALTER TABLE patient_profiles DROP CONSTRAINT IF EXISTS patient_profiles_ktp_status_check;
ALTER TABLE patient_profiles ADD CONSTRAINT patient_profiles_ktp_status_check CHECK (ktp_status IN ('pending','uploaded','verified','rejected'));

-- ── Migrasi: kode promo ─────────────────────────────────────
-- (Aman dijalankan berkali-kali. Tabel promo_codes dan kolomnya di
-- bookings sudah termasuk di CREATE TABLE di atas kalau baru dari nol.)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount BIGINT DEFAULT 0;

-- ── Push notification ────────────────────────────────────────
-- Satu pengguna bisa punya lebih dari satu langganan (HP + laptop, dst.).
-- endpoint UNIQUE supaya subscribe ulang dari device yang sama tidak
-- bikin baris dobel (upsert di api/db.js (table push_subscriptions)).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id),
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── Perangkat dikenal (peringatan email login dari perangkat baru) ──────
-- device_id dibuat & disimpan browser sendiri (localStorage), dikirim tiap
-- login lewat api/auth.js. Kalau kombinasi (user_id, device_id) belum ada
-- di sini, dianggap "perangkat baru" — dicatat + dikirim email peringatan
-- (lib/email.js), lalu tidak dianggap baru lagi di login berikutnya.
CREATE TABLE IF NOT EXISTS known_devices (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id),
  device_id  TEXT NOT NULL,
  user_agent TEXT,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);
CREATE INDEX IF NOT EXISTS idx_known_devices_user ON known_devices(user_id);
ALTER TABLE known_devices ENABLE ROW LEVEL SECURITY;

-- ── Chat pasien-perawat per janji temu ──────────────────────────────────
-- Terikat ke satu booking (bukan "percakapan" bebas) — akses & pengiriman
-- pesan divalidasi di api/db.js (harus jadi patient_id/nurse_id booking
-- itu), termasuk filter otomatis yang menolak pesan berisi nomor HP/email/
-- link (cegah transaksi di luar aplikasi, lihat komentar detectContactInfo
-- di api/db.js).
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  sender_id  UUID REFERENCES users(id),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- CARA AKTIVASI:
-- 1. Buka https://supabase.com/dashboard
-- 2. Pilih project → SQL Editor → New Query
-- 3. Copy-paste isi file ini → Run
-- 4. Buka Authentication → Providers → aktifkan Email
-- 5. Salin URL & API Keys dari Settings → API
-- 6. Tambahkan ke Vercel Environment Variables:
--    SUPABASE_URL = https://xxxx.supabase.co
--    SUPABASE_ANON_KEY = eyJxxx...
--    SUPABASE_SERVICE_KEY = eyJxxx...
-- =========================================================
