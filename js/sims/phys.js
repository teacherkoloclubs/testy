/* Симуляції з фізики (7–9 класи) */
(function () {
  const { reg, H } = window.Sims;
  const { fmt, text, arrow, rrect } = H;
  const G = 9.8;
  const C = { ink: '#1F2340', mute: '#6B6F8E', brand: '#4F46E5', blue: '#2563EB', red: '#E5484D', green: '#16A34A', orange: '#F59E0B', water: 'rgba(56,148,255,.35)', sky: '#F4F7FF' };

  /* =============== 1. Ціна поділки та вимірювання =============== */
  reg('scale', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 560, 380);
    let kind = 'beaker', s = {};
    const gen = () => {
      const steps = [[10, 5], [10, 2], [20, 4], [50, 5], [5, 5], [2, 4], [1, 5]];
      const [big, n] = H.pick(steps), price = big / n;
      const top = kind === 'thermo' ? big * H.rnd(4, 6) : big * H.rnd(5, 8);
      const low = kind === 'thermo' ? -big * H.rnd(1, 2) : 0;
      const val = low + price * H.rnd(Math.ceil((top - low) / price * 0.15), Math.floor((top - low) / price * 0.9));
      s = { big, n, price, top, low, val, unit: kind === 'thermo' ? '°C' : kind === 'beaker' ? 'мл' : 'мм' };
      api.state = s; ans.hidden = true; draw();
    };
    const draw = () => {
      const { ctx } = st; st.clear('#fff');
      const x0 = kind === 'ruler' ? 40 : 230, y0 = 330, y1 = 40, L = y0 - y1;
      const Y = v => y0 - (v - s.low) / (s.top - s.low) * L;
      if (kind === 'ruler') {
        const X = v => 40 + (v - s.low) / (s.top - s.low) * 480;
        ctx.fillStyle = '#FDE9B8'; rrect(ctx, 30, 150, 500, 70, 8); ctx.fill(); ctx.strokeStyle = '#C98F1E'; ctx.stroke();
        for (let v = s.low; v <= s.top + 1e-9; v += s.price) { const big = Math.abs((v - s.low) % s.big) < 1e-6 || Math.abs((v - s.low) % s.big - s.big) < 1e-6;
          ctx.strokeStyle = C.ink; ctx.lineWidth = big ? 2 : 1; ctx.beginPath(); ctx.moveTo(X(v), 150); ctx.lineTo(X(v), 150 + (big ? 26 : 14)); ctx.stroke(); if (big) text(ctx, fmt(v), X(v), 194, { align: 'center', bold: true }); }
        ctx.fillStyle = '#7C3AED'; ctx.fillRect(X(s.low), 108, X(s.val) - X(s.low), 22); text(ctx, 'олівець', X(s.low) + 8, 124, { color: '#fff', bold: true });
        ctx.strokeStyle = C.red; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(s.val), 100); ctx.lineTo(X(s.val), 176); ctx.stroke(); ctx.setLineDash([]);
        text(ctx, s.unit, 520, 210, { align: 'right', color: C.mute }); return;
      }
      if (kind === 'beaker') {
        ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 - 10, y1 - 20); ctx.lineTo(x0 - 10, y0 + 10); ctx.lineTo(x0 + 110, y0 + 10); ctx.lineTo(x0 + 110, y1 - 20); ctx.stroke();
        ctx.fillStyle = C.water; ctx.fillRect(x0 - 8, Y(s.val), 116, y0 + 8 - Y(s.val));
        ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 - 8, Y(s.val) + 3); ctx.quadraticCurveTo(x0 + 50, Y(s.val) - 3, x0 + 108, Y(s.val) + 3); ctx.stroke();
      } else {
        ctx.fillStyle = '#F1F3FB'; rrect(ctx, x0 - 10, y1 - 25, 120, L + 70, 18); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rrect(ctx, x0 + 40, y1 - 15, 18, L + 30, 9); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(x0 + 49, y0 + 25, 15, 0, 7); ctx.fill(); ctx.fillRect(x0 + 44, Y(s.val), 10, y0 + 15 - Y(s.val));
      }
      for (let v = s.low; v <= s.top + 1e-9; v += s.price) {
        const big = Math.abs(Math.round((v - s.low) / s.price) % s.n) === 0;
        ctx.strokeStyle = C.ink; ctx.lineWidth = big ? 2 : 1; const xx = kind === 'beaker' ? x0 + 108 : x0 + 58;
        ctx.beginPath(); ctx.moveTo(xx, Y(v)); ctx.lineTo(xx - (big ? 26 : 13), Y(v)); ctx.stroke();
        if (big) text(ctx, fmt(v), xx + 6, Y(v) + 4, { bold: true });
      }
      text(ctx, s.unit, kind === 'beaker' ? x0 + 150 : x0 + 100, y1 - 10, { color: C.mute, bold: true });
      text(ctx, kind === 'beaker' ? 'Мензурка' : 'Термометр', 40, 40, { size: 18, bold: true });
    };
    H.seg(panel, { label: 'Прилад', options: [['beaker', '🧪 Мензурка'], ['thermo', '🌡 Термометр'], ['ruler', '📏 Лінійка']], value: kind }, v => { kind = v; gen(); });
    H.buttons(panel, [['🔄 Інший прилад', gen, 'brand']]);
    H.note(panel, 'Як визначити ціну поділки:<br>1) візьми два сусідні підписані штрихи;<br>2) від більшого значення відніми менше;<br>3) поділи на кількість поділок між ними.');
    const ans = H.note(panel, '', 'ok'); ans.hidden = true;
    H.buttons(panel, [['👀 Показати відповідь', () => { ans.hidden = false; ans.innerHTML = `Ціна поділки: (${fmt(s.big)} − 0) : ${s.n} = <b>${fmt(s.price)} ${s.unit}</b><br>Показ приладу: <b>${fmt(s.val)} ${s.unit}</b>`; }]]);
    gen();
    return { destroy: () => st.destroy() };
  });

  /* =============== 2. Рівномірний рух =============== */
  reg('motion', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 620, 420);
    const L = cfg.length || 200;           /* довжина дороги, м */
    let v1 = cfg.v1 || 5, v2 = cfg.v2 || 3, x2 = cfg.x2 != null ? cfg.x2 : 80, dir2 = cfg.dir2 || 1, two = cfg.two !== false;
    let t = 0, run = false, hist = [];
    const pos = () => { const a = v1 * t, b = x2 + dir2 * v2 * t; return [a, b]; };
    const draw = () => {
      const { ctx } = st; st.clear(C.sky);
      const X = m => 30 + m / L * 560;
      ctx.fillStyle = '#5B6177'; ctx.fillRect(20, 70, 580, 50); ctx.strokeStyle = '#fff'; ctx.setLineDash([16, 12]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, 95); ctx.lineTo(600, 95); ctx.stroke(); ctx.setLineDash([]);
      for (let m = 0; m <= L; m += L / 10) { ctx.fillStyle = C.ink; ctx.fillRect(X(m), 120, 1.5, 8); text(ctx, fmt(m, 0), X(m), 142, { size: 11, align: 'center', color: C.mute }); }
      text(ctx, 'x, м', 600, 142, { size: 11, align: 'right', bold: true });
      const [a, b] = pos();
      const car = (x, y, col, lab) => { if (x < -5 || x > L + 5) return; ctx.font = '30px serif'; ctx.save(); ctx.translate(X(x), y); if (lab === 2 && dir2 > 0 || lab === 1) ctx.scale(-1, 1); ctx.fillText('🚗', -15, 10); ctx.restore(); text(ctx, lab === 1 ? '1' : '2', X(x), y - 18, { bold: true, align: 'center', color: col }); };
      car(a, 85, C.blue, 1); if (two) car(b, 110, C.red, 2);
      const tm = Math.max(10, Math.ceil(L / Math.max(v1, 1)));
      const plot = H.plot(ctx, { x: 70, y: 190, w: 520, h: 190 }, { xmax: tm, ymax: L, xl: 't, с', yl: 'x, м',
        series: [{ pts: hist.map(h => [h[0], Math.min(L, Math.max(0, h[1]))]), color: C.blue }].concat(two ? [{ pts: hist.map(h => [h[0], Math.min(L, Math.max(0, h[2]))]), color: C.red }] : []) });
      void plot;
      api.state = { t, x1: a, x2: b, d: Math.abs(b - a) };
      read.set([['Час t', fmt(t, 1) + ' с'], ['x₁ (синій)', fmt(a, 1) + ' м'], ...(two ? [['x₂ (червоний)', fmt(b, 1) + ' м'], ['Відстань між ними', fmt(Math.abs(b - a), 1) + ' м']] : [])]);
    };
    const s1 = H.slider(panel, { label: 'Швидкість 1', min: 1, max: 20, step: 0.5, value: v1, unit: 'м/с' }, v => { v1 = v; reset(); });
    let s2; if (two) {
      s2 = H.slider(panel, { label: 'Швидкість 2', min: 0, max: 20, step: 0.5, value: v2, unit: 'м/с' }, v => { v2 = v; reset(); });
      H.slider(panel, { label: 'Старт 2-го авто', min: 0, max: L, step: 10, value: x2, unit: 'м' }, v => { x2 = v; reset(); });
      H.seg(panel, { label: 'Напрям 2-го авто', options: [['1', 'у той самий бік →'], ['-1', '← назустріч']], value: String(dir2) }, v => { dir2 = +v; reset(); });
    }
    void s1; void s2;
    H.buttons(panel, [['▶ Пуск / пауза', () => { run = !run; }, 'brand'], ['⏮ Спочатку', () => reset()]]);
    const read = H.readout(panel, 'Покази');
    H.note(panel, 'Рівномірний рух: <b>s = v · t</b>. Графік x(t) — пряма; що більша швидкість, то крутіший графік.');
    const reset = () => { t = 0; run = false; hist = [[0, 0, x2]]; draw(); };
    const stop = H.loop(dt => { if (!run) return; t += dt * (cfg.speed || 2); const [a, b] = pos(); hist.push([t, a, b]); if (a >= L || t > 120) run = false; draw(); });
    reset();
    return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== 3. Маятник: період і частота коливань =============== */
  reg('pendulum', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 560, 420);
    let l = 1, A = 15, g = G, th = 0, w = 0, t = 0, run = true, sw = { on: false, t: 0, n: 0, last: 0 };
    const planets = [['9.8', 'Земля (9,8 Н/кг)'], ['1.6', 'Місяць (1,6 Н/кг)'], ['3.7', 'Марс (3,7 Н/кг)'], ['24.8', 'Юпітер (24,8 Н/кг)']];
    const reset = () => { th = A * Math.PI / 180; w = 0; t = 0; sw = { on: false, t: 0, n: 0, last: Math.sign(th) }; };
    const T = () => 2 * Math.PI * Math.sqrt(l / g);
    const draw = () => {
      const { ctx } = st; st.clear(C.sky);
      const px = 280, py = 40, Lp = 60 + l * 140;
      ctx.fillStyle = '#5B6177'; ctx.fillRect(170, 30, 220, 10);
      const bx = px + Math.sin(th) * Lp, by = py + Math.cos(th) * Lp;
      ctx.strokeStyle = '#ccc'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + Lp + 20); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
      const grd = ctx.createRadialGradient(bx - 5, by - 5, 2, bx, by, 18); grd.addColorStop(0, '#9AA6FF'); grd.addColorStop(1, C.brand);
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(bx, by, 16, 0, 7); ctx.fill();
      text(ctx, `l = ${fmt(l)} м`, px + 10, py + Lp / 2, { color: C.mute });
      text(ctx, '⏱ ' + fmt(sw.t, 2) + ' с', 30, 390, { size: 20, bold: true });
      text(ctx, 'коливань: ' + sw.n, 30, 365, { size: 14, color: C.mute });
      api.state = { T: T(), nu: 1 / T(), l, g };
      read.set([['Період T (теорія)', show.get() ? fmt(T(), 2) + ' с' : '?'], ['Частота ν', show.get() ? fmt(1 / T(), 2) + ' Гц' : '?'], ['Виміряно', sw.n ? `${sw.n} кол. за ${fmt(sw.t, 2)} с → T ≈ ${fmt(sw.t / sw.n, 2)} с` : '—']]);
    };
    H.slider(panel, { label: 'Довжина нитки l', min: 0.2, max: 2, step: 0.1, value: l, unit: 'м' }, v => { l = v; reset(); });
    H.slider(panel, { label: 'Амплітуда (кут)', min: 5, max: 40, step: 1, value: A, unit: '°' }, v => { A = v; reset(); });
    H.select(panel, { label: 'Де проводимо дослід', options: planets, value: '9.8' }, v => { g = +v; reset(); });
    H.buttons(panel, [['⏱ Секундомір: старт', () => { sw = { on: true, t: 0, n: 0, last: Math.sign(th) || 1 }; }, 'brand'], ['⏹ Стоп', () => { sw.on = false; }], ['⏯ Пауза', () => { run = !run; }]]);
    const show = H.check(panel, { label: 'Показати формулу T = 2π√(l/g)', value: false }, () => draw());
    const read = H.readout(panel, 'Результати');
    H.note(panel, 'Щоб точно виміряти період, запусти секундомір і зупини його, наприклад, після 10 коливань: <b>T = t : N</b>, частота <b>ν = 1 : T</b>.');
    reset();
    const stop = H.loop(dt => { if (!run) return; for (let i = 0; i < 4; i++) { const h = dt / 4; w += -(g / l) * Math.sin(th) * h; th += w * h; }
      t += dt; if (sw.on) { sw.t += dt; const sg = Math.sign(th); if (sg > 0 && sw.last <= 0) sw.n++; if (sg) sw.last = sg; } draw(); });
    return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== 4. Маса, об’єм, густина =============== */
  const MATS = [['дуб', 700, '#B07A43'], ['лід', 900, '#BDE7FF'], ['парафін', 900, '#F5F0DC'], ['вода', 1000, '#5AA9FF'], ['цегла', 1800, '#C2553A'], ['скло', 2500, '#9EE0D8'], ['алюміній', 2700, '#C9CED6'], ['цинк', 7100, '#9AA3AE'], ['залізо', 7800, '#6E7783'], ['мідь', 8900, '#D07B45'], ['свинець', 11300, '#5E6470'], ['золото', 19300, '#F2C230']];
  reg('density', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 580, 400);
    let mi = 6, V = 100, mystery = false, secret = 0, guess = null;
    const mat = () => MATS[mystery ? secret : mi];
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const [name, rho, col] = mat(); const m = rho * V / 1e6 * 1000; /* г */
      /* ваги */
      ctx.fillStyle = '#E8EAF3'; rrect(ctx, 40, 300, 220, 40, 10); ctx.fill(); ctx.fillStyle = '#1F2340'; rrect(ctx, 95, 312, 110, 22, 5); ctx.fill();
      text(ctx, fmt(m, 1) + ' г', 150, 328, { color: '#7CFF8A', bold: true, align: 'center', size: 15 });
      ctx.fillStyle = '#C9CDDA'; ctx.fillRect(60, 290, 180, 10);
      const side = 24 + Math.cbrt(V) * 9; ctx.fillStyle = col; ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
      ctx.fillRect(150 - side / 2, 290 - side, side, side); ctx.strokeRect(150 - side / 2, 290 - side, side, side);
      text(ctx, mystery ? '❓' : name, 150, 290 - side / 2 + 5, { align: 'center', bold: true, color: rho > 5000 ? '#fff' : C.ink });
      /* мензурка з витісненою водою */
      const bx = 380, by = 340, bw = 120, bh = 260, cap = 500, Y = v => by - v / cap * bh;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by - bh - 10); ctx.lineTo(bx, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by - bh - 10); ctx.stroke();
      const w0 = 200, w1 = w0 + V; ctx.fillStyle = C.water; ctx.fillRect(bx + 2, Y(w1), bw - 4, by - Y(w1));
      for (let v = 0; v <= cap; v += 50) { ctx.strokeStyle = C.ink; ctx.lineWidth = v % 100 ? 1 : 2; ctx.beginPath(); ctx.moveTo(bx + bw, Y(v)); ctx.lineTo(bx + bw - (v % 100 ? 10 : 18), Y(v)); ctx.stroke(); if (!(v % 100)) text(ctx, v, bx + bw + 6, Y(v) + 4, { size: 11 }); }
      ctx.strokeStyle = C.red; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(bx - 20, Y(w0)); ctx.lineTo(bx + bw, Y(w0)); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, 'було 200 мл', bx - 24, Y(w0) - 4, { size: 11, align: 'right', color: C.red });
      text(ctx, 'мл', bx + bw + 6, by - bh - 14, { size: 11, bold: true });
      api.state = { m, V, rho, rhoG: rho / 1000 };
      read.set([['Маса m', fmt(m, 1) + ' г'], ['Об’єм V', fmt(V, 0) + ' см³'], ['Густина ρ = m / V', mystery ? '?' : `${fmt(m / V, 2)} г/см³ = ${fmt(rho, 0)} кг/м³`]]);
    };
    const sel = H.select(panel, { label: 'Речовина', options: MATS.map((m, i) => [i, `${m[0]} (${m[1]} кг/м³)`]), value: mi }, v => { mi = +v; mystery = false; res.hidden = true; draw(); });
    H.slider(panel, { label: 'Об’єм тіла V', min: 10, max: 250, step: 10, value: V, unit: 'см³' }, v => { V = v; draw(); });
    H.buttons(panel, [['❓ Загадкове тіло', () => { mystery = true; secret = H.rnd(0, MATS.length - 1); res.hidden = true; draw(); guessSel.el.hidden = false; }, 'brand']]);
    const guessSel = H.select(panel, { label: 'З чого виготовлене тіло?', options: [['', '— обери —']].concat(MATS.map((m, i) => [i, m[0]])) }, v => {
      if (v === '') return; res.hidden = false; const ok = MATS[+v][1] === MATS[secret][1];
      res.className = 'sim-note ' + (ok ? 'ok' : 'bad'); res.innerHTML = ok ? `✅ Так! Це ${MATS[secret][0]}: ρ = ${MATS[secret][1]} кг/м³.` : '❌ Ні. Обчисли ρ = m : V і порівняй з таблицею густин.'; });
    guessSel.el.hidden = true; void sel; void guess;
    const res = H.note(panel, ''); res.hidden = true;
    const read = H.readout(panel, 'Вимірювання');
    H.note(panel, '<b>ρ = m / V</b>. 1 г/см³ = 1000 кг/м³. Об’єм тіла неправильної форми вимірюють мензуркою: V = V₂ − V₁.');
    draw();
    return { destroy: () => st.destroy() };
  });

  /* =============== 5. Зіткнення візків: імпульс =============== */
  reg('collision', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 620, 380);
    let m1 = 2, m2 = 1, u1 = 3, u2 = -1, elastic = true, x1, x2, v1, v2, run = false, hit = false;
    const reset = () => { x1 = 120; x2 = 420; v1 = u1; v2 = u2; run = false; hit = false; draw(); };
    const p = () => [m1 * v1, m2 * v2];
    const draw = () => {
      const { ctx } = st; st.clear(C.sky);
      ctx.fillStyle = '#9AA0B5'; ctx.fillRect(20, 200, 580, 8);
      const cart = (x, m, col, v, lab) => { const w = 50 + m * 12; ctx.fillStyle = col; rrect(ctx, x - w / 2, 200 - 46, w, 40, 8); ctx.fill();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(x - w / 3, 200, 7, 0, 7); ctx.arc(x + w / 3, 200, 7, 0, 7); ctx.fill();
        text(ctx, `${lab}: ${fmt(m, 1)} кг`, x, 200 - 21, { align: 'center', color: '#fff', bold: true });
        if (Math.abs(v) > 0.01) arrow(ctx, x, 120, x + v * 25, 120, col, 3, fmt(v, 2) + ' м/с'); };
      cart(x1, m1, C.blue, v1, '1'); cart(x2, m2, C.red, v2, '2');
      const [a, b] = p(), tot = a + b, sc = 14;
      text(ctx, 'Імпульс p = m·v (кг·м/с)', 20, 250, { bold: true });
      const bar = (y, val, col, lab) => { ctx.fillStyle = col; ctx.fillRect(310, y, val * sc, 18); text(ctx, `${lab}: ${fmt(val, 2)}`, 20, y + 14); };
      ctx.strokeStyle = '#999'; ctx.beginPath(); ctx.moveTo(310, 258); ctx.lineTo(310, 350); ctx.stroke();
      bar(262, a, C.blue, 'p₁'); bar(290, b, C.red, 'p₂'); bar(318, tot, C.brand, 'p₁ + p₂');
      api.state = { p1: a, p2: b, p: tot, v1, v2 };
      read.set([['До удару: p₁ + p₂', fmt(m1 * u1 + m2 * u2, 2) + ' кг·м/с'], ['Зараз: p₁ + p₂', fmt(tot, 2) + ' кг·м/с'], ['v₁ / v₂', `${fmt(v1, 2)} / ${fmt(v2, 2)} м/с`]]);
    };
    H.slider(panel, { label: 'Маса візка 1', min: 0.5, max: 5, step: 0.5, value: m1, unit: 'кг' }, v => { m1 = v; reset(); });
    H.slider(panel, { label: 'Швидкість візка 1', min: -5, max: 5, step: 0.5, value: u1, unit: 'м/с' }, v => { u1 = v; reset(); });
    H.slider(panel, { label: 'Маса візка 2', min: 0.5, max: 5, step: 0.5, value: m2, unit: 'кг' }, v => { m2 = v; reset(); });
    H.slider(panel, { label: 'Швидкість візка 2', min: -5, max: 5, step: 0.5, value: u2, unit: 'м/с' }, v => { u2 = v; reset(); });
    H.seg(panel, { label: 'Удар', options: [['1', 'пружний'], ['0', 'непружний (зчепляться)']], value: '1' }, v => { elastic = v === '1'; reset(); });
    H.buttons(panel, [['▶ Пуск', () => { run = true; }, 'brand'], ['⏮ Спочатку', reset]]);
    const read = H.readout(panel, 'Закон збереження імпульсу');
    H.note(panel, 'У замкненій системі сума імпульсів тіл <b>не змінюється</b>: m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′.');
    const stop = H.loop(dt => { if (!run) return; const k = 40;
      x1 += v1 * dt * k; x2 += v2 * dt * k;
      const w1 = 50 + m1 * 12, w2 = 50 + m2 * 12;
      if (!hit && x2 - x1 <= (w1 + w2) / 2 && v1 - v2 > 0) { hit = true;
        if (elastic) { const a = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2), b = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2); v1 = a; v2 = b; }
        else { const v = (m1 * v1 + m2 * v2) / (m1 + m2); v1 = v2 = v; } }
      if (hit && !elastic) x2 = x1 + (w1 + w2) / 2;
      if (x1 < 0 || x2 > 640 || x1 > 640 || x2 < -20) run = false; draw(); });
    reset();
    return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== 6. Сила пружності: закон Гука =============== */
  reg('spring', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 560, 420);
    let k = 40, m = 0.2, pts = [], g = G;
    const draw = () => {
      const { ctx } = st; st.clear('#fff');
      const F = m * g, x = F / k, px = 150, top = 40, L0 = 120, scale = 400; const len = L0 + x * scale;
      ctx.fillStyle = '#5B6177'; ctx.fillRect(80, 28, 140, 12);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, top);
      const n = 14; for (let i = 0; i <= n; i++) ctx.lineTo(px + (i % 2 ? 14 : -14) * (i && i < n ? 1 : 0), top + len * i / n); ctx.stroke();
      const wy = top + len; ctx.fillStyle = '#6E7783'; rrect(ctx, px - 22, wy, 44, 20 + m * 40, 4); ctx.fill(); text(ctx, fmt(m * 1000, 0) + ' г', px, wy + 16, { align: 'center', color: '#fff', bold: true, size: 12 });
      /* лінійка */
      ctx.fillStyle = '#FDE9B8'; ctx.fillRect(220, top, 34, 330); for (let c = 0; c <= 33; c++) { ctx.fillStyle = C.ink; ctx.fillRect(220, top + c * 10, c % 5 ? 8 : 16, 1.2); if (!(c % 5)) text(ctx, c, 240, top + c * 10 + 4, { size: 10 }); }
      text(ctx, 'см', 237, top - 6, { size: 10, bold: true, align: 'center' });
      ctx.strokeStyle = C.red; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(px, top + L0); ctx.lineTo(258, top + L0); ctx.moveTo(px, wy); ctx.lineTo(258, wy); ctx.stroke(); ctx.setLineDash([]);
      const fs = Math.min(18, 70 / Math.max(F, 0.01)); arrow(ctx, px + 40, wy + 5, px + 40, wy + 5 + F * fs, C.red, 3, 'mg'); arrow(ctx, px + 40, wy - 2, px + 40, wy - 2 - F * fs, C.green, 3, 'Fпр');
      H.plot(ctx, { x: 330, y: 50, w: 200, h: 220 }, { xmax: 10, ymax: 20, xl: 'x, см', yl: 'F, Н', gx: 2, gy: 5, series: [{ pts: pts.map(p => [p[0], p[1]]), dots: true, color: C.brand }] });
      api.state = { F, x, k };
      read.set([['Сила пружності F', fmt(F, 2) + ' Н'], ['Видовження x', fmt(x * 100, 1) + ' см = ' + fmt(x, 3) + ' м'], ['Жорсткість k = F / x', show.get() ? fmt(k, 0) + ' Н/м' : '?']]);
    };
    H.slider(panel, { label: 'Маса тягарців', min: 0, max: 2, step: 0.1, value: m, unit: 'кг' }, v => { m = v; draw(); });
    H.select(panel, { label: 'Пружина', options: [['20', 'м’яка'], ['40', 'середня'], ['100', 'жорстка'], ['200', 'дуже жорстка']], value: '40' }, v => { k = +v; pts = []; draw(); });
    H.buttons(panel, [['📍 Записати точку на графік', () => { const F = m * g, x = F / k * 100; if (x <= 10 && F <= 20) pts.push([x, F]); draw(); }, 'brand'], ['🧹 Очистити графік', () => { pts = []; draw(); }]]);
    const show = H.check(panel, { label: 'Показати жорсткість пружини', value: false }, () => draw());
    const read = H.readout(panel, 'Динамометр');
    H.note(panel, 'Закон Гука: <b>F = k · x</b>. Вага тягарця P = m · g, g ≈ 9,8 Н/кг. Графік F(x) — пряма.');
    draw();
    return { destroy: () => st.destroy() };
  });

  /* =============== 7. Тиск рідини =============== */
  const LIQ = [['вода', 1000, 'rgba(56,148,255,.45)'], ['гас', 800, 'rgba(240,200,80,.45)'], ['олія', 900, 'rgba(230,180,40,.5)'], ['морська вода', 1030, 'rgba(40,120,200,.5)'], ['ртуть', 13600, 'rgba(160,165,175,.8)'], ['спирт', 800, 'rgba(200,220,255,.5)']];
  reg('pressure', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 560, 420);
    let li = 0, h = 2, atm = false, g = G;
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const [n, rho, col] = LIQ[li];
      const x0 = 60, y0 = 50, W = 260, D = 5, Hh = 320, Y = d => y0 + d / D * Hh;
      ctx.fillStyle = col; ctx.fillRect(x0, y0, W, Hh); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(x0, y0 - 10, W, Hh + 10);
      for (let d = 0; d <= D; d++) { text(ctx, d + ' м', x0 - 8, Y(d) + 4, { align: 'right', size: 11 }); ctx.fillStyle = C.ink; ctx.fillRect(x0, Y(d), 8, 1.5); }
      const yy = Y(h); ctx.fillStyle = '#1F2340'; ctx.beginPath(); ctx.arc(x0 + W / 2, yy, 10, 0, 7); ctx.fill();
      ctx.strokeStyle = '#1F2340'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + W / 2, yy); ctx.lineTo(x0 + W / 2, y0 - 20); ctx.lineTo(420, y0 - 20); ctx.lineTo(420, 80); ctx.stroke();
      const p = rho * g * h + (atm ? 101300 : 0);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(420, 140, 60, 0, 7); ctx.fill(); ctx.stroke();
      const pm = atm ? 1.5e6 : 6e5, ang = Math.PI * 0.75 + Math.min(1, p / pm) * Math.PI * 1.5;
      for (let i = 0; i <= 6; i++) { const a = Math.PI * 0.75 + i / 6 * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(420 + Math.cos(a) * 50, 140 + Math.sin(a) * 50); ctx.lineTo(420 + Math.cos(a) * 58, 140 + Math.sin(a) * 58); ctx.stroke(); }
      arrow(ctx, 420, 140, 420 + Math.cos(ang) * 45, 140 + Math.sin(ang) * 45, C.red, 3);
      text(ctx, fmt(p / 1000, 1) + ' кПа', 420, 230, { align: 'center', bold: true, size: 16 });
      text(ctx, 'манометр', 420, 250, { align: 'center', color: C.mute, size: 11 });
      api.state = { p, pk: p / 1000, rho, h };
      read.set([['Рідина', `${n}, ρ = ${rho} кг/м³`], ['Глибина h', fmt(h, 1) + ' м'], ['Тиск p = ρgh', fmt(rho * g * h, 0) + ' Па'], ...(atm ? [['з атмосферним', fmt(p, 0) + ' Па']] : [])]);
    };
    H.select(panel, { label: 'Рідина', options: LIQ.map((l, i) => [i, `${l[0]} (${l[1]} кг/м³)`]), value: 0 }, v => { li = +v; draw(); });
    H.slider(panel, { label: 'Глибина датчика h', min: 0, max: 5, step: 0.1, value: h, unit: 'м' }, v => { h = v; draw(); });
    H.check(panel, { label: 'Враховувати атмосферний тиск (101,3 кПа)', value: false }, v => { atm = v; draw(); });
    const read = H.readout(panel, 'Гідростатичний тиск');
    H.note(panel, 'Тиск рідини залежить лише від її <b>густини</b> і <b>глибини</b>: p = ρ · g · h. Форма посудини значення не має.');
    draw();
    return { destroy: () => st.destroy() };
  });

  /* =============== 8. Архімедова сила, плавання тіл =============== */
  reg('buoyancy', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 580, 420);
    let rb = 700, V = 400, li = 0, held = false, y = 0, vy = 0;
    const solve = () => { const rl = LIQ[li][1]; const frac = Math.min(1, rb / rl); return { rl, frac, sinks: rb > rl }; };
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const { rl, frac, sinks } = solve();
      const x0 = 60, top = 150, W = 300, Hh = 230; ctx.fillStyle = LIQ[li][2]; ctx.fillRect(x0, top, W, Hh); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(x0, 60, W, Hh + 90);
      const side = 40 + Math.cbrt(V) * 6; const cx = x0 + W / 2;
      let by;   /* верх тіла */
      if (held) by = top + 20; else by = sinks ? top + Hh - side : top - side * (1 - frac);
      by = by + y;
      const mat = MATS.reduce((a, m) => Math.abs(m[1] - rb) < Math.abs(a[1] - rb) ? m : a, MATS[0]);
      ctx.fillStyle = mat[2]; ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.fillRect(cx - side / 2, by, side, side); ctx.strokeRect(cx - side / 2, by, side, side);
      if (held) { ctx.strokeStyle = '#666'; ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx, 30); ctx.stroke(); }
      const sub = held ? 1 : (sinks ? 1 : frac);
      const Fa = rl * G * V / 1e6 * sub, mg = rb * G * V / 1e6, P = held ? Math.max(0, mg - rl * G * V / 1e6) : 0;
      const sc = Math.min(9, 110 / Math.max(mg, Fa, 0.01)); arrow(ctx, cx + side / 2 + 20, by + side / 2, cx + side / 2 + 20, by + side / 2 + mg * sc, C.red, 3, 'mg = ' + fmt(mg, 2) + ' Н');
      arrow(ctx, cx - side / 2 - 20, by + side / 2, cx - side / 2 - 20, by + side / 2 - Fa * sc, C.green, 3, 'Fₐ = ' + fmt(Fa, 2) + ' Н');
      const res = held ? 'тіло на нитці' : sinks ? 'тоне ⬇' : (frac > 0.999 ? 'плаває всередині рідини' : 'плаває на поверхні ⬆');
      text(ctx, res, 400, 90, { bold: true, size: 18, color: sinks && !held ? C.red : C.green });
      api.state = { Fa, mg, P, frac, rl };
      read.set([['Густина тіла', rb + ' кг/м³'], ['Густина рідини', rl + ' кг/м³'], ['Архімедова сила Fₐ = ρрgVзан', fmt(Fa, 2) + ' Н'], ['Сила тяжіння mg', fmt(mg, 2) + ' Н'], held ? ['Показ динамометра P = mg − Fₐ', fmt(P, 2) + ' Н'] : ['Занурена частина', fmt(sinks ? 100 : frac * 100, 0) + ' %']]);
    };
    H.slider(panel, { label: 'Густина тіла', min: 200, max: 11300, step: 100, value: rb, unit: 'кг/м³' }, v => { rb = v; draw(); });
    H.slider(panel, { label: 'Об’єм тіла', min: 100, max: 1000, step: 50, value: V, unit: 'см³' }, v => { V = v; draw(); });
    H.select(panel, { label: 'Рідина', options: LIQ.map((l, i) => [i, `${l[0]} (${l[1]} кг/м³)`]), value: 0 }, v => { li = +v; draw(); });
    H.check(panel, { label: 'Тримати тіло на нитці динамометра (повністю занурене)', value: false }, v => { held = v; draw(); });
    const read = H.readout(panel, 'Сили');
    H.note(panel, 'Тіло <b>тоне</b>, якщо ρтіла > ρрідини; <b>плаває</b>, якщо ρтіла < ρрідини. Архімедова сила дорівнює вазі витісненої рідини.');
    draw(); void vy;
    return { destroy: () => st.destroy() };
  });

  /* ======================= ФІЗИКА 8 ======================= */
  /* =============== Теплообмін: калориметр =============== */
  const HEAT_M = [['вода', 4200, '#5AA9FF'], ['олія', 1700, '#E6B428'], ['алюміній', 920, '#C9CED6'], ['залізо', 460, '#6E7783'], ['мідь', 400, '#D07B45'], ['свинець', 140, '#5E6470'], ['цегла', 880, '#C2553A']];
  reg('heat', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 580, 400);
    let i1 = 0, m1 = 0.2, t1 = 20, i2 = 2, m2 = 0.1, t2 = 100, T1, T2, time, run = false, hist;
    const eq = () => { const c1 = HEAT_M[i1][1], c2 = HEAT_M[i2][1]; return (c1 * m1 * t1 + c2 * m2 * t2) / (c1 * m1 + c2 * m2); };
    const reset = () => { T1 = t1; T2 = t2; time = 0; run = false; hist = [[0, t1, t2]]; draw(); };
    const thermo = (ctx, x, y, T, col) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; rrect(ctx, x - 7, y, 14, 150, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y + 160, 11, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.stroke(); const h = Math.max(0, Math.min(1, T / 100)) * 140; ctx.fillRect(x - 3, y + 150 - h, 6, h + 8);
      text(ctx, fmt(T, 1) + '°', x, y - 8, { align: 'center', bold: true }); };
    const draw = () => {
      const { ctx } = st; st.clear('#fff');
      /* калориметр */
      ctx.fillStyle = '#EEF0F6'; ctx.fillRect(40, 140, 200, 200); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(40, 140, 200, 200);
      ctx.fillStyle = HEAT_M[i1][2] + '88'; ctx.fillRect(52, 200, 176, 132); ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.strokeRect(52, 160, 176, 172);
      const hue = Math.max(0, Math.min(1, (T2 - 20) / 80)); ctx.fillStyle = `rgb(${120 + hue * 135},${120 - hue * 40},${120 - hue * 80})`;
      rrect(ctx, 105, 240, 70, 60, 8); ctx.fill(); text(ctx, HEAT_M[i2][0], 140, 275, { align: 'center', color: '#fff', bold: true, size: 12 });
      text(ctx, 'калориметр: ' + HEAT_M[i1][0] + ' ' + fmt(m1 * 1000, 0) + ' г', 140, 360, { align: 'center', size: 12, color: C.mute });
      thermo(ctx, 268, 160, T1, C.blue); thermo(ctx, 326, 160, T2, C.red);
      text(ctx, '1', 268, 350, { align: 'center', color: C.blue, bold: true }); text(ctx, '2', 326, 350, { align: 'center', color: C.red, bold: true });
      const tm = Math.max(60, hist[hist.length - 1][0]);
      H.plot(ctx, { x: 370, y: 40, w: 190, h: 300 }, { xmax: tm, ymax: 100, gy: 20, gx: tm / 3, xl: 't, с', yl: 'T, °C', series: [{ pts: hist.map(h => [h[0], h[1]]), color: C.blue }, { pts: hist.map(h => [h[0], h[2]]), color: C.red }] });
      const c1 = HEAT_M[i1][1], c2 = HEAT_M[i2][1], Q1 = c1 * m1 * (T1 - t1), Q2 = c2 * m2 * (t2 - T2);
      api.state = { teq: eq(), Q: c2 * m2 * (t2 - eq()), Q1, Q2 };
      read.set([['Q отримала рідина = c₁m₁(T − t₁)', fmt(Q1 / 1000, 2) + ' кДж'], ['Q віддало тіло = c₂m₂(t₂ − T)', fmt(Q2 / 1000, 2) + ' кДж'], ['Температура рівноваги', show.get() ? fmt(eq(), 1) + ' °C' : '?']]);
    };
    const opts = HEAT_M.map((m, i) => [String(i), `${m[0]} (${m[1]} Дж/(кг·°C))`]);
    H.select(panel, { label: 'Рідина в калориметрі', options: opts.slice(0, 2), value: '0' }, v => { i1 = +v; reset(); });
    H.slider(panel, { label: 'Маса рідини m₁', min: 0.05, max: 0.5, step: 0.05, value: m1, unit: 'кг' }, v => { m1 = v; reset(); });
    H.slider(panel, { label: 'Температура рідини t₁', min: 0, max: 50, step: 1, value: t1, unit: '°C' }, v => { t1 = v; reset(); });
    H.select(panel, { label: 'Нагріте тіло', options: opts.slice(2), value: '2' }, v => { i2 = +v; reset(); });
    H.slider(panel, { label: 'Маса тіла m₂', min: 0.05, max: 1, step: 0.05, value: m2, unit: 'кг' }, v => { m2 = v; reset(); });
    H.slider(panel, { label: 'Температура тіла t₂', min: 50, max: 100, step: 1, value: t2, unit: '°C' }, v => { t2 = v; reset(); });
    H.buttons(panel, [['▶ Опустити тіло', () => { run = true; }, 'brand'], ['⏮ Спочатку', reset]]);
    const show = H.check(panel, { label: 'Показати температуру рівноваги', value: false }, () => draw());
    const read = H.readout(panel, 'Тепловий баланс');
    H.note(panel, '<b>Q = c · m · Δt</b>. Без втрат тепла кількість теплоти, віддана гарячим тілом, дорівнює кількості теплоти, отриманій холодним: <b>Q<sub>відд</sub> = Q<sub>отр</sub></b>.');
    const stop = H.loop(dt => { if (!run) return; const e = eq(), f = Math.exp(-dt * 0.8); T1 = e + (T1 - e) * f; T2 = e + (T2 - e) * f; time += dt * 6;
      if (Math.abs(T2 - T1) < 0.05) { T1 = T2 = eq(); run = false; } hist.push([time, T1, T2]); draw(); });
    reset();
    return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== Плавлення та кипіння: графік нагрівання льоду =============== */
  reg('phase', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 580, 400);
    const ci = 2100, lam = 332000, cw = 4200, L = 2300000;
    let m = 0.5, P = 1000, t0 = -20, Q, run = false, hist, speed = 1;
    const stages = () => { const a = ci * m * (0 - t0), b = a + lam * m, c = b + cw * m * 100, d = c + L * m; return [a, b, c, d]; };
    const state = q => { const [a, b, c, d] = stages();
      if (q < a) return { T: t0 + q / (ci * m), ph: 'нагрівання льоду', ice: 1, w: 0, v: 0 };
      if (q < b) { const f = (q - a) / (lam * m); return { T: 0, ph: 'плавлення льоду', ice: 1 - f, w: f, v: 0 }; }
      if (q < c) return { T: (q - b) / (cw * m), ph: 'нагрівання води', ice: 0, w: 1, v: 0 };
      if (q < d) { const f = (q - c) / (L * m); return { T: 100, ph: 'кипіння', ice: 0, w: 1 - f, v: f }; }
      return { T: 100, ph: 'уся вода випарувалась', ice: 0, w: 0, v: 1 }; };
    const reset = () => { Q = 0; run = false; hist = [[0, t0]]; draw(); };
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const s = state(Q), [a, b, c, d] = stages();
      /* посудина з пальником */
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.strokeRect(40, 150, 150, 150);
      const lvl = 140 * (s.ice + s.w) * 0.8;
      ctx.fillStyle = 'rgba(56,148,255,.45)'; ctx.fillRect(42, 298 - lvl * s.w / Math.max(1e-6, s.ice + s.w), 146, lvl * s.w / Math.max(1e-6, s.ice + s.w));
      for (let i = 0; i < Math.round(s.ice * 6); i++) { ctx.fillStyle = '#DDF3FF'; ctx.strokeStyle = '#8BC7EE'; ctx.lineWidth = 1.5; rrect(ctx, 52 + (i % 3) * 44, 258 - Math.floor(i / 3) * 36, 36, 32, 5); ctx.fill(); ctx.stroke(); }
      if (s.ph === 'кипіння' && run) for (let i = 0; i < 10; i++) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(55 + Math.random() * 120, 300 - Math.random() * lvl, 3 + Math.random() * 3, 0, 7); ctx.fill(); }
      if (s.v > 0) for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(150,160,180,.6)'; ctx.lineWidth = 3; ctx.beginPath(); const x = 60 + i * 22; ctx.moveTo(x, 140); ctx.quadraticCurveTo(x + 10, 120, x, 100); ctx.stroke(); }
      ctx.fillStyle = '#5B6177'; ctx.fillRect(60, 310, 110, 12);
      if (run) for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? C.orange : C.red; ctx.beginPath(); const x = 75 + i * 20; ctx.moveTo(x - 7, 345); ctx.quadraticCurveTo(x, 320 - P / 100 - Math.random() * 6, x + 7, 345); ctx.fill(); }
      text(ctx, s.ph, 115, 135 - (s.v > 0 ? 50 : 0), { align: 'center', bold: true, color: C.brand });
      text(ctx, fmt(s.T, 1) + ' °C', 115, 380, { align: 'center', bold: true, size: 18 });
      const tmax = d / P / 60;
      H.plot(ctx, { x: 260, y: 40, w: 300, h: 300 }, { xmax: Math.ceil(tmax / 10) * 10 || 10, ymax: 120, ymin: -40, gy: 20, gx: (Math.ceil(tmax / 10) * 10 || 10) / 5, xl: 'час, хв', yl: 't, °C', series: [{ pts: hist, color: C.red }] });
      api.state = { Qmelt: lam * m, tMelt: (b - a) / P / 60, Q, T: s.T };
      read.set([['Стадія', s.ph], ['Час нагрівання', fmt(Q / P / 60, 1) + ' хв'], ['Передано теплоти Q', fmt(Q / 1000, 1) + ' кДж'], ['Плавлення триває', fmt((b - a) / P / 60, 1) + ' хв'], ['Кипіння триває', fmt((d - c) / P / 60, 1) + ' хв']]);
    };
    H.slider(panel, { label: 'Маса льоду m', min: 0.1, max: 2, step: 0.1, value: m, unit: 'кг' }, v => { m = v; reset(); });
    H.slider(panel, { label: 'Початкова температура', min: -40, max: -5, step: 5, value: t0, unit: '°C' }, v => { t0 = v; reset(); });
    H.slider(panel, { label: 'Потужність нагрівника P', min: 500, max: 3000, step: 250, value: P, unit: 'Вт' }, v => { P = v; draw(); });
    H.seg(panel, { label: 'Прискорення часу', options: [['1', '×1'], ['3', '×3'], ['10', '×10']], value: '1' }, v => { speed = +v; });
    H.buttons(panel, [['🔥 Нагрівати / пауза', () => { run = !run; }, 'brand'], ['⏮ Спочатку', reset]]);
    const read = H.readout(panel, 'Покази');
    H.note(panel, 'Лід: c = 2100 Дж/(кг·°C), λ = 332 кДж/кг. Вода: c = 4200 Дж/(кг·°C), r = 2,3 МДж/кг. Під час плавлення й кипіння температура <b>не змінюється</b> — енергія йде на зміну агрегатного стану.');
    const stop = H.loop(dt => { if (!run) return; const [, , , d] = stages(); Q = Math.min(d, Q + P * dt * 40 * speed); hist.push([Q / P / 60, state(Q).T]); if (Q >= d) run = false; draw(); });
    reset();
    return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== Закон Кулона =============== */
  reg('coulomb', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 580, 340);
    const K = 9e9; let q1 = 2, q2 = -3, r = 0.3, field = true;
    const X = 60, W = 460, rmax = 1; const px = v => X + v / rmax * W;
    const draw = () => {
      const { ctx } = st; st.clear('#fff');
      const x1 = px(0.1), x2 = px(0.1 + r), y = 170;
      if (field) { ctx.strokeStyle = 'rgba(79,70,229,.15)'; ctx.lineWidth = 1.5; [[x1, q1], [x2, q2]].forEach(([x, q]) => { if (!q) return; for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * 22, y + Math.sin(an) * 22); ctx.lineTo(x + Math.cos(an) * 70, y + Math.sin(an) * 70); ctx.stroke(); } }); }
      ctx.strokeStyle = '#C9C6E8'; ctx.lineWidth = 1; for (let v = 0; v <= rmax + 1e-9; v += 0.1) { ctx.beginPath(); ctx.moveTo(px(v), 290); ctx.lineTo(px(v), 298); ctx.stroke(); text(ctx, fmt(v * 100, 0), px(v), 312, { align: 'center', size: 10, color: C.mute }); }
      text(ctx, 'см', px(rmax) + 18, 312, { size: 10, color: C.mute });
      ctx.strokeStyle = C.mute; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x1, y + 40); ctx.lineTo(x1, 290); ctx.moveTo(x2, y + 40); ctx.lineTo(x2, 290); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, 'r = ' + fmt(r * 100, 0) + ' см', (x1 + x2) / 2, 270, { align: 'center', bold: true });
      const F = K * Math.abs(q1 * q2) * 1e-12 / (r * r), att = q1 * q2 < 0;
      const L = Math.min(110, 18 * Math.log10(1 + F * 50) + (F > 0 ? 8 : 0));
      if (q1 && q2) { const d = att ? 1 : -1; arrow(ctx, x1 + (att ? 24 : -24), y, x1 + (att ? 24 : -24) + d * L, y, C.green, 4); arrow(ctx, x2 - (att ? 24 : -24), y, x2 - (att ? 24 : -24) - d * L, y, C.green, 4); }
      const ball = (x, q) => { const col = q > 0 ? C.red : q < 0 ? C.blue : '#999'; const g = ctx.createRadialGradient(x - 6, y - 6, 3, x, y, 22); g.addColorStop(0, '#fff'); g.addColorStop(1, col); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill();
        text(ctx, q > 0 ? '+' : q < 0 ? '−' : '0', x, y + 7, { align: 'center', size: 22, bold: true, color: '#fff' }); text(ctx, fmt(q, 1) + ' мкКл', x, y - 32, { align: 'center', bold: true, size: 12 }); };
      ball(x1, q1); ball(x2, q2);
      text(ctx, '⇆ перетягни другий заряд', x2, y + 56, { align: 'center', size: 11, color: C.mute });
      api.state = { F, r };
      read.set([['Відстань r', fmt(r, 2) + ' м'], ['Сила взаємодії F', (F >= 0.01 ? fmt(F, 2) : fmt(F, 4)) + ' Н'], ['Характер', !q1 || !q2 ? 'немає взаємодії' : att ? 'притягання' : 'відштовхування']]);
    };
    H.slider(panel, { label: 'Заряд q₁', min: -5, max: 5, step: 0.5, value: q1, unit: 'мкКл' }, v => { q1 = v; draw(); });
    H.slider(panel, { label: 'Заряд q₂', min: -5, max: 5, step: 0.5, value: q2, unit: 'мкКл' }, v => { q2 = v; draw(); });
    const rs = H.slider(panel, { label: 'Відстань r', min: 0.1, max: 0.8, step: 0.05, value: r, unit: 'м' }, v => { r = v; draw(); });
    H.check(panel, { label: 'Показати поле навколо зарядів', value: field }, v => { field = v; draw(); });
    const read = H.readout(panel, 'Взаємодія');
    H.note(panel, 'Закон Кулона: <b>F = k·|q₁|·|q₂| / r²</b>, k = 9·10⁹ Н·м²/Кл². 1 мкКл = 10⁻⁶ Кл. Однойменні заряди відштовхуються, різнойменні — притягуються.');
    H.drag(st, p => Math.hypot(p.x - px(0.1 + r), p.y - 170) < 30, p => { r = Math.max(0.1, Math.min(0.8, Math.round((p.x - X) / W * rmax * 20) / 20 - 0.1)); rs.set(r); draw(); });
    draw();
    return { destroy: () => st.destroy() };
  });

  /* =============== Електричне коло: закон Ома, з'єднання =============== */
  reg('circuit', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 580, 400);
    let U = 6, R1 = 4, R2 = 6, mode = cfg && cfg.mode || 'series', ph = 0;
    const calc = () => { if (mode === 'one') { const I = U / R1; return { R: R1, I, I1: I, I2: 0, U1: U, U2: 0 }; }
      if (mode === 'series') { const R = R1 + R2, I = U / R; return { R, I, I1: I, I2: I, U1: I * R1, U2: I * R2 }; }
      const R = R1 * R2 / (R1 + R2), I = U / R; return { R, I, I1: U / R1, I2: U / R2, U1: U, U2: U }; };
    const res = (ctx, x, y, lab, vert) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; if (vert) { ctx.fillRect(x - 12, y - 30, 24, 60); ctx.strokeRect(x - 12, y - 30, 24, 60); text(ctx, lab, x + 18, y + 4, { bold: true }); } else { ctx.fillRect(x - 32, y - 12, 64, 24); ctx.strokeRect(x - 32, y - 12, 64, 24); text(ctx, lab, x, y - 18, { align: 'center', bold: true }); } };
    const meter = (ctx, x, y, l, val) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 17, 0, 7); ctx.fill(); ctx.stroke(); text(ctx, l, x, y + 6, { align: 'center', bold: true, size: 16 }); if (val) text(ctx, val, x, y + 36, { align: 'center', bold: true, size: 12, color: C.brand }); };
    const dots = (ctx, pts, I) => { /* рух зарядів уздовж ламаної */ let len = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); len += l; }
      ctx.fillStyle = C.orange; const n = Math.floor(len / 26); for (let k = 0; k < n; k++) { let d = ((k * 26 + ph * Math.min(I, 3) * 40) % len + len) % len, i = 0; while (d > seg[i]) { d -= seg[i]; i++; } const f = d / seg[i]; ctx.beginPath(); ctx.arc(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f, 3.5, 0, 7); ctx.fill(); } };
    const line = (ctx, pts) => { ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const c = calc();
      const L = 80, R = 500, T = 70, B = 330;
      /* джерело */
      if (mode === 'parallel') {
        const main = [[L, B], [L, T], [200, T]], top = [[200, T], [R - 60, T]], bot = [[200, T], [200, 200], [R - 60, 200], [R - 60, T]], ret = [[R - 60, T], [R, T], [R, B], [L, B]];
        [main, top, bot, ret].forEach(p => line(ctx, p)); dots(ctx, [...main, ...top.slice(1), [R, T], [R, B], [L, B]], c.I); dots(ctx, bot, c.I2);
        res(ctx, 330, T, 'R₁'); res(ctx, 330, 200, 'R₂'); meter(ctx, 330, T - 0.01 + 50, 'V', fmt(c.U1, 2) + ' В');
      } else {
        const loop = [[L, B], [L, T], [R, T], [R, B], [L, B]]; line(ctx, loop); dots(ctx, loop, c.I);
        res(ctx, 220, T, 'R₁'); if (mode === 'series') res(ctx, 380, T, 'R₂');
        meter(ctx, 220, T + 60, 'V', fmt(c.U1, 2) + ' В'); ctx.strokeStyle = C.mute; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(188, T); ctx.lineTo(188, T + 60); ctx.lineTo(203, T + 60); ctx.moveTo(252, T); ctx.lineTo(252, T + 60); ctx.lineTo(237, T + 60); ctx.stroke(); meter(ctx, 220, T + 60, 'V');
        if (mode === 'series') { meter(ctx, 380, T + 60, 'V', fmt(c.U2, 2) + ' В'); ctx.beginPath(); ctx.moveTo(348, T); ctx.lineTo(348, T + 60); ctx.lineTo(363, T + 60); ctx.moveTo(412, T); ctx.lineTo(412, T + 60); ctx.lineTo(397, T + 60); ctx.stroke(); meter(ctx, 380, T + 60, 'V'); }
      }
      meter(ctx, R, 200, 'A', fmt(c.I, 2) + ' А');
      ctx.fillStyle = '#fff'; ctx.fillRect(L - 20, 190, 40, 24); ctx.fillStyle = C.ink; ctx.fillRect(L - 18, 192, 36, 3); ctx.fillRect(L - 10, 206, 20, 6);
      text(ctx, '+', L - 30, 198, { bold: true }); text(ctx, U + ' В', L + 28, 208, { bold: true });
      api.state = c;
      read.set([['Загальний опір R', fmt(c.R, 2) + ' Ом'], ['Сила струму I (амперметр)', fmt(c.I, 2) + ' А'], ['I₁ / I₂', `${fmt(c.I1, 2)} / ${fmt(c.I2, 2)} А`], ['U₁ / U₂', `${fmt(c.U1, 2)} / ${fmt(c.U2, 2)} В`]]);
    };
    H.seg(panel, { label: 'Схема', options: [['one', 'один резистор'], ['series', 'послідовно'], ['parallel', 'паралельно']], value: mode }, v => { mode = v; draw(); });
    H.slider(panel, { label: 'Напруга джерела U', min: 1.5, max: 12, step: 0.5, value: U, unit: 'В' }, v => { U = v; draw(); });
    H.slider(panel, { label: 'Опір R₁', min: 1, max: 20, step: 1, value: R1, unit: 'Ом' }, v => { R1 = v; draw(); });
    H.slider(panel, { label: 'Опір R₂', min: 1, max: 20, step: 1, value: R2, unit: 'Ом' }, v => { R2 = v; draw(); });
    const read = H.readout(panel, 'Вимірювання');
    H.note(panel, 'Закон Ома: <b>I = U / R</b>. Послідовно: R = R₁ + R₂, струм однаковий. Паралельно: 1/R = 1/R₁ + 1/R₂, напруга однакова.');
    const stop = H.loop(dt => { ph += dt; draw(); });
    return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== Робота і потужність струму. Побутові прилади =============== */
  const APPL = [['🫖 Чайник', 2000], ['🔌 Праска', 1200], ['📺 Телевізор', 100], ['🧊 Холодильник', 150], ['💡 Лампа LED', 10], ['💡 Лампа розжарювання', 100], ['🍲 Мікрохвильовка', 800], ['🚿 Бойлер', 1500], ['💻 Ноутбук', 60]];
  reg('power', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 580, 380);
    const U = 220; let on = { 0: true, 2: true }, hours = 2, tariff = 4.32, fuse = 16;
    const draw = () => {
      const { ctx } = st; st.clear('#fff');
      const ids = Object.keys(on).filter(k => on[k]).map(Number), P = ids.reduce((a, i) => a + APPL[i][1], 0), I = P / U, E = P * hours * 30 / 1000;
      APPL.forEach((a, i) => { const x = 20 + (i % 3) * 120, y = 20 + Math.floor(i / 3) * 70; ctx.fillStyle = on[i] ? '#E7F8EF' : '#F3F3F7'; ctx.strokeStyle = on[i] ? C.green : '#DDD'; ctx.lineWidth = 2; rrect(ctx, x, y, 110, 58, 10); ctx.fill(); ctx.stroke();
        text(ctx, a[0], x + 8, y + 24, { size: 13, bold: true }); text(ctx, a[1] + ' Вт · ' + fmt(a[1] / U, 2) + ' А', x + 8, y + 46, { size: 11, color: C.mute }); });
      text(ctx, 'натисни на прилад, щоб увімкнути/вимкнути', 200, 235, { align: 'center', size: 11, color: C.mute });
      /* провід і запобіжник */
      const over = I > fuse, heat = Math.min(1, (I / fuse) ** 2);
      ctx.strokeStyle = `rgb(${80 + heat * 175},${80 - heat * 40},${80 - heat * 60})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(20, 280); ctx.lineTo(380, 280); ctx.stroke();
      text(ctx, 'провід нагрівається: Q = I²Rt', 200, 270, { align: 'center', size: 11, color: C.mute });
      ctx.fillStyle = over ? C.red : '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rrect(ctx, 170, 300, 60, 34, 6); ctx.fill(); ctx.stroke(); text(ctx, fuse + ' А', 200, 322, { align: 'center', bold: true, color: over ? '#fff' : C.ink });
      text(ctx, over ? '⚠ запобіжник спрацював!' : 'запобіжник', 200, 352, { align: 'center', bold: true, size: 12, color: over ? C.red : C.mute });
      /* шкала струму */
      ctx.fillStyle = '#F3F3F7'; ctx.fillRect(410, 30, 40, 300); const h = Math.min(1, I / 25) * 300; ctx.fillStyle = over ? C.red : C.green; ctx.fillRect(410, 330 - h, 40, h);
      const fy = 330 - fuse / 25 * 300; ctx.strokeStyle = C.red; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(400, fy); ctx.lineTo(470, fy); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, 'I = ' + fmt(I, 2) + ' А', 430, 350, { align: 'center', bold: true }); text(ctx, 'макс.', 475, fy + 4, { size: 11, color: C.red });
      api.state = { P, I, E, cost: E * tariff };
      read.set([['Сумарна потужність P', P + ' Вт'], ['Сила струму I = P / U', fmt(I, 2) + ' А'], ['Енергія за місяць (30 днів)', fmt(E, 1) + ' кВт·год'], ['Вартість', fmt(E * tariff, 2) + ' грн']]);
    };
    st.cv.addEventListener('click', e => { const p = st.pos(e); APPL.forEach((a, i) => { const x = 20 + (i % 3) * 120, y = 20 + Math.floor(i / 3) * 70; if (p.x > x && p.x < x + 110 && p.y > y && p.y < y + 58) on[i] = !on[i]; }); draw(); });
    H.slider(panel, { label: 'Годин роботи на добу', min: 0.5, max: 12, step: 0.5, value: hours, unit: 'год' }, v => { hours = v; draw(); });
    H.slider(panel, { label: 'Тариф', min: 1, max: 10, step: 0.01, value: tariff, unit: 'грн/кВт·год' }, v => { tariff = v; draw(); });
    H.select(panel, { label: 'Запобіжник', options: [['6', '6 А'], ['10', '10 А'], ['16', '16 А'], ['25', '25 А']], value: '16' }, v => { fuse = +v; draw(); });
    const read = H.readout(panel, 'Лічильник');
    H.note(panel, 'Напруга в мережі 220 В. <b>P = U · I</b>, <b>A = P · t</b>. 1 кВт·год = 3,6 МДж. Закон Джоуля — Ленца: <b>Q = I²Rt</b>.');
    draw();
    return { destroy: () => st.destroy() };
  });

  /* ======================= ФІЗИКА 9 ======================= */
  /* =============== Електроліз: закон Фарадея =============== */
  const ELECTRO = [['CuSO₄ → мідь', 0.329, '#D07B45', 'rgba(70,140,230,.35)'], ['AgNO₃ → срібло', 1.118, '#C9CED6', 'rgba(200,210,230,.4)'], ['ZnSO₄ → цинк', 0.339, '#9AA3AE', 'rgba(220,230,240,.4)'], ['NiSO₄ → нікель', 0.304, '#A7B0A0', 'rgba(120,200,140,.35)']];
  reg('electrolysis', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 580, 380);
    let ei = 0, I = 2, run = false, t = 0, ions = [];
    const reset = () => { t = 0; run = false; ions = Array.from({ length: 30 }, () => ({ x: 120 + Math.random() * 300, y: 140 + Math.random() * 180, s: Math.random() < 0.5 ? 1 : -1 })); draw(); };
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const [nm, k, met, sol] = ELECTRO[ei];
      ctx.fillStyle = sol; ctx.fillRect(90, 120, 380, 220); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(90, 100); ctx.lineTo(90, 340); ctx.lineTo(470, 340); ctx.lineTo(470, 100); ctx.stroke();
      const m = k * I * t; /* мг */
      ctx.fillStyle = '#555'; ctx.fillRect(130, 80, 20, 240); ctx.fillStyle = met; ctx.fillRect(130 - Math.min(10, m / 50), 120, 20 + 2 * Math.min(10, m / 50), 200);
      ctx.fillStyle = '#333'; ctx.fillRect(410, 80, 20, 240);
      text(ctx, '−  катод', 140, 70, { align: 'center', bold: true, color: C.blue }); text(ctx, 'анод  +', 420, 70, { align: 'center', bold: true, color: C.red });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(140, 80); ctx.lineTo(140, 30); ctx.lineTo(250, 30); ctx.moveTo(310, 30); ctx.lineTo(420, 30); ctx.lineTo(420, 80); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.fillRect(268, 18, 3, 24); ctx.fillRect(288, 24, 3, 12); text(ctx, 'джерело', 280, 58, { align: 'center', size: 11, color: C.mute });
      ions.forEach(o => { ctx.fillStyle = o.s > 0 ? C.red : C.blue; ctx.beginPath(); ctx.arc(o.x, o.y, 7, 0, 7); ctx.fill(); text(ctx, o.s > 0 ? '+' : '−', o.x, o.y + 4, { align: 'center', color: '#fff', bold: true, size: 11 }); });
      text(ctx, '⏱ ' + fmt(t / 60, 1) + ' хв', 470, 370, { align: 'right', bold: true, size: 16 });
      api.state = { m, q: I * t, t };
      read.set([['Пройшов заряд q = I·t', fmt(I * t, 0) + ' Кл'], ['Виділилось металу m = k·I·t', fmt(m, 1) + ' мг'], ['Електрохім. еквівалент k', fmt(k, 3) + ' мг/Кл']]);
    };
    H.select(panel, { label: 'Електроліт', options: ELECTRO.map((e, i) => [String(i), e[0]]), value: '0' }, v => { ei = +v; reset(); });
    H.slider(panel, { label: 'Сила струму I', min: 0.5, max: 5, step: 0.5, value: I, unit: 'А' }, v => { I = v; draw(); });
    H.buttons(panel, [['▶ Пуск / пауза', () => { run = !run; }, 'brand'], ['⏮ Спочатку', reset], ['⏩ +10 хв', () => { t += 600; draw(); }]]);
    const read = H.readout(panel, 'Електроліз');
    H.note(panel, 'Позитивні йони металу рухаються до <b>катода</b> (−) і осідають на ньому. Закон Фарадея: <b>m = k · I · t</b>. Час у симуляції прискорено: 1 с = 1 хв.');
    const stop = H.loop(dt => { ions.forEach(o => { o.x += (Math.random() - 0.5) * 2 - (run ? o.s * I * 0.8 : 0); o.y += (Math.random() - 0.5) * 2;
      if (o.x < 158 || o.x > 402) { o.x = 158 + Math.random() * 244; } o.y = Math.max(130, Math.min(330, o.y)); }); if (run) t += dt * 60; draw(); });
    reset();
    return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== Сила Ампера =============== */
  reg('ampere', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 560, 380);
    let B = 0.5, I = 4, Lw = 0.2, ang = 90, dirI = 1, dirB = 1, sw = 0;
    const draw = () => {
      const { ctx } = st; st.clear('#fff');
      const F = B * I * Lw * Math.sin(ang * Math.PI / 180), up = dirI * dirB; /* струм «до нас» і поле вправо → сила вгору */
      const nx = dirB > 0 ? 60 : 420, sx = dirB > 0 ? 420 : 60;
      ctx.fillStyle = C.red; rrect(ctx, nx, 120, 80, 140, 10); ctx.fill(); ctx.fillStyle = C.blue; rrect(ctx, sx, 120, 80, 140, 10); ctx.fill();
      text(ctx, 'N', nx + 40, 200, { align: 'center', bold: true, size: 30, color: '#fff' }); text(ctx, 'S', sx + 40, 200, { align: 'center', bold: true, size: 30, color: '#fff' });
      for (let i = 0; i < 5; i++) { const y = 140 + i * 25; arrow(ctx, dirB > 0 ? 150 : 410, y, dirB > 0 ? 410 : 150, y, 'rgba(79,70,229,.25)', 1.5); }
      const wy = 190 - up * Math.min(50, F * 30) * Math.min(1, sw), wx = 280;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = C.orange; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(wx, wy, 16, 0, 7); ctx.fill(); ctx.stroke();
      if (dirI > 0) { ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(wx, wy, 5, 0, 7); ctx.fill(); } else { ctx.strokeStyle = C.orange; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx - 8, wy - 8); ctx.lineTo(wx + 8, wy + 8); ctx.moveTo(wx + 8, wy - 8); ctx.lineTo(wx - 8, wy + 8); ctx.stroke(); }
      if (F > 0.001) arrow(ctx, wx + 30, wy, wx + 30, wy - up * (20 + Math.min(70, F * 60)), C.green, 4, 'F');
      text(ctx, dirI > 0 ? '⊙ струм тече до нас' : '⊗ струм тече від нас', 280, 330, { align: 'center', bold: true, color: C.orange });
      text(ctx, 'лінії поля: від N до S', 280, 110, { align: 'center', size: 11, color: C.mute });
      api.state = { F };
      read.set([['Сила Ампера F = B·I·l·sin α', fmt(F, 3) + ' Н'], ['Напрям сили', F < 0.001 ? '—' : up > 0 ? 'вгору ↑' : 'вниз ↓']]);
    };
    H.slider(panel, { label: 'Магнітна індукція B', min: 0.1, max: 1.5, step: 0.1, value: B, unit: 'Тл' }, v => { B = v; draw(); });
    H.slider(panel, { label: 'Сила струму I', min: 0, max: 10, step: 0.5, value: I, unit: 'А' }, v => { I = v; draw(); });
    H.slider(panel, { label: 'Довжина провідника l', min: 0.05, max: 0.5, step: 0.05, value: Lw, unit: 'м' }, v => { Lw = v; draw(); });
    H.slider(panel, { label: 'Кут α між провідником і полем', min: 0, max: 90, step: 15, value: ang, unit: '°' }, v => { ang = v; draw(); });
    H.buttons(panel, [['🔄 Змінити напрям струму', () => { dirI = -dirI; draw(); }, 'brand'], ['🧲 Поміняти полюси', () => { dirB = -dirB; draw(); }]]);
    const read = H.readout(panel, 'Сила Ампера');
    H.note(panel, '<b>Правило лівої руки:</b> лінії поля входять у долоню, чотири пальці — за струмом, відігнутий великий палець покаже напрям сили Ампера.');
    const stop = H.loop(dt => { sw = Math.min(1, sw + dt * 2); draw(); });
    return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== Механічні хвилі: λ = v / ν =============== */
  reg('wave', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 360);
    let v = 2, nu = 0.5, A = 40, t = 0, run = true, mark = true;
    const X0 = 40, W = 520, Lm = 10, px = x => X0 + x / Lm * W;
    const draw = () => {
      const { ctx } = st; st.clear(C.sky); const lam = v / nu, y0 = 160;
      ctx.strokeStyle = '#E3E1F7'; for (let x = 0; x <= Lm; x++) { ctx.beginPath(); ctx.moveTo(px(x), 60); ctx.lineTo(px(x), 280); ctx.stroke(); text(ctx, x, px(x), 300, { align: 'center', size: 11, color: C.mute }); }
      text(ctx, 'x, м', px(Lm), 318, { align: 'right', size: 11, bold: true });
      const yAt = x => { const front = v * t; if (x > front) return 0; return A * Math.sin(2 * Math.PI * (nu * t - x / lam)); };
      ctx.strokeStyle = C.brand; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 300; i++) { const x = i / 300 * Lm; const y = y0 - yAt(x); i ? ctx.lineTo(px(x), y) : ctx.moveTo(px(x), y); } ctx.stroke();
      [2, 5].forEach(x => { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(px(x), y0 - yAt(x), 7, 0, 7); ctx.fill(); });
      ctx.fillStyle = '#5B6177'; ctx.fillRect(X0 - 18, y0 - yAt(0) - 12, 14, 24);
      if (mark && v * t > lam * 1.5 && lam < Lm) { const ph = (nu * t) % 1; let xc = ((ph - 0.25) * lam % lam + lam) % lam; if (xc + lam > Lm) xc -= lam; if (xc < 0) xc += lam;
        if (xc + lam <= Lm) { ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px(xc), y0 - A - 12); ctx.lineTo(px(xc + lam), y0 - A - 12); ctx.stroke();
          [xc, xc + lam].forEach(x => { ctx.beginPath(); ctx.moveTo(px(x), y0 - A - 20); ctx.lineTo(px(x), y0 - A - 4); ctx.stroke(); }); text(ctx, 'λ = ' + fmt(lam, 2) + ' м', px(xc + lam / 2), y0 - A - 18, { align: 'center', bold: true, color: C.green }); } }
      api.state = { lam, T: 1 / nu, v, nu };
      read.set([['Довжина хвилі λ = v / ν', fmt(lam, 2) + ' м'], ['Період T = 1 / ν', fmt(1 / nu, 2) + ' с'], ['Час від початку', fmt(t, 1) + ' с']]);
    };
    H.slider(panel, { label: 'Швидкість хвилі v', min: 0.5, max: 5, step: 0.5, value: v, unit: 'м/с' }, x => { v = x; t = 0; draw(); });
    H.slider(panel, { label: 'Частота ν', min: 0.2, max: 2, step: 0.1, value: nu, unit: 'Гц' }, x => { nu = x; t = 0; draw(); });
    H.slider(panel, { label: 'Амплітуда', min: 10, max: 70, step: 5, value: A, unit: 'см', fmt: x => fmt(x / 10, 1) }, x => { A = x; draw(); });
    H.check(panel, { label: 'Показати довжину хвилі', value: mark }, x => { mark = x; draw(); });
    H.buttons(panel, [['⏯ Пауза', () => { run = !run; }, 'brand'], ['⏮ Спочатку', () => { t = 0; draw(); }]]);
    const read = H.readout(panel, 'Хвиля');
    H.note(panel, 'Частинки (червоні точки) лише коливаються вгору-вниз, а хвиля переносить енергію вздовж шнура. <b>v = λ · ν = λ / T</b>.');
    const stop = H.loop(dt => { if (run) t += dt; draw(); });
    return { destroy: () => { stop(); st.destroy(); } };
  });

  /* =============== Лінзи: побудова зображення =============== */
  reg('lens', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 620, 380);
    let Fc = 10, conv = true, d = 25, hO = 6;
    const cx = 330, cy = 200, sc = 6; /* 1 см = 6 px */
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const F = conv ? Fc : -Fc; const f = Math.abs(d - F) < 1e-6 ? Infinity : d * F / (d - F); const G = isFinite(f) ? -f / d : Infinity, hI = isFinite(f) ? G * hO : 0;
      ctx.strokeStyle = C.mute; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(620, cy); ctx.stroke();
      for (const s of [-2, -1, 1, 2]) { const x = cx + s * Fc * sc; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, cy, 3.5, 0, 7); ctx.fill(); text(ctx, (Math.abs(s) === 2 ? '2F' : 'F'), x, cy + 18, { align: 'center', size: 12, bold: true }); }
      ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, 50); ctx.lineTo(cx, 350); ctx.stroke();
      const tip = (y, up) => { ctx.beginPath(); if (conv) { ctx.moveTo(cx - 10, y + (up ? 12 : -12)); ctx.lineTo(cx, y); ctx.lineTo(cx + 10, y + (up ? 12 : -12)); } else { ctx.moveTo(cx - 10, y + (up ? -10 : 10)); ctx.lineTo(cx, y); ctx.lineTo(cx + 10, y + (up ? -10 : 10)); } ctx.stroke(); };
      tip(50, true); tip(350, false);
      const ox = cx - d * sc, oy = cy - hO * sc; arrow(ctx, ox, cy, ox, oy, C.green, 4); text(ctx, 'предмет', ox, cy + 34, { align: 'center', size: 11, color: C.green });
      /* промені */
      const ray = (pts, dash, col) => { ctx.strokeStyle = col || C.orange; ctx.lineWidth = 1.8; ctx.setLineDash(dash ? [5, 4] : []); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.setLineDash([]); };
      const ext = (x1, y1, x2, y2, X) => [X, y1 + (y2 - y1) * (X - x1) / (x2 - x1)];
      /* 1: паралельно осі → через фокус */
      const fx = cx + F * sc; ray([[ox, oy], [cx, oy], ext(cx, oy, fx, cy, conv ? 620 : 620)]);
      if (!conv) ray([[cx, oy], ext(cx, oy, fx, cy, ox - 40)], true);
      /* 2: через центр */ ray([[ox, oy], ext(ox, oy, cx, cy, 620)]);
      if (isFinite(f)) { const ix = cx + f * sc, iy = cy - hI * sc;
        if (f < 0) { ray([[cx, oy], [ix, iy]], true, C.mute); ray([[ox, oy], [ix, iy]], true, C.mute); }
        if (Math.abs(hI * sc) < 400 && ix > -50 && ix < 680) { arrow(ctx, ix, cy, ix, iy, f > 0 ? C.red : 'rgba(229,72,77,.5)', 4); text(ctx, f > 0 ? 'дійсне' : 'уявне', ix, cy + (hI > 0 ? 34 : -10) * (hI > 0 ? 1 : 1) + (hI < 0 ? 0 : 0), { align: 'center', size: 11, color: C.red }); } }
      text(ctx, '⇆ перетягни предмет', ox, 40, { align: 'center', size: 11, color: C.mute });
      const D = 100 / F; api.state = { f, D, G: Math.abs(G) };
      read.set([['Відстань до предмета d', fmt(d, 1) + ' см'], ['Відстань до зображення f', isFinite(f) ? fmt(f, 1) + ' см' : 'зображення немає (∞)'], ['Збільшення Г = |f| / d', isFinite(f) ? fmt(Math.abs(G), 2) : '—'], ['Оптична сила D = 1/F', fmt(D, 1) + ' дптр'], ['Зображення', !isFinite(f) ? '—' : `${f > 0 ? 'дійсне, перевернуте' : 'уявне, пряме'}, ${Math.abs(G) > 1.001 ? 'збільшене' : Math.abs(G) < 0.999 ? 'зменшене' : 'такого самого розміру'}`]]);
    };
    H.seg(panel, { label: 'Лінза', options: [['1', 'збиральна'], ['0', 'розсіювальна']], value: '1' }, v => { conv = v === '1'; draw(); });
    H.slider(panel, { label: 'Фокусна відстань F', min: 5, max: 20, step: 1, value: Fc, unit: 'см' }, v => { Fc = v; draw(); });
    const ds = H.slider(panel, { label: 'Відстань до предмета d', min: 3, max: 50, step: 1, value: d, unit: 'см' }, v => { d = v; draw(); });
    H.slider(panel, { label: 'Висота предмета', min: 2, max: 10, step: 1, value: hO, unit: 'см' }, v => { hO = v; draw(); });
    const read = H.readout(panel, 'Зображення');
    H.note(panel, 'Формула тонкої лінзи: <b>1/F = 1/d + 1/f</b>. Для уявного зображення f < 0, для розсіювальної лінзи F < 0. D = 1/F (F у метрах).');
    H.drag(st, p => Math.abs(p.x - (cx - d * sc)) < 20 && p.y < cy + 10 && p.y > cy - hO * sc - 20, p => { d = Math.max(3, Math.min(50, Math.round((cx - p.x) / sc))); ds.set(d); draw(); });
    draw();
    return { destroy: () => st.destroy() };
  });

  /* =============== Радіоактивний розпад: період напіврозпаду =============== */
  const ISO = [['Йод-131', 8, 'діб'], ['Радон-222', 3.8, 'доби'], ['Кобальт-60', 5.3, 'років'], ['Цезій-137', 30, 'років'], ['Стронцій-90', 29, 'років']];
  reg('decay', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 380);
    const N0 = 400; let ii = 0, nuc, t = 0, run = false, hist, speed = 1;
    const reset = () => { nuc = Array.from({ length: N0 }, () => 1); t = 0; run = false; hist = [[0, N0]]; draw(); };
    const draw = () => {
      const { ctx } = st; st.clear('#fff'); const [nm, T, u] = ISO[ii]; const N = nuc.reduce((a, b) => a + b, 0);
      nuc.forEach((a, i) => { const x = 20 + (i % 20) * 13, y = 30 + Math.floor(i / 20) * 15; ctx.fillStyle = a ? C.orange : '#C9CED6'; ctx.beginPath(); ctx.arc(x + 5, y + 5, 5, 0, 7); ctx.fill(); });
      text(ctx, '● нерозпалі   ● розпалися', 20, 350, { size: 12, color: C.mute });
      const tm = Math.max(4, Math.ceil(t / T)) * T;
      H.plot(ctx, { x: 330, y: 40, w: 250, h: 270 }, { xmax: tm, ymax: N0, gx: T, gy: 100, xl: 't, ' + u, yl: 'N', series: [{ pts: [...Array(61)].map((_, k) => [k / 60 * tm, N0 * Math.pow(2, -(k / 60 * tm) / T)]), color: '#C7C2F5', w: 2 }, { pts: hist, color: C.red }] });
      api.state = { N, t, T };
      read.set([['Ізотоп', `${nm}, T½ = ${fmt(T, 1)} ${u}`], ['Минуло часу', fmt(t, 1) + ' ' + u + ' (' + fmt(t / T, 2) + ' T½)'], ['Залишилось ядер N', N + ' з ' + N0], ['Теорія N = N₀·2^(−t/T)', fmt(N0 * Math.pow(2, -t / T), 0)]]);
    };
    H.select(panel, { label: 'Радіоактивний ізотоп', options: ISO.map((x, i) => [String(i), `${x[0]} (T½ = ${fmt(x[1], 1)} ${x[2]})`]), value: '0' }, v => { ii = +v; reset(); });
    H.seg(panel, { label: 'Швидкість', options: [['0.5', 'повільно'], ['1', 'звичайно'], ['3', 'швидко']], value: '1' }, v => { speed = +v; });
    H.buttons(panel, [['▶ Пуск / пауза', () => { run = !run; }, 'brand'], ['⏮ Спочатку', reset]]);
    const read = H.readout(panel, 'Розпад');
    H.note(panel, 'За час, що дорівнює <b>періоду напіврозпаду T½</b>, розпадається приблизно половина наявних ядер. Не можна передбачити, яке саме ядро розпадеться, — лише ймовірність.');
    const stop = H.loop(dt => { if (!run) return; const T = ISO[ii][1], dtt = dt * T / 2.5 * speed, p = 1 - Math.pow(2, -dtt / T); t += dtt;
      for (let i = 0; i < N0; i++) if (nuc[i] && Math.random() < p) nuc[i] = 0; hist.push([t, nuc.reduce((a, b) => a + b, 0)]); if (t > 8 * T) run = false; draw(); });
    reset();
    return { destroy: () => { stop(); st.destroy(); } };
  });
})();
