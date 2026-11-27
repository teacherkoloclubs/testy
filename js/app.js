/* Головний застосунок: маршрутизація, сторінки, статистика, панель вчителя */
(function () {
  const C = window.APP_CONFIG;
  const $app = document.getElementById('app');
  let user = null;
  let view = null;           // поточний «активний» компонент (тест/слайди)
  let skipGuard = false;
  window.COURSES = window.COURSES || {};

  /* ---------------- утиліти ---------------- */
  const ss = { getItem(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, setItem(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plural = (n, a, b, c) => { n = Math.abs(n) % 100; const n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 === 1) return a; return c; };
  const gradeClass = g => g == null ? 'none' : g >= 10 ? 'g-hi' : g >= 7 ? 'g-mid' : g >= C.passScore ? 'g-avg' : 'g-lo';
  const fmtDate = ms => ms ? new Date(ms).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDur = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const initials = n => String(n || '?').replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

  function modal(html, onMount, o) {
    o = o || {};
    const wrap = document.getElementById('modal'), box = document.getElementById('modalBox');
    box.className = 'modal' + (o.wide ? ' wide' : '');
    box.innerHTML = html; wrap.hidden = false;
    initPickers(box);
    const close = () => { wrap.hidden = true; box.innerHTML = ''; };
    box.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    wrap.onclick = e => { if (e.target === wrap && !o.lock) close(); };
    if (onMount) onMount(box, close);
    return close;
  }

  const scripts = {};
  function loadScript(src) {
    if (scripts[src]) return scripts[src];
    scripts[src] = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.onload = res;
      s.onerror = () => { delete scripts[src]; rej(new Error('Не вдалося завантажити ' + src)); };
      document.head.appendChild(s);
    });
    return scripts[src];
  }
  async function loadCourse(id) {
    if (!COURSES[id] || !COURSES[id]._loaded) {
      await loadScript('data/courses/' + id + '.js');
      const c = COURSES[id];
      for (const p of (c.parts || [])) await loadScript('data/courses/' + p);
      for (const p of (c.ext || [])) await loadScript('data/courses/' + p);
      for (const p of (c.games || [])) await loadScript('data/courses/' + p);
      if (window.Slides && Slides.applyExt) Slides.applyExt(c);
      c._loaded = true;
      c.sections.forEach(s => s.lessons.forEach(l => { l.section = s; }));
    }
    return COURSES[id];
  }

  /* Видання підручника: у каталозі subject.course — id чинного курсу,
     subject.archive — попередні видання (лише для перегляду вчителем). */
  /* Каталог класів і предметів: базовий з data/catalog.js або збережений вчителем у базі.
     subject.key — постійний ключ предмета; subject.course — id курсу з матеріалами (або порожньо);
     subject.id після нормалізації = id курсу (до нього прив’язані результати) або key. */
  const AVAILABLE = window.AVAILABLE_COURSES || [];
  const courseExists = id => AVAILABLE.some(c => c.id === id);
  const BASE_CATALOG = JSON.parse(JSON.stringify(CATALOG));
  /* стримана палітра класів: від індиго (1 клас) до блакитного (11 клас) */
  const CLASS_TONES = ['#4F46E5', '#4A50E8', '#4459EA', '#3B63EB', '#2F6FEA', '#2479E6', '#1784DF', '#0E8FD6', '#0A99CC', '#0AA2C2', '#0EA5B8'];
  function classColor(c) { return CLASS_TONES[Math.max(0, Math.min(CLASS_TONES.length - 1, (+c || 1) - 1))]; }
  function applyCatalog(classes) {
    CATALOG.length = 0;
    classes.slice().sort((a, b) => a.cls - b.cls).forEach(k => CATALOG.push({
      cls: Number(k.cls), color: classColor(k.cls), hidden: !!k.hidden,
      subjects: (k.subjects || []).map(s0 => {
        const s = Object.assign({}, s0);
        s.key = s.key || s.id;
        if (s.ready && !s.course) s.course = s.key;
        /* новий курс із тим самим id, що й ключ предмета, підключається автоматично */
        if (!s.course && !s.unlinked && courseExists(s.key)) s.course = s.key;
        if (s.course && !courseExists(s.course)) s.course = '';
        s.id = s.course || s.key;
        s.ready = !!s.course;
        s.icon = s.icon || '📘';
        return s;
      })
    }));
  }
  applyCatalog(BASE_CATALOG);
  function exportCatalog() {
    return CATALOG.map(k => ({ cls: k.cls, color: k.color, hidden: !!k.hidden, subjects: k.subjects.map(s => ({
      key: s.key, name: s.name, icon: s.icon, course: s.course || '', unlinked: !!s.unlinked, hidden: !!s.hidden, archive: s.archive || [] })) }));
  }
  /* ---------- ролі ---------- */
  const isAdmin = () => !!user && user.role === 'admin';
  const isTeacher = () => !!user && user.role === 'teacher';
  const isStaff = () => isAdmin() || isTeacher();
  /* id курсів (разом з архівними виданнями), доступних вчителю */
  /* курс доступний вчителю, якщо в його профілі є будь-який id цього предмета (ключ, курс або архівне видання):
     після підключення курсу до предмета id предмета змінюється, а в профілі вчителя може лишатися старий ключ */
  /* прихований клас бачить лише адміністратор (учні й вчителі — ні) */
  const hiddenFor = k => !!(k && k.hidden && user && user.role !== 'admin');
  const canCourse = id => !isTeacher() || (!CATALOG.some(k => k.hidden && k.subjects.some(s => subjectIds(s).includes(id)))
    && ((user.subjects || []).includes(id) || CATALOG.some(k => k.subjects.some(s => subjectIds(s).includes(id) && canSubject(s)))));
  /* доповнює список id вчителя всіма id його предметів (для правил бази); null — змін немає */
  const healSubjects = list => { const have = new Set(list || []), add = new Set(have);
    CATALOG.forEach(k => k.subjects.forEach(s => { const ids = subjectIds(s); if (ids.some(x => have.has(x))) ids.forEach(x => add.add(x)); }));
    return add.size > have.size ? [...add] : null; };
  const canSubject = s => !isTeacher() || [s.id, s.key, s.course].concat((s.archive || []).map(a => a.course)).some(x => x && user.subjects.includes(x));
  const visibleSubjects = k => hiddenFor(k) ? [] : k.subjects.filter(s => !(s.hidden && user && user.role === 'student') && canSubject(s))
    .slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'uk'));
  /* номер параграфа уроку (з індексу уроків) і назва спроби з номером: «§ 5 · Тест: …» */
  const lessonNo = (course, lid) => { const ix = (window.LESSON_INDEX || {})[course]; const l = ix && ix.l.find(x => x[0] === lid); return l ? l[1] : null; };
  const resTitle = r => { const n = r.kind === 'lesson' ? lessonNo(r.course, r.testId) : null; return (n != null ? '§ ' + n + ' · ' : '') + (r.title || ''); };
  /* класи, які бачить користувач: адміністратор — усі, вчитель — де є його предмети */
  const myClasses = () => isTeacher() ? CATALOG.filter(k => !hiddenFor(k) && (visibleSubjects(k).length || (user.classes || []).includes(k.cls))) : CATALOG;
  const roleLabel = () => isAdmin() ? 'Адміністратор' : isTeacher() ? 'Вчитель' : user.role === 'pending' ? 'Заявка вчителя' : user.cls + ' клас';
  /* id для збереження в профілі вчителя: ключ, чинний курс і архівні видання предмета */
  const subjectIds = s => [...new Set([s.id, s.key, s.course].concat((s.archive || []).map(a => a.course)).filter(Boolean))];
  function catalogSubject(id) {
    for (const k of CATALOG) for (const s of k.subjects)
      if (s.id === id) return Object.assign({ cls: k.cls, color: k.color }, s);
    for (const k of CATALOG) for (const s of k.subjects) {
      const old = (s.archive || []).find(a => a.course === id);
      if (old) return Object.assign({ cls: k.cls, color: k.color }, s, { id: old.course, ready: true, archived: true, editionLabel: old.label });
    }
    return null;
  }
  /* Рядок про підручник-джерело */
  function bookLine(course, opts) {
    const t = course.textbook;
    if (!t) return esc(course.book || '');
    const main = `${esc(t.authors)}. «${esc(t.title)}». Підручник для ${t.grade} класу${t.part ? ', ч. ' + esc(t.part) : ''}. — ${esc(t.publisher)}, ${t.year}`;
    return opts && opts.short ? `«${esc(t.title)}», ${t.grade} клас${t.part ? ', ч. ' + esc(t.part) : ''} · ${esc(t.authors)} · ${esc(t.publisher)}, ${t.year}` : main;
  }
  function sourceNote(course, pages) {
    return `<div class="source-note">📚 <span><b>Джерело:</b> ${bookLine(course)}${pages ? `, ${esc(pg(pages))}` : ''}.${course.textbook && course.textbook.approval ? ` <span class="muted">${esc(course.textbook.approval)}</span>` : ''}</span></div>`;
  }
  function classInfo(n) { return CATALOG.find(k => k.cls === +n); }

  /* Найкращий зарахований результат по кожному тесту */
  function bestMap(results) {
    const m = {};
    results.forEach(r => {
      const k = r.testId;
      const e = m[k] || (m[k] = { best: null, last: null, attempts: 0, lastAt: 0 });
      e.attempts++;
      if (r.passed && (e.best == null || r.score > e.best)) e.best = r.score;
      if ((r.atMs || 0) >= e.lastAt) { e.lastAt = r.atMs || 0; e.last = r.score; }
    });
    return m;
  }
  /* Усі тести курсу в порядку проходження */
  function courseTests(course, id) {
    const list = [];
    course.sections.forEach(s => {
      s.lessons.forEach(l => list.push({ key: l.id, title: '§ ' + l.n + '. ' + l.title, short: '§ ' + l.n, emoji: l.emoji || '📘', href: `#/test/${id}/lesson/${l.id}`, slides: `#/slides/${id}/${l.id}` }));
      list.push({ key: 'section-' + s.n, title: 'Підсумковий тест за розділ ' + s.n + ' «' + s.title + '»', short: 'Розділ ' + s.n, emoji: '🏁', href: `#/test/${id}/section/${s.n}`, summary: true });
    });
    list.push({ key: 'final', title: 'Річний підсумковий тест', short: 'Річний', emoji: '🏆', href: `#/test/${id}/final`, summary: true });
    return list;
  }
  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;

  /* ---------------- оболонка ---------------- */
  function setChrome() {
    document.getElementById('brandTitle').textContent = C.siteTitle;
    document.getElementById('brandSub').textContent = C.schoolName;
    document.title = C.siteTitle;
    const top = document.getElementById('topbar');
    top.hidden = !user;
    if (!user) return;
    const links = isAdmin()
      ? [['#/', 'Класи'], ['#/teacher/results', 'Результати'], ['#/teacher/students', 'Учні'], ['#/teacher/teachers', 'Вчителі'], ['#/teacher/subjects', 'Предмети'], ['#/teacher/schedule', 'Розклад'], ['#/chat', '💬 Чат'], ['#/help', '📖']]
      : isTeacher() ? [['#/', 'Мої класи'], ['#/teacher/results', 'Результати'], ['#/teacher/students', 'Учні'], ['#/chat', '💬 Чат'], ['#/help', '📖 Інструкція']]
      : user.role === 'pending' ? []
      : [['#/', 'Мої предмети'], ['#/my', 'Мої результати'], ['#/chat', '💬 Чат'], ['#/help', '📖 Інструкція']];
    const h = location.hash || '#/';
    document.getElementById('topnav').innerHTML = links.map(([href, t]) =>
      `<a href="${href}" class="${(href === '#/' ? (h === '#/' || h.startsWith('#/class') || h.startsWith('#/course')) : h.startsWith(href)) ? 'active' : ''}">${t}</a>`).join('');
    document.getElementById('userchip').innerHTML = `
      <span class="avatar">${esc(initials(user.name))}</span>
      <span class="who"><b>${esc(user.name)}</b><small>${esc(roleLabel())}</small></span>
      ${isStaff() ? `<button class="logout-btn" id="pwBtn" title="Змінити пароль"><span aria-hidden="true">🔑</span><span>Пароль</span></button>` : ''}
      <button class="logout-btn" id="logout" title="Вийти з порталу"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg><span>Вийти</span></button>`;
    document.getElementById('logout').onclick = () => modal(`<div class="m-emoji">👋</div><h2>Вийти з порталу?</h2>
      <div class="m-actions"><button class="btn light" data-close>Ні</button><button class="btn" data-close id="mOut">Вийти</button></div>`,
      b => b.querySelector('#mOut').onclick = () => { history.replaceState(null, '', '#/'); lastHash = '#/'; Store.signOut(); });
    const pwBtn = document.getElementById('pwBtn');
    if (pwBtn) pwBtn.onclick = passwordDialog;
    chatBadge();
  }
  function passwordDialog() {
    modal(`<h2>🔑 Змінити пароль</h2>
      <div class="field"><label>Поточний пароль</label><input class="input" type="password" id="pOld" autocomplete="current-password"></div>
      <div class="field"><label>Новий пароль (щонайменше 8 символів)</label><input class="input" type="password" id="pNew" autocomplete="new-password"></div>
      <div class="field"><label>Повторіть новий пароль</label><input class="input" type="password" id="pNew2" autocomplete="new-password"></div>
      <div class="form-error" id="pErr"></div>
      <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="pGo">Змінити</button></div>`,
      (box, close) => box.querySelector('#pGo').onclick = async () => {
        const o = box.querySelector('#pOld').value, n = box.querySelector('#pNew').value, n2 = box.querySelector('#pNew2').value;
        const err = box.querySelector('#pErr');
        if (n.length < 8) { err.textContent = 'Новий пароль має містити щонайменше 8 символів'; return; }
        if (n !== n2) { err.textContent = 'Нові паролі не збігаються'; return; }
        const b = box.querySelector('#pGo'); b.disabled = true; b.textContent = 'Змінюємо…';
        try { await Store.changePassword(o, n); close(); toast('Пароль змінено'); }
        catch (e) { err.textContent = e.message; b.disabled = false; b.textContent = 'Змінити'; }
      });
  }

  /* ---------------- чат: особисті розмови та групові чати «вчитель — клас» ---------------- */
  let CHAT = { list: [], unsub: null, uid: null, ready: false };
  const CHAT_TTL = 30 * 864e5;                 /* повідомлення старші за місяць видаляються */
  const chatMine = m => m.from === user.uid;
  const chatUnreadFor = m => m.adm ? (!m.read && m.from !== user.uid) : m.grp
    ? (m.from !== user.uid && !(m.readBy || []).includes(user.uid))
    : (!m.read && (user.role === 'student' ? m.role === 't' : m.role === 's'));
  const chatAlive = m => !m.atMs || m.atMs >= Date.now() - CHAT_TTL;
  const chatCanDelete = m => isAdmin() || (m.adm ? m.from === user.uid : (user.role === 'teacher' && canCourse(m.course)));
  const chatTried = new Set();
  function chatCleanup() {
    if (user.role === 'student' || !Store.chatCleanup) return;
    const old = (CHAT.raw || []).filter(m => !chatAlive(m) && chatCanDelete(m) && !chatTried.has(m.id)).map(m => m.id);
    if (!old.length) return;
    old.forEach(id => chatTried.add(id));
    Store.chatCleanup(old).catch(e => console.warn('chat cleanup', e));
  }
  function chatStart() {
    if (!Store.chatSubscribe || !user || user.role === 'pending') return;
    if (CHAT.unsub && CHAT.uid === user.uid) return;
    chatStop();
    CHAT.uid = user.uid;
    CHAT.unsub = Store.chatSubscribe({ uid: user.uid, role: user.role, cls: user.cls, admin: isAdmin(), subjects: user.subjects || [] }, list => {
      if (!list) return;
      CHAT.raw = list;
      CHAT.list = list.filter(chatAlive).sort((a, b) => (a.atMs || 0) - (b.atMs || 0)); CHAT.ready = true;
      chatBadge();
      chatCleanup();
      if (CHAT.onChange) CHAT.onChange();
    });
  }
  function chatStop() { if (CHAT.unsub) { try { CHAT.unsub(); } catch (e) {} } CHAT = { list: [], unsub: null, uid: null, ready: false }; }
  function chatBadge() {
    const a = document.querySelector('#topnav a[href="#/chat"]'); if (!a) return;
    const n = CHAT.list.filter(chatUnreadFor).length;
    a.innerHTML = `💬 Чат${n ? `<span class="nav-badge">${n > 99 ? '99+' : n}</span>` : ''}`;
  }
  /* хто веде предмет у класі — за розкладом */
  function teacherNamesFor(course, cls) {
    if (!SCHED || !SCHED.entries) return [];
    const map = SCHED.map || {}; const out = new Set();
    SCHED.entries.forEach(e => { if (+e.g === +cls && (map[e.s + '|' + e.g] === course || autoSubjectSafe(e.s, e.g) === course)) (e.t || []).forEach(t => out.add(t)); });
    return [...out];
  }
  function autoSubjectSafe(s, g) { try { return typeof autoSubject === 'function' ? autoSubject(s, g) : null; } catch (e) { return null; } }
  /* розмови: особисті (учень + предмет) і групові (клас + предмет) */
  function chatThreads() {
    const th = {};
    CHAT.list.forEach(m => {
      const grp = !!m.grp, k = m.adm ? `a|${m.tuid}` : grp ? `g|${m.course}|${m.gcls}` : `${m.uid}|${m.course}`;
      const t = th[k] || (th[k] = { key: k, adm: !!m.adm, tuid: m.tuid, tname: m.tname, grp, uid: grp || m.adm ? null : m.uid, course: m.course, cls: grp ? m.gcls : m.cls, studentName: m.studentName, msgs: [], unread: 0 });
      if (m.adm && m.tname) t.tname = m.tname;
      t.msgs.push(m); if (chatUnreadFor(m)) t.unread++;
      if (!grp && m.studentName) t.studentName = m.studentName;
    });
    return Object.values(th).map(t => Object.assign(t, { last: t.msgs[t.msgs.length - 1] })).sort((a, b) => (b.last.atMs || 0) - (a.last.atMs || 0));
  }
  function subjInfo(course) {
    for (const k of CATALOG) for (const s of k.subjects) if (s.id === course) return { name: s.name, icon: s.icon || '📘', cls: k.cls };
    return { name: course, icon: '📘', cls: '' };
  }
  /* ---- «Повідомити про помилку»: вчитель виділяє текст → коментар → адміністратору ---- */
  const ERR_PLACE = { slides: 'Презентація', notes: 'Конспект уроку', plan: 'План уроку', test: 'Тест', kr: 'Контрольна робота', sim: 'Симуляція', sims: 'Симуляції', lab: 'Лабораторна робота', games: 'Гра', drill: 'Вправи', units: 'Одиниці вимірювання', course: 'Сторінка предмета', class: 'Сторінка класу', help: 'Інструкція', my: 'Мої результати', teacher: 'Кабінет вчителя' };
  const errCanReport = () => user && user.role === 'teacher' && !isAdmin();
  function errContext(sel) {
    const hash = location.hash || '#/'; const p = hash.replace(/^#\/?/, '').split('/');
    const ctx = { place: ERR_PLACE[p[0]] || 'Головна сторінка', url: hash };
    const cid = ['slides', 'notes', 'plan', 'test', 'kr', 'sim', 'sims', 'lab', 'games', 'drill', 'units', 'course'].includes(p[0]) ? p[1] : '';
    if (cid) {
      const si = subjInfo(cid); ctx.subject = si.name; ctx.cls = si.cls ? si.cls + ' клас' : '';
      const c = COURSES[cid]; if (c && c.title) ctx.book = c.title;
      const lid = p[0] === 'test' ? (p[2] === 'lesson' ? p[3] : '') : ['slides', 'notes', 'plan', 'lab', 'sim', 'games', 'drill'].includes(p[0]) ? p[2] : '';
      if (p[0] === 'test' && p[2] === 'section') ctx.lesson = 'Тест за розділом ' + (p[3] || '');
      if (p[0] === 'test' && p[2] === 'annual') ctx.lesson = 'Річний тест';
      if (lid && c && c.sections) { for (const s of c.sections) { const l = s.lessons.find(x => x.id === lid);
        if (l) { const n = lessonNo(cid, lid); ctx.lesson = (n != null ? '§ ' + n + '. ' : '') + (l.title || ''); ctx.section = s.title || ''; break; } } }
    }
    /* найближчий заголовок біля виділеного тексту (слайд, блок конспекту, питання тесту) */
    try { let el = sel && sel.anchorNode; el = el && (el.nodeType === 1 ? el : el.parentElement);
      for (let k = 0; el && k < 8; k++, el = el.parentElement) {
        const h = el.matches && el.matches('h1,h2,h3,h4') ? el : el.querySelector && el.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > .q-text, :scope > header h2');
        if (h && h.textContent.trim()) { ctx.block = h.textContent.trim().slice(0, 140); break; } } } catch (e) {}
    if (ctx.block && ctx.lesson && ctx.lesson.includes(ctx.block.replace(/^[^\p{L}\d]+/u, '').trim())) delete ctx.block;
    return ctx;
  }
  function errHideBtn() { const b = document.getElementById('errBtn'); if (b) b.hidden = true; }
  function errShowBtn() {
    if (!errCanReport() || (location.hash || '').startsWith('#/chat')) { errHideBtn(); return; }
    const sel = window.getSelection(); const txt = sel ? String(sel).trim() : '';
    if (!sel || sel.isCollapsed || txt.length < 2) { errHideBtn(); return; }
    const an = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    if (!an || !an.closest('#app') || an.closest('input, textarea, [contenteditable], #modal')) { errHideBtn(); return; }
    let b = document.getElementById('errBtn');
    if (!b) { b = document.createElement('button'); b.id = 'errBtn'; b.type = 'button'; b.className = 'err-btn'; b.textContent = '⚠️ Повідомити про помилку';
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', () => errOpen()); document.body.appendChild(b); }
    const r = sel.getRangeAt(0).getBoundingClientRect();
    b.hidden = false;
    const w = b.offsetWidth || 220, x = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    const y = r.top > 54 ? r.top - 44 : r.bottom + 10;
    b.style.left = x + 'px'; b.style.top = Math.min(window.innerHeight - 50, y) + 'px';
    b._sel = txt.slice(0, 600); b._ctx = errContext(sel);
  }
  function errOpen() {
    const b = document.getElementById('errBtn'); if (!b || !b._sel) return;
    const selTxt = b._sel, ctx = b._ctx || errContext(null); errHideBtn();
    const rows = () => [['Предмет', ctx.subject], ['Клас', ctx.cls], ['Розділ', ctx.section], ['Параграф', ctx.lesson], ['Сторінка', ctx.place], ['Блок', ctx.block]].filter(x => x[1]);
    const ctxHtml = () => `<dl class="err-ctx">${rows().map(x => `<dt>${x[0]}</dt><dd>${esc(String(x[1]))}</dd>`).join('')}</dl>`;
    let comment = '';
    const step1 = (bx, close) => {
      bx.innerHTML = `<h2>⚠️ Повідомити про помилку</h2>
        <div class="field"><label>Виділений фрагмент</label><blockquote class="err-q">${esc(selTxt)}</blockquote></div>
        ${ctxHtml()}
        <div class="field"><label>Коментар для адміністратора</label><textarea class="input" id="errCm" rows="3" maxlength="1000" placeholder="Що не так і як має бути правильно…">${esc(comment)}</textarea></div>
        <div class="m-actions"><button class="btn light" id="errNo">Скасувати</button><button class="btn brand" id="errNext">Надіслати…</button></div>`;
      const t = bx.querySelector('#errCm'); t.focus();
      bx.querySelector('#errNo').onclick = close;
      bx.querySelector('#errNext').onclick = () => { comment = t.value.trim(); if (!comment) { t.focus(); t.classList.add('shake'); setTimeout(() => t.classList.remove('shake'), 500); toast('Напишіть коментар'); return; } step2(bx, close); };
    };
    const step2 = (bx, close) => {
      bx.innerHTML = `<h2>Надіслати адміністратору?</h2>
        <p class="muted">Перевірте повідомлення. Його отримає адміністратор порталу в чаті «Адміністратор».</p>
        <div class="err-sum"><b>Фрагмент:</b> «${esc(selTxt.slice(0, 200))}${selTxt.length > 200 ? '…' : ''}»<br><b>Коментар:</b> ${esc(comment)}</div>${ctxHtml()}
        <div class="m-actions"><button class="btn light" id="errBack">← Змінити</button><button class="btn brand" id="errGo">✅ Так, надіслати</button></div>`;
      bx.querySelector('#errBack').onclick = () => step1(bx, close);
      bx.querySelector('#errGo').onclick = async ev => {
        ev.target.disabled = true;
        const err = { sel: selTxt, subject: ctx.subject || '', cls: ctx.cls || '', section: ctx.section || '', lesson: ctx.lesson || '', place: [ctx.place, ctx.block].filter(Boolean).join(' · '), url: ctx.url, book: ctx.book || '' };
        try { await Store.chatSend({ adm: true, tuid: user.uid, tname: user.name, course: '', role: 't', name: user.name, text: comment, err });
          close(); toast('✅ Повідомлення про помилку надіслано адміністратору'); }
        catch (e) { ev.target.disabled = false; toast('Не надіслано: ' + e.message); }
      };
    };
    modal('', (bx, close) => step1(bx, close), { lock: true });
  }
  let errTimer = null;
  const errSched = () => { clearTimeout(errTimer); errTimer = setTimeout(errShowBtn, 180); };
  document.addEventListener('mouseup', errSched);
  document.addEventListener('keyup', e => { if (e.shiftKey || e.key.startsWith('Arrow')) errSched(); });
  document.addEventListener('touchend', () => setTimeout(errSched, 300));
  document.addEventListener('selectionchange', () => { const sl = window.getSelection(); if (!sl || sl.isCollapsed) errHideBtn(); else errSched(); });
  window.addEventListener('scroll', errHideBtn, true);
  window.addEventListener('hashchange', errHideBtn);
  const chatTime = ms => {
    if (!ms) return ''; const d = new Date(ms), now = new Date();
    const same = d.toDateString() === now.toDateString();
    return same ? d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  };
  const EMOJI = ['😊', '😀', '😂', '🙂', '😉', '😍', '🤔', '😮', '😢', '😅', '😎', '🥳', '👍', '👎', '👏', '🙌', '🙏', '💪', '👋', '✌️', '👌', '🤝', '❤️', '💙', '💛', '⭐', '🌟', '🔥', '✨', '🎉', '🏆', '🥇', '✅', '❌', '❓', '❗', '⚠️', '📌', '📚', '📖', '✏️', '📝', '💡', '🧠', '⏰', '📅', '🏫', '🎓'];
  const emojiBar = id => `<div class="ch-emo" id="${id}" hidden>${EMOJI.map(e => `<button type="button" data-emo="${e}">${e}</button>`).join('')}</div>`;
  /* вставити смайлик у поле в місце курсора */
  function bindEmoji(root, btnSel, barSel, taSel) {
    const btn = root.querySelector(btnSel), bar = root.querySelector(barSel), ta = root.querySelector(taSel);
    if (!btn || !bar || !ta) return;
    btn.onclick = e => { e.preventDefault(); bar.hidden = !bar.hidden; };
    bar.onclick = e => { const b = e.target.closest('[data-emo]'); if (!b) return;
      const s0 = ta.selectionStart ?? ta.value.length, s1 = ta.selectionEnd ?? ta.value.length;
      ta.value = ta.value.slice(0, s0) + b.dataset.emo + ta.value.slice(s1); const p = s0 + b.dataset.emo.length;
      ta.focus(); ta.setSelectionRange(p, p); ta.dispatchEvent(new Event('input', { bubbles: true })); };
  }
  const chatPrev = m => m ? (m.err ? '⚠️ Помилка: ' : '') + ((m.text || '') || (m.img ? '🖼 Скріншот' : '')) : '';
  const chatText = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, '<br>');
  /* класи й предмети, доступні вчителю для чату */
  const chatClasses = () => myClasses().map(k => ({ cls: k.cls, subs: (isAdmin() ? k.subjects : visibleSubjects(k)).filter(s => canCourse(s.id)) })).filter(k => k.subs.length);

  /* стиснути зображення до JPEG ≤ ~500 КБ (документ бази обмежений 1 МБ) */
  function shrinkImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => { URL.revokeObjectURL(url);
        let max = 1400, q = 0.8, out = '';
        for (let i = 0; i < 8; i++) {
          const k = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas');
          cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
          const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
          out = cv.toDataURL('image/jpeg', q); if (out.length < 680000) return res(out);
          max = Math.round(max * 0.8); q = Math.max(0.5, q - 0.08);
        }
        rej(new Error('Зображення завелике'));
      };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Не вдалося прочитати зображення')); };
      im.src = url;
    });
  }
  async function renderChat(a, b, c) {
    chatStart();
    const student = user.role === 'student';
    let roster = null; /* для вчителя: учні (імена, кількість у класі) */
    let teachers = null; /* для адміністратора: вчителі */
    let pendImg = ''; /* скріншот, що чекає надсилання */
    let replyTo = null; /* повідомлення, на яке відповідаємо */
    let filter = '';
    const grpRoute = a === 'grp';
    const nameOf = uid => { if (uid === user.uid) return 'ви'; const s = roster && roster.find(x => x.uid === uid); if (s) return s.name; const m = CHAT.list.find(x => x.from === uid && x.name); return m ? m.name : 'учасник'; };
    /* повідомлення для розмови t (особиста, групова чи з адміністратором) */
    const mkMsg = (t, text) => t.adm
      ? { adm: true, tuid: t.tuid, tname: isAdmin() ? (t.tname || t.name || '') : user.name, course: '', role: isAdmin() ? 'a' : 't', name: user.name, text }
      : t.grp
      ? { grp: true, gcls: +t.cls, cls: +t.cls, course: t.course, role: student ? 's' : 't', name: user.name, text }
      : { uid: t.uid, cls: +t.cls, course: t.course, studentName: student ? user.name : (t.name || ''), role: student ? 's' : 't', name: user.name, text };
    const showReply = () => { const el = $app.querySelector('#chReply'); if (!el) return;
      el.hidden = !replyTo;
      el.innerHTML = replyTo ? `<span class="ch-rq"><b>↩ Відповідь для ${esc(replyTo.name || '')}</b>${esc(replyTo.text || '')}</span><button type="button" class="icon-btn" id="chReplyX" title="Скасувати відповідь">✕</button>` : '';
      const x = el.querySelector('#chReplyX'); if (x) x.onclick = () => { replyTo = null; showReply(); }; };
    const draw = () => {
      const threads = chatThreads();
      let items;
      if (student) {
        const k = CATALOG.find(x => +x.cls === +user.cls);
        const subs = k ? visibleSubjects(k) : [];
        const dm = subs.map(s => { const t = threads.find(x => !x.grp && x.course === s.id && x.uid === user.uid);
          return { key: user.uid + '|' + s.id, uid: user.uid, course: s.id, cls: user.cls, ava: s.icon || '📘', href: `#/chat/${s.id}`, title: esc(s.name), sub: t ? (chatMine(t.last) ? 'Ви: ' : '') + chatPrev(t.last) : (teacherNamesFor(s.id, user.cls).join(', ') || 'Напиши вчителю'), last: t && t.last, unread: t ? t.unread : 0 }; });
        const gr = threads.filter(t => t.grp && +t.cls === +user.cls).map(t => { const si = subjInfo(t.course);
          return { key: t.key, grp: true, course: t.course, cls: t.cls, ava: '👥', href: `#/chat/grp/${t.course}`, title: `${esc(si.name)} <small>чат класу</small>`, sub: `${chatMine(t.last) ? 'Ви' : (t.last.name || '')}: ${chatPrev(t.last)}`, last: t.last, unread: t.unread }; });
        items = gr.concat(dm).sort((x, y) => ((y.last && y.last.atMs) || 0) - ((x.last && x.last.atMs) || 0));
      } else {
        const admT = threads.filter(t => t.adm && (isAdmin() || t.tuid === user.uid));
        const admItems = isAdmin()
          ? admT.map(t => ({ key: t.key, adm: true, tuid: t.tuid, tname: t.tname, ava: '🧑‍🏫', href: `#/chat/adm/${t.tuid}`, title: `${esc(t.tname || 'Вчитель')} <small>вчитель → адміністратор</small>`, sub: `${chatMine(t.last) ? 'Ви: ' : ''}${chatPrev(t.last)}`, last: t.last, unread: t.unread, name: t.tname }))
          : [(t => ({ key: 'a|' + user.uid, adm: true, tuid: user.uid, tname: user.name, ava: '🛡', href: '#/chat/adm', title: 'Адміністратор <small>питання, пропозиції</small>', sub: t ? `${chatMine(t.last) ? 'Ви: ' : ''}${chatPrev(t.last)}` : 'Напишіть адміністратору порталу', last: t && t.last, unread: t ? t.unread : 0, name: 'адміністратор' }))(admT[0])];
        items = threads.filter(t => !t.adm && canCourse(t.course)).map(t => { const si = subjInfo(t.course);
          return t.grp
            ? { key: t.key, grp: true, course: t.course, cls: t.cls, ava: '👥', href: `#/chat/grp/${t.course}/${t.cls}`, title: `${t.cls} клас <small>чат класу</small>`, sub: `${si.icon} ${si.name} · ${chatMine(t.last) ? 'Ви' : (t.last.name || '')}: ${chatPrev(t.last)}`, last: t.last, unread: t.unread, name: t.cls + ' клас' }
            : { key: t.key, uid: t.uid, course: t.course, cls: t.cls, ava: esc(initials(t.studentName || '?')), href: `#/chat/${t.course}/${t.uid}`, title: `${t.studentName || 'Учень'} <small>${t.cls} кл.</small>`, sub: `${si.icon} ${si.name} · ${chatMine(t.last) ? 'Ви: ' : ''}${chatPrev(t.last)}`, last: t.last, unread: t.unread, name: t.studentName }; });
        items = items.concat(isAdmin() ? admItems : []).sort((x, y) => ((y.last && y.last.atMs) || 0) - ((x.last && x.last.atMs) || 0));
        if (!isAdmin()) items = admItems.concat(items);
        if (filter) items = items.filter(x => (x.name || '').toLowerCase().includes(filter));
      }
      /* обрана розмова */
      let sel = null;
      if (a === 'adm' && !student) {
        const tuid = isAdmin() ? b : user.uid, key = 'a|' + tuid;
        if (tuid) { const tt = teachers && teachers.find(x => x.uid === tuid);
          sel = items.find(x => x.key === key) || { key, adm: true, tuid, tname: tt ? tt.name : 'Вчитель', title: `${esc(tt ? tt.name : 'Вчитель')} <small>вчитель</small>` }; }
      } else if (grpRoute) {
        const gcls = student ? +user.cls : +c, key = `g|${b}|${gcls}`;
        if (b && gcls && (student ? visibleSubjects(CATALOG.find(x => +x.cls === +user.cls) || { subjects: [] }).some(s => s.id === b) : canCourse(b)))
          sel = items.find(x => x.key === key) || { key, grp: true, course: b, cls: gcls };
      } else {
        const selKey = student ? (a ? user.uid + '|' + a : '') : (a && b ? b + '|' + a : '');
        sel = items.find(x => x.key === selKey) || null;
        if (!sel && selKey && !student) { const st = roster && roster.find(s => s.uid === b); const si = subjInfo(a);
          sel = { key: selKey, uid: b, course: a, cls: st ? st.cls : si.cls, name: st ? st.name : 'Учень', title: `${st ? esc(st.name) : 'Учень'} <small>${st ? st.cls : si.cls} кл.</small>` }; }
      }
      const msgs = sel ? CHAT.list.filter(m => sel.adm ? (m.adm && m.tuid === sel.tuid) : m.adm ? false : sel.grp ? (m.grp && m.course === sel.course && +m.gcls === +sel.cls) : (!m.grp && m.uid === sel.uid && m.course === sel.course)) : [];
      const si = sel ? subjInfo(sel.course) : null;
      const classSize = sel && sel.grp && roster ? roster.filter(s => +s.cls === +sel.cls).length : null;
      const head = !sel ? '' : sel.adm
        ? (isAdmin() ? `<b>🧑‍🏫 ${esc(sel.tname || 'Вчитель')}</b><small>Особисте листування вчителя з адміністратором</small>` : `<b>🛡 Адміністратор порталу</b><small>Питання щодо порталу, предметів, учнів, пропозиції</small>`)
        : sel.grp
        ? `<b>👥 ${esc(si.name)} · ${sel.cls} клас</b><small>Груповий чат класу${classSize != null ? ` · ${classSize} ${plural(classSize, 'учень', 'учні', 'учнів')}` : ''}${student ? ` · ${esc(teacherNamesFor(sel.course, user.cls).join(', ') || 'вчитель предмета')}` : ''}</small>`
        : student ? `<b>${si.icon} ${esc(si.name)}</b><small>Особисто · ${esc(teacherNamesFor(sel.course, user.cls).join(', ') || 'вчитель предмета')}</small>`
        : `<b>${sel.title}</b><small>${si.icon} ${esc(si.name)} · особисто</small>`;
      let lastDay = '';
      const ticks = m => {
        if (!chatMine(m)) return '';
        if (!m.grp) return m.read ? ' <span class="ch-rd" title="Прочитано">✓✓</span>' : ' <span title="Надіслано">✓</span>';
        const rb = (m.readBy || []).filter(u => u !== m.from);
        const names = !student && roster ? rb.map(nameOf).join(', ') : '';
        return rb.length ? ` <span class="ch-rd" title="${esc(names ? 'Прочитали: ' + names : 'Прочитали: ' + rb.length)}">👁 ${rb.length}</span>` : ' <span title="Ще ніхто не прочитав">✓</span>';
      };
      const quote = m => m.reply ? `<a class="ch-quote" href="#" data-goto="${esc(m.reply.id || '')}"><b>↩ ${esc(m.reply.name || '')}</b>${esc((m.reply.text || '').slice(0, 140))}</a>` : '';
      const fwdLbl = m => m.fwd ? `<span class="ch-fwd">↪ Переслано${m.fwd.name ? ' від ' + esc(m.fwd.name) : ''}</span>` : '';
      const errCard = m => m.err ? `<div class="ch-err"><b>⚠️ Повідомлення про помилку</b>${m.err.sel ? `<q>${esc(m.err.sel)}</q>` : ''}<dl>${[['Від', m.name], ['Предмет', m.err.subject], ['Клас', m.err.cls], ['Розділ', m.err.section], ['Параграф', m.err.lesson], ['Сторінка', m.err.place], ['Підручник', m.err.book !== m.err.subject ? m.err.book : '']].filter(x => x[1]).map(x => `<dt>${x[0]}</dt><dd>${esc(String(x[1]))}</dd>`).join('')}</dl>${m.err.url ? `<a class="btn light sm" href="${esc(m.err.url)}">Відкрити місце помилки →</a>` : ''}</div>` : '';
      const bubbles = msgs.map(m => { const day = m.atMs ? new Date(m.atMs).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }) : '';
        const sep = day !== lastDay ? `<div class="ch-day">${day}</div>` : ''; lastDay = day;
        const from = !chatMine(m) ? `<span class="ch-from">${m.role === 't' ? '🧑‍🏫 ' : m.role === 'a' ? '🛡 ' : ''}${esc(m.name || '')}</span>` : '';
        const tools = `<button class="ch-act" data-reply="${m.id}" title="Відповісти">↩️</button><button class="ch-act" data-fwd="${m.id}" title="Переслати">↪️</button>` + (chatMine(m) ? `<button class="ch-act" data-edit="${m.id}" title="Редагувати">✏️</button>` : '') + (chatCanDelete(m) ? `<button class="ch-act" data-del="${m.id}" title="Видалити">🗑</button>` : '');
        return `${sep}<div class="ch-msg ${chatMine(m) ? 'me' : ''} ${m.role === 't' && m.grp ? 'tch' : ''}" id="msg-${m.id}"><div class="ch-bub">${from}${fwdLbl(m)}${quote(m)}${errCard(m)}${m.bc ? `<span class="ch-bc">📣 Повідомлення для всього класу</span>` : ''}${m.img ? `<img class="ch-img" src="${esc(m.img)}" alt="скріншот" data-zoom>` : ''}${chatText(m.text || '')}<span class="ch-t">${m.edited ? '<i>ред.</i> ' : ''}${chatTime(m.atMs)}${ticks(m)}</span></div>${tools ? `<span class="ch-tools-m">${tools}</span>` : ''}</div>`; }).join('');
      $app.innerHTML = `
        <div class="page-head"><h1>💬 Чат</h1><p>${student ? 'Пиши вчителю особисто або спілкуйся в чаті класу. Повідомлення зберігаються місяць.' : (isAdmin() ? 'Розмови з учнями, групові чати класів і листування з вчителями.' : 'Особисті розмови з учнями, групові чати класів і зв’язок з адміністратором.') + ' Можна вставляти скріншоти (Ctrl+V або 📎). Повідомлення старші за місяць видаляються автоматично.'}</p></div>
        <div class="chat ${sel ? 'has-sel' : ''}">
          <aside class="card ch-list">
            ${!student ? `<div class="ch-tools"><input class="input" id="chFind" placeholder="🔎 Пошук" value="${esc(filter)}"><button class="btn brand sm" id="chNew" title="Написати одному учню">＋ Учню</button><button class="btn light sm" id="chAll" title="Груповий чат з класом">👥 Класу</button>${isAdmin() ? '<button class="btn light sm" id="chTch" title="Особисте повідомлення вчителю">🧑‍🏫 Вчителю</button>' : ''}</div>` : ''}
            ${items.length ? items.map(x => `<a class="ch-item ${sel && x.key === sel.key ? 'on' : ''} ${x.grp ? 'grp' : ''}" href="${x.href}">
              <span class="ch-ava">${x.ava}</span>
              <span class="ch-meta"><b>${x.title}</b><small>${esc((x.sub || '').slice(0, 70))}</small></span>
              <span class="ch-side">${x.last ? `<small>${chatTime(x.last.atMs)}</small>` : ''}${x.unread ? `<i class="ch-n">${x.unread}</i>` : ''}</span></a>`).join('')
              : `<div class="empty" style="padding:26px 10px"><span class="e">💬</span>${student ? 'Предметів поки немає' : (CHAT.ready ? 'Розмов поки немає. «＋ Учню» — особиста розмова, «👥 Класу» — чат з усім класом.' : 'Завантаження…')}</div>`}
          </aside>
          <section class="card ch-pane">
            ${sel ? `<div class="ch-head"><a class="ch-back" href="#/chat" title="До списку">←</a><div>${head}</div></div>
              <div class="ch-msgs" id="chMsgs">${bubbles || `<div class="ch-empty">${sel.adm ? (isAdmin() ? 'Повідомлень ще немає.' : '🛡 Напишіть адміністратору: питання про портал, доступ до предметів, помилки, пропозиції. Можна вставити скріншот (Ctrl+V).') : sel.grp ? (student ? '👥 Тут спілкується весь клас і вчитель.' : '👥 Напишіть перше повідомлення — його побачить увесь клас.') : (student ? '👋 Напиши перше повідомлення — наприклад, запитай про незрозуміле завдання.' : 'Повідомлень ще немає. Напишіть учню першим.')}</div>`}</div>
              ${emojiBar('chEmo')}<div class="ch-pend ch-reply" id="chReply" hidden></div><div class="ch-pend" id="chPend" ${pendImg ? '' : 'hidden'}>${pendImg ? `<img src="${pendImg}" alt=""><span>Скріншот буде надіслано разом з повідомленням</span><button type="button" class="icon-btn" id="chPendX" title="Прибрати">✕</button>` : ''}</div><form class="ch-form" id="chForm"><button class="btn light ch-emo-btn" type="button" id="chEmoBtn" title="Смайлики">😊</button><label class="btn light ch-emo-btn" title="Додати скріншот або фото (можна також вставити Ctrl+V)">📎<input type="file" id="chFile" accept="image/*" hidden></label><textarea class="input" id="chText" rows="1" maxlength="2000" placeholder="${sel.grp ? 'Повідомлення для всього класу…' : 'Повідомлення… (Ctrl+V — вставити скріншот)'}"></textarea><button class="btn brand" type="submit" title="Надіслати">➤</button></form>`
            : `<div class="ch-empty big"><span>💬</span>${student ? 'Обери розмову ліворуч' : 'Оберіть розмову ліворуч'}</div>`}
          </section>
        </div>`;
      const box = $app.querySelector('#chMsgs'); if (box) box.scrollTop = box.scrollHeight;
      /* позначити прочитаним */
      const unread = msgs.filter(chatUnreadFor);
      const dmIds = unread.filter(m => !m.grp).map(m => m.id), gIds = unread.filter(m => m.grp).map(m => m.id);
      if (dmIds.length && Store.chatMarkRead) Store.chatMarkRead(dmIds).catch(e => console.warn(e));
      if (gIds.length && Store.chatMarkReadGroup) Store.chatMarkReadGroup(gIds, user.uid).catch(e => console.warn(e));
      const f = $app.querySelector('#chForm');
      if (f) {
        const ta = f.querySelector('#chText');
        ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
        ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; });
        f.onsubmit = async e => {
          e.preventDefault(); const text = ta.value.trim(), img = pendImg; if (!text && !img) return;
          const btn = f.querySelector('button[type=submit]'); btn.disabled = true; ta.value = ''; const eb = $app.querySelector('#chEmo'); if (eb) eb.hidden = true;
          pendImg = ''; const pe = $app.querySelector('#chPend'); if (pe) { pe.hidden = true; pe.innerHTML = ''; }
          const msg = mkMsg(sel, text);
          if (img) msg.img = img;
          const rp = replyTo; if (rp) { msg.reply = rp; replyTo = null; showReply(); }
          try { await Store.chatSend(msg); }
          catch (ex) { toast('Не надіслано: ' + ex.message); const n = $app.querySelector('#chText'); if (n) n.value = text; if (img) { pendImg = img; showPend(); } if (rp) { replyTo = rp; showReply(); } }
          const nb2 = $app.querySelector('#chForm button[type=submit]'); if (nb2) nb2.disabled = false;
        };
        const showPend = () => { const pe = $app.querySelector('#chPend'); if (!pe) return;
          pe.hidden = !pendImg; pe.innerHTML = pendImg ? `<img src="${pendImg}" alt=""><span>Скріншот буде надіслано разом з повідомленням</span><button type="button" class="icon-btn" id="chPendX" title="Прибрати">✕</button>` : '';
          const x = pe.querySelector('#chPendX'); if (x) x.onclick = () => { pendImg = ''; showPend(); }; };
        const takeImg = async file => { if (!file || !/^image\//.test(file.type)) return;
          try { pendImg = await shrinkImage(file); showPend(); ta.focus(); } catch (er) { toast(er.message); } };
        showPend(); showReply();
        ta.addEventListener('paste', e => { const it = [...((e.clipboardData && e.clipboardData.items) || [])].find(x => x.kind === 'file' && /^image\//.test(x.type));
          if (it) { e.preventDefault(); takeImg(it.getAsFile()); } });
        const fl = f.querySelector('#chFile'); if (fl) fl.onchange = () => { takeImg(fl.files[0]); fl.value = ''; };
        if (!('ontouchstart' in window)) ta.focus();
        bindEmoji($app, '#chEmoBtn', '#chEmo', '#chText');
      }
      /* відповісти на повідомлення */
      $app.querySelectorAll('[data-reply]').forEach(x => x.onclick = () => {
        const m = CHAT.list.find(y => y.id === x.dataset.reply); if (!m) return;
        replyTo = { id: m.id, name: chatMine(m) ? user.name : (m.name || ''), text: (chatPrev(m) || '').slice(0, 200) };
        showReply(); const t = $app.querySelector('#chText'); if (t) t.focus();
      });
      /* перейти до процитованого повідомлення */
      $app.querySelectorAll('[data-goto]').forEach(x => x.onclick = e => { e.preventDefault();
        const el = document.getElementById('msg-' + x.dataset.goto);
        if (!el) { toast('Початкове повідомлення вже видалене'); return; }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ch-flash'); setTimeout(() => el.classList.remove('ch-flash'), 1600); });
      /* переслати повідомлення */
      $app.querySelectorAll('[data-fwd]').forEach(x => x.onclick = () => {
        const m = CHAT.list.find(y => y.id === x.dataset.fwd); if (!m) return;
        const targets = items.filter(t => t.adm || t.grp || t.uid);
        if (!targets.length) { toast('Немає розмов, куди можна переслати'); return; }
        const plainT = h => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        modal(`<h2>↪️ Переслати повідомлення</h2>
          <div class="ch-fwd-prev">${m.img ? '🖼 ' : ''}${esc((m.text || (m.img ? 'Скріншот' : '')).slice(0, 300))}</div>
          <div class="field"><label>Кому</label><select class="input" id="fTo">${targets.map((t, i) => `<option value="${i}">${esc(plainT(t.title))}${t.sub && !t.grp && !t.adm && !student ? '' : ''}</option>`).join('')}</select></div>
          <div class="field"><label>Коментар (необов’язково)</label><textarea class="input" id="fCm" rows="2" maxlength="500" placeholder="Додати свій коментар…"></textarea></div>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="fGo">Переслати</button></div>`, (bx, close) => {
          bx.querySelector('#fGo').onclick = async () => {
            const t = targets[+bx.querySelector('#fTo').value]; if (!t) return;
            const cm = bx.querySelector('#fCm').value.trim();
            const msg = mkMsg(t, (cm ? cm + '\n\n' : '') + (m.text || ''));
            msg.fwd = { name: chatMine(m) ? user.name : (m.name || ''), id: m.id };
            if (m.img) msg.img = m.img;
            if (m.err) msg.err = m.err;
            try { await Store.chatSend(msg); close(); toast('✅ Переслано'); location.hash = t.href; } catch (e) { toast('Не переслано: ' + e.message); }
          };
        });
      });
      /* редагування власного повідомлення */
      $app.querySelectorAll('[data-edit]').forEach(x => x.onclick = () => {
        const m = CHAT.list.find(y => y.id === x.dataset.edit); if (!m) return;
        modal(`<h2>✏️ Редагувати повідомлення</h2><textarea class="input" id="eText" rows="4" maxlength="2000">${esc(m.text)}</textarea>
          <div class="ch-bc-tools"><button class="btn light sm" type="button" id="eEmoBtn">😊 Смайлики</button></div>${emojiBar('eEmo')}
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="eGo">Зберегти</button></div>`, (bx, close) => {
          bindEmoji(bx, '#eEmoBtn', '#eEmo', '#eText');
          const t = bx.querySelector('#eText'); t.focus(); t.setSelectionRange(t.value.length, t.value.length);
          bx.querySelector('#eGo').onclick = async () => { const v = t.value.trim(); if (!v) { t.focus(); return; } if (v === m.text) { close(); return; }
            try { await Store.chatEdit(m.id, v); close(); } catch (e) { toast('Не збережено: ' + e.message); } };
        });
      });
      $app.querySelectorAll('[data-del]').forEach(x => x.onclick = () => modal(`<h2>Видалити повідомлення?</h2><p class="muted">Повідомлення зникне в усіх учасників розмови.</p>
        <div class="m-actions"><button class="btn light" data-close>Ні</button><button class="btn danger" data-close id="mDel">Видалити</button></div>`,
        bx => bx.querySelector('#mDel').onclick = () => Store.chatDelete(x.dataset.del).catch(e => toast(e.message))));
      $app.querySelectorAll('[data-zoom]').forEach(im => im.onclick = () => modal(`<img src="${esc(im.src)}" alt="" style="max-width:100%;border-radius:12px;display:block;margin:0 auto"><div class="m-actions"><a class="btn light" href="${esc(im.src)}" download="skrinshot.jpg">⬇️ Завантажити</a><button class="btn brand" data-close>Закрити</button></div>`, null, { wide: true }));
      const tb = $app.querySelector('#chTch');
      if (tb) tb.onclick = async () => {
        if (!teachers) { try { teachers = (await Store.listTeachers()).filter(t => !t.pending); } catch (e) { teachers = []; } }
        if (!teachers.length) { toast('Вчителів ще немає'); return; }
        modal(`<h2>🧑‍🏫 Написати вчителю</h2><div class="field"><label>Вчитель</label><select class="input" id="tSel">${teachers.slice().sort((x, y) => (x.name || '').localeCompare(y.name || '', 'uk')).map(t => `<option value="${t.uid}">${esc(t.name || t.email)}</option>`).join('')}</select></div>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" data-close id="tGo">Відкрити</button></div>`,
          bx => bx.querySelector('#tGo').onclick = () => { location.hash = '#/chat/adm/' + bx.querySelector('#tSel').value; });
      };
      const fi = $app.querySelector('#chFind');
      if (fi) fi.oninput = () => { filter = fi.value.trim().toLowerCase(); const pos = fi.selectionStart; draw(); const n = $app.querySelector('#chFind'); n.focus(); n.setSelectionRange(pos, pos); };
      const nb = $app.querySelector('#chNew');
      if (nb) nb.onclick = async () => {
        if (!roster) roster = await Store.listStudents();
        const subsBy = {}; chatClasses().forEach(k => subsBy[k.cls] = k.subs);
        const sts = roster.filter(s => (subsBy[s.cls] || []).length).sort((x, y) => x.cls - y.cls || x.name.localeCompare(y.name, 'uk'));
        modal(`<h2>✉️ Особиста розмова</h2>
          <div class="field"><label>Учень</label><select class="input" id="nSt">${sts.map(s => `<option value="${s.uid}">${s.cls} кл. · ${esc(s.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Предмет</label><select class="input" id="nSub"></select></div>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" data-close id="nGo">Відкрити</button></div>`, bx => {
          const st = bx.querySelector('#nSt'), su = bx.querySelector('#nSub');
          const fill = () => { const s = sts.find(x => x.uid === st.value); su.innerHTML = (s ? subsBy[s.cls] : []).map(x => `<option value="${x.id}">${x.icon || '📘'} ${esc(x.name)}</option>`).join(''); };
          st.onchange = fill; fill();
          bx.querySelector('#nGo').onclick = () => { if (st.value && su.value) location.hash = `#/chat/${su.value}/${st.value}`; };
        });
      };
      const ab = $app.querySelector('#chAll');
      if (ab) ab.onclick = () => {
        const ks = chatClasses();
        if (!ks.length) { toast('Немає класів з вашими предметами'); return; }
        modal(`<h2>👥 Чат з класом</h2>
          <p class="muted" style="margin-bottom:10px">Груповий чат: повідомлення бачать усі учні класу, учні можуть відповідати в чаті.</p>
          <div class="field"><label>Клас</label><select class="input" id="bCls">${ks.map(k => `<option value="${k.cls}">${k.cls} клас</option>`).join('')}</select></div>
          <div class="field"><label>Предмет</label><select class="input" id="bSub"></select></div>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" data-close id="bGo">Відкрити чат</button></div>`, bx => {
          const cs = bx.querySelector('#bCls'), su = bx.querySelector('#bSub');
          const fill = () => { const k = ks.find(x => +x.cls === +cs.value); su.innerHTML = k.subs.map(x => `<option value="${x.id}">${x.icon || '📘'} ${esc(x.name)}</option>`).join(''); };
          cs.onchange = fill; fill();
          bx.querySelector('#bGo').onclick = () => { location.hash = `#/chat/grp/${su.value}/${cs.value}`; };
        });
      };
    };
    if (!student) { try { roster = await Store.listStudents(); } catch (e) { roster = []; } }
    if (isAdmin() && a === 'adm' && b) { try { teachers = (await Store.listTeachers()).filter(t => !t.pending); } catch (e) { teachers = []; } }
    CHAT.onChange = () => { if ((location.hash || '').startsWith('#/chat')) {
      const ta = $app.querySelector('#chText'); const keep = ta ? ta.value : ''; const foc = document.activeElement === ta;
      const eb = $app.querySelector('#chEmo'); const emoOpen = eb && !eb.hidden;
      draw(); const n = $app.querySelector('#chText'); if (n && keep) { n.value = keep; } if (n && foc) n.focus();
      if (emoOpen) { const e2 = $app.querySelector('#chEmo'); if (e2) e2.hidden = false; } } };
    view = { destroy() { CHAT.onChange = null; } };
    draw();
  }

  /* ---------------- довідка: короткі пояснення функцій ---------------- */
  function renderHelp(tab) {
    const roleTab = isStaff() ? 'teacher' : 'student';
    tab = tab === 'teacher' && isStaff() ? 'teacher' : tab === 'student' ? 'student' : roleTab;
    /* інструкція: розділ = { id, ico, title, intro, steps (нумеровані кроки), tips (поради) } */
    const sec = (id, ico, title, intro, steps, tips) => ({ id, ico, title, intro, steps: steps || [], tips: tips || [] });
    const student = [
      sec('vhid', '🔑', 'Вхід на портал', 'Логін і пароль тобі видає вчитель (картка з даними для входу).', [
        'Відкрий сайт порталу в браузері на комп’ютері, планшеті чи телефоні.',
        'Введи <b>логін</b> (наприклад, <code>7ivanenko12</code>) і <b>пароль</b> з картки. Пошта не потрібна.',
        'Натисни <b>«Увійти»</b>. Відкриється сторінка твого класу з предметами.',
        'Щоб змінити пароль, натисни <b>🔑 Пароль</b> угорі сторінки. Запам’ятай новий пароль!'],
        ['Забув пароль — звернися до вчителя: він може видати новий.', 'Не повідомляй свій пароль іншим учням.', 'Після уроку на шкільному комп’ютері натисни <b>«Вийти»</b>.']),
      sec('predmety', '📚', 'Предмети та параграфи', 'На головній сторінці — предмети твого класу.', [
        'Обери предмет — відкриється список розділів і параграфів, як у підручнику.',
        'Біля параграфа стоїть позначка <b>✅ Виконано</b> або <b>⏳ Не виконано</b> та дата уроку за розкладом 📅.',
        'Угорі сторінки предмета — смужка прогресу і кнопка <b>«Наступний тест»</b>.'],
        ['Позначка «урок уже був» нагадує, що тест за цей параграф варто пройти якнайшвидше.']),
      sec('prez', '🎞', 'Презентація до параграфа', 'Теорія параграфа зі схемами, прикладами й інтерактивними завданнями.', [
        'Біля параграфа натисни <b>🎞 Презентація</b>.',
        'Гортай слайди стрілками ← → на екрані, клавіатурою або свайпом на телефоні.',
        'Виконуй вправи на слайдах (правда/міф, відповідності, порядок) — вони допомагають підготуватися до тесту.',
        'Наприкінці — запитання для самоперевірки й посилання на тест.',
        'Кнопка <b>📒 Конспект уроку</b> — стислий виклад параграфа: головна думка, схеми, опорна схема, формули, приклади, «Запам’ятай» і «Перевір себе». Його зручно повторювати перед тестом і можна надрукувати.'],
        ['Вправи в презентації не впливають на оцінку — сміливо пробуй.']),
      sec('test', '📝', 'Тести', 'Тест за параграф — 12 питань, за розділ — 24, річний — 36.', [
        'Натисни <b>📝 Тест</b> біля параграфа (або <b>«Почати»</b> біля підсумкового тесту).',
        'Уважно читай запитання: у деяких одна правильна відповідь, у деяких — кілька (це написано під запитанням).',
        'На кожне запитання відведено час — стеж за таймером.',
        'Після останнього запитання побачиш оцінку та правильні відповіді.',
        `Тест <b>зараховано</b>, якщо оцінка не нижча за <b>${C.passScore}</b>. Зарахований тест закривається 🔒.`],
        ['Не виходь з вікна тесту й не перемикай вкладки — вчитель бачить кількість виходів.', 'Якщо тест не зараховано, його можна пройти ще раз.', 'Перескласти зарахований тест можна лише з дозволу вчителя.']),
      sec('dz', '🏠', 'Домашнє завдання та ігри', '', [
        'Кнопка <b>🏠 Д/з</b> біля параграфа відкриває творче домашнє завдання.',
        'Кнопка <b>🎮 Ігри</b> (у початковій школі) — повторення теми в ігровій формі.'], []),
      sec('sim', '🧪', 'Симуляції та лабораторні роботи', 'Інтерактивні моделі й віртуальні досліди до розділів.', [
        'Відкрий <b>🧪 Симуляцію</b> на сторінці предмета — змінюй параметри й спостерігай, що відбувається.',
        'Виконай завдання під моделлю й перевір відповідь.',
        'У <b>🔬 Лабораторній роботі</b> прочитай мету, обладнання й хід роботи.',
        'Проведи досліди на віртуальному стенді й натискай <b>«Записати в таблицю»</b>.',
        'Дай відповіді на підсумкові запитання та напиши висновок.'],
        ['Лабораторну можна показати вчителю на екрані або зберегти.']),
      sec('ocinky', '📊', 'Мої результати й оцінки', 'Усі твої оцінки в одному місці.', [
        'Відкрий <b>«Мої результати»</b> у верхньому меню.',
        'Переглянь оцінки за тести, середній бал і прогрес з кожного предмета.',
        'Позначка <b>✍️</b> — оцінку поставив учитель: за роботу на уроці або за тест, виконаний на папері.',
        'Розділ <b>«Що пройти»</b> нагадує про тести за уроки, що вже минули ⏰.'],
        ['Середній бал за параграф рахується з оцінки за тест і оцінки за урок.']),
      sec('chat', '💬', 'Чат з учителем', 'Запитай учителя, якщо щось незрозуміло.', [
        'Відкрий <b>💬 Чат</b> і обери предмет — це особиста розмова з учителем.',
        'Або обери <b>чат класу</b>, щоб спілкуватися з учителем і однокласниками.',
        'Напиши повідомлення й натисни «Надіслати». Скріншот додай кнопкою 📎 або <b>Ctrl+V</b>.',
        'Щоб відповісти на конкретне повідомлення, наведи на нього й натисни <b>↩️</b>; <b>↪️</b> — переслати.'],
        ['Будь ввічливим: чат бачить учитель.', 'Повідомлення зберігаються місяць.'])
    ];
    const teacher = [
      sec('t-start', '🔑', 'Початок роботи', 'Доступ до порталу видає адміністратор.', [
        'Увійдіть за <b>поштою та паролем</b>. Якщо облікового запису немає — натисніть «👩‍🏫 Я вчитель — подати заявку» на сторінці входу й зачекайте підтвердження.',
        'На головній сторінці <b>«Мої класи»</b> — класи й предмети, які вам призначено.',
        'Змініть пароль кнопкою <b>🔑 Пароль</b>. Якщо забули пароль — скористайтеся відновленням на сторінці входу.'],
        ['Якщо бракує предмета чи класу — напишіть адміністратору в <b>💬 Чат → 🛡 Адміністратор</b>.']),
      sec('t-uchni', '🧑‍🎓', 'Учні: облікові записи', 'Учні входять за логіном і паролем, без пошти.', [
        'Відкрийте <b>«Учні»</b> й оберіть клас.',
        'Натисніть <b>＋ Додати учнів</b>, вставте список прізвищ та імен (кожен з нового рядка) і натисніть <b>«Створити облікові записи»</b>.',
        'Портал створить логіни й паролі. Натисніть <b>🖨 Картки з логінами</b>, надрукуйте й роздайте картки учням.',
        'Щоб змінити ім’я, видати новий пароль або видалити учня — скористайтеся кнопками в рядку учня.',
        'Наприкінці року — <b>⬆️ Перевести в наступний клас</b>.'],
        ['Збережіть надруковані картки — пароль учня потім можна лише скинути, а не переглянути.']),
      sec('t-urok', '🏫', 'Підготовка до уроку', 'Усі матеріали — на сторінці предмета.', [
        'Відкрийте клас → предмет. Біля кожного уроку — номер параграфа <b>§</b> за підручником.',
        '<b>📋 План</b> — мета уроку, етапи з хронометражем, посилання на презентацію, симуляцію й тест, творче домашнє завдання.',
        '<b>🎞 Презентація</b> — показуйте на уроці з проєктора; анімовані слайди з теорією та вправами.',
        '<b>📒 Конспект уроку</b> — стислий зміст параграфа зі схемами, опорною схемою й формулами; можна роздрукувати для учнів.',
        '<b>📒 Журнал</b> біля параграфа відкриває журнал класу саме на цьому параграфі: кнопка <b>✍️ Виставити оцінки класу</b> дає поставити оцінки за урок усім учням одразу.',
        '<b>🧪 Симуляції</b> й <b>🔬 лабораторні роботи</b> — демонструйте на уроці або давайте учням для самостійної роботи.',
        '<b>📝 Тест</b> — учні проходять його на уроці чи вдома; ви можете переглянути тест заздалегідь.'],
        ['Дати уроків з’являються автоматично, якщо адміністратор завантажив розклад.']),
      sec('t-results', '📊', 'Результати', 'Огляд успішності класів і учнів.', [
        'Відкрийте <b>«Результати»</b>. Вкладка <b>«Огляд»</b> — активність, рівні досягнень, учні, що потребують уваги, найскладніші тести.',
        '<b>«Усі результати»</b> — список спроб із фільтрами за класом, предметом, видом тесту та періодом.',
        '<b>«За предметами»</b>, <b>«За класами»</b>, <b>«За учнями»</b> — статистика в різних розрізах.',
        '<b>«Нагадування»</b> — хто не пройшов тести за минулі уроки.',
        '<b>✍️ Зарахувати вручну</b> — внесіть оцінку за тест, виконаний на папері. Тест стане зарахованим.',
        'Щоб учень міг перескласти тест — видаліть зараховану спробу (✕).'], []),
      sec('t-journal', '📒', 'Журнал класу', 'Таблиця оцінок класу з предмета.', [
        'Відкрийте <b>Результати → 📒 Журнал класу</b>, оберіть клас і предмет.',
        '<b>«Огляд за розділами»</b> — середній бал за параграфи кожного розділу, підсумкові й річний тести.',
        'Відкрийте вкладку <b>«Розділ N»</b>: для кожного параграфа (§ за підручником) три стовпці — <b>т</b> (тест), <b>у</b> (оцінка за урок), <b>сер</b> (середній за параграф).',
        'Щоб поставити оцінку за урок, натисніть <b>＋</b> у стовпці «у» й оберіть бал від 1 до 12. Натисніть на оцінку ще раз, щоб змінити чи прибрати її.',
        '<b>📄 PDF</b> — завантажити журнал у PDF; <b>🖨 Друк</b> — надрукувати. Орієнтація сторінки (книжкова чи альбомна) обирається автоматично за шириною таблиці.',
        '<b>⬇️ CSV</b> — таблиця для Excel з усіма оцінками.'],
        ['Оцінку за урок учень бачить на сторінці предмета (✍️) та в «Моїх результатах».', 'Натисніть на ім’я учня, щоб переглянути всі його спроби.']),
      sec('t-chat', '💬', 'Чат', 'Спілкування з учнями та адміністратором.', [
        'Відкрийте <b>💬 Чат</b>: особисті розмови з учнями згруповано за предметами.',
        '<b>Чат класу</b> — повідомлення для всього класу (оголошення, домашнє завдання).',
        '<b>🛡 Адміністратор</b> — окрема розмова з адміністратором порталу.',
        'Скріншот додайте кнопкою 📎 або <b>Ctrl+V</b>; своє повідомлення можна редагувати чи видалити.',
        'Наведіть на повідомлення: <b>↩️</b> — відповісти (з цитатою), <b>↪️</b> — переслати в іншу розмову.'],
        ['Повідомлення зберігаються місяць.']),
      sec('t-err', '⚠️', 'Повідомити про помилку', 'Знайшли помилку в презентації, конспекті чи тесті?', [
        'Виділіть мишкою текст із помилкою — з’явиться червона кнопка <b>⚠️ Повідомити про помилку</b>.',
        'Натисніть її та напишіть коментар: що не так і як має бути.',
        'Перевірте дані у вікні підтвердження й натисніть <b>✅ Так, надіслати</b>.',
        'Адміністратор отримає повідомлення в чаті з фрагментом, предметом, класом, параграфом і посиланням на місце помилки.'],
        ['Предмет, клас і параграф визначаються автоматично.'])
    ].concat(isAdmin() ? [sec('t-admin', '⚙️', 'Лише для адміністратора', 'Налаштування порталу.', [
      '<b>Вчителі</b> — підтвердження заявок, призначення предметів і класів, вимкнення доступу. Під час відкриття сторінки вчителям автоматично додається доступ до нових курсів їхніх предметів.',
      '<b>Предмети за класами</b> — назви, значки, порядок, прив’язка матеріалів (у списку — лише підручники цього класу й предмета). Можна приховати предмет від учнів або <b>весь клас від учнів і вчителів</b>.',
      '<b>Розклад</b> — завантаження файлу розкладу, фільтри, синхронізація предметів учителів (🔄) і створення облікових записів (＋).',
      '<b>💬 Чат → 🧑‍🏫 Вчителю</b> — написати будь-якому вчителю.'], [])] : []);
    const list = tab === 'teacher' ? teacher : student;
    $app.innerHTML = `<div class="page-head"><div><h1>📖 Інструкція з користування</h1><p>${tab === 'teacher' ? 'Для вчителя' : 'Для учня'} — покроково про всі можливості порталу</p></div>
        <div><button class="btn light" id="helpPrint">🖨 Надрукувати інструкцію</button></div></div>
      ${isStaff() ? `<nav class="rs-tabs"><a href="#/help/teacher" class="${tab === 'teacher' ? 'on' : ''}">🧑‍🏫 Для вчителя</a><a href="#/help/student" class="${tab === 'student' ? 'on' : ''}">🧑‍🎓 Для учня</a></nav>` : ''}
      <div class="card pad guide-toc"><b>Зміст</b><ol>${list.map(x => `<li><a href="javascript:void(0)" data-go="${x.id}">${x.ico} ${x.title}</a></li>`).join('')}</ol></div>
      <div class="guide">${list.map((x, i) => `<section class="card pad guide-sec" id="g-${x.id}">
        <h2><span class="guide-n">${i + 1}</span>${x.ico} ${x.title}</h2>${x.intro ? `<p class="guide-intro">${x.intro}</p>` : ''}
        <ol class="guide-steps">${x.steps.map(st => `<li>${st}</li>`).join('')}</ol>
        ${x.tips.length ? `<div class="guide-tips">${x.tips.map(t => `<p>💡 ${t}</p>`).join('')}</div>` : ''}</section>`).join('')}</div>`;
    $app.querySelectorAll('[data-go]').forEach(a => a.onclick = () => { const el = document.getElementById('g-' + a.dataset.go); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $app.querySelector('#helpPrint').onclick = () => {
      printHtml(`<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"><title>Інструкція</title><style>@page{size:A4 portrait;margin:14mm}body{font-family:Inter,Arial,sans-serif;color:#1F2340;font-size:12px;line-height:1.45}
        h1{font-size:18px}h2{font-size:14px;margin:14px 0 4px;break-after:avoid}.guide-n,.guide-toc{display:none}ol{margin:4px 0 4px 18px;padding:0}li{margin:2px 0}.guide-tips p{margin:2px 0;color:#475569}code{background:#F1F5F9;padding:0 3px}section{break-inside:avoid}</style></head>
        <body><h1>📖 Інструкція з користування порталом — ${tab === 'teacher' ? 'для вчителя' : 'для учня'}</h1>${$app.querySelector('.guide').innerHTML}</body></html>`);
    };
  }

  /* ---------------- маршрутизатор ---------------- */
  let lastHash = location.hash;
  async function route() {
    const hash = location.hash || '#/';
    if (!skipGuard && view && view.active) {
      const target = hash;
      history.replaceState(null, '', lastHash);
      modal(`<div class="m-emoji">⚠️</div><h2>Вийти з тесту?</h2><p>Таймер зупиниться, а результат не буде збережено.</p>
        <div class="m-actions"><button class="btn light" data-close>Продовжити тест</button><button class="btn danger" data-close id="mLeave">Вийти</button></div>`,
        b => b.querySelector('#mLeave').onclick = () => { skipGuard = true; location.hash = target; });
      return;
    }
    skipGuard = false;
    if (view) { view.destroy(); view = null; }
    lastHash = hash;
    Protect.set(user && user.role === 'student', false);
    document.body.classList.remove('theme-primary');
    setChrome();
    window.scrollTo(0, 0);
    if (!user) return renderLogin();
    const p = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    try {
      if (user.role === 'pending') return renderPending();
      if (!p.length) return isStaff() ? renderClasses() : await renderClass(user.cls);
      if (p[0] === 'class') return await renderClass(+p[1]);
      if (p[0] === 'course') return await renderCourse(p[1]);
      if (p[0] === 'slides') return await renderSlides(p[1], p[2]);
      if (p[0] === 'plan') return await renderPlan(p[1], p[2]);
      if (p[0] === 'notes') return await renderNotes(p[1], p[2]);
      if (p[0] === 'test') return await renderTest(p[1], p[2], p[3]);
      if (p[0] === 'units') return await renderUnits(p[1]);
      if (p[0] === 'kr') return await renderKr(p[1], p[2], p[3]);
      if (p[0] === 'sims') return await renderSimList(p[1]);
      if (p[0] === 'sim') return await renderSim(p[1], p[2], p[3]);
      if (p[0] === 'my') return await renderMy(p[1]);
      if (p[0] === 'games') return await renderGames(p[1], p[2], p[3]);
      if (p[0] === 'chat') return await renderChat(p[1], p[2], p[3]);
      if (p[0] === 'help') return renderHelp(p[1]);
      if (p[0] === 'lab') return await renderLab(p[1], p[2]);
      if (p[0] === 'drill') return await renderDrill(p[1], p[2]);
      if (p[0] === 'teacher' && isStaff()) {
        if (p[1] === 'students') return await renderStudents();
        if (p[1] === 'results') return await renderResults(p[2], p[3], p[4], p[5]);
        if (p[1] === 'subjects' && isAdmin()) return renderSubjectsAdmin();
        if (p[1] === 'teachers' && isAdmin()) return await renderTeachers();
        if (p[1] === 'schedule' && isAdmin()) return await renderScheduleAdmin();
      }
      $app.innerHTML = `<div class="empty"><span class="e">🧭</span>Сторінку не знайдено. <a href="#/">На головну</a></div>`;
    } catch (e) {
      console.error(e);
      $app.innerHTML = `<div class="empty"><span class="e">😵</span>Помилка: ${esc(e.message)}<br><br><a class="btn light" href="#/">На головну</a></div>`;
    }
  }
  window.addEventListener('hashchange', route);

  /* ---------------- вхід ---------------- */
  function renderLogin(err) {
    $app.innerHTML = `
      <div class="login-wrap">
        <div class="login-hero">
          <span class="tag">🎓 ${esc(C.schoolName)}</span>
          <h1 style="margin-top:16px">Тести, презентації<br>та <em>твої успіхи</em> — в одному місці</h1>
          <p>Переглядай презентації до уроків, проходь тести та стеж за своїми результатами з 2 по 9 клас.</p>
          <div class="hero-badges"><span>📊 Статистика</span><span>⏱ Таймер</span><span>🎨 Презентації</span><span>🏆 12 балів</span></div>
        </div>
        <form class="card login-card" id="loginForm" autocomplete="on">
          <h2>Вхід</h2>
          <p class="muted" style="font-weight:700">Учням логін і пароль видає вчитель. Вчителі входять зі своєю поштою.</p>
          <div class="field"><label for="lg">Логін або пошта</label><input class="input" id="lg" name="username" autocomplete="username" required autocapitalize="off" spellcheck="false" placeholder="наприклад, 2ivanenko25"></div>
          <div class="field"><label for="pw">Пароль</label><input class="input" id="pw" name="password" type="password" autocomplete="current-password" required></div>
          ${Store.mode === 'setup' ? `<div class="setup-note">⚙️ Сайт ще не підключено до бази даних. Вчителю: заповніть розділ <b>firebase</b> у файлі <b>js/config.js</b> (інструкція — у README.md).</div>` : ''}
          <div class="form-error" id="lErr">${esc(err || '')}</div>
          <button class="btn brand" type="submit">Увійти →</button>
          ${Store.mode === 'firebase' ? `<div class="login-links">
            <a href="javascript:void(0)" id="forgot">Вчитель: забули пароль?</a>
            ${C.teacherSelfSignup ? `<a href="javascript:void(0)" id="signup">👩‍🏫 Я вчитель — подати заявку</a>` : ''}</div>` : ''}
        </form>
      </div>`;
    $app.querySelector('#loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Входимо…';
      try { await Store.signIn($app.querySelector('#lg').value, $app.querySelector('#pw').value); }
      catch (ex) { $app.querySelector('#lErr').textContent = ex.message; b.disabled = false; b.textContent = 'Увійти →'; }
    });
    const fg = $app.querySelector('#forgot');
    if (fg) fg.onclick = () => modal(`<h2>Відновлення пароля</h2>
      <p class="muted" style="font-weight:700;margin-bottom:10px">Для вчителів. Учням пароль підкаже вчитель.</p>
      <div class="field"><label>Ваша пошта</label><input class="input" id="fMail" type="email" autocapitalize="off" value="${esc(($app.querySelector('#lg').value || '').includes('@') ? $app.querySelector('#lg').value : '')}"></div>
      <div class="form-error" id="fErr"></div>
      <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="fGo">Надіслати лист</button></div>`,
      (box, close) => box.querySelector('#fGo').onclick = async () => {
        const m = box.querySelector('#fMail').value.trim();
        if (!m.includes('@')) { box.querySelector('#fErr').textContent = 'Введіть пошту'; return; }
        try { await Store.sendReset(m); close(); toast('Якщо така пошта зареєстрована, лист уже надіслано'); }
        catch (e) { box.querySelector('#fErr').textContent = e.message; }
      });
    const su = $app.querySelector('#signup');
    if (su) su.onclick = signupDialog;
  }
  function signupDialog() {
    modal(`<h2>👩‍🏫 Заявка вчителя</h2>
      <p class="muted" style="font-weight:700;margin-bottom:12px">Після підтвердження адміністратором ви побачите свої класи, учнів і результати.</p>
      <div class="field"><label>Прізвище, ім’я та по батькові</label><input class="input" id="sName"></div>
      <div class="field"><label>Пошта (буде вашим логіном)</label><input class="input" id="sMail" type="email" autocapitalize="off" spellcheck="false"></div>
      <div class="field"><label>Пароль (щонайменше 8 символів)</label><input class="input" id="sPw" type="password" autocomplete="new-password"></div>
      <div class="field"><label>Які предмети ви викладаєте?</label>${subjectPicker([])}</div>
      <div class="field"><label>Коментар для адміністратора (необов’язково)</label><input class="input" id="sNote" maxlength="300" placeholder="Наприклад: класний керівник 3-А"></div>
      <div class="form-error" id="sErr"></div>
      <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="sGo">Надіслати заявку</button></div>`,
      (box, close) => box.querySelector('#sGo').onclick = async () => {
        const name = box.querySelector('#sName').value.trim(), email = box.querySelector('#sMail').value.trim(), password = box.querySelector('#sPw').value;
        const err = box.querySelector('#sErr');
        if (!name) { err.textContent = 'Введіть ім’я'; return; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Введіть правильну адресу пошти'; return; }
        if (password.length < 8) { err.textContent = 'Пароль має містити щонайменше 8 символів'; return; }
        const requested = readPicker(box).subjects;
        const b = box.querySelector('#sGo'); b.disabled = true; b.textContent = 'Надсилаємо…';
        try { await Store.registerTeacher({ name, email, password, requested, note: box.querySelector('#sNote').value }); close(); }
        catch (e) { err.textContent = e.message; b.disabled = false; b.textContent = 'Надіслати заявку'; }
      }, { wide: true });
  }

  /* ---------------- класи / предмети ---------------- */
  function renderClasses() {
    $app.innerHTML = `
      <div class="page-head"><div><h1>${isTeacher() ? 'Мої класи' : 'Оберіть клас'}</h1><p>${isTeacher() ? 'Класи й предмети, які вам призначив адміністратор' : 'Тести та презентації для 1–9 класів'}</p></div></div>
      ${isTeacher() && !myClasses().length ? `<div class="card empty"><span class="e">📭</span>Вам ще не призначено жодного предмета. Зверніться до адміністратора.</div>` : ''}
      ${myLessonsCard()}
      <div class="class-grid">${myClasses().map(k => `
        <a class="class-tile" style="--c:${k.color}" href="#/class/${k.cls}">
          <span class="num">${k.cls}</span><span class="lbl">клас${k.hidden ? ' · 🙈 приховано' : ''}</span>
          <span class="subs">${visibleSubjects(k).map(s => `<span>${esc(s.name)}</span>`).join('')}</span></a>`).join('')}
      </div>`;
  }

  async function renderClass(n) {
    const k = classInfo(n);
    if (!k) { $app.innerHTML = `<div class="empty"><span class="e">🤷</span>Клас не знайдено</div>`; return; }
    if (n <= 4) document.body.classList.add('theme-primary');
    if (isTeacher() && !myClasses().includes(k)) { location.hash = '#/'; return; }
    if (user.role === 'student' && k.hidden) { $app.innerHTML = `<div class="card empty"><span class="e">🙈</span>Матеріали твого класу тимчасово приховані. Зверніться до вчителя.</div>`; return; }
    if (user.role === 'student') return renderStudentHome(k);
    const crumbs = isStaff() ? `<div class="crumbs"><a href="#/">Класи</a><span>›</span><span>${n} клас</span></div>` : '';
    $app.innerHTML = `${crumbs}
      <div class="page-head"><div><h1>${user.role === 'student' ? 'Привіт, ' + esc(user.name.split(' ').slice(-1)[0]) + '! 👋' : n + ' клас'}</h1>
      <p>${user.role === 'student' ? n + ' клас · обери предмет' : 'Предмети'}</p></div></div>
      <div class="grid subject-grid">${visibleSubjects(k).map(s => `
        <a class="card subject-tile ${s.ready ? '' : 'soon'}" style="--c:${k.color}" href="${s.ready ? '#/course/' + s.id : 'javascript:void(0)'}" ${s.ready ? '' : 'data-soon'}>
          <span class="ico">${s.icon}</span>
          <span class="st-body"><h3>${esc(s.name)}${s.hidden ? ' <span class="tag">🙈 приховано</span>' : ''}</h3><span class="muted st-sub" id="prog-${s.id}">${s.ready ? (hasNotes(s.id) ? 'Конспект та тести' : 'Презентації та тести') : '⏳ Матеріали готуються'}</span></span>
        </a>`).join('')}</div>`;
    $app.querySelectorAll('[data-soon]').forEach(a => a.addEventListener('click', () => toast('Матеріали з цього предмета ще готуються')));
  }

  /* ---------------- сторінка курсу ---------------- */
  async function renderCourse(id) {
    const meta = catalogSubject(id);
    if (!meta || !meta.ready) { $app.innerHTML = `<div class="empty"><span class="e">⏳</span>Матеріали ще готуються</div>`; return; }
    if (!meta || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    $app.innerHTML = '<div class="loader"><span></span></div>';
    const course = await loadCourse(id);
    if (course.primary) document.body.classList.add('theme-primary');
    const sims = await loadSims(id);
    const labs = await loadLabs(id);
    const plans = await loadPlans(id, course);
    const results = user.role === 'student' ? (await Store.myResults()).filter(r => r.course === id) : [];
    const bm = bestMap(results);
    const lessons = course.sections.flatMap(s => s.lessons);
    const passed = lessons.filter(l => bm[l.id] && bm[l.id].best != null).length;
    const isDone = key => !!(bm[key] && bm[key].best != null);
    const g = (key) => {
      const e = bm[key]; if (!e) return `<span class="grade">—</span>`;
      const v = e.best != null ? e.best : e.last;
      return `<span class="grade ${gradeClass(v)}" title="Спроб: ${e.attempts}">${v}</span>`;
    };
    /* кнопка тесту: для учня — заблокована після зарахування */
    const testBtn = (key, href, label, cls) => {
      if (user.role === 'student' && isDone(key)) return `<span class="btn sm done-btn" title="Тест уже зараховано">🔒 Пройдено</span>`;
      return `<a class="btn ${cls || ''} sm" href="${href}">${label}</a>`;
    };
    const status = key => user.role !== 'student' ? '' : isDone(key)
      ? '<span class="st st-done">✅ Виконано</span>' : '<span class="st st-todo">⏳ Не виконано</span>';
    const allTests = courseTests(course, id);
    const plan = lessonPlan(id);
    const dateBadge = l => { const pl = plan && plan.byId[l.id]; if (!pl) return '';
      const past = lessonPast(pl.date, pl.slot), warn = past && user.role === 'student' && !isDone(l.id);
      return `<span class="date-badge ${warn ? 'warn' : past ? 'past' : ''}" title="За розкладом: ${dowOf(pl.date)}, ${pl.slot}-й урок">📅 ${fmtDay(pl.date)}${warn ? ' · урок уже був' : ''}</span>`; };
    const nextT = allTests.find(t => !isDone(t.key));
    const crumbs = `<div class="crumbs">${isStaff() ? `<a href="#/">Класи</a><span>›</span>` : ''}<a href="#/class/${meta.cls}">${meta.cls} клас</a><span>›</span><span>${esc(meta.name)}</span></div>`;

    $app.innerHTML = `${crumbs}
      <div class="course-hero" style="--c:${meta.color}">
        <div><h1>${esc(meta.name)} · ${meta.cls} клас</h1><p>${bookLine(course, { short: true })}</p>${meta.archived ? `<p style="font-size:14px">🗄 Архівне видання${meta.editionLabel ? ': ' + esc(meta.editionLabel) : ''}</p>` : ''}
          ${user.role === 'student' ? `<div class="progress-line"><i style="width:${lessons.length ? passed / lessons.length * 100 : 0}%"></i></div>
          <p style="font-size:14px">Виконано тестів за уроки: ${passed} з ${lessons.length} · усього: ${allTests.filter(t => isDone(t.key)).length} з ${allTests.length}</p>
          ${nextT ? `<a class="btn light sm" style="margin-top:12px" href="${nextT.href}">Наступний: ${esc(nextT.short)} →</a>` : '<p style="margin-top:8px">🎉 Усі тести виконано!</p>'}` : `<p style="font-size:14px">${lessons.length} ${plural(lessons.length, 'урок', 'уроки', 'уроків')} · ${course.sections.length} ${plural(course.sections.length, 'розділ', 'розділи', 'розділів')}</p>`}
        </div><div class="big-ico">${meta.icon}</div>
      </div>
      ${hasUnits(id) ? unitsCard(id, results) : ''}${hasKr(id) ? krCard(id, results) : ''}${simsCount(sims) ? simsCard(id, sims) : ''}${labs.length ? labsCard(id, labs) : ''}${drillCard(id, course)}
      ${course.sections.map(s => `
        <section class="section-block">
          <div class="section-head"><span class="sn" style="--sc:${s.color || meta.color}">${s.n}</span><h2>${esc(s.title)}</h2><span class="tag">${s.lessons.length} ${plural(s.lessons.length, 'урок', 'уроки', 'уроків')}</span></div>
          ${labs.filter(x => x.sec === s.n).map(x => `<a class="card sim-row lab-row" href="#/lab/${id}/${x.n}"><span class="sim-row-i">🔬</span><span><b>Лабораторна робота № ${x.n}: ${esc(x.title)}</b><small>Віртуальний дослід за підручником · до § ${lessonNo(id, x.lesson) || ''} · вимірювання, таблиця, висновок</small></span><span class="btn brand sm">Виконати</span></a>`).join('')}
          ${(sims[s.n] || []).map((x, i) => `<a class="card sim-row" href="#/sim/${id}/${s.n}/${i}"><span class="sim-row-i">🧪</span><span><b>Симуляція: ${esc(x.title)}</b><small>Інтерактивна модель до теми розділу · з завданнями</small></span><span class="btn brand sm">Відкрити</span></a>`).join('')}
          <div class="lesson-list">
            ${s.lessons.map(l => `
              <div class="card lesson-row">
                <span class="pnum" title="Параграф ${l.n}">§${l.n}</span><span class="ln">${l.emoji || '📘'}</span>
                <div><h3>${esc(l.title)}</h3><div class="meta">Урок ${l.n}${l.pages ? ' · ' + esc(pg(l.pages)) : ''} ${dateBadge(l)} ${status(l.id)}</div></div>
                <div class="lesson-actions">
                  <a class="btn light sm" href="#/slides/${id}/${l.id}">🎞 Презентація</a>
                  ${hasNotes(id) ? `<a class="btn light sm nt-btn" href="#/notes/${id}/${l.id}">📒 Конспект уроку</a>` : ''}
                  ${window.Games && Games.has(id, l.id) ? `<a class="btn light sm game-btn" href="#/games/${id}/${l.id}">🎮 Ігри</a>` : ''}
                  ${plans[l.id] ? (isStaff() ? `<a class="btn light sm" href="#/plan/${id}/${l.id}" title="План уроку й домашнє завдання">📋 План</a>` : (plans[l.id].hw ? `<a class="btn light sm" href="#/plan/${id}/${l.id}" title="Творче домашнє завдання">🏠 Д/з</a>` : '')) : ''}
                  ${testBtn(l.id, `#/test/${id}/lesson/${l.id}`, '📝 Тест')}
                  ${canJournal(id) ? `<a class="btn light sm j-btn" href="${journalHref(id, l.id)}" title="Журнал класу: виставити оцінки за урок">📒 Журнал</a>` : ''}
                  ${user.role === 'student' ? g(l.id) : ''}
                  ${user.role === 'student' && bm['mark:' + l.id] && bm['mark:' + l.id].best != null ? `<span class="grade ${gradeClass(bm['mark:' + l.id].best)}" title="Оцінка за урок від учителя">✍️ ${bm['mark:' + l.id].best}</span>` : ''}
                </div>
              </div>`).join('')}
            <div class="card lesson-row summary-row">
              <span class="pnum blank"></span><span class="ln">🏁</span>
              <div><h3>Підсумковий тест за розділ ${s.n}</h3><div class="meta">${C.sectionQuestions} питань · ${Math.round(C.sectionQuestions * C.secondsPerQuestion / 60)} хв ${status('section-' + s.n)}</div></div>
              <div class="lesson-actions">${testBtn('section-' + s.n, `#/test/${id}/section/${s.n}`, 'Почати', 'brand')}${user.role === 'student' ? g('section-' + s.n) : ''}</div>
            </div>
          </div>
        </section>`).join('')}
      <div class="card lesson-row summary-row final">
        <span class="pnum blank"></span><span class="ln">🏆</span>
        <div><h3>Річний підсумковий тест</h3><div class="meta">${C.finalQuestions} питань за весь курс · ${Math.round(C.finalQuestions * C.secondsPerQuestion / 60)} хв ${status('final')}</div></div>
        <div class="lesson-actions">${testBtn('final', `#/test/${id}/final`, 'Почати', 'brand')}${user.role === 'student' ? g('final') : ''}</div>
      </div>
      <div style="margin-top:22px">${sourceNote(course)}</div>`;
  }
  /* сторінки підручника для групи уроків: «5–8» + «9–12» → «5–12» */
  function pagesRange(lessons) {
    const parts = [...new Set(lessons.map(l => (String(l.pages || '').match(/^ч\.\s*(\d+)/) || [])[1] || ''))];
    if (parts.length > 1) return 'ч. ' + parts.join('–');
    const nums = lessons.map(l => String(l.pages || '').replace(/^ч\.\s*\d+,\s*с\.\s*/, '').split(/[–-]/).map(Number)).filter(a => a[0]);
    if (!nums.length) return '';
    return (parts[0] ? 'ч. ' + parts[0] + ', с. ' : '') + Math.min(...nums.map(a => a[0])) + '–' + Math.max(...nums.map(a => a[a.length - 1]));
  }
  /* «5–8» → «с. 5–8»; «ч. 2, с. 3–12» лишається як є */
  function pg(p) { p = String(p || ''); return /^\d/.test(p) ? 'с. ' + p : p; }

  /* ---------------- презентація ---------------- */
  async function renderSlides(id, lid) {
    const meta = catalogSubject(id);
    if (!meta || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    const course = await loadCourse(id);
    if (course.primary) document.body.classList.add('theme-primary');
    const lesson = course.sections.flatMap(s => s.lessons).find(l => l.id === lid);
    if (!lesson) throw new Error('Урок не знайдено');
    /* анімована теорія за підручником: data/courses/<курс>/t<розділ>.js (якщо є) */
    try { await loadScript(`data/courses/${id}/t${lesson.section.n}.js`); if (Slides.applyTheory) Slides.applyTheory(course); } catch (e) { /* теорії для розділу ще немає */ }
    try { await loadScript(`data/courses/${id}/p${lesson.section.n}.js`); if (Slides.applyPlans) Slides.applyPlans(course); } catch (e) { /* плану ще немає */ }
    Protect.set(true, user.role === 'student');
    view = Slides.run($app, lesson, {
      color: meta.color,
      testHref: `#/test/${id}/lesson/${lid}`,
      crumbs: `<a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span><span>${esc(lesson.section.title)}</span>`,
      source: sourceNote(course, lesson.pages),
      sourceText: bookLine(course) + (lesson.pages ? ', ' + esc(pg(lesson.pages)) : '')
    });
  }

  /* ---------------- план уроку (вчитель) і творче д/з ---------------- */
  const richText = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/==(.+?)==/g, '<mark>$1</mark>');
  async function loadPlans(id, course) {
    await Promise.all(course.sections.map(s => loadScript(`data/courses/${id}/p${s.n}.js`).catch(() => null)));
    return (window.PLANS || {})[id] || {};
  }
  /* ---------------- конспект уроку ----------------
     Власні (намальовані) конспекти лежать у data/notes/<курс>.js. Для решти уроків конспект
     складається автоматично з теорії параграфа (THEORY) — зі схемами, побудованими за її структурою. */
  const hasNotes = id => courseExists(id);
  const hasDrawnNotes = id => !!(AVAILABLE.find(c => c.id === id) || {}).notes;
  async function loadNotes(id) {
    window.NOTES = window.NOTES || {};
    if (!window.NOTES[id]) { if (hasDrawnNotes(id)) { try { await loadScript(`data/notes/${id}.js`); } catch (e) { /* немає */ } } window.NOTES[id] = window.NOTES[id] || {}; }
    return window.NOTES[id];
  }
  async function loadTheory(id, course, secs) {
    await Promise.all((secs || course.sections.map(s => s.n)).map(n => loadScript(`data/courses/${id}/t${n}.js`).catch(() => null)));
    return (window.THEORY || {})[id] || {};
  }
  const NT_COLORS = ['#4F46E5', '#0EA5E9', '#16A34A', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6', '#EF4444'];
  /* опорна схема (mind map) у SVG: центр і до 8 гілок */
  function ntMindMap(center, items, title) {
    const W = 620, H = 360, cx = W / 2, cy = H / 2, n = items.length, rx = 225, ry = 125;
    const wrap = (t, max) => { const w = String(t || '').split(/\s+/), out = []; let cur = ''; w.forEach(x => { if ((cur + ' ' + x).trim().length > max && cur) { out.push(cur); cur = x; } else cur = (cur + ' ' + x).trim(); }); if (cur) out.push(cur); return out.slice(0, 2); };
    let g = '';
    items.forEach((it, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / n, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a), c = NT_COLORS[i % NT_COLORS.length];
      g += `<path d="M${cx},${cy} Q${(cx + x) / 2 + 20 * Math.sin(a)},${(cy + y) / 2 - 20 * Math.cos(a)} ${x},${y}" stroke="${c}" stroke-width="3" fill="none" opacity=".55"/>`;
      const l1 = wrap(it[1], 16), l2 = wrap(it[2], 22);
      g += `<rect x="${x - 82}" y="${y - 34}" width="164" height="68" rx="16" fill="#fff" stroke="${c}" stroke-width="2.5"/>`
        + `<text x="${x - 70}" y="${y + 9}" font-size="22">${esc(it[0] || '')}</text>`
        + l1.map((t, k) => `<text x="${x - 40}" y="${y - 12 + k * 15}" font-size="13" font-weight="800" fill="#1F2340">${esc(t)}</text>`).join('')
        + l2.map((t, k) => `<text x="${x - 40}" y="${y + 8 + (l1.length - 1) * 15 + k * 13}" font-size="11" fill="#64748B">${esc(t)}</text>`).join('');
    });
    /* центр — емодзі або коротка назва теми */
    const isIco = [...String(center || '')].length <= 3;
    const ct = wrap(isIco ? (title || '') : center, 13).slice(0, 3);
    g += `<circle cx="${cx}" cy="${cy}" r="58" fill="#EEF2FF" stroke="#4F46E5" stroke-width="3"/>`
      + (isIco ? `<text x="${cx}" y="${cy - (ct.length ? 4 : -10)}" font-size="30" text-anchor="middle">${esc(center || '💡')}</text>` : '')
      + ct.map((t, k) => `<text x="${cx}" y="${isIco ? cy + 20 + k * 13 : cy + 5 - (ct.length - 1) * 8 + k * 16}" font-size="${isIco ? 11.5 : 14}" font-weight="800" text-anchor="middle" fill="#312E81">${esc(t)}</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Inter,Arial,sans-serif" role="img">${g}</svg>`;
  }
  function autoNotes(lesson, th) {
    const rt = richText, list = th || [];
    if (!list.length) return null;
    const defs = list.filter(x => x.type === 'tdef');
    const tf = (lesson.slides || []).filter(x => x.type === 'tf').flatMap(x => (x.items || []).filter(i => i[1] === true).map(i => i[0]));
    const words = ((lesson.slides || []).find(x => x.type === 'words') || {}).words || [];
    const blocks = [], formulas = [], ex = [];
    let mind = null, check = null;
    list.forEach((t, i) => {
      if (t.type === 'tdef') blocks.push({ h: t.term, p: [t.def || '', t.note || ''].filter(Boolean), icon: t.e, ex: t.ex || [] });
      else if (t.type === 'tgrid') blocks.push({ h: t.h, icon: t.e, p: t.lead ? [t.lead] : [], fig: `<div class="ntf-grid">${(t.items || []).map((it, k) => `<div class="ntf-card" style="--k:${NT_COLORS[k % NT_COLORS.length]}"><span class="ntf-i">${esc(it[0] || '')}</span><b>${rt(it[1] || '')}</b>${it[2] ? `<small>${rt(it[2])}</small>` : ''}</div>`).join('')}</div>` });
      else if (t.type === 'tcmp') blocks.push({ h: t.h, icon: t.e, fig: `<div class="ntf-cmp">${(t.cols || []).map((c, k) => `<div class="ntf-col" style="--k:${NT_COLORS[(k * 3) % NT_COLORS.length]}"><div class="ntf-ch">${esc(c[1] || '')} ${rt(c[0] || '')}</div><ul>${(c[2] || []).map(x => `<li>${rt(x)}</li>`).join('')}</ul></div>`).join('<div class="ntf-vs">vs</div>')}</div>` });
      else if (t.type === 'tflow') blocks.push({ h: t.h, icon: t.e, fig: `<div class="ntf-flow">${(t.items || []).map((it, k) => `<div class="ntf-step" style="--k:${NT_COLORS[k % NT_COLORS.length]}"><span class="ntf-i">${esc(it[0] || '')}</span><b>${rt(it[1] || '')}</b>${it[2] ? `<small>${rt(it[2])}</small>` : ''}</div>`).join('<span class="ntf-arr">➜</span>')}</div>` });
      else if (t.type === 'ttime') blocks.push({ h: t.h, icon: t.e, fig: `<div class="ntf-time">${(t.items || []).map((it, k) => `<div class="ntf-ev" style="--k:${NT_COLORS[k % NT_COLORS.length]}"><span class="ntf-d">${rt(it[0] || '')}</span><span class="ntf-t">${rt(it[1] || '')}</span></div>`).join('')}</div>` });
      else if (t.type === 'tsteps') ex.push(t);
      else if (t.type === 'tformula') (t.parts || []).forEach(pt => formulas.push([pt[0], [pt[1], pt[2]].filter(Boolean).join(' · ')]));
      else if (t.type === 'tmap') mind = t;
      else if (t.type === 'tx') check = t;
    });
    /* означення об’єднуємо з наступною схемою, щоб конспект був щільнішим */
    const merged = [];
    blocks.forEach(b => { const last = merged[merged.length - 1]; if (last && !last.fig && !b.fig && !(last.ex || []).length && !(b.ex || []).length && (last.p || []).length < 3 && (b.p || []).length === 1) { last.p.push(`**${b.h}** — ${b.p[0]}`); last.multi = true; } else merged.push(Object.assign({}, b, { p: (b.p || []).slice() })); });
    merged.forEach(b => { if (b.multi) { b.p[0] = `**${b.h}** — ${b.p[0]}`; b.h = 'Основні поняття'; } });
    const d0 = defs.find(d => d.def), idea = d0 ? (d0.def.length < 260 ? `**${d0.term}** — ${d0.def}` : d0.def) : (tf[0] || lesson.title);
    /* перше означення вже стоїть у «Головному» — не дублюємо його окремим блоком і в поняттях */
    if (d0 && merged.length > 1) { const k = merged.findIndex(b => !b.fig && !b.multi && b.h === d0.term && (b.p || []).length <= 2); if (k >= 0) { if ((merged[k].ex || []).length) merged[k].p = merged[k].p.slice(1); else merged.splice(k, 1); } }
    const plain = t => String(t || '').replace(/\*\*/g, '');
    const termList = defs.filter(d => d.def).slice(0, 8);
    return {
      idea, auto: true,
      blocks: merged.map(b => ({ h: b.h, p: b.p, fig: b.fig, icon: b.icon, ex: b.ex })),
      mind: mind ? ntMindMap(mind.center, (mind.items || []).slice(0, 8), mind.h) : null, mindTitle: mind ? mind.h : '',
      formulas, examples: ex,
      terms: termList.length > 1 ? termList.map(d => [d.term, plain(d.def).length > 160 ? plain(d.def).slice(0, 157).replace(/\s+\S*$/, '') + '…' : d.def]) : [],
      words,
      remember: tf.slice(0, 5),
      check: check ? check.pts || [] : []
    };
  }
  async function renderNotes(id, lid) {
    const meta = catalogSubject(id);
    if (!meta || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    $app.innerHTML = '<div class="loader"><span></span></div>';
    const course = await loadCourse(id);
    if (course.primary) document.body.classList.add('theme-primary');
    const lessons = course.sections.flatMap(s => s.lessons);
    const idx = lessons.findIndex(l => l.id === lid), lesson = lessons[idx];
    if (!lesson) { $app.innerHTML = `<div class="card empty"><span class="e">📒</span>Урок не знайдено</div>`; return; }
    const [notes, theory] = await Promise.all([loadNotes(id), loadTheory(id, course, [lesson.section.n])]);
    const hand = notes[lid];
    let x = hand && !hand.figs ? hand : autoNotes(lesson, theory[lid]);
    /* намальовані рисунки до автоматичного конспекту: figs = [{ h, svg, cap, p? }] — до блоку з такою назвою або окремим блоком */
    if (x && hand && hand.figs) {
      x = Object.assign({}, x, { blocks: x.blocks.slice() });
      if (hand.idea) x.idea = hand.idea;
      hand.figs.forEach(f => {
        const k = f.h ? x.blocks.findIndex(b => b.h === f.h && !b.svg) : -1;
        if (k >= 0) x.blocks[k] = Object.assign({}, x.blocks[k], { svg: f.svg, cap: f.cap, fig: null, figHtml: x.blocks[k].fig || null });
        else x.blocks.splice(f.at != null ? Math.min(f.at, x.blocks.length) : x.blocks.length, 0, { h: f.title || f.h || 'Схема', p: f.p || [], svg: f.svg, cap: f.cap, icon: f.icon || '🖼' });
      });
      ['formulas', 'remember'].forEach(k => { if (hand[k]) x[k] = (x[k] || []).concat(hand[k]); });
      if (hand.example) x.example = hand.example;
    }
    if (!x) { $app.innerHTML = `<div class="card empty"><span class="e">📒</span>Конспект до цього уроку ще готується</div>`; return; }
    const no = lessonNo(id, lid), pn = no != null ? '§ ' + no : 'Урок ' + lesson.n;
    const prev = lessons[idx - 1], next = lessons[idx + 1];
    const navLbl = l => { const n = lessonNo(id, l.id); return n != null ? '§ ' + n : 'Урок ' + l.n; };
    const rt = richText;
    const block = (b, i) => { const fig = b.svg || b.fig; const wide = b.fig && !b.svg;
      return `<section class="nt-block ${fig && !wide ? 'has-fig' : ''} ${wide ? 'wide-fig' : ''} ${i % 2 ? 'alt' : ''}">
        <div class="nt-txt"><h2>${b.icon ? `<span class="nt-ico">${esc(b.icon)}</span>` : ''}${rt(b.h || '')}</h2>${(b.p || []).map(t => `<p>${rt(t)}</p>`).join('')}${b.figHtml ? `<div class="nt-inline-fig">${b.figHtml}</div>` : ''}${(b.list || []).length ? `<ul>${b.list.map(t => `<li>${rt(t)}</li>`).join('')}</ul>` : ''}${(b.ex || []).length ? `<div class="nt-ex"><span class="nt-ex-l">Приклади:</span>${b.ex.map(t => `<span class="nt-ex-i">${rt(t)}</span>`).join('')}</div>` : ''}</div>
        ${fig ? `<figure class="nt-fig">${fig}${b.cap ? `<figcaption>${rt(b.cap)}</figcaption>` : ''}</figure>` : ''}</section>`; };
    const exHtml = e => `<section class="nt-box nt-example"><h2>✍️ ${e.h ? rt(e.h) : 'Приклад розв’язування'}</h2>${e.task || e.q ? `<p class="nt-q">${rt(e.task || e.q)}</p>` : ''}
        ${e.given ? `<div class="nt-given"><div><b>Дано:</b>${e.given.map(g => `<div>${rt(g)}</div>`).join('')}</div><div><b>Розв’язання:</b>${e.steps.map(g => `<div>${rt(g)}</div>`).join('')}</div></div>` : `<ol>${(e.steps || []).map(g => `<li>${rt(g)}</li>`).join('')}</ol>`}
        ${e.ans ? `<p class="nt-ans"><b>Відповідь:</b> ${rt(e.ans)}</p>` : ''}</section>`;
    const body = `
      <div class="nt-idea"><span>💡</span><div><b>Головне:</b> ${rt(x.idea || '')}</div></div>
      ${(x.blocks || []).map(block).join('')}
      ${x.mind ? `<section class="nt-box nt-mind"><h2>🧠 Опорна схема${x.mindTitle ? ': ' + rt(x.mindTitle) : ''}</h2><div class="nt-mind-fig">${x.mind}</div></section>` : ''}
      ${(x.formulas || []).length ? `<section class="nt-box nt-formulas"><h2>🧮 Формули й правила</h2><div class="nt-fgrid">${x.formulas.map(f => `<div class="nt-f"><div class="nt-fx">${rt(f[0])}</div>${f[1] ? `<div class="nt-fd">${rt(f[1])}</div>` : ''}</div>`).join('')}</div></section>` : ''}
      ${x.example ? exHtml(x.example) : ''}${(x.examples || []).map(exHtml).join('')}
      ${(x.terms || []).length ? `<section class="nt-box nt-terms"><h2>📖 Ключові поняття</h2><dl>${x.terms.map(t => `<dt>${rt(t[0])}</dt><dd>${rt(t[1])}</dd>`).join('')}</dl></section>` : ''}
      ${(x.words || []).length && !(x.terms || []).length ? `<section class="nt-box nt-terms"><h2>📖 Ключові слова</h2><div class="nt-words">${x.words.map(w => `<span>${esc(w)}</span>`).join('')}</div></section>` : ''}
      ${(x.remember || []).length ? `<section class="nt-box nt-rem"><h2>📌 Запам’ятай</h2><ul>${x.remember.map(t => `<li>${rt(t)}</li>`).join('')}</ul></section>` : ''}
      ${(x.check || []).length ? `<section class="nt-box nt-check"><h2>❓ Перевір себе</h2><ol>${x.check.map(t => `<li>${rt(t)}</li>`).join('')}</ol></section>` : ''}`;
    $app.innerHTML = `<div class="crumbs">${isStaff() ? `<a href="#/">Класи</a><span>›</span>` : ''}<a href="#/class/${meta.cls}">${meta.cls} клас</a><span>›</span><a href="#/course/${id}">${esc(meta.name)}</a><span>›</span><span>Конспект</span></div>
      <div class="nt-head" style="--c:${lesson.section.color || meta.color}">
        <div class="nt-badge">${esc(pn)}</div>
        <div><p class="nt-sec">Розділ ${lesson.section.n}. ${esc(lesson.section.title)}</p><h1>📒 ${esc(lesson.title)}</h1><p class="nt-meta">Конспект уроку${lesson.pages ? ' · підручник, ' + esc(pg(lesson.pages)) : ''}</p></div>
      </div>
      <div class="nt-tools"><a class="btn light sm" href="#/slides/${id}/${lid}">🎞 Презентація</a><a class="btn light sm" href="#/test/${id}/lesson/${lid}">📝 Тест</a>${canJournal(id) ? `<a class="btn light sm j-btn" href="${journalHref(id, lid)}">📒 Журнал</a>` : ''}<button class="btn light sm" id="ntPrint">🖨 Друк конспекту</button></div>
      <article class="nt-page" id="ntPage">${body}</article>
      <div class="nt-nav">${prev ? `<a class="btn light" href="#/notes/${id}/${prev.id}">← ${esc(navLbl(prev))}</a>` : '<span></span>'}<a class="btn light" href="#/course/${id}">До змісту</a>${next ? `<a class="btn brand" href="#/notes/${id}/${next.id}">${esc(navLbl(next))} →</a>` : '<span></span>'}</div>`;
    $app.querySelector('#ntPrint').onclick = () => {
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
      printHtml(`<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"><title>Конспект · ${esc(lesson.title)}</title>${links}<style>
        @page{size:A4 portrait;margin:12mm}body{background:#fff!important;padding:0!important}.nt-page{box-shadow:none!important;border:0!important;padding:0!important;background-image:none!important}.nt-block,.nt-box{break-inside:avoid}</style></head>
        <body><h1 style="font-size:20px;margin:0 0 4px">📒 ${esc(pn)}. ${esc(lesson.title)}</h1><p style="margin:0 0 12px;color:#64748B;font-size:12px">${esc(meta.name)} · ${meta.cls} клас · конспект уроку</p>${$app.querySelector('#ntPage').outerHTML}</body></html>`, 1200);
    };
  }
  async function renderPlan(id, lid) {
    const meta = catalogSubject(id);
    if (!meta || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    const course = await loadCourse(id);
    if (course.primary) document.body.classList.add('theme-primary');
    const lesson = course.sections.flatMap(s => s.lessons).find(l => l.id === lid);
    if (!lesson) throw new Error('Урок не знайдено');
    try { await loadScript(`data/courses/${id}/p${lesson.section.n}.js`); } catch (e) {}
    const x = ((window.PLANS || {})[id] || {})[lid] || {};
    const staff = isStaff(), key = `plan:${user.uid}:${id}:${lid}`;
    let done = {}; try { done = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
    const hw = x.hw ? `<div class="card plan-hw"><h2>${esc(x.hw.e || '🏠')} Домашнє завдання: ${esc(x.hw.t || '')}</h2>${(x.hw.p || []).map(t => `<p>${richText(t)}</p>`).join('')}${(x.hw.steps || []).length ? `<ol>${x.hw.steps.map(t => `<li>${richText(t)}</li>`).join('')}</ol>` : ''}</div>` : '<div class="empty"><span class="e">🏠</span>Домашнього завдання ще немає</div>';
    const plan = staff && x.plan ? `<div class="card plan-card"><div class="plan-top"><h2>📋 План уроку — чек-лист</h2><span class="plan-prog"></span><button class="btn light sm" id="plReset">Скинути позначки</button></div>${x.plan.goal ? `<p class="plan-goal"><b>Мета:</b> ${richText(x.plan.goal)}</p>` : ''}<ul class="plan-list">${(x.plan.items || []).map((t, i) => `<li><label><input type="checkbox" data-i="${i}" ${done[i] ? 'checked' : ''}><span>${richText(t)}</span></label></li>`).join('')}</ul></div>` : '';
    $app.innerHTML = `<div class="crumbs"><a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span><span>${esc(lesson.section.title)}</span></div>
      <div class="page-head"><div><h1>${staff ? '📋 План уроку' : '🏠 Домашнє завдання'}: ${esc(lesson.emoji || '')} ${esc(lesson.title)}</h1><p>Урок ${lesson.n}${lesson.pages ? ' · ' + esc(pg(lesson.pages)) : ''}</p></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn light" href="#/slides/${id}/${lid}">🎞 Презентація</a><a class="btn light" href="#/test/${id}/lesson/${lid}">📝 Тест</a>${staff ? '<button class="btn light" onclick="window.print()">🖨 Друк</button>' : ''}</div></div>
      ${plan}${hw}`;
    const prog = () => { const all = $app.querySelectorAll('.plan-list input'), n = [...all].filter(c => c.checked).length; const el = $app.querySelector('.plan-prog'); if (el) el.textContent = `виконано ${n} з ${all.length}`; };
    $app.querySelectorAll('.plan-list input').forEach(c => c.onchange = () => { done[c.dataset.i] = c.checked; try { localStorage.setItem(key, JSON.stringify(done)); } catch (e) {} prog(); });
    const rb = $app.querySelector('#plReset'); if (rb) rb.onclick = () => { done = {}; try { localStorage.removeItem(key); } catch (e) {} $app.querySelectorAll('.plan-list input').forEach(c => c.checked = false); prog(); };
    prog();
  }

  /* ---------------- ігри уроку ---------------- */
  async function renderGames(id, lid, gi) {
    const meta = catalogSubject(id);
    if (!meta || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    const course = await loadCourse(id);
    if (course.primary) document.body.classList.add('theme-primary');
    const lesson = course.sections.flatMap(s => s.lessons).find(l => l.id === lid);
    if (!lesson || !Games.has(id, lid)) throw new Error('Ігри до цього уроку не знайдено');
    const o = { uid: user.uid, course: id, lesson: lid, href: i => `#/games/${id}/${lid}/${i}`, menuHref: `#/games/${id}/${lid}` };
    const crumbs = `<div class="crumbs"><a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span>${gi != null ? `<a href="${o.menuHref}">Ігри</a><span>›</span><span>Гра ${+gi + 1}</span>` : '<span>Ігри</span>'}</div>`;
    $app.innerHTML = `${crumbs}
      <div class="page-head"><div><h1>🎮 ${esc(lesson.emoji || '')} ${esc(lesson.title)}</h1><p>Урок ${lesson.n} · ігри до уроку</p></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn light" href="#/slides/${id}/${lid}">🎞 Презентація</a><a class="btn light" href="#/test/${id}/lesson/${lid}">📝 Тест</a></div></div>
      <div id="gBox"></div>`;
    const box = $app.querySelector('#gBox');
    if (gi == null) Games.menu(box, o);
    else view = Object.assign({ active: false }, Games.play(box, o, +gi));
  }

  /* ---------------- тест ---------------- */
  async function renderTest(id, kind, key) {
    const meta = catalogSubject(id);
    if (!meta || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    const course = await loadCourse(id);
    if (course.primary) document.body.classList.add('theme-primary');
    const all = course.sections.flatMap(s => s.lessons);
    let pool, count, title, testId, sectionN = null, lessonId = null;
    if (kind === 'lesson') {
      const l = all.find(x => x.id === key); if (!l) throw new Error('Урок не знайдено');
      pool = l.questions; count = C.lessonQuestions; title = 'Тест: ' + l.title; testId = l.id; lessonId = l.id; sectionN = l.section.n;
    } else if (kind === 'section') {
      const s = course.sections.find(x => x.n === +key); if (!s) throw new Error('Розділ не знайдено');
      pool = s.lessons.flatMap(l => l.questions); count = C.sectionQuestions; title = `Підсумковий тест · Розділ ${s.n}. ${s.title}`; testId = 'section-' + s.n; sectionN = s.n;
    } else {
      pool = all.flatMap(l => l.questions); count = C.finalQuestions; title = 'Річний підсумковий тест'; testId = 'final'; kind = 'final';
    }
    const srcPages = kind === 'lesson' ? all.find(x => x.id === key).pages
      : kind === 'section' ? pagesRange(course.sections.find(x => x.n === +key).lessons) : pagesRange(all);
    if (user.role === 'student') {
      const mine = (await Store.myResults()).filter(r => r.course === id && r.testId === testId && r.passed);
      if (mine.length) {
        const best = Math.max(...mine.map(r => r.score));
        $app.innerHTML = `<div class="crumbs"><a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span><span>Тест</span></div>
          <div class="card result-card"><div class="m-emoji" style="font-size:64px">🔒</div>
            <h2>Тест уже виконано</h2><p class="muted" style="font-weight:700;margin-top:6px">${esc(title)}</p>
            <div class="score-big" style="color:${best >= 10 ? 'var(--ok)' : best >= 7 ? '#C67700' : '#C2410C'}">${best}<small> / ${C.maxScore}</small></div>
            <p style="font-weight:700;color:var(--ink-2)">Кожен тест можна пройти лише один раз.${lessonId ? ' Презентацію можна переглядати скільки завгодно.' : ''}</p>
            <div class="m-actions" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px">
              ${lessonId ? `<a class="btn light" href="#/slides/${id}/${lessonId}">🎞 Переглянути презентацію</a>` : ''}<a class="btn brand" href="#/course/${id}">До уроків</a></div></div>`;
        return;
      }
    }
    const start = () => {
      if (view) view.destroy();
      Protect.set(true, user.role === 'student');
      view = TestEngine.run($app, {
        title, primary: !!course.primary, student: user.role === 'student',
        questions: TestEngine.pick(pool, Math.min(count, pool.length)),
        backHref: '#/course/' + id,
        crumbs: `<a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span><span>Тест</span>`,
        source: sourceNote(course, srcPages),
        meta: { course: id, cls: user.cls || null, name: user.name, kind, testId, lessonId, sectionN, title },
        onSave: r => user.role === 'student' ? Store.saveResult(r) : Promise.resolve(),
        onRestart: () => { start(); window.scrollTo(0, 0); }
      });
    };
    start();
  }


  /* ---------------- тест «Префікси та одиниці вимірювання» (фізика) ---------------- */
  const hasUnits = id => /^physics/.test(id || '') && !!window.UNITS_TEST;
  /* ---- 🎯 тренажер базових знань: терміни, дати, поняття — з теорії курсу ---- */
  const DRILL_COURSES = /^(hist|geo|civic|law|nature)/;
  function drillCard(id, course) {
    if (!DRILL_COURSES.test(id)) return '';
    return `<a class="card lesson-row summary-row units-row sims-card" href="#/drill/${id}">
      <span class="ln">🎯</span>
      <div><h3>Тренажер базових знань</h3><div class="meta">Терміни, дати та поняття курсу · короткі раунди по 10 завдань · можна проходити скільки завгодно</div></div>
      <div class="lesson-actions"><span class="btn brand sm">Тренуватися</span></div></a>`;
  }
  async function drillItems(id, course) {
    await Promise.all(course.sections.map(s => loadScript(`data/courses/${id}/t${s.n}.js`).catch(() => null)));
    const th = (window.THEORY || {})[id] || {}, terms = [], dates = [], facts = [];
    const strip = t => String(t || '').replace(/\*\*|==/g, '').replace(/_\{([^}]*)\}/g, '$1').replace(/\^\{([^}]*)\}/g, '$1').trim();
    course.sections.forEach(sec => sec.lessons.forEach(l => (th[l.id] || []).forEach(sl => {
      const base = { sec: sec.n, lid: l.id, ln: l.n };
      if (sl.type === 'tdef' && sl.def && sl.term) { const k = strip(sl.term), first = k.split(/[\s(]/)[0]; let v = strip(sl.def).replace(/^[^—]{0,60}—\s*/, ''); if (first.length > 3) v = v.split(first).join('…'); terms.push(Object.assign({ k, v }, base)); }
      if (sl.type === 'ttime') (sl.items || []).forEach(([y, ev]) => { if (y && ev && /\d/.test(y)) dates.push(Object.assign({ k: strip(y), v: strip(ev) }, base)); });
      if (sl.type === 'tmap' || sl.type === 'tgrid') (sl.items || []).forEach(([e, n, d]) => { if (n && d && d.length > 6 && d !== '·') facts.push(Object.assign({ k: strip(n), v: strip(d), h: strip(sl.h || sl.center || '') }, base)); });
    })));
    return { terms, dates, facts };
  }
  async function renderDrill(id, secArg) {
    const meta = catalogSubject(id);
    if (!meta || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    $app.innerHTML = '<div class="loader"><span></span></div>';
    const course = await loadCourse(id); const all = await drillItems(id, course);
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    let mode = 'mix', sec = secArg ? +secArg : 0, round = null, best = +(localStorage.getItem('drillBest:' + id) || 0);
    const pool = kind => (all[kind] || []).filter(x => !sec || x.sec === sec);
    const make = () => {
      const kinds = mode === 'mix' ? ['terms', 'dates', 'facts'] : [mode];
      const tasks = [];
      for (let i = 0; i < 40 && tasks.length < 10; i++) {
        const kind = pick(kinds.filter(k => pool(k).length >= 4)); if (!kind) break;
        const P = pool(kind), it = pick(P), other = shuf((all[kind]).filter(x => x.v !== it.v && x.k !== it.k));
        if (other.length < 3) continue;
        const rev = Math.random() < 0.5;
        let q, right, wrong;
        if (kind === 'terms') { if (rev) { q = `Що означає поняття «${it.k}»?`; right = it.v; wrong = other.slice(0, 3).map(x => x.v); } else { q = `Яке поняття визначено так: «${it.v}»?`; right = it.k; wrong = other.slice(0, 3).map(x => x.k); } }
        else if (kind === 'dates') { if (rev) { q = `Коли: ${it.v}?`; right = it.k; wrong = [...new Set(other.map(x => x.k))].filter(x => x !== it.k).slice(0, 3); } else { q = `Що сталося: ${it.k}?`; right = it.v; wrong = other.slice(0, 3).map(x => x.v); } }
        else { q = rev ? `«${it.k}» — це…` : `${it.h ? it.h + ': ' : ''}про що йдеться — «${it.v}»?`; right = rev ? it.v : it.k; wrong = other.slice(0, 3).map(x => rev ? x.v : x.k); }
        if (wrong.length < 3 || tasks.some(t => t.q === q)) continue;
        tasks.push({ q, right, opts: shuf([right].concat(wrong)), it, kind });
      }
      return tasks;
    };
    const cnt = k => pool(k).length;
    const head = () => `<div class="crumbs"><a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span><span>Тренажер</span></div>
      <div class="course-hero" style="--c:${meta.color}"><div><h1>🎯 Тренажер базових знань</h1><p>Короткі раунди по 10 завдань: терміни, дати, поняття курсу «${esc(meta.name)}». Тренажер не впливає на оцінки — тренуйся, доки не відповідатимеш без помилок!</p></div><div class="big-ico">🧠</div></div>`;
    const drawStart = () => {
      $app.innerHTML = head() + `<div class="card pad drill-setup">
        <div class="field"><label>Що тренуємо</label><div class="sim-seg">${[['mix', '🎲 Усе разом'], ['terms', '📖 Терміни (' + cnt('terms') + ')'], ['dates', '📅 Дати (' + cnt('dates') + ')'], ['facts', '💡 Поняття й факти (' + cnt('facts') + ')']].filter(([k]) => k === 'mix' || cnt(k) >= 4).map(([k, t]) => `<button type="button" data-mode="${k}" class="${mode === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>
        <div class="field"><label>Розділ</label><select class="input" id="dSec"><option value="0">Увесь курс</option>${course.sections.map(s => `<option value="${s.n}" ${sec === s.n ? 'selected' : ''}>Розділ ${s.n}. ${esc(s.title)}</option>`).join('')}</select></div>
        <p class="muted" style="font-weight:700">Найкращий результат: <b>${best}/10</b></p>
        <button class="btn brand" id="dGo">▶ Почати раунд</button></div>`;
      $app.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; drawStart(); });
      $app.querySelector('#dSec').onchange = e => { sec = +e.target.value; drawStart(); };
      $app.querySelector('#dGo').onclick = () => { const t = make(); if (t.length < 4) { toast('Замало матеріалу для цього вибору — оберіть «Усе разом» або весь курс'); return; } round = { t, i: 0, ok: 0, streak: 0, wrong: [] }; drawQ(); };
    };
    const drawQ = () => {
      const r = round, t = r.t[r.i];
      $app.innerHTML = head() + `<div class="card pad drill-q"><div class="drill-top"><span>Завдання ${r.i + 1} з ${r.t.length}</span><span>✅ ${r.ok} · 🔥 ${r.streak}</span></div>
        <div class="progress-line"><i style="width:${r.i / r.t.length * 100}%"></i></div>
        <h2 class="drill-h">${esc(t.q)}</h2><div class="drill-opts">${t.opts.map((o, k) => `<button class="drill-opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>
        <div class="drill-fb" hidden></div></div>`;
      $app.querySelectorAll('.drill-opt').forEach(b => b.onclick = () => {
        if (r.done) return; r.done = true; const ok = t.opts[+b.dataset.k] === t.right;
        $app.querySelectorAll('.drill-opt').forEach(x => { x.disabled = true; if (t.opts[+x.dataset.k] === t.right) x.classList.add('ok'); });
        if (!ok) { b.classList.add('bad'); r.wrong.push(t); r.streak = 0; } else { r.ok++; r.streak++; }
        const fb = $app.querySelector('.drill-fb'); fb.hidden = false;
        fb.innerHTML = `${ok ? '✅ Правильно!' : '❌ Правильна відповідь виділена зеленим.'} <small class="muted">§ ${t.it.ln}</small> <button class="btn brand sm" id="dNext">${r.i + 1 < r.t.length ? 'Далі →' : 'Результат'}</button>`;
        fb.querySelector('#dNext').onclick = () => { r.done = false; r.i++; r.i < r.t.length ? drawQ() : drawEnd(); };
      });
    };
    const drawEnd = () => {
      const r = round; if (r.ok > best) { best = r.ok; try { localStorage.setItem('drillBest:' + id, best); } catch (e) {} }
      $app.innerHTML = head() + `<div class="card pad drill-end"><div class="m-emoji">${r.ok >= 9 ? '🏆' : r.ok >= 6 ? '👍' : '💪'}</div><h2>${r.ok} з ${r.t.length}</h2>
        <p class="muted" style="font-weight:700">${r.ok >= 9 ? 'Чудово! Ти добре знаєш матеріал.' : r.ok >= 6 ? 'Непогано! Повтори помилки й спробуй ще раз.' : 'Варто повторити теорію — і повернутися до тренажера.'}</p>
        ${r.wrong.length ? `<h3 class="rs-h">Повтори</h3><ul class="rs-list">${r.wrong.map(w => `<li><b>${esc(w.it.k)}</b> — ${esc(w.it.v)} <a href="#/slides/${id}/${w.it.lid}">§ ${w.it.ln} →</a></li>`).join('')}</ul>` : ''}
        <div class="m-actions"><button class="btn light" id="dSet">⚙️ Налаштування</button><button class="btn brand" id="dAgain">🔁 Ще раунд</button></div></div>`;
      $app.querySelector('#dAgain').onclick = () => { const t = make(); round = { t, i: 0, ok: 0, streak: 0, wrong: [] }; drawQ(); };
      $app.querySelector('#dSet').onclick = drawStart;
    };
    if (all.terms.length + all.dates.length + all.facts.length < 8) { $app.innerHTML = head() + '<div class="card empty"><span class="e">🎯</span>Тренажер для цього курсу ще готується.</div>'; return; }
    drawStart();
  }
  function unitsCard(id, results) {
    const mine = (results || []).filter(r => r.kind === 'units');
    const st = UnitsTest.stats(mine.sort((a, b) => (b.atMs || 0) - (a.atMs || 0)));
    return `<div class="card lesson-row summary-row units-row">
      <span class="ln">📏</span>
      <div><h3>${UnitsTest.TITLE}</h3><div class="meta">${UNITS_TEST.count} завдань · ${UNITS_TEST.minutes} хв · можна проходити скільки завгодно разів${user.role === 'student' ? ` · спроб: ${st.n}${st.best != null ? ', найкраща: ' + st.best : ''}` : ''}</div></div>
      <div class="lesson-actions">${isStaff() ? `<a class="btn light sm" href="#/teacher/results/units/${id}">📊 Статистика</a>` : ''}<a class="btn brand sm" href="#/units/${id}">Відкрити</a>${user.role === 'student' && st.best != null ? `<span class="grade ${gradeClass(st.best)}" title="Найкраща оцінка">${st.best}</span>` : ''}</div>
    </div>`;
  }
  function unitsMine(id, list) {
    list = list.slice().sort((a, b) => (b.atMs || 0) - (a.atMs || 0));
    const st = UnitsTest.stats(list);
    return `<div class="card pad" style="margin-top:16px"><h3 class="rs-h">📏 ${UnitsTest.TITLE}</h3>
      <p class="muted" style="font-weight:700">Спроб: ${st.n} · найкраща: ${st.best ?? '—'} · середня: ${st.avg ?? '—'}</p>
      ${UnitsTest.attemptsTable(list)}<a class="btn brand sm" style="margin-top:10px" href="#/units/${id}">Пройти тест</a></div>`;
  }
  async function renderUnits(id) {
    const meta = catalogSubject(id);
    if (!meta || !hasUnits(id) || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    const crumbs = `<div class="crumbs"><a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span><span>Префікси та одиниці</span></div>`;
    const student = user.role === 'student';
    const showIntro = () => {
      if (view) { view.destroy(); view = null; }
      Protect.set(student, false);
      window.scrollTo(0, 0);
      UnitsTest.intro($app, { meta, student, crumbs,
        statsHref: isStaff() ? `#/teacher/results/units/${id}` : '',
        myResults: async () => (await Store.myResults()).filter(r => r.course === id && r.kind === 'units'),
        onStart: start });
    };
    const start = () => {
      if (view) view.destroy();
      Protect.set(true, student);
      window.scrollTo(0, 0);
      view = UnitsTest.run($app, { meta, student, crumbs, backHref: '#/course/' + id,
        metaSave: { course: id, cls: user.cls || null, name: user.name },
        onSave: r => student ? Store.saveResult(r) : Promise.resolve(),
        onIntro: showIntro });
    };
    showIntro();
  }
  /* вкладка «Результати → Одиниці (фізика)» */
  function rsUnits(D, box, courseArg) {
    const subs = D.subs.filter(x => hasUnits(x.id));
    if (!subs.length) { box.innerHTML = `<div class="card empty"><span class="e">📏</span>Тест доступний для фізики 7–9 класів. Серед ваших предметів фізики немає.</div>`; return; }
    const cur = subs.find(x => x.id === courseArg) || subs.find(x => x.id === ss.getItem('unitsSub')) || subs[0];
    ss.setItem('unitsSub', cur.id);
    const studs = D.students.filter(s => s.cls === cur.cls);
    const rs = D.units.filter(r => r.course === cur.id);
    const rows = studs.map(s => { const l = rs.filter(r => r.uid === s.uid); return { s, l, st: UnitsTest.stats(l) }; })
      .sort((a, b) => (b.st.n ? 1 : 0) - (a.st.n ? 1 : 0) || a.s.name.localeCompare(b.s.name, 'uk'));
    const all = UnitsTest.stats(rs), active = rows.filter(r => r.st.n).length;
    const bestAvg = avg(rows.filter(r => r.st.n).map(r => r.st.best));
    box.innerHTML = `
      <div class="toolbar rs-filters"><label>Предмет: <select id="uSub">${subs.map(x => `<option value="${x.id}" ${x.id === cur.id ? 'selected' : ''}>${esc(x.name)} · ${x.cls} клас</option>`).join('')}</select></label>
        <a class="btn light sm" href="#/units/${cur.id}">📏 Відкрити тест</a><button class="btn light sm" id="uCsv">⬇️ CSV</button></div>
      <div class="stu-tiles">
        <div class="card st-big"><span class="st-ico">🧑‍🎓</span><div><b>${active} з ${studs.length}</b><span>учнів проходили</span></div></div>
        <div class="card st-big"><span class="st-ico">🔁</span><div><b>${all.n}</b><span>усього спроб</span></div></div>
        <div class="card st-big"><span class="st-ico">⭐</span><div><b>${all.avg ?? '—'}</b><span>середня оцінка спроб</span></div></div>
        <div class="card st-big"><span class="st-ico">🏆</span><div><b>${bestAvg ?? '—'}</b><span>середня з найкращих</span></div></div>
      </div>
      <div class="card table-wrap"><table class="tbl"><thead><tr><th>Учень</th><th class="c">Спроб</th><th class="c">Найкраща</th><th class="c">Середня</th><th class="c">Остання</th><th>Дата останньої</th><th></th></tr></thead><tbody>
        ${rows.map(r => `<tr><td style="font-weight:800">${esc(r.s.name)}</td><td class="c">${r.st.n || '—'}</td>
          <td class="c">${r.st.best != null ? `<span class="cell ${gradeClass(r.st.best)}">${r.st.best}</span>` : '—'}</td><td class="c">${r.st.avg ?? '—'}</td>
          <td class="c">${r.st.last ? `<span class="cell ${gradeClass(r.st.last.score)}">${r.st.last.score}</span>` : '—'}</td><td>${r.st.last ? fmtDate(r.st.last.atMs) : '—'}</td>
          <td>${r.st.n ? `<button class="btn light sm" data-uview="${r.s.uid}">Спроби →</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">У класі немає учнів</td></tr>'}
      </tbody></table></div>`;
    box.querySelector('#uSub').onchange = e => { location.hash = '#/teacher/results/units/' + e.target.value; };
    box.querySelector('#uCsv').onclick = () => downloadCsv(`odynytsi-${cur.id}.csv`, [['Учень', 'Клас', 'Дата', 'Оцінка', 'Правильно', 'Час, с']]
      .concat(rs.map(r => [(D.stuById[r.uid] || {}).name || r.name, cur.cls, fmtDate(r.atMs), r.score, r.full, r.durationSec])));
    box.querySelectorAll('[data-uview]').forEach(b => b.onclick = () => {
      const row = rows.find(r => r.s.uid === b.dataset.uview);
      const list = row.l.slice().sort((a, c) => (c.atMs || 0) - (a.atMs || 0));
      modal(`<h2>📏 ${esc(row.s.name)}</h2><p class="muted" style="font-weight:700">Спроб: ${row.st.n} · найкраща: ${row.st.best} · середня: ${row.st.avg}</p>
        ${UnitsTest.attemptsTable(list, true)}${unitsWeak(list)}<div class="m-actions"><button class="btn light" data-close>Закрити</button></div>`, m => {
        m.querySelectorAll('[data-udel]').forEach(x => x.onclick = async () => {
          if (!confirm('Видалити цю спробу?')) return;
          try { await Store.deleteResult(x.dataset.udel); D.units = D.units.filter(r => r.id !== x.dataset.udel); m.querySelector('[data-close]').click(); rsUnits(D, box, cur.id); toast('Спробу видалено'); }
          catch (e) { toast('Помилка: ' + e.message); }
        });
      }, { wide: true });
    });
  }
  /* які величини учню даються найважче */
  function unitsWeak(list) {
    const T = window.UNITS_TEST, c = {};
    list.forEach(r => (r.items || []).forEach(it => { const q = T.q[it.q]; if (!q) return; const e = c[q.cat] || (c[q.cat] = { n: 0, ok: 0 }); e.n++; if (it.ok) e.ok++; }));
    const ks = Object.keys(c).sort((a, b) => c[a].ok / c[a].n - c[b].ok / c[b].n);
    if (!ks.length) return '';
    return `<h3 class="rs-h" style="margin-top:14px">Успішність за величинами</h3><div class="u-weak">${ks.map(k => `<span class="tag ${c[k].ok / c[k].n < 0.5 ? 'warn' : 'ok'}">${esc(T.cats[k])}: ${c[k].ok}/${c[k].n}</span>`).join('')}</div>`;
  }



  /* ---------------- симуляції ---------------- */
  async function loadSims(id) {
    window.SIMS_DATA = window.SIMS_DATA || {};
    if (!window.SIMS_DATA[id]) { try { await loadScript(`data/sims/${id}.js`); } catch (e) { window.SIMS_DATA[id] = {}; } }
    return window.SIMS_DATA[id] || {};
  }
  const simsCount = sims => Object.values(sims || {}).reduce((a, l) => a + l.length, 0);
  const simsFlat = sims => Object.keys(sims).sort((a, b) => a - b).flatMap(n => sims[n].map((x, i) => ({ n: +n, i, x })));
  /* ---- лабораторні роботи (фізика 7–9) ---- */
  async function loadLabs(id) {
    if (!/^(physics[789]|nature[56]|geo[6789]|civic[79]|law9)$/.test(id)) return [];
    try { if (!window.Labs) await loadScript('js/labs.js'); if (!Labs.has(id)) await loadScript(`js/labs/${id}.js`); } catch (e) { console.warn('labs', e); return []; }
    return Labs.list(id);
  }
  function labsCard(id, labs) {
    return `<a class="card lesson-row summary-row units-row sims-card" href="#/lab/${id}">
      <span class="ln">🔬</span>
      <div><h3>Лабораторні роботи</h3><div class="meta">${labs.length} ${plural(labs.length, 'віртуальна лабораторна робота', 'віртуальні лабораторні роботи', 'віртуальних лабораторних робіт')} за підручником · досліди, вимірювання, звіт</div></div>
      <div class="lesson-actions"><span class="btn brand sm">Відкрити</span></div></a>`;
  }
  async function renderLab(id, n) {
    const meta = catalogSubject(id);
    if (!meta || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    $app.innerHTML = '<div class="loader"><span></span></div>';
    const course = await loadCourse(id); const labs = await loadLabs(id);
    const crumbs = `<div class="crumbs"><a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span>${n ? `<a href="#/lab/${id}">Лабораторні роботи</a><span>›</span><span>№ ${esc(n)}</span>` : '<span>Лабораторні роботи</span>'}</div>`;
    if (!n) {
      $app.innerHTML = `${crumbs}<div class="course-hero" style="--c:${meta.color}"><div><h1>🔬 Лабораторні роботи · ${esc(meta.name)}, ${meta.cls} клас</h1><p>Віртуальні досліди за підручником: збери установку, виконай вимірювання, заповни таблицю, обчисли результат і сформулюй висновок. Звіт можна роздрукувати або зберегти в PDF.</p></div><div class="big-ico">🧫</div></div>
        <div class="sim-grid">${labs.map(x => { const sec = course.sections.find(z => z.n === x.sec) || { title: '' };
          return `<a class="card sim-tile" href="#/lab/${id}/${x.n}"><span class="sim-tile-n" style="--sc:${sec.color || meta.color}">${x.n}</span><b>${esc(x.title)}</b><small>Розділ ${x.sec}. ${esc(sec.title)} · § ${lessonNo(id, x.lesson) || ''}</small></a>`; }).join('') || '<div class="card empty"><span class="e">🔬</span>Лабораторні роботи готуються.</div>'}</div>`;
      return;
    }
    const k = labs.findIndex(x => +x.n === +n); if (k < 0) { location.hash = '#/lab/' + id; return; }
    const L = labs[k], prev = labs[k - 1], next = labs[k + 1], sec = course.sections.find(z => z.n === L.sec) || { title: '' };
    const nav = `<div class="sim-nav">${prev ? `<a class="btn light sm" href="#/lab/${id}/${prev.n}">← № ${prev.n}</a>` : ''}<a class="btn light sm" href="#/lab/${id}">Усі роботи</a>${next ? `<a class="btn light sm" href="#/lab/${id}/${next.n}">№ ${next.n} →</a>` : ''}</div>`;
    view = Labs.open($app, id, n, { crumbs, nav, toast, subtitle: `${meta.name} · ${meta.cls} клас · Розділ ${L.sec}. ${sec.title} · до § ${lessonNo(id, L.lesson) || ''}` });
  }
  function simsCard(id, sims) {
    const n = simsCount(sims);
    return `<a class="card lesson-row summary-row units-row sims-card" href="#/sims/${id}">
      <span class="ln">🧪</span>
      <div><h3>Симуляції</h3><div class="meta">${n} ${plural(n, 'інтерактивна модель', 'інтерактивні моделі', 'інтерактивних моделей')} до тем курсу · досліди й завдання</div></div>
      <div class="lesson-actions"><span class="btn brand sm">Відкрити</span></div></a>`;
  }
  async function renderSimList(id) {
    const meta = catalogSubject(id);
    if (!meta || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    $app.innerHTML = '<div class="loader"><span></span></div>';
    const course = await loadCourse(id); const sims = await loadSims(id);
    $app.innerHTML = `<div class="crumbs"><a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span><span>Симуляції</span></div>
      <div class="course-hero" style="--c:${meta.color}"><div><h1>🧪 Симуляції · ${esc(meta.name)}, ${meta.cls} клас</h1><p>Інтерактивні моделі до кожної теми: змінюй параметри, спостерігай, роби висновки й перевіряй себе завданнями.</p></div><div class="big-ico">🔬</div></div>
      <div class="sim-grid">${course.sections.map(s => (sims[s.n] || []).map((x, i) => `<a class="card sim-tile" href="#/sim/${id}/${s.n}/${i}"><span class="sim-tile-n" style="--sc:${s.color || meta.color}">${s.n}</span><b>${esc(x.title)}</b><small>Розділ ${s.n}. ${esc(s.title)}</small></a>`).join('')).join('') || '<div class="card empty"><span class="e">🧪</span>Симуляції для цього курсу ще готуються.</div>'}</div>`;
  }
  async function renderSim(id, n, i) {
    const meta = catalogSubject(id);
    if (!meta || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    $app.innerHTML = '<div class="loader"><span></span></div>';
    const course = await loadCourse(id); const sims = await loadSims(id);
    const list = simsFlat(sims), k = list.findIndex(x => x.n === +n && x.i === +(i || 0));
    if (k < 0) { location.hash = '#/sims/' + id; return; }
    const cur = list[k], sec = course.sections.find(s => s.n === cur.n) || { title: '' };
    const prev = list[k - 1], next = list[k + 1];
    const nav = `<div class="sim-nav">${prev ? `<a class="btn light sm" href="#/sim/${id}/${prev.n}/${prev.i}">← Попередня</a>` : ''}<a class="btn light sm" href="#/sims/${id}">Усі симуляції</a>${next ? `<a class="btn light sm" href="#/sim/${id}/${next.n}/${next.i}">Наступна →</a>` : ''}</div>`;
    view = await Sims.open($app, { course: id, sim: cur.x, loadScript, nav,
      subtitle: `${meta.name} · ${meta.cls} клас · Розділ ${cur.n}. ${sec.title}`,
      crumbs: `<div class="crumbs"><a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span><a href="#/sims/${id}">Симуляції</a><span>›</span><span>${esc(cur.x.title)}</span></div>` });
  }

  /* ---------------- контрольні роботи з математики (5–6 кл.) ---------------- */
  const hasKr = id => /^math[56]$/.test(id || '');
  const krStats = list => { const n = list.length, g = list.map(r => r.score); return { n, best: n ? Math.max(...g) : null, avg: n ? avg(g) : null, last: n ? list.slice().sort((a, b) => (b.atMs || 0) - (a.atMs || 0))[0] : null }; };
  function krCard(id, results) {
    const mine = (results || []).filter(r => r.kind === 'kr');
    const works = new Set(mine.map(r => r.krN)).size;
    return `<div class="card lesson-row summary-row units-row kr-row">
      <span class="ln">📝</span>
      <div><h3>Контрольні роботи</h3><div class="meta">Теми та варіанти зі збірника · без обмеження часу · з розв’язками${user.role === 'student' ? ` · виконано робіт: ${works}` : ''}</div></div>
      <div class="lesson-actions">${isStaff() ? `<a class="btn light sm" href="#/teacher/results/kr/${id}">📊 Статистика</a>` : ''}<a class="btn brand sm" href="#/kr/${id}">Відкрити</a></div>
    </div>`;
  }
  function krAttempts(list, withDel) {
    if (!list.length) return '<p class="muted" style="font-weight:700">Ще немає спроб.</p>';
    list = list.slice().sort((a, b) => (b.atMs || 0) - (a.atMs || 0));
    return `<div class="table-wrap"><table class="tbl"><thead><tr><th>Дата</th><th>Робота</th><th class="c">Оцінка</th><th class="c">Правильно</th>${withDel ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map(r => `<tr><td>${fmtDate(r.atMs)}</td><td>№ ${r.krN}, варіант ${r.krV}</td><td class="c"><span class="cell ${gradeClass(r.score)}">${r.score}</span></td><td class="c">${r.full ?? '—'} з ${r.total ?? '—'}</td>${withDel ? `<td><button class="btn light sm" data-kdel="${esc(r.id)}" title="Видалити спробу">🗑</button></td>` : ''}</tr>`).join('')}
    </tbody></table></div>`;
  }
  function krMine(id, list) {
    const st = krStats(list);
    return `<div class="card pad" style="margin-top:16px"><h3 class="rs-h">📝 Контрольні роботи</h3>
      <p class="muted" style="font-weight:700">Спроб: ${st.n} · найкраща: ${st.best ?? '—'} · середня: ${st.avg ?? '—'}</p>
      ${krAttempts(list)}<a class="btn brand sm" style="margin-top:10px" href="#/kr/${id}">До контрольних робіт</a></div>`;
  }
  async function renderKr(id, n, v) {
    const meta = catalogSubject(id);
    if (!meta || !hasKr(id) || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    $app.innerHTML = '<div class="loader"><span></span></div>';
    await loadScript('data/kr.js');
    const K = (window.KR || {})[id]; if (!K) throw new Error('Контрольні роботи не знайдено');
    const student = user.role === 'student';
    const mine = student ? (await Store.myResults()).filter(r => r.course === id && r.kind === 'kr') : [];
    const crumbsBase = `<a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span>`;
    if (n) {
      const w = K.works.find(x => x.n === +n); const vv = +v || 1;
      if (!w || !w.v[vv]) { location.hash = '#/kr/' + id; return; }
      Protect.set(student, false);
      view = KRTest.run($app, { course: id, work: w, v: vv, student, backHref: '#/kr/' + id,
        varHref: x => `#/kr/${id}/${w.n}/${x}`,
        crumbs: `<div class="crumbs">${crumbsBase}<a href="#/kr/${id}">Контрольні роботи</a><span>›</span><span>№ ${w.n}</span></div>`,
        onSave: r => Store.saveResult(Object.assign({ course: id, cls: user.cls || null, name: user.name }, r)) });
      return;
    }
    const cell = (w, vv) => { const l = mine.filter(r => r.krN === w.n && r.krV === vv); const st = krStats(l);
      return `<a class="kr-var ${st.best != null ? 'tried' : ''}" href="#/kr/${id}/${w.n}/${vv}"><b>Варіант ${vv}</b>${student ? (st.n ? `<span>спроб: ${st.n}</span><span class="cell ${gradeClass(st.best)}">${st.best}</span>` : '<span>не виконано</span>') : '<span>відкрити →</span>'}</a>`; };
    const all = krStats(mine);
    $app.innerHTML = `<div class="crumbs">${crumbsBase}<span>Контрольні роботи</span></div>
      <div class="course-hero" style="--c:${meta.color}"><div><h1>📝 Контрольні роботи · ${meta.cls} клас</h1><p>${esc(K.book)}</p>
        ${student ? `<p style="font-size:14px;margin-top:6px">Моїх спроб: ${all.n}${all.best != null ? ` · найкраща оцінка: ${all.best} · середня: ${all.avg}` : ''}</p>` : ''}</div><div class="big-ico">🧮</div></div>
      <div class="flag-box kr-info">💡 Час не обмежено. Відповіді вписуй у поля: дріб — <b>5/9</b>, мішане число — <b>4 2/7</b>, десятковий — <b>0,7</b>, кілька відповідей — через <b>;</b>. Після перевірки до кожної помилки з’явиться розв’язання. Кожну роботу можна проходити кілька разів.
        ${isStaff() ? ` <a href="#/teacher/results/kr/${id}"><b>📊 Статистика класу</b></a>` : ''}</div>
      <div class="kr-list">${K.works.map(w => `<div class="card kr-item"><span class="kr-num">${w.n}</span><div class="kr-it"><h3>Контрольна робота № ${w.n}</h3><p>${esc(w.topic)}</p></div>
        <div class="kr-vars">${[1, 2].filter(x => w.v[x]).map(x => cell(w, x)).join('')}</div></div>`).join('')}</div>
      ${student ? `<div class="card pad" style="margin-top:18px"><h3 class="rs-h">📈 Мої спроби</h3>${krAttempts(mine)}</div>` : ''}`;
  }
  /* вкладка «Результати → Контрольні (математика)» */
  async function rsKr(D, box, courseArg) {
    const subs = D.subs.filter(x => hasKr(x.id));
    if (!subs.length) { box.innerHTML = `<div class="card empty"><span class="e">📝</span>Контрольні роботи доступні для математики 5–6 класів. Серед ваших предметів таких немає.</div>`; return; }
    await loadScript('data/kr.js');
    const cur = subs.find(x => x.id === courseArg) || subs.find(x => x.id === ss.getItem('krSub')) || subs[0];
    ss.setItem('krSub', cur.id);
    const K = window.KR[cur.id], works = K.works;
    const studs = D.students.filter(s => s.cls === cur.cls);
    const rs = D.krs.filter(r => r.course === cur.id);
    const rows = studs.map(s => { const l = rs.filter(r => r.uid === s.uid); return { s, l, st: krStats(l) }; });
    const all = krStats(rs);
    box.innerHTML = `
      <div class="toolbar rs-filters"><label>Предмет: <select id="kSub">${subs.map(x => `<option value="${x.id}" ${x.id === cur.id ? 'selected' : ''}>${esc(x.name)} · ${x.cls} клас</option>`).join('')}</select></label>
        <a class="btn light sm" href="#/kr/${cur.id}">📝 Відкрити контрольні</a><button class="btn light sm" id="kCsv">⬇️ CSV</button></div>
      <div class="stu-tiles">
        <div class="card st-big"><span class="st-ico">🧑‍🎓</span><div><b>${rows.filter(r => r.st.n).length} з ${studs.length}</b><span>учнів виконували</span></div></div>
        <div class="card st-big"><span class="st-ico">🔁</span><div><b>${all.n}</b><span>усього спроб</span></div></div>
        <div class="card st-big"><span class="st-ico">⭐</span><div><b>${all.avg ?? '—'}</b><span>середня оцінка</span></div></div>
      </div>
      <p class="muted" style="font-weight:700;margin:6px 0 10px">У клітинці — найкраща оцінка за роботу (будь-який варіант) і кількість спроб. Натисніть на ім’я учня, щоб побачити всі спроби.</p>
      <div class="card table-wrap"><table class="tbl kr-grid"><thead><tr><th>Учень</th>${works.map(w => `<th class="c" title="${esc(w.topic)}">№ ${w.n}</th>`).join('')}<th class="c">Середня</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td><a href="#" data-kview="${r.s.uid}" style="font-weight:800">${esc(r.s.name)}</a></td>${works.map(w => { const l = r.l.filter(x => x.krN === w.n); if (!l.length) return '<td class="c muted">—</td>'; const b = Math.max(...l.map(x => x.score)); return `<td class="c"><span class="cell ${gradeClass(b)}">${b}</span><small class="muted"> ×${l.length}</small></td>`; }).join('')}
          <td class="c">${(() => { const bs = works.map(w => r.l.filter(x => x.krN === w.n)).filter(l => l.length).map(l => Math.max(...l.map(x => x.score))); return bs.length ? avg(bs) : '—'; })()}</td></tr>`).join('') || `<tr><td colspan="${works.length + 2}" class="muted">У класі немає учнів</td></tr>`}
      </tbody></table></div>`;
    box.querySelector('#kSub').onchange = e => { location.hash = '#/teacher/results/kr/' + e.target.value; };
    box.querySelector('#kCsv').onclick = () => downloadCsv(`kontrolni-${cur.id}.csv`, [['Учень', 'Клас', 'Дата', 'Робота', 'Варіант', 'Оцінка', 'Правильно', 'Завдань']]
      .concat(rs.map(r => [(D.stuById[r.uid] || {}).name || r.name, cur.cls, fmtDate(r.atMs), r.krN, r.krV, r.score, r.full, r.total])));
    box.querySelectorAll('[data-kview]').forEach(a => a.onclick = e => {
      e.preventDefault();
      const row = rows.find(r => r.s.uid === a.dataset.kview);
      modal(`<h2>📝 ${esc(row.s.name)}</h2><p class="muted" style="font-weight:700">Спроб: ${row.st.n} · найкраща: ${row.st.best ?? '—'} · середня: ${row.st.avg ?? '—'}</p>${krAttempts(row.l, true)}<div class="m-actions"><button class="btn light" data-close>Закрити</button></div>`, m => {
        m.querySelectorAll('[data-kdel]').forEach(x => x.onclick = async () => {
          if (!confirm('Видалити цю спробу?')) return;
          try { await Store.deleteResult(x.dataset.kdel); D.krs = D.krs.filter(r => r.id !== x.dataset.kdel); m.querySelector('[data-close]').click(); rsKr(D, box, cur.id); toast('Спробу видалено'); }
          catch (err) { toast('Помилка: ' + err.message); }
        });
      }, { wide: true });
    });
  }

  /* ---------------- мої результати ---------------- */
  /* =====================================================================
     УЧЕНЬ: «Мої предмети» і «Мої результати» — швидкий огляд за предметами.
     Списки тестів беруться з легкого переліку уроків (data/lessons-index.js),
     тож важкі матеріали презентацій не завантажуються.
     ===================================================================== */
  async function testsOf(id) {
    const ix = (window.LESSON_INDEX || {})[id];
    if (!ix) { const c = await loadCourse(id); return { tests: courseTests(c, id), sections: c.sections.map(s => ({ n: s.n, title: s.title, lessons: s.lessons.map(l => l.id) })) }; }
    const tests = [], sections = [];
    ix.s.forEach(([n, title]) => {
      const ls = ix.l.filter(l => l[3] === n);
      ls.forEach(([lid, ln, lt, , em]) => tests.push({ key: lid, title: '§ ' + ln + '. ' + lt, short: '§ ' + ln, emoji: em || '📘', href: `#/test/${id}/lesson/${lid}`, slides: `#/slides/${id}/${lid}`, lesson: true }));
      tests.push({ key: 'section-' + n, title: 'Підсумковий тест за розділ ' + n + ' «' + title + '»', short: 'Розділ ' + n, emoji: '🏁', href: `#/test/${id}/section/${n}`, summary: true });
      sections.push({ n, title, lessons: ls.map(l => l[0]) });
    });
    tests.push({ key: 'final', title: 'Річний підсумковий тест', short: 'Річний', emoji: '🏆', href: `#/test/${id}/final`, summary: true });
    return { tests, sections };
  }
  /* зведення по кожному предмету учня */
  async function studentSummary() {
    const k = classInfo(user.cls);
    const subs = (k ? visibleSubjects(k) : []).filter(s => s.ready);
    const [allRes, infos] = await Promise.all([Store.myResults(), Promise.all(subs.map(s => testsOf(s.id)))]);
    const results = allRes.filter(r => r.kind !== 'units' && r.kind !== 'kr'), units = allRes.filter(r => r.kind === 'units'), krs = allRes.filter(r => r.kind === 'kr');
    return { k, results, units, krs, items: subs.map((s, i) => {
      const { tests, sections } = infos[i];
      const rs = results.filter(r => r.course === s.id).sort((a, b) => (b.atMs || 0) - (a.atMs || 0));
      const bm = bestMap(rs);
      const done = t => !!(bm[t.key] && bm[t.key].best != null);
      const plan = lessonPlan(s.id);
      const todo = tests.filter(t => !done(t)).map(t => { const pl = plan && plan.byId[t.key];
        return Object.assign({ subject: s, date: pl ? pl.date : '', overdue: !!(pl && lessonPast(pl.date, pl.slot)) }, t); });
      const lessonTests = tests.filter(t => t.lesson);
      const lessonBest = lessonTests.map(t => bm[t.key] && bm[t.key].best).filter(v => v != null);
      const allBest = tests.map(t => bm[t.key] && bm[t.key].best).filter(v => v != null);
      const nextLesson = plan ? plan.lessons.find(l => !lessonPast(l.date, l.slot)) : null;
      return { s, tests, sections, rs, bm, todo, overdue: todo.filter(t => t.overdue).sort((a, b) => a.date.localeCompare(b.date)),
        doneCount: tests.length - todo.length, total: tests.length, lessonDone: lessonBest.length, lessonTotal: lessonTests.length,
        avg: avg(allBest), allBest, last: rs.length ? rs[0].atMs : 0, nextLesson };
    }) };
  }
  const ring = (v, color) => `<span class="ring" style="--p:${Math.round(v * 100)};--rc:${color}"><b>${Math.round(v * 100)}%</b></span>`;

  async function renderStudentHome(k) {
    $app.innerHTML = `<div class="page-head"><div><h1>Привіт, ${esc(user.name.split(' ').slice(-1)[0])}! 👋</h1><p>${k.cls} клас · твої предмети й завдання</p></div></div><div class="loader"><span></span></div>`;
    const here = location.hash;
    const D = await studentSummary();
    if (location.hash !== here) return;
    const it = D.items;
    const soon = visibleSubjects(k).filter(s => !s.ready);
    const done = it.reduce((a, x) => a + x.doneCount, 0), total = it.reduce((a, x) => a + x.total, 0);
    const overdue = it.flatMap(x => x.overdue).sort((a, b) => a.date.localeCompare(b.date));
    const scores = it.flatMap(x => x.allBest);
    const upcoming = it.map(x => x.nextLesson && Object.assign({ s: x.s }, x.nextLesson)).filter(Boolean).sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))[0];
    /* що зробити: спершу борги за минулі уроки, далі — наступний тест кожного предмета */
    const queue = overdue.concat(it.map(x => x.todo.find(t => !t.overdue)).filter(Boolean));
    const filt = ss.getItem('stTodoF') || 'all';
    $app.innerHTML = `<div class="page-head"><div><h1>Привіт, ${esc(user.name.split(' ').slice(-1)[0])}! 👋</h1><p>${k.cls} клас · твої предмети й завдання</p></div>
        <a class="btn light hide-mob" href="#/my">📊 Мої результати</a></div>
      <div class="stu-tiles">
        <div class="card st-big">${ring(total ? done / total : 0, '#2BB673')}<div><b>${done} з ${total}</b><span>тестів виконано</span></div></div>
        <div class="card st-big"><span class="st-ico">⭐</span><div><b>${avg(scores) ?? '—'}</b><span>середній бал</span></div></div>
        <div class="card st-big ${overdue.length ? 'warn' : ''}"><span class="st-ico">${overdue.length ? '⏰' : '✅'}</span><div><b>${overdue.length ? overdue.length : SCHED ? 'Немає' : '—'}</b><span>${overdue.length ? plural(overdue.length, 'тест', 'тести', 'тестів') + ' за уроки, що вже були' : SCHED ? 'боргів за минулі уроки' : 'дати уроків не підключено'}</span></div></div>
        ${upcoming ? `<div class="card st-big"><span class="st-ico">📅</span><div><b>${fmtDay(upcoming.date)}</b><span>${esc(upcoming.s.name)}: урок ${upcoming.n}</span></div></div>` : ''}
      </div>
      ${it.length ? `<div class="card todo-card">
        <div class="todo-head"><h2>🔔 Що зробити зараз</h2>
          <div class="fchips" id="todoChips"><button class="fchip ${filt === 'all' ? 'on' : ''}" data-f="all">Усе</button>${it.map(x => `<button class="fchip ${filt === x.s.id ? 'on' : ''}" data-f="${x.s.id}">${esc(x.s.icon)} ${esc(x.s.name)}${x.overdue.length ? ` <i class="b">${x.overdue.length}</i>` : ''}</button>`).join('')}</div></div>
        <div id="todoList"></div></div>` : ''}
      <h2 class="stu-h">Мої предмети</h2>
      <div class="subj-cards">${it.map(x => `
        <div class="card subj-card" style="--c:${esc(k.color)}">
          <a class="sc-top" href="#/course/${x.s.id}"><span class="sc-ico">${x.s.icon}</span><span class="sc-name"><b>${esc(x.s.name)}</b><small>${x.lessonDone} з ${x.lessonTotal} уроків · ${x.last ? 'останній тест ' + fmtDate(x.last).split(',')[0] : 'тестів ще не було'}</small></span>
            ${x.avg != null ? `<span class="cell ${gradeClass(x.avg)}" title="Середній бал">${x.avg}</span>` : ''}</a>
          <div class="sc-bar"><i style="width:${x.total ? x.doneCount / x.total * 100 : 0}%"></i></div>
          <div class="sc-foot">${x.overdue.length ? `<span class="tag warn">⏰ ${x.overdue.length} за минулі уроки</span>` : x.todo.length ? '' : '<span class="tag ok">🎉 усе виконано</span>'}
            ${x.todo.length ? `<a class="btn brand sm" href="${(x.overdue[0] || x.todo[0]).href}">▶ ${esc((x.overdue[0] || x.todo[0]).short)}</a>` : ''}
            <a class="btn light sm" href="#/course/${x.s.id}">Відкрити</a></div>
        </div>`).join('')}
        ${soon.map(s => `<div class="card subj-card soon"><div class="sc-top"><span class="sc-ico">${s.icon}</span><span class="sc-name"><b>${esc(s.name)}</b><small>⏳ матеріали готуються</small></span></div></div>`).join('')}
      </div>`;
    const drawTodo = () => {
      const f = ss.getItem('stTodoF') || 'all';
      const list = f === 'all' ? queue : (() => { const x = it.find(y => y.s.id === f); return x ? x.overdue.concat(x.todo.filter(t => !t.overdue)) : []; })();
      const box = document.getElementById('todoList'); if (!box) return;
      const lim = +(box.dataset.lim || 5);
      box.innerHTML = list.length ? `<div class="rem-list">${list.slice(0, lim).map(t => `
          <a class="rem-item ${t.overdue ? 'overdue' : ''}" href="${t.href}"><span class="ri-emoji">${t.overdue ? '⏰' : t.emoji}</span>
            <span class="ri-text"><small>${esc(t.subject.name)} · ${esc(t.short)}${t.date ? ` · урок ${t.overdue ? 'був' : 'буде'} ${fmtDay(t.date)}` : ''}</small><b>${esc(t.title)}</b></span><span class="ri-go">→</span></a>`).join('')}</div>
        ${list.length > lim ? `<button class="btn light sm more-btn" id="todoMore">Показати ще ${Math.min(10, list.length - lim)} з ${list.length - lim}</button>` : ''}`
        : `<p class="todo-done">🎉 ${f === 'all' ? 'Усі тести виконано! Презентації можна переглядати скільки завгодно.' : 'З цього предмета все виконано!'}</p>`;
      const m = box.querySelector('#todoMore'); if (m) m.onclick = () => { box.dataset.lim = lim + 10; drawTodo(); };
    };
    $app.querySelectorAll('#todoChips .fchip').forEach(c => c.onclick = () => {
      ss.setItem('stTodoF', c.dataset.f); $app.querySelectorAll('#todoChips .fchip').forEach(x => x.classList.toggle('on', x === c));
      document.getElementById('todoList').dataset.lim = 5; drawTodo();
    });
    drawTodo();
  }

  async function renderMy(tabArg) {
    $app.innerHTML = '<div class="loader"><span></span></div>';
    const D = await studentSummary();
    const it = D.items;
    const head = `<div class="page-head"><div><h1>Мої результати</h1><p>${esc(user.name)} · ${user.cls} клас</p></div></div>`;
    if (!it.length) { $app.innerHTML = head + `<div class="card empty"><span class="e">📭</span>Поки немає курсів</div>`; return; }
    let tab = tabArg || ss.getItem('myTab') || 'all';
    if (tab !== 'all' && !it.some(x => x.s.id === tab)) tab = 'all';
    ss.setItem('myTab', tab);
    const scores = it.flatMap(x => x.allBest), attempts = it.reduce((a, x) => a + x.rs.length, 0);
    const done = it.reduce((a, x) => a + x.doneCount, 0), total = it.reduce((a, x) => a + x.total, 0);
    const tabs = `<nav class="rs-tabs my-tabs"><a href="#/my/all" class="${tab === 'all' ? 'on' : ''}">📊 Усі предмети</a>${it.map(x => `<a href="#/my/${x.s.id}" class="${tab === x.s.id ? 'on' : ''}">${esc(x.s.icon)} ${esc(x.s.name)}${x.avg != null ? ` <span class="t-avg">${x.avg}</span>` : ''}</a>`).join('')}</nav>`;
    if (tab === 'all') {
      $app.innerHTML = head + tabs + `
        <div class="stu-tiles">
          <div class="card st-big">${ring(total ? done / total : 0, '#2BB673')}<div><b>${done} з ${total}</b><span>тестів виконано</span></div></div>
          <div class="card st-big"><span class="st-ico">⭐</span><div><b>${avg(scores) ?? '—'}</b><span>середній бал</span></div></div>
          <div class="card st-big"><span class="st-ico">🎯</span><div><b>${scores.filter(v => v >= 10).length}</b><span>тестів на високий рівень</span></div></div>
          <div class="card st-big"><span class="st-ico">🔁</span><div><b>${attempts}</b><span>усього спроб</span></div></div>
        </div>
        <div class="card pad"><h3 class="rs-h">🎯 Мої рівні</h3>${levelBars(scores)}</div>
        <div class="card table-wrap" style="margin-top:16px"><table class="tbl"><thead><tr><th>Предмет</th><th style="min-width:150px">Виконано</th><th class="c">Середній</th><th class="c">За розділи</th><th class="c">Річний</th><th class="c">Спроб</th><th></th></tr></thead><tbody>
          ${it.map(x => { const sec = x.sections.map(s => x.bm['section-' + s.n] && x.bm['section-' + s.n].best).filter(v => v != null); const fin = x.bm.final && x.bm.final.best;
            return `<tr><td style="font-weight:800">${esc(x.s.icon)} ${esc(x.s.name)}</td><td>${doneBar(x.total ? x.doneCount / x.total : 0)}</td>
              <td class="c"><span class="cell ${gradeClass(x.avg)}">${x.avg ?? '—'}</span></td><td class="c">${avg(sec) ?? '—'} <small class="muted">(${sec.length}/${x.sections.length})</small></td>
              <td class="c">${fin != null ? `<span class="cell ${gradeClass(fin)}">${fin}</span>` : '—'}</td><td class="c">${x.rs.length}</td>
              <td><a class="btn light sm" href="#/my/${x.s.id}">Детально →</a></td></tr>`; }).join('')}</tbody></table></div>
        <div class="card pad" style="margin-top:16px"><h3 class="rs-h">🕒 Останні спроби</h3>${myAttempts(D.results.slice().sort((a, b) => (b.atMs || 0) - (a.atMs || 0)).slice(0, 8), true)}</div>`;
      return;
    }
    const x = it.find(y => y.s.id === tab);
    const sec = x.sections.map(s => x.bm['section-' + s.n] && x.bm['section-' + s.n].best).filter(v => v != null);
    const fin = x.bm.final && x.bm.final.best;
    const lessonBest = x.tests.filter(t => t.lesson).map(t => x.bm[t.key] && x.bm[t.key].best).filter(v => v != null);
    const tstate = t => { const e = x.bm[t.key]; const pl = (lessonPlan(x.s.id) || { byId: {} }).byId[t.key];
      const overdue = !(e && e.best != null) && pl && lessonPast(pl.date, pl.slot);
      return `<div class="mt-row ${e && e.best != null ? 'ok' : overdue ? 'warn' : ''}"><span class="mt-ico">${t.emoji}</span>
        <span class="mt-name">${esc(t.title)}${pl ? ` <small class="muted">· 📅 ${fmtDay(pl.date)}</small>` : ''}${e && e.best == null ? ' <small class="muted">· спроб: ' + e.attempts + ', не зараховано</small>' : ''}</span>
        ${e && e.best != null ? `<span class="cell ${gradeClass(e.best)}" title="Спроб: ${e.attempts}">${e.best}</span>` : `<a class="btn ${overdue ? 'brand' : 'light'} sm" href="${t.href}">${overdue ? '⏰ ' : ''}Пройти</a>`}</div>`; };
    /* відкритим показуємо розділ, де є незроблені тести (або останній) */
    const openSec = (x.sections.find(s => s.lessons.some(l => !(x.bm[l] && x.bm[l].best != null)) || !(x.bm['section-' + s.n] && x.bm['section-' + s.n].best != null)) || x.sections[x.sections.length - 1] || {}).n;
    $app.innerHTML = head + tabs + `
      <div class="stu-tiles">
        <div class="card st-big">${ring(x.lessonTotal ? x.lessonDone / x.lessonTotal : 0, '#2BB673')}<div><b>${x.lessonDone} з ${x.lessonTotal}</b><span>тестів за уроки</span></div></div>
        <div class="card st-big"><span class="st-ico">⭐</span><div><b>${avg(lessonBest) ?? '—'}</b><span>середній за уроки</span></div></div>
        <div class="card st-big"><span class="st-ico">🏁</span><div><b>${avg(sec) ?? '—'}</b><span>за розділи (${sec.length}/${x.sections.length})</span></div></div>
        <div class="card st-big"><span class="st-ico">🏆</span><div><b>${fin ?? '—'}</b><span>річний тест</span></div></div>
      </div>
      ${x.overdue.length ? `<div class="flag-box">⏰ ${x.overdue.length} ${plural(x.overdue.length, 'тест', 'тести', 'тестів')} за уроки, які вже були. Вони позначені червоним нижче.</div>` : ''}
      <div class="card pad"><h3 class="rs-h">🎯 Рівні з предмета</h3>${levelBars(x.allBest)}</div>
      <div class="sec-acc">${x.sections.map(s => { const ts = x.tests.filter(t => (t.lesson && s.lessons.includes(t.key)) || t.key === 'section-' + s.n);
        const dn = ts.filter(t => x.bm[t.key] && x.bm[t.key].best != null).length;
        const sb = ts.map(t => x.bm[t.key] && x.bm[t.key].best).filter(v => v != null);
        return `<details class="card sec-item" ${s.n === openSec ? 'open' : ''}><summary><span class="sn">${s.n}</span><b>${esc(s.title)}</b>
          <span class="sec-meta"><span class="mini-progress"><i style="width:${ts.length ? dn / ts.length * 100 : 0}%"></i></span>${dn}/${ts.length}${sb.length ? ` · <span class="cell ${gradeClass(avg(sb))}">${avg(sb)}</span>` : ''}</span></summary>
          <div class="mt-list">${ts.map(tstate).join('')}</div></details>`; }).join('')}
        <details class="card sec-item"><summary><span class="sn">🏆</span><b>Річний підсумковий тест</b><span class="sec-meta">${fin != null ? `<span class="cell ${gradeClass(fin)}">${fin}</span>` : 'не пройдено'}</span></summary>
          <div class="mt-list">${tstate(x.tests[x.tests.length - 1])}</div></details>
        <details class="card sec-item"><summary><span class="sn">🕒</span><b>Історія спроб</b><span class="sec-meta">${x.rs.length}</span></summary>${myAttempts(x.rs, false)}</details>
      </div>
      ${hasUnits(x.s.id) ? unitsMine(x.s.id, D.units.filter(r => r.course === x.s.id)) : ''}${hasKr(x.s.id) ? krMine(x.s.id, D.krs.filter(r => r.course === x.s.id)) : ''}
      <div style="margin-top:14px"><a class="btn light" href="#/course/${x.s.id}">Перейти до предмета →</a></div>`;
  }
  function myAttempts(rs, withSubject) {
    if (!rs.length) return '<div class="empty" style="padding:20px">Ще немає спроб — час пройти перший тест! 🚀</div>';
    return `<div class="table-wrap"><table class="tbl"><thead><tr><th>Дата</th>${withSubject ? '<th>Предмет</th>' : ''}<th>Тест</th><th class="c">Оцінка</th><th class="c">Час</th></tr></thead><tbody>
      ${rs.map(r => { const sj = catalogSubject(r.course); return `<tr><td>${fmtDate(r.atMs)}</td>${withSubject ? `<td>${sj ? esc(sj.icon) + ' ' + esc(sj.name) : ''}</td>` : ''}<td>${esc(resTitle(r))}${r.manual ? ' <span class="tag" title="Оцінку вніс учитель">✍️</span>' : ''}</td>
        <td class="c"><span class="cell ${r.passed ? gradeClass(r.score) : 'g-lo'}">${r.score}</span>${r.passed ? '' : ' <span class="muted">не зарах.</span>'}</td><td class="c">${fmtDur(r.durationSec || 0)}</td></tr>`; }).join('')}
    </tbody></table></div>`;
  }

  /* ---------------- вчитель: учні ---------------- */
  async function renderStudents() {
    $app.innerHTML = '<div class="loader"><span></span></div>';
    let students = await Store.listStudents();
    /* класи, з якими можна працювати: адміністратор — усі, вчитель — свої */
    const clsList = isAdmin() ? CATALOG.map(k => k.cls) : (user.classes || []).filter(c => !hiddenFor(classInfo(c))).sort((a, b) => a - b);
    if (!isAdmin() && ss.getItem('stFilter') !== 'all' && !clsList.includes(+ss.getItem('stFilter'))) ss.setItem('stFilter', 'all');
    const draw = () => {
      const f = ss.getItem('stFilter') || 'all';
      const list = students.filter(s => (f === 'all' && (isAdmin() || clsList.includes(s.cls))) || String(s.cls) === f).sort((a, b) => a.cls - b.cls || a.name.localeCompare(b.name, 'uk'));
      $app.innerHTML = `
        <div class="page-head"><div><h1>Учні</h1><p>${isAdmin() ? 'Створення облікових записів, логіни та паролі' : 'Учні ваших класів: логіни та паролі'}</p></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">${isAdmin() ? `<button class="btn light" id="promote">⬆️ Перевести в наступний клас</button>` : ''}${clsList.length ? `<button class="btn brand" id="addBtn">＋ Додати учнів</button>` : ''}</div></div>
        <div class="toolbar">
          <select class="input" id="fCls"><option value="all">${isAdmin() ? 'Усі класи' : 'Усі мої класи'}</option>${clsList.map(c => `<option value="${c}" ${f == c ? 'selected' : ''}>${c} клас</option>`).join('')}</select>
          <span class="tag">${list.length} ${plural(list.length, 'учень', 'учні', 'учнів')}</span>
          <button class="btn light sm" id="cardsBtn" ${list.length ? '' : 'disabled'}>🖨 Картки з логінами</button>
        </div>
        <div class="card table-wrap">${list.length ? `<table class="tbl"><thead><tr><th>Учень</th><th class="c">Клас</th><th>Логін</th><th>Пароль</th><th></th></tr></thead><tbody>
          ${list.map(s => `<tr><td><b>${esc(s.name)}</b></td><td class="c">${s.cls}</td><td class="pw">${esc(s.login)}</td><td class="pw">${esc(s.password || '—')}</td>
            <td style="text-align:right"><button class="btn light sm" data-edit="${s.uid}" title="Редагувати">✏️</button>${isAdmin() ? ` <button class="btn danger sm" data-del="${s.uid}" title="Видалити">🗑</button>` : ''}</td></tr>`).join('')}
          </tbody></table>` : `<div class="empty"><span class="e">🧑‍🎓</span>Учнів ще немає. Натисніть «Додати учнів».</div>`}</div>`;
      $app.querySelector('#fCls').onchange = e => { ss.setItem('stFilter', e.target.value); draw(); };
      if ($app.querySelector('#addBtn')) $app.querySelector('#addBtn').onclick = addDialog;
      if ($app.querySelector('#promote')) $app.querySelector('#promote').onclick = promoteDialog;
      $app.querySelector('#cardsBtn').onclick = () => cardsDialog(list);
      $app.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
        const s = students.find(x => x.uid === b.dataset.del);
        modal(`<div class="m-emoji">🗑</div><h2>Видалити учня?</h2><p><b>${esc(s.name)}</b> (${s.cls} клас) більше не зможе увійти. Усі його результати буде видалено.</p>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn danger" data-close id="mDel">Видалити</button></div>`,
          box => box.querySelector('#mDel').onclick = async () => { await Store.deleteStudent(s.uid); students = students.filter(x => x.uid !== s.uid); draw(); toast('Учня видалено'); });
      });
      $app.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
        const s = students.find(x => x.uid === b.dataset.edit);
        modal(`<h2>Редагувати</h2><div class="field"><label>Прізвище та ім’я</label><input class="input" id="eName" value="${esc(s.name)}"></div>
          ${isAdmin() ? `<div class="field"><label>Клас</label><select class="input" id="eCls">${CATALOG.map(k => `<option ${k.cls === s.cls ? 'selected' : ''}>${k.cls}</option>`).join('')}</select></div>` : ''}
          <p class="muted" style="margin-top:12px;font-size:14px">Логін і пароль не змінюються. Якщо учень забув пароль — він показаний у таблиці.${isAdmin() ? '' : ' Змінити клас або видалити учня може адміністратор.'}</p>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="eSave">Зберегти</button></div>`,
          (box, close) => box.querySelector('#eSave').onclick = async () => {
            const data = { name: box.querySelector('#eName').value.trim() || s.name };
            if (box.querySelector('#eCls')) data.cls = +box.querySelector('#eCls').value;
            await Store.updateStudent(s.uid, data); Object.assign(s, data); close(); draw(); toast('Збережено');
          }, { wide: false });
      });
    };
    function addDialog() {
      const f = ss.getItem('stFilter');
      modal(`<h2>Додати учнів</h2>
        <div class="field"><label>Клас</label><select class="input" id="aCls">${clsList.map(c => `<option ${String(c) === f ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Прізвища та імена — по одному в рядку</label><textarea class="input" id="aNames" rows="8" placeholder="Іваненко Марія&#10;Петренко Андрій"></textarea></div>
        <div class="form-error" id="aErr"></div>
        <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="aGo">Створити облікові записи</button></div>`,
        (box, close) => box.querySelector('#aGo').onclick = async () => {
          const cls = +box.querySelector('#aCls').value;
          const names = box.querySelector('#aNames').value.split('\n').map(x => x.trim()).filter(Boolean);
          if (!names.length) { box.querySelector('#aErr').textContent = 'Введіть хоча б одне ім’я'; return; }
          const btn = box.querySelector('#aGo'); btn.disabled = true;
          const created = [];
          try {
            for (let i = 0; i < names.length; i++) {
              btn.textContent = `Створюємо ${i + 1} з ${names.length}…`;
              const r = await Store.createStudent(names[i], cls);
              created.push(Object.assign({ name: names[i], cls, role: 'student' }, r));
            }
          } catch (e) { box.querySelector('#aErr').textContent = 'Помилка: ' + e.message; }
          students = students.concat(created);
          close(); draw();
          if (created.length) cardsDialog(created, true);
        }, { wide: true });
    }
    function cardsDialog(list, fresh) {
      modal(`<h2>${fresh ? '✅ Облікові записи створено' : 'Картки з логінами'}</h2>
        <p style="margin-bottom:16px">Адреса сайту: <b>${esc(location.origin + location.pathname)}</b></p>
        <div class="login-cards" id="lcards">${list.map(s => `<div class="lc"><div class="lc-txt"><b>${esc(s.name)}</b><span class="muted">${s.cls} клас</span><br>Логін: <code>${esc(s.login)}</code><br>Пароль: <code>${esc(s.password)}</code><small class="lc-site">${esc(C.qrLabel || '')}</small></div>${C.qrImage ? `<img class="lc-qr" src="${esc(new URL(C.qrImage, location.href).href)}" alt="QR-код сайту">` : ''}</div>`).join('')}</div>
        <div class="m-actions"><button class="btn light" id="cCopy">📋 Копіювати</button><button class="btn light" id="cPrint">🖨 Друкувати</button><button class="btn brand" data-close>Готово</button></div>`,
        box => {
          box.querySelector('#cCopy').onclick = () => {
            const txt = list.map(s => `${s.name} (${s.cls} кл.) — логін: ${s.login}, пароль: ${s.password}`).join('\n');
            navigator.clipboard.writeText(txt).then(() => toast('Скопійовано'));
          };
          box.querySelector('#cPrint').onclick = () => {
            printHtml(`<html><head><meta charset="utf-8"><title>Логіни</title><style>@page{size:A4 portrait;margin:10mm}body{font-family:sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px}.lc{border:1px dashed #999;padding:10px;border-radius:8px;font-size:14px;display:flex;gap:8px;align-items:center;justify-content:space-between;break-inside:avoid}.lc-txt{line-height:1.5}b{font-size:15px;display:block}code{font-size:15px;font-weight:bold}.lc-qr{width:86px;height:86px;flex:none}.lc-site{display:block;color:#555;font-size:11px}.muted{color:#666}</style></head><body>${box.querySelector('#lcards').innerHTML}<p style="grid-column:1/-1">Сайт: ${esc(location.origin + location.pathname)}</p></body></html>`);
          };
        }, { wide: true });
    }
    function promoteDialog() {
      modal(`<div class="m-emoji">🎒</div><h2>Новий навчальний рік</h2><p>Усі учні 2–8 класів буде переведено на клас вище (2→3, 3→4 …). Учнів 9 класу буде позначено як випускників і вони зникнуть зі списку класів.</p>
        <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="pGo">Перевести</button></div>`,
        (box, close) => box.querySelector('#pGo').onclick = async () => {
          const b = box.querySelector('#pGo'); b.disabled = true; b.textContent = 'Переводимо…';
          for (const s of students) { const cls = s.cls + 1; await Store.updateStudent(s.uid, { cls }); s.cls = cls; }
          close(); draw(); toast('Учнів переведено');
        });
    }
    draw();
  }

  /* ---------------- вчитель: результати ---------------- */
  /* =====================================================================
     РЕЗУЛЬТАТИ: огляд, загальний список, журнал класу, статистика
     (предмети / класи / учні). Вчитель бачить лише свої предмети й класи.
     ===================================================================== */
  let RS = null;   // кеш даних сторінки «Результати»
  const DAY = 864e5;
  const LEVELS = [['Початковий', 1, 3, 'g-lo'], ['Середній', 4, 6, 'g-avg'], ['Достатній', 7, 9, 'g-mid'], ['Високий', 10, 12, 'g-hi']];
  const KIND = { lesson: 'Урок', section: 'Розділ', final: 'Річний', mark: '✍️ Оцінка за урок' };
  const pct = (a, b) => b ? Math.round(a / b * 100) : null;
  const ago = ms => { if (!ms) return 'ще не проходив'; const d = Math.floor((Date.now() - ms) / DAY); return d <= 0 ? 'сьогодні' : d === 1 ? 'вчора' : d + ' дн. тому'; };

  async function loadResultsData(force) {
    if (!force && RS && RS.uid === user.uid && Date.now() - RS.at < 3 * 60e3) return RS;
    const subs = [];
    myClasses().forEach(k => (isAdmin() ? k.subjects : visibleSubjects(k)).filter(s => s.ready).forEach(s =>
      subs.push({ id: s.id, cls: k.cls, name: s.name, icon: s.icon || '📘', color: k.color, total: ((window.LESSON_INDEX || {})[s.id] || { l: [] }).l.length })));
    const lists = await Promise.all([Store.listStudents()].concat(subs.map(x => Store.courseResults(x.id).catch(() => []))));
    const students = lists.shift().slice().sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    const allRes = lists.flat().sort((a, b) => (b.atMs || 0) - (a.atMs || 0));
    const units = allRes.filter(r => r.kind === 'units'), krs = allRes.filter(r => r.kind === 'kr'), results = allRes.filter(r => r.kind !== 'units' && r.kind !== 'kr');
    const subById = {}; subs.forEach(x => (subById[x.id] = x));
    const stuById = {}; students.forEach(s => (stuById[s.uid] = s));
    /* best[uid][course][testId] = { best, attempts, kind } */
    const best = {};
    results.forEach(r => {
      const u = best[r.uid] || (best[r.uid] = {}), c = u[r.course] || (u[r.course] = {});
      const e = c[r.testId] || (c[r.testId] = { best: null, attempts: 0, kind: r.kind, title: r.title, last: 0 });
      e.attempts++; e.last = Math.max(e.last, r.atMs || 0);
      if (r.passed && (e.best == null || r.score > e.best)) e.best = r.score;
    });
    RS = { uid: user.uid, at: Date.now(), subs, subById, students, stuById, results, units, krs, best };
    return RS;
  }
  /* показники учня з одного предмета */
  function metric(D, uid, course) {
    const tests = Object.values((D.best[uid] || {})[course] || {});
    const scores = tests.map(t => t.best).filter(v => v != null);
    const rs = D.results.filter(r => r.uid === uid && r.course === course);
    const sub = D.subById[course];
    const lessonPassed = tests.filter(t => t.kind === 'lesson' && t.best != null).length;
    return { avg: avg(scores), scores, passed: scores.length, lessonPassed, total: sub ? sub.total : 0, done: sub && sub.total ? lessonPassed / sub.total : null,
      attempts: rs.length, last: rs.length ? rs[0].atMs || 0 : 0, leaves: rs.reduce((a, r) => a + (r.leaves || 0), 0) };
  }
  function studentRow(D, s) {
    const subs = D.subs.filter(x => x.cls === s.cls);
    const ms = subs.map(x => metric(D, s.uid, x.id));
    const scores = ms.flatMap(m => m.scores);
    const lp = ms.reduce((a, m) => a + m.lessonPassed, 0), tot = ms.reduce((a, m) => a + m.total, 0);
    const attempts = ms.reduce((a, m) => a + m.attempts, 0), last = Math.max(0, ...ms.map(m => m.last));
    const leaves = ms.reduce((a, m) => a + m.leaves, 0);
    const flags = [];
    const a = avg(scores);
    if (a != null && a < C.passScore + 2) flags.push('низький середній бал');
    if (!attempts) flags.push('ще не проходив тестів');
    else if (Date.now() - last > 14 * DAY) flags.push('не заходив понад 2 тижні');
    if (attempts >= 3 && leaves / attempts >= 2) flags.push('часто виходить з вікна тесту');
    const failed = D.results.filter(r => r.uid === s.uid && !r.passed && subs.some(x => x.id === r.course)).length;
    if (failed >= 3 && failed > attempts / 2) flags.push('багато незарахованих спроб');
    const overdue = SCHED ? subs.reduce((a, x) => a + overdueOf(D, s.uid, x.id).length, 0) : 0;
    if (overdue >= 3) flags.push(`не пройдено ${overdue} тестів за минулі уроки`);
    return { s, subs, ms, avg: a, passed: scores.length, lessonPassed: lp, total: tot, done: tot ? lp / tot : null, attempts, last, leaves, flags };
  }
  /* сигнали учня; «не пройдено N тестів» — розгортається в список тестів за предметами з посиланнями */
  function flagsHtml(D, r, modalMode) {
    if (!r.flags.length) return '';
    const parts = r.flags.map(f => {
      if (!/^не пройдено \d+ тест/.test(f)) return `<span>${esc(f)}</span>`;
      const groups = r.subs.map(x => ({ x, items: overdueOf(D, r.s.uid, x.id) })).filter(g => g.items.length);
      return `<details class="ov-det" onclick="event.stopPropagation()"><summary>${esc(f)} <span class="ov-caret">▾</span></summary><div class="ov-list">${groups.map(g => `<div class="ov-sub"><b>${esc(g.x.icon || '')} ${esc(g.x.name)}</b> <small>· ${g.items.length}</small>
        <ul>${g.items.map(l => `<li><a href="#/test/${g.x.id}/lesson/${l.id}" ${modalMode ? 'data-close' : ''} title="Відкрити тест">📝 ${l.n != null ? '§ ' + esc(l.n) + '. ' : ''}${esc(l.title || '')}</a><small>${l.date ? ' · урок ' + esc(fmtDay(l.date)) : ''}</small></li>`).join('')}</ul>
        <a class="ov-j" href="#/teacher/results/journal/${g.x.cls}/${g.x.id}" ${modalMode ? 'data-close' : ''}>📒 Журнал класу</a></div>`).join('')}</div></details>`;
    });
    return modalMode ? `<div class="flag-box">⚠️ ${parts.join(' · ')}</div>` : `<small class="flag">⚠️ ${parts.join(' · ')}</small>`;
  }
  function subjectRow(D, x) {
    const studs = D.students.filter(s => s.cls === x.cls);
    const ms = studs.map(s => metric(D, s.uid, x.id));
    const scores = ms.flatMap(m => m.scores);
    const rs = D.results.filter(r => r.course === x.id && studs.some(s => s.uid === r.uid));
    return { x, students: studs.length, active: ms.filter(m => m.attempts).length, avg: avg(scores), scores,
      done: studs.length && x.total ? ms.reduce((a, m) => a + m.lessonPassed, 0) / (studs.length * x.total) : null,
      attempts: rs.length, passRate: pct(rs.filter(r => r.passed).length, rs.length), last: rs.length ? rs[0].atMs : 0 };
  }
  function hardTests(D, filter) {
    const g = {};
    D.results.filter(filter || (() => true)).forEach(r => {
      const k = r.course + '|' + r.testId;
      const e = g[k] || (g[k] = { course: r.course, testId: r.testId, title: r.title, kind: r.kind, n: 0, sum: 0, passed: 0, users: new Set() });
      e.n++; e.sum += r.score || 0; if (r.passed) e.passed++; e.users.add(r.uid);
    });
    return Object.values(g).filter(e => e.n >= 3).map(e => Object.assign(e, { avg: Math.round(e.sum / e.n * 10) / 10, rate: pct(e.passed, e.n) }))
      .sort((a, b) => a.avg - b.avg || a.rate - b.rate);
  }
  const levelBars = scores => {
    const n = scores.length;
    if (!n) return '<p class="muted" style="font-weight:700">Ще немає зарахованих тестів</p>';
    return `<div class="lvl-bar">${LEVELS.map(([nm, lo, hi, cl]) => { const c = scores.filter(v => v >= lo && v <= hi).length; return c ? `<i class="${cl}" style="flex:${c}" title="${nm}: ${c}">${pct(c, n)}%</i>` : ''; }).join('')}</div>
      <div class="lvl-legend">${LEVELS.map(([nm, lo, hi, cl]) => `<span><b class="dot ${cl}"></b>${nm} (${lo}–${hi}): ${scores.filter(v => v >= lo && v <= hi).length}</span>`).join('')}</div>`;
  };
  const doneBar = v => v == null ? '<span class="muted">—</span>' : `<span class="done-bar" title="Пройдено уроків: ${Math.round(v * 100)}%"><i style="width:${Math.min(100, Math.round(v * 100))}%"></i><b>${Math.round(v * 100)}%</b></span>`;
  const subLabel = x => x ? `${esc(x.icon)} ${esc(x.name)} · ${x.cls} кл.` : '—';
  function downloadCsv(name, rows) {
    const csv = '﻿' + rows.map(l => l.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = name; a.click();
  }

  async function renderResults(tab, a, b, c) {
    if (tab && /^\d+$/.test(tab)) { b = a; a = tab; tab = 'journal'; }
    const TABS = [['overview', '📊 Огляд'], ['all', '📋 Усі результати'], ['journal', '📒 Журнал класу'], ['subjects', '📚 За предметами'], ['classes', '🏫 За класами'], ['students', '🧑‍🎓 За учнями'], ['overdue', '⏰ Нагадування'], ['units', '📏 Одиниці (фізика)'], ['kr', '📝 Контрольні (математика)']];
    if (!TABS.some(t => t[0] === tab)) tab = ss.getItem('rsTab') || 'overview';
    ss.setItem('rsTab', tab);
    const tabsHtml = `<div class="page-head"><div><h1>Результати</h1><p>${isAdmin() ? 'Усі класи й предмети' : 'Ваші класи й предмети'} · загальний список, журнал і статистика</p></div>
        ${tab !== 'journal' ? `<button class="btn light sm" id="rsRefresh" title="Завантажити свіжі дані">🔄 Оновити</button>` : ''}</div>
      <nav class="rs-tabs">${TABS.map(([k, t]) => `<a href="#/teacher/results/${k}" class="${k === tab ? 'on' : ''}">${t}</a>`).join('')}</nav>`;
    if (tab === 'journal') return renderJournal(a, b, tabsHtml, c);
    $app.innerHTML = tabsHtml + '<div class="loader"><span></span></div>';
    const D = await loadResultsData();
    const refresh = () => { const r = $app.querySelector('#rsRefresh'); if (r) r.onclick = async () => { RS = null; route(); }; };
    if (!D.subs.length) { $app.innerHTML = tabsHtml + `<div class="card empty"><span class="e">📭</span>Немає наповнених предметів${isTeacher() ? ', призначених вам' : ''}.</div>`; refresh(); return; }
    const body = { overview: rsOverview, all: rsAll, subjects: rsSubjects, classes: rsClasses, students: rsStudents, overdue: rsOverdue, units: rsUnits, kr: rsKr }[tab];
    $app.innerHTML = tabsHtml + '<div id="rsBody"></div>';
    refresh();
    body(D, $app.querySelector('#rsBody'), a);
  }

  /* ---- огляд ---- */
  function rsOverview(D, box) {
    const rows = D.students.map(s => studentRow(D, s)).filter(r => r.subs.length);
    const scores = rows.flatMap(r => r.ms.flatMap(m => m.scores));
    const week = D.results.filter(r => Date.now() - (r.atMs || 0) < 7 * DAY);
    const activeWeek = new Set(week.map(r => r.uid)).size;
    const lp = rows.reduce((a, r) => a + r.lessonPassed, 0), tot = rows.reduce((a, r) => a + r.total, 0);
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 13 + i); return d; });
    const perDay = days.map(d => D.results.filter(r => r.atMs >= +d && r.atMs < +d + DAY).length);
    const maxDay = Math.max(1, ...perDay);
    const attention = rows.filter(r => r.flags.length).sort((x, y) => y.flags.length - x.flags.length || (x.avg ?? 99) - (y.avg ?? 99)).slice(0, 8);
    const hard = hardTests(D).slice(0, 6);
    box.innerHTML = `
      <div class="stat-tiles">
        <div class="card stat-tile"><div class="v">${rows.length}</div><div class="k">Учнів</div></div>
        <div class="card stat-tile"><div class="v">${activeWeek}</div><div class="k">Активних за 7 днів</div></div>
        <div class="card stat-tile"><div class="v">${week.length}</div><div class="k">Спроб за 7 днів</div></div>
        <div class="card stat-tile"><div class="v">${avg(scores) ?? '—'}</div><div class="k">Середній бал (зараховані)</div></div>
        <div class="card stat-tile"><div class="v">${tot ? pct(lp, tot) + '%' : '—'}</div><div class="k">Пройдено тестів за уроки</div></div>
        ${SCHED ? (() => { const n = D.subs.reduce((a, x) => a + D.students.filter(st => st.cls === x.cls).reduce((b, st) => b + overdueOf(D, st.uid, x.id).length, 0), 0);
          return `<a class="card stat-tile" href="#/teacher/results/overdue" style="text-decoration:none;color:inherit"><div class="v">${n}</div><div class="k">⏰ Не пройдено тестів за минулі уроки</div></a>`; })() : ''}
      </div>
      <div class="rs-grid">
        <div class="card pad"><h3 class="rs-h">📈 Активність за 2 тижні</h3>
          <div class="day-chart">${perDay.map((n, i) => `<div class="dc-col" title="${days[i].toLocaleDateString('uk-UA')}: ${n} спроб"><b>${n || ''}</b><i style="height:${Math.round(n / maxDay * 100)}%"></i><span>${days[i].getDate()}</span></div>`).join('')}</div></div>
        <div class="card pad"><h3 class="rs-h">🎯 Рівні навчальних досягнень</h3>${levelBars(scores)}</div>
        <div class="card pad"><h3 class="rs-h">⚠️ Потребують уваги</h3>
          ${attention.length ? `<ul class="rs-list">${attention.map(r => `<li><a href="javascript:void(0)" data-st="${r.s.uid}">${esc(r.s.name)}</a> <span class="muted">${r.s.cls} кл.</span><br>${flagsHtml(D, r, false)}</li>`).join('')}</ul>` : '<p class="muted" style="font-weight:700">Усе добре — тривожних сигналів немає 🎉</p>'}
          <a class="btn light sm" href="#/teacher/results/students">Усі учні →</a></div>
        <div class="card pad"><h3 class="rs-h">🧗 Найскладніші тести</h3>
          ${hard.length ? `<ul class="rs-list">${hard.map(h => `<li><b>${esc(h.title)}</b><br><small>${subLabel(D.subById[h.course])} · середній ${h.avg} · зараховано ${h.rate}% з ${h.n} спроб</small></li>`).join('')}</ul>
            <p class="muted" style="font-size:13px;font-weight:700">Варто повторити ці теми на уроці.</p>` : '<p class="muted" style="font-weight:700">Потрібно щонайменше 3 спроби на тест, щоб оцінити складність.</p>'}</div>
      </div>
      <div class="card pad" style="margin-top:16px"><h3 class="rs-h">🕒 Останні спроби</h3>${attemptsTable(D, D.results.slice(0, 10), false)}
        <a class="btn light sm" href="#/teacher/results/all">Усі результати →</a></div>`;
    bindStudentLinks(D, box);
  }

  /* спроби, згруповані за днями: компактна таблиця без горизонтальної прокрутки */
  function attemptsTable(D, list, withDel, noStudent) {
    if (!list.length) return '<div class="empty" style="padding:20px">Спроб ще немає</div>';
    const dayKey = ms => { const d = new Date(ms || 0); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
    const dayLabel = ms => { const d = new Date(ms || 0), t = new Date(); t.setHours(0, 0, 0, 0); const diff = Math.round((t - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / DAY);
      const base = d.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' }); return diff === 0 ? 'Сьогодні, ' + base : diff === 1 ? 'Вчора, ' + base : base; };
    const time = ms => new Date(ms || 0).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    let prev = '', html = '';
    const cols = 5 + (noStudent ? 0 : 1) + (withDel ? 1 : 0);
    list.forEach(r => {
      const k = dayKey(r.atMs);
      if (k !== prev) { html += `<tr class="day-row"><td colspan="${cols}">${dayLabel(r.atMs)}</td></tr>`; prev = k; }
      const s = D.stuById[r.uid], x = D.subById[r.course];
      html += `<tr><td class="t-time">${time(r.atMs)}</td>
        ${noStudent ? '' : `<td class="t-name">${s ? `<a href="javascript:void(0)" data-st="${s.uid}">${esc(s.name)}</a><small>${s.cls} кл.</small>` : `${esc(r.name || '—')}<small>видалений</small>`}</td>`}
        <td class="t-test"><span>${esc(resTitle(r))}${r.manual ? ' <span class="tag" title="Оцінку внесено вчителем вручну">✍️ вручну</span>' : ''}</span><small>${x ? esc(x.icon) + ' ' + esc(x.name) + ' · ' + x.cls + ' кл.' : ''} · ${KIND[r.kind] || ''}</small></td>
        <td class="c"><span class="cell ${r.passed ? gradeClass(r.score) : 'g-lo'}" title="${r.passed ? 'Зараховано' : 'Не зараховано'}">${r.score}${r.passed ? '' : '✕'}</span></td>
        ${r.manual ? `<td class="c t-meta" colspan="2"><b>✍️ вручну</b><small>${esc(r.byName || 'вчитель')}${r.note ? ' · ' + esc(r.note) : ''}</small></td>` : `<td class="c t-meta"><b>${r.full}/${r.total}</b><small>правильно</small></td>
        <td class="c t-meta"><b>${fmtDur(r.durationSec || 0)}${r.auto ? ' ⌛' : ''}</b><small>${r.leaves ? '⚠️ виходів: ' + r.leaves : 'без виходів'}</small></td>`}
        ${withDel ? `<td class="c"><button class="icon-btn adm-del" data-rdel="${esc(r.id)}" title="Видалити спробу (учень зможе пройти тест ще раз)">✕</button></td>` : ''}</tr>`;
    });
    return `<div class="table-wrap"><table class="tbl tbl-compact tbl-att"><tbody>${html}</tbody></table></div>`;
  }
  function bindStudentLinks(D, box) {
    box.querySelectorAll('[data-st]').forEach(el => el.onclick = () => studentProfile(D, D.stuById[el.dataset.st]));
  }
  async function delAttempt(D, id) {
    await Store.deleteResult(id);
    const r = D.results.find(x => x.id === id);
    D.results = D.results.filter(x => x.id !== id);
    if (r) { const e = ((D.best[r.uid] || {})[r.course] || {})[r.testId]; if (e) { const rest = D.results.filter(x => x.uid === r.uid && x.course === r.course && x.testId === r.testId);
      e.attempts = rest.length; e.best = rest.filter(x => x.passed).reduce((m, x) => Math.max(m ?? 0, x.score), null); if (!rest.length) delete D.best[r.uid][r.course][r.testId]; } }
    toast('Спробу видалено — учень може пройти тест ще раз');
  }

  /* ---- загальний список ---- */
  function rsAll(D, box) {
    const f = JSON.parse(ss.getItem('rsAllF') || '{}');
    const classes = [...new Set(D.subs.map(x => x.cls))].sort((a, b) => a - b);
    let shown = 100;
    box.innerHTML = `<div class="toolbar rs-filters">
        <select class="input" id="fC"><option value="">Усі класи</option>${classes.map(c => `<option value="${c}" ${f.c == c ? 'selected' : ''}>${c} клас</option>`).join('')}</select>
        <select class="input" id="fS"></select>
        <select class="input" id="fK"><option value="">Усі тести</option>${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${f.k === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <select class="input" id="fP"><option value="">Увесь час</option>${[[1, 'Сьогодні'], [7, '7 днів'], [30, '30 днів']].map(([d, t]) => `<option value="${d}" ${f.p == d ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <select class="input" id="fR"><option value="">Усі спроби</option><option value="1" ${f.r === '1' ? 'selected' : ''}>Зараховані</option><option value="0" ${f.r === '0' ? 'selected' : ''}>Не зараховані</option></select>
        <input class="input" id="fQ" placeholder="🔍 Учень або тест" value="${esc(f.q || '')}">
        <button class="btn light sm" id="fCsv">⬇️ CSV (Excel)</button>
        <button class="btn brand sm" id="fMan" title="Внести оцінку за тест, який учень уже виконав раніше">✍️ Зарахувати вручну</button>
      </div><div id="allOut"></div>`;
    const fillSubs = keep => { const c = box.querySelector('#fC').value, sel = box.querySelector('#fS');
      const list = D.subs.filter(x => !c || x.cls == c).slice().sort((a, b) => a.cls - b.cls || a.name.localeCompare(b.name, 'uk'));
      sel.innerHTML = `<option value="">${c ? 'Усі предмети ' + c + ' класу' : 'Усі предмети'}</option>` + list.map(x => `<option value="${x.id}">${esc(x.icon)} ${esc(x.name)}${c ? '' : ' · ' + x.cls + ' кл.'}</option>`).join('');
      sel.value = list.some(x => x.id === keep) ? keep : ''; };
    fillSubs(f.s);
    box.querySelector('#fMan').onclick = () => manualCreditDialog(D, { cls: box.querySelector('#fC').value, course: box.querySelector('#fS').value });
    const get = () => ({ c: box.querySelector('#fC').value, s: box.querySelector('#fS').value, k: box.querySelector('#fK').value, p: box.querySelector('#fP').value, r: box.querySelector('#fR').value, q: box.querySelector('#fQ').value.trim().toLowerCase() });
    const filtered = () => { const v = get(); ss.setItem('rsAllF', JSON.stringify(v));
      return D.results.filter(r => { const x = D.subById[r.course], s = D.stuById[r.uid];
        return (!v.c || (x && x.cls == v.c)) && (!v.s || r.course === v.s) && (!v.k || r.kind === v.k) && (!v.p || Date.now() - (r.atMs || 0) < v.p * DAY)
          && (v.r === '' || String(+!!r.passed) === v.r) && (!v.q || ((s ? s.name : r.name || '') + ' ' + (r.title || '')).toLowerCase().includes(v.q)); }); };
    const draw = () => {
      const list = filtered(), out = box.querySelector('#allOut');
      const scores = list.filter(r => r.passed).map(r => r.score);
      out.innerHTML = `<p class="muted rs-sum">Знайдено спроб: <b>${list.length}</b> · зараховано: <b>${scores.length}</b> (${pct(scores.length, list.length) ?? 0}%) · середня оцінка зарахованих: <b>${avg(scores) ?? '—'}</b> · учнів: <b>${new Set(list.map(r => r.uid)).size}</b></p>
        <div class="card">${attemptsTable(D, list.slice(0, shown), true)}</div>
        ${list.length > shown ? `<div style="text-align:center;margin-top:12px"><button class="btn light" id="more">Показати ще (${list.length - shown})</button></div>` : ''}`;
      bindStudentLinks(D, out);
      const m = out.querySelector('#more'); if (m) m.onclick = () => { shown += 200; draw(); };
      out.querySelectorAll('[data-rdel]').forEach(bt => bt.onclick = () => modal(`<div class="m-emoji">🗑</div><h2>Видалити спробу?</h2><p>Якщо тест був зарахований, учень зможе пройти його ще раз.</p>
        <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn danger" data-close id="dGo">Видалити</button></div>`,
        b2 => b2.querySelector('#dGo').onclick = async () => { await delAttempt(D, bt.dataset.rdel); draw(); }));
    };
    box.querySelectorAll('.rs-filters select').forEach(s => s.onchange = () => { if (s.id === 'fC') fillSubs(box.querySelector('#fS').value); shown = 100; draw(); });
    let t; box.querySelector('#fQ').oninput = () => { clearTimeout(t); t = setTimeout(() => { shown = 100; draw(); }, 250); };
    box.querySelector('#fCsv').onclick = () => downloadCsv('rezultaty_usi.csv', [['Дата', 'Учень', 'Клас', 'Предмет', 'Вид', 'Тест', 'Оцінка', 'Зараховано', 'Повністю правильно', 'Питань', 'Час (с)', 'Виходи']]
      .concat(filtered().map(r => { const s = D.stuById[r.uid], x = D.subById[r.course];
        return [fmtDate(r.atMs), s ? s.name : r.name, s ? s.cls : r.cls, x ? x.name + ' ' + x.cls + ' кл.' : r.course, KIND[r.kind] || '', r.title, r.score, r.passed ? 'так' : 'ні', r.full, r.total, r.durationSec || 0, r.leaves || 0]; })));
    draw();
  }

  /* ---- за предметами ---- */
  function rsSubjects(D, box) {
    const f = JSON.parse(ss.getItem('rsSubF') || '{}');
    const classes = [...new Set(D.subs.map(x => x.cls))].sort((a, b) => a - b);
    box.innerHTML = `<div class="toolbar rs-filters">
        <select class="input" id="bC"><option value="">Усі класи</option>${classes.map(c => `<option value="${c}" ${f.c == c ? 'selected' : ''}>${c} клас</option>`).join('')}</select>
        <select class="input" id="bS"></select>
      </div><div id="subOut"></div>`;
    const cS = box.querySelector('#bC'), sS = box.querySelector('#bS');
    const fill = keep => { const list = D.subs.filter(x => !cS.value || x.cls == cS.value).slice().sort((a, b) => a.name.localeCompare(b.name, 'uk') || a.cls - b.cls);
      sS.innerHTML = '<option value="">Усі предмети</option>' + list.map(x => `<option value="${x.id}">${esc(x.icon)} ${esc(x.name)}${cS.value ? '' : ' · ' + x.cls + ' кл.'}</option>`).join('');
      sS.value = list.some(x => x.id === keep) ? keep : ''; };
    fill(f.s);
    const draw = () => { ss.setItem('rsSubF', JSON.stringify({ c: cS.value, s: sS.value }));
      if (sS.value) { const x = D.subById[sS.value]; box.querySelector('#subOut').innerHTML = ''; subjectInline(D, x, box.querySelector('#subOut')); return; }
      rsSubjectCards(D, box.querySelector('#subOut'), cS.value); };
    cS.onchange = () => { fill(sS.value); draw(); }; sS.onchange = draw;
    draw();
  }
  /* картки предметів (усі або одного класу) */
  function rsSubjectCards(D, box, onlyCls) {
    const rows = D.subs.filter(x => !onlyCls || x.cls == onlyCls).slice().sort((a, b) => a.name.localeCompare(b.name, 'uk')).map(x => subjectRow(D, x));
    const byCls = [...new Set(rows.map(r => r.x.cls))].sort((a, b) => a - b);
    box.innerHTML = byCls.map(c => `<h3 class="grp-h"><span class="sp-cnum">${c}</span>${c} клас</h3>
      <div class="sub-cards">${rows.filter(r => r.x.cls === c).map(r => `
        <div class="card sub-card">
          <div class="sb-top"><span class="sb-ico">${esc(r.x.icon)}</span><div class="sb-name"><b>${esc(r.x.name)}</b><small>${r.active}/${r.students} учнів проходили · ${r.last ? ago(r.last) : 'спроб ще немає'}</small></div>
            <span class="cell ${gradeClass(r.avg)} sb-avg" title="Середній бал">${r.avg ?? '—'}</span></div>
          ${doneBar(r.done)}
          <div class="sb-lvl">${r.scores.length ? `<div class="lvl-bar sm">${LEVELS.map(([nm, lo, hi, cl]) => { const n = r.scores.filter(v => v >= lo && v <= hi).length; return n ? `<i class="${cl}" style="flex:${n}" title="${nm}: ${n}"></i>` : ''; }).join('')}</div>` : ''}
            <small class="muted">${r.passRate == null ? 'Спроб ще немає' : `Зараховано ${r.passRate}% спроб · усього ${r.attempts}`}</small></div>
          <div class="sb-foot"><button class="btn light sm" data-sub="${r.x.id}">📈 Детально</button><a class="btn light sm" href="#/teacher/results/journal/${r.x.cls}/${r.x.id}">📒 Журнал</a></div>
        </div>`).join('')}</div>`).join('') +
      `<p class="muted rs-sum">Смужка — частка зарахованих тестів за уроки від усіх можливих; кольорова шкала — рівні досягнень.</p>`;
    box.querySelectorAll('[data-sub]').forEach(bt => bt.onclick = () => subjectDetail(D, D.subById[bt.dataset.sub]));
  }
  /* детальна статистика предмета просто на сторінці (обрано в списку) */
  function subjectInline(D, x, box) {
    box.innerHTML = `<div class="card pad">${subjectDetailHtml(D, x, true)}</div>`;
    box.querySelectorAll('[data-st]').forEach(el => el.onclick = () => studentProfile(D, D.stuById[el.dataset.st]));
    const m = box.querySelector('[data-man]'); if (m) m.onclick = () => manualCreditDialog(D, { cls: x.cls, course: x.id });
  }
  function subjectDetail(D, x) {
    modal(subjectDetailHtml(D, x, false), bx => bx.querySelectorAll('[data-st]').forEach(el => el.onclick = () => studentProfile(D, D.stuById[el.dataset.st])), { wide: true });
  }
  function subjectDetailHtml(D, x, inline) {
    const r = subjectRow(D, x);
    const studs = D.students.filter(s => s.cls === x.cls).map(s => ({ s, m: metric(D, s.uid, x.id) })).sort((a, b) => (b.m.avg ?? -1) - (a.m.avg ?? -1));
    const hard = hardTests(D, z => z.course === x.id).slice(0, 5);
    const sections = ((window.LESSON_INDEX || {})[x.id] || { s: [] }).s;
    const lessons = ((window.LESSON_INDEX || {})[x.id] || { l: [] }).l;
    const perLesson = lessons.map(l => { const sc = studs.map(o => ((D.best[o.s.uid] || {})[x.id] || {})[l[0]]).filter(e => e && e.best != null).map(e => e.best); return { l, n: sc.length, avg: avg(sc) }; });
    return `<h2>${subLabel(x)}</h2>
      <div class="stat-tiles sm"><div class="card stat-tile"><div class="v">${r.avg ?? '—'}</div><div class="k">Середній бал</div></div>
        <div class="card stat-tile"><div class="v">${r.done == null ? '—' : Math.round(r.done * 100) + '%'}</div><div class="k">Пройдено уроків</div></div>
        <div class="card stat-tile"><div class="v">${r.active}/${r.students}</div><div class="k">Учнів проходили</div></div></div>
      <h3 class="rs-h">Рівні досягнень</h3>${levelBars(r.scores)}
      ${sections.length ? `<h3 class="rs-h">Підсумкові за розділами</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>Розділ</th><th class="c">Склали</th><th class="c">Середній</th></tr></thead><tbody>
        ${sections.map(([n, t]) => { const sc = studs.map(o => ((D.best[o.s.uid] || {})[x.id] || {})['section-' + n]).filter(e => e && e.best != null).map(e => e.best);
          return `<tr><td>${n}. ${esc(t)}</td><td class="c">${sc.length}/${studs.length}</td><td class="c"><span class="cell ${gradeClass(avg(sc))}">${avg(sc) ?? '—'}</span></td></tr>`; }).join('')}</tbody></table></div>` : ''}
      <h3 class="rs-h">Рейтинг учнів</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>Учень</th><th class="c">Середній</th><th style="min-width:130px">Уроки</th><th class="c">Остання спроба</th></tr></thead><tbody>
        ${studs.map((o, i) => `<tr><td>${i + 1}</td><td><a href="javascript:void(0)" data-st="${o.s.uid}" style="font-weight:800">${esc(o.s.name)}</a></td><td class="c"><span class="cell ${gradeClass(o.m.avg)}">${o.m.avg ?? '—'}</span></td><td>${doneBar(o.m.done)}</td><td class="c">${ago(o.m.last)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">У класі немає учнів</td></tr>'}</tbody></table></div>
      ${inline && perLesson.length ? `<h3 class="rs-h">За параграфами</h3><div class="table-wrap" style="max-height:420px"><table class="tbl tbl-compact"><thead><tr><th>Параграф</th><th class="c">Склали</th><th class="c">Середній</th></tr></thead><tbody>
        ${perLesson.map(o => `<tr><td><b>§ ${o.l[1]}</b> ${esc(o.l[2])}</td><td class="c">${o.n}/${studs.length}</td><td class="c"><span class="cell ${gradeClass(o.avg)}">${o.avg ?? '—'}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
      ${hard.length ? `<h3 class="rs-h">Найскладніші тести</h3><ul class="rs-list">${hard.map(h => `<li><b>${esc(resTitle(h))}</b> — середній ${h.avg}, зараховано ${h.rate}% (${h.n} спроб)</li>`).join('')}</ul>` : ''}
      <div class="m-actions"><a class="btn light" href="#/teacher/results/journal/${x.cls}/${x.id}" ${inline ? '' : 'data-close'}>📒 Журнал класу</a>${inline ? '<button class="btn brand" data-man>✍️ Зарахувати вручну</button>' : '<button class="btn brand" data-close>Закрити</button>'}</div>`;
  }

  /* ---- ручне зарахування: учень виконав тест раніше (на папері, до появи порталу, без входу) ---- */
  function manualCreditDialog(D, pre) {
    pre = pre || {};
    const classes = [...new Set(D.subs.map(x => x.cls))].sort((a, b) => a - b);
    const today = isoDay(new Date());
    modal(`<h2>✍️ Зарахувати тест вручну</h2>
      <p class="muted" style="font-weight:700;margin-bottom:10px">Для тестів, які учень уже виконав раніше самостійно (на папері, на уроці, до появи порталу). Оцінку буде позначено «✍️ вручну», а тест для учня — зарахованим.</p>
      <div class="m-grid2">
        <div class="field"><label>Клас</label><select class="input" id="mC">${classes.map(c => `<option value="${c}" ${pre.cls == c ? 'selected' : ''}>${c} клас</option>`).join('')}</select></div>
        <div class="field"><label>Предмет</label><select class="input" id="mS"></select></div>
      </div>
      <div class="field"><label>Учень</label><select class="input" id="mU"></select></div>
      <div class="field"><label>Тест</label><select class="input" id="mT"></select><small class="muted" id="mTinfo"></small></div>
      <div class="m-grid2">
        <div class="field"><label>Оцінка (1–12)</label><input class="input" id="mScore" type="number" min="1" max="12" step="1" placeholder="напр. 10"></div>
        <div class="field"><label>Дата виконання</label><input class="input" id="mDate" type="date" value="${today}" max="${today}"></div>
      </div>
      <div class="field"><label>Примітка (необов’язково)</label><input class="input" id="mNote" maxlength="120" placeholder="напр. письмова робота на уроці"></div>
      <div class="form-error" id="mErr"></div>
      <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="mGo">Зарахувати</button><button class="btn light" id="mGoMore" title="Зберегти й внести ще одну оцінку">Зарахувати й ще</button></div>`, (bx, close) => {
      const cS = bx.querySelector('#mC'), sS = bx.querySelector('#mS'), uS = bx.querySelector('#mU'), tS = bx.querySelector('#mT');
      const fillS = () => { const list = D.subs.filter(x => x.cls == cS.value).slice().sort((a, b) => a.name.localeCompare(b.name, 'uk'));
        sS.innerHTML = list.map(x => `<option value="${x.id}">${esc(x.icon)} ${esc(x.name)}</option>`).join('');
        if (pre.course && list.some(x => x.id === pre.course)) sS.value = pre.course; };
      const fillU = () => { const list = D.students.filter(s => s.cls == cS.value);
        uS.innerHTML = list.length ? list.map(s => `<option value="${s.uid}">${esc(s.name)}</option>`).join('') : '<option value="">У класі немає учнів</option>';
        if (pre.uid && list.some(s => s.uid === pre.uid)) uS.value = pre.uid; };
      const fillT = () => { const ix = (window.LESSON_INDEX || {})[sS.value] || { s: [], l: [] }, done = (D.best[uS.value] || {})[sS.value] || {};
        const opts = [];
        ix.s.forEach(([n, t]) => { opts.push(`<optgroup label="Розділ ${n}. ${esc(t)}">`);
          ix.l.filter(l => l[3] === n).forEach(l => { const e = done[l[0]]; opts.push(`<option value="${l[0]}" ${e && e.best != null ? 'disabled' : ''}>§ ${l[1]}. ${esc(l[2])}${e && e.best != null ? ' — уже зараховано (' + e.best + ')' : ''}</option>`); });
          const e = done['section-' + n]; opts.push(`<option value="section-${n}" ${e && e.best != null ? 'disabled' : ''}>🏁 Підсумковий за розділ ${n}${e && e.best != null ? ' — уже зараховано' : ''}</option></optgroup>`); });
        const ef = done.final; if (ix.s.length) opts.push(`<option value="final" ${ef && ef.best != null ? 'disabled' : ''}>🏆 Річний підсумковий${ef && ef.best != null ? ' — уже зараховано' : ''}</option>`);
        tS.innerHTML = opts.join('') || '<option value="">Тестів немає</option>';
        const first = [...tS.options].find(o => !o.disabled && o.value); if (first) tS.value = first.value; };
      cS.onchange = () => { fillS(); fillU(); fillT(); }; sS.onchange = fillT; uS.onchange = fillT;
      fillS(); fillU(); fillT();
      const save = async more => {
        const err = bx.querySelector('#mErr'); err.textContent = '';
        const score = Math.round(+bx.querySelector('#mScore').value), st = D.stuById[uS.value], key = tS.value, x = D.subById[sS.value];
        if (!st) { err.textContent = 'Оберіть учня'; return; }
        if (!x || !key) { err.textContent = 'Оберіть тест'; return; }
        if (!(score >= 1 && score <= 12)) { err.textContent = 'Оцінка — ціле число від 1 до 12'; return; }
        if (score < C.passScore) { err.textContent = `Тест зараховується від ${C.passScore} балів. Нижчу оцінку вносити вручну не потрібно.`; return; }
        const ix = (window.LESSON_INDEX || {})[x.id] || { s: [], l: [] };
        let kind = 'lesson', title = '', extra = {};
        if (key === 'final') { kind = 'final'; title = 'Річний підсумковий тест'; }
        else if (/^section-/.test(key)) { const n = +key.split('-')[1], sec = ix.s.find(z => z[0] === n); kind = 'section'; title = `Підсумковий тест · Розділ ${n}. ${sec ? sec[1] : ''}`; extra.sectionN = n; }
        else { const l = ix.l.find(z => z[0] === key); title = 'Тест: ' + (l ? l[2] : key); extra.lessonId = key; extra.sectionN = l ? l[3] : null; }
        const d = bx.querySelector('#mDate').value, atMs = d ? new Date(d + 'T12:00').getTime() : Date.now();
        const r = Object.assign({ uid: st.uid, name: st.name, cls: st.cls, course: x.id, kind, testId: key, title, score, full: 0, total: 0, durationSec: 0, leaves: 0,
          atMs, byName: user.name || '', note: bx.querySelector('#mNote').value.trim() }, extra);
        const b = bx.querySelector('#mGo'); b.disabled = true;
        try { await Store.saveManualResult(r); }
        catch (e) { err.textContent = e.message; b.disabled = false; return; }
        RS = null; toast(`Зараховано: ${st.name} — ${score} б.`);
        if (more) { pre = { cls: cS.value, course: sS.value }; close(); const D2 = await loadResultsData(true); manualCreditDialog(D2, pre); }
        else { close(); route(); }
      };
      bx.querySelector('#mGo').onclick = () => save(false);
      bx.querySelector('#mGoMore').onclick = () => save(true);
    });
  }

  /* ---- за класами ---- */
  function rsClasses(D, box) {
    const all = [...new Set(D.subs.map(x => x.cls))].sort((a, b) => a - b);
    const pick = ss.getItem('rsClsF') || '';
    box.innerHTML = `<div class="toolbar rs-filters"><select class="input" id="kC"><option value="">Усі класи</option>${all.map(c => `<option value="${c}" ${pick == c ? 'selected' : ''}>${c} клас</option>`).join('')}</select></div><div id="clsOut"></div>`;
    box.querySelector('#kC').onchange = e => { ss.setItem('rsClsF', e.target.value); rsClassesDraw(D, box.querySelector('#clsOut'), e.target.value); };
    rsClassesDraw(D, box.querySelector('#clsOut'), pick);
  }
  function rsClassesDraw(D, box, pick) {
    const classes = [...new Set(D.subs.map(x => x.cls))].filter(c => !pick || c == pick).sort((a, b) => a - b);
    const rows = classes.map(c => {
      const subs = D.subs.filter(x => x.cls === c).slice().sort((a, b) => a.name.localeCompare(b.name, 'uk')).map(x => subjectRow(D, x));
      const studs = D.students.filter(s => s.cls === c);
      const scores = subs.flatMap(r => r.scores);
      const week = new Set(D.results.filter(r => Date.now() - (r.atMs || 0) < 7 * DAY && studs.some(s => s.uid === r.uid) && subs.some(z => z.x.id === r.course)).map(r => r.uid)).size;
      const rated = subs.filter(r => r.avg != null).sort((a, b) => b.avg - a.avg);
      const dn = subs.filter(r => r.done != null);
      return { c, k: classInfo(c), subs, students: studs.length, avg: avg(scores), scores, week, done: dn.length ? dn.reduce((a, r) => a + r.done, 0) / dn.length : null, top: rated[0], low: rated.length > 1 ? rated[rated.length - 1] : null };
    });
    const empty = rows.filter(r => !r.students), full = rows.filter(r => r.students);
    box.innerHTML = `${empty.length ? `<p class="muted rs-sum">Без учнів: ${empty.map(r => r.c + ' клас').join(', ')} — <a href="#/teacher/students">додати учнів</a></p>` : ''}
      ${!full.length ? '<div class="card empty"><span class="e">🧑‍🎓</span>У ваших класах ще немає учнів</div>' : ''}
      <div class="class-stats">${full.map(r => `<div class="card cs-card" style="--c:${esc(r.k ? r.k.color : '#6C5CE7')}">
        <div class="cs-head"><span class="cs-num">${r.c}</span><div><h3>${r.c} клас</h3><span class="muted">${r.students} учнів · активних за тиждень: ${r.week}</span></div>
          <span class="cell ${gradeClass(r.avg)} cs-avg" title="Середній бал">${r.avg ?? '—'}</span></div>
        <div style="margin:10px 0">${doneBar(r.done)}</div>
        ${levelBars(r.scores)}
        <div class="cs-list">${r.subs.map(z => `<div class="cs-row"><span class="cs-name">${esc(z.x.icon)} ${esc(z.x.name)}</span><span class="cell ${gradeClass(z.avg)}">${z.avg ?? '—'}</span><span class="cs-bar">${doneBar(z.done)}</span><a class="btn light sm cs-j" href="#/teacher/results/journal/${r.c}/${z.x.id}" title="Журнал">📒</a></div>`).join('')}</div>
        ${r.top && r.low ? `<p class="muted cs-note">💪 Найкраще: <b>${esc(r.top.x.name)}</b> (${r.top.avg}) · 📌 Підтягнути: <b>${esc(r.low.x.name)}</b> (${r.low.avg})</p>` : ''}
        <button class="btn light sm" data-cls="${r.c}">🧑‍🎓 Учні класу</button></div>`).join('')}</div>`;
    box.querySelectorAll('[data-cls]').forEach(bt => bt.onclick = () => { ss.setItem('rsStuF', JSON.stringify({ c: bt.dataset.cls })); location.hash = '#/teacher/results/students'; });
  }

  /* ---- за учнями ---- */
  function rsStudents(D, box) {
    const f = JSON.parse(ss.getItem('rsStuF') || '{}');
    const classes = [...new Set(D.subs.map(x => x.cls))].sort((a, b) => a - b);
    const all = D.students.map(s => studentRow(D, s)).filter(r => r.subs.length);
    box.innerHTML = `<div class="toolbar rs-filters">
        <select class="input" id="sC"><option value="">Усі класи</option>${classes.map(c => `<option value="${c}" ${f.c == c ? 'selected' : ''}>${c} клас</option>`).join('')}</select>
        <select class="input" id="sO">${[['name', 'За прізвищем'], ['avgD', 'Середній бал ↓'], ['avgA', 'Середній бал ↑'], ['done', 'Виконання ↓'], ['last', 'Давно не заходили'], ['flags', 'Потребують уваги']].map(([k, t]) => `<option value="${k}" ${f.o === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <label class="sp-item"><input type="checkbox" id="sF" ${f.f ? 'checked' : ''}><span>Лише ⚠️</span></label>
        <input class="input" id="sQ" placeholder="🔍 Прізвище" value="${esc(f.q || '')}">
        <button class="btn light sm" id="sCsv">⬇️ CSV (Excel)</button></div><div id="stOut"></div>`;
    const get = () => ({ c: box.querySelector('#sC').value, o: box.querySelector('#sO').value, f: box.querySelector('#sF').checked, q: box.querySelector('#sQ').value.trim().toLowerCase() });
    const list = () => { const v = get(); ss.setItem('rsStuF', JSON.stringify(v));
      const l = all.filter(r => (!v.c || r.s.cls == v.c) && (!v.f || r.flags.length) && (!v.q || r.s.name.toLowerCase().includes(v.q)));
      const by = { name: (a, b) => a.s.cls - b.s.cls || a.s.name.localeCompare(b.s.name, 'uk'), avgD: (a, b) => (b.avg ?? -1) - (a.avg ?? -1), avgA: (a, b) => (a.avg ?? 99) - (b.avg ?? 99),
        done: (a, b) => (b.done ?? -1) - (a.done ?? -1), last: (a, b) => (a.last || 0) - (b.last || 0), flags: (a, b) => b.flags.length - a.flags.length }[v.o] || ((a, b) => 0);
      return l.sort(by); };
    const draw = () => {
      const l = list();
      box.querySelector('#stOut').innerHTML = `<p class="muted rs-sum">Учнів: <b>${l.length}</b> · потребують уваги: <b>${l.filter(r => r.flags.length).length}</b></p>
        <div class="card table-wrap" style="max-height:72vh"><table class="tbl tbl-compact rs-stu-tbl"><thead><tr><th>Учень</th><th class="c">Середній</th><th style="width:26%">Пройдено уроків</th><th class="c">Тести · спроби</th><th class="c">Останній вхід</th></tr></thead><tbody>
        ${l.map(r => `<tr><td class="t-name"><a href="javascript:void(0)" data-st="${r.s.uid}">${esc(r.s.name)}</a><small>${r.s.cls} клас</small>${flagsHtml(D, r, false)}</td>
          <td class="c"><span class="cell ${gradeClass(r.avg)}">${r.avg ?? '—'}</span></td><td>${doneBar(r.done)}</td><td class="c t-meta"><b>${r.passed}</b><small>${r.attempts} спроб</small></td>
          <td class="c t-meta"><b>${ago(r.last)}</b></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Нікого не знайдено</td></tr>'}
        </tbody></table></div>`;
      bindStudentLinks(D, box.querySelector('#stOut'));
    };
    box.querySelectorAll('.rs-filters select, #sF').forEach(s => s.onchange = draw);
    let t; box.querySelector('#sQ').oninput = () => { clearTimeout(t); t = setTimeout(draw, 250); };
    box.querySelector('#sCsv').onclick = () => downloadCsv('uchni_statystyka.csv', [['Учень', 'Клас', 'Середній бал', 'Тестів зараховано', 'Пройдено уроків, %', 'Спроб', 'Останній вхід', 'Сигнали']]
      .concat(list().map(r => [r.s.name, r.s.cls, r.avg ?? '', r.passed, r.done == null ? '' : Math.round(r.done * 100), r.attempts, r.last ? fmtDate(r.last) : '', r.flags.join(', ')])));
    draw();
  }

  /* ---- картка учня ---- */
  function studentProfile(D, s) {
    if (!s) return;
    const r = studentRow(D, s);
    let rs = D.results.filter(x => x.uid === s.uid && D.subById[x.course]);
    const draw = () => `<h2>${esc(s.name)}</h2><p class="muted" style="font-weight:700;margin-bottom:12px">${s.cls} клас · логін <code>${esc(s.login || '')}</code> · останній вхід: ${ago(r.last)}</p>
      ${flagsHtml(D, r, true)}
      <div class="stat-tiles sm"><div class="card stat-tile"><div class="v">${r.avg ?? '—'}</div><div class="k">Середній бал</div></div>
        <div class="card stat-tile"><div class="v">${r.passed}</div><div class="k">Тестів зараховано</div></div>
        <div class="card stat-tile"><div class="v">${r.done == null ? '—' : Math.round(r.done * 100) + '%'}</div><div class="k">Пройдено уроків</div></div></div>
      <h3 class="rs-h">За предметами</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>Предмет</th><th class="c">Середній</th><th style="min-width:130px">Уроки</th><th class="c">Спроб</th><th class="c">Остання</th><th></th></tr></thead><tbody>
        ${r.subs.map((x, i) => { const m = r.ms[i]; return `<tr><td>${esc(x.icon)} ${esc(x.name)}</td><td class="c"><span class="cell ${gradeClass(m.avg)}">${m.avg ?? '—'}</span></td><td>${doneBar(m.done)}</td><td class="c">${m.attempts}</td><td class="c">${ago(m.last)}</td>
          <td><a class="btn light sm" href="#/teacher/results/journal/${x.cls}/${x.id}" data-close title="Журнал">📒</a> <a class="btn light sm" href="#/chat/${x.id}/${s.uid}" data-close title="Написати учню">💬</a></td></tr>`; }).join('')}</tbody></table></div>
      <h3 class="rs-h">Усі спроби (${rs.length})</h3>
      <p class="muted" style="font-size:13px;font-weight:700;margin-bottom:8px">Зарахований тест блокується для учня. Щоб дозволити пройти його ще раз, видаліть спробу (✕).</p>
      ${attemptsTable(D, rs, true, true)}
      <div class="m-actions"><button class="btn light" id="spMan">✍️ Зарахувати вручну</button><button class="btn brand" data-close>Закрити</button></div>`;
    modal(draw(), function mount(box, close) {
      const mb = box.querySelector('#spMan'); if (mb) mb.onclick = () => { close(); manualCreditDialog(D, { cls: s.cls, uid: s.uid }); };
      box.querySelectorAll('[data-rdel]').forEach(bt => bt.onclick = async () => {
        await delAttempt(D, bt.dataset.rdel); rs = rs.filter(x => x.id !== bt.dataset.rdel);
        Object.assign(r, studentRow(D, s)); box.innerHTML = draw();
        box.querySelectorAll('[data-close]').forEach(x => x.onclick = () => { close(); route(); }); mount(box, close);
      });
    }, { wide: true });
  }

  /* ---------- журнал: друк і PDF з автоматичною орієнтацією сторінки ---------- */
  const PRINT_CSS = `*{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;color:#1F2340;margin:0;padding:0}
    h1{font-size:15px;margin:0 0 4px}.meta{font-size:10.5px;color:#6B6F8E;margin:0 0 8px}
    table{border-collapse:collapse;width:100%;font-size:10.5px}th,td{border:1px solid #CBD5E1;padding:3px 4px;text-align:center}
    th{background:#F1F5F9;font-weight:800}td.nm,th.sticky-col{text-align:left;white-space:nowrap}
    .cell,.j-pa{display:inline-block;min-width:20px;padding:1px 3px;border-radius:4px;font-weight:800}
    .g-hi{background:#E6F6F0;color:#047857}.g-mid{background:#EAF2FF;color:#1D4ED8}.g-avg{background:#FEF5E3;color:#B45309}.g-lo{background:#FDEDED;color:#B91C1C}.none{color:#94A3B8}
    .th-sub{display:block;font-size:8px;color:#6B7280;font-weight:600}.j-pair{display:inline-flex;gap:3px}
    .j-sec-title{font-weight:800;font-size:12px;margin:0 0 6px}.j-legend{margin-top:8px;font-size:9.5px;columns:2;column-gap:18px}.j-legend span{display:block}.j-legend b{color:#4F46E5;margin-right:4px}
    .j-avg{background:#FAFAFF}.j-print-only{display:none}`;
  function journalDoc(el, title, landscape) {
    const c = el.cloneNode(true);
    c.querySelectorAll('a,button').forEach(x => { const sp = document.createElement('span'); sp.className = x.className; sp.textContent = x.textContent === '＋' ? '' : x.textContent; x.replaceWith(sp); });
    c.querySelectorAll('.j-print-only').forEach(x => x.remove());
    return `<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:10mm}${PRINT_CSS}</style></head>
      <body><h1>${esc(title)}</h1><p class="meta">Сформовано ${new Date().toLocaleDateString('uk-UA')} · ${landscape ? 'альбомна' : 'книжкова'} орієнтація</p>${c.innerHTML}</body></html>`;
  }
  /* альбомна, якщо таблиця широка: багато стовпців або не вміщується в ширину книжкової сторінки */
  function journalLandscape(el) {
    const t = el.querySelector('table'); if (!t) return false;
    const ncol = Math.max(0, ...[...t.rows].map(r => [...r.cells].reduce((a, c) => a + (c.colSpan || 1), 0)));
    return ncol > 9 || t.scrollWidth > 760;
  }
  /* друк довільного HTML через прихований iframe (не блокується як спливне вікно) */
  function printHtml(html, delay) {
    const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(fr);
    const d = fr.contentWindow.document; d.open(); d.write(html); d.close();
    setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { toast('Браузер заблокував друк'); } setTimeout(() => fr.remove(), 60000); }, delay || 350);
  }
  /* ---------- власний генератор PDF (без зовнішніх бібліотек): таблиця → сторінки-зображення A4 ---------- */
  const PDFGEN = (() => {
    const GC = { 'g-hi': ['#E6F6F0', '#047857'], 'g-mid': ['#EAF2FF', '#1D4ED8'], 'g-avg': ['#FEF5E3', '#B45309'], 'g-lo': ['#FDEDED', '#B91C1C'] };
    const gradeOf = el => { const g = el.querySelector('.cell,.j-pa'); if (!g) return null; const k = Object.keys(GC).find(x => g.classList.contains(x)); return k ? GC[k] : null; };
    /* сітка таблиці з урахуванням rowspan/colspan */
    function grid(table) {
      const out = [], occ = []; let head = 0;
      [...table.rows].forEach((tr, r) => {
        if (tr.parentElement.tagName === 'THEAD') head = r + 1;
        occ[r] = occ[r] || []; let c = 0;
        [...tr.cells].forEach(td => {
          while (occ[r][c]) c++;
          const rs = td.rowSpan || 1, cs = td.colSpan || 1;
          for (let i = 0; i < rs; i++) { occ[r + i] = occ[r + i] || []; for (let j = 0; j < cs; j++) occ[r + i][c + j] = 1; }
          const txt = td.textContent.replace(/＋/g, '').replace(/\s+/g, ' ').trim();
          const chips = [...td.querySelectorAll('.cell,.j-pa')].map(e => ({ t: e.textContent.replace(/＋/g, '').trim(), g: GC[Object.keys(GC).find(x => e.classList.contains(x))] || null }));
          out.push({ r, c, rs, cs, txt, chips: chips.length > 1 ? chips : null, th: td.tagName === 'TH', left: td.classList.contains('sticky-col') || td.classList.contains('nm'), g: gradeOf(td), sub: td.querySelector('.th-sub') ? td.querySelector('.th-sub').textContent.trim() : '' });
          c += cs;
        });
      });
      const ncol = Math.max(...occ.map(x => x.length)), nrow = table.rows.length;
      return { cells: out, ncol, nrow, head };
    }
    function render(o) {
      const { table, title, subtitle, legend, landscape } = o;
      const S = 4, PW = (landscape ? 297 : 210) * S, PH = (landscape ? 210 : 297) * S, M = 10 * S;
      const G = grid(table), W = PW - 2 * M;
      const ctx0 = document.createElement('canvas').getContext('2d');
      let fs = 13; const font = (b, f) => `${b ? '700' : '500'} ${f}px Inter, Arial, sans-serif`;
      let widths;
      for (; fs >= 7; fs -= 0.5) {
        widths = Array(G.ncol).fill(fs * 2.2);
        G.cells.filter(x => x.cs === 1).forEach(x => { ctx0.font = font(x.th || x.left, fs); const tw = x.chips ? x.chips.reduce((a, ch) => a + ctx0.measureText(ch.t).width + fs, 0) : ctx0.measureText(x.txt).width; widths[x.c] = Math.max(widths[x.c], tw + fs * 1.1); });
        if (widths.reduce((a, b) => a + b, 0) <= W) break;
      }
      const tot = widths.reduce((a, b) => a + b, 0), k = W / tot; widths = widths.map(w => w * Math.min(k, 1.8));
      const xs = [M]; widths.forEach((w, i) => xs.push(xs[i] + w));
      const rh = fs * 2.1, pages = [];
      let cv, ctx, y;
      const newPage = first => {
        cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, PW, PH); ctx.textBaseline = 'middle'; y = M;
        if (first) { ctx.fillStyle = '#1F2340'; ctx.font = font(true, 22); ctx.fillText(title, M, y + 12); y += 30;
          if (subtitle) { ctx.fillStyle = '#6B6F8E'; ctx.font = font(false, 13); ctx.fillText(subtitle, M, y + 8); y += 24; } }
        pages.push(cv);
      };
      const drawRow = r => {
        G.cells.filter(x => x.r === r).forEach(x => {
          const x0 = xs[x.c], x1 = xs[x.c + x.cs], h = rh * x.rs;
          ctx.fillStyle = x.th ? '#F1F5F9' : '#fff'; ctx.fillRect(x0, y, x1 - x0, h);
          ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1; ctx.strokeRect(x0 + .5, y + .5, x1 - x0, h);
          if (!x.txt) return;
          if (x.chips) { ctx.font = font(true, fs); const ws = x.chips.map(ch => ctx.measureText(ch.t).width), gap = fs * 0.9, all = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
            let cx = (x0 + x1 - all) / 2; const cy = y + h / 2;
            x.chips.forEach((ch, i) => { if (ch.g) { ctx.fillStyle = ch.g[0]; ctx.fillRect(cx - fs * 0.3, cy - fs * 0.75, ws[i] + fs * 0.6, fs * 1.5); ctx.fillStyle = ch.g[1]; } else ctx.fillStyle = '#94A3B8'; ctx.fillText(ch.t, cx, cy); cx += ws[i] + gap; });
            return; }
          let t = x.txt; if (x.sub && t.endsWith(x.sub)) t = t.slice(0, -x.sub.length).trim();
          ctx.font = font(x.th || !!x.g, fs);
          while (t.length > 1 && ctx.measureText(t).width > x1 - x0 - 6) t = t.slice(0, -2) + '…';
          const tw = ctx.measureText(t).width, cx = x.left ? x0 + fs * 0.5 : (x0 + x1 - tw) / 2, cy = y + h / 2 - (x.sub ? fs * 0.35 : 0);
          if (x.g) { ctx.fillStyle = x.g[0]; ctx.fillRect(cx - fs * 0.35, cy - fs * 0.75, tw + fs * 0.7, fs * 1.5); ctx.fillStyle = x.g[1]; } else ctx.fillStyle = x.th ? '#334155' : '#1F2340';
          ctx.fillText(t, cx, cy);
          if (x.sub) { ctx.font = font(false, fs * 0.72); ctx.fillStyle = '#6B7280'; const sw = ctx.measureText(x.sub).width; ctx.fillText(x.sub, (x0 + x1 - sw) / 2, cy + fs * 0.85); }
        });
      };
      const drawHead = () => { for (let r = 0; r < G.head; r++) { drawRow(r); y += rh; } };
      newPage(true); drawHead();
      for (let r = G.head; r < G.nrow; r++) {
        if (y + rh > PH - M) { newPage(false); drawHead(); }
        drawRow(r); y += rh;
      }
      if (legend && legend.length) {
        y += fs; ctx.font = font(false, fs * 0.9);
        legend.forEach(line => {
          if (y + fs * 1.4 > PH - M) { newPage(false); ctx.font = font(false, fs * 0.9); }
          ctx.fillStyle = '#334155'; let t = line; while (t.length > 1 && ctx.measureText(t).width > W) t = t.slice(0, -2) + '…';
          ctx.fillText(t, M, y + fs * 0.7); y += fs * 1.4;
        });
      }
      return { pages, landscape };
    }
    /* мінімальний PDF: кожна сторінка — одне JPEG-зображення (DCTDecode) */
    function build(pages, landscape) {
      const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
      const push = b => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
      const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body.forEach(push); push('\nendobj\n'); };
      const PWp = landscape ? 841.89 : 595.28, PHp = landscape ? 595.28 : 841.89, n = pages.length;
      push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
      obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
      obj(2, [`<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => (3 + i * 3) + ' 0 R').join(' ')}] >>`]);
      pages.forEach((cv, i) => {
        const p = 3 + i * 3, b64 = cv.toDataURL('image/jpeg', 0.92).split(',')[1], bin = atob(b64), img = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) img[j] = bin.charCodeAt(j);
        const cs = `q ${PWp} 0 0 ${PHp} 0 0 cm /Im0 Do Q`;
        obj(p, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PWp} ${PHp}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`]);
        obj(p + 1, [`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`]);
        obj(p + 2, [`<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`, img, '\nendstream']);
      });
      const total = 3 + n * 3, xref = len;
      push(`xref\n0 ${total}\n0000000000 65535 f \n`);
      for (let i = 1; i < total; i++) push(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
      push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
      return new Blob(parts, { type: 'application/pdf' });
    }
    return { render, build };
  })();
  async function journalExport(el, title, mode, fname) {
    if (!el) return;
    const landscape = journalLandscape(el), html = journalDoc(el, title, landscape);
    const printIt = () => printHtml(html);
    if (mode === 'print') return printIt();
    try {
      const table = el.querySelector('table');
      const legend = [...el.querySelectorAll('.j-legend span')].map(x => x.textContent.replace(/\s+/g, ' ').trim());
      const { pages } = PDFGEN.render({ table, title, subtitle: 'Сформовано ' + new Date().toLocaleDateString('uk-UA') + ' · ' + (landscape ? 'альбомна' : 'книжкова') + ' орієнтація', legend, landscape });
      const blob = PDFGEN.build(pages, landscape);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname || 'zhurnal.pdf'; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
      toast('PDF збережено (' + (landscape ? 'альбомна' : 'книжкова') + ' орієнтація, сторінок: ' + pages.length + ')');
    } catch (e) {
      console.warn(e); toast('Не вдалося створити PDF — відкриваю друк: оберіть «Зберегти як PDF»'); printIt();
    }
  }
  /* посилання на журнал класу з оцінками за урок для параграфа */
  const journalHref = (course, lid) => `#/teacher/results/journal/${subjInfo(course).cls}/${course}/${lid}`;
  const canJournal = course => isStaff() && canCourse(course) && !!subjInfo(course).cls;
  async function renderJournal(clsArg, courseArg, tabsHtml, lidArg) {
    const classes = myClasses().filter(c => visibleSubjects(c).length || isAdmin());
    const ready = classes.flatMap(k => visibleSubjects(k).filter(s => s.ready).map(s => ({ cls: k.cls, s })));
    let cls = +(clsArg || ss.getItem('rsCls') || (ready[0] && ready[0].cls) || 2);
    if (!classes.some(c => c.cls === cls)) cls = ready[0] ? ready[0].cls : (classes[0] ? classes[0].cls : cls);
    const k = classes.find(c => c.cls === cls);
    const subs = k ? (isAdmin() ? k.subjects : visibleSubjects(k)) : [];
    let subj = subs.find(s => s.id === courseArg) || null;
    if (!subj && k && courseArg) { const m = catalogSubject(courseArg); if (m && m.archived && m.cls === cls && canCourse(m.id)) subj = m; }
    if (!subj) subj = subs.find(s => s.ready);
    ss.setItem('rsCls', cls);
    const head = tabsHtml + `<p class="muted rs-sum" style="margin-top:0">Найкращі зараховані оцінки кожного учня класу з обраного предмета</p>
      <div class="toolbar">
        <select class="input" id="rCls">${classes.map(c => `<option value="${c.cls}" ${c.cls === cls ? 'selected' : ''}>${c.cls} клас</option>`).join('')}</select>
        <select class="input" id="rSub">${subs.map(s => `<option value="${s.id}" ${subj && s.id === subj.id ? 'selected' : ''} ${s.ready ? '' : 'disabled'}>${esc(s.name)}${s.ready ? '' : ' (готується)'}</option>` + (s.archive || []).map(a => `<option value="${a.course}" ${subj && a.course === subj.id ? 'selected' : ''}>${esc(s.name)} — архів: ${esc(a.label || a.course)}</option>`).join('')).join('')}</select>
        <span id="rTools"></span>
      </div>`;
    $app.innerHTML = head + '<div class="loader"><span></span></div>';
    const bind = () => {
      $app.querySelector('#rCls').onchange = e => { location.hash = '#/teacher/results/journal/' + e.target.value; };
      $app.querySelector('#rSub').onchange = e => { location.hash = '#/teacher/results/journal/' + cls + '/' + e.target.value; };
    };
    bind();
    if (!subj || !subj.ready) { $app.innerHTML = head + `<div class="card empty"><span class="e">⏳</span>Для цього класу ще немає наповнених предметів</div>`; bind(); return; }

    const [course, students, results] = await Promise.all([loadCourse(subj.id), Store.listStudents(), Store.courseResults(subj.id)]);
    const list = students.filter(s => s.cls === cls).sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    const lessons = course.sections.flatMap(s => s.lessons);
    /* номер параграфа за підручником (з індексу уроків); якщо його немає — порядковий номер уроку */
    const pn = l => { const n = lessonNo(subj.id, l.id); return n != null ? '§' + n : 'У' + l.n; };
    const MK = l => 'mark:' + l.id;
    const canMark = isAdmin() || canCourse(subj.id);
    const cols = [];
    course.sections.forEach(s => {
      s.lessons.forEach(l => cols.push({ id: l.id, l, label: pn(l) + '. ' + l.title, short: pn(l), kind: 'lesson' }));
      cols.push({ id: 'section-' + s.n, label: 'Підсумковий: розділ ' + s.n, short: 'Р' + s.n, kind: 'section' });
    });
    cols.push({ id: 'final', label: 'Річний підсумковий', short: 'Рік', kind: 'final' });
    const byUser = {};
    results.forEach(r => (byUser[r.uid] = byUser[r.uid] || []).push(r));
    const best = (bm, id) => bm[id] && bm[id].best != null ? bm[id].best : null;
    /* середній бал за параграф: оцінка за тест і оцінка за урок (що є) */
    const pAvg = (bm, l) => avg([best(bm, l.id), best(bm, MK(l))].filter(v => v != null));

    const rowsData = list.map(s => {
      const bm = bestMap(byUser[s.uid] || []);
      const pa = lessons.map(l => pAvg(bm, l)).filter(v => v != null);
      const sb = course.sections.map(x => best(bm, 'section-' + x.n)).filter(v => v != null);
      return { s, bm, lessonAvg: avg(pa), lessonDone: lessons.filter(l => best(bm, l.id) != null).length, marks: lessons.filter(l => best(bm, MK(l)) != null).length,
        sectionAvg: avg(sb), final: best(bm, 'final'), attempts: (byUser[s.uid] || []).length };
    });
    /* вигляд журналу: «огляд» (по розділах) або окремий розділ — без горизонтальної прокрутки */
    const focusL = lidArg ? lessons.find(l => l.id === lidArg) : null;
    if (focusL) ss.setItem('jView:' + subj.id, 'sec' + focusL.section.n);
    let jv = ss.getItem('jView:' + subj.id) || 'all';
    if (jv !== 'all' && !course.sections.some(x => 'sec' + x.n === jv)) jv = 'all';
    const cell = e => {
      if (!e) return `<span class="cell none">·</span>`;
      if (e.best != null) return `<span class="cell ${gradeClass(e.best)}" title="Спроб: ${e.attempts}">${e.best}</span>`;
      return `<span class="cell g-lo" title="Не зараховано, спроб: ${e.attempts}">✕</span>`;
    };
    const markCell = (r, l) => { const v = best(r.bm, MK(l));
      return `<button type="button" class="cell sm j-mk ${v != null ? gradeClass(v) : 'none'}" ${canMark ? `data-mk="${r.s.uid}|${l.id}"` : 'disabled'} title="Оцінка за урок${canMark ? ' — натисніть, щоб поставити чи змінити' : ''}">${v != null ? v : '＋'}</button>`; };

    $app.innerHTML = head + `
      <div class="stat-tiles">
        <div class="card stat-tile"><div class="v">${list.length}</div><div class="k">Учнів у класі</div></div>
        <div class="card stat-tile"><div class="v">${avg(rowsData.map(r => r.lessonAvg).filter(v => v != null)) ?? '—'}</div><div class="k">Середній бал класу (параграфи)</div></div>
        <div class="card stat-tile"><div class="v">${rowsData.reduce((a, r) => a + r.marks, 0)}</div><div class="k">Оцінок за уроки</div></div>
        <div class="card stat-tile"><div class="v">${rowsData.filter(r => r.final != null).length}</div><div class="k">Склали річний тест</div></div>
      </div>
      ${focusL && list.length ? `<div class="card j-lesson-bar"><div><b>✍️ Оцінки за урок</b><span>${esc(pn(focusL))}. ${esc(focusL.title)} · ${cls} клас · ${esc(subj.name)}</span></div>
        <div class="j-lesson-act"><button class="btn brand sm" id="jBulk">✍️ Виставити оцінки класу</button><a class="btn light sm" href="#/course/${subj.id}">← До параграфів</a></div></div>` : ''}
      ${list.length ? `<div class="fchips j-tabs"><button class="fchip ${jv === 'all' ? 'on' : ''}" data-jv="all">📊 Огляд за розділами</button>${course.sections.map(x => `<button class="fchip ${jv === 'sec' + x.n ? 'on' : ''}" data-jv="sec${x.n}" title="${esc(x.title)}">Розділ ${x.n}</button>`).join('')}</div>
        <div class="card table-wrap j-wrap" id="jPrint">${jv === 'all' ? `<div class="j-sec-title j-print-only">${esc(subj.name)} · ${cls} клас · огляд за розділами</div><table class="tbl tbl-compact">
        <thead><tr><th class="sticky-col">Учень</th><th class="c">Середній</th><th class="c">Тести</th>
          ${course.sections.map(x => `<th class="c j-secol" title="${esc(x.title)}">Р${x.n}<small class="th-sub">параграфи · підс.</small></th>`).join('')}<th class="c">Річний</th></tr></thead>
        <tbody>${rowsData.map(r => `<tr>
          <td class="sticky-col nm"><a href="javascript:void(0)" data-st="${r.s.uid}">${esc(r.s.name)}</a></td>
          <td class="c"><span class="cell ${gradeClass(r.lessonAvg)}">${r.lessonAvg ?? '—'}</span></td>
          <td class="c"><small class="j-done">${r.lessonDone}/${lessons.length}</small></td>
          ${course.sections.map(x => { const sb = x.lessons.map(l => pAvg(r.bm, l)).filter(v => v != null); const a = avg(sb);
            return `<td class="c j-secol"><span class="j-pair"><span class="cell sm ${gradeClass(a)}" title="Середній за параграфи розділу (тест + урок): ${sb.length} з ${x.lessons.length}">${a ?? '·'}</span>${cell(r.bm['section-' + x.n])}</span></td>`; }).join('')}
          <td class="c">${cell(r.bm.final)}</td></tr>`).join('')}</tbody></table>`
        : (() => { const sec = course.sections.find(x => 'sec' + x.n === jv);
          return `<div class="j-sec-title">${esc(subj.name)} · ${cls} клас · Розділ ${sec.n}. ${esc(sec.title)}</div><table class="tbl tbl-compact j-sec-tbl j-mk-tbl">
          <thead><tr><th class="sticky-col" rowspan="2">Учень</th>${sec.lessons.map(l => `<th class="c j-ph ${focusL && l.id === focusL.id ? 'j-focus' : ''}" colspan="3" title="${esc(pn(l) + '. ' + l.title)}" ${focusL && l.id === focusL.id ? 'id="jFocus"' : ''}>${esc(pn(l))}</th>`).join('')}<th class="c th-sum" rowspan="2" title="Підсумковий тест за розділ ${sec.n}">Підс.</th><th class="c" rowspan="2" title="Середній бал за параграфи розділу">Сер.</th></tr>
          <tr>${sec.lessons.map(() => `<th class="c j-sub" title="Оцінка за тест">т</th><th class="c j-sub" title="Оцінка за урок">у</th><th class="c j-sub j-avg" title="Середній за параграф">сер</th>`).join('')}</tr></thead>
          <tbody>${rowsData.map(r => { const sb = sec.lessons.map(l => pAvg(r.bm, l)).filter(v => v != null);
            return `<tr><td class="sticky-col nm"><a href="javascript:void(0)" data-st="${r.s.uid}">${esc(r.s.name)}</a></td>${sec.lessons.map(l => { const pa = pAvg(r.bm, l);
              const fc = focusL && l.id === focusL.id ? ' j-focus' : '';
              return `<td class="c j-t${fc}">${cell(r.bm[l.id])}</td><td class="c j-u${fc}">${markCell(r, l)}</td><td class="c j-avg${fc}"><b class="j-pa ${gradeClass(pa)}">${pa ?? '·'}</b></td>`; }).join('')}
              <td class="c">${cell(r.bm['section-' + sec.n])}</td><td class="c"><span class="cell ${gradeClass(avg(sb))}">${avg(sb) ?? '—'}</span></td></tr>`; }).join('')}</tbody></table>
          <div class="j-legend">${sec.lessons.map(l => `<span><b>${esc(pn(l))}</b> ${esc(l.title)}</span>`).join('')}</div>`; })()}</div>
        <p class="muted" style="margin-top:10px;font-size:13.5px;font-weight:700">${jv === 'all' ? 'У кожному розділі: ліворуч — середній бал за параграфи (тест + оцінка за урок), праворуч — підсумковий тест розділу. Оцінки за уроки ставляться у вкладці розділу. '
          : '«т» — оцінка за тест, «у» — оцінка за урок (натисніть ＋, щоб поставити), «сер» — середній бал за параграф. '}✕ — спроби були, але тест не зараховано. Натисніть на ім’я учня, щоб побачити всі спроби.</p>`
        : `<div class="card empty"><span class="e">🧑‍🎓</span>У ${cls} класі ще немає учнів. <a href="#/teacher/students">Додати учнів</a></div>`}`;
    bind();
    $app.querySelectorAll('[data-jv]').forEach(b => b.onclick = () => { ss.setItem('jView:' + subj.id, b.dataset.jv); renderJournal(clsArg, courseArg, tabsHtml); });
    $app.querySelector('#rTools').innerHTML = list.length ? `<button class="btn light sm" id="jPdf">📄 PDF</button> <button class="btn light sm" id="jPrn">🖨 Друк</button> <button class="btn light sm" id="csv">⬇️ CSV (Excel)</button>` : '';
    const docTitle = `Журнал · ${subj.name} · ${cls} клас${jv === 'all' ? '' : ' · розділ ' + jv.slice(3)}`;
    const pdfBtn = $app.querySelector('#jPdf'), prnBtn = $app.querySelector('#jPrn');
    if (pdfBtn) pdfBtn.onclick = () => journalExport($app.querySelector('#jPrint'), docTitle, 'pdf', `zhurnal_${cls}klas_${subj.id}${jv === 'all' ? '' : '_' + jv}.pdf`);
    if (prnBtn) prnBtn.onclick = () => journalExport($app.querySelector('#jPrint'), docTitle, 'print');
    /* оцінка за урок: зберігається як ручний запис із testId «mark:<урок>» (змінити = видалити й створити заново) */
    $app.querySelectorAll('[data-mk]').forEach(b => b.onclick = () => {
      const [uid, lid] = b.dataset.mk.split('|'); const s = list.find(x => x.uid === uid), l = lessons.find(x => x.id === lid);
      const old = (byUser[uid] || []).filter(r => r.testId === 'mark:' + lid);
      const cur = old.length ? Math.max(...old.map(r => r.score)) : null;
      modal(`<h2>Оцінка за урок</h2><p class="muted" style="font-weight:700;margin-bottom:12px">${esc(s.name)} · ${esc(pn(l))}. ${esc(l.title)}${best(bestMap(byUser[uid] || []), l.id) != null ? '<br>Оцінка за тест: <b>' + best(bestMap(byUser[uid] || []), l.id) + '</b>' : ''}</p>
        <div class="mk-grid">${Array.from({ length: 12 }, (_, i) => i + 1).map(v => `<button type="button" class="cell ${gradeClass(v)} mk-v ${v === cur ? 'on' : ''}" data-v="${v}">${v}</button>`).join('')}</div>
        <div class="form-error" id="mkErr"></div>
        <div class="m-actions">${cur != null ? '<button class="btn danger" id="mkDel">🗑 Прибрати оцінку</button>' : ''}<button class="btn light" data-close>Скасувати</button></div>`, (box, close) => {
        const done = async (v) => {
          try {
            for (const r of old) await Store.deleteResult(r.id);
            if (v != null) await Store.saveManualResult({ uid, name: s.name, cls: s.cls, course: subj.id, testId: 'mark:' + lid, kind: 'mark', title: 'Оцінка за урок: ' + pn(l) + '. ' + l.title, score: v, full: 0, total: 0, durationSec: 0, leaves: 0 });
            RS = null; close(); toast(v != null ? 'Оцінку ' + v + ' збережено' : 'Оцінку прибрано'); renderJournal(clsArg, courseArg, tabsHtml, lidArg);
          } catch (e) { box.querySelector('#mkErr').textContent = e.message || String(e); }
        };
        box.querySelectorAll('.mk-v').forEach(x => x.onclick = () => done(+x.dataset.v));
        const del = box.querySelector('#mkDel'); if (del) del.onclick = () => done(null);
      });
    });
    /* оцінки за урок усьому класу одразу */
    const bulk = $app.querySelector('#jBulk');
    if (bulk && focusL) bulk.onclick = () => {
      const l = focusL, cur = {};
      list.forEach(s => { const old = (byUser[s.uid] || []).filter(r => r.testId === 'mark:' + l.id); cur[s.uid] = old.length ? Math.max(...old.map(r => r.score)) : null; });
      const val = Object.assign({}, cur);
      modal(`<h2>✍️ Оцінки за урок</h2><p class="muted" style="font-weight:700;margin-bottom:10px">${esc(pn(l))}. ${esc(l.title)} · ${cls} клас</p>
        <div class="jb-list">${list.map(s => { const t = best(bestMap(byUser[s.uid] || []), l.id);
          return `<div class="jb-row" data-u="${s.uid}"><span class="jb-nm">${esc(s.name)}${t != null ? `<small>тест: <b class="${gradeClass(t)}">${t}</b></small>` : ''}</span>
          <span class="jb-g">${Array.from({ length: 12 }, (_, i) => i + 1).map(v => `<button type="button" class="jb-v ${gradeClass(v)} ${v === cur[s.uid] ? 'on' : ''}" data-v="${v}">${v}</button>`).join('')}<button type="button" class="jb-v jb-x" data-v="" title="Без оцінки">—</button></span></div>`; }).join('')}</div>
        <div class="form-error" id="jbErr"></div>
        <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="jbSave">💾 Зберегти</button></div>`, (box, close) => {
        box.querySelectorAll('.jb-row').forEach(row => row.querySelectorAll('.jb-v').forEach(b => b.onclick = () => {
          const u = row.dataset.u, v = b.dataset.v === '' ? null : +b.dataset.v;
          val[u] = val[u] === v ? null : v;
          row.querySelectorAll('.jb-v').forEach(x => x.classList.toggle('on', val[u] != null && +x.dataset.v === val[u] && x.dataset.v !== ''));
        }));
        box.querySelector('#jbSave').onclick = async ev => {
          const changed = list.filter(s => val[s.uid] !== cur[s.uid]);
          if (!changed.length) { close(); return; }
          ev.target.disabled = true; ev.target.textContent = 'Збереження…';
          try {
            for (const s of changed) {
              for (const r of (byUser[s.uid] || []).filter(r => r.testId === 'mark:' + l.id)) await Store.deleteResult(r.id);
              if (val[s.uid] != null) await Store.saveManualResult({ uid: s.uid, name: s.name, cls: s.cls, course: subj.id, testId: 'mark:' + l.id, kind: 'mark', title: 'Оцінка за урок: ' + pn(l) + '. ' + l.title, score: val[s.uid], full: 0, total: 0, durationSec: 0, leaves: 0 });
            }
            RS = null; close(); toast('✅ Збережено оцінок: ' + changed.length); renderJournal(clsArg, courseArg, tabsHtml, lidArg);
          } catch (e) { ev.target.disabled = false; ev.target.textContent = '💾 Зберегти'; box.querySelector('#jbErr').textContent = e.message || String(e); }
        };
      }, { wide: true });
    };
    const jf = $app.querySelector('#jFocus'); if (jf) { const w = jf.closest('.table-wrap'); if (w) w.scrollLeft = Math.max(0, jf.offsetLeft - 200); }
    const csvBtn = $app.querySelector('#csv');
    if (csvBtn) csvBtn.onclick = () => {
      const exp = cols.flatMap(c => c.kind === 'lesson' ? [{ h: c.label + ' — тест', v: r => { const e = r.bm[c.id]; return e ? (e.best != null ? e.best : 'не зар.') : ''; } },
        { h: c.label + ' — урок', v: r => best(r.bm, MK(c.l)) ?? '' }, { h: c.label + ' — середній', v: r => pAvg(r.bm, c.l) ?? '' }]
        : [{ h: c.label, v: r => { const e = r.bm[c.id]; return e ? (e.best != null ? e.best : 'не зар.') : ''; } }]);
      const header = ['Учень', 'Середній (параграфи)', 'Тестів зараховано', 'Оцінок за уроки', 'Середній (розділи)'].concat(exp.map(c => c.h));
      const lines = [header].concat(rowsData.map(r => [r.s.name, r.lessonAvg ?? '', r.lessonDone, r.marks, r.sectionAvg ?? ''].concat(exp.map(c => c.v(r)))));
      const csv = '﻿' + lines.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `rezultaty_${cls}klas_${subj.id}.csv`; a.click();
    };
    $app.querySelectorAll('[data-st]').forEach(a => a.onclick = () => {
      const s = list.find(x => x.uid === a.dataset.st);
      let rs = (byUser[s.uid] || []).slice().sort((x, y) => (y.atMs || 0) - (x.atMs || 0));
      const drawM = () => `<h2>${esc(s.name)}</h2><p class="muted" style="font-weight:700;margin-bottom:14px">${s.cls} клас · ${esc(subj.name)} · спроб: ${rs.length}<br><span style="font-size:13px">Зарахований тест блокується для учня. Щоб дозволити пройти його ще раз, видаліть зараховану спробу (✕).</span></p>
        <div class="table-wrap" style="border:1px solid var(--line)"><table class="tbl"><thead><tr><th>Дата</th><th>Тест</th><th class="c">Оцінка</th><th class="c">Повністю правильно</th><th class="c">Час</th><th class="c" title="Скільки разів учень виходив з вікна тесту">Виходи</th><th></th></tr></thead><tbody>
        ${rs.length ? rs.map(r => `<tr><td>${fmtDate(r.atMs)}</td><td>${esc(r.title)}</td><td class="c"><span class="cell ${gradeClass(r.score)}">${r.score}</span></td>
          <td class="c">${r.full}/${r.total}</td><td class="c">${fmtDur(r.durationSec || 0)}${r.auto ? ' ⌛' : ''}</td><td class="c">${r.leaves || 0}</td>
          <td><button class="btn danger sm" data-rdel="${esc(r.id)}" title="Видалити спробу">✕</button></td></tr>`).join('') : '<tr><td colspan="7" class="empty">Спроб ще немає</td></tr>'}
        </tbody></table></div><div class="m-actions"><button class="btn brand" data-close>Закрити</button></div>`;
      modal(drawM(), function mount(box, close) {
        box.querySelectorAll('[data-rdel]').forEach(b => b.onclick = async () => {
          await Store.deleteResult(b.dataset.rdel); RS = null;
          rs = rs.filter(r => r.id !== b.dataset.rdel);
          const all = byUser[s.uid]; byUser[s.uid] = all.filter(r => r.id !== b.dataset.rdel);
          box.innerHTML = drawM(); box.querySelectorAll('[data-close]').forEach(x => x.onclick = () => { close(); route(); });
          mount(box, close); toast('Спробу видалено');
        });
      }, { wide: true });
    });
  }

  /* ---------------- заявка вчителя очікує підтвердження ---------------- */
  function renderPending() {
    $app.innerHTML = `<div class="card result-card" style="max-width:620px;margin:30px auto">
      <div class="m-emoji" style="font-size:64px">⏳</div>
      <h2>Заявку надіслано</h2>
      <p style="font-weight:700;color:var(--ink-2);margin-top:8px">${esc(user.name)}, адміністратор має підтвердити ваш обліковий запис і призначити предмети.
        Після цього тут з’являться ваші класи, учні та результати.</p>
      <div class="m-actions" style="display:flex;gap:10px;justify-content:center;margin-top:20px"><button class="btn brand" id="pRe">🔄 Перевірити ще раз</button></div></div>`;
    $app.querySelector('#pRe').onclick = () => location.reload();
  }

  /* ---------------- вибір предметів для вчителя ----------------
     Компактний вибір: вкладки «1–4 / 5–9 / усі класи», два види — «за предметами»
     (рядок предмета з кнопками класів — зручно, коли вчитель веде предмет у кількох класах)
     і «за класами» (рядок класу з предметами та «увесь клас»), пошук і лічильник обраного. */
  function subjectPicker(selectedIds, opt) {
    const sel = new Set(selectedIds || []), on = [];
    CATALOG.forEach((k, ki) => k.subjects.forEach((sj, si) => { if (subjectIds(sj).some(x => sel.has(x))) on.push(ki + ':' + si); }));
    return `<div class="subj-pick2" data-sel="${esc(JSON.stringify(on))}" data-ready="${opt && opt.readyOnly ? 1 : 0}"></div>`;
  }
  function initPickers(root) {
    root.querySelectorAll('.subj-pick2[data-sel]').forEach(el => {
      el._sel = new Set(JSON.parse(el.dataset.sel || '[]'));
      const readyOnly = el.dataset.ready === '1';
      el.removeAttribute('data-sel');
      const items = [];   // { key:'ki:si', k, sj }
      CATALOG.forEach((k, ki) => k.subjects.forEach((sj, si) => { if (!readyOnly || sj.ready) items.push({ key: ki + ':' + si, k, sj }); }));
      const hasPrim = items.some(x => x.k.cls <= 4), hasSec = items.some(x => x.k.cls > 4);
      let band = ss.getItem('spBand') || 'all', view = ss.getItem('spView') || 'subj', q = '';
      const inBand = x => band === 'all' || (band === 'p' ? x.k.cls <= 4 : x.k.cls > 4);
      const match = x => !q || x.sj.name.toLowerCase().includes(q) || String(x.k.cls) === q;
      const count = list => list.filter(x => el._sel.has(x.key)).length;
      const draw = () => {
        const list = items.filter(x => inBand(x) && match(x));
        let body = '';
        if (view === 'subj') {
          /* групування за назвою предмета */
          const groups = new Map();
          list.forEach(x => { const n = x.sj.name.trim(); if (!groups.has(n)) groups.set(n, []); groups.get(n).push(x); });
          body = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'uk')).map(([n, xs]) => {
            const all = xs.every(x => el._sel.has(x.key));
            return `<div class="sp-row"><label class="sp-head"><input type="checkbox" data-all="${esc(xs.map(x => x.key).join(','))}" ${all ? 'checked' : ''}><span>${esc(xs[0].sj.icon)} <b>${esc(n)}</b></span><small>${count(xs)}/${xs.length}</small></label>
              <div class="sp-pills">${xs.sort((a, b) => a.k.cls - b.k.cls).map(x => `<button type="button" class="sp-pill ${el._sel.has(x.key) ? 'on' : ''} ${x.sj.ready ? '' : 'soon'}" data-k="${x.key}" style="--c:${esc(x.k.color)}" title="${x.k.cls} клас · ${esc(n)}${x.sj.ready ? '' : ' (матеріали готуються)'}">${x.k.cls}<small>кл.</small></button>`).join('')}</div></div>`;
          }).join('');
        } else {
          const byCls = new Map();
          list.forEach(x => { if (!byCls.has(x.k.cls)) byCls.set(x.k.cls, []); byCls.get(x.k.cls).push(x); });
          body = [...byCls.entries()].sort((a, b) => a[0] - b[0]).map(([c, xs]) => {
            const all = xs.every(x => el._sel.has(x.key));
            return `<div class="sp-row"><label class="sp-head"><input type="checkbox" data-all="${esc(xs.map(x => x.key).join(','))}" ${all ? 'checked' : ''}><span class="sp-cnum" style="--c:${esc(xs[0].k.color)}">${c}</span><span><b>${c} клас</b></span><small>${count(xs)}/${xs.length}</small></label>
              <div class="sp-pills">${xs.map(x => `<button type="button" class="sp-pill wide ${el._sel.has(x.key) ? 'on' : ''} ${x.sj.ready ? '' : 'soon'}" data-k="${x.key}" style="--c:${esc(x.k.color)}">${esc(x.sj.icon)} ${esc(x.sj.name)}</button>`).join('')}</div></div>`;
          }).join('');
        }
        const chosen = items.filter(x => el._sel.has(x.key));
        el.innerHTML = `<div class="sp-bar">
            ${hasPrim && hasSec ? `<div class="sp-seg">${[['all', 'Усі класи'], ['p', '1–4'], ['s', '5–9']].map(([v, t]) => `<button type="button" data-band="${v}" class="${band === v ? 'on' : ''}">${t}</button>`).join('')}</div>` : ''}
            <div class="sp-seg">${[['subj', 'За предметами'], ['cls', 'За класами']].map(([v, t]) => `<button type="button" data-view="${v}" class="${view === v ? 'on' : ''}">${t}</button>`).join('')}</div>
            <input class="input sp-q" placeholder="🔍 Предмет або клас" value="${esc(q)}"></div>
          <div class="sp-body">${body || '<p class="muted" style="font-weight:700;padding:10px">Нічого не знайдено</p>'}</div>
          <div class="sp-chosen">${chosen.length ? `<b>Обрано ${chosen.length}:</b> ${chosen.slice(0, 12).map(x => `<span class="tag">${x.k.cls} кл. · ${esc(x.sj.name)}</span>`).join(' ')}${chosen.length > 12 ? ` <span class="muted">і ще ${chosen.length - 12}</span>` : ''} <button type="button" class="sp-clear">очистити</button>` : '<span class="muted">Нічого не обрано</span>'}</div>`;
        el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { el._sel.has(b.dataset.k) ? el._sel.delete(b.dataset.k) : el._sel.add(b.dataset.k); draw(); });
        el.querySelectorAll('[data-all]').forEach(c => c.onchange = () => { c.dataset.all.split(',').forEach(k => c.checked ? el._sel.add(k) : el._sel.delete(k)); draw(); });
        el.querySelectorAll('[data-band]').forEach(b => b.onclick = () => { band = b.dataset.band; ss.setItem('spBand', band); draw(); });
        el.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; ss.setItem('spView', view); draw(); });
        const cl = el.querySelector('.sp-clear'); if (cl) cl.onclick = () => { el._sel.clear(); draw(); };
        const qi = el.querySelector('.sp-q');
        qi.oninput = () => { q = qi.value.trim().toLowerCase(); const pos = qi.selectionStart; draw(); const n = el.querySelector('.sp-q'); n.focus(); n.setSelectionRange(pos, pos); };
      };
      draw();
    });
  }
  function readPicker(box) {
    const subjects = new Set(), classes = new Set();
    box.querySelectorAll('.subj-pick2').forEach(el => (el._sel || new Set()).forEach(key => {
      const [ki, si] = key.split(':').map(Number); const k = CATALOG[ki], sj = k && k.subjects[si]; if (!sj) return;
      subjectIds(sj).forEach(x => subjects.add(x)); classes.add(k.cls);
    }));
    return { subjects: [...subjects], classes: [...classes].sort((a, b) => a - b) };
  }
  function teacherSubjectTags(ids) {
    const set = new Set(ids || []), out = [];
    CATALOG.forEach(k => k.subjects.forEach(sj => { if (subjectIds(sj).some(x => set.has(x))) out.push(`<span class="tag">${k.cls} кл. · ${esc(sj.icon)} ${esc(sj.name)}</span>`); }));
    return out.length ? out.join(' ') : '<span class="muted">предметів не призначено</span>';
  }

  /* ---------------- адміністратор: вчителі ---------------- */
  async function renderTeachers() {
    $app.innerHTML = '<div class="loader"><span></span></div>';
    let teachers = await Store.listTeachers();
    /* автовиправлення: якщо до предмета підключили новий курс, додаємо його id вчителям цього предмета */
    let healed = 0;
    for (const t of teachers) { const fix = !t.pending && healSubjects(t.subjects); if (!fix) continue;
      try { await Store.updateTeacher(t.uid, { subjects: fix }); t.subjects = fix; healed++; } catch (e) { /* немає прав */ } }
    if (healed) toast('Оновлено доступ до нових курсів: ' + healed + ' вч.');
    const draw = () => {
      const pending = teachers.filter(t => t.pending), active = teachers.filter(t => !t.pending && !t.disabled), off = teachers.filter(t => !t.pending && t.disabled);
      const by = a => a.slice().sort((x, y) => String(x.name).localeCompare(String(y.name), 'uk'));
      const row = t => `<div class="card teacher-row ${t.disabled ? 'is-off' : ''}">
          <span class="avatar">${esc(initials(t.name))}</span>
          <div class="tr-body"><h3>${esc(t.name)} ${t.disabled ? '<span class="tag">⛔ доступ вимкнено</span>' : ''}</h3><div class="muted tr-mail">${esc(t.email)}</div>
            <div class="tr-subs">${t.pending ? '<b>Просить:</b> ' + teacherSubjectTags(t.requested) : teacherSubjectTags(t.subjects)}</div>
            ${t.pending && t.note ? `<div class="muted" style="font-size:14px;margin-top:6px">💬 ${esc(t.note)}</div>` : ''}</div>
          <div class="tr-actions">${t.pending
            ? `<button class="btn brand sm" data-ok="${t.uid}">✅ Підтвердити</button><button class="btn danger sm" data-rej="${t.uid}">✕ Відхилити</button>`
            : `<button class="btn light sm" data-ed="${t.uid}">✏️ Предмети</button><button class="btn light sm" data-rs="${t.uid}" title="Надіслати лист для скидання пароля">✉️ Пароль</button>
               ${t.disabled ? `<button class="btn light sm" data-on="${t.uid}">✅ Увімкнути</button>` : `<button class="btn danger sm" data-off="${t.uid}">⛔ Вимкнути</button>`}`}</div>
        </div>`;
      $app.innerHTML = `
        <div class="page-head"><div><h1>Вчителі</h1><p>Кожен вчитель бачить і змінює лише свої предмети та учнів своїх класів. Ви — адміністратор з усіма повноваженнями.</p></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn brand" id="addT">＋ Додати вчителя</button></div></div>
        ${pending.length ? `<h2 class="adm-h">📨 Заявки на реєстрацію <span class="tag">${pending.length}</span></h2>${by(pending).map(row).join('')}` : ''}
        <h2 class="adm-h">👩‍🏫 Вчителі <span class="tag">${active.length}</span></h2>
        ${active.length ? by(active).map(row).join('') : `<div class="card empty"><span class="e">👩‍🏫</span>Вчителів ще немає. Натисніть «Додати вчителя»${C.teacherSelfSignup ? ' або попросіть колег подати заявку на сторінці входу' : ''}.</div>`}
        ${off.length ? `<h2 class="adm-h">⛔ Вимкнені <span class="tag">${off.length}</span></h2>${by(off).map(row).join('')}` : ''}
        <div class="card pad" style="margin-top:18px;font-weight:700;color:var(--ink-2);font-size:14px">
          💡 Вчитель може: переглядати презентації, тести й ігри своїх предметів, бачити результати своїх предметів і видаляти спроби (щоб дозволити перескладання),
          додавати учнів у свої класи та виправляти їхні імена. Лише адміністратор може видаляти учнів, переводити їх у наступний клас, змінювати список предметів і керувати вчителями.
        </div>`;
      const find = uid => teachers.find(t => t.uid === uid);
      $app.querySelector('#addT').onclick = addDialog;
      $app.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => editDialog(find(b.dataset.ed)));
      $app.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => editDialog(find(b.dataset.ok), true));
      $app.querySelectorAll('[data-rej]').forEach(b => b.onclick = () => {
        const t = find(b.dataset.rej);
        modal(`<div class="m-emoji">✕</div><h2>Відхилити заявку?</h2><p><b>${esc(t.name)}</b> (${esc(t.email)}) не отримає доступу до сайту.</p>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn danger" data-close id="rjGo">Відхилити</button></div>`,
          box => box.querySelector('#rjGo').onclick = async () => { await Store.deleteTeacher(t.uid); teachers = teachers.filter(x => x.uid !== t.uid); draw(); toast('Заявку відхилено'); });
      });
      $app.querySelectorAll('[data-off]').forEach(b => b.onclick = () => {
        const t = find(b.dataset.off);
        modal(`<div class="m-emoji">⛔</div><h2>Вимкнути доступ?</h2><p><b>${esc(t.name)}</b> більше не зможе увійти. Результати учнів не зміняться. Доступ можна буде увімкнути знову.</p>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn danger" data-close id="offGo">Вимкнути</button></div>`,
          box => box.querySelector('#offGo').onclick = async () => { await Store.updateTeacher(t.uid, { disabled: true }); t.disabled = true; draw(); toast('Доступ вимкнено'); });
      });
      $app.querySelectorAll('[data-on]').forEach(b => b.onclick = async () => { const t = find(b.dataset.on); await Store.updateTeacher(t.uid, { disabled: false }); t.disabled = false; draw(); toast('Доступ увімкнено'); });
      $app.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => {
        const t = find(b.dataset.rs);
        modal(`<div class="m-emoji">✉️</div><h2>Скинути пароль?</h2><p>На пошту <b>${esc(t.email)}</b> буде надіслано лист із посиланням для встановлення нового пароля.</p>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" data-close id="rsGo">Надіслати лист</button></div>`,
          box => box.querySelector('#rsGo').onclick = async () => { try { await Store.sendReset(t.email); toast('Лист надіслано'); } catch (e) { toast('Помилка: ' + e.message); } });
      });
    };
    function addDialog() {
      modal(`<h2>Додати вчителя</h2>
        <div class="field"><label>Прізвище, ім’я та по батькові</label><input class="input" id="tName" placeholder="Коваленко Ольга Петрівна"></div>
        <div class="field"><label>Пошта (логін для входу)</label><input class="input" id="tMail" type="email" autocapitalize="off" spellcheck="false" placeholder="olha@example.com"></div>
        <div class="field"><label>Початковий пароль (вчитель зможе змінити його кнопкою 🔑)</label><input class="input pw" id="tPw" value="${esc(StoreUtils.makeTeacherPassword())}"></div>
        <div class="field"><label>Предмети вчителя</label>${subjectPicker([])}</div>
        <div class="form-error" id="tErr"></div>
        <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="tGo">Створити обліковий запис</button></div>`,
        (box, close) => box.querySelector('#tGo').onclick = async () => {
          const name = box.querySelector('#tName').value.trim(), email = box.querySelector('#tMail').value.trim(), password = box.querySelector('#tPw').value.trim();
          const err = box.querySelector('#tErr');
          if (!name) { err.textContent = 'Введіть ім’я вчителя'; return; }
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Введіть правильну адресу пошти'; return; }
          if (password.length < 8) { err.textContent = 'Пароль має містити щонайменше 8 символів'; return; }
          const pick = readPicker(box);
          const b = box.querySelector('#tGo'); b.disabled = true; b.textContent = 'Створюємо…';
          try {
            const t = await Store.createTeacher(Object.assign({ name, email, password }, pick));
            teachers.push(t); close(); draw(); credsDialog(t, password);
          } catch (e) { err.textContent = e.message; b.disabled = false; b.textContent = 'Створити обліковий запис'; }
        }, { wide: true });
    }
    function credsDialog(t, password) {
      const txt = `Портал «${C.siteTitle}»: ${location.origin + location.pathname}\nЛогін (пошта): ${t.email}\nПароль: ${password}\nПісля входу змініть пароль кнопкою «🔑 Пароль».`;
      modal(`<div class="m-emoji">✅</div><h2>Вчителя додано</h2>
        <div class="lc" style="text-align:left;margin:12px 0"><b>${esc(t.name)}</b><br>Сайт: <code>${esc(location.origin + location.pathname)}</code><br>Логін: <code>${esc(t.email)}</code><br>Пароль: <code>${esc(password)}</code></div>
        <p class="muted" style="font-size:14px;font-weight:700">Пароль показано лише зараз — скопіюйте його й передайте вчителю.</p>
        <div class="m-actions"><button class="btn light" id="cpT">📋 Копіювати</button><button class="btn brand" data-close>Готово</button></div>`,
        box => box.querySelector('#cpT').onclick = () => navigator.clipboard.writeText(txt).then(() => toast('Скопійовано')));
    }
    function editDialog(t, approve) {
      modal(`<h2>${approve ? 'Підтвердити заявку' : 'Предмети вчителя'}</h2>
        <div class="field"><label>Ім’я</label><input class="input" id="eTName" value="${esc(t.name)}"></div>
        <p class="muted" style="font-weight:700;margin:-4px 0 10px">${esc(t.email)}</p>
        ${SCHED ? `<div class="field"><label>Ім’я в «Шкільному розкладі» (для уроків на сьогодні)</label><select class="input" id="eTSched"><option value="">— не вказано</option>
          ${(SCHED.teachers || []).map(n => `<option ${(t.schedName || (SCHED.teachers.find(x => normT(x) === normT(t.name)) || '')) === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>` : ''}
        <div class="field"><label>Предмети${approve ? ' (позначено ті, які просить вчитель)' : ''}</label>${subjectPicker(approve ? t.requested : t.subjects)}</div>
        <div class="form-error" id="eTErr"></div>
        <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="eTGo">${approve ? '✅ Підтвердити' : 'Зберегти'}</button></div>`,
        (box, close) => box.querySelector('#eTGo').onclick = async () => {
          const pick = readPicker(box);
          const data = Object.assign({ name: box.querySelector('#eTName').value.trim() || t.name }, pick);
          if (box.querySelector('#eTSched')) data.schedName = box.querySelector('#eTSched').value;
          if (approve) data.pending = false, data.disabled = false;
          const b = box.querySelector('#eTGo'); b.disabled = true;
          try { await Store.updateTeacher(t.uid, data); Object.assign(t, data); close(); draw(); toast(approve ? 'Вчителя підтверджено' : 'Збережено'); }
          catch (e) { box.querySelector('#eTErr').textContent = e.message; b.disabled = false; }
        }, { wide: true });
    }
    draw();
  }

  /* ---------------- вчитель: предмети за класами ---------------- */
  function renderSubjectsAdmin() {
    let draft = exportCatalog();
    let dirty = false;
    const openCls = new Set();
    const COLORS = ['#FF7A59', '#FFB020', '#2BB673', '#14B8C4', '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#F43F5E', '#0EA5E9', '#84CC16'];
    /* у списку матеріалів — лише курси цього класу; якщо назва предмета збігається з предметом курсу — лише вони */
    const courseCls = c => { const m = String(c.title || '').match(/(\d+)\s*клас/) || String(c.id).match(/(\d+)$/); return m ? +m[1] : null; };
    const normN = x => String(x || '').toLowerCase().replace(/[’'`ʼ]/g, '').replace(/\s+/g, ' ').trim();
    const courseOpts = (sel, cls, name) => {
      const ofCls = AVAILABLE.filter(c => courseCls(c) === +cls);
      const same = ofCls.filter(c => normN(c.subject) === normN(name));
      const list = (same.length ? same : ofCls).slice();
      const cur = AVAILABLE.find(c => c.id === sel); if (cur && !list.includes(cur)) list.unshift(cur);
      return `<option value="">— матеріали готуються —</option>` + (list.length ? list.map(c => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(c.title)}</option>`).join('')
        : `<option value="" disabled>для ${esc(cls)} класу матеріалів ще немає</option>`);
    };
    const mark = () => { dirty = true; const b = $app.querySelector('#saveCat'); if (b) { b.disabled = false; b.textContent = '💾 Зберегти зміни'; } };
    function draw() {
      $app.innerHTML = `
        <div class="page-head"><div><h1>Предмети за класами</h1>
          <p>Додавайте й прибирайте класи та предмети, змінюйте назви, значки й порядок, приховуйте окремі предмети (від учнів) або цілі класи (від учнів і вчителів).</p></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn light" id="addCls">＋ Додати клас</button>
            <button class="btn light" id="resetCat">↺ Стандартний список</button>
            <button class="btn brand" id="saveCat" ${dirty ? '' : 'disabled'}>${dirty ? '💾 Зберегти зміни' : '✔ Збережено'}</button>
          </div></div>
        <div class="card pad" style="margin-bottom:18px;font-weight:700;color:var(--ink-2);font-size:14px">
          💡 «Матеріали» — це готові тести й презентації за підручником. Предмет без матеріалів учні бачать з позначкою «Матеріали готуються».
          Нові матеріали за PDF підручника готує Claude — після цього вони з’являться в списку.
          Якщо видалити предмет, результати учнів у базі не зникають: поверніть предмет із тими самими матеріалами — і оцінки знову буде видно.
        </div>
        <div class="adm-tools"><button class="btn light sm" id="admOpenAll">Розгорнути всі</button><button class="btn light sm" id="admCloseAll">Згорнути всі</button><button class="btn light sm" id="admSortAll" title="Упорядкувати предмети в кожному класі за алфавітом">🔤 Усі класи за алфавітом</button></div>
        <div class="adm-grid">${draft.map((k, ki) => `
          <details class="card adm-class ${k.hidden ? 'is-hidden' : ''}" data-ki="${ki}" ${openCls.has(k.cls) ? 'open' : ''}>
            <summary class="adm-head">
              <span class="adm-num">${k.cls}</span>
              <span class="adm-title"><b>${k.cls} клас</b><small>${k.subjects.length ? k.subjects.map(sj => esc(sj.icon) + ' ' + esc(sj.name)).join(' · ') : 'предметів немає'}</small></span>
              ${k.hidden ? '<span class="tag">🙈 клас приховано</span>' : ''}<span class="tag">${k.subjects.length}</span>
            </summary>
            <label class="adm-check adm-clshide" title="Клас не бачитимуть ні учні, ні вчителі (лише адміністратор)"><input type="checkbox" ${k.hidden ? 'checked' : ''} data-k="${ki}" data-f="hidden"> 🙈 Приховати весь ${k.cls} клас від учнів і вчителів</label>
            <div class="adm-list">
              ${k.subjects.length ? k.subjects.map((sj, si) => `
                <div class="adm-row ${sj.hidden ? 'is-hidden' : ''}">
                  <input class="input adm-icon" value="${esc(sj.icon)}" maxlength="4" data-k="${ki}" data-s="${si}" data-f="icon" title="Значок (емодзі)">
                  <input class="input adm-name" value="${esc(sj.name)}" placeholder="Назва предмета" data-k="${ki}" data-s="${si}" data-f="name">
                  <span class="adm-btns">
                    <button class="icon-btn" data-mv="${ki}:${si}:-1" title="Вище" ${si === 0 ? 'disabled' : ''}>↑</button>
                    <button class="icon-btn" data-mv="${ki}:${si}:1" title="Нижче" ${si === k.subjects.length - 1 ? 'disabled' : ''}>↓</button>
                    <button class="icon-btn adm-del" data-delsub="${ki}:${si}" title="Видалити предмет">🗑</button>
                  </span>
                  <select class="input adm-course" data-k="${ki}" data-s="${si}" data-f="course" title="Матеріали">${courseOpts(sj.course, k.cls, sj.name)}</select>
                  <label class="adm-check" title="Учні не бачитимуть предмет"><input type="checkbox" ${sj.hidden ? 'checked' : ''} data-k="${ki}" data-s="${si}" data-f="hidden"> Приховати</label>
                </div>`).join('') : '<p class="muted" style="font-weight:700">Предметів ще немає</p>'}
            </div>
            <div class="adm-foot"><button class="btn light sm" data-addsub="${ki}">＋ Додати предмет</button><button class="btn light sm" data-sortcls="${ki}" ${k.subjects.length > 1 ? '' : 'disabled'} title="Упорядкувати предмети класу за алфавітом">🔤 За алфавітом</button><button class="btn danger sm" data-delcls="${ki}">🗑 Видалити клас</button></div>
          </details>`).join('')}</div>`;
      $app.querySelectorAll('details.adm-class').forEach(d => d.addEventListener('toggle', () => { const c = draft[+d.dataset.ki].cls; d.open ? openCls.add(c) : openCls.delete(c); }));
      $app.querySelector('#admOpenAll').onclick = () => { draft.forEach(k => openCls.add(k.cls)); $app.querySelectorAll('details.adm-class').forEach(d => (d.open = true)); };
      $app.querySelector('#admCloseAll').onclick = () => { openCls.clear(); $app.querySelectorAll('details.adm-class').forEach(d => (d.open = false)); };
    }
    draw();
    $app.addEventListener('input', onInput);
    $app.addEventListener('change', onInput);
    function onInput(e) {
      const t = e.target; if (!t.dataset || t.dataset.f === undefined || !$app.querySelector('#saveCat')) return;
      const k = draft[+t.dataset.k]; if (!k) return;
      const f = t.dataset.f;
      if (t.dataset.s === undefined && f === 'hidden') { k.hidden = t.checked; t.closest('.adm-class').classList.toggle('is-hidden', t.checked); }
      else if (t.dataset.s === undefined) { k[f] = t.value; t.closest('.adm-class').style.setProperty('--c', t.value); }
      else {
        const sj = k.subjects[+t.dataset.s];
        sj[f] = t.type === 'checkbox' ? t.checked : t.value;
        if (f === 'course') sj.unlinked = !t.value;
        if (f === 'course' && t.value && (!sj.name || sj.name === 'Новий предмет')) { const c = AVAILABLE.find(x => x.id === t.value); if (c && c.subject) { sj.name = c.subject; draw(); } }
        if (f === 'hidden') t.closest('.adm-row').classList.toggle('is-hidden', t.checked);
        if (f === 'name') { const cs = t.closest('.adm-row').querySelector('.adm-course'); if (cs) cs.innerHTML = courseOpts(sj.course, k.cls, sj.name); }
      }
      mark();
    }
    $app.onclick = async e => {
      const b = e.target.closest('button'); if (!b || !$app.querySelector('#saveCat')) return;
      if (b.id === 'addCls') {
        modal(`<h2>Новий клас</h2><div class="field"><label>Номер класу (1–11)</label><input class="input" id="nCls" type="number" min="1" max="11"></div>
          <div class="form-error" id="nErr"></div><div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="nGo">Додати</button></div>`,
          (box, close) => box.querySelector('#nGo').onclick = () => {
            const n = +box.querySelector('#nCls').value;
            if (!(n >= 1 && n <= 11)) { box.querySelector('#nErr').textContent = 'Введіть число від 1 до 11'; return; }
            if (draft.some(k => k.cls === n)) { box.querySelector('#nErr').textContent = 'Такий клас уже є'; return; }
            draft.push({ cls: n, color: COLORS[n % COLORS.length], subjects: [] }); draft.sort((a, b) => a.cls - b.cls);
            close(); mark(); draw(); mark();
          });
        return;
      }
      if (b.id === 'resetCat') {
        modal(`<div class="m-emoji">↺</div><h2>Повернути стандартний список?</h2><p>Усі ваші зміни в предметах буде замінено початковим списком (після збереження). Результати учнів не зміняться.</p>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" data-close id="rGo">Повернути</button></div>`,
          box => box.querySelector('#rGo').onclick = () => { applyCatalog(BASE_CATALOG); draft = exportCatalog(); draw(); mark(); });
        return;
      }
      if (b.id === 'saveCat') {
        b.disabled = true; b.textContent = 'Зберігаємо…';
        try {
          const clean = draft.map(k => ({ cls: k.cls, color: k.color, hidden: !!k.hidden, subjects: k.subjects.map(sj => Object.assign({}, sj, { name: (sj.name || '').trim() || 'Без назви', icon: (sj.icon || '').trim() || '📘' })) }));
          await Store.saveCatalog(clean); applyCatalog(clean); draft = exportCatalog(); dirty = false; draw(); toast('Предмети збережено');
        } catch (er) { b.disabled = false; b.textContent = '💾 Зберегти зміни'; toast('Помилка: ' + er.message); }
        return;
      }
      if (b.id === 'admSortAll' || b.dataset.sortcls !== undefined) {
        const byName = (x, y) => String(x.name || '').localeCompare(String(y.name || ''), 'uk', { sensitivity: 'base' });
        (b.id === 'admSortAll' ? draft : [draft[+b.dataset.sortcls]]).forEach(k => { if (b.id !== 'admSortAll') openCls.add(k.cls); k.subjects.sort(byName); });
        mark(); draw(); toast(b.id === 'admSortAll' ? 'Предмети всіх класів упорядковано за алфавітом' : 'Предмети класу упорядковано за алфавітом'); return;
      }
      if (b.dataset.addsub !== undefined) {
        const k = draft[+b.dataset.addsub];
        openCls.add(k.cls);
        k.subjects.push({ key: 's' + Date.now().toString(36), name: 'Новий предмет', icon: '📘', course: '', hidden: false, archive: [] });
        mark(); draw(); mark();
        const inputs = $app.querySelectorAll(`[data-k="${b.dataset.addsub}"][data-f="name"]`); const last = inputs[inputs.length - 1]; if (last) { last.focus(); last.select(); }
        return;
      }
      if (b.dataset.mv) {
        const [ki, si, d] = b.dataset.mv.split(':').map(Number); const arr = draft[ki].subjects;
        [arr[si], arr[si + d]] = [arr[si + d], arr[si]]; mark(); draw(); mark(); return;
      }
      if (b.dataset.delsub) {
        const [ki, si] = b.dataset.delsub.split(':').map(Number); const sj = draft[ki].subjects[si];
        modal(`<div class="m-emoji">🗑</div><h2>Видалити предмет?</h2><p><b>${esc(sj.icon)} ${esc(sj.name)}</b> зникне з ${draft[ki].cls} класу після збереження.${sj.course ? ' Результати учнів у базі залишаться.' : ''}</p>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn danger" data-close id="dGo">Видалити</button></div>`,
          box => box.querySelector('#dGo').onclick = () => { draft[ki].subjects.splice(si, 1); mark(); draw(); mark(); });
        return;
      }
      if (b.dataset.delcls !== undefined) {
        const ki = +b.dataset.delcls; const k = draft[ki];
        modal(`<div class="m-emoji">🗑</div><h2>Видалити ${k.cls} клас?</h2><p>Клас і всі його предмети (${k.subjects.length}) зникнуть зі списку після збереження. Облікові записи учнів і їхні результати залишаться.</p>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn danger" data-close id="dcGo">Видалити</button></div>`,
          box => box.querySelector('#dcGo').onclick = () => { draft.splice(ki, 1); mark(); draw(); mark(); });
      }
    };
    view = { active: false, destroy() { $app.removeEventListener('input', onInput); $app.removeEventListener('change', onInput); $app.onclick = null; } };
  }

  /* =====================================================================
     ЗВ’ЯЗОК ЗІ «ШКІЛЬНИМ РОЗКЛАДОМ» (lesson_plan.html)
     Адміністратор завантажує файл «копії всіх даних» розкладу. На порталі зберігаються лише
     дати й номери уроків кожного предмета в кожному класі та ПІБ вчителів (ПІБ учнів — ні).
     Урок порталу k прив’язується до години розкладу пропорційно: якщо годин більше, ніж уроків
     у підручнику, частина уроків займає по дві години.
     ===================================================================== */
  let SCHED = null;
  const _planCache = {};
  const BREAKS = [10, 10, 20, 10, 10, 5, 0];
  const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayIso = () => isoDay(new Date());
  const fmtDay = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}.${m}`; };
  const DOW = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'п’ятниця', 'субота'];
  const dowOf = iso => DOW[new Date(iso + 'T12:00').getDay()];
  /* «Шевченко Т.Г.» і «Шевченко Тетяна Григорівна» → «шевченко тг» */
  const normT = n => { const w = String(n || '').replace(/\./g, '. ').trim().split(/\s+/).filter(Boolean); return w.length ? (w[0] + ' ' + w.slice(1, 3).map(x => x[0]).join('')).toLowerCase().replace(/[’']/g, '') : ''; };
  const normS = n => String(n || '').toLowerCase().replace(/[^а-яіїєґa-z0-9]/g, '');
  /* автоматично знайти предмет порталу для предмета розкладу в класі g */
  function autoSubject(name, g) {
    const k = classInfo(g); if (!k) return '';
    const a = normS(name), first = String(name).toLowerCase().split(/[\s,(]/)[0];
    const hit = k.subjects.find(s => normS(s.name) === a) || k.subjects.find(s => { const b = normS(s.name); return b.length >= 5 && a.length >= 5 && (a.startsWith(b) || b.startsWith(a)); })
      || k.subjects.find(s => first.length >= 5 && String(s.name).toLowerCase().split(/[\s,(]/)[0] === first);
    return hit ? hit.id : '';
  }
  function schedBells() { return (SCHED && SCHED.bells) || []; }
  const bellOf = slot => { const b = schedBells()[slot - 1]; return b ? b.split('-') : ['', '']; };
  /* години предмета порталу в розкладі: ['YYYY-MM-DD.slot', …] за зростанням */
  function schedHours(id) {
    if (!SCHED) return [];
    const meta = catalogSubject(id); if (!meta) return [];
    const set = new Set();
    (SCHED.entries || []).forEach(e => { if (+e.g === meta.cls && (SCHED.map || {})[e.s + '|' + e.g] === id) e.d.forEach(x => set.add(x)); });
    return [...set].sort();
  }
  /* план уроків порталу за датами */
  function lessonPlan(id) {
    if (!SCHED) return null;
    const key = id + '|' + (SCHED.importedAt || '');
    if (_planCache[key]) return _planCache[key];
    const hours = schedHours(id), L = ((window.LESSON_INDEX || {})[id] || { l: [] }).l;
    if (!hours.length || !L.length) return (_planCache[key] = null);
    const H = hours.length, N = L.length;
    const lessons = L.map(([lid, n, title, sec], i) => { const h = hours[Math.min(H - 1, Math.floor(i * H / N))].split('.'); return { id: lid, n, title, sec, date: h[0], slot: +h[1] }; });
    const lessonOfHour = k => L[Math.min(N - 1, Math.floor(k * N / H))];
    return (_planCache[key] = { id, hours, lessons, byId: Object.fromEntries(lessons.map(l => [l.id, l])), lessonOfHour });
  }
  /* урок уже відбувся: дата раніше за сьогодні або сьогодні, але дзвінок з уроку вже пролунав */
  function lessonPast(date, slot) {
    const t = todayIso();
    if (date < t) return true;
    if (date > t) return false;
    const end = bellOf(slot)[1]; if (!end) return false;
    const [h, m] = end.split(':').map(Number), now = new Date();
    return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
  }
  const pastLessons = id => { const p = lessonPlan(id); return p ? p.lessons.filter(l => lessonPast(l.date, l.slot)) : []; };
  /* ім’я поточного вчителя в розкладі */
  function mySchedName() {
    if (!SCHED) return '';
    if (isTeacher()) { if (user.schedName) return user.schedName; const n = normT(user.name); return (SCHED.teachers || []).find(t => normT(t) === n) || ''; }
    if (isAdmin()) return SCHED.adminTeacher || '';
    return '';
  }
  /* уроки вчителя на дату */
  function teacherDay(name, iso) {
    if (!SCHED || !name) return [];
    const out = [];
    (SCHED.entries || []).forEach(e => {
      if (!(e.t || []).includes(name)) return;
      e.d.forEach((x, k) => { const [d, slot] = x.split('.'); if (d !== iso) return;
        const id = (SCHED.map || {})[e.s + '|' + e.g] || '';
        let lesson = null;
        if (id && canCourse(id)) { const p = lessonPlan(id); if (p) { const idx = p.hours.indexOf(x); const L = p.lessonOfHour(idx); lesson = { id: L[0], n: L[1], title: L[2] }; } }
        out.push({ slot: +slot, g: +e.g, subject: e.s, id: id && canCourse(id) ? id : '', lesson });
      });
    });
    return out.sort((a, b) => a.slot - b.slot);
  }
  function nextTeacherDay(name) {
    const days = new Set();
    (SCHED.entries || []).forEach(e => { if ((e.t || []).includes(name)) e.d.forEach(x => days.add(x.split('.')[0])); });
    return [...days].sort().find(d => d > todayIso()) || '';
  }
  /* картка «Мої уроки» на головній вчителя */
  function myLessonsCard() {
    const name = mySchedName();
    if (!SCHED) return isAdmin() ? `<div class="card pad sched-hint">🗓 Підключіть «Шкільний розклад» (вкладка <a href="#/teacher/schedule">Розклад</a>) — тут з’являться ваші уроки на сьогодні, а учні бачитимуть нагадування про тести за уроки, що вже минули.</div>` : '';
    if (!name) return isAdmin() ? `<div class="card pad sched-hint">🗓 Розклад підключено. Щоб бачити тут свої уроки, оберіть своє ім’я на сторінці <a href="#/teacher/schedule">Розклад</a>.</div>`
      : `<div class="card pad sched-hint">🗓 Ваше ім’я не знайдено в розкладі. Попросіть адміністратора вказати його у вашому профілі.</div>`;
    const t = todayIso();
    let day = t, list = teacherDay(name, t), label = 'Сьогодні';
    if (!list.length) { day = nextTeacherDay(name); list = day ? teacherDay(name, day) : []; label = day ? 'Наступний робочий день' : ''; }
    if (!list.length) return `<div class="card pad sched-hint">🗓 У розкладі на найближчі дні немає ваших уроків.</div>`;
    const row = x => { const [b1, b2] = bellOf(x.slot), past = day === t && lessonPast(day, x.slot);
      return `<div class="ml-row ${past ? 'past' : ''}"><span class="ml-slot"><b>${x.slot}</b><small>${b1}${b2 ? '–' + b2 : ''}</small></span>
        <span class="ml-body"><b>${x.g} клас · ${esc(x.subject)}</b>${x.lesson ? `<small>Урок ${x.lesson.n}. ${esc(x.lesson.title)}</small>` : x.id ? '' : '<small class="muted">немає матеріалів на порталі</small>'}</span>
        ${x.lesson ? `<span class="ml-acts"><a class="btn light sm" href="#/slides/${x.id}/${x.lesson.id}">🎞</a>${window.Games && Games.has(x.id, x.lesson.id) ? `<a class="btn light sm" href="#/games/${x.id}/${x.lesson.id}">🎮</a>` : ''}<a class="btn light sm" href="#/test/${x.id}/lesson/${x.lesson.id}">📝</a></span>` : ''}</div>`; };
    return `<div class="card pad my-lessons"><div class="ml-head"><h2>🗓 ${label}: ${dowOf(day)}, ${fmtDay(day)}</h2><span class="muted">${esc(name)} · ${list.length} ${plural(list.length, 'урок', 'уроки', 'уроків')}</span></div>${list.map(row).join('')}
      <p class="muted" style="font-size:13px;font-weight:700;margin-top:8px">Урок порталу підібрано за порядком уроків у розкладі. 🎞 презентація · 🎮 ігри · 📝 тест</p></div>`;
  }

  /* ---- розбір файлу копії розкладу ---- */
  function parseTimetableBackup(obj) {
    if (!obj || obj.format !== 'LESSON_PLAN_BACKUP_V1' || !obj.data) throw new Error('Це не файл копії «Шкільного розкладу». У розкладі натисніть «Зберегти копію всіх даних».');
    const J = (k, def) => { try { return obj.data[k] ? JSON.parse(obj.data[k]) : def; } catch (e) { return def; } };
    const set = J('schoolScheduleSettings', null), st = J('schoolScheduleStateV5', null);
    if (!set || !set.s1_start || !st || !st.state) throw new Error('У файлі немає складеного розкладу. Спершу згенеруйте розклад, потім збережіть копію.');
    const weekDates = (start, w) => { const [y, m, d] = start.split('-').map(Number); const s = new Date(y, m - 1, d); while (s.getDay() !== 1) s.setDate(s.getDate() - 1); s.setDate(s.getDate() + w * 7); return [0, 1, 2, 3, 4].map(i => { const x = new Date(s); x.setDate(x.getDate() + i); return isoDay(x); }); };
    const E = {}, teachers = new Set();
    const add = (c, iso, slot) => {
      if (!c || !c.subject) return;
      const g = parseInt(c.grade, 10); if (!g) return;
      const k = c.subject + '|' + g, e = E[k] || (E[k] = { s: c.subject, g, t: new Set(), d: new Set() });
      if (c.teacher) { e.t.add(c.teacher); teachers.add(c.teacher); }
      e.d.add(iso + '.' + slot);
    };
    Object.keys(st.state).forEach(grid => {
      const m = grid.match(/^C(\d+)_(\d)$/); if (!m) return;
      const start = m[2] === '1' ? set.s1_start : set.s2_start; if (!start) return;
      (st.state[grid] || []).forEach((wk, w) => { const dates = weekDates(start, w);
        (wk || []).forEach((row, s) => (row || []).forEach((c, d) => { if (!c || c.isHoliday) return; add(c, dates[d], s + 1); if (c.co) add(Object.assign({ grade: c.grade }, c.co), dates[d], s + 1); })); });
    });
    const entries = Object.values(E).map(e => ({ s: e.s, g: e.g, t: [...e.t].sort(), d: [...e.d].sort() })).filter(e => e.d.length)
      .sort((a, b) => a.g - b.g || a.s.localeCompare(b.s, 'uk'));
    if (!entries.length) throw new Error('У розкладі ще немає уроків.');
    const bells = []; { const [h, mi] = String(set.firstLessonStart || '09:00').split(':').map(Number), dur = parseInt(set.lessonDuration, 10) || 40; const cur = new Date(2000, 0, 1, h, mi);
      const f = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      for (let i = 0; i < 7; i++) { const a = f(cur); cur.setMinutes(cur.getMinutes() + dur); bells.push(a + '-' + f(cur)); cur.setMinutes(cur.getMinutes() + BREAKS[i]); } }
    const students = (J('schoolStudentsV1', []) || []).filter(s => s && s.name).map(s => ({ name: String(s.name).trim(), cls: parseInt(s.grade, 10) })).filter(s => s.cls);
    const y = +set.s1_start.slice(0, 4);
    return { entries, bells, teachers: [...teachers].sort((a, b) => a.localeCompare(b, 'uk')), students, year: `${y}/${y + 1}`, created: obj.created || '', s1: set.s1_start, s2end: set.s2_end || '' };
  }

  /* ---- адміністратор: сторінка «Розклад» ---- */
  async function renderScheduleAdmin() {
    let draft = null;   // щойно завантажений файл (ще не збережений)
    const sf = JSON.parse(ss.getItem('schedF') || '{}'); /* фільтри: клас, предмет, вчитель */
    const sfOk = e => (!sf.g || String(e.g) === String(sf.g)) && (!sf.s || e.s === sf.s) && (!sf.t || (e.t || []).includes(sf.t));
    const sfBar = S => { const gs = [...new Set(S.entries.map(e => +e.g))].sort((a, b) => a - b);
      const subs = [...new Set(S.entries.filter(e => !sf.g || String(e.g) === String(sf.g)).map(e => e.s))].sort((a, b) => a.localeCompare(b, 'uk'));
      const ts = [...new Set(S.entries.filter(e => (!sf.g || String(e.g) === String(sf.g)) && (!sf.s || e.s === sf.s)).flatMap(e => e.t || []))].sort((a, b) => a.localeCompare(b, 'uk'));
      return `<div class="toolbar rs-filters sched-f"><b class="muted">🔎 Фільтр:</b>
        <select class="input" data-sf="g"><option value="">Усі класи</option>${gs.map(g => `<option value="${g}" ${String(sf.g) === String(g) ? 'selected' : ''}>${g} клас</option>`).join('')}</select>
        <select class="input" data-sf="s"><option value="">Усі предмети</option>${subs.map(x => `<option ${sf.s === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
        <select class="input" data-sf="t"><option value="">Усі вчителі</option>${ts.map(x => `<option ${sf.t === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
        ${sf.g || sf.s || sf.t ? '<button class="btn light sm" data-sfx>✕ Скинути</button>' : ''}</div>`; };
    const draw = () => {
      const S = draft || SCHED;
      const map = Object.assign({}, (SCHED && SCHED.map) || {});
      if (draft && draft._map) Object.assign(map, draft._map);
      if (draft) draft.entries.forEach(e => { const k = e.s + '|' + e.g; if (!(k in map)) map[k] = autoSubject(e.s, e.g); });
      $app.innerHTML = `<div class="page-head"><div><h1>🗓 Шкільний розклад</h1><p>Зв’язок із конструктором розкладу: уроки на сьогодні для вчителів, дати уроків і нагадування учням про тести</p></div></div>
        <div class="card pad sched-steps">
          <ol><li>Відкрийте «Шкільний розклад» і натисніть <b>«Зберегти копію всіх даних»</b> — збережеться файл <code>rozklad_kopiya_….json</code>.</li>
            <li>Натисніть <b>«Завантажити файл розкладу»</b> нижче й оберіть цей файл.</li>
            <li>Перевірте, які предмети розкладу відповідають предметам порталу, і натисніть <b>«Зберегти розклад на порталі»</b>.</li></ol>
          <p class="muted" style="font-weight:700;font-size:14px">На портал потрапляють лише дати, номери уроків, предмети й ПІБ вчителів. Імена учнів не зберігаються — їх можна лише використати для створення облікових записів. Якщо розклад зміниться, просто завантажте новий файл.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px"><label class="btn brand">📂 Завантажити файл розкладу<input type="file" id="tFile" accept=".json,application/json" hidden></label>
            ${SCHED && !draft ? `<button class="btn danger" id="tDel">Від’єднати розклад</button>` : ''}</div>
          <div class="form-error" id="tErr"></div></div>
        ${S ? `
        <div class="stat-tiles">
          <div class="card stat-tile"><div class="v">${esc(S.year || '—')}</div><div class="k">Навчальний рік</div></div>
          <div class="card stat-tile"><div class="v">${new Set(S.entries.map(e => e.g)).size}</div><div class="k">Класів</div></div>
          <div class="card stat-tile"><div class="v">${S.entries.length}</div><div class="k">Предметів у класах</div></div>
          <div class="card stat-tile"><div class="v">${(S.teachers || []).length}</div><div class="k">Вчителів</div></div>
        </div>
        ${draft ? '<div class="flag-box">📄 Файл прочитано, але ще не збережено. Перевірте відповідність предметів і натисніть «Зберегти розклад на порталі».</div>' : `<p class="muted rs-sum">Збережено: ${SCHED.importedAt ? fmtDate(SCHED.importedAt) : '—'}</p>`}
        ${sfBar(S)}
        <div class="card pad"><h3 class="rs-h">📚 Відповідність предметів${sf.g || sf.s || sf.t ? ` <small class="muted">· показано ${S.entries.filter(sfOk).length} з ${S.entries.length}</small>` : ''}</h3>
          <div class="table-wrap" style="max-height:60vh"><table class="tbl tbl-compact"><thead><tr><th>Клас</th><th>Предмет у розкладі</th><th>Вчитель</th><th class="c">Годин за рік</th><th>Предмет на порталі</th><th class="c">Уроків у підручнику</th></tr></thead><tbody>
          ${S.entries.map(e => { const k = e.s + '|' + e.g, kl = classInfo(e.g); const lc = map[k] ? ((window.LESSON_INDEX || {})[map[k]] || { l: [] }).l.length : 0;
            return `<tr ${sfOk(e) ? '' : 'hidden'}><td class="c">${e.g}</td><td style="font-weight:800">${esc(e.s)}</td><td><small>${(e.t || []).map(esc).join(', ')}</small></td><td class="c">${e.d.length}</td>
            <td><select class="input sm" data-map="${esc(k)}" ${draft ? '' : 'disabled'}><option value="">— не пов’язувати</option>${(kl ? kl.subjects : []).map(s => `<option value="${esc(s.id)}" ${map[k] === s.id ? 'selected' : ''}>${esc(s.icon)} ${esc(s.name)}${s.ready ? '' : ' (готується)'}</option>`).join('')}</select></td>
            <td class="c">${lc || '—'}</td></tr>`; }).join('')}</tbody></table></div>
          ${draft ? '' : `<p class="muted" style="font-size:13px;font-weight:700">Щоб змінити відповідність, завантажте файл розкладу ще раз.</p>
            ${S.entries.some(e => !map[e.s + '|' + e.g]) ? `<div class="flag-box" style="margin-top:10px">Предметів розкладу без пари на порталі: <b>${S.entries.filter(e => !map[e.s + '|' + e.g]).length}</b>.
              Їх можна додати в каталог порталу (з позначкою «матеріали готуються») — тоді їх можна буде призначати вчителям, а учні бачитимуть повний список предметів класу.
              <div style="margin-top:8px"><button class="btn brand sm" id="tAddSubj">➕ Додати предмети розкладу в каталог</button></div></div>` : ''}`}</div>
        ${draft ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin:16px 0"><button class="btn brand" id="tSave">💾 Зберегти розклад на порталі</button><button class="btn light" id="tCancel">Скасувати</button></div>` : ''}
        ${!draft ? `<div class="card pad" style="margin-top:16px"><h3 class="rs-h">🙋 Я в розкладі</h3>
          <p class="muted" style="font-weight:700;margin-bottom:8px">Оберіть своє ім’я — тоді на головній сторінці ви бачитимете свої уроки на сьогодні.</p>
          <select class="input" id="tMe" style="max-width:360px"><option value="">— не показувати мої уроки</option>${(S.teachers || []).map(t => `<option ${S.adminTeacher === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>` : ''}
        <div id="tTeachers"></div><div id="tStudents"></div>` : ''}`;
      const err = $app.querySelector('#tErr');
      $app.querySelectorAll('[data-sf]').forEach(sel => sel.onchange = () => {
        $app.querySelectorAll('[data-map]').forEach(x => { map[x.dataset.map] = x.value; });
        sf[sel.dataset.sf] = sel.value; if (sel.dataset.sf === 'g') { sf.s = ''; sf.t = ''; } if (sel.dataset.sf === 's') sf.t = '';
        ss.setItem('schedF', JSON.stringify(sf)); if (draft) draft._map = map; draw(); });
      const sfx = $app.querySelector('[data-sfx]'); if (sfx) sfx.onclick = () => { sf.g = sf.s = sf.t = ''; ss.setItem('schedF', '{}'); draw(); };
      $app.querySelector('#tFile').onchange = async ev => {
        const f = ev.target.files[0]; if (!f) return;
        try { draft = Object.assign(parseTimetableBackup(JSON.parse(await f.text())), { file: f.name }); draw(); }
        catch (e) { err.textContent = e.message || 'Не вдалося прочитати файл'; }
      };
      const del = $app.querySelector('#tDel');
      if (del) del.onclick = () => modal(`<div class="m-emoji">🗓</div><h2>Від’єднати розклад?</h2><p>Зникнуть уроки на сьогодні та нагадування за датами. Результати учнів не зміняться.</p>
        <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn danger" data-close id="dGo">Від’єднати</button></div>`,
        b => b.querySelector('#dGo').onclick = async () => { await Store.saveSchedule(null); SCHED = null; draw(); toast('Розклад від’єднано'); });
      const cancel = $app.querySelector('#tCancel'); if (cancel) cancel.onclick = () => { draft = null; draw(); };
      $app.querySelectorAll('[data-map]').forEach(sel => sel.onchange = () => { map[sel.dataset.map] = sel.value; if (draft) draft._map = Object.assign(draft._map || {}, { [sel.dataset.map]: sel.value }); });
      const save = $app.querySelector('#tSave');
      if (save) save.onclick = async () => {
        save.disabled = true; save.textContent = 'Зберігаємо…';
        $app.querySelectorAll('[data-map]').forEach(sel => { map[sel.dataset.map] = sel.value; });
        const data = { v: 1, year: draft.year, bells: draft.bells, teachers: draft.teachers, entries: draft.entries, map, source: draft.file, created: draft.created,
          importedAt: Date.now(), adminTeacher: (SCHED && SCHED.adminTeacher) || draft.teachers.find(t => normT(t) === normT(user.name)) || '' };
        try { await Store.saveSchedule(data); const students = draft.students; SCHED = data; draft = null; draw(); drawPeople(students); toast('Розклад збережено на порталі'); }
        catch (e) { err.textContent = 'Не вдалося зберегти: ' + e.message; save.disabled = false; save.textContent = '💾 Зберегти розклад на порталі'; }
      };
      const addS = $app.querySelector('#tAddSubj');
      if (addS) addS.onclick = async () => {
        addS.disabled = true;
        const added = addScheduleSubjects(SCHED);
        try { await Store.saveCatalog(exportCatalog()); await Store.saveSchedule(SCHED); toast(`Додано предметів: ${added}`); draw(); }
        catch (e) { err.textContent = 'Не вдалося зберегти: ' + e.message; addS.disabled = false; }
      };
      const me = $app.querySelector('#tMe');
      if (me) me.onchange = async () => { SCHED.adminTeacher = me.value; await Store.saveSchedule(SCHED); toast('Збережено'); };
      if (!draft && SCHED) drawPeople(null);
      if (draft) drawPeople(draft.students, true);
    };
    /* вчителі та учні з розкладу */
    async function drawPeople(students, preview) {
      const S = draft || SCHED; if (!S) return;
      const tBox = $app.querySelector('#tTeachers'), sBox = $app.querySelector('#tStudents'); if (!tBox) return;
      if (preview) { tBox.innerHTML = ''; sBox.innerHTML = students && students.length ? `<div class="card pad" style="margin-top:16px"><h3 class="rs-h">🧑‍🎓 Учні в розкладі: ${students.length}</h3><p class="muted" style="font-weight:700">Після збереження розкладу тут можна буде створити для них облікові записи.</p></div>` : ''; return; }
      let teachers = [];
      try { teachers = await Store.listTeachers(); } catch (e) { /* немає прав або бази */ }
      const portalByName = n => teachers.find(t => (t.schedName && t.schedName === n) || normT(t.name) === normT(n));
      const subjOf = n => { const ids = new Set(), cls = new Set();
        S.entries.forEach(e => { if (!(e.t || []).includes(n)) return; const id = S.map[e.s + '|' + e.g]; if (!id) return; const sj = catalogSubject(id); if (!sj) return;
          const k = classInfo(e.g); const full = k && k.subjects.find(x => x.id === id); (full ? subjectIds(full) : [id]).forEach(x => ids.add(x)); cls.add(+e.g); });
        return { subjects: [...ids], classes: [...cls].sort((a, b) => a - b) }; };
      const tShow = (S.teachers || []).map((n, i) => ({ n, i })).filter(({ n }) => !sf.t || sf.t === n)
        .filter(({ n }) => !sf.g && !sf.s || S.entries.some(e => (e.t || []).includes(n) && (!sf.g || String(e.g) === String(sf.g)) && (!sf.s || e.s === sf.s)));
      const short = ids => { const by = {}; ids.forEach(id => { const sj = catalogSubject(id); if (!sj || sj.archived) return; (by[sj.name] = by[sj.name] || new Set()).add(sj.cls); });
        return Object.entries(by).sort((a, b) => a[0].localeCompare(b[0], 'uk')).map(([nm, cs]) => `<span class="st-chip">${esc(nm)} <b>${[...cs].sort((a, b) => a - b).join(', ')}</b></span>`).join('') || '<span class="muted">—</span>'; };
      tBox.innerHTML = `<div class="card pad" style="margin-top:16px"><h3 class="rs-h">👩‍🏫 Вчителі з розкладу <small class="muted">· ${tShow.length}${tShow.length !== (S.teachers || []).length ? ' з ' + (S.teachers || []).length : ''}</small></h3>
        <p class="muted" style="font-weight:700;margin-bottom:8px;font-size:13px">🔄 — призначити вчителю на порталі ті самі предмети й класи, що в розкладі. ＋ — створити обліковий запис (потрібна лише пошта). Біля предмета — класи.</p>
        <div class="table-wrap" style="max-height:60vh"><table class="tbl tbl-compact sched-tch"><thead><tr><th>Вчитель</th><th>Предмети · класи</th><th class="c">Портал</th><th></th></tr></thead><tbody>
        ${tShow.map(({ n, i }) => { const t = portalByName(n), sj = subjOf(n);
          return `<tr><td class="st-n">${esc(n)}</td><td>${short(sj.subjects)}</td>
            <td class="c" title="${t ? esc(t.name) : 'Немає на порталі'}">${t ? (t.pending ? '⏳' : t.disabled ? '⛔' : '✅') : '—'}</td>
            <td class="c" style="white-space:nowrap">${t ? `<button class="icon-btn" data-sync="${i}" title="Синхронізувати предмети за розкладом">🔄</button>` : `<button class="btn brand sm" data-new="${i}" title="Створити вчителя на порталі">＋</button>`}</td></tr>`; }).join('') || '<tr><td colspan="4" class="empty">Нікого не знайдено</td></tr>'}</tbody></table></div>
        <p class="muted" style="font-size:12px;font-weight:700;margin-top:6px">✅ — є на порталі · ⏳ — заявка · ⛔ — вимкнено · — — немає</p></div>`;
      tBox.querySelectorAll('[data-sync]').forEach(b => b.onclick = async () => {
        const n = S.teachers[+b.dataset.sync], t = portalByName(n), sj = subjOf(n);
        const data = Object.assign({ schedName: n }, sj, t.pending ? { pending: false, disabled: false } : {});
        await Store.updateTeacher(t.uid, data); Object.assign(t, data); drawPeople(null); toast('Предмети вчителя оновлено за розкладом');
      });
      tBox.querySelectorAll('[data-new]').forEach(b => b.onclick = () => {
        const n = S.teachers[+b.dataset.new], sj = subjOf(n), pw = StoreUtils.makeTeacherPassword();
        modal(`<h2>Створити вчителя</h2><p class="muted" style="font-weight:700;margin-bottom:10px">${esc(n)} · ${teacherSubjectTags(sj.subjects)}</p>
          <div class="field"><label>Прізвище, ім’я та по батькові</label><input class="input" id="nName" value="${esc(n)}"></div>
          <div class="field"><label>Пошта (логін)</label><input class="input" id="nMail" type="email" autocapitalize="off"></div>
          <div class="field"><label>Початковий пароль</label><input class="input pw" id="nPw" value="${esc(pw)}"></div>
          <div class="form-error" id="nErr"></div>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="nGo">Створити</button></div>`,
          (box, close) => box.querySelector('#nGo').onclick = async () => {
            const email = box.querySelector('#nMail').value.trim(), password = box.querySelector('#nPw').value.trim(), name = box.querySelector('#nName').value.trim() || n;
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { box.querySelector('#nErr').textContent = 'Введіть пошту'; return; }
            if (password.length < 8) { box.querySelector('#nErr').textContent = 'Пароль — щонайменше 8 символів'; return; }
            try { const t = await Store.createTeacher(Object.assign({ name, email, password }, sj)); await Store.updateTeacher(t.uid, { schedName: n }); close(); drawPeople(null);
              modal(`<div class="m-emoji">✅</div><h2>Вчителя створено</h2><div class="lc" style="text-align:left">Логін: <code>${esc(email)}</code><br>Пароль: <code>${esc(password)}</code></div><p class="muted" style="font-size:14px;font-weight:700;margin-top:10px">Передайте ці дані вчителю.</p><div class="m-actions"><button class="btn brand" data-close>Готово</button></div>`); }
            catch (e) { box.querySelector('#nErr').textContent = e.message; }
          });
      });
      /* учні */
      if (!students || !students.length) {
        sBox.innerHTML = `<div class="card pad" style="margin-top:16px"><h3 class="rs-h">🧑‍🎓 Учні з розкладу</h3><p class="muted" style="font-weight:700">Щоб створити облікові записи учнів зі списку розкладу, завантажте файл розкладу ще раз і збережіть — після цього тут з’явиться список (імена на порталі не зберігаються).</p></div>`;
        return;
      }
      const portal = await Store.listStudents();
      const has = s => portal.some(p => p.cls === s.cls && normS(p.name) === normS(s.name));
      const missing = students.filter(s => !has(s) && classInfo(s.cls));
      sBox.innerHTML = `<div class="card pad" style="margin-top:16px"><h3 class="rs-h">🧑‍🎓 Учні з розкладу</h3>
        ${missing.length ? `<p class="muted" style="font-weight:700;margin-bottom:10px">Немає на порталі: <b>${missing.length}</b> з ${students.length}. Позначте, кому створити облікові записи (логіни й паролі з’являться на сторінці «Учні»).</p>
          <div class="stu-pick">${[...new Set(missing.map(s => s.cls))].sort((a, b) => a - b).map(c => `<div class="sp-class" style="--c:${esc((classInfo(c) || {}).color || '#6C5CE7')}"><b class="sp-num">${c} клас</b>
            ${missing.filter(s => s.cls === c).map(s => `<label class="sp-item"><input type="checkbox" checked data-stu="${students.indexOf(s)}"><span>${esc(s.name)}</span></label>`).join('')}</div>`).join('')}</div>
          <button class="btn brand" id="stGo" style="margin-top:12px">Створити облікові записи</button><div class="muted" id="stProg" style="font-weight:800;margin-top:8px"></div>`
        : `<p style="font-weight:800">✅ Усі ${students.length} учнів із розкладу вже мають облікові записи на порталі.</p>`}</div>`;
      const go = sBox.querySelector('#stGo');
      if (go) go.onclick = async () => {
        const pick = [...sBox.querySelectorAll('[data-stu]:checked')].map(c => students[+c.dataset.stu]);
        if (!pick.length) return;
        go.disabled = true; let ok = 0;
        for (const s of pick) { try { await Store.createStudent(s.name, s.cls); ok++; } catch (e) { console.warn(e); } sBox.querySelector('#stProg').textContent = `Створено ${ok} з ${pick.length}…`; }
        toast(`Створено облікових записів: ${ok}`); drawPeople(students);
      };
    }
    draw();
  }

  /* додати в каталог предмети розкладу, яких там немає; повертає кількість доданих */
  const ICONS = [['математ', '➗'], ['алгебр', '📐'], ['геометр', '📐'], ['українськ', '✍️'], ['літерат', '📚'], ['читанн', '📚'], ['англ', '🇬🇧'], ['німец', '🇩🇪'], ['іноземн', '🌐'],
    ['історі', '🏛'], ['громадян', '⚖️'], ['географ', '🌍'], ['природ', '🌿'], ['біолог', '🌿'], ['хімі', '⚗️'], ['фізична', '⚽'], ['фізкульт', '⚽'], ['фізик', '🔭'], ['мистецт', '🎨'],
    ['музик', '🎵'], ['образотвор', '🎨'], ['технолог', '🛠'], ['дизайн', '🛠'], ['досліджую', '🔎'], ['здоров', '💚'], ['інформат', '💻'], ['етик', '🤝'], ['підприєм', '💼']];
  const guessIcon = n => { const l = String(n).toLowerCase(); const h = ICONS.find(([w]) => l.includes(w)); return h ? h[1] : '📘'; };
  const TR = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia' };
  const slug = n => String(n).toLowerCase().split('').map(c => TR[c] != null ? TR[c] : /[a-z0-9]/.test(c) ? c : '_').join('').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 24);
  const CLASS_COLORS = ['#E8505B', '#FF7A59', '#FFB020', '#2BB673', '#14B8C4', '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#64748B', '#0EA5E9'];
  function addScheduleSubjects(S) {
    let added = 0;
    S.entries.forEach(e => {
      const mk = e.s + '|' + e.g; if (S.map[mk]) return;
      let k = CATALOG.find(c => c.cls === +e.g);
      if (!k) { k = { cls: +e.g, color: CLASS_COLORS[(+e.g - 1) % CLASS_COLORS.length], subjects: [] }; CATALOG.push(k); CATALOG.sort((a, b) => a.cls - b.cls); }
      let sj = k.subjects.find(x => normS(x.name) === normS(e.s));
      if (!sj) {
        let key = slug(e.s) + e.g; const used = new Set(CATALOG.flatMap(c => c.subjects.map(x => x.key)));
        while (used.has(key)) key += 'x';
        sj = { key, id: key, name: e.s, icon: guessIcon(e.s), course: '', ready: false };
        k.subjects.push(sj); added++;
      }
      S.map[mk] = sj.id;
    });
    Object.keys(_planCache).forEach(x => delete _planCache[x]);
    return added;
  }

  /* ---- нагадування: учні, які не пройшли тести за уроки, що вже відбулися ---- */
  function overdueOf(D, uid, id) {
    const past = pastLessons(id); if (!past.length) return [];
    const b = (D.best[uid] || {})[id] || {};
    return past.filter(l => !(b[l.id] && b[l.id].best != null));
  }
  function rsOverdue(D, box) {
    const subs = D.subs.filter(x => lessonPlan(x.id));
    if (!SCHED) { box.innerHTML = `<div class="card empty"><span class="e">🗓</span>Нагадування за датами працюють, коли підключено «Шкільний розклад».${isAdmin() ? ' <a href="#/teacher/schedule">Підключити</a>' : ' Зверніться до адміністратора.'}</div>`; return; }
    if (!subs.length) { box.innerHTML = `<div class="card empty"><span class="e">🗓</span>Ваші предмети не пов’язані з розкладом.${isAdmin() ? ' Перевірте відповідність на сторінці <a href="#/teacher/schedule">Розклад</a>.' : ''}</div>`; return; }
    const f = JSON.parse(ss.getItem('rsOvF') || '{}');
    box.innerHTML = `<div class="toolbar rs-filters">
        <select class="input" id="oS"><option value="">Усі предмети</option>${subs.map(x => `<option value="${x.id}" ${f.s === x.id ? 'selected' : ''}>${esc(x.name)} · ${x.cls} кл.</option>`).join('')}</select>
        <button class="btn light sm" id="oCsv">⬇️ CSV (Excel)</button></div><div id="oOut"></div>`;
    const build = () => { const s = box.querySelector('#oS').value; ss.setItem('rsOvF', JSON.stringify({ s }));
      return subs.filter(x => !s || x.id === s).map(x => {
        const past = pastLessons(x.id), plan = lessonPlan(x.id), next = plan.lessons.find(l => !lessonPast(l.date, l.slot));
        const rows = D.students.filter(st => st.cls === x.cls).map(st => ({ st, miss: overdueOf(D, st.uid, x.id) })).filter(r => r.miss.length).sort((a, b) => b.miss.length - a.miss.length);
        return { x, past, next, rows, students: D.students.filter(st => st.cls === x.cls).length };
      }); };
    const draw = () => {
      const groups = build();
      box.querySelector('#oOut').innerHTML = `<p class="muted rs-sum">Сьогодні ${fmtDay(todayIso())}. Учням показується таке саме нагадування на їхній сторінці.</p>` + groups.map(G => `
        <div class="card pad ov-card"><div class="ov-head"><h3>${subLabel(G.x)}</h3>
          <span class="muted">За розкладом відбулося ${G.past.length} з ${lessonPlan(G.x.id).lessons.length} уроків${G.next ? ` · наступний ${fmtDay(G.next.date)}: урок ${G.next.n}` : ''}</span>
          ${G.rows.length ? `<button class="btn light sm" data-copy="${G.x.id}">📋 Текст для чату класу</button>` : ''}</div>
          ${!G.students ? '<p class="muted" style="font-weight:700">У класі немає учнів</p>' : G.rows.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Учень</th><th class="c">Не пройдено</th><th>Тести за уроки, що вже були</th></tr></thead><tbody>
            ${G.rows.map(r => `<tr><td><a href="javascript:void(0)" data-st="${r.st.uid}" style="font-weight:800">${esc(r.st.name)}</a></td><td class="c"><span class="cell ${r.miss.length > 3 ? 'g-lo' : 'g-avg'}">${r.miss.length}</span></td>
              <td><small>${r.miss.slice(0, 6).map(l => `У${l.n} (${fmtDay(l.date)})`).join(', ')}${r.miss.length > 6 ? ' …' : ''}</small></td></tr>`).join('')}</tbody></table></div>`
            : G.past.length ? '<p style="font-weight:800">✅ Усі учні пройшли тести за уроки, що вже відбулися.</p>' : '<p class="muted" style="font-weight:700">Уроків за розкладом ще не було.</p>'}
        </div>`).join('');
      bindStudentLinks(D, box.querySelector('#oOut'));
      box.querySelectorAll('[data-copy]').forEach(bt => bt.onclick = () => {
        const G = groups.find(g => g.x.id === bt.dataset.copy);
        const txt = `🔔 ${G.x.name}, ${G.x.cls} клас. Нагадування: пройдіть тести на порталі «${C.siteTitle}» за уроки, які вже були.\n` + G.rows.map(r => `• ${r.st.name}: ${r.miss.map(l => 'урок ' + l.n).join(', ')}`).join('\n') + `\n${location.origin + location.pathname}`;
        navigator.clipboard.writeText(txt).then(() => toast('Текст скопійовано'));
      });
    };
    box.querySelector('#oS').onchange = draw;
    box.querySelector('#oCsv').onclick = () => downloadCsv('nagaduvannya.csv', [['Учень', 'Клас', 'Предмет', 'Не пройдено', 'Уроки']].concat(build().flatMap(G => G.rows.map(r => [r.st.name, G.x.cls, G.x.name, r.miss.length, r.miss.map(l => `${l.n} (${fmtDay(l.date)})`).join(', ')]))));
    draw();
  }

  /* ---------------- старт ---------------- */
  window.App = { modal, plural, toast };
  Store.onAuth(async (u, err) => {
    user = u;
    if (!u && err) { setChrome(); renderLogin(err); return; }
    if (u && Store.getCatalog) {
      try {
        const remote = await Store.getCatalog();
        if (remote && remote.length) {
          /* класи, що з’явилися в стандартному каталозі пізніше (наприклад, 1 клас), додаються автоматично */
          const have = new Set(remote.map(k => +k.cls));
          applyCatalog(remote.concat(BASE_CATALOG.filter(k => !have.has(+k.cls))));
        }
      }
      catch (e) { console.warn('Каталог з бази не завантажено', e); }
    }
    if (u && Store.getSchedule && u.role !== 'pending') {
      try { SCHED = await Store.getSchedule(); } catch (e) { console.warn('Розклад не завантажено', e); SCHED = null; }
    }
    if (u) chatStart(); else chatStop();
    if (u && (!location.hash || location.hash === '#/login')) history.replaceState(null, '', '#/');
    skipGuard = true;
    route();
  });
})();
