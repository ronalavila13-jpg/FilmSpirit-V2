/* Lote AF · el proyecto de ejemplo en la portada (debajo de la hoja, en la barra de arriba y al cierre) y el texto de su
   tarjeta.  node test/lote-af.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(R, f), 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

const html = leer('server/web/index.html');
test('en la portada, el ejemplo va en su franja debajo de la hoja, no entre el texto y la hoja', () => {
  const lead = html.indexOf('hero-lead'), sheet = html.indexOf('id="sheet"'), band = html.indexOf('class="band"'), ex = html.indexOf('data-sample', band);
  assert(lead > 0 && sheet > lead && band > sheet, 'el orden de la portada');
  assert(ex > band && ex < html.indexOf('</section>', band), 'el botón, dentro de la franja del ejemplo');
  assert(!html.slice(lead, sheet).includes('ejemplo=1'), 'nada del ejemplo entre el texto y la hoja');
  assert(html.indexOf('</section>', sheet) < band, 'la franja, después de la portada');
});
test('también en la barra de arriba y al cierre de la página', () => {
  const top = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  assert(/href="\/app\/\?ejemplo=1"[^>]*>\{\{t\.nav_example\}\}/.test(top), 'enlace en la barra de arriba');
  const last = html.slice(html.indexOf('class="wrap last"'));
  assert(/class="btn ghost-w big" href="\/app\/\?ejemplo=1"/.test(last), 'segunda opción al cierre');
});
test('los botones del ejemplo son de la clase .btn de la portada, sin forma de píldora (lote AG)', () => {
  assert(/<a class="btn yellow big" href="\/app\/\?ejemplo=1" data-sample><span>\{\{t\.ex_cta\}\}<\/span>/.test(html), 'el botón de la franja');
  assert(!/border-radius:\s*(9\d{2}|\d{4,})px|border-radius:\s*50%/.test(leer('server/web/portada.css').split('\n').filter(l => /^\.btn/.test(l)).join('\n')), 'sin forma de píldora');
});
test('la tarjeta del ejemplo dice «Explora todas las funciones del programa» (con su inglés)', () => {
  assert(/const SAMPLE_INVITE = 'Explora todas las funciones del programa';/.test(leer('src/proyectos.js')));
  assert.strictEqual(JSON.parse(leer('i18n/en-manual.json'))['Explora todas las funciones del programa'], "Explore all the app's features");
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
