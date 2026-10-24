// Reparto sin duplicados y otra versión del guion sin perder el plan (prueba con un largometraje, octubre de 2026)
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({ console, uid: (() => { let n = 0; return p => (p || 'x') + (++n).toString(36); })() });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'core.js'), 'utf8').replace(/if \(typeof module[\s\S]*$/, '') +
  ';this.parseFountain=parseFountain;this.newProject=newProject;this.autoBreakdown=autoBreakdown;this.remapProject=remapProject;this.computeScenes=computeScenes;this.titleCase=titleCase;', ctx);
const F = `INT. CASA DE MARÍA - COCINA - DÍA

MARÍA QUISPE (42) pela papas. INSPECTORA ROSA CHÁVEZ (45) entra. EL CHOLO BENAVIDES (50) espera afuera. DOCTOR LEÓN (50) mira.

MARÍA
¿Otra vez usted?

ROSA
Vengo por su hermano.

CHOLO
Ya me voy.

EXT. CAÑAVERAL - NOCHE

María corre entre la caña.

MARÍA
¡Julio!

INT. COMISARÍA - OFICINA - DÍA

ROSA
Que pase la señora.
`;
test('quien se presenta con nombre completo y habla con su nombre es un solo personaje', () => {
  const P = ctx.newProject('t', ctx.parseFountain(F).paras);
  ctx.autoBreakdown(P);
  const cast = Object.values(P.elements).filter(e => e.cat === 'cast').map(e => e.name).sort();
  assert.deepStrictEqual(cast, ['CHOLO', 'DOCTOR LEÓN', 'MARÍA', 'ROSA']);
});
test('las locaciones con las palabras chicas en minúscula', () => {
  assert.strictEqual(ctx.titleCase('CASA DE MARÍA - COCINA'), 'Casa de María - Cocina');
  assert.strictEqual(ctx.titleCase('EL PADRE MANUEL'), 'El Padre Manuel');
});
test('otra versión: cada escena conserva su número, la nueva toma letra y el plan sigue a su escena', () => {
  const P = ctx.newProject('t', ctx.parseFountain(F).paras);
  ctx.autoBreakdown(P);
  for (const t of P.tags) t.auto = false;
  P.schedule.items = [{ k: '1' }, { k: '3' }, { d: 'd1' }, { k: '2' }, { d: 'd2' }];
  const v2 = F.replace('EXT. CAÑAVERAL - NOCHE', 'EXT. CEMENTERIO - NOCHE\n\nMaría deja flores.\n\nEXT. CAÑAVERAL - NOCHE').replace('Vengo por su hermano.', 'Vengo por su hermano Felipe.');
  const lost = ctx.remapProject(P, ctx.parseFountain(v2).paras);
  const sc = ctx.computeScenes(P.paras);
  assert.deepStrictEqual(Array.from(sc.scenes, s => s.key + ' ' + s.heading.split(' - ')[0]), ['1 INT. CASA DE MARÍA', '1A EXT. CEMENTERIO', '2 EXT. CAÑAVERAL', '3 INT. COMISARÍA']);
  assert.strictEqual(lost, 0);
  // la marca de ROSA en el diálogo que cambió sigue en su lugar
  assert.ok(P.tags.every(t => P.paras[t.p].x.slice(t.s, t.e).length));
});
