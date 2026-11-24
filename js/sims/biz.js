/* Симуляції з фінансової грамотності та підприємництва (8–9 класи) */
(function () {
  const { reg, H } = window.Sims;
  const { fmt, text, rrect } = H;
  const C = { ink: '#1F2340', mute: '#6B6F8E', brand: '#4F46E5', blue: '#2563EB', red: '#E5484D', green: '#16A34A', orange: '#F59E0B', pink: '#EC4899', soft: '#EEF0FF' };
  const PAL = ['#4F46E5', '#F59E0B', '#16A34A', '#E5484D', '#22D3EE', '#EC4899', '#A16207', '#9CA3AF'];
  const g = v => fmt(v, 2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' грн';
  const gi = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' грн';
  const donut = (ctx, cx, cy, r, parts) => { const tot = parts.reduce((a, p) => a + p[1], 0) || 1; let a = -Math.PI / 2; parts.forEach(([l, v, c]) => { const da = v / tot * Math.PI * 2; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a, a + da); ctx.closePath(); ctx.fill(); a += da; }); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, 7); ctx.fill(); };
  const legend = (ctx, x, y, parts, tot) => parts.forEach(([l, v, c], i) => { ctx.fillStyle = c; rrect(ctx, x, y + i * 22, 14, 14, 3); ctx.fill(); text(ctx, `${l}: ${tot ? fmt(v / tot * 100, 0) + '%' : gi(v)}`, x + 20, y + i * 22 + 12, { size: 12 }); });

  /* =============== Сімейний бюджет =============== */
  reg('budget', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 400);
    const inc = { 'Зарплата 1': 18000, 'Зарплата 2': 14000, 'Інші доходи': 2000 };
    const exp = { 'Харчування': 12000, 'Комуналка': 4500, 'Транспорт': 2000, 'Одяг': 2500, 'Зв’язок': 600, 'Розваги': 2000, 'Інше': 1500 };
    let goal = 30000;
    const draw = () => { const { ctx } = st; st.clear('#fff'); const I = Object.values(inc).reduce((a, b) => a + b, 0), E = Object.values(exp).reduce((a, b) => a + b, 0), B = I - E;
      const mx = Math.max(I, E) * 1.1, h = v => v / mx * 300;
      ctx.fillStyle = C.green; rrect(ctx, 50, 340 - h(I), 70, h(I), 8); ctx.fill(); ctx.fillStyle = C.red; rrect(ctx, 140, 340 - h(E), 70, h(E), 8); ctx.fill();
      text(ctx, 'Доходи', 85, 360, { align: 'center', bold: true }); text(ctx, 'Витрати', 175, 360, { align: 'center', bold: true }); text(ctx, gi(I), 85, 334 - h(I), { align: 'center', size: 12, bold: true }); text(ctx, gi(E), 175, 334 - h(E), { align: 'center', size: 12, bold: true });
      const parts = Object.entries(exp).map(([k, v], i) => [k, v, PAL[i]]); donut(ctx, 320, 150, 95, parts); text(ctx, 'Структура', 320, 146, { align: 'center', bold: true, size: 13 }); text(ctx, 'витрат', 320, 164, { align: 'center', bold: true, size: 13 }); legend(ctx, 428, 50, parts, E);
      const type = B > 0 ? 'профіцитний' : B < 0 ? 'дефіцитний' : 'збалансований', months = B > 0 ? Math.ceil(goal / B) : Infinity;
      text(ctx, `Бюджет ${type}: ${B >= 0 ? '+' : '−'}${gi(Math.abs(B))} на місяць`, 300, 390, { align: 'center', bold: true, size: 15, color: B > 0 ? C.green : B < 0 ? C.red : C.ink });
      api.state = { I, E, B, months, food: exp['Харчування'] / E * 100 };
      read.set([['Доходи', gi(I)], ['Витрати', gi(E)], ['Залишок (заощадження)', gi(B)], ['Тип бюджету', type], ['Мета ' + gi(goal) + ' — за', isFinite(months) ? months + ' міс.' : 'недосяжна без змін']]); };
    const sec = t => { const d = H.el('div', 'sim-read-t', t); panel.appendChild(d); };
    sec('Доходи на місяць'); Object.keys(inc).forEach(k => H.slider(panel, { label: k, min: 0, max: 40000, step: 500, value: inc[k], unit: 'грн' }, v => { inc[k] = v; draw(); }));
    sec('Витрати на місяць'); Object.keys(exp).forEach(k => H.slider(panel, { label: k, min: 0, max: 20000, step: 100, value: exp[k], unit: 'грн' }, v => { exp[k] = v; draw(); }));
    H.slider(panel, { label: 'Фінансова мета (наприклад, ноутбук)', min: 5000, max: 100000, step: 1000, value: goal, unit: 'грн' }, v => { goal = v; draw(); });
    const read = H.readout(panel, 'Бюджет сім’ї');
    H.note(panel, '<b>Профіцитний</b> бюджет: доходи > витрат — можна заощаджувати. <b>Дефіцитний</b>: витрати > доходів — доводиться позичати. Правило: відкладай щонайменше 10% доходу одразу після його отримання.');
    draw(); return { destroy: () => st.destroy() };
  });

  /* =============== Податки: зарплата та ФОП =============== */
  const TAX = { pdfo: 0.18, vz: 0.05, esv: 0.22, minw: 8647, fop2: 1729.40, fop3: 0.05, vzFop12: 864.70, vzFop3: 0.01 };
  reg('tax', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 380); let mode = 'emp', gross = 20000;
    const calc = () => { if (mode === 'emp') { const p = gross * TAX.pdfo, v = gross * TAX.vz, e = gross * TAX.esv; return { net: gross - p - v, parts: [['ПДФО 18%', p, C.red], ['Військовий збір 5%', v, C.orange], ['На руки', gross - p - v, C.green]], esv: e, cost: gross + e, pdfo: p, vz: v }; }
      const esv = TAX.minw * TAX.esv; if (mode === 'fop3') { const t = gross * TAX.fop3, v = gross * TAX.vzFop3; return { net: gross - t - v - esv, parts: [['Єдиний податок 5%', t, C.red], ['Військовий збір 1%', v, C.orange], ['ЄСВ (22% від мін. ЗП)', esv, C.blue], ['Залишається', Math.max(0, gross - t - v - esv), C.green]], esv, pdfo: t, vz: v }; }
      const t = TAX.fop2, v = TAX.vzFop12; return { net: gross - t - v - esv, parts: [['Єдиний податок (фікс.)', t, C.red], ['Військовий збір (10% мін. ЗП)', v, C.orange], ['ЄСВ (22% від мін. ЗП)', esv, C.blue], ['Залишається', Math.max(0, gross - t - v - esv), C.green]], esv, pdfo: t, vz: v }; };
    const draw = () => { const { ctx } = st; st.clear('#fff'); const c = calc(), tot = c.parts.reduce((a, p) => a + p[1], 0);
      donut(ctx, 170, 180, 140, c.parts); text(ctx, mode === 'emp' ? 'нараховано' : 'дохід', 170, 172, { align: 'center', size: 12, color: C.mute }); text(ctx, gi(gross), 170, 194, { align: 'center', bold: true, size: 16 });
      c.parts.forEach(([l, v, col], i) => { ctx.fillStyle = col; rrect(ctx, 340, 70 + i * 40, 18, 18, 4); ctx.fill(); text(ctx, l, 366, 84 + i * 40, { size: 13, bold: true }); text(ctx, g(v) + ` (${fmt(v / tot * 100, 1)}%)`, 366, 100 + i * 40, { size: 12, color: C.mute }); });
      if (mode === 'emp') text(ctx, `+ роботодавець сплачує ЄСВ 22%: ${g(c.esv)}`, 340, 250, { size: 12, color: C.blue, bold: true });
      api.state = { net: c.net, pdfo: c.pdfo, vz: c.vz, esv: c.esv, cost: c.cost };
      read.set(mode === 'emp' ? [['Нараховано', g(gross)], ['ПДФО (18%)', g(c.pdfo)], ['Військовий збір (5%)', g(c.vz)], ['На руки', g(c.net)], ['Витрати роботодавця з ЄСВ', g(c.cost)]] : [['Дохід за місяць', g(gross)], ['Податки й внески разом', g(gross - c.net)], ['Залишається', g(c.net)]]); };
    H.seg(panel, { label: 'Форма зайнятості', options: [['emp', 'найманий працівник'], ['fop2', 'ФОП 2 група'], ['fop3', 'ФОП 3 група']], value: mode }, v => { mode = v; draw(); });
    const gs = H.slider(panel, { label: 'Заробітна плата / дохід за місяць', min: TAX.minw, max: 80000, step: 1, value: gross, unit: 'грн', fmt: v => String(Math.round(v)) }, v => { gross = v; draw(); });
    H.buttons(panel, [['Мінімальна зарплата', () => { gross = TAX.minw; gs.set(gross); draw(); }], ['20 000 грн', () => { gross = 20000; gs.set(gross); draw(); }]]);
    const read = H.readout(panel, 'Розрахунок');
    H.note(panel, 'Ставки станом на 2026 р.: ПДФО 18%, військовий збір 5% із зарплати, ЄСВ 22% сплачує роботодавець. Мінімальна зарплата — 8647 грн. ФОП 2 групи: єдиний податок до 1729,40 грн; ФОП 3 групи — 5% доходу. Податки фінансують освіту, медицину, оборону, дороги.');
    draw(); return { destroy: () => st.destroy() };
  });

  /* =============== Інфляція і купівельна спроможність =============== */
  reg('inflation', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 380); let rate = 8, years = 10, sum = 1000;
    const draw = () => { const { ctx } = st; st.clear('#fff'); const r = rate / 100, pts = [...Array(years + 1)].map((_, y) => [y, sum * Math.pow(1 + r, y)]), pow = [...Array(years + 1)].map((_, y) => [y, sum / Math.pow(1 + r, y)]);
      const ym = Math.ceil(sum * Math.pow(1 + r, years) / 500) * 500;
      H.plot(ctx, { x: 70, y: 30, w: 500, h: 290 }, { xmax: years, ymax: ym, gx: years > 10 ? 5 : 1, gy: ym / 5, xl: 'роки', yl: 'грн', series: [{ pts, color: C.red }, { pts: pow, color: C.green }, { pts, dots: true, color: C.red }] });
      text(ctx, '— вартість того самого кошика товарів', 80, 362, { color: C.red, bold: true, size: 12 }); text(ctx, '— що можна купити на ' + gi(sum) + ' (у сьогоднішніх цінах)', 330, 362, { color: C.green, bold: true, size: 12 });
      const fin = sum * Math.pow(1 + r, years), dbl = r > 0 ? Math.log(2) / Math.log(1 + r) : Infinity;
      api.state = { fin, power: sum / Math.pow(1 + r, years), dbl };
      read.set([['Кошик зараз', gi(sum)], [`Кошик через ${years} р.`, g(fin)], ['Купівельна спроможність ' + gi(sum), g(sum / Math.pow(1 + r, years))], ['Ціни подвояться через', isFinite(dbl) ? fmt(dbl, 1) + ' р.' : '—']]); };
    H.slider(panel, { label: 'Річна інфляція', min: 0, max: 30, step: 0.5, value: rate, unit: '%' }, v => { rate = v; draw(); });
    H.slider(panel, { label: 'Кількість років', min: 1, max: 20, value: years }, v => { years = v; draw(); });
    H.slider(panel, { label: 'Вартість кошика сьогодні', min: 100, max: 5000, step: 100, value: sum, unit: 'грн' }, v => { sum = v; draw(); });
    const read = H.readout(panel, 'Інфляція');
    H.note(panel, '<b>Інфляція</b> — зростання загального рівня цін, через яке гроші знецінюються. Ціна через n років: <b>P = P₀ · (1 + i)ⁿ</b>. «Правило 70»: ціни подвояться приблизно через 70 : i років.');
    draw(); return { destroy: () => st.destroy() };
  });

  /* =============== Депозит: прості та складні відсотки =============== */
  reg('deposit', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 380); let P = 10000, rate = 12, n = 12, cap = false, tax = false;
    const calc = (m, capz) => { const i = rate / 100 / 12 * (tax ? 0.77 : 1); return capz ? P * Math.pow(1 + i, m) : P * (1 + i * m); };
    const draw = () => { const { ctx } = st; st.clear('#fff'); const a = [...Array(n + 1)].map((_, m) => [m, calc(m, false)]), b = [...Array(n + 1)].map((_, m) => [m, calc(m, true)]);
      const ym = Math.ceil(calc(n, true) / 1000) * 1000, y0 = Math.floor(P / 1000) * 1000;
      H.plot(ctx, { x: 80, y: 30, w: 490, h: 290 }, { xmax: n, ymin: y0, ymax: ym, gx: n > 24 ? 12 : n > 12 ? 6 : 2, gy: (ym - y0) / 5, xl: 'місяці', yl: 'сума на рахунку, грн', series: [{ pts: a, color: '#F59E0B' }, { pts: b, color: C.brand }] });
      text(ctx, '— без капіталізації (прості відсотки)', 90, 362, { color: '#B45309', bold: true, size: 12 }); text(ctx, '— щомісячна капіталізація', 380, 362, { color: C.brand, bold: true, size: 12 });
      const fin = calc(n, cap), inc = fin - P, gross = (cap ? P * Math.pow(1 + rate / 100 / 12, n) : P * (1 + rate / 100 / 12 * n)) - P;
      api.state = { fin, inc, tax: tax ? gross - inc : 0, gross };
      read.set([['Вклад', gi(P)], ['Нараховано відсотків', g(gross)], ['Податки (ПДФО 18% + ВЗ 5%)', tax ? g(gross - inc) : 'не враховано'], ['Чистий дохід', g(inc)], ['Сума в кінці строку', g(fin)]]); };
    H.slider(panel, { label: 'Сума вкладу', min: 1000, max: 100000, step: 1000, value: P, unit: 'грн' }, v => { P = v; draw(); });
    H.slider(panel, { label: 'Річна ставка', min: 1, max: 25, step: 0.5, value: rate, unit: '%' }, v => { rate = v; draw(); });
    H.slider(panel, { label: 'Строк', min: 3, max: 60, value: n, unit: 'міс.' }, v => { n = v; draw(); });
    H.check(panel, { label: 'Капіталізація відсотків щомісяця', value: cap }, v => { cap = v; draw(); });
    H.check(panel, { label: 'Утримувати податки з доходу (23%)', value: tax }, v => { tax = v; draw(); });
    const read = H.readout(panel, 'Депозит');
    H.note(panel, 'Прості відсотки: <b>S = P · (1 + r·t)</b>. Капіталізація — відсотки додаються до вкладу й самі приносять відсотки: <b>S = P · (1 + r/12)ⁿ</b>. З доходу за депозитом утримують ПДФО 18% і військовий збір 5%. Вклади в банках гарантує Фонд гарантування вкладів.');
    draw(); return { destroy: () => st.destroy() };
  });

  /* =============== Кредит: ануїтет і класична схема =============== */
  reg('credit', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 380); let S = 12000, rate = 24, n = 12, ann = true;
    const sched = () => { const i = rate / 100 / 12, rows = []; let rest = S; if (ann) { const A = i ? S * i / (1 - Math.pow(1 + i, -n)) : S / n; for (let k = 0; k < n; k++) { const int = rest * i, pr = A - int; rest -= pr; rows.push([pr, int]); } } else { const pr = S / n; for (let k = 0; k < n; k++) { const int = rest * i; rest -= pr; rows.push([pr, int]); } } return rows; };
    const draw = () => { const { ctx } = st; st.clear('#fff'); const rows = sched(), tot = rows.reduce((a, r) => a + r[0] + r[1], 0), mx = Math.max(...rows.map(r => r[0] + r[1])) * 1.15;
      const W = 500 / n; rows.forEach(([pr, int], k) => { const x = 70 + k * W, h1 = pr / mx * 280, h2 = int / mx * 280; ctx.fillStyle = C.brand; ctx.fillRect(x + 1, 320 - h1, W - 2, h1); ctx.fillStyle = C.red; ctx.fillRect(x + 1, 320 - h1 - h2, W - 2, h2); if (n <= 24 || k % 6 === 0) text(ctx, k + 1, x + W / 2, 336, { align: 'center', size: 10, color: C.mute }); });
      ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(70, 320); ctx.lineTo(572, 320); ctx.stroke(); text(ctx, 'місяць', 572, 352, { align: 'right', size: 11, bold: true });
      text(ctx, '■ тіло кредиту', 80, 24, { color: C.brand, bold: true, size: 12 }); text(ctx, '■ відсотки', 200, 24, { color: C.red, bold: true, size: 12 });
      const first = rows[0][0] + rows[0][1], last = rows[n - 1][0] + rows[n - 1][1];
      api.state = { first, last, tot, over: tot - S };
      read.set([['Сума кредиту', gi(S)], ['Перший платіж', g(first)], ['Останній платіж', g(last)], ['Усього сплатити', g(tot)], ['Переплата', g(tot - S)]]); };
    H.seg(panel, { label: 'Схема погашення', options: [['1', 'ануїтетна (рівні платежі)'], ['0', 'класична (зменшувані)']], value: '1' }, v => { ann = v === '1'; draw(); });
    H.slider(panel, { label: 'Сума кредиту', min: 1000, max: 100000, step: 1000, value: S, unit: 'грн' }, v => { S = v; draw(); });
    H.slider(panel, { label: 'Річна ставка', min: 0, max: 60, step: 1, value: rate, unit: '%' }, v => { rate = v; draw(); });
    H.slider(panel, { label: 'Строк', min: 3, max: 48, value: n, unit: 'міс.' }, v => { n = v; draw(); });
    const read = H.readout(panel, 'Кредит');
    H.note(panel, 'Ануїтетний платіж: <b>A = S · i / (1 − (1 + i)⁻ⁿ)</b>, де i — місячна ставка. За класичною схемою тіло кредиту ділиться порівну, а відсотки нараховуються на залишок. Порівнюй <b>реальну річну процентну ставку</b> і загальну переплату, а не лише щомісячний платіж.');
    draw(); return { destroy: () => st.destroy() };
  });

  /* =============== Точка беззбитковості =============== */
  reg('breakeven', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 380); let FC = 1500, VC = 15, P = 40, Q = 100;
    const draw = () => { const { ctx } = st; st.clear('#fff'); const qm = 200, be = P > VC ? FC / (P - VC) : Infinity;
      const ym = Math.ceil(Math.max(P * qm, FC + VC * qm) / 1000) * 1000;
      const { X, Y } = H.plot(ctx, { x: 80, y: 30, w: 490, h: 290 }, { xmax: qm, ymax: ym, gx: 40, gy: ym / 5, xl: 'кількість, шт.', yl: 'грн', series: [{ pts: [[0, FC], [qm, FC]], color: '#9CA3AF', w: 1.5 }, { pts: [[0, FC], [qm, FC + VC * qm]], color: C.red }, { pts: [[0, 0], [qm, P * qm]], color: C.green }] });
      if (isFinite(be) && be <= qm) { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(X(be), Y(P * be), 6, 0, 7); ctx.fill(); text(ctx, 'точка беззбитковості', X(be) + 8, Y(P * be) - 8, { bold: true, size: 12 }); }
      ctx.strokeStyle = C.brand; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(Q), Y(0)); ctx.lineTo(X(Q), Y(ym)); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, '— виручка', 90, 362, { color: C.green, bold: true, size: 12 }); text(ctx, '— загальні витрати', 200, 362, { color: C.red, bold: true, size: 12 }); text(ctx, '- - план продажу', 360, 362, { color: C.brand, bold: true, size: 12 });
      const profit = (P - VC) * Q - FC; api.state = { be, profit };
      read.set([['Маржа з одиниці (ціна − змінні витрати)', g(P - VC)], ['Точка беззбитковості', isFinite(be) ? fmt(be, 1) + ' шт.' : 'недосяжна'], ['Виручка при плані', gi(P * Q)], ['Витрати при плані', gi(FC + VC * Q)], ['Прибуток', (profit < 0 ? '−' : '') + gi(Math.abs(profit))]]); };
    H.slider(panel, { label: 'Постійні витрати (обладнання, оренда)', min: 0, max: 5000, step: 100, value: FC, unit: 'грн' }, v => { FC = v; draw(); });
    H.slider(panel, { label: 'Змінні витрати на 1 шт. (сировина)', min: 0, max: 60, step: 1, value: VC, unit: 'грн' }, v => { VC = v; draw(); });
    H.slider(panel, { label: 'Ціна 1 шт.', min: 1, max: 100, step: 1, value: P, unit: 'грн' }, v => { P = v; draw(); });
    H.slider(panel, { label: 'План продажу', min: 0, max: 200, step: 5, value: Q, unit: 'шт.' }, v => { Q = v; draw(); });
    const read = H.readout(panel, 'Шкільне підприємство');
    H.note(panel, '<b>Точка беззбитковості</b> — кількість продажів, за якої виручка дорівнює витратам: <b>Q = FC : (P − VC)</b>. Кожна продана одиниця понад цю кількість приносить прибуток.');
    draw(); return { destroy: () => st.destroy() };
  });

  /* =============== Ціна, попит і прибуток =============== */
  reg('pricing', (stage, panel, cfg, api) => {
    const st = H.canvas(stage, 600, 380); let a = 200, b = 4, c = 10, F = 300, p = 25;
    const q = x => Math.max(0, a - b * x), pr = x => (x - c) * q(x) - F;
    const draw = () => { const { ctx } = st; st.clear('#fff'); const pmax = a / b, pts = [...Array(61)].map((_, k) => { const x = k / 60 * pmax; return [x, pr(x)]; }), best = (pmax + c) / 2;
      const ym = Math.ceil(Math.max(100, pr(best)) / 500) * 500, ymin = -Math.ceil((F + c * a) / 500) * 500 / 2;
      const { X, Y } = H.plot(ctx, { x: 80, y: 30, w: 490, h: 290 }, { xmax: pmax, ymin: Math.max(ymin, -2000), ymax: ym, gx: pmax / 5, gy: (ym - Math.max(ymin, -2000)) / 5, xl: 'ціна, грн', yl: 'прибуток, грн', series: [{ pts: pts.filter(t => t[1] >= Math.max(ymin, -2000)), color: C.brand }] });
      ctx.strokeStyle = '#9CA3AF'; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(pmax), Y(0)); ctx.stroke();
      const py = Math.max(Math.max(ymin, -2000), pr(p)); ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(X(p), Y(py), 7, 0, 7); ctx.fill();
      api.state = { q: q(p), rev: p * q(p), profit: pr(p), best, bestProfit: pr(best) };
      read.set([['Попит (покупців)', fmt(q(p), 0) + ' шт.'], ['Виручка', gi(p * q(p))], ['Витрати', gi(F + c * q(p))], ['Прибуток', (pr(p) < 0 ? '−' : '') + gi(Math.abs(pr(p)))]]); };
    H.slider(panel, { label: 'Ціна товару', min: 1, max: 50, step: 1, value: p, unit: 'грн' }, v => { p = v; draw(); });
    H.slider(panel, { label: 'Собівартість 1 шт.', min: 0, max: 30, step: 1, value: c, unit: 'грн' }, v => { c = v; draw(); });
    H.slider(panel, { label: 'Постійні витрати', min: 0, max: 1500, step: 50, value: F, unit: 'грн' }, v => { F = v; draw(); });
    H.select(panel, { label: 'Ринок (за опитуванням)', options: [['200,4', 'школа: до 200 покупців'], ['400,10', 'ярмарок: до 400 покупців'], ['120,2', 'клас: до 120 покупців']], value: '200,4' }, v => { [a, b] = v.split(',').map(Number); draw(); });
    const read = H.readout(panel, 'Продажі');
    H.note(panel, 'Чим вища ціна, тим менше покупців (закон попиту). Опитування (дослідження ринку) допомагає оцінити попит: тут <b>q = a − b · ціна</b>. Знайди ціну, за якої прибуток найбільший.');
    draw(); return { destroy: () => st.destroy() };
  });
})();
