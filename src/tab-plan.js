/* ============================================================
   Pestaña · PLAN DE RODAJE — una tabla por jornada
   Fecha en la primera columna (celda combinada), escenas con su locación de
   rodaje, hora, reparto, figurantes, notas técnicas y observaciones; eventos
   de la jornada (traslados, comidas) con hora; cierre de jornada; etapas de
   rodaje con lugar o país y un tono de fondo propio.
   Escenas divididas: la principal {k} y sus partes {k, sp: 'A', e8: octavos}.
   ============================================================ */
const WEEKDAYS = typeof EN !== 'undefined' && EN ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const fmtDate = d => d ? d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
const cap1 = t => t ? t[0].toUpperCase() + t.slice(1) : t;
// colores de baja saturación: tiras de día y de noche, tonos de etapa y colores para resaltar
const BAR_OF = { '#FAC5BD': '#F58A7B', '#F1ADAD': '#E35A5A', '#FFD0B3': '#FFA066', '#FFEB99': '#E8BE12', '#CDE3DF': '#6FA89D', '#BAD9FE': '#74B2FD', '#9BE3FA': '#1FB0E0', '#FFB7C7': '#FF6F8E', '#E7E5E1': '#969490', '#EAC9C3': '#E5484D', '#EED8BF': '#EE8A2E', '#EDE3B0': '#D2AC2A', '#D3E2C8': '#3FA46A', '#C8DBE4': '#3B97D3', '#D9D0E7': '#8B68D6', '#E6CEDE': '#D4559A', '#D8D8D4': '#8B929C' };
const barOf = col => BAR_OF[col] || col;
// el día y la noche: los colores de la leyenda del plan (leyenda.js); la fila lleva un velo de ese color
const stripBar = s => s.dn === 'N' ? lgCol('plan', 'n') : lgCol('plan', 'd');
const STAGE_TONES = ['#DCE3D9', '#D9DFE8', '#E6DFD3', '#E2DAE4', '#D5E2E0', '#E4E0CF', '#DEDAD4', '#D8DBE9'];
// los colores para resaltar: la paleta de las etapas, en suave para la fila (la franja lleva el color entero)
const ROW_COLORS = [['#FAC5BD', 'Coral'], ['#F1ADAD', 'Rojo'], ['#FFD0B3', 'Naranja'], ['#FFEB99', 'Amarillo'], ['#CDE3DF', 'Verde agua'], ['#BAD9FE', 'Azul'], ['#9BE3FA', 'Cian'], ['#FFB7C7', 'Rosa'], ['#E7E5E1', 'Gris']];
const EVENT_PRESETS = ['Salida', 'Traslado', 'Llamado', 'Desayuno', 'Almuerzo', 'Cena', 'Preparativos para el rodaje', 'Maquillaje y vestuario', 'Ensayo', 'Desmontaje'];
/* (lote U) las tiras estándar de la industria, a toda la fila: interior de día blanca, exterior de día amarilla, interior
   de noche azul, exterior de noche verde, amanecer y atardecer rosa. Son colores de la leyenda del plan (leyenda.js):
   «d» (Día) es la de exterior de día y «n» (Noche) la de interior de noche; INT/EXT va como exterior. Lo resaltado con un
   color de la leyenda manda sobre la tira. (stripBar, de día o de noche, sigue para la hoja de script y el desglose) */
const stripDN = s => { const t = String((s && s.tod) || ''); return /AMANECER|DAWN|SUNRISE/.test(t) ? 'am' : /ATARDECER|ANOCHECER|DUSK|SUNSET|MAGIC HOUR/.test(t) ? 'at' : s && s.dn === 'N' ? 'n' : 'd'; };
const stripKey = s => { const dn = stripDN(s), ext = !!s && s.ie !== 'INT'; return dn === 'am' || dn === 'at' ? 'dd' : dn === 'n' ? (ext ? 'ne' : 'n') : (ext ? 'd' : 'di'); };
const stripColor = s => lgCol('plan', stripKey(s));
const DN_LAB = { d: 'Día', n: 'Noche', am: 'Amanecer', at: 'Atardecer' };
const ieLab = s => s.ie === 'INT/EXT' ? 'I/E' : s.ie || 'INT';
/* el lugar del encabezado, sin INT./EXT. ni el momento del día («CINE PRIMAVERA - FACHADA») */
const setOf = s => s.loc || s.heading;
const planEditable = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('plan'));
const stageTone = (P_, id) => { const st = P_.schedule.stages || []; const i = st.findIndex(x => x.id === id); return lgG(STAGE_TONES[(i < 0 ? 0 : i) % STAGE_TONES.length]); };
const planLoc = (it, s) => (it && it.loc) || (P.schedule.setLoc || {})[s.locBase] || '';
// identidad de cada fila del plan (sirve para la selección y para mover sin perder el orden)
const itemKey = it => it.e ? 'e:' + it.e : it.d ? 'd:' + it.d : 'k:' + it.k + '|' + (it.sp || '');
const rowCode = it => it.k + (it.sp || '');
/* octavos de una fila: una parte tiene los suyos; la escena principal, lo que queda */
function partEighths(it) {
  const s = sceneOfKey(it.k); if (!s) return 0;
  if (it.sp) return Math.max(0, Math.round(num(it.e8)));
  const extra = P.schedule.items.filter(x => x.k === it.k && x.sp).reduce((a, x) => a + Math.max(0, Math.round(num(x.e8))), 0);
  return Math.max(0, D.metrics.eighths[s.idx] - extra);
}
function castText(s) {
  const list = sceneCast(s.idx);
  if (!list.length) return '—';
  return P.schedule.castMode === 'name' ? list.map(e => titleCase(e.name)).join(', ') : list.map(e => D.castNum[e.id]).filter(Boolean).join(', ');
}
function dayInfo(keys, rows) {
  let e = 0, fig = 0; const locs = new Set(), cast = new Set();
  for (const k of keys) {
    const s = sceneOfKey(k); if (!s) continue;
    D.sem[s.idx].forEach(id => { if (P.elements[id] && P.elements[id].cat === 'cast') cast.add(id); });
  }
  if (rows) for (const i of rows) {
    const it = P.schedule.items[i]; if (!it || it.e) continue;
    const s = sceneOfKey(it.k); if (!s) continue;
    e += partEighths(it);
    locs.add(planLoc(it, s) || titleCase(s.locBase));
    fig += num(it.fig);
  } else for (const k of keys) { const s = sceneOfKey(k); if (s) { e += D.metrics.eighths[s.idx]; locs.add(titleCase(s.locBase)); } }
  return { e, locs, cast, fig };
}
// jornada completada: marcada a mano, o todos sus planos rodados en la hoja de script
function dayDone(d) {
  if (d.brk.done) return 'manual';
  if (d.brk.done === false || !d.keys.length) return '';
  const shots = d.keys.flatMap(k => D.shotsBy[k] || []);
  return shots.length && d.keys.every(k => (D.shotsBy[k] || []).length) && shots.every(s => s.done) ? 'script' : '';
}
/* (lote U) las columnas, como la referencia: [clave, título, clase, se ordena tocando su título]. La figuración se prende
   en Ajustes › Columnas en pantalla (en el PDF y el Excel siempre sale).
   (lote W) Sin el asa ni el ícono de la hoja de desglose: la fila se arrastra desde cualquier parte y el clic derecho abre
   sus opciones (con «Abrir hoja de desglose»). El menú ⋮ del final queda solo en las pantallas táctiles (shell.html) */
const PL_COLS = [['esc', 'Esc.', 'c-esc', 1], ['ie', 'I/E', 'c-ie', 1], ['set', 'Locación', 'c-set', 1], ['dn', 'D/N', 'c-dn', 1],
  ['cast', 'Reparto', 'c-cast'], ['fig', 'Fig.', 'c-fig r'], ['loc', 'Locación de rodaje', 'c-loc', 1], ['pgs', 'Págs.', 'c-pgs r', 1], ['pg', 'Pág.', 'c-pg r'],
  ['t', 'Tiempo', 'c-t'], ['tech', 'Notas técnicas', 'c-tech'], ['obs', 'Observaciones', 'c-obs'], ['more', '', 'c-more']];
const PL_TIP = { 'Tiempo': 'Tiempo estimado de rodaje de cada escena: escríbelo para cambiarlo (45, 1 h 15, 1:30)', 'Fig.': 'Figuración: cuántos extras', 'Págs.': 'Largo de la escena en octavos de página', 'Pág.': 'Página del guion donde empieza', 'Locación': 'El lugar del encabezado de la escena, con su sinopsis', 'Locación de rodaje': 'El lugar real donde se rueda', 'D/N': 'Día, noche, amanecer o atardecer' };
/* el orden por columna (tocando su título): la última columna elegida y su sentido, para la flechita */
const PL_SORT = { c: null, dir: 1, pid: null };
function plHeadHTML() {
  const ed = planEditable(), so = PL_SORT.pid === (P && P.id) && PL_SORT.c && planSortedBy(PL_SORT.c, PL_SORT.dir) ? PL_SORT : null;
  const cw = plColW(P.schedule), keys = plColKeys(planCols());
  // (lote Y) con su ancho propio el título puede cortarse con «…»: entero al pasar el mouse
  const cells = PL_COLS.map(([k, h, c, srt]) => {
    const tip = PL_TIP[h] ? ` title="${ea(PL_TIP[h])}"` : cw[k] && h ? ` title="${ea(h)}"` : '';
    if (!srt || !ed) return `<span class="${ea(c)}"${tip}>${h}</span>`;
    const on = so && so.c === k, nx = on ? -so.dir : 1;
    return `<button type="button" class="${ea(c)} srt${on ? ' on' : ''}" data-act="pl-sort" data-c="${k}" aria-label="${ea(`Ordenar por ${h} (${nx > 0 ? 'ascendente' : 'descendente'}) dentro de cada jornada`)}" title="${ea(`Ordenar por ${h} dentro de cada jornada${PL_TIP[h] ? '. ' + PL_TIP[h] : ''}`)}"><span>${h}</span><i class="ar" aria-hidden="true">${on ? (so.dir > 0 ? '↑' : '↓') : '↕'}</i></button>`;
  }).join('');
  /* (lote Y) el asa para cambiar el ancho: en el borde derecho de cada título, fuera del botón que ordena (va aparte,
     ubicada sobre su columna de la grilla); solo quien puede editar el plan, y el CSS la deja solo para el ratón */
  const rz = ed ? keys.map((k, j) => `<i class="pl-rz${j === keys.length - 1 ? ' end' : ''}" data-c="${k}" style="grid-column:${j + 1}" title="Arrastra para cambiar el ancho · doble clic: ancho automático" aria-hidden="true"></i>`).join('') : '';
  return `<div class="pl-head">${cells}${rz}</div>`;
}
/* columnas opcionales de la pantalla (cada persona elige las suyas; el PDF y el Excel siempre las llevan).
   (lote U) La figuración viene apagada */
const planCols = () => ({ fig: ls.get('plFig', false), tech: ls.get('plTech', true), obs: ls.get('plObs', true), thumb: ls.get('plThumb', true) });
/* (lote Y) el ancho de cada columna se cambia arrastrando su título y se guarda en el proyecto (P.schedule.colW, en px
   por clave de PL_COLS): todo el equipo ve los mismos anchos. Las que no tienen el suyo siguen con su ancho automático.
   El PDF y el Excel no cambian. Mínimo de cada columna (las chicas, 32 px) y máximo para todas */
const PL_CW_MIN = { set: 80, loc: 80, tech: 60, obs: 60, cast: 40, t: 44 }, PL_CW_MAX = 800;
const plCwClamp = (k, v) => Math.round(Math.min(PL_CW_MAX, Math.max(PL_CW_MIN[k] || 32, +v || 0)));
// con la Locación más angosta que esto, la miniatura del storyboard deja el lugar a su texto
const PL_TH_MIN = 200;
/* las columnas de la pantalla, en orden (sin el menú ⋮ de las pantallas táctiles) */
const plColKeys = c => PL_COLS.map(x => x[0]).filter(k => k !== 'more' && (k !== 'fig' || c.fig) && (k !== 'tech' || c.tech) && (k !== 'obs' || c.obs));
/* los anchos guardados que sirven: de columnas que existen, en número y dentro del mínimo y el máximo */
function plColW(S) {
  const o = {}, w = S && S.colW;
  if (w && typeof w === 'object' && !Array.isArray(w)) for (const [k, v] of Object.entries(w)) if (k !== 'more' && PL_COLS.some(x => x[0] === k) && Number.isFinite(+v) && +v > 0) o[k] = plCwClamp(k, v);
  return o;
}
/* la plantilla de la grilla: c, las columnas en pantalla; used, si hay notas escritas ({ tech, obs }); cw, los anchos
   guardados. Cada columna lleva su ancho guardado (en px) o el automático; min suma lo menos que ocupa la tabla (más
   que eso, se desplaza a lo ancho) */
function plGrid(c, used, cw) {
  // las notas vacías en todo el plan ceden su ancho a la escena (siguen ahí para escribir)
  const note = f => [used[f] ? 'minmax(140px,1fr)' : 'minmax(130px,.45fr)', 130], th = c.thumb ? 280 : 220;
  const auto = { esc: ['52px', 52], ie: ['42px', 42], set: [`minmax(${th}px,1.7fr)`, th], dn: ['78px', 78], cast: ['112px', 112], fig: ['46px', 46], loc: ['minmax(150px,1fr)', 150], pgs: ['58px', 58], pg: ['40px', 40], t: ['68px', 68], tech: note('tech'), obs: note('obs') };
  const keys = plColKeys(c);
  return { keys, cols: keys.map(k => cw[k] ? cw[k] + 'px' : auto[k][0]), min: keys.reduce((a, k) => a + (cw[k] || auto[k][1]), 0) };
}
const plNotesUsed = () => ({ tech: P.schedule.items.some(it => (it.tech || '').trim()), obs: P.schedule.items.some(it => (it.obs || '').trim()) });
/* las clases del tablero por los anchos guardados: .w-<clave> (la columna corta su texto con «…») y .set-nt */
const plCwCls = (cw, keys) => keys.filter(k => cw[k]).map(k => ' w-' + k).join('') + (keys.includes('set') && cw.set && cw.set < PL_TH_MIN ? ' set-nt' : '');
function planColsCSS() {
  const c = planCols(), cw = plColW(P.schedule);
  // (lote W) sin la columna del menú ⋮: la suma el CSS solo en las pantallas táctiles (--pl-more)
  const G = plGrid(c, plNotesUsed(), cw);
  return { cls: (c.fig ? '' : ' no-fig') + (c.tech ? '' : ' no-tech') + (c.obs ? '' : ' no-obs') + plCwCls(cw, G.keys), style: `--pl-cols:${G.cols.join(' ')};--pl-min:${G.min}px` };
}
/* (lote U) los íconos de la fila: agregar reparto y el menú ⋮ (lote W: sin el asa ni la hoja de desglose) */
const PL_ICO = {
  addCast: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.7-3.4 3.3-5.5 6.5-5.5 1.6 0 3 .5 4.1 1.4M18 13v6M15 16h6"/></svg>',
  vmore: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor" stroke="none"><circle cx="12" cy="5.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="18.5" r="1.4"/></g></svg>',
};
/* el reparto en números (o por nombre, si se eligió); sin reparto, un ícono para agregarlo en el desglose. (lote X) Los
   números van simples, separados por comas («1, 2, 3, 5»), sin círculos; cada uno dice su personaje al pasar el mouse */
function castNums(s, ed) {
  const list = sceneCast(s.idx);
  if (!list.length) return ed ? `<button type="button" class="pl-addcast" data-act="pl-bd" data-k="${ea(s.key)}" aria-label="${ea('Agregar reparto a la escena ' + s.key)}" title="Sin reparto: agrégalo en la hoja de desglose">${PL_ICO.addCast}</button>` : '<span class="none">—</span>';
  if (P.schedule.castMode === 'name') return list.map(e => `<span class="cnm">${esc(titleCase(e.name))}</span>`).join('');
  return `<span class="cns tnum">${list.filter(e => D.castNum[e.id]).map(e => `<span class="cn" title="${ea(titleCase(e.name))}">${D.castNum[e.id]}</span>`).join(', ')}</span>`;
}
/* los octavos como en una tira: el entero grande y la fracción chica (1 ³⁄₈) */
const e8HTML = e => { e = Math.max(0, Math.round(e || 0)); const w = Math.floor(e / 8), f = e % 8; return `<span class="e8">${w || !f ? `<b>${w}</b>` : ''}${f ? `<span class="fr"><sup>${f}</sup>⁄<sub>8</sub></span>` : ''}</span>`; };

/* ---------- horas estimadas (como una tira de rodaje: hora de inicio y duración de cada escena) ----------
   Desde el llamado de la jornada, cada escena dura sus octavos × los minutos por página; los eventos
   (almuerzo, traslado) duran lo de costumbre. Una hora escrita a mano manda y las siguientes la siguen. */
/* 2 horas por página: con las 4,5 páginas por jornada de «Sugerir jornadas», unas 9 horas de rodaje más los eventos */
const MPP0 = 120;
const minPerPage = () => Math.max(5, num(P.schedule.minPerPage) || MPP0);
const EV_MIN = name => /almuerzo|comida|cena/i.test(name) ? 60 : /desayuno|traslado/i.test(name) ? 30 : /maquillaje|vestuario|preparativo/i.test(name) ? 45 : /ensayo/i.test(name) ? 20 : 0;
const hmToMin = v => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '')); return m ? +m[1] * 60 + +m[2] : null; };
const minToHm = m => m == null ? '' : `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;
/* duración escrita a mano: «45», «45 min», «1 h», «1 h 15», «1:15», «1.5 h» → minutos */
function parseDur(v) {
  v = String(v || '').trim().toLowerCase().replace(',', '.'); if (!v) return null;
  let m = /^(\d{1,2}):(\d{1,2})$/.exec(v); if (m) return +m[1] * 60 + +m[2];
  m = /^(\d+(?:\.\d+)?)\s*h(?:oras?|s)?\s*(\d{1,2})?\s*(?:m|min|mins|minutos?)?$/.exec(v); if (m) return Math.round(+m[1] * 60 + +(m[2] || 0));
  m = /^(\d{1,3})\s*(?:m|min|mins|minutos?|')?$/.exec(v); if (m) return +m[1];
  return null;
}
const fmtDur = m => !m ? '' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) : ''}`;
/* el tiempo de una fila sin tiempo escrito: los octavos × los minutos por página (los eventos, lo de costumbre) */
const rowEstDur = it => it.e ? EV_MIN(it.name || '') : Math.max(5, Math.round(partEighths(it) * minPerPage() / 8 / 5) * 5);
/* at: las horas escritas en la hoja de llamado de la jornada ({ clave de la fila: 'HH:MM' }); mandan sobre las del plan.
   durs (lote U): el largo de una escena en esa hoja ({ clave: minutos }), cuando la hora de un plano la alargó; el
   stripboard no cambia */
function planDayTimes(d, at, durs) {
  const out = new Map(), items = P.schedule.items;
  let t = hmToMin(callOf(d.id, d));
  for (const i of d.rows) {
    const it = items[i]; if (!it) continue;
    const own = hmToMin((at && at[itemKey(it)]) || it.t);
    if (own != null) t = own;
    const dur = (durs && num(durs[itemKey(it)])) || num(it.dur) || rowEstDur(it);
    out.set(i, { start: t, dur, est: own == null });
    if (t != null) t += dur;
  }
  out.end = t;
  out.total = [...out.values()].reduce((a, x) => a + (x.dur || 0), 0);
  return out;
}
let PL_TIMES = new Map();

/* ---------- selección de varias filas ---------- */
const PLSEL = { pid: null, keys: new Set(), last: null };
const plSel = () => { if (PLSEL.pid !== (P && P.id)) { PLSEL.pid = P && P.id; PLSEL.keys = new Set(); PLSEL.last = null; } return PLSEL.keys; };

const PL_NOTE = new Set();   // notas abiertas a mano en el teléfono aunque estén vacías («fila:campo»)
/* un campo de una línea cuyo texto no se corta: debajo va una copia que pasa a la línea siguiente entre palabras
   y hace crecer la fila; al escribir se ve el campo */
const wrapIn = (input, val, ph) => `<span class="wfld">${input}<span class="wfld-v${ea(val ? '' : ' ph')}" aria-hidden="true">${esc(val || ph || '')}</span></span>`;
document.addEventListener('input', e => {
  const w = e.target.parentElement; if (!w || !w.classList || !w.classList.contains('wfld')) return;
  const v = w.lastElementChild; v.textContent = e.target.value || e.target.placeholder || ''; v.classList.toggle('ph', !e.target.value);
}, true);
/* la miniatura del storyboard de una escena: la viñeta de su primer plano (se elige en «Columnas en pantalla») */
const planThumbShot = it => it.k && planCols().thumb && typeof thumbCached === 'function' ? (D.shotsBy[it.k] || [])[0] || null : null;
function planThumbHTML(it) {
  const sh = planThumbShot(it); if (!sh) return '';
  const u = thumbCached(sh);
  return `<img class="pl-th${ea(u ? '' : ' wait')}" draggable="false" alt="" src="${ea(u || BLANK)}" ${u ? '' : `data-thumb="${ea(sh.id)}"`}>`;
}
function planRowHTML(i, ed) {
  const it = P.schedule.items[i];
  const dis = ed ? '' : 'disabled';
  const key = itemKey(it), sel = plSel().has(key);
  const notes = `<span class="c-tx c-tech${ea(PL_NOTE.has(key + ':tech') ? ' open' : '')}"><textarea rows="1" data-bind="pl-f" data-f="tech" data-i="${i}" aria-label="Notas técnicas" placeholder="${ea(ed ? 'Notas técnicas' : '')}" ${dis}>${esc(it.tech || '')}</textarea></span>
    <span class="c-tx c-obs${ea(PL_NOTE.has(key + ':obs') ? ' open' : '')}"><textarea rows="1" data-bind="pl-f" data-f="obs" data-i="${i}" aria-label="Observaciones" placeholder="${ea(ed ? 'Observaciones' : '')}" ${dis}>${esc(it.obs || '')}</textarea></span>`;
  // solo el tiempo estimado de la escena (las horas van en la hoja de llamado)
  const est = fmtDur(rowEstDur(it)) || '—';
  const time = `<span class="c-t" title="${ea(it.dur ? 'Tiempo escrito a mano (bórralo para volver al estimado: ' + est + ')' : 'Tiempo estimado por el largo de la escena: escríbelo para cambiarlo')}">${`<input type="text" class="dur" maxlength="10" value="${esc(it.dur ? fmtDur(num(it.dur)) : '')}" placeholder="${esc(fmtDur(rowEstDur(it)))}" data-bind="pl-f" data-f="dur" data-i="${i}" aria-label="Tiempo estimado" ${dis}>`}</span>`;
  // el menú ⋮ al final: en la computadora no se ve (clic derecho sobre la fila); en las pantallas táctiles, sí
  const more = lab => `<span class="c-more"><button type="button" class="pmore" data-act="pl-row" data-i="${i}" aria-haspopup="menu" aria-label="${ea(lab)}" title="Opciones">${PL_ICO.vmore}</button></span>`;
  if (it.e) {
    const hc = hlc(it) || lgCol('plan', 'ev');   // su color de la leyenda: el resaltado, o «Evento»
    return `<div class="prow ev hl${ea(sel ? ' sel' : '')}${ea(lgDark(hc))}" data-i="${i}" data-key="${esc(key)}" style="--rc:${ea(hc)};--rb:${ea(barOf(hc))}">
      <span class="c-evn">${wrapIn(`<input type="text" value="${esc(it.name || '')}" placeholder="Evento" data-bind="pl-f" data-f="name" data-i="${i}" aria-label="Evento" ${dis}>`, it.name, 'Evento')}</span>
      <span class="c-evd">${wrapIn(`<input type="text" value="${esc(it.det || '')}" placeholder="${ea(ed ? 'Detalle: lugar, duración, responsable…' : '')}" data-bind="pl-f" data-f="det" data-i="${i}" aria-label="Detalle" ${dis}>`, it.det, ed ? 'Detalle: lugar, duración, responsable…' : '')}</span>${time}${notes}${more('Opciones del evento')}</div>`;
  }
  const s = sceneOfKey(it.k);
  const set = (P.schedule.setLoc || {})[s.locBase] || '';
  const e8 = partEighths(it);
  // una parte de escena dividida elige sus octavos; la principal se queda con el resto
  let eCell = `<span class="c-n c-pgs tnum" title="${ea(fmtEighths(e8) + ' págs.')}">${e8HTML(e8)}</span>`;
  if (it.sp && ed) {
    const main = P.schedule.items.find(x => x.k === it.k && !x.sp);
    const max = e8 + (main ? partEighths(main) : 0);
    eCell = `<span class="c-n c-pgs"><select class="e8" data-bind="pl-e8" data-i="${i}" aria-label="Octavos de la escena ${esc(rowCode(it))}">${Array.from({ length: max + 1 }, (_, v) => `<option value="${ea(v)}" ${v === e8 ? 'selected' : ''}>${v ? fmtEighths(v) : '0'}</option>`).join('')}</select></span>`;
  }
  const hc = hlc(it), sk = stripKey(s), col = hc || lgCol('plan', sk);   // resaltada con un color de la leyenda; si no, su tira
  const syn = synopsisOf(s), dn = DN_LAB[stripDN(s)], th = planThumbShot(it);
  /* (lote Y) en una columna con su ancho propio el texto se corta con «…» (.tx, en una línea): entero al pasar el mouse */
  const cw = plColW(P.schedule), cut = (k, t) => cw[k] && t ? ` title="${ea(t)}"` : '';
  const ct = castText(s), lv = it.loc || set, lt = it.loc ? '' : set ? 'Locación del decorado «' + titleCase(s.locBase) + '»' : '';
  return `<div class="prow sc${ea(it.sp ? ' part' : '')}${ea(sel ? ' sel' : '')}${ea(lgDark(col))}" data-i="${i}" data-key="${esc(key)}" data-note="scene:${esc(s.key)}" data-strip="${ea(hc ? 'hl' : sk)}" style="--rc:${ea(col)};--rb:${ea(barOf(col))}">
    <span class="c-esc tnum"${cut('esc', rowCode(it))}><span class="tx">${esc(rowCode(it))}</span></span><span class="c-ie"${cut('ie', ieLab(s))}><span class="tx">${esc(ieLab(s))}</span></span>
    <span class="c-set${th ? ' th' : ''}" title="${ea(s.heading + (syn ? ' · ' + syn : ''))}">${planThumbHTML(it)}<b>${esc(setOf(s))}${it.sp ? '<em> (parte ' + esc(it.sp) + ')</em>' : ''}</b><small><span class="m-only${syn ? ' sep' : ''}">${esc(ieLab(s))} · ${esc(dn)}</span>${esc(syn)}</small></span>
    <span class="c-dn"${cut('dn', dn)}><span class="tx">${esc(dn)}</span></span>
    <span class="c-cast"${cut('cast', ct === '—' ? '' : ct)}>${castNums(s, ed)}</span>
    <span class="c-fig"><input type="number" min="0" step="1" value="${ea(it.fig ?? '')}" data-bind="pl-f" data-f="fig" data-i="${i}" aria-label="Figurantes" ${dis}></span>
    <span class="c-loc${lv ? '' : ' none'}">${ICO.pin}${wrapIn(`<input type="text" list="plLocs" value="${esc(lv)}" placeholder="${ed ? 'Asignar locación…' : ''}" data-bind="pl-f" data-f="loc" data-i="${i}" aria-label="Locación de rodaje" title="${ea(cw.loc && lv ? lv + (lt ? ' · ' + lt : '') : lt)}" ${dis}>`, lv, ed ? 'Asignar locación…' : '')}</span>
    ${eCell}<span class="c-n c-pg tnum"${cut('pg', String(D.metrics.page[s.idx]))}><span class="tx">${D.metrics.page[s.idx]}</span></span>${time}${notes}${more('Opciones de la escena ' + rowCode(it))}</div>`;
}
function planBreakHTML(d, n, dates, ed) {
  const b = d.brk, inf = dayInfo(d.keys, d.rows), done = dayDone(d);
  const cast = [...inf.cast].map(id => P.schedule.castMode === 'name' ? titleCase(P.elements[id].name) : D.castNum[id]).sort((a, c) => typeof a === 'number' ? a - c : String(a).localeCompare(c));
  const hc = hlc(b);
  return `<div class="prow brk ${ea(hc ? 'hl' : 'black')}" data-i="${ea(d.i)}" data-n="${n}" data-key="${esc(itemKey(b))}" ${hc ? `style="--rc:${ea(hc)}"` : ''} ${ed ? `title="${ea(TOUCHY ? 'Mantén el dedo' : 'Clic derecho')}: opciones del cierre"` : ''}>
    <b>Cierre de jornada ${n + 1} de ${dates.length}</b>
    <span class="tnum">${fmtEighths(inf.e)} págs.</span><span>${d.keys.length} esc.</span>
    ${inf.locs.size ? `<span>${esc([...inf.locs].join(', '))}</span>` : ''}
    <span class="tnum">Rep. ${esc(cast.join(', ') || '—')}</span>${inf.fig ? `<span class="tnum">Fig. ${inf.fig}</span>` : ''}
    ${done ? `<span class="brk-ok">✓ Completada</span>` : ''}${ed ? `<button class="pdots" data-act="pl-brkm" data-i="${ea(d.i)}" aria-haspopup="menu" aria-label="Opciones del cierre de la jornada ${ea(n + 1)}" title="Opciones del cierre">${ICO.more}</button>` : ''}</div>`;
}
/* barra de inicio de jornada: número, fecha, escenas y tiempo estimado (el llamado y las horas van en la hoja de llamado).
   Se arrastra para mover la jornada entera; clic derecho (o el dedo sostenido) abre sus opciones. */
function planStartHTML(d, n, dates, ed) {
  const dt = dates[n], done = dayDone(d), items = P.schedule.items;
  const clash = n > 0 && dt && dates[n - 1] && dt <= dates[n - 1];
  const dur = (PL_TIMES.totals && PL_TIMES.totals.get(n)) || 0;
  const nsc = d.rows.filter(i => items[i] && items[i].k).length;
  const hc = hlc(d.brk), tone = hc ? 'hl' : 'black';
  return `<div class="pstart ${ea(tone)}" data-n="${n}" ${hc ? `style="--rc:${ea(hc)}"` : ''} ${ed ? `title="Arrastra para mover la jornada · ${ea(TOUCHY ? 'mantén el dedo' : 'clic derecho')}: opciones"` : ''}>
    <b>Jornada ${n + 1}</b>
    <button class="pdate" data-act="pl-date" data-n="${n}" ${ed ? '' : 'disabled'} title="${ea(ed ? 'Cambiar la fecha de esta jornada' : '')}">${dt ? esc(cap1(fmtDate(dt))) : 'Sin fecha'}${d.brk.date ? '<i title="Fecha fijada a mano">●</i>' : ''}</button>
    <span class="tnum">${nsc} esc.</span>${(E => E.length ? `<span class="pl-eps tnum" title="Episodios de esta jornada">Ep. ${esc(E.join(' · '))}</span>` : '')(epsOfKeys(d.keys))}${dur ? `<span class="tnum" title="Tiempo estimado de la jornada (suma de sus escenas y eventos)">${esc(fmtDur(dur))}</span>` : ''}
    ${clash ? `<span class="pwarn" title="Esta fecha no va después de la jornada anterior">${ICO.warn} fecha</span>` : ''}${done ? `<span class="brk-ok" title="${ea(done === 'script' ? 'Todos sus planos están rodados en la hoja de script' : 'Marcada como completada')}">✓ Completada</span>` : ''}${ed ? `<button class="pdots pplus" data-act="pl-ev" data-n="${n}" aria-haspopup="menu" aria-label="Agregar evento con hora a la jornada ${ea(n + 1)}" title="Agregar evento con hora (traslado, comida, ensayo…)">+</button><button class="pdots" data-act="pl-day" data-n="${n}" aria-haspopup="menu" aria-label="Opciones de la jornada ${ea(n + 1)}" title="Opciones de la jornada">${ICO.more}</button>` : ''}</div>`;
}
function planDayHTML(d, n, dates, ed) {
  const done = dayDone(d);
  const tone = stageTone(P, d.stage);
  return `<section class="pday${ea(done ? ' done' : '')}" data-n="${n}" style="--stg:${ea(tone)}">
    ${planStartHTML(d, n, dates, ed)}
    <div class="pday-rows">${d.rows.map(i => planRowHTML(i, ed)).join('')}${!d.rows.length ? `<div class="prow empty"><span class="c-empty">Jornada sin escenas. Muévelas aquí con clic derecho › Mover a, o arrástralas.</span></div>` : ''}${planBreakHTML(d, n, dates, ed)}</div>
  </section>`;
}
function selBarHTML(days, dates) {
  const n = plSel().size;
  if (!n || !planEditable()) return '';
  return `<span><b>${n}</b> ${n === 1 ? 'fila seleccionada' : 'filas seleccionadas'}</span>
    <select data-bind="pl-movesel" aria-label="Mover la selección"><option value="">Mover a…</option>${days.map((d, j) => `<option value="${esc(d.id)}">Jornada ${j + 1}${dates[j] ? ' · ' + esc(fmtDate(dates[j])) : ''}</option>`).join('')}<option value="bank">Sin programar</option></select>
    <button class="btn sm ghost" data-act="pl-selnone">Quitar selección</button>`;
}
/* la cabecera del plan (lote I): las fechas del rodaje como título, la fecha de inicio y si quedan escenas sin jornada
   junto al título, y lo que más se mira en una tarjeta (jornadas, completadas con su barra y páginas) */
function planHeadHTML(o) {
  const { days, dates, shootDays, doneDays, totalE, bank, stages, ed } = o;
  const d0 = dates[0], d1 = dates[dates.length - 1];
  const dm = x => x.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' }), title = !d0 ? 'Plan de rodaje'
    : d0.getTime() === d1.getTime() ? capFirst(dm(d0)) : d0.getMonth() === d1.getMonth() && d0.getFullYear() === d1.getFullYear() ? `${d0.getDate()} – ${dm(d1)}` : `${dm(d0)} – ${dm(d1)}`;
  const S = P.schedule, scn = days.reduce((a, d) => a + d.rows.filter(i => S.items[i] && S.items[i].k).length, 0);
  const start = `<label class="hd-date${ed ? '' : ' ro'}" title="Fecha de la primera jornada">${HD_ICO.cal}<span>Empieza</span>${fechaFieldHTML({ iso: d0 ? isoDay(d0) : S.start || '', key: 'pl-start', label: 'Fecha de la primera jornada', disabled: !ed })}</label>`;
  const act = (bank.length ? hdPill('warn', `${bank.length === 1 ? 'escena' : 'escenas'} sin programar`, { n: bank.length, attrs: 'data-act="pl-gobank" title="Ir a «Sin programar»"' }) : days.length ? hdPill('ok', 'Todo programado') : '') + start;
  return `<section class="hd pl-hd" aria-label="Cabecera del plan de rodaje">${hdHead({ title: esc(title), sub: `<span data-no-tr>${esc(P.meta.title || '')}</span> · Plan de rodaje${stages.length ? ` · ${stages.length} ${stages.length === 1 ? 'etapa' : 'etapas'}` : ''}`, act })}
    ${hdPass([
      { lab: 'Jornadas', cls: 'big', val: `${shootDays}`, cap: `${scn} ${scn === 1 ? 'escena programada' : 'escenas programadas'}` },
      { lab: 'Completadas', val: `${doneDays} <small>de ${days.length}</small>`, html: `<div class="hd-bar" role="progressbar" aria-label="Jornadas completadas" aria-valuemin="0" aria-valuemax="${days.length}" aria-valuenow="${doneDays}"><i style="width:${days.length ? (doneDays / days.length * 100).toFixed(1) : 0}%"></i></div>` },
      { lab: 'Páginas', val: esc(fmtEighths(totalE)), cap: `${shootDays ? (totalE / 8 / shootDays).toFixed(1) : '0'} por jornada`, wide: true },
    ])}</section>`;
}
RENDER.plan = function () {
  const v = $('#view');
  if (!D.sc.scenes.length) { v.innerHTML = emptyScript(); bindView(); return; }
  const S = P.schedule;
  const ed = planEditable();
  const { days, bank, bankRows } = scheduleDays(P, D.sc);
  const dates = shootDates(P, days.length);
  PL_TIMES = new Map(); PL_TIMES.ends = new Map(); PL_TIMES.totals = new Map();
  days.forEach((d, n) => { const T = planDayTimes(d); for (const [i, x] of T) PL_TIMES.set(i, x); PL_TIMES.ends.set(n, T.end); PL_TIMES.totals.set(n, T.total); });
  // la selección solo guarda filas que siguen existiendo
  const live = new Set(S.items.map(itemKey));
  for (const k of [...plSel()]) if (!live.has(k)) plSel().delete(k);
  const totalE = D.metrics.eighths.reduce((a, b) => a + b, 0);
  const shootDays = days.filter(d => d.keys.length).length;
  const doneDays = days.filter(d => dayDone(d)).length;
  const stages = S.stages || [];
  // jornadas agrupadas por etapa
  const blocks = [];
  days.forEach((d, n) => {
    const last = blocks[blocks.length - 1];
    if (!last || last.stage !== d.stage) blocks.push({ stage: d.stage, days: [] });
    blocks[blocks.length - 1].days.push([d, n]);
  });
  const stageHead = b => {
    const st = stages.find(x => x.id === b.stage);
    if (!st) return '';
    const a = b.days[0][1], z = b.days[b.days.length - 1][1];
    return `<div class="pl-stage" style="--stg:${ea(stageTone(P, st.id))}"><b>Etapa ${stages.indexOf(st) + 1}${st.name ? ' · ' + esc(st.name) : ''}</b>${st.place ? `<span>${esc(st.place)}</span>` : ''}
      <span>${a === z ? 'Jornada ' + (a + 1) : `Jornadas ${a + 1} a ${z + 1}`}${dates[a] ? ' · ' + esc(fmtDate(dates[a])) + (a !== z && dates[z] ? ' → ' + esc(fmtDate(dates[z])) : '') : ''}</span>
      ${ed ? '<button class="x" data-act="pl-stages">Editar etapas</button>' : ''}</div>`;
  };
  const body = blocks.map(b => stageHead(b) + plHeadHTML() + b.days.map(([d, n]) => planDayHTML(d, n, dates, ed)).join('')).join('')
    + (bankRows.length ? `<div class="pl-stage bank"><b>Sin programar</b><span>${bank.length} ${bank.length === 1 ? 'escena' : 'escenas'}</span>${ed ? '<button class="x" data-act="pl-bank" title="Propone jornadas nuevas al final con estas escenas, por locación y día o noche (se puede deshacer)">Sugerir jornadas</button>' : ''}</div>${plHeadHTML()}
      <section class="pday bank"><div class="pday-rows">${bankRows.map(i => planRowHTML(i, ed)).join('')}</div></section>` : '');
  const off = new Set(S.off || []);
  const castLegend = Object.entries(D.castNum).sort((a, b) => a[1] - b[1]).map(([id, n]) => `<span><b>${n}</b> ${esc(titleCase(P.elements[id].name))}</span>`).join('');
  const PC = planColsCSS();
  const locNames = [...new Set([...(S.locs || []).map(l => l.name), ...Object.values(S.setLoc || {}), ...S.items.map(it => it.loc)].filter(Boolean))];
  // (lote U) arriba la pestaña es «Plan de rodaje»; abajo, sus dos vistas: «Stripboard» (la tabla de jornadas, donde se
  // edita el plan) y «DOOD» (días por actor, plan-dood.js)
  const dood = ls.get('plView', 'days') === 'cast';
  v.innerHTML = `<div class="ws ws-1"><section class="center">
    <div class="bar">
      ${hdSeg([{ label: 'Stripboard', attrs: 'data-act="pl-view" data-v="days" title="Las jornadas con sus tiras: una fila por escena"', on: !dood }, { label: 'DOOD', attrs: 'data-act="pl-view" data-v="cast" title="Qué jornadas trabaja cada actor (días por actor)"', on: dood }], 'Vista del plan')}
      <span class="grow"></span>
      ${ed ? hdBtn('sec', 'Locaciones…', { sm: true, cls: 'hide-sm', attrs: 'data-act="pl-locs" aria-haspopup="dialog" title="Cambiar el nombre de las locaciones de rodaje (cambia todas sus escenas)"' }) : ''}
      ${ed && !dood && isSeries(P) ? hdBtn('sec', 'Bloque', { icon: 'plus', sm: true, cls: 'hide-sm', attrs: 'data-act="pl-block" aria-haspopup="dialog" title="Jornadas con las escenas de varios episodios juntas, por locación (rodaje por bloques)"' }) : ''}
      ${ed && !dood ? hdBtn('sec', 'Etapa', { icon: 'plus', sm: true, cls: 'hide-sm', attrs: 'data-act="pl-addstage" aria-haspopup="dialog" title="Una etapa nueva: su nombre y desde qué jornada empieza"' }) + hdBtn('tint', 'Jornada', { icon: 'plus', sm: true, cls: 'm-more', attrs: 'data-act="pl-addday" title="Agrega una jornada vacía al final"' }) : ''}
      ${toolsHTML()}
    </div>
    <div class="scroller pad" data-keep="plan"><div class="plan">
      ${planHeadHTML({ days, dates, shootDays, doneDays, totalE, bank, stages, ed })}
      ${dood ? doodHTML() : `${ed ? '' : '<p class="hint" style="margin:-4px 0 0">Plan de rodaje de solo lectura.</p>'}
      ${ed && !days.length ? `<div class="pl-start"><b>Arma las jornadas a tu manera.</b> Crea una con «+ Jornada» y arrastra a ella las escenas de «Sin programar». Si prefieres una propuesta para empezar, usa «Sugerir jornadas»: se puede deshacer.<span class="pl-start-b"><button class="btn primary sm" data-act="pl-addday">+ Jornada</button><button class="btn sm" data-act="pl-bank">Sugerir jornadas</button></span></div>` : ''}
      ${ed ? (TOUCHY ? tipHTML('plan-drag2', 'Mantén el dedo sobre una escena para moverla. En la barra de la jornada: mantén el dedo y arrastra para moverla entera, o suelta para ver sus opciones.') : tipHTML('plan-drag3', 'Arrastra una escena desde cualquier parte para moverla; arrastra desde un espacio vacío para elegir varias. Arrastra la barra de la jornada para moverla entera. Clic derecho en una escena o en una barra: sus opciones (y la hoja de desglose).')) : ''}
      ${legendHTML('plan')}
      <div class="pl-scroll"><div class="pl${ea(ed ? ' pl-ed' : '')}${ea(plSel().size ? ' selecting' : '')}${ea(PC.cls)}" id="board" style="${ea(PC.style)}">${body}</div></div>
      <datalist id="plLocs">${locNames.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <div class="card pl-legend"><div class="eyebrow" style="margin-bottom:8px">Reparto</div><div class="castlegend">${castLegend || '<span class="hint">Marca personajes en el guion para numerarlos.</span>'}</div>
        <div class="pl-key">${stages.length ? `<span><i style="background:${ea(STAGE_TONES[0])};border-radius:50%"></i>Etapa</span>` : ''}<span><i class="ok"></i>Jornada completada</span></div></div>
      <div class="pl-selbar" id="plSelBar" ${plSel().size && ed ? '' : 'hidden'}>${selBarHTML(days, dates)}</div>`}
    </div></div></section></div>`;
  bindView();
  if (!dood) { bindBoard(); if (planCols().thumb && typeof hydrateThumbs === 'function') hydrateThumbs(); }
};
function paintSel() {
  const sel = plSel();
  $$('#board .prow[data-key]').forEach(r => r.classList.toggle('sel', sel.has(r.dataset.key)));
  const bd = $('#board'); if (bd) bd.classList.toggle('selecting', sel.size > 0);
  const bar = $('#plSelBar'); if (!bar) return;
  const { days } = scheduleDays(P, D.sc);
  bar.innerHTML = selBarHTML(days, shootDates(P, days.length));
  bar.hidden = !sel.size;
}
/* el dedo sostenido sobre una barra: soltar sin mover abre sus opciones; moverlo arrastra (si se puede) */
function heldBar(ev, bar, { onMenu, onDrag }) {
  const x0 = ev.clientX, y0 = ev.clientY;
  bar.classList.add('held');
  const off = () => { bar.classList.remove('held'); removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', off, true); };
  const mv = e => { if (!onDrag || Math.hypot(e.clientX - x0, e.clientY - y0) < 8) return; off(); onDrag(e); };
  const up = () => { off(); onMenu(); };
  addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', off, true);
}
/* menú del cierre de jornada (clic derecho o dedo sostenido) */
function brkMenu(anchor, i) {
  const { days } = scheduleDays(P, D.sc);
  const n = days.findIndex(d => d.i === i); if (n < 0) return;
  const last = n === days.length - 1, ed = planEditable();
  popover(anchor, `<h5>Cierre de jornada ${n + 1}</h5>${ed ? `<div class="menu">
    <button data-m="unbreak">${last ? 'Quitar corte (sus escenas pasan a Sin programar)' : `Quitar corte (unir con la jornada ${n + 2})`}</button>
    <button data-m="day">Opciones de la jornada ${n + 1}…</button></div>` : '<p class="hint" style="margin:0">Solo lectura.</p>'}`, p => {
    p.addEventListener('click', e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      closePop();
      if (b.dataset.m === 'day') { dayMenu(anchor, n); return; }
      P.schedule.items.splice(i, 1); changed('data'); render();
      toastUndo(last ? `Jornada ${n + 1} quitada: sus escenas están en Sin programar.` : `Jornadas ${n + 1} y ${n + 2} unidas.`);
    });
  });
}
const ptAnchor = e => ({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY });
function bindBoard() {
  const board = $('#board');
  if (!board) return;
  // con el ratón: presionar y mover una escena (o la barra de inicio de jornada) la arrastra al instante;
  // desde un espacio vacío se dibuja un recuadro para elegir varias. En el teléfono: mantener el dedo.
  let touchAt = 0;
  // (lote Y) el asa de un título: arrastrarla cambia el ancho de su columna; doble clic, vuelve al automático. Va antes
  // que lo demás: no arrastra filas, no ordena ni empieza un recuadro de selección
  board.addEventListener('pointerdown', e => {
    const h = e.target.closest('.pl-rz'); if (!h) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (e.button === 0 && e.pointerType !== 'touch' && planEditable()) startColResize(e, h);
  });
  board.addEventListener('dblclick', e => { const h = e.target.closest('.pl-rz'); if (h && planEditable() && plColW(P.schedule)[h.dataset.c]) planColSet(h.dataset.c, null); });
  board.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') touchAt = Date.now();
    if (e.button !== 0 || e.target.closest('.pdots')) return;
    const ed = planEditable();
    const bar = e.target.closest('.pstart');
    if (bar) {
      if (e.target.closest('input,textarea,select')) return;
      const n = +bar.dataset.n;
      if (e.pointerType === 'touch') pressGesture(e, { target: bar, onLift: ev => heldBar(ev, bar, { onMenu: () => dayMenu(bar, n), onDrag: ed ? e2 => startDayDrag(e2, n) : null }) });
      else if (ed) pressGesture(e, { target: bar, onLift: ev => startDayDrag(ev, n) });
      return;
    }
    const row = e.target.closest('.prow[data-i]');
    if (row && row.classList.contains('brk')) {
      if (e.pointerType === 'touch' && !e.target.closest('input')) pressGesture(e, { target: row, onLift: ev => heldBar(ev, row, { onMenu: () => brkMenu(row, +row.dataset.i) }) });
      return;
    }
    if (!ed) return;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (!row) return;   // espacio vacío: lo atiende el desplazable de la pestaña (recuadro)
    pressGesture(e, { target: row, onLift: ev => startDrag(ev, row) });
  });
  // recuadro para elegir varias: desde cualquier espacio vacío de la pestaña (márgenes, entre jornadas)
  const scroller = board.closest('.scroller');
  if (scroller && !scroller.dataset.sweep) {
    scroller.dataset.sweep = '1';
    scroller.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.pointerType === 'touch' || !planEditable()) return;
      if (e.target.closest('.prow, .pstart, .pl-selbar, .pl-rz, .hd, .card, .tip, input,textarea,select,button,a,label,summary')) return;
      pressGesture(e, { onSweep: () => planSweep(e, e.shiftKey || e.ctrlKey || e.metaKey) });
    });
  }
  // clic en una fila: la elige · otra vez: la suelta · Ctrl/⌘: suma o quita · Mayús: tramo. Los campos se editan sin elegir.
  board.addEventListener('click', e => {
    const row = e.target.closest('.prow.sc[data-key], .prow.ev[data-key]');
    if (!row || !planEditable() || e.target.closest('input,textarea,select,button,a,label')) return;
    const sel = plSel(), key = row.dataset.key;
    if (e.shiftKey && PLSEL.last) {
      const keys = $$('#board .prow.sc[data-key], #board .prow.ev[data-key]').map(r => r.dataset.key);
      const a = keys.indexOf(PLSEL.last), b = keys.indexOf(key);
      if (a >= 0 && b >= 0) for (const k of keys.slice(Math.min(a, b), Math.max(a, b) + 1)) sel.add(k);
    } else if (e.ctrlKey || e.metaKey) { sel.has(key) ? sel.delete(key) : sel.add(key); }
    else { const only = sel.size === 1 && sel.has(key); sel.clear(); if (!only) sel.add(key); }
    PLSEL.last = key;
    paintSel();
  });
  board.addEventListener('contextmenu', e => {
    // en el teléfono, el dedo sostenido ya abre las opciones de las barras
    const bar = e.target.closest('.pstart, .prow.brk');
    if (bar && Date.now() - touchAt < 1500) { e.preventDefault(); return; }
    if (bar && bar.classList.contains('pstart')) { e.preventDefault(); dayMenu(ptAnchor(e), +bar.dataset.n); return; }
    if (bar) { if (/^INPUT$/.test(e.target.tagName)) return; e.preventDefault(); brkMenu(ptAnchor(e), +bar.dataset.i); return; }
    const row = e.target.closest('.prow[data-i]');
    if (!row) return;
    const t = e.target;
    // en un campo con texto seleccionado queda el menú del sistema (copiar, pegar)
    if (/^(INPUT|TEXTAREA)$/.test(t.tagName) && t.selectionStart !== t.selectionEnd) return;
    e.preventDefault();
    stripMenu(ptAnchor(e), +row.dataset.i);
  });
  deselectOn('plan', () => { if (plSel().size) { plSel().clear(); paintSel(); } }, '.prow[data-key], .pstart, #plSelBar, .pl-rz');
  if (!bindBoard.keys) {
    bindBoard.keys = true;
    addEventListener('keydown', e => { if (e.key === 'Escape' && UI.tab === 'plan' && plSel().size && !$('#modal') && !$('#pop')) { plSel().clear(); paintSel(); } });
  }
}
/* recuadro de selección sobre las filas del plan */
function planSweep(start, additive) {
  const board = $('#board'); if (!board) return;
  const base = additive ? new Set(plSel()) : new Set();
  sweepSelect(start, {
    scroller: board.closest('.scroller'), axis: 'y',
    items: () => $$('#board .prow.sc[data-key], #board .prow.ev[data-key]'),
    onPick: (hit, fin) => {
      const sel = plSel(); sel.clear();
      for (const k of base) sel.add(k);
      for (const r of hit) sel.add(r.dataset.key);
      if (hit.length) PLSEL.last = hit[hit.length - 1].dataset.key;
      paintSel();
      if (fin && hit.length > 1) toast(`${sel.size} filas elegidas: arrastra una para moverlas juntas. Clic en un espacio vacío para soltarlas.`, 2600);
    },
  });
}
/* ---------- (lote Y) el ancho de las columnas ----------
   Se arrastra el asa del borde derecho de un título: la columna cambia de ancho junto con el ratón (la grilla se
   actualiza en --pl-cols, sin volver a pintar el plan) y al soltar queda guardada en el proyecto, en un solo paso del
   historial. Esc cancela. Una línea a lo alto del plan marca el borde mientras se arrastra. */
function startColResize(e, h) {
  const board = $('#board'), head = h.parentElement, k = h.dataset.c;
  const c = planCols(), used = plNotesUsed(), cw0 = plColW(P.schedule), keys = plColKeys(c), j = keys.indexOf(k);
  if (!board || j < 0) return;
  // el ancho de ahora, el que se ve (el automático o el guardado)
  const tracks = () => getComputedStyle(head).gridTemplateColumns.split(' ').map(parseFloat);
  const w0 = Math.round(tracks()[j]) || cw0[k] || 100, x0 = e.clientX;
  let w = w0, moved = false, raf = 0;
  const line = document.createElement('div');
  line.className = 'pl-rzline';
  h.classList.add('on'); document.documentElement.classList.add('pl-rzing');
  try { h.setPointerCapture(e.pointerId); } catch (er) { }
  const paint = () => {
    raf = 0;
    const cw = { ...cw0, [k]: w }, G = plGrid(c, used, cw);
    board.style.setProperty('--pl-cols', G.cols.join(' '));
    board.style.setProperty('--pl-min', G.min + 'px');
    board.classList.add('w-' + k);
    board.classList.toggle('set-nt', keys.includes('set') && !!cw.set && cw.set < PL_TH_MIN);
    // la línea, en el borde derecho de la columna (lo que suman sus columnas desde la izquierda)
    const t = tracks(), x = head.getBoundingClientRect().left + t.slice(0, j + 1).reduce((a, b) => a + b, 0);
    line.style.left = (x - board.getBoundingClientRect().left) + 'px';
    if (!line.isConnected) board.appendChild(line);
  };
  const move = ev => {
    if (!moved && Math.abs(ev.clientX - x0) < 3) return;   // un clic (o el de un doble clic) no cambia nada
    moved = true;
    const nw = plCwClamp(k, w0 + ev.clientX - x0);
    if (nw !== w || !line.isConnected) { w = nw; if (!raf) raf = requestAnimationFrame(paint); }
  };
  const end = ev => {
    cancelAnimationFrame(raf);
    removeEventListener('pointermove', move, true); removeEventListener('pointerup', end, true); removeEventListener('pointercancel', end, true);
    removeEventListener('keydown', onEsc, true);
    line.remove(); h.classList.remove('on'); document.documentElement.classList.remove('pl-rzing');
    const ok = ev && ev.type === 'pointerup' && moved && w !== (cw0[k] || w0);
    if (ok && planEditable()) planColSet(k, w);
    else if (moved) render();   // vuelve a como estaba
  };
  const onEsc = ev => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); end({ type: 'cancel' }); } };
  addEventListener('pointermove', move, true); addEventListener('pointerup', end, true); addEventListener('pointercancel', end, true);
  addEventListener('keydown', onEsc, true);
}
/* guarda el ancho de una columna (null: vuelve al automático) como un paso del historial */
function planColSet(k, w) {
  const col = PL_COLS.find(x => x[0] === k); if (!col || !planEditable()) return;
  const cw = plColW(P.schedule);
  if (w == null) { if (!(k in cw)) return; delete cw[k]; } else cw[k] = plCwClamp(k, w);
  histNote(`Ancho de la columna «${col[1]}»`);
  if (Object.keys(cw).length) P.schedule.colW = cw; else delete P.schedule.colW;
  changed('data'); render();
}
function startDrag(e, row) {
  const board = $('#board'), scroller = board.closest('.scroller');
  const items = P.schedule.items, it = items[+row.dataset.i];
  const sel = plSel();
  const multi = sel.has(itemKey(it)) && sel.size > 1;
  const keys = multi ? new Set(sel) : new Set([itemKey(it)]);
  const rect = row.getBoundingClientRect();
  // la copia que sigue al puntero conserva las columnas de la fila (sin esto se apilaba en una columna)
  const ghost = row.cloneNode(true);
  ghost.classList.add('ghost');
  Object.assign(ghost.style, { width: rect.width + 'px', left: rect.left + 'px', top: rect.top + 'px', gridTemplateColumns: getComputedStyle(row).gridTemplateColumns, height: rect.height + 'px' });
  if (multi) { const b = document.createElement('span'); b.className = 'gcount'; b.textContent = keys.size + ' filas'; ghost.appendChild(b); }
  document.body.appendChild(ghost);
  // las demás filas que viajan se pliegan: el hueco las representa a todas
  const others = $$('.prow[data-key]', board).filter(r => r !== row && keys.has(r.dataset.key));
  const H = rect.height + others.reduce((a, r) => a + r.getBoundingClientRect().height, 0);
  others.forEach(r => r.classList.add('gone'));
  row.classList.add('ph'); row.style.height = Math.min(H, rect.height * 3) + 'px';
  if (multi) row.dataset.count = keys.size + ' filas';
  document.body.classList.add('lifting');
  const dy = e.clientY - rect.top;
  let lastY = e.clientY, raf = 0, moved = false;
  const live = () => $$('.prow[data-i]', board).filter(r => r !== row && !r.classList.contains('gone') && !r.classList.contains('empty'));
  const place = y => {
    ghost.style.top = (y - dy) + 'px';
    const rows = live();
    const next = rows.find(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; });
    const after = next || rows[rows.length - 1];
    if (!after) return;
    if (next ? row.nextElementSibling === next : after.nextElementSibling === row) return;
    // las demás filas se corren con una animación para hacerle espacio
    const near = rows.filter(r => { const b = r.getBoundingClientRect(); return b.bottom > -200 && b.top < innerHeight + 200; });
    const snap = flipSnap(near);
    if (next) next.parentNode.insertBefore(row, next); else after.parentNode.insertBefore(row, after.nextElementSibling);
    flipPlay(snap);
    moved = true;
    // la jornada que recibe se marca
    $$('.pday.target', board).forEach(x => x.classList.remove('target'));
    const sec = row.closest('.pday'); if (sec) sec.classList.add('target');
  };
  const tick = () => { edgeScroll(scroller, 0, lastY); place(lastY); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  const move = ev => { lastY = ev.clientY; };
  const up = ev => {
    cancelAnimationFrame(raf);
    removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
    removeEventListener('keydown', esc, true);
    ghost.remove(); document.body.classList.remove('lifting');
    flipClear($$('.prow', board));
    const cancel = ev && ev.type !== 'pointerup';
    if (cancel || !moved) { render(); return; }
    const dom = $$('.prow[data-i]', board).map(r => +r.dataset.i);
    if (dom.length !== items.length) { render(); return; }
    // las filas que se mueven entran juntas, en su orden, antes de la primera fila que quedó debajo
    const pos = dom.indexOf(+row.dataset.i);
    let next = null;
    for (let p = pos + 1; p < dom.length; p++) { const x = items[dom[p]]; if (!keys.has(itemKey(x))) { next = x; break; } }
    const moving = items.filter(x => keys.has(itemKey(x)));
    const rest = dom.map(i => items[i]).filter(x => !keys.has(itemKey(x)));
    rest.splice(next ? rest.indexOf(next) : rest.length, 0, ...moving);
    const changedOrder = rest.some((x, j) => x !== items[j]);
    if (changedOrder) {
      const before = scheduleDays(P, D.sc).days.map(d => d.keys.join());
      P.schedule.items = rest; changed('data');
      const after = scheduleDays(P, D.sc).days.map(d => d.keys.join());
      const n = after.filter((k, j) => k !== before[j]).length;
      if (n) toastUndo(`${moving.length === 1 ? 'Escena movida' : moving.length + ' filas movidas'}${n > 1 ? `: cambian ${n} jornadas` : ''}.`, 4200);
    }
    render();
  };
  const esc = ev => { if (ev.key === 'Escape') { ev.preventDefault(); up({ type: 'cancel' }); } };
  addEventListener('pointermove', move, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  addEventListener('keydown', esc, true);
}
/* ---------- mover jornadas enteras ----------
   Cada jornada es el tramo de filas que termina en su cierre (que guarda fecha fijada, color, etapa y estado).
   Se mueve el tramo completo: la fecha fijada viaja con la jornada y las automáticas siguen el nuevo orden;
   cada jornada conserva su etapa. La hoja de llamado está guardada por jornada, no por posición. */
function moveDay(from, to) {
  const S = P.schedule, items = S.items;
  const { days } = scheduleDays(P, D.sc);
  if (from === to || !days[from] || to < 0 || to >= days.length) return false;
  const staged = (S.stages || []).length > 0;
  if (staged) for (const d of days) d.brk.st = d.stage;
  const start = i => (i === 0 ? 0 : days[i - 1].i + 1);
  const blocks = days.map((d, i) => items.slice(start(i), d.i + 1));
  const bank = items.slice(days[days.length - 1].i + 1);
  const [b] = blocks.splice(from, 1);
  blocks.splice(to, 0, b);
  S.items = blocks.flat().concat(bank);
  if (staged) {
    let prev = null;
    for (const d of scheduleDays(P, D.sc).days) { if (d.brk.st === prev) delete d.brk.st; else prev = d.brk.st; }
    sortStages();
  }
  return true;
}
function dayMoved(to) {
  toastUndo(`Jornada movida a la posición ${to + 1}. Las fechas automáticas siguen el nuevo orden.`, 5000);
  requestAnimationFrame(() => { const s = $(`.pday[data-n="${to}"]`); if (s) { s.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); s.classList.add('flash'); setTimeout(() => s.classList.remove('flash'), 1200); } });
}
function startDayDrag(e, n) {
  const board = $('#board'), scroller = board.closest('.scroller');
  const sec = $(`.pday[data-n="${n}"]`, board); if (!sec) return;
  const { days } = scheduleDays(P, D.sc), dates = shootDates(P, days.length), d = days[n];
  const nsc = d.rows.filter(i => P.schedule.items[i].k).length;
  const ghost = document.createElement('div');
  ghost.className = 'pday-ghost';
  ghost.innerHTML = `<b>Jornada ${n + 1}</b><span>${dates[n] ? esc(fmtDate(dates[n])) + ' · ' : ''}${nsc} ${nsc === 1 ? 'escena' : 'escenas'}</span>`;
  document.body.appendChild(ghost);
  // la jornada levantada se pliega y las demás le hacen espacio mientras se arrastra
  sec.classList.add('lifted');
  document.body.classList.add('lifting');
  const secs = () => $$('.pday[data-n]', board).filter(s => !s.classList.contains('bank'));
  let lastX = e.clientX, lastY = e.clientY, raf = 0, moved = false;
  const place = () => {
    ghost.style.left = (lastX + 14) + 'px'; ghost.style.top = (lastY - 18) + 'px';
    const all = secs(), list = all.filter(s => s !== sec);
    const next = list.find(s => { const r = s.getBoundingClientRect(); return lastY < r.top + Math.min(r.height / 2, 60); });
    const want = next ? list.indexOf(next) : list.length;
    if (all.indexOf(sec) === want) return;
    const near = [...list, ...$$('.pl-stage, .pl-head', board)].filter(x => { const r = x.getBoundingClientRect(); return r.bottom > -300 && r.top < innerHeight + 300; });
    const snap = flipSnap(near);
    if (next) next.parentNode.insertBefore(sec, next); else { const last = list[list.length - 1]; if (last) last.parentNode.insertBefore(sec, last.nextElementSibling); }
    flipPlay(snap);
    moved = true;
  };
  const tick = () => { edgeScroll(scroller, 0, lastY); place(); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  const move = ev => { lastX = ev.clientX; lastY = ev.clientY; };
  const up = ev => {
    cancelAnimationFrame(raf);
    removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
    removeEventListener('keydown', onEsc, true);
    ghost.remove(); sec.classList.remove('lifted'); document.body.classList.remove('lifting');
    const target = secs().indexOf(sec);
    if (ev && ev.type === 'pointerup' && moved && target >= 0 && target !== n && moveDay(n, target)) { changed('data'); render(); dayMoved(target); }
    else render();
  };
  const onEsc = ev => { if (ev.key === 'Escape') { ev.preventDefault(); up({ type: 'cancel' }); } };
  addEventListener('pointermove', move, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  addEventListener('keydown', onEsc, true);
}
/* mover filas (por su identidad) al final de una jornada o a «sin programar» */
function moveItems(keys, target) {
  const items = P.schedule.items;
  const moving = items.filter(x => keys.has(itemKey(x)) && !x.d);
  if (!moving.length) return 0;
  const rest = items.filter(x => !moving.includes(x));
  if (target === 'bank') rest.push(...moving);
  else { const at = rest.findIndex(x => x.d === target); if (at < 0) return 0; rest.splice(at, 0, ...moving); }
  P.schedule.items = rest;
  return moving.length;
}
/* ---------- ordenar por columna (lote U) ----------
   Tocar el título de una columna ordena las escenas dentro de cada jornada y dentro de «Sin programar»: ninguna escena
   pasa a otra jornada, los eventos (traslados, comidas) y los cortes se quedan en su lugar y las escenas ocupan, en el
   orden nuevo, los lugares que tenían. Otra vez el mismo título: al revés. Se deshace con el historial. */
const PL_IE = { INT: 0, EXT: 1, 'INT/EXT': 2 }, PL_DN = { am: 0, d: 1, at: 2, n: 3 };
const spRank = sp => String(sp || '').split('').reduce((a, ch) => a * 27 + (ch.charCodeAt(0) - 64), 0);
function planSortVal(c, it) {
  const s = it.k && sceneOfKey(it.k); if (!s) return '';
  if (c === 'esc') return s.idx * 1e4 + spRank(it.sp);
  if (c === 'ie') return PL_IE[s.ie] ?? 3;
  if (c === 'set') return setOf(s);
  if (c === 'dn') return PL_DN[stripDN(s)];
  if (c === 'loc') return planLoc(it, s);
  if (c === 'pgs') return partEighths(it);
  return '';
}
/* items: las filas del plan; val(fila) → número o texto; dir: 1 o -1. Devuelve las filas en el orden nuevo (no cambia
   items). Lo vacío va al final en los dos sentidos */
function sortInDays(items, val, dir) {
  const out = items.slice();
  const cmp = (a, b) => {
    const ea_ = a === '' || a == null, eb = b === '' || b == null;
    if (ea_ || eb) return ea_ === eb ? 0 : ea_ ? 1 : -1;
    return (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' })) * dir;
  };
  let seg = [];
  const flush = () => {
    const at = seg.filter(i => items[i].k);
    const sorted = at.map((i, j) => ({ it: items[i], j, v: val(items[i]) })).sort((a, b) => cmp(a.v, b.v) || a.j - b.j);
    at.forEach((i, j) => { out[i] = sorted[j].it; });
    seg = [];
  };
  items.forEach((it, i) => { if (it.d) flush(); else seg.push(i); });
  flush();
  return out;
}
/* ¿el plan ya está en ese orden? (para mostrar la flechita solo mientras siga así) */
function planSortedBy(c, dir) {
  const items = P.schedule.items, out = sortInDays(items, it => planSortVal(c, it), dir);
  return out.every((x, i) => x === items[i]);
}
function planSort(c) {
  if (!planEditable()) return;
  const col = PL_COLS.find(x => x[0] === c && x[3]); if (!col) return;
  const same = PL_SORT.pid === (P && P.id) && PL_SORT.c === c && planSortedBy(c, PL_SORT.dir);
  const dir = same ? -PL_SORT.dir : 1;
  Object.assign(PL_SORT, { c, dir, pid: P.id });
  const items = P.schedule.items, out = sortInDays(items, it => planSortVal(c, it), dir);
  if (out.every((x, i) => x === items[i])) { render(); toast(`Ya estaba ordenado por ${col[1]}.`); return; }
  histNote(`Ordenar por ${col[1]}`);
  P.schedule.items = out; changed('data'); render();
  toastUndo(`Ordenado por ${col[1]}${dir < 0 ? ' (al revés)' : ''} dentro de cada jornada.`, 4200);
}
function stripMenu(anchor, i) {
  const items = P.schedule.items, it = items[i];
  if (!it) return;
  const ed = planEditable();
  const s = it.k ? sceneOfKey(it.k) : null;
  const { days } = scheduleDays(P, D.sc);
  const dates = shootDates(P, days.length);
  const sel = plSel();
  // si la fila está marcada junto con otras, «Mover a» lleva toda la selección
  const group = sel.has(itemKey(it)) && sel.size > 1 ? new Set(sel) : new Set([itemKey(it)]);
  const here = days.findIndex(d => d.rows.includes(i));
  const title = group.size > 1 ? `${group.size} filas seleccionadas` : s ? `Escena ${esc(rowCode(it))} · ${fmtEighths(partEighths(it))} págs.` : esc(it.name || 'Evento');
  const parts = it.k ? items.filter(x => x.k === it.k && x.sp) : [];
  // corto: los números de jornada en una fila, las acciones con nombres breves, las notas, los colores y «Ver en» en una fila cada uno
  popover(anchor, `<h5>${title}</h5>
    ${s && group.size === 1 ? '<div class="menu pm-bd"><button data-m="bd" title="La hoja de desglose de la escena: reparto, utilería, vestuario…">Abrir hoja de desglose</button></div>' : ''}
    ${ed ? `<div class="pm-row"><span class="pm-l">Mover a</span><div class="pl-moveto" role="group" aria-label="Mover a la jornada">${days.map((d, j) => `<button data-to="${esc(d.id)}" class="${ea(j === here ? 'cur' : '')}" ${j === here && group.size === 1 ? 'disabled' : ''} title="${ea(`Jornada ${j + 1}${dates[j] ? ' · ' + fmtDate(dates[j]) : ''}${j === here ? ' (actual)' : ''}`)}" aria-label="${ea(`Jornada ${j + 1}${j === here ? ', actual' : ''}`)}">${j + 1}</button>`).join('')}<button data-to="bank" class="bank" ${here < 0 && group.size === 1 ? 'disabled' : ''} title="Pasa a «sin programar»">Sin programar</button></div></div>
    <div class="menu pm-acts"><hr>
      <button data-m="break" title="Cierra la jornada después de esta fila: lo que sigue pasa a una jornada nueva">Cortar la jornada aquí</button>
      ${s ? `<button data-m="split" title="Parte la escena en dos para rodarla en jornadas distintas">Dividir (${esc(it.k)}${shotLetter(nextPartN(it.k))})</button>` : ''}
      ${it.sp ? `<button data-m="join">Unir con la ${esc(it.k)}</button>` : ''}
      <button data-m="stage" title="Una etapa nueva de rodaje empieza con esta fila">Nueva etapa aquí</button>
      ${!s ? '<button data-m="del">Eliminar evento</button>' : ''}</div>
    ${(s && !(it.tech || '').trim()) || !(it.obs || '').trim() ? `<div class="pm-two only-narrow">${s && !(it.tech || '').trim() ? '<button data-m="ntech">+ Nota técnica</button>' : ''}${!(it.obs || '').trim() ? '<button data-m="nobs">+ Observación</button>' : ''}</div>` : ''}
    <div class="pm-row pm-hl"><span class="pm-l">Resaltar</span>${hlChooserHTML('plan', it.hl)}</div>` : ''}
    ${s ? `<div class="pm-row pm-see"><span class="pm-l">Ver en</span><button data-m="script" title="La escena en el guion rayado">Guion</button>${here >= 0 ? `<button data-m="callday" title="La hoja de llamado de la jornada ${here + 1}">Llamado J${here + 1}</button>` : ''}</div>` : ''}`, p => p.addEventListener('click', e => {
    // resaltar: con un color de la leyenda (o uno nuevo, que se suma a la leyenda con su nombre)
    const c = e.target.closest('[data-hl]');
    if (c) {
      const v = c.dataset.hl, put = id => { histNote('Resaltar'); for (const x of group.size > 1 ? items.filter(x => group.has(itemKey(x))) : [it]) { if (id) x.hl = id; else delete x.hl; } changed('data'); render(); };
      closePop();
      if (v === '+') lgNew(anchor, 'plan', put); else put(v);
      return;
    }
    const to = e.target.closest('[data-to]');
    if (to) {
      const n = moveItems(group, to.dataset.to);
      closePop();
      if (n) { if (group.size > 1) sel.clear(); changed('data'); render(); toastUndo(to.dataset.to === 'bank' ? `${n === 1 ? 'Pasó' : 'Pasaron'} a «sin programar».` : `${n === 1 ? 'Movida' : n + ' filas movidas'} a la jornada ${to.textContent.trim()}.`); }
      return;
    }
    const b = e.target.closest('button[data-m]'); if (!b) return;
    closePop();
    const m = b.dataset.m;
    if (m === 'callday') { UI.callDay = here; UI.supDay = here; setTab('call'); return; }
    if (m === 'break') items.splice(i + 1, 0, { d: uid('d') });
    if (m === 'split') { splitRow(i); }
    if (m === 'join') { items.splice(i, 1); toast(`La parte volvió a la escena ${it.k}.`); }
    if (m === 'stage') { newStageAt(i); return; }
    // en el teléfono las notas vacías se esconden: se muestra la caja y se enfoca para escribir
    if (m === 'ntech' || m === 'nobs') {
      const f = m === 'ntech' ? 'tech' : 'obs';
      PL_NOTE.add(itemKey(it) + ':' + f); render();
      requestAnimationFrame(() => { const t = $(`#view textarea[data-f="${f}"][data-i="${i}"]`); if (t) { t.focus(); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } });
      return;
    }
    if (m === 'del') { items.splice(i, 1); toastUndo('Evento quitado de la jornada.'); }
    if (m === 'bd') { UI.scene = s.idx; UI.bdView = 'sheet'; return setTab('breakdown'); }
    if (m === 'script') { UI.scene = s.idx; setTab('lined'); requestAnimationFrame(() => gotoScene(s.idx)); return; }
    changed('data'); render();
  }));
}
/* ---------- escenas divididas ---------- */
function nextPartN(k) { const used = new Set(P.schedule.items.filter(x => x.k === k && x.sp).map(x => x.sp)); let n = 1; while (used.has(shotLetter(n))) n++; return n; }
function splitRow(i) {
  const items = P.schedule.items, it = items[i];
  const cur = partEighths(it), half = Math.floor(cur / 2);
  const part = { k: it.k, sp: shotLetter(nextPartN(it.k)), e8: half };
  if (it.loc) part.loc = it.loc;
  if (it.sp) it.e8 = cur - half;   // la principal se queda sola con lo que falte
  items.splice(i + 1, 0, part);
  toast(`Escena ${rowCode(it)} dividida: la nueva parte es ${rowCode(part)}. Ajusta sus octavos en la columna Págs.`, 4200);
}
/* ---------- etapas ---------- */
// el orden de las etapas sigue al de sus jornadas
function sortStages() {
  const S = P.schedule;
  const { days } = scheduleDays(P, D.sc);
  const first = id => { const j = days.findIndex(d => d.stage === id); return j < 0 ? 1e9 : j; };
  S.stages = (S.stages || []).slice().sort((a, b) => first(a.id) - first(b.id));
}
function newStageAt(i) {
  const S = P.schedule, items = S.items, it = items[i];
  let { days } = scheduleDays(P, D.sc);
  const d = days.find(x => x.rows.includes(i));
  if (!d) { toast('Primero mueve la escena a una jornada.'); return; }
  // si la escena no abre su jornada, se corta antes: la etapa empieza con ella
  if (d.rows[0] !== i) items.splice(i, 0, { d: uid('d') });
  days = scheduleDays(P, D.sc).days;
  const n = days.findIndex(x => x.rows.includes(items.indexOf(it)));
  const st = { id: uid('st'), name: '', place: '' };
  if (!(S.stages || []).length && n > 0) {
    // las jornadas anteriores quedan en una primera etapa
    const st0 = { id: uid('st'), name: '', place: '' };
    S.stages = [st0];
    days[0].brk.st = st0.id;
  }
  S.stages = (S.stages || []).concat(st);
  days[n].brk.st = st.id;
  sortStages();
  changed('data'); render();
  stageEdit(st.id, n);
}
function stageEdit(id, n) {
  const st = (P.schedule.stages || []).find(x => x.id === id); if (!st) return;
  const k = P.schedule.stages.indexOf(st) + 1;
  const m = modal({
    title: `Etapa ${k}${n != null ? ' · desde la jornada ' + (n + 1) : ''}`,
    body: `<label class="fld"><span>Nombre</span><input type="text" id="seN" value="${esc(st.name || '')}" placeholder="Sierra, Costa, Lima…"></label>
      <label class="fld"><span>Lugar o país</span><input type="text" id="seP" value="${esc(st.place || '')}" placeholder="Santiago de Chuco, Perú"></label>`,
    foot: '<button class="btn" data-close>Listo sin nombre</button><button class="btn primary" id="seOk">Guardar</button>',
  });
  setTimeout(() => $('#seN', m).focus(), 30);
  $('#seOk', m).onclick = () => { st.name = $('#seN', m).value.trim(); st.place = $('#seP', m).value.trim(); closeModal(); changed('data'); render(); };
}
/* ---------- fechas: cambiar una jornada mueve las siguientes de su etapa; las demás etapas no ---------- */
/* los días de rodaje, para marcarlos en el calendario */
const planShootMarks = () => new Set(shootDates(P, scheduleDays(P, D.sc).days.length).filter(Boolean).map(d => isoDay(d)));
FECHA_ON['pl-start'] = iso => { setDayDate(0, iso); changed('data'); render(); };
FECHA_MARKS['pl-start'] = planShootMarks;
function setDayDate(n, iso) {
  const S = P.schedule;
  const { days } = scheduleDays(P, D.sc);
  const before = shootDates(P, days.length);
  const d = days[n];
  if (!d) { if (n === 0) S.start = iso || S.start; return; }
  if (n === 0) { if (iso) S.start = iso; delete d.brk.date; }
  else if (iso) d.brk.date = iso; else delete d.brk.date;
  for (let j = n + 1; j < days.length; j++) {
    if (days[j].stage !== d.stage) { if (!days[j].brk.date && before[j]) days[j].brk.date = isoDay(before[j]); break; }
    delete days[j].brk.date;
  }
}
function dateMenu(anchor, n) {
  const { days } = scheduleDays(P, D.sc);
  const dates = shootDates(P, days.length);
  const d = days[n]; if (!d) return;
  const stage = (P.schedule.stages || []).find(x => x.id === d.stage);
  const iso = dates[n] ? isoDay(dates[n]) : '';
  popover(anchor, `<h5>Fecha de la jornada ${n + 1}</h5>
    <div class="fcal">${fechaFieldHTML({ iso, key: 'pl-day', id: 'pdDate', label: 'Fecha de la jornada', cls: 'fecha-solo' })}<div class="fcal-box"></div>${fechaQuick(iso)}<p class="fcal-leg"><i></i>Días de rodaje</p></div>
    <p class="hint" style="margin:6px 0 0;max-width:260px">Las jornadas siguientes ${stage ? 'de esta etapa' : ''} se mueven con esta fecha; ${stage ? 'las de otras etapas no cambian' : 'si hay etapas, las de las demás no cambian'}.</p>
    ${n > 0 && d.brk.date ? '<div class="menu" style="margin-top:6px"><button data-auto>Volver a la fecha automática</button></div>' : ''}`, p => {
    p.classList.add('pop-fcal');
    const pick = d => { if (!d) return; setDayDate(n, d); closePop(); changed('data'); render(); };
    FECHA_ON['pl-day'] = pick;
    fechaCalMount(p, iso, pick, planShootMarks());
    const a = $('[data-auto]', p); if (a) a.onclick = () => { setDayDate(n, ''); closePop(); changed('data'); render(); };
  });
}
function dayMenu(anchor, n) {
  const { days } = scheduleDays(P, D.sc);
  const d = days[n]; if (!d) return;
  const ed = planEditable();
  const stages = P.schedule.stages || [];
  const done = dayDone(d);
  popover(anchor, `<h5>Jornada ${n + 1}</h5>
    ${ed ? `<label class="chip" style="cursor:pointer;padding:5px 10px;margin-bottom:8px"><input type="checkbox" id="pdDone" ${done ? 'checked' : ''}> Jornada completada</label>
    ${done === 'script' && !d.brk.done ? '<p class="hint" style="margin:-4px 0 8px">Se marcó sola: todos sus planos están rodados en la hoja de script.</p>' : ''}
    <div class="menu"><button data-m="date">Cambiar la fecha…</button><button data-m="up" ${n ? '' : 'disabled'}>Subir jornada</button><button data-m="down" ${n < days.length - 1 ? '' : 'disabled'}>Bajar jornada</button><button data-m="addafter">Insertar jornada después</button><button data-m="stage">Iniciar nueva etapa en esta jornada</button></div>
    <div class="eyebrow" style="margin:8px 0 6px">Color de la jornada</div>${hlChooserHTML('plan', d.brk.hl, 'El de la leyenda')}
    ${stages.length ? `<label class="fld" style="margin-top:8px"><span>Etapa desde esta jornada</span><select id="pdSt"><option value="">Sigue la etapa anterior</option>${stages.map((st, j) => `<option value="${ea(st.id)}" ${d.brk.st === st.id ? 'selected' : ''}>Etapa ${j + 1}${st.name ? ' · ' + esc(st.name) : ''}</option>`).join('')}</select></label>` : ''}
    <div class="menu" style="margin-top:6px"><hr><button data-m="ev">+ Agregar evento con hora…</button></div>` : '<p class="hint" style="margin:0">Solo lectura.</p>'}
    <div class="pm-row pm-see"><span class="pm-l">Ver su</span><button data-m="call" title="La hoja de llamado de esta jornada">Hoja de llamado</button><button data-m="sup" title="La hoja de script de esta jornada">Hoja de script</button></div>`, p => {
    p.addEventListener('click', e => {
      const c = e.target.closest('[data-hl]');
      if (c) { const v = c.dataset.hl, put = id => { histNote('Color de la jornada'); if (id) d.brk.hl = id; else delete d.brk.hl; changed('data'); render(); }; closePop(); if (v === '+') lgNew(anchor, 'plan', put); else put(v); return; }
      const mb = e.target.closest('[data-m]');
      if (mb) {
        const m = mb.dataset.m;
        if (m === 'call' || m === 'sup') { closePop(); UI.callDay = n; UI.supDay = n; setTab(m); return; }
        if (m === 'date') { closePop(); const btn = $(`.pdate[data-n="${n}"]`); dateMenu(btn || anchor, n); return; }
        if (m === 'up' || m === 'down') { closePop(); const to = n + (m === 'up' ? -1 : 1); if (moveDay(n, to)) { changed('data'); render(); dayMoved(to); } return; }
        if (m === 'addafter') { P.schedule.items.splice(d.i + 1, 0, { d: uid('d') }); closePop(); changed('data'); render(); toast(`Jornada ${n + 2} agregada.`); return; }
        if (m === 'stage') { closePop(); if (d.rows.length) newStageAt(d.rows[0]); else newStageAtDay(n); return; }
        if (m === 'ev') { closePop(); const pb = $(`.pplus[data-n="${n}"]`); setTimeout(() => evMenu(pb || anchor, n), 0); return; }
      }
    });
    const cb = $('#pdDone', p);
    if (cb) cb.onchange = () => { d.brk.done = cb.checked ? true : (dayDone({ ...d, brk: { ...d.brk, done: undefined } }) ? false : undefined); if (d.brk.done === undefined) delete d.brk.done; changed('data'); render(); closePop(); };
    const sel = $('#pdSt', p);
    if (sel) sel.onchange = () => { if (sel.value) d.brk.st = sel.value; else delete d.brk.st; sortStages(); changed('data'); render(); closePop(); };
  });
}
/* «+» de la barra de la jornada: un evento con hora (los de llegada van al inicio; los demás, antes del cierre) */
function evMenu(anchor, n) {
  const { days } = scheduleDays(P, D.sc);
  const d = days[n]; if (!d || !planEditable()) return;
  popover(anchor, `<h5>Agregar evento con hora · Jornada ${n + 1}</h5>
    <div class="chipset ev-chips">${EVENT_PRESETS.map(t => `<button class="chip" data-ev="${esc(t)}">${esc(t)}</button>`).join('')}<button class="chip" data-ev="">Otro…</button></div>`, p => p.addEventListener('click', e => {
    const ev = e.target.closest('[data-ev]'); if (!ev) return;
    const items = P.schedule.items;
    const first = /salida|traslado|llamado|desayuno/i.test(ev.dataset.ev);
    const at = first ? (d.rows.length ? d.rows[0] : d.i) : d.i;
    items.splice(at, 0, { e: uid('e'), name: ev.dataset.ev, t: '' });
    closePop(); changed('data'); render();
    requestAnimationFrame(() => { const inp = $(`.prow[data-i="${at}"] input[data-f="${ev.dataset.ev ? 't' : 'name'}"]`); if (inp) inp.focus(); });
  }));
}
function newStageAtDay(n) {
  const S = P.schedule;
  const { days } = scheduleDays(P, D.sc);
  const st = { id: uid('st'), name: '', place: '' };
  if (!(S.stages || []).length && n > 0) { const st0 = { id: uid('st'), name: '', place: '' }; S.stages = [st0]; days[0].brk.st = st0.id; }
  S.stages = (S.stages || []).concat(st);
  days[n].brk.st = st.id;
  sortStages(); changed('data'); render(); stageEdit(st.id, n);
}
/* ---------- etapas de rodaje ---------- */
function stagesDialog(add) {
  const S = P.schedule;
  const { days } = scheduleDays(P, D.sc);
  const list = (S.stages || []).map(st => ({ ...st, start: days.findIndex(d => d.brk.st === st.id) }));
  if (list.length && !list.some(x => x.start === 0)) list[0].start = list[0].start < 0 ? 0 : list[0].start;
  const m = modal({
    title: 'Etapas de rodaje', wide: true,
    body: `<p class="hint" style="margin:0">Agrupa las jornadas por etapa, por ejemplo «Sierra · Santiago de Chuco, Perú» o «Lima». Cada etapa empieza en una jornada y sigue hasta la siguiente etapa. Su tono de fondo marca la fecha y los eventos de sus jornadas.</p>
      <div class="stg-list" id="stL"></div><button class="btn sm" id="stAdd" style="justify-self:start">+ Etapa</button>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="stOk">Guardar</button>',
  });
  const paint = () => {
    $('#stL', m).innerHTML = list.length ? list.map((st, j) => `<div class="stg-row" style="--stg:${ea(STAGE_TONES[j % STAGE_TONES.length])}"><i class="stg-sw"></i><b>Etapa ${j + 1}</b>
      <input type="text" data-k="name" data-j="${j}" value="${esc(st.name || '')}" placeholder="Nombre (Sierra, Costa, Lima…)" aria-label="Nombre de la etapa">
      <input type="text" data-k="place" data-j="${j}" value="${esc(st.place || '')}" placeholder="Lugar o país" aria-label="Lugar o país">
      <select data-k="start" data-j="${j}" aria-label="Empieza en la jornada">${days.map((d, n) => `<option value="${n}" ${st.start === n ? 'selected' : ''}>Desde la jornada ${n + 1}</option>`).join('') || '<option value="0">Desde la jornada 1</option>'}</select>
      <button class="xbtn" data-del="${j}" aria-label="Quitar etapa" title="Quitar etapa">${ICO.close}</button></div>`).join('') : '<p class="hint">Sin etapas: todas las jornadas usan el mismo tono.</p>';
  };
  paint();
  m.addEventListener('input', e => { const x = e.target.closest('[data-j]'); if (!x) return; const st = list[+x.dataset.j]; st[x.dataset.k] = x.dataset.k === 'start' ? +x.value : x.value; });
  m.addEventListener('change', e => { const x = e.target.closest('select[data-j]'); if (x) list[+x.dataset.j].start = +x.value; });
  m.addEventListener('click', e => { const x = e.target.closest('[data-del]'); if (x) { list.splice(+x.dataset.del, 1); paint(); } });
  const addOne = () => {
    const used = new Set(list.map(x => x.start));
    let start = 0; while (used.has(start) && start < days.length - 1) start++;
    list.push({ id: uid('st'), name: '', place: '', start }); paint();
    const inp = $$('input[data-k="name"]', m).pop(); if (inp) setTimeout(() => inp.focus(), 30);
  };
  $('#stAdd', m).onclick = addOne;
  if (add) addOne();
  $('#stOk', m).onclick = () => {
    S.stages = list.map(({ id, name, place }) => ({ id, name: (name || '').trim(), place: (place || '').trim() }));
    for (const d of days) delete d.brk.st;
    for (const st of list) if (days[st.start]) days[st.start].brk.st = st.id;
    sortStages();
    closeModal(); changed('data'); render();
  };
}
/* ---------- locaciones de rodaje: renombrar una cambia todas sus escenas ---------- */
function locsDialog() {
  const S = P.schedule;
  const locs = (S.locs || []).map(l => ({ ...l, orig: l.name }));
  // también las que se escribieron directo en el plan
  for (const n of [...Object.values(S.setLoc || {}), ...S.items.map(it => it.loc)].filter(Boolean)) if (!locs.some(l => l.orig === n)) locs.push({ name: n, addr: '', orig: n });
  const setLoc = { ...(S.setLoc || {}) };
  const bases = [...new Set(D.sc.scenes.map(s => s.locBase))];
  const uses = n => Object.values(S.setLoc || {}).filter(v => v === n).length + S.items.filter(it => it.loc === n).length;
  const m = modal({
    title: 'Locaciones de rodaje', wide: true,
    body: `<p class="hint" style="margin:0">Los lugares reales donde se rueda. Cambia el nombre de una locación y se actualiza en todas sus escenas. Asigna una locación a cada decorado del guion y todas sus escenas la toman; en el plan puedes cambiarla escena por escena.</p>
      <div class="fld"><span>Locaciones</span><div class="loc-list" id="lcL"></div><button class="btn sm" id="lcAdd" style="justify-self:start">+ Locación</button></div>
      <div class="fld"><span>Decorados del guion</span><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Decorado</th><th>Escenas</th><th style="min-width:220px">Locación de rodaje</th></tr></thead><tbody id="lcB">
      ${bases.map((b, j) => `<tr><td>${esc(titleCase(b))}</td><td class="tnum">${D.sc.scenes.filter(s => s.locBase === b).map(s => s.key).join(', ')}</td><td><input type="text" list="lcNames" data-base="${j}" value="${esc(setLoc[b] || '')}" placeholder="Sin asignar" aria-label="Locación para ${esc(titleCase(b))}"></td></tr>`).join('')}
      </tbody></table></div></div><datalist id="lcNames"></datalist>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="lcOk">Guardar</button>',
  });
  const names = () => { $('#lcNames', m).innerHTML = locs.filter(l => l.name).map(l => `<option value="${esc(l.name)}">`).join(''); };
  const paint = () => {
    $('#lcL', m).innerHTML = locs.length ? locs.map((l, j) => `<div class="loc-row"><input type="text" data-k="name" data-j="${j}" value="${esc(l.name || '')}" placeholder="Nombre (Querquerball, Casa de la abuela…)" aria-label="Nombre de la locación">
      <input type="text" data-k="addr" data-j="${j}" value="${esc(l.addr || '')}" placeholder="Dirección o referencia" aria-label="Dirección o referencia"><button class="xbtn" data-del="${j}" aria-label="Quitar locación" title="${ea(l.orig && uses(l.orig) ? 'Sus escenas conservan el nombre escrito' : '')}">${ICO.close}</button></div>`).join('') : '<p class="hint" style="margin:0">Todavía no hay locaciones.</p>';
    names();
  };
  paint();
  m.addEventListener('input', e => {
    const x = e.target.closest('[data-j]');
    if (x) {
      const l = locs[+x.dataset.j], old = l[x.dataset.k];
      l[x.dataset.k] = x.value;
      // al renombrar, los decorados que la usaban en este diálogo también cambian
      if (x.dataset.k === 'name') { for (const b of Object.keys(setLoc)) if (setLoc[b] === old && old) setLoc[b] = x.value; $$('#lcB input[data-base]', m).forEach(inp => { inp.value = setLoc[bases[+inp.dataset.base]] || ''; }); names(); }
      return;
    }
    const b = e.target.closest('[data-base]'); if (b) setLoc[bases[+b.dataset.base]] = b.value;
  });
  m.addEventListener('click', e => { const x = e.target.closest('[data-del]'); if (x) { locs.splice(+x.dataset.del, 1); paint(); } });
  $('#lcAdd', m).onclick = () => { locs.push({ name: '', addr: '' }); paint(); const inp = $$('input[data-k="name"]', m).pop(); if (inp) inp.focus(); };
  $('#lcOk', m).onclick = () => {
    let renamed = 0;
    for (const l of locs) {
      const nn = (l.name || '').trim();
      if (!l.orig || !nn || nn === l.orig) continue;
      for (const it of S.items) if (it.loc === l.orig) { it.loc = nn; renamed++; }
    }
    S.locs = locs.map(l => ({ name: (l.name || '').trim(), addr: (l.addr || '').trim() })).filter(l => l.name);
    S.setLoc = Object.fromEntries(Object.entries(setLoc).map(([k, v]) => [k, (v || '').trim()]).filter(([, v]) => v));
    for (const n of Object.values(S.setLoc)) if (!S.locs.some(l => l.name === n)) S.locs.push({ name: n, addr: '' });
    closeModal(); changed('data'); render();
    if (renamed) toast(`Nombre actualizado también en ${renamed} ${renamed === 1 ? 'escena' : 'escenas'} con locación propia.`);
  };
}
function planBank() {
  const { bank } = scheduleDays(P, D.sc);
  const tmp = { schedule: { ...P.schedule, items: P.schedule.items.filter(it => it.k && bank.includes(it.k)) } };
  const fakeSc = { scenes: bank.map(k => sceneOfKey(k)) };
  autoPlan(tmp, fakeSc, D.metrics);
  const keep = P.schedule.items.filter(it => it.d || it.e || !bank.includes(it.k));
  P.schedule.items = keep.concat(tmp.schedule.items);
}
Object.assign(ACT, {
  'pl-gobank': () => { const b = $('#view .pl-stage.bank'); if (b) b.scrollIntoView({ block: 'start', behavior: 'smooth' }); },
  'pl-view': b => { ls.set('plView', b.dataset.v === 'cast' ? 'cast' : 'days'); plSel().clear(); render(); },
  // desde «Por actor»: la jornada en el plan
  'pl-goday': b => { ls.set('plView', 'days'); render(); requestAnimationFrame(() => { const el = $(`.pday[data-n="${CSS.escape(b.dataset.n)}"]`); if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); } }); },
  'pl-bank': () => {
    const n0 = scheduleDays(P, D.sc).days.length;
    histNote('Sugerir jornadas'); planBank(); changed('data'); render();
    const n = scheduleDays(P, D.sc).days.length - n0;
    toastUndo(`${n} ${n === 1 ? 'jornada sugerida' : 'jornadas sugeridas'} por locación y día o noche. Muévelas o cámbialas a tu gusto.`);
  },
  'pl-unbreak': b => { P.schedule.items.splice(+b.dataset.i, 1); changed('data'); render(); toastUndo('Jornadas unidas.'); },
  'pl-row': b => stripMenu(b, +b.dataset.i),
  // (lote U) ordenar por columna y la hoja de desglose de la escena
  'pl-sort': b => planSort(b.dataset.c),
  'pl-bd': b => { const sc = sceneOfKey(b.dataset.k); if (!sc) return; UI.scene = sc.idx; UI.bdView = 'sheet'; setTab('breakdown'); },
  'pl-day': b => dayMenu(b, +b.dataset.n),
  'pl-brkm': b => brkMenu(b, +b.dataset.i),
  'pl-date': b => dateMenu(b, +b.dataset.n),
  'pl-addday': () => {
    const items = P.schedule.items;
    let last = -1; items.forEach((it, i) => { if (it.d) last = i; });
    items.splice(last + 1, 0, { d: uid('d') });
    const n = items.filter(x => x.d).length;
    changed('data'); render(); toast(`Jornada ${n} agregada.`);
    requestAnimationFrame(() => { const s = $(`.pday[data-n="${n - 1}"]`); if (s) s.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  },
  'pl-selnone': () => { plSel().clear(); paintSel(); },
  'pl-stages': () => stagesDialog(),
  'pl-addstage': () => stagesDialog(true),
  'pl-ev': b => evMenu(b, +b.dataset.n),
  'pl-locs': () => locsDialog(),
  'pl-col': b => { const k = { fig: 'plFig', tech: 'plTech', obs: 'plObs', thumb: 'plThumb' }[b.dataset.c]; ls.set(k, !planCols()[b.dataset.c]); render(); },
  'pl-cast': b => { P.schedule.castMode = b.dataset.v; if (planEditable()) changed('data'); render(); },
  // (lote Y) todas las columnas a su ancho automático (para todo el equipo; se puede deshacer)
  'pl-colw0': () => {
    if (!planEditable() || !P.schedule.colW) return;
    histNote('Restaurar el ancho de las columnas');
    delete P.schedule.colW; changed('data'); render();
    toastUndo('Las columnas volvieron a su ancho automático.');
  },
});
Object.assign(BIND, {
  'pl-off': el => { const set = new Set(P.schedule.off || []); el.checked ? set.add(+el.value) : set.delete(+el.value); if (set.size >= 7) { toast('Deja al menos un día de rodaje.'); el.checked = false; return; } P.schedule.off = [...set]; changed('data'); render(); },
  'pl-movesel': el => {
    if (!el.value) return;
    const n = moveItems(new Set(plSel()), el.value);
    plSel().clear();
    if (n) { changed('data'); toastUndo(`${n} ${n === 1 ? 'fila movida' : 'filas movidas'}.`); }
    render();
  },
  'pl-mpp': (el, ev) => { if (ev !== 'change') return; P.schedule.minPerPage = clamp(Math.round(num(el.value)) || MPP0, 5, 240); changed('data'); render(); },
  'pl-ppd': (el, ev) => { if (ev !== 'change') return; P.schedule.pagesPerDay = clamp(Math.round(num(String(el.value).replace(',', '.')) * 8) / 8 || 4.5, .5, 20); changed('data'); render(); },
  'pl-e8': el => { const it = P.schedule.items[+el.dataset.i]; if (!it) return; it.e8 = +el.value; changed('data'); render(); },
  'pl-call': (el, ev) => {
    if (ev !== 'change') return;
    const { days } = scheduleDays(P, D.sc), d = days[+el.dataset.n]; if (!d) return;
    P.call = P.call || {}; P.call.days = P.call.days || {};
    const dd = P.call.days[d.id] = P.call.days[d.id] || {}, v = el.value = normHM(el.value);
    if (v) dd.crewCall = v; else delete dd.crewCall;
    changed('data'); render();
  },
  'pl-f': (el, ev) => {
    const it = P.schedule.items[+el.dataset.i]; if (!it) return;
    const f = el.dataset.f;
    if (f === 'fig') { if (el.value === '') delete it.fig; else it.fig = Math.max(0, Math.round(num(el.value))); }
    else if (f === 'loc') {
      if (ev !== 'change') return;
      const s = sceneOfKey(it.k), S = P.schedule, v = el.value.trim();
      S.setLoc = S.setLoc || {};
      if (!v) delete it.loc;
      else if (!S.setLoc[s.locBase]) {
        // la primera locación de un decorado vale para todas sus escenas
        S.setLoc[s.locBase] = v; delete it.loc;
        const n = D.sc.scenes.filter(x => x.locBase === s.locBase && x.key !== s.key).length;
        if (n) toast(`«${v}» también quedó para ${n} ${n === 1 ? 'escena' : 'escenas'} de ${titleCase(s.locBase)}. Para cambiar el nombre en todas, usa Locaciones…`, 4200);
      } else if (v === S.setLoc[s.locBase]) delete it.loc;
      else { it.loc = v; toast(`Cambió solo en la escena ${rowCode(it)}. Para renombrar «${S.setLoc[s.locBase]}» en todas, usa Locaciones…`, 4200); }
      if (v && !(S.locs || []).some(l => l.name === v)) (S.locs = S.locs || []).push({ name: v, addr: '' });
      changed('data'); render(); return;
    }
    else if (f === 'dur') {
      if (ev !== 'change') return;
      const m = parseDur(el.value);
      if (el.value.trim() && m == null) { toast('Escribe el tiempo en minutos (45) o en horas (1 h 15, 1:30).', 3500); el.value = it.dur ? fmtDur(num(it.dur)) : ''; return; }
      if (m) it.dur = clamp(m, 1, 24 * 60); else delete it.dur;
      el.value = it.dur ? fmtDur(it.dur) : '';
    }
    else if (f === 't' && el.classList.contains('tm')) { if (ev !== 'change') return; const v = el.value = normHM(el.value); if (v) it.t = v; else delete it.t; }
    else { const v = f === 'tech' || f === 'obs' ? el.value : el.value.trim(); if (v) it[f] = v; else delete it[f]; }
    changed('data');
    if (ev === 'change' && (f === 'fig' || f === 't' || f === 'dur')) render();
  },
});
/* ---------- Excel: la misma tabla del PDF, con la fecha en celdas combinadas ---------- */
function planSheets() {
  const S = P.schedule, M = P.meta, br = M.brand || {};
  const { days, bank, bankRows } = scheduleDays(P, D.sc);
  const dates = shootDates(P, days.length);
  const NC = 13, INK = '#222222', T = xlTab();   // los colores de la pestaña, como en la app
  const shade = (hex, k) => '#' + rgbOf(hex).map(v => Math.round(v * k).toString(16).padStart(2, '0')).join('');
  const rows = [];
  const row = (cells, h) => rows.push(h == null ? { cells } : { cells, h });
  const full = (v, s, h) => row([{ v, cs: NC, s }], h);
  const people = (l, lab) => { const n = (l || []).map(personName).filter(Boolean); return n.length ? lab + ': ' + n.join(', ') : ''; };
  // encabezado del documento (nombre del proyecto y de la empresa, si están activados)
  full([br.project !== false ? M.title : '', 'Stripboard'].filter(Boolean).join(' · '), { bold: true, size: 16, font: 'title', fill: T.bar, color: T.ink, border: false, wrap: false }, 30);
  const sub = [br.company !== false ? M.company : '', people(M.directors, 'Dirección'), people(M.producers, 'Producción'),
    `${days.filter(d => d.keys.length).length} jornadas${dates[0] ? ' · ' + fmtDate(dates[0]) + ' a ' + fmtDate(dates[dates.length - 1]) : ''}`].filter(Boolean).join('   ·   ');
  full(sub, { color: T.ink, fill: T.bar, border: false, wrap: false }, 18);
  full('', { fill: T.c, border: false }, 4);
  // (lote U) las columnas del stripboard de la pantalla (y la fecha, como siempre, en la primera)
  const COLS = [12, 6, 5, 40, 10, 14, 6, 22, 7, 6, 8, 28, 28];
  const lg = xlLegend(lgDocItems('plan', pdfPlanUsed([...days.flatMap(d => d.rows), ...bankRows].map(i => S.items[i]), days.map(d => d.brk))), COLS);
  if (lg.length) { row([], 6); rows.push(...lg); row([], 6); }
  const headAt = rows.length + 1;
  const HEAD = ['Fecha', 'Esc.', 'I/E', 'Locación', 'D/N', 'Reparto', 'Fig.', 'Locación de rodaje', 'Págs.', 'Pág.', 'Tiempo', 'Notas técnicas', 'Observaciones'];
  row(HEAD.map((v, j) => ({ v, s: { bold: true, fill: T.bar, color: T.ink, line: '#5A5A5A', h: j === 1 || j === 6 || j === 8 || j === 9 ? 'center' : 'left' } })), 22);
  const castOf = s => { const list = sceneCast(s.idx); return S.castMode === 'name' ? list.map(e => titleCase(e.name)).join(', ') : list.map(e => D.castNum[e.id]).filter(Boolean).join(', '); };
  const cells = (i, tone) => {
    const it = S.items[i];
    if (it.e) {
      const ef = hlc(it) || lgCol('plan', 'ev'), st = { fill: ef, bold: true, line: '#5A5A5A', ...(lgDark(ef) ? { color: '#F4F4F4' } : {}) };
      return [{ v: it.name || 'Evento', cs: 3, s: st }, { v: it.det || '', cs: 6, s: { ...st, bold: false } }, { v: fmtDur(num(it.dur) || rowEstDur(it)), s: { ...st, h: 'center' } }, { v: it.tech || '', s: { ...st, bold: false } }, { v: it.obs || '', s: { ...st, bold: false } }];
    }
    const s = sceneOfKey(it.k), fill = hlc(it) || stripColor(s);   // resaltada con su color de la leyenda, o su tira, entera
    const st = { fill, line: '#5A5A5A', ...(lgDark(fill) ? { color: '#F4F4F4' } : {}) }, code = rowCode(it), set = setOf(s) + (it.sp ? ` (parte ${it.sp})` : ''), syn = synopsisOf(s);
    return [
      { v: /^\d+$/.test(code) ? +code : code, s: { ...st, bold: true, h: 'center' } },
      { v: ieLab(s), s: st },
      { v: set + (syn ? '\n' + syn : ''), s: st, ...(syn ? { runs: [{ t: set, b: true }, { t: '\n' + syn, i: true, color: st.color ? '#D8D8D8' : '#4A5260' }] } : { s: { ...st, bold: true } }) },
      { v: DN_LAB[stripDN(s)], s: st },
      { v: castOf(s), s: st },
      { v: it.fig != null ? +it.fig : '', s: { ...st, h: 'right' } },
      { v: planLoc(it, s), s: { ...st, bold: true } },
      { v: fmtEighths(partEighths(it)), s: { ...st, h: 'right' } },
      { v: +D.metrics.page[s.idx] || String(D.metrics.page[s.idx]), s: { ...st, h: 'right' } },
      { v: fmtDur(num(it.dur) || rowEstDur(it)), s: { ...st, h: 'center' } },
      { v: it.tech || '', s: { ...st, v: 'top' } },
      { v: it.obs || '', s: { ...st, v: 'top' } },
    ];
  };
  const spacer = () => full('', { border: false }, 7);
  const stages = S.stages || [];
  let lastStage;
  days.forEach((d, n) => {
    const tone = stageTone(P, d.stage);
    if (stages.length && d.stage !== lastStage) {
      const st = stages.find(x => x.id === d.stage);
      if (st) { if (rows.length > 4) spacer(); full(`ETAPA ${stages.indexOf(st) + 1}${st.name ? ' · ' + st.name : ''}${st.place ? '   ' + st.place : ''}`, { fill: shade(tone, .86), bold: true, font: 'title', line: '#5A5A5A' }, 20); }
    }
    lastStage = d.stage;
    const done = dayDone(d), dt = dates[n];
    const dateTxt = (dt ? `${dt.getDate()}\n${dt.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '')} ${dt.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')}\n` : '') + `Jornada ${n + 1}` + (done ? '\nCOMPLETADA' : '');
    // la jornada en negro, como su barra en la app
    const jc = hlc(d.brk) || lgCol('plan', 'brk'), jdark = lgInk(jc) === '#FFFFFF';   // la jornada en su color de la leyenda
    const dateCell = { v: dateTxt, rs: Math.max(1, d.rows.length), s: { fill: jc, bold: true, font: 'title', h: 'center', color: jdark ? (done ? '#96DEB0' : '#F2F2F2') : (done ? '#1F6B3E' : INK), size: 10, line: '#5A5A5A' } };
    if (!d.rows.length) row([dateCell, { v: 'Jornada sin escenas', cs: NC - 1, s: { italic: true, color: '#6B7480' } }]);
    d.rows.forEach((i, j) => row(j ? cells(i, tone) : [dateCell, ...cells(i, tone)]));
    const inf = dayInfo(d.keys, d.rows);
    const cast = [...inf.cast].map(id => S.castMode === 'name' ? titleCase(P.elements[id].name) : D.castNum[id]).sort((a, c) => typeof a === 'number' ? a - c : String(a).localeCompare(c));
    const black = jdark;
    full(`CIERRE DE JORNADA ${n + 1} DE ${days.length}  ·  ${fmtEighths(inf.e)} págs.  ·  ${d.keys.length} ${d.keys.length === 1 ? 'escena' : 'escenas'}${inf.locs.size ? '  ·  ' + [...inf.locs].join(', ') : ''}  ·  Rep. ${cast.join(', ') || '-'}${inf.fig ? '  ·  Fig. ' + inf.fig : ''}${done ? '  ·  COMPLETADA' : ''}`,
      { fill: jc, color: black ? '#F2F2F2' : INK, bold: true, line: '#5A5A5A' }, 20);
    if (n < days.length - 1 || bankRows.length) spacer();
  });
  if (bankRows.length) {
    full(`SIN PROGRAMAR (${bank.length})`, { fill: T.fill2, bold: true, color: INK }, 20);
    bankRows.forEach((i, j) => row(j ? cells(i, STAGE_TONES[0]) : [{ v: '-', rs: bankRows.length, s: { fill: T.fill2, h: 'center' } }, ...cells(i, STAGE_TONES[0])]));
  }
  // reparto numerado
  const legend = Object.entries(D.castNum).sort((a, b) => a[1] - b[1]);
  if (legend.length) {
    row([], 14);
    row([{ v: '#', s: { bold: true, fill: T.bar, color: T.ink, h: 'center', line: T.line } }, { v: 'Reparto', s: { bold: true, fill: T.bar, color: T.ink, line: T.line } }], 20);
    for (const [id, n] of legend) row([{ v: n, s: { h: 'center', line: T.line } }, { v: titleCase(P.elements[id].name), s: { line: T.line } }]);
  }
  const plan = { name: 'Stripboard', cols: COLS, rows, freeze: headAt, landscape: true, printRows: `${headAt}:${headAt}` };
  // hoja de locaciones: dirección, escenas y jornadas de cada una
  const byLoc = new Map();
  const touch = n => { if (!byLoc.has(n)) byLoc.set(n, { esc: [], days: new Set() }); return byLoc.get(n); };
  for (const l of S.locs || []) touch(l.name);
  S.items.forEach((it, i) => {
    if (!it.k) return;
    const s = sceneOfKey(it.k); if (!s) return;
    const name = planLoc(it, s); if (!name) return;
    const x = touch(name); x.esc.push(rowCode(it));
    const j = days.findIndex(d => d.rows.includes(i)); if (j >= 0) x.days.add(j + 1);
  });
  const hs = { bold: true, fill: T.bar, color: T.ink, line: T.line };
  const locRows = [
    { cells: [{ v: `${M.title} · Locaciones de rodaje`, cs: 4, s: { bold: true, size: 16, font: 'title', fill: T.bar, color: T.ink, border: false, wrap: false } }], h: 30 },
    { cells: [{ v: '', cs: 4, s: { fill: T.c, border: false } }], h: 4 },
    { cells: [], h: 8 },
    { cells: ['Locación', 'Dirección o referencia', 'Escenas', 'Jornadas'].map(v => ({ v, s: hs })), h: 22 },
    ...[...byLoc].map(([n, x]) => ({ cells: [{ v: n, s: { bold: true } }, { v: ((S.locs || []).find(l => l.name === n) || {}).addr || '' }, { v: x.esc.join(', ') }, { v: [...x.days].sort((a, b) => a - b).join(', ') }] })),
  ];
  const locs = { name: 'Locaciones', cols: [30, 40, 26, 16], rows: locRows, freeze: 4, printRows: '4:4' };
  // días por actor (plan-dood.js), si hay reparto y jornadas
  const dd = Object.keys(D.castNum).length && days.length ? [doodSheet()] : [];
  return [plan, ...(byLoc.size ? [locs] : []), ...dd];
}
const rgbOf = hex => { const h = String(hex).replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
async function exportPlanXLSX() {
  if (!proGate('excel')) return;
  if (!D.sc.scenes.length) { toast('Primero escribe o importa el guion.'); return; }
  try {
    const bytes = xlsxBook(planSheets(), { title: P.meta.title + ' · Plan de rodaje' });
    await offerFile(fileSafe(P.meta.title) + '_plan_de_rodaje.xlsx', new Blob([bytes], { type: XLSX_MIME }));
  } catch (e) { console.error(e); toast('No se pudo crear el Excel. Vuelve a intentarlo; si se repite, escribe a soporte desde Ayuda.'); }
}

/* ---------- ajustes, ayuda y exportar ---------- */
SETTINGS.plan = () => {
  const S = P.schedule, ed = planEditable(), off = new Set(S.off || []);
  return `<div class="fld"><span>Días sin rodaje</span><div class="daytoggle">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label title="${ea(['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d])}"><input type="checkbox" aria-label="${ea(['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d])}" data-bind="pl-off" value="${ea(d)}" ${off.has(d) ? 'checked' : ''} ${ed ? '' : 'disabled'}>${WEEKDAYS[d]}</label>`).join('')}</div></div>
    <div class="fld"><span>Reparto</span><div class="seg" role="group" aria-label="Reparto"><button data-act="pl-cast" data-v="num" aria-pressed="${ea(S.castMode !== 'name')}">Por número</button><button data-act="pl-cast" data-v="name" aria-pressed="${ea(S.castMode === 'name')}">Por nombre</button></div></div>
    <div class="fld"><span>Columnas en pantalla</span><div class="pl-cols">${[['thumb', 'Miniatura del storyboard'], ['fig', 'Figuración (Fig.)'], ['tech', 'Notas técnicas'], ['obs', 'Observaciones']].map(([k, l]) => `<button class="chip" data-act="pl-col" data-c="${k}" aria-pressed="${ea(planCols()[k])}">${planCols()[k] ? '✓ ' : ''}${l}</button>`).join('')}</div><span class="hint">El PDF y el Excel siempre las incluyen (también la figuración).</span>
      ${ed ? `<span class="hint pl-rzhint">Arrastra el borde derecho del título de una columna para cambiar su ancho (doble clic: ancho automático). Se guarda en el proyecto, para todo el equipo.</span>${Object.keys(plColW(S)).length ? '<button class="btn sm" data-act="pl-colw0" style="justify-self:start">Restaurar el ancho de las columnas</button>' : ''}` : ''}</div>
    <div class="fld"><span>Horas estimadas</span><label class="inl"><input type="number" min="5" max="240" step="5" value="${ea(minPerPage())}" data-bind="pl-mpp" aria-label="Minutos por página" ${ed ? '' : 'disabled'}><span>minutos por página de guion</span></label><span class="hint">Cada escena muestra su hora de inicio y su duración estimada desde el llamado. Una hora escrita a mano manda.</span></div>
    <div class="fld"><span>Sugerir jornadas</span><label class="inl"><input type="number" min="0.5" max="20" step="0.5" value="${ea(num(S.pagesPerDay) || 4.5)}" data-bind="pl-ppd" aria-label="Páginas por jornada" ${ed ? '' : 'disabled'}><span>páginas por jornada</span></label><span class="hint">≈ ${esc(fmtDur(Math.round((num(S.pagesPerDay) || 4.5) * minPerPage())))} de rodaje por jornada, con los minutos por página de arriba.</span></div>
`;
};
// en el teléfono la barra no muestra «Locaciones…» ni «+ Etapa»: van en su «⋯»
TOOLS_EXTRA.plan = () => planEditable() ? [[ICO.pin, 'Locaciones de rodaje…', () => locsDialog()], [ICO.plus, 'Etapa de rodaje…', () => stagesDialog(true)], ...(isSeries(P) ? [[ICO.plus, 'Bloque de episodios…', () => planBlockDialog()]] : [])] : [];
HELP.plan = [
  ['Stripboard', 'Cada escena es una tira a todo el ancho, con el color estándar: interior de día blanca, exterior de día amarilla, interior de noche azul, exterior de noche verde y amanecer o atardecer rosa (los colores se cambian en la leyenda; un color para resaltar manda sobre la tira). Columnas: número, I/E, la locación del guion con su sinopsis, D/N, el reparto en números, la locación de rodaje, las páginas (en octavos), la página donde empieza, el tiempo y las notas. Clic derecho en una escena (en una pantalla táctil, su ⋮) abre sus opciones y su hoja de desglose; en la barra de cierre, las opciones del cierre.'],
  ['Ancho de las columnas', 'En la computadora, arrastra el borde derecho del título de una columna para hacerla más angosta o más ancha; doble clic en ese borde la devuelve a su ancho automático. El texto que no cabe se corta con «…» y se lee entero al pasar el mouse. El ancho se guarda en el proyecto: todo el equipo lo ve igual. «Restaurar el ancho de las columnas», en Ajustes › Columnas en pantalla, las devuelve todas. El PDF y el Excel no cambian.'],
  ['Ordenar', 'Toca el título de una columna (Esc., I/E, Locación, D/N, Locación de rodaje o Págs.) para ordenar las escenas dentro de cada jornada y en «Sin programar»; otra vez, al revés. Ninguna escena cambia de jornada y los eventos se quedan en su lugar. Se deshace con Deshacer.'],
  ['Mover escenas', 'Presiona cualquier parte de una escena (fuera de los campos) y arrástrala: las demás le hacen espacio y los cambios se aplican al soltar. En el teléfono, mantén el dedo un instante antes de arrastrar. También: clic derecho › Mover a. Esc cancela.'],
  ['Elegir varias', 'Clic en una escena la elige y otro clic la suelta; Ctrl o ⌘ suma o quita, Mayús elige un tramo. Arrastra desde un espacio vacío para elegir varias con un recuadro, y luego arrastra una para moverlas juntas. Un clic en un espacio vacío (o Esc) quita la selección.'],
  ['Tiempo', 'Cada escena muestra su tiempo estimado (en gris), según sus octavos y los minutos por página de Ajustes. Escribe otro para cambiarlo (45, 1 h 15, 1:30). Las horas de cada escena y de cada plano se escriben en la hoja de llamado.'],
  ['Jornadas', 'Cada jornada empieza con su barra (número, fecha, llamado, escenas y duración estimada) y termina con la barra de cierre. Clic derecho en una barra (en el teléfono, mantén el dedo y suelta) abre sus opciones: color, completada, insertar jornada o quitar el corte; su «+» agrega eventos con hora. «Cortar la jornada aquí» (clic derecho en una escena) parte una jornada en dos.'],
  ['Mover jornadas', 'Arrastra la barra de inicio de la jornada (en el teléfono, mantén el dedo y arrastra), o usa sus opciones › Subir / Bajar jornada. La fecha fijada a mano viaja con la jornada; las automáticas siguen el nuevo orden al soltar. Su hoja de llamado va con ella.'],
  ['Fechas', 'Toca la fecha en la barra de la jornada para cambiarla. Las siguientes de la misma etapa se corren con ella; las de otras etapas no. El llamado se escribe en la misma barra.'],
  ['Dividir una escena', 'Clic derecho › Dividir crea 5A, 5B… Elige sus octavos en la columna Págs.'],
  ['Etapas y locaciones', 'Clic derecho (o el botón ⋯ de la jornada) › Nueva etapa aquí, o «+ Etapa» en la barra. Los nombres de las locaciones se cambian en «Locaciones…», en la barra.'],
  ['Series: bloques', 'En una serie, «+ Bloque» elige varios episodios y arma jornadas nuevas con sus escenas sin programar ordenadas por locación, juntando los episodios, en una etapa con su nombre y quién dirige. Cada jornada muestra sus episodios (Ep. 101 · 102) y cada escena su número con el episodio delante (101-12).'],
  ['Eventos', 'El «+» de la barra de cada jornada agrega traslados, comidas o ensayos con hora.'],
  ['La leyenda', 'Arriba de la tabla: qué significa cada color (día, noche, jornada y cierre, evento y los tuyos). Toca un color para cambiarlo en todo el proyecto, en los PDF y en los Excel; «+ Color» suma uno con nombre. Para resaltar una escena, un evento o una jornada, en sus opciones (clic derecho) elige un color de la leyenda.'],
  ['Personalización', 'En «⋯» de las pestañas (en el teléfono, en el menú de arriba › Personalización). En «Tu pantalla», solo para ti: el modo claro u oscuro, las pestañas visibles, el color de las etapas, la letra, las barras y las líneas. En «Colores del proyecto», para todo el equipo y los PDF: la paleta (Estándar, Original, Sobria, Alto contraste, Escala de grises), cada color y tus paletas guardadas para usarlas en otro proyecto. La leyenda también lleva ahí.'],
  ['DOOD', 'Muestra qué jornadas trabaja cada actor: I inicio, T trabaja, E en espera (entre su primera y su última jornada, sin escenas), F fin, IF un solo día. Al lado, sus jornadas de trabajo, de espera y el total de su contrato. Sale del plan y del desglose; toca el número de una jornada para verla en el plan. Exportar › Días por actor (PDF); también va en el Excel del plan.'],
];
EXPORTS.plan = () => [pdfItem('Stripboard (PDF)', 'plan', 'Una tabla por jornada, lista para imprimir'), pdfItem('DOOD (PDF)', 'dood', 'Qué jornadas trabaja cada actor: inicio, trabajo, espera y fin'), { label: 'Plan de rodaje (Excel)', hint: 'El stripboard, las locaciones y el DOOD, cada uno en su hoja, para seguir editándolos en Excel', run: () => exportPlanXLSX(), pro: 'excel' }];
