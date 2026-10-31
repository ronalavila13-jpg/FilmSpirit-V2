# Lote S · stripboard, hoja de llamado con horas libres y menús (25-oct-2026)

Base: lote R. Solo la app (más el formato de hora del panel de administración en server/web/admin.js).

- **Nombres**: «Plan de rodaje» pasa a ser **Stripboard** en toda la app (pestaña, títulos, PDF, Excel, ayudas y avisos; también en
  inglés). La vista «Por actor» pasa a ser **DOOD**. La etapa «Desarrollo» pasa a ser **Preparación** (en inglés «Prep»).
  La portada web no cambia.
- **Stripboard**: la columna «Hora» es ahora **«Tiempo»**: solo el tiempo estimado de cada escena o evento, editable
  (`it.dur` en minutos; acepta 45, 1 h 15, 1:30; vacío = el estimado por octavos). La barra de la jornada ya no lleva el
  llamado; muestra escenas y el tiempo total. El cierre dice «Cierre de jornada 1 de N» (N = jornadas) y ya no lleva hora de
  fin. Lo mismo en el PDF y el Excel.
- **Hoja de llamado**: la hora de cada escena y evento se escribe en el cronograma (`dd.at = { clave de la fila: 'HH:MM' }`;
  vacía, sigue a la anterior con los tiempos del stripboard). «Fin de jornada» también se escribe (`dd.end`). Una sola hora
  por fila, sin «~»; se quitó «Termina ~HH:MM» bajo el llamado. «Nota para el equipo» con el título al centro (en el PDF y el
  Excel, centrada entera).
- **Miniaturas del storyboard**: junto a cada escena del stripboard (primer plano; se apaga en «Columnas en pantalla») y en
  cada plano del cronograma de la hoja (casilla «Miniaturas», `P.call.noThumbs`).
- **Submenú de etapas**: sus pestañas ya no se ven opacadas cuando la etapa no es la actual.
- **24 horas**: comentarios, historial del presupuesto, bloqueos del guion y panel de administración usan `hourCycle: 'h23'`.
- **Espacios de celdas**: más aire en el stripboard y el cronograma; columnas más parejas en la hoja de llamado, el DOOD y el
  presupuesto (cifras alineadas a la derecha).
- **3D, hombro**: al levantar el brazo por encima del pecho, la clavícula sube con él (hasta ~22°) y el brazo gira lo que
  falta; antes la piel entre el cuello y el hombro se hundía.

Archivos: src/tab-plan.js, src/tab-call.js, src/pdf.js, src/plan-dood.js, src/pestanas.js, src/s3d-figuras.js, src/shell.html,
src/notas.js, src/tab-budget.js, src/guion-cierre.js, i18n/en.json, i18n/en-manual.json, server/web/admin.js y los textos
renombrados en otros src/*.js.
