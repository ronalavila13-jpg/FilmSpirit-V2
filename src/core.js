/* ============================================================
   FILMSPIRIT · núcleo (sin DOM): datos, parsers, maquetación,
   desglose automático, plan y presupuesto
   ============================================================ */

const CATS = [
  { id: 'cast',     name: 'Reparto',                 short: 'REP', color: '#4FB57A' },
  { id: 'extras',   name: 'Figuración',              short: 'FIG', color: '#C8447F' },
  { id: 'props',    name: 'Atrezzo',                 short: 'ATR', color: '#EE8A5C' },
  { id: 'setdress', name: 'Ambientación',            short: 'AMB', color: '#D9773F' },
  { id: 'wardrobe', name: 'Vestuario',               short: 'VES', color: '#159F9F' },
  { id: 'makeup',   name: 'Peluquería y maquillaje', short: 'PEL', color: '#45C1C0' },
  { id: 'vehicles', name: 'Vehículos',               short: 'VEH', color: '#D2474F' },
  { id: 'animals',  name: 'Animales',                short: 'ANI', color: '#E46F75' },
  { id: 'sfx',      name: 'Efectos especiales',      short: 'SFX', color: '#9182C4' },
  { id: 'vfx',      name: 'VFX y gráficos',          short: 'VFX', color: '#6E5DB8' },
  { id: 'sound',    name: 'Efectos de sonido',       short: 'SON', color: '#7FC172' },
  { id: 'equip',    name: 'Equipo especial',         short: 'EQP', color: '#D9C232' },
  { id: 'stunts',   name: 'Acción y riesgo',         short: 'ACC', color: '#F76B15' },
  { id: 'weapons',  name: 'Armas',                   short: 'ARM', color: '#8A5A3C' },
  { id: 'notes',    name: 'Notas',                   short: 'NOT', color: '#8A919C' },
];
/* cajas de la hoja de desglose (formato de la productora) y las categorías que reúne cada una */
const SHEET = [
  { id: 'cast',   name: 'Personajes/Reparto',     color: '#6DC28C', cats: ['cast'] },
  { id: 'equip',  name: 'Equipo especial',        color: '#F1E36E', cats: ['equip'] },
  { id: 'sfx',    name: 'Efectos especiales',     color: '#A291C8', cats: ['sfx', 'vfx'] },
  { id: 'extras', name: 'Figuración',             color: '#CB4A82', cats: ['extras'] },
  { id: 'props',  name: 'Atrezzo',                color: '#F5A27C', cats: ['props', 'setdress', 'weapons'] },
  { id: 'ward',   name: 'Vestuario y Peluquería', color: '#1AAEAD', cats: ['wardrobe', 'makeup'] },
  { id: 'veh',    name: 'Vehículos y/o animales', color: '#D2484F', cats: ['vehicles', 'animals'] },
  { id: 'sound',  name: 'Efectos de sonido',      color: '#A6D59B', cats: ['sound'] },
  { id: 'notes',  name: 'Notas',                  color: '#D9DCE1', cats: ['notes', 'stunts'] },
];
const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));

const SIZES = [
  ['GPG', 'Gran plano general'], ['PG', 'Plano general'], ['PC', 'Plano conjunto'],
  ['PE', 'Plano entero'], ['PA', 'Plano americano'], ['PM', 'Plano medio'],
  ['PMC', 'Plano medio corto'], ['PP', 'Primer plano'], ['PPP', 'Primerísimo primer plano'],
  ['PD', 'Plano detalle'], ['INS', 'Inserto'],
];
const ANGLES = ['Normal', 'Picado', 'Contrapicado', 'Cenital', 'Nadir', 'Holandés', 'Subjetivo (POV)', 'Sobre el hombro'];
const MOVES = ['Fijo', 'Paneo', 'Tilt', 'Dolly in', 'Dolly out', 'Travelling lateral', 'Seguimiento',
  'Cámara en mano', 'Steadicam / gimbal', 'Grúa', 'Zoom in', 'Zoom out', 'Arco', 'Drone', 'Plano secuencia', 'Barrido (step printing)'];
const SUPPORTS = ['Trípode', 'Mano', 'Gimbal', 'Slider', 'Dolly', 'Grúa / pértiga', 'Drone', 'Vehículo'];
const SIZE_NAME = Object.fromEntries(SIZES);

/* ---------- utilidades ---------- */
const uid = (p = '') => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* valor dentro de un atributo HTML entre comillas dobles: no deja cerrar la comilla ni abrir etiquetas. No toca «&»,
   así no se escapa dos veces un texto que ya pasó por esc(). Todo dato del proyecto que va en un atributo pasa por
   aquí o por esc(): un colaborador o un archivo .fsp no pueden inyectar código */
const ea = s => String(s ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/* ---------- datos que llegan de afuera ----------
   Proyectos de colaboradores, archivos .fsp y la carpeta compartida pueden traer cualquier cosa. cleanTree quita las
   claves que alteran los objetos de JavaScript (__proto__, constructor, prototype), los colores que no son colores
   (en un atributo style podrían tapar la pantalla con un botón invisible) y las referencias con esos nombres */
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const safeKey = k => !BAD_KEYS.has(String(k));
const COLOR_KEYS = new Set(['color', 'col', 'peloColor', 'bg', 'fill', 'stroke']);
const COLOR_OK = /^(#[0-9a-f]{3,8}|[a-z][a-z-]{1,23}|(rgb|hsl)a?\([\d\s.,%]+\))$/i;
const REF_KEYS = new Set(['id', 'el', 're', 'sid', 'shot', 'sh', 'k', 'pid']);
function cleanTree(o, d = 0) {
  if (!o || typeof o !== 'object' || d > 60) return o;
  if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) if (o[i] && typeof o[i] === 'object') cleanTree(o[i], d + 1); return o; }
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (BAD_KEYS.has(k)) { delete o[k]; continue; }
    if (typeof v === 'string') {
      if (COLOR_KEYS.has(k) && v && !COLOR_OK.test(v)) delete o[k];
      else if (REF_KEYS.has(k) && BAD_KEYS.has(v)) o[k] = '_' + v;
    } else if (v && typeof v === 'object') cleanTree(v, d + 1);
  }
  return o;
}
/* imágenes: solo PNG, JPEG, WebP o GIF en base64, con nombres de imagen válidos; y los modelos 3D importados
   (escenarios y personajes, modelos.js: «m3~…», en su formato propio) */
const FRAME_URL = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]*$/;
const FRAME_M3 = /^data:model\/x-fsm;base64,[A-Za-z0-9+/=\s]*$/;
const FRAME_KEY = /^[\w.~-]{1,200}$/;
const frameOk = (k, u) => FRAME_KEY.test(String(k)) && typeof u === 'string' && (FRAME_URL.test(u) || (String(k).startsWith('m3~') && FRAME_M3.test(u)));
function cleanFrames(F) { const out = {}; for (const [k, u] of Object.entries(F || {})) if (frameOk(k, u)) out[k] = u; return out; }
/* número escrito (o vacío): lo demás no se muestra tal cual */
const numLike = v => v == null || v === '' || (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && /^\s*-?[\d.,]*\s*$/.test(v));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const deaccent = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
/* un monto: sin decimales si es entero; con dos si tiene céntimos (S/ 12.50 no se redondea a 13) */
const moneyNum = v => { const r = Math.round((+v || 0) * 100) / 100; return r.toLocaleString('es-PE', r % 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 }); };
/* transiciones (CORTE A:, FUNDIDO A NEGRO, DISUELVE A:, CUT TO:…): van a la derecha y no son personajes */
const TRANS_X = /^(FADE( IN| OUT| TO( BLACK)?)?|((SMASH|MATCH|JUMP|HARD) )?CUT( TO)?|DISSOLVE( TO)?|WIPE( TO)?|IRIS (IN|OUT)|CORTE|FUNDIDO|FUNDE|ENCADENA(DO)?|DISUELVE|DISOLVENCIA|DESVANECE|ABRE EN|CIERRA EN|TRANSICION)\b/;
function isTransText(x) {
  const s = String(x || '').trim().replace(/^>\s*/, '');
  if (!s || s.length > 40 || /\p{Ll}/u.test(s)) return false;
  return TRANS_X.test(deaccent(s.toUpperCase()));
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
/* huella corta de un texto (53 bits, en base 36): para claves de caché, no para seguridad */
function hash53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
/* espera un rato libre del navegador (sin pasar de `ms`): para trabajo que puede esperar a que nadie toque nada */
const idle = (ms = 400) => new Promise(r => { if (typeof requestIdleCallback === 'function') requestIdleCallback(() => r(), { timeout: ms }); else setTimeout(r, 16); });
function fmtEighths(e) {
  e = Math.round(e || 0);
  const w = Math.floor(e / 8), r = e % 8;
  if (!w && !r) return '0';
  return (w ? w : '') + (w && r ? ' ' : '') + (r ? r + '/8' : '');
}
function cleanText(s) {
  return String(s || '').replace(/\u00A0/g, ' ').replace(/\u2026/g, '...').replace(/\t/g, ' ').replace(/\r/g, '');
}
const vowelClass = { a: '[aáà]', e: '[eéè]', i: '[iíì]', o: '[oóò]', u: '[uúüù]', á: '[aá]', é: '[eé]', í: '[ií]', ó: '[oó]', ú: '[uú]' };
function termPattern(term) {
  return term.toLowerCase().split('').map(ch => vowelClass[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('').replace(/ /g, '\\s+');
}
/* «CASA DE MARÍA» → «Casa de María»: las palabras chicas en minúscula salvo al empezar (o después de « - » o «/») */
const TC_LOW = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'en', 'a', 'al', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'tras']);
function titleCase(s) {
  let first = true;
  return s.toLowerCase().replace(/(^|[\s\-/]+)(\p{L}[\p{L}\p{M}]*)/gu, (m, sep, w) => {
    const low = !first && TC_LOW.has(w) && !/[-/]/.test(sep);
    first = false;
    return sep + (low ? w : w[0].toUpperCase() + w.slice(1));
  });
}

/* ---------- diccionario para el desglose automático ---------- */
const DICT = {
  props: ['celular', 'teléfono', 'cámara', 'guitarra', 'billete', 'fajo', 'llave', 'cigarro', 'cigarrillo', 'encendedor',
    'botella', 'vaso', 'taza', 'laptop', 'computadora', 'mochila', 'maleta', 'bolso', 'riñonera', 'cuaderno', 'lápiz',
    'lapicero', 'libreta', 'libro', 'revista', 'periódico', 'fotografía', 'foto', 'caja', 'audífono', 'anteojo',
    'reloj', 'anillo', 'collar', 'sticker', 'póster', 'fanzine', 'parche', 'pincel', 'tinta', 'plumón', 'carpeta',
    'portafolio', 'curita', 'linterna', 'radio', 'televisor', 'control remoto', 'sartén', 'plato', 'cerveza', 'chela',
    'mantel', 'cartera', 'moneda', 'tarjeta', 'documento', 'contrato', 'bolsa', 'estuche', 'negativo',
    'rollo', 'trípode', 'micrófono', 'amplificador', 'parlante', 'casco', 'paraguas', 'fósforo', 'vela', 'ramo',
    'regalo', 'torta', 'termo', 'jarra', 'olla', 'cuchillo', 'tenedor', 'cucharón', 'cajón', 'sobre de manila', 'llavero', 'periódico'],
  setdress: ['sofá', 'sillón', 'cama', 'escritorio', 'estante', 'repisa', 'cortina', 'letrero', 'neón', 'calendario',
    'afiche', 'mostrador', 'vitrina', 'lámpara', 'espejo', 'alfombra', 'biombo', 'perchero', 'maniquí', 'refrigeradora', 'mesa de billar'],
  wardrobe: ['camisa', 'casaca', 'vestido', 'falda', 'pantalón', 'jean', 'zapatilla', 'zapato', 'bota', 'gorra', 'sombrero',
    'chompa', 'bividí', 'delantal', 'blusa', 'uniforme', 'corbata', 'terno', 'chaleco', 'buzo', 'sandalia', 'poncho',
    'chalina', 'bufanda', 'guante', 'capucha', 'polera', 'cinturón', 'lentes oscuros', 'camiseta'],
  makeup: ['sangre', 'herida', 'moretón', 'cicatriz', 'tatuaje', 'sudor', 'maquillaje', 'peluca', 'ceja partida', 'labio partido', 'ojo morado'],
  vehicles: ['taxi', 'auto', 'carro', 'coche', 'camioneta', 'moto', 'motocicleta', 'mototaxi', 'combi', 'micro', 'bus',
    'ómnibus', 'camión', 'patrulla', 'bicicleta', 'colectivo', 'ambulancia', 'furgoneta'],
  animals: ['perro', 'gato', 'caballo', 'gallo', 'gallina', 'paloma', 'burro', 'vaca', 'pájaro', 'loro', 'cuy', 'chancho', 'oveja'],
  weapons: ['pistola', 'revólver', 'arma', 'navaja', 'machete', 'escopeta', 'rifle', 'bate', 'metralleta', 'chaveta'],
  sfx: ['lluvia', 'humo', 'fuego', 'explosión', 'niebla', 'neblina', 'chispa', 'vapor', 'incendio', 'llamas'],
  vfx: ['pantalla', 'whatsapp', 'instagram', 'notificación', 'holograma'],
  sound: ['música', 'canción', 'riff', 'bolero', 'cumbia', 'huayno', 'timbre', 'bocina', 'claxon', 'sirena', 'alarma', 'disparo', 'balazo'],
  stunts: ['pelea', 'golpiza', 'forcejeo', 'forcejean', 'forcejea', 'persecución', 'asalto', 'atropello', 'choque',
    'puñetazo', 'puñete', 'patada', 'cachetada', 'cachetea', 'empujón'],
  extras: ['gente', 'multitud', 'transeúnte', 'peatón', 'peatones', 'cliente', 'vendedor', 'vendedora', 'comerciante',
    'público', 'músico', 'policía', 'mozo', 'mesero', 'comprador', 'estudiante', 'ambulante', 'pasajero', 'curioso',
    'trabajador', 'obrero', 'turista', 'surfista'],
  equip: ['drone', 'dron', 'steadicam'],
};
const ONOMATOPOEIA = ['CRASH', 'CLICK', 'CLIC', 'BANG', 'PUM', 'PAF', 'ZAS', 'RING', 'BIP', 'BEEP', 'TOC', 'KNOCK', 'SLAM',
  'FRUP', 'BOOM', 'CRACK', 'CRAC', 'SPLASH', 'THUD', 'WHOOSH', 'SNAP', 'CLACK', 'CLAC', 'TIC', 'TAC', 'POP', 'SWISH',
  'BZZZ', 'BRRR', 'PIII', 'PIP', 'CLONC', 'PLAF', 'ÑIIC', 'CHAS', 'TUM', 'RIIING', 'DING', 'DONG'];

/* el mismo diccionario para los guiones en inglés (se elige por el idioma del guion, no por el del programa) */
const DICT_EN = {
  props: ['cell phone', 'cellphone', 'smartphone', 'phone', 'camera', 'guitar', 'wad of cash', 'banknote', 'key', 'cigarette', 'lighter',
    'bottle', 'mug', 'cup', 'laptop', 'computer', 'backpack', 'suitcase', 'bag', 'purse', 'notebook', 'pencil', 'pen',
    'book', 'magazine', 'newspaper', 'photograph', 'photo', 'box', 'headphones', 'glasses', 'necklace', 'flashlight', 'radio',
    'remote control', 'frying pan', 'plate', 'beer', 'wallet', 'coin', 'credit card', 'document', 'contract', 'film can', 'film reel', 'reel',
    'tripod', 'microphone', 'amplifier', 'helmet', 'umbrella', 'candle', 'bouquet', 'gift', 'cake', 'thermos', 'jug', 'knife', 'knives',
    'fork', 'ladle', 'envelope', 'keychain', 'fuse', 'ticket', 'projector', 'bulb', 'ladder'],
  setdress: ['sofa', 'couch', 'armchair', 'bed', 'desk', 'shelf', 'shelves', 'curtain', 'neon sign', 'neon', 'calendar', 'poster', 'counter',
    'display case', 'lamp', 'mirror', 'rug', 'carpet', 'coat rack', 'mannequin', 'fridge', 'refrigerator', 'pool table', 'marquee', 'folding chair'],
  wardrobe: ['shirt', 'denim jacket', 'jacket', 'dress', 'skirt', 'pants', 'trousers', 'jeans', 'sneaker', 'shoe', 'boot', 'cap', 'hat',
    'sweater', 'tank top', 'apron', 'blouse', 'uniform', 'necktie', 'vest', 'tracksuit', 'sandal', 'poncho', 'scarf', 'glove', 'hoodie',
    'belt', 'sunglasses', 't-shirt', 'slipper'],
  makeup: ['blood', 'wound', 'bruise', 'scar', 'tattoo', 'sweat', 'makeup', 'wig', 'black eye', 'split lip'],
  vehicles: ['taxi', 'cab', 'car', 'pickup truck', 'truck', 'van', 'motorcycle', 'motorbike', 'moto-taxi', 'mototaxi', 'minibus', 'bus',
    'police car', 'bicycle', 'bike', 'ambulance'],
  animals: ['dog', 'cat', 'horse', 'rooster', 'chicken', 'pigeon', 'donkey', 'cow', 'bird', 'parrot', 'guinea pig', 'pig', 'sheep'],
  weapons: ['gun', 'pistol', 'revolver', 'weapon', 'switchblade', 'machete', 'shotgun', 'rifle', 'baseball bat', 'machine gun'],
  sfx: ['rain', 'smoke', 'fire', 'explosion', 'fog', 'mist', 'spark', 'steam', 'flames'],
  vfx: ['screen', 'whatsapp', 'instagram', 'notification', 'hologram', 'text message'],
  sound: ['music', 'song', 'riff', 'bolero', 'cumbia', 'doorbell', 'horn', 'siren', 'alarm', 'gunshot'],
  stunts: ['fight', 'beating', 'struggle', 'chase', 'mugging', 'car crash', 'punch', 'kick', 'slap', 'shove'],
  extras: ['crowd', 'passerby', 'passersby', 'pedestrian', 'customer', 'vendor', 'street vendor', 'audience', 'musician', 'police officer',
    'waiter', 'waitress', 'shopper', 'student', 'passenger', 'onlooker', 'worker', 'tourist', 'surfer', 'neighbor', 'neighbour'],
  equip: ['drone', 'steadicam'],
};
const SW_ES = new Set('el la los las de del que y en con una por para su sus se lo al es'.split(' '));
const SW_EN = new Set('the and of to in with his her is on at from into as their it its'.split(' '));
/* en qué idioma está el guion (por sus palabras más comunes): para el desglose automático */
function scriptLang(paras) {
  let es = 0, en = 0;
  for (const p of paras) {
    if (p.t !== 'a' && p.t !== 'd' && p.t !== 'g') continue;
    for (const w of p.x.toLowerCase().match(/[a-záéíóúñü]+/g) || []) { if (SW_ES.has(w)) es++; else if (SW_EN.has(w)) en++; }
    if (es + en > 600) break;
  }
  return en > es ? 'en' : 'es';
}
const DICT_RXS = {};
/* letras y cifras (latinas, con tildes) para los bordes de palabra. Antes era \p{L}\p{N} con la bandera «u»: compilar
   esas ~250 expresiones costaba ~300 ms la primera vez (al abrir el ejemplo o importar un guion); así, ~20 ms */
const WORD_CH = 'a-z0-9\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F\\u1E00-\\u1EFF';
function buildDictRx(lang) {
  const entries = [];
  for (const [cat, terms] of Object.entries(lang === 'en' ? DICT_EN : DICT)) for (const t of terms) entries.push({ cat, t });
  entries.sort((a, b) => b.t.length - a.t.length);
  return entries.map(e => {
    const plural = /[aeiouáéíóú]$/i.test(e.t) ? '(?:s)?' : '(?:es|s)?';
    return { cat: e.cat, name: titleCase(e.t), rx: new RegExp('(?<![' + WORD_CH + '])' + termPattern(e.t) + plural + '(?![' + WORD_CH + '])', 'gi') };
  });
}

/* ---------- tipos de párrafo ---------- */
// h=encabezado, a=acción, c=personaje, p=paréntesis, d=diálogo, tr=transición, sh=plano, g=general, ct=centrado
const PTYPE_LABEL = { h: 'Encabezado', a: 'Acción', c: 'Personaje', p: 'Acotación', d: 'Diálogo', tr: 'Transición', sh: 'Plano', g: 'General', ct: 'Centrado', v: 'Video', u: 'Audio' };
const FDX_TYPE = {
  'scene heading': 'h', 'action': 'a', 'character': 'c', 'parenthetical': 'p', 'dialogue': 'd', 'transition': 't',
  'shot': 'sh', 'general': 'g', 'cast list': 'g', 'new act': 'ct', 'end of act': 'ct', 'lyrics': 'd',
};

/* ---------- FDX ---------- */
function parseFDX(xml, ParserImpl) {
  const P = ParserImpl || DOMParser;
  const doc = new P().parseFromString(xml, 'text/xml');
  const kids = (el, name) => Array.from(el ? el.childNodes : []).filter(n => n.nodeType === 1 && n.nodeName === name);
  const first = (el, name) => {
    if (!el) return null;
    for (const n of Array.from(el.childNodes)) if (n.nodeType === 1 && n.nodeName === name) return n;
    return null;
  };
  const root = doc.documentElement;
  if (!root || root.nodeName !== 'FinalDraft') throw new Error('El archivo no parece un .fdx de Final Draft.');
  // etiquetas nativas de Final Draft
  const tagMap = {};
  const tagData = first(root, 'TagData');
  if (tagData) {
    const cats = {}, defs = {};
    for (const c of kids(first(tagData, 'TagCategories'), 'TagCategory')) cats[c.getAttribute('Id')] = c.getAttribute('Name') || '';
    for (const d of kids(first(tagData, 'TagDefinitions'), 'TagDefinition'))
      defs[d.getAttribute('Id')] = { cat: cats[d.getAttribute('CatId')] || '', label: d.getAttribute('Label') || '' };
    for (const t of kids(first(tagData, 'Tags'), 'Tag')) {
      const defIds = kids(t, 'DefId').map(x => x.textContent.trim());
      tagMap[t.getAttribute('Number')] = defIds.map(id => defs[id]).filter(Boolean);
    }
  }
  const content = first(root, 'Content');
  if (!content) throw new Error('El .fdx no tiene contenido.');
  const paras = [], fdTags = [];
  const walk = el => {
    for (const p of kids(el, 'Paragraph')) {
      const dual = first(p, 'DualDialogue');
      if (dual) { walk(dual); continue; }
      const typeAttr = (p.getAttribute('Type') || 'Action').toLowerCase();
      let t = FDX_TYPE[typeAttr] || 'a';
      if (t === 't') t = 'tr';
      let x = '';
      const local = [], sty = [];
      for (const tx of kids(p, 'Text')) {
        const s = cleanText(tx.textContent);
        const tn = tx.getAttribute('TagNumber');
        if (tn && tagMap[tn]) for (const d of tagMap[tn]) local.push({ s: x.length, e: x.length + s.length, cat: d.cat, name: d.label || s });
        // negrita, itálica y subrayado de Final Draft (Style="Bold+Italic+Underline")
        const st = String(tx.getAttribute('Style') || '');
        const f = (/bold/i.test(st) ? 'b' : '') + (/italic/i.test(st) ? 'i' : '') + (/underline/i.test(st) ? 'u' : '');
        if (f && s) sty.push({ s: x.length, e: x.length + s.length, f });
        x += s;
      }
      // FDX guarda los saltos de línea dentro de un párrafo como \n: los convertimos en párrafos hermanos
      const lines = x.split('\n');
      let base = 0;
      lines.forEach((line, li) => {
        const para = { t, x: line };
        if (li === 0 && t === 'h') {
          const n = p.getAttribute('Number');
          if (n) para.n = n.trim();
        }
        if (line.trim()) {
          const idx = paras.length;
          for (const r of sty) {
            const s0 = Math.max(r.s, base) - base, e0 = Math.min(r.e, base + line.length) - base;
            if (e0 > s0) for (const k of r.f) ((para.fm = para.fm || {})[k] = para.fm[k] || []).push([s0, e0]);
          }
          paras.push(para);
          for (const lt of local) {
            const s = Math.max(lt.s, base) - base, e = Math.min(lt.e, base + line.length) - base;
            if (e > s) fdTags.push({ p: idx, s, e, cat: lt.cat, name: lt.name });
          }
        }
        base += line.length + 1;
      });
    }
  };
  walk(content);
  // título desde la portada
  let title = '';
  const tp = first(root, 'TitlePage');
  if (tp) {
    const tc = first(tp, 'Content');
    const tps = tc ? kids(tc, 'Paragraph').map(p => kids(p, 'Text').map(t => t.textContent).join('').trim()).filter(Boolean) : [];
    if (tps.length) title = tps[0];
  }
  return { paras, title, fdTags };
}
function mapFdCategory(name) {
  const n = deaccent(String(name).toLowerCase());
  const table = [
    [/cast|reparto|actor|elenco|personaje/, 'cast'], [/background|extra|figura|atmos/, 'extras'], [/stunt|riesgo|accion|doble/, 'stunts'],
    [/set dress|escenograf|decor|ambient/, 'setdress'], [/prop|utiler|atrezz|attrezz/, 'props'], [/costum|wardrobe|vestua/, 'wardrobe'],
    [/make|hair|maquill|pein|pelu/, 'makeup'], [/vehic/, 'vehicles'], [/animal|livestock/, 'animals'], [/weapon|arma/, 'weapons'],
    [/special effect|sfx|efectos esp/, 'sfx'], [/visual|optical|vfx|grafic/, 'vfx'], [/sound|music|sonid|music/, 'sound'],
    [/equip|camera|camara/, 'equip'],
  ];
  for (const [rx, id] of table) if (rx.test(n)) return id;
  return 'notes';
}

/* ---------- Fountain ---------- */
/* quita los tramos «a … b» (comentarios /* … *\/ y notas [[ … ]]) recorriendo el texto una sola vez: con muchos
   comienzos sin cierre, la expresión regular de antes tardaba minutos en un archivo de 1 MB */
function dropSpans(t, a, b) {
  let out = '', i = 0;
  for (;;) {
    const s = t.indexOf(a, i); if (s < 0) break;
    const e = t.indexOf(b, s + a.length); if (e < 0) break;   // sin cierre: lo que sigue queda tal cual
    out += t.slice(i, s); i = e + b.length;
  }
  return out + t.slice(i);
}
/* opt.keepEmph: deja las marcas de **negrita**, *itálica* y _subrayado_ para que las convierta en formato quien
   importa (guion-formato.js · fmtFromFountain); sin eso se quitan */
function parseFountain(src, opt = {}) {
  let text = dropSpans(dropSpans(cleanText(src), '/*', '*/'), '[[', ']]');
  let lines = text.split('\n');
  let title = '';
  // portada (Clave: valor al inicio)
  if (/^\s*(title|título|titulo|credit|author|autor|draft date|contact)\s*:/i.test(lines[0] || '')) {
    let i = 0;
    while (i < lines.length && lines[i].trim() !== '') {
      const m = lines[i].match(/^\s*(title|título|titulo)\s*:\s*(.*)$/i);
      if (m) { title = m[2].trim(); if (!title && lines[i + 1] && /^\s{2,}|\t/.test(lines[i + 1])) title = lines[i + 1].trim(); }
      i++;
    }
    lines = lines.slice(i);
  }
  const paras = [];
  const isHeading = l => /^(\.(?!\.)|((INT|EXT|EST|I\/E|INT\.?\/EXT|EXT\.?\/INT)[\.\s]))/i.test(l.trim());
  // el subrayado va entre _ que no están pegados a otras letras (MI_ARCHIVO_FINAL se queda como está)
  const stripEmph = opt.keepEmph ? s => s : s => s.replace(/\\\*/g, '\u0001').replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1').replace(/(?<![\p{L}\p{N}])_([^_]+)_(?![\p{L}\p{N}])/gu, '$1').replace(/\u0001/g, '*');
  let i = 0, epNext = '';
  const epT = {};
  while (i < lines.length) {
    const raw = lines[i], l = raw.trim();
    const prevBlank = i === 0 || lines[i - 1].trim() === '' || (paras.length && paras[paras.length - 1].t === 'tr' && isTransText(lines[i - 1].trim()));
    const next = lines[i + 1];
    if (!l) { i++; continue; }
    // series: «# Episodio 101: Piloto» (sección de Fountain) marca dónde empieza un episodio
    const em = /^#+\s*(?:episodio|episode|ep\.?)\s+([A-Za-z0-9.]{1,6})\s*(?:[:·.\-–—]\s*(.*))?$/i.exec(l);
    if (em && epOk(em[1])) { epNext = em[1]; if (em[2] && em[2].trim()) epT[em[1]] = em[2].trim().slice(0, 120); i++; continue; }
    if (/^#/.test(l) || /^=(?!=)/.test(l) || /^===+$/.test(l)) { i++; continue; } // secciones, sinopsis, saltos
    if (prevBlank && isHeading(l)) {
      let h = l.replace(/^\./, '');
      let n;
      const m = h.match(/\s#([^#]+)#\s*$/);
      if (m) { n = m[1].trim(); h = h.slice(0, m.index).trim(); }
      paras.push(n ? { t: 'h', x: stripEmph(h), n } : { t: 'h', x: stripEmph(h) });
      if (epNext) { paras[paras.length - 1].ep = epNext; epNext = ''; }
      i++; continue;
    }
    if (/^>.*<$/.test(l)) { paras.push({ t: 'ct', x: stripEmph(l.slice(1, -1).trim()) }); i++; continue; }
    const nextBlank = next === undefined || next.trim() === '';
    if (prevBlank && (/^>/.test(l) || isTransText(l) || (nextBlank && l === l.toUpperCase() && /:$/.test(l) && l.length <= 30 && /\p{Lu}/u.test(l)))) {
      paras.push({ t: 'tr', x: stripEmph(l.replace(/^>\s*/, '')) }); i++; continue;
    }
    const isCue = prevBlank && next !== undefined && next.trim() !== '' &&
      ((/^@/.test(l)) || (l === l.toUpperCase() && /\p{Lu}/u.test(l) && !/^[\d\W]+$/.test(l) && l.replace(/\(.*?\)/g, '').trim().length <= 40));
    if (isCue) {
      paras.push({ t: 'c', x: l.replace(/^@/, '').replace(/\s*\^$/, '') });
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        const dl = lines[i].trim();
        if (/^\(.*\)$/.test(dl)) paras.push({ t: 'p', x: dl });
        else {
          const last = paras[paras.length - 1];
          if (last.t === 'd') last.x += ' ' + stripEmph(dl); else paras.push({ t: 'd', x: stripEmph(dl) });
        }
        i++;
      }
      continue;
    }
    // acción: une líneas consecutivas
    let x = l.replace(/^!/, '');
    i++;
    while (i < lines.length && lines[i].trim() !== '') { x += ' ' + lines[i].trim(); i++; }
    paras.push({ t: 'a', x: stripEmph(x) });
  }
  return Object.keys(epT).length ? { paras, title, fdTags: [], epTitles: epT } : { paras, title, fdTags: [] };
}

/* ---------- PDF ----------
   Un guion en PDF es texto suelto sobre la página: cada elemento se reconoce por su sangría respecto del margen
   de la acción (encabezado y acción al margen, diálogo ~1", acotación ~1,5", personaje ~2", transición a la derecha).
   Entra: pages = [{ w, h, items: [{ s, x, y, w, h }] }] con y medida desde arriba (la línea base). */
const PDF_HEAD = /^(\d+[A-Z]?\.?\s+)?((INT|EXT|EST|I\/E|INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT)[\.\s]|INTERIOR\b|EXTERIOR\b)/i;
const PDF_TRANS = /^(FADE|CUT|DISSOLVE|SMASH|MATCH|JUMP|WIPE|IRIS|CORTE|FUNDIDO|ENCADENA|DISUELVE|DESVANECE|INSERTO\b.*:$|.*\bTO:$|.*\bA:$)/;
const PDF_MORE = /^\((MORE|MÁS|MAS|SIGUE|CONTINÚA|CONTINUA)\)$/i;
const PDF_CONT_PAGE = /^\(?(CONTINUED|CONTINUADO|CONTINÚA|CONTINUA|CONT'D|CONT\.)\)?:?$/i;
const pdfUpper = t => { const l = t.replace(/\([^)]*\)/g, '').replace(/[^\p{L}]/gu, ''); return l.length > 0 && l === l.toUpperCase(); };
function parsePDFScript(pages) {
  const NUM = /^\(?\d{1,4}[A-Z]{0,2}\.?\)?$/;
  let chars = 0;
  // 1) líneas: piezas a la misma altura, de izquierda a derecha
  const pl = pages.map((pg, pi) => {
    const its = pg.items.filter(i => i.s && i.s.trim()).sort((a, b) => a.y - b.y || a.x - b.x);
    const lines = [];
    for (const it of its) {
      let ln = null;
      for (let k = lines.length - 1; k >= 0 && k >= lines.length - 3; k--) if (Math.abs(lines[k].y - it.y) < Math.max(2, (it.h || 12) * .4)) { ln = lines[k]; break; }
      if (!ln) lines.push(ln = { p: pi, y: it.y, items: [], fs: it.h || 12 });
      ln.items.push(it);
    }
    for (const ln of lines) {
      ln.items.sort((a, b) => a.x - b.x);
      // números de escena a los lados del encabezado
      const gapAfter = (a, b) => b.x - (a.x + a.w);
      if (ln.items.length > 1 && NUM.test(ln.items[0].s.trim()) && gapAfter(ln.items[0], ln.items[1]) > 14) ln.n = ln.items.shift().s.trim().replace(/[().]/g, '');
      const lst = ln.items[ln.items.length - 1];
      if (ln.items.length > 1 && NUM.test(lst.s.trim()) && gapAfter(ln.items[ln.items.length - 2], lst) > 14) { const n = ln.items.pop().s.trim().replace(/[().]/g, ''); ln.n = ln.n || n; }
      let t = '', end = null;
      for (const it of ln.items) {
        const cw = it.w && it.s.length ? it.w / it.s.length : (it.h || 12) * .6;
        if (end !== null && it.x - end > cw * .3 && !/\s$/.test(t) && !/^\s/.test(it.s)) t += ' ';
        t += it.s; end = it.x + it.w;
      }
      ln.t = cleanText(t).replace(/\s+/g, ' ').trim();
      ln.x = ln.items[0].x; ln.x2 = end;
      chars += ln.t.length;
    }
    return { w: pg.w, h: pg.h, lines: lines.filter(l => l.t) };
  });
  if (chars < 200) throw new Error('Este PDF no tiene texto que se pueda leer: parece un guion escaneado (fotos de las páginas). Expórtalo de nuevo desde tu programa de guion, o usa el archivo .fdx o .fountain.');
  // 2) encabezados y pies que se repiten: números de página, «CONTINUADO», títulos de cabecera
  const norm = t => t.replace(/\d+/g, '#').toUpperCase();
  const edge = (ln, pg) => ln.y < pg.h * .1 || ln.y > pg.h * .9;
  const rep = {};
  for (const pg of pl) for (const t of new Set(pg.lines.filter(l => edge(l, pg)).map(l => norm(l.t)))) rep[t] = (rep[t] || 0) + 1;
  for (const pg of pl) pg.lines = pg.lines.filter(l => !(edge(l, pg) && (/^[-–—\s]*(p(á|a)g(ina)?\.?\s*)?\d{1,4}\s*(\/\s*\d+)?\.?[-–—\s]*$/i.test(l.t) || PDF_CONT_PAGE.test(l.t) || (pl.length > 4 && rep[norm(l.t)] >= Math.max(3, pl.length * .3)))));
  // 3) portada: primera página sin encabezados de escena y con texto centrado
  let title = '';
  const p0 = pl[0];
  if (pl.length > 1 && p0 && !p0.lines.some(l => PDF_HEAD.test(l.t))) {
    const cen = p0.lines.filter(l => Math.abs((l.x + l.x2) / 2 - p0.w / 2) < p0.w * .08).length;
    if (cen >= p0.lines.length * .4 || p0.lines.some(l => /written by|escrito por|gui[oó]n de|^by$|^de$|^por$/i.test(l.t))) {
      const big = Math.max(...p0.lines.map(l => l.fs));
      const tl = p0.lines.find(l => l.fs >= big - .5 && Math.abs((l.x + l.x2) / 2 - p0.w / 2) < p0.w * .1) || p0.lines[0];
      title = tl ? tl.t.replace(/^["“]|["”]$/g, '') : '';
      p0.lines = [];
    }
  }
  const all = pl.flatMap(pg => pg.lines);
  if (!all.length) return { paras: [], title, fdTags: [] };
  // 4) márgenes: el de la acción es el de los encabezados (o el más a la izquierda que se repite)
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
  const heads = all.filter(l => PDF_HEAD.test(l.t));
  let A = med(heads.map(l => l.x));
  if (A === null) {
    const cnt = {}; for (const l of all) { const k = Math.round(l.x / 3) * 3; cnt[k] = (cnt[k] || 0) + 1; }
    A = Math.min(...Object.keys(cnt).filter(k => cnt[k] >= all.length * .05).map(Number));
  }
  const mode = (ls, lo, hi) => { const cnt = {}; for (const l of ls) { const d = l.x - A; if (d >= lo && d <= hi) { const k = Math.round(d / 3) * 3; cnt[k] = (cnt[k] || 0) + 1; } } const ks = Object.keys(cnt); return ks.length ? +ks.sort((a, b) => cnt[b] - cnt[a])[0] : null; };
  const Dc = mode(all.filter(l => pdfUpper(l.t) && l.t.length <= 45 && !PDF_HEAD.test(l.t) && !/:$/.test(l.t)), 100, 260) ?? 158;
  const Dp = mode(all.filter(l => /^\(/.test(l.t)), 30, Dc - 10) ?? 115;
  const Dd = mode(all.filter(l => !pdfUpper(l.t) && !/^\(/.test(l.t)), 30, Math.min(Dp, Dc) - 6) ?? 72;
  const R = med(all.filter(l => Math.abs(l.x - A) < 6).map(l => l.x2)) || A + 432;
  // 5) tipo de cada línea
  let inParen = false;
  for (const l of all) {
    const d = l.x - A, t = l.t;
    let k;
    if (inParen && Math.abs(d - Dp) < 28) k = 'p';
    else if (Math.abs(d) < 18) k = PDF_HEAD.test(t) ? 'h' : (/^(FADE IN|FUNDIDO DE(SDE)?( NEGRO)?|ABRE EN|FADE OUT|FUNDIDO A NEGRO)[.:]?$/i.test(t) ? 'tr' : 'a');
    else if (/^\(/.test(t) && Math.abs(d - Dp) < 22) k = 'p';
    else if (pdfUpper(t) && t.length <= 45 && Math.abs(d - Dc) < 34 && !/:$/.test(t) && !isTransText(t)) k = 'c';
    else if (Math.abs(d - Dd) < 24) k = 'd';
    else if (pdfUpper(t) && (d > Dc + 34 || /:$/.test(t) || PDF_TRANS.test(t))) k = 'tr';
    else if (Math.abs((l.x + l.x2) / 2 - (A + R) / 2) < 24 && d > 30) k = 'ct';
    else k = d < (Dd / 2) ? 'a' : 'd';
    if (k === 'p') inParen = !/\)\s*$/.test(t); else inParen = false;
    l.k = k;
  }
  // 6) párrafos: líneas seguidas del mismo tipo sin línea en blanco entre ellas
  const gaps = [];
  for (let i = 1; i < all.length; i++) if (all[i].p === all[i - 1].p) { const g = all[i].y - all[i - 1].y; if (g > 0) gaps.push(g); }
  // interlineado: el salto más chico que se repite (la mediana confunde líneas con líneas en blanco)
  const LH = gaps.length ? [...gaps].sort((x, y) => x - y)[Math.floor(gaps.length * .15)] : 12;
  const paras = [];
  let more = false, lastCue = '';
  const cueName = t => t.replace(/\s*\([^)]*\)\s*/g, ' ').trim().toUpperCase();
  const join = (a, b) => /\p{L}-$/u.test(a) && !/--$/.test(a) ? a + b : a + ' ' + b;
  for (let i = 0; i < all.length; i++) {
    const l = all[i], pv = all[i - 1], last = paras[paras.length - 1];
    if (PDF_MORE.test(l.t)) { more = true; continue; }
    const newPage = !pv || pv.p !== l.p, blank = pv && !newPage && l.y - pv.y > LH * 1.6;
    // la página nueva repite el personaje con (CONT'D): el diálogo sigue
    if (l.k === 'c' && newPage && more && last && (last.t === 'd' || last.t === 'p') && cueName(l.t) === lastCue) { more = false; continue; }
    if (l.k === 'c') { lastCue = cueName(l.t); more = false; }
    const cont = last && last.t === l.k && !blank && l.k !== 'h' && l.k !== 'c' && !(l.k === 'p' && /^\(/.test(l.t)) &&
      (!newPage || l.k === 'd' || (l.k === 'a' && !/[.!?:"”)…]$/.test(last.x)));
    if (cont) last.x = join(last.x, l.t);
    else paras.push(l.k === 'h' && l.n ? { t: 'h', x: l.t.replace(/^\d+[A-Z]?\.?\s+/, ''), n: l.n } : { t: l.k, x: l.t });
  }
  return { paras, title, fdTags: [] };
}

/* ---------- escenas ---------- */
function headingInfo(text) {
  let s = String(text || '').trim().replace(/\s+/g, ' ');
  const up = s.toUpperCase();
  let ie = '', rest = up;
  const m = up.match(/^(INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?|I\/E\.?|INT\.?|EXT\.?|EST\.?)(\s+|$)/);
  if (m) {
    const k = m[1].replace(/\s|\./g, '');
    ie = /INT\/EXT|EXT\/INT|I\/E/.test(k) ? 'INT/EXT' : k === 'EST' ? 'EXT' : k;
    rest = up.slice(m[0].length);
  }
  let parts = rest.split(/\s+[-–—]\s+|\s*[-–—]\s*$/).map(x => x.trim()).filter(Boolean);
  let tod = '';
  const TODS = /^(D[IÍ]A|NOCHE|ATARDECER|AMANECER|ANOCHECER|MADRUGADA|MA[ÑN]ANA|TARDE|MEDIOD[IÍ]A|CONTINUO|CONTINUA|CONTINUACI[OÓ]N|M[AÁ]S TARDE|MOMENTOS DESPU[EÉ]S|MISMO MOMENTO|DESPU[EÉ]S|DAY|NIGHT|DUSK|DAWN|MORNING|AFTERNOON|EVENING|SUNSET|SUNRISE|MAGIC HOUR|NOON|CONTINUOUS|MOMENTS LATER|SAME TIME|LATER)\b/;
  if (parts.length > 1 && TODS.test(parts[parts.length - 1])) tod = parts.pop();
  else if (parts.length === 1) {
    const mm = parts[0].match(/^(.*?)[\.\s]+(D[IÍ]A|NOCHE|ATARDECER|AMANECER|ANOCHECER|MADRUGADA|TARDE)$/);
    if (mm) { parts = [mm[1]]; tod = mm[2]; }
  }
  const loc = parts.join(' - ') || up;
  const locBase = (parts[0] || up).replace(/\s*\(.*?\)\s*/g, ' ').replace(/[\.,]$/, '').trim();
  const dn = /NOCHE|ANOCHECER|MADRUGADA|NIGHT|DUSK|EVENING/.test(tod) ? 'N' : 'D';
  return { ie: ie || 'INT', loc, locBase, set: parts.slice(1).join(' - '), tod: tod || '', dn };
}
/* ---------- series: episodios ----------
   Una serie es un solo proyecto con todos sus episodios: el reparto, las locaciones, el plan y el presupuesto son
   uno solo y una jornada puede juntar escenas de varios episodios (rodaje por bloques). El primer encabezado de cada
   episodio lleva p.ep (su número: 101, 2, S1E3…) y sus escenas se numeran dentro del episodio con el número delante
   (101-1, 101-2, 101-2A…): así el desglose, el plan, la hoja de llamado y los PDF dicen de qué episodio es cada una.
   Los títulos van en P.meta.eps { número: { t } }. Un guion sin p.ep es una película, como siempre. */
const epOk = v => v != null && /^[A-Za-z0-9.]{1,6}$/.test(String(v)) && safeKey(v);
const epPrefix = k => { const m = /^([A-Za-z0-9.]{1,6})-/.exec(String(k)); return m ? m[1] : ''; };
const isSeries = P => !!(P && Array.isArray(P.paras) && P.paras.some(p => p.t === 'h' && epOk(p.ep)));
const epTitle = (P, n) => { const e = P && P.meta && P.meta.eps && P.meta.eps[n]; return e && typeof e.t === 'string' ? e.t : ''; };
const epLabel = (P, n) => `Episodio ${n}${epTitle(P, n) ? ' · ' + epTitle(P, n) : ''}`;
function computeScenes(paras) {
  const scenes = [], eps = [];
  const used = new Set();
  let auto = 0, ep = '', epAuto = 0;
  paras.forEach((p, i) => {
    if (p.t !== 'h') return;
    if (epOk(p.ep) && String(p.ep) !== ep) { ep = String(p.ep); epAuto = 0; eps.push({ n: ep, s0: scenes.length, s1: scenes.length, p0: i }); }
    auto++; epAuto++;
    // «__proto__» y parecidos no sirven de número de escena; en una serie, sin número fijado: episodio-escena
    let key = p.n && safeKey(p.n) ? p.n : ep ? ep + '-' + epAuto : String(auto);
    while (used.has(key)) key += '*';
    used.add(key);
    if (scenes.length) scenes[scenes.length - 1].p1 = i;
    scenes.push({ key, idx: scenes.length, p0: i, p1: paras.length, heading: p.x, ep, ...headingInfo(p.x) });
    if (eps.length) eps[eps.length - 1].s1 = scenes.length;
  });
  const sceneOf = new Int32Array(paras.length).fill(-1);
  scenes.forEach(s => { for (let i = s.p0; i < s.p1; i++) sceneOf[i] = s.idx; });
  return { scenes, sceneOf, byKey: Object.fromEntries(scenes.map(s => [s.key, s])), eps };
}
/* cambia los episodios (mutate) y deja cada escena con el número de su episodio delante. Antes de cambiar se fijan los
   números de todas las escenas, para que lo de cada una (desglose, plan, planos, notas) la siga. Las escenas que ya
   tienen el número bien no cambian; las que pasan a otro episodio conservan su número si está libre (5 → 101-5) y si
   no, toman el siguiente del episodio. fresh: episodios que se numeran de nuevo, 1, 2, 3… Devuelve { viejo: nuevo } */
function epApply(P, mutate, fresh = []) {
  const old = computeScenes(P.paras).scenes;
  old.forEach(s => { P.paras[s.p0].n = s.key; });
  if (mutate) mutate();
  const F = new Set(fresh.map(String)), heads = [];
  let ep = '';
  P.paras.forEach(p => { if (p.t !== 'h') return; if (epOk(p.ep)) ep = String(p.ep); heads.push({ p, ep }); });
  const ok = h => !h.ep || (!F.has(h.ep) && h.p.n && epPrefix(h.p.n) === h.ep);
  const taken = new Set(heads.filter(ok).map(h => h.p.n).filter(Boolean));
  const fits = k => k.length <= 16 && safeKey(k) && !taken.has(k);
  const nextOf = {}, next = e => { let k; do { k = e + '-' + (nextOf[e] = (nextOf[e] || 0) + 1); } while (!fits(k)); return k; };
  const map = {};
  for (const h of heads) {
    if (ok(h)) continue;
    const suf = h.p.n ? String(h.p.n).slice(epPrefix(h.p.n).length ? epPrefix(h.p.n).length + 1 : 0) : '';
    const want = h.ep + '-' + suf;
    const nk = !F.has(h.ep) && suf && fits(want) ? want : next(h.ep);
    taken.add(nk);
    if (h.p.n && h.p.n !== nk) map[h.p.n] = nk;
    h.p.n = nk;
  }
  sceneRename(P, map);
  return map;
}
/* un guion entero como episodio nuevo al final. Los números de escena del archivo se conservan con el del episodio
   delante (12 → 104-12). Si el proyecto todavía no es serie, lo que ya tiene pasa a ser el primer episodio (first).
   Devuelve dónde empieza el episodio en P.paras (para correr las marcas del archivo) */
function epAppend(P, paras, n, title, first) {
  n = String(n);
  if (!isSeries(P) && P.paras.some(p => p.t === 'h')) epConvert(P, first || '1');
  const list = paras.map(p => { const o = { ...p }; delete o.ep; delete o.lpg; delete o.rv; delete o.rvw; delete o.rvd; if (o.t === 'h' && o.n) o.n = n + '-' + o.n; return o; });
  const h = list.findIndex(p => p.t === 'h');
  if (h < 0) list.unshift({ t: 'h', x: 'INT. LUGAR - DÍA', ep: n }); else list[h].ep = n;
  const at = P.paras.length;
  epApply(P, () => { P.paras = P.paras.concat(list); });
  epSetTitle(P, n, title);
  return at + (h < 0 ? 1 : 0);
}
/* la película entera pasa a ser el episodio n (sus escenas: 5 → 101-5) */
function epConvert(P, n) {
  const i = P.paras.findIndex(p => p.t === 'h');
  if (i < 0) return {};
  return epApply(P, () => { P.paras[i].ep = String(n); });
}
function epSetTitle(P, n, title) {
  P.meta.eps = P.meta.eps && typeof P.meta.eps === 'object' ? P.meta.eps : {};
  const t = String(title || '').trim().slice(0, 120);
  if (t) P.meta.eps[n] = { t }; else delete P.meta.eps[n];
}
/* cambia el número de un episodio (101 → 201): sus escenas, su título y lo de cada escena van con él */
function epRenum(P, from, to) {
  from = String(from); to = String(to);
  if (!epOk(to) || from === to || computeScenes(P.paras).eps.some(e => e.n === to)) return null;
  const t = epTitle(P, from);
  const map = epApply(P, () => { for (const p of P.paras) if (p.t === 'h' && String(p.ep) === from) p.ep = to; });
  if (P.meta.eps) delete P.meta.eps[from];
  epSetTitle(P, to, t);
  return map;
}
/* las escenas de cada episodio en que aparece cada elemento (personaje, locación, utilería…): { id: [ep, …] } */
function elEpisodes(sc, sem) {
  const out = {};
  sem.forEach((set, si) => { const e = sc.scenes[si] && sc.scenes[si].ep; if (!e) return; for (const id of set) { const L = out[id] || (out[id] = []); if (!L.includes(e)) L.push(e); } });
  return out;
}

/* ---------- maquetación: Courier 12, 55 líneas, página carta ---------- */
const LINES_PER_PAGE = 55;
const LAYOUT = {
  h: { ind: 0, w: 60, before: 2, keep: 2 }, a: { ind: 0, w: 60, before: 1 }, c: { ind: 22, w: 38, before: 1, keep: 1 },
  p: { ind: 16, w: 26, before: 0 }, d: { ind: 10, w: 35, before: 0 }, tr: { ind: 40, w: 20, before: 1, right: true },
  sh: { ind: 0, w: 60, before: 1, keep: 1 }, g: { ind: 0, w: 60, before: 1 }, ct: { ind: 0, w: 60, before: 1, center: true },
  v: { ind: 0, w: 28, before: 1 }, u: { ind: 31, w: 28, before: 0 },
};
function wrapText(text, w) {
  // saltos de línea dentro del párrafo (celdas del guion AV): cada tramo se ajusta por separado
  if (text.includes('\n')) {
    const out = []; let base = 0;
    for (const part of text.split('\n')) { for (const r of wrapText(part, w)) out.push({ o: base + r.o, len: r.len }); base += part.length + 1; }
    return out;
  }
  const out = [];
  const n = text.length;
  if (!n) return [{ o: 0, len: 0 }];
  let o = 0;
  while (o < n) {
    if (n - o <= w) { out.push({ o, len: n - o }); break; }
    let cut = -1;
    for (let k = o + w; k > o; k--) if (text[k] === ' ') { cut = k; break; }
    if (cut <= o) { out.push({ o, len: w }); o += w; continue; }
    out.push({ o, len: cut - o });
    o = cut + 1;
    while (text[o] === ' ' && o < n) o++;
  }
  return out;
}
/* guion cerrado: el primer párrafo de cada página guarda su número (p.lpg = [[posición, número], …]; la posición es 0
   si la página empieza con el párrafo, o dónde empieza si la página arranca a mitad de él). Con esas marcas cada página
   empieza donde empezaba al cerrar el guion: lo que se agrega y no cabe va en páginas con letra (30A, 30B) y lo que se
   quita deja la página más corta. Las páginas que se agregan antes de la primera son A1, B1… */
const lockedPages = paras => { for (const p of paras) if (p.lpg) return true; return false; };
const pageLabel = (pages, pi) => pages && pages.labels ? pages.labels[pi] || String(pi + 1) : String(pi + 1);
function layoutScript(paras) {
  const pages = [];
  let cur = [];
  const locked = lockedPages(paras), st = [];
  let lab = null, ov = 0, pend = null;
  // natural: la página siguiente continúa con letra; con marca: empieza la página marcada
  const newPage = mark => { pages.push(cur); st.push([lab, ov]); cur = []; if (mark != null) { lab = mark; ov = 0; } else ov++; };
  const forced = mark => { if (cur.length) newPage(mark); else { lab = mark; ov = 0; } };
  const marksOf = par => locked && Array.isArray(par.lpg) ? par.lpg : null;
  const isUpper = t => t === 'h' || t === 'c' || t === 'tr' || t === 'sh';
  for (let i = 0; i < paras.length; i++) {
    const par = paras[i];
    if (par.t === 'v' || par.t === 'u') {
      // guion AV: video y audio de una fila van lado a lado; la fila ocupa las líneas de la celda más larga
      const v = par.t === 'v' ? par : null, u = par.t === 'u' ? par : paras[i + 1] && paras[i + 1].t === 'u' ? paras[i + 1] : null;
      const iv = v ? i : -1, iu = u ? (par.t === 'u' ? i : i + 1) : -1;
      const wv = v ? wrapText(v.x, 28) : [], wu = u ? wrapText(u.x, 28) : [];
      const n = Math.max(1, wv.length, wu.length);
      if (cur.length && cur.length + 1 + n > LINES_PER_PAGE) newPage();
      if (cur.length) cur.push({ blank: true, p: i });
      for (let k = 0; k < n; k++) {
        const own = k < wv.length || iu < 0 ? iv : iu, r = (own === iv ? wv : wu)[own === iv ? k : Math.min(k, wu.length - 1)] || { o: 0, len: 0 };
        const ln = { p: own, o: r.o, len: k < (own === iv ? wv : wu).length ? r.len : 0, ind: own === iv ? 0 : 31, t: own === iv ? 'v' : 'u' };
        if (k === 0 && iv >= 0 && iu >= 0) ln.p2 = iu;
        cur.push(ln);
        if (cur.length >= LINES_PER_PAGE && k < n - 1) newPage();
      }
      if (iu > i) i = iu;
      continue;
    }
    const L = LAYOUT[par.t] || LAYOUT.a;
    let text = par.x;
    if (isUpper(par.t)) text = text.toUpperCase();
    const wraps = wrapText(text, L.w).map(r => {
      let ind = L.ind;
      if (L.right) ind = Math.max(0, 60 - r.len);
      if (L.center) ind = Math.max(0, Math.floor((60 - r.len) / 2));
      return { p: i, o: r.o, len: r.len, ind, t: par.t };
    });
    const mk = marksOf(par);
    if (par.t === 'h' && par.ep != null && cur.length && !locked) newPage();   // cada episodio empieza en página nueva
    const m0 = mk && mk.find(m => m && !(+m[0] > 0));
    if (m0) { pend = null; forced(String(m0[1])); }
    else if (pend != null) { forced(pend); pend = null; }
    const mids = mk ? mk.filter(m => m && +m[0] > 0).sort((a, b) => a[0] - b[0]) : [];
    let before = cur.length ? L.before : 0;
    if (par.t === 'd' || par.t === 'p') before = 0;
    if (mids.length) {
      // la página empezaba a mitad de este párrafo: se corta donde cortaba (o donde caiga ahora esa posición)
      for (let b = 0; b < before; b++) cur.push({ blank: true, p: i });
      let mi = 0;
      wraps.forEach((w, k) => {
        if (k > 0 && mi < mids.length && w.o >= +mids[mi][0]) { forced(String(mids[mi][1])); mi++; while (mi < mids.length && w.o >= +mids[mi][0]) mi++; }
        else if (cur.length >= LINES_PER_PAGE) newPage();
        cur.push(w);
      });
      if (mi < mids.length) pend = String(mids[mids.length - 1][1]);   // el párrafo se acortó: la página empieza con el que sigue
      continue;
    }
    const nx = paras[i + 1], nxMark = locked && nx && Array.isArray(nx.lpg) && nx.lpg.some(m => m && !(+m[0] > 0));
    const keep = L.keep && !nxMark ? Math.min(L.keep, nextLinesCount(paras, i)) : 0;
    const avail = LINES_PER_PAGE - cur.length;
    const need = before + wraps.length;
    if (need + keep <= avail) {
      for (let b = 0; b < before; b++) cur.push({ blank: true, p: i });
      cur.push(...wraps);
      continue;
    }
    const splittable = (par.t === 'a' || par.t === 'd' || par.t === 'g') && wraps.length >= 4;
    const fitHere = avail - before;
    if (splittable && fitHere >= 2 && wraps.length - fitHere >= 2) {
      for (let b = 0; b < before; b++) cur.push({ blank: true, p: i });
      cur.push(...wraps.slice(0, fitHere));
      newPage();
      let rest = wraps.slice(fitHere);
      while (rest.length > LINES_PER_PAGE) { cur.push(...rest.slice(0, LINES_PER_PAGE)); newPage(); rest = rest.slice(LINES_PER_PAGE); }
      cur.push(...rest);
      continue;
    }
    if (cur.length) newPage();
    let rest = wraps;
    while (rest.length > LINES_PER_PAGE) { cur.push(...rest.slice(0, LINES_PER_PAGE)); newPage(); rest = rest.slice(LINES_PER_PAGE); }
    cur.push(...rest);
  }
  if (cur.length || !pages.length) { pages.push(cur); st.push([lab, ov]); }
  if (locked) {
    const first = (st.find(x => x[0] != null) || ['1'])[0];
    let pre = 0;
    pages.labels = st.map(([l, o]) => l == null ? shotLetter(++pre) + first : o ? l + shotLetter(o) : l);
  }
  return pages;
}
function nextLinesCount(paras, i) {
  const n = paras[i + 1];
  if (!n) return 0;
  const L = LAYOUT[n.t] || LAYOUT.a;
  return Math.min(2, wrapText(n.x, L.w).length) + (n.t === 'd' || n.t === 'p' ? 0 : L.before);
}
/* longitud de cada escena en 1/8 de página y página donde empieza */
function sceneMetrics(paras, pages, sc) {
  const lines = new Array(sc.scenes.length).fill(0);
  const page = new Array(sc.scenes.length).fill(0);
  const paraPage = new Int32Array(paras.length).fill(0);
  pages.forEach((pg, pi) => {
    for (const ln of pg) {
      const s = sc.sceneOf[ln.p];
      if (s >= 0) lines[s]++;
      if (!ln.blank && paraPage[ln.p] === 0) paraPage[ln.p] = pi + 1;
      if (!ln.blank && ln.p2 != null && paraPage[ln.p2] === 0) paraPage[ln.p2] = pi + 1;
    }
  });
  sc.scenes.forEach((s, i) => { page[i] = pages.labels ? pageLabel(pages, (paraPage[s.p0] || 1) - 1) : paraPage[s.p0] || 1; });
  return { eighths: lines.map(l => Math.max(1, Math.round(l * 8 / LINES_PER_PAGE))), page, paraPage };
}

/* ---------- personajes ---------- */
function normCue(x) {
  return String(x || '').toUpperCase()
    .replace(/\((V\.?\s?O\.?|O\.?\s?S\.?|O\.?\s?C\.?|CONT['’]?D|CONT\.?|CONTINÚA|CONTINUA|OFF|EN OFF|VOZ EN OFF|POR TELÉFONO|POR TELEFONO|CONT|V\.O|O\.S|SUBT\.?|PRE-?LAP)\)/g, '')
    .replace(/\s*\^\s*$/, '').replace(/[:.,]+$/, '').replace(/\s+/g, ' ').trim();
}
function castRegex(name, aliases = []) {
  const words = name.split(' ');
  const variants = new Set([name, titleCase(name), ...aliases, ...aliases.map(titleCase)]);
  if (words.length > 1 && /^(EL|LA|LOS|LAS|DON|DOÑA)$/.test(words[0])) {
    const rest = words.slice(1).join(' ');
    variants.add(rest); variants.add(titleCase(rest));
    variants.add(words[0].toLowerCase() + ' ' + titleCase(rest));
  }
  const alts = [...variants].sort((a, b) => b.length - a.length).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'));
  return new RegExp('(?<![\\p{L}\\p{N}])(?:' + alts.join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
}

/* el personaje que habla con parte del nombre con que se lo presenta: sin artículo ni cargo delante («EL», «DON»,
   «INSPECTORA»…), el nombre entero o sus primeras palabras («MARÍA QUISPE» → «MARÍA»). Solo los que tienen diálogo. */
const CAST_LEAD = new Set(['EL', 'LA', 'LOS', 'LAS', 'UN', 'UNA', 'DON', 'DOÑA', 'SR', 'SR.', 'SRA', 'SRA.', 'SEÑOR', 'SEÑORA', 'SEÑORITA', 'DR', 'DR.', 'DRA', 'DRA.',
  'DOCTOR', 'DOCTORA', 'PADRE', 'MADRE', 'HERMANO', 'HERMANA', 'SOR', 'FRAY', 'TÍO', 'TÍA', 'ABUELO', 'ABUELA', 'INSPECTOR', 'INSPECTORA', 'TENIENTE', 'CAPITÁN',
  'CAPITANA', 'SARGENTO', 'COMISARIO', 'COMISARIA', 'CABO', 'PROFESOR', 'PROFESORA', 'PROFE', 'LICENCIADO', 'LICENCIADA', 'INGENIERO', 'INGENIERA', 'MISTER', 'MISS']);
function castCueOf(name, cast) {
  const words = name.split(/\s+/);
  for (let st = 0; st < words.length; st++) {
    for (let n = words.length - st; n >= 1; n--) {
      const c = words.slice(st, st + n).join(' ');
      if ((cast.get(c) || 0) > 0 && !(n === 1 && CAST_LEAD.has(c) && st + 1 < words.length && (cast.get(words.slice(st, st + 2).join(' ')) || 0) > 0)) return c;
    }
    if (!CAST_LEAD.has(words[st])) break;   // solo se salta lo que va delante del nombre
  }
  return '';
}

/* ---------- desglose automático ---------- */
function ensureElement(P, cat, name, auto) {
  const key = cat + '|' + deaccent(name.toLowerCase());
  for (const el of Object.values(P.elements)) if (el.cat + '|' + deaccent(el.name.toLowerCase()) === key) return el;
  const el = { id: uid('e'), cat, name, auto: !!auto };
  P.elements[el.id] = el;
  return el;
}
function autoBreakdown(P, opts = {}) {
  const paras = P.paras;
  const lang = scriptLang(paras), DRX = DICT_RXS[lang] || (DICT_RXS[lang] = buildDictRx(lang));
  const sc = computeScenes(paras);
  if (opts.replaceAuto !== false) {
    P.tags = P.tags.filter(t => !t.auto);
    const used = new Set(P.tags.map(t => t.el));
    for (const id of Object.keys(P.elements)) if (P.elements[id].auto && !used.has(id)) delete P.elements[id];
  }
  const has = new Set(P.tags.map(t => sc.sceneOf[t.p] + '|' + t.el));
  let added = 0;
  const addTag = (p, s, e, cat, name) => {
    // no pisar marcas existentes
    if (P.tags.some(t => t.p === p && t.s < e && s < t.e)) return;
    const el = ensureElement(P, cat, name, true);
    const k = sc.sceneOf[p] + '|' + el.id;
    if (has.has(k)) return;
    has.add(k);
    P.tags.push({ id: uid('t'), el: el.id, p, s, e, auto: true });
    added++;
  };
  const cast = new Map();
  // 0. etiquetas nativas del .fdx (tienen prioridad sobre las sugerencias)
  added += importFdTags(P, opts.fdTags || []);
  P.tags.forEach(t => has.add(sc.sceneOf[t.p] + '|' + t.el));
  if (opts.noDict) return added;
  // 1. reparto desde los nombres de personaje
  paras.forEach(p => { if (p.t === 'c' && !isTransText(p.x)) { const n = normCue(p.x); if (n && n.length <= 40) cast.set(n, (cast.get(n) || 0) + 1); } });
  // guion AV: «NOMBRE: texto» en el audio es un personaje (salvo locutor y voz en off genéricos)
  const AV_CUE = /^\s*([\p{Lu}][\p{Lu} .'’-]{1,30}?)\s*(\([^)]*\))?\s*:/u;
  paras.forEach(p => { if (p.t !== 'u') return; const m = p.x.match(AV_CUE); if (m) { const n = normCue(m[1]); if (n && !/^(LOCUTOR|LOCUTORA|VOZ|VOZ EN OFF|VO|OFF|SFX|MÚSICA|MUSICA|EFECTO|EFECTOS|AUDIO|SONIDO|ANNCR|SUPER|GRÁFICA|GRAFICA)$/.test(n)) cast.set(n, (cast.get(n) || 0) + 1); } });
  // personajes presentados en acción con edad: "EL COBRADOR (30s)". Si quien habla se llama igual o con parte de ese
  // nombre («MARÍA QUISPE (42)» y luego «MARÍA»; «INSPECTORA ROSA CHÁVEZ (45)» y «ROSA»), es la misma persona
  const intro = /(?<![\p{L}\-])((?:EL |LA |LOS |LAS |UN |UNA |DON |DOÑA )?\p{Lu}[\p{Lu}']+(?:[ ,]+\p{Lu}[\p{Lu}']+){0,3})\s*\((\d{1,2}(?:s|\s*años)?|\d0s)\)/gu;
  const aliases = new Map();
  paras.forEach(p => {
    if (p.t !== 'a') return;
    for (const m of p.x.matchAll(intro)) {
      let n = m[1].replace(/,.*$/, '').trim();
      if (n.length < 2 || cast.has(n)) continue;
      const cue = castCueOf(n, cast);
      if (cue) { if (!aliases.has(cue)) aliases.set(cue, new Set()); aliases.get(cue).add(n); }
      else cast.set(n, 0);
    }
  });
  const castRx = [...cast.keys()].sort((a, b) => b.length - a.length).map(n => ({ n, rx: castRegex(n, [...(aliases.get(n) || [])]) }));
  for (const s of sc.scenes) {
    for (const { n, rx } of castRx) {
      let done = false;
      for (let i = s.p0 + 1; i < s.p1 && !done; i++) {
        const p = paras[i];
        if (p.t === 'c' || p.t === 'u' && AV_CUE.test(p.x) && normCue(p.x.match(AV_CUE)[1]) === n) {
          if (normCue(p.t === 'u' ? p.x.match(AV_CUE)[1] : p.x) === n) { const st = p.x.toUpperCase().indexOf(n); addTag(i, Math.max(0, st), Math.max(0, st) + n.length, 'cast', n); done = true; }
        } else if (p.t === 'a' || p.t === 'g' || p.t === 'v') {
          rx.lastIndex = 0;
          const m = rx.exec(p.x);
          if (m) { addTag(i, m.index, m.index + m[0].length, 'cast', n); done = true; }
        }
      }
    }
  }
  // 2. diccionario y onomatopeyas en la acción
  const ono = new RegExp('(?<![\\p{L}])((?:' + ONOMATOPOEIA.join('|') + ')(?:[-–](?:' + ONOMATOPOEIA.join('|') + '|\\p{Lu}+))*|\\p{Lu}{2,}(?:-\\p{Lu}{2,}){2,})(?![\\p{L}])!*', 'gu');
  for (const s of sc.scenes) {
    for (let i = s.p0 + 1; i < s.p1; i++) {
      const p = paras[i];
      if (p.t !== 'a' && p.t !== 'g' && p.t !== 'v') continue;
      const lower = p.x.toLowerCase();
      for (const d of DRX) {
        d.rx.lastIndex = 0;
        const m = d.rx.exec(lower);
        if (m) addTag(i, m.index, m.index + m[0].length, d.cat, d.name);
      }
      for (const m of p.x.matchAll(ono)) {
        const word = m[1];
        if (cast.has(word)) continue;
        const name = titleCase(word.toLowerCase()).replace(/!+$/, '').replace(/-(\p{Lu})/gu, (m, c) => '-' + c.toLowerCase());
        addTag(i, m.index, m.index + word.length, 'sound', name);
      }
    }
  }
  const used = new Set(P.tags.map(t => t.el));
  for (const id of Object.keys(P.elements)) if (!used.has(id)) delete P.elements[id];
  return added;
}
function importFdTags(P, fdTags) {
  let n = 0;
  for (const ft of fdTags) {
    const el = ensureElement(P, mapFdCategory(ft.cat), (ft.name || '').trim() || P.paras[ft.p].x.slice(ft.s, ft.e), false);
    el.auto = false;
    if (!P.tags.some(t => t.p === ft.p && t.s === ft.s && t.el === el.id)) { P.tags.push({ id: uid('t'), el: el.id, p: ft.p, s: ft.s, e: ft.e }); n++; }
  }
  return n;
}

/* ---------- elementos por escena ---------- */
function sceneElementMap(P, sc) {
  const map = sc.scenes.map(() => new Set());
  for (const t of P.tags) {
    const si = t.p >= 0 ? sc.sceneOf[t.p] : (sc.byKey[t.sc] ? sc.byKey[t.sc].idx : -1);
    if (si >= 0 && P.elements[t.el]) map[si].add(t.el);
  }
  return map;
}
function castNumbers(P, sc, sem) {
  const count = {}, firstIdx = {};
  sem.forEach((set, si) => set.forEach(id => {
    if (P.elements[id] && P.elements[id].cat === 'cast') { count[id] = (count[id] || 0) + 1; if (!(id in firstIdx)) firstIdx[id] = si; }
  }));
  const ids = Object.keys(count).sort((a, b) => count[b] - count[a] || firstIdx[a] - firstIdx[b]);
  const out = {};
  ids.forEach((id, i) => { out[id] = i + 1; });
  return out;
}

/* ---------- stripboard ---------- */
/* items del plan, en orden: escenas {k}, eventos {e} (traslados, comidas…) y cortes {d}.
   Cada corte cierra una jornada y guarda sus datos (completada, color, etapa, fecha, hora de cierre).
   Una escena dividida tiene varias filas: la principal {k} y sus partes {k, sp: 'A', e8: octavos}.
   days[i].rows: índices de items (escenas y eventos) de la jornada; keys: escenas, sin repetir. */
function scheduleDays(P, sc) {
  const items = P.schedule.items;
  const days = [];
  let cur = [], rows = [];
  items.forEach((it, i) => {
    if (it.d) { days.push({ id: it.d, keys: cur, rows, brk: it, i }); cur = []; rows = []; }
    else if (it.e) rows.push(i);
    else if (sc.byKey[it.k]) { if (!cur.includes(it.k)) cur.push(it.k); rows.push(i); }
  });
  // etapa de cada jornada: la suya o la de la jornada anterior
  const st = P.schedule.stages || [];
  let last = st.length ? st[0].id : null;
  for (const d of days) { if (d.brk.st && st.some(x => x.id === d.brk.st)) last = d.brk.st; d.stage = last; }
  return { days, bank: cur, bankRows: rows };
}
function reconcileSchedule(P, sc) {
  const seen = new Set();
  // una escena que desaparece del guion (al editarlo) guarda su fila del plan por si vuelve
  const gone = P.schedule.gone || {};
  P.schedule.items = P.schedule.items.filter(it => {
    if (it.d || it.e) return true;
    const id = it.k + '|' + (it.sp || '');
    if (!sc.byKey[it.k]) { if (!it.sp) gone[it.k] = it; return false; }
    if (seen.has(id)) return false;
    seen.add(id); return true;
  });
  for (const s of sc.scenes) if (!seen.has(s.key + '|')) { const back = gone[s.key]; P.schedule.items.push(back || { k: s.key }); delete gone[s.key]; }
  const ks = Object.keys(gone);
  if (ks.length > 60) for (const k of ks.slice(0, ks.length - 60)) delete gone[k];
  if (ks.length) P.schedule.gone = gone; else delete P.schedule.gone;
}
/* fechas de rodaje: la primera jornada empieza en «start»; cada jornada con fecha propia (brk.date)
   la fija, y las demás siguen al próximo día de rodaje (sin los días libres de la semana) */
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function shootDates(P, n) {
  const off = new Set(P.schedule.off || []);
  const brks = (P.schedule.items || []).filter(it => it.d);
  const parse = s => { const d = s ? new Date(s + 'T12:00:00') : null; return d && !isNaN(d) ? d : null; };
  const out = [];
  let prev = null;
  for (let i = 0; i < n; i++) {
    let d = parse(brks[i] && brks[i].date) || (i === 0 ? parse(P.schedule.start) : null);
    if (!d && prev) {
      d = new Date(prev); d.setDate(d.getDate() + 1);
      for (let g = 0; off.has(d.getDay()) && g < 7; g++) d.setDate(d.getDate() + 1);
    }
    out.push(d ? new Date(d) : null);
    if (d) prev = d;
  }
  return out;
}
function autoPlan(P, sc, metrics) {
  const maxE = Math.round((P.schedule.pagesPerDay || 4.5) * 8);
  const groups = new Map();
  for (const s of sc.scenes) {
    const k = s.locBase;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }
  // locaciones con más páginas primero; dentro, exteriores de día, interiores de día, luego noche
  const order = [...groups.entries()].map(([k, list]) => ({ k, list, e: list.reduce((a, s) => a + metrics.eighths[s.idx], 0) }))
    .sort((a, b) => b.e - a.e || a.list[0].idx - b.list[0].idx);
  const rank = s => (s.dn === 'N' ? 2 : 0) + (s.ie === 'EXT' ? 0 : 1);
  const seq = [];
  for (const g of order) seq.push(...g.list.slice().sort((a, b) => rank(a) - rank(b) || a.idx - b.idx));
  const items = [];
  // los datos de cada escena (hora, locación, notas, color) y sus partes se conservan
  const keep = new Map();
  for (const it of P.schedule.items || []) if (it.k) { if (!keep.has(it.k)) keep.set(it.k, []); keep.get(it.k).push(it); }
  let cur = 0, curDN = null, count = 0, curLoc = null;
  for (const s of seq) {
    const e = metrics.eighths[s.idx];
    const backToDay = curDN === 'N' && s.dn === 'D';
    // cambiar de locación a media jornada solo si queda bastante jornada (menos traslados del equipo)
    const move = curLoc != null && s.locBase !== curLoc && cur >= maxE * .6;
    if (count && (cur + e > maxE * 1.15 || backToDay || move)) { items.push({ d: uid('d') }); cur = 0; count = 0; curDN = null; }
    items.push(...(keep.get(s.key) || [{ k: s.key }]));
    cur += e; count++; curDN = s.dn; curLoc = s.locBase;
  }
  if (count) items.push({ d: uid('d') });
  P.schedule.items = items;
}

/* ---------- numeración de planos ----------
   Normales: 1.1, 1.2…  No previsto debajo de otro: 1.1A, 1.1B…  Pick-up de un plano: 1.1PU, 1.1PU2…
   sh.of = plano de referencia; sh.pu = pick-up. list: planos de la escena ordenados por «ord». */
const shotLetter = n => { let s = ''; for (n = n - 1; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + n % 26) + s; return s; };
function shotCodes(k, list) {
  const code = {}, byId = new Map(list.map(s => [s.id, s]));
  const refOf = sh => sh.of && byId.has(sh.of) && sh.of !== sh.id ? byId.get(sh.of) : null;
  let n = 0;
  for (const sh of list) if (!refOf(sh)) code[sh.id] = k + '.' + (++n);
  const cnt = {};
  // no previstos: siempre cuelgan de un plano normal
  for (const sh of list) {
    const r = refOf(sh); if (!r || sh.pu) continue;
    const base = refOf(r) && !r.pu ? refOf(r) : r;
    if (code[base.id] == null) { code[sh.id] = k + '.' + (++n); continue; }
    cnt[base.id] = (cnt[base.id] || 0) + 1;
    code[sh.id] = code[base.id] + shotLetter(cnt[base.id]);
  }
  // pick-ups: de cualquier plano (también de un no previsto)
  for (const sh of list) {
    const r = refOf(sh); if (!r || !sh.pu) continue;
    if (code[r.id] == null) { code[sh.id] = k + '.' + (++n); continue; }
    const c = cnt[r.id + '|pu'] = (cnt[r.id + '|pu'] || 0) + 1;
    code[sh.id] = code[r.id] + 'PU' + (c > 1 ? c : '');
  }
  return code;
}

/* ---------- presupuesto ---------- */
const BUD_SECTIONS = [
  { id: 'dev', code: '01', name: 'Desarrollo y guion' },
  { id: 'pre', code: '02', name: 'Preproducción' },
  { id: 'cast', code: '03', name: 'Elenco' },
  { id: 'extras', code: '04', name: 'Figuración' },
  { id: 'crew', code: '05', name: 'Equipo técnico' },
  { id: 'camera', code: '06', name: 'Cámara, luces y grip' },
  { id: 'sound', code: '07', name: 'Sonido directo' },
  { id: 'art', code: '08', name: 'Arte, atrezzo y ambientación' },
  { id: 'ward', code: '09', name: 'Vestuario y peluquería' },
  { id: 'loc', code: '10', name: 'Locaciones' },
  { id: 'trans', code: '11', name: 'Transporte' },
  { id: 'food', code: '12', name: 'Alimentación' },
  { id: 'post', code: '13', name: 'Posproducción' },
  { id: 'gen', code: '14', name: 'Gastos generales y seguros' },
];
const UNITS = ['día', 'semana', 'persona', 'unid.', 'global', 'mes'];
/* lo que el programa escribe en el proyecto (nombres de líneas, tareas, títulos): en el idioma elegido al crearlo */
const trData = s => typeof tr === 'function' ? tr(s) : s;
function budgetTemplate() {
  const L = (sec, name, qty, unit, mult, rate, link, qlink, note) => ({ id: uid('b'), sec, name: trData(name), qty, unit, mult, rate, link: link || null, qlink: qlink || null, note: note ? trData(note) : '' });
  return [
    L('dev', 'Derechos de guion', 1, 'global', 1, 0, null, null, 'Aporte en especie'),
    L('pre', 'Scouting de locaciones', 1, 'día', 4, 150),
    L('pre', 'Casting', 1, 'global', 1, 2000),
    L('pre', 'Ensayos con elenco', 1, 'día', 5, 200),
    L('crew', 'Director/a de fotografía', 1, 'día', 0, 400, 'shoot'),
    L('crew', 'Asistente de cámara', 1, 'día', 0, 180, 'shoot'),
    L('crew', 'Gaffer', 1, 'día', 0, 250, 'shoot'),
    L('crew', 'Eléctrico / grip', 1, 'día', 0, 150, 'shoot'),
    L('crew', 'Director/a de arte', 1, 'día', 0, 250, 'shoot'),
    L('crew', 'Utilero/a', 1, 'día', 0, 120, 'shoot'),
    L('crew', 'Vestuarista', 1, 'día', 0, 150, 'shoot'),
    L('crew', 'Maquillador/a', 1, 'día', 0, 180, 'shoot'),
    L('crew', 'Jefe/a de producción', 1, 'día', 0, 250, 'shoot'),
    L('crew', 'Asistente de producción', 1, 'día', 0, 120, 'shoot'),
    L('crew', 'Asistente de dirección', 1, 'día', 0, 200, 'shoot'),
    L('crew', 'Script / continuista', 1, 'día', 0, 150, 'shoot'),
    L('camera', 'Kit de cámara (iPhone, estabilizador, lentes)', 1, 'día', 0, 150, 'shoot'),
    L('camera', 'Luces y grip', 1, 'día', 0, 300, 'shoot'),
    L('sound', 'Sonidista', 1, 'día', 0, 300, 'shoot'),
    L('sound', 'Microfonista', 1, 'día', 0, 150, 'shoot'),
    L('sound', 'Kit de sonido', 1, 'día', 0, 150, 'shoot'),
    L('art', 'Atrezzo (elementos del desglose)', 0, 'unid.', 1, 30, null, 'props'),
    L('art', 'Ambientación (elementos del desglose)', 0, 'unid.', 1, 80, null, 'setdress'),
    L('ward', 'Vestuario (elementos del desglose)', 0, 'unid.', 1, 60, null, 'wardrobe'),
    L('ward', 'Materiales de maquillaje', 1, 'global', 1, 800),
    L('extras', 'Figurantes', 8, 'persona', 0, 45, 'extras'),
    L('trans', 'Van de producción', 1, 'día', 0, 250, 'shoot'),
    L('food', 'Alimentación de equipo y elenco', 0, 'persona', 0, 25, 'shoot', 'people'),
    L('post', 'Montaje', 1, 'semana', 6, 2500),
    L('post', 'Corrección de color', 1, 'global', 1, 4000),
    L('post', 'Diseño y mezcla de sonido', 1, 'global', 1, 5000),
    L('post', 'Música original', 1, 'global', 1, 5000),
    L('gen', 'Seguros', 1, 'global', 1, 2000),
    L('gen', 'Gastos administrativos', 1, 'global', 1, 3000),
  ];
}
function budgetStats(P, sc, sem) {
  const { days } = scheduleDays(P, sc);
  const shoot = days.filter(d => d.keys.length).length;
  const castDays = {}, locDays = {}, vehDays = {}, castPerDay = [];
  let extrasDays = 0;
  for (const d of days) {
    if (!d.keys.length) continue;
    const els = new Set(), locs = new Set();
    for (const k of d.keys) { const s = sc.byKey[k]; locs.add(s.locBase); sem[s.idx].forEach(id => els.add(id)); }
    let castN = 0, hasExtras = false;
    els.forEach(id => {
      const el = P.elements[id];
      if (!el) return;
      if (el.cat === 'cast') { castDays[id] = (castDays[id] || 0) + 1; castN++; }
      if (el.cat === 'vehicles') vehDays[id] = (vehDays[id] || 0) + 1;
      if (el.cat === 'extras') hasExtras = true;
    });
    if (hasExtras) extrasDays++;
    castPerDay.push(castN);
    locs.forEach(l => { locDays[l] = (locDays[l] || 0) + 1; });
  }
  const countCat = c => Object.values(P.elements).filter(e => e.cat === c).length;
  const crewQty = P.budget.lines.filter(l => l.sec === 'crew' || l.sec === 'sound').reduce((a, l) => a + num(l.qty), 0);
  const avgCast = castPerDay.length ? Math.ceil(castPerDay.reduce((a, b) => a + b, 0) / castPerDay.length) : 0;
  return { shoot, castDays, locDays, vehDays, extrasDays, props: countCat('props'), setdress: countCat('setdress'), wardrobe: countCat('wardrobe'), people: crewQty + avgCast };
}
/* línea enlazada que la persona tocó (tarifa, cantidad o nota distintas de las de partida) */
function budgetLineEdited(l) {
  if (l.ed || (l.note && String(l.note).trim()) || num(l.qty) !== 1) return true;
  const def = { cast: [250, 180, 120], loc: [300], veh: [150] }[String(l.link || l.src || '').split(':')[0]];
  return def ? !def.includes(num(l.rate)) : true;
}
function syncBudget(P, sc, sem) {
  const st = budgetStats(P, sc, sem);
  const castNum = castNumbers(P, sc, sem);
  const alive = k => k.startsWith('cast:') ? !!P.elements[k.slice(5)] : k.startsWith('veh:') ? !!P.elements[k.slice(4)] : k.startsWith('loc:') ? k.slice(4) in st.locDays : true;
  // una línea que quedó sin enlace porque su elemento se quitó vuelve a enlazarse si el elemento vuelve
  for (const l of P.budget.lines) if (l.gone && l.src && alive(l.src)) { l.link = l.src; delete l.src; delete l.gone; }
  const lines = P.budget.lines;
  const have = new Set(lines.flatMap(l => [l.link, l.src]).filter(Boolean));
  // elenco
  Object.keys(castNum).forEach(id => {
    const k = 'cast:' + id;
    if (!have.has(k)) {
      const n = castNum[id];
      lines.push({ id: uid('b'), sec: 'cast', name: P.elements[id].name, qty: 1, unit: 'día', mult: 0, rate: n <= 2 ? 250 : n <= 5 ? 180 : 120, link: k, qlink: null, note: '' });
    }
  });
  Object.keys(st.locDays).forEach(base => {
    const k = 'loc:' + base;
    if (!have.has(k)) lines.push({ id: uid('b'), sec: 'loc', name: titleCase(base), qty: 1, unit: 'día', mult: 0, rate: 300, link: k, qlink: null, note: '' });
  });
  Object.values(P.elements).filter(e => e.cat === 'vehicles').forEach(e => {
    const k = 'veh:' + e.id;
    if (!have.has(k)) lines.push({ id: uid('b'), sec: 'trans', name: trData('Vehículo en escena') + ': ' + e.name, qty: 1, unit: 'día', mult: 0, rate: 150, link: k, qlink: null, note: '' });
  });
  // elementos que ya no están: su línea se va si nadie la tocó; si se tocó, queda sin enlace (no se pierde la tarifa)
  const gone = [];
  P.budget.lines = lines.filter(l => {
    if (!l.link || alive(l.link)) return true;
    if (budgetLineEdited(l)) { l.src = l.link; l.link = null; l.gone = 1; gone.push(l.name); return true; }
    return false;
  });
  st.gone = gone;
  // actualizar cantidades y días enlazados
  for (const l of P.budget.lines) {
    if (l.link === 'shoot') l.mult = st.shoot;
    else if (l.link === 'extras') l.mult = st.extrasDays;
    else if (l.link && l.link.startsWith('cast:')) { l.mult = st.castDays[l.link.slice(5)] || 0; if (P.elements[l.link.slice(5)]) l.name = P.elements[l.link.slice(5)].name; }
    else if (l.link && l.link.startsWith('loc:')) l.mult = st.locDays[l.link.slice(4)] || 0;
    else if (l.link && l.link.startsWith('veh:')) l.mult = st.vehDays[l.link.slice(4)] || 0;
    else if (l.link && l.link.startsWith('luz:')) l.mult = st.shoot;   // luces del storyboard: alquiler por los días de rodaje
    if (l.qlink === 'props') l.qty = st.props;
    if (l.qlink === 'setdress') l.qty = st.setdress;
    if (l.qlink === 'wardrobe') l.qty = st.wardrobe;
    if (l.qlink === 'people') l.qty = st.people;
  }
  return st;
}
function budgetTotals(P) {
  const bySec = {};
  let sub = 0;
  for (const l of P.budget.lines) {
    const t = num(l.qty) * num(l.mult) * num(l.rate);
    bySec[l.sec] = (bySec[l.sec] || 0) + t;
    sub += t;
  }
  const cont = sub * num(P.budget.contingency) / 100;
  const igv = P.budget.igv ? (sub + cont) * num(P.budget.igvRate) / 100 : 0;
  return { bySec, sub, cont, igv, total: sub + cont + igv };
}
/* ---------- gastos reales (pestaña Gastos, web con cuentas) ----------
   Por partida: comprometido (órdenes y reembolsos aprobados sin pagar) y gastado (órdenes y reembolsos pagados y los
   recibos de caja chica no anulados). Las órdenes de compra cuentan sin el impuesto, como el presupuesto (que lo suma
   aparte al final); los recibos y reembolsos, por lo que se pagó. La partida de cada gasto es la de su línea del
   presupuesto; si la línea ya no está, la que se eligió. */
function gastosTotals(P) {
  const g = P.gastos || {}, lines = (P.budget && P.budget.lines) || [], lsec = new Map(lines.map(l => [l.id, l.sec]));
  const secOf = x => lsec.get(x.line) || x.sec || 'gen';
  const bySec = {}, byLine = {};
  const add = (x, k, v) => {
    const s = secOf(x), o = bySec[s] || (bySec[s] = { comp: 0, spent: 0 }); o[k] += v;
    if (x.line) { const l = byLine[x.line] || (byLine[x.line] = { comp: 0, spent: 0 }); l[k] += v; }
  };
  let comp = 0, spent = 0, nComp = 0;
  for (const o of g.ocs || []) {
    const v = num(o.amount);
    if (o.state === 'ok') { add(o, 'comp', v); comp += v; nComp++; }
    else if (o.state === 'paid') { add(o, 'spent', v); spent += v; }
  }
  for (const r of g.reemb || []) {
    const v = num(r.amount);
    if (r.state === 'ok') { add(r, 'comp', v); comp += v; nComp++; }
    else if (r.state === 'paid') { add(r, 'spent', v); spent += v; }
  }
  // caja chica: lo entregado, lo rendido (recibos no anulados), lo que falta revisar y lo que se rindió sin comprobante
  const caja = { given: 0, rendered: 0, inHand: 0, n: 0, toReview: 0, noReceipt: 0, people: 0 };
  const people = new Set();
  for (const c of g.cajas || []) {
    const gv = (c.given || []).reduce((a, x) => a + num(x.amount), 0);
    let rd = 0;
    for (const r of c.recibos || []) {
      if (r.void) continue;
      const v = num(r.amount);
      add(r, 'spent', v); spent += v; rd += v; caja.n++;
      if (!r.ok) caja.toReview++;
      if (r.kind === 'sc') caja.noReceipt += v;
    }
    caja.given += gv; caja.rendered += rd; people.add(c.uid || c.name || c.id);
    if (!c.closed) caja.inHand += gv - rd;
  }
  caja.people = people.size;
  return { bySec, byLine, comp, spent, nComp, caja };
}
const moneyR2 = v => Math.round(v * 100) / 100;
/* el resumen por partida: presupuestado (sin imprevistos ni impuesto), comprometido, gastado, saldo y avance, solo las
   partidas con algo, y las que se pasaron. Lo usan la pantalla y el reporte de sobrecostos (las mismas cifras).
   withBudget: falso para quien no ve el presupuesto (todo presupuestado en cero) */
function gastosResumen(P, withBudget = true) {
  const T = withBudget && P.budget && Array.isArray(P.budget.lines) ? budgetTotals(P) : { bySec: {}, sub: 0, cont: 0, igv: 0, total: 0 }, G = gastosTotals(P);
  const rows = BUD_SECTIONS.map(s => {
    const b = T.bySec[s.id] || 0, x = G.bySec[s.id] || { comp: 0, spent: 0 }, used = x.comp + x.spent;
    return { ...s, budget: b, comp: x.comp, spent: x.spent, used, left: b - used, over: Math.max(0, moneyR2(used - b)), pct: b > 0 ? used / b * 100 : used > 0 ? Infinity : 0 };
  }).filter(r => r.budget > 0 || r.comp > 0 || r.spent > 0);
  const over = rows.filter(r => r.used > r.budget + 0.005);
  return { T, G, rows, over, left: T.sub - G.comp - G.spent, overSum: moneyR2(over.reduce((a, r) => a + r.over, 0)) };
}
/* una orden de compra: el monto, su impuesto (si lo lleva) y el total, con dos decimales */
function gastosOc(o, rate) {
  const net = moneyR2(num(o.amount)), tax = o.igv ? moneyR2(net * num(rate) / 100) : 0;
  return { net, tax, total: moneyR2(net + tax) };
}
/* una caja chica: lo entregado, lo rendido (recibos no anulados) y el saldo. Al cerrarla, lo que sobró se devuelve y lo
   que se gastó de más se le reembolsa a la persona: cerrada, el saldo queda en cero */
function gastosCaja(c) {
  const given = moneyR2((c.given || []).reduce((a, x) => a + num(x.amount), 0));
  const recs = (c.recibos || []).filter(r => !r.void);
  const rendered = moneyR2(recs.reduce((a, r) => a + num(r.amount), 0));
  const settle = c.closed ? num(c.closed.amount) * (c.closed.how === 'reembolsado' ? 1 : -1) : 0;
  return { given, rendered, n: recs.length, toReview: recs.filter(r => !r.ok).length, saldo: moneyR2(given + settle - rendered) };
}
/* los pagos: lo que salió de producción, por fecha. Órdenes pagadas (con su impuesto), reembolsos pagados, entregas de
   caja chica y el cierre de cada caja (lo devuelto resta; lo que se le reembolsó a la persona suma). rate: el impuesto en % */
function gastosPagos(P, rate) {
  const g = P.gastos || {}, lsec = new Map(((P.budget && P.budget.lines) || []).map(l => [l.id, l.sec]));
  const secOf = x => lsec.get(x.line) || x.sec || 'gen';
  const out = [];
  for (const o of g.ocs || []) if (o.state === 'paid') {
    const t = gastosOc(o, rate);
    out.push({ kind: 'oc', id: o.id, date: (o.paid && o.paid.date) || o.date || '', ref: o.num || '', who: o.vendor || '', desc: o.desc || '', sec: secOf(o), line: o.line || '', pay: o.pay || '', net: t.net, tax: t.tax, amount: t.total });
  }
  for (const r of g.reemb || []) if (r.state === 'paid') {
    const v = moneyR2(num(r.amount));
    out.push({ kind: 'rb', id: r.id, date: (r.paid && r.paid.date) || r.date || '', ref: '', who: r.name || '', desc: r.desc || '', sec: secOf(r), line: r.line || '', pay: '', net: v, tax: 0, amount: v });
  }
  for (const c of g.cajas || []) {
    for (const x of c.given || []) { const v = moneyR2(num(x.amount)); out.push({ kind: 'give', id: c.id + '~' + x.id, date: x.date || '', ref: '', who: c.name || '', desc: '', sec: '', line: '', pay: 'efectivo', net: v, tax: 0, amount: v }); }
    if (c.closed && num(c.closed.amount)) {
      const back = c.closed.how !== 'reembolsado', v = moneyR2(num(c.closed.amount) * (back ? -1 : 1));
      out.push({ kind: back ? 'back' : 'settle', id: c.id + '~cierre', date: c.closed.at ? isoDay(new Date(c.closed.at)) : '', ref: '', who: c.name || '', desc: '', sec: '', line: '', pay: 'efectivo', net: v, tax: 0, amount: v });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind) || a.ref.localeCompare(b.ref));
}
/* monto en dólares con el tipo de cambio escrito a mano (moneda local por 1 US$) */
const budgetFx = P => P.budget.currency !== 'US$' && P.budget.fx && P.budget.fx.on && num(P.budget.fx.rate) > 0 ? num(P.budget.fx.rate) : 0;
const toUSD = (P, v) => { const r = budgetFx(P); return r ? v / r : null; };
const taxName = P => (P.budget.taxName || 'IGV').trim() || 'IGV';
const lineTotal = l => num(l.qty) * num(l.mult) * num(l.rate);

/* ---------- proyecto nuevo ---------- */
function newProject(title, paras) {
  const today = new Date();
  const nextMon = new Date(today); nextMon.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));
  return {
    id: uid('p'),
    meta: { title: title || trData('Proyecto sin título'), author: '', draft: '', aspect: '16:9', created: Date.now() },
    paras: paras || [],
    elements: {}, tags: [], scenes: {}, shots: {},
    schedule: { start: `${nextMon.getFullYear()}-${String(nextMon.getMonth() + 1).padStart(2, '0')}-${String(nextMon.getDate()).padStart(2, '0')}`, off: [0], pagesPerDay: 4.5, call: '07:00', items: [], stages: [], locs: [], setLoc: {}, castMode: 'num' },
    // en inglés: en dólares y con el impuesto a las ventas (en español: soles e IGV, como en el Perú)
    budget: typeof EN !== 'undefined' && EN ? { currency: 'US$', contingency: 10, igv: false, igvRate: 8, taxName: 'Sales tax', fx: { on: false, rate: 3.75 }, lines: budgetTemplate() }
      : { currency: 'S/', contingency: 10, igv: false, igvRate: 18, taxName: 'IGV', fx: { on: false, rate: 3.75 }, lines: budgetTemplate() },
    sup: { takes: {}, sc: {}, day: {}, supervisor: '', roll: '' },
    call: { crew: [], talent: {}, vendors: [], hospital: { name: '', addr: '', phone: '' }, client: '', days: {} },
    calendar: { tasks: [] },
    frames: {},
  };
}
/* ---------- otra versión del guion ----------
   Se alinean los párrafos de las dos versiones como un «diff» (los iguales y únicos hacen de anclas, y entre
   anclas, los iguales en orden; los cambiados se emparejan con su vecino del mismo tipo). Las marcas siguen su
   texto, los planos sus párrafos y cada escena conserva su número: el stripboard, las notas y la hoja de
   script siguen a su escena. Las escenas nuevas toman el número de la anterior con letra (12A); si el archivo trae
   sus propios números, mandan esos. Devuelve cuántas marcas confirmadas no encontraron su texto. */
function paraAlign(A, B) {
  const ids = new Map(), idOf = k => { let v = ids.get(k); if (v == null) { v = ids.size; ids.set(k, v); } return v; };
  const a = A.map(p => idOf(p.t + '|' + p.x.trim())), b = B.map(p => idOf(p.t + '|' + p.x.trim()));
  const map = new Int32Array(A.length).fill(-1), near = new Int32Array(A.length).fill(-1);
  const fill = (a0, a1, b0, b1) => {   // tramo sin anclas: iguales en orden y, lo demás, por tipo y posición
    const n = a1 - a0, m = b1 - b0;
    if (!n || !m) return;
    if (n * m <= 160000) {   // LCS exacto en tramos chicos
      const W = m + 1, L = new Uint16Array((n + 1) * W);
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i * W + j] = a[a0 + i] === b[b0 + j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
      let i = 0, j = 0, pi = 0, pj = 0;
      const flush = (ie, je) => { const oa = [], ob = []; for (let x = pi; x < ie; x++) oa.push(a0 + x); for (let y = pj; y < je; y++) ob.push(b0 + y); pairUp(oa, ob); };
      while (i < n && j < m) {
        if (a[a0 + i] === b[b0 + j]) { flush(i, j); map[a0 + i] = b0 + j; i++; j++; pi = i; pj = j; }
        else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) i++; else j++;
      }
      flush(n, m);
    } else {
      let j = b0;
      for (let i = a0; i < a1; i++) { for (let k = j; k < Math.min(b1, j + 40); k++) if (a[i] === b[k]) { map[i] = k; j = k + 1; break; } }
    }
  };
  // los que cambiaron: el párrafo viejo y el nuevo del mismo tipo, en orden
  const pairUp = (oa, ob) => { let k = 0; for (const i of oa) { while (k < ob.length && B[ob[k]].t !== A[i].t) k++; if (k < ob.length) near[i] = ob[k++]; } };
  const rec = (a0, a1, b0, b1, depth) => {
    while (a0 < a1 && b0 < b1 && a[a0] === b[b0]) { map[a0] = b0; a0++; b0++; }
    while (a0 < a1 && b0 < b1 && a[a1 - 1] === b[b1 - 1]) { map[a1 - 1] = b1 - 1; a1--; b1--; }
    if (a0 >= a1 || b0 >= b1) return;
    // anclas: iguales que aparecen una sola vez en cada lado del tramo, en orden creciente (LIS)
    const ca = new Map(), cb = new Map();
    for (let i = a0; i < a1; i++) ca.set(a[i], ca.has(a[i]) ? -1 : i);
    for (let j = b0; j < b1; j++) cb.set(b[j], cb.has(b[j]) ? -1 : j);
    const pairs = [];
    for (let i = a0; i < a1; i++) { const x = ca.get(a[i]), y = cb.get(a[i]); if (x === i && y != null && y >= 0) pairs.push([i, y]); }
    if (!pairs.length || depth > 40) { fill(a0, a1, b0, b1); return; }
    const tails = [], prev = new Int32Array(pairs.length).fill(-1), at = [];
    pairs.forEach(([, y], k) => { let lo = 0, hi = tails.length; while (lo < hi) { const md = (lo + hi) >> 1; if (pairs[tails[md]][1] < y) lo = md + 1; else hi = md; } if (lo) prev[k] = tails[lo - 1]; tails[lo] = k; });
    for (let k = tails.length ? tails[tails.length - 1] : -1; k >= 0; k = prev[k]) at.unshift(pairs[k]);
    let pa = a0, pb = b0;
    for (const [i, j] of at) { rec(pa, i, pb, j, depth + 1); map[i] = j; pa = i + 1; pb = j + 1; }
    rec(pa, a1, pb, b1, depth + 1);
  };
  rec(0, A.length, 0, B.length, 0);
  return { map, near };
}
/* cambiar números de escena (map: número viejo → nuevo). Todo lo que se guarda por número de escena sigue a su escena:
   la sinopsis y lo de la escena, su fila del plan, la hoja de script, construcción, el animatic, los planos, lo agregado
   desde la hoja de desglose y las notas de la escena. Lo que era de una escena borrada cuyo número pasa a otra (se borró
   la 4 y la 3 pasa a ser la 4) no se mezcla con ella: se descarta (o, si es una nota o un plano, queda suelto).
   Devuelve cómo reconocer esos números «viejos» */
function sceneRename(P, map, { shots = true } = {}) {
  const targets = new Set(Object.values(map));
  const stale = k => k != null && targets.has(String(k)) && !(String(k) in map);
  if (!targets.size) return stale;
  const mv = o => {
    if (!o) return o;
    const out = {};
    for (const [k, v] of Object.entries(o)) { if (!safeKey(k) || stale(k)) continue; const nk = k in map ? map[k] : k; if (safeKey(nk)) out[nk] = v; }
    return out;
  };
  const ren = k => k in map ? map[k] : k;
  if (P.scenes) P.scenes = mv(P.scenes);
  if (P.schedule) {
    if (P.schedule.items) P.schedule.items = P.schedule.items.filter(it => !(it.k && stale(it.k))).map(it => { if (it.k) it.k = ren(it.k); return it; });
    if (P.schedule.gone) P.schedule.gone = mv(P.schedule.gone);
  }
  if (P.sup && P.sup.sc) P.sup.sc = mv(P.sup.sc);
  if (P.scEls) P.scEls = mv(P.scEls);   // luces, objetos y animales de cada escena (planta general)
  if (P.animatic && P.animatic.locked) P.animatic.locked = P.animatic.locked.filter(k => !stale(k)).map(ren);
  if (P.build) {
    if (P.build.sc) P.build.sc = mv(P.build.sc);
    for (const c of Object.values(P.build.cards || {})) if (c && c.after != null) { if (stale(c.after)) delete c.after; else c.after = ren(c.after); }
    // (lote AD) los puntos clave de la Estructura unidos a una escena escrita
    for (const b of Object.values(P.build.beats || {})) if (b && typeof b.on === 'string' && b.on.startsWith('sc:')) { const k = b.on.slice(3); if (stale(k)) delete b.on; else b.on = 'sc:' + ren(k); }
  }
  if (shots) for (const sh of Object.values(P.shots || {})) { if (sh.sc in map) sh.sc = map[sh.sc]; else if (stale(sh.sc)) sh.sc = '~' + sh.sc; }
  // lo agregado desde la hoja de desglose (sin lugar en el texto: va por número de escena)
  if (P.tags) P.tags = P.tags.filter(t => !(t.p < 0 && stale(t.sc))).map(t => { if (t.p < 0 && t.sc != null) t.sc = ren(t.sc); return t; });
  // las notas pegadas a una escena
  for (const n of Object.values(P.notes || {})) if (n && n.on && n.on.t === 'scene') { if (n.on.id in map) n.on.id = map[n.on.id]; else if (stale(n.on.id)) n.on.id = '~' + n.on.id; }
  return stale;
}
function remapProject(P, newParas) {
  const oldParas = P.paras;
  const { map, near } = paraAlign(oldParas, newParas);
  let lost = 0;
  P.tags = P.tags.filter(t => {
    if (t.p < 0) return true;
    const j = map[t.p];
    if (j >= 0) { t.p = j; return true; }
    // el párrafo cambió: la marca sigue su texto si está en el párrafo nuevo
    const k = near[t.p], txt = (oldParas[t.p] && oldParas[t.p].x || '').slice(t.s, t.e);
    if (k >= 0 && txt.trim()) {
      const x = newParas[k].x; let best = -1;
      for (let at = x.indexOf(txt); at >= 0; at = x.indexOf(txt, at + 1)) if (best < 0 || Math.abs(at - t.s) < Math.abs(best - t.s)) best = at;
      if (best >= 0) { t.p = k; t.e = best + (t.e - t.s); t.s = best; return true; }
    }
    if (!t.auto) lost++;
    return false;
  });
  const to = i => map[i] >= 0 ? map[i] : near[i];
  const nearest = (i, dir) => { for (let k = i; k >= 0 && k < oldParas.length; k += dir) if (to(k) >= 0) return to(k); return -1; };
  for (const sh of Object.values(P.shots)) {
    if (sh.p0 == null) continue;
    const a = to(sh.p0) >= 0 ? to(sh.p0) : nearest(sh.p0, 1);
    const b = to(sh.p1) >= 0 ? to(sh.p1) : nearest(sh.p1, -1);
    if (a < 0 || b < 0 || b < a) { sh.p0 = null; sh.p1 = null; } else { sh.p0 = a; sh.p1 = b; }
  }
  // cada escena conserva su número (o toma el del archivo, y lo de esa escena pasa a él)
  const oldSc = computeScenes(oldParas);
  const fromOld = new Map();
  oldSc.scenes.forEach(s => { const j = to(s.p0); if (j >= 0 && newParas[j].t === 'h' && !fromOld.has(j)) fromOld.set(j, s.key); });
  const fileNums = newParas.some(p => p.t === 'h' && p.n);
  const rename = {}, used = new Set();
  if (!fileNums) {
    for (const [j, k] of fromOld) { newParas[j].n = k; used.add(k); }
    let prev = '0';
    newParas.forEach((p, j) => {
      if (p.t !== 'h') return;
      if (fromOld.has(j)) { prev = p.n; return; }
      const base = prev.replace(/[A-Z]+$/, '');
      let n = /[A-Z]$/.test(prev) ? prev.charCodeAt(prev.length - 1) - 64 + 1 : 1, k;
      do { k = base + shotLetter(n++); } while (used.has(k));
      p.n = k; used.add(k); prev = k;
    });
  } else {
    const at = new Map(computeScenes(newParas).scenes.map(s => [s.p0, s.key]));
    for (const [j, k] of fromOld) { const nk = at.get(j); if (nk && nk !== k) rename[k] = nk; }
  }
  P.paras = newParas;
  const stale = sceneRename(P, rename, { shots: false });
  const sc = computeScenes(newParas);
  for (const sh of Object.values(P.shots)) {
    if (sh.p0 != null && sc.sceneOf[sh.p0] >= 0) sh.sc = sc.scenes[sc.sceneOf[sh.p0]].key;
    else if (sh.sc in rename) sh.sc = rename[sh.sc];
    else if (stale(sh.sc)) sh.sc = '~' + sh.sc;    // de una escena borrada cuyo número tomó otra: queda suelto
  }
  return lost;
}

if (typeof module !== 'undefined') module.exports = { epOk, epPrefix, isSeries, epTitle, epLabel, epApply, epAppend, epConvert, epSetTitle, epRenum, elEpisodes, budgetLineEdited, shootDates, isoDay, shotCodes, shotLetter, budgetFx, toUSD, CATS, parseFDX, parseFountain, parsePDFScript, computeScenes, layoutScript, pageLabel, sceneMetrics, autoBreakdown, newProject, headingInfo, fmtEighths, scheduleDays, autoPlan, reconcileSchedule, syncBudget, budgetTotals, gastosTotals, gastosResumen, gastosOc, gastosCaja, gastosPagos, BUD_SECTIONS, sceneElementMap, castNumbers, remapProject, sceneRename, wrapText };
