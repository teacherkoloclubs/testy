/* Лабораторні роботи · Фізика 7 клас (за підручником) */
(function () {
  const G = 9.8;
  const C = { ink: '#1F2340', mute: '#6B6F8E', brand: '#4F46E5', blue: '#2563EB', red: '#E5484D', green: '#16A34A', orange: '#F59E0B', wood: '#D9A066', woodD: '#A86B32', water: 'rgba(56,148,255,.32)', steel: '#9AA3B5' };
  const nz = (v, r) => v * (1 + (Math.random() * 2 - 1) * r);
  const rd = (v, d) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  const recBtn = (api, panel, fn) => api.H.buttons(panel, [['📥 Записати в таблицю', fn, 'brand']]);
  /* динамометр (вертикальний) */
  function dyn(ctx, H, x, y, h, F, max) {
    H.rrect(ctx, x - 16, y, 32, h, 8); ctx.fillStyle = '#F1F5F9'; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i <= max * 10; i++) { const yy = y + 12 + i / (max * 10) * (h - 24); ctx.beginPath(); ctx.moveTo(x + 6, yy); ctx.lineTo(x + (i % 10 ? 11 : 15), yy); ctx.lineWidth = 1; ctx.stroke(); if (i % 10 === 0) H.text(ctx, String(i / 10), x - 4, yy + 4, { size: 10, align: 'right' }); }
    const py = y + 12 + Math.min(F, max) / max * (h - 24); ctx.fillStyle = C.red; ctx.fillRect(x - 12, py - 2, 26, 4);
    return py;
  }

  Labs.reg('physics7', [
    /* ================= № 1 ================= */
    { n: 1, sec: 2, lesson: 'l11', title: 'Визначення середньої швидкості руху тіла',
      aim: 'дослідити нерівномірний рух тіла; виміряти середню швидкість руху кульки, що скочується похилим жолобом.',
      equip: ['жолоб завдовжки 1,2 м', 'металева кулька', 'штатив з муфтою', 'металевий циліндр (упор)', 'вимірювальна стрічка', 'секундомір'],
      theory: ['Рух, під час якого тіло за однакові інтервали часу проходить різні шляхи, називають **нерівномірним**. Кулька, що скочується жолобом, рухається дедалі швидше.',
        'Щоб описати нерівномірний рух, використовують **середню швидкість** — відношення всього пройденого шляху до всього часу руху:', 'f: v_{сер} = l / t',
        'де l — шлях (м), t — час руху (с). Одиниця швидкості в СІ — **м/с**.'],
      steps: ['Закріпіть жолоб у штативі під невеликим кутом (висота верхнього кінця — 10–20 см).', 'Установіть упор на відстані l від початку руху кульки та виміряйте цю відстань.',
        'Відпустіть кульку без поштовху й одночасно ввімкніть секундомір; зупиніть його, коли кулька вдариться об упор.', 'Повторіть дослід для 3–4 різних відстаней l.', 'Обчисліть середню швидкість для кожного досліду, порівняйте результати.'],
      cols: [{ k: 'l', name: 'Шлях l', unit: 'м', dec: 2 }, { k: 't', name: 'Час t', unit: 'с', dec: 2 }],
      calc: [{ k: 'v', name: 'v_{сер}', unit: 'м/с', dec: 2, f: r => r.l / r.t }], minRows: 3,
      final: [{ q: 'Як змінюється середня швидкість кульки, якщо збільшувати шлях (за того самого нахилу жолоба)?', opts: ['збільшується', 'зменшується', 'не змінюється'], a: 'збільшується', ex: 'Кулька розганяється, тому на довшому шляху її середня швидкість більша.' },
        { q: 'Обчисли середнє значення v_{сер} для перших двох дослідів.', u: 'м/с', dec: 2, a: rows => (rows[0].l / rows[0].t + rows[1].l / rows[1].t) / 2 }],
      sample: 'Я дослідив(ла) рух кульки по похилому жолобу й виміряв(ла) її середню швидкість на різних ділянках. Середня швидкість зростала зі збільшенням шляху — отже, рух кульки нерівномірний (прискорений). Похибки пов’язані з неточним увімкненням і вимкненням секундоміра.',
      questions: ['Який рух називають нерівномірним?', 'Як обчислити середню швидкість?', 'Чому середня швидкість на довшому шляху більша?', 'Як зменшити похибку вимірювання часу?'],
      creative: 'Виміряй свою середню швидкість на шляху від дому до школи (засічи час і оціни відстань за картою). Порівняй зі швидкістю пішохода й велосипедиста.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 300);
        const L = 1.2; let h = 0.15, l = 0.6, run = null, t = 0;
        const sl = H.slider(panel, { label: 'Висота верхнього кінця h', min: 0.08, max: 0.25, step: 0.01, value: h, unit: 'м' }, v => { h = v; t = 0; run = null; draw(); });
        const ll = H.slider(panel, { label: 'Відстань до упору l', min: 0.3, max: 1.2, step: 0.05, value: l, unit: 'м' }, v => { l = v; t = 0; run = null; draw(); });
        const rdo = H.readout(panel, 'Секундомір');
        const a = () => G * (h / L) * 5 / 7;
        let shown = null;
        H.buttons(panel, [['▶ Відпустити кульку', () => { t = 0; shown = null; run = { T: Math.sqrt(2 * l / a()), meas: rd(nz(Math.sqrt(2 * l / a()), 0.025), 2) }; }, 'light']]);
        recBtn(api, panel, () => { if (!shown) { api.toast('Спершу проведи дослід'); return; } api.record({ l, t: shown }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF');
          const x0 = 40, y0 = 250 - h * 700, x1 = 520, y1 = 250; const ang = Math.atan2(y1 - y0, x1 - x0);
          ctx.fillStyle = '#CBD5E1'; ctx.fillRect(20, 250, 520, 8);
          ctx.strokeStyle = C.woodD; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.fillStyle = C.steel; ctx.fillRect(x0 - 8, y0, 8, 250 - y0); H.text(ctx, 'h = ' + H.fmt(h, 2) + ' м', x0 + 6, y0 - 14, { bold: true });
          const pos = s => [x0 + (x1 - x0) * s / L, y0 + (y1 - y0) * s / L];
          const [ux, uy] = pos(l); ctx.save(); ctx.translate(ux, uy); ctx.rotate(ang); ctx.fillStyle = '#475569'; ctx.fillRect(4, -20, 12, 18); ctx.restore();
          const s = run ? Math.min(l, a() * t * t / 2) : 0; const [bx, by] = pos(s);
          ctx.beginPath(); ctx.arc(bx + 7 * Math.sin(ang), by - 9 * Math.cos(ang), 9, 0, 7); ctx.fillStyle = '#334155'; ctx.fill();
          ctx.strokeStyle = C.orange; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; const [sx, sy] = pos(0); ctx.beginPath(); ctx.moveTo(sx, sy + 18); ctx.lineTo(ux, uy + 18); ctx.stroke(); ctx.setLineDash([]);
          H.text(ctx, 'l = ' + H.fmt(l, 2) + ' м', (sx + ux) / 2, (sy + uy) / 2 + 36, { bold: true, color: C.orange, align: 'center' });
          rdo.set([['t', (shown != null ? H.fmt(shown, 2) : run ? H.fmt(t, 2) : '0,00') + ' с'], ['Стан', shown != null ? '✅ кулька біля упору' : run ? '⏱ рух…' : 'готово до досліду']]);
        };
        const stop = H.loop(dt => { if (run && shown == null) { t += dt; if (t >= run.T) { shown = run.meas; } draw(); } });
        draw();
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 2 ================= */
    { n: 2, sec: 3, lesson: 'l12', title: 'Вимірювання періоду обертання та обертової частоти',
      aim: 'виміряти період обертання та обертову частоту тіла під час його рівномірного руху по колу.',
      equip: ['нитка завдовжки 40–60 см', 'тягарець (кулька) на нитці', 'аркуш паперу з накресленим колом', 'секундомір'],
      theory: ['**Період обертання T** — час, за який тіло здійснює один повний оберт. **Обертова частота n** — кількість обертів за одиницю часу.',
        'f: T = t / N;   n = N / t;   n = 1 / T', 'де N — кількість обертів, t — час, за який їх здійснено. Період вимірюють у секундах (с), частоту — в обертах за секунду (об/с, с^{-1}).',
        'Щоб зменшити похибку, вимірюють час великої кількості обертів (20–30), а не одного.'],
      steps: ['Рівномірно обертайте тягарець на нитці над накресленим колом (у горизонтальній площині).', 'Увімкніть секундомір і лічіть оберти. Після N обертів (10–30) зупиніть секундомір.',
        'Запишіть N і t у таблицю. Повторіть дослід з іншою швидкістю обертання.', 'Обчисліть період і обертову частоту для кожного досліду.'],
      cols: [{ k: 'N', name: 'Кількість обертів N', dec: 0 }, { k: 't', name: 'Час t', unit: 'с', dec: 1 }],
      calc: [{ k: 'T', name: 'Період T', unit: 'с', dec: 2, f: r => r.t / r.N }, { k: 'n', name: 'Частота n', unit: 'об/с', dec: 2, f: r => r.N / r.t }], minRows: 2,
      final: [{ q: 'Як пов’язані період і обертова частота?', opts: ['n = 1/T', 'n = T', 'n = 2T'], a: 'n = 1/T' },
        { q: 'Скільки обертів здійснить тягарець за 1 хв, якщо його період дорівнює періоду з першого досліду?', dec: 0, a: rows => 60 / (rows[0].t / rows[0].N), ex: 'N = t / T = 60 с / T.' }],
      sample: 'Я виміряв(ла) період обертання й обертову частоту тягарця на нитці. Чим швидше обертається тягарець, тим менший період і більша частота; добуток n · T завжди дорівнює 1. Похибки — через неточність лічби обертів і реакції під час роботи з секундоміром.',
      questions: ['Що таке період обертання?', 'Що таке обертова частота? Одиниці?', 'Чому вимірюють час багатьох обертів, а не одного?', 'Наведіть приклади обертального руху в техніці й природі.'],
      creative: 'Визнач період обертання колеса велосипеда або вентилятора (за повільним відео на телефоні). Склади цікаву задачу про це.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 320);
        let speed = 1.2, ang = 0, timing = false, t = 0, turns = 0, N = 20, done = null;
        const f0 = () => speed * (0.92 + 0.16 * Math.random());
        let f = f0();
        H.slider(panel, { label: 'Швидкість обертання (рука)', min: 0.6, max: 2.2, step: 0.1, value: speed, fmt: v => v < 1 ? 'повільно' : v < 1.6 ? 'середньо' : 'швидко' }, v => { speed = v; f = f0(); });
        H.seg(panel, { label: 'Лічити обертів N', options: [['10', '10'], ['20', '20'], ['30', '30']], value: '20' }, v => { N = +v; });
        const rdo = H.readout(panel, 'Покази');
        H.buttons(panel, [['⏱ Старт лічби', () => { timing = true; t = 0; turns = 0; done = null; }, 'light']]);
        recBtn(api, panel, () => { if (!done) { api.toast('Спершу виміряй час N обертів'); return; } api.record(done); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const cx = 280, cy = 165, R = 115;
          ctx.strokeStyle = '#CBD5E1'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke(); ctx.setLineDash([]);
          const x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang);
          ctx.strokeStyle = C.mute; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); ctx.fill(); ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
          H.text(ctx, 'вид згори', 20, 24, { color: C.mute });
          rdo.set([['Оберти', String(turns)], ['Час', H.fmt(done ? done.t : t, 1) + ' с'], ['Стан', done ? '✅ виміряно' : timing ? '⏱ лічимо…' : 'натисни «Старт»']]);
        };
        const stop = H.loop(dt => { ang += 2 * Math.PI * f * dt; if (timing) { t += dt; const k = Math.floor(t * f); if (k > turns) turns = k; if (turns >= N) { timing = false; turns = N; done = { N, t: rd(nz(N / f, 0.01), 1) }; } } draw(); });
        draw(); return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 3 ================= */
    { n: 3, sec: 3, lesson: 'l14', title: 'Дослідження коливань нитяного маятника',
      aim: 'переконатися на досліді, що період коливань нитяного маятника не залежить від маси тягарця й амплітуди коливань, проте залежить від довжини нитки.',
      equip: ['штатив з муфтою та лапкою', 'кульки різної маси на нитках', 'вимірювальна стрічка', 'секундомір'],
      theory: ['**Нитяний маятник** — тягарець на легкій нерозтяжній нитці. Коливання маятника — періодичний рух.',
        '**Амплітуда** — найбільше відхилення від положення рівноваги. **Період T** — час одного повного коливання, **частота ν** — кількість коливань за 1 с:', 'f: T = t / N;   ν = N / t = 1 / T',
        'Досліди показують, що період маятника залежить лише від довжини нитки l (і прискорення вільного падіння): що довша нитка — то більший період.'],
      steps: ['Закріпіть маятник у лапці штатива. Виміряйте довжину нитки l (до центра кульки).', 'Відхиліть кульку на невеликий кут і відпустіть. Виміряйте час t 20 повних коливань.',
        'Змініть **масу** кульки (довжина та амплітуда ті самі) — повторіть вимірювання.', 'Змініть **амплітуду** — повторіть.', 'Змініть **довжину** нитки — повторіть.', 'Обчисліть періоди й частоти; зробіть висновок.'],
      cols: [{ k: 'l', name: 'Довжина l', unit: 'м', dec: 2 }, { k: 'm', name: 'Маса m', unit: 'г', dec: 0 }, { k: 'A', name: 'Амплітуда', unit: 'см', dec: 0 }, { k: 'N', name: 'N', dec: 0 }, { k: 't', name: 'Час t', unit: 'с', dec: 1 }],
      calc: [{ k: 'T', name: 'Період T', unit: 'с', dec: 2, f: r => r.t / r.N }, { k: 'nu', name: 'Частота ν', unit: 'Гц', dec: 2, f: r => r.N / r.t }], minRows: 3,
      final: [{ q: 'Чи залежить період коливань маятника від маси тягарця?', opts: ['не залежить', 'збільшується зі збільшенням маси', 'зменшується зі збільшенням маси'], a: 'не залежить' },
        { q: 'Як зміниться період, якщо довжину нитки збільшити в 4 рази?', opts: ['збільшиться у 2 рази', 'збільшиться в 4 рази', 'не зміниться'], a: 'збільшиться у 2 рази', ex: 'Період пропорційний кореню з довжини: √4 = 2.' }],
      sample: 'Я дослідив(ла) коливання нитяного маятника. Зміна маси кульки й амплітуди (за малих кутів) не змінила період, а збільшення довжини нитки збільшило період. Мету досягнуто. Похибки зумовлені реакцією під час вмикання секундоміра та неточним вимірюванням довжини.',
      questions: ['Що таке амплітуда, період і частота коливань?', 'Від чого залежить період нитяного маятника?', 'Навіщо вимірювати час 20 коливань, а не одного?', 'Як «прискорити» годинник з маятником?'],
      creative: 'Зроби маятник з нитки та гайки й підбери таку довжину, щоб період дорівнював рівно 1 с. Запиши довжину й порівняй з однокласниками.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 340);
        let l = 0.5, m = 100, A = 5, ph = 0, swing = false, last = null;
        const T = () => 2 * Math.PI * Math.sqrt(l / G);
        H.slider(panel, { label: 'Довжина нитки l', min: 0.2, max: 1.2, step: 0.05, value: l, unit: 'м' }, v => { l = v; last = null; });
        H.seg(panel, { label: 'Маса кульки', options: [['50', '50 г'], ['100', '100 г'], ['200', '200 г']], value: '100' }, v => { m = +v; last = null; });
        H.slider(panel, { label: 'Амплітуда', min: 2, max: 10, step: 1, value: A, unit: 'см' }, v => { A = v; last = null; });
        const rdo = H.readout(panel, 'Секундомір');
        H.buttons(panel, [['▶ Відпустити', () => { swing = true; ph = 0; }, 'light'], ['⏱ Час 20 коливань', () => { swing = true; last = { l, m, A, N: 20, t: rd(nz(20 * T(), 0.006), 1) }; draw(); }, 'light']]);
        recBtn(api, panel, () => { if (!last) { api.toast('Спершу виміряй час 20 коливань'); return; } api.record(last); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const px = 280, py = 30, Lp = 70 + l * 210;
          ctx.fillStyle = C.steel; ctx.fillRect(200, 20, 160, 10);
          const maxAng = Math.asin(Math.min(0.5, A / 100 / l)); const a = swing ? maxAng * Math.cos(ph) : maxAng;
          const bx = px + Lp * Math.sin(a), by = py + Lp * Math.cos(a), r = 7 + Math.cbrt(m) * 1.4;
          ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
          ctx.setLineDash([4, 4]); ctx.strokeStyle = '#CBD5E1'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + Lp + 20); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = m > 150 ? '#334155' : m > 70 ? '#64748B' : '#94A3B8'; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill();
          H.text(ctx, 'l = ' + H.fmt(l, 2) + ' м', px + 12, py + Lp / 2, { bold: true });
          rdo.set([['Час 20 коливань', last ? H.fmt(last.t, 1) + ' с' : '—'], ['Маса / амплітуда', m + ' г / ' + A + ' см']]);
        };
        const stop = H.loop(dt => { if (swing) { ph += 2 * Math.PI / T() * dt; draw(); } });
        draw(); return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 4 ================= */
    { n: 4, sec: 4, lesson: 'l16', title: 'Вимірювання мас тіл',
      aim: 'навчитися працювати з важільними терезами та визначати за їхньою допомогою маси тіл.',
      equip: ['важільні терези', 'набір важків', 'тіла для зважування (брусок, циліндр, гумка, монета тощо)'],
      theory: ['**Маса** — фізична величина, що є мірою інертності тіла. Одиниця маси в СІ — **кілограм (кг)**; 1 г = 0,001 кг, 1 мг = 0,001 г.',
        'Масу тіла визначають зважуванням на **терезах**: тіло кладуть на ліву шальку, важки — на праву, доки терези не зрівноважаться. Маса тіла дорівнює сумі мас важків.',
        'Правила: не кладіть на шальки мокрі, гарячі тіла; важки беріть пінцетом; починайте з більших важків.'],
      steps: ['Перевірте, чи зрівноважені порожні терези.', 'Покладіть тіло на ліву шальку.', 'Пінцетом кладіть на праву шальку важки — від більших до менших, доки терези не зрівноважаться.',
        'Підрахуйте суму мас важків — це маса тіла. Запишіть у таблицю.', 'Зважте 3–4 різних тіла.'],
      cols: [{ k: 'name', name: 'Тіло' }, { k: 'm', name: 'Маса m', unit: 'г', dec: 2 }],
      calc: [{ k: 'mkg', name: 'Маса m', unit: 'кг', dec: 5, f: r => r.m / 1000 }], minRows: 3,
      final: [{ q: 'Обчисли загальну масу всіх зважених тіл (у грамах).', u: 'г', dec: 2, a: rows => rows.reduce((s, r) => s + r.m, 0) }],
      sample: 'Я навчився(-лася) зважувати тіла на важільних терезах і визначив(ла) маси кількох тіл. Точність зважування обмежена найменшим важком набору (10 мг).',
      questions: ['Що є мірою інертності тіла?', 'Назвіть одиниці маси та співвідношення між ними.', 'Яких правил слід дотримуватися під час зважування?', 'Як зважити рідину?'],
      creative: 'Склади «кухонний довідник мас»: визнач (за кухонними терезами або упаковками) маси яблука, ложки цукру, склянки води — і зроби інфографіку.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 330);
        const BODIES = [['Брусок дерев’яний', 52.3], ['Циліндр алюмінієвий', 76.9], ['Гумка', 18.4], ['Монета', 6.75], ['Ключ', 23.1], ['Тіло X', rd(10 + Math.random() * 90, 2)]];
        const W = [100, 50, 20, 20, 10, 5, 2, 2, 1, 0.5, 0.2, 0.2, 0.1, 0.05, 0.02, 0.02, 0.01];
        let bi = 0, on = W.map(() => false), tilt = 0;
        H.select(panel, { label: 'Тіло на лівій шальці', options: BODIES.map((b, i) => [i, b[0]]), value: 0 }, v => { bi = +v; on = W.map(() => false); paint(); });
        const box = H.el('div', 'sim-ctl'); box.innerHTML = '<span class="sim-ctl-l">Важки (клікніть, щоб покласти/зняти)</span><div class="sim-seg lab-weights"></div>'; panel.appendChild(box);
        const wbox = box.querySelector('.lab-weights');
        const paint = () => { wbox.innerHTML = W.map((w, i) => `<button type="button" class="${on[i] ? 'on' : ''}" data-w="${i}">${w >= 1 ? w + ' г' : Math.round(w * 1000) + ' мг'}</button>`).join(''); };
        wbox.onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; on[+b.dataset.w] = !on[+b.dataset.w]; paint(); };
        paint();
        const rdo = H.readout(panel, 'Стан терезів');
        H.buttons(panel, [['↺ Зняти всі важки', () => { on = W.map(() => false); paint(); }, 'light']]);
        const sum = () => rd(W.reduce((s, w, i) => s + (on[i] ? w : 0), 0), 2);
        recBtn(api, panel, () => { const d = BODIES[bi][1] - sum(); if (Math.abs(d) > 0.011) { api.toast('Терези ще не зрівноважені'); return; } api.record({ name: BODIES[bi][0], m: sum() }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const cx = 280, cy = 110;
          const d = BODIES[bi][1] - sum(); const target = Math.max(-0.22, Math.min(0.22, -d / 20)); tilt += (target - tilt) * 0.15;
          ctx.fillStyle = C.ink; ctx.fillRect(cx - 6, cy, 12, 160); ctx.fillRect(cx - 70, cy + 160, 140, 12);
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt); ctx.fillStyle = '#475569'; ctx.fillRect(-180, -5, 360, 10);
          ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-5, -40); ctx.lineTo(5, -40); ctx.fill(); ctx.restore();
          const lx = cx - 180 * Math.cos(tilt), ly = cy - 180 * Math.sin(tilt), rx = cx + 180 * Math.cos(tilt), ry = cy + 180 * Math.sin(tilt);
          [[lx, ly], [rx, ry]].forEach(([x, y]) => { ctx.strokeStyle = C.mute; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 40, y + 80); ctx.moveTo(x, y); ctx.lineTo(x + 40, y + 80); ctx.stroke(); ctx.fillStyle = '#CBD5E1'; ctx.fillRect(x - 50, y + 80, 100, 8); });
          ctx.fillStyle = C.wood; H.rrect(ctx, lx - 30, ly + 50, 60, 30, 6); ctx.fill(); H.text(ctx, BODIES[bi][0].split(' ')[0], lx, ly + 70, { align: 'center', size: 11, bold: true });
          let k = 0; W.forEach((w, i) => { if (!on[i]) return; const s = w >= 1 ? 8 + Math.cbrt(w) * 4 : 6; ctx.fillStyle = w >= 1 ? '#B8860B' : '#94A3B8'; ctx.fillRect(rx - 45 + (k % 6) * 15, ry + 80 - s - Math.floor(k / 6) * 14, 12, s); k++; });
          ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.arc(cx, cy - 46, 30, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
          rdo.set([['Сума важків', H.fmt(sum(), 2) + ' г'], ['Рівновага', Math.abs(d) <= 0.011 ? '✅ так' : d > 0 ? '⬅ ліва шалька важча' : '➡ права шалька важча']]);
        };
        const stop = H.loop(() => draw());
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 5 ================= */
    { n: 5, sec: 4, lesson: 'l17', title: 'Визначення густин твердого тіла та рідини',
      aim: 'визначити густини пропонованих твердого тіла та рідини.',
      equip: ['терези з важками', 'мірна посудина (мензурка) з водою', 'тверде тіло на нитці', 'склянка з досліджуваною рідиною', 'порожня склянка'],
      theory: ['**Густина** речовини показує, яка маса речовини міститься в одиниці об’єму:', 'f: ρ = m / V',
        'Одиниця густини в СІ — **кг/м^{3}**; часто використовують також г/см^{3}: 1 г/см^{3} = 1000 кг/м^{3}.',
        'Об’єм тіла неправильної форми вимірюють **мензуркою**: V = V_{2} − V_{1}, де V_{1} — об’єм води, V_{2} — об’єм води з зануреним тілом.',
        'Масу рідини визначають як різницю мас склянки з рідиною та порожньої склянки.'],
      steps: ['Зважте тверде тіло — визначте масу m.', 'Налийте в мензурку воду, виміряйте її об’єм V_{1}.', 'Обережно занурте тіло на нитці у воду, виміряйте V_{2}.',
        'Для рідини: налийте її в мензурку (V_{1} = 0, V_{2} — об’єм рідини), масу визначте як різницю мас склянки з рідиною і порожньої склянки.', 'Обчисліть об’єм і густину; порівняйте з таблицею густин, визначте речовину.'],
      cols: [{ k: 'name', name: 'Тіло / рідина' }, { k: 'm', name: 'Маса m', unit: 'г', dec: 1 }, { k: 'V1', name: 'V_{1}', unit: 'см^{3}', dec: 0 }, { k: 'V2', name: 'V_{2}', unit: 'см^{3}', dec: 0 }],
      calc: [{ k: 'V', name: 'V', unit: 'см^{3}', dec: 0, f: r => r.V2 - r.V1 }, { k: 'rho', name: 'ρ', unit: 'г/см^{3}', dec: 2, f: r => r.m / (r.V2 - r.V1) }, { k: 'rhoSI', name: 'ρ', unit: 'кг/м^{3}', dec: 0, f: r => r.m / (r.V2 - r.V1) * 1000 }], minRows: 2,
      final: [{ q: 'З якої речовини виготовлено «Тіло X»? (порівняй з таблицею густин)', opts: ['алюміній (2700 кг/м³)', 'сталь (7800 кг/м³)', 'латунь (8500 кг/м³)', 'мідь (8900 кг/м³)'], a: rows => { const r = rows.find(x => x.name === 'Тіло X'); return r ? r._mat : '—'; }, ex: 'Спершу виміряй «Тіло X».' }],
      sample: 'Я визначив(ла) густину твердого тіла (за масою та об’ємом, виміряним мензуркою) і густину рідини. Отримані значення близькі до табличних; невелика розбіжність пов’язана з ціною поділки мензурки та точністю терезів.',
      questions: ['Що показує густина речовини?', 'Як виміряти об’єм тіла неправильної форми?', 'Як визначити масу рідини?', 'Як перевести г/см³ у кг/м³?'],
      creative: 'Визнач удома густину картоплини або яблука (кухонні терези + мірна склянка). Чи потоне воно у воді? Перевір!',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 330);
        const MATS = [['алюміній (2700 кг/м³)', 2.7], ['сталь (7800 кг/м³)', 7.8], ['латунь (8500 кг/м³)', 8.5], ['мідь (8900 кг/м³)', 8.9]];
        const X = H.pick(MATS);
        const OBJ = [{ name: 'Циліндр алюмінієвий', rho: 2.7, V: 20 }, { name: 'Брусок сталевий', rho: 7.8, V: 12 }, { name: 'Тіло X', rho: X[1], V: H.rnd(8, 22, 2), mat: X[0] },
          { name: 'Вода', rho: 1.0, V: 80, liq: true }, { name: 'Олія', rho: 0.92, V: 70, liq: true }, { name: 'Солона вода', rho: 1.07, V: 60, liq: true }];
        let oi = 0, V1 = 60, dipped = false, weighed = false;
        H.select(panel, { label: 'Що досліджуємо', options: OBJ.map((o, i) => [i, o.name]), value: 0 }, v => { oi = +v; dipped = false; weighed = false; draw(); });
        const rdo = H.readout(panel, 'Покази приладів');
        H.buttons(panel, [['⚖ Зважити', () => { weighed = true; draw(); }, 'light'], ['⬇ У мензурку', () => { dipped = !dipped; draw(); }, 'light']]);
        const o = () => OBJ[oi]; const mass = () => rd(o().rho * o().V, 1);
        recBtn(api, panel, () => { if (!weighed || !dipped) { api.toast('Зважте тіло та виміряйте об’єм мензуркою'); return; } const ob = o();
          api.record(Object.assign({ name: ob.name, m: mass(), V1: ob.liq ? 0 : V1, V2: ob.liq ? ob.V : V1 + ob.V }, ob.mat ? { _mat: ob.mat } : {})); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const ob = o();
          /* терези */
          ctx.fillStyle = '#E2E8F0'; H.rrect(ctx, 30, 220, 180, 60, 10); ctx.fill(); ctx.fillStyle = '#0F172A'; H.rrect(ctx, 60, 240, 120, 28, 6); ctx.fill();
          H.text(ctx, weighed ? (ob.liq ? H.fmt(mass(), 1) : H.fmt(mass(), 1)) + ' г' : '0,0 г', 120, 260, { align: 'center', color: '#22D3EE', bold: true, size: 15 });
          ctx.fillStyle = '#CBD5E1'; ctx.fillRect(50, 212, 140, 8);
          if (weighed && !dipped) { if (ob.liq) { ctx.fillStyle = 'rgba(56,148,255,.35)'; ctx.fillRect(95, 160, 50, 52); ctx.strokeStyle = C.ink; ctx.strokeRect(95, 150, 50, 62); } else { ctx.fillStyle = ob.rho > 5 ? '#94A3B8' : '#CBD5E1'; ctx.fillRect(100, 180, 40, 32); } }
          if (ob.liq) H.text(ctx, 'масу рідини визначено за різницею мас склянок', 30, 300, { size: 11, color: C.mute });
          /* мензурка */
          const x0 = 330, y0 = 290, h = 240, cap = 150, Y = v => y0 - v / cap * h;
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, Y(cap) - 10); ctx.lineTo(x0, y0); ctx.lineTo(x0 + 80, y0); ctx.lineTo(x0 + 80, Y(cap) - 10); ctx.stroke();
          for (let v = 0; v <= cap; v += 5) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + 80, Y(v)); ctx.lineTo(x0 + 80 - (v % 25 ? 8 : 16), Y(v)); ctx.stroke(); if (v % 25 === 0) H.text(ctx, String(v), x0 + 86, Y(v) + 4, { size: 10 }); }
          H.text(ctx, 'см³', x0 + 86, Y(cap) - 14, { size: 10, color: C.mute });
          const lvl = ob.liq ? (dipped ? ob.V : 0) : V1 + (dipped ? ob.V : 0);
          ctx.fillStyle = ob.liq && ob.rho < 1 ? 'rgba(234,179,8,.45)' : C.water; ctx.fillRect(x0 + 2, Y(lvl), 76, y0 - Y(lvl));
          if (dipped && !ob.liq) { ctx.fillStyle = ob.rho > 5 ? '#64748B' : '#CBD5E1'; ctx.fillRect(x0 + 25, y0 - 34, 30, 30); ctx.strokeStyle = C.mute; ctx.beginPath(); ctx.moveTo(x0 + 40, y0 - 34); ctx.lineTo(x0 + 40, Y(cap) - 30); ctx.stroke(); }
          rdo.set([['Маса', weighed ? H.fmt(mass(), 1) + ' г' : '—'], ['Рівень у мензурці', dipped || !ob.liq ? lvl + ' см³' : '0 см³'], ['Підказка', ob.liq ? 'рідина: V₁ = 0' : dipped ? 'V₂ — з тілом' : 'V₁ — лише вода']]);
        };
        draw(); return { destroy() { st.destroy(); } };
      } },

    /* ================= № 6 ================= */
    { n: 6, sec: 6, lesson: 'l24', title: 'Дослідження пружних властивостей тіл',
      aim: 'дослідити пружні властивості гумового шнура; переконатися, що сила пружності прямо пропорційна видовженню; визначити жорсткість шнура.',
      equip: ['гумовий шнур з гачком', 'штатив з муфтою та лапкою', 'набір тягарців по 102 г (вага ≈ 1 Н)', 'лінійка з міліметровими поділками'],
      theory: ['Під час пружної деформації виникає **сила пружності**. **Закон Гука**: сила пружності прямо пропорційна видовженню тіла:', 'f: F_{пр} = k · x',
        'де x — видовження (м), k — **жорсткість** (Н/м). Тягарець, що висить нерухомо, розтягує шнур із силою, що дорівнює його вазі: F_{пр} = P.',
        'Отже, k = F / x. Графік залежності F(x) — пряма, що проходить через початок координат.'],
      steps: ['Підвісьте шнур у лапці штатива; відмітьте положення його нижнього кінця (нуль лінійки).', 'Підвісьте один тягарець, виміряйте видовження x.', 'Додавайте тягарці по одному (до 4), щоразу вимірюючи видовження.',
        'Обчисліть жорсткість для кожного досліду, знайдіть середнє значення.', 'Побудуйте графік F(x) (його видно на установці).'],
      cols: [{ k: 'F', name: 'Сила F', unit: 'Н', dec: 1 }, { k: 'x', name: 'Видовження x', unit: 'см', dec: 1 }],
      calc: [{ k: 'xm', name: 'x', unit: 'м', dec: 3, f: r => r.x / 100 }, { k: 'k', name: 'Жорсткість k', unit: 'Н/м', dec: 0, f: r => r.F / (r.x / 100) }], minRows: 3,
      final: [{ q: 'Обчисли середнє значення жорсткості шнура.', u: 'Н/м', dec: 0, a: rows => Labs.mean(rows.map(r => r.F / (r.x / 100))) },
        { q: 'Яка залежність між силою пружності та видовженням?', opts: ['прямо пропорційна', 'обернено пропорційна', 'не залежить'], a: 'прямо пропорційна' }],
      sample: 'Я дослідив(ла) розтяг гумового шнура. Зі збільшенням навантаження видовження зростало пропорційно, тобто виконується закон Гука. Середня жорсткість шнура — … Н/м. Похибки — через ціну поділки лінійки.',
      questions: ['Сформулюйте закон Гука.', 'Що показує жорсткість? Одиниця?', 'Як виглядає графік F(x)?', 'Чи виконується закон Гука за великих деформацій?'],
      creative: 'Сконструюй саморобний динамометр з гумки й картону: проградуюй шкалу тягарцями (пакетик 100 мл води ≈ 1 Н).',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 340);
        const k = H.rnd(30, 60, 2); let n = 0;
        const rdo = H.readout(panel, 'Покази');
        H.buttons(panel, [['＋ Тягарець', () => { if (n < 4) n++; draw(); }, 'light'], ['− Тягарець', () => { if (n > 0) n--; draw(); }, 'light']]);
        const xOf = n => rd(nz(n * 1 / k * 100, 0.02), 1);
        let cur = 0;
        recBtn(api, panel, () => { if (!n) { api.toast('Підвісь хоча б один тягарець'); return; } api.record({ F: n * 1, x: cur }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); cur = n ? xOf(n) : 0;
          ctx.fillStyle = C.steel; ctx.fillRect(120, 20, 120, 12); ctx.fillRect(170, 20, 10, 300);
          const L0 = 90, px = cur * 6; const y1 = 32 + L0 + px;
          ctx.strokeStyle = '#B45309'; ctx.lineWidth = 6 - Math.min(2, n * 0.4); ctx.beginPath(); ctx.moveTo(240, 32); ctx.lineTo(240, y1); ctx.stroke();
          for (let i = 0; i < n; i++) { ctx.fillStyle = '#475569'; H.rrect(ctx, 226, y1 + 6 + i * 22, 28, 20, 3); ctx.fill(); }
          /* лінійка */
          ctx.fillStyle = '#FDE9B8'; ctx.fillRect(270, 32 + L0 - 6, 34, 200); for (let c = 0; c <= 30; c++) { const yy = 32 + L0 + c * 6; ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(270, yy); ctx.lineTo(270 + (c % 5 ? 6 : 12), yy); ctx.stroke(); if (c % 5 === 0) H.text(ctx, String(c), 286, yy + 4, { size: 10 }); }
          ctx.strokeStyle = C.red; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(240, y1); ctx.lineTo(304, y1); ctx.stroke(); ctx.setLineDash([]);
          H.text(ctx, 'см', 300, 32 + L0 - 10, { size: 10, color: C.mute });
          const pts = api.rows.map(r => [r.x, r.F]); H.plot(ctx, { x: 360, y: 40, w: 180, h: 220 }, { xmax: 15, ymax: 5, gx: 5, gy: 1, xl: 'x, см', yl: 'F, Н', series: [{ pts, dots: true, color: C.brand }] });
          rdo.set([['Тягарців', String(n)], ['Сила F', n + ' Н'], ['Видовження x', H.fmt(cur, 1) + ' см']]);
        };
        draw(); const orig = api.record; api.record = r => { const ok = orig(r); draw(); return ok; };
        return { destroy() { st.destroy(); } };
      } },

    /* ================= № 7 ================= */
    { n: 7, sec: 6, lesson: 'l26', title: 'Визначення коефіцієнта тертя ковзання',
      aim: 'визначити коефіцієнт тертя ковзання дерева по дереву.',
      equip: ['дерев’яний брусок', 'дерев’яна дошка (трибометр)', 'набір тягарців по 102 г', 'динамометр'],
      theory: ['Коли одне тіло ковзає по поверхні іншого, виникає **сила тертя ковзання**. Вона прямо пропорційна силі нормального тиску (для горизонтальної поверхні — вазі тіла P):', 'f: F_{тр} = μ · P',
        'μ — **коефіцієнт тертя ковзання** (безрозмірна величина), залежить від матеріалів і якості обробки поверхонь.',
        'Якщо тягнути брусок динамометром **рівномірно**, сила пружності пружини динамометра дорівнює силі тертя. Отже, μ = F_{тр} / P.'],
      steps: ['Виміряйте динамометром вагу бруска P.', 'Покладіть брусок на дошку, причепіть динамометр і тягніть брусок **рівномірно** вздовж дошки. Запишіть покази — силу тертя.',
        'Покладіть на брусок 1, 2, 3 тягарці; щоразу вимірюйте загальну вагу P та силу тертя.', 'Обчисліть μ для кожного досліду й середнє значення.'],
      cols: [{ k: 'P', name: 'Вага P', unit: 'Н', dec: 1 }, { k: 'F', name: 'Сила тертя F_{тр}', unit: 'Н', dec: 2 }],
      calc: [{ k: 'mu', name: 'μ', dec: 2, f: r => r.F / r.P }], minRows: 3,
      final: [{ q: 'Обчисли середнє значення коефіцієнта тертя ковзання.', dec: 2, a: rows => Labs.mean(rows.map(r => r.F / r.P)) },
        { q: 'Як змінюється сила тертя, якщо збільшити вагу бруска вдвічі?', opts: ['збільшується вдвічі', 'не змінюється', 'зменшується вдвічі'], a: 'збільшується вдвічі' }],
      sample: 'Я виміряв(ла) силу тертя ковзання дерев’яного бруска по дошці за різних навантажень. Сила тертя зростала пропорційно вазі, а коефіцієнт тертя залишався майже сталим (≈ …). Похибки — через нерівномірне тягнення бруска.',
      questions: ['Від чого залежить сила тертя ковзання?', 'Чому брусок треба тягти рівномірно?', 'Як зменшити або збільшити тертя? Наведіть приклади.', 'Чи залежить μ від площі опори?'],
      creative: 'Порівняй тертя різних підошов взуття: тягни черевик динамометром (або гумкою) по підлозі. Склади рейтинг «найменш слизьке взуття».',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 260);
        const mu = rd(0.25 + Math.random() * 0.15, 2), P0 = 0.8; let n = 0, x = 0, pulling = false, read = 0;
        H.seg(panel, { label: 'Тягарців на бруску', options: [['0', '0'], ['1', '1'], ['2', '2'], ['3', '3']], value: '0' }, v => { n = +v; x = 0; read = 0; pulling = false; draw(); });
        const rdo = H.readout(panel, 'Динамометр');
        H.buttons(panel, [['▶ Тягти рівномірно', () => { pulling = true; x = 0; }, 'light']]);
        const P = () => P0 + n * 1;
        recBtn(api, panel, () => { if (!read) { api.toast('Спершу протягни брусок'); return; } api.record({ P: P(), F: read }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF');
          ctx.fillStyle = C.wood; ctx.fillRect(20, 180, 520, 22); ctx.fillStyle = C.woodD; ctx.fillRect(20, 202, 520, 6);
          const bx = 60 + x; ctx.fillStyle = '#C2884B'; H.rrect(ctx, bx, 130, 110, 50, 6); ctx.fill();
          for (let i = 0; i < n; i++) { ctx.fillStyle = '#475569'; H.rrect(ctx, bx + 12 + i * 32, 106, 26, 24, 3); ctx.fill(); }
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 110, 155); ctx.lineTo(bx + 150, 155); ctx.stroke();
          ctx.fillStyle = '#F1F5F9'; H.rrect(ctx, bx + 150, 140, 150, 30, 8); ctx.fill(); ctx.stroke();
          const F = pulling || read ? (read || mu * P()) : 0; for (let i = 0; i <= 50; i++) { const xx = bx + 160 + i * 2.6; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xx, 140); ctx.lineTo(xx, 140 + (i % 10 ? 5 : 10)); ctx.stroke(); if (i % 10 === 0) H.text(ctx, String(i / 10), xx, 166, { size: 9, align: 'center' }); }
          ctx.fillStyle = C.red; ctx.fillRect(bx + 160 + F * 26 - 1.5, 138, 3, 20);
          if (pulling) H.arrow(ctx, bx + 300, 155, bx + 340, 155, C.green, 3, 'F');
          rdo.set([['Вага бруска з тягарцями P', H.fmt(P(), 1) + ' Н'], ['Покази динамометра', read ? H.fmt(read, 2) + ' Н' : pulling ? 'тягнемо…' : '—']]);
        };
        const stop = H.loop(dt => { if (pulling) { x += 120 * dt; if (x > 200) { pulling = false; read = rd(nz(mu * P(), 0.03), 2); } draw(); } });
        draw(); return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 8 ================= */
    { n: 8, sec: 7, lesson: 'l28', title: 'Вимірювання тиску твердого тіла на опору',
      aim: 'визначити тиск твердого тіла на горизонтальну поверхню; виявити залежність тиску від ваги тіла та площі поверхні, на яку воно спирається.',
      equip: ['брусок прямокутної форми', 'лінійка', 'динамометр', 'тягарці'],
      theory: ['**Тиск** — фізична величина, що дорівнює відношенню сили тиску, яка діє перпендикулярно до поверхні, до площі цієї поверхні:', 'f: p = F / S',
        'Для тіла на горизонтальній опорі сила тиску дорівнює його вазі: F = P. Одиниця тиску — **паскаль**: 1 Па = 1 Н/м^{2}.',
        'Площу прямокутної грані обчислюють як S = a · b. Не забудьте перевести сантиметри в метри: 1 см^{2} = 0,0001 м^{2}.'],
      steps: ['Виміряйте динамометром вагу бруска P.', 'Виміряйте лінійкою довжину a, ширину b і висоту c бруска.', 'Поставте брусок на найбільшу грань — обчисліть площу опори й тиск.',
        'Поставте брусок на інші грані — повторіть обчислення.', 'Покладіть на брусок тягарець — визначте, як змінився тиск.'],
      cols: [{ k: 'P', name: 'Вага P', unit: 'Н', dec: 2 }, { k: 'a', name: 'a', unit: 'см', dec: 1 }, { k: 'b', name: 'b', unit: 'см', dec: 1 }],
      calc: [{ k: 'S', name: 'S', unit: 'м^{2}', dec: 4, f: r => r.a * r.b / 1e4 }, { k: 'p', name: 'Тиск p', unit: 'Па', dec: 0, f: r => r.P / (r.a * r.b / 1e4) }], minRows: 3,
      final: [{ q: 'Як залежить тиск від площі опори (за однакової ваги)?', opts: ['чим менша площа, тим більший тиск', 'чим більша площа, тим більший тиск', 'не залежить'], a: 'чим менша площа, тим більший тиск' },
        { q: 'У скільки разів тиск на найменшу грань більший, ніж на найбільшу (без тягарців)?', dec: 1, a: rows => { const r0 = rows.filter(r => Math.abs(r.P - rows[0].P) < 1e-6).map(r => r.P / (r.a * r.b)); return Math.max(...r0) / Math.min(...r0); } }],
      sample: 'Я визначив(ла) тиск бруска на стіл, коли він стоїть на різних гранях. Що менша площа опори, то більший тиск; зі збільшенням ваги тиск зростає. Похибки пов’язані з ціною поділки лінійки й динамометра.',
      questions: ['Що таке тиск? Одиниця тиску.', 'Як змінити тиск? Наведіть приклади збільшення та зменшення тиску.', 'Чому ніж треба гострити?', 'Чому в лижника тиск на сніг менший, ніж у пішохода?'],
      creative: 'Обчисли тиск, який ти чиниш на підлогу, стоячи на двох ногах і на одній (обведи стопу на папері в клітинку, площу знайди за клітинками).',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 280);
        const dims = [H.rnd(14, 18) + 0.5 * H.rnd(0, 1), H.rnd(7, 9) + 0.5 * H.rnd(0, 1), H.rnd(3, 5)];
        const P0 = rd(dims[0] * dims[1] * dims[2] * 0.7 * G / 1000, 2);
        let face = 0, extra = 0;
        const FACES = [[0, 1, 'найбільша грань (a × b)'], [0, 2, 'бічна грань (a × c)'], [1, 2, 'торець (b × c)']];
        H.select(panel, { label: 'Брусок стоїть на грані', options: FACES.map((f, i) => [i, f[2]]), value: 0 }, v => { face = +v; draw(); });
        H.seg(panel, { label: 'Тягарець на бруску', options: [['0', 'немає'], ['1', '1 Н'], ['2', '2 Н']], value: '0' }, v => { extra = +v; draw(); });
        const rdo = H.readout(panel, 'Вимірювання');
        recBtn(api, panel, () => { const f = FACES[face]; api.record({ P: rd(P0 + extra, 2), a: dims[f[0]], b: dims[f[1]] }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const f = FACES[face], s = 9;
          const w = dims[f[0]] * s, d = dims[f[1]] * s * 0.5, hgt = dims[3 - f[0] - f[1]] * s;
          ctx.fillStyle = '#E2E8F0'; ctx.fillRect(20, 230, 400, 10);
          const x0 = 200 - w / 2, y0 = 230;
          ctx.fillStyle = '#C2884B'; ctx.fillRect(x0, y0 - hgt, w, hgt);
          ctx.fillStyle = '#D9A066'; ctx.beginPath(); ctx.moveTo(x0, y0 - hgt); ctx.lineTo(x0 + d, y0 - hgt - d); ctx.lineTo(x0 + w + d, y0 - hgt - d); ctx.lineTo(x0 + w, y0 - hgt); ctx.fill();
          ctx.fillStyle = '#A86B32'; ctx.beginPath(); ctx.moveTo(x0 + w, y0 - hgt); ctx.lineTo(x0 + w + d, y0 - hgt - d); ctx.lineTo(x0 + w + d, y0 - d); ctx.lineTo(x0 + w, y0); ctx.fill();
          for (let i = 0; i < extra; i++) { ctx.fillStyle = '#475569'; ctx.fillRect(x0 + w / 2 - 14 + i * 4, y0 - hgt - d / 2 - 24 - i * 18, 28, 18); }
          ctx.fillStyle = 'rgba(229,72,77,.25)'; ctx.fillRect(x0, y0, w, 6);
          H.text(ctx, 'a = ' + H.fmt(dims[0], 1) + ' см,  b = ' + H.fmt(dims[1], 1) + ' см,  c = ' + H.fmt(dims[2], 1) + ' см', 20, 266, { bold: true, size: 12 });
          dyn(ctx, H, 480, 20, 200, P0 + extra, 4);
          rdo.set([['Вага (динамометр)', H.fmt(P0 + extra, 2) + ' Н'], ['Сторони опори', H.fmt(dims[f[0]], 1) + ' × ' + H.fmt(dims[f[1]], 1) + ' см']]);
        };
        draw(); return { destroy() { st.destroy(); } };
      } },

    /* ================= № 9 ================= */
    { n: 9, sec: 8, lesson: 'l34', title: 'Гідростатичне зважування тіла',
      aim: 'опанувати один із методів визначення маси й густини тіла — метод гідростатичного зважування.',
      equip: ['динамометр', 'тіла на нитці', 'склянка з водою'],
      theory: ['На тіло, занурене в рідину, діє **виштовхувальна (архімедова) сила**, що дорівнює вазі рідини в об’ємі тіла:', 'f: F_{A} = ρ_{р} · g · V',
        'Якщо тіло зважити в повітрі (P_{1}) і у воді (P_{2}), то F_{A} = P_{1} − P_{2}. Звідси об’єм тіла V = F_{A} / (ρ_{в} · g).',
        'Маса тіла m = P_{1} / g, а густина:', 'f: ρ = m / V = ρ_{в} · P_{1} / (P_{1} − P_{2})', 'Густина води ρ_{в} = 1000 кг/м^{3}, g = 9,8 Н/кг.'],
      steps: ['Підвісьте тіло до динамометра й виміряйте його вагу в повітрі P_{1}.', 'Повністю занурте тіло у воду (не торкаючись дна та стінок) — виміряйте P_{2}.', 'Обчисліть архімедову силу, об’єм, масу та густину тіла.', 'Повторіть для інших тіл; визначте речовини за таблицею густин.'],
      cols: [{ k: 'name', name: 'Тіло' }, { k: 'P1', name: 'P_{1} (повітря)', unit: 'Н', dec: 2 }, { k: 'P2', name: 'P_{2} (вода)', unit: 'Н', dec: 2 }],
      calc: [{ k: 'FA', name: 'F_{A}', unit: 'Н', dec: 2, f: r => r.P1 - r.P2 }, { k: 'V', name: 'V', unit: 'см^{3}', dec: 0, f: r => (r.P1 - r.P2) / (1000 * G) * 1e6 }, { k: 'm', name: 'm', unit: 'г', dec: 0, f: r => r.P1 / G * 1000 }, { k: 'rho', name: 'ρ', unit: 'кг/м^{3}', dec: 0, f: r => 1000 * r.P1 / (r.P1 - r.P2) }], minRows: 2,
      final: [{ q: 'З якої речовини виготовлено «Тіло X»?', opts: ['алюміній (2700 кг/м³)', 'цинк (7100 кг/м³)', 'сталь (7800 кг/м³)', 'мідь (8900 кг/м³)'], a: rows => { const r = rows.find(x => x.name === 'Тіло X'); return r ? r._mat : '—'; }, ex: 'Спершу зважте «Тіло X».' }],
      sample: 'Методом гідростатичного зважування я визначив(ла) архімедову силу, об’єм, масу та густину тіл. Отримані густини близькі до табличних. Похибки — через ціну поділки динамометра (0,1 Н).',
      questions: ['Що таке архімедова сила? Від чого вона залежить?', 'Як визначити об’єм тіла за допомогою динамометра?', 'Чому вага тіла у воді менша?', 'Як Архімед перевірив корону царя Гієрона?'],
      creative: 'Повтори «дослід Архімеда» вдома: зваж іграшку чи ложку на нитці в повітрі й у воді (кухонні терези + склянка). Знайди її густину.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 330);
        const MATS = [['алюміній (2700 кг/м³)', 2700], ['цинк (7100 кг/м³)', 7100], ['сталь (7800 кг/м³)', 7800], ['мідь (8900 кг/м³)', 8900]]; const X = H.pick(MATS);
        const OBJ = [{ name: 'Циліндр алюмінієвий', rho: 2700, V: 40 }, { name: 'Циліндр сталевий', rho: 7800, V: 25 }, { name: 'Тіло X', rho: X[1], V: H.rnd(20, 40, 5), mat: X[0] }];
        let oi = 0, depth = 0, target = 0;
        H.select(panel, { label: 'Тіло', options: OBJ.map((o, i) => [i, o.name]), value: 0 }, v => { oi = +v; depth = target = 0; });
        const rdo = H.readout(panel, 'Динамометр');
        H.buttons(panel, [['⬇ Занурити / ⬆ підняти', () => { target = target ? 0 : 1; }, 'light']]);
        const P1 = o => rd(o.rho * o.V * 1e-6 * G, 2), P2 = o => rd(P1(o) - 1000 * G * o.V * 1e-6, 2);
        let rec = {};
        recBtn(api, panel, () => { const o = OBJ[oi]; if (!rec[oi] || rec[oi] < 2) { api.toast('Виміряй вагу тіла в повітрі й у воді'); return; } api.record(Object.assign({ name: o.name, P1: P1(o), P2: P2(o) }, o.mat ? { _mat: o.mat } : {})); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const o = OBJ[oi];
          const P = depth < 0.98 ? (depth < 0.02 ? P1(o) : P1(o) - (P1(o) - P2(o)) * depth) : P2(o);
          if (depth < 0.02) rec[oi] = Math.max(rec[oi] || 0, 1); if (depth > 0.98 && rec[oi] >= 1) rec[oi] = 2;
          const py = dyn(ctx, H, 200, 10, 140, P, Math.max(2, Math.ceil(P1(o))));
          const top = 170 + depth * 90, s = Math.cbrt(o.V) * 9;
          ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(200, 150); ctx.lineTo(200, top); ctx.stroke();
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(130, 210); ctx.lineTo(130, 320); ctx.lineTo(270, 320); ctx.lineTo(270, 210); ctx.stroke();
          ctx.fillStyle = C.water; ctx.fillRect(132, 230, 136, 88);
          ctx.fillStyle = o.rho < 4000 ? '#CBD5E1' : o.rho < 8000 ? '#94A3B8' : '#B87333'; ctx.fillRect(200 - s / 2, top, s, s * 1.2);
          H.text(ctx, 'Покази: ' + H.fmt(P, 2) + ' Н', 330, 60, { bold: true, size: 16 });
          H.text(ctx, depth > 0.98 ? 'тіло повністю у воді' : depth < 0.02 ? 'тіло в повітрі' : '…', 330, 86, { color: C.mute });
          rdo.set([['P₁ (у повітрі)', rec[oi] >= 1 ? H.fmt(P1(o), 2) + ' Н' : '—'], ['P₂ (у воді)', rec[oi] >= 2 ? H.fmt(P2(o), 2) + ' Н' : '—']]);
        };
        const stop = H.loop(dt => { depth += Math.sign(target - depth) * Math.min(Math.abs(target - depth), dt * 1.2); draw(); });
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 10 ================= */
    { n: 10, sec: 8, lesson: 'l35', title: 'Перевірка умов плавання тіла',
      aim: 'дослідним шляхом з’ясувати, за якої умови тіло плаває на поверхні рідини, плаває всередині рідини, тоне в рідині.',
      equip: ['пробірка з пробкою', 'сухий пісок', 'динамометр', 'мензурка з водою', 'серветка'],
      theory: ['На тіло в рідині діють **сила тяжіння** (вага P у повітрі) і **виштовхувальна сила** F_{A}. Порівнюючи їх, отримуємо умови плавання:',
        '• F_{A} > P — тіло **спливає** й плаває на поверхні, частково виступаючи з рідини;', '• F_{A} = P — тіло **плаває всередині** рідини;', '• F_{A} < P — тіло **тоне**.',
        'Для повністю зануреного тіла F_{A} = ρ_{р} · g · V. Порівнюючи густини: тіло тоне, якщо ρ_{т} > ρ_{р}.'],
      steps: ['Насипте в пробірку трохи піску, закрийте пробкою. Виміряйте динамометром її вагу P.', 'Визначте архімедову силу для повністю зануреної пробірки: F_{A} = ρ_{в} g V (V виміряйте мензуркою).',
        'Опустіть пробірку у воду — поспостерігайте, чи вона плаває на поверхні, всередині, чи тоне.', 'Досипайте пісок і повторіть дослід (3–4 рази). Порівняйте P і F_{A}.'],
      cols: [{ k: 'P', name: 'Вага P', unit: 'Н', dec: 2 }, { k: 'FA', name: 'F_{A} (повне занурення)', unit: 'Н', dec: 2 }, { k: 's', name: 'Поведінка пробірки' }], calc: [], minRows: 3,
      final: [{ q: 'Тіло плаває всередині рідини, якщо…', opts: ['F_{A} = P', 'F_{A} > P', 'F_{A} < P'], a: 'F_{A} = P' },
        { q: 'Тіло тоне, якщо…', opts: ['F_{A} < P', 'F_{A} = P', 'F_{A} > P'], a: 'F_{A} < P' }],
      sample: 'Я з’ясував(ла), що пробірка плаває на поверхні, коли її вага менша за архімедову силу, плаває всередині — коли сили рівні, і тоне — коли вага більша. Умови плавання тіл підтверджено.',
      questions: ['Сформулюйте умови плавання тіл.', 'Чому корабель із заліза не тоне?', 'Як підводний човен занурюється і спливає?', 'Чому в морській воді плавати легше, ніж у річковій?'],
      creative: 'Зроби «картезіанського водолаза» з пляшки й ковпачка від ручки. Поясни у відео (до 1 хв), чому він тоне, коли стискаєш пляшку.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 330);
        const V = 30e-6, FA = rd(1000 * G * V, 2); let sand = 10, y = 0;
        const P = () => rd((8 + sand) / 1000 * G, 2);
        const state = () => { const p = P(); return Math.abs(p - FA) <= 0.02 ? 'плаває всередині' : p < FA ? 'плаває на поверхні' : 'тоне'; };
        H.slider(panel, { label: 'Маса піску в пробірці', min: 2, max: 40, step: 1, value: sand, unit: 'г' }, v => { sand = v; });
        const rdo = H.readout(panel, 'Вимірювання');
        recBtn(api, panel, () => api.record({ P: P(), FA, s: state() }));
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const s = state();
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(150, 40); ctx.lineTo(150, 310); ctx.lineTo(330, 310); ctx.lineTo(330, 40); ctx.stroke();
          ctx.fillStyle = C.water; ctx.fillRect(152, 80, 176, 228);
          const ty = 80 + y; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; H.rrect(ctx, 225, ty - 60, 30, 120, 12); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#D6B370'; const hs = 10 + sand * 2; ctx.fillRect(227, ty + 58 - hs, 26, hs);
          ctx.fillStyle = '#7C2D12'; ctx.fillRect(228, ty - 66, 24, 10);
          H.arrow(ctx, 270, ty, 270, ty - 30 - FA * 40, C.blue, 3, 'Fₐ'); H.arrow(ctx, 210, ty, 210, ty + 30 + P() * 40, C.red, 3, 'P');
          H.text(ctx, s, 360, 120, { bold: true, size: 16, color: s === 'тоне' ? C.red : s === 'плаває всередині' ? C.orange : C.green });
          rdo.set([['Вага пробірки P', H.fmt(P(), 2) + ' Н'], ['F_A при повному зануренні', H.fmt(FA, 2) + ' Н'], ['Поведінка', s]]);
        };
        const stop = H.loop(dt => { const s = state(); const target = s === 'тоне' ? 168 : s === 'плаває всередині' ? 110 : 40 + (P() / FA) * 50; y += (target - y) * Math.min(1, dt * 3); draw(); });
        return { destroy() { stop(); st.destroy(); } };
      } }
  ]);
})();
