# FilmSpirit · lote K (22 de octubre de 2026): PDF más aireados

Ronald: «En los export toda la información se siente muy amontonada». Se revisaron todos los PDF que exporta el
programa y se les dio un sistema común: más aire, una jerarquía clara en las filas de escena, sin «-» de relleno y una
cabecera nueva en la hoja de llamado. El guion y el guion rayado no se tocaron (formato de la industria).

**Cómo aplicarlo.** Va en el ZIP de la app y en el del servidor, como los demás lotes (no hay que hacer nada aparte).
No hay migración de datos ni variables nuevas: solo cambia cómo se dibujan los PDF.

## Qué cambió

### 1. Un sistema común para todos los PDF (src/pdf.js)
- **Letra**: el texto a 8,8 pt, lo secundario a 7,9 pt en un gris que se lee, las cabeceras de tabla a 7,4 pt.
- **Interlineado 1,3** en todo el documento (antes, el de jsPDF: más apretado).
- **Celdas con aire**: 5 pt arriba y abajo, 6 a los lados.
- **Solo líneas horizontales finas** entre filas. La cuadrícula queda donde hace falta: desglose, días por actor y
  calendario.
- **Entre bloques**, 16 pt.
- **Títulos de sección** en minúscula normal, en negrita, con una regla fina debajo (antes, una barra gris con el
  nombre en MAYÚSCULAS). Si no queda lugar para el título y unas filas, pasa a la página siguiente.
- **El total solo al final** de una tabla larga (antes se repetía al pie de cada página).
- Respeta la paleta del proyecto, lo de «Tu pantalla» (barras, líneas, letra) y **Escala de grises**.

### 2. Las filas de escena, con jerarquía
En la hoja de llamado, la hoja de script, el guion técnico y el plan de rodaje:
- el **encabezado en negrita**; las páginas y lo demás en normal y gris;
- «**Utilería y arte:**» como etiqueta gris y la lista en su propia línea, más chica;
- cada escena es un **bloque que no se parte**: su título nunca queda solo al pie de una página, sin sus planos.

Para esto hay celdas con varios estilos (negrita y gris en la misma celda), que cortan las líneas por palabras.

### 3. Sin «-» de relleno
- Ninguna tabla lleva «-» ni «—» donde falta un dato: queda en blanco.
- Lo que el equipo necesita en la hoja de llamado dice **«Por confirmar»** (en inglés, «TBC»): actor o actriz,
  centro de salud, punto de encuentro, horario. Los avisos de la app ya lo dicen así («Sin ese dato, el PDF dice
  «Por confirmar».»).
- Se ocultan las columnas que nadie llenó: en el reparto de la hoja de llamado, teléfono, recojo, vestuario,
  maquillaje y listos solo salen si alguien tiene el dato. La columna **Set** del cronograma se fue (la locación ya
  está arriba). **Sonido** y **Observaciones** se quedan (son para escribir a mano), más angostas.

### 4. Anchos de columna
Las columnas de texto largo (descripción, acción, encabezado) se llevan el ancho; las técnicas cortas (lente, hora,
plano, 1/8, «Inicio y fin») ya no se parten en dos líneas. Lentes como «24 mm» y duraciones como «6 s».

### 5. La cabecera de la hoja de llamado
- A la izquierda, **«Día de rodaje»** y la fecha en grande, con páginas, escenas y planos en gris.
- Al centro, **«Llamado general»** con la hora en 32 pt.
- A la derecha, las **locaciones** con su dirección (o «Por confirmar»).
- Debajo, en dos columnas: **horario**, **listos motor**, **almuerzo** (si hay), **centro de salud** (siempre) y el
  **clima solo si hay dato**.
- La nota para el equipo en un recuadro amarillo, alineado a la izquierda.

### 6. Por documento
- **Plan de rodaje**: encabezado en negrita y la sinopsis chica en gris (antes en cursiva); «Jornada 1»,
  «Cierre de jornada», «Etapa», «Sin programar» en minúscula normal; la leyenda del reparto en una sola línea (antes
  una tabla que a veces pasaba sola a otra página).
- **Hoja de script**: el resumen en tres pares por fila; los planos rodados tachados a la altura justa.
- **Guion técnico**: escenas en bloques; columnas ajustadas.
- **Parte diario**, reportes de cámara y sonido: títulos con regla, rótulos en gris y datos en negrita; cada tarjeta o
  rollo en su fila de grupo (nombre en negrita, conteos en gris).
- **Desglose**: el informe de elementos con una fila por categoría; las hojas con listas numeradas y más aire.
- **Presupuesto**: secciones en bloques; «Total» en minúscula normal.
- **Escaleta**: actos en bloques con su cantidad de escenas; «Por escribir» en gris.
- **Días por actor**: las fechas de la cabecera ya no se parten.
- **Elementos de un área**: la jornada con su número en negrita y la fecha en gris.
- **Gastos**: la orden de compra y el sobre de caja chica con el aire común; el **reporte de sobrecostos** con el
  resumen en una franja de seis cifras (antes, seis filas), y sigue en una página.
- **Biografías, scouting, casting, storyboard, láminas, plantas**: solo el interlineado; se revisó que el texto no
  quede apretado.
- En inglés, el título del PDF de un área decía «Desglose por scenes»: ahora «Scene breakdown».

### Páginas antes y después (proyecto de ejemplo)
Iguales en español, en inglés y en Escala de grises:

| PDF | Antes | Después |
|---|---|---|
| Hoja de llamado | 2 | 2 |
| Plan de rodaje | 1 | 1 |
| Parte diario | 1 | 1 |
| Hoja de script | 1 | 1 |
| **Guion técnico** | **1** | **2** |
| Presupuesto | 2 | 2 |
| Desglose | 9 | 9 |
| Reporte de sobrecostos, orden de compra, caja chica | 1 | 1 |
| Todos los demás | igual | igual |

El guion técnico pasa a 2 páginas porque la última escena ya no se corta entre una página y otra.

## Lo que queda para otra ronda y por qué
- **Guion técnico, 2 páginas**: se podría volver a 1 achicando la letra, pero quedaría apretado otra vez. Se prefirió
  que ninguna escena se corte.
- **Parte diario**: las columnas Inicio y Fin de cada escena, y Actor y Llamado del reparto, siguen aunque estén
  vacías: son datos del rodaje que se pueden anotar a mano en el papel. Si prefieres ocultarlas cuando nadie las
  llenó, es un cambio chico.
- **Lámina de fotos**: el script de prueba no la puede exportar sin elegir un área (ya pasaba antes; en la app
  funciona normal).
- **Guion y guion rayado**: no se tocaron, a propósito.

## Pruebas
- Nueva, `test/pdf-diseno.test.js` (5): exporta todos los PDF del ejemplo con la jsPDF de verdad y revisa que ninguna
  celda ni texto sea un «-» de relleno, que la hoja de llamado quepa en 2 páginas, que diga «Por confirmar» y que los
  títulos de sección no estén en MAYÚSCULAS. Con el código de antes falla en 3 de las 5. Necesita las bibliotecas de PDF
  que copia build.sh; sin ellas, se omite.
- Las de siempre pasan todas: `test/*.test.js` (con la nueva), equipo (11) y `test/team/unit.js`, servidor (80) y la
  de humo en el navegador (español e inglés, claro y oscuro, 1440, 1024 y 390 px: 0 errores).
- En el navegador: los 25 PDF del ejemplo exportados en español, en inglés y con Escala de grises, y los 3 de Gastos
  en español. Se miraron las páginas de todos en español y los principales en inglés y en grises: nada se corta ni se
  pisa. En inglés, además, se buscó texto sin traducir: solo quedan nombres propios del ejemplo («La Hermelinda»).
- Láminas antes/después (página 1 de cada PDF que cambió) y una de resumen con los seis principales.

## Archivos
- `src/pdf.js`: el sistema común (medidas, títulos de sección, celdas con varios estilos, tablas en bloques), la hoja
  de llamado, el plan, el guion técnico, la hoja de script, el desglose, el presupuesto, el área, el storyboard.
- `src/sup-partes.js`: parte diario y reportes de cámara y sonido.
- `src/plan-dood.js`, `src/cal-meses.js`, `src/tab-build.js` (escaleta, biografías), `src/tab-scout.js`,
  `src/tab-casting.js`, `src/laminas.js`: lo mismo en sus PDF.
- `src/tab-gastos.js`: los tres PDF de Gastos.
- `src/tab-call.js`: los avisos dicen «Por confirmar».
- `src/i18n.js`: en inglés, las celdas con varios estilos se traducen tramo por tramo.
- `i18n/en-manual.json`: bloque «// lote K».
- `test/pdf-diseno.test.js`: la prueba nueva.
