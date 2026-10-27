/* ============================================================
   PELO ESTILO ANIME · peinados 3D de los maniquíes
   Un casquete que sigue la forma del cráneo y, encima, mechones afilados (flequillo en puntas, capas,
   volumen) con el contorno negro de la figura: el aspecto de un dibujo animado.
   Se arman en el navegador para cada cuerpo (hombre, mujer, niños, mayores) y se guardan en memoria:
   no pesan en la descarga. Coordenadas: las de la figura en reposo (metros; +x es la izquierda del
   personaje, +z hacia adelante); la malla lleva piel (cabeza, cuello y espalda) como el resto del cuerpo.
   ============================================================ */
const PELO_COLORES = [['', 'Tono del maniquí'], ['#2A2523', 'Negro'], ['#4A3226', 'Castaño oscuro'], ['#7A5236', 'Castaño'], ['#B98B57', 'Castaño claro'], ['#DDBB7A', 'Rubio'], ['#A9502E', 'Pelirrojo'], ['#D9D5CE', 'Canoso'], ['#33405F', 'Azul noche']];
const PELO_GEO = new WeakMap();   // plantilla del cuerpo → Map(peinado → geometría)
/* tarjetas de cabello: láminas con textura de hebras (transparente entre hebras), como en los juegos y cinemáticas */
let PELO_CARDS = true, PELO_MASS = false;
/* dos maneras de dibujar el pelo (Ajustes del storyboard, por proyecto): «masas» (por defecto: volúmenes limpios con
   contorno y sombreado de dibujo, como el maniquí) o «realista» (tarjetas con textura de hebras) */
function peloSync() {
  const real = typeof P !== 'undefined' && !!P && !!P.meta && P.meta.hair === 'real';
  PELO_CARDS = real; PELO_MASS = !real;
  return real ? 'real' : 'masas';
}
const PELO_COLS = 8;
let PELO_TEX = null, PELO_GEN = null, PELO_WARM = null;
/* texturas de hebras dibujadas en el momento: un atlas de 8 columnas para las tarjetas (hebras de largo
   desparejo que terminan en punta) y una textura densa que se repite para el casquete.
   Dibujarlas cuesta (~150 mil trazos): se preparan por partes en los ratos libres en cuanto carga el primer
   maniquí, y quedan guardadas en este navegador (la próxima vez solo se leen). Si se necesitan antes de estar
   listas, se termina lo que falta en ese momento. */
function peloTexJob() {
  const rnd = peloRnd(9001);
  const strands = (g, x0, w, h, o, i0 = 0, i1 = o.n) => {
    for (let i = i0; i < i1; i++) {
      const fx = o.edge + (1 - 2 * o.edge) * rnd(), x = x0 + w * fx, side = Math.abs(fx - .5) * 2;
      // hebras más largas al centro de la tarjeta y más cortas a los lados: el mechón termina en punta
      const len = h * (o.l0 + (o.l1 - o.l0) * Math.pow(rnd(), o.lp || 1)) * (o.wrap ? 1 : 1 - .25 * Math.pow(side, 1.4));
      const amp = (o.wave || 1.5) * (rnd() - .5) * 2, ph = rnd() * 6.28, fr = .6 + rnd() * 1.4, lean = (rnd() - .5) * (o.lean || 3);
      const lw = o.lw0 + (o.lw1 - o.lw0) * rnd(), br = o.b0 + (o.b1 - o.b0) * rnd(), segs = 28;
      const draw = dx => {
        let px = x + dx, py = 0;
        for (let k = 1; k <= segs; k++) {
          const t = k / segs, y = len * t, xx = x + dx + amp * Math.sin(ph + t * fr * 3.1) * t + lean * t * t;
          const a = (o.a || 1) * (t < .9 ? 1 : 1 - (t - .9) / .1) * Math.min(1, t * 12 + .25);   // cada hebra llega entera a su largo y ahí termina (con el recorte quedan puntas sueltas, no un corte parejo)
          const c = Math.round(255 * Math.min(1, br * (.62 + .38 * Math.min(1, t * 2.2))));          // la raíz más oscura (sombra entre hebras)
          g.strokeStyle = `rgba(${c},${c},${c},${a.toFixed(3)})`; g.lineWidth = Math.max(.45, lw * (1 - .65 * t * t));
          g.beginPath(); g.moveTo(px, py); g.lineTo(xx, y); g.stroke(); px = xx; py = y;
        }
      };
      draw(0); if (o.wrap) { draw(-w); draw(w); }
    }
  };
  const steps = [];
  // atlas de las tarjetas
  const A = document.createElement('canvas'); A.width = 1024; A.height = 1024;
  const ga = A.getContext('2d'); ga.lineCap = 'round';
  const W = A.width / PELO_COLS, Hh = A.height;
  for (let c = 0; c < PELO_COLS; c++) {
    const wisp = c >= 6;
    const o = wisp ? { n: 140, edge: .1, l0: .55, l1: 1, lw0: .6, lw1: 1.3, b0: .7, b1: 1, a: .9, wave: 3, lean: 6 } : { n: 760, edge: .05, l0: c < 3 ? .4 : .25, l1: 1, lp: .6, lw0: .6, lw1: 1.7, b0: .38, b1: 1.08, wave: 1.8, lean: 3.5 };
    // un velo tenue debajo de las hebras: la tarjeta se lee como una masa de pelo, no como líneas sueltas
    if (!wisp) steps.push(() => {
      // velo en forma de punta (ancho arriba, se cierra hacia abajo)
      const x0 = c * W + W * .1, x1 = c * W + W * .9, xc = c * W + W * .5, yb = Hh * (c < 3 ? .74 : .62);
      // la raíz entra de a poco (sin el borde recto que se veía donde un mechón asoma debajo de otro)
      const gr = ga.createLinearGradient(0, 0, 0, yb); gr.addColorStop(0, 'rgba(120,120,120,0)'); gr.addColorStop(.07, 'rgba(120,120,120,.95)'); gr.addColorStop(1, 'rgba(150,150,150,.9)');
      ga.fillStyle = gr; ga.beginPath(); ga.moveTo(x0, 0); ga.lineTo(x1, 0); ga.quadraticCurveTo(x1, yb * .55, xc, yb); ga.quadraticCurveTo(x0, yb * .55, x0, 0); ga.fill();
    });
    // de a 140 hebras (las partes van en orden: el resultado es el mismo que de una vez)
    for (let i = 0; i < o.n; i += 140) steps.push(() => strands(ga, c * W, W, Hh, o, i, Math.min(o.n, i + 140)));
  }
  // casquete (se repite alrededor de la cabeza)
  const C = document.createElement('canvas'); C.width = 256; C.height = 512;
  const gc = C.getContext('2d'); gc.lineCap = 'round';
  const oc = { n: 900, edge: 0, l0: .8, l1: 1, lw0: .8, lw1: 1.8, b0: .55, b1: 1, wave: 1.2, lean: 2, fade: 3, wrap: true };
  steps.push(() => {
    const gr = gc.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, 'rgba(135,135,135,1)'); gr.addColorStop(.78, 'rgba(150,150,150,1)'); gr.addColorStop(.92, 'rgba(150,150,150,.45)'); gr.addColorStop(1, 'rgba(150,150,150,0)');
    gc.fillStyle = gr; gc.fillRect(0, 0, 256, 512);
  });
  for (let i = 0; i < oc.n; i += 100) steps.push(() => strands(gc, 0, 256, 512, oc, i, Math.min(oc.n, i + 100)));
  return { A, C, steps, i: 0 };
}
/* avanza el dibujo hasta `ms` milisegundos; true si terminó */
function peloTexStep(job, ms) {
  const t0 = performance.now();
  while (job.i < job.steps.length && performance.now() - t0 < ms) job.steps[job.i++]();
  return job.i >= job.steps.length;
}
function peloTexFrom(A, C) {
  const T = THREE;
  const mk = (cv, rep) => { const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = R3 && R3.r ? Math.min(8, R3.r.capabilities.getMaxAnisotropy()) : 4; if (rep) { t.wrapS = T.RepeatWrapping; } t.needsUpdate = true; return t; };
  PELO_TEX = { cards: mk(A), cap: mk(C, true) };
  const L = PELO_TEX_WAIT.splice(0); for (const r of L) r();
  return PELO_TEX;
}
const PELO_TEX_WAIT = [];
const peloTexId = () => 'pelo-tex.' + hash53(peloTexJob.toString() + PELO_COLS);
function peloTextures() {
  if (PELO_TEX) return PELO_TEX;
  const job = PELO_GEN || (PELO_GEN = peloTexJob());
  peloTexStep(job, Infinity);   // hace falta ya: se termina lo que falta
  peloTexFrom(job.A, job.C);
  peloTexSave(job);
  return PELO_TEX;
}
/* guardado en el navegador (las dos imágenes en PNG) */
function peloTexSave(job) {
  if (typeof TCACHE === 'undefined' || !job.A.toBlob) return;
  job.A.toBlob(a => job.C.toBlob(c => { if (a && c) TCACHE.put(peloTexId(), { a, c }); }, 'image/png'), 'image/png');
}
async function peloTexLoad() {
  if (typeof TCACHE === 'undefined' || typeof createImageBitmap !== 'function') return false;
  try {
    const r = (await TCACHE.get([peloTexId()])).get(peloTexId());
    if (!r || !r.u || !r.u.a || !r.u.c || PELO_TEX) return !!PELO_TEX;
    const [ia, ic] = await Promise.all([createImageBitmap(r.u.a), createImageBitmap(r.u.c)]);
    if (PELO_TEX) return true;
    const cv = (im, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0); return c; };
    peloTexFrom(cv(ia, 1024, 1024), cv(ic, 256, 512));
    return true;
  } catch (e) { return false; }
}
/* empieza a prepararlas en segundo plano (la primera vez que carga un maniquí) */
function peloTexWarm() {
  if (PELO_TEX || PELO_WARM || peloSync() !== 'real') return;   // en masas no hacen falta (ni se generan)
  PELO_WARM = peloTexLoad().then(ok => {
    if (ok || PELO_TEX) return;
    const job = PELO_GEN || (PELO_GEN = peloTexJob());
    const go = () => idle(1000).then(() => {
      if (PELO_TEX) return;
      // mientras se arrastra algo o el animatic reproduce, se espera
      if ((typeof UI !== 'undefined' && UI.pdown) || (typeof AN !== 'undefined' && (AN.playing || AN.recording))) { setTimeout(go, 250); return; }
      if (peloTexStep(job, 30)) { peloTexFrom(job.A, job.C); peloTexSave(job); } else go();
    });
    go();
  });
}
/* null si ya están; si no, la promesa de que estén (sin trabar la pantalla) */
function peloTexReady() {
  if (PELO_TEX || peloSync() !== 'real') return null;
  peloTexWarm();
  return new Promise(r => PELO_TEX_WAIT.push(r));
}
/* ¿alguna figura del plano lleva peinado? */
const peloInShot = sh => shot3D(sh) && s3Of(sh).objs.some(o => o.kind === 'actor' && (lookOf(o).pelo || 'ninguno') !== 'ninguno');
const PELO_HEAD = new WeakMap();  // plantilla del cuerpo → medidas de la cabeza

/* ---------- la cabeza: centro del cráneo y su radio en cada dirección ---------- */
const PELO_NA = 72, PELO_NE = 56, PELO_E0 = -80, PELO_E1 = 90;
function peloHead(tp) {
  let H = PELO_HEAD.get(tp); if (H) return H;
  const L = vestLand(tp), hd = L.head, eye = tp.meta.eye || [0, hd.y1 - .1, hd.zf];
  const ye = eye[1], top = hd.y1, hs = top - ye;                       // de los ojos a la coronilla
  const cy = ye + hs * .3;
  // fondo de la cabeza a la altura del centro
  const b = Math.round(cy * 100);
  const zb = hd.hz0[b] < 8 ? hd.hz0[b] : hd.z0, zf = hd.zf;
  const C = [0, cy, (zb + zf) / 2 - hs * .02];
  const NA = PELO_NA, NE = PELO_NE, R = new Float32Array(NA * NE), HIT = new Uint8Array(NA * NE);
  const g = tp.parts.cuerpo.geo, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const hb = tp.idx.head, nb = tp.idx.neck_01;
  for (let i = 0; i < P.count; i++) {
    let wh = 0; for (let k = 0; k < 4; k++) { const bi = SI.getComponent(i, k); if (bi === hb || bi === nb) wh += SW.getComponent(i, k); }
    if (wh < .5) continue;
    const dx = P.getX(i) - C[0], dy = P.getY(i) - C[1], dz = P.getZ(i) - C[2], r = Math.hypot(dx, dy, dz);
    if (r < 1e-4) continue;
    const a = Math.atan2(dx, dz), e = Math.asin(dy / r) * 180 / Math.PI;
    const ia = ((Math.round((a / (2 * Math.PI) + .5) * NA) % NA) + NA) % NA, ie = Math.round((e - PELO_E0) / (PELO_E1 - PELO_E0) * (NE - 1));
    if (ie < 0 || ie >= NE) continue;
    const j = ie * NA + ia; if (r > R[j]) R[j] = r; HIT[j] = 1;
  }
  // huecos (debajo de la mandíbula, la coronilla): se rellenan con los vecinos
  const nbAvg = (S, j) => { const ie = (j / NA) | 0, ia = j % NA; let s = 0, n = 0; for (const [di, da] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const e2 = ie + di; if (e2 < 0 || e2 >= NE) continue; const v = S[e2 * NA + (ia + da + NA) % NA]; if (v > 0) { s += v; n++; } } return n ? s / n : 0; };
  for (let it = 0; it < 80; it++) { const S = R.slice(); for (let j = 0; j < R.length; j++) if (!HIT[j]) R[j] = nbAvg(S, j) || S[j]; }
  const fill = R.slice();
  // el cráneo sin orejas ni nariz: mínimo y después máximo en una ventana (se van los picos angostos)
  const win = (S, ra, re, f) => { const O = new Float32Array(S.length); for (let ie = 0; ie < NE; ie++) for (let ia = 0; ia < NA; ia++) { let v = f === 'min' ? 9 : 0; for (let de = -re; de <= re; de++) { const e2 = Math.min(NE - 1, Math.max(0, ie + de)); for (let da = -ra; da <= ra; da++) { const x = S[e2 * NA + (ia + da + NA) % NA]; v = f === 'min' ? Math.min(v, x) : Math.max(v, x); } } O[ie * NA + ia] = v; } return O; };
  let K = win(win(fill, 3, 5, 'min'), 3, 5, 'max');
  const sm = S => { const O = new Float32Array(S.length); for (let ie = 0; ie < NE; ie++) for (let ia = 0; ia < NA; ia++) { let s = 0, n = 0; for (let de = -1; de <= 1; de++) { const e2 = ie + de; if (e2 < 0 || e2 >= NE) continue; for (let da = -1; da <= 1; da++) { s += S[e2 * NA + (ia + da + NA) % NA]; n++; } } O[ie * NA + ia] = s / n; } return O; };
  K = sm(sm(K)); const Rw = sm(fill);
  for (let j = 0; j < K.length; j++) K[j] = Math.max(K[j], Math.min(Rw[j], K[j] + .004));
  // cerca de la coronilla hay pocos puntos por casilla: el radio se empareja con el promedio de su fila (sin chichones)
  for (const S of [K, Rw]) for (let ie = 0; ie < NE; ie++) {
    const e = PELO_E0 + (PELO_E1 - PELO_E0) * ie / (NE - 1); if (e < 55) continue;
    let m = 0; for (let ia = 0; ia < NA; ia++) m += S[ie * NA + ia]; m /= NA;
    const t = Math.min(1, (e - 55) / 30), w = t * t * (3 - 2 * t);
    for (let ia = 0; ia < NA; ia++) S[ie * NA + ia] = S[ie * NA + ia] * (1 - w) + m * w;
  }
  // lo que hay que esquivar (orejas, mejillas, nariz): el máximo entre el cráneo y la cabeza real
  for (let j = 0; j < Rw.length; j++) Rw[j] = Math.max(Rw[j], K[j]);
  H = { C, ye, top, hs, zf, zb, skull: K, raw: Rw, L, eye, fem: /mujer|nina|anciana/.test(tp.body || '') };
  // la oreja (lo que sobresale del cráneo a los costados): de dónde a dónde va, para que el pelo la rodee
  {
    let af = 99, ab = -99, et = -99, eb = 99;
    for (let a = 70; a <= 112; a += 2) for (let e = -54; e <= -4; e += 2) {
      const d = Math.min(peloR(H, a, e, true) - peloR(H, a, e), peloR(H, -a, e, true) - peloR(H, -a, e));
      if (d > .003) { af = Math.min(af, a); ab = Math.max(ab, a); et = Math.max(et, e); eb = Math.min(eb, e); }
    }
    H.ear = af < ab && et > eb && ab - af < 40 ? { af, ab, et, eb } : { af: 80, ab: 100, et: -22, eb: -46 };
  }
  // el torso (sin brazos ni cabeza) visto de frente: z de adelante y de atrás cada 1 cm, para que el pelo largo
  // caiga por delante del pecho o por detrás de la espalda sin atravesarlos
  const BX = 64, BY = 120, bx0 = -.32, by0 = Math.max(0, H.ye - 1.05), FZ = new Float32Array(BX * BY).fill(-9), BZ = new Float32Array(BX * BY).fill(9);
  for (let i = 0; i < P.count; i++) {
    let cls = [0, 0, 0, 0]; for (let k = 0; k < 4; k++) cls[L.cls[SI.getComponent(i, k)]] += SW.getComponent(i, k);
    if (cls[1] > .4) continue;
    const ix = Math.round((P.getX(i) - bx0) * 100), iy = Math.round((P.getY(i) - by0) * 100);
    if (ix < 0 || ix >= BX || iy < 0 || iy >= BY) continue;
    const j = iy * BX + ix, z = P.getZ(i); if (z > FZ[j]) FZ[j] = z; if (z < BZ[j]) BZ[j] = z;
  }
  // huecos: el vecino más cercano en la fila (y si no, la fila de arriba)
  for (const [Z, bad] of [[FZ, -9], [BZ, 9]]) for (let iy = 0; iy < BY; iy++) for (let ix = 0; ix < BX; ix++) {
    const j = iy * BX + ix; if (Z[j] !== bad) continue;
    for (let d = 1; d < 12; d++) { const l = ix - d >= 0 ? Z[j - d] : bad, r = ix + d < BX ? Z[j + d] : bad; if (l !== bad || r !== bad) { Z[j] = l !== bad && r !== bad ? (bad < 0 ? Math.max(l, r) : Math.min(l, r)) : l !== bad ? l : r; break; } }
  }
  H.body = { FZ, BZ, BX, BY, bx0, by0 };
  // altura de los huesos: de la cabeza para arriba, el pelo sigue a la cabeza; más abajo, al cuello y la espalda
  const BH = n => tp.bones[tp.idx[n]].h;
  H.yHead = BH('head')[1]; H.yNeck = BH('neck_01')[1]; H.ySp = BH('spine_03')[1];
  H.bi = { head: tp.idx.head, neck: tp.idx.neck_01, sp: tp.idx.spine_03 };
  PELO_HEAD.set(tp, H);
  return H;
}
const peloDeg = d => d * Math.PI / 180;
/* radio de la cabeza en la dirección (azimut a, elevación e, en grados) */
function peloR(H, a, e, raw) {
  const NA = PELO_NA, NE = PELO_NE, S = raw ? H.raw : H.skull;
  let fa = ((a / 360 + .5) * NA) % NA; if (fa < 0) fa += NA;
  const fe = Math.min(NE - 1.001, Math.max(0, (e - PELO_E0) / (PELO_E1 - PELO_E0) * (NE - 1)));
  const a0 = Math.floor(fa), e0 = Math.floor(fe), ta = fa - a0, te = fe - e0, a1 = (a0 + 1) % NA;
  const v = (ie, ia) => S[ie * NA + ia];
  return (v(e0, a0) * (1 - ta) + v(e0, a1) * ta) * (1 - te) + (v(e0 + 1, a0) * (1 - ta) + v(e0 + 1, a1) * ta) * te;
}
const peloDir = (a, e) => { const A = peloDeg(a), E = peloDeg(e); return [Math.cos(E) * Math.sin(A), Math.sin(E), Math.cos(E) * Math.cos(A)]; };
/* punto sobre la cabeza, a `lift` metros de la superficie */
function peloP(H, a, e, lift = 0, raw) { const d = peloDir(a, e), r = peloR(H, a, e, raw) + lift; return [H.C[0] + d[0] * r, H.C[1] + d[1] * r, H.C[2] + d[2] * r]; }
/* el punto de la cabeza en el azimut a que queda a la altura y */
function peloAtY(H, a, y, lift = 0, raw) {
  let lo = PELO_E0, hi = 88;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (peloP(H, a, m, lift, raw)[1] < y) lo = m; else hi = m; }
  return peloP(H, a, (lo + hi) / 2, lift, raw);
}
/* frente y espalda del torso en (x, y); fuera del cuerpo: -9 / 9 */
function peloBody(H, x, y) {
  const B = H.body, ix = Math.round((x - B.bx0) * 100), iy = Math.round((y - B.by0) * 100);
  if (ix < 0 || ix >= B.BX || iy < 0 || iy >= B.BY) return { f: -9, b: 9 };
  // el máximo en una ventana de ±2 cm: holgura para el ancho del mechón
  let f = -9, b = 9; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const jx = ix + dx, jy = iy + dy; if (jx < 0 || jx >= B.BX || jy < 0 || jy >= B.BY) continue; const j = jy * B.BX + jx; if (B.FZ[j] > f) f = B.FZ[j]; if (B.BZ[j] < b) b = B.BZ[j]; }
  return { f, b };
}
/* empuja el punto fuera de la cabeza (y el cuello) y fuera del torso, con un margen m */
function peloKeepOut(H, p, m) { for (let k = 0; k < 3; k++) peloKeepOut1(H, p, m); }   // cuello: cabeza y torso se tocan; se repite hasta quedar afuera de los dos
function peloKeepOut1(H, p, m) {
  if (p[1] < H.yNeck + .05) {
    const B = H.body, ix = Math.round((p[0] - B.bx0) * 100), iy = Math.round((p[1] - B.by0) * 100);
    if (ix >= 0 && ix < B.BX && iy >= 0 && iy < B.BY) {
      let f = -9, b = 9; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const jx = ix + dx, jy = iy + dy; if (jx < 0 || jx >= B.BX || jy < 0 || jy >= B.BY) continue; const j = jy * B.BX + jx; f = Math.max(f, B.FZ[j]); b = Math.min(b, B.BZ[j]); }
      if (f > -8 && p[2] < f + m && p[2] > b - m) p[2] = (f + m - p[2] < p[2] - (b - m)) ? f + m : b - m;
    }
  }
  if (p[1] > H.yNeck - .03) {
    const dx = p[0] - H.C[0], dy = p[1] - H.C[1], dz = p[2] - H.C[2], r = Math.hypot(dx, dy, dz);
    if (r > 1e-4) { const a = Math.atan2(dx, dz) * 180 / Math.PI, e = Math.asin(dy / r) * 180 / Math.PI, R = peloR(H, a, e, true) + m; if (r < R) { const k = R / r; p[0] = H.C[0] + dx * k; p[1] = H.C[1] + dy * k; p[2] = H.C[2] + dz * k; } }
  }
}
/* límite del volumen: de los ojos para arriba el pelo no se separa del cráneo más de ~1,4 cm a los lados y ~1,8 cm
   en la coronilla. Así la cabeza queda redonda (sin esquinas ni la parte de arriba aplanada) y el pelo enmarca la
   cara. Más abajo (mejillas, pelo que cae) no hay tope. Cola, coletas, moño y puntas paradas quedan afuera. */
function peloEnvelope(H, p) {
  const y0 = H.ye - .01; if (p[1] < y0 - .03) return p;
  const dx = p[0] - H.C[0], dy = p[1] - H.C[1], dz = p[2] - H.C[2], r = Math.hypot(dx, dy, dz); if (r < 1e-4) return p;
  const a = Math.atan2(dx, dz) * 180 / Math.PI, e = Math.asin(dy / r) * 180 / Math.PI;
  const Rs = peloR(H, a, e), L = (.014 + .004 * Math.max(0, Math.sin(e * Math.PI / 180))) * (H.hs / .11);
  if (r <= Rs) return p;
  // compresión suave (no un corte): las capas siguen una sobre otra, pero ninguna pasa del límite
  const Rc = Rs + L * Math.tanh((r - Rs) / L);
  // transición: unos centímetros bajo los ojos el tope se suelta
  const k = Math.max(0, Math.min(1, (p[1] - (y0 - .03)) / .03)), R = Rc + (r - Rc) * (1 - k);
  if (Math.abs(R - r) < 1e-6) return p;
  const f = R / r; return [H.C[0] + dx * f, H.C[1] + dy * f, H.C[2] + dz * f];
}
/* fondo de la espalda (z mínima) y ancho del cuerpo a la altura y: el pelo largo cae por detrás */
function peloBack(H, y) { const L = H.L, b = Math.max(0, Math.min(L.z0.length - 1, Math.round(y * 100))); return { z: L.z0[b] < 8 ? L.z0[b] : H.zb, zf: L.z1[b] > -8 ? L.z1[b] : H.zf, sx: L.sx[b] || .12 }; }
const peloMix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
const peloAdd = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
const peloNorm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const peloCross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const peloDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/* azar repetible (el mismo peinado sale igual cada vez) */
const peloRnd = seed => { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917), (s >>>= 0) / 4294967296)); };

/* ---------- constructor de mallas ---------- */
function peloBuilder(H) {
  const P = [], I = [], OL = [], TT = [], LK = [], UV = [], NR = [], IC = [], TN = [], VA = [];
  const cards = PELO_CARDS;   // tarjetas de cabello (láminas con textura de hebras) o mechones sólidos
  // ol: cuánto contorno lleva el vértice (1 = el de la figura; hacia la punta se apaga y la punta queda fina)
  // TT: a qué altura del mechón está cada vértice (0 raíz … 1 punta; -1 el casquete) y LK los mechones: para revisarlos
  let tNow = -1;
  // tn: dirección de la hebra (para el brillo a lo largo del pelo); va: [sombra entre capas 0..1, tono propio del mechón -1..1]
  const v = (p, ol = 1, uv = null, n = null, tn = null, va = null) => { if (tNow > .2 && !noCol) { p = p.slice(); peloKeepOut(H, p, .0015); } if (envOn && !H.big) p = peloEnvelope(H, p); P.push(p[0], p[1], p[2]); OL.push(ol); TT.push(tNow); UV.push(uv ? uv[0] : 0, uv ? uv[1] : 0); NR.push(n ? n[0] : 0, n ? n[1] : 1, n ? n[2] : 0); TN.push(tn ? tn[0] : 0, tn ? tn[1] : -1, tn ? tn[2] : 0); VA.push(va ? va[0] : 1, va ? va[1] : 0); return P.length / 3 - 1; };
  const rndT = peloRnd(1337);
  const rndC = peloRnd(4711);
  let noCol = false, envOn = true;
  /* un mechón: hoja afilada a lo largo de una curva (puntos de control), ancho w y grosor h en la raíz */
  function lock(ctrl, w, h, o = {}) {
    // curva Catmull-Rom por los puntos de control
    const pts = [], N = o.n || Math.max(PELO_MASS ? 7 : 10, Math.min(PELO_MASS ? 16 : 28, Math.round((PELO_MASS ? .8 : 1.3) * ctrl.reduce((s, p, i) => i ? s + Math.hypot(p[0] - ctrl[i - 1][0], p[1] - ctrl[i - 1][1], p[2] - ctrl[i - 1][2]) : 0, 0) / .009)));
    const c = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
    // más puntos hacia la punta (ahí la forma cambia más)
    const sOf = i => 1 - Math.pow(1 - i / N, 1.5);
    for (let i = 0; i <= N; i++) {
      const u = sOf(i) * (ctrl.length - 1), k = Math.min(ctrl.length - 2, Math.floor(u)), t = u - k;
      const [p0, p1, p2, p3] = [c[k], c[k + 1], c[k + 2], c[k + 3]], t2 = t * t, t3 = t2 * t;
      pts.push([0, 1, 2].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
    // física: ningún tramo del mechón (salvo la raíz, que entra al casquete) atraviesa la cabeza, el cuello ni el torso;
    // se empuja afuera lo justo y se suaviza la curva para que no quede un quiebre
    noCol = !!o.noCollide; envOn = !o.noEnv;
    if (!o.noCollide) {
      const m = h * .6 + .002;
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 1; i <= N; i++) if (sOf(i) > .12) peloKeepOut(H, pts[i], m);
        if (pass < 2) for (let i = 2; i < N; i++) if (sOf(i) > .12) pts[i] = [0, 1, 2].map(j => pts[i][j] * .5 + (pts[i - 1][j] + pts[i + 1][j]) * .25);
      }
    }
    if (cards) { const tint = o.tint != null ? o.tint : rndT() * 2 - 1; cardStrip(pts, sOf, N, w, h, o, 0, tint); if (!o.single) cardStrip(pts, sOf, N, w * .82, h, o, 1, tint); tNow = -1; envOn = true; return; }
    // masas: menos mechones (cada estilo los pide así), más anchos y gruesos: se solapan en pocos volúmenes grandes
    // (o.wm: los que caen junto a la cara no se ensanchan, para no taparla)
    if (PELO_MASS) { w *= o.wm || (o.free ? 1.15 : 1.35); h *= 1.45; }
    const rings = [], v0 = P.length / 3;
    for (let i = 0; i <= N; i++) {
      const t = sOf(i), p = pts[i]; tNow = t;
      const T = peloNorm(i === 0 ? peloAdd(pts[1], p, -1) : i === N ? peloAdd(p, pts[N - 1], -1) : peloAdd(pts[i + 1], pts[i - 1], -1));
      // hacia afuera: desde el eje de la cabeza (más abajo del cráneo, horizontal)
      let out = peloAdd(p, H.C, -1); if (p[1] < H.C[1]) out[1] *= .25;
      if (o.out) out = peloAdd(peloNorm(out), o.out, 1.4);
      out = peloNorm(peloAdd(out, T, -peloDot(out, T)));
      const S = peloNorm(peloCross(T, out));
      if (i === N) { rings.push([v(p, .08)]); break; }
      const tq = Math.max(0, (t - (o.flat || 0)) / (1 - (o.flat || 0)));   // o.flat: tramo de ancho parejo antes de afinarse
      // punta de aguja: el último tramo se afina mucho más rápido que el resto (unas 10 veces más fina que antes)
      const needle = PELO_MASS ? Math.pow(Math.max(0, 1 - Math.pow(tq, 3.2)), .55) : Math.pow(Math.max(0, 1 - Math.pow(tq, 2.5)), 1.25);
      const prof = (PELO_MASS ? Math.pow(1 - tq * .55, .8) : Math.pow(1 - tq, o.tip || .9)) * needle * (1 + (o.belly == null ? .3 : o.belly) * Math.sin(Math.PI * Math.min(1, t * 1.6)));
      // grosor: fino en la raíz (queda dentro del casquete), lleno a un tercio y afinándose hacia la punta
      // (o.rope: cuerda pareja, como las rastas)
      const th = (o.rope ? Math.min(1, .5 + t * 5) : t < .3 ? .35 + .65 * t / .3 : 1 - .55 * (t - .3) / .7) * Math.pow(Math.max(0, 1 - tq * tq), 1.2);
      const ol = t < .72 ? 1 : Math.max(.08, Math.pow(1 - (t - .72) / .28, 1.2));
      const bump = o.bumps && t > .12 ? 1 + .28 * Math.sin(t * Math.PI * 2 * o.bumps) : 1, ww = w * prof * .5 * bump, hh = h * th * bump, cv = (o.curve == null ? .1 : o.curve) * ww * 2;
      const tw = o.twist ? o.twist * t : 0, cs = Math.cos(tw), sn = Math.sin(tw);
      const Sx = [S[0] * cs + out[0] * sn, S[1] * cs + out[1] * sn, S[2] * cs + out[2] * sn], Ox = [out[0] * cs - S[0] * sn, out[1] * cs - S[1] * sn, out[2] * cs - S[2] * sn];
      rings.push([
        v(peloAdd(peloAdd(p, Sx, ww), Ox, -cv), ol), v(peloAdd(peloAdd(p, Sx, ww * .5), Ox, hh * .8), ol), v(peloAdd(p, Ox, hh), ol), v(peloAdd(peloAdd(p, Sx, -ww * .5), Ox, hh * .8), ol),
        v(peloAdd(peloAdd(p, Sx, -ww), Ox, -cv), ol), v(peloAdd(p, Ox, -hh * .35), ol),
      ]);
    }
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i], B = rings[i + 1], n = A.length;
      if (B.length === 1) { for (let k = 0; k < n; k++) I.push(A[(k + 1) % n], A[k], B[0]); continue; }
      for (let k = 0; k < n; k++) { const k2 = (k + 1) % n; I.push(A[k], B[k2], A[k2], A[k], B[k], B[k2]); }
    }
    LK.push([v0, P.length / 3 - 1, o.free ? 1 : 0]); tNow = 0;
    // la raíz cerrada (queda dentro del casquete, pero así no hay agujeros)
    const R0 = rings[0], c0 = v(pts[0]); for (let k = 0; k < R0.length; k++) I.push(R0[k], R0[(k + 1) % R0.length], c0);
    tNow = -1; envOn = true;
  }
  /* tarjeta: lámina que sigue la curva del mechón, con la textura de hebras (las puntas finas las da la textura).
     layer 1: una segunda lámina un poco más afuera y más angosta, con otra columna de hebras (da cuerpo) */
  function cardStrip(pts, sOf, N, w, h, o, layer, tint = 0) {
    const col = o.col != null ? o.col + layer : Math.floor(rndC() * 6), u0 = col / PELO_COLS, du = 1 / PELO_COLS, ins = .06;
    // la textura por largo real: casi todo el mechón usa la parte llena de las hebras y solo los últimos
    // centímetros (o la mitad, si es corto) usan las puntas: un mechón largo no se ve recortado
    const acc = [0]; for (let i = 1; i <= N; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
    const Lt = acc[N] || 1e-3, tipL = Math.min(Lt * .55, .07 + .03 * rndC()), body = Lt - tipL;
    const vOf = i => { const sd = acc[i]; return sd <= body ? .32 * sd / Math.max(1e-4, body) : .32 + .68 * (sd - body) / tipL; };
    const rows = [];
    for (let i = 0; i <= N; i++) {
      const t = sOf(i), p = pts[i]; tNow = t;
      const T = peloNorm(i === 0 ? peloAdd(pts[1], p, -1) : i === N ? peloAdd(p, pts[N - 1], -1) : peloAdd(pts[i + 1], pts[i - 1], -1));
      let out = peloAdd(p, H.C, -1); if (p[1] < H.C[1]) out[1] *= .25;
      out = peloNorm(peloAdd(out, T, -peloDot(out, T)));
      const S = peloNorm(peloCross(T, out));
      const tw = (o.twist || 0) * t * .6, cs = Math.cos(tw), sn = Math.sin(tw);
      const Sx = [S[0] * cs + out[0] * sn, S[1] * cs + out[1] * sn, S[2] * cs + out[2] * sn], Ox = [out[0] * cs - S[0] * sn, out[1] * cs - S[1] * sn, out[2] * cs - S[2] * sn];
      // ancho: parejo y algo más angosto hacia el final; la textura termina las hebras en punta
      const tq = Math.max(0, (t - (o.flat || 0)) / (1 - (o.flat || 0)));
      const wc = w * .5 * (1.2 - .45 * tq) * (layer ? .92 : 1.05);
      const c = peloAdd(p, Ox, h * (layer ? .75 : .15)), bulge = wc * .16, vv = 1 - vOf(i);
      // sombra entre capas: la lámina de abajo y la raíz más oscuras; más abajo de las orejas, un poco más
      // (moño, puntas paradas y mechones sueltos: casi sin sombra en la raíz, se ven enteros)
      const r0 = o.free ? .88 : .62, ao = (layer ? 1 : .8) * (t < .3 ? r0 + (1 - r0) * t / .3 : 1) * (p[1] < H.ye - H.hs * .5 ? .9 : 1), va = [ao, tint];
      rows.push([
        v(peloAdd(peloAdd(c, Sx, wc), Ox, -bulge), 1, [u0 + du * ins, vv], peloNorm(peloAdd(Ox, Sx, .35)), T, va),
        v(peloAdd(c, Ox, bulge * .6), 1, [u0 + du * .5, vv], Ox, T, va),
        v(peloAdd(peloAdd(c, Sx, -wc), Ox, -bulge), 1, [u0 + du * (1 - ins), vv], peloNorm(peloAdd(Ox, Sx, -.35)), T, va),
      ]);
    }
    for (let i = 0; i < rows.length - 1; i++) { const A = rows[i], B = rows[i + 1]; I.push(A[0], B[0], A[1], A[1], B[0], B[1], A[1], B[1], A[2], A[2], B[1], B[2]); }
    LK.push([rows[0][0], rows[rows.length - 1][1], o.free ? 1 : 0]);   // para la revisión: del centro de la raíz al centro de la punta
  }
  /* casquete de tarjetas en franja: cada columna (azimut) va del nacimiento del pelo a la coronilla, así el borde
     sigue la línea exacta (antes la cuadrícula fija lo dejaba en escalones). Abajo de los ojos se apoya en la cabeza
     real (orejas, mandíbula), arriba en el cráneo liso */
  function capBand(mask, lift, o) {
    const line = mask.line, topE = mask.top || (() => 90), NR = o.rows || (cards ? 24 : 14), A = [], E = H.ear, OUT = cards ? IC : I, k = o.k || (cards ? .78 : 1.1);
    // columnas cada 4° y cada 2° donde la línea cambia rápido (patillas y alrededor de la oreja); casi todo el casquete
    // queda bajo los mechones, así que no hace falta más
    const fine = a => { const x = Math.abs(a); return x > E.af - 22 && x < E.ab + 16; };
    for (let a = -180; a < 180 - 1e-6; a += fine(a) || fine(a + 4) ? 2 : 4) A.push(a);
    A.push(180);
    const cols = A.map(a => {
      const lo = line(a), hi = Math.min(89.5, topE(a));
      if (!(hi - lo > 1) || !mask(a, (lo + hi) / 2)) return null;
      const ids = [];
      for (let j = 0; j <= NR; j++) {
        const s = j / NR, e = lo + (hi - lo) * s, d = peloDir(a, e), w = Math.max(0, Math.min(1, (-e - 2) / 10));
        // franja que termina antes de la coronilla (calvicie): el borde de arriba baja hasta el cuero cabelludo, sin escalón
        const tp = hi < 89 ? Math.max(.25, Math.min(1, (hi - e) / 8)) : 1;
        const r = peloR(H, a, e) * (1 - w) + peloR(H, a, e, true) * w + Math.max(.003, lift(a, e) * k * tp);
        // la hebra del casquete baja desde la coronilla; es la capa de más adentro (más oscura arriba, donde la tapan los mechones)
        const A = peloDeg(a), Ee = peloDeg(e), tn = [Math.sin(Ee) * Math.sin(A), -Math.cos(Ee), Math.sin(Ee) * Math.cos(A)];
        ids.push(v([H.C[0] + d[0] * r, H.C[1] + d[1] * r, H.C[2] + d[2] * r], 1, [(a + 180) / 360 * (o.rep || 9), .08 + .92 * s], d, tn, [.92 - .2 * s, 0]));
      }
      // masas: el borde baja hasta la piel (el casquete se ve como un volumen, no como una cáscara)
      if (!cards) {
        const sk = e => { const d0 = peloDir(a, e), r0 = Math.max(peloR(H, a, e), peloR(H, a, e, true)) + .0008; return v([H.C[0] + d0[0] * r0, H.C[1] + d0[1] * r0, H.C[2] + d0[2] * r0]); };
        ids.inner = sk(lo); if (hi < 89) ids.top = sk(hi);
      }
      return ids;
    });
    for (let i = 0; i < cols.length - 1; i++) {
      const L = cols[i], R = cols[i + 1]; if (!L || !R) continue;
      for (let j = 0; j < NR; j++) OUT.push(L[j], R[j], R[j + 1], L[j], R[j + 1], L[j + 1]);
      if (!cards) OUT.push(L.inner, R.inner, R[0], L.inner, R[0], L[0]);
      if (!cards && L.top != null && R.top != null) OUT.push(L[NR], R[NR], R.top, L[NR], R.top, L.top);
    }
  }
  /* casquete: la superficie de la cabeza donde crece el pelo (mask), separada `lift`, con borde cerrado */
  function cap(mask, lift, o = {}) {
    if (mask.line && !o.grid) return capBand(mask, lift, o);
    const da = o.da || 4, de = o.de || 3, A = [], E = [];
    for (let a = -180; a < 180; a += da) A.push(a);
    if (cards) A.push(180);   // la costura de atrás se duplica: la textura no se comprime en una franja
    for (let e = o.e0 || -70; e <= 90; e += de) E.push(Math.min(e, 89.5));
    const NA = A.length, idx = new Int32Array(NA * E.length).fill(-1), inn = new Int32Array(NA * E.length).fill(-1);
    const line = mask.line || (() => -40), topE = mask.top || (() => 90);
    for (let j = 0; j < E.length; j++) for (let i = 0; i < NA; i++) if (mask(A[i], E[j])) {
      const a = A[i], e = E[j];
      if (cards) {
        // casquete de tarjetas: una franja más abajo del nacimiento para que las puntas de la textura lo suavicen
        const vv = Math.max(0, Math.min(1, (e - line(a)) / Math.max(4, topE(a) - line(a))));
        idx[j * NA + i] = v(peloP(H, a, e, Math.max(.003, lift(a, e) * (o.k || .78))), 1, [(a + 180) / 360 * (o.rep || 9), .08 + .92 * vv], peloDir(a, e));
      } else { idx[j * NA + i] = v(peloP(H, a, e, Math.max(.003, lift(a, e) * (o.k || .78)))); inn[j * NA + i] = v(peloP(H, a, e, .0008)); }
    }
    const edges = new Map(), tris = [];
    const T3 = (a, b, c) => { tris.push(a, b, c); for (const [x, y] of [[a, b], [b, c], [c, a]]) { const k = x < y ? x + ',' + y : y + ',' + x; edges.set(k, (edges.get(k) || 0) + 1); } };
    for (let j = 0; j < E.length - 1; j++) for (let i = 0; i < (cards ? NA - 1 : NA); i++) {
      const i2 = (i + 1) % NA, a = j * NA + i, b = j * NA + i2, c = (j + 1) * NA + i2, d = (j + 1) * NA + i;
      if (idx[a] >= 0 && idx[b] >= 0 && idx[c] >= 0) T3(a, b, c);
      if (idx[a] >= 0 && idx[c] >= 0 && idx[d] >= 0) T3(a, c, d);
    }
    if (cards) { for (let t = 0; t < tris.length; t += 3) IC.push(idx[tris[t]], idx[tris[t + 1]], idx[tris[t + 2]]); return; }
    for (let t = 0; t < tris.length; t += 3) I.push(idx[tris[t]], idx[tris[t + 1]], idx[tris[t + 2]]);
    // borde: de la superficie del pelo hasta el cuero cabelludo (en el sentido del triángulo, para que mire afuera)
    for (let t = 0; t < tris.length; t += 3) for (const [x, y] of [[tris[t], tris[t + 1]], [tris[t + 1], tris[t + 2]], [tris[t + 2], tris[t]]]) {
      const k = x < y ? x + ',' + y : y + ',' + x; if (edges.get(k) !== 1) continue;
      I.push(idx[y], idx[x], inn[x], idx[y], inn[x], inn[y]);
    }
  }
  return { lock, cap, P, I, OL, TT, LK, UV, NR, IC, TN, VA, cards };
}

/* ---------- partes de los peinados ---------- */
/* línea del nacimiento del pelo (elevación mínima, en grados) según el azimut: frente, sienes, patillas, orejas y nuca */
function peloLine(H, o = {}) {
  const f = o.front || 0, t = o.temple || 0, n = o.nape || 0, E = H.ear;
  const eF = Math.atan2(H.ye + H.hs * .74 - H.C[1], H.zf - H.C[2]) * 180 / Math.PI + f;
  // patilla: baja por delante de la oreja hasta la mitad (un tercio en mujeres y niñas); sobre la oreja el pelo llega
  // justo arriba de ella y detrás vuelve a bajar hacia la nuca (antes quedaba piel entre el pelo y la oreja)
  const sb = o.sb == null ? (H.fem ? .3 : .55) : o.sb, eSb = E.et - (E.et - E.eb) * sb, eTop = E.et + 3;
  const K = [[0, eF], [30, eF - 1 + t * .5], [50, eF - 9 + t], [E.af - 18, -12 + t * .3], [E.af - 12, eSb + 8], [E.af - 7, eSb + 2], [E.af - 2, eSb - 1],
    [E.af + 3, eTop], [E.ab - 2, eTop], [E.ab + 4, E.et - 8], [E.ab + 12, -36 + n * .5], [136, -41 + n], [180, -47 + n]];
  return a => peloTab(K, Math.abs(a));
}
/* interpolación suave en una tabla [[x, y], …] */
function peloTab(K, x) { if (x <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (x <= K[i][0]) { const [a0, e0] = K[i - 1], [a1, e1] = K[i], t = (x - a0) / (a1 - a0), s = t * t * (3 - 2 * t); return e0 + (e1 - e0) * s; } return K[K.length - 1][1]; }
/* elevación del punto de la cabeza que queda a la altura y */
function peloEAtY(H, a, y, lift = 0, raw = true) { let lo = PELO_E0, hi = 88; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (peloP(H, a, m, lift, raw)[1] < y) lo = m; else hi = m; } return (lo + hi) / 2; }
/* cuántos mechones: en masas, una fracción (cada uno sale más ancho) */
const peloN = (n, k) => PELO_MASS ? Math.max(3, Math.round(n * k)) : n;
/* flequillo: mechones que nacen cerca de la coronilla y caen sobre la frente en puntas de largo desparejo */
function peloBangs(H, B, o) {
  const rnd = peloRnd(o.seed || 7), n = peloN(o.n || 7, .65), a0 = o.a0 == null ? -60 : o.a0, a1 = o.a1 == null ? 60 : o.a1, line = o.line;
  const eF = line(0), span = peloDeg(a1 - a0) * peloR(H, 0, eF) / Math.max(1, n - 1), d = o.lift || .005;
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? .5 : i / (n - 1), a = a0 + (a1 - a0) * u + (rnd() - .5) * 5;
    const mid = 1 - Math.abs(u - .5) * 2;
    const sw = (o.sweep || 0) * (.5 + .5 * u);
    const root = peloP(H, a * (o.conv == null ? .62 : o.conv) + (o.rootShift || 0), o.eRoot || 64, -.006);
    const hl = peloP(H, a + sw * .3, eF + 4, H.vol(a, eF + 4) + d);
    // puntas: el del centro más largo, los demás alternan un poco (y se curvan hacia un lado u otro)
    const ta = a * (o.spread || 1.08) + sw + (i % 2 ? -1 : 1) * (o.hook == null ? 4 : o.hook);
    // o.tips: largo según hacia dónde cae la punta (cortinas: cortas al medio, largas a los costados)
    const len = (o.tips ? peloTab(o.tips, Math.abs(ta)) : (o.tip == null ? .2 : o.tip) - (o.mid == null ? .08 : o.mid) * mid) + (i % 2 ? .05 : -.02) * (o.ragged == null ? 1 : o.ragged) + (rnd() - .5) * .04;
    const tip = peloAtY(H, ta, H.ye + H.hs * len, .008 + (o.tipLift || 0), true);
    const m1 = peloAdd(peloMix(hl, tip, .45), peloNorm(peloAdd(peloMix(hl, tip, .45), H.C, -1)), o.bow == null ? .007 : o.bow);
    B.lock([root, hl, m1, tip], span * (o.w || 2.2) * (.85 + rnd() * .35), o.h || .011, { twist: (rnd() - .5) * .25, wm: o.wm });
  }
}
/* mechones laterales: delante de las orejas, hasta la altura pedida (len en alturas de cabeza bajo los ojos) */
function peloSides(H, B, o) {
  const rnd = peloRnd(o.seed || 11), d = o.lift || .004;
  for (const s of [-1, 1]) for (let k = 0; k < (o.n || 1); k++) {
    const a = s * ((o.a || 66) + k * (o.da || 10));
    const root = peloP(H, a * .75, (o.e || 36), -.01), m0 = peloP(H, a * .95, 18, H.vol(a, 18) * .9 + d), m1 = peloP(H, a, 0, H.vol(a, 0) * .7 + d, true);
    const tipY = H.ye - H.hs * ((o.len || .55) + k * .07 + (rnd() - .5) * .04);
    let ctrl;
    if (tipY < H.yNeck - .02) {
      // por delante del hombro
      const j = peloP(H, a, -42, .01, true), x = j[0] + s * .012;
      ctrl = [root, m0, m1, j];
      const steps = Math.max(2, Math.round((j[1] - tipY) / .06));
      let z = j[2];
      for (let q = 1; q <= steps; q++) { const y = j[1] + (tipY - j[1]) * q / steps, xf = x + s * .006 * q, fz = peloBody(H, xf, y).f; z = Math.max(z, fz > -8 ? Math.min(z + .02, fz + .016) : z); /* cae derecho, sin saltos: no vuelve hacia el cuerpo bajo el pecho */ ctrl.push([xf, y, z]); }
    } else {
      const tip = peloAtY(H, a - s * (o.inward || 3), tipY, .009, true);
      ctrl = [root, m0, m1, tip];
    }
    B.lock(ctrl, (o.w || .036) * (.9 + rnd() * .2), o.h || .011, { twist: s * .12, flat: o.flat || 0, tip: o.tipK || .9, wm: o.wm || 1.05, bumps: o.bumps, rope: o.rope });
  }
}
/* borde del pelo: mechones cortos pegados a la cabeza a lo largo del nacimiento (patillas, sienes, nuca). Nacen
   `up` grados arriba de la línea y terminan `down` grados abajo: el borde queda en hebras sueltas, no en un corte
   parejo. Ambos lados (a0..a1 y su espejo). */
function peloEdge(H, B, line, o) {
  const rnd = peloRnd(o.seed || 97), n = o.n || 4;
  for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
    const a = o.a0 + (o.a1 - o.a0) * (n === 1 ? .5 : i / (n - 1)) + (rnd() - .5) * (o.jit == null ? 3 : o.jit), sa = s * a;
    const lo = line(sa), up = o.up * (.85 + rnd() * .3), dn = o.down * (.6 + rnd() * .8), dr = s * (o.drift || 0) * (.6 + rnd() * .8);
    const lf = o.lift || .0035, eR = lo + up, eT = lo - dn;
    const root = peloP(H, sa, eR, lf * .6, true), mid = peloP(H, sa + dr * .5, (eR + eT) / 2, lf, true), tip = peloP(H, sa + dr, eT, lf * .8, true);
    B.lock([root, mid, tip], (o.w || .014) * (.8 + rnd() * .4), o.h || .004, { single: true, col: o.col == null ? 6 + (i % 2) : o.col, twist: (rnd() - .5) * .3, tip: .8, noEnv: 1 });
  }
}
/* patillas y borde de sienes y nuca de los peinados cortos */
function peloTrim(H, B, line, o = {}) {
  if (!B.cards) return;   // las hebras sueltas del borde son de las tarjetas
  const E = H.ear, f = o.fem || H.fem;
  // patillas: por delante de la oreja, de la sien hasta abajo
  peloEdge(H, B, line, { a0: E.af - 13, a1: E.af - 3, n: 3, up: 20, down: 2.5, w: .013, drift: -1.5, col: 3, seed: 101 });
  // sienes: hebras finas sobre el borde (rompen el corte recto entre el flequillo y la patilla)
  if (!o.noTemple) peloEdge(H, B, line, { a0: 38, a1: E.af - 16, n: 4, up: 9, down: 3, w: .012, drift: -2, seed: 103 });
  // detrás de la oreja y nuca
  if (!o.noNape) peloEdge(H, B, line, { a0: E.ab + 4, a1: 172, n: f ? 6 : 7, up: 15, down: 4, w: .018, drift: 2, seed: 107, jit: 5 });
}
/* capas: mechones alrededor de la cabeza (azimuts a0..a1), pegados al cráneo desde la coronilla.
   El largo de la punta va por azimut: tips = [[azimut, alturas de cabeza respecto de los ojos], …] */
function peloLayer(H, B, o) {
  const rnd = peloRnd(o.seed || 23), n = peloN(o.n || 16, .6), a0 = o.a0 == null ? -180 : o.a0, a1 = o.a1 == null ? 180 : o.a1;
  const full = a1 - a0 >= 359, step = (a1 - a0) / (full ? n : Math.max(1, n - 1)), d = o.lift || .005;
  const tips = o.tips || [[0, o.tip == null ? -.3 : o.tip], [180, o.tip == null ? -.3 : o.tip]];
  const hang = [], mids = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + step * i + (rnd() - .5) * step * .45, aa = ((a % 360) + 540) % 360 - 180;
    const e0 = (typeof o.eRoot === 'function' ? o.eRoot(aa) : o.eRoot || 72) + (rnd() - .5) * 6, root = peloP(H, aa * (o.conv || 1), e0, -.004);
    const tipY = H.ye + H.hs * (peloTab(tips, Math.abs(aa)) + (rnd() - .5) * (o.tipVar == null ? .07 : o.tipVar));
    const w = (o.w || peloDeg(Math.abs(step)) * (peloR(H, aa, 20) + H.vol(aa, 20)) * (o.wk || 2.1)) * (.85 + rnd() * .3);
    const ctrl = [root];
    if (tipY < H.yNeck - .01) {
      // pelo largo: baja por la cabeza hasta la nuca y cae por detrás de la espalda
      for (const e of [40, 10, -18]) if (e < e0 - 6) ctrl.push(peloP(H, aa, e, H.vol(aa, e) + d, true));
      const nape = peloP(H, aa, -36, H.vol(aa, -36) + d + .006, true); ctrl.push(nape);
      const steps = Math.max(2, Math.round((nape[1] - tipY) / (o.wave ? .045 : .08)));
      for (let k = 1; k <= steps; k++) {
        const y = nape[1] + (tipY - nape[1]) * k / steps, bk = peloBack(H, y), f = k / steps;
        const wv = o.wave ? o.wave * Math.sin(k * 1.7 + i * 1.7) * Math.min(1, f * 2.5) : 0;
        const x = nape[0] * (1 + (o.spread || .35) * f) + Math.sign(nape[0] || 1) * .004 * k + wv, bz = peloBody(H, x, y).b;
        ctrl.push([x, y, Math.min(nape[2] - .01 * f, (bz < 8 ? bz : bk.z) - .02) - Math.abs(wv) * .5]);
      }
      hang.push({ ctrl, w, tw: (rnd() - .5) * .3 });
      continue;
    }
    // corto o medio: sigue la curva del cráneo; la punta se separa un poco (flick) o se mete (curl)
    const eT = peloEAtY(H, aa, tipY, .008, true), m = 4;
    for (let k = 1; k <= m; k++) {
      const t = k / m, e = e0 + (eT - e0) * t;
      let lf = Math.max(.007, H.vol(aa, e)) + d;
      if (k === m) lf += o.flick || 0;
      ctrl.push(peloP(H, aa, e, lf, true));
    }
    if (o.curl) { const tip = ctrl[ctrl.length - 1], inw = peloNorm(peloAdd(H.C, tip, -1)); inw[1] = .2; ctrl.push(peloAdd(peloAdd(tip, inw, o.curl), [0, -1, 0], o.curl * .6)); }
    if (o.clump) { mids.push({ ctrl, w, tw: (rnd() - .5) * .35 }); continue; }
    B.lock(ctrl, w, o.h || .013, { twist: (rnd() - .5) * .35, wm: o.wm });
  }
  // medias: los vecinos juntan sus puntas (de a 3 o 4) y se ven pocas puntas grandes
  if (mids.length) {
    const nm = Math.max(1, Math.min(mids.length, o.clump));
    for (let g = 0; g < nm; g++) {
      const mem = mids.filter((_, i) => Math.min(nm - 1, Math.floor(i * nm / mids.length)) === g); if (!mem.length) continue;
      const av = k => [0, 1, 2].map(q => mem.reduce((s2, h) => s2 + h.ctrl[h.ctrl.length - k][q], 0) / mem.length);
      const tip = av(1), pre = av(2); tip[1] = Math.min(...mem.map(h => h.ctrl[h.ctrl.length - 1][1]));
      mem.forEach((h, j) => { const L = h.ctrl.length; h.ctrl[L - 1] = [tip[0], tip[1], tip[2]]; h.ctrl[L - 2] = peloMix(h.ctrl[L - 2], pre, .45); B.lock(h.ctrl, h.w, o.h || .013, { twist: h.tw, wm: o.wm }); });
    }
  }
  // pelo largo: los mechones vecinos se juntan hacia la punta en `clump` manojos: una sola masa que termina en
  // pocas puntas grandes (como en el dibujo), no en un abanico de agujas sueltas
  const nc = Math.max(1, Math.min(hang.length, o.clump || Math.round(hang.length / 3.5)));
  for (let g = 0; g < nc; g++) {
    const mem = hang.filter((_, i) => Math.min(nc - 1, Math.floor(i * nc / hang.length)) === g); if (!mem.length) continue;
    const avg = k => { const s2 = [0, 0, 0]; for (const h of mem) { const p = h.ctrl[h.ctrl.length - k]; s2[0] += p[0]; s2[1] += p[1]; s2[2] += p[2]; } return s2.map(x => x / mem.length); };
    const tip = avg(1), pre = avg(2); tip[1] = Math.min(...mem.map(h => h.ctrl[h.ctrl.length - 1][1]));   // la punta del manojo: la del más largo
    mem.forEach((h, j) => {
      const L = h.ctrl.length;
      h.ctrl[L - 1] = [tip[0], tip[1], tip[2] - .001 * j];
      if (L > 3) h.ctrl[L - 2] = peloMix(h.ctrl[L - 2], pre, .55);
      if (L > 4) h.ctrl[L - 3] = peloMix(h.ctrl[L - 3], avg(3), .25);
      B.lock(h.ctrl, h.w, o.h || .012, { twist: h.tw, flat: o.flat == null ? .5 : o.flat, tip: .75, belly: .1, wm: o.wm, bumps: o.bumps, rope: o.rope });
    });
  }
}
/* puntas paradas (despeinado): mechones que salen de la coronilla hacia afuera, un poco hacia arriba y atrás */
function peloSpikes(H, B, o) {
  const rnd = peloRnd(o.seed || 31), n = peloN(o.n || 14, .5);
  for (let i = 0; i < n; i++) {
    const a = (o.a0 == null ? -180 : o.a0) + ((o.a1 == null ? 180 : o.a1) - (o.a0 == null ? -180 : o.a0)) * (i + rnd() * .6) / n;
    const e = (o.e || 50) + (rnd() - .5) * (o.eVar || 26);
    const root = peloP(H, a * .5, Math.min(86, e + 24), -.004), mid = peloP(H, a, e + 4, H.vol(a, e + 4) + .004);
    const out = peloNorm(peloAdd(peloP(H, a, e, 0), H.C, -1));
    const len = (o.len || .035) * (.75 + rnd() * .5);
    // la punta sigue la caída del pelo (hacia abajo por la cabeza) y se despega hacia afuera
    const down = peloNorm(peloAdd(peloP(H, a, e - 12, 0), peloP(H, a, e, 0), -1));
    const tip = peloAdd(peloAdd(peloAdd(mid, out, len * .5), down, len), [0, 1, 0], len * (o.up == null ? .05 : o.up));
    B.lock([root, mid, peloMix(mid, tip, .55), tip], (o.w || .036) * (.8 + rnd() * .4), o.h || .013, { twist: (rnd() - .5) * .6, belly: .3, curve: .25, free: 1, noEnv: o.noEnv });
  }
}
/* manojo (cola de caballo, coletas): sale de un punto y cae hacia `tipY` */
function peloTail(H, B, base, dir, tipY, o = {}) {
  const rnd = peloRnd(o.seed || 41), n = peloN(o.n || 7, .65), side = o.side || 0, L = [];
  for (let i = 0; i < n; i++) {
    const ang = i / n * Math.PI * 2, j = [Math.cos(ang), Math.sin(ang)];
    const p0 = peloAdd(base, [j[0] * .008, j[1] * .006, 0]);
    const p1 = peloAdd(peloAdd(p0, dir, .045 + rnd() * .01), [j[0] * .012, j[1] * .01, 0]);
    const y = tipY + (rnd() - .5) * .06, ym = (p1[1] + y) / 2, bk = peloBack(H, ym), bt = peloBack(H, y);
    const xs = side ? side * Math.max(Math.abs(p1[0]) + .02, bk.sx * .4) : p1[0] * .6;
    const p2 = [xs + j[0] * .013, ym, Math.min(p1[2] - .03, bk.z - .035) + j[1] * .01];
    const p3 = [xs * (side ? 1.04 : 1) + j[0] * .016, y, Math.min(p1[2] - .04, bt.z - .03) + j[1] * .012];
    L.push({ c: [p0, p1, peloAdd(peloMix(p1, p2, .5), dir, .02), p2, p3], w: (o.w || .046) * (.85 + rnd() * .3), tw: (rnd() - .5) * .8 });
  }
  // el manojo baja junto y termina en 2 o 3 puntas (los mechones vecinos se unen)
  const nc = o.clump || 3;
  for (let g = 0; g < nc; g++) {
    const mem = L.filter((_, i) => Math.floor(i * nc / L.length) === g); if (!mem.length) continue;
    const av = k => [0, 1, 2].map(q => mem.reduce((s2, h) => s2 + h.c[h.c.length - k][q], 0) / mem.length);
    const tip = av(1), pre = av(2); tip[1] = Math.min(...mem.map(h => h.c[h.c.length - 1][1]));
    mem.forEach((h, j) => { h.c[4] = [tip[0], tip[1], tip[2] - .001 * j]; h.c[3] = peloMix(h.c[3], pre, .5); B.lock(h.c, h.w, o.h || .013, { twist: h.tw, belly: .35, flat: .35, tip: .75, noEnv: 1 }); });
  }
}
/* anillo que ata el manojo */
function peloTie(B, base, dir, r = .016) {
  const d = peloNorm(dir), u = peloNorm(peloCross(d, Math.abs(d[1]) > .9 ? [1, 0, 0] : [0, 1, 0])), w = peloCross(d, u);
  const ring = k => { const a = k / 12 * Math.PI * 2; return peloAdd(peloAdd(base, u, Math.cos(a) * r), w, Math.sin(a) * r); };
  for (let k = 0; k < 12; k++) B.lock([ring(k), peloMix(ring(k), ring(k + 1), .5), ring(k + 1)], .014, .007, { tip: .05, belly: 0, n: 3, curve: 0, free: 1, noEnv: 1 });
}

/* rizos: filas de ganchos cortos alrededor de la cabeza, de la línea del pelo (más e0 grados) a la coronilla (e1).
   k: tamaño del rizo; lift(a, e): cuánto se separan del cráneo (afro: mucho); skip(a, e): dónde no van */
function peloCurls(H, B, line, o) {
  const rnd = peloRnd(o.seed || 51), rows = o.rows || 6, k = o.k || 1, lf = o.lift || (() => 0), e1 = o.e1 || 82;
  for (let row = 0; row < rows; row++) {
    const n = Math.max(4, peloN(Math.round((o.n || 16) - row * (o.dn == null ? 2 : o.dn)), .8));
    for (let i = 0; i < n; i++) {
      const a = -180 + 360 * (i + (row % 2) * .5 + (rnd() - .5) * .3) / n, lo = line(a) + (o.e0 == null ? 4 : o.e0), e = lo + (e1 - lo) * row / Math.max(1, rows - 1) + (rnd() - .5) * 4;
      if (o.skip && o.skip(a, e)) continue;
      const L = lf(a, e), s = rnd() < .5 ? 1 : -1;   // el gancho se enrosca hacia un lado u otro
      const p0 = peloP(H, a, e + 6 * k, .008 * k + L * .8), p1 = peloP(H, a + s * 7 * k, e + k, .025 * k + L), p2 = peloP(H, a + s * 11 * k, e - 5 * k, .021 * k + L), p3 = peloP(H, a + s * 8 * k, e - 9 * k, .011 * k + L * .9);
      B.lock([p0, p1, p2, p3], (o.w || .03) * (.85 + rnd() * .3), o.h || .009, { belly: .55, tip: .6, free: 1, noEnv: o.noEnv });
    }
  }
}
/* moño: mechones enrollados alrededor de un centro c (sale hacia `out`), de radio r */
function peloBun(H, B, c, out, r = .036, n = 8) {
  const u = peloNorm(peloCross(out, Math.abs(out[1]) > .9 ? [1, 0, 0] : [0, 1, 0])), w = peloCross(out, u);
  for (let k = 0; k < n; k++) {
    const ph = k / n * Math.PI * 2;
    const pt = (t, rr) => peloAdd(peloAdd(peloAdd(c, u, Math.cos(ph + t) * rr), w, Math.sin(ph + t) * rr), out, r * .39 * Math.sin(t * 1.2));
    B.lock([pt(0, r * .45), pt(1.1, r), pt(2.3, r * .98), pt(3.4, r * .6)], r * 1.05, r * .44, { belly: .5, tip: .55, free: 1, noEnv: 1 });
  }
}
/* trenza: a lo largo de la línea `path` (de la raíz a la punta), mechones cortos que se cruzan de un lado al otro;
   termina en un lazo y un mechoncito suelto */
function peloBraid(B, path, w, o = {}) {
  const acc = [0]; for (let i = 1; i < path.length; i++) acc.push(acc[i - 1] + Math.hypot(...[0, 1, 2].map(j => path[i][j] - path[i - 1][j])));
  const Lt = acc[acc.length - 1], at = d => { d = Math.max(0, Math.min(Lt, d)); let i = 1; while (i < acc.length - 1 && acc[i] < d) i++; const t = (d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]); return peloMix(path[i - 1], path[i], t); };
  const side = d => { const a = at(d - .01), b = at(d + .01), t = peloNorm(peloAdd(b, a, -1)), out = o.out || [0, 0, -1]; return peloNorm(peloCross(t, out)); };
  const step = w * .62, K = Math.max(3, Math.round(Lt / step));
  for (let k = 0; k < K; k++) {
    const d0 = k * Lt / K, d1 = (k + 1.55) * Lt / K, s = k % 2 ? 1 : -1, ww = w * (1 - .3 * k / K);
    const p0 = peloAdd(at(d0), side(d0), s * ww * .42), p2 = peloAdd(at(d1), side(d1), -s * ww * .18), pm = peloAdd(peloMix(p0, p2, .5), side(d0), s * ww * .1);
    B.lock([p0, pm, p2], ww * .95, ww * .5, { belly: .6, tip: .45, curve: .2, free: 1, noEnv: 1 });
  }
  const end = at(Lt), dir = peloNorm(peloAdd(end, at(Lt - .02), -1));
  peloTie(B, end, dir, w * .3);
  for (const q of [-1, 0, 1]) B.lock([end, peloAdd(peloAdd(end, dir, .025), side(Lt), q * w * .25), peloAdd(peloAdd(end, dir, .05), side(Lt), q * w * .4)], w * .5, w * .25, { free: 1, noEnv: 1, tip: .7 });
}

/* peinado hacia atrás: mechones de la frente a la nuca por encima de la coronilla (pegados) y los costados hacia atrás.
   lf: cuánto se separan del cráneo; back: elevación de las puntas en la nuca */
function peloSlick(H, B, line, o) {
  const m = (a, e) => e >= line(a); m.line = line;
  B.cap(m, () => o.lf * .9, { k: 1 });
  const rnd = peloRnd(o.seed || 211), n = peloN(o.n || 11, .7);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - .5, a = u * 116 + (rnd() - .5) * 4, lf = o.lf;
    B.lock([peloP(H, a * .9, line(a) + 2, -.004), peloP(H, a, line(a) + 13, lf), peloP(H, a * .8, 60, lf * 1.05), peloP(H, a * .5, 84, lf), peloP(H, 180 - a * .5, 70, lf * .95), peloP(H, 180 - a * .7, 40, lf * .85), peloP(H, 180 - a * .8, o.back + (rnd() - .5) * 6, lf * .6)],
      .056 * (.9 + rnd() * .2), .012, { twist: (rnd() - .5) * .2, flat: .3, wm: 1.2 });
  }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    const e = 24 - k * 13;
    B.lock([peloP(H, s * 52, e + 4, -.003), peloP(H, s * 78, e, o.lf * .8, true), peloP(H, s * 118, e - 5, o.lf * .8, true), peloP(H, s * 158, e - 12, o.lf * .6, true)], .045, .01, { twist: s * .1, flat: .3, wm: 1.1 });
  }
}

/* ---------- el catálogo ---------- */
function peloBuild(H, key, hat) {
  H.hat = hat || null; H.big = false;
  try { return peloBuild0(H, key); } finally { H.hat = null; H.big = false; }
}
/* con gorra, gorro, sombrero o casco (H.hat): la cola, las coletas y los moños nacen debajo del borde (salen por debajo
   de la pieza, como en la realidad) en vez de quedar aplastados dentro de la copa */
const peloUnder = (H, a, e, m = 10) => H.hat ? Math.min(e, H.hat.line(a) - m) : e;
function peloBuild0(H, key) {
  const B = peloBuilder(H), hs = H.hs;
  const std = peloLine(H), inMask = (line, top = 91) => { const f = (a, e) => e >= line(a) && e <= top; f.line = line; return f; };
  // volumen: separación del pelo respecto del cráneo (más en la coronilla, menos hacia la nuca); casquete y mechones la usan
  const vol = (base, k = .006) => (H.vol = (a, e) => {
    const v = e >= 0 ? base + k * Math.sin(peloDeg(e)) : base * Math.max(.4, 1 + e / 70);
    const up = Math.max(0, Math.sin(peloDeg(e))), sd = Math.sin(peloDeg(a)) ** 2, fr = Math.max(0, Math.cos(peloDeg(a))) ** 2;
    return v * (1 - (.38 * sd + .22 * fr) * (1 - up));
  });
  H.vol = () => .006;
  // largos típicos por azimut (alturas de cabeza respecto de los ojos): sobre las orejas y a la nuca
  const SHORT = [[40, .12], [75, .1], [100, .02], [135, -.32], [180, -.55]];
  switch (key) {
    case 'rapado': B.cap(inMask(peloLine(H, { front: 2 })), () => .0034, { k: 1 }); break;
    case 'corto': {
      B.cap(inMask(std), vol(.012, .012));
      peloBangs(H, B, { line: std, n: 7, tip: .46, mid: .1, w: 2, seed: 3 });
      peloLayer(H, B, { n: 15, a0: 38, a1: 322, tips: SHORT, tipVar: .14, flick: .006, seed: 5 });
      peloTrim(H, B, std);
      break;
    }
    case 'despeinado': {
      B.cap(inMask(std), vol(.016, .016));
      peloBangs(H, B, { line: std, n: 8, tip: .3, mid: .14, bow: .011, hook: 7, seed: 13 });
      peloLayer(H, B, { n: 15, a0: 40, a1: 320, tips: [[40, .1], [80, .05], [110, -.05], [180, -.55]], tipVar: .16, flick: .022, seed: 17 });
      peloSpikes(H, B, { n: 16, e: 40, eVar: 34, len: .045, seed: 19 });
      peloTrim(H, B, std);
      break;
    }
    case 'raya': {
      B.cap(inMask(std), vol(.014, .014));
      peloBangs(H, B, { line: std, n: 7, a0: -36, a1: 66, sweep: -40, conv: .2, rootShift: 34, eRoot: 60, tip: .34, mid: .03, ragged: .5, hook: 2, w: 2.2, bow: .013, seed: 21 });
      peloLayer(H, B, { n: 15, a0: 38, a1: 322, tips: SHORT, tipVar: .12, flick: .007, seed: 23 });
      peloTrim(H, B, std);
      break;
    }
    case 'flequillo': {
      B.cap(inMask(std), vol(.016, .014));
      peloBangs(H, B, { line: std, n: 8, tip: .2, mid: .06, bow: .01, ragged: .6, seed: 27 });
      peloSides(H, B, { a: 70, n: 2, da: 13, len: .6, w: .034, inward: 2 });
      peloLayer(H, B, { n: 16, a0: 58, a1: 302, tips: [[60, -.5], [110, -.5], [180, -.5]], flick: .014, clump: 6, seed: 29 });
      break;
    }
    case 'entradas': {
      const ln = peloLine(H, { front: 13, temple: -10 });
      B.cap(inMask(ln), vol(.009, .008));
      peloLayer(H, B, { n: 18, a0: 48, a1: 312, eRoot: 74, tips: SHORT, flick: .003, h: .007, seed: 33 });
      peloBangs(H, B, { line: ln, n: 5, a0: -28, a1: 28, tip: .66, mid: .03, w: 2.1, eRoot: 74, hook: 2, seed: 35 });
      peloTrim(H, B, ln, { noTemple: true });
      break;
    }
    case 'calvicie': {
      const ln = peloLine(H);
      const topE = a => 6 + 18 * Math.max(0, (Math.abs(a) - 64) / 116);
      const mk = (a, e) => Math.abs(a) > 64 && e >= ln(a) && e <= topE(a); mk.line = ln; mk.top = topE;
      B.cap(mk, vol(.008, 0));
      // los mechones nacen dentro de la franja (antes, sobre las sienes, asomaban arriba como alas)
      peloLayer(H, B, { n: 12, a0: 92, a1: 268, eRoot: a => topE(a) - 5, wm: 1.1, tips: [[70, .17], [100, .12], [140, -.2], [180, -.42]], h: .006, lift: .002, wk: 1.9, flick: .002, seed: 37 });
      peloTrim(H, B, ln, { noTemple: true });
      break;
    }
    case 'melena': {
      B.cap(inMask(std), vol(.018, .012));
      peloBangs(H, B, { line: std, n: 8, a0: -50, a1: 64, sweep: 18, tips: [[0, .3], [30, .22], [60, .1], [90, .04]], ragged: .5, bow: .009, seed: 41 });
      peloSides(H, B, { a: 70, n: 2, da: 14, len: .72, w: .042, inward: 1 });
      peloLayer(H, B, { n: 18, a0: 62, a1: 298, tips: [[60, -.66], [120, -.56], [180, -.48]], tipVar: .04, curl: .008, clump: 6, seed: 43 });
      break;
    }
    case 'ondas': {
      B.cap(inMask(std), vol(.02, .014));
      const rnd = peloRnd(51);
      // rizos en filas alrededor de la cabeza (de la nuca a la coronilla), cada uno un gancho corto
      for (let row = 0; row < 6; row++) {
        const n = 16 - row * 2;
        for (let i = 0; i < n; i++) {
          const a = -180 + 360 * (i + (row % 2) * .5 + (rnd() - .5) * .3) / n, lo = std(a) + 4, e = lo + (82 - lo) * row / 5 + (rnd() - .5) * 4;
          const p0 = peloP(H, a, e + 6, .008), p1 = peloP(H, a + 7, e + 1, .025), p2 = peloP(H, a + 11, e - 5, .021), p3 = peloP(H, a + 8, e - 9, .011);
          B.lock([p0, p1, p2, p3], .03, .009, { belly: .55, tip: .6, free: 1 });
        }
      }
      peloBangs(H, B, { line: std, n: 6, tip: .52, mid: .04, w: 2.2, bow: .012, hook: 8, seed: 53 });
      break;
    }
    case 'larga': {
      B.cap(inMask(std), vol(.015, .012));
      for (const sd of [-1, 1]) peloBangs(H, B, { line: std, n: 4, a0: sd > 0 ? 6 : -58, a1: sd > 0 ? 58 : -6, sweep: sd * 26, conv: .3, eRoot: 70, tips: [[0, .36], [30, .26], [55, .08], [80, -.05]], ragged: .4, hook: 2, bow: .01, wm: 1.15, seed: 61 + sd });
      peloSides(H, B, { a: 76, n: 2, da: 14, len: 2.2, w: .05, inward: -2, h: .012, flat: .4, tipK: .7 });
      peloLayer(H, B, { n: 18, a0: 100, a1: 260, tips: [[100, -2.6], [180, -3.2]], tipVar: .15, h: .012, wk: 2.6, clump: 5, seed: 63 });
      peloLayer(H, B, { n: 5, a0: 66, a1: 100, tips: [[60, -1.7], [100, -2]], tipVar: .2, w: .056, spread: .1, clump: 2, seed: 64 });
      peloLayer(H, B, { n: 5, a0: 260, a1: 294, tips: [[60, -1.7], [100, -2]], tipVar: .2, w: .056, spread: .1, clump: 2, seed: 65 });
      break;
    }
    case 'cola': {
      B.cap(inMask(std), vol(.008, .006));
      const base = peloP(H, 180, peloUnder(H, 180, 24), .014), dir = peloNorm([0, .2, -1]);
      peloLayer(H, B, { n: 16, a0: 58, a1: 302, eRoot: 78, tips: [[0, .15], [180, .15]], tipVar: .02, h: .006, wk: 1.6, seed: 71 });
      peloBangs(H, B, { line: std, n: 8, tip: .3, mid: .06, seed: 73 });
      peloSides(H, B, { a: 64, len: .5, w: .026 });
      peloTie(B, base, dir, .019);
      peloTail(H, B, base, dir, H.ye - hs * 2.7, { n: 9, w: .034, h: .012, seed: 75 });
      break;
    }
    case 'coletas': {
      B.cap(inMask(std), vol(.009, .006));
      peloBangs(H, B, { line: std, n: 8, tip: .24, mid: .06, seed: 81 });
      peloLayer(H, B, { n: 14, a0: 115, a1: 245, tips: [[110, -.3], [180, -.45]], seed: 83 });
      for (const s of [-1, 1]) {
        const base = peloP(H, s * 116, peloUnder(H, s * 116, 30), .014), dir = peloNorm([s * .8, .35, -.45]);
        peloTie(B, base, dir, .016);
        peloTail(H, B, base, dir, H.ye - hs * 2.1, { n: 8, side: s, w: .032, h: .011, seed: 85 + s });
      }
      peloSides(H, B, { a: 64, len: .45, w: .026 });
      break;
    }
    case 'recogido': {
      B.cap(inMask(std), vol(.008, .005));
      peloLayer(H, B, { n: 18, a0: 50, a1: 310, eRoot: 82, tips: [[0, .3], [180, .3]], tipVar: .02, h: .006, wk: 1.6, seed: 91 });
      peloBangs(H, B, { line: std, n: 6, a0: -55, a1: 55, tip: .3, mid: .05, w: 2.1, sweep: 10, seed: 93 });
      peloSides(H, B, { a: 66, len: .35, w: .022 });
      // el moño: mechones enrollados alrededor de un centro, atrás y arriba
      const c = peloP(H, 180, peloUnder(H, 180, 44, 16), .042), o0 = peloAdd(c, H.C, -1);
      if (H.hat) o0[1] = Math.max(o0[1], 0) + .02;   // bajo la pieza, el moño (en la nuca) mira hacia atrás, no hacia abajo
      peloBun(H, B, c, peloNorm(o0), .036, 8);
      break;
    }
    // ---- lote AD: más peinados (cada uno, con los cuerpos a los que le va, en S3_PELO) ----
    case 'tupe': {
      B.cap(inMask(std), vol(.01, .008));
      peloLayer(H, B, { n: 14, a0: 52, a1: 308, eRoot: 70, tips: [[50, .22], [90, .08], [135, -.25], [180, -.45]], tipVar: .08, flick: .004, h: .009, seed: 201 });
      // el copete: nace en la frente, sube unos centímetros y se va hacia atrás por encima de la cabeza
      const rnd = peloRnd(203), eF = std(0), n = peloN(9, .7);
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) - .5, a = u * 84 + (rnd() - .5) * 4, hi = (1 - Math.abs(u) * 1.2) * hs / .11;
        B.lock([peloP(H, a * .9, eF + 2, -.004), peloP(H, a, eF + 9, .02 + .02 * hi), peloP(H, a * .85, eF + 26, .026 + .012 * hi), peloP(H, a * .6, 62, .016), peloP(H, a * .45, 78, .008)],
          .052 * (.9 + rnd() * .2), .016, { twist: (rnd() - .5) * .3, belly: .4, noEnv: 1 });
      }
      peloTrim(H, B, std, { noTemple: true });
      break;
    }
    case 'atras': peloSlick(H, B, std, { lf: .011, back: 10, seed: 211 }); peloTrim(H, B, std, { noTemple: true }); break;
    case 'canas': { const ln = peloLine(H, { front: 7, temple: -7 }); peloSlick(H, B, ln, { lf: .007, back: 2, n: 9, seed: 215 }); peloTrim(H, B, ln, { noTemple: true }); break; }
    case 'cresta': {
      B.cap(inMask(peloLine(H, { front: 2 })), () => .0034, { k: 1 });   // los costados, rapados
      // de la frente a la nuca, una fila de puntas paradas (más altas al medio)
      const rnd = peloRnd(221), n = peloN(12, .85), f0 = std(0) + 3, f1 = 172;
      const at = f => f <= 90 ? [0, f] : [180, 180 - f];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), f = f0 + (f1 - f0) * t, [a, e] = at(f), [a2, e2] = at(f + 6);
        const root = peloP(H, a, e, -.003), nrm = peloNorm(peloAdd(root, H.C, -1)), back = peloNorm(peloAdd(peloP(H, a2, e2), peloP(H, a, e), -1));
        const len = (.042 + .028 * Math.sin(Math.PI * Math.min(1, t * 1.15))) * hs / .11 * (.9 + rnd() * .2);
        const tip = peloAdd(peloAdd(root, nrm, len), back, len * .35);
        B.lock([root, peloAdd(peloMix(root, tip, .5), back, -len * .08), tip], .05, .017, { belly: .35, curve: .15, free: 1, noEnv: 1, twist: (rnd() - .5) * .3 });
      }
      break;
    }
    case 'rizado': {
      B.cap(inMask(std), vol(.013, .012));
      peloCurls(H, B, std, { rows: 6, n: 19, dn: 2, k: .72, w: .024, h: .008, e0: 3, seed: 231 });
      peloTrim(H, B, std);
      break;
    }
    case 'afro': case 'rulos': {
      H.big = true;   // la masa pasa el límite de volumen de los demás peinados
      const afro = key === 'afro', C2 = [H.C[0], H.C[1] + hs * (afro ? .2 : .25), H.C[2] - hs * .08];
      // la superficie: una esfera algo más alta y atrás que el cráneo; nace fina en la línea del pelo y se infla
      let rho = 0; for (let a = -180; a < 180; a += 15) for (let e = 0; e <= 90; e += 15) { const p = peloP(H, a, e); rho = Math.max(rho, Math.hypot(p[0] - C2[0], p[1] - C2[1], p[2] - C2[2])); }
      rho += (afro ? .05 : .016) * hs / .11;
      const fade = (a, e) => .25 + .75 * Math.max(0, Math.min(1, (e - std(a)) / (afro ? 18 : 12)));
      const out = !afro ? (a, e) => (.008 + .014 * Math.max(0, Math.sin(peloDeg(e)))) * hs / .11 * fade(a, e)
        : (a, e) => { const d = peloDir(a, e), q = peloAdd(C2, H.C, -1), b = peloDot(d, q), t = b + Math.sqrt(Math.max(0, b * b - peloDot(q, q) + rho * rho)); return Math.max(.006, t - peloR(H, a, e)) * fade(a, e); };
      B.cap(inMask(std), (a, e) => out(a, e) * .75, { k: 1 });
      peloCurls(H, B, std, afro ? { rows: 7, n: 22, dn: 2, k: 1.05, lift: (a, e) => out(a, e) * .8, w: .036, h: .012, e0: 2, noEnv: 1, seed: 241 }
        : { rows: 6, n: 20, dn: 2, k: .8, lift: (a, e) => out(a, e) * .7, w: .03, h: .01, e0: 1, noEnv: 1, seed: 341 });
      break;
    }
    case 'rastas': {
      B.cap(inMask(std), vol(.01, .008));
      const R = { tipVar: .3, w: .019, h: .013, flat: .9, clump: 99, spread: .5, wm: .85, bumps: 8, rope: 1 };
      peloLayer(H, B, { ...R, n: 20, a0: 58, a1: 302, eRoot: 82, tips: [[60, -1.9], [120, -2.4], [180, -2.6]], seed: 251 });
      peloLayer(H, B, { ...R, n: 16, a0: 74, a1: 286, eRoot: 54, tips: [[70, -1.8], [180, -2.4]], seed: 253 });
      peloLayer(H, B, { ...R, n: 10, a0: 98, a1: 262, eRoot: 26, tips: [[90, -1.7], [180, -2.2]], seed: 255 });
      peloSides(H, B, { a: 62, n: 3, da: 9, len: 1.9, w: .019, h: .013, flat: .9, tipK: .4, wm: .85, bumps: 8, rope: 1 });
      break;
    }
    case 'mono_alto': case 'mono_bajo': {
      const alto = key === 'mono_alto';
      B.cap(inMask(std), vol(.008, .005));
      peloLayer(H, B, { n: 18, a0: 50, a1: 310, eRoot: 84, tips: alto ? [[0, .45], [180, .4]] : [[0, .3], [90, -.05], [180, -.3]], tipVar: .02, h: .006, wk: 1.6, seed: 351 });
      peloBangs(H, B, { line: std, n: 6, a0: -55, a1: 55, tip: .38, mid: .04, w: 2.1, sweep: alto ? 0 : 14, eRoot: 70, seed: 353 });
      peloSides(H, B, { a: 66, len: .3, w: .022 });
      const r = (alto ? .038 : .033) * hs / .11, c = peloP(H, 180, peloUnder(H, 180, alto ? 64 : -12, alto ? 16 : 8), r * .78), o0 = peloAdd(c, H.C, -1);
      if (!alto || H.hat) o0[1] = Math.max(o0[1], 0) * .3 + .02;
      const dir = peloNorm(o0);
      peloTie(B, peloAdd(c, dir, -r * .45), dir, r * .45);
      peloBun(H, B, c, dir, r, 8); peloBun(H, B, peloAdd(c, dir, r * .4), dir, r * .62, 6);
      break;
    }
    case 'bob': {
      B.cap(inMask(std), vol(.016, .012));
      // raya al costado: el flequillo largo se va hacia un lado y cae junto a la cara
      peloBangs(H, B, { line: std, n: 7, a0: -30, a1: 70, sweep: -30, conv: .25, rootShift: 26, eRoot: 62, tips: [[0, .2], [34, .12], [56, -.3], [76, -.75], [100, -.9]], ragged: .15, hook: 2, bow: .012, seed: 261 });
      peloSides(H, B, { a: 70, n: 2, da: 12, len: 1, w: .05, inward: 2, flat: .45, tipK: .5 });
      peloLayer(H, B, { n: 20, a0: 64, a1: 296, tips: [[60, -1], [180, -.94]], tipVar: .015, curl: .007, flat: .55, clump: 9, seed: 263 });
      break;
    }
    case 'pixie': {
      B.cap(inMask(std), vol(.014, .014));
      peloBangs(H, B, { line: std, n: 7, a0: -40, a1: 66, sweep: -30, conv: .25, rootShift: 20, eRoot: 64, tips: [[0, .24], [40, .02], [70, -.2]], ragged: .7, hook: 5, bow: .012, seed: 271 });
      peloLayer(H, B, { n: 16, a0: 40, a1: 320, tips: [[40, .12], [80, -.02], [110, -.2], [180, -.42]], tipVar: .14, flick: .01, seed: 273 });
      peloTrim(H, B, std, { fem: true });
      break;
    }
    case 'trenza': case 'trenzas': {
      const una = key === 'trenza';
      B.cap(inMask(std), vol(.009, .006));
      peloLayer(H, B, { n: 18, a0: 46, a1: 314, eRoot: 84, tips: una ? [[0, .2], [120, -.3], [180, -.42]] : [[40, .2], [100, -.2], [140, -.4], [180, -.3]], tipVar: .02, h: .007, wk: 1.7, seed: 281 });
      peloBangs(H, B, { line: std, n: 6, a0: -50, a1: 50, tip: .32, mid: .05, w: 2.1, sweep: una ? 8 : 0, seed: 283 });
      peloSides(H, B, { a: 64, len: .45, w: .024 });
      // la trenza (o las dos): de la nuca, por detrás de la espalda
      for (const s of una ? [0] : [-1, 1]) {
        const a = una ? 180 : s * 128, base = peloP(H, a, peloUnder(H, a, una ? -16 : -22, 8), .012), path = [base];
        for (let y = base[1] - .03; y > H.ye - hs * (una ? 3.3 : 2.5); y -= .035) {
          const prev = path[path.length - 1], x = s ? s * Math.max(Math.abs(base[0]) * .8, peloBack(H, y).sx * .45) : 0, bz = peloBody(H, x, y).b;
          path.push([x, y, Math.min(prev[2] - .002, (bz < 8 ? bz : peloBack(H, y).z) - .018)]);
        }
        peloBraid(B, path, (una ? .042 : .034) * hs / .11);
      }
      break;
    }
    case 'media_cola': {
      B.cap(inMask(std), vol(.013, .01));
      // abajo, suelto y largo; arriba, recogido hacia atrás en una colita
      peloLayer(H, B, { n: 16, a0: 96, a1: 264, eRoot: 30, tips: [[100, -2.2], [180, -2.7]], tipVar: .15, h: .012, wk: 2.6, clump: 5, seed: 291 });
      peloSides(H, B, { a: 74, n: 2, da: 14, len: 1.9, w: .046, inward: -2, h: .012, flat: .4, tipK: .7 });
      peloLayer(H, B, { n: 16, a0: 50, a1: 310, eRoot: 80, tips: [[0, .25], [90, .12], [180, .22]], tipVar: .02, h: .007, wk: 1.7, seed: 293 });
      peloBangs(H, B, { line: std, n: 6, a0: -48, a1: 48, tip: .36, mid: .06, w: 2.1, seed: 295 });
      const base = peloP(H, 180, peloUnder(H, 180, 38), .014), dir = peloNorm([0, .15, -1]);
      peloTie(B, base, dir, .016);
      peloTail(H, B, base, dir, H.ye - hs * 1.3, { n: 7, w: .03, h: .011, seed: 297 });
      break;
    }
    case 'rizos': {
      B.cap(inMask(std), vol(.02, .014));
      // rizos sueltos arriba (sin el tope de volumen: el contorno se ve rizado)
      peloCurls(H, B, std, { rows: 6, n: 18, dn: 2, k: .9, e0: 2, w: .03, noEnv: 1, seed: 301 });
      const W = { tipVar: .2, h: .013, wave: .032, spread: .6, eRoot: 22 };
      peloLayer(H, B, { ...W, n: 18, a0: 96, a1: 264, tips: [[100, -2.2], [180, -2.6]], wk: 2.6, clump: 9, seed: 303 });
      peloLayer(H, B, { ...W, n: 7, a0: 62, a1: 96, eRoot: 8, tips: [[60, -1.8], [100, -2.1]], w: .05, clump: 4, seed: 304 });
      peloLayer(H, B, { ...W, n: 7, a0: 264, a1: 298, eRoot: 8, tips: [[60, -1.8], [100, -2.1]], w: .05, clump: 4, seed: 305 });
      break;
    }
    case 'tazon': {
      B.cap(inMask(std), vol(.017, .012));
      peloBangs(H, B, { line: std, n: 10, a0: -74, a1: 74, tip: .3, mid: 0, ragged: .15, hook: 0, bow: .012, spread: 1.04, w: 2.1, seed: 311 });
      peloLayer(H, B, { n: 18, a0: 68, a1: 292, tips: [[70, .12], [110, -.04], [180, -.14]], tipVar: .02, curl: .007, clump: 9, seed: 313 });
      break;
    }
    case 'puntas': {
      B.cap(inMask(std), vol(.01, .01));
      peloLayer(H, B, { n: 14, a0: 60, a1: 300, tips: [[60, .12], [100, 0], [180, -.35]], tipVar: .1, flick: .01, h: .009, seed: 321 });
      peloSpikes(H, B, { n: 24, a0: -160, a1: 160, e: 56, eVar: 40, len: .042, up: 1, w: .034, noEnv: 1, seed: 323 });
      // sobre la frente, puntas paradas hacia arriba
      const rnd = peloRnd(325), n = peloN(7, .7);
      for (let i = 0; i < n; i++) {
        const a = -55 + 110 * i / (n - 1) + (rnd() - .5) * 6, root = peloP(H, a * .8, std(a) + 8, -.003), nrm = peloNorm(peloAdd(root, H.C, -1)), L = .05 * (.85 + rnd() * .3) * hs / .11;
        const tip = peloAdd(peloAdd(root, [0, 1, 0], L * .8), nrm, L * .5);
        B.lock([root, peloAdd(peloMix(root, tip, .5), nrm, .006), tip], .04, .015, { belly: .3, curve: .25, free: 1, noEnv: 1, twist: (rnd() - .5) * .5 });
      }
      peloTrim(H, B, std);
      break;
    }
    case 'chongitos': {
      B.cap(inMask(std), vol(.008, .005));
      peloLayer(H, B, { n: 16, a0: 50, a1: 310, eRoot: 82, tips: [[0, .22], [180, .15]], tipVar: .02, h: .006, wk: 1.6, seed: 331 });
      peloBangs(H, B, { line: std, n: 7, tip: .3, mid: .06, seed: 333 });
      peloSides(H, B, { a: 64, len: .4, w: .024 });
      // dos moñitos arriba, a los lados (con una pieza en la cabeza, salen por debajo, atrás)
      for (const s of [-1, 1]) {
        const a = s * (H.hat ? 124 : 58), c = peloP(H, a, peloUnder(H, a, 58, 12), .03), o0 = peloAdd(c, H.C, -1); o0[1] += .03;
        const dir = peloNorm(o0);
        peloTie(B, peloAdd(c, dir, -.014), dir, .013);
        peloBun(H, B, c, dir, .029, 7);
      }
      break;
    }
    default: return null;
  }
  return B;
}
/* bajo una gorra, un gorro, un sombrero o un casco (F: el borde de la pieza, vestHatFit): lo que queda por encima del
   borde se aplasta contra el cráneo, dentro de la copa (a F.gap, menos un margen para el contorno); debajo del borde el
   tope se abre de a poco (el pelo sale de la pieza y cae como siempre: costados, nuca, espalda). Mismo cráneo que la
   copa: nada atraviesa la pieza con ningún peinado ni cuerpo */
function peloHatSquash(H, B, F) {
  const P = B.P, C = H.C, lim = F.gap - .0035;
  for (let i = 0; i < P.length; i += 3) {
    const dx = P[i] - C[0], dy = P[i + 1] - C[1], dz = P[i + 2] - C[2], r = Math.hypot(dx, dy, dz); if (r < 1e-5) continue;
    const a = Math.atan2(dx, dz) * 180 / Math.PI, e = Math.asin(Math.max(-1, Math.min(1, dy / r))) * 180 / Math.PI, eL = F.line(a);
    let R = peloR(H, a, e) + lim;
    if (e < eL) R += peloDeg(eL - e) * r * 1.5;
    if (r > R) { const k = R / r; P[i] = C[0] + dx * k; P[i + 1] = C[1] + dy * k; P[i + 2] = C[2] + dz * k; }
  }
}
/* geometría con piel del peinado para un cuerpo (se arma una vez y se comparte entre figuras); hat: la pieza de la
   cabeza que lleva (la misma figura con y sin gorra son dos peinados en la caché) */
function peloGeo(tp, key, hat) {
  let box = PELO_GEO.get(tp); if (!box) PELO_GEO.set(tp, box = new Map());
  const F = hat && typeof vestHatFit === 'function' ? vestHatFit(tp, hat) : null;
  const ck = (PELO_CARDS ? '' : PELO_MASS ? 'M:' : 'm:') + key + (F ? '~' + hat : '');
  if (box.has(ck)) return box.get(ck);
  let geo = null;
  try {
    const H = peloHead(tp), B = peloBuild(H, key, F);
    if (B && F) peloHatSquash(H, B, F);
    if (B && (B.I.length || B.IC.length)) {
      const T = THREE; geo = new T.BufferGeometry();
      const P = new Float32Array(B.P), nv = P.length / 3;
      geo.setAttribute('position', new T.BufferAttribute(P, 3));
      if (B.cards) {
        geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(B.NR), 3));
        geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(B.UV), 2));
        geo.setAttribute('aTan', new T.BufferAttribute(new Float32Array(B.TN), 3));
        geo.setAttribute('aVar', new T.BufferAttribute(new Float32Array(B.VA), 2));
      } else {
        geo.setIndex(B.I); geo.computeVertexNormals();
        // contorno (aOn): se empuja hacia afuera de la cabeza y del pelo que cae, no según cada mechón; así queda la silueta
        // del peinado y no una raya negra en cada borde de mechón (solo las puntas se cierran con su propia forma)
        const On = new Float32Array(geo.attributes.normal.array);
        // masas: la luz se calcula como sobre una sola forma lisa alrededor de la cabeza (y del pelo que cae), con un
        // poco de la forma de cada mechón; si no, cada tubo se sombrea aparte y el conjunto se ve arrugado
        if (PELO_MASS) {
          const Nn = geo.attributes.normal;
          for (let i = 0; i < nv; i++) {
            const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], t = Math.max(0, Math.min(1, (H.ye - y) / .08));
            const qx = H.C[0], qy = H.C[1] + (y + .05 - H.C[1]) * t, qz = H.C[2] - .01 * t;
            let px = x - qx, py = y - qy, pz = z - qz, l = Math.hypot(px, py, pz) || 1; px /= l; py /= l; pz /= l;
            let nx = Nn.getX(i) * .35 + px * .65, ny = Nn.getY(i) * .35 + py * .65, nz = Nn.getZ(i) * .35 + pz * .65;
            const tt = B.TT[i], g = tt > .7 ? Math.min(.65, (tt - .7) / .3 * .65) : 0;
            On[i * 3] = px * (1 - g) + On[i * 3] * g; On[i * 3 + 1] = py * (1 - g) + On[i * 3 + 1] * g; On[i * 3 + 2] = pz * (1 - g) + On[i * 3 + 2] * g;
            l = Math.hypot(nx, ny, nz) || 1; Nn.setXYZ(i, nx / l, ny / l, nz / l);
          }
        }
        geo.setAttribute('aOn', new T.BufferAttribute(On, 3));
      }
      // piel: arriba la cabeza; el pelo largo pasa al cuello y a la espalda
      const SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4);
      const yA = H.yHead - .02, yB = H.yNeck - .06;
      for (let i = 0; i < nv; i++) {
        const y = P[i * 3 + 1], t = Math.max(0, Math.min(1, (yA - y) / Math.max(.01, yA - yB))), s = t * t * (3 - 2 * t);
        SI[i * 4] = H.bi.head; SW[i * 4] = 1 - s; SI[i * 4 + 1] = H.bi.sp; SW[i * 4 + 1] = s;
      }
      geo.setAttribute('skinIndex', new T.BufferAttribute(SI, 4));
      geo.setAttribute('skinWeight', new T.BufferAttribute(SW, 4));
      if (B.cards) {
        // casquete y mechones: dos mallas que comparten los mismos vértices (cada una con su material y su sombra)
        const part = idx => { if (!idx.length) return null; const g2 = new T.BufferGeometry(); for (const k in geo.attributes) g2.setAttribute(k, geo.attributes[k]); g2.setIndex(idx); g2.computeBoundingSphere(); return g2; };
        geo = { cap: part(B.IC), cards: part(B.I), nv };
      } else {
        geo.setAttribute('aInfl', new T.BufferAttribute(new Float32Array(nv * 2), 2));
        geo.setAttribute('aOl', new T.BufferAttribute(new Float32Array(B.OL), 1));
        geo.computeBoundingSphere();
      }
    }
  } catch (e) { console.warn('pelo', key, e); geo = null; }
  box.set(ck, geo);
  return geo;
}
/* material del pelo: Lambert (liviano) con tres agregados. Luz envolvente (las láminas no se cortan en negro), sombra
   entre capas y tono propio de cada mechón (aVar), y el brillo del pelo real: dos anillos a lo largo de las hebras
   (Kajiya-Kay), uno claro y fino, otro del color del pelo y más ancho, quebrados por la textura. Antes era el material
   físico de three.js (el más pesado: brillo, terciopelo y anisotropía en cada píxel) con reflejos en manchas. */
function peloMat(map, cap) {
  const T = THREE, m = new T.MeshLambertMaterial({ map, color: '#6B4A33', side: T.DoubleSide, alphaTest: .3 });
  m.alphaToCoverage = true;
  const U = { uSpec1: { value: cap ? .05 : .1 }, uSpec2: { value: cap ? .12 : .18 } };
  m.userData.hair = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute vec3 aTan;\nattribute vec2 aVar;\nvarying vec3 vTan;\nvarying vec2 vVar;\n' + sh.vertexShader.replace('#include <skinnormal_vertex>', `#include <skinnormal_vertex>
      vec3 hT = aTan;
      #ifdef USE_SKINNING
        hT = ( skinMatrix * vec4( hT, 0.0 ) ).xyz;
      #endif
      vTan = normalize( normalMatrix * hT ); vVar = aVar;`);
    sh.fragmentShader = 'varying vec3 vTan;\nvarying vec2 vVar;\nuniform float uSpec1;\nuniform float uSpec2;\nfloat hJit = 0.0;\nfloat hStr = 1.0;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        hJit = ( sampledDiffuseColor.r - 0.55 ) * 0.6; hStr = saturate( ( sampledDiffuseColor.r - 0.45 ) * 2.5 );
        diffuseColor.rgb *= vVar.x * ( 1.0 + vVar.y * 0.09 );`)
      .replace('#include <lights_lambert_pars_fragment>', `varying vec3 vViewPosition;
        struct LambertMaterial { vec3 diffuseColor; float specularStrength; };
        void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
          float nl = dot( geometryNormal, directLight.direction );
          reflectedLight.directDiffuse += saturate( ( nl + 0.4 ) / 1.4 ) * directLight.color * BRDF_Lambert( material.diffuseColor );
          vec3 Tt = normalize( vTan ), Hh = normalize( directLight.direction + geometryViewDir );
          float d1 = dot( normalize( Tt + geometryNormal * ( 0.10 + hJit ) ), Hh ), d2 = dot( normalize( Tt + geometryNormal * ( -0.14 + hJit ) ), Hh );
          float s1 = pow( max( 0.0, 1.0 - d1 * d1 ), 72.0 ), s2 = pow( max( 0.0, 1.0 - d2 * d2 ), 12.0 );
          float vis = saturate( nl * 0.75 + 0.3 ) * vVar.x * vVar.x;
          // el claro (blanco) se apaga donde la textura no tiene hebra; el segundo toma el color del pelo. En pelo claro
          // (rubio, canoso, el gris del maniquí) los dos son más suaves: si no, se ve metálico
          float lum = dot( material.diffuseColor, vec3( 0.299, 0.587, 0.114 ) ), soft = 1.0 / ( 1.0 + 9.0 * lum );
          reflectedLight.directSpecular += directLight.color * vis * ( s1 * uSpec1 * ( 0.35 + hStr ) * ( 0.25 + 0.75 * soft ) + s2 * uSpec2 * material.diffuseColor * 3.5 * soft );
        }
        void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
          reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
        }
        #define RE_Direct RE_Direct_Lambert
        #define RE_IndirectDiffuse RE_IndirectDiffuse_Lambert`)
      .replace('vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;', 'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + totalEmissiveRadiance;');
  };
  m.customProgramCacheKey = () => 'pelo-kk';
  return m;
}
/* sombra de los mechones con la forma de las hebras (recorte por la misma textura); una sola para todas las figuras */
let PELO_SH = null;
function peloShadowMats(map) {
  if (PELO_SH && PELO_SH.map === map) return PELO_SH;
  const T = THREE;
  return (PELO_SH = { map, depth: new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map, alphaTest: .3, side: T.DoubleSide }), dist: new T.MeshDistanceMaterial({ map, alphaTest: .3, side: T.DoubleSide }) });
}
/* contorno del pelo: el de la figura, pero cada vértice dice cuánto (aOl: en las puntas casi nada) y hacia dónde (aOn).
   Además se dibuja unos milímetros más atrás (solo en profundidad, no se corre en la imagen): el pelo tiene capas
   pegadas unas a otras y, si no, el contorno de las de abajo asoma entre las de arriba como manchas negras. Así queda la
   silueta del peinado contra el fondo y el cuerpo, y por dentro el pelo se ve como una sola masa */
const PELO_OL_D = { value: .01 };
function peloOutline(A) {
  if (A.mats.peloOl) return A.mats.peloOl;
  const m = fig3dOutline(A.infl), base = m.onBeforeCompile;
  m.onBeforeCompile = sh => {
    base(sh); sh.uniforms.uOD = PELO_OL_D;
    sh.vertexShader = 'attribute float aOl;\nattribute vec3 aOn;\nuniform float uOD;\n' + sh.vertexShader.replace('* max( uOW, oPx );', '* max( uOW, oPx ) * aOl;').replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3( aOn );')
      .replace('gl_Position = projectionMatrix * mvPosition;', 'gl_Position = projectionMatrix * mvPosition;\n\t{ vec4 pb = projectionMatrix * vec4( mvPosition.xy, mvPosition.z - uOD, 1.0 ); gl_Position.z = pb.z / pb.w * gl_Position.w; }');
  };
  m.customProgramCacheKey = () => 'fig3d-outline-pelo2';
  return (A.mats.peloOl = m);
}
/* el peinado en una figura: reemplaza los peinados que traía el maniquí y arma los nuevos cuando se eligen (hat: la
   gorra, el gorro, el sombrero o el casco que lleva puesto, que aplasta el pelo de arriba) */
function peloWear(A, key, hat) {
  const M = A.meshes, mode = peloSync();
  if (A.peloMode !== mode) { A.peloMode = mode; A.peloInit = false; }   // cambió la manera de dibujarlo: se rehace
  if (!A.peloInit) {
    A.peloInit = true;
    for (const k of Object.keys(M)) if (k.startsWith('pelo_')) { const g = M[k].g; if (g.parent) g.parent.remove(g); delete M[k]; }
  }
  const mk = key && key !== 'ninguno' ? 'pelo_' + key + (hat ? '~' + hat : '') : '';
  if (mk && !M[mk]) {
    const geo = peloGeo(A.fig, key, hat);
    if (geo) {
      const T = THREE, g = new T.Group(); g.name = mk;
      if (!A.mats.pelo) A.mats.pelo = fig3dInflate(new T.MeshToonMaterial({ color: '#B9B2A7', gradientMap: fig3dGradientSoft() }), A.infl, 'fig3d-toon-m');
      const ident = new T.Matrix4();
      if (PELO_CARDS) {
        // tarjetas: material liviano con brillo a lo largo de las hebras, recorte por transparencia, de las dos caras; sin contorno
        const tx = peloTextures();
        if (!A.mats.peloCard) { A.mats.peloCap = peloMat(tx.cap, true); A.mats.peloCard = peloMat(tx.cards, false); }
        const mk = (gg, mat, cast) => {
          const m = new T.SkinnedMesh(gg, mat);
          m.bind(A.skeleton, ident); m.frustumCulled = false; m.boundingSphere = new T.Sphere(new T.Vector3(0, .9, 0), 2.4);
          m.castShadow = cast; m.receiveShadow = true; g.add(m); return m;
        };
        // el casquete va pegado al cráneo: su sombra es la de la cabeza (no se calcula dos veces). Los mechones dan
        // sombra con la forma de las hebras (antes, láminas enteras: manchas oscuras en la cara y las patillas)
        if (geo.cap) mk(geo.cap, A.mats.peloCap, false);
        const mm = geo.cards && mk(geo.cards, A.mats.peloCard, true);
        if (mm) { const D = peloShadowMats(tx.cards); mm.customDepthMaterial = D.depth; mm.customDistanceMaterial = D.dist; }
        A.body.add(g);
        M[mk] = { g, m: mm || g.children[0], o: null, morphs: null };
      } else {
        const m = new T.SkinnedMesh(geo, A.mats.pelo), o = new T.SkinnedMesh(geo, peloOutline(A));
        for (const x of [m, o]) { x.bind(A.skeleton, ident); x.frustumCulled = false; x.boundingSphere = new T.Sphere(new T.Vector3(0, .9, 0), 2.4); }
        m.castShadow = m.receiveShadow = true;
        g.add(o); g.add(m); A.body.add(g);
        M[mk] = { g, m, o, morphs: null };
      }
    }
  }
  for (const k in M) if (k.startsWith('pelo_')) M[k].g.visible = k === mk;
}

/* ---------- elegir peinado: miniaturas 3D de cada uno (con el cuerpo, el tono y el color del personaje) ---------- */
const PELO_THUMBS = new Map();
let PELO_Q = [], PELO_RUN = false;
const peloThumbKey = (look, st) => [typeof fig3dBody === 'function' ? fig3dBody(look.body || 'hombre') : look.body, look.tono || '', look.peloColor || '', st, peloSync()].join('|');
function peloThumb(look, st) {
  const k = peloThumbKey(look, st);
  if (PELO_THUMBS.has(k)) return PELO_THUMBS.get(k);
  if (!PELO_Q.some(q => q.k === k)) PELO_Q.push({ k, pel: st, look: { body: look.body, tono: look.tono, peloColor: look.peloColor, pelo: st } });
  peloPump();
  return '';
}
const peloThumbId = k => 'pelo-th.' + hash53((typeof THV !== 'undefined' ? THV : '') + '|' + k);
function peloThumbSet(k, url) {
  PELO_THUMBS.set(k, url);
  if (PELO_THUMBS.size > 300) PELO_THUMBS.delete(PELO_THUMBS.keys().next().value);
  for (const im of document.querySelectorAll('img[data-pthumb]')) if (im.dataset.pthumb === k && url) im.src = url;
}
function peloPump() {
  if (PELO_RUN || !PELO_Q.length) return;
  PELO_RUN = true;
  const step = () => {
    const job = PELO_Q[0];
    if (!job) { PELO_RUN = false; return; }
    const body = job.look.body || 'hombre';
    if (typeof FIG3D === 'undefined' || FIG3D.failed || !r3Init()) { PELO_Q = []; PELO_RUN = false; return; }
    if (!FIG3D.has(body)) { FIG3D.want(body); setTimeout(step, 250); return; }
    const tw = job.pel !== 'ninguno' && peloTexReady(); if (tw) { tw.then(() => requestAnimationFrame(step)); return; }
    // ya guardada en este navegador: no se dibuja
    if (!job.asked && typeof TCACHE !== 'undefined') {
      const L = PELO_Q.filter(j => !j.asked); L.forEach(j => { j.asked = true; });   // todas las pendientes, de una vez
      TCACHE.get(L.map(j => peloThumbId(j.k))).then(m => {
        for (const j of L) { const r = m.get(peloThumbId(j.k)); if (r && r.u) { PELO_Q = PELO_Q.filter(x => x !== j); peloThumbSet(j.k, r.u); } }
        requestAnimationFrame(step);
      });
      return;
    }
    PELO_Q.shift();
    let url = '';
    try {
      const S = 112, c = document.createElement('canvas'); c.width = c.height = S;
      const g = c.getContext('2d');
      const s3 = { v: 1, set: 'vacio', aim: null, shake: 0, objs: [{ id: '__pelo', kind: 'actor', name: '', look: job.look }],
        keys: [{ t: 0, ease: 'suave', cam: { x: 0, z: 2, h: 1.5, yaw: 0, pitch: 0, roll: 0, lens: 50 }, o: { __pelo: { x: 0, z: 0, rot: 28, expr: 'neutral', pose: 'pie' } } }] };
      // los ojos del cuerpo articulado (a la estatura del personaje): la cabeza queda centrada aunque esté girada
      const tp = FIG3D.tpl[fig3dBody(body)], L0 = lookOf(s3.objs[0]), k = L0.height / ((tp.meta && tp.meta.height) || 1.7), ey = tp.meta && tp.meta.eye ? tp.meta.eye : [0, 1.6, .08];
      const vf = vfovFor(50, 1), eh = ey[1] * k, hk = Math.max(.7, k);
      s3.keys[0].cam = { x: Math.sin(peloDeg(28)) * ey[2] * k * .8, z: (.41 * hk / 2) / Math.tan(vf / 2), h: eh + .022 * hk, yaw: 0, pitch: 0, roll: 0, lens: 50 };
      g.fillStyle = '#EEF0F2'; g.fillRect(0, 0, S, S);
      r3Draw(g, s3, 0, S, S, { labels: false });
      url = c.toDataURL('image/jpeg', .86);
    } catch (e) { url = ''; }
    peloThumbSet(job.k, url);
    if (url && typeof TCACHE !== 'undefined') TCACHE.put(peloThumbId(job.k), url);
    // el editor del plano (si está abierto debajo) vuelve a dibujar su escena
    if (typeof EDT !== 'undefined' && EDT && EDT.redraw) EDT.redraw();
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
/* cuadrícula de peinados (attr: el atributo de los botones, p. ej. data-fk="pelo") */
function peloPicker(look, attr, dis = '') {
  const cur = look.pelo || 'ninguno';
  return `<div class="pelo-grid" role="group" aria-label="Peinado">${S3_PELO.map(([k, n]) => { const u = peloThumb(look, k); return `<button class="pelo-it" ${attr} data-v="${k}" aria-pressed="${ea(k === cur)}" title="${n}" ${dis}><img data-pthumb="${esc(peloThumbKey(look, k))}" src="${ea(u || 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==')}" alt=""><span>${n}</span></button>`; }).join('')}</div>`;
}
/* colores de pelo (el primero: el tono del maniquí, más oscuro) */
function peloColors(look, attr, dis = '') {
  const cur = (look.peloColor || '').toLowerCase(), tone = (FIG3D_TONOS[look.tono] || look.tono || FIG3D_TONOS.neutro);
  const dark = typeof THREE !== 'undefined' ? '#' + new THREE.Color(tone).multiplyScalar(.62).getHexString() : '#8A847C';
  return `<div class="sws">${PELO_COLORES.map(([c, n]) => `<button class="sw${ea(c ? '' : ' sw-tone')}" style="--sw:${ea(c || dark)}" ${attr} data-v="${ea(c)}" aria-pressed="${ea(c.toLowerCase() === cur)}" title="${n}" aria-label="Pelo ${ea(n.toLowerCase())}" ${dis}></button>`).join('')}</div>`;
}
