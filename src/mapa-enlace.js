/* ============================================================
   UBICACIÓN DE LAS CANDIDATAS (lote W) · las coordenadas que trae el enlace del mapa de cada candidata del scouting
   (Google Maps sobre todo) y de dónde salen. Sin pantalla: lo usa el mapa general (scout-mapa.js) y lo prueba
   test/mapa-enlace.test.js.
   En la candidata: lat, lng (grados, 6 decimales), geo ('link': salió del enlace; 'hand': se ubicó a mano en el mapa)
   y gmap (el enlace que había cuando se guardaron). Si el enlace cambia, manda el nuevo cuando trae el lugar; si no lo
   trae, queda la ubicación puesta a mano (la que salió del enlace anterior se quita).
   ============================================================ */
const GEO_NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';
/* enlaces cortos de Google Maps: no traen las coordenadas (las resuelve el servidor) */
const MAP_SHORT = /^(?:https?:\/\/)?(?:maps\.app\.goo\.gl\/[\w-]+|goo\.gl\/maps\/[\w-]+)/i;
const mapIsShort = u => MAP_SHORT.test(String(u || '').trim());
const geoOk = (lat, lng) => typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
const geoRound = v => Math.round(v * 1e6) / 1e6;
function geoPair(a, b) {
  const lat = parseFloat(a), lng = parseFloat(b);
  return geoOk(lat, lng) ? { lat: geoRound(lat), lng: geoRound(lng) } : null;
}
/* las coordenadas de un enlace (o de «lat, lng» escrito a mano); null si no las trae.
   Formatos: !3dLAT!4dLNG (el lugar marcado: manda sobre la vista), ?q= / query= / ll= / destination= / daddr= /
   center=, /place/LAT,LNG, /search/LAT,LNG, /dir/…/LAT,LNG, @LAT,LNG,zoom (la vista del mapa) y #map=z/LAT/LNG
   (OpenStreetMap) */
function mapLatLng(u) {
  let s = String(u || '').trim();
  if (!s || s.length > 4000) return null;
  try { s = decodeURIComponent(s.replace(/\+/g, ' ')); } catch (e) { s = s.replace(/\+/g, ' '); }
  let m = new RegExp('^' + GEO_NUM + '\\s*,\\s*' + GEO_NUM + '$').exec(s);
  if (m) return geoPair(m[1], m[2]);
  m = new RegExp('!3d' + GEO_NUM + '!4d' + GEO_NUM).exec(s);
  if (m) return geoPair(m[1], m[2]);
  m = new RegExp('[?&](?:q|query|ll|sll|destination|daddr|center)=(?:loc:)?\\s*' + GEO_NUM + '\\s*,\\s*' + GEO_NUM + '(?![\\d.])').exec(s);
  if (m) return geoPair(m[1], m[2]);
  m = new RegExp('/(?:place|search|dir(?:/[^/@?]*)*)/\\s*' + GEO_NUM + '\\s*,\\s*' + GEO_NUM + '(?![\\d.])').exec(s);
  if (m) return geoPair(m[1], m[2]);
  m = new RegExp('@' + GEO_NUM + ',' + GEO_NUM + '(?![\\d.])').exec(s);
  if (m) return geoPair(m[1], m[2]);
  m = new RegExp('#map=\\d{1,2}/' + GEO_NUM + '/' + GEO_NUM).exec(s);
  if (m) return geoPair(m[1], m[2]);
  return null;
}
/* enlaces cortos ya resueltos por el servidor en esta sesión: enlace → { lat, lng } o null (no trae el lugar) */
const MAP_RES = new Map();
/* dónde está la candidata ahora: { lat, lng, src } o null */
function candGeo(c) {
  if (!c) return null;
  const has = geoOk(c.lat, c.lng), same = (c.gmap || '') === (c.map || '');
  if (has && same) return { lat: c.lat, lng: c.lng, src: c.geo === 'hand' ? 'hand' : 'link' };
  const p = mapLatLng(c.map) || MAP_RES.get(String(c.map || '').trim()) || null;
  if (p) return { lat: p.lat, lng: p.lng, src: 'link' };
  if (has && c.geo === 'hand') return { lat: c.lat, lng: c.lng, src: 'hand' };   // el enlace nuevo no trae el lugar
  return null;
}
/* deja guardado en la candidata lo que dice candGeo; true si cambió algo */
function candGeoStore(c) {
  const before = JSON.stringify([c.lat, c.lng, c.geo, c.gmap]);
  const g = candGeo(c);
  if (g) { c.lat = g.lat; c.lng = g.lng; c.geo = g.src; c.gmap = c.map || ''; }
  else { delete c.lat; delete c.lng; delete c.geo; delete c.gmap; }
  return JSON.stringify([c.lat, c.lng, c.geo, c.gmap]) !== before;
}
/* ubicada a mano (tocando el mapa o arrastrando su pin) */
function candGeoHand(c, lat, lng) {
  const p = geoPair(lat, lng); if (!p) return false;
  c.lat = p.lat; c.lng = p.lng; c.geo = 'hand'; c.gmap = c.map || '';
  return true;
}
/* por qué no está en el mapa: 'none' (sin enlace), 'short' (enlace corto sin resolver), 'nolink' (el enlace no trae
   el lugar); null si está ubicada */
function candGeoWhy(c) {
  if (candGeo(c)) return null;
  const u = String(c.map || '').trim();
  if (!u) return 'none';
  return mapIsShort(u) && !MAP_RES.has(u) ? 'short' : 'nolink';
}
/* al abrir un proyecto: solo coordenadas válidas y su origen */
function candGeoClean(c) {
  if (!c || typeof c !== 'object') return c;
  if (!geoOk(c.lat, c.lng)) { delete c.lat; delete c.lng; delete c.geo; delete c.gmap; return c; }
  c.lat = geoRound(c.lat); c.lng = geoRound(c.lng);
  if (c.geo !== 'hand') c.geo = 'link';
  c.gmap = typeof c.gmap === 'string' ? c.gmap.slice(0, 4000) : '';
  return c;
}
