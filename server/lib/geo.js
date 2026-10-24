/* ============================================================
   País e idioma de quien visita
   País (para el medio de pago: Mercado Pago en el Perú, Lemon Squeezy en el resto del mundo):
     1. la cabecera de país del proxy, solo si GEO_HEADER dice cuál es (con Cloudflare delante: CF-IPCountry; con
        nginx y GeoIP: la que se configure). Sin un proxy que la ponga, cualquiera puede inventarla: no se lee;
     2. la zona horaria del navegador (America/Lima solo existe en el Perú);
     3. la región del idioma del navegador (es-PE).
   La persona siempre puede cambiar la región a mano en la ventana de pago.
   Idioma de la web pública: ?lang=, la cookie fs_lang o el idioma del navegador;
   si no es uno de los cinco, el del país; si no, español.
   ============================================================ */
'use strict';
const { parseCookies } = require('./util');

const LANGS = ['es', 'en', 'pt', 'fr', 'it'];
const LANG_OF_COUNTRY = {
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', HT: 'fr', CA: 'en',
  IT: 'it', SM: 'it', VA: 'it', CH: 'fr', US: 'en', GB: 'en', IE: 'en', AU: 'en', NZ: 'en', IN: 'en', ZA: 'en', NG: 'en', PH: 'en',
};
const cc = v => { const c = String(v || '').trim().toUpperCase(); return /^[A-Z]{2}$/.test(c) && c !== 'XX' && c !== 'T1' ? c : ''; };

function countryOf(req, tz) {
  const hdr = (process.env.GEO_HEADER || '').trim().toLowerCase();
  if (hdr) { const c = cc(req.headers[hdr]); if (c) return { country: c, src: 'ip' }; }
  if (tz === 'America/Lima') return { country: 'PE', src: 'tz' };
  const al = String(req.headers['accept-language'] || '');
  const m = /\b[a-z]{2}-([A-Z]{2})\b/.exec(al.split(',')[0] || '');
  if (m) return { country: cc(m[1]), src: 'lang' };
  return { country: '', src: '' };
}
const regionOf = country => country === 'PE' ? 'pe' : 'intl';

function langOf(req, url, country) {
  const q = url && url.searchParams.get('lang');
  if (q && LANGS.includes(q)) return q;
  const c = parseCookies(req).fs_lang;
  if (c && LANGS.includes(c)) return c;
  for (const part of String(req.headers['accept-language'] || '').split(',')) {
    const l = part.trim().slice(0, 2).toLowerCase();
    if (LANGS.includes(l)) return l;
  }
  return LANG_OF_COUNTRY[country] || 'es';
}

module.exports = { LANGS, countryOf, regionOf, langOf };
