'use strict';
/* las paletas de cada persona (Apariencia › Colores del proyecto › Mis paletas; antes «temas»): se guardan en su
   cuenta para usarlas en cualquier proyecto. Aquí solo se limpia lo que llega: colores #RRGGBB, nombres cortos,
   cantidades con tope. «mono»: la Escala de grises. «screen» solo lo traen los temas de antes (ya no se usa) */
const HEX = /^#[0-9A-Fa-f]{6}$/;
const MAX_THEMES = 30, MAX_HL = 24, MAX_BYTES = 48 * 1024;
const TABS = ['build', 'script', 'project', 'lined', 'breakdown', 'scout', 'casting', 'board', 'animatic', 'plan', 'cal', 'budget', 'call', 'sup'];
const name = (s, n = 40) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const hex = v => typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : null;
function keys(o, allowed) {
  const out = {};
  if (!o || typeof o !== 'object') return out;
  for (const k of allowed) { const v = hex(o[k]); if (v) out[k] = v; }
  return out;
}
function hls(a) {
  if (!Array.isArray(a)) return [];
  return a.slice(0, MAX_HL).map(x => x && typeof x === 'object' ? { name: name(x.name) || 'Color', c: hex(x.c) } : null).filter(x => x && x.c);
}
const ONE = (v, ok, d) => ok.includes(v) ? v : d;
function cleanTheme(t) {
  if (!t || typeof t !== 'object') return null;
  const id = typeof t.id === 'string' && /^[\w-]{1,40}$/.test(t.id) ? t.id : null;
  if (!id) return null;
  const o = { id, name: name(t.name) || 'Tema', ts: typeof t.ts === 'number' && isFinite(t.ts) ? Math.round(t.ts) : 0 };
  o.tabc = keys(t.tabc, TABS);
  o.plan = { ...keys(t.plan, ['d', 'n', 'brk', 'ev']), hl: hls(t.plan && t.plan.hl) };
  o.cal = { ...keys(t.cal, ['pre', 'rod', 'post', 'otro']), hl: hls(t.cal && t.cal.hl) };
  o.call = keys(t.call, ['note']);
  o.cat = {};
  if (t.cat && typeof t.cat === 'object') for (const [k, v] of Object.entries(t.cat).slice(0, 40)) if (/^[a-z]{2,12}$/.test(k) && hex(v)) o.cat[k] = hex(v);
  if (t.mono === true) o.mono = true;
  const s = t.screen && typeof t.screen === 'object' ? t.screen : null;
  if (s) o.screen = { bars: ONE(s.bars, ['color', 'suave', 'blanca'], 'color'), barh: ONE(s.barh, ['normal', 'compacta'], 'normal'), lt: ONE(s.lt, ['fina', 'normal', 'gruesa'], 'normal'), lk: ONE(s.lk, ['fina', 'normal', 'gruesa'], 'normal') };
  return o;
}
function cleanThemes(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set(), out = [];
  for (const t of list.slice(0, MAX_THEMES)) { const c = cleanTheme(t); if (c && !seen.has(c.id)) { seen.add(c.id); out.push(c); } }
  while (out.length && JSON.stringify(out).length > MAX_BYTES) out.pop();
  return out;
}
const themesOf = u => { try { return cleanThemes(JSON.parse(u.themes || '[]')); } catch (e) { return []; } };
module.exports = { cleanThemes, themesOf, MAX_THEMES };
