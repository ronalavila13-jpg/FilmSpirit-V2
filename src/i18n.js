/* ============================================================
   IDIOMA · el programa en español o en inglés (con los términos de Hollywood: i18n/glosario-en.md)
   Los textos del programa están en español en el código. En inglés, esta capa los cambia al mostrarse:
   · el diccionario (I18N_EN, de i18n/en.json): frases exactas y plantillas con sus partes variables («{0} escenas»);
   · en la pantalla, los textos y los atributos que se leen (title, aria-label, placeholder, alt) apenas aparecen;
   · en los lienzos (canvas), los PDF, los Excel, los nombres de los archivos y las fechas (formato de EE. UU.).
   Lo que escribe cada persona no se traduce: el guion (sus páginas y el editor), los campos de texto y todo lo que no
   está en el diccionario. El idioma se elige junto a «+ Nuevo»; se recuerda en este equipo y, en la web, en la cuenta.
   ============================================================ */
const LANG = (() => {
  try {
    const q = /[?&#]lang=(en|es)\b/.exec(location.href); if (q) return q[1];   // ?lang=en (por si el navegador no guarda nada)
    const v = JSON.parse(localStorage.getItem('filmspirit:lang') || 'null');
    if (v === 'en' || v === 'es') return v;
    const m = /(?:^|;\s*)fs_lang=(\w+)/.exec(document.cookie);   // el idioma de la portada (filmspiritpro.com)
    return m && m[1] === 'en' ? 'en' : 'es';
  } catch (e) { return 'es'; }
})();
const EN = LANG === 'en';
const TRX = (typeof I18N_EN !== 'undefined' && I18N_EN.x) || {}, TRP = [], TRS = [], TRL = Object.create(null);
if (EN && typeof I18N_EN !== 'undefined') {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // n: plantillas casi sin palabras («{0} de {1}», «de {0}»): solo con números («3 de 5»), no con frases de nadie
  for (const [es0, en0, n] of I18N_EN.p || []) {
    // «{1}{2}» seguidos no se pueden separar: van juntos (si en inglés también van juntos; si no, la plantilla no sirve)
    let es = es0, en = en0, ok = true;
    es = es.replace(/(?:\{\d+\}){2,}/g, run => { if (!en.includes(run)) { ok = false; return run; } const f = run.match(/\{\d+\}/)[0]; en = en.split(run).join(f); return f; });
    if (!ok) continue;
    const parts = es.split(/\{\d+\}/), lit = parts.reduce((a, b) => b.trim().length > a.length ? b.trim() : a, '');
    const map = {}; (es.match(/\{\d+\}/g) || []).forEach((m, i) => { map[m.slice(1, -1)] = i; });
    // un {n} pegado al final de una palabra («jornada{1}»: la «s» del plural) puede quedar vacío
    const rx = parts.map((x, i) => i ? (/[A-Za-zÁÉÍÓÚÑáéíóúñü.]$/.test(parts[i - 1]) ? '(.*?)' : '(.+?)') + esc(x) : esc(x)).join('');
    try { TRP.push({ re: new RegExp('^' + rx + '$'), en, map, lit, num: !!n, min: parts.join('').length }); } catch (e) { }
  }
  TRP.sort((a, b) => b.min - a.min);   // las más largas (más precisas) primero
  // los finales que el código pega a un nombre: «Reparto · cambiar el color», «Escena 1 · tocar para bloquear»
  for (const k of Object.keys(TRX)) {
    if (/^[·:,;(—–]/.test(k) && k.length > 3) TRS.push(k);
    if (k.length > 3) { const l = k.toLowerCase(); if (!(l in TRL)) TRL[l] = TRX[k]; }   // «posproducción y vfx» (el código lo pasa a minúsculas)
  }
  TRS.sort((a, b) => b.length - a.length);
}
// lo que queda sin traducir de una plantilla y empieza en minúscula («el color», «estimada 07:00»): la plantilla no
// era para esa frase (los nombres de cada uno suelen ir con mayúscula: «La Hermelinda», «Ana»)
const TR_LOOSE = /^[a-záéíóúñü]/;
const TR_NUM = /^[\d\s.,:/×x%+~\-–—]*$/;
// …o fechas (ya en inglés: «Mon, Oct 26», «October 26, 2026»): «{0} a {1}» → «{0} to {1}»
const TR_DATE = /^((Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\.?,?\s+)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(,?\s+\d{4})?$/;
// las teclas de los atajos: «(Ctrl + Mayús + Z)», «(Supr)»
const TR_KEYS = { 'Mayús': 'Shift', 'Supr': 'Del', 'Retroceso': 'Backspace', 'Espacio': 'Space', 'Intro': 'Enter', 'Inicio': 'Home', 'Fin': 'End', 'Flechas': 'Arrows', 'Flecha': 'Arrow', 'arriba': 'up', 'abajo': 'down', 'izquierda': 'left', 'derecha': 'right', 'Re Pág': 'Page Up', 'Av Pág': 'Page Down', 'clic': 'click', 'Clic': 'Click', 'rueda': 'wheel', 'o': 'or', 'y': 'and' };
const trKeysIn = s => /^[\w\s+⌘⇧⌥←→↑↓./·,-]*$/u.test(s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) && s.length <= 30 ? s.replace(/Re Pág|Av Pág|[A-Za-zÁÉÍÓÚáéíóúñ]+/g, w => TR_KEYS[w] || w) : null;
const TRC = new Map(), TRO = new Set();   // TRO: los textos ya traducidos (no se vuelven a traducir: «Auto» no pasa a «Car»)
const LETTER = /[A-Za-zÁÉÍÓÚÑáéíóúñü]/;
function trCore(t, depth = 0) {
  if (!t || !LETTER.test(t)) return null;
  let x = TRX[t]; if (x != null) return x;
  // la misma palabra con otra mayúscula inicial (piezas que el código pasa a minúsculas); no en las de una o dos letras
  if (t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñü]/g, '').length > 2) {
    const up = t.charAt(0).toUpperCase() + t.slice(1), lo = t.charAt(0).toLowerCase() + t.slice(1);
    if (up !== t && TRX[up] != null) { x = TRX[up]; return x.charAt(0).toLowerCase() + x.slice(1); }
    if (lo !== t && TRX[lo] != null) { x = TRX[lo]; return x.charAt(0).toUpperCase() + x.slice(1); }
    x = TRL[t.toLowerCase()]; if (x != null) return x;
  } else if (!/\d/.test(t)) return null;
  if (depth > 3) return null;
  // plantillas: «{0} escenas · {1} págs.»
  for (const p of TRP) {
    if (p.min > t.length || (p.lit && t.indexOf(p.lit) < 0)) continue;
    const m = p.re.exec(t); if (!m) continue;
    const V = m.slice(1);
    if (p.num && !V.every(v => TR_NUM.test(v) || TR_DATE.test(v.trim()))) continue;
    const W = V.map(v => { const y = trCore(v, depth + 1); if (y != null) return y; const q = /^([:·,;—–]\s*)(\S.*)$/.exec(v), z = q && trCore(q[2], depth + 1); return z != null && z ? q[1] + z : null; });
    if (V.some((v, i) => W[i] == null && v.trim().length > 2 && TR_LOOSE.test(v.trim()))) continue;
    return p.en.replace(/\{(\d+)\}/g, (_, i) => { const j = p.map[i]; if (j == null) return ''; const v = V[j]; return v == null ? '' : (W[j] != null ? W[j] : v); });
  }
  // un final conocido pegado a un nombre
  for (const k of TRS) if (t.length > k.length && t.endsWith(k)) {
    const head = t.slice(0, -k.length), h = head.trim(), y = h ? trCore(h, depth + 1) : '';
    return (y != null && h ? head.replace(h, y) : head) + TRX[k];
  }
  // «Rótulo: valor» con un rótulo conocido («Locación: Cine Primavera»)
  { const q = /^([^:]{2,40}?):\s+(\S[\s\S]*)$/.exec(t), a = q && (TRX[q[1]] != null ? TRX[q[1]] : TRL[q[1].toLowerCase()]);
    if (a != null) { const b = trCore(q[2], depth + 1); return a + ': ' + (b != null ? b : q[2]); } }
  // piezas separadas por « · », « — », « / » o « – »
  for (const sep of [' · ', ' — ', ' – ', ' / ']) if (t.includes(sep)) {
    const a = t.split(sep), o = a.map(q => trCore(q, depth + 1) || q);
    if (o.some((q, i) => q !== a[i])) return o.join(sep);
  }
  // conteos y puntuación alrededor: «5 escenas», «Escena:», «(Ana)»
  let m = /^([\d.,/×x]+\s+)(\D.*)$/.exec(t); if (m) { const y = trCore(m[2], depth + 1); if (y) return m[1] + y; }
  // un trozo que empieza con su separador: « · Jornada 1 de 2»
  m = /^([·—–,;:|]\s*)(\S[\s\S]*)$/.exec(t); if (m) { const y = trCore(m[2], depth + 1); if (y != null) return m[1] + y; }
  // la jornada abreviada: «J3», «J1–J4» (en inglés, D de day)
  m = /^J(\d+)(?:(\s*[–-]\s*)J(\d+))?$/.exec(t); if (m) return 'D' + m[1] + (m[3] ? m[2] + 'D' + m[3] : '');
  // con cifras al final: «Hora estimada 07:00», «dura 45 min»
  m = /^(\D*?[A-Za-zÁÉÍÓÚÑáéíóúñ.])(\s+\d[\d\s:.,/×x%-]*(?:\s*(?:min|h|s|m|cm|mm|kg|págs?\.?|pp\.?))?)$/.exec(t); if (m) { const y = trCore(m[1], depth + 1); if (y) return y + m[2].replace(/págs?\./, 'pp.'); }
  // un atajo al final: «Rehacer (Ctrl + Mayús + Z)»
  m = /^(.*?\S)(\s*\()([^()]{1,30})(\))$/.exec(t); if (m) { const y = trCore(m[1], depth + 1), k = trKeysIn(m[3]) || trCore(m[3], depth + 1); if (y != null && k != null) return y + m[2] + k + m[4]; }
  m = /^(.*?)([:.…!?]+)$/.exec(t); if (m && m[1]) { const y = trCore(m[1], depth + 1); if (y) return y + m[2]; }
  m = /^([(\[«“¿¡‹›←→]+\s*)(.*?)(\s*[)\]»”?!‹›←→]*)$/.exec(t); if (m && (m[1] || m[3]) && m[2]) { const y = trCore(m[2], depth + 1); if (y) return m[1].replace('«', '“').replace(/[¿¡]/g, '') + y + m[3].replace('»', '”'); }
  return null;
}
/* el texto en el idioma elegido (en español, tal cual) */
function tr(s) {
  if (!EN || s == null || typeof s !== 'string' || !LETTER.test(s)) return s;
  const c = TRC.get(s); if (c !== undefined) return c;
  if (s.includes('\n') && /\S\n\s*\S/.test(s)) { const r = s.split('\n').map(tr).join('\n'); TRC.set(s, r); if (r !== s) TRO.add(r); return r; }   // cada línea por su lado
  if (TRO.has(s)) return s;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2].replace(/\s+/g, ' ');
  const out = trCore(core), r = out == null ? s : m[1] + out + m[3];
  if (TRC.size > 30000) { TRC.clear(); TRO.clear(); }
  TRC.set(s, r); if (r !== s) TRO.add(r);
  return r;
}
/* ---------- la pantalla: los textos al aparecer ---------- */
const TR_ATTR = ['title', 'aria-label', 'placeholder', 'alt'];
// lo que escribe cada persona: el editor y las páginas del guion, los campos y lo marcado a mano
const TR_SKIP = '[contenteditable="true"],.ed-doc,#pages .ln,textarea,script,style,[data-no-tr]';
function trAttrs(el) {
  for (const a of TR_ATTR) { const v = el.getAttribute(a); if (v && LETTER.test(v)) { const t = trIn(el, v); if (t !== v) el.setAttribute(a, t); } }
  if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && el.value) { const t = tr(el.value); if (t !== el.value) el.value = t; }
}
/* una palabra que según dónde está se dice distinto (las etapas: «Producción» es «Prep»): data-trk="<contexto>" */
const TRK = (typeof I18N_EN !== 'undefined' && I18N_EN.k) || {};
/* para el código: una palabra en su contexto («Producción» como etapa es «Prep») y un texto ya en su idioma */
function trK(ctx, s) { if (!EN) return s; const K = TRK[ctx], c = K && K[String(s).trim()]; if (c) { TRO.add(c); return c; } return tr(s); }
function trDone(s) { if (EN && s) TRO.add(s); return s; }
const trIn = (el, v) => { const k = el && el.closest('[data-trk]'), K = k && TRK[k.dataset.trk], c = K && K[v.trim()]; if (c) { const r = v.replace(v.trim(), c); TRO.add(r); return r; } return tr(v); };
function trText(n) { const v = n.nodeValue; if (!v || !LETTER.test(v)) return; const t = trIn(n.parentElement, v); if (t !== v) n.nodeValue = t; }
// un campo (textarea, el editor) no cambia su texto, pero sí su ayuda (placeholder, title); [data-no-tr]: nada
const trField = el => { if (!el.closest('[data-no-tr]') && !el.closest('#pages .ln, .ed-doc')) trAttrs(el); };
function trTree(root) {
  if (!EN || !root) return;
  if (root.nodeType === 3) { const p = root.parentElement; if (p && !p.closest(TR_SKIP)) trText(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1) { if (root.closest(TR_SKIP)) { if (root.matches(TR_SKIP)) trField(root); return; } trAttrs(root); }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: x => x.nodeType === 1 && x.matches(TR_SKIP) ? (trField(x), NodeFilter.FILTER_REJECT) : NodeFilter.FILTER_ACCEPT });
  let x; while ((x = w.nextNode())) { if (x.nodeType === 3) trText(x); else trAttrs(x); }
}
// el idioma de la página, para lectores de pantalla y el corrector (publicada, la envoltura puede traer otro)
if (!EN) document.documentElement.lang = 'es';
if (EN) {
  document.documentElement.lang = 'en';
  const mo = new MutationObserver(recs => {
    for (const r of recs) {
      if (r.type === 'childList') r.addedNodes.forEach(trTree);
      else if (r.type === 'characterData') { const p = r.target.parentElement; if (p && !p.closest(TR_SKIP)) trText(r.target); }
      else if (r.type === 'attributes' && r.target.nodeType === 1 && (!r.target.closest(TR_SKIP) || (r.target.matches(TR_SKIP) && !r.target.closest('[data-no-tr], #pages .ln, .ed-doc')))) { const v = r.target.getAttribute(r.attributeName); if (v) { const t = trIn(r.target, v); if (t !== v) r.target.setAttribute(r.attributeName, t); } }
    }
  });
  const go = () => { trTree(document.documentElement); mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TR_ATTR }); };
  if (document.documentElement) go();
  // los lienzos: los rótulos que se dibujan (planta, línea de tiempo…) y su ancho, con el mismo texto
  try {
    const C = CanvasRenderingContext2D.prototype, ft = C.fillText, st = C.strokeText, mt = C.measureText;
    C.fillText = function (s, ...a) { return ft.call(this, tr(String(s)), ...a); };
    C.strokeText = function (s, ...a) { return st.call(this, tr(String(s)), ...a); };
    C.measureText = function (s) { return mt.call(this, tr(String(s))); };
  } catch (e) { }
  // las fechas y las horas, en el formato de EE. UU. (el código las pide en español de Perú)
  try {
    const D = Date.prototype, en = l => (l == null || /^es/i.test(String(l))) ? 'en-US' : l;
    for (const k of ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString']) { const f = D[k]; D[k] = function (l, o) { return f.call(this, en(l), o); }; }
    const DTF = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function (l, o) { return new DTF(en(l), o); };
    Intl.DateTimeFormat.prototype = DTF.prototype; Intl.DateTimeFormat.supportedLocalesOf = DTF.supportedLocalesOf;
  } catch (e) { }
}
/* ---------- los PDF: los textos del programa (no los del guion, que van en Courier) ---------- */
function trPdf(doc) {
  if (!EN || !doc || doc._tr) return doc;
  doc._tr = true;
  // sin traducir: las celdas con varios estilos (pdf.js) dibujan sus tramos ya traducidos, palabra por palabra
  doc._raw = { text: doc.text.bind(doc), getTextWidth: doc.getTextWidth.bind(doc) };
  const mono = () => { try { return /courier/i.test(doc.getFont().fontName); } catch (e) { return false; } };
  const T = s => typeof s === 'string' ? tr(s) : Array.isArray(s) ? s.map(T) : s;
  const W = (f, i = 0) => function (...a) { if (!mono()) a[i] = T(a[i]); return f.apply(this, a); };
  for (const k of ['text', 'splitTextToSize', 'getTextWidth', 'getStringUnitWidth']) if (typeof doc[k] === 'function') doc[k] = W(doc[k].bind(doc));
  if (typeof doc.autoTable === 'function') {
    const at = doc.autoTable.bind(doc);
    const cell = c => typeof c === 'string' ? tr(c) : c && typeof c === 'object' && typeof c.content === 'string' ? { ...c, content: tr(c.content) } : c;
    const rows = r => Array.isArray(r) ? r.map(row => Array.isArray(row) ? row.map(cell) : row) : r;
    doc.autoTable = o => at(o && typeof o === 'object' ? { ...o, head: rows(o.head), body: rows(o.body), foot: rows(o.foot) } : o);
  }
  return doc;
}
/* el nombre de un archivo: «_hoja_de_llamado.pdf» → «_call_sheet.pdf» (el título del proyecto no cambia) */
function trFile(name) {
  if (!EN || !name) return name;
  const S = Object.entries((typeof I18N_EN !== 'undefined' && I18N_EN.f) || {}).sort((x, y) => y[0].length - x[0].length);
  name = String(name);
  const t = typeof P !== 'undefined' && P && P.meta && typeof fileSafe === 'function' ? fileSafe(P.meta.title) : '';
  const head = t && name.startsWith(t) ? t : '', dot = name.lastIndexOf('.');
  let rest = name.slice(head.length, dot > head.length ? dot : name.length), ext = dot > head.length ? name.slice(dot) : '';
  for (const [a, b] of S) rest = rest.split(a).join(b);
  return head + rest + ext;
}
/* ---------- elegir el idioma (junto a «+ Nuevo») ---------- */
const LANGS_APP = [['es', 'Español'], ['en', 'English']];
function langSet(v) {
  if (v !== 'es' && v !== 'en') return;
  try { localStorage.setItem('filmspirit:lang', JSON.stringify(v)); } catch (e) { }
  try { document.cookie = `fs_lang=${v}; path=/; max-age=31536000; samesite=lax`; } catch (e) { }
  let kept = false; try { kept = JSON.parse(localStorage.getItem('filmspirit:lang') || 'null') === v; } catch (e) { }
  const done = () => { if (kept && !/[?&#]lang=/.test(location.href)) location.reload(); else { const u = new URL(location.href); u.searchParams.set('lang', v); u.hash = ''; location.href = u.toString(); } };
  if (API()) apiFetch('PUT', '/api/me/lang', { lang: v }).then(done, done);
  else done();
}
function langMenu(anchor) {
  popover(anchor, `<div class="menu lang-m" data-no-tr>${LANGS_APP.map(([k, n]) => `<button data-lang="${k}" aria-pressed="${k === LANG}">${n}</button>`).join('')}</div>`, p => p.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]'); if (!b) return; closePop(); if (b.dataset.lang !== LANG) langSet(b.dataset.lang);
  }));
}
/* la cuenta (web) recuerda el idioma: en un equipo nuevo, se usa el de la cuenta */
function langFromAccount(me) {
  if (!me || (me.lang !== 'es' && me.lang !== 'en') || me.lang === LANG) return;
  let mine = null; try { mine = JSON.parse(localStorage.getItem('filmspirit:lang') || 'null'); } catch (e) { }
  if (mine) return;   // eligió en este equipo
  try { localStorage.setItem('filmspirit:lang', JSON.stringify(me.lang)); } catch (e) { }
  location.reload();
}
