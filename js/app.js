import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut,
    reload,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    get,
    set,
    update,
    push,
    onValue,
    off,
    onDisconnect,
    serverTimestamp,
    goOnline
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";


/* =========================================================
   FIREBASE
   ========================================================= */

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

const persistenceReady =
    setPersistence(
        auth,
        browserLocalPersistence
    );


/* =========================================================
   HELPERS
   ========================================================= */

const $ = id =>
    document.getElementById(id);


let currentUser = null;
let myProfile = null;
let contacts = {};
let activeUid = null;
let activeChatId = null;

let contactsUnsub = null;
let messagesUnsub = null;
let presenceDisconnect = null;

let toastTimer = null;
let verifyCooldownUntil = 0;
let authBusy = false;


const views = {
    auth: $('authView'),
    verify: $('verifyView'),
    chat: $('chatView')
};


const normalizeEmail = value =>
    String(value ?? '')
        .trim()
        .toLowerCase();


const safeText = (
    value,
    max = 4000
) =>
    String(value ?? '')
        .trim()
        .slice(0, max);


const isEmail = value =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(normalizeEmail(value));


const isStrongPassword = value =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/
        .test(value);


/* =========================================================
   THEME SYSTEM
   ========================================================= */

const THEME_KEY = 'arinex_theme';


function getTheme() {

    const saved =
        localStorage.getItem(THEME_KEY);

    if (
        saved === 'dark' ||
        saved === 'light'
    ) {
        return saved;
    }

    return 'light';
}


function applyTheme(theme) {

    const selected =
        theme === 'dark'
            ? 'dark'
            : 'light';

    document.documentElement
        .setAttribute(
            'data-theme',
            selected
        );

    document.body?.setAttribute(
        'data-theme',
        selected
    );

    localStorage.setItem(
        THEME_KEY,
        selected
    );

    updateThemeMenu(selected);

    return selected;
}


function toggleTheme() {

    const current =
        getTheme();

    const next =
        current === 'dark'
            ? 'light'
            : 'dark';

    applyTheme(next);

    toast(
        next === 'dark'
            ? 'Mode gelap aktif.'
            : 'Mode terang aktif.'
    );
}


function updateThemeMenu(theme) {

    const menu =
        $('menuTheme');

    if (!menu) return;

    const span =
        menu.querySelector('span');

    if (!span) return;

    span.textContent =
        theme === 'dark'
            ? 'Mode terang'
            : 'Mode gelap';

    menu.firstChild.textContent =
        theme === 'dark'
            ? '☀ '
            : '☾ ';
}


/*
   Terapkan tema saat JS selesai dimuat.
   index.html juga sudah menerapkannya sebelum CSS
   sehingga perpindahan tema tidak berkedip.
*/

applyTheme(getTheme());


/*
   Jika localStorage berubah dari tab/window lain,
   halaman ini ikut berubah.
*/

window.addEventListener(
    'storage',
    event => {

        if (event.key !== THEME_KEY) return;

        applyTheme(
            event.newValue === 'dark'
                ? 'dark'
                : 'light'
        );

    }
);


/* =========================================================
   VIEW
   ========================================================= */

function setView(name) {

    Object
        .values(views)
        .forEach(view =>
            view?.classList.add('hidden')
        );

    views[name]
        ?.classList.remove('hidden');
}


/* =========================================================
   NOTICE
   ========================================================= */

function notice(
    el,
    msg,
    type = 'info'
) {

    if (!el) return;

    el.textContent = msg;

    el.classList.remove(
        'hidden',
        'error'
    );

    if (type === 'error') {
        el.classList.add('error');
    }
}


function clearNotice(el) {

    el?.classList.add('hidden');

}


/* =========================================================
   TOAST
   ========================================================= */

function toast(msg) {

    const el =
        $('toast');

    if (!el) return;

    el.textContent =
        msg;

    el.classList.add('show');

    clearTimeout(
        toastTimer
    );

    toastTimer =
        setTimeout(
            () =>
                el.classList.remove('show'),
            2800
        );
}


/* =========================================================
   FIREBASE MESSAGE
   ========================================================= */

function firebaseMessage(e) {

    const code =
        e?.code || '';

    const map = {

        'auth/invalid-credential':
            'Email atau password salah.',

        'auth/invalid-email':
            'Format email tidak valid.',

        'auth/email-already-in-use':
            'Email sudah terdaftar.',

        'auth/weak-password':
            'Password terlalu lemah.',

        'auth/too-many-requests':
            'Terlalu banyak percobaan. Tunggu beberapa saat.',

        'auth/network-request-failed':
            'Jaringan bermasalah.',

        'auth/user-not-found':
            'Akun tidak ditemukan.',

        'auth/wrong-password':
            'Email atau password salah.',

        'auth/user-disabled':
            'Akun ini telah dinonaktifkan.',

        'auth/expired-action-code':
            'Tautan sudah kedaluwarsa.',

        'auth/invalid-action-code':
            'Tautan tidak valid atau sudah digunakan.'
    };

    return (
        map[code] ||
        e?.message ||
        'Terjadi kesalahan jaringan/sistem.'
    );
}


/* =========================================================
   WAIT FOR
   ========================================================= */

async function waitFor(
    promise,
    ms = 15000
) {

    let timer;

    const timeout =
        new Promise(
            (_, reject) => {

                timer =
                    setTimeout(
                        () =>
                            reject(
                                new Error(
                                    'Waktu koneksi habis. Coba lagi.'
                                )
                            ),
                        ms
                    );

            }
        );

    try {

        return await Promise.race([
            promise,
            timeout
        ]);

    } finally {

        clearTimeout(timer);

    }
}


/* =========================================================
   REFRESH USER
   ========================================================= */

async function refreshUser(
    forceVerified = false
) {

    if (!auth.currentUser) {
        throw new Error(
            'Sesi tidak ditemukan.'
        );
    }

    await reload(
        auth.currentUser
    );

    await auth.currentUser
        .getIdToken(true);

    currentUser =
        auth.currentUser;

    if (
        forceVerified &&
        !currentUser.emailVerified
    ) {
        throw new Error(
            'Email belum terverifikasi.'
        );
    }

    return currentUser;
}


/* =========================================================
   RENDER USER
   ========================================================= */

function renderMe() {

    const name =
        safeText(
            myProfile?.displayName,
            40
        ) ||

        safeText(
            currentUser?.displayName,
            40
        ) ||

        normalizeEmail(
            currentUser?.email
        ).split('@')[0] ||

        'Pengguna';


    const email =
        currentUser?.email || '';


    [
        'myName',
        'menuName'
    ].forEach(id => {

        if ($(id)) {
            $(id).textContent =
                name;
        }

    });


    [
        'myEmail',
        'menuEmail'
    ].forEach(id => {

        if ($(id)) {
            $(id).textContent =
                email;
        }

    });


    return name;
}


/* =========================================================
   PROFILE
   ========================================================= */

async function sha256Hex(value) {

    const bytes =
        new TextEncoder()
            .encode(value);

    const digest =
        await crypto.subtle.digest(
            'SHA-256',
            bytes
        );

    return Array
        .from(
            new Uint8Array(digest)
        )
        .map(
            x =>
                x.toString(16)
                    .padStart(2, '0')
        )
        .join('');
}


async function ensureProfile(user) {

    await refreshUser(true);

    const email =
        normalizeEmail(user.email);

    const hash =
        await sha256Hex(email);


    const uref =
        ref(
            db,
            `users/${user.uid}`
        );

    const pref =
        ref(
            db,
            `publicProfiles/${user.uid}`
        );

    const iref =
        ref(
            db,
            `emailIndex/${hash}`
        );


    const [
        us,
        ps,
        is
    ] =
        await Promise.all([

            waitFor(get(uref)),

            waitFor(get(pref)),

            waitFor(get(iref))

        ]);


    const old =
        us.exists()
            ? us.val()
            : {};


    const name =
        safeText(
            user.displayName,
            40
        ) ||

        safeText(
            old.displayName,
            40
        ) ||

        email.split('@')[0] ||

        'Pengguna';


    const now =
        Date.now();


    const updates = {};


    if (!us.exists()) {

        updates[
            `users/${user.uid}`
        ] = {

            displayName: name,

            createdAt: now,

            updatedAt: now

        };

    } else {

        if (
            old.displayName !== name
        ) {

            updates[
                `users/${user.uid}/displayName`
            ] = name;

        }

        updates[
            `users/${user.uid}/updatedAt`
        ] = now;

    }


    if (
        !ps.exists() ||
        ps.val()?.displayName !== name
    ) {

        updates[
            `publicProfiles/${user.uid}`
        ] = {

            displayName: name,

            updatedAt: now

        };

    }


    if (!is.exists()) {

        updates[
            `emailIndex/${hash}`
        ] = user.uid;

    }


    if (
        Object.keys(updates).length
    ) {

        await waitFor(
            update(
                ref(db),
                updates
            )
        );

    }


    myProfile = {

        ...(us.exists()
            ? old
            : {}),

        displayName: name,

        updatedAt: now,

        createdAt:
            old.createdAt || now

    };


    renderMe();

}


/* =========================================================
   AUTH PANEL
   ========================================================= */

function switchAuth(panel) {

    $('loginPanel')
        ?.classList
        .toggle(
            'hidden',
            panel !== 'login'
        );


    $('registerPanel')
        ?.classList
        .toggle(
            'hidden',
            panel !== 'register'
        );


    $('resetPanel')
        ?.classList
        .toggle(
            'hidden',
            panel !== 'reset'
        );


    clearNotice(
        $('authNotice')
    );

}


/* =========================================================
   VERIFICATION
   ========================================================= */

function actionCodeSettings() {

    return {

        url:
            window.location.origin +
            window.location.pathname,

        handleCodeInApp:
            false

    };

}


async function sendVerification() {

    if (!currentUser) return;


    const remain =
        verifyCooldownUntil -
        Date.now();


    if (remain > 0) {

        notice(
            $('verifyNotice'),
            `Tunggu ${Math.ceil(remain / 1000)} detik.`,
            'error'
        );

        return;
    }


    try {

        await sendEmailVerification(
            currentUser,
            actionCodeSettings()
        );


        verifyCooldownUntil =
            Date.now() + 60000;


        notice(
            $('verifyNotice'),
            'Email verifikasi dikirim. Periksa Inbox/Spam.'
        );

    } catch (e) {

        notice(
            $('verifyNotice'),
            firebaseMessage(e),
            'error'
        );

    }

}


/* =========================================================
   CHAT ID
   ========================================================= */

function chatIdFor(a, b) {

    return [
        a,
        b
    ]
        .sort()
        .join('__');

}


function formatTime(ts) {

    return new Intl.DateTimeFormat(
        'id-ID',
        {
            hour: '2-digit',
            minute: '2-digit'
        }
    )
        .format(
            new Date(
                Number(ts) ||
                Date.now()
            )
        );

}


/* =========================================================
   MENU
   ========================================================= */

function closeMenu() {

    const menu =
        $('accountMenu');

    if (!menu) return;

    menu.classList.add(
        'hidden'
    );

    menu.setAttribute(
        'aria-hidden',
        'true'
    );

}


function toggleMenu() {

    const menu =
        $('accountMenu');

    if (!menu) return;

    const hidden =
        menu.classList.toggle(
            'hidden'
        );


    menu.setAttribute(
        'aria-hidden',
        String(hidden)
    );


    renderMe();

    updateThemeMenu(
        getTheme()
    );

}


/* =========================================================
   CONTACTS
   ========================================================= */

function renderContacts() {

    const term =
        normalizeEmail(
            $('contactSearch')?.value
        );


    const list =
        $('contactList');

    if (!list) return;


    list.innerHTML = '';


    const arr =
        Object
            .entries(contacts)
            .map(
                ([uid, value]) => ({
                    uid,
                    ...value
                })
            )
            .filter(
                contact =>
                    !term ||

                    normalizeEmail(
                        contact.email
                    ).includes(term) ||

                    String(
                        contact.displayName || ''
                    )
                        .toLowerCase()
                        .includes(term)
            );


    $('emptyContacts')
        ?.classList
        .toggle(
            'hidden',
            arr.length > 0
        );


    for (const contact of arr) {

        const button =
            document.createElement(
                'button'
            );

        button.className =
            `contact-item ${
                contact.uid === activeUid
                    ? 'active'
                    : ''
            }`;

        button.type =
            'button';


        const img =
            document.createElement(
                'img'
            );

        img.src =
            'img/puki.png';

        img.alt =
            '';


        const copy =
            document.createElement(
                'div'
            );

        copy.className =
            'contact-copy';


        const strong =
            document.createElement(
                'strong'
            );

        strong.textContent =
            contact.displayName ||
            'Pengguna';


        const span =
            document.createElement(
                'span'
            );

        span.textContent =
            contact.email ||
            'Kontak';


        copy.append(
            strong,
            span
        );


        button.append(
            img,
            copy
        );


        button.addEventListener(
            'click',
            () =>
                openConversation(
                    contact.uid
                )
        );


        list.appendChild(
            button
        );

    }

}


/* =========================================================
   LISTEN CONTACTS
   ========================================================= */

function listenContacts() {

    if (
        contactsUnsub &&
        currentUser?.uid
    ) {

        off(
            ref(
                db,
                `contacts/${currentUser.uid}`
            ),
            'value',
            contactsUnsub
        );

    }


    const contactRef =
        ref(
            db,
            `contacts/${currentUser.uid}`
        );


    contactsUnsub =
        onValue(
            contactRef,
            snapshot => {

                contacts =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};


                renderContacts();

            },
            error => {

                console.error(error);

                toast(
                    'Kontak tidak dapat dimuat.'
                );

            }
        );

}


/* =========================================================
   CHAT
   ========================================================= */

async function ensureChat(peerUid) {

    const id =
        chatIdFor(
            currentUser.uid,
            peerUid
        );


    const chatRef =
        ref(
            db,
            `chats/${id}`
        );


    const snapshot =
        await get(chatRef);


    if (
        snapshot.exists()
    ) {
        return id;
    }


    await set(
        chatRef,
        {

            type: 'direct',

            createdAt: Date.now(),

            participants: {

                [currentUser.uid]:
                    true,

                [peerUid]:
                    true

            }

        }
    );


    return id;
}


/* =========================================================
   ADD CONTACT
   ========================================================= */

async function addContactByEmail(
    value
) {

    goOnline(db);

    await refreshUser(true);


    const email =
        normalizeEmail(value);


    if (!isEmail(email)) {

        throw new Error(
            'Masukkan email yang valid.'
        );

    }


    if (
        email ===
        normalizeEmail(
            currentUser.email
        )
    ) {

        throw new Error(
            'Tidak dapat menambahkan diri sendiri.'
        );

    }


    const hash =
        await sha256Hex(email);


    const indexSnapshot =
        await waitFor(
            get(
                ref(
                    db,
                    `emailIndex/${hash}`
                )
            )
        );


    if (
        !indexSnapshot.exists()
    ) {

        throw new Error(
            'Kontak tidak ditemukan. Pastikan akun tersebut sudah terdaftar.'
        );

    }


    const uid =
        String(
            indexSnapshot.val()
        );


    if (
        !uid ||
        uid === currentUser.uid
    ) {

        throw new Error(
            'Kontak tidak valid.'
        );

    }


    const profileSnapshot =
        await waitFor(
            get(
                ref(
                    db,
                    `publicProfiles/${uid}`
                )
            )
        );


    if (
        !profileSnapshot.exists()
    ) {

        throw new Error(
            'Profil belum siap. Minta pengguna tersebut login kembali.'
        );

    }


    const data = {

        displayName:
            safeText(
                profileSnapshot.val()
                    ?.displayName,
                40
            ) ||
            'Pengguna',

        email,

        addedAt:
            Date.now()

    };


    await waitFor(
        set(
            ref(
                db,
                `contacts/${currentUser.uid}/${uid}`
            ),
            data
        )
    );


    await ensureChat(uid);


    return {
        uid,
        ...data
    };

}


/* =========================================================
   OPEN CONVERSATION
   ========================================================= */

async function openConversation(
    uid
) {

    const contact =
        contacts[uid];


    if (!contact) return;


    activeUid =
        uid;


    activeChatId =
        chatIdFor(
            currentUser.uid,
            uid
        );


    if ($('peerName')) {

        $('peerName').textContent =
            contact.displayName ||
            'Pengguna';

    }


    if ($('peerStatus')) {

        $('peerStatus').textContent =
            contact.email ||
            'Email terverifikasi';

    }


    $('welcomeConversation')
        ?.classList
        .add('hidden');


    $('activeConversation')
        ?.classList
        .remove('hidden');


    views.chat
        ?.classList
        .add('mobile-open');


    renderContacts();

    listenMessages();

}


/* =========================================================
   LISTEN MESSAGES
   ========================================================= */

function listenMessages() {

    if (
        messagesUnsub &&
        activeChatId
    ) {

        off(
            ref(
                db,
                `chats/${activeChatId}/messages`
            ),
            'value',
            messagesUnsub
        );

    }


    const messageRef =
        ref(
            db,
            `chats/${activeChatId}/messages`
        );


    messagesUnsub =
        onValue(
            messageRef,
            snapshot => {

                const list =
                    $('messageList');

                if (!list) return;


                list.innerHTML = '';


                const data =
                    snapshot.exists()
                        ? snapshot.val()
                        : {};


                const messages =
                    Object
                        .entries(data)
                        .map(
                            ([id, message]) => ({
                                id,
                                ...message
                            })
                        )
                        .sort(
                            (a, b) =>
                                (a.createdAt || 0) -
                                (b.createdAt || 0)
                        );


                for (
                    const message
                    of messages
                ) {

                    const row =
                        document.createElement(
                            'div'
                        );


                    row.className =
                        `message-row ${
                            message.senderId ===
                            currentUser.uid
                                ? 'mine'
                                : ''
                        }`;


                    const bubble =
                        document.createElement(
                            'div'
                        );

                    bubble.className =
                        'message-bubble';


                    const text =
                        document.createElement(
                            'div'
                        );

                    text.className =
                        'message-text';


                    text.textContent =
                        message.text ||
                        '';


                    const meta =
                        document.createElement(
                            'div'
                        );

                    meta.className =
                        'message-meta';


                    meta.textContent =
                        formatTime(
                            message.createdAt
                        );


                    bubble.append(
                        text,
                        meta
                    );


                    row.appendChild(
                        bubble
                    );


                    list.appendChild(
                        row
                    );

                }


                requestAnimationFrame(
                    () => {

                        list.scrollTop =
                            list.scrollHeight;

                    }
                );

            }
        );

}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

    const input =
        $('messageInput');


    const text =
        safeText(
            input?.value,
            4000
        );


    if (
        !text ||
        !activeChatId ||
        !currentUser
    ) {
        return;
    }


    const old =
        input.value;


    input.value =
        '';


    try {

        const messageRef =
            push(
                ref(
                    db,
                    `chats/${activeChatId}/messages`
                )
            );


        await waitFor(
            set(
                messageRef,
                {

                    senderId:
                        currentUser.uid,

                    text,

                    createdAt:
                        serverTimestamp()

                }
            )
        );

    } catch (e) {

        input.value =
            old;

        console.error(e);

        toast(
            'Pesan gagal dikirim.'
        );

    }

}


/* =========================================================
   CLEAR ACTIVE CHAT
   ========================================================= */

function clearActive() {

    if (
        messagesUnsub &&
        activeChatId
    ) {

        off(
            ref(
                db,
                `chats/${activeChatId}/messages`
            ),
            'value',
            messagesUnsub
        );

    }


    messagesUnsub =
        null;

    activeUid =
        null;

    activeChatId =
        null;


    views.chat
        ?.classList
        .remove('mobile-open');


    $('activeConversation')
        ?.classList
        .add('hidden');


    $('welcomeConversation')
        ?.classList
        .remove('hidden');


    if ($('messageList')) {

        $('messageList').innerHTML =
            '';

    }


    renderContacts();

}


/* =========================================================
   PRESENCE
   ========================================================= */

function setPresence(
    online
) {

    if (
        !currentUser?.emailVerified
    ) {
        return;
    }


    const presenceRef =
        ref(
            db,
            `presence/${currentUser.uid}`
        );


    if (online) {

        set(
            presenceRef,
            {

                online: true,

                lastSeen:
                    serverTimestamp()

            }
        )
        .catch(() => {});


        presenceDisconnect
            ?.cancel?.();


        presenceDisconnect =
            onDisconnect(
                presenceRef
            );


        presenceDisconnect
            .set({

                online: false,

                lastSeen:
                    serverTimestamp()

            })
            .catch(() => {});


    } else {

        set(
            presenceRef,
            {

                online: false,

                lastSeen:
                    serverTimestamp()

            }
        )
        .catch(() => {});

    }

}


/* =========================================================
   CLEANUP
   ========================================================= */

function cleanup() {

    if (
        contactsUnsub &&
        currentUser?.uid
    ) {

        off(
            ref(
                db,
                `contacts/${currentUser.uid}`
            ),
            'value',
            contactsUnsub
        );

    }


    if (
        messagesUnsub &&
        activeChatId
    ) {

        off(
            ref(
                db,
                `chats/${activeChatId}/messages`
            ),
            'value',
            messagesUnsub
        );

    }


    contactsUnsub =
        null;

    messagesUnsub =
        null;


    presenceDisconnect
        ?.cancel?.();


    presenceDisconnect =
        null;

}


/* =========================================================
   INITIALIZE CHAT
   ========================================================= */

async function initializeChat(
    user
) {

    if (
        !user.emailVerified
    ) {

        throw new Error(
            'Email belum terverifikasi.'
        );

    }


    await ensureProfile(user);


    setView('chat');


    listenContacts();


    setPresence(true);

}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

    closeMenu();

    setPresence(false);

    cleanup();


    try {

        await signOut(auth);

    } catch (e) {

        toast(
            'Gagal keluar. Coba lagi.'
        );

    }

}


/* =========================================================
   LOGIN
   ========================================================= */

$('loginForm')
    ?.addEventListener(
        'submit',
        async e => {

            e.preventDefault();


            if (authBusy) return;


            const email =
                normalizeEmail(
                    $('loginEmail').value
                );


            const pass =
                $('loginPassword').value;


            if (
                !isEmail(email) ||
                !pass
            ) {

                return notice(
                    $('authNotice'),
                    'Email dan password tidak valid.',
                    'error'
                );

            }


            authBusy =
                true;


            const button =
                e.submitter;


            button.disabled =
                true;


            button.textContent =
                'Memeriksa…';


            try {

                const credential =
                    await waitFor(
                        signInWithEmailAndPassword(
                            auth,
                            email,
                            pass
                        ),
                        15000
                    );


                currentUser =
                    credential.user;


                await refreshUser(false);


                if (
                    !currentUser.emailVerified
                ) {

                    $('verifyAddress')
                        .textContent =
                        currentUser.email;


                    setView('verify');


                    notice(
                        $('verifyNotice'),
                        'Login berhasil. Verifikasi email Anda.',
                        'error'
                    );


                    return;
                }


                await waitFor(
                    initializeChat(
                        currentUser
                    ),
                    15000
                );


                $('loginForm')
                    .reset();


            } catch (err) {

                notice(
                    $('authNotice'),
                    firebaseMessage(err),
                    'error'
                );

            } finally {

                authBusy =
                    false;

                button.disabled =
                    false;

                button.textContent =
                    'Masuk';

            }

        }
    );


/* =========================================================
   REGISTER
   ========================================================= */

$('registerForm')
    ?.addEventListener(
        'submit',
        async e => {

            e.preventDefault();


            if (authBusy) return;


            const name =
                safeText(
                    $('registerName').value,
                    40
                );


            const email =
                normalizeEmail(
                    $('registerEmail').value
                );


            const password =
                $('registerPassword').value;


            const password2 =
                $('registerPassword2').value;


            if (
                !name ||
                !isEmail(email)
            ) {

                return notice(
                    $('authNotice'),
                    'Nama dan email wajib diisi.',
                    'error'
                );

            }


            if (
                !isStrongPassword(password)
            ) {

                return notice(
                    $('authNotice'),
                    'Password terlalu lemah.',
                    'error'
                );

            }


            if (
                password !== password2
            ) {

                return notice(
                    $('authNotice'),
                    'Konfirmasi password tidak sama.',
                    'error'
                );

            }


            authBusy =
                true;


            const button =
                e.submitter;


            button.disabled =
                true;


            button.textContent =
                'Membuat…';


            try {

                const credential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                await updateProfile(
                    credential.user,
                    {
                        displayName: name
                    }
                );


                currentUser =
                    credential.user;


                await sendEmailVerification(
                    currentUser,
                    actionCodeSettings()
                );


                $('registerForm')
                    .reset();


                $('verifyAddress')
                    .textContent =
                    email;


                setView('verify');


                notice(
                    $('verifyNotice'),
                    'Akun dibuat. Silakan verifikasi email Anda.'
                );


            } catch (err) {

                notice(
                    $('authNotice'),
                    firebaseMessage(err),
                    'error'
                );

            } finally {

                authBusy =
                    false;

                button.disabled =
                    false;

                button.textContent =
                    'Daftar';

            }

        }
    );


/* =========================================================
   RESET PASSWORD
   ========================================================= */

$('resetForm')
    ?.addEventListener(
        'submit',
        async e => {

            e.preventDefault();


            const email =
                normalizeEmail(
                    $('resetEmail').value
                );


            if (!isEmail(email)) {

                return notice(
                    $('authNotice'),
                    'Email tidak valid.',
                    'error'
                );

            }


            const button =
                e.submitter;


            button.disabled =
                true;


            button.textContent =
                'Mengirim…';


            try {

                await sendPasswordResetEmail(
                    auth,
                    email,
                    actionCodeSettings()
                );


                notice(
                    $('authNotice'),
                    'Tautan reset dikirim.'
                );


                $('resetForm')
                    .reset();


            } catch (err) {

                notice(
                    $('authNotice'),
                    firebaseMessage(err),
                    'error'
                );

            } finally {

                button.disabled =
                    false;

                button.textContent =
                    'Kirim tautan';

            }

        }
    );


/* =========================================================
   AUTH NAVIGATION
   ========================================================= */

$('showRegister')
    ?.addEventListener(
        'click',
        () =>
            switchAuth('register')
    );


$('showLogin')
    ?.addEventListener(
        'click',
        () =>
            switchAuth('login')
    );


$('showReset')
    ?.addEventListener(
        'click',
        () =>
            switchAuth('reset')
    );


$('backToLogin')
    ?.addEventListener(
        'click',
        () =>
            switchAuth('login')
    );


/* =========================================================
   NAVIGASI PESAN
   ========================================================= */

$('navMessage')
    ?.addEventListener(
        'click',
        () => {

            switchAuth('login');

            $('navMessage')
                ?.classList
                .add('active');

            $('navInfo')
                ?.classList
                .remove('active');

        }
    );


/* =========================================================
   NAVIGASI INFO
   ========================================================= */

$('navInfo')
    ?.addEventListener(
        'click',
        () => {

            window.location.href =
                'info.html';

        }
    );


/* =========================================================
   VERIFICATION EVENTS
   ========================================================= */

$('resendVerification')
    ?.addEventListener(
        'click',
        sendVerification
    );


$('verifyLogout')
    ?.addEventListener(
        'click',
        logout
    );


$('checkVerification')
    ?.addEventListener(
        'click',
        async () => {

            try {

                await refreshUser(false);


                if (
                    !currentUser.emailVerified
                ) {

                    return notice(
                        $('verifyNotice'),
                        'Belum terverifikasi. Cek email Anda.',
                        'error'
                    );

                }


                await initializeChat(
                    currentUser
                );


            } catch (e) {

                notice(
                    $('verifyNotice'),
                    firebaseMessage(e),
                    'error'
                );

            }

        }
    );


/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(
    auth,
    async user => {

        await persistenceReady
            .catch(() => {});


        currentUser =
            user;


        if (!user) {

            cleanup();

            myProfile =
                null;

            contacts =
                {};

            clearActive();

            setView('auth');

            switchAuth('login');

            return;

        }


        try {

            await refreshUser(false);


            if (
                !currentUser.emailVerified
            ) {

                $('verifyAddress')
                    .textContent =
                    currentUser.email || '';


                setView('verify');

                return;

            }


            await initializeChat(
                currentUser
            );


        } catch (e) {

            cleanup();

            setView('auth');

            switchAuth('login');


            notice(
                $('authNotice'),
                firebaseMessage(e),
                'error'
            );

        }

    }
);


/* =========================================================
   ACCOUNT MENU
   ========================================================= */

$('accountButton')
    ?.addEventListener(
        'click',
        e => {

            e.stopPropagation();

            toggleMenu();

        }
    );


$('accountMenu')
    ?.addEventListener(
        'click',
        e =>
            e.stopPropagation()
    );


document.addEventListener(
    'click',
    closeMenu
);


/* =========================================================
   THEME BUTTON
   ========================================================= */

$('menuTheme')
    ?.addEventListener(
        'click',
        () => {

            toggleTheme();

            closeMenu();

        }
    );


/* =========================================================
   LOGOUT
   ========================================================= */

$('menuLogout')
    ?.addEventListener(
        'click',
        logout
    );


/* =========================================================
   NEW CHAT
   ========================================================= */

$('newChatButton')
    ?.addEventListener(
        'click',
        () => {

            $('modalBackdrop')
                ?.classList
                .remove('hidden');


            if ($('contactEmail')) {

                $('contactEmail').value =
                    '';

            }


            clearNotice(
                $('contactModalNotice')
            );


            setTimeout(
                () =>
                    $('contactEmail')
                        ?.focus(),
                30
            );

        }
    );


$('addContactButton')
    ?.addEventListener(
        'click',
        () =>
            $('newChatButton')
                ?.click()
    );


$('emptyAddButton')
    ?.addEventListener(
        'click',
        () =>
            $('newChatButton')
                ?.click()
    );


/* =========================================================
   CLOSE MODAL
   ========================================================= */

$('closeContactModal')
    ?.addEventListener(
        'click',
        () =>
            $('modalBackdrop')
                ?.classList
                .add('hidden')
    );


$('modalBackdrop')
    ?.addEventListener(
        'click',
        e => {

            if (
                e.target ===
                $('modalBackdrop')
            ) {

                $('modalBackdrop')
                    .classList
                    .add('hidden');

            }

        }
    );


/* =========================================================
   ADD CONTACT FORM
   ========================================================= */

$('contactForm')
    ?.addEventListener(
        'submit',
        async e => {

            e.preventDefault();


            const button =
                e.submitter;


            button.disabled =
                true;


            button.textContent =
                'Mencari…';


            try {

                const result =
                    await addContactByEmail(
                        $('contactEmail').value
                    );


                $('modalBackdrop')
                    ?.classList
                    .add('hidden');


                toast(
                    `${result.displayName} ditambahkan.`
                );


                await openConversation(
                    result.uid
                );


            } catch (err) {

                notice(
                    $('contactModalNotice'),
                    err?.message ||
                    firebaseMessage(err),
                    'error'
                );


            } finally {

                button.disabled =
                    false;

                button.textContent =
                    'Cari & Mulai';

            }

        }
    );


/* =========================================================
   CONTACT SEARCH
   ========================================================= */

$('contactSearch')
    ?.addEventListener(
        'input',
        renderContacts
    );


/* =========================================================
   MESSAGE FORM
   ========================================================= */

$('messageForm')
    ?.addEventListener(
        'submit',
        e => {

            e.preventDefault();

            sendMessage();

        }
    );


/* =========================================================
   BACK TO CONTACTS
   ========================================================= */

$('backToContacts')
    ?.addEventListener(
        'click',
        clearActive
    );


/* =========================================================
   EMOJI
   ========================================================= */

$('emojiButton')
    ?.addEventListener(
        'click',
        () => {

            const input =
                $('messageInput');

            if (!input) return;


            input.value +=
                '😊';


            input.focus();

        }
    );


/* =========================================================
   CHAT MENU
   ========================================================= */

$('chatMenuButton')
    ?.addEventListener(
        'click',
        () =>
            toast(
                'Info chat belum tersedia'
            )
    );


/* =========================================================
   PASSWORD SHOW / HIDE
   ========================================================= */

document
    .querySelectorAll('.eye')
    .forEach(
        button => {

            button.addEventListener(
                'click',
                () => {

                    const input =
                        $(
                            button.dataset.target
                        );


                    if (!input) return;


                    input.type =
                        input.type ===
                        'password'
                            ? 'text'
                            : 'password';

                }
            );

        }
    );


/* =========================================================
   PRESENCE
   ========================================================= */

document.addEventListener(
    'visibilitychange',
    () =>
        setPresence(
            document.visibilityState ===
            'visible'
        )
);


window.addEventListener(
    'beforeunload',
    () =>
        setPresence(false)
);
