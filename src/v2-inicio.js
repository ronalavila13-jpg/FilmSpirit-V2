/* ============================================================
   VERSIÓN 2 · INICIO («Tu página», PDF «FilmSpirit · versión 2», página Inicio)
   Una barra lateral (Inicio, Mis proyectos, Mis guiones, Colaboro en, Agenda, Notas y avisos, los fijados, el plan,
   Ajustes y Ayuda), la búsqueda (Ctrl K), el saludo, los proyectos (el que está en rodaje, destacado), los guiones,
   los proyectos donde colaboras y, a la derecha, los números, tu perfil, la próxima jornada, la agenda y los avisos.
   Lo que se sabe de cada proyecto sin abrirlo (etapa, avance, la próxima jornada, la agenda, el comienzo del guion,
   las notas) se guarda en este navegador cada vez que se abre (V2SUM: un resumen, no los datos del proyecto).
   ============================================================ */
const V2SUM_K = 'v2sum', V2PIN_K = 'v2pins';
const v2SumAll = () => ls.get(V2SUM_K, {}) || {};
const v2Pins = () => (ls.get(V2PIN_K, []) || []).filter(x => typeof x === 'string');
const V2_STAGES = [['g', 'Guion', 'var(--v2-g0)'], ['p', 'Preparación', 'var(--v2-g1)'], ['i', 'Imagen', 'var(--v2-g2)'], ['pr', 'Producción', 'var(--v2-g3)'], ['r', 'Rodaje', 'var(--v2-g4)']];
const v2StageOf = k => V2_STAGES.find(s => s[0] === k) || V2_STAGES[0];
const v2Iso = d => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
const v2Day0 = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
const v2FromIso = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };

/* ---------- el resumen del proyecto abierto (para Inicio) ---------- */
function v2Summary() {
  if (!P || !D || !D.sc) return null;
  const sc = D.sc.scenes, n = sc.length || 1;
  const shots = Object.values(P.shots || {}), done = shots.filter(s => s.done).length;
  const els = Object.values(P.elements || {});
  const scWithEls = sc.filter(s => [...D.sem[s.idx]].some(id => P.elements[id] && !P.elements[id].auto)).length;
  const scWithShots = sc.filter(s => (D.shotsBy[s.key] || []).length).length;
  const scWithSyn = sc.filter(s => P.scenes[s.key] && (P.scenes[s.key].synopsis || '').trim()).length;
  let days = [], dates = [];
  try { const x = scheduleDays(P, D.sc); days = x.days.filter(d => d.keys.length); dates = shootDates(P, x.days.length); } catch (e) { }
  const t0 = v2Day0();
  const dIdx = (() => { try { const x = scheduleDays(P, D.sc); return x.days.map((d, i) => ({ d, i, date: dates[i] })).filter(o => o.d.keys.length); } catch (e) { return []; } })();
  const past = dIdx.filter(o => o.date && o.date < t0).length;
  const shooting = done > 0 || (past > 0 && past < dIdx.length) || dIdx.some(o => o.date && o.date - t0 >= 0 && o.date - t0 <= 14 * 864e5);
  const stage = shooting && dIdx.length ? 'r' : dIdx.length ? 'pr' : shots.length ? 'i' : els.some(e => !e.auto) ? 'p' : 'g';
  const pct = (a, b) => Math.round(100 * a / Math.max(1, b));
  const prog = { g: pct(scWithSyn, n), p: pct(scWithEls, n), i: pct(scWithShots, n), pr: pct(dIdx.length ? 1 : 0, 1), shots: [done, shots.length], days: [past, dIdx.length] };
  // la próxima jornada: su fecha, su llamado, su locación y lo que falta en su hoja
  let next = null;
  const nx = dIdx.find(o => o.date && o.date >= t0);
  if (nx) {
    let call = '', loc = '', miss = 0;
    try { call = (typeof peekDay === 'function' && peekDay(nx.d.id).crewCall) || (typeof callDefaults === 'function' ? callDefaults(nx.d).crewCall : '') || P.schedule.call || ''; } catch (e) { }
    try { const L = typeof callLocs === 'function' ? callLocs(nx.d) : []; loc = L.map(x => x[0]).slice(0, 2).join(' · '); } catch (e) { }
    try { miss = typeof callMissing === 'function' ? callMissing(nx.i).length : 0; } catch (e) { }
    next = { date: v2Iso(nx.date), n: nx.i + 1, total: dIdx.length, call, loc, miss, day: nx.i };
  }
  // la agenda: las jornadas y las tareas del calendario de las próximas semanas
  const ev = [];
  dIdx.forEach(o => { if (o.date && o.date >= t0) { const L = (() => { try { return callLocs(o.d).map(x => x[0]).join(', '); } catch (e) { return ''; } })(); ev.push({ d: v2Iso(o.date), t: (() => { try { return peekDay(o.d.id).crewCall || P.schedule.call || ''; } catch (e) { return ''; } })(), title: `Rodaje · jornada ${o.i + 1}`, sub: L, c: 'r' }); } });
  for (const t of ((P.calendar || {}).tasks || [])) { const d = t.date || t.d || t.start; if (d && v2FromIso(d) >= t0) ev.push({ d: String(d).slice(0, 10), t: t.time || t.t || '', title: t.title || t.name || 'Tarea', sub: (P.meta.title || '') + ' · ' + v2StageOf(stage)[1], c: 'p' }); }
  ev.sort((a, b) => (a.d + a.t).localeCompare(b.d + b.t));
  // el comienzo del guion (para la miniatura de «Mis guiones»)
  const script = P.paras.slice(0, 12).filter(p => p.x && p.x.trim()).slice(0, 6).map(p => [p.t, p.x.slice(0, 120)]);
  // las notas recientes (de otros) y la actividad
  const notes = typeof noteRoots === 'function' ? Object.values(P.notes || {}).filter(x => x && x.on && x.on.t !== 'ink').sort((a, b) => b.ts - a.ts).slice(0, 3).map(x => ({ who: x.name || '', text: x.text || '', ts: x.ts, re: !!x.re, lab: (() => { try { return noteLabel(x.on); } catch (e) { return ''; } })(), mine: typeof noteMine === 'function' && noteMine(x) })) : [];
  return { t: Date.now(), title: P.meta.title || '', kind: v2Kind(P, D.pages.length), pages: D.pages.length, scenes: sc.length, draft: P.meta.draft || '',
    logline: ((P.build && P.build.arg && (P.build.arg.logline || P.build.arg.storyline)) || P.meta.logline || '').toString().slice(0, 220), stage, prog, team: v2People(P).slice(0, 12), next, ev: ev.slice(0, 12), script, notes, dates: dates.filter(Boolean).slice(0, 3).map(v2Iso) };
}
let V2SUM_T = 0;
function v2SumSave() {
  if (!P || !P.id || P._sample || !P._saved || document.body.classList.contains('home')) return;
  clearTimeout(V2SUM_T);
  V2SUM_T = setTimeout(() => { try { const s = v2Summary(); if (!s) return; const A = v2SumAll(); A[P.id] = s; const ids = Object.keys(A); if (ids.length > 200) ids.sort((a, b) => A[a].t - A[b].t).slice(0, ids.length - 200).forEach(k => delete A[k]); ls.set(V2SUM_K, A); } catch (e) { } }, 1200);
}
{ const _r = render; render = function () { const r = _r.apply(this, arguments); v2SumSave(); return r; }; }

/* ---------- Inicio ---------- */
/* sec: la sección que se mira en grande («» = Inicio entero: no hay deslizador, así que la barra y los números abren la sección en vez de desplazar);
   calw: semanas que se movió el calendario; day: el día elegido en él */
const V2H = { seg: 'all', q: '', mseg: 'proj', msearch: false, phone: false, sec: '', calw: 0, day: '' };
addEventListener('resize', debounce(() => { if (V2.on && document.body.classList.contains('home') && V2H.phone !== PHONE() && typeof homePaint === 'function') homePaint(); }, 200));
const v2HomeName = () => { try { const me = typeof APITEAM !== 'undefined' && APITEAM.me; if (me && me.name) return String(me.name).trim(); } catch (e) { } try { const L = typeof LIC !== 'undefined' && LIC; if (L && L.name) return String(L.name).trim(); } catch (e) { } return ls.get('v2name', '') || ''; };
const v2First = n => (n || '').split(/\s+/)[0] || '';
const V2_HI = {
  home: '<path d="M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5z"/>',
  folder: '<path d="M3.5 6.5a1 1 0 0 1 1-1h4.3l2 2h8.7a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/>',
  doc: '<path d="M6.5 3.5h7l4 4V20a.5.5 0 0 1-.5.5H6.5A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z"/><path d="M13.5 3.5v4h4M9 12h6M9 15.5h6"/>',
  people: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9" r="2.4"/><path d="M16.5 13.7c2.2 0 3.7 1.5 4.1 4"/>',
  cal: '<rect x="4" y="5.5" width="16" height="14" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  chat: '<path d="M5 5.5h14a.5.5 0 0 1 .5.5v9.5a.5.5 0 0 1-.5.5H10l-4.5 3.5V16H5a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5z"/>',
  sliders: '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.4a2.4 2.4 0 0 1 4.6.9c0 1.6-2.3 2-2.3 3.4M12 16.6h.01"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  bell: '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  chev: '<path d="m9.5 6 6 6-6 6"/>', chevl: '<path d="m14.5 6-6 6 6 6"/>', more: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
};
const v2HI = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${V2_HI[k]}</svg>`;
const v2Cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const v2Chip = (k, dark) => { const s = v2StageOf(k); return `<span class="v2-stc${dark ? ' dk' : ''}"><i style="background:${s[2]}"></i>${esc(s[1])}</span>`; };
const v2Avs = (names, max = 2) => { const cls = ['y', 'k', '']; return names.length ? `<span class="v2-avs2">${names.slice(0, max).map((n, i) => `<span class="v2-av ${cls[i] || ''}" title="${ea(n)}">${esc(v2Ini(n))}</span>`).join('')}${names.length > max ? `<span class="v2-av m">+${names.length - max}</span>` : ''}</span>` : ''; };

function v2HomeData() {
  const S = v2SumAll(), list = HOME.list || [];
  const arch = o => typeof projArchived === 'function' ? projArchived(o) : !!o.archived;
  const own = list.filter(o => !o.invited && !(o.shared && !o.mine));
  const collab = list.filter(o => !o.invited && o.shared && !o.mine);
  const invites = list.filter(o => o.invited);
  const sum = o => S[o.id] || {};
  const projects = own.filter(o => o.kind !== 'guion');
  const scripts = own.filter(o => (sum(o).pages || o.kind === 'guion'));
  return { S, list, own, collab, invites, projects, scripts, arch, sum };
}
function v2HomeSide(H) {
  const pins = v2Pins().map(id => H.list.find(o => o.id === id)).filter(Boolean);
  const me = typeof APITEAM !== 'undefined' && APITEAM.me, L = me && me.limits;
  const notes = H.own.reduce((a, o) => a + (H.sum(o).notes || []).filter(n => !n.mine && Date.now() - n.ts < 7 * 864e5).length, 0) + H.invites.length;
  const plan = L && L.projects ? `<div class="v2-hplan"><header><b>Plan ${esc(cap1(String(me.plan || '')))}</b><span>Activo</span></header><p>${me.own || 0} de ${L.projects} proyectos de producción en uso</p><div class="v2-bar"><i style="width:${Math.min(100, Math.round(100 * (me.own || 0) / L.projects))}%"></i></div><button type="button" data-act="plans-see">Ver planes</button></div>` : '';
  const it = (k, ic, label, n, red) => `<button type="button" class="v2-hnav${k === (V2H.sec || 'home') ? ' on' : ''}" data-v2go="${k}">${v2HI(ic)}<span>${label}</span>${n != null && n !== '' ? `<b class="${red ? 'red' : ''}">${n}</b>` : ''}</button>`;
  return `<aside class="v2-hsb">
    <div class="v2-hlogo">${typeof logoSVG === 'function' ? logoSVG() : 'FilmSpirit'}</div>
    <nav>${it('home', 'home', 'Inicio')}${it('proj', 'folder', 'Mis proyectos', H.projects.length)}${it('scripts', 'doc', 'Mis guiones', H.scripts.length)}${it('collab', 'people', 'Colaboro en', H.collab.length + H.invites.length)}${it('agenda', 'cal', 'Agenda')}${it('notes', 'chat', 'Notas y avisos', notes || '', true)}</nav>
    ${pins.length ? `<h6>Fijados</h6><div class="v2-hpins">${pins.map(o => `<button type="button" data-open="${ea(o.id)}"><i style="background:${v2StageOf(H.sum(o).stage || 'g')[2]}"></i>${esc(o.title || 'Sin título')}</button>`).join('')}</div>` : ''}
    <span class="v2-grow"></span>
    ${plan}
    <div class="v2-hfoot"><button type="button" class="v2-hnav" data-v2go="settings">${v2HI('sliders')}<span>Ajustes</span></button><button type="button" class="v2-hnav" data-v2go="help">${v2HI('help')}<span>Ayuda</span></button></div>
  </aside>`;
}
function v2HomeFeatured(o, s) {
  const st = s.stage || 'g', open = o.sample ? 'data-h="sample"' : `data-open="${ea(o.id)}"`;
  const [d0, dn] = s.prog && s.prog.days || [0, 0], [sh0, shn] = s.prog && s.prog.shots || [0, 0];
  const nd = s.next && v2FromIso(s.next.date);
  const idx = V2_STAGES.findIndex(x => x[0] === st);
  return `<article class="v2-hfeat">
    <div class="l"><p class="m">${v2Chip(st, true)}<span>${esc(s.kind || 'Proyecto')}${o.sample ? ' · ejemplo' : o.mine || !o.shared ? ' · tuyo' : ''}</span></p>
      <h3>${esc(o.title || s.title || 'Sin título')}</h3>${s.logline ? `<p class="lg">${esc(s.logline)}</p>` : ''}
      <div class="a"><button type="button" class="v2-btn y" ${open}><span>Abrir proyecto</span>${v2HI('chev')}</button>${v2Avs(s.team || [])}</div></div>
    <div class="r">
      <div class="pr"><span>Planos rodados</span><b>${sh0} de ${shn}</b></div><div class="v2-bar"><i style="width:${shn ? Math.round(100 * sh0 / shn) : 0}%"></i></div>
      <div class="pr"><span>Jornadas</span><b>${dn ? `${Math.min(dn, d0 + 1)} de ${dn}${nd ? ' · ' + esc(V2_WD[nd.getDay()] + ' ' + nd.getDate()) : ''}` : 'sin plan'}</b></div><div class="v2-bar"><i style="width:${dn ? Math.round(100 * Math.min(dn, d0 + 1) / dn) : 0}%"></i></div>
      <div class="stg">${V2_STAGES.map((x, i) => `<span class="${i < idx ? 'past' : i === idx ? 'on' : ''}"><i></i>${esc(x[1])}</span>`).join('')}</div>
    </div></article>`;
}
function v2HomeCard(o, s) {
  const st = s.stage || (o.kind === 'guion' ? 'g' : 'g');
  const pk = { g: ['Guion', s.prog ? s.prog.g : 0], p: ['Desglose', s.prog ? s.prog.p : 0], i: ['Storyboard', s.prog ? s.prog.i : 0], pr: ['Plan de rodaje', s.prog ? s.prog.pr : 0], r: ['Planos rodados', s.prog && s.prog.shots[1] ? Math.round(100 * s.prog.shots[0] / s.prog.shots[1]) : 0] }[st];
  const sub = [s.kind || (o.kind === 'guion' ? 'Guion' : 'Proyecto'), s.pages ? s.pages + ' págs.' : ''].filter(Boolean).join(' · ');
  const R = recentAll()[o.id] || {}, when = R.t || o.updated;
  return `<article class="v2-hcard"><header>${v2Chip(st)}<button type="button" class="v2-more" data-v2pin="${ea(o.id)}" aria-label="Opciones de ${ea(o.title || '')}" title="Fijar o quitar de Fijados">${v2HI('more')}</button></header>
    <button type="button" class="v2-hco" data-open="${ea(o.id)}"><h3>${esc(o.title || 'Sin título')}</h3><p>${esc(sub)}</p>
      <span class="pr"><span>${esc(pk[0])}</span><b>${pk[1]} %</b></span><span class="v2-bar"><i style="width:${pk[1]}%"></i></span>
      <span class="ft">${v2Avs(s.team || [], 2) || '<span></span>'}<span>${when ? esc(v2Ago(when)) : ''}</span></span></button></article>`;
}
function v2ScriptThumb(o, s) {
  const lines = (s.script || []).slice(0, 4).map(([t, x]) => `<p class="t-${ea(t)}">${esc(t === 'h' || t === 'c' ? x.toUpperCase() : x)}</p>`).join('');
  const sub = [s.draft || (o.kind === 'guion' ? 'Guion' : ''), s.pages ? s.pages + ' págs.' : ''].filter(Boolean).join(' · ');
  return `<button type="button" class="v2-hscr" ${o.sample ? 'data-h="sample"' : `data-open="${ea(o.id)}"`}><span class="pg">${lines}<i></i><i></i><i></i></span><b>${esc(o.title || 'Sin título')}</b><small>${esc(sub)}</small></button>`;
}
/* una fila de «Colaboro en» (un proyecto de otra persona o una invitación) */
function v2CollRow(o, H) { const s = H.sum(o); return `<button type="button" class="v2-hcr" ${o.invited ? `data-open="${ea(o.id)}"` : `data-open="${ea(o.id)}"`}><span class="v2-av lg ${v2Ini(o.owner || o.title).charCodeAt(0) % 3 === 0 ? 'k' : v2Ini(o.owner || o.title).charCodeAt(0) % 3 === 1 ? 'g' : 'y2'}">${esc(v2Ini(o.owner || o.title))}</span><span class="t"><b>${esc(o.title || 'Sin título')}</b><small>de ${esc(o.owner || 'otra persona')}</small></span>${v2Chip(s.stage || 'g')}<span class="ro">${esc(o.invited ? 'Invitación' : cap1(String(o.role || '')))}</span><span class="pm">${o.invited ? 'Responder' : /lect|ver|read/i.test(String(o.perm || o.role || '')) ? 'Solo ver' : 'Puede editar'}</span>${v2HI('chev')}</button>`; }
/* botones que se repiten: crear, importar y el ejemplo */
const v2HB = {
  guion: () => `<button type="button" class="v2-btn y" data-h="guion">${v2I('plus')}<span>Nuevo guion</span></button>`,
  prod: (y) => `<button type="button" class="v2-btn${y ? ' y' : ''}" data-h="prod">${y ? v2I('plus') : ''}<span>Nuevo proyecto</span></button>`,
  imp: () => `<button type="button" class="v2-btn" data-h="impg" title="Final Draft, Fountain o PDF; también abre un proyecto guardado (.${PROJ_EXT})">Importar guion</button>`,
  sample: () => `<button type="button" class="v2-btn" data-h="sample">Ver el proyecto de ejemplo</button>`,
};
/* lo que se muestra cuando una sección no tiene nada: qué es y cómo empezar */
const v2HEmpty = (cls, title, text, acts) => `<div class="v2-card v2-hfe${cls ? ' ' + cls : ''}"><h3>${esc(title)}</h3><p>${esc(text)}</p>${acts ? `<div class="a">${acts}</div>` : ''}</div>`;
/* el encabezado de una sección vista en grande: volver a Inicio, el título, cuántos y sus acciones */
const v2HHead = (title, sub, acts) => `<header class="v2-hfh"><div><button type="button" class="v2-hback" data-v2go="home">${v2HI('chevl')}<span>Inicio</span></button><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>${acts ? `<div class="v2-hfa">${acts}</div>` : ''}</header>`;
const v2N = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/* la agenda: la semana (con flechas, «Hoy» y días que se eligen) y lo que viene; big: la sección entera */
function v2HomeCal(H, big) {
  const t0 = v2Day0(), mon = new Date(t0); mon.setDate(t0.getDate() - ((t0.getDay() + 6) % 7));
  const evsAll = H.own.flatMap(o => (H.sum(o).ev || []).map(e => ({ ...e, o }))).sort((a, b) => (a.d + a.t).localeCompare(b.d + b.t));
  const evs = V2H.day ? evsAll.filter(e => e.d === V2H.day) : evsAll.filter(e => v2FromIso(e.d) >= t0);   // con un día elegido, solo ese día
  const base = new Date(mon); base.setDate(mon.getDate() + 7 * (V2H.calw || 0));
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(base.getDate() + i); return d; });
  const dots = d => evsAll.filter(e => e.d === v2Iso(d)).slice(0, 1).map(e => `<i style="background:${e.c === 'r' ? 'var(--v2-g4)' : 'var(--v2-red)'}"></i>`).join('');
  const dayLab = d => { const k = Math.round((v2FromIso(d) - t0) / 864e5); const x = v2FromIso(d); return k === 0 ? 'Hoy' : v2Cap(V2_WD[x.getDay()]) + ' ' + x.getDate(); };
  return `<section class="v2-card v2-hcal${big ? ' big' : ''}"${big ? '' : ' id="v2hAgenda"'}><header><h3>${esc(v2Cap(week[3].toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }).replace(' de ', ' ')))}</h3>${V2H.calw || V2H.day ? '<button type="button" class="v2-link2" data-v2go="caltoday">Hoy</button>' : ''}<button type="button" class="v2-ib" data-v2go="calprev" aria-label="Semana anterior">${v2HI('chevl')}</button><button type="button" class="v2-ib" data-v2go="calnext" aria-label="Semana siguiente">${v2HI('chev')}</button></header>
      <div class="v2-hweek">${week.map(d => `<span role="button" tabindex="0" data-v2day="${v2Iso(d)}" title="Ver lo de este día" class="${v2Iso(d) === v2Iso(t0) ? 'on' : ''}${V2H.day === v2Iso(d) ? ' sel' : ''}"><small>${['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'][(d.getDay() + 6) % 7]}</small><b>${d.getDate()}</b>${dots(d) || '<i class="no"></i>'}</span>`).join('')}</div>
      <ul class="v2-hagenda">${evs.slice(0, big ? 40 : 5).map(e => `<li data-open="${ea(e.o.id)}" title="Abrir ${ea(e.o.title || 'el proyecto')}"><span class="w">${esc(dayLab(e.d))}<br>${esc(e.t || '')}</span><i style="background:${e.c === 'r' ? 'var(--v2-g4)' : 'var(--v2-red)'}"></i><span class="x"><b>${esc(e.title)}</b><small>${esc(e.sub || e.o.title)}</small></span></li>`).join('') || `<li class="v2-mut">${V2H.day ? 'Nada ese día.' : 'Nada en la agenda por ahora. Las jornadas del plan de rodaje y los eventos del calendario de tus proyectos aparecen aquí.'}</li>`}</ul></section>`;
}
/* notas de tu equipo e invitaciones; big: la sección entera */
function v2HomeNotes(H, big) {
  const notes = H.own.flatMap(o => (H.sum(o).notes || []).map(n => ({ ...n, o }))).sort((a, b) => b.ts - a.ts).slice(0, big ? 30 : 4);
  const inv = H.invites.slice(0, big ? 30 : 2);
  return `<section class="v2-card v2-hnotes${big ? ' big' : ''}"${big ? '' : ' id="v2hNotes"'}>${big ? '' : '<h3>Notas y avisos</h3>'}
      ${inv.map(o => `<div class="v2-hn" data-open="${ea(o.id)}" title="Abrir"><span class="v2-av g">${esc(v2Ini(o.owner || ''))}</span><p><b>${esc(o.owner || 'Alguien')}</b> te invitó a ${esc(o.title || 'un proyecto')}${o.role ? ' como ' + esc(String(o.role).toLowerCase()) : ''}<small>${esc(o.updated ? v2Ago(o.updated) : '')}</small></p><i class="dot"></i></div>`).join('')}
      ${notes.map(n => `<div class="v2-hn" data-open="${ea(n.o.id)}" title="Abrir ${ea(n.o.title || 'el proyecto')}"><span class="v2-av ${n.mine ? 'y' : 'k'}">${esc(v2Ini(n.who))}</span><p><b>${esc(n.mine ? 'Tú' : n.who)}</b> ${n.re ? 'respondió' : 'dejó una nota'}${n.lab ? ' en ' + esc(n.lab.charAt(0).toLowerCase() + n.lab.slice(1)) : ''}${n.text ? `<q>${esc(n.text)}</q>` : ''}<small>${esc(v2Ago(n.ts))}</small></p>${n.mine ? '' : '<i class="dot"></i>'}</div>`).join('')}
      ${!inv.length && !notes.length ? '<p class="v2-mut">Las notas de tu equipo y las invitaciones aparecen aquí.</p>' : ''}</section>`;
}
function v2HomeMain(H) {
  const name = v2HomeName(), now = new Date();
  const q = deaccent(V2H.q || '').toLowerCase(), match = o => !q || deaccent(String(o.title || '')).toLowerCase().includes(q);
  let projs = H.projects.filter(match);
  if (V2H.seg === 'now') projs = projs.filter(o => !H.arch(o));
  if (V2H.seg === 'arch') projs = projs.filter(o => H.arch(o));
  projs = homeSort(projs);
  const sample = typeof sampleName === 'function' ? { id: '__sample', title: sampleName(), sample: true, mine: true } : null;
  const sampleFeat = () => v2HomeFeatured(sample, { stage: 'r', kind: 'Cortometraje', logline: 'Un proyecto completo, del guion a la hoja de llamado. Lo que cambies en el ejemplo no se guarda.', prog: v2SampleProg().prog, next: v2SampleProg().next, team: [] });
  const scriptsAll = homeSort(H.scripts.filter(match));
  const coll = [...H.invites, ...H.collab].filter(match);
  const seg = `<div class="v2-seg" role="group" aria-label="Filtrar proyectos">${[['all', 'Todos'], ['now', 'En curso'], ['arch', 'Archivados']].map(([k, n]) => `<button type="button" data-v2seg="${k}" aria-pressed="${ea(V2H.seg === k)}">${n}</button>`).join('')}</div>`;
  const found = q ? ` · ${v2N(projs.length + scriptsAll.length, 'resultado', 'resultados')} para «${V2H.q.trim()}»` : '';
  // una sección en grande (barra lateral o números de arriba): su encabezado y todo lo suyo, sin la grilla de Inicio
  const sec = V2H.sec;
  if (sec) {
    let body = '';
    if (sec === 'proj') {
      const now_ = H.projects.filter(o => !H.arch(o)).length;
      body = v2HHead('Mis proyectos', v2N(H.projects.length, 'proyecto', 'proyectos') + (H.projects.length ? ` · ${now_} en curso` : '') + found, seg + v2HB.prod(true))
        + (projs.length ? `<div class="v2-hcards">${projs.map(o => v2HomeCard(o, H.sum(o))).join('')}</div>`
          : H.projects.length ? v2HEmpty('', 'Nada con este filtro', 'Prueba con «Todos» o con otra búsqueda.', '')
          : v2HEmpty('', 'Todavía no tienes proyectos de producción', 'Un proyecto reúne el guion, el desglose, el storyboard, el plan de rodaje y las hojas de llamado. Crea uno o recorre el ejemplo.', v2HB.prod(true) + v2HB.guion().replace(' y"', '"') + (sample ? v2HB.sample() : '')));
    } else if (sec === 'scripts') {
      body = v2HHead('Mis guiones', v2N(H.scripts.length, 'guion', 'guiones') + found, v2HB.imp() + v2HB.guion())
        + (scriptsAll.length ? `<div class="v2-hscripts">${scriptsAll.map(o => v2ScriptThumb(o, H.sum(o))).join('')}</div>`
          : v2HEmpty('', H.scripts.length ? 'Ningún guion con esa búsqueda' : 'Todavía no tienes guiones', H.scripts.length ? 'Prueba con otra palabra.' : 'Escribe uno aquí o importa Final Draft, Fountain o PDF.', H.scripts.length ? '' : v2HB.guion() + v2HB.imp()));
    } else if (sec === 'collab') {
      body = v2HHead('Colaboro en', 'Proyectos de otras personas que te invitaron' + (coll.length ? ' · ' + coll.length : ''), '')
        + (coll.length ? `<div class="v2-card v2-hcoll">${coll.map(o => v2CollRow(o, H)).join('')}</div>`
          : v2HEmpty('', 'Nadie te invitó todavía', 'Cuando alguien te invite a su proyecto, aparece aquí con tu cargo y lo que puedes hacer en él.', ''));
    } else if (sec === 'agenda') body = v2HHead('Agenda', 'Las jornadas y los eventos de tus proyectos', '') + v2HomeCal(H, true);
    else if (sec === 'notes') body = v2HHead('Notas y avisos', 'Lo que comentó tu equipo y las invitaciones a otros proyectos', '') + v2HomeNotes(H, true);
    return `<section class="v2-hleft v2-hfoc">${body}</section>`;
  }
  const feat = projs.find(o => H.sum(o).stage === 'r') || projs[0];
  const rest = projs.filter(o => o !== feat).slice(0, 6);
  const scripts = scriptsAll.slice(0, 4);
  const nxt = H.own.map(o => ({ o, n: H.sum(o).next })).filter(x => x.n).sort((a, b) => a.n.date.localeCompare(b.n.date))[0];
  let hello = '';
  if (nxt) { const d = v2FromIso(nxt.n.date), days = Math.round((d - v2Day0()) / 864e5); hello = `${nxt.o.title} rueda ${days === 0 ? 'hoy' : days === 1 ? 'mañana' : days < 7 ? 'este ' + d.toLocaleDateString('es-PE', { weekday: 'long' }) : 'el ' + d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}.${nxt.n.miss ? ` Te ${nxt.n.miss === 1 ? 'queda un dato' : 'quedan ' + (['', 'un', 'dos', 'tres', 'cuatro', 'cinco'][nxt.n.miss] || nxt.n.miss) + ' datos'} por completar en la hoja de llamado.` : ''}`; }
  else if (!H.own.length) hello = 'Empieza por tu guion: escríbelo aquí o importa Final Draft, Fountain o PDF.';
  const more = (n, k) => n ? `<button type="button" class="v2-link2" data-v2go="${k}">Ver ${n === 1 ? 'el otro' : 'los ' + n + ' restantes'} ›</button>` : '';
  // sin deslizador: el saludo arriba; los proyectos a la izquierda y los guiones y colaboraciones a su lado (v2-pant.css)
  return `<section class="v2-hleft">
    <div class="v2-hgreet"><p class="v2-hdate">${esc(v2Cap(now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')))}</p>
    <h1 class="v2-hhi">Hola${name ? ', ' + esc(v2First(name)) : ''}</h1>
    ${hello ? `<p class="v2-hsum">${esc(hello)}</p>` : ''}</div>
    <div class="v2-hproj"><div class="v2-hsec" id="v2hProj"><h2>Mis proyectos</h2>${more(Math.max(0, projs.length - 1 - rest.length), 'proj')}${H.projects.length ? seg : ''}</div>
    ${feat ? v2HomeFeatured(feat, H.sum(feat)) : sample ? sampleFeat() : ''}
    ${rest.length ? `<div class="v2-hcards">${rest.map(o => v2HomeCard(o, H.sum(o))).join('')}</div>`
      : !H.projects.length ? v2HEmpty('v2-hempty', 'Todavía no tienes proyectos propios', sample ? 'Arriba está el proyecto de ejemplo: ábrelo y recórrelo, lo que cambies no se guarda. Cuando quieras, crea el tuyo.' : 'Crea un proyecto o empieza por el guion.', v2HB.guion() + v2HB.prod())
      : H.projects.length === 1 ? '' : v2HEmpty('v2-hempty', 'Nada con este filtro', 'Prueba con «Todos» o con otra búsqueda.', '')}</div>
    <div class="v2-hside"><div class="v2-hsc"><div class="v2-hsec" id="v2hScripts"><h2>Mis guiones</h2>${scriptsAll.length > scripts.length ? more(scriptsAll.length - scripts.length, 'scripts') : `<button type="button" class="v2-link2" data-h="impg" title="Final Draft, Fountain o PDF; también abre un proyecto guardado (.${PROJ_EXT})">Importar guion</button>`}</div>
    <div class="v2-hscripts">${scripts.length ? scripts.map(o => v2ScriptThumb(o, H.sum(o))).join('') : sample ? v2ScriptThumb(sample, { script: v2SampleScript(), draft: 'Versión de muestra' }) : ''}</div>
    </div><div class="v2-hcw"><div class="v2-hsec" id="v2hCollab"><h2>Colaboro en</h2>${coll.length > 4 ? more(coll.length - 4, 'collab') : '<span class="v2-hsub">Proyectos de otras personas</span>'}</div>
    ${coll.length ? `<div class="v2-card v2-hcoll">${coll.slice(0, 4).map(o => v2CollRow(o, H)).join('')}</div>`
      : `<div class="v2-card v2-hcoll empty"><p class="v2-mut">Cuando alguien te invite a su proyecto, aparece aquí.</p></div>`}</div></div>
  </section>`;
}
function v2HomeRight(H) {
  const name = v2HomeName();
  const nxt = H.own.map(o => ({ o, n: H.sum(o).next })).filter(x => x.n).sort((a, b) => a.n.date.localeCompare(b.n.date))[0];
  let nextHTML = '';
  if (nxt) {
    const d = v2FromIso(nxt.n.date), days = Math.round((d - v2Day0()) / 864e5);
    nextHTML = `<section class="v2-hnext"><header><span>Próxima jornada</span><b>${days === 0 ? 'hoy' : days === 1 ? 'mañana' : 'en ' + days + ' días'}</b></header>
      <h3>${esc(nxt.o.title)}</h3><p>Jornada ${nxt.n.n} de ${nxt.n.total} · ${esc(d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ''))}</p>
      <ul><li>${v2HI('clock')}<span>Llamado general</span><b>${esc(nxt.n.call || '--:--')}</b></li>${nxt.n.loc ? `<li>${v2I('pin')}<span>${esc(nxt.n.loc)}</span></li>` : ''}${nxt.n.miss ? `<li class="miss"><i></i><span>Faltan ${nxt.n.miss} ${nxt.n.miss === 1 ? 'dato' : 'datos'} para enviarla</span></li>` : ''}</ul>
      <button type="button" class="v2-hcall" data-v2call="${ea(nxt.o.id)}" data-day="${ea(nxt.n.day)}"><span>Ver hoja de llamado</span><i>${v2I('check')}</i></button></section>`;
  }
  const stat = (k, n, label) => `<button type="button" data-v2go="${k}" aria-pressed="${ea(V2H.sec === k)}" title="Ver ${esc(label.toLowerCase())}"><b>${n}</b><span>${label}</span></button>`;
  // la columna de la derecha es la misma en Inicio y en cada sección; la sección que está en grande no se repite aquí
  return `<aside class="v2-hright">
    <div class="v2-card v2-hstats">${stat('proj', H.projects.length, 'Proyectos')}${stat('scripts', H.scripts.length, 'Guiones')}${stat('collab', H.collab.length + H.invites.length, 'Colaboro en')}</div>
    <section class="v2-card v2-hme"><span class="v2-av xl y">${name ? esc(v2Ini(name)) : v2HI('people')}</span><h3>${esc(name || 'Tu página')}</h3>${ls.get('v2role', '') ? `<p>${esc(ls.get('v2role', ''))}</p>` : '<p>Producción audiovisual</p>'}
      <div><button type="button" class="v2-btn" data-v2go="profile">Editar perfil</button><button type="button" class="v2-btn k" data-v2go="shareme">Compartir</button></div></section>
    ${nextHTML}
    ${V2H.sec === 'agenda' ? '' : v2HomeCal(H)}
    ${V2H.sec === 'notes' ? '' : v2HomeNotes(H)}
  </aside>`;
}
/* ---------- Inicio en el celular (PDF, página Inicio del celular) ----------
   El logo con buscar y avisos, la fecha y el saludo, la próxima jornada (amarilla), Proyectos | Guiones | Colaboro y
   abajo, fija, la barra Inicio · Proyectos · + · Agenda · Perfil. Agenda, Perfil y los avisos suben en hojas. */
const v2HomeNext = H => H.own.map(o => ({ o, n: H.sum(o).next })).filter(x => x.n).sort((a, b) => a.n.date.localeCompare(b.n.date))[0];
function v2HomePNext(H) {
  const nxt = v2HomeNext(H); if (!nxt) return '';
  const d = v2FromIso(nxt.n.date), days = Math.round((d - v2Day0()) / 864e5);
  const loc = String(nxt.n.loc || '').split(' · ')[0];
  return `<section class="v2-hmnext"><header><span>Próxima jornada</span><b>${days === 0 ? 'hoy' : days === 1 ? 'mañana' : 'en ' + days + ' días'}</b></header>
    <h2>${esc(nxt.o.title)} · jornada ${esc(nxt.n.n)}</h2>
    <p><span>${v2HI('clock')}${esc(v2Cap(V2_WD[d.getDay()]))} ${d.getDate()}${nxt.n.call ? ' · ' + esc(nxt.n.call) : ''}</span>${loc ? `<span>${v2I('pin')}${esc(loc)}</span>` : ''}</p>
    <button type="button" class="v2-hmcall" data-v2call="${ea(nxt.o.id)}" data-day="${ea(nxt.n.day)}"><span>Ver hoja de llamado</span><i>${v2I('check')}</i></button></section>`;
}
/* el avance que se muestra según la etapa (como en las tarjetas de la computadora) */
function v2HomeProg(o, s) {
  const st = s.stage || 'g', P_ = s.prog || {};
  if (st === 'r') { const [a, b] = P_.shots || [0, 0]; return ['Planos rodados', `${a} de ${b}`, b ? Math.round(100 * a / b) : 0]; }
  const k = { g: ['Guion', P_.g], p: ['Desglose', P_.p], i: ['Storyboard', P_.i], pr: ['Plan de rodaje', P_.pr] }[st] || ['Guion', 0];
  return [k[0], (k[1] || 0) + ' %', k[1] || 0];
}
function v2HomePFeat(o, s) {
  const st = v2StageOf(s.stage || 'g'), [lab, val, pct] = v2HomeProg(o, s);
  const open = o.sample ? 'data-h="sample"' : `data-open="${ea(o.id)}"`;
  return `<button type="button" class="v2-hmfeat" ${open}><span class="m"><i style="background:${st[2]}"></i><b>${esc(st[1])}</b><span>· ${esc(s.kind || 'Proyecto')}${o.sample ? ' · ejemplo' : ''}</span></span>
    <span class="t">${esc(o.title || s.title || 'Sin título')}</span><span class="pr"><span>${esc(lab)}</span><b>${esc(val)}</b></span><span class="v2-bar"><i style="width:${pct}%"></i></span></button>`;
}
function v2HomePCard(o, s, sub, pct) {
  const st = v2StageOf(s.stage || 'g');
  const open = o.sample ? 'data-h="sample"' : `data-open="${ea(o.id)}"`;
  return `<button type="button" class="v2-hmcard" ${open}><span class="m"><i style="background:${st[2]}"></i>${esc(st[1])}${sub ? `<span>·</span>${esc(sub)}` : ''}</span>
    <span class="t">${esc(o.title || 'Sin título')}</span>${pct != null ? `<span class="v2-bar"><i style="width:${pct}%"></i></span>` : ''}${v2HI('chev')}</button>`;
}
function v2HomePList(H) {
  const q = deaccent(V2H.q || '').toLowerCase(), match = o => !q || deaccent(String(o.title || '')).toLowerCase().includes(q);
  const sample = typeof sampleName === 'function' ? { id: '__sample', title: sampleName(), sample: true, mine: true } : null;
  if (V2H.mseg === 'scripts') {
    const L = homeSort(H.scripts.filter(match));
    if (!L.length) return sample && !q ? v2HomePCard(sample, { stage: 'g' }, 'Guion de muestra', null) : '<p class="v2-mut v2-hmempty">Todavía no tienes guiones.</p>';
    return L.map(o => { const s = H.sum(o); return v2HomePCard(o, s, [s.draft || 'Guion', s.pages ? s.pages + ' págs.' : ''].filter(Boolean).join(' · '), null); }).join('');
  }
  if (V2H.mseg === 'collab') {
    const L = [...H.invites, ...H.collab].filter(match);
    if (!L.length) return '<p class="v2-mut v2-hmempty">Cuando alguien te invite a su proyecto, aparece aquí.</p>';
    return L.map(o => v2HomePCard(o, H.sum(o), (o.invited ? 'Invitación de ' : 'de ') + (o.owner || 'otra persona'), null)).join('');
  }
  let L = homeSort(H.projects.filter(o => match(o) && !H.arch(o)));
  if (!L.length) return sample && !q ? v2HomePFeat(sample, { stage: 'r', kind: 'Cortometraje', prog: v2SampleProg().prog })
    + `<div class="v2-hmnew"><button type="button" class="v2-btn y" data-h="guion">${v2I('plus')}<span>Nuevo guion</span></button><button type="button" class="v2-btn" data-h="prod">Nuevo proyecto</button></div>` : '<p class="v2-mut v2-hmempty">No hay proyectos con ese nombre.</p>';
  const feat = L.find(o => H.sum(o).stage === 'r') || L[0];
  L = L.filter(o => o !== feat);
  return v2HomePFeat(feat, H.sum(feat)) + L.map(o => { const s = H.sum(o); return v2HomePCard(o, s, s.kind || 'Proyecto', v2HomeProg(o, s)[2]); }).join('');
}
/* el avance del ejemplo (planos rodados, jornadas y la próxima), sacado del ejemplo mismo para no mostrar «0 de 0»;
   se arma una sola vez por día */
let V2_SPROG = null;
function v2SampleProg() {
  const day = v2Iso(v2Day0());
  if (V2_SPROG && V2_SPROG.day === day) return V2_SPROG;
  let prog = { shots: [0, 0], days: [0, 0] }, next = null;
  try {
    const Pn = buildSample(), sc = computeScenes(Pn.paras), shots = Object.values(Pn.shots || {});
    const days = scheduleDays(Pn, sc).days, dates = shootDates(Pn, days.length), t0 = v2Day0();
    const ds = days.map((d, i) => ({ d, date: dates[i] })).filter(o => o.d.keys.length);
    const past = ds.filter(o => o.date && o.date < t0).length, nx = ds.find(o => o.date && o.date >= t0);
    prog = { shots: [shots.filter(s => s.done).length, shots.length], days: [past, ds.length] };
    if (nx) next = { date: v2Iso(nx.date) };
  } catch (e) { console.warn('ejemplo:', e); }
  return (V2_SPROG = { day, prog, next });
}
function v2HomePhone(H) {
  const name = v2HomeName(), now = new Date(), seg = V2H.mseg || 'proj';
  const bell = H.invites.length || H.own.some(o => (H.sum(o).notes || []).some(n => !n.mine));
  const it = (k, ic, lab, on) => `<button type="button" data-v2m="${k}"${on ? ' aria-current="page"' : ''}>${ic}<span>${lab}</span></button>`;
  return `<div class="v2-hm">
    <header class="v2-hmtop"><span class="v2-hmlogo">${typeof logoSVG === 'function' ? logoSVG() : 'FilmSpirit'}</span><span class="v2-grow"></span>
      <button type="button" class="v2-hmib" data-v2m="search" aria-label="Buscar" aria-pressed="${ea(!!V2H.msearch)}">${v2HI('search')}</button>
      <button type="button" class="v2-hmib" data-v2m="notes" aria-label="Notas y avisos">${v2HI('bell')}${bell ? '<i class="v2-dotb"></i>' : ''}</button></header>
    ${V2H.msearch ? `<label class="v2-hq v2-hmq">${v2HI('search')}<input type="search" id="v2HomeQ" placeholder="Buscar proyectos o guiones" value="${esc(V2H.q)}" autocomplete="off" aria-label="Buscar"></label>` : ''}
    <p class="v2-hdate">${esc(v2Cap(now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')))}</p>
    <h1 class="v2-hhi">Hola${name ? ', ' + esc(v2First(name)) : ''}</h1>
    ${v2HomePNext(H)}
    <div class="v2-hmseg" role="group" aria-label="Qué ver" id="v2hmList">${[['proj', 'Proyectos'], ['scripts', 'Guiones'], ['collab', 'Colaboro']].map(([k, n]) => `<button type="button" data-v2mseg="${k}" aria-pressed="${ea(seg === k)}">${n}</button>`).join('')}</div>
    <div class="v2-hmlist">${v2HomePList(H)}</div>
  </div>
  <nav class="v2-hmnav" aria-label="Inicio">${it('home', v2HI('home'), 'Inicio', true)}${it('proj', v2HI('folder'), 'Proyectos')}
    <button type="button" class="v2-hmplus" data-v2m="new" aria-label="Nuevo proyecto o guion">${v2I('plus')}</button>
    ${it('agenda', v2HI('cal'), 'Agenda')}${it('me', `<span class="v2-av y">${name ? esc(v2Ini(name)) : v2HI('people')}</span>`, 'Perfil')}</nav>`;
}
/* las hojas del celular: la agenda, el perfil y los avisos (las piezas de la columna derecha de la computadora) */
function v2HomeSheet(k) {
  const H = v2HomeData(), R = document.createElement('div');
  R.innerHTML = v2HomeRight(H) + v2HomeSide(H);
  const pick = sel => { const el = $(sel, R); return el ? el.outerHTML : ''; };
  const T = { agenda: ['Agenda', pick('.v2-hcal')], notes: ['Notas y avisos', pick('.v2-hnotes')], me: ['Perfil', pick('.v2-hme') + pick('.v2-hstats') + pick('.v2-hplan')
    + `<div class="v2-hmlinks"><button type="button" class="v2-hnav" data-v2go="settings">${v2HI('sliders')}<span>Ajustes</span></button><button type="button" class="v2-hnav" data-v2go="help">${v2HI('help')}<span>Ayuda</span></button><button type="button" class="v2-hnav" data-v2go="openm">${v2HI('folder')}<span>Abrir, compartir y archivar proyectos</span></button></div>`] }[k];
  if (!T) return;
  const m = modal({ title: T[0], body: `<div class="v2-home v2-hmsheet">${T[1]}</div>` });
  m.classList.add('v2-sheet');
  const b = $('.v2-hmsheet', m);
  b.addEventListener('click', e => {
    const g = e.target.closest('[data-v2go]');
    if (g) { const k2 = g.dataset.v2go; closeModal(); setTimeout(() => { if (k2 === 'settings') lookPanel('me'); else if (k2 === 'help') helpMenu($('.v2-hmnav [data-v2m="me"]') || g); else if (k2 === 'openm') openMenu($('.v2-hmnav [data-v2m="proj"]') || g); else if (k2 === 'profile') { if (typeof accountMenu === 'function' && typeof APITEAM !== 'undefined' && APITEAM.me) accountMenu($('.v2-hmnav [data-v2m="me"]')); else v2NameDialog(); } else if (k2 === 'shareme') { const u = location.origin + location.pathname; if (navigator.share) navigator.share({ title: 'FilmSpirit', url: u }).catch(() => { }); else if (navigator.clipboard) navigator.clipboard.writeText(u).then(() => toast('Enlace copiado.')); } }, 0); return; }
    if (e.target.closest('[data-act="plans-see"]') && ACT['plans-see']) { closeModal(); ACT['plans-see'](e.target.closest('[data-act]')); }
  });
}
/* el comienzo del guion del ejemplo, para su miniatura */
let V2_SSC = null;
function v2SampleScript() {
  if (V2_SSC) return V2_SSC;
  try { const t = typeof SAMPLE_TX !== 'undefined' ? SAMPLE_TX[EN ? 'en' : 'es'].fountain() : ''; const r = parseFountain(t); const paras = Array.isArray(r) ? r : (r && r.paras) || []; V2_SSC = paras.filter(p => p.x && p.x.trim() && p.t !== 'tp').slice(0, 6).map(p => [p.t, p.x.slice(0, 120)]); } catch (e) { V2_SSC = []; }
  return V2_SSC;
}
/* Inicio de la v2: reemplaza la pintura de la v1 (los botones usan los mismos data-open y data-h de inicio.js) */
{
  const _hp = homePaint;
  homePaint = function (loading) {
    if (!V2.on) return _hp.apply(this, arguments);
    let h = $('#home');
    if (!h) { h = document.createElement('main'); h.id = 'home'; h.setAttribute('aria-label', 'Inicio'); h.dataset.trk = 'home'; $('#app').appendChild(h); h.addEventListener('click', homeClick); v2HomeBind(h); }
    h.classList.add('v2-home');
    const H = v2HomeData();
    h.classList.toggle('m', V2H.phone = PHONE());
    if (V2H.phone) { h.innerHTML = loading ? '<p class="v2-mut" style="padding:40px 20px">Cargando proyectos…</p>' : v2HomePhone(H); return; }
    h.innerHTML = `${v2HomeSide(H)}<div class="v2-hmain">
      <header class="v2-hhead"><label class="v2-hq">${v2HI('search')}<input type="search" id="v2HomeQ" placeholder="Buscar proyectos, guiones o personas" value="${esc(V2H.q)}" autocomplete="off" aria-label="Buscar"><kbd>Ctrl K</kbd></label>
        <span class="v2-grow"></span><button type="button" class="v2-btn ic" data-v2go="notes" aria-label="Notas y avisos">${v2HI('bell')}${H.invites.length || H.own.some(o => (H.sum(o).notes || []).some(n => !n.mine)) ? '<i class="v2-dotb"></i>' : ''}</button>
        <button type="button" class="v2-btn y" data-v2go="new">${v2I('plus')}<span>Nuevo proyecto</span></button>${v2MeHTML(true)}</header>
      ${loading ? '<p class="v2-mut" style="padding:40px">Cargando proyectos…</p>' : `<div class="v2-hgrid" data-sec="${ea(V2H.sec)}">${v2HomeMain(H)}${v2HomeRight(H)}</div>`}
    </div>`;
    if (HOME.err) { const b = $('.v2-hleft', h); if (b) b.insertAdjacentHTML('afterbegin', '<p class="pj-empty bad">No se pudo cargar la lista de proyectos. <button class="btn sm" data-h="retry">Reintentar</button></p>'); }
  };
  const _hl = homeList;
  homeList = function () { if (V2.on) return homePaint(); return _hl.apply(this, arguments); };
}
function v2HomeBind(h) {
  h.addEventListener('click', e => {
    // «Importar .fdx o .fountain»: un guion (Final Draft, Fountain, PDF) o un proyecto guardado (.fsp), como en la v1
    if (e.target.closest('[data-h="impg"]')) { pickFile(`${SCRIPT_ACCEPT},${PROJ_ACCEPT}`, 'import'); return; }
    const g = e.target.closest('[data-v2go]');
    if (g) {
      const k = g.dataset.v2go;
      // Inicio ya no se desplaza (todo cabe en la pantalla): cada opción abre su sección en grande; «Inicio» vuelve a verlo todo
      if (['home', 'proj', 'scripts', 'collab', 'agenda', 'notes'].includes(k)) { V2H.sec = k === 'home' ? '' : k; if (k === 'agenda') { V2H.calw = 0; V2H.day = ''; } homePaint(); return; }
      if (k === 'calprev' || k === 'calnext') { V2H.calw = (V2H.calw || 0) + (k === 'calnext' ? 1 : -1); V2H.day = ''; homePaint(); return; }
      if (k === 'caltoday') { V2H.calw = 0; V2H.day = ''; homePaint(); return; }
      if (k === 'new') newMenu(g);
      else if (k === 'settings') { if (typeof lookPanel === 'function') lookPanel('me'); }
      else if (k === 'help') { if (typeof helpMenu === 'function') helpMenu(g); }
      else if (k === 'profile') { if (typeof accountMenu === 'function' && typeof APITEAM !== 'undefined' && APITEAM.me) accountMenu(g); else v2NameDialog(); }
      else if (k === 'shareme') { const u = location.origin + location.pathname; if (navigator.share) navigator.share({ title: 'FilmSpirit', url: u }).catch(() => { }); else if (navigator.clipboard) navigator.clipboard.writeText(u).then(() => toast('Enlace copiado.')); }
      return;
    }
    const dy = e.target.closest('[data-v2day]'); if (dy) { V2H.day = V2H.day === dy.dataset.v2day ? '' : dy.dataset.v2day; homePaint(); return; }
    const sg = e.target.closest('[data-v2seg]'); if (sg) { V2H.seg = sg.dataset.v2seg; homePaint(); return; }
    const ms = e.target.closest('[data-v2mseg]'); if (ms) { V2H.mseg = ms.dataset.v2mseg; homePaint(); return; }
    const mn = e.target.closest('[data-v2m]');
    if (mn) {
      const k = mn.dataset.v2m, sc = $('.v2-hm', h) ? h : null;
      if (k === 'home') { V2H.mseg = 'proj'; homePaint(); h.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (k === 'proj') { V2H.mseg = 'proj'; homePaint(); const l = $('#v2hmList', h); if (l) l.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else if (k === 'new') newMenu(mn);
      else if (k === 'search') { V2H.msearch = !V2H.msearch; if (!V2H.msearch) V2H.q = ''; homePaint(); const q = $('#v2HomeQ', h); if (q) q.focus(); }
      else v2HomeSheet(k);
      return;
    }
    const pin = e.target.closest('[data-v2pin]'); if (pin) { const id = pin.dataset.v2pin, L = v2Pins(); ls.set(V2PIN_K, L.includes(id) ? L.filter(x => x !== id) : [...L, id].slice(-8)); homePaint(); toast(L.includes(id) ? 'Quitado de Fijados.' : 'Fijado en la barra de la izquierda.'); return; }
    const c = e.target.closest('[data-v2call]');
    if (c) { (async () => { const ok = P && P.id === c.dataset.v2call && !P._sample ? true : await openProject(c.dataset.v2call); if (!ok) return; homeHide(); UI.callDay = +c.dataset.day || 0; setTab('call'); })(); }
  });
  h.addEventListener('input', e => { if (e.target.id === 'v2HomeQ') { V2H.q = e.target.value; clearTimeout(h._qt); h._qt = setTimeout(() => { const pos = e.target.selectionStart; homePaint(); const q = $('#v2HomeQ', h); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) { } } }, 180); } });
}
/* Ctrl K: buscar */
document.addEventListener('keydown', e => {
  if (!V2.on || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'k') return;
  e.preventDefault();
  if (!document.body.classList.contains('home') && typeof homeShow === 'function') { homeShow().then(() => { const q = $('#v2HomeQ'); if (q) q.focus(); }); return; }
  const q = $('#v2HomeQ'); if (q) q.focus();
});
/* el nombre para el saludo (sin cuenta): se guarda solo en este navegador */
function v2NameDialog() {
  const m = modal({ title: 'Tu perfil', body: `<label class="fld"><span>Tu nombre</span><input type="text" id="v2Nm" value="${esc(ls.get('v2name', ''))}" placeholder="Ronald Ávila"></label><label class="fld"><span>Tu oficio</span><input type="text" id="v2Rl" value="${esc(ls.get('v2role', ''))}" placeholder="Productor · Director"></label>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="v2NmOk">Guardar</button>' });
  $('#v2NmOk', m).onclick = () => { ls.set('v2name', $('#v2Nm', m).value.trim()); ls.set('v2role', $('#v2Rl', m).value.trim()); closeModal(); homePaint(); };
}
