/* Практичні роботи · Географія 6 клас (за підручником С. Запотоцького та ін., 2023) */
(function () {
  const C = { ink: '#1F2340', mute: '#6B6F8E', brand: '#4F46E5', blue: '#2563EB', red: '#E5484D', green: '#16A34A', orange: '#F59E0B', sea: '#DBEAFE', land: '#F3E8C8', forest: '#86EFAC' };
  const rd = (v, d) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  const recBtn = (api, panel, fn) => api.H.buttons(panel, [['📥 Записати в таблицю', fn, 'brand']]);
  const deg = a => a * Math.PI / 180;

  Labs.reg('geo6', [
    /* ================= № 1 ================= */
    { n: 1, sec: 1, lesson: 'l9', title: 'Визначення напрямків, азимутів і відстаней на плані місцевості',
      aim: 'навчитися визначати азимути на об’єкти та відстані між ними на плані місцевості за допомогою масштабу.',
      equip: ['план місцевості масштабу 1 : 10 000', 'лінійка', 'транспортир', 'олівець'],
      theory: ['**Азимут** — кут між напрямком на північ і напрямком на предмет, який відлічують **за годинниковою стрілкою** від 0° до 360°.',
        '**Масштаб** показує, у скільки разів відстань на плані менша за відстань на місцевості. Масштаб 1 : 10 000 означає: **в 1 см — 100 м**.',
        'f: L_{місц} = d_{план} × M', 'де d — відстань на плані (см), M — величина іменованого масштабу (м в 1 см).'],
      steps: ['Знайдіть на плані точку стояння (школу) і обраний об’єкт.', 'Прикладіть транспортир до напрямку на північ і виміряйте азимут на об’єкт.', 'Лінійкою виміряйте відстань між школою й об’єктом на плані (у см).',
        'Запишіть результати в таблицю й обчисліть відстань на місцевості.', 'Повторіть для 3–4 об’єктів.'],
      cols: [{ k: 'az', name: 'Азимут', unit: '°', dec: 0 }, { k: 'd', name: 'Відстань на плані d', unit: 'см', dec: 1 }],
      calc: [{ k: 'L', name: 'Відстань на місцевості L', unit: 'м', dec: 0, f: r => r.d * 100 }], minRows: 3,
      final: [{ q: 'Який азимут має напрямок на південний схід?', u: '°', dec: 0, a: () => 135, ex: 'Схід — 90°, південь — 180°; посередині 135°.' },
        { q: 'Яку відстань (у метрах) пройде турист від школи до першого об’єкта таблиці й назад?', u: 'м', dec: 0, a: rows => rows[0].d * 200 }],
      sample: 'Я визначив(ла) азимути та відстані від школи до кількох об’єктів на плані місцевості. Азимути відлічував(ла) від напрямку на північ за годинниковою стрілкою, а відстані переводив(ла) за іменованим масштабом «в 1 см — 100 м». Похибки пов’язані з неточним прикладанням транспортира й лінійки.',
      questions: ['Що таке азимут? Як його відлічують?', 'Як перейти від числового масштабу до іменованого?', 'Яку відстань на місцевості відображає 1 см плану масштабу 1 : 25 000?', 'Для чого потрібні азимути в житті?'],
      creative: 'Склади «маршрутний лист» для пошуку скарбу на шкільному подвір’ї: 4 відрізки з азимутами й відстанями. Запропонуй однокласникам пройти маршрут.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 380);
        const O = [280, 200];
        const objs = [['⛪ Церква', 38, 5.6], ['🌳 Дуб', 118, 3.4], ['🏠 Хутір', 206, 6.1], ['🌉 Міст', 263, 4.2], ['🗼 Вежа', 322, 5.0], ['💧 Колодязь', 165, 2.3]];
        let i = 0, show = false;
        H.select(panel, { label: 'Об’єкт', options: objs.map((o, k) => [k, o[0]]), value: 0 }, v => { i = +v; draw(); });
        const rdo = H.readout(panel, 'Вимірювання');
        H.check(panel, { label: 'Показати транспортир і лінійку', value: false }, v => { show = v; draw(); });
        recBtn(api, panel, () => { if (!show) { api.toast('Спершу «прикладіть» транспортир і лінійку'); return; } const o = objs[i]; api.record({ az: o[1], d: o[2] }); });
        const P = o => [O[0] + Math.sin(deg(o[1])) * o[2] * 26, O[1] - Math.cos(deg(o[1])) * o[2] * 26];
        const draw = () => {
          const { ctx } = st; st.clear('#F0FDF4');
          ctx.fillStyle = C.forest; ctx.beginPath(); ctx.ellipse(110, 90, 70, 40, 0, 0, 7); ctx.fill(); H.text(ctx, 'ліс', 100, 95, { color: '#166534' });
          ctx.strokeStyle = '#60A5FA'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 300); ctx.bezierCurveTo(160, 240, 300, 330, 560, 260); ctx.stroke();
          ctx.strokeStyle = '#A8A29E'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(560, 120); ctx.stroke();
          H.arrow(ctx, 520, 70, 520, 20, C.ink, 3, 'Пн');
          objs.forEach((o, k) => { const [x, y] = P(o); H.text(ctx, o[0].split(' ')[0], x, y + 7, { size: k === i ? 24 : 18, align: 'center' }); });
          H.text(ctx, '🏫', O[0], O[1] + 9, { size: 26, align: 'center' });
          const [x, y] = P(objs[i]);
          if (show) {
            ctx.strokeStyle = C.blue; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(O[0], O[1] - 150); ctx.stroke(); ctx.setLineDash([]);
            ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(x, y); ctx.stroke();
            ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(O[0], O[1], 40, -Math.PI / 2, -Math.PI / 2 + deg(objs[i][1])); ctx.stroke();
            H.text(ctx, objs[i][1] + '°', O[0] + 44, O[1] - 44, { bold: true, color: C.orange });
            H.text(ctx, H.fmt(objs[i][2], 1) + ' см', (O[0] + x) / 2 + 8, (O[1] + y) / 2, { bold: true, color: C.red });
          }
          ctx.fillStyle = '#fff'; H.rrect(ctx, 10, 340, 230, 30, 8); ctx.fill(); H.text(ctx, 'Масштаб 1 : 10 000 (в 1 см — 100 м)', 20, 360, { size: 12 });
          rdo.set([['Азимут', show ? objs[i][1] + '°' : '—'], ['d на плані', show ? H.fmt(objs[i][2], 1) + ' см' : '—']]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } },

    /* ================= № 2 ================= */
    { n: 2, sec: 1, lesson: 'l10', title: 'Визначення географічних координат і відстаней за градусною сіткою',
      aim: 'навчитися визначати географічну широту точок і відстань між ними вздовж меридіана.',
      equip: ['фізична карта півкуль', 'атлас', 'лінійка'],
      theory: ['**Географічна широта** — відстань у градусах від екватора до точки (0°–90° пн. ш. або пд. ш.). **Довгота** — від початкового меридіана (0°–180° сх. д. або зх. д.).',
        'Довжина дуги 1° будь-якого меридіана становить приблизно **111 км**. Тому відстань між точками на одному меридіані:', 'f: L = Δφ × 111 км', 'де Δφ — різниця широт (для точок в одній півкулі) або їх сума (для точок у різних півкулях).'],
      steps: ['Оберіть пару точок, що лежать приблизно на одному меридіані.', 'За градусною сіткою визначте широту кожної точки.', 'Обчисліть різницю широт Δφ (якщо точки в різних півкулях — суму).', 'Обчисліть відстань L = Δφ × 111 км.', 'Повторіть для 3 пар точок.'],
      cols: [{ k: 'f1', name: 'Широта точки 1', unit: '°', dec: 0 }, { k: 'f2', name: 'Широта точки 2 (пд. ш. — зі знаком −)', unit: '°', dec: 0 }],
      calc: [{ k: 'df', name: 'Δφ', unit: '°', dec: 0, f: r => Math.abs(r.f1 - r.f2) }, { k: 'L', name: 'Відстань L', unit: 'км', dec: 0, f: r => Math.abs(r.f1 - r.f2) * 111 }], minRows: 3,
      final: [{ q: 'Яка відстань від екватора до Північного полюса (у км)?', u: 'км', dec: 0, a: () => 9990, ex: '90° × 111 км = 9990 км.' },
        { q: 'Яка точка з першої пари розташована ближче до екватора?', opts: ['точка 1', 'точка 2'], a: rows => Math.abs(rows[0].f1) < Math.abs(rows[0].f2) ? 'точка 1' : 'точка 2' }],
      sample: 'Я визначив(ла) широту точок за градусною сіткою та обчислив(ла) відстань між ними вздовж меридіана, помноживши різницю широт на 111 км. Для точок у різних півкулях широти додавав(ла). Похибка пов’язана з округленням широти до цілих градусів.',
      questions: ['Що таке географічна широта і довгота?', 'Чому довжина 1° меридіана скрізь однакова?', 'Як визначити відстань між точками в різних півкулях?', 'Які координати має твій обласний центр?'],
      creative: 'Обчисли, скільки кілометрів від твого міста до екватора та до Північного полюса. Порівняй ці відстані з довжиною подорожі на літаку Київ — Нью-Йорк (≈ 7500 км).',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 380);
        const pairs = [[['Санкт-Петербург', 60, 30], ['Київ', 50, 30.5]], [['Київ', 50, 30.5], ['Олександрія (Єгипет)', 31, 30]], [['Каїр', 30, 31], ['Кейптаун', -34, 18]], [['Лондон', 51, 0], ['Аккра', 6, 0]], [['Мурманськ', 69, 33], ['Анкара', 40, 33]]];
        let k = 0, shown = false;
        H.select(panel, { label: 'Пара точок', options: pairs.map((p, i) => [i, p[0][0] + ' — ' + p[1][0]]), value: 0 }, v => { k = +v; shown = false; draw(); });
        const rdo = H.readout(panel, 'Координати');
        H.buttons(panel, [['🔍 Визначити широту за сіткою', () => { shown = true; draw(); }, 'light']]);
        recBtn(api, panel, () => { if (!shown) { api.toast('Спершу визнач широту точок'); return; } api.record({ f1: pairs[k][0][1], f2: pairs[k][1][1] }); });
        const Y = la => 190 - la * 2.1, X = lo => 280 + lo * 4;
        const draw = () => {
          const { ctx } = st; st.clear('#E0F2FE');
          for (let la = -80; la <= 80; la += 10) { ctx.strokeStyle = la === 0 ? C.red : '#BAE6FD'; ctx.lineWidth = la === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(30, Y(la)); ctx.lineTo(540, Y(la)); ctx.stroke(); H.text(ctx, Math.abs(la) + '°', 26, Y(la) + 4, { size: 10, align: 'right', color: C.mute }); }
          for (let lo = -60; lo <= 60; lo += 10) { ctx.strokeStyle = lo === 0 ? C.blue : '#BAE6FD'; ctx.lineWidth = lo === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(X(lo), 20); ctx.lineTo(X(lo), 360); ctx.stroke(); }
          H.text(ctx, 'екватор', 40, Y(0) - 4, { size: 11, color: C.red });
          pairs[k].forEach((p, i) => { const x = X(p[2]), y = Y(p[1]); ctx.fillStyle = i ? C.orange : C.brand; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); H.text(ctx, p[0], x + 10, y + 4, { bold: true, size: 12 });
            if (shown) { ctx.strokeStyle = i ? C.orange : C.brand; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(30, y); ctx.stroke(); ctx.setLineDash([]); } });
          const f = v => Math.abs(v) + '° ' + (v >= 0 ? 'пн. ш.' : 'пд. ш.');
          rdo.set([[pairs[k][0][0], shown ? f(pairs[k][0][1]) : '?'], [pairs[k][1][0], shown ? f(pairs[k][1][1]) : '?']]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } },

    /* ================= № 3 ================= */
    { n: 3, sec: 2, lesson: 'l19', title: 'Визначення абсолютних і відносних висот за горизонталями',
      aim: 'навчитися визначати абсолютну висоту точок за горизонталями та обчислювати відносну висоту.',
      equip: ['план місцевості з горизонталями', 'олівець', 'лінійка'],
      theory: ['**Горизонталі** — лінії, що сполучають точки з однаковою абсолютною висотою. На плані їх проводять через однакову висоту (січення рельєфу), наприклад через 20 м.',
        '**Бергштрихи** показують напрямок схилу вниз. Густі горизонталі — крутий схил, рідкі — пологий.', '**Відносна висота** — перевищення однієї точки над іншою:', 'f: h_{відн} = h_{1} − h_{2}'],
      steps: ['Розгляньте план, знайдіть вершину пагорба й підписи горизонталей.', 'Переміщайте точку вимірювання вздовж профілю й визначайте її абсолютну висоту.', 'Запишіть висоту вершини (h₁) і висоту обраної точки (h₂).', 'Обчисліть відносну висоту.', 'Порівняйте крутизну західного й східного схилів.'],
      cols: [{ k: 'h1', name: 'Абсолютна висота вершини h₁', unit: 'м', dec: 0 }, { k: 'h2', name: 'Абсолютна висота точки h₂', unit: 'м', dec: 0 }],
      calc: [{ k: 'dh', name: 'Відносна висота', unit: 'м', dec: 0, f: r => r.h1 - r.h2 }], minRows: 3,
      final: [{ q: 'Який схил пагорба крутіший?', opts: ['західний (ліворуч)', 'східний (праворуч)'], a: 'західний (ліворуч)', ex: 'Горизонталі на західному схилі розташовані густіше.' },
        { q: 'Обчисли різницю висот між вершиною й найнижчою з виміряних точок.', u: 'м', dec: 0, a: rows => rows[0].h1 - Math.min(...rows.map(r => r.h2)) }],
      sample: 'Я визначив(ла) абсолютні висоти точок за горизонталями й обчислив(ла) відносні висоти. Західний схил пагорба крутіший, бо горизонталі там густіші. Похибки виникають, коли точка лежить між горизонталями.',
      questions: ['Що таке горизонталі?', 'Як за горизонталями визначити крутизну схилу?', 'Для чого потрібні бергштрихи?', 'Чим абсолютна висота відрізняється від відносної?'],
      creative: 'Виліпи з пластиліну модель пагорба, розріж його «шарами» ниткою через 1 см і обведи контури — отримаєш власний план з горизонталями.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 380);
        const TOP = 248, cx = 300, cy = 180, base = 140;
        const hAt = x => { const dx = x - cx; const r = dx < 0 ? -dx / 140 : dx / 230; return Math.max(base, TOP - (TOP - base) * Math.min(1, r * r * 0.9 + r * 0.1)); };
        let x = 200;
        H.slider(panel, { label: 'Положення точки на профілі', min: 60, max: 540, step: 2, value: x }, v => { x = v; draw(); });
        const rdo = H.readout(panel, 'Вимірювання');
        const hr = () => Math.floor(hAt(x) / 20) * 20;
        recBtn(api, panel, () => api.record({ h1: 248, h2: hr() }));
        const draw = () => {
          const { ctx } = st; st.clear('#FFFBEB');
          for (let h = 160; h <= 240; h += 20) { const k = (TOP - h) / (TOP - base); const solve = (a) => { let r = 0; while (r < 1.2 && 1 - Math.min(1, r * r * 0.9 + r * 0.1) > 1 - k) r += 0.002; return r * a; };
            const rw = solve(140), re = solve(230); ctx.strokeStyle = '#B45309'; ctx.lineWidth = h % 100 === 0 ? 2.5 : 1.5; ctx.beginPath(); ctx.ellipse(cx + (re - rw) / 2, cy, (rw + re) / 2, (rw + re) / 2 * 0.55, 0, 0, 7); ctx.stroke();
            H.text(ctx, String(h), cx + re - 4, cy - 6, { size: 10, color: '#92400E' }); ctx.beginPath(); ctx.moveTo(cx - rw + 6, cy); ctx.lineTo(cx - rw + 14, cy); ctx.stroke(); }
          H.text(ctx, '▲ 248', cx - 4, cy - 4, { bold: true, size: 12 });
          ctx.strokeStyle = C.blue; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(40, cy); ctx.lineTo(545, cy); ctx.stroke(); ctx.setLineDash([]); H.text(ctx, 'А', 30, cy + 4, { bold: true }); H.text(ctx, 'Б', 548, cy + 4, { bold: true });
          ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(x, cy, 7, 0, 7); ctx.fill();
          const py = h => 365 - (h - 120) * 0.6; ctx.strokeStyle = '#78350F'; ctx.lineWidth = 2; ctx.beginPath(); for (let xx = 40; xx <= 545; xx += 4) { const y = py(hAt(xx)); xx === 40 ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y); } ctx.stroke();
          ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(x, py(hAt(x)), 5, 0, 7); ctx.fill(); H.text(ctx, 'профіль А — Б', 44, 300, { size: 11, color: C.mute });
          H.text(ctx, 'Січення горизонталей — 20 м', 360, 22, { size: 12, color: C.mute });
          rdo.set([['Висота вершини', '248 м (позначка)'], ['Висота точки ≈', hr() + ' м (за найближчою нижчою горизонталлю)']]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } },

    /* ================= № 4 ================= */
    { n: 4, sec: 3, lesson: 'l25', title: 'Спостереження за добовим ходом температури повітря',
      aim: 'виміряти температуру повітря впродовж доби, побудувати графік добового ходу, обчислити середню добову температуру та амплітуду.',
      equip: ['термометр (у метеобудці)', 'годинник', 'зошит для спостережень'],
      theory: ['Повітря нагрівається від земної поверхні. Тому найвища температура доби спостерігається не опівдні, а о **14–15 год**, а найнижча — **перед сходом Сонця**.',
        'f: t_{сер} = (t_{1} + t_{2} + … + t_{n}) / n', 'f: A = t_{max} − t_{min}', 'Термометр розміщують у метеобудці на висоті 2 м у тіні, щоб на нього не потрапляло пряме сонячне проміння.'],
      steps: ['Оберіть день спостережень і проміжок між вимірюваннями (наприклад, кожні 3 год).', 'Переміщайте повзунок часу й записуйте показання термометра.', 'Зробіть щонайменше 6 вимірювань упродовж доби.', 'Обчисліть середню добову температуру й амплітуду.', 'Зробіть висновок про добовий хід температури.'],
      cols: [{ k: 'h', name: 'Час', unit: 'год', dec: 0 }, { k: 't', name: 'Температура t', unit: '°C', dec: 0 }], calc: [], minRows: 6,
      final: [{ q: 'Обчисли середню добову температуру за твоїми вимірюваннями.', u: '°C', dec: 1, a: rows => Labs.mean(rows.map(r => r.t)) },
        { q: 'Обчисли добову амплітуду температури.', u: '°C', dec: 0, a: rows => Math.max(...rows.map(r => r.t)) - Math.min(...rows.map(r => r.t)) },
        { q: 'О котрій годині (з твоїх вимірювань) було найтепліше?', u: 'год', dec: 0, a: rows => rows.reduce((b, r) => r.t > b.t ? r : b).h }],
      sample: 'Я спостерігав(ла) за температурою повітря впродовж доби. Найнижча температура була перед сходом Сонця, найвища — близько 14–15 години, бо повітря нагрівається від земної поверхні. Я обчислив(ла) середню добову температуру та добову амплітуду.',
      questions: ['Чому найвища температура доби спостерігається після полудня?', 'Як обчислити добову амплітуду?', 'Де добова амплітуда найбільша й чому?', 'Як хмарність впливає на добовий хід температури?'],
      creative: 'Проведи справжні спостереження за температурою за вікном упродовж вихідного дня й порівняй свій графік із віртуальним.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 340);
        let day = 'ясно', h = 7;
        const T = (hh, d) => { const amp = d === 'ясно' ? 8 : 3, mid = d === 'ясно' ? 12 : 10; return Math.round(mid + amp * Math.cos((hh - 14.5) / 24 * 2 * Math.PI)); };
        H.seg(panel, { label: 'Погода', options: [['ясно', '☀️ Ясно'], ['хмарно', '☁️ Хмарно']], value: day }, v => { day = v; draw(); });
        H.slider(panel, { label: 'Час доби', min: 1, max: 22, step: 3, value: h, unit: 'год' }, v => { h = v; draw(); });
        const rdo = H.readout(panel, 'Термометр');
        recBtn(api, panel, () => api.record({ h, t: T(h, day) }));
        const draw = () => {
          const { ctx } = st; const sunUp = h > 5 && h < 20; st.clear(sunUp ? '#E0F2FE' : '#1E293B');
          if (sunUp) { const a = (h - 5) / 15 * Math.PI; H.text(ctx, day === 'ясно' ? '☀️' : '🌥', 60 + Math.cos(Math.PI - a) * -0 + (h - 5) / 15 * 200, 140 - Math.sin(a) * 100, { size: 30 }); } else H.text(ctx, '🌙', 200, 60, { size: 28 });
          ctx.fillStyle = '#fff'; ctx.fillRect(330, 110, 70, 90); ctx.strokeStyle = C.ink; ctx.strokeRect(330, 110, 70, 90); ctx.fillStyle = '#94A3B8'; ctx.fillRect(362, 200, 6, 90); H.text(ctx, 'метеобудка', 365, 105, { size: 11, align: 'center' });
          const t = T(h, day); ctx.fillStyle = '#F1F5F9'; ctx.fillRect(470, 40, 24, 250); ctx.strokeStyle = C.ink; ctx.strokeRect(470, 40, 24, 250);
          for (let v = -10; v <= 30; v += 5) { const y = 270 - (v + 10) * 5.5; ctx.beginPath(); ctx.moveTo(494, y); ctx.lineTo(502, y); ctx.stroke(); H.text(ctx, String(v), 506, y + 4, { size: 10, color: sunUp ? C.ink : '#E2E8F0' }); }
          ctx.fillStyle = C.red; const yt = 270 - (t + 10) * 5.5; ctx.fillRect(476, yt, 12, 290 - yt); ctx.beginPath(); ctx.arc(482, 296, 11, 0, 7); ctx.fill();
          ctx.fillStyle = '#65A30D'; ctx.fillRect(0, 290, 560, 50);
          H.text(ctx, String(h).padStart(2, '0') + ':00', 20, 28, { bold: true, size: 18, color: sunUp ? C.ink : '#fff' });
          rdo.set([['Час', h + ' год'], ['Температура', (t > 0 ? '+' : '') + t + ' °C']]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } },

    /* ================= № 5 ================= */
    { n: 5, sec: 3, lesson: 'l27', title: 'Вимірювання атмосферного тиску на різних висотах',
      aim: 'дослідити зміну атмосферного тиску з висотою; навчитися визначати висоту місцевості за різницею тиску.',
      equip: ['барометр-анероїд', 'карта висот (віртуальна гора)'],
      theory: ['**Атмосферний тиск** — сила, з якою повітря тисне на земну поверхню. **Нормальний тиск** на рівні моря — **760 мм рт. ст.**',
        'У нижній частині тропосфери з підняттям на кожні **10 м** тиск знижується приблизно на **1 мм рт. ст.**', 'f: Δp = p_{0} − p', 'f: h = Δp × 10 м'],
      steps: ['Розташуйтеся біля підніжжя гори (рівень моря) і зніміть показання барометра.', 'Піднімайтеся на різні висоти й записуйте показання барометра.', 'Для кожної точки обчисліть різницю тиску Δp і висоту h.', 'Порівняйте обчислену висоту з дійсною.'],
      cols: [{ k: 'H', name: 'Дійсна висота', unit: 'м', dec: 0 }, { k: 'p', name: 'Тиск p', unit: 'мм рт. ст.', dec: 0 }],
      calc: [{ k: 'dp', name: 'Δp = 760 − p', unit: 'мм', dec: 0, f: r => 760 - r.p }, { k: 'h', name: 'Висота h = Δp × 10', unit: 'м', dec: 0, f: r => (760 - r.p) * 10 }], minRows: 3,
      final: [{ q: 'Який тиск буде на вершині Говерли (2061 м), якщо біля моря 760 мм рт. ст.? (округли до цілих)', u: 'мм рт. ст.', dec: 0, a: () => 554, ex: '2061 ÷ 10 ≈ 206; 760 − 206 = 554.' },
        { q: 'Як змінюється тиск із висотою?', opts: ['знижується', 'зростає', 'не змінюється'], a: 'знижується' }],
      sample: 'Я дослідив(ла), що з висотою атмосферний тиск знижується приблизно на 1 мм рт. ст. на кожні 10 м. За різницею тиску можна обчислити висоту місцевості; обчислені значення близькі до дійсних.',
      questions: ['Чому з висотою тиск знижується?', 'Який тиск вважають нормальним?', 'Як визначити висоту гори за допомогою барометра?', 'Чому в горах людям важко дихати?'],
      creative: 'Склади задачу для однокласників: «Альпініст піднявся на вершину, і барометр показав … мм рт. ст. Яка висота вершини?»',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 360);
        let hh = 0;
        H.slider(panel, { label: 'Висота підйому', min: 0, max: 2000, step: 100, value: hh, unit: 'м' }, v => { hh = v; draw(); });
        const rdo = H.readout(panel, 'Барометр-анероїд');
        const p = () => Math.round(760 - hh / 10);
        recBtn(api, panel, () => api.record({ H: hh, p: p() }));
        const draw = () => {
          const { ctx } = st; st.clear('#E0F2FE');
          ctx.fillStyle = '#A8A29E'; ctx.beginPath(); ctx.moveTo(20, 340); ctx.lineTo(260, 40); ctx.lineTo(500, 340); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(260, 40); ctx.lineTo(225, 84); ctx.lineTo(295, 84); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#65A30D'; ctx.fillRect(0, 340, 560, 20);
          for (let v = 0; v <= 2000; v += 500) { const y = 340 - v * 0.15; ctx.strokeStyle = '#64748B'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(60, y); ctx.stroke(); ctx.setLineDash([]); H.text(ctx, v + ' м', 64, y + 4, { size: 10 }); }
          const y = 340 - hh * 0.15, x = 20 + hh * 0.12; H.text(ctx, '🧗', x + 40, y, { size: 26 });
          const cx = 470, cy = 90; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 60, 0, 7); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.stroke();
          for (let v = 540; v <= 780; v += 20) { const a = Math.PI * 0.8 + (v - 540) / 240 * Math.PI * 1.4; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 50, cy + Math.sin(a) * 50); ctx.lineTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58); ctx.stroke(); if (v % 40 === 0) H.text(ctx, String(v), cx + Math.cos(a) * 38, cy + Math.sin(a) * 38 + 4, { size: 9, align: 'center' }); }
          const a = Math.PI * 0.8 + (p() - 540) / 240 * Math.PI * 1.4; ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 48, cy + Math.sin(a) * 48); ctx.stroke();
          H.text(ctx, 'мм рт. ст.', cx, cy + 30, { size: 10, align: 'center' });
          rdo.set([['Висота', hh + ' м'], ['Тиск', p() + ' мм рт. ст.']]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } },

    /* ================= № 6 ================= */
    { n: 6, sec: 3, lesson: 'l28', title: 'Побудова рози вітрів за даними спостережень',
      aim: 'навчитися визначати напрямок вітру за флюгером, обробляти дані спостережень і будувати розу вітрів.',
      equip: ['флюгер', 'щоденник погоди за місяць', 'аркуш у клітинку', 'лінійка'],
      theory: ['Напрямок вітру визначають за тим, **звідки** він дме: північний вітер дме з півночі на південь.',
        '**Роза вітрів** — діаграма, що показує повторюваність вітрів різних напрямків. На 8 променях (румбах) відкладають кількість днів з вітром відповідного напрямку й сполучають кінці відрізків.',
        'f: частка = n / N × 100 %', 'де n — кількість днів з вітром певного напрямку, N — кількість днів з вітром за місяць.'],
      steps: ['«Спостерігайте» за флюгером 30 днів (кнопка «Наступний день»).', 'Підрахуйте кількість днів з вітром кожного напрямку.', 'Запишіть у таблицю азимут напрямку та кількість днів.', 'Обчисліть частку кожного напрямку у відсотках.', 'Розгляньте побудовану розу вітрів і визначте переважаючий вітер.'],
      cols: [{ k: 'az', name: 'Азимут напрямку (0 — Пн, 45 — Пн-Сх…)', unit: '°', dec: 0 }, { k: 'n', name: 'Кількість днів n', dec: 0 }],
      calc: [{ k: 'pc', name: 'Частка', unit: '%', dec: 0, f: (r, rows) => r.n / rows.reduce((s, x) => s + x.n, 0) * 100 }], minRows: 8, maxRows: 8,
      final: [{ q: 'Вітер якого напрямку (азимут) переважав?', u: '°', dec: 0, a: rows => rows.reduce((b, r) => r.n > b.n ? r : b).az },
        { q: 'Скільки днів спостережень було з вітром (сума за таблицею)?', dec: 0, a: rows => rows.reduce((s, r) => s + r.n, 0) }],
      sample: 'Я обробив(ла) дані спостережень за напрямком вітру протягом місяця й побудував(ла) розу вітрів. Найчастіше дмуть західні та північно-західні вітри, що характерно для помірних широт України. Роза вітрів допомагає правильно розміщувати будинки, підприємства й лісосмуги.',
      questions: ['Як визначають напрямок вітру?', 'Що таке роза вітрів?', 'Які вітри переважають в Україні й чому?', 'Де використовують розу вітрів?'],
      creative: 'Зроби флюгер із картону й олівця, поспостерігай за вітром 2 тижні й побудуй власну розу вітрів.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 360);
        const NAMES = ['Пн', 'Пн-Сх', 'Сх', 'Пд-Сх', 'Пд', 'Пд-Зх', 'Зх', 'Пн-Зх'], W = [3, 2, 2, 2, 4, 5, 8, 4];
        let cnt = Array(8).fill(0), day = 0, cur = null, calm = 0;
        const pick = () => { if (Math.random() < 0.07) return -1; let s = W.reduce((a, b) => a + b, 0) * Math.random(); for (let i = 0; i < 8; i++) { s -= W[i]; if (s <= 0) return i; } return 6; };
        const rdo = H.readout(panel, 'Спостереження');
        H.buttons(panel, [['➡ Наступний день', () => { if (day >= 30) return; day++; cur = pick(); if (cur < 0) calm++; else cnt[cur]++; draw(); }, 'light'], ['⏩ Увесь місяць', () => { while (day < 30) { day++; cur = pick(); if (cur < 0) calm++; else cnt[cur]++; } draw(); }, 'light'], ['↺ Новий місяць', () => { cnt = Array(8).fill(0); day = 0; calm = 0; cur = null; draw(); }, 'light']]);
        const sel = H.select(panel, { label: 'Напрямок для запису', options: NAMES.map((n, i) => [i, n + ' (' + i * 45 + '°)']), value: 0 });
        recBtn(api, panel, () => { if (day < 30) { api.toast('Спершу заверш спостереження за місяць'); return; } const i = +sel.get(); if (api.rows.some(r => r.az === i * 45)) { api.toast('Цей напрямок уже записано'); return; } api.record({ az: i * 45, n: cnt[i] }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF');
          const cx = 150, cy = 180; H.text(ctx, 'Флюгер', cx, 30, { bold: true, align: 'center' });
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, 7); ctx.stroke();
          NAMES.forEach((n, i) => { const a = deg(i * 45); H.text(ctx, n, cx + Math.sin(a) * 108, cy - Math.cos(a) * 108 + 4, { size: 11, align: 'center' }); });
          if (cur != null && cur >= 0) { const a = deg(cur * 45); H.arrow(ctx, cx + Math.sin(a) * 80, cy - Math.cos(a) * 80, cx - Math.sin(a) * 60, cy + Math.cos(a) * 60, C.blue, 4); }
          else if (cur === -1) H.text(ctx, 'штиль', cx, cy + 4, { bold: true, align: 'center', color: C.mute });
          const rx = 420, ry = 180, mx = Math.max(1, ...cnt); H.text(ctx, 'Роза вітрів', rx, 30, { bold: true, align: 'center' });
          ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1; for (let i = 0; i < 8; i++) { const a = deg(i * 45); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.sin(a) * 120, ry - Math.cos(a) * 120); ctx.stroke(); H.text(ctx, NAMES[i], rx + Math.sin(a) * 132, ry - Math.cos(a) * 132 + 4, { size: 10, align: 'center' }); }
          ctx.beginPath(); cnt.forEach((c, i) => { const a = deg(i * 45), r = c / mx * 110; const x = rx + Math.sin(a) * r, y = ry - Math.cos(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fillStyle = 'rgba(79,70,229,.25)'; ctx.fill(); ctx.strokeStyle = C.brand; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(rx, ry, 12, 0, 7); ctx.fill(); H.text(ctx, String(calm), rx, ry + 4, { size: 10, align: 'center' });
          rdo.set([['День', day + ' з 30'], ['Сьогодні', cur == null ? '—' : cur < 0 ? 'штиль' : NAMES[cur]], ['Підрахунок', NAMES.map((n, i) => n + ': ' + cnt[i]).join(', ') + ', штиль: ' + calm]]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } },

    /* ================= № 7 ================= */
    { n: 7, sec: 3, lesson: 'l29', title: 'Визначення відносної вологості повітря',
      aim: 'навчитися обчислювати відносну вологість повітря за абсолютною та максимальною вологістю; дослідити залежність вологості від температури.',
      equip: ['термогігрометр', 'таблиця максимальної вологості повітря'],
      theory: ['**Абсолютна вологість a** — кількість водяної пари (г) в 1 м³ повітря. **Максимальна вологість A** — найбільша кількість пари, яку може вмістити повітря за даної температури.',
        'Максимальна вологість: −10 °C — 2 г/м³; 0 °C — 5 г/м³; +10 °C — 9 г/м³; +20 °C — 17 г/м³; +30 °C — 30 г/м³.', 'f: f = a / A × 100 %', 'Коли f = 100 %, повітря насичене, і зайва пара конденсується (роса, туман).'],
      steps: ['Оберіть температуру повітря в «кліматичній камері».', 'Додайте водяну пару (абсолютна вологість a).', 'За таблицею визначте максимальну вологість A для цієї температури.', 'Запишіть a й A у таблицю та обчисліть відносну вологість.', 'Спробуйте охолодити повітря й поясніть, коли утвориться туман.'],
      cols: [{ k: 't', name: 'Температура', unit: '°C', dec: 0 }, { k: 'a', name: 'Абсолютна вологість a', unit: 'г/м³', dec: 1 }, { k: 'A', name: 'Максимальна вологість A', unit: 'г/м³', dec: 0 }],
      calc: [{ k: 'f', name: 'Відносна вологість f', unit: '%', dec: 0, f: r => r.a / r.A * 100 }], minRows: 3,
      final: [{ q: 'Повітря за +20 °C містить 8,5 г/м³ пари. Яка відносна вологість?', u: '%', dec: 0, a: () => 50, ex: '8,5 / 17 × 100 % = 50 %.' },
        { q: 'Що станеться, якщо повітря з першого досліду охолодити до 0 °C?', opts: ['пара почне конденсуватися, якщо a > 5 г/м³', 'вологість зменшиться до 0 %', 'нічого не зміниться'], a: 'пара почне конденсуватися, якщо a > 5 г/м³' }],
      sample: 'Я визначив(ла) відносну вологість повітря як відношення абсолютної вологості до максимальної. Що тепліше повітря, то більше пари воно може вмістити. Коли відносна вологість досягає 100 %, повітря насичене, і пара конденсується — утворюються роса, туман, хмари.',
      questions: ['Чим абсолютна вологість відрізняється від відносної?', 'Чому тепле повітря вміщує більше пари?', 'Коли утворюється туман?', 'Яка відносна вологість комфортна для людини (40–60 %)?'],
      creative: 'Поспостерігай за запітнілим вікном узимку. Поясни, чому пара конденсується саме на склі.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 330);
        const MAX = { '-10': 2, '0': 5, '10': 9, '20': 17, '30': 30 };
        let t = 20, a = 8;
        H.seg(panel, { label: 'Температура в камері', options: [['-10', '−10 °C'], ['0', '0 °C'], ['10', '+10 °C'], ['20', '+20 °C'], ['30', '+30 °C']], value: '20' }, v => { t = +v; draw(); });
        H.slider(panel, { label: 'Водяна пара a', min: 0.5, max: 30, step: 0.5, value: a, unit: 'г/м³' }, v => { a = v; draw(); });
        const rdo = H.readout(panel, 'Термогігрометр');
        recBtn(api, panel, () => { const A = MAX[t]; if (a > A) { api.toast('Пара вже конденсується — зменш вологість до максимальної'); return; } api.record({ t, a, A }); });
        const draw = () => {
          const { ctx } = st; const A = MAX[t], f = Math.min(100, a / A * 100); st.clear('#F8FAFF');
          ctx.strokeStyle = C.ink; ctx.lineWidth = 3; H.rrect(ctx, 40, 30, 300, 260, 14); ctx.stroke();
          ctx.fillStyle = t <= 0 ? 'rgba(191,219,254,.5)' : 'rgba(254,215,170,.35)'; H.rrect(ctx, 42, 32, 296, 256, 12); ctx.fill();
          const n = Math.round(Math.min(a, A) * 4); for (let i = 0; i < n; i++) { const x = 60 + (i * 97) % 260, y = 50 + (i * 53) % 220; ctx.fillStyle = 'rgba(37,99,235,.55)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
          if (a > A) { ctx.fillStyle = 'rgba(148,163,184,.7)'; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(60 + (i * 37) % 270, 240 + (i * 13) % 40, 6, 0, 7); ctx.fill(); } H.text(ctx, '🌫 туман: пара конденсується!', 190, 20, { bold: true, color: C.red, align: 'center' }); }
          ctx.fillStyle = '#E2E8F0'; ctx.fillRect(400, 40, 40, 250); ctx.fillStyle = f >= 100 ? C.red : C.blue; ctx.fillRect(400, 290 - f * 2.5, 40, f * 2.5); ctx.strokeStyle = C.ink; ctx.strokeRect(400, 40, 40, 250);
          [0, 50, 100].forEach(v => H.text(ctx, v + ' %', 446, 294 - v * 2.5, { size: 11 })); H.text(ctx, 'f', 420, 32, { bold: true, align: 'center' });
          rdo.set([['Температура', (t > 0 ? '+' : '') + t + ' °C'], ['a', H.fmt(a, 1) + ' г/м³'], ['Стан', a > A ? 'перенасичене — конденсація' : a === A ? 'насичене' : 'ненасичене']]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } },

    /* ================= № 8 ================= */
    { n: 8, sec: 4, lesson: 'l37', title: 'Визначення солоності води',
      aim: 'навчитися обчислювати солоність води в проміле; порівняти солоність морів.',
      equip: ['мірна посудина', 'терези', 'кухонна сіль', 'вода'],
      theory: ['**Солоність** — кількість солей у грамах, розчинених в 1 л (1 кг) води. Її вимірюють у **проміле (‰)** — тисячних частках.',
        'f: S = m / V', 'де m — маса солей (г), V — об’єм води (л). Середня солоність Світового океану — **35 ‰**, Чорного моря — **17–18 ‰**, Червоного — **≈ 41 ‰**.'],
      steps: ['Налийте в посудину певний об’єм води.', 'Зважте й розчиніть у воді сіль.', 'Запишіть масу солі та об’єм води.', 'Обчисліть солоність і порівняйте з морями.', 'Перевірте, чи спливе яйце в розчині.'],
      cols: [{ k: 'm', name: 'Маса солі m', unit: 'г', dec: 0 }, { k: 'V', name: 'Об’єм води V', unit: 'л', dec: 1 }],
      calc: [{ k: 'S', name: 'Солоність S', unit: '‰', dec: 1, f: r => r.m / r.V }], minRows: 3,
      final: [{ q: 'Скільки грамів солі треба розчинити в 3 л води, щоб отримати солоність Чорного моря (18 ‰)?', u: 'г', dec: 0, a: () => 54, ex: '18 г × 3 = 54 г.' },
        { q: 'Скільки солей у 5 л води Червоного моря (41 ‰)?', u: 'г', dec: 0, a: () => 205 }],
      sample: 'Я приготував(ла) розчини солі різної концентрації й обчислив(ла) їх солоність у проміле як відношення маси солі до об’єму води. Чим більша солоність, тим краще тримає вода предмети — яйце спливає в дуже солоній воді.',
      questions: ['Що таке солоність? У чому її вимірюють?', 'Чому Червоне море найсолоніше?', 'Чому Балтійське море малосолоне?', 'Чому в Мертвому морі легко триматися на воді?'],
      creative: 'Приготуй удома «воду Чорного моря» й «воду океану». Порівняй їх на смак (обережно!) та за плавучістю яйця.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 330);
        let V = 1, m = 18;
        H.slider(panel, { label: 'Об’єм води V', min: 0.5, max: 3, step: 0.5, value: V, unit: 'л' }, v => { V = v; draw(); });
        H.slider(panel, { label: 'Маса солі m', min: 0, max: 150, step: 1, value: m, unit: 'г' }, v => { m = v; draw(); });
        const rdo = H.readout(panel, 'Розчин');
        recBtn(api, panel, () => { if (!m) { api.toast('Додай сіль'); return; } api.record({ m, V }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const S = m / V;
          const h = V / 3 * 220; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(140, 40); ctx.lineTo(140, 290); ctx.lineTo(340, 290); ctx.lineTo(340, 40); ctx.stroke();
          ctx.fillStyle = `rgba(37,99,235,${0.18 + Math.min(S, 60) / 200})`; ctx.fillRect(142, 290 - h, 196, h - 2);
          for (let v = 0.5; v <= 3; v += 0.5) { const y = 290 - v / 3 * 220; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(340, y); ctx.lineTo(350, y); ctx.stroke(); H.text(ctx, H.fmt(v, 1) + ' л', 354, y + 4, { size: 10 }); }
          const float = S > 45; const ey = float ? 290 - h + 6 : 270; ctx.fillStyle = '#FEF3C7'; ctx.strokeStyle = '#B45309'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(240, ey, 16, 21, 0, 0, 7); ctx.fill(); ctx.stroke();
          const seas = [['Балтійське', 5], ['Азовське', 11], ['Чорне', 18], ['Океан', 35], ['Червоне', 41]]; H.text(ctx, 'Порівняння', 470, 40, { bold: true, align: 'center' });
          seas.forEach(([n, s], i) => { const y = 70 + i * 40; ctx.fillStyle = '#E2E8F0'; ctx.fillRect(400, y, 140, 14); ctx.fillStyle = C.blue; ctx.fillRect(400, y, s / 50 * 140, 14); H.text(ctx, n + ' — ' + s + ' ‰', 400, y - 3, { size: 10 }); });
          const yy = 70 + 5 * 40; ctx.fillStyle = '#E2E8F0'; ctx.fillRect(400, yy, 140, 14); ctx.fillStyle = C.red; ctx.fillRect(400, yy, Math.min(S, 50) / 50 * 140, 14); H.text(ctx, 'Мій розчин', 400, yy - 3, { size: 10, bold: true });
          rdo.set([['m', m + ' г'], ['V', H.fmt(V, 1) + ' л'], ['Яйце', float ? 'спливає 🥚⬆' : 'на дні']]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } }
  ]);
})();
