/* Portada: código de descuento del enlace (/r/CODIGO), región de precios (soles en el Perú, dólares fuera), botones
   que llevan a la app si hay sesión, lista de espera de Studio y la hoja de guion de prueba */
'use strict';
(function () {
  const root = document.documentElement;
  const qs = new URLSearchParams(location.search);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ref = qs.get('ref');
  try {
    if (ref && /^[\w-]{3,40}$/.test(ref)) localStorage.setItem('fs_ref', ref.toUpperCase());
    ref = localStorage.getItem('fs_ref');
  } catch (e) { ref = ref && /^[\w-]{3,40}$/.test(ref) ? ref.toUpperCase() : ''; }
  if (ref) {
    const n = document.getElementById('refNote');
    n.textContent = (n.dataset.tpl || '{code}').replace('{code}', ref);
    n.hidden = false;
    // el código viaja a la página de entrada
    document.querySelectorAll('[data-login]').forEach(a => { a.href = '/entrar?ref=' + encodeURIComponent(ref); });
  }
  // vuelve de eliminar la cuenta
  if (qs.get('cuenta') === 'eliminada') { const g = document.getElementById('goneNote'); if (g) g.hidden = false; try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { } }
  // con sesión abierta, los botones llevan directo a la app y la cabecera dice «Abrir FilmSpirit»
  fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }).then(r => {
    if (!r.ok) return;
    document.querySelectorAll('[data-login]').forEach(a => { a.href = '/app/'; });
    document.querySelectorAll('[data-guest]').forEach(a => { a.hidden = true; });
    const b = document.querySelector('.top [data-open]'); if (b) b.textContent = b.dataset.open;
  }).catch(() => { });

  /* región de precios: la elegida a mano, si no la zona horaria del navegador (America/Lima = Perú), si no la del servidor */
  const setRegion = (r, keep) => {
    root.dataset.region = r;
    document.querySelectorAll('.pr[data-pe]').forEach(el => { el.textContent = el.dataset[r === 'pe' ? 'pe' : 'intl']; });
    document.querySelectorAll('[data-only]').forEach(el => { el.hidden = el.dataset.only !== r; });
    document.querySelectorAll('.region-pick [data-region]').forEach(b => b.setAttribute('aria-pressed', b.dataset.region === r ? 'true' : 'false'));
    if (keep) try { localStorage.setItem('fs_region', r); } catch (e) { }
  };
  let saved = null;
  try { saved = localStorage.getItem('fs_region'); } catch (e) { }
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { }
  setRegion(saved === 'pe' || saved === 'intl' ? saved : tz === 'America/Lima' ? 'pe' : root.dataset.region === 'pe' ? 'pe' : 'intl');
  document.querySelectorAll('.region-pick [data-region]').forEach(b => b.addEventListener('click', () => setRegion(b.dataset.region, true)));

  /* lista de espera de Studio */
  const wl = document.getElementById('wlForm');
  if (wl) wl.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = wl.querySelector('.wl-msg'), inp = wl.querySelector('input'), btn = wl.querySelector('button');
    const email = inp.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = msg.dataset.bad; msg.classList.add('bad'); inp.focus(); return; }
    btn.disabled = true;
    try {
      const r = await fetch('/api/waitlist', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-FS': '1' }, body: JSON.stringify({ plan: 'studio', email, lang: root.lang, tz }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '');
      msg.textContent = msg.dataset.ok; msg.classList.remove('bad'); inp.value = '';
    } catch (er) { msg.textContent = er.message || msg.dataset.bad; msg.classList.add('bad'); btn.disabled = false; }
  });

  /* la hoja de guion: la escena de ejemplo se escribe sola (con «reducir movimiento», ya escrita) y después se edita.
     Enter pasa a la línea siguiente con el tipo que corresponde (tras el personaje, el diálogo); en una línea vacía, Tab
     cambia su tipo y Retroceso la borra; los botones de abajo cambian el tipo de la línea donde está el cursor.
     «Guardar guion» deja la escena en este navegador: la app la abre como un guion nuevo al entrar (arranque.js). */
  const sheet = document.getElementById('sheet');
  if (sheet) {
    const box = document.getElementById('sheetLines');
    const pills = [...document.querySelectorAll('#sheetTypes [data-t]')];
    const META = Object.fromEntries(pills.map(b => [b.dataset.t, { aria: b.dataset.aria, ph: b.dataset.ph }]));
    const TYPES = pills.map(b => b.dataset.t);
    const NEXT = { h: 'a', a: 'a', c: 'd', d: 'a' };
    const MAX = 40, PAUSE = 14;
    let uid = 0;
    let lines = [...box.querySelectorAll('.ln')].map(p => ({ id: 'l' + (++uid), t: p.dataset.t, x: p.textContent.trim() }));
    let focusId = lines[lines.length - 1].id, typing = false, timer = 0, tabs = { id: '', n: 0 };
    const paintPills = t => pills.forEach(b => b.setAttribute('aria-pressed', b.dataset.t === t ? 'true' : 'false'));
    const autoFit = !(window.CSS && CSS.supports && CSS.supports('field-sizing', 'content'));
    const fit = ta => { if (autoFit) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; } };
    const taOf = id => box.querySelector(`textarea[data-id="${id}"]`);
    const at = (ta, pos) => { ta.focus({ preventScroll: false }); try { ta.setSelectionRange(pos, pos); } catch (e) { } };
    const mk = l => {
      const ta = document.createElement('textarea');
      ta.className = 'ln'; ta.rows = 1; ta.maxLength = 600; ta.dataset.id = l.id;
      ta.value = l.x; dress(ta, l.t);
      return ta;
    };
    const dress = (ta, t) => { ta.dataset.t = t; ta.setAttribute('aria-label', META[t].aria); ta.placeholder = META[t].ph; };
    const edit = () => {
      clearInterval(timer); typing = false;
      box.removeAttribute('aria-hidden');
      box.replaceChildren(...lines.map(mk));
      box.querySelectorAll('textarea').forEach(fit);
      const l = lines.find(x => x.id === focusId) || lines[lines.length - 1];
      paintPills(l.t);
    };
    // la escena se escribe a 30 ms por letra, con una pausa entre líneas
    const type = () => {
      typing = true;
      box.setAttribute('aria-hidden', 'true');
      const ps = lines.map(l => { const p = document.createElement('p'); p.className = 'ln'; p.dataset.t = l.t; return p; });
      box.replaceChildren(...ps);
      const caret = document.createElement('span'); caret.className = 'caret';
      const total = lines.reduce((a, l) => a + l.x.length + PAUSE, 0);
      let n = 0;
      timer = setInterval(() => {
        n++;
        let rem = n, cur = lines.length - 1;
        for (let i = 0; i < lines.length; i++) {
          const v = Math.max(0, Math.min(lines[i].x.length, rem));
          if (ps[i].firstChild ? ps[i].firstChild.nodeValue !== lines[i].x.slice(0, v) : v) ps[i].replaceChildren(lines[i].x.slice(0, v));
          if (v < lines[i].x.length) { cur = i; break; }
          rem -= lines[i].x.length + PAUSE;
        }
        ps[cur].append(caret); paintPills(lines[cur].t);
        if (n >= total) edit();
      }, 30);
    };
    // tocar la hoja (o llegar con el teclado) mientras se escribe la termina y la deja lista para editar
    const wake = e => {
      if (!typing) return;
      const p = e && e.target && e.target.closest && e.target.closest('p.ln');
      const i = p ? [...box.children].indexOf(p) : -1;
      if (i >= 0) focusId = lines[i].id;
      edit();
      if (e && e.type === 'pointerdown' && !e.target.closest('button,a')) { e.preventDefault(); const ta = taOf(focusId); if (ta) at(ta, ta.value.length); }
    };
    sheet.addEventListener('pointerdown', wake);
    sheet.addEventListener('focusin', wake);
    box.addEventListener('input', e => {
      const ta = e.target.closest('textarea'); if (!ta) return;
      const l = lines.find(x => x.id === ta.dataset.id); if (l) l.x = ta.value;
      fit(ta);
    });
    box.addEventListener('focusin', e => {
      const ta = e.target.closest('textarea'); if (!ta) return;
      focusId = ta.dataset.id; paintPills(ta.dataset.t);
    });
    box.addEventListener('keydown', e => {
      const ta = e.target.closest('textarea'); if (!ta || e.isComposing) return;
      const i = lines.findIndex(x => x.id === ta.dataset.id); if (i < 0) return;
      const l = lines[i], s = ta.selectionStart, end = ta.selectionEnd;
      if (e.key !== 'Tab') tabs = { id: '', n: 0 };
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (lines.length >= MAX) return;
        const fresh = { id: 'l' + (++uid), t: NEXT[l.t], x: ta.value.slice(end) };
        l.x = ta.value.slice(0, s); ta.value = l.x; fit(ta);
        lines.splice(i + 1, 0, fresh);
        const nt = mk(fresh); ta.after(nt); fit(nt); at(nt, 0);
      } else if (e.key === 'Tab' && !e.shiftKey && !ta.value && (tabs.id !== l.id || tabs.n < TYPES.length - 1)) {
        // Tab cambia el tipo de una línea vacía, pero después de pasar por todos deja salir de la hoja con el teclado
        e.preventDefault();
        tabs = { id: l.id, n: tabs.id === l.id ? tabs.n + 1 : 1 };
        l.t = TYPES[(TYPES.indexOf(l.t) + 1) % TYPES.length]; dress(ta, l.t); paintPills(l.t);
      } else if (e.key === 'Backspace' && !ta.value && i > 0) {
        e.preventDefault();
        lines.splice(i, 1);
        const prev = taOf(lines[i - 1].id); ta.remove(); at(prev, prev.value.length);
      } else if (e.key === 'ArrowUp' && s === 0 && end === 0 && i > 0) {
        e.preventDefault(); const prev = taOf(lines[i - 1].id); at(prev, prev.value.length);
      } else if (e.key === 'ArrowDown' && s === ta.value.length && i < lines.length - 1) {
        e.preventDefault(); at(taOf(lines[i + 1].id), 0);
      }
    });
    pills.forEach(b => {
      b.addEventListener('mousedown', e => e.preventDefault());   // el cursor se queda en su línea
      b.addEventListener('click', () => {
        if (typing) edit();
        const l = lines.find(x => x.id === focusId) || lines[lines.length - 1], ta = taOf(l.id);
        l.t = b.dataset.t; dress(ta, l.t); paintPills(l.t); fit(ta); at(ta, ta.value.length);
      });
    });
    // guardar: la escena queda en este navegador y la app la abre como guion nuevo al entrar
    const save = sheet.querySelector('[data-save]');
    if (save) save.addEventListener('click', () => {
      if (typing) edit();
      const paras = lines.map(l => ({ t: l.t, x: (l.t === 'h' || l.t === 'c' ? l.x.toLocaleUpperCase(root.lang) : l.x).trim() })).filter(p => p.x);
      try { if (paras.length) localStorage.setItem('fs_escena', JSON.stringify({ v: 1, at: Date.now(), title: sheet.dataset.title || '', paras })); } catch (e) { }
    });
    // «Escribe tu primera escena», en el cierre: vuelve a la hoja con el cursor al final
    document.querySelectorAll('[data-write]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      if (typing) edit();
      sheet.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
      const ta = taOf(lines[lines.length - 1].id);
      if (ta) { ta.focus({ preventScroll: true }); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (er) { } }
    }));
    if (calm) edit(); else setTimeout(() => { if (!box.querySelector('textarea')) type(); }, 500);
  }
})();
