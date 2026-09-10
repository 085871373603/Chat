# Arinex Chat — PWA Firebase

Versi pertama aplikasi chat realtime ala WhatsApp untuk deploy statis di GitHub Pages.

## Fitur

- Daftar akun memakai email + password.
- Verifikasi email wajib sebelum chat dapat digunakan.
- Reset password via Firebase Authentication.
- Kontak dicari menggunakan email.
- Pencarian kontak menggunakan SHA-256 email index, bukan daftar email mentah.
- Realtime messaging menggunakan Firebase Realtime Database.
- UI responsive desktop/mobile.
- PWA installable dengan `img/chat_logo.png`.
- Pesan dirender memakai `textContent` sehingga HTML/script dari pengguna tidak dieksekusi.
- Firebase Security Rules membatasi user, contact, participant chat, dan pengirim pesan.

## Struktur

```text
arinex-chat/
├── index.html
├── manifest.webmanifest
├── sw.js
├── firebase-rules.json
├── README.md
├── css/style.css
├── js/app.js
└── img/chat_logo.png
```

## 1. Firebase Authentication

Di Firebase Console → Authentication → Sign-in method, aktifkan **Email/Password**.

Di Authentication → Settings → Password policy, gunakan kebijakan minimal 8 karakter dan kompleksitas yang sesuai kebijakan bisnis Anda.

Tambahkan domain GitHub Pages Anda pada Authentication → Settings → Authorized domains, misalnya `username.github.io`.

## 2. Realtime Database Rules

Salin isi `firebase-rules.json` ke Firebase Console → Realtime Database → Rules → Publish.

Rules sengaja default-deny dan akses harus lolos dari Firebase Authentication + email verification. Firebase mendokumentasikan bahwa Rules ditegakkan di server dan merupakan kontrol keamanan utama untuk akses data realtime.

## 3. GitHub Pages

Upload seluruh folder project ke repository. Aktifkan Settings → Pages → Deploy from branch.

Jangan membuka file memakai `file://`. PWA dan Firebase Auth harus berjalan dari origin HTTPS.

## 4. Icon

Sediakan file:

`img/chat_logo.png`

Direkomendasikan gambar persegi minimal 512×512 px agar icon Android/desktop tetap tajam.

## Catatan keamanan penting

Firebase Web config memang berada di sisi client. Yang harus dirahasiakan bukan konfigurasi tersebut, melainkan service-account credential, private key, dan secret backend. Perlindungan data aplikasi bergantung pada Firebase Authentication dan Security Rules.

Aplikasi statis ini tidak menjalankan server sendiri. Karena itu pengendalian seperti rate-limit per pesan, audit keamanan terpusat, moderasi, blocking, device/session management tingkat server, dan push notification background penuh sebaiknya ditambahkan dengan Cloud Functions/backend ketika masuk tahap produksi.

Indeks email memakai SHA-256 agar daftar raw email tidak dibaca secara massal. Namun, lookup berbasis client tetap memiliki batasan karena integritas pemetaan hash→UID pada skenario adversarial sebaiknya ditegakkan oleh backend trusted/Cloud Function. Rules saat ini mencegah overwrite index yang sudah ada dan hanya mengizinkan claim untuk UID yang terautentikasi.

## Production hardening

- Aktifkan App Check untuk Web + Realtime Database setelah domain production sudah ditentukan.
- Tambahkan Cloud Functions untuk rate limiting, audit log, email contact invitation, dan cleanup akun.
- Jangan pernah menaruh Firebase Admin SDK/service account JSON di repository GitHub.
- Pertimbangkan Firebase Hosting jika ingin integrasi Firebase lebih rapi, meski GitHub Pages tetap dapat digunakan untuk versi statis ini.
