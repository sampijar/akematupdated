'use strict';
// =========================================================
// Akemat Foundation — Halaman Daftar & Detail Perawat
// Dipecah dari app.js dan dimuat lewat dynamic import() dari
// route() — halaman pencarian/booking perawat, bukan bagian dari
// initial load beranda.
// Memakai helper global dari app.js/data.js (app, Store, SPECIALTIES,
// EDUCATION_LEVELS, enhanceSelect, renderFooterSection, emptyState,
// initials, specBadge, rpFmt, esc, ICON, toast, navigate, FEE, Payment,
// skeletonGrid — openBookingModal dipanggil lewat window.openBookingModal
// dari onclick inline).
// =========================================================

function filterNurses(list, { q, specialty, education, avail } = {}){
  let out = list;
  if (specialty && specialty !== 'Semua') out = out.filter(n => n.np.specialty === specialty);
  if (avail)     out = out.filter(n => n.np.avail);
  if (education && education !== 'Semua') out = out.filter(n => n.np.education === education);
  if (q) {
    const needle = q.toLowerCase();
    out = out.filter(n => n.name.toLowerCase().includes(needle) || n.np.specialty.toLowerCase().includes(needle) || n.np.loc.toLowerCase().includes(needle));
  }
  return out;
}

export async function renderNurseList(){
  app.innerHTML = '<section class="pub-section"><div class="container">'+skeletonGrid('nurse-grid', 6)+'</div></section>';
  const nurses = await Store.getNurses();
  const allNurses = nurses;
  // Datang dari kartu spesialisasi di Home? Pre-filter sekali, lalu buang (link
  // biasa ke #perawat berikutnya harus tampil semua lagi, bukan nyangkut ke-filter).
  const preSpec = sessionStorage.getItem('akemat_prefilter_spec') || '';
  if(preSpec) sessionStorage.removeItem('akemat_prefilter_spec');
  const initialList = preSpec ? filterNurses(nurses, { specialty: preSpec }) : nurses;

  app.innerHTML = `
  <section class="pub-section">
    <div class="container">
      <div class="section-head">
        <p class="eyebrow">Temukan perawat</p>
        <h2>Perawat profesional siap hadir di rumah Anda</h2>
      </div>

      <div class="filter-row" id="nurseFilters">
        <div class="search-wrap">
          <span class="search-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></span>
          <input type="text" id="nurseSearch" placeholder="Cari nama, spesialisasi, kota…" />
        </div>
        <select id="nurseSpec">
          <option value="">Semua spesialisasi</option>
          ${SPECIALTIES.map(s=>'<option value="'+s+'"'+(s===preSpec?' selected':'')+'>'+s+'</option>').join('')}
        </select>
        <select id="nurseEdu">
          <option value="">Semua pendidikan</option>
          ${EDUCATION_LEVELS.map(e=>'<option value="'+e+'">'+e+'</option>').join('')}
        </select>
        <button class="f-chip" id="availFilterOn" data-avail="1">✓ Tersedia sekarang</button>
      </div>

      <div class="nurse-grid" id="nurseGrid">
        ${initialList.map(n=>nurseCard(n)).join('') || nurseEmptyState(allNurses.length)}
      </div>
    </div>
  </section>
  ${renderFooterSection()}`;

  // Filters
  let avail = false;
  const grid = ()=>{
    const q    = document.getElementById('nurseSearch')?.value || '';
    const spec = document.getElementById('nurseSpec')?.value   || '';
    const edu  = document.getElementById('nurseEdu')?.value    || '';
    const list = filterNurses(allNurses, { q, specialty: spec, education: edu, avail });
    document.getElementById('nurseGrid').innerHTML = list.map(n=>nurseCard(n)).join('') || nurseEmptyState(allNurses.length, true);
  };
  document.getElementById('nurseSearch')?.addEventListener('input', grid);
  document.getElementById('nurseSpec')?.addEventListener('change', grid);
  document.getElementById('nurseEdu')?.addEventListener('change', grid);
  enhanceSelect(document.getElementById('nurseSpec'), 'Spesialisasi');
  enhanceSelect(document.getElementById('nurseEdu'), 'Pendidikan');
  document.getElementById('availFilterOn')?.addEventListener('click', ()=>{
    avail = !avail;
    document.getElementById('availFilterOn').classList.toggle('active', avail);
    grid();
  });
  document.getElementById('nurseGrid')?.addEventListener('click', (ev)=>{
    if(ev.target.id === 'btnResetNurseFilters'){
      document.getElementById('nurseSearch').value = '';
      const specEl = document.getElementById('nurseSpec'), eduEl = document.getElementById('nurseEdu');
      specEl.value = ''; specEl.dispatchEvent(new Event('change', { bubbles: true }));
      eduEl.value  = ''; eduEl.dispatchEvent(new Event('change', { bubbles: true }));
      avail = false;
      document.getElementById('availFilterOn')?.classList.remove('active');
      grid();
    }
  });
}

// Kosongnya "belum ada perawat sama sekali" vs "tidak ada yang cocok dengan
// filter aktif" butuh pesan & aksi yang beda supaya pengguna tahu harus
// ngapain, bukan cuma mentok di ikon kotak surat.
function nurseEmptyState(totalNurses, isFiltered){
  if(totalNurses === 0){
    return '<div class="empty-state"><div class="empty-icon">👩‍⚕️</div>'
      + '<p>Belum ada perawat terdaftar di platform saat ini.</p>'
      + '<p style="font-size:.82rem;margin-top:4px">Butuh bantuan segera? Hubungi tim Akemat, kami bantu carikan.</p>'
      + '<a href="https://wa.me/6285196407117" target="_blank" class="btn btn-primary btn-sm" style="margin-top:14px">💬 Hubungi via WhatsApp</a>'
      + '</div>';
  }
  if(isFiltered){
    return '<div class="empty-state"><div class="empty-icon">🔍</div>'
      + '<p>Tidak ada perawat yang cocok dengan filter ini.</p>'
      + '<button type="button" class="btn btn-outline btn-sm" id="btnResetNurseFilters" style="margin-top:14px">Reset Filter</button>'
      + '</div>';
  }
  return emptyState('Tidak ada perawat yang cocok.');
}

function nurseCard(n){
  const p = n.np;
  return `
  <div class="nurse-card">
    <div class="nc-head">
      <div class="nc-avatar">${initials(n.name)}${p.verified?'<span class="nc-verified"></span>':''}</div>
      <div class="nc-meta">
        <div class="nc-name">${esc(n.name)}</div>
        ${specBadge(p.specialty)}
        <div class="nc-edu" style="margin-top:4px">🎓 ${esc(p.education||'')}</div>
        <div class="${p.avail?'nc-avail-y':'nc-avail-n'}" style="margin-top:4px">
          ${p.avail?'✅ Tersedia':'⏸ Tidak tersedia'}
        </div>
      </div>
    </div>
    <div class="nc-stats">
      <span class="nc-stat"><span class="star">★</span>${p.rating} (${p.reviews} ulasan)</span>
      <span class="nc-stat">📍 ${esc(p.loc)}</span>
      <span class="nc-stat">🏥 ${p.exp} tahun</span>
    </div>
    <div class="nc-svcs">${(p.services||[]).slice(0,3).map(s=>'<span class="svc-chip">'+esc(s)+'</span>').join('')}</div>
    <div class="nc-price">${rpFmt(p.price)} <small>/ jam</small></div>
    <div class="nc-actions">
      <a href="#perawat/${n.id}" class="btn btn-outline btn-sm">Lihat profil</a>
      ${p.avail?'<button class="btn btn-primary btn-sm" onclick="openBookingModal(\''+n.id+'\')">Buat Janji</button>':'<button class="btn btn-ghost btn-sm" disabled>Tidak tersedia</button>'}
    </div>
  </div>`;
}

// ── Nurse Detail ────────────────────────────────────────────
export async function renderNurseDetail(id){
  const n = await Store.getUserById(id);
  if(!n || !n.np){ app.innerHTML='<div class="container" style="padding:60px 0"><p>Perawat tidak ditemukan.</p></div>'; return; }
  const p = n.np;
  const currentUser = Store.getCurrentUser();
  const patientProfiles = currentUser?.role==='patient' ? await Store.getPatientProfiles(currentUser.id) : [];
  const reviews = await Store.getReviewsByNurse(n.id);
  const bookableProfiles = patientProfiles.filter(pp => pp.ktpStatus === 'uploaded' || pp.ktpStatus === 'verified');

  app.innerHTML = `
  <div class="container nurse-detail-wrap">
    <div>
      <div class="nurse-profile-card">
        <div class="npro-head">
          <div class="npro-big-avatar">${initials(n.name)}</div>
          <div style="flex:1;min-width:0">
            <div class="npro-name">${esc(n.name)}</div>
            <div class="npro-spec">${specBadge(p.specialty)}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center">
              <span class="badge badge-blue">🎓 ${esc(p.education)}</span>
              ${p.verified?'<span class="badge badge-green">'+ICON.check+' Terverifikasi</span>':'<span class="badge badge-amber">Menunggu verifikasi</span>'}
              <span class="${p.avail?'badge badge-green':'badge badge-amber'}">${p.avail?'✅ Tersedia':'⏸ Tidak tersedia'}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:20px;margin-top:16px;flex-wrap:wrap">
          <div class="nc-stat"><span class="star">★</span><strong>${p.rating}</strong> (${p.reviews} ulasan)</div>
          <div class="nc-stat">📍 ${esc(p.loc)}</div>
          <div class="nc-stat">🏥 Pengalaman ${p.exp} tahun</div>
          <div class="nc-stat">💰 ${rpFmt(p.price)}/jam</div>
        </div>
        <div class="cam-share-row" style="margin-top:14px;margin-bottom:0">
          <button class="btn btn-outline btn-sm" id="btnShareNurse" type="button">🔗 Bagikan Profil</button>
          <a class="btn btn-sm share-wa" id="shareNurseWaLink" target="_blank" rel="noopener noreferrer">💬 Rekomendasikan via WhatsApp</a>
        </div>
      </div>

      <div class="nurse-profile-card">
        <div class="tabs" id="nurseTabs">
          <button class="tab-btn active" data-tab="bio">Tentang</button>
          <button class="tab-btn" data-tab="svc">Layanan</button>
          <button class="tab-btn" data-tab="jadwal">Jadwal</button>
          <button class="tab-btn" data-tab="ulasan">Ulasan</button>
        </div>
        <div class="tab-pane active" id="tab-bio">
          <p>${esc(p.bio)}</p>
        </div>
        <div class="tab-pane" id="tab-svc">
          <div style="display:flex;flex-direction:column;gap:8px">
            ${(p.services||[]).map(s=>'<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg-alt);border-radius:8px"><span style="color:var(--success)">✓</span><span style="font-weight:600;font-size:.9rem">'+esc(s)+'</span></div>').join('')}
          </div>
        </div>
        <div class="tab-pane" id="tab-jadwal">
          <p style="margin-bottom:10px;font-size:.88rem;color:var(--soft)">Hari-hari perawat tersedia untuk kunjungan:</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].map(d=>{var on=(p.schedule||[]).includes(d);return '<span style="padding:8px 14px;border-radius:8px;font-size:.82rem;font-weight:600;font-family:var(--font-d);background:'+(on?'var(--primary)':'var(--bg-alt)')+';color:'+(on?'#fff':'var(--soft)')+'">'+d+'</span>';}).join('')}
          </div>
        </div>
        <div class="tab-pane" id="tab-ulasan">
          <div style="display:flex;flex-direction:column;gap:12px">
            ${reviews.length ? reviews.map(function(r){
              var stars='★'.repeat(r.rating)+'☆'.repeat(5-r.rating);
              return '<div style="padding:14px;background:var(--bg-alt);border-radius:10px">'+
                '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
                '<span style="font-weight:700;font-size:.86rem">'+esc(r.patientName)+'</span>'+
                '<span style="font-size:.76rem;color:var(--soft)">'+esc(r.createdAt)+'</span></div>'+
                '<div style="color:#F59E0B;font-size:.84rem;margin-bottom:5px">'+stars+'</div>'+
                (r.comment?'<p style="font-size:.88rem;margin:0">'+esc(r.comment)+'</p>':'')+'</div>';
            }).join('') : '<p style="color:var(--soft);font-size:.88rem">Belum ada ulasan untuk perawat ini.</p>'}
          </div>
        </div>
      </div>
    </div>

    <!-- Booking widget -->
    <div>
      <div class="book-widget">
        <h3>Buat Janji Temu dengan ${esc(n.name.split(',')[0])}</h3>
        <div class="book-price">${rpFmt(p.price)} <small>/ jam</small></div>

        ${!p.avail ? '<div class="bank-warning">⚠️ Perawat ini sedang tidak tersedia. Coba cari perawat lain.</div>' : ''}

        ${currentUser?.role==='patient' ? (
          bookableProfiles.length
            ? '<div class="ff"><label>Untuk pasien</label><select id="bkPatientProfile">'+bookableProfiles.map(pp=>'<option value="'+pp.id+'">'+esc(pp.name)+' ('+esc(pp.relationship)+')'+(pp.ktpStatus!=='verified'?' — menunggu verifikasi KTP':'')+'</option>').join('')+'</select></div>'
            : '<div class="bank-warning">⚠️ Anda belum punya profil pasien dengan KTP terunggah. <a href="#profil">Tambahkan di halaman Profil</a> dulu sebelum membuat janji temu.</div>'
        ) : ''}

        <div class="ff">
          <label>Tanggal kunjungan</label>
          <input type="date" id="bkDate" min="${new Date(Date.now()+86400000).toISOString().split('T')[0]}" />
        </div>
        <div class="ff">
          <label>Jam mulai</label>
          <div class="time-grid">
            ${['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'].map((t,i)=>'<button class="time-btn'+(i===0?' active':'')+'" data-time="'+t+'">'+t+'</button>').join('')}
          </div>
        </div>
        <div class="ff">
          <label>Durasi</label>
          <div class="dur-row">
            ${[1,2,3,4,8].map((d,i)=>'<button class="dur-btn'+(i===1?' active':'')+'" data-dur="'+d+'">'+(d===8?'Full':d+'j')+'</button>').join('')}
          </div>
        </div>
        <div class="ff">
          <label>Jenis layanan</label>
          <select id="bkService">
            ${(p.services||[p.specialty]).map(s=>'<option value="'+s+'">'+s+'</option>').join('')}
          </select>
        </div>
        <div class="ff">
          <label>Alamat kunjungan</label>
          <input type="text" id="bkAddress" placeholder="Jl. Nama No. X, Kota" />
        </div>
        <div class="ff">
          <label>Catatan (opsional)</label>
          <textarea id="bkNotes" rows="2" placeholder="Kondisi pasien, kebutuhan khusus…"></textarea>
        </div>

        <div class="ff">
          <label>Kode promo (opsional)</label>
          <div style="display:flex;gap:8px">
            <input type="text" id="bkPromoCode" placeholder="Masukkan kode" style="flex:1;text-transform:uppercase" />
            <button type="button" class="btn btn-outline btn-sm" id="btnApplyPromo">Terapkan</button>
          </div>
          <div id="bkPromoMsg" style="font-size:.78rem;margin-top:6px"></div>
        </div>

        <!-- Fee breakdown -->
        <div class="fee-box">
          <div class="fee-row">
            <span class="fee-label">Harga perawat</span>
            <span class="fee-value" id="bkPriceBase">${rpFmt(p.price)} × 2 jam</span>
          </div>
          <div class="fee-row fee-discount" id="bkDiscountRow" style="display:none">
            <span class="fee-label">Diskon promo</span>
            <span id="bkDiscount" style="color:#059669">-Rp0</span>
          </div>
          <div class="fee-row fee-total">
            <span>Total bayar</span>
            <span id="bkTotal">${rpFmt(p.price*2)}</span>
          </div>
          <div class="fee-row fee-platform">
            <span class="fee-label">Platform fee (20%)</span>
            <span id="bkFee">${rpFmt(p.price*2*0.2)}</span>
          </div>
          <div class="fee-row fee-net">
            <span class="fee-label">Perawat terima</span>
            <span id="bkNursePay">${rpFmt(p.price*2*0.8)}</span>
          </div>
        </div>

        <button class="btn btn-primary btn-full" id="btnBook" ${!p.avail?'disabled':''}>
          Buat Janji Temu
        </button>
        <p style="font-size:.72rem;color:var(--soft);text-align:center;margin-top:8px;line-height:1.5">
          Pembayaran dikonfirmasi via WhatsApp setelah janji temu dibuat.
          <a href="#tnc">Syarat & Ketentuan</a> berlaku.
        </p>
      </div>
    </div>
  </div>
  ${renderFooterSection()}`;

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab)?.classList.add('active');
    });
  });

  // ── Bagikan / rekomendasikan profil perawat ──────────────
  const nurseShareUrl  = location.origin + location.pathname + '#perawat/' + n.id;
  const nurseShareText = 'Saya mau rekomendasikan perawat '+n.name.split(',')[0]+' ('+p.specialty+') di Akemat Foundation. Cek profilnya di sini:';
  const nurseWaLink = document.getElementById('shareNurseWaLink');
  if(nurseWaLink) nurseWaLink.href = 'https://wa.me/?text=' + encodeURIComponent(nurseShareText + ' ' + nurseShareUrl);
  document.getElementById('btnShareNurse')?.addEventListener('click', async ()=>{
    if(navigator.share){
      try { await navigator.share({ title: n.name, text: nurseShareText, url: nurseShareUrl }); }
      catch(e){ /* pengguna batal share, abaikan */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(nurseShareUrl);
      toast('Link profil perawat disalin! Tempel di chat/medsos manapun.','s');
    } catch {
      toast('Gagal menyalin link. Salin manual: '+nurseShareUrl,'e');
    }
  });

  // Duration / time selection
  let selDur = 2;
  let appliedPromo = null; // { code, discount, finalAmount } — direset tiap durasi berubah
  document.querySelectorAll('.dur-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.dur-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selDur = parseInt(btn.dataset.dur);
      appliedPromo = null;
      const msg = document.getElementById('bkPromoMsg');
      if(msg) msg.textContent = '';
      updateBookCalc();
    });
  });
  document.querySelectorAll('.time-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.time-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  function updateBookCalc(){
    const gross = p.price * selDur;
    const total = appliedPromo ? appliedPromo.finalAmount : gross;
    const fee   = Math.round(total * FEE.BOOKING);
    document.getElementById('bkPriceBase').textContent = rpFmt(p.price)+' × '+selDur+' jam';
    document.getElementById('bkTotal').textContent     = rpFmt(total);
    document.getElementById('bkFee').textContent       = rpFmt(fee);
    document.getElementById('bkNursePay').textContent  = rpFmt(total - fee);
    const discRow = document.getElementById('bkDiscountRow');
    if(discRow) discRow.style.display = appliedPromo ? '' : 'none';
    if(appliedPromo) document.getElementById('bkDiscount').textContent = '-'+rpFmt(appliedPromo.discount);
  }
  updateBookCalc();

  document.getElementById('btnApplyPromo')?.addEventListener('click', async ()=>{
    const input = document.getElementById('bkPromoCode');
    const msg   = document.getElementById('bkPromoMsg');
    const code  = input?.value.trim();
    if(!code){ if(msg){ msg.textContent='Isi kode promo dulu.'; msg.style.color='#DC2626'; } return; }
    const btn = document.getElementById('btnApplyPromo');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Mengecek…';
    try {
      const gross = p.price * selDur;
      const r = await Store.checkPromo(code, gross, 'booking');
      appliedPromo = { code: r.code, discount: r.discount, finalAmount: r.finalAmount };
      if(msg){ msg.textContent = '✓ Kode "'+r.code+'" diterapkan — hemat '+rpFmt(r.discount)+'.'; msg.style.color = '#059669'; }
      updateBookCalc();
    } catch(e) {
      appliedPromo = null;
      if(msg){ msg.textContent = e.message || 'Kode promo tidak valid.'; msg.style.color = '#DC2626'; }
      updateBookCalc();
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  });

  // Book button
  document.getElementById('btnBook')?.addEventListener('click', async (ev)=>{
    if(ev.currentTarget.disabled) return;
    const u = Store.getCurrentUser();
    if(!u){ toast('Silakan login terlebih dahulu.','e'); navigate('#login'); return; }
    if(u.role !== 'patient'){ toast('Hanya pasien yang bisa membuat janji temu dengan perawat.','e'); return; }
    const patientProfileId = document.getElementById('bkPatientProfile')?.value;
    if(!patientProfileId){ toast('Tambahkan profil pasien (dengan KTP) di halaman Profil terlebih dahulu.','e'); return; }
    const patientProfileName = bookableProfiles.find(pp=>pp.id===patientProfileId)?.name || '';
    const date    = document.getElementById('bkDate')?.value;
    const time    = document.querySelector('.time-btn.active')?.dataset.time || '09:00';
    const dur     = selDur;
    const service = document.getElementById('bkService')?.value || p.specialty;
    const address = document.getElementById('bkAddress')?.value.trim();
    const notes   = document.getElementById('bkNotes')?.value.trim();
    if(!date)    { toast('Pilih tanggal kunjungan.','e'); return; }
    if(!address) { toast('Isi alamat kunjungan.','e'); return; }

    const total = p.price * dur;
    const btn2 = document.getElementById('btnBook');
    const orig2 = btn2?.textContent;
    if(btn2){ btn2.disabled=true; btn2.textContent='Memproses…'; }
    let booking;
    try {
      booking = await Store.addBooking({
        patientId: u.id, nurseId: n.id, patientProfileId, patientProfileName,
        nurseName: n.name, nurseSpecialty: p.specialty,
        service, date, time, duration: dur, address, notes,
        totalCost: total,
        promoCode: appliedPromo?.code || undefined,
      });
    } catch(e) {
      toast('Gagal membuat janji temu: '+(e.message||'coba lagi.'), 'e');
      if(btn2){ btn2.disabled=false; btn2.textContent=orig2; }
      return;
    }
    if(btn2) btn2.textContent = 'Memproses pembayaran…';
    try {
      await Payment.payBooking({
        bookingId:   booking.id,
        totalCost:   booking.totalCost,
        nurseName:   n.name,
        service,
        buyerName:   u.name,
        buyerEmail:  u.email,
        buyerPhone:  u.phone||'08000000000',
      });
    } catch(err){
      // Janji temu tersimpan (belum lunas) tapi redirect ke DOKU gagal — tampilkan
      // alasan sebenarnya, jangan sembunyikan di balik pesan sukses yang menyesatkan.
      toast('Janji temu tersimpan, tapi gagal membuka pembayaran: '+(err.message||'coba lagi.'), 'e');
      setTimeout(()=>navigate('#dashboard'), 1800);
      console.error('[Payment] DOKU redirect failed:', err.message);
    }
    if(btn2){ btn2.disabled=false; btn2.textContent=orig2; }
  });
}
