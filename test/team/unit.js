// Prueba del cifrado y permisos sin interfaz: node test/team/unit.js
const { Team, readSet } = require('../../desktop/team.js');
const fs = require('fs'), path = require('path');
const W = path.join(require('os').tmpdir(), 'filmspirit-team-unit');
fs.rmSync(W, { recursive: true, force: true });
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const evA = [], evB = [];
  const A = new Team({ ext: 'filmass', appLabel: 'Filmass test', send: (...a) => evA.push(a) });
  const B = new Team({ ext: 'filmass', appLabel: 'Filmass test', send: (...a) => evB.push(a) });
  const secs = { guion: '{"paras":[1,2]}', desglose: '{"e":1}', storyboard: '{"shots":{}}', animatic: '{}', plan: '{"schedule":"secreto-plan"}', presupuesto: '{"budget":"S/ 120000"}', hoja: '{}' };
  const { file, recovery } = await A.create({ dir: W + '/Mi peli', title: 'Mi peli', pid: 'p1', adminName: 'Ronald', password: 'clave-productor', sections: secs, frames: { s1: 'data:image/png;base64,AAA' } });
  ok(fs.existsSync(file) && /^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$/.test(recovery), 'proyecto compartido creado + código de recuperación ' + recovery);
  const raw = fs.readFileSync(W + '/Mi peli/datos/presupuesto.dat', 'utf8');
  ok(!raw.includes('120000'), 'el presupuesto en disco está cifrado');
  const info = await A.info(file);
  const owner = info.members[0].id;
  let st = await A.login('p1', file, owner, 'clave-productor');
  ok(st.admin && st.sections.presupuesto.json.includes('120000'), 'el productor entra y lee todo');
  // agregar a Arte (desglose editar) y Contabilidad (presupuesto editar: con un cargo de producción, como pide la app)
  const r = await A.updateTeam('p1', [
    { add: true, name: 'Lucía (Arte)', role: 'Arte', perms: { guion: 'ver', desglose: 'editar', storyboard: 'ver' } },
    { add: true, name: 'Carlos (Contab.)', role: 'Producción ejecutiva', perms: { presupuesto: 'editar' } },
  ]);
  const ids = Object.keys(r.passwords);
  const arte = r.state.members.find(m => m.role === 'Arte'), cont = r.state.members.find(m => m.role === 'Producción ejecutiva');
  ok(ids.length === 2 && /^[A-Z][a-z]{2}\d-/.test(r.passwords[arte.id]), 'contraseñas generadas: ' + Object.values(r.passwords).join(', '));
  // Arte entra
  let sb = await B.login('p1', file, arte.id, r.passwords[arte.id]);
  ok(sb.sections.plan === null && sb.sections.presupuesto === null, 'Arte no puede leer plan ni presupuesto');
  ok(sb.sections.desglose.json === '{"e":1}' && sb.sections.storyboard, 'Arte lee guion, desglose y storyboard');
  try { await B.login('p1', file, arte.id, 'mala'); ok(false, 'contraseña mala'); } catch (e) { ok(/contraseña/.test(e.message), 'contraseña incorrecta rechazada'); }
  sb = await B.login('p1', file, arte.id, r.passwords[arte.id]);
  // Arte edita el desglose → el productor lo recibe
  await B.save('p1', 'desglose', '{"e":2}');
  await sleep(2600);
  const up = evA.find(e => e[0] === 'team-update' && e[2].sec === 'desglose');
  ok(up && up[2].json === '{"e":2}' && /Lucía/.test(up[2].by), 'el productor recibe el cambio de Arte (' + (up && up[2].by) + ')');
  // Arte intenta guardar el storyboard (solo ver) → rechazado por la app
  try { await B.save('p1', 'storyboard', '{"x":1}'); ok(false, 'sb'); } catch (e) { ok(/permiso/.test(e.message), 'Arte no puede editar el storyboard'); }
  // Ataque: Arte fabrica una versión del storyboard firmada con su llave → los demás la rechazan
  const SB = B.S.get('p1');
  await B.writeSection(SB, 'storyboard', '{"hack":1}');
  evA.length = 0; await sleep(2600);
  ok(evA.some(e => e[0] === 'team-warn' && /sin permiso/.test(e[2])) && !evA.some(e => e[0] === 'team-update' && e[2].sec === 'storyboard'), 'una versión falsificada del storyboard es rechazada');
  // Contabilidad: lee presupuesto (+ plan por dependencia), no storyboard
  const C = new Team({ ext: 'filmass', appLabel: 'x', send: () => { } });
  const sc = await C.login('p1', file, cont.id, r.passwords[cont.id]);
  ok(sc.sections.presupuesto && sc.sections.plan && sc.sections.storyboard === null, 'Contabilidad lee presupuesto y plan, no storyboard');
  C.close('p1');
  // Quitar a Contabilidad → se cambian las cerraduras de lo que podía leer
  const before = JSON.parse(fs.readFileSync(file, 'utf8')).gens;
  const r2 = await A.updateTeam('p1', [{ id: cont.id, remove: true }]);
  const after = JSON.parse(fs.readFileSync(file, 'utf8')).gens;
  ok(after.presupuesto === before.presupuesto + 1 && after.plan === before.plan + 1 && after.storyboard === before.storyboard, 'cerraduras cambiadas: ' + r2.rekeyed.join(', '));
  try { await C.login('p1', file, cont.id, r.passwords[cont.id]); ok(false, 'removed'); } catch (e) { ok(true, 'Contabilidad ya no puede entrar'); }
  // Arte sigue leyendo el desglose tras el cambio (se recarga sola)
  evB.length = 0; await sleep(4500);
  ok(B.S.get('p1') && B.S.get('p1').keys.desglose, 'Arte sigue con acceso tras el cambio de equipo');
  // Arte pierde storyboard → recarga sin storyboard
  evB.length = 0;
  await A.updateTeam('p1', [{ id: arte.id, perms: { desglose: 'editar' } }]);
  await sleep(4500);
  const rl = evB.find(e => e[0] === 'team-reload');
  ok(rl && rl[2].sections.storyboard === null && rl[2].perms.desglose === 'editar', 'Arte pierde el storyboard y la app recarga sus permisos');
  // imágenes re-cifradas siguen legibles para el productor
  const fr = await A.loadFrames('p1');
  ok(fr.s1 === 'data:image/png;base64,AAA', 'las imágenes siguen legibles para el productor tras cambiar cerraduras');
  // restablecer contraseña de Arte
  const r3 = await A.updateTeam('p1', [{ id: arte.id, reset: true }]);
  await sleep(2600);
  ok(evB.some(e => e[0] === 'team-revoked'), 'al restablecer la contraseña, la sesión vieja de Arte se cierra');
  const D = new Team({ ext: 'filmass', appLabel: 'x', send: () => { } });
  const sd = await D.login('p1', file, arte.id, r3.passwords[arte.id]);
  ok(sd.sections.desglose.json === '{"e":2}', 'Arte entra con su contraseña nueva');
  D.close('p1');
  // cambio de contraseña propio y código de recuperación del productor
  await A.changePassword('p1', 'nueva-del-productor');
  const E = new Team({ ext: 'filmass', appLabel: 'x', send: () => { } });
  ok(!!(await E.login('p1', file, owner, 'nueva-del-productor')), 'el productor cambia su contraseña');
  E.close('p1');
  ok(!!(await E.login('p1', file, owner, recovery.toLowerCase(), true)), 'el código de recuperación funciona');
  // manipular permisos en el manifiesto sin firma → rechazado
  const m = JSON.parse(fs.readFileSync(file, 'utf8')); m.members.find(x => x.id === arte.id).perms.presupuesto = 'editar';
  fs.writeFileSync(file, JSON.stringify(m));
  try { await new Team({ ext: 'filmass', appLabel: 'x' }).login('p1', file, arte.id, r3.passwords[arte.id]); ok(false, 'manifest'); } catch (e) { ok(/firma/.test(e.message), 'un manifiesto alterado a mano se rechaza'); }
  for (const t of [A, B, E]) for (const pid of t.S.keys()) t.close(pid);
})().catch(e => { console.error(e); process.exit(1); });
