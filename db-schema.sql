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
  ktp_status  TEXT DEFAULT 'pending' CHECK (ktp_status IN ('pending','uploaded','verified')),
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
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled','pending_payment')),
  reference_id    TEXT,
  transaction_id  TEXT,
  payment_status  TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
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

-- ── Transactions (iPaymu log) ──────────────────────────────
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

-- Kolom ringkasan total yang sudah dicairkan (memudahkan query saldo tanpa agregasi payouts)
ALTER TABLE users     ADD COLUMN IF NOT EXISTS total_disbursed BIGINT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_disbursed BIGINT DEFAULT 0;

-- Foto sampul campaign (disimpan sebagai data URL base64 terkompresi di klien —
-- tidak ada bucket storage terpisah, jadi kolom TEXT biasa cukup untuk ukuran
-- yang sudah dikecilkan sebelum diunggah).
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── Row Level Security (RLS) ───────────────────────────────
ALTER TABLE users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurse_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts   ENABLE ROW LEVEL SECURITY;

-- Policies: semua user bisa baca data publik
CREATE POLICY "Public read nurses"    ON nurse_profiles FOR SELECT USING (true);
CREATE POLICY "Public read campaigns" ON campaigns      FOR SELECT USING (true);
CREATE POLICY "Public read donations" ON donations      FOR SELECT USING (true);

-- User hanya bisa lihat data sendiri
CREATE POLICY "Own bookings"  ON bookings USING (auth.uid() = patient_id OR auth.uid() = nurse_id);
CREATE POLICY "Own profile"   ON users    USING (auth.uid() = id);
CREATE POLICY "Own payouts"   ON payouts  USING (
  auth.uid() = user_id
  OR campaign_id IN (SELECT id FROM campaigns WHERE created_by = auth.uid())
);

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

CREATE TRIGGER trg_users_updated     BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated  BEFORE UPDATE ON bookings      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON campaigns     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_np_updated        BEFORE UPDATE ON nurse_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

-- =========================================================
-- CARA AKTIVASI:
-- 1. Buka https://supabase.com/dashboard
-- 2. Pilih project → SQL Editor → New Query
-- 3. Copy-paste isi file ini → Run
-- 4. Buka Authentication → Providers → aktifkan Email
-- 5. Salin URL & API Keys dari Settings → API
-- 6. Tambahkan ke Netlify Environment Variables:
--    SUPABASE_URL = https://xxxx.supabase.co
--    SUPABASE_ANON_KEY = eyJxxx...
--    SUPABASE_SERVICE_KEY = eyJxxx...
-- =========================================================
