/* ============================================================
   ESCALA DEL ESCENARIO · lote W (obs. 11)
   P.sets3d[id].esc (escenarios 3D importados) y P.plans[id].esc (planos de planta) agrandan o achican el escenario
   alrededor del centro de la escena; los escenarios hechos por código que se pueden escalar (los exteriores y la calle)
   guardan la suya por locación del guion en P.envEsc['<locación>|<escenario>']. Sin esc: tamaño original (1).
   (lote AD) El constructor de escenarios se quitó: un proyecto que traiga escenarios construidos (P.sets3d con
   kind: 'c') los pierde al abrirse (set3dNormalize) y sus planos vuelven al escenario de su locación.
   ============================================================ */
const ESC_MIN = .25, ESC_MAX = 4;
const escClamp = v => { v = +v; return isFinite(v) && v > 0 ? Math.min(ESC_MAX, Math.max(ESC_MIN, Math.round(v * 100) / 100)) : 1; };
/* la escala de un escenario de P.sets3d o de un plano de planta de P.plans (1: tamaño original) */
const escOf = x => x && x.esc != null ? escClamp(x.esc) : 1;
/* los hechos por código que se escalan: la calle, los jardines y los paisajes. La habitación ya tiene su ancho, fondo y
   alto (sus muebles van contra los muros): esa es su escala. El interior de vehículo y el mar abierto (el bote) tienen su
   tamaño real (las figuras van en sus asientos), el exterior abierto es un piso con su cuadrícula de 1 m y el estudio,
   vacío: esos no */
const ENV_ESC_SETS = ['calle', 'parque', 'bosque', 'montana', 'playa', 'desierto', 'canaveral', 'jardin_d', 'jardin_t'];
/* la locación (del guion) de una escena 3D: la de su plano. Las escenas que no son de un plano guardado (la del editor,
   las de la planta general) se anotan con escLocSet */
const ESC_LOC = new WeakMap();
const escLocSet = (s3, loc) => { if (s3 && typeof s3 === 'object') ESC_LOC.set(s3, loc || ''); return s3; };
function escLocOf(s3) {
  if (!s3 || typeof P === 'undefined' || !P) return '';
  if (typeof EDT !== 'undefined' && EDT && EDT.s3 === s3 && EDT.s) return EDT.s.loc || '';
  const c = ESC_LOC.get(s3), rev = typeof S3REV !== 'undefined' ? S3REV : 0;
  if (c != null && (typeof c === 'string' || c.rev === rev)) return typeof c === 'string' ? c : '';
  // la de un plano guardado, la de su escena armada sola o la vista por su cámara B
  for (const sh of Object.values(P.shots || {})) {
    if (!sh || !(sh.s3 === s3 || (typeof S3D_C !== 'undefined' && (S3D_C.get(sh) || {}).s3 === s3) || (typeof SHB !== 'undefined' && ((SHB.get(sh) || {}).v || {}).s3 === s3))) continue;
    const s = typeof sceneOfKey === 'function' ? sceneOfKey(sh.sc) : null, l = s ? s.loc || '' : '';
    ESC_LOC.set(s3, l); return l;
  }
  ESC_LOC.set(s3, { rev });   // no es de un plano (todavía): se vuelve a buscar con el próximo cambio
  return '';
}
const envEscKey = (loc, set) => String(loc || '') + '|' + set;
/* la escala del escenario hecho por código de una escena (1 si no se escala) */
function envEscOf(s3) {
  if (!s3 || !ENV_ESC_SETS.includes(s3.set) || typeof P === 'undefined' || !P || !P.envEsc) return 1;
  const v = P.envEsc[envEscKey(escLocOf(s3), s3.set)];
  return v ? escClamp(v) : 1;
}
/* la escala del escenario de una escena, sea cual sea (para la planta, la vista 3D y las viñetas) */
function sceneEsc(s3) {
  if (!s3) return 1;
  if (s3.set === 'modelo') return escOf(typeof set3dOf === 'function' ? set3dOf(s3) : null);
  if (s3.set === 'plano') return escOf(typeof planOf === 'function' ? planOf(s3) : null);
  return envEscOf(s3);
}

/* al abrir el proyecto y lo que llega del equipo: la escala de cada escenario y la de los hechos por código; los
   escenarios construidos (del constructor que ya no existe) se descartan y sus planos vuelven al escenario que dice su
   locación (interior: la habitación; exterior: la calle, un paisaje o el exterior abierto, como al armarse solos), con
   las figuras, la cámara y las luces donde estaban. Por último, los modelos puestos sobre un entorno (escenarios-sobre.js) */
function set3dNormalize(Px) {
  if (!Px || typeof Px !== 'object') return Px;
  const gone = new Set();
  if (Px.sets3d && typeof Px.sets3d === 'object') for (const [id, d] of Object.entries(Px.sets3d)) {
    if (!d || typeof d !== 'object' || d.kind === 'c') { if (d && d.kind === 'c') gone.add(id); delete Px.sets3d[id]; continue; }
    if (d.esc != null) { d.esc = escClamp(d.esc); if (d.esc === 1) delete d.esc; }
  }
  if (gone.size) {
    let byKey = null;
    for (const sh of Object.values(Px.shots || {})) {
      const s3 = sh && sh.s3; if (!s3 || typeof s3 !== 'object') continue;
      // las luces que trajo el escenario construido quedan como luces del plano
      if (Array.isArray(s3.objs)) for (const o of s3.objs) if (o && o.bs != null) delete o.bs;
      if (s3.set !== 'modelo' || !gone.has(s3.set3d)) continue;
      if (!byKey) byKey = typeof computeScenes === 'function' && Array.isArray(Px.paras) ? computeScenes(Px.paras).byKey : {};
      const sc = byKey[sh.sc], e = typeof envFromScene === 'function' && sc ? envFromScene(sc).set : '';
      s3.set = e || (sc && sc.ie === 'EXT' ? 'ext' : 'int'); delete s3.set3d;
    }
    if (Px.locSet3d && typeof Px.locSet3d === 'object') for (const [l, v] of Object.entries(Px.locSet3d)) if (gone.has(v)) delete Px.locSet3d[l];
  }
  if (Px.plans && typeof Px.plans === 'object') for (const pl of Object.values(Px.plans)) if (pl && typeof pl === 'object' && pl.esc != null) { pl.esc = escClamp(pl.esc); if (pl.esc === 1) delete pl.esc; }
  if (Px.envEsc != null) {
    const o = {};
    if (typeof Px.envEsc === 'object' && !Array.isArray(Px.envEsc)) for (const [k, v] of Object.entries(Px.envEsc)) { const m = /\|(\w+)$/.exec(k); if (m && ENV_ESC_SETS.includes(m[1]) && k.length <= 160 && escClamp(v) !== 1) o[k] = escClamp(v); }
    if (Object.keys(o).length) Px.envEsc = o; else delete Px.envEsc;
  }
  if (typeof sobreNormalize === 'function') sobreNormalize(Px);
  return Px;
}

if (typeof module !== 'undefined') module.exports = { set3dNormalize, escClamp, escOf, envEscOf, sceneEsc, escLocSet, ENV_ESC_SETS };
