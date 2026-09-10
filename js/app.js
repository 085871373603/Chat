import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  reload,
  updateProfile,
  deleteUser
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  onValue,
  onChildAdded,
  off,
  remove
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

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

const $ = (id) => document.getElementById(id);
const views = { auth: $("authView"), verify: $("verifyView"), chat: $("chatView") };
let currentUser = null;
let myProfile = null;
let contacts = {};
let activeUid = null;
let activeChatId = null;
let messagesUnsub = null;
let profileUnsub = null;
let deferredInstallPrompt = null;
let toastTimer = null;
let verifyCooldownUntil = 0;

const safeText = (value, max = 4000) => String(value ?? "").trim().slice(0, max);
const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

function setView(view) {
  Object.values(views).forEach((el) => el.classList.add("hidden"));
  views[view].classList.remove("hidden");
}

function showNotice(target, message, type = "info") {
  target.textContent = message;
  target.classList.remove("hidden", "error");
  if (type === "error") target.classList.add("error");
}
function hideNotice(target) { target.classList.add("hidden"); }

function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function switchAuthPanel(panel) {
  $("loginPanel").classList.toggle("hidden", panel !== "login");
  $("registerPanel").classList.toggle("hidden", panel !== "register");
  $("resetPanel").classList.toggle("hidden", panel !== "reset");
  hideNotice($("authNotice"));
}

function formatTime(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function chatIdFor(uid1, uid2) {
  return [uid1, uid2].sort().join("__");
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function validPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/.test(password);
}

function firebaseErrorMessage(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-credential": "Email atau password tidak sesuai.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/email-already-in-use": "Email tersebut sudah terdaftar.",
    "auth/weak-password": "Password terlalu lemah.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Silakan coba lagi nanti.",
    "auth/network-request-failed": "Koneksi jaringan bermasalah.",
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/wrong-password": "Email atau password tidak sesuai.",
    "auth/missing-password": "Password wajib diisi."
  };
  return map[code] || "Terjadi kesalahan. Silakan coba lagi.";
}

async function sendVerification(force = false) {
  if (!currentUser) return;
  const now = Date.now();
  if (!force && now < verifyCooldownUntil) {
    showNotice($("verifyNotice"), `Tunggu ${Math.ceil((verifyCooldownUntil - now) / 1000)} detik sebelum mengirim ulang.`, "info");
    return;
  }
  try {
    await sendEmailVerification(currentUser, { url: location.href, handleCodeInApp: false });
    verifyCooldownUntil = Date.now() + 60_000;
    showNotice($("verifyNotice"), "Email verifikasi sudah dikirim. Periksa Inbox, Spam, atau Promosi.");
  } catch (error) {
    showNotice($("verifyNotice"), firebaseErrorMessage(error), "error");
  }
}

async function createProfile(user, displayName) {
  const email = normalizeEmail(user.email);
  const emailHash = await sha256Hex(email);
  const profile = {
    displayName: safeText(displayName, 40) || "Pengguna",
    emailVerified: !!user.emailVerified,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await set(ref(db, `users/${user.uid}`), profile);
  if (user.emailVerified) {
    await set(ref(db, `emailIndex/${emailHash}`), user.uid);
  }
  return profile;
}

async function ensureProfile(user) {
  const profileSnap = await get(ref(db, `users/${user.uid}`));
  const emailHash = await sha256Hex(normalizeEmail(user.email));
  const emailIndexSnap = await get(ref(db, `emailIndex/${emailHash}`));
  if (!profileSnap.exists()) {
    const fallbackName = safeText(user.displayName, 40) || normalizeEmail(user.email).split("@")[0] || "Pengguna";
    myProfile = {
      displayName: fallbackName,
      emailVerified: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await set(ref(db, `users/${user.uid}`), myProfile);
  } else {
    myProfile = { ...(profileSnap.val() || {}), emailVerified: true, updatedAt: Date.now() };
    await update(ref(db, `users/${user.uid}`), { emailVerified: true, updatedAt: myProfile.updatedAt });
  }
  if (!emailIndexSnap.exists()) {
    // The hash is not the raw email, and the write can only claim the authenticated user's own UID.
    await set(ref(db, `emailIndex/${emailHash}`), user.uid);
  }
  renderMe();
}

function renderMe() {
  $("myName").textContent = myProfile?.displayName || currentUser?.displayName || "Pengguna";
  $("myEmail").textContent = currentUser?.email || "";
}

async function addContactByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("Email wajib diisi.");
  if (normalized === normalizeEmail(currentUser.email)) throw new Error("Anda tidak dapat menambahkan diri sendiri.");
  const hash = await sha256Hex(normalized);
  const indexSnap = await get(ref(db, `emailIndex/${hash}`));
  if (!indexSnap.exists()) throw new Error("Kontak tidak ditemukan atau belum terdaftar.");
  const uid = indexSnap.val();
  if (!uid || uid === currentUser.uid) throw new Error("Kontak tidak valid.");
  const userSnap = await get(ref(db, `users/${uid}`));
  if (!userSnap.exists()) throw new Error("Profil kontak tidak tersedia.");
  const user = userSnap.val();
  if (!user.emailVerified) throw new Error("Akun tersebut belum terverifikasi.");
  const payload = { displayName: safeText(user.displayName, 40) || "Pengguna", emailHint: normalized, addedAt: Date.now() };
  await set(ref(db, `contacts/${currentUser.uid}/${uid}`), payload);
  await set(ref(db, `chats/${chatIdFor(currentUser.uid, uid)}/participants/${currentUser.uid}`), true);
  await set(ref(db, `chats/${chatIdFor(currentUser.uid, uid)}/participants/${uid}`), true);
  return { uid, ...payload };
}

function renderContacts() {
  const search = normalizeEmail($("contactSearch").value);
  const list = $("contactList");
  list.innerHTML = "";
  const entries = Object.entries(contacts)
    .map(([uid, data]) => ({ uid, ...data }))
    .filter((c) => !search || normalizeEmail(c.emailHint).includes(search) || safeText(c.displayName, 80).toLowerCase().includes(search));
  $("emptyContacts").classList.toggle("hidden", entries.length > 0);
  for (const contact of entries) {
    const button = document.createElement("button");
    button.className = `contact-item ${contact.uid === activeUid ? "active" : ""}`;
    button.type = "button";
    button.dataset.uid = contact.uid;
    const img = document.createElement("img");
    img.className = "avatar";
    img.src = "img/chat_logo.png";
    img.alt = "";
    const copy = document.createElement("div");
    copy.className = "contact-copy";
    const strong = document.createElement("strong");
    strong.textContent = contact.displayName || "Pengguna";
    const span = document.createElement("span");
    span.textContent = contact.emailHint || "Kontak";
    copy.append(strong, span);
    button.append(img, copy);
    button.addEventListener("click", () => openConversation(contact.uid));
    list.append(button);
  }
}

function listenContacts() {
  return onValue(ref(db, `contacts/${currentUser.uid}`), (snap) => {
    contacts = snap.exists() ? snap.val() : {};
    renderContacts();
  });
}

async function fetchPeer(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  if (!snap.exists()) throw new Error("Profil kontak tidak ditemukan.");
  return snap.val();
}

async function ensureChat(uid) {
  const chatId = chatIdFor(currentUser.uid, uid);
  const participantsPath = ref(db, `chats/${chatId}/participants`);
  const snap = await get(participantsPath);
  const participants = snap.exists() ? snap.val() : {};
  if (!participants[currentUser.uid] || !participants[uid]) {
    const updates = {};
    updates[`chats/${chatId}/participants/${currentUser.uid}`] = true;
    updates[`chats/${chatId}/participants/${uid}`] = true;
    await update(ref(db), updates);
  }
  return chatId;
}

async function openConversation(uid) {
  if (!currentUser || uid === currentUser.uid) return;
  try {
    const peer = await fetchPeer(uid);
    activeUid = uid;
    activeChatId = await ensureChat(uid);
    $("peerName").textContent = peer.displayName || "Pengguna";
    $("peerStatus").textContent = "email terverifikasi";
    $("activeConversation").classList.remove("hidden");
    $("welcomeConversation").classList.add("hidden");
    $("chatView").classList.add("mobile-open");
    renderContacts();
    await listenMessages();
    setTimeout(() => $("messageInput").focus(), 50);
  } catch (error) {
    showToast(error?.message || "Gagal membuka chat.");
  }
}

async function listenMessages() {
  if (messagesUnsub) messagesUnsub();
  if (!activeChatId) return;
  const messagesRef = ref(db, `chats/${activeChatId}/messages`);
  $("messageList").innerHTML = "";
  messagesUnsub = onValue(messagesRef, (snap) => {
    const items = [];
    if (snap.exists()) snap.forEach((child) => items.push({ id: child.key, ...child.val() }));
    items.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    const list = $("messageList");
    list.innerHTML = "";
    for (const message of items.slice(-200)) appendMessage(message);
    requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
  });
}

function appendMessage(message) {
  const row = document.createElement("div");
  const mine = message.senderId === currentUser.uid;
  row.className = `message-row ${mine ? "me" : "them"}`;
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = safeText(message.text, 4000);
  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = `${formatTime(message.createdAt)}${mine ? " ✓" : ""}`;
  bubble.append(text, meta);
  row.append(bubble);
  $("messageList").append(row);
}

async function sendMessage() {
  if (!activeChatId || !activeUid || !currentUser?.emailVerified) return;
  const input = $("messageInput");
  const text = safeText(input.value, 4000);
  if (!text) return;
  input.value = "";
  const messageRef = push(ref(db, `chats/${activeChatId}/messages`));
  const message = { senderId: currentUser.uid, text, createdAt: Date.now() };
  try {
    await set(messageRef, message);
  } catch (error) {
    input.value = text;
    showToast("Pesan gagal dikirim. Periksa koneksi atau akses database.");
  }
}

function clearActiveChat() {
  activeUid = null;
  activeChatId = null;
  if (messagesUnsub) messagesUnsub();
  messagesUnsub = null;
  $("activeConversation").classList.add("hidden");
  $("welcomeConversation").classList.remove("hidden");
  $("chatView").classList.remove("mobile-open");
  $("messageList").innerHTML = "";
  renderContacts();
}

async function handleRegister(event) {
  event.preventDefault();
  const name = safeText($("registerName").value, 40);
  const email = normalizeEmail($("registerEmail").value);
  const p1 = $("registerPassword").value;
  const p2 = $("registerPassword2").value;
  if (!name || !email) return showNotice($("authNotice"), "Nama dan email wajib diisi.", "error");
  if (!validPassword(p1)) return showNotice($("authNotice"), "Password harus 8–72 karakter dan mengandung huruf besar, huruf kecil, angka, serta simbol.", "error");
  if (p1 !== p2) return showNotice($("authNotice"), "Konfirmasi password tidak sama.", "error");
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, p1);
    await updateProfile(credential.user, { displayName: name });
    currentUser = credential.user;
    await createProfile(credential.user, name);
    await sendVerification(true);
    $("registerForm").reset();
    showNotice($("authNotice"), "Akun dibuat. Email verifikasi sudah dikirim.");
  } catch (error) {
    showNotice($("authNotice"), firebaseErrorMessage(error), "error");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = normalizeEmail($("loginEmail").value);
  const password = $("loginPassword").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    $("loginForm").reset();
  } catch (error) {
    showNotice($("authNotice"), firebaseErrorMessage(error), "error");
  }
}

async function handleReset(event) {
  event.preventDefault();
  const email = normalizeEmail($("resetEmail").value);
  try {
    await sendPasswordResetEmail(auth, email, { url: location.origin + location.pathname, handleCodeInApp: false });
    showNotice($("authNotice"), "Jika akun tersebut dapat menerima reset password, Firebase akan mengirimkan email reset.");
    $("resetForm").reset();
  } catch (error) {
    showNotice($("authNotice"), firebaseErrorMessage(error), "error");
  }
}

async function initAuthenticatedUser(user) {
  currentUser = user;
  if (!user.emailVerified) {
    $("verifyAddress").textContent = normalizeEmail(user.email);
    setView("verify");
    return;
  }
  await ensureProfile(user);
  setView("chat");
  if (!profileUnsub) profileUnsub = listenContacts();
  renderContacts();
}

onAuthStateChanged(auth, async (user) => {
  try {
    currentUser = user;
    if (!user) {
      myProfile = null;
      contacts = {};
      clearActiveChat();
      setView("auth");
      switchAuthPanel("login");
      return;
    }
    if (!user.emailVerified) {
      $("verifyAddress").textContent = normalizeEmail(user.email);
      setView("verify");
      return;
    }
    await initAuthenticatedUser(user);
  } catch (error) {
    console.error(error);
    await signOut(auth);
    showToast("Sesi tidak dapat dimuat. Silakan masuk kembali.");
  }
});

$("loginForm").addEventListener("submit", handleLogin);
$("registerForm").addEventListener("submit", handleRegister);
$("resetForm").addEventListener("submit", handleReset);
$("showRegister").addEventListener("click", () => switchAuthPanel("register"));
$("showLogin").addEventListener("click", () => switchAuthPanel("login"));
$("showReset").addEventListener("click", () => switchAuthPanel("reset"));
$("backToLogin").addEventListener("click", () => switchAuthPanel("login"));
$("verifyLogout").addEventListener("click", () => signOut(auth));
$("resendVerification").addEventListener("click", () => sendVerification());
$("checkVerification").addEventListener("click", async () => {
  try {
    if (!currentUser) return;
    await reload(currentUser);
    currentUser = auth.currentUser;
    if (currentUser?.emailVerified) {
      showNotice($("verifyNotice"), "Email terverifikasi. Membuka Arinex Chat...");
      await initAuthenticatedUser(currentUser);
    } else {
      showNotice($("verifyNotice"), "Status belum terverifikasi. Pastikan tautan email sudah dibuka.", "error");
    }
  } catch (error) {
    showNotice($("verifyNotice"), firebaseErrorMessage(error), "error");
  }
});

$("logoutButton").addEventListener("click", async () => {
  if (messagesUnsub) messagesUnsub();
  await signOut(auth);
});

$("addContactButton").addEventListener("click", () => {
  $("modalBackdrop").classList.remove("hidden");
  $("contactEmail").value = "";
  hideNotice($("contactModalNotice"));
  setTimeout(() => $("contactEmail").focus(), 20);
});
$("closeContactModal").addEventListener("click", () => $("modalBackdrop").classList.add("hidden"));
$("modalBackdrop").addEventListener("click", (e) => { if (e.target === $("modalBackdrop")) $("modalBackdrop").classList.add("hidden"); });
$("contactForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await addContactByEmail($("contactEmail").value);
    $("modalBackdrop").classList.add("hidden");
    showToast(`${result.displayName} berhasil ditambahkan.`);
  } catch (error) {
    showNotice($("contactModalNotice"), error?.message || "Kontak gagal ditambahkan.", "error");
  }
});

$("contactSearch").addEventListener("input", renderContacts);
$("messageForm").addEventListener("submit", async (e) => { e.preventDefault(); await sendMessage(); });
$("backToContacts").addEventListener("click", clearActiveChat);
$("emojiButton").addEventListener("click", () => { $("messageInput").value += "🙂"; $("messageInput").focus(); });

window.addEventListener("beforeunload", () => {
  if (messagesUnsub) messagesUnsub();
  if (profileUnsub) profileUnsub();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  $("installButton").classList.remove("hidden");
});

$("installButton").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $("installButton").classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch((error) => console.warn("SW registration failed", error));
}

