/* Lote AH · plan de rodaje: el documento exportado se llama «Plan de rodaje» (Shooting Schedule) y no «Stripboard»; la
   casilla «Miniaturas del storyboard» (P.schedule.noThumbs, en Exportar) pone debajo de cada escena sus planos con su
   viñeta en el PDF y en el Excel (con las imágenes dentro, xlsx.js); «Tiempo aprox.»; el PDF del plan y el del DOOD en
   cuadro, con la rejilla negra. Arma de verdad el PDF (jsPDF y autoTable de node_modules) y el Excel de un proyecto
   chico.  node test/plan-ah.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const { jsPDF } = require('jspdf'), { applyPlugin } = require('jspdf-autotable');
applyPlugin(jsPDF);
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message, (e.stack.split('\n').find(l => l.includes('plan-ah')) || '').trim()); } };
const SRC = f => fs.readFileSync(R + '/' + f, 'utf8');
const fn = (src, name) => { const m = new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?\\n}\\n`).exec(src); assert.ok(m, name + ' está'); return m[0]; };
const line = (src, re) => { const m = re.exec(src); assert.ok(m, String(re)); return m[0]; };
const J = x => JSON.parse(JSON.stringify(x));

// una imagen de 1 × 1 (la viñeta de los planos que la tienen)
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
// cada documento guarda lo que se escribió (_T), las imágenes (_I) y las tablas (_AT)
function SpyPDF(o) {
  const d = new jsPDF(o);
  d._T = []; d._I = []; d._AT = [];
  const t = d.text.bind(d), ai = d.addImage.bind(d), at = d.autoTable.bind(d);
  d.text = (txt, ...a) => { d._T.push(...[].concat(txt)); return t(txt, ...a); };
  d.addImage = (...a) => { d._I.push(a[0]); return ai(...a); };
  d.autoTable = op => { d._AT.push(op); return at(op); };
  return d;
}

const L = [];   // los oyentes de document
const c = { console, Math, JSON, Map, Set, String, Object, Array, Number, Date, Uint8Array, DataView, ArrayBuffer, TextEncoder, atob, isFinite, parseInt, parseFloat, RegExp, Promise };
c.window = c; c.window.jspdf = { jsPDF: SpyPDF };
vm.createContext(c);
vm.runInContext(`
  var EN = false, tr = s => s, trDone = s => s, trPdf = d => d, trFile = s => s, setTimeout = () => 0;
  var document = { addEventListener: (t, f) => LISTEN.push([t, f]) }, LISTEN = [];
  var RENDER = {}, ACT = {}, BIND = {}, FECHA_ON = {}, FECHA_MARKS = {}, SETTINGS = {}, TOOLS_EXTRA = {}, HELP = {}, EXPORTS = {}, EXPORTS_NOTE = {};
  var UI = { readOnly: false }, EDIT = true, canEditSec = () => EDIT, HN = [], NCH = 0, histNote = l => HN.push(l), changed = () => NCH++, render = () => 0;
  var pdfItem = (label, kind, hint, opts) => ({ label, hint, pdf: { kind, opts } });
  var tabHex = () => '#E8E7E3', tabTone = () => ({ bar: '#E8E7E3', deep: '#555555', sel: '#DDDDDD', soft: '#F2F2F2', tint: '#D9E8F7' }), screenGet = () => ({}), inkNow = () => '#222222', inkTones = () => ({ muted: '#646464' }), tabDeep = () => '#555555';
  var planAllows = () => false, pdfImgSrc = u => u, fileSafe = s => String(s).replace(/\\W+/g, '_');
  var LGC = { d: '#FFEB99', di: '#FFFFFF', n: '#C9D9F2', ne: '#CFE6C7', dd: '#F8CFC4', brk: '#333333', ev: '#E7E5E1' };
  var lgCol = (kind, k) => LGC[k] || '#CCCCCC', lgG = x => x, hlc = () => null, lgDark = () => '', lgInk = c => c === '#333333' ? '#FFFFFF' : '#222222';
  var lgDocItems = () => [['Día exterior', '#FFEB99'], ['Noche interior', '#C9D9F2']];
  var titleCase = s => String(s).toLowerCase().replace(/(^|\\s)\\S/g, m => m.toUpperCase()), num = v => +v || 0, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  var fmtEighths = e => (Math.floor(e / 8) ? Math.floor(e / 8) + ' ' : '') + (e % 8 ? (e % 8) + '/8' : ''), personName = x => x && x.name || '';
  var callOf = () => '07:00', shotTextExcerpt = () => '', s3Of = () => { throw new Error('2d'); }, synopsisOf = s => s.syn || '';
  var ASPECTS = { '16:9': 16 / 9 }, PREF = null;
  var THUMBS = true, thumbCached = sh => THUMBS && sh.id !== 'sin' ? PNG : null;
  var sceneOfKey = k => D.sc.byKey[k], sceneCast = i => [...D.sem[i]].map(id => P.elements[id]).filter(e => e.cat === 'cast');
  var ea = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
`, c);
c.PNG = PNG; c.LISTEN = vm.runInContext('LISTEN', c);
const core = SRC('src/core.js'), call = SRC('src/tab-call.js'), pdf = SRC('src/pdf.js'), plan = SRC('src/tab-plan.js'), dood = SRC('src/plan-dood.js');
// lo de otros archivos que usan el plan y su documento
vm.runInContext([fn(core, 'scheduleDays'), fn(core, 'shootDates'), line(core, /^const isoDay = .*$/m),
  line(call, /^const SND_NAME = .*$/m), fn(call, 'shotCallInfo'),
  line(SRC('src/pdf-rango.js'), /^let PDF_SEL = .*$/m), line(SRC('src/pdf-rango.js'), /^const pdfDayOk = .*$/m),
  // los demás documentos de PDFX (no se prueban aquí)
  'var pdfParte, pdfCamRep, pdfSndRep, pdfCall, pdfCalMonths, pdfBreakdown, pdfPlanta, pdfPlantaGen;'].join('\n'), c);
vm.runInContext(plan, c);
vm.runInContext(dood, c);
vm.runInContext(pdf, c);
vm.runInContext(SRC('src/xlsx.js'), c);
vm.runInContext(`xlTab = () => ({ c: '#999999', deep: '#555555', bar: '#E8E7E3', ink: '#222222', fill: '#EEEEEE', fill2: '#F4F4F4', line: '#CCCCCC' });`, c);

/* un proyecto chico: jornada 1 con la escena 1 (dos planos), un almuerzo y la escena 2 (un plano); jornada 2 con la parte
   1A (sus planos van bajo la 1); sin programar, la escena 3 (un plano sin viñeta) */
const project = () => vm.runInContext(`
  var S1 = { key: '1', idx: 0, ie: 'EXT', dn: 'D', tod: 'DÍA', loc: 'CINE - FACHADA', heading: 'EXT. CINE - FACHADA - DÍA', locBase: 'CINE', syn: 'Ana desarma la marquesina' };
  var S2 = { key: '2', idx: 1, ie: 'INT', dn: 'N', tod: 'NOCHE', loc: 'CINE - CABINA', heading: 'INT. CINE - CABINA - NOCHE', locBase: 'CINE', syn: 'La lámpara' };
  var S3 = { key: '3', idx: 2, ie: 'EXT', dn: 'D', tod: 'DÍA', loc: 'MERCADO', heading: 'EXT. MERCADO - DÍA', locBase: 'MERCADO', syn: '' };
  var SH = { a1: { id: 'a1', size: 'PG', support: 'Trípode', angle: 'Picado', move: 'Fijo', lens: '35', desc: 'Ana arriba', chars: ['c1'], notes: 'Con lluvia' },
    a2: { id: 'a2', size: 'PM', angle: 'Normal', move: 'Paneo', desc: 'Tito', chars: ['c2'], snd: 'si' }, b1: { id: 'b1', size: 'PD', desc: 'La lámpara', chars: [] }, sin: { id: 'sin', size: 'INS', desc: 'El puesto', chars: [] } };
  var P = { id: 'p1', meta: { title: 'Prueba', aspect: '16:9', brand: {} }, elements: { c1: { id: 'c1', name: 'ANA', cat: 'cast' }, c2: { id: 'c2', name: 'TITO', cat: 'cast' } },
    schedule: { items: [{ k: '1' }, { e: 'e1', name: 'Almuerzo' }, { k: '2' }, { d: 'd1' }, { k: '1', sp: 'A', e8: 1 }, { d: 'd2' }, { k: '3' }], start: '2026-11-02', off: [0], castMode: 'num', stages: [], setLoc: {}, locs: [] } };
  var D = { sc: { scenes: [S1, S2, S3], byKey: { 1: S1, 2: S2, 3: S3 } }, metrics: { eighths: [3, 4, 2], page: [1, 1, 2] }, sem: [new Set(['c1']), new Set(['c1', 'c2']), new Set(['c2'])],
    castNum: { c1: 1, c2: 2 }, shotsBy: { 1: [SH.a1, SH.a2], 2: [SH.b1], 3: [SH.sin] }, code: { a1: '1.1', a2: '1.2', b1: '2.1', sin: '3.1' } };
  THUMBS = true; EDIT = true; PDF_SEL = null; HN = []; NCH = 0;`, c);
const run = js => vm.runInContext(js, c);
const plan0 = () => { run('pdfTheme()'); return run('pdfPlan()').doc; };
// las filas de todas las tablas de bloques del plan (la tabla principal: la que lleva la cabecera de columnas)
const mainTables = d => d._AT.filter(o => o.head && o.head[0] && o.head[0].length === 12);
const span = r => r.reduce((a, x) => a + ((x && typeof x === 'object' && x.colSpan) || 1), 0);

/* ---------- el nombre: «Plan de rodaje» ---------- */
test('el PDF se llama «Plan de rodaje» (cabecera y pie), nunca «Stripboard»; la columna, «Tiempo aprox.»', () => {
  project();
  const d = plan0(), T = d._T.join('\n');
  assert.ok(T.includes('Plan de rodaje'), 'el rótulo');
  assert.ok(!/Stripboard/.test(T), 'sin «Stripboard»');
  assert.ok(d._T.includes('Tiempo aprox.'), 'el título de la columna');
  assert.ok(!d._T.includes('Tiempo'), 'ya no dice solo «Tiempo»');
  assert.ok(!/Stripboard/.test(fn(pdf, 'pdfPlan')), 'ni en el código de pdfPlan');
  assert.match(run('pdfPlan()').name, /_plan_de_rodaje\.pdf$/);
});
test('el menú Exportar, el Excel y la ayuda dicen «Plan de rodaje»; la vista de la pantalla sigue siendo «Stripboard»', () => {
  const L = J(run('EXPORTS.plan()').map(x => x.label));
  assert.deepStrictEqual(L, ['Plan de rodaje (PDF)', 'DOOD (PDF)', 'Plan de rodaje (Excel)']);
  assert.ok(!run('EXPORTS.plan()').some(x => /stripboard/i.test(x.label + ' ' + x.hint)));
  project();
  const sh = run('planSheets()');
  assert.strictEqual(sh[0].name, 'Plan de rodaje');
  assert.strictEqual(sh[0].rows[0].cells[0].v, 'Prueba · Plan de rodaje');
  assert.ok(!JSON.stringify(sh[0].rows.slice(0, 3)).includes('Stripboard'));
  // la pantalla (lote U): «Stripboard · DOOD» abajo
  assert.match(plan, /hdSeg\(\[\{ label: 'Stripboard'/);
  const help = run('HELP.plan');
  assert.ok(help.some(([t, x]) => t === 'Exportar' && x.includes('Plan de rodaje (PDF)') && x.includes('Miniaturas del storyboard')));
});
test('«Tiempo aprox.» en la pantalla (título, ayuda del título), el Excel y la ayuda; la columna se ensancha a 92 px', () => {
  const cols = run('PL_COLS');
  assert.deepStrictEqual(J(cols.find(x => x[0] === 't')), ['t', 'Tiempo aprox.', 'c-t']);
  assert.ok(run('PL_TIP')['Tiempo aprox.'], 'su ayuda al pasar el mouse');
  assert.ok(!('Tiempo' in run('PL_TIP')));
  assert.ok(run('HELP.plan').some(([t]) => t === 'Tiempo aprox.'));
  project();
  const head = run('planSheets()')[0].rows.find(r => r.cells[0] && r.cells[0].v === 'Fecha');
  assert.strictEqual(head.cells[10].v, 'Tiempo aprox.');
  assert.match(SRC('src/plan-columnas.js'), /t: \['92px', 92\]/);
});

/* ---------- las miniaturas: la casilla, el proyecto ---------- */
test('planDocThumbs: con miniaturas salvo noThumbs; planDocNorm deja noThumbs solo como true', () => {
  project();
  assert.strictEqual(run('planDocThumbs()'), true);
  run('P.schedule.noThumbs = true'); assert.strictEqual(run('planDocThumbs()'), false);
  for (const [v, keep] of [[true, true], ['true', false], [1, false], [false, false], [null, false], [{}, false]]) {
    const S = { noThumbs: v }; c.S0 = S; run('planDocNorm(S0)');
    assert.strictEqual('noThumbs' in S, keep, JSON.stringify(v));
  }
  run('planDocNorm({})'); run('planDocNorm(null)');   // sin el dato, o sin plan: nada
  // se limpia al abrir el proyecto, junto al ancho de las columnas
  assert.match(SRC('src/proyectos.js'), /\n  plColWClean\(S\);[^\n]*\n  planDocNorm\(S\);/);
});
test('los planos de cada fila: los de la escena bajo su fila principal; ninguno bajo sus partes ni los eventos', () => {
  project();
  const of = it => J(run(`planDocShotsOf(${JSON.stringify(it)})`).map(sh => sh.id));
  assert.deepStrictEqual(of({ k: '1' }), ['a1', 'a2']);
  assert.deepStrictEqual(of({ k: '1', sp: 'A', e8: 1 }), []);
  assert.deepStrictEqual(of({ e: 'e1', name: 'Almuerzo' }), []);
  assert.deepStrictEqual(of({ k: '9' }), []);
  // las viñetas que prepara pdfWarm: todas, o las de las jornadas elegidas («Elegir…», sin «Sin programar»)
  const ids = js => J(run(js).map(sh => sh.id));
  assert.deepStrictEqual(ids('planDocShots()'), ['a1', 'a2', 'b1', 'sin']);
  assert.deepStrictEqual(ids('planDocShots({ days: new Set([0]) })'), ['a1', 'a2', 'b1']);
  assert.deepStrictEqual(ids('planDocShots({ days: new Set([1]) })'), []);
  run('P.schedule.noThumbs = true'); assert.deepStrictEqual(ids('planDocShots()'), []);
  assert.match(fn(pdf, 'pdfWarm'), /kind === 'plan' && typeof planDocShots === 'function'\) all = planDocShots\(opts && opts.sel\)/);
});
test('la casilla del menú Exportar: marcada según el proyecto, apagada sin permiso; cambiarla guarda noThumbs con su paso del historial', () => {
  project();
  const note = () => run('EXPORTS_NOTE.plan()');
  assert.match(note(), /<input type="checkbox" data-pl-thumbs checked >/);
  assert.match(note(), /Miniaturas del storyboard/);
  run('P.schedule.noThumbs = true'); assert.match(note(), /data-pl-thumbs  >/);
  run('EDIT = false'); assert.match(note(), /data-pl-thumbs  disabled>/); run('EDIT = true; delete P.schedule.noThumbs');
  // sin planos en el storyboard, no hay casilla
  run('var SB0 = D.shotsBy; D.shotsBy = {}'); assert.strictEqual(note(), ''); run('D.shotsBy = SB0');
  const ch = c.LISTEN.filter(([t]) => t === 'change').map(([, f]) => f);
  assert.strictEqual(ch.length, 1, 'un oyente');
  const box = checked => ({ checked, matches: s => s === '#pop input[data-pl-thumbs]' });
  const off = box(false); ch[0]({ target: off });
  assert.strictEqual(run('P.schedule.noThumbs'), true); assert.deepStrictEqual(J(run('HN')), ['Plan exportado sin miniaturas']); assert.strictEqual(run('NCH'), 1);
  ch[0]({ target: box(true) });
  assert.ok(!('noThumbs' in run('P.schedule'))); assert.strictEqual(run('HN').length, 2); assert.strictEqual(run('NCH'), 2);
  // sin permiso: no cambia y la casilla vuelve a como estaba
  run('EDIT = false'); const b = box(false); ch[0]({ target: b });
  assert.ok(!('noThumbs' in run('P.schedule'))); assert.strictEqual(b.checked, true); assert.strictEqual(run('NCH'), 2);
  run('EDIT = true');
  // otro campo: nada
  ch[0]({ target: { checked: false, matches: () => false } }); assert.strictEqual(run('NCH'), 2);
});

/* ---------- el PDF ---------- */
test('con miniaturas: debajo de cada escena sus planos con su viñeta (no bajo la parte 1A); todas las filas con el ancho de las tiras', () => {
  project();
  const d = plan0();
  for (const k of ['1.1', '1.2', '2.1', '3.1']) assert.ok(d._T.includes(k), 'el plano ' + k);
  assert.strictEqual(d._I.length, 3, 'tres viñetas (el 3.1 no tiene)');
  assert.ok(d._I.every(u => u === PNG));
  const T = mainTables(d);
  assert.ok(T.length >= 3, 'cada escena con sus planos es un bloque');
  const rows = T.flatMap(o => o.body);
  for (const r of rows) assert.strictEqual(span(r), 12, 'cada fila cubre las 12 columnas: ' + JSON.stringify(r).slice(0, 80));
  // la escena 1 y, enseguida, sus dos planos; la parte 1A sin planos debajo
  const code = r => r[0] && (r[0].content != null ? r[0].content : r[0]);
  const seq = rows.map(code).filter(x => typeof x === 'string' && /^\d/.test(x));
  assert.deepStrictEqual(seq, ['1', '1.1', '1.2', '2', '2.1', '1A', '3', '3.1']);
  // el plano: su viñeta (_img) en la celda de I/E a D/N, los personajes bajo Reparto, el lente bajo Notas técnicas y
  // sus notas bajo Observaciones
  const r11 = rows.find(r => code(r) === '1.1');
  assert.strictEqual(r11[1].colSpan, 3); assert.strictEqual(r11[1]._img, PNG);
  assert.strictEqual(r11[2].content, '1');
  assert.ok(r11[8]._rich && JSON.stringify(r11[8]._rich).includes('35 mm'));
  assert.strictEqual(r11[9].content, 'Con lluvia');
  assert.ok(!rows.find(r => code(r) === '3.1')[1]._img, 'sin viñeta, sin imagen');
});
test('sin miniaturas: el plan de siempre, una jornada por bloque y sin planos', () => {
  project(); run('P.schedule.noThumbs = true');
  const d = plan0();
  for (const k of ['1.1', '1.2', '2.1', '3.1']) assert.ok(!d._T.includes(k), 'sin el plano ' + k);
  assert.strictEqual(d._I.length, 0);
  const T = mainTables(d);
  assert.strictEqual(T.length, 3, 'jornada 1, jornada 2 y «Sin programar»');
  for (const r of T.flatMap(o => o.body)) assert.strictEqual(span(r), 12);
});
test('en cuadro, tipo Excel: rejilla negra completa en las celdas y los títulos; solo el aire entre jornadas va sin líneas', () => {
  project(); run("P.schedule.style = 'excel'");   // (lote AI) el estilo Excel (el de entrada es Apple: test/estilo-ai.test.js)
  const d = plan0(), T = mainTables(d), ink = J(run('PDF_BLACK'));
  for (const o of T) {
    assert.deepStrictEqual(J(o.styles.lineColor), ink); assert.strictEqual(o.styles.lineWidth, .7);
    assert.deepStrictEqual(J(o.headStyles.lineColor), ink); assert.strictEqual(o.headStyles.lineWidth, .7);
  }
  // ninguna celda pisa la rejilla con líneas a medias (lote U: solo la de abajo); el aire entre jornadas, sin rejilla
  const cells = T.flatMap(o => o.body).flat().filter(x => x && typeof x === 'object');
  const lw = cells.filter(x => x.styles && 'lineWidth' in x.styles);
  assert.ok(lw.length >= 1);
  for (const x of lw) { assert.strictEqual(x.styles.lineWidth, 0); assert.strictEqual(x.content, ''); }
  // (lote AI) la línea de abajo sola es la del estilo Apple; en Excel, la rejilla entera
  assert.match(fn(pdf, 'pdfPlan'), /const LINE = XL \? \{ lineColor: GRID, lineWidth: GW \} : /);
  // el reparto de abajo, en su cuadro
  const rep = d._AT[d._AT.length - 1];
  assert.ok(JSON.stringify(rep.body).includes('Reparto'));
  assert.deepStrictEqual(J(rep.styles.lineColor), ink); assert.strictEqual(rep.styles.lineWidth, .7);
  assert.ok(!('lineWidth' in rep.body[0][0].styles), 'la celda no lo pisa');
  // la leyenda, en su cuadro (un rectángulo alrededor de lo que dibuja pdfLegend)
  assert.match(fn(pdf, 'pdfPlan'), /const y0 = y; y = pdfLegend\(doc, y \+ 2, lg, M \+ 8\); box\(y0, y - 1\);/);
});
test('el ancho de «Tiempo aprox.» entra en su título; la página A4 apaisada también arma la tabla', () => {
  project();
  const d = plan0(), o = mainTables(d)[0];
  d.setFont('helvetica', 'bold'); d.setFontSize(o.headStyles.fontSize);
  assert.ok(o.columnStyles[9].cellWidth >= d.getTextWidth('Tiempo aprox.') + 12);
  const W = d.internal.pageSize.getWidth(), sum = Object.values(o.columnStyles).reduce((a, x) => a + x.cellWidth, 0);
  assert.ok(W - 60 - sum >= 140, 'a la Locación le queda lugar en Carta: ' + (W - 60 - sum));
  // A4 apaisado (el frente «pdf» agrega el papel): la tabla se arma igual, con más lugar para la Locación
  run('var newDoc0 = newDoc; newDoc = (o, f) => newDoc0(o, Array.isArray(f) ? f : "a4")');
  try {
    const d4 = plan0();
    assert.ok(Math.abs(d4.internal.pageSize.getWidth() - 841.89) < 1);
    for (const r of mainTables(d4).flatMap(x => x.body)) assert.strictEqual(span(r), 12);
    assert.strictEqual(d4._I.length, 3);
  } finally { run('newDoc = newDoc0'); }
});
test('el DOOD en cuadro: rejilla negra en las celdas y en los títulos (antes gris fina y blanca), y los códigos en su cuadro', () => {
  project(); run("P.schedule.style = 'excel'"); run('pdfTheme()');   // (lote AI) el DOOD va con el estilo del plan
  // (autoTable avisa «… units width could not fit page» cuando todas las columnas son fijas y sobra lugar: ya pasaba)
  const log = console.log; console.log = (...a) => { if (!/could not fit page/.test(a[0])) log(...a); };
  let d; try { d = run('pdfDood()').doc; } finally { console.log = log; }
  const ink = J(run('PDF_BLACK'));
  const [tab, codes] = d._AT;
  assert.deepStrictEqual(J(tab.styles.lineColor), ink); assert.strictEqual(tab.styles.lineWidth, .7);
  assert.deepStrictEqual(J(tab.headStyles.lineColor), ink); assert.strictEqual(tab.headStyles.lineWidth, .7);
  assert.ok(JSON.stringify(codes.body).includes('inicio'));
  assert.deepStrictEqual(J(codes.styles.lineColor), ink);
});

/* ---------- el Excel ---------- */
const unzip = b => { const out = {}, dv = new DataView(b.buffer, b.byteOffset, b.byteLength); let p = 0;
  while (p + 30 <= b.length && dv.getUint32(p, true) === 0x04034b50) { const n = dv.getUint16(p + 26, true), x = dv.getUint16(p + 28, true), sz = dv.getUint32(p + 18, true);
    out[Buffer.from(b.slice(p + 30, p + 30 + n)).toString('utf8')] = Buffer.from(b.slice(p + 30 + n + x, p + 30 + n + x + sz)); p += 30 + n + x + sz; }
  return out; };
test('el Excel con miniaturas: los planos debajo de cada escena, la fecha combinada sobre todas sus filas y las viñetas en la columna I/E', () => {
  project();
  const [sh] = run('planSheets()');
  const at = sh.rows.findIndex(r => r.cells[0] && r.cells[0].v === 'Fecha');
  const body = sh.rows.slice(at + 1);
  // la jornada 1: escena 1, sus dos planos, el almuerzo, la escena 2 y su plano → la fecha combina 6 filas
  assert.strictEqual(body[0].cells[0].rs, 6);
  const W = r => r.cells.reduce((a, x) => a + ((x && x.cs) || 1), 0);
  assert.strictEqual(W(body[0]), 13);
  for (const r of body.slice(1, 6)) assert.strictEqual(W(r), 12, 'debajo de la fecha: ' + JSON.stringify(r.cells[0]));
  assert.deepStrictEqual(J(body.slice(1, 6).map(r => r.cells[0].v)), ['1.1', '1.2', 'Almuerzo', 2, '2.1']);
  assert.strictEqual(sh.cols[2], 10, 'la I/E más ancha para la viñeta');
  // tres viñetas, cada una en la fila de su plano, en la columna I/E (2), y la fila con su alto
  assert.strictEqual(sh.images.length, 3);
  for (const m of sh.images) { assert.strictEqual(m.c, 2); assert.strictEqual(m.data, PNG); assert.ok(/^\d\.\d$/.test(sh.rows[m.r].cells[sh.rows[m.r].cells.length === 13 ? 1 : 0].v)); assert.ok(sh.rows[m.r].min >= 30); }
  // el plano 1.1: descripción y acción en Locación y D/N, personajes, lente y notas
  const r11 = body[1].cells;
  assert.strictEqual(r11[2].cs, 2); assert.match(r11[2].v, /^PG · Trípode · Picado\nAna arriba$/);
  assert.strictEqual(r11[3].v, '1'); assert.strictEqual(r11[9].v, '35 mm'); assert.strictEqual(r11[10].v, 'Con lluvia');
  // «Sin programar»: la escena 3 y su plano (sin viñeta) bajo la misma celda combinada
  const b = sh.rows.findIndex(r => r.cells[0] && r.cells[0].v === 'SIN PROGRAMAR (1)');
  assert.strictEqual(sh.rows[b + 1].cells[0].rs, 2); assert.strictEqual(sh.rows[b + 2].cells[0].v, '3.1');
});
test('el Excel sin miniaturas: como antes (sin planos, sin imágenes, la I/E angosta)', () => {
  project(); run('P.schedule.noThumbs = true');
  const [sh] = run('planSheets()');
  assert.ok(!('images' in sh)); assert.strictEqual(sh.cols[2], 5);
  const at = sh.rows.findIndex(r => r.cells[0] && r.cells[0].v === 'Fecha');
  assert.strictEqual(sh.rows[at + 1].cells[0].rs, 3);
  assert.ok(!JSON.stringify(sh.rows).includes('"1.1"'));
});
test('xlsx.js: las imágenes de una hoja van en su dibujo (anclado a la celda) y en xl/media; sin imágenes, el libro de siempre', () => {
  project();
  const Z = unzip(run('xlsxBook(planSheets(), { title: "Prueba" })'));
  const names = Object.keys(Z);
  for (const n of ['xl/drawings/drawing1.xml', 'xl/drawings/_rels/drawing1.xml.rels', 'xl/worksheets/_rels/sheet1.xml.rels', 'xl/media/image1.png', 'xl/media/image3.png']) assert.ok(names.includes(n), n);
  assert.ok(!names.includes('xl/media/image4.png')); assert.ok(!names.includes('xl/worksheets/_rels/sheet2.xml.rels'), 'el DOOD sin dibujo');
  const s1 = Z['xl/worksheets/sheet1.xml'].toString(), s2 = Z['xl/worksheets/sheet2.xml'].toString();
  assert.match(s1, /<pageSetup [^>]*\/><drawing r:id="rId1"\/><\/worksheet>$/); assert.doesNotMatch(s2, /<drawing/);
  const dr = Z['xl/drawings/drawing1.xml'].toString();
  assert.strictEqual((dr.match(/<xdr:oneCellAnchor>/g) || []).length, 3);
  assert.match(dr, /<xdr:from><xdr:col>2<\/xdr:col><xdr:colOff>38100<\/xdr:colOff><xdr:row>\d+<\/xdr:row>/);
  assert.match(Z['xl/drawings/_rels/drawing1.xml.rels'].toString(), /Id="rId3" Type="[^"]+\/image" Target="\.\.\/media\/image3\.png"/);
  const ct = Z['[Content_Types].xml'].toString();
  assert.match(ct, /<Default Extension="png" ContentType="image\/png"\/>/); assert.match(ct, /PartName="\/xl\/drawings\/drawing1\.xml" ContentType="application\/vnd\.openxmlformats-officedocument\.drawing\+xml"/);
  assert.deepStrictEqual([...Z['xl/media/image1.png']], [...Buffer.from(PNG.split(',')[1], 'base64')]);
  // la fila de cada plano con viñeta tiene su alto (min)
  const sh = run('planSheets()')[0], r = sh.images[0].r;
  assert.match(s1, new RegExp(`<row r="${r + 1}" ht="(\\d+)"`)); assert.ok(+new RegExp(`<row r="${r + 1}" ht="(\\d+)"`).exec(s1)[1] >= sh.rows[r].min);
  // sin imágenes (o con una que no es PNG ni JPEG): nada de dibujos
  run('P.schedule.noThumbs = true');
  const Z2 = unzip(run('xlsxBook(planSheets(), { title: "Prueba" })'));
  assert.ok(!Object.keys(Z2).some(n => /drawing|media/.test(n))); assert.doesNotMatch(Z2['[Content_Types].xml'].toString(), /png|drawing/);
  const Z3 = unzip(run('xlsxBook([{ name: "A", cols: [10], rows: [{ cells: [{ v: 1 }] }], images: [{ r: 0, c: 0, w: 10, h: 10, data: "data:image/webp;base64,AAAA" }, { r: 0, c: 0, data: "nada" }] }])'));
  assert.ok(!Object.keys(Z3).some(n => /drawing|media/.test(n)));
});

/* ---------- inglés ---------- */
test('en inglés: Shooting Schedule (nunca Stripboard en lo exportado), «Approx. time» y los textos nuevos', () => {
  const E = JSON.parse(SRC('i18n/en-manual.json'));
  assert.strictEqual(E['Plan de rodaje'], 'Shooting Schedule');
  assert.strictEqual(E['Plan de rodaje (PDF)'], 'Shooting Schedule (PDF)');
  assert.strictEqual(E['Plan de rodaje (Excel)'], 'Shooting Schedule (Excel)');
  assert.strictEqual(E['Tiempo aprox.'], 'Approx. time');
  assert.ok(E['// lote AH · plan']);
  const news = ['Miniaturas del storyboard', 'En el plan de rodaje (PDF y Excel): debajo de cada escena, sus planos con su viñeta', 'Miniaturas en el plan exportado', 'Plan exportado sin miniaturas',
    'El plan de rodaje, las locaciones y el DOOD, cada uno en su hoja, para seguir editándolos en Excel', 'Solo en tu pantalla: el PDF y el Excel llevan todas las columnas (también la figuración). Las miniaturas del documento se eligen en Exportar.',
    ...run('HELP.plan').filter(([t]) => t === 'Exportar' || t === 'Stripboard').map(([, x]) => x)];
  for (const k of news) { assert.ok(E[k], 'falta: ' + k.slice(0, 60)); assert.ok(plan.includes(k), 'el texto está en tab-plan.js: ' + k.slice(0, 50)); }
  for (const k of ['Plan de rodaje (PDF)', 'Plan de rodaje (Excel)', 'Tiempo aprox.', 'El plan de rodaje, las locaciones y el DOOD, cada uno en su hoja, para seguir editándolos en Excel']) assert.doesNotMatch(E[k], /Stripboard/i);
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
