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
        if (p[1] === 'results') return await renderResults(p[2], p[3], p[4]);
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
  /* =====================================================================
     РЕЗУЛЬТАТИ: огляд, загальний список, журнал класу, статистика
     (предмети / класи / учні). Вчитель бачить лише свої предмети й класи.
     ===================================================================== */
  let RS = null;   // кеш даних сторінки «Результати»
  const DAY = 864e5;
  const LEVELS = [['Початковий', 1, 3, 'g-lo'], ['Середній', 4, 6, 'g-avg'], ['Достатній', 7, 9, 'g-mid'], ['Високий', 10, 12, 'g-hi']];
  const KIND = { lesson: 'Урок', section: 'Розділ', final: 'Річний' };
  const pct = (a, b) => b ? Math.round(a / b * 100) : null;
  const ago = ms => { if (!ms) return 'ще не проходив'; const d = Math.floor((Date.now() - ms) / DAY); return d <= 0 ? 'сьогодні' : d === 1 ? 'вчора' : d + ' дн. тому'; };

  async function loadResultsData(force) {
    if (!force && RS && RS.uid === user.uid && Date.now() - RS.at < 3 * 60e3) return RS;
    const subs = [];
    myClasses().forEach(k => (isAdmin() ? k.subjects : visibleSubjects(k)).filter(s => s.ready).forEach(s =>
      subs.push({ id: s.id, cls: k.cls, name: s.name, icon: s.icon || '📘', color: k.color, total: ((window.LESSON_INDEX || {})[s.id] || { l: [] }).l.length })));
    const lists = await Promise.all([Store.listStudents()].concat(subs.map(x => Store.courseResults(x.id).catch(() => []))));
    const students = lists.shift().slice().sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    const results = lists.flat().sort((a, b) => (b.atMs || 0) - (a.atMs || 0));
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
    RS = { uid: user.uid, at: Date.now(), subs, subById, students, stuById, results, best };
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
    return { s, subs, ms, avg: a, passed: scores.length, lessonPassed: lp, total: tot, done: tot ? lp / tot : null, attempts, last, leaves, flags };
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

  async function renderResults(tab, a, b) {
    if (tab && /^\d+$/.test(tab)) { b = a; a = tab; tab = 'journal'; }
    const TABS = [['overview', '📊 Огляд'], ['all', '📋 Усі результати'], ['journal', '📒 Журнал класу'], ['subjects', '📚 За предметами'], ['classes', '🏫 За класами'], ['students', '🧑‍🎓 За учнями']];
    if (!TABS.some(t => t[0] === tab)) tab = ss.getItem('rsTab') || 'overview';
    ss.setItem('rsTab', tab);
    const tabsHtml = `<div class="page-head"><div><h1>Результати</h1><p>${isAdmin() ? 'Усі класи й предмети' : 'Ваші класи й предмети'} · загальний список, журнал і статистика</p></div>
        ${tab !== 'journal' ? `<button class="btn light sm" id="rsRefresh" title="Завантажити свіжі дані">🔄 Оновити</button>` : ''}</div>
      <nav class="rs-tabs">${TABS.map(([k, t]) => `<a href="#/teacher/results/${k}" class="${k === tab ? 'on' : ''}">${t}</a>`).join('')}</nav>`;
    if (tab === 'journal') return renderJournal(a, b, tabsHtml);
    $app.innerHTML = tabsHtml + '<div class="loader"><span></span></div>';
    const D = await loadResultsData();
    const refresh = () => { const r = $app.querySelector('#rsRefresh'); if (r) r.onclick = async () => { RS = null; route(); }; };
    if (!D.subs.length) { $app.innerHTML = tabsHtml + `<div class="card empty"><span class="e">📭</span>Немає наповнених предметів${isTeacher() ? ', призначених вам' : ''}.</div>`; refresh(); return; }
    const body = { overview: rsOverview, all: rsAll, subjects: rsSubjects, classes: rsClasses, students: rsStudents }[tab];
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
      </div>
      <div class="rs-grid">
        <div class="card pad"><h3 class="rs-h">📈 Активність за 2 тижні</h3>
          <div class="day-chart">${perDay.map((n, i) => `<div class="dc-col" title="${days[i].toLocaleDateString('uk-UA')}: ${n} спроб"><b>${n || ''}</b><i style="height:${Math.round(n / maxDay * 100)}%"></i><span>${days[i].getDate()}</span></div>`).join('')}</div></div>
        <div class="card pad"><h3 class="rs-h">🎯 Рівні навчальних досягнень</h3>${levelBars(scores)}</div>
        <div class="card pad"><h3 class="rs-h">⚠️ Потребують уваги</h3>
          ${attention.length ? `<ul class="rs-list">${attention.map(r => `<li><a href="javascript:void(0)" data-st="${r.s.uid}">${esc(r.s.name)}</a> <span class="muted">${r.s.cls} кл.</span><br><small>${r.flags.map(esc).join(' · ')}</small></li>`).join('')}</ul>` : '<p class="muted" style="font-weight:700">Усе добре — тривожних сигналів немає 🎉</p>'}
          <a class="btn light sm" href="#/teacher/results/students">Усі учні →</a></div>
        <div class="card pad"><h3 class="rs-h">🧗 Найскладніші тести</h3>
          ${hard.length ? `<ul class="rs-list">${hard.map(h => `<li><b>${esc(h.title)}</b><br><small>${subLabel(D.subById[h.course])} · середній ${h.avg} · зараховано ${h.rate}% з ${h.n} спроб</small></li>`).join('')}</ul>
            <p class="muted" style="font-size:13px;font-weight:700">Варто повторити ці теми на уроці.</p>` : '<p class="muted" style="font-weight:700">Потрібно щонайменше 3 спроби на тест, щоб оцінити складність.</p>'}</div>
      </div>
      <div class="card pad" style="margin-top:16px"><h3 class="rs-h">🕒 Останні спроби</h3>${attemptsTable(D, D.results.slice(0, 10), false)}
        <a class="btn light sm" href="#/teacher/results/all">Усі результати →</a></div>`;
    bindStudentLinks(D, box);
  }

  function attemptsTable(D, list, withDel, noStudent) {
    if (!list.length) return '<div class="empty" style="padding:20px">Спроб ще немає</div>';
    return `<div class="table-wrap"><table class="tbl"><thead><tr><th>Дата</th>${noStudent ? '' : '<th>Учень</th>'}<th>Предмет</th><th>Тест</th><th class="c">Оцінка</th><th class="c">Правильно</th><th class="c">Час</th><th class="c" title="Скільки разів учень виходив з вікна тесту">Виходи</th>${withDel ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map(r => { const s = D.stuById[r.uid]; return `<tr><td>${fmtDate(r.atMs)}</td>
        ${noStudent ? '' : `<td>${s ? `<a href="javascript:void(0)" data-st="${s.uid}" style="font-weight:800">${esc(s.name)}</a>` : `${esc(r.name || '—')} <small class="muted">(видалений)</small>`}</td>`}
        <td>${subLabel(D.subById[r.course])}</td><td><small class="muted">${KIND[r.kind] || ''}</small> ${esc(r.title)}</td>
        <td class="c"><span class="cell ${r.passed ? gradeClass(r.score) : 'g-lo'}" title="${r.passed ? 'Зараховано' : 'Не зараховано'}">${r.score}${r.passed ? '' : ' ✕'}</span></td>
        <td class="c">${r.full}/${r.total}</td><td class="c">${fmtDur(r.durationSec || 0)}${r.auto ? ' ⌛' : ''}</td><td class="c">${r.leaves || 0}</td>
        ${withDel ? `<td><button class="btn danger sm" data-rdel="${esc(r.id)}" title="Видалити спробу (учень зможе пройти тест ще раз)">✕</button></td>` : ''}</tr>`; }).join('')}
      </tbody></table></div>`;
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
        <select class="input" id="fS"><option value="">Усі предмети</option>${D.subs.map(x => `<option value="${x.id}" ${f.s === x.id ? 'selected' : ''}>${esc(x.name)} · ${x.cls} кл.</option>`).join('')}</select>
        <select class="input" id="fK"><option value="">Усі тести</option>${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${f.k === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <select class="input" id="fP"><option value="">Увесь час</option>${[[1, 'Сьогодні'], [7, '7 днів'], [30, '30 днів']].map(([d, t]) => `<option value="${d}" ${f.p == d ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <select class="input" id="fR"><option value="">Усі спроби</option><option value="1" ${f.r === '1' ? 'selected' : ''}>Зараховані</option><option value="0" ${f.r === '0' ? 'selected' : ''}>Не зараховані</option></select>
        <input class="input" id="fQ" placeholder="🔍 Учень або тест" value="${esc(f.q || '')}">
        <button class="btn light sm" id="fCsv">⬇️ CSV (Excel)</button>
      </div><div id="allOut"></div>`;
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
    box.querySelectorAll('.rs-filters select').forEach(s => s.onchange = () => { shown = 100; draw(); });
    let t; box.querySelector('#fQ').oninput = () => { clearTimeout(t); t = setTimeout(() => { shown = 100; draw(); }, 250); };
    box.querySelector('#fCsv').onclick = () => downloadCsv('rezultaty_usi.csv', [['Дата', 'Учень', 'Клас', 'Предмет', 'Вид', 'Тест', 'Оцінка', 'Зараховано', 'Повністю правильно', 'Питань', 'Час (с)', 'Виходи']]
      .concat(filtered().map(r => { const s = D.stuById[r.uid], x = D.subById[r.course];
        return [fmtDate(r.atMs), s ? s.name : r.name, s ? s.cls : r.cls, x ? x.name + ' ' + x.cls + ' кл.' : r.course, KIND[r.kind] || '', r.title, r.score, r.passed ? 'так' : 'ні', r.full, r.total, r.durationSec || 0, r.leaves || 0]; })));
    draw();
  }

  /* ---- за предметами ---- */
  function rsSubjects(D, box) {
    const rows = D.subs.map(x => subjectRow(D, x));
    box.innerHTML = `<div class="card table-wrap"><table class="tbl"><thead><tr><th>Предмет</th><th class="c">Учнів</th><th class="c">Проходили</th><th class="c">Середній бал</th><th class="c">Зараховано спроб</th><th style="min-width:150px">Пройдено уроків</th><th>Рівні</th><th class="c">Остання спроба</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td style="font-weight:800">${subLabel(r.x)}</td><td class="c">${r.students}</td><td class="c">${r.active}</td>
        <td class="c"><span class="cell ${gradeClass(r.avg)}">${r.avg ?? '—'}</span></td><td class="c">${r.passRate == null ? '—' : r.passRate + '%'}</td><td>${doneBar(r.done)}</td>
        <td style="min-width:160px">${r.scores.length ? `<div class="lvl-bar sm">${LEVELS.map(([nm, lo, hi, cl]) => { const c = r.scores.filter(v => v >= lo && v <= hi).length; return c ? `<i class="${cl}" style="flex:${c}" title="${nm}: ${c}"></i>` : ''; }).join('')}</div>` : '<span class="muted">—</span>'}</td>
        <td class="c">${r.last ? ago(r.last) : '—'}</td>
        <td><button class="btn light sm" data-sub="${r.x.id}">Детально</button> <a class="btn light sm" href="#/teacher/results/journal/${r.x.cls}/${r.x.id}" title="Журнал класу">📒</a></td></tr>`).join('')}
      </tbody></table></div>
      <p class="muted rs-sum">«Проходили» — учні з хоча б однією спробою. «Пройдено уроків» — частка зарахованих тестів за уроки від усіх можливих.</p>`;
    box.querySelectorAll('[data-sub]').forEach(bt => bt.onclick = () => subjectDetail(D, D.subById[bt.dataset.sub]));
  }
  function subjectDetail(D, x) {
    const r = subjectRow(D, x);
    const studs = D.students.filter(s => s.cls === x.cls).map(s => ({ s, m: metric(D, s.uid, x.id) })).sort((a, b) => (b.m.avg ?? -1) - (a.m.avg ?? -1));
    const hard = hardTests(D, z => z.course === x.id).slice(0, 5);
    const sections = ((window.LESSON_INDEX || {})[x.id] || { s: [] }).s;
    modal(`<h2>${subLabel(x)}</h2>
      <div class="stat-tiles sm"><div class="card stat-tile"><div class="v">${r.avg ?? '—'}</div><div class="k">Середній бал</div></div>
        <div class="card stat-tile"><div class="v">${r.done == null ? '—' : Math.round(r.done * 100) + '%'}</div><div class="k">Пройдено уроків</div></div>
        <div class="card stat-tile"><div class="v">${r.active}/${r.students}</div><div class="k">Учнів проходили</div></div></div>
      <h3 class="rs-h">Рівні досягнень</h3>${levelBars(r.scores)}
      ${sections.length ? `<h3 class="rs-h">Підсумкові за розділами</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>Розділ</th><th class="c">Склали</th><th class="c">Середній</th></tr></thead><tbody>
        ${sections.map(([n, t]) => { const sc = studs.map(o => ((D.best[o.s.uid] || {})[x.id] || {})['section-' + n]).filter(e => e && e.best != null).map(e => e.best);
          return `<tr><td>${n}. ${esc(t)}</td><td class="c">${sc.length}/${studs.length}</td><td class="c"><span class="cell ${gradeClass(avg(sc))}">${avg(sc) ?? '—'}</span></td></tr>`; }).join('')}</tbody></table></div>` : ''}
      <h3 class="rs-h">Рейтинг учнів</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>Учень</th><th class="c">Середній</th><th style="min-width:130px">Уроки</th><th class="c">Остання спроба</th></tr></thead><tbody>
        ${studs.map((o, i) => `<tr><td>${i + 1}</td><td><a href="javascript:void(0)" data-st="${o.s.uid}" style="font-weight:800">${esc(o.s.name)}</a></td><td class="c"><span class="cell ${gradeClass(o.m.avg)}">${o.m.avg ?? '—'}</span></td><td>${doneBar(o.m.done)}</td><td class="c">${ago(o.m.last)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">У класі немає учнів</td></tr>'}</tbody></table></div>
      ${hard.length ? `<h3 class="rs-h">Найскладніші тести</h3><ul class="rs-list">${hard.map(h => `<li><b>${esc(h.title)}</b> — середній ${h.avg}, зараховано ${h.rate}% (${h.n} спроб)</li>`).join('')}</ul>` : ''}
      <div class="m-actions"><a class="btn light" href="#/teacher/results/journal/${x.cls}/${x.id}" data-close>📒 Журнал класу</a><button class="btn brand" data-close>Закрити</button></div>`,
      box => box.querySelectorAll('[data-st]').forEach(el => el.onclick = () => studentProfile(D, D.stuById[el.dataset.st])), { wide: true });
  }

  /* ---- за класами ---- */
  function rsClasses(D, box) {
    const classes = [...new Set(D.subs.map(x => x.cls))].sort((a, b) => a - b);
    const rows = classes.map(c => {
      const subs = D.subs.filter(x => x.cls === c).map(x => subjectRow(D, x));
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
        <table class="tbl cs-tbl"><tbody>${r.subs.map(z => `<tr><td>${esc(z.x.icon)} ${esc(z.x.name)}</td><td class="c"><span class="cell ${gradeClass(z.avg)}">${z.avg ?? '—'}</span></td><td style="min-width:110px">${doneBar(z.done)}</td>
          <td><a class="btn light sm" href="#/teacher/results/journal/${r.c}/${z.x.id}" title="Журнал">📒</a></td></tr>`).join('')}</tbody></table>
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
        <div class="card table-wrap" style="max-height:70vh"><table class="tbl"><thead><tr><th class="sticky-col">Учень</th><th class="c">Клас</th><th class="c">Середній</th><th class="c">Тестів зарах.</th><th style="min-width:140px">Пройдено уроків</th><th class="c">Спроб</th><th class="c">Останній вхід</th><th>Сигнали</th></tr></thead><tbody>
        ${l.map(r => `<tr><td class="sticky-col"><a href="javascript:void(0)" data-st="${r.s.uid}" style="font-weight:900">${esc(r.s.name)}</a></td><td class="c">${r.s.cls}</td>
          <td class="c"><span class="cell ${gradeClass(r.avg)}">${r.avg ?? '—'}</span></td><td class="c">${r.passed}</td><td>${doneBar(r.done)}</td><td class="c">${r.attempts}</td>
          <td class="c">${ago(r.last)}</td><td>${r.flags.length ? `<small class="flag">⚠️ ${r.flags.map(esc).join(', ')}</small>` : '<small class="muted">—</small>'}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">Нікого не знайдено</td></tr>'}
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
      ${r.flags.length ? `<div class="flag-box">⚠️ ${r.flags.map(esc).join(' · ')}</div>` : ''}
      <div class="stat-tiles sm"><div class="card stat-tile"><div class="v">${r.avg ?? '—'}</div><div class="k">Середній бал</div></div>
        <div class="card stat-tile"><div class="v">${r.passed}</div><div class="k">Тестів зараховано</div></div>
        <div class="card stat-tile"><div class="v">${r.done == null ? '—' : Math.round(r.done * 100) + '%'}</div><div class="k">Пройдено уроків</div></div></div>
      <h3 class="rs-h">За предметами</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>Предмет</th><th class="c">Середній</th><th style="min-width:130px">Уроки</th><th class="c">Спроб</th><th class="c">Остання</th><th></th></tr></thead><tbody>
        ${r.subs.map((x, i) => { const m = r.ms[i]; return `<tr><td>${esc(x.icon)} ${esc(x.name)}</td><td class="c"><span class="cell ${gradeClass(m.avg)}">${m.avg ?? '—'}</span></td><td>${doneBar(m.done)}</td><td class="c">${m.attempts}</td><td class="c">${ago(m.last)}</td>
          <td><a class="btn light sm" href="#/teacher/results/journal/${x.cls}/${x.id}" data-close title="Журнал">📒</a></td></tr>`; }).join('')}</tbody></table></div>
      <h3 class="rs-h">Усі спроби (${rs.length})</h3>
      <p class="muted" style="font-size:13px;font-weight:700;margin-bottom:8px">Зарахований тест блокується для учня. Щоб дозволити пройти його ще раз, видаліть спробу (✕).</p>
      ${attemptsTable(D, rs, true, true)}
      <div class="m-actions"><button class="btn brand" data-close>Закрити</button></div>`;
    modal(draw(), function mount(box, close) {
      box.querySelectorAll('[data-rdel]').forEach(bt => bt.onclick = async () => {
        await delAttempt(D, bt.dataset.rdel); rs = rs.filter(x => x.id !== bt.dataset.rdel);
        Object.assign(r, studentRow(D, s)); box.innerHTML = draw();
        box.querySelectorAll('[data-close]').forEach(x => x.onclick = () => { close(); route(); }); mount(box, close);
      });
    }, { wide: true });
  }

  async function renderJournal(clsArg, courseArg, tabsHtml) {
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
