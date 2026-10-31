/* ============================================================
   CABINAS · vehículos huecos, con su interior
   El escenario «Interior de vehículo» (sedán, SUV, van, pick-up y bus urbano) y el auto y la pick-up del menú
   Vehículos se arman con su perfil real (s3d-vehiculos.js) pero huecos: costados finos, lunas transparentes,
   piso y techo con su forro. Adentro: tablero con instrumentos, volante con rayos y columna, consola con palanca
   y freno de mano, asientos con cabecera, paneles de puerta con apoyabrazos y manija, parasoles y retrovisor.
   Desde dentro se ve la pista; desde fuera, las figuras. La pintura va solo en la carrocería; el interior es
   neutro. El frente mira hacia +z y se maneja a la izquierda (+x), como en el Perú.
   ============================================================ */
function cabMats() {
  const M = vehMats();
  if (M.cSeat) return M;
  const B = c => new THREE.MeshBasicMaterial({ color: c });
  return Object.assign(M, {
    cSeat: toon('#4D5057'), cBus: toon('#4F5E73'), cDash: toon('#2D3035'), cTrim: toon('#5D6067'), cDoor: toon('#7B7E85'), cHead: toon('#D5D1C9'), cFloor: toon('#35373C'),
    cGauge: toon('#141619'), cDial: B('#E6EBEF'), cNeedle: B('#E2553E'), cScreen: B('#2A3C55'), cPole: toon('#C7CBD0'), cWall: toon('#C9CBCE'),
    // lunas: se ve a través (sin escribir profundidad: las figuras de adentro no se cortan)
    cGlass: new THREE.MeshPhongMaterial({ color: '#AFC6D6', transparent: true, opacity: .24, shininess: 90, specular: '#FFFFFF', depthWrite: false }),
  });
}
/* la parte de un perfil entre z0 y z1 (recorte de Sutherland–Hodgman con dos rectas verticales) */
function vehClipZ(pts, z0, z1) {
  const cut = (P, z, keep) => {
    const out = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], ia = keep(a[0]), ib = keep(b[0]);
      if (ia) out.push(a);
      if (ia !== ib) { const t = (z - a[0]) / (b[0] - a[0]); out.push([z, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  };
  return cut(cut(pts, z0, z => z >= z0), z1, z => z <= z1);
}
/* lo que queda de un lado de una recta (Sutherland–Hodgman): f(p) >= 0 */
function vehClipF(P, f) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
/* lo que queda macizo entre los tramos huecos */
function vehGaps(holes, a, b) {
  const out = []; let z = a;
  for (const [h0, h1] of [...holes].sort((p, q) => p[0] - q[0])) { if (h0 > z + .005) out.push([z, h0]); z = Math.max(z, h1); }
  if (b > z + .005) out.push([z, b]);
  return out;
}
/* una figura plana (z, y) con agujeros, extruida a lo ancho (x) y centrada */
function cabExtrude(key, pts, holes, width, bev = .01) {
  return geoOnce('cx|' + key, () => {
    const V = p => new THREE.Vector2(p[0], p[1]), sh = new THREE.Shape(pts.map(V));
    for (const h of holes || []) sh.holes.push(new THREE.Path(h.map(V)));
    const bt = Math.min(bev, width * .3);
    const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(.004, width - 2 * bt), bevelEnabled: bev > 0, bevelThickness: bt, bevelSize: bt, bevelOffset: -bt, bevelSegments: 2, curveSegments: 4 });
    g.rotateY(-Math.PI / 2);
    g.computeBoundingBox(); const bb = g.boundingBox; g.translate(-(bb.min.x + bb.max.x) / 2, 0, 0);
    g.computeVertexNormals();
    return g;
  });
}
/* un plano (x, y) con agujeros, de espesor d a lo largo de z (el frente y la cola del bus) */
function cabPanelXY(key, pts, holes, d) {
  return geoOnce('cp|' + key, () => {
    const V = p => new THREE.Vector2(p[0], p[1]), sh = new THREE.Shape(pts.map(V));
    for (const h of holes || []) sh.holes.push(new THREE.Path(h.map(V)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, -d / 2); g.computeVertexNormals();
    return g;
  });
}
const cabRect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const cabIn = (P, p) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
/* los vanos de las ventanas dentro del contorno redondeado de la cabina (si una esquina queda afuera, el vano no se
   corta): cada esquina se acerca al centro de su ventana hasta quedar 2 cm adentro; luego, esquinas suaves */
function cabFitHoles(outline, holes) {
  return holes.map(h => {
    const c = h.reduce((a, p) => [a[0] + p[0] / h.length, a[1] + p[1] / h.length], [0, 0]);
    const fit = h.map(p => { for (let s = 1; s > .3; s -= .02) { const q = [c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s], d = Math.hypot(p[0] - c[0], p[1] - c[1]) || 1, q2 = [q[0] + (p[0] - c[0]) / d * .02, q[1] + (p[1] - c[1]) / d * .02]; if (cabIn(outline, q) && cabIn(outline, q2)) return q; } return c; });
    return vehSmooth(fit, 1, .12);
  });
}
/* ---------- la carrocería hueca de un auto (perfil de VEH_CARS) ---------- */
function vehShell(kind, S, inner, paint) {
  const M = cabMats(), T = THREE, W = S.W, cw = W - (S.boxy ? .06 : .14), t = .035, ti = .022;
  const put = (geo, m, x, y, z, par = inner) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
  const B = (w, h, d, x, y, z, m, r) => put(rbox(w, h, d, r ?? Math.min(.02, Math.min(w, h, d) * .3)), m, x, y, z);
  const key = kind === 'taxi' || kind === 'patrullero' ? 'auto' : kind;
  const lo = vehSmooth(vehLowerProfile(S), 2, .18);
  // huecos: la cabina (del tablero hacia atrás) y la tolva de la pick-up
  const zf = S.zWs - .03, zb = S.hb ?? S.zRw + .03, floorY = S.yb + .06, tw = S.wr * .62;
  const holes = [[zb, zf], ...(S.bed ? [S.bed] : [])];
  // costados finos de punta a punta y, entre ellos, lo macizo: el capó con el motor, la maletera, el muro de la tolva
  for (const [a, b] of vehGaps(holes, -S.L / 2 - .1, S.L / 2 + .1)) {
    const P = vehClipZ(lo, a, b); if (P.length > 2) put(vehExtrude(key + 'm' + a.toFixed(2), P, W - 2 * t + .004, .035), paint, 0, 0, 0);
  }
  // piso de la cabina y de la tolva; forros de las ruedas que caen en lo hueco. Las figuras sentadas tienen los pies
  // 0,48 m bajo el cojín, más abajo que el piso: debajo de la cabina, entre las ruedas, una bandeja oscura los tapa
  // (desde afuera se ve como los bajos del auto)
  B(W - 2 * t, .06, zf - zb, 0, floorY - .03, (zf + zb) / 2, M.cFloor, .01);
  { const u0 = Math.max(.03, (S.fh || .48) - .56), u1 = floorY - .04; B(W - 2 * (tw + .06), u1 - u0, zf - zb - .1, 0, (u0 + u1) / 2, (zf + zb) / 2, M.vUnder, .03); }
  const bedY = S.bed ? S.wr * 2 + .1 : 0;
  if (S.bed) B(W - 2 * t, .04, S.bed[1] - S.bed[0], 0, bedY - .02, (S.bed[0] + S.bed[1]) / 2, M.cFloor, .01);
  for (const zc of S.wheels) for (const [h0, h1] of holes) {
    if (zc < h0 - .1 || zc > h1 + .1) continue;
    const inBed = S.bed && h0 === S.bed[0];
    for (const sx of [-1, 1]) {
      if (inBed) B(.24, bedY + .2 - S.wr, S.wr * 2.3, sx * (W / 2 - t - .12), (bedY + .2 + S.wr) / 2, zc, M.cFloor, .04);
      else { const h = put(rcyl(S.wr + .06, .18, .02, 18), M.cTrim, sx * (W / 2 - t - .09), S.wr, zc); h.rotation.z = Math.PI / 2; }
    }
  }
  // la cabina: costados con los vanos de las ventanas (pintura afuera, forro adentro), techo con su forro y lunas
  const cab = vehSmooth(vehCabinProfile(S), 2, S.boxy ? .12 : .2), raw = vehSideWindows(S, S.win), win = cabFitHoles(cab, raw);
  // las puertas: una por fila de asientos (hasta dos por lado), cada una con su ventana. Se cortan por los pilares (una
  // recta [z abajo, z arriba] de la ventana); abajo de la cintura, el corte es vertical. Bisagra adelante: se abren
  // girando hacia afuera, y su luna baja (envCarSync). Cerradas se ven como siempre
  const yA = raw[0][0][1], yB = raw[0][2][1], nd = Math.min(2, (S.rows || [0]).length, S.win);
  const pil = i => [(raw[i - 1][1][0] + raw[i][0][0]) / 2, (raw[i - 1][2][0] + raw[i][3][0]) / 2];
  const dr = [];
  for (let k = 0; k < nd; k++) { const j = S.win - 1 - k; dr.push({ k, j, rear: j ? pil(j) : [raw[j][0][0] - .03, raw[j][3][0] - .03], front: k ? pil(j + 1) : [raw[j][1][0] + .03, raw[j][2][0] + .03] }); }
  const side = (l, front) => p => (p[0] - (l[0] + (l[1] - l[0]) * (p[1] - yA) / (yB - yA))) * (front ? 1 : -1);
  const last = dr[dr.length - 1];
  // los tramos de adelante hacia atrás: lo fijo de adelante, cada puerta y lo fijo de atrás (con las ventanas que quedan)
  const segs = [{ id: 'F', za: dr[0].front[0], zb: S.L / 2 + .2, cut: P => vehClipF(P, side(dr[0].front, true)), wins: [] },
    ...dr.map(d => ({ id: 'D' + d.k, d, za: d.rear[0], zb: d.front[0], cut: P => vehClipF(vehClipF(P, side(d.front, false)), side(d.rear, true)), wins: [d.j] })),
    { id: 'R', za: -S.L / 2 - .2, zb: last.rear[0], cut: P => vehClipF(P, side(last.rear, false)), wins: win.map((_, i) => i).filter(i => i < last.j) }];
  const mov = { doors: [], wins: [] }, bySide = {};
  for (const sx of [-1, 1]) {
    bySide[sx] = segs.map(g => {
      let par = inner;
      if (g.d) {
        const piv = new T.Group(); piv.position.set(sx * W / 2, 0, g.zb); inner.add(piv);
        par = new T.Group(); par.position.set(-sx * W / 2, 0, -g.zb); piv.add(par);
        mov.doors.push({ piv, sx, i: g.d.k * 2 + (sx > 0 ? 0 : 1) });
      }
      const sk = key + g.id;
      const P = vehClipZ(lo, g.za, g.zb); if (P.length > 2) put(vehExtrude(sk + 'sd', P, t, .012), paint, sx * (W / 2 - t / 2), 0, 0, par);
      const Q = g.cut(cab), H = g.wins.map(i => win[i]);
      if (Q.length > 2) {
        put(cabExtrude(sk + 'cf', Q, H, t), paint, sx * (cw / 2 - t / 2), 0, 0, par);
        put(cabExtrude(sk + 'ci', Q, H, ti, .006), M.cTrim, sx * (cw / 2 - t - ti / 2 + .002), 0, 0, par);
      }
      for (const i of g.wins) { const m = put(vehExtrude(key + 'gw' + i, win[i], .008, 0), M.cGlass, sx * (cw / 2 - t / 2), 0, 0, par); if (g.d) mov.wins.push({ m, yA, i: g.d.k * 2 + (sx > 0 ? 0 : 1) }); }
      // el alféizar: cubre la ranura entre el costado bajo y la cabina, más angosta
      const a = Math.max(g.za, S.zRw + .01), b = Math.min(g.zb, S.zWs - .01), sw = (W - cw) / 2 + t + .01;
      if (b - a > .02) put(rbox(sw, .03, b - a - .006, .012), paint, sx * (W / 2 - sw / 2), S.belt - .005, (a + b) / 2, par);
      return { za: g.za, zb: g.zb, par };
    });
  }
  // lo de cada puerta (las manijas de afuera, el forro de adentro) va en su grupo
  const segAt = (sx, z) => (bySide[sx].find(g => z >= g.za && z < g.zb) || { par: inner }).par;
  inner.userData.mov = mov; inner.userData.segAt = segAt;
  const top = cab.filter(p => p[1] > S.roof - .07).sort((a, b) => b[0] - a[0]);
  if (top.length > 1) put(cabExtrude(key + 'rf', [...top, ...[...top].reverse().map(([z, y]) => [z, y - .05])], null, cw - .004, .012), paint, 0, 0, 0);
  B(cw - 2 * t - .02, .02, S.zRf - S.zRr - .05, 0, S.roof - .085, (S.zRf + S.zRr) / 2, M.cHead, .008);   // forro del techo
  // parabrisas y luneta, entre los dos costados de la cabina
  const pane = (za, ya, zb2, yb2, wid) => {
    const dz = zb2 - za, dy = yb2 - ya, L = Math.hypot(dz, dy);
    const o = put(rbox(wid, .008, L, .003), M.cGlass, 0, (ya + yb2) / 2, (za + zb2) / 2); o.rotation.x = Math.atan2(-dy, dz); return o;
  };
  pane(S.zWs - .07, S.belt + .01, S.zRf + .02, S.roof - .045, cw - 2 * t);
  pane(S.zRw + .07, S.belt + .01, S.zRr - .02, S.roof - .045, cw - 2 * t);
  vehInterior(S, inner, M, { floorY, cw, t, zb, segs: bySide, segAt });
}
/* ---------- el interior de un auto ---------- */
/* un asiento: base, cojín, respaldo reclinado y cabecera. w: ancho; heads: x de las cabeceras (banca trasera) */
function cabSeat(par, M, x, z, fh, floorY, w, heads, m = M.cSeat) {
  const T = THREE, put = (geo, mm, px, py, pz, p = par) => { const o = new T.Mesh(geo, mm); o.position.set(px, py, pz); p.add(o); return o; };
  // radios de 3 cm o menos: la caja redondeada sale con pocos triángulos (un bus tiene quince asientos)
  if (fh - .14 > floorY + .03) put(rbox(w * .8, fh - .14 - floorY, .4, .01), M.cDash, x, (floorY + fh - .14) / 2, z + .02);
  put(rbox(w, .14, .52, .03), m, x, fh - .07, z + .03);
  const back = new T.Group(); back.position.set(x, fh - .04, z - .24); back.rotation.x = -.17; par.add(back);
  put(rbox(w, .62, .13, .03), m, 0, .31, 0, back);
  for (const hx of heads || [x]) {
    put(rbox(.26, .17, .1, .03), m, hx - x, .74, -.01, back);
    for (const px of [-.06, .06]) put(rcyl(.008, .08, .002, 6), M.vChrome, hx - x + px, .63, -.01, back);
  }
}
/* un instrumento redondo del tablero (mira hacia −z, al conductor) */
function cabDial(par, M, x, y, z, r) {
  const T = THREE, ring = new T.Mesh(rcyl(r, .02, .006, 20), M.cGauge); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); par.add(ring);
  const face = new T.Mesh(rcyl(r * .8, .004, .001, 20), M.cDial); face.rotation.x = Math.PI / 2; face.position.set(x, y, z - .011); par.add(face); face.userData.noOutline = true;
  const nd = new T.Mesh(rbox(.006, r * .7, .003, .001), M.cNeedle); nd.position.set(x + r * .2, y + r * .12, z - .015); nd.rotation.z = -.9; par.add(nd); nd.userData.noOutline = true;
}
/* el volante: aro, tres rayos y el centro, inclinado hacia el conductor (tilt: de la vertical) */
function cabWheel(par, M, x, y, z, r, tilt) {
  const T = THREE, g = new T.Group(); g.position.set(x, y, z); g.rotation.x = tilt; par.add(g);
  g.add(new T.Mesh(geoOnce('vwheel' + r, () => new T.TorusGeometry(r, .022, 8, 28)), M.cDash));
  const hub = new T.Mesh(rcyl(r * .28, .05, .012, 16), M.cDash); hub.rotation.x = Math.PI / 2; g.add(hub);
  for (const a of [0, Math.PI, -Math.PI / 2]) { const s = new T.Mesh(rbox(r * .78, .032, .016, .008), M.cDash); s.position.set(Math.cos(a) * r * .55, Math.sin(a) * r * .55, 0); s.rotation.z = a; g.add(s); }
  return g;
}
/* dónde van el tablero (su cara, zd) y el volante (wz, wy) según la primera fila; big: la van, con el volante más
   echado, como un bus */
function cabLayout(S) {
  const rows = S.rows || [[S.zWs - 1.2, [.37, -.37]]], zF = rows[0][0], big = S.roof > 2, zd = Math.min(zF + (big ? .82 : .86), S.zWs - .3);
  return { rows, zF, xD: rows[0][1][0], big, zd, wz: Math.min(zF + (big ? .52 : .6), zd - .13), wy: (S.fh || .48) + (big ? .44 : .49) };
}
function vehInterior(S, inner, M, o) {
  const T = THREE, { floorY, cw, t, zb } = o, fh = S.fh || .48, { rows, zF, xD, big, zd, wz, wy } = cabLayout(S);
  const put = (geo, m, x, y, z, par = inner) => { const q = new T.Mesh(geo, m); q.position.set(x, y, z); par.add(q); return q; };
  const B = (w, h, d, x, y, z, m, r, par) => put(rbox(w, h, d, r ?? Math.min(.01, Math.min(w, h, d) * .3)), m, x, y, z, par);
  const belt = S.belt, iw = cw - 2 * t - .02, dd = S.zWs - .04 - zd;
  // tablero: el cuerpo, la visera de los instrumentos, la consola central con la pantalla y las salidas de aire
  B(iw, .3, dd, 0, belt - .1, zd + dd / 2, M.cDash, .03);
  B(iw - .16, .2, .22, 0, belt - .36, zd + .1, M.cDash, .03);
  B(.4, .05, .14, xD, belt + .03, zd + .05, M.cDash, .022);   // visera de los instrumentos
  cabDial(inner, M, xD - .09, belt - .015, zd - .005, .062); cabDial(inner, M, xD + .09, belt - .015, zd - .005, .062);
  B(.28, .32, .06, 0, belt - .2, zd - .01, M.cTrim, .02);
  { const sc = B(.2, .12, .008, 0, belt - .11, zd - .045, M.cScreen, .003); sc.userData.noOutline = true; }
  for (const x of [-.07, .07, -(iw / 2 - .1), iw / 2 - .1]) B(.08, .035, .012, x, belt - .03, zd - .046, M.cGauge, .006);
  B(.36, .15, .012, -xD * 1.05, belt - .18, zd - .006, M.cTrim, .02);   // guantera
  // volante con su columna
  const tilt = big ? .95 : .48;
  vehTube(inner, M.cDash, [xD, belt - .14, zd + .06], [xD, wy - .03, wz + .03], .032);
  cabWheel(inner, M, xD, wy, wz, big ? .2 : .18, tilt);
  // consola entre los asientos de adelante: palanca de cambios y freno de mano
  const ct = fh + .02;
  B(.22, ct - floorY, zd - zF + .1, 0, (ct + floorY) / 2, (zd + zF) / 2 - .05, M.cTrim, .03);
  B(.09, .02, .1, 0, ct + .01, zF + .3, M.cDash, .008);
  vehTube(inner, M.cDash, [0, ct + .01, zF + .3], [0, ct + .15, zF + .28], .009);
  put(rsph(.032, 14), M.cDash, 0, ct + .17, zF + .28);
  { const hb = B(.035, .035, .22, 0, ct + .05, zF + .04, M.cDash, .012); hb.rotation.x = -.32; }
  // asientos: los de adelante sueltos; atrás, bancas con una cabecera por puesto
  for (const x of rows[0][1]) cabSeat(inner, M, x, zF, fh, floorY, .5);
  for (const [z, xs] of rows.slice(1)) {
    const bw = Math.min(iw - .26, xs.length * .44 + .12);
    cabSeat(inner, M, 0, z, fh, floorY, bw, xs);
  }
  // paneles de puerta: forro, apoyabrazos, manija y parlante, en cada fila
  for (const sx of [-1, 1]) {
    const xp = sx * (S.W / 2 - t - .016), x2 = sx * (S.W / 2 - t - .055);
    // el forro, partido en las puertas (cada tramo va con la suya)
    const p0 = zb + .05, p1 = p0 + Math.max(.2, zd + .1 - zb - .05);
    for (const g of o.segs ? o.segs[sx] : [{ za: p0, zb: p1, par: inner }]) {
      const a = Math.max(p0, g.za), b = Math.min(p1, g.zb);
      if (b - a > .02) B(.03, belt - floorY - .03, b - a - (o.segs ? .006 : 0), xp, (belt + floorY) / 2 - .01, (a + b) / 2, M.cDoor, .012, g.par);
    }
    for (const [z] of rows) {
      const par = o.segAt ? o.segAt(sx, z + .2) : inner;
      B(.07, .045, .3, x2, fh + .17, z + .12, M.cTrim, .01, par);
      B(.016, .03, .1, sx * (S.W / 2 - t - .036), belt - .1, z + .4, M.vChrome, .006, par);
      const sp = put(rcyl(.055, .012, .003, 14), M.cGauge, sx * (S.W / 2 - t - .034), floorY + .16, z + .38, par); sp.rotation.z = Math.PI / 2;
    }
  }
  // parasoles y retrovisor
  for (const x of [xD, -xD]) { const v = B(.36, .018, .16, x * .95, S.roof - .1, S.zRf - .13, M.cHead, .008); v.rotation.x = .12; }
  vehTube(inner, M.cDash, [0, S.roof - .075, S.zRf - .06], [0, S.roof - .15, S.zRf - .09], .008);
  B(.23, .065, .035, 0, S.roof - .175, S.zRf - .1, M.cDash, .02);
  B(.21, .05, .004, 0, S.roof - .175, S.zRf - .12, M.vChrome, .002);
}
/* ---------- bus urbano (micro): solo para el escenario ----------
   Filas de 2 + 2 con pasillo, banca de 5 al fondo, pasamanos en el techo, barras verticales, puerta de subida a la
   derecha (adelante) con sus escalones y el chofer de relleno: una figura neutra, sin rostro, que es parte del bus */
const VEH_MICRO = { L: 8.8, W: 2.36, H: 2.95, wr: .46, yb: .4, fl: .78, fh: 1.22, wheels: [-2.6, 2.5], door: [3.2, 3.98], drv: [.6, 3.3], z0: 2.3, pitch: .82, rows: 7, back: -3.75 };
/* los puestos de los pasajeros: [x, z] (adelante, la fila 0) */
function microSeats() {
  const V = VEH_MICRO, xs = [.875, .435, -.435, -.875], out = [];
  for (let i = 0; i < V.rows; i++) for (const x of xs) out.push([x, round2(V.z0 - i * V.pitch)]);
  for (const x of [.9, .45, 0, -.45, -.9]) out.push([x, V.back]);
  return out;
}
function vehMicro(inner, paint) {
  const M = cabMats(), T = THREE, V = VEH_MICRO, { L, W, H, wr, yb, fl, fh } = V, t = .05, zf = L / 2, zr = -L / 2;
  const put = (geo, m, x, y, z) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); inner.add(o); return o; };
  const B = (w, h, d, x, y, z, m, r) => put(rbox(w, h, d, r ?? Math.min(.03, Math.min(w, h, d) * .3)), m, x, y, z);
  // costados: el perfil con los pasos de rueda, los vanos de las ventanas y, a la derecha (−x), la puerta
  const S = { L, yb, wr, ra: wr + .06, wheels: V.wheels, hoodF: H - .1, hoodR: H - .1, belt: H - .1, deckR: H - .1, zWs: zf - .2, zRw: zr + .2, nose: .4, tail: .35 };
  const side = vehSmooth(vehLowerProfile(S).map(([z, y]) => [z, Math.min(y, H - .06)]), 1, .15);
  const wy0 = fl + .8, wy1 = H - .32, bays = [];
  for (let z = zr + .45; z + .9 <= zf - .35; z += 1.02) bays.push([z, z + .92]);
  const winL = cabFitHoles(side, [...bays, [V.door[0], zf - .38]].map(([a, b]) => cabRect(a, wy0, b, wy1)));   // a la izquierda, también la del chofer
  const winR = cabFitHoles(side, bays.filter(([a, b]) => b < V.door[0] - .05 || a > V.door[1] + .05).map(([a, b]) => cabRect(a, wy0, b, wy1)));
  const [doorH] = cabFitHoles(side, [cabRect(V.door[0], yb + .1, V.door[1], H - .36)]);
  put(cabExtrude('microL', side, winL, t), paint, W / 2 - t / 2, 0, 0);
  put(cabExtrude('microR', side, [...winR, doorH], t), paint, -W / 2 + t / 2, 0, 0);
  // por dentro, forrado en gris claro (la pintura es solo de afuera)
  put(cabExtrude('microLi', side, winL, .02, .005), M.cWall, W / 2 - t - .012, 0, 0);
  put(cabExtrude('microRi', side, [...winR, doorH], .02, .005), M.cWall, -W / 2 + t + .012, 0, 0);
  for (const [sx, list] of [[1, winL], [-1, winR]]) list.forEach((w, i) => put(vehExtrude('mg' + sx + i, w, .01, 0), M.cGlass, sx * (W / 2 - t / 2), 0, 0));
  // la puerta: dos hojas con vidrio que se pliegan contra los costados del vano (abierta, como siempre) o se juntan al
  // medio (cerrada): envCarSync estira cada hoja desde su borde
  const leaves = [], lh = (V.door[1] - V.door[0]) / 2 - .03;
  for (const dz of [V.door[0] + .03, V.door[1] - .03]) {
    B(.04, H - .5 - yb, .06, -W / 2 - .05, (H - .36 + yb + .1) / 2, dz, M.vTrim, .015);
    const sg = dz > (V.door[0] + V.door[1]) / 2 ? -1 : 1, g = new T.Group(); g.position.set(-W / 2 - .07, 0, dz + sg * .02); inner.add(g);
    const q = (h, y, m) => { const o = new T.Mesh(rbox(.02, h, lh, .006), m); o.position.set(0, y, sg * lh / 2); g.add(o); };
    q(1.1, fl + 1.1, M.cGlass); q(fl + .55 - yb - .1, (fl + .55 + yb + .1) / 2, M.vTrim); q(H - .36 - fl - 1.65, (H - .36 + fl + 1.65) / 2, M.vTrim);
    leaves.push(g);
  }
  inner.userData.mov = { bus: leaves, lh };
  // frente y cola: con el parabrisas y la luneta
  const fr = cabRect(-W / 2 + .01, yb + .28, W / 2 - .01, H - .04), ws = cabRect(-W / 2 + .14, fl + .45, W / 2 - .14, H - .4);
  const rw = cabRect(-W / 2 + .3, fl + .95, W / 2 - .3, H - .45), fi = cabRect(-W / 2 + t + .02, yb + .3, W / 2 - t - .02, H - .1);
  put(cabPanelXY('microF', fr, [ws], t), paint, 0, 0, zf - t / 2);
  put(cabPanelXY('microB', fr, [rw], t), paint, 0, 0, zr + t / 2);
  put(cabPanelXY('microFi', fi, [ws], .02), M.cWall, 0, 0, zf - t - .012);
  put(cabPanelXY('microBi', fi, [rw], .02), M.cWall, 0, 0, zr + t + .012);
  B(W - .28, H - .4 - fl - .45, .012, 0, (fl + .45 + H - .4) / 2, zf - .02, M.cGlass, .004);
  B(W - .6, H - .45 - fl - .95, .012, 0, (fl + .95 + H - .45) / 2, zr + .02, M.cGlass, .004);
  // techo blanco, forro y piso (adelante el piso deja la puerta libre para los escalones)
  B(W - .02, .08, L - .06, 0, H - .04, 0, M.vWhite, .04);
  B(W - 2 * t - .04, .02, L - .2, 0, H - .13, 0, M.cHead, .008);
  B(W - 2 * t, .06, V.door[0] - .05 - zr, 0, fl - .03, (V.door[0] - .05 + zr) / 2, M.cFloor, .01);
  B(W - 2 * t - .62, .06, zf - V.door[0] + .05, .31, fl - .03, (zf + V.door[0] - .05) / 2, M.cFloor, .01);
  // los escalones de la puerta, macizos hasta abajo; los bajos, sin tapar la escalera
  for (const [x0, top] of [[0, .42], [.3, .6]]) B(.3, top - yb, V.door[1] - V.door[0] - .02, -W / 2 + t + x0 + .15, (top + yb) / 2, (V.door[0] + V.door[1]) / 2, M.cFloor, .01);
  B(W - 2 * t, .25, V.door[0] - .1 - zr - .2, 0, yb + .12, (V.door[0] - .1 + zr + .2) / 2, M.vUnder, .03);
  B(W / 2 - t + .51, .25, zf - V.door[0] - .1, (W / 2 - t - .51) / 2, yb + .12, (zf + V.door[0]) / 2, M.vUnder, .03);
  // forros de las ruedas por dentro y franja de colores por fuera
  for (const zc of V.wheels) for (const sx of [-1, 1]) B(.5, .26, 1.18, sx * (W / 2 - t - .25), fl + .1, zc, M.cTrim, .03);
  for (const sx of [-1, 1]) B(.012, .12, L - 1, sx * (W / 2 + .004), fl + .52, -.3, M.vWhite, .004);
  // asientos de a dos con su agarradera; banca de cinco al fondo
  for (let i = 0; i < V.rows; i++) {
    const z = V.z0 - i * V.pitch;
    for (const sx of [-1, 1]) {
      const xc = sx * .655;
      const hump = V.wheels.some(zc => Math.abs(zc - z) < .7) ? .06 : 0;
      cabSeat(inner, M, xc, z, fh + hump, fl, .9, [], M.cBus);
      vehTube(inner, M.cPole, [xc - .4, fh + hump + .6, z - .35], [xc + .4, fh + hump + .6, z - .35], .014);
    }
  }
  cabSeat(inner, M, 0, V.back, fh + .04, fl, W - 2 * t - .1, [], M.cBus);
  // pasamanos a lo largo del techo y barras verticales junto al pasillo (y en la puerta)
  for (const sx of [-1, 1]) {
    vehTube(inner, M.cPole, [sx * .42, H - .38, V.back + .3], [sx * .42, H - .38, V.door[0] - .1], .016);
    for (let z = V.back + .5; z < V.door[0]; z += 1.6) vehTube(inner, M.cPole, [sx * .42, H - .13, z], [sx * .42, H - .38, z], .008);
    for (let i = 1; i < V.rows; i += 2) { const z = V.z0 - i * V.pitch - .41; vehTube(inner, M.cPole, [sx * .2, fl, z], [sx * .2, H - .13, z], .018); }
  }
  for (const dz of V.door) vehTube(inner, M.cPole, [-W / 2 + .66, yb + .4, dz + (dz === V.door[0] ? -.06 : .06)], [-W / 2 + .66, H - .38, dz + (dz === V.door[0] ? -.06 : .06)], .018);
  // el puesto del chofer: tablero, volante grande casi echado, su asiento, una mampara y el chofer de relleno
  const [xd, zd] = V.drv;
  const zdf = zf - .5;   // la cara del tablero
  B(W - 2 * t, .42, zf - .05 - zdf, 0, fl + .45, (zf - .05 + zdf) / 2, M.cDash, .03);
  B(.62, .1, .24, xd, fl + .69, zdf + .1, M.cDash, .04);
  cabDial(inner, M, xd - .11, fl + .56, zdf - .005, .065); cabDial(inner, M, xd + .11, fl + .56, zdf - .005, .065);
  vehTube(inner, M.cDash, [xd, fl + .3, zdf + .05], [xd, fh + .4, zd + .48], .035);
  cabWheel(inner, M, xd, fh + .42, zd + .48, .24, 1.05);
  cabSeat(inner, M, xd, zd, fh - .02, fl, .52);
  B(.04, 1.05, W / 2 - .22, (W / 2 + .2) / 2 - .01, fl + .52, zd - .44, M.cTrim, .015);
  B(W / 2 - .2, 1.05, .04, (W / 2 + .2) / 2, fl + .52, zd - .44, M.cTrim, .015);
  if (typeof genteSimpleGeo === 'function') {
    try { put(genteSimpleGeo('maneja'), M.cDriver || (M.cDriver = toon('#9AA1AA')), xd, fh - .02 - .48, zd); } catch (e) { }
  }
  // por fuera: ruedas, parachoques, luces, letrero de ruta, espejos
  for (const zc of V.wheels) for (const sx of [-1, 1]) vehWheel(inner, M, sx * (W / 2 - .2), wr, zc, wr, .32, false);
  B(W - .1, .26, .2, 0, yb + .12, zf + .02, M.vTrim, .06); B(W - .1, .26, .2, 0, yb + .12, zr - .02, M.vTrim, .06);
  for (const sx of [-1, 1]) { B(.3, .14, .05, sx * (W / 2 - .3), fl + .05, zf + .01, M.vLampF, .03); B(.2, .3, .05, sx * (W / 2 - .2), fl + .2, zr - .01, M.vLampR, .03); B(.06, .55, .06, sx * (W / 2 + .1), H - .75, zf - .1, M.vBlack, .02); }
  B(W - .34, .26, .05, 0, H - .2, zf + .005, M.vBlack, .02);
  const tx = vehTextMesh('RUTA 21', 1.1, .2, '#F7C948'); tx.position.set(0, H - .2, zf + .035); inner.add(tx);
}
