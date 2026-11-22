/* Перегляд HTML-презентацій */
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  /* **жирний** у тексті слайда */
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

  function slideHtml(s, lesson) {
    const side = s.e ? `<div class="side-emoji">${s.e}</div>` : '';
    const p = s.p ? `<p>${rich(s.p)}</p>` : '';
    const list = s.list ? `<ul class="s-list">${s.list.map(x => `<li>${rich(x)}</li>`).join('')}</ul>` : '';
    const steps = s.steps ? `<ol class="s-steps">${s.steps.map(x => `<li>${rich(x)}</li>`).join('')}</ol>` : '';
    const cards = s.cards ? `<div class="s-cards">${s.cards.map(c => `<div class="s-card"><b>${c[0]}</b>${esc(c[1])}${c[2] ? `<small>${esc(c[2])}</small>` : ''}</div>`).join('')}</div>` : '';
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
      default:
        return `<div class="slide"><div class="s-row"><div><h2>${esc(s.h)}</h2>${p}${list}${steps}${cards}</div>${s.cards ? '' : side}</div></div>`;
    }
  }

  function run(root, lesson, opts) {
    const slides = lesson.slides || [];
    let i = 0;
    root.innerHTML = `
      <div class="crumbs">${opts.crumbs || ''}</div>
      <div class="page-head"><div><h1 style="font-size:clamp(22px,3vw,30px)">${esc(lesson.emoji || '')} ${esc(lesson.title)}</h1>
        <p>Презентація · ${slides.length} слайдів${lesson.pages ? ' · підручник, с. ' + esc(lesson.pages) : ''}</p></div>
        <a class="btn brand" href="${opts.testHref}">📝 Пройти тест</a></div>
      <div class="slides-shell">
        <div class="slide-stage" id="stage" style="--c:${opts.color}" tabindex="0">${slides.map(s => slideHtml(s, lesson)).join('')}</div>
        <div class="slide-ctrl">
          <button class="btn light" id="sPrev">←</button>
          <div class="slide-progress"><i id="sBar"></i></div>
          <span class="count" id="sCount"></span>
          <button class="btn light" id="sNext">→</button>
          <button class="btn light" id="sFull" title="На весь екран">⛶</button>
        </div>
      </div>`;
    const stage = root.querySelector('#stage');
    const els = [...stage.querySelectorAll('.slide')];
    els.forEach(el => el.style.setProperty('--c', opts.color));

    function show(k) {
      i = Math.max(0, Math.min(els.length - 1, k));
      els.forEach((el, j) => { el.classList.toggle('on', j === i); el.classList.toggle('prev', j < i); });
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
    stage.addEventListener('click', e => {
      const r = e.target.closest('[data-reveal]');
      if (r) { r.nextElementSibling.hidden = false; r.remove(); return; }
    });
    function key(e) {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); show(i + 1); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); show(i - 1); }
    }
    document.addEventListener('keydown', key);
    let sx = null;
    stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    });
    show(0);
    return { destroy() { document.removeEventListener('keydown', key); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } };
  }

  window.Slides = { run };
})();
