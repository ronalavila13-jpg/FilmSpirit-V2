# Lote AH · plan de rodaje (27 de octubre de 2026)

Lo que pediste para el **Plan de rodaje**: el documento exportado se llama «Plan de rodaje» y no «Stripboard», lleva
(si quieres) los planos del storyboard con su miniatura como la hoja de llamado, la columna dice «Tiempo aprox.» y el
PDF sale en cuadro, con líneas negras completas, tipo Excel.

## Qué cambió y cómo se usa

**1. Se exporta como «Plan de rodaje».** En el menú Exportar ahora dice **Plan de rodaje (PDF)** (antes «Stripboard
(PDF)»), **DOOD (PDF)** y **Plan de rodaje (Excel)**. El PDF dice «Plan de rodaje» arriba y en cada página, y el Excel lo
dice en su título y en el nombre de la hoja. En inglés: *Shooting Schedule (PDF)*, *Shooting Schedule (Excel)* y
*Shooting Schedule* en el documento: ya no dice «Stripboard» en nada de lo exportado. En la pantalla, las dos vistas del
plan siguen siendo **Stripboard · DOOD** (como en el lote U): solo cambió el nombre de lo que se exporta.

**2. Miniaturas del storyboard en el plan exportado.** Arriba del menú **Exportar** del plan hay una casilla nueva:
**«Miniaturas del storyboard»**. Marcada (así viene), el PDF y el Excel del plan llevan, debajo de cada escena, sus
planos con su viñeta, como la hoja de llamado:
- el número del plano (con una franja del color de la tira de su escena a la izquierda);
- la viñeta y, a su lado, el tamaño, el soporte, el ángulo y el movimiento, y debajo la acción (bajo I/E, Locación y D/N);
- los personajes del plano (bajo Reparto);
- el lente y el sonido (bajo Notas técnicas) y las notas del plano (bajo Observaciones).

Las filas de los planos van en blanco, dentro de la misma tabla y con las mismas columnas: las tiras no cambian de
ancho. Cada escena con sus planos se mantiene junta: si no cabe al pie de la página, pasa entera a la siguiente.
Desmarcada, el plan sale como siempre (solo las tiras). La elección se guarda en el proyecto y vale para todo el equipo
(como la casilla «Miniaturas» de la hoja de llamado); la cambia quien puede editar el plan, y se deshace con Deshacer.
Si el proyecto no tiene planos en el storyboard, la casilla no aparece.

Antes de armar el PDF o el Excel, el programa prepara las viñetas que falten (con su barra de avance y «Cancelar»,
como el storyboard y la hoja de llamado): **ese era el error de las miniaturas que no salían**. Con «Elegir…» (algunas
jornadas) solo prepara las de esas jornadas.

En el **Excel**, la viñeta de cada plano va dentro de la hoja, en la columna I/E (que se ensancha cuando hay planos), y
la fecha de la jornada sigue combinada sobre todas sus filas.

La miniatura que se ve en la pantalla del stripboard (Ajustes › Columnas en pantalla › «Miniatura del storyboard») sigue
aparte: es la de cada persona y no cambia el documento. Su nota ahora lo dice.

**3. «Tiempo aprox.»** La columna del tiempo se llama **Tiempo aprox.** en la pantalla, en el PDF, en el Excel y en la
ayuda (en inglés, *Approx. time*). En la pantalla la columna es un poco más ancha (92 px en lugar de 68) para que el
título entre entero; en el PDF y el Excel también.

**4. El PDF en cuadro, tipo Excel.** En el PDF del plan todas las celdas llevan líneas negras completas, bien visibles,
también entre columnas y en los títulos de las columnas (antes solo una línea gris abajo de cada fila). Las tiras de la
industria (blanca, amarilla, azul, verde y rosa), las barras de jornada y de cierre y los colores resaltados quedan como
estaban; entre una jornada y la siguiente queda un poco de aire, así cada jornada es su propio cuadro. La **leyenda** de
arriba y el **reparto** de abajo van cada uno dentro de un cuadro.
El **DOOD (PDF)** también: la rejilla en negro (antes gris fina, y blanca en los títulos) y los códigos (I inicio, T
trabaja…) en su cuadro.
El encabezado y el pie de página de todos los PDF (que toda la información quede en el cuadro de arriba, sin barra ni
pie) los cambia en paralelo el frente «pdf»; este frente no los tocó.

## Decisiones al interpretar el pedido

- **Dónde va la casilla.** La de la hoja de llamado está sobre su cronograma. En el plan, lo más simple y que no ocupa
  lugar en la pantalla es el momento de exportar: arriba del menú Exportar, una sola casilla, como las opciones del
  storyboard. No la uní a la miniatura de la pantalla porque son dos cosas distintas: la pantalla muestra una viñeta por
  escena y es de cada persona; el documento lleva todos los planos y es del proyecto.
- **Viene marcada**: lo que pediste es que el plan salga con las miniaturas. Quien quiera el plan corto, la desmarca.
- **Los planos bajo la escena, no bajo sus partes.** Si una escena está dividida (5 y 5A), sus planos salen una vez,
  bajo la 5, igual que en la hoja de llamado. También salen bajo las escenas de «Sin programar».
- **Ningún dato de tiempo en los planos**: la duración del plano en el storyboard es de pantalla, no de rodaje, así que
  la columna «Tiempo aprox.» queda vacía en sus filas.
- **«Tiempo aprox.»** lleva punto (abreviatura) y en inglés *Approx. time*.
- **El Excel con imágenes**: el generador de Excel no ponía imágenes; le agregué esa posibilidad (solo la usa el plan).
- **Pendiente para la unión con el frente «pdf»**: la vista previa del encabezado en Proyecto (marca del PDF) todavía
  dice «Stripboard» porque imita la cabecera del PDF, que cambia el frente «pdf»; conviene que diga «Plan de rodaje»
  cuando se unan.

## Notas técnicas

- **Datos nuevos (compatibles):** `P.schedule.noThumbs` (true: el plan exportado sin los planos; sin el dato, con ellos).
  Se limpia al abrir el proyecto o al llegar el plan de otra persona: `planDocNorm(S)` en `normalizeProject`
  (proyectos.js), junto a `plColWClean`. Viaja con el plan al compartir (está dentro de `schedule`).
- **Funciones nuevas (tab-plan.js):** `planDocThumbs()`, `planDocShotsOf(fila)`, `planDocShots(sel)` (las viñetas que
  prepara `pdfWarm`), `planDocNorm(S)`, `EXPORTS_NOTE.plan` (la casilla) y su oyente de `change`. En planSheets, las filas
  de los planos (`shotLines`, `putRows`) usan `shotCallInfo` de la hoja de llamado.
- **src/pdf.js:** `pdfPlan` reescrita (nombre, rejilla negra, leyenda y reparto en cuadro, planos con viñeta, bloques por
  escena con planos, ancho de «Tiempo aprox.» medido con la letra de quien exporta); y **una rama en `pdfWarm`**
  (`kind === 'plan'`). Nada más de pdf.js.
- **src/xlsx.js:** imágenes en una hoja (`sh.images: [{ r, c, x, y, w, h, data }]`, PNG o JPEG en data URL; un dibujo por
  hoja, anclado a la celda, con sus archivos en `xl/media`) y `row.min` (alto mínimo de una fila). Las hojas sin imágenes
  salen igual que antes.
- **src/plan-dood.js:** rejilla negra en `pdfDood` y los códigos en un cuadro (una tabla de una celda).
- **src/plan-columnas.js:** la columna del tiempo, 92 px.
- **src/shell.html:** el CSS de la casilla en el menú Exportar (`.xmenu .xopt`, junto a las reglas de `.xmenu`).
- **i18n/en-manual.json:** bloque «// lote AH · plan».
- **Pruebas:** `test/plan-ah.test.js` (nueva, 15): arma de verdad el PDF del plan (jsPDF y autoTable de node_modules) y
  el Excel de un proyecto chico: el nombre en el PDF, el menú y el Excel; «Tiempo aprox.»; la casilla, su permiso y su
  paso del historial; `planDocNorm`; los planos bajo la escena (no bajo la parte) y que toda fila cubra las 12 columnas;
  sin miniaturas, el plan de siempre; la rejilla negra en celdas, títulos, leyenda y reparto; A4 apaisado; el DOOD; el
  Excel con la fecha combinada y las viñetas; xlsx.js con y sin imágenes; el inglés. `test/columnas-y.test.js`: el ancho
  automático de la columna del tiempo pasa de 68 a 92 px (lo único que cambió en esa prueba).
  Todas: app 48 bien (falla solo `test/pdf.test.js`, que ya fallaba por el módulo canvas); servidor 20 archivos bien.
- **Capturas** en `…/scratchpad/plan/capturas/`: `00-antes-plan` (el PDF de hoy), `01-antes-stripboard`,
  `02-antes-dood`; `10-despues-plan-con-miniaturas`, `11-despues-plan-sin-miniaturas`, `12-despues-plan-a4` (A4
  apaisado), `13-despues-plan-ingles`, `14-despues-excel` (el Excel abierto en LibreOffice), `15-despues-stripboard`
  (columna renombrada; también teléfono y oscuro), `16`–`18` el menú Exportar con la casilla (escritorio, teléfono
  oscuro, inglés), `19-despues-dood`, `20`/`21` una prueba con evento, escena dividida, etapa y «Sin programar».
