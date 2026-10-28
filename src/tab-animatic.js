/* ============================================================
   Pestaña ANIMATIC · montaje de los planos con su ritmo
   Herramientas de edición, como en un editor de video:
   · Dividir en el cabezal (S): el plano se parte en dos planos del storyboard.
   · Recortar: borde izquierdo o Q quitan el comienzo; W quita el final desde el cabezal;
     el borde derecho cambia la duración (acortar corta el final del plano; alargar deja quieta su última pose).
   · Quitar (Supr) cierra el hueco; Mayús + Supr deja un negro del mismo largo.
   · Duplicar (Ctrl + D), títulos y negros, imán (N), deshacer y rehacer, J K L.
   · Mantener presionado un clip lo levanta y los demás le hacen espacio; arrastrar
     enseguida dibuja un recuadro que elige varios clips para moverlos juntos.
   ============================================================ */
/* alto de la pista de vídeo: el resto de pistas crece en proporción (ritmo ×0,45, música ×0,7) */
const TH_MIN = 46, TH_MAX = 240, TH_DEF = 66, TH_K = 2.15;
const anMini = () => AN.mini ?? (AN.mini = !!ls.get('anMini', false));
const anTh = () => AN.th || (AN.th = clamp(ls.get('anTh', TH_DEF), TH_MIN, TH_MAX));
const PPS_MIN = 3, PPS_MAX = 400;
const ppsToV = p => Math.round(100 * Math.log(p / PPS_MIN) / Math.log(PPS_MAX / PPS_MIN));
const vToPps = v => PPS_MIN * Math.pow(PPS_MAX / PPS_MIN, v / 100);
const AN = { T: 0, playing: false, rate: 1, sel: null, selSet: new Set(), pps: 0, loop: false, audio: null, audioUrl: null, ac: null, src: null, peaks: null, raf: 0, W: 0, H: 0, tmp: null, rec: null };
const SC_COLORS_C = ['#5B7BD6', '#D08A3C', '#4E9B78', '#B05E8E', '#7E8B3A', '#3E97A8', '#C2564A', '#7A68C2'];
const scCol = i => SC_COLORS_C[i % 8];
function anCfg() {
  if (!P.animatic) P.animatic = { fps: 24, order: [], off: [], trans: {}, audio: null, subs: true, burn: true };
  const c = P.animatic;
  if (!c.order) c.order = [];
  if (!c.trans) c.trans = {};
  if (!c.cards) c.cards = {};
  return c;
}
const fpsOf = () => anCfg().fps || 24;
const snapF = d => Math.max(1 / fpsOf(), Math.round(d * fpsOf()) / fpsOf());
const anSnapOn = () => ls.get('anSnap', true);
function tc(t, withF = true) {
  const f = fpsOf(), tf = Math.round(t * f);
  const fr = tf % f, s = Math.floor(tf / f) % 60, m = Math.floor(tf / f / 60) % 60, h = Math.floor(tf / f / 3600);
  const p = n => String(n).padStart(2, '0');
  return (h ? p(h) + ':' : '') + p(m) + ':' + p(s) + (withF ? ':' + p(fr) : '');
}
/* dónde va un inserto (V2): sobre qué plano y desde qué segundo de él. sh.ov lo fija quien lo mueve en el
   montaje; si no, es el plano del que copió la acción («Copiar anterior»). sh.v1 lo deja en V1. */
const linkOf = sh => (sh && !sh.v1 && (sh.ov || (sh.s3 && sh.s3.from))) || null;
const anAll = L => L ? L.clips.concat(L.over || []) : [];
const ovOf = (L, id) => L && (L.over || []).find(o => o.id === id);
/* deja un inserto sobre otro plano, a off segundos de su comienzo. d: cuánto se corrió en el montaje (la
   acción copiada se corre con él para seguir sincronizada con el plano de abajo) */
function ovPlace(sh, baseId, off, d = 0) {
  delete sh.v1;
  const f = sh.s3 && sh.s3.from;
  if (f && Math.abs(d) > 1e-4) { s3ShiftAction(sh.s3, -d); f.off = round2((f.off || 0) + d); }
  if (f && f.id === baseId && Math.abs((f.off || 0) - off) < .011) delete sh.ov; else sh.ov = { id: baseId, off: round2(off) };
}
/* el montaje: planos del storyboard en su orden, más títulos y negros (cfg.cards) */
function anClips() {
  const cfg = anCfg(), cards = cfg.cards;
  const all = D.sc.scenes.flatMap(s => D.shotsBy[s.key] || []);
  const byId = new Map(all.map(s => [s.id, s]));
  const order = cfg.order.filter(id => byId.has(id) || cards[id]);
  const seen = new Set(order);
  all.forEach((sh, i) => {
    if (seen.has(sh.id)) return;
    let at = order.length;
    for (let j = i - 1; j >= 0; j--) { const k = order.indexOf(all[j].id); if (k >= 0) { at = k + 1; break; } }
    order.splice(at, 0, sh.id); seen.add(sh.id);
  });
  const off = new Set(cfg.off || []);
  // escenas bloqueadas: se ocultan del montaje; no se editan, no se reproducen ni se exportan.
  // «full» guarda dónde estaría cada clip en el montaje completo (para que la música siga en su lugar)
  const locked = new Set((cfg.locked || []).filter(k => D.sc.byKey[k] && (D.shotsBy[k] || []).length));
  // un título o un negro va con la escena del plano que le sigue (o del anterior, al final)
  const scOf = new Array(order.length);
  let nx = null;
  for (let i = order.length - 1; i >= 0; i--) { const sh = byId.get(order[i]); if (sh) nx = sh.sc; scOf[i] = nx; }
  let pv = null;
  for (let i = 0; i < order.length; i++) { const sh = byId.get(order[i]); if (sh) pv = sh.sc; if (scOf[i] == null) scOf[i] = pv; }
  // insertos: un plano que copió la acción de otro y empieza dentro de su duración va encima (V2), sin cortarlo
  const insOf = sh => {
    const f = linkOf(sh), b = f && byId.get(f.id); if (!b || b === sh) return null;
    const fb = linkOf(b); if (fb && fb.id === sh.id) return null;   // dos planos que se apuntan entre sí van en V1
    return (f.off || 0) >= 0 && (f.off || 0) < shotDur(b) - .05 ? b : null;
  };
  const ins = new Map();
  for (const sh of all) { const b = insOf(sh); if (b && !insOf(b)) ins.set(sh.id, b); }
  let t = 0, tf = 0;
  const clips = [];
  order.forEach((id, k) => {
    if (off.has(id) || ins.has(id)) return;
    const sh = byId.get(id) || null, card = sh ? null : cards[id];
    const d = snapF(sh ? shotDur(sh) : Math.max(.04, num(card.dur) || 2));
    const sc = sh ? sh.sc : scOf[k];
    if (!(sc && locked.has(sc))) { clips.push({ id, sh, card, sc, i: clips.length, start: t, dur: d, end: t + d, full: tf, scene: sc ? sceneOfKey(sc) : null, tr: cfg.trans[id] || { type: 'cut', f: 12 } }); t += d; }
    tf += d;
  });
  const over = [];
  for (const [id, b] of ins) {
    const c = clips.find(c => c.id === b.id), sh = byId.get(id); if (!c || off.has(id)) continue;
    const lk = linkOf(sh), st = c.start + (lk.off || 0), d = snapF(shotDur(sh));
    over.push({ id, sh, card: null, sc: sh.sc, start: st, dur: d, end: st + d, base: c, link: lk, scene: sceneOfKey(sh.sc), tr: { type: 'cut', f: 12 }, ov: true });
  }
  over.sort((a, b) => a.start - b.start);
  over.forEach((o, i) => { o.i = i; });
  return { clips, over, total: t, fullTotal: tf, order, locked, excluded: order.filter(id => off.has(id) && byId.has(id) && !locked.has(byId.get(id).sc)).map(id => byId.get(id)) };
}
const clipCode = c => c.sh ? D.code[c.sh.id] : c.card.kind === 'black' ? 'Negro' : 'Título';
/* tiempo del montaje visible → tiempo en el montaje completo */
function fullT(L, T) { const c = clipAt(L, T); return c ? c.full + clamp(T - c.start, 0, c.dur) : T; }
/* escenas del montaje, en orden, con su estado */
function anScenesHTML(L) {
  const keys = [];
  for (const id of L.order) { const sh = P.shots[id]; if (sh && !keys.includes(sh.sc) && D.sc.byKey[sh.sc]) keys.push(sh.sc); }
  if (keys.length < 2 && !L.locked.size) return '';
  const ed = !UI.readOnly;
  return `<div class="an-scenes"><span class="lab">Escenas</span>
    ${keys.map(k => { const lk = L.locked.has(k); const sc = sceneOfKey(k); return `<button class="anchip${ea(lk ? ' lk' : '')}" data-act="an-lock" data-k="${esc(k)}" aria-pressed="${ea(!lk)}" title="Escena ${esc(k)} · ${esc(sc.heading)}${ea(lk ? ' · bloqueada: oculta del montaje' : ' · tocar para bloquear y ocultar')}" style="--sc:${ea(scCol(sc.idx))}" ${ed ? '' : 'disabled'}>${lk ? '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' : ''}${esc(k)}</button>`; }).join('')}
    <select data-bind="an-solo" aria-label="Aislar una escena" ${ed ? '' : 'disabled'}><option value="">Aislar una escena…</option>${keys.map(k => `<option value="${esc(k)}">Solo la escena ${esc(k)}</option>`).join('')}</select>
    ${L.locked.size ? `<span class="lkinfo">${L.locked.size} ${L.locked.size === 1 ? 'escena bloqueada' : 'escenas bloqueadas'}: no se reproducen ni se exportan</span><button class="btn ghost sm" data-act="an-unlock">Mostrar todas</button>` : ''}</div>`;
}
function clipAt(L, T) { for (const c of L.clips) if (T < c.end - 1e-6) return c; return L.clips[L.clips.length - 1] || null; }
/* diálogo del plano repartido en su duración; sh.dlg = tramo del diálogo que queda tras dividir o recortar */
function subsOf(sh, dur) {
  if (!sh || sh.p0 == null) return [];
  const out = []; let who = '';
  for (let i = sh.p0; i <= sh.p1; i++) {
    const p = P.paras[i]; if (!p) continue;
    if (p.t === 'c') who = normCue(p.x);
    if (p.t === 'd' && p.x.trim()) out.push({ who, text: p.x.trim(), w: Math.max(2, p.x.trim().split(/\s+/).length) });
  }
  const W = out.reduce((a, b) => a + b.w, 0);
  const [fa, fb] = sh.dlg || [0, 1];
  const F = dur / Math.max(.001, fb - fa), o = fa * F;
  let t = 0;
  for (const s of out) { s.a = t - o; t += F * s.w / W; s.b = t - o; }
  return out.filter(s => s.b > .05 && s.a < dur - .05).map(s => ({ ...s, a: Math.max(0, s.a), b: Math.min(dur, s.b) }));
}

/* ---------- títulos y negros ---------- */
function canvasLines(ctx, text, maxW) {
  const out = [];
  for (const par of String(text || '').split('\n')) {
    let cur = '';
    for (const w of par.split(/\s+/).filter(Boolean)) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
    out.push(cur);
  }
  return out;
}
function drawCard(ctx, k, W, H) {
  const light = k.bg === 'white';
  ctx.fillStyle = light ? '#F4F4F2' : '#000'; ctx.fillRect(0, 0, W, H);
  if (k.kind === 'black' || !(k.text || k.sub)) return;
  const fs = Math.round(H / 11), sfs = Math.round(fs * .46);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = light ? '#15171A' : '#FFFFFF';
  ctx.font = `700 ${fs}px Archivo, Arial, sans-serif`;
  const L1 = k.text ? canvasLines(ctx, k.text, W * .82) : [];
  ctx.font = `500 ${sfs}px Archivo, Arial, sans-serif`;
  const L2 = k.sub ? canvasLines(ctx, k.sub, W * .82) : [];
  const h1 = L1.length * fs * 1.12, h2 = L2.length ? fs * .55 + L2.length * sfs * 1.3 : 0;
  let y = H / 2 - (h1 + h2) / 2 + fs * .56;
  ctx.font = `700 ${fs}px Archivo, Arial, sans-serif`;
  for (const l of L1) { ctx.fillText(l, W / 2, y); y += fs * 1.12; }
  if (L2.length) {
    y += fs * .55 - fs * .56 + sfs * .65 - (L1.length ? 0 : fs * .55);
    ctx.font = `500 ${sfs}px Archivo, Arial, sans-serif`; ctx.globalAlpha = .78;
    for (const l of L2) { ctx.fillText(l, W / 2, y); y += sfs * 1.3; }
    ctx.globalAlpha = 1;
  }
}
/* ---------- planos quietos ----------
   Un plano sin movimiento (una sola posición de cámara y figuras, sin cámara en mano, lluvia ni olas) se ve igual
   en todos sus cuadros: la escena 3D se dibuja una vez y después se repite la imagen. Antes, cada cuadro de la
   reproducción y del video volvía a dibujar la escena completa (y en un encadenado, dos). Se guardan los últimos
   del tamaño del visor; el que sigue se prepara mientras se ve uno quieto. */
const AN_FC = new Map();     // id del plano → { k, cv }
const AN_TDEP = new Set();   // claves de planos que parecían quietos pero cambian con el tiempo (lluvia, olas)
function anStatic(sh) {
  if (!shot3D(sh) || (frameHas(sh.id) && !sh.refBack && !(d2On(sh) && d2Imp(sh.d2, 'ref')))) return false;   // dibujo 2D y foto: ya son baratos
  if (d2On(sh) && sh.d2.frames.length > 1) return false;   // el dibujo 2D encima cambia de cuadro
  const s3 = s3Of(sh);
  if (s3.shake) return false;
  const ks = s3.keys || [];
  if (ks.length > 1) { const f = k => JSON.stringify([k.cam || 0, k.o || 0]), a = f(ks[0]); for (const k of ks) if (f(k) !== a) return false; }
  return true;
}
const anFrameKey = (sh, W, H) => thumbKeys(sh, 0, TH_BASE).fk + '|' + W + 'x' + H;
function anFrameRender(sh, lt, W, H, k = anFrameKey(sh, W, H)) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  if (typeof ENVB !== 'undefined') ENVB.tdep = false;
  drawShotFrame(cv.getContext('2d'), sh, lt, W, H);
  if (typeof ENVB !== 'undefined' && ENVB.tdep) AN_TDEP.add(k);
  else { AN_FC.delete(sh.id); AN_FC.set(sh.id, { k, cv }); while (AN_FC.size > 6) AN_FC.delete(AN_FC.keys().next().value); }
  return cv;
}
/* el cuadro guardado del plano, si es quieto y está al día (si no, null) */
function anFrameCached(sh, W, H, k = anFrameKey(sh, W, H)) {
  const e = AN_FC.get(sh.id);
  if (!e || e.k !== k) return null;
  AN_FC.delete(sh.id); AN_FC.set(sh.id, e);   // usado hace poco: se queda
  return e.cv;
}
function drawClip(ctx, c, lt, W, H) {
  if (c.card) return drawCard(ctx, c.card, W, H);
  const sh = c.sh;
  if (!anStatic(sh)) return drawShotFrame(ctx, sh, lt, W, H);
  const k = anFrameKey(sh, W, H);
  if (AN_TDEP.has(k)) return drawShotFrame(ctx, sh, lt, W, H);
  ctx.drawImage(anFrameCached(sh, W, H, k) || anFrameRender(sh, lt, W, H, k), 0, 0, W, H);
}
/* mientras se ve un plano quieto (o un título) y falta poco para el corte, se prepara el que sigue: dibujarlo
   no se nota (la imagen en pantalla no cambia) y así el corte no se traba */
function anPrefetch(L, c, T, W, H) {
  const nx = L.clips[c.i + 1];
  if (!nx || !nx.sh || c.end - T > 1.2 || AN.pfx === nx.id + W) return;
  if (c.sh && (!anStatic(c.sh) || AN_TDEP.has(anFrameKey(c.sh, W, H)))) return;
  if (!anStatic(nx.sh)) return;
  const k = anFrameKey(nx.sh, W, H);
  if (AN_TDEP.has(k) || anFrameCached(nx.sh, W, H, k)) return;
  AN.pfx = nx.id + W;
  setTimeout(() => { if (!anFrameCached(nx.sh, W, H, k)) anFrameRender(nx.sh, 0, W, H, k); }, 0);
}
/* miniatura de un clip (PDF): la del plano o el título dibujado */
function clipThumb(c, base = 240) {
  if (c.sh) return (typeof thumbSmallCached === 'function' && thumbSmallCached(c.sh, base)) || shotThumb(c.sh, 0, base);
  const [W, H] = frameDims(base), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  drawCard(cv.getContext('2d'), c.card, W, H);
  return cv.toDataURL('image/jpeg', .84);
}

/* ---------- dibujo de un instante del montaje ---------- */
function anDraw(ctx, W, H, T, L, opts = {}) {
  const c = clipAt(L, T);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (!c) return null;
  // las imágenes del clip y de los que siguen se piden antes de que lleguen
  if (FRIDX && AN.pf !== c.i + ':' + (L.over || []).length) { AN.pf = c.i + ':' + (L.over || []).length; const ks = []; for (let i = c.i; i < Math.min(L.clips.length, c.i + 6); i++) if (L.clips[i].sh) ks.push(...shotViewKeys(L.clips[i].sh)); for (const o of L.over || []) if (o.sh && o.end > T && o.start < T + 20) ks.push(...shotViewKeys(o.sh)); framesNeed(ks); }
  const lt = clamp(T - c.start, 0, c.dur);
  const tr = c.tr, td = (tr.f || 12) / fpsOf();
  const prev = L.clips[c.i - 1];
  drawClip(ctx, c, lt, W, H);
  if (opts.ahead) anPrefetch(L, c, T, W, H);
  const ov = (L.over || []).find(o => T >= o.start && T < o.end);
  if (ov) drawClip(ctx, ov, T - ov.start, W, H);
  else if (tr.type === 'dis' && prev && lt < td) {
    if (!AN.tmp || AN.tmp.width !== W || AN.tmp.height !== H) { AN.tmp = document.createElement('canvas'); AN.tmp.width = W; AN.tmp.height = H; }
    const g = AN.tmp.getContext('2d');
    g.drawImage(ctx.canvas, 0, 0);
    drawClip(ctx, prev, prev.dur, W, H);
    ctx.globalAlpha = lt / td; ctx.drawImage(AN.tmp, 0, 0); ctx.globalAlpha = 1;
  } else if (tr.type === 'fade' && lt < td) { ctx.fillStyle = `rgba(0,0,0,${1 - lt / td})`; ctx.fillRect(0, 0, W, H); }
  const fs = Math.round(H / 26);
  if (opts.subs && c.sh) {
    const s = subsOf(c.sh, c.dur).find(s => lt >= s.a && lt < s.b);
    if (s) {
      ctx.font = `600 ${fs}px Archivo, Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const words = (s.who ? s.who + ': ' : '') + s.text;
      const lines = []; let cur = '';
      for (const w of words.split(' ')) { const tryL = cur ? cur + ' ' + w : w; if (ctx.measureText(tryL).width > W * .8 && cur) { lines.push(cur); cur = w; } else cur = tryL; }
      if (cur) lines.push(cur);
      const show = lines.slice(-3), lh = fs * 1.3, y0 = H - H * .06 - (show.length - 1) * lh;
      show.forEach((l, i) => {
        const tw = ctx.measureText(l).width;
        ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(W / 2 - tw / 2 - fs * .4, y0 + i * lh - fs * 1.02, tw + fs * .8, fs * 1.32);
        ctx.fillStyle = '#fff'; ctx.fillText(l, W / 2, y0 + i * lh);
      });
    }
  }
  if (opts.burn) {
    const sm = Math.round(H / 34);
    ctx.font = `700 ${sm}px Archivo, Arial, sans-serif`; ctx.textBaseline = 'top';
    const box = (txt, x, y, al) => { const tw = ctx.measureText(txt).width; ctx.fillStyle = 'rgba(0,0,0,.55)'; const bx = al === 'right' ? x - tw - sm * .8 : x; ctx.fillRect(bx, y, tw + sm * .8, sm * 1.45); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(txt, bx + sm * .4, y + sm * .25); };
    const cv = ov || c;
    if (cv.sh) {
      box(`${D.code[cv.sh.id]} · ESC ${cv.scene ? cv.scene.key : ''}${ov ? ' · INSERTO' : ''}`, sm * .6, sm * .6);
      box([cv.sh.size, cv.sh.move && cv.sh.move !== 'Fijo' ? cv.sh.move : ''].filter(Boolean).join(' · '), W - sm * .6, sm * .6, 'right');
    }
    box(tc(T), W - sm * .6, H - sm * 2.1, 'right');
  }
  return c;
}

/* ---------- dividir y recortar un plano ----------
   La acción del plano entre «a» y «b» (segundos del plano) pasa a ocupar 0 … b − a:
   claves de la escena 3D, cuadros del dibujo 2D y el tramo de diálogo que le toca. */
const round4 = x => Math.round(x * 1e4) / 1e4;
function shotWindow(sh, a, b, old = shotDur(sh)) {
  const s3 = sh.s3;
  if (s3 && s3.keys && s3.keys.length > 1) {
    const first = s3.keys[0].t, last = s3.keys[s3.keys.length - 1].t;
    if (b > first + .02 && b < last - .02) s3KeyAt(s3, b);
    if (a > first + .02 && a < last - .02) s3KeyAt(s3, a);
    let ks = s3.keys.filter(k => k.t >= a - .02 && k.t <= b + .02);
    if (!ks.length) ks = [JSON.parse(JSON.stringify(a >= last ? s3.keys[s3.keys.length - 1] : s3.keys[0]))];
    s3.keys = ks.map(k => ({ ...k, t: round2(Math.max(0, k.t - a)) }));
  }
  if (sh.d2 && a) sh.d2.t0 = round2((sh.d2.t0 || 0) + a);
  const [fa, fb] = sh.dlg || [0, 1], k = (fb - fa) / Math.max(.001, old);
  const na = round4(fa + a * k), nb = round4(fa + b * k);
  if (Math.abs(na) < 1e-3 && Math.abs(nb - 1) < 1e-3) delete sh.dlg; else sh.dlg = [na, nb];
  sh.dur = snapF(b - a).toFixed(3);
}
// cambiar la duración de un plano no mueve sus claves: cada una se queda en su segundo (acortar corta el final,
// alargar deja quieta la última pose), como en el editor del plano. Antes se estiraban al nuevo largo.
function restoreShot(sh, js) { const o = JSON.parse(js); for (const k of Object.keys(sh)) delete sh[k]; Object.assign(sh, o); }
/* copia de un plano, justo después del original en su escena (con sus dibujos) */
function copyShotAfter(sh) {
  const list = D.shotsBy[sh.sc] || [], next = list[list.indexOf(sh) + 1];
  const copy = { ...clone(sh), id: uid('s'), ord: next ? (sh.ord + next.ord) / 2 : sh.ord + 1, done: false };
  P.shots[copy.id] = copy;
  copyShotFrames(sh.id, copy.id);
  return copy;
}

/* ---------- deshacer y rehacer ----------
   Cada paso guarda el montaje y los planos que tocó (antes y después); los planos creados
   al dividir o duplicar se borran al deshacer y se vuelven a crear al rehacer. */
const ANH = { undo: [], redo: [], pid: null };
function anHist() { const id = P && P.id; if (ANH.pid !== id) { ANH.undo = []; ANH.redo = []; ANH.pid = id; } return ANH; }
const anShotSnap = ids => Object.fromEntries(ids.map(id => [id, P.shots[id] ? JSON.stringify(P.shots[id]) : null]));
function anBegin(ids = []) { anHist(); return { an: JSON.stringify(anCfg()), sh: anShotSnap(ids.filter(Boolean)), T: AN.T, sel: [...AN.selSet] }; }
function anCommit(before, label, made = []) {
  const H = anHist();
  for (const [nid] of made) before.sh[nid] = null;
  const ids = Object.keys(before.sh);
  const after = { an: JSON.stringify(anCfg()), sh: anShotSnap(ids), T: AN.T, sel: [...AN.selSet] };
  if (after.an === before.an && ids.every(id => after.sh[id] === before.sh[id])) return false;
  H.undo.push({ label, before, after, made });
  if (H.undo.length > 80) H.undo.shift();
  H.redo = [];
  return true;
}
/* una edición completa: fn() hace el cambio (devuelve los planos creados [[nuevo, original]] o null si no cambió nada) */
function anEdit(label, ids, fn) {
  if (UI.readOnly) return false;
  const b = anBegin(ids);
  const made = fn();
  if (made === null) return false;
  anCommit(b, label, made || []);
  changed('data'); derive(); render();
  return true;
}
function anRestore(s, made, redo) {
  const io = anCfg().io;   // las marcas de entrada y salida no se deshacen
  P.animatic = JSON.parse(s.an);
  if (io) P.animatic.io = io; else delete P.animatic.io;
  for (const [id, js] of Object.entries(s.sh)) {
    if (js == null) { if (P.shots[id]) { delete P.shots[id]; delShotFrames(id); } }
    else P.shots[id] = JSON.parse(js);
  }
  if (redo) for (const [nid, from] of made) copyShotFrames(from, nid);
  AN.selSet = new Set(s.sel); AN.sel = s.sel[s.sel.length - 1] || null; AN.T = s.T;
  changed('data'); derive(); render();
}
function anUndo() {
  if (UI.readOnly) return;
  const H = anHist(), x = H.undo.pop();
  if (!x) { toast('No hay nada que deshacer en el montaje.'); return; }
  anRestore(x.before, x.made, false); H.redo.push(x);
  toast('Deshecho: ' + x.label);
}
function anRedo() {
  if (UI.readOnly) return;
  const H = anHist(), x = H.redo.pop();
  if (!x) { toast('No hay nada que rehacer.'); return; }
  anRestore(x.after, x.made, true); H.undo.push(x);
  toast('Rehecho: ' + x.label);
}

/* ---------- herramientas ---------- */
const AN_IC = {
  fold: '<path d="M2.5 3.5h11M2.5 12.5h11"/><path d="M5.5 6.5 8 9l2.5-2.5"/>',
  unfold: '<path d="M2.5 3.5h11M2.5 12.5h11"/><path d="M5.5 9 8 6.5 10.5 9"/>',
  split: '<circle cx="4.5" cy="12" r="2"/><circle cx="11.5" cy="12" r="2"/><path d="M5.8 10.4 12 2M10.2 10.4 4 2"/>',
  tin: '<path d="M3 3h3v10H3"/><path d="M14 8H8.5M10.5 5.8 8.3 8l2.2 2.2"/>',
  tout: '<path d="M13 3h-3v10h3"/><path d="M2 8h5.5M5.5 5.8 7.7 8l-2.2 2.2"/>',
  del: '<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.8 9.5h6.4L12 4"/>',
  gap: '<rect x="1.5" y="4" width="4" height="8" rx="1"/><rect x="10.5" y="4" width="4" height="8" rx="1"/><path d="M7 6.5v3M9 6.5v3"/>',
  dup: '<rect x="2" y="5.5" width="8" height="8" rx="1.2"/><path d="M6 5.5V3h8v8h-4"/>',
  title: '<rect x="1.5" y="3" width="13" height="10" rx="1.5"/><path d="M5 6h6M8 6v4.5"/>',
  black: '<rect x="1.5" y="3" width="13" height="10" rx="1.5" fill="currentColor"/>',
  undo: '<path d="M5.5 3 2.5 6l3 3"/><path d="M2.5 6H10a3.5 3.5 0 0 1 0 7H6.5"/>',
  redo: '<path d="m10.5 3 3 3-3 3"/><path d="M13.5 6H6a3.5 3.5 0 0 0 0 7h3.5"/>',
  snap: '<path d="M3.5 2.5v5.5a4.5 4.5 0 0 0 9 0V2.5h-3V8a1.5 1.5 0 0 1-3 0V2.5z"/><path d="M3.5 5h3M9.5 5h3"/>',
  info: '<circle cx="8" cy="8" r="6.3"/><path d="M8 7.2v4.3M8 4.6v.3"/>',
  more: '<circle cx="3.5" cy="8" r=".9" fill="currentColor"/><circle cx="8" cy="8" r=".9" fill="currentColor"/><circle cx="12.5" cy="8" r=".9" fill="currentColor"/>',
  trkr: '<path d="M3 13.5V8.5M6.3 13.5V4M9.7 13.5V9.5M13 13.5V6"/>',
  trkv2: '<rect x="1.8" y="8.5" width="12.4" height="5" rx="1"/><rect x="4.5" y="2.5" width="9.7" height="4.2" rx="1"/>',
  trkt: '<path d="M2.5 3h11v7.5H7.2L4.2 13v-2.5H2.5z"/><path d="M5 5.9h6M5 7.9h3.8"/>',
  music: '<path d="M6.2 12.2V3.6l7-1.6v8.6"/><circle cx="4.4" cy="12.2" r="1.8"/><circle cx="11.4" cy="10.6" r="1.8"/>',
  ioin: '<path d="M10.5 2.5C8.5 2.5 8 3.2 8 4.6v1.8C8 7.5 7.4 8 5.5 8c1.9 0 2.5.5 2.5 1.6v1.8c0 1.4.5 2.1 2.5 2.1"/>',
  ioout: '<path d="M5.5 2.5c2 0 2.5.7 2.5 2.1v1.8C8 7.5 8.6 8 10.5 8 8.6 8 8 8.5 8 9.6v1.8c0 1.4-.5 2.1-2.5 2.1"/>',
  loop: '<path d="M11.5 1.8 13.7 4l-2.2 2.2"/><path d="M2.5 7.5V6.6A2.6 2.6 0 0 1 5.1 4h8.4"/><path d="M4.5 14.2 2.3 12l2.2-2.2"/><path d="M13.5 8.5v.9A2.6 2.6 0 0 1 10.9 12H2.5"/>',
};
const anIcon = k => `<svg viewBox="0 0 16 16" aria-hidden="true">${AN_IC[k]}</svg>`;
function anToolsHTML() {
  if (UI.readOnly) return '';
  const H = anHist(), n = AN.selSet.size;
  // con nombre a la vista las que no se adivinan por el ícono (en pantallas anchas); las demás, con su descripción al pasar
  const b = (act, ic, label, keyH, dis, extra = '', lab = '') => `<button class="tb${lab ? ' tb-w' : ''}" data-act="${ea(act)}" ${extra} title="${esc(label)}${ea(keyH ? ' (' + keyH + ')' : '')}" aria-label="${esc(label)}" ${dis ? 'disabled' : ''}>${anIcon(ic)}${lab ? `<span class="tb-l">${esc(lab)}</span>` : ''}</button>`;
  // en grupos: cortar · deshacer y rehacer · imán · recortar · quitar y duplicar · título y negro · pistas · detalles
  const sep = '<i class="sep"></i>';
  return `${b('an-split', 'split', AN.blade ? 'Cuchilla activa: toca un clip donde quieras cortarlo · otra vez para salir' : n ? 'Dividir en el cabezal' : 'Cuchilla: toca un clip donde quieras cortarlo', AN.blade ? 'C o Esc' : n ? 'S' : 'C', false, `aria-pressed="${ea(!!AN.blade)}"`, 'Cortar')}${sep}
    ${b('an-undo', 'undo', 'Deshacer' + (H.undo.length ? ': ' + H.undo[H.undo.length - 1].label : ''), 'Ctrl + Z', !H.undo.length)}${b('an-redo', 'redo', 'Rehacer' + (H.redo.length ? ': ' + H.redo[H.redo.length - 1].label : ''), 'Ctrl + Mayús + Z', !H.redo.length)}${sep}
    ${b('an-snap', 'snap', 'Imán: los bordes y el cabezal se pegan a los cortes', 'N', false, `aria-pressed="${ea(anSnapOn())}"`, 'Imán')}${sep}
    ${b('an-trim', 'tin', 'Quitar el comienzo hasta el cabezal', 'Q', false, 'data-s="q"')}${b('an-trim', 'tout', 'Quitar el final desde el cabezal', 'W', false, 'data-s="w"')}${sep}
    ${b('an-io', 'ioin', 'Marcar la entrada en el cabezal', 'I', false, 'data-s="a"')}${b('an-io', 'ioout', 'Marcar la salida en el cabezal', 'O', false, 'data-s="b"')}${sep}
    ${b('an-del', 'del', 'Quitar y cerrar el hueco', 'Supr', !n)}${b('an-del', 'gap', 'Quitar y dejar un negro', 'Mayús + Supr', !n, 'data-gap="1"')}${b('an-dup', 'dup', 'Duplicar', 'Ctrl + D', !n)}${sep}
    ${b('an-card', 'title', 'Insertar un título en el cabezal', 'T', false, 'data-k="title"', 'Título')}${b('an-card', 'black', 'Insertar un negro en el cabezal', 'B', false, 'data-k="black"', 'Negro')}${sep}
    ${anTrkButtons(b)}
    <i class="sep an-ib"></i>${b('an-info', 'info', 'Detalles del clip elegido', '', !AN_L || anNoClip(AN_L), `aria-pressed="${ea(!!AN.info)}" data-ib="1"`)}`;
}
/* las pistas (ritmo, insertos, diálogo y música), juntas en un menú «Pistas» con lo que se ve marcado */
function anTrkButtons(b) {
  const L = AN_L || anClips(), S = anShown(L), au = !!anCfg().audio, on = Object.values(S).filter(Boolean).length;
  return `<button class="tb tb-w" data-act="an-trks" aria-haspopup="menu" title="Ver u ocultar las pistas: ritmo, insertos, diálogo y música" aria-label="Pistas (${on} a la vista)">${anIcon('trkr')}<span class="tb-l">Pistas</span>${ICO.chev}</button>`;
}
function anTrkMenu(btn) {
  const L = AN_L || anClips(), S = anShown(L), au = !!anCfg().audio;
  const it = [['r', 'trkr', 'Ritmo', 'Alto = duración de cada plano'], ['v2', 'trkv2', 'Insertos (V2)', 'Planos encima de otro, sin cortarlo'], ['t', 'trkt', 'Diálogo', 'Los del guion bajo cada plano']];
  popover(btn, `<div class="menu an-trkm" role="menu" aria-label="Pistas">${it.map(([k, ic, n, h]) => `<button type="button" role="menuitemcheckbox" aria-checked="${ea(!!S[k])}" data-trk="${ea(k)}">${anIcon(ic)}<span><b>${esc(n)}</b><small>${esc(h)}</small></span>${S[k] ? ICO.ok : ''}</button>`).join('')}
    <button type="button" role="menuitem" data-mus="1">${anIcon('music')}<span><b>${au ? 'Música' : 'Añadir música'}</b><small>${au ? 'Cambiarla o quitarla' : 'Una pista para medir el ritmo'}</small></span>${au ? ICO.ok : ''}</button></div>`,
    p => p.addEventListener('click', e => {
      const x = e.target.closest('[data-trk],[data-mus]'); if (!x) return; closePop();
      if (x.dataset.mus) ACT['an-music'](x); else ACT['an-trk'](x);
    }));
}
/* pistas que se ven: V1 siempre; ritmo, insertos (V2), diálogo y música cuando tienen algo o se encienden en la barra */
const anTrk = () => ls.get('anTracks', {});
function anShown(L) {
  const T = anTrk(), cfg = anCfg();
  const subs = cfg.subs && L.clips.some(c => c.sh && subsOf(c.sh, c.dur).length);
  return { r: !!T.r, v2: !!(L.over || []).length || !!T.v2, t: subs || (!!T.t && cfg.subs), a: !!cfg.audio || !!T.a };
}
const paintTools = () => { const t = $('#anTools'); if (t) t.innerHTML = anToolsHTML(); };

/* ---------- vista ---------- */
RENDER.animatic = function () {
  const v = $('#view');
  if (!D.sc.scenes.length) { v.innerHTML = emptyScript(); bindView(); return; }
  ensureFrames('index');
  const cfg = anCfg(), L = anClips();
  if (AN.T > L.total) AN.T = 0;
  const ids = new Set(anAll(L).map(c => c.id));
  AN.selSet = new Set([...AN.selSet].filter(id => ids.has(id)));
  if (AN.sel && !ids.has(AN.sel)) AN.sel = null;
  const ar = ASPECTS[P.meta.aspect] || 16 / 9;
  const n = L.clips.length;
  const durs = L.clips.map(c => c.dur).sort((a, b) => a - b);
  const asl = n ? L.total / n : 0, med = n ? (n % 2 ? durs[(n - 1) / 2] : (durs[n / 2 - 1] + durs[n / 2]) / 2) : 0;
  AN.stats = { total: L.total, n, asl, med, cpm: L.total ? Math.max(0, n - 1) / (L.total / 60) : 0 };
  // montaje vacío: un aviso con el botón para traer los planos del storyboard, en vez del monitor negro
  if (!n && !(L.over || []).length && !L.locked.size) {
    const nOff = L.excluded.length;
    v.innerHTML = `<div class="ws ws-1"><section class="center an"><div class="bar"><span class="an-tn"><b>Animatic</b></span><span class="grow"></span>${toolsHTML()}</div>
      <div class="an-empty">${hdEmpty({ icon: 'doc', title: 'El montaje está vacío', text: nOff ? `Hay ${nOff} ${nOff === 1 ? 'plano' : 'planos'} del storyboard fuera del montaje.` : 'Los planos del storyboard aparecen aquí en orden, con su duración, para ver el ritmo de la película.',
        btn: UI.readOnly ? '' : hdBtn('pri', nOff ? 'Agregar los planos del storyboard' : 'Crear planos en el storyboard', { attrs: 'data-act="an-fill"' }) })}</div></section></div>`;
    bindView(); return;
  }
  const SH = anShown(L);
  // en el teléfono la barra de arriba solo tendría «⋯»: se oculta y el «⋯» va al final de la fila de herramientas
  v.innerHTML = `<div class="ws ws-1"><section class="center an">
    <div class="bar hide-sm">
      <span class="an-tn"><b>Animatic</b> · ${n} ${n === 1 ? 'plano' : 'planos'} · ${L.total >= 60 ? `${Math.floor(L.total / 60)} min ${Math.round(L.total % 60)} s` : `${Math.round(L.total)} s`}</span>
      <span class="grow"></span>
      ${toolsHTML()}
    </div>
    <div class="an-body${ea(anMini() ? ' mini' : '')}" id="anBody">
      <div class="an-top${ea(anNoClip(L) ? ' noclip' : '')}">
        <aside class="an-insp${ea(AN.info ? ' sheet' : '')}" id="anInsp">${anInspHTML(L)}</aside>
        <div class="an-mon">
          <div class="mon-wrap" id="monWrap"><canvas id="anV" style="aspect-ratio:${ea(ar)}"></canvas></div>
          <div class="transport">
            <button class="btn ghost sm" data-act="an-go" data-g="start" title="Inicio (Inicio)" aria-label="Ir al inicio">${ICO.start}</button>
            <button class="btn ghost sm" data-act="an-go" data-g="prev" title="Corte anterior (↑)" aria-label="Corte anterior">◀|</button>
            <button class="btn primary sm an-play" data-act="an-play" aria-label="${AN.playing ? 'Pausar' : 'Reproducir'}" title="Reproducir o pausar (espacio) · J K L: atrás, pausa, adelante">${AN.playing ? '❚❚' : '▶'}</button>
            <button class="btn ghost sm" data-act="an-go" data-g="next" title="Corte siguiente (↓)" aria-label="Corte siguiente">|▶</button>
            <button class="btn ghost sm" data-act="an-go" data-g="end" title="Fin (Fin)" aria-label="Ir al final">${ICO.end}</button>
            <span class="tcd tnum" title="Minutos : segundos : cuadros"><b id="anTC">${tc(AN.T)}</b> / ${tc(L.total)}<span class="rate" id="anRate">${AN.playing && AN.rate !== 1 ? rateTxt() : ''}</span></span>
            <button class="btn ghost sm an-loop" data-act="an-loop" aria-pressed="${ea(AN.loop)}" title="Repetir en bucle" aria-label="Bucle"><span class="only-sm">${anIcon('loop')}</span><span class="hide-sm">Bucle</span></button>
          </div>
        </div>
      </div>
      <div class="an-split" id="anSplit" role="separator" aria-orientation="horizontal" aria-label="Alto de la línea de tiempo" title="Arrastra hacia arriba para dar más alto a la línea de tiempo y hacia abajo para contraerla · doble clic: tamaño normal"><i></i></div>
      <div class="rhythm">
        <span class="an-tools" id="anTools" role="toolbar" aria-label="Edición">${anToolsHTML()}</span>
        <button class="tb an-st" data-act="an-stats" title="Duración, clips y ritmo del montaje" aria-label="Datos del montaje" aria-haspopup="dialog">${anIcon('info')}</button>
        <span class="grow"></span>
        <span class="an-zoom">
          <label class="an-zl" title="Ancho de la línea de tiempo (Ctrl + rueda · + y −)"><input type="range" min="0" max="100" step="1" value="${ea(ppsToV(AN.pps || 40))}" data-bind="an-zw" aria-label="Ancho de la línea de tiempo"></label>
          <button class="btn ghost sm" data-act="an-zoom" data-z="fit" title="Ver todo el montaje (Mayús + Z)">Ajustar</button>
        </span>
        <button class="tb hide-sm an-fold" id="anFold" data-act="an-fold" aria-pressed="${ea(anMini())}" ${anFoldTip()}>${anIcon(anMini() ? 'unfold' : 'fold')}</button>
        <button class="tb only-sm an-more tools-more" data-act="tools-more" aria-haspopup="menu" aria-label="Ajustes, ayuda y exportar" title="Más">${ICO.more}</button>
      </div>
      ${anScenesHTML(L)}
      <div class="nle${ea(anMini() ? ' mini' : '')}${ea(AN.blade ? ' blade' : '')}${ea(SH.r ? '' : ' no-r')}${ea(SH.v2 ? '' : ' no-v2')}${ea(SH.t ? '' : ' no-t')}${ea(SH.a ? '' : ' no-a')}" id="nle" style="--th:${ea(anTh())}px">${timelineHTML(L)}</div>
    </div></section></div>`;
  bindView();
  bindAnimatic();
  hydrateThumbs();
};
/* sin clip elegido ni planos fuera del montaje, el panel se pliega y el visor ocupa todo el ancho */
const anFoldTip = () => anMini() ? 'title="Expandir la línea de tiempo" aria-label="Expandir la línea de tiempo"' : 'title="Contraer la línea de tiempo: queda una franja con los planos y el visor gana espacio" aria-label="Contraer la línea de tiempo"';
/* la línea de tiempo contraída: una franja fina con el color de cada escena y el número del plano */
function anFold(on) {
  if (on === anMini()) return;
  AN.mini = on; ls.set('anMini', on);
  const b = $('#anBody'), n = $('#nle'), f = $('#anFold');
  if (b) b.classList.toggle('mini', on);
  if (n) n.classList.toggle('mini', on);
  if (f) { const t = on ? 'Expandir la línea de tiempo' : 'Contraer la línea de tiempo: queda una franja con los planos y el visor gana espacio'; f.setAttribute('aria-pressed', on); f.title = t; f.setAttribute('aria-label', on ? t : 'Contraer la línea de tiempo'); f.innerHTML = anIcon(on ? 'unfold' : 'fold'); }
  drawWave();
}
const anNoClip = L => !anAll(L).some(c => AN.selSet.has(c.id) || c.id === AN.sel) && !L.excluded.length;
const TR_OPTS = [['cut', 'Corte'], ['dis', 'Encadenado'], ['fade', 'Fundido desde negro']];
const anInspHTML = L => '<button class="an-insp-x" type="button" data-act="an-info" aria-label="Cerrar los detalles">' + ICO.close + '</button>' + anInspBody(L);
function anInspBody(L) {
  const ex = L.excluded, ro = UI.readOnly;
  const exHTML = ex.length ? `<div class="fld"><span>Fuera del montaje</span>${ex.map(sh => `<div class="exrow"><b>${esc(D.code[sh.id])}</b><span>${esc(sh.desc || shotTextExcerpt(sh, 40) || '')}</span><button class="btn sm" data-act="an-in" data-id="${ea(sh.id)}" ${ro ? 'disabled' : ''}>Volver</button></div>`).join('')}</div>` : '';
  const sel = anAll(L).filter(c => AN.selSet.has(c.id));
  if (sel.length > 1) {
    const tot = sel.reduce((a, c) => a + c.dur, 0), trs = new Set(sel.map(c => c.tr.type));
    return `<div class="eyebrow">Selección</div><h3 style="margin:0;font-size:16px">${sel.length} clips · ${tc(tot)}</h3>
      <p class="hint" style="margin:0">Mantén presionado uno de ellos para moverlos juntos. Mayús + clic añade un tramo; Ctrl + clic, uno por uno.</p>
      <label class="fld"><span>Entrada de todos</span><select data-bind="an-tr" ${ro ? 'disabled' : ''}>${trs.size > 1 ? '<option value="">Varias</option>' : ''}${TR_OPTS.map(([k, n]) => `<option value="${k}" ${trs.size === 1 && trs.has(k) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <div class="badges">${sel.slice(0, 24).map(c => `<span class="badge">${esc(clipCode(c))}</span>`).join('')}${sel.length > 24 ? `<span class="badge">+${sel.length - 24}</span>` : ''}</div>
      ${ro ? '' : `<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="an-dup">Duplicar</button><button class="btn sm" data-act="an-del">Quitar</button><button class="btn sm" data-act="an-del" data-gap="1">Quitar y dejar negro</button></div>`}${exHTML}`;
  }
  const c = anAll(L).find(c => c.id === AN.sel) || sel[0];
  if (!c) return `<div class="eyebrow">Montaje</div><p class="hint" style="margin:0">Toca un clip para ajustarlo.</p>${exHTML}`;
  const f = 1 / fpsOf();
  const durHTML = (bind, id) => `<div class="fld"><span>Duración</span><div class="durrow"><input type="number" step="${ea(f.toFixed(3))}" min="${ea(f.toFixed(3))}" value="${ea(c.dur.toFixed(2))}" data-bind="${ea(bind)}" data-id="${ea(id)}" class="tnum" ${ro ? 'disabled' : ''}><span class="hint">s · ${Math.round(c.dur * fpsOf())} cuadros</span></div>
      ${ro ? '' : `<div class="chipset">${[['-0.5', '−½ s'], ['-' + f, '−1 cuadro'], ['' + f, '+1 cuadro'], ['0.5', '+½ s']].map(([d, l]) => `<button class="chip" data-act="an-nudge" data-id="${ea(id)}" data-d="${ea(d)}">${l}</button>`).join('')}</div>`}`;
  const trHTML = `<div class="grid2"><label class="fld"><span>Entrada</span><select data-bind="an-tr" data-id="${ea(c.id)}" ${ro ? 'disabled' : ''}>${TR_OPTS.map(([k, n]) => `<option value="${k}" ${c.tr.type === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="fld"><span>Cuadros</span><input type="number" min="2" max="96" value="${ea(c.tr.f || 12)}" data-bind="an-trf" data-id="${ea(c.id)}" ${c.tr.type === 'cut' || ro ? 'disabled' : ''}></label></div>`;
  const head = `<div class="eyebrow">Clip ${c.i + 1} de ${L.clips.length} · ${tc(c.start)} → ${tc(c.end)}</div>`;
  if (c.ov) {
    // inserto en V2: va encima del plano de V1 sin cortarlo
    const sh = c.sh;
    return `<div class="eyebrow">Inserto en V2 · ${tc(c.start)} → ${tc(c.end)}</div>
      <h3 style="margin:0;font-size:16px">Plano ${esc(D.code[sh.id])}</h3>
      <div class="hint" style="margin-top:-4px">Encima de ${esc(D.code[c.base.id] || '')}, desde su segundo ${(c.link.off || 0).toFixed(1)}${sh.s3 && sh.s3.from ? ' · lleva la acción copiada, que se corre con él' : ''}</div>
      ${durHTML('an-dur', sh.id)}</div>
      <label class="fld"><span>Descripción</span><textarea rows="2" data-bind="an-desc" data-id="${ea(sh.id)}" ${ro ? 'disabled' : ''}>${esc(sh.desc || '')}</textarea></label>
      <p class="hint" style="margin:0">Arrástralo por V2 para cambiar dónde entra, o hasta V1 para que corte el montaje.</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="shot" data-id="${ea(sh.id)}">Editar plano</button>${ro ? '' : `<button class="btn sm" data-act="an-v1" data-id="${ea(sh.id)}">Bajar a V1</button><button class="btn sm" data-act="an-dup">Duplicar</button><button class="btn sm" data-act="an-del">Quitar del montaje</button>`}</div>${exHTML}`;
  }
  if (c.card) {
    const k = c.card;
    return `${head}<h3 style="margin:0;font-size:16px">${k.kind === 'black' ? 'Negro' : 'Título'}</h3>
      <div class="seg" role="group" aria-label="Tipo">${[['title', 'Título'], ['black', 'Negro']].map(([v, n]) => `<button data-act="an-kkind" data-k="${ea(v)}" aria-pressed="${ea(k.kind === v)}" ${ro ? 'disabled' : ''}>${n}</button>`).join('')}</div>
      ${k.kind === 'title' ? `<label class="fld"><span>Texto</span><textarea rows="2" data-bind="an-ktext" data-id="${ea(c.id)}" data-f="text" ${ro ? 'disabled' : ''}>${esc(k.text || '')}</textarea></label>
      <label class="fld"><span>Segunda línea</span><input type="text" data-bind="an-ktext" data-id="${ea(c.id)}" data-f="sub" value="${esc(k.sub || '')}" placeholder="Opcional: lugar, fecha, crédito…" ${ro ? 'disabled' : ''}></label>
      <label class="fld"><span>Fondo</span><select data-bind="an-kbg" data-id="${ea(c.id)}" ${ro ? 'disabled' : ''}><option value="black" ${k.bg !== 'white' ? 'selected' : ''}>Negro, letras blancas</option><option value="white" ${k.bg === 'white' ? 'selected' : ''}>Blanco, letras negras</option></select></label>` : ''}
      ${durHTML('an-dur', c.id)}${trHTML}
      ${ro ? '' : `<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="an-dup">Duplicar</button><button class="btn sm" data-act="an-del">Quitar</button></div>`}${exHTML}`;
  }
  const sh = c.sh, est = estDur({ ...sh, dur: '' });
  const subs = subsOf(sh, c.dur);
  return `${head}
    <h3 style="margin:0;font-size:16px">Plano ${esc(D.code[sh.id])}</h3>
    <div class="hint" style="margin-top:-4px">${esc(c.scene ? c.scene.heading : '')}</div>
    <div class="badges"><span class="badge">${esc(sh.size)}</span>${sh.angle && sh.angle !== 'Normal' ? `<span class="badge">${esc(sh.angle)}</span>` : ''}${sh.move && sh.move !== 'Fijo' ? `<span class="badge">${esc(sh.move)}</span>` : ''}</div>
    ${durHTML('an-dur', sh.id)}
      ${sh.dur && !sh.dlg ? `<span class="hint">Estimada por el guion: ${est} s${ro ? '' : ` · <button class="linkbtn" data-act="an-reset" data-id="${ea(sh.id)}">usar la estimada</button>`}</span>` : sh.dlg ? '<span class="hint">Es una parte de la toma: lleva solo su tramo de la acción y del diálogo.</span>' : `<span class="hint">Estimada por el texto del guion que cubre el plano.</span>`}</div>
    ${trHTML}
    <label class="fld"><span>Descripción</span><textarea rows="2" data-bind="an-desc" data-id="${ea(sh.id)}" ${ro ? 'disabled' : ''}>${esc(sh.desc || '')}</textarea></label>
    ${subs.length ? `<div class="fld"><span>Diálogo en el plano</span><div class="subs">${subs.map(s => `<div><b>${esc(s.who)}</b> ${esc(s.text)}</div>`).join('')}</div></div>` : ''}
    <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="shot" data-id="${ea(sh.id)}">Editar plano</button>${ro ? '' : `<button class="btn sm" data-act="an-dup">Duplicar</button><button class="btn sm" data-act="an-del">Quitar del montaje</button>`}</div>${exHTML}`;
}
function timelineHTML(L) {
  const pps = AN.pps || 40, ro = UI.readOnly;
  const W = Math.max(L.total * pps + 160, 600);
  const maxD = Math.max(1, ...L.clips.map(c => c.dur));
  const tb = 480;   // la misma viñeta del storyboard (se dibuja una sola vez y se muestra achicada)
  const asl = L.clips.length ? L.total / L.clips.length : 1;
  const step = pps >= 60 ? 1 : pps >= 25 ? 2 : pps >= 10 ? 5 : pps >= 4 ? 10 : 30;
  let ruler = '';
  for (let s = 0; s <= L.total + step; s += step) ruler += `<span class="rt" style="left:${ea(s * pps)}px">${tc(s, false)}</span>`;
  let lastScene = null, marks = '';
  const clips = L.clips.map(c => {
    if (c.sh && c.sh.sc !== lastScene) { lastScene = c.sh.sc; marks += `<span class="smark" style="left:${ea(c.start * pps)}px">Esc ${esc(c.sh.sc)}</span>`; }
    const w = c.dur * pps;
    const tr = c.tr.type !== 'cut' ? `<i class="trx ${ea(c.tr.type)}" style="width:${Math.min(w, c.tr.f / fpsOf() * pps)}px"></i>` : '';
    const trims = ro ? '' : `<i class="trim l" data-trim="l" title="Arrastra para quitar el comienzo"></i><i class="trim r" data-trim="r" title="Arrastra para cambiar la duración"></i>`;
    const cls = `clip${AN.selSet.has(c.id) ? ' sel' : ''}${c.sh && c.sh.done ? ' done' : ''}${c.card ? ' card' + (c.card.bg === 'white' ? ' wh' : '') : ''}`;
    if (c.card) return `<div class="${ea(cls)}" data-id="${ea(c.id)}" style="left:${ea(c.start * pps)}px;width:${ea(w)}px">${c.card.kind === 'title' && w > 26 ? `<span class="kt">${esc(c.card.text || '')}</span>` : ''}<span class="cl-t"><b>${esc(clipCode(c))}</b>${w > 70 ? ` <span>${c.dur.toFixed(1)}s</span>` : ''}</span>${tr}${trims}</div>`;
    const col = scCol((c.scene ? c.scene.idx : 0));
    return `<div class="${ea(cls)}" data-id="${ea(c.id)}" style="left:${ea(c.start * pps)}px;width:${ea(w)}px;--sc:${ea(col)}">
      ${w > 20 ? (u => `<i class="film" ${u ? `style="background-image:url(${ea(u)})"` : `data-thumb="${ea(c.sh.id)}" data-base="${ea(tb)}"`}></i>`)(thumbCached(c.sh, 0, tb)) : ''}<span class="cl-t"><b>${esc(D.code[c.sh.id])}</b>${w > 70 ? ` <span>${c.dur.toFixed(1)}s</span>` : ''}</span>${tr}${trims}</div>`;
  }).join('');
  const bars = L.clips.map(c => {
    const h = Math.max(8, c.dur / maxD * 100);
    const cls = c.card ? 'card' : c.dur < asl * .6 ? 'fast' : c.dur > asl * 1.6 ? 'slow' : '';
    return `<i class="rb ${ea(cls)}" style="left:${ea(c.start * pps)}px;width:${Math.max(1, c.dur * pps - 1)}px;height:${ea(h)}%" title="${ea(c.dur.toFixed(2))} s"></i>`;
  }).join('') + `<i class="asl" style="bottom:${ea(asl / maxD * 100)}%" title="Duración media"></i>`;
  const subs = anCfg().subs ? L.clips.filter(c => c.sh).flatMap(c => subsOf(c.sh, c.dur).map(s => `<span class="sub" style="left:${ea((c.start + s.a) * pps)}px;width:${Math.max(2, (s.b - s.a) * pps - 2)}px" title="${esc(s.who + ': ' + s.text)}">${esc(s.text)}</span>`)).join('') : '';
  const au = anCfg().audio;
  const ovs = (L.over || []).map(c => {
    const w = c.dur * pps, col = scCol((c.scene ? c.scene.idx : 0));
    const trims = ro ? '' : `<i class="trim l" data-trim="l" title="Arrastra para quitar el comienzo"></i><i class="trim r" data-trim="r" title="Arrastra para cambiar la duración"></i>`;
    return `<div class="clip ovclip${ea(AN.selSet.has(c.id) ? ' sel' : '')}${ea(c.sh.done ? ' done' : '')}" data-id="${ea(c.id)}" data-ov="${ea(c.id)}" style="left:${ea(c.start * pps)}px;width:${ea(w)}px;--sc:${ea(col)}" title="Inserto ${esc(D.code[c.sh.id])} sobre ${esc(D.code[c.base.sh.id])} · arrástralo por V2 o hasta V1 (doble clic: abrir el plano)">${w > 20 ? (u => `<i class="film" ${u ? `style="background-image:url(${ea(u)})"` : `data-thumb="${ea(c.sh.id)}" data-base="${ea(tb)}"`}></i>`)(thumbCached(c.sh, 0, tb)) : ''}<span class="cl-t"><b>${esc(D.code[c.sh.id])}</b>${w > 70 ? ` <span>${c.dur.toFixed(1)}s</span>` : ''}</span>${trims}</div>`;
  }).join('');
  return `<div class="nle-heads"><div class="nh rul"></div><div class="nh nh-r" title="Ritmo: altura = duración del plano">Ritmo</div><div class="nh nh-v2" title="Insertos: planos que copiaron la acción de otro y van encima sin cortarlo">V2</div><div class="nh nh-v1">V1${ro ? '' : '<i class="th-grip" id="thGrip" role="separator" aria-orientation="horizontal" aria-label="Alto de las pistas" title="Arrastra para cambiar el alto de las pistas · doble clic: tamaño normal"></i>'}</div><div class="nh nh-t">Diál.</div><div class="nh nh-a">${ro ? 'Música' : '<button class="nh-b" data-act="an-music" title="Música del animatic">Música</button>'}</div></div>
    <div class="nle-scroll" id="nleS" data-keep="nle"><div class="nle-inner" id="nleIn" style="width:${ea(W)}px">
      <div class="ruler" id="ruler" style="--pps:${ea(pps)}px">${ruler}${marks}</div>
      <div class="trk trk-r">${bars}</div>
      <div class="trk trk-v2" id="trkV2">${ovs}</div>
      <div class="trk trk-v" id="trkV">${clips}</div>
      <div class="trk trk-t">${subs}</div>
      <div class="trk trk-a" id="trkA">${au && L.locked.size ? `<span class="aname">${esc(au.name)} · sigue a cada escena en su lugar del montaje completo</span>` : au ? `<canvas id="wave" style="left:${ea((au.offset || 0) * pps)}px"></canvas><span class="aname">${esc(au.name)}${AN.audio ? '' : ' · vuelve a cargarla para escucharla'}</span>` : (ro ? '<span class="aname dim">Sin música.</span>' : '<button class="an-addmu" data-act="an-music">♪ Añadir música</button>')}</div>
      ${anIoHTML(L, pps)}
      <div class="playhead" id="ph" style="left:${ea(AN.T * pps)}px"><i></i></div>
      <div class="bladeln" id="bladeLn" hidden><b class="tnum"></b></div>
    </div></div>`;
}

/* ---------- interacción ---------- */
let AN_L = null;
function bindNleScroll(S) {
  S.addEventListener('pointerdown', onNlePointer);
  S.addEventListener('click', onNleClick);
  deselectOn('animatic', () => { if (AN.selSet.size || AN.sel) { AN.selSet = new Set(); AN.sel = null; anPaintSel(); } }, '.clip, .ovclip, .ruler, .playhead, .an-insp, .an-tools, .an-zoom, .an-scenes, .an-split, .nle-heads');
  S.addEventListener('dblclick', onNleDbl);
  // la cuchilla: una línea sigue al puntero (pegada a los cuadros y al cabezal) y marca dónde cortará
  S.addEventListener('pointermove', e => {
    const ln = $('#bladeLn'); if (!ln) return;
    const on = AN.blade && !!e.target.closest('.clip:not(.ghost)') && !e.target.closest('[data-trim]');
    ln.hidden = !on; if (!on) return;
    const t = bladeT(e); ln.style.left = t * AN.pps + 'px'; $('b', ln).textContent = tc(t);
  });
  S.addEventListener('pointerleave', () => { const ln = $('#bladeLn'); if (ln) ln.hidden = true; });
  S.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomTL(Math.exp(-e.deltaY * .002), e.clientX); } }, { passive: false });
}
function bindAnimatic() {
  AN_L = anClips();
  const S = $('#nleS');
  if (!AN.pps) { fitZoom(); return; }
  sizeMonitor();
  drawMonitor();
  drawWave();
  const mon = $('#monWrap');
  if (mon && !mon._ro) { mon._ro = new ResizeObserver(() => { if (sizeMonitor()) drawMonitor(); }); mon._ro.observe(mon); }   // al abrir ya se dibujó: no otra vez
  restoreAudio();
  bindNleScroll(S);
  bindSplit();
}
/* separador monitor / línea de tiempo: arrastrar hacia arriba da alto a las pistas */
function bindSplit() {
  const sp = $('#anSplit'); if (!sp) return;
  sp.addEventListener('pointerdown', e => {
    e.preventDefault(); sp.setPointerCapture(e.pointerId); sp.classList.add('on');
    const y0 = e.clientY, th0 = anMini() ? TH_MIN - 16 : anTh();
    const mon = $('#monWrap'), room = mon ? Math.max(0, mon.getBoundingClientRect().height - 140) : 400;
    const hi = Math.min(TH_MAX, Math.max(TH_MIN, th0) + room / TH_K);
    const move = ev => {
      const raw = th0 - (ev.clientY - y0) / TH_K;
      if (raw < TH_MIN - 14) { anFold(true); return; }
      if (raw >= TH_MIN - 2) anFold(false);
      setTh(clamp(raw, TH_MIN, Math.max(TH_MIN, th0, hi)), false);
    };
    const up = () => { sp.removeEventListener('pointermove', move); sp.removeEventListener('pointerup', up); sp.classList.remove('on'); setTh(AN.th, true); };
    sp.addEventListener('pointermove', move); sp.addEventListener('pointerup', up);
  });
  sp.addEventListener('dblclick', () => { anFold(false); setTh(TH_DEF, true); });
  sp.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); if (anMini()) { if (e.key === 'ArrowUp') anFold(false); return; } if (e.key === 'ArrowDown' && anTh() <= TH_MIN) { anFold(true); return; } setTh(clamp(anTh() + (e.key === 'ArrowUp' ? 12 : -12), TH_MIN, TH_MAX), true); } });
  sp.tabIndex = 0;
}
/* alto de las pistas: arrastrar el borde inferior de V1 (en las cabeceras) */
document.addEventListener('pointerdown', e => {
  const g = e.target.closest && e.target.closest('#thGrip'); if (!g) return;
  e.preventDefault(); e.stopPropagation(); g.setPointerCapture(e.pointerId); g.classList.add('on');
  const y0 = e.clientY, th0 = anTh();
  const move = ev => setTh(clamp(th0 + (ev.clientY - y0), TH_MIN, TH_MAX), false);
  const up = () => { g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); g.classList.remove('on'); setTh(AN.th, true); };
  g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
}, true);
document.addEventListener('dblclick', e => { if (e.target.closest && e.target.closest('#thGrip')) setTh(TH_DEF, true); });
function setTh(th, done) {
  const before = anTh() > 130;
  AN.th = Math.round(th);
  const nle = $('#nle'); if (nle) nle.style.setProperty('--th', AN.th + 'px');
  const r = $('[data-bind="an-zh"]'); if (r && +r.value !== AN.th) r.value = AN.th;
  if (!done) return;
  ls.set('anTh', AN.th);
  if (before !== (AN.th > 130)) relayoutTimeline(); else drawWave();
}
/* vuelve a pintar solo la línea de tiempo, conservando el desplazamiento */
function relayoutTimeline(keepT) {
  const S = $('#nleS'); if (!S) return;
  const r = S.getBoundingClientRect(), x = r.width / 2;
  const t = keepT ?? (S.scrollLeft + x) / AN.pps;
  $('#nle').innerHTML = timelineHTML(AN_L);
  hydrateThumbs();
  const S2 = $('#nleS'); S2.scrollLeft = t * AN.pps - x;
  bindNleScroll(S2);
  drawWave();
}
function fitZoom() {
  const S = $('#nleS');
  const L = AN_L || anClips();
  AN.pps = clamp(((S ? S.clientWidth : 800) - 40) / Math.max(1, L.total), 3, 400);
  render();
}
function zoomTL(f, clientX) {
  const S = $('#nleS'); if (!S) return;
  const r = S.getBoundingClientRect(), x = (clientX ?? r.left + r.width / 2) - r.left;
  const t = (S.scrollLeft + x) / AN.pps;
  AN.pps = clamp(AN.pps * f, PPS_MIN, PPS_MAX);
  $('#nle').innerHTML = timelineHTML(AN_L);
  hydrateThumbs();
  const S2 = $('#nleS'); S2.scrollLeft = t * AN.pps - x;
  bindNleScroll(S2);
  drawWave();
  const zr = $('[data-bind="an-zw"]'); if (zr) zr.value = ppsToV(AN.pps);
}
function sizeMonitor() {
  const wrap = $('#monWrap'), cv = $('#anV');
  if (!wrap || !cv) return;
  const ar = ASPECTS[P.meta.aspect] || 16 / 9;
  const r = wrap.getBoundingClientRect();
  let w = r.width, h = w / ar;
  if (h > r.height && r.height > 60) { h = r.height; w = h * ar; }
  cv.style.width = Math.floor(w) + 'px'; cv.style.height = Math.floor(h) + 'px';
  const dpr = Math.min(2, devicePixelRatio || 1);
  AN.W = Math.min(1600, Math.round(w * dpr)); AN.H = Math.round(AN.W / ar);
  // cambiar el tamaño del lienzo lo borra: solo si cambió (true: hay que volver a dibujar)
  if (cv.width === AN.W && cv.height === AN.H) return false;
  cv.width = AN.W; cv.height = AN.H;
  return true;
}
/* reproduciendo, el cuadro se arma a 960 px como máximo y las sombras se recalculan menos (más fluido);
   en pausa vuelve a dibujarse a tamaño completo */
function drawMonitor() {
  const cv = $('#anV'); if (!cv || !AN_L) return;
  const cfg = anCfg(), lite = AN.playing && AN.W > 960;
  if (typeof R3 !== 'undefined') R3.live = !!AN.playing;
  let c;
  try {
    if (lite) {
      const w = 960, h = Math.round(960 * AN.H / AN.W);
      if (!AN.lite || AN.lite.width !== w || AN.lite.height !== h) { AN.lite = document.createElement('canvas'); AN.lite.width = w; AN.lite.height = h; }
      c = anDraw(AN.lite.getContext('2d'), w, h, AN.T, AN_L, { subs: cfg.subs, burn: cfg.burn, ahead: AN.playing });
      cv.getContext('2d').drawImage(AN.lite, 0, 0, AN.W, AN.H);
    } else c = anDraw(cv.getContext('2d'), AN.W, AN.H, AN.T, AN_L, { subs: cfg.subs, burn: cfg.burn, ahead: AN.playing });
  } finally { if (typeof R3 !== 'undefined') R3.live = false; }
  const tcEl = $('#anTC'); if (tcEl) tcEl.textContent = tc(AN.T);
  const ph = $('#ph'); if (ph) ph.style.left = (AN.T * AN.pps) + 'px';
  return c;
}
function seek(T, follow = true) {
  AN.T = clamp(T, 0, AN_L ? AN_L.total : 0);
  drawMonitor();
  if (AN.audio && AN.playing) syncAudio();
  if (follow) { const S = $('#nleS'); if (S) { const x = AN.T * AN.pps; if (x < S.scrollLeft + 20 || x > S.scrollLeft + S.clientWidth - 40) S.scrollLeft = x - S.clientWidth * .3; } }
}
/* imán: t se pega al punto más cercano (cortes, cabezal) si está a menos de 8 px */
function snapT(t, pts) {
  if (!anSnapOn() || !AN_L) return t;
  const list = pts || AN_L.clips.map(c => c.start).concat(AN_L.total);
  let best = t, bd = 8 / AN.pps;
  for (const p of list) { const d = Math.abs(p - t); if (d < bd) { bd = d; best = p; } }
  return best;
}
const clipEl = id => $(`#trkV .clip[data-id="${CSS.escape(id)}"]:not(.ghost)`);
function anPaintSel() {
  $$('#trkV .clip:not(.ghost), #trkV2 .clip:not(.ghost)').forEach(el => el.classList.toggle('sel', AN.selSet.has(el.dataset.id)));
  const insp = $('#anInsp');
  if (insp && AN_L) { const nc = anNoClip(AN_L); if (nc) AN.info = false; insp.innerHTML = anInspHTML(AN_L); insp.classList.toggle('sheet', !!AN.info); insp.closest('.an-top').classList.toggle('noclip', nc); }
  paintTools();
}
function onNlePointer(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (e.target.closest('.io-x')) return;   // la × de las marcas (un clic: ACT 'an-io-x')
  const trim = e.target.closest('[data-trim]'), clip = e.target.closest('.clip');
  // cuchilla: un toque sobre un clip lo corta ahí
  if (AN.blade && clip && !trim && !UI.readOnly && !clip.classList.contains('ghost')) {
    if (e.pointerType === 'mouse') e.preventDefault();
    const id = clip.dataset.id, x0 = e.clientX, y0 = e.clientY;
    const up = ev => {
      removeEventListener('pointerup', up, true); removeEventListener('pointercancel', no, true);
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) return;
      const c = anAll(AN_L).find(x => x.id === id); if (!c) return;
      const f = 1 / fpsOf(), lt = Math.round((bladeT(ev) - c.start) * fpsOf()) / fpsOf();
      if (lt < f - 1e-6 || lt > c.dur - f + 1e-6) { toast('Corta un poco más adentro del clip (no en su borde).'); return; }
      anSplitAt(c, lt);
    };
    const no = () => { removeEventListener('pointerup', up, true); removeEventListener('pointercancel', no, true); };
    addEventListener('pointerup', up, true); addEventListener('pointercancel', no, true);
    return;
  }
  if (trim && clip && !UI.readOnly) { e.preventDefault(); startTrim(e, clip.dataset.id, trim.dataset.trim); return; }
  if (clip) {
    // clic: elige (otro clic: suelta) · con el ratón, presionar y mover: lo arrastra al instante · en táctil: mantener
    if (UI.readOnly) return;
    if (e.pointerType === 'mouse') e.preventDefault();
    const id = clip.dataset.id, v2 = !!clip.closest('#trkV2');
    pressGesture(e, { target: clip, onLift: ev => v2 ? startMoveOv(ev, id, e) : startMove(ev, id, e) });
    return;
  }
  // pistas vacías: arrastrar dibuja un recuadro para elegir varios; un clic lleva el cabezal ahí y suelta la selección
  if (!e.target.closest('.ruler, .playhead')) {
    if (e.pointerType !== 'touch' && !UI.readOnly) pressGesture(e, { onSweep: () => sweepClips(e, e.shiftKey || e.ctrlKey || e.metaKey) });
    return;
  }
  // la regla: mover el cabezal (con imán a los cortes)
  e.preventDefault();
  if (AN.playing) anPause();
  const inner = $('#nleIn');
  const tAt = ev => snapT((ev.clientX - inner.getBoundingClientRect().left) / AN.pps);
  seek(tAt(e), false);
  const move = ev => seek(tAt(ev), false);
  const up = () => { removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true); };
  addEventListener('pointermove', move, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
}
function onNleClick(e) {
  if (AN.blade) return;
  const clip = e.target.closest('.clip');
  if (!clip && e.target.closest('.trk')) {
    // pista vacía: el cabezal va ahí (la selección se suelta con la regla general de los espacios vacíos)
    if (AN.playing) anPause();
    const inner = $('#nleIn');
    seek(snapT((e.clientX - inner.getBoundingClientRect().left) / AN.pps), false);
    return;
  }
  if (!clip || clip.classList.contains('ghost') || e.target.closest('[data-trim]')) return;
  const L = AN_L, id = clip.dataset.id, c = anAll(L).find(c => c.id === id);
  if (!c) return;
  if (e.shiftKey && !c.ov && AN.sel && L.clips.some(x => x.id === AN.sel)) {
    // tramo: del último elegido a este
    const a = L.clips.findIndex(x => x.id === AN.sel), b = c.i;
    L.clips.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => AN.selSet.add(x.id));
  } else if (e.ctrlKey || e.metaKey) { AN.selSet.has(id) ? AN.selSet.delete(id) : AN.selSet.add(id); }
  else if (secondClick('an|' + id)) { /* segundo clic de un doble clic: abre el plano, no lo suelta */ }
  else { const only = AN.selSet.size === 1 && AN.selSet.has(id); AN.selSet = only ? new Set() : new Set([id]); }
  AN.sel = AN.selSet.has(id) ? id : ([...AN.selSet].pop() || null);
  if (AN.playing) anPause();
  const inner = $('#nleIn');
  seek(clamp((e.clientX - inner.getBoundingClientRect().left) / AN.pps, c.start, c.end - 1e-3), false);
  anPaintSel();
}
function onNleDbl(e) {
  if (AN.blade) return;
  const ovc = e.target.closest('.ovclip'); if (ovc) { if (!e.target.closest('[data-trim]')) openShot(ovc.dataset.ov); return; }
  const clip = e.target.closest('.clip'); if (!clip || e.target.closest('[data-trim]')) return;
  const c = AN_L.clips.find(c => c.id === clip.dataset.id); if (!c) return;
  if (c.sh) openShot(c.sh.id);
  else { const t = $('[data-bind="an-ktext"]'); if (t) { t.focus(); t.select(); } }
}
/* recuadro: elige los clips que toca (con Mayús o Ctrl se suman a los ya elegidos) */
function sweepClips(e0, add) {
  const base = add ? new Set(AN.selSet) : new Set();
  sweepSelect(e0, {
    scroller: $('#nleS'), axis: 'x', items: () => $$('#trkV .clip:not(.ghost)'),
    onPick: (hit, fin) => {
      const s = new Set(base); hit.forEach(el => s.add(el.dataset.id));
      AN.selSet = s;
      $$('#trkV .clip:not(.ghost)').forEach(el => el.classList.toggle('sel', s.has(el.dataset.id)));
      if (fin) { AN.sel = hit.length ? hit[hit.length - 1].dataset.id : ([...s].pop() || null); anPaintSel(); }
    },
  });
}
/* orden visible nuevo → orden completo (las escenas ocultas y los planos fuera conservan su lugar) */
function visibleToFull(L, vis) {
  const set = new Set(vis), full = L.order.slice();
  let k = 0;
  for (let i = 0; i < full.length; i++) if (set.has(full[i])) full[i] = vis[k++];
  return full;
}
/* mover: el grupo elegido se levanta, los demás clips le hacen espacio y el orden cambia al soltar */
function startMove(ev, id, e0) {
  const L = AN_L, S = $('#nleS'), trk = $('#trkV'), inner = $('#nleIn');
  if (!S || !trk) return;
  if (!AN.selSet.has(id)) { AN.selSet = new Set([id]); AN.sel = id; anPaintSel(); }
  if (AN.playing) anPause();
  const group = L.clips.filter(c => AN.selSet.has(c.id)), rest = L.clips.filter(c => !AN.selSet.has(c.id));
  const hitC = group.find(c => c.id === id), hit = clipEl(id);
  if (!group.length || !hitC || !hit) return;
  const pps = AN.pps, gDur = group.reduce((a, c) => a + c.dur, 0);
  const off = group.slice(0, group.indexOf(hitC)).reduce((a, c) => a + c.dur, 0) * pps + (e0.clientX - hit.getBoundingClientRect().left);
  const ghost = hit.cloneNode(true);
  ghost.classList.add('ghost'); ghost.classList.remove('sel', 'pressing');
  ghost.style.width = gDur * pps + 'px';
  $$('.trim', ghost).forEach(x => x.remove());
  if (group.length > 1) ghost.insertAdjacentHTML('beforeend', `<span class="gcount">${group.length} clips</span>`);
  trk.appendChild(ghost);
  group.forEach(c => { const el = clipEl(c.id); if (el) el.classList.add('lifted'); });
  trk.classList.add('moving'); document.body.classList.add('an-dragging');
  const rs = []; { let t = 0; for (const c of rest) { rs.push(t); t += c.dur; } }
  let idx = rest.findIndex(c => c.start > group[0].start); if (idx < 0) idx = rest.length;
  const idx0 = idx;
  const layout = () => rest.forEach((c, i) => { const el = clipEl(c.id); if (el) el.style.left = (rs[i] + (i >= idx ? gDur : 0)) * pps + 'px'; });
  // un plano solo, llevado hasta V2, pasa a ser un inserto encima del plano que quede debajo
  const t2 = $('#trkV2'), canUp = group.length === 1 && !!hitC.sh, f1 = 1 / fpsOf();
  let cx = ev.clientX, cy = ev.clientY, raf = 0, done = false, up2 = false, st2 = 0;
  const frame = () => {
    if (done) return;
    edgeScroll(S, cx, 0, 'x');
    const gl = cx - inner.getBoundingClientRect().left - off, r2 = t2 && t2.getBoundingClientRect();
    const nowUp = canUp && !!r2 && cy < r2.bottom + 2;
    if (nowUp !== up2) {
      up2 = nowUp; (up2 ? t2 : trk).appendChild(ghost);
      if (up2) { idx = -1; rest.forEach((c, i) => { const el = clipEl(c.id); if (el) el.style.left = rs[i] * pps + 'px'; }); }
    }
    if (up2) {
      st2 = Math.max(0, Math.round(snapT(gl / pps, rs.concat(AN.T)) / f1) * f1);
      ghost.style.left = st2 * pps + 'px';
    } else {
      ghost.style.left = gl + 'px';
      const tg = gl / pps;
      let k = rest.findIndex((c, i) => rs[i] + c.dur / 2 > tg);
      if (k < 0) k = rest.length;
      if (k !== idx) { idx = k; layout(); }
    }
    raf = requestAnimationFrame(frame);
  };
  layout(); raf = requestAnimationFrame(frame);
  const mv = e => { cx = e.clientX; cy = e.clientY; };
  const toV2 = () => {
    const i = rest.findIndex((c, j) => c.sh && st2 >= rs[j] - 1e-6 && st2 < rs[j] + c.dur - 1e-6);
    if (i < 0) { toast('Suelta el plano encima de otro plano de V1.'); render(); return; }
    const base = rest[i], o2 = Math.min(st2 - rs[i], base.dur - f1), sh = hitC.sh, fr = sh.s3 && sh.s3.from;
    const kids = (L.over || []).filter(o => o.base.id === sh.id);
    anEdit('Subir a V2', [sh.id], () => { ovPlace(sh, base.id, o2, fr && fr.id === base.id ? o2 - (fr.off || 0) : 0); AN.selSet = new Set([sh.id]); AN.sel = sh.id; });
    toast(`${D.code[sh.id]} va ahora en V2, encima de ${D.code[base.id]}.` + (kids.length ? ' Sus insertos bajaron a V1.' : ''));
  };
  const finish = commit => {
    done = true; cancelAnimationFrame(raf);
    removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', cancel, true); removeEventListener('keydown', key, true);
    document.body.classList.remove('an-dragging');
    if (commit && up2) { ghost.remove(); toV2(); return; }
    if (!commit || idx === idx0 || idx < 0) { trk.classList.remove('moving'); ghost.remove(); group.forEach(c => { const el = clipEl(c.id); if (el) el.classList.remove('lifted'); }); relayoutClips(); return; }
    const vis = rest.map(c => c.id);
    vis.splice(idx, 0, ...group.map(c => c.id));
    const b = anBegin();
    anCfg().order = visibleToFull(L, vis);
    anCommit(b, group.length > 1 ? `Mover ${group.length} clips` : 'Mover clip');
    changed('data'); render();
    toast(group.length > 1 ? `${group.length} clips movidos.` : `${clipCode(hitC)} movido a la posición ${idx + 1}.`);
  };
  const up = () => finish(true), cancel = () => finish(false);
  const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); } };
  addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', cancel, true); addEventListener('keydown', key, true);
}
/* mover un inserto: por V2 cambia dónde entra (encima del plano que quede debajo); bajándolo a V1 corta el
   montaje entre los clips donde se suelte */
function startMoveOv(ev, id, e0) {
  const L = AN_L, S = $('#nleS'), t1 = $('#trkV'), t2 = $('#trkV2'), inner = $('#nleIn');
  const c = ovOf(L, id), el = t2 && $(`.clip[data-id="${CSS.escape(id)}"]`, t2);
  if (!c || !el || !t1) return;
  if (AN.playing) anPause();
  AN.selSet = new Set([id]); AN.sel = id; anPaintSel();
  const pps = AN.pps, f = 1 / fpsOf(), off = e0.clientX - el.getBoundingClientRect().left;
  const ghost = el.cloneNode(true); ghost.classList.add('ghost'); ghost.classList.remove('sel', 'pressing'); $$('.trim', ghost).forEach(x => x.remove());
  t2.appendChild(ghost); el.classList.add('lifted'); document.body.classList.add('an-dragging');
  const mark = document.createElement('i'); mark.className = 'an-drop'; mark.hidden = true; t1.appendChild(mark);
  const cuts = L.clips.map(x => x.start).concat(L.total, AN.T);
  let cx = ev.clientX, cy = ev.clientY, raf = 0, done = false, down = false, st = c.start, idx = 0;
  const frame = () => {
    if (done) return;
    edgeScroll(S, cx, 0, 'x');
    const gl = cx - inner.getBoundingClientRect().left - off, r1 = t1.getBoundingClientRect();
    const now = cy > r1.top + 6;
    if (now !== down) { down = now; (down ? t1 : t2).appendChild(ghost); mark.hidden = !down; }
    if (!down) {
      // el comienzo y el final se pegan a los cortes de V1 y al cabezal
      let s0 = snapT(gl / pps, cuts); const e1 = snapT(gl / pps + c.dur, cuts); if (s0 === gl / pps && e1 !== gl / pps + c.dur) s0 = e1 - c.dur;
      st = Math.max(0, Math.round(s0 / f) * f); ghost.style.left = st * pps + 'px';
    } else {
      ghost.style.left = gl + 'px';
      const tg = gl / pps + c.dur / 2;
      idx = L.clips.findIndex(x => x.start + x.dur / 2 > tg); if (idx < 0) idx = L.clips.length;
      mark.style.left = (idx < L.clips.length ? L.clips[idx].start : L.total) * pps + 'px';
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const mv = e => { cx = e.clientX; cy = e.clientY; };
  const finish = ok => {
    done = true; cancelAnimationFrame(raf);
    removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', cancel, true); removeEventListener('keydown', key, true);
    document.body.classList.remove('an-dragging'); ghost.remove(); mark.remove(); el.classList.remove('lifted');
    if (!ok) return;
    const sh = c.sh;
    if (down) {
      anEdit('Bajar a V1', [id], () => {
        sh.v1 = true; delete sh.ov;
        const vis = L.clips.map(x => x.id); vis.splice(idx, 0, id);
        anCfg().order = visibleToFull(L, vis);
      });
      toast(`${D.code[id]} pasó a V1: ahora corta el montaje.`);
      return;
    }
    if (Math.abs(st - c.start) < 1e-4) return;
    const base = L.clips.find(x => x.sh && x.id !== id && st >= x.start - 1e-6 && st < x.end - 1e-6);
    if (!base) { toast('Suelta el inserto encima de un plano de V1.'); return; }
    const o2 = Math.min(st - base.start, base.dur - f);
    anEdit('Mover inserto', [id], () => { ovPlace(sh, base.id, o2, base.start + o2 - c.start); });
    toast(`${D.code[id]} entra en ${tc(base.start + o2)}, encima de ${D.code[base.id]}${sh.s3 && sh.s3.from ? '; su acción copiada se corrió con él' : ''}.`);
  };
  const up = () => finish(true), cancel = () => finish(false);
  const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); } };
  addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', cancel, true); addEventListener('keydown', key, true);
}
/* corre el comienzo de un inserto d segundos (sus claves ya se corrieron con shotWindow) */
function ovNudge(sh, d) { for (const lk of new Set([sh.ov, sh.s3 && sh.s3.from].filter(Boolean))) lk.off = round2((lk.off || 0) + d); }
/* recortar con los bordes: derecho = duración (las claves se quedan en su segundo), izquierdo = quitar el comienzo */
function startTrim(e, id, side) {
  const L = AN_L, c = anAll(L).find(c => c.id === id), S = $('#nleS');
  if (!c || !S) return;
  if (AN.playing) anPause();
  const f = 1 / fpsOf(), pps = AN.pps, T0 = AN.T;
  const before = anBegin(c.sh ? [c.sh.id] : []);
  const orig = c.sh ? before.sh[c.sh.id] : null, old = c.dur, start = c.start;
  const sl0 = S.scrollLeft, x0 = e.clientX;
  AN.selSet = new Set([id]); AN.sel = id;
  $$('#trkV .clip, #trkV2 .clip').forEach(el => el.classList.toggle('sel', el.dataset.id === id));
  document.body.classList.add('an-trimming');
  const tag = document.createElement('div'); tag.className = 'an-tag'; document.body.appendChild(tag);
  let cx = x0, cy = e.clientY, raf = 0, nd = old, last = null, done = false;
  const apply = () => {
    const dx = (cx - x0 + S.scrollLeft - sl0) / pps;
    if (side === 'r') nd = Math.max(f, snapF(snapT(start + old + dx, [T0, start + old]) - start));
    else nd = Math.max(f, snapF(old - (snapT(start + dx, [T0, start]) - start)));
    if (c.ov && side === 'l') nd = Math.min(nd, old + (c.link.off || 0));   // un inserto no empieza antes que su plano de abajo
    tag.textContent = `${side === 'r' ? 'Duración' : 'Sin el comienzo'} · ${nd.toFixed(2)} s (${nd >= old ? '+' : '−'}${Math.abs(nd - old).toFixed(2)})`;
    tag.style.left = cx + 'px'; tag.style.top = cy + 'px';
    if (nd === last) return;
    last = nd;
    if (c.card) c.card.dur = nd.toFixed(3);
    else {
      restoreShot(c.sh, orig);
      // un inserto no estira su acción (va sincronizada con el plano de abajo): solo entra más o menos de ella
      if (c.ov) { if (side === 'r') c.sh.dur = nd.toFixed(3); else { shotWindow(c.sh, old - nd, old, old); ovNudge(c.sh, old - nd); } }
      else if (side === 'r') c.sh.dur = nd.toFixed(3); else shotWindow(c.sh, old - nd, old, old);
    }
    AN_L = anClips(); relayoutClips();
    const nc = anAll(AN_L).find(x => x.id === id);
    if (nc) { AN.T = side === 'r' ? Math.max(nc.start, nc.end - f) : nc.start; drawMonitor(); }
  };
  const frame = () => { if (done) return; edgeScroll(S, cx, 0, 'x'); apply(); raf = requestAnimationFrame(frame); };
  raf = requestAnimationFrame(frame);
  const mv = ev => { cx = ev.clientX; cy = ev.clientY; };
  const end = commit => {
    done = true; cancelAnimationFrame(raf); tag.remove();
    removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', cancel, true); removeEventListener('keydown', key, true);
    document.body.classList.remove('an-trimming');
    suppressClick();
    if (!commit) { if (c.card) anRestoreCfg(before); else restoreShot(c.sh, orig); AN.T = T0; AN_L = anClips(); render(); return; }
    if (anCommit(before, side === 'r' ? 'Cambiar la duración' : 'Quitar el comienzo')) changed('data');
    render();
  };
  const up = () => end(true), cancel = () => end(false);
  const key = ev => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); end(false); } };
  addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', cancel, true); addEventListener('keydown', key, true);
}
const anRestoreCfg = b => { P.animatic = JSON.parse(b.an); };
function relayoutClips() {
  const pps = AN.pps;
  for (const c of AN_L.clips) {
    const el = clipEl(c.id);
    if (!el) continue;
    el.style.left = c.start * pps + 'px'; el.style.width = c.dur * pps + 'px';
    const sp = $('.cl-t span', el); if (sp) sp.textContent = c.dur.toFixed(1) + 's';
  }
  for (const c of AN_L.over || []) {
    const el = $(`#trkV2 .clip[data-id="${CSS.escape(c.id)}"]:not(.ghost)`);
    if (!el) continue;
    el.style.left = c.start * pps + 'px'; el.style.width = c.dur * pps + 'px';
    const sp = $('.cl-t span', el); if (sp) sp.textContent = c.dur.toFixed(1) + 's';
  }
  const inner = $('#nleIn'); if (inner) inner.style.width = Math.max(AN_L.total * pps + 160, 600) + 'px';
}

/* ---------- edición ---------- */
const selClips = () => anAll(AN_L).filter(c => AN.selSet.has(c.id));
function playheadLocal() {
  const L = AN_L, c = L && clipAt(L, AN.T);
  if (!c) return null;
  const f = 1 / fpsOf(), lt = Math.round((AN.T - c.start) * fpsOf()) / fpsOf();
  return { c, lt, inside: lt >= f - 1e-6 && lt <= c.dur - f + 1e-6 };
}
function anSplit() {
  if (UI.readOnly) return;
  if (AN.playing) anPause();
  const L = AN_L, f = 1 / fpsOf();
  // un inserto elegido bajo el cabezal se divide él; si no, el clip de V1
  const ov = (L.over || []).find(o => AN.selSet.has(o.id) && AN.T >= o.start + f - 1e-6 && AN.T <= o.end - f + 1e-6);
  if (ov) { anSplitAt(ov, Math.round((AN.T - ov.start) * fpsOf()) / fpsOf()); return; }
  const h = playheadLocal();
  if (!h || !h.inside) { toast('Pon el cabezal dentro de un clip, lejos de sus bordes, para dividirlo.'); return; }
  anSplitAt(h.c, h.lt);
}
function anSplitAt(c, lt) {
  if (UI.readOnly) return;
  if (AN.playing) anPause();
  const L = AN_L;
  // los insertos que quedan sobre la segunda mitad pasan a ir encima de ella (en el mismo lugar del montaje)
  const kids = c.ov || c.card ? [] : (L.over || []).filter(o => o.base.id === c.id && (o.link.off || 0) >= lt - .05);
  let nid = null;
  anEdit('Dividir', c.sh ? [c.sh.id, ...kids.map(o => o.id)] : [], () => {
    const cfg = anCfg();
    cfg.order = L.order.slice();
    let made = [];
    if (c.card) { nid = uid('k'); cfg.cards[nid] = { ...clone(c.card), dur: (c.dur - lt).toFixed(3) }; c.card.dur = lt.toFixed(3); }
    else {
      const old = c.dur, copy = copyShotAfter(c.sh);
      shotWindow(c.sh, 0, lt, old); shotWindow(copy, lt, old, old);
      if (c.ov) ovNudge(copy, lt);
      for (const o of kids) { delete o.sh.v1; o.sh.ov = { id: copy.id, off: round2((o.link.off || 0) - lt) }; }
      nid = copy.id; made = [[copy.id, c.sh.id]];
    }
    cfg.order.splice(cfg.order.indexOf(c.id) + 1, 0, nid);
    AN.selSet = new Set([nid]); AN.sel = nid;
    return made;
  });
  if (c.sh && nid) toast(`Plano dividido: ahora son ${D.code[c.sh.id]} y ${D.code[nid]}.`);
}
function anTrimTo(side) {
  if (UI.readOnly) return;
  if (AN.playing) anPause();
  const h = playheadLocal();
  if (!h || !h.inside) { toast('Pon el cabezal dentro del clip que quieres recortar.'); return; }
  const { c, lt } = h;
  anEdit(side === 'q' ? 'Quitar el comienzo' : 'Quitar el final', c.sh ? [c.sh.id] : [], () => {
    const old = c.dur;
    if (c.card) c.card.dur = (side === 'q' ? old - lt : lt).toFixed(3);
    else if (side === 'q') shotWindow(c.sh, lt, old, old); else shotWindow(c.sh, 0, lt, old);
    AN.selSet = new Set([c.id]); AN.sel = c.id;
    AN.T = side === 'q' ? c.start : c.start + lt;
  });
}
function anDelete(gap) {
  if (UI.readOnly) return;
  const sel = selClips(), L = AN_L;
  if (!sel.length) { toast('Elige uno o más clips.'); return; }
  anEdit(gap ? 'Quitar y dejar negro' : 'Quitar', [], () => {
    const cfg = anCfg();
    cfg.order = L.order.slice();
    for (const c of sel) {
      if (c.ov) { cfg.off = [...new Set((cfg.off || []).concat(c.id))]; continue; }   // un inserto se quita sin dejar hueco
      if (gap) {
        const black = { kind: 'black', text: '', sub: '', dur: c.dur.toFixed(3), bg: 'black' };
        if (c.card) { cfg.cards[c.id] = black; continue; }
        const k = uid('k'); cfg.cards[k] = black;
        cfg.order.splice(cfg.order.indexOf(c.id), 0, k);
      }
      if (c.card) { delete cfg.cards[c.id]; delete cfg.trans[c.id]; cfg.order = cfg.order.filter(x => x !== c.id); }
      else cfg.off = [...new Set((cfg.off || []).concat(c.id))];
    }
    AN.selSet = new Set(); AN.sel = null;
  });
  const sh = sel.filter(c => c.sh).length;
  toast(gap ? 'Quitado: queda un negro en su lugar.' : sh ? `${sel.length === 1 ? 'Clip quitado' : sel.length + ' clips quitados'} del montaje. Los planos siguen en el storyboard («Fuera del montaje»).` : 'Quitado.');
}
function anDuplicate() {
  if (UI.readOnly) return;
  const sel = selClips(), L = AN_L;
  if (!sel.length) { toast('Elige uno o más clips.'); return; }
  anEdit(sel.length > 1 ? `Duplicar ${sel.length} clips` : 'Duplicar', [], () => {
    const cfg = anCfg(), made = [], fresh = [];
    cfg.order = L.order.slice();
    for (const c of sel) {
      let nid;
      if (c.card) { nid = uid('k'); cfg.cards[nid] = clone(c.card); }
      else if (c.ov) {
        // la copia de un inserto entra justo después de él (con su acción corrida)
        const copy = copyShotAfter(c.sh); nid = copy.id; made.push([nid, c.sh.id]);
        const b2 = L.clips.find(x => x.sh && x.id !== c.id && c.end >= x.start - 1e-6 && c.end < x.end - .05) || c.base;
        ovPlace(copy, b2.id, c.end - b2.start, c.dur);
      }
      else { const copy = copyShotAfter(c.sh); nid = copy.id; made.push([nid, c.sh.id]); }
      if (cfg.trans[c.id]) cfg.trans[nid] = { ...cfg.trans[c.id] };
      cfg.order.splice(cfg.order.indexOf(c.id) + 1, 0, nid);
      fresh.push(nid);
    }
    AN.selSet = new Set(fresh); AN.sel = fresh[fresh.length - 1];
    return made;
  });
}
function anInsertCard(kind) {
  if (UI.readOnly) return;
  if (AN.playing) anPause();
  const L = AN_L, c = clipAt(L, AN.T), k = uid('k');
  anEdit(kind === 'black' ? 'Insertar negro' : 'Insertar título', [], () => {
    const cfg = anCfg();
    cfg.order = L.order.slice();
    cfg.cards[k] = { kind, text: kind === 'title' ? (P.meta.title || 'Título') : '', sub: '', dur: kind === 'title' ? '3.000' : '1.000', bg: 'black' };
    let at = cfg.order.length;
    if (c) at = cfg.order.indexOf(c.id) + (AN.T - c.start >= c.dur / 2 ? 1 : 0);
    cfg.order.splice(at, 0, k);
    AN.selSet = new Set([k]); AN.sel = k;
  });
  const nc = AN_L && AN_L.clips.find(x => x.id === k);
  if (nc) seek(nc.start);
  if (kind === 'title') { const t = $('textarea[data-bind="an-ktext"]'); if (t) { t.focus(); t.select(); } }
}
/* Alt + ← →: mueve los clips elegidos un lugar */
function anShift(dir) {
  if (UI.readOnly) return;
  const L = AN_L, sel = AN.selSet;
  if (!sel.size) return;
  const vis = L.clips.map(c => c.id);
  if (dir < 0) { for (let i = 1; i < vis.length; i++) if (sel.has(vis[i]) && !sel.has(vis[i - 1])) [vis[i - 1], vis[i]] = [vis[i], vis[i - 1]]; }
  else { for (let i = vis.length - 2; i >= 0; i--) if (sel.has(vis[i]) && !sel.has(vis[i + 1])) [vis[i + 1], vis[i]] = [vis[i], vis[i + 1]]; }
  if (vis.every((id, i) => id === L.clips[i].id)) return;
  anEdit('Mover clip', [], () => { anCfg().order = visibleToFull(L, vis); });
}

/* ---------- reproducción (J K L: atrás, pausa, adelante; cada toque más dobla la velocidad) ---------- */
const rateTxt = () => (AN.rate < 0 ? '◀ ' : '') + Math.abs(AN.rate) + '×';
function paintRate() {
  const r = $('#anRate'); if (r) r.textContent = AN.playing && AN.rate !== 1 ? rateTxt() : '';
  const b = $('.an-play'); if (b) { b.textContent = AN.playing ? '❚❚' : '▶'; b.setAttribute('aria-label', AN.playing ? 'Pausar' : 'Reproducir'); }
}
function anPlay(rate = 1) {
  if (!AN_L || !AN_L.clips.length) return;
  AN.rate = rate;
  if (rate > 0 && AN.T >= AN_L.total - 1e-3) AN.T = 0;
  if (rate < 0 && AN.T <= 1e-3) AN.T = AN_L.total;
  paintRate();
  if (AN.playing) { syncAudio(); return; }
  AN.playing = true;
  paintRate();
  syncAudio();
  let last = performance.now();
  const step = now => {
    if (!AN.playing) return;
    AN.T += (now - last) / 1000 * AN.rate; last = now;
    if (AN.rate > 0 && AN.T >= AN_L.total) {
      if (AN.loop) { AN.T = 0; syncAudio(); }
      else { AN.T = AN_L.total; anPause(); drawMonitor(); return; }
    } else if (AN.rate < 0 && AN.T <= 0) {
      if (AN.loop) { AN.T = AN_L.total; }
      else { AN.T = 0; anPause(); drawMonitor(); return; }
    }
    if (UI.tab !== 'animatic') { anPause(); return; }
    seek(AN.T, true);
    AN.raf = requestAnimationFrame(step);
  };
  AN.raf = requestAnimationFrame(step);
}
function anPause() {
  const was = AN.playing;
  AN.playing = false; AN.rate = 1; cancelAnimationFrame(AN.raf);
  paintRate();
  if (AN.audio) AN.audio.pause();
  if (was && UI.tab === 'animatic') drawMonitor();     // el cuadro de la pausa, a tamaño completo
}
function anJKL(k) {
  if (k === 'k') { anPause(); return; }
  const dir = k === 'l' ? 1 : -1;
  if (AN.playing && Math.sign(AN.rate) === dir) anPlay(clamp(AN.rate * 2, -8, 8));
  else anPlay(dir);
}
function syncAudio() {
  const a = AN.audio, au = anCfg().audio;
  if (!a || !au) return;
  // hacia atrás o muy rápido, en silencio
  if (AN.playing && (AN.rate < 0 || AN.rate > 4)) { a.pause(); return; }
  const at = (AN_L ? fullT(AN_L, AN.T) : AN.T) - (au.offset || 0);
  if (at < 0 || at > (a.duration || 1e9)) { a.pause(); return; }
  if (Math.abs(a.currentTime - at) > .08 * Math.max(1, AN.rate)) a.currentTime = at;
  a.volume = au.vol ?? .9;
  try { a.playbackRate = AN.playing ? AN.rate : 1; } catch (e) { }
  if (AN.playing && a.paused) a.play().catch(() => { });
}

/* ---------- música ---------- */
function idb() {
  return new Promise((res, rej) => { try { const r = indexedDB.open('filmspirit', 1); r.onupgradeneeded = () => r.result.createObjectStore('audio'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } });
}
async function idbPut(k, v) { try { const db = await idb(); await new Promise((res, rej) => { const tx = db.transaction('audio', 'readwrite'); tx.objectStore('audio').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); return true; } catch (e) { return false; } }
async function idbGet(k) { try { const db = await idb(); return await new Promise((res, rej) => { const r = db.transaction('audio').objectStore('audio').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); } catch (e) { return null; } }
async function loadAudioBlob(blob, name, persist) {
  if (AN.audioUrl) URL.revokeObjectURL(AN.audioUrl);
  AN.audioUrl = URL.createObjectURL(blob);
  const a = new Audio(); a.src = AN.audioUrl; a.preload = 'auto';
  AN.audio = a; AN.src = null;
  const cfg = anCfg();
  const prev = cfg.audio && cfg.audio.name === name ? cfg.audio : null;
  let peaks = prev ? prev.peaks : '';
  if (!peaks) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      const buf = await ac.decodeAudioData(await blob.arrayBuffer());
      const ch = buf.getChannelData(0), n = Math.min(4000, Math.ceil(buf.duration * 20));
      const per = Math.floor(ch.length / n); const arr = [];
      for (let i = 0; i < n; i++) { let m = 0; for (let j = i * per; j < (i + 1) * per; j += 16) m = Math.max(m, Math.abs(ch[j])); arr.push(Math.round(m * 35).toString(36)); }
      peaks = arr.join(''); cfg._dur = buf.duration;
      ac.close();
    } catch (e) { peaks = ''; }
  }
  cfg.audio = { name, offset: prev ? prev.offset : 0, vol: prev ? prev.vol : .9, peaks, dur: cfg._dur || (prev && prev.dur) || 0 };
  delete cfg._dur;
  if (persist) {
    // si el navegador no la guarda, se escucha ahora pero hay que volver a elegirla al abrir otra vez
    if (!(await idbPut('p:' + P.id, blob))) problem('La música suena en esta sesión, pero el navegador no la pudo guardar: tendrás que elegirla otra vez al volver.');
    changed('data');
  }
}
async function restoreAudio() {
  const cfg = anCfg();
  if (!cfg.audio || AN.audio || AN._tried === P.id) return;
  AN._tried = P.id;
  const blob = await idbGet('p:' + P.id);
  if (blob) { await loadAudioBlob(blob, cfg.audio.name, false); if (UI.tab === 'animatic') render(); }
}
function drawWave() {
  const cv = $('#wave'), au = anCfg().audio;
  if (!cv || !au || !au.peaks) return;
  const dur = au.dur || au.peaks.length / 20;
  const w = Math.min(16000, Math.max(10, Math.round(dur * AN.pps)));
  const H = Math.max(20, Math.round((cv.parentElement ? cv.parentElement.clientHeight : 46) - 6));
  cv.width = w; cv.height = H; cv.style.width = dur * AN.pps + 'px';
  const g = cv.getContext('2d'), n = au.peaks.length;
  g.clearRect(0, 0, w, H);
  g.fillStyle = 'rgba(126,200,170,.85)';
  for (let x = 0; x < w; x++) {
    const v = parseInt(au.peaks[Math.floor(x / w * n)] || '0', 36) / 35;
    const h = Math.max(1, v * (H - 4));
    g.fillRect(x, H / 2 - h / 2, 1, h);
  }
}
function musicDialog() {
  const cfg = anCfg(), au = cfg.audio;
  const m = modal({
    title: 'Música del animatic',
    body: `${au ? `<div><b>${esc(au.name)}</b><div class="hint">${AN.audio ? 'Cargada' : 'Sin cargar en esta sesión'} · ${au.dur ? tc(au.dur, false) : ''}</div></div>` : ''}
      <button class="btn" id="muPick">${au ? 'Elegir otro archivo' : 'Elegir archivo de audio'}</button>
      ${au ? `<div class="grid2"><label class="fld"><span>Empieza en (s)</span><input type="number" step="0.1" id="muOff" value="${ea(au.offset || 0)}"></label>
      <label class="fld"><span>Volumen</span><input type="range" min="0" max="1" step="0.05" id="muVol" value="${ea(au.vol ?? .9)}"></label></div>` : ''}
      <p class="hint" style="margin:0">El audio se guarda solo en este navegador. En otro equipo verás la forma de onda y tendrás que volver a elegir el archivo para escucharlo.</p>`,
    foot: `${au ? '<div class="left"><button class="btn danger" id="muDel">Quitar música</button></div>' : ''}<button class="btn primary" id="muOk">Listo</button>`,
  });
  $('#muPick', m).onclick = () => {
    const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'audio/*';
    fi.onchange = async () => { const f = fi.files[0]; if (!f) return; closeModal(); toast('Leyendo «' + f.name + '»…'); await loadAudioBlob(f, f.name, true); render(); toast('Música lista.'); };
    fi.click();
  };
  $('#muOk', m).onclick = () => {
    const o = $('#muOff', m), v = $('#muVol', m);
    if (o && cfg.audio) { cfg.audio.offset = num(o.value); cfg.audio.vol = num(v.value); changed('data'); }
    closeModal(); render();
  };
  const del = $('#muDel', m);
  if (del) del.onclick = () => { cfg.audio = null; if (AN.audio) AN.audio.pause(); AN.audio = null; idbPut('p:' + P.id, null); changed('data'); closeModal(); render(); };
}

/* ---------- entrada y salida (I y O) ----------
   Marcan una parte de la línea de tiempo (segundos del montaje que se ve) para exportar solo esa parte. Se guardan en
   el proyecto (cfg.io = { a: entrada, b: salida }; puede haber una sola) y no son un paso de deshacer: deshacer una
   edición del montaje no las mueve. */
const anIO = () => anCfg().io || null;
/* la parte marcada, dentro del montaje: [entrada, salida], o null (sin marcas, o fuera del montaje) */
function anIoRange(io, total, fps) {
  if (!io || (io.a == null && io.b == null)) return null;
  const a = clamp(io.a ?? 0, 0, total), b = clamp(io.b ?? total, 0, total);
  return b - a >= 1 / fps - 1e-6 ? [a, b] : null;
}
/* marca la entrada (k = 'a') o la salida ('b') en T, en un cuadro; la otra se quita si queda del lado equivocado */
function anIoSet(io, k, T, fps) {
  const o = { ...(io || {}) };
  o[k] = +(Math.round(T * fps) / fps).toFixed(4);
  if (o.a != null && o.b != null && o.b - o.a < 1 / fps - 1e-6) delete o[k === 'a' ? 'b' : 'a'];
  return o;
}
/* lo que se graba: partes [desde, hasta] del montaje que se ve, una tras otra. Todo · de la entrada a la salida · los
   clips de una escena (con sus títulos; si el montaje la parte en pedazos, van seguidos) */
function anExportSegs(L, how, io, key) {
  if (how === 'io' && io) return [[io[0], io[1]]];
  if (how === 'sc') {
    const out = [];
    for (const c of L.clips) if (c.sc === key) { const l = out[out.length - 1]; if (l && Math.abs(l[1] - c.start) < 1e-6) l[1] = c.end; else out.push([c.start, c.end]); }
    if (out.length) return out;
  }
  return [[0, L.total]];
}
const segsDur = segs => segs.reduce((s, [a, b]) => s + b - a, 0);
/* del tiempo que lleva grabando (e) al tiempo del montaje */
function segAt(segs, e) {
  for (const [a, b] of segs) { if (e < b - a) return a + e; e -= b - a; }
  return segs.length ? segs[segs.length - 1][1] : 0;
}
/* la parte marcada sobre la línea de tiempo: sombreada, con la × que quita las marcas */
function anIoHTML(L, pps) {
  const io = anIO(), r = anIoRange(io, L.total, fpsOf()); if (!r) return '';
  const lab = `${io.a == null ? '' : tc(r[0]) + ' '}→${io.b == null ? '' : ' ' + tc(r[1])}`;   // con una sola marca, la flecha sola de su lado
  return `<div class="io-rng${ea(io.a == null ? ' no-a' : '')}${ea(io.b == null ? ' no-b' : '')}" id="ioRng" style="left:${ea(r[0] * pps)}px;width:${ea((r[1] - r[0]) * pps)}px"><button type="button" class="io-x" data-act="an-io-x" title="Quitar las marcas de entrada y salida (${esc(lab)})" aria-label="Quitar las marcas de entrada y salida">${ICO.close}</button></div>`;
}
function anPaintIO() {
  const old = $('#ioRng'); if (old) old.remove();
  const inner = $('#nleIn'); if (inner && AN_L) inner.insertAdjacentHTML('beforeend', anIoHTML(AN_L, AN.pps));
}
function anIoPut(io) {
  if (typeof histCapture === 'function') histCapture();   // lo que estaba pendiente queda en su propio paso
  const cfg = anCfg();
  if (io && (io.a != null || io.b != null)) cfg.io = io; else delete cfg.io;
  changed('data');
  if (typeof histQuiet === 'function') histQuiet('animatic');   // las marcas no son un paso de deshacer
  anPaintIO();
}
/* I y O (o los botones de la barra): la marca va al cabezal */
function anMark(k) {
  const L = AN_L; if (!L || !L.clips.length) return;
  const fps = fpsOf(), f = 1 / fps, T = Math.round(AN.T * fps) / fps, io = anIO() || {};
  if (k === 'a' && T > L.total - f + 1e-6) { toast('La entrada tiene que quedar antes del final del montaje.'); return; }
  if (k === 'b' && T < f - 1e-6) { toast('La salida tiene que quedar después del comienzo del montaje.'); return; }
  const nx = anIoSet(io, k, T, fps);
  anIoPut(nx);
  if (k === 'a' && io.b != null && nx.b == null) toast('La salida quedaba antes de la entrada: se quitó.');
  else if (k === 'b' && io.a != null && nx.a == null) toast('La entrada quedaba después de la salida: se quitó.');
}
/* Mayús + I y Mayús + O: el cabezal a la entrada o a la salida */
function anIoGo(k) {
  const L = AN_L, r = L && anIoRange(anIO(), L.total, fpsOf()); if (!r) return;
  if (AN.playing) anPause();
  seek(k === 'a' ? r[0] : r[1]);
}

/* ---------- exportar video ---------- */
async function exportVideo() {
  if (!proGate('video')) return;
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast('Este navegador no puede grabar video.'); return; }
  const L0 = anClips();
  if (!L0.clips.length) { toast('No hay planos en el montaje.'); return; }
  const what = await anExportAsk(L0); if (!what) return;
  // el video recorre su parte del montaje en tiempo real: sus imágenes se traen antes y no se sueltan mientras graba
  await ensureFrames('sb');
  return framesHold(() => exportVideo0(what));
}
/* qué parte se exporta: todo, de la entrada a la salida (si hay marcas, la de entrada) o una escena */
function anExportAsk(L) {
  return new Promise(res => {
    const fps = fpsOf(), io = anIoRange(anIO(), L.total, fps);
    const keys = [...new Set(L.clips.map(c => c.sc).filter(k => k && D.sc.byKey[k]))];
    const cur = (clipAt(L, AN.T) || {}).sc;
    const opt = (v, on, title, inner, dis) => `<label class="opt rg-opt"><input type="radio" name="vxw" value="${v}" ${on ? 'checked' : ''} ${dis ? 'disabled' : ''}><span><b>${title}</b>${inner || ''}</span></label>`;
    let done = false;
    const m = modal({
      title: 'Exportar video',
      body: `<div class="rg vx-what">
        ${opt('all', !io, 'Todo', `<span class="hint">Todo el montaje · ${tc(L.total, false)}</span>`)}
        ${opt('io', !!io, 'De la entrada a la salida', io ? `<span class="hint">${tc(io[0])} → ${tc(io[1])} · ${tc(io[1] - io[0])}</span>` : '<span class="hint">Marca la entrada (I) y la salida (O) en la línea de tiempo.</span>', !io)}
        ${keys.length ? opt('sc', false, 'Una escena', `<select class="vx-sc" aria-label="Escena">${keys.map(k => `<option value="${esc(k)}" ${k === cur ? 'selected' : ''}>Escena ${esc(k)} · ${esc(sceneOfKey(k).heading)} · ${tc(segsDur(anExportSegs(L, 'sc', null, k)), false)}</option>`).join('')}</select>`) : ''}
      </div>
      <p class="hint" style="margin:0">Se graba en tiempo real: tarda lo que dura la parte elegida.</p>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="vxGo">Exportar video</button>`,
      dirty: () => false, onClose: () => { if (!done) res(null); },
    });
    const sel = $('.vx-sc', m);
    // elegir una escena en la lista elige la opción «Una escena»
    if (sel) for (const ev of ['change', 'focus']) sel.addEventListener(ev, () => { $('input[name=vxw][value=sc]', m).checked = true; });
    $('#vxGo', m).onclick = () => {
      const how = ($('input[name=vxw]:checked', m) || {}).value || 'all';
      done = true; closeModal();
      res({ how, key: sel ? sel.value : null });
    };
  });
}
async function exportVideo0(what = {}) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast('Este navegador no puede grabar video.'); return; }
  const L = anClips();
  if (!L.clips.length) { toast('No hay planos en el montaje.'); return; }
  const io = anIoRange(anIO(), L.total, fpsOf()), how = what.how === 'io' && !io ? 'all' : what.how || 'all';
  const segs = anExportSegs(L, how, io, what.key), dur = segsDur(segs);
  const tcTag = t => tc(t, false).replace(':', 'm') + 's';
  const tag = how === 'io' ? `_${tcTag(segs[0][0])}-${tcTag(segs[0][1])}` : how === 'sc' && what.key ? '_escenas_' + String(what.key).replace(/[^\w-]/g, '') : '';   // como el PDF de unas escenas
  anPause();
  if (typeof FIG3D !== 'undefined') await FIG3D.ready(10000, fig3dBodiesOf(L.clips.filter(c => c.sh).map(c => c.sh)));   // que el video no empiece con maniquíes simples (solo los cuerpos que salen)
  const pw = peloTexReady(); if (pw) await pw;
  const ar = ASPECTS[P.meta.aspect] || 16 / 9;
  const W = ar >= 1 ? 1280 : Math.round(1280 * ar), H = ar >= 1 ? Math.round(1280 / ar) : 1280;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.style.cssText = 'position:fixed;left:-99999px;top:0';
  document.body.appendChild(cv);
  const stream = cv.captureStream(fpsOf());
  const cfg = anCfg();
  let dest = null;
  if (AN.audio && cfg.audio) {
    try {
      if (!AN.ac) AN.ac = new (window.AudioContext || window.webkitAudioContext)();
      if (!AN.src || AN.src.mediaElement !== AN.audio) { AN.src = AN.ac.createMediaElementSource(AN.audio); AN.src.connect(AN.ac.destination); }
      dest = AN.ac.createMediaStreamDestination(); AN.src.connect(dest);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      await AN.ac.resume();
    } catch (e) { dest = null; }
  }
  const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mime = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || 'video/webm';
  let rec;
  try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6e6 }); } catch (e) { cv.remove(); toast('No se pudo iniciar la grabación. Usa Chrome o Edge en una computadora y vuelve a intentarlo.'); return; }
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  let cancelled = false;
  const m = modal({ title: 'Exportando video', body: `<p style="margin:0">Se graba en tiempo real: <b id="vxT">00:00</b> de ${tc(dur, false)}.</p><div class="prog"><i id="vxP" style="width:0"></i></div><p class="hint" style="margin:0">Deja esta pestaña abierta hasta que termine.${L.locked.size ? ` Solo se exportan las escenas visibles (${L.locked.size} ${L.locked.size === 1 ? 'bloqueada' : 'bloqueadas'}).` : ''}</p>`, foot: `<button class="btn" id="vxC">Cancelar</button>`, onClose: () => { cancelled = true; }, keep: true, noEsc: true });
  $('#vxC', m).onclick = () => { cancelled = true; closeModal(); };
  const ctx = cv.getContext('2d');
  rec.start(500); AN.recording = true;   // mientras graba, las viñetas pendientes esperan
  const t0 = performance.now();
  if (AN.audio && cfg.audio) { AN.audio.currentTime = Math.max(0, fullT(L, segs[0][0]) - (cfg.audio.offset || 0)); }
  await new Promise(resolve => {
    const step = () => {
      const e = (performance.now() - t0) / 1000;   // lo grabado; T: el momento del montaje que le toca
      if (cancelled || e >= dur) { resolve(); return; }
      const T = segAt(segs, e);
      if (AN.audio && cfg.audio) {
        const at = fullT(L, T) - (cfg.audio.offset || 0);
        if (at >= 0 && at < (AN.audio.duration || 1e9)) {
          if (Math.abs(AN.audio.currentTime - at) > .15) AN.audio.currentTime = at;
          if (AN.audio.paused) AN.audio.play().catch(() => { });
        } else if (!AN.audio.paused) AN.audio.pause();
      }
      anDraw(ctx, W, H, T, L, { subs: cfg.subs, burn: cfg.burn, ahead: true });
      const pt = $('#vxT'), pp = $('#vxP');
      if (pt) pt.textContent = tc(e, false); if (pp) pp.style.width = (e / dur * 100) + '%';
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  anDraw(ctx, W, H, segs[segs.length - 1][1] - 1e-3, L, { subs: cfg.subs, burn: cfg.burn });
  await new Promise(r => { rec.onstop = r; rec.stop(); });
  AN.recording = false;
  if (AN.audio) AN.audio.pause();
  if (dest && AN.src) try { AN.src.disconnect(dest); } catch (e) { }
  stream.getTracks().forEach(t => t.stop());
  cv.remove();
  if (cancelled) { toast('Exportación cancelada.'); return; }
  closeModal();
  await offerFile(fileSafe(P.meta.title) + '_animatic' + tag + '.webm', new Blob(chunks, { type: 'video/webm' }));
}

/* ---------- acciones ---------- */
/* duración de un clip (plano: sus claves se quedan en su segundo; título o negro: su largo) */
function anSetDur(id, d) {
  const sh = P.shots[id], card = anCfg().cards[id];
  if (!sh && !card) return;
  anEdit('Cambiar la duración', sh ? [id] : [], () => {
    const v = snapF(Math.max(.04, d));
    if (card) { card.dur = v.toFixed(3); return; }
    sh.dur = v.toFixed(3);
  });
}
/* cuchilla: tocar un clip lo corta donde se tocó (C o el botón de las tijeras sin nada elegido) */
function setBlade(on) {
  AN.blade = on;
  const n = $('#nle'); if (n) n.classList.toggle('blade', on);
  const ln = $('#bladeLn'); if (ln && !on) ln.hidden = true;
  paintTools();
  if (on && !AN.bladeTip) { AN.bladeTip = true; toast('Cuchilla: toca un clip (en V1 o en V2) donde quieras cortarlo. C o Esc para salir.'); }
}
function bladeT(e) {
  const inner = $('#nleIn'); if (!inner) return 0;
  const f = fpsOf(), t = (e.clientX - inner.getBoundingClientRect().left) / AN.pps;
  return Math.max(0, Math.round(snapT(t, [AN.T]) * f) / f);   // pegado a los cuadros y, con el imán, al cabezal
}
Object.assign(ACT, {
  'an-play': () => AN.playing ? anPause() : anPlay(),
  'an-go': b => {
    const L = AN_L; if (!L) return;
    const g = b.dataset.g;
    if (g === 'start') seek(0); else if (g === 'end') seek(L.total);
    else { const cuts = L.clips.map(c => c.start).concat(L.total); seek(g === 'next' ? (cuts.find(x => x > AN.T + 1e-3) ?? L.total) : ([...cuts].reverse().find(x => x < AN.T - 1e-3) ?? 0)); }
  },
  'an-loop': b => { AN.loop = !AN.loop; b.setAttribute('aria-pressed', AN.loop); },
  'an-info': () => { AN.info = !AN.info; const i = $('#anInsp'); if (i) i.classList.toggle('sheet', AN.info); paintTools(); },
  'an-zoom': b => b.dataset.z === 'fit' ? fitZoom() : zoomTL(+b.dataset.z),
  'an-music': () => musicDialog(),
  'an-trks': b => anTrkMenu(b),
  'an-trk': b => {
    const k = b.dataset.trk, T = anTrk(), on = !anShown(AN_L || anClips())[k];
    T[k] = on; ls.set('anTracks', T);
    if (k === 't' && on && !anCfg().subs) { anCfg().subs = true; changed('data'); }
    if (k === 'v2' && !on && (AN_L || anClips()).over && (AN_L || anClips()).over.length) toast('La pista V2 tiene insertos: se sigue viendo mientras los tenga.');
    render();
  },
  'an-stats': b => { const S = AN.stats || {}; popover(b, `<div class="an-sts"><span><b class="tnum">${tc(S.total || 0, false)}</b> duración</span><span><b class="tnum">${S.n || 0}</b> clips</span><span title="Duración media de los clips"><b class="tnum">${(S.asl || 0).toFixed(1)} s</b> media</span><span><b class="tnum">${(S.med || 0).toFixed(1)} s</b> mediana</span><span><b class="tnum">${(S.cpm || 0).toFixed(1)}</b> cortes por minuto</span></div>`, p => p.classList.add('pop-an')); },
  'an-fill': () => { const cfg = anCfg(), L = anClips(); if (L.excluded.length) { histNote('Agregar los planos al montaje'); const ex = new Set(L.excluded.map(s => s.id)); cfg.off = (cfg.off || []).filter(id => !ex.has(id)); changed('data'); render(); } else setTab('board'); },
  'an-video': () => exportVideo(),
  'an-fold': () => anFold(!anMini()),
  'an-split': () => { if (AN.blade) setBlade(false); else if (selClips().length) anSplit(); else setBlade(true); },
  'an-v1': b => {
    const L = AN_L, c = ovOf(L, b.dataset.id); if (!c) return;
    anEdit('Bajar a V1', [c.id], () => {
      c.sh.v1 = true; delete c.sh.ov;
      const vis = L.clips.map(x => x.id), k = L.clips.findIndex(x => x.start >= c.start - 1e-6);
      vis.splice(k < 0 ? vis.length : k, 0, c.id);
      anCfg().order = visibleToFull(L, vis);
    });
  },
  'an-trim': b => anTrimTo(b.dataset.s),
  'an-io': b => anMark(b.dataset.s),
  'an-io-x': () => anIoPut(null),
  'an-del': b => anDelete(!!b.dataset.gap),
  'an-dup': () => anDuplicate(),
  'an-card': b => anInsertCard(b.dataset.k),
  'an-undo': () => anUndo(),
  'an-redo': () => anRedo(),
  'an-snap': b => { const on = !anSnapOn(); ls.set('anSnap', on); b.setAttribute('aria-pressed', on); toast(on ? 'Imán activado: los bordes y el cabezal se pegan a los cortes.' : 'Imán desactivado.'); },
  'an-nudge': b => { const id = b.dataset.id, c = anAll(AN_L).find(c => c.id === id); if (c) anSetDur(id, c.dur + num(b.dataset.d)); },
  'an-reset': b => { const sh = P.shots[b.dataset.id]; if (!sh) return; anEdit('Duración estimada', [sh.id], () => { sh.dur = ''; }); },
  'an-kkind': b => { const c = AN_L && AN_L.clips.find(c => c.id === AN.sel && c.card); if (!c || c.card.kind === b.dataset.k) return; anEdit(b.dataset.k === 'black' ? 'Cambiar a negro' : 'Cambiar a título', [], () => { c.card.kind = b.dataset.k; if (b.dataset.k === 'title' && !c.card.text) c.card.text = P.meta.title || 'Título'; }); },
  'an-lock': b => {
    const cfg = anCfg(), k = b.dataset.k;
    const set = new Set(cfg.locked || []);
    set.has(k) ? set.delete(k) : set.add(k);
    if (set.size && D.sc.scenes.every(s => set.has(s.key) || !(D.shotsBy[s.key] || []).length)) { toast('Deja al menos una escena visible.'); return; }
    cfg.locked = [...set];
    if (AN.sel && P.shots[AN.sel] && set.has(P.shots[AN.sel].sc)) AN.sel = null;
    anPause(); AN.T = 0; changed('data'); render();
  },
  'an-unlock': () => { anCfg().locked = []; anPause(); AN.T = 0; changed('data'); render(); },
  'an-in': b => anEdit('Volver al montaje', [], () => { const cfg = anCfg(); cfg.off = (cfg.off || []).filter(x => x !== b.dataset.id); }),
});
Object.assign(BIND, {
  'an-solo': el => {
    if (!el.value) return;
    const cfg = anCfg();
    cfg.locked = D.sc.scenes.map(s => s.key).filter(k => k !== el.value);
    AN.sel = null; anPause(); AN.T = 0; changed('data'); render();
    toast(`Solo la escena ${el.value}: las demás quedan bloqueadas.`);
  },
  'an-zw': (el, ev) => {
    const S = $('#nleS'); if (!S) return;
    const r = S.getBoundingClientRect();
    const ph = AN.T * AN.pps - S.scrollLeft;
    const ax = ph >= 0 && ph <= r.width ? r.left + ph : undefined;   // el cabezal queda quieto si se ve
    cancelAnimationFrame(AN._zr); const v = +el.value;
    AN._zr = requestAnimationFrame(() => zoomTL(vToPps(v) / AN.pps, ax));
  },
  'an-zh': (el, ev) => setTh(+el.value, ev === 'change'),
  'an-fps': el => { anCfg().fps = +el.value; changed('data'); render(); },
  'an-subs': el => { anCfg().subs = el.checked; changed('data'); render(); },
  'an-burn': el => { anCfg().burn = el.checked; changed('data'); drawMonitor(); },
  'an-dur': (el, ev) => { if (ev !== 'change') return; anSetDur(el.dataset.id, num(el.value)); },
  'an-tr': el => {
    if (!el.value) return;
    const ids = el.dataset.id ? [el.dataset.id] : selClips().map(c => c.id);
    anEdit('Cambiar la transición', [], () => { const cfg = anCfg(); for (const id of ids) { const cur = cfg.trans[id] || { f: 12 }; cfg.trans[id] = { ...cur, type: el.value }; } });
  },
  'an-trf': (el, ev) => { if (ev !== 'change') return; const id = el.dataset.id; anEdit('Cuadros de la transición', [], () => { const cfg = anCfg(); const cur = cfg.trans[id] || { type: 'cut' }; cfg.trans[id] = { ...cur, f: clamp(Math.round(num(el.value)), 2, 96) }; }); },
  'an-desc': el => { const sh = P.shots[el.dataset.id]; if (sh) { sh.desc = el.value; changed('data'); } },
  // texto del título: se ve al escribir; deshacer lo toma como un solo paso
  'an-ktext': (el, ev) => {
    const card = anCfg().cards[el.dataset.id]; if (!card) return;
    if (!AN._kb) AN._kb = anBegin();
    card[el.dataset.f] = el.value;
    changed('data'); drawMonitor();
    const kt = $(`#trkV .clip[data-id="${CSS.escape(el.dataset.id)}"] .kt`); if (kt && el.dataset.f === 'text') kt.textContent = el.value;
    if (ev === 'change') { anCommit(AN._kb, 'Texto del título'); AN._kb = null; paintTools(); }
  },
  'an-kbg': el => { const card = anCfg().cards[el.dataset.id]; if (card) anEdit('Fondo del título', [], () => { card.bg = el.value; }); },
});
addEventListener('keydown', e => {
  const ae = document.activeElement || {};
  if (UI.tab !== 'animatic' || $('#modal') || $('#s2Modal') || /INPUT|TEXTAREA|SELECT/.test(ae.tagName || '') || ae.isContentEditable) return;
  if (document.body.classList.contains('an-dragging') || document.body.classList.contains('an-trimming') || !AN_L) return;
  const f = 1 / fpsOf(), k = e.key, lk = k.length === 1 ? k.toLowerCase() : k, mod = e.ctrlKey || e.metaKey;
  if (mod) {
    if (lk === 'z') { e.preventDefault(); e.shiftKey ? anRedo() : anUndo(); }
    else if (lk === 'y') { e.preventDefault(); anRedo(); }
    else if (lk === 'd') { e.preventDefault(); anDuplicate(); }
    else if (lk === 'b') { e.preventDefault(); anSplit(); }   // (Ctrl + K es «Ir a…» en todo el programa)
    else if (lk === 'a') { e.preventDefault(); AN.selSet = new Set(AN_L.clips.map(c => c.id)); AN.sel = AN_L.clips.length ? AN_L.clips[AN_L.clips.length - 1].id : null; anPaintSel(); }
    return;
  }
  if (e.altKey && k !== 'ArrowLeft' && k !== 'ArrowRight') return;
  // las letras de atajo no deben escribirse en el campo que se abre (p. ej. el texto del título)
  if ('jklsqwtbnzcio'.includes(lk) && lk.length === 1) e.preventDefault();
  if (k === ' ') { e.preventDefault(); AN.playing ? anPause() : anPlay(); }
  else if (lk === 'j' || lk === 'k' || lk === 'l') anJKL(lk);
  else if (k === 'ArrowRight' || k === 'ArrowLeft') {
    e.preventDefault();
    const d = k === 'ArrowRight' ? 1 : -1;
    if (e.altKey) anShift(d); else { if (AN.playing) anPause(); seek(AN.T + d * (e.shiftKey ? 1 : f)); }
  }
  else if (k === 'ArrowDown') { e.preventDefault(); ACT['an-go']({ dataset: { g: 'next' } }); }
  else if (k === 'ArrowUp') { e.preventDefault(); ACT['an-go']({ dataset: { g: 'prev' } }); }
  else if (k === 'Home') seek(0); else if (k === 'End') seek(AN_L.total);
  else if (k === '+' || k === '=') zoomTL(1.25); else if (k === '-') zoomTL(.8);
  else if (lk === 'z' && e.shiftKey) fitZoom();
  else if (lk === 'i' || lk === 'o') e.shiftKey ? anIoGo(lk === 'i' ? 'a' : 'b') : anMark(lk === 'i' ? 'a' : 'b');
  else if (UI.readOnly) return;
  else if (lk === 's') anSplit();
  else if (lk === 'q' || lk === 'w') anTrimTo(lk);
  else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); anDelete(e.shiftKey); }
  else if (lk === 't') anInsertCard('title');
  else if (lk === 'b') anInsertCard('black');
  else if (lk === 'n') { const b = $('[data-act="an-snap"]'); ACT['an-snap'](b || document.createElement('i')); }
  else if (lk === 'c') setBlade(!AN.blade);
  else if (k === 'Escape' && AN.blade) setBlade(false);
  else if (k === 'Escape' && AN.selSet.size) { AN.selSet = new Set(); AN.sel = null; anPaintSel(); }
});

/* ---------- ajustes, ayuda y exportar ---------- */
SETTINGS.animatic = () => {
  const cfg = anCfg();
  return `<label class="fld"><span>Cuadros por segundo</span><select data-bind="an-fps">${[24, 25, 30].map(f => `<option ${f === cfg.fps ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
    <label class="opt-in"><input type="checkbox" data-bind="an-subs" ${cfg.subs ? 'checked' : ''}> Mostrar los diálogos</label>
    <label class="opt-in"><input type="checkbox" data-bind="an-burn" ${cfg.burn ? 'checked' : ''}> Datos en pantalla (plano, escena, tiempo)</label>`;
};
HELP.animatic = [
  ['Clips', 'Toca un clip para elegirlo; Mayús + clic elige un tramo y Ctrl + clic uno por uno. Arrastrar enseguida dibuja un recuadro que elige varios. Mantén presionado un clip (o los elegidos) para moverlo: los demás le hacen espacio y el orden cambia al soltar. Doble clic abre el plano.'],
  ['Recortar', 'El borde derecho de un clip cambia su duración: acortarlo corta el final del plano y alargarlo deja quieta su última pose (las claves no se mueven de su segundo). El borde izquierdo quita el comienzo. Con el imán (N), los bordes y el cabezal se pegan a los cortes.'],
  ['Insertos (V2)', 'Un plano que copió la acción de otro va en V2, encima, sin cortarlo. Se elige, recorta, divide, duplica y quita como en V1. Arrástralo por V2 para cambiar dónde entra (su acción copiada se corre con él) o hasta V1 para que corte el montaje; un clip de V1 llevado hasta V2 pasa a ser un inserto.'],
  ['Cuchilla', 'C (o las tijeras sin nada elegido) activa la cuchilla: una línea muestra el cuadro exacto y un toque sobre un clip, en V1 o en V2, lo corta ahí. C o Esc para salir.'],
  ['Editar', 'S divide el clip en el cabezal: el plano se parte en dos planos del storyboard. Q quita el comienzo hasta el cabezal y W el final desde el cabezal. Supr quita lo elegido y cierra el hueco; Mayús + Supr deja un negro. Ctrl + D duplica. T inserta un título y B un negro. Ctrl + Z deshace y Ctrl + Mayús + Z rehace.'],
  ['Teclado', 'Espacio reproduce · J K L: atrás, pausa y adelante (otro toque dobla la velocidad) · ← → un cuadro · Mayús + ← → un segundo · Alt + ← → mueve el clip elegido · ↑ ↓ saltan de corte · + y − acercan · Mayús + Z ajusta.'],
  ['Entrada y salida', 'I marca la entrada y O la salida en el cabezal (o los botones con llaves { } de la barra): la parte elegida se ve sombreada y su × quita las marcas. Mayús + I y Mayús + O llevan el cabezal a cada una. Al exportar el video eliges todo, de la entrada a la salida o una escena.'],
  ['Escenas', 'Toca el número de una escena, en la fila «Escenas», para bloquearla: queda oculta y no se reproduce ni se exporta. «Aislar una escena» deja solo esa.'],
  ['Música', '«Añadir música» pone una pista para medir el ritmo. Se guarda solo en este equipo.'],
];
EXPORTS.animatic = () => [{ label: 'Video (WebM)', hint: 'Se graba en tiempo real, con música, títulos y diálogos', run: () => exportVideo(), pro: 'video' }, pdfItem('Animatic en viñetas (PDF)', 'animatic', 'Cada clip con su tiempo y su diálogo')];
