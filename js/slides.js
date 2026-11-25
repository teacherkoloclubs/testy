/* Перегляд HTML-презентацій з інтерактивними слайдами
   Типи слайдів: cover, def, fact, think, words, (звичайний) +
   інтерактиви: quiz, tf, flip, input, match, order, group */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  /* **жирний** у тексті слайда */
  function rich(s) { /* `код` — моноширинний фрагмент, решта — **жирний** */
    return String(s == null ? '' : s).split('`').map((p, i) => i % 2 ? `<code class="t-code">${esc(p)}</code>` : esc(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')).join('');
  }

  /* детерміноване перемішування (щоб порядок не збігався з правильним) */
  function shuffled(arr, seed) {
    const a = arr.map((x, i) => i);
    let s = seed || 7;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let k = 0; k < 6; k++) {
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      if (a.length < 2 || a.some((v, i) => v !== i)) break;
    }
    return a;
  }
  const IX_TYPES = ['quiz', 'tf', 'input', 'match', 'order', 'group'];
  const IX_LABEL = { quiz: '⚡ Швидка перевірка', tf: '🕵️ Правда чи міф?', flip: '🃏 Картки-перевертні', input: '✍️ Впиши відповідь', match: '🔗 З’єднай пари', order: '🔢 Упорядкуй', group: '🗂 Розклади за групами' };

  function ixHead(s) {
    return `<div class="s-label">${IX_LABEL[s.type]}</div>${s.h && s.h !== IX_LABEL[s.type].replace(/^\S+\s/, '') ? `<h2>${esc(s.h)}</h2>` : ''}${s.p ? `<p class="ix-p">${rich(s.p)}</p>` : ''}`;
  }
  function fb() { return '<div class="ix-fb" aria-live="polite"></div>'; }

  function ixHtml(s, n) {
    const seed = n * 31 + 11;
    switch (s.type) {
      case 'quiz':
        return `<div class="slide ix ix-quiz" data-ix="quiz" data-c="${s.c || 0}">${ixHead(s)}
          <div class="ix-q">${rich(s.q || '')}</div>
          <div class="ix-opts">${shuffled(s.a, seed).map(k => `<button class="ix-opt" data-k="${k}">${rich(s.a[k])}</button>`).join('')}</div>
          ${fb()}<div class="ix-why" hidden>${rich(s.why || '')}</div></div>`;
      case 'tf':
        return `<div class="slide ix ix-tf" data-ix="tf">${ixHead(s)}
          <div class="tf-list">${s.items.map((it, k) => `<div class="tf-item" data-k="${k}" data-v="${it[1] ? 1 : 0}">
            <div class="tf-text">${rich(it[0])}</div>
            <div class="tf-btns"><button class="tf-b" data-v="1">✅ Правда</button><button class="tf-b" data-v="0">❌ Міф</button></div>
            <div class="tf-why" hidden>${rich(it[2] || '')}</div></div>`).join('')}</div>${fb()}</div>`;
      case 'flip':
        return `<div class="slide ix ix-flip" data-ix="flip">${ixHead(s)}
          <div class="flip-grid">${s.cards.map(c => `<button class="flip-card"><span class="flip-in"><span class="flip-f">${rich(c[0])}</span><span class="flip-b">${rich(c[1])}</span></span></button>`).join('')}</div>
          <div class="ix-hint">Натисни на картку, щоб перевернути</div></div>`;
      case 'input': {
        const items = s.items || [{ q: s.q, ans: s.ans, unit: s.unit }];
        return `<div class="slide ix ix-input" data-ix="input">${ixHead(s)}
          <div class="in-list">${items.map((it, k) => `<label class="in-row" data-k="${k}" data-ans="${esc(JSON.stringify(it.ans))}">
            <span class="in-q">${rich(it.q)}</span>
            <span class="in-box"><input type="text" inputmode="text" autocomplete="off" spellcheck="false"><span class="in-unit">${esc(it.unit || '')}</span></span></label>`).join('')}</div>
          <div class="ix-actions"><button class="ix-check">Перевірити</button><button class="ix-show" hidden>Показати відповідь</button></div>
          ${fb()}<div class="ix-why" hidden>${rich(s.why || '')}</div></div>`;
      }
      case 'match': {
        const ord = shuffled(s.pairs, seed);
        return `<div class="slide ix ix-match" data-ix="match">${ixHead(s)}
          <div class="m-grid">${s.pairs.map((p, k) => `<div class="m-row"><div class="m-left">${rich(p[0])}</div><div class="m-slot" data-drop data-k="${k}"></div></div>`).join('')}</div>
          <div class="chip-bank" data-drop data-bank>${ord.map(k => `<div class="chip" data-chip data-k="${k}">${rich(s.pairs[k][1])}</div>`).join('')}</div>
          <div class="ix-actions"><button class="ix-check">Перевірити</button><button class="ix-reset">Скинути</button></div>${fb()}</div>`;
      }
      case 'order': {
        const ord = shuffled(s.items, seed);
        return `<div class="slide ix ix-order" data-ix="order">${ixHead(s)}
          <ol class="o-list">${ord.map(k => `<li class="o-item" data-chip data-drop data-k="${k}"><span class="o-txt">${rich(s.items[k])}</span>
            <span class="o-arrows"><button class="o-up" aria-label="Вгору">▲</button><button class="o-down" aria-label="Вниз">▼</button></span></li>`).join('')}</ol>
          <div class="ix-actions"><button class="ix-check">Перевірити</button></div>${fb()}</div>`;
      }
      case 'group': {
        const all = []; s.groups.forEach((g, gi) => g[1].forEach(t => all.push([t, gi])));
        const ord = shuffled(all, seed);
        return `<div class="slide ix ix-group" data-ix="group">${ixHead(s)}
          <div class="g-boxes" style="--n:${s.groups.length}">${s.groups.map((g, gi) => `<div class="g-box" data-drop data-g="${gi}"><div class="g-name">${rich(g[0])}</div><div class="g-items"></div></div>`).join('')}</div>
          <div class="chip-bank" data-drop data-bank>${ord.map(k => `<div class="chip" data-chip data-g="${all[k][1]}">${rich(all[k][0])}</div>`).join('')}</div>
          <div class="ix-actions"><button class="ix-check">Перевірити</button><button class="ix-reset">Скинути</button></div>${fb()}</div>`;
      }
    }
    return '';
  }

  function slideHtml(s, lesson, n) {
    if (IX_TYPES.includes(s.type) || s.type === 'flip') return ixHtml(s, n);
    if (T_RENDER[s.type]) return T_RENDER[s.type](s);
    const side = s.e ? `<div class="side-emoji">${s.e}</div>` : '';
    const p = s.p ? `<p>${rich(s.p)}</p>` : '';
    const list = s.list ? `<ul class="s-list">${s.list.map(x => `<li>${rich(x)}</li>`).join('')}</ul>` : '';
    const steps = s.steps ? `<ol class="s-steps">${s.steps.map(x => `<li><span>${rich(x)}</span></li>`).join('')}</ol>` : '';
    const code = s.code ? `<pre class="s-code">${esc(s.code)}</pre>` : '';
    const cards = s.cards ? `<div class="s-cards">${s.cards.map(c => `<div class="s-card"><b>${c[0]}</b>${esc(c[1])}${c[2] ? `<small>${esc(c[2])}</small>` : ''}</div>`).join('')}</div>` : '';
    const after = s.after ? `<p class="s-after">${rich(s.after)}</p>` : '';
    switch (s.type) {
      case 'cover':
        return `<div class="slide s-cover"><div class="badge">${esc(s.badge || '')}</div><div class="cover-emoji">${s.e || '📘'}</div><h2>${esc(s.h)}</h2>${p}</div>`;
      case 'def':
        return `<div class="slide s-def"><div class="s-row"><div><div class="s-label">Запам’ятай</div><h2>${esc(s.h)}</h2><div class="def-box">${rich(s.p)}</div>${list}</div>${side}</div></div>`;
      case 'fact':
        return `<div class="slide s-fact"><div class="s-row"><div><div class="s-label">💡 Цікаво</div><h2>${esc(s.h || 'А чи знаєш ти?')}</h2>${p}${list}</div>${side || '<div class="side-emoji">💡</div>'}</div></div>`;
      case 'think':
        return `<div class="slide s-think"><div class="s-row"><div><div class="s-label">🤔 Подумай</div><h2>${esc(s.h)}</h2>${p}${list}
          ${s.ans ? `<button class="reveal-btn" data-reveal>Показати відповідь</button><div class="reveal-ans" hidden>${rich(s.ans)}</div>` : ''}</div>${side || '<div class="side-emoji">🤔</div>'}</div></div>`;
      case 'words':
        return `<div class="slide s-title" style="text-align:center;align-items:center"><div class="s-label">📖 Словничок</div><h2>${esc(s.h || 'Нові слова уроку')}</h2>
          <div class="words">${(s.words || []).map(w => `<span>${esc(w)}</span>`).join('')}</div>${p}</div>`;
      case 'example':
        return `<div class="slide s-example"><div class="s-label">🧩 Розв’язуємо разом</div><h2>${esc(s.h)}</h2>${p}
          ${(s.steps || []).length ? `<ol class="ex-steps">${s.steps.map((x, k) => `<li${k ? ' hidden' : ''}><span>${rich(x)}</span></li>`).join('')}</ol>${s.steps.length > 1 ? '<button class="reveal-btn" data-next-step>Наступний крок →</button>' : ''}` : ''}
          ${code}${s.ans ? `<div class="ex-ans" hidden>✅ ${rich(s.ans)}</div>` : ''}</div>`;
      default:
        return `<div class="slide"><div class="s-row"><div><h2>${esc(s.h)}</h2>${p}${code}${list}${steps}${cards}${after}</div>${s.cards ? '' : side}</div></div>`;
    }
  }


  /* ---------- анімовані слайди з теорією (шар THEORY) ----------
     Кожен елемент з класом .an з’являється по черзі (--d — порядковий номер).
     s.say — пояснення «від учителя» (показується в бульбашці й може озвучуватися). */
  function rt(s) { /* rich + індекси/степені: x^{2}, v_{0}, ==виділення== */
    return String(s == null ? '' : s).split('`').map((p, i) => i % 2 ? `<code class="t-code">${esc(p)}</code>` : rich(p).replace(/\^\{(.+?)\}/g, '<sup>$1</sup>').replace(/_\{(.+?)\}/g, '<sub>$1</sub>').replace(/==(.+?)==/g, '<mark>$1</mark>')).join('');
  }
  function T_TYPES_has(t) { return /^t[a-z]+$/.test(t || '') && T_RENDER[t]; }
  const sayBox = s => s.say ? `<div class="t-say an" style="--d:${s._n || 6}"><span class="t-say-ava">🧑‍🏫</span><span class="t-say-txt">${rt(s.say)}</span></div>` : '';
  const tHead = (s, label) => `<div class="t-top"><div class="s-label an" style="--d:0">${label}</div><button class="t-replay" title="Повторити анімацію" aria-label="Повторити анімацію">↻</button></div>${s.h ? `<h2 class="an" style="--d:0">${rt(s.h)}</h2>` : ''}`;
  const T_RENDER = {
    tx(s) { /* пояснення: вступ, пункти, примітка */
      let d = 1;
      const lead = [].concat(s.lead || []).map(x => `<p class="t-lead an" style="--d:${d++}">${rt(x)}</p>`).join('');
      const pts = (s.pts || []).map(x => `<li class="an" style="--d:${d++}">${rt(x)}</li>`).join('');
      const note = s.note ? `<div class="t-note an" style="--d:${d++}">💡 ${rt(s.note)}</div>` : '';
      s._n = d;
      return `<div class="slide t-slide t-tx">${tHead(s, s.label || '📘 Теорія')}<div class="t-row"><div class="t-main">${lead}${pts ? `<ul class="t-pts">${pts}</ul>` : ''}${note}</div>${s.e ? `<div class="t-emoji an" style="--d:1">${esc(s.e)}</div>` : ''}</div>${sayBox(s)}</div>`;
    },
    tdef(s) { /* термін і визначення */
      let d = 2; const ex = (s.ex || []).map(x => `<span class="an" style="--d:${d++}">${rt(x)}</span>`).join('');
      s._n = d + 1;
      return `<div class="slide t-slide t-def">${tHead(Object.assign({}, s, { h: '' }), s.label || '📌 Запам’ятай')}
        <div class="t-term an" style="--d:0">${s.e ? `<span class="t-term-e">${esc(s.e)}</span>` : ''}${rt(s.term)}</div>
        <div class="t-defbox an" style="--d:1">${rt(s.def)}</div>${ex ? `<div class="t-ex"><b class="an" style="--d:2">Приклади:</b>${ex}</div>` : ''}${s.note ? `<div class="t-note an" style="--d:${d}">💡 ${rt(s.note)}</div>` : ''}${sayBox(s)}</div>`;
    },
    tflow(s) { /* процес / ланцюжок */
      const n = (s.items || []).length;
      s._n = n * 2 + 2;
      return `<div class="slide t-slide t-flow ${s.cycle ? 'cyc' : ''}">${tHead(s, s.label || '🔄 Як це відбувається')}${s.lead ? `<p class="t-lead an" style="--d:1">${rt(s.lead)}</p>` : ''}
        <div class="t-chain" style="--n:${n}">${s.items.map((it, k) => `${k ? `<span class="t-arrow an" style="--d:${k * 2 + 1}"></span>` : ''}<div class="t-node an" style="--d:${k * 2 + 2}"><span class="t-node-e">${esc(it[0])}</span><b>${rt(it[1])}</b>${it[2] ? `<small>${rt(it[2])}</small>` : ''}</div>`).join('')}</div>
        ${s.note ? `<div class="t-note an" style="--d:${n * 2 + 1}">💡 ${rt(s.note)}</div>` : ''}${sayBox(s)}</div>`;
    },
    tcmp(s) { /* порівняння */
      let d = 1;
      const cols = s.cols.map((c, k) => { const st = d++; return `<div class="t-col an ${k % 2 ? 'from-r' : 'from-l'}" style="--d:${st}"><div class="t-col-h">${c[1] ? `<span>${esc(c[1])}</span>` : ''}${rt(c[0])}</div><ul>${(c[2] || []).map(x => `<li class="an" style="--d:${d++}">${rt(x)}</li>`).join('')}</ul></div>`; }).join('');
      s._n = d + 1;
      return `<div class="slide t-slide t-cmp">${tHead(s, s.label || '⚖️ Порівняємо')}<div class="t-cols" style="--n:${s.cols.length}">${cols}</div>${s.note ? `<div class="t-note an" style="--d:${d}">💡 ${rt(s.note)}</div>` : ''}${sayBox(s)}</div>`;
    },
    tsteps(s) { /* розв’язування крок за кроком */
      let d = 2; const st = (s.steps || []).map((x, k) => `<li class="an" style="--d:${d++}"><i>${k + 1}</i><span>${rt(x)}</span></li>`).join('');
      s._n = d + 1;
      return `<div class="slide t-slide t-steps">${tHead(s, s.label || '🧩 Розв’язуємо разом')}${s.task ? `<div class="t-task an" style="--d:1">${rt(s.task)}</div>` : ''}<ol class="t-stl">${st}</ol>${s.ans ? `<div class="t-ans an" style="--d:${d}">✅ ${rt(s.ans)}</div>` : ''}${sayBox(s)}</div>`;
    },
    tformula(s) { /* формула з розшифруванням */
      let d = 2; const parts = (s.parts || []).map(x => `<div class="t-fp an" style="--d:${d++}"><b>${rt(x[0])}</b><span>${rt(x[1])}</span>${x[2] ? `<em>${rt(x[2])}</em>` : ''}</div>`).join('');
      s._n = d + 1;
      return `<div class="slide t-slide t-formula">${tHead(s, s.label || '🧮 Формула')}${s.lead ? `<p class="t-lead an" style="--d:1">${rt(s.lead)}</p>` : ''}<div class="t-f an" style="--d:1">${rt(s.f)}</div><div class="t-fparts">${parts}</div>${s.note ? `<div class="t-note an" style="--d:${d}">💡 ${rt(s.note)}</div>` : ''}${sayBox(s)}</div>`;
    },
    tgrid(s) { /* картки-категорії */
      let d = 1; const it = (s.items || []).map(x => `<div class="t-card an" style="--d:${d++}"><span class="t-card-e">${esc(x[0])}</span><b>${rt(x[1])}</b>${x[2] ? `<small>${rt(x[2])}</small>` : ''}</div>`).join('');
      s._n = d + 1;
      return `<div class="slide t-slide t-grid">${tHead(s, s.label || '🗂 Розглянемо')}${s.lead ? `<p class="t-lead an" style="--d:1">${rt(s.lead)}</p>` : ''}<div class="t-cards" style="--n:${Math.min((s.items || []).length, 4)}">${it}</div>${s.note ? `<div class="t-note an" style="--d:${d}">💡 ${rt(s.note)}</div>` : ''}${sayBox(s)}</div>`;
    },
    ttime(s) { /* часова стрічка */
      let d = 1; const it = (s.items || []).map(x => `<div class="t-tl an" style="--d:${d++}"><b>${rt(x[0])}</b><span>${rt(x[1])}</span></div>`).join('');
      s._n = d + 1;
      return `<div class="slide t-slide t-time">${tHead(s, s.label || '🕰 Історія')}<div class="t-line"><i class="an" style="--d:1"></i>${it}</div>${s.note ? `<div class="t-note an" style="--d:${d}">💡 ${rt(s.note)}</div>` : ''}${sayBox(s)}</div>`;
    },
    thw(s) { /* творче домашнє завдання */
      let d = 2; const ps = (s.p || []).map(x => `<p class="t-lead an" style="--d:${d++}">${rt(x)}</p>`).join('');
      const st = (s.steps || []).map((x, k) => `<li class="an" style="--d:${d++}"><i>${k + 1}</i><span>${rt(x)}</span></li>`).join('');
      s._n = d + 1;
      return `<div class="slide t-slide t-steps t-hw">${tHead(Object.assign({}, s, { h: (s.e || '🏠') + ' ' + (s.t || '') }), '🏠 Домашнє завдання (творче)')}${ps}${st ? `<ol class="t-stl">${st}</ol>` : ''}</div>`;
    },
    tmap(s) { /* карта знань: центр і гілки */
      const n = (s.items || []).length; let d = 2;
      const it = s.items.map((x, k) => { const a = ((k / n) * 360 - 90) * Math.PI / 180; return `<div class="t-br an" style="--d:${d++};--x:${(Math.cos(a) * 36).toFixed(1)}%;--y:${(Math.sin(a) * 39).toFixed(1)}%"><span>${esc(x[0])}</span><b>${rt(x[1])}</b>${x[2] ? `<small>${rt(x[2])}</small>` : ''}</div>`; }).join('');
      s._n = d + 1;
      return `<div class="slide t-slide t-map">${tHead(s, s.label || '🧠 Карта знань')}<div class="t-mapbox" style="--n:${n}"><div class="t-center an" style="--d:1">${s.e ? `<span>${esc(s.e)}</span>` : ''}${rt(s.center)}</div>${it}</div>${s.note ? `<div class="t-note an" style="--d:${d}">💡 ${rt(s.note)}</div>` : ''}${sayBox(s)}</div>`;
    }
  };

  /* ---------- нормалізація відповіді для «Впиши відповідь» ---------- */
  function norm(v) {
    return String(v).toLowerCase().replace(/[’'`ʼ]/g, '’').replace(/\s+/g, '').replace(/,/g, '.').replace(/[−–—]/g, '-').replace(/ё/g, 'е');
  }

  /* ---------- перетягування: миша, палець, а також натискання ---------- */
  function setupDrag(slide, onDrop) {
    let drag = null, picked = null;
    function pick(el) { if (picked) picked.classList.remove('picked'); picked = el; if (el) el.classList.add('picked'); }
    slide.addEventListener('pointerdown', e => {
      const chip = e.target.closest('[data-chip]');
      if (!chip || e.target.closest('button')) return;
      drag = { chip, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    });
    slide.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      if (!drag.moved) { drag.moved = true; drag.chip.classList.add('dragging'); try { drag.chip.setPointerCapture(e.pointerId); } catch (_) {} }
      drag.chip.style.transform = `translate(${dx}px, ${dy}px)`;
      e.preventDefault();
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (!d.moved) { pick(picked === d.chip ? null : d.chip); return; }
      d.chip.classList.remove('dragging'); d.chip.style.transform = '';
      d.chip.style.visibility = 'hidden';
      const under = document.elementFromPoint(e.clientX, e.clientY);
      d.chip.style.visibility = '';
      const zone = under && under.closest('[data-drop]');
      if (zone && slide.contains(zone)) onDrop(d.chip, zone, e);
      pick(null);
    }
    slide.addEventListener('pointerup', end);
    slide.addEventListener('pointercancel', e => { if (drag) { drag.chip.classList.remove('dragging'); drag.chip.style.transform = ''; drag = null; } });
    slide.addEventListener('click', e => {
      if (!picked) return;
      const zone = e.target.closest('[data-drop]');
      if (zone && !e.target.closest('[data-chip]')) { onDrop(picked, zone, null); pick(null); }
    });
  }

  function setFb(slide, ok, text) {
    const f = slide.querySelector('.ix-fb');
    if (!f) return;
    f.className = 'ix-fb ' + (ok ? 'ok' : 'bad');
    f.innerHTML = text;
  }

  /* ---------- логіка інтерактивів ---------- */
  function initIx(slide, score) {
    const type = slide.dataset.ix;
    const done = ok => { if (!slide.dataset.done) { slide.dataset.done = ok ? '1' : '0'; score(ok); } };

    if (type === 'quiz') {
      const c = +slide.dataset.c;
      slide.addEventListener('click', e => {
        const b = e.target.closest('.ix-opt'); if (!b || slide.dataset.solved) return;
        const ok = +b.dataset.k === c;
        b.classList.add(ok ? 'ok' : 'bad');
        done(ok);
        if (ok) {
          slide.dataset.solved = 1;
          slide.querySelectorAll('.ix-opt').forEach(x => x.disabled = true);
          setFb(slide, true, slide.dataset.done === '1' ? '🎉 Правильно, з першої спроби!' : '✅ Правильно!');
          const w = slide.querySelector('.ix-why'); if (w && w.textContent.trim()) w.hidden = false;
        } else { b.disabled = true; setFb(slide, false, '🙃 Не зовсім. Спробуй ще раз!'); }
      });
    }

    if (type === 'tf') {
      const items = [...slide.querySelectorAll('.tf-item')];
      let right = 0, answered = 0;
      slide.addEventListener('click', e => {
        const b = e.target.closest('.tf-b'); if (!b) return;
        const it = b.closest('.tf-item'); if (it.dataset.ans) return;
        const ok = b.dataset.v === it.dataset.v;
        it.dataset.ans = 1; answered++; if (ok) right++;
        it.classList.add(ok ? 'ok' : 'bad');
        b.classList.add('chosen');
        it.querySelectorAll('.tf-b').forEach(x => x.disabled = true);
        const w = it.querySelector('.tf-why');
        w.innerHTML = (it.dataset.v === '1' ? '<b>Правда.</b> ' : '<b>Міф.</b> ') + w.innerHTML; w.hidden = false;
        if (answered === items.length) { done(right === items.length); setFb(slide, right === items.length, `Результат: ${right} з ${items.length} ${right === items.length ? '🎉' : '👍'}`); }
      });
    }

    if (type === 'flip') {
      slide.addEventListener('click', e => { const c = e.target.closest('.flip-card'); if (c) c.classList.toggle('flipped'); });
    }

    if (type === 'input') {
      const rows = [...slide.querySelectorAll('.in-row')];
      let tries = 0;
      const check = () => {
        tries++;
        let right = 0;
        rows.forEach(r => {
          const inp = r.querySelector('input');
          const acc = JSON.parse(r.dataset.ans).map(norm);
          const ok = inp.value.trim() !== '' && acc.includes(norm(inp.value));
          r.classList.toggle('ok', ok); r.classList.toggle('bad', !ok);
          if (ok) { right++; inp.readOnly = true; }
        });
        const all = right === rows.length;
        if (all || tries >= 2) done(all && tries === 1);
        if (all) {
          setFb(slide, true, tries === 1 ? '🎉 Усе правильно!' : '✅ Тепер правильно!');
          slide.querySelector('.ix-check').hidden = true; slide.querySelector('.ix-show').hidden = true;
          const w = slide.querySelector('.ix-why'); if (w && w.textContent.trim()) w.hidden = false;
        } else {
          setFb(slide, false, `Правильно: ${right} з ${rows.length}. Перевір виділені поля.`);
          if (tries >= 2) slide.querySelector('.ix-show').hidden = false;
        }
      };
      slide.querySelector('.ix-check').onclick = check;
      slide.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); check(); } });
      slide.querySelector('.ix-show').onclick = () => {
        rows.forEach(r => { const inp = r.querySelector('input'); if (!r.classList.contains('ok')) { inp.value = JSON.parse(r.dataset.ans)[0]; inp.readOnly = true; r.classList.remove('bad'); r.classList.add('shown'); } });
        slide.querySelector('.ix-show').hidden = true; slide.querySelector('.ix-check').hidden = true;
        setFb(slide, false, 'Ось правильні відповіді. Розберися, де була помилка.');
        const w = slide.querySelector('.ix-why'); if (w && w.textContent.trim()) w.hidden = false;
      };
    }

    if (type === 'match' || type === 'group') {
      const bank = slide.querySelector('[data-bank]');
      const chips = [...slide.querySelectorAll('[data-chip]')];
      setupDrag(slide, (chip, zone) => {
        slide.querySelectorAll('.chip').forEach(c => c.classList.remove('ok', 'bad'));
        if (type === 'match' && zone.matches('.m-slot')) {
          const old = zone.querySelector('[data-chip]'); if (old && old !== chip) bank.appendChild(old);
          zone.appendChild(chip);
        } else if (type === 'group' && zone.matches('.g-box')) zone.querySelector('.g-items').appendChild(chip);
        else if (zone.matches('[data-bank]')) bank.appendChild(chip);
        else if (zone.closest('.m-slot')) { const sl = zone.closest('.m-slot'); const old = sl.querySelector('[data-chip]'); if (old && old !== chip) bank.appendChild(old); sl.appendChild(chip); }
        else if (zone.closest('.g-box')) zone.closest('.g-box').querySelector('.g-items').appendChild(chip);
        slide.querySelector('.ix-fb').textContent = '';
      });
      slide.querySelector('.ix-check').onclick = () => {
        if (bank.querySelector('[data-chip]')) { setFb(slide, false, 'Спершу розмісти всі картки 🙂'); return; }
        let right = 0;
        chips.forEach(c => {
          const ok = type === 'match' ? c.parentElement.dataset.k === c.dataset.k : c.closest('.g-box').dataset.g === c.dataset.g;
          c.classList.toggle('ok', ok); c.classList.toggle('bad', !ok); if (ok) right++;
        });
        const all = right === chips.length;
        done(all);
        setFb(slide, all, all ? '🎉 Чудово, усе правильно!' : `Правильно: ${right} з ${chips.length}. Перетягни червоні картки в інші місця.`);
      };
      slide.querySelector('.ix-reset').onclick = () => { chips.forEach(c => { c.classList.remove('ok', 'bad'); bank.appendChild(c); }); slide.querySelector('.ix-fb').textContent = ''; };
    }

    if (type === 'order') {
      const list = slide.querySelector('.o-list');
      const clear = () => { list.querySelectorAll('.o-item').forEach(x => x.classList.remove('ok', 'bad')); slide.querySelector('.ix-fb').textContent = ''; };
      setupDrag(slide, (chip, zone, e) => {
        const target = zone.closest('.o-item'); if (!target || target === chip) return;
        const r = target.getBoundingClientRect();
        const after = e && e.clientY ? e.clientY > r.top + r.height / 2 : [...list.children].indexOf(chip) < [...list.children].indexOf(target);
        list.insertBefore(chip, after ? target.nextSibling : target);
        clear();
      });
      slide.addEventListener('click', e => {
        const up = e.target.closest('.o-up'), dn = e.target.closest('.o-down');
        if (!up && !dn) return;
        const li = e.target.closest('.o-item');
        if (up && li.previousElementSibling) list.insertBefore(li, li.previousElementSibling);
        if (dn && li.nextElementSibling) list.insertBefore(li.nextElementSibling, li);
        clear();
      });
      slide.querySelector('.ix-check').onclick = () => {
        const items = [...list.children]; let right = 0;
        items.forEach((li, k) => { const ok = +li.dataset.k === k; li.classList.toggle('ok', ok); li.classList.toggle('bad', !ok); if (ok) right++; });
        const all = right === items.length;
        done(all);
        setFb(slide, all, all ? '🎉 Правильний порядок!' : `На своїх місцях: ${right} з ${items.length}. Поміняй червоні кроки.`);
      };
    }
  }

  function run(root, lesson, opts) {
    const slides = lesson.slides || [];
    const ixCount = slides.filter(s => IX_TYPES.includes(s.type)).length;
    let i = 0, ixDone = 0, ixRight = 0;
    root.innerHTML = `
      <div class="crumbs">${opts.crumbs || ''}</div>
      <div class="page-head"><div><h1 style="font-size:clamp(22px,3vw,30px)">${esc(lesson.emoji || '')} ${esc(lesson.title)}</h1>
        <p>Презентація · ${slides.length} слайдів${ixCount ? ` · ${ixCount} інтерактивних завдань` : ''}${lesson.pages ? ' · підручник, ' + esc(/^\d/.test(lesson.pages) ? 'с. ' + lesson.pages : lesson.pages) : ''}</p></div>
        <div class="head-right">${ixCount ? `<span class="ix-score" id="ixScore" title="Інтерактивні завдання, виконані з першої спроби">⭐ 0 / ${ixCount}</span>` : ''}<a class="btn brand" href="${opts.testHref}">📝 Пройти тест</a></div></div>
      <div class="slides-shell">
        <div class="slide-stage" id="stage" style="--c:${opts.color}" tabindex="0">${slides.map((s, n) => slideHtml(s, lesson, n)).join('')}</div>
        <div class="slide-ctrl">
          <button class="btn light" id="sPrev">←</button>
          <div class="slide-progress"><i id="sBar"></i></div>
          <span class="count" id="sCount"></span>
          <button class="btn light" id="sNext">→</button>
          <button class="btn light" id="sFull" title="На весь екран">⛶</button>
        </div>
        ${opts.source || ''}
      </div>`;
    const stage = root.querySelector('#stage');
    if (ixCount) stage.insertAdjacentHTML('beforeend', `<div class="slide s-summary"><div class="s-label">🏁 Підсумок</div><h2>Як ти впорався з завданнями?</h2>
      <div class="sum-big" id="sumBig"></div><p id="sumText"></p><a class="btn brand sum-btn" href="${opts.testHref}">📝 Перевір себе в тесті</a></div>`);
    if (opts.sourceText) stage.insertAdjacentHTML('beforeend', `<div class="slide s-source"><div class="s-label">📚 Джерело інформації</div><h2>Матеріал підготовлено за підручником</h2><p class="src-text">${opts.sourceText}</p></div>`);
    const els = [...stage.querySelectorAll('.slide')];
    els.forEach(el => el.style.setProperty('--c', opts.color));

    function updateScore() {
      const sc = root.querySelector('#ixScore'); if (sc) sc.textContent = `⭐ ${ixRight} / ${ixCount}`;
      const big = root.querySelector('#sumBig'); if (!big) return;
      big.textContent = `${ixRight} / ${ixCount}`;
      const pct = ixCount ? ixRight / ixCount : 0;
      root.querySelector('#sumText').textContent = ixDone < ixCount
        ? `Виконано ${ixDone} з ${ixCount} завдань. Повернись до пропущених — вони допоможуть у тесті!`
        : pct === 1 ? 'Неймовірно! Усі завдання з першої спроби 🏆' : pct >= .6 ? 'Добрий результат! Перед тестом переглянь слайди з помилками 💪' : 'Варто ще раз переглянути матеріал уроку — ти впораєшся! 📚';
    }
    els.forEach(el => { if (el.dataset.ix) initIx(el, ok => { ixDone++; if (ok) ixRight++; updateScore(); }); });
    updateScore();

    function show(k) {
      i = Math.max(0, Math.min(els.length - 1, k));
      els.forEach((el, j) => { el.classList.toggle('on', j === i); el.classList.toggle('prev', j < i); });
      if (window.speechSynthesis) speechSynthesis.cancel();
      replay(els[i]);
      root.querySelector('#sCount').textContent = (i + 1) + ' / ' + els.length;
      root.querySelector('#sBar').style.width = ((i + 1) / els.length * 100) + '%';
      root.querySelector('#sPrev').disabled = i === 0;
      root.querySelector('#sNext').disabled = i === els.length - 1;
      if (i === els.length - 1 && opts.onEnd) opts.onEnd();
    }
    root.querySelector('#sPrev').onclick = () => show(i - 1);
    root.querySelector('#sNext').onclick = () => show(i + 1);
    root.querySelector('#sFull').onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {});
    };
    function replay(el) { if (!el || !el.classList.contains('t-slide')) return; el.classList.remove('anim'); void el.offsetWidth; el.classList.add('anim'); }
    function speak(el) {
      if (!window.speechSynthesis) return;
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
      const txt = [...el.querySelectorAll('h2, .t-term, .t-defbox, .t-lead, .t-pts li, .t-node b, .t-node small, .t-col-h, .t-col li, .t-task, .t-stl li span, .t-ans, .t-fp, .t-card b, .t-card small, .t-tl, .t-center, .t-br, .t-note, .t-say-txt')].map(x => x.textContent.replace(/[💡✅]/g, '').trim()).filter(Boolean).join('. ');
      const u = new SpeechSynthesisUtterance(txt); u.lang = 'uk-UA'; u.rate = 0.95;
      const v = speechSynthesis.getVoices().find(v => /^uk/i.test(v.lang)); if (v) u.voice = v;
      speechSynthesis.speak(u);
    }
    stage.addEventListener('click', e => {
      const rp = e.target.closest('.t-replay'); if (rp) { replay(rp.closest('.slide')); return; }
      const sp = e.target.closest('.t-speak'); if (sp) { speak(sp.closest('.slide')); return; }
      const r = e.target.closest('[data-reveal]');
      if (r) { r.nextElementSibling.hidden = false; r.remove(); return; }
      const ns = e.target.closest('[data-next-step]');
      if (ns) {
        const sl = ns.closest('.slide');
        const next = sl.querySelector('.ex-steps li[hidden]');
        if (next) next.hidden = false;
        if (!sl.querySelector('.ex-steps li[hidden]')) { ns.remove(); const a = sl.querySelector('.ex-ans'); if (a) a.hidden = false; }
      }
    });
    function key(e) {
      if (e.target.closest && e.target.closest('input, textarea, button')) { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' || e.target.matches('input, textarea')) return; }
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); show(i + 1); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); show(i - 1); }
    }
    document.addEventListener('keydown', key);
    let sx = null;
    stage.addEventListener('touchstart', e => { sx = e.target.closest('[data-chip], .ix-actions, input, .flip-card') ? null : e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 60) show(i + (dx < 0 ? 1 : -1));
    });
    show(0);
    return { destroy() { if (window.speechSynthesis) speechSynthesis.cancel(); document.removeEventListener('keydown', key); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } };
  }

  /* Доповнення уроків: файли data/courses/<курс>/xN.js додають слайди в наявні уроки.
     window.EXT[курс][урок] = [ { at: n, ...слайд }, ... ] — вставити після n-го (з 1) слайда оригіналу;
     без at — перед словничком (або в кінець). */
  function applyExt(course) {
    const ext = (window.EXT || {})[course.id]; if (!ext) return;
    course.sections.forEach(sec => sec.lessons.forEach(l => {
      const add = ext[l.id]; if (!add || l._ext) return;
      const orig = l.slides; const wi = orig.findIndex(x => x.type === 'words');
      const def = wi >= 0 ? wi : orig.length;
      const out = [];
      for (let k = 0; k <= orig.length; k++) {
        add.filter(x => (x.at == null ? def : x.at) === k).forEach(x => out.push(x));
        if (k < orig.length) out.push(orig[k]);
      }
      l.slides = out; l._ext = true; l.v = 2;
    }));
  }


  /* Теорія: data/courses/<курс>/t<розділ>.js → window.THEORY[курс][урок] = [слайди].
     Нові анімовані слайди стають основою презентації: обкладинка → теорія,
     між якою рівномірно розставлено інтерактивні завдання → словничок.
     Старі статичні слайди (звичайні, «Запам’ятай», «Цікаво») замінюються теорією. */
  function applyTheory(course) {
    const th = (window.THEORY || {})[course.id]; if (!th) return;
    course.sections.forEach(sec => sec.lessons.forEach(l => {
      const add = th[l.id]; if (!add || !add.length || l._th) return;
      const cur = l.slides || [];
      const cover = cur.filter(x => x.type === 'cover');
      const words = cur.filter(x => x.type === 'words');
      const keep = cur.filter(x => x.type && x.type !== 'cover' && x.type !== 'words' && x.type !== 'def' && x.type !== 'fact' && !T_RENDER[x.type]);
      const out = cover.slice();
      const gap = Math.max(1, Math.round(add.length / Math.max(1, keep.length)));
      let ki = 0;
      add.forEach((t, k) => {
        out.push(t);
        if ((k + 1) % gap === 0 && ki < keep.length && k >= 1) out.push(keep[ki++]);
      });
      while (ki < keep.length) out.push(keep[ki++]);
      l.slides = out.concat(words); l._th = true;
    }));
  }

  /* План і творче д/з: data/courses/<курс>/p<розділ>.js → window.PLANS[курс][урок] = { plan, hw }.
     Домашнє завдання стає останнім слайдом презентації. */
  function applyPlans(course) {
    const pl = (window.PLANS || {})[course.id]; if (!pl) return;
    course.sections.forEach(sec => sec.lessons.forEach(l => {
      const x = pl[l.id]; if (!x || !x.hw || l._hw) return;
      l.slides = (l.slides || []).concat([Object.assign({ type: 'thw' }, x.hw)]); l._hw = true;
    }));
  }
  window.Slides = { run, applyExt, applyTheory, applyPlans };
})();
