'use strict';
// =========================================================
// Akemat Foundation — Halaman Auth (Login, Lupa Password, Register)
// Dipecah dari app.js dan dimuat lewat dynamic import() dari
// route() — halaman ini cuma perlu diparse saat pengunjung membuka
// #login/#lupa-password/#register, bukan di initial load beranda.
// Memakai helper global dari app.js/data.js (app, pwFieldHTML, renderTurnstile,
// passwordStrengthError, toast, navigate, Store, Otp, DB, MIN_NURSE_RATE,
// SPECIALTIES, SPECIALTY_ICONS, EDUCATION_LEVELS, BOOKING_SERVICES).
// =========================================================

export function renderLogin(){
  let tsToken = '', ts2Token = '';
  let identifier = '', pass = '', twoFactorPhone = '', otpRequestId = null;
  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <div id="loginStep1">
        <h2>Masuk ke Akemat</h2>
        <p class="lead">Masuk ke akun Akemat Foundation Anda.</p>
        <div class="ff"><label>Email atau No. HP</label><input type="text" id="loginEmail" placeholder="email@anda.com atau 08xx…" autocomplete="username" /></div>
        ${pwFieldHTML('loginPass','Password','••••••••','current-password')}
        <div id="tsLogin" style="margin-top:10px"></div>
        <div class="form-error" id="loginErr"></div>
        <button class="btn btn-primary btn-full" id="btnLogin" style="margin-top:12px">Masuk</button>
        <div style="text-align:center;margin-top:14px;font-size:.84rem;color:var(--soft)">
          Belum punya akun? <a href="#register" style="color:var(--accent2);font-weight:700">Daftar sekarang →</a>
        </div>
        <div style="text-align:center;margin-top:8px;font-size:.84rem">
          <a href="#lupa-password" style="color:var(--soft)">Lupa password?</a>
        </div>
      </div>
      <div id="loginStep2" style="display:none">
        <h2>Verifikasi 2 Langkah</h2>
        <p class="lead">Akun ini mengaktifkan verifikasi 2 langkah. Kirim kode OTP ke nomor WhatsApp terdaftar Anda dulu.</p>
        <div id="tsLogin2fa" style="margin-bottom:12px"></div>
        <button class="btn btn-outline btn-full" id="btnLogin2faSend">Kirim Kode OTP WA</button>
        <div class="ff" id="login2faCodeWrap" style="display:none;margin-top:12px">
          <label>Kode OTP WhatsApp</label>
          <input type="text" id="login2faCode" inputmode="numeric" maxlength="6" placeholder="6 digit kode" style="letter-spacing:.3em" />
        </div>
        <div class="form-error" id="login2faErr"></div>
        <button class="btn btn-primary btn-full" id="btnLogin2faVerify" style="display:none;margin-top:10px">Verifikasi &amp; Masuk</button>
      </div>
    </div>
  </div>`;
  renderTurnstile('tsLogin', (t)=>{ tsToken = t; });

  document.getElementById('btnLogin')?.addEventListener('click',async ()=>{
    identifier = document.getElementById('loginEmail')?.value.trim();
    pass  = document.getElementById('loginPass')?.value;
    const err   = document.getElementById('loginErr');
    const btn   = document.getElementById('btnLogin');
    if(btn.disabled) return;
    if(!identifier||!pass){ err.textContent = 'Isi email/No. HP dan password.'; return; }
    if(!tsToken){ err.textContent = 'Selesaikan verifikasi keamanan di atas terlebih dahulu.'; return; }
    err.textContent = '';
    btn.disabled = true;
    try {
      const u = await Store.login(identifier, pass, tsToken);
      toast('Selamat datang, '+u.name.split(' ')[0]+'!','s');
      navigate('#home');
    } catch(e) {
      if(e.twoFactorRequired){
        twoFactorPhone = e.phone;
        document.getElementById('loginStep1').style.display = 'none';
        document.getElementById('loginStep2').style.display = 'block';
        renderTurnstile('tsLogin2fa', (t)=>{ ts2Token = t; });
      } else {
        err.textContent = e.message || 'Email/No. HP atau password salah.';
      }
    } finally {
      btn.disabled = false;
      window.turnstile?.reset(); tsToken = ''; // token sekali pakai — siapkan yang baru buat percobaan berikutnya
    }
  });

  document.getElementById('btnLogin2faSend')?.addEventListener('click', async ()=>{
    const err = document.getElementById('login2faErr');
    const btn = document.getElementById('btnLogin2faSend');
    if(btn.disabled) return;
    if(!ts2Token){ err.textContent = 'Selesaikan verifikasi keamanan di atas terlebih dahulu.'; return; }
    err.textContent = '';
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Mengirim…';
    try {
      otpRequestId = await Otp.send(twoFactorPhone, ts2Token);
      document.getElementById('login2faCodeWrap').style.display = 'block';
      document.getElementById('btnLogin2faVerify').style.display = 'block';
      btn.style.display = 'none';
      toast('Kode OTP dikirim via WhatsApp.','s');
    } catch(e){
      err.textContent = e.message || 'Gagal mengirim OTP.';
      btn.disabled = false; btn.textContent = orig;
    } finally {
      window.turnstile?.reset(); ts2Token = '';
    }
  });

  document.getElementById('btnLogin2faVerify')?.addEventListener('click', async ()=>{
    const err  = document.getElementById('login2faErr');
    const code = document.getElementById('login2faCode')?.value.trim();
    const btn  = document.getElementById('btnLogin2faVerify');
    if(btn.disabled) return;
    if(!code){ err.textContent = 'Masukkan kode OTP.'; return; }
    err.textContent = '';
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Memeriksa…';
    try {
      const proof = await Otp.verify(otpRequestId, code, twoFactorPhone);
      const u = await Store.login(identifier, pass, '', proof);
      toast('Selamat datang, '+u.name.split(' ')[0]+'!','s');
      navigate('#home');
    } catch(e) {
      err.textContent = e.message || 'Kode OTP salah atau kadaluarsa.';
      btn.disabled = false; btn.textContent = orig;
    }
  });

  // Enter key
  document.addEventListener('keydown', function onEnter(e){
    if(e.key === 'Enter' && document.getElementById('loginEmail')){
      document.getElementById('btnLogin')?.click();
      document.removeEventListener('keydown', onEnter);
    }
  });
}

export function renderForgotPassword(){
  let otpRequestId = null;
  let verifiedPhone = null;
  let otpProof = null;
  let tsToken = '';

  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <h2>Lupa Password</h2>
      <p class="lead">Verifikasi nomor HP terdaftar via WhatsApp untuk atur ulang password.</p>

      <div id="fpStep1">
        <div class="ff"><label>No. HP terdaftar</label><input type="tel" id="fpPhone" placeholder="08xx…" autocomplete="tel" /></div>
        <div id="tsForgot" style="margin:10px 0"></div>
        <button class="btn btn-primary btn-full" id="btnFpSendOtp" style="margin-top:8px">Kirim OTP WA</button>
      </div>

      <div id="fpStep2" style="display:none;margin-top:14px">
        <div class="ff">
          <label>Kode OTP WhatsApp</label>
          <input type="text" id="fpOtpCode" inputmode="numeric" maxlength="6" placeholder="6 digit kode" style="letter-spacing:.3em" />
        </div>
        <button class="btn btn-primary btn-full" id="btnFpVerifyOtp">Verifikasi Kode</button>
      </div>

      <div id="fpStep3" style="display:none;margin-top:14px">
        ${pwFieldHTML('fpNewPass','Password baru','Min. 8 karakter, bukan cuma angka','new-password')}
        ${pwFieldHTML('fpNewPass2','Konfirmasi password baru','Ulangi password baru','new-password')}
        <button class="btn btn-primary btn-full" id="btnFpSavePass">Simpan Password Baru</button>
      </div>

      <div class="form-error" id="fpErr"></div>
      <div style="text-align:center;margin-top:14px;font-size:.84rem;color:var(--soft)">
        <a href="#login" style="color:var(--accent2);font-weight:700">← Kembali ke Masuk</a>
      </div>
    </div>
  </div>`;
  renderTurnstile('tsForgot', (t)=>{ tsToken = t; });

  document.getElementById('btnFpSendOtp')?.addEventListener('click', async ()=>{
    const err   = document.getElementById('fpErr');
    const phone = document.getElementById('fpPhone')?.value.trim();
    const btn   = document.getElementById('btnFpSendOtp');
    err.textContent = '';
    if(!phone){ err.textContent = 'Isi nomor HP terlebih dahulu.'; return; }
    if(!tsToken){ err.textContent = 'Selesaikan verifikasi keamanan terlebih dahulu.'; return; }
    if(btn.disabled) return; // cegah klik ganda memicu 2 request OTP sekaligus
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Memeriksa…';
    try {
      if(!(await Store.getUserByPhone(phone))){ err.textContent = 'Nomor HP tidak terdaftar.'; return; }
      btn.textContent = 'Mengirim…';
      otpRequestId = await Otp.send(phone, tsToken);
      verifiedPhone = phone;
      document.getElementById('fpStep1').style.display = 'none';
      document.getElementById('fpStep2').style.display = 'block';
      toast('Kode OTP dikirim via WhatsApp.','s');
    } catch(e){
      err.textContent = e.message || 'Gagal mengirim OTP.';
    } finally {
      btn.disabled = false; btn.textContent = orig;
      window.turnstile?.reset(); tsToken = ''; // token sekali pakai
    }
  });

  document.getElementById('btnFpVerifyOtp')?.addEventListener('click', async ()=>{
    const err  = document.getElementById('fpErr');
    const code = document.getElementById('fpOtpCode')?.value.trim();
    err.textContent = '';
    if(!code){ err.textContent = 'Masukkan kode OTP.'; return; }
    const btn = document.getElementById('btnFpVerifyOtp');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Memeriksa…';
    try {
      otpProof = await Otp.verify(otpRequestId, code, verifiedPhone);
      document.getElementById('fpStep2').style.display = 'none';
      document.getElementById('fpStep3').style.display = 'block';
      toast('Nomor HP terverifikasi. Silakan atur password baru.','s');
    } catch(e){
      err.textContent = e.message || 'Kode OTP salah atau kadaluarsa.';
    }
    btn.disabled = false; btn.textContent = orig;
  });

  document.getElementById('btnFpSavePass')?.addEventListener('click', async ()=>{
    const err   = document.getElementById('fpErr');
    const pass  = document.getElementById('fpNewPass')?.value;
    const pass2 = document.getElementById('fpNewPass2')?.value;
    err.textContent = '';
    if(!verifiedPhone){ err.textContent = 'Verifikasi OTP terlebih dahulu.'; return; }
    const pwErr = passwordStrengthError(pass);
    if(pwErr){ err.textContent = pwErr; return; }
    if(pass !== pass2){ err.textContent = 'Konfirmasi password tidak cocok.'; return; }
    const btn = document.getElementById('btnFpSavePass');
    btn.disabled = true;
    try {
      await Store.resetPassword({ phone: verifiedPhone, proof: otpProof, newPassword: pass });
      toast('Password berhasil diubah. Silakan masuk.','s');
      navigate('#login');
    } catch(e) {
      err.textContent = e.message || 'Gagal mengubah password.';
      btn.disabled = false;
    }
  });
}

export function renderRegister(){
  let selRole = 'patient';
  let phoneVerified = false;
  let otpRequestId  = null;
  let verifiedPhone = '';
  let otpProof      = null;
  let tsToken       = '';
  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <h2>Daftar ke Akemat</h2>
      <p class="lead">Pilih peran Anda di platform.</p>
      <div class="role-pick-grid">
        <div class="role-pick active" data-role="patient">
          <div class="role-pick-icon">🏠</div>
          <div class="role-pick-name">Pasien</div>
          <div class="role-pick-desc">Cari &amp; buat janji temu dengan perawat</div>
        </div>
        <div class="role-pick" data-role="nurse">
          <div class="role-pick-icon">👨‍⚕️</div>
          <div class="role-pick-name">Perawat</div>
          <div class="role-pick-desc">Tawarkan jasa</div>
        </div>
        <div class="role-pick" data-role="donor">
          <div class="role-pick-icon">❤️</div>
          <div class="role-pick-name">Penggalang Dana</div>
          <div class="role-pick-desc">Buat &amp; kelola campaign donasi</div>
        </div>
      </div>

      <div class="ff"><label>Nama lengkap</label><input type="text" id="regName" placeholder="Nama sesuai KTP" autocomplete="name" /></div>
      <div class="ff row2">
        <div><label>Email</label><input type="email" id="regEmail" placeholder="email@anda.com" autocomplete="email" /></div>
        <div>
          <label>No. HP</label>
          <div style="display:flex;gap:8px">
            <input type="tel" id="regPhone" placeholder="08xx…" style="flex:1" autocomplete="tel" />
            <button type="button" class="btn btn-outline btn-sm" id="btnSendOtp" style="white-space:nowrap">Kirim OTP WA</button>
          </div>
        </div>
      </div>
      <div id="tsRegister" style="margin:6px 0"></div>
      <div class="ff" id="otpSection" style="display:none">
        <label>Kode OTP WhatsApp</label>
        <div style="display:flex;gap:8px">
          <input type="text" id="regOtpCode" inputmode="numeric" maxlength="6" placeholder="6 digit kode" style="flex:1;letter-spacing:.3em" />
          <button type="button" class="btn btn-primary btn-sm" id="btnVerifyOtp" style="white-space:nowrap">Verifikasi</button>
        </div>
        <p style="font-size:.74rem;color:var(--soft);margin:6px 0 0" id="otpStatus">Kode dikirim via WhatsApp ke nomor di atas.</p>
      </div>
      ${pwFieldHTML('regPass','Password','Min. 8 karakter, bukan cuma angka','new-password')}

      <!-- Nurse extra -->
      <div id="nurseExtra" style="display:none">
        <div class="ff">
          <label>Spesialisasi</label>
          <select id="regSpecialty">
            ${SPECIALTIES.map(s=>'<option value="'+s+'">'+SPECIALTY_ICONS[s]+' '+s+'</option>').join('')}
          </select>
        </div>
        <div class="ff">
          <label>Pendidikan</label>
          <select id="regEducation">
            ${EDUCATION_LEVELS.map(e=>'<option value="'+e+'">'+e+'</option>').join('')}
          </select>
        </div>
        <div class="ff"><label>Kota domisili</label><input type="text" id="regLoc" placeholder="Bogor" /></div>
        <div class="ff"><label>Tarif per jam (Rp)</label><input type="number" id="regPrice" placeholder="150000" min="100000" /><p style="font-size:.72rem;color:var(--soft);margin:4px 0 0">Minimal Rp100.000/jam.</p></div>
        <div class="ff"><label>Bio singkat</label><textarea id="regBio" rows="3" placeholder="Pengalaman, sertifikasi, keunggulan Anda…"></textarea></div>
      </div>

      <div class="form-error" id="regErr"></div>
      <button class="btn btn-primary btn-full" id="btnRegister" style="background:#1F4D3F !important;color:#FFFFFF !important;font-size:1rem;padding:14px;letter-spacing:.03em;font-weight:800;box-shadow:0 2px 8px rgba(31,77,63,.3)">Daftar Sekarang</button>
      <div style="text-align:center;margin-top:12px;font-size:.82rem;color:var(--soft)">
        Sudah punya akun? <a href="#login">Masuk</a>
      </div>
      <div style="text-align:center;margin-top:10px;font-size:.74rem;color:var(--soft)">
        Dengan mendaftar, Anda menyetujui <a href="#tnc">Syarat &amp; Ketentuan</a> dan <a href="#privasi">Kebijakan Privasi</a> kami.
      </div>
    </div>
  </div>`;
  renderTurnstile('tsRegister', (t)=>{ tsToken = t; });

  function updateRoleUI(){
    document.getElementById('nurseExtra').style.display  = selRole==='nurse'?'block':'none';
  }
  document.querySelectorAll('.role-pick').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.role-pick').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selRole = btn.dataset.role;
      updateRoleUI();
    });
  });
  updateRoleUI();

  // Reset verifikasi jika nomor HP diubah setelah terverifikasi
  document.getElementById('regPhone')?.addEventListener('input',()=>{
    if(phoneVerified && document.getElementById('regPhone').value.trim() !== verifiedPhone){
      phoneVerified = false;
      document.getElementById('otpSection').style.display = 'none';
      document.getElementById('btnSendOtp').textContent = 'Kirim OTP WA';
    }
  });

  document.getElementById('btnSendOtp')?.addEventListener('click', async ()=>{
    const err   = document.getElementById('regErr');
    const phone = document.getElementById('regPhone')?.value.trim();
    const btn = document.getElementById('btnSendOtp');
    err.textContent = '';
    if(!phone){ err.textContent = 'Isi nomor HP terlebih dahulu.'; return; }
    if(!tsToken){ err.textContent = 'Selesaikan verifikasi keamanan terlebih dahulu.'; return; }
    if(btn.disabled) return; // cegah klik ganda memicu 2 request OTP sekaligus
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Mengirim…';
    try {
      otpRequestId = await Otp.send(phone, tsToken);
      verifiedPhone = phone;
      document.getElementById('otpSection').style.display = 'block';
      document.getElementById('otpStatus').textContent = 'Kode dikirim via WhatsApp ke '+phone+'.';
      toast('Kode OTP dikirim via WhatsApp.','s');
    } catch(e){
      err.textContent = e.message || 'Gagal mengirim OTP.';
    } finally {
      btn.disabled = false; btn.textContent = orig;
      window.turnstile?.reset(); tsToken = ''; // token sekali pakai
    }
  });

  document.getElementById('btnVerifyOtp')?.addEventListener('click', async ()=>{
    const err  = document.getElementById('regErr');
    const code = document.getElementById('regOtpCode')?.value.trim();
    err.textContent = '';
    if(!otpRequestId){ err.textContent = 'Kirim kode OTP terlebih dahulu.'; return; }
    if(!code){ err.textContent = 'Masukkan kode OTP.'; return; }
    const btn = document.getElementById('btnVerifyOtp');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Memeriksa…';
    try {
      otpProof = await Otp.verify(otpRequestId, code, verifiedPhone);
      phoneVerified = true;
      document.getElementById('otpStatus').textContent = '✅ Nomor HP terverifikasi.';
      toast('Nomor HP berhasil diverifikasi.','s');
    } catch(e){
      phoneVerified = false;
      err.textContent = e.message || 'Kode OTP salah atau kadaluarsa.';
    }
    btn.disabled = false; btn.textContent = orig;
  });

  document.getElementById('btnRegister')?.addEventListener('click', async ()=>{
    const err  = document.getElementById('regErr');
    const name = document.getElementById('regName')?.value.trim();
    const email= document.getElementById('regEmail')?.value.trim();
    const phone= document.getElementById('regPhone')?.value.trim();
    const pass = document.getElementById('regPass')?.value;

    if(!name||!email||!phone||!pass){ err.textContent='Lengkapi semua field wajib.'; return; }
    const pwErr = passwordStrengthError(pass);
    if(pwErr){ err.textContent = pwErr; return; }
    if(Store.backend==='local' && DB.getUserByEmail(email)){ err.textContent='Email sudah terdaftar.'; return; }
    if(!phoneVerified || phone !== verifiedPhone){ err.textContent='Verifikasi No. HP via WhatsApp (OTP) terlebih dahulu.'; return; }

    // Rekening pencairan & KTP dilengkapi belakangan dari halaman Profil.
    const userData = {
      name, email, phone, password: pass, role: selRole, phoneVerified: true,
      bankInfo: { bankName:'', accountNumber:'', accountName:'', verified:false },
      ktpStatus: 'pending',
    };

    if(selRole === 'nurse'){
      const spec  = document.getElementById('regSpecialty')?.value;
      const edu   = document.getElementById('regEducation')?.value;
      const loc   = document.getElementById('regLoc')?.value.trim();
      const price = parseInt(document.getElementById('regPrice')?.value)||MIN_NURSE_RATE;
      const bio   = document.getElementById('regBio')?.value.trim();
      if(!loc){ err.textContent='Isi kota domisili.'; return; }
      if(price < MIN_NURSE_RATE){ err.textContent='Tarif minimum Rp'+MIN_NURSE_RATE.toLocaleString('id-ID')+'/jam.'; return; }
      userData.np = {
        specialty: spec, education: edu, exp: 0, price,
        rating: 0, reviews: 0, loc, avail: true, verified: false,
        bio: bio||'Perawat baru bergabung di Akemat Foundation.',
        schedule:['Senin','Selasa','Rabu','Kamis','Jumat'],
        services: (BOOKING_SERVICES[spec]||[spec]),
      };
    }

    const regBtn = document.getElementById('btnRegister');
    regBtn.disabled = true;
    try {
      await Store.register(userData, otpProof);
      toast('Akun berhasil dibuat! Selamat bergabung, '+name.split(' ')[0]+'.','s');
      navigate('#dashboard');
    } catch(e) {
      err.textContent = e.message || 'Gagal membuat akun.';
      regBtn.disabled = false;
    }
  });
}
