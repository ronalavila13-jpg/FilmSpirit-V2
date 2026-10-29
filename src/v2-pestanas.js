/* ============================================================
   VERSIÓN 2 · LAS PESTAÑAS QUE EL PDF NO DIBUJA (Historia, Proyecto, Guion rayado, Scouting, Casting, Animatic,
   Calendario, Gastos): son las de la v1 con la forma v2 (v2-pant.css). Aquí, lo poco que cambia en su contenido.
   ============================================================ */

/* Proyecto · Datos: «Tipo» (Cortometraje, Largometraje, Serie…), el que se ve debajo del nombre del proyecto en la
   barra lateral y en Inicio. Es opcional (P.meta.kind): sin elegir, se deduce del largo del guion (v2Kind), y la v1 lo
   ignora, así que los proyectos de antes se abren igual. */
RENDER.project = (orig => function () {
  const r = orig.apply(this, arguments);
  if (!V2.on) return r;
  const sel = $('#view select[data-bind="pj-aspect"]'), row = sel && sel.closest('.hd-row');
  if (row && !$('#view [data-bind="v2-kind"]')) {
    const ed = typeof projEditable === 'function' ? projEditable() : !UI.readOnly;
    const k0 = P.meta.kind; delete P.meta.kind;
    const auto = v2Kind(P, D.pages ? D.pages.length : 0);
    if (k0 !== undefined) P.meta.kind = k0;
    const cur = P.meta.kind && V2_KINDS.includes(P.meta.kind) ? P.meta.kind : '';
    row.insertAdjacentHTML('beforebegin', hdRow('Tipo', `<select class="pj-sel" data-bind="v2-kind" aria-label="Tipo de proyecto" ${ed ? '' : 'disabled'}>
      <option value="" ${cur ? '' : 'selected'}>${esc(auto)} (según el guion)</option>${V2_KINDS.map(k => `<option ${k === cur ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>`));
  }
  return r;
})(RENDER.project);
BIND['v2-kind'] = el => {
  if (el.value && V2_KINDS.includes(el.value)) P.meta.kind = el.value; else delete P.meta.kind;
  changed('data'); v2ProjSub();
};

/* ---------- los estilos de los documentos: «Cuadrícula» y «Limpio» (antes «Excel» y «Apple») ----------
   Lo pidió Ronald: nombres que digan lo que se ve. Cambian solo los nombres en pantalla (el selector, el «⋯», la ayuda
   y el historial); el dato sigue siendo 'excel' o 'apple' (P.schedule.style, P.call.style), así que la v1 y los
   proyectos guardados no cambian. «Excel» como formato de archivo (exportar a Excel) no se toca. */
const V2_STYLE_TXT = { excel: ['Cuadrícula', 'en cuadros, con líneas negras bien visibles (en la pantalla y en el PDF)'], apple: ['Limpio', 'líneas finas y aire, sin cuadros (en la pantalla y en el PDF)'] };
if (typeof HD_STYLES !== 'undefined') for (const s of HD_STYLES) { const t = V2_STYLE_TXT[s[0]]; if (t) { s[1] = t[0]; s[2] = `Estilo ${t[0]}: ${t[1]}`; } }
const v2StyleNames = s => typeof s !== 'string' ? s : s.replace(/Excel \| Apple/g, 'Cuadrícula | Limpio').replace(/estilo Excel/g, 'estilo Cuadrícula').replace(/estilo Apple/g, 'estilo Limpio')
  .replace(/«Excel»/g, '«Cuadrícula»').replace(/«Apple»/g, '«Limpio»');
/* el «Estilo del documento» del «⋯» (hdStyleMore, cabecera.js), con los nombres nuevos */
function v2StyleMore(act, xl) {
  return [ICO.palette, `Estilo del documento <small>${xl ? 'Cuadrícula' : 'Limpio'}</small>`, a => popover(a, `<h5>Estilo del documento</h5><div class="menu hd-stm">${Object.entries(V2_STYLE_TXT).map(([v, [l, t]]) => `<button type="button" data-v="${v}"${(v === 'excel') === xl ? ' aria-current="true"' : ''}><b>${esc(l)}</b> <small>${esc(t)}</small></button>`).join('')}</div>`,
    p => p.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; closePop(); ACT[act](b); }))];
}
for (const [tab, act, xl] of [['plan', 'pl-style', () => planXL()], ['call', 'cl-style', () => callXL()]]) {
  const f = typeof TOOLS_EXTRA !== 'undefined' && TOOLS_EXTRA[tab];
  if (f) TOOLS_EXTRA[tab] = function () { return f.apply(this, arguments).map(it => Array.isArray(it) && /^Estilo del documento/.test(String(it[1])) ? v2StyleMore(act, xl()) : it); };
}
if (typeof HELP !== 'undefined') for (const tab of ['plan', 'call']) for (const h of HELP[tab] || []) if (h[0] === 'Excel | Apple') { h[0] = 'Cuadrícula | Limpio'; h[1] = v2StyleNames(h[1]).replace(/como una (hoja de cálculo|planilla)/, 'como una cuadrícula'); }
{
  const _hn = histNote;
  histNote = function (label) { return _hn.apply(this, [v2StyleNames(label), ...[].slice.call(arguments, 1)]); };
}
