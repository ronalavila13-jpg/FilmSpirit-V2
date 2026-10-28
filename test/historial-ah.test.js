/* Lote AH · historial: diferencias finas por ruta (call.days.<jornada>.crewCall, budget.lines[<id>].rate…), deshacer un
   paso suelto sin choque y con choque, listas con id (agregar, quitar y mover sin pisar lo de otros), rehacer, lo que
   llega del equipo, las versiones enviadas de la hoja de llamado y lo que pesa cada paso.
   src/historial.js corre entero en un vm, con lo mínimo de la app de mentira. node test/historial-ah.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.stack.split('\n').slice(0, 3).join('\n   ')); } };

const src = fs.readFileSync(R + '/src/historial.js', 'utf8');
let N = 0;
const c = {
  console, Math, JSON, Object, Array, String, Number, Set, Map, WeakMap, Date, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, clearInterval() { },
  EN: false, tr: s => s, trDone: s => s, uid: p => p + (++N), toast: (m) => c.TOASTS.push(m), TOASTS: [], problem() { },
  UI: { tab: 'plan', readOnly: false }, $: () => null, ls: { get: (k, d) => d, set() { } }, closePop() { }, ICO: { close: 'x' }, CSS: { escape: s => s },
  addEventListener() { }, document: { addEventListener() { } }, dispatchEvent() { }, Event: function () { },
  normalizeProject: x => x, derive() { }, render() { }, dirty: new Set(), setSaveState() { }, saveSoon() { }, FRAMES: {}, Store: { saveFrame: () => Promise.resolve() },
  agoText: () => 'ahora', titleCase: s => String(s).toLowerCase().replace(/(^|\s)\S/g, x => x.toUpperCase()), fmtDur: m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) : ''),
  CAT: { props: { name: 'Atrezzo' }, wardrobe: { name: 'Vestuario' }, cast: { name: 'Reparto' } }, CS_DEPTS: [['cam', 'Cámara']],
  D: { code: {}, sc: { sceneOf: [0, 0, 1, 1, 2, 2], scenes: [{ key: '1' }, { key: '2' }, { key: '3' }] } },
};
vm.createContext(c);
vm.runInContext('var P = null;\n' + src, c);
const H = () => vm.runInContext('HIST', c), J = x => JSON.parse(JSON.stringify(x));
const run = s => vm.runInContext(s, c);
// un proyecto chico: plan con dos jornadas, hoja de llamado, desglose y presupuesto
const proj = () => ({
  id: 'p1', meta: { title: 'Prueba' }, paras: [{ t: 'h', x: 'EXT. A' }, { t: 'a', x: 'x' }, { t: 'h', x: 'INT. B' }, { t: 'a', x: 'y' }, { t: 'h', x: 'EXT. C' }, { t: 'a', x: 'z' }],
  schedule: { call: '07:00', items: [{ k: '1' }, { k: '2' }, { d: 'd1' }, { k: '3' }, { k: '4' }, { d: 'd2' }, { k: '5' }] },
  call: { crew: [{ id: 'c1', role: 'Sonidista', name: 'Juan' }], days: { d1: { crewCall: '07:00', lunch: '13:00' }, d2: { crewCall: '07:00' } } },
  elements: { e1: { id: 'e1', cat: 'props', name: 'REVÓLVER' } }, tags: [{ id: 't1', el: 'e1', p: 1, s: 0, e: 3 }],
  budget: { currency: 'S/', contingency: 10, lines: [{ id: 'b1', name: 'Cámara', qty: 1, rate: 150 }, { id: 'b2', name: 'Luces', qty: 1, rate: 80 }, { id: 'b3', name: 'Sonido', qty: 1, rate: 60 }] },
});
const fresh = () => { c.P = proj(); c.UI.tab = 'plan'; c.UI.scriptEdit = false; c.UI.readOnly = false; c.TOASTS.length = 0; run('histReset()'); };
// un paso: el cambio y su pausa (histCapture), en una pestaña
const step = (tab, f, label) => { c.UI.tab = tab; if (label) run(`histNote(${JSON.stringify(label)})`); f(c.P); run('histSoon()'); return run('histCapture()'); };
const ps = e => e.p.map(s => typeof s === 'string' ? s : '[' + s.i + ']').join('.') + (e.m ? '[' + e.m.i + ']' : '');
const moveItem = (items, key, beforeKey) => { const i = items.findIndex(x => x.k === key || x.d === key); const [it] = items.splice(i, 1); items.splice(items.findIndex(x => x.k === beforeKey || x.d === beforeKey), 0, it); };

/* ---------- diferencias por ruta ---------- */
test('una hora de la hoja de llamado es una sola ruta, con su antes y su después', () => {
  fresh();
  const st = step('call', P => { P.call.days.d1.crewCall = '06:30'; });
  assert.deepStrictEqual(J(st.ch.map(ps)), ['call.days.d1.crewCall']);
  assert.strictEqual(st.ch[0].a, '"07:00"'); assert.strictEqual(st.ch[0].b, '"06:30"');
  assert.strictEqual(run('histText')(st), 'Jornada 1: llamado 07:00 → 06:30');
});
test('una lista con id: el campo de un elemento va por su id, no por su lugar', () => {
  fresh();
  const st = step('budget', P => { P.budget.lines[1].rate = 95; });
  assert.deepStrictEqual(J(st.ch.map(ps)), ['budget.lines.[b2].rate']);
  assert.strictEqual(run('histText')(st), '«Luces»: tarifa 80 → 95');
});
test('el plan: mover una escena de jornada es un solo movimiento (la escena, no la jornada)', () => {
  fresh();
  const st = step('plan', P => moveItem(P.schedule.items, '4', 'd1'));
  assert.deepStrictEqual(J(st.ch.map(ps)), ['schedule.items[k:4|]']);
  assert.ok(st.ch[0].mv, 'movida');
  assert.strictEqual(st.ch[0].ap, 'k:3|'); assert.strictEqual(st.ch[0].bp, 'k:2|');
  assert.strictEqual(run('histText')(st), 'Escena 4 a la jornada 1');
});
test('agregar y quitar en una lista con id: el elemento entero, con sus vecinos', () => {
  fresh();
  const st = step('budget', P => { P.budget.lines.splice(1, 1); P.budget.lines.push({ id: 'b4', name: 'Grúa', qty: 1, rate: 500 }); });
  const del = st.ch.find(e => e.m.i === 'b2'), add = st.ch.find(e => e.m.i === 'b4');
  assert.ok(del && del.a && del.b === undefined && del.ap === 'b1' && del.an === 'b3');
  assert.ok(add && add.b && add.a === undefined && add.bp === 'b3');
});
test('lista sin id pero sin repetidos (días de descanso, el registro): por contenido', () => {
  fresh();
  c.P.schedule.off = [0]; run('histReset()');
  const st = step('plan', P => { P.schedule.off = [0, 6]; });
  assert.strictEqual(st.ch.length, 1); assert.ok(st.ch[0].m && st.ch[0].m.k === 'js' && st.ch[0].b === '6');
});
test('lista sin identidad con repetidos: una sola ruta (corta) o un tramo con la huella (larga)', () => {
  fresh();
  c.P.meta.tags = ['a', 'a']; run('histReset()');
  let st = step('project', P => { P.meta.tags = ['a', 'a', 'b']; });
  assert.deepStrictEqual(J(st.ch.map(ps)), ['meta.tags']); assert.strictEqual(st.ch[0].a, '["a","a"]');
  // un guion largo con párrafos repetidos: solo el tramo que cambió
  c.P.paras = Array.from({ length: 400 }, (_, i) => ({ t: 'a', x: i % 7 ? 'Línea ' + i : 'CORTE A:' })); run('histReset()');
  st = step('lined', P => { P.paras[200].x = 'cambiada'; });
  assert.strictEqual(st.ch.length, 1); const e = st.ch[0];
  assert.strictEqual(e.sp, 200); assert.strictEqual(e.na, 1); assert.strictEqual(e.nb, 1); assert.ok(e.n === undefined && e.a.length < 60 && e.ha && e.hb);
});

test('en palabras: la jornada que se crea al escribir en ella, la marca de línea editada, el equipo de una vez', () => {
  fresh();
  let st = step('call', P => { delete P.call.days.d2; }); run('histUndo')(st.id);
  c.P.call.days = { d1: c.P.call.days.d1 }; run('histReset()');
  st = step('call', P => { P.call.days.d2 = { crewCall: '08:00' }; });
  assert.strictEqual(run('histText')(st), 'Jornada 2: llamado — → 08:00', 'una jornada nueva: su dato, no «datos de la jornada»');
  st = step('budget', P => { P.budget.lines[0].rate = 210; P.budget.lines[0].ed = 1; P.budget.log = [{ t: 1, txt: 'x' }]; });
  assert.strictEqual(run('histText')(st), '«Cámara»: tarifa 150 → 210', 'sin «y 2 cambios más» por la marca y el registro');
  st = step('call', P => { P.call.crew.push({ id: 'c2', role: 'Gaffer' }, { id: 'c3', role: 'Eléctrico' }); });
  assert.strictEqual(run('histText')(st), 'Equipo: 2 agregados');
  st = step('plan', P => { P.schedule.items.splice(2, 0, { d: 'dn' }); });
  assert.strictEqual(run('histText')(st), 'Jornada nueva');
  st = step('plan', P => { P.schedule.items.push({ e: 'ev1', name: 'Almuerzo', t: '' }); });
  assert.strictEqual(run('histText')(st), 'Evento «Almuerzo» agregado');
});
test('al cambiar de pestaña, lo pendiente queda en la pestaña donde se hizo', () => {
  fresh();
  c.UI.tab = 'budget'; c.P.budget.lines[0].rate = 300; run('histSoon()');      // sin pausa todavía
  run('histFlush()'); c.UI.tab = 'call';                                       // setTab
  c.P.call.days.d1.crewCall = '06:00'; run('histSoon()'); run('histCapture()');
  assert.deepStrictEqual(J(run('HIST.undo').map(s => s.tab)), ['budget', 'call']);
});

/* ---------- deshacer un paso suelto ---------- */
test('deshacer uno del medio: vuelve solo lo suyo; lo de antes y lo de después quedan', () => {
  fresh();
  const s1 = step('call', P => { P.call.days.d1.crewCall = '06:30'; });
  const s2 = step('call', P => { P.call.days.d1.lunch = '13:30'; });
  const s3 = step('call', P => { P.call.days.d2.crewCall = '08:00'; });
  assert.strictEqual(run('histUndo')(s2.id), true);
  assert.deepStrictEqual(J(c.P.call.days), { d1: { crewCall: '06:30', lunch: '13:00' }, d2: { crewCall: '08:00' } });
  assert.ok(H().redo.includes(s2) && H().undo.includes(s1) && H().undo.includes(s3));
});
test('dos cambios en el plan ya no se bloquean: deshacer el primero aunque después se movió otra escena', () => {
  fresh();
  const s1 = step('plan', P => moveItem(P.schedule.items, '4', 'd1'));   // la 4 a la jornada 1
  step('plan', P => moveItem(P.schedule.items, '1', 'd2'));              // la 1 a la jornada 2
  step('plan', P => { P.schedule.call = '06:00'; });
  assert.strictEqual(run('histUndo')(s1.id), true);
  assert.deepStrictEqual(J(c.P.schedule.items).map(x => x.k || x.d), ['2', 'd1', '3', '4', '1', 'd2', '5']);
  assert.strictEqual(c.P.schedule.call, '06:00');
});
test('con choque: si algo posterior cambió lo mismo, no se deshace nada del paso y se dice qué choca', () => {
  fresh();
  const s1 = step('call', P => { P.call.days.d1.crewCall = '06:30'; P.call.days.d1.lunch = '12:30'; });
  const s2 = step('call', P => { P.call.days.d1.crewCall = '06:00'; });
  const before = JSON.stringify(c.P);
  assert.strictEqual(run('histUndo')(s1.id), false);
  assert.strictEqual(JSON.stringify(c.P), before, 'ni el almuerzo vuelve: el paso no se deshace a medias');
  const t = c.TOASTS.pop();
  assert.ok(/No se puede deshacer «Jornada 1: llamado 07:00 → 06:30 y 1 cambio más»: lo volviste a cambiar después \(Jornada 1: llamado 06:30 → 06:00\)/.test(t), t);
  assert.ok(run('histBlock')(s1, true), 'en el panel sale bloqueado');
  // deshecho el de después, el primero vuelve a poder
  assert.strictEqual(run('histUndo')(s2.id), true);
  assert.strictEqual(run('histUndo')(s1.id), true);
  assert.deepStrictEqual(J(c.P.call.days.d1), { crewCall: '07:00', lunch: '13:00' });
});
test('con choque desde otra pestaña: lo dice con el nombre de la pestaña', () => {
  fresh();
  const s1 = step('plan', P => { P.call.days.d2.crewCall = '09:00'; });
  step('call', P => { P.call.days.d2.crewCall = '09:30'; });
  c.UI.tab = 'plan';
  assert.strictEqual(run('histUndo')(), false);
  assert.ok(/después lo cambiaste en Hoja de llamado/.test(c.TOASTS.pop()));
  assert.ok(run('histBlock')(s1, true));
});
test('Ctrl+Z deshace lo último de la pestaña abierta, no lo de otra', () => {
  fresh();
  step('budget', P => { P.budget.lines[0].rate = 200; });
  step('call', P => { P.call.days.d1.crewCall = '06:30'; });
  c.UI.tab = 'budget';
  assert.strictEqual(run('histUndo')(), true);
  assert.strictEqual(c.P.budget.lines[0].rate, 150);
  assert.strictEqual(c.P.call.days.d1.crewCall, '06:30', 'lo de la hoja de llamado queda');
});

/* ---------- listas con id ---------- */
test('agregar dos líneas y deshacer la primera: la segunda queda en su lugar', () => {
  fresh();
  const s1 = step('budget', P => { P.budget.lines.push({ id: 'b4', name: 'Grúa', rate: 500 }); });
  step('budget', P => { P.budget.lines.push({ id: 'b5', name: 'Dron', rate: 300 }); });
  assert.strictEqual(run('histUndo')(s1.id), true);
  assert.deepStrictEqual(c.P.budget.lines.map(l => l.id), ['b1', 'b2', 'b3', 'b5']);
});
test('quitar una línea y deshacerlo después de otros cambios: vuelve junto a su vecino', () => {
  fresh();
  const s1 = step('budget', P => { P.budget.lines.splice(1, 1); });           // sin «Luces»
  step('budget', P => { P.budget.lines.unshift({ id: 'b0', name: 'Seguro', rate: 40 }); });
  step('budget', P => { P.budget.lines[1].rate = 175; });                      // «Cámara»
  assert.strictEqual(run('histUndo')(s1.id), true);
  assert.deepStrictEqual(c.P.budget.lines.map(l => l.id), ['b0', 'b1', 'b2', 'b3']);
  assert.strictEqual(c.P.budget.lines[1].rate, 175);
});
test('agregar y después cambiar lo agregado: deshacer el agregado choca (se perdería lo de después)', () => {
  fresh();
  const s1 = step('budget', P => { P.budget.lines.push({ id: 'b4', name: 'Grúa', rate: 500 }); });
  step('budget', P => { P.budget.lines[3].rate = 450; });
  assert.strictEqual(run('histUndo')(s1.id), false);
  assert.strictEqual(c.P.budget.lines.length, 4);
});
test('mover la misma escena dos veces: deshacer la primera choca; la segunda, no', () => {
  fresh();
  const s1 = step('plan', P => moveItem(P.schedule.items, '4', 'd1'));
  const s2 = step('plan', P => moveItem(P.schedule.items, '4', '5'));
  assert.strictEqual(run('histUndo')(s1.id), false, 'la escena 4 cambió de lugar después');
  assert.ok(/Escena 4/.test(c.TOASTS.pop()));
  assert.strictEqual(run('histUndo')(s2.id), true);
  assert.strictEqual(run('histUndo')(s1.id), true);
  assert.deepStrictEqual(J(c.P.schedule.items).map(x => x.k || x.d), ['1', '2', 'd1', '3', '4', 'd2', '5']);
});
test('una marca del desglose: «Revólver» (atrezzo) en la escena 3, y se deshace sola', () => {
  fresh();
  const s1 = step('breakdown', P => { P.tags.push({ id: 't2', el: 'e1', p: 4, s: 0, e: 3 }); });
  step('breakdown', P => { P.elements.e2 = { id: 'e2', cat: 'wardrobe', name: 'CASACA' }; P.tags.push({ id: 't3', el: 'e2', p: 2, s: 0, e: 2 }); });
  assert.strictEqual(run('histText')(s1), '«Revólver» (atrezzo) en la escena 3');
  assert.strictEqual(run('histUndo')(s1.id), true);
  assert.deepStrictEqual(c.P.tags.map(t => t.id), ['t1', 't3']);
});

test('agregar y después mover lo agregado: deshacer el agregado choca hasta deshacer el movimiento', () => {
  fresh();
  const s1 = step('budget', P => { P.budget.lines.push({ id: 'b4', name: 'Grúa', rate: 500 }); });
  const s2 = step('budget', P => { const [x] = P.budget.lines.splice(3, 1); P.budget.lines.unshift(x); });
  assert.strictEqual(run('histUndo')(s1.id), false, 'su lugar cambió después');
  assert.strictEqual(run('histUndo')(s2.id), true);
  assert.strictEqual(run('histUndo')(s1.id), true);
  assert.deepStrictEqual(J(c.P.budget.lines.map(l => l.id)), ['b1', 'b2', 'b3']);
});
test('al azar (600 historias): nunca se traba, deshacer en orden inverso es exacto y nada se pierde', () => {
  let seed = 7; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }, ri = n => Math.floor(rnd() * n);
  const ids = L => J(L.map(x => x.id + ':' + x.v)).sort().join();
  for (let trial = 0; trial < 600; trial++) {
    c.P = { id: 'p', list: Array.from({ length: 3 + ri(6) }, (_, i) => ({ id: 'x' + i, v: i })) }; run('histReset()');
    const start = JSON.stringify(c.P.list); let nid = 0; const states = [start];
    for (let k = 2 + ri(5); k > 0; k--) {
      const L = c.P.list, op = L.length ? ri(4) : 0;
      if (op === 0) L.splice(ri(L.length + 1), 0, { id: 'n' + nid++, v: 0 });
      else if (op === 1) L.splice(ri(L.length), 1);
      else if (op === 2) { const [x] = L.splice(ri(L.length), 1); L.splice(ri(L.length + 1), 0, x); }
      else L[ri(L.length)].v++;
      run('histSoon()'); if (run('histCapture()')) states.push(JSON.stringify(c.P.list));   // (mover a su mismo lugar no es un paso)
    }
    if (trial % 2) {
      // en orden inverso: cada paso vuelve exactamente al estado de antes
      for (let i = states.length - 2; i >= 0; i--) { assert.ok(run('histUndo')(run('HIST.undo').at(-1).id)); assert.strictEqual(JSON.stringify(c.P.list), states[i], 'prueba ' + trial); }
    } else {
      // en cualquier orden permitido: siempre queda uno que se puede, y al final está todo lo del comienzo
      while (run('HIST.undo').length) { const U = run('HIST.undo').slice(); const ok = U.sort(() => rnd() - .5).some(s => run('histUndo')(s.id)); assert.ok(ok, 'trabado en la prueba ' + trial); }
      assert.strictEqual(ids(c.P.list), ids(JSON.parse(start)), 'los mismos elementos con sus valores');
    }
  }
});

/* ---------- rehacer ---------- */
test('rehacer un paso suelto: vuelve lo suyo; con choque, no', () => {
  fresh();
  const s1 = step('call', P => { P.call.days.d1.crewCall = '06:30'; });
  step('call', P => { P.call.days.d2.crewCall = '08:00'; });
  run('histUndo')(s1.id);
  assert.strictEqual(c.P.call.days.d1.crewCall, '07:00');
  assert.strictEqual(run('histRedo')(s1.id), true);
  assert.strictEqual(c.P.call.days.d1.crewCall, '06:30');
  assert.strictEqual(c.P.call.days.d2.crewCall, '08:00');
  // deshecho otra vez y cambiado lo mismo: ya no se rehace (y no se pisa)
  run('histUndo')(s1.id);
  step('call', P => { P.call.days.d1.crewCall = '05:45'; });
  assert.strictEqual(run('histRedo')(s1.id), false);
  assert.strictEqual(c.P.call.days.d1.crewCall, '05:45');
  assert.ok(/No se puede rehacer/.test(c.TOASTS.pop()));
});
test('Ctrl+Mayús+Z rehace lo último deshecho de la pestaña, salvo que después hubo un cambio nuevo en ella', () => {
  fresh();
  step('budget', P => { P.budget.lines[0].rate = 200; });
  c.UI.tab = 'budget'; run('histUndo()');
  assert.strictEqual(run('histRedo()'), true);
  assert.strictEqual(c.P.budget.lines[0].rate, 200);
  run('histUndo()');
  step('budget', P => { P.budget.contingency = 15; });
  assert.strictEqual(run('histRedo()'), false, 'después de un cambio nuevo, Ctrl+Mayús+Z no');
  assert.strictEqual(run('histRedo')(H().redo[0].id), true, 'pero desde el historial sí: no tocan lo mismo');
});
test('mover y rehacer el movimiento', () => {
  fresh();
  const s1 = step('plan', P => moveItem(P.schedule.items, '1', '5'));
  run('histUndo')(s1.id);
  assert.deepStrictEqual(J(c.P.schedule.items).map(x => x.k || x.d), ['1', '2', 'd1', '3', '4', 'd2', '5']);
  assert.strictEqual(run('histRedo')(s1.id), true);
  assert.deepStrictEqual(J(c.P.schedule.items).map(x => x.k || x.d), ['2', 'd1', '3', '4', 'd2', '1', '5']);
});

/* ---------- lo de siempre ---------- */
test('los pasos del guion al escribir no se deshacen desde aquí, pero bloquean lo anterior que tocaron', () => {
  fresh();
  const s1 = step('project', P => { P.meta.title = 'Otro'; });
  c.UI.scriptEdit = true;
  const s2 = step('script', P => { P.meta.title = 'Otro más'; });
  assert.ok(s2.own);
  assert.strictEqual(run('histUndo')(s2.id), false);
  assert.strictEqual(run('histUndo')(s1.id), false);
  assert.ok(/al escribir el guion/.test(c.TOASTS.pop()));
});
test('lo que llega del equipo deja sin deshacer solo los pasos que tocaban lo mismo', () => {
  fresh();
  const s1 = step('call', P => { P.call.days.d1.crewCall = '06:30'; });
  const s2 = step('call', P => { P.call.days.d2.crewCall = '08:00'; });
  c.P.call.days.d1.crewCall = '06:15'; run('histRemote()');
  assert.ok(!H().undo.includes(s1) && H().undo.includes(s2));
});
test('las versiones enviadas de la hoja de llamado no se des-envían al deshacer', () => {
  fresh();
  const s1 = step('call', P => { P.call.days.d1.crewCall = '06:30'; });
  c.P.call.days.d1.exp = { v: 1, t: 5 }; run("histQuiet('call')");
  assert.strictEqual(run('histUndo')(s1.id), true);
  assert.deepStrictEqual(J(c.P.call.days.d1), { crewCall: '07:00', lunch: '13:00', exp: { v: 1, t: 5 } });
  // una jornada borrada entera y devuelta: su versión enviada de ahora no se pisa
  const s2 = step('call', P => { delete P.call.days.d2; });
  assert.ok(s2.ch.length === 1 && ps(s2.ch[0]) === 'call.days.d2');
  assert.strictEqual(run('histUndo')(s2.id), true);
  assert.deepStrictEqual(J(c.P.call.days.d2), { crewCall: '07:00' });
});
test('las imágenes que guarda un paso vuelven al deshacer y se van al rehacer', () => {
  fresh();
  c.FRAMES.f1 = 'data:1';
  run("histNote('Eliminar el plano', { f1: 'data:1' }, 'board')"); delete c.FRAMES.f1; delete c.P.elements.e1; run('histSoon()');
  const st = run('histCapture()');
  assert.strictEqual(st.label, 'Eliminar el plano');
  c.UI.tab = 'board';
  run('histUndo()');
  assert.strictEqual(c.FRAMES.f1, 'data:1'); assert.ok(c.P.elements.e1);
  run('histRedo()');
  assert.ok(!('f1' in c.FRAMES));
});
test('un guion largo con repetidos: el tramo se deshace solo si la lista sigue igual', () => {
  fresh();
  c.P.paras = Array.from({ length: 400 }, (_, i) => ({ t: 'a', x: i % 7 ? 'Línea ' + i : 'CORTE A:' })); run('histReset()');
  const s1 = step('lined', P => { P.paras.splice(10, 1); });
  const s2 = step('lined', P => { P.paras[300].x = 'otra'; });
  assert.strictEqual(run('histUndo')(s1.id), false, 'la lista entera es una sola ruta');
  run('histUndo')(s2.id);
  assert.strictEqual(run('histUndo')(s1.id), true);
  assert.strictEqual(c.P.paras.length, 400); assert.strictEqual(c.P.paras[10].x, 'Línea 10');
});
test('un paso pesa lo que cambió, no la foto entera de la parte', () => {
  fresh();
  c.P.budget.lines = Array.from({ length: 300 }, (_, i) => ({ id: 'L' + i, name: 'Línea ' + i, qty: 1, rate: i, note: 'una nota cualquiera' })); run('histReset()');
  const whole = JSON.stringify(c.P.budget).length * 2;
  const st = step('budget', P => { P.budget.lines[150].rate = 9999; });
  assert.ok(st.n < 200 && st.n * 50 < whole, `${st.n} contra ${whole}`);
  // muchísimas diferencias que pesan más que la parte entera: va entera (nunca más pesada)
  const big = step('budget', P => { P.budget.lines = P.budget.lines.map(l => ({ ...l, id: l.id + 'x' })); });
  assert.ok(big.n <= JSON.stringify(c.P.budget).length * 2 + 200, 'no más pesada que la foto entera');
});

if (fail) { console.log(`\n${fail} FALLA(N)`); process.exitCode = 1; } else console.log('\ntodo bien');
