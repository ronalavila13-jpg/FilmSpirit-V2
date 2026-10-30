/* ============================================================
   FIGURAS Y OBJETOS 3D · caras, cuerpos, cabello, poses y utilería
   ============================================================ */
/* ---------- caras ---------- */
function faceTexture(expr) {
  if (expr === '__live') expr = 'neutral';   // el maniquí simple (mientras carga el articulado) no muestra el dibujo en curso
  if (R3.faces[expr]) return R3.faces[expr];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  drawFace(g, 128, expr);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  return (R3.faces[expr] = new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false }));
}
/* ---------- expresiones dibujadas a mano ----------
   Cada dibujo: una expresión predefinida como base (o ninguna) y los trazos encima, en coordenadas de 0 a 128.
   Se guardan los trazos (no una imagen), así se pueden volver a editar. Viven en dos lugares:
   - en el personaje (el.look.faces): sus versiones de las predefinidas («feliz»…) y las suyas («c:…»);
     el.look.eyes === false quita los ojos predefinidos (se dibujan a mano);
   - en el proyecto (P.faces, «f:…»): las de las figuras genéricas (y las de versiones anteriores).
   Trazo: { p: [x, y, …], w: grosor, q: [ancho de cada punto en %] (pincel con presión), c: color,
            e: 1 borrador, f: 1 relleno, m: 1 simétrico (se repite reflejado en el eje de la cara) } */
const FACE_C = {};
const FACE_INK = '#2A2724';
const customFace = id => (typeof P !== 'undefined' && P && P.faces && P.faces[id]) || null;
function faceStrokes(g, S, strokes) {
  const k = S / 128;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (const st of strokes) {
    const p = st.p; if (!p || p.length < 2) continue;
    g.globalCompositeOperation = st.e ? 'destination-out' : 'source-over';
    g.strokeStyle = g.fillStyle = st.c || FACE_INK;
    for (const mir of st.m ? [0, 1] : [0]) {
      const X = i => (mir ? 128 - p[i] : p[i]) * k, Y = i => p[i + 1] * k;
      const W = j => st.w * k * (st.q ? (st.q[j] == null ? 100 : st.q[j]) / 100 : 1);
      if (p.length < 4) { g.beginPath(); g.arc(X(0), Y(0), W(0) / 2, 0, Math.PI * 2); g.fill(); continue; }
      if (st.q && !st.f) {
        // pincel: cada tramo con su grosor (extremos redondos: no se notan las uniones)
        let px = X(0), py = Y(0);
        for (let i = 2; i < p.length; i += 2) {
          const last = i >= p.length - 2, mx = last ? X(i) : (X(i) + X(i + 2)) / 2, my = last ? Y(i) : (Y(i) + Y(i + 2)) / 2;
          g.lineWidth = Math.max(.3 * k, (W(i / 2 - 1) + W(i / 2)) / 2);
          g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(X(i), Y(i), mx, my); g.stroke();
          px = mx; py = my;
        }
        continue;
      }
      g.lineWidth = st.w * k;
      g.beginPath(); g.moveTo(X(0), Y(0));
      if (st.ln) for (let i = 2; i < p.length; i += 2) g.lineTo(X(i), Y(i));   // polígono: bordes rectos
      else {
        for (let i = 2; i < p.length - 2; i += 2) g.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 2)) / 2, (Y(i) + Y(i + 2)) / 2);
        g.lineTo(X(p.length - 2), Y(p.length - 2));
      }
      if (st.f) { g.closePath(); g.fill(); }
      g.stroke();
    }
  }
  g.restore();
}
/* un dibujo completo: la base (sin ojos si el personaje los quitó) y los trazos */
function faceDrawing(g, S, d, eyes = true) {
  if (d.base) drawFace(g, S, d.base, { eyes });
  faceStrokes(g, S, d.strokes || []);
}
function faceCanvas(d, S = 256, eyes = true) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  faceDrawing(c.getContext('2d'), S, d, eyes);
  return c;
}
function customFaceCanvas(id) {
  const d = customFace(id); if (!d) return null;
  const key = id + '|' + (d.v || 0), hit = FACE_C[id];
  if (hit && hit.key === key) return hit.c;
  const c = faceCanvas(d);
  FACE_C[id] = { key, c };
  return c;
}
/* la cara que lleva una figura: «feliz» puede ser la versión redibujada de su personaje. Devuelve una clave
   que cambia con cada edición (así las texturas se rehacen solas): «k:personaje:expresión:versión:ojos» */
function faceKeyFor(look, expr) {
  const k = faceKeyFor0(look, expr), gl = look && look.glasses;
  return gl && FACE_GLASSES.some(([g]) => g && g === gl) ? 'gl:' + gl + '~' + k : k;
}
function faceKeyFor0(look, expr) {
  expr = expr || 'neutral';
  if (expr.slice(0, 2) === 'f:' || !look || !look.key) return expr.slice(0, 2) === 'c:' ? 'neutral' : expr;
  const faces = look.faces || {}, d = faces[expr], ne = look.eyes === false;
  if (!d && !ne) return expr.slice(0, 2) === 'c:' ? 'neutral' : expr;
  return 'k:' + look.key + ':' + expr + ':' + (d ? d.v || 0 : 0) + ':' + (ne ? 'n' : 'o');
}
function charFaceCanvas(key) {
  const hit = FACE_C[key]; if (hit) return hit.c;
  const parts = key.split(':'), ne = parts.pop() === 'n'; parts.pop();
  const id = parts[1], ex = parts.slice(2).join(':');
  const el = typeof P !== 'undefined' && P && P.elements[id], lk = (el && el.look) || {}, d = (lk.faces || {})[ex];
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  if (d) faceDrawing(g, 256, d, !ne); else drawFace(g, 256, ex.slice(0, 2) === 'c:' ? 'neutral' : ex, { eyes: !ne });
  for (const k of Object.keys(FACE_C)) if (k.startsWith('k:' + id + ':' + ex + ':')) delete FACE_C[k];   // versiones viejas
  FACE_C[key] = { c };
  return c;
}
/* una expresión dibujada del proyecto cambió: se rehacen sus texturas y las figuras que la llevan */
let FACE_REV = 0;   // sube cada vez que cambia un dibujo de cara del proyecto (las viñetas guardadas lo usan en su clave)
function faceChanged(id) {
  const k = 'f:' + id;
  FACE_REV++;
  delete FACE_C[id];
  if (typeof R3 !== 'undefined' && R3.faces && R3.faces[k]) { const m = R3.faces[k]; if (m.map) m.map.dispose(); m.dispose(); delete R3.faces[k]; }
  if (typeof FIG3D !== 'undefined' && FIG3D.faceTex && FIG3D.faceTex[k]) { FIG3D.faceTex[k].dispose(); delete FIG3D.faceTex[k]; }
  if (typeof R3 !== 'undefined' && R3.objs) for (const A of R3.objs.values()) if (A.expr === k) A.expr = null;
  if (typeof THUMB3 !== 'undefined') THUMB3.clear();
}
/* pincel de grosor variable a lo largo de una curva (cejas y párpados): se rellena el contorno.
   q = [x0, y0, cx, cy, x1, y1]; w(t) = grosor en cada punto (t de 0 a 1) */
function faceBrush(g, q, w) {
  const N = 20, L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const x = u * u * q[0] + 2 * u * t * q[2] + t * t * q[4], y = u * u * q[1] + 2 * u * t * q[3] + t * t * q[5];
    const dx = 2 * u * (q[2] - q[0]) + 2 * t * (q[4] - q[2]), dy = 2 * u * (q[3] - q[1]) + 2 * t * (q[5] - q[3]);
    const l = Math.hypot(dx, dy) || 1, h = Math.max(.05, w(t)) / 2;
    L.push([x - dy / l * h, y + dx / l * h]); R.push([x + dy / l * h, y - dx / l * h]);
  }
  g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (const [x, y] of L) g.lineTo(x, y);
  for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath(); g.fill();
}
/* perfil de grosor: a en el inicio, b en el punto m (0..1), c al final */
const faceTaper = (a, b, c, m = .5) => t => t < m ? a + (b - a) * Math.sin(t / m * Math.PI / 2) : c + (b - c) * Math.sin((1 - t) / (1 - m) * Math.PI / 2);
/* lentes dibujados sobre la cara (lunas transparentes: se ve el ojo, con un brillo suave) */
const FACE_GLASSES = [['', 'Sin lentes'], ['redondos', 'Redondos'], ['ovalados', 'Ovalados'], ['rectangulares', 'Rectangulares']];
function drawGlasses(g, S, style) {
  if (!style) return;
  const k = S / 128, L = 48, R = 80, EY = 61;
  g.save(); g.scale(k, k);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const lens = (cx, fn) => {
    g.beginPath();
    if (style === 'redondos') g.arc(cx, EY, 11.6, 0, Math.PI * 2);
    else if (style === 'ovalados') g.ellipse(cx, EY, 12.6, 9.6, 0, 0, Math.PI * 2);
    else { const w = 13.2, h = 9.8, r = 3.4; g.moveTo(cx - w + r, EY - h); g.arcTo(cx + w, EY - h, cx + w, EY + h, r); g.arcTo(cx + w, EY + h, cx - w, EY + h, r); g.arcTo(cx - w, EY + h, cx - w, EY - h, r); g.arcTo(cx - w, EY - h, cx + w, EY - h, r); g.closePath(); }
    fn();
  };
  const half = style === 'redondos' ? 11.6 : style === 'ovalados' ? 12.6 : 13.2;
  for (const cx of [L, R]) {
    // luna: un velo muy leve y un brillo en diagonal, recortado por el aro
    lens(cx, () => { g.fillStyle = 'rgba(205,228,250,.16)'; g.fill(); g.save(); g.clip();
      // reflejo: un arco corto junto al aro, arriba a la izquierda (no tapa el ojo)
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, EY, half * .74, half * .66, 0, Math.PI * 1.08, Math.PI * 1.42); g.stroke(); g.restore(); });
    lens(cx, () => { g.strokeStyle = FACE_INK; g.lineWidth = 1.7; g.stroke(); });
  }
  g.strokeStyle = FACE_INK;
  g.lineWidth = 1.6; g.beginPath(); g.moveTo(L + half - .4, EY - 2); g.quadraticCurveTo(64, EY - 5.2, R - half + .4, EY - 2); g.stroke();   // puente
  g.lineWidth = 1.5; for (const sd of [-1, 1]) { const x0 = sd < 0 ? L - half : R + half; g.beginPath(); g.moveTo(x0, EY - 2.5); g.lineTo(x0 + sd * 7, EY - 3.4); g.stroke(); }   // patillas
  g.restore();
}
/* dibuja la cara en un cuadrado de lado S (también se usa en la interfaz). Estilo neutro, entre anime y cartoon
   (sirve para cualquier personaje): cejas casi rectas, iris ovalado y oscuro con un brillo bajo una línea de
   párpado pareja, sin pestañas; bocas simples. Ojos, cejas y boca van agrandados sobre la retícula de 128.
   opt.eyes === false: sin ojos (el personaje los lleva dibujados a mano). «gl:estilo~clave»: con lentes */
function drawFace(g, S, expr, opt) {
  if (typeof expr === 'string' && expr.slice(0, 3) === 'gl:') {
    const i = expr.indexOf('~');
    drawFace(g, S, expr.slice(i + 1), opt); drawGlasses(g, S, expr.slice(3, i)); return;
  }
  if (typeof expr === 'string' && expr.slice(0, 2) === 'f:') {
    const c = customFaceCanvas(expr.slice(2));
    if (c) { g.drawImage(c, 0, 0, S, S); return; }
    expr = 'neutral';   // la expresión dibujada se borró: cara neutral
  }
  if (typeof expr === 'string' && expr.slice(0, 2) === 'k:') { g.drawImage(charFaceCanvas(expr), 0, 0, S, S); return; }
  const eyes = !opt || opt.eyes !== false;
  const k = S / 128;
  g.save(); g.scale(k, k);
  g.strokeStyle = g.fillStyle = FACE_INK; g.lineCap = 'round'; g.lineJoin = 'round';
  const L = 48, R = 80, EY = 60, MY = 90;
  // ceja: casi recta, apenas más fina hacia afuera. a = alto del extremo interior, m = del arco, o = del exterior
  const brow0 = (cx, s, a = 0, m = 0, o = 0, w = 2.4) => faceBrush(g, [cx - s * 5, EY - 10.4 + a, cx + s * 1.5, EY - 13.2 + m, cx + s * 7.2, EY - 11.4 + o], faceTaper(w * .9, w, w * .55, .35));
  // ojo abierto (entre anime y cartoon, neutro): iris ovalado con un brillo y una línea de párpado pareja,
  // sin pestañas ni punta. s: -1 ojo de la izquierda de la imagen, +1 el otro
  const eye0 = (cx, s, o = {}) => {
    const op = o.open || 1, ir = o.iris || 1, ti = o.tin || 0, to = o.tout || 0;
    const I = [cx - s * 5, EY + .8 + ti], O = [cx + s * 5.6, EY + .2 + to], C = [cx + s * (o.cin ? -1 : .3), EY + 1 - 7.4 * op + (o.cin || 0)];
    // iris recortado por el párpado
    g.save();
    g.beginPath(); g.moveTo(I[0], I[1]); g.quadraticCurveTo(C[0], C[1], O[0], O[1]);
    g.quadraticCurveTo(cx, EY + 10 * Math.min(1.15, op), I[0], I[1]); g.closePath(); g.clip();
    const ix = cx + s * .2 + (o.lx || 0), iy = EY + 1.9 + (o.ly || 0);
    g.beginPath(); g.ellipse(ix, iy, 3.3 * ir, 4.2 * ir, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFFFFF';
    g.beginPath(); g.arc(ix - 1.1 * ir, iy - 1.5 * ir, .58 * ir, 0, Math.PI * 2); g.fill();
    g.restore();
    faceBrush(g, [I[0], I[1], C[0], C[1], O[0], O[1]], faceTaper(.7, 2.1, 1.1, .5));
    // ojeras (cansado): un arco fino y tenue bajo el ojo
    if (o.bags) { g.save(); g.globalAlpha = .45; faceBrush(g, [cx - s * 3.4, EY + 8.2, cx + s * .6, EY + 9.6, cx + s * 4.2, EY + 7.8], faceTaper(.2, 1, .2)); g.restore(); }
  };
  // ojo cerrado: arco hacia arriba (^, risa) o hacia abajo (dormido, tranquilo)
  const shut0 = (cx, s, up) => {
    if (up) faceBrush(g, [cx - s * 5.6, EY + 2.2, cx + s * .2, EY - 5.4, cx + s * 5.8, EY + 2.2], faceTaper(.7, 2.4, .7, .5));
    else faceBrush(g, [cx - s * 5.4, EY + .8, cx + s * .2, EY + 5.4, cx + s * 5.8, EY + .6], faceTaper(.6, 2.3, .8, .5));
  };
  // ojos apretados: > <
  const squeeze0 = (cx, s) => { g.lineWidth = 2.4; g.beginPath(); g.moveTo(cx + s * 5.5, EY - 4.5); g.lineTo(cx - s * 4, EY); g.lineTo(cx + s * 5.5, EY + 4.5); g.stroke(); };
  // lágrimas: un hilo celeste desde el borde del ojo, con la gota al final
  const tear0 = (cx, s) => {
    g.save(); g.strokeStyle = g.fillStyle = '#7FB6E6'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(cx + s * 2.5, EY + 5.5); g.quadraticCurveTo(cx + s * 3.6, EY + 11, cx + s * 2.8, EY + 15.5); g.stroke();
    g.beginPath(); g.moveTo(cx + s * 2.8, EY + 14.2); g.quadraticCurveTo(cx + s * 4.6, EY + 17.6, cx + s * 2.8, EY + 18.6); g.quadraticCurveTo(cx + s * 1, EY + 17.6, cx + s * 2.8, EY + 14.2); g.fill();
    g.restore();
  };
  // ojos, cejas y boca más grandes que la retícula de 128 (se agrandan desde el centro de cada ojo y de la boca)
  const big = (f, z) => (cx, s, o) => { g.save(); g.translate(cx, EY); g.scale(z, z); g.translate(-cx, -EY); f(cx, s, o); g.restore(); };
  const both = f => { f(L, -1); f(R, 1); };
  const eye = big(eye0, 1.48), shut = big(shut0, 1.48), squeeze = big(squeeze0, 1.43), tear = big(tear0, 1.48);
  const brow = (cx, s, a, m, o, w) => big((x, sd) => brow0(x, sd, a, m, o, w), 1.46)(cx, s);
  const mouth = f => { g.save(); g.translate(64, MY); g.scale(1.3, 1.3); g.translate(-64, -MY); f(); g.restore(); };
  const line = (x0, y0, cx, cy, x1, y1, w = 1.8) => mouth(() => faceBrush(g, [x0, y0, cx, cy, x1, y1], faceTaper(.5, w, .5)));
  const poly = (pts, w = 1.6) => mouth(() => { g.lineWidth = w; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); });
  const mouthOpen = (x0, x1, y0, yb, tongue = true) => mouth(() => {
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(64, y0 + 1, x1, y0); g.quadraticCurveTo(64, yb, x0, y0); g.closePath(); g.fill();
    if (tongue) { g.save(); g.clip(); g.fillStyle = '#C65A4E'; g.beginPath(); g.ellipse(64, yb - 5, (x1 - x0) * .3, 4, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  });
  const blush = () => { g.save(); g.fillStyle = 'rgba(226,128,120,.42)'; for (const x of [40, 88]) { g.beginPath(); g.ellipse(x, EY + 13, 6.5, 3.2, 0, 0, Math.PI * 2); g.fill(); } g.restore(); };
  switch (expr) {
    case 'feliz':
      both((x, s) => brow(x, s, -1.6, -1.8, -1)); if (eyes) both((x, s) => eye(x, s, { open: .95 }));
      line(54.5, 87.5, 64, 95.5, 73.5, 87.5, 2.1); break;
    case 'risa':
      both((x, s) => brow(x, s, -2.4, -2.6, -1.4)); if (eyes) both((x, s) => shut(x, s, true));
      mouthOpen(53.5, 74.5, 86, 104); break;
    case 'triste':
      both((x, s) => brow(x, s, -3.4, -1.2, 2.2)); if (eyes) both((x, s) => eye(x, s, { open: .82, tout: 1.4, ly: .8 }));
      line(56.5, 94, 64, 87.5, 71.5, 94, 1.9); break;
    case 'enojado':
      both((x, s) => brow(x, s, 4.6, 2.4, -1.6, 2.9)); if (eyes) both((x, s) => eye(x, s, { open: .78, cin: 1.8, iris: .86 }));
      line(57, 92.5, 64, 88.5, 71, 92.5, 2.1); break;
    case 'sorpresa':
      both((x, s) => brow(x, s, -4.4, -4.8, -3.2)); if (eyes) both((x, s) => eye(x, s, { open: 1.28, iris: .74 }));
      mouth(() => { g.beginPath(); g.ellipse(64, 92.5, 3.6, 4.8, 0, 0, Math.PI * 2); g.fill(); }); break;
    case 'miedo': {
      both((x, s) => brow(x, s, -4.2, -2.2, -.4)); if (eyes) both((x, s) => eye(x, s, { open: 1.22, iris: .68 }));
      const w = [55.5, 92.5]; for (let i = 1; i <= 6; i++) w.push(55.5 + i * 2.85, i % 2 ? 90.6 : 92.8); poly(w, 1.5); break;
    }
    case 'pensativo':
      brow(L, -1, .6, .4, .4); brow(R, 1, -1.6, -3.4, -2.2);
      if (eyes) both((x, s) => eye(x, s, { open: .9, lx: 1.6, ly: -1 }));
      line(60, 91.5, 66, 90.6, 71.5, 89, 1.7); break;
    case 'grito':
      both((x, s) => brow(x, s, 4.4, 2, -1.8, 2.8)); if (eyes) both(squeeze);
      mouthOpen(55, 73, 86.5, 108); break;
    case 'ojos cerrados':
      both((x, s) => brow(x, s, .6, .6, .8)); if (eyes) both((x, s) => shut(x, s, false));
      line(59, 90.5, 64, 91.2, 69, 90.5, 1.6); break;
    case 'preocupado':
      both((x, s) => brow(x, s, -3, -1.4, 1.4)); if (eyes) both((x, s) => eye(x, s, { open: .96, ly: .5, iris: .92 }));
      poly([57.5, 92, 60.5, 90.8, 64, 91.6, 67.5, 90.8, 70.5, 92], 1.5); break;
    case 'dolor':
      both((x, s) => brow(x, s, -2.6, .6, 2.4, 2.6)); if (eyes) both((x, s) => shut(x, s, false));
      mouth(() => {   // dientes apretados
        const x0 = 55, x1 = 73, y0 = 87.6, y1 = 93.6, r = 2.4;
        g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x1, y0, x1, y1, r); g.arcTo(x1, y1, x0, y1, r); g.arcTo(x0, y1, x0, y0, r); g.arcTo(x0, y0, x1, y0, r); g.closePath();
        g.fillStyle = '#FFFFFF'; g.fill(); g.lineWidth = 1.5; g.stroke();
        g.lineWidth = .9; g.beginPath(); g.moveTo(x0, 90.6); g.lineTo(x1, 90.6); for (const x of [59.5, 64, 68.5]) { g.moveTo(x, y0); g.lineTo(x, y1); } g.stroke();
      }); break;
    case 'asco':
      brow(L, -1, 3.6, 1.8, -.4, 2.7); brow(R, 1, 1.2, -1.2, -.6);
      if (eyes) both((x, s) => eye(x, s, { open: .62, cin: 1.2, iris: .9 }));
      poly([55, 92.4, 59, 90.6, 63, 92.2, 67.5, 89.2, 72.5, 90.6], 1.7); break;
    case 'desconfiado':
      brow(L, -1, 2.8, 1.8, 1.2, 2.7); brow(R, 1, -.4, -1.6, -.8);
      if (eyes) both((x, s) => eye(x, s, { open: .56, lx: 1.8, iris: .9 }));
      line(58, 91.4, 64, 91, 70.5, 89.8, 1.7); break;
    case 'cansado':
      both((x, s) => brow(x, s, .4, 1, 1.8)); if (eyes) both((x, s) => eye(x, s, { open: .55, ly: 1.4, bags: 1 }));
      line(59.5, 91, 64, 91.4, 68.5, 91, 1.5); break;
    case 'avergonzado':
      blush(); both((x, s) => brow(x, s, -1.8, -.8, .6)); if (eyes) both((x, s) => eye(x, s, { open: .86, ly: 1.5, lx: -.8 }));
      poly([58.5, 91.6, 61.4, 90.6, 64, 91.6, 66.6, 90.6, 69.5, 91.6], 1.4); break;
    case 'guino':
      brow(L, -1, -1.4, -1.6, -.8); brow(R, 1, .8, .4, .4);
      if (eyes) { eye(L, -1, { open: .98 }); shut(R, 1, true); }
      line(55.5, 88.6, 63.5, 94.6, 72.5, 87, 2); break;
    case 'decidido':
      both((x, s) => brow(x, s, 2.6, 1.2, -.6, 2.8)); if (eyes) both((x, s) => eye(x, s, { open: .86, cin: .8 }));
      line(56, 91.6, 64, 91, 72, 91.6, 2.1); break;
    case 'llanto':
      both((x, s) => brow(x, s, -3.8, -1, 2.4)); if (eyes) { both((x, s) => shut(x, s, false)); both(tear); }
      mouth(() => { g.beginPath(); g.moveTo(55, 95); g.quadraticCurveTo(64, 84.5, 73, 95); g.quadraticCurveTo(64, 100.5, 55, 95); g.closePath(); g.fill(); }); break;
    case 'confundido':
      brow(L, -1, -3.6, -4.6, -3.4); brow(R, 1, 2.2, 1, .2);
      if (eyes) both((x, s) => eye(x, s, { open: 1, lx: -1, ly: -.8, iris: .92 }));
      poly([57.5, 91.8, 60.5, 90.4, 63.5, 91.8, 66.5, 90.4, 70.5, 91], 1.5); break;
    default:
      both((x, s) => brow(x, s)); if (eyes) both((x, s) => eye(x, s));
      line(58.5, 90, 64, 91, 69.5, 90, 1.7);
  }
  g.restore();
}

/* ---------- maniquí ---------- */
const HAIR_GEO = {};
function hairGeo(k) {
  if (HAIR_GEO[k]) return HAIR_GEO[k];
  const T = THREE, r = .115, HS = Math.PI / 6;
  const g = {
    // termina sobre las cejas para que el flequillo no tape los ojos
    cap: () => new T.SphereGeometry(r * 1.07, 12, 4, HS / 2, Math.PI * 2, 0, Math.PI * .44),
    shell: () => new T.SphereGeometry(r * 1.12, 9, 6, Math.PI / 2 + .75, Math.PI * 2 - 1.5, 0, Math.PI * .7),
    band: () => new T.SphereGeometry(r * 1.05, 8, 2, Math.PI / 2 + 1.1, Math.PI * 2 - 2.2, Math.PI * .45, Math.PI * .2),
    back: () => new T.CapsuleGeometry(.1, .2, 2, 7),
    bun: () => new T.IcosahedronGeometry(.058, 0),
    tail: () => new T.CapsuleGeometry(.035, .12, 2, 5),
  }[k]();
  return (HAIR_GEO[k] = lowPoly(g));
}
function buildHair(style, mat) {
  const g = new THREE.Group();
  const add = (k, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0) => { const m = new THREE.Mesh(hairGeo(k), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.x = rx; m.castShadow = true; g.add(m); return m; };
  if (style === 'ninguno') return g;
  if (style === 'calvo') { add('band', 0, 0, 0); return g; }
  add('cap', 0, .006, -.006, 1, 1.02, 1.04);
  if (style === 'largo') { add('shell', 0, .004, -.004, 1, 1.05, 1.02); add('back', 0, -.16, -.065, 1.15, 1.05, .5); }
  if (style === 'melena') add('shell', 0, .004, -.004, 1.02, 1.08, 1.04);
  if (style === 'recogido') add('bun', 0, .07, -.105);
  if (style === 'colitas') { add('tail', .118, -.05, -.03, 1, 1, 1, .2); add('tail', -.118, -.05, -.03, 1, 1, 1, .2); }
  return g;
}
/* la figura se rearma cuando cambia algo que afecta a su geometría */
const actorKey = look => [look.body, look.ropa, look.pelo, ...S3_PROP.map(([f]) => look[f] || 100)].join('|');
function makeActor(look) {
  // maniquí articulado (s3d-figuras.js) si ya cargó; si no, el simple mientras carga
  if (look.model && typeof ch3Has === 'function' && ch3Has(look)) { const X = makeExtActor(look); if (X) return X; }   // su modelo 3D importado
  if (typeof FIG3D !== 'undefined') { if (FIG3D.has(look.body)) return makeFigActor(look); FIG3D.want(look.body); }
  return makeSimpleActor(look);
}
/* el maniquí simple (piezas redondeadas): mientras carga el articulado, y para los extras en grupo */
function makeSimpleActor(look) {
  const G = R3.geo, M = R3.mats, T = THREE;
  const B0 = S3_BODY[look.body] || S3_BODY.hombre, pc = f => (look[f] || 100) / 100;
  const B = { ...B0, sh: B0.sh * pc('shw'), hip: B0.hip * pc('hipw'), head: B0.head * pc('headk') };
  const limb = pc('limb'), belly = pc('belly');
  // todo el cuerpo con el tono del personaje (pelo y pantalón, un poco más oscuros)
  const tono = look.tono || S3_TONOS[0];
  const shirt = new T.MeshLambertMaterial({ color: tono });
  const skin = new T.MeshLambertMaterial({ color: tono });
  const hairM = new T.MeshLambertMaterial({ color: tono }); hairM.color.multiplyScalar(.86);
  const pants = new T.MeshLambertMaterial({ color: tono }); pants.color.multiplyScalar(.94);
  const root = new T.Group();
  const body = new T.Group(); body.scale.set(look.s * look.w, look.s, look.s * (.5 + .5 * look.w)); root.add(body);
  const hips = new T.Group(); hips.position.y = .95; body.add(hips);
  const pelvis = m3(G.pelvis, look.ropa === 'vestido' ? shirt : pants, B.hip, 1, .8); pelvis.rotation.z = Math.PI / 2; hips.add(pelvis);
  const spine = new T.Group(); spine.position.y = .04; hips.add(spine);
  spine.add(m3(G.torso, shirt, 1.12 * B.sh * (.85 + .15 * belly), 1, (B.fem ? .7 : .74) * belly, 0, .29, .03 * (belly - 1)));
  const chest = new T.Object3D(); chest.position.set(0, .28, .19); spine.add(chest);
  const neck = new T.Group(); neck.position.y = .56; spine.add(neck);
  neck.add(m3(G.neck, skin, 1, 1, 1, 0, .03, 0));
  const head = new T.Group(); head.position.y = .14 + (B.head - 1) * .1; head.scale.setScalar(B.head); neck.add(head);
  head.add(m3(G.head, skin, .92, 1.06, 1));
  const face = new T.Mesh(G.face, faceTexture('neutral')); face.scale.set(.92, 1.06, 1); head.add(face);
  face.visible = !B.faceless;
  const hair = buildHair(['melena', 'larga', 'flequillo', 'ondas'].includes(look.pelo) ? 'melena' : ['recogido', 'cola', 'coletas'].includes(look.pelo) ? 'recogido' : 'ninguno', hairM);   // maniquí simple (mientras carga el articulado) hair.scale.set(.92, 1.06, 1); head.add(hair);
  const arm = side => {
    const sh = new T.Group(); sh.position.set(.22 * side * B.sh, .5, 0); spine.add(sh);
    sh.add(m3(G.upper, shirt, limb, 1, limb, 0, -.15, 0));
    const el = new T.Group(); el.position.y = -.3; sh.add(el);
    el.add(m3(G.fore, skin, limb, 1, limb, 0, -.14, 0));
    const hand = m3(G.hand, skin, 1, 1.15, .8, 0, -.3, 0); el.add(hand);
    return { sh, el, hand };
  };
  const leg = side => {
    const hp = new T.Group(); hp.position.set(.095 * side * B.hip, -.03, 0); hips.add(hp);
    hp.add(m3(G.thigh, look.ropa === 'pantalon' ? pants : skin, limb, 1, limb, 0, -.22, 0));
    const kn = new T.Group(); kn.position.y = -.45; hp.add(kn);
    kn.add(m3(G.shin, look.ropa === 'pantalon' ? pants : skin, limb, 1, limb, 0, -.22, 0));
    const an = new T.Group(); an.position.y = -.45; kn.add(an);   // tobillo: el pie queda plano al apoyar
    an.add(m3(G.foot, M.dark, 1, 1, 1, 0, 0, .05));
    return { hp, kn, an };
  };
  let skirt = null;
  if (look.ropa === 'falda' || look.ropa === 'vestido') {
    skirt = m3(R3.geo.skirt, look.ropa === 'vestido' ? shirt : pants, B.hip, 1, .85, 0, -.24, 0);
    hips.add(skirt);
  }
  const blob = new T.Mesh(G.blob, M.blob); blob.rotation.x = -Math.PI / 2; blob.position.y = .004; blob.scale.setScalar(.38 * Math.max(.7, look.s) * look.w); root.add(blob);
  const sel = new T.Mesh(G.ring, M.sel); sel.rotation.x = -Math.PI / 2; sel.position.y = .006; sel.visible = false; root.add(sel);
  root.traverse(o => { if (o.isMesh && o !== blob && o !== sel && o.material !== R3.faces.neutral) { o.castShadow = true; o.receiveShadow = true; } });
  face.castShadow = false;
  return { root, body, pants, s: look.s, hips, spine, neck, head, face, hair, chest, shirt, skin, hairM, skirt, armL: arm(1), armR: arm(-1), legL: leg(1), legR: leg(-1), blob, sel, kind: 'actor', expr: 'neutral', B, key: actorKey(look) };
}
/* ---------- la marcha ----------
   La fase (st.walk) avanza π por cada paso; p (0 a 1) es el ciclo de la pierna derecha desde que su talón toca el
   suelo; la izquierda va media vuelta después. Mientras un pie apoya, su posición bajo la cadera sale de cuánto
   avanzó el cuerpo (así no patina) y la cadera se calcula para alcanzarlo; al pasar la pierna, la cadera la lleva
   adelante y la rodilla se dobla. Los brazos van opuestos a las piernas, el tronco gira al revés que la cadera y la
   cabeza mira al frente. Al empezar y al terminar el recorrido todo entra y sale de a poco (G.w). */
const GAIT_BUMP = (p, c, w) => { const d = ((p - c) % 1 + 1.5) % 1 - .5; return Math.exp(-(d / w) * (d / w)); };
function gaitLeg(g, p) {
  const R = Math.PI / 180;
  const knee = q => (g.kb + g.kSt * GAIT_BUMP(q, g.kc, g.kw) + g.kSw * GAIT_BUMP(q, g.pSw, g.sw)) * R;
  // apoyo: el pie, quieto en el suelo, va de xa (delante) hacia atrás tanto como avanza el cuerpo
  const stanceHip = (q, k) => k / 2 + Math.asin(clamp((g.xa - q * 2 * g.S) / Math.cos(k / 2), -.98, .98));
  const k = knee(p);
  let th, foot;
  if (p < g.ps) {
    th = stanceHip(p, k);
    // el talón se levanta en el último tramo del apoyo
    const h = clamp((p - (g.ps - .2)) / .2, 0, 1);
    foot = h * h * g.heel * R;
  } else {
    // la pierna pasa: de donde despegó hasta donde caerá, con un poco de más que se recoge al final
    const q = (p - g.ps) / (1 - g.ps), a = stanceHip(g.ps, knee(g.ps)), b = stanceHip(0, knee(0)), over = g.over * R;
    // la cadera ya viene rápida al despegar: arranca ligero y llega suave (corriendo, algo más pareja)
    if (q < g.pk) { const u = q / g.pk; th = a + (b + over - a) * lerp(Math.sin(Math.PI / 2 * u), u * u * (3 - 2 * u), g.es); }
    else { const u = (q - g.pk) / (1 - g.pk); th = b + over * (.5 + .5 * Math.cos(Math.PI * u)); }
    // la punta: baja al despegar y sube un poco antes de que caiga el talón
    foot = (g.heel * (1 - Math.min(1, q / .35)) - g.toeUp * clamp((q - .5) / .5, 0, 1)) * R;
  }
  return { th, k, foot, stance: p < g.ps };
}
/* el largo vertical de una pierna (en largos de pierna) con esos ángulos */
const gaitLegY = (th, k) => (Math.cos(th) + Math.cos(th - k)) / 2;
function gaitApply(A, st, D, pose) {
  const { hips, spine, head, armL, armR, legL, legR } = A;
  const g = gaitOf(D.walk), R = Math.PI / 180, TAU = Math.PI * 2;
  const w = st.walk, n = st.walkN || 0;
  // entra en el primer medio paso y sale en el último (si se sabe cuánto camina)
  const ramp = x => { const u = clamp(x, 0, 1); return u * u * (3 - 2 * u); };
  const W = ramp(w / (Math.PI * .7)) * (n ? ramp((n - w) / (Math.PI * .7)) : 1);
  const p = ((w / TAU + .25) % 1 + 1) % 1;   // empieza con la pierna derecha bajo el cuerpo: las dos casi juntas
  const pl = (p + .5) % 1;
  const lr = gaitLeg(g, p), ll = gaitLeg(g, pl);
  const mix = (o, f, v) => { o[f] = o[f] + (v - o[f]) * W; };
  // piernas: la cadera adelante es rotación negativa; la rodilla dobla positiva
  for (const [leg, s] of [[legR, lr], [legL, ll]]) {
    mix(leg.hp.rotation, 'x', -s.th); mix(leg.kn.rotation, 'x', s.k);
    // el pie: plano en el suelo al apoyar (contra el ángulo de la canilla), luego la punta
    if (leg.an) mix(leg.an.rotation, 'x', s.foot + s.th - s.k);
  }
  // cadera: gira con la pierna que avanza, cae del lado de la que pasa y se corre hacia el pie de apoyo
  const yaw = g.yaw * R * Math.cos(TAU * p) * W, roll = -g.roll * R * Math.sin(TAU * p) * W;
  hips.rotation.y += yaw; hips.rotation.z += roll; hips.position.x += -g.sway * Math.sin(TAU * p) * W;
  spine.rotation.y -= yaw * 1.6; spine.rotation.z -= roll * .8; head.rotation.y += yaw * .6;
  spine.rotation.x += g.lean * R * W;
  // brazos: opuestos a las piernas (el derecho con la pierna izquierda), el codo más doblado adelante
  if (pose === 'pie' || pose === 'camina' || pose === 'corre') {
    for (const [arm, q, side] of [[armR, pl, -1], [armL, p, 1]]) {
      const c = Math.cos(TAU * (q - g.ac)), fwd = g.arm[0] + g.arm[1] * c;
      mix(arm.sh.rotation, 'x', -fwd * R);
      mix(arm.el.rotation, 'x', -(g.elb[0] + g.elb[1] * Math.max(0, c)) * R);
      arm.sh.rotation.z += side * g.abd * R * W;
    }
  }
  // dónde apoya la cadera: los pies en el suelo; en el vuelo (corriendo), entre el que despega y el que cae
  const stR = lr.stance, stL = ll.stance;
  let fly = { y0: 1, y1: 1, u: 0, h: 0 };
  if (!stR && !stL) {
    // del pie que despegó al que caerá (los dos vuelos de cada ciclo son iguales)
    const toe = gaitLeg(g, g.ps), hs = gaitLeg(g, 0), q = p < .5 ? p : p - .5;
    fly = { y0: gaitLegY(toe.th, toe.k), y1: gaitLegY(hs.th, hs.k), u: clamp((q - g.ps) / Math.max(.01, .5 - g.ps), 0, 1), h: g.lift };
  }
  return { stR, stL, fly, w: W };
}
/* la figura sentada queda en el aire: no se dibuja asiento (se pone una silla si hace falta) */
function poseActor(A, st) {
  const { hips, spine, neck, head, armL, armR, legL, legR, B } = A;
  hips.position.set(0, .95, 0); hips.rotation.set(0, 0, 0); spine.rotation.set(B.hunch * .9, 0, 0); neck.rotation.set(-B.hunch * .5, 0, 0); head.rotation.set(0, 0, 0);
  for (const a of [armL, armR]) { a.sh.rotation.set(0, 0, 0); a.el.rotation.set(0, 0, 0); }
  for (const l of [legL, legR]) { l.hp.rotation.set(0, 0, 0); l.kn.rotation.set(0, 0, 0); if (l.an) l.an.rotation.set(0, 0, 0); }
  armL.sh.rotation.z = .1; armR.sh.rotation.z = -.1; armL.el.rotation.x = -.12; armR.el.rotation.x = -.12;
  if (B.hunch) { legL.kn.rotation.x = legR.kn.rotation.x = .12; legL.hp.rotation.x = legR.hp.rotation.x = -.08; }
  const p = st.pose || 'pie', D = poseDef(p);
  if (A.skirt) A.skirt.visible = !D.seat;
  const r = v => (v || 0) * Math.PI / 180;
  // ángulos (grados, como las barras de S3_JOINTS) que se suman a lo que ya tiene la figura
  const addJ = j => {
    head.rotation.y += r(j.hy); head.rotation.x += r(j.hx); spine.rotation.x += r(j.tx); spine.rotation.z += r(j.tz); spine.rotation.y += r(j.ty);
    armR.sh.rotation.x -= r(j.sRx); armR.sh.rotation.z -= r(j.sRz); armR.el.rotation.x -= r(j.eR);
    armL.sh.rotation.x -= r(j.sLx); armL.sh.rotation.z += r(j.sLz); armL.el.rotation.x -= r(j.eL);
    legR.hp.rotation.x -= r(j.lR); legR.kn.rotation.x += r(j.kR); legL.hp.rotation.x -= r(j.lL); legL.kn.rotation.x += r(j.kL);
    legR.hp.rotation.z -= r(j.oR); legL.hp.rotation.z += r(j.oL);
  };
  // postura: cadera y ángulos base
  const hy0 = D.hips ? D.hips[0] : .95;
  if (D.hips) { hips.position.set(0, hy0, D.hips[2] || 0); hips.rotation.x = r(D.hips[1]); }
  if (D.j) addJ(D.j);
  if (D.neck) neck.rotation.x += r(D.neck);
  // giro del brazo sobre su eje (hacia adentro): el codo dobla hacia el cuerpo (brazos cruzados, manos juntas)
  if (D.ir) { armR.sh.rotation.y += r(D.ir[0]); armL.sh.rotation.y -= r(D.ir[1]); }
  // al desplazarse: la marcha (caminando o corriendo), que entra y sale suave al empezar y al terminar
  const G = st.walk && D.walk ? gaitApply(A, st, D, p) : null;
  // articulaciones manuales (grados, se suman a la postura)
  addJ(st.j || {});
  // de pie: la cadera baja hasta que el pie de apoyo toque el suelo (rodillas dobladas, en cuclillas, de
  // rodillas; al caminar, el vaivén de la cadera sale solo)
  if (D.ground) {
    const legF = l => (Math.cos(l.hp.rotation.x) + Math.cos(l.hp.rotation.x + l.kn.rotation.x)) / 2 * Math.cos(l.hp.rotation.z);
    const still = Math.max(legF(legL), legF(legR));
    if (G) {
      // caminando: apoya solo el pie que está en el suelo (el que pasa por delante no); corriendo, en el vuelo
      // la cadera sigue un arco entre el pie que despega y el que cae
      const on = [G.stR && legF(legR), G.stL && legF(legL)].filter(Boolean);
      const y = on.length ? Math.max(...on) : lerp(G.fly.y0, G.fly.y1, G.fly.u) + G.fly.h * 4 * G.fly.u * (1 - G.fly.u);
      hips.position.y = hy0 * lerp(still, y, G.w);
    } else hips.position.y = hy0 * still;
  } else if (G) hips.position.y = .95 + Math.abs(Math.cos(st.walk)) * .025 * G.w;
  if (A.fig) {
    // la mano: giro sobre el antebrazo y dedos (los de la postura más los movidos a mano)
    const jj = st.j || {}, Df = D.f || [0, 0];
    A.handPose = { w: { r: jj.wR || 0, l: -(jj.wL || 0) }, m: { r: jj.mR || 0, l: jj.mL || 0 }, f: { r: clamp((Df[0] + (jj.fR || 0)) / 100, 0, 1), l: clamp((Df[1] + (jj.fL || 0)) / 100, 0, 1) } };
    // figura articulada: la cara con foto es una tarjeta; si no, la expresión se dibuja sobre la malla
    A.face.visible = !!A.photoFace;
    if (A.meshes.cara) A.meshes.cara.g.visible = !A.photoFace && !A.B.faceless;
    if (A.photoFace && A.face.material !== A.photoFace) A.face.material = A.photoFace;
    fig3dExpr(A, A.photoFace ? 'neutral' : st.expr || 'neutral');
    fig3dApply(A);
    return;
  }
  if (A.photoFace) { if (A.face.material !== A.photoFace) A.face.material = A.photoFace; A.expr = '__foto'; }
  else if (A.expr !== (st.expr || 'neutral')) { A.expr = st.expr || 'neutral'; A.face.material = faceTexture(A.expr); }
}

/* ---------- objetos ----------
   mismo estilo que los maniquíes: formas redondeadas, sombreado toon y contorno fino.
   Las medidas, bisagras y puntos de agarre son los de siempre. */
function makeProp(kind, model) {
  const G = R3.geo, M = R3.mats, T = THREE;
  const g = new T.Group(), inner = new T.Group(); g.add(inner);
  const put = (geo, m, x, y, z, par = inner) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
  // caja redondeada (r por defecto según su lado más fino), cilindro suave y esfera
  const B = (w, h, d, x, y, z, m = M.prop, r, par) => put(rbox(w, h, d, r ?? Math.min(.02, Math.min(w, h, d) * .25)), m, x, y, z, par);
  const C = (r, h, x, y, z, m = M.dark, rotZ, rotX, b, r2) => { const c = put(rcyl(r, h, b ?? Math.min(.012, r * .3), 24, r2 ?? r), m, x, y, z); if (rotZ) c.rotation.z = Math.PI / 2; if (rotX) c.rotation.x = Math.PI / 2; return c; };
  const S = (r, x, y, z, m, sx = 1, sy = 1, sz = 1) => { const o = put(rsph(r), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
  const parts = {};
  let paint = null;
  if (typeof isVehicle === 'function' && isVehicle(kind)) paint = vehBuild(kind, inner);
  else if (typeof isAnimal === 'function' && isAnimal(kind)) paint = aniBuild(kind, inner);
  else if (OBJ_KINDS[kind]) Object.assign(parts, objBuild(kind, inner, put, B, C, S));
  else switch (kind) {
    case 'mesa':
      B(1.4, .05, .8, 0, .74, 0, M.prop, .016); B(1.28, .07, .68, 0, .68, 0, M.prop2, .012);
      for (const [x, z] of [[-.63, -.33], [.63, -.33], [-.63, .33], [.63, .33]]) B(.055, .7, .055, x, .35, z, M.prop2);
      break;
    case 'silla':
      B(.45, .05, .45, 0, .45, 0, M.prop2, .015); B(.42, .035, .4, 0, .49, .015, M.soft, .015);
      B(.45, .3, .045, 0, .76, -.205, M.prop2, .015); for (const x of [-.2, .2]) B(.04, .5, .04, x, .66, -.205, M.prop2);
      for (const [x, z] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) B(.04, .44, .04, x, .22, z, M.prop2);
      break;
    case 'sofa':
      B(1.96, .2, .8, 0, .16, 0, M.prop2, .04);
      for (const x of [-.6, 0, .6]) { B(.58, .15, .62, x, .335, .08, M.prop, .055); const bk = B(.58, .4, .17, x, .58, -.27, M.prop, .07); bk.rotation.x = -.14; }
      B(1.96, .52, .14, 0, .46, -.36, M.prop2, .05);
      for (const s of [-1, 1]) B(.2, .44, .85, s * .9, .3, 0, M.prop2, .08);
      for (const [x, z] of [[-.88, -.33], [.88, -.33], [-.88, .33], [.88, .33]]) C(.025, .06, x, .03, z, M.dark);
      break;
    case 'cama':
      B(1.5, .28, 2, 0, .16, 0, M.prop2, .03); B(1.42, .18, 1.92, 0, .39, .02, M.soft, .07);
      B(1.47, .07, 1.22, 0, .47, .36, M.prop, .035);
      B(1.5, .9, .08, 0, .45, -1, M.prop2, .03);
      for (const x of [-.35, .35]) B(.6, .13, .36, x, .53, -.74, M.body, .06);
      break;
    case 'puerta': {
      for (const s of [-1, 1]) B(.08, 2.15, .14, s * .49, 1.07, 0, M.prop2, .012); B(1.06, .08, .14, 0, 2.15, 0, M.prop2, .012);
      const leaf = new T.Group(); leaf.position.set(-.45, 0, 0); inner.add(leaf);
      B(.9, 2.05, .045, .45, 1.03, 0, M.prop, .008, leaf);
      for (const zz of [-.026, .026]) { B(.64, .82, .01, .45, 1.5, zz, M.prop2, .004, leaf); B(.64, .7, .01, .45, .55, zz, M.prop2, .004, leaf); }
      for (const zz of [-.05, .05]) { const k = put(rsph(.028), M.metal, .8, 1.02, zz, leaf); k.scale.set(1, 1, .8); }
      parts.leaf = leaf; break;
    }
    case 'ventana': {
      B(1.4, .08, .16, 0, .9, 0, M.prop2, .012); B(1.4, .08, .16, 0, 2.14, 0, M.prop2, .012);
      for (const s of [-1, 1]) B(.08, 1.32, .16, s * .66, 1.52, 0, M.prop2, .012);
      B(1.52, .04, .26, 0, .86, .05, M.prop2, .012);
      const sash = (side) => {
        const hg = new T.Group(); hg.position.set(.62 * side, 0, 0); inner.add(hg);
        const sx = -.31 * side;
        B(.045, 1.16, .045, sx * 2 + .02 * side, 1.52, 0, M.prop, .01, hg); B(.045, 1.16, .045, 0, 1.52, 0, M.prop, .01, hg);
        B(.62, .045, .045, sx, .96, 0, M.prop, .01, hg); B(.62, .045, .045, sx, 2.08, 0, M.prop, .01, hg);
        put(rbox(.58, 1.1, .01, .003), R3.mats.glass, sx, 1.52, 0, hg);
        return hg;
      };
      parts.sashL = sash(-1); parts.sashR = sash(1); break;
    }
    case 'pared': B(3, 2.6, .15, 0, 1.3, 0, R3.mats.wall, .02); B(3.004, .1, .17, 0, .05, 0, M.prop2, .01); break;
    case 'moto':
      B(.56, .58, .95, 0, .62, 1, M.prop2, .14); C(.015, .7, 0, 1.08, .82, M.dark, true);
      B(1.25, .42, 1.3, 0, .56, -.35, M.prop, .08); B(1.1, .12, .5, 0, .83, -.5, M.soft, .05); B(1.1, .4, .1, 0, 1.03, -.96, M.soft, .045);
      B(1.3, .06, 1.66, 0, 1.75, -.2, M.prop2, .03);
      for (const x of [-.6, .6]) C(.022, 1.1, x, 1.2, -1, M.dark); C(.022, 1, 0, 1.2, .55, M.dark);
      for (const [x, z] of [[0, 1.3], [-.6, -.8], [.6, -.8]]) { C(.28, .14, x, .28, z, M.tire, true, false, .05); C(.13, .15, x, .28, z, M.metal, true, false, .02); }
      break;
    case 'arbol':
      C(.1, 2.2, 0, 1.1, 0, R3.mats.bark, false, false, .01, .065);
      S(.72, 0, 2.75, 0, M.tree); S(.52, .48, 2.45, .18, M.tree); S(.5, -.46, 2.5, -.16, M.tree); S(.46, .08, 3.28, -.08, M.tree); S(.42, -.1, 2.45, .5, M.tree);
      break;
    case 'caja': B(.5, .5, .5, 0, .25, 0, M.prop2, .02); B(.508, .06, .508, 0, .47, 0, M.prop2, .015); B(.09, .006, .51, 0, .503, 0, M.soft, .002); break;
    case 'detalle': {
      // lámpara de proyector parada sobre la mesita: base metálica, cuello de cerámica y ampolla de vidrio
      // con el filamento; quemada, el vidrio se ennegrece y el filamento queda cortado
      if (model === 'lampara' || model === 'lampara_q') {
        const q = model === 'lampara_q';
        if (!R3.mats.bulb) Object.assign(R3.mats, { bulb: toon('#E4EEF3'), bulbQ: toon('#3B3733'), cer: toon('#EEE9DF'), shine: new THREE.MeshBasicMaterial({ color: '#FFFFFF' }) });
        const R = R3.mats;
        C(.3, .035, 0, .80, 0, M.prop, false, false, .012); C(.035, .76, 0, .4, 0, M.prop2); C(.18, .03, 0, .015, 0, M.prop2, false, false, .01);
        C(.03, .032, 0, .834, 0, M.metal, false, false, .006);                      // base con sus contactos
        for (const x of [-.012, .012]) C(.003, .012, x, .814, 0, M.metal);
        C(.024, .026, 0, .862, 0, R.cer, false, false, .006);                       // cuello de cerámica
        if (!R3.geo.bulb) { const pts = [[0, 0], [.02, 0], [.028, .012], [.031, .04], [.031, .1], [.026, .13], [.014, .148], [.005, .156], [0, .158]].map(([x, y]) => new THREE.Vector2(x, y)); R3.geo.bulb = new THREE.LatheGeometry(pts, 28); }
        // vidrio claro en la nueva, ennegrecido en la quemada
        put(R3.geo.bulb, q ? R.bulbQ : R.bulb, 0, .874, 0);
        // filamento: dos soportes y el espiral. En la nueva se dibuja por encima del vidrio (como si se viera
        // a través); en la quemada queda escondido tras el hollín
        if (!q) {
          if (!R.filTop) R.filTop = new THREE.MeshBasicMaterial({ color: '#6B655E', depthTest: false, transparent: true });
          const f1 = []; for (const x of [-.009, .009]) f1.push(put(rcyl(.0014, .07, .0005, 6), R.filTop, x, .915, 0));
          const co = put(rcyl(.0026, .02, .001, 8), R.filTop, 0, .951, 0); co.rotation.z = Math.PI / 2; f1.push(co);
          for (const o2 of f1) { o2.renderOrder = 3; o2.userData.noOutline = true; }
        }
        const sh = put(rsph(.006, 8), R.shine, -.015, .985, .024); sh.scale.set(.5, 2.6, .4); sh.userData.noOutline = true;   // brillo del vidrio
        if (q) { const sm = put(rsph(.02, 10), toon('#1F1C1A'), 0, 1.0, 0); sm.scale.set(1.2, .9, 1.2); }   // hollín arriba
        break;
      }
      // florero sobre una mesita redonda (lo que se ve en los planos detalle e insertos)
      if (!R3.mats.vase) Object.assign(R3.mats, { vase: toon('#3F6E9E'), vase2: toon('#E9E4D8'), stem: toon('#6F8F4E'), petal1: toon('#D9534F'), petal2: toon('#F2C14E'), petal3: toon('#F4F1EA'), petal4: toon('#C76FA0') });
      const R = R3.mats;
      C(.3, .035, 0, .80, 0, M.prop, false, false, .012); C(.035, .76, 0, .4, 0, M.prop2); C(.18, .03, 0, .015, 0, M.prop2, false, false, .01);
      if (!R3.geo.vase) { const pts = [[0, 0], [.055, 0], [.085, .04], [.095, .11], [.07, .2], [.045, .26], [.05, .3], [.058, .31]].map(([x, y]) => new THREE.Vector2(x, y)); R3.geo.vase = new THREE.LatheGeometry(pts, 28); }
      const v = put(R3.geo.vase, R.vase, 0, .82, 0); v.material = R.vase;
      put(rcyl(.06, .012, .004, 24), R.vase2, 0, .885, 0);
      // flores: corolas de pétalos alargados que miran hacia adelante y un poco hacia arriba; tallos hasta la boca del florero
      const stem = (x, y, z) => { const a = new THREE.Vector3(x * .25, 1.11, z * .25), b2 = new THREE.Vector3(x, y, z), dv = b2.clone().sub(a), L = dv.length(); const o = put(rcyl(.0045, 1, .001, 6), R.stem, (a.x + b2.x) / 2, (a.y + b2.y) / 2, (a.z + b2.z) / 2); o.scale.y = L; o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dv.normalize()); };
      const bloom = (x, y, z, pm, tilt, yaw, n, r) => {
        stem(x, y - .01, z);
        const fg = new THREE.Group(); fg.position.set(x, y, z); fg.rotation.set(-tilt, yaw, 0); inner.add(fg);
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, p = put(rsph(.02, 14), pm, Math.cos(a) * r, Math.sin(a) * r, 0, fg); p.scale.set(1.35, .62, .32); p.rotation.z = a; }
        const c = put(rsph(.014, 12), pm === R.petal2 ? R.petal1 : R.petal2, 0, 0, .006, fg); c.scale.set(1, 1, .6);
      };
      for (const [x, y, z, pm, tilt, yaw, n, r] of [[0, 1.33, .01, R.petal1, .45, 0, 7, .03], [.075, 1.28, .03, R.petal2, .55, -.45, 6, .026], [-.072, 1.29, .02, R.petal3, .5, .45, 8, .028],
        [.028, 1.22, .075, R.petal4, .85, -.12, 6, .024], [-.045, 1.2, .07, R.petal1, .9, .3, 6, .024], [.095, 1.2, -.02, R.petal3, .5, -.95, 7, .025], [-.095, 1.23, -.03, R.petal2, .5, .95, 6, .025]]) bloom(x, y, z, pm, tilt, yaw, n, r);
      for (const [x, z, ry, rz] of [[.05, .03, .5, -.5], [-.05, .02, -.5, .5], [.01, -.05, 2.4, .4], [-.03, .06, -.2, .7]]) { const lf = put(rsph(.03, 10), R.stem, x, 1.15, z); lf.scale.set(.35, 1.7, .12); lf.rotation.set(0, ry, rz); }
      break;
    }
    case 'poste':
      C(.13, .3, 0, .15, 0, M.dark, false, false, .02); C(.08, 4.2, 0, 2.1, 0, M.dark, false, false, .01, .055);
      B(.62, .06, .1, .27, 4.13, 0, M.dark, .025); B(.32, .09, .2, .52, 4.09, 0, M.dark, .035);
      { const gl = put(rbox(.26, .02, .14, .006), R3.mats.shade, .52, 4.04, 0); gl.userData.noOutline = true; }
      break;
    case 'mostrador': B(2.2, .96, .6, 0, .5, .02, M.prop, .025); B(2.12, .08, .5, 0, .04, -.02, M.prop2, .015); B(2.3, .05, .7, 0, 1.02, 0, M.prop2, .016); break;
    case 'lampara':
      C(.16, .04, 0, .02, 0, M.dark, false, false, .015); C(.013, 1.4, 0, .72, 0, M.dark);
      parts.shade = C(.22, .26, 0, 1.45, 0, R3.mats.shade, false, false, .01, .14);
      break;
    case 'guitarra': { // de pie sobre su base, cuerdas hacia +z
      parts.body = put(guitarGeo(), M.wood, 0, 0, 0);
      C(.045, .012, 0, .38, .052, M.dark, false, true, .003);
      B(.11, .022, .012, 0, .2, .056, M.dark, .004);
      B(.05, .5, .03, 0, .82, 0, M.dark, .01); B(.08, .16, .03, 0, 1.13, 0, M.dark, .012);
      break;
    }
    case 'camara_foto': B(.14, .09, .06, 0, .045, 0, M.dark, .014); C(.032, .07, 0, .045, .06, M.dark, false, true, .006); C(.034, .01, 0, .045, .095, M.metal, false, true, .003); B(.04, .02, .03, -.04, .1, 0, M.dark, .006); break;
    case 'camara_video': B(.1, .12, .24, 0, .06, -.02, M.dark, .018); C(.04, .12, 0, .07, .14, M.dark, false, true, .008); B(.05, .04, .1, .06, .1, -.06, M.dark, .012); B(.008, .06, .08, .055, .07, 0, M.metal, .003); break;
    case 'camara_cine': {
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; const l = B(.026, 1.35, .026, Math.sin(a) * .28, .66, Math.cos(a) * .28, M.dark, .008); l.rotation.x = Math.cos(a) * .21; l.rotation.z = -Math.sin(a) * .21; }
      B(.15, .08, .15, 0, 1.33, 0, M.dark, .02); B(.2, .26, .42, 0, 1.5, 0, M.dark, .035); C(.06, .2, 0, 1.52, .3, M.dark, false, true, .01); B(.12, .2, .18, 0, 1.58, -.24, M.dark, .03);
      B(.25, .19, .13, 0, 1.52, .46, M.dark, .02);   // parasol (matte box)
      for (const x of [-.07, .07]) B(.03, .05, .03, x, 1.67, 0, M.dark, .008); B(.17, .025, .03, 0, 1.7, 0, M.dark, .008);
      break;
    }
    case 'celular': B(.075, .15, .009, 0, .075, 0, M.dark, .004); B(.066, .13, .002, 0, .077, .0045, R3.mats.screen, .001); break;
    case 'mochila': B(.3, .4, .18, 0, .2, 0, R3.mats.bag, .06); B(.24, .16, .06, 0, .14, .11, R3.mats.bag, .025); B(.3, .09, .2, 0, .375, .005, R3.mats.bag, .04); break;
    default: B(.5, .5, .5, 0, .25, 0);
  }
  inner.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  propMerge(inner, parts, kind === 'detalle' ? 'detalle:' + (model || 'flores') : kind);
  outlineAll(inner);
  const fp = S3_PROPS[kind] || { w: .5, d: .5 };
  const blob = new T.Mesh(G.blob, M.blob); blob.rotation.x = -Math.PI / 2; blob.position.y = .004; blob.scale.set(Math.max(.2, fp.w * .7), Math.max(.2, fp.d * .7), 1); g.add(blob);
  const sel = new T.Mesh(G.ring, M.sel); sel.rotation.x = -Math.PI / 2; sel.position.y = .006; sel.scale.setScalar(Math.max(.4, Math.max(fp.w, fp.d) * 1.25)); sel.visible = false; g.add(sel);
  return { root: g, inner, kind, sel, blob, parts, paint, model: kind === 'detalle' ? model || 'flores' : undefined };
}
/* cuerpo de guitarra: dos óvalos unidos con cintura, extruido con bordes redondeados */
function guitarGeo() {
  return geoOnce('guitarra', () => {
    const c1 = .22, r1 = .19, c2 = .465, r2 = .145, y0 = c1 - r1, y1 = c2 + r2, N = 28, pts = [];
    const w = y => { const a = Math.sqrt(Math.max(0, r1 * r1 - (y - c1) ** 2)), b = Math.sqrt(Math.max(0, r2 * r2 - (y - c2) ** 2)); return Math.pow(a ** 4 + b ** 4, .25) * (1 - .12 * Math.exp(-(((y - .35) / .05) ** 2))); };
    for (let i = 0; i <= N; i++) { const y = y0 + (y1 - y0) * (1 - Math.cos(Math.PI * i / N)) / 2; pts.push(new THREE.Vector2(w(y), y)); }
    for (let i = N - 1; i > 0; i--) pts.push(new THREE.Vector2(-pts[i].x, pts[i].y));
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: .066, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 3, curveSegments: 4 });
    geo.translate(0, 0, -.033); geo.computeVertexNormals();
    return geo;
  });
}
/* apertura de puertas y ventanas (grados) */
function openProp(E, p) {
  const a = (p.open || 0) * Math.PI / 180;
  if (E.parts.leaf) E.parts.leaf.rotation.y = -a;
  if (E.parts.sashL) { E.parts.sashL.rotation.y = -a; E.parts.sashR.rotation.y = a; }
}
/* cómo se sostiene cada objeto pequeño: desplazamiento y giro respecto a la mano o al pecho */
const GRIP = {
  guitarra: { mano: [0, -.75, .05, 0, 0, 0], pecho: [-.2, -.56, .04, 0, 0, -.85] },
  camara_foto: { mano: [0, -.05, .03, 0, 0, 0], pecho: [0, -.12, .02, 0, 0, 0] },
  camara_video: { mano: [0, -.04, .02, 0, 0, 0], pecho: [0, -.1, .06, 0, 0, 0] },
  celular: { mano: [0, -.08, .04, 0, 0, 0], pecho: [0, -.05, .01, 0, 0, 0] },
  mochila: { mano: [0, -.42, 0, 0, 0, 0], pecho: [0, -.3, -.32, 0, Math.PI, 0] },
};

/* ---------- figuras a partir de fotos ---------- */
const PH_TEX = new Map();
function photoTex(key) {
  const im = cachedImg(key);
  if (!im) return null;
  let t = PH_TEX.get(key);
  if (!t || t.image !== im) { t = new THREE.Texture(im); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; PH_TEX.set(key, t); }
  return t;
}
const PH_FACE = new Map();
function photoFaceMat(elId) {
  const t = photoTex('ph~' + elId + '~face');
  if (!t) return null;
  let m = PH_FACE.get(elId);
  if (!m || m.map !== t) { m = new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false }); PH_FACE.set(elId, m); }
  return m;
}
const photoSlots = elId => ['front', 'right', 'back', 'left'].filter(k => FRAMES['ph~' + elId + '~' + k]);
function makeCutout(look) {
  const T = THREE, G = R3.geo, M = R3.mats;
  const root = new T.Group();
  if (!R3.geo.card) { R3.geo.card = new T.PlaneGeometry(1, 1); R3.geo.card.translate(0, .5, 0); }
  const mat = new T.MeshLambertMaterial({ transparent: true, alphaTest: .45, side: T.DoubleSide });
  const card = new T.Mesh(R3.geo.card, mat);
  card.castShadow = true; card.receiveShadow = false;
  card.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, alphaTest: .45 });
  root.add(card);
  const blob = new T.Mesh(G.blob, M.blob); blob.rotation.x = -Math.PI / 2; blob.position.y = .004; blob.scale.setScalar(.36); root.add(blob);
  const sel = new T.Mesh(G.ring, M.sel); sel.rotation.x = -Math.PI / 2; sel.position.y = .006; sel.visible = false; root.add(sel);
  return { root, card, mat, blob, sel, kind: 'actor', cut: true, key: 'recorte' };
}
/* el recorte mira a la cámara y usa la foto del lado que la cámara ve */
function updateCutout(E, look, p, cam) {
  const el = look.key;
  const angC = Math.atan2(cam.x - p.x, cam.z - p.z) * 180 / Math.PI;
  const rel = ((angC - (p.rot || 0) + 540) % 360) - 180;
  const has = k => !!FRAMES['ph~' + el + '~' + k];
  let slot = 'front', flip = false;
  if (Math.abs(rel) >= 135 && has('back')) slot = 'back';
  else if (rel > 45 && rel < 135) { if (has('left')) slot = 'left'; else if (has('right')) { slot = 'right'; flip = true; } }
  else if (rel < -45 && rel > -135) { if (has('right')) slot = 'right'; else if (has('left')) { slot = 'left'; flip = true; } }
  const t = photoTex('ph~' + el + '~' + slot) || photoTex('ph~' + el + '~front');
  if (t && E.mat.map !== t) { E.mat.map = t; E.card.customDepthMaterial.map = t; E.mat.needsUpdate = true; E.card.customDepthMaterial.needsUpdate = true; }
  const h = look.height * (p.pose === 'suelo' ? .32 : poseDef(p.pose).h);
  const ar = t && t.image ? t.image.naturalWidth / t.image.naturalHeight : .4;
  E.card.scale.set(h * ar * (flip ? -1 : 1), h, 1);
  E.card.rotation.y = (angC - (p.rot || 0)) * Math.PI / 180;
  E.card.visible = !!t;
}
