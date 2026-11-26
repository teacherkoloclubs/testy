/* Симуляції для історії, громадянської освіти, правознавства, географії (керуються даними cfg) */
(function () {
  const { reg, H } = window.Sims;
  const { fmt, text, rrect } = H;
  const C = { ink: '#1F2340', mute: '#6B6F8E', brand: '#4F46E5', red: '#E5484D', green: '#16A34A', orange: '#F59E0B', blue: '#2563EB', land: '#FEF3C7', landD: '#D6B370', sea: '#DBEAFE' };
  /* спрощений контур України (довгота, широта) */
  const UA = [[22.1,48.4],[22.6,49.1],[22.7,49.6],[23.6,50.4],[24.1,50.9],[23.7,51.6],[24.4,51.9],[25.5,51.9],[26.8,51.9],[28.0,51.6],[29.2,51.4],[30.2,51.5],[30.6,51.3],[31.3,52.1],[32.3,52.3],[33.2,52.4],[34.1,51.7],[34.4,51.2],[35.3,51.0],[35.6,50.4],[36.6,50.2],[37.5,50.4],[38.2,50.1],[39.2,49.9],[40.1,49.6],[40.0,49.0],[39.7,48.6],[39.9,48.0],[38.8,47.6],[38.2,47.1],[37.4,47.0],[36.8,46.7],[35.4,46.3],[35.0,45.7],[36.5,45.4],[36.0,45.0],[34.4,44.5],[33.5,44.5],[32.5,45.4],[33.6,45.9],[32.6,46.1],[31.6,46.6],[30.8,46.5],[30.2,45.8],[29.7,45.3],[28.2,45.5],[28.9,46.4],[29.6,46.9],[29.2,47.5],[28.2,48.2],[27.5,48.5],[26.6,48.3],[25.2,47.9],[24.0,47.9],[22.9,47.9],[22.1,48.4]];
  const shuf = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const yearLabel = y => y < 0 ? Math.abs(y) + ' р. до н. е.' : y + ' р.';

  /* ============ 1. Стрічка часу: розстав події в хронологічному порядку ============ */
  reg('timeline', (stage, panel, cfg, api) => {
    const ev = cfg.events.map(([y, t], i) => ({ y, t, i }));
    const from = cfg.from != null ? cfg.from : Math.min(...ev.map(e => e.y)), to = cfg.to != null ? cfg.to : Math.max(...ev.map(e => e.y));
    const st = H.canvas(stage, 640, 300);
    let placed = [], deck = shuf(ev), checked = false;
    H.note(panel, '👆 Натискай на події в тому порядку, у якому вони відбувалися — від найдавнішої до найпізнішої.');
    const box = H.el('div', 'tl-deck'); panel.appendChild(box);
    const rd = H.readout(panel, 'Результат');
    H.buttons(panel, [['✔ Перевірити', () => { checked = true; draw(); }, 'brand'], ['↺ Спочатку', () => { placed = []; deck = shuf(ev); checked = false; draw(); }, 'light']]);
    const X = y => 40 + (y - from) / Math.max(1, to - from) * 560;
    const draw = () => {
      box.innerHTML = deck.filter(e => !placed.includes(e)).map(e => `<button type="button" class="tl-card" data-i="${e.i}">${api.rt(e.t)}</button>`).join('') || '<span class="muted" style="font-weight:700">Усі події розставлено.</span>';
      box.querySelectorAll('.tl-card').forEach(b => b.onclick = () => { placed.push(ev[+b.dataset.i]); checked = false; draw(); });
      const { ctx } = st; st.clear('#FBFAFF');
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(610, 150); ctx.stroke();
      const step = cfg.tick || (to - from > 800 ? 100 : to - from > 200 ? 50 : to - from > 60 ? 10 : 5);
      for (let y = Math.ceil(from / step) * step; y <= to; y += step) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(y), 144); ctx.lineTo(X(y), 156); ctx.stroke(); text(ctx, String(y), X(y), 172, { size: 10, align: 'center', color: C.mute }); }
      const sorted = ev.slice().sort((a, b) => a.y - b.y);
      const order = checked ? placed.slice().sort((a, b) => a.y - b.y) : placed;
      order.forEach((e, j) => {
        const k = placed.indexOf(e), ok = sorted[k] === e || sorted[k].y === e.y;
        const lvl = [0, 2, 1, 3][j % 4], up = lvl < 2, ly = [100, 52, 200, 248][lvl];
        const x = checked ? X(e.y) : 40 + k * (560 / Math.max(1, ev.length - 1));
        ctx.strokeStyle = checked ? (ok ? C.green : C.red) : C.brand; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, up ? ly + 6 : ly - 14); ctx.stroke();
        ctx.fillStyle = checked ? (ok ? C.green : C.red) : C.brand; ctx.beginPath(); ctx.arc(x, 150, 6, 0, 7); ctx.fill();
        const label = (k + 1) + '. ' + e.t.replace(/\*\*/g, ''); const short = label.length > 24 ? label.slice(0, 23) + '…' : label;
        const tx = Math.max(70, Math.min(570, x));
        text(ctx, short, tx, ly, { size: 11, align: 'center', bold: true, color: C.ink });
        if (checked) text(ctx, yearLabel(e.y), tx, up ? ly - 14 : ly + 14, { size: 10, align: 'center', color: ok ? C.green : C.red, bold: true });
      });
      const good = placed.filter((e, k) => sorted[k] === e || sorted[k].y === e.y).length;
      rd.set([['Розставлено', placed.length + ' з ' + ev.length], ['Правильно', checked ? good + ' з ' + placed.length + (good === ev.length ? ' 🎉' : '') : 'натисни «Перевірити»']]);
      api.state = { good, total: ev.length };
    };
    st.onfit = () => draw();
    draw();
    return { destroy() { st.destroy(); } };
  });

  /* ============ 2. Карта України: знайди місто / пам’ятку ============ */
  reg('uamap', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 640, 440);
    const pts = cfg.points; /* [назва, широта, довгота, підказка] */
    const lon0 = 21.5, lon1 = 40.8, lat0 = 44.0, lat1 = 52.6;
    const X = lo => 20 + (lo - lon0) / (lon1 - lon0) * 600, Y = la => 20 + (lat1 - la) / (lat1 - lat0) * 400 * 1.0;
    let mode = 'learn', target = null, score = 0, tries = 0, last = null, order = shuf(pts);
    H.seg(panel, { label: 'Режим', options: [['learn', '📖 Вивчаю'], ['find', '🎯 Знайди на карті']], value: 'learn' }, v => { mode = v; score = tries = 0; order = shuf(pts); next(); });
    const rd = H.readout(panel, 'Гра');
    const info = H.note(panel, cfg.intro || 'Наведи або натисни на точку, щоб дізнатися про неї.');
    const next = () => { target = mode === 'find' ? order[tries % order.length] : null; last = null; draw(); };
    st.cv.addEventListener('click', e => {
      const p = st.pos(e); let best = null, bd = 1e9;
      pts.forEach(q => { const d = Math.hypot(X(q[2]) - p.x, Y(q[1]) - p.y); if (d < bd) { bd = d; best = q; } });
      if (mode === 'learn') { if (best && bd < 30) { last = best; info.innerHTML = `<b>${api.esc(best[0])}</b><br>${api.rt(best[3] || '')}`; draw(); } return; }
      if (!target) return; const d = Math.hypot(X(target[2]) - p.x, Y(target[1]) - p.y);
      tries++; const ok = d < 26; if (ok) score++; last = { p, ok, t: target };
      info.innerHTML = ok ? `✅ Так! <b>${api.esc(target[0])}</b>. ${api.rt(target[3] || '')}` : `❌ Ні, <b>${api.esc(target[0])}</b> — ось тут (позначено). ${api.rt(target[3] || '')}`;
      draw(); setTimeout(next, 1600);
    });
    const draw = () => {
      const { ctx } = st; st.clear(C.sea);
      ctx.beginPath(); UA.forEach(([lo, la], i) => i ? ctx.lineTo(X(lo), Y(la)) : ctx.moveTo(X(lo), Y(la))); ctx.closePath(); ctx.fillStyle = C.land; ctx.fill(); ctx.strokeStyle = C.landD; ctx.lineWidth = 2; ctx.stroke();
      text(ctx, 'Чорне море', X(31.5), Y(44.6), { color: '#3B82F6', size: 13, bold: true, align: 'center' }); text(ctx, 'Азовське м.', X(36.6), Y(46.1), { color: '#3B82F6', size: 11, align: 'center' });
      if (cfg.rivers !== false) { ctx.strokeStyle = '#60A5FA'; ctx.lineWidth = 2.5; ctx.beginPath(); [[30.6, 51.9], [30.5, 50.5], [31.6, 49.4], [33.4, 49.0], [35.0, 48.4], [35.1, 47.8], [34.3, 47.3], [33.3, 46.8], [32.6, 46.6]].forEach(([lo, la], i) => i ? ctx.lineTo(X(lo), Y(la)) : ctx.moveTo(X(lo), Y(la))); ctx.stroke(); text(ctx, 'Дніпро', X(31.9), Y(49.6), { color: '#2563EB', size: 11 }); }
      pts.forEach(q => { const x = X(q[2]), y = Y(q[1]); const hl = (mode === 'learn' && last === q) || (last && last.t === q && !last.ok);
        ctx.fillStyle = hl ? C.red : C.brand; ctx.beginPath(); ctx.arc(x, y, hl ? 8 : 5, 0, 7); ctx.fill();
        if (mode === 'learn' || (last && last.t === q)) text(ctx, q[0], x + 8, y - 6, { size: 12, bold: true }); });
      if (last && last.p) { ctx.strokeStyle = last.ok ? C.green : C.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(last.p.x, last.p.y, 10, 0, 7); ctx.stroke(); }
      if (mode === 'find' && target) { ctx.fillStyle = 'rgba(255,255,255,.9)'; rrect(ctx, 150, 8, 340, 34, 10); ctx.fill(); text(ctx, '🎯 Знайди: ' + target[0], 320, 31, { align: 'center', bold: true, size: 15 }); }
      rd.set(mode === 'find' ? [['Знайдено', score + ' з ' + tries]] : [['Об’єктів на карті', String(pts.length)]]);
      api.state = { score, tries };
    };
    st.onfit = () => draw();
    next();
    return { destroy() { st.destroy(); } };
  });

  /* ============ 3. Сценарій-рішення: «Що б ти зробив(ла)?» ============ */
  reg('scenario', (stage, panel, cfg, api) => {
    let i = 0, pts = 0, log = [];
    const box = H.el('div', 'sc-box'); stage.appendChild(box);
    const rd = H.readout(panel, 'Твій шлях');
    H.note(panel, cfg.role ? '🎭 Твоя роль: ' + api.rt(cfg.role) : 'Обирай рішення — і дізнавайся про їхні наслідки.');
    H.buttons(panel, [['↺ Пройти ще раз', () => { i = 0; pts = 0; log = []; draw(); }, 'light']]);
    const max = cfg.steps.reduce((a, s) => a + Math.max(...s.opts.map(o => o[2] || 0)), 0);
    const draw = () => {
      rd.set([['Крок', Math.min(i + 1, cfg.steps.length) + ' з ' + cfg.steps.length], ['Бали', pts + ' з ' + max]]);
      if (i >= cfg.steps.length) {
        const r = pts / Math.max(1, max);
        box.innerHTML = `<div class="sc-end"><div class="m-emoji">${r > 0.8 ? '🏆' : r > 0.5 ? '👍' : '🤔'}</div><h3>${pts} з ${max} балів</h3><p>${api.rt(r > 0.8 ? (cfg.win || 'Ти ухвалював(ла) виважені рішення!') : r > 0.5 ? (cfg.mid || 'Непогано, але деякі рішення мали неприємні наслідки.') : (cfg.lose || 'Спробуй ще раз — історія вчить на помилках.'))}</p>
          ${cfg.fact ? `<div class="sim-note">📚 ${api.rt(cfg.fact)}</div>` : ''}<ol class="sc-log">${log.map(l => `<li>${api.rt(l)}</li>`).join('')}</ol></div>`;
        api.state = { pts, max }; return;
      }
      const s = cfg.steps[i];
      box.innerHTML = `<div class="sc-step"><div class="sc-n">${s.e || '📜'} Крок ${i + 1}</div><p class="sc-t">${api.rt(s.t)}</p><div class="sc-opts">${s.opts.map((o, k) => `<button type="button" class="sc-opt" data-k="${k}">${api.rt(o[0])}</button>`).join('')}</div><div class="sc-res" hidden></div></div>`;
      box.querySelectorAll('.sc-opt').forEach(b => b.onclick = () => {
        const o = s.opts[+b.dataset.k]; pts += o[2] || 0; log.push(o[0].replace(/\*\*/g, '') + ' → ' + o[1]);
        box.querySelectorAll('.sc-opt').forEach(x => { x.disabled = true; }); b.classList.add((o[2] || 0) >= Math.max(...s.opts.map(z => z[2] || 0)) ? 'ok' : 'bad');
        const r = box.querySelector('.sc-res'); r.hidden = false; r.innerHTML = `${api.rt(o[1])} <button class="btn brand sm">Далі →</button>`; r.querySelector('button').onclick = () => { i++; draw(); };
      });
    };
    draw();
    return { destroy() {} };
  });

  /* ============ 4. Сортування за категоріями ============ */
  reg('classify', (stage, panel, cfg, api) => {
    let items = shuf(cfg.items.map(([t, g], i) => ({ t, g, i, at: -1 }))), sel = null, checked = false;
    const box = H.el('div', 'cl-box'); stage.appendChild(box);
    const rd = H.readout(panel, 'Результат');
    H.note(panel, '👆 Обери картку, а потім — групу, до якої вона належить.');
    H.buttons(panel, [['✔ Перевірити', () => { checked = true; draw(); }, 'brand'], ['↺ Спочатку', () => { items.forEach(x => x.at = -1); checked = false; sel = null; draw(); }, 'light']]);
    const draw = () => {
      const card = x => `<button type="button" class="cl-card ${sel === x ? 'on' : ''} ${checked && x.at >= 0 ? (x.at === x.g ? 'ok' : 'bad') : ''}" data-i="${x.i}">${api.rt(x.t)}</button>`;
      box.innerHTML = `<div class="cl-deck">${items.filter(x => x.at < 0).map(card).join('') || '<span class="muted">Усі картки розкладено</span>'}</div>
        <div class="cl-groups" style="grid-template-columns:repeat(${Math.min(cfg.groups.length, 4)},1fr)">${cfg.groups.map((g, gi) => `<div class="cl-group" data-g="${gi}"><b>${api.rt(g)}</b>${items.filter(x => x.at === gi).map(card).join('')}</div>`).join('')}</div>`;
      box.querySelectorAll('.cl-card').forEach(b => b.onclick = e => { e.stopPropagation(); const x = items.find(z => z.i === +b.dataset.i); if (x.at >= 0 && sel !== x) { x.at = -1; sel = null; } else sel = sel === x ? null : x; checked = false; draw(); });
      box.querySelectorAll('.cl-group').forEach(g => g.onclick = () => { if (!sel) return; sel.at = +g.dataset.g; sel = null; checked = false; draw(); });
      const good = items.filter(x => x.at === x.g).length;
      rd.set([['Розкладено', items.filter(x => x.at >= 0).length + ' з ' + items.length], ['Правильно', checked ? good + ' з ' + items.length + (good === items.length ? ' 🎉' : '') : '—']]);
      api.state = { good };
    };
    draw();
    return { destroy() {} };
  });

  /* ============ 5. Карта світу: координати (географія) ============ */
  reg('coords', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 640, 340);
    const X = lo => 20 + (lo + 180) / 360 * 600, Y = la => 20 + (90 - la) / 180 * 300;
    const places = cfg.places || [];
    let mode = 'read', tgt = null, mark = null, ans = null, score = 0, n = 0;
    H.seg(panel, { label: 'Завдання', options: [['read', '📍 Визнач координати точки'], ['put', '🎯 Знайди точку за координатами'], ['learn', '🌍 Об’єкти на карті']], value: 'read' }, v => { mode = v; gen(); });
    const rd = H.readout(panel, 'Відповідь');
    const f1 = H.el('div', 'sim-ctl'); f1.innerHTML = `<span class="sim-ctl-l">Широта / довгота</span><div class="geo-in"><input class="input" id="gLa" placeholder="напр. 50 пн.ш." ><input class="input" id="gLo" placeholder="напр. 30 сх.д."></div>`; panel.appendChild(f1);
    const fb = H.note(panel, '');
    H.buttons(panel, [['✔ Перевірити', () => check(), 'brand'], ['➡ Нове завдання', () => gen(), 'light']]);
    const parse = (s, pos, neg) => { s = String(s || '').toLowerCase().replace(',', '.'); const m = s.match(/-?\d+(\.\d+)?/); if (!m) return NaN; let v = Math.abs(parseFloat(m[0])); if (s.includes('-') || neg.some(w => s.includes(w))) v = -v; return v; };
    const fmtLa = v => Math.abs(v) + '° ' + (v >= 0 ? 'пн. ш.' : 'пд. ш.'), fmtLo = v => Math.abs(v) + '° ' + (v >= 0 ? 'сх. д.' : 'зх. д.');
    const gen = () => { ans = null; mark = null; fb.innerHTML = '';
      if (mode === 'learn') { f1.hidden = true; fb.innerHTML = 'Натисни на точку, щоб дізнатися її координати.'; draw(); return; }
      f1.hidden = mode !== 'read';
      tgt = places.length && Math.random() < 0.6 ? (() => { const p = H.pick(places); return { la: p[1], lo: p[2], name: p[0] }; })() : { la: H.rnd(-6, 7) * 10, lo: H.rnd(-17, 17) * 10 };
      if (mode === 'put') fb.innerHTML = `Натисни на карті точку з координатами <b>${fmtLa(tgt.la)}, ${fmtLo(tgt.lo)}</b>${tgt.name ? '' : ''}.`;
      draw(); };
    const check = () => {
      if (mode !== 'read') return; const la = parse(document.getElementById('gLa').value, 0, ['пд', 'півд', 's']), lo = parse(document.getElementById('gLo').value, 0, ['зх', 'з.', 'w']);
      n++; const ok = Math.abs(la - tgt.la) <= 3 && Math.abs(lo - tgt.lo) <= 3; if (ok) score++;
      fb.innerHTML = ok ? `✅ Правильно! ${fmtLa(tgt.la)}, ${fmtLo(tgt.lo)}${tgt.name ? ' — ' + api.esc(tgt.name) : ''}` : `❌ Правильна відповідь: <b>${fmtLa(tgt.la)}, ${fmtLo(tgt.lo)}</b>${tgt.name ? ' — ' + api.esc(tgt.name) : ''}. Пам’ятай: північна/південна широта, східна/західна довгота.`; draw(); };
    st.cv.addEventListener('click', e => { const p = st.pos(e); const lo = Math.round(((p.x - 20) / 600 * 360 - 180)), la = Math.round(90 - (p.y - 20) / 300 * 180);
      if (mode === 'learn') { let best = null, bd = 1e9; places.forEach(q => { const d = Math.hypot(X(q[2]) - p.x, Y(q[1]) - p.y); if (d < bd) { bd = d; best = q; } }); if (best && bd < 20) { mark = { la: best[1], lo: best[2] }; fb.innerHTML = `<b>${api.esc(best[0])}</b>: ${fmtLa(best[1])}, ${fmtLo(best[2])}`; draw(); } return; }
      if (mode !== 'put' || !tgt) return; mark = { la, lo }; n++; const ok = Math.abs(la - tgt.la) <= 5 && Math.abs(lo - tgt.lo) <= 5; if (ok) score++;
      fb.innerHTML = ok ? `✅ Влучно! Ти поставив(ла) точку ${fmtLa(la)}, ${fmtLo(lo)}.` : `❌ Твоя точка: ${fmtLa(la)}, ${fmtLo(lo)}. Правильне місце позначено зеленим.`; ans = true; draw(); });
    const draw = () => {
      const { ctx } = st; st.clear('#E0F2FE');
      ctx.strokeStyle = '#BAE6FD'; ctx.lineWidth = 1;
      for (let lo = -180; lo <= 180; lo += 30) { ctx.beginPath(); ctx.moveTo(X(lo), Y(90)); ctx.lineTo(X(lo), Y(-90)); ctx.stroke(); text(ctx, Math.abs(lo) + '°', X(lo), 334, { size: 9, align: 'center', color: C.mute }); }
      for (let la = -90; la <= 90; la += 30) { ctx.beginPath(); ctx.moveTo(X(-180), Y(la)); ctx.lineTo(X(180), Y(la)); ctx.stroke(); text(ctx, Math.abs(la) + '°', 14, Y(la) + 3, { size: 9, align: 'right', color: C.mute }); }
      ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(-180), Y(0)); ctx.lineTo(X(180), Y(0)); ctx.stroke(); text(ctx, 'екватор', X(-175), Y(0) - 4, { size: 10, color: C.red });
      ctx.strokeStyle = C.blue; ctx.beginPath(); ctx.moveTo(X(0), Y(90)); ctx.lineTo(X(0), Y(-90)); ctx.stroke(); text(ctx, 'початковий (Гринвіцький) меридіан', X(2), Y(80), { size: 10, color: C.blue });
      (cfg.land || CONT).forEach(poly => { ctx.beginPath(); poly.forEach(([lo, la], i) => i ? ctx.lineTo(X(lo), Y(la)) : ctx.moveTo(X(lo), Y(la))); ctx.closePath(); ctx.fillStyle = 'rgba(214,179,112,.55)'; ctx.fill(); });
      text(ctx, 'Пн', X(0) + 8, 30, { bold: true, size: 11 }); text(ctx, 'Сх', 612, Y(0) - 6, { bold: true, size: 11 });
      if (mode === 'learn') places.forEach(q => { ctx.fillStyle = C.brand; ctx.beginPath(); ctx.arc(X(q[2]), Y(q[1]), 4, 0, 7); ctx.fill(); text(ctx, q[0], X(q[2]) + 6, Y(q[1]) - 4, { size: 10 }); });
      if (mode === 'read' && tgt) { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(X(tgt.lo), Y(tgt.la), 7, 0, 7); ctx.fill(); }
      if (mode === 'put' && ans && tgt) { ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(X(tgt.lo), Y(tgt.la), 7, 0, 7); ctx.fill(); }
      if (mark) { ctx.strokeStyle = C.orange; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(mark.lo), Y(mark.la), 9, 0, 7); ctx.stroke(); }
      rd.set([['Правильних відповідей', score + ' з ' + n]]); api.state = { score, n };
    };
    st.onfit = () => draw();
    gen();
    return { destroy() { st.destroy(); } };
  });
  /* дуже спрощені обриси материків (для координатної сітки) */
  const CONT = [
    [[-168, 66], [-140, 70], [-95, 72], [-75, 68], [-60, 55], [-66, 45], [-80, 25], [-97, 18], [-87, 15], [-78, 8], [-105, 20], [-117, 32], [-125, 48], [-140, 60]],
    [[-78, 8], [-60, 10], [-50, 0], [-35, -7], [-40, -22], [-58, -38], [-68, -55], [-75, -45], [-71, -18], [-81, -5]],
    [[-17, 15], [-10, 35], [10, 37], [32, 31], [43, 12], [51, 11], [40, -15], [20, -35], [12, -18], [9, 4], [-8, 5]],
    [[-10, 36], [-9, 43], [-2, 48], [5, 52], [10, 58], [25, 70], [60, 70], [100, 77], [140, 72], [180, 68], [160, 60], [140, 45], [122, 30], [108, 20], [100, 8], [80, 8], [70, 22], [56, 26], [48, 30], [36, 36], [26, 40], [12, 44]],
    [[113, -22], [122, -18], [136, -12], [146, -18], [153, -28], [146, -39], [135, -35], [115, -34]],
    [[-180, -70], [180, -70], [180, -90], [-180, -90]]
  ];

  /* ============ 6. Масштаб: від карти до місцевості ============ */
  reg('scale', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 640, 320);
    const SC = cfg.scales || [10000, 25000, 50000, 100000, 200000, 1000000];
    let sc = SC[2], A, B, ans = null;
    const sel = H.select(panel, { label: 'Масштаб карти', options: SC.map(s => [s, '1 : ' + s.toLocaleString('uk-UA')]), value: sc }, v => { sc = +v; gen(); });
    const rd = H.readout(panel, 'Вимірювання');
    const inp = H.el('div', 'sim-ctl'); inp.innerHTML = '<span class="sim-ctl-l">Відстань на місцевості</span><div class="geo-in"><input class="input" id="sAns" placeholder="число"><select class="input" id="sU"><option value="m">м</option><option value="km">км</option></select></div>'; panel.appendChild(inp);
    const fb = H.note(panel, 'Виміряй лінійкою відстань між точками A і B (у сантиметрах) і переведи в метри чи кілометри за масштабом.');
    H.buttons(panel, [['✔ Перевірити', () => {
      const v = parseFloat(String(document.getElementById('sAns').value).replace(',', '.')), u = document.getElementById('sU').value; const real = cm() * sc / 100;
      const got = u === 'km' ? v * 1000 : v; const ok = Math.abs(got - real) <= real * 0.04;
      fb.innerHTML = ok ? `✅ Правильно: ${fmt(cm(), 1)} см × ${sc.toLocaleString('uk-UA')} = ${fmt(real, 0)} м${real >= 1000 ? ' = ' + fmt(real / 1000, 2) + ' км' : ''}.` : `❌ Розв’язання: 1 см на карті = ${(sc / 100).toLocaleString('uk-UA')} м на місцевості. ${fmt(cm(), 1)} см × ${(sc / 100).toLocaleString('uk-UA')} м = <b>${fmt(real, 0)} м</b>.`;
    }, 'brand'], ['➡ Нове завдання', () => gen(), 'light']]);
    const PX = 40; /* 1 см = 40 px */
    const cm = () => Math.round(Math.hypot(B.x - A.x, B.y - A.y) / PX * 10) / 10;
    const gen = () => { A = { x: H.rnd(60, 200), y: H.rnd(80, 240) }; const L = H.rnd(3, 11) * PX + H.rnd(0, 9) * PX / 10; B = { x: Math.min(600, A.x + L), y: A.y + H.rnd(-2, 2) * 10 }; fb.innerHTML = 'Виміряй лінійкою відстань між точками A і B (у сантиметрах) і переведи в метри чи кілометри за масштабом.'; draw(); };
    const draw = () => {
      const { ctx } = st; st.clear('#F0FDF4');
      ctx.fillStyle = '#BBF7D0'; ctx.beginPath(); ctx.ellipse(450, 110, 120, 50, 0.3, 0, 7); ctx.fill(); ctx.strokeStyle = '#93C5FD'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 280); ctx.bezierCurveTo(200, 230, 400, 300, 640, 250); ctx.stroke();
      [A, B].forEach((p, i) => { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, 7); ctx.fill(); text(ctx, i ? 'B' : 'A', p.x, p.y - 12, { bold: true, align: 'center', size: 15 }); });
      ctx.setLineDash([6, 5]); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.setLineDash([]);
      /* лінійка */
      ctx.fillStyle = 'rgba(253,233,184,.92)'; ctx.fillRect(A.x, A.y + 24, 13 * PX, 30); ctx.strokeStyle = C.ink; ctx.strokeRect(A.x, A.y + 24, 13 * PX, 30);
      for (let m = 0; m <= 130; m++) { const x = A.x + m * PX / 10; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, A.y + 24); ctx.lineTo(x, A.y + 24 + (m % 10 ? (m % 5 ? 5 : 8) : 12)); ctx.stroke(); if (m % 10 === 0) text(ctx, String(m / 10), x, A.y + 50, { size: 10, align: 'center' }); }
      text(ctx, 'Масштаб 1 : ' + sc.toLocaleString('uk-UA') + '  (в 1 см — ' + (sc / 100 >= 1000 ? (sc / 100000) + ' км' : (sc / 100) + ' м') + ')', 20, 24, { bold: true });
      rd.set([['Іменований масштаб', 'в 1 см ' + (sc / 100 >= 1000 ? (sc / 100000).toLocaleString('uk-UA') + ' км' : (sc / 100).toLocaleString('uk-UA') + ' м')]]);
      api.state = { cm: cm(), sc };
    };
    st.onfit = () => draw();
    gen();
    return { destroy() { st.destroy(); } };
  });

  /* ============ 7. Азимут і сторони горизонту ============ */
  reg('azimuth', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 640, 360);
    const objs = cfg.objects || [['🏫 Школа'], ['🌳 Дуб'], ['⛪ Церква'], ['🏠 Будинок'], ['🗼 Вежа'], ['🌉 Міст']];
    let list = [], tgt = 0, guess = 0, done = false, score = 0, n = 0;
    const sl = H.slider(panel, { label: 'Твій азимут', min: 0, max: 355, step: 5, value: 0, unit: '°' }, v => { guess = v; draw(); });
    const rd = H.readout(panel, 'Результат'); const fb = H.note(panel, 'Азимут — кут між напрямком на північ і напрямком на предмет, відлічений **за годинниковою стрілкою** (0°–360°).');
    H.buttons(panel, [['✔ Перевірити', () => { if (done) return; done = true; n++; const d = Math.abs(((guess - list[tgt].az + 540) % 360) - 180); if (d <= 10) score++; fb.innerHTML = d <= 10 ? `✅ Так! Азимут на ${list[tgt].n} ≈ ${list[tgt].az}°.` : `❌ Азимут на ${list[tgt].n} — ${list[tgt].az}° (${side(list[tgt].az)}).`; draw(); }, 'brand'], ['➡ Наступний предмет', () => gen(), 'light']]);
    const side = a => ['північ', 'північний схід', 'схід', 'південний схід', 'південь', 'південний захід', 'захід', 'північний захід'][Math.round(a / 45) % 8];
    const gen = () => { list = H.shuffle(objs).slice(0, 4).map(o => ({ n: o[0], az: H.rnd(1, 71) * 5 })); tgt = H.rnd(0, 3); done = false; fb.innerHTML = `Визнач азимут на <b>${api.esc(list[tgt].n)}</b> і встанови його повзунком.`; draw(); };
    const draw = () => {
      const { ctx } = st; st.clear('#F8FAFF'); const cx = 320, cy = 180, R = 140;
      ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
      for (let a = 0; a < 360; a += 10) { const r = (a - 90) * Math.PI / 180; ctx.beginPath(); ctx.moveTo(cx + Math.cos(r) * (R - (a % 30 ? 5 : 10)), cy + Math.sin(r) * (R - (a % 30 ? 5 : 10))); ctx.lineTo(cx + Math.cos(r) * R, cy + Math.sin(r) * R); ctx.stroke(); if (a % 30 === 0) text(ctx, a + '°', cx + Math.cos(r) * (R + 14), cy + Math.sin(r) * (R + 14) + 4, { size: 10, align: 'center', color: C.mute }); }
      [['Пн', 0], ['Сх', 90], ['Пд', 180], ['Зх', 270]].forEach(([t, a]) => { const r = (a - 90) * Math.PI / 180; text(ctx, t, cx + Math.cos(r) * (R - 24), cy + Math.sin(r) * (R - 24) + 5, { bold: true, align: 'center', size: 14, color: a ? C.ink : C.red }); });
      list.forEach((o, i) => { const r = (o.az - 90) * Math.PI / 180, x = cx + Math.cos(r) * (R - 50), y = cy + Math.sin(r) * (R - 50); text(ctx, o.n.split(' ')[0], x, y + 7, { size: 22, align: 'center' }); if (i === tgt) { ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.stroke(); } });
      const draw1 = (a, col, w) => { const r = (a - 90) * Math.PI / 180; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(r) * (R - 30), cy + Math.sin(r) * (R - 30)); ctx.stroke(); };
      draw1(0, C.red, 2); draw1(guess, C.brand, 3); if (done) draw1(list[tgt].az, C.green, 3);
      ctx.strokeStyle = 'rgba(79,70,229,.4)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, 30, -Math.PI / 2, (guess - 90) * Math.PI / 180); ctx.stroke();
      rd.set([['Встановлено', guess + '° (' + side(guess) + ')'], ['Правильно', score + ' з ' + n]]); api.state = { score };
    };
    st.onfit = () => draw();
    gen();
    return { destroy() { st.destroy(); } };
  });

  /* ============ 8. Часові пояси ============ */
  reg('timezones', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 640, 300);
    const cities = cfg.cities || [['Київ', 2, 30.5], ['Лондон', 0, 0], ['Нью-Йорк', -5, -74], ['Токіо', 9, 139.7], ['Пекін', 8, 116.4], ['Делі', 5.5, 77.2], ['Сідней', 10, 151.2], ['Ріо-де-Жанейро', -3, -43.2], ['Каїр', 2, 31.2], ['Лос-Анджелес', -8, -118.2], ['Дубай', 4, 55.3]];
    let h = 12, a = 0, b = 2;
    H.slider(panel, { label: 'Час у Києві (зимовий)', min: 0, max: 23, step: 1, value: h, unit: 'год' }, v => { h = v; draw(); });
    H.select(panel, { label: 'Місто', options: cities.map((c, i) => [i, c[0]]), value: 2 }, v => { b = +v; draw(); });
    const rd = H.readout(panel, 'Час'); H.note(panel, 'Землю поділено на **24 часові пояси** по 15° довготи. На схід від нас час більший, на захід — менший. Київ — 2-й пояс (UTC+2).');
    const draw = () => {
      const { ctx } = st; st.clear('#F8FAFF'); const X = lo => 20 + (lo + 180) / 360 * 600;
      for (let z = -12; z < 12; z++) { ctx.fillStyle = z % 2 ? '#EEF2FF' : '#E0E7FF'; ctx.fillRect(X(z * 15 - 7.5), 30, 600 / 24, 220); text(ctx, (z > 0 ? '+' : '') + z, X(z * 15), 266, { size: 9, align: 'center', color: C.mute }); }
      const local = c => ((h - 2 + c[1]) % 24 + 24) % 24;
      cities.forEach((c, i) => { const x = X(c[2]); ctx.fillStyle = i === b ? C.red : i === 0 ? C.blue : C.brand; ctx.beginPath(); ctx.arc(x, 140, i === b || i === 0 ? 7 : 4, 0, 7); ctx.fill(); if (i === b || i === 0) { text(ctx, c[0], x, 120, { align: 'center', bold: true }); const t = local(c); text(ctx, String(Math.floor(t)).padStart(2, '0') + ':' + (t % 1 ? '30' : '00'), x, 168, { align: 'center', bold: true, color: i === b ? C.red : C.blue }); } });
      text(ctx, 'UTC — пояси', 20, 290, { size: 10, color: C.mute });
      const c = cities[b], t = local(c), diff = c[1] - 2;
      rd.set([['Київ', String(h).padStart(2, '0') + ':00'], [c[0], String(Math.floor(t)).padStart(2, '0') + ':' + (t % 1 ? '30' : '00')], ['Різниця', (diff > 0 ? '+' : '') + diff + ' год']]);
      api.state = { diff, h };
    };
    st.onfit = () => draw();
    draw();
    return { destroy() { st.destroy(); } };
  });
})();
