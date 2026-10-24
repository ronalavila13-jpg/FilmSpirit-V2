# FilmSpirit · lote D de la revisión thermos (22 de octubre de 2026): limpieza sin cambios a la vista

Este ZIP trae solo los archivos modificados. Descomprímelo **encima** de tu carpeta `octavos/`, **después de los lotes
A, B y C**. Después arma como siempre: `sh build.sh`, `node server/make.js` y `cd desktop && node make.js`.
`filmspirit-servidor.zip` ya trae los lotes A a D.

**No cambia nada de lo que se ve ni de lo que hace el programa.** Se quitó código que ya no hacía nada. La página web
queda unos 30 KB más liviana y cada pintada hace menos trabajo.

## Qué se quitó

### El sistema viejo de color por pestaña
Desde que las pestañas dejaron de tener color propio, la app seguía calculando y escribiendo unas 110 variables de color
en cada pintada: una escala por pestaña y otra para la abierta. Nada las leía: el CSS ya toma la escala neutra desde
`body`.
- **Se quitó la escritura** de esas variables:
  - en `leyenda.js`: la escala de cada pestaña y la de la abierta;
  - en `ui.js`: los colores de cada etapa de la franja de pestañas.
- **Se quitó el CSS** que solo las pasaba de un lado a otro: 15 líneas de variables por pestaña y la raya de color de la
  pestaña elegida. La raya que sí se ve (la de «Proyecto») quedó con su color fijo, el mismo de antes.
- **El estilo «Color» y el «Clásico»:**
  - las funciones `lookStyle` y `applyStyle` no se usaban;
  - el calificador `:not([data-style])` estaba en 21 reglas y siempre se cumplía.
- **La escala neutra** de los PDF, los Excel y las hojas de mes ahora se pide una sola vez. Antes se calculaba por
  pestaña y por mes, y daba el mismo gris. Se quitaron las tablas que elegían esa pestaña (`PDF_KIND_TAB`, `PDF_TABC`,
  `CM_MON_TAB`, `CM_WD_TAB`).
- **Se conservan** los colores de pestaña que un proyecto o un tema guardó antes. No se usan, pero un archivo viejo se
  sigue abriendo y guardando igual.

### CSS sin uso
- **172 reglas** que no se aplicaban a nada, porque ninguna parte del programa usa esas clases. Por ejemplo:
  - la hoja de llamado anterior (`cs-hero`, `cs-strip`, `cs-card`…);
  - el aviso viejo de ejemplo;
  - el menú del animatic de antes;
  - las letras de «Colores y temas» y la fila de pestañas debajo de la barra (`bar-sib`).
- **11 selectores** sin uso, quitados de reglas que siguen.
- **Unas 60 líneas de comentarios** del estilo «Color» que ya no describían ninguna regla.

La revisión había contado 208 reglas. Al comprobarlas, 36 sí se usan, así que se quedaron:
- las partes de los íconos: su clase se arma al dibujarlos;
- los tipos de párrafo del guion (`t-c`, `t-d`…), los códigos del DOOD (`c-i`, `c-f`…), las marcas de formato y las
  secciones de Construcción: también se arman con el dato.

### Código JavaScript sin uso
- **21 declaraciones que nadie usaba**, comprobado en todos los archivos. Por ejemplo:
  - la miniatura automática vieja del storyboard y su caché;
  - cuatro colores del plan;
  - `s3Dur`, `edTxt`, `clipText`, `logoTile`, `d2Pt` y `boxPhotoCount`.
- **`presenceMenu` y `teamMenu`** solo pasaban la llamada a `teamPanel`. Ahora se llama directo.

### Comprobaciones que nunca fallan
Se quitaron **103 comprobaciones** del tipo `typeof f === 'function'` hechas sobre funciones que existen siempre: se
declaran con `function` en un archivo que va en las tres versiones (web, servidor y escritorio).

Quedan las otras, a propósito:
- **Nombres declarados con `const` o `let`:** al cargar todavía pueden no existir.
- **Nombres que solo existen en una versión**, por ejemplo el equipo del servidor o el del escritorio.
- **Los archivos que las pruebas cargan solos:** `core.js`, `areas.js`, `share.js` y otros.

Ese orden se va a poder simplificar con el lote E, cuando el armado diga para qué versión es.

## Cómo se comprobó que nada cambia a la vista

- **Estilos calculados, antes y después:** se compararon los de cada elemento de la pantalla (color, fondo, letra,
  tamaños, márgenes, bordes, sombras…).
  - Se miraron 14 pestañas más Inicio, en claro y en oscuro, en computadora (1440 px) y en teléfono (390 px).
  - Después, con las barras blancas y suaves, las líneas finas y gruesas, el color de secciones Pastel y Monocromo.
  - Resultado: **0 diferencias** en unos 95 000 elementos comparados.
- **Recorrido:** 14 pestañas en español e inglés, con tres anchos y en claro y oscuro, sin errores. En inglés no quedan
  textos sin traducir.
- **Exportaciones:** se generaron los 24 tipos de PDF (la lámina, con cada caja) y los Excel del calendario y del plan,
  sin errores.
- **Pruebas:** pasan las del programa y las del equipo del escritorio.

## Archivos

`src/`:
- **Color viejo:** `leyenda.js`, `ui.js`, `pdf.js`, `xlsx.js`, `cal-meses.js`, `plan-dood.js`, `tab-plan.js`,
  `tab-cal.js`, `tab-call.js`
- **CSS:** `shell.html`
- **Código sin uso:** `share.js`, `share-api.js`, `s3d-model.js`, `guion-editor.js`, `tab-animatic.js`,
  `tab-project.js`, `s2d-editor.js`, `tab-board.js`, `laminas.js`, `s3d-render.js`, `ficha.js`, `shot-editor.js`
- **Comprobaciones:** `archivo.js`, `barra.js`, `guion-cierre.js`, `guion-margen.js`, `guion-revision.js`, `inicio.js`,
  `notas.js`, `s3d-figs.js`, `s3d-figuras.js`, `s3d-luz.js`, `s3d-objetos.js`, `s3d-pelo.js`, `sup-partes.js`,
  `tab-build.js`, más varios de las listas de arriba

Raíz: `CAMBIOS-lote-D-2026-10-22.md`
