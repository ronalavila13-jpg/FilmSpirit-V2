# Lote W · B: «Personalización» en el panel lateral y Grafito sin apagar la marca (26-oct-2026)

Base: lotes T, U y V unidos. Rama `lote-w-b` (frente B del lote W; los otros frentes tocan el stripboard y la hoja de
llamado, el mapa de Scouting, el editor 3D y el constructor de escenarios).

## Qué cambia (para Ronald)

### Observación 4 · La personalización se abre en el mismo panel lateral
- **El botón de la barra de pestañas** (el «⋯» al final de las pestañas) ya no abre el menú chico: abre directamente el
  panel de la derecha, que ahora se llama **«Personalización»**. Otro toque al mismo botón lo cierra (también la ✕ y
  la tecla Esc).
- **«Tu pantalla»**, en este orden:
  1. **Modo:** Automático, Claro u Oscuro (una sola vez: ya no está repetido arriba en un menú).
  2. **Pestañas visibles:** por etapa (Guion, Preparación, Imagen, Producción y Rodaje), en dos columnas. El guion
     siempre se ve y su casilla está apagada, como antes. Debajo: «Ocultar una pestaña no borra nada: vuelve a marcarla
     para verla». Si ocultas la pestaña en la que estás, pasas al guion.
  3. **Color de las etapas** (Vivos, Suaves, Grafito).
  4. **Letra.**
  5. **Barras y líneas.**
  6. **«Volver a lo de siempre (solo tu pantalla)»**: ahora también vuelve a mostrar todas las pestañas, y el aviso trae
     **«Deshacer»** por si lo tocaste sin querer (antes no se podía deshacer).
  - Arriba sigue el aviso azul «Solo para ti, en este navegador. Nadie más lo ve y el proyecto no cambia».
- **«Colores del proyecto»** queda igual, como segunda pestaña.
- **Desaparecen** el menú chico y el botón «Apariencia…».
- **Desde la leyenda**, «Colores del proyecto…» abre este mismo panel en su pestaña. Si con el panel abierto en
  «Colores del proyecto» tocas el botón de las pestañas, pasa a «Tu pantalla» (no se cierra).
- **En el teléfono**: el menú de arriba (⋯ o tu foto) dice **«Personalización · Modo, pestañas, colores y letra»** (antes
  «Vista»). Abre el panel como una **hoja que sube desde abajo**, casi a pantalla completa, con su asa arriba; detrás, la
  pantalla se oscurece un poco y tocarla cierra la hoja. En Inicio (sin un proyecto abierto) la hoja trae solo «Tu
  pantalla».
- La ayuda del plan de rodaje («Personalización», antes «Apariencia») ya dice dónde está y que incluye las pestañas
  visibles. En inglés: «Personalization».

### Observación 5 · Grafito ya no apaga el logo ni los íconos de las etapas
- Con **Grafito** pasan a gris solo **las barras y los acentos** (la franja de pestañas, la barra de herramientas, la
  placa de la etapa elegida, la raya de la pestaña abierta).
- Quedan **con su color de marca**:
  - **el logo** de arriba a la izquierda (FILM negro, o blanco de noche; SPIRIT naranja; la edición en rojo), en claro
    y en oscuro. En esta versión el logo ya no cambiaba con Grafito; queda comprobado en claro y en oscuro, en
    computadora y en teléfono, y escrito en el código para que no se pierda;
  - **los íconos de las etapas** de la barra de la izquierda (Guion, Preparación, Imagen, Producción y Rodaje). **La
    etapa elegida** lleva su ícono **entero, en sus colores**, sobre la placa gris oscura (en Vivos y Suaves sigue a una
    tinta sobre la placa de su color, como siempre);
  - **los íconos de las pestañas** (Guion rayado, Desglose…), en la franja, en el menú de cada etapa y en «Ir a…», a
    color como en Vivos y Suaves (antes, en Grafito, los de la franja salían en gris).
- **De noche**, con Grafito, la raya de la pestaña abierta y el velo de la franja pasan a gris (antes quedaban rojos en
  Preparación, amarillos en Producción…).
- **Vivos y Suaves no cambian** (comparado píxel por píxel en claro y en oscuro).
- La paleta **«Escala de grises»** de «Colores del proyecto» (para imprimir en blanco y negro) sigue pasando los íconos a
  gris: esa es del proyecto y para el papel. Grafito es solo de tu pantalla.

## Decisiones (tomadas por el frente)
- **Íconos de las pestañas a color en Grafito.** Son los mismos dibujos de marca que los de las etapas (cuerpo amarillo,
  detalles negros y rojos); dejar las etapas a color y las pestañas en gris se veía incoherente, y sobre la franja gris
  clara (o oscura de noche) se leen bien. Así Grafito es «la interfaz en gris, la marca a color».
- **El ícono de la etapa elegida, entero sobre la placa gris.** A una tinta (blanco sobre gris) se veía como los otros
  grises de Grafito; entero, con su amarillo y rojo, se distingue y repite el ícono de la barra. Sobre #2A2A2A (claro) y
  #3D3D3D (oscuro) el amarillo y el rojo contrastan bien; lo negro del ícono queda como corte, igual que en reposo.
- **El botón de las pestañas abre y cierra.** Es lo que se espera de un botón que abre un panel lateral; con el panel en
  «Colores del proyecto» lo pasa a «Tu pantalla», que es lo que ese botón promete.
- **Pestañas visibles en dos columnas** para que la sección no alargue el panel más de lo necesario (con una sola columna
  eran 16 filas antes de llegar al color de las etapas).
- **El panel recuerda dónde ibas**: al marcar una casilla o cambiar algo, ya no salta arriba.
- **«Volver a lo de siempre» incluye las pestañas visibles y se puede deshacer.** Es una preferencia de esta pantalla como
  las demás de esa pestaña; el aviso trae su propio «Deshacer» porque no pasa por el historial del proyecto.
- En el teléfono, la hoja ocupa casi toda la pantalla (deja ver la barra de arriba) en lugar de la media altura de antes:
  con las pestañas visibles, a media altura había que desplazarse mucho.

## Archivos
- `src/shell.html`:
  - bloque «Grafito»: fuera el `filter:grayscale(1)` de los íconos de las etapas y de la franja; comentario nuevo;
  - «la barra de las etapas»: el ícono a una tinta en la placa elegida solo fuera de Grafito (`:root:not([data-secn])`);
  - «el modo oscuro: luz de sala»: `--sx-line` gris en Grafito;
  - comentario del monocromo (Escala de grises);
  - panel «Personalización»: la sección «Pestañas visibles» (`.lk-tabsv`), la hoja del teléfono (`.np.lk` en
    `max-width:700px`, `.lk-scrim`) y el panel visible en Inicio;
  - comentarios «Apariencia › Letra» → «Personalización › Letra».
- `src/leyenda.js`: título «Personalización», «Pestañas visibles» en «Tu pantalla», `lookToggle()`, el velo del teléfono,
  el panel sin proyecto (Inicio), conservar el desplazamiento al repintar y `lookResetMe()` (con las pestañas y Deshacer).
- `src/barra.js`: `tabsMenu()` (el menú chico) se reemplaza por `tabsPickHTML()` y `tabsPickSet()`; el menú del teléfono
  dice «Personalización» y abre el panel.
- `src/arranque.js`: el botón de la barra de pestañas (`#tabsCfg`) abre y cierra el panel; título y `aria-controls`.
- `src/tab-plan.js` (frente A): **solo** la línea de la ayuda «Apariencia» → «Personalización» (línea 1207).
- `src/ui.js`: un comentario.
- `i18n/en-manual.json`: bloque `// lote W · B` al final.
- `test/apariencia.test.js`: una prueba nueva.

## Pruebas
- `node test/apariencia.test.js`: todas pasan (con la nueva: «Volver a lo de siempre» muestra todas las pestañas y se
  deshace). También `produccion-u`, `clonar` y `planta`: pasan. `node i18n/hacer.js`: JSON válido.
- En el navegador (Playwright, proyecto de ejemplo, sin errores en la consola):
  - computadora 1440×900: el botón abre y cierra el panel; Esc lo cierra; cambiar el modo a Oscuro y volver; ocultar
    Casting (desaparece de la franja y de la barra) y volver a mostrarlo; «Colores del proyecto»; Grafito desde el
    panel; la leyenda del plan abre «Colores del proyecto»; «Volver a lo de siempre» y «Deshacer»; en inglés;
  - teléfono 390×844 con toque: el menú de arriba › Personalización abre la hoja; modo oscuro; tocar el velo la cierra;
    en Inicio la hoja trae solo «Tu pantalla»;
  - Vivos, Suaves y Grafito en claro y oscuro, en computadora y teléfono: el logo igual en todos; en Grafito, los íconos
    de las etapas y de las pestañas a color y las barras en gris; Vivos y Suaves sin cambios frente a antes.
- Capturas antes/después en `/home/claude/w-capturas/frente-b/`.
