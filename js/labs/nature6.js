/* Практичні роботи · Пізнаємо природу 6 клас (за підручником Т. Гільберг та ін., 2023) */
(function () {
  const C = { ink: '#1F2340', mute: '#6B6F8E', brand: '#4F46E5', red: '#E5484D', green: '#16A34A', orange: '#F59E0B', yellow: '#FACC15', gray: '#CBD5E1', sand: '#D6B370', water: '#BFDBFE' };
  const recBtn = (api, panel, fn) => api.H.buttons(panel, [['📥 Записати в таблицю', fn, 'brand']]);

  Labs.reg('nature6', [
    /* ================= № 1 ================= */
    { n: 1, sec: 2, lesson: 'l11', title: 'Складаємо електричне коло',
      aim: 'навчитися складати просте електричне коло, порівняти послідовне й паралельне з’єднання ламп.',
      equip: ['батарейка 4,5 В', 'лампочки на підставках', 'вимикач', 'амперметр', 'з’єднувальні дроти'],
      theory: ['Струм тече лише в **замкненому** колі: джерело → споживачі → вимикач → джерело.',
        '**Послідовне** з’єднання: лампи одна за одною; що більше ламп, то слабший струм і тьмяніше світло. Перегорить одна — гаснуть усі.',
        '**Паралельне** з’єднання: кожна лампа на своїй гілці й світить однаково яскраво; загальний струм зростає.',
        'Порівняння струмів: f: k = I_{пар} ÷ I_{посл}'],
      steps: ['Обери кількість ламп і спосіб з’єднання.', 'Замкни вимикач і запиши покази амперметра.', 'Зміни спосіб з’єднання й знову запиши струм.', 'Повтори для 1, 2 і 3 ламп.', 'Перевір, що станеться, якщо одна лампа перегорить.'],
      cols: [{ k: 'n', name: 'Кількість ламп', unit: '', dec: 0 }, { k: 'Is', name: 'Струм (послідовно)', unit: 'А', dec: 2 }, { k: 'Ip', name: 'Струм (паралельно)', unit: 'А', dec: 2 }],
      calc: [{ k: 'k', name: 'У скільки разів більший паралельно', unit: '', dec: 1, f: r => r.Ip / r.Is }], minRows: 3,
      final: [{ q: 'Послідовно струм 0,38 А, паралельно 1,5 А. У скільки разів струм більший паралельно?', dec: 1, a: () => 1.5 / 0.38, ex: '1,5 ÷ 0,38 ≈ 3,9.' },
        { q: 'Який найбільший струм ти виміряв(ла)?', u: 'А', dec: 2, a: rows => Math.max(...rows.map(r => r.Ip)) }],
      sample: 'Я склав(ла) електричне коло з батарейки, вимикача, амперметра й ламп. Під час послідовного з’єднання що більше ламп, то менший струм і тьмяніше світять лампи, а коли одна перегоріла, згасли всі. Під час паралельного з’єднання кожна лампа світила яскраво, загальний струм зростав, а перегоряння однієї лампи не вимикало інші. Тому в квартирах прилади з’єднують паралельно.',
      questions: ['Із чого складається електричне коло?', 'Як змінюється яскравість ламп під час послідовного з’єднання?', 'Що станеться, якщо одна лампа перегорить у кожному з’єднанні?', 'Чому в квартирі прилади з’єднують паралельно?'],
      creative: 'Накресли схему освітлення своєї кімнати з двома лампами й вимикачами умовними позначеннями.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 640, 360);
        let n = 2, mode = 's', on = true, broken = false; const U = 4.5, R = 6;
        const rec = {};
        H.seg(panel, { label: 'Кількість ламп', options: [['1', '1'], ['2', '2'], ['3', '3']], value: '2' }, v => { n = +v; broken = false; draw(); });
        H.seg(panel, { label: 'З’єднання', options: [['s', '➖ послідовне'], ['p', '🔀 паралельне']], value: 's' }, v => { mode = v; broken = false; draw(); });
        H.buttons(panel, [['🔘 Вимикач', () => { on = !on; draw(); }], ['💥 Перегоріла лампа', () => { broken = !broken; draw(); }]]);
        const rdo = H.readout(panel, 'Амперметр');
        const cur = () => { if (!on) return 0; if (mode === 's') return broken ? 0 : U / (n * R); return (broken ? n - 1 : n) * U / R; };
        recBtn(api, panel, () => { if (!on || broken) return api.toast('Замкни коло й заміни лампу'); rec[n] = rec[n] || {}; rec[n][mode] = Math.round(cur() * 100) / 100;
          if (rec[n].s == null || rec[n].p == null) return api.toast('Тепер виміряй струм для іншого з’єднання (' + n + ' ламп.)');
          api.record({ n, Is: rec[n].s, Ip: rec[n].p }); delete rec[n]; });
        function lamp(ctx, x, y, lit, k) {
          if (lit) { const g = ctx.createRadialGradient(x, y, 2, x, y, 34); g.addColorStop(0, 'rgba(250,204,21,' + (0.35 + 0.6 * k) + ')'); g.addColorStop(1, 'rgba(250,204,21,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 34, 0, 7); ctx.fill(); }
          ctx.fillStyle = lit ? '#FEF08A' : '#F1F5F9'; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - 10, y - 10); ctx.lineTo(x + 10, y + 10); ctx.moveTo(x + 10, y - 10); ctx.lineTo(x - 10, y + 10); ctx.stroke();
        }
        const draw = () => {
          const { ctx } = st; st.clear('#FFFFFF'); const I = cur(); ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
          // батарея + вимикач + амперметр (нижня гілка)
          ctx.beginPath(); ctx.moveTo(80, 300); ctx.lineTo(560, 300); ctx.lineTo(560, 80); ctx.moveTo(80, 300); ctx.lineTo(80, 80); ctx.stroke();
          ctx.clearRect(140, 285, 40, 30); ctx.beginPath(); ctx.moveTo(150, 280); ctx.lineTo(150, 320); ctx.stroke(); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(168, 290); ctx.lineTo(168, 310); ctx.stroke(); ctx.lineWidth = 3;
          H.text(ctx, '4,5 В', 160, 340, { align: 'center', size: 12 });
          ctx.clearRect(270, 285, 50, 30); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(272, 300, 4, 0, 7); ctx.arc(318, 300, 4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(272, 300); on ? ctx.lineTo(318, 300) : ctx.lineTo(312, 278); ctx.stroke();
          H.text(ctx, on ? 'замкнено' : 'розімкнено', 295, 340, { align: 'center', size: 12, color: on ? C.green : C.red });
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(430, 300, 20, 0, 7); ctx.fill(); ctx.stroke(); H.text(ctx, 'A', 430, 306, { align: 'center', bold: true });
          const k = Math.min(1, (mode === 's' ? I * n : I / Math.max(1, broken ? n - 1 : n)) / (U / R));
          if (mode === 's') {
            ctx.beginPath(); ctx.moveTo(80, 80); ctx.lineTo(560, 80); ctx.stroke();
            for (let i = 0; i < n; i++) { const x = 80 + (i + 1) * 480 / (n + 1); lamp(ctx, x, 80, I > 0, k); if (broken && i === 0) H.text(ctx, '💥', x, 60, { align: 'center' }); }
          } else {
            for (let i = 0; i < n; i++) { const y = 80 + i * 60; ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(560, y); ctx.stroke(); const lit = on && !(broken && i === 0); lamp(ctx, 320, y, lit, 1); if (broken && i === 0) H.text(ctx, '💥', 320, y - 20, { align: 'center' }); }
          }
          H.text(ctx, 'I = ' + H.fmt(I, 2) + ' А', 500, 250, { align: 'center', bold: true, size: 18, color: C.brand });
          rdo.set([['З’єднання', mode === 's' ? 'послідовне' : 'паралельне'], ['Лампи', n], ['Струм', H.fmt(I, 2) + ' А']]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } },

    /* ================= № 2 ================= */
    { n: 2, sec: 2, lesson: 'l22', title: 'Приготування і розділення сумішей',
      aim: 'приготувати суміш води й річкового піску та розділити її відстоюванням і фільтруванням; порівняти способи.',
      equip: ['прозора посудина', 'вода', 'річковий пісок', 'паличка для перемішування', 'лійка', 'фільтрувальний папір', 'штатив', 'скляна паличка'],
      theory: ['**Відстоювання** ґрунтується на різній густині: важчі частинки піску осідають на дно.',
        '**Фільтрування** ґрунтується на розмірі частинок: вода проходить крізь пори фільтра, а пісок затримується.',
        'Прозорість води оцінюємо у відсотках: 100 % — зовсім прозора.', 'Покращення прозорості: f: ΔP = P − P_{0}'],
      steps: ['Приготуй суміш: вода + 2 ложки піску, розмішай.', 'Спостерігай відстоювання: записуй прозорість води кожні 3 хв протягом 15 хв.', 'Збери прилад для фільтрування й пропусти суміш крізь фільтр.', 'Оціни прозорість фільтрату й запиши в таблицю (час — 0).', 'Порівняй способи й зроби висновки.'],
      cols: [{ k: 't', name: 'Час відстоювання', unit: 'хв', dec: 0 }, { k: 'P', name: 'Прозорість води', unit: '%', dec: 0 }],
      calc: [{ k: 'dP', name: 'Покращення від початку', unit: '%', dec: 0, f: r => r.P - 15 }], minRows: 4,
      final: [{ q: 'Прозорість суміші на початку 15 %, після відстоювання 85 %. На скільки відсотків вона покращилася?', u: '%', dec: 0, a: () => 70, ex: '85 − 15 = 70 %.' },
        { q: 'Яку найбільшу прозорість ти отримав(ла)?', u: '%', dec: 0, a: rows => Math.max(...rows.map(r => r.P)) }],
      sample: 'Я приготував(ла) неоднорідну суміш води й річкового піску. Під час відстоювання пісок поступово осідав на дно, і за 12–15 хв вода стала значно прозорішою, але дрібні частинки ще залишалися. Фільтрування дало майже прозору воду, бо фільтр затримав усі частинки піску. Відстоювання ґрунтується на різній густині речовин, фільтрування — на розмірі частинок. Найкращий результат дає поєднання обох способів.',
      questions: ['Схарактеризуй суміш води й піску.', 'На яких властивостях ґрунтуються відстоювання й фільтрування?', 'Чи обов’язково перемішувати суміш перед фільтруванням?', 'Який спосіб дає кращий результат?'],
      creative: 'Запропонуй два способи розділення суміші деревної тирси й металевих ошурків.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 640, 360);
        let t = 0, filtered = false, mix = false;
        const P = () => filtered ? 98 : (mix ? Math.round(100 - 85 * Math.exp(-t / 5)) : 100);
        H.buttons(panel, [['🥄 Приготувати суміш', () => { mix = true; filtered = false; t = 0; draw(); }], ['⏱ +3 хв', () => { if (!mix) return api.toast('Спершу приготуй суміш'); if (filtered) return; t = Math.min(30, t + 3); draw(); }], ['🧻 Профільтрувати', () => { if (!mix) return api.toast('Спершу приготуй суміш'); filtered = true; draw(); }]]);
        const rdo = H.readout(panel, 'Спостереження');
        recBtn(api, panel, () => { if (!mix) return api.toast('Приготуй суміш'); api.record({ t: filtered ? 0 : t, P: P() }); });
        const draw = () => {
          const { ctx } = st; st.clear('#FFFFFF'); const p = P() / 100;
          H.text(ctx, 'Відстоювання', 170, 28, { align: 'center', bold: true, size: 15 });
          ctx.fillStyle = 'rgba(214,179,112,' + (mix && !filtered ? (1 - p) * 0.9 : 0) + ')'; ctx.fillRect(103, 90, 134, 190);
          ctx.fillStyle = C.water; ctx.globalAlpha = .45; ctx.fillRect(103, 90, 134, 190); ctx.globalAlpha = 1;
          if (mix && !filtered) { const h = 6 + 24 * (1 - Math.exp(-t / 5)); ctx.fillStyle = C.sand; ctx.fillRect(103, 280 - h, 134, h); }
          ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(100, 70); ctx.lineTo(100, 283); ctx.lineTo(240, 283); ctx.lineTo(240, 70); ctx.stroke();
          H.text(ctx, mix ? (filtered ? 'суміш профільтровано' : '⏱ ' + t + ' хв') : 'чиста вода', 170, 310, { align: 'center', color: C.brand, bold: true });
          H.text(ctx, 'Фільтрування', 470, 28, { align: 'center', bold: true, size: 15 });
          ctx.fillStyle = '#F8FAFC'; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(410, 70); ctx.lineTo(530, 70); ctx.lineTo(478, 150); ctx.lineTo(462, 150); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillRect(463, 150, 14, 40); ctx.strokeRect(463, 150, 14, 40);
          if (filtered) { ctx.fillStyle = C.sand; ctx.beginPath(); ctx.moveTo(440, 110); ctx.lineTo(500, 110); ctx.lineTo(478, 145); ctx.lineTo(462, 145); ctx.closePath(); ctx.fill(); }
          ctx.fillStyle = C.water; ctx.fillRect(423, 280 - (filtered ? 60 : 0), 94, filtered ? 60 : 0);
          ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(420, 200); ctx.lineTo(420, 283); ctx.lineTo(520, 283); ctx.lineTo(520, 200); ctx.stroke();
          H.text(ctx, filtered ? 'фільтрат майже прозорий' : 'фільтрат', 470, 310, { align: 'center', color: C.mute });
          H.text(ctx, 'Прозорість: ' + P() + ' %', 320, 345, { align: 'center', bold: true, size: 16 });
          rdo.set([['Суміш', mix ? 'вода + пісок' : '—'], ['Час', filtered ? '—' : t + ' хв'], ['Прозорість', P() + ' %']]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } },

    /* ================= № 3 ================= */
    { n: 3, sec: 2, lesson: 'l29', title: 'Розмноження рослин',
      aim: 'вирощувати нову рослину з живця кімнатної рослини та дослідити швидкість утворення коренів.',
      equip: ['кімнатна рослина (традесканція, пеларгонія, гібіскус)', 'посудина з відстояною водою', 'горщик із супіщаним ґрунтом', 'скляна банка', 'лінійка'],
      theory: ['**Вегетативне розмноження** — утворення нової рослини з частини материнської (живця, бульби, вуса).',
        'Живець ставлять у воду на глибину 1–1,5 см; кожні 3–4 доби воду змінюють. Коли корінці досягнуть **3–5 мм**, живець пересаджують у ґрунт.',
        'Середня швидкість росту коренів: f: v = L ÷ d', 'де L — довжина корінців (мм), d — кількість діб.'],
      steps: ['Обери кімнатну рослину й відріж живець із бруньками.', 'Постав живець у воду, кожні 3–4 доби змінюй воду.', 'Щокілька діб вимірюй довжину корінців і записуй у таблицю.', 'Коли корінці досягнуть 3–5 мм, пересади живець у горщик і накрий банкою.', 'Порівняй різні рослини.'],
      cols: [{ k: 'd', name: 'Доба спостереження', unit: 'доба', dec: 0 }, { k: 'L', name: 'Довжина корінців', unit: 'мм', dec: 1 }],
      calc: [{ k: 'v', name: 'Середня швидкість росту', unit: 'мм/добу', dec: 2, f: r => r.L / r.d }], minRows: 4,
      final: [{ q: 'За 12 діб корінці виросли до 6 мм. Яка середня швидкість росту?', u: 'мм/добу', dec: 1, a: () => 0.5, ex: '6 ÷ 12 = 0,5 мм/добу.' },
        { q: 'Якої найбільшої довжини корінців ти досяг(ла)?', u: 'мм', dec: 1, a: rows => Math.max(...rows.map(r => r.L)) }],
      sample: 'Я поставив(ла) живець кімнатної рослини у відстояну воду й регулярно змінював(ла) її. Через кілька діб з’явилися корінці; найшвидше вони утворилися в традесканції, найповільніше — у гібіскуса. Коли корінці досягли 3–5 мм, я пересадив(ла) живець у горщик і накрив(ла) банкою. Без регулярної заміни води корені росли повільніше. Рослину висаджують у ґрунт лише після появи коренів, бо без них вона не може вбирати воду й мінеральні речовини.',
      questions: ['Що таке вегетативне розмноження?', 'Навіщо змінювати воду в посудині?', 'Чому живець висаджують у ґрунт лише після появи коренів?', 'Чому культурні рослини часто розмножують вегетативно?'],
      creative: 'Склади інструкцію-комікс «Як виростити нову рослину з живця» для молодшого брата чи сестри.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 640, 360);
        const PL = [['Традесканція', 3, 0.9, '#16A34A'], ['Пеларгонія', 7, 0.6, '#65A30D'], ['Гібіскус', 11, 0.4, '#15803D']];
        let k = 0, d = 0, fresh = true, planted = false;
        const L = () => { const p = PL[k]; return Math.max(0, (d - p[1]) * p[2] * (fresh ? 1 : 0.5)); };
        H.select(panel, { label: 'Рослина', options: PL.map((p, i) => [i, p[0]]), value: 0 }, v => { k = +v; d = 0; planted = false; draw(); });
        H.check(panel, { label: 'Змінювати воду кожні 3–4 доби', value: true }, v => { fresh = v; draw(); });
        H.buttons(panel, [['📅 +2 доби', () => { if (planted) return; d = Math.min(30, d + 2); draw(); }], ['🪴 Пересадити', () => { if (L() < 3) return api.toast('Корінці ще замалі (потрібно 3–5 мм)'); planted = true; draw(); }], ['↺ Новий живець', () => { d = 0; planted = false; draw(); }]]);
        const rdo = H.readout(panel, 'Спостереження');
        recBtn(api, panel, () => { if (d === 0) return api.toast('Зачекай кілька діб'); api.record({ d, L: Math.round(L() * 10) / 10 }); });
        const draw = () => {
          const { ctx } = st; st.clear('#FFFDF5'); const p = PL[k], l = L();
          if (!planted) {
            ctx.fillStyle = C.water; ctx.globalAlpha = .6; ctx.fillRect(203, 190, 114, 110); ctx.globalAlpha = 1;
            ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(200, 150); ctx.lineTo(200, 303); ctx.lineTo(320, 303); ctx.lineTo(320, 150); ctx.stroke();
          } else {
            ctx.fillStyle = '#B45309'; ctx.beginPath(); ctx.moveTo(190, 200); ctx.lineTo(330, 200); ctx.lineTo(310, 310); ctx.lineTo(210, 310); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#78350F'; ctx.fillRect(195, 200, 130, 14);
            ctx.strokeStyle = 'rgba(148,163,184,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(260, 160, 70, Math.PI, 0); ctx.lineTo(330, 200); ctx.moveTo(190, 200); ctx.lineTo(190, 160); ctx.stroke();
          }
          ctx.strokeStyle = p[3]; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(260, 90); ctx.lineTo(260, 250); ctx.stroke();
          for (let i = 0; i < 3; i++) { ctx.fillStyle = p[3]; ctx.beginPath(); ctx.ellipse(260 + (i % 2 ? 22 : -22), 100 + i * 22, 20, 9, i % 2 ? .5 : -.5, 0, 7); ctx.fill(); }
          ctx.strokeStyle = '#F5F5DC'; ctx.lineWidth = 2; const sc = 6;
          for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(260, 250); ctx.lineTo(260 + (i - 2) * l * sc * 0.35, 250 + l * sc * (0.6 + (i % 2) * 0.2)); ctx.stroke(); }
          ctx.strokeStyle = '#A3A380'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(260, 250); ctx.lineTo(260 + (i - 2) * l * sc * 0.35, 250 + l * sc * (0.6 + (i % 2) * 0.2)); ctx.stroke(); }
          H.text(ctx, p[0], 480, 90, { align: 'center', bold: true, size: 16 });
          H.text(ctx, '📅 Доба: ' + d, 480, 130, { align: 'center' });
          H.text(ctx, 'Корінці: ' + H.fmt(l, 1) + ' мм', 480, 160, { align: 'center', bold: true, color: C.brand });
          H.text(ctx, planted ? '🪴 Пересаджено під банку' : l >= 3 ? '✅ Готовий до пересадки' : l > 0 ? 'Корінці ростуть…' : 'Корінців ще немає', 480, 195, { align: 'center', color: l >= 3 ? C.green : C.mute });
          if (!fresh) H.text(ctx, '⚠️ Вода застоялася — ріст повільніший', 480, 230, { align: 'center', size: 12, color: C.red });
          rdo.set([['Рослина', p[0]], ['Доба', d], ['Довжина корінців', H.fmt(l, 1) + ' мм']]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } },

    /* ================= № 4 ================= */
    { n: 4, sec: 4, lesson: 'l50', title: 'Квітковий годинник на подвір’ї',
      aim: 'дослідити добові ритми розкривання квіток і створити модель квіткового годинника Карла Ліннея.',
      equip: ['рослини з різним часом розкривання квіток', 'освітлена ділянка 1,5 м²', 'горщики, ґрунт, фарба', 'стрижень 90 см', 'гравій'],
      theory: ['Кожна квітка розкривається й закривається щодня приблизно в один і той самий час — це **добовий біоритм**.',
        '**Карл Лінней** висадив рослини по колу так, що цвітіння переходило від сектора до сектора, як години на циферблаті.',
        'Частка розкритих квіток: f: Ч = n ÷ N × 100 %', 'де n — кількість розкритих видів, N — усі види на годиннику.'],
      steps: ['Розглянь таблицю часу розкривання й закривання квіток.', 'Переміщуй повзунок часу від 4:00 до 21:00.', 'Записуй, скільки видів квіток розкрито о певній годині.', 'Зроби щонайменше 5 записів у різний час.', 'Визнач, о котрій годині розкрито найбільше квіток.'],
      cols: [{ k: 'h', name: 'Година', unit: 'год', dec: 0 }, { k: 'n', name: 'Розкрито видів', unit: '', dec: 0 }],
      calc: [{ k: 'sh', name: 'Частка розкритих', unit: '%', dec: 0, f: r => r.n / 12 * 100 }], minRows: 5,
      final: [{ q: 'На годиннику 12 видів, о 10:00 розкрито 9. Яка частка розкритих видів?', u: '%', dec: 0, a: () => 75, ex: '9 ÷ 12 × 100 = 75 %.' },
        { q: 'О котрій годині в твоїх записах було розкрито найбільше квіток?', u: 'год', dec: 0, a: rows => rows.reduce((b, r) => r.n > b.n ? r : b, rows[0]).h }],
      sample: 'Я дослідив(ла) добові ритми квіток. Найраніше, о 4–5 годині, розкривається шипшина, згодом кульбаба, цикорій, латаття, а нагідки — лише о 9–10 годині. Найбільше квіток розкрито приблизно о 10–11 годині. Після полудня квітки поступово закриваються, а ввечері розкриваються тютюн пахучий і нічна фіалка. Отже, рослини мають чіткі добові біоритми, за якими можна приблизно визначити час.',
      questions: ['Хто створив квітковий годинник?', 'Яка квітка розкривається найраніше?', 'О котрій годині розкрито найбільше квіток?', 'Чому в похмурий день годинник може «помилятися»?'],
      creative: 'Склади проєкт квіткового годинника для свого подвір’я з рослин твоєї місцевості.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 640, 360);
        const F = [['Шипшина', 4.5, 19.5, '#F472B6'], ['Осот городній', 5, 11.5, '#FACC15'], ['Кульбаба', 5.5, 14, '#EAB308'], ['Осот польовий', 6.5, 10, '#FDE047'], ['Цикорій', 6.5, 15.5, '#60A5FA'], ['Льон', 6.5, 17, '#93C5FD'], ['Картопля', 6.5, 15, '#E9D5FF'], ['Латаття', 7.5, 17, '#F8FAFC'], ['Братки', 7.5, 18, '#A78BFA'], ['Нагідки', 9.5, 15.5, '#FB923C'], ['Тютюн пахучий', 20, 28, '#FEF9C3'], ['Нічна фіалка', 21, 29, '#C4B5FD']];
        let h = 8;
        const open = f => h >= f[1] && h < f[2];
        H.slider(panel, { label: 'Час доби', min: 4, max: 21, step: 1, value: h, unit: 'год' }, v => { h = v; draw(); });
        const rdo = H.readout(panel, 'Квітковий годинник');
        recBtn(api, panel, () => api.record({ h, n: F.filter(open).length }));
        const draw = () => {
          const { ctx } = st; st.clear('#F0FDF4'); const cx = 200, cy = 180, R = 135;
          ctx.fillStyle = '#DCFCE7'; ctx.beginPath(); ctx.arc(cx, cy, R + 25, 0, 7); ctx.fill();
          F.forEach((f, i) => { const a = -Math.PI / 2 + i / F.length * Math.PI * 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, o = open(f);
            ctx.fillStyle = '#B45309'; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill();
            if (o) { for (let j = 0; j < 6; j++) { const b = j / 6 * Math.PI * 2; ctx.fillStyle = f[3]; ctx.beginPath(); ctx.ellipse(x + Math.cos(b) * 9, y + Math.sin(b) * 9, 8, 5, b, 0, 7); ctx.fill(); } ctx.fillStyle = '#CA8A04'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
            else { ctx.fillStyle = '#4D7C0F'; ctx.beginPath(); ctx.ellipse(x, y, 5, 11, 0, 0, 7); ctx.fill(); }
            H.text(ctx, H.fmt(f[1], 1).replace(',5', ':30').replace(/^(\d+)$/, '$1:00'), cx + Math.cos(a) * (R - 38), cy + Math.sin(a) * (R - 38) + 4, { align: 'center', size: 10, color: C.mute }); });
          H.text(ctx, h < 12 ? '🌅' : h < 18 ? '☀️' : '🌙', cx, cy - 6, { align: 'center', size: 30 });
          H.text(ctx, h + ':00', cx, cy + 30, { align: 'center', bold: true, size: 20 });
          H.text(ctx, 'Розкриті квітки', 500, 30, { align: 'center', bold: true });
          const op = F.filter(open); op.slice(0, 11).forEach((f, i) => H.text(ctx, '🌼 ' + f[0], 430, 60 + i * 24, { size: 13 }));
          if (!op.length) H.text(ctx, 'усі квітки закриті', 500, 70, { align: 'center', color: C.mute });
          rdo.set([['Час', h + ':00'], ['Розкрито видів', op.length + ' з ' + F.length]]);
        };
        st.onfit = draw; draw();
        return { destroy() { st.destroy(); } };
      } }
  ]);
})();
