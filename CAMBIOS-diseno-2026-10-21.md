# FilmSpirit · diseño: íconos, presencia en vivo y accesibilidad (21 de octubre de 2026, segunda entrega)

Este ZIP trae solo los archivos nuevos o modificados, con las mismas rutas del proyecto.
Descomprímelo **encima** de tu carpeta `octavos/`, después de la entrega anterior del mismo día (las mejoras del
testeo). La revisión completa, con todo lo pendiente por archivo y línea, está en `REVISION-diseno-2026-10-21.md`.

## Cómo aplicarlo

1. **Web (página interactiva):** `sh build.sh` como siempre.
2. **Web con cuentas (VPS):** `node server/make.js`, sube `server/` y en la VPS `sudo bash deploy/actualizar.sh`.
   La presencia trae un dato nuevo («en otra ventana»): sube el servidor y la app juntos.
3. **Escritorio:** `cd desktop && node make.js`.
4. **Pruebas del servidor:** `cd server && npm test` (55 pruebas, 5 de presencia).

## Qué cambia

- **Íconos ilustrados:** Guion rayado, Plan de rodaje, Presupuesto y Scouting están redibujados en el mismo estilo.
  Las etapas sin elegir tienen más contraste.
- **Íconos de línea:**
  - `ICO` suma close, ok, prev, next, search, camera, trash, eye, image y team.
  - Los «⋯», «✕» y 🔒 de texto pasaron a íconos.
  - La barra de arriba usa un solo tamaño y un solo trazo.
  - Todo botón de solo ícono mide al menos 24 px, y con el dedo su área de toque crece por fuera.
- **Presencia en vivo:**
  - un color legible por persona y dos iniciales;
  - «en otra ventana» y «en Inicio»;
  - anuncios para lectores de pantalla;
  - una lista con teclado que se actualiza mientras está abierta;
  - sin caras fantasma si se corta la conexión;
  - sin parpadeo al recargar.
- **Accesibilidad:**
  - el foco se ve en casillas y campos;
  - el logo y la carátula son botones;
  - la ventana Carátula tiene sus etiquetas;
  - con el teclado ahora se puede: marcar los días sin rodaje, subir fotos, abrir las notas, mover la cámara del
    editor de planos y recorrer la línea de tiempo.
- **Exportar:** los botones no pierden su ícono mientras se genera el PDF.

## Archivos

`src/`:
- **Íconos y barras:** `iconos.js`, `barra.js`, `shell.html`
- **Presencia y equipo:** `share.js`, `share-api.js`, `inicio.js`, `ui.js`
- **Íconos en cada pestaña:**
  - `tab-plan.js`, `tab-build.js`, `tab-casting.js`, `tab-scout.js`, `tab-board.js`, `tab-sup.js`, `tab-project.js`
  - `tab-breakdown.js`, `tab-budget.js`, `tab-cal.js`, `tab-call.js`, `tab-script.js`, `tab-animatic.js`
  - `guion-editor.js`, `guion-revision.js`, `guion-cierre.js`
  - `leyenda.js`, `laminas.js`, `charphoto.js`, `ficha.js`, `floorplan.js`, `s3d-accesorios.js`, `s2d-editor.js`
- **Teclado y botones:** `shot-editor.js`, `notas.js`, `pdf.js`

`server/`: `lib/live.js`, `lib/api.js`, `test/presencia.test.js`

Raíz: `REVISION-diseno-2026-10-21.md`, `CAMBIOS-diseno-2026-10-21.md`
