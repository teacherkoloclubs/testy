/* Рушій тестів */
(function () {
  const C = window.APP_CONFIG;

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* Вибір питань: половина з однією відповіддю, половина з кількома */
  function pick(pool, count) {
    const single = shuffle(pool.filter(q => q.c.length === 1));
    const multi = shuffle(pool.filter(q => q.c.length > 1));
    let ns = Math.ceil(count / 2), nm = count - ns;
    if (single.length < ns) { nm += ns - single.length; ns = single.length; }
    if (multi.length < nm) { ns = Math.min(single.length, ns + nm - multi.length); nm = multi.length; }
    return shuffle(single.slice(0, ns).concat(multi.slice(0, nm)));
  }

  function prepare(q) {
    const opts = shuffle(q.a.map((t, i) => ({ t, correct: q.c.includes(i) })));
    return { text: q.q, emoji: q.e || '', multi: q.c.length > 1, opts, ncorrect: q.c.length };
  }

  function gradeQuestion(q, sel) {
    if (!q.multi) {
      const i = [...sel][0];
      return sel.size === 1 && q.opts[i].correct ? 1 : 0;
    }
    let good = 0, bad = 0;
    sel.forEach(i => (q.opts[i].correct ? good++ : bad++));
    return Math.max(0, (good - bad) / q.ncorrect);
  }

  /* ---------- озвучення (для молодших класів) ---------- */
  let ukVoice = null;
  function findVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    ukVoice = vs.find(v => /^uk/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) { findVoice(); speechSynthesis.onvoiceschanged = findVoice; }
  function speak(text) {
    if (!ukVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = ukVoice; u.lang = ukVoice.lang; u.rate = 0.9;
    speechSynthesis.speak(u);
  }
  function plain(s) { return String(s).replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim(); }

  /* =====================================================================
     run(root, opts) → { destroy }
     opts: { title, questions(raw, вже вибрані), primary, meta, onSave(result), onRestart(), backHref }
     ===================================================================== */
  function run(root, opts) {
    const qs = opts.questions.map(prepare);
    const n = qs.length;
    const total = n * C.secondsPerQuestion;
    const unlockAt = n * C.unlockSecondsPerQuestion;
    const sel = qs.map(() => new Set());
    const t0 = Date.now();
    let cur = 0, done = false, timer = null, destroyed = false;
    Protect.resetLeaves();

    root.innerHTML = `
      <div class="crumbs">${opts.crumbs || ''}</div>
      <div class="card test-top">
        <h2>${esc(opts.title)}</h2>
        <span class="tag">${n} питань</span>
        <div class="timer" id="tTimer"><div class="timer-ring" id="tRing"></div><span id="tTime">${fmt(total)}</span></div>
      </div>
      <div id="tBody"></div>`;
    const body = root.querySelector('#tBody');
    const elTime = root.querySelector('#tTime'), elRing = root.querySelector('#tRing'), elTimer = root.querySelector('#tTimer');

    function elapsed() { return (Date.now() - t0) / 1000; }

    function renderDots(results) {
      return `<div class="qdots">${qs.map((q, i) => {
        let cls = '';
        if (results) cls = results[i] === 1 ? 'r-ok' : results[i] > 0 ? 'r-part' : 'r-bad';
        else cls = (i === cur ? 'current ' : '') + (sel[i].size ? 'answered' : '');
        return `<button data-go="${i}" class="${cls}" aria-label="Питання ${i + 1}">${i + 1}</button>`;
      }).join('')}</div>`;
    }

    let hideMissed = false; // для учня при незарахованому тесті не показуємо пропущені правильні відповіді
    function optHtml(q, i, j, review) {
      const o = q.opts[j]; const s = sel[i].has(j);
      let cls = 'opt ' + (q.multi ? 'multi' : 'single');
      if (review) {
        if (o.correct && s) cls += ' correct';
        else if (!o.correct && s) cls += ' wrong';
        else if (o.correct && !s && !hideMissed) cls += ' missed';
      } else if (s) cls += ' sel';
      return `<button class="${cls}" data-q="${i}" data-o="${j}" ${review ? 'disabled' : ''}><span class="mark"></span><span>${esc(o.t)}</span></button>`;
    }

    function questionHtml(i, review, score) {
      const q = qs[i];
      let note = '';
      if (review) {
        if (score === 1) note = `<div class="q-result-note ok">✅ Правильно!</div>`;
        else if (score > 0) note = `<div class="q-result-note part">🟠 Частково правильно (${Math.round(score * 100)}%).${hideMissed ? '' : ' Пунктиром позначено пропущені правильні відповіді.'}</div>`;
        else note = `<div class="q-result-note bad">❌ Неправильно.${hideMissed ? '' : ' Правильні відповіді позначено зеленим.'}</div>`;
      }
      const speakBtn = opts.primary && ukVoice ? `<button class="speak" data-speak="${i}" title="Прочитати вголос">🔊</button>` : '';
      return `<div class="card question">
        <div class="q-head"><span class="q-num">Питання ${i + 1} з ${n}</span>
          <span class="q-type ${q.multi ? 'multi' : ''}">${q.multi ? '✋✋ Обери кілька відповідей' : '☝️ Обери одну відповідь'}</span></div>
        <div class="q-text">${q.emoji ? `<span class="q-emoji">${q.emoji}</span>` : ''}<span>${esc(q.text)}</span>${speakBtn}</div>
        <div class="options">${q.opts.map((_, j) => optHtml(q, i, j, review)).join('')}</div>${note}
      </div>`;
    }

    function render() {
      if (done) return;
      body.innerHTML = renderDots() + questionHtml(cur, false) + `
        <div class="q-nav">
          <button class="btn light" data-nav="-1" ${cur === 0 ? 'disabled' : ''}>← Назад</button>
          <button class="btn light" data-nav="1" ${cur === n - 1 ? 'disabled' : ''}>Далі →</button>
        </div>
        <div class="check-bar"><button class="btn ok" id="tCheck" disabled>Перевірити відповіді</button></div>`;
      updateCheck();
    }

    function updateCheck() {
      const b = body.querySelector('#tCheck'); if (!b) return;
      const left = unlockAt - elapsed();
      if (left > 0) { b.disabled = true; b.textContent = `Перевірити відповіді (через ${fmt(left)})`; }
      else { b.disabled = false; b.textContent = 'Перевірити відповіді ✓'; }
    }

    function tick() {
      if (done || destroyed) return;
      const left = total - elapsed();
      elTime.textContent = fmt(left);
      elRing.style.setProperty('--p', Math.max(0, left / total * 100));
      elTimer.classList.toggle('low', left <= Math.min(60, total * 0.15));
      updateCheck();
      if (left <= 0) finish(true);
    }

    body.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t || done) return;
      if (t.dataset.speak !== undefined) {
        const q = qs[+t.dataset.speak];
        speak(plain(q.text) + '. ' + q.opts.map((o, k) => (k + 1) + ') ' + plain(o.t)).join('. '));
        return;
      }
      if (t.dataset.o !== undefined) {
        const i = +t.dataset.q, j = +t.dataset.o, s = sel[i];
        if (qs[i].multi) { s.has(j) ? s.delete(j) : s.add(j); }
        else { s.clear(); s.add(j); }
        render(); return;
      }
      if (t.dataset.go !== undefined) { cur = +t.dataset.go; render(); return; }
      if (t.dataset.nav) { cur = Math.min(n - 1, Math.max(0, cur + +t.dataset.nav)); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (t.id === 'tCheck') {
        const unanswered = sel.filter(s => !s.size).length;
        if (unanswered) {
          App.modal(`<div class="m-emoji">🤔</div><h2>Не всі відповіді</h2><p>Ти ще не відповів(-ла) на ${unanswered} ${App.plural(unanswered, 'питання', 'питання', 'питань')}. Перевірити зараз?</p>
            <div class="m-actions"><button class="btn light" data-close>Повернутися</button><button class="btn ok" data-close id="mGo">Перевірити</button></div>`,
            (box) => box.querySelector('#mGo').addEventListener('click', () => finish(false)));
        } else finish(false);
      }
    });

    async function finish(auto) {
      if (done) return; done = true;
      clearInterval(timer);
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      const results = qs.map((q, i) => gradeQuestion(q, sel[i]));
      const sum = results.reduce((a, b) => a + b, 0);
      const score = Math.round(sum / n * C.maxScore);
      const passed = score >= C.passScore;
      const dur = Math.round(Math.min(elapsed(), total));
      const full = results.filter(r => r === 1).length;
      const stars = score >= 10 ? 3 : score >= 7 ? 2 : score >= 4 ? 1 : 0;
      hideMissed = !!opts.student && !passed;
      const canRetry = !opts.student || !passed;

      elTimer.classList.remove('low');
      body.innerHTML = `
        <div class="card result-card">
          <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
          <div class="score-big" style="color:${passed ? (score >= 10 ? 'var(--ok)' : score >= 7 ? '#C67700' : 'var(--warn)') : 'var(--bad)'}">${score}<small> / ${C.maxScore}</small></div>
          <h2>${!passed ? 'Тест не зараховано' : score >= 10 ? 'Чудово! 🎉' : score >= 7 ? 'Добре! 👍' : 'Зараховано'}</h2>
          <div class="result-stats">
            <span>✅ Повністю правильно: ${full} з ${n}</span>
            <span>⏱ Час: ${fmt(dur)}</span>
            ${auto ? '<span>⌛ Час вийшов — перевірено автоматично</span>' : ''}
          </div>
          <div class="m-actions" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            ${canRetry ? '<button class="btn brand" id="tAgain">🔄 Пройти ще раз</button>' : '<span class="btn done-btn">🔒 Тест зараховано</span>'}
            <a class="btn light" href="${opts.backHref}">До уроків</a>
          </div>
          <p class="muted" id="tSaved" style="margin-top:14px;font-weight:700">Зберігаємо результат…</p>
        </div>
        <h2 style="margin:8px 0 14px">Перевірка відповідей</h2>
        ${renderDots(results)}
        ${qs.map((q, i) => `<div id="rq${i}">${questionHtml(i, true, results[i])}</div>`).join('')}`;
      const again = body.querySelector('#tAgain'); if (again) again.addEventListener('click', () => opts.onRestart());
      body.querySelectorAll('.qdots button').forEach(b => b.addEventListener('click', () => {
        const el = body.querySelector('#rq' + b.dataset.go); el && el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const result = Object.assign({}, opts.meta, {
        score, passed, total: n, full, points: Math.round(sum * 100) / 100,
        durationSec: dur, auto: !!auto, leaves: Protect.leaves
      });
      try { await opts.onSave(result); const s = body.querySelector('#tSaved'); if (s) s.textContent = 'Результат збережено ✔'; }
      catch (e) { const s = body.querySelector('#tSaved'); if (s) { s.textContent = 'Не вдалося зберегти результат: ' + e.message; s.style.color = 'var(--bad)'; } }

      if (!passed) {
        App.modal(`<div class="m-emoji">😕</div><h2>Тест не зараховано</h2>
          <p>Ти отримав(-ла) <b>${score}</b> ${App.plural(score, 'бал', 'бали', 'балів')} з ${C.maxScore}. Для зарахування потрібно щонайменше ${C.passScore}.<br>Тест необхідно виконати ще раз.</p>
          <div class="m-actions"><button class="btn brand" data-close id="mRestart">Почати спочатку</button></div>`,
          (box) => box.querySelector('#mRestart').addEventListener('click', () => opts.onRestart()), { lock: true });
      }
    }

    render();
    timer = setInterval(tick, 250);
    tick();

    return {
      get active() { return !done; },
      destroy() { destroyed = true; clearInterval(timer); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
    };
  }

  window.TestEngine = { run, pick, shuffle };
})();
