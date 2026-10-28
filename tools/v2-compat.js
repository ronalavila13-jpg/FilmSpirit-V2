// Versión 2 · prueba de compatibilidad con la v1 (a mano, con Playwright):
//   node tools/v2-compat.js ruta/v1.html ruta/v2.html
// Los dos HTML son los de «sh build.sh» (dist/filmspirit.html) de la v1 y de la v2, con sus librerías al lado.
// 1. Abrir y recorrer todas las pestañas sin tocar nada cambia los datos igual en la v1 y en la v2.
// 2. Un proyecto de la v1 que se trabaja en la v2 (tomas con REC, marcas, MOS, notas, «Rodado · siguiente», tipo de
//    proyecto) y se guarda, se abre en la v1 sin errores y con lo hecho en la v2 (la v1 ignora lo que no conoce).
const { chromium } = require('playwright');
const path = require('path');
const [v1, v2] = process.argv.slice(2).map(f => 'file://' + path.resolve(f));
if (!v1 || !v2) { console.error('Uso: node tools/v2-compat.js v1.html v2.html'); process.exit(2); }
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FALLA ') + m); if (!c) fails++; };

async function page(b, url, w = 1440) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push(m.text()); });
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  return { p, errs };
}
// abre un proyecto (datos y guion como los guarda Store.serialize) y recorre todas las pestañas
const OPEN = async ({ data, script, id }) => {
  const Pn = Object.assign(newProject(), JSON.parse(data), JSON.parse(script)); Pn.id = id; Pn._saved = true;
  setProject(Pn);
  for (const t of Object.keys(TAB_NAMES)) { try { setTab(t); } catch (e) { console.error('pestaña ' + t + ': ' + e.message); } await new Promise(r => setTimeout(r, 150)); }
  setTab('script');
};
const SAVE = () => ({ data: Store.serialize(P, 'data'), script: Store.serialize(P, 'script') });
// los identificadores al azar que se crean al abrir (p. ej. el equipo por defecto de la hoja de llamado) se cambian por
// su orden de aparición, en todas partes donde se usan: así se comparan dos aperturas distintas
function ids(o) {
  const map = new Map();
  const seen = x => { if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) { if (k === 'id' && typeof v === 'string' && !map.has(v)) map.set(v, 'ID' + map.size); seen(v); } };
  seen(o);
  const put = x => Array.isArray(x) ? x.map(put) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [map.has(k) ? map.get(k) : k, put(v)])) : typeof x === 'string' && map.has(x) ? map.get(x) : typeof x === 'number' && x > 1e12 ? 'HORA' : x;   // y las horas (ms) de lo que se anota al abrir
  return put(o);
}
// las rutas donde dos datos difieren (a lo sumo 20)
function diffs(a, b, p = '', out = []) {
  if (out.length >= 20) return out;
  if (a === b) return out;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b || Array.isArray(a) !== Array.isArray(b)) { out.push(`${p || '/'}: ${JSON.stringify(a)?.slice(0, 60)} ≠ ${JSON.stringify(b)?.slice(0, 60)}`); return out; }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffs(a[k], b[k], p + '/' + k, out);
  return out;
}
const strip = s => { const o = JSON.parse(s); for (const k of Object.keys(o)) if (k.startsWith('_')) delete o[k]; return o; };

(async () => {
  const b = await chromium.launch();
  // el proyecto de la v1: el ejemplo, guardado por la v1
  const A1 = await page(b, v1);
  const A = await A1.p.evaluate(() => { openSample(); return { data: Store.serialize(P, 'data'), script: Store.serialize(P, 'script') }; });
  ok(!A1.errs.length, 'la v1 abre el ejemplo sin errores ' + A1.errs.slice(0, 3).join(' | '));

  // 1. recorrer sin tocar: la v1 y la v2 dejan los mismos datos
  await A1.p.evaluate(OPEN, { ...A, id: 'compat-a' });
  const R1 = await A1.p.evaluate(SAVE);
  const B2 = await page(b, v2);
  await B2.p.evaluate(OPEN, { ...A, id: 'compat-a' });
  const R2 = await B2.p.evaluate(SAVE);
  const dif = diffs(ids(strip(R1.data)), ids(strip(R2.data)));
  ok(!dif.length, 'recorrer todas las pestañas deja los mismos datos en la v1 y en la v2' + (dif.length ? ': ' + dif.slice(0, 8).join(' | ') : ''));
  ok(R1.script === R2.script, 'el guion queda igual');
  ok(!B2.errs.length, 'la v2 recorre todas las pestañas sin errores ' + B2.errs.slice(0, 3).join(' | '));

  // 2. trabajar en la v2 (computadora y celular) y volver a la v1
  await B2.p.evaluate(() => { setTab('sup'); });
  await B2.p.waitForTimeout(300);
  await B2.p.click('.v2-hsrecb'); await B2.p.waitForTimeout(1300); await B2.p.click('.v2-hsrecb');   // una toma con REC
  await B2.p.click('.v2-hsmk'); await B2.p.click('.v2-hsmos');                                          // su marca y MOS
  await B2.p.click('.v2-hsnb'); await B2.p.fill('#v2Tn', 'Nota hecha en la v2'); await B2.p.click('#pop [data-ok]');
  await B2.p.click('.v2-hsdone');                                                                       // rodado · siguiente
  await B2.p.evaluate(() => { setTab('project'); });
  await B2.p.selectOption('[data-bind="v2-kind"]', 'Largometraje');
  await B2.p.setViewportSize({ width: 390, height: 844 }); await B2.p.waitForTimeout(400);
  await B2.p.evaluate(() => { setTab('sup'); }); await B2.p.waitForTimeout(300);
  await B2.p.click('.v2-hsrecb'); await B2.p.waitForTimeout(1100); await B2.p.click('.v2-hsrecb');
  const W = await B2.p.evaluate(SAVE);
  ok(!B2.errs.length, 'la v2 trabaja sin errores ' + B2.errs.slice(0, 3).join(' | '));
  const d = JSON.parse(W.data);
  ok(d.meta.kind === 'Largometraje', 'el tipo de proyecto se guarda (P.meta.kind)');
  const notes = Object.values(d.sup.takes).flat().filter(t => t && t.note === 'Nota hecha en la v2');
  ok(notes.length === 1, 'la nota de la toma se guarda en P.sup.takes');
  ok(Object.keys(d.sup.mos || {}).length >= 1, 'MOS se guarda en P.sup.mos');

  // la v1 abre lo que guardó la v2
  const C1 = await page(b, v1);
  await C1.p.evaluate(OPEN, { ...W, id: 'compat-w' });
  const V = await C1.p.evaluate(() => ({ kind: P.meta.kind, takes: Object.values(P.sup.takes).flat().length, note: Object.values(P.sup.takes).flat().some(t => t && t.note === 'Nota hecha en la v2') }));
  ok(!C1.errs.length, 'la v1 abre y recorre el proyecto guardado por la v2 sin errores ' + C1.errs.slice(0, 3).join(' | '));
  ok(V.note, 'la v1 ve las tomas y notas hechas en la v2');
  const R3 = await C1.p.evaluate(SAVE);
  const back = JSON.parse(R3.data);
  ok(JSON.stringify(back.sup) === JSON.stringify(d.sup), 'la v1 no pierde nada de la hoja de script al guardar');
  ok(back.meta.kind === 'Largometraje', 'la v1 conserva el tipo de proyecto aunque no lo use');
  await b.close();
  console.log(fails ? fails + ' fallan' : 'todo bien');
  process.exit(fails ? 1 : 0);
})();
