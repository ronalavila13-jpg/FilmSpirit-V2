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
