# Arinex Chat v2

PWA realtime chat berbasis Firebase Authentication + Realtime Database, cocok untuk deployment Vercel dari GitHub.

## Firebase

1. Authentication → Sign-in method → aktifkan Email/Password.
2. Authentication → Settings → Authorized domains → tambahkan domain Vercel, misalnya `project.vercel.app`.
3. Authentication → Templates → Email address verification → sesuaikan nama pengirim.
4. Realtime Database → Rules → gunakan `firebase-rules.json`.
5. Setelah Rules diterapkan, buat akun baru, verifikasi email, lalu login.
6. Versi V2.2 memaksa refresh ID token setelah verifikasi/login agar Rules RTDB langsung mengenali email_verified=true, mencegah login macet pada "Memeriksa…".

## Vercel

Import repository GitHub sebagai project Vercel. Tidak membutuhkan build command untuk versi static ini.

## Catatan keamanan

Firebase Web config bukan kredensial Admin. Jangan pernah memasukkan Firebase service-account/private key ke repository frontend.

UI memblokir context menu, drag, selection, serta shortcut copy pada area non-input. Browser tidak menyediakan cara yang mutlak untuk mencegah screenshot atau copy oleh pengguna yang memiliki kendali penuh atas perangkat.

Untuk production skala tinggi, tambahkan App Check, Cloud Functions untuk contact lookup/rate limiting, monitoring, dan kebijakan abuse.


### V2.2 fixes
- Account menu with logout.
- Self-healing user profile/public profile/email index on verified login.
- Contact lookup now refreshes verified token first and gives actionable errors.
- Display name is rendered from Firebase Auth/profile consistently.
