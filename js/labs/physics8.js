/* Лабораторні роботи · Фізика 8 клас (за підручником) */
(function () {
  const C = { ink: '#1F2340', mute: '#6B6F8E', brand: '#4F46E5', blue: '#2563EB', red: '#E5484D', green: '#16A34A', orange: '#F59E0B', water: 'rgba(56,148,255,.32)', hot: 'rgba(239,68,68,.28)' };
  const nz = (v, r) => v * (1 + (Math.random() * 2 - 1) * r);
  const rd = (v, d) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  const recBtn = (api, panel, fn) => api.H.buttons(panel, [['📥 Записати в таблицю', fn, 'brand']]);
  const CW = 4200;
  /* термометр */
  function thermo(ctx, H, x, y, h, T, max) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; H.rrect(ctx, x - 7, y, 14, h, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + h + 6, 11, 0, 7); ctx.fillStyle = C.red; ctx.fill(); ctx.stroke();
    const yy = y + h - T / max * (h - 8); ctx.fillStyle = C.red; ctx.fillRect(x - 3, yy, 6, y + h - yy + 4);
    for (let t = 0; t <= max; t += 10) { const ty = y + h - t / max * (h - 8); ctx.beginPath(); ctx.moveTo(x + 8, ty); ctx.lineTo(x + 14, ty); ctx.stroke(); if (t % 20 === 0) H.text(ctx, String(t), x + 17, ty + 4, { size: 9 }); }
  }
  /* стрілковий прилад (амперметр/вольтметр) */
  function meter(ctx, H, x, y, letter, val, max, unit) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 38, 0, 7); ctx.fill(); ctx.stroke();
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.15 + 0.7 * i / 10); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 28, y + Math.sin(a) * 28); ctx.lineTo(x + Math.cos(a) * (i % 5 ? 32 : 35), y + Math.sin(a) * (i % 5 ? 32 : 35)); ctx.stroke(); }
    const a = Math.PI * (1.15 + 0.7 * Math.min(1, Math.max(0, val / max))); ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); ctx.stroke();
    H.text(ctx, letter, x, y + 22, { align: 'center', bold: true, size: 16 }); H.text(ctx, H.fmt(val, 2) + ' ' + unit, x, y + 54, { align: 'center', bold: true, size: 12, color: C.brand });
  }
  function resistor(ctx, H, x, y, label, vertical) {
    ctx.fillStyle = '#FEF3C7'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    if (vertical) { ctx.fillRect(x - 9, y - 22, 18, 44); ctx.strokeRect(x - 9, y - 22, 18, 44); H.text(ctx, label, x + 14, y + 4, { bold: true }); }
    else { ctx.fillRect(x - 24, y - 9, 48, 18); ctx.strokeRect(x - 24, y - 9, 48, 18); H.text(ctx, label, x, y - 14, { bold: true, align: 'center' }); }
  }
  const wire = (ctx, pts) => { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke(); };
  function battery(ctx, H, x, y) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y - 16); ctx.lineTo(x - 4, y + 16); ctx.stroke(); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 4, y - 9); ctx.lineTo(x + 4, y + 9); ctx.stroke(); H.text(ctx, '+  −', x - 10, y - 22, { size: 11 }); }

  Labs.reg('physics8', [
    /* ================= № 1 ================= */
    { n: 1, sec: 1, lesson: 'l9', title: 'Вивчення теплового балансу за умови змішування води різної температури',
      aim: 'ознайомитися з будовою та принципом дії калориметра; визначити кількість теплоти, віддану гарячою водою, і кількість теплоти, отриману холодною водою; порівняти їх.',
      equip: ['калориметр', 'термометр', 'мірний циліндр', 'посудина з гарячою водою', 'посудина з холодною водою'],
      theory: ['Під час теплообміну в теплоізольованій системі **кількість теплоти, віддана гарячими тілами, дорівнює кількості теплоти, отриманій холодними** — це рівняння теплового балансу:', 'f: Q_{віддане} = Q_{отримане}',
        'Кількість теплоти: Q = c · m · Δt, де c — питома теплоємність (для води 4200 Дж/(кг·°C)).', 'f: Q_{1} = c m_{1} (t_{1} − t);   Q_{2} = c m_{2} (t − t_{2})',
        'm_{1}, t_{1} — маса й температура гарячої води; m_{2}, t_{2} — холодної; t — температура суміші. Маса 1 мл води — 1 г.'],
      steps: ['Налийте в калориметр холодну воду (m_{2}), виміряйте її температуру t_{2}.', 'Виміряйте об’єм і температуру гарячої води (m_{1}, t_{1}).', 'Влийте гарячу воду в калориметр, перемішайте, виміряйте температуру суміші t.',
        'Обчисліть Q_{1} і Q_{2}, порівняйте їх.', 'Повторіть дослід з іншими масами води.'],
      safety: 'Обережно з гарячою водою! Термометр не використовуйте як мішалку.',
      cols: [{ k: 'm1', name: 'm_{1}', unit: 'кг', dec: 3 }, { k: 't1', name: 't_{1}', unit: '°C', dec: 0 }, { k: 'm2', name: 'm_{2}', unit: 'кг', dec: 3 }, { k: 't2', name: 't_{2}', unit: '°C', dec: 0 }, { k: 't', name: 't суміші', unit: '°C', dec: 0 }],
      calc: [{ k: 'Q1', name: 'Q_{1} (віддала)', unit: 'Дж', dec: 0, f: r => CW * r.m1 * (r.t1 - r.t) }, { k: 'Q2', name: 'Q_{2} (отримала)', unit: 'Дж', dec: 0, f: r => CW * r.m2 * (r.t - r.t2) }], minRows: 2,
      final: [{ q: 'Чому Q_{1} виявилася трохи більшою за Q_{2}?', opts: ['частина теплоти пішла на нагрівання калориметра й повітря', 'гаряча вода має більшу питому теплоємність', 'термометр додав теплоти'], a: 'частина теплоти пішла на нагрівання калориметра й повітря' },
        { q: 'Обчисли відношення Q_{2} / Q_{1} у першому досліді (у відсотках).', u: '%', dec: 0, a: rows => { const r = rows[0]; return (r.m2 * (r.t - r.t2)) / (r.m1 * (r.t1 - r.t)) * 100; } }],
      sample: 'Я змішував(ла) гарячу й холодну воду в калориметрі. Кількість теплоти, віддана гарячою водою, приблизно дорівнює кількості теплоти, отриманій холодною, — рівняння теплового балансу виконується. Невелика різниця пояснюється втратами теплоти на нагрівання калориметра й довкілля.',
      questions: ['Сформулюйте рівняння теплового балансу.', 'Навіщо калориметр має подвійні стінки?', 'Чому Q₁ > Q₂ у реальному досліді?', 'Як передбачити температуру суміші до досліду?'],
      creative: 'Склади «рецепт ідеального чаю 60 °C»: скільки окропу й холодної води змішати для чашки 250 мл? Перевір розрахунок термометром (з дорослими).',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 320);
        let V1 = 100, V2 = 100, t1 = H.rnd(65, 80), t2 = H.rnd(15, 22), mixed = false, T = t2, Tm = null;
        H.slider(panel, { label: 'Гаряча вода', min: 50, max: 150, step: 10, value: V1, unit: 'мл' }, v => { V1 = v; mixed = false; T = t2; });
        H.slider(panel, { label: 'Холодна вода', min: 50, max: 150, step: 10, value: V2, unit: 'мл' }, v => { V2 = v; mixed = false; T = t2; });
        const rdo = H.readout(panel, 'Покази');
        H.buttons(panel, [['🫗 Змішати', () => { if (mixed) return; mixed = true; const loss = 0.03 + Math.random() * 0.04; const ideal = (V1 * t1 + V2 * t2) / (V1 + V2); Tm = Math.round(ideal - (ideal - t2) * loss); }, 'light'], ['↺ Новий дослід', () => { mixed = false; t1 = H.rnd(65, 80); t2 = H.rnd(15, 22); T = t2; Tm = null; }, 'light']]);
        recBtn(api, panel, () => { if (!mixed || Math.abs(T - Tm) > 0.5) { api.toast('Змішай воду й дочекайся сталої температури'); return; } api.record({ m1: V1 / 1000, t1, m2: V2 / 1000, t2, t: Tm }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF');
          /* склянка з гарячою */
          if (!mixed) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(40, 150, 80, 120); ctx.fillStyle = C.hot; const h = V1 / 150 * 110; ctx.fillRect(41, 270 - h, 78, h); H.text(ctx, t1 + ' °C', 80, 140, { align: 'center', bold: true, color: C.red }); H.text(ctx, V1 + ' мл', 80, 290, { align: 'center' }); }
          /* калориметр */
          ctx.fillStyle = '#E2E8F0'; ctx.fillRect(220, 110, 160, 180); ctx.fillStyle = '#fff'; ctx.fillRect(236, 120, 128, 162);
          const h2 = (mixed ? V1 + V2 : V2) / 300 * 150; ctx.fillStyle = mixed ? 'rgba(168,85,247,.25)' : C.water; ctx.fillRect(237, 281 - h2, 126, h2);
          H.text(ctx, 'калориметр', 300, 306, { align: 'center', color: C.mute, size: 11 });
          thermo(ctx, H, 330, 60, 200, T, 100);
          rdo.set([['t₁ гарячої', t1 + ' °C'], ['t₂ холодної', t2 + ' °C'], ['Термометр у калориметрі', Math.round(T) + ' °C' + (mixed && Math.abs(T - Tm) <= 0.5 ? ' (стала)' : '')]]);
        };
        const stop = H.loop(dt => { if (mixed) T += (Tm - T) * Math.min(1, dt * 1.5); draw(); });
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 2 ================= */
    { n: 2, sec: 1, lesson: 'l9', title: 'Визначення питомої теплоємності речовини',
      aim: 'визначити питому теплоємність речовини, з якої виготовлено циліндр, і визначити цю речовину.',
      equip: ['калориметр', 'термометр', 'металевий циліндр на нитці', 'посудина з окропом (100 °C)', 'терези', 'мірний циліндр з водою'],
      theory: ['**Питома теплоємність** c показує, яку кількість теплоти треба передати 1 кг речовини, щоб нагріти її на 1 °C. Одиниця — Дж/(кг·°C).',
        'Нагрітий в окропі циліндр (t_{ц} = 100 °C) занурюють у калориметр з водою. Циліндр віддає теплоту, вода її отримує:', 'f: c_{в} m_{в} (t − t_{в}) = c m_{ц} (t_{ц} − t)',
        'Звідси:', 'f: c = c_{в} m_{в} (t − t_{в}) / (m_{ц} (t_{ц} − t))', 'c_{в} = 4200 Дж/(кг·°C). Табличні значення: алюміній 920, сталь 500, латунь 400, мідь 400 Дж/(кг·°C).'],
      steps: ['Зважте циліндр — m_{ц}. Налийте в калориметр воду масою m_{в}, виміряйте її температуру t_{в}.', 'Нагрійте циліндр в окропі (t_{ц} = 100 °C).', 'Швидко перенесіть циліндр у калориметр, перемішайте, виміряйте сталу температуру t.',
        'Обчисліть кількість теплоти, отриману водою, і питому теплоємність металу. Визначте речовину.'],
      safety: 'Окріп і гарячий циліндр — лише за допомогою нитки чи щипців!',
      cols: [{ k: 'mw', name: 'm_{в}', unit: 'кг', dec: 3 }, { k: 'tw', name: 't_{в}', unit: '°C', dec: 0 }, { k: 'mc', name: 'm_{ц}', unit: 'кг', dec: 3 }, { k: 'tc', name: 't_{ц}', unit: '°C', dec: 0 }, { k: 't', name: 't', unit: '°C', dec: 1 }],
      calc: [{ k: 'Q', name: 'Q (вода)', unit: 'Дж', dec: 0, f: r => CW * r.mw * (r.t - r.tw) }, { k: 'c', name: 'c', unit: 'Дж/(кг·°C)', dec: 0, f: r => CW * r.mw * (r.t - r.tw) / (r.mc * (r.tc - r.t)) }], minRows: 1,
      final: [{ q: 'З якої речовини виготовлено циліндр?', opts: ['алюміній (920)', 'сталь (500)', 'латунь (400)'], a: rows => rows[0]._mat }],
      sample: 'Я визначив(ла) питому теплоємність металевого циліндра за допомогою калориметра. Отримане значення близьке до табличного для …; отже, циліндр виготовлено з … Відхилення пояснюється втратами теплоти під час перенесення циліндра та нагріванням калориметра.',
      questions: ['Що показує питома теплоємність?', 'Чому циліндр треба переносити швидко?', 'Чому вода — гарний теплоносій у системах опалення?', 'Як зменшити втрати теплоти в досліді?'],
      creative: 'Поясни в коміксі, чому біля моря влітку не так спекотно, а взимку не так холодно, як далеко від моря (роль великої теплоємності води).',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 320);
        const M = H.pick([['алюміній (920)', 920, '#CBD5E1'], ['сталь (500)', 500, '#94A3B8'], ['латунь (400)', 400, '#D4A017']]);
        const mc = H.pick([0.1, 0.12, 0.15]); let Vw = 150, tw = H.rnd(16, 22), phase = 0, T = tw, Tf = null;
        H.slider(panel, { label: 'Вода в калориметрі', min: 100, max: 200, step: 10, value: Vw, unit: 'мл' }, v => { if (phase < 2) Vw = v; });
        const rdo = H.readout(panel, 'Покази');
        H.buttons(panel, [['🔥 Нагріти в окропі', () => { if (phase === 0) phase = 1; }, 'light'], ['⬇ Перенести в калориметр', () => { if (phase !== 1) { api.toast('Спершу нагрій циліндр'); return; } phase = 2;
          const mw = Vw / 1000, eq = (CW * mw * tw + M[1] * mc * 100) / (CW * mw + M[1] * mc); Tf = rd(eq - (eq - tw) * (0.03 + Math.random() * 0.03), 1); }, 'light'],
          ['↺ Повторити', () => { phase = 0; tw = H.rnd(16, 22); T = tw; Tf = null; }, 'light']]);
        recBtn(api, panel, () => { if (phase !== 2 || Math.abs(T - Tf) > 0.15) { api.toast('Дочекайся сталої температури в калориметрі'); return; } api.record({ mw: Vw / 1000, tw, mc, tc: 100, t: Tf, _mat: M[0] }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF');
          ctx.fillStyle = '#475569'; ctx.fillRect(40, 270, 120, 12); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(50, 170, 100, 100); ctx.fillStyle = C.hot; ctx.fillRect(51, 190, 98, 79);
          if (phase === 1) for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(65 + i * 15, 200 + (Date.now() / 30 + i * 13) % 60, 3, 0, 7); ctx.strokeStyle = '#fff'; ctx.stroke(); }
          H.text(ctx, 'окріп 100 °C', 100, 160, { align: 'center', bold: true, color: C.red });
          ctx.fillStyle = '#E2E8F0'; ctx.fillRect(250, 110, 160, 180); ctx.fillStyle = '#fff'; ctx.fillRect(266, 120, 128, 162);
          const h = Vw / 250 * 150; ctx.fillStyle = C.water; ctx.fillRect(267, 281 - h, 126, h);
          const cx = phase === 2 ? 310 : 85, cy = phase === 2 ? 245 : phase === 1 ? 215 : 120; ctx.fillStyle = M[2]; ctx.fillRect(cx, cy, 30, 34); ctx.strokeStyle = C.mute; ctx.beginPath(); ctx.moveTo(cx + 15, cy); ctx.lineTo(cx + 15, cy - 40); ctx.stroke();
          thermo(ctx, H, 370, 60, 200, T, 100);
          rdo.set([['Маса циліндра', H.fmt(mc, 3) + ' кг'], ['t води до досліду', tw + ' °C'], ['Термометр', H.fmt(T, 1) + ' °C']]);
        };
        const stop = H.loop(dt => { if (phase === 2) T += (Tf - T) * Math.min(1, dt * 1.2); draw(); });
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 3 ================= */
    { n: 3, sec: 4, lesson: 'l30', title: 'Вимірювання опору провідника за допомогою амперметра та вольтметра',
      aim: 'навчитися визначати опір провідника за допомогою амперметра та вольтметра; переконатися на досліді, що опір провідника не залежить від сили струму в ньому та напруги на його кінцях.',
      equip: ['джерело струму', 'резистор (провідник)', 'реостат', 'амперметр', 'вольтметр', 'ключ', 'з’єднувальні проводи'],
      theory: ['**Закон Ома для ділянки кола**: сила струму прямо пропорційна напрузі на кінцях ділянки й обернено пропорційна її опору:', 'f: I = U / R   ⇒   R = U / I',
        'Амперметр вмикають у коло **послідовно** з провідником, вольтметр — **паралельно** провіднику.', 'Реостатом змінюють силу струму в колі. Опір провідника від цього не змінюється — змінюються лише I та U.'],
      steps: ['Складіть коло за схемою (джерело, ключ, реостат, амперметр, резистор; вольтметр — паралельно резистору).', 'Замкніть ключ. Запишіть покази амперметра та вольтметра.',
        'Змінюючи положення повзунка реостата, виконайте ще 3–4 вимірювання.', 'Для кожного досліду обчисліть опір; знайдіть середнє значення.'],
      cols: [{ k: 'U', name: 'Напруга U', unit: 'В', dec: 2 }, { k: 'I', name: 'Сила струму I', unit: 'А', dec: 2 }],
      calc: [{ k: 'R', name: 'Опір R', unit: 'Ом', dec: 1, f: r => r.U / r.I }], minRows: 3,
      final: [{ q: 'Обчисли середнє значення опору резистора.', u: 'Ом', dec: 1, a: rows => Labs.mean(rows.map(r => r.U / r.I)) },
        { q: 'Чи залежить опір провідника від сили струму в ньому?', opts: ['не залежить', 'збільшується зі збільшенням струму', 'зменшується зі збільшенням струму'], a: 'не залежить' }],
      sample: 'Я визначив(ла) опір резистора за показами амперметра й вольтметра. Під час зміни сили струму реостатом напруга змінювалася пропорційно, а опір залишався сталим (≈ … Ом). Похибки — через ціну поділки приладів.',
      questions: ['Сформулюйте закон Ома для ділянки кола.', 'Як вмикають амперметр і вольтметр?', 'Для чого в колі реостат?', 'Чому опір не залежить від U та I?'],
      creative: 'Склади «паспорт» побутового приладу (чайник, лампа): знайди на ньому напругу й потужність і обчисли силу струму та опір.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 300);
        const R = H.pick([4, 5, 6, 8, 10]), E = 4.5, Rmax = 20; let x = 0.5, on = false;
        H.slider(panel, { label: 'Повзунок реостата', min: 0, max: 1, step: 0.05, value: x, fmt: v => Math.round(v * Rmax) + ' Ом' }, v => { x = v; });
        H.check(panel, { label: 'Ключ замкнено', value: false }, v => { on = v; });
        const rdo = H.readout(panel, 'Прилади');
        const vals = () => { if (!on) return { I: 0, U: 0 }; const I = E / (R + x * Rmax + 0.5); return { I: rd(I, 2), U: rd(I * R, 2) }; };
        recBtn(api, panel, () => { const v = vals(); if (!on) { api.toast('Замкни ключ'); return; } api.record(v); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const v = vals();
          wire(ctx, [[60, 150], [60, 60], [480, 60], [480, 230], [60, 230], [60, 150]]);
          battery(ctx, H, 60, 150); ctx.fillStyle = '#F8FAFF'; ctx.fillRect(140, 52, 50, 16); ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(140, 60); ctx.lineTo(186, on ? 60 : 44); ctx.stroke(); H.text(ctx, 'К', 160, 40, { bold: true });
          ctx.fillStyle = '#E2E8F0'; ctx.fillRect(250, 50, 110, 20); ctx.strokeRect(250, 50, 110, 20); ctx.fillStyle = C.brand; ctx.fillRect(250 + x * 104, 40, 6, 30); H.text(ctx, 'реостат', 305, 90, { align: 'center', size: 11 });
          resistor(ctx, H, 300, 230, 'R');
          meter(ctx, H, 480, 145, 'A', v.I, 1, 'А');
          wire(ctx, [[270, 230], [270, 280], [210, 280]]); wire(ctx, [[330, 230], [330, 280], [390, 280]]);
          meter(ctx, H, 300, 280 - 0, 'V', v.U, 5, 'В');
          rdo.set([['Амперметр', H.fmt(v.I, 2) + ' А'], ['Вольтметр', H.fmt(v.U, 2) + ' В']]);
        };
        const stop = H.loop(() => draw());
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 4 ================= */
    { n: 4, sec: 4, lesson: 'l31', title: 'Дослідження електричного кола з послідовним з’єднанням провідників',
      aim: 'експериментально перевірити, що в разі послідовного з’єднання двох провідників справджуються співвідношення: I = I_{1} = I_{2}; U = U_{1} + U_{2}; R = R_{1} + R_{2}.',
      equip: ['джерело струму', 'два резистори', 'амперметр', 'вольтметр', 'реостат', 'ключ', 'з’єднувальні проводи'],
      theory: ['У разі **послідовного** з’єднання провідники вмикають один за одним, без розгалужень. Тоді:', 'f: I = I_{1} = I_{2}', 'f: U = U_{1} + U_{2}', 'f: R = R_{1} + R_{2}',
        'Опір кожного провідника визначають за законом Ома: R_{1} = U_{1} / I, R_{2} = U_{2} / I, загальний R = U / I.'],
      steps: ['Складіть коло: джерело, ключ, реостат, амперметр і два послідовно з’єднані резистори.', 'Виміряйте силу струму I.', 'Вольтметром виміряйте напругу U_{1} на першому резисторі, U_{2} — на другому та U — на обох разом.',
        'Повторіть вимірювання за іншого положення повзунка реостата.', 'Обчисліть R_{1}, R_{2}, R і перевірте співвідношення.'],
      cols: [{ k: 'I', name: 'I', unit: 'А', dec: 2 }, { k: 'U1', name: 'U_{1}', unit: 'В', dec: 2 }, { k: 'U2', name: 'U_{2}', unit: 'В', dec: 2 }, { k: 'U', name: 'U', unit: 'В', dec: 2 }],
      calc: [{ k: 'R1', name: 'R_{1}', unit: 'Ом', dec: 1, f: r => r.U1 / r.I }, { k: 'R2', name: 'R_{2}', unit: 'Ом', dec: 1, f: r => r.U2 / r.I }, { k: 'R', name: 'R', unit: 'Ом', dec: 1, f: r => r.U / r.I }], minRows: 2,
      final: [{ q: 'Чи виконується співвідношення U = U_{1} + U_{2}?', opts: ['так, з точністю до похибки', 'ні, U = U₁ − U₂', 'ні, U = U₁ = U₂'], a: 'так, з точністю до похибки' },
        { q: 'Обчисли R_{1} + R_{2} для першого досліду.', u: 'Ом', dec: 1, a: rows => rows[0].U1 / rows[0].I + rows[0].U2 / rows[0].I, ex: 'Порівняй із загальним опором R = U / I.' }],
      sample: 'Я дослідив(ла) послідовне з’єднання двох резисторів. Сила струму однакова в усіх ділянках, загальна напруга дорівнює сумі напруг, а загальний опір — сумі опорів. Невеликі розбіжності пов’язані з точністю приладів.',
      questions: ['Як з’єднують провідники послідовно?', 'Запишіть закономірності послідовного з’єднання.', 'Що станеться з гірляндою, якщо одна лампа перегорить?', 'Як за допомогою резистора зменшити напругу на лампі?'],
      creative: 'Намалюй схему новорічної гірлянди з послідовним з’єднанням ламп і поясни, чому її лампи такі «слабкі». Запропонуй, як зробити гірлянду, що не гасне повністю через одну лампу.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 300);
        const R1 = H.pick([2, 3, 4]), R2 = H.pick([5, 6, 8]), E = 6; let x = 0.3, on = false, vm = 'U1';
        H.slider(panel, { label: 'Повзунок реостата', min: 0, max: 1, step: 0.05, value: x, fmt: v => Math.round(v * 10) + ' Ом' }, v => { x = v; });
        H.check(panel, { label: 'Ключ замкнено', value: false }, v => { on = v; });
        H.seg(panel, { label: 'Вольтметр підключено до', options: [['U1', 'R₁'], ['U2', 'R₂'], ['U', 'R₁ + R₂']], value: 'U1' }, v => { vm = v; });
        const rdo = H.readout(panel, 'Прилади');
        const vals = () => { if (!on) return { I: 0, U1: 0, U2: 0, U: 0 }; const I = E / (R1 + R2 + x * 10 + 0.4); return { I: rd(I, 2), U1: rd(I * R1, 2), U2: rd(I * R2, 2), U: rd(I * (R1 + R2), 2) }; };
        const seen = {};
        recBtn(api, panel, () => { if (!on) { api.toast('Замкни ключ'); return; } if (!(seen.U1 && seen.U2 && seen.U)) { api.toast('Виміряй вольтметром напругу на R₁, на R₂ і на обох резисторах'); return; } api.record(vals()); });
        let lastX = x;
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const v = vals(); if (lastX !== x) { seen.U1 = seen.U2 = seen.U = false; lastX = x; } if (on) seen[vm] = true;
          wire(ctx, [[60, 150], [60, 60], [500, 60], [500, 200], [60, 200], [60, 150]]); battery(ctx, H, 60, 150);
          ctx.fillStyle = '#F8FAFF'; ctx.fillRect(110, 52, 50, 16); ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(110, 60); ctx.lineTo(156, on ? 60 : 44); ctx.stroke();
          ctx.fillStyle = '#E2E8F0'; ctx.fillRect(200, 50, 100, 20); ctx.strokeRect(200, 50, 100, 20); ctx.fillStyle = C.brand; ctx.fillRect(200 + x * 94, 40, 6, 30);
          resistor(ctx, H, 220, 200, 'R₁'); resistor(ctx, H, 360, 200, 'R₂'); meter(ctx, H, 500, 120, 'A', v.I, 1, 'А');
          const [a, b] = vm === 'U1' ? [196, 244] : vm === 'U2' ? [336, 384] : [196, 384]; wire(ctx, [[a, 200], [a, 250], [b, 250], [b, 200]]);
          meter(ctx, H, (a + b) / 2, 252, 'V', v[vm], 6, 'В');
          rdo.set([['I', H.fmt(v.I, 2) + ' А'], ['U₁', seen.U1 ? H.fmt(v.U1, 2) + ' В' : '—'], ['U₂', seen.U2 ? H.fmt(v.U2, 2) + ' В' : '—'], ['U', seen.U ? H.fmt(v.U, 2) + ' В' : '—']]);
        };
        const stop = H.loop(() => draw());
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 5 ================= */
    { n: 5, sec: 4, lesson: 'l32', title: 'Дослідження електричного кола з паралельним з’єднанням провідників',
      aim: 'експериментально перевірити, що сила струму в нерозгалуженій частині кола дорівнює сумі сил струмів у відгалуженнях; довести, що загальний опір провідників, з’єднаних паралельно, менший за опір кожного з них.',
      equip: ['джерело струму', 'два резистори', 'амперметр', 'вольтметр', 'ключ', 'з’єднувальні проводи'],
      theory: ['У разі **паралельного** з’єднання кінці провідників з’єднують у двох вузлах. Тоді:', 'f: U = U_{1} = U_{2}', 'f: I = I_{1} + I_{2}', 'f: 1/R = 1/R_{1} + 1/R_{2}   ⇒   R = R_{1}R_{2} / (R_{1} + R_{2})',
        'Загальний опір паралельно з’єднаних провідників менший за найменший з них.'],
      steps: ['Складіть коло з двома паралельно з’єднаними резисторами; вольтметр — паралельно до них.', 'Виміряйте напругу U.', 'Вмикаючи амперметр по черзі в кожну вітку та в нерозгалужену частину кола, виміряйте I_{1}, I_{2} та I.',
        'Повторіть для іншої напруги джерела.', 'Обчисліть R_{1}, R_{2}, R і перевірте співвідношення.'],
      cols: [{ k: 'U', name: 'U', unit: 'В', dec: 2 }, { k: 'I1', name: 'I_{1}', unit: 'А', dec: 2 }, { k: 'I2', name: 'I_{2}', unit: 'А', dec: 2 }, { k: 'I', name: 'I', unit: 'А', dec: 2 }],
      calc: [{ k: 'R1', name: 'R_{1}', unit: 'Ом', dec: 1, f: r => r.U / r.I1 }, { k: 'R2', name: 'R_{2}', unit: 'Ом', dec: 1, f: r => r.U / r.I2 }, { k: 'R', name: 'R', unit: 'Ом', dec: 1, f: r => r.U / r.I }], minRows: 2,
      final: [{ q: 'Чи виконується співвідношення I = I_{1} + I_{2}?', opts: ['так, з точністю до похибки', 'ні, I = I₁ = I₂', 'ні, I = I₁ − I₂'], a: 'так, з точністю до похибки' },
        { q: 'Обчисли загальний опір за формулою R = R_{1}R_{2} / (R_{1} + R_{2}) для першого досліду.', u: 'Ом', dec: 1, a: rows => { const r = rows[0], a = r.U / r.I1, b = r.U / r.I2; return a * b / (a + b); } }],
      sample: 'Я дослідив(ла) паралельне з’єднання. Напруга на резисторах однакова, сила струму в нерозгалуженій частині дорівнює сумі струмів у вітках, а загальний опір менший за опір кожного резистора.',
      questions: ['Як з’єднують провідники паралельно?', 'Запишіть закономірності паралельного з’єднання.', 'Чому побутові прилади в квартирі вмикають паралельно?', 'Чому вмикання багатьох потужних приладів в одну розетку небезпечне?'],
      creative: 'Склади план електропроводки своєї кімнати: які прилади і як з’єднані? Порахуй загальну силу струму, якщо всі вони ввімкнені (потужності на етикетках, U = 230 В).',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 300);
        const R1 = H.pick([6, 8, 10]), R2 = H.pick([12, 15, 20]); let E = 4.5, on = false, am = 'I';
        H.seg(panel, { label: 'Напруга джерела', options: [['3', '3 В'], ['4.5', '4,5 В'], ['6', '6 В']], value: '4.5' }, v => { E = +v; seen.I = seen.I1 = seen.I2 = false; });
        H.check(panel, { label: 'Ключ замкнено', value: false }, v => { on = v; });
        H.seg(panel, { label: 'Амперметр у', options: [['I', 'загальній частині'], ['I1', 'вітці R₁'], ['I2', 'вітці R₂']], value: 'I' }, v => { am = v; });
        const rdo = H.readout(panel, 'Прилади'); const seen = {};
        const vals = () => { if (!on) return { U: 0, I1: 0, I2: 0, I: 0 }; const Rp = R1 * R2 / (R1 + R2), I = E / (Rp + 0.3), U = I * Rp; return { U: rd(U, 2), I1: rd(U / R1, 2), I2: rd(U / R2, 2), I: rd(I, 2) }; };
        recBtn(api, panel, () => { if (!on) { api.toast('Замкни ключ'); return; } if (!(seen.I && seen.I1 && seen.I2)) { api.toast('Виміряй силу струму в загальній частині кола й у кожній вітці'); return; } api.record(vals()); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const v = vals(); if (on) seen[am] = true;
          wire(ctx, [[60, 150], [60, 50], [260, 50]]); wire(ctx, [[60, 150], [60, 260], [260, 260]]); battery(ctx, H, 60, 150);
          ctx.fillStyle = '#F8FAFF'; ctx.fillRect(100, 42, 50, 16); ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(100, 50); ctx.lineTo(146, on ? 50 : 34); ctx.stroke();
          wire(ctx, [[260, 50], [260, 260]]); wire(ctx, [[260, 100], [420, 100], [420, 210], [260, 210]]);
          resistor(ctx, H, 340, 100, 'R₁'); resistor(ctx, H, 340, 210, 'R₂');
          const pos = am === 'I' ? [200, 50] : am === 'I1' ? [400, 155] : [300, 260];
          meter(ctx, H, pos[0], pos[1], 'A', v[am], 1.5, 'А');
          meter(ctx, H, 490, 155, 'V', v.U, 6, 'В'); wire(ctx, [[420, 100], [490, 100], [490, 117]]); wire(ctx, [[420, 210], [490, 210], [490, 193]]);
          rdo.set([['U', H.fmt(v.U, 2) + ' В'], ['I (загальна)', seen.I ? H.fmt(v.I, 2) + ' А' : '—'], ['I₁', seen.I1 ? H.fmt(v.I1, 2) + ' А' : '—'], ['I₂', seen.I2 ? H.fmt(v.I2, 2) + ' А' : '—']]);
        };
        const stop = H.loop(() => draw());
        return { destroy() { stop(); st.destroy(); } };
      } }
  ]);
})();
