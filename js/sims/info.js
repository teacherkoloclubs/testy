/* Симуляції з інформатики (2–9 класи) */
(function () {
  const { reg, H } = window.Sims;
  const { fmt, text, arrow, rrect, esc, el } = H;
  const C = { ink: '#1F2340', mute: '#6B6F8E', brand: '#4F46E5', blue: '#2563EB', red: '#E5484D', green: '#16A34A', orange: '#F59E0B', pink: '#EC4899', soft: '#EEF0FF', sky: '#F4F7FF' };
  const css = (id, s) => { if (document.getElementById(id)) return; const t = document.createElement('style'); t.id = id; t.textContent = s; document.head.appendChild(t); };

  /* =============== Класифікація: розклади картки по кошиках =============== */
  css('sim-css-cls', `.cls-pool{display:flex;flex-wrap:wrap;gap:8px;min-height:60px;padding:10px;border:2px dashed #D9D6F5;border-radius:14px;margin-bottom:12px;background:#FBFAFF}
  .cls-card{padding:8px 12px;border-radius:12px;background:#fff;border:2px solid #DAD7F5;font-weight:700;cursor:grab;user-select:none;touch-action:none;font-size:14px;box-shadow:0 2px 0 #E6E3FA}
  .cls-card.sel{border-color:var(--brand,#4F46E5);background:#EEF0FF}.cls-card.ok{border-color:#16A34A;background:#E7F8EF}.cls-card.bad{border-color:#E5484D;background:#FDECEC}
  .cls-bins{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
  .cls-bin{border:2px solid #DAD7F5;border-radius:14px;padding:8px;min-height:120px;background:#fff;transition:background .15s}.cls-bin.hov{background:#EEF0FF;border-color:var(--brand,#4F46E5)}
  .cls-bin h4{margin:0 0 6px;font-size:14px;text-align:center}.cls-bin .cls-in{display:flex;flex-wrap:wrap;gap:6px}`);
  reg('classify', (stage, panel, cfg, api) => {
    const bins = cfg.bins, items = cfg.items.map((x, i) => ({ ...x, i }));
    let where = {}, sel = null, checked = false;
    const box = el('div'); stage.appendChild(box);
    const render = () => {
      const card = it => `<div class="cls-card ${sel === it.i ? 'sel' : ''} ${checked && where[it.i] ? (where[it.i] === it.b ? 'ok' : 'bad') : ''}" data-i="${it.i}">${it.e ? it.e + ' ' : ''}${esc(it.t)}</div>`;
      box.innerHTML = `<div class="cls-pool" data-bin="">${order.filter(it => !where[it.i]).map(card).join('') || '<span class="muted">Усі картки розкладено ✔</span>'}</div>
        <div class="cls-bins">${bins.map(b => `<div class="cls-bin" data-bin="${b.id}"><h4>${b.e || ''} ${esc(b.t)}</h4><div class="cls-in">${order.filter(it => where[it.i] === b.id).map(card).join('')}</div></div>`).join('')}</div>`;
      const placed = Object.keys(where).length, ok = items.filter(it => where[it.i] === it.b).length;
      api.state = { placed, ok, total: items.length };
      read.set([['Розкладено', `${placed} з ${items.length}`], ['Правильно', checked ? `${ok} з ${items.length}` : 'натисни «Перевірити»']]);
      if (checked && ok === items.length) note.className = 'sim-note ok', note.innerHTML = '🎉 Усе правильно! Чудова робота.';
    };
    let order = H.shuffle(items);
    const put = (i, b) => { if (b) where[i] = b; else delete where[i]; sel = null; checked = false; note.className = 'sim-note'; note.innerHTML = cfg.note || 'Перетягни картку в потрібний кошик або натисни на картку, а потім — на кошик.'; render(); };
    /* перетягування вказівником */
    let drag = null;
    box.addEventListener('pointerdown', e => { const c = e.target.closest('.cls-card'); if (!c) return; drag = { i: +c.dataset.i, el: c, x: e.clientX, y: e.clientY, moved: false }; c.setPointerCapture(e.pointerId); });
    box.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 6) drag.moved = true; if (drag.moved) { drag.el.style.transform = `translate(${dx}px,${dy}px)`; drag.el.style.zIndex = 5; drag.el.style.position = 'relative';
      box.querySelectorAll('.cls-bin').forEach(b => b.classList.remove('hov')); drag.el.style.pointerEvents = 'none'; const t = document.elementFromPoint(e.clientX, e.clientY); drag.el.style.pointerEvents = ''; const bin = t && t.closest('[data-bin]'); if (bin && bin.classList.contains('cls-bin')) bin.classList.add('hov'); } });
    box.addEventListener('pointerup', e => { if (!drag) return; const d = drag; drag = null;
      if (d.moved) { d.el.style.pointerEvents = 'none'; const t = document.elementFromPoint(e.clientX, e.clientY); const bin = t && t.closest('[data-bin]'); if (bin) put(d.i, bin.dataset.bin); else render(); }
      else { sel = sel === d.i ? null : d.i; render(); } });
    box.addEventListener('click', e => { if (sel == null || e.target.closest('.cls-card')) return; const bin = e.target.closest('[data-bin]'); if (bin) put(sel, bin.dataset.bin); });
    H.buttons(panel, [['✔ Перевірити', () => { checked = true; render(); }, 'brand'], ['🔀 Почати знову', () => { where = {}; order = H.shuffle(items); checked = false; render(); }]]);
    const read = H.readout(panel, 'Результат');
    const note = H.note(panel, cfg.note || 'Перетягни картку в потрібний кошик або натисни на картку, а потім — на кошик.');
    render();
    return { destroy() {} };
  });

  /* =============== Робот на клітчастому полі =============== */
  const DIRS = { U: [0, -1, '⬆'], D: [0, 1, '⬇'], L: [-1, 0, '⬅'], R: [1, 0, '➡'] };
  css('sim-css-robot', `.rb-prog{display:flex;flex-wrap:wrap;gap:4px;min-height:44px;padding:8px;border-radius:12px;background:#F7F6FF;font-weight:800;font-size:18px;align-items:center}
  .rb-prog span{background:#fff;border:2px solid #DAD7F5;border-radius:8px;padding:2px 6px}.rb-prog span.rep{border-color:#F59E0B;color:#B45309;font-size:14px}.rb-prog span.cur{background:#FDE68A}
  .rb-cmd{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.rb-cmd button{font-size:18px}`);
  reg('robot', (stage, panel, cfg, api) => {
    const levels = cfg.levels; let li = 0, prog = [], pos, run = null, msg = '', trail = [];
    const st = H.canvas(stage, 520, 420);
    const L = () => levels[li];
    const isWall = (x, y) => (L().walls || []).some(w => w[0] === x && w[1] === y);
    const bfs = () => { const lv = L(), q = [[lv.start[0], lv.start[1], 0]], seen = new Set([lv.start.join()]); while (q.length) { const [x, y, d] = q.shift(); if (x === lv.goal[0] && y === lv.goal[1]) return d;
      for (const k in DIRS) { const nx = x + DIRS[k][0], ny = y + DIRS[k][1]; if (nx < 0 || ny < 0 || nx >= lv.w || ny >= lv.h || isWall(nx, ny) || seen.has(nx + ',' + ny)) continue; seen.add(nx + ',' + ny); q.push([nx, ny, d + 1]); } } return -1; };
    const flat = p => { const out = []; let i = 0; const walk = (arr) => arr.forEach(t => { if (t.rep) for (let k = 0; k < t.rep; k++) walk(t.body); else out.push(t); }); walk(p); void i; return out; };
    const reset = () => { if (run) { clearInterval(run); run = null; } pos = [...L().start]; trail = [[...pos]]; msg = ''; draw(); };
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const lv = L(), S = Math.min(400 / lv.w, 380 / lv.h), X0 = (520 - S * lv.w) / 2, Y0 = 20;
      for (let x = 0; x < lv.w; x++) for (let y = 0; y < lv.h; y++) { ctx.fillStyle = (x + y) % 2 ? '#F4F3FF' : '#FBFAFF'; ctx.fillRect(X0 + x * S, Y0 + y * S, S, S); }
      ctx.strokeStyle = '#DAD7F5'; ctx.lineWidth = 1; for (let x = 0; x <= lv.w; x++) { ctx.beginPath(); ctx.moveTo(X0 + x * S, Y0); ctx.lineTo(X0 + x * S, Y0 + lv.h * S); ctx.stroke(); } for (let y = 0; y <= lv.h; y++) { ctx.beginPath(); ctx.moveTo(X0, Y0 + y * S); ctx.lineTo(X0 + lv.w * S, Y0 + y * S); ctx.stroke(); }
      (lv.walls || []).forEach(([x, y]) => { ctx.fillStyle = '#8B95A8'; rrect(ctx, X0 + x * S + 3, Y0 + y * S + 3, S - 6, S - 6, 6); ctx.fill(); text(ctx, '🧱', X0 + x * S + S / 2, Y0 + y * S + S / 2 + 7, { align: 'center', size: S * 0.45 }); });
      ctx.strokeStyle = 'rgba(79,70,229,.35)'; ctx.lineWidth = 5; ctx.beginPath(); trail.forEach((p, i) => { const x = X0 + p[0] * S + S / 2, y = Y0 + p[1] * S + S / 2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      text(ctx, lv.goalE || '⭐', X0 + lv.goal[0] * S + S / 2, Y0 + lv.goal[1] * S + S / 2 + S * 0.18, { align: 'center', size: S * 0.55 });
      text(ctx, lv.hero || '🤖', X0 + pos[0] * S + S / 2, Y0 + pos[1] * S + S / 2 + S * 0.18, { align: 'center', size: S * 0.6 });
      const min = bfs(); api.state = { minSteps: min, len: flat(prog).length, level: li + 1, ok: pos[0] === lv.goal[0] && pos[1] === lv.goal[1] };
      progEl.innerHTML = prog.length ? prog.map(t => t.rep ? `<span class="rep">🔁 ${t.rep} × [ ${t.body.map(b => DIRS[b.d][2]).join(' ')} ]</span>` : `<span>${DIRS[t.d][2]}</span>`).join('') : '<span class="muted" style="border:0;background:none;font-size:13px">Склади програму з команд нижче</span>';
      read.set([['Рівень', `${li + 1} з ${levels.length}`], ['Команд у програмі', prog.reduce((a, t) => a + (t.rep ? 1 + t.body.length : 1), 0)], ['Кроків робота', flat(prog).length], ['Стан', msg || '—']]);
    };
    const step = (list, k) => { if (k >= list.length) { clearInterval(run); run = null; const lv = L(); msg = pos[0] === lv.goal[0] && pos[1] === lv.goal[1] ? '✅ Мету досягнуто!' : '❌ Робот не дійшов до мети'; draw(); return; }
      const [dx, dy] = DIRS[list[k].d], nx = pos[0] + dx, ny = pos[1] + dy, lv = L();
      if (nx < 0 || ny < 0 || nx >= lv.w || ny >= lv.h || isWall(nx, ny)) { clearInterval(run); run = null; msg = '💥 Перешкода! Виправ алгоритм.'; draw(); return; }
      pos = [nx, ny]; trail.push([...pos]); draw(); };
    const go = () => { reset(); const list = flat(prog); let k = 0; run = setInterval(() => step(list, k++), 380); };
    let repOpen = null;
    const add = d => { if (repOpen) repOpen.body.push({ d }); else prog.push({ d }); reset(); };
    H.select(panel, { label: 'Рівень', options: levels.map((l, i) => [String(i), `${i + 1}. ${l.name || ''}`]), value: '0' }, v => { li = +v; prog = []; repOpen = null; reset(); });
    const progEl = el('div', 'rb-prog'); panel.appendChild(progEl);
    const cmd = el('div', 'rb-cmd'); panel.appendChild(cmd);
    ['U', 'D', 'L', 'R'].forEach(d => { const b = el('button', 'btn light sm', DIRS[d][2]); b.type = 'button'; b.onclick = () => add(d); cmd.appendChild(b); });
    if (cfg.repeat !== false) { const rs = H.select(panel, { label: 'Цикл «Повтори»', options: [['2', 'повтори 2 рази'], ['3', 'повтори 3 рази'], ['4', 'повтори 4 рази'], ['5', 'повтори 5 разів']], value: '2' });
      H.buttons(panel, [['🔁 Почати цикл', () => { if (!repOpen) { repOpen = { rep: +rs.get(), body: [] }; prog.push(repOpen); reset(); } }], ['⏹ Кінець циклу', () => { repOpen = null; draw(); }]]); }
    H.buttons(panel, [['▶ Виконати', go, 'brand'], ['⌫ Стерти останню', () => { const t = prog[prog.length - 1]; if (t && t.rep && t.body.length && repOpen === t) t.body.pop(); else { prog.pop(); repOpen = null; } reset(); }], ['🧹 Очистити', () => { prog = []; repOpen = null; reset(); }]]);
    const read = H.readout(panel, 'Виконавець');
    H.note(panel, cfg.note || 'Склади <b>алгоритм</b> — послідовність команд, щоб робот дійшов до зірочки, оминаючи стіни. Цикл «Повтори» скорочує запис однакових команд.');
    reset();
    return { destroy: () => { if (run) clearInterval(run); st.destroy(); } };
  });

  /* =============== Черепашка: малювання командами =============== */
  const TURTLE_PRESETS = [['Квадрат', 'повтори 4 [ вперед 120 праворуч 90 ]'], ['Трикутник', 'повтори 3 [ вперед 140 праворуч 120 ]'], ['Шестикутник', 'повтори 6 [ вперед 80 праворуч 60 ]'], ['Зірка', 'повтори 5 [ вперед 160 праворуч 144 ]'], ['Сходинки', 'повтори 4 [ вперед 40 праворуч 90 вперед 40 ліворуч 90 ]'], ['Квітка (вкладені цикли)', 'повтори 8 [ повтори 4 [ вперед 70 праворуч 90 ] праворуч 45 ]'], ['Коло', 'повтори 36 [ вперед 12 праворуч 10 ]']];
  reg('turtle', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 520, 440); let segs = [], k = 0, anim = null, info = { path: 0, turn: 0, err: '' }, color = C.brand;
    const parse = src => { const tk = src.replace(/\[/g, ' [ ').replace(/\]/g, ' ] ').trim().split(/\s+/).filter(Boolean); let i = 0;
      const block = () => { const out = []; while (i < tk.length && tk[i] !== ']') { const w = tk[i++].toLowerCase();
        const n = () => { const v = parseFloat(tk[i++]); if (isNaN(v)) throw new Error('Після команди «' + w + '» потрібне число'); return v; };
        if (/^впер|^fd|^forward/.test(w)) out.push(['f', n()]); else if (/^наз|^bk|^back/.test(w)) out.push(['f', -n()]);
        else if (/^прав|^rt|^right/.test(w)) out.push(['t', n()]); else if (/^лів|^lt|^left/.test(w)) out.push(['t', -n()]);
        else if (/^повт|^repeat/.test(w)) { const c = n(); if (tk[i++] !== '[') throw new Error('Після «повтори N» потрібна дужка ['); const b = block(); if (tk[i++] !== ']') throw new Error('Не закрито дужку ]'); out.push(['r', c, b]); }
        else if (/^підн|^pu/.test(w)) out.push(['u']); else if (/^опуст|^pd/.test(w)) out.push(['d']);
        else throw new Error('Невідома команда: «' + w + '»'); } return out; };
      const r = block(); if (i < tk.length) throw new Error('Зайва дужка ]'); return r; };
    const runProg = () => { segs = []; info = { path: 0, turn: 0, err: '' }; let x = 260, y = 260, a = -90, pen = true, cnt = 0;
      try { const exec = list => list.forEach(c => { if (++cnt > 5000) throw new Error('Забагато команд'); if (c[0] === 'f') { const nx = x + Math.cos(a * Math.PI / 180) * c[1], ny = y + Math.sin(a * Math.PI / 180) * c[1]; segs.push([x, y, nx, ny, pen]); info.path += Math.abs(c[1]); x = nx; y = ny; }
        else if (c[0] === 't') { a += c[1]; info.turn += c[1]; } else if (c[0] === 'u') pen = false; else if (c[0] === 'd') pen = true; else for (let q = 0; q < c[1]; q++) exec(c[2]); });
        exec(parse(ta.value)); } catch (e) { info.err = e.message; }
      info.end = [x, y, a]; k = 0; if (anim) anim(); anim = H.loop(() => { k = Math.min(segs.length, k + Math.max(1, Math.round(segs.length / 120)) * spd); draw(); if (k >= segs.length) { anim(); anim = null; } }); };
    const draw = () => { const { ctx } = st; st.clear('#fff'); ctx.strokeStyle = '#F0EEFB'; ctx.lineWidth = 1; for (let g = 0; g <= 520; g += 40) { ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, 440); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(520, g); ctx.stroke(); }
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round'; segs.slice(0, k).forEach(s => { if (!s[4]) return; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); });
      let tx = 260, ty = 260, ta2 = -90; if (k && segs[k - 1]) { tx = segs[k - 1][2]; ty = segs[k - 1][3]; } if (k >= segs.length && info.end) ta2 = info.end[2];
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(ta2 * Math.PI / 180); ctx.fillStyle = C.green; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.restore();
      if (info.err) text(ctx, '⚠ ' + info.err, 260, 425, { align: 'center', bold: true, color: C.red });
      api.state = { path: info.path, turn: info.turn };
      read.set([['Довжина шляху', fmt(info.path, 0) + ' кроків'], ['Сума поворотів', fmt(info.turn, 0) + '°'], ['Відрізків', segs.length]]); };
    let spd = 1;
    H.select(panel, { label: 'Готові програми', options: (cfg.presets || TURTLE_PRESETS).map((p, i) => [String(i), p[0]]), value: '0' }, v => { ta.value = (cfg.presets || TURTLE_PRESETS)[+v][1]; runProg(); });
    const lab = el('label', 'sim-ctl'); lab.innerHTML = '<span class="sim-ctl-l">Програма для черепашки</span>'; const ta = el('textarea', 'input'); ta.rows = 4; ta.style.gridColumn = '1 / -1'; ta.style.fontFamily = 'ui-monospace, monospace'; ta.style.fontSize = '14px'; ta.value = (cfg.presets || TURTLE_PRESETS)[0][1]; lab.appendChild(ta); panel.appendChild(lab);
    H.seg(panel, { label: 'Колір', options: [['#4F46E5', '🟣'], ['#E5484D', '🔴'], ['#16A34A', '🟢'], ['#F59E0B', '🟠']], value: '#4F46E5' }, v => { color = v; draw(); });
    H.seg(panel, { label: 'Швидкість', options: [['1', 'повільно'], ['4', 'швидко']], value: '1' }, v => { spd = +v; });
    H.buttons(panel, [['▶ Виконати', runProg, 'brand']]);
    const read = H.readout(panel, 'Черепашка');
    H.note(panel, 'Команди: <b>вперед N</b>, <b>назад N</b>, <b>праворуч A</b>, <b>ліворуч A</b>, <b>повтори N [ … ]</b>, <b>підняти</b>/<b>опустити</b> (перо). Щоб намалювати правильний n-кутник, поворот = 360° : n.');
    runProg();
    return { destroy: () => { if (anim) anim(); st.destroy(); } };
  });

  /* =============== Растрове зображення: пікселі, палітра, заливка =============== */
  const PAL = { 2: ['#FFFFFF', '#1F2340'], 4: ['#FFFFFF', '#1F2340', '#E5484D', '#2563EB'], 16: ['#FFFFFF', '#1F2340', '#E5484D', '#F59E0B', '#FDE047', '#16A34A', '#22D3EE', '#2563EB', '#7C3AED', '#EC4899', '#A16207', '#9CA3AF', '#86EFAC', '#FCA5A5', '#BFDBFE', '#000000'] };
  const PIC = { 'будиночок (з розривом)': ['................', '.......11.......', '......1..1......', '.....1....1.....', '....1......1....', '...1........1...', '..111111111111..', '...1........1...', '...1..11....1...', '...1..11....1...', '...1........1...', '...1...111..1...', '...1...1.1..1...', '...1...1.1......', '...11111111111..', '................'], 'серце': ['................', '................', '...111....111...', '..1...1..1...1..', '.1.....11.....1.', '.1............1.', '.1............1.', '..1..........1..', '...1........1...', '....1......1....', '.....1....1.....', '......1..1......', '.......11.......', '................', '................', '................'] };
  reg('pixels', (stage, panel, cfg, api) => {
    const N = 16, st = H.canvas(stage, 420, 420); let pal = cfg.palette || 4, grid, cur = 1, tool = 'pen', paint = false, showGrid = true;
    const load = name => { grid = PIC[name].map(r => [...r].map(c => c === '1' ? 1 : 0)); draw(); };
    const S = 400 / N, X0 = 10;
    const draw = () => { const { ctx } = st; st.clear('#fff'); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ctx.fillStyle = PAL[pal][grid[y][x] % PAL[pal].length]; ctx.fillRect(X0 + x * S, X0 + y * S, S, S); }
      if (showGrid) { ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 1; for (let i = 0; i <= N; i++) { ctx.beginPath(); ctx.moveTo(X0 + i * S, X0); ctx.lineTo(X0 + i * S, X0 + 400); ctx.stroke(); ctx.beginPath(); ctx.moveTo(X0, X0 + i * S); ctx.lineTo(X0 + 400, X0 + i * S); ctx.stroke(); } }
      const bpp = Math.log2(pal), used = new Set(grid.flat()).size, bits = N * N * bpp;
      api.state = { bpp, bits, bytes: bits / 8, used, pix: N * N };
      read.set([['Розмір', `${N} × ${N} = ${N * N} пікселів`], ['Кольорів у палітрі', pal + ` → ${bpp} біт на піксель`], ['Обсяг зображення', `${bits} біт = ${bits / 8} байт`], ['Використано кольорів', used]]); palBox(); };
    const fill = (x, y, from, to) => { if (from === to) return; const q = [[x, y]]; while (q.length) { const [a, b] = q.pop(); if (a < 0 || b < 0 || a >= N || b >= N || grid[b][a] !== from) continue; grid[b][a] = to; q.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); } };
    const at = p => [Math.floor((p.x - X0) / S), Math.floor((p.y - X0) / S)];
    const act = (p, first) => { const [x, y] = at(p); if (x < 0 || y < 0 || x >= N || y >= N) return; if (tool === 'fill') { if (first) fill(x, y, grid[y][x], cur); } else grid[y][x] = tool === 'eraser' ? 0 : cur; draw(); };
    st.cv.addEventListener('pointerdown', e => { paint = true; act(st.pos(e), true); }); st.cv.addEventListener('pointermove', e => { if (paint && tool !== 'fill') act(st.pos(e)); }); window.addEventListener('pointerup', () => { paint = false; }); st.cv.style.touchAction = 'none';
    H.seg(panel, { label: 'Інструмент', options: [['pen', '✏ олівець'], ['fill', '🪣 заливка'], ['eraser', '🧽 гумка']], value: 'pen' }, v => { tool = v; });
    const pw = el('div', 'sim-ctl'); pw.innerHTML = '<span class="sim-ctl-l">Колір</span>'; const pb = el('div', 'sim-seg'); pw.appendChild(pb); panel.appendChild(pw);
    const palBox = () => { pb.innerHTML = PAL[pal].map((c, i) => `<button type="button" data-c="${i}" class="${i === cur ? 'on' : ''}" style="background:${c};width:30px;height:30px;padding:0;border-radius:8px"></button>`).join(''); };
    pb.onclick = e => { const b = e.target.closest('button'); if (b) { cur = +b.dataset.c; palBox(); } };
    H.select(panel, { label: 'Палітра', options: [['2', '2 кольори (1 біт)'], ['4', '4 кольори (2 біти)'], ['16', '16 кольорів (4 біти)']], value: String(pal) }, v => { pal = +v; grid = grid.map(r => r.map(c => c % pal)); if (cur >= pal) cur = 1; draw(); });
    H.select(panel, { label: 'Малюнок', options: Object.keys(PIC).map(k => [k, k]), value: Object.keys(PIC)[0] }, v => load(v));
    H.check(panel, { label: 'Показувати сітку пікселів', value: true }, v => { showGrid = v; draw(); });
    H.buttons(panel, [['🧹 Очистити', () => { grid = grid.map(r => r.map(() => 0)); draw(); }]]);
    const read = H.readout(panel, 'Растр');
    H.note(panel, cfg.note || 'Растрове зображення складається з <b>пікселів</b>. Заливка зафарбовує лише <b>замкнену</b> область — якщо в контурі є розрив, фарба «витече». Спробуй залити будиночок!');
    load(Object.keys(PIC)[0]);
    return { destroy: () => st.destroy() };
  });

  /* =============== Форматування тексту =============== */
  css('sim-css-txt', `.tx-page{background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(31,35,64,.08);padding:28px 32px;min-height:340px;line-height:1.5;transition:all .2s}
  .tx-page mark{background:#FDE68A}`);
  const SAMPLE = 'Комп’ютер — це пристрій для опрацювання даних. Він вміє зберігати, передавати та перетворювати інформацію. Текстовий процесор допомагає створювати й оформлювати документи: змінювати шрифт, розмір і колір символів, вирівнювати абзаци.';
  reg('textfmt', (stage, panel, cfg, api) => {
    const page = el('div', 'tx-page'); stage.appendChild(page); let txt = cfg.text || SAMPLE, f = { font: 'Georgia, serif', size: 18, b: false, i: false, u: false, color: '#1F2340', align: 'left', lh: 1.5, title: true }, hl = '';
    const draw = () => { let h = esc(txt); if (hl) h = h.split(esc(hl)).join(`<mark>${esc(hl)}</mark>`);
      page.innerHTML = (f.title ? `<h2 style="font-family:${f.font};text-align:center;margin:0 0 12px;color:${f.color}">${esc(cfg.title || 'Що таке комп’ютер')}</h2>` : '') + `<p style="margin:0;font-family:${f.font};font-size:${f.size}px;font-weight:${f.b ? 800 : 400};font-style:${f.i ? 'italic' : 'normal'};text-decoration:${f.u ? 'underline' : 'none'};color:${f.color};text-align:${f.align};line-height:${f.lh}">${h}</p>`;
      const words = txt.trim().split(/\s+/).filter(w => /[\wА-яЇїІіЄєҐґ’']/.test(w)).length, chars = txt.length, nosp = txt.replace(/\s/g, '').length;
      api.state = { words, chars, nosp, size: f.size }; read.set([['Символів', chars], ['Символів без пропусків', nosp], ['Слів', words], ['Шрифт', `${f.font.split(',')[0]}, ${f.size} пт`]]); };
    H.select(panel, { label: 'Шрифт', options: [['Georgia, serif', 'Georgia (із зарубками)'], ['Arial, sans-serif', 'Arial (без зарубок)'], ['"Courier New", monospace', 'Courier New (моноширинний)'], ['"Comic Sans MS", cursive', 'Comic Sans']], value: f.font }, v => { f.font = v; draw(); });
    H.slider(panel, { label: 'Розмір шрифту', min: 10, max: 36, value: f.size, unit: 'пт' }, v => { f.size = v; draw(); });
    H.seg(panel, { label: 'Накреслення', options: [['b', '<b>Ж</b>'], ['i', '<i>К</i>'], ['u', '<u>П</u>'], ['n', 'звичайне']], value: 'n' }, v => { if (v === 'n') { f.b = f.i = f.u = false; } else f[v] = !f[v]; draw(); });
    H.seg(panel, { label: 'Вирівнювання', options: [['left', '⇤ ліворуч'], ['center', '↔ центр'], ['right', '⇥ праворуч'], ['justify', '☰ за шириною']], value: 'left' }, v => { f.align = v; draw(); });
    H.seg(panel, { label: 'Колір тексту', options: [['#1F2340', '⚫'], ['#E5484D', '🔴'], ['#2563EB', '🔵'], ['#16A34A', '🟢']], value: '#1F2340' }, v => { f.color = v; draw(); });
    H.slider(panel, { label: 'Міжрядковий інтервал', min: 1, max: 2.5, step: 0.25, value: f.lh }, v => { f.lh = v; draw(); });
    const fw = el('div', 'sim-ctl'); fw.innerHTML = '<span class="sim-ctl-l">Знайти та замінити</span><div style="grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap"><input class="input" placeholder="знайти" style="flex:1;min-width:80px"><input class="input" placeholder="замінити на" style="flex:1;min-width:80px"></div>'; panel.appendChild(fw);
    const [fi, ri] = fw.querySelectorAll('input'); fi.oninput = () => { hl = fi.value; draw(); };
    H.buttons(panel, [['🔁 Замінити все', () => { if (fi.value) { txt = txt.split(fi.value).join(ri.value); hl = ri.value; draw(); } }, 'brand'], ['↩ Початковий текст', () => { txt = cfg.text || SAMPLE; hl = ''; draw(); }]]);
    const read = H.readout(panel, 'Статистика документа');
    H.note(panel, '<b>Редагування</b> змінює зміст тексту (вставити, видалити, замінити), а <b>форматування</b> — його вигляд (шрифт, розмір, колір, вирівнювання).');
    draw(); return { destroy() {} };
  });

  /* =============== Дизайн слайда: правила оформлення =============== */
  const lum = hex => { const c = hex.match(/\w\w/g).map(h => { const v = parseInt(h, 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  reg('slidedesign', (stage, panel, cfg, api) => {
    const sl = el('div'); sl.style.cssText = 'aspect-ratio:16/9;border-radius:12px;padding:5% 6%;box-shadow:0 2px 14px rgba(31,35,64,.12);overflow:hidden;display:flex;flex-direction:column;gap:3%'; stage.appendChild(sl);
    let bg = '#FFFFFF', fg = '#1F2340', size = 28, lines = 4, title = true, img = true, font = 'Arial, sans-serif';
    const LINES = ['Комп’ютерна презентація складається зі слайдів', 'На слайді розміщують текст, малюнки, відео', 'Текст має бути коротким і великим', 'Кольори фону й тексту — контрастні', 'Не більше 6 рядків на слайді', 'Один слайд — одна думка', 'Підписуй малюнки', 'Перевір орфографію', 'Додай слайд із джерелами', 'Не зловживай анімацією'];
    const draw = () => { const k = sl.clientWidth / 960;
      sl.style.background = bg; sl.style.color = fg; sl.style.fontFamily = font;
      sl.innerHTML = (title ? `<div style="font-weight:800;font-size:${44 * k}px">Як створити гарну презентацію</div>` : '') + `<div style="display:flex;gap:4%;flex:1;min-height:0"><ul style="margin:0;padding-left:1.2em;font-size:${size * k * 1.33}px;line-height:1.3;flex:1;overflow:hidden">${LINES.slice(0, lines).map(l => `<li>${l}</li>`).join('')}</ul>${img ? `<div style="width:30%;border-radius:12px;background:linear-gradient(135deg,#A5B4FC,#F9A8D4);display:grid;place-items:center;font-size:${70 * k}px">🖼</div>` : ''}</div>`;
      const cr = contrast(bg, fg), rules = [[cr >= 4.5, `Контраст тексту й фону ${fmt(cr, 1)} : 1 (потрібно ≥ 4,5)`], [size >= 24, `Розмір тексту ${size} пт (потрібно ≥ 24)`], [lines <= 6, `${lines} рядків (бажано ≤ 6)`], [title, 'Є заголовок слайда'], [img, 'Є ілюстрація']];
      const score = rules.filter(r => r[0]).length; api.state = { score, contrast: cr };
      read.set(rules.map(r => [(r[0] ? '✅ ' : '❌ ') + r[1], ''])); note.innerHTML = `Оцінка оформлення: <b>${score} з ${rules.length}</b>. ${score === rules.length ? '🎉 Слайд оформлено за правилами!' : 'Виправ позначені ❌ пункти.'}`; note.className = 'sim-note ' + (score === rules.length ? 'ok' : ''); };
    const col = [['#FFFFFF', 'білий'], ['#1F2340', 'темно-синій'], ['#FDE047', 'жовтий'], ['#E5484D', 'червоний'], ['#BFDBFE', 'блакитний'], ['#16A34A', 'зелений'], ['#9CA3AF', 'сірий']];
    H.select(panel, { label: 'Колір фону', options: col, value: bg }, v => { bg = v; draw(); });
    H.select(panel, { label: 'Колір тексту', options: col, value: fg }, v => { fg = v; draw(); });
    H.select(panel, { label: 'Шрифт', options: [['Arial, sans-serif', 'Arial'], ['Georgia, serif', 'Georgia'], ['"Comic Sans MS", cursive', 'Comic Sans']], value: font }, v => { font = v; draw(); });
    H.slider(panel, { label: 'Розмір тексту', min: 12, max: 40, step: 2, value: size, unit: 'пт' }, v => { size = v; draw(); });
    H.slider(panel, { label: 'Кількість рядків', min: 1, max: 10, value: lines }, v => { lines = v; draw(); });
    H.check(panel, { label: 'Заголовок', value: true }, v => { title = v; draw(); }); H.check(panel, { label: 'Малюнок', value: true }, v => { img = v; draw(); });
    const read = H.readout(panel, 'Перевірка правил'); const note = H.note(panel, '');
    const ro = new ResizeObserver(() => draw()); ro.observe(sl); draw();
    return { destroy: () => ro.disconnect() };
  });

  /* =============== Електронна таблиця з формулами =============== */
  css('sim-css-sheet', `.sh-wrap{overflow:auto}.sh-bar{display:flex;gap:8px;align-items:center;margin-bottom:8px;font-weight:700}.sh-bar input{flex:1;font-family:ui-monospace,monospace}
  table.sh{border-collapse:collapse;font-size:14px;min-width:100%}table.sh th{background:#EEF0FF;color:#4F46E5;font-weight:800;padding:4px 8px;border:1px solid #DAD7F5;min-width:28px}
  table.sh td{border:1px solid #DAD7F5;padding:0;min-width:84px}table.sh td input{width:100%;border:0;padding:6px 8px;font:inherit;background:transparent;outline:none}
  table.sh td.sel{outline:2px solid #4F46E5;outline-offset:-2px}table.sh td.f input{color:#1F2340;font-weight:700}table.sh td.f{background:#F7FFF9}table.sh td.err input{color:#E5484D}`);
  const colN = c => c.charCodeAt(0) - 65, colL = n => String.fromCharCode(65 + n);
  function sheetEval(raw) {
    const cache = {}, busy = {};
    const val = ref => { ref = ref.replace(/\$/g, '').toUpperCase(); if (ref in cache) return cache[ref]; if (busy[ref]) throw new Error('цикл'); busy[ref] = 1;
      const r = raw[ref]; let v; if (r == null || r === '') v = 0; else if (String(r).startsWith('=')) v = calc(String(r).slice(1)); else { const n = parseFloat(String(r).replace(',', '.')); v = isNaN(n) || !/^\s*-?[\d.,]+\s*$/.test(r) ? String(r) : n; }
      busy[ref] = 0; cache[ref] = v; return v; };
    const range = (a, b) => { a = a.replace(/\$/g, ''); b = b.replace(/\$/g, ''); const c1 = colN(a[0]), c2 = colN(b[0]), r1 = +a.slice(1), r2 = +b.slice(1), out = [];
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) out.push(val(colL(c) + r)); return out; };
    const nums = a => a.flat().filter(x => typeof x === 'number');
    const F = { SUM: (...a) => nums(a).reduce((s, x) => s + x, 0), AVERAGE: (...a) => { const n = nums(a); return n.reduce((s, x) => s + x, 0) / n.length; }, MAX: (...a) => Math.max(...nums(a)), MIN: (...a) => Math.min(...nums(a)), COUNT: (...a) => nums(a).length,
      IF: (c, a, b) => c ? a : b, AND: (...a) => a.flat().every(Boolean), OR: (...a) => a.flat().some(Boolean), NOT: a => !a, ROUND: (x, d) => Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0), ABS: Math.abs,
      COUNTIF: (a, c) => { const m = String(c).match(/^(>=|<=|<>|>|<|=)?(.*)$/); const op = m[1] || '=', t = isNaN(parseFloat(m[2])) ? m[2] : parseFloat(m[2]); return a.filter(x => op === '>' ? x > t : op === '<' ? x < t : op === '>=' ? x >= t : op === '<=' ? x <= t : op === '<>' ? x != t : x == t).length; } };
    const AL = { СУМ: 'SUM', СРЗНАЧ: 'AVERAGE', МАКС: 'MAX', МІН: 'MIN', РАХУНОК: 'COUNT', ЯКЩО: 'IF', І: 'AND', АБО: 'OR', НЕ: 'NOT', ОКРУГЛ: 'ROUND', СУМЯКЩО: 'SUMIF' };
    const calc = f => { const strs = []; let s = f.replace(/"([^"]*)"/g, (m, x) => { strs.push(x); return `§${strs.length - 1}§`; });
      s = s.replace(/(\$?[A-Z]\$?\d+):(\$?[A-Z]\$?\d+)/gi, (m, a, b) => `R("${a}","${b}")`).replace(/(^|[^A-Z"$\w])(\$?[A-Z]\$?\d+)(?![\w(])/gi, (m, p, r) => `${p}V("${r}")`)
        .replace(/([A-ZА-ЯІЇЄ]+)\s*\(/gi, (m, n) => { const k = n.toUpperCase(); const nm = AL[k] || k; if (nm === 'R' || nm === 'V') return m; if (!F[nm]) throw new Error('функція ' + n); return `F.${nm}(`; })
        .replace(/;/g, ',').replace(/<>/g, '!=').replace(/([^<>!=])=(?!=)/g, '$1==').replace(/\^/g, '**').replace(/§(\d+)§/g, (m, i) => JSON.stringify(strs[i]));
      return Function('V', 'R', 'F', '"use strict";return (' + s + ');')(val, range, F); };
    const out = {}; Object.keys(raw).forEach(k => { try { out[k] = val(k); } catch (e) { out[k] = '#ПОМИЛКА'; } }); return out;
  }
  const shiftRefs = (f, dr, dc) => f.replace(/(\$?)([A-Z])(\$?)(\d+)/g, (m, ac, c, ar, r) => (ac ? '$' + c : colL(colN(c) + dc)) + (ar ? '$' + r : (+r + dr)));
  reg('sheet', (stage, panel, cfg, api) => {
    const cols = cfg.cols || 4, rows = cfg.rows || 7; let raw = { ...cfg.cells }, sel = 'A1';
    const wrap = el('div', 'sh-wrap'); stage.appendChild(wrap);
    wrap.innerHTML = `<div class="sh-bar"><span>ƒx</span><input class="input" id="shf"></div><table class="sh"><tr><th></th>${[...Array(cols)].map((_, c) => `<th>${colL(c)}</th>`).join('')}</tr>${[...Array(rows)].map((_, r) => `<tr><th>${r + 1}</th>${[...Array(cols)].map((_, c) => `<td data-r="${colL(c)}${r + 1}"><input></td>`).join('')}</tr>`).join('')}</table>`;
    const fbar = wrap.querySelector('#shf');
    const draw = () => { const v = sheetEval(raw); wrap.querySelectorAll('td').forEach(td => { const r = td.dataset.r, inp = td.querySelector('input'), isF = String(raw[r] || '').startsWith('='); td.classList.toggle('f', isF); td.classList.toggle('sel', r === sel); td.classList.toggle('err', v[r] === '#ПОМИЛКА');
      if (document.activeElement !== inp) inp.value = raw[r] == null ? '' : isF ? (typeof v[r] === 'number' ? fmt(v[r], 2) : v[r] === true ? 'ІСТИНА' : v[r] === false ? 'ХИБНІСТЬ' : v[r]) : raw[r]; });
      if (document.activeElement !== fbar) fbar.value = raw[sel] || ''; api.state = { v };
      read.set([['Виділена клітинка', sel], ['Вміст', esc(raw[sel] || '—')], ['Значення', typeof v[sel] === 'number' ? fmt(v[sel], 3) : esc(String(v[sel] == null ? '—' : v[sel]))]]); };
    wrap.addEventListener('focusin', e => { const td = e.target.closest('td'); if (!td) return; sel = td.dataset.r; e.target.value = raw[sel] || ''; fbar.value = raw[sel] || ''; draw(); });
    wrap.addEventListener('input', e => { const td = e.target.closest('td'); if (td) { raw[td.dataset.r] = e.target.value; fbar.value = e.target.value; } else if (e.target === fbar) raw[sel] = fbar.value; });
    wrap.addEventListener('focusout', () => setTimeout(draw, 0)); wrap.addEventListener('keydown', e => { if (e.key === 'Enter') { e.target.blur(); draw(); } });
    if (cfg.fill) H.buttons(panel, cfg.fill.map(([from, to, lab]) => [lab || `⬇ Скопіювати ${from} у ${to}`, () => { const f = raw[from] || ''; const [a, b] = to.split(':'); const c0 = colN(a[0]), r0 = +a.slice(1), c1 = colN(b[0]), r1 = +b.slice(1); for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) { const k = colL(c) + r; if (k !== from) raw[k] = String(f).startsWith('=') ? shiftRefs(f, r - +from.slice(1), c - colN(from[0])) : f; } draw(); }, 'brand']));
    H.buttons(panel, [['↩ Відновити таблицю', () => { raw = { ...cfg.cells }; draw(); }]]);
    const read = H.readout(panel, 'Клітинка');
    H.note(panel, cfg.note || 'Формула починається зі знака <b>=</b>. Приклади: <b>=B2*C2</b>, <b>=SUM(D2:D5)</b>, <b>=AVERAGE(B2:B5)</b>, <b>=IF(B2>10;"так";"ні")</b>. Знак <b>$</b> робить посилання абсолютним.');
    draw(); return { destroy() {} };
  });

  /* =============== Micro:bit =============== */
  const ICONS = { heart: ['01010', '11111', '11111', '01110', '00100'], smile: ['00000', '01010', '00000', '10001', '01110'], sad: ['00000', '01010', '00000', '01110', '10001'], sun: ['10101', '01110', '11111', '01110', '10101'], snow: ['10101', '01010', '10101', '01010', '10101'], all: ['11111', '11111', '11111', '11111', '11111'], none: ['00000', '00000', '00000', '00000', '00000'], yes: ['00000', '00001', '00010', '10100', '01000'], up: ['00100', '01110', '10101', '00100', '00100'], down: ['00100', '00100', '10101', '01110', '00100'] };
  const DIG = { 0: ['01100', '10010', '10010', '10010', '01100'], 1: ['00100', '01100', '00100', '00100', '01110'], 2: ['11100', '00010', '01100', '10000', '11110'], 3: ['11110', '00010', '00100', '10010', '01100'], 4: ['00110', '01010', '10010', '11111', '00010'], 5: ['11111', '10000', '11110', '00001', '11110'], 6: ['00010', '00100', '01110', '10001', '01110'], 7: ['11111', '00010', '00100', '01000', '10000'], 8: ['01110', '10001', '01110', '10001', '01110'], 9: ['01110', '10001', '01110', '00100', '01000'], '-': ['00000', '00000', '01110', '00000', '00000'] };
  const DICE = { 1: ['00000', '00000', '00100', '00000', '00000'], 2: ['00000', '01000', '00000', '00010', '00000'], 3: ['10000', '00000', '00100', '00000', '00001'], 4: ['00000', '01010', '00000', '01010', '00000'], 5: ['10001', '00000', '00100', '00000', '10001'], 6: ['01010', '00000', '01010', '00000', '01010'] };
  const MB_PROGS = {
    icons: { name: 'Кнопки й зображення', code: 'on_button_pressed(A):\n    show_icon(HEART)\non_button_pressed(B):\n    show_icon(HAPPY)\non_button_pressed(A+B):\n    clear_screen()' },
    counter: { name: 'Лічильник', code: 'count = 0\non_button_pressed(A):\n    count = count + 1\n    show_number(count)\non_button_pressed(B):\n    count = count - 1\n    show_number(count)\non_button_pressed(A+B):\n    count = 0' },
    thermo: { name: 'Термометр (розгалуження)', code: 'forever:\n    if temperature() > 25:\n        show_icon(SUN)\n    else:\n        show_icon(SNOW)' },
    night: { name: 'Нічник (датчик освітленості)', code: 'forever:\n    if light_level() < 100:\n        show_leds(ALL)\n    else:\n        clear_screen()' },
    dice: { name: 'Гральний кубик (струшування)', code: 'on_gesture(SHAKE):\n    n = randint(1, 6)\n    show_dice(n)' },
    compass: { name: 'Нахил (акселерометр)', code: 'forever:\n    if acceleration(Y) < -300:\n        show_arrow(UP)\n    elif acceleration(Y) > 300:\n        show_arrow(DOWN)\n    else:\n        show_icon(YES)' } };
  reg('microbit', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 520, 360); const list = cfg.programs || Object.keys(MB_PROGS);
    let pg = list[0], img = ICONS.none, count = 0, temp = 21, light = 180, tilt = 0, scroll = null, presses = { A: 0, B: 0 }, last = '—';
    const show = rows => { img = rows; scroll = null; };
    const showNum = n => { const s = String(n); if (s.length === 1) show(DIG[s]); else { const cols = []; for (const ch of s) { const g = DIG[ch] || DIG['-']; for (let c = 0; c < 5; c++) cols.push(g.map(r => r[c])); cols.push(['0', '0', '0', '0', '0']); } scroll = { cols, t: 0 }; } };
    const press = b => { last = 'кнопка ' + b; if (b !== 'AB') presses[b]++;
      if (pg === 'icons') show(b === 'A' ? ICONS.heart : b === 'B' ? ICONS.smile : ICONS.none);
      if (pg === 'counter') { if (b === 'A') count++; else if (b === 'B') count--; else count = 0; showNum(count); } };
    const shake = () => { last = 'струшування'; if (pg === 'dice') { count = H.rnd(1, 6); show(DICE[count]); } };
    const tick = () => { if (pg === 'thermo') show(temp > 25 ? ICONS.sun : ICONS.snow); if (pg === 'night') show(light < 100 ? ICONS.all : ICONS.none); if (pg === 'compass') show(tilt < -300 ? ICONS.up : tilt > 300 ? ICONS.down : ICONS.yes); };
    const draw = () => { const { ctx } = st; st.clear('#fff'); ctx.fillStyle = '#1F2340'; rrect(ctx, 60, 30, 400, 300, 26); ctx.fill();
      ctx.fillStyle = '#C9CED6'; [80, 360].forEach(x => { ctx.beginPath(); ctx.arc(x + 40, 315, 22, 0, 7); ctx.fill(); }); text(ctx, '0  1  2  3V  GND', 260, 322, { align: 'center', color: '#C9CED6', size: 12, bold: true });
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { let on; if (scroll) { const col = scroll.cols[Math.floor(scroll.t) + c]; on = col ? col[r] === '1' : false; } else on = img[r][c] === '1'; ctx.fillStyle = on ? '#FF3B30' : '#3A3F5C'; if (on) { ctx.shadowColor = '#FF3B30'; ctx.shadowBlur = 14; } rrect(ctx, 190 + c * 30, 80 + r * 34, 12, 22, 3); ctx.fill(); ctx.shadowBlur = 0; }
      [['A', 100], ['B', 420]].forEach(([b, x]) => { ctx.fillStyle = '#2A2F4A'; rrect(ctx, x - 26, 150, 52, 52, 10); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, 176, 17, 0, 7); ctx.fill(); text(ctx, b, x, 228, { align: 'center', color: '#fff', bold: true, size: 18 }); });
      api.state = { count, presses, pg }; read.set([['Програма', MB_PROGS[pg].name], ['Остання подія', last], ['Змінна count / n', count], ['Температура / світло', `${temp} °C / ${light}`]]); };
    st.cv.addEventListener('click', e => { const p = st.pos(e); if (Math.hypot(p.x - 100, p.y - 176) < 30) press('A'); else if (Math.hypot(p.x - 420, p.y - 176) < 30) press('B'); draw(); });
    const codeEl = el('pre'); codeEl.style.cssText = 'margin:10px 0 0;padding:12px;border-radius:12px;background:#0F172A;color:#E2E8F0;font-size:13px;overflow:auto'; stage.appendChild(codeEl);
    const setPg = v => { pg = v; count = 0; presses = { A: 0, B: 0 }; img = ICONS.none; scroll = null; last = '—'; codeEl.textContent = MB_PROGS[pg].code; ['thermo', 'night', 'compass'].includes(pg) && tick(); draw(); };
    H.select(panel, { label: 'Програма', options: list.map(k => [k, MB_PROGS[k].name]), value: pg }, setPg);
    H.buttons(panel, [['🅰 Кнопка A', () => { press('A'); draw(); }, 'brand'], ['🅱 Кнопка B', () => { press('B'); draw(); }, 'brand'], ['A+B', () => { press('AB'); draw(); }], ['🤚 Струсити', () => { shake(); draw(); }]]);
    H.slider(panel, { label: 'Датчик температури', min: -10, max: 40, value: temp, unit: '°C' }, v => { temp = v; tick(); draw(); });
    H.slider(panel, { label: 'Датчик освітленості', min: 0, max: 255, value: light }, v => { light = v; tick(); draw(); });
    H.slider(panel, { label: 'Нахил по осі Y', min: -1000, max: 1000, step: 50, value: tilt, unit: 'mg' }, v => { tilt = v; tick(); draw(); });
    const read = H.readout(panel, 'Плата');
    H.note(panel, 'Micro:bit реагує на <b>події</b>: натискання кнопок, струшування, зміну показів датчиків. Програма описує, що робити, коли подія стається.');
    const stop = H.loop(dt => { if (scroll) { scroll.t += dt * 5; if (scroll.t > scroll.cols.length - 5) scroll.t = 0; } draw(); });
    setPg(pg); return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== Анімація: ключові кадри =============== */
  reg('keyframes', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 580, 380); let dur = 2, fps = 12, ease = 'linear', onion = true, t = 0, play = false, obj = cfg.obj || '⚽', loop = true;
    let keys = [[0, 60, 260, 1, 0], [0.5, 290, 80, 1.4, 180], [1, 520, 260, 1, 360]]; /* частка часу, x, y, масштаб, поворот */
    const E = { linear: u => u, ease: u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2 };
    const at = u => { let i = 0; while (i < keys.length - 2 && u > keys[i + 1][0]) i++; const a = keys[i], b = keys[i + 1]; const k = E[ease](Math.max(0, Math.min(1, (u - a[0]) / (b[0] - a[0])))); return a.map((v, j) => v + (b[j] - v) * k); };
    const frames = () => Math.round(dur * fps);
    const draw = () => { const { ctx } = st; st.clear(C.sky); const F = frames(), f = Math.min(F, Math.floor(t * fps));
      ctx.fillStyle = '#E3F2E1'; ctx.fillRect(0, 300, 580, 80);
      if (onion) for (let i = 0; i <= F; i++) { const p = at(i / F); ctx.globalAlpha = 0.12; text(ctx, obj, p[1], p[2], { align: 'center', base: 'middle', size: 34 * p[3] }); } ctx.globalAlpha = 1;
      keys.forEach(k => { ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(k[1], k[2], 26 * k[3], 0, 7); ctx.stroke(); ctx.setLineDash([]); });
      const p = at(F ? f / F : 0); ctx.save(); ctx.translate(p[1], p[2]); ctx.rotate(p[4] * Math.PI / 180); text(ctx, obj, 0, 0, { align: 'center', base: 'middle', size: 40 * p[3] }); ctx.restore();
      /* шкала часу */
      ctx.fillStyle = '#fff'; ctx.fillRect(20, 330, 540, 30); const w = 540 / Math.max(1, F); for (let i = 0; i <= F; i++) { ctx.fillStyle = i === f ? C.brand : '#DAD7F5'; ctx.fillRect(20 + i * w - (F > 60 ? 0.5 : 1), 334, F > 60 ? 1 : 2, 22); }
      keys.forEach(k => { ctx.fillStyle = C.orange; ctx.beginPath(); const x = 20 + k[0] * 540; ctx.moveTo(x, 330); ctx.lineTo(x - 6, 322); ctx.lineTo(x + 6, 322); ctx.fill(); });
      text(ctx, `кадр ${f} з ${F}`, 560, 320, { align: 'right', bold: true });
      api.state = { frames: F, fps, dur }; read.set([['Тривалість', fmt(dur, 1) + ' с'], ['Частота кадрів', fps + ' кадр/с'], ['Усього кадрів', F], ['Ключових кадрів', keys.length], ['Проміжних (обчислює програма)', Math.max(0, F + 1 - keys.length)]]); };
    H.slider(panel, { label: 'Тривалість анімації', min: 1, max: 6, step: 0.5, value: dur, unit: 'с' }, v => { dur = v; t = 0; draw(); });
    H.select(panel, { label: 'Частота кадрів', options: [['4', '4 кадр/с (ривками)'], ['12', '12 кадр/с'], ['24', '24 кадр/с (кіно)'], ['30', '30 кадр/с']], value: '12' }, v => { fps = +v; draw(); });
    H.seg(panel, { label: 'Рух між ключовими кадрами', options: [['linear', 'рівномірно'], ['ease', 'плавно']], value: 'linear' }, v => { ease = v; draw(); });
    H.seg(panel, { label: 'Об’єкт', options: [['⚽', '⚽'], ['🚀', '🚀'], ['🐦', '🐦'], ['⭐', '⭐']], value: obj }, v => { obj = v; draw(); });
    H.check(panel, { label: 'Показати всі кадри («калька»)', value: true }, v => { onion = v; draw(); });
    H.buttons(panel, [['▶ Відтворити / пауза', () => { play = !play; }, 'brand'], ['⏭ Наступний кадр', () => { play = false; t = Math.min(dur, (Math.floor(t * fps) + 1) / fps + 1e-6); draw(); }], ['⏮ На початок', () => { t = 0; draw(); }]]);
    const read = H.readout(panel, 'Анімація');
    H.note(panel, 'Ти задаєш лише <b>ключові кадри</b> (помаранчеві кола), а програма сама обчислює проміжні. Кількість кадрів = тривалість × частота. Перетягуй ключові кадри мишкою.');
    let dk = -1; H.drag(st, p => { dk = keys.findIndex(k => Math.hypot(p.x - k[1], p.y - k[2]) < 28); return dk >= 0; }, p => { keys[dk][1] = Math.max(20, Math.min(560, p.x)); keys[dk][2] = Math.max(30, Math.min(300, p.y)); draw(); });
    const stop = H.loop(dt => { if (!play) return; t += dt; if (t > dur) t = loop ? 0 : dur; draw(); });
    draw(); return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== Надійність пароля =============== */
  const COMMON = ['123456', 'password', 'qwerty', '111111', '12345678', 'abc123', 'пароль', 'йцукен', '000000', 'iloveyou', 'admin', 'qwerty123', '1q2w3e', '123123', 'football'];
  reg('password', (stage, panel, cfg, api) => {
    const box = el('div'); box.style.cssText = 'display:grid;gap:14px;padding:8px'; stage.appendChild(box);
    box.innerHTML = `<label style="font-weight:800">Введи пароль для перевірки <span class="muted" style="font-weight:600">(він нікуди не надсилається)</span></label>
      <div style="display:flex;gap:8px"><input class="input" id="pw" type="text" autocomplete="off" style="font-size:20px;font-family:ui-monospace,monospace;flex:1" value="kitten12"><button class="btn light" id="pwg" type="button">🎲 Згенерувати</button></div>
      <div style="height:22px;border-radius:11px;background:#EEE;overflow:hidden"><div id="pwb" style="height:100%;width:0;transition:all .3s"></div></div><div id="pwt" style="font-size:22px;font-weight:900;text-align:center"></div><div id="pwc" style="display:grid;gap:6px;font-weight:600"></div>`;
    const inp = box.querySelector('#pw');
    const calc = () => { const p = inp.value; let N = 0; const has = { lo: /[a-z]/.test(p), up: /[A-Z]/.test(p), d: /\d/.test(p), cy: /[а-яіїєґ]/.test(p), CY: /[А-ЯІЇЄҐ]/.test(p), s: /[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ]/.test(p) };
      if (has.lo) N += 26; if (has.up) N += 26; if (has.d) N += 10; if (has.cy) N += 33; if (has.CY) N += 33; if (has.s) N += 33;
      const common = COMMON.some(c => p.toLowerCase().includes(c)), bits = p.length && N ? p.length * Math.log2(N) : 0, eff = common ? Math.min(bits, 10) : bits;
      const secs = Math.pow(2, eff) / 1e10; const tt = s => s < 1 ? 'миттєво' : s < 60 ? fmt(s, 0) + ' с' : s < 3600 ? fmt(s / 60, 0) + ' хв' : s < 86400 ? fmt(s / 3600, 0) + ' год' : s < 3.15e7 ? fmt(s / 86400, 0) + ' діб' : s < 3.15e10 ? fmt(s / 3.15e7, 0) + ' років' : 'понад мільярд років'.replace('мільярд', s < 3.15e16 ? 'тисячу' : 'мільярд');
      const lvl = eff < 28 ? 0 : eff < 45 ? 1 : eff < 65 ? 2 : 3, cols = ['#E5484D', '#F59E0B', '#84CC16', '#16A34A'], names = ['Дуже слабкий', 'Слабкий', 'Добрий', 'Надійний'];
      box.querySelector('#pwb').style.cssText = `height:100%;transition:all .3s;width:${Math.min(100, eff / 80 * 100)}%;background:${cols[lvl]}`; box.querySelector('#pwt').innerHTML = `<span style="color:${cols[lvl]}">${names[lvl]}</span>`;
      const checks = [[p.length >= 12, 'Довжина не менше 12 символів (зараз ' + p.length + ')'], [has.lo || has.cy, 'Є малі літери'], [has.up || has.CY, 'Є великі літери'], [has.d, 'Є цифри'], [has.s, 'Є спеціальні символи (!, ?, # …)'], [!common, 'Не містить поширених паролів (123456, qwerty…)']];
      box.querySelector('#pwc').innerHTML = checks.map(c => `<div>${c[0] ? '✅' : '❌'} ${c[1]}</div>`).join('');
      api.state = { N, len: p.length, bits: eff }; read.set([['Алфавіт (кількість символів)', N], ['Довжина', p.length], ['Кількість варіантів', N && p.length ? `${N}^${p.length} ≈ 10^${fmt(p.length * Math.log10(N), 0)}` : '—'], ['Час перебору (10 млрд/с)', p.length ? tt(secs) : '—']]); };
    inp.oninput = calc;
    box.querySelector('#pwg').onclick = () => { const A = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!?#%&*', a = new Uint32Array(16); crypto.getRandomValues(a); inp.value = [...a].map(x => A[x % A.length]).join(''); calc(); };
    const read = H.readout(panel, 'Аналіз');
    H.note(panel, 'Кількість можливих паролів = <b>N<sup>L</sup></b>, де N — кількість символів в алфавіті, L — довжина. Довгий пароль із різних видів символів перебрати практично неможливо. Не використовуй один пароль для різних сервісів і вмикай <b>двофакторну автентифікацію</b>.');
    calc(); return { destroy() {} };
  });

  /* =============== HTML: живий редактор =============== */
  reg('html', (stage, panel, cfg, api) => {
    const presets = cfg.presets || [['Перша сторінка', '<h1>Привіт, світе!</h1>\n<p>Це моя <b>перша</b> вебсторінка.</p>\n<ul>\n  <li>HTML — мова розмітки</li>\n  <li>теги пишуть у кутових дужках</li>\n</ul>']];
    const wrap = el('div'); wrap.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px'; stage.appendChild(wrap);
    const ta = el('textarea', 'input'); ta.style.cssText = 'min-height:340px;font-family:ui-monospace,monospace;font-size:14px;line-height:1.5'; ta.spellcheck = false;
    const fr = document.createElement('iframe'); fr.setAttribute('sandbox', ''); fr.style.cssText = 'width:100%;min-height:340px;border:2px solid #DAD7F5;border-radius:12px;background:#fff';
    wrap.appendChild(ta); wrap.appendChild(fr);
    const draw = () => { fr.srcdoc = '<meta charset="utf-8"><style>body{font-family:Arial,sans-serif;padding:8px 14px;line-height:1.5}img{max-width:100%}</style>' + ta.value;
      const tags = (ta.value.match(/<([a-z][a-z0-9]*)\b/gi) || []).map(t => t.slice(1).toLowerCase()); const uniq = [...new Set(tags)];
      const open = (ta.value.match(/<([a-z][a-z0-9]*)\b[^>]*>/gi) || []).filter(t => !/^<(br|img|hr|meta|input)/i.test(t)).length, close = (ta.value.match(/<\/[a-z][a-z0-9]*>/gi) || []).length;
      api.state = { tags: tags.length, uniq: uniq.length }; read.set([['Тегів у коді', tags.length], ['Різних тегів', uniq.join(', ') || '—'], ['Парні теги', open === close ? '✅ усі закрито' : `⚠ відкрито ${open}, закрито ${close}`]]); };
    ta.oninput = draw;
    H.select(panel, { label: 'Приклад', options: presets.map((p, i) => [String(i), p[0]]), value: '0' }, v => { ta.value = presets[+v][1]; draw(); });
    H.buttons(panel, [['＋ Заголовок', () => ins('<h2>Заголовок</h2>\n')], ['＋ Абзац', () => ins('<p>Новий абзац</p>\n')], ['＋ Посилання', () => ins('<a href="https://uk.wikipedia.org">Вікіпедія</a>\n')], ['＋ Список', () => ins('<ol>\n  <li>перший</li>\n  <li>другий</li>\n</ol>\n')], ['＋ Таблиця', () => ins('<table border="1">\n  <tr><th>Ім’я</th><th>Клас</th></tr>\n  <tr><td>Оля</td><td>6</td></tr>\n</table>\n')]]);
    const ins = s => { const p = ta.selectionStart; ta.value = ta.value.slice(0, p) + s + ta.value.slice(p); draw(); };
    const read = H.readout(panel, 'Код');
    H.note(panel, 'Ліворуч — HTML-код, праворуч — як його покаже браузер. Більшість тегів парні: <b>&lt;p&gt;</b>…<b>&lt;/p&gt;</b>. Заголовки: h1–h6, абзац: p, жирний: b, список: ul/ol + li.');
    ta.value = presets[0][1]; draw(); return { destroy() {} };
  });

  /* =============== Передавання даних пакетами =============== */
  reg('packets', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 380); const nodes = [[60, 190, 'A'], [180, 90], [180, 290], [300, 60], [300, 190], [300, 320], [420, 90], [420, 290], [540, 190, 'B']];
    const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8]];
    let msg = cfg.msg || 'ПРИВІТ, ЯК СПРАВИ?', size = 4, pk = [], got = [], down = -1, lost = 0;
    const nb = i => edges.filter(e => e.includes(i)).map(e => e[0] === i ? e[1] : e[0]);
    const route = () => { /* випадковий маршрут вперед */ const p = [0]; let c = 0, g = 0; while (c !== 8 && g++ < 20) { const opts = nb(c).filter(n => nodes[n][0] > nodes[c][0]); c = H.pick(opts.length ? opts : nb(c)); p.push(c); } return p; };
    const send = () => { pk = []; got = []; lost = 0; const parts = []; for (let i = 0; i < msg.length; i += size) parts.push(msg.slice(i, i + size)); parts.forEach((d, i) => pk.push({ n: i + 1, d, path: route(), s: -i * 0.35 - Math.random() * 0.3, done: false, lost: false })); };
    const draw = () => { const { ctx } = st; st.clear('#fff');
      edges.forEach(([a, b]) => { ctx.strokeStyle = (a === down || b === down) ? '#F3C1C2' : '#DAD7F5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(nodes[a][0], nodes[a][1]); ctx.lineTo(nodes[b][0], nodes[b][1]); ctx.stroke(); });
      nodes.forEach((n, i) => { if (n[2]) { text(ctx, '💻', n[0], n[1] + 12, { align: 'center', size: 36 }); text(ctx, n[2], n[0], n[1] + 40, { align: 'center', bold: true }); } else { ctx.fillStyle = i === down ? C.red : '#334155'; rrect(ctx, n[0] - 18, n[1] - 12, 36, 24, 6); ctx.fill(); text(ctx, i === down ? '✖' : '⇄', n[0], n[1] + 5, { align: 'center', color: '#fff', bold: true }); } });
      pk.forEach(p => { if (p.done || p.lost || p.s < 0) return; const seg = Math.floor(p.s), f = p.s - seg; const a = nodes[p.path[seg]], b = nodes[p.path[seg + 1]]; if (!b) return; const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
        ctx.fillStyle = C.orange; rrect(ctx, x - 16, y - 11, 32, 22, 5); ctx.fill(); text(ctx, '#' + p.n, x, y + 5, { align: 'center', bold: true, color: '#fff', size: 11 }); });
      const sorted = [...got].sort((a, b) => a.n - b.n), all = pk.length && got.length === pk.length;
      text(ctx, 'Отримано (за порядком надходження): ' + got.map(g => '#' + g.n).join(' '), 20, 24, { size: 12, color: C.mute });
      text(ctx, 'Зібрано: ' + (all ? sorted.map(g => g.d).join('') : sorted.map(g => g.d).join('·')), 20, 368, { bold: true, color: all ? C.green : C.ink });
      api.state = { n: Math.ceil(msg.length / size), len: msg.length };
      read.set([['Довжина повідомлення', msg.length + ' символів'], ['Розмір пакета', size + ' символи'], ['Кількість пакетів', Math.ceil(msg.length / size)], ['Доставлено', `${got.length} з ${pk.length}`], ['Втрачено й надіслано повторно', lost]]); };
    const lab = el('label', 'sim-ctl'); lab.innerHTML = '<span class="sim-ctl-l">Повідомлення</span>'; const mi = el('input', 'input'); mi.value = msg; mi.style.gridColumn = '1 / -1'; mi.oninput = () => { msg = mi.value.slice(0, 40); pk = []; got = []; draw(); }; lab.appendChild(mi); panel.appendChild(lab);
    H.slider(panel, { label: 'Розмір пакета', min: 1, max: 10, value: size, unit: 'симв.' }, v => { size = v; pk = []; got = []; draw(); });
    H.buttons(panel, [['📨 Надіслати', send, 'brand'], ['💥 Вимкнути маршрутизатор', () => { down = down === 4 ? -1 : 4; }]]);
    const read = H.readout(panel, 'Мережа');
    H.note(panel, 'В інтернеті дані діляться на <b>пакети</b>. Кожен пакет має номер і може йти власним маршрутом через маршрутизатори. Комп’ютер B збирає пакети за номерами. Якщо пакет загубився — його надсилають знову.');
    const stop = H.loop(dt => { pk.forEach(p => { if (p.done || p.lost) return; p.s += dt * (1.1 + Math.random() * 0.6); const seg = Math.floor(p.s);
      if (seg >= 0 && p.path[seg] === down) { p.lost = true; lost++; setTimeout(() => { let r; do { r = route(); } while (r.includes(down)); p.path = r; p.s = 0; p.lost = false; }, 600); }
      if (seg >= p.path.length - 1) { p.done = true; got.push(p); } }); draw(); });
    draw(); return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== Двійкове кодування =============== */
  css('sim-css-bin', `.bn-row{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}.bn-bit{width:58px;display:grid;gap:4px;text-align:center}
  .bn-bit button{height:64px;border-radius:12px;border:2px solid #DAD7F5;background:#fff;font-size:28px;font-weight:900;cursor:pointer}.bn-bit button.on{background:#4F46E5;color:#fff;border-color:#4F46E5}.bn-bit small{color:#6B6F8E;font-weight:700}`);
  reg('binary', (stage, panel, cfg, api) => {
    const box = el('div'); box.style.cssText = 'display:grid;gap:16px;padding:8px'; stage.appendChild(box); let bits = [0, 1, 0, 0, 0, 0, 0, 1], txt = 'Hi! Привіт';
    box.innerHTML = `<div class="bn-row" id="bb"></div><div id="bv" style="text-align:center;font-size:20px;font-weight:800"></div><hr style="border:0;border-top:1px solid #EEE;width:100%">
      <label style="font-weight:800">Текст → байти (кодування UTF-8)</label><input class="input" id="bt" value="${esc(txt)}"><div id="bo" style="font-family:ui-monospace,monospace;font-size:13px;line-height:1.7;word-break:break-all"></div>`;
    const draw = () => { const v = bits.reduce((a, b, i) => a + b * Math.pow(2, 7 - i), 0);
      box.querySelector('#bb').innerHTML = bits.map((b, i) => `<div class="bn-bit"><small>${Math.pow(2, 7 - i)}</small><button type="button" data-i="${i}" class="${b ? 'on' : ''}">${b}</button></div>`).join('');
      box.querySelector('#bv').innerHTML = `${bits.join('')}<sub>2</sub> = <span style="color:#4F46E5">${v}</span><sub>10</sub> = ${v.toString(16).toUpperCase().padStart(2, '0')}<sub>16</sub>${v >= 32 && v < 127 ? ` · символ ASCII: «<b>${esc(String.fromCharCode(v))}</b>»` : ''}`;
      const t = box.querySelector('#bt').value, by = [...new TextEncoder().encode(t)];
      box.querySelector('#bo').innerHTML = [...t].map(ch => { const b = [...new TextEncoder().encode(ch)]; return `<span title="${esc(ch)}" style="display:inline-block;margin:0 8px 4px 0;padding:2px 6px;border-radius:6px;background:${b.length > 1 ? '#FEF3C7' : '#EEF0FF'}"><b>${esc(ch === ' ' ? '␣' : ch)}</b> ${b.map(x => x.toString(2).padStart(8, '0')).join(' ')}</span>`; }).join('');
      api.state = { dec: v, bytes: by.length, bitsN: by.length * 8, chars: [...t].length };
      read.set([['Двійкове число', bits.join('')], ['Десяткове значення', v], ['Символів у тексті', [...t].length], ['Обсяг тексту', `${by.length} байт = ${by.length * 8} біт`]]); };
    box.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) { bits[+b.dataset.i] ^= 1; draw(); } });
    box.querySelector('#bt').oninput = draw;
    H.buttons(panel, [['🎲 Випадкове число', () => { const v = H.rnd(0, 255); bits = [...Array(8)].map((_, i) => (v >> (7 - i)) & 1); draw(); }, 'brand'], ['0️⃣ Усі нулі', () => { bits = bits.map(() => 0); draw(); }], ['1️⃣ Усі одиниці', () => { bits = bits.map(() => 1); draw(); }]]);
    const read = H.readout(panel, 'Кодування');
    H.note(panel, '1 <b>біт</b> — 0 або 1. 8 біт = 1 <b>байт</b>, ним можна закодувати 2⁸ = 256 різних значень (0–255). У UTF-8 латинська літера займає 1 байт, а кирилична — 2 байти. 1 КБ = 1024 байти.');
    draw(); return { destroy() {} };
  });

  /* =============== Векторна графіка: криві Безьє, колір RGB =============== */
  reg('vector', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 580, 400); let P = [[60, 320], [140, 60], [300, 60], [300, 230], [300, 400 - 30], [470, 360], [520, 120]], r = 79, g = 70, b = 229, closed = true, zoom = 1, sw = 4;
    const hex = () => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    const path = (ctx, k = 1, ox = 0, oy = 0) => { const T = p => [ox + p[0] * k, oy + p[1] * k]; ctx.beginPath(); ctx.moveTo(...T(P[0])); ctx.bezierCurveTo(...T(P[1]), ...T(P[2]), ...T(P[3])); ctx.bezierCurveTo(...T(P[4]), ...T(P[5]), ...T(P[6])); if (closed) ctx.closePath(); };
    let off = null; const raster = () => { off = document.createElement('canvas'); off.width = 116; off.height = 80; const c = off.getContext('2d'); c.scale(0.2, 0.2); path(c); c.fillStyle = hex(); if (closed) c.fill(); c.lineWidth = sw; c.strokeStyle = C.ink; c.stroke(); };
    const draw = () => { const { ctx } = st; st.clear('#fff');
      if (zoom > 1) { /* порівняння при збільшенні */ ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 290, 400); ctx.clip(); ctx.translate(145 - 290 * zoom, 200 - 200 * zoom); path(ctx, zoom); ctx.fillStyle = hex(); if (closed) ctx.fill(); ctx.lineWidth = sw * zoom; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore();
        raster(); ctx.save(); ctx.beginPath(); ctx.rect(290, 0, 290, 400); ctx.clip(); ctx.imageSmoothingEnabled = false; ctx.drawImage(off, 435 - 290 * zoom, 200 - 200 * zoom, 580 * zoom, 400 * zoom); ctx.restore();
        ctx.fillStyle = C.ink; ctx.fillRect(289, 0, 2, 400); text(ctx, 'вектор ×' + zoom, 10, 22, { bold: true, color: C.green }); text(ctx, 'растр ×' + zoom, 300, 22, { bold: true, color: C.red }); }
      else { path(ctx); ctx.fillStyle = hex(); if (closed) ctx.fill(); ctx.lineWidth = sw; ctx.strokeStyle = C.ink; ctx.stroke();
        ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); [[0, 1], [2, 3], [3, 4], [5, 6]].forEach(([a, c]) => { ctx.beginPath(); ctx.moveTo(...P[a]); ctx.lineTo(...P[c]); ctx.stroke(); }); ctx.setLineDash([]);
        P.forEach((p, i) => { const anchor = i % 3 === 0; ctx.fillStyle = anchor ? '#fff' : C.orange; ctx.strokeStyle = anchor ? C.brand : C.orange; ctx.lineWidth = 2.5; ctx.beginPath(); anchor ? ctx.rect(p[0] - 6, p[1] - 6, 12, 12) : ctx.arc(p[0], p[1], 6, 0, 7); ctx.fill(); ctx.stroke(); }); }
      api.state = { r, g, b, hex: hex() }; read.set([['Колір заливки', `<span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${hex()};vertical-align:-2px"></span> ${hex()}`], ['RGB', `(${r}, ${g}, ${b})`], ['Вузлів / маркерів', '3 вузли, 4 маркери']]); };
    let di = -1; H.drag(st, p => { if (zoom > 1) return false; di = P.findIndex(q => Math.hypot(q[0] - p.x, q[1] - p.y) < 12); return di >= 0; }, p => { const dx = p.x - P[di][0], dy = p.y - P[di][1]; P[di] = [p.x, p.y]; if (di === 3) { P[2] = [P[2][0] + dx, P[2][1] + dy]; P[4] = [P[4][0] + dx, P[4][1] + dy]; } draw(); });
    const rs = H.slider(panel, { label: 'R — червоний', min: 0, max: 255, value: r }, v => { r = v; draw(); });
    const gs = H.slider(panel, { label: 'G — зелений', min: 0, max: 255, value: g }, v => { g = v; draw(); });
    const bs = H.slider(panel, { label: 'B — синій', min: 0, max: 255, value: b }, v => { b = v; draw(); });
    H.seg(panel, { label: 'Швидкий колір', options: [['255,0,0', '🔴'], ['255,255,0', '🟡'], ['0,255,0', '🟢'], ['0,0,255', '🔵'], ['255,255,255', '⚪'], ['0,0,0', '⚫']], value: '' }, v => { [r, g, b] = v.split(',').map(Number); rs.set(r); gs.set(g); bs.set(b); draw(); });
    H.slider(panel, { label: 'Товщина контуру', min: 1, max: 16, value: sw, unit: 'px' }, v => { sw = v; draw(); });
    H.check(panel, { label: 'Замкнений контур (із заливкою)', value: true }, v => { closed = v; draw(); });
    H.seg(panel, { label: 'Збільшення', options: [['1', '×1'], ['4', '×4'], ['10', '×10']], value: '1' }, v => { zoom = +v; draw(); });
    const read = H.readout(panel, 'Об’єкт');
    H.note(panel, 'Векторна крива задається <b>вузлами</b> (квадратики) і <b>маркерами</b> (кружечки), які керують вигином. Тягни їх мишкою. При збільшенні вектор лишається чітким, а растр стає «пікселястим». Колір — суміш R, G, B від 0 до 255.');
    draw(); return { destroy: () => st.destroy() };
  });

  /* =============== Трасування програм Python =============== */
  css('sim-css-py', `.py-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:10px}.py-code{background:#0F172A;color:#E2E8F0;border-radius:12px;padding:10px 0;font:14px/1.6 ui-monospace,monospace;overflow:auto;min-height:260px}
  .py-code div{padding:0 12px;white-space:pre}.py-code div.cur{background:#4F46E5}.py-code i{color:#64748B;font-style:normal;display:inline-block;width:26px}
  .py-vars{border-collapse:collapse;width:100%;font-size:14px}.py-vars td{border-bottom:1px solid #EEE;padding:5px 8px}.py-vars td:first-child{font-weight:800;color:#4F46E5;font-family:ui-monospace,monospace}.py-vars tr.ch td{background:#FEF3C7}
  .py-out{background:#111827;color:#A7F3D0;border-radius:12px;padding:10px 12px;font:14px/1.5 ui-monospace,monospace;min-height:80px;white-space:pre-wrap;margin-top:10px}`);
  function pyCompile(code) {
    const lines = code.split('\n'), out = [], stack = [], names = new Set();
    const ex = s => s.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null').replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\s+/g, '!')
      .replace(/([\w\]\)]+)\s*\/\/\s*([\w(]+)/g, 'FDIV($1,$2)').replace(/\.append\(/g, '.push(').replace(/\.sort\(\)/g, '.sort((a,b)=>a-b)').replace(/\.upper\(\)/g, '.toUpperCase()').replace(/\.lower\(\)/g, '.toLowerCase()').replace(/\.index\(/g, '.indexOf(');
    lines.forEach((ln, i) => { const n = i + 1; if (!ln.trim() || ln.trim().startsWith('#')) { out.push(''); return; } const ind = ln.match(/^ */)[0].length; let s = ln.trim().replace(/\s+#.*$/, '');
      let isElse = /^(elif|else)\b/.test(s), close = '';
      while (stack.length && stack[stack.length - 1] >= ind + 1) { stack.pop(); close += '}'; }
      let m, js;
      if ((m = s.match(/^for\s+(\w+)\s+in\s+(.+):$/))) { names.add(m[1]); const it = m[2].startsWith('range(') ? 'RANGE' + m[2].slice(5) : ex(m[2]); js = `for (const __v${n} of ${it.startsWith('RANGE') ? it.replace(/^RANGE\((.*)\)$/, (q, a) => 'RANGE(' + ex(a) + ')') : it}) { yield ${n}; ${m[1]} = __v${n};`; stack.push(ind + 1); }
      else if ((m = s.match(/^while\s+(.+):$/))) { js = `while ((yield ${n}, ${ex(m[1])})) {`; stack.push(ind + 1); }
      else if ((m = s.match(/^if\s+(.+):$/))) { js = `yield ${n}; if (${ex(m[1])}) {`; stack.push(ind + 1); }
      else if ((m = s.match(/^elif\s+(.+):$/))) { js = ` else if ((yield ${n}, ${ex(m[1])})) {`; stack.push(ind + 1); }
      else if (/^else\s*:$/.test(s)) { js = ' else {'; stack.push(ind + 1); }
      else if ((m = s.match(/^print\((.*)\)$/))) js = `yield ${n}; OUT(${ex(m[1])});`;
      else if (s === 'break' || s === 'continue') js = `yield ${n}; ${s};`;
      else if (s === 'pass') js = `yield ${n};`;
      else if ((m = s.match(/^(\w+)\s*(\/\/=|\+=|-=|\*=|\/=|%=|=)\s*(.+)$/))) { names.add(m[1]); let rhs = ex(m[3]).replace(/\binput\((.*?)\)/g, 'INPUT($1)'); js = m[2] === '//=' ? `yield ${n}; ${m[1]} = FDIV(${m[1]}, ${rhs});` : `yield ${n}; ${m[1]} ${m[2]} ${rhs};`; }
      else js = `yield ${n}; ${ex(s)};`;
      if (close && isElse) out.push(close + js); else out.push(close + (close ? '\n' : '') + js);
    });
    out.push('}'.repeat(stack.length));
    return { js: out.join('\n'), names: [...names] };
  }
  reg('pytrace', (stage, panel, cfg, api) => {
    const progs = cfg.programs; let pi = 0, gen, V, prev = {}, line = 0, output = [], done = false, steps = 0, timer = null, inputs = [];
    const grid = el('div', 'py-grid'); stage.appendChild(grid);
    grid.innerHTML = '<div><div class="py-code"></div><div class="py-out"></div></div><div><b>Змінні</b><table class="py-vars"></table></div>';
    const codeEl = grid.querySelector('.py-code'), outEl = grid.querySelector('.py-out'), varsEl = grid.querySelector('.py-vars');
    const show = v => Array.isArray(v) ? '[' + v.map(show).join(', ') + ']' : typeof v === 'string' ? `'${v}'` : v === true ? 'True' : v === false ? 'False' : v === undefined ? '—' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6)) : String(v);
    const pstr = v => typeof v === 'string' ? v : show(v);
    const reset = () => { if (timer) { clearInterval(timer); timer = null; } const p = progs[pi]; const c = pyCompile(p.code); V = {}; c.names.forEach(n => V[n] = undefined); output = []; done = false; steps = 0; line = 0; prev = {}; inputs = [...(p.inputs || [])];
      const B = { RANGE: (a, b, s) => { if (b === undefined) { b = a; a = 0; } s = s || 1; const r = []; for (let i = a; s > 0 ? i < b : i > b; i += s) r.push(i); return r; }, LEN: x => x.length, len: x => x.length, int: x => Math.trunc(Number(x)), float: Number, str: x => pstr(x), abs: Math.abs, max: (...a) => Math.max(...(a.length === 1 ? a[0] : a)), min: (...a) => Math.min(...(a.length === 1 ? a[0] : a)), sum: a => a.reduce((s, x) => s + x, 0), round: (x, d) => Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0), FDIV: (a, b) => Math.floor(a / b), OUT: (...a) => output.push(a.map(pstr).join(' ')), INPUT: () => String(inputs.length ? inputs.shift() : '0') };
      try { gen = Function('V', 'B', 'return function*(){ with(B){ with(V){\n' + c.js + '\n} } }')(V, B)(); } catch (e) { gen = null; output = ['Помилка компіляції: ' + e.message]; }
      render(); };
    const step = () => { if (done || !gen) return; prev = Object.fromEntries(Object.entries(V).map(([k, v]) => [k, show(v)])); let r; try { r = gen.next(); } catch (e) { output.push('Помилка: ' + e.message); done = true; render(); return; } steps++; if (r.done || steps > 3000) { done = true; line = 0; } else line = r.value; render(); };
    const render = () => { const p = progs[pi]; codeEl.innerHTML = p.code.split('\n').map((l, i) => `<div class="${i + 1 === line ? 'cur' : ''}"><i>${i + 1}</i>${esc(l)}</div>`).join('');
      varsEl.innerHTML = Object.keys(V).map(k => `<tr class="${prev[k] !== undefined && prev[k] !== show(V[k]) ? 'ch' : ''}"><td>${k}</td><td>${esc(show(V[k]))}</td></tr>`).join('') || '<tr><td colspan=2 class="muted">ще немає змінних</td></tr>';
      outEl.textContent = output.join('\n') || '▸ Вивід програми з’явиться тут'; api.state = { out: output.join('\n'), last: output[output.length - 1], vars: { ...V }, steps };
      read.set([['Програма', p.name], ['Виконано кроків', steps], ['Поточний рядок', done ? 'кінець програми ✅' : line || '—'], ...(p.inputs ? [['Введення (input)', p.inputs.join(', ')]] : [])]); };
    H.select(panel, { label: 'Програма', options: progs.map((p, i) => [String(i), p.name]), value: '0' }, v => { pi = +v; reset(); });
    H.buttons(panel, [['⏭ Крок', step, 'brand'], ['▶ Виконати все', () => { if (timer) return; timer = setInterval(() => { step(); if (done) { clearInterval(timer); timer = null; } }, 260); }], ['⏮ Спочатку', reset]]);
    const read = H.readout(panel, 'Трасування');
    H.note(panel, cfg.note || 'Виконуй програму <b>покроково</b>: підсвічений рядок буде виконано наступним, жовтим позначено змінні, що щойно змінились. Так шукають помилки в програмах.');
    reset(); return { destroy: () => { if (timer) clearInterval(timer); } };
  });

  /* =============== Стиснення даних: RLE =============== */
  reg('compress', (stage, panel, cfg, api) => {
    const box = el('div'); box.style.cssText = 'display:grid;gap:12px;padding:6px'; stage.appendChild(box); let src = cfg.text || 'AAAAAABBBCCCCCCCCDAAAA';
    box.innerHTML = `<label style="font-weight:800">Вихідні дані</label><input class="input" id="cs" style="font-family:ui-monospace,monospace;font-size:18px" value="${esc(src)}">
      <div id="cp" style="display:flex;flex-wrap:wrap;gap:2px"></div><label style="font-weight:800">Стиснуто методом RLE (кількість + символ)</label><div id="co" style="font-family:ui-monospace,monospace;font-size:18px;padding:10px 12px;background:#F7F6FF;border-radius:12px;word-break:break-all"></div>
      <div style="height:26px;border-radius:13px;background:#EEE;overflow:hidden;position:relative"><div id="cb" style="height:100%;background:#16A34A;transition:width .3s"></div><span id="cl" style="position:absolute;inset:0;display:grid;place-items:center;font-weight:800;font-size:13px"></span></div>`;
    const cols = {}; const pal = ['#4F46E5', '#F59E0B', '#16A34A', '#E5484D', '#22D3EE', '#EC4899', '#A16207', '#1F2340'];
    const rle = s => { const out = []; for (let i = 0; i < s.length;) { let j = i; while (j < s.length && s[j] === s[i] && j - i < 99) j++; out.push([j - i, s[i]]); i = j; } return out; };
    const draw = () => { src = box.querySelector('#cs').value; const r = rle(src), code = r.map(([n, c]) => n + c).join(''), ratio = src.length ? code.length / src.length : 1;
      box.querySelector('#cp').innerHTML = [...src].map(ch => { if (!cols[ch]) cols[ch] = pal[Object.keys(cols).length % pal.length]; return `<span style="width:22px;height:22px;border-radius:5px;background:${cols[ch]};color:#fff;font:700 12px ui-monospace;display:grid;place-items:center">${esc(ch)}</span>`; }).join('');
      box.querySelector('#co').innerHTML = r.map(([n, c]) => `<span style="color:${cols[c]}"><b>${n}</b>${esc(c)}</span>`).join(' ');
      box.querySelector('#cb').style.width = Math.min(100, ratio * 100) + '%'; box.querySelector('#cl').textContent = `${code.length} з ${src.length} символів (${fmt(ratio * 100, 0)}%)${ratio > 1 ? ' — стало більше!' : ''}`;
      api.state = { orig: src.length, comp: code.length, ratio, code }; read.set([['Було символів', src.length], ['Стало символів', code.length], ['Коефіцієнт стиснення', fmt(src.length / Math.max(1, code.length), 2)], ['Код', esc(code)]]); };
    box.querySelector('#cs').oninput = draw;
    H.select(panel, { label: 'Приклади даних', options: [['AAAAAABBBCCCCCCCCDAAAA', 'рядок з повтореннями'], ['WWWWWWWWWWBBWWWWWWWWWW', 'рядок пікселів (W — білий, B — чорний)'], ['ABCDEFGH', 'без повторень'], ['ЛЛЛЛЛЛМММММННННННННН', 'кирилиця']], value: src }, v => { box.querySelector('#cs').value = v; draw(); });
    const read = H.readout(panel, 'Стиснення');
    H.note(panel, 'Алгоритм <b>RLE</b> замінює серію однакових символів на «кількість + символ». Він добре стискає дані з довгими повтореннями (наприклад, малюнки з великими однотонними ділянками) і може навіть збільшити дані без повторень. Це стиснення <b>без втрат</b>.');
    draw(); return { destroy() {} };
  });

  /* =============== Алгоритми впорядкування і пошуку =============== */
  reg('sorting', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 360); let n = 10, arr, alg = 'bubble', gen, cur = {}, cmp = 0, swp = 0, done = false, timer = null, target;
    function* bubble(a) { for (let i = 0; i < a.length - 1; i++) { let sw = false; for (let j = 0; j < a.length - 1 - i; j++) { cmp++; yield { c: [j, j + 1], s: a.length - i }; if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; swp++; sw = true; yield { c: [j, j + 1], w: true, s: a.length - i }; } } if (!sw) break; } }
    function* selection(a) { for (let i = 0; i < a.length - 1; i++) { let m = i; for (let j = i + 1; j < a.length; j++) { cmp++; yield { c: [m, j], s0: i }; if (a[j] < a[m]) m = j; } if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; swp++; yield { c: [i, m], w: true, s0: i + 1 }; } } }
    function* insertion(a) { for (let i = 1; i < a.length; i++) { let j = i; while (j > 0) { cmp++; yield { c: [j - 1, j] }; if (a[j - 1] > a[j]) { [a[j - 1], a[j]] = [a[j], a[j - 1]]; swp++; yield { c: [j - 1, j], w: true }; j--; } else break; } } }
    function* linear(a) { for (let i = 0; i < a.length; i++) { cmp++; yield { c: [i] }; if (a[i] === target) { yield { f: i }; return; } } yield { f: -1 }; }
    function* binary(a) { a.sort((x, y) => x - y); let lo = 0, hi = a.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; cmp++; yield { c: [m], lo, hi }; if (a[m] === target) { yield { f: m }; return; } if (a[m] < target) lo = m + 1; else hi = m - 1; } yield { f: -1 }; }
    const G = { bubble, selection, insertion, linear, binary };
    const fresh = () => { if (timer) { clearInterval(timer); timer = null; } const pool = H.shuffle([...Array(30)].map((_, i) => i + 1)); arr = pool.slice(0, n); target = H.pick(arr); reset(); };
    const reset = () => { if (timer) { clearInterval(timer); timer = null; } cmp = swp = 0; done = false; cur = {}; work = [...arr]; gen = G[alg](work); draw(); };
    let work = [];
    const step = () => { if (done) return; const r = gen.next(); if (r.done) { done = true; cur = { end: true }; } else cur = r.value; if (cur.f !== undefined) done = true; draw(); };
    const draw = () => { const { ctx } = st; st.clear('#fff'); const W = 560 / work.length, mx = 30; const search = alg === 'linear' || alg === 'binary';
      work.forEach((v, i) => { const h = v / mx * 260, x = 20 + i * W; let col = '#C7D2FE';
        if (cur.c && cur.c.includes(i)) col = cur.w ? C.red : C.orange; if (!search && (cur.end || (cur.s != null && i >= cur.s) || (cur.s0 != null && i < cur.s0))) col = '#86EFAC';
        if (search && cur.lo != null && (i < cur.lo || i > cur.hi)) col = '#EEE'; if (cur.f === i) col = C.green;
        ctx.fillStyle = col; rrect(ctx, x + 3, 300 - h, W - 6, h, 5); ctx.fill(); text(ctx, v, x + W / 2, 320, { align: 'center', bold: true, size: 13 }); text(ctx, i, x + W / 2, 340, { align: 'center', size: 10, color: C.mute }); });
      if (search) text(ctx, `Шукаємо число ${target}` + (cur.f !== undefined ? (cur.f >= 0 ? ` — знайдено на позиції ${cur.f} ✅` : ' — не знайдено') : ''), 20, 26, { bold: true, size: 15 });
      const sorted = work.every((v, i) => !i || work[i - 1] <= v);
      api.state = { cmp, swp, done, sorted, n: work.length, target };
      read.set([['Порівнянь', cmp], ...(search ? [] : [['Обмінів', swp]]), ['Стан', done ? (search ? 'пошук завершено' : 'впорядковано ✅') : 'виконується…']]); };
    H.select(panel, { label: 'Алгоритм', options: [['bubble', 'бульбашкове впорядкування'], ['selection', 'впорядкування вибором'], ['insertion', 'впорядкування вставками'], ['linear', 'лінійний пошук'], ['binary', 'двійковий (бінарний) пошук']], value: alg }, v => { alg = v; reset(); });
    H.slider(panel, { label: 'Кількість елементів', min: 5, max: 16, value: n }, v => { n = v; fresh(); });
    H.buttons(panel, [['⏭ Крок', step, 'brand'], ['▶ Авто', () => { if (timer) { clearInterval(timer); timer = null; return; } timer = setInterval(() => { step(); if (done) { clearInterval(timer); timer = null; } }, 220); }], ['⏮ Спочатку', reset], ['🎲 Новий масив', fresh]]);
    const read = H.readout(panel, 'Лічильники');
    H.note(panel, 'Помаранчевим — елементи, які порівнюють, червоним — обмін, зеленим — вже на своєму місці. Двійковий пошук працює лише у <b>впорядкованому</b> масиві та щоразу відкидає половину елементів.');
    fresh(); return { destroy: () => { if (timer) clearInterval(timer); st.destroy(); } };
  });

  /* =============== Тривимірна графіка =============== */
  const SHAPES = {
    cube: { n: 'куб', v: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], f: [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [2, 6, 7, 3], [1, 5, 6, 2], [0, 3, 7, 4]], vol: 1 },
    pyramid: { n: 'чотирикутна піраміда', v: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1], [0, -1, 0]], f: [[0, 3, 2, 1], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]], vol: 1 / 3 },
    prism: { n: 'трикутна призма', v: [[-1, 1, -0.8], [1, 1, -0.8], [0, -0.8, -0.8], [-1, 1, 0.8], [1, 1, 0.8], [0, -0.8, 0.8]], f: [[0, 2, 1], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]], vol: null },
    octa: { n: 'октаедр', v: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], f: [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]], vol: null } };
  reg('3d', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 560, 420); let sh = 'cube', rx = -25, ry = 35, rz = 0, sx = 1, sy = 1, sz = 1, mx = 0, wire = false, light = true, col = [79, 70, 229], auto = false;
    const draw = () => { const { ctx } = st; st.clear('#F8FAFC'); const S = SHAPES[sh], k = Math.PI / 180;
      ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1; for (let i = -6; i <= 6; i++) { const p = (x, z) => proj([x, 1.6, z]); const [a, b] = [p(i, -6), p(i, 6)], [c, d] = [p(-6, i), p(6, i)]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); }
      function rot(p) { let [x, y, z] = p; let t; t = Math.cos(ry * k) * x + Math.sin(ry * k) * z; z = -Math.sin(ry * k) * x + Math.cos(ry * k) * z; x = t; t = Math.cos(rx * k) * y - Math.sin(rx * k) * z; z = Math.sin(rx * k) * y + Math.cos(rx * k) * z; y = t; return [x, y, z]; }
      function proj(p) { const [x, y, z] = rot(p); const d = 7 / (7 + z); return [280 + x * 90 * d, 210 + y * 90 * d, z]; }
      const pts = S.v.map(([x, y, z]) => { const a = rz * k; const X = x * sx, Y = y * sy, Z = z * sz; return [X * Math.cos(a) - Y * Math.sin(a) + mx, X * Math.sin(a) + Y * Math.cos(a), Z]; });
      const P2 = pts.map(proj), R3 = pts.map(rot);
      const faces = S.f.map(f => { const z = f.reduce((s, i) => s + R3[i][2], 0) / f.length; const [a, b, c] = [R3[f[0]], R3[f[1]], R3[f[2]]]; const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; const nrm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const L = Math.hypot(...nrm) || 1; const sh2 = Math.max(0, (-nrm[0] * 0.4 - nrm[1] * 0.6 - nrm[2] * 0.7) / L); return { f, z, sh: sh2 }; }).sort((a, b) => b.z - a.z);
      faces.forEach(({ f, sh: s }) => { ctx.beginPath(); f.forEach((i, j) => j ? ctx.lineTo(P2[i][0], P2[i][1]) : ctx.moveTo(P2[i][0], P2[i][1])); ctx.closePath(); if (!wire) { const m = light ? 0.35 + 0.65 * s : 1; ctx.fillStyle = `rgb(${col.map(c => Math.round(c * m + (light ? 30 * s : 0))).join(',')})`; ctx.fill(); } ctx.strokeStyle = wire ? C.brand : 'rgba(15,23,42,.35)'; ctx.lineWidth = wire ? 2 : 1; ctx.stroke(); });
      if (wire) P2.forEach(p => { ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 7); ctx.fill(); });
      const E = new Set(); S.f.forEach(f => f.forEach((a, i) => { const b = f[(i + 1) % f.length]; E.add(Math.min(a, b) + '-' + Math.max(a, b)); }));
      const vol = S.vol != null ? S.vol * 8 * sx * sy * sz : null;
      api.state = { V: S.v.length, E: E.size, F: S.f.length, vol, sx, sy, sz };
      read.set([['Об’єкт', S.n], ['Вершин V / ребер E / граней F', `${S.v.length} / ${E.size} / ${S.f.length}`], ['Формула Ейлера V − E + F', S.v.length - E.size + S.f.length], ['Масштаб (X, Y, Z)', `${fmt(sx, 1)}, ${fmt(sy, 1)}, ${fmt(sz, 1)}`], ...(vol != null ? [['Об’єм (ребро куба 2 од.)', fmt(vol, 2) + ' куб. од.']] : [])]); };
    H.select(panel, { label: 'Об’єкт', options: Object.entries(SHAPES).map(([k, s]) => [k, s.n]), value: sh }, v => { sh = v; draw(); });
    const rys = H.slider(panel, { label: 'Обертання навколо Y', min: -180, max: 180, step: 5, value: ry, unit: '°' }, v => { ry = v; draw(); });
    H.slider(panel, { label: 'Обертання навколо X', min: -90, max: 90, step: 5, value: rx, unit: '°' }, v => { rx = v; draw(); });
    H.slider(panel, { label: 'Обертання навколо Z', min: -180, max: 180, step: 5, value: rz, unit: '°' }, v => { rz = v; draw(); });
    H.slider(panel, { label: 'Масштаб X', min: 0.5, max: 2, step: 0.1, value: sx }, v => { sx = v; draw(); });
    H.slider(panel, { label: 'Масштаб Y', min: 0.5, max: 2, step: 0.1, value: sy }, v => { sy = v; draw(); });
    H.slider(panel, { label: 'Масштаб Z', min: 0.5, max: 2, step: 0.1, value: sz }, v => { sz = v; draw(); });
    H.slider(panel, { label: 'Переміщення по X', min: -1.5, max: 1.5, step: 0.1, value: mx }, v => { mx = v; draw(); });
    H.seg(panel, { label: 'Матеріал (колір)', options: [['79,70,229', '🟣'], ['229,72,77', '🔴'], ['22,163,74', '🟢'], ['245,158,11', '🟠'], ['200,200,210', '⚪']], value: '79,70,229' }, v => { col = v.split(',').map(Number); draw(); });
    H.check(panel, { label: 'Каркас (вершини та ребра)', value: false }, v => { wire = v; draw(); });
    H.check(panel, { label: 'Освітлення', value: true }, v => { light = v; draw(); });
    H.check(panel, { label: 'Автообертання', value: false }, v => { auto = v; });
    const read = H.readout(panel, 'Модель');
    H.note(panel, 'Тривимірна модель складається з <b>вершин</b>, <b>ребер</b> і <b>граней</b>. Трансформації: переміщення, обертання, масштабування. Освітлення робить грані різними за яскравістю, а рендеринг перетворює сцену на зображення.');
    const stop = H.loop(dt => { if (auto) { ry = ((ry + dt * 40 + 180) % 360) - 180; rys.set(Math.round(ry)); draw(); } });
    draw(); return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== База даних: фільтри, сортування, запити =============== */
  css('sim-css-db', `.db-t{border-collapse:collapse;width:100%;font-size:13.5px}.db-t th{background:#EEF0FF;color:#4F46E5;text-align:left;padding:6px 8px;position:sticky;top:0}.db-t td{padding:5px 8px;border-bottom:1px solid #EEE}.db-t tr.hit td{background:#F0FDF4}
  .db-w{max-height:400px;overflow:auto;border-radius:12px;border:2px solid #EEF0FF}`);
  reg('dbfilter', (stage, panel, cfg, api) => {
    const T = cfg.table, F = T.fields; let c1 = { f: F[0].k, op: 'all', v: '' }, c2 = { f: F[0].k, op: 'all', v: '' }, join = 'and', sortF = '', desc = false, agg = (F.find(f => f.n) || F[0]).k;
    const w = el('div', 'db-w'); stage.appendChild(w); const cap = el('div'); cap.style.cssText = 'font-weight:800;margin:8px 4px 0'; stage.appendChild(cap);
    const idx = k => F.findIndex(f => f.k === k);
    const test = (row, c) => { if (c.op === 'all') return true; const x = row[idx(c.f)], isN = F[idx(c.f)].n, v = isN ? parseFloat(String(c.v).replace(',', '.')) : String(c.v).toLowerCase(), xx = isN ? x : String(x).toLowerCase();
      return c.op === '=' ? xx == v : c.op === '≠' ? xx != v : c.op === '>' ? xx > v : c.op === '<' ? xx < v : c.op === '≥' ? xx >= v : c.op === '≤' ? xx <= v : String(xx).includes(v); };
    const draw = () => { let rows = T.rows.filter(r => join === 'and' ? test(r, c1) && test(r, c2) : (c1.op === 'all' && c2.op === 'all') || (c1.op !== 'all' && test(r, c1)) || (c2.op !== 'all' && test(r, c2)));
      if (sortF) { const i = idx(sortF); rows = [...rows].sort((a, b) => (a[i] > b[i] ? 1 : a[i] < b[i] ? -1 : 0) * (desc ? -1 : 1)); }
      w.innerHTML = `<table class="db-t"><tr>${F.map(f => `<th>${esc(f.t)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(x => `<td>${esc(typeof x === 'number' ? fmt(x, 2) : x)}</td>`).join('')}</tr>`).join('')}</table>`;
      const ai = idx(agg), nums = rows.map(r => r[ai]).filter(x => typeof x === 'number'), sum = nums.reduce((a, b) => a + b, 0);
      cap.textContent = `Запит повернув ${rows.length} записів із ${T.rows.length}`;
      api.state = { count: rows.length, sum, avg: nums.length ? sum / nums.length : 0, max: nums.length ? Math.max(...nums) : 0, min: nums.length ? Math.min(...nums) : 0, first: rows[0] };
      read.set([['Записів', rows.length], ...(F[ai].n ? [[`Сума «${F[ai].t}»`, fmt(sum, 2)], ['Середнє', nums.length ? fmt(sum / nums.length, 2) : '—'], ['Максимум / мінімум', nums.length ? `${fmt(Math.max(...nums), 2)} / ${fmt(Math.min(...nums), 2)}` : '—']] : [])]); };
    const ops = [['all', '— без умови —'], ['=', '='], ['≠', '≠'], ['>', '>'], ['<', '<'], ['≥', '≥'], ['≤', '≤'], ['has', 'містить']];
    const cond = (c, lab) => { const wr = el('div', 'sim-ctl'); wr.innerHTML = `<span class="sim-ctl-l">${lab}</span><div style="grid-column:1/-1;display:grid;grid-template-columns:1.2fr .9fr 1fr;gap:4px"><select>${F.map(f => `<option value="${f.k}">${esc(f.t)}</option>`).join('')}</select><select>${ops.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select><input class="input" placeholder="значення"></div>`;
      const [sf, so] = wr.querySelectorAll('select'), si = wr.querySelector('input'); [sf, so].forEach(s => s.style.cssText = 'padding:6px;border-radius:8px;border:2px solid #DAD7F5;font:inherit');
      sf.onchange = () => { c.f = sf.value; draw(); }; so.onchange = () => { c.op = so.value; draw(); }; si.oninput = () => { c.v = si.value; draw(); }; panel.appendChild(wr); };
    cond(c1, 'Умова 1 (поле, оператор, значення)');
    H.seg(panel, { label: 'Зв’язок умов', options: [['and', 'І (AND)'], ['or', 'АБО (OR)']], value: 'and' }, v => { join = v; draw(); });
    cond(c2, 'Умова 2');
    H.select(panel, { label: 'Упорядкувати за', options: [['', '— без сортування —'], ...F.map(f => [f.k, f.t])], value: '' }, v => { sortF = v; draw(); });
    H.check(panel, { label: 'За спаданням', value: false }, v => { desc = v; draw(); });
    H.select(panel, { label: 'Підсумки для поля', options: F.filter(f => f.n).map(f => [f.k, f.t]), value: agg }, v => { agg = v; draw(); });
    const read = H.readout(panel, 'Підсумки запиту');
    H.note(panel, cfg.note || '<b>Запит</b> відбирає записи, що задовольняють умови (критерії). Умови «І» мають виконуватися обидві, «АБО» — хоча б одна. Поле, значення якого не повторюються, може бути <b>первинним ключем</b>.');
    draw(); return { destroy() {} };
  });
})();
