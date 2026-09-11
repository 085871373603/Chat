import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, reload, updateProfile } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, onValue, off, query, orderByChild, limitToLast, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

const firebaseConfig={apiKey:"AIzaSyCFsAAGRTW0et7_pQnxhLtkGR174kRqikg",authDomain:"arinexservice.firebaseapp.com",databaseURL:"https://arinexservice-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"arinexservice",storageBucket:"arinexservice.firebasestorage.app",messagingSenderId:"780762123532",appId:"1:780762123532:web:2c3b8a374eba5871490d29",measurementId:"G-SB9MXMZVCF"};
const firebaseApp=initializeApp(firebaseConfig);const auth=getAuth(firebaseApp);const db=getDatabase(firebaseApp);
const $=id=>document.getElementById(id);const views={auth:$('authView'),verify:$('verifyView'),chat:$('chatView')};
let currentUser=null,myProfile=null,contacts={},activeUid=null,activeChatId=null,messagesUnsub=null,contactsUnsub=null,presenceDisconnect=null,deferredInstallPrompt=null,toastTimer=null,verifyCooldownUntil=0;
let authInitPromise=null, authInitUid=null;

const safeText=(v,max=4000)=>String(v??'').trim().slice(0,max);const normalizeEmail=v=>String(v??'').trim().toLowerCase();
function setView(name){Object.values(views).forEach(v=>v.classList.add('hidden'));views[name].classList.remove('hidden')}
function showNotice(el,msg,type='info'){el.textContent=msg;el.classList.remove('hidden','error');if(type==='error')el.classList.add('error')}
function hideNotice(el){el.classList.add('hidden')}
function showToast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000)}
function switchAuthPanel(panel){$('loginPanel').classList.toggle('hidden',panel!=='login');$('registerPanel').classList.toggle('hidden',panel!=='register');$('resetPanel').classList.toggle('hidden',panel!=='reset');hideNotice($('authNotice'))}
function formatTime(ts){const d=new Date(Number(ts)||Date.now());return new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit'}).format(d)}
function chatIdFor(a,b){return [a,b].sort().join('__')}
async function sha256Hex(value){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function validPassword(p){return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/.test(p)}
function firebaseErrorMessage(error){const c=error?.code||'';const map={'auth/invalid-credential':'Email atau password tidak sesuai.','auth/invalid-email':'Format email tidak valid.','auth/email-already-in-use':'Email tersebut sudah terdaftar.','auth/weak-password':'Password terlalu lemah.','auth/too-many-requests':'Terlalu banyak percobaan. Coba lagi beberapa saat.','auth/network-request-failed':'Koneksi jaringan bermasalah.','auth/user-not-found':'Akun tidak ditemukan.','auth/wrong-password':'Email atau password tidak sesuai.','auth/missing-password':'Password wajib diisi.','auth/requires-recent-login':'Silakan login kembali untuk melakukan tindakan ini.','auth/operation-not-allowed':'Metode email/password belum diaktifkan di Firebase.','auth/unauthorized-continue-uri':'Domain aplikasi belum masuk Authorized domains Firebase.'};return map[c]||error?.message||'Terjadi kesalahan. Silakan coba lagi.'}
function actionCodeSettings(){return{url:window.location.origin+window.location.pathname,handleCodeInApp:false}}

async function refreshCurrentUser(requireVerified=false){
  if(!auth.currentUser) throw new Error('Sesi login tidak ditemukan.');
  await reload(auth.currentUser);
  // Force-refresh the ID token so Realtime Database Rules immediately see email_verified=true.
  await auth.currentUser.getIdToken(true);
  currentUser=auth.currentUser;
  if(requireVerified && !currentUser.emailVerified) throw new Error('Email belum terverifikasi.');
  return currentUser;
}

async function withTimeout(promise, ms=15000){
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Koneksi Firebase terlalu lama. Periksa internet dan Realtime Database Rules.')),ms)});
  try{return await Promise.race([promise,timeout]);}finally{clearTimeout(timer)}
}

async function createVerifiedProfile(user){if(!user.emailVerified)throw new Error('Email belum terverifikasi.');const email=normalizeEmail(user.email);const hash=await sha256Hex(email);const now=Date.now();const name=safeText(user.displayName,40)||email.split('@')[0]||'Pengguna';const profile={displayName:name,createdAt:now,updatedAt:now};await update(ref(db),{[`users/${user.uid}`]:profile,[`publicProfiles/${user.uid}`]:{displayName:name,updatedAt:now},[`emailIndex/${hash}`]:user.uid});myProfile=profile;return profile}
async function ensureProfile(user){
  if(!user?.emailVerified) throw new Error('Email belum terverifikasi.');
  const email=normalizeEmail(user.email);
  if(!email) throw new Error('Email akun tidak tersedia.');
  const hash=await sha256Hex(email);
  const userRef=ref(db,`users/${user.uid}`);
  const publicRef=ref(db,`publicProfiles/${user.uid}`);
  const indexRef=ref(db,`emailIndex/${hash}`);
  const [userSnap,publicSnap,indexSnap]=await Promise.all([get(userRef),get(publicRef),get(indexRef)]);
  const existing=userSnap.exists()?userSnap.val():{};
  const name=safeText(user.displayName,40)||safeText(existing.displayName,40)||email.split('@')[0]||'Pengguna';
  const now=Date.now();
  const updates={};
  if(!userSnap.exists()){
    updates[`users/${user.uid}`]={displayName:name,createdAt:now,updatedAt:now};
  }else if(existing.displayName!==name){
    updates[`users/${user.uid}/displayName`]=name;
    updates[`users/${user.uid}/updatedAt`]=now;
  }
  const publicName=publicSnap.exists()?publicSnap.val().displayName:'';
  if(!publicSnap.exists() || publicName!==name){
    updates[`publicProfiles/${user.uid}`]={displayName:name,updatedAt:now};
  }
  if(!indexSnap.exists()) updates[`emailIndex/${hash}`]=user.uid;
  if(Object.keys(updates).length) await withTimeout(update(ref(db),updates),15000);
  myProfile={...(userSnap.exists()?existing:{}),displayName:name,updatedAt:now};
  if(!myProfile.createdAt) myProfile.createdAt=now;
  renderMe();
}
function renderMe(){
  const name=myProfile?.displayName||currentUser?.displayName||currentUser?.email?.split('@')[0]||'Pengguna';
  const email=currentUser?.email||'';
  ['myName','menuName'].forEach(id=>{if($(id))$(id).textContent=name});
  ['myEmail','menuEmail'].forEach(id=>{if($(id))$(id).textContent=email});
  return name;
}

async 
function closeAccountMenu(){const m=$('accountMenu');if(!m)return;m.classList.add('hidden');m.setAttribute('aria-hidden','true')}
function toggleAccountMenu(){const m=$('accountMenu');if(!m)return;const hidden=m.classList.toggle('hidden');m.setAttribute('aria-hidden',String(hidden));renderMe()}

function sendVerification(){if(!currentUser)return;const now=Date.now();if(now<verifyCooldownUntil){showNotice($('verifyNotice'),`Tunggu ${Math.ceil((verifyCooldownUntil-now)/1000)} detik sebelum mengirim ulang.`);return}try{await sendEmailVerification(currentUser,actionCodeSettings());verifyCooldownUntil=Date.now()+60000;showNotice($('verifyNotice'),'Email verifikasi sudah dikirim. Periksa Inbox, Spam, Promosi, atau Updates.')}catch(e){console.error('VERIFICATION ERROR',e);showNotice($('verifyNotice'),firebaseErrorMessage(e),'error')}}

async function addContactByEmail(email){
  await refreshCurrentUser(true);
  const normalized=normalizeEmail(email);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Masukkan email yang valid.');
  if(normalized===normalizeEmail(currentUser.email)) throw new Error('Anda tidak dapat menambahkan diri sendiri.');
  const hash=await sha256Hex(normalized);
  const index=await withTimeout(get(ref(db,`emailIndex/${hash}`)),12000);
  if(!index.exists()) throw new Error('Kontak tidak ditemukan. Pastikan pengguna sudah mendaftar, memverifikasi email, lalu login minimal sekali.');
  const uid=String(index.val()||'');
  if(!uid||uid===currentUser.uid) throw new Error('Kontak tidak valid.');
  const profile=await withTimeout(get(ref(db,`publicProfiles/${uid}`)),12000);
  if(!profile.exists()) throw new Error('Profil kontak belum tersedia. Minta pengguna tersebut login kembali.');
  const data={displayName:safeText(profile.val()?.displayName,40)||'Pengguna',emailHint:normalized,addedAt:Date.now()};
  await withTimeout(set(ref(db,`contacts/${currentUser.uid}/${uid}`),data),12000);
  await ensureChat(uid);
  return{uid,...data};
}

function renderContacts(){const term=normalizeEmail($('contactSearch').value);const list=$('contactList');list.innerHTML='';const entries=Object.entries(contacts||{}).map(([uid,v])=>({uid,...v})).filter(c=>!term||normalizeEmail(c.emailHint).includes(term)||String(c.displayName||'').toLowerCase().includes(term));$('emptyContacts').classList.toggle('hidden',entries.length>0);for(const c of entries){const btn=document.createElement('button');btn.className=`contact-item ${c.uid===activeUid?'active':''}`;btn.type='button';const img=document.createElement('img');img.className='avatar';img.src='img/chat_logo.png';img.alt='';const copy=document.createElement('div');copy.className='contact-copy';const strong=document.createElement('strong');strong.textContent=c.displayName||'Pengguna';const span=document.createElement('span');span.textContent=c.emailHint||'Kontak';copy.append(strong,span);btn.append(img,copy);btn.addEventListener('click',()=>openConversation(c.uid));list.append(btn)}}
function listenContacts(){if(contactsUnsub)contactsUnsub();contactsUnsub=onValue(ref(db,`contacts/${currentUser.uid}`),snap=>{contacts=snap.exists()?snap.val():{};renderContacts()})}
async function fetchPeer(uid){const snap=await get(ref(db,`publicProfiles/${uid}`));if(!snap.exists())throw new Error('Profil kontak tidak ditemukan.');return snap.val()}
async function ensureChat(uid){const chatId=chatIdFor(currentUser.uid,uid);const participants=ref(db,`chats/${chatId}/participants`);const snap=await get(participants);const members=snap.exists()?snap.val():{};if(!members[currentUser.uid])await set(ref(db,`chats/${chatId}/participants/${currentUser.uid}`),true);const snap2=await get(participants);const members2=snap2.exists()?snap2.val():{};if(!members2[uid])await set(ref(db,`chats/${chatId}/participants/${uid}`),true);const snap3=await get(participants);const members3=snap3.exists()?snap3.val():{};if(!members3[currentUser.uid]||!members3[uid])throw new Error('Chat belum dapat dibuat.');const meta=await get(ref(db,`chats/${chatId}`));const chat=meta.exists()?meta.val():{};const metadataUpdates={};if(chat.type!=='direct')metadataUpdates[`chats/${chatId}/type`]='direct';if(!chat.createdAt)metadataUpdates[`chats/${chatId}/createdAt`]=serverTimestamp();if(Object.keys(metadataUpdates).length)await update(ref(db),metadataUpdates);return chatId}

async function openConversation(uid){if(!currentUser||uid===currentUser.uid)return;try{const peer=await fetchPeer(uid);activeUid=uid;activeChatId=await ensureChat(uid);$('peerName').textContent=peer.displayName||'Pengguna';$('peerStatus').textContent='● Email terverifikasi';$('activeConversation').classList.remove('hidden');$('welcomeConversation').classList.add('hidden');$('chatView').classList.add('mobile-open');renderContacts();listenMessages();setTimeout(()=>$('messageInput').focus(),60)}catch(e){console.error(e);showToast(e?.message||'Gagal membuka chat.')}}
function listenMessages(){if(messagesUnsub){messagesUnsub();messagesUnsub=null}if(!activeChatId)return;$('messageList').innerHTML='';const q=query(ref(db,`chats/${activeChatId}/messages`),orderByChild('createdAt'),limitToLast(200));messagesUnsub=onValue(q,snap=>{const arr=[];snap.forEach(ch=>arr.push({id:ch.key,...(ch.val()||{})}));arr.sort((a,b)=>Number(a.createdAt||0)-Number(b.createdAt||0));const list=$('messageList');list.innerHTML='';for(const m of arr)appendMessage(m);requestAnimationFrame(()=>list.scrollTop=list.scrollHeight)})}
function appendMessage(message){if(!message?.senderId)return;const row=document.createElement('div');const mine=message.senderId===currentUser.uid;row.className=`message-row ${mine?'me':'them'}`;const bubble=document.createElement('div');bubble.className='message-bubble';const text=document.createElement('div');text.className='message-text';text.textContent=safeText(message.text,4000);const meta=document.createElement('div');meta.className='message-meta';meta.textContent=`${formatTime(message.createdAt)}${mine?' ✓':''}`;bubble.append(text,meta);row.append(bubble);$('messageList').append(row)}
async function sendMessage(){if(!activeChatId||!activeUid||!currentUser?.emailVerified)return;const input=$('messageInput');const text=safeText(input.value,4000);if(!text)return;const old=input.value;input.value='';try{const messageRef=push(ref(db,`chats/${activeChatId}/messages`));await set(messageRef,{senderId:currentUser.uid,text,createdAt:serverTimestamp()})}catch(e){input.value=old;console.error(e);showToast('Pesan gagal dikirim.')}}
function clearActiveChat(){$('chatView').classList.remove('mobile-open');activeUid=null;activeChatId=null;if(messagesUnsub){messagesUnsub();messagesUnsub=null}$('activeConversation').classList.add('hidden');$('welcomeConversation').classList.remove('hidden');$('messageList').innerHTML='';renderContacts()}

function setPresence(online){if(!currentUser?.emailVerified)return;const base=ref(db,`presence/${currentUser.uid}`);set(base,{online,lastSeen:serverTimestamp()}).catch(()=>{});if(online){if(presenceDisconnect)presenceDisconnect();presenceDisconnect=onDisconnect(base);presenceDisconnect.set({online:false,lastSeen:serverTimestamp()}).catch(()=>{})}}
function closeRealtime(){if(messagesUnsub){messagesUnsub();messagesUnsub=null}if(contactsUnsub){contactsUnsub();contactsUnsub=null}if(presenceDisconnect){presenceDisconnect.cancel().catch(()=>{});presenceDisconnect=null}}
async function initAuthenticatedUser(user){
  currentUser=user;
  if(!user.emailVerified) throw new Error('Email belum terverifikasi.');
  if(authInitPromise && authInitUid===user.uid) return authInitPromise;
  authInitUid=user.uid;
  authInitPromise=(async()=>{
    await withTimeout(refreshCurrentUser(true),15000);
    await withTimeout(ensureProfile(currentUser),15000);
    renderMe();
    setView('chat');
    listenContacts();
    setPresence(true);
  })().catch(err=>{authInitPromise=null;authInitUid=null;throw err});
  return authInitPromise;
}

async function handleRegister(e){e.preventDefault();const name=safeText($('registerName').value,40),email=normalizeEmail($('registerEmail').value),p1=$('registerPassword').value,p2=$('registerPassword2').value;if(!name||!email)return showNotice($('authNotice'),'Nama dan email wajib diisi.','error');if(!validPassword(p1))return showNotice($('authNotice'),'Password harus 8–72 karakter dan mengandung huruf besar, huruf kecil, angka, serta simbol.','error');if(p1!==p2)return showNotice($('authNotice'),'Konfirmasi password tidak sama.','error');const button=e.submitter;button.disabled=true;button.textContent='Membuat akun…';try{const credential=await createUserWithEmailAndPassword(auth,email,p1);await updateProfile(credential.user,{displayName:name});currentUser=credential.user;await sendVerification();$('registerForm').reset();showNotice($('authNotice'),'Akun berhasil dibuat. Silakan buka email verifikasi.');}catch(err){console.error('REGISTER ERROR',err);showNotice($('authNotice'),firebaseErrorMessage(err),'error')}finally{button.disabled=false;button.textContent='Daftar & verifikasi →'}}
async function handleLogin(e){
  e.preventDefault();
  const email=normalizeEmail($('loginEmail').value);
  const password=$('loginPassword').value;
  if(!email||!password) return showNotice($('authNotice'),'Email dan password wajib diisi.','error');
  const button=e.submitter;
  button.disabled=true;
  button.textContent='Menghubungkan…';
  hideNotice($('authNotice'));
  try{
    const cred=await withTimeout(signInWithEmailAndPassword(auth,email,password),15000);
    currentUser=cred.user;
    await withTimeout(refreshCurrentUser(false),10000);
    if(!currentUser.emailVerified){
      $('verifyAddress').textContent=currentUser.email||email;
      setView('verify');
      showNotice($('verifyNotice'),'Login berhasil, tetapi email belum diverifikasi.','error');
      return;
    }
    showNotice($('authNotice'),'Login berhasil. Memuat Arinex Chat…');
    await initAuthenticatedUser(currentUser);
    $('loginForm').reset();
  }catch(err){
    console.error('LOGIN ERROR',err);
    showNotice($('authNotice'),firebaseErrorMessage(err),'error');
  }finally{
    button.disabled=false;
    button.textContent='Masuk →';
  }
}

async function handleReset(e){e.preventDefault();const email=normalizeEmail($('resetEmail').value);if(!email)return showNotice($('authNotice'),'Email wajib diisi.','error');const button=e.submitter;button.disabled=true;button.textContent='Mengirim…';try{await sendPasswordResetEmail(auth,email,actionCodeSettings());showNotice($('authNotice'),'Jika akun dapat menerima reset password, Firebase akan mengirimkan tautannya.');$('resetForm').reset()}catch(err){console.error(err);showNotice($('authNotice'),firebaseErrorMessage(err),'error')}finally{button.disabled=false;button.textContent='Kirim tautan reset →'}}

setPersistence(auth,browserLocalPersistence).catch(err=>console.warn('Persistence setup:',err));

onAuthStateChanged(auth,async user=>{
  currentUser=user;
  if(!user){
    authInitPromise=null; authInitUid=null;
    closeRealtime(); myProfile=null; contacts={}; clearActiveChat(); setView('auth'); switchAuthPanel('login'); return;
  }
  try{
    await refreshCurrentUser(false);
    if(!currentUser.emailVerified){
      $('verifyAddress').textContent=currentUser.email||'';
      setView('verify');
      return;
    }
    await initAuthenticatedUser(currentUser);
  }catch(err){
    console.error('SESSION INIT ERROR',err);
    closeRealtime();
    setView('auth');
    switchAuthPanel('login');
    showNotice($('authNotice'),firebaseErrorMessage(err),'error');
  }
});
$('loginForm').addEventListener('submit',handleLogin);$('registerForm').addEventListener('submit',handleRegister);$('resetForm').addEventListener('submit',handleReset);$('showRegister').addEventListener('click',()=>switchAuthPanel('register'));$('showLogin').addEventListener('click',()=>switchAuthPanel('login'));$('showReset').addEventListener('click',()=>switchAuthPanel('reset'));$('backToLogin').addEventListener('click',()=>switchAuthPanel('login'));$('verifyLogout').addEventListener('click',()=>signOut(auth));$('resendVerification').addEventListener('click',sendVerification);
$('checkVerification').addEventListener('click',async()=>{try{if(!currentUser)return;await refreshCurrentUser(false);if(currentUser.emailVerified){showNotice($('verifyNotice'),'Email terverifikasi. Membuka Arinex Chat…');await initAuthenticatedUser(currentUser)}else showNotice($('verifyNotice'),'Status belum terverifikasi. Buka tautan dari email terlebih dahulu.','error')}catch(e){console.error(e);showNotice($('verifyNotice'),firebaseErrorMessage(e),'error')}});
async function doLogout(){closeAccountMenu();setPresence(false);closeRealtime();try{await signOut(auth)}catch(e){console.error('LOGOUT ERROR',e);showToast('Gagal keluar. Coba lagi.')}}
$('logoutButton').addEventListener('click',doLogout);
$('accountButton').addEventListener('click',(e)=>{e.stopPropagation();toggleAccountMenu()});
$('menuLogout').addEventListener('click',doLogout);
$('menuTheme').addEventListener('click',()=>{$('themeButton').click();closeAccountMenu()});
$('accountMenu').addEventListener('click',e=>e.stopPropagation());
document.addEventListener('click',closeAccountMenu);

$('addContactButton').addEventListener('click',()=>{$('modalBackdrop').classList.remove('hidden');$('contactEmail').value='';hideNotice($('contactModalNotice'));setTimeout(()=>$('contactEmail').focus(),30)});$('closeContactModal').addEventListener('click',()=>$('modalBackdrop').classList.add('hidden'));$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))$('modalBackdrop').classList.add('hidden')});$('contactForm').addEventListener('submit',async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;btn.textContent='Mencari…';try{const r=await addContactByEmail($('contactEmail').value);$('modalBackdrop').classList.add('hidden');showToast(`${r.displayName} berhasil ditambahkan.`)}catch(err){console.error(err);showNotice($('contactModalNotice'),err?.message||'Kontak gagal ditambahkan.','error')}finally{btn.disabled=false;btn.textContent='Cari & tambahkan →'}});
$('contactSearch').addEventListener('input',renderContacts);$('messageForm').addEventListener('submit',e=>{e.preventDefault();sendMessage()});$('backToContacts').addEventListener('click',clearActiveChat);$('emojiButton').addEventListener('click',()=>{$('messageInput').value+='🙂';$('messageInput').focus()});$('chatMenuButton').addEventListener('click',()=>showToast('Chat aktif • koneksi realtime'));

document.querySelectorAll('.reveal-btn').forEach(btn=>btn.addEventListener('click',()=>{const input=$(btn.dataset.target);input.type=input.type==='password'?'text':'password';btn.textContent=input.type==='password'?'◉':'◌'}));
$('themeButton').addEventListener('click',()=>{document.body.classList.toggle('light');localStorage.setItem('arinex-theme',document.body.classList.contains('light')?'light':'dark')});if(localStorage.getItem('arinex-theme')==='light')document.body.classList.add('light');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installButton').classList.remove('hidden')});$('installButton').addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installButton').classList.add('hidden')});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setPresence(true);else setPresence(false)});
// Best-effort UI restrictions: inputs remain usable. No browser page can reliably prevent screenshots or determined users from copying content.
document.addEventListener('contextmenu',e=>{if(!e.target.closest('input,textarea'))e.preventDefault()});document.addEventListener('selectstart',e=>{if(!e.target.closest('input,textarea,[contenteditable="true"]'))e.preventDefault()});document.addEventListener('dragstart',e=>e.preventDefault());document.addEventListener('keydown',e=>{const editable=e.target.closest('input,textarea,[contenteditable="true"]');const blocked=(e.ctrlKey||e.metaKey)&&['c','x','a','u','s','p'].includes(e.key.toLowerCase());if(!editable&&blocked){e.preventDefault();e.stopPropagation()}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('SW',e));
setPersistence(auth,browserLocalPersistence).catch(err=>console.warn('Persistence setup:',err));

onAuthStateChanged(auth,async user=>{
  currentUser=user;
  if(!user){
    authInitPromise=null; authInitUid=null;
    closeRealtime(); myProfile=null; contacts={}; clearActiveChat(); setView('auth'); switchAuthPanel('login'); return;
  }
  try{
    await refreshCurrentUser(false);
    if(!currentUser.emailVerified){
      $('verifyAddress').textContent=currentUser.email||'';
      setView('verify');
      return;
    }
    await initAuthenticatedUser(currentUser);
  }catch(err){
    console.error('SESSION INIT ERROR',err);
    closeRealtime();
    setView('auth');
    switchAuthPanel('login');
    showNotice($('authNotice'),firebaseErrorMessage(err),'error');
  }
});
$('loginForm').addEventListener('submit',handleLogin);$('registerForm').addEventListener('submit',handleRegister);$('resetForm').addEventListener('submit',handleReset);$('showRegister').addEventListener('click',()=>switchAuthPanel('register'));$('showLogin').addEventListener('click',()=>switchAuthPanel('login'));$('showReset').addEventListener('click',()=>switchAuthPanel('reset'));$('backToLogin').addEventListener('click',()=>switchAuthPanel('login'));$('verifyLogout').addEventListener('click',()=>signOut(auth));$('resendVerification').addEventListener('click',sendVerification);
$('checkVerification').addEventListener('click',async()=>{try{if(!currentUser)return;await refreshCurrentUser(false);if(currentUser.emailVerified){showNotice($('verifyNotice'),'Email terverifikasi. Membuka Arinex Chat…');await initAuthenticatedUser(currentUser)}else showNotice($('verifyNotice'),'Status belum terverifikasi. Buka tautan dari email terlebih dahulu.','error')}catch(e){console.error(e);showNotice($('verifyNotice'),firebaseErrorMessage(e),'error')}});
$('logoutButton').addEventListener('click',async()=>{setPresence(false);closeRealtime();await signOut(auth)});
$('addContactButton').addEventListener('click',()=>{$('modalBackdrop').classList.remove('hidden');$('contactEmail').value='';hideNotice($('contactModalNotice'));setTimeout(()=>$('contactEmail').focus(),30)});$('closeContactModal').addEventListener('click',()=>$('modalBackdrop').classList.add('hidden'));$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))$('modalBackdrop').classList.add('hidden')});$('contactForm').addEventListener('submit',async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;btn.textContent='Mencari…';try{const r=await addContactByEmail($('contactEmail').value);$('modalBackdrop').classList.add('hidden');showToast(`${r.displayName} berhasil ditambahkan.`)}catch(err){console.error(err);showNotice($('contactModalNotice'),err?.message||'Kontak gagal ditambahkan.','error')}finally{btn.disabled=false;btn.textContent='Cari & tambahkan →'}});
$('contactSearch').addEventListener('input',renderContacts);$('messageForm').addEventListener('submit',e=>{e.preventDefault();sendMessage()});$('backToContacts').addEventListener('click',clearActiveChat);$('emojiButton').addEventListener('click',()=>{$('messageInput').value+='🙂';$('messageInput').focus()});$('chatMenuButton').addEventListener('click',()=>showToast('Chat aktif • koneksi realtime'));

document.querySelectorAll('.reveal-btn').forEach(btn=>btn.addEventListener('click',()=>{const input=$(btn.dataset.target);input.type=input.type==='password'?'text':'password';btn.textContent=input.type==='password'?'◉':'◌'}));
$('themeButton').addEventListener('click',()=>{document.body.classList.toggle('light');localStorage.setItem('arinex-theme',document.body.classList.contains('light')?'light':'dark')});if(localStorage.getItem('arinex-theme')==='light')document.body.classList.add('light');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installButton').classList.remove('hidden')});$('installButton').addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installButton').classList.add('hidden')});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setPresence(true);else setPresence(false)});
// Best-effort UI restrictions: inputs remain usable. No browser page can reliably prevent screenshots or determined users from copying content.
document.addEventListener('contextmenu',e=>{if(!e.target.closest('input,textarea'))e.preventDefault()});document.addEventListener('selectstart',e=>{if(!e.target.closest('input,textarea,[contenteditable="true"]'))e.preventDefault()});document.addEventListener('dragstart',e=>e.preventDefault());document.addEventListener('keydown',e=>{const editable=e.target.closest('input,textarea,[contenteditable="true"]');const blocked=(e.ctrlKey||e.metaKey)&&['c','x','a','u','s','p'].includes(e.key.toLowerCase());if(!editable&&blocked){e.preventDefault();e.stopPropagation()}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('SW',e));

