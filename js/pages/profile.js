'use strict';
// =========================================================
// Akemat Foundation — Halaman Profil & Notifikasi Push
// Dipecah dari app.js dan dimuat lewat dynamic import() dari
// route() — halaman ini cuma perlu diparse saat pengguna login
// membuka #profil, bukan di initial load.
// Memakai helper global dari app.js (esc, app, toast, navigate, Store,
// apiFetch, API_BASE, sidebarHTML, afterDash, enhanceSelect,
// enhanceDateInput, openModal, closeModal, customConfirm, ktpThumb, ICON,
// helpLinkRow, nurseProfileSection, bankStatusSection, nursePayoutSection,
// fileToResizedDataUrl, rpFmt, MIN_NURSE_RATE, BOOKING_SERVICES).
// =========================================================

// ── Profil Pasien (multi-pasien per akun, tiap profil punya KTP sendiri) ──
function patientProfilesSection(profiles){
  function card(p){
    var cls = p.ktpStatus==='verified' ? 'verified' : p.ktpStatus==='uploaded' ? 'pending' : 'empty';
    var lbl = p.ktpStatus==='verified' ? '✓ Terverifikasi' : p.ktpStatus==='uploaded' ? '⏳ Menunggu verifikasi' : p.ktpStatus==='rejected' ? '✕ Ditolak — unggah ulang' : '❌ KTP belum diunggah';
    return '<div class="dash-section" id="pp-card-'+p.id+'" style="margin-bottom:12px">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">'+
      '<div><div style="font-family:var(--font-d);font-weight:700">'+esc(p.name)+'</div>'+
      '<div style="font-size:.78rem;color:var(--soft)">'+esc(p.relationship)+'</div></div>'+
      '<span class="bank-status '+cls+'">'+lbl+'</span>'+
      '</div>'+
      ktpThumb(p.ktpUrl, { style:'margin-top:10px' })+
      '<label class="consent-row" style="margin-top:10px">'+
      '<input type="checkbox" class="pp-ktp-consent" data-consent-for="'+p.id+'" />'+
      '<span class="consent-box">'+ICON.check+'</span>'+
      '<span>Saya menyetujui foto KTP ini digunakan untuk verifikasi identitas sesuai <a href="#privasi" target="_blank" style="text-decoration:underline">Kebijakan Privasi</a>.</span></label>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center">'+
      '<label class="btn btn-outline btn-sm" style="cursor:pointer">📎 '+(p.ktpUrl?'Ganti KTP':'Upload KTP')+'<input type="file" accept="image/jpeg,image/png" style="display:none" data-ktp-for="'+p.id+'" /></label>'+
      '<button class="btn btn-outline btn-sm" data-edit-pp="'+p.id+'">Edit</button>'+
      '<button class="btn btn-danger btn-sm" data-delete-pp="'+p.id+'">Hapus</button>'+
      '</div></div>';
  }
  return '<div class="dash-section">'+
    '<div class="dash-sh"><h3>🧑‍🤝‍🧑 Profil Pasien</h3><button class="btn btn-accent btn-sm" id="btnAddPatientProfile">+ Tambah Pasien</button></div>'+
    '<p style="font-size:.78rem;color:var(--soft);margin:0">Data orang yang akan dirawat saat buat janji temu — bisa lebih dari satu (mis. anggota keluarga). Wajib ada minimal 1 profil dengan KTP terunggah sebelum bisa membuat janji temu.</p>'+
    (profiles.length ? '' : '<p style="font-size:.84rem;color:var(--soft);margin-top:12px">Belum ada profil pasien. Tambahkan dulu sebelum membuat janji temu.</p>')+
    '</div>'+
    profiles.map(card).join('');
}

function ktpSection(u){
  var status = u.ktpStatus || 'pending';
  var cls    = status==='verified' ? 'verified' : status==='uploaded' ? 'pending' : 'empty';
  var lbl    = status==='verified' ? '✓ Terverifikasi' : status==='uploaded' ? '⏳ Menunggu verifikasi' : status==='rejected' ? '✕ Ditolak — unggah ulang' : '❌ Belum diunggah';
  return '<div class="dash-section">'+
    '<div class="dash-sh"><h3>📎 Verifikasi Identitas (KTP)</h3><span class="bank-status '+cls+'">'+lbl+'</span></div>'+
    '<p style="font-size:.78rem;color:var(--soft);margin:0 0 12px">Wajib diunggah sebelum janji temu/campaign pertama Anda. Foto KTP (JPG/PNG), maks. 5MB — pastikan foto, NIK, dan alamat terbaca jelas.</p>'+
    ktpThumb(u.ktpUrl, { lg:true, style:'margin-bottom:10px' })+
    '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border:1.5px dashed var(--border);border-radius:var(--r-sm);background:var(--bg-alt)">'+
    '<span style="font-size:1.4rem">🪪</span>'+
    '<div><div style="font-family:var(--font-d);font-weight:600;font-size:.84rem;color:var(--primary)" id="ktpFilename">'+(u.ktpUrl?'KTP tersimpan — klik untuk ganti':'Pilih foto KTP')+'</div>'+
    '<div style="font-size:.74rem;color:var(--soft)">Klik untuk upload</div></div>'+
    '<input type="file" id="profKtp" accept="image/jpeg,image/png" style="display:none" onchange="document.getElementById(\'ktpFilename\').textContent=this.files[0]?.name||\'Pilih foto KTP\'" />'+
    '</label>'+
    '<label class="consent-row" style="margin-top:12px">'+
    '<input type="checkbox" id="ktpConsent" />'+
    '<span class="consent-box">'+ICON.check+'</span>'+
    '<span>Saya menyetujui foto KTP ini digunakan untuk verifikasi identitas sesuai <a href="#privasi" target="_blank" style="text-decoration:underline">Kebijakan Privasi</a>.</span></label>'+
    '<button class="btn btn-primary btn-sm" id="btnSaveKtp" style="margin-top:10px">Simpan KTP</button></div>';
}

// ── Push Notification ──────────────────────────────────────
// applicationServerKey butuh format Uint8Array, bukan string base64url
// mentah — konversi standar sesuai dokumentasi Push API.
function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
async function getPushSubscription(){
  if(!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    // navigator.serviceWorker.ready bisa nyangkut lama (SW baru pertama kali
    // aktivasi, koneksi lemah, dll.) — status notifikasi cuma info sekunder
    // di halaman Profil, JANGAN sampai bikin seluruh halaman gagal tampil
    // gara-gara nunggu ini. Batasi maksimal 2.5 detik, anggap "belum aktif"
    // kalau lebih lama, bukan bikin renderProfile() menggantung.
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(()=>reject(new Error('sw-ready-timeout')), 2500)),
    ]);
    return await reg.pushManager.getSubscription();
  } catch { return null; }
}
async function enablePushNotifications(){
  if(!('serviceWorker' in navigator) || !('PushManager' in window)){ toast('Browser ini tidak mendukung notifikasi push.','e'); return false; }
  if(Store.backend !== 'remote'){ toast('Notifikasi belum didukung di mode lokal.','e'); return false; }
  try {
    const cfg = await (await fetch(`${API_BASE}/config`)).json();
    if(!cfg?.vapidPublicKey){ toast('Notifikasi belum diaktifkan admin di server ini.','e'); return false; }
    const perm = await Notification.requestPermission();
    if(perm !== 'granted'){ toast('Izin notifikasi ditolak.','e'); return false; }
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(()=>reject(new Error('Service worker belum siap, coba lagi sesaat.')), 4000)),
    ]);
    const sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey) });
    await apiFetch('db', { table:'push_subscriptions', action:'insert', data: sub.toJSON() });
    toast('Notifikasi diaktifkan.','s');
    return true;
  } catch(e){ toast('Gagal mengaktifkan notifikasi: '+(e.message||'coba lagi.'),'e'); return false; }
}
async function disablePushNotifications(){
  try {
    const sub = await getPushSubscription();
    if(sub){
      await apiFetch('db', { table:'push_subscriptions', action:'delete', data: sub.toJSON() }).catch(()=>{});
      await sub.unsubscribe();
    }
    toast('Notifikasi dinonaktifkan.','s');
    return true;
  } catch(e){ toast('Gagal menonaktifkan: '+(e.message||'coba lagi.'),'e'); return false; }
}

// ── Profile ─────────────────────────────────────────────────
export async function renderProfile(){
  const u = Store.getCurrentUser();
  if(!u){ navigate('#login'); return; }
  const bank = u.bankInfo || {};
  const np   = u.np || {};
  let nurseAvailable = 0, nursePayouts = [];
  if (u.role === 'nurse') {
    [nurseAvailable, nursePayouts] = await Promise.all([Store.getNurseAvailablePayout(u.id), Store.getPayoutsByUser(u.id)]);
  }
  let patientProfiles = [];
  if (u.role === 'patient') patientProfiles = await Store.getPatientProfiles(u.id);
  const pushSub = await getPushSubscription();
  const pushOn  = !!pushSub && typeof Notification !== 'undefined' && Notification.permission === 'granted';

  app.innerHTML = `
  <div class="dash-wrap">
    ${sidebarHTML(u)}
    <div class="dash-main">
      <div class="dash-head">
        <h2>${u.role==='patient'?'Profil & Dokumen':'Profil & Rekening'}</h2>
        <p>Kelola informasi pribadi${u.role!=='patient'?' dan data rekening pencairan':''}.</p>
      </div>

      <!-- Profile info -->
      <div class="dash-section">
        <div class="dash-sh"><h3>Informasi Pribadi</h3></div>
        <div class="profile-grid">
          <div class="ff"><label>Nama lengkap</label><input type="text" id="profName" value="${esc(u.name)}" autocomplete="name" /></div>
          <div class="ff"><label>No. HP</label><input type="tel" id="profPhone" value="${esc(u.phone||'')}" autocomplete="tel" /></div>
          <div class="ff full"><label>Email</label><input type="email" id="profEmail" value="${esc(u.email)}" readonly style="opacity:.6" /></div>
          <div class="ff"><label>Tanggal lahir</label><input type="date" id="profDob" value="${esc(u.dob||'')}" /></div>
          <div class="ff"><label>Jenis kelamin</label><select id="profGender"><option value="">Pilih…</option><option value="Laki-laki" ${u.gender==='Laki-laki'?'selected':''}>Laki-laki</option><option value="Perempuan" ${u.gender==='Perempuan'?'selected':''}>Perempuan</option></select></div>
          <div class="ff full"><label>Alamat</label><input type="text" id="profAddr" value="${esc(u.address||'')}" autocomplete="street-address" /></div>
          ${u.role==='donor'?'<div class="ff full"><label>Organisasi / Instansi (opsional)</label><input type="text" id="profOrg" value="'+esc(u.organization||'')+'" /></div>':''}
        </div>
        <button class="btn btn-primary btn-sm" id="btnSaveProfile" style="margin-top:4px">Simpan Profil</button>
      </div>

      <!-- Nurse profile extra -->
      ${u.role==='nurse'?nurseProfileSection(u):''}

      ${u.role==='patient'?patientProfilesSection(patientProfiles):ktpSection(u)}
      ${u.role!=='patient'?bankStatusSection(u):''}
      ${u.role==='nurse'?nursePayoutSection(u, nurseAvailable, nursePayouts):''}

      <div class="dash-section">
        <div class="dash-sh"><h3>🔐 Keamanan</h3><span class="bank-status ${u.twoFactorEnabled?'verified':'empty'}">${u.twoFactorEnabled?'✓ Aktif':'✕ Nonaktif'}</span></div>
        <p style="font-size:.78rem;color:var(--soft);margin:0 0 12px">Verifikasi 2 langkah — kalau aktif, tiap kali masuk butuh kode OTP WhatsApp tambahan selain password, ke nomor HP terdaftar Anda.</p>
        <button class="btn ${u.twoFactorEnabled?'btn-outline':'btn-primary'} btn-sm" id="btnToggle2fa">${u.twoFactorEnabled?'Matikan Verifikasi 2 Langkah':'Aktifkan Verifikasi 2 Langkah'}</button>
      </div>

      <div class="dash-section">
        <div class="dash-sh"><h3>🔔 Notifikasi</h3><span class="bank-status ${pushOn?'verified':'empty'}">${pushOn?'✓ Aktif':'✕ Nonaktif'}</span></div>
        <p style="font-size:.78rem;color:var(--soft);margin:0 0 12px">Dapat pemberitahuan langsung ke HP saat status KTP berubah, janji temu dikonfirmasi/selesai, atau ada donasi baru masuk ke campaign Anda.</p>
        <button class="btn ${pushOn?'btn-outline':'btn-primary'} btn-sm" id="btnTogglePush">${pushOn?'Matikan Notifikasi':'Aktifkan Notifikasi'}</button>
      </div>

      <div class="dash-section">
        <div class="dash-sh"><h3>💬 Bantuan & Informasi</h3></div>
        <div>
          ${helpLinkRow(ICON.whatsapp, 'Hubungi Customer Service', 'https://wa.me/6285196407117?text=Halo%20Akemat%20Foundation%2C%20saya%20ingin%20bertanya%20tentang%20layanan%20Anda.', true)}
          ${helpLinkRow(ICON.info, 'FAQ', '#faq')}
          ${helpLinkRow(ICON.doc, 'Syarat & Ketentuan', '#tnc')}
          ${helpLinkRow(ICON.shield, 'Kebijakan Privasi', '#privasi')}
        </div>
      </div>

      <div class="dash-section" style="border:1.5px solid #FCA5A5">
        <div class="dash-sh"><h3 style="color:#B91C1C">⚠️ Zona Berbahaya</h3></div>
        <p style="font-size:.78rem;color:var(--soft);margin:0 0 12px">Menghapus akun akan menghapus data pribadi Anda (nama, KTP, rekening) secara permanen dan Anda tidak bisa login lagi. Riwayat transaksi tetap tersimpan untuk kepatuhan hukum (lihat <a href="#privasi" target="_blank" style="text-decoration:underline">Kebijakan Privasi</a>), tapi sudah tidak terhubung ke identitas Anda.</p>
        <button class="btn btn-danger btn-sm" id="btnDeleteAccount">Hapus Akun Saya</button>
      </div>
    </div>
  </div>`;

  afterDash();
  enhanceSelect(document.getElementById('profGender'), 'Jenis Kelamin');
  enhanceDateInput(document.getElementById('profDob'), 'Tanggal Lahir');

  if (u.role === 'patient') {
    function openPPModal(p){
      document.getElementById('ppModalTitle').textContent = p ? '🧑‍🤝‍🧑 Edit Profil Pasien' : '🧑‍🤝‍🧑 Tambah Profil Pasien';
      document.getElementById('ppId').value = p ? p.id : '';
      document.getElementById('ppName').value = p ? p.name : '';
      const ppRel = document.getElementById('ppRelationship');
      ppRel.value = p ? p.relationship : 'Diri Sendiri';
      ppRel.dispatchEvent(new Event('change', { bubbles: true }));
      const ppDobEl = document.getElementById('ppDob');
      ppDobEl.value = p ? p.dob : '';
      ppDobEl.dispatchEvent(new Event('change', { bubbles: true }));
      const ppGen = document.getElementById('ppGender');
      ppGen.value = p ? p.gender : '';
      ppGen.dispatchEvent(new Event('change', { bubbles: true }));
      document.getElementById('ppPhone').value = p ? p.phone : '';
      document.getElementById('ppAddress').value = p ? p.address : '';
      document.getElementById('ppNotes').value = p ? p.notes : '';
      openModal('modalPatientProfile');
    }
    enhanceSelect(document.getElementById('ppRelationship'), 'Hubungan dengan Anda');
    enhanceSelect(document.getElementById('ppGender'), 'Jenis Kelamin');
    enhanceDateInput(document.getElementById('ppDob'), 'Tanggal Lahir');
    document.getElementById('btnAddPatientProfile')?.addEventListener('click', ()=>openPPModal(null));
    document.querySelectorAll('[data-edit-pp]').forEach(b=>b.addEventListener('click', ()=>{
      openPPModal(patientProfiles.find(p=>p.id===b.dataset.editPp));
    }));
    document.querySelectorAll('[data-delete-pp]').forEach(b=>b.addEventListener('click', async ()=>{
      if(!(await customConfirm('Hapus profil pasien ini? Riwayat janji temu yang sudah ada tetap tersimpan.', {danger:true, okLabel:'Hapus'}))) return;
      try {
        await Store.deletePatientProfile(b.dataset.deletePp);
        toast('Profil pasien dihapus.','s');
        const card = document.getElementById('pp-card-'+b.dataset.deletePp);
        if(card){
          card.style.transition = 'opacity .22s ease, transform .22s ease';
          card.style.opacity = '0'; card.style.transform = 'scale(.97)';
          setTimeout(()=>card.remove(), 220);
        }
      }
      catch(e){ toast('Gagal menghapus: '+(e.message||'coba lagi.'),'e'); }
    }));
    document.getElementById('btnSavePatientProfile')?.addEventListener('click', async (ev)=>{
      const btn = ev.currentTarget;
      if(btn.disabled) return;
      const id   = document.getElementById('ppId')?.value;
      const name = document.getElementById('ppName')?.value.trim();
      const relationship = document.getElementById('ppRelationship')?.value;
      const dob    = document.getElementById('ppDob')?.value;
      const gender = document.getElementById('ppGender')?.value;
      const phone  = document.getElementById('ppPhone')?.value.trim();
      const address= document.getElementById('ppAddress')?.value.trim();
      if(!name||!relationship||!dob||!gender||!phone||!address){ toast('Lengkapi semua data wajib (kecuali Catatan kondisi).','e'); return; }
      const data = { name, relationship, dob, gender, phone, address, notes: document.getElementById('ppNotes')?.value.trim() };
      const orig = btn.textContent;
      btn.disabled = true; btn.textContent = 'Menyimpan…';
      try {
        if(id) await Store.updatePatientProfile(id, data);
        else   await Store.addPatientProfile({ accountId: u.id, ...data });
        closeModal('modalPatientProfile');
        toast('Profil pasien disimpan.','s');
        renderProfile();
      } catch(e){ toast('Gagal menyimpan: '+(e.message||'coba lagi.'),'e'); }
      finally { btn.disabled = false; btn.textContent = orig; }
    });
    document.querySelectorAll('[data-ktp-for]').forEach(input=>input.addEventListener('change', async ()=>{
      const file = input.files?.[0];
      if(!file) return;
      const pid = input.dataset.ktpFor;
      if(!document.querySelector('[data-consent-for="'+pid+'"]')?.checked){
        toast('Centang persetujuan penggunaan foto KTP terlebih dahulu.','e'); input.value=''; return;
      }
      if(file.size > 5*1024*1024){ toast('Ukuran file maksimal 5MB.','e'); input.value=''; return; }
      try {
        const dataUrl = await fileToResizedDataUrl(file, 1400, 0.85);
        await Store.updatePatientProfile(pid, { ktpUrl: dataUrl, ktpStatus: 'uploaded' });
        toast('KTP berhasil diunggah. Menunggu verifikasi tim Akemat.','s');
        renderProfile();
      } catch(e){ toast(e.message||'Gagal mengunggah KTP.','e'); }
    }));
  }

  document.getElementById('btnAjukanPencairanNurse')?.addEventListener('click', async ()=>{
    const available = await Store.getNurseAvailablePayout(u.id);
    const bank = u.bankInfo||{};
    if(!bank.accountNumber){ toast('Isi data rekening terlebih dahulu.','e'); return; }
    if(available<=0){ toast('Belum ada saldo yang bisa dicairkan.','e'); return; }
    if(!(await customConfirm('Ajukan pencairan '+rpFmt(available)+' ke '+bank.bankName+' '+bank.accountNumber+'?'))) return;
    await Store.addPayoutRequest({
      recipientType:'nurse', userId:u.id, amount:available,
      bankName:bank.bankName, bankAccountNumber:bank.accountNumber, bankAccountName:bank.accountName,
    });
    toast('Pengajuan pencairan terkirim. Diproses 1-3 hari kerja.','s');
    renderProfile();
  });

  document.getElementById('btnSaveKtp')?.addEventListener('click', async ()=>{
    const file = document.getElementById('profKtp')?.files?.[0];
    if(!file){ toast('Pilih foto KTP terlebih dahulu.','e'); return; }
    if(file.size > 5*1024*1024){ toast('Ukuran file maksimal 5MB.','e'); return; }
    if(!document.getElementById('ktpConsent')?.checked){ toast('Centang persetujuan penggunaan foto KTP terlebih dahulu.','e'); return; }
    const btn = document.getElementById('btnSaveKtp');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Mengunggah…';
    try {
      // maxDim lebih besar dari foto campaign (1000px) — teks NIK/alamat di
      // KTP harus tetap terbaca setelah dikompres, bukan cuma "cukup bagus".
      const dataUrl = await fileToResizedDataUrl(file, 1400, 0.85);
      await Store.updateUser(u.id, { ktpUrl: dataUrl, ktpStatus: 'uploaded' });
      toast('KTP berhasil diunggah. Menunggu verifikasi tim Akemat.','s');
      renderProfile();
    } catch(e) {
      toast(e.message||'Gagal mengunggah KTP.','e');
      btn.disabled = false; btn.textContent = orig;
    }
  });

  // Profile form save handlers
  document.getElementById('btnSaveProfile')?.addEventListener('click', async ()=>{
    const name   = document.getElementById('profName')?.value.trim();
    const phone  = document.getElementById('profPhone')?.value.trim();
    const dob    = document.getElementById('profDob')?.value;
    const gender = document.getElementById('profGender')?.value;
    const address= document.getElementById('profAddr')?.value.trim();
    if(!name||!phone||!dob||!gender||!address){ toast('Lengkapi semua data wajib (kecuali Organisasi).','e'); return; }
    const upd = { name, phone, dob, gender, address };
    if(u.role==='donor') upd.organization = document.getElementById('profOrg')?.value.trim();
    await Store.updateUser(u.id, upd);
    toast('Profil berhasil disimpan.','s');
  });

  document.getElementById('btnSaveNP')?.addEventListener('click', async ()=>{
    const price = parseInt(document.getElementById('npPrice')?.value)||u.np?.price;
    if(price < MIN_NURSE_RATE){ toast('Tarif minimum Rp'+MIN_NURSE_RATE.toLocaleString('id-ID')+'/jam.','e'); return; }
    const sched = [...document.querySelectorAll('#nurseScheduleWrap input:checked')].map(cb=>cb.value);
    const spec  = document.getElementById('npSpec')?.value;
    await Store.updateUser(u.id, {np:{...u.np,
      specialty: spec,
      education: document.getElementById('npEdu')?.value,
      loc:       document.getElementById('npLoc')?.value.trim(),
      price,
      bio:       document.getElementById('npBio')?.value.trim(),
      schedule:  sched.length ? sched : u.np?.schedule,
      services:  BOOKING_SERVICES[spec] || u.np?.services,
    }});
    toast('Profil perawat berhasil disimpan.','s');
  });

  document.getElementById('btnSaveBank')?.addEventListener('click', async ()=>{
    const bankName = document.getElementById('bankNameInput')?.value;
    const accNum   = document.getElementById('bankAccNum')?.value.trim();
    const accName  = document.getElementById('bankAccName')?.value.trim();
    if(!bankName||!accNum||!accName){ toast('Lengkapi semua data rekening.','e'); return; }
    if(!document.getElementById('bankConsent')?.checked){ toast('Centang persetujuan penggunaan data rekening terlebih dahulu.','e'); return; }
    await Store.updateUser(u.id, { bankInfo:{ bankName, accountNumber:accNum, accountName:accName, verified:false }});
    toast('Data rekening disimpan. Verifikasi dalam 1×24 jam kerja.','s');
    setTimeout(()=>renderProfile(), 800);
  });

  document.getElementById('btnTogglePush')?.addEventListener('click', async (ev)=>{
    const btn = ev.currentTarget;
    if(btn.disabled) return;
    btn.disabled = true;
    const ok = pushOn ? await disablePushNotifications() : await enablePushNotifications();
    if(ok) renderProfile(); else btn.disabled = false;
  });

  document.getElementById('btnToggle2fa')?.addEventListener('click', async (ev)=>{
    if(Store.backend !== 'remote'){ toast('Verifikasi 2 langkah belum didukung di mode lokal.','e'); return; }
    const btn = ev.currentTarget;
    if(btn.disabled) return;
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = 'Menyimpan…';
    try {
      await Store.updateUser(u.id, { twoFactorEnabled: !u.twoFactorEnabled });
      toast(u.twoFactorEnabled ? 'Verifikasi 2 langkah dimatikan.' : 'Verifikasi 2 langkah diaktifkan. Login berikutnya akan minta kode OTP WA.','s');
      renderProfile();
    } catch(e) {
      toast('Gagal: '+(e.message||'coba lagi.'),'e');
      btn.disabled = false; btn.textContent = orig;
    }
  });

  document.getElementById('btnDeleteAccount')?.addEventListener('click', async ()=>{
    const ok = await customConfirm('Tindakan ini PERMANEN dan tidak bisa dibatalkan. Ketik HAPUS AKUN (huruf besar semua) untuk konfirmasi.', { danger:true, okLabel:'Hapus Akun', requireText:'HAPUS AKUN' });
    if(!ok) return;
    const btn = document.getElementById('btnDeleteAccount');
    btn.disabled = true; btn.textContent = 'Menghapus…';
    try {
      await Store.deleteAccount();
      toast('Akun Anda telah dihapus.','s');
      navigate('#home');
    } catch(e) {
      toast('Gagal menghapus akun: '+(e.message||'coba lagi.'),'e');
      btn.disabled = false; btn.textContent = 'Hapus Akun Saya';
    }
  });
}
