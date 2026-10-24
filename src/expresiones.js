/* ============================================================
   EXPRESIONES · una sola herramienta para dibujar caras
   - Cada personaje tiene su biblioteca (el.look.faces): puede redibujar cualquier predefinida («feliz»…)
     y sumar expresiones propias («c:…»). Se edita desde el plano (lápiz «Editar esta expresión») o desde
     su ficha (pestaña «Expresión»). Los ojos predefinidos se pueden quitar (el.look.eyes = false).
   - Las figuras genéricas (sin personaje) guardan sus dibujos en el proyecto (P.faces, «f:…»).
   - Un dibujo por expresión. Herramientas: pincel con presión, línea suave, relleno, borrador, grosor,
     color, simetría, deshacer, rehacer y limpiar.
   - Sin expresión de base, la cara muestra guías (eje, línea de ojos con su lugar, nariz y boca), también
     sobre el maniquí mientras se dibuja. Nunca salen en la viñeta guardada ni en el PDF.
   ============================================================ */
const FACE_LIVE = { ob: null, c: null, tex: null };
function faceLiveTex() {
  if (!FACE_LIVE.ob || !FACE_LIVE.c || typeof THREE === 'undefined') return null;
  if (!FACE_LIVE.tex) { FACE_LIVE.tex = new THREE.CanvasTexture(FACE_LIVE.c); FACE_LIVE.tex.colorSpace = THREE.SRGBColorSpace; FACE_LIVE.tex.anisotropy = 4; }
  return FACE_LIVE.tex;
}
const FACE_COLORS = [['#2A2724', 'Tinta'], ['#FFFFFF', 'Blanco'], ['#C65A4E', 'Rojo'], ['#E9A3A0', 'Rubor'], ['#3D6EB4', 'Azul'], ['#7A5434', 'Café']];
/* guías para dibujar sin expresión de base: eje, línea de los ojos con su lugar, nariz y boca */
function drawFaceGuides(g, S) {
  const k = S / 128;
  g.save(); g.scale(k, k);
  // tenues: orientan sin competir con el dibujo (los lugares de los ojos, casi imperceptibles)
  g.strokeStyle = 'rgba(37,118,226,.32)'; g.lineWidth = .6; g.lineCap = 'round';
  const seg = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  g.setLineDash([2.2, 2.2]);
  seg(64, 26, 64, 110); seg(28, 61, 100, 61); seg(47, 90, 81, 90);
  seg(36, 43, 58, 43); seg(70, 43, 92, 43);    // cejas
  g.setLineDash([]);
  g.strokeStyle = 'rgba(37,118,226,.08)';
  for (const x of [48, 80]) { g.beginPath(); g.ellipse(x, 61.5, 10.5, 8.2, 0, 0, Math.PI * 2); g.stroke(); }
  g.strokeStyle = 'rgba(37,118,226,.32)';
  seg(61, 77, 67, 77); seg(64, 74.5, 64, 77);   // nariz
  g.restore();
}
/* ícono de una expresión (ya resuelta con faceKeyFor) sobre una cabeza facetada, como la de las figuras */
const EXPR_ICONS = {};
function exprIcon(key) {
  if (EXPR_ICONS[key]) return EXPR_ICONS[key];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 12; i++) {
    const a0 = (i - .5) * Math.PI / 6, a1 = (i + .5) * Math.PI / 6;
    g.fillStyle = ['#F3ECE2', '#E6DDCF', '#DCD2C3'][i % 3];
    g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + Math.cos(a0) * 30, 32 + Math.sin(a0) * 30); g.lineTo(32 + Math.cos(a1) * 30, 32 + Math.sin(a1) * 30); g.closePath(); g.fill();
  }
  g.fillStyle = '#EFE7DB'; g.beginPath(); for (let i = 0; i < 12; i++) { const a = (i - .5) * Math.PI / 6; g.lineTo(32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22); } g.closePath(); g.fill();
  // la cara se ve un poco más grande que en la cabeza: se lee mejor en 30 px
  g.save(); g.translate(32, 31); g.scale(1.04, 1.04); g.translate(-32, -31); drawFace(g, 64, key); g.restore();
  return (EXPR_ICONS[key] = c.toDataURL());
}
/* nombre de una expresión para una figura (look: el de lookOf) */
function exprLabel(k, look) {
  k = k || 'neutral';
  if (k.slice(0, 2) === 'f:') return (customFace(k.slice(2)) || {}).name || 'Dibujada';
  if (k.slice(0, 2) === 'c:') return ((look && look.faces && look.faces[k]) || {}).name || 'Dibujada';
  return (S3_EXPR.find(([e]) => e === k) || [0, 'Neutral'])[1];
}
/* la biblioteca de una figura: predefinidas (con los redibujos del personaje), las propias y las del proyecto.
   Las del proyecto se ofrecen a las figuras genéricas; a un personaje, solo la que ya tenga puesta. */
function exprEntries(look, cur) {
  const faces = (look && look.faces) || {}, ch = !!(look && look.key);
  const out = S3_EXPR.map(([k, n]) => ({ k, n, own: !!faces[k], kind: 'pre' }));
  for (const [k, d] of Object.entries(faces)) if (k.slice(0, 2) === 'c:') out.push({ k, n: d.name || 'Dibujada', own: true, kind: 'char' });
  for (const [id, d] of Object.entries((typeof P !== 'undefined' && P.faces) || {}))
    if (!ch || cur === 'f:' + id) out.push({ k: 'f:' + id, n: d.name || 'Dibujada', own: true, kind: 'proj' });
  return out;
}
/* ---------- el editor ----------
   o = { anchor, title, sub, d: { base, strokes, name? }, named, eyes: true/false/null (null: figura genérica),
         ob: id de la figura en la vista 3D (dibujo en vivo sobre el maniquí), live(): repinta esa vista,
         glasses: estilo de lentes, save(d, eyes, glasses), cancel?() } */
function openExprEditor(o) {
  const d = JSON.parse(JSON.stringify(o.d || { base: '', strokes: [] }));
  d.strokes = d.strokes || []; d.base = d.base || '';
  let eyes = o.eyes !== false, glasses = o.glasses || '';
  const tool = { t: 'brush', w: 2.6, c: FACE_INK, m: false };
  const redo = [];
  const I = {
    brush: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4.5l5 5L10 19c-1.6 1.6-4.4 1.5-6 1 .6-1 .4-2.4 1-4z"/><path d="m12.5 6.5 5 5"/></svg>',
    smooth: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17c3-8 6-10 9-6s6 2 9-6"/></svg>',
    fill: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13c0-4 3-7 7-7s7 3 7 7-3 5-7 5-7-1-7-5z" fill="currentColor"/></svg>',
    erase: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20h12M5.5 14.5 14 6l5 5-8.5 8.5H8z"/></svg>',
    sym: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18" stroke-dasharray="2 2.4"/><path d="M9 7 4 12l5 5M15 7l5 5-5 5"/></svg>',
    undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    redo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>',
    clear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9.5 7V4.5h5V7"/></svg>',
  };
  const T = (t, label, ico) => `<button data-t="${ea(t)}" aria-pressed="${ea(tool.t === t)}" title="${ea(label)}" aria-label="${ea(label)}">${ico}</button>`;
  const html = `<div class="fe-h">${esc(o.title || 'Expresión')}${o.sub ? ` <small>${esc(o.sub)}</small>` : ''}</div>
    <div class="fe-wrap"><canvas class="fe-c" width="512" height="512" aria-label="Cara para dibujar con el dedo, el lápiz o el ratón"></canvas></div>
    <div class="fe-tools" role="toolbar" aria-label="Herramientas">
      ${T('brush', 'Pincel con presión (con el lápiz; con el dedo o el ratón, más fino cuanto más rápido)', I.brush)}${T('smooth', 'Línea suave: trazo limpio y afinado en las puntas (párpados, cejas)', I.smooth)}${T('fill', 'Relleno: dibuja una forma cerrada y se rellena (iris, boca abierta)', I.fill)}${T('erase', 'Borrador (también borra la expresión de base)', I.erase)}
      <i class="sep"></i><button data-a="sym" aria-pressed="false" title="Simetría: lo que dibujas en un lado aparece reflejado en el otro" aria-label="Simetría">${I.sym}</button>
      <i class="sep"></i><button data-a="undo" title="Deshacer el último trazo" aria-label="Deshacer">${I.undo}</button><button data-a="redo" title="Rehacer" aria-label="Rehacer">${I.redo}</button><button data-a="clear" title="Limpiar: borrar todos los trazos" aria-label="Limpiar">${I.clear}</button>
    </div>
    <div class="fe-opts"><label class="fe-w" title="Grosor"><span>Grosor</span><input type="range" min="0.8" max="12" step="0.2" value="${ea(tool.w)}" data-f="w" aria-label="Grosor"></label>
      <div class="fe-sws" role="group" aria-label="Color">${FACE_COLORS.map(([c, n], i) => `<button class="sw" style="--sw:${ea(c)}" data-c="${ea(c)}" aria-pressed="${ea(i === 0)}" title="${n}" aria-label="Color ${n}"></button>`).join('')}<label class="sw sw-pick" style="--sw:#3D6EB4" title="Otro color"><input type="color" data-f="c" value="#3D6EB4" aria-label="Otro color"></label></div></div>
    <div class="fe-row${ea(o.named ? '' : ' one')}"><label class="fld"><span>Base</span><select data-f="base"><option value="">Ninguna · dibujo libre (con guías)</option>${S3_EXPR.map(([k, n]) => `<option value="${k}" ${d.base === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      ${o.named ? `<label class="fld"><span>Nombre</span><input data-f="name" maxlength="24" value="${esc(d.name || '')}" placeholder="Ej.: Llorando"></label>` : ''}</div>
    <div class="fe-row"><label class="fld" title="${ea(o.eyes == null ? 'Lentes de esta figura' : 'Lentes del personaje: en todas sus expresiones')}"><span>Lentes</span><select data-f="gl">${FACE_GLASSES.map(([k2, n]) => `<option value="${ea(k2)}" ${glasses === k2 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      ${o.eyes == null ? '' : `<label class="fe-chk" title="Vale para todas sus expresiones: sin ellos, los ojos se dibujan a mano"><input type="checkbox" data-f="eyes" ${eyes ? 'checked' : ''}> Ojos predefinidos</label>`}</div>
    <div class="fe-ft">${o.extra || ''}<span class="grow"></span><button class="btn sm" data-a="cancel">Cancelar</button><button class="btn sm primary" data-a="save">Guardar</button></div>`;
  const d0 = JSON.stringify(d) + eyes + glasses;
  const p = popover(o.anchor, html, pp => {
    pp.classList.add('pop-face');
    pp._keep = () => JSON.stringify(d) + eyes + glasses !== d0;
    pp._save = () => pp.querySelector('.fe-ft [data-a="save"]').click();
    const cv = pp.querySelector('.fe-c'), g = cv.getContext('2d');
    // vista en vivo sobre el maniquí
    if (o.ob) { FACE_LIVE.c = FACE_LIVE.c || Object.assign(document.createElement('canvas'), { width: 256, height: 256 }); FACE_LIVE.ob = o.ob; }
    const liveCtx = FACE_LIVE.c && FACE_LIVE.c.getContext('2d');
    let liveRaf = 0;
    const paintLive = () => {
      if (!o.ob || !liveCtx) return;
      cancelAnimationFrame(liveRaf);
      liveRaf = requestAnimationFrame(() => {
        const S = 256; liveCtx.setTransform(1, 0, 0, 1, 0, 0); liveCtx.clearRect(0, 0, S, S);
        liveCtx.save(); fig3dFaceSpace(liveCtx, S);
        faceDrawing(liveCtx, S, d, eyes); drawGlasses(liveCtx, S, glasses); if (!d.base) drawFaceGuides(liveCtx, S);
        liveCtx.restore();
        const t = faceLiveTex(); if (t) t.needsUpdate = true;
        if (o.live) o.live();
      });
    };
    const paint = () => {
      const S = cv.width, k = S / 128;
      g.clearRect(0, 0, S, S);
      // la cabeza del maniquí vista de frente
      g.fillStyle = '#EFE7DB'; g.beginPath(); g.ellipse(64 * k, 62 * k, 50 * k, 58 * k, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(42,39,36,.22)'; g.lineWidth = 1.5 * k; g.stroke();
      if (!d.base) drawFaceGuides(g, S);
      if (tool.m) { g.save(); g.setLineDash([4 * k, 4 * k]); g.strokeStyle = 'rgba(214,92,40,.6)'; g.lineWidth = .8 * k; g.beginPath(); g.moveTo(64 * k, 8 * k); g.lineTo(64 * k, 120 * k); g.stroke(); g.restore(); }
      const c = document.createElement('canvas'); c.width = c.height = S;
      faceDrawing(c.getContext('2d'), S, d, eyes); drawGlasses(c.getContext('2d'), S, glasses);
      g.drawImage(c, 0, 0);
      paintLive();
      pp.querySelector('[data-a="undo"]').disabled = !d.strokes.length;
      pp.querySelector('[data-a="redo"]').disabled = !redo.length;
    };
    const at = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 512) / 4, Math.round((e.clientY - r.top) / r.height * 512) / 4]; };
    const r4 = v => Math.round(v * 4) / 4;
    // suavizado de Chaikin sobre puntos [x, y, ancho]
    const chaikin = (pts, n) => {
      for (let it = 0; it < n && pts.length > 2; it++) {
        const out = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; out.push(a.map((v, j) => .75 * v + .25 * b[j]), a.map((v, j) => .25 * v + .75 * b[j])); }
        out.push(pts[pts.length - 1]); pts = out;
      }
      return pts;
    };
    let st = null;
    const finish = () => {
      if (!st) return;
      const s = st; st = null;
      let pts = s._pts;
      if (s._lazy) pts.push([...s._last, pts.length ? pts[pts.length - 1][2] : 100]);
      if (!s.f && !s.e && pts.length > 2) pts = chaikin(pts, s._smooth ? 2 : 1);
      const n = pts.length;
      if (s.q) {
        // puntas afinadas: al empezar y al terminar (la línea suave, más largas)
        const L = s._smooth ? Math.max(2, Math.round(n * .2)) : Math.min(4, Math.max(1, Math.round(n * .15)));
        pts.forEach((p2, i) => { const e = Math.min(i, n - 1 - i); if (e < L) p2[2] *= .3 + .7 * (e / L); });
        s.q = pts.map(p2 => Math.round(p2[2]));
      }
      s.p = pts.flatMap(p2 => [r4(p2[0]), r4(p2[1])]);
      delete s._pts; delete s._last; delete s._lazy; delete s._smooth; delete s._t; delete s._f;
      paint();
    };
    cv.addEventListener('pointerdown', e => {
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      const [x, y] = at(e);
      st = { w: tool.t === 'erase' ? Math.max(6, tool.w * 2) : tool.t === 'fill' ? 1.2 : tool.w, p: [x, y], _pts: [[x, y, 100]], _t: e.timeStamp };
      if (tool.t === 'erase') st.e = 1; else st.c = tool.c;
      if (tool.t === 'fill') st.f = 1;
      if (tool.t === 'brush' || tool.t === 'smooth') st.q = [100];
      if (tool.t === 'smooth') { st._smooth = 1; st._lazy = 1; st._last = [x, y]; }
      if (tool.m) st.m = 1;
      if (st.c === FACE_INK) delete st.c;
      d.strokes.push(st); redo.length = 0; paint();
    });
    cv.addEventListener('pointermove', e => {
      if (!st) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) {
        const [x, y] = at(ev), last = st._pts[st._pts.length - 1];
        let px = x, py = y;
        if (st._lazy) {
          // línea suave: el trazo sigue al puntero con una cuerda (quita el temblor)
          st._last = [x, y];
          const dx = x - last[0], dy = y - last[1], dd = Math.hypot(dx, dy), R = 2.4;
          if (dd <= R) continue;
          px = x - dx / dd * R; py = y - dy / dd * R;
        }
        const dd = Math.hypot(px - last[0], py - last[1]);
        if (dd < .6) continue;
        let f = 100;
        if (st.q && !st._smooth) {
          if (ev.pointerType === 'pen' && ev.pressure > 0) f = clamp(20 + ev.pressure * 125, 20, 140);
          else {
            const v = dd / Math.max(1, ev.timeStamp - (st._t || ev.timeStamp));
            st._f = st._f == null ? 100 : st._f * .6 + clamp(118 - v * 110, 45, 118) * .4;
            f = st._f;
          }
        }
        st._t = ev.timeStamp;
        st._pts.push([px, py, f]);
      }
      st.p = st._pts.flatMap(p2 => [p2[0], p2[1]]);
      if (st.q) st.q = st._pts.map(p2 => Math.round(p2[2]));
      paint();
    });
    cv.addEventListener('pointerup', finish); cv.addEventListener('pointercancel', finish);
    pp.querySelector('.fe-tools').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.t) { tool.t = b.dataset.t; pp.querySelectorAll('[data-t]').forEach(x => x.setAttribute('aria-pressed', x === b)); return; }
      const a = b.dataset.a;
      if (a === 'sym') { tool.m = !tool.m; b.setAttribute('aria-pressed', tool.m); paint(); }
      if (a === 'undo' && d.strokes.length) { redo.push(d.strokes.pop()); paint(); }
      if (a === 'redo' && redo.length) { d.strokes.push(redo.pop()); paint(); }
      if (a === 'clear' && d.strokes.length) { redo.push(...d.strokes.reverse()); d.strokes = []; paint(); }
    });
    pp.querySelector('.fe-sws').addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      tool.c = b.dataset.c; if (tool.t === 'erase') { tool.t = 'brush'; pp.querySelectorAll('[data-t]').forEach(x => x.setAttribute('aria-pressed', x.dataset.t === 'brush')); }
      pp.querySelectorAll('.fe-sws .sw').forEach(x => x.setAttribute('aria-pressed', x === b));
    });
    pp.addEventListener('input', e => {
      const f = e.target.dataset.f;
      if (f === 'w') tool.w = +e.target.value;
      if (f === 'c') { tool.c = e.target.value; e.target.parentElement.style.setProperty('--sw', tool.c); pp.querySelectorAll('.fe-sws .sw').forEach(x => x.setAttribute('aria-pressed', x === e.target.parentElement)); }
      if (f === 'name') d.name = e.target.value;
    });
    pp.addEventListener('change', e => {
      const f = e.target.dataset.f;
      if (f === 'base') { d.base = e.target.value; paint(); }
      if (f === 'eyes') { eyes = e.target.checked; paint(); }
      if (f === 'gl') { glasses = e.target.value; paint(); }
    });
    pp.querySelector('.fe-ft').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'cancel') { tryClosePop(); return; }
      if (b.dataset.a !== 'save') return;
      if (!d.strokes.length && !d.base && eyes) { toast('Dibuja algo o elige una expresión de base.'); return; }
      if (o.named) d.name = (d.name || '').trim();
      d.v = Date.now();
      const keep = { ...d };
      pp._keep = null;
      closePop();
      o.save(keep, eyes, glasses);
    });
    pp._onClose = () => { cancelAnimationFrame(liveRaf); if (o.ob && FACE_LIVE.ob === o.ob) { FACE_LIVE.ob = null; if (o.live) o.live(); } if (o.closed) o.closed(); };
    paint();
  });
  if (o.anchor && o.anchor.getBoundingClientRect) popPlace(p, o.anchor.getBoundingClientRect());
  return p;
}
