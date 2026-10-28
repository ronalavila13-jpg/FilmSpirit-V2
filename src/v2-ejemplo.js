/* ============================================================
   VERSIÓN 2 · EL PROYECTO DE EJEMPLO, como en el PDF «FilmSpirit · versión 2»
   Solo cambia el ejemplo «La última función» (sample.js · buildSample), nunca un proyecto de alguien: el nombre sin
   «(ejemplo)», el rodaje el sábado que viene y el domingo (jornada 1: escenas 1 y 2; jornada 2: de la 3 a la 7, con sus
   tiempos), la dirección y la producción, el equipo y el reparto con sus actores, la jornada 1 con sus horas y su nota,
   y la primera toma del plano 1.3 con su duración. En inglés, el ejemplo de siempre.
   ============================================================ */
if (typeof SAMPLE_TX !== 'undefined' && SAMPLE_TX.es) SAMPLE_TX.es.title = 'La última función';
{
  const _bs = buildSample;
  buildSample = function () {
    const Pn = _bs.apply(this, arguments);
    try { if (V2.on && !EN) v2SampleLikePDF(Pn); } catch (e) { console.warn('ejemplo v2:', e); }
    return Pn;
  };
}
function v2SampleLikePDF(Pn) {
  const sc = computeScenes(Pn.paras);
  const cast = n => (Object.values(Pn.elements).find(e => e.cat === 'cast' && e.name === n) || {}).id;
  const ANA = cast('ANA'), TITO = cast('TITO'), ALF = cast('DON ALFREDO');
  Pn.meta.directors = [{ name: 'Lucía Paredes', role: '' }];
  Pn.meta.producers = [{ name: 'Ronald Ávila', role: '' }];
  // el rodaje: el sábado que viene y el domingo
  const t = new Date(); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() + ((6 - t.getDay() + 7) % 7 || 7));
  const S = Pn.schedule;
  S.start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  S.off = [];
  S.call = '07:00';
  const brk = S.items.filter(x => x.d);
  if (brk.length >= 2 && sc.scenes.length >= 7) {
    const row = (k, dur) => ({ k, dur });
    S.items = [row('1', 90), row('2', 120), brk[0], row('3', 120), row('4', 45), row('5', 60), row('6', 120), row('7', 45), brk[1], ...brk.slice(2)];
  }
  // el equipo (directorio del proyecto) y el reparto con sus actores
  const C = Pn.call;
  const crew = [['dir', 'Directora', 'Lucía Paredes', '9xx xxx 201', true, '06:30'], ['dir', 'Asistente de dirección', 'Andrés Cano', '', false, '06:00'],
    ['prod', 'Productor', 'Ronald Ávila', '9xx xxx 202', true, '06:00'], ['cam', 'Director de fotografía', 'Martín Quispe', '9xx xxx 203', true, '06:30'],
    ['cam', 'Asistente de cámara', 'Rocío Díaz', '', false, '06:30'], ['art', 'Directora de arte', 'Sofía Vargas', '9xx xxx 204', true, '06:00'],
    ['sound', 'Sonidista', 'Diego León', '9xx xxx 205', true, '07:00'], ['dir', 'Script', 'Paula Rivas', '9xx xxx 206', true, '06:45']];
  C.crew = crew.map(([dept, role, name, phone, head]) => ({ id: uid('c'), dept, role, name, phone, email: '', head }));
  C.talent = {};
  const tal = [[ANA, 'Mariana Soto', '9xx xxx 101', '06:30', '06:45', '07:30'], [TITO, 'Joaquín Ríos', '9xx xxx 102', '06:45', '07:00', '07:30'], [ALF, 'Alberto Vela', '9xx xxx 103', '08:30', '08:45', '09:30']];
  for (const [id, actor, phone] of tal) if (id) C.talent[id] = { actor, phone };
  // la jornada 1: sus horas, la utilería especial y la nota para el equipo
  const d1 = scheduleDays(Pn, sc).days[0];
  if (d1) {
    const dd = C.days[d1.id] = C.days[d1.id] || {};
    Object.assign(dd, { cierre: '18:00', end: '19:00', lunch: '13:00', notes: 'Calle con tránsito de combis: coordinar cortes cortos con producción.',
      props: 'Escalera, letras de la marquesina, bolsa de pan, proyector de 35 mm, sábana, latas de película' });
    dd.crew = Object.fromEntries(C.crew.map((c, i) => [c.id, crew[i][5]]));
    dd.cast = Object.fromEntries(tal.filter(x => x[0]).map(([id, , , call, mq, ready]) => [id, { call, mq, ready }]));
  }
  // las sinopsis más cortas del PDF (escenas 2, 3 y 4)
  const syn = { 1: 'Ana encuentra doce rollos y la lámpara del proyector quemada.', 2: 'Ana regatea una lámpara de repuesto con lo poco que tiene.', 3: 'Tito duda de que alguien vaya a venir. Ana no.' };
  for (const [i, t] of Object.entries(syn)) { const s = sc.scenes[+i]; if (s) Pn.scenes[s.key] = { ...(Pn.scenes[s.key] || {}), synopsis: t }; }
  // la hoja de script: quien la lleva y la primera toma del plano 1.3, con su duración
  Pn.sup.supervisor = 'Paula Rivas';
  for (const L of Object.values(Pn.sup.takes)) for (const tk of L) if (tk.t === '08:40' && !tk.d) tk.d = '0:12';
}
