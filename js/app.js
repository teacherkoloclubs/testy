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
  function applyCatalog(classes) {
    CATALOG.length = 0;
    classes.slice().sort((a, b) => a.cls - b.cls).forEach(k => CATALOG.push({
      cls: Number(k.cls), color: k.color || '#5B4BF5',
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
    return CATALOG.map(k => ({ cls: k.cls, color: k.color, subjects: k.subjects.map(s => ({
      key: s.key, name: s.name, icon: s.icon, course: s.course || '', unlinked: !!s.unlinked, hidden: !!s.hidden, archive: s.archive || [] })) }));
  }
  /* ---------- ролі ---------- */
  const isAdmin = () => !!user && user.role === 'admin';
  const isTeacher = () => !!user && user.role === 'teacher';
  const isStaff = () => isAdmin() || isTeacher();
  /* id курсів (разом з архівними виданнями), доступних вчителю */
  const canCourse = id => !isTeacher() || (user.subjects || []).includes(id);
  const canSubject = s => !isTeacher() || [s.id, s.key, s.course].concat((s.archive || []).map(a => a.course)).some(x => x && user.subjects.includes(x));
  const visibleSubjects = k => k.subjects.filter(s => !(s.hidden && user && user.role === 'student') && canSubject(s));
  /* класи, які бачить користувач: адміністратор — усі, вчитель — де є його предмети */
  const myClasses = () => isTeacher() ? CATALOG.filter(k => visibleSubjects(k).length || (user.classes || []).includes(k.cls)) : CATALOG;
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
      s.lessons.forEach(l => list.push({ key: l.id, title: l.n + '. ' + l.title, short: 'Урок ' + l.n, emoji: l.emoji || '📘', href: `#/test/${id}/lesson/${l.id}`, slides: `#/slides/${id}/${l.id}` }));
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
      ? [['#/', 'Класи'], ['#/teacher/results', 'Результати'], ['#/teacher/students', 'Учні'], ['#/teacher/teachers', 'Вчителі'], ['#/teacher/subjects', 'Предмети']]
      : isTeacher() ? [['#/', 'Мої класи'], ['#/teacher/results', 'Результати'], ['#/teacher/students', 'Учні']]
      : user.role === 'pending' ? []
      : [['#/', 'Мої предмети'], ['#/my', 'Мої результати']];
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
      if (p[0] === 'test') return await renderTest(p[1], p[2], p[3]);
      if (p[0] === 'my') return await renderMy();
      if (p[0] === 'games') return await renderGames(p[1], p[2], p[3]);
      if (p[0] === 'teacher' && isStaff()) {
        if (p[1] === 'students') return await renderStudents();
        if (p[1] === 'results') return await renderResults(p[2], p[3]);
        if (p[1] === 'subjects' && isAdmin()) return renderSubjectsAdmin();
        if (p[1] === 'teachers' && isAdmin()) return await renderTeachers();
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
    const opts = CATALOG.map(k => k.subjects.filter(sj => sj.ready).map(sj => `<label class="sp-item"><input type="checkbox" value="${esc(sj.id)}"><span>${k.cls} кл. · ${esc(sj.icon)} ${esc(sj.name)}</span></label>`).join('')).join('');
    modal(`<h2>👩‍🏫 Заявка вчителя</h2>
      <p class="muted" style="font-weight:700;margin-bottom:12px">Після підтвердження адміністратором ви побачите свої класи, учнів і результати.</p>
      <div class="field"><label>Прізвище, ім’я та по батькові</label><input class="input" id="sName"></div>
      <div class="field"><label>Пошта (буде вашим логіном)</label><input class="input" id="sMail" type="email" autocapitalize="off" spellcheck="false"></div>
      <div class="field"><label>Пароль (щонайменше 8 символів)</label><input class="input" id="sPw" type="password" autocomplete="new-password"></div>
      <div class="field"><label>Які предмети ви викладаєте?</label><div class="subj-pick flat">${opts}</div></div>
      <div class="field"><label>Коментар для адміністратора (необов’язково)</label><input class="input" id="sNote" maxlength="300" placeholder="Наприклад: класний керівник 3-А"></div>
      <div class="form-error" id="sErr"></div>
      <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="sGo">Надіслати заявку</button></div>`,
      (box, close) => box.querySelector('#sGo').onclick = async () => {
        const name = box.querySelector('#sName').value.trim(), email = box.querySelector('#sMail').value.trim(), password = box.querySelector('#sPw').value;
        const err = box.querySelector('#sErr');
        if (!name) { err.textContent = 'Введіть ім’я'; return; }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Введіть правильну адресу пошти'; return; }
        if (password.length < 8) { err.textContent = 'Пароль має містити щонайменше 8 символів'; return; }
        const requested = [...box.querySelectorAll('.subj-pick input:checked')].map(c => c.value);
        const b = box.querySelector('#sGo'); b.disabled = true; b.textContent = 'Надсилаємо…';
        try { await Store.registerTeacher({ name, email, password, requested, note: box.querySelector('#sNote').value }); close(); }
        catch (e) { err.textContent = e.message; b.disabled = false; b.textContent = 'Надіслати заявку'; }
      }, { wide: true });
  }

  /* ---------------- класи / предмети ---------------- */
  function renderClasses() {
    $app.innerHTML = `
      <div class="page-head"><div><h1>${isTeacher() ? 'Мої класи' : 'Оберіть клас'}</h1><p>${isTeacher() ? 'Класи й предмети, які вам призначив адміністратор' : 'Тести та презентації для 2–9 класів'}</p></div></div>
      ${isTeacher() && !myClasses().length ? `<div class="card empty"><span class="e">📭</span>Вам ще не призначено жодного предмета. Зверніться до адміністратора.</div>` : ''}
      <div class="class-grid">${myClasses().map(k => `
        <a class="class-tile" style="--c:${k.color}" href="#/class/${k.cls}">
          <span class="num">${k.cls}</span><span class="lbl">клас</span>
          <span class="subs">${visibleSubjects(k).map(s => `<span>${esc(s.name)}</span>`).join('')}</span></a>`).join('')}
      </div>`;
  }

  async function renderClass(n) {
    const k = classInfo(n);
    if (!k) { $app.innerHTML = `<div class="empty"><span class="e">🤷</span>Клас не знайдено</div>`; return; }
    if (n <= 4) document.body.classList.add('theme-primary');
    if (isTeacher() && !myClasses().includes(k)) { location.hash = '#/'; return; }
    const crumbs = isStaff() ? `<div class="crumbs"><a href="#/">Класи</a><span>›</span><span>${n} клас</span></div>` : '';
    $app.innerHTML = `${crumbs}
      <div class="page-head"><div><h1>${user.role === 'student' ? 'Привіт, ' + esc(user.name.split(' ').slice(-1)[0]) + '! 👋' : n + ' клас'}</h1>
      <p>${user.role === 'student' ? n + ' клас · обери предмет' : 'Предмети'}</p></div></div>
      <div id="reminder"></div>
      <div class="grid subject-grid">${visibleSubjects(k).map(s => `
        <a class="card subject-tile ${s.ready ? '' : 'soon'}" style="--c:${k.color}" href="${s.ready ? '#/course/' + s.id : 'javascript:void(0)'}" ${s.ready ? '' : 'data-soon'}>
          <span class="ico">${s.icon}</span>
          <span class="st-body"><h3>${esc(s.name)}${s.hidden ? ' <span class="tag">🙈 приховано</span>' : ''}</h3><span class="muted st-sub" id="prog-${s.id}">${s.ready ? 'Презентації та тести' : '⏳ Матеріали готуються'}</span></span>
        </a>`).join('')}</div>`;
    $app.querySelectorAll('[data-soon]').forEach(a => a.addEventListener('click', () => toast('Матеріали з цього предмета ще готуються')));
    if (user.role !== 'student') return;
    const here = location.hash;
    const ready = visibleSubjects(k).filter(s => s.ready);
    if (!ready.length) return;
    const results = await Store.myResults();
    const todo = [];
    let doneAll = 0, totalAll = 0;
    for (const s of ready) {
      const course = await loadCourse(s.id);
      const bm = bestMap(results.filter(r => r.course === s.id));
      const tests = courseTests(course, s.id);
      const done = tests.filter(t => bm[t.key] && bm[t.key].best != null).length;
      doneAll += done; totalAll += tests.length;
      const el = document.getElementById('prog-' + s.id);
      if (el) el.innerHTML = `<span class="mini-progress"><i style="width:${done / tests.length * 100}%"></i></span>Виконано ${done} з ${tests.length}`;
      tests.filter(t => !(bm[t.key] && bm[t.key].best != null)).forEach(t => todo.push(Object.assign({ subject: s }, t)));
    }
    if (location.hash !== here) return;
    const box = document.getElementById('reminder');
    if (!box) return;
    box.innerHTML = todo.length ? `
      <div class="card reminder">
        <div class="rem-head"><span class="rem-emoji">🔔</span><div><h2>Нагадування</h2>
          <p>Виконано <b>${doneAll}</b> з <b>${totalAll}</b> тестів. Ще ${todo.length === 1 ? 'залишився' : 'залишилось'} <b>${todo.length}</b>.</p></div></div>
        <div class="rem-list">${todo.slice(0, 4).map((t, i) => `
          <a class="rem-item ${i === 0 ? 'next' : ''}" href="${t.href}"><span class="ri-emoji">${t.emoji}</span>
            <span class="ri-text"><small>${esc(t.subject.name)} · ${esc(t.short)}${i === 0 ? ' · наступний' : ''}</small><b>${esc(t.title)}</b></span><span class="ri-go">→</span></a>`).join('')}
        </div>
        ${todo.length > 4 ? `<p class="muted" style="font-weight:800;margin-top:10px;font-size:14px">…і ще ${todo.length - 4}. Усі тести — на сторінці предмета.</p>` : ''}
      </div>` : `<div class="card reminder done"><div class="rem-head"><span class="rem-emoji">🎉</span><div><h2>Усі тести виконано!</h2><p>Чудова робота! Презентації можна переглядати скільки завгодно.</p></div></div></div>`;
  }

  /* ---------------- сторінка курсу ---------------- */
  async function renderCourse(id) {
    const meta = catalogSubject(id);
    if (!meta || !meta.ready) { $app.innerHTML = `<div class="empty"><span class="e">⏳</span>Матеріали ще готуються</div>`; return; }
    if (!meta || (user.role === 'student' && (meta.cls !== user.cls || meta.archived)) || !canCourse(meta.id)) { location.hash = '#/'; return; }
    $app.innerHTML = '<div class="loader"><span></span></div>';
    const course = await loadCourse(id);
    if (course.primary) document.body.classList.add('theme-primary');
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
      ${course.sections.map(s => `
        <section class="section-block">
          <div class="section-head"><span class="sn" style="--sc:${s.color || meta.color}">${s.n}</span><h2>${esc(s.title)}</h2><span class="tag">${s.lessons.length} ${plural(s.lessons.length, 'урок', 'уроки', 'уроків')}</span></div>
          <div class="lesson-list">
            ${s.lessons.map(l => `
              <div class="card lesson-row">
                <span class="ln">${l.emoji || '📘'}</span>
                <div><h3>${esc(l.title)}</h3><div class="meta">Урок ${l.n}${l.pages ? ' · ' + esc(pg(l.pages)) : ''} ${status(l.id)}</div></div>
                <div class="lesson-actions">
                  <a class="btn light sm" href="#/slides/${id}/${l.id}">🎞 Презентація</a>
                  ${window.Games && Games.has(id, l.id) ? `<a class="btn light sm game-btn" href="#/games/${id}/${l.id}">🎮 Ігри</a>` : ''}
                  ${testBtn(l.id, `#/test/${id}/lesson/${l.id}`, '📝 Тест')}
                  ${user.role === 'student' ? g(l.id) : ''}
                </div>
              </div>`).join('')}
            <div class="card lesson-row summary-row">
              <span class="ln">🏁</span>
              <div><h3>Підсумковий тест за розділ ${s.n}</h3><div class="meta">${C.sectionQuestions} питань · ${Math.round(C.sectionQuestions * C.secondsPerQuestion / 60)} хв ${status('section-' + s.n)}</div></div>
              <div class="lesson-actions">${testBtn('section-' + s.n, `#/test/${id}/section/${s.n}`, 'Почати', 'brand')}${user.role === 'student' ? g('section-' + s.n) : ''}</div>
            </div>
          </div>
        </section>`).join('')}
      <div class="card lesson-row summary-row final">
        <span class="ln">🏆</span>
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
    Protect.set(true, user.role === 'student');
    view = Slides.run($app, lesson, {
      color: lesson.section.color || meta.color,
      testHref: `#/test/${id}/lesson/${lid}`,
      crumbs: `<a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span><span>${esc(lesson.section.title)}</span>`,
      source: sourceNote(course, lesson.pages),
      sourceText: bookLine(course) + (lesson.pages ? ', ' + esc(pg(lesson.pages)) : '')
    });
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

  /* ---------------- мої результати ---------------- */
  async function renderMy() {
    $app.innerHTML = '<div class="loader"><span></span></div>';
    const results = await Store.myResults();
    const k = classInfo(user.cls);
    const courses = (k ? visibleSubjects(k) : []).filter(s => s.ready);
    let html = `<div class="page-head"><div><h1>Мої результати</h1><p>${esc(user.name)} · ${user.cls} клас</p></div></div>`;
    if (!courses.length) { $app.innerHTML = html + `<div class="card empty"><span class="e">📭</span>Поки немає курсів</div>`; return; }
    for (const s of courses) {
      const course = await loadCourse(s.id);
      const rs = results.filter(r => r.course === s.id);
      const bm = bestMap(rs);
      const lessons = course.sections.flatMap(x => x.lessons);
      const lessonBest = lessons.map(l => bm[l.id] && bm[l.id].best).filter(v => v != null);
      const secBest = course.sections.map(x => bm['section-' + x.n] && bm['section-' + x.n].best).filter(v => v != null);
      const fin = bm.final && bm.final.best;
      html += `<h2 style="margin:10px 0 14px">${s.icon} ${esc(s.name)}</h2>
        <div class="stat-tiles">
          <div class="card stat-tile"><div class="v">${lessonBest.length}<span class="muted" style="font-size:18px"> / ${lessons.length}</span></div><div class="k">Зараховано тестів за уроки</div></div>
          <div class="card stat-tile"><div class="v">${avg(lessonBest) ?? '—'}</div><div class="k">Середній бал за уроки</div></div>
          <div class="card stat-tile"><div class="v">${avg(secBest) ?? '—'}</div><div class="k">Середній бал за розділи (${secBest.length}/${course.sections.length})</div></div>
          <div class="card stat-tile"><div class="v">${fin ?? '—'}</div><div class="k">Річний тест</div></div>
          <div class="card stat-tile"><div class="v">${rs.length}</div><div class="k">Усього спроб</div></div>
        </div>
        <div class="card table-wrap" style="margin-bottom:24px"><table class="tbl">
          <thead><tr><th>Тест</th><th class="c">Найкраща оцінка</th><th class="c">Спроб</th><th>Остання спроба</th></tr></thead><tbody>
          ${course.sections.map(sec => `
            <tr><td colspan="4" style="background:#F7F6FF;font-weight:900">Розділ ${sec.n}. ${esc(sec.title)}</td></tr>
            ${sec.lessons.map(l => row(l.n + '. ' + l.title, bm[l.id])).join('')}
            ${row('🏁 Підсумковий за розділ ' + sec.n, bm['section-' + sec.n])}`).join('')}
          ${row('🏆 Річний підсумковий тест', bm.final)}
          </tbody></table></div>
        <h3 style="margin-bottom:10px">Історія спроб</h3>
        <div class="card table-wrap" style="margin-bottom:30px"><table class="tbl"><thead><tr><th>Дата</th><th>Тест</th><th class="c">Оцінка</th><th class="c">Час</th></tr></thead><tbody>
          ${rs.length ? rs.slice().sort((a, b) => (b.atMs || 0) - (a.atMs || 0)).map(r => `<tr><td>${fmtDate(r.atMs)}</td><td>${esc(r.title)}</td>
            <td class="c"><span class="cell ${gradeClass(r.score)}">${r.score}</span>${r.passed ? '' : ' <span class="muted">не зарах.</span>'}</td><td class="c">${fmtDur(r.durationSec || 0)}</td></tr>`).join('')
            : `<tr><td colspan="4" class="empty" style="padding:30px">Ще немає спроб — час пройти перший тест! 🚀</td></tr>`}
        </tbody></table></div>`;
    }
    $app.innerHTML = html;
    function row(name, e) {
      return `<tr><td>${esc(name)}</td><td class="c"><span class="cell ${gradeClass(e && e.best)}">${e && e.best != null ? e.best : '—'}</span></td>
        <td class="c">${e ? e.attempts : 0}</td><td>${e ? fmtDate(e.lastAt) + (e.best == null ? ' · не зараховано' : '') : '—'}</td></tr>`;
    }
  }

  /* ---------------- вчитель: учні ---------------- */
  async function renderStudents() {
    $app.innerHTML = '<div class="loader"><span></span></div>';
    let students = await Store.listStudents();
    /* класи, з якими можна працювати: адміністратор — усі, вчитель — свої */
    const clsList = isAdmin() ? CATALOG.map(k => k.cls) : (user.classes || []).slice().sort((a, b) => a - b);
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
        <div class="login-cards" id="lcards">${list.map(s => `<div class="lc"><b>${esc(s.name)}</b><span class="muted">${s.cls} клас</span><br>Логін: <code>${esc(s.login)}</code><br>Пароль: <code>${esc(s.password)}</code></div>`).join('')}</div>
        <div class="m-actions"><button class="btn light" id="cCopy">📋 Копіювати</button><button class="btn light" id="cPrint">🖨 Друкувати</button><button class="btn brand" data-close>Готово</button></div>`,
        box => {
          box.querySelector('#cCopy').onclick = () => {
            const txt = list.map(s => `${s.name} (${s.cls} кл.) — логін: ${s.login}, пароль: ${s.password}`).join('\n');
            navigator.clipboard.writeText(txt).then(() => toast('Скопійовано'));
          };
          box.querySelector('#cPrint').onclick = () => {
            const w = window.open('', '_blank');
            w.document.write(`<html><head><meta charset="utf-8"><title>Логіни</title><style>body{font-family:sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px}div{border:1px dashed #999;padding:10px;border-radius:8px;font-size:14px}b{font-size:15px}code{font-size:15px;font-weight:bold}</style></head><body>${box.querySelector('#lcards').innerHTML}<p style="grid-column:1/-1">Сайт: ${esc(location.origin + location.pathname)}</p></body></html>`);
            w.document.close(); w.focus(); w.print();
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
  async function renderResults(clsArg, courseArg) {
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
    const head = `<div class="page-head"><div><h1>Результати</h1><p>Найкращі зараховані оцінки кожного учня</p></div></div>
      <div class="toolbar">
        <select class="input" id="rCls">${classes.map(c => `<option value="${c.cls}" ${c.cls === cls ? 'selected' : ''}>${c.cls} клас</option>`).join('')}</select>
        <select class="input" id="rSub">${subs.map(s => `<option value="${s.id}" ${subj && s.id === subj.id ? 'selected' : ''} ${s.ready ? '' : 'disabled'}>${esc(s.name)}${s.ready ? '' : ' (готується)'}</option>` + (s.archive || []).map(a => `<option value="${a.course}" ${subj && a.course === subj.id ? 'selected' : ''}>${esc(s.name)} — архів: ${esc(a.label || a.course)}</option>`).join('')).join('')}</select>
        <span id="rTools"></span>
      </div>`;
    $app.innerHTML = head + '<div class="loader"><span></span></div>';
    const bind = () => {
      $app.querySelector('#rCls').onchange = e => { location.hash = '#/teacher/results/' + e.target.value; };
      $app.querySelector('#rSub').onchange = e => { location.hash = '#/teacher/results/' + cls + '/' + e.target.value; };
    };
    bind();
    if (!subj || !subj.ready) { $app.innerHTML = head + `<div class="card empty"><span class="e">⏳</span>Для цього класу ще немає наповнених предметів</div>`; bind(); return; }

    const [course, students, results] = await Promise.all([loadCourse(subj.id), Store.listStudents(), Store.courseResults(subj.id)]);
    const list = students.filter(s => s.cls === cls).sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    const lessons = course.sections.flatMap(s => s.lessons);
    const cols = [];
    course.sections.forEach(s => {
      s.lessons.forEach(l => cols.push({ id: l.id, label: l.n + '. ' + l.title, short: 'У' + l.n, kind: 'lesson' }));
      cols.push({ id: 'section-' + s.n, label: 'Підсумковий: розділ ' + s.n, short: 'Р' + s.n, kind: 'section' });
    });
    cols.push({ id: 'final', label: 'Річний підсумковий', short: 'Рік', kind: 'final' });
    const byUser = {};
    results.forEach(r => (byUser[r.uid] = byUser[r.uid] || []).push(r));

    const rowsData = list.map(s => {
      const bm = bestMap(byUser[s.uid] || []);
      const lb = lessons.map(l => bm[l.id] && bm[l.id].best).filter(v => v != null);
      const sb = course.sections.map(x => bm['section-' + x.n] && bm['section-' + x.n].best).filter(v => v != null);
      return { s, bm, lessonAvg: avg(lb), lessonDone: lb.length, sectionAvg: avg(sb), final: bm.final && bm.final.best, attempts: (byUser[s.uid] || []).length };
    });
    const cell = e => {
      if (!e) return `<span class="cell none">·</span>`;
      if (e.best != null) return `<span class="cell ${gradeClass(e.best)}" title="Спроб: ${e.attempts}">${e.best}</span>`;
      return `<span class="cell g-lo" title="Не зараховано, спроб: ${e.attempts}">✕</span>`;
    };

    $app.innerHTML = head + `
      <div class="stat-tiles">
        <div class="card stat-tile"><div class="v">${list.length}</div><div class="k">Учнів у класі</div></div>
        <div class="card stat-tile"><div class="v">${avg(rowsData.map(r => r.lessonAvg).filter(v => v != null)) ?? '—'}</div><div class="k">Середній бал класу (уроки)</div></div>
        <div class="card stat-tile"><div class="v">${results.filter(r => list.some(s => s.uid === r.uid)).length}</div><div class="k">Усього спроб</div></div>
        <div class="card stat-tile"><div class="v">${rowsData.filter(r => r.final != null).length}</div><div class="k">Склали річний тест</div></div>
      </div>
      ${list.length ? `<div class="card table-wrap" style="max-height:70vh"><table class="tbl">
        <thead><tr><th class="sticky-col">Учень</th><th class="c">Середній<br>(уроки)</th><th class="c">Тестів<br>зарах.</th><th class="c">Середній<br>(розділи)</th>
          ${cols.map(c => `<th class="c vert" title="${esc(c.label)}" style="${c.kind !== 'lesson' ? 'background:#FFF4DE' : ''}">${esc(c.short)} ${c.kind === 'lesson' ? '' : '★'}</th>`).join('')}</tr></thead>
        <tbody>${rowsData.map(r => `<tr>
          <td class="sticky-col"><a href="javascript:void(0)" data-st="${r.s.uid}" style="font-weight:900">${esc(r.s.name)}</a></td>
          <td class="c"><span class="cell ${gradeClass(r.lessonAvg)}">${r.lessonAvg ?? '—'}</span></td>
          <td class="c">${r.lessonDone}/${lessons.length}</td>
          <td class="c"><span class="cell ${gradeClass(r.sectionAvg)}">${r.sectionAvg ?? '—'}</span></td>
          ${cols.map(c => `<td class="c">${cell(r.bm[c.id])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="muted" style="margin-top:10px;font-size:14px;font-weight:700">У — тест за урок, Р — підсумковий за розділ, ★ — підсумкові. ✕ — спроби були, але тест не зараховано. Натисніть на ім’я, щоб побачити всі спроби.</p>`
        : `<div class="card empty"><span class="e">🧑‍🎓</span>У ${cls} класі ще немає учнів. <a href="#/teacher/students">Додати учнів</a></div>`}`;
    bind();
    $app.querySelector('#rTools').innerHTML = list.length ? `<button class="btn light sm" id="csv">⬇️ Експорт у CSV (Excel)</button>` : '';
    const csvBtn = $app.querySelector('#csv');
    if (csvBtn) csvBtn.onclick = () => {
      const header = ['Учень', 'Середній (уроки)', 'Тестів зараховано', 'Середній (розділи)'].concat(cols.map(c => c.label));
      const lines = [header].concat(rowsData.map(r => [r.s.name, r.lessonAvg ?? '', r.lessonDone, r.sectionAvg ?? ''].concat(cols.map(c => { const e = r.bm[c.id]; return e ? (e.best != null ? e.best : 'не зар.') : ''; }))));
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
          await Store.deleteResult(b.dataset.rdel);
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

  /* ---------------- вибір предметів для вчителя ---------------- */
  function subjectPicker(selectedIds) {
    const sel = new Set(selectedIds || []);
    return `<div class="subj-pick">${CATALOG.map((k, ki) => k.subjects.length ? `
      <div class="sp-class" style="--c:${esc(k.color)}"><b class="sp-num">${k.cls} клас</b>
        ${k.subjects.map((sj, si) => `<label class="sp-item"><input type="checkbox" data-sp="${ki}:${si}" ${subjectIds(sj).some(x => sel.has(x)) ? 'checked' : ''}>
          <span>${esc(sj.icon)} ${esc(sj.name)}${sj.ready ? '' : ' <small class="muted">(готується)</small>'}</span></label>`).join('')}
      </div>` : '').join('')}</div>`;
  }
  function readPicker(box) {
    const subjects = new Set(), classes = new Set();
    box.querySelectorAll('[data-sp]:checked').forEach(c => {
      const [ki, si] = c.dataset.sp.split(':').map(Number); const k = CATALOG[ki], sj = k.subjects[si];
      subjectIds(sj).forEach(x => subjects.add(x)); classes.add(k.cls);
    });
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
        <div class="field"><label>Предмети${approve ? ' (позначено ті, які просить вчитель)' : ''}</label>${subjectPicker(approve ? t.requested : t.subjects)}</div>
        <div class="form-error" id="eTErr"></div>
        <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="eTGo">${approve ? '✅ Підтвердити' : 'Зберегти'}</button></div>`,
        (box, close) => box.querySelector('#eTGo').onclick = async () => {
          const pick = readPicker(box);
          const data = Object.assign({ name: box.querySelector('#eTName').value.trim() || t.name }, pick);
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
    const COLORS = ['#FF7A59', '#FFB020', '#2BB673', '#14B8C4', '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#F43F5E', '#0EA5E9', '#84CC16'];
    const courseOpts = sel => `<option value="">— матеріали готуються —</option>` +
      AVAILABLE.map(c => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(c.title)}</option>`).join('');
    const mark = () => { dirty = true; const b = $app.querySelector('#saveCat'); if (b) { b.disabled = false; b.textContent = '💾 Зберегти зміни'; } };
    function draw() {
      $app.innerHTML = `
        <div class="page-head"><div><h1>Предмети за класами</h1>
          <p>Додавайте й прибирайте класи та предмети, змінюйте назви, значки й порядок, приховуйте від учнів.</p></div>
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
        ${draft.map((k, ki) => `
          <div class="card pad adm-class" style="--c:${esc(k.color)}">
            <div class="adm-head">
              <span class="adm-num">${k.cls}</span><h2>${k.cls} клас</h2>
              <label class="adm-color" title="Колір класу"><input type="color" value="${esc(k.color)}" data-k="${ki}" data-f="color"></label>
              <button class="btn danger sm" data-delcls="${ki}">🗑 Видалити клас</button>
            </div>
            <div class="adm-list">
              ${k.subjects.length ? k.subjects.map((sj, si) => `
                <div class="adm-row ${sj.hidden ? 'is-hidden' : ''}">
                  <input class="input adm-icon" value="${esc(sj.icon)}" maxlength="4" data-k="${ki}" data-s="${si}" data-f="icon" title="Значок (емодзі)">
                  <input class="input" value="${esc(sj.name)}" placeholder="Назва предмета" data-k="${ki}" data-s="${si}" data-f="name">
                  <select class="input" data-k="${ki}" data-s="${si}" data-f="course" title="Матеріали">${courseOpts(sj.course)}</select>
                  <label class="adm-check"><input type="checkbox" ${sj.hidden ? 'checked' : ''} data-k="${ki}" data-s="${si}" data-f="hidden"> Приховати</label>
                  <span class="adm-btns">
                    <button class="icon-btn" data-mv="${ki}:${si}:-1" title="Вище" ${si === 0 ? 'disabled' : ''}>↑</button>
                    <button class="icon-btn" data-mv="${ki}:${si}:1" title="Нижче" ${si === k.subjects.length - 1 ? 'disabled' : ''}>↓</button>
                    <button class="icon-btn adm-del" data-delsub="${ki}:${si}" title="Видалити предмет">🗑</button>
                  </span>
                </div>`).join('') : '<p class="muted" style="font-weight:700">Предметів ще немає</p>'}
            </div>
            <button class="btn light sm" data-addsub="${ki}" style="margin-top:12px">＋ Додати предмет</button>
          </div>`).join('')}`;
    }
    draw();
    $app.addEventListener('input', onInput);
    $app.addEventListener('change', onInput);
    function onInput(e) {
      const t = e.target; if (!t.dataset || t.dataset.f === undefined || !$app.querySelector('#saveCat')) return;
      const k = draft[+t.dataset.k]; if (!k) return;
      const f = t.dataset.f;
      if (t.dataset.s === undefined) { k[f] = t.value; t.closest('.adm-class').style.setProperty('--c', t.value); }
      else {
        const sj = k.subjects[+t.dataset.s];
        sj[f] = t.type === 'checkbox' ? t.checked : t.value;
        if (f === 'course') sj.unlinked = !t.value;
        if (f === 'course' && t.value && (!sj.name || sj.name === 'Новий предмет')) { const c = AVAILABLE.find(x => x.id === t.value); if (c && c.subject) { sj.name = c.subject; draw(); } }
        if (f === 'hidden') t.closest('.adm-row').classList.toggle('is-hidden', t.checked);
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
          const clean = draft.map(k => ({ cls: k.cls, color: k.color, subjects: k.subjects.map(sj => Object.assign({}, sj, { name: (sj.name || '').trim() || 'Без назви', icon: (sj.icon || '').trim() || '📘' })) }));
          await Store.saveCatalog(clean); applyCatalog(clean); draft = exportCatalog(); dirty = false; draw(); toast('Предмети збережено');
        } catch (er) { b.disabled = false; b.textContent = '💾 Зберегти зміни'; toast('Помилка: ' + er.message); }
        return;
      }
      if (b.dataset.addsub !== undefined) {
        const k = draft[+b.dataset.addsub];
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

  /* ---------------- старт ---------------- */
  window.App = { modal, plural, toast };
  Store.onAuth(async (u, err) => {
    user = u;
    if (!u && err) { setChrome(); renderLogin(err); return; }
    if (u && Store.getCatalog) {
      try { const remote = await Store.getCatalog(); if (remote && remote.length) applyCatalog(remote); }
      catch (e) { console.warn('Каталог з бази не завантажено', e); }
    }
    if (u && (!location.hash || location.hash === '#/login')) history.replaceState(null, '', '#/');
    skipGuard = true;
    route();
  });
})();
