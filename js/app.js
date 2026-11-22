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
      c._loaded = true;
      c.sections.forEach(s => s.lessons.forEach(l => { l.section = s; }));
    }
    return COURSES[id];
  }

  function catalogSubject(id) {
    for (const k of CATALOG) for (const s of k.subjects) if (s.id === id) return Object.assign({ cls: k.cls, color: k.color }, s);
    return null;
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
    const links = user.role === 'teacher'
      ? [['#/', 'Класи'], ['#/teacher/results', 'Результати'], ['#/teacher/students', 'Учні']]
      : [['#/', 'Мої предмети'], ['#/my', 'Мої результати']];
    const h = location.hash || '#/';
    document.getElementById('topnav').innerHTML = links.map(([href, t]) =>
      `<a href="${href}" class="${(href === '#/' ? (h === '#/' || h.startsWith('#/class') || h.startsWith('#/course')) : h.startsWith(href)) ? 'active' : ''}">${t}</a>`).join('');
    document.getElementById('userchip').innerHTML = `
      <span class="avatar">${esc(initials(user.name))}</span>
      <span class="who"><b>${esc(user.name)}</b><small>${user.role === 'teacher' ? 'Вчитель' : user.cls + ' клас'}</small></span>
      <button class="icon-btn" id="logout" title="Вийти">⏻</button>`;
    document.getElementById('logout').onclick = () => modal(`<div class="m-emoji">👋</div><h2>Вийти з порталу?</h2>
      <div class="m-actions"><button class="btn light" data-close>Ні</button><button class="btn" data-close id="mOut">Вийти</button></div>`,
      b => b.querySelector('#mOut').onclick = () => { history.replaceState(null, '', '#/'); lastHash = '#/'; Store.signOut(); });
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
      if (!p.length) return user.role === 'teacher' ? renderClasses() : await renderClass(user.cls);
      if (p[0] === 'class') return await renderClass(+p[1]);
      if (p[0] === 'course') return await renderCourse(p[1]);
      if (p[0] === 'slides') return await renderSlides(p[1], p[2]);
      if (p[0] === 'test') return await renderTest(p[1], p[2], p[3]);
      if (p[0] === 'my') return await renderMy();
      if (p[0] === 'teacher' && user.role === 'teacher') {
        if (p[1] === 'students') return await renderStudents();
        if (p[1] === 'results') return await renderResults(p[2], p[3]);
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
          <p class="muted" style="font-weight:700">Логін і пароль видає вчитель</p>
          <div class="field"><label for="lg">Логін</label><input class="input" id="lg" name="username" autocomplete="username" required autocapitalize="off" spellcheck="false" placeholder="наприклад, 2ivanenko25"></div>
          <div class="field"><label for="pw">Пароль</label><input class="input" id="pw" name="password" type="password" autocomplete="current-password" required></div>
          ${Store.mode === 'setup' ? `<div class="setup-note">⚙️ Сайт ще не підключено до бази даних. Вчителю: заповніть розділ <b>firebase</b> у файлі <b>js/config.js</b> (інструкція — у README.md).</div>` : ''}
          <div class="form-error" id="lErr">${esc(err || '')}</div>
          <button class="btn brand" type="submit">Увійти →</button>
        </form>
      </div>`;
    $app.querySelector('#loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Входимо…';
      try { await Store.signIn($app.querySelector('#lg').value, $app.querySelector('#pw').value); }
      catch (ex) { $app.querySelector('#lErr').textContent = ex.message; b.disabled = false; b.textContent = 'Увійти →'; }
    });
  }

  /* ---------------- класи / предмети ---------------- */
  function renderClasses() {
    $app.innerHTML = `
      <div class="page-head"><div><h1>Оберіть клас</h1><p>Тести та презентації для 2–9 класів</p></div></div>
      <div class="class-grid">${CATALOG.map(k => `
        <a class="class-tile" style="--c:${k.color}" href="#/class/${k.cls}">
          <span class="num">${k.cls}</span><span class="lbl">клас</span>
          <span class="subs">${k.subjects.map(s => `<span>${esc(s.name)}</span>`).join('')}</span></a>`).join('')}
      </div>`;
  }

  async function renderClass(n) {
    const k = classInfo(n);
    if (!k) { $app.innerHTML = `<div class="empty"><span class="e">🤷</span>Клас не знайдено</div>`; return; }
    if (n <= 4) document.body.classList.add('theme-primary');
    const crumbs = user.role === 'teacher' ? `<div class="crumbs"><a href="#/">Класи</a><span>›</span><span>${n} клас</span></div>` : '';
    $app.innerHTML = `${crumbs}
      <div class="page-head"><div><h1>${user.role === 'student' ? 'Привіт, ' + esc(user.name.split(' ').slice(-1)[0]) + '! 👋' : n + ' клас'}</h1>
      <p>${user.role === 'student' ? n + ' клас · обери предмет' : 'Предмети'}</p></div></div>
      <div id="reminder"></div>
      <div class="grid g-auto">${k.subjects.map(s => `
        <a class="card subject-tile ${s.ready ? '' : 'soon'}" style="--c:${k.color}" href="${s.ready ? '#/course/' + s.id : 'javascript:void(0)'}" ${s.ready ? '' : 'data-soon'}>
          <span class="ico">${s.icon}</span>
          <span class="st-body"><h3>${esc(s.name)}</h3><span class="muted st-sub" id="prog-${s.id}">${s.ready ? 'Презентації та тести' : '⏳ Матеріали готуються'}</span></span>
        </a>`).join('')}</div>`;
    $app.querySelectorAll('[data-soon]').forEach(a => a.addEventListener('click', () => toast('Матеріали з цього предмета ще готуються')));
    if (user.role !== 'student') return;
    const here = location.hash;
    const ready = k.subjects.filter(s => s.ready);
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
    if (user.role === 'student' && meta.cls !== user.cls) { location.hash = '#/'; return; }
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
    const crumbs = `<div class="crumbs">${user.role === 'teacher' ? `<a href="#/">Класи</a><span>›</span>` : ''}<a href="#/class/${meta.cls}">${meta.cls} клас</a><span>›</span><span>${esc(meta.name)}</span></div>`;

    $app.innerHTML = `${crumbs}
      <div class="course-hero" style="--c:${meta.color}">
        <div><h1>${esc(meta.name)} · ${meta.cls} клас</h1><p>${esc(course.book || meta.book || '')}</p>
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
                <div><h3>${esc(l.title)}</h3><div class="meta">Урок ${l.n}${l.pages ? ' · с. ' + esc(l.pages) : ''} ${status(l.id)}</div></div>
                <div class="lesson-actions">
                  <a class="btn light sm" href="#/slides/${id}/${l.id}">🎞 Презентація</a>
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
      </div>`;
  }

  /* ---------------- презентація ---------------- */
  async function renderSlides(id, lid) {
    const meta = catalogSubject(id);
    if (user.role === 'student' && meta.cls !== user.cls) { location.hash = '#/'; return; }
    const course = await loadCourse(id);
    if (course.primary) document.body.classList.add('theme-primary');
    const lesson = course.sections.flatMap(s => s.lessons).find(l => l.id === lid);
    if (!lesson) throw new Error('Урок не знайдено');
    Protect.set(true, user.role === 'student');
    view = Slides.run($app, lesson, {
      color: lesson.section.color || meta.color,
      testHref: `#/test/${id}/lesson/${lid}`,
      crumbs: `<a href="#/course/${id}">${esc(meta.name)} · ${meta.cls} клас</a><span>›</span><span>${esc(lesson.section.title)}</span>`
    });
  }

  /* ---------------- тест ---------------- */
  async function renderTest(id, kind, key) {
    const meta = catalogSubject(id);
    if (user.role === 'student' && meta.cls !== user.cls) { location.hash = '#/'; return; }
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
    const courses = (k ? k.subjects : []).filter(s => s.ready);
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
    const filterCls = ss.getItem('stFilter') || 'all';
    const draw = () => {
      const f = ss.getItem('stFilter') || 'all';
      const list = students.filter(s => f === 'all' || String(s.cls) === f).sort((a, b) => a.cls - b.cls || a.name.localeCompare(b.name, 'uk'));
      $app.innerHTML = `
        <div class="page-head"><div><h1>Учні</h1><p>Створення облікових записів, логіни та паролі</p></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn light" id="promote">⬆️ Перевести в наступний клас</button><button class="btn brand" id="addBtn">＋ Додати учнів</button></div></div>
        <div class="toolbar">
          <select class="input" id="fCls"><option value="all">Усі класи</option>${CATALOG.map(k => `<option value="${k.cls}" ${f == k.cls ? 'selected' : ''}>${k.cls} клас</option>`).join('')}</select>
          <span class="tag">${list.length} ${plural(list.length, 'учень', 'учні', 'учнів')}</span>
          <button class="btn light sm" id="cardsBtn" ${list.length ? '' : 'disabled'}>🖨 Картки з логінами</button>
        </div>
        <div class="card table-wrap">${list.length ? `<table class="tbl"><thead><tr><th>Учень</th><th class="c">Клас</th><th>Логін</th><th>Пароль</th><th></th></tr></thead><tbody>
          ${list.map(s => `<tr><td><b>${esc(s.name)}</b></td><td class="c">${s.cls}</td><td class="pw">${esc(s.login)}</td><td class="pw">${esc(s.password || '—')}</td>
            <td style="text-align:right"><button class="btn light sm" data-edit="${s.uid}">✏️</button> <button class="btn danger sm" data-del="${s.uid}">🗑</button></td></tr>`).join('')}
          </tbody></table>` : `<div class="empty"><span class="e">🧑‍🎓</span>Учнів ще немає. Натисніть «Додати учнів».</div>`}</div>`;
      $app.querySelector('#fCls').onchange = e => { ss.setItem('stFilter', e.target.value); draw(); };
      $app.querySelector('#addBtn').onclick = addDialog;
      $app.querySelector('#promote').onclick = promoteDialog;
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
          <div class="field"><label>Клас</label><select class="input" id="eCls">${CATALOG.map(k => `<option ${k.cls === s.cls ? 'selected' : ''}>${k.cls}</option>`).join('')}</select></div>
          <p class="muted" style="margin-top:12px;font-size:14px">Логін і пароль не змінюються. Якщо учень забув пароль — він показаний у таблиці.</p>
          <div class="m-actions"><button class="btn light" data-close>Скасувати</button><button class="btn brand" id="eSave">Зберегти</button></div>`,
          (box, close) => box.querySelector('#eSave').onclick = async () => {
            const data = { name: box.querySelector('#eName').value.trim() || s.name, cls: +box.querySelector('#eCls').value };
            await Store.updateStudent(s.uid, data); Object.assign(s, data); close(); draw(); toast('Збережено');
          }, { wide: false });
      });
    };
    function addDialog() {
      const f = ss.getItem('stFilter');
      modal(`<h2>Додати учнів</h2>
        <div class="field"><label>Клас</label><select class="input" id="aCls">${CATALOG.map(k => `<option ${String(k.cls) === f ? 'selected' : ''}>${k.cls}</option>`).join('')}</select></div>
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
    const ready = CATALOG.flatMap(k => k.subjects.filter(s => s.ready).map(s => ({ cls: k.cls, s })));
    const cls = +(clsArg || ss.getItem('rsCls') || (ready[0] && ready[0].cls) || 2);
    const k = classInfo(cls);
    const subj = (k && k.subjects.find(s => s.id === courseArg)) || (k && k.subjects.find(s => s.ready));
    ss.setItem('rsCls', cls);
    const head = `<div class="page-head"><div><h1>Результати</h1><p>Найкращі зараховані оцінки кожного учня</p></div></div>
      <div class="toolbar">
        <select class="input" id="rCls">${CATALOG.map(c => `<option value="${c.cls}" ${c.cls === cls ? 'selected' : ''}>${c.cls} клас</option>`).join('')}</select>
        <select class="input" id="rSub">${(k ? k.subjects : []).map(s => `<option value="${s.id}" ${subj && s.id === subj.id ? 'selected' : ''} ${s.ready ? '' : 'disabled'}>${esc(s.name)}${s.ready ? '' : ' (готується)'}</option>`).join('')}</select>
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

  /* ---------------- старт ---------------- */
  window.App = { modal, plural, toast };
  Store.onAuth((u, err) => {
    user = u;
    if (!u && err) { setChrome(); renderLogin(err); return; }
    if (u && (!location.hash || location.hash === '#/login')) history.replaceState(null, '', '#/');
    skipGuard = true;
    route();
  });
})();
