# Lote Z · dos observaciones del 26-oct-2026

Base: lote Y (que trae los lotes T a X). Rama `lote-z`.

**Cómo aplicarlo.** El `filmspirit-servidor.zip` de este lote trae todo lo anterior más estos cambios. En la VPS, como
siempre: `cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Viene sin los maniquíes 3D (el actualizador conserva los instalados). No hay variables ni migraciones nuevas en este
lote; si el lote W todavía no se instaló, se aplican solas las migraciones 10 y 11 (con respaldo antes).

## 1. Las escenas de la hoja de llamado a todo color
- Cada escena del cronograma y del avance lleva el color entero de su tira, como en el plan de rodaje: blanco interior de
  día, amarillo exterior de día, azul interior de noche, verde exterior de noche y rosado amanecer o atardecer; si se
  resaltó con un color de la leyenda, ese color.
- Sobre un color oscuro de la leyenda, la letra sale clara. En la apariencia oscura, con el mismo velo que el stripboard.
- Los planos de debajo de cada escena quedan como estaban: en blanco, con la franja de color a la izquierda.
- Igual en el PDF. El Excel ya los pintaba así.

## 2. El ícono de notas, más amable
- En la barra de arriba, el globo de notas ahora va en «recorte», como los íconos de las etapas: un globo amarillo
  sobre una hoja roja girada, con las líneas en negro (los colores del logo). Es un poco más grande.
- Al pasar el mouse se levanta y gira un poco, como la nota que se arrastra (quieto si la computadora pide menos
  movimiento).
- El número de notas pendientes va un poco más afuera para no taparlo.
- No cambia con Grafito.

## Pruebas
- Todas las pruebas de la app pasan, salvo `test/pdf.test.js`, que ya fallaba antes (le falta el módulo canvas). Las
  del servidor pasan todas.
- En el navegador: la hoja de llamado en claro y oscuro, y su PDF (cronograma y avance a color); el ícono de notas en
  la computadora (claro, oscuro, al pasar el mouse) y en el teléfono, sin errores.
