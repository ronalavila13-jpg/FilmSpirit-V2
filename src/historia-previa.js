/* ============================================================
   Pestaña · HISTORIA — «Premisa y mundo» y «Estructura» (lote AD): lo que se piensa antes de escribir el guion.
   Viajan con el guion (sección «guion» del equipo), dentro de P.build (tab-build.js):
     prem: { tema, premisa, tono, epoca, lugares, reglas, invest }   textos, como los del argumento
     refs: [{ id, kind, t, n, u }]   referencias: tipo, título, nota y enlace (opcional). Van en una lista con id: al
                                     unir los cambios del equipo (share.js · merge3) cada una se une por su id, así
                                     dos personas pueden agregar referencias a la vez sin pisarse
     beats: { det|g1|mid|crisis|clim|des: { d, act, on } }   los puntos clave: su descripción, su acto (índice en
                                     P.build.acts) y, si se quiere, la escena o tarjeta de la Escaleta a la que va
                                     unido («sc:<número>» o «cd:<id>», como en bItems). Unido, va en el acto de esa
                                     escena (si la escena cambia de acto, el punto la sigue); sin acto guardado, va
                                     donde suele ir según cuántos actos tenga la escaleta
   Las imágenes de referencia no se suben aquí: las fotos del programa se guardan por sección (areas.js · frameSec)
   y un proyecto solo de guion no las guarda; cada referencia lleva un enlace (a la película, a una imagen en la web).
   ============================================================ */
// [clave, nombre, ayuda, lo usual en palabras (o null), filas, grupo]
const B_PREM = [
  ['tema', 'Tema', 'De qué habla la historia en el fondo, en pocas palabras: la soledad, el precio de la ambición, el duelo.', [1, 12], 1, 'idea'],
  ['premisa', 'Premisa', 'Qué dice la historia sobre su tema, en una oración: «quien se aferra al pasado pierde el presente».', [8, 35], 2, 'idea'],
  ['tono', 'Tono y género', 'El género (drama, thriller, comedia…) y cómo se siente: oscuro, íntimo, irónico, con humor negro…', [5, 60], 2, 'idea'],
  ['epoca', 'Época', 'Cuándo pasa: el año o la época, la estación y cuánto tiempo abarca la historia.', null, 2, 'mundo'],
  ['lugares', 'Lugares', 'Dónde pasa: la ciudad, el barrio, los espacios principales y cómo son.', null, 3, 'mundo'],
  ['reglas', 'Reglas', 'Lo que funciona distinto en este mundo y no se puede romper: su lógica, sus límites, lo que el público tiene que creer.', null, 3, 'mundo'],
  ['invest', 'Investigación', 'Lo que averiguaste: entrevistas, datos, oficios, lugares visitados, fuentes.', null, 6, 'inv'],
];
const B_PREM_G = [['idea', 'La idea'], ['refs', 'Referencias'], ['mundo', 'El mundo'], ['inv', 'Investigación']];
const B_REF_K = [['peli', 'Película'], ['serie', 'Serie'], ['libro', 'Libro'], ['imagen', 'Foto o imagen'], ['musica', 'Música'], ['otro', 'Otra']];
const B_REF_MAX = 200;
// [clave, nombre, qué es, dónde suele caer (% del guion)]
const B_BEATS = [
  ['det', 'Detonante', 'El hecho que rompe la vida normal del protagonista y pone la historia en marcha.', 10],
  ['g1', 'Primer punto de giro', 'El protagonista toma una decisión (o se ve obligado) y entra de lleno en el conflicto: termina el planteamiento.', 25],
  ['mid', 'Punto medio', 'A mitad de camino algo cambia: una victoria falsa, una revelación, un objetivo nuevo.', 50],
  ['crisis', 'Crisis', 'El peor momento: todo parece perdido y el protagonista tiene que elegir.', 75],
  ['clim', 'Clímax', 'El enfrentamiento final: se resuelve el conflicto principal.', 90],
  ['des', 'Desenlace', 'Cómo quedan el mundo y el protagonista después del clímax.', 97],
];
// el acto donde va un punto sin acto elegido: con tres actos, detonante y giro en el I, punto medio y crisis en el II,
// clímax y desenlace en el III; con otra cantidad, en la misma proporción
const B_BEAT_AT = [8, 20, 50, 60, 85, 95];
const bBeatDefAct = (i, n) => Math.max(0, Math.min(n - 1, Math.floor(B_BEAT_AT[i] / 100 * n)));
const bPremOf = k => B_PREM.find(x => x[0] === k);

/* datos de versiones anteriores o de otra persona: en la forma que esperan las vistas (lo llama buildNormalize) */
function bPrevNormalize(B) {
  const isO = o => o && typeof o === 'object' && !Array.isArray(o), str = v => typeof v === 'string' ? v : v == null ? '' : String(v);
  const M = B.prem = isO(B.prem) ? B.prem : {};
  for (const [k] of B_PREM) M[k] = str(M[k]);
  const seen = new Set();
  B.refs = (Array.isArray(B.refs) ? B.refs : []).filter(r => isO(r) && typeof r.id === 'string' && /^[\w-]{1,40}$/.test(r.id) && !seen.has(r.id) && seen.add(r.id)).slice(0, B_REF_MAX);
  for (const r of B.refs) { r.t = str(r.t); r.n = str(r.n); r.u = str(r.u); if (!B_REF_K.some(x => x[0] === r.kind)) r.kind = 'otro'; }
  const T = B.beats = isO(B.beats) ? B.beats : {};
  for (const [k, b] of Object.entries(T)) {
    if (!B_BEATS.some(x => x[0] === k) || !isO(b)) { delete T[k]; continue; }
    b.d = str(b.d);
    if (b.act != null && !(Number.isInteger(b.act) && b.act >= 0 && b.act < 8)) delete b.act;
    if (b.on != null && !(typeof b.on === 'string' && /^(sc|cd):\S{1,40}$/.test(b.on))) delete b.on;
  }
}
/* ¿algo escrito? (para el ZIP y los avisos de exportar) */
const bPremHas = (B = BLD()) => B_PREM.some(([k]) => B.prem[k].trim()) || B.refs.some(r => r.t.trim() || r.n.trim() || r.u.trim());
const bBeatsHas = (B = BLD()) => Object.values(B.beats).some(b => b.d.trim() || b.on);

/* ---------- Premisa y mundo ---------- */
const bPremWc = k => {
  const d = bPremOf(k), n = bWords(BLD().prem[k]);
  return `${n} ${n === 1 ? 'palabra' : 'palabras'}${d[3] ? ` · lo usual: ${d[3][0]}–${d[3][1]}` : ''}`;
};
const bRefsN = () => BLD().refs.length;
const bRefsWc = () => { const n = bRefsN(); return n ? `${n} ${n === 1 ? 'título' : 'títulos'}` : 'Vacío'; };
const bPremShort = k => { const n = bWords(BLD().prem[k]); return n ? String(n) : 'Vacío'; };
function bRefHTML(r, ed) {
  const u = safeUrl(r.u), dis = ed ? '' : 'readonly';
  return `<div class="b-ref" data-ref="${ea(r.id)}">
    <div class="b-ref-top">
      <select class="b-ref-k" data-bind="b-ref" data-id="${ea(r.id)}" data-f="kind" aria-label="Tipo de referencia" ${ed ? '' : 'disabled'}>${B_REF_K.map(([k, n]) => `<option value="${ea(k)}" ${r.kind === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <input type="text" class="b-ref-t" value="${esc(r.t)}" data-bind="b-ref" data-id="${ea(r.id)}" data-f="t" placeholder="${ea(ed ? 'Título (y su año, director o autor)' : '')}" aria-label="Título de la referencia" ${dis}>
      ${ed ? `<button class="icbtn b-ref-x" data-act="b-ref-rm" data-id="${ea(r.id)}" aria-label="Quitar la referencia" title="Quitar">${ICO.close}</button>` : ''}
    </div>
    ${ed || r.n.trim() ? `<textarea class="b-ref-n" rows="1" data-bind="b-ref" data-id="${ea(r.id)}" data-f="n" placeholder="${ea(ed ? 'Qué tomar de ella: el tono, la luz, un personaje, una escena…' : '')}" aria-label="Nota de la referencia" ${dis}>${esc(r.n)}</textarea>` : ''}
    ${ed ? `<div class="b-ref-u"><input type="url" value="${esc(r.u)}" data-bind="b-ref" data-id="${ea(r.id)}" data-f="u" placeholder="Enlace (opcional)" aria-label="Enlace de la referencia" inputmode="url">${u ? `<a href="${ea(u)}" target="_blank" rel="noopener noreferrer">Abrir</a>` : ''}</div>`
      : u ? `<div class="b-ref-u ro"><a href="${ea(u)}" target="_blank" rel="noopener noreferrer" data-no-tr>${esc(linkName(u))}</a></div>` : ''}
  </div>`;
}
function bPremHTML(ed) {
  const B = BLD(), M = B.prem;
  // la lista de la izquierda: cada parte con su cuenta; tocarla lleva a su cuadro en la hoja
  const navRows = [...B_PREM.slice(0, 3).map(([k, n]) => [k, n, bPremShort(k), !!M[k].trim()]), ['refs', 'Referencias', bRefsWc(), bRefsN() > 0], ...B_PREM.slice(3).map(([k, n]) => [k, n, bPremShort(k), !!M[k].trim()])];
  const nav = navRows.map(([k, name, wc, has], i) => `<button class="b-argbtn${has ? ' has' : ''}" data-act="b-prem-go" data-k="${ea(k)}">
      <span class="b-n">${i + 1}</span><b class="b-argbt">${esc(name)}</b><small class="tnum" data-wcs="${ea(k)}">${esc(wc)}</small></button>`).join('');
  const ta = (k, cls = 'b-ta-box') => { const [, name, hint, , rows] = bPremOf(k); return `<textarea class="b-ta ${cls}" rows="${M[k].trim() ? 1 : rows}" data-bind="b-prem" data-k="${ea(k)}" aria-label="${ea(name)}" placeholder="${ea(ed ? hint : '—')}" ${ed ? '' : 'readonly'}>${esc(M[k])}</textarea>`; };
  const box = k => `<section class="b-box b-pbox" data-pbox="${ea(k)}"><div class="b-box-h"><b>${esc(bPremOf(k)[1])}</b><span class="b-wc" data-wc="${ea(k)}">${esc(bPremWc(k))}</span></div>${ta(k)}</section>`;
  // un grupo con un solo campo no repite el nombre: el título del grupo lleva su cuenta
  const groups = B_PREM_G.map(([g, gname]) => {
    if (g === 'refs') return `<section class="b-pgrp" data-pbox="refs"><div class="b-pgh"><h3>${esc(gname)}</h3><span class="b-wc" data-wc="refs">${esc(bRefsWc())}</span></div>
      <p class="hint b-pg-hint">Películas, series, libros, fotos o música que muestran el tono o el mundo que buscas; cada una con su nota y, si quieres, su enlace.</p>
      <div class="b-refs">${B.refs.map(r => bRefHTML(r, ed)).join('') || (ed ? '' : '<p class="hint">Sin referencias.</p>')}</div>
      ${ed ? `<button class="btn sm b-ref-add" data-act="b-ref-add" ${B.refs.length >= B_REF_MAX ? 'disabled' : ''}>+ Referencia</button>` : ''}</section>`;
    const L = B_PREM.filter(x => x[5] === g);
    if (L.length === 1) { const k = L[0][0]; return `<section class="b-pgrp b-pbox" data-pbox="${ea(k)}"><div class="b-pgh"><h3>${esc(gname)}</h3><span class="b-wc" data-wc="${ea(k)}">${esc(bPremWc(k))}</span></div><div class="b-box">${ta(k)}</div></section>`; }
    return `<section class="b-pgrp"><div class="b-pgh"><h3>${esc(gname)}</h3></div>${L.map(([k]) => box(k)).join('')}</section>`;
  }).join('');
  return `<div class="b-argw b-premw">
    <nav class="b-argnav" aria-label="Partes de la premisa y el mundo"><h3 class="b-argh">Partes <small>palabras</small></h3><div class="hd-box b-argl">${nav}</div><p class="hint">Todo lo que se piensa antes de escribir. «Exportar» lo arma en un PDF.</p></nav>
    <div class="b-sheet b-psheet">
      <header class="b-sheet-h"><h2>${esc(P.meta.title || 'Proyecto')}</h2>${P.meta.author ? `<span>${esc(P.meta.author)}</span>` : ''}</header>
      ${groups}
    </div>
  </div>`;
}
function bPremSub() {
  const B = BLD(), done = B_PREM.filter(([k]) => B.prem[k].trim()).length, n = B.refs.length;
  return `<span data-wcm="prem">${done} de ${B_PREM.length} partes escritas</span> · <span data-wcm="refs">${n} ${n === 1 ? 'referencia' : 'referencias'}</span>`;
}

/* ---------- Estructura ---------- */
/* dónde cae cada escena en el guion (0–100 %), según el largo de las escenas escritas antes que ella; sin nada
   escrito, según su lugar en la escaleta */
function bItemPos(items) {
  const e8 = it => it.s ? D.metrics.eighths[it.s.idx] || 0 : 0, tot = items.reduce((a, it) => a + e8(it), 0), m = new Map();
  let acc = 0;
  items.forEach((it, i) => { m.set(it.id, tot ? Math.round(acc / tot * 100) : items.length > 1 ? Math.round(i / items.length * 100) : 0); acc += e8(it); });
  return m;
}
/* el lugar de un punto clave: su acto, la escena unida (si sigue en la escaleta) y si la escena unida ya no está */
function bBeatPlace(k, items) {
  const B = BLD(), n = B.acts.length, i = B_BEATS.findIndex(x => x[0] === k), b = B.beats[k] || {};
  const it = b.on ? items.find(x => x.id === b.on) || null : null;
  const act = it ? Math.min(n - 1, it.eff) : Number.isInteger(b.act) ? Math.min(n - 1, b.act) : bBeatDefAct(i, n);
  return { act, it, lost: !!b.on && !it };
}
const bBeat = (k, make) => { const T = BLD().beats; if (!T[k] && make) T[k] = { d: '' }; return T[k] || null; };
const bActName = (a, i) => a || 'Acto ' + B_ROMAN[i];
const bUsual = pct => pct >= 95 ? 'lo usual: al final' : `lo usual: hacia el ${pct} %`;
// el nombre de una escena en la lista para unir: número y encabezado; las por escribir, con su aviso (ya traducido:
// la opción va sin traducir, porque el encabezado es del guion)
const bItemLabel = it => { const t = it.s ? `${it.s.key} · ${it.s.heading || tr('Escena sin encabezado')}` : `· ${(it.c.h || '').toUpperCase() || tr('Escena por escribir')} — ${tr('por escribir')}`; return t.length > 70 ? t.slice(0, 68) + '…' : t; };
function bEstHTML(ed) {
  const B = BLD(), items = bItems(), pos = bItemPos(items), n = B.acts.length;
  const secs = Array.from({ length: n }, () => []); for (const it of items) secs[Math.min(n - 1, it.eff)].push(it);
  const by = Array.from({ length: n }, () => []);
  B_BEATS.forEach(([k], i) => { const p = bBeatPlace(k, items); by[p.act].push({ k, i, ...p }); });
  const scOpts = cur => `<option value="" ${cur ? '' : 'selected'}>Sin escena</option>` + secs.map((L, ai) => L.length ? `<optgroup label="${ea(bActName(B.acts[ai], ai))}">${L.map(it => `<option value="${ea(it.id)}" data-no-tr ${cur === it.id ? 'selected' : ''}>${esc(bItemLabel(it))}</option>`).join('')}</optgroup>` : '').join('');
  const beatHTML = ({ k, i, act, it, lost }) => {
    const [, name, hint, usual] = B_BEATS[i], b = B.beats[k] || {}, d = b.d || '', has = !!d.trim(), at = it ? pos.get(it.id) : null;
    const go = it ? (it.s ? `<button class="btn ghost sm b-beat-go" data-act="b-beat-go" data-k="${ea(k)}" title="Abre la escena en el Guion">Ver en el guion</button>` : `<button class="btn ghost sm b-beat-go" data-act="b-beat-go" data-k="${ea(k)}" title="Muestra la escena en la Escaleta">Ver en la escaleta</button>`) : '';
    return `<li class="b-beat${has ? ' has' : ''}${it ? ' on' : ''}" data-beat="${ea(k)}">
      <span class="b-beat-dot" aria-hidden="true"></span>
      <div class="b-beat-c">
        <div class="b-beat-h"><b class="b-beat-n">${esc(name)}</b><span class="b-beat-u">${esc(bUsual(usual))}</span>${at != null ? `<span class="b-beat-at tnum" title="Dónde cae la escena unida, según el largo de las escenas escritas">al ${at} %</span>` : ''}</div>
        <textarea class="b-beat-d" rows="${has ? 1 : 2}" data-bind="b-beat" data-k="${ea(k)}" data-f="d" aria-label="${ea(name)}" placeholder="${ea(ed ? hint : '')}" ${ed ? '' : 'readonly'}>${esc(d)}</textarea>
        <div class="b-beat-f">
          <label class="b-beat-l"><span>Acto</span><select data-bind="b-beat" data-k="${ea(k)}" data-f="act" ${ed && !it ? '' : 'disabled'} ${it ? 'title="Va en el acto de su escena"' : ''}>${B.acts.map((a, ai) => `<option value="${ai}" data-no-tr ${ai === act ? 'selected' : ''}>${esc(bActName(a, ai))}</option>`).join('')}</select></label>
          <label class="b-beat-l b-beat-sc"><span>Escena</span><select data-bind="b-beat" data-k="${ea(k)}" data-f="on" ${ed ? '' : 'disabled'}>${scOpts(it ? it.id : '')}</select></label>
          ${go}
        </div>
        ${lost ? `<p class="hint b-beat-lost">La escena que tenía unida ya no está en la escaleta.</p>` : ''}
      </div>
    </li>`;
  };
  const acts = by.map((L, ai) => {
    const S = secs[ai], e8 = S.reduce((a, it) => a + (it.s ? D.metrics.eighths[it.s.idx] || 0 : 0), 0);
    return `<section class="b-tl-act" data-act-i="${ai}" style="--ak:${ai % 2 ? 62 : 34}%">
      <header class="b-tl-ah"><span class="b-tl-mk" aria-hidden="true">${esc(B_ROMAN[ai] || String(ai + 1))}</span><b data-no-tr>${esc(bActName(B.acts[ai], ai))}</b><span class="hint tnum">${S.length} ${S.length === 1 ? 'escena' : 'escenas'}${e8 ? ` · ${fmtEighths(e8)} págs.` : ''}</span></header>
      <ol class="b-tl-list">${L.map(beatHTML).join('') || '<li class="b-tl-none hint">Ningún punto clave en este acto.</li>'}</ol>
    </section>`;
  }).join('');
  return `<div class="b-tl">${acts}<p class="hint b-tl-foot">Los actos son los de la Escaleta: ahí se agregan, se quitan y se les cambia el nombre. Un punto unido a una escena va en el acto de esa escena.</p></div>`;
}
function bEstSub() {
  const B = BLD(), items = bItems(), done = B_BEATS.filter(([k]) => ((B.beats[k] || {}).d || '').trim()).length, on = B_BEATS.filter(([k]) => bBeatPlace(k, items).it).length;
  return `<span data-wcm="beats">${done} de ${B_BEATS.length} puntos clave</span> · ${on} ${on === 1 ? 'unido' : 'unidos'} a una escena`;
}

/* ---------- las dos vistas ---------- */
function bPrevRender(v, view, ed) {
  const t = `<b data-no-tr>${esc(P.meta.title || 'Proyecto')}</b>`, name = (B_VIEWS.find(x => x[0] === view) || [, ''])[1];
  v.innerHTML = `<div class="ws ws-1"><section class="center">
    <div class="bar">
      ${hdSeg(B_VIEWS.map(([k, n]) => ({ label: n, attrs: `data-act="b-view" data-v="${k}"`, on: view === k })), 'Vista')}
      <span class="grow"></span>
      ${toolsHTML()}
    </div>
    <div class="scroller pad" data-keep="b-${view}"><div class="hd b-hd">${hdHead({ title: name, sub: `${t} · ${view === 'prem' ? bPremSub() : bEstSub()}` })}</div>${view === 'prem' ? bPremHTML(ed) : bEstHTML(ed)}</div>
  </section></div>`;
  bindView();
  $$('#view .b-ta, #view .b-ref-n, #view .b-beat-d').forEach(bAuto);
}
/* después de escribir: las cuentas al día sin volver a dibujar (el cursor no se mueve) */
function bPremCounts(k) {
  const w = $(`[data-wc="${CSS.escape(k)}"]`); if (w) w.textContent = k === 'refs' ? bRefsWc() : bPremWc(k);
  const s = $(`[data-wcs="${CSS.escape(k)}"]`);
  if (s) { s.textContent = k === 'refs' ? bRefsWc() : bPremShort(k); s.closest('.b-argbtn').classList.toggle('has', k === 'refs' ? bRefsN() > 0 : !!BLD().prem[k].trim()); }
  const m = $('[data-wcm="prem"]'); if (m) { const B = BLD(); m.textContent = `${B_PREM.filter(([x]) => B.prem[x].trim()).length} de ${B_PREM.length} partes escritas`; }
}
Object.assign(ACT, {
  'b-prem-go': b => {
    const k = b.dataset.k, box = $(`[data-pbox="${CSS.escape(k)}"]`); if (!box) return;
    box.scrollIntoView({ block: 'start', behavior: 'smooth' });
    const f = k === 'refs' ? $('.b-ref-t:not([readonly]), .b-ref-add', box) : $('textarea', box);
    if (f && !f.readOnly) f.focus({ preventScroll: true });
  },
  'b-ref-add': () => {
    const B = BLD(); if (B.refs.length >= B_REF_MAX) return;
    const id = uid('r');
    B.refs.push({ id, kind: 'peli', t: '', n: '', u: '' });
    changed('data'); render();
    requestAnimationFrame(() => { const el = $(`[data-ref="${CSS.escape(id)}"] .b-ref-t`); if (el) { el.scrollIntoView({ block: 'nearest' }); el.focus(); } });
  },
  'b-ref-rm': b => {
    const B = BLD(), id = b.dataset.id; if (!B.refs.some(r => r.id === id)) return;
    histNote('Quitar una referencia', null, 'build');
    B.refs = B.refs.filter(r => r.id !== id); changed('data'); render();
    toastUndo('Referencia quitada.');
  },
  'b-beat-go': b => {
    const p = bBeatPlace(b.dataset.k, bItems()); if (!p.it) return;
    if (p.it.s) { bOpenScene(p.it.s.key); return; }
    ls.set('bView', 'esc'); render();
    requestAnimationFrame(() => { const el = $(`#view [data-it="${CSS.escape(p.it.id)}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('b-flash'); setTimeout(() => el.classList.remove('b-flash'), 1600); } });
  },
});
Object.assign(BIND, {
  'b-prem': el => { const k = el.dataset.k; if (!bPremOf(k)) return; BLD().prem[k] = el.value; changed('data'); bAuto(el); bPremCounts(k); },
  'b-ref': (el, ev) => {
    const r = BLD().refs.find(x => x.id === el.dataset.id), f = el.dataset.f; if (!r || !['kind', 't', 'n', 'u'].includes(f)) return;
    if (f === 'kind' && !B_REF_K.some(x => x[0] === el.value)) return;
    r[f] = el.value; changed('data');
    if (el.tagName === 'TEXTAREA') bAuto(el);
    if (f === 'u' && ev === 'change') render();   // el «Abrir» del enlace
  },
  'b-beat': (el, ev) => {
    const k = el.dataset.k, f = el.dataset.f; if (!B_BEATS.some(x => x[0] === k)) return;
    if (f === 'd') {
      const b = bBeat(k, true); b.d = el.value; changed('data'); bAuto(el);
      el.closest('.b-beat').classList.toggle('has', !!el.value.trim());
      const m = $('[data-wcm="beats"]'); if (m) m.textContent = `${B_BEATS.filter(([x]) => ((BLD().beats[x] || {}).d || '').trim()).length} de ${B_BEATS.length} puntos clave`;
      return;
    }
    if (ev !== 'change') return;
    const b = bBeat(k, true);
    if (f === 'act') { const a = +el.value; if (Number.isInteger(a) && a >= 0 && a < BLD().acts.length) b.act = a; }
    if (f === 'on') {
      const it = el.value ? bItems().find(x => x.id === el.value) : null;
      // unido, va en el acto de su escena; al soltarlo se queda en ese acto
      if (it) { b.on = it.id; b.act = it.eff; } else delete b.on;
    }
    changed('data'); render();
  },
});
HELP.build.splice(1, 0, ['Premisa y mundo', 'El tema, la premisa (qué dice la historia), el tono y el género; las referencias (películas, series, libros, imágenes: cada una con una nota y, si quieres, su enlace); el mundo (época, lugares y sus reglas) y las notas de investigación. La lista de la izquierda lleva a cada parte y cuenta sus palabras.']);
HELP.build.splice(3, 0, ['Estructura', 'Los puntos clave de la historia (detonante, primer punto de giro, punto medio, crisis, clímax y desenlace) en una línea de tiempo por actos. Cada uno lleva su descripción, su acto y, si quieres, la escena o tarjeta de la Escaleta donde pasa: así ves en qué parte del guion cae («al 25 %») y lo comparas con lo usual.']);
EXPORTS.build = (prev => () => {
  const L = prev(), at = lab => L.findIndex(x => x.label === lab);
  L.splice(1, 0, { label: 'Premisa y mundo', hint: 'PDF: tema, premisa, tono, referencias, el mundo y la investigación', run: btn => exportPDF('premisa', btn), pdf: { kind: 'premisa', opts: null } });
  const i = at('Biografías de personajes');
  L.splice(i >= 0 ? i + 1 : 2, 0, { label: 'Estructura', hint: 'PDF: los puntos clave por acto, con su escena', run: btn => exportPDF('estructura', btn), pdf: { kind: 'estructura', opts: null } });
  return L;
})(EXPORTS.build);

/* ---------- qué cambió (el registro de actividad y los avisos del equipo: notas.js · CHDESC.guion) ---------- */
function bChangeWhat(b0, b1) {
  const A = b0 || {}, Z = b1 || {}, ch = k => chCanon(A[k]) !== chCanon(Z[k]);
  if (ch('prem') || ch('refs')) return 'cambió la premisa y el mundo de la historia';
  if (ch('beats')) return 'cambió la estructura de la historia';
  if (ch('arg')) return 'cambió el argumento';
  if (ch('bios')) return 'cambió las biografías de los personajes';
  if (ch('cards') || ch('sc') || ch('acts') || ch('plots')) return 'cambió la escaleta';
  return null;
}

/* ---------- PDF ---------- */
/* un texto largo con su rótulo (como las biografías): el rótulo chico en gris y el texto con su interlineado */
function bPdfField(doc, y, name, text, next, M) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  const L = text.replace(/\r/g, '').split(/\n+/).map(t => t.trim()).filter(Boolean).flatMap(p => doc.splitTextToSize(pdfSafe(p), W - M * 2));
  y = next(y, 28 + Math.min(L.length, 4) * 12);
  if (name) { doc.setFont('helvetica', 'bold'); doc.setFontSize(PF.small); doc.setTextColor(...MUTED); doc.text(pdfSafe(name), M, y + 8); y += 13; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK);
  for (const ln of L) { y = next(y, 13); doc.text(ln, M, y + 8); y += 9.5 * PF.lh; }
  return y + 9;
}
function pdfPremisa() {
  const doc = newDoc('portrait'), B = BLD(), H = doc.internal.pageSize.getHeight(), M = 36;
  let y = docHeader(doc, 'Premisa y mundo', '');
  const next = (yy, need) => { if (yy + need > H - 44) { doc.addPage(); return 44; } return yy; };
  if (!bPremHas(B)) { doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text('Aún no hay nada escrito.', M, y + 10); }
  for (const [g, gname] of B_PREM_G) {
    if (g === 'refs') {
      const R = B.refs.filter(r => r.t.trim() || r.n.trim() || r.u.trim()); if (!R.length) continue;
      y = pdfSec(doc, y + 4, gname, { right: `${R.length} ${R.length === 1 ? 'referencia' : 'referencias'}` });
      const kind = k => (B_REF_K.find(x => x[0] === k) || [, ''])[1];
      doc.autoTable({ ...TBL, startY: y, head: [['Tipo', 'Título y nota', 'Enlace']],
        body: R.map(r => [pdfSafe(kind(r.kind)), pdfRich([{ t: r.t.trim() || 'Sin título', st: 'bold', tr: r.t.trim() ? false : 1 }, r.n.trim() ? { t: r.n.trim(), fs: PF.small + .2, col: MUTED, tr: false } : null].filter(Boolean)), { content: pdfSafe(safeUrl(r.u)), styles: { textColor: MUTED, fontSize: PF.small } }]),
        columnStyles: { 0: { cellWidth: 62 }, 2: { cellWidth: 150 } } });
      y = doc.lastAutoTable.finalY + PF.gap;
      continue;
    }
    const L = B_PREM.filter(x => x[5] === g && B.prem[x[0]].trim()); if (!L.length) continue;
    y = pdfSec(doc, y + 4, gname);
    for (const [k, name] of L) y = bPdfField(doc, y, L.length === 1 && name === gname ? '' : name, B.prem[k], next, M);
    y += 4;
  }
  pageNumbers(doc, 'Premisa y mundo');
  return { doc, name: fileSafe(P.meta.title) + '_premisa_y_mundo.pdf' };
}
/* la estructura: una línea vertical con los actos y sus puntos clave, como en la pantalla. La línea se dibuja a trozos,
   a medida que se baja (down): si un punto pasa a la hoja siguiente, la línea sigue ahí */
function pdfEstructura() {
  const doc = newDoc('portrait'), B = BLD(), items = bItems(), pos = bItemPos(items), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 36;
  const n = B.acts.length, by = Array.from({ length: n }, () => []);
  B_BEATS.forEach(([k], i) => { const p = bBeatPlace(k, items); by[p.act].push({ k, i, ...p }); });
  const done = B_BEATS.filter(([k]) => ((B.beats[k] || {}).d || '').trim()).length;
  let y = docHeader(doc, 'Estructura', `${done} de ${B_BEATS.length} puntos clave`) + 4;
  const RX = M + 8, TX = M + 26, TW = W - TX - M;
  const down = dy => { doc.setDrawColor(...mixc(INK, PDF_WHITE, .3)); doc.setLineWidth(1.4); doc.line(RX, y, RX, y + dy); y += dy; };
  const room = need => { if (y + need > H - 44) { doc.addPage(); y = 44; } };
  by.forEach((L, ai) => {
    if (ai) down(10);
    room(70);
    const S = items.filter(it => Math.min(n - 1, it.eff) === ai), e8 = S.reduce((a, it) => a + (it.s ? D.metrics.eighths[it.s.idx] || 0 : 0), 0), ya = y;
    // el acto: un círculo del color de la pestaña sobre la línea, su nombre y cuántas escenas tiene
    doc.setFont('title', 'bold'); doc.setFontSize(PF.sec); doc.setTextColor(...INK); doc.text(pdfSafe(bActName(B.acts[ai], ai)), TX, ya + 11);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(PF.small); doc.setTextColor(...MUTED);
    doc.text(pdfSafe(`${S.length} ${S.length === 1 ? 'escena' : 'escenas'}${e8 ? ` · ${fmtEighths(e8)} págs.` : ''}`), W - M, ya + 11, { align: 'right' });
    y = ya + 7; down(17);
    doc.setFillColor(...PT.c); doc.circle(RX, ya + 7, 5.5, 'F');
    if (!L.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(PF.small); doc.setTextColor(...MUTED); doc.text('Ningún punto clave en este acto.', TX, y + 8); down(16); return; }
    for (const { k, i, it } of L) {
      const [, name, , usual] = B_BEATS[i], d = ((B.beats[k] || {}).d || '').trim();
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      const lines = d ? d.split(/\n+/).map(t => t.trim()).filter(Boolean).flatMap(p => doc.splitTextToSize(pdfSafe(p), TW)) : [];
      const scn = it ? (it.s ? `Escena ${it.s.key} · ${it.s.heading || 'Escena sin encabezado'}` : `${(it.c.h || '').toUpperCase() || 'Escena por escribir'} · por escribir`) : '';
      room(36 + Math.min(lines.length, 3) * 12);
      const yb = y;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK); doc.text(pdfSafe(name), TX, yb + 9);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(PF.small); doc.setTextColor(...MUTED);
      doc.text(pdfSafe(it ? `al ${pos.get(it.id)} % · ${bUsual(usual)}` : bUsual(usual)), W - M, yb + 9, { align: 'right' });
      down(16);
      // el punto, lleno si tiene descripción (encima de la línea)
      if (d) { doc.setFillColor(...INK); doc.circle(RX, yb + 6, 3.4, 'F'); } else { doc.setFillColor(...PDF_WHITE); doc.setDrawColor(...MUTED); doc.setLineWidth(1); doc.circle(RX, yb + 6, 3.4, 'FD'); }
      if (scn) { doc.setFont('helvetica', 'bold'); doc.setFontSize(PF.small); doc.setTextColor(...MUTED); const sl = doc.splitTextToSize(pdfSafe(scn), TW).slice(0, 2); doc.text(sl, TX, y + 7); down(sl.length * 10 + 3); }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      if (lines.length) for (const ln of lines) { room(13); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK); doc.text(ln, TX, y + 8); down(9.5 * PF.lh); }
      else { doc.setTextColor(...MUTED); doc.text('Sin escribir.', TX, y + 8); down(9.5 * PF.lh); }
      down(10);
    }
  });
  pageNumbers(doc, 'Estructura');
  return { doc, name: fileSafe(P.meta.title) + '_estructura.pdf' };
}
PDFX.premisa = pdfPremisa; PDFX.estructura = pdfEstructura;
