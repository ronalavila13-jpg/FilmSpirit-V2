/* ============================================================
   SERIES · episodios de una serie de TV en un solo proyecto
   El guion lleva todos los episodios seguidos; el primer encabezado de cada uno marca dónde empieza (p.ep) y sus
   escenas se numeran 101-1, 101-2… (core.js · computeScenes, epApply). Aquí: la tarjeta de Proyecto y la ventana
   «Episodios» (convertir en serie, agregar en blanco o desde un archivo, título, número, renumerar, unir y dividir),
   los episodios en la lista de escenas, el plan por bloques de episodios y los episodios de cada personaje.
   ============================================================ */
const epCan = () => P && P.paras.length && typeof edEditable === 'function' && edEditable() && !(typeof scriptLock === 'function' && scriptLock());
const epList = () => (D && D.sc && D.sc.eps) || [];
/* el número que sigue: 101 → 102; sin episodios, 101 (temporada 1, episodio 1) */
function epNext() {
  const L = epList().map(e => e.n), nums = L.filter(x => /^\d+$/.test(x)).map(Number);
  let n = nums.length ? Math.max(...nums) + 1 : 101;
  while (L.includes(String(n))) n++;
  return String(n);
}
/* lo de cada episodio: escenas, octavos, reparto y en qué jornadas del plan está */
function epStats() {
  const dayOf = {};
  if (P.schedule.items.some(it => it.d)) scheduleDays(P, D.sc).days.forEach((d, n) => d.keys.forEach(k => { dayOf[k] = n + 1; }));
  return epList().map(e => {
    const sc = D.sc.scenes.slice(e.s0, e.s1), cast = new Set();
    let e8 = 0, done = 0; const days = new Set();
    for (const s of sc) {
      e8 += D.metrics.eighths[s.idx] || 0;
      D.sem[s.idx].forEach(id => { if (P.elements[id] && P.elements[id].cat === 'cast') cast.add(id); });
      if (dayOf[s.key]) { done++; days.add(dayOf[s.key]); }
    }
    const dl = [...days].sort((a, b) => a - b);
    return { ...e, t: epTitle(P, e.n), sc, e8, cast: cast.size, planned: done, days: dl };
  });
}
const epDaysTxt = d => !d.length ? '' : d.length === 1 ? 'Jornada ' + d[0] : `Jornadas ${d[0]} a ${d[d.length - 1]}`;
function epTableHTML(ed) {
  const L = epStats();
  return `<div class="tbl-wrap epi-tbl"><table class="tbl"><thead><tr><th>Episodio</th><th>Título</th><th class="num">Escenas</th><th class="num">Págs.</th><th class="num">Reparto</th><th>Plan de rodaje</th>${ed ? '<th></th>' : ''}</tr></thead><tbody>
    ${L.map((e, i) => `<tr><td>${ed ? `<input class="w-sm tnum" value="${esc(e.n)}" data-bind="ep-num" data-ep="${esc(e.n)}" aria-label="Número del episodio ${esc(e.n)}" maxlength="6">` : `<b class="tnum">${esc(e.n)}</b>`}</td>
      <td>${ed ? `<input value="${esc(e.t)}" placeholder="Sin título" data-bind="ep-title" data-ep="${esc(e.n)}" aria-label="Título del episodio ${esc(e.n)}" maxlength="120">` : esc(e.t || '—')}</td>
      <td class="num">${e.sc.length}${e.sc.length ? ` <small class="hint">${esc(e.sc[0].key)}…</small>` : ''}</td><td class="num">${fmtEighths(e.e8)}</td><td class="num">${e.cast}</td>
      <td>${e.planned ? `${e.planned === e.sc.length ? 'Todo programado' : `${e.planned} de ${e.sc.length} escenas`} <small class="hint">${esc(epDaysTxt(e.days))}</small>` : '<span class="hint">Sin programar</span>'}</td>
      ${ed ? `<td class="epi-acts"><button class="btn sm ghost" data-act="ep-go" data-ep="${esc(e.n)}">Ver guion</button><button class="btn sm ghost" data-act="ep-more" data-ep="${esc(e.n)}" data-i="${i}" aria-label="Más opciones del episodio ${esc(e.n)}" aria-haspopup="menu">${ICO.more}</button></td>` : ''}</tr>`).join('')}
    </tbody></table></div>`;
}
/* Proyecto: la tarjeta de la serie */
function seriesCardHTML() {
  if (!P.paras.length) return '';
  const ed = epCan();
  if (!isSeries(P)) return ed ? `<div class="card pj-card pj-wide epi-card"><h2 class="eyebrow">Serie de TV</h2>
    <p class="hint" style="margin:0">¿Es una serie? Conviértela y cada episodio tendrá su guion y su numeración de escenas (101-1, 101-2…), con un solo reparto, locaciones, plan de rodaje por bloques y presupuesto para toda la temporada.</p>
    <div class="pj-lb"><button class="btn" data-act="ep-convert">Convertir en serie…</button></div></div>` : '';
  const L = epList();
  return `<div class="card pj-card pj-wide epi-card"><h2 class="eyebrow">Serie de TV · ${L.length} ${L.length === 1 ? 'episodio' : 'episodios'}</h2>
    ${epTableHTML(ed)}
    ${ed ? `<div class="pj-lb"><button class="btn" data-act="ep-import">Agregar episodio desde un archivo…</button><button class="btn ghost" data-act="ep-blank">Agregar episodio en blanco</button><button class="btn ghost" data-act="ep-split">Empezar un episodio en una escena…</button></div>` : ''}
    <p class="hint" style="margin:6px 0 0">El reparto, las locaciones y los elementos son uno solo para toda la serie. En el plan de rodaje, «Bloque» arma jornadas con las escenas de varios episodios juntas, por locación.</p></div>`;
}
function epDialog() {
  if (!isSeries(P)) { epConvertDialog(); return; }
  const ed = epCan(), L = epList();
  const m = modal({
    title: `Episodios · ${L.length}`, wide: true,
    body: epTableHTML(ed) + (ed ? '' : '<p class="hint">Solo lectura.</p>'),
    foot: ed ? `<button class="btn ghost" data-act="ep-split">Empezar un episodio en una escena…</button><span class="grow"></span><button class="btn ghost" data-act="ep-blank">Agregar en blanco</button><button class="btn primary" data-act="ep-import">Agregar desde un archivo…</button>` : '<button class="btn" data-close>Cerrar</button>',
  });
  m.classList.add('epi-dlg');
}
/* repinta lo que esté abierto: la ventana de episodios (si está) y la vista */
function epRefresh() {
  derive(); render();
  if ($('#modal.epi-dlg')) epDialog();
}
function epDone(msg, map) {
  if (map && UI.sbScene && UI.sbScene in map) UI.sbScene = map[UI.sbScene];
  if (typeof edCommit === 'function' && UI.tab === 'script' && UI.scriptEdit) edCommit(true);
  changed('script'); changed('data');
  epRefresh();
  if (msg) toastUndo(msg);
}
function epConvertDialog() {
  if (!epCan()) { toast(typeof scriptLock === 'function' && scriptLock() ? 'El guion está cerrado: sus números de escena no se cambian.' : 'No puedes cambiar el guion de este proyecto.'); return; }
  const n0 = D.sc.scenes.length;
  const m = modal({
    title: 'Convertir en serie',
    body: `<p style="margin-top:0">El guion que ya tienes pasa a ser el primer episodio y sus escenas toman el número del episodio delante (la escena 5 pasa a ser la 101-5). El desglose, el plan, los planos y las notas siguen a su escena.</p>
      <div class="fld"><span>Número del primer episodio</span><input id="epN" value="101" maxlength="6" class="tnum" style="max-width:120px"><span class="hint">Lo usual: 101 (temporada 1, episodio 1). También 1, 2, 3…</span></div>
      <div class="fld"><span>Título del episodio</span><input id="epT" placeholder="Piloto" maxlength="120"></div>
      <p class="hint">${n0} ${n0 === 1 ? 'escena' : 'escenas'}. Después agrega los demás episodios desde Final Draft, Fountain o PDF, o en blanco.</p>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="epOk">Convertir</button>',
  });
  $('#epOk', m).onclick = () => {
    const n = $('#epN', m).value.trim();
    if (!epOk(n)) { toast('El número del episodio: hasta 6 letras o números, sin espacios (101, 2, S1E1).'); return; }
    closeModal();
    histNote('Convertir en serie');
    const map = epConvert(P, n);
    epSetTitle(P, n, $('#epT', m).value);
    epDone(`Ahora es una serie: episodio ${n} con ${n0} ${n0 === 1 ? 'escena' : 'escenas'}.`, map);
  };
}
/* un episodio en blanco al final: un encabezado listo para escribir */
function epBlank() {
  if (!epCan()) return;
  if (!isSeries(P)) { epConvertDialog(); return; }
  const n = epNext();
  histNote('Agregar episodio');
  epAppend(P, [{ t: 'h', x: 'INT. LUGAR - DÍA' }, { t: 'a', x: '' }], n, '');
  epDone(`Episodio ${n} agregado al final del guion.`);
  epGo(n);
}
function epGo(n) {
  closeModal();
  const e = (D.sc.eps || []).find(x => x.n === n); if (!e) return;
  UI.scene = e.s0;
  if (UI.tab !== 'script') setTab('script'); else render();
  requestAnimationFrame(() => {
    if (UI.scriptEdit && typeof edSetCaret === 'function') { const el = $(`#ed .ep[data-i="${e.p0}"]`); if (el) { el.scrollIntoView({ block: 'start' }); edSetCaret(e.p0, 0); } }
    else if (typeof gotoScene === 'function') gotoScene(e.s0);
  });
}
function epMenu(b) {
  const n = b.dataset.ep, L = epList(), i = L.findIndex(e => e.n === n);
  const p = popover(b, `<div class="menu" role="menu">
    <button role="menuitem" data-k="renum">Renumerar sus escenas (${esc(n)}-1, ${esc(n)}-2…)</button>
    ${i > 0 ? `<button role="menuitem" data-k="merge">Unir con el episodio ${esc(L[i - 1].n)}</button>` : ''}
    <button role="menuitem" data-k="plan">Armar su bloque en el plan…</button></div>`, pp => {
    pp.addEventListener('click', e => {
      const k = e.target.closest('[data-k]'); if (!k) return;
      closePop();
      if (k.dataset.k === 'renum') {
        if (!proGate('scriptnum')) return;
        histNote('Renumerar episodio');
        const map = epApply(P, null, [n]);
        epDone(`Escenas del episodio ${n} renumeradas desde ${n}-1.`, map);
      } else if (k.dataset.k === 'merge') {
        askBox({ title: `¿Unir el episodio ${n} con el ${L[i - 1].n}?`, text: `Sus escenas pasan al episodio ${L[i - 1].n} (con su numeración) y el título del ${n} se quita. Se puede deshacer.`, ok: 'Unir', danger: false, onOk: () => {
          histNote('Unir episodios');
          const map = epApply(P, () => { delete P.paras[L[i].p0].ep; });
          epSetTitle(P, n, '');
          epDone(`El episodio ${n} quedó dentro del ${L[i - 1].n}.`, map);
        } });
      } else if (k.dataset.k === 'plan') { closeModal(); setTab('plan'); requestAnimationFrame(() => planBlockDialog([n])); }
    });
  });
  return p;
}
/* empezar un episodio en una escena (un guion de varios episodios importado de una vez) */
function epSplitDialog() {
  if (!epCan()) return;
  const S = D.sc.scenes.filter(s => !(D.sc.eps || []).some(e => e.s0 === s.idx));
  if (!S.length) { toast('Cada escena ya empieza un episodio.'); return; }
  const cur = D.sc.scenes[UI.scene] && S.includes(D.sc.scenes[UI.scene]) ? D.sc.scenes[UI.scene] : S[0];
  const m = modal({
    title: 'Empezar un episodio en una escena',
    body: `<div class="fld"><span>Escena donde empieza</span><select id="epS">${S.map(s => `<option value="${ea(s.idx)}" ${s === cur ? 'selected' : ''}>${esc(s.key)} · ${esc(s.heading.slice(0, 60))}</option>`).join('')}</select></div>
      <div class="fld"><span>Número del episodio</span><input id="epN" value="${ea(epNext())}" maxlength="6" class="tnum" style="max-width:120px"></div>
      <div class="fld"><span>Título</span><input id="epT" maxlength="120" placeholder="Sin título"></div>
      <p class="hint">Desde esa escena hasta el episodio que sigue, todo pasa al episodio nuevo y se numera desde 1 (lo de cada escena la sigue).</p>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="epOk">Empezar episodio</button>',
  });
  $('#epOk', m).onclick = () => {
    const n = $('#epN', m).value.trim(), s = D.sc.scenes[+$('#epS', m).value];
    if (!epOk(n)) { toast('El número del episodio: hasta 6 letras o números, sin espacios.'); return; }
    if (epList().some(e => e.n === n)) { toast(`Ya hay un episodio ${n}.`); return; }
    const t = $('#epT', m).value;
    closeModal();
    histNote('Empezar episodio');
    const map = epApply(P, () => { P.paras[s.p0].ep = n; }, [n]);
    epSetTitle(P, n, t);
    epDone(`El episodio ${n} empieza en la escena que era ${s.key}.`, map);
  };
}
Object.assign(ACT, {
  'ep-open': () => epDialog(),
  'ep-convert': () => epConvertDialog(),
  'ep-blank': () => epBlank(),
  'ep-import': () => { closeModal(); if (!epCan()) return; pickFile(SCRIPT_ACCEPT, 'episode'); },
  'ep-go': b => epGo(b.dataset.ep),
  'ep-more': b => epMenu(b),
  'ep-split': () => { closeModal(); epSplitDialog(); },
});
Object.assign(BIND, {
  'ep-title': (el, ev) => { if (ev !== 'change' || !epCan()) return; epSetTitle(P, el.dataset.ep, el.value); changed('script'); epRefresh(); },
  'ep-num': (el, ev) => {
    if (ev !== 'change' || !epCan()) return;
    const from = el.dataset.ep, to = el.value.trim();
    if (to === from) return;
    if (!epOk(to)) { toast('El número del episodio: hasta 6 letras o números, sin espacios.'); el.value = from; return; }
    if (epList().some(e => e.n === to)) { toast(`Ya hay un episodio ${to}.`); el.value = from; return; }
    histNote('Número del episodio');
    const map = epRenum(P, from, to);
    if (!map) { el.value = from; return; }
    epDone(`El episodio ${from} ahora es el ${to}: sus escenas pasaron a ${to}-1, ${to}-2…`, map);
  },
});

/* ---------- la lista de escenas: los episodios como títulos ---------- */
function epSideHead(e) {
  const n = e.s1 - e.s0, e8 = D.sc.scenes.slice(e.s0, e.s1).reduce((a, s) => a + (D.metrics.eighths[s.idx] || 0), 0);
  return `<li class="epi-li" data-q="${esc(('episodio ' + e.n + ' ' + epTitle(P, e.n)).toLowerCase())}"><button data-act="ep-open" title="Episodios de la serie"><b>${esc(e.n)}</b><span>${esc(epTitle(P, e.n) || 'Episodio ' + e.n)}</span><small class="tnum">${n} esc. · ${fmtEighths(e8)}</small></button></li>`;
}

/* ---------- plan de rodaje: bloques de episodios ----------
   Un bloque junta las escenas sin programar de varios episodios y propone jornadas por locación (como «Sugerir
   jornadas»), en una etapa nueva con su nombre («Bloque 2 · Ep. 103, 104»): se rueda por locación aunque las
   escenas sean de distintos episodios. Se puede deshacer y las jornadas se mueven a gusto. */
function planBlockDialog(pre) {
  if (typeof planEditable !== 'function' || !planEditable()) return;
  const { bank } = scheduleDays(P, D.sc), inBank = new Set(bank);
  const L = epList().map(e => ({ ...e, free: D.sc.scenes.slice(e.s0, e.s1).filter(s => inBank.has(s.key)).length }));
  const nB = (P.schedule.stages || []).filter(st => /^Bloque \d+/.test(st.name || '')).length + 1;
  const pick = new Set(pre || L.filter(e => e.free).slice(0, 2).map(e => e.n));
  const m = modal({
    title: 'Bloque de rodaje',
    body: `<p style="margin-top:0">Elige los episodios del bloque: sus escenas sin programar se ordenan por locación, juntando los episodios, en jornadas nuevas al final del plan.</p>
      <div class="epi-pick">${L.map(e => `<label class="opt"><input type="checkbox" value="${esc(e.n)}" ${pick.has(e.n) && e.free ? 'checked' : ''} ${e.free ? '' : 'disabled'}><span><b>${esc(epLabel(P, e.n))}</b><span class="hint">${e.free ? `${e.free} ${e.free === 1 ? 'escena sin programar' : 'escenas sin programar'}` : 'Ya está todo en el plan'}</span></span></label>`).join('')}</div>
      <div class="fld"><span>Nombre de la etapa</span><input id="blN" value="Bloque ${nB}" maxlength="80"></div>
      <div class="fld"><span>Dirección del bloque</span><input id="blD" placeholder="Opcional: quién dirige estos episodios" maxlength="80"></div>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="blOk">Armar jornadas</button>',
  });
  $('#blOk', m).onclick = () => {
    const eps = $$('.epi-pick input:checked', m).map(x => x.value);
    if (!eps.length) { toast('Elige al menos un episodio con escenas sin programar.'); return; }
    const name = `${$('#blN', m).value.trim() || 'Bloque ' + nB} · Ep. ${eps.join(', ')}`, dir = $('#blD', m).value.trim();
    closeModal();
    histNote('Bloque de rodaje');
    const n = planBlock(eps, name, dir);
    changed('data'); render();
    toastUndo(n ? `${n} ${n === 1 ? 'jornada' : 'jornadas'} del bloque «${name}», por locación. Muévelas o cámbialas a tu gusto.` : 'Esos episodios no tienen escenas sin programar.');
  };
}
function planBlock(eps, name, dir) {
  const set = new Set(eps.map(String)), S = P.schedule;
  const { bank, days } = scheduleDays(P, D.sc);
  const keys = bank.filter(k => { const s = sceneOfKey(k); return s && set.has(s.ep); });
  if (!keys.length) return 0;
  const ks = new Set(keys);
  const tmp = { schedule: { ...S, items: S.items.filter(it => it.k && ks.has(it.k)) } };
  autoPlan(tmp, { scenes: keys.map(sceneOfKey) }, D.metrics);
  // el plan: lo programado, el bloque nuevo y, al final, lo que sigue sin programar
  const inBank = new Set(bank);
  S.items = S.items.filter(it => !(it.k && inBank.has(it.k))).concat(tmp.schedule.items, S.items.filter(it => it.k && inBank.has(it.k) && !ks.has(it.k)));
  const after = scheduleDays(P, D.sc).days, n0 = days.length;
  if (!after[n0]) return 0;
  const st = { id: uid('st'), name: name.slice(0, 120), place: dir ? 'Dirección: ' + dir : '' };
  if (!(S.stages || []).length && n0 > 0) { const st0 = { id: uid('st'), name: '', place: '' }; S.stages = [st0]; after[0].brk.st = st0.id; }
  S.stages = (S.stages || []).concat(st);
  after[n0].brk.st = st.id;
  if (typeof sortStages === 'function') sortStages();
  return after.length - n0;
}
ACT['pl-block'] = () => planBlockDialog();
/* los episodios de una jornada («Ep. 101 · 102»), para la barra del plan y la hoja de llamado */
const epsOfKeys = keys => { const out = []; for (const k of keys) { const s = sceneOfKey(k); if (s && s.ep && !out.includes(s.ep)) out.push(s.ep); } return out; };

/* ---------- reparto: fijo o invitado ---------- */
/* en cuántos episodios está cada elemento: en todos (o casi), fijo; en uno o dos, invitado */
function epCastInfo(id) {
  const L = epList();
  if (!L.length) return null;
  const E = (D._elEps && D._elEpsSig === D.sc) ? D._elEps : (D._elEpsSig = D.sc, D._elEps = elEpisodes(D.sc, D.sem));
  const mine = E[id] || [];
  if (!mine.length) return null;
  const kind = L.length > 1 && mine.length >= Math.max(2, Math.ceil(L.length * .6)) ? 'Fijo' : L.length > 1 && mine.length <= 2 ? 'Invitado' : 'Recurrente';
  return { eps: mine, kind, of: L.length };
}
