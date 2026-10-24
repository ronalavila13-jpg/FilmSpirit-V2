/* ============================================================
   LUZ FÍSICA · prototipo
   Equipos con su rendimiento de catálogo y caída con la distancia,
   exposición de cámara (ISO, obturador, diafragma, ND), fotómetro
   de luz incidente sobre las figuras, color falso, modificadores,
   rebotes y banderas, y la lista de equipos (vatios, amperios,
   generador) que va al presupuesto.
   Los valores fotométricos son aproximados (del orden de los de
   catálogo): antes de alquilar, confírmalos con la ficha del equipo.
   ============================================================ */
const LUX_C = 250;      // calibración de un fotómetro de luz incidente
const LUX_V = 220;      // tensión de la red en el Perú
/* lux3: lux a 3 m al 100 % con el haz de referencia (ref, grados); beam: haz mínimo y máximo (si cambia,
   la misma luz se concentra o se abre); k: temperatura mínima y máxima; w: consumo (W); pf: factor de
   potencia (las HMI con balastro piden algo más de corriente) */
const S3_FIXTURES = {
  t650: { name: 'Fresnel 650 W', fam: 'Tungsteno', type: 'fresnel', w: 650, lux3: 900, ref: 30, beam: [12, 60], k: [3200, 3200] },
  t1k: { name: 'Fresnel 1 K', fam: 'Tungsteno', type: 'fresnel', w: 1000, lux3: 1500, ref: 30, beam: [12, 60], k: [3200, 3200] },
  t2k: { name: 'Fresnel 2 K', fam: 'Tungsteno', type: 'fresnel', w: 2000, lux3: 3100, ref: 30, beam: [12, 60], k: [3200, 3200] },
  h12: { name: 'HMI 1.2 K', fam: 'HMI', type: 'fresnel', w: 1200, pf: .9, lux3: 6500, ref: 30, beam: [10, 55], k: [5600, 5600] },
  h18: { name: 'HMI 1.8 K', fam: 'HMI', type: 'fresnel', w: 1800, pf: .9, lux3: 9500, ref: 30, beam: [10, 55], k: [5600, 5600] },
  h4k: { name: 'HMI 4 K', fam: 'HMI', type: 'fresnel', w: 4000, pf: .9, lux3: 21000, ref: 30, beam: [10, 55], k: [5600, 5600] },
  c300: { name: 'LED COB 300 W', fam: 'LED', type: 'fresnel', w: 350, lux3: 3400, ref: 45, beam: [15, 60], k: [2700, 6500] },
  c600: { name: 'LED COB 600 W', fam: 'LED', type: 'fresnel', w: 720, lux3: 6800, ref: 45, beam: [15, 60], k: [2700, 6500] },
  p1x1: { name: 'Panel LED 1×1', fam: 'LED', type: 'panel', w: 100, lux3: 420, ref: 100, k: [2700, 6500], soft: 2 },
  p60: { name: 'Panel LED grande (450 W)', fam: 'LED', type: 'panel', w: 450, lux3: 1100, ref: 110, k: [2800, 10000], soft: 2 },
  tubo: { name: 'Tubo LED 1.2 m', fam: 'LED', type: 'panel', w: 72, lux3: 140, ref: 160, k: [2000, 10000], soft: 1 },
  kino: { name: 'Banco fluorescente 4 tubos', fam: 'Fluorescente', type: 'panel', w: 220, lux3: 330, ref: 110, k: [3200, 5600], soft: 2 },
  prac: { name: 'Práctica (bombilla 60 W)', fam: 'Práctica', type: 'practica', w: 60, lux3: 7, k: [2700, 2700] },
  sol: { name: 'Sol directo', fam: 'Natural', type: 'sol', w: 0, lux: 100000, k: [5600, 5600] },
  rebB: { name: 'Rebote blanco 1.2 m', fam: 'Grip', type: 'rebote', w: 0, size: [1.2, 1.2], rho: .8 },
  rebP: { name: 'Rebote plata 1.2 m', fam: 'Grip', type: 'rebote', w: 0, size: [1.2, 1.2], rho: 1.4 },
  rebS: { name: 'Rebote blanco 0.6 × 0.9 m', fam: 'Grip', type: 'rebote', w: 0, size: [.6, .9], rho: .8 },
  band: { name: 'Bandera negra 0.6 × 0.9 m', fam: 'Grip', type: 'bandera', w: 0, size: [.6, .9] },
  bandG: { name: 'Bandera negra 1.2 m', fam: 'Grip', type: 'bandera', w: 0, size: [1.2, 1.2] },
};
const FX_DEFAULT = { fresnel: 't1k', panel: 'p1x1', practica: 'prac', sol: 'sol', rebote: 'rebB', bandera: 'band' };
const fxKey = ob => S3_FIXTURES[ob.fx] && S3_FIXTURES[ob.fx].type === ob.type ? ob.fx : FX_DEFAULT[ob.type] || 't1k';
const fxOf = ob => S3_FIXTURES[fxKey(ob)];
/* modificadores: pérdida (pasos), haz al que abren la luz, tope del haz (rejilla), suavidad de la sombra (0 dura … 4 muy suave) */
const S3_MODS = {
  no: { name: 'Sin modificador', loss: 0, soft: 0 },
  rejilla: { name: 'Rejilla (panal) 40°', loss: .7, soft: 0, beamMax: 40 },
  softbox: { name: 'Softbox 60 × 90', loss: 1.3, soft: 2, beam: 90 },
  octa: { name: 'Octabox 120', loss: 1.6, soft: 3, beam: 100 },
  paraguas: { name: 'Paraguas de rebote', loss: 1.8, soft: 3, beam: 130 },
  dif12: { name: 'Marco 1.2 m con difusión', loss: 1.5, soft: 3, beam: 110 },
  dif18: { name: 'Marco 1.8 m con seda', loss: 1, soft: 4, beam: 120 },
};
const luzMod = ob => (ob.type === 'fresnel' || ob.type === 'panel') && S3_MODS[ob.mod] || S3_MODS.no;
const luzEmits = ob => ob.type !== 'bandera';
const isBoard = ob => ob.type === 'rebote' || ob.type === 'bandera';
/* apertura real del haz (grados) */
function luzBeam(ob, p) {
  const F = fxOf(ob), M = luzMod(ob);
  if (ob.type === 'rebote') return 150;
  let a = F.beam ? clamp(p.ang || F.ref, F.beam[0], F.beam[1]) : F.ref || 180;
  if (M.beam) a = Math.max(a, M.beam);
  if (M.beamMax) a = Math.min(a, M.beamMax);
  return a;
}
const luzPen = ob => ob.type === 'panel' || ob.type === 'rebote' ? 1 : Math.min(1, .35 + .16 * luzMod(ob).soft);
const luzSoft = ob => ob.type === 'rebote' ? 3 : Math.max(luzMod(ob).soft, fxOf(ob).soft || 0);
/* intensidad en el eje (candelas): rendimiento a 3 m × 3², con el dímer y lo que se pierde en el modificador */
function luzCd(ob, p) {
  const F = fxOf(ob), M = luzMod(ob), dim = clamp((p.int ?? 60) / 100, 0, 1);
  if (!F.lux3) return 0;
  let lux3 = F.lux3;
  if (F.beam && F.beam[0] !== F.beam[1]) { const a = clamp(p.ang || F.ref, F.beam[0], F.beam[1]); lux3 *= Math.pow(Math.tan(rad(F.ref / 2)) / Math.tan(rad(a / 2)), 2); }
  return lux3 * 9 * dim * Math.pow(2, -M.loss);
}
/* ---- geometría: posición, hacia dónde apunta, dirección del sol ---- */
const v3sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const v3dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const v3len = a => Math.hypot(a[0], a[1], a[2]);
const v3norm = a => { const l = v3len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const v3cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function luzAim(s3, st, ob, p) {
  // la luz se para sobre el suelo que tiene debajo (una vereda sube el trípode)
  const h = (p.h ?? 2) + liftOf(s3, p, false), aimO = ob.aim && st.o[ob.aim];
  let t;
  if (aimO) t = [aimO.x, eyeOf(s3, ob.aim, aimO.pose) - .2 + liftOf(s3, aimO), aimO.z];
  else { const r = rad(p.rot || 0), tl = rad(p.tilt || 0); t = [p.x + Math.sin(r) * Math.cos(tl) * 4, h - Math.sin(tl) * 4, p.z + Math.cos(r) * Math.cos(tl) * 4]; }
  return { pos: [p.x, h, p.z], t };
}
const sunDir = p => { const r = rad(p.rot || 0), el = rad(clamp(p.tilt || 40, 3, 89)); return [-Math.sin(r) * Math.cos(el), Math.sin(el), -Math.cos(r) * Math.cos(el)]; };
/* rebotes y banderas: un rectángulo que mira hacia donde apunta */
function luzBoard(s3, st, ob, p) {
  const A = luzAim(s3, st, ob, p), n = v3norm(v3sub(A.t, A.pos)), F = fxOf(ob);
  let r = v3cross([0, 1, 0], n); if (v3len(r) < 1e-4) r = [1, 0, 0]; r = v3norm(r);
  return { id: ob.id, c: A.pos, n, r, u: v3cross(n, r), w: F.size[0], h: F.size[1], t: A.t };
}
/* ¿el tramo a→b atraviesa algún tablero (bandera o rebote)? */
function luzBlocked(boards, a, b, skip) {
  const d = v3sub(b, a);
  for (const B of boards) {
    if (B.id === skip) continue;
    const den = v3dot(d, B.n); if (Math.abs(den) < 1e-6) continue;
    const s = v3dot(v3sub(B.c, a), B.n) / den; if (s <= .002 || s >= .998) continue;
    const q = v3sub([a[0] + d[0] * s, a[1] + d[1] * s, a[2] + d[2] * s], B.c);
    if (Math.abs(v3dot(q, B.r)) <= B.w / 2 && Math.abs(v3dot(q, B.u)) <= B.h / 2) return true;
  }
  return false;
}
const luzSmooth = (a, b, x) => { if (b === a) return x >= a ? 1 : 0; const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/* lo que aporta cada fuente a un punto: E (lux) sobre una superficie con normal n (resp: respuesta del sensor) */
function luzSources(s3, st, S) {
  const out = [];
  for (const ob of s3.objs) {
    if (ob.kind !== 'luz' || !luzEmits(ob)) continue;
    const p = st.o[ob.id]; if (!p) continue;
    const F = fxOf(ob), dim = clamp((p.int ?? 60) / 100, 0, 1);
    if (ob.type === 'sol') { if (dim > 0) out.push({ ob, sun: true, dir: sunDir(p), E: F.lux * dim, k: p.k || 5600 }); continue; }
    const A = luzAim(s3, st, ob, p);
    let I, k = p.k || 3200, pos = A.pos;
    const axis = v3norm(v3sub(A.t, A.pos));
    if (ob.type === 'rebote') { const b = S && S.bounce[ob.id]; I = b ? b.I : 0; k = b ? b.k : 5600; pos = [pos[0] + axis[0] * .06, pos[1] + axis[1] * .06, pos[2] + axis[2] * .06]; }
    else I = luzCd(ob, p);
    if (I <= 0) continue;
    const half = rad(luzBeam(ob, p) / 2), pen = luzPen(ob);
    out.push({ ob, pos, axis, I, k, omni: ob.type === 'practica', cA: Math.cos(half), cB: Math.cos(half * (1 - pen)) });
  }
  // luz natural de la atmósfera (sol o luna) en exteriores
  const N = envNatural(s3);
  if (N && N.sun && N.sun.lux > 0) out.push({ ob: { id: '__sol', type: 'sol', name: 'Sol' }, sun: true, dir: N.sun.dir, E: N.sun.lux, k: N.sun.k });
  out.push(...envLampSources(s3, st));   // alumbrado público encendido
  return out;
}
function luzAt(src, boards, P, resp) {
  if (src.sun) return luzBlocked(boards, P, [P[0] + src.dir[0] * 60, P[1] + src.dir[1] * 60, P[2] + src.dir[2] * 60]) ? 0 : src.E * resp(src.dir);
  const v = v3sub(P, src.pos), d = Math.max(.15, v3len(v)), dir = [v[0] / d, v[1] / d, v[2] / d];
  const cone = src.omni ? 1 : luzSmooth(src.cA, src.cB, v3dot(src.axis, dir));
  if (cone <= 0) return 0;
  if (luzBlocked(boards, src.pos, P, src.ob.id)) return 0;
  return src.I * cone / (d * d) * resp([-dir[0], -dir[1], -dir[2]]);
}
/* rebotes: lo que reciben de las luces (no de otros rebotes) y lo que devuelven, como una fuente difusa */
function luzBounce(s3, st, boards) {
  const res = {}, srcs = luzSources(s3, st, null).filter(s => s.ob.type !== 'rebote');
  for (const ob of s3.objs) {
    if (ob.kind !== 'luz' || ob.type !== 'rebote') continue;
    const p = st.o[ob.id]; if (!p) continue;
    const B = boards.find(b => b.id === ob.id); if (!B) continue;
    let E = 0, kw = 0;
    for (const s of srcs) {
      const e = luzAt(s, boards.filter(b => b.id !== ob.id), B.c, d => Math.max(0, v3dot(B.n, d)));
      E += e; kw += e * s.k;
    }
    const F = fxOf(ob);
    res[ob.id] = { E, I: F.rho * E * B.w * B.h / Math.PI, k: E > 0 ? kw / E : 5600 };
  }
  return res;
}
/* ---- exposición ---- */
const LUX_ISO = [100, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1280, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 12800];
const LUX_SH = [24, 25, 30, 48, 50, 60, 96, 100, 120, 250, 500, 1000];
const LUX_F = [1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22];
const LUX_ND = [0, .3, .6, .9, 1.2, 1.5, 1.8, 2.1];
const luzExp = s3 => ({ iso: 800, sh: 48, f: 2.8, nd: 0, auto: true, ...((s3.light || {}).exp || {}) });
/* lux de luz incidente que dan el gris medio con esta exposición */
const luzMid = X => LUX_C * X.f * X.f * X.sh / X.iso * Math.pow(10, X.nd);
/* diafragma que expone bien E lux */
const luzFfor = (E, X) => Math.sqrt(Math.max(E, 1e-4) * X.iso / (LUX_C * X.sh * Math.pow(10, X.nd)));
const fRound = f => LUX_F.reduce((a, b) => Math.abs(Math.log2(b / f)) < Math.abs(Math.log2(a / f)) ? b : a);
const fTxt = f => 'f/' + (f >= 10 ? Math.round(f) : (Math.round(f * 10) / 10).toString());
/* luz ambiente: la barra de 0 a 1 va de 0 a 20 000 lux (curva cúbica: fina abajo, para interiores) */
const luzAmb = L => 20000 * Math.pow(clamp(L.amb ?? .22, 0, 1), 3);
/* diferencia en pasos, en tercios: +1⅓, −⅔ … */
function stopTxt(d) {
  const t = Math.round(d * 3), s = t < 0 ? '−' : '+', a = Math.abs(t), w = Math.floor(a / 3), r = a % 3;
  if (!a) return '±0';
  return s + (w || !r ? w : '') + (r === 1 ? '⅓' : r === 2 ? '⅔' : '');
}
/* todo lo que la luz física necesita en un instante del plano (una vez por cuadro) */
function luzSolve(s3, st) {
  const L = s3.light || {}, X = luzExp(s3), N = envNatural(s3), amb = luzAmb(L) + (N ? N.sky : 0);
  const boards = s3.objs.filter(o => o.kind === 'luz' && isBoard(o) && st.o[o.id]).map(o => luzBoard(s3, st, o, st.o[o.id]));
  const bounce = luzBounce(s3, st, boards);
  const srcs = luzSources(s3, st, { bounce });
  const cam = st.cam, read = {};
  const actors = s3.objs.filter(o => o.kind === 'actor' && st.o[o.id]);
  for (const a of actors) {
    const p = st.o[a.id], P = [p.x, eyeOf(s3, a.id, p.pose) - .06 + liftOf(s3, p), p.z];
    const n = v3norm([cam.x - P[0], cam.h - P[1], cam.z - P[2]]);
    const resp = d => Math.max(0, (1 + v3dot(n, d)) / 2);   // domo del fotómetro apuntando a la cámara
    const parts = srcs.map(s => ({ id: s.ob.id, E: luzAt(s, boards, P, resp) })).filter(q => q.E > .05);
    read[a.id] = { E: parts.reduce((t, q) => t + q.E, 0) + amb * .7, parts };
  }
  // automático: el diafragma expone bien a la figura que sigue la cámara (o a la primera)
  const ref = s3.aim && read[s3.aim] ? s3.aim : actors[0] && actors[0].id;
  if (X.auto && ref && read[ref].E > .3) {
    // a pleno sol no alcanza el diafragma: entra el ND necesario (de a un paso) y el diafragma vuelve a f/11 o menos
    X.nd = 0; let f = luzFfor(read[ref].E, X);
    if (f > 11) { X.nd = Math.min(2.1, Math.ceil(2 * Math.log2(f / 11) - .01) * .3); X.nd = Math.round(X.nd * 10) / 10; f = luzFfor(read[ref].E, X); }
    // con poca luz (noche) el diafragma se abre hasta f/1.4 y después sube el ISO, hasta 6400
    while (f < 1.4 && X.iso < 6400) { X.iso = LUX_ISO[LUX_ISO.indexOf(X.iso) + 1] || 6400; f = luzFfor(read[ref].E, X); }
    X.f = clamp(fRound(f), 1, 22);
  }
  const mid = luzMid(X);
  for (const id in read) { const r = read[id]; r.f = luzFfor(r.E, X); r.d = Math.log2(Math.max(r.E, .01) / mid); }
  return { X, mid, gain: Math.PI / mid, amb, bounce, read, ref };
}
/* ---- color falso: zonas de exposición sobre la imagen (salida sRGB, sin curva) ---- */
const LUX_FC = [
  [0, 3, [110, 44, 160], 'Negro sin detalle'], [3, 7, [40, 100, 220], 'Sombra profunda'],
  [43, 49, [64, 178, 72], 'Gris medio (18 %)'], [60, 66, [236, 120, 170], 'Piel clara (+1)'],
  [94, 98.5, [240, 210, 40], 'Casi blanco'], [98.5, 101, [226, 52, 40], 'Quemado'],
];
function luzFalseColor(ctx, W, H) {
  let img; try { img = ctx.getImageData(0, 0, W, H); } catch (e) { return; }
  const d = img.data, lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const pc = i / 255 * 100, z = LUX_FC.find(([a, b]) => pc >= a && pc < b);
    const c = z ? z[2] : [i * .8 + 10, i * .8 + 10, i * .8 + 10];
    lut[i * 3] = c[0]; lut[i * 3 + 1] = c[1]; lut[i * 3 + 2] = c[2];
  }
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.round(d[i] * .2126 + d[i + 1] * .7152 + d[i + 2] * .0722) * 3;
    d[i] = lut[y]; d[i + 1] = lut[y + 1]; d[i + 2] = lut[y + 2];
  }
  ctx.putImageData(img, 0, 0);
}
/* ---- lista de equipos ---- */
const luzAmps = (w, pf) => w / LUX_V / (pf || 1);
const GEN_KVA = [3.5, 5, 6.5, 10, 15, 20, 30, 45, 60, 100];
function luzGen(peakW) {
  const need = peakW * 1.25 / 1000;
  if (need <= 3.5) return { kva: 0, txt: 'Basta la corriente del lugar (hasta 3.5 kW en un circuito de 16 A)' };
  const k = GEN_KVA.find(g => g >= need) || Math.ceil(need);
  return { kva: k, txt: `Generador de ${k} kVA (pico ${(peakW / 1000).toFixed(1)} kW + 25 % de margen)` };
}
/* equipos de una escena 3D: { clave: cantidad } */
function luzCount(s3) {
  const n = {};
  for (const ob of (s3 && s3.objs) || []) if (ob.kind === 'luz' && ob.type !== 'sol') { const k = fxKey(ob); n[k] = (n[k] || 0) + 1; }
  return n;
}
const luzWatts = n => Math.round(Object.entries(n).reduce((t, [k, q]) => { const F = S3_FIXTURES[k]; return t + (F ? F.w / (F.pf || 1) * q : 0); }, 0));
/* todo el proyecto: por equipo, cuántos hacen falta a la vez (el máximo en un plano) y en cuántos planos */
function luzProjectList(P, cur) {
  const items = {}; let peak = 0, shots = 0;
  for (const sh of Object.values(P.shots || {})) {
    const s3 = cur && cur.id === sh.id ? cur.s3 : sh.s3;   // el plano abierto en el editor, con lo que aún no se guarda
    if (!s3) continue;
    const n = luzCount(s3); if (!Object.keys(n).length) continue;
    shots++;
    peak = Math.max(peak, luzWatts(n));
    for (const [k, q] of Object.entries(n)) { const it = items[k] || (items[k] = { k, q: 0, shots: 0 }); it.q = Math.max(it.q, q); it.shots++; }
  }
  return { items: Object.values(items).sort((a, b) => (S3_FIXTURES[b.k].w - S3_FIXTURES[a.k].w) || a.k.localeCompare(b.k)), peak, shots };
}
/* lleva la lista al presupuesto («Cámara, luces y grip»): una línea por equipo, con los días de rodaje
   enlazados; si ya estaba, actualiza la cantidad. Devuelve cuántas líneas cambiaron. */
function luzBudget(P, L) {
  let n = 0;
  for (const it of L.items) {
    const F = S3_FIXTURES[it.k], k = 'luz:' + it.k;
    const l = P.budget.lines.find(x => x.link === k || x.src === k);
    if (l) { if (l.qty !== it.q) { l.qty = it.q; n++; } continue; }
    P.budget.lines.push({ id: uid('b'), sec: 'camera', name: F.name, qty: it.q, unit: 'día', mult: 0, rate: 0, link: k, qlink: null, note: 'Del storyboard · tarifa de alquiler por completar' });
    n++;
  }
  if (n) { budLog(`Llevó ${n} ${n === 1 ? 'equipo' : 'equipos'} de luz desde el storyboard`); if (typeof D !== 'undefined' && D) try { syncBudget(P, D.sc, D.sem); } catch (e) { } changed('data'); }
  return n;
}
