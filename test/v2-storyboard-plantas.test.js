/* Storyboard v2, vista «Plantas» (src/v2-storyboard.js): la planta de cámara de cada plano con su viñeta en miniatura, agrupada
   por escena, y en cada encabezado un icono a la planta general de la escena.  node test/v2-storyboard-plantas.test.js */
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../src/v2-storyboard.js', 'utf8'), css = fs.readFileSync(__dirname + '/../src/v2-pant.css', 'utf8');
const pg = fs.readFileSync(__dirname + '/../src/planta-general.js', 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('el segmento de la cabecera es Cuadros / Plantas / Lista', () => {
  const i = src.indexOf('data-v="panels"'), j = src.indexOf('data-v="plantas"'), k = src.indexOf('data-v="table"');
  assert.ok(i > 0 && j > i && k > j, 'orden del segmento');
  assert.ok(/UI\.sbView !== 'table' && UI\.sbView !== 'plantas'/.test(src), 'Cuadros no queda marcado en Plantas');
});
test('cada plano lleva su planta de cámara y su viñeta en miniatura; los dibujados a mano lo dicen', () => {
  assert.ok(/plan \? v2PlImg\(sh\) \+ `<span class="v2-pli">\$\{sbFrames\(sh\)\}<\/span>`/.test(src));
  assert.ok(/plantaShotCanvas\(s3, 320, 2, Math\.round\(320 \* 9 \/ 16\)\)/.test(src), 'planta 16:9');
  assert.ok(/Dibujado a mano: sin planta de cámara/.test(src));
  assert.ok(/function plantaShotCanvas\(s3, px, dpr = 2\.5, h = px\)/.test(pg), 'plantaShotCanvas admite otro alto');
});
test('cada escena lleva su encabezado con el icono de su planta general', () => {
  assert.ok(/class="v2-plsc"/.test(src) && /class="v2-plgi" data-sc="\$\{ea\(s\.key\)\}"/.test(src));
  // un clic de verdad cae en el icono o en el texto del botón: se resuelve con closest en el panel (data-v2a solo lo atiende la barra de arriba)
  assert.ok(/const gp = e\.target\.closest\('\.v2-plgi'\); if \(gp\) \{ plantaGeneral\(gp\.dataset\.sc\); return; \}/.test(src));
  assert.ok(!/data-v2a="sbpg"/.test(src), 'data-v2a no funciona fuera de la barra de arriba');
});
test('en «Plantas» el doble clic abre el editor con la planta de cámara a pantalla completa; en «Cuadros», el encuadre', () => {
  assert.ok(/UI\.edPlan = !!\(sh && UI\.sbView === 'plantas' && shot3D\(sh\)\)/.test(src), 'solo en Plantas y con planos 3D');
  const ed = fs.readFileSync(__dirname + '/../src/shot-editor.js', 'utf8');
  assert.ok(/if \(UI\.edPlan\) \{ UI\.edPlan = false; requestAnimationFrame\(\(\) => planFull\(true\)\); \}/.test(ed), 'el editor la consume');
});
test('el botón «Planta general» (icono de capas) va justo después del título de la escena', () => {
  assert.ok(/v2I\('layers'\)\}<span>Planta general<\/span>/.test(src) && /V2_ICO\.layers = /.test(src));
  const h = src.indexOf('<h3><span class="no">'), b = src.indexOf('class="v2-plgi"');
  assert.ok(h > 0 && b > h, 'después del h3');
  assert.ok(!/\.v2-plgi\{[^}]*margin-left:auto/.test(css), 'pegado al título, no al borde');
});
test('la planta a pantalla completa lleva abajo la barra de animar y reproducir, y la devuelve al volver', () => {
  const ed = fs.readFileSync(__dirname + '/../src/shot-editor.js', 'utf8');
  assert.ok(/const tl = \$m\('\.sx-tl'\);/.test(ed) && /plBox\.append\(tl\)/.test(ed) && /tlHome\.p\.insertBefore\(tl, tlHome\.n\)/.test(ed));
  assert.ok(/\.sx-plan\.full \.sx-tl\{width:var\(--plsz\);flex:none\}/.test(css), 'del ancho de la planta');
  assert.ok(/calc\(100dvh - 164px\)/.test(css), 'la planta deja lugar a la barra');
});
test('doble toque en la cámara (planta completa): altura y tilt junto a ella, con los deslizadores del panel Cámara; Esc los cierra primero', () => {
  const ed = fs.readFileSync(__dirname + '/../src/shot-editor.js', 'utf8');
  assert.ok(/else if \(camTap\(e\)\) cpToggle\(\)/.test(ed), 'el doble toque en la cámara');
  assert.ok(/rangeRow\('Altura', 'h'/.test(ed.split('function cpToggle')[1]) && /rangeRow\('Tilt', 'pitch'/.test(ed.split('function cpToggle')[1]), 'altura y tilt');
  assert.ok(/cp\.addEventListener\('input', onPanelInput\)/.test(ed) && /const onPanelInput = e => \{/.test(ed), 'mismo oyente que el panel');
  assert.ok(/if \(E\.cpOpen\) \{ e\.preventDefault\(\); e\.stopImmediatePropagation\(\); cpToggle\(false\); \}/.test(ed), 'Esc');
});
test('no se usa la clase «pl» de la v1 (el plan de rodaje) para la imagen', () => {
  assert.ok(!/class="pl[ "]/.test(src) && /\.v2-plf img\.v2-plm\{/.test(css));
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
