/* ============================================================
   PLANTA GENERAL DE LA ESCENA · las cámaras de todos sus planos en una sola planta
   El lugar una vez (muros, interior, plano importado) y sus objetos; cada cámara con el código de su plano en un color
   por plano, el contorno de su cono y su lente; las figuras una vez y sus otras posiciones como puntos tenues con el
   código del plano; flechas finas para lo que se desplaza (figuras y cámaras). Las luces de cada plano no: estorban en
   una planta de varias cámaras; sí las de la escena. Desde aquí se agregan luces, objetos y animales a la escena
   (P.scEls, s3d-model.js): van en todos sus planos y se mueven, giran o quitan en todos a la vez. Al elegir una
   cámara, su viñeta aparece en una esquina. Se abre desde el Storyboard (cada escena) y desde la planta completa del
   editor de plano.
   ============================================================ */
/* un color por plano: fuertes sobre el fondo claro de la planta y distintos entre sí (también con daltonismo los
   primeros, que son los que más se usan: azul, naranja, verde azulado, magenta) */
const PG_COLS = ['#2C47CF', '#C2410C', '#0F766E', '#A21CAF', '#4D7C0F', '#7C3AED', '#92400E', '#0369A1', '#BE123C', '#475569'];
const pgCol = i => PG_COLS[i % PG_COLS.length];
const pgDec = v => typeof EN !== 'undefined' && EN ? v : String(v).replace('.', ',');   // 0,98 m en español; 0.98 m en inglés
const pgShort = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

/* lo que se dibuja: los planos de la escena (sin los dibujados a mano), su escena 3D (la del editor abierto, si es
   uno de ellos: live = { id, s3 }), sus cámaras, las figuras y el lugar */
function pgData(scKey, live) {
  const all = (D.shotsBy[scKey] || []).filter(sh => sh && shot3D(sh));
  // con máster (lote U): los planos que lo siguen se arman desde él; si es el del editor abierto, con sus cambios
  const M = shotMaster(scKey), liveM = live && M && live.id === M.id ? live.s3 : null;
  const s3s = all.map(sh => live && live.id === sh.id ? live.s3 : liveM && masterOf(sh) ? s3Follow(sh, liveM) : s3Of(sh));
  if (typeof escLocSet === 'function') { const sc0 = sceneOfKey(scKey); for (const x of s3s) escLocSet(x, sc0 && sc0.loc); }   // lote W · la escala de la calle de la locación
  const iM = M ? all.findIndex(sh => sh.id === M.id) : -1;
  const base = s3s[iM >= 0 ? iM : all.findIndex(sh => sh.s3 || (live && live.id === sh.id))] || s3s[0] || null;
  const shots = all.map((sh, i) => {
    const s3 = s3s[i], code = D.code[sh.id] || '', cams = [];
    const one = (v, letter) => {
      const st = s3At(v, 0), ck = camKeys(v), path = ck.map(k => [k.cam.x, k.cam.z]);
      cams.push({ letter, cam: st.cam, path, moves: pgLen(path) > .15, aim: v.aim || null });
    };
    one(s3, s3HasB(s3) ? 'A' : '');
    if (s3HasB(s3)) one(s3ForB(s3), 'B');
    return { sh, s3, code, col: pgCol(i), cams, desc: pgShort(sh.desc || [sh.size, sh.angle && sh.angle !== 'Normal' ? sh.angle : '', sh.move && sh.move !== 'Fijo' ? sh.move : ''].filter(Boolean).join(' · '), 60) };
  });
  // las figuras: una vez cada personaje (la posición del máster o del primer plano en que aparece); en los demás planos,
  // si está en otro lugar, un punto tenue con el código; si se desplaza dentro de un plano, su recorrido
  const figs = new Map();
  (iM >= 0 ? [shots[iM], ...shots.filter((x, j) => j !== iM)] : shots).forEach(S => {
    const st = s3At(S.s3, 0), ok = objKeys(S.s3);
    for (const ob of S.s3.objs) {
      if (ob.kind !== 'actor' || ob.hold) continue;
      const p = st.o[ob.id]; if (!p) continue;
      const key = ob.el ? 'e:' + ob.el : 'n:' + (ob.name || ob.id);
      let F = figs.get(key);
      if (!F) { F = { ob, p, col: lookOf(ob).color, name: ob.name || 'Figura', also: [], moves: [] }; figs.set(key, F); }
      else if (Math.hypot(p.x - F.p.x, p.z - F.p.z) > .35 && !F.also.some(a => Math.hypot(a.p.x - p.x, a.p.z - p.z) < .2)) F.also.push({ p, code: S.code });
      const path = ok.map(k => k.o[ob.id]).filter(Boolean).map(q => [q.x, q.z]);
      if (pgLen(path) > .25) F.moves.push({ path, code: S.code });
    }
  });
  // las luces, objetos y animales de la escena (los de todos los planos): con su posición de la escena
  const els = scEls(scKey), elIds = new Set(els.map(x => x.ob.id));
  const props = base ? base.objs.filter(o => o.kind !== 'actor' && o.kind !== 'luz' && !o.hold && !elIds.has(o.id)) : [];
  return { scKey, base, shots, figs: [...figs.values()], props, els, skipped: (D.shotsBy[scKey] || []).length - all.length };
}
const pgLen = path => path.reduce((a, p, i) => i ? a + Math.hypot(p[0] - path[i - 1][0], p[1] - path[i - 1][1]) : 0, 0);

/* dibuja la planta general en un canvas de W×H (px de dibujo). opt: { sel: id del plano resaltado, k: escala de letras y
   trazos (1 en pantalla, más al exportar), view: { x, z, sc } para acercar o mover; si no, se ajusta a todo }.
   Devuelve las cámaras en pantalla (para tocarlas) y la vista usada */
function pgDraw(ctx, W, H, G, opt = {}) {
  const k = opt.k || 1, V = { W, H, sc: 40, x: 0, z: 0 };
  if (opt.view) Object.assign(V, opt.view);
  else Object.assign(V, pgFit(G, W, H, k));
  const toS = (x, z) => [V.W / 2 + (x - V.x) * V.sc, V.H / 2 + (z - V.z) * V.sc];
  ctx.save();
  ctx.fillStyle = PLAN_C.bg; ctx.fillRect(0, 0, W, H);
  if (!G.base) { ctx.restore(); return { hits: [], view: V }; }
  // el lugar, con letras a la escala de la exportación
  ctx.save(); if (k !== 1) { ctx.font = `600 ${10 * k}px Archivo, Arial, sans-serif`; }
  planDrawSet(ctx, G.base, V, toS, opt.redraw || (() => { }));
  ctx.restore();
  const font = (w, s) => `${w} ${Math.round(s * k * 10) / 10}px Archivo, Arial, sans-serif`;
  const dim = id => opt.sel && id !== opt.sel;
  // rótulos sin pisarse: cada uno busca el primer lugar libre alrededor de su punto
  const boxes = [];
  // los objetos del lugar: una vez, como en la planta del plano pero sin manijas
  const st0 = s3At(G.base, 0);
  for (const ob of G.props) {
    const p = st0.o[ob.id]; if (!p) continue;
    const [sx, sy] = toS(p.x, p.z);
    if (ob.kind === 'gente') {
      const L = genteLayout(ob);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-rad(p.rot)); ctx.setLineDash([4 * k, 4 * k]); ctx.strokeStyle = PLAN_C.propLine; ctx.lineWidth = k;
      ctx.strokeRect(-L.w * V.sc / 2, -L.d * V.sc / 2, L.w * V.sc, L.d * V.sc); ctx.restore();
      ctx.fillStyle = PLAN_C.muted; ctx.font = font(600, 10); ctx.textAlign = 'center'; ctx.fillText(genteLabel(ob), sx, sy + 3 * k);
      continue;
    }
    const fp = propFoot(ob);   // lote W · D: la huella con la escala del objeto
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-rad(p.rot || 0));
    ctx.fillStyle = PLAN_C.prop; ctx.strokeStyle = PLAN_C.propLine; ctx.lineWidth = 1.1 * k;
    const w = (ob.kind === 'puerta' ? .9 * objSc(ob) : ob.kind === 'ventana' ? 1.3 * objSc(ob) : fp.w) * V.sc, d = (ob.kind === 'puerta' || ob.kind === 'ventana' ? .12 : fp.d) * V.sc;
    ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d); ctx.restore();
    if (V.sc > 14 * k && ob.kind !== 'puerta' && ob.kind !== 'ventana') { ctx.fillStyle = PLAN_C.muted; ctx.font = font(600, 10); ctx.textAlign = 'center'; ctx.fillText(fp.name || ob.name || '', sx, sy + 3 * k); }
  }
  // los elementos de la escena: luces (con su haz), objetos y animales; el elegido, con el contorno de la cámara
  const elHits = [];
  // primero los objetos y animales; las luces (chicas) encima
  for (const X of [...(G.els || [])].sort((a, b) => (a.ob.kind === 'luz') - (b.ob.kind === 'luz'))) {
    const ob = X.ob, p = X.pos, [sx, sy] = toS(p.x, p.z), on = opt.elSel === ob.id, dimE = opt.elSel && !on ? .55 : 1;
    ctx.save(); ctx.globalAlpha = dimE;
    if (ob.kind === 'luz') {
      const col = kelvinHex(p.k || 3200), lit = (p.int || 0) > 0, dx = Math.sin(rad(p.rot || 0)), dz = Math.cos(rad(p.rot || 0));
      if (ob.type === 'sol') {
        ctx.strokeStyle = col; ctx.lineWidth = 2 * k; ctx.setLineDash([8 * k, 6 * k]);
        for (const o of [-30, 0, 30]) { const ox = -dz * o * k, oy = dx * o * k; ctx.beginPath(); ctx.moveTo(sx + ox, sy + oy); ctx.lineTo(sx + ox + dx * 70 * k, sy + oy + dz * 70 * k); ctx.stroke(); }
        ctx.setLineDash([]);
      } else if (ob.type === 'rebote' || ob.type === 'bandera') {
        const hw = (typeof fxOf === 'function' ? fxOf(ob).size[0] : 1) / 2 * V.sc;
        ctx.lineCap = 'round'; ctx.strokeStyle = '#3A3C42'; ctx.lineWidth = 7 * k; ctx.beginPath(); ctx.moveTo(sx + dz * hw, sy - dx * hw); ctx.lineTo(sx - dz * hw, sy + dx * hw); ctx.stroke();
        ctx.strokeStyle = ob.type === 'rebote' ? '#F6F4EE' : '#1D1E21'; ctx.lineWidth = 4.5 * k; ctx.stroke();
      } else if (ob.type === 'practica') {
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 1.6 * V.sc); g.addColorStop(0, col + (lit ? '66' : '22')); g.addColorStop(1, col + '00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 1.6 * V.sc, 0, Math.PI * 2); ctx.fill();
      } else {
        const half = rad(clamp(p.ang || 30, 5, 170) / 2), Lb = Math.max(40 * k, (ob.type === 'panel' ? 2.6 : 3.4) * V.sc), a0 = Math.atan2(dz, dx);
        ctx.fillStyle = col + (lit ? '40' : '14'); ctx.strokeStyle = col + 'AA'; ctx.lineWidth = k;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, Lb, a0 - half, a0 + half); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      if (ob.type !== 'rebote' && ob.type !== 'bandera') {
        ctx.fillStyle = col; ctx.strokeStyle = on ? PLAN_C.cam : '#5A4410'; ctx.lineWidth = (on ? 3 : 1.5) * k;
        ctx.beginPath(); if (ob.type === 'panel') ctx.rect(sx - 8 * k, sy - 8 * k, 16 * k, 16 * k); else ctx.arc(sx, sy, 8 * k, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (on) { ctx.strokeStyle = PLAN_C.cam; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(sx, sy, 9 * k, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#4A3606'; ctx.font = font(700, 10); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(ob.name || 'Luz', sx, sy + 12 * k); ctx.textBaseline = 'alphabetic';
      boxes.push([sx - 10 * k, sy - 10 * k, 20 * k, 34 * k]);
      elHits.push({ id: ob.id, x: sx, y: sy, r: 14 * k });
    } else {
      const fp = propFoot(ob), w = Math.max(6 * k, fp.w * V.sc), d = Math.max(6 * k, fp.d * V.sc);   // lote W · D: con su escala
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-rad(p.rot || 0));
      ctx.fillStyle = fp.cat === 'animal' ? '#EFE6D6' : PLAN_C.prop; ctx.strokeStyle = on ? PLAN_C.cam : PLAN_C.propLine; ctx.lineWidth = (on ? 2.4 : 1.2) * k;
      ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d);
      // hacia dónde mira: una muesca en su frente
      ctx.beginPath(); ctx.moveTo(-4 * k, d / 2); ctx.lineTo(0, d / 2 + 5 * k); ctx.lineTo(4 * k, d / 2); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = PLAN_C.ink; ctx.font = font(700, 10); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(fp.name || '', sx, sy + Math.max(w, d) / 2 + 7 * k); ctx.textBaseline = 'alphabetic';
      boxes.push([sx - Math.max(w, d) / 2, sy - Math.max(w, d) / 2, Math.max(w, d), Math.max(w, d) + 18 * k]);
      elHits.push({ id: ob.id, x: sx, y: sy, r: Math.max(14 * k, Math.max(w, d) / 2 + 4 * k) });
    }
    ctx.restore();
  }
  const arrow = (pts, col, lw, dash) => {
    const sp = pts.filter((p, i) => !i || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > .01).map(p => toS(p[0], p[1]));
    if (sp.length < 2) return null;
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); sp.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
    const a = sp[sp.length - 2], b = sp[sp.length - 1], an = Math.atan2(b[1] - a[1], b[0] - a[0]), s = 7 * k;
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] - s * Math.cos(an - .45), b[1] - s * Math.sin(an - .45)); ctx.lineTo(b[0] - s * Math.cos(an + .45), b[1] - s * Math.sin(an + .45)); ctx.closePath(); ctx.fill();
    ctx.restore();
    return b;
  };
  const place = (x, y, w, h) => {
    const tries = [[10, 8], [10, -h - 8], [-w - 10, 8], [-w - 10, -h - 8], [10, 8 + h + 3], [10, -2 * h - 11], [-w - 10, 8 + h + 3], [-w / 2, 14], [-w / 2, -h - 14]].map(([dx, dy]) => [x + dx, y + dy]);
    for (const [bx, by] of tries) { const r = [bx, by, w, h]; if (!boxes.some(q => r[0] < q[0] + q[2] + 2 && q[0] < r[0] + r[2] + 2 && r[1] < q[1] + q[3] + 2 && q[1] < r[1] + r[3] + 2)) { boxes.push(r); return r; } }
    const r = [x + 10 * k, y + 8 * k + boxes.length % 3 * (h + 3), w, h]; boxes.push(r); return r;
  };
  // figuras: sus otras posiciones (tenues, con el código), sus recorridos y su lugar principal
  for (const F of G.figs) for (const a of F.also) {
    const [sx, sy] = toS(a.p.x, a.p.z);
    ctx.save(); ctx.globalAlpha = .45; ctx.fillStyle = F.col; ctx.beginPath(); ctx.arc(sx, sy, 4.5 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  const late = [];   // los códigos de las posiciones y los recorridos van después de las figuras, donde no las tapen
  for (const F of G.figs) for (const a of F.also) late.push([toS(a.p.x, a.p.z), a.code, PLAN_C.muted, 600]);
  for (const F of G.figs) for (const m of F.moves) {
    const end = arrow(m.path, F.col, 1.3 * k, null);
    if (end) late.push([end, m.code, F.col, 700]);
  }
  for (const F of G.figs) {
    const [sx, sy] = toS(F.p.x, F.p.z), r = Math.max(7 * k, .24 * V.sc), fx = Math.sin(rad(F.p.rot || 0)), fz = Math.cos(rad(F.p.rot || 0));
    ctx.fillStyle = F.col;
    ctx.beginPath(); ctx.moveTo(sx + fx * r * 1.7, sy + fz * r * 1.7); ctx.lineTo(sx + fz * r * .75, sy - fx * r * .75); ctx.lineTo(sx - fz * r * .75, sy + fx * r * .75); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 1.5 * k; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = font(800, r / k * 1.05); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((F.name || 'F').replace(/^(EL|LA|DON|DOÑA)\s+/i, '').charAt(0).toUpperCase(), sx, sy + k);
    boxes.push([sx - r, sy - r, r * 2, r * 2]);
  }
  // los nombres, después de todos los círculos: debajo, arriba o a un lado, donde no pisen a otro
  for (const F of G.figs) {
    const [sx, sy] = toS(F.p.x, F.p.z), r = Math.max(7 * k, .24 * V.sc);
    ctx.font = font(700, 10.5); const nw = ctx.measureText(F.name).width, nh = 12 * k;
    const opts = [[sx - nw / 2, sy + r + 3 * k], [sx - nw / 2, sy - r - 3 * k - nh], [sx + r + 4 * k, sy - nh / 2], [sx - r - 4 * k - nw, sy - nh / 2]];
    const free = q => !boxes.some(b => q[0] < b[0] + b[2] && b[0] < q[0] + nw && q[1] < b[1] + b[3] && b[1] < q[1] + nh);
    const [nx, ny] = opts.find(free) || opts[0];
    boxes.push([nx, ny, nw, nh]);
    ctx.fillStyle = PLAN_C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(F.name, nx, ny); ctx.textBaseline = 'alphabetic';
  }
  for (const [[x, y], code, col, w] of late) {
    ctx.font = font(w, 9.5); const tw = ctx.measureText(code).width, h = 12 * k, [bx, by] = place(x - 4 * k, y - 2 * k, tw + 4 * k, h);
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(code, bx + 2 * k, by + h / 2); ctx.textBaseline = 'alphabetic';
  }
  // cámaras: los conos primero (cortos: varias cámaras no tapan la planta), después recorridos, cuerpos y rótulos
  const order = [...G.shots].sort((a, b) => (a.sh.id === opt.sel) - (b.sh.id === opt.sel));
  for (const S of order) for (const C of S.cams) {
    const c = C.cam, [cx, cy] = toS(c.x, c.z);
    if (Math.abs(c.pitch) >= 80) continue;
    const hf = 2 * Math.atan((c.sw || 36) / 2 / clamp(c.lens, 8, 600)), L = Math.max(48 * k, 3 * V.sc);
    const dA = [-Math.sin(rad(c.yaw) - hf / 2), -Math.cos(rad(c.yaw) - hf / 2)], dB = [-Math.sin(rad(c.yaw) + hf / 2), -Math.cos(rad(c.yaw) + hf / 2)];
    ctx.save(); ctx.globalAlpha = dim(S.sh.id) ? .22 : 1;
    ctx.fillStyle = planRGBA(S.col, opt.sel === S.sh.id ? .16 : .07); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dA[0] * L, cy + dA[1] * L); ctx.lineTo(cx + dB[0] * L, cy + dB[1] * L); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = planRGBA(S.col, .75); ctx.lineWidth = (opt.sel === S.sh.id ? 1.8 : 1.1) * k; if (C.letter === 'B') ctx.setLineDash([5 * k, 4 * k]);
    ctx.beginPath(); ctx.moveTo(cx + dA[0] * L, cy + dA[1] * L); ctx.lineTo(cx, cy); ctx.lineTo(cx + dB[0] * L, cy + dB[1] * L); ctx.stroke();
    ctx.restore();
  }
  const hits = [];
  for (const S of order) for (const C of S.cams) {
    ctx.save(); ctx.globalAlpha = dim(S.sh.id) ? .3 : 1;
    if (C.moves) arrow(C.path, S.col, 1.4 * k, [6 * k, 4 * k]);
    const c = C.cam, [cx, cy] = toS(c.x, c.z);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-rad(c.yaw)); ctx.scale(k, k);
    ctx.fillStyle = S.col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(-8, -2, 16, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5.5, -2); ctx.lineTo(-8, -9); ctx.lineTo(8, -9); ctx.lineTo(5.5, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // rótulo: el código (con la letra si el plano tiene cámara B) en la pastilla de su color, y el lente al lado
    const tag = S.code + (C.letter ? '·' + C.letter : ''), lens = Math.round(c.lens) + ' mm';
    ctx.font = font(800, 11); const tw = ctx.measureText(tag).width; ctx.font = font(600, 10); const lw = ctx.measureText(lens).width;
    const h = 17 * k, w = tw + 12 * k + 5 * k + lw, [bx, by] = place(cx, cy, w, h);
    ctx.fillStyle = S.col; pgRound(ctx, bx, by, tw + 12 * k, h, 4 * k); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = font(800, 11); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(tag, bx + 6 * k, by + h / 2 + .5 * k);
    ctx.fillStyle = S.col; ctx.font = font(600, 10); ctx.fillText(lens, bx + tw + 17 * k, by + h / 2 + .5 * k); ctx.textBaseline = 'alphabetic';
    ctx.restore();
    hits.push({ id: S.sh.id, x: cx, y: cy, box: [bx, by, w, h] });
  }
  // escala
  ctx.fillStyle = PLAN_C.muted; ctx.font = font(600, 10); ctx.textAlign = 'left';
  const m = V.sc >= 30 * k ? 1 : V.sc >= 8 * k ? 5 : 10;
  ctx.fillRect(10 * k, H - 14 * k, m * V.sc, 2 * k); ctx.fillText(m + ' m', 14 * k + m * V.sc, H - 9 * k);
  ctx.restore();
  return { hits, elHits, view: V };
}
function pgRound(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
/* el encuadre que muestra todo: cámaras (principio y fin), figuras, objetos y el plano importado */
function pgFit(G, W, H, k = 1) {
  const pts = [];
  for (const S of G.shots) for (const C of S.cams) { pts.push([C.cam.x, C.cam.z]); for (const p of C.path) pts.push(p); }
  for (const F of G.figs) { pts.push([F.p.x, F.p.z]); for (const a of F.also) pts.push([a.p.x, a.p.z]); for (const m of F.moves) pts.push(...m.path); }
  if (G.base) {
    const st = s3At(G.base, 0); for (const ob of G.props) { const p = st.o[ob.id]; if (p) pts.push([p.x, p.z]); }
    for (const X of G.els || []) pts.push([X.pos.x, X.pos.z]);
    const pl = planOf(G.base); if (pl) { const Wd = planWorld(pl); pts.push([Wd.x(Wd.b.x0), Wd.z(Wd.b.y0)], [Wd.x(Wd.b.x1), Wd.z(Wd.b.y1)]); }
    const fb = typeof set3dOf === 'function' && set3dFitBox(set3dOf(G.base)); if (fb) pts.push([fb[0], fb[1]], [fb[2], fb[3]]);
    if (G.base.set === 'int') { const R = roomOf(G.base); pts.push([-R.w / 2, -R.d / 2], [R.w / 2, R.d / 2]); }
  }
  if (!pts.length) pts.push([0, 0]);
  let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), z0 = Math.min(...pts.map(p => p[1])), z1 = Math.max(...pts.map(p => p[1]));
  x0 -= 1.2; x1 += 1.2; z0 -= 1.2; z1 += 1.2;
  const mx = 30 * k, sc = clamp(Math.min((W - 2 * mx) / (x1 - x0), (H - 2 * mx) / (z1 - z0)), 3, 160 * k);
  return { sc, x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
}

/* ---------- la ventana: planta, leyenda, resaltar, abrir y exportar ---------- */
/* opts: { from: el editor de plano abierto (EDT), para ver sus cambios sin guardar y para pasar a otro plano } */
/* los elementos de la escena en sus planos con puesta en escena propia (los demás los toman de P.scEls: s3Default) */
const scElShots = scKey => (D.shotsBy[scKey] || []).filter(sh => sh && shot3D(sh) && sh.s3);
function scElAdd(scKey, ob, pos) {
  P.scEls = P.scEls || {}; (P.scEls[scKey] = P.scEls[scKey] || []).push({ ob, pos });
  for (const sh of scElShots(scKey)) scElPut(sh.s3, ob, pos);
}
function scElSet(scKey, id, ch) {
  const x = scEls(scKey).find(e => e.ob.id === id); if (x) Object.assign(x.pos, ch);
  for (const sh of scElShots(scKey)) for (const k of sh.s3.keys) if (k.o[id]) Object.assign(k.o[id], ch);
}
function scElDel(scKey, id) {
  if (P.scEls && P.scEls[scKey]) { P.scEls[scKey] = P.scEls[scKey].filter(e => !e || !e.ob || e.ob.id !== id); if (!P.scEls[scKey].length) delete P.scEls[scKey]; if (!Object.keys(P.scEls).length) delete P.scEls; }
  for (const sh of scElShots(scKey)) if (sh.s3.objs.some(o => o.id === id)) s3DelObj(sh.s3, id);
}
const scElName = ob => ob.kind === 'luz' ? ob.name || 'Luz' : (S3_PROPS[ob.kind] || {}).name || ob.kind;
const scElWhat = ob => ob.kind === 'luz' ? (S3_LIGHTS[ob.type] || {}).name || 'Luz' : (S3_PROPS[ob.kind] || {}).cat === 'animal' ? 'Animal' : 'Objeto';
const PG_ADD_IC = {
  luz: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
  obj: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/></svg>',
  animal: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="16" rx="4.2" ry="3.6"/><circle cx="6" cy="10.5" r="1.8"/><circle cx="18" cy="10.5" r="1.8"/><circle cx="9.3" cy="6.5" r="1.8"/><circle cx="14.7" cy="6.5" r="1.8"/></svg>',
};
function plantaGeneral(scKey, opts = {}) {
  const s = sceneOfKey(scKey); if (!s) return;
  const E = opts.from || null;
  const live = () => E && E.liveS3 ? { id: E.id, s3: E.liveS3() } : null;
  let G = pgData(scKey, live());
  if (!G.shots.length) { toast(G.skipped ? 'Los planos de esta escena están dibujados a mano: no tienen planta de cámara.' : 'Esta escena todavía no tiene planos.', 4200); return; }
  const ed = !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('storyboard'));
  const st = { sel: E && G.shots.some(S => S.sh.id === E.id) ? E.id : null, el: null, view: null, hits: [], elHits: [] };
  const m = modal({
    title: `Planta general · Esc. ${s.key}`, wide: true,
    dirty: () => false,   // lo que se cambia aquí ya queda en el proyecto (y se deshace con el historial): no hay nada que descartar
    body: `<div class="pg">
      <div class="pg-stage"><canvas class="pg-c" tabindex="0" aria-label="Planta general de la escena ${esc(s.key)}: las cámaras de sus ${G.shots.length} planos"></canvas>
        <button type="button" class="pg-th" hidden title="Abrir el plano"><span class="pg-thi"><img alt=""><img class="pg-thb" alt="" hidden></span><span class="pg-thc"></span></button>
        ${ed ? `<div class="pg-add" role="toolbar" aria-label="Agregar a la escena">${[['luz', 'Luz'], ['obj', 'Objeto'], ['animal', 'Animal']].map(([k, n]) => `<button type="button" data-pga="${k}" aria-haspopup="menu" title="${ea(`Agregar ${n === 'Luz' ? 'una luz' : n === 'Objeto' ? 'un objeto' : 'un animal'} a la escena: va en todos sus planos`)}">${PG_ADD_IC[k]}<span>${n}</span></button>`).join('')}</div>` : ''}
        <div class="pl-ov pg-ov" role="toolbar" aria-label="Planta"><button data-pg="zo" title="Alejar" aria-label="Alejar">−</button><button data-pg="zi" title="Acercar" aria-label="Acercar">+</button><button data-pg="fit" title="Ver todo" aria-label="Ver todo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><circle cx="12" cy="12" r="2.4"/></svg></button></div></div>
      <div class="pg-side"><p class="pg-head"><b class="sch">${esc(s.heading)}</b></p><div class="pg-elc" hidden></div><ul class="pg-leg" role="list"></ul>
        <div class="pg-elw" hidden><p class="pg-sub">En la escena</p><ul class="pg-els" role="list"></ul></div>
        <p class="hint pg-hint"><span>Toca una cámara o un plano de la lista para resaltarlo y ver su viñeta; doble toque para abrirlo.</span>${ed ? ' <span>Las luces, objetos y animales que agregues van en todos los planos de la escena.</span>' : ''}${G.skipped ? ` <span>${G.skipped === 1 ? 'Un plano dibujado a mano no tiene planta.' : G.skipped + ' planos dibujados a mano no tienen planta.'}</span>` : ''}</p></div></div>`,
    foot: `<button class="btn" data-close>Cerrar</button><button class="btn primary" id="pgExp" aria-haspopup="menu">${ICO.share}Exportar</button>`,
  });
  const cv = $('.pg-c', m), ctx = cv.getContext('2d'), leg = $('.pg-leg', m), th = $('.pg-th', m), elc = $('.pg-elc', m), elw = $('.pg-elw', m);
  const paintLeg = () => {
    leg.innerHTML = G.shots.map(S => `<li><button class="pg-row" data-id="${ea(S.sh.id)}" aria-pressed="${ea(st.sel === S.sh.id)}" title="Toca para resaltarlo; doble toque para abrirlo">
      <i class="pg-sw" style="--c:${ea(S.col)}" aria-hidden="true"></i><b class="tnum">${esc(S.code)}</b><span class="pg-ln tnum">${S.cams.map(C => (C.letter ? C.letter + ' ' : '') + Math.round(C.cam.lens) + ' mm').join(' · ')}</span><span class="pg-ds">${esc(S.desc)}</span></button>
      ${st.sel === S.sh.id ? `<button class="linkbtn pg-open" data-open="${ea(S.sh.id)}">Abrir el plano ›</button>` : ''}</li>`).join('');
    // las luces, objetos y animales de la escena: también se eligen desde aquí
    elw.hidden = !G.els.length;
    $('.pg-els', m).innerHTML = G.els.map(X => `<li><button class="pg-erow" data-el="${ea(X.ob.id)}" aria-pressed="${ea(st.el === X.ob.id)}"><span class="pg-eic" aria-hidden="true">${PG_ADD_IC[X.ob.kind === 'luz' ? 'luz' : (S3_PROPS[X.ob.kind] || {}).cat === 'animal' ? 'animal' : 'obj']}</span><b>${esc(scElName(X.ob))}</b><span class="pg-ds">${esc(scElWhat(X.ob))}</span></button></li>`).join('');
  };
  const paint = () => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const out = pgDraw(ctx, r.width, r.height, G, { sel: st.sel, elSel: st.el, view: st.view, redraw: () => requestAnimationFrame(paint) });
    st.hits = out.hits; st.elHits = out.elHits || []; st.cur = out.view;
  };
  /* la viñeta del plano elegido, en una esquina (la del editor abierto, con sus cambios sin guardar) */
  let thGen = 0;
  const paintThumb = async () => {
    const S = st.sel && G.shots.find(x => x.sh.id === st.sel), gen = ++thGen;
    th.hidden = !S; if (!S) return;
    { const [fw, fh] = frameDims(100); th.style.setProperty('--ar', fw + ' / ' + fh); }
    const sh = { ...S.sh, s3: S.s3 }, B = s3HasB(S.s3) ? shotB(sh) : null, [a, b] = $$('img', th);
    $('.pg-thc', th).innerHTML = `<b style="--c:${ea(S.col)}">${esc(S.code)}</b> ${esc([S.sh.size, Math.round(s3At(S.s3, 0).cam.lens) + ' mm'].filter(Boolean).join(' · '))}${B ? ` · B ${esc(String(Math.round(s3At(s3ForB(S.s3), 0).cam.lens)))} mm` : ''}`;
    th.setAttribute('aria-label', `Viñeta del plano ${S.code}: abrir el plano`);
    const put = () => { if (gen !== thGen) return; a.src = shotThumb(sh); b.hidden = !B; if (B) b.src = shotThumb(B); };
    put();
    // las figuras articuladas y las fotos llegan después: se vuelve a dibujar cuando estén
    try { await Promise.all([typeof FIG3D !== 'undefined' && FIG3D.ready ? FIG3D.ready(8000, typeof fig3dBodiesOf === 'function' ? fig3dBodiesOf([sh]) : undefined) : null, typeof thumbImgsReady === 'function' ? thumbImgsReady(sh) : null]); } catch (e) { }
    put();
  };
  /* la tarjeta del elemento elegido: girarlo, la intensidad de una luz, quitarlo de la escena */
  const paintEl = () => {
    const X = st.el && G.els.find(x => x.ob.id === st.el);
    elc.hidden = !X; if (!X) { elc.innerHTML = ''; return; }
    const ob = X.ob, p = X.pos, n = G.shots.length, luz = ob.kind === 'luz', rot = Math.round(((p.rot || 0) % 360 + 540) % 360 - 180);
    const rr = (k, lab, v, a, b, stp, unit) => `<label class="pg-rr"><span>${lab}</span><input type="range" min="${a}" max="${b}" step="${stp}" value="${ea(v)}" data-pgr="${k}"${ed ? '' : ' disabled'}><output class="tnum">${esc(String(v))}${unit}</output></label>`;
    elc.innerHTML = `<div class="pg-elh"><span class="pg-eic" aria-hidden="true">${PG_ADD_IC[luz ? 'luz' : (S3_PROPS[ob.kind] || {}).cat === 'animal' ? 'animal' : 'obj']}</span><span class="pg-elt"><b>${esc(scElName(ob))}</b><small>${esc(scElWhat(ob))} · en ${n === 1 ? 'el plano' : `los ${n} planos`} de la escena</small></span><button type="button" class="pg-elx" data-pgx="close" aria-label="Cerrar" title="Cerrar">${ICO.close}</button></div>
      ${rr('rot', 'Giro', rot, -180, 180, 5, '°')}${luz && ob.type !== 'rebote' && ob.type !== 'bandera' ? rr('int', 'Intensidad', Math.round(p.int || 0), 0, 100, 5, ' %') : ''}
      ${ed ? `<div class="pg-ela"><button type="button" class="btn sm" data-pgx="del">${ICO.trash}Quitar de la escena</button></div><p class="hint">Arrástralo en la planta para moverlo. En un plano solo, se ajusta desde su editor.</p>` : ''}`;
  };
  const paintAll = () => { paintLeg(); paint(); paintEl(); paintThumb(); };
  const select = id => { st.sel = id && G.shots.some(S => S.sh.id === id) ? id : null; if (st.sel) st.el = null; paintAll(); };
  const selEl = id => { st.el = id && G.els.some(x => x.ob.id === id) ? id : null; if (st.el) st.sel = null; paintAll(); };
  const open = id => {
    closeModal();
    if (E && E.goShot) E.goShot(id);   // desde el editor: se guarda el plano abierto y se pasa al otro
    else openShotEditor(id);
  };
  /* un cambio en la escena: el editor abierto también lo recibe, se guarda y se vuelve a armar la planta */
  const inEd = () => E && E.sceneEl && G.shots.some(S => S.sh.id === E.id);
  const saved = () => { changed('data'); if (typeof derive === 'function') derive(); render(); G = pgData(scKey, live()); paintAll(); };
  // un lugar libre cerca del centro de la vista: sin pisar cámaras, figuras ni lo ya puesto
  const freeSpot = (x0, z0, gap = 1.1) => {
    const taken = [...G.els.map(X => [X.pos.x, X.pos.z]), ...G.figs.map(F => [F.p.x, F.p.z]), ...G.shots.flatMap(S => S.cams.map(C => [C.cam.x, C.cam.z]))];
    for (const r of [0, 1.2, 2.4, 3.6]) for (let i = 0; i < (r ? 8 : 1); i++) {
      const a = i * Math.PI / 4, x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
      if (taken.every(([tx, tz]) => Math.hypot(tx - x, tz - z) >= gap)) return { x, z };
    }
    return { x: x0, z: z0 };
  };
  const addEl = (what, k) => {
    if (!ed) return;
    const v0 = st.cur || { x: 0, z: 0 };
    // el centro de las figuras: ahí apunta una luz nueva
    const T = G.figs.length ? { x: G.figs.reduce((a, F) => a + F.p.x, 0) / G.figs.length, z: G.figs.reduce((a, F) => a + F.p.z, 0) / G.figs.length } : { x: v0.x, z: v0.z };
    let ob, pos;
    if (what === 'luz') {
      const L = S3_LIGHTS[k] || S3_LIGHTS.fresnel, nl = scEls(scKey).filter(x => x.ob.kind === 'luz').length + 1;
      // a un lado de las figuras (a unos 2,5 m, en el primer lugar libre); el sol, lejos
      let { x, z } = k === 'sol' ? { x: T.x - 5, z: T.z - 5 } : freeSpot(T.x + (nl % 2 ? 2.4 : -2.4), T.z - 1.2);
      ob = { id: 'l' + uid(), kind: 'luz', type: k, name: L.name.split(' ')[0] + ' ' + nl, aim: null };
      pos = { x: round2(x), z: round2(z), rot: Math.round(deg(Math.atan2(T.x - x, T.z - z))), h: L.h, tilt: L.tilt, int: L.int, k: L.k, ang: L.ang };
    } else {
      const fp = S3_PROPS[k] || {};
      ob = { id: 'o' + uid(), kind: k };
      const f = freeSpot(v0.x, v0.z, Math.max(1.1, Math.max(fp.w || .5, fp.d || .5) * .8 + .6));
      pos = { x: round2(f.x), z: round2(f.z), rot: 0 };
      if (fp.small) pos.h = 0;
    }
    histNote(`Agregar ${scElName(ob)} a la escena ${scKey}`, null, 'board');
    scElAdd(scKey, ob, pos);
    if (inEd()) E.sceneEl('add', { ob, pos });
    st.el = ob.id; st.sel = null; saved();
    const nn = G.shots.length;
    toast(`${scElName(ob)}: en ${nn === 1 ? 'el plano' : `los ${nn} planos`} de la escena. Arrástralo para ubicarlo.`, 3600);
  };
  const delEl = id => {
    const X = G.els.find(x => x.ob.id === id); if (!X || !ed) return;
    histNote(`Quitar ${scElName(X.ob)} de la escena ${scKey}`, null, 'board');
    scElDel(scKey, id);
    if (inEd()) E.sceneEl('del', { ob: X.ob });
    st.el = null; saved();
    toastUndo(`${scElName(X.ob)}: quitado de la escena.`);
  };
  // agregar: la luz, del catálogo de luces; el objeto o el animal, del catálogo del editor (con búsqueda)
  const addMenu = (b, what) => {
    if (what === 'luz') {
      popover(b, `<div class="menu">${Object.entries(S3_LIGHTS).map(([k, v]) => `<button data-k="${ea(k)}">${esc(v.name)}</button>`).join('')}</div>`, p => p.addEventListener('click', e => { const x = e.target.closest('[data-k]'); if (!x) return; closePop(); addEl('luz', x.dataset.k); }));
      return;
    }
    const ani = what === 'animal', cats = S3_PROP_CATS.filter(([c]) => ani ? c === 'animal' : c !== 'animal');
    const cur = () => { const c = ls.get('objCat', 'objeto'); return ani ? 'animal' : cats.some(x => x[0] === c) ? c : 'objeto'; };
    const list = (cat, qq) => {
      const q = qq ? deaccent(qq.toLowerCase()) : '';
      const L = Object.entries(S3_PROPS).filter(([kk, v]) => ((v.cat || 'objeto') === 'animal') === ani && (q ? deaccent(v.name.toLowerCase()).includes(q) || kk.includes(q) : (v.cat || 'objeto') === cat));
      return L.length ? L.map(([kk, v]) => `<button data-k="${ea(kk)}">${esc(v.name)}</button>`).join('') : '<p class="po-none">Nada con ese nombre.</p>';
    };
    popover(b, `<input class="po-q" type="search" placeholder="${ea(ani ? 'Buscar: perro, caballo, gallina…' : 'Buscar: mesa, taxi, laptop…')}" aria-label="${ea(ani ? 'Buscar animal' : 'Buscar objeto')}">
      ${ani ? '' : `<div class="po-cats" role="tablist">${cats.map(([c, n]) => `<button class="chip" role="tab" data-pc="${ea(c)}" aria-pressed="${ea(c === cur())}">${n}</button>`).join('')}</div>`}
      <div class="menu po-list">${list(cur())}</div>`, p => {
      p.classList.add('pop-add');
      const L = p.querySelector('.po-list'), Q = p.querySelector('.po-q');
      const mark = c => p.querySelectorAll('[data-pc]').forEach(x => x.setAttribute('aria-pressed', x.dataset.pc === c));
      Q.addEventListener('input', () => { const v = Q.value.trim(); L.innerHTML = list(cur(), v); mark(v ? '' : cur()); L.scrollTop = 0; });
      p.addEventListener('click', e => {
        const c = e.target.closest('[data-pc]');
        if (c) { ls.set('objCat', c.dataset.pc); Q.value = ''; L.innerHTML = list(c.dataset.pc); mark(c.dataset.pc); L.scrollTop = 0; return; }
        const x = e.target.closest('button[data-k]'); if (!x) return;
        closePop(); addEl(what, x.dataset.k);
      });
      setTimeout(() => { if (!matchMedia('(pointer:coarse)').matches) Q.focus(); }, 30);
    });
  };
  paintAll();
  requestAnimationFrame(paint);
  const ro = new ResizeObserver(() => paint()); ro.observe(cv);
  const onClose0 = m._onClose; m._onClose = () => { ro.disconnect(); if (onClose0) onClose0(); };
  // tocar: resaltar; doble toque (o doble clic): abrir. Arrastrar mueve la planta (o el elemento de la escena que se
  // agarra); la rueda acerca y aleja
  const hitAt = (x, y) => { let best = null, bd = 18; for (const h of st.hits) { const d = Math.hypot(x - h.x, y - h.y); const inBox = x >= h.box[0] && x <= h.box[0] + h.box[2] && y >= h.box[1] && y <= h.box[1] + h.box[3]; if (inBox) return h; if (d < bd) { bd = d; best = h; } } return best; };
  const elAt = (x, y) => { let best = null, bd = Infinity; for (const h of st.elHits) { const d = Math.hypot(x - h.x, y - h.y); if (d < h.r && d < bd) { bd = d; best = h; } } return best; };
  let drag = null, lastTap = { t: 0, id: null };
  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    // una cámara encima gana (se resalta); si no, el elemento de la escena que está ahí se agarra
    const eh = ed && !(hitAt(x, y) && Math.hypot(x - hitAt(x, y).x, y - hitAt(x, y).y) < 12) ? elAt(x, y) : null;
    const X = eh && G.els.find(q => q.ob.id === eh.id);
    drag = { x: e.clientX, y: e.clientY, v: { ...st.cur }, moved: false, rx: r.left, ry: r.top, el: X || null, p0: X ? { x: X.pos.x, z: X.pos.z } : null };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (drag.el) {
      if (!drag.moved) { histNote(`Mover ${scElName(drag.el.ob)} en la escena ${scKey}`, null, 'board'); st.el = drag.el.ob.id; st.sel = null; paintLeg(); paintEl(); paintThumb(); }
      drag.moved = true;
      Object.assign(drag.el.pos, { x: round2(drag.p0.x + dx / drag.v.sc), z: round2(drag.p0.z + dy / drag.v.sc) });
      paint(); return;
    }
    drag.moved = true; st.view = { ...drag.v, x: drag.v.x - dx / drag.v.sc, z: drag.v.z - dy / drag.v.sc }; paint();
  });
  cv.addEventListener('pointerup', e => {
    const d = drag; drag = null; if (!d) return;
    if (d.el && d.moved) {   // soltó el elemento: va a su lugar en todos los planos
      const ch = { x: d.el.pos.x, z: d.el.pos.z };
      scElSet(scKey, d.el.ob.id, ch);
      if (inEd()) E.sceneEl('set', { ob: d.el.ob, pos: ch });
      saved(); return;
    }
    if (d.moved) return;
    if (d.el) { selEl(d.el.ob.id); return; }
    const h = hitAt(e.clientX - d.rx, e.clientY - d.ry), now = e.timeStamp;
    if (h && lastTap.id === h.id && now - lastTap.t < 380) { open(h.id); return; }
    lastTap = { t: now, id: h ? h.id : null };
    if (st.el && !h) { selEl(null); return; }
    select(h ? h.id : null);
  });
  cv.addEventListener('pointercancel', () => { if (drag && drag.el && drag.moved) Object.assign(drag.el.pos, drag.p0); drag = null; paint(); });
  cv.addEventListener('keydown', e => { if ((e.key === 'Delete' || e.key === 'Backspace') && st.el && ed) { e.preventDefault(); delEl(st.el); } });
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(-e.deltaY * .0015), e.offsetX, e.offsetY); }, { passive: false });
  const zoom = (f, ox, oy) => {
    const v = { ...st.cur }, r = cv.getBoundingClientRect(); ox = ox ?? r.width / 2; oy = oy ?? r.height / 2;
    const wx = v.x + (ox - v.W / 2) / v.sc, wz = v.z + (oy - v.H / 2) / v.sc;
    v.sc = clamp(v.sc * f, 3, 260); v.x = wx - (ox - v.W / 2) / v.sc; v.z = wz - (oy - v.H / 2) / v.sc;
    st.view = { x: v.x, z: v.z, sc: v.sc }; paint();
  };
  // girar o cambiar la intensidad: se ve mientras se arrastra; al soltar queda en todos los planos
  let rrNoted = false;
  elc.addEventListener('input', e => {
    const r = e.target.closest('[data-pgr]'), X = st.el && G.els.find(x => x.ob.id === st.el); if (!r || !X || !ed) return;
    if (!rrNoted) { histNote(`${r.dataset.pgr === 'rot' ? 'Girar' : 'Cambiar la intensidad de'} ${scElName(X.ob)} en la escena ${scKey}`, null, 'board'); rrNoted = true; }
    X.pos[r.dataset.pgr] = +r.value;
    r.nextElementSibling.textContent = r.value + (r.dataset.pgr === 'rot' ? '°' : ' %');
    paint();
  });
  elc.addEventListener('change', e => {
    const r = e.target.closest('[data-pgr]'), X = st.el && G.els.find(x => x.ob.id === st.el); if (!r || !X || !ed) return;
    rrNoted = false;
    const ch = { [r.dataset.pgr]: +r.value };
    scElSet(scKey, X.ob.id, ch);
    if (inEd()) E.sceneEl('set', { ob: X.ob, pos: ch });
    saved();
  });
  m.addEventListener('click', e => {
    const z = e.target.closest('[data-pg]');
    if (z) { if (z.dataset.pg === 'fit') st.view = null; else return zoom(z.dataset.pg === 'zi' ? 1.25 : .8); paint(); return; }
    const a = e.target.closest('[data-pga]'); if (a) { addMenu(a, a.dataset.pga); return; }
    const x = e.target.closest('[data-pgx]'); if (x) { if (x.dataset.pgx === 'del') delEl(st.el); else selEl(null); return; }
    const er = e.target.closest('.pg-erow'); if (er) { selEl(st.el === er.dataset.el ? null : er.dataset.el); return; }
    if (e.target.closest('.pg-th')) { if (st.sel) open(st.sel); return; }
    const o = e.target.closest('[data-open]'); if (o) { open(o.dataset.open); return; }
    const row = e.target.closest('.pg-row'); if (row) { if (e.detail >= 2) { open(row.dataset.id); return; } select(st.sel === row.dataset.id ? null : row.dataset.id); }
  });
  $('#pgExp', m).onclick = ev => {
    const S = st.sel && G.shots.find(x => x.sh.id === st.sel);
    popover(ev.currentTarget, `<div class="menu"><button data-x="gpdf">Planta general · PDF</button><button data-x="gpng">Planta general · imagen PNG</button>
      ${S ? `<hr><button data-x="spdf">Planta del plano ${esc(S.code)} · PDF</button><button data-x="spng">Planta del plano ${esc(S.code)} · imagen PNG</button>` : ''}</div>`, p => p.addEventListener('click', e2 => {
      const b = e2.target.closest('[data-x]'); if (!b) return; closePop();
      const x = b.dataset.x;
      if (x === 'gpdf') exportPDF('plantagen', ev.currentTarget, { sc: scKey, live: live() });
      if (x === 'gpng') plantaPNG('gen', { sc: scKey, live: live() });
      if (x === 'spdf') exportPDF('planta', ev.currentTarget, { id: S.sh.id, s3: S.s3 });
      if (x === 'spng') plantaPNG('shot', { id: S.sh.id, s3: S.s3 });
    }));
  };
}

/* ---------- exportar: solo la planta (PDF de una página horizontal o imagen PNG) ---------- */
/* la planta de un plano (sus dos cámaras, si tiene B), cuadrada, en px */
/* (px: el tamaño de dibujo; dpr: cuántos píxeles por cada uno, para que letras y trazos queden a escala al exportar) */
function plantaShotCanvas(s3, px, dpr = 2.5) {
  const c = document.createElement('canvas');
  const pl = makePlan(c, { s3, sel: null, state: () => s3At(s3, 0), camLetter: () => s3HasB(s3) ? 'A' : '', other: () => s3HasB(s3) ? planOther(s3, 0, 'B') : null }, { w: px, h: px, static: true, dpr });
  pl.fit();
  return c;
}
function plantaGenCanvas(G, px, dpr = 2.5) {
  const c = document.createElement('canvas'); c.width = Math.round(px * dpr); c.height = Math.round(px * dpr);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  pgDraw(g, px, px, G, {});
  return c;
}
/* qué se exporta: el plano (con su escena 3D: la del editor si está abierto) o la escena entera */
function plantaWhat(kind, o) {
  // sin plano o escena dichos: el primero que tenga planta (así el PDF sale igual desde cualquier lugar)
  const first = () => D.sc.scenes.map(x => x.key).find(k => (D.shotsBy[k] || []).some(sh => shot3D(sh)));
  o = { ...o };
  if (kind === 'gen' && !sceneOfKey(o.sc)) o.sc = first();
  if (kind !== 'gen' && !(o.id && P.shots[o.id])) { const k = first(); o.id = k ? D.shotsBy[k].find(sh => shot3D(sh)).id : null; delete o.s3; }
  if (kind === 'gen' ? !o.sc : !o.id) throw new Error('Todavía no hay planos con planta de cámara.');
  if (kind === 'gen') {
    const s = sceneOfKey(o.sc), G = pgData(o.sc, o.live || null);
    return { s, G, label: 'Planta general de la escena', sub: `Esc. ${s.key} · ${G.shots.length} ${G.shots.length === 1 ? 'plano' : 'planos'}`, file: `_planta_general_esc${o.sc}` };
  }
  const sh = P.shots[o.id], s = sceneOfKey(sh.sc), s3 = o.s3 || s3Of(sh), code = D.code[sh.id] || '';
  return { sh, s, s3, code, label: 'Planta de cámara', sub: `Esc. ${s.key} · Plano ${code}`, file: `_planta_${String(code).replace(/[^\w.-]+/g, '')}` };
}
/* los datos del plano al lado de su planta */
function plantaShotLines(W) {
  const { sh, s3 } = W, st = s3At(s3, 0), c = st.cam, out = [];
  const aimName = id => { const o = id && s3.objs.find(x => x.id === id); return o ? o.name || 'la figura' : ''; };
  out.push([`Cámara${s3HasB(s3) ? ' A' : ''}`, `${Math.round(c.lens)} mm · altura ${pgDec(c.h.toFixed(2))} m${s3.aim ? ' · sigue a ' + aimName(s3.aim) : ''}${camKeys(s3).length > 1 ? ' · se mueve' : ''}`]);
  if (s3HasB(s3)) { const v = s3ForB(s3), cb = s3At(v, 0).cam; out.push(['Cámara B', `${Math.round(cb.lens)} mm · altura ${pgDec(cb.h.toFixed(2))} m${v.aim ? ' · sigue a ' + aimName(v.aim) : ''}${pgLen(camKeys(v).map(k => [k.cam.x, k.cam.z])) > .15 ? ' · se mueve' : ''}`]); }
  out.push(['Plano', [sh.size, sh.angle !== 'Normal' ? sh.angle : '', sh.move !== 'Fijo' ? sh.move : '', sh.support || '', shotDur(sh) + ' s'].filter(Boolean).join(' · ')]);
  if (sh.desc) out.push(['Descripción', sh.desc]);
  return out;
}
function pdfPlantaPage(kind, opts) {
  const W = plantaWhat(kind, opts), doc = newDoc('landscape');
  let y = docHeader(doc, W.label, W.sub);
  doc.setFont('title', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK);
  doc.text(pdfSafe(`Esc. ${W.s.key}  ·  ${W.s.heading}`), 36, y + 4); y += 16;
  const M = 36, PH = 612, ps = Math.min(PH - y - 44, 420), side = M + ps + 22, sw = 792 - M - side;
  const cv = kind === 'gen' ? plantaGenCanvas(W.G, 600) : plantaShotCanvas(W.s3, 600);
  try { doc.addImage(cv.toDataURL('image/jpeg', .9), 'JPEG', M, y, ps, ps); } catch (e) { PDF_MISS++; }
  doc.setDrawColor(...PT.line); doc.setLineWidth(.6); doc.rect(M, y, ps, ps);
  let ty = y + 10;
  if (kind === 'gen') {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text('PLANOS', side, ty); ty += 14;
    for (const S of W.G.shots) {
      if (ty > PH - 50) break;
      doc.setFillColor(...rgb(S.col)); doc.rect(side, ty - 8, 9, 9, 'F');
      doc.setFont('title', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK); doc.text(pdfSafe(S.code), side + 15, ty);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
      doc.text(pdfSafe(S.cams.map(C => (C.letter ? C.letter + ' ' : '') + Math.round(C.cam.lens) + ' mm').join(' · ')), side + 52, ty);
      ty += 11;
      if (S.desc) { doc.setTextColor(...INK); const d = doc.splitTextToSize(pdfSafe(S.desc), sw - 15).slice(0, 2); doc.text(d, side + 15, ty); ty += d.length * 10; }
      ty += 6;
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    const note = doc.splitTextToSize(pdfSafe('Cada cámara lleva el código de su plano y su lente; la cámara B, el cono punteado. Las figuras van una vez; sus otras posiciones son los puntos con el código del plano. Las flechas finas: lo que se desplaza.'), sw);
    doc.text(note, side, Math.min(PH - 40 - note.length * 9, Math.max(ty + 4, y + ps - note.length * 9)));
  } else {
    doc.setFont('title', 'bold'); doc.setFontSize(20); doc.setTextColor(...INK); doc.text(pdfSafe(W.code), side, ty + 8); ty += 26;
    for (const [k, v] of plantaShotLines(W)) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(pdfSafe(k.toUpperCase()), side, ty); ty += 11;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK);
      const L = doc.splitTextToSize(pdfSafe(v), sw).slice(0, 6); doc.text(L, side, ty); ty += L.length * 12 + 8;
    }
  }
  pageNumbers(doc, kind === 'gen' ? 'Planta general' : W.label);
  return { doc, name: fileSafe(P.meta.title) + W.file + '.pdf' };
}
const pdfPlanta = opts => pdfPlantaPage('shot', opts);
const pdfPlantaGen = opts => pdfPlantaPage('gen', opts);
/* la misma página como imagen: título del proyecto, la escena y el plano arriba; la planta y su leyenda */
async function plantaPNG(kind, opts) {
  if (!proGate('planta')) return;
  try {
    await preloadPlans();
    const W = plantaWhat(kind, opts), Wd = 2400, Hd = 1560, c = document.createElement('canvas'); c.width = Wd; c.height = Hd;
    const g = c.getContext('2d'), ink = '#1E2329', mut = '#5F6977';
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, Wd, Hd);
    const tf = (w, s) => `${w} ${s}px 'Familjen Grotesk', Archivo, Arial, sans-serif`, uf = (w, s) => `${w} ${s}px Archivo, Arial, sans-serif`;
    g.fillStyle = ink; g.font = tf(700, 54); g.textBaseline = 'alphabetic'; g.fillText(P.meta.title || '', 80, 112);
    g.fillStyle = mut; g.font = uf(600, 30); g.fillText(`${W.label} · ${W.sub}`, 80, 162);
    g.fillStyle = ink; g.font = uf(700, 28); g.fillText(pgShort(`Esc. ${W.s.key} · ${W.s.heading}`, 90), 80, 210);
    const ps = Hd - 250 - 70, px = 80, py = 250;
    const pc = kind === 'gen' ? plantaGenCanvas(W.G, Math.round(ps / 2), 2) : plantaShotCanvas(W.s3, Math.round(ps / 2), 2);
    g.drawImage(pc, px, py, ps, ps);
    g.strokeStyle = '#DDDBD7'; g.lineWidth = 2; g.strokeRect(px, py, ps, ps);
    const sx = px + ps + 70, sw = Wd - sx - 80;
    let ty = py + 20;
    const wrap = (txt, x, y, w, lh, max) => { const words = String(txt).split(/\s+/); let line = '', n = 0; for (const w0 of words) { const t = line ? line + ' ' + w0 : w0; if (g.measureText(t).width > w && line) { g.fillText(line, x, y); y += lh; line = w0; if (++n >= max - 1) { line = pgShort(words.slice(words.indexOf(w0)).join(' '), 60); break; } } else line = t; } if (line) { g.fillText(line, x, y); y += lh; } return y; };
    if (kind === 'gen') {
      for (const S of W.G.shots) {
        if (ty > Hd - 120) break;
        g.fillStyle = S.col; g.fillRect(sx, ty - 24, 26, 26);
        g.fillStyle = ink; g.font = tf(700, 34); g.fillText(S.code, sx + 42, ty);
        g.fillStyle = mut; g.font = uf(600, 26); g.fillText(S.cams.map(C => (C.letter ? C.letter + ' ' : '') + Math.round(C.cam.lens) + ' mm').join(' · '), sx + 150, ty);
        ty += 38; g.fillStyle = ink; g.font = uf(400, 26); if (S.desc) ty = wrap(S.desc, sx + 42, ty, sw - 42, 32, 2); ty += 18;
      }
    } else {
      g.fillStyle = ink; g.font = tf(700, 64); g.fillText(W.code, sx, ty + 30); ty += 90;
      for (const [k, v] of plantaShotLines(W)) { g.fillStyle = mut; g.font = uf(700, 22); g.fillText(k.toUpperCase(), sx, ty); ty += 36; g.fillStyle = ink; g.font = uf(400, 28); ty = wrap(v, sx, ty, sw, 36, 6) + 18; }
    }
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    await offerFile(fileSafe(P.meta.title) + W.file + '.png', blob);
  } catch (e) { console.error(e); problem('No se pudo generar la imagen de la planta. Vuelve a intentarlo.'); }
}
/* exportar desde la planta completa del editor (con sus cambios sin guardar) o desde la planta general */
function plantaExportMenu(btn, o) {
  popover(btn, `<div class="menu">${o.id ? `<button data-x="spdf">Planta del plano · PDF</button><button data-x="spng">Planta del plano · imagen PNG</button>` : ''}${o.sc ? `${o.id ? '<hr>' : ''}<button data-x="gpdf">Planta general de la escena · PDF</button><button data-x="gpng">Planta general de la escena · imagen PNG</button>` : ''}</div>`, p => p.addEventListener('click', e => {
    const b = e.target.closest('[data-x]'); if (!b) return; closePop();
    const x = b.dataset.x;
    if (x === 'spdf') exportPDF('planta', btn, { id: o.id, s3: o.s3 });
    if (x === 'spng') plantaPNG('shot', { id: o.id, s3: o.s3 });
    if (x === 'gpdf') exportPDF('plantagen', btn, { sc: o.sc, live: o.live });
    if (x === 'gpng') plantaPNG('gen', { sc: o.sc, live: o.live });
  }));
}
