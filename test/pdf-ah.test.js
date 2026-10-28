/* Lote AH · pdf: el papel (A4 o carta) en todos los PDF, la cabecera en cuadro sin la fecha, sin pie de página, las
   tablas en rejilla negra (tipo Excel), los títulos de sección en su cuadro y la vista previa antes de exportar.
   Corre src/pdf.js entero en vm con jsPDF de verdad (el de node) y lo demás de la app de mentira.
   node test/pdf-ah.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(R, f), 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

const { jsPDF } = require('jspdf');
const noop = () => { };
// lo que pdf.js usa de las otras partes de la app
const c = {
  Math, JSON, Object, Array, String, Number, Set, Map, Promise, Date, console, isNaN,
  window: { jspdf: { jsPDF } }, setTimeout: noop, requestIdleCallback: noop,
  P: { meta: { title: 'Sacrificio en el cañaveral', company: 'Antisuyo S.A.C.' } }, D: {}, UI: {}, EN: false, LIC: { mode: 'pro' },
  tabHex: () => '#C8382C', tabTone: () => ({ bar: '#EEEDEA', deep: '#7A2A1A', sel: '#F4D9D2', soft: '#FAF0EE', tint: '#F6E3DE', tint2: '#EFD0C8', selInk: '#222222' }),
  screenGet: () => ({ bars: 'gris', ln: 'normal', lt: 'normal', lk: 'normal' }), inkNow: () => '#222222', inkTones: () => ({ muted: '#646464' }),
  lgCol: () => '#FFE9A8', hlc: () => null, trPdf: d => d, tr: s => s, planAllows: () => false, pdfImgSrc: u => u,
  // los documentos de otros archivos (el registro PDFX los nombra al cargar)
  pdfDood: noop, pdfParte: noop, pdfCamRep: noop, pdfSndRep: noop, pdfCall: noop, pdfCalMonths: noop, pdfPlanta: noop, pdfPlantaGen: noop, pdfSupSheet: noop,
  PDF_SEL: null, PDF_CALL_DONE: null, OFFER_CAPTURE: null,
};
vm.createContext(c);
// las partes por páginas (pdf-rango.js)
vm.runInContext(/function pdfKeepPages\([\s\S]*?\n}\n/.exec(leer('src/pdf-rango.js'))[0], c);
vm.runInContext(leer('src/pdf.js') + '\nthis.PDFAPI = { newDoc, docHeader, pageNumbers, pdfSec, pdfTheme, pdfMake, get TBL() { return TBL; }, setPaper: p => { PDF_PAPER = p; }, HDR, GRID, PDF_RULE, PDFX };', c);
const A = c.PDFAPI;
const size = doc => [Math.round(doc.internal.pageSize.getWidth()), Math.round(doc.internal.pageSize.getHeight())];
/* un documento que anota lo que se dibuja (texto, rectángulos y líneas, con su página y su color) */
function spy(doc) {
  const L = [], pg = () => doc.getCurrentPageInfo().pageNumber;
  let draw = null;
  const sd = doc.setDrawColor.bind(doc); doc.setDrawColor = (...a) => { draw = a; return sd(...a); };
  const t = doc.text.bind(doc); doc.text = (s, x, y, o) => { L.push({ k: 'text', s: [].concat(s).join(' '), x, y, pg: pg() }); return t(s, x, y, o); };
  const r = doc.rect.bind(doc); doc.rect = (x, y, w, h, st) => { L.push({ k: 'rect', x, y, w, h, st, draw, pg: pg() }); return r(x, y, w, h, st); };
  const l = doc.line.bind(doc); doc.line = (x1, y1, x2, y2) => { L.push({ k: 'line', x1, y1, x2, y2, draw, pg: pg() }); return l(x1, y1, x2, y2); };
  return L;
}

/* ---------- el papel ---------- */
test('papel: sin elegir, cada documento con el de siempre (carta, o A4 si así se hizo)', () => {
  A.setPaper(null);
  assert.deepStrictEqual(size(A.newDoc()), [612, 792]);
  assert.deepStrictEqual(size(A.newDoc('landscape')), [792, 612]);
  assert.deepStrictEqual(size(A.newDoc('portrait', 'a4')), [595, 842]);
});
test('papel: el elegido manda en todos los documentos, también en los que eran A4 o carta fijos', () => {
  A.setPaper('a4');
  assert.deepStrictEqual(size(A.newDoc()), [595, 842]);
  assert.deepStrictEqual(size(A.newDoc('landscape')), [842, 595]);
  A.setPaper('letter');
  assert.deepStrictEqual(size(A.newDoc('portrait', 'a4')), [612, 792], 'la lámina y la hoja de script, en carta');
  A.setPaper(null);
});
test('papel: un documento va entero en el mismo papel (addPage("a4") en uno carta sigue en carta)', () => {
  A.setPaper(null);
  const d = A.newDoc();
  d.addPage('a4', 'portrait'); assert.deepStrictEqual(size(d), [612, 792], 'la lámina dentro de la hoja de desglose');
  A.setPaper('a4');
  const e = A.newDoc('portrait', 'letter');
  e.addPage('letter', 'portrait'); e.addPage(); assert.deepStrictEqual(size(e), [595, 842]);
  assert.strictEqual(e._paper, 'a4', 'la vista previa lee el papel del documento');
  A.setPaper(null);
  const probe = A.newDoc('portrait', [540, 6000]);   // el documento de medir (pdfBlocks), con medidas propias
  assert.deepStrictEqual(size(probe), [540, 6000]);
});
test('pdfMake: arma con el papel pedido y lo suelta al terminar; una parte por páginas que no existen avisa', () => {
  A.PDFX.prueba = () => ({ doc: A.newDoc(), name: 'x_prueba.pdf' });
  const r = A.pdfMake('prueba', {}, 'a4');
  assert.deepStrictEqual(size(r.doc), [595, 842]);
  assert.strictEqual(r.name, 'x_prueba.pdf'); assert.strictEqual(r.miss, 0);
  assert.deepStrictEqual(size(A.newDoc()), [612, 792], 'después, sin papel elegido');
  const s = A.pdfMake('prueba', { sel: { pages: new Set([5]), tag: '_paginas_5' } }, null);
  assert.ok(s.err && /no existen/.test(s.err), 'una parte por páginas que no existen: aviso, no un PDF vacío');
});

/* ---------- la cabecera ---------- */
test('cabecera: un cuadro cerrado con líneas negras, sin la barra de color ni la fecha', () => {
  A.pdfTheme();
  const d = A.newDoc(), L = spy(d);
  const y = A.docHeader(d, 'Presupuesto', '12 jornadas de rodaje');
  const W = d.internal.pageSize.getWidth();
  assert.ok(!L.some(o => o.k === 'rect' && o.x <= 0 && o.w >= W), 'sin la barra de borde a borde');
  const frame = L.find(o => o.k === 'rect' && o.st === 'S' && o.x === 36 && Math.abs(o.w - (W - 72)) < .01);
  assert.ok(frame, 'el marco, de margen a margen'); assert.deepStrictEqual(frame.draw, [0, 0, 0], 'en negro');
  assert.strictEqual(frame.h, A.HDR.h);
  const div = L.filter(o => o.k === 'line' && o.x1 === o.x2 && o.y1 === frame.y && o.y2 === frame.y + frame.h);
  assert.ok(div.length >= 2, 'las divisiones de arriba abajo (proyecto | documento | empresa)');
  const txt = L.filter(o => o.k === 'text').map(o => o.s).join(' | ');
  assert.ok(/Sacrificio en el ca/.test(txt) && /Presupuesto/.test(txt) && /12 jornadas/.test(txt) && /ANTISUYO/.test(txt), txt);
  assert.ok(!/\b(20\d\d)\b|octubre|enero|de \w+ de/i.test(txt), 'sin la fecha de creación: ' + txt);
  assert.strictEqual(y, frame.y + frame.h + 12, 'devuelve dónde sigue, debajo del cuadro');
});
test('cabecera: el número de la hoja de desglose en su cuadro negro', () => {
  const d = A.newDoc(), L = spy(d);
  A.docHeader(d, 'Hoja de desglose', '', { badge: '12A' });
  assert.ok(L.some(o => o.k === 'text' && o.s === '12A'));
  assert.ok(L.some(o => o.k === 'rect' && o.st === 'F' && o.w >= 20), 'el cuadro negro');
});

/* ---------- el número de página, sin pie ---------- */
test('sin pie de página ni barra arriba: «Página 1 de 3» dentro del cuadro de la cabecera', () => {
  const d = A.newDoc(), L = spy(d);
  A.docHeader(d, 'Presupuesto', 'sub');
  d.addPage(); d.addPage();
  const n0 = L.length;
  A.pageNumbers(d, 'Presupuesto');
  const after = L.slice(n0);
  assert.deepStrictEqual(after.filter(o => o.k === 'text').map(o => [o.pg, o.s]), [[1, 'Página 1 de 3']], 'solo en la página con el cuadro');
  assert.ok(!after.some(o => o.k === 'rect'), 'sin barras ni cuadritos de pie');
  const t = after[0], H = d.internal.pageSize.getHeight();
  assert.ok(t.y < A.HDR.top + A.HDR.h && t.y > A.HDR.top, 'dentro del cuadro de arriba');
  assert.ok(!after.some(o => o.y > H - 60), 'nada al pie');
});
test('las páginas que llevan su cuadro (storyboard, lámina) llevan su número', () => {
  const d = A.newDoc('landscape'), L = spy(d);
  A.docHeader(d, 'Storyboard', '16:9'); d.addPage(); A.docHeader(d, 'Storyboard', '16:9');
  const n0 = L.length; A.pageNumbers(d, 'Storyboard');
  assert.deepStrictEqual(L.slice(n0).filter(o => o.k === 'text').map(o => o.s), ['Página 1 de 2', 'Página 2 de 2']);
});

/* ---------- las tablas y los títulos de sección ---------- */
test('tablas tipo Excel: rejilla negra en todos los bordes y cabecera gris claro con letra negra en negrita', () => {
  A.pdfTheme();
  const T = A.TBL;
  assert.deepStrictEqual(Array.from(T.styles.lineColor), [0, 0, 0]);
  assert.strictEqual(typeof T.styles.lineWidth, 'number', 'un número: los cuatro bordes (antes, solo el de abajo)');
  assert.ok(T.styles.lineWidth >= .5);
  assert.ok(T.headStyles.fillColor.every(v => v >= 220 && v < 255), 'gris claro');
  assert.ok(T.headStyles.textColor.every(v => v < 60), 'letra negra');
  assert.strictEqual(T.headStyles.fontStyle, 'bold');
  assert.strictEqual(T.headStyles.lineWidth, T.styles.lineWidth, 'la cabecera también con su rejilla');
  assert.strictEqual(T.margin.bottom, 36, 'sin pie, el margen de abajo como los de los lados');
});
test('títulos de sección dentro de un cuadro (y la regla de antes, si se pide box: false)', () => {
  const d = A.newDoc(), L = spy(d);
  const y = A.pdfSec(d, 100, 'Elementos del área', { right: '3 elementos' });
  const box = L.find(o => o.k === 'rect');
  assert.ok(box && box.st === 'S' && box.y === 100 && box.x === 36, 'el cuadro');
  assert.deepStrictEqual(box.draw, [0, 0, 0]);
  assert.strictEqual(y, 100 + box.h + 6);
  assert.ok(L.some(o => o.k === 'text' && o.s === '3 elementos'));
  const d2 = A.newDoc(), L2 = spy(d2);
  A.pdfSec(d2, 100, 'Cronograma', { st: { box: false } });
  assert.ok(!L2.some(o => o.k === 'rect') && L2.some(o => o.k === 'line'), 'la regla de antes');
});

/* ---------- la vista previa ---------- */
const pdf = leer('src/pdf.js'), vista = leer('src/pdf-vista.js');
const body = (src, name) => { const i = src.indexOf(name); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };
test('exportPDF pasa por la vista previa; solo el ZIP del proyecto descarga directo', () => {
  const ex = body(pdf, 'async function exportPDF(');
  assert.ok(/await pdfPreview\(\{ kind, first: r, make: paper => pdfMake\(kind, opts, paper\), share: !!\(opts && opts\.share\), onOut: x => pdfOut\(kind, x\) \}\)/.test(ex), 'la vista previa, con el papel y lo de después');
  assert.ok(/pdfMake\(kind, opts, pdfPaperMem\(kind\)\)/.test(ex), 'arranca con el papel recordado');
  const direct = ex.slice(ex.indexOf('if (OFFER_CAPTURE)'), ex.indexOf('busy(false);\n    await pdfPreview'));
  assert.ok(/offerFile\(/.test(direct), 'el ZIP (archivo.js): directo');
  assert.strictEqual((ex.match(/offerFile\(/g) || []).length, 1, 'ninguna otra descarga sin vista previa');
  assert.ok(!/navigator\.share/.test(ex), '«Enviar» se hace desde la vista previa');
  assert.ok(/await pdfPreview\(\{ kind: 'gastos'/.test(leer('src/tab-gastos.js')), 'los PDF de Gastos también');
});
test('vista previa: Imprimir, Descargar, Enviar y el papel; lo de después solo si el archivo salió', () => {
  const pv = body(vista, 'async function pdfPreview(');
  for (const k of ['data-pv="print"', 'data-pv="dl"', 'data-pv="share"', "seg('a4')", "seg('letter')"]) assert.ok(pv.includes(k), k);
  assert.ok(/if \(sent === true\) \{ out = how === 'share' \? 'share' : 'download'; if \(onOut\) onOut\(st\.r, out\)/.test(pv), 'descargar o enviar: onOut');
  assert.ok(/if \(await pvPrint\(st\)\) \{ out = out \|\| 'print'; if \(onOut\) onOut\(st\.r, 'print'\); \}/.test(pv), 'imprimir: onOut');
  assert.ok(/onClose: \(\) => \{ pvClose\(\); done\(out\); \}/.test(pv), 'cerrar sin sacarlo: out queda null');
  assert.ok(/pdfPaperSet\(kind, p\.dataset\.paper\); await pvRemake\(st, p\.dataset\.paper\)/.test(pv), 'cambiar el papel lo recuerda y vuelve a armar');
  const out = body(pdf, 'function pdfOut(');
  assert.ok(/kind === 'call' && r && r\.call && !r\.pages && typeof callExported === 'function'\) callExported\(r\.call\.list, r\.call\.vers\)/.test(out), 'la versión de la hoja de llamado que salió');
});
test('vista previa: el papel se recuerda por documento, en las preferencias del navegador', () => {
  const store = {}, v = { ls: { get: (k, d) => k in store ? JSON.parse(store[k]) : d, set: (k, x) => { store[k] = JSON.stringify(x); } } };
  vm.createContext(v);
  const one = n => { const m = new RegExp('^function ' + n + '\\(.*$', 'm').exec(vista); assert.ok(m, n); return m[0]; };
  vm.runInContext(one('pdfPaperMem') + '\n' + one('pdfPaperSet') + '\nthis.mem = pdfPaperMem; this.set = pdfPaperSet;', v);
  assert.strictEqual(v.mem('budget'), null, 'sin elegir: el de siempre');
  v.set('budget', 'a4'); v.set('call', 'letter');
  assert.strictEqual(v.mem('budget'), 'a4'); assert.strictEqual(v.mem('call'), 'letter'); assert.strictEqual(v.mem('dood'), null);
  store['pdfPaper'] = JSON.stringify({ budget: 'tabloide' }); assert.strictEqual(v.mem('budget'), null, 'un valor raro no rompe nada');
});
test('imprimir: solo las páginas, una hoja por página, del tamaño del papel y sin márgenes', () => {
  const pr = body(vista, 'async function pvPrint(');
  assert.ok(/@page\{size:\$\{size\[0\]\.toFixed\(2\)\}pt \$\{size\[1\]\.toFixed\(2\)\}pt;margin:0\}/.test(pr), '@page con el tamaño exacto');
  assert.ok(/scale = n > 60 \? 2 : 3/.test(pr), 'unos 216 ppp: se lee la letra chica');
  assert.ok(/window\.print\(\)/.test(pr));
  const css = leer('src/shell.html');
  assert.ok(/html\.pv-printing body>\*:not\(#pvPrint\)\{display:none !important\}/.test(css), 'al imprimir, solo #pvPrint');
  assert.ok(/#pvPrint \.pv-pp\{overflow:hidden;break-after:page/.test(css) && /#pvPrint \.pv-pp:last-child\{break-after:auto/.test(css), 'una hoja por página, sin hoja en blanco al final');
  assert.ok(/#pvPrint\{display:none\}/.test(css), 'en pantalla no se ve');
});
test('build.sh: pdf-vista va en el armado, después de pdf-rango', () => {
  assert.ok(/ pdf pdf-llamado pdf-rango pdf-vista laminas /.test(leer('build.sh')));
});

/* ---------- el guion y la hoja de script ---------- */
test('el guion conserva su formato: en A4 va centrado a lo ancho, con la misma paginación', () => {
  const sc = body(pdf, 'function pdfScript(');
  assert.ok(/const dx = \(doc\.internal\.pageSize\.getWidth\(\) - W\) \/ 2;/.test(sc));
  assert.ok(/q 1 0 0 1 \$\{dx\.toFixed\(2\)\} 0 cm/.test(sc) && /doc\.internal\.write\('Q'\)/.test(sc), 'la traslación de cada página, cerrada');
  assert.ok(!/docHeader|pdfBox/.test(sc), 'sin cuadros en las páginas del guion');
  assert.ok(/lineColor: PT\.line \}/.test(body(pdf, 'function pdfAV(')), 'el guion AV, con sus líneas de antes');
});
test('hoja de script: la cabecera y lo de abajo en cuadros cerrados (no «a medias»)', () => {
  const sp = leer('src/sup-partes.js');
  assert.ok(/doc\.rect\(x0, y - 6, x1 - x0, 48\)/.test(body(sp, 'function hsHead(')), 'la cabecera');
  assert.ok(/doc\.rect\(HS_M, y, W - 2 \* HS_M, fh\)/.test(body(sp, 'function hsFeet(')), 'lo de abajo');
});
test('textos nuevos, en inglés', () => {
  const en = JSON.parse(leer('i18n/en-manual.json'));
  for (const k of ['Imprimir', 'Descargar', 'Carta', 'Imprimir sin descargar', 'Hoja de desglose', 'Páginas de guion', 'No se pudo mostrar la vista previa. Puedes descargar el PDF igual.']) assert.ok(en[k], k);
  assert.ok(en['// lote AH · pdf']);
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
