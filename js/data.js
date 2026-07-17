'use strict';
// =========================================================
// Akemat Foundation — Data Layer v3
// =========================================================

// ─── Constants ────────────────────────────────────────────────────────────────
const FEE = {
  BOOKING:  0.20,  // 20% platform fee dari total booking perawat
  DONATION: 0.05,  // 5%  biaya layanan dari total donasi
};

const SPECIALTIES = [
  'Perawat Jiwa',
  'Perawat Anak & Bayi',
  'Perawat Lansia',
  'Perawat Medical Bedah',
  'Perawat Luka',
  'Perawat Maternitas',
  'Perawat Paliatif',
];

const EDUCATION_LEVELS = [
  'D3 Keperawatan',
  'D4 Keperawatan',
  'Ners (Profesi)',
  'Spesialis Keperawatan',
];

const BANKS = [
  'BCA','BNI','BRI','Mandiri','CIMB Niaga','BSI',
  'Permata','Danamon','BTN','Jenius / SMBC','SeaBank',
  'OVO','GoPay','Jago',
];

const BOOKING_SERVICES = {
  'Perawat Jiwa':        ['Pendampingan Psikiatri','Terapi Perilaku','Manajemen Krisis','Pemantauan Obat Jiwa','Konseling Keluarga'],
  'Perawat Anak & Bayi': ['Perawatan Neonatus','Monitoring Tumbuh Kembang','Baby Massage','Imunisasi & Edukasi','Perawatan Bayi Prematur'],
  'Perawat Lansia':      ['Perawatan Lansia Umum','Fisioterapi Ringan','Monitoring TTV','Perawatan Inkontinensia','Stimulasi Kognitif'],
  'Perawat Medical Bedah':['Perawatan Luka Operasi','Injeksi & Infus','Perawatan Kateter','Monitoring TTV','Perawatan Drainase'],
  'Perawat Luka':        ['Perawatan Luka Akut','Perawatan Luka Kronis','Luka Diabetik','Debridement','Pressure Ulcer Care'],
  'Perawat Maternitas':  ['Perawatan Pasca Melahirkan','Konsultasi Laktasi','Perawatan Perineum','Senam Nifas','Edukasi ASI'],
  'Perawat Paliatif':    ['Manajemen Nyeri','Pendampingan Akhir Hayat','Perawatan Luka Paliatif','Dukungan Psikologis','Edukasi Keluarga'],
};

// ─── Keys ─────────────────────────────────────────────────────────────────────
const KEYS = {
  USERS:    'ak3_users',
  SESSION:  'ak3_session',
  CAMPAIGNS:'ak3_campaigns',
  BOOKINGS: 'ak3_bookings',
  DONATIONS:'ak3_donations',
  PAYOUTS:  'ak3_payouts',
  PATIENT_PROFILES: 'ak3_patient_profiles',
  REVIEWS:  'ak3_reviews',
  SEEDED:   'ak3_v3_seeded',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid()  { return '_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36); }
function dStr(offsetDays = 0) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}
function rpFmt(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_USERS = [
  // Pasien
  { id:'u-p1', name:'Budi Santoso', email:'pasien@test.com', password:'test123',
    role:'patient', phone:'081234561001', address:'Jl. Pajajaran No. 45, Bogor', createdAt:dStr(-30),
    bankInfo:{ bankName:'BCA', accountNumber:'1234567890', accountName:'Budi Santoso', verified:true } },

  // Donatur
  { id:'u-d1', name:'Ratna Dewi', email:'donatur@test.com', password:'test123',
    role:'donor', phone:'081234561002', organization:'Komunitas Peduli Sehat', createdAt:dStr(-20),
    bankInfo:{ bankName:'Mandiri', accountNumber:'0987654321', accountName:'Ratna Dewi', verified:true } },
  { id:'u-d2', name:'Eko Prasetyo', email:'eko@test.com', password:'test123',
    role:'donor', phone:'081234561011', organization:'Perkumpulan Warga RT 05', createdAt:dStr(-45),
    bankInfo:{ bankName:'BNI', accountNumber:'1122334455', accountName:'Eko Prasetyo', verified:false } },

  // Perawat 1 — Jiwa
  { id:'u-n1', name:'Siti Rahayu, S.Kep Ners', email:'perawat@test.com', password:'test123',
    role:'nurse', phone:'081234561003', createdAt:dStr(-60),
    bankInfo:{ bankName:'BCA', accountNumber:'8877665544', accountName:'Siti Rahayu', verified:true },
    np:{
      specialty:'Perawat Jiwa', education:'Ners (Profesi)', exp:7, price:160000,
      rating:4.8, reviews:124, loc:'Bogor', avail:true, verified:true,
      bio:'Perawat jiwa berpengalaman 7 tahun, terlatih menangani pasien skizofrenia, depresi berat, dan gangguan bipolar. Sabar, empatik, dan terlatih de-eskalasi krisis.',
      schedule:['Senin','Selasa','Rabu','Kamis','Jumat'],
      services: BOOKING_SERVICES['Perawat Jiwa'],
    }},

  // Perawat 2 — Medical Bedah
  { id:'u-n2', name:'Rudi Hartono, Amd.Kep', email:'rudi@nurse.com', password:'test123',
    role:'nurse', phone:'081234561004', createdAt:dStr(-90),
    bankInfo:{ bankName:'BRI', accountNumber:'3344556677', accountName:'Rudi Hartono', verified:true },
    np:{
      specialty:'Perawat Medical Bedah', education:'D3 Keperawatan', exp:5, price:130000,
      rating:4.6, reviews:87, loc:'Depok', avail:true, verified:true,
      bio:'Spesialis perawatan pasca operasi dan medical bedah. Alumni RSUD Depok, terlatih injeksi, infus, perawatan drainase, dan kateter.',
      schedule:['Senin','Rabu','Kamis','Sabtu'],
      services: BOOKING_SERVICES['Perawat Medical Bedah'],
    }},

  // Perawat 3 — Maternitas
  { id:'u-n3', name:'Maya Dewi, S.Tr.Keb', email:'maya@nurse.com', password:'test123',
    role:'nurse', phone:'081234561005', createdAt:dStr(-40),
    bankInfo:{ bankName:'Mandiri', accountNumber:'5566778899', accountName:'Maya Dewi', verified:true },
    np:{
      specialty:'Perawat Maternitas', education:'D4 Keperawatan', exp:4, price:115000,
      rating:4.9, reviews:203, loc:'Bogor', avail:true, verified:true,
      bio:'Bidan & perawat maternitas spesialis perawatan pasca melahirkan. Tersertifikasi konsultasi laktasi internasional (IBCLC) dan baby massage.',
      schedule:['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'],
      services: BOOKING_SERVICES['Perawat Maternitas'],
    }},

  // Perawat 4 — Luka
  { id:'u-n4', name:'Ahmad Fauzi, S.Kep Ners', email:'ahmad@nurse.com', password:'test123',
    role:'nurse', phone:'081234561006', createdAt:dStr(-120),
    bankInfo:{ bankName:'BSI', accountNumber:'6677889900', accountName:'Ahmad Fauzi', verified:true },
    np:{
      specialty:'Perawat Luka', education:'Ners (Profesi)', exp:9, price:175000,
      rating:4.7, reviews:156, loc:'Bogor', avail:false, verified:true,
      bio:'Perawat luka bersertifikat CWCCA. Senior 9 tahun menangani luka diabetik, pressure ulcer, luka post-operasi kompleks, dan wound debridement.',
      schedule:['Senin','Selasa','Rabu','Jumat'],
      services: BOOKING_SERVICES['Perawat Luka'],
    }},

  // Perawat 5 — Anak & Bayi
  { id:'u-n5', name:'Lestari Wulandari, Amd.Kep', email:'lestari@nurse.com', password:'test123',
    role:'nurse', phone:'081234561007', createdAt:dStr(-25),
    bankInfo:{ bankName:'BNI', accountNumber:'7788990011', accountName:'Lestari Wulandari', verified:false },
    np:{
      specialty:'Perawat Anak & Bayi', education:'D3 Keperawatan', exp:3, price:95000,
      rating:4.5, reviews:42, loc:'Tangerang', avail:true, verified:false,
      bio:'Perawat anak & bayi yang teliti dan komunikatif. Terlatih perawatan bayi prematur, stimulasi tumbuh kembang, dan perawatan anak berkebutuhan khusus.',
      schedule:['Selasa','Rabu','Kamis','Jumat','Sabtu'],
      services: BOOKING_SERVICES['Perawat Anak & Bayi'],
    }},

  // Perawat 6 — Paliatif
  { id:'u-n6', name:'Budi Prasetyo, S.Kep Sp.KMB', email:'budip@nurse.com', password:'test123',
    role:'nurse', phone:'081234561008', createdAt:dStr(-180),
    bankInfo:{ bankName:'BCA', accountNumber:'8899001122', accountName:'Budi Prasetyo', verified:true },
    np:{
      specialty:'Perawat Paliatif', education:'Spesialis Keperawatan', exp:6, price:200000,
      rating:4.9, reviews:98, loc:'Bogor', avail:true, verified:true,
      bio:'Perawat paliatif spesialis dengan pengalaman 6 tahun mendampingi pasien kanker terminal dan keluarganya. Bersertifikat palliative care internasional.',
      schedule:['Senin','Rabu','Jumat','Sabtu'],
      services: BOOKING_SERVICES['Perawat Paliatif'],
    }},

  // Perawat 7 — Jiwa (Depok)
  { id:'u-n7', name:'Nur Hidayah, S.Kep Ners', email:'nur@nurse.com', password:'test123',
    role:'nurse', phone:'081234561009', createdAt:dStr(-50),
    bankInfo:{ bankName:'BRI', accountNumber:'2233445566', accountName:'Nur Hidayah', verified:true },
    np:{
      specialty:'Perawat Jiwa', education:'Ners (Profesi)', exp:8, price:150000,
      rating:4.7, reviews:167, loc:'Depok', avail:true, verified:true,
      bio:'Perawat jiwa & geronto-psikiatri berpengalaman. Spesialisasi demensia, Alzheimer, delirium pada lansia, dan gangguan mood. Empatik dan sabar.',
      schedule:['Senin','Selasa','Kamis','Jumat','Sabtu'],
      services: BOOKING_SERVICES['Perawat Jiwa'],
    }},

  // Perawat 8 — Lansia
  { id:'u-n8', name:'Dedi Kurniawan, Amd.Kep', email:'dedi@nurse.com', password:'test123',
    role:'nurse', phone:'081234561010', createdAt:dStr(-75),
    bankInfo:{ bankName:'Mandiri', accountNumber:'3344221100', accountName:'Dedi Kurniawan', verified:true },
    np:{
      specialty:'Perawat Lansia', education:'D3 Keperawatan', exp:5, price:120000,
      rating:4.8, reviews:73, loc:'Bogor', avail:true, verified:true,
      bio:'Perawat lansia terlatih ROM exercise, perawatan luka decubitus, monitoring hipertensi dan DM pada lansia. Ramah dan komunikatif dengan keluarga.',
      schedule:['Senin','Selasa','Rabu','Kamis'],
      services: BOOKING_SERVICES['Perawat Lansia'],
    }},
];

const SEED_CAMPAIGNS = [
  { id:'c-1',
    title:'Bantu Perawatan Jiwa Ibu Sulastri Pasca Rawat Inap RSKD',
    story:'Ibu Sulastri (54 tahun) baru saja keluar dari RSKD Duren Sawit setelah menjalani rawat inap 3 minggu karena episode psikosis akut. Beliau membutuhkan perawat jiwa yang datang ke rumah setiap hari untuk memastikan kepatuhan minum obat, memantau kondisi mental, dan mendampingi keluarga agar tidak kelelahan merawat sendirian. Suaminya yang sudah pensiun dan dua anaknya yang masih kuliah sangat membutuhkan bantuan untuk membiayai perawatan setidaknya 3 bulan ke depan.',
    target:9000000, current:5800000, category:'Perawat Jiwa',
    createdBy:'u-d1', creatorName:'Keluarga Ibu Sulastri', deadline:dStr(40),
    donorCount:67, verified:true, createdAt:dStr(-14),
    bankInfo:{ bankName:'BCA', accountNumber:'9988776655', accountName:'Keluarga Sulastri', verified:true } },

  { id:'c-2',
    title:'Operasi & Perawatan Luka Pak Bambang Penderita Kanker Usus',
    story:'Pak Bambang (58 tahun) seorang supir ojek online didiagnosis kanker usus stadium 3. Setelah operasi kolostomi, beliau membutuhkan perawat luka yang datang ke rumah rutin 3x seminggu selama minimal 4 bulan untuk perawatan stoma dan luka insisi. Istri dan dua anaknya yang masih sekolah sangat membutuhkan dukungan finansial dari masyarakat.',
    target:10000000, current:8500000, category:'Perawat Luka',
    createdBy:'u-d2', creatorName:'Komunitas Ojol Bogor', deadline:dStr(10),
    donorCount:132, verified:true, createdAt:dStr(-20),
    bankInfo:{ bankName:'BNI', accountNumber:'1122998877', accountName:'Yenny Bambang', verified:true } },

  { id:'c-3',
    title:'Perawatan Bayi Prematur Khalid — Lahir 30 Minggu',
    story:'Khalid lahir prematur pada usia kandungan 30 minggu dan baru keluar dari NICU setelah sebulan dirawat. Ia masih membutuhkan perawat anak & bayi di rumah selama 2 bulan untuk monitoring perkembangan, stimulasi, dan edukasi ibunya. Ibu Sari adalah ibu tunggal yang berdagang kecil-kecilan dan tidak mampu menanggung seluruh biaya sendiri.',
    target:7000000, current:2100000, category:'Perawat Anak & Bayi',
    createdBy:'u-d1', creatorName:'Komunitas Ibu Sehat Bogor', deadline:dStr(55),
    donorCount:27, verified:false, createdAt:dStr(-5),
    bankInfo:{ bankName:'Mandiri', accountNumber:'0011223344', accountName:'Sari Rahmawati', verified:false } },

  { id:'c-4',
    title:'Rehabilitasi & Perawatan Paliatif Bapak Hendra (Kanker Stadium 4)',
    story:'Bapak Hendra (65 tahun) terdiagnosis kanker paru stadium 4. Dokter menyarankan perawatan paliatif di rumah untuk meningkatkan kualitas hidup beliau bersama keluarga di sisa waktunya. Dibutuhkan perawat paliatif yang datang setiap hari untuk manajemen nyeri, perawatan luka, dan dukungan psikologis kepada keluarga.',
    target:15000000, current:11000000, category:'Perawat Paliatif',
    createdBy:'u-d2', creatorName:'Keluarga Bapak Hendra', deadline:dStr(20),
    donorCount:89, verified:true, createdAt:dStr(-25),
    bankInfo:{ bankName:'BCA', accountNumber:'5544332211', accountName:'Diana Hendra', verified:true } },

  { id:'c-5',
    title:'Perawatan Maternitas & Laktasi untuk Ibu Kembar Tiga',
    story:'Ibu Dewi (29 tahun) melahirkan kembar tiga secara prematur bulan lalu. Ketiga bayinya kini di rumah namun membutuhkan monitoring intensif. Ibu Dewi juga memerlukan pendampingan konsultasi laktasi dan perawatan pasca operasi sesar. Suaminya baru saja di-PHK, sehingga keluarga membutuhkan bantuan pembiayaan perawat maternitas selama 2 bulan.',
    target:8000000, current:4400000, category:'Perawat Maternitas',
    createdBy:'u-d1', creatorName:'Yayasan Akemat', deadline:dStr(35),
    donorCount:61, verified:true, createdAt:dStr(-10),
    bankInfo:{ bankName:'BRI', accountNumber:'6655443322', accountName:'Dewi Lestari', verified:true } },
];

const SEED_BOOKINGS = [
  { id:'bk-1', patientId:'u-p1', nurseId:'u-n1',
    nurseName:'Siti Rahayu, S.Kep Ners', nurseSpecialty:'Perawat Jiwa',
    service:'Pendampingan Psikiatri', date:dStr(3), time:'09:00', duration:3,
    address:'Jl. Pajajaran No. 45, Bogor', status:'confirmed', paymentStatus:'paid',
    totalCost:480000, platformFee:96000, nursePay:384000,
    notes:'Anggota keluarga dengan riwayat gangguan bipolar', createdAt:dStr(-2) },
  { id:'bk-2', patientId:'u-p1', nurseId:'u-n3',
    nurseName:'Maya Dewi, S.Tr.Keb', nurseSpecialty:'Perawat Maternitas',
    service:'Konsultasi Laktasi', date:dStr(-5), time:'10:00', duration:2,
    address:'Jl. Pajajaran No. 45, Bogor', status:'completed', paymentStatus:'paid',
    totalCost:230000, platformFee:46000, nursePay:184000,
    notes:'', createdAt:dStr(-8) },
  { id:'bk-3', patientId:'u-p1', nurseId:'u-n6',
    nurseName:'Budi Prasetyo, S.Kep Sp.KMB', nurseSpecialty:'Perawat Paliatif',
    service:'Manajemen Nyeri', date:dStr(7), time:'14:00', duration:2,
    address:'Jl. Pajajaran No. 45, Bogor', status:'pending', paymentStatus:'unpaid',
    totalCost:400000, platformFee:80000, nursePay:320000,
    notes:'Pasien kanker stadium 3, nyeri punggung bawah', createdAt:dStr(-1) },
];

const SEED_DONATIONS = [
  { id:'dn-1', campaignId:'c-1', donorId:'u-p1', donorName:'Budi Santoso',
    amount:100000, platformFee:5000, netAmount:95000, date:dStr(-3), anonymous:false, paymentStatus:'paid' },
  { id:'dn-2', campaignId:'c-4', donorId:'u-p1', donorName:'Budi Santoso',
    amount:250000, platformFee:12500, netAmount:237500, date:dStr(-7), anonymous:false, paymentStatus:'paid' },
];

// ─── DB Layer ─────────────────────────────────────────────────────────────────
const DB = {
  seed() {
    if (localStorage.getItem(KEYS.SEEDED)) return;
    localStorage.setItem(KEYS.USERS,     JSON.stringify(SEED_USERS));
    localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(SEED_CAMPAIGNS));
    localStorage.setItem(KEYS.BOOKINGS,  JSON.stringify(SEED_BOOKINGS));
    localStorage.setItem(KEYS.DONATIONS, JSON.stringify(SEED_DONATIONS));
    localStorage.setItem(KEYS.SEEDED, '1');
  },

  // Users
  getUsers()         { return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'); },
  saveUsers(u)       { localStorage.setItem(KEYS.USERS, JSON.stringify(u)); },
  getUserById(id)    { return this.getUsers().find(u => u.id === id) || null; },
  getUserByEmail(em) { return this.getUsers().find(u => u.email.toLowerCase() === em.toLowerCase()) || null; },
  getUserByPhone(ph) { const digits = String(ph||'').replace(/\D/g,''); return this.getUsers().find(u => String(u.phone||'').replace(/\D/g,'') === digits) || null; },
  addUser(data) {
    const users = this.getUsers();
    const user  = { id: uid(), createdAt: dStr(), bankInfo: { bankName:'', accountNumber:'', accountName:'', verified:false }, ...data };
    users.push(user); this.saveUsers(users); return user;
  },
  updateUser(id, data) {
    const users = this.getUsers();
    const i = users.findIndex(u => u.id === id);
    if (i < 0) return null;
    users[i] = { ...users[i], ...data }; this.saveUsers(users); return users[i];
  },

  // Session
  setSession(id)   { localStorage.setItem(KEYS.SESSION, id); },
  getSession()     { return localStorage.getItem(KEYS.SESSION); },
  clearSession()   { localStorage.removeItem(KEYS.SESSION); },
  getCurrentUser() { const id = this.getSession(); return id ? this.getUserById(id) : null; },

  // Nurses
  getNurses(filters = {}) {
    let nurses = this.getUsers().filter(u => u.role === 'nurse' && u.np);
    if (filters.specialty && filters.specialty !== 'Semua')
      nurses = nurses.filter(n => n.np.specialty === filters.specialty);
    if (filters.avail)       nurses = nurses.filter(n => n.np.avail);
    if (filters.education && filters.education !== 'Semua')
      nurses = nurses.filter(n => n.np.education === filters.education);
    if (filters.maxPrice)    nurses = nurses.filter(n => n.np.price <= +filters.maxPrice);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      nurses = nurses.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.np.specialty.toLowerCase().includes(q) ||
        n.np.loc.toLowerCase().includes(q));
    }
    return nurses;
  },

  // Campaigns
  getCampaigns()         { return JSON.parse(localStorage.getItem(KEYS.CAMPAIGNS) || '[]'); },
  saveCampaigns(c)       { localStorage.setItem(KEYS.CAMPAIGNS, JSON.stringify(c)); },
  getCampaignById(id)    { return this.getCampaigns().find(c => c.id === id) || null; },
  getCampaignsByUser(uid){ return this.getCampaigns().filter(c => c.createdBy === uid); },
  addCampaign(data) {
    const cams = this.getCampaigns();
    const c = { id: uid(), current: 0, donorCount: 0, createdAt: dStr(),
      bankInfo:{ bankName:'', accountNumber:'', accountName:'', verified:false }, ...data };
    cams.push(c); this.saveCampaigns(cams); return c;
  },
  updateCampaign(id, data) {
    const cams = this.getCampaigns();
    const i = cams.findIndex(c => c.id === id);
    if (i < 0) return null;
    cams[i] = { ...cams[i], ...data }; this.saveCampaigns(cams); return cams[i];
  },

  // Bookings
  getBookings()             { return JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || '[]'); },
  saveBookings(b)           { localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(b)); },
  getBookingsByPatient(uid) { return this.getBookings().filter(b => b.patientId === uid); },
  getBookingsByNurse(uid)   { return this.getBookings().filter(b => b.nurseId === uid); },
  addBooking(data) {
    const bs = this.getBookings();
    const totalCost   = data.totalCost || 0;
    const platformFee = Math.round(totalCost * FEE.BOOKING);
    const nursePay    = totalCost - platformFee;
    // paymentStatus selalu dimulai 'unpaid' — hanya berubah 'paid' setelah dikonfirmasi DOKU
    const b = { id: uid(), status: 'pending', createdAt: dStr(), platformFee, nursePay, ...data, paymentStatus: data.paymentStatus === 'paid' ? 'paid' : 'unpaid' };
    bs.push(b); this.saveBookings(bs); return b;
  },
  updateBooking(id, data) {
    const bs = this.getBookings();
    const i  = bs.findIndex(b => b.id === id);
    if (i < 0) return null;
    bs[i] = { ...bs[i], ...data }; this.saveBookings(bs); return bs[i];
  },

  // Patient profiles (multi-pasien per akun)
  getPatientProfiles(accountId)  { return JSON.parse(localStorage.getItem(KEYS.PATIENT_PROFILES) || '[]').filter(p => p.accountId === accountId); },
  saveAllPatientProfiles(list)   { localStorage.setItem(KEYS.PATIENT_PROFILES, JSON.stringify(list)); },
  getPatientProfileById(id)      { return JSON.parse(localStorage.getItem(KEYS.PATIENT_PROFILES) || '[]').find(p => p.id === id) || null; },
  addPatientProfile(data) {
    const all = JSON.parse(localStorage.getItem(KEYS.PATIENT_PROFILES) || '[]');
    const p = { id: uid(), relationship: 'Diri Sendiri', ktpStatus: 'pending', createdAt: dStr(), ...data };
    all.push(p); this.saveAllPatientProfiles(all); return p;
  },
  updatePatientProfile(id, data) {
    const all = JSON.parse(localStorage.getItem(KEYS.PATIENT_PROFILES) || '[]');
    const i = all.findIndex(p => p.id === id);
    if (i < 0) return null;
    all[i] = { ...all[i], ...data }; this.saveAllPatientProfiles(all); return all[i];
  },
  deletePatientProfile(id) {
    const all = JSON.parse(localStorage.getItem(KEYS.PATIENT_PROFILES) || '[]');
    this.saveAllPatientProfiles(all.filter(p => p.id !== id));
    return true;
  },

  // Reviews (rating perawat)
  getReviews()            { return JSON.parse(localStorage.getItem(KEYS.REVIEWS) || '[]'); },
  saveReviews(r)          { localStorage.setItem(KEYS.REVIEWS, JSON.stringify(r)); },
  getReviewsByNurse(nid)  { return this.getReviews().filter(r => r.nurseId === nid); },
  getReviewsByPatient(pid){ return this.getReviews().filter(r => r.patientId === pid); },
  addReview(data) {
    const all = this.getReviews();
    if (all.some(r => r.bookingId === data.bookingId)) throw new Error('Booking ini sudah pernah diulas.');
    const booking = this.getBookings().find(b => b.id === data.bookingId);
    if (!booking || booking.status !== 'completed') throw new Error('Janji temu tidak ditemukan atau belum selesai.');
    const patient = this.getUserById(booking.patientId);
    const r = {
      id: uid(), bookingId: data.bookingId, nurseId: booking.nurseId, patientId: booking.patientId,
      patientName: patient?.name || 'Pasien', rating: data.rating, comment: data.comment || '', createdAt: dStr(),
    };
    all.push(r); this.saveReviews(all);
    // Hitung ulang rating rata-rata & jumlah ulasan, sama seperti RPC recompute_nurse_rating di Supabase.
    const nurseReviews = this.getReviewsByNurse(booking.nurseId);
    const avg = nurseReviews.reduce((s, x) => s + x.rating, 0) / nurseReviews.length;
    const nurse = this.getUserById(booking.nurseId);
    if (nurse) this.updateUser(booking.nurseId, { np: { ...nurse.np, rating: Math.round(avg * 10) / 10, reviews: nurseReviews.length } });
    return r;
  },

  // Donations
  getDonations()            { return JSON.parse(localStorage.getItem(KEYS.DONATIONS) || '[]'); },
  saveDonations(d)          { localStorage.setItem(KEYS.DONATIONS, JSON.stringify(d)); },
  getDonationsByUser(uid)   { return this.getDonations().filter(d => d.donorId === uid); },
  getDonationsByCampaign(cid){ return this.getDonations().filter(d => d.campaignId === cid); },
  // Dipanggil HANYA setelah pembayaran DOKU terkonfirmasi (lihat payment-return.html).
  // Campaign hanya bertambah jika paymentStatus:'paid' — mencegah donasi "tercatat" tanpa pembayaran nyata.
  addDonation(data) {
    if (data.referenceId && this.getDonations().some(d => d.referenceId === data.referenceId)) {
      return this.getDonations().find(d => d.referenceId === data.referenceId); // cegah duplikat (refresh halaman return)
    }
    const ds          = this.getDonations();
    const amount      = data.amount || 0;
    const platformFee = Math.round(amount * FEE.DONATION);
    const netAmount   = amount - platformFee;
    const paymentStatus = data.paymentStatus === 'paid' ? 'paid' : 'unpaid';
    const d = { id: uid(), date: dStr(), platformFee, netAmount, ...data, paymentStatus };
    ds.push(d); this.saveDonations(ds);
    if (paymentStatus === 'paid') {
      const cam = this.getCampaignById(data.campaignId);
      if (cam) this.updateCampaign(data.campaignId, {
        current: cam.current + amount, donorCount: cam.donorCount + 1 });
    }
    return d;
  },

  // Payouts (pencairan dana) — perawat & pemilik campaign
  getPayouts()               { return JSON.parse(localStorage.getItem(KEYS.PAYOUTS) || '[]'); },
  savePayouts(p)             { localStorage.setItem(KEYS.PAYOUTS, JSON.stringify(p)); },
  getPayoutsByUser(uid)      { return this.getPayouts().filter(p => p.recipientType==='nurse' && p.userId===uid); },
  getPayoutsByCampaign(cid)  { return this.getPayouts().filter(p => p.recipientType==='campaign_owner' && p.campaignId===cid); },
  addPayoutRequest(data) {
    const ps = this.getPayouts();
    const p  = { id: uid(), status: 'pending', requestedAt: dStr(), ...data };
    ps.push(p); this.savePayouts(ps); return p;
  },

  // Saldo yang sudah dicairkan/diajukan (pending+processing+completed dianggap "terpakai")
  payoutUsed(list) { return list.filter(p=>p.status!=='rejected').reduce((s,p)=>s+p.amount,0); },

  // Saldo tersedia perawat = penghasilan booking selesai+lunas − yang sudah diajukan/dicairkan
  getNurseAvailablePayout(uid) {
    const earned = this.getBookingsByNurse(uid)
      .filter(b => b.status==='completed' && b.paymentStatus==='paid')
      .reduce((s,b)=>s+(b.nursePay||0),0);
    return Math.max(0, earned - this.payoutUsed(this.getPayoutsByUser(uid)));
  },

  // Saldo tersedia campaign = donasi bersih (95%) yang sudah lunas − yang sudah diajukan/dicairkan
  getCampaignAvailablePayout(cid) {
    const raised = this.getDonationsByCampaign(cid)
      .filter(d => d.paymentStatus==='paid')
      .reduce((s,d)=>s+(d.netAmount||0),0);
    return Math.max(0, raised - this.payoutUsed(this.getPayoutsByCampaign(cid)));
  },

  // Stats helper
  getPlatformStats() {
    const donations = this.getDonations();
    const bookings  = this.getBookings();
    const totalDonFee = donations.reduce((s, d) => s + (d.platformFee || 0), 0);
    const totalBkgFee = bookings.filter(b => b.status === 'completed')
      .reduce((s, b) => s + (b.platformFee || 0), 0);
    return {
      totalDonations: donations.reduce((s, d) => s + d.amount, 0),
      totalBookings:  bookings.length,
      platformRevenue: totalDonFee + totalBkgFee,
    };
  },
};
