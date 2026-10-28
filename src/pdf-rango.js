/* ============================================================
   EXPORTAR UNA PARTE · escenas, jornadas o páginas
   En el menú Exportar, cada PDF tiene «Elegir…»: todo, algunas escenas («1-5, 8, 12A»), algunas
   jornadas o algunas páginas. Escenas y jornadas arman un documento solo con eso (con su propia
   numeración); las páginas se sacan del documento completo y conservan su número. En el guion,
   las páginas son las del guion (12, 12A…), sin la carátula.
   ============================================================ */
let PDF_SEL = null;     // mientras se arma un PDF: { sc: Set de escenas, days: Set de jornadas (0…), pages: Set de páginas, tag }
// qué se puede elegir en cada PDF, además de las páginas
const PDF_UNITS = { breakdown: 'sc', storyboard: 'sc', shotlist: 'sc', script: 'sc', screenplay: 'sc', sup: 'sc', plan: 'day', call: 'day' };
const pdfUnitOf = kind => (kind === 'script' || kind === 'screenplay') && typeof edFormat === 'function' && edFormat() === 'av' ? '' : PDF_UNITS[kind] || '';
const pdfIsScript = kind => (kind === 'script' || kind === 'screenplay') && !(typeof edFormat === 'function' && edFormat() === 'av');
/* lo que usan los generadores */
const pdfScenes = () => PDF_SEL && PDF_SEL.sc ? D.sc.scenes.filter(s => PDF_SEL.sc.has(s.key)) : D.sc.scenes;
const pdfKeys = keys => PDF_SEL && PDF_SEL.sc ? keys.filter(k => PDF_SEL.sc.has(k)) : keys;
const pdfDayOk = n => !PDF_SEL || !PDF_SEL.days || PDF_SEL.days.has(n);
const pdfPart = () => !!(PDF_SEL && (PDF_SEL.sc || PDF_SEL.days || PDF_SEL.pages));
/* guion: ¿esta página entra? (por escenas: si tiene texto de una de ellas; por páginas: su número impreso) */
function pdfScriptPageOk(pg, pi) {
  if (!PDF_SEL) return true;
  if (PDF_SEL.pages) return PDF_SEL.pages.has(pageLabel(D.pages, pi));
  if (PDF_SEL.sc) return pg.some(ln => !ln.blank && ln.p != null && PDF_SEL.sc.has(sceneKeyOfPara(ln.p)));
  return true;
}
function sceneKeyOfPara(p) {
  const L = D.sc.scenes; let lo = 0, hi = L.length - 1, k = null;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (L[m].p0 <= p) { k = L[m].key; lo = m + 1; } else hi = m - 1; }
  return k;
}

/* «1-5, 8, 12A»: lista de piezas; cada pieza es un valor o un rango a-b */
const rangeParts = txt => String(txt || '').split(/[,;\s]+/).map(x => x.trim()).filter(Boolean).map(x => {
  const m = /^([^-–]+)[-–]([^-–]+)$/.exec(x); return m ? [m[1].trim(), m[2].trim()] : [x];
});
/* escenas por su número (con letras: 12A); un rango sigue el orden del guion, así 4-6 incluye 4A */
function parseScenes(txt) {
  const L = D.sc.scenes, idx = new Map(L.map((s, i) => [String(s.key).toUpperCase(), i])), out = new Set(), bad = [];
  // series: los números llevan guion (101-12): la pieza entera es una escena, «101» es todo el episodio y un rango es
  // «101-3-101-9» (o con «–»); el resto, como siempre
  const eps = new Map(((D.sc.eps) || []).map(e => [e.n.toUpperCase(), e]));
  const split = x => {
    const X = x.toUpperCase();
    if (idx.has(X)) return [x];
    if (eps.has(X)) { const e = eps.get(X); return e.s1 > e.s0 ? [L[e.s0].key, L[e.s1 - 1].key] : [x]; }
    for (let i = x.indexOf('-'); i > 0; i = x.indexOf('-', i + 1)) if (idx.has(X.slice(0, i)) && idx.has(X.slice(i + 1))) return [x.slice(0, i), x.slice(i + 1)];
    const m = /^(.+)–(.+)$/.exec(x); if (m) return [m[1].trim(), m[2].trim()];
    return null;
  };
  const parts = (D.sc.eps || []).length ? String(txt || '').split(/[,;\s]+/).map(x => x.trim()).filter(Boolean).map(x => split(x) || [x]) : rangeParts(txt);
  for (const part of parts) {
    const ii = part.map(x => idx.get(x.toUpperCase()));
    if (ii.some(i => i == null)) { bad.push(part.join('-')); continue; }
    const [a, b] = ii.length === 2 ? [Math.min(...ii), Math.max(...ii)] : [ii[0], ii[0]];
    for (let i = a; i <= b; i++) out.add(L[i].key);
  }
  return { set: out, bad };
}
function parseNums(txt, max) {
  const out = new Set(), bad = [];
  for (const part of rangeParts(txt)) {
    const n = part.map(x => /^\d+$/.test(x) ? +x : NaN);
    if (n.some(v => !(v >= 1) || (max && v > max))) { bad.push(part.join('-')); continue; }
    const [a, b] = n.length === 2 ? [Math.min(...n), Math.max(...n)] : [n[0], n[0]];
    if (b - a > 5000) { bad.push(part.join('-')); continue; }
    for (let v = a; v <= b; v++) out.add(v);
  }
  return { set: out, bad };
}
/* páginas del guion por su número impreso: «12» es la 12; un rango incluye las de letra (12A) */
function parseScriptPages(txt) {
  const labs = D.pages.map((_, i) => pageLabel(D.pages, i)), num = l => parseInt(l, 10), out = new Set(), bad = [];
  for (const part of rangeParts(txt)) {
    if (part.length === 1) { const l = labs.find(x => x.toUpperCase() === part[0].toUpperCase()); if (l) out.add(l); else bad.push(part[0]); continue; }
    const a = num(part[0]), b = num(part[1]);
    if (!(a >= 1 && b >= 1)) { bad.push(part.join('-')); continue; }
    const hit = labs.filter(l => num(l) >= Math.min(a, b) && num(l) <= Math.max(a, b));
    if (hit.length) hit.forEach(l => out.add(l)); else bad.push(part.join('-'));
  }
  return { set: out, bad };
}
/* texto corto para el nombre del archivo: «1-5_8» */
const selTag = txt => rangeParts(txt).map(p => p.join('-')).join('_').replace(/[^\w-]/g, '').slice(0, 40);

/* la ventana «Elegir…» de un PDF del menú Exportar */
function pdfRangeDialog(item, btn) {
  const { kind, opts } = item.pdf, script = pdfIsScript(kind);
  // (lote AH) «Esta hoja» de una hoja libre: no hay jornadas que elegir (solo páginas)
  const freeCall = kind === 'call' && !(opts && opts.all) && typeof callIsFree === 'function' && callIsFree(callRef()), unit = freeCall ? '' : pdfUnitOf(kind);
  const mem = ls.get('pdfSel:' + kind, null) || {};
  const nSc = D.sc.scenes.length;
  const days = unit === 'day' ? (kind === 'call' && typeof callDays === 'function' ? callDays().days : scheduleDays(P, D.sc).days) : [];
  // la escena o la jornada que se está mirando, para elegirla de un toque
  const curSc = UI.tab === 'breakdown' && D.sc.scenes[UI.scene] ? D.sc.scenes[UI.scene].key : UI.tab === 'board' && UI.sbScene ? UI.sbScene : '';
  const curDay = unit === 'day' ? (kind === 'call' ? UI.callDay || 0 : null) : null;
  const firstLab = script && D.pages.length ? pageLabel(D.pages, 0) : '1', lastLab = script && D.pages.length ? pageLabel(D.pages, D.pages.length - 1) : '';
  const opt = (v, title, inner) => `<label class="opt rg-opt"><input type="radio" name="rgm" value="${v}" ${(mem.mode || 'all') === v ? 'checked' : ''}><span><b>${title}</b>${inner || ''}</span></label>`;
  const field = (v, ph, hint, quick) => `<span class="rg-f"><input type="text" class="rg-in" data-rg="${v}" value="${esc(mem.mode === v ? mem.text || '' : '')}" placeholder="${ea(ph)}" autocomplete="off" spellcheck="false" aria-label="${ea(ph)}">${quick || ''}</span><span class="hint">${hint}</span>`;
  const m = modal({
    title: 'Exportar · ' + item.label.replace(/\s*\(PDF\)…?\s*$/, ''),
    body: `<div class="rg">
      ${opt('all', kind === 'call' ? (opts && opts.all === false ? (typeof callRangeLabel === 'function' ? callRangeLabel() : `Esta jornada (${(UI.callDay || 0) + 1})`) : 'Todas las jornadas') : 'Todo el documento')}
      ${unit === 'sc' && nSc ? opt('sc', 'Escenas', field('sc', (D.sc.eps || []).length ? 'Ej.: 101, 102-3-102-9, 103-4' : 'Ej.: 1-5, 8, 12A', `De la ${esc(D.sc.scenes[0].key)} a la ${esc(D.sc.scenes[nSc - 1].key)}. Separa con comas; «4-9» es de la 4 a la 9 (con 4A, 5A…).`, curSc ? `<button type="button" class="btn sm" data-q="${esc(curSc)}">Esta escena (${esc(curSc)})</button>` : '')) : ''}
      ${unit === 'day' && days.length ? opt('day', 'Jornadas', field('day', 'Ej.: 1-3, 5', `De la 1 a la ${days.length}.`, curDay != null ? `<button type="button" class="btn sm" data-q="${curDay + 1}">Esta jornada (${curDay + 1})</button>` : '')) : ''}
      ${opt('pg', 'Páginas', field('pg', 'Ej.: 2-4, 7', script ? `Las páginas del guion, con su número (de la ${esc(firstLab)} a la ${esc(lastLab)}), sin la carátula.` : 'Las páginas del documento completo; cada una conserva su número.'))}
    </div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="rgGo">Exportar PDF</button>`,
  });
  const mode = () => ($('input[name=rgm]:checked', m) || {}).value || 'all';
  // escribir en un campo elige su opción
  m.addEventListener('input', e => { const f = e.target.closest('[data-rg]'); if (f) { const r = $(`input[name=rgm][value="${f.dataset.rg}"]`, m); if (r) r.checked = true; } });
  m.addEventListener('click', e => {
    const q = e.target.closest('[data-q]'); if (!q) return;
    const f = q.parentElement.querySelector('[data-rg]'); f.value = q.dataset.q; f.dispatchEvent(new Event('input', { bubbles: true }));
  });
  m.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-rg]')) { e.preventDefault(); $('#rgGo', m).click(); } });
  $('#rgGo', m).onclick = () => {
    const md = mode(), txt = md === 'all' ? '' : ($(`[data-rg="${md}"]`, m) || {}).value || '';
    let sel = null;
    if (md !== 'all') {
      if (!txt.trim()) { toast(md === 'sc' ? 'Escribe qué escenas: por ejemplo 1-5, 8.' : md === 'day' ? 'Escribe qué jornadas: por ejemplo 1-3.' : 'Escribe qué páginas: por ejemplo 2-4.', 4000); $(`[data-rg="${md}"]`, m).focus(); return; }
      const r = md === 'sc' ? parseScenes(txt) : md === 'day' ? parseNums(txt, days.length) : script ? parseScriptPages(txt) : parseNums(txt, 0);
      if (r.bad.length || !r.set.size) {
        toast(md === 'sc' ? `No encuentro ${r.bad.length === 1 ? 'la escena' : 'las escenas'} ${r.bad.join(', ')}. Van de la ${D.sc.scenes[0].key} a la ${D.sc.scenes[nSc - 1].key}.`
          : md === 'day' ? `No hay ${r.bad.length === 1 ? 'jornada' : 'jornadas'} ${r.bad.join(', ')}: son de la 1 a la ${days.length}.`
            : `No encuentro ${r.bad.length === 1 ? 'la página' : 'las páginas'} ${r.bad.join(', ')}${script ? `: el guion va de la ${firstLab} a la ${lastLab}` : ''}.`, 5000);
        $(`[data-rg="${md}"]`, m).focus(); return;
      }
      sel = md === 'sc' ? { sc: r.set, tag: '_escenas_' + selTag(txt) } : md === 'day' ? { days: new Set([...r.set].map(n => n - 1)), tag: '_jornadas_' + selTag(txt) }
        : { pages: r.set, script, tag: '_paginas_' + selTag(txt) };
    }
    ls.set('pdfSel:' + kind, { mode: md, text: txt });
    closeModal();
    exportPDF(kind, btn, { ...(opts || {}), ...(sel ? { sel } : {}) });
  };
  // el foco va a la opción elegida (o a su campo): no a otro campo, con dos marcos rojos a la vez
  setTimeout(() => { const f = $(`[data-rg="${mode()}"]`, m) || $('input[name=rgm]:checked', m); if (f) f.focus(); }, 40);
}
/* páginas elegidas del documento completo: se quitan las demás (de atrás para adelante) */
function pdfKeepPages(doc, pages) {
  const n = doc.getNumberOfPages(), keep = [...pages].filter(p => p >= 1 && p <= n);
  if (!keep.length) return `Esas páginas no existen: el documento tiene ${n} ${n === 1 ? 'página' : 'páginas'}.`;
  for (let p = n; p >= 1; p--) if (!pages.has(p)) doc.deletePage(p);
  return '';
}
