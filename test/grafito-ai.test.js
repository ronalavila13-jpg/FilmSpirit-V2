/* Lote AI · Grafito no cambia la barra de las etapas ni su menú: cada etapa en su color y la elegida con la placa entera
   de su color, como en Vivos.  node test/grafito-ai.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'src/shell.html'), 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('Grafito ya no pinta de gris los colores de las etapas', () => {
  assert.ok(!/:root\[data-secn\](\[data-tone="dark"\])? #tabs \.stg\[data-g\]\{/.test(css), 'sin --sg-* grises para #tabs .stg');
  assert.ok(!/:root\[data-secn\][^{]*\.stg-m \.tab\[data-tab\][^{]*\{--ti-sol/.test(css), 'el menú de cada etapa conserva sus colores');
});
test('la etapa elegida lleva la placa de su color también en Grafito (como en Vivos)', () => {
  assert.ok(/:root:is\(:not\(\[data-sec="pastel"\]\),\[data-secn\]\) #tabs \.stg\.on \.stg-h\{background:var\(--sg-sol\)/.test(css));
  assert.ok(/:root\[data-sec="pastel"\]:not\(\[data-secn\]\) #tabs \.stg\.on \.stg-h\{background:var\(--sg-pt\)/.test(css), 'Suaves sigue con su velo');
  assert.ok(/\n  :root #tabs \.stg\.on \.stg-h svg\.lf \.mi\{fill:var\(--sg-sol-ink\)\}/.test(css), 'el ícono a una tinta en las dos');
});
test('el resto de Grafito sigue en grises (la franja de pestañas)', () => {
  assert.ok(/:root\[data-secn\]\[data-tab\]\{--sx-sol:#2A2A2A/.test(css));
});
if (fail) { console.log(fail + ' fallan'); process.exit(1); } else console.log('todas bien');
