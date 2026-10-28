/* ============================================================
   PLAN DE RODAJE · el ancho de las columnas del stripboard (lote Y; aparte de tab-plan.js desde el lote AC)
   Cada columna tiene su ancho automático o el que se le dio arrastrando el borde derecho de su título. Ese ancho se
   guarda en el proyecto (P.schedule.colW, en px por clave de PL_COLS): todo el equipo ve los mismos anchos. Doble clic
   en el asa: vuelve al automático; «Restaurar el ancho de las columnas» (Ajustes): todas. Cada cambio es un paso del
   historial. Solo en la computadora con mouse: en el teléfono el stripboard no cambia. El PDF y el Excel tampoco.
   ============================================================ */
/* mínimo de cada columna (las chicas, 32 px) y máximo para todas */
const PL_CW_MIN = { set: 80, loc: 80, tech: 60, obs: 60, cast: 40, t: 44, ie: 36 }, PL_CW_MAX = 800;
const plCwClamp = (k, v) => Math.round(Math.min(PL_CW_MAX, Math.max(PL_CW_MIN[k] || 32, +v || 0)));
// con la columna más angosta que esto, la miniatura del storyboard (Locación) y el ícono del pin (Locación de rodaje)
// dejan el lugar a su texto: la clase del tablero que lo hace
const PL_NARROW = { set: [200, 'set-nt'], loc: [120, 'loc-np'] };
/* las columnas de la pantalla, en orden (sin el menú ⋮ de las pantallas táctiles) */
const plColKeys = c => PL_COLS.map(x => x[0]).filter(k => k !== 'more' && (k !== 'fig' || c.fig) && (k !== 'tech' || c.tech) && (k !== 'obs' || c.obs));
/* (lote AC) los anchos guardados se limpian una sola vez, al abrir el proyecto o al llegar el plan de otra persona
   (proyectos.js · normalizeProject): solo de columnas que existen, en número y dentro del mínimo y el máximo; sin
   ninguno, colW no va. Después se leen tal cual (plColW) y solo plColWPut los cambia */
function plColWClean(S) {
  const o = {}, w = S.colW;
  if (w && typeof w === 'object' && !Array.isArray(w)) for (const [k, v] of Object.entries(w)) if (k !== 'more' && PL_COLS.some(x => x[0] === k) && Number.isFinite(+v) && +v > 0) o[k] = plCwClamp(k, v);
  if (Object.keys(o).length) S.colW = o; else delete S.colW;
}
const plColW = () => P.schedule.colW || {};
/* la plantilla de la grilla: c, las columnas en pantalla; used, si hay notas escritas ({ tech, obs }); cw, los anchos
   guardados. Cada columna lleva su ancho guardado (en px) o el automático; min suma lo menos que ocupa la tabla (más
   que eso, se desplaza a lo ancho) */
function plGrid(c, used, cw) {
  // las notas vacías en todo el plan ceden su ancho a la escena (siguen ahí para escribir)
  const note = f => [used[f] ? 'minmax(140px,1fr)' : 'minmax(130px,.45fr)', 130], th = c.thumb ? 280 : 220;
  // (lote AH) «Tiempo aprox.» entra entero en su título: 92 px (antes 68, para «Tiempo»)
  const auto = { esc: ['52px', 52], ie: ['42px', 42], set: [`minmax(${th}px,1.7fr)`, th], dn: ['78px', 78], cast: ['112px', 112], fig: ['46px', 46], loc: ['minmax(150px,1fr)', 150], pgs: ['58px', 58], pg: ['40px', 40], t: ['92px', 92], tech: note('tech'), obs: note('obs') };
  const keys = plColKeys(c);
  return { keys, cols: keys.map(k => cw[k] ? cw[k] + 'px' : auto[k][0]), min: keys.reduce((a, k) => a + (cw[k] || auto[k][1]), 0) };
}
const plNotesUsed = () => ({ tech: P.schedule.items.some(it => (it.tech || '').trim()), obs: P.schedule.items.some(it => (it.obs || '').trim()) });
/* las clases del tablero por los anchos guardados: las de PL_NARROW */
const plNarrow = (cw, keys) => Object.entries(PL_NARROW).map(([k, [n, cl]]) => [cl, keys.includes(k) && !!cw[k] && cw[k] < n]);
const plCwCls = (cw, keys) => plNarrow(cw, keys).filter(x => x[1]).map(x => ' ' + x[0]).join('');
/* (lote AC) la celda (o el título) de una columna con su ancho propio lleva data-cw: en la computadora corta su texto
   con «…» (shell.html). t, el texto entero, para leerlo al pasar el mouse */
const plCwAttr = (cw, k, t) => cw[k] ? ' data-cw' + (t ? ` title="${ea(t)}"` : '') : '';
function planColsCSS() {
  const c = planCols(), cw = plColW();
  // (lote W) sin la columna del menú ⋮: la suma el CSS solo en las pantallas táctiles (--pl-more)
  const G = plGrid(c, plNotesUsed(), cw);
  return { cls: (c.fig ? '' : ' no-fig') + (c.tech ? '' : ' no-tech') + (c.obs ? '' : ' no-obs') + plCwCls(cw, G.keys), style: `--pl-cols:${G.cols.join(' ')};--pl-min:${G.min}px` };
}
/* el asa para cambiar el ancho: en el borde derecho de cada título, fuera del botón que ordena (va aparte, ubicada sobre
   su columna de la grilla). Solo quien puede editar el plan (plHeadHTML), y el CSS la deja solo para el ratón */
const plRzHTML = () => plColKeys(planCols()).map((k, j, keys) => `<i class="pl-rz${j === keys.length - 1 ? ' end' : ''}" data-c="${k}" style="grid-column:${j + 1}/${j + 2}" title="Arrastra para cambiar el ancho · doble clic: ancho automático" aria-hidden="true"></i>`).join('');
/* arrastrar el asa (bindBoard: no arrastra filas, no ordena ni empieza un recuadro de selección): la columna cambia de
   ancho junto con el ratón (la grilla se actualiza en --pl-cols, sin volver a pintar el plan) y al soltar queda guardada
   en el proyecto, en un solo paso del historial. Esc cancela. Una línea a lo alto del plan marca el borde mientras se
   arrastra. Con el dedo, nada (en las pantallas táctiles no hay asas) */
function startColResize(e, h) {
  if (e.button !== 0 || e.pointerType === 'touch' || !planEditable()) return;
  const board = $('#board'), head = h.parentElement, k = h.dataset.c;
  const c = planCols(), used = plNotesUsed(), cw0 = plColW(), keys = plColKeys(c), j = keys.indexOf(k);
  if (!board || j < 0) return;
  // el ancho de ahora, el que se ve (el automático o el guardado)
  const tracks = () => getComputedStyle(head).gridTemplateColumns.split(' ').map(parseFloat);
  const w0 = Math.round(tracks()[j]) || cw0[k] || 100, x0 = e.clientX;
  let w = w0, moved = false, raf = 0;
  const line = document.createElement('div');
  line.className = 'pl-rzline';
  h.classList.add('on'); document.body.classList.add('rz-ew');
  try { h.setPointerCapture(e.pointerId); } catch (er) { }
  const paint = () => {
    raf = 0;
    const cw = { ...cw0, [k]: w }, G = plGrid(c, used, cw);
    board.style.setProperty('--pl-cols', G.cols.join(' '));
    board.style.setProperty('--pl-min', G.min + 'px');
    // la primera vez, las celdas de la columna cortan su texto como con su ancho guardado
    if (!line.isConnected) for (const el of board.querySelectorAll('.c-' + k)) el.dataset.cw = '';
    for (const [cl, on] of plNarrow(cw, keys)) board.classList.toggle(cl, on);
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
    line.remove(); h.classList.remove('on'); document.body.classList.remove('rz-ew');
    const ok = ev && ev.type === 'pointerup' && moved && w !== (cw0[k] || w0);
    if (ok && planEditable()) planColSet(k, w);
    else if (moved) render();   // vuelve a como estaba
  };
  const onEsc = ev => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); end({ type: 'cancel' }); } };
  addEventListener('pointermove', move, true); addEventListener('pointerup', end, true); addEventListener('pointercancel', end, true);
  addEventListener('keydown', onEsc, true);
}
/* guarda el ancho de una columna (null: vuelve al automático; sin ancho propio, nada) */
function planColSet(k, w) {
  const col = PL_COLS.find(x => x[0] === k && k !== 'more'); if (!col || !planEditable()) return;
  const cw = { ...plColW() };
  if (w == null) { if (!(k in cw)) return; delete cw[k]; } else cw[k] = plCwClamp(k, w);
  plColWPut(`Ancho de la columna ${col[1]}`, cw);
}
/* (lote AC) los anchos nuevos (sin ninguno, todas automáticas) como un paso del historial; el plan se vuelve a pintar */
function plColWPut(label, cw) {
  histNote(label);
  if (Object.keys(cw).length) P.schedule.colW = cw; else delete P.schedule.colW;
  changed('data'); render();
}
Object.assign(ACT, {
  // todas las columnas a su ancho automático (para todo el equipo; se puede deshacer)
  'pl-colw0': () => {
    if (!planEditable() || !P.schedule.colW) return;
    plColWPut('Restaurar el ancho de las columnas', {});
    toastUndo('Las columnas volvieron a su ancho automático.');
  },
});
