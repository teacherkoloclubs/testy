/* =====================================================================
   ЛАБОРАТОРНІ РОБОТИ (віртуальні досліди за підручниками фізики 7–9 класів)
   Сторінка роботи: тема, мета, обладнання, теорія, хід роботи,
   віртуальна установка (сцена + керування), таблиця вимірювань
   (учень сам обчислює величини, система перевіряє), висновок, друк звіту.
   Опис робіт: js/labs/<course>.js →  Labs.reg('physics7', [ { n, lesson, sec, title, … } ])
   ===================================================================== */
(function () {
  const H = () => window.Sims.H;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\^\{(.+?)\}/g, '<sup>$1</sup>').replace(/_\{(.+?)\}/g, '<sub>$1</sub>').replace(/\n/g, '<br>');
  const fmt = (v, d = 2) => { if (v == null || !isFinite(v)) return '—'; const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d); return String(r).replace('.', ','); };
  const num = s => { s = String(s == null ? '' : s).replace(/[−–—]/g, '-').replace(/\s+/g, '').replace(',', '.'); return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : NaN; };
  const LIST = {};
  let current = null;

  function reg(course, list) { LIST[course] = list; }
  const list = course => LIST[course] || [];
  /* відповідь правильна, якщо відхилення ≤ 3 % (або ±1 одиниця останнього знака) */
  const close = (v, a, dec) => isFinite(v) && isFinite(a) && Math.abs(v - a) <= Math.max(Math.abs(a) * 0.03, 0.51 * Math.pow(10, -(dec == null ? 2 : dec)));
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;

  function open(root, course, n, o) {
    destroy();
    const L = list(course).find(x => +x.n === +n);
    if (!L) throw new Error('Лабораторну роботу не знайдено');
    const rows = [];
    const cols = L.cols || [], calc = L.calc || [];
    root.innerHTML = `${o.crumbs || ''}
      <div class="card sim-head lab-head"><div><span class="lab-badge">🔬 Лабораторна робота № ${L.n}</span><h1>${esc(L.title)}</h1><p class="muted">${esc(o.subtitle || '')}</p></div>${o.nav || ''}</div>
      <div class="lab-info">
        <div class="card pad"><h3>🎯 Мета</h3><p>${rt(L.aim)}</p>
          <h3>🧰 Обладнання</h3><ul>${(L.equip || []).map(x => `<li>${rt(x)}</li>`).join('')}</ul></div>
        <div class="card pad"><h3>📖 Теоретичні відомості</h3><div class="lab-theory">${(L.theory || []).map(x => /^f:/.test(x) ? `<div class="lab-f">${rt(x.slice(2).trim())}</div>` : `<p>${rt(x)}</p>`).join('')}</div></div>
      </div>
      <div class="card pad lab-steps"><h3>🪜 Хід роботи</h3><ol>${(L.steps || []).map(x => `<li>${rt(x)}</li>`).join('')}</ol>
        ${L.safety ? `<p class="lab-safe">⚠️ ${rt(L.safety)}</p>` : ''}</div>
      <h2 class="sim-h2">🧪 Віртуальна установка</h2>
      <div class="sim-wrap"><div class="card sim-stage"></div><div class="card sim-panel"></div></div>
      <h2 class="sim-h2" style="margin-top:18px">📋 Таблиця результатів</h2>
      <p class="muted sim-tip">Кнопка «📥 Записати в таблицю» на установці додає виміряні значення. ${calc.length ? 'Обчисли величини в білих клітинках самостійно (десяткові дроби — через кому) і натисни «Перевірити розрахунки».' : ''}</p>
      <div class="card lab-table-wrap"><div class="lab-table"></div>
        <div class="lab-tbtns"><button class="btn brand sm" data-lab="check" ${calc.length ? '' : 'hidden'}>✔ Перевірити розрахунки</button><button class="btn light sm" data-lab="show" ${calc.length ? '' : 'hidden'}>👁 Показати правильні</button><button class="btn light sm" data-lab="clear">🗑 Очистити таблицю</button></div>
        <div class="lab-tres"></div></div>
      <h2 class="sim-h2" style="margin-top:18px">🧠 Опрацювання та висновок</h2>
      <div class="lab-final"></div>
      <div class="card pad lab-concl"><h3>✍️ Висновок</h3><p class="muted" style="font-weight:600;margin-bottom:6px">${rt(L.conclusionHint || 'Запиши, що ти виміряв(ла), який результат отримав(ла) і чи досягнуто мети роботи. Поясни можливі причини похибок.')}</p>
        <textarea class="input lab-ta" rows="4" placeholder="Під час виконання роботи я…"></textarea>
        <div class="lab-tbtns"><button class="btn light sm" data-lab="sample">💡 Зразок висновку</button><button class="btn brand sm" data-lab="print">🖨 Звіт (друк / PDF)</button></div>
        <div class="lab-sample" hidden>${rt(L.sample || '')}</div></div>
      ${L.questions && L.questions.length ? `<div class="card pad lab-q"><h3>❓ Контрольні запитання</h3><ol>${L.questions.map(q => `<li>${rt(q)}</li>`).join('')}</ol></div>` : ''}
      ${L.creative ? `<div class="card pad lab-q"><h3>🎨 Творче завдання</h3><p>${rt(L.creative)}</p></div>` : ''}`;

    const tbl = root.querySelector('.lab-table'), tres = root.querySelector('.lab-tres'), fin = root.querySelector('.lab-final');
    const key = 'lab:' + course + ':' + L.n;
    try { const sv = JSON.parse(sessionStorage.getItem(key) || 'null'); if (sv) { (sv.rows || []).forEach(r => rows.push(r)); root.querySelector('.lab-ta').value = sv.concl || ''; } } catch (e) {}
    const save = () => { try { sessionStorage.setItem(key, JSON.stringify({ rows, concl: root.querySelector('.lab-ta').value })); } catch (e) {} };

    const right = (r, c) => c.f(r, rows);
    const drawTable = () => {
      const dc = L.maxRows || 8;
      tbl.innerHTML = `<table class="tbl tbl-compact lab-tbl"><thead><tr><th class="c">№</th>${cols.map(c => `<th class="c">${rt(c.name)}${c.unit ? `, ${rt(c.unit)}` : ''}</th>`).join('')}${calc.map(c => `<th class="c lab-calc-h">${rt(c.name)}${c.unit ? `, ${rt(c.unit)}` : ''}</th>`).join('')}<th></th></tr></thead><tbody>
        ${rows.length ? rows.map((r, i) => `<tr><td class="c">${i + 1}</td>${cols.map(c => `<td class="c"><b>${r[c.k] == null ? '—' : typeof r[c.k] === 'string' ? esc(r[c.k]) : fmt(r[c.k], c.dec)}</b></td>`).join('')}
          ${calc.map(c => `<td class="c"><input class="input lab-in" data-r="${i}" data-c="${c.k}" value="${esc(r['_' + c.k] || '')}" inputmode="decimal" autocomplete="off"></td>`).join('')}
          <td class="c"><button class="icon-btn" data-del="${i}" title="Видалити рядок">✕</button></td></tr>`).join('')
        : `<tr><td colspan="${cols.length + calc.length + 2}" class="empty" style="padding:18px">Ще немає вимірювань — проведи дослід на установці й натисни «📥 Записати в таблицю».</td></tr>`}
        </tbody></table>${rows.length >= dc ? `<p class="muted" style="font-size:13px;font-weight:700">Достатньо вимірювань (${dc}). Видаліть рядок, щоб додати новий.</p>` : ''}`;
      tbl.querySelectorAll('.lab-in').forEach(inp => inp.oninput = () => { rows[+inp.dataset.r]['_' + inp.dataset.c] = inp.value; inp.classList.remove('ok', 'bad'); save(); });
      tbl.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { rows.splice(+b.dataset.del, 1); save(); drawTable(); drawFinal(); });
    };
    const drawFinal = () => {
      const items = (L.final || []);
      if (!items.length) { fin.innerHTML = ''; return; }
      const need = L.minRows || 1;
      fin.innerHTML = rows.length < need ? `<div class="card pad muted" style="font-weight:700">Виконай щонайменше ${need} ${need === 1 ? 'вимірювання' : need < 5 ? 'вимірювання' : 'вимірювань'}, щоб опрацювати результати.</div>`
        : items.map((q, i) => `<div class="card sim-task" data-fi="${i}"><div class="sim-task-q"><span class="sim-task-n">${i + 1}</span><div>${rt(q.q)}</div></div>
          <div class="sim-task-a">${q.opts ? `<span class="sim-opts">${q.opts.map(x => `<label><input type="radio" name="lf${i}" value="${esc(x)}"> ${rt(x)}</label>`).join('')}</span>` : `<input class="input" autocomplete="off" inputmode="decimal" placeholder="відповідь">${q.u ? `<span class="sim-u">${rt(q.u)}</span>` : ''}`}
          <button class="btn brand sm" data-fchk="${i}">Перевірити</button></div><div class="sim-task-r" hidden></div></div>`).join('');
      fin.querySelectorAll('[data-fchk]').forEach(b => b.onclick = () => {
        const q = items[+b.dataset.fchk], card = b.closest('.sim-task'), r = card.querySelector('.sim-task-r');
        const a = typeof q.a === 'function' ? q.a(rows) : q.a; let ok;
        if (q.opts) { const c = card.querySelector('input:checked'); ok = !!c && c.value === a; }
        else ok = close(num(card.querySelector('input').value), a, q.dec);
        r.hidden = false; r.className = 'sim-task-r ' + (ok ? 'ok' : 'bad');
        r.innerHTML = ok ? '✅ Правильно! ' + (q.ex ? rt(q.ex) : '') : `❌ Перевір обчислення.${q.ex ? ' ' + rt(q.ex) : ''} <details><summary>Відповідь</summary><b>${q.opts ? rt(a) : fmt(a, q.dec == null ? 2 : q.dec)}${q.u ? ' ' + rt(q.u) : ''}</b></details>`;
        card.classList.toggle('done', ok);
      });
    };
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-lab]'); if (!b) return;
      const a = b.dataset.lab;
      if (a === 'check' || a === 'show') {
        let good = 0, all = 0;
        tbl.querySelectorAll('.lab-in').forEach(inp => { const r = rows[+inp.dataset.r], c = calc.find(x => x.k === inp.dataset.c), v = right(r, c);
          all++; if (a === 'show') { inp.value = fmt(v, c.dec); r['_' + c.k] = inp.value; }
          const ok = close(num(inp.value), v, c.dec); if (ok) good++; inp.classList.toggle('ok', ok); inp.classList.toggle('bad', !ok && inp.value !== ''); });
        save();
        tres.innerHTML = !all ? '' : a === 'show' ? '<div class="sim-note">Правильні значення підставлено. Спробуй самостійно в наступному рядку!</div>'
          : `<div class="sim-note ${good === all ? 'ok' : 'bad'}">${good === all ? '✅ Усі розрахунки правильні!' : `Правильно: ${good} з ${all}. Червоні клітинки — перевір формулу й одиниці (переведи в СІ!).`}</div>`;
      }
      if (a === 'clear') { rows.length = 0; save(); drawTable(); drawFinal(); tres.innerHTML = ''; }
      if (a === 'sample') { const s = root.querySelector('.lab-sample'); s.hidden = !s.hidden; }
      if (a === 'print') { document.body.classList.add('lab-printing'); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('lab-printing'), 400); }, 50); }
    });
    root.querySelector('.lab-ta').oninput = save;

    const api = {
      H: H(), rt, fmt, esc, state: {}, rows,
      record(r) {
        if (rows.length >= (L.maxRows || 8)) { api.toast('Таблиця заповнена. Видали рядок, щоб записати новий.'); return false; }
        rows.push(Object.assign({}, r)); save(); drawTable(); drawFinal();
        const last = tbl.querySelector('tbody tr:last-child'); if (last) { last.classList.add('lab-new'); }
        return true;
      },
      toast: o.toast || (m => alert(m))
    };
    const inst = L.bench(root.querySelector('.sim-stage'), root.querySelector('.sim-panel'), api) || {};
    current = inst;
    drawTable(); drawFinal();
    return { get active() { return false; }, destroy };
  }
  function destroy() { if (current && current.destroy) { try { current.destroy(); } catch (e) { console.warn(e); } } current = null; document.body.classList.remove('lab-printing'); }

  window.Labs = { reg, list, open, destroy, mean, fmt, has: c => !!(LIST[c] && LIST[c].length) };
})();
