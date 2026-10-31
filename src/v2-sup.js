/* ============================================================
   VERSIÓN 2 · HOJA DE SCRIPT (PDF «FilmSpirit · versión 2», página Hoja de script: el celular)
   · Celular, como el PDF: el encabezado de la escena en Courier; la tarjeta del plano (‹ › pasan entre los planos
     de la escena, «3 de 3 en la escena», sus datos en fichas y la descripción); la tarjeta negra de la toma (su número,
     el cronómetro, MOS y REC); «Tomas» (tocar la marca la cambia: OK → Buena → NG; tocar la toma abre su ventana) y
     abajo, fijos, la nota y «✓ Rodado · siguiente». Lo demás de la v1 (la jornada, la continuidad, todas las escenas,
     la carga rápida y el parte diario) va en el «⋯» de la cabecera, en hojas que suben desde abajo.
   · Computadora (el PDF no la dibuja): las mismas piezas en la columna «En cámara», a la derecha del registro de tomas
     de la v1, con las jornadas en pestañas y el avance en tarjetas, como el plan y la hoja de llamado.
   Los datos y las acciones son los de la v1 (tab-sup.js): REC, «+ Toma», marcar, MOS y «Rodado · siguiente».
   ============================================================ */
const V2_SUPP = { Mano: 'Cámara en mano' };
/* las fichas del plano: tamaño, ángulo, lente, movimiento y soporte (sin «Normal» ni «Fijo») */
const v2SupChips = sh => [...new Set([sh.size, sh.angle && sh.angle !== 'Normal' ? sh.angle : '', sh.lens ? String(sh.lens).replace(/\s*mm$/i, '') + ' mm' : '',
  sh.move && sh.move !== 'Fijo' ? sh.move : '', sh.support ? V2_SUPP[sh.support] || sh.support : ''].filter(Boolean))];
const V2_MKNEXT = { ok: 'bn', bn: 'ng', ng: 'ok' };
V2_ICO.mic = '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>';
V2_ICO.film = '<rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 9h16M4 15h16M8 5v4M8 15v4M16 5v4M16 15v4"/>';
V2_ICO.list = '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>';
V2_ICO.clock = '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>';
V2_ICO.bolt = '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>';
V2_ICO.cont = '<path d="M7 4h10l3 4-8 12L4 8z"/><path d="M4 8h16"/>';

/* ---------- las piezas: el plano, la toma y las tomas ---------- */
function v2SupPlano(X, sh) {
  const L = D.shotsBy[sh.sc] || [], i = L.indexOf(sh);
  const ar = (o, d) => X.ed && o ? `<button type="button" class="v2-hsar" data-act="sup-step" data-id="${ea(o.id)}" data-dir="${d}" aria-label="${d < 0 ? 'Plano anterior' : 'Plano siguiente'}">${v2I(d < 0 ? 'prev' : 'next')}</button>`
    : `<button type="button" class="v2-hsar" disabled aria-hidden="true" tabindex="-1">${v2I(d < 0 ? 'prev' : 'next')}</button>`;
  const ch = v2SupChips(sh), desc = supDesc(sh), kind = supKind(sh);
  return `<section class="v2-card v2-hspl" data-v2swipe data-note="shot:${ea(sh.id)}">
    <div class="v2-hsplh">${ar(L[i - 1], -1)}<div class="v2-hsplt"><h2>Plano ${esc(D.code[sh.id])}</h2><small>${i + 1} de ${L.length} en la escena${kind ? ' · ' + esc(kind) : ''}${sh.done ? ' · ✓ rodado' : ''}</small></div>${ar(L[i + 1], 1)}</div>
    ${ch.length ? `<div class="v2-hschips">${ch.map(c => `<span>${esc(c)}</span>`).join('')}</div>` : ''}
    ${desc ? `<p class="v2-hsd">${esc(desc)}</p>` : ''}
  </section>`;
}
function v2SupRec(X, sh) {
  const takes = supTakes(sh.id), run = takes.find(t => t.run), rdy = takes.find(t => t.rdy);
  const n = run ? run.n : rdy ? rdy.n : supNextN(takes), mos = supMos(sh.id);
  const lab = run ? `Parar la toma ${n}` : `Grabar la toma ${n}`;
  return `<section class="v2-hsrec${run ? ' on' : ''}" aria-label="Toma">
    <div class="v2-hsrl"><span>Toma ${esc(n)}${run ? ' · <b>● Rodando</b>' : ''}</span>
      <b class="v2-hstim tnum"${run ? ` data-sup-run="${ea(run.run)}"` : ''}>${run ? supClock(Date.now() - run.run) : '00:00'}</b>
      ${X.ed ? `<button type="button" class="v2-hsmos" data-act="v2-supmos" data-id="${ea(sh.id)}" aria-pressed="${mos}" title="Plano MOS: todas sus tomas, sin sonido">MOS</button>` : mos ? '<span class="v2-hsmos" aria-pressed="true">MOS</span>' : ''}</div>
    ${X.ed ? `<button type="button" class="v2-hsrecb" data-act="sup-rec" data-id="${ea(sh.id)}" aria-pressed="${!!run}" aria-label="${ea(lab)}" title="${ea(lab)}"><i aria-hidden="true"></i><span>${run ? 'PARAR' : 'REC'}</span></button>` : ''}
  </section>`;
}
function v2SupTakes(X, sh) {
  const takes = supTakes(sh.id), snd = t => takeSnd(sh.id, t);
  const rows = takes.map((t, i) => t.rdy ? '' : `<div class="v2-hstr">
      <b class="v2-hstn tnum">${esc(t.n)}</b>
      <${X.ed ? `button type="button" data-act="take" data-id="${ea(sh.id)}" data-n="${i}"` : 'div'} class="v2-hsti" aria-label="${ea(`Toma ${t.n}: hora, duración, tarjeta, sonido y nota`)}">
        <span><b class="tnum">${esc(t.t || '--:--')}</b>${t.run ? ` · <span class="tnum" data-sup-run="${ea(t.run)}">${supClock(Date.now() - t.run)}</span>` : t.d ? ` · <span class="tnum">${esc(t.d)}</span>` : ''}${isMos(snd(t)) ? ' · MOS' : ''}</span>
        ${t.note ? `<span class="v2-hstno">${esc(t.note)}</span>` : ''}</${X.ed ? 'button' : 'div'}>
      ${t.run ? '<span class="v2-hsmk run">● REC</span>' : X.ed ? `<button type="button" class="v2-hsmk ${ea(t.st)}" data-act="v2-supmk" data-id="${ea(sh.id)}" data-n="${i}" aria-label="${ea(`Toma ${t.n}: ${TAKE_ST[t.st]}. Toca para cambiar la marca`)}">${esc(TAKE_ST[t.st])}</button>`
        : `<span class="v2-hsmk ${ea(t.st)}">${esc(TAKE_ST[t.st])}</span>`}</div>`).join('');
  return `<div class="v2-hsth"><h3>Tomas</h3>${X.ed && rows ? '<span>Toca la marca para cambiarla</span>' : ''}</div>
    ${rows ? `<section class="v2-card v2-hstk">${rows}</section>` : `<p class="v2-hsnone">${X.ed ? 'Todavía no hay tomas: REC graba la primera.' : 'Todavía no hay tomas.'}</p>`}`;
}
const v2SupDock = (X, sh) => X.ed && sh ? `<div class="v2-hsdock">
    <button type="button" class="v2-hsnb" data-act="v2-supnote" data-id="${ea(sh.id)}" aria-label="Nota de la toma" title="Nota de la toma">${v2I('note')}</button>
    <button type="button" class="v2-hsdone" data-act="sup-next" data-id="${ea(sh.id)}" title="Marca este plano como rodado y pone en cámara el siguiente">${v2I('check')}<span>Rodado · siguiente</span></button></div>` : '';
const v2SupHead = s => s ? `<p class="v2-hssc">${esc(s.key)}. ${esc(s.heading)}</p>` : '';
function v2SupDone(X) {
  return `<section class="v2-card v2-hspl v2-hsend"><h2>${X.shots.length ? 'Todos los planos de la jornada están rodados' : 'Esta jornada no tiene planos todavía'}</h2>
    <p class="v2-hsd">${X.shots.length ? (X.ed ? 'Elige un plano en «Todas las escenas» del menú ⋯ para volver a él.' : '') : 'Créalos en el guion o el storyboard.'}</p>
    ${X.ed && X.shots.length ? `<button type="button" class="v2-btn" data-act="sup-step" data-id="${ea(X.shots[X.shots.length - 1].id)}" data-dir="-1">${v2I('prev')}<span>Volver al último plano</span></button>` : ''}</section>`;
}

/* ---------- celular ---------- */
function v2SupPhone(X) {
  const sh = X.cur, s = sh && sceneOfKey(sh.sc);
  if (!X.keys.length) return `<div class="v2-hsm"><p class="v2-hsnone">No hay escenas en esta jornada. Elige otra en el menú ⋯.</p></div>`;
  return `<div class="v2-hsm">${sh ? v2SupHead(s) + v2SupPlano(X, sh) + v2SupRec(X, sh) + v2SupTakes(X, sh) : v2SupDone(X)}</div>${v2SupDock(X, sh)}`;
}

/* ---------- computadora ---------- */
function v2SupTabs(X) {
  const { days, bank, dates } = X, on = j => UI.supDay === j ? ' on' : '';
  return `<div class="v2-cltabs v2-hstabs">${days.map((d, j) => `<button type="button" class="v2-clt${on(j)}" data-act="sup-go" data-d="${j}">Jornada ${j + 1}${dates[j] ? ' · ' + esc(v2ShortDay(dates[j])) : ''}</button>`).join('')}
    ${bank.length ? `<button type="button" class="v2-clt${on(-2)}" data-act="sup-go" data-d="-2">Sin programar</button>` : ''}
    <button type="button" class="v2-clt${on(-1)}" data-act="sup-go" data-d="-1">Todas las escenas</button>
    <span class="v2-grow"></span>${v2SupRolls(X)}</div>`;
}
const v2SupRolls = X => [['Cámara', 'roll'], ['Sonido', 'sroll']].map(([lab, f]) => {
  const v = P.sup[f];
  return X.ed ? `<button type="button" class="v2-clt v2-hsroll${v ? '' : ' add'}" data-act="sup-rolls" data-k="${f}" aria-haspopup="dialog" title="Cambia la tarjeta o el rollo cuando cambien: las tomas nuevas los anotan solas">${v ? `<span>${lab}</span><b>${esc(v)}</b>` : `${v2I('plus')}${lab}`}</button>`
    : v ? `<span class="v2-clt v2-hsroll"><span>${lab}</span><b>${esc(v)}</b></span>` : '';
}).join('');
function v2SupKpis(X, S) {
  const n = X.shots.length, pct = n ? S.done / n * 100 : 0;
  return `<div class="v2-kpis v2-hskpis">
    <div class="v2-kpi k"><span>Planos rodados</span><b>${S.done}</b><small>de ${n} ${n === 1 ? 'plano' : 'planos'}</small><i class="v2-hsbar"><i style="width:${ea(pct.toFixed(1))}%"></i></i></div>
    <div class="v2-kpi"><span>Escenas completas</span><b>${S.scDone.length}</b><small>de ${X.keys.length}</small></div>
    <div class="v2-kpi"><span>Páginas</span><b>${esc(fmtEighths(S.eDn))}</b><small>de ${esc(fmtEighths(S.ePl))}</small></div>
    <div class="v2-kpi"><span>Tomas</span><b>${S.takes}</b><small>${S.good} ${S.good === 1 ? 'buena' : 'buenas'}</small></div>
    <div class="v2-kpi"><span>Tiempo en pantalla</span><b>${S.hasReal ? supFmt(S.real) : '0:00'}</b><small>de ${supFmt(S.plan)} previsto</small></div>
  </div>`;
}
/* los horarios de la jornada: llamado, primera toma, almuerzo, última toma, fin y horas extra */
function v2SupHours(X) {
  const { dm, dayKey, ed, shots } = X; if (!dm) return '';
  const [f0, l0] = supFirstLast(shots), callPlan = !dm.call && P.schedule.call ? P.schedule.call : '';
  const tm = (f, lab, auto, ph = '--:--') => ed ? `<input type="text" inputmode="numeric" class="tm v2-hshv${auto && !dm[f] ? ' auto' : ''}" maxlength="8" value="${esc(dm[f] || '')}" placeholder="${esc(auto || ph)}" data-bind="sup-dayf" data-f="${f}" data-id="${ea(dayKey)}" aria-label="${ea(lab)}">`
    : `<b class="v2-hshv${dm[f] ? '' : ' ph'}">${esc(dm[f] || auto || '—')}</b>`;
  const L = supLen(dm.call || P.schedule.call, dm.wrap);
  const c = (lab, val, sub = '') => `<div><span>${lab}${sub ? ` <small>${sub}</small>` : ''}</span>${val}</div>`;
  return `<section class="v2-card v2-hshours" aria-label="Horarios de la jornada">
    ${c('Llamado', tm('call', 'Llamado', callPlan), callPlan ? 'del plan' : '')}${c('Primera toma', tm('first', 'Primera toma', f0))}
    ${c('Almuerzo', `<span class="v2-hslu">${tm('lu0', 'Almuerzo: desde')}<i>–</i>${tm('lu1', 'Almuerzo: hasta')}</span>`)}${c('Última toma', tm('last', 'Última toma', l0))}
    ${c('Fin de jornada', tm('wrap', 'Fin de jornada'), L ? esc(L) + ' h' : '')}
    ${c('Horas extra', ed ? `<input type="text" class="v2-hshv" value="${esc(dm.extra || '')}" placeholder="—" data-bind="sup-dayf" data-f="extra" data-id="${ea(dayKey)}" aria-label="Horas extra">` : `<b class="v2-hshv${dm.extra ? '' : ' ph'}">${esc(dm.extra || '—')}</b>`)}
  </section>`;
}
function v2SupCam(X) {
  const sh = X.cur, s = sh && sceneOfKey(sh.sc), nx = sh && supNextOf(X.shots, sh);
  return `<section class="v2-hscam" aria-label="En cámara"><h2 class="v2-ch">En cámara</h2>
    ${sh ? v2SupHead(s) + v2SupPlano(X, sh) + v2SupRec(X, sh) + v2SupTakes(X, sh) + v2SupDock(X, sh)
      + `<p class="v2-hsnext">${nx ? `Sigue: <b>${esc(D.code[nx.id])}</b>${supTech(nx) ? ' · ' + esc(supTech(nx)) : ''}` : 'Es el último plano sin rodar de la jornada.'}</p>` : v2SupDone(X)}</section>`;
}
function v2SupDesk(X) {
  const S = supStats(X);
  const dirs = (P.meta.directors || []).map(personName).filter(Boolean);
  const who = P.sup.supervisor ? `<b>${esc(P.sup.supervisor)}</b>` : X.ed ? `<button type="button" class="v2-link" data-act="sup-who">Agregar</button>` : '—';
  return `<div class="v2-pg v2-hsd hs">
    ${v2SupTabs(X)}
    <p class="v2-hsmeta"><span>${esc(supDayTitle(X))}</span>${dirs.length ? ` · Dirección: <b>${esc(dirs.join(', '))}</b>` : ''} · Script: ${who}</p>
    ${v2SupKpis(X, S)}${v2SupHours(X)}
    <div class="v2-hsg"><div class="v2-hslog">${supLogHTML(X)}</div>
      <aside class="v2-hsside">${v2SupCam(X)}${supDaySideHTML(X)}</aside></div>
  </div>`;
}

RENDER.sup = (orig => function () {
  if (!V2.on) return orig.apply(this, arguments);
  const v = $('#view');
  if (!D.sc.scenes.length) { v.innerHTML = `<div class="v2-pg">${emptyScript()}</div>`; bindView(); return; }
  const X = supCtx(), phone = SUPV.phone = PHONE();
  if (!UI.supFold) UI.supFold = {};
  v.innerHTML = phone ? v2SupPhone(X) : v2SupDesk(X);
  bindView();
  SUPV.dir = 0;
  supAfter(v);
  v2SupSwipe(v);
})(RENDER.sup);
V2_ACTS.sup = () => {
  const X = supCtx();
  return v2Hist() + (X.ed && X.dayKey ? `<button type="button" class="v2-btn" data-v2a="supquick">${v2I('bolt')}<span>Carga rápida</span></button>` : '')
    + (X.dayKey ? `<button type="button" class="v2-btn y" data-v2a="supparte">${v2I('print')}<span>Parte diario</span></button>` : '');
};
V2_DO.supquick = () => supQuick();
V2_DO.supparte = b => exportPDF('parte', b);

/* deslizar la tarjeta del plano al costado: el plano siguiente o el anterior de la escena (como ‹ ›) */
function v2SupSwipe(v) {
  const c = $('.v2-hspl[data-v2swipe]', v); if (!c) return;
  let x0 = null, y0 = 0;
  c.addEventListener('touchstart', e => { const p = e.touches[0]; x0 = e.touches.length === 1 && p.clientX > 24 && p.clientX < innerWidth - 24 ? p.clientX : null; y0 = p.clientY; }, { passive: true });
  c.addEventListener('touchcancel', () => { x0 = null; }, { passive: true });
  c.addEventListener('touchend', e => {
    if (x0 == null) return;
    const p = e.changedTouches[0], dx = p.clientX - x0, dy = p.clientY - y0; x0 = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * .6) return;
    const b = $(`[data-act="sup-step"][data-dir="${dx < 0 ? 1 : -1}"]`, c); if (b && !b.disabled) b.click();
  }, { passive: true });
}

Object.assign(ACT, {
  'v2-supmos': b => supMosShot(b.dataset.id, !supMos(b.dataset.id)),
  // tocar la marca la cambia: OK → Buena → NG → OK
  'v2-supmk': b => {
    const t = supTakes(b.dataset.id)[+b.dataset.n]; if (!t || t.run) return;
    supMarkTake(t, V2_MKNEXT[t.st] || 'ok'); changed('data'); render();
  },
  // la nota de la toma en cámara (la que corre o la última); sin tomas, las observaciones del plano
  'v2-supnote': b => {
    const id = b.dataset.id, t = supCurTake(id); if (!P.shots[id]) return;
    const obs = !t, val = obs ? (P.sup.obs || {})[id] || '' : t.note || '';
    popover(b, `<h5>${obs ? `Observaciones del plano ${esc(D.code[id])}` : `Nota · toma ${esc(t.n)} · plano ${esc(D.code[id])}`}</h5>
      <textarea id="v2Tn" rows="4" placeholder="${obs ? 'Rácord, foco, sonido, cambios de texto…' : 'Foco, ruido, cambio de texto…'}">${esc(val)}</textarea>
      <div class="v2-popf">${!obs && SUP_SR ? `<button type="button" class="v2-btn" data-mic>${v2I('mic')}<span>Dictar</span></button>` : ''}<span class="v2-grow"></span><button type="button" class="v2-btn y" data-ok>Listo</button></div>`, p => {
      p.classList.add('v2-pop');
      const ta = $('#v2Tn', p);
      const save = () => { if (obs) { P.sup.obs = P.sup.obs || {}; if (ta.value.trim()) P.sup.obs[id] = ta.value; else delete P.sup.obs[id]; } else t.note = ta.value; changed('data'); };
      let typed = false;
      ta.addEventListener('input', () => { typed = true; save(); });
      p._onClose = () => { if (typed || !obs) render(); };
      p.addEventListener('click', e => {
        if (e.target.closest('[data-ok]')) { closePop(); return; }
        if (e.target.closest('[data-mic]')) { supDictate(); const iv = setInterval(() => { if (!ta.isConnected) return clearInterval(iv); if (document.activeElement !== ta && ta.value !== (t.note || '')) ta.value = t.note || ''; }, 400); }
      });
      if (!matchMedia('(pointer:coarse)').matches) setTimeout(() => ta.focus(), 0);
    });
  },
});

/* el número de la escena sobre el color de su tira: los de la v2 (el plan de rodaje) */
{
  const _no = supNo;
  supNo = function (s, cls = '') {
    if (!V2.on) return _no.apply(this, arguments);
    const k = stripKey(s), c = (V2_STRIP[k] || V2_STRIP.di)[1];
    return `<span class="hs-no v2-hsno${cls ? ' ' + ea(cls) : ''}" style="--strip:${ea(c)}">${esc(s.key)}</span>`;
  };
}

/* ---------- el «⋯» del teléfono: lo de la v1 que no está en la pantalla del PDF (v2.js arma el menú y las hojas) ---------- */
V2_MMORE.sup = () => {
  const X = supCtx(), s = X.cur && sceneOfKey(X.cur.sc);
  const day = X.n >= 0 ? `Jornada ${X.n + 1}${X.dates[X.n] ? ' · ' + v2ShortDay(X.dates[X.n]) : ''}` : X.n === -2 ? 'Sin programar' : 'Todas las escenas';
  return [
    ['supday', 'cal', 'Jornada', day],
    ['supall', 'list', 'Todas las escenas', 'Toca un plano para ponerlo en cámara'],
    s ? ['supcont', 'cont', `Continuidad · escena ${s.key}`, 'Vestuario, utilería, fotos y tiempo'] : null,
    X.dm ? ['supjday', 'clock', 'La jornada', 'Horarios, incidencias y notas'] : null,
    X.ed && X.cur ? ['supadd', 'plus', '+ Toma', 'Deja lista la toma que sigue, sin grabar'] : null,
    X.ed && X.dayKey ? ['supquick', 'bolt', 'Carga rápida', 'Pasar una hoja llenada a mano'] : null,
    X.dayKey ? ['supparte', 'print', 'Parte diario', 'Resumen para producción (PDF)'] : null,
  ].filter(Boolean);
};
Object.assign(V2_MDO, {
  supday: a => {
    const X = supCtx();
    const it = X.days.map((d, j) => [j, `Jornada ${j + 1}${X.dates[j] ? ' · ' + v2ShortDay(X.dates[j]) : ''}`, `${d.keys.length} esc.`]);
    if (X.bank.length) it.push([-2, 'Sin programar', `${X.bank.length} esc.`]);
    it.push([-1, 'Todas las escenas', '']);
    v2PickMenu(a, it.map(([j, n, m]) => [j, n, m, UI.supDay === j]), j => { UI.supDay = +j; if (UI.supDay >= 0) UI.callDay = UI.supDay; render(); });
  },
  supall: () => v2Sheet('supall'),
  supcont: () => v2Sheet('supcont'),
  supjday: () => v2Sheet('supjday'),
  supadd: () => { const X = supCtx(); if (X.cur) supTakeAdd(X.cur.id); },
  supquick: () => supQuick(),
  supparte: a => exportPDF('parte', a),
});
const v2SupSheetAfter = box => {
  $$('textarea.hs-grow', box).forEach(supGrow);
  const keys = $$('[data-sp]', box).map(x => x.dataset.sp);
  if (keys.length) candFramesNeed(keys, 'sup');
};
Object.assign(V2_SHEET, {
  supall: { tab: 'sup', title: 'Todas las escenas', cls: 'hs hs-m v2-hssh', closeOn: ['sup-cam'], after: v2SupSheetAfter, html: () => supMAllHTML(supCtx()) },
  supcont: { tab: 'sup', title: 'Continuidad', cls: 'hs hs-m v2-hssh', after: v2SupSheetAfter, html: () => { const X = supCtx(), s = X.cur && sceneOfKey(X.cur.sc); return s ? `<p class="v2-hssc">${esc(s.key)}. ${esc(s.heading)}</p>` + supContHTML(X, s) + (X.ed ? `<div class="hs-tfoot"><button type="button" class="hs-pill" data-act="sup-wild" data-k="${ea(s.key)}">+ Wild / ambiente</button></div>` : '') : '<p class="v2-mut">No hay un plano en cámara.</p>'; } },
  supjday: { tab: 'sup', title: 'La jornada', cls: 'hs hs-m v2-hssh', after: v2SupSheetAfter, html: () => { const X = supCtx(); return X.dm ? `<div class="v2-hsrolls">${v2SupRolls(X)}</div>${v2SupHours(X)}${supDaySideHTML(X)}` : ''; } },
});
