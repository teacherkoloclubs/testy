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
  /* Адміністратор — пошта з config.adminEmails (або давнього teacherEmails) */
  function isAdminEmail(email) {
    return (C.adminEmails || C.teacherEmails || []).map(e => e.toLowerCase()).includes(String(email || '').toLowerCase());
  }
  function makeTeacherPassword() {
    const a = 'abcdefghjkmnpqrstuvwxyz', d = '23456789';
    let p = ''; for (let i = 0; i < 6; i++) p += a[Math.floor(Math.random() * a.length)];
    for (let i = 0; i < 4; i++) p += d[Math.floor(Math.random() * d.length)];
    return p;
  }
  const authError = e => {
    const m = { 'auth/email-already-in-use': 'Ця пошта вже зареєстрована на сайті.', 'auth/invalid-email': 'Неправильна адреса пошти.',
      'auth/weak-password': 'Пароль занадто простий (мінімум 6 символів).', 'auth/wrong-password': 'Неправильний поточний пароль.',
      'auth/invalid-credential': 'Неправильний поточний пароль.', 'auth/invalid-login-credentials': 'Неправильний поточний пароль.',
      'auth/too-many-requests': 'Забагато спроб. Зачекайте кілька хвилин.', 'auth/user-not-found': 'Користувача з такою поштою не знайдено.' };
    return new Error(m[e.code] || e.message);
  };

  const hasFirebase = !!(C.firebase && C.firebase.apiKey && window.firebase);

  /* =====================================================================
     FIREBASE
     ===================================================================== */
  function FirebaseStore() {
    const app = firebase.initializeApp(C.firebase);
    const auth = firebase.auth();
    const db = firebase.firestore();
    let secondary = null;
    let me = null;            // профіль користувача, що увійшов
    let registering = false;  // під час самореєстрації вчителя профіль ще не створено
    let authCb = null;
    const sec = () => (secondary = secondary || firebase.initializeApp(C.firebase, 'secondary'));

    async function resolve(u) {
      if (!u) { me = null; return authCb(null); }
      if (isAdminEmail(u.email)) {
        me = { uid: u.uid, role: 'admin', name: u.displayName || 'Адміністратор', email: u.email };
        return authCb(me);
      }
      try {
        const snap = await db.collection('users').doc(u.uid).get();
        if (!snap.exists) { await auth.signOut(); return authCb(null, 'Обліковий запис не знайдено або вимкнено. Зверніться до вчителя.'); }
        const d = snap.data();
        if (d.role === 'teacher') {
          if (d.disabled) { await auth.signOut(); return authCb(null, 'Доступ вчителя вимкнено. Зверніться до адміністратора.'); }
          me = d.pending
            ? { uid: u.uid, role: 'pending', name: d.name, email: d.email }
            : { uid: u.uid, role: 'teacher', name: d.name, email: d.email, subjects: d.subjects || [], classes: (d.classes || []).map(Number), schedName: d.schedName || '' };
          return authCb(me);
        }
        me = { uid: u.uid, role: 'student', name: d.name, cls: d.cls, login: d.login };
        authCb(me);
      } catch (e) { authCb(null, 'Не вдалося завантажити профіль: ' + e.message); }
    }

    return {
      mode: 'firebase',
      onAuth(cb) {
        authCb = cb;
        auth.onAuthStateChanged(u => { if (!registering) resolve(u); });
      },
      /* Самостійна реєстрація вчителя: заявка, яку підтверджує адміністратор */
      async registerTeacher(f) {
        registering = true;
        try {
          const cred = await auth.createUserWithEmailAndPassword(String(f.email).trim(), f.password);
          await db.collection('users').doc(cred.user.uid).set({
            role: 'teacher', pending: true, name: String(f.name).trim(), email: cred.user.email,
            subjects: [], classes: [], requested: f.requested || [], note: String(f.note || '').slice(0, 300),
            createdAt: firebase.firestore.FieldValue.serverTimestamp() });
          registering = false;
          await resolve(cred.user);
        } catch (e) {
          registering = false;
          /* обліковий запис створено, а профіль — ні: прибираємо, щоб можна було спробувати ще раз */
          if (auth.currentUser) { try { await auth.currentUser.delete(); } catch (x) { await auth.signOut(); } }
          throw e.code ? authError(e) : e;
        }
      },
      async sendReset(email) {
        try { await auth.sendPasswordResetEmail(String(email).trim()); } catch (e) { throw authError(e); }
      },
      async changePassword(oldPw, newPw) {
        const u = auth.currentUser;
        try {
          await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, oldPw));
          await u.updatePassword(newPw);
        } catch (e) { throw authError(e); }
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
        let docs;
        if (me && me.role === 'teacher') {
          /* вчитель бачить лише учнів своїх класів */
          docs = [];
          const cl = me.classes.slice();
          for (let i = 0; i < cl.length; i += 30) {
            const qs = await db.collection('users').where('cls', 'in', cl.slice(i, i + 30)).get();
            docs = docs.concat(qs.docs);
          }
        } else docs = (await db.collection('users').get()).docs;
        return docs.map(d => Object.assign({ uid: d.id }, d.data())).filter(s => s.role === 'student');
      },
      async listTeachers() {
        const qs = await db.collection('users').where('role', '==', 'teacher').get();
        return qs.docs.map(d => Object.assign({ uid: d.id }, d.data()));
      },
      async createTeacher(f) {
        const password = f.password || makeTeacherPassword();
        let cred;
        try { cred = await sec().auth().createUserWithEmailAndPassword(String(f.email).trim(), password); }
        catch (e) {
          if (e.code === 'auth/email-already-in-use') throw new Error('Ця пошта вже зареєстрована. Якщо вчитель подав заявку сам — підтвердіть її в списку нижче; якщо доступ було вимкнено — увімкніть його.');
          throw authError(e);
        }
        await sec().auth().signOut();
        const data = { role: 'teacher', pending: false, disabled: false, name: String(f.name).trim(), email: cred.user.email,
          subjects: f.subjects || [], classes: f.classes || [], createdAt: firebase.firestore.FieldValue.serverTimestamp() };
        await db.collection('users').doc(cred.user.uid).set(data);
        return Object.assign({ uid: cred.user.uid, password }, data);
      },
      async updateTeacher(uid, data) { await db.collection('users').doc(uid).update(data); },
      async deleteTeacher(uid) { await db.collection('users').doc(uid).delete(); },
      async createStudent(name, cls) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const login = makeLogin(name, cls), password = makePassword();
          try {
            const cred = await sec().auth().createUserWithEmailAndPassword(loginToEmail(login), password);
            const uid = cred.user.uid;
            await sec().auth().signOut();
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
        if (r.passed) {
          /* Зарахований результат має фіксований id: повторно його створити не можна
             (правила бази забороняють перезапис) — так тест блокується назавжди,
             доки вчитель не видалить цю спробу. */
          const id = [u.uid, r.course, r.testId].join('__');
          try { await db.collection('results').doc(id).set(r); }
          catch (e) {
            if (e.code === 'permission-denied') throw new Error('Цей тест уже зараховано раніше');
            throw e;
          }
        } else {
          await db.collection('results').add(r);
        }
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
      async deleteResult(id) { await db.collection('results').doc(id).delete(); },
      async getCatalog() {
        const d = await db.collection('config').doc('catalog').get();
        return d.exists ? d.data().classes : null;
      },
      async saveCatalog(classes) {
        await db.collection('config').doc('catalog').set({ classes, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      },
      /* розклад уроків, імпортований зі «Шкільного розкладу» (без ПІБ учнів) */
      async getSchedule() {
        const d = await db.collection('config').doc('schedule').get();
        return d.exists ? d.data() : null;
      },
      async saveSchedule(data) {
        if (data) await db.collection('config').doc('schedule').set(Object.assign({}, data, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }));
        else await db.collection('config').doc('schedule').delete();
      }
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

  /* Firebase ще не налаштовано в js/config.js */
  function SetupStore() {
    return {
      mode: 'setup',
      onAuth(cb) { setTimeout(() => cb(null), 0); },
      async signIn() { throw new Error('Сайт ще не підключено до бази даних (див. README.md).'); },
      async signOut() {}
    };
  }

  const configured = !!(C.firebase && C.firebase.apiKey);
  window.StoreUtils = { makeTeacherPassword, isAdminEmail };
  window.Store = hasFirebase ? FirebaseStore() : configured ? BrokenStore() : SetupStore();
})();
