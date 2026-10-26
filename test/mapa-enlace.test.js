/* Lote W · mapa general del scouting: las coordenadas que trae el enlace del mapa de cada candidata (Google Maps en sus
   distintas formas), los enlaces cortos, y qué manda cuando la candidata se ubicó a mano.  node test/mapa-enlace.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const J = x => JSON.parse(JSON.stringify(x));

const c = { console, Math, JSON, Map, Set, Number, String, Object, Array, isFinite, parseFloat, decodeURIComponent, RegExp };
vm.createContext(c);
vm.runInContext(fs.readFileSync(R + '/src/mapa-enlace.js', 'utf8'), c);
vm.runInContext('Object.assign(globalThis, { mapLatLng, mapIsShort, candGeo, candGeoStore, candGeoHand, candGeoWhy, candGeoClean, MAP_RES })', c);
const ll = u => J(c.mapLatLng(u));

test('«@lat,lng,zoom» (la vista del mapa, también en /place/…/@)', () => {
  assert.deepStrictEqual(ll('https://www.google.com/maps/place/Plaza+de+Armas/@-8.1116,-79.0287,17z'), { lat: -8.1116, lng: -79.0287 });
  assert.deepStrictEqual(ll('https://www.google.com/maps/@-8.1091,-79.0215,15z?entry=ttu'), { lat: -8.1091, lng: -79.0215 });
  assert.deepStrictEqual(ll('google.com/maps/@-8.1,-79.03,3a,75y,90t/data=!3m6'), { lat: -8.1, lng: -79.03 });
});
test('«!3dLAT!4dLNG» (el lugar marcado) manda sobre la vista', () => {
  const u = 'https://www.google.com/maps/place/Cine+Primavera/@-8.1100,-79.0300,17z/data=!3m1!4b1!4m6!3m5!1s0x91ad3d!8m2!3d-8.1123456!4d-79.0298765!16s%2Fg%2F11';
  assert.deepStrictEqual(ll(u), { lat: -8.112346, lng: -79.029876 }, 'con 6 decimales');
});
test('«?q=», «query=», «ll=», «destination=» (codificados o no)', () => {
  assert.deepStrictEqual(ll('https://maps.google.com/?q=-8.1162,-79.0297'), { lat: -8.1162, lng: -79.0297 });
  assert.deepStrictEqual(ll('https://www.google.com/maps/search/?api=1&query=-8.0821%2C-79.1210'), { lat: -8.0821, lng: -79.121 });
  assert.deepStrictEqual(ll('https://maps.google.com/maps?ll=-8.10,-79.02&z=16'), { lat: -8.1, lng: -79.02 });
  assert.deepStrictEqual(ll('https://www.google.com/maps/dir/?api=1&destination=-8.13,-79.05'), { lat: -8.13, lng: -79.05 });
  assert.deepStrictEqual(ll('https://maps.google.com/?q=loc:-8.12+-79.03'), null, 'sin coma no es un par');
  assert.deepStrictEqual(ll('https://maps.google.com/?q=-8.12, -79.03'), { lat: -8.12, lng: -79.03 }, 'con espacio después de la coma');
});
test('«/place/lat,lng» y «/search/lat,lng»', () => {
  assert.deepStrictEqual(ll('https://www.google.com/maps/place/-8.1116,-79.0287'), { lat: -8.1116, lng: -79.0287 });
  assert.deepStrictEqual(ll('https://www.google.com/maps/search/-8.0956,+-79.0412?entry=tts'), { lat: -8.0956, lng: -79.0412 });
});
test('«lat, lng» escrito a mano y el enlace de OpenStreetMap', () => {
  assert.deepStrictEqual(ll('-8.1116, -79.0287'), { lat: -8.1116, lng: -79.0287 });
  assert.deepStrictEqual(ll('https://www.openstreetmap.org/#map=17/-8.11160/-79.02870'), { lat: -8.1116, lng: -79.0287 });
});
test('sin coordenadas, fuera de rango o (0, 0): nada', () => {
  for (const u of ['', null, 'https://www.google.com/maps/place/Plaza+de+Armas+de+Trujillo', 'Jr. Pizarro 412, Trujillo', 'https://maps.google.com/?q=-95,10', 'https://maps.google.com/?q=10,200',
    'https://www.google.com/maps/@0,0,3z', 'https://maps.app.goo.gl/AbC123xyz', 'https://www.google.com/maps/place/12+de+Octubre,+Trujillo'])
    assert.strictEqual(c.mapLatLng(u), null, String(u));
});
test('enlaces cortos: se reconocen (solo los de Google Maps)', () => {
  assert.ok(c.mapIsShort('https://maps.app.goo.gl/AbC123xyz'));
  assert.ok(c.mapIsShort('maps.app.goo.gl/AbC123xyz'));
  assert.ok(c.mapIsShort('https://goo.gl/maps/AbC123'));
  assert.ok(!c.mapIsShort('https://goo.gl/AbC123'));
  assert.ok(!c.mapIsShort('https://bit.ly/x'));
  assert.ok(!c.mapIsShort('https://www.google.com/maps/@-8.1,-79,15z'));
});
test('la candidata guarda lat, lng y de dónde salieron; si cambia el enlace, se recalculan', () => {
  const k = { id: 'l1', map: 'https://www.google.com/maps/@-8.1,-79.02,15z' };
  assert.ok(c.candGeoStore(k));
  assert.deepStrictEqual([k.lat, k.lng, k.geo, k.gmap], [-8.1, -79.02, 'link', k.map]);
  assert.ok(!c.candGeoStore(k), 'sin cambios, nada');
  k.map = 'https://maps.google.com/?q=-8.2,-79.1';
  assert.deepStrictEqual(J(c.candGeo(k)), { lat: -8.2, lng: -79.1, src: 'link' });
  c.candGeoStore(k); assert.deepStrictEqual([k.lat, k.lng], [-8.2, -79.1]);
  k.map = 'Por la fábrica';
  assert.strictEqual(c.candGeo(k), null, 'el enlace nuevo no trae el lugar: lo que salió del anterior ya no vale');
  c.candGeoStore(k); assert.ok(!('lat' in k) && !('geo' in k));
  assert.strictEqual(c.candGeoWhy(k), 'nolink');
});
test('ubicada a mano: queda aunque el enlace no traiga el lugar; un enlace nuevo con lugar manda', () => {
  const k = { id: 'l2', map: '' };
  assert.strictEqual(c.candGeoWhy(k), 'none');
  assert.ok(c.candGeoHand(k, -8.123456789, -79.0412));
  assert.deepStrictEqual(J(c.candGeo(k)), { lat: -8.123457, lng: -79.0412, src: 'hand' });
  k.map = 'https://www.google.com/maps/place/Galer%C3%ADa+Qui%C3%B1ones';
  assert.deepStrictEqual(J(c.candGeo(k)), { lat: -8.123457, lng: -79.0412, src: 'hand' }, 'el enlace sin lugar no la borra');
  k.map = 'https://www.google.com/maps/@-8.2,-79.3,12z';
  assert.deepStrictEqual(J(c.candGeo(k)), { lat: -8.2, lng: -79.3, src: 'link' }, 'el enlace nuevo con lugar manda');
  assert.ok(!c.candGeoHand(k, 'x', 1), 'nada que no sea un número');
});
test('ubicada a mano con el mismo enlace de antes: queda donde se puso (aunque el enlace traiga otro lugar)', () => {
  const k = { id: 'l3', map: 'https://www.google.com/maps/@-8.1,-79.02,15z' };
  c.candGeoStore(k); c.candGeoHand(k, -8.105, -79.025);
  assert.deepStrictEqual(J(c.candGeo(k)), { lat: -8.105, lng: -79.025, src: 'hand' });
});
test('enlace corto: «sin ubicar» hasta que el servidor lo resuelve', () => {
  const u = 'https://maps.app.goo.gl/Qx9';
  const k = { id: 'l4', map: u };
  assert.strictEqual(c.candGeoWhy(k), 'short');
  c.MAP_RES.set(u, { lat: -8.09, lng: -79.04 });
  assert.deepStrictEqual(J(c.candGeo(k)), { lat: -8.09, lng: -79.04, src: 'link' });
  const k2 = { id: 'l5', map: 'https://maps.app.goo.gl/Zz1' };
  c.MAP_RES.set(k2.map, null);
  assert.strictEqual(c.candGeoWhy(k2), 'nolink', 'resuelto sin lugar');
});
test('al abrir: solo coordenadas válidas', () => {
  assert.deepStrictEqual(J(c.candGeoClean({ id: 'a', lat: '-8', lng: 3 })), { id: 'a' });
  assert.deepStrictEqual(J(c.candGeoClean({ id: 'a', lat: 91, lng: 3, geo: 'hand' })), { id: 'a' });
  assert.deepStrictEqual(J(c.candGeoClean({ id: 'a', lat: -8.1234567, lng: -79, geo: 'raro', gmap: 5 })), { id: 'a', lat: -8.123457, lng: -79, geo: 'link', gmap: '' });
  assert.deepStrictEqual(J(c.candGeoClean({ id: 'a', lat: -8, lng: -79, geo: 'hand', gmap: 'x' })), { id: 'a', lat: -8, lng: -79, geo: 'hand', gmap: 'x' });
});

if (fail) { console.log(`\n${fail} prueba(s) fallaron`); process.exit(1); }
console.log('\ntodas bien');
