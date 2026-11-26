/* =====================================================================
   Інтерактивні симуляції (власні, у стилі порталу)
   Сторінка симуляції: сцена (canvas/SVG) + панель керування + завдання.
   Типи симуляцій реєструються у бібліотеках js/sims/<lib>.js:
     Sims.reg('density', (stage, panel, cfg, api) => ({ destroy() {} }))
   Дані для курсів: data/sims/<course>.js
     window.SIMS_DATA['physics7'] = { 1: [{ type, title, intro, cfg, tasks }], … }
   ===================================================================== */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\^\{(.+?)\}/g, '<sup>$1</sup>').replace(/_\{(.+?)\}/g, '<sub>$1</sub>');
  const TYPES = {};
  const LIB_OF = { physics: 'phys', math: 'math', informatics: 'info', business: 'biz', histua: 'gen', histw: 'gen', histint: 'gen', geo: 'gen', civic: 'gen', law: 'gen', nature: 'nat' };

  /* ---------- допоміжні елементи керування ---------- */
  const fmt = (v, d = 2) => { if (v == null || isNaN(v)) return '—'; const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d); return String(r).replace('.', ','); };
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  const H = {
    esc, rt, fmt, el,
    /* повзунок */
    slider(parent, o, on) {
      const w = el('label', 'sim-ctl');
      const dec = o.dec != null ? o.dec : (String(o.step || 1).split('.')[1] || '').length;
      w.innerHTML = `<span class="sim-ctl-l">${rt(o.label)}</span><span class="sim-ctl-v"></span><input type="range" min="${o.min}" max="${o.max}" step="${o.step || 1}" value="${o.value}">`;
      const inp = w.querySelector('input'), v = w.querySelector('.sim-ctl-v');
      const show = () => { v.innerHTML = (o.fmt ? o.fmt(+inp.value) : fmt(+inp.value, dec)) + (o.unit ? ' ' + rt(o.unit) : ''); };
      inp.oninput = () => { show(); on && on(+inp.value); };
      show(); parent.appendChild(w);
      return { get: () => +inp.value, set: x => { inp.value = x; show(); }, el: w, input: inp };
    },
    /* випадний список */
    select(parent, o, on) {
      const w = el('label', 'sim-ctl');
      w.innerHTML = `<span class="sim-ctl-l">${rt(o.label)}</span><select>${o.options.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select>`;
      const s = w.querySelector('select'); if (o.value != null) s.value = o.value;
      s.onchange = () => on && on(s.value); parent.appendChild(w);
      return { get: () => s.value, set: x => { s.value = x; }, el: w };
    },
    /* група кнопок-перемикачів */
    seg(parent, o, on) {
      const w = el('div', 'sim-ctl');
      w.innerHTML = (o.label ? `<span class="sim-ctl-l">${rt(o.label)}</span>` : '') + `<div class="sim-seg">${o.options.map(([v, t]) => `<button type="button" data-v="${esc(v)}">${t}</button>`).join('')}</div>`;
      let cur = o.value;
      const paint = () => w.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(cur)));
      w.onclick = e => { const b = e.target.closest('button'); if (!b) return; cur = b.dataset.v; paint(); on && on(cur); };
      paint(); parent.appendChild(w);
      return { get: () => cur, set: x => { cur = x; paint(); }, el: w };
    },
    /* перемикач так/ні */
    check(parent, o, on) {
      const w = el('label', 'sim-ctl sim-chk'); w.innerHTML = `<input type="checkbox" ${o.value ? 'checked' : ''}> <span>${rt(o.label)}</span>`;
      const c = w.querySelector('input'); c.onchange = () => on && on(c.checked); parent.appendChild(w);
      return { get: () => c.checked, set: x => { c.checked = !!x; }, el: w };
    },
    /* кнопки дій */
    buttons(parent, list) {
      const w = el('div', 'sim-btns');
      list.forEach(([t, f, cls]) => { const b = el('button', 'btn sm ' + (cls || 'light'), t); b.type = 'button'; b.onclick = f; w.appendChild(b); });
      parent.appendChild(w); return w;
    },
    /* таблиця показів */
    readout(parent, title) {
      const w = el('div', 'sim-read'); if (title) w.appendChild(el('div', 'sim-read-t', rt(title)));
      const box = el('div', 'sim-read-g'); w.appendChild(box); parent.appendChild(w);
      return { set(rows) { box.innerHTML = rows.map(([k, v, cls]) => `<span class="k">${rt(k)}</span><b class="${cls || ''}">${v}</b>`).join(''); }, el: w };
    },
    note(parent, html, cls) { const n = el('div', 'sim-note ' + (cls || ''), html); parent.appendChild(n); return n; },
    /* полотно з урахуванням щільності пікселів; ширина підлаштовується під контейнер */
    canvas(parent, w, h) {
      const wrap = el('div', 'sim-cv'); const cv = el('canvas'); wrap.appendChild(cv); parent.appendChild(wrap);
      const ctx = cv.getContext('2d'); const st = { cv, ctx, W: w, H: h, k: 1 };
      const fit = () => { const cw = Math.min(wrap.clientWidth || w, w * 1.6); st.k = cw / w; const dpr = window.devicePixelRatio || 1;
        cv.width = Math.round(cw * dpr); cv.height = Math.round(h * st.k * dpr); cv.style.width = cw + 'px'; cv.style.height = (h * st.k) + 'px';
        ctx.setTransform(dpr * st.k, 0, 0, dpr * st.k, 0, 0); st.onfit && st.onfit(); };
      st.fit = fit; st.ro = new ResizeObserver(() => fit()); st.ro.observe(wrap); fit();
      /* координати миші в системі сцени */
      st.pos = e => { const r = cv.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: (t.clientX - r.left) / st.k, y: (t.clientY - r.top) / st.k }; };
      st.clear = (bg) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.restore(); if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); } };
      st.destroy = () => st.ro.disconnect();
      return st;
    },
    /* перетягування на полотні */
    drag(st, hit, move, end) {
      let on = false;
      const down = e => { const p = st.pos(e); if (hit(p)) { on = true; e.preventDefault(); } };
      const mv = e => { if (!on) return; e.preventDefault(); move(st.pos(e)); };
      const up = () => { if (on) { on = false; end && end(); } };
      st.cv.addEventListener('mousedown', down); st.cv.addEventListener('touchstart', down, { passive: false });
      window.addEventListener('mousemove', mv); window.addEventListener('touchmove', mv, { passive: false });
      window.addEventListener('mouseup', up); window.addEventListener('touchend', up);
      st.cv.style.cursor = 'grab';
      return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('touchmove', mv); window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up); };
    },
    /* цикл анімації з кроком у секундах */
    loop(fn) { let id = 0, last = performance.now(), on = true; const f = t => { if (!on) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; fn(dt); id = requestAnimationFrame(f); }; id = requestAnimationFrame(f); return () => { on = false; cancelAnimationFrame(id); }; },
    /* малювання */
    arrow(ctx, x1, y1, x2, y2, color, w = 3, label) {
      const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1); if (L < 2) return;
      ctx.save(); ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * 8, y2 - Math.sin(a) * 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - Math.cos(a - 0.45) * 12, y2 - Math.sin(a - 0.45) * 12); ctx.lineTo(x2 - Math.cos(a + 0.45) * 12, y2 - Math.sin(a + 0.45) * 12); ctx.closePath(); ctx.fill();
      if (label) { ctx.font = 'bold 13px Inter, sans-serif'; ctx.fillText(label, x2 + 6, y2 + (y2 > y1 ? 14 : -4)); }
      ctx.restore();
    },
    rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); },
    text(ctx, s, x, y, o = {}) { ctx.save(); ctx.font = `${o.bold ? '700 ' : ''}${o.size || 13}px Inter, system-ui, sans-serif`; ctx.fillStyle = o.color || '#1F2340'; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic'; ctx.fillText(s, x, y); ctx.restore(); },
    /* простий графік: осі + точки/лінії */
    plot(ctx, box, o) {
      const { x, y, w, h } = box; const xm = o.xmax, ym = o.ymax, x0 = o.xmin || 0, y0 = o.ymin || 0;
      const X = v => x + (v - x0) / (xm - x0) * w, Y = v => y + h - (v - y0) / (ym - y0) * h;
      ctx.save(); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = '#E3E1F7'; ctx.lineWidth = 1;
      const gx = o.gx || (xm - x0) / 5, gy = o.gy || (ym - y0) / 5;
      for (let v = x0; v <= xm + 1e-9; v += gx) { ctx.beginPath(); ctx.moveTo(X(v), y); ctx.lineTo(X(v), y + h); ctx.stroke(); H.text(ctx, fmt(v, 1), X(v), y + h + 14, { size: 10, align: 'center', color: '#6B6F8E' }); }
      for (let v = y0; v <= ym + 1e-9; v += gy) { ctx.beginPath(); ctx.moveTo(x, Y(v)); ctx.lineTo(x + w, Y(v)); ctx.stroke(); H.text(ctx, fmt(v, 1), x - 4, Y(v) + 3, { size: 10, align: 'right', color: '#6B6F8E' }); }
      ctx.strokeStyle = '#1F2340'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke();
      if (o.xl) H.text(ctx, o.xl, x + w, y + h + 28, { size: 11, align: 'right', bold: true });
      if (o.yl) H.text(ctx, o.yl, x + 2, y - 6, { size: 11, bold: true });
      (o.series || []).forEach(s => {
        ctx.strokeStyle = ctx.fillStyle = s.color || '#4F46E5'; ctx.lineWidth = s.w || 2.5;
        if (s.dots) s.pts.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(X(a), Y(b), 4, 0, 7); ctx.fill(); });
        else { ctx.beginPath(); s.pts.forEach(([a, b], i) => i ? ctx.lineTo(X(a), Y(b)) : ctx.moveTo(X(a), Y(b))); ctx.stroke(); }
      });
      ctx.restore(); return { X, Y };
    },
    rnd: (a, b, step = 1) => a + Math.floor(Math.random() * ((b - a) / step + 1)) * step,
    pick: a => a[Math.floor(Math.random() * a.length)],
    shuffle: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  };

  /* ---------- розбір числа у відповіді ---------- */
  function num(s) {
    s = String(s == null ? '' : s).replace(/[−–—]/g, '-').trim().replace(/\s*[a-zа-яіїєґ°%²³/·]+\.?\s*$/i, '').trim(); if (!s) return null;
    let m = s.match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/); if (m) { const v = +m[2] + m[3] / m[4]; return m[1] ? -v : v; }
    m = s.match(/^(-?\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)$/); if (m) return parseFloat(m[1].replace(',', '.')) / parseFloat(m[2].replace(',', '.'));
    s = s.replace(/\s+/g, '').replace(',', '.'); return /^-?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : NaN;
  }

  /* ---------- завдання до симуляції ---------- */
  function tasks(box, list, api) {
    if (!list || !list.length) return;
    box.innerHTML = `<h2 class="sim-h2">🎯 Завдання</h2><p class="muted sim-tip">Скористайся симуляцією, щоб знайти відповіді. Десяткові дроби пиши через кому.</p>` +
      list.map((t, i) => `<div class="card sim-task" data-i="${i}"><div class="sim-task-q"><span class="sim-task-n">${i + 1}</span><div>${rt(t.q)}</div></div>
        <div class="sim-task-a">${t.opts ? `<span class="sim-opts">${t.opts.map(o => `<label><input type="radio" name="st${i}" value="${esc(o)}"> ${rt(o)}</label>`).join('')}</span>`
          : `<input class="input" type="text" autocomplete="off" placeholder="відповідь">${t.u ? `<span class="sim-u">${rt(t.u)}</span>` : ''}`}
          <button class="btn brand sm" data-chk="${i}">Перевірити</button>${t.hint ? `<button class="btn light sm" data-hint="${i}">💡 Підказка</button>` : ''}</div>
        <div class="sim-task-r" hidden></div></div>`).join('');
    box.addEventListener('click', e => {
      const h = e.target.closest('[data-hint]'); if (h) { const t = list[+h.dataset.hint], r = h.closest('.sim-task').querySelector('.sim-task-r'); r.hidden = false; r.className = 'sim-task-r hint'; r.innerHTML = '💡 ' + rt(t.hint); return; }
      const b = e.target.closest('[data-chk]'); if (!b) return;
      const t = list[+b.dataset.chk], card = b.closest('.sim-task'), r = card.querySelector('.sim-task-r');
      const a = typeof t.a === 'function' ? t.a(api.state) : t.a;
      let ok;
      if (t.opts) { const c = card.querySelector('input:checked'); ok = !!c && c.value === a; }
      else { const v = num(card.querySelector('input').value), A = typeof a === 'number' ? a : num(a); const tol = t.tol != null ? t.tol : Math.max(Math.abs(A) * 0.02, 1e-9); ok = v != null && !isNaN(v) && Math.abs(v - A) <= tol; }
      r.hidden = false; r.className = 'sim-task-r ' + (ok ? 'ok' : 'bad');
      r.innerHTML = ok ? '✅ Правильно! ' + (t.ex ? rt(t.ex) : '') : `❌ Ще раз подумай.${t.ex ? ' <details><summary>Пояснення</summary>' + rt(t.ex) + (t.opts ? '' : ` Відповідь: <b>${typeof a === 'number' ? fmt(a, 3) : rt(a)}${t.u ? ' ' + rt(t.u) : ''}</b>`) + '</details>' : ''}`;
      card.classList.toggle('done', ok);
    });
  }

  /* ---------- сторінка симуляції ---------- */
  let current = null;
  async function open(root, o) {
    close();
    const libName = o.sim.lib || LIB_OF[(o.course.match(/^[a-z]+/) || [''])[0]] || 'phys';
    if (!TYPES[o.sim.type]) await o.loadScript(`js/sims/${libName}.js`).catch(() => null);
    if (!TYPES[o.sim.type]) await o.loadScript('js/sims/gen.js').catch(() => null);
    const fn = TYPES[o.sim.type]; if (!fn) throw new Error('Симуляцію не знайдено: ' + o.sim.type);
    root.innerHTML = `${o.crumbs || ''}
      <div class="card sim-head"><div><h1>🧪 ${esc(o.sim.title)}</h1><p class="muted">${esc(o.subtitle || '')}</p></div>${o.nav || ''}</div>
      ${o.sim.intro ? `<div class="sim-intro">${rt(o.sim.intro)}</div>` : ''}
      <div class="sim-wrap"><div class="card sim-stage"></div><div class="card sim-panel"></div></div>
      <div class="sim-tasks"></div>`;
    const api = { state: {}, H, esc, rt, fmt };
    const inst = fn(root.querySelector('.sim-stage'), root.querySelector('.sim-panel'), o.sim.cfg || {}, api) || {};
    current = inst;
    tasks(root.querySelector('.sim-tasks'), o.sim.tasks, api);
    return { get active() { return false; }, destroy: close };
  }
  function close() { if (current && current.destroy) { try { current.destroy(); } catch (e) { console.warn(e); } } current = null; }

  window.Sims = { reg: (t, f) => { TYPES[t] = f; }, open, close, H, has: t => !!TYPES[t] };
})();
