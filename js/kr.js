/* =====================================================================
   Контрольні роботи з математики (5–6 класи)
   — математичний запис як у збірнику (дроби, мішані числа, степені);
   — поле для відповіді до кожного пункту, без обмеження часу;
   — перевірка з урахуванням різних форм запису числа;
   — до неправильних відповідей — детальний розв’язок;
   — завдання на побудову виконуються в зошиті (не оцінюються).
   ===================================================================== */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- математичний запис ---------- */
  const IT0 = '\u0001', IT1 = '\u0002';
  function splitTop(s) { let d = 0; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '(') d++; else if (c === ')') d--; else if (c === '/' && !d) return [s.slice(0, i), s.slice(i + 1)]; } return null; }
  const unwrap = s => { s = s.trim(); if (/^\(.*\)$/.test(s)) { let d = 0, ok = true; for (let i = 0; i < s.length; i++) { if (s[i] === '(') d++; else if (s[i] === ')') d--; if (!d && i < s.length - 1) { ok = false; break; } } if (ok) return s.slice(1, -1); } return s; };
  function frac(inner) {
    let m = inner.match(/^([−-]?)(\d+)\s+(.+\/.+)$/), sign = '', whole = '';
    if (m && splitTop(m[3])) { sign = m[1]; whole = m[2]; inner = m[3]; }
    else if ((m = inner.match(/^([−-])(.+)$/)) && splitTop(m[2])) { sign = m[1]; inner = m[2]; }
    const p = splitTop(inner); if (!p) return '{' + inner + '}';
    return `<span class="mx">${sign ? '−' : ''}${whole}<span class="fr"><span>${unwrap(p[0])}</span><span>${unwrap(p[1])}</span></span></span>`;
  }
  function md(s) {
    let t = esc(s);
    t = t.replace(/(^|[^A-Za-z&;#])([A-Za-z]{1,4})(?![A-Za-z])/g, (m, a, w) => /^(amp|lt|gt|quot)$/.test(w) ? m : a + IT0 + w + IT1);
    t = t.replace(/\{([^{}]+)\}/g, (m, x) => frac(x));
    t = t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\^\{(.+?)\}/g, '<sup>$1</sup>');
    return t.split(IT0).join('<i>').split(IT1).join('</i>');
  }
  /* відповідь у вигляді запису: «2 3/4» → {2 3/4} */
  function ansMd(a) {
    if (Array.isArray(a)) a = a[0];
    return md(String(a).split(';').map(x => { x = x.trim(); return /\d\s*\/\s*\d/.test(x) && !/[(:]/.test(x) ? '{' + x + '}' : x; }).join('; '));
  }

  /* ---------- розбір чисел ---------- */
  const norm = s => String(s == null ? '' : s).replace(/[−–—]/g, '-').replace(/ /g, ' ').trim();
  const stripUnit = s => s.replace(/\s*(см²|см³|дм²|дм³|м²|м³|км\/год|км|см|мм|дм|кг|грн|год|хв|га|г|т|ц|м|с|%|°)\s*$/i, '').trim();
  function num(s) {
    s = stripUnit(norm(s)); if (!s) return null;
    let m;
    if ((m = s.match(/^([+-]?)\s*(\d+)\s+(\d+)\s*\/\s*(\d+)$/))) { const v = +m[2] + m[3] / m[4]; return m[1] === '-' ? -v : v; }
    if ((m = s.match(/^([+-]?)\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/))) { const v = parseFloat(m[2].replace(',', '.')) / parseFloat(m[3].replace(',', '.')); return m[1] === '-' ? -v : v; }
    s = s.replace(/\s+/g, '').replace(',', '.');
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return parseFloat(s);
    return NaN;
  }
  const near = (x, a, tol) => x != null && !isNaN(x) && Math.abs(x - a) <= (tol || Math.max(1, Math.abs(a)) * 1e-9);
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const LAT = { 'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X' };
  const tok = s => { const v = num(s); return v != null && !isNaN(v) ? { n: v } : { s: norm(s).toUpperCase().replace(/[АВСЕНКМОРТХ]/g, c => LAT[c]).replace(/\s+/g, '') }; };
  const tokEq = (a, b) => a.n != null ? (b.n != null && near(b.n, a.n)) : a.s === b.s;
  const splitList = s => norm(s).split(/\s*;\s*/).map(x => x.trim()).filter(Boolean);

  /* вираз: перевірка рівносильності підстановкою випадкових чисел */
  function exprFn(s) {
    s = norm(s).toLowerCase().replace(/[·×∙•]/g, '*').replace(/,/g, '.').replace(/\s+/g, '').replace(/[а-я]/g, c => ({ 'а': 'a', 'в': 'b', 'с': 'c', 'х': 'x', 'у': 'y', 'р': 'p', 'к': 'k', 'м': 'm' }[c] || c));
    if (!s || /[^0-9a-z.+\-*/()]/.test(s)) return null;
    s = s.replace(/(\d|\))(?=[a-z(])/g, '$1*').replace(/([a-z])(?=[a-z(\d])/g, '$1*').replace(/\)(?=\()/g, ')*');
    const vars = [...new Set(s.match(/[a-z]/g) || [])];
    try { const f = new Function(...vars, 'return (' + s + ');'); return { f, vars }; } catch (e) { return null; }
  }
  function exprEq(u, a) {
    const A = exprFn(a), U = exprFn(u); if (!A || !U) return false;
    const vs = [...new Set(A.vars.concat(U.vars))];
    for (let k = 0; k < 4; k++) {
      const vals = {}; vs.forEach(v => (vals[v] = Math.round((Math.random() * 20 - 10) * 100) / 100 + 0.37));
      let x, y; try { x = A.f(...A.vars.map(v => vals[v])); y = U.f(...U.vars.map(v => vals[v])); } catch (e) { return false; }
      if (!isFinite(y) || Math.abs(x - y) > 1e-6 * Math.max(1, Math.abs(x))) return false;
    }
    return true;
  }
  /* розклад на прості множники: 2^5·3·11 */
  function factors(s) {
    const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
    s = norm(s).replace(/(\d)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (m, b, e) => b + '^' + [...e].map(c => SUP[c]).join('')).replace(/^\d+\s*=\s*/, '');
    const out = [];
    for (const p of s.split(/\s*[·*×xх∙•]\s*/i)) { const m = p.match(/^(\d+)(?:\^(\d+))?$/); if (!m) return null; for (let i = 0; i < +(m[2] || 1); i++) out.push(+m[1]); }
    return out.sort((a, b) => a - b).join(',');
  }
  function period(s) {
    const m = norm(s).replace(/\s+/g, '').match(/^(-?)(\d+)[.,](\d*)\((\d+)\)$/); if (!m) return null;
    const a = m[3], p = m[4], v = +m[2] + (a ? +a / Math.pow(10, a.length) : 0) + (+p) / (Math.pow(10, p.length) - 1) / Math.pow(10, a.length);
    return m[1] ? -v : v;
  }

  /* ---------- перевірка одного пункту ---------- */
  function check(type, u, p, task) {
    u = norm(u); if (!u) return false;
    const a = p.a;
    switch (type) {
      case 'sign': { const s = u.replace(/\s/g, '').replace('﹥', '>').replace('﹤', '<'); return s === a; }
      case 'choice': return u === a;
      case 'text': { const n = x => norm(x).toLowerCase().replace(/[\s.]/g, '').replace(/,/g, ''); return [].concat(a).some(x => n(x) === n(u)); }
      case 'set': case 'seq': {
        const A = splitList(a).map(tok), U = splitList(u).map(tok);
        if (type === 'seq') return A.length === U.length && A.every((t, i) => tokEq(t, U[i]));
        return U.length === A.length && A.every(t => U.some(x => tokEq(t, x))) && U.every(x => A.some(t => tokEq(t, x)));
      }
      case 'between': {
        const U = splitList(u).map(num); const cnt = task.cnt || 2;
        return U.length === cnt && U.every(x => x != null && !isNaN(x) && x > task.min + 1e-12 && x < task.max - 1e-12) && new Set(U.map(x => x.toFixed(9))).size === cnt;
      }
      case 'mixed': { const m = u.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/); return !!m && +m[2] < +m[3] && near(num(u), num(a)); }
      case 'irr': { const m = u.match(/^(-?\d+)\s*\/\s*(\d+)$/); return !!m && gcd(+m[1], +m[2]) === 1 && near(num(u), num(a)); }
      case 'expr': return exprEq(u, a);
      case 'prod': return factors(u) != null && factors(u) === factors(a);
      case 'point': { const g = s => { const m = norm(s).replace(/[()]/g, '').split(/\s*;\s*/); return m.length === 2 ? m.map(num) : null; }; const U = g(u), A = g(a); return !!U && near(U[0], A[0]) && near(U[1], A[1]); }
      case 'ratio': { const g = s => { const m = norm(s).replace(/\s/g, '').match(/^(\d+):(\d+)$/); return m ? [+m[1], +m[2]] : null; }; const U = g(u), A = g(a); return !!U && U[0] * A[1] === U[1] * A[0]; }
      case 'period': { const v = period(u); return v != null && near(v, period(a), 1e-9); }
      default: return near(num(u), num(a), p.tol);
    }
  }

  /* підказка, як записати відповідь */
  const HINT = {
    num: 'Число: 25 · десятковий дріб через кому: 0,7 · звичайний дріб: 5/9 · мішане число: 4 2/7 · від’ємне: −1,5',
    mixed: 'Мішане число: ціла частина, пропуск, дріб — наприклад, 5 2/7',
    irr: 'Нескоротний дріб через похилу риску, наприклад 5/9',
    sign: 'Обери знак порівняння',
    set: 'Кілька відповідей — через крапку з комою, наприклад: 3; 7; 1/2 (порядок не важливий)',
    seq: 'Числа по порядку через крапку з комою, наприклад: 10; 20; 30',
    between: 'Числа через крапку з комою, наприклад: 2,51; 2,55; 2,58',
    text: 'Запиши як у прикладі: 5 м 10 см',
    expr: 'Вираз з буквами, наприклад: 200 + y · 7ab · 4c − 15 (знак множення можна не писати)',
    prod: 'Добуток простих множників, наприклад: 2^3·5·7 або 2·2·2·5·7',
    point: 'Координати точки: (x; y), наприклад (−2; 3)',
    ratio: 'Відношення натуральних чисел, наприклад: 5 : 4',
    period: 'Період — у дужках, наприклад: 0,2(7)',
    choice: 'Обери одну відповідь'
  };
  const PH = { num: 'відповідь', mixed: 'ціле дріб', irr: 'а/б', set: 'а; б', seq: 'а; б; в', between: 'а; б', text: 'відповідь', expr: 'вираз', prod: 'множники', point: '(x; y)', ratio: 'а : б', period: '0,…(…)' };

  /* жива підказка: як зрозуміла програма введене число */
  function preview(type, u) {
    u = norm(u); if (!u) return '';
    if (['num', 'mixed', 'irr'].includes(type)) { const v = num(u); if (v == null || isNaN(v)) return '<span class="kr-bad">не схоже на число</span>'; return /\//.test(u) ? md('{' + stripUnit(u) + '}') : esc(stripUnit(u)); }
    if (type === 'set' || type === 'seq' || type === 'between') { const L = splitList(u); return L.length + ' ' + (L.length === 1 ? 'відповідь' : 'відповіді') + ': ' + L.map(x => /\//.test(x) ? md('{' + x + '}') : esc(x)).join('; '); }
    return '';
  }

  /* =====================================================================
     run(root, ctx) — сторінка однієї контрольної роботи
     ctx: { course, work, v, title, crumbs, student, onSave(result), backHref, otherHref }
     ===================================================================== */
  function run(root, ctx) {
    const tasks = ctx.work.v[ctx.v];
    let done = false;
    const fieldsHtml = (t, ti) => {
      if (t.manual) return `<div class="kr-manual">✏️ Виконай це завдання в зошиті. <button class="btn light sm" data-show="${ti}">Показати розв’язок</button></div>`;
      return `<div class="kr-parts">${t.parts.map((p, pi) => {
        const type = p.t || t.t || 'num', id = `k${ti}_${pi}`;
        const lab = p.l || p.q ? `<span class="kr-pl">${p.l ? md(p.l) : ''} ${p.q ? md(p.q) : ''}</span>` : '';
        const inp = type === 'choice'
          ? `<span class="kr-choice">${(t.opts || []).map(o => `<label><input type="radio" name="${id}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</span>`
          : type === 'sign' ? `<span class="kr-choice kr-sign">${['>', '<', '='].map(o => `<label><input type="radio" name="${id}" value="${o}"><b>${esc(o)}</b></label>`).join('')}</span>`
          : `<input class="kr-in" id="${id}" data-t="${type}" type="text" autocomplete="off" spellcheck="false" placeholder="${esc(PH[type] || '')}">${p.u ? `<span class="kr-u">${esc(p.u)}</span>` : ''}`;
        return `<div class="kr-part" data-k="${ti}_${pi}">${lab}<span class="kr-field">${p.x ? `<i>${p.x === true ? 'x' : esc(p.x)}</i> = ` : ''}${inp}</span><span class="kr-pv" id="pv${id}"></span><div class="kr-res" id="r${id}"></div></div>`;
      }).join('')}${[...new Set(t.parts.map(p => p.t || t.t || 'num'))].map(k => `<div class="kr-hint">💡 ${esc(HINT[k] || HINT.num)}</div>`).join('')}</div>`;
    };
    const table = t => t.table ? `<table class="kr-tbl">${t.table.map(r => `<tr>${r.map((c, i) => i ? `<td>${c === '?' ? '' : md(c)}</td>` : `<th>${md(c)}</th>`).join('')}</tr>`).join('')}</table>` : '';
    root.innerHTML = `${ctx.crumbs || ''}
      <div class="card kr-head"><div><h1>📝 Контрольна робота № ${ctx.work.n}</h1><p class="kr-topic">Тема. ${esc(ctx.work.topic)}</p><p class="muted">Варіант ${ctx.v} · ${tasks.length} завдань · без обмеження часу</p></div>
        <div class="kr-vsw">${[1, 2].filter(v => ctx.work.v[v]).map(v => `<a class="btn sm ${v === ctx.v ? 'brand' : 'light'}" href="${ctx.varHref(v)}">Варіант ${v}</a>`).join('')}</div></div>
      <details class="card kr-help"><summary>❓ Як записувати відповіді</summary><ul>
        <li>Десятковий дріб — через кому: <b>0,25</b>; від’ємне число — з мінусом: <b>−3,5</b> або <b>-3,5</b>.</li>
        <li>Звичайний дріб — через похилу риску: <b>5/9</b> → ${md('{5/9}')}; мішане число — ціла частина, пропуск, дріб: <b>4 2/7</b> → ${md('{4 2/7}')}.</li>
        <li>Кілька відповідей — через крапку з комою: <b>2; 5; 8</b>.</li>
        <li>Одиниці вимірювання вже підписані біля поля — дописувати їх не потрібно.</li>
        <li>Під полем видно, як програма зрозуміла твою відповідь.</li>
        <li>Позначка біля номера: ° — початковий і середній рівень, • — достатній, •• — високий. Завдання на побудову виконуються в зошиті й не оцінюються.</li></ul></details>
      <div id="krBody">${tasks.map((t, ti) => `<div class="card kr-task" id="kt${ti}">
          <div class="kr-q"><span class="kr-n">${t.n}.<sup>${esc(t.lv || '')}</sup></span><div><div class="kr-qt">${md(t.q)}</div>${table(t)}${t.fig ? `<img class="kr-fig" src="img/kr/${esc(t.fig)}.png" alt="Рисунок до завдання">` : ''}</div></div>
          ${fieldsHtml(t, ti)}<div class="kr-sol" id="ks${ti}" hidden></div></div>`).join('')}</div>
      <div class="kr-actions"><button class="btn ok" id="krCheck">✔ Перевірити</button></div>
      <div id="krRes"></div>`;
    const body = root.querySelector('#krBody');
    const solHtml = t => `<b>Розв’язання:</b><ul class="kr-sl">${t.sol.map(s => `<li>${md(s)}</li>`).join('')}</ul>`;
    body.addEventListener('input', e => { const i = e.target; if (!i.classList.contains('kr-in')) return; const pv = root.querySelector('#pv' + i.id); if (pv) pv.innerHTML = preview(i.dataset.t, i.value); });
    body.addEventListener('click', e => { const b = e.target.closest('[data-show]'); if (!b) return; const s = root.querySelector('#ks' + b.dataset.show); s.innerHTML = solHtml(tasks[+b.dataset.show]); s.hidden = !s.hidden; b.textContent = s.hidden ? 'Показати розв’язок' : 'Сховати розв’язок'; });
    const val = (ti, pi) => { const id = `k${ti}_${pi}`; const r = root.querySelector(`input[name="${id}"]:checked`); if (r) return r.value; const i = root.querySelector('#' + id); return i ? i.value : ''; };

    root.querySelector('#krCheck').onclick = () => {
      const empty = tasks.reduce((a, t, ti) => a + (t.manual ? 0 : t.parts.filter((p, pi) => !norm(val(ti, pi))).length), 0);
      const go = () => finish();
      if (empty) App.modal(`<div class="m-emoji">🤔</div><h2>Не всі відповіді</h2><p>Порожніх полів: ${empty}. Перевірити зараз?</p><div class="m-actions"><button class="btn light" data-close>Повернутися</button><button class="btn ok" data-close id="mGo">Перевірити</button></div>`, b => (b.querySelector('#mGo').onclick = go));
      else go();
    };

    async function finish() {
      if (done) return; done = true;
      let sum = 0, graded = 0; const items = [];
      tasks.forEach((t, ti) => {
        const box = root.querySelector('#kt' + ti);
        if (t.manual) return;
        graded++;
        let ok = 0;
        t.parts.forEach((p, pi) => {
          const type = p.t || t.t || 'num', u = val(ti, pi), good = check(type, u, p, t);
          if (good) ok++;
          items.push({ t: ti, p: pi, v: String(u).slice(0, 60), ok: good });
          const r = root.querySelector(`#rk${ti}_${pi}`);
          r.innerHTML = good ? '<span class="kr-ok">✅ Правильно</span>' : `<span class="kr-bad">❌ ${norm(u) ? 'Неправильно' : 'Немає відповіді'}</span> · правильна відповідь: <b class="kr-ans">${type === 'between' ? 'будь-які ' + (t.cnt || 2) + ' різні числа між ' + fmtB(t.min) + ' і ' + fmtB(t.max) + ', наприклад ' + ansMd(p.a) : ansMd(p.a)}${p.u ? ' ' + esc(p.u) : ''}</b>`;
          box.querySelector(`[data-k="${ti}_${pi}"]`).classList.add(good ? 'is-ok' : 'is-bad');
        });
        const sc = ok / t.parts.length; sum += sc;
        box.classList.add(sc === 1 ? 'kr-done-ok' : 'kr-done-bad');
        if (sc < 1) { const s = root.querySelector('#ks' + ti); s.innerHTML = solHtml(t); s.hidden = false; }
      });
      root.querySelectorAll('.kr-in, .kr-choice input').forEach(i => (i.disabled = true));
      let score = Math.max(1, Math.round(sum / graded * 12));
      if (score === 12 && sum < graded - 1e-9) score = 11; // 12 — лише за повністю правильну роботу
      const full = items.length ? tasks.filter((t, ti) => !t.manual && items.filter(x => x.t === ti).every(x => x.ok)).length : 0;
      root.querySelector('#krCheck').remove();
      const res = root.querySelector('#krRes');
      res.innerHTML = `<div class="card result-card"><div class="score-big" style="color:${score >= 10 ? 'var(--ok)' : score >= 7 ? '#C67700' : score >= 4 ? 'var(--warn)' : 'var(--bad)'}">${score}<small> / 12</small></div>
        <h2>${score >= 10 ? 'Чудово! 🎉' : score >= 7 ? 'Добре! 👍' : score >= 4 ? 'Непогано, але варто попрацювати' : 'Потрібно повторити тему 📚'}</h2>
        <div class="result-stats"><span>✅ Повністю правильно: ${full} з ${graded} завдань</span>${tasks.length > graded ? `<span>✏️ У зошиті: ${tasks.length - graded}</span>` : ''}</div>
        <p class="muted" style="font-weight:700">До неправильних відповідей нижче показано розв’язання.</p>
        <div class="m-actions" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn brand" id="krAgain">🔄 Пройти ще раз</button><a class="btn light" href="${ctx.backHref}">До списку контрольних</a></div>
        <p class="muted" id="krSaved" style="margin-top:12px;font-weight:700">${ctx.student ? 'Зберігаємо результат…' : 'Пробне проходження вчителя — результат не зберігається.'}</p></div>`;
      res.querySelector('#krAgain').onclick = () => { run(root, ctx); window.scrollTo(0, 0); };
      res.scrollIntoView({ behavior: 'smooth' });
      if (!ctx.student) return;
      const s = res.querySelector('#krSaved');
      try {
        await ctx.onSave({ kind: 'kr', testId: `kr${ctx.work.n}-v${ctx.v}`, krN: ctx.work.n, krV: ctx.v, title: `Контрольна робота № ${ctx.work.n} (варіант ${ctx.v})`,
          score, passed: false, total: graded, full, points: Math.round(sum * 100) / 100, items });
        s.textContent = 'Результат збережено ✔';
      } catch (e) { s.textContent = 'Не вдалося зберегти результат: ' + e.message; s.style.color = 'var(--bad)'; }
    }
    return { get active() { return false; }, destroy() {} };
  }
  function fmtB(x) { const f = [[-3 / 19, '{−3/19}'], [-2 / 19, '{−2/19}'], [-6 / 17, '{−6/17}'], [-5 / 17, '{−5/17}']].find(p => Math.abs(p[0] - x) < 1e-12); return f ? md(f[1]) : String(x).replace('.', ','); }

  window.KRTest = { run, md, check, num, ansMd };
})();
