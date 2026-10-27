// Arma el diccionario del inglés para el programa: node i18n/hacer.js > (lo agrega build.sh al código)
// · i18n/en.json: cada texto del programa (español) y su traducción (null: no es un texto de la interfaz)
// · i18n/glosario-en.md: los nombres de la industria (pestañas, documentos, categorías…): mandan sobre en.json
// Salida: const I18N_EN = { x: frases exactas, p: plantillas con {0}, f: partes de los nombres de archivo }
const fs = require('fs'), path = require('path');
const here = __dirname;
const D = JSON.parse(fs.readFileSync(path.join(here, 'en.json'), 'utf8'));
// i18n/en-manual.json: las correcciones y lo que faltaba (manda sobre en.json)
const MAN = path.join(here, 'en-manual.json');
const M = fs.existsSync(MAN) ? Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(MAN, 'utf8'))).filter(([a]) => !a.startsWith('//'))) : {};
Object.assign(D, M);
const x = {}, p = [], k = {};
const LET = s => s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñü]/g, '');
const SW = new Set('de del la las el los lo y e o u a al en con por para un una que se su sus es'.split(' '));
const NO = new Set(['IF', 'En']);   // IF: los días por actor (los pone el programa); «En» suelto es ambiguo
for (const [es, en] of Object.entries(D)) {
  if (en == null || typeof en !== 'string' || !en.trim() || en === es) { if (en === es && en) x[es] = en; continue; }
  if (/\{\d+\}/.test(es)) {
    // casi sin palabras («{0} de {1}»): solo para números
    const words = (es.replace(/\{\d+\}/g, ' ').match(/[A-Za-zÁÉÍÓÚÑáéíóúñü]+/g) || []).filter(w => !SW.has(w.toLowerCase()));
    p.push(words.join('').length < 3 ? [es, en, 1] : [es, en]);
  } else if (LET(es).length > 1 && !NO.has(es)) x[es] = en;   // (de una letra, no)
}
// el glosario: filas «| español | inglés |»; las listas con « · » van de a pares (con su rótulo «Etapas: …» si lo tienen)
const G = fs.readFileSync(path.join(here, 'glosario-en.md'), 'utf8');
const clean = s => s.replace(/\s*\((?:en |el |la |los |las |cuando |con |solo |de |del |cargo|vista|ver )[^)]*\)/gi, '').replace(/\*\*/g, '').trim();
let n = 0;
for (const line of G.split('\n')) {
  const m = /^\|([^|]+)\|([^|]+)\|\s*$/.exec(line.trim()); if (!m) continue;
  let es = clean(m[1]), en = clean(m[2]);
  if (/^(Español|---)/.test(es)) continue;
  es = es.replace(/^Siglas\s+/, '');
  // «[contexto] …»: vale solo ahí (data-trk="contexto"), p. ej. [stage] la fila de etapas, [home] la pantalla de Inicio
  const cm = /^\[(\w+)\]\s*(.*)$/.exec(es);
  if (cm) { const A = cm[2].split(' · '), B = en.split(' · '); if (A.length === B.length) { k[cm[1]] = k[cm[1]] || {}; A.forEach((a, i) => { k[cm[1]][a.trim()] = B[i].trim(); }); } continue; }
  const A = es.split(' · '), B = en.split(' · ');
  if (A.length !== B.length) continue;
  A.forEach((a, i) => {
    let b = B[i];
    const la = /^([^:]+):\s+(.+)$/.exec(a), lb = /^([^:]+):\s+(.+)$/.exec(b);
    if (la && lb) { x[la[1].trim()] = lb[1].trim(); a = la[2]; b = lb[2]; }
    a = a.trim(); b = b.trim();
    if (!a || !b || /[«»]/.test(a) || a.length < 2) return;
    x[a] = b; n++;
  });
}
// lo de en-manual.json tiene la última palabra (también sobre el glosario)
for (const [a, b] of Object.entries(M)) if (typeof b === 'string' && !/\{\d+\}/.test(a)) x[a] = b;
// los nombres de los archivos que se exportan: «_hoja_de_llamado» → «_call_sheet»
const f = {
  '_hojas_de_llamado': '_call_sheets', '_plan_de_rodaje': '_shooting_schedule', '_dias_por_actor': '_day_out_of_days', '_calendario_meses': '_calendar_months',
  '_calendario': '_calendar', '_desglose_con_fotos': '_breakdown_with_photos', '_desglose': '_breakdown', '_guion_rayado_y_etiquetado': '_lined_and_tagged_script', '_guion_etiquetado': '_tagged_script', '_guion_rayado': '_lined_script', '_guion_tecnico': '_shot_list',
  '_guion': '_script', '_storyboard_planta': '_storyboard_floor_plan', '_presupuesto': '_budget', '_escaleta': '_step_outline', '_argumento': '_treatment',
  '_tarjetas': '_index_cards', '_biografias': '_character_bios', '_hoja_de_script': '_script_supervisor_report', '_reporte_de_camara': '_camera_report',
  '_reporte_de_sonido': '_sound_report', '_locaciones_elegidas': '_chosen_locations', '_reparto_elegido': '_chosen_cast', '_sin_fotos': '_no_photos',
  '_version_cerrada': '_locked_version', '_archivo': '_archive', '_escenas_': '_scenes_', '_jornadas_': '_days_', '_jornada_': '_day_', '_paginas_': '_pages_',
  '_hoja_de_llamado_J': '_call_sheet_day_', '_hoja_de_llamado': '_call_sheet', '_parte_diario_jornada_': '_daily_production_report_day_', '_parte_diario': '_daily_production_report',
  '_planta_general_esc': '_overall_floor_plan_sc', '_planta_': '_floor_plan_', '_lamina_': '_photo_board_', '_equipo': '_crew', '_storyboard': '_storyboard', '_scouting': '_scouting', '_casting': '_casting',
  '_orden_de_compra_': '_purchase_order_', '_sobre_de_caja_chica_': '_petty_cash_envelope_', '_reporte_de_sobrecostos': '_overage_report', '_pagos': '_payments',
  '_premisa_y_mundo': '_premise_and_world', '_estructura': '_structure',   // lote AD · historia
};
process.stdout.write('const I18N_EN = ' + JSON.stringify({ x, p, f, k }) + ';\n');
process.stderr.write(`i18n: ${Object.keys(x).length} frases, ${p.length} plantillas, ${n} del glosario\n`);
