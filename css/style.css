import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, reload, updateProfile } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, onValue, onChildAdded, query, limitToLast, onDisconnect, serverTimestamp, goOnline } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { GH_FIXED_PUBLIC } from "./gh-config.js";

/* ================= FIREBASE (konfigurasi & struktur data TIDAK diubah) ================= */
const firebaseConfig = {
  apiKey: "AIzaSyCFsAAGRTW0et7_pQnxhLtkGR174kRqikg",
  authDomain: "arinexservice.firebaseapp.com",
  databaseURL: "https://arinexservice-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "arinexservice",
  storageBucket: "arinexservice.firebasestorage.app",
  messagingSenderId: "780762123532",
  appId: "1:780762123532:web:2c3b8a374eba5871490d29",
  measurementId: "G-SB9MXMZVCF"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const persistenceReady = setPersistence(auth, browserLocalPersistence);

   document.addEventListener('contextmenu', function (e) {
     if (e.target.tagName === 'IMG') e.preventDefault();
   });

/* ================= HELPER ================= */
const $ = id => document.getElementById(id);
const el = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };
const ls = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: k => { try { localStorage.removeItem(k); } catch {} }
};
const S = { user: null, profile: null, contacts: {}, peers: {}, activeUid: null, chatId: null,
  offContacts: null, offMsgs: null, watch: {}, unread: {}, last: {}, initUid: null,
  install: null, presenceCancel: null, newPhoto: null, barHidden: false, replyTo: null };
const views = { auth: $('authView'), verify: $('verifyView'), chat: $('chatView') };
const norm = v => String(v ?? '').trim().toLowerCase();
const clean = (v, m = 4000) => String(v ?? '').trim().slice(0, m);
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm(v));
const isStrong = v => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/.test(v);
const isMobile = () => matchMedia('(max-width: 768px)').matches;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const chatIdFor = (a, b) => [a, b].sort().join('__');
const formatTime = ts => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(Number(ts) || Date.now()));
const preview = t => String(t || '').startsWith('[img]') ? '📷 Foto' : clean(t, 60);
const GH_IMG = /^https:\/\/raw\.githubusercontent\.com\//;

async function sha256Hex(v) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2, '0')).join('');
}
async function waitFor(p, ms = 15000) {
  let t;
  const to = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('Waktu koneksi habis. Coba lagi.')), ms); });
  try { return await Promise.race([p, to]); } finally { clearTimeout(t); }
}

/* ================= TEMA ================= */
const THEME = 'arinex_theme';
const getTheme = () => ls.get(THEME) === 'dark' ? 'dark' : 'light';
function applyTheme(t) {
  t = t === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  ls.set(THEME, t);
  const m = $('menuTheme');
  if (m) m.innerHTML = `${t === 'dark' ? '☀' : '☾'} <span>${t === 'dark' ? 'Mode terang' : 'Mode gelap'}</span>`;
}
applyTheme(getTheme());
addEventListener('storage', e => { if (e.key === THEME) applyTheme(e.newValue); });

/* ================= UI DASAR ================= */
let toastTimer;
function toast(msg) {
  const t = $('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}
function notice(e, msg, type = 'info') {
  if (!e) return;
  e.textContent = msg; e.classList.remove('hidden', 'error');
  if (type === 'error') e.classList.add('error');
}
const clearNotice = e => e?.classList.add('hidden');
function setView(n) {
  Object.values(views).forEach(v => v?.classList.add('hidden'));
  views[n]?.classList.remove('hidden');
}
function fbMsg(e) {
  const map = {
    'auth/invalid-credential': 'Email atau password salah.', 'auth/invalid-email': 'Format email tidak valid.',
    'auth/email-already-in-use': 'Email sudah terdaftar.', 'auth/weak-password': 'Password terlalu lemah.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa saat.',
    'auth/network-request-failed': 'Jaringan bermasalah.', 'auth/user-not-found': 'Akun tidak ditemukan.',
    'auth/wrong-password': 'Email atau password salah.', 'auth/user-disabled': 'Akun ini telah dinonaktifkan.',
    'auth/expired-action-code': 'Tautan sudah kedaluwarsa.', 'auth/invalid-action-code': 'Tautan tidak valid atau sudah digunakan.'
  };
  return map[e?.code] || e?.message || 'Terjadi kesalahan jaringan/sistem.';
}
function lightbox(src) {
  const d = el('div', 'lightbox'), i = new Image();
  i.src = src; d.append(i); d.onclick = () => d.remove(); document.body.append(d);
}
function beep() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination); o.frequency.value = 880;
    g.gain.setValueAtTime(.08, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .25);
    o.start(); o.stop(a.currentTime + .25);
  } catch {}
}
/* Suara notifikasi: audio/notifikasi.mp3, dengan nada bip sebagai cadangan
   kalau berkasnya tidak ada atau browser memblokir pemutaran otomatis. */
const notifSound = new Audio('audio/notifikasi.mp3');
notifSound.preload = 'auto'; notifSound.volume = 0.9;
function unlockAudio() { notifSound.play().then(() => { notifSound.pause(); notifSound.currentTime = 0; }).catch(() => {}); }
['pointerdown', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, unlockAudio, { once: true, passive: true }));
function playNotifSound() {
  try { notifSound.currentTime = 0; notifSound.play().catch(() => beep()); }
  catch { beep(); }
}
function fitViewport() {
  document.documentElement.style.setProperty('--app-h', (window.visualViewport?.height || innerHeight) + 'px');
}
fitViewport();
visualViewport?.addEventListener('resize', fitViewport);
addEventListener('resize', fitViewport);

/* ================= PROFIL ================= */
async function refreshUser(mustVerify = false) {
  if (!auth.currentUser) throw new Error('Sesi tidak ditemukan.');
  await reload(auth.currentUser);
  await auth.currentUser.getIdToken(true);
  S.user = auth.currentUser;
  if (mustVerify && !S.user.emailVerified) throw new Error('Email belum terverifikasi.');
  return S.user;
}
function renderMe() {
  const u = S.user;
  const name = clean(S.profile?.displayName, 40) || clean(u?.displayName, 40) || norm(u?.email).split('@')[0] || 'Pengguna';
  ['myName', 'menuName'].forEach(i => { if ($(i)) $(i).textContent = name; });
  ['myEmail', 'menuEmail'].forEach(i => { if ($(i)) $(i).textContent = u?.email || ''; });
  if (u?.photoURL && GH_IMG.test(u.photoURL)) ['myAvatar', 'menuAvatar'].forEach(i => { if ($(i)) $(i).src = u.photoURL; });
  return name;
}
async function ensureProfile(user) {
  await refreshUser(true);
  const email = norm(user.email), hash = await sha256Hex(email), uid = user.uid;
  const [us, ps, is] = await Promise.all([
    get(ref(db, `users/${uid}`)), get(ref(db, `publicProfiles/${uid}`)), get(ref(db, `emailIndex/${hash}`))
  ].map(p => waitFor(p)));
  const old = us.exists() ? us.val() : {};
  const name = clean(user.displayName, 40) || clean(old.displayName, 40) || email.split('@')[0] || 'Pengguna';
  const now = Date.now(), u = {};
  if (!us.exists()) u[`users/${uid}`] = { displayName: name, createdAt: now, updatedAt: now };
  else { if (old.displayName !== name) u[`users/${uid}/displayName`] = name; u[`users/${uid}/updatedAt`] = now; }
  if (!ps.exists()) u[`publicProfiles/${uid}`] = { displayName: name, updatedAt: now };
  else if (ps.val()?.displayName !== name) { u[`publicProfiles/${uid}/displayName`] = name; u[`publicProfiles/${uid}/updatedAt`] = now; }
  if (!is.exists()) u[`emailIndex/${hash}`] = uid;
  if (Object.keys(u).length) await waitFor(update(ref(db), u));
  S.profile = { ...old, displayName: name, updatedAt: now, createdAt: old.createdAt || now };
  renderMe();
}
const loading = new Set();
const avatarOf = uid => { const p = S.peers[uid]?.photoURL; return p && GH_IMG.test(p) ? p : 'img/puki.png'; };
function preloadPeers() {
  for (const uid of Object.keys(S.contacts)) {
    if (S.peers[uid] || loading.has(uid)) continue;
    loading.add(uid);
    get(ref(db, `publicProfiles/${uid}`)).then(s => { S.peers[uid] = s.exists() ? s.val() : {}; })
      .catch(() => { S.peers[uid] = {}; })
      .finally(() => { loading.delete(uid); renderContacts(); });
  }
}

/* ================= INFO PERANGKAT =================
   Dicatat otomatis saat pengguna berhasil masuk: merek & model perangkat
   (lewat User-Agent Client Hints kalau didukung browser, dengan fallback
   mem-parsing User-Agent biasa), serta jenis jaringan saat itu (wifi/selular
   4g dsb, lewat Network Information API — tidak didukung semua browser,
   terutama Safari/iOS, sehingga nilainya bisa "Tidak diketahui"). */
function parseUA(ua) {
  ua = ua || navigator.userAgent || '';
  const brandModel = (() => {
    let m;
    if ((m = ua.match(/;\s*([A-Za-z0-9_\-]+(?:\s[A-Za-z0-9_\-]+)*)\s+Build\//))) return m[1].trim(); // Android: "Pixel 7 Build/..."
    if (/iPhone/.test(ua)) return 'Apple iPhone';
    if (/iPad/.test(ua)) return 'Apple iPad';
    if (/Macintosh/.test(ua)) return 'Apple Mac';
    if (/Windows/.test(ua)) return 'Windows PC';
    return null;
  })();
  return brandModel || 'Tidak diketahui';
}
async function getDeviceInfo() {
  let brandModel = null;
  const uad = navigator.userAgentData;
  if (uad?.getHighEntropyValues) {
    try {
      const hv = await uad.getHighEntropyValues(['model', 'platformVersion', 'platform']);
      const brand = uad.brands?.find(b => !/Not.A.Brand/i.test(b.brand))?.brand;
      brandModel = [brand, hv.model].filter(Boolean).join(' ') || hv.platform || null;
    } catch {}
  }
  if (!brandModel) brandModel = parseUA(navigator.userAgent);
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const network = conn ? (conn.effectiveType || conn.type || 'Tidak diketahui') : 'Tidak diketahui';
  return { brandModel, network, platform: navigator.platform || uad?.platform || 'Tidak diketahui', ua: (navigator.userAgent || '').slice(0, 200) };
}
/* Tampilkan di panel Pengaturan */
async function renderDeviceInfo() {
  const box = $('deviceInfo'); if (!box) return;
  box.textContent = 'Mendeteksi perangkat…';
  const info = await getDeviceInfo();
  box.innerHTML = `<b>Perangkat:</b> ${info.brandModel}<br><b>Platform:</b> ${info.platform}<br><b>Jaringan:</b> ${info.network}`;
}
/* Simpan ringkas ke Firebase setiap kali berhasil masuk, supaya ada riwayat perangkat per akun
   (muncul di database sebagai devices/{uid}, ditimpa tiap sesi — bukan daftar riwayat semua sesi). */
async function logDeviceInfo() {
  if (!S.user) return;
  try {
    const info = await getDeviceInfo();
    await set(ref(db, `devices/${S.user.uid}`), { ...info, lastLoginAt: serverTimestamp() });
  } catch {} // tidak kritis: kalau gagal, jangan ganggu alur login
}

/* ================= GITHUB (opsional, untuk kirim gambar) =================
   Owner/repo/branch/folder diatur di satu tempat: js/gh-config.js.
   Yang masih diminta ke setiap pengguna hanyalah token pribadi mereka
   sendiri (dibuat lewat tombol "Request Token" di Pengaturan). */
const GH_FIXED = GH_FIXED_PUBLIC;
const GH_KEY = 'arinex_gh_token';
function ghCfg() {
  const token = ls.get(GH_KEY);
  if (!token) return null;
  return { ...GH_FIXED, token };
}
async function compress(file, max = 1280, q = .82) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', q));
}
const toB64 = blob => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result.split(',')[1]); f.onerror = rej; f.readAsDataURL(blob); });
async function uploadToGithub(file, sub, max = 1280) {
  const g = ghCfg(); if (!g) throw new Error('GitHub belum diatur.');
  let blob; try { blob = await compress(file, max); } catch { throw new Error('File bukan gambar yang didukung.'); }
  const path = `${g.folder || 'arinex-chat'}/${sub}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const r = await waitFor(fetch(`https://api.github.com/repos/${g.owner}/${g.repo}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${g.token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'upload', content: await toB64(blob), branch: g.branch || 'main' })
  }), 45000);
  if (!r.ok) throw new Error(r.status === 401 ? 'Token GitHub tidak valid.' : r.status === 403 || r.status === 404 ? 'Repo tidak ditemukan / token tidak punya izin.' : `Upload gagal (${r.status}).`);
  return `https://raw.githubusercontent.com/${g.owner}/${g.repo}/${g.branch || 'main'}/${path}`;
}

/* ================= KONTAK ================= */
function renderContacts() {
  const term = norm($('contactSearch')?.value), list = $('contactList'); if (!list) return;
  list.innerHTML = '';
  const arr = Object.entries(S.contacts)
    .map(([uid, v]) => ({ uid, ...v, displayName: S.peers[uid]?.displayName || v.displayName }))
    .filter(c => !term || norm(c.email).includes(term) || String(c.displayName || '').toLowerCase().includes(term))
    .sort((a, b) => (S.last[b.uid]?.ts || 0) - (S.last[a.uid]?.ts || 0));
  $('emptyContacts')?.classList.toggle('hidden', arr.length > 0);
  for (const c of arr) {
    const b = el('button', 'contact-item' + (c.uid === S.activeUid ? ' active' : '')); b.type = 'button';
    const img = new Image(); img.src = avatarOf(c.uid); img.alt = '';
    const copy = el('div', 'contact-copy'), st = el('strong'), sp = el('span');
    st.textContent = c.displayName || 'Pengguna';
    sp.textContent = S.last[c.uid]?.text || c.email || 'Kontak';
    copy.append(st, sp); b.append(img, copy);
    if (S.unread[c.uid]) { const bd = el('span', 'badge'); bd.textContent = S.unread[c.uid]; b.append(bd); }
    b.onclick = () => openConversation(c.uid);
    list.append(b);
  }
  preloadPeers();
}
function updateBadge() {
  const n = Object.values(S.unread).reduce((a, b) => a + b, 0);
  document.title = (n ? `(${n}) ` : '') + 'SECRET MESSAGE';
  try { n ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.(); } catch {}
}
function listenContacts() {
  S.offContacts?.();
  S.offContacts = onValue(ref(db, `contacts/${S.user.uid}`), s => {
    S.contacts = s.exists() ? s.val() : {};
    renderContacts(); watchChats();
  }, () => toast('Kontak tidak dapat dimuat.'));
}
async function ensureChat(peerUid) {
  const id = chatIdFor(S.user.uid, peerUid), r = ref(db, `chats/${id}`);
  if ((await get(r)).exists()) return id;
  await set(r, { type: 'direct', createdAt: Date.now(), participants: { [S.user.uid]: true, [peerUid]: true } });
  return id;
}
async function addContactByEmail(value) {
  goOnline(db); await refreshUser(true);
  const email = norm(value);
  if (!isEmail(email)) throw new Error('Masukkan email yang valid.');
  if (email === norm(S.user.email)) throw new Error('Tidak dapat menambahkan diri sendiri.');
  const idx = await waitFor(get(ref(db, `emailIndex/${await sha256Hex(email)}`)));
  if (!idx.exists()) throw new Error('Kontak tidak ditemukan. Pastikan akun tersebut sudah terdaftar.');
  const uid = String(idx.val());
  if (!uid || uid === S.user.uid) throw new Error('Kontak tidak valid.');
  const ps = await waitFor(get(ref(db, `publicProfiles/${uid}`)));
  if (!ps.exists()) throw new Error('Profil belum siap. Minta pengguna tersebut login kembali.');
  const data = { displayName: clean(ps.val()?.displayName, 40) || 'Pengguna', email, addedAt: Date.now() };
  await waitFor(set(ref(db, `contacts/${S.user.uid}/${uid}`), data));
  await ensureChat(uid);
  return { uid, ...data };
}

/* ================= NOTIFIKASI ================= */
function notifState() { return 'Notification' in window ? Notification.permission : 'unsupported'; }
async function askNotif() {
  if (notifState() === 'unsupported') return toast('Browser ini tidak mendukung notifikasi.');
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? 'Notifikasi aktif.' : 'Notifikasi tidak diizinkan.');
  updateNotifBtn(); updateNotifBanner();
}
function updateNotifBtn() {
  const b = $('stNotif'); if (!b) return;
  const s = notifState();
  b.textContent = s === 'granted' ? '✅️ Notifikasi aktif' : s === 'denied' ? '🔕 Diblokir (ubah di pengaturan browser)' : '🔔 Aktifkan notifikasi';
  b.disabled = s === 'granted' || s === 'denied' || s === 'unsupported';
}
async function notify(title, body, uid) {
  playNotifSound(); try { navigator.vibrate?.(120); } catch {}
  if (notifState() !== 'granted') return;
  const opt = { body, icon: 'img/icon-192.png', badge: 'img/badge-192.png', tag: 'chat-' + uid, renotify: true, requireInteraction: false, data: { uid } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    reg ? reg.showNotification(title, opt) : new Notification(title, opt);
  } catch {}
}
/* Browser TIDAK mengizinkan notifikasi dipaksa aktif tanpa persetujuan pengguna
   (ini aturan keamanan di semua browser, bukan batasan aplikasi ini). Yang bisa
   dilakukan: minta izin otomatis sekali di awal, dan terus mengingatkan lewat
   banner selama pengguna belum memilih "Izinkan" atau "Blokir". */
let notifBannerShown = false;
function maybeAutoAskNotif() {
  if (notifState() !== 'default') return;
  askNotif();
}
function updateNotifBanner() {
  const bar = $('notifBar'); if (!bar) return;
  const show = notifState() === 'default';
  bar.classList.toggle('hidden', !show);
}
function watchChats() {
  for (const uid of Object.keys(S.contacts)) {
    if (S.watch[uid]) continue;
    const t0 = Date.now(), id = chatIdFor(S.user.uid, uid);
    S.watch[uid] = onChildAdded(query(ref(db, `chats/${id}/messages`), limitToLast(1)), s => {
      const m = s.val(); if (!m) return;
      const ts = Number(m.createdAt) || Date.now(), mine = m.senderId === S.user.uid;
      S.last[uid] = { text: (mine ? 'Anda: ' : '') + preview(m.text), ts };
      if (!mine && ts > t0 && !(S.activeUid === uid && !document.hidden)) {
        S.unread[uid] = (S.unread[uid] || 0) + 1;
        notify(S.peers[uid]?.displayName || S.contacts[uid]?.displayName || 'Pesan baru', preview(m.text), uid);
      }
      renderContacts(); updateBadge();
    }, () => {});
  }
}

/* ================= PERCAKAPAN ================= */
async function openConversation(uid) {
  const c = S.contacts[uid]; if (!c) return;
  S.activeUid = uid; S.chatId = chatIdFor(S.user.uid, uid); S.unread[uid] = 0; updateBadge();
  const p = S.peers[uid] || {};
  $('peerName').textContent = p.displayName || c.displayName || 'Pengguna';
  $('peerStatus').textContent = c.email || '';
  $('peerAvatar').src = avatarOf(uid);
  $('welcomeConversation').classList.add('hidden');
  $('activeConversation').classList.remove('hidden');
  views.chat.classList.add('mobile-open');
  if (isMobile() && !history.state?.chat) history.pushState({ chat: 1 }, '');
  renderContacts(); listenMessages();
}
const RECALL_LIMIT_MS = 60 * 60 * 1000; // batas waktu "tarik pesan": 1 jam sejak terkirim
let msgCache = {}; // id -> data pesan di percakapan aktif, dipakai untuk balas/tarik/scroll
function listenMessages() {
  S.offMsgs?.(); const chatId = S.chatId;
  S.offMsgs = onValue(query(ref(db, `chats/${chatId}/messages`), limitToLast(200)), s => {
    if (chatId !== S.chatId) return;
    const list = $('messageList');
    const stick = !list.children.length || list.scrollHeight - list.scrollTop - list.clientHeight < 140;
    list.innerHTML = '';
    const arr = Object.entries(s.val() || {}).map(([id, m]) => ({ id, ...m })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    msgCache = {}; arr.forEach(m => { msgCache[m.id] = m; });
    const fmtDay = ts => { const d = new Date(Number(ts) || Date.now()); return d.toDateString() === new Date().toDateString() ? 'Hari ini' : new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(d); };
    let day = '';
    for (const m of arr) {
      const d = new Date(Number(m.createdAt) || Date.now()).toDateString();
      if (d !== day) { day = d; const sep = el('div', 'day-sep'); sep.textContent = fmtDay(m.createdAt); list.append(sep); }
      const mine = m.senderId === S.user.uid;
      const row = el('div', 'message-row' + (mine ? ' mine' : '')); row.dataset.id = m.id;
      const bub = el('div', 'message-bubble' + (m.deleted ? ' recalled' : ''));

      if (m.replyTo && !m.deleted) {
        const q = el('div', 'quote-block');
        q.innerHTML = `<strong>${m.replyTo.senderId === S.user.uid ? 'Anda' : (S.peers[m.replyTo.senderId]?.displayName || 'Pengguna')}</strong><span></span>`;
        q.querySelector('span').textContent = m.replyTo.text || '';
        q.onclick = () => { const t = list.querySelector(`[data-id="${m.replyTo.id}"]`); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1200); } };
        bub.append(q);
      }

      if (m.deleted) {
        const x = el('div', 'message-text recalled-text'); x.textContent = '🚫 Pesan ini telah ditarik'; bub.append(x);
      } else {
        const t = String(m.text || '');
        if (t.startsWith('[img]') && GH_IMG.test(t.slice(5))) {
          const im = el('img', 'msg-img'); im.loading = 'lazy'; im.alt = 'Foto'; im.src = t.slice(5);
          im.onclick = () => lightbox(im.src);
          im.onload = () => { if (stick) list.scrollTop = list.scrollHeight; };
          bub.append(im);
        } else { const x = el('div', 'message-text'); x.textContent = t; bub.append(x); }
      }

      const meta = el('div', 'message-meta'); meta.textContent = formatTime(m.createdAt);
      bub.append(meta); row.append(bub); list.append(row);
      attachLongPress(row, m, mine);
    }
    if (stick || arr.at(-1)?.senderId === S.user.uid) requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
    if (!document.hidden && S.unread[S.activeUid]) { S.unread[S.activeUid] = 0; renderContacts(); updateBadge(); }
  }, () => toast('Pesan tidak dapat dimuat.'));
}

/* ===== Tekan-lama pada pesan: menu Balas / Salin / Tarik ===== */
function attachLongPress(row, m, mine) {
  let timer, moved = false, sx = 0, sy = 0;
  const start = e => {
    moved = false; const p = e.touches ? e.touches[0] : e;
    sx = p.clientX; sy = p.clientY;
    timer = setTimeout(() => { if (!moved) openMsgMenu(m, mine); }, 420);
  };
  const move = e => {
    const p = e.touches ? e.touches[0] : e;
    if (Math.abs(p.clientX - sx) > 10 || Math.abs(p.clientY - sy) > 10) { moved = true; clearTimeout(timer); }
  };
  const end = () => clearTimeout(timer);
  row.addEventListener('touchstart', start, { passive: true });
  row.addEventListener('touchmove', move, { passive: true });
  row.addEventListener('touchend', end);
  row.addEventListener('mousedown', start);
  row.addEventListener('mousemove', move);
  row.addEventListener('mouseup', end);
  row.addEventListener('mouseleave', end);
  row.addEventListener('contextmenu', e => { e.preventDefault(); openMsgMenu(m, mine); });
}
function openMsgMenu(m, mine) {
  const sheet = $('msgMenu'); if (!sheet) return;
  const canRecall = mine && !m.deleted && (Date.now() - (Number(m.createdAt) || 0)) < RECALL_LIMIT_MS;
  const canCopy = !m.deleted && !String(m.text || '').startsWith('[img]');
  sheet.innerHTML = '';
  const addBtn = (label, fn) => { const b = el('button'); b.type = 'button'; b.textContent = label; b.onclick = () => { sheet.classList.add('hidden'); fn(); }; sheet.append(b); };
  if (!m.deleted) addBtn('↩ Balas', () => setReply(m));
  if (canCopy) addBtn('📋 Salin teks', () => { navigator.clipboard?.writeText(String(m.text || '')).then(() => toast('Teks disalin.')).catch(() => {}); });
  if (canRecall) addBtn('🗑 Tarik pesan', () => recallMessage(m.id));
  else if (mine && !m.deleted) addBtn('Pesan Tidak dapat di tarik', () => toast('Pesan hanya bisa ditarik dalam 1 jam setelah terkirim.'));
  addBtn('✖ Batal', () => {});
  sheet.classList.remove('hidden');
}
function setReply(m) {
  S.replyTo = { id: m.id, text: m.deleted ? '' : preview(m.text), senderId: m.senderId };
  const bar = $('replyBar'); if (!bar) return;
  bar.querySelector('.rb-name').textContent = m.senderId === S.user.uid ? 'Anda' : (S.peers[m.senderId]?.displayName || 'Pengguna');
  bar.querySelector('.rb-text').textContent = S.replyTo.text || '';
  bar.classList.remove('hidden');
  $('messageInput')?.focus();
}
function clearReply() { S.replyTo = null; $('replyBar')?.classList.add('hidden'); }
async function recallMessage(id) {
  try { await waitFor(update(ref(db, `chats/${S.chatId}/messages/${id}`), { deleted: true, text: '', replyTo: null, deletedAt: serverTimestamp() })); }
  catch (e) { toast('Gagal menarik pesan.'); }
}

async function pushMsg(text) {
  const payload = { senderId: S.user.uid, text, createdAt: serverTimestamp() };
  if (S.replyTo) payload.replyTo = S.replyTo;
  await waitFor(set(push(ref(db, `chats/${S.chatId}/messages`)), payload));
  clearReply();
}
async function sendMessage() {
  const i = $('messageInput'), text = clean(i.value);
  if (!text || !S.chatId || !S.user) return;
  i.value = '';
  try { await pushMsg(text); } catch (e) { i.value = text; console.error(e); toast('Pesan gagal dikirim.'); }
  i.focus();
}
async function sendImage(file) {
  if (!file || !S.chatId) return;
  if (!ghCfg()) { toast('Atur GitHub di Pengaturan untuk mengirim gambar.'); openSettings(); return; }
  toast('Mengunggah gambar…');
  try { await pushMsg('[img]' + await uploadToGithub(file, 'chat')); toast('Gambar terkirim.'); }
  catch (e) { toast(e.message || 'Gagal mengirim gambar.'); }
}
function clearActive() {
  S.offMsgs?.(); S.offMsgs = null; S.activeUid = null; S.chatId = null; clearReply(); msgCache = {};
  views.chat?.classList.remove('mobile-open');
  $('activeConversation')?.classList.add('hidden');
  $('welcomeConversation')?.classList.remove('hidden');
  $('emojiPanel')?.classList.add('hidden');
  if ($('messageList')) $('messageList').innerHTML = '';
  renderContacts();
}

/* ================= PRESENCE & SESI ================= */
function setPresence(on) {
  if (!S.user?.emailVerified) return;
  const r = ref(db, `presence/${S.user.uid}`);
  set(r, { online: on, lastSeen: serverTimestamp() }).catch(() => {});
  if (on) {
    S.presenceCancel?.();
    const d = onDisconnect(r);
    S.presenceCancel = () => d.cancel().catch(() => {});
    d.set({ online: false, lastSeen: serverTimestamp() }).catch(() => {});
  }
}
function cleanup() {
  S.offContacts?.(); S.offMsgs?.();
  Object.values(S.watch).forEach(f => f?.());
  S.presenceCancel?.();
  Object.assign(S, { offContacts: null, offMsgs: null, watch: {}, presenceCancel: null, initUid: null, unread: {}, last: {}, peers: {} });
  updateBadge();
}
async function initChat(user) {
  if (!user.emailVerified) throw new Error('Email belum terverifikasi.');
  if (S.initUid === user.uid) return;
  S.initUid = user.uid;
  try {
    await waitFor(ensureProfile(user), 20000); setView('chat'); listenContacts(); setPresence(true); updateInstallUI();
    updateNotifBtn(); updateNotifBanner(); maybeAutoAskNotif(); logDeviceInfo();
  } catch (e) { S.initUid = null; throw e; }
}
async function logout() {
  closeMenu(); setPresence(false); cleanup();
  try { await signOut(auth); } catch { toast('Gagal keluar. Coba lagi.'); }
}
function actionCodeSettings() { return { url: location.origin + location.pathname, handleCodeInApp: false }; }
let cooldown = 0;
async function sendVerification() {
  if (!S.user) return;
  const remain = cooldown - Date.now();
  if (remain > 0) return notice($('verifyNotice'), `Tunggu ${Math.ceil(remain / 1000)} detik.`, 'error');
  try {
    await sendEmailVerification(S.user, actionCodeSettings());
    cooldown = Date.now() + 60000;
    notice($('verifyNotice'), 'Email verifikasi dikirim. Periksa Inbox/Spam.');
  } catch (e) { notice($('verifyNotice'), fbMsg(e), 'error'); }
}
function switchAuth(p) {
  ['login', 'register', 'reset'].forEach(n => $(n + 'Panel')?.classList.toggle('hidden', p !== n));
  clearNotice($('authNotice'));
}

/* ================= FORM AUTH ================= */
let authBusy = false;
async function guarded(e, label, fn) {
  e.preventDefault(); if (authBusy) return;
  // e.submitter bisa kosong kalau form di-submit lewat Enter di beberapa browser lama,
  // atau kalau ada tombol lain di form yang ikut ter-submit tanpa disadari. Dulu baris ini
  // langsung error (btn undefined) SEBELUM authBusy sempat di-set, jadi tidak masalah untuk
  // kasus itu — tapi kalau errornya terjadi setelah authBusy=true, submit berikutnya akan
  // selalu diabaikan (if authBusy return) sampai halaman di-reload. Dibuat lebih aman di sini.
  const btn = e.submitter || e.target.querySelector('button[type="submit"]') || e.target.querySelector('button');
  const old = btn?.textContent;
  authBusy = true; if (btn) { btn.disabled = true; btn.textContent = label; }
  try { await fn(); }
  catch (err) { notice($('authNotice'), fbMsg(err), 'error'); }
  finally { authBusy = false; if (btn) { btn.disabled = false; btn.textContent = old; } }
}
$('loginForm')?.addEventListener('submit', e => guarded(e, 'Memeriksa…', async () => {
  const email = norm($('loginEmail').value), pass = $('loginPassword').value;
  if (!isEmail(email) || !pass) throw new Error('Email dan password tidak valid.');
  await waitFor(signInWithEmailAndPassword(auth, email, pass));
  $('loginForm').reset(); // sisanya ditangani onAuthStateChanged
}));
$('registerForm')?.addEventListener('submit', e => guarded(e, 'Membuat…', async () => {
  const name = clean($('registerName').value, 40), email = norm($('registerEmail').value);
  const pw = $('registerPassword').value, pw2 = $('registerPassword2').value;
  if (!name || !isEmail(email)) throw new Error('Nama dan email wajib diisi.');
  if (!isStrong(pw)) throw new Error('Password terlalu lemah.');
  if (pw !== pw2) throw new Error('Konfirmasi password tidak sama.');
  const cred = await createUserWithEmailAndPassword(auth, email, pw);
  await updateProfile(cred.user, { displayName: name });
  S.user = cred.user;
  await sendEmailVerification(cred.user, actionCodeSettings());
  $('registerForm').reset(); $('verifyAddress').textContent = email; setView('verify');
  notice($('verifyNotice'), 'Akun dibuat. Silakan verifikasi email Anda.');
}));
$('resetForm')?.addEventListener('submit', e => guarded(e, 'Mengirim…', async () => {
  const email = norm($('resetEmail').value);
  if (!isEmail(email)) throw new Error('Email tidak valid.');
  await sendPasswordResetEmail(auth, email, actionCodeSettings());
  notice($('authNotice'), 'Tautan reset dikirim.'); $('resetForm').reset();
}));
$('showRegister')?.addEventListener('click', () => switchAuth('register'));
$('showLogin')?.addEventListener('click', () => switchAuth('login'));
$('showReset')?.addEventListener('click', () => switchAuth('reset'));
$('backToLogin')?.addEventListener('click', () => switchAuth('login'));
$('resendVerification')?.addEventListener('click', sendVerification);
$('verifyLogout')?.addEventListener('click', logout);
$('checkVerification')?.addEventListener('click', async () => {
  try {
    await refreshUser(false);
    if (!S.user.emailVerified) return notice($('verifyNotice'), 'Belum terverifikasi. Cek email Anda.', 'error');
    await initChat(S.user);
  } catch (e) { notice($('verifyNotice'), fbMsg(e), 'error'); }
});
document.querySelectorAll('.eye').forEach(b => {
  b.type = 'button'; // jaga-jaga kalau markup HTML lupa set type="button": tanpa ini, tombol di dalam <form>
                      // ikut men-submit form saat ditekan dan proses login jadi "macet" / perlu reload.
  b.addEventListener('click', e => {
    e.preventDefault();
    const i = $(b.dataset.target); if (i) i.type = i.type === 'password' ? 'text' : 'password';
  });
});

onAuthStateChanged(auth, async user => {
  await persistenceReady.catch(() => {});
  S.user = user;
  if (!user) { cleanup(); S.profile = null; S.contacts = {}; clearActive(); setView('auth'); switchAuth('login'); return; }
  try {
    await refreshUser(false);
    if (!S.user.emailVerified) { $('verifyAddress').textContent = S.user.email || ''; setView('verify'); return; }
    await initChat(S.user);
  } catch (e) { cleanup(); setView('auth'); switchAuth('login'); notice($('authNotice'), fbMsg(e), 'error'); }
});

/* ================= MENU AKUN ================= */
function closeMenu() { const m = $('accountMenu'); m?.classList.add('hidden'); m?.setAttribute('aria-hidden', 'true'); }
$('accountButton')?.addEventListener('click', e => {
  e.stopPropagation();
  const m = $('accountMenu'), h = m.classList.toggle('hidden');
  m.setAttribute('aria-hidden', String(h)); renderMe(); applyTheme(getTheme());
});
$('accountMenu')?.addEventListener('click', e => e.stopPropagation());
document.addEventListener('click', closeMenu);
document.addEventListener('click', e => { const mm = $('msgMenu'); if (mm && !mm.classList.contains('hidden') && !mm.contains(e.target)) mm.classList.add('hidden'); });
$('menuTheme')?.addEventListener('click', () => { const n = getTheme() === 'dark' ? 'light' : 'dark'; applyTheme(n); toast(n === 'dark' ? 'Mode gelap aktif.' : 'Mode terang aktif.'); closeMenu(); });
$('menuLogout')?.addEventListener('click', logout);

/* ================= CHAT BARU ================= */
$('newChatButton')?.addEventListener('click', () => {
  $('modalBackdrop')?.classList.remove('hidden');
  $('contactEmail').value = ''; clearNotice($('contactModalNotice'));
  setTimeout(() => $('contactEmail')?.focus(), 30);
});
$('closeContactModal')?.addEventListener('click', () => $('modalBackdrop')?.classList.add('hidden'));
$('modalBackdrop')?.addEventListener('click', e => { if (e.target === $('modalBackdrop')) $('modalBackdrop').classList.add('hidden'); });
$('contactForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const b = e.submitter, old = b.textContent; b.disabled = true; b.textContent = 'Mencari…';
  try {
    const r = await addContactByEmail($('contactEmail').value);
    S.contacts[r.uid] = { displayName: r.displayName, email: r.email, addedAt: r.addedAt };
    $('modalBackdrop').classList.add('hidden'); toast(`${r.displayName} ditambahkan.`);
    await openConversation(r.uid);
  } catch (err) { notice($('contactModalNotice'), err?.message || fbMsg(err), 'error'); }
  finally { b.disabled = false; b.textContent = old; }
});
$('contactSearch')?.addEventListener('input', renderContacts);
$('messageForm')?.addEventListener('submit', e => { e.preventDefault(); sendMessage(); });
$('chatMenuButton')?.addEventListener('click', () => toast('Info chat belum tersedia'));
$('backToContacts')?.addEventListener('click', () => history.state?.chat ? history.back() : clearActive());
addEventListener('popstate', () => { if (S.activeUid) clearActive(); });

/* ================= UI TAMBAHAN (disuntik lewat JS, index.html tidak perlu diubah banyak) ================= */
function mkModal(id, title, html) {
  const b = el('div', 'modal-backdrop hidden'); b.id = id;
  b.innerHTML = `<section class="modal-card" role="dialog" aria-modal="true"><header class="modal-head"><h2>${title}</h2><button class="action-icon" type="button" data-close aria-label="Tutup">×</button></header>${html}</section>`;
  b.addEventListener('click', e => { if (e.target === b || e.target.hasAttribute('data-close')) b.classList.add('hidden'); });
  ($('app') || document.body).append(b); return b;
}
const openSettings = () => { fillSettings(); updateNotifBtn(); renderDeviceInfo(); $('settingsModal').classList.remove('hidden'); };
function fillSettings() {
  $('ghToken').value = ls.get(GH_KEY) || '';
  $('ghRepoInfo').textContent = `${GH_FIXED.owner}/${GH_FIXED.repo} (${GH_FIXED.branch})`;
}
function openProfile() {
  S.newPhoto = null;
  $('pfName').value = renderMe(); $('pfEmail').textContent = S.user?.email || '';
  $('pfAvatar').src = (S.user?.photoURL && GH_IMG.test(S.user.photoURL)) ? S.user.photoURL : 'img/logo_user.png';
  $('profileModal').classList.remove('hidden');
}
async function doInstall() {
  if (S.install) { S.install.prompt(); await S.install.userChoice.catch(() => {}); S.install = null; updateInstallUI(); return; }
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) toast('Safari: tombol Bagikan → Tambahkan ke Layar Utama.');
  else toast('Buka menu browser ⋮ lalu pilih "Instal aplikasi" / "Tambahkan ke layar utama".');
}
function updateInstallUI() {
  const need = !isStandalone();
  $('menuInstall')?.classList.toggle('hidden', !need);
  $('installBar')?.classList.toggle('hidden', !need || S.barHidden);
}
function buildUI() {
  /* menu */
  const menu = $('accountMenu'), first = $('menuTheme');
  const mk = (id, html, fn) => { const b = el('button'); b.type = 'button'; b.id = id; b.innerHTML = html; b.onclick = () => { closeMenu(); fn(); }; menu.insertBefore(b, first); };
  mk('menuProfile', '👤 <span>Profil</span>', openProfile);
  mk('menuSettings', '⚙ <span>General</span>', openSettings);
  mk('menuInstall', '⬇ <span>Install aplikasi</span>', doInstall);

  /* modal pengaturan: owner/repo/branch/folder sudah tetap (lihat GH_FIXED),
     pengguna hanya perlu membuat & mengisi token pribadi mereka sendiri. */
  mkModal('settingsModal', 'General', `
    <p class="st-note">Kirim gambar lewat repositori: <b id="ghRepoInfo">—</b>. Buat token pribadi Anda sendiri lewat tombol di bawah, lalu tempel di sini. Tanpa token, chat teks tetap berjalan normal. Token hanya disimpan di perangkat ini, tidak dikirim ke server mana pun selain GitHub.</p>
    <label class="field-label" for="ghToken">Token GitHub</label><input id="ghToken" type="password" autocomplete="off" maxlength="200" placeholder="github_pat_...">
    <div id="ghNotice" class="notice hidden"></div>
    <div class="stack">
    <button id="ghGetToken" class="secondary full" type="button">🔑 Request Token</button>
    <button id="ghSave" class="primary full" type="button">Simpan & uji koneksi</button>
    <button id="ghClear" class="secondary full" type="button">Hapus token</button>
    <button id="stNotif" class="secondary full" type="button"></button></div>
    <label class="field-label" style="margin-top:14px">Info perangkat ini</label>
    <p id="deviceInfo" class="st-note">Mendeteksi perangkat…</p>`);
  $('ghGetToken').onclick = () => window.open('token.html', '_blank', 'noopener');
  $('ghSave').onclick = async () => {
    const token = clean($('ghToken').value, 200);
    if (!token) return notice($('ghNotice'), 'Isi token terlebih dahulu. Ketuk "Request Token" jika belum punya.', 'error');
    try {
      const r = await waitFor(fetch(`https://api.github.com/repos/${GH_FIXED.owner}/${GH_FIXED.repo}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }));
      if (!r.ok) throw new Error(r.status === 401 ? 'Token tidak valid.' : 'Repo tidak ditemukan / token tanpa akses.');
      const j = await r.json();
      ls.set(GH_KEY, token);
      notice($('ghNotice'), j.private ? 'Tersimpan, tapi repo PRIVAT: lawan bicara tidak bisa melihat gambar. Jadikan publik.' : 'Tersimpan. Pengiriman gambar aktif.', j.private ? 'error' : 'info');
    } catch (e) { notice($('ghNotice'), e.message, 'error'); }
  };
  $('ghClear').onclick = () => { ls.del(GH_KEY); fillSettings(); notice($('ghNotice'), 'Token dihapus.'); };
  $('stNotif').onclick = askNotif;

  /* modal profil */
  mkModal('profileModal', 'Profil', `
    <div class="pf-avatar"><img id="pfAvatar" src="img/logo_user.png" alt="Foto profil"><span>Ketuk foto untuk mengganti</span></div>
    <input id="pfFile" type="file" accept="image/*" class="hidden">
    <label class="field-label" for="pfName">Nama</label><input id="pfName" maxlength="40" autocomplete="off">
    <label class="field-label">Email</label><p id="pfEmail" class="st-note selectable"></p>
    <div id="pfNotice" class="notice hidden"></div>
    <button id="pfSave" class="primary full" type="button">Simpan profil</button>`);
  $('pfAvatar').onclick = () => { if (!ghCfg()) { toast('Foto profil butuh GitHub di Pengaturan.'); return; } $('pfFile').click(); };
  $('pfFile').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    toast('Mengunggah foto…');
    try { S.newPhoto = await uploadToGithub(f, 'avatar', 320); $('pfAvatar').src = S.newPhoto; toast('Foto siap. Tekan Simpan.'); }
    catch (err) { toast(err.message); }
  };
  $('pfSave').onclick = async () => {
    const name = clean($('pfName').value, 40), uid = S.user.uid;
    if (!name) return notice($('pfNotice'), 'Nama tidak boleh kosong.', 'error');
    const b = $('pfSave'); b.disabled = true;
    try {
      const props = { displayName: name }; if (S.newPhoto) props.photoURL = S.newPhoto;
      await updateProfile(auth.currentUser, props);
      const now = Date.now();
      await waitFor(update(ref(db), { [`users/${uid}/displayName`]: name, [`users/${uid}/updatedAt`]: now, [`publicProfiles/${uid}/displayName`]: name, [`publicProfiles/${uid}/updatedAt`]: now }));
      if (S.newPhoto) set(ref(db, `publicProfiles/${uid}/photoURL`), S.newPhoto).catch(() => {});
      S.user = auth.currentUser; S.profile = { ...S.profile, displayName: name };
      renderMe(); $('profileModal').classList.add('hidden'); toast('Profil disimpan.');
    } catch (e) { notice($('pfNotice'), fbMsg(e), 'error'); } finally { b.disabled = false; }
  };

  /* tombol lampiran + emoji */
  if (!$('attachIconStyle')) {
    const iconStyle = el('style'); iconStyle.id = 'attachIconStyle';
    // Warna ikon dipaksa eksplisit per tema (bukan mengandalkan currentColor yang diwarisi),
    // supaya ikonnya tetap kelihatan baik di tema terang maupun gelap.
    iconStyle.textContent = `
      #attachButton svg { stroke: #16181c; }
      [data-theme="dark"] #attachButton svg { stroke: #ffffff; }
    `;
    document.head.append(iconStyle);
  }
  const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.className = 'hidden';
  file.onchange = e => { const f = e.target.files[0]; e.target.value = ''; sendImage(f); };
  document.body.append(file);
  const att = el('button', 'action-icon'); att.type = 'button'; att.id = 'attachButton';
  att.innerHTML = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="M3 16l5-5 4 4 2.5-2.5L21 16.5"/>
  </svg>
`;
  att.setAttribute('aria-label', 'Kirim gambar');
  att.onclick = () => file.click();
  $('emojiButton')?.after(att);
  const ep = el('div', 'emoji-panel hidden'); ep.id = 'emojiPanel';
  Array.from('😀😂😊😍🥰😘😎🤔😢😭😡👍👎🙏👏🔥💖🎉✨🙌💪🤝😴🤗😅🙈🙉🙊🙂‍↕️😄😾😿🙀🚐🚑🚒🚓🚔🚕🚖🚗🏎🏍✈️🛫').forEach(x => {
    const b = el('button'); b.type = 'button'; b.textContent = x;
    b.onclick = () => { const i = $('messageInput'); i.value += x; i.focus(); };
    ep.append(b);
  });
  $('activeConversation')?.append(ep);
  $('emojiButton')?.addEventListener('click', () => ep.classList.toggle('hidden'));
  $('messageInput')?.addEventListener('focus', () => { ep.classList.add('hidden'); setTimeout(() => scrollTo(0, 0), 50); });

  /* banner pasang aplikasi */
  const bar = el('div', 'install-bar hidden'); bar.id = 'installBar';
  bar.innerHTML = '<img src="img/icon-192.png" alt=""><div><strong>Pasang aplikasi</strong><span>Buka lebih cepat dari layar utama.</span></div><button class="primary" type="button" id="installGo">Unduh</button><button class="action-icon" type="button" id="installX" aria-label="Tutup">×</button>';
  document.body.append(bar);
  $('installGo').onclick = doInstall;
  $('installX').onclick = () => { S.barHidden = true; updateInstallUI(); };

  /* banner pengingat notifikasi (selama izin masih "belum dipilih") */
  const nb = el('div', 'install-bar hidden'); nb.id = 'notifBar';
  nb.innerHTML = '<img src="img/icon-192.png" alt=""><div><strong>Aktifkan notifikasi</strong><span>Supaya tahu saat ada pesan masuk.</span></div><button class="primary" type="button" id="notifGo">Aktifkan</button><button class="action-icon" type="button" id="notifX" aria-label="Tutup">×</button>';
  document.body.append(nb);
  $('notifGo').onclick = askNotif;
  $('notifX').onclick = () => nb.classList.add('hidden');

  /* bar balasan di atas composer */
  const rb = el('div', 'reply-bar hidden'); rb.id = 'replyBar';
  rb.innerHTML = '<div class="rb-line"><div class="rb-meta"><strong class="rb-name"></strong><span class="rb-text"></span></div><button class="action-icon" type="button" id="replyCancel" aria-label="Batal balas">×</button></div>';
  $('messageForm')?.before(rb);
  $('replyCancel').onclick = clearReply;

  /* menu aksi pesan (tekan-lama) */
  const mm = el('div', 'msg-menu hidden'); mm.id = 'msgMenu';
  document.body.append(mm);

  updateInstallUI(); applyTheme(getTheme());
}
buildUI();

/* ================= PWA, SERVICE WORKER, VISIBILITY ================= */
addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.install = e; updateInstallUI(); });
addEventListener('appinstalled', () => { S.install = null; updateInstallUI(); toast('Aplikasi terpasang.'); });
matchMedia('(display-mode: standalone)').addEventListener?.('change', updateInstallUI);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', e => { const u = e.data?.openUid; if (u && S.contacts[u]) openConversation(u); });
}
document.addEventListener('visibilitychange', () => {
  const vis = document.visibilityState === 'visible';
  setPresence(vis);
  if (vis && S.activeUid && S.unread[S.activeUid]) { S.unread[S.activeUid] = 0; renderContacts(); updateBadge(); }
});
addEventListener('pagehide', () => setPresence(false));



/* =========================================================
   ARINEX ADD-ON
   HAPUS CHAT + LINK AKTIF
   Tambahkan di PALING BAWAH tanpa mengubah kode utama.
   ========================================================= */
(() => {
  'use strict';

  const STORE_KEY = 'arinex_deleted_chats_v1';
  const STYLE_ID = 'arinex-chat-tools-style';

  /* =========================================================
     STYLE TAMBAHAN
     ========================================================= */
  if (!$(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent = `
      /* ---------- Tombol hapus chat ---------- */
      .arinex-chat-delete-btn {
        width: 38px;
        height: 38px;
        border: none;
        padding: 0;

        display: inline-flex;
        align-items: center;
        justify-content: center;

        cursor: pointer;
        background: transparent;
        color: inherit;

        clip-path: var(--alias-8, none);

        transition:
          transform 0.12s ease,
          background 0.15s ease;
      }

      /* Icon sampah */
      .arinex-chat-delete-btn img {
        width: 22px;
        height: 22px;
        object-fit: contain;
        display: block;

        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;

        transition: transform 0.12s ease;
      }

      .arinex-chat-delete-btn:hover {
        background: rgba(237, 28, 36, 0.10);
        transform: scale(1.05);
      }

      .arinex-chat-delete-btn:active {
        transform: scale(0.86);
      }

      .arinex-chat-delete-btn:active img {
        transform: scale(0.9);
      }

      /* ---------- Link di pesan ---------- */
      .arinex-msg-link {
        color: var(--accent, #00a651);
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 2px;
        word-break: break-word;
        cursor: pointer;
      }

      .arinex-msg-link:hover {
        text-decoration-thickness: 2px;
      }

      .arinex-msg-link:active {
        opacity: 0.7;
      }
    `;

    document.head.append(style);
  }

  /* =========================================================
     STORAGE
     Struktur:
     {
       "UID_LAWAN": {
         hidden: true,
         clearedAt: 1234567890
       }
     }
     ========================================================= */

  function loadDeletedChats() {
    try {
      const raw = ls.get(`${STORE_KEY}_${S.user?.uid || 'guest'}`);
      const data = raw ? JSON.parse(raw) : {};
      return data && typeof data === 'object' ? data : {};
    } catch {
      return {};
    }
  }

  function saveDeletedChats(data) {
    try {
      ls.set(
        `${STORE_KEY}_${S.user?.uid || 'guest'}`,
        JSON.stringify(data)
      );
    } catch {}
  }

  function getChatDeleteInfo(uid) {
    const data = loadDeletedChats();
    return data[uid] || null;
  }

  function isChatHidden(uid) {
    return !!getChatDeleteInfo(uid)?.hidden;
  }

  function getChatClearedAt(uid) {
    return Number(getChatDeleteInfo(uid)?.clearedAt || 0);
  }

  function markChatDeleted(uid) {
    if (!uid) return;

    const data = loadDeletedChats();

    data[uid] = {
      hidden: true,
      clearedAt: Date.now()
    };

    saveDeletedChats(data);
  }

  /*
   * Dipakai saat pengguna menambahkan kontak kembali.
   * clearedAt tetap dipertahankan supaya pesan lama
   * sebelum waktu hapus tidak langsung muncul lagi.
   */
  function restoreChat(uid) {
    if (!uid) return;

    const data = loadDeletedChats();

    if (!data[uid]) return;

    data[uid].hidden = false;

    saveDeletedChats(data);
  }

  /* =========================================================
     FILTER CHAT YANG SUDAH DIHAPUS DARI DAFTAR
     ========================================================= */

  const originalRenderContacts = renderContacts;

  renderContacts = function () {
    if (!S.user) {
      return originalRenderContacts();
    }

    const originalContacts = S.contacts;
    const deleted = loadDeletedChats();

    const filteredContacts = Object.fromEntries(
      Object.entries(originalContacts).filter(([uid]) => {
        return !deleted[uid]?.hidden;
      })
    );

    S.contacts = filteredContacts;

    try {
      return originalRenderContacts();
    } finally {
      S.contacts = originalContacts;
    }
  };

  /* =========================================================
     JANGAN AKTIFKAN WATCHER UNTUK CHAT YANG DIHAPUS
     Supaya tidak tetap dianggap sebagai percakapan aktif.
     ========================================================= */

  const originalWatchChats = watchChats;

  watchChats = function () {
    if (!S.user) {
      return originalWatchChats();
    }

    const originalContacts = S.contacts;
    const deleted = loadDeletedChats();

    const filteredContacts = Object.fromEntries(
      Object.entries(originalContacts).filter(([uid]) => {
        return !deleted[uid]?.hidden;
      })
    );

    S.contacts = filteredContacts;

    try {
      return originalWatchChats();
    } finally {
      S.contacts = originalContacts;
    }
  };

  /* =========================================================
     SAAT KONTAK DITAMBAHKAN KEMBALI:
     CHAT DIKEMBALIKAN KE DAFTAR.
     ========================================================= */

  const originalAddContactByEmail = addContactByEmail;

  addContactByEmail = async function (value) {
    const result = await originalAddContactByEmail(value);

    if (result?.uid) {
      restoreChat(result.uid);
    }

    return result;
  };

  /* =========================================================
     TOMBOL HAPUS CHAT DI HEADER
     ========================================================= */

  function installDeleteButton() {
    const menuBtn = $('chatMenuButton');

    if (!menuBtn) return;
    if ($('arinexChatDeleteButton')) return;

    const btn = document.createElement('button');

    btn.type = 'button';
    btn.id = 'arinexChatDeleteButton';
    btn.className = 'action-icon arinex-chat-delete-btn';

    /* ---------- Icon menggunakan gambar ---------- */
    const img = document.createElement('img');
    img.src = 'img/sampah.png';
    img.alt = '';
    img.draggable = false;

    btn.append(img);

    btn.setAttribute('aria-label', 'Hapus chat');
    btn.title = 'Hapus chat';

    btn.addEventListener('click', deleteActiveChat);

    menuBtn.insertAdjacentElement('afterend', btn);
  }

  /* =========================================================
     HAPUS CHAT AKTIF
     ========================================================= */

  function deleteActiveChat() {
    const uid = S.activeUid;

    if (!uid) {
      toast('Buka percakapan terlebih dahulu.');
      return;
    }

    const peer =
      S.peers[uid]?.displayName ||
      S.contacts[uid]?.displayName ||
      'Pengguna';

    const ok = window.confirm(
      `Hapus chat dengan ${peer}?\n\n` +
      `Riwayat pesan sebelum sekarang akan disembunyikan ` +
      `dari perangkat ini.`
    );

    if (!ok) return;

    /* Simpan waktu penghapusan */
    markChatDeleted(uid);

    /* Hentikan listener pesan */
    S.watch[uid]?.();

    if (S.watch[uid]) {
      delete S.watch[uid];
    }

    S.unread[uid] = 0;

    /*
     * clearActive() sudah:
     * - mematikan listener aktif
     * - mengosongkan chat
     * - kembali ke daftar kontak
     */
    clearActive();

    updateBadge();
    toast('Obrolan dihapus dari perangkat ini.');
  }

  /* =========================================================
     LINKIFY PESAN
     ========================================================= */

  function linkifyMessage(element) {
    if (!element) return;
    if (element.dataset.linkified === '1') return;

    const text = element.textContent || '';

    /*
     * URL yang didukung:
     * https://example.com
     * http://example.com
     * www.example.com
     */
    const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

    if (!urlRegex.test(text)) {
      element.dataset.linkified = '1';
      return;
    }

    /* reset regex state */
    urlRegex.lastIndex = 0;

    const fragment = document.createDocumentFragment();

    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      const raw = match[0];
      const start = match.index;
      const end = start + raw.length;

      /*
       * Jangan ikutkan tanda baca yang biasanya
       * berada setelah URL.
       */
      let urlText = raw;
      let trailing = '';

      const trimMatch = urlText.match(/([.,!?;:]+)$/);

      if (trimMatch) {
        trailing = trimMatch[1];

        urlText = urlText.slice(
          0,
          urlText.length - trailing.length
        );
      }

      /* Teks sebelum URL */
      if (start > lastIndex) {
        fragment.append(
          document.createTextNode(
            text.slice(lastIndex, start)
          )
        );
      }

      let href = urlText;

      if (/^www\./i.test(href)) {
        href = 'https://' + href;
      }

      try {
        const parsed = new URL(href);

        /*
         * Hanya izinkan HTTP/HTTPS.
         */
        if (
          parsed.protocol !== 'http:' &&
          parsed.protocol !== 'https:'
        ) {
          throw new Error('Protocol tidak diizinkan.');
        }

        const a = document.createElement('a');

        a.className = 'arinex-msg-link';
        a.href = parsed.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = urlText;
        a.title = parsed.href;

        fragment.append(a);

        if (trailing) {
          fragment.append(
            document.createTextNode(trailing)
          );
        }

      } catch {
        /*
         * Kalau URL tidak valid, tampilkan
         * sebagai teks biasa.
         */
        fragment.append(
          document.createTextNode(raw)
        );
      }

      lastIndex = end;
    }

    if (lastIndex < text.length) {
      fragment.append(
        document.createTextNode(
          text.slice(lastIndex)
        )
      );
    }

    element.textContent = '';
    element.append(fragment);
    element.dataset.linkified = '1';
  }

  /* =========================================================
     SEMBUNYIKAN PESAN SEBELUM WAKTU "HAPUS CHAT"
     ========================================================= */

  function cleanOldMessages() {
    const list = $('messageList');

    if (!list || !S.activeUid) return;

    const clearedAt = getChatClearedAt(S.activeUid);

    if (!clearedAt) return;

    list.querySelectorAll('.message-row[data-id]').forEach(row => {
      const id = row.dataset.id;
      const message = msgCache[id];

      if (!message) return;

      const ts = Number(message.createdAt) || 0;

      if (ts > 0 && ts <= clearedAt) {
        row.remove();
      }
    });

    /*
     * Bersihkan separator tanggal yang sudah tidak
     * memiliki pesan.
     */
    const separators = Array.from(
      list.querySelectorAll('.day-sep')
    );

    separators.forEach(sep => {
      let node = sep.nextElementSibling;
      let hasMessage = false;

      while (node) {
        if (node.classList.contains('day-sep')) {
          break;
        }

        if (node.classList.contains('message-row')) {
          hasMessage = true;
          break;
        }

        node = node.nextElementSibling;
      }

      if (!hasMessage) {
        sep.remove();
      }
    });
  }

  /* =========================================================
     ENHANCE MESSAGE
     ========================================================= */

  function enhanceMessages() {
    const list = $('messageList');

    if (!list) return;

    cleanOldMessages();

    list
      .querySelectorAll(
        '.message-text:not(.recalled-text)'
      )
      .forEach(linkifyMessage);
  }

  /* =========================================================
     OBSERVER
     Setiap kali Firebase merender ulang pesan,
     link otomatis diaktifkan lagi.
     ========================================================= */

  const messageList = $('messageList');

  if (messageList) {
    let enhanceFrame = 0;

    const observer = new MutationObserver(() => {
      cancelAnimationFrame(enhanceFrame);

      enhanceFrame = requestAnimationFrame(() => {
        enhanceMessages();
      });
    });

    observer.observe(messageList, {
      childList: true,
      subtree: true
    });

    enhanceMessages();
  }

  /* =========================================================
     INITIALIZE
     ========================================================= */

  installDeleteButton();

  /*
   * buildUI() sudah dijalankan sebelum blok ini,
   * jadi tombol header bisa langsung dibuat.
   */
  requestAnimationFrame(() => {
    installDeleteButton();
    enhanceMessages();
  });

})();
