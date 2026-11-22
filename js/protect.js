/* Захист від копіювання, виділення, друку та скріншотів.
   Повністю заборонити знімок екрана браузер не дозволяє (Win+Shift+S,
   фото телефоном), тому тут — максимум того, що можливо на веб-сторінці. */
(function () {
  const body = document.body;
  let leaves = 0;
  const on = () => body.classList.contains('protect');
  const shieldOn = () => body.dataset.shield === '1';

  function block(e) { if (on()) { e.preventDefault(); e.stopPropagation(); return false; } }
  function isField(t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'); }

  ['copy', 'cut', 'dragstart', 'contextmenu'].forEach(ev =>
    document.addEventListener(ev, e => { if (!isField(e.target)) block(e); }, true));
  document.addEventListener('selectstart', e => { if (!isField(e.target)) block(e); }, true);

  function wipeClipboard() {
    try { navigator.clipboard && navigator.clipboard.writeText(' '); } catch (e) { /* ігноруємо */ }
  }
  function showShield(ms) {
    const s = document.getElementById('shield');
    if (!s) return;
    s.hidden = false;
    if (ms) setTimeout(() => { if (!document.hidden && document.hasFocus()) s.hidden = true; }, ms);
  }
  function hideShield() { const s = document.getElementById('shield'); if (s) s.hidden = true; }

  document.addEventListener('keydown', e => {
    if (!on()) return;
    const k = (e.key || '').toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    if (k === 'printscreen' || e.keyCode === 44) { wipeClipboard(); showShield(1500); e.preventDefault(); return; }
    if (mod && ['c', 'x', 'a', 's', 'p', 'u'].includes(k) && !isField(e.target)) { e.preventDefault(); return; }
    if (k === 'f12' || (mod && e.shiftKey && ['i', 'j', 'c', 's'].includes(k))) { e.preventDefault(); return; }
    // macOS: Cmd+Shift+3/4/5 — знімок; браузер не може скасувати, але ховаємо вміст
    if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(k)) { showShield(2000); }
    // Windows: Win+Shift+S — браузер бачить лише Shift/Meta, тож реагуємо на Meta
    if (k === 'meta' || k === 'os') { if (shieldOn()) body.classList.add('hidden-content'); }
  }, true);
  document.addEventListener('keyup', e => {
    const k = (e.key || '').toLowerCase();
    if (on() && (k === 'printscreen' || e.keyCode === 44)) { wipeClipboard(); showShield(1500); }
    if (k === 'meta' || k === 'os') body.classList.remove('hidden-content');
  }, true);

  window.addEventListener('blur', () => { if (on() && shieldOn()) { leaves++; showShield(); } });
  window.addEventListener('focus', () => { body.classList.remove('hidden-content'); hideShield(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && on() && shieldOn()) showShield();
    else if (!document.hidden && document.hasFocus()) hideShield();
  });
  document.getElementById('shield') && document.getElementById('shield').addEventListener('click', hideShield);
  window.addEventListener('beforeprint', () => { if (on()) body.style.display = 'none'; });
  window.addEventListener('afterprint', () => { body.style.display = ''; });

  window.Protect = {
    set(enabled, shield) {
      body.classList.toggle('protect', !!enabled);
      body.dataset.shield = shield ? '1' : '0';
      if (!shield) hideShield();
    },
    resetLeaves() { leaves = 0; },
    get leaves() { return leaves; }
  };
})();
