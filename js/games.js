/* Інтерактивні ігри до уроків (для молодших класів).
   Дані: window.GAMES[курс][урок] = [гра, гра, гра] — файли data/courses/<курс>/gN.js (поле games курсу).
   Типи ігор:
     memory — «Знайди пару»:     { type:'memory', h, pairs:[[a, b], …] }
     word   — «Склади слово»:    { type:'word', h, words:[[СЛОВО, підказка], …] }
     catch  — «Лови правильне»:  { type:'catch', h, q, good:[…], bad:[…], goal }
     odd    — «Знайди зайве»:    { type:'odd', h, rounds:[[[4 варіанти], індекс зайвого, пояснення], …] }
     speed  — «Так чи ні»:       { type:'speed', h, items:[[твердження, true|false], …], seconds } */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pl = (n, a, b, c) => { const m = n % 100, k = n % 10; return n + ' ' + (m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const META = {
    memory: { icon: '🃏', name: 'Знайди пару', about: 'Відкривай картки й шукай пари, що пасують одна до одної.' },
    word: { icon: '🔤', name: 'Склади слово', about: 'Прочитай підказку й склади слово з літер.' },
    catch: { icon: '🎈', name: 'Лови правильне', about: 'Натискай лише на кульки з правильними словами.' },
    odd: { icon: '🔍', name: 'Знайди зайве', about: 'У кожному рядку одне слово зайве. Знайди його!' },
    speed: { icon: '⚡', name: 'Так чи ні?', about: 'Встигни відповісти на якомога більше тверджень.' }
  };

  /* короткі звуки без файлів */
  let actx = null;
  function beep(ok) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = ok ? 660 : 200;
      g.gain.setValueAtTime(0.08, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (ok ? 0.18 : 0.3));
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.3);
      if (ok) { const o2 = actx.createOscillator(), g2 = actx.createGain(); o2.frequency.value = 880; g2.gain.setValueAtTime(0.06, actx.currentTime + 0.1); g2.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.3); o2.connect(g2); g2.connect(actx.destination); o2.start(actx.currentTime + 0.1); o2.stop(actx.currentTime + 0.32); }
    } catch (e) { /* без звуку */ }
  }

  const starsHtml = n => '<span class="g-stars">' + [1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('') + '</span>';

  /* ---------- окремі ігри: кожна отримує stage і done(stars, text) ---------- */
  const PLAY = {
    memory(stage, g, done) {
      const pairs = g.pairs.slice(0, 6);
      const cards = shuffle(pairs.flatMap((p, i) => [{ i, t: p[0], side: 'a' }, { i, t: p[1], side: 'b' }]));
      let open = [], found = 0, moves = 0, lock = false;
      stage.innerHTML = `<div class="g-bar"><span>Ходів: <b id="gMv">0</b></span><span>Знайдено: <b id="gFd">0</b> / ${pairs.length}</span></div>
        <div class="mem-grid c${cards.length > 8 ? 4 : cards.length > 6 ? 4 : 3}">${cards.map((c, k) => `<button class="mem-card ${c.side}" data-k="${k}"><span class="mc-back">?</span><span class="mc-face">${esc(c.t)}</span></button>`).join('')}</div>`;
      stage.querySelectorAll('.mem-card').forEach(b => b.onclick = () => {
        if (lock || b.classList.contains('open')) return;
        b.classList.add('open'); open.push(b);
        if (open.length < 2) return;
        moves++; stage.querySelector('#gMv').textContent = moves;
        const [x, y] = open.map(e => cards[+e.dataset.k]);
        if (x.i === y.i) {
          beep(true); open.forEach(e => e.classList.add('found')); open = []; found++;
          stage.querySelector('#gFd').textContent = found;
          if (found === pairs.length) setTimeout(() => done(moves <= pairs.length + 2 ? 3 : moves <= pairs.length * 2 ? 2 : 1, `Усі пари знайдено за ${pl(moves, 'хід', 'ходи', 'ходів')}!`), 500);
        } else {
          beep(false); lock = true;
          open.forEach(e => e.classList.add('miss'));
          setTimeout(() => { open.forEach(e => e.classList.remove('open', 'miss')); open = []; lock = false; }, 950);
        }
      });
    },

    word(stage, g, done) {
      const words = g.words.slice(0, 4);
      let wi = 0, mistakes = 0, hints = 0;
      const isLetter = ch => /[\p{L}\p{N}]/u.test(ch);
      function show() {
        const W = words[wi][0].toUpperCase(), hint = words[wi][1];
        const letters = shuffle([...W].map((ch, i) => ({ ch, i })).filter(o => isLetter(o.ch)));
        const filled = {};   // позиція → індекс плитки
        stage.innerHTML = `<div class="g-bar"><span>Слово <b>${wi + 1}</b> з ${words.length}</span><button class="btn light sm" id="wHint">💡 Підказка</button></div>
          <div class="w-hint">${esc(hint)}</div>
          <div class="w-slots">${[...W].map((ch, i) => isLetter(ch) ? `<button class="w-slot" data-p="${i}"></button>` : `<span class="w-gap">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('')}</div>
          <div class="w-tiles">${letters.map((o, k) => `<button class="w-tile" data-t="${k}">${esc(o.ch)}</button>`).join('')}</div>`;
        const slots = [...stage.querySelectorAll('.w-slot')];
        const tiles = [...stage.querySelectorAll('.w-tile')];
        const nextFree = () => slots.find(s => !(s.dataset.p in filled));
        function check() {
          if (slots.some(s => !(s.dataset.p in filled))) return;
          const got = slots.map(s => letters[filled[s.dataset.p]].ch).join('');
          const need = slots.map(s => W[+s.dataset.p]).join('');
          if (got === need) {
            beep(true); slots.forEach(s => s.classList.add('ok'));
            setTimeout(() => { wi++; if (wi < words.length) show(); else done(mistakes + hints === 0 ? 3 : mistakes + hints <= 2 ? 2 : 1, `Складено ${pl(words.length, 'слово', 'слова', 'слів')}${hints ? ', підказок: ' + hints : ''}!`); }, 800);
          } else {
            beep(false); mistakes++;
            stage.querySelector('.w-slots').classList.add('shake');
            setTimeout(() => {
              const box = stage.querySelector('.w-slots'); if (box) box.classList.remove('shake');
              slots.forEach(s => { if (s.classList.contains('locked')) return; const t = filled[s.dataset.p]; if (t != null) { tiles[t].disabled = false; delete filled[s.dataset.p]; s.textContent = ''; } });
            }, 600);
          }
        }
        tiles.forEach(t => t.onclick = () => {
          const s = nextFree(); if (!s) return;
          filled[s.dataset.p] = +t.dataset.t; s.textContent = letters[+t.dataset.t].ch; t.disabled = true; check();
        });
        slots.forEach(s => s.onclick = () => {
          if (s.classList.contains('locked') || !(s.dataset.p in filled)) return;
          tiles[filled[s.dataset.p]].disabled = false; delete filled[s.dataset.p]; s.textContent = '';
        });
        stage.querySelector('#wHint').onclick = () => {
          const s = slots.find(x => !x.classList.contains('locked')); if (!s) return;
          const need = W[+s.dataset.p];
          if (s.dataset.p in filled) { tiles[filled[s.dataset.p]].disabled = false; delete filled[s.dataset.p]; }
          /* звільнити плитку з потрібною літерою, якщо її поставили не туди */
          let k = tiles.findIndex((t, j) => !t.disabled && letters[j].ch === need);
          if (k < 0) {
            const wrong = slots.find(x => !x.classList.contains('locked') && x.dataset.p in filled && letters[filled[x.dataset.p]].ch === need);
            if (wrong) { k = filled[wrong.dataset.p]; delete filled[wrong.dataset.p]; wrong.textContent = ''; }
          }
          if (k < 0) return;
          hints++; filled[s.dataset.p] = k; tiles[k].disabled = true; s.textContent = need; s.classList.add('locked'); check();
        };
      }
      show();
    },

    catch(stage, g, done) {
      const goal = g.goal || Math.min(8, g.good.length + 3);
      let caught = 0, hearts = 3, over = false, n = 0;
      stage.innerHTML = `<div class="c-q">${esc(g.q)}</div>
        <div class="g-bar"><span>Спіймано: <b id="cC">0</b> / ${goal}</span><span id="cH" class="c-hearts">❤️❤️❤️</span></div>
        <div class="c-sky" id="cSky"></div>`;
      const sky = stage.querySelector('#cSky');
      const colors = ['#FF7A59', '#FFB020', '#2BB673', '#14B8C4', '#3B82F6', '#A855F7', '#EC4899'];
      let goodBag = [], badBag = [];
      const take = (bag, src) => { if (!bag.length) bag.push(...shuffle(src)); return bag.pop(); };
      function spawn() {
        if (over) return;
        const good = Math.random() < 0.55;
        const text = good ? take(goodBag, g.good) : take(badBag, g.bad);
        const b = document.createElement('button');
        b.className = 'c-ball'; b.textContent = text;
        b.style.left = (5 + Math.random() * 62) + '%';
        b.style.background = colors[n++ % colors.length];
        b.style.animationDuration = (6.5 + Math.random() * 2) + 's';
        b.onclick = () => {
          if (over || b.classList.contains('hit')) return;
          b.classList.add('hit', good ? 'good' : 'bad');
          if (good) { beep(true); caught++; stage.querySelector('#cC').textContent = caught; }
          else { beep(false); hearts--; stage.querySelector('#cH').textContent = '❤️'.repeat(hearts) + '🤍'.repeat(3 - hearts); }
          setTimeout(() => b.remove(), 450);
          if (caught >= goal) finish(true); else if (hearts <= 0) finish(false);
        };
        b.addEventListener('animationend', () => b.remove());
        sky.appendChild(b);
      }
      function finish(win) {
        over = true; clearInterval(timer);
        setTimeout(() => done(win ? hearts : 0, win ? `Спіймано ${pl(caught, 'правильну кульку', 'правильні кульки', 'правильних кульок')}!` : 'Ой, закінчилися сердечка. Спробуй ще раз!'), 500);
      }
      spawn();
      const timer = setInterval(spawn, 1150);
      return () => { over = true; clearInterval(timer); };
    },

    odd(stage, g, done) {
      const rounds = g.rounds;
      let ri = 0, mistakes = 0;
      function show() {
        const [items, odd, why] = rounds[ri];
        const order = shuffle(items.map((t, i) => ({ t, i })));
        stage.innerHTML = `<div class="g-bar"><span>Завдання <b>${ri + 1}</b> з ${rounds.length}</span><span>Помилок: <b>${mistakes}</b></span></div>
          <div class="o-q">Що тут зайве?</div>
          <div class="o-grid">${order.map(o => `<button class="o-item" data-i="${o.i}">${esc(o.t)}</button>`).join('')}</div>
          <div class="o-why" id="oWhy"></div>`;
        stage.querySelectorAll('.o-item').forEach(b => b.onclick = () => {
          if (stage.querySelector('.o-item.ok')) return;
          if (+b.dataset.i === odd) {
            beep(true); b.classList.add('ok');
            stage.querySelector('#oWhy').innerHTML = `✅ ${esc(why)} <button class="btn brand sm" id="oNext">${ri + 1 < rounds.length ? 'Далі →' : 'Готово'}</button>`;
            stage.querySelector('#oNext').onclick = () => { ri++; if (ri < rounds.length) show(); else done(mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1, `Розв’язано ${pl(rounds.length, 'завдання', 'завдання', 'завдань')}, помилок: ${mistakes}.`); };
          } else if (!b.classList.contains('no')) { beep(false); mistakes++; b.classList.add('no'); stage.querySelector('.g-bar span:last-child b').textContent = mistakes; }
        });
      }
      show();
    },

    speed(stage, g, done) {
      const total = g.seconds || 45;
      const items = shuffle(g.items);
      let i = 0, right = 0, left = total, over = false;
      stage.innerHTML = `<div class="g-bar"><span>Правильно: <b id="sR">0</b></span><span class="s-time">⏱ <b id="sT">${total}</b> с</span></div>
        <div class="s-bar"><i id="sBar"></i></div>
        <div class="s-card" id="sCard"></div>
        <div class="s-btns"><button class="s-yes" data-v="1">✅ Так</button><button class="s-no" data-v="0">❌ Ні</button></div>`;
      const card = stage.querySelector('#sCard');
      const showItem = () => { card.className = 's-card'; card.textContent = items[i][0]; };
      showItem();
      stage.querySelectorAll('.s-btns button').forEach(b => b.onclick = () => {
        if (over) return;
        const ok = (b.dataset.v === '1') === !!items[i][1];
        beep(ok); if (ok) { right++; stage.querySelector('#sR').textContent = right; }
        card.classList.add(ok ? 'ok' : 'no');
        over = true;
        setTimeout(() => { if (over === 'end') return; over = false; i++; if (i >= items.length) return finish(); showItem(); }, 550);
      });
      const timer = setInterval(() => {
        left--; const t = stage.querySelector('#sT'); if (!t) return clearInterval(timer);
        t.textContent = left; stage.querySelector('#sBar').style.width = (left / total * 100) + '%';
        if (left <= 0) finish();
      }, 1000);
      function finish() {
        if (over === 'end') return; over = 'end'; clearInterval(timer);
        const r = right / items.length;
        done(r >= 0.9 ? 3 : r >= 0.65 ? 2 : right ? 1 : 0, `Правильно: ${right} з ${items.length}${i < items.length ? ' (час вийшов)' : ''}.`);
      }
      return () => clearInterval(timer);
    }
  };

  /* ---------- зберігання зірок (на цьому пристрої) ---------- */
  const key = (o, gi) => ['games', o.uid || 'guest', o.course, o.lesson, gi].join(':');
  const getStars = (o, gi) => { try { return +localStorage.getItem(key(o, gi)) || 0; } catch (e) { return 0; } };
  const setStars = (o, gi, n) => { try { if (n > getStars(o, gi)) localStorage.setItem(key(o, gi), n); } catch (e) { /* ignore */ } };

  window.Games = {
    META,
    has(course, lid) { const G = window.GAMES && window.GAMES[course]; return !!(G && G[lid] && G[lid].length); },
    list(course, lid) { return (window.GAMES && window.GAMES[course] && window.GAMES[course][lid]) || []; },
    stars: getStars,
    /* меню ігор уроку */
    menu(box, o) {
      const games = this.list(o.course, o.lesson);
      box.innerHTML = `<div class="games-menu">${games.map((g, i) => {
        const m = META[g.type] || { icon: '🎮', name: 'Гра', about: '' };
        return `<a class="card game-card" href="${o.href(i)}" style="--gc:${['#FF7A59', '#2BB673', '#3B82F6', '#A855F7', '#FFB020'][i % 5]}">
          <span class="gc-ico">${m.icon}</span><h3>${esc(g.h || m.name)}</h3><p>${esc(m.about)}</p>${starsHtml(getStars(o, i))}<span class="btn brand sm">Грати ▶</span></a>`;
      }).join('')}</div>`;
    },
    /* одна гра */
    play(box, o, gi) {
      const games = this.list(o.course, o.lesson);
      const g = games[gi]; if (!g || !PLAY[g.type]) throw new Error('Гру не знайдено');
      const m = META[g.type];
      let stop = null;
      const start = () => {
        if (stop) stop();
        box.innerHTML = `<div class="card game-play"><div class="gp-head"><span class="gc-ico">${m.icon}</span><div><h2>${esc(g.h || m.name)}</h2><p class="muted">${esc(m.about)}</p></div></div><div class="gp-stage" id="gpStage"></div></div>`;
        const stage = box.querySelector('#gpStage');
        stop = PLAY[g.type](stage, g, (stars, text) => {
          stop = null;
          setStars(o, gi, stars);
          const next = gi + 1 < games.length;
          stage.innerHTML = `<div class="g-result"><div class="gr-emoji">${stars >= 3 ? '🏆' : stars === 2 ? '🎉' : stars === 1 ? '👍' : '💪'}</div>
            ${starsHtml(stars)}<h3>${stars >= 3 ? 'Чудово!' : stars === 2 ? 'Молодець!' : stars === 1 ? 'Непогано!' : 'Спробуй ще!'}</h3><p>${esc(text)}</p>
            <div class="gr-btns"><button class="btn light" id="grAgain">🔁 Ще раз</button>${next ? `<a class="btn brand" href="${o.href(gi + 1)}">Наступна гра ▶</a>` : `<a class="btn brand" href="${o.menuHref}">🎮 Усі ігри</a>`}</div></div>`;
          stage.querySelector('#grAgain').onclick = start;
        }) || null;
      };
      start();
      return { destroy() { if (stop) stop(); } };
    }
  };
})();
