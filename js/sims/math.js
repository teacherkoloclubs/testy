/* Симуляції з математики (5–6 класи) */
(function () {
  const { reg, H } = window.Sims;
  const { fmt, text, arrow, rrect } = H;
  const C = { ink: '#1F2340', mute: '#6B6F8E', brand: '#4F46E5', blue: '#2563EB', red: '#E5484D', green: '#16A34A', orange: '#F59E0B', pink: '#EC4899', soft: '#EEF0FF', sky: '#F4F7FF' };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const lcm = (a, b) => a / gcd(a, b) * b;
  const frac = (n, d) => { const g = gcd(n, d); n /= g; d /= g; if (d < 0) { n = -n; d = -d; } return [n, d]; };
  const ftxt = (n, d) => { [n, d] = frac(n, d); if (d === 1) return String(n).replace('-', '−'); const neg = n < 0, an = Math.abs(n), w = Math.floor(an / d), r = an % d; return (neg ? '−' : '') + (w ? w + ' ' : '') + r + '/' + d; };
  /* малювання дробу «стовпчиком» */
  const fdraw = (ctx, n, d, x, y, o = {}) => { const sz = o.size || 18; ctx.save(); ctx.font = `700 ${sz}px Inter, sans-serif`; ctx.fillStyle = o.color || C.ink; ctx.textAlign = 'center';
    const w = Math.max(ctx.measureText(String(n)).width, ctx.measureText(String(d)).width) + 6; ctx.fillText(n, x, y - 4); ctx.fillText(d, x, y + sz + 2); ctx.fillRect(x - w / 2, y + 1, w, 2); ctx.restore(); return w; };

  /* =============== Координатний промінь =============== */
  reg('numray', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 300);
    let step = 1, unit = 5, A, B, P, show = false, msg;
    const X0 = 40, PX = 26; /* пікселів на поділку */
    const gen = () => { const n = Math.floor(520 / PX); A = H.rnd(2, n - 2) * step; do { B = H.rnd(2, n - 2) * step; } while (B === A); P = 0; draw(); };
    const xp = v => X0 + v / step * PX;
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const n = Math.floor(540 / PX), y = 150;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(585, y); ctx.stroke(); arrow(ctx, 570, y, 590, y, C.ink, 2.5);
      for (let i = 0; i <= n; i++) { const big = i % unit === 0; ctx.fillStyle = C.ink; ctx.fillRect(xp(i * step) - 1, y - (big ? 12 : 6), 2, big ? 24 : 12); if (big && i <= unit) text(ctx, fmt(i * step, 2), xp(i * step), y + 30, { align: 'center', bold: true }); }
      text(ctx, 'O', X0 - 4, y - 18, { bold: true, align: 'center' });
      const pt = (v, l, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(xp(v), y, 7, 0, 7); ctx.fill(); text(ctx, l, xp(v), y - 22, { align: 'center', bold: true, color: col, size: 16 }); };
      pt(A, show ? `A(${fmt(A, 2)})` : 'A', C.red); pt(B, show ? `B(${fmt(B, 2)})` : 'B', C.blue);
      ctx.fillStyle = C.green; ctx.beginPath(); ctx.moveTo(xp(P), y + 8); ctx.lineTo(xp(P) - 9, y + 26); ctx.lineTo(xp(P) + 9, y + 26); ctx.fill(); text(ctx, `M(${fmt(P, 2)})`, xp(P), y + 64, { align: 'center', bold: true, color: C.green, size: 15 });
      text(ctx, '⇆ перетягни зелений трикутник', 300, 270, { align: 'center', size: 11, color: C.mute });
      api.state = { a: A, b: B, p: P, d: Math.abs(A - B) };
      read.set([['Ціна поділки', fmt(step, 2)], ['Одиничний відрізок', unit + ' поділок'], ['Точка M', fmt(P, 2)], ['Відстань AB', show ? fmt(Math.abs(A - B), 2) : '?']]);
    };
    H.select(panel, { label: 'Ціна поділки', options: [['1', '1'], ['2', '2'], ['5', '5'], ['10', '10'], ['100', '100']], value: '1' }, v => { step = +v; gen(); });
    H.select(panel, { label: 'Підписано через', options: [['5', '5 поділок'], ['10', '10 поділок'], ['2', '2 поділки']], value: '5' }, v => { unit = +v; draw(); });
    H.buttons(panel, [['🎲 Нові точки', gen, 'brand']]);
    H.check(panel, { label: 'Показати координати A і B', value: false }, v => { show = v; draw(); });
    const read = H.readout(panel, 'Промінь');
    H.note(panel, 'Щоб знайти координату точки, порахуй, скільки поділок від початку відліку O, і помнож на ціну поділки.');
    H.drag(st, p => Math.abs(p.x - xp(P)) < 16 && p.y > 150, p => { P = Math.max(0, Math.round((p.x - X0) / PX)) * step; P = Math.min(P, Math.floor(540 / PX) * step); draw(); });
    gen(); void msg;
    return { destroy: () => st.destroy() };
  });

  /* =============== Терези: рівняння =============== */
  reg('balance', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 360);
    let x, k, a, L, R, Lk, tilt = 0;
    const gen = () => { x = H.rnd(2, 9); k = H.pick([1, 1, 2, 3]); a = H.rnd(1, 6); Lk = k; L = a; R = k * x + a; tilt = 0; draw(); };
    const eqTxt = () => `${Lk > 1 ? Lk : ''}x${L ? ' + ' + L : ''} = ${R}`;
    const draw = () => {
      const { ctx } = st; st.clear(C.sky);
      const lw = Lk * x + L, rw = R, t = Math.max(-0.2, Math.min(0.2, (rw - lw) * 0.05)); tilt += (t - tilt) * 0.3;
      const cx = 300, cy = 110; ctx.fillStyle = '#7A6A58'; ctx.fillRect(cx - 6, cy, 12, 200); ctx.beginPath(); ctx.moveTo(cx - 60, 320); ctx.lineTo(cx + 60, 320); ctx.lineTo(cx, 300); ctx.fill();
      const dx = Math.cos(tilt) * 200, dy = Math.sin(tilt) * 200;
      ctx.strokeStyle = '#5B4A3A'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx - dx, cy - dy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
      const pan = (px, py, boxes, units) => { ctx.strokeStyle = '#8D7B67'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 70, py + 80); ctx.moveTo(px, py); ctx.lineTo(px + 70, py + 80); ctx.stroke();
        ctx.fillStyle = '#B9A58E'; ctx.fillRect(px - 85, py + 80, 170, 8);
        let ix = 0; for (let i = 0; i < boxes; i++) { ctx.fillStyle = C.brand; rrect(ctx, px - 80 + ix, py + 46, 32, 32, 6); ctx.fill(); text(ctx, 'x', px - 64 + ix, py + 69, { align: 'center', color: '#fff', bold: true, size: 18 }); ix += 36; }
        for (let i = 0; i < units; i++) { const col = Math.floor(i / 3), row = i % 3; const ux = px - 80 + ix + col * 20, uy = py + 62 - row * 18; if (ux > px + 70) continue; ctx.fillStyle = C.orange; rrect(ctx, ux, uy, 18, 16, 3); ctx.fill(); }
        if (units > 0) text(ctx, String(units), px + 60, py + 108, { align: 'center', bold: true, color: C.orange }); };
      pan(cx - dx, cy - dy, Lk, L); pan(cx + dx, cy + dy, 0, R);
      text(ctx, eqTxt(), cx, 40, { align: 'center', bold: true, size: 26, color: C.ink });
      const solved = Lk === 1 && L === 0;
      api.state = { x, a, k, b: k * x + a };
      read.set([['Рівняння', eqTxt()], ['Стан', solved ? '✅ x = ' + R : 'розв’язуємо…']]);
    };
    H.buttons(panel, [['➖ Прибрати по 1 з обох шальок', () => { if (L > 0) { L--; R--; } draw(); }, 'brand'], ['➖ Прибрати лише зліва', () => { if (L > 0) L--; draw(); }], ['➗ Поділити обидві на ' + 'коеф.', () => { if (L === 0 && Lk > 1) { R /= Lk; Lk = 1; } draw(); }], ['🎲 Нове рівняння', gen]]);
    const read = H.readout(panel, 'Терези');
    H.note(panel, 'Терези в рівновазі, поки з обома шальками роблять <b>однакові дії</b>. Так само розв’язують рівняння: щоб знайти невідомий доданок, від суми віднімають відомий доданок.');
    const stop = H.loop(() => draw());
    gen();
    return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== Площа прямокутника і об’єм паралелепіпеда =============== */
  reg('area', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 380);
    let a = 5, b = 3, c = 2, mode = cfg && cfg.mode || 'rect';
    const draw = () => {
      const { ctx } = st; st.clear('#fff');
      if (mode === 'rect') { const s = Math.min(48, 520 / a, 300 / b), x0 = (600 - a * s) / 2, y0 = (360 - b * s) / 2 + 10;
        for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) { ctx.fillStyle = (i + j) % 2 ? '#C7D2FE' : '#E0E7FF'; ctx.fillRect(x0 + i * s, y0 + j * s, s, s); }
        ctx.strokeStyle = C.brand; ctx.lineWidth = 3; ctx.strokeRect(x0, y0, a * s, b * s);
        text(ctx, a + ' см', x0 + a * s / 2, y0 - 10, { align: 'center', bold: true }); text(ctx, b + ' см', x0 - 10, y0 + b * s / 2 + 4, { align: 'right', bold: true });
        text(ctx, '1 клітинка = 1 см²', 300, 370, { align: 'center', size: 11, color: C.mute });
      } else { const s = Math.min(34, 330 / (a + c * 0.6), 260 / (c + b * 0.5)), ox = 300 - (a * s + b * s * 0.6) / 2, oy = 330;
        const P = (i, j, k) => [ox + i * s + j * s * 0.6, oy - k * s - j * s * 0.45];
        const face = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke(); };
        ctx.strokeStyle = '#3730A3'; ctx.lineWidth = 1;
        for (let k = 0; k < c; k++) for (let j = b - 1; j >= 0; j--) for (let i = 0; i < a; i++) {
          face([P(i, j, k + 1), P(i + 1, j, k + 1), P(i + 1, j + 1, k + 1), P(i, j + 1, k + 1)], '#C7D2FE');
          face([P(i, j, k), P(i + 1, j, k), P(i + 1, j, k + 1), P(i, j, k + 1)], '#818CF8');
          face([P(i + 1, j, k), P(i + 1, j + 1, k), P(i + 1, j + 1, k + 1), P(i + 1, j, k + 1)], '#6366F1'); }
        const [x1, y1] = P(a / 2, 0, 0); text(ctx, 'a = ' + a, x1, y1 + 20, { align: 'center', bold: true });
        const [x2, y2] = P(a, b / 2, 0); text(ctx, 'b = ' + b, x2 + 12, y2 + 10, { bold: true });
        const [x3, y3] = P(0, 0, c / 2); text(ctx, 'c = ' + c, x3 - 8, y3, { align: 'right', bold: true });
        text(ctx, '1 кубик = 1 см³', 300, 372, { align: 'center', size: 11, color: C.mute }); }
      api.state = { S: a * b, P: 2 * (a + b), V: a * b * c, Sp: 2 * (a * b + b * c + a * c) };
      read.set(mode === 'rect' ? [['Площа S = a · b', a * b + ' см²'], ['Периметр P = 2(a + b)', 2 * (a + b) + ' см']] : [['Об’єм V = a · b · c', a * b * c + ' см³'], ['Площа поверхні', 2 * (a * b + b * c + a * c) + ' см²'], ['Сума довжин ребер', 4 * (a + b + c) + ' см']]);
    };
    H.seg(panel, { label: 'Фігура', options: [['rect', '▭ прямокутник'], ['box', '🧊 паралелепіпед']], value: mode }, v => { mode = v; cs.el.style.display = v === 'box' ? '' : 'none'; draw(); });
    H.slider(panel, { label: 'Довжина a', min: 1, max: 10, value: a, unit: 'см' }, v => { a = v; draw(); });
    H.slider(panel, { label: 'Ширина b', min: 1, max: 8, value: b, unit: 'см' }, v => { b = v; draw(); });
    const cs = H.slider(panel, { label: 'Висота c', min: 1, max: 6, value: c, unit: 'см' }, v => { c = v; draw(); }); cs.el.style.display = mode === 'box' ? '' : 'none';
    const read = H.readout(panel, 'Обчислення');
    H.note(panel, 'Площа показує, скільки одиничних квадратів уміщує фігура, а об’єм — скільки одиничних кубів уміщує тіло.');
    draw();
    return { destroy: () => st.destroy() };
  });

  /* =============== Звичайні дроби: конструктор =============== */
  reg('fraction', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 360);
    let n = 4, m = 3, shape = 'circle', cmp = false, n2 = 3, m2 = 2;
    const geo = (d, mm) => { const whole = Math.max(1, Math.ceil(mm / d)); return whole; };
    const pies = (ctx, d, mm, y, col, sz) => { const w = geo(d, mm), r = sz, gap = 14; const tot = w * (shape === 'circle' ? 2 * r : 2.4 * r) + (w - 1) * gap; let x0 = 300 - tot / 2; const hits = [];
      for (let k = 0; k < w; k++) { if (shape === 'circle') { const cx = x0 + r; for (let i = 0; i < d; i++) { const a0 = -Math.PI / 2 + i / d * Math.PI * 2, a1 = a0 + Math.PI * 2 / d; const on = k * d + i < mm;
          ctx.fillStyle = on ? col : '#F1F1F6'; ctx.beginPath(); ctx.moveTo(cx, y); ctx.arc(cx, y, r, a0, a1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); hits.push({ cx, cy: y, r, a0, a1, idx: k * d + i }); }
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, y, r, 0, 7); ctx.stroke(); x0 += 2 * r + gap; }
        else { const W = 2.4 * r, h = 40; for (let i = 0; i < d; i++) { const on = k * d + i < mm; ctx.fillStyle = on ? col : '#F1F1F6'; ctx.fillRect(x0 + i * W / d, y - h / 2, W / d, h); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x0 + i * W / d, y - h / 2, W / d, h); hits.push({ x: x0 + i * W / d, y: y - h / 2, w: W / d, h, idx: k * d + i }); }
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x0, y - h / 2, W, h); x0 += W + gap; } }
      return hits; };
    let hits = [];
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const sz = Math.min(70, 230 / Math.max(geo(n, m), cmp ? geo(n2, m2) : 1));
      hits = pies(ctx, n, m, cmp ? 100 : 170, C.brand, cmp ? Math.min(sz, 60) : sz);
      fdraw(ctx, m, n, 40, cmp ? 92 : 162, { color: C.brand, size: 22 });
      if (cmp) { pies(ctx, n2, m2, 260, C.orange, Math.min(sz, 60)); fdraw(ctx, m2, n2, 40, 252, { color: C.orange, size: 22 });
        const v1 = m / n, v2 = m2 / n2; text(ctx, Math.abs(v1 - v2) < 1e-9 ? '=' : v1 > v2 ? '>' : '<', 40, 190, { align: 'center', bold: true, size: 30 }); }
      const kind = m < n ? 'правильний' : 'неправильний';
      api.state = { m, n, v: m / n, kind };
      read.set([['Дріб', `${m}/${n}`], ['Вид', kind], ['Мішане число', m >= n ? ftxt(m, n) : '—'], ['Нескоротний вигляд', ftxt(m, n)]]);
    };
    st.cv.addEventListener('click', e => { const p = st.pos(e); for (const h of hits) { let hit = false; if (h.r) { const dx = p.x - h.cx, dy = p.y - h.cy; let an = Math.atan2(dy, dx); if (an < -Math.PI / 2) an += Math.PI * 2; hit = Math.hypot(dx, dy) < h.r && an >= h.a0 && an < h.a1; } else hit = p.x > h.x && p.x < h.x + h.w && p.y > h.y && p.y < h.y + h.h;
      if (hit) { m = m === h.idx + 1 ? h.idx : h.idx + 1; ms.set(m); draw(); return; } } });
    H.seg(panel, { label: 'Модель', options: [['circle', '◔ круг'], ['bar', '▭ смужка']], value: 'circle' }, v => { shape = v; draw(); });
    H.slider(panel, { label: 'Знаменник (на скільки частин)', min: 1, max: 12, value: n }, v => { n = v; draw(); });
    const ms = H.slider(panel, { label: 'Чисельник (скільки взяли)', min: 0, max: 24, value: m }, v => { m = v; draw(); });
    const c2 = H.check(panel, { label: 'Порівняти з іншим дробом', value: false }, v => { cmp = v; box2.style.display = v ? '' : 'none'; draw(); }); void c2;
    const box2 = H.el('div'); panel.appendChild(box2); box2.style.display = 'none'; box2.style.display = 'none';
    H.slider(box2, { label: 'Другий дріб: знаменник', min: 1, max: 12, value: n2 }, v => { n2 = v; draw(); });
    H.slider(box2, { label: 'Другий дріб: чисельник', min: 0, max: 24, value: m2 }, v => { m2 = v; draw(); });
    const read = H.readout(panel, 'Дріб');
    H.note(panel, 'Знаменник показує, на скільки рівних частин поділили ціле, а чисельник — скільки таких частин узяли. Натискай на частини, щоб зафарбувати їх.');
    draw();
    return { destroy: () => st.destroy() };
  });

  /* =============== Десяткові дроби і відсотки: сітка 10×10 =============== */
  reg('decimal', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 560, 380);
    let cells = new Array(100).fill(false), paint = null;
    const S = 32, X0 = 120, Y0 = 20;
    const cnt = () => cells.filter(Boolean).length;
    const draw = () => {
      const { ctx } = st; st.clear('#fff');
      for (let i = 0; i < 100; i++) { const x = X0 + (i % 10) * S, y = Y0 + Math.floor(i / 10) * S; ctx.fillStyle = cells[i] ? C.brand : '#F1F1F6'; ctx.fillRect(x + 1, y + 1, S - 2, S - 2); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(X0, Y0, S * 10, S * 10);
      const c = cnt(), v = c / 100, [fn, fd] = frac(c, 100);
      text(ctx, fmt(v, 2).replace(/^(\d+)$/, '$1') + (c % 10 === 0 && c % 100 ? '' : ''), 60, 120, { align: 'center', bold: true, size: 28, color: C.brand });
      text(ctx, c + '%', 60, 180, { align: 'center', bold: true, size: 24, color: C.orange }); if (c) fdraw(ctx, fn, fd, 60, 236, { size: 20, color: C.green });
      api.state = { c, v, p: c };
      read.set([['Зафарбовано', c + ' клітинок зі 100'], ['Десятковий дріб', fmt(v, 2)], ['Звичайний дріб', c ? `${c}/100 = ${ftxt(c, 100)}` : '0'], ['Відсотки', c + '%']]);
    };
    const idx = p => { const i = Math.floor((p.x - X0) / S), j = Math.floor((p.y - Y0) / S); return i >= 0 && i < 10 && j >= 0 && j < 10 ? j * 10 + i : -1; };
    const down = e => { const k = idx(st.pos(e)); if (k < 0) return; e.preventDefault(); paint = !cells[k]; cells[k] = paint; draw(); };
    const move = e => { if (paint == null) return; const k = idx(st.pos(e)); if (k >= 0 && cells[k] !== paint) { cells[k] = paint; draw(); } };
    const up = () => { paint = null; };
    st.cv.addEventListener('mousedown', down); st.cv.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    st.cv.addEventListener('touchstart', down, { passive: false }); st.cv.addEventListener('touchmove', e => { e.preventDefault(); move(e); }, { passive: false }); window.addEventListener('touchend', up);
    const sl = H.slider(panel, { label: 'Зафарбувати сотих', min: 0, max: 100, value: 0 }, v => { cells = cells.map((_, i) => i < v); draw(); });
    H.buttons(panel, [['🎲 Випадкове число', () => { const v = H.rnd(1, 99); cells = cells.map((_, i) => i < v); sl.set(v); draw(); }, 'brand'], ['🧹 Очистити', () => { cells.fill(false); sl.set(0); draw(); }]]);
    const read = H.readout(panel, 'Число');
    H.note(panel, 'Увесь квадрат — це 1. Один рядок — 0,1 (десята), одна клітинка — 0,01 (сота). <b>1% = 0,01 = 1/100</b>. Фарбуй клітинки мишкою.');
    draw();
    return { destroy: () => { window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up); st.destroy(); } };
  });

  /* =============== Подільність: решето Ератосфена, дільники, кратні =============== */
  reg('sieve', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 520, 440);
    let mode = 'sieve', N = 36, k = 3, crossed = new Set(), primes = [], cur = 1;
    const isP = n => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
    const resetSieve = () => { crossed = new Set([1]); primes = []; cur = 1; draw(); };
    const stepSieve = () => { let p = cur + 1; while (p <= 100 && (crossed.has(p))) p++; if (p > 100) return; cur = p; primes.push(p); for (let q = p * p; q <= 100; q += p) crossed.add(q); if (p * p > 100) { for (let q = p + 1; q <= 100; q++) if (!crossed.has(q)) primes.push(q); cur = 101; } draw(); };
    const divs = n => { const r = []; for (let i = 1; i <= n; i++) if (n % i === 0) r.push(i); return r; };
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const S = 46, X0 = 30, Y0 = 20, D = divs(N);
      for (let n = 1; n <= 100; n++) { const i = (n - 1) % 10, j = Math.floor((n - 1) / 10), x = X0 + i * S, y = Y0 + j * 40;
        let bg = '#F4F4FA', fg = C.ink, strike = false;
        if (mode === 'sieve') { if (primes.includes(n)) { bg = '#DCFCE7'; fg = C.green; } else if (crossed.has(n)) { strike = true; fg = '#B5B8C9'; } if (n === cur) bg = '#BBF7D0'; }
        else if (mode === 'mult') { if (n % k === 0) { bg = '#E0E7FF'; fg = C.brand; } }
        else { if (D.includes(n)) { bg = '#FEF3C7'; fg = '#B45309'; } if (n === N) bg = '#FDE68A'; }
        ctx.fillStyle = bg; rrect(ctx, x + 2, y + 2, S - 4, 36, 6); ctx.fill(); text(ctx, n, x + S / 2, y + 26, { align: 'center', bold: true, color: fg, size: 15 });
        if (strike) { ctx.strokeStyle = C.red; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 8, y + 30); ctx.lineTo(x + S - 8, y + 10); ctx.stroke(); } }
      const allP = [...Array(100)].map((_, i) => i + 1).filter(isP);
      api.state = { N, ndiv: D.length, divs: D, k, nmult: Math.floor(100 / k), primes: primes.length };
      read.set(mode === 'sieve' ? [['Знайдено простих', primes.length + ' з ' + allP.length], ['Останнє просте', primes.length ? primes[Math.min(primes.length - 1, primes.indexOf(cur) >= 0 ? primes.indexOf(cur) : primes.length - 1)] : '—']]
        : mode === 'mult' ? [['Кратні ' + k + ' до 100', Math.floor(100 / k) + ' чисел'], ['Найменше кратне', k]]
          : [['Дільники числа ' + N, D.join(', ')], ['Кількість дільників', D.length], ['Число', N === 1 ? 'ні просте, ні складене' : D.length === 2 ? 'просте' : 'складене']]);
    };
    H.seg(panel, { label: 'Режим', options: [['sieve', 'решето Ератосфена'], ['mult', 'кратні'], ['div', 'дільники']], value: 'sieve' }, v => { mode = v; bs.style.display = v === 'sieve' ? '' : 'none'; ks.el.style.display = v === 'mult' ? '' : 'none'; ns.el.style.display = v === 'div' ? '' : 'none'; draw(); });
    const bs = H.buttons(panel, [['➡ Наступний крок', stepSieve, 'brand'], ['⏮ Спочатку', resetSieve]]);
    const ks = H.slider(panel, { label: 'Кратні числа', min: 2, max: 15, value: k }, v => { k = v; draw(); }); ks.el.style.display = 'none';
    const ns = H.slider(panel, { label: 'Дільники числа', min: 1, max: 100, value: N }, v => { N = v; draw(); }); ns.el.style.display = 'none';
    const read = H.readout(panel, 'Результат');
    H.note(panel, '<b>Решето:</b> закресли 1; обведи 2 і закресли всі кратні 2; потім наступне незакреслене число — 3 — і його кратні, і так далі. Незакреслені числа — <b>прості</b>.');
    resetSieve();
    return { destroy: () => st.destroy() };
  });

  /* =============== Дії з дробами =============== */
  reg('fracops', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 380);
    let a = 1, b = 2, c = 1, d = 3, op = '+';
    const res = () => { if (op === '+') return frac(a * d + c * b, b * d); if (op === '−') return frac(a * d - c * b, b * d); if (op === '×') return frac(a * c, b * d); return frac(a * d, b * c); };
    const bar = (ctx, y, n, dd, col, lab, maxW) => { const W = 360, w = Math.max(1, Math.ceil(Math.abs(n) / dd)); for (let k = 0; k < w; k++) { const x0 = 170 + k * (W + 10) / Math.max(1, w) * 0, xx = 170 + k * W / w; const ww = W / w - 6; for (let i = 0; i < dd; i++) { ctx.fillStyle = k * dd + i < Math.abs(n) ? col : '#F1F1F6'; ctx.fillRect(xx + i * ww / dd, y, ww / dd, 34); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(xx + i * ww / dd, y, ww / dd, 34); } ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(xx, y, ww, 34); void x0; void maxW; }
      text(ctx, lab, 20, y + 23, { bold: true, size: 15 }); };
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const [rn, rd] = res(), L = lcm(b, d);
      if (op === '+' || op === '−') {
        bar(ctx, 20, a, b, C.brand, `${a}/${b}`); bar(ctx, 64, c, d, C.orange, `${c}/${d}`);
        text(ctx, `Спільний знаменник: НСК(${b}, ${d}) = ${L}`, 300, 128, { align: 'center', bold: true, color: C.mute, size: 13 });
        bar(ctx, 140, a * L / b, L, C.brand, `${a}/${b} = ${a * L / b}/${L}`); bar(ctx, 184, c * L / d, L, C.orange, `${c}/${d} = ${c * L / d}/${L}`);
        if (rn >= 0) bar(ctx, 250, rn * L / rd, L, C.green, `${op === '+' ? 'сума' : 'різниця'}`); else text(ctx, 'Результат від’ємний', 300, 275, { align: 'center', bold: true, color: C.red });
      } else if (op === '×') {
        const S = 220, x0 = 190, y0 = 30; for (let i = 0; i < b; i++) for (let j = 0; j < d; j++) { const inA = i < a, inC = j < c; ctx.fillStyle = inA && inC ? C.green : inA ? '#C7D2FE' : inC ? '#FDE68A' : '#F4F4FA'; ctx.fillRect(x0 + i * S / b, y0 + j * S / d, S / b - 2, S / d - 2); }
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, S, S);
        text(ctx, `${a}/${b} ширини`, x0 + S / 2, y0 + S + 22, { align: 'center', bold: true, color: C.brand }); text(ctx, `${c}/${d} висоти`, x0 - 10, y0 + S / 2, { align: 'right', bold: true, color: '#B45309' });
        text(ctx, `зелених: ${a * c} з ${b * d}`, x0 + S + 20, y0 + S / 2, { bold: true, color: C.green });
      } else { text(ctx, `${a}/${b} : ${c}/${d} = ${a}/${b} · ${d}/${c}`, 300, 120, { align: 'center', bold: true, size: 26 }); text(ctx, 'Ділення на дріб = множення на обернений дріб', 300, 170, { align: 'center', color: C.mute }); }
      fdraw(ctx, a, b, 120, 330, { size: 22, color: C.brand }); text(ctx, op === '×' ? '·' : op === '÷' ? ':' : op, 160, 344, { align: 'center', bold: true, size: 26 }); fdraw(ctx, c, d, 200, 330, { size: 22, color: '#B45309' }); text(ctx, '=', 245, 344, { align: 'center', bold: true, size: 26 });
      fdraw(ctx, a * (op === '÷' ? d : op === '×' ? c : d) + (op === '+' ? c * b : op === '−' ? -c * b : 0), op === '÷' ? b * c : b * d, 300, 330, { size: 22 }); text(ctx, '=', 350, 344, { align: 'center', bold: true, size: 26 });
      text(ctx, ftxt(rn, rd), 380, 344, { bold: true, size: 26, color: C.green });
      api.state = { rn, rd, v: rn / rd };
      read.set([['Результат', ftxt(rn, rd)], ['Нескоротний дріб', rd === 1 ? String(rn) : `${rn}/${rd}`], ['Десятковий запис', fmt(rn / rd, 3) + (String(rn / rd).length > 6 ? '…' : '')]]);
    };
    H.seg(panel, { label: 'Дія', options: [['+', '＋'], ['−', '－'], ['×', '×'], ['÷', '÷']], value: '+' }, v => { op = v; draw(); });
    H.slider(panel, { label: 'Перший дріб: чисельник', min: 1, max: 9, value: a }, v => { a = v; draw(); });
    H.slider(panel, { label: 'Перший дріб: знаменник', min: 2, max: 12, value: b }, v => { b = v; draw(); });
    H.slider(panel, { label: 'Другий дріб: чисельник', min: 1, max: 9, value: c }, v => { c = v; draw(); });
    H.slider(panel, { label: 'Другий дріб: знаменник', min: 2, max: 12, value: d }, v => { d = v; draw(); });
    const read = H.readout(panel, 'Відповідь');
    H.note(panel, 'Щоб додати чи відняти дроби з різними знаменниками, зведи їх до <b>спільного знаменника</b>. Добуток дробів: a/b · c/d = ac/bd.');
    draw();
    return { destroy: () => st.destroy() };
  });

  /* =============== Пряма та обернена пропорційність =============== */
  reg('proportion', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 380);
    let mode = 'direct', k = 30, S = 120;
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const xs = [1, 2, 3, 4, 5, 6, 8, 10];
      const f = x => mode === 'direct' ? k * x : S / x; const ym = mode === 'direct' ? k * 10 : S;
      const rows = xs.map(x => [x, f(x)]);
      ctx.fillStyle = C.soft; ctx.fillRect(20, 20, 160, 26); text(ctx, mode === 'direct' ? 'кг' : 'v, км/год', 55, 38, { align: 'center', bold: true }); text(ctx, mode === 'direct' ? 'вартість, грн' : 't, год', 135, 38, { align: 'center', bold: true });
      rows.forEach(([x, y], i) => { const yy = 70 + i * 32; text(ctx, mode === 'direct' ? x : fmt(x * 10, 0), 55, yy, { align: 'center' }); text(ctx, fmt(mode === 'direct' ? y : S / (x * 10), 2), 135, yy, { align: 'center', bold: true, color: C.brand }); ctx.fillStyle = '#EEE'; ctx.fillRect(20, yy + 8, 160, 1); });
      if (mode === 'direct') H.plot(ctx, { x: 240, y: 30, w: 330, h: 290 }, { xmax: 10, ymax: ym, gx: 2, gy: ym / 5, xl: 'кількість, кг', yl: 'вартість, грн', series: [{ pts: [[0, 0], [10, k * 10]], color: '#C7C2F5', w: 2 }, { pts: rows, dots: true, color: C.brand }] });
      else H.plot(ctx, { x: 240, y: 30, w: 330, h: 290 }, { xmax: 100, ymax: S / 10, gx: 20, gy: S / 50, xl: 'швидкість, км/год', yl: 't, год', series: [{ pts: [...Array(46)].map((_, i) => [10 + i * 2, S / (10 + i * 2)]), color: '#C7C2F5', w: 2 }, { pts: xs.map(x => [x * 10, S / (x * 10)]), dots: true, color: C.brand }] });
      api.state = { k, S };
      read.set(mode === 'direct' ? [['Ціна 1 кг', k + ' грн'], ['Формула', 'вартість = ' + k + ' · кількість'], ['Висновок', 'у скільки разів більше кг — у стільки разів більша вартість']] : [['Відстань', S + ' км'], ['Формула', 't = ' + S + ' : v'], ['Висновок', 'у скільки разів більша швидкість — у стільки разів менший час']]);
    };
    H.seg(panel, { label: 'Залежність', options: [['direct', 'пряма (ціна × кількість)'], ['inverse', 'обернена (швидкість і час)']], value: 'direct' }, v => { mode = v; ks.el.style.display = v === 'direct' ? '' : 'none'; ss.el.style.display = v === 'direct' ? 'none' : ''; draw(); });
    const ks = H.slider(panel, { label: 'Ціна 1 кг', min: 10, max: 100, step: 5, value: k, unit: 'грн' }, v => { k = v; draw(); });
    const ss = H.slider(panel, { label: 'Відстань', min: 60, max: 300, step: 20, value: S, unit: 'км' }, v => { S = v; draw(); }); ss.el.style.display = 'none';
    const read = H.readout(panel, 'Пропорційність');
    H.note(panel, 'Пряма пропорційність: y = k·x, графік — промінь з початку координат. Обернена: x·y = const. <b>Пропорція</b> a : b = c : d ⇔ a·d = b·c.');
    draw();
    return { destroy: () => st.destroy() };
  });

  /* =============== Координатна пряма: дії з цілими числами =============== */
  reg('intline', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 620, 300);
    let a = -3, b = 5, op = '+', t = 1, abs = false;
    const X0 = 310, U = 27, xp = v => X0 + v * U;
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const y = 190, step = op === '+' ? b : -b, r = a + step;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(15, y); ctx.lineTo(605, y); ctx.stroke(); arrow(ctx, 590, y, 610, y, C.ink, 2);
      for (let v = -10; v <= 10; v++) { ctx.fillStyle = v === 0 ? C.ink : '#777'; ctx.fillRect(xp(v) - 1, y - (v % 5 ? 6 : 10), 2, v % 5 ? 12 : 20); text(ctx, String(v).replace('-', '−'), xp(v), y + 26, { align: 'center', size: 12, bold: v === 0, color: v < 0 ? C.red : v > 0 ? C.blue : C.ink }); }
      ctx.fillStyle = C.brand; ctx.beginPath(); ctx.arc(xp(a), y, 7, 0, 7); ctx.fill();
      const e = a + step * t; if (step) { ctx.strokeStyle = step > 0 ? C.green : C.orange; ctx.lineWidth = 3; ctx.beginPath(); const mid = (xp(a) + xp(e)) / 2, hh = Math.min(90, Math.abs(xp(e) - xp(a)) / 2 + 20); ctx.moveTo(xp(a), y - 8); ctx.quadraticCurveTo(mid, y - 8 - hh * 1.2, xp(e), y - 8); ctx.stroke();
        if (t >= 1) { arrow(ctx, xp(e) - Math.sign(step) * 6, y - 22, xp(e), y - 8, step > 0 ? C.green : C.orange, 3); text(ctx, (step > 0 ? '+' : '−') + Math.abs(step), mid, y - 20 - hh, { align: 'center', bold: true, color: step > 0 ? C.green : C.orange, size: 16 }); } }
      if (t >= 1) { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(xp(r), y, 7, 0, 7); ctx.fill(); }
      if (abs) { ctx.strokeStyle = C.pink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xp(0), y + 44); ctx.lineTo(xp(a), y + 44); ctx.stroke(); text(ctx, `|${String(a).replace('-', '−')}| = ${Math.abs(a)}`, (xp(0) + xp(a)) / 2, y + 66, { align: 'center', bold: true, color: C.pink }); }
      const sb = b < 0 ? `(${String(b).replace('-', '−')})` : b;
      text(ctx, `${String(a).replace('-', '−')} ${op} ${sb} = ${t >= 1 ? String(r).replace('-', '−') : '?'}`, 310, 40, { align: 'center', bold: true, size: 26 });
      api.state = { r, a, b };
      read.set([['Вираз', `${a} ${op} ${sb}`.replace(/-/g, '−')], ['Результат', t >= 1 ? String(r).replace('-', '−') : '…'], ['Рух по прямій', step > 0 ? 'праворуч на ' + step : step < 0 ? 'ліворуч на ' + (-step) : 'на місці']]);
    };
    const go = () => { t = 0; };
    H.slider(panel, { label: 'Перше число a', min: -10, max: 10, value: a, fmt: v => String(v).replace('-', '−') }, v => { a = v; t = 1; draw(); });
    H.seg(panel, { label: 'Дія', options: [['+', 'додати'], ['−', 'відняти']], value: '+' }, v => { op = v; go(); });
    H.slider(panel, { label: 'Друге число b', min: -10, max: 10, value: b, fmt: v => String(v).replace('-', '−') }, v => { b = v; t = 1; draw(); });
    H.buttons(panel, [['▶ Показати крок', go, 'brand']]);
    H.check(panel, { label: 'Показати модуль числа a', value: false }, v => { abs = v; draw(); });
    const read = H.readout(panel, 'Обчислення');
    H.note(panel, 'Додати додатне число — рух <b>праворуч</b>, від’ємне — <b>ліворуч</b>. Відняти число — те саме, що додати протилежне: a − b = a + (−b).');
    const stop = H.loop(dt => { if (t < 1) { t = Math.min(1, t + dt * 1.2); draw(); } });
    draw();
    return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== Координатна площина =============== */
  reg('coordplane', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 460, 460);
    let P = { x: 2, y: 3 }, target = null, score = 0, pts = [];
    const O = 230, U = 32, X = v => O + v * U, Y = v => O - v * U;
    const quarter = (x, y) => x > 0 && y > 0 ? 'I' : x < 0 && y > 0 ? 'II' : x < 0 && y < 0 ? 'III' : x > 0 && y < 0 ? 'IV' : 'на осі';
    const s = v => String(v).replace('-', '−');
    const draw = () => {
      const { ctx } = st; st.clear('#fff');
      ctx.strokeStyle = '#E3E1F7'; ctx.lineWidth = 1; for (let v = -6; v <= 6; v++) { ctx.beginPath(); ctx.moveTo(X(v), 30); ctx.lineTo(X(v), 430); ctx.moveTo(30, Y(v)); ctx.lineTo(430, Y(v)); ctx.stroke(); }
      arrow(ctx, 20, O, 448, O, C.ink, 2); arrow(ctx, O, 440, O, 12, C.ink, 2); text(ctx, 'x', 440, O + 20, { bold: true }); text(ctx, 'y', O + 10, 20, { bold: true });
      for (let v = -6; v <= 6; v++) if (v) { text(ctx, s(v), X(v), O + 16, { align: 'center', size: 10, color: C.mute }); text(ctx, s(v), O - 6, Y(v) + 4, { align: 'right', size: 10, color: C.mute }); }
      [['I', 3.5, 5.5], ['II', -3.5, 5.5], ['III', -3.5, -5.5], ['IV', 3.5, -5.5]].forEach(([q, x, y]) => text(ctx, q, X(x), Y(y), { align: 'center', bold: true, size: 18, color: '#D6D3F5' }));
      if (pts.length) { ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))); ctx.stroke(); pts.forEach(p => { ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 4, 0, 7); ctx.fill(); }); }
      ctx.strokeStyle = C.brand; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(P.x), Y(P.y)); ctx.lineTo(X(P.x), O); ctx.moveTo(X(P.x), Y(P.y)); ctx.lineTo(O, Y(P.y)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.brand; ctx.beginPath(); ctx.arc(X(P.x), Y(P.y), 9, 0, 7); ctx.fill(); text(ctx, `M(${s(P.x)}; ${s(P.y)})`, X(P.x) + 12, Y(P.y) - 12, { bold: true, color: C.brand });
      const hitT = target && target.x === P.x && target.y === P.y;
      api.state = { x: P.x, y: P.y, q: quarter(P.x, P.y) };
      read.set([['Точка M', `(${s(P.x)}; ${s(P.y)})`], ['Абсциса x', s(P.x)], ['Ордината y', s(P.y)], ['Координатна чверть', quarter(P.x, P.y)], ['Гра', target ? `постав точку (${s(target.x)}; ${s(target.y)}) ${hitT ? '✅' : ''} · влучань: ${score}` : 'натисни «Нова ціль»']]);
    };
    H.drag(st, p => Math.hypot(p.x - X(P.x), p.y - Y(P.y)) < 20, p => { const nx = Math.max(-6, Math.min(6, Math.round((p.x - O) / U))), ny = Math.max(-6, Math.min(6, Math.round((O - p.y) / U))); if (nx !== P.x || ny !== P.y) { P = { x: nx, y: ny }; if (target && P.x === target.x && P.y === target.y) score++; draw(); } });
    H.buttons(panel, [['🎯 Нова ціль', () => { do { target = { x: H.rnd(-6, 6), y: H.rnd(-6, 6) }; } while (target.x === P.x && target.y === P.y); draw(); }, 'brand'], ['📍 Поставити точку ламаної', () => { pts.push({ ...P }); draw(); }], ['🧹 Очистити', () => { pts = []; draw(); }]]);
    const read = H.readout(panel, 'Координати');
    H.note(panel, 'Перше число — <b>абсциса</b> (по осі x), друге — <b>ордината</b> (по осі y). Перетягуй точку M. Можна будувати ламані за точками.');
    draw();
    return { destroy: () => st.destroy() };
  });
})();
