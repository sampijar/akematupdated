'use strict';
// =========================================================
// Akemat Foundation — Panel Admin
// Dipecah dari app.js dan dimuat lewat dynamic import() dari
// route() — halaman ini cuma dipakai admin, tidak perlu ikut
// ter-parse di initial load pengguna biasa.
// Memakai helper global dari app.js (esc, rpFmt, app, toast, navigate,
// Store, apiFetch, Otp, ktpThumb, ICON, customConfirm, downloadCsv, ID_MONTHS).
// =========================================================

// 2FA Panel Admin — bukti OTP WA (dari lib/otpProof.js lewat /api/fazpass-otp,
// dipakai ulang, lihat komentar di api/admin.js) disimpan di memori saja,
// bukan localStorage — hilang otomatis kalau tab ditutup/direfresh, dan
// kadaluarsa sendiri di server setelah 15 menit walau tab tetap terbuka.
let adminOtpProof = null;

function renderAdminOtpGate(u){
  if(!u.phone){
    app.innerHTML = '<div class="container" style="padding:60px 20px;text-align:center;max-width:420px;margin:0 auto">'+
      '<div style="font-size:2.5rem;margin-bottom:10px">🔒</div>'+
      '<h2>Nomor HP belum diisi</h2>'+
      '<p style="color:var(--soft);margin:8px 0 20px">Verifikasi 2FA Panel Admin butuh nomor HP terdaftar. Isi dulu di halaman Profil.</p>'+
      '<a href="#profil" class="btn btn-primary">Ke Halaman Profil</a></div>';
    return;
  }
  app.innerHTML = '<div class="container" style="padding:60px 20px;max-width:420px;margin:0 auto">'+
    '<div style="text-align:center;margin-bottom:20px"><div style="font-size:2.5rem">🔐</div>'+
    '<h2>Verifikasi 2FA</h2>'+
    '<p style="color:var(--soft);font-size:.88rem">Panel Admin butuh verifikasi tambahan via WhatsApp ke nomor terdaftar Anda ('+esc(u.phone.replace(/^62/,'0'))+').</p></div>'+
    '<div id="aoStep1"><button class="btn btn-primary btn-full" id="btnAoSend">Kirim Kode OTP WA</button></div>'+
    '<div id="aoStep2" style="display:none;margin-top:14px">'+
    '<div class="ff"><label>Kode OTP WhatsApp</label><input type="text" id="aoCode" inputmode="numeric" maxlength="6" placeholder="6 digit kode" style="letter-spacing:.3em" /></div>'+
    '<button class="btn btn-primary btn-full" id="btnAoVerify">Verifikasi &amp; Masuk</button></div>'+
    '<div class="form-error" id="aoErr"></div>'+
    '</div>';

  let requestId = null;
  document.getElementById('btnAoSend')?.addEventListener('click', async (ev)=>{
    const btn = ev.currentTarget;
    if(btn.disabled) return;
    const err = document.getElementById('aoErr'); err.textContent = '';
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Mengirim…';
    try {
      requestId = await Otp.send(u.phone);
      document.getElementById('aoStep1').style.display = 'none';
      document.getElementById('aoStep2').style.display = 'block';
      toast('Kode OTP dikirim via WhatsApp.','s');
    } catch(e) {
      err.textContent = e.message || 'Gagal mengirim OTP.';
      btn.disabled = false; btn.textContent = orig;
    }
  });
  document.getElementById('btnAoVerify')?.addEventListener('click', async (ev)=>{
    const btn = ev.currentTarget;
    if(btn.disabled) return;
    const err = document.getElementById('aoErr'); err.textContent = '';
    const code = document.getElementById('aoCode')?.value.trim();
    if(!code){ err.textContent = 'Isi kode OTP.'; return; }
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Memverifikasi…';
    try {
      adminOtpProof = await Otp.verify(requestId, code, u.phone);
      renderAdminDash();
    } catch(e) {
      err.textContent = e.message || 'Kode OTP salah atau kadaluarsa.';
      btn.disabled = false; btn.textContent = orig;
    }
  });
}

// ── Statistik Panel Admin ──────────────────────────────────
// Dihitung di klien dari data mentah (listBookings/listDonations, sama
// yang dipakai tombol export CSV) — tidak ada endpoint agregasi terpisah
// di server, jumlah barisnya (maks 2.000/tabel) masih wajar dihitung di
// browser tanpa lag berarti.
function computeAdminStats(bookings, donations){
  const now = new Date();
  const months = [];
  for(let i=11;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({ key: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'), label: ID_MONTHS[d.getMonth()].slice(0,3) });
  }
  const bookingByMonth = new Map(months.map(m=>[m.key,0]));
  bookings.forEach(b=>{
    const key = String(b.created_at||'').slice(0,7);
    if(bookingByMonth.has(key)) bookingByMonth.set(key, bookingByMonth.get(key)+1);
  });
  const donationByMonth = new Map(months.map(m=>[m.key,0]));
  donations.forEach(d=>{
    const key = String(d.created_at||'').slice(0,7);
    if(donationByMonth.has(key)) donationByMonth.set(key, donationByMonth.get(key)+(d.amount||0));
  });
  const bookingTrend  = months.map(m=>({ label:m.label, value: bookingByMonth.get(m.key) }));
  const donationTrend = months.map(m=>({ label:m.label, value: donationByMonth.get(m.key) }));

  const nurseCount = new Map();
  bookings.forEach(b=>{
    if(b.status !== 'completed') return;
    const name = b.nurse_name || 'Tanpa nama';
    nurseCount.set(name, (nurseCount.get(name)||0)+1);
  });
  const topNurses = [...nurseCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([label,value])=>({label,value}));

  const totalBookingRevenue = bookings.reduce((s,b)=>s+(b.payment_status==='paid'?(b.total_cost||0):0),0);
  const totalDonationRaised = donations.reduce((s,d)=>s+(d.payment_status==='paid'?(d.amount||0):0),0);
  const paidBookingCount    = bookings.filter(b=>b.payment_status==='paid').length;
  const paidDonationCount   = donations.filter(d=>d.payment_status==='paid').length;

  return { bookingTrend, donationTrend, topNurses, totalBookingRevenue, totalDonationRaised, paidBookingCount, paidDonationCount };
}
function statTileRow(items){
  return '<div class="stat-row" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:20px">'+
    items.map(function(it){ return '<div class="stat-card"><div><div class="stat-val">'+esc(it.value)+'</div><div class="stat-lbl">'+esc(it.label)+'</div></div></div>'; }).join('')+
  '</div>';
}
// Grafik batang vertikal (tren bulanan) — satu hue per grafik (sequential),
// bukan warna beda tiap batang, supaya tidak ada kesan "kategori" yang
// sebenarnya tidak ada (ini satu seri data dari waktu ke waktu).
function monthlyBarChart(title, dataPoints, colorVar, formatFn){
  formatFn = formatFn || String;
  const max = Math.max(1, ...dataPoints.map(d=>d.value));
  return '<div class="chart-block">'+
    '<h4 class="chart-title">'+esc(title)+'</h4>'+
    '<div class="chart-vbars">'+
    dataPoints.map(function(d){
      const pct = d.value>0 ? Math.max(4, Math.round((d.value/max)*100)) : 1;
      return '<div class="chart-vbar-col" title="'+esc(d.label+': '+formatFn(d.value))+'">'+
        '<div class="chart-vbar" style="height:'+pct+'%;background:'+colorVar+'"></div>'+
        '<span class="chart-vbar-label">'+esc(d.label)+'</span>'+
      '</div>';
    }).join('')+
    '</div></div>';
}
function rankedBarChart(title, dataPoints, colorVar){
  if(!dataPoints.length) return '<div class="chart-block"><h4 class="chart-title">'+esc(title)+'</h4><p style="color:var(--soft);font-size:.82rem">Belum ada data.</p></div>';
  const max = Math.max(1, ...dataPoints.map(d=>d.value));
  return '<div class="chart-block">'+
    '<h4 class="chart-title">'+esc(title)+'</h4>'+
    '<div class="chart-bars">'+
    dataPoints.map(function(d){
      const pct = Math.max(4, Math.round((d.value/max)*100));
      return '<div class="chart-bar-row">'+
        '<span class="chart-bar-label">'+esc(d.label)+'</span>'+
        '<div class="chart-bar-track"><div class="chart-bar-fill" style="width:'+pct+'%;background:'+colorVar+'"></div></div>'+
        '<span class="chart-bar-value">'+d.value+'</span>'+
      '</div>';
    }).join('')+
    '</div></div>';
}

export async function renderAdminDash(){
  const u = Store.getCurrentUser();
  if(!u){ toast('Silakan login terlebih dahulu.','e'); navigate('#login'); return; }
  if(!adminOtpProof){ renderAdminOtpGate(u); return; }
  app.innerHTML = '<div class="app-loading"><div class="app-loading-spinner"></div><p>Memuat data admin…</p></div>';

  async function adminApi(payload){
    try {
      return await apiFetch('admin', { ...payload, adminOtpProof });
    } catch(e) {
      if(e.code === 'OTP_REQUIRED'){ adminOtpProof = null; toast('Sesi verifikasi 2FA berakhir, silakan verifikasi ulang.','e'); }
      throw e;
    }
  }

  let ktps = [], patKtps = [], camps = [], promos = [], auditLog = [], statBookings = [], statDonations = [];
  try {
    const [rk, rpk, rc, rp, ra, rb, rd] = await Promise.all([
      adminApi({ action:'listPendingKtp' }),
      adminApi({ action:'listPendingPatientKtp' }),
      adminApi({ action:'listPendingCampaigns' }),
      adminApi({ action:'listPromoCodes' }),
      adminApi({ action:'listAuditLog' }),
      adminApi({ action:'listBookings' }),
      adminApi({ action:'listDonations' }),
    ]);
    ktps     = rk.data  || [];
    patKtps = rpk.data || [];
    camps    = rc.data  || [];
    promos   = rp.data  || [];
    auditLog = ra.data  || [];
    statBookings  = rb.data || [];
    statDonations = rd.data || [];
  } catch(e) {
    if(!adminOtpProof){ renderAdminOtpGate(u); return; }
    app.innerHTML = '<div class="container" style="padding:60px 20px;text-align:center;max-width:420px;margin:0 auto">'+
      '<div style="font-size:2.5rem;margin-bottom:10px">🔒</div>'+
      '<h2>Akses Ditolak</h2>'+
      '<p style="color:var(--soft);margin:8px 0 20px">'+esc(e.message||'Akun ini tidak punya akses admin.')+'</p>'+
      '<a href="#" class="btn btn-primary">Kembali ke Beranda</a></div>';
    return;
  }

  function ktpCard(k){
    return '<div class="dash-section" id="ktp-row-'+k.id+'" style="margin-bottom:12px">'+
      '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">'+
      ktpThumb(k.ktp_url, { showEmpty:true })+
      '<div style="flex:1;min-width:180px">'+
      '<div style="font-family:var(--font-d);font-weight:700">'+esc(k.name)+'</div>'+
      '<div style="font-size:.8rem;color:var(--soft)">'+esc(k.email)+' · '+esc(k.phone||'—')+'</div>'+
      '<div style="font-size:.74rem;color:var(--soft);margin-top:4px">Diunggah: '+esc((k.created_at||'').slice(0,10))+'</div>'+
      '<div class="acts" style="margin-top:10px;display:flex;gap:8px">'+
      '<button class="btn btn-primary btn-sm" data-approve-ktp="'+k.id+'">✓ Setujui</button>'+
      '<button class="btn btn-outline btn-sm" data-reject-ktp="'+k.id+'">✕ Tolak</button>'+
      '</div></div></div></div>';
  }
  function patKtpCard(k){
    return '<div class="dash-section" id="pkt-row-'+k.id+'" style="margin-bottom:12px">'+
      '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">'+
      ktpThumb(k.ktp_url, { showEmpty:true })+
      '<div style="flex:1;min-width:180px">'+
      '<div style="font-family:var(--font-d);font-weight:700">'+esc(k.name)+' <span style="font-weight:400;color:var(--soft);font-size:.8rem">('+esc(k.relationship)+')</span></div>'+
      '<div style="font-size:.74rem;color:var(--soft);margin-top:4px">Diunggah: '+esc((k.created_at||'').slice(0,10))+'</div>'+
      '<div class="acts" style="margin-top:10px;display:flex;gap:8px">'+
      '<button class="btn btn-primary btn-sm" data-approve-pkt="'+k.id+'">✓ Setujui</button>'+
      '<button class="btn btn-outline btn-sm" data-reject-pkt="'+k.id+'">✕ Tolak</button>'+
      '</div></div></div></div>';
  }
  function campCard(c){
    return '<div class="dash-section" id="camp-row-'+c.id+'" style="margin-bottom:12px">'+
      '<div style="font-family:var(--font-d);font-weight:700">'+esc(c.title)+'</div>'+
      '<div style="font-size:.8rem;color:var(--soft)">oleh '+esc(c.creator_name)+' · target '+rpFmt(c.target)+'</div>'+
      '<div style="font-size:.8rem;margin-top:6px">🏦 '+esc(c.bank_name||'—')+' — '+esc(c.bank_account_number||'—')+' a.n. '+esc(c.bank_account_name||'—')+'</div>'+
      '<div class="acts" style="margin-top:10px;display:flex;gap:8px">'+
      '<button class="btn btn-primary btn-sm" data-approve-camp="'+c.id+'">✓ Setujui</button>'+
      '<button class="btn btn-danger btn-sm" data-delete-camp="'+c.id+'">🗑 Hapus</button>'+
      '</div></div>';
  }

  function promoRow(pc){
    var discTxt = pc.discount_type==='percent' ? pc.discount_value+'%' : rpFmt(pc.discount_value);
    var usageTxt = pc.max_uses!=null ? (pc.used_count||0)+' / '+pc.max_uses+' dipakai' : (pc.used_count||0)+' dipakai (tanpa batas)';
    var statusCls = pc.active ? 'verified' : 'empty';
    var statusLbl = pc.active ? '✓ Aktif' : '✕ Nonaktif';
    return '<div class="dash-section" id="promo-row-'+pc.id+'" style="margin-bottom:12px">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">'+
      '<div><div style="font-family:var(--font-d);font-weight:700">'+esc(pc.code)+'</div>'+
      '<div style="font-size:.8rem;color:var(--soft)">Potongan '+discTxt+(pc.min_amount?' · min. '+rpFmt(pc.min_amount):'')+' · berlaku untuk '+esc(pc.applies_to)+'</div>'+
      '<div style="font-size:.76rem;color:var(--soft);margin-top:2px">'+usageTxt+'</div></div>'+
      '<span class="bank-status '+statusCls+'">'+statusLbl+'</span>'+
      '</div>'+
      '<div class="acts" style="margin-top:10px;display:flex;gap:8px">'+
      '<button class="btn btn-outline btn-sm" data-toggle-promo="'+pc.id+'" data-active="'+(!pc.active)+'">'+(pc.active?'Nonaktifkan':'Aktifkan')+'</button>'+
      '<button class="btn btn-danger btn-sm" data-delete-promo="'+pc.id+'">🗑 Hapus</button>'+
      '</div></div>';
  }

  const stats = computeAdminStats(statBookings, statDonations);

  app.innerHTML = '<div class="container" style="padding:32px 20px">'+
    '<div style="max-width:760px">'+
    '<h2 style="margin-bottom:4px">Panel Admin</h2>'+
    '<p style="color:var(--soft);font-size:.86rem;margin-bottom:24px">Review manual — dipakai sampai verifikasi otomatis dibangun (kalau nanti diputuskan).</p>'+
    '<h3 style="margin-bottom:10px">📊 Statistik</h3>'+
    statTileRow([
      { value: rpFmt(stats.totalBookingRevenue), label: 'Total transaksi booking' },
      { value: rpFmt(stats.totalDonationRaised), label: 'Total donasi terkumpul' },
      { value: String(stats.paidBookingCount), label: 'Booking terbayar' },
      { value: String(stats.paidDonationCount), label: 'Donasi masuk' },
    ])+
    '<div class="dash-section" style="margin-bottom:24px">'+
    monthlyBarChart('Booking per Bulan (12 Bulan Terakhir)', stats.bookingTrend, 'var(--success)', function(v){ return v+' booking'; })+
    monthlyBarChart('Donasi per Bulan (12 Bulan Terakhir)', stats.donationTrend, 'var(--accent2)', rpFmt)+
    rankedBarChart('Perawat Terbanyak Janji Temu Selesai', stats.topNurses, 'var(--primary)')+
    '</div>'+
    '<h3 id="ktpHeading" style="margin-bottom:10px">🪪 KTP Akun Menunggu Verifikasi ('+ktps.length+')</h3>'+
    '<div id="ktpList">'+(ktps.length ? ktps.map(ktpCard).join('') : '<p style="color:var(--soft);font-size:.84rem;margin-bottom:24px">Tidak ada yang menunggu.</p>')+'</div>'+
    '<h3 id="pktHeading" style="margin:24px 0 10px">🧑‍🤝‍🧑 KTP Profil Pasien Menunggu Verifikasi ('+patKtps.length+')</h3>'+
    '<div id="pktList">'+(patKtps.length ? patKtps.map(patKtpCard).join('') : '<p style="color:var(--soft);font-size:.84rem;margin-bottom:24px">Tidak ada yang menunggu.</p>')+'</div>'+
    '<h3 id="campHeading" style="margin:24px 0 10px">💰 Campaign Menunggu Verifikasi ('+camps.length+')</h3>'+
    '<div id="campList">'+(camps.length ? camps.map(campCard).join('') : '<p style="color:var(--soft);font-size:.84rem;margin-bottom:24px">Tidak ada yang menunggu.</p>')+'</div>'+
    '<h3 style="margin:24px 0 10px">🎟️ Kode Promo</h3>'+
    '<div class="dash-section" style="margin-bottom:12px">'+
    '<div class="profile-grid">'+
    '<div class="ff"><label>Kode</label><input type="text" id="pcCode" placeholder="mis. HEMAT10" style="text-transform:uppercase" /></div>'+
    '<div class="ff"><label>Jenis diskon</label><select id="pcType"><option value="percent">Persen (%)</option><option value="fixed">Potongan tetap (Rp)</option></select></div>'+
    '<div class="ff"><label>Nilai diskon</label><input type="number" id="pcValue" placeholder="mis. 10 atau 50000" /></div>'+
    '<div class="ff"><label>Maks. potongan (Rp, opsional)</label><input type="number" id="pcMaxDiscount" placeholder="Kosongkan = tanpa batas" /></div>'+
    '<div class="ff"><label>Minimal transaksi (Rp)</label><input type="number" id="pcMinAmount" placeholder="0" /></div>'+
    '<div class="ff"><label>Maks. pemakaian (opsional)</label><input type="number" id="pcMaxUses" placeholder="Kosongkan = tanpa batas" /></div>'+
    '</div>'+
    '<button class="btn btn-accent btn-sm" id="btnCreatePromo" style="margin-top:6px">+ Buat Kode Promo</button>'+
    '</div>'+
    '<div id="promoList">'+(promos.length ? promos.map(promoRow).join('') : '<p style="color:var(--soft);font-size:.84rem">Belum ada kode promo.</p>')+'</div>'+
    '<h3 style="margin:24px 0 10px">📋 Log Audit (50 terakhir)</h3>'+
    '<div class="dash-section" style="max-height:320px;overflow-y:auto">'+
    (auditLog.length ? '<table style="width:100%;font-size:.78rem;border-collapse:collapse">'+
      auditLog.map(function(l){
        return '<tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 4px;color:var(--soft);white-space:nowrap">'+esc((l.created_at||'').replace('T',' ').slice(0,16))+'</td>'+
          '<td style="padding:6px 4px">'+esc(l.admin_email)+'</td>'+
          '<td style="padding:6px 4px;font-weight:600">'+esc(l.action)+'</td>'+
          '<td style="padding:6px 4px;color:var(--soft)">'+esc(l.target_table||'')+(l.target_id?' #'+esc(String(l.target_id).slice(0,8)):'')+'</td></tr>';
      }).join('') + '</table>'
      : '<p style="color:var(--soft);font-size:.84rem;margin:0">Belum ada aktivitas tercatat.</p>')+
    '</div>'+
    '<h3 style="margin:24px 0 10px">⬇️ Export Data</h3>'+
    '<div class="dash-section" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'+
    '<button class="btn btn-outline btn-sm" id="btnExportBookings">📄 Export Booking (CSV)</button>'+
    '<button class="btn btn-outline btn-sm" id="btnExportDonations">📄 Export Donasi (CSV)</button>'+
    '<span style="font-size:.74rem;color:var(--soft)">2.000 transaksi terbaru per file — buat pembukuan/pajak.</span>'+
    '</div>'+
    '</div></div>';

  // Hapus satu kartu dari layar dengan fade halus + update angka counter di
  // heading-nya, TANPA fetch ulang seluruh Panel Admin — supaya klik
  // approve/reject/hapus berulang kali kerasa instan, bukan kedip
  // "Memuat…" tiap kali (log audit di bawah baru ter-update saat halaman
  // dibuka ulang — trade-off yang wajar untuk responsivitas).
  function removeRowSmooth(rowId, listId, headingId, label){
    const card = document.getElementById(rowId);
    const list = document.getElementById(listId);
    if(!card) return;
    card.style.transition = 'opacity .22s ease, transform .22s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(.97)';
    setTimeout(()=>{
      card.remove();
      const remaining = list ? list.children.length : 0;
      const heading = document.getElementById(headingId);
      if(heading) heading.textContent = label+' ('+remaining+')';
      if(list && remaining === 0) list.innerHTML = '<p style="color:var(--soft);font-size:.84rem;margin-bottom:24px">Tidak ada yang menunggu.</p>';
    }, 220);
  }

  const ROW_CONFIG = {
    approveKtp:        { row:'ktp-row-',  list:'ktpList',  heading:'ktpHeading',  label:'🪪 KTP Akun Menunggu Verifikasi' },
    rejectKtp:         { row:'ktp-row-',  list:'ktpList',  heading:'ktpHeading',  label:'🪪 KTP Akun Menunggu Verifikasi' },
    approvePatientKtp: { row:'pkt-row-',  list:'pktList',  heading:'pktHeading',  label:'🧑‍🤝‍🧑 KTP Profil Pasien Menunggu Verifikasi' },
    rejectPatientKtp:  { row:'pkt-row-',  list:'pktList',  heading:'pktHeading',  label:'🧑‍🤝‍🧑 KTP Profil Pasien Menunggu Verifikasi' },
    approveCampaign:   { row:'camp-row-', list:'campList', heading:'campHeading', label:'💰 Campaign Menunggu Verifikasi' },
    deleteCampaign:    { row:'camp-row-', list:'campList', heading:'campHeading', label:'💰 Campaign Menunggu Verifikasi' },
  };
  async function runAction(action, id, okMsg){
    try {
      await adminApi({ action, id });
      toast(okMsg,'s');
      const cfg = ROW_CONFIG[action];
      if(cfg) removeRowSmooth(cfg.row+id, cfg.list, cfg.heading, cfg.label);
    } catch(e) { toast('Gagal: '+(e.message||'coba lagi.'),'e'); }
  }
  document.querySelectorAll('[data-approve-ktp]').forEach(b=>b.addEventListener('click',()=>runAction('approveKtp', b.dataset.approveKtp, 'KTP disetujui.')));
  document.querySelectorAll('[data-reject-ktp]').forEach(b=>b.addEventListener('click', async ()=>{ if(await customConfirm('Tolak KTP ini? Status kembali ke belum diunggah.', {danger:true, okLabel:'Tolak'})) runAction('rejectKtp', b.dataset.rejectKtp, 'KTP ditolak.'); }));
  document.querySelectorAll('[data-approve-pkt]').forEach(b=>b.addEventListener('click',()=>runAction('approvePatientKtp', b.dataset.approvePkt, 'KTP pasien disetujui.')));
  document.querySelectorAll('[data-reject-pkt]').forEach(b=>b.addEventListener('click', async ()=>{ if(await customConfirm('Tolak KTP pasien ini? Status kembali ke belum diunggah.', {danger:true, okLabel:'Tolak'})) runAction('rejectPatientKtp', b.dataset.rejectPkt, 'KTP pasien ditolak.'); }));
  document.querySelectorAll('[data-approve-camp]').forEach(b=>b.addEventListener('click',()=>runAction('approveCampaign', b.dataset.approveCamp, 'Campaign disetujui.')));
  document.querySelectorAll('[data-delete-camp]').forEach(b=>b.addEventListener('click', async ()=>{ if(await customConfirm('Hapus campaign ini? Tidak bisa dibatalkan.', {danger:true, okLabel:'Hapus'})) runAction('deleteCampaign', b.dataset.deleteCamp, 'Campaign dihapus.'); }));

  document.querySelectorAll('[data-toggle-promo]').forEach(b=>b.addEventListener('click', async ()=>{
    const id = b.dataset.togglePromo;
    const newActive = b.dataset.active === 'true';
    try {
      await adminApi({ action:'togglePromoCode', id, data:{ active: newActive } });
      toast('Status kode promo diperbarui.','s');
      const row = document.getElementById('promo-row-'+id);
      const badge = row?.querySelector('.bank-status');
      if(badge){ badge.className = 'bank-status '+(newActive?'verified':'empty'); badge.textContent = newActive?'✓ Aktif':'✕ Nonaktif'; }
      b.textContent = newActive ? 'Nonaktifkan' : 'Aktifkan';
      b.dataset.active = String(!newActive);
    } catch(e) { toast('Gagal: '+(e.message||'coba lagi.'),'e'); }
  }));
  document.querySelectorAll('[data-delete-promo]').forEach(b=>b.addEventListener('click', async ()=>{
    if(!(await customConfirm('Hapus kode promo ini? Tidak bisa dibatalkan.', {danger:true, okLabel:'Hapus'}))) return;
    const id = b.dataset.deletePromo;
    try {
      await adminApi({ action:'deletePromoCode', id });
      toast('Kode promo dihapus.','s');
      const row = document.getElementById('promo-row-'+id);
      if(row){
        row.style.transition = 'opacity .22s ease, transform .22s ease';
        row.style.opacity = '0'; row.style.transform = 'scale(.97)';
        setTimeout(()=>{
          row.remove();
          const list = document.getElementById('promoList');
          if(list && !list.children.length) list.innerHTML = '<p style="color:var(--soft);font-size:.84rem">Belum ada kode promo.</p>';
        }, 220);
      }
    } catch(e) { toast('Gagal: '+(e.message||'coba lagi.'),'e'); }
  }));
  document.getElementById('btnCreatePromo')?.addEventListener('click', async (ev)=>{
    const btn = ev.currentTarget;
    if(btn.disabled) return;
    const code = document.getElementById('pcCode')?.value.trim();
    const discountType = document.getElementById('pcType')?.value;
    const discountValue = document.getElementById('pcValue')?.value;
    const maxDiscount = document.getElementById('pcMaxDiscount')?.value;
    const minAmount = document.getElementById('pcMinAmount')?.value;
    const maxUses = document.getElementById('pcMaxUses')?.value;
    if(!code || !discountValue){ toast('Isi kode dan nilai diskon.','e'); return; }
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Membuat…';
    try {
      await adminApi({ action:'createPromoCode', data:{ code, discountType, discountValue, maxDiscount, minAmount, maxUses, active:true, appliesTo:'booking' } });
      toast('Kode promo dibuat.','s');
      renderAdminDash();
    } catch(e) {
      toast('Gagal: '+(e.message||'coba lagi.'),'e');
      btn.disabled = false; btn.textContent = orig;
    }
  });

  document.getElementById('btnExportBookings')?.addEventListener('click', async (ev)=>{
    const btn = ev.currentTarget;
    if(btn.disabled) return;
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Menyiapkan…';
    try {
      const r = await adminApi({ action:'listBookings' });
      const rows = (r.data||[]).map(function(b){
        return [
          (b.created_at||'').slice(0,10), b.id, b.patient?.name||'', b.patient?.email||'',
          b.nurse_name||'', b.nurse_specialty||'', b.service, b.booking_date, b.booking_time,
          b.duration_hours, b.address, b.total_cost, b.platform_fee, b.nurse_pay,
          b.promo_code||'', b.discount_amount||0, b.status, b.payment_status, b.reference_id||'',
        ];
      });
      downloadCsv('akemat-booking-'+new Date().toISOString().slice(0,10)+'.csv',
        ['Tanggal Dibuat','ID','Nama Pasien','Email Pasien','Nama Perawat','Spesialisasi','Layanan','Tgl Janji Temu','Jam','Durasi (jam)','Alamat','Total Biaya','Fee Platform','Bagian Perawat','Kode Promo','Diskon','Status','Status Pembayaran','Referensi'],
        rows);
      toast('CSV booking diunduh ('+rows.length+' baris).','s');
    } catch(e){ toast('Gagal export: '+(e.message||'coba lagi.'),'e'); }
    finally { btn.disabled = false; btn.textContent = orig; }
  });

  document.getElementById('btnExportDonations')?.addEventListener('click', async (ev)=>{
    const btn = ev.currentTarget;
    if(btn.disabled) return;
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Menyiapkan…';
    try {
      const r = await adminApi({ action:'listDonations' });
      const rows = (r.data||[]).map(function(d){
        return [
          (d.created_at||'').slice(0,10), d.id, d.is_anonymous?'Anonim':(d.donor_name||''),
          d.campaign?.title||'', d.amount, d.platform_fee, d.net_amount, d.payment_status, d.reference_id||'',
        ];
      });
      downloadCsv('akemat-donasi-'+new Date().toISOString().slice(0,10)+'.csv',
        ['Tanggal','ID','Nama Donatur','Campaign','Jumlah','Fee Platform','Diterima Campaign','Status Pembayaran','Referensi'],
        rows);
      toast('CSV donasi diunduh ('+rows.length+' baris).','s');
    } catch(e){ toast('Gagal export: '+(e.message||'coba lagi.'),'e'); }
    finally { btn.disabled = false; btn.textContent = orig; }
  });
}
