/* Las reglas del equipo son unas solas (src/areas.js) en la interfaz, el servidor y el escritorio.
   node test/permisos.test.js   (el servidor y el escritorio usan su copia: server/areas.js y desktop/areas.js, que
   arman server/make.js y desktop/make.js) */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
const A = require(R + '/src/areas.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const same = (a, b) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));

test('las copias del servidor y del escritorio son el mismo archivo', () => {
  const src = fs.readFileSync(R + '/src/areas.js', 'utf8');
  for (const f of ['server/areas.js', 'desktop/areas.js']) if (fs.existsSync(R + '/' + f)) assert.strictEqual(fs.readFileSync(R + '/' + f, 'utf8'), src, f + ' está desactualizado: corre su make.js');
});
test('el servidor usa las reglas comunes (no una copia propia)', () => {
  const P = require(R + '/server/lib/perm.js');
  const S = require(R + '/server/areas.js');
  assert.strictEqual(P.readSet, S.permReadSet); assert.strictEqual(P.canEdit, S.permCanEdit); assert.strictEqual(P.areasOf, S.permAreas);
  assert.strictEqual(P.cleanPerms, S.cleanPerms); assert.strictEqual(P.frameSec, S.frameSec); assert.strictEqual(P.SEC_DEPS, S.SEC_DEPS);
});
test('las pestañas de la interfaz son las mismas secciones y en el mismo orden', () => {
  const c = { console }; vm.createContext(c);
  vm.runInContext(fs.readFileSync(R + '/src/areas.js', 'utf8') + '\n' + fs.readFileSync(R + '/src/share.js', 'utf8').split('\nlet SHARE')[0] + '\nglobalThis.L = SEC_LIST;', c);
  same(c.L.map(x => x[0]), A.SECS);
});
test('las áreas del desglose son las cajas de la hoja (core.js · SHEET)', () => {
  const c = { console }; vm.createContext(c);
  vm.runInContext(fs.readFileSync(R + '/src/core.js', 'utf8') + '\nglobalThis.SH = SHEET;', c);
  const SHEET = c.SH;
  same(Object.fromEntries(SHEET.map(b => [b.id, b.cats])), A.BD_AREAS);
});
test('el presupuesto: solo producción lo lee y lo edita', () => {
  const p = { presupuesto: 'editar', plan: 'ver' };
  assert.ok(!A.permReadSet({ role: 'Dirección de arte', perms: p }).has('presupuesto'));
  assert.ok(!A.permCanEdit({ role: 'Dirección de arte', perms: p }, 'presupuesto'));
  assert.ok(A.permReadSet({ role: 'Jefatura de producción', perms: p }).has('presupuesto'));
  assert.ok(A.permCanEdit({ role: 'Jefatura de producción', perms: p }, 'presupuesto'));
  assert.ok(A.permReadSet({ admin: true }).has('presupuesto'));
  assert.ok(!A.permCanEdit({ admin: true, ro: true }, 'guion'), 'solo lectura manda');
});
test('limpiar permisos: áreas que no son de la hoja no pasan', () => {
  same(A.cleanPerms({ desglose: 'editar', areas: ['props', '__proto__', 'constructor', 'nada', 'props'], guion: 'admin', plan: 'ver' }), { desglose: 'editar', plan: 'ver', areas: ['props'] });
  same(A.cleanPerms(null), {});
});
test('cada imagen va con su sección', () => {
  same(['bd~e1', 'ca~x', 'lc~c1~p1', 'cl~d1~p1', 'sb1'].map(A.frameSec), ['desglose', 'desglose', 'plan', 'llamado', 'storyboard']);
});

console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
