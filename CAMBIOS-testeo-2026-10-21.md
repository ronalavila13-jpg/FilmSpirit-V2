# FilmSpirit · mejoras del testeo del 21 de octubre de 2026

Este ZIP trae solo los archivos nuevos o modificados, con las mismas rutas del proyecto.
Descomprímelo **encima** de tu carpeta `octavos/` (reemplaza los archivos).

## Cómo aplicarlo

1. **Web (página interactiva):** `sh build.sh` como siempre.
2. **Web con cuentas (VPS):** `node server/make.js`, sube `server/` y en la VPS `sudo bash deploy/actualizar.sh`.
   Hay una ruta nueva (`POST /api/p/<id>/here`) y el canal en vivo manda un aviso nuevo (`who`): actualiza el servidor
   y la app juntos.
3. **Escritorio:** `cd desktop && node make.js` como siempre.
4. **Pruebas del servidor:** `cd server && npm test` (54 pruebas: 50 de antes y 4 nuevas de presencia).

## Qué cambia

### Fallas
- **Plan de rodaje en PDF · la fecha.** Ya no va en una columna aparte a la izquierda. Cada jornada abre con su barra,
  como en la app: «JORNADA 1 · Lun, 26 oct. · Llamado 07:00 · 5 escenas» (y «COMPLETADA» cuando corresponde).
  La primera columna queda para la locación de rodaje.
- **Hoja de llamado · el plano.** El código del plano va en su cuadrito, centrado. Si está encendida la hora por plano,
  la hora va justo debajo. La descripción va en una sola línea: tamaño en negrita y lo demás en gris. La fila ya no
  se engruesa. En el PDF, igual.

### Prioritarias
- **Hora por plano, opcional.** En la hoja de llamado hay una casilla «Hora por plano» en el Cronograma, apagada de
  entrada: en rodaje se trabaja con inicio y fin de escena. Encendida, reparte la hora de la escena entre sus planos,
  en la pantalla, en el PDF y en el Excel. Se guarda con el proyecto (`P.call.shotTimes`).
- **Guion rayado y guion etiquetado, por separado.** «Guion rayado (PDF)…» abre una ventana para elegir qué lleva:
  - **Rayado de planos**, **Etiquetas del desglose** o las dos.
  - De entrada sale como lo estás viendo: con las capas que tienes encendidas en la barra y las categorías a la vista.
  - Cada PDF lleva su nombre en la carátula y en el archivo: «GUION RAYADO», «GUION ETIQUETADO» o
    «GUION RAYADO Y ETIQUETADO».
- **Exportar solo un departamento.**
  - En la misma ventana, «Etiquetas de: un área» saca el guion marcado solo con lo de sonido, vestuario, atrezzo…
    La carátula dice el área.
  - En Desglose › Exportar hay un ítem nuevo, **«Desglose de un área (PDF)…»**. Tiene dos formatos:
    - **Lista por escenas:** cada escena con los elementos del área, sus octavos y su jornada; al final, cada
      elemento con sus escenas.
    - **Guion etiquetado:** el guion solo con las etiquetas de esa área.
- **Nombres en inglés.** La pestaña Guion rayado (donde se etiqueta) se llama **Script Breakdown** y Desglose se llama
  **Breakdown Sheets**. Los PDF conservan sus nombres de la industria: *Lined Script* (rayado) y *Tagged Script*
  (etiquetado). Están actualizadas las frases de ayuda que nombran la pestaña y traducidos los textos nuevos.
- **Ver en vivo quién más está.** En un proyecto con equipo (web con cuentas):
  - Arriba, junto al botón del equipo, salen las caras de quienes tienen el proyecto abierto ahora.
  - Al tocarlas aparece la lista, cada uno con la pestaña en que está; toca a alguien para ir a su pestaña.
  - En cada pestaña (y en el ícono de su etapa) salen las caras de quienes están ahí.
- **Recargar sin perder el lugar.** Antes, al recargar (F5, Ctrl + Mayús + R) o al llegar una versión nueva, la app
  volvía a Inicio. Ahora vuelve al proyecto, a la misma pestaña y escena, y a la misma altura de la vista. Esto
  funciona en la web local, en la web con cuentas y en el escritorio. Si recargas estando en Inicio, te quedas en
  Inicio. El aviso de versión nueva lo dice: «vuelves a esta misma pestaña».

## Archivos

| Archivo | Para qué |
|---|---|
| `src/pdf.js` | Barra de jornada del plan; hora por plano; capas y áreas del guion rayado; ventana de exportar; PDF «Desglose de un área» |
| `src/tab-call.js` | Cuadrito del plano y su hora; casilla «Hora por plano» (pantalla, PDF y Excel) |
| `src/tab-script.js` | «Guion rayado (PDF)…» con su ventana; ayuda «Exportar» |
| `src/tab-breakdown.js` | «Desglose de un área (PDF)…» y su ventana |
| `src/pdf-rango.js` | El título de «Elegir…» con los ítems que terminan en «…» |
| `src/share.js` · `src/share-api.js` · `src/ui.js` | Presencia en vivo (caras arriba y en las pestañas, ir a la pestaña de alguien) |
| `src/inicio.js` · `src/ui.js` | Recargar sin perder el lugar |
| `src/shell.html` | Estilos: cuadrito del plano, casilla, ventana de capas, caras de presencia |
| `server/lib/live.js` · `server/lib/api.js` | Presencia: lista `who` y ruta `POST /api/p/<id>/here` |
| `server/test/presencia.test.js` | 4 pruebas nuevas |
| `i18n/glosario-en.md` · `i18n/en-manual.json` · `i18n/hacer.js` | Script Breakdown / Breakdown Sheets, textos nuevos y nombres de archivo en inglés |
