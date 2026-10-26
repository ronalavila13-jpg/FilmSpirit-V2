/* ============================================================
   HISTORIAL DEL PROYECTO · deshacer y rehacer en todas las pestañas
   Cada tanda de cambios (lo que pasa entre una pausa y otra) es un paso: guarda cómo
   estaban las partes del proyecto que cambiaron (desglose, plan, presupuesto…).
   Deshacer devuelve solo esas partes, así que se puede deshacer lo último de la
   pestaña sin tocar lo que se escribió después en otra, si no se pisan.
   El guion (al escribir) y el animatic tienen su propio deshacer: sus pasos no se
   deshacen desde aquí, pero sí bloquean deshacer algo anterior que tocaron.
   ============================================================ */
const HIST = { base: null, undo: [], redo: [], label: '', frames: null, tab: '', timer: 0, chars: 0 };
const HIST_MAX = 80, HIST_CHARS = 24e6;
const TAB_NAME = { build: 'Historia', project: 'Proyecto', script: 'Guion', lined: 'Guion rayado', breakdown: 'Desglose', scout: 'Scouting', casting: 'Casting', board: 'Storyboard', animatic: 'Animatic', plan: 'Plan de rodaje', cal: 'Calendario', call: 'Hoja de llamado', budget: 'Presupuesto', sup: 'Hoja de script' };
// «act» (el registro de actividad sin equipo) no se deshace
const histKeys = Px => Object.keys(Px).filter(k => k[0] !== '_' && k !== 'id' && k !== 'act' && typeof Px[k] !== 'function');
function histSnap(Px) { const o = {}; for (const k of histKeys(Px)) o[k] = JSON.stringify(Px[k]); return o; }
function histReset() {
  clearTimeout(HIST.timer);
  HIST.base = P ? histSnap(P) : null;
  HIST.undo = []; HIST.redo = []; HIST.label = ''; HIST.frames = null; HIST.tab = ''; HIST.chars = 0;
  histPaint();
}
/* antes de un cambio con nombre: «Tarea eliminada». frames: imágenes que el cambio borra (se devuelven al deshacer) */
function histNote(label, frames, tab) {
  histCapture();               // lo pendiente queda en su propio paso
  HIST.label = label || '';
  if (frames && Object.keys(frames).length) HIST.frames = { ...(HIST.frames || {}), ...frames };
  if (tab) HIST.tab = tab;
}
/* changed() avisa; la foto del estado se toma en una pausa */
function histSoon() {
  if (!HIST.base) return;
  if (!HIST.tab) HIST.tab = UI.tab;
  clearTimeout(HIST.timer);
  HIST.timer = setTimeout(histCapture, 450);
}
const histOwn = tab => tab === 'animatic' || (tab === 'script' && !!UI.scriptEdit);
function histCapture() {
  clearTimeout(HIST.timer);
  if (!P || !HIST.base) return null;
  const now = histSnap(P), old = {}, nw = {};
  let n = 0;
  for (const k of new Set([...Object.keys(HIST.base), ...Object.keys(now)])) {
    if (HIST.base[k] === now[k]) continue;
    old[k] = HIST.base[k]; nw[k] = now[k];
    n += (old[k] || '').length + (nw[k] || '').length;
  }
  HIST.base = now;
  const tab = HIST.tab || UI.tab, label = HIST.label, frames = HIST.frames;
  HIST.label = ''; HIST.frames = null; HIST.tab = '';
  if (!Object.keys(old).length && !frames) return null;
  const st = { id: uid('h'), old, now: nw, tab, label, frames, n, own: histOwn(tab) };
  HIST.undo.push(st); HIST.chars += n;
  if (!st.own) HIST.redo = [];
  while (HIST.undo.length > HIST_MAX || (HIST.chars > HIST_CHARS && HIST.undo.length > 1)) HIST.chars -= HIST.undo.shift().n;
  histPaint();
  return st;
}
/* un cambio que no es un paso (la versión con que salió una hoja de llamado): pasa a la foto base sin dejar paso */
function histQuiet(k) {
  if (!P || !HIST.base || !(k in P)) return;
  clearTimeout(HIST.timer);
  HIST.base[k] = JSON.stringify(P[k]);
}
/* las versiones ya enviadas de cada jornada sobreviven a deshacer y rehacer: un archivo que salió no se «des-envía» */
const histKeepExp = () => { const o = {}; for (const [id, d] of Object.entries((P && P.call && P.call.days) || {})) if (d && d.exp) o[id] = d.exp; return o; };
const histPutExp = o => { if (!P.call || !P.call.days) return; for (const [id, e] of Object.entries(o)) { const d = P.call.days[id]; if (d) d.exp = e; } };
const histOverlap = (a, b) => Object.keys(a.old).some(k => k in b.old);
/* el paso que se puede deshacer: el último propio de esta pestaña, si lo que vino después no tocó lo mismo */
function histPick(id) {
  const U = HIST.undo;
  for (let i = U.length - 1; i >= 0; i--) {
    const s = U[i];
    if (id ? s.id !== id : s.own) continue;
    const later = U.slice(i + 1).find(l => histOverlap(s, l));
    return later ? { blocked: s, by: later } : { step: s, i };
  }
  return null;
}
function histApply(vals, frames, back) {
  const exp = 'call' in vals ? histKeepExp() : null;
  for (const [k, j] of Object.entries(vals)) { if (j === undefined) delete P[k]; else P[k] = JSON.parse(j); }
  normalizeProject(P);
  if (exp) histPutExp(exp);
  if ('faces' in vals && typeof faceChanged === 'function') for (const id of Object.keys(P.faces || {})) faceChanged(id);
  if (frames) for (const [k, u] of Object.entries(frames)) {
    if (back) FRAMES[k] = u; else delete FRAMES[k];
    if (typeof IMGS !== 'undefined') IMGS.delete(k);
    if (!UI.readOnly) Store.saveFrame(P.id, k, back ? u : null).catch(() => problem('Una imagen no se pudo guardar al deshacer.'));
  }
  derive();
  HIST.base = histSnap(P);
  if ('paras' in vals || 'meta' in vals) dirty.add('script');
  dirty.add('data'); P._touched = true; setSaveState(); saveSoon();
  render();
}
const histName = s => s.label || 'el último cambio' + (s.tab && TAB_NAME[s.tab] && s.tab !== UI.tab ? ` en ${TAB_NAME[s.tab]}` : '');
function histUndo(id) {
  if (UI.readOnly) return false;
  histCapture();
  const r = histPick(id);
  if (!r) { if (!id) toast('No hay nada que deshacer.'); return false; }
  if (r.blocked) {
    toast(`No se puede deshacer ${r.blocked.label ? '«' + r.blocked.label + '»' : 'ese cambio'}: lo que hiciste después en ${TAB_NAME[r.by.tab] || 'otra pestaña'} toca lo mismo.`, 5000);
    return false;
  }
  const s = r.step;
  HIST.undo.splice(r.i, 1); HIST.chars -= s.n;
  HIST.redo.push(s);
  histApply(s.old, s.frames, true);
  if (!id) toast(`Deshecho: ${histName(s)}.`, 3000, { label: 'Rehacer', fn: () => histRedo() });
  histPaint();
  return true;
}
function histRedo() {
  if (UI.readOnly) return false;
  histCapture();
  const s = HIST.redo[HIST.redo.length - 1];
  if (!s) { toast('No hay nada que rehacer.'); return false; }
  // solo si nada de lo que toca cambió desde que se deshizo
  const cur = histSnap(P);
  if (Object.keys(s.old).some(k => cur[k] !== s.old[k] && !(k === 'call' && histSameBut(cur[k], s.old[k])))) { HIST.redo = []; toast('Ya no se puede rehacer: hubo otros cambios.'); histPaint(); return false; }
  HIST.redo.pop();
  HIST.undo.push(s); HIST.chars += s.n;
  histApply(s.now, s.frames, false);
  toast(`Rehecho: ${histName(s)}.`, 2400);
  histPaint();
  return true;
}
/* dos fotos de la hoja de llamado iguales salvo las versiones enviadas */
function histSameBut(a, b) {
  const strip = j => { try { const o = JSON.parse(j); for (const d of Object.values((o && o.days) || {})) if (d) delete d.exp; return JSON.stringify(o); } catch { return j; } };
  return strip(a) === strip(b);
}
/* cambios que llegan del equipo: no son pasos de uno; los pasos que tocaban lo mismo ya no se pueden deshacer */
function histRemote() {
  if (!P || !HIST.base) return;
  const now = histSnap(P), touched = new Set();
  for (const k of new Set([...Object.keys(HIST.base), ...Object.keys(now)])) if (HIST.base[k] !== now[k]) touched.add(k);
  HIST.base = now;
  if (!touched.size) return;
  const keep = s => !Object.keys(s.old).some(k => touched.has(k));
  HIST.undo = HIST.undo.filter(keep); HIST.redo = HIST.redo.filter(keep);
  HIST.chars = HIST.undo.reduce((a, s) => a + s.n, 0);
  histPaint();
}
/* aviso con «Deshacer»: se llama después del cambio (derive y render ya hechos o por hacer) */
function toastUndo(msg, ms = 6500) {
  setTimeout(() => {
    const st = histCapture() || HIST.undo[HIST.undo.length - 1];
    if (!st || UI.readOnly) { toast(msg, 3000); return; }
    toast(msg, ms, { label: 'Deshacer', fn: () => histUndo(st.id) });
  }, 0);
}
/* botones de la barra superior: deshacer y rehacer de las pestañas sin deshacer propio */
function histPaint() {
  const u = $('#undoBtn'), r = $('#redoBtn');
  if (!u || !r) return;
  const own = histOwn(UI.tab), off = !P || UI.readOnly || own;
  u.hidden = r.hidden = off;
  if (off) return;
  const pk = histPick();
  u.disabled = !(pk && pk.step);
  r.disabled = !HIST.redo.length;
  u.title = pk && pk.step ? `Deshacer: ${histName(pk.step)} (Ctrl+Z)` : 'Deshacer (Ctrl+Z)';
  r.title = HIST.redo.length ? `Rehacer: ${histName(HIST.redo[HIST.redo.length - 1])} (Ctrl+Mayús+Z)` : 'Rehacer (Ctrl+Mayús+Z)';
}
/* Ctrl+Z fuera de los campos de texto, de los editores y de las pestañas con deshacer propio */
addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.defaultPrevented) return;
  const k = e.key.toLowerCase();
  if (k !== 'z' && k !== 'y') return;
  if (!P || histOwn(UI.tab) || $('#modal') || $('#ask') || $('.s2') || $('.acc-ed') || $('.fi-modal') || $('.fp-modal')) return;
  const a = document.activeElement;
  if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;   // el navegador deshace lo escrito
  e.preventDefault();
  if (k === 'y' || e.shiftKey) histRedo(); else histUndo();
});
