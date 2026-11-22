/* Шар даних: Firebase (Auth + Firestore) або демо-режим у localStorage */
(function () {
  const C = window.APP_CONFIG;

  /* ---------- спільні допоміжні ---------- */
  const TR = { а:'a',б:'b',в:'v',г:'h',ґ:'g',д:'d',е:'e',є:'ie',ж:'zh',з:'z',и:'y',і:'i',ї:'i',й:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ь:'',ю:'iu',я:'ia','’':'',"'":'' };
  function translit(s) {
    return String(s).toLowerCase().split('').map(ch => (ch in TR ? TR[ch] : ch)).join('').replace(/[^a-z0-9]/g, '');
  }
  function makeLogin(name, cls) {
    const surname = translit(String(name).trim().split(/\s+/)[0] || 'uchen').slice(0, 10) || 'uchen';
    return cls + surname + Math.floor(10 + Math.random() * 90);
  }
  const WORDS = ['kit', 'sonce', 'lis', 'zirka', 'mak', 'dub', 'rybka', 'sova', 'kvit', 'hora', 'yizhak', 'bdzhola'];
  function makePassword() {
    return WORDS[Math.floor(Math.random() * WORDS.length)] + Math.floor(1000 + Math.random() * 9000);
  }
  function loginToEmail(login) {
    login = String(login).trim().toLowerCase();
    return login.includes('@') ? login : login + '@' + C.studentEmailDomain;
  }
  function isTeacherEmail(email) {
    return (C.teacherEmails || []).map(e => e.toLowerCase()).includes(String(email || '').toLowerCase());
  }

  const hasFirebase = !!(C.firebase && C.firebase.apiKey && window.firebase);

  /* =====================================================================
     FIREBASE
     ===================================================================== */
  function FirebaseStore() {
    const app = firebase.initializeApp(C.firebase);
    const auth = firebase.auth();
    const db = firebase.firestore();
    let secondary = null;

    return {
      mode: 'firebase',
      onAuth(cb) {
        auth.onAuthStateChanged(async (u) => {
          if (!u) return cb(null);
          if (isTeacherEmail(u.email)) {
            return cb({ uid: u.uid, role: 'teacher', name: u.displayName || 'Вчитель', email: u.email });
          }
          try {
            const snap = await db.collection('users').doc(u.uid).get();
            if (!snap.exists) { await auth.signOut(); return cb(null, 'Обліковий запис не знайдено або вимкнено. Зверніться до вчителя.'); }
            const d = snap.data();
            cb({ uid: u.uid, role: 'student', name: d.name, cls: d.cls, login: d.login });
          } catch (e) { cb(null, 'Не вдалося завантажити профіль: ' + e.message); }
        });
      },
      async signIn(login, password) {
        try { await auth.signInWithEmailAndPassword(loginToEmail(login), password); }
        catch (e) {
          if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email', 'auth/invalid-login-credentials'].includes(e.code))
            throw new Error('Неправильний логін або пароль');
          if (e.code === 'auth/too-many-requests') throw new Error('Забагато спроб. Зачекайте кілька хвилин.');
          throw new Error(e.message);
        }
      },
      signOut() { return auth.signOut(); },

      async listStudents() {
        const qs = await db.collection('users').get();
        return qs.docs.map(d => Object.assign({ uid: d.id }, d.data())).filter(s => s.role === 'student');
      },
      async createStudent(name, cls) {
        if (!secondary) secondary = firebase.initializeApp(C.firebase, 'secondary');
        for (let attempt = 0; attempt < 5; attempt++) {
          const login = makeLogin(name, cls), password = makePassword();
          try {
            const cred = await secondary.auth().createUserWithEmailAndPassword(loginToEmail(login), password);
            const uid = cred.user.uid;
            await secondary.auth().signOut();
            await db.collection('users').doc(uid).set({ role: 'student', name: name.trim(), cls: Number(cls), login, password, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            return { uid, login, password };
          } catch (e) {
            if (e.code === 'auth/email-already-in-use') continue;
            throw e;
          }
        }
        throw new Error('Не вдалося підібрати вільний логін');
      },
      async updateStudent(uid, data) { await db.collection('users').doc(uid).update(data); },
      async deleteStudent(uid) {
        const rs = await db.collection('results').where('uid', '==', uid).get();
        const batch = db.batch();
        rs.docs.forEach(d => batch.delete(d.ref));
        batch.delete(db.collection('users').doc(uid));
        await batch.commit();
      },
      async saveResult(r) {
        const u = auth.currentUser; if (!u) throw new Error('Немає входу');
        r.uid = u.uid;
        r.at = firebase.firestore.FieldValue.serverTimestamp();
        r.atMs = Date.now();
        await db.collection('results').add(r);
      },
      async myResults() {
        const u = auth.currentUser;
        const qs = await db.collection('results').where('uid', '==', u.uid).get();
        return qs.docs.map(d => d.data());
      },
      async courseResults(course) {
        const qs = await db.collection('results').where('course', '==', course).get();
        return qs.docs.map(d => Object.assign({ id: d.id }, d.data()));
      },
      async deleteResult(id) { await db.collection('results').doc(id).delete(); }
    };
  }

  /* =====================================================================
     ДЕМО (localStorage)
     ===================================================================== */
  function DemoStore() {
    const KEY = 'portal_demo_v1';
    let memory = null;
    function load() {
      if (memory) return memory;
      try { memory = JSON.parse(localStorage.getItem(KEY)); } catch (e) { memory = null; }
      if (!memory) {
        memory = {
          users: {
            t1: { role: 'teacher', name: 'Вчитель (демо)', login: 'vchytel', password: '12345' },
            s1: { role: 'student', name: 'Демо Учень', cls: 2, login: 'demo', password: '1111' }
          },
          results: [], session: null
        };
      }
      return memory;
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) { /* приватний режим */ } }
    let listener = () => {};
    function current() {
      const m = load(); const id = m.session; const u = id && m.users[id];
      if (!u) return null;
      return u.role === 'teacher' ? { uid: id, role: 'teacher', name: u.name } : { uid: id, role: 'student', name: u.name, cls: u.cls, login: u.login };
    }
    return {
      mode: 'demo',
      onAuth(cb) { listener = cb; setTimeout(() => cb(current()), 0); },
      async signIn(login, password) {
        const m = load(); login = String(login).trim().toLowerCase();
        const id = Object.keys(m.users).find(k => m.users[k].login === login && m.users[k].password === password);
        if (!id) throw new Error('Неправильний логін або пароль');
        m.session = id; save(); listener(current());
      },
      async signOut() { load().session = null; save(); listener(null); },
      async listStudents() {
        const m = load();
        return Object.keys(m.users).filter(k => m.users[k].role === 'student').map(k => Object.assign({ uid: k }, m.users[k]));
      },
      async createStudent(name, cls) {
        const m = load(); let login;
        do { login = makeLogin(name, cls); } while (Object.values(m.users).some(u => u.login === login));
        const password = makePassword(); const uid = 's' + Date.now() + Math.floor(Math.random() * 1000);
        m.users[uid] = { role: 'student', name: name.trim(), cls: Number(cls), login, password }; save();
        return { uid, login, password };
      },
      async updateStudent(uid, data) { const m = load(); Object.assign(m.users[uid], data); save(); },
      async deleteStudent(uid) { const m = load(); delete m.users[uid]; m.results = m.results.filter(r => r.uid !== uid); save(); },
      async saveResult(r) { const m = load(); r.uid = m.session; r.atMs = Date.now(); r.id = 'r' + r.atMs + Math.floor(Math.random() * 1000); m.results.push(r); save(); },
      async myResults() { const m = load(); return m.results.filter(r => r.uid === m.session); },
      async courseResults(course) { return load().results.filter(r => r.course === course); },
      async deleteResult(id) { const m = load(); m.results = m.results.filter(r => r.id !== id); save(); }
    };
  }

  /* Firebase налаштовано, але бібліотека не завантажилась (немає інтернету / блокування) */
  function BrokenStore() {
    const msg = 'Не вдалося підключитися до сервера. Перевірте інтернет і оновіть сторінку.';
    return {
      mode: 'broken',
      onAuth(cb) { setTimeout(() => cb(null, msg), 0); },
      async signIn() { throw new Error(msg); },
      async signOut() {}
    };
  }

  const configured = !!(C.firebase && C.firebase.apiKey);
  window.Store = hasFirebase ? FirebaseStore() : configured ? BrokenStore() : DemoStore();
})();
