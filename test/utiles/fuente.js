/* (lote AC) para las pruebas: sacar un pedazo de un archivo de la app y correrlo en un contexto propio (vm), sin cargar
   la app entera. pieza(archivo, comienzo, fin): desde «comienzo» hasta la primera marca «fin» que le siga, incluida
   (por omisión, el cierre de una función o de una constante de varias líneas al comienzo de una línea). En el contexto,
   las «const» pasan a «var» para que se vean desde afuera */
const fs = require('fs'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..', '..');
const leer = f => fs.readFileSync(path.join(R, f.includes('/') ? f : 'src/' + f), 'utf8');
function pieza(archivo, comienzo, fin) {
  const s = leer(archivo), a = s.indexOf(comienzo); assert(a >= 0, `${archivo}: no está «${comienzo}»`);
  const marca = fin || (comienzo.startsWith('function') ? '\n}\n' : comienzo.startsWith('const') && /=>\s*\{?\s*$|\{\s*$/.test(s.slice(a, s.indexOf('\n', a))) ? '\n};\n' : ';\n');
  const b = s.indexOf(marca, a); assert(b > a, `${archivo}: no termina «${comienzo}»`);
  return s.slice(a, b + marca.length).replace(/^const /gm, 'var ');
}
module.exports = { R, leer, pieza };
