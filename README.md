# The Secret Message (Arinex Chat)

Aplikasi chat realtime sederhana berbasis web, bisa dipasang seperti aplikasi HP (PWA). Dibangun tanpa framework — hanya HTML, CSS, dan JavaScript murni — dengan Firebase sebagai backend.

---

## Daftar isi

- [Teknologi yang dipakai](#teknologi-yang-dipakai)
- [Struktur folder](#struktur-folder)
- [Cara deploy](#cara-deploy)
- [Konfigurasi wajib sebelum dipakai](#konfigurasi-wajib-sebelum-dipakai)
- [Fitur](#fitur)
- [Struktur data Firebase](#struktur-data-firebase)
- [Keamanan](#keamanan)
- [Keterbatasan yang perlu diketahui](#keterbatasan-yang-perlu-diketahui)
- [Pemecahan masalah](#pemecahan-masalah)

---

## Teknologi yang dipakai

| Bagian | Teknologi | Fungsi |
|---|---|---|
| Login & sesi | **Firebase Authentication** | Daftar, login, verifikasi email, reset password |
| Pesan realtime | **Firebase Realtime Database** | Menyimpan kontak, chat, dan pesan; mengirim perubahan ke semua perangkat lewat WebSocket |
| Tampilan | **HTML + CSS + JavaScript (ES Modules)** | Tanpa React/Vue, berjalan langsung di browser |
| Kirim gambar | **GitHub REST API** | Gambar dikompres di browser lalu diunggah ke repo GitHub, disimpan sebagai tautan `raw.githubusercontent.com` |
| Dipasang seperti app | **PWA** (manifest + service worker) | Bisa ditambahkan ke layar utama, tampil tanpa bilah alamat browser |
| Hosting | **Vercel** | Menyajikan file statis lewat CDN dengan HTTPS otomatis |

Tidak ada server backend milik sendiri. Semua logika berjalan di browser pengguna (*serverless*), kecuali unggah gambar yang memanggil API GitHub secara langsung dari browser.

---

## Struktur folder

```
index.html              Halaman utama (boot, auth, chat)
info.html                Halaman "Tentang Aplikasi" + pemutar musik
token.html                Panduan membuat token GitHub pribadi
manifest.webmanifest      Metadata PWA (nama, ikon, warna)
sw.js                     Service worker (cache & notifikasi)
vercel.json               Header keamanan & cache untuk hosting Vercel
css/
  style.css               Gaya dasar (dari desain awal)
  extra.css               Tambahan: tema gelap, mobile, modal, dsb.
js/
  app.js                  Seluruh logika aplikasi
  gh-config.js            Konfigurasi tetap: owner/repo/branch GitHub untuk gambar
img/
  icon-192.png, icon-512.png   Ikon aplikasi (PWA)
  badge-192.png                Ikon siluet untuk status bar notifikasi
  logo-merpati-merah.png       Logo merpati merah (aset umum)
audio/
  notifikasi.mp3          Suara notifikasi pesan masuk (perlu diisi sendiri)
musik/
  musik1.mp3, musik3.mp4  Berkas musik untuk pemutar di info.html
```

---

## Cara deploy

1. Unggah seluruh folder ini ke repo GitHub.
2. Hubungkan repo itu ke [Vercel](https://vercel.com) sebagai proyek baru (tidak perlu build step, cukup *static site*).
3. Tambahkan domain Vercel yang dihasilkan ke **Firebase Console → Authentication → Settings → Authorized domains**, supaya verifikasi email dan reset password berfungsi.
4. Buka aplikasi sekali, pastikan boot berjalan, lalu coba daftar akun baru.

---

## Konfigurasi wajib sebelum dipakai

### 1. Firebase

Konfigurasi Firebase sudah tertanam di `js/app.js` (bagian `firebaseConfig`) dan **tidak perlu diubah** kecuali Anda memakai proyek Firebase sendiri. Struktur data yang sudah ada di database tidak diubah oleh pembaruan apa pun di kode ini — pengguna lama tetap bisa login kapan saja.

### 2. GitHub (untuk fitur kirim gambar & foto profil)

Buka `js/gh-config.js`:

```js
export const GH_FIXED_PUBLIC = {
  owner: '085871373603',   // GANTI dengan username GitHub asli Anda
  repo: 'arinexPigeon',
  branch: 'main',
  folder: 'arinex-chat'
};
```

Langkah yang wajib dilakukan:
1. Buat repository GitHub baru, **publik** (wajib, supaya lawan bicara bisa melihat gambar).
2. Ganti `owner` dengan username GitHub Anda yang sebenarnya (hanya huruf, angka, tanda hubung — **tidak boleh ada titik**), dan `repo` dengan nama repo tadi.
3. Setiap pengguna aplikasi (bukan hanya Anda) perlu membuat **token pribadi miliknya sendiri** lewat menu **Akun → Pengaturan → 🔑 Request Token**, yang akan membuka `token.html` berisi panduan langkah demi langkah ke halaman resmi GitHub.
4. Tanpa token diisi, chat teks tetap berjalan normal — hanya fitur kirim gambar dan foto profil yang tidak aktif.

> Token tidak pernah ditanam di kode maupun server mana pun. Token hanya tersimpan di `localStorage` perangkat masing-masing pengguna.

### 3. Suara notifikasi

Tambahkan berkas audio pendek (idealnya < 2 detik) di:

```
audio/notifikasi.mp3
```

Jika berkas ini tidak ada, aplikasi otomatis memakai nada bip bawaan sebagai cadangan, jadi aplikasi tidak akan error.

### 4. Ikon aplikasi

`img/icon-192.png` dan `img/icon-512.png` saat ini adalah placeholder (merpati putih di atas latar merah). Ganti dengan logo final Anda pada ukuran yang sama persis (192×192 dan 512×512 piksel, format PNG) agar tampil rapi di layar utama HP.

---

## Fitur

**Akun & sesi**
- Daftar, login, verifikasi email, reset password lewat Firebase Authentication.
- Sesi tersimpan di perangkat, pengguna tidak perlu login ulang setiap membuka aplikasi.

**Chat**
- Pesan teks realtime, dikirim dan diterima dalam hitungan detik.
- Kirim gambar (dikompres otomatis sebelum diunggah).
- **Balas pesan**: tekan-lama pada bubble pesan untuk membalas, membuka menu dengan opsi Balas, Salin teks, dan Tarik pesan.
- **Tarik pesan**: pesan milik sendiri bisa ditarik dalam **1 jam** sejak terkirim (`RECALL_LIMIT_MS` di `app.js`, bisa diubah). Pesan yang ditarik tidak dihapus dari database, hanya ditandai dan diganti tampilannya menjadi "Pesan ini telah ditarik" untuk semua pihak.
- Pemisah tanggal, viewer gambar layar penuh, panel emoji.
- Status online/offline sederhana (presence).

**Profil**
- Ubah nama dan foto profil (foto memerlukan token GitHub terisi).

**Notifikasi**
- Badge jumlah pesan belum dibaca pada daftar kontak dan judul tab/aplikasi.
- Notifikasi sistem dengan ikon aplikasi dan ikon siluet khusus di status bar.
- Suara (`audio/notifikasi.mp3`) dan getar saat ada pesan masuk.
- Browser **tidak bisa dipaksa** mengizinkan notifikasi tanpa persetujuan pengguna — ini aturan keamanan standar di semua browser. Aplikasi ini meminta izin otomatis satu kali saat pertama masuk, dan menampilkan banner pengingat selama pengguna belum memilih Izinkan/Blokir.

**PWA**
- Bisa dipasang ke layar utama lewat tombol "Pasang aplikasi" di menu akun, atau banner yang muncul otomatis.
- Bekerja dengan layout yang menyesuaikan keyboard dan *safe area* perangkat (notch, bilah navigasi).

**Tema**
- Mode terang dan gelap, tersimpan per perangkat.

---

## Struktur data Firebase

Tidak diubah dari struktur yang sudah ada, hanya ditambah beberapa field opsional baru (aman untuk data lama yang tidak memilikinya):

```
users/{uid}                     displayName, createdAt, updatedAt
publicProfiles/{uid}            displayName, updatedAt, photoURL (baru, opsional)
emailIndex/{hashEmail}          uid
contacts/{uid}/{peerUid}        displayName, email, addedAt
chats/{chatId}                  type, createdAt, participants
chats/{chatId}/messages/{id}    senderId, text, createdAt,
                                 replyTo (baru, opsional): { id, text, senderId }
                                 deleted (baru, opsional): true/false
                                 deletedAt (baru, opsional)
presence/{uid}                  online, lastSeen
```

`chatId` adalah gabungan dua UID yang diurutkan, dipisah `__`.

---

## Keamanan

- **Database Rules Firebase adalah pertahanan utama**, bukan kode JavaScript. Pastikan rules membatasi:
  - `chats/{chatId}` hanya bisa dibaca/ditulis oleh UID yang ada di `participants`.
  - `contacts/{uid}` hanya bisa dibaca/ditulis oleh pemilik UID tersebut.
  - Field `deleted`/`deletedAt` pada pesan hanya bisa ditulis oleh `senderId` pesan tersebut.
- Pesan **tidak terenkripsi end-to-end**. Data tersimpan sebagai teks biasa di Firebase, sehingga secara teknis bisa dibaca pemilik proyek Firebase. Nama aplikasi sebaiknya dipahami sebagai "privat antar akun", bukan "tidak bisa dibaca siapa pun".
- Token GitHub milik pengguna disimpan di `localStorage`, hanya di perangkat itu sendiri, tidak pernah dikirim ke server lain.
- Repo GitHub untuk gambar harus publik, artinya siapa pun yang mengetahui tautan gambar bisa membukanya langsung.

---

## Keterbatasan yang perlu diketahui

- **Notifikasi saat aplikasi benar-benar tertutup** tidak akan sampai. Notifikasi web hanya bekerja selama aplikasi terbuka atau berjalan di latar belakang (tab/PWA masih aktif di memori). Notifikasi push sungguhan ("walau aplikasi ditutup total") memerlukan Firebase Cloud Messaging plus server pengirim, yang belum diimplementasikan di sini.
- **Bukan enkripsi end-to-end.** Lihat bagian Keamanan.
- **Fitur kirim gambar bergantung pada konfigurasi GitHub.** Jika `owner`/`repo` di `gh-config.js` salah atau repo privat, pengiriman gambar akan gagal atau gambar tidak terlihat oleh lawan bicara.
- **Ini PWA, bukan APK asli.** Untuk membuat APK sungguhan, gunakan PWABuilder atau Bubblewrap dengan URL aplikasi yang sudah di-deploy.

---

## Pemecahan masalah

| Gejala | Kemungkinan penyebab |
|---|---|
| "Repo tidak ditemukan" saat simpan token | `owner`/`repo` di `gh-config.js` salah, atau repo belum dibuat |
| Gambar tidak muncul di perangkat lawan bicara | Repo GitHub masih privat |
| Notifikasi tidak pernah muncul | Izin notifikasi browser berstatus "Blokir" — harus diubah manual lewat pengaturan situs di browser |
| Aplikasi tidak bisa dipasang ke layar utama | `manifest.webmanifest` belum tertaut di `index.html`, atau ikon tidak sesuai ukuran |
| Verifikasi email/reset password tidak terkirim | Domain hosting belum ditambahkan ke Firebase Authorized Domains |
| Tema gelap tidak berubah | Cache lama — hapus data situs di browser atau copot & pasang ulang PWA |

---

*Dokumen ini dibuat untuk membantu pengelolaan proyek. Perbarui bagian konfigurasi setiap kali nilai `gh-config.js` atau struktur data berubah.*
