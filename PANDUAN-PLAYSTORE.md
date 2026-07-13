# 📱 Panduan: Akemat Foundation → Google Play Store
## Web App → Android App (TWA — Trusted Web Activity)

---

## 🗂️ Apa yang sudah disiapkan

Website Akemat Foundation sekarang sudah berupa **PWA (Progressive Web App)** lengkap:

```
akemat-v3/
├── index.html        ← SPA utama
├── manifest.json     ← Identitas app (nama, ikon, warna)
├── sw.js             ← Service Worker (offline, caching)
├── icons/            ← Ikon semua ukuran (72–512px)
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
├── css/style.css
└── js/
    ├── app.js
    └── data.js
```

---

## 🚀 Cara Termudah: pwabuilder.com (GRATIS)

**Tidak perlu coding Android sama sekali.**

### Langkah 1 — Deploy dulu ke Netlify
Website sudah live di akematfoundation.org ✅

### Langkah 2 — Buka pwabuilder.com

1. Buka **https://www.pwabuilder.com**
2. Masukkan URL: `https://akematfoundation.org`
3. Klik **"Start"**
4. PWA Builder akan scan website dan memverifikasi manifest + service worker
5. Skor harus ≥ 95 agar siap Google Play

### Langkah 3 — Generate Android Package

1. Klik **"Package for Stores"**
2. Pilih **"Google Play"**
3. Isi form:
   - **App name**: Akemat Foundation
   - **Package name**: `org.akematfoundation.app`
   - **App version**: 1.0.0
   - **Version code**: 1
   - **Host**: `akematfoundation.org`
   - **Start URL**: `/`
4. Klik **"Generate"**
5. Download file `.zip` berisi:
   - `app-release-bundle.aab` ← upload ke Play Store
   - `signing.keystore` ← **SIMPAN BAIK-BAIK, tidak bisa recover!**
   - `key.properties`
   - `assetlinks.json` ← WAJIB dipasang di website

### Langkah 4 — Pasang assetlinks.json di website

File ini membuktikan ke Google bahwa website dan app Android terhubung.

1. Copy file `assetlinks.json` dari ZIP hasil PWA Builder
2. Buat folder di repo GitHub: `.well-known/`
3. Upload `assetlinks.json` ke dalam folder tersebut
4. File harus bisa diakses di: `https://akematfoundation.org/.well-known/assetlinks.json`

**Cara di Netlify:** buat file `public/.well-known/assetlinks.json` atau tambah header di `netlify.toml`:
```toml
[[headers]]
  for = "/.well-known/assetlinks.json"
  [headers.values]
    Content-Type = "application/json"
    Access-Control-Allow-Origin = "*"
```

### Langkah 5 — Upload ke Google Play Console

1. Buka **https://play.google.com/console**
2. Daftar Google Play Developer Account (biaya satu kali: $25 USD)
3. **"Create app"** → nama: "Akemat Foundation"
4. Isi semua informasi:
   - **Kategori**: Health & Fitness / Medical
   - **Target audience**: 18+
   - **Content rating**: survey tentang konten medis
5. Upload `.aab` di: Production → Create new release
6. Isi deskripsi, screenshot, ikon 512x512
7. Submit untuk review (biasanya 3–7 hari kerja)

---

## 📋 Checklist Sebelum Submit ke Play Store

### Konten yang wajib disiapkan

| Item | Ukuran | Keterangan |
|------|--------|------------|
| Ikon app | 512×512 px PNG | Background solid, tanpa transparansi |
| Feature graphic | 1024×500 px | Banner atas di Play Store |
| Screenshot HP | min. 2 gambar | 320px–3840px, rasio 9:16 disarankan |
| Short description | maks. 80 karakter | "Layanan perawat home care & donasi kemanusiaan" |
| Full description | maks. 4000 karakter | Tulis manfaat, fitur utama, cara pakai |

### Konten teks siap pakai

**Short description (80 char):**
```
Perawat jiwa, lansia & home care profesional + platform donasi
```

**Full description:**
```
Akemat Foundation — Platform layanan perawatan di rumah (home care) dan donasi kemanusiaan.

LAYANAN PERAWAT HOME CARE
✅ 7 spesialisasi: Perawat Jiwa, Anak & Bayi, Lansia, Medical Bedah, Luka, Maternitas, Paliatif
✅ Perawat terverifikasi dengan STR aktif
✅ Booking mudah langsung dari aplikasi
✅ Transparansi biaya — perawat terima 80%
✅ Pilih tanggal, waktu, dan durasi kunjungan

KAMPANYE DONASI
❤️ Bantu keluarga yang membutuhkan perawatan namun terkendala biaya
❤️ Campaign diverifikasi oleh tim Akemat
❤️ 95% donasi langsung ke penerima
❤️ Lacak perkembangan campaign secara real-time

UNTUK PERAWAT
👨‍⚕️ Daftar sebagai mitra perawat
👨‍⚕️ Atur sendiri jadwal dan tarif
👨‍⚕️ Terima pembayaran langsung ke rekening

Hubungi kami: customecare@akematfoundation.org
WhatsApp: 0851 9640 7117
```

---

## 🔧 Alternatif Lain (Jika Ingin Lebih Custom)

### Opsi B: Bubblewrap CLI (untuk developer)
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://akematfoundation.org/manifest.json
bubblewrap build
```

### Opsi C: Android Studio + TWA Activity
Buat project Android minimal dengan dependency:
```gradle
implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
```

---

## ⚠️ Penting: Persyaratan Google Play

1. **Domain harus HTTPS** ✅ (Netlify sudah auto-HTTPS)
2. **assetlinks.json wajib terpasang** sebelum submit
3. **Privacy Policy wajib ada** — tambahkan halaman `/privasi` di website
4. **Konten medis** memerlukan penjelasan bahwa app bukan pengganti dokter
5. **Google review** biasanya 3–7 hari, kadang perlu revisi

---

## 💡 Tips Mempercepat Approval

- Tulis deskripsi bahasa Indonesia yang jelas
- Gunakan screenshot langsung dari website di HP
- Jika ada error "Dangerous permissions", hapus permission yang tidak dipakai dari manifest
- Kategori "Medical" biasanya butuh disclaimer medis di dalam app

---

## 📞 Butuh Bantuan?

- **pwabuilder.com docs**: https://docs.pwabuilder.com
- **Google Play Console Help**: https://support.google.com/googleplay/android-developer
- **TWA Guide (resmi)**: https://developer.chrome.com/docs/android/trusted-web-activity
