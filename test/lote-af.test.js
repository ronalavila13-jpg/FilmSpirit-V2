/* Lote AF · el proyecto de ejemplo en la portada (debajo de la hoja, en la barra de arriba y al cierre) y el texto de su
   tarjeta.  node test/lote-af.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(R, f), 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

const html = leer('server/web/index.html');
test('en la portada, el botón del ejemplo va debajo de la hoja y su ayuda, no entre el texto y la hoja', () => {
  const lead = html.indexOf('hero-lead'), sheet = html.indexOf('id="sheet"'), hint = html.indexOf('hero-hint'), ex = html.indexOf('class="hero-ex"');
  assert(lead > 0 && sheet > lead && hint > sheet, 'el orden de la portada');
  assert(ex > hint, 'la franja del ejemplo, después de la ayuda de la hoja');
  assert(!html.slice(lead, sheet).includes('ejemplo=1'), 'nada del ejemplo entre el texto y la hoja');
  assert(ex < html.indexOf('</section>', hint), 'dentro de la portada');
});
test('también en la barra de arriba y al cierre de la página', () => {
  const top = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  assert(/href="\/app\/\?ejemplo=1"[^>]*>\{\{t\.nav_example\}\}/.test(top), 'enlace en la barra de arriba');
  const last = html.slice(html.indexOf('class="wrap last"'));
  assert(/class="btn line big" href="\/app\/\?ejemplo=1"/.test(last), 'segunda opción al cierre');
});
test('los textos nuevos de la portada, en los cinco idiomas', () => {
  for (const lg of ['es', 'en', 'pt', 'fr', 'it']) {
    const t = JSON.parse(leer(`server/i18n/${lg}.json`));
    assert(t.nav_example && t.ex_q && t.ex_cta && t.ex_note, lg);
  }
});
test('el botón del ejemplo en la portada, con esquinas apenas redondeadas como en el programa (lote AG)', () => {
  assert(/<a class="btn cream big" href="\/app\/\?ejemplo=1" data-sample>\{\{t\.ex_cta\}\}<\/a>/.test(html), 'sin forma de píldora');
});
test('la tarjeta del ejemplo dice «Explora todas las funciones del programa» (con su inglés)', () => {
  assert(/const SAMPLE_INVITE = 'Explora todas las funciones del programa';/.test(leer('src/proyectos.js')));
  assert.strictEqual(JSON.parse(leer('i18n/en-manual.json'))['Explora todas las funciones del programa'], "Explore all the app's features");
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
