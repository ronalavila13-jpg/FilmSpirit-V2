# Lote AI · estilo Excel o Apple (28 de octubre de 2026)

Lo que pediste: **«un botón en la hoja de llamado y el stripboard donde se pueda intercambiar entre el estilo Excel y el
estilo Apple»**.

## Cómo se usa

En la barra de arriba de la **Hoja de llamado** y del **Plan de rodaje**, junto a «Leyenda» y «Exportar», hay un botón
chico **Excel | Apple**. Un toque cambia el estilo de ese documento, **en la pantalla y en el PDF**.

- **Apple** (así viene): letras en escala, grises suaves, líneas finas y aire, sin cuadros. Es la forma de antes del
  lote AH.
- **Excel**: todo en cuadros con líneas negras bien visibles, como una planilla. Es lo del lote AH.

Cada documento guarda su estilo **en el proyecto**: todo el equipo lo ve y lo exporta igual. Los proyectos de antes y
los nuevos, el proyecto de ejemplo y las hojas libres abren en **Apple** hasta que alguien elija Excel. Cambiar el
estilo se deshace con «Deshacer» (y sale en el historial: «Hoja de llamado en estilo Excel»). Solo lo cambia quien puede
editar ese documento. En el celular, el botón está en el «⋯» de la barra («Estilo del documento»), para no quitarle lugar
al selector de la jornada.

## Qué cambia en cada uno

**Hoja de llamado.** Lo que dice la hoja es lo mismo en los dos estilos: talentos y equipo técnico por separado, jefes
de área, cierre de set y wrap, sin proveedores, sin «Cronograma», sin encabezado ni pie de página, utilería y centro de
salud al final, las hojas libres, el avance de cualquier jornada, los cambios sobre el stripboard… Solo cambia la forma:

- Apple: la cabecera en tres columnas separadas por una línea fina; cada bloque (Jefes de área, Avance, Talentos,
  Equipo técnico, Utilería especial, Punto de encuentro, Movilidad) con su título y una regla fina debajo; las filas con
  aire y una línea suave entre ellas; la nota para el equipo al centro, en su recuadro amarillo redondeado; el centro de
  salud y los canales de radio al final, bajo una regla, como el pie de antes.
- Excel: igual que en el lote AH.
- El Excel (.xlsx) de la hoja no cambia.

**Plan de rodaje.**

- En la pantalla: en Excel, el stripboard parece una hoja de cálculo (cada jornada en su cuadro de borde negro, líneas
  negras entre las filas y entre las columnas de arriba abajo, y los títulos de las columnas en su fila gris). En Apple,
  como está hoy. El DOOD de la pantalla también lleva la rejilla negra en Excel.
- El PDF del plan: en Excel, lo del lote AH (la rejilla negra, la leyenda y el reparto en cuadros). En Apple, lo de antes
  del lote AH: una línea fina debajo de cada fila, sin rejilla, y la leyenda y el reparto sin cuadros. Los dos con las
  miniaturas del storyboard (si la casilla está marcada) y «Tiempo aprox.».
- El PDF del DOOD va con el estilo del plan.
- La cabecera de los dos PDF: sin barra de color, sin fecha de creación y sin pie de página, en los dos estilos. En
  Excel, el cuadro; en Apple, la misma información sin marco (el proyecto en grande, el documento y su subtítulo, la
  empresa y «Página 1 de 2») con una regla fina debajo.

Todo sale bien en Carta y en A4, en la computadora y en el celular, en claro y en oscuro, y en inglés.

## Lo que decidí al leer el pedido

- **El botón** dice «Excel | Apple», con tus palabras (en inglés, igual). Al pasar el mouse explica cada uno.
- **De entrada, Apple** (lo pediste después): el dato se guarda solo cuando alguien elige; sin él, Apple.
- **El estilo no es contenido**: cambiarlo no hace «vieja» una hoja de llamado ya enviada ni le sube la versión.
- **La nota para el equipo** en Apple va centrada (como antes); en Excel, alineada a la izquierda (como en el lote AH).
- **En Apple, el centro de salud y la radio** van una sola vez, al final de la hoja (no al pie de cada página, porque se
  quitó el pie), y pueden bajar hasta casi el borde de la hoja para no pasar solos a una página nueva.
- **En el celular**, el botón va en el «⋯» y no en la barra: en la barra le quitaba el lugar al selector de la jornada.

## Para la unión (técnico)

- Datos: `P.call.style` y `P.schedule.style` = `'excel'` o `'apple'` (sin el dato, Apple). Se sanean al cargar
  (`callNormalize`, `planDocNorm`).
- Funciones nuevas: `callXL` (tab-call.js), `planXL` (tab-plan.js), `hdStyleSeg` y `hdStyleMore` (cabecera.js; `hdSeg`
  acepta una clase), `docHeaderFlat` y la opción `{ flat: true }` de `docHeader` (pdf.js; sin ella, la cabecera de
  siempre), `pdfCallHR` (pdf-llamado.js). `pageNumbers` escribe a la derecha y en gris cuando la cabecera no tiene cuadro.
  Acciones `cl-style` y `pl-style`; `TOOLS_EXTRA.call` (nuevo) y `TOOLS_EXTRA.plan` (con el estilo).
- Archivos: src/tab-call.js, src/tab-plan.js, src/plan-dood.js, src/pdf.js (`docHeader`, `docHeaderFlat`, `pageNumbers`,
  `pdfPlan`), src/pdf-llamado.js (`pdfCallHead`, `pdfCall`, `pdfCallHR`), src/cabecera.js, src/shell.html (dos bloques
  CSS al final: la hoja en Apple `.cs.cl.cl-ap` y el plan en Excel `.pl.xl`, más el DOOD y el menú del celular),
  i18n/en-manual.json (bloque «// lote AI · estilo»; y la ayuda de la hoja y del plan, que decía «toda en cuadros»).
- Pruebas: `test/estilo-ai.test.js` (14, nueva); `test/plan-ah.test.js` cambia en lo mínimo (sus pruebas de la rejilla
  negra ahora eligen Excel). App: 53 bien; solo falla `test/pdf.test.js`, que ya fallaba (le falta el módulo canvas).
  Servidor: 20 de 20. Los PDF en Excel salen idénticos a los del lote AH (comparados página por página).
- Capturas: `…/scratchpad/ai-estilo/capturas/` (antes-*, la pantalla y los PDF en los dos estilos).
