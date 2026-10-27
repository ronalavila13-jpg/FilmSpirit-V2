# Lote Y · el ancho de las columnas del stripboard

Base: lote X. Rama `lote-y-cols`. Pedido: «permitir contraer horizontalmente cada celda» (en una pantalla ancha,
«Locación», «Locación de rodaje» y las notas se estiraban demasiado).

## Cómo se usa
- En Producción › Plan de rodaje › Stripboard, en la computadora: cada título de columna tiene un asa en su borde
  derecho. Al pasar el mouse por los títulos aparecen unas rayas finas entre columnas; sobre el asa la raya se pone del
  color de acento y el cursor cambia a ↔. **Arrastrarla** hace la columna más angosta o más ancha (una línea a lo alto
  del plan marca el borde mientras se arrastra; Esc cancela). **Doble clic** en el asa la devuelve a su ancho
  automático. Tocar el título sigue ordenando como antes: el asa no ordena.
- El ancho **se guarda en el proyecto**: todo el equipo ve los mismos anchos (también quien solo puede ver el plan;
  solo quien puede editarlo puede cambiarlos). Cada arrastre es un paso de Deshacer (Ctrl+Z).
- **Restaurar el ancho de las columnas**: en Ajustes (⋯) › Columnas en pantalla, aparece cuando alguna columna tiene
  su ancho propio. Las devuelve todas a su ancho automático (se puede deshacer).
- Las columnas sin ancho propio siguen con su ancho automático y se reparten el espacio que queda. Si la tabla queda
  más ancha que la pantalla, se desplaza a lo ancho, como antes.
- Una columna angosta no se mete en la de al lado: su texto se corta con «…» y se lee entero al pasar el mouse. La
  Locación y la Locación de rodaje quedan en dos líneas como mucho (la sinopsis en una); con la Locación muy angosta
  (menos de 200 px) la miniatura del storyboard deja su lugar al texto, y con la de rodaje angosta (menos de 120 px),
  el pin. El reparto queda en dos líneas como mucho. Las notas vacías no hacen crecer la fila. Las barras de las
  jornadas, los cierres y los eventos se ven igual.
- Mínimos: 80 px la Locación y la de rodaje, 60 px las notas, 44 px el tiempo, 40 px el reparto, 36 px I/E y 32 px las
  demás. Máximo: 800 px.
- Solo en la computadora con mouse: en el teléfono (hasta 760 px) el stripboard se ve exactamente como antes, y en las
  pantallas táctiles no hay asas (sí se ven los anchos guardados).
- **El PDF y el Excel no cambian.**

## Archivos
- `src/tab-plan.js`: los anchos (`P.schedule.colW`, en px por columna: `{ set: 260, loc: 170 }`), la grilla con esos
  anchos (`plGrid`, `planColsCSS`), las asas de los títulos (`plHeadHTML`), arrastrar y guardar (`startColResize`,
  `planColSet`), «Restaurar el ancho de las columnas» (Ajustes y la acción `pl-colw0`), los textos completos al pasar el
  mouse en las celdas que se cortan, la ayuda de la pestaña y la fila que se arrastra con los mismos cortes.
- `src/shell.html`: el asa y su raya, la línea del arrastre y los cortes con «…» de las columnas angostas (solo en la
  computadora).
- `i18n/en-manual.json`: los textos nuevos en inglés (bloque «lote Y · columnas»).
- `test/columnas-y.test.js`: prueba nueva.

## Pruebas
- Nueva: `test/columnas-y.test.js` — sin anchos guardados la grilla es idéntica a la de antes (las 64 combinaciones de
  columnas y notas), un ancho guardado reemplaza el automático y cuenta para el desplazamiento a lo ancho, los límites,
  las asas (una por columna, fuera de los botones que ordenan, ninguna sin permiso para editar) y guardar o quitar un
  ancho como un paso del historial.
- Todas las pruebas de la app pasan, salvo `test/pdf.test.js`, que ya fallaba antes (le falta el módulo canvas).
  `node i18n/hacer.js` termina sin avisos.
- En el navegador (1366 y 1920 px): arrastrar cambia el ancho y los títulos siguen alineados con las filas; doble
  clic, Esc, Deshacer y Rehacer, «Restaurar…», un clic sin mover no guarda nada, ordenar por título sigue igual; todas
  las columnas al mínimo (con eventos, notas, locación escrita y el reparto por nombre) sin nada que se salga de su
  celda; la figuración prendida; solo lectura (ve los anchos, sin asas); un proyecto guardado conserva los anchos al
  recargar; en inglés. Teléfono de 390 px: idéntico píxel a píxel con y sin anchos guardados; tableta táctil: sin asas.
