# Lote AD · escenarios: sin constructor, un escenario importado sobre un entorno y «Plano» primero (27-oct-2026)

Rama `lote-ad-escenarios`. Solo la app (el servidor no cambia: lo nuevo viaja dentro del storyboard).

## Para Ronald: qué cambia y cómo se usa

### 1 · Se quitó el constructor de escenarios
- Ya no están: el botón **«Construir su escenario»** / **«Su escenario: …»** de cada lugar en **Scouting**; en el editor
  3D, **Escena › Escenario**, la opción **«Construir uno nuevo…»** y el **«Editar…»** de un escenario construido; y en la
  ventana de un escenario 3D importado, **«Replicar como escenario editable»**.
- Se quedan igual: los **escenarios 3D importados** (con **«Ajustar…»** y **«Versión liviana»**), los **planos de
  planta**, la **escala del escenario** con **«Tamaño original»** y los escenarios de siempre (habitación, calle,
  paisajes, vehículo, estudio).
- Si algún proyecto trae escenarios construidos, al abrirlo se descartan: sus planos vuelven al escenario que les toca
  por su locación (interior → habitación; exterior → calle, paisaje o exterior abierto, como cuando se arman solos), con
  las figuras, la cámara y las luces donde estaban.

### 2 · Un escenario importado sobre un entorno
- En **Escena › Escenario** eliges el entorno (playa, bosque, parque, montaña, desierto, cañaveral, calle, jardines,
  exterior abierto) y debajo aparece **«Agregar modelo importado…»**. Si el proyecto ya tiene escenarios 3D, sale la lista
  (y **«Importar uno nuevo…»**); si no tiene ninguno, se abre directo el importador.
- Se abre **«Ubicar «…»»**: la vista desde arriba con su cuadrícula (cada metro y, más marcada, cada 5 m), el entorno,
  las figuras y la cámara del plano de referencia y la cruz roja del centro de la escena.
  - **Arrastra la casa** para moverla (de 10 en 10 cm; con Mayús, libre).
  - **El asa redonda** la gira (de 15° en 15°; con Mayús, libre). También la barra **Giro**.
  - Arrastrar el fondo mueve la vista; la rueda y los botones **− / +** acercan; **⛶** la muestra entera.
  - Con el teclado: las flechas la mueven (10 cm; con Mayús, 1 m) y **Q / E** la giran.
  - **«Al centro de la escena»**: la deja con su punto de la acción en el centro (como si fuera el escenario solo).
  - **Listo** la deja ahí. El aviso trae **Deshacer**.
- Queda apoyada en el suelo del entorno. **Los árboles, rocas, palmeras, bancas, edificios, postes** y lo demás del
  entorno que caen donde está la casa **se quitan** (nada la atraviesa); el suelo, el mar, la pista y las veredas se quedan.
  Las figuras pueden estar dentro o fuera.
- **Es de la locación del guion**: todos los planos de esa locación que usan un entorno ven la casa en el mismo lugar
  (si cambias de playa a bosque, la casa sigue ahí). En la habitación, el vehículo, el mar abierto, el estudio o con el
  modelo solo no aparece.
- Ya puesta, en el panel se ve su nombre y sus medidas con **«Ubicar…»** (para moverla) y **«Quitar»** (la saca del
  entorno; el escenario 3D sigue en el proyecto). Las dos cosas se deshacen desde el aviso.
- Se ve en la **viñeta**, la **planta del plano**, la **planta general**, el **PDF del storyboard con planta** y el
  **animatic**.
- **Un modelo solo, sin entorno** (elegido como escenario en la lista: «Escenario 3D: …») sigue funcionando como antes.

### 3 · «Plano» primero
- Las pestañas del panel del editor de la viñeta van **Plano, Figura, Cámara, Escena, Luz**, y al abrir una viñeta se ve
  primero **Plano** (tamaño, ángulo, movimiento, soporte), en la computadora y en el teléfono.
- Siguen los saltos: tocar una figura u objeto → **Figura**; la cámara → **Cámara**; una luz → **Luz**. Al agregar una
  figura, extras u objeto se abre **Figura** con lo agregado elegido.
- Al terminar de dibujar sobre la viñeta («Listo», la vista libre, agregar algo) se vuelve a la pestaña en la que
  estabas antes de dibujar (antes iba siempre a Figura).

### Candado de Studio
- Importar escenarios 3D es del plan **Studio**. Sin Studio, **«Importar escenario 3D…»** (el botón y la opción de la
  lista), **«Ajustar…»**, **«Agregar modelo importado…»** y **«Ubicar…»** llevan el candado «Studio» y abren la ventana que
  explica el plan («Ver planes de suscripción»).
- Lo que el proyecto ya tiene se sigue viendo en sus planos, la planta y los PDF; también se puede elegir un escenario 3D
  que ya está en la lista y quitar un modelo del entorno. Solo no se importan nuevos ni se ajustan o ubican.
- Usa `studioFeat('set3d')`, `studioLockHTML('set3d')` y `studioAsk('set3d')` del frente «planes», siempre con guarda:
  sin esa parte de la app (esta rama sola), todo se puede.

## Cómo lo probé
- Pruebas de la app: todas pasan salvo `test/pdf.test.js` (ya fallaba: le falta el módulo canvas). Nueva
  `test/escenarios-ad.test.js` (12): los construidos se descartan al abrir (planos a su escenario, figuras, cámara y luces
  quietas, `locSet3d` limpio), un proyecto sin construidos no cambia, el constructor ya no está en ningún archivo, la
  limpieza de `P.sobre3d`, que es de la locación y solo sobre un entorno, poner y quitar, lo que ocupa (con giro y escala),
  qué del entorno lo toca, el candado de Studio (con y sin `studioFeat`), las conexiones con la viñeta, la planta y el
  equipo, y el orden de las pestañas. `test/escenarios-w.test.js` queda con las pruebas de la escala.
- En Chromium (Playwright) con «La última función» y una casa de 8 × 6 m hecha como .glb: importar desde «Agregar modelo
  importado…» (sin la casilla «Usarlo en toda la locación»), moverla y girarla con el asa, Listo, Deshacer, elegirla otra
  vez del menú; la casa en la calle, la playa, el bosque, el parque, el cañaveral, los jardines, el desierto y la montaña
  (vistas desde arriba con y sin la casa: se quitan los edificios y sus ventanas, la pileta del parque, la
  palmera, los árboles y las cañas que caen debajo); con la calle al 150 % la casa no cambia de tamaño; las viñetas de
  los cuatro planos de la locación, la planta del plano, la planta general, el PDF del storyboard con planta y el
  animatic; el candado (con funciones de prueba); en inglés y en modo oscuro; en el teléfono (390 × 844, táctil): abre en
  Plano, el panel, el importador, la ventana para ubicar y arrastrar con el dedo; Scouting sin el botón; un proyecto con
  un escenario construido abierto con `normalizeProject`. Sin errores en la consola.

## Notas técnicas (para unir con los otros frentes)
- **Datos nuevos**: `P.sobre3d = { '<locación>': { id, x, z, r } }` (id: de `P.sets3d`; x, z: el centro de su planta en
  la escena; r: el giro en grados). Viaja con la sección «storyboard» (`src/share.js`). Se limpia al abrir y al llegar del
  equipo (`sobreNormalize`, desde `set3dNormalize`).
- **Archivos**: `src/escenarios-construidos.js` → `src/escenarios-escala.js` (solo la escala y `set3dNormalize`, que
  reemplaza a `bsNormalize`); se borraron `src/constructor-escenarios.js`, `src/escenarios-replica.js` y
  `test/datos/cuarto-sintetico.js`; la versión liviana (`e3LightPack`, `E3_LIGHT`, `e3KB`) pasó a `src/escenarios-3d.js`.
  Nuevo `src/escenarios-sobre.js` (datos, 3D con `sobreSync`/`sobreCut`, planta con `sobreDrawPlan`, la ventana
  `openSobrePlacer`, y `set3dStudio`/`set3dLock`/`set3dAsk`). `build.sh`: `escenarios-3d escenarios-escala
  escenarios-sobre planta-general`.
- **Toques en archivos compartidos**: `s3d-render.js` (una línea en `r3Sync`, una en `figSig`, una en
  `thumbFigsReady`), `s3d-model.js` (se quitó la línea de `bsLights` en `s3Default`), `proyectos.js` (la llamada a
  `set3dNormalize`), `share.js` (dos líneas), `tab-scout.js` (el botón), `shot-editor.js` (pestañas, `tab: 'shot'`, la
  vuelta del dibujo con `E.tabBack`, el panel Escena, `import3d` con el candado, `del3d`), `escenarios-3d.js`
  (`set3dSig`, `set3dDrawPlan`, el importador con `opts.sobre`; la línea de `proGate` del importador no se tocó, para
  que el frente «planes» la cambie sin choques), comentarios que nombraban `escenarios-construidos.js` en
  `floorplan.js`, `s3d-entornos.js`, `s3d-model.js` y `s3d-render.js`, `shell.html` (sin el CSS del constructor; `.so-*`
  nuevo) e `i18n/en-manual.json` (se quitaron 63 textos del constructor y la réplica del bloque «lote W · escenarios»;
  bloque nuevo «// lote AD · escenarios»).
- **Cómo se dibuja**: el modelo cuelga del entorno visible (`R3.sobre`, un solo grupo): se esconde con él, también con la
  foto de referencia detrás, y compensa la escala de la calle o del paisaje. Lo que se esconde del entorno se vuelve a
  mostrar al quitar o mover el modelo, o en otra locación (`sobreCut` guarda lo que cambió).

## Qué queda o decidí distinto
- La casa es **de la locación** y aparece con **cualquier entorno** de esa locación (no por pareja locación + entorno): así,
  cambiar de playa a bosque no la pierde. En la habitación, el vehículo, el mar abierto (el bote) y el estudio no aparece.
- En la ventana para ubicar, el fondo es el dibujo de planta del entorno (la pista y las veredas de la calle, la orilla de
  la playa); los árboles no se dibujan en la planta, por eso no se ven ahí, pero sí se quitan en 3D.
- En el teléfono no hay pellizco para acercar en esa ventana: están los botones − / + y «ver todo».
- La planta del plano se encuadra con las figuras y la cámara como siempre; si la casa queda lejos de ellas, se ve en
  parte (se aleja con el − de la planta).
