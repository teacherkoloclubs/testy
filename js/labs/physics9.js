/* Лабораторні роботи · Фізика 9 клас (за підручником) */
(function () {
  const C = { ink: '#1F2340', mute: '#6B6F8E', brand: '#4F46E5', blue: '#2563EB', red: '#E5484D', green: '#16A34A', orange: '#F59E0B', water: 'rgba(56,148,255,.32)', glass: 'rgba(125,211,252,.35)', beam: '#F59E0B' };
  const nz = (v, r) => v * (1 + (Math.random() * 2 - 1) * r);
  const rd = (v, d) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  const D2R = Math.PI / 180;
  const recBtn = (api, panel, fn) => api.H.buttons(panel, [['📥 Записати в таблицю', fn, 'brand']]);
  const digital = (ctx, H, x, y, w, txt, label) => { ctx.fillStyle = '#FDE047'; H.rrect(ctx, x, y, w, 70, 10); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#1E293B'; ctx.fillRect(x + 10, y + 10, w - 20, 30); H.text(ctx, txt, x + w - 16, y + 32, { align: 'right', color: '#A3E635', bold: true, size: 17 }); H.text(ctx, label, x + w / 2, y + 60, { align: 'center', size: 11, bold: true }); };
  Labs.reg('physics9', [
    /* ================= № 1 ================= */
    { n: 1, sec: 1, lesson: 'l1', title: 'Дослідження залежності електричного опору металевого провідника від температури',
      aim: 'дослідити залежність електричного опору мідного дроту від температури.',
      equip: ['мультиметр (омметр)', 'термометр', 'котушка мідного дроту', 'посудина з водою', 'нагрівник (електроплитка або чайник з гарячою водою)'],
      theory: ['Під час нагрівання металу посилюються коливання йонів кристалічної ґратки, і вільні електрони частіше з ними «зіштовхуються». Тому **опір металів зростає з підвищенням температури**.',
        'Для невеликих інтервалів температур залежність лінійна:', 'f: R = R_{0} (1 + α t)', 'R_{0} — опір за 0 °C, α — **температурний коефіцієнт опору** (для міді α ≈ 0,0043 °C^{-1}).',
        'За двома вимірюваннями (t_{1}, R_{1}) і (t_{2}, R_{2}):', 'f: α = (R_{2} − R_{1}) / (R_{1} t_{2} − R_{2} t_{1})'],
      steps: ['Занурте котушку мідного дроту й термометр у воду кімнатної температури. Під’єднайте котушку до мультиметра (режим омметра).', 'Запишіть температуру води та опір котушки.',
        'Поступово нагрівайте воду; через кожні 10–15 °C записуйте температуру й опір.', 'Побудуйте графік R(t). Обчисліть температурний коефіцієнт опору за першим і останнім вимірюваннями.'],
      safety: 'Не торкайтеся нагрівника й гарячої води!',
      cols: [{ k: 't', name: 'Температура t', unit: '°C', dec: 0 }, { k: 'R', name: 'Опір R', unit: 'Ом', dec: 2 }],
      calc: [{ k: 'dR', name: 'R − R_{перш}', unit: 'Ом', dec: 2, f: (r, rows) => r.R - rows[0].R }], minRows: 4, maxRows: 8,
      final: [{ q: 'Обчисли температурний коефіцієнт опору міді за першим і останнім вимірюваннями.', u: '°C⁻¹', dec: 4, a: rows => { const a = rows[0], b = rows[rows.length - 1]; return (b.R - a.R) / (a.R * b.t - b.R * a.t); } },
        { q: 'Як змінюється опір металевого провідника з підвищенням температури?', opts: ['збільшується', 'зменшується', 'не змінюється'], a: 'збільшується' }],
      sample: 'Я дослідив(ла), що опір мідної котушки лінійно зростає з підвищенням температури. Отриманий температурний коефіцієнт опору (≈ 0,004 °C⁻¹) близький до табличного для міді. Похибки — через нерівномірне нагрівання води та котушки.',
      questions: ['Чому опір металів зростає з температурою?', 'Що показує температурний коефіцієнт опору?', 'Що таке надпровідність?', 'Як працює термометр опору?'],
      creative: 'Поясни на прикладі лампи розжарювання, чому вона найчастіше перегорає саме в момент увімкнення (порівняй опір холодної й гарячої нитки).',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 320);
        const R0 = rd(H.rnd(40, 60) / 10, 1), al = 0.0043; let T = 20, heat = false;
        H.check(panel, { label: '🔥 Нагрівник увімкнено', value: false }, v => { heat = v; });
        const rdo = H.readout(panel, 'Прилади');
        const R = () => rd(nz(R0 * (1 + al * T), 0.002), 2);
        let shownR = R(), tick = 0;
        recBtn(api, panel, () => { const last = api.rows[api.rows.length - 1]; if (last && Math.abs(last.t - Math.round(T)) < 5) { api.toast('Нагрій воду ще на 5–15 °C перед наступним вимірюванням'); return; } api.record({ t: Math.round(T), R: shownR }); draw(); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF');
          ctx.fillStyle = '#475569'; ctx.fillRect(40, 270, 160, 16); if (heat) { ctx.fillStyle = '#F97316'; ctx.fillRect(50, 266, 140, 4); }
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(55, 140, 130, 126); ctx.fillStyle = `rgba(${56 + T},${148 - T / 2},255,.3)`; ctx.fillRect(56, 160, 128, 105);
          ctx.strokeStyle = '#B45309'; ctx.lineWidth = 3; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(110, 190 + i * 10, 26, 6, 0, 0, 7); ctx.stroke(); }
          ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(90, 180); ctx.lineTo(90, 110); ctx.lineTo(240, 110); ctx.moveTo(130, 180); ctx.lineTo(130, 120); ctx.lineTo(240, 120); ctx.stroke();
          digital(ctx, H, 240, 80, 120, H.fmt(shownR, 2) + ' Ω', 'мультиметр');
          ctx.fillStyle = '#fff'; ctx.fillRect(160, 100, 10, 160); ctx.strokeRect(160, 100, 10, 160); const ty = 255 - T / 100 * 150; ctx.fillStyle = C.red; ctx.fillRect(162, ty, 6, 258 - ty);
          H.text(ctx, Math.round(T) + ' °C', 176, ty + 4, { bold: true, size: 12 });
          H.plot(ctx, { x: 400, y: 40, w: 140, h: 200 }, { xmin: 0, xmax: 100, ymin: Math.floor(R0), ymax: Math.ceil(R0 * 1.45), gx: 25, gy: 1, xl: 't, °C', yl: 'R, Ом', series: [{ pts: api.rows.map(r => [r.t, r.R]), dots: true }] });
          rdo.set([['Температура', Math.round(T) + ' °C'], ['Опір', H.fmt(shownR, 2) + ' Ом']]);
        };
        const stop = H.loop(dt => { if (heat && T < 95) T += dt * 6; else if (!heat && T > 20) T -= dt * 0.6; if (++tick % 10 === 0) shownR = R(); draw(); });
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 2 ================= */
    { n: 2, sec: 1, lesson: 'l3', title: 'Визначення електрохімічного еквівалента міді',
      aim: 'дослідити електроліз водного розчину купрум(ІІ) сульфату та виміряти електрохімічний еквівалент міді.',
      equip: ['терези (електронні)', 'амперметр', 'годинник (секундомір)', 'джерело струму', 'реостат', 'електролітична ванна з розчином CuSO₄', 'мідні електроди', 'ключ, проводи'],
      theory: ['**Електроліз** — виділення речовин на електродах під час проходження струму через електроліт. На катоді (−) осідає мідь.',
        '**Перший закон Фарадея**: маса речовини, що виділилася на електроді, прямо пропорційна заряду, який пройшов через електроліт:', 'f: m = k · q = k · I · t',
        'k — **електрохімічний еквівалент** речовини. Для міді k = 3,3 · 10^{-7} кг/Кл = 0,33 мг/Кл.', 'f: k = Δm / (I t)'],
      steps: ['Зважте катод — m_{1}. Складіть коло, підтримуйте реостатом сталу силу струму I.', 'Пропускайте струм протягом часу t (10–20 хв).', 'Вийміть катод, обережно висушіть і зважте — m_{2}.', 'Обчисліть масу міді, заряд і електрохімічний еквівалент. Порівняйте з табличним значенням.'],
      safety: 'Розчин купрум(ІІ) сульфату — не куштувати, після роботи вимити руки.',
      cols: [{ k: 'm1', name: 'm_{1}', unit: 'г', dec: 3 }, { k: 'm2', name: 'm_{2}', unit: 'г', dec: 3 }, { k: 'I', name: 'I', unit: 'А', dec: 2 }, { k: 't', name: 't', unit: 'с', dec: 0 }],
      calc: [{ k: 'dm', name: 'Δm', unit: 'мг', dec: 0, f: r => (r.m2 - r.m1) * 1000 }, { k: 'q', name: 'q = It', unit: 'Кл', dec: 0, f: r => r.I * r.t }, { k: 'k', name: 'k', unit: 'мг/Кл', dec: 3, f: r => (r.m2 - r.m1) * 1000 / (r.I * r.t) }], minRows: 1,
      final: [{ q: 'На скільки відсотків твоє значення k відрізняється від табличного (0,33 мг/Кл)? (за першим дослідом)', u: '%', dec: 0, a: rows => { const r = rows[0]; return Math.abs((r.m2 - r.m1) * 1000 / (r.I * r.t) - 0.33) / 0.33 * 100; } }],
      sample: 'Я провів(ла) електроліз розчину купрум(ІІ) сульфату та визначив(ла) електрохімічний еквівалент міді: k ≈ … мг/Кл, що близько до табличного значення 0,33 мг/Кл. Похибки — через коливання сили струму та неточність зважування.',
      questions: ['Що таке електроліз?', 'Сформулюйте закон Фарадея.', 'Де застосовують електроліз?', 'Чому катод треба ретельно висушити перед зважуванням?'],
      creative: 'Знайди вдома 3 предмети, виготовлені із застосуванням гальванотехніки (хромовані, позолочені тощо), і зроби фотоколаж з поясненням.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 300);
        const k = 0.33e-3; let I = 1.0, tmin = 10, run = false, el = 0, m1 = rd(H.rnd(18000, 26000) / 1000, 3), done = null;
        H.slider(panel, { label: 'Сила струму (реостат)', min: 0.5, max: 2, step: 0.1, value: I, unit: 'А' }, v => { if (!run) I = v; });
        H.seg(panel, { label: 'Час електролізу', options: [['10', '10 хв'], ['15', '15 хв'], ['20', '20 хв']], value: '10' }, v => { if (!run) tmin = +v; });
        const rdo = H.readout(panel, 'Вимірювання');
        H.buttons(panel, [['▶ Увімкнути струм', () => { if (done) { m1 = done.m2; done = null; } run = true; el = 0; }, 'light']]);
        recBtn(api, panel, () => { if (!done) { api.toast('Проведи електроліз і зваж катод'); return; } api.record(done); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF');
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(80, 120); ctx.lineTo(80, 270); ctx.lineTo(300, 270); ctx.lineTo(300, 120); ctx.stroke();
          ctx.fillStyle = 'rgba(14,165,233,.35)'; ctx.fillRect(82, 140, 216, 128);
          const thick = Math.min(6, el / 60); ctx.fillStyle = '#B87333'; ctx.fillRect(120, 100, 14, 150); ctx.fillStyle = '#C2410C'; ctx.fillRect(244 - thick, 100, 14 + thick * 2, 150);
          H.text(ctx, 'анод +', 127, 92, { align: 'center', size: 11 }); H.text(ctx, 'катод −', 251, 92, { align: 'center', size: 11 });
          if (run) for (let i = 0; i < 8; i++) { const p = ((Date.now() / 900 + i / 8) % 1); ctx.beginPath(); ctx.arc(134 + p * 108, 160 + i * 12, 3, 0, 7); ctx.fillStyle = '#1D4ED8'; ctx.fill(); }
          digital(ctx, H, 360, 40, 150, done ? H.fmt(done.m2, 3) + ' г' : H.fmt(m1, 3) + ' г', 'терези (катод)');
          digital(ctx, H, 360, 140, 150, H.fmt(run ? I : 0, 2) + ' А', 'амперметр');
          H.text(ctx, '⏱ ' + Math.floor(el / 60) + ' хв ' + String(Math.floor(el % 60)).padStart(2, '0') + ' с', 360, 250, { bold: true, size: 15 });
          rdo.set([['m₁ катода', H.fmt(m1, 3) + ' г'], ['Стан', run ? '⚡ електроліз…' : done ? '✅ катод зважено' : 'готово']]);
        };
        const stop = H.loop(dt => { if (run) { el += dt * 60; if (el >= tmin * 60) { el = tmin * 60; run = false; const t = tmin * 60; done = { m1, m2: rd(m1 + nz(k * I * t, 0.03), 3), I, t }; } } draw(); });
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 3 ================= */
    { n: 3, sec: 1, lesson: 'l8', title: 'Дослідження електричного опору кола з напівпровідниковим діодом',
      aim: 'дослідити особливості роботи напівпровідникового діода в колі постійного струму; переконатися на досліді, що діод проводить струм переважно в одному напрямку.',
      equip: ['напівпровідниковий діод', 'джерело струму', 'потенціометр (реостат)', 'міліамперметр', 'мікроамперметр', 'вольтметр', 'ключ, проводи'],
      theory: ['**Напівпровідниковий діод** містить p-n-перехід. Якщо до p-області приєднати «+» джерела, а до n-області «−», перехід пропускає струм (**пряме ввімкнення**), опір діода малий.',
        'У разі **зворотного ввімкнення** через перехід проходить дуже малий струм (мікроампери) — опір діода великий.', 'f: R = U / I',
        'Залежність I(U) для діода нелінійна: у прямому напрямку струм різко зростає після напруги ≈ 0,6 В (для кремнієвого діода).'],
      steps: ['Складіть коло з діодом у прямому напрямку. Змінюючи напругу, виміряйте силу струму (3–4 значення).', 'Змініть полярність (зворотне ввімкнення). Виміряйте силу струму за тих самих напруг.',
        'Обчисліть опір діода для кожного вимірювання.', 'Порівняйте опір діода в прямому та зворотному напрямках.'],
      cols: [{ k: 'dir', name: 'Ввімкнення' }, { k: 'U', name: 'U', unit: 'В', dec: 2 }, { k: 'I', name: 'I', unit: 'мА', dec: 3 }],
      calc: [{ k: 'R', name: 'R', unit: 'Ом', dec: 0, f: r => r.U / (r.I / 1000) }], minRows: 4,
      final: [{ q: 'У якому ввімкненні опір діода значно більший?', opts: ['у зворотному', 'у прямому', 'однаковий'], a: 'у зворотному' },
        { q: 'Яку властивість діода підтверджує дослід?', opts: ['проводить струм переважно в одному напрямку', 'підсилює струм', 'не проводить струм взагалі'], a: 'проводить струм переважно в одному напрямку' }],
      sample: 'Я дослідив(ла) діод у колі постійного струму. У прямому ввімкненні струм значний, а опір малий; у зворотному струм у тисячі разів менший — діод має однобічну провідність. Тому діоди застосовують для випрямлення змінного струму.',
      questions: ['Що таке p-n-перехід?', 'Що таке пряме і зворотне ввімкнення діода?', 'Де застосовують діоди?', 'Чим світлодіод відрізняється від звичайного діода?'],
      creative: 'Склади «світлофор» зі світлодіодів на схемі (намалюй) або з конструктора й поясни, чому світлодіод світиться лише за правильної полярності.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 300);
        let U = 0.6, fwd = true;
        H.seg(panel, { label: 'Ввімкнення діода', options: [['1', 'пряме'], ['0', 'зворотне']], value: '1' }, v => { fwd = v === '1'; });
        H.slider(panel, { label: 'Напруга U', min: 0.2, max: 1.0, step: 0.05, value: U, unit: 'В' }, v => { U = v; });
        const rdo = H.readout(panel, 'Прилади');
        const Iof = () => fwd ? rd(U < 0.5 ? 0.02 * U : 0.01 + 120 * Math.pow(U - 0.5, 2), 3) : rd(0.002 + U * 0.003, 3);
        recBtn(api, panel, () => api.record({ dir: fwd ? 'пряме' : 'зворотне', U, I: Iof() }));
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const I = Iof();
          ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(60, 80); ctx.lineTo(480, 80); ctx.lineTo(480, 220); ctx.lineTo(60, 220); ctx.closePath(); ctx.stroke();
          ctx.fillStyle = '#F8FAFF'; ctx.fillRect(220, 60, 80, 40); ctx.save(); ctx.translate(260, 80); if (!fwd) ctx.rotate(Math.PI);
          ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(-15, -15); ctx.lineTo(-15, 15); ctx.lineTo(12, 0); ctx.closePath(); ctx.fill(); ctx.fillRect(12, -15, 4, 30); ctx.restore();
          ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(220, 80); ctx.lineTo(300, 80); ctx.stroke();
          H.text(ctx, fwd ? 'пряме: + → p, − → n' : 'зворотне', 260, 50, { align: 'center', bold: true, color: fwd ? C.green : C.red });
          digital(ctx, H, 400, 115, 150, H.fmt(I, 3) + ' мА', fwd ? 'міліамперметр' : 'мікроамперметр');
          digital(ctx, H, 200, 185, 130, H.fmt(U, 2) + ' В', 'вольтметр');
          H.text(ctx, '+', 50, 150, { bold: true, size: 18, color: C.red }); ctx.fillStyle = C.ink; ctx.fillRect(56, 140, 8, 24);
          rdo.set([['U', H.fmt(U, 2) + ' В'], ['I', H.fmt(I, 3) + ' мА'], ['R = U/I', I ? Math.round(U / (I / 1000)) + ' Ом' : '—']]);
        };
        const stop = H.loop(() => draw());
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 4 ================= */
    { n: 4, sec: 2, lesson: 'l14', title: 'Виготовлення електромагніту',
      aim: 'навчитися виготовляти найпростіший електромагніт; з’ясувати, від чого залежить його магнітна дія.',
      equip: ['ізольований провід', 'залізне осердя (цвях, болт)', 'джерело струму', 'реостат', 'амперметр', 'ключ', 'динамометр', 'залізна пластинка', 'компас'],
      theory: ['**Електромагніт** — котушка зі струмом, усередині якої є залізне осердя. Осердя намагнічується і в багато разів посилює магнітне поле котушки.',
        'Магнітна дія електромагніту посилюється, якщо: **збільшити силу струму** в котушці; **збільшити кількість витків**; вставити **залізне осердя**.',
        'Силу притягання можна оцінити динамометром — за силою, потрібною, щоб відірвати залізну пластинку від осердя.', 'Полюси електромагніту визначають компасом або за правилом правої руки.'],
      steps: ['Намотайте на осердя провід (50 витків). Складіть коло з амперметром і реостатом.', 'Замкніть коло; виміряйте силу відривання пластинки F.', 'Змініть силу струму реостатом — повторіть вимірювання.',
        'Збільште кількість витків (100, 150) — повторіть.', 'Вийміть осердя — порівняйте магнітну дію.', 'Визначте полюси електромагніту компасом.'],
      cols: [{ k: 'N', name: 'Витків N', dec: 0 }, { k: 'I', name: 'I', unit: 'А', dec: 1 }, { k: 'core', name: 'Осердя' }, { k: 'F', name: 'Сила відривання F', unit: 'Н', dec: 2 }], calc: [], minRows: 4,
      final: [{ q: 'Як змінюється сила притягання, якщо збільшити силу струму в котушці?', opts: ['збільшується', 'зменшується', 'не змінюється'], a: 'збільшується' },
        { q: 'Що відбувається з магнітною дією, якщо вийняти залізне осердя?', opts: ['різко послаблюється', 'посилюється', 'не змінюється'], a: 'різко послаблюється' }],
      sample: 'Я виготовив(ла) електромагніт і дослідив(ла) його дію. Сила притягання пластинки зростає зі збільшенням сили струму та кількості витків, а без залізного осердя різко зменшується. Полюси електромагніту змінюються, якщо змінити напрямок струму.',
      questions: ['Що таке електромагніт?', 'Від чого залежить магнітна дія електромагніту?', 'Навіщо електромагніту осердя?', 'Наведіть приклади застосування електромагнітів.'],
      creative: 'Придумай пристрій для дому або школи з електромагнітом (наприклад, автоматичні двері для котика) і намалюй його схему з поясненням.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 300);
        let N = 50, I = 1, core = true;
        H.seg(panel, { label: 'Кількість витків', options: [['50', '50'], ['100', '100'], ['150', '150']], value: '50' }, v => { N = +v; });
        H.slider(panel, { label: 'Сила струму', min: 0.5, max: 2, step: 0.5, value: I, unit: 'А' }, v => { I = v; });
        H.check(panel, { label: 'Залізне осердя всередині', value: true }, v => { core = v; });
        const rdo = H.readout(panel, 'Вимірювання');
        const F = () => rd(nz(Math.min(6, (core ? 1 : 0.03) * 0.00025 * Math.pow(N * I, 1.5) * 1.6), 0.03), 2);
        let last = null;
        H.buttons(panel, [['🧲 Відірвати пластинку', () => { last = F(); draw(); }, 'light']]);
        recBtn(api, panel, () => { if (last == null) { api.toast('Виміряй силу відривання динамометром'); return; } api.record({ N, I, core: core ? 'є' : 'немає', F: last }); last = null; });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF');
          if (core) { ctx.fillStyle = '#94A3B8'; ctx.fillRect(140, 130, 220, 30); }
          ctx.strokeStyle = '#B45309'; ctx.lineWidth = 3; const turns = N / 10; for (let i = 0; i < turns; i++) { const x = 160 + i * 180 / turns; ctx.beginPath(); ctx.ellipse(x, 145, 6, 26, 0, 0, 7); ctx.stroke(); }
          ctx.fillStyle = '#475569'; ctx.fillRect(140, 210, 220, 14); H.text(ctx, 'залізна пластинка', 250, 244, { align: 'center', size: 11 });
          H.text(ctx, 'N', 130, 150, { bold: true, color: C.red, align: 'right' }); H.text(ctx, 'S', 372, 150, { bold: true, color: C.blue });
          for (let k = 1; k <= 3; k++) { ctx.strokeStyle = `rgba(79,70,229,${(core ? 0.5 : 0.15) * Math.min(1, N * I / 150)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(250, 145, 120 + k * 18, 30 + k * 18, 0, 0, 7); ctx.stroke(); }
          ctx.fillStyle = '#F1F5F9'; H.rrect(ctx, 430, 40, 40, 170, 8); ctx.fill(); ctx.strokeStyle = C.ink; ctx.stroke();
          const v = last == null ? 0 : last; ctx.fillStyle = C.red; ctx.fillRect(434, 52 + Math.min(6, v) / 6 * 150, 32, 4);
          for (let i = 0; i <= 6; i++) H.text(ctx, String(i), 426, 56 + i * 25, { size: 10, align: 'right' });
          rdo.set([['N × I', String(N * I) + ' А·витків'], ['Динамометр', last == null ? '—' : H.fmt(last, 2) + ' Н']]);
        };
        draw(); const t = setInterval(draw, 300);
        return { destroy() { clearInterval(t); st.destroy(); } };
      } },

    /* ================= № 5 ================= */
    { n: 5, sec: 2, lesson: 'l16', title: 'Спостереження явища електромагнітної індукції',
      aim: 'дослідити умови виникнення індукційного струму в котушці; з’ясувати чинники, від яких залежать сила та напрямок індукційного струму.',
      equip: ['міліамперметр (гальванометр)', 'котушка', 'постійний магніт (дугоподібний або штабовий)', 'з’єднувальні проводи'],
      theory: ['**Електромагнітна індукція** — виникнення електричного струму в замкненому провіднику під час зміни магнітного потоку, що пронизує контур. Струм називають **індукційним**.',
        'Струм виникає лише тоді, коли магніт **рухається** відносно котушки (або котушка відносно магніту). Якщо магніт нерухомий — струму немає.',
        'Сила індукційного струму тим більша, чим **швидше** змінюється магнітний потік і чим більше **витків** у котушці.', 'Напрямок струму залежить від напрямку руху магніту та від того, яким полюсом його наближають (правило Ленца).'],
      steps: ['Приєднайте котушку до міліамперметра.', 'Швидко вставте магніт північним полюсом у котушку — спостерігайте відхилення стрілки.', 'Залиште магніт нерухомим усередині котушки — чи є струм?',
        'Вийміть магніт — порівняйте напрямок відхилення.', 'Повторіть з південним полюсом, з різною швидкістю руху та з котушкою з більшою кількістю витків.'],
      cols: [{ k: 'act', name: 'Дія з магнітом' }, { k: 'pole', name: 'Полюс' }, { k: 'sp', name: 'Швидкість' }, { k: 'N', name: 'Витків', dec: 0 }, { k: 'dev', name: 'Відхилення стрілки' }], calc: [], minRows: 4,
      final: [{ q: 'За якої умови в котушці виникає індукційний струм?', opts: ['коли магніт рухається відносно котушки', 'коли магніт нерухомо лежить у котушці', 'завжди, якщо поруч є магніт'], a: 'коли магніт рухається відносно котушки' },
        { q: 'Як змінюється сила індукційного струму, якщо рухати магніт швидше?', opts: ['збільшується', 'зменшується', 'не змінюється'], a: 'збільшується' }],
      sample: 'Я спостерігав(ла) явище електромагнітної індукції: струм у котушці виникав лише під час руху магніту. Напрямок струму змінювався зі зміною напрямку руху або полюса магніту, а сила струму зростала зі збільшенням швидкості руху та кількості витків.',
      questions: ['Що таке електромагнітна індукція?', 'Від чого залежить сила індукційного струму?', 'Від чого залежить напрямок індукційного струму?', 'Як працює генератор електростанції?'],
      creative: 'Зніми коротке відео або намалюй комікс «Як Фарадей перетворив магнетизм на електрику». Поясни, де ми щодня користуємося цим відкриттям.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 300);
        let pole = 'N', sp = 1, N = 100, x = 0, vx = 0, move = null, needle = 0, maxDev = 0;
        H.seg(panel, { label: 'Полюс до котушки', options: [['N', 'північний N'], ['S', 'південний S']], value: 'N' }, v => { pole = v; });
        H.seg(panel, { label: 'Швидкість руху', options: [['0.5', 'повільно'], ['1', 'середньо'], ['2', 'швидко']], value: '1' }, v => { sp = +v; });
        H.seg(panel, { label: 'Витків у котушці', options: [['100', '100'], ['300', '300']], value: '100' }, v => { N = +v; });
        const rdo = H.readout(panel, 'Гальванометр');
        let lastAct = null;
        H.buttons(panel, [['➡ Вставити', () => { if (x < 0.5) { move = 1; maxDev = 0; lastAct = 'вставляємо'; } }, 'light'], ['⬅ Вийняти', () => { if (x > 0.5) { move = -1; maxDev = 0; lastAct = 'виймаємо'; } }, 'light'], ['⏸ Тримати нерухомо', () => { move = null; maxDev = 0; lastAct = 'тримаємо нерухомо'; }, 'light']]);
        recBtn(api, panel, () => { if (!lastAct || move) { api.toast('Виконай дію з магнітом і дочекайся її завершення'); return; } const d = Math.abs(maxDev) < 0.03 ? 'немає' : (maxDev > 0 ? 'праворуч' : 'ліворуч') + (Math.abs(maxDev) > 0.5 ? ', сильне' : ', слабке');
          api.record({ act: lastAct, pole, sp: sp < 1 ? 'повільно' : sp > 1 ? 'швидко' : 'середньо', N, dev: d }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF');
          ctx.strokeStyle = '#B45309'; ctx.lineWidth = 3; const turns = N === 100 ? 8 : 16; for (let i = 0; i < turns; i++) { const xx = 300 + i * 120 / turns; ctx.beginPath(); ctx.ellipse(xx, 150, 8, 40, 0, 0, 7); ctx.stroke(); }
          const mx = 60 + x * 220; ctx.fillStyle = pole === 'N' ? C.red : C.blue; ctx.fillRect(mx + 70, 135, 70, 30); ctx.fillStyle = pole === 'N' ? C.blue : C.red; ctx.fillRect(mx, 135, 70, 30);
          H.text(ctx, pole, mx + 105, 156, { align: 'center', bold: true, color: '#fff', size: 16 }); H.text(ctx, pole === 'N' ? 'S' : 'N', mx + 35, 156, { align: 'center', bold: true, color: '#fff', size: 16 });
          ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(420, 190); ctx.lineTo(460, 250); ctx.moveTo(300, 190); ctx.lineTo(440, 270); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(480, 240, 46, 0, 7); ctx.fill(); ctx.stroke();
          for (let i = -5; i <= 5; i++) { const a = -Math.PI / 2 + i * 0.12; ctx.beginPath(); ctx.moveTo(480 + Math.cos(a) * 36, 240 + Math.sin(a) * 36); ctx.lineTo(480 + Math.cos(a) * 42, 240 + Math.sin(a) * 42); ctx.stroke(); }
          const a = -Math.PI / 2 + needle * 0.6; ctx.strokeStyle = C.red; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(480, 250); ctx.lineTo(480 + Math.cos(a) * 38, 240 + Math.sin(a) * 38); ctx.stroke();
          H.text(ctx, 'mA', 480, 270, { align: 'center', size: 11, bold: true });
          rdo.set([['Дія', lastAct || '—'], ['Стрілка', Math.abs(needle) < 0.03 ? 'на нулі' : needle > 0 ? 'праворуч' : 'ліворуч']]);
        };
        const stop = H.loop(dt => {
          vx = 0; if (move) { const nx = Math.max(0, Math.min(1, x + move * sp * dt * 0.9)); vx = (nx - x) / dt; x = nx; if (x === 0 || x === 1) move = null; }
          const target = Math.max(-1, Math.min(1, vx * (pole === 'N' ? 1 : -1) * N / 300 * 1.1)); needle += (target - needle) * Math.min(1, dt * 10);
          if (Math.abs(needle) > Math.abs(maxDev)) maxDev = needle; draw();
        });
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 6 ================= */
    { n: 6, sec: 4, lesson: 'l24', title: 'Дослідження відбивання світла від плоского дзеркала',
      aim: 'дослідити відбивання світла від плоского дзеркала; перевірити закон відбивання світла.',
      equip: ['плоске дзеркало', 'джерело світла з щілиною (лазерна указка)', 'транспортир', 'аркуш паперу', 'олівець, лінійка'],
      theory: ['**Закон відбивання світла**: 1) падаючий промінь, відбитий промінь і перпендикуляр до поверхні в точці падіння лежать в одній площині; 2) **кут відбивання дорівнює куту падіння**:', 'f: β = α',
        'Кути вимірюють від **перпендикуляра** (нормалі) до поверхні дзеркала, а не від самої поверхні!', 'Зображення в плоскому дзеркалі уявне, пряме, рівне за розміром предмету й розташоване симетрично предмету відносно дзеркала.'],
      steps: ['Покладіть дзеркало на аркуш, проведіть уздовж нього лінію; поставте перпендикуляр у точці падіння.', 'Спрямуйте промінь у точку падіння під певним кутом α.', 'Позначте хід відбитого променя, виміряйте транспортиром кут відбивання β.',
        'Повторіть для 3–4 кутів падіння.', 'Порівняйте α і β.'],
      cols: [{ k: 'a', name: 'Кут падіння α', unit: '°', dec: 0 }, { k: 'b', name: 'Кут відбивання β', unit: '°', dec: 0 }],
      calc: [{ k: 'd', name: '|β − α|', unit: '°', dec: 0, f: r => Math.abs(r.b - r.a) }], minRows: 3,
      final: [{ q: 'Яке співвідношення між кутом падіння та кутом відбивання підтверджує дослід?', opts: ['β = α', 'β = 2α', 'β = 90° − α'], a: 'β = α' },
        { q: 'Яким буде кут між падаючим і відбитим променями, якщо кут падіння 35°?', u: '°', dec: 0, a: 70 }],
      sample: 'Я дослідив(ла) відбивання світла від плоского дзеркала: за всіх кутів падіння кут відбивання дорівнював куту падіння (з точністю до 1–2°). Закон відбивання світла підтверджено.',
      questions: ['Сформулюйте закон відбивання світла.', 'Від чого відраховують кути падіння й відбивання?', 'Які властивості зображення в плоскому дзеркалі?', 'Чим дзеркальне відбивання відрізняється від розсіяного?'],
      creative: 'Склади «дзеркальний лабіринт»: на аркуші розмісти 3 дзеркала (намалюй) так, щоб промінь ліхтарика дістався до мети. Перевір кутом відбивання.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 320);
        let a = 30, meas = null;
        H.slider(panel, { label: 'Кут падіння α', min: 10, max: 80, step: 5, value: a, unit: '°' }, v => { a = v; meas = null; draw(); });
        const rdo = H.readout(panel, 'Транспортир');
        H.buttons(panel, [['📐 Виміряти β', () => { meas = Math.round(a + (Math.random() < 0.6 ? 0 : H.pick([-1, 1]))); draw(); }, 'light']]);
        recBtn(api, panel, () => { if (meas == null) { api.toast('Виміряй кут відбивання транспортиром'); return; } api.record({ a, b: meas }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const cx = 280, cy = 270, L = 220;
          ctx.fillStyle = '#BAE6FD'; ctx.fillRect(60, cy, 440, 12); ctx.fillStyle = '#64748B'; for (let i = 0; i < 30; i++) ctx.fillRect(60 + i * 15, cy + 12, 8, 4);
          ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, 160, Math.PI, 2 * Math.PI); ctx.stroke();
          for (let d = 0; d <= 180; d += 10) { const ang = Math.PI + d * D2R; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * 152, cy + Math.sin(ang) * 152); ctx.lineTo(cx + Math.cos(ang) * 160, cy + Math.sin(ang) * 160); ctx.stroke(); }
          ctx.setLineDash([5, 5]); ctx.strokeStyle = C.mute; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 200); ctx.stroke(); ctx.setLineDash([]);
          const ia = -Math.PI / 2 - a * D2R, ra = -Math.PI / 2 + a * D2R;
          ctx.strokeStyle = C.beam; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ia) * L, cy + Math.sin(ia) * L); ctx.lineTo(cx, cy); ctx.lineTo(cx + Math.cos(ra) * L, cy + Math.sin(ra) * L); ctx.stroke();
          ctx.fillStyle = '#DC2626'; ctx.beginPath(); ctx.arc(cx + Math.cos(ia) * L, cy + Math.sin(ia) * L, 7, 0, 7); ctx.fill();
          ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 50, ia, -Math.PI / 2); ctx.stroke(); H.text(ctx, 'α', cx + Math.cos(-Math.PI / 2 - a * D2R / 2) * 64, cy + Math.sin(-Math.PI / 2 - a * D2R / 2) * 64, { bold: true, align: 'center' });
          if (meas != null) { ctx.strokeStyle = C.brand; ctx.beginPath(); ctx.arc(cx, cy, 58, -Math.PI / 2, ra); ctx.stroke(); H.text(ctx, 'β', cx + Math.cos(-Math.PI / 2 + a * D2R / 2) * 72, cy + Math.sin(-Math.PI / 2 + a * D2R / 2) * 72, { bold: true, align: 'center', color: C.brand }); }
          H.text(ctx, 'дзеркало', 70, cy - 6, { size: 11, color: C.mute });
          rdo.set([['α', a + '°'], ['β', meas == null ? '—' : meas + '°']]);
        };
        draw(); return { destroy() { st.destroy(); } };
      } },

    /* ================= № 7 ================= */
    { n: 7, sec: 4, lesson: 'l25', title: 'Дослідження явища заломлення світла',
      aim: 'дослідити заломлення світла на межі повітря — скло; визначити показник заломлення скла відносно повітря.',
      equip: ['скляна пластинка з паралельними гранями', 'джерело світла (лазерна указка)', 'транспортир', 'аркуш паперу, лінійка, олівець'],
      theory: ['Під час переходу світла з одного середовища в інше змінюється напрямок його поширення — **заломлення світла**.',
        '**Закон заломлення**: відношення синуса кута падіння до синуса кута заломлення — стала для двох середовищ величина, що дорівнює відносному показнику заломлення:', 'f: n = sin α / sin γ',
        'Для переходу з повітря у скло γ < α (скло — оптично густіше середовище). Показник заломлення звичайного скла ≈ 1,5–1,6.'],
      steps: ['Покладіть пластинку на аркуш, обведіть її контур. Спрямуйте промінь на грань під кутом α до перпендикуляра.', 'Позначте точки входу й виходу променя, проведіть хід заломленого променя у склі.',
        'Виміряйте кут заломлення γ.', 'Повторіть для 3–4 кутів падіння. Обчисліть sin α, sin γ, n; знайдіть середнє значення показника заломлення.'],
      cols: [{ k: 'a', name: 'α', unit: '°', dec: 0 }, { k: 'g', name: 'γ', unit: '°', dec: 0 }],
      calc: [{ k: 'sa', name: 'sin α', dec: 2, f: r => Math.sin(r.a * D2R) }, { k: 'sg', name: 'sin γ', dec: 2, f: r => Math.sin(r.g * D2R) }, { k: 'n', name: 'n', dec: 2, f: r => Math.sin(r.a * D2R) / Math.sin(r.g * D2R) }], minRows: 3,
      final: [{ q: 'Обчисли середнє значення показника заломлення скла.', dec: 2, a: rows => Labs.mean(rows.map(r => Math.sin(r.a * D2R) / Math.sin(r.g * D2R))) },
        { q: 'Як співвідносяться кут падіння і кут заломлення під час переходу світла з повітря у скло?', opts: ['кут заломлення менший', 'кут заломлення більший', 'вони рівні'], a: 'кут заломлення менший' }],
      sample: 'Я дослідив(ла) заломлення світла на межі повітря — скло. Під час переходу в скло промінь наближається до перпендикуляра; відношення sin α / sin γ майже стале. Середній показник заломлення скла n ≈ … Похибки — через неточне вимірювання кутів.',
      questions: ['Що таке заломлення світла?', 'Сформулюйте закон заломлення.', 'Чому ложка в склянці з водою здається «зламаною»?', 'Що показує показник заломлення?'],
      creative: 'Сфотографуй олівець у склянці з водою під різними кутами й поясни на фото хід променів. Зроби міні-плакат «Фокус із заломленням».',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 330);
        const n = rd(1.5 + Math.random() * 0.1, 2); let a = 40, meas = null;
        H.slider(panel, { label: 'Кут падіння α', min: 15, max: 75, step: 5, value: a, unit: '°' }, v => { a = v; meas = null; draw(); });
        const rdo = H.readout(panel, 'Транспортир');
        const gam = () => Math.asin(Math.sin(a * D2R) / n) / D2R;
        H.buttons(panel, [['📐 Виміряти γ', () => { meas = Math.round(gam() + (Math.random() - 0.5)); draw(); }, 'light']]);
        recBtn(api, panel, () => { if (meas == null) { api.toast('Виміряй кут заломлення'); return; } api.record({ a, g: meas }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const cx = 260, cy = 130;
          ctx.fillStyle = C.glass; ctx.fillRect(60, cy, 420, 120); ctx.strokeStyle = '#0EA5E9'; ctx.lineWidth = 2; ctx.strokeRect(60, cy, 420, 120);
          ctx.setLineDash([5, 5]); ctx.strokeStyle = C.mute; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy - 110); ctx.lineTo(cx, cy + 160); ctx.stroke(); ctx.setLineDash([]);
          const ia = a * D2R, g = gam() * D2R; const sx = cx - Math.tan(ia) * 110, ex = cx + Math.tan(g) * 120;
          ctx.strokeStyle = C.beam; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, cy - 110); ctx.lineTo(cx, cy); ctx.lineTo(ex, cy + 120); ctx.lineTo(ex + Math.tan(ia) * 70, cy + 190); ctx.stroke();
          ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 44, -Math.PI / 2 - ia, -Math.PI / 2); ctx.stroke(); H.text(ctx, 'α', cx - 20, cy - 52, { bold: true });
          if (meas != null) { ctx.strokeStyle = C.brand; ctx.beginPath(); ctx.arc(cx, cy, 52, Math.PI / 2 - g, Math.PI / 2); ctx.stroke(); H.text(ctx, 'γ', cx + 10, cy + 70, { bold: true, color: C.brand }); }
          H.text(ctx, 'повітря', 70, 40, { color: C.mute }); H.text(ctx, 'скло', 70, cy + 20, { color: '#0369A1', bold: true });
          rdo.set([['α', a + '°'], ['γ', meas == null ? '—' : meas + '°']]);
        };
        draw(); return { destroy() { st.destroy(); } };
      } },

    /* ================= № 8 ================= */
    { n: 8, sec: 4, lesson: 'l28', title: 'Визначення фокусної відстані та оптичної сили тонкої лінзи',
      aim: 'визначити фокусну відстань та оптичну силу тонкої збиральної лінзи.',
      equip: ['збиральна лінза на підставці', 'екран', 'джерело світла (свічка або лампа з «предметом»)', 'вимірювальна стрічка (оптична лава)'],
      theory: ['Збиральна лінза дає на екрані **дійсне** зображення предмета, якщо предмет розташований далі від лінзи, ніж її фокус.',
        '**Формула тонкої лінзи**:', 'f: 1/F = 1/d + 1/f   ⇒   F = d·f / (d + f)',
        'd — відстань від предмета до лінзи, f — від лінзи до зображення (екрана), F — фокусна відстань.', '**Оптична сила** лінзи D = 1/F, де F — у метрах. Одиниця — **діоптрія** (дптр).'],
      steps: ['Розмістіть джерело, лінзу та екран на одній прямій (оптична лава).', 'Переміщуючи екран, отримайте чітке зображення джерела.', 'Виміряйте відстані d і f.',
        'Змініть відстань d — повторіть (3–4 досліди).', 'Обчисліть F і D для кожного досліду та середні значення.'],
      cols: [{ k: 'd', name: 'd', unit: 'см', dec: 0 }, { k: 'f', name: 'f', unit: 'см', dec: 0 }],
      calc: [{ k: 'F', name: 'F', unit: 'см', dec: 1, f: r => r.d * r.f / (r.d + r.f) }, { k: 'D', name: 'D', unit: 'дптр', dec: 1, f: r => 100 * (r.d + r.f) / (r.d * r.f) }], minRows: 3,
      final: [{ q: 'Обчисли середню оптичну силу лінзи.', u: 'дптр', dec: 1, a: rows => Labs.mean(rows.map(r => 100 * (r.d + r.f) / (r.d * r.f))) },
        { q: 'Яким буде зображення, якщо предмет розташувати між фокусом і лінзою?', opts: ['уявне, збільшене, пряме', 'дійсне, зменшене, обернене', 'зображення не буде'], a: 'уявне, збільшене, пряме' }],
      sample: 'Я отримав(ла) чіткі зображення джерела світла на екрані за різних відстаней і за формулою тонкої лінзи визначив(ла) фокусну відстань (≈ … см) та оптичну силу лінзи (≈ … дптр). Похибки — через неточне визначення положення найчіткішого зображення.',
      questions: ['Запишіть формулу тонкої лінзи.', 'Що таке оптична сила лінзи? Одиниця.', 'За якої умови збиральна лінза дає дійсне зображення?', 'Де застосовують збиральні лінзи?'],
      creative: 'Виміряй фокусну відстань лупи «по-природному»: сфокусуй на стіні зображення вікна й виміряй відстань від лупи до стіни. Порівняй з дослідом.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 300);
        const F = H.rnd(10, 18); let d = 30, f = 25;
        H.slider(panel, { label: 'Відстань до предмета d', min: F + 4, max: 60, step: 1, value: Math.max(F + 6, 30), unit: 'см' }, v => { d = v; });
        H.slider(panel, { label: 'Відстань до екрана f', min: 10, max: 90, step: 1, value: f, unit: 'см' }, v => { f = v; });
        d = Math.max(F + 6, 30);
        const rdo = H.readout(panel, 'Оптична лава');
        const fTrue = () => d * F / (d - F);
        const sharp = () => Math.max(0, 1 - Math.abs(f - fTrue()) / 6);
        recBtn(api, panel, () => { if (sharp() < 0.8) { api.toast('Зображення розмите — пересунь екран, щоб отримати чітке зображення'); return; } api.record({ d, f }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const k = 3.2, L = 280, X = c => L + c * k;
          ctx.fillStyle = '#CBD5E1'; ctx.fillRect(20, 220, 520, 8); for (let c = -80; c <= 80; c += 10) { ctx.fillStyle = C.ink; ctx.fillRect(X(c), 220, 1, c % 50 ? 6 : 10); }
          ctx.strokeStyle = '#0EA5E9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(L, 140, 8, 70, 0, 0, 7); ctx.stroke(); ctx.fillStyle = C.glass; ctx.fill();
          ctx.fillStyle = C.ink; [-F, F].forEach(c => { ctx.beginPath(); ctx.arc(X(c), 140, 3, 0, 7); ctx.fill(); }); H.text(ctx, 'F', X(F) - 3, 160, { size: 11 });
          const ox = X(-d); ctx.fillStyle = '#F97316'; ctx.beginPath(); ctx.moveTo(ox, 140); ctx.lineTo(ox - 8, 100); ctx.lineTo(ox + 8, 100); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#FDE047'; ctx.beginPath(); ctx.arc(ox, 96, 7, 0, 7); ctx.fill();
          const sx = X(Math.min(f, 80)); ctx.fillStyle = '#F1F5F9'; ctx.fillRect(sx - 4, 60, 8, 160); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(sx - 4, 60, 8, 160);
          const sh = sharp(), hImg = 44 * fTrue() / d; ctx.globalAlpha = 0.25 + 0.75 * sh; ctx.fillStyle = '#F97316'; ctx.filter = sh < 0.9 ? `blur(${(1 - sh) * 6}px)` : 'none';
          ctx.beginPath(); ctx.ellipse(sx - 10, 140 + hImg / 2, 5, Math.max(4, hImg / 2), 0, 0, 7); ctx.fill(); ctx.filter = 'none'; ctx.globalAlpha = 1;
          H.text(ctx, 'd = ' + d + ' см', (ox + L) / 2, 250, { align: 'center', bold: true }); H.text(ctx, 'f = ' + f + ' см', (sx + L) / 2, 270, { align: 'center', bold: true });
          rdo.set([['Чіткість зображення', Math.round(sh * 100) + ' %' + (sh >= 0.8 ? ' ✅' : '')], ['d / f', d + ' см / ' + f + ' см']]);
        };
        const stop = H.loop(() => draw());
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 9 ================= */
    { n: 9, sec: 4, lesson: 'l28', title: 'Визначення фокусної відстані та оптичної сили розсіювальної лінзи',
      aim: 'визначити фокусну відстань та оптичну силу розсіювальної лінзи.',
      equip: ['збиральна лінза з відомою оптичною силою (D₁ = +10 дптр)', 'розсіювальна лінза', 'екран', 'джерело світла', 'вимірювальна стрічка'],
      theory: ['Розсіювальна лінза дає лише **уявне** зображення, тому її фокусну відстань не можна виміряти безпосередньо за допомогою екрана.',
        'Розсіювальну лінзу щільно складають зі збиральною лінзою більшої оптичної сили. **Оптична сила системи тонких лінз дорівнює сумі оптичних сил**:', 'f: D_{сист} = D_{1} + D_{2}   ⇒   D_{2} = D_{сист} − D_{1}',
        'Оптичну силу системи визначають за формулою тонкої лінзи: F_{сист} = d·f / (d + f), D_{сист} = 1 / F_{сист}. Оптична сила розсіювальної лінзи від’ємна, F_{2} = 1 / D_{2}.'],
      steps: ['Складіть збиральну (D_{1} = +10 дптр) і розсіювальну лінзи впритул.', 'Отримайте на екрані чітке зображення джерела, виміряйте d і f.', 'Повторіть для інших відстаней d.',
        'Обчисліть F_{сист}, D_{сист}, оптичну силу D_{2} та фокусну відстань розсіювальної лінзи.'],
      cols: [{ k: 'd', name: 'd', unit: 'см', dec: 0 }, { k: 'f', name: 'f', unit: 'см', dec: 0 }],
      calc: [{ k: 'Fs', name: 'F_{сист}', unit: 'см', dec: 1, f: r => r.d * r.f / (r.d + r.f) }, { k: 'Ds', name: 'D_{сист}', unit: 'дптр', dec: 1, f: r => 100 * (r.d + r.f) / (r.d * r.f) }, { k: 'D2', name: 'D_{2}', unit: 'дптр', dec: 1, f: r => 100 * (r.d + r.f) / (r.d * r.f) - 10 }], minRows: 2,
      final: [{ q: 'Обчисли фокусну відстань розсіювальної лінзи за середнім значенням D₂ (у сантиметрах, зі знаком).', u: 'см', dec: 0, a: rows => 100 / Labs.mean(rows.map(r => 100 * (r.d + r.f) / (r.d * r.f) - 10)) },
        { q: 'Який знак має оптична сила розсіювальної лінзи?', opts: ['від’ємний', 'додатний', 'дорівнює нулю'], a: 'від’ємний' }],
      sample: 'Я визначив(ла) оптичну силу системи щільно складених збиральної та розсіювальної лінз і обчислив(ла) оптичну силу розсіювальної лінзи: D₂ ≈ … дптр (від’ємна), фокусна відстань F₂ ≈ … см.',
      questions: ['Чому фокусну відстань розсіювальної лінзи не можна виміряти безпосередньо екраном?', 'Чому дорівнює оптична сила системи тонких лінз?', 'Які окуляри — зі збиральними чи розсіювальними лінзами — носять короткозорі люди?', 'Яке зображення дає розсіювальна лінза?'],
      creative: 'Попроси в рідних окуляри й визнач (за рецептом або написом), які в них лінзи. Поясни, яку ваду зору вони виправляють, і намалюй хід променів.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 300);
        const D2 = -H.pick([2, 2.5, 3, 4, 5]), Ds = 10 + D2, F = 100 / Ds; let d = 50, f = 30;
        H.slider(panel, { label: 'Відстань до предмета d', min: Math.ceil(F + 5), max: 80, step: 1, value: 50, unit: 'см' }, v => { d = v; });
        H.slider(panel, { label: 'Відстань до екрана f', min: 10, max: 120, step: 1, value: f, unit: 'см' }, v => { f = v; });
        const rdo = H.readout(panel, 'Оптична лава');
        const fTrue = () => d * F / (d - F), sharp = () => Math.max(0, 1 - Math.abs(f - fTrue()) / 7);
        recBtn(api, panel, () => { if (sharp() < 0.8) { api.toast('Зображення розмите — пересунь екран'); return; } api.record({ d, f }); });
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const k = 2.2, L = 240, X = c => L + c * k;
          ctx.fillStyle = '#CBD5E1'; ctx.fillRect(20, 220, 520, 8);
          ctx.strokeStyle = '#0EA5E9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(L - 6, 140, 7, 66, 0, 0, 7); ctx.stroke();
          ctx.strokeStyle = '#7C3AED'; ctx.beginPath(); ctx.moveTo(L + 2, 74); ctx.quadraticCurveTo(L + 14, 140, L + 2, 206); ctx.moveTo(L + 18, 74); ctx.quadraticCurveTo(L + 6, 140, L + 18, 206); ctx.stroke();
          H.text(ctx, 'D₁ = +10 дптр', L - 70, 60, { size: 11, bold: true, color: '#0369A1' }); H.text(ctx, 'розсіювальна', L + 22, 60, { size: 11, bold: true, color: '#7C3AED' });
          const ox = X(-d); ctx.fillStyle = '#F97316'; ctx.beginPath(); ctx.moveTo(ox, 140); ctx.lineTo(ox - 8, 100); ctx.lineTo(ox + 8, 100); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#FDE047'; ctx.beginPath(); ctx.arc(ox, 96, 7, 0, 7); ctx.fill();
          const sx = Math.min(540, X(f)); ctx.fillStyle = '#F1F5F9'; ctx.fillRect(sx - 4, 60, 8, 160); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(sx - 4, 60, 8, 160);
          const sh = sharp(); ctx.globalAlpha = 0.25 + 0.75 * sh; ctx.fillStyle = '#F97316'; ctx.filter = sh < 0.9 ? `blur(${(1 - sh) * 6}px)` : 'none'; ctx.beginPath(); ctx.ellipse(sx - 10, 160, 5, 18, 0, 0, 7); ctx.fill(); ctx.filter = 'none'; ctx.globalAlpha = 1;
          rdo.set([['Чіткість', Math.round(sh * 100) + ' %' + (sh >= 0.8 ? ' ✅' : '')], ['d / f', d + ' см / ' + f + ' см']]);
        };
        const stop = H.loop(() => draw());
        return { destroy() { stop(); st.destroy(); } };
      } },

    /* ================= № 10 ================= */
    { n: 10, sec: 4, lesson: 'l29', title: 'Виготовлення моделі оптичного пристрою (перископа)',
      aim: 'з’ясувати принцип дії перископа та виготовити його модель.',
      equip: ['два однакових плоских дзеркала', 'штатив із двома муфтами й лапками (або картонна трубка)', 'транспортир', 'предмет спостереження'],
      theory: ['**Перископ** — оптичний пристрій для спостереження з укриття. Найпростіший перископ складається з двох плоских дзеркал, розташованих **паралельно одне одному під кутом 45°** до осі трубки.',
        'Світло від предмета відбивається від верхнього дзеркала вниз (кут падіння 45° ⇒ поворот променя на 90°), потім від нижнього — до ока спостерігача.', 'Зображення в перископі пряме й рівне предмету за розміром (двічі відбите).'],
      steps: ['Закріпіть верхнє дзеркало під кутом 45° до вертикалі.', 'Під ним на одній вертикалі закріпіть нижнє дзеркало паралельно верхньому.', 'Подивіться в нижнє дзеркало — підберіть кути так, щоб побачити предмет.',
        'Запишіть кути нахилу дзеркал, за яких предмет видно, і за яких — ні.', 'Виготовте модель перископа з картонної коробки з-під соку або молока.'],
      cols: [{ k: 'a1', name: 'Кут верхнього дзеркала', unit: '°', dec: 0 }, { k: 'a2', name: 'Кут нижнього дзеркала', unit: '°', dec: 0 }, { k: 'see', name: 'Предмет видно?' }], calc: [], minRows: 3,
      final: [{ q: 'Як мають бути розташовані дзеркала в перископі?', opts: ['паралельно, під кутом 45° до осі', 'перпендикулярно одне одному', 'під кутом 30° і 60°'], a: 'паралельно, під кутом 45° до осі' },
        { q: 'На який кут повертається промінь після відбивання від одного дзеркала перископа?', u: '°', dec: 0, a: 90 }],
      sample: 'Я з’ясував(ла), що предмет у перископі видно, коли обидва дзеркала паралельні й нахилені під кутом 45°; кожне дзеркало повертає промінь на 90°. Я виготовив(ла) модель перископа з картонної коробки.',
      questions: ['З чого складається найпростіший перископ?', 'Чому дзеркала встановлюють під кутом 45°?', 'Де застосовують перископи?', 'Яке зображення дає перископ?'],
      creative: 'Виготов перископ з двох пакетів з-під молока та дзеркалець. Зроби фото «зі схованки» та намалюй хід променів у своєму перископі.',
      bench(stage, panel, api) {
        const H = api.H, st = H.canvas(stage, 560, 340);
        let a1 = 30, a2 = 60;
        H.slider(panel, { label: 'Нахил верхнього дзеркала', min: 15, max: 75, step: 5, value: a1, unit: '°' }, v => { a1 = v; });
        H.slider(panel, { label: 'Нахил нижнього дзеркала', min: 15, max: 75, step: 5, value: a2, unit: '°' }, v => { a2 = v; });
        const rdo = H.readout(panel, 'Спостереження');
        const ok = () => a1 === 45 && a2 === 45;
        recBtn(api, panel, () => api.record({ a1, a2, see: ok() ? 'так' : 'ні' }));
        const draw = () => {
          const { ctx } = st; st.clear('#F8FAFF'); const x = 260, yT = 70, yB = 270;
          ctx.fillStyle = '#E2E8F0'; ctx.fillRect(x - 30, yT - 30, 60, yB - yT + 60); ctx.fillRect(x - 30, yT - 30, -10, 0);
          ctx.fillStyle = '#16A34A'; ctx.fillRect(40, 190, 140, 150); H.text(ctx, 'укриття', 110, 260, { align: 'center', color: '#fff', bold: true });
          ctx.fillStyle = '#F97316'; ctx.beginPath(); ctx.arc(40, yT, 14, 0, 7); ctx.fill(); H.text(ctx, 'предмет', 20, yT - 22, { size: 11 });
          const mir = (yy, ang) => { const r = ang * D2R; ctx.strokeStyle = '#0EA5E9'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - Math.sin(r) * 30, yy - Math.cos(r) * 30); ctx.lineTo(x + Math.sin(r) * 30, yy + Math.cos(r) * 30); ctx.stroke(); };
          mir(yT, a1); mir(yB, a2);
          /* промінь: від предмета до верхнього дзеркала; відхилення від вертикалі — 2(α − 45°) */
          ctx.strokeStyle = C.beam; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(54, yT); ctx.lineTo(x, yT); ctx.stroke();
          const dx1 = Math.tan((a1 - 45) * 2 * D2R) * (yB - yT); ctx.beginPath(); ctx.moveTo(x, yT); ctx.lineTo(x + dx1, yB); ctx.stroke();
          if (Math.abs(dx1) < 8) { const dev = (a2 - 45) * 2 * D2R; ctx.beginPath(); ctx.moveTo(x, yB); ctx.lineTo(x + 180, yB + Math.tan(dev) * 180); ctx.stroke(); }
          ctx.fillStyle = '#1F2340'; ctx.beginPath(); ctx.ellipse(470, yB, 18, 10, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(466, yB, 4, 0, 7); ctx.fill(); H.text(ctx, 'око', 470, yB + 28, { align: 'center', size: 11 });
          H.text(ctx, ok() ? '✅ Предмет видно!' : '❌ Предмет не видно', 330, 40, { bold: true, size: 15, color: ok() ? C.green : C.red });
          rdo.set([['Верхнє дзеркало', a1 + '°'], ['Нижнє дзеркало', a2 + '°'], ['Результат', ok() ? 'видно' : 'не видно']]);
        };
        const stop = H.loop(() => draw());
        return { destroy() { stop(); st.destroy(); } };
      } }
  ]);
})();
