# PDF exportados con el diseño de la versión 2 (30 de octubre de 2026)

Los PDF seguían el diseño de la v1 (cuadros con líneas negras, la barra del color de la pestaña). Ahora salen como la
app: blancos, con líneas finas, el amarillo de la marca como protagonista y el negro para los totales.

## Qué cambia

- **Cabecera:** la etapa con su punto de color (Guion, Preparación, Imagen, Producción, Rodaje), el documento en grande
  (Familjen Grotesk) y su subtítulo en gris; a la derecha el proyecto, la empresa y «Página 1 de N»; abajo una línea fina
  con una marca amarilla. Ocupa el mismo alto que el cuadro de antes (`HDR`).
- **Tablas (`TBL`):** sin rejilla, solo la línea fina de abajo de cada fila (`#EDEDEA`); los títulos de las columnas en
  mayúsculas chicas, en gris y sobre una línea (`headStyles._v2`); las filas de grupo en el gris de fondo de la app.
- **Títulos de sección (`pdfSec`):** el título y una línea fina, sin cuadro.
- **Tarjetas de resumen (`pdfCards`):** blancas, con línea fina y esquinas de 3 pt; la primera, en negro con su nota en
  amarillo. En el **Plan de rodaje** (Jornadas, Páginas, Tiempo aprox., Reparto) y en el **Presupuesto** (Total del
  proyecto, Subtotal, Imprevistos, impuesto y Por jornada de rodaje).
- **Plan de rodaje (Limpio):** cada jornada es un título («Jornada 1 · fecha · escenas · tiempo») y cierra con la barra
  negra «Fin de la jornada N» con lo que sigue en amarillo, como en la pantalla.
- **Hoja de llamado (Limpio):** el marco de la cabecera con esquinas de 3 pt y el llamado general en su cuadro amarillo;
  líneas finas entre las celdas del clima.
- **DOOD (Limpio):** inicio y fin en amarillo, «trabaja» en negro, espera en gris.
- **Storyboard, planta de cámara y planta general, calendario (línea de tiempo y meses), Gastos, scouting, Historia
  (argumento, escaleta, tarjetas, biografías, premisa, estructura), guion técnico, animatic, casting:** las
  tarjetas y los cuadros con línea fina y esquinas de 3 pt; el mes del calendario en una franja amarilla.
- **Estilo «Cuadrícula» (Excel)** del Plan de rodaje, la Hoja de llamado y el DOOD: sin cambios (`TBLX`, `box: true`).
- **Textos nuevos en inglés:** «Project total», «Per shooting day», «End of day N»… (`i18n/en-manual.json`).

## Lo que no cambia

La hoja de desglose (y el reporte de elementos y el reporte por área), las láminas del desglose, la hoja de script (la hoja
y los reportes de cámara y de sonido y el parte), el guion y el guion AV mantienen su formato. Para ello conservan el de
siempre: `TBLX` (la rejilla negra) y la cabecera en cuadro (`docHeader(…, { box: true })`, `pdfSec(…, { st: { box: true } })`).
Se comprobó que los PDF de ejemplo de esos documentos salen byte por byte iguales a los de antes.

## Archivos

`src/pdf.js` (paleta `V2K`, `TBL`/`TBLX`, `docHeaderFlat`, `pdfSec`, `pdfCards`, `pdfCardBox`, plan, presupuesto,
storyboard, calendario), `src/pdf-llamado.js`, `src/plan-dood.js`, `src/cal-meses.js`, `src/planta-general.js`,
`src/tab-gastos.js`, `src/tab-scout.js`, `src/tab-build.js`, `src/laminas.js` y `src/sup-partes.js` (los que conservan su
formato), `i18n/en-manual.json`. Pruebas: `test/pdf-ah.test.js`, `test/estilo-ai.test.js`, `test/pdf-diseno.test.js`.
