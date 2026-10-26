/* ============================================================
   VEHÍCULOS · carrocerías de perfil real
   Cada auto se arma a partir de su perfil lateral: la carrocería baja (con los pasos de rueda recortados),
   la cabina encima, las ventanas, el parabrisas y la luneta, llantas con aro, luces, parachoques, espejos
   y manijas. Con ese mismo armado salen el auto, el taxi, el patrullero, la pick-up, la SUV, el deportivo,
   la limosina y la van. El autobús, la bicicleta, el triciclo y los aviones tienen su propio armado.
   El auto (y el taxi y el patrullero) y la pick-up van huecos, con lunas transparentes y el interior completo
   (s3d-cabinas.js): son los mismos del escenario «Interior de vehículo».
   El frente mira hacia +z (como el resto de los objetos) y el piso es y = 0.
   ============================================================ */
const VEH_PAINT = {
  auto: '#7D8C9C', taxi: '#E9B932', patrullero: '#F1F1EE', suv: '#5B6A5E', pickup: '#B9BDC2', deportivo: '#B8322B', limosina: '#25272B',
  van: '#E8E6E0', bus: '#E2A53A', bici: '#2F6FA6', triciclo: '#2E7FB8', avioneta: '#F2F1ED', avion: '#F4F4F2', caza: '#8B939C',
};
const VEH_COLORS = ['#F1F1EE', '#B9BDC2', '#7D8C9C', '#25272B', '#B8322B', '#E9B932', '#2F5D8C', '#3F7D4E', '#6B4F3A', '#D97A2B'];
const VEH_KINDS = new Set(Object.keys(VEH_PAINT));
const isVehicle = k => VEH_KINDS.has(k);
Object.assign(S3_PROPS, {
  taxi: { name: 'Taxi', w: 1.8, d: 4.5, cat: 'vehiculo' }, patrullero: { name: 'Patrullero', w: 1.8, d: 4.5, cat: 'vehiculo' },
  suv: { name: 'SUV / camioneta', w: 1.95, d: 4.75, cat: 'vehiculo' }, pickup: { name: 'Pick-up doble cabina', w: 1.88, d: 5.3, cat: 'vehiculo' }, deportivo: { name: 'Auto deportivo', w: 1.95, d: 4.45, cat: 'vehiculo' },
  limosina: { name: 'Limosina', w: 1.85, d: 7.6, cat: 'vehiculo' }, van: { name: 'Van', w: 1.96, d: 5.15, cat: 'vehiculo' },
  bus: { name: 'Autobús', w: 2.5, d: 11, cat: 'vehiculo' }, bici: { name: 'Bicicleta', w: .6, d: 1.75, cat: 'vehiculo' },
  triciclo: { name: 'Triciclo de carga', w: 1.2, d: 2.2, cat: 'vehiculo' }, avioneta: { name: 'Avioneta', w: 11, d: 8.2, cat: 'vehiculo' },
  avion: { name: 'Avión de pasajeros', w: 32, d: 30, cat: 'vehiculo' }, caza: { name: 'Avión de combate', w: 10.4, d: 15.5, cat: 'vehiculo' },
});
function vehMats() {
  if (R3.mats.vGlass) return R3.mats;
  const P = (c, s, sp) => new THREE.MeshPhongMaterial({ color: c, shininess: s, specular: sp });
  Object.assign(R3.mats, {
    vGlass: P('#3B4856', 60, '#6F8295'), vChrome: P('#C9CDD2', 70, '#FFFFFF'), vRim: P('#B4B8BE', 50, '#E6E9EC'),
    vTire: toon('#2E3034'), vTrim: toon('#36383C'), vUnder: toon('#1E1F22'), vLampF: new THREE.MeshBasicMaterial({ color: '#FBF7EA' }),
    vLampR: toon('#C93A30'), vAmber: toon('#E39A2E'), vPlate: toon('#EFEDE6'), vSeat: toon('#4A4C52'), vRed: new THREE.MeshBasicMaterial({ color: '#E53935' }),
    vBlue: new THREE.MeshBasicMaterial({ color: '#2F6DE0' }), vNavy: toon('#1F2C44'), vBlack: toon('#1B1C1F'), vWhite: toon('#F3F2EE'),
  });
  return R3.mats;
}
/* texto pintado (POLICÍA, TAXI) en un lienzo, como textura */
function vehText(txt, w, h, color = '#111', bg = null, font = 800) {
  return geoOnce('vt|' + txt + w + h + color + bg, () => {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
    const g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${font} ${Math.round(c.height * .72)}px Archivo, Arial, sans-serif`;
    let fs = c.height * .72; while (g.measureText(txt).width > c.width * .92 && fs > 8) { fs -= 2; g.font = `${font} ${fs}px Archivo, Arial, sans-serif`; }
    g.fillText(txt, c.width / 2, c.height / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const geo = new THREE.PlaneGeometry(w, h); geo.userData.tex = t; return geo;
  });
}
const vehTextMesh = (txt, w, h, color, bg) => {
  const geo = vehText(txt, w, h, color, bg);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: geo.userData.tex, transparent: !bg, alphaTest: bg ? 0 : .3 }));
  m.userData.noOutline = true; return m;
};
/* ---------- perfiles ---------- */
/* esquinas redondeadas: cada pasada corta las esquinas del contorno (Chaikin) */
function vehSmooth(pts, n = 2, k = .22) {
  for (let it = 0; it < n; it++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], [a[0] + (b[0] - a[0]) * (1 - k), a[1] + (b[1] - a[1]) * (1 - k)]);
    }
    pts = out;
  }
  return pts;
}
/* una figura plana (z hacia adelante, y hacia arriba) extruida a lo ancho (x), centrada y con bordes redondeados */
function vehExtrude(key, pts, width, bev = .05) {
  return geoOnce('vx|' + key, () => {
    const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
    const bt = Math.min(bev, width * .3);
    const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(.01, width - 2 * bt), bevelEnabled: bev > 0, bevelThickness: bt, bevelSize: bt, bevelOffset: -bt, bevelSegments: 3, curveSegments: 6 });
    g.rotateY(-Math.PI / 2);
    g.computeBoundingBox(); const bb = g.boundingBox; g.translate(-(bb.min.x + bb.max.x) / 2, 0, 0);
    g.computeVertexNormals();
    return g;
  });
}
/* perfil de la carrocería baja con los pasos de rueda recortados */
function vehLowerProfile(S) {
  const { L, yb, wr, ra, wheels, hoodF, hoodR, belt, deckR, nose, tail } = S;
  const pts = [], zf = L / 2, zr = -L / 2;
  pts.push([zr + tail * .6, yb]);
  for (const zc of [...wheels].sort((a, b) => a - b)) {
    const a = Math.asin(clamp((wr - yb) / ra, -1, 1));
    for (let i = 0; i <= 12; i++) { const th = Math.PI + a - (Math.PI + 2 * a) * i / 12; pts.push([zc + ra * Math.cos(th), wr + ra * Math.sin(th)]); }
  }
  pts.push([zf - nose * .5, yb], [zf, yb + nose * .9], [zf, hoodF - .04], [zf - .06, hoodF]);
  pts.push([S.zWs, hoodR]);                         // capó hasta la base del parabrisas
  pts.push([S.zWs - .05, belt], [S.zRw + .05, belt]);  // línea de cintura
  pts.push([S.zRw, deckR], [zr + .1, deckR - .02], [zr, deckR - .1], [zr, yb + tail * .9]);
  return pts;
}
/* perfil de la cabina (encima de la cintura) */
function vehCabinProfile(S) {
  const { belt, roof, zWs, zRf, zRr, zRw } = S, b = belt - .02;
  const pts = [[zWs - .05, b]];
  pts.push([zRf, roof - .03], [zRf - .12, roof]);
  for (let i = 1; i < 6; i++) { const z = zRf - .12 + (zRr + .12 - (zRf - .12)) * i / 6; pts.push([z, roof + .015 * Math.sin(Math.PI * i / 6)]); }
  pts.push([zRr + .12, roof], [zRr, roof - .03], [zRw + .05, b]);
  return pts;
}
/* ventanas laterales: el contorno de la cabina hacia adentro, partido por los pilares */
function vehSideWindows(S, n) {
  const { belt, roof, zWs, zRf, zRr, zRw } = S;
  const y0 = belt + .035, y1 = roof - .055;
  const fz = y => zWs + (zRf - zWs) * (y - belt) / (roof - belt) - .075;   // pilar A
  const rz = y => zRw + (zRr - zRw) * (y - belt) / (roof - belt) + .075;   // pilar C
  const zA0 = fz(y0), zA1 = fz(y1), zC0 = rz(y0), zC1 = rz(y1);
  const out = [], pil = .07;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const lerp = (a, b, t) => a + (b - a) * t;
    const b0 = lerp(zC0, zA0, t0) + (i ? pil / 2 : 0), b1 = lerp(zC0, zA0, t1) - (i < n - 1 ? pil / 2 : 0);
    const u0 = lerp(zC1, zA1, t0) + (i ? pil / 2 : 0), u1 = lerp(zC1, zA1, t1) - (i < n - 1 ? pil / 2 : 0);
    out.push([[b0, y0], [b1, y0], [u1, y1], [u0, y1]]);
  }
  return out;
}
/* ---------- autos ---------- */
const VEH_CARS = {
  // L largo, W ancho, roof alto, wr radio de rueda, yb altura del piso, wheels (centros en z), hoodF/hoodR alto del capó
  // adelante y en el parabrisas, belt cintura, deckR alto de la maletera, zWs/zRf/zRr/zRw: base del parabrisas, techo
  // adelante y atrás, base de la luneta; win ventanas por lado
  // por dentro (s3d-cabinas.js): fh alto del cojín de los asientos; rows filas [z de la cadera, [x de cada puesto]] (la
  // primera x maneja: a la izquierda, +x); hb hasta dónde llega la cabina hueca (atrás, la maletera es maciza); bed la
  // tolva abierta de la pick-up [atrás, adelante]; hollow: el objeto del menú también va hueco
  auto: { L: 4.6, W: 1.8, roof: 1.47, wr: .32, yb: .26, wheels: [-1.42, 1.32], hoodF: .76, hoodR: .93, belt: .95, deckR: .97, zWs: .92, zRf: .14, zRr: -1.3, zRw: -1.84, nose: .3, tail: .28, win: 2,
    hollow: true, fh: .48, rows: [[-.28, [.37, -.37]], [-1.22, [.4, -.4, 0]]], hb: -1.62 },
  taxi: { base: 'auto' }, patrullero: { base: 'auto' },
  suv: { L: 4.75, W: 1.92, roof: 1.76, wr: .37, yb: .36, wheels: [-1.45, 1.42], hoodF: .98, hoodR: 1.1, belt: 1.13, deckR: 1.18, zWs: 1.12, zRf: .52, zRr: -2.05, zRw: -2.28, nose: .34, tail: .3, win: 3, boxy: true,
    fh: .7, rows: [[-.05, [.38, -.38]], [-1.02, [.42, -.42, 0]]] },
  pickup: { L: 5.3, W: 1.86, roof: 1.82, wr: .38, yb: .42, wheels: [-1.68, 1.52], hoodF: 1.02, hoodR: 1.13, belt: 1.17, deckR: 1.18, zWs: 1.05, zRf: .45, zRr: -.95, zRw: -1.06, nose: .36, tail: .24, win: 2,
    hollow: true, fh: .76, rows: [[0, [.38, -.38]], [-.7, [.4, -.4, 0]]], bed: [-2.57, -1.13] },
  deportivo: { L: 4.45, W: 1.95, roof: 1.18, wr: .34, yb: .16, wheels: [-1.38, 1.33], hoodF: .62, hoodR: .8, belt: .82, deckR: .86, zWs: .78, zRf: -.15, zRr: -.75, zRw: -1.55, nose: .2, tail: .22, win: 1, spoiler: true },
  limosina: { L: 7.6, W: 1.85, roof: 1.47, wr: .33, yb: .25, wheels: [-2.6, 2.75], hoodF: .78, hoodR: .94, belt: .96, deckR: .97, zWs: 2.05, zRf: 1.3, zRr: -2.25, zRw: -2.8, nose: .3, tail: .28, win: 4 },
  van: { L: 5.15, W: 1.96, roof: 2.12, wr: .35, yb: .3, wheels: [-1.8, 1.65], hoodF: .95, hoodR: 1.08, belt: 1.12, deckR: 2.0, zWs: 1.95, zRf: 1.45, zRr: -2.5, zRw: -2.53, nose: .32, tail: .2, win: 3, boxy: true,
    fh: .74, rows: [[1.0, [.42, -.42]], [-.02, [.56, 0, -.56]], [-1.0, [.56, 0, -.56]]] },
};
const vehSpec = k => { const s = VEH_CARS[k] || VEH_CARS.auto; return s.base ? { ...VEH_CARS[s.base] } : { ...s }; };
function vehWheel(par, M, x, y, z, wr, tw, sporty) {
  const g = new THREE.Group(); g.position.set(x, y, z); par.add(g);
  const tire = geoOnce('vtire' + wr + tw, () => {
    const r0 = wr * (sporty ? .72 : .66), b = tw * .28, pts = [];
    const arc = (cx, cy, a0, a1) => { for (let i = 0; i <= 5; i++) { const a = a0 + (a1 - a0) * i / 5; pts.push(new THREE.Vector2(cx + Math.cos(a) * b, cy + Math.sin(a) * b)); } };
    pts.push(new THREE.Vector2(r0, -tw / 2)); arc(wr - b, -tw / 2 + b, -Math.PI / 2, 0); arc(wr - b, tw / 2 - b, 0, Math.PI / 2); pts.push(new THREE.Vector2(r0, tw / 2));
    const geo = new THREE.LatheGeometry(pts, 28); geo.rotateZ(Math.PI / 2); return geo;
  });
  const t = new THREE.Mesh(tire, M.vTire); g.add(t);
  const side = Math.sign(x) || 1, rr = wr * (sporty ? .72 : .66);
  const rim = new THREE.Mesh(rcyl(rr, tw * .7, .01, 24), M.vRim); rim.rotation.z = Math.PI / 2; g.add(rim);
  const dish = new THREE.Mesh(rcyl(rr * .88, .02, .006, 24), M.vTrim); dish.rotation.z = Math.PI / 2; dish.position.x = side * tw * .36; g.add(dish);
  for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(rbox(.025, rr * 1.7, rr * .26, .008), M.vRim); sp.rotation.x = i / 5 * Math.PI; sp.position.x = side * tw * .37; g.add(sp); }
  const hub = new THREE.Mesh(rcyl(rr * .22, .03, .008, 16), M.vChrome); hub.rotation.z = Math.PI / 2; hub.position.x = side * tw * .39; g.add(hub);
  return g;
}
/* o.hollow: hueco por dentro (el escenario «Interior de vehículo» lo pide para cualquier modelo); si no, lo que diga su
   ficha (el auto y la pick-up del menú, sí) */
function vehCar(kind, inner, paint, o = {}) {
  const M = vehMats(), T = THREE, S = vehSpec(kind);
  S.ra = S.wr + .045;
  const put = (geo, m, x, y, z, par = inner) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
  const B = (w, h, d, x, y, z, m, r, par) => put(rbox(w, h, d, r ?? Math.min(.02, Math.min(w, h, d) * .3)), m, x, y, z, par);
  const W = S.W, cw = W - (S.boxy ? .06 : .14), tw = S.wr * .62, hollow = o.hollow ?? !!S.hollow;
  if (hollow) vehShell(kind, S, inner, paint);   // carrocería hueca, lunas transparentes y el interior (s3d-cabinas.js)
  else {
    put(vehExtrude(kind + 'lo', vehSmooth(vehLowerProfile(S), 2, .18), W, .08), paint, 0, 0, 0);
    put(vehExtrude(kind + 'cab', vehSmooth(vehCabinProfile(S), 2, S.boxy ? .12 : .2), cw, S.boxy ? .05 : .09), paint, 0, 0, 0);
    // ventanas laterales (vidrio que asoma apenas por los dos lados de la cabina)
    vehSideWindows(S, S.win).forEach((w, i) => put(vehExtrude(kind + 'w' + i, w, cw + .016, 0), M.vGlass, 0, 0, 0));
    // parabrisas y luneta: placas de vidrio sobre los planos inclinados, apenas por fuera
    const pane = (za, ya, zb, yb2, wid) => {
      const dz = zb - za, dy = yb2 - ya, L = Math.hypot(dz, dy);
      let nz = dy / L, ny = -dz / L; if (ny < 0) { nz = -nz; ny = -ny; }
      const o = B(wid, .012, L, 0, (ya + yb2) / 2 + ny * .012, (za + zb) / 2 + nz * .012, M.vGlass, .004);
      o.rotation.x = Math.atan2(-dy, dz); return o;
    };
    pane(S.zWs - .1, S.belt + .03, S.zRf + .03, S.roof - .05, cw - .16);
    pane(S.zRw + .08, S.belt + .03, S.zRr - .03, S.roof - .05, cw - .2);
  }
  // bajos oscuros (no se ve a través de los pasos de rueda) y forros de los guardabarros (hueco: los forros van por dentro)
  if (hollow) B(W - .3, .12, S.L - .5, 0, S.yb + .03, 0, M.vUnder, .04);
  else {
    B(W - .3, .22, S.L - .5, 0, S.yb + .08, 0, M.vUnder, .04);
    for (const zc of S.wheels) { const l = put(rcyl(S.wr + .03, W - 2 * tw - .06, .01, 20), M.vUnder, 0, S.wr, zc); l.rotation.z = Math.PI / 2; }
  }
  // ruedas
  for (const zc of S.wheels) for (const sx of [-1, 1]) vehWheel(inner, M, sx * (W / 2 - tw / 2 - .02), S.wr, zc, S.wr, tw, kind === 'deportivo');
  // parachoques, parrilla, luces y patentes
  const zf = S.L / 2, zr = -S.L / 2;
  B(W - .06, .16, .14, 0, S.yb + .1, zf - .1, M.vTrim, .05); B(W - .06, .16, .14, 0, S.yb + .12, zr + .1, M.vTrim, .05);
  B(W * (S.boxy ? .5 : .42), .15, .04, 0, S.hoodF - .17, zf - .045, M.vBlack, .02);
  for (const sx of [-1, 1]) {
    B(.36, .1, .05, sx * (W / 2 - .27), S.hoodF - .11, zf - .05, M.vLampF, .03);
    B(.07, .05, .04, sx * (W / 2 - .08), S.hoodF - .15, zf - .07, M.vAmber, .015);
    B(.34, .12, .05, sx * (W / 2 - .25), Math.min(S.deckR - .14, S.belt - .05), zr + .05, M.vLampR, .03);
    // espejos y manijas
    const mz = S.zWs - .18; B(.13, .09, .16, sx * (cw / 2 + .06), S.belt + .06, mz, paint, .03); B(.03, .05, .02, sx * (cw / 2 + .12), S.belt + .06, mz + .02, M.vBlack, .008);
    const doors = S.win > 1 ? [S.zWs - .55, (S.zWs - .55 + S.zRw) / 2 - .1] : [S.zWs - .7];
    for (const dz of doors) B(.02, .025, .13, sx * (W / 2 + .004), S.belt - .1, dz, M.vChrome, .008);
  }
  B(.36, .11, .015, 0, S.yb + .27, zf - .02, M.vPlate, .006); B(.36, .11, .015, 0, Math.min(S.deckR - .33, S.belt - .25), zr + .02, M.vPlate, .006);
  if (S.spoiler) { B(W - .3, .03, .22, 0, S.deckR + .16, zr + .18, paint, .012); for (const sx of [-.45, .45]) B(.04, .16, .06, sx, S.deckR + .07, zr + .2, M.vTrim, .01); }
  if (kind === 'suv') for (const sx of [-1, 1]) B(.04, .04, 1.7, sx * (cw / 2 - .1), S.roof + .05, S.zRf - .95, M.vTrim, .012);
  if (kind === 'van') { for (const sx of [-1, 1]) B(.012, S.belt - S.yb - .12, .02, sx * (W / 2 + .004), (S.belt + S.yb) / 2, S.zWs - 1.15, M.vBlack, .004); B(.015, 1.4, .02, 0, S.yb + .9, zr - .002, M.vBlack, .004); }
  if (kind === 'taxi') {
    const sign = B(.62, .16, .24, 0, S.roof + .1, S.zRf - .55, M.vWhite, .04);
    for (const sz of [-1, 1]) { const t = vehTextMesh('TAXI', .52, .12, '#1B1C1F'); t.position.set(0, S.roof + .1, S.zRf - .55 + sz * .122); if (sz < 0) t.rotation.y = Math.PI; inner.add(t); }
    for (const sx of [-1, 1]) { const st = B(.012, .07, S.zWs - S.zRw - .3, sx * (W / 2 + .006), S.belt - .22, (S.zWs + S.zRw) / 2, M.vBlack, .004); }
  }
  if (kind === 'patrullero') {
    // puertas oscuras, barra de luces y rotulado
    const dz = (S.zWs + S.zRw) / 2, dl = S.zWs - S.zRw - .1;
    for (const sx of [-1, 1]) {
      B(.012, .5, dl, sx * (W / 2 + .004), S.belt - .3, dz, M.vNavy, .006);
      const t = vehTextMesh('POLICÍA', 1.2, .2, '#F3F2EE'); t.position.set(sx * (W / 2 + .013), S.belt - .3, dz); t.rotation.y = sx * Math.PI / 2; inner.add(t);
    }
    B(1.12, .1, .26, 0, S.roof + .07, S.zRf - .5, M.vTrim, .03);
    B(.52, .09, .22, -.28, S.roof + .13, S.zRf - .5, M.vRed, .03); B(.52, .09, .22, .28, S.roof + .13, S.zRf - .5, M.vBlue, .03);
    const t2 = vehTextMesh('POLICÍA', .9, .16, '#1F2C44'); t2.position.set(0, S.hoodR + .012, S.zWs + .35); t2.rotation.x = -Math.PI / 2 + .1; inner.add(t2);
  }
  if (hollow) return;
  // interior apenas visible: asientos y volante (se maneja a la izquierda, +x)
  const seatY = S.yb + .25;
  for (const sx of [-.38, .38]) { B(.48, .12, .5, sx, seatY + .1, S.zWs - .9, M.vSeat, .04); B(.48, .55, .12, sx, seatY + .4, S.zWs - 1.15, M.vSeat, .04); }
  const st = new T.Mesh(new T.TorusGeometry(.17, .02, 6, 20), M.vBlack); st.position.set(.38, S.belt + .05, S.zWs - .45); st.rotation.x = -1.2; inner.add(st);
}
/* ---------- autobús ---------- */
function vehBus(inner, paint) {
  const M = vehMats(), T = THREE, put = (geo, m, x, y, z, par = inner) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
  const B = (w, h, d, x, y, z, m, r) => put(rbox(w, h, d, r ?? Math.min(.03, Math.min(w, h, d) * .3)), m, x, y, z);
  const L = 11, W = 2.5, H = 3.15, wr = .5, yb = .38, wheels = [-3.2, 3.6];

  const S = { L, yb, wr, ra: wr + .06, wheels, hoodF: H - .1, hoodR: H - .1, belt: H - .1, deckR: H - .1, zWs: L / 2 - .04, zRw: -L / 2 + .05, nose: .4, tail: .35 };
  const pts = vehLowerProfile({ ...S, zWs: L / 2 - .2, zRw: -L / 2 + .2 }).map(([z, y]) => [z, Math.min(y, H - .1)]);
  put(vehExtrude('buslo', pts, W, .12), paint, 0, 0, 0);
  B(W - .1, .12, L - .3, 0, H - .02, 0, M.vWhite, .06);
  // franja de ventanas a los dos lados y parabrisas grande
  for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) B(.03, .95, 1.18, sx * (W / 2 + .005), 2.05, -4.1 + i * 1.3 + (sx > 0 && i === 6 ? -.2 : 0), M.vGlass, .02);
  B(W - .25, 1.25, .04, 0, 1.95, L / 2 + .01, M.vGlass, .03); B(W - .4, .7, .04, 0, 2.15, -L / 2 - .01, M.vGlass, .03);
  B(.035, 2.2, .95, W / 2 + .01, 1.42, L / 2 - 1.05, M.vGlass, .02);   // puerta (lado derecho, adelante)
  B(W - .3, .32, .05, 0, H - .32, L / 2 + .01, M.vBlack, .02);
  const t = vehTextMesh('RUTA 21', 1.1, .2, '#F7C948'); t.position.set(0, H - .32, L / 2 + .04); inner.add(t);
  B(W - .3, .26, .2, 0, yb + .12, L / 2 + .02, M.vTrim, .06); B(W - .3, .26, .2, 0, yb + .12, -L / 2 - .02, M.vTrim, .06);
  for (const sx of [-1, 1]) { B(.3, .14, .05, sx * (W / 2 - .3), .78, L / 2 + .03, M.vLampF, .03); B(.24, .3, .05, sx * (W / 2 - .2), .95, -L / 2 - .03, M.vLampR, .03); B(.06, .5, .06, sx * (W / 2 + .1), 2.3, L / 2 - .1, M.vBlack, .02); }
  B(W - .3, .2, L - 1.2, 0, yb + .05, 0, M.vUnder, .05);
  for (const zc of wheels) { const l = put(rcyl(wr + .05, W - .7, .01, 20), M.vUnder, 0, wr, zc); l.rotation.z = Math.PI / 2; for (const sx of [-1, 1]) vehWheel(inner, M, sx * (W / 2 - .2), wr, zc, wr, .32, false); }
}
/* ---------- bicicleta y triciclo ---------- */
function vehTube(par, m, a, b, r) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), L = d.length();
  const o = new THREE.Mesh(rcyl(r, L, r * .4, 10), m); o.position.copy(A).add(Bv).multiplyScalar(.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); par.add(o); return o;
}
function vehBikeWheel(par, M, z, r, x = 0) {
  const g = new THREE.Group(); g.position.set(x, r, z); par.add(g);
  const tire = new THREE.Mesh(geoOnce('btire' + r, () => { const t = new THREE.TorusGeometry(r - .02, .022, 8, 36); t.rotateY(Math.PI / 2); return t; }), M.vTire); g.add(tire);
  const rim = new THREE.Mesh(geoOnce('brim' + r, () => { const t = new THREE.TorusGeometry(r - .05, .008, 6, 36); t.rotateY(Math.PI / 2); return t; }), M.vRim); g.add(rim);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; vehTube(g, M.vRim, [0, 0, 0], [0, Math.cos(a) * (r - .055), Math.sin(a) * (r - .055)], .0025); }
  const hub = new THREE.Mesh(rcyl(.025, .09, .006, 12), M.vChrome); hub.rotation.z = Math.PI / 2; g.add(hub);
  return g;
}
function vehBike(inner, paint) {
  const M = vehMats(), r = .34, zr = -.52, zf = .52;
  vehBikeWheel(inner, M, zr, r); vehBikeWheel(inner, M, zf, r);
  const BB = [0, .3, -.05], seat = [0, .82, -.2], head = [0, .86, .38], rear = [0, r, zr], front = [0, r, zf];
  vehTube(inner, paint, BB, seat, .019); vehTube(inner, paint, seat, head, .018); vehTube(inner, paint, BB, head, .021);
  for (const sx of [-.045, .045]) { vehTube(inner, paint, [sx, r, zr], [sx * .6, .3, -.05], .011); vehTube(inner, paint, [sx, r, zr], [sx * .5, .8, -.19], .011); vehTube(inner, paint, [sx, r, zf], [sx * .5, .88, .4], .013); }
  vehTube(inner, M.vChrome, [0, .82, -.2], [0, .95, -.23], .012);
  const sd = new THREE.Mesh(rbox(.14, .045, .26, .02), M.vBlack); sd.position.set(0, .97, -.25); inner.add(sd);
  vehTube(inner, M.vChrome, head, [0, 1.02, .34], .013);
  vehTube(inner, M.vChrome, [-.28, 1.02, .32], [.28, 1.02, .32], .012);
  for (const sx of [-.27, .27]) vehTube(inner, M.vBlack, [sx * .82, 1.02, .32], [sx, 1.02, .32], .016);
  const ring = new THREE.Mesh(geoOnce('bring', () => { const t = new THREE.TorusGeometry(.09, .01, 6, 24); t.rotateY(Math.PI / 2); return t; }), M.vChrome); ring.position.set(.05, .3, -.05); inner.add(ring);
  for (const s of [-1, 1]) { vehTube(inner, M.vChrome, [s * .06, .3, -.05], [s * .1, .3 - s * .13, -.05 + s * .05], .01); const p = new THREE.Mesh(rbox(.09, .02, .06, .008), M.vBlack); p.position.set(s * .14, .3 - s * .13, -.05 + s * .05); inner.add(p); }
}
function vehTrike(inner, paint) {
  // triciclo de carga peruano: caja adelante sobre dos ruedas, ciclista atrás
  const M = vehMats(), r = .3;
  vehBikeWheel(inner, M, -.75, r);
  for (const sx of [-.48, .48]) vehBikeWheel(inner, M, .55, r, sx);
  const box = new THREE.Group(); inner.add(box);
  const P = (w, h, d, x, y, z, m = paint) => { const o = new THREE.Mesh(rbox(w, h, d, .015), m); o.position.set(x, y, z); box.add(o); };
  P(1.05, .03, .9, 0, .52, .55); for (const sx of [-1, 1]) P(.03, .42, .9, sx * .52, .72, .55); P(1.05, .42, .03, 0, .72, 1); P(1.05, .42, .03, 0, .72, .1);
  P(1.1, .04, .95, 0, .94, .55, M.vTrim);
  vehTube(inner, paint, [-.48, r, .55], [.48, r, .55], .02);
  const BB = [0, .32, -.25], seat = [0, .85, -.45];
  vehTube(inner, paint, BB, seat, .02); vehTube(inner, paint, BB, [0, .55, .1], .024); vehTube(inner, paint, seat, [0, .62, .1], .02);
  for (const sx of [-.04, .04]) { vehTube(inner, paint, [sx, r, -.75], [0, .32, -.25], .012); vehTube(inner, paint, [sx, r, -.75], [0, .83, -.43], .012); }
  vehTube(inner, M.vChrome, [0, .55, .1], [0, 1.02, .02], .014); vehTube(inner, M.vChrome, [-.28, 1.02, .02], [.28, 1.02, .02], .012);
  const sd = new THREE.Mesh(rbox(.15, .05, .27, .02), M.vBlack); sd.position.set(0, .9, -.48); inner.add(sd);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(rbox(.09, .02, .06, .008), M.vBlack); p.position.set(s * .14, .32 - s * .13, -.25 + s * .05); inner.add(p); }
}
/* ---------- aviones ---------- */
function vehFuselage(key, L, R, noseL, tailL, tailUp = .3) {
  return geoOnce('fus|' + key, () => {
    const pts = [], N = 26;
    for (let i = 0; i <= N; i++) {
      const t = i / N, z = -L / 2 + t * L;
      let r = R;
      if (z > L / 2 - noseL) { const u = (z - (L / 2 - noseL)) / noseL; r = R * Math.sqrt(Math.max(0, 1 - u * u)); }
      if (z < -L / 2 + tailL) { const u = (-L / 2 + tailL - z) / tailL; r = R * (1 - u * .82); }
      pts.push(new THREE.Vector2(Math.max(.001, r), z));
    }
    const g = new THREE.LatheGeometry(pts, 24); g.rotateX(Math.PI / 2);
    // la cola sube un poco
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z < -L / 2 + tailL) p.setY(i, p.getY(i) + tailUp * R * ((-L / 2 + tailL - z) / tailL)); }
    g.computeVertexNormals(); return g;
  });
}
/* ala: perfil en planta (z hacia adelante, x a lo largo) con espesor, simétrica */
function vehWing(key, pts, th) {
  return geoOnce('wing|' + key, () => {
    const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: th * .45, bevelSize: th * .6, bevelOffset: -th * .6, bevelSegments: 2 });
    g.rotateX(Math.PI / 2); g.translate(0, th / 2, 0);
    g.computeVertexNormals(); return g;
  });
}
function vehPlane(kind, inner, paint) {
  const M = vehMats(), T = THREE, put = (geo, m, x, y, z, par = inner) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
  const B = (w, h, d, x, y, z, m, r) => put(rbox(w, h, d, r ?? Math.min(.03, Math.min(w, h, d) * .3)), m, x, y, z);
  const gear = (x, z, h, r) => { put(rcyl(.04 * r * 4, h, .01, 10), M.vTrim, x, h / 2 + r, z); const w = put(rcyl(r, r * .7, .02, 18), M.vTire, x, r, z); w.rotation.z = Math.PI / 2; };
  if (kind === 'avioneta') {
    const L = 8.2, R = .62, y0 = 1.25;
    put(vehFuselage('avioneta', L, R, 1.3, 3.2, .5), paint, 0, y0, 0);
    B(1.18, .55, 1.3, 0, y0 + .55, 1.2, M.vGlass, .2);
    put(vehWing('aw', [[-5.5, .7], [5.5, .7], [5.5, -.85], [-5.5, -.85]], .14), paint, 0, y0 + .9, 1.0);
    for (const sx of [-1, 1]) { const s = vehTube(inner, M.vTrim, [sx * .55, y0 - .25, 1.0], [sx * 2.6, y0 + .85, 1.0], .04); }
    put(vehWing('ah', [[-1.7, .4], [1.7, .4], [1.5, -.45], [-1.5, -.45]], .08), paint, 0, y0 + .3, -3.6);
    const fin = put(vehWing('af', [[0, 0], [1.5, -.2], [1.5, -1.0], [0, -1.3]], .08), paint, 0, y0 + .2, -3.0); fin.rotation.z = Math.PI / 2;
    put(rcyl(.16, .3, .05, 16), M.vTrim, 0, y0, L / 2 + .05).rotation.x = Math.PI / 2;
    for (const a of [0, Math.PI]) { const bl = B(.12, 1.8, .04, 0, y0, L / 2 + .2, M.vBlack, .02); bl.rotation.z = a + .4; }
    gear(0, 2.9, .7, .2); for (const sx of [-1, 1]) gear(sx * 1.1, .6, .75, .24);
    for (const sx of [-1, 1]) { const st = vehTextMesh('OB-1715', 1.6, .3, '#2F5D8C'); st.position.set(sx * (R + .01), y0 + .1, -1.3); st.rotation.y = sx * Math.PI / 2; inner.add(st); }
  } else if (kind === 'avion') {
    const L = 30, R = 1.95, y0 = 2.9;
    put(vehFuselage('avion', L, R, 3.6, 8, .6), paint, 0, y0, 0);
    for (const sx of [-1, 1]) for (let i = 0; i < 22; i++) B(.04, .32, .26, sx * (R - .04), y0 + .55, -9 + i * .95, M.vGlass, .004);
    B(2.2, .5, .9, 0, y0 + .9, L / 2 - 2.6, M.vGlass, .2);
    put(vehWing('jw', [[-16, -6.2], [-1.8, 2.8], [1.8, 2.8], [16, -6.2], [16, -7.6], [1.8, -2.4], [-1.8, -2.4], [-16, -7.6]], .4), paint, 0, y0 - .8, 2.4);
    for (const sx of [-1, 1]) {
      const e = put(rcyl(.95, 3.4, .25, 20, .8), M.vTrim, sx * 6.2, y0 - 1.75, 3.2); e.rotation.x = Math.PI / 2;
      const ei = put(rcyl(.78, .06, .02, 20), M.vBlack, sx * 6.2, y0 - 1.75, 4.92); ei.rotation.x = Math.PI / 2;
      B(.3, 1, 2.2, sx * 6.2, y0 - 1.1, 2.6, paint, .1);
    }
    put(vehWing('jh', [[-6, -3.2], [-.8, .6], [.8, .6], [6, -3.2], [6, -4.3], [.8, -2], [-.8, -2], [-6, -4.3]], .25), paint, 0, y0 + .9, -10.2);
    const fin = put(vehWing('jf', [[0, 0], [6.2, -3.2], [6.2, -4.8], [0, -5.8]], .3), paint, 0, y0 + 1.3, -9.4); fin.rotation.z = Math.PI / 2;
    B(.05, 2.2, 2.6, .17, y0 + 4.2, -13, M.vNavy, .05); B(.05, 2.2, 2.6, -.17, y0 + 4.2, -13, M.vNavy, .05);
    gear(0, L / 2 - 4.2, 1.6, .45); for (const sx of [-1, 1]) for (const dz of [-.3, .3]) gear(sx * 2.8, .5 + dz * 2, 1.4, .55);
    for (const sx of [-1, 1]) { const st = vehTextMesh('FILMSPIRIT AIR', 9, 1.1, '#1F2C44'); st.position.set(sx * (R + .02), y0 + 1.25, 2); st.rotation.y = sx * Math.PI / 2; inner.add(st); }
  } else {   // avión de combate
    const L = 15.5, R = .9, y0 = 1.75;
    put(vehFuselage('caza', L, R, 4.2, 2.5, 0), paint, 0, y0, 0);
    const can = put(rsph(1, 18), M.vGlass, 0, y0 + .72, 3.2); can.scale.set(.62, .55, 1.8);
    put(vehWing('cw', [[-.8, 2.5], [.8, 2.5], [5.2, -2.6], [5.2, -3.6], [-5.2, -3.6], [-5.2, -2.6]], .18), paint, 0, y0 - .1, -1.2);
    put(vehWing('ch', [[-.6, 0], [.6, 0], [2.6, -1.4], [2.6, -2.1], [-2.6, -2.1], [-2.6, -1.4]], .12), paint, 0, y0, -5.2);
    for (const sx of [-1, 1]) {
      const fin = put(vehWing('cf', [[0, 0], [2.5, -1.4], [2.5, -2.4], [0, -3.2]], .12), paint, sx * 1.0, y0 + .5, -3.9); fin.rotation.z = Math.PI / 2 - sx * .25;
      const intake = B(.75, .9, 3.2, sx * 1.1, y0 - .15, 1.3, paint, .2);
      B(.6, .7, .05, sx * 1.1, y0 - .15, 2.92, M.vBlack, .1);
      const noz = put(rcyl(.45, .9, .05, 16, .38), M.vTrim, sx * .48, y0, -L / 2 + .1); noz.rotation.x = -Math.PI / 2;
    }
    gear(0, 4.8, .9, .28); for (const sx of [-1, 1]) gear(sx * 1.4, -1.6, 1.0, .36);
    for (const sx of [-1, 1]) { const st = vehTextMesh('FAP 621', 2.2, .4, '#2F3238'); st.position.set(sx * (R + .02), y0 + .15, -2); st.rotation.y = sx * Math.PI / 2; inner.add(st); }
  }
}
/* el armado de cualquier vehículo; paint es el material de la pintura (propio de cada objeto) */
function vehBuild(kind, inner) {
  const paint = toon(VEH_PAINT[kind] || '#7D8C9C');
  if (VEH_CARS[kind]) vehCar(kind, inner, paint);
  else if (kind === 'bus') vehBus(inner, paint);
  else if (kind === 'bici') vehBike(inner, paint);
  else if (kind === 'triciclo') vehTrike(inner, paint);
  else vehPlane(kind, inner, paint);
  return paint;
}
