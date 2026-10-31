/* Inicio v2 (src/v2-inicio.js): la página ordenada. Inicio no se desplaza, así que la barra lateral y los números de arriba abren
   su sección en grande, con su propio encabezado y todo lo suyo; el calendario se mueve de semana en semana y los días, la agenda
   y las notas responden; las secciones vacías dicen qué son y cómo empezar.  node test/v2-inicio-secciones.test.js */
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../src/v2-inicio.js', 'utf8'), css = fs.readFileSync(__dirname + '/../src/v2-pant.css', 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('la barra lateral y los números de arriba abren su sección (no solo desplazan)', () => {
  assert.ok(/\['home', 'proj', 'scripts', 'collab', 'agenda', 'notes'\]\.includes\(k\)\) \{ V2H\.sec = k === 'home' \? '' : k;/.test(src));
  assert.ok(/const stat = \(k, n, label\) => `<button type="button" data-v2go="\$\{k\}"/.test(src), 'los números son botones');
  assert.ok(/k === \(V2H\.sec \|\| 'home'\) \? ' on' : ''/.test(src), 'la barra marca la sección activa');
});
test('cada sección en grande tiene su encabezado y su propia estructura (no la grilla de Inicio con partes escondidas)', () => {
  assert.ok(/if \(sec\) \{/.test(src) && /return `<section class="v2-hleft v2-hfoc">\$\{body\}<\/section>`/.test(src));
  for (const t of ['Mis proyectos', 'Mis guiones', 'Colaboro en', 'Agenda', 'Notas y avisos']) assert.ok(src.includes(`v2HHead('${t}'`), t);
  assert.ok(/#home\.v2-home \.v2-hleft\.v2-hfoc\{display:block/.test(css));
  assert.ok(!/\.v2-hgrid\[data-sec=/.test(css), 'sin las reglas que escondían partes');
  assert.ok(/V2H\.sec === 'agenda' \? '' : v2HomeCal\(H\)/.test(src) && /V2H\.sec === 'notes' \? '' : v2HomeNotes\(H\)/.test(src), 'la derecha no repite la sección en grande');
});
test('las secciones vacías dicen qué son y cómo empezar; Inicio avisa cuántos quedan por ver', () => {
  assert.ok(/Todavía no tienes proyectos de producción/.test(src) && /Todavía no tienes guiones/.test(src) && /Nadie te invitó todavía/.test(src));
  assert.ok(/const more = \(n, k\) =>/.test(src) && /Ver \$\{n === 1 \? 'el otro' : 'los ' \+ n \+ ' restantes'\}/.test(src));
  assert.ok(/class="v2-hcw"/.test(src) && !/class="v2-hco"><div class="v2-hsec"/.test(src), 'el bloque de colaboraciones no usa la clase de las tarjetas (.v2-hco)');
});
test('el calendario: semana anterior y siguiente, «Hoy», un día elegido, y la agenda y las notas se abren', () => {
  assert.ok(/k === 'calprev' \|\| k === 'calnext'/.test(src) && /k === 'caltoday'/.test(src));
  assert.ok(/data-v2day="\$\{v2Iso\(d\)\}"/.test(src) && /const dy = e\.target\.closest\('\[data-v2day\]'\)/.test(src));
  assert.ok(/<li data-open=/.test(src) && /class="v2-hn" data-open=/.test(src));
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
