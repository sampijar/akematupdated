'use strict';
/**
 * api.js — Akemat Foundation API Client
 * Menghubungkan frontend ke Vercel Functions (Supabase backend)
 *
 * Cara kerja:
 * - Store.init() dipanggil sekali saat boot (lihat app.js). Kalau Supabase
 *   sudah dikonfigurasi (env var terisi) DAN bisa dihubungi, Store memakai
 *   backend 'remote' (CloudDB, lewat Supabase). Kalau tidak, Store memakai
 *   backend 'local' (DB, localStorage) — sama seperti sebelumnya.
 * - Keputusan ini diambil SEKALI saat boot, bukan per-panggilan, supaya
 *   tidak ada perilaku "diam-diam gagal lalu fallback" yang bisa
 *   menyembunyikan data yang sebenarnya tidak tersimpan.
 * - Semua kode lain di app.js memanggil Store.* (bukan DB.* langsung),
 *   dan selalu di-await meskipun backend-nya 'local' (DB.* dibungkus jadi
 *   fungsi async supaya kontraknya seragam).
 *
 * Untuk mengaktifkan Supabase:
 * 1. Buka db-schema.sql → jalankan di Supabase SQL Editor
 * 2. Set env vars di Vercel (lihat .env.example)
 * 3. Push ke GitHub → Vercel auto-deploy
 */

const API_BASE = '/api';

// ── Generic fetch helper ────────────────────────────────────
// Endpoint 'db' butuh token sesi Supabase Auth supaya api/db.js bisa
// memverifikasi siapa yang memanggil (lihat keamanan di api/db.js) — token
// diambil langsung dari sesi aktif SupabaseAuth.client, bukan disimpan
// manual, jadi selalu ikut ter-refresh mengikuti siklus sesi Supabase.
async function apiFetch(endpoint, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (endpoint === 'db' && typeof SupabaseAuth !== 'undefined' && SupabaseAuth.client) {
    try {
      const { data } = await SupabaseAuth.client.auth.getSession();
      if (data?.session?.access_token) headers['Authorization'] = 'Bearer ' + data.session.access_token;
    } catch { /* tetap lanjut tanpa token — request publik masih boleh jalan */ }
  }
  const res  = await fetch(`${API_BASE}/${endpoint}`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Server tidak merespons dengan benar (HTTP '+res.status+').'); }
  if (!res.ok) throw new Error(data.error || 'Request gagal');
  return data;
}

// ── Mapping: baris Supabase (snake_case) ⇄ bentuk internal app (camelCase) ──
// Semua fungsi CloudDB di bawah SELALU menerima/mengembalikan objek berbentuk
// persis seperti DB.* (data.js) supaya app.js tidak perlu tahu backend mana
// yang sedang dipakai.
function shortDate(iso) { return String(iso||'').slice(0,10); }

function rowToUser(row, npRow) {
  if (!row) return null;
  const u = {
    id: row.id, name: row.name, email: row.email, phone: row.phone,
    role: row.role, address: row.address || '', organization: row.organization || '',
    ktpStatus: row.ktp_status || 'pending', ktpUrl: row.ktp_url || '', phoneVerified: true,
    bankInfo: {
      bankName: row.bank_name || '', accountNumber: row.bank_account_number || '',
      accountName: row.bank_account_name || '', verified: !!row.bank_verified,
    },
    createdAt: shortDate(row.created_at),
  };
  if (npRow) {
    u.np = {
      specialty: npRow.specialty, education: npRow.education, exp: npRow.experience || 0,
      price: npRow.price_per_hour, rating: npRow.rating || 0, reviews: npRow.review_count || 0,
      loc: npRow.city, avail: !!npRow.is_available, verified: !!npRow.is_verified,
      bio: npRow.bio || '', schedule: npRow.schedule || [], services: npRow.services || [],
    };
  }
  return u;
}

function userUpdateToRow(data) {
  const row = {};
  if ('name' in data) row.name = data.name;
  if ('phone' in data) row.phone = data.phone;
  if ('address' in data) row.address = data.address;
  if ('organization' in data) row.organization = data.organization;
  if ('ktpStatus' in data) row.ktp_status = data.ktpStatus;
  if ('ktpUrl' in data) row.ktp_url = data.ktpUrl;
  if (data.bankInfo) {
    row.bank_name = data.bankInfo.bankName;
    row.bank_account_number = data.bankInfo.accountNumber;
    row.bank_account_name = data.bankInfo.accountName;
    row.bank_verified = !!data.bankInfo.verified;
  }
  return row;
}

function npUpdateToRow(np) {
  const row = {};
  if ('specialty' in np) row.specialty = np.specialty;
  if ('education' in np) row.education = np.education;
  if ('loc' in np) row.city = np.loc;
  if ('price' in np) row.price_per_hour = np.price;
  if ('bio' in np) row.bio = np.bio;
  if ('schedule' in np) row.schedule = np.schedule;
  if ('services' in np) row.services = np.services;
  if ('avail' in np) row.is_available = np.avail;
  return row;
}

function rowToCampaign(row) {
  if (!row) return null;
  return {
    id: row.id, title: row.title, story: row.story, category: row.category,
    target: row.target, current: row.current, donorCount: row.donor_count,
    deadline: row.deadline, createdBy: row.created_by, creatorName: row.creator_name,
    verified: !!row.is_verified, imageUrl: row.image_url || '',
    bankInfo: {
      bankName: row.bank_name || '', accountNumber: row.bank_account_number || '',
      accountName: row.bank_account_name || '', verified: !!row.bank_verified,
    },
    createdAt: shortDate(row.created_at),
  };
}

function campaignToRow(data) {
  const row = {};
  if ('title' in data) row.title = data.title;
  if ('story' in data) row.story = data.story;
  if ('category' in data) row.category = data.category;
  if ('target' in data) row.target = data.target;
  if ('deadline' in data) row.deadline = data.deadline;
  if ('createdBy' in data) row.created_by = data.createdBy;
  if ('creatorName' in data) row.creator_name = data.creatorName;
  if ('verified' in data) row.is_verified = data.verified;
  if ('imageUrl' in data) row.image_url = data.imageUrl;
  if (data.bankInfo) {
    row.bank_name = data.bankInfo.bankName;
    row.bank_account_number = data.bankInfo.accountNumber;
    row.bank_account_name = data.bankInfo.accountName;
    row.bank_verified = !!data.bankInfo.verified;
  }
  return row;
}

function rowToBooking(row) {
  if (!row) return null;
  return {
    id: row.id, patientId: row.patient_id, nurseId: row.nurse_id,
    nurseName: row.nurse_name, nurseSpecialty: row.nurse_specialty,
    service: row.service, date: row.booking_date, time: row.booking_time,
    duration: row.duration_hours, address: row.address, notes: row.notes || '',
    totalCost: row.total_cost, platformFee: row.platform_fee, nursePay: row.nurse_pay,
    status: row.status, referenceId: row.reference_id, transactionId: row.transaction_id,
    paymentStatus: row.payment_status, createdAt: shortDate(row.created_at),
  };
}

function bookingToRow(data) {
  const row = {};
  const map = {
    patientId:'patient_id', nurseId:'nurse_id', nurseName:'nurse_name', nurseSpecialty:'nurse_specialty',
    service:'service', date:'booking_date', time:'booking_time', duration:'duration_hours',
    address:'address', notes:'notes', totalCost:'total_cost', platformFee:'platform_fee',
    nursePay:'nurse_pay', status:'status', referenceId:'reference_id', transactionId:'transaction_id',
    paymentStatus:'payment_status',
  };
  Object.keys(map).forEach(k => { if (k in data) row[map[k]] = data[k]; });
  return row;
}

function rowToDonation(row) {
  if (!row) return null;
  return {
    id: row.id, campaignId: row.campaign_id, donorId: row.donor_id, donorName: row.donor_name,
    amount: row.amount, platformFee: row.platform_fee, netAmount: row.net_amount,
    anonymous: !!row.is_anonymous, referenceId: row.reference_id, transactionId: row.transaction_id,
    paymentStatus: row.payment_status, date: shortDate(row.created_at),
  };
}

function donationToRow(data) {
  return {
    campaign_id: data.campaignId, donor_id: data.donorId === 'guest' ? null : data.donorId,
    donor_name: data.donorName, amount: data.amount, platform_fee: data.platformFee,
    net_amount: data.netAmount, is_anonymous: !!data.anonymous,
    reference_id: data.referenceId || null, transaction_id: data.transactionId || null,
    payment_status: data.paymentStatus === 'paid' ? 'paid' : 'unpaid',
  };
}

function rowToPayout(row) {
  if (!row) return null;
  return {
    id: row.id, recipientType: row.recipient_type, userId: row.user_id, campaignId: row.campaign_id,
    amount: row.amount, bankName: row.bank_name, bankAccountNumber: row.bank_account_number,
    bankAccountName: row.bank_account_name, status: row.status, notes: row.notes || '',
    requestedAt: shortDate(row.requested_at), processedAt: row.processed_at ? shortDate(row.processed_at) : null,
  };
}

function payoutToRow(data) {
  return {
    recipient_type: data.recipientType, user_id: data.userId || null, campaign_id: data.campaignId || null,
    amount: data.amount, bank_name: data.bankName, bank_account_number: data.bankAccountNumber,
    bank_account_name: data.bankAccountName,
  };
}

// ── CloudDB: CRUD lewat api/db.js (Supabase REST) ───────────
const Cloud = {
  async isAvailable() {
    try {
      const r = await fetch(`${API_BASE}/db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', table: 'campaigns', filters: { limit: 1 } }),
      });
      const d = await r.json();
      return r.ok && d.success;
    } catch { return false; }
  },

  // Users / nurse profiles
  async getUserById(id) {
    const d  = await apiFetch('db', { action:'select', table:'users', filters:{ id:`eq.${id}`, limit:1 } });
    const row = d.data?.[0];
    if (!row) return null;
    let npRow = null;
    if (row.role === 'nurse') {
      const npd = await apiFetch('db', { action:'select', table:'nurse_profiles', filters:{ user_id:`eq.${id}`, limit:1 } });
      npRow = npd.data?.[0] || null;
    }
    return rowToUser(row, npRow);
  },

  async getUserByPhone(phone) {
    const digits = String(phone||'').replace(/\D/g,'');
    const d = await apiFetch('db', { action:'select', table:'users', filters:{ phone:`eq.${digits}` } });
    const row = d.data?.[0];
    return row ? this.getUserById(row.id) : null;
  },

  async updateUser(id, data) {
    const row = userUpdateToRow(data);
    if (Object.keys(row).length) {
      await apiFetch('db', { action:'update', table:'users', id, data: row });
    }
    if (data.np) {
      const npRow = npUpdateToRow(data.np);
      if (Object.keys(npRow).length) {
        await apiFetch('db', { action:'update', table:'nurse_profiles', filters:{ user_id:`eq.${id}` }, data: npRow });
      }
    }
    return this.getUserById(id);
  },

  async getNurses(filters = {}) {
    const params = {};
    if (filters.specialty && filters.specialty !== 'Semua') params.specialty = `eq.${filters.specialty}`;
    if (filters.avail) params.is_available = 'eq.true';
    const d = await apiFetch('db', { action:'select', table:'nurse_profiles', filters: params });
    const nps = d.data || [];
    const users = await Promise.all(nps.map(np => this.getUserById(np.user_id)));
    return users.filter(Boolean);
  },

  // Campaigns
  async getCampaigns() {
    const d = await apiFetch('db', { action:'select', table:'campaigns', filters:{ order:'created_at.desc' } });
    return (d.data || []).map(rowToCampaign);
  },
  async getCampaignById(id) {
    const d = await apiFetch('db', { action:'select', table:'campaigns', filters:{ id:`eq.${id}`, limit:1 } });
    return rowToCampaign(d.data?.[0]);
  },
  async getCampaignsByUser(uid) {
    const d = await apiFetch('db', { action:'select', table:'campaigns', filters:{ created_by:`eq.${uid}`, order:'created_at.desc' } });
    return (d.data || []).map(rowToCampaign);
  },
  async addCampaign(data) {
    const row = campaignToRow({ current:0, donorCount:0, verified:false, ...data });
    const d = await apiFetch('db', { action:'insert', table:'campaigns', data: row });
    return rowToCampaign(d.data?.[0]);
  },
  async updateCampaign(id, data) {
    const row = campaignToRow(data);
    await apiFetch('db', { action:'update', table:'campaigns', id, data: row });
    return this.getCampaignById(id);
  },

  // Bookings
  async getBookingsByPatient(uid) {
    const d = await apiFetch('db', { action:'select', table:'bookings', filters:{ patient_id:`eq.${uid}`, order:'created_at.desc' } });
    return (d.data || []).map(rowToBooking);
  },
  async getBookingsByNurse(uid) {
    const d = await apiFetch('db', { action:'select', table:'bookings', filters:{ nurse_id:`eq.${uid}`, order:'created_at.desc' } });
    return (d.data || []).map(rowToBooking);
  },
  async getBookings() {
    const d = await apiFetch('db', { action:'select', table:'bookings', filters:{ order:'created_at.desc' } });
    return (d.data || []).map(rowToBooking);
  },
  async addBooking(data) {
    const totalCost   = data.totalCost || 0;
    const platformFee = Math.round(totalCost * FEE.BOOKING);
    const nursePay    = totalCost - platformFee;
    const row = bookingToRow({ status:'pending', paymentStatus:'unpaid', platformFee, nursePay, ...data });
    const d = await apiFetch('db', { action:'insert', table:'bookings', data: row });
    return rowToBooking(d.data?.[0]);
  },
  async updateBooking(id, data) {
    const row = bookingToRow(data);
    const d = await apiFetch('db', { action:'update', table:'bookings', id, data: row });
    return rowToBooking(d.data?.[0]);
  },

  // Donations
  async getDonationsByUser(uid) {
    const d = await apiFetch('db', { action:'select', table:'donations', filters:{ donor_id:`eq.${uid}`, order:'created_at.desc' } });
    return (d.data || []).map(rowToDonation);
  },
  async getDonationsByCampaign(cid) {
    const d = await apiFetch('db', { action:'select', table:'donations', filters:{ campaign_id:`eq.${cid}`, order:'created_at.desc' } });
    return (d.data || []).map(rowToDonation);
  },
  // Dipanggil HANYA setelah pembayaran iPaymu terkonfirmasi (payment-return.html) —
  // sama seperti DB.addDonation di localStorage, campaign hanya bertambah kalau paymentStatus:'paid'.
  async addDonation(data) {
    if (data.referenceId) {
      const existing = await apiFetch('db', { action:'select', table:'donations', filters:{ reference_id:`eq.${data.referenceId}`, limit:1 } });
      if (existing.data?.[0]) return rowToDonation(existing.data[0]);
    }
    const amount      = data.amount || 0;
    const platformFee = Math.round(amount * FEE.DONATION);
    const netAmount   = amount - platformFee;
    const paymentStatus = data.paymentStatus === 'paid' ? 'paid' : 'unpaid';
    const row = donationToRow({ ...data, platformFee, netAmount, paymentStatus });
    const d = await apiFetch('db', { action:'insert', table:'donations', data: row });
    if (paymentStatus === 'paid') {
      // RPC atomik — hindari race condition kalau ada donasi lain masuk bersamaan
      await apiFetch('db', { action:'rpc', table:'increment_campaign', data:{ p_campaign_id: data.campaignId, p_amount: amount } }).catch(()=>{});
    }
    return rowToDonation(d.data?.[0]);
  },

  // Payouts
  async getPayoutsByUser(uid) {
    const d = await apiFetch('db', { action:'select', table:'payouts', filters:{ recipient_type:'eq.nurse', user_id:`eq.${uid}`, order:'requested_at.desc' } });
    return (d.data || []).map(rowToPayout);
  },
  async getPayoutsByCampaign(cid) {
    const d = await apiFetch('db', { action:'select', table:'payouts', filters:{ recipient_type:'eq.campaign_owner', campaign_id:`eq.${cid}`, order:'requested_at.desc' } });
    return (d.data || []).map(rowToPayout);
  },
  async addPayoutRequest(data) {
    const row = payoutToRow(data);
    const d = await apiFetch('db', { action:'insert', table:'payouts', data: row });
    return rowToPayout(d.data?.[0]);
  },
  payoutUsed(list) { return list.filter(p=>p.status!=='rejected').reduce((s,p)=>s+p.amount,0); },
  async getNurseAvailablePayout(uid) {
    const bookings = await this.getBookingsByNurse(uid);
    const earned = bookings.filter(b => b.status==='completed' && b.paymentStatus==='paid').reduce((s,b)=>s+(b.nursePay||0),0);
    const payouts = await this.getPayoutsByUser(uid);
    return Math.max(0, earned - this.payoutUsed(payouts));
  },
  async getCampaignAvailablePayout(cid) {
    const donations = await this.getDonationsByCampaign(cid);
    const raised = donations.filter(d => d.paymentStatus==='paid').reduce((s,d)=>s+(d.netAmount||0),0);
    const payouts = await this.getPayoutsByCampaign(cid);
    return Math.max(0, raised - this.payoutUsed(payouts));
  },
};

// ── Auth via Supabase Auth (SDK CDN) ────────────────────────
const SupabaseAuth = {
  client: null,

  async init(url, key) {
    if (!url || !key) return false;
    if (typeof supabase === 'undefined') {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    this.client = supabase.createClient(url, key);
    return true;
  },

  async signIn({ email, password }) {
    if (!this.client) throw new Error('Supabase belum siap');
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email atau password salah.' : error.message);
    return data.user;
  },

  async signOut() {
    if (!this.client) return;
    await this.client.auth.signOut();
  },

  async getSessionUser() {
    if (!this.client) return null;
    const { data } = await this.client.auth.getUser();
    return data?.user || null;
  },
};

// ── Store: pilih backend sekali di boot, ekspos API seragam ─
const Store = {
  backend: 'local',        // 'local' | 'remote'
  currentUser: null,       // cache, dibaca sinkron oleh Store.getCurrentUser()

  async init() {
    let cfg = null;
    try { cfg = await (await fetch(`${API_BASE}/config`)).json(); } catch { /* config endpoint belum ada / gagal → tetap local */ }

    if (cfg?.supabaseConfigured) {
      const ready = await SupabaseAuth.init(cfg.supabaseUrl, cfg.supabaseAnonKey).catch(() => false);
      const remoteOk = ready && await Cloud.isAvailable();
      if (remoteOk) {
        this.backend = 'remote';
        const authUser = await SupabaseAuth.getSessionUser().catch(() => null);
        if (authUser) this.currentUser = await Cloud.getUserById(authUser.id).catch(() => null);
        return;
      }
    }
    // Fallback: backend lokal (localStorage), perilaku sama seperti sebelumnya.
    this.backend = 'local';
    DB.seed();
    const sid = DB.getSession();
    this.currentUser = sid ? DB.getUserById(sid) : null;
  },

  getCurrentUser() { return this.currentUser; },

  async register(userData, proof) {
    if (this.backend === 'remote') {
      await apiFetch('auth-register', { ...userData, proof });
      await SupabaseAuth.signIn({ email: userData.email, password: userData.password });
      const authUser = await SupabaseAuth.getSessionUser();
      this.currentUser = await Cloud.getUserById(authUser.id);
      return this.currentUser;
    }
    const u = DB.addUser(userData);
    DB.setSession(u.id);
    this.currentUser = u;
    return u;
  },

  async login(email, password) {
    if (this.backend === 'remote') {
      const authUser = await SupabaseAuth.signIn({ email, password });
      this.currentUser = await Cloud.getUserById(authUser.id);
      return this.currentUser;
    }
    const u = DB.getUserByEmail(email);
    if (!u || u.password !== password) throw new Error('Email atau password salah.');
    DB.setSession(u.id);
    this.currentUser = u;
    return u;
  },

  async logout() {
    if (this.backend === 'remote') await SupabaseAuth.signOut();
    else DB.clearSession();
    this.currentUser = null;
  },

  async resetPassword({ phone, proof, newPassword }) {
    if (this.backend === 'remote') {
      await apiFetch('reset-password', { phone, proof, newPassword });
      return true;
    }
    const u = DB.getUserByPhone(phone);
    if (!u) throw new Error('Akun tidak ditemukan.');
    DB.updateUser(u.id, { password: newPassword });
    return true;
  },

  // ── Passthrough CRUD — sinkron (local) dibungkus otomatis jadi Promise ──
  async getNurses(filters)          { return this.backend==='remote' ? Cloud.getNurses(filters) : DB.getNurses(filters); },
  async getUserById(id)             { return this.backend==='remote' ? Cloud.getUserById(id) : DB.getUserById(id); },
  async getUserByPhone(phone)       { return this.backend==='remote' ? Cloud.getUserByPhone(phone) : DB.getUserByPhone(phone); },
  async updateUser(id, data) {
    const result = this.backend==='remote' ? await Cloud.updateUser(id, data) : DB.updateUser(id, data);
    if (this.currentUser && this.currentUser.id === id) this.currentUser = { ...this.currentUser, ...result };
    return result;
  },

  async getCampaigns()              { return this.backend==='remote' ? Cloud.getCampaigns() : DB.getCampaigns(); },
  async getCampaignById(id)         { return this.backend==='remote' ? Cloud.getCampaignById(id) : DB.getCampaignById(id); },
  async getCampaignsByUser(uid)     { return this.backend==='remote' ? Cloud.getCampaignsByUser(uid) : DB.getCampaignsByUser(uid); },
  async addCampaign(data)           { return this.backend==='remote' ? Cloud.addCampaign(data) : DB.addCampaign(data); },
  async updateCampaign(id, data)    { return this.backend==='remote' ? Cloud.updateCampaign(id, data) : DB.updateCampaign(id, data); },

  async getBookingsByPatient(uid)   { return this.backend==='remote' ? Cloud.getBookingsByPatient(uid) : DB.getBookingsByPatient(uid); },
  async getBookingsByNurse(uid)     { return this.backend==='remote' ? Cloud.getBookingsByNurse(uid) : DB.getBookingsByNurse(uid); },
  async getBookings()               { return this.backend==='remote' ? Cloud.getBookings() : DB.getBookings(); },
  async addBooking(data)            { return this.backend==='remote' ? Cloud.addBooking(data) : DB.addBooking(data); },
  async updateBooking(id, data)     { return this.backend==='remote' ? Cloud.updateBooking(id, data) : DB.updateBooking(id, data); },

  async getDonationsByUser(uid)     { return this.backend==='remote' ? Cloud.getDonationsByUser(uid) : DB.getDonationsByUser(uid); },
  async getDonationsByCampaign(cid) { return this.backend==='remote' ? Cloud.getDonationsByCampaign(cid) : DB.getDonationsByCampaign(cid); },
  async addDonation(data)           { return this.backend==='remote' ? Cloud.addDonation(data) : DB.addDonation(data); },

  async getPayoutsByUser(uid)       { return this.backend==='remote' ? Cloud.getPayoutsByUser(uid) : DB.getPayoutsByUser(uid); },
  async getPayoutsByCampaign(cid)   { return this.backend==='remote' ? Cloud.getPayoutsByCampaign(cid) : DB.getPayoutsByCampaign(cid); },
  async addPayoutRequest(data)      { return this.backend==='remote' ? Cloud.addPayoutRequest(data) : DB.addPayoutRequest(data); },
  async getNurseAvailablePayout(uid){ return this.backend==='remote' ? Cloud.getNurseAvailablePayout(uid) : DB.getNurseAvailablePayout(uid); },
  async getCampaignAvailablePayout(cid){ return this.backend==='remote' ? Cloud.getCampaignAvailablePayout(cid) : DB.getCampaignAvailablePayout(cid); },
};

// ── Export global ──────────────────────────────────────────
window.CloudDB  = Cloud;
window.AuthAPI  = SupabaseAuth;
window.Store    = Store;
