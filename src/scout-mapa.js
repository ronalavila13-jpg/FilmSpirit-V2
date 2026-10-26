/* ============================================================
   SCOUTING · MAPA GENERAL (lote W) — todas las candidatas de todos los lugares en un mapa
   En la barra de Scouting, «Por lugar | Mapa general». A la izquierda, los lugares con sus candidatas; a la derecha,
   el mapa (Leaflet con las teselas de OpenStreetMap, con su atribución). Las coordenadas salen del enlace del mapa de
   cada candidata (mapa-enlace.js) o se ponen a mano («Ubicar en el mapa»; el pin se arrastra para corregir).
   Leaflet se carga solo al abrir el mapa: en la web publicada desde jsdelivr; en el servidor y en el escritorio desde
   app/lib (lo copian server/make.js y desktop/make.js desde tools/leaflet).
   ============================================================ */
const LEAFLET_V = '1.9.4';
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
let LEAFLET_P = null;
function loadLeaflet() {
  if (window.L && window.L.map) return Promise.resolve(true);
  if (LEAFLET_P) return LEAFLET_P;
  const local = DESK || typeof LOCAL_LIBS !== 'undefined';
  const base = local ? 'lib/' : `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_V}/dist/`;
  // (el CDN con su huella: si el archivo cambiara, el navegador no lo usa)
  const SRI = { 'leaflet.js': 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=', 'leaflet.css': 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=' };
  const add = (tag, f) => new Promise((res, rej) => {
    const el = document.createElement(tag);
    if (tag === 'link') { el.rel = 'stylesheet'; el.href = base + f; } else el.src = base + f;
    if (!local) { el.integrity = SRI[f]; el.crossOrigin = 'anonymous'; }
    el.onload = res; el.onerror = () => { el.remove(); rej(new Error(f)); };
    document.head.appendChild(el);
  });
  return (LEAFLET_P = Promise.all([add('link', 'leaflet.css'), add('script', 'leaflet.js')]).then(() => !!(window.L && window.L.map))
    .catch(e => { console.warn('Mapa:', e); LEAFLET_P = null; return false; }));
}

/* ---------- datos: los lugares con sus candidatas, en el orden de la ficha ---------- */
const SM_ORDER = { visitar: 3, visitada: 2, aprobada: 1, descartada: 4 };
/* el estado que pinta el pin: elegida manda sobre los demás */
const smState = (pl, c) => pl.pick === c.id ? 'pick' : c.status;
const SM_LABEL = { pick: 'Elegida', aprobada: 'Aprobada', visitada: 'Visitada', visitar: 'Por visitar', descartada: 'Descartada' };
function smGroups() {
  return scoutPlaces().map(p => {
    const d = scPlaceData(p.b);
    const cands = [...d.cands].sort((a, b) => (b.id === d.pick) - (a.id === d.pick) || (SM_ORDER[a.status] || 9) - (SM_ORDER[b.status] || 9));
    return { ...p, d, cands };
  }).filter(g => g.cands.length);
}
/* las jornadas en que se rueda en ese lugar (solo si es la elegida): «1 · lun 2 nov» */
function smDays(b) {
  if (!P.schedule || !P.schedule.items) return '';
  const { days } = scheduleDays(P, D.sc), dates = shootDates(P, days.length), out = [];
  days.forEach((d, i) => { if (d.keys.some(k => { const s = D.sc.byKey[k]; return s && (s.locBase || s.loc) === b; })) out.push(i); });
  if (!out.length) return '';
  const f = i => dates[i] ? `${i + 1} · ${dates[i].toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')}` : String(i + 1);
  return out.length > 3 ? `${out.slice(0, 3).map(i => i + 1).join(', ')} y ${out.length - 3} más` : out.map(f).join(', ');
}

/* ---------- pines: la forma y el color dicen el estado (también sin color) ---------- */
const SM_PIN = 'M0 0C-4 -6 -13 -15 -13 -25A13 13 0 1 1 13 -25C13 -15 4 -6 0 0Z';
function smPinSVG(st, o = {}) {
  const w = o.w || 26, h = Math.round(w * 44 / 30);
  const glyph = {
    pick: '<path class="g" d="M-5.5 -25.5 -1.5 -21.5 6 -29" fill="none" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
    aprobada: '<circle class="g" cx="0" cy="-25" r="5"/>',
    visitada: '<circle class="g" cx="0" cy="-25" r="4.5"/>',
    visitar: '<circle class="g" cx="0" cy="-25" r="4"/>',
    descartada: '<path class="g" d="M-4.5 -29.5 4.5 -20.5M4.5 -29.5 -4.5 -20.5" stroke-width="3" stroke-linecap="round"/>',
  }[st] || '';
  return `<svg class="sm-pin st-${ea(st)}" viewBox="-15 -42 30 44" width="${w}" height="${h}" aria-hidden="true"><path class="b" d="${SM_PIN}"/>${glyph}</svg>`;
}
