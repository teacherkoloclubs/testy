/* =====================================================================
   Тест «Префікси та одиниці вимірювання» (фізика 7–9 класів)
   — 10 вправ з різних фізичних величин, випадково щоразу;
   — 10 хвилин, можна завершити достроково, проходити необмежено;
   — оцінка: 2 + кількість правильних відповідей (0 → 2, 10 → 12);
   — до початку — таблиця префіксів, під час тесту вона недоступна;
   — після перевірки — детальне пояснення до кожної помилки.
   ===================================================================== */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\^\{(.+?)\}/g, '<sup>$1</sup>');
  const fmt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const D = () => window.UNITS_TEST;
  const TITLE = 'Префікси та одиниці вимірювання';
  const gradeOf = correct => 2 + correct;
  const gcls = v => v >= 10 ? 'g-hi' : v >= 7 ? 'g-mid' : v >= 4 ? 'g-avg' : 'g-lo';
  const fmtDate = ms => ms ? new Date(ms).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  /* ---------- вибір питань: 10 різних фізичних величин ---------- */
  function pick() {
    const bank = D().q, byCat = {};
    bank.forEach((q, i) => (byCat[q.cat] = byCat[q.cat] || []).push(i));
    return shuffle(Object.keys(byCat)).slice(0, D().count).map(c => { const l = byCat[c]; return l[Math.floor(Math.random() * l.length)]; });
  }

  /* ---------- розбір відповіді учня ---------- */
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };
  function parse(raw) {
    let s = String(raw || '').trim();
    if (!s) return null;
    s = s.replace(/10([⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (m, p) => '10^' + [...p].map(c => SUP[c]).join(''));
    s = s.replace(/[\s  ']/g, '').replace(/[−–—]/g, '-').replace(/,/g, '.')
      .replace(/[·×*⋅]|[xх](?=10)/gi, '*').replace(/\*\*/g, '^');
    s = s.replace(/[а-яіїєґ²³/]+[^]*$/i, '');           // одиниці в кінці («4500мН»)
    let m;
    if ((m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(?:e([+-]?\d+))?$/i))) return parseFloat(m[1]) * Math.pow(10, +(m[2] || 0));
    if ((m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+))\*10\^?\(?([+-]?\d+)\)?$/))) return parseFloat(m[1]) * Math.pow(10, +m[2]);
    if ((m = s.match(/^10\^\(?([+-]?\d+)\)?$/))) return Math.pow(10, +m[1]);
    return NaN;
  }
  const same = (x, a) => x != null && !isNaN(x) && Math.abs(x - a) <= Math.abs(a) * 1e-9 + 1e-15;

  const isPow10 = v => { const k = Math.log10(v); return Math.abs(k - Math.round(k)) < 1e-6; };
  /* підказка, у чому саме помилка */
  function diagnose(x, item) {
    if (x == null) return 'Відповіді немає — питання пропущено.';
    if (isNaN(x)) return 'Відповідь записано у формі, яку неможливо прочитати як число. Пиши, наприклад, **0,0045** або **4,5·10^-3**.';
    if (x <= 0) return 'Значення фізичної величини тут має бути додатним.';
    const r = x / item.a, k = Math.log10(r), kr = Math.round(k);
    const tips = [];
    if (Math.abs(k - kr) < 1e-6 && kr !== 0) {
      const n = Math.abs(kr);
      tips.push(`Твоя відповідь у **${n === 1 ? '10' : '10^{' + n + '}'}** ${kr > 0 ? 'разів більша' : 'разів менша'}, ніж правильна — помилка в кількості нулів (або переніс кому не в той бік чи не на стільки знаків).`);
      if (item.cat === 'area') tips.push('Пам’ятай: для **площі** множник префікса підносять до **квадрата** (1 м² = 10 000 см²).');
      if (item.cat === 'vol') tips.push('Пам’ятай: для **об’єму** множник підносять до **куба** (1 м³ = 1 000 000 см³).');
      if (item.cat === 'dens') tips.push('Пам’ятай: 1 г/см³ = **1000** кг/м³.');
    } else if (item.cat === 'speed' && (isPow10(r * 3.6) || isPow10(r / 3.6) || isPow10(r * 3.6 * 3.6) || isPow10(r / 3.6 / 3.6))) {
      tips.push('Схоже, переплутано множення й ділення на **3,6**: км/год → м/с — **ділимо** на 3,6; м/с → км/год — **множимо** на 3,6.');
    } else if ((item.cat === 'freq' || item.cat === 'time') && [60, 3600, 1 / 60, 1 / 3600].some(f => Math.abs(r / f - 1) < 1e-6)) {
      tips.push('Помилка в переведенні часу: у хвилині **60 с**, у годині **3600 с**.');
    }
    return tips.join(' ');
  }

  const prefixTable = () => `<div class="u-table-wrap"><table class="u-table">
    <thead><tr><th>Префікс</th><th>Значення в перекладі з грецької або латинської мови</th><th>Позначення</th><th colspan="2">Множник</th></tr></thead>
    <tbody>${D().prefixes.map(p => `<tr><td>${esc(p[0])}</td><td>${esc(p[1])}</td><td class="c"><b>${esc(p[2])}</b></td><td class="num">${esc(p[3])}</td><td class="num">${rt(p[4])}</td></tr>`).join('')}</tbody></table></div>`;

  /* ---------- статистика спроб (для учня й вчителя) ---------- */
  function stats(list) {
    const n = list.length, g = list.map(r => r.score);
    return { n, best: n ? Math.max(...g) : null, avg: n ? Math.round(g.reduce((a, b) => a + b, 0) / n * 10) / 10 : null, last: n ? list[0] : null };
  }
  function attemptsTable(list, withDel) {
    if (!list.length) return '<p class="muted" style="font-weight:700">Ще немає спроб.</p>';
    return `<div class="u-att"><table class="tbl"><thead><tr><th>№</th><th>Дата</th><th>Оцінка</th><th>Правильно</th><th>Час</th>${withDel ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map((r, i) => `<tr><td>${list.length - i}</td><td>${fmtDate(r.atMs)}</td><td><span class="grade ${gcls(r.score)}">${r.score}</span></td><td>${r.full ?? '—'} з ${r.total || 10}</td><td>${fmt(r.durationSec || 0)}${r.auto ? ' ⌛' : ''}</td>${withDel ? `<td><button class="btn sm light" data-udel="${esc(r.id)}" title="Видалити спробу">🗑</button></td>` : ''}</tr>`).join('')}
    </tbody></table></div>`;
  }

  /* =====================================================================
     intro(root, ctx): сторінка перед тестом
     ctx: { course, meta, student, crumbs, myResults(): Promise<[]>, statsHref, onStart() }
     ===================================================================== */
  async function intro(root, ctx) {
    const T = D();
    root.innerHTML = `${ctx.crumbs || ''}
      <div class="course-hero" style="--c:${ctx.meta.color || '#4F46E5'}"><div><h1>📏 ${TITLE}</h1>
        <p>${esc(ctx.meta.name)} · ${ctx.meta.cls} клас · тренувальний тест, який можна проходити скільки завгодно разів</p></div><div class="big-ico">📐</div></div>
      <div class="u-grid">
        <div class="card u-rules"><h2>📋 Правила</h2><ul>
          <li><b>${T.count} завдань</b> на переведення одиниць — щоразу нові й у новому порядку, кожне з іншої фізичної величини.</li>
          <li>На виконання — <b>${T.minutes} хвилин</b>. Можна завершити достроково.</li>
          <li>Оцінка: <b>2 бали + 1 бал</b> за кожну правильну відповідь (усі правильні — <b>12</b>).</li>
          <li>Відповідь вписуй числом: <b>0,0045</b> або <b>4,5·10^-3</b>.</li>
          <li>Під час тесту таблиця префіксів <b>недоступна</b> — повтори її зараз.</li>
          <li>Після перевірки до кожної помилки буде пояснення.</li></ul>
          <button class="btn brand" id="uStart" style="margin-top:14px">▶ Почати тест</button>
          ${ctx.statsHref ? `<a class="btn light" style="margin-top:14px" href="${ctx.statsHref}">📊 Статистика класу</a>` : ''}
        </div>
        <div class="card"><h2>🔁 Повтори префікси</h2>${prefixTable()}
          <p class="muted u-hint">Префікс показує, у скільки разів одиниця більша або менша за основну: <b>1 км = 10<sup>3</sup> м</b>, <b>1 мм = 10<sup>-3</sup> м</b>.
          Для площі множник підносять до квадрата (1 см² = 10<sup>-4</sup> м²), для об’єму — до куба (1 см³ = 10<sup>-6</sup> м³).</p></div>
      </div>
      ${ctx.student ? '<div class="card" id="uMine"><h2>📈 Мої спроби</h2><div class="loader"><span></span></div></div>' : ''}`;
    root.querySelector('#uStart').onclick = () => ctx.onStart();
    if (ctx.student) {
      const box = root.querySelector('#uMine');
      try {
        const list = (await ctx.myResults()).sort((a, b) => (b.atMs || 0) - (a.atMs || 0));
        const st = stats(list);
        box.innerHTML = `<h2>📈 Мої спроби</h2>
          <div class="u-kpi"><div><b>${st.n}</b><span>спроб</span></div><div><b class="${st.best != null ? gcls(st.best) : ''}">${st.best ?? '—'}</b><span>найкраща оцінка</span></div>
            <div><b>${st.avg ?? '—'}</b><span>середня</span></div><div><b>${st.last ? st.last.score : '—'}</b><span>остання</span></div></div>
          ${attemptsTable(list)}`;
      } catch (e) { box.innerHTML = `<h2>📈 Мої спроби</h2><p class="muted">Не вдалося завантажити: ${esc(e.message)}</p>`; }
    }
  }

  /* =====================================================================
     run(root, ctx): сам тест
     ctx: { course, meta, student, crumbs, onSave(result), onIntro(), backHref }
     ===================================================================== */
  function run(root, ctx) {
    const T = D(), ids = pick(), items = ids.map(i => T.q[i]), n = items.length;
    const total = T.minutes * 60, t0 = Date.now();
    const vals = items.map(() => '');
    let done = false, destroyed = false, timer = null;
    if (window.Protect) Protect.resetLeaves();

    root.innerHTML = `${ctx.crumbs || ''}
      <div class="card test-top"><h2>📏 ${TITLE}</h2><span class="tag" id="uLeft">Відповіді: 0 з ${n}</span>
        <div class="timer" id="tTimer"><div class="timer-ring" id="tRing"></div><span id="tTime">${fmt(total)}</span></div>
        <button class="btn ok sm" id="uFinish">✔ Завершити</button></div>
      <div id="uBody">
        <p class="muted u-hint" style="margin:0 0 14px">Впиши відповідь числом. Можна так: <b>0,00025</b> або <b>2,5·10^-4</b> (кнопка «·10ⁿ» допоможе). Одиницю вимірювання дописувати не потрібно.</p>
        ${items.map((q, i) => `<div class="card question u-q">
          <div class="q-head"><span class="q-num">Завдання ${i + 1} з ${n}</span><span class="q-type">${esc(T.cats[q.cat])}</span></div>
          <div class="q-text"><span>${rt(q.q)}</span></div>
          <div class="u-in"><input type="text" autocomplete="off" spellcheck="false" data-i="${i}" aria-label="Відповідь до завдання ${i + 1}">
            <button class="btn light sm" data-pow="${i}" title="Додати множник 10 у степені">·10ⁿ</button><span class="u-unit">${esc(q.u)}</span></div>
        </div>`).join('')}
        <div style="text-align:center;margin:10px 0 30px"><button class="btn ok" id="uFinish2">✔ Завершити й перевірити</button></div>
      </div>`;
    const body = root.querySelector('#uBody');
    const elTime = root.querySelector('#tTime'), elRing = root.querySelector('#tRing'), elTimer = root.querySelector('#tTimer');
    const elLeft = root.querySelector('#uLeft');
    const elapsed = () => (Date.now() - t0) / 1000;
    const answered = () => vals.filter(v => v.trim()).length;

    body.addEventListener('input', e => { const i = e.target.dataset.i; if (i == null) return; vals[+i] = e.target.value; elLeft.textContent = `Відповіді: ${answered()} з ${n}`; });
    body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.i != null) { const nx = body.querySelector(`input[data-i="${+e.target.dataset.i + 1}"]`); if (nx) nx.focus(); } });
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-pow]'); if (!b || done) return;
      const inp = body.querySelector(`input[data-i="${b.dataset.pow}"]`);
      if (!/·10\^/.test(inp.value)) inp.value = (inp.value.trim() || '1') + '·10^';
      inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const ask = () => {
      const left = n - answered();
      App.modal(`<div class="m-emoji">${left ? '🤔' : '✅'}</div><h2>Завершити тест?</h2><p>${left ? `Без відповіді ще ${left} ${App.plural(left, 'завдання', 'завдання', 'завдань')}.` : 'Усі відповіді вписано.'} Залишилось часу: ${fmt(total - elapsed())}.</p>
        <div class="m-actions"><button class="btn light" data-close>Повернутися</button><button class="btn ok" data-close id="mGo">Завершити</button></div>`,
        box => box.querySelector('#mGo').addEventListener('click', () => finish(false)));
    };
    root.querySelector('#uFinish').onclick = ask;
    body.querySelector('#uFinish2').onclick = ask;

    function tick() {
      if (done || destroyed) return;
      const left = total - elapsed();
      elTime.textContent = fmt(left);
      elRing.style.setProperty('--p', Math.max(0, left / total * 100));
      elTimer.classList.toggle('low', left <= 60);
      if (left <= 0) finish(true);
    }

    async function finish(auto) {
      if (done) return; done = true; clearInterval(timer);
      const dur = Math.round(Math.min(elapsed(), total));
      const parsed = vals.map(parse);
      const ok = items.map((q, i) => same(parsed[i], q.a));
      const correct = ok.filter(Boolean).length, score = gradeOf(correct);
      const fin = root.querySelector('#uFinish'); if (fin) fin.remove();
      elTimer.style.display = 'none'; elLeft.textContent = `Оцінка: ${score} / 12`;
      body.innerHTML = `
        <div class="card result-card">
          <div class="score-big" style="color:${score >= 10 ? 'var(--ok)' : score >= 7 ? '#C67700' : score >= 4 ? 'var(--warn)' : 'var(--bad)'}">${score}<small> / 12</small></div>
          <h2>${score >= 12 ? 'Бездоганно! 🏆' : score >= 10 ? 'Чудово! 🎉' : score >= 7 ? 'Добре! 👍' : 'Варто повторити префікси 📚'}</h2>
          <div class="result-stats"><span>✅ Правильно: ${correct} з ${n}</span><span>⏱ Час: ${fmt(dur)}</span>${auto ? '<span>⌛ Час вийшов — перевірено автоматично</span>' : ''}</div>
          <div class="m-actions" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn brand" id="uAgain">🔄 Пройти ще раз</button><a class="btn light" href="${ctx.backHref}">До предмета</a></div>
          <p class="muted" id="uSaved" style="margin-top:14px;font-weight:700">${ctx.student ? 'Зберігаємо результат…' : 'Пробне проходження вчителя — результат не зберігається.'}</p>
        </div>
        <h2 style="margin:8px 0 14px">Перевірка відповідей</h2>
        ${items.map((q, i) => {
          const tip = ok[i] ? '' : diagnose(parsed[i], q);
          return `<div class="card question u-q ${ok[i] ? 'u-ok' : 'u-bad'}">
            <div class="q-head"><span class="q-num">Завдання ${i + 1}</span><span class="q-type">${esc(T.cats[q.cat])}</span></div>
            <div class="q-text"><span>${rt(q.q)}</span></div>
            <div class="u-ans"><span>Твоя відповідь: <b>${vals[i].trim() ? esc(vals[i]) + ' ' + esc(q.u) : '—'}</b></span>${ok[i] ? '<span class="u-mark ok">✅ Правильно</span>' : `<span class="u-mark bad">❌ Неправильно</span><span>Правильно: <b>${rt(q.at)}</b></span>`}</div>
            ${ok[i] ? '' : `<div class="u-why"><b>Чому так:</b>${tip ? `<p class="u-tip">💡 ${rt(tip)}</p>` : ''}<ol>${q.ex.map(s => `<li>${rt(s)}</li>`).join('')}</ol></div>`}
          </div>`;
        }).join('')}
        <div style="text-align:center;margin:10px 0 30px"><button class="btn brand" id="uAgain2">🔄 Пройти ще раз</button></div>`;
      body.querySelectorAll('#uAgain,#uAgain2').forEach(b => (b.onclick = () => ctx.onIntro()));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (!ctx.student) return;
      const result = Object.assign({}, ctx.metaSave, {
        kind: 'units', testId: 'units', title: TITLE, score, passed: false, total: n, full: correct, points: correct,
        durationSec: dur, auto: !!auto, leaves: window.Protect ? Protect.leaves : 0,
        items: items.map((q, i) => ({ q: ids[i], v: vals[i].slice(0, 40), ok: ok[i] }))
      });
      const s = body.querySelector('#uSaved');
      try { await ctx.onSave(result); if (s) s.textContent = 'Результат збережено ✔'; }
      catch (e) { if (s) { s.textContent = 'Не вдалося зберегти результат: ' + e.message; s.style.color = 'var(--bad)'; } }
    }

    timer = setInterval(tick, 250); tick();
    const first = body.querySelector('input[data-i="0"]'); if (first) first.focus({ preventScroll: true });
    return {
      get active() { return !done; },
      destroy() { destroyed = true; clearInterval(timer); }
    };
  }

  window.UnitsTest = { intro, run, stats, attemptsTable, parse, same, TITLE, gcls, fmtDate, fmt };
})();
