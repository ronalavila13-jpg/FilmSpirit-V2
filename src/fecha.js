/* ============================================================
   FECHAS · un campo que se escribe a mano y un calendario grande para elegir
   · Se escribe como se dice: «19/10/2026», «19-10», «19 oct», «19 de octubre», «lunes 19», «hoy», «mañana».
     Lo que no se entiende queda escrito (no se borra) y el campo se marca para corregirlo.
   · El botón del calendario abre un mes grande, con atajos (hoy, mañana, el próximo lunes, una semana
     después) y, si se le pasan, los días de rodaje marcados.
   · fechaFieldHTML({ iso, key, … }) dibuja el campo; FECHA_ON[key](iso) recibe la fecha elegida.
   ============================================================ */
const FECHA_ON = {};
const FE_MES = { ene: 0, jan: 0, feb: 1, mar: 2, abr: 3, apr: 3, may: 4, jun: 5, jul: 6, ago: 7, aug: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11, dec: 11 };
const FE_DS = { dom: 0, sun: 0, lun: 1, mon: 1, mar: 2, tue: 2, mie: 3, wed: 3, jue: 4, thu: 4, vie: 5, fri: 5, sab: 6, sat: 6 };
const feIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const feDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; };
const feAdd = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const feOk = (y, m, d) => { const x = new Date(y, m, d, 12); return y >= 1900 && y <= 2100 && x.getMonth() === m && x.getDate() === d ? x : null; };
/* «lun, 19 oct. 2026» */
const fechaFmt = iso => { const d = feDate(iso); return d ? d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''; };

/* lee una fecha escrita a mano; ref: la fecha de la que se parte (la del campo o la de hoy). Devuelve «aaaa-mm-dd» o null */
function fechaParse(text, ref) {
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const base = feDate(ref) || today;
  let t = String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  if (!t) return null;
  if (/^(hoy|today)$/.test(t)) return feIso(today);
  if (/^(manana|tomorrow)$/.test(t)) return feIso(feAdd(today, 1));
  if (/^pasado manana$/.test(t)) return feIso(feAdd(today, 2));
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) { const d = feOk(+m[1], +m[2] - 1, +m[3]); return d ? feIso(d) : null; }
  const toks = t.replace(/[,.]/g, ' ').split(/[\s/\-]+/).filter(x => x && !/^(de|del|el|la|the|of|on|proximo|proxima|siguiente|que|viene|next|this|coming|este|esta)$/.test(x));
  const nums = [];
  let mon = null, wd = null;
  for (const k of toks) {
    if (/^\d{1,4}$/.test(k)) { nums.push(+k); continue; }
    if (/^\d{1,2}(st|nd|rd|th)$/.test(k)) { nums.push(parseInt(k, 10)); continue; }
    const p = k.slice(0, 3);
    // «mar» antes de un número es martes («mar 19»); después, marzo («19 mar»)
    if (p === 'mar' && !EN && !nums.length && k !== 'marzo') { if (wd != null) return null; wd = 2; continue; }
    if (k.length >= 3 && p in FE_MES && (k.length === 3 || /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|june|july|august|september|october|november|december|sept)$/.test(k))) { if (mon != null) return null; mon = FE_MES[p]; continue; }
    if (k.length >= 2 && (p in FE_DS || (k === 'mi' || k === 'sa' || k === 'do' || k === 'lu' || k === 'ju' || k === 'vi'))) {
      const q = { mi: 'mie', sa: 'sab', do: 'dom', lu: 'lun', ju: 'jue', vi: 'vie' }[k] || p;
      if (wd != null) return null; wd = FE_DS[q]; continue;
    }
    return null;
  }
  const yr = y => y == null ? null : y < 100 ? 2000 + y : y;
  let d = null;
  if (mon != null) {
    if (!nums.length || nums.length > 2) return null;
    let [day, y] = nums;
    if (day > 31 && y != null && y <= 31) [day, y] = [y, day];   // «2026 oct 19»
    d = feYear(day, mon, yr(y), base);
  } else if (nums.length >= 2) {
    if (nums.length > 3) return null;
    let [a, b, y] = nums;
    if (a > 31) { [y, a, b] = [a, b, nums[2]]; return (x => x ? feIso(x) : null)(feOk(yr(y), a - 1, b)); }   // 2026/10/19
    const [day, mo] = EN ? [b, a] : [a, b];
    d = feYear(day, mo - 1, yr(y), base);
  } else if (nums.length === 1) {
    // solo el día (y quizá el día de la semana): el primero desde el mes de la fecha de partida que calce
    const day = nums[0];
    for (let k = 0; k < 15 && !d; k++) {
      const mo = new Date(base.getFullYear(), base.getMonth() + k, 1, 12);
      const c = feOk(mo.getFullYear(), mo.getMonth(), day);
      if (c && (wd == null || c.getDay() === wd)) d = c;
    }
  } else if (wd != null) {
    // solo el día de la semana: el próximo (desde mañana)
    for (let k = 1; k <= 7; k++) { const c = feAdd(today, k); if (c.getDay() === wd) { d = c; break; } }
  }
  return d ? feIso(d) : null;
}
/* sin año: el de la fecha de partida, o el siguiente si así queda más de dos meses atrás */
function feYear(day, mon, y, base) {
  if (mon < 0 || mon > 11) return null;
  if (y != null) return feOk(y, mon, day);
  const a = feOk(base.getFullYear(), mon, day);
  if (a && a < feAdd(base, -62)) return feOk(base.getFullYear() + 1, mon, day);
  return a;
}

const FE_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2"/></svg>';
/* el campo: texto + botón del calendario. key: a quién avisar (FECHA_ON[key]); marks: días a marcar en el calendario */
function fechaFieldHTML({ iso = '', key, id = '', label = 'Fecha', disabled = false, title = '', cls = '' }) {
  return `<span class="fecha${cls ? ' ' + ea(cls) : ''}"><input type="text" class="fecha-in" ${id ? `id="${ea(id)}"` : ''} value="${ea(fechaFmt(iso))}" data-fecha="${ea(key)}" data-iso="${ea(iso)}" placeholder="${ea(EN ? 'mm/dd/yyyy' : 'dd/mm/aaaa')}" autocomplete="off" spellcheck="false" aria-label="${ea(label)}" title="${ea(title || 'Escríbela como quieras («19/10/2026», «19 oct», «lunes 19») o elígela en el calendario')}" ${disabled ? 'disabled' : ''}><button type="button" class="fecha-cal" data-act="fecha-cal" aria-haspopup="dialog" aria-label="Elegir en el calendario" title="Elegir en el calendario" ${disabled ? 'disabled' : ''}>${FE_ICO}</button></span>`;
}
/* lee lo escrito: si se entiende, lo deja con su formato y avisa; si no, lo marca sin borrarlo */
function fechaCommit(inp) {
  const txt = inp.value.trim(), prev = inp.dataset.iso || '';
  if (!txt) { inp.value = fechaFmt(prev); inp.classList.remove('bad'); inp.removeAttribute('aria-invalid'); return; }
  if (txt === fechaFmt(prev)) { inp.classList.remove('bad'); inp.removeAttribute('aria-invalid'); return; }
  const iso = fechaParse(txt, prev);
  if (!iso) {
    inp.classList.add('bad'); inp.setAttribute('aria-invalid', 'true');
    toast('No entendí esa fecha. Prueba «19/10/2026», «19 oct» o «lunes 19».', 3200);
    return;
  }
  inp.classList.remove('bad'); inp.removeAttribute('aria-invalid');
  inp.value = fechaFmt(iso); inp.dataset.iso = iso;
  if (iso !== prev && FECHA_ON[inp.dataset.fecha]) FECHA_ON[inp.dataset.fecha](iso, inp);
}
document.addEventListener('change', e => { const i = e.target.closest && e.target.closest('.fecha-in'); if (i) fechaCommit(i); }, true);
document.addEventListener('keydown', e => {
  const i = e.target.closest && e.target.closest('.fecha-in'); if (!i) return;
  if (e.key === 'Enter') { e.preventDefault(); fechaCommit(i); }
  else if (e.key === 'Escape' && i.classList.contains('bad')) { e.preventDefault(); e.stopPropagation(); i.value = fechaFmt(i.dataset.iso); i.classList.remove('bad'); i.removeAttribute('aria-invalid'); }
  else if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); fechaOpen(i.parentElement.querySelector('.fecha-cal')); }
}, true);
document.addEventListener('focusin', e => { const i = e.target.closest && e.target.closest('.fecha-in'); if (i && !i.classList.contains('bad')) setTimeout(() => { if (document.activeElement === i) i.select(); }, 0); });

/* ---------- el calendario ---------- */
const FE_WD = EN ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
function fechaCalHTML(iso, ym, marks) {
  const sel = iso || '', today = feIso(new Date());
  const [y, m] = ym.split('-').map(Number), first = new Date(y, m - 1, 1, 12);
  const start = feAdd(first, -((first.getDay() + 6) % 7));
  const name = capFirst(first.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).replace(' de ', ' '));
  let cells = '';
  for (let k = 0; k < 42; k++) {
    const d = feAdd(start, k), di = feIso(d), out = d.getMonth() !== m - 1;
    const c = `fcal-d${out ? ' out' : ''}${di === sel ? ' sel' : ''}${di === today ? ' hoy' : ''}${marks && marks.has(di) ? ' mk' : ''}`;
    cells += `<button type="button" class="${c}" data-d="${di}" tabindex="${di === (sel && sel.slice(0, 7) === ym ? sel : ym === today.slice(0, 7) ? today : ym + '-01') ? 0 : -1}" aria-label="${ea(d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + (marks && marks.has(di) ? (EN ? ' · shoot day' : ' · día de rodaje') : ''))}" ${di === sel ? 'aria-pressed="true"' : ''}>${d.getDate()}</button>`;
  }
  return `<div class="fcal-h"><button type="button" class="fcal-nav" data-fm="-1" aria-label="Mes anterior">‹</button><b class="fcal-m" aria-live="polite">${esc(name)}</b><button type="button" class="fcal-nav" data-fm="1" aria-label="Mes siguiente">›</button></div>
    <div class="fcal-wd" aria-hidden="true">${FE_WD.map(w => `<span>${w}</span>`).join('')}</div>
    <div class="fcal-g">${cells}</div>`;
}
/* arma el calendario dentro de root; onPick(iso) al elegir */
function fechaCalMount(root, iso, onPick, marks) {
  const today = new Date();
  let ym = (iso || feIso(today)).slice(0, 7);
  const box = root.querySelector('.fcal-box');
  const paint = focusIso => {
    box.innerHTML = fechaCalHTML(iso, ym, marks);
    if (focusIso) { const b = box.querySelector(`[data-d="${focusIso}"]`); if (b) b.focus(); }
  };
  const shift = n => { const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + n, 1, 12); ym = feIso(d).slice(0, 7); };
  paint();
  root.addEventListener('click', e => {
    const n = e.target.closest('[data-fm]'); if (n) { shift(+n.dataset.fm); paint(); return; }
    const d = e.target.closest('[data-d]'); if (d) { onPick(d.dataset.d); return; }
    const q = e.target.closest('[data-fq]'); if (q) { onPick(q.dataset.fq); }
  });
  root.addEventListener('keydown', e => {
    const b = e.target.closest && e.target.closest('.fcal-d'); if (!b) return;
    const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (mv || e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault(); e.stopPropagation();
      const cur = feDate(b.dataset.d);
      const nx = mv ? feAdd(cur, mv) : new Date(cur.getFullYear(), cur.getMonth() + (e.key === 'PageUp' ? -1 : 1), Math.min(cur.getDate(), 28), 12);
      const ni = feIso(nx);
      if (ni.slice(0, 7) !== ym) { ym = ni.slice(0, 7); paint(ni); } else { const t = box.querySelector(`[data-d="${ni}"]`); if (t) t.focus(); }
    }
  });
}
/* los atajos: hoy, mañana, el próximo lunes y, si hay una fecha, una semana después */
function fechaQuick(iso) {
  const t = new Date(); t.setHours(12, 0, 0, 0);
  let mon = feAdd(t, 1); while (mon.getDay() !== 1) mon = feAdd(mon, 1);
  const q = [['Hoy', feIso(t)], ['Mañana', feIso(feAdd(t, 1))], ['El próximo lunes', feIso(mon)]];
  const c = feDate(iso); if (c) q.push(['Una semana después', feIso(feAdd(c, 7))]);
  return `<div class="fcal-q">${q.map(([n, d]) => `<button type="button" class="chip" data-fq="${d}" title="${ea(fechaFmt(d))}">${esc(n)}</button>`).join('')}</div>`;
}
/* abre el calendario de un campo */
function fechaOpen(btn) {
  const wrap = btn && btn.closest('.fecha'), inp = wrap && wrap.querySelector('.fecha-in');
  if (!inp || inp.disabled) return;
  const key = inp.dataset.fecha, iso = inp.dataset.iso || '';
  const marks = typeof FECHA_MARKS[key] === 'function' ? FECHA_MARKS[key]() : null;
  popover(btn, `<div class="fcal" role="dialog" aria-label="Elegir la fecha"><div class="fcal-box"></div>${fechaQuick(iso)}${marks && marks.size ? '<p class="fcal-leg"><i></i>Días de rodaje</p>' : ''}</div>`, p => {
    p.classList.add('pop-fcal');
    fechaCalMount(p, iso, d => {
      closePop();
      inp.value = fechaFmt(d); inp.classList.remove('bad'); inp.removeAttribute('aria-invalid');
      const prev = inp.dataset.iso; inp.dataset.iso = d;
      if (d !== prev && FECHA_ON[key]) FECHA_ON[key](d, inp);
    }, marks);
    requestAnimationFrame(() => { const f = p.querySelector('.fcal-d[tabindex="0"]'); if (f) f.focus(); });
  });
}
const FECHA_MARKS = {};
ACT['fecha-cal'] = b => fechaOpen(b);
