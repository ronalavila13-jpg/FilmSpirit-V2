# Lote Y · tres observaciones del 26-oct-2026

Base: lote X (que trae los lotes T, U, V, V · rendimiento y W). Rama `lote-y`.

**Cómo aplicarlo.** El `filmspirit-servidor.zip` de este lote trae todo lo anterior más estos cambios. En la VPS, como
siempre: `cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Viene sin los maniquíes 3D (el actualizador conserva los instalados). No hay variables ni migraciones nuevas en este
lote; si el lote W todavía no se instaló, se aplican solas las migraciones 10 y 11 (con respaldo antes).

## 1. El clima con su unidad pegada al número
- En la hoja de llamado, la máxima y la mínima llevan «°» y la humedad «%» apenas se escribe el número («30°», «15°»,
  «10%»). Se escribe solo el número; si alguien pone la unidad a mano, no sale repetida.
- En «Clima», un número solo es la temperatura: «29» sale «29°». Un texto («Soleado», «29 y soleado») queda tal cual.
- Igual en el PDF y en el Excel.

## 2. Stripboard: el ancho de cada columna
En la computadora, se arrastra el borde derecho del título de una columna para hacerla más angosta o más ancha; doble clic
en ese borde la devuelve a su ancho automático, y «Restaurar el ancho de las columnas» (Ajustes › Columnas en pantalla)
las devuelve todas. Se guarda en el proyecto: todo el equipo ve el stripboard igual (solo quien edita lo cambia). Con
una columna angosta, el texto se corta con «…» y se lee entero al pasar el mouse. Se deshace con Ctrl+Z. El teléfono,
el PDF y el Excel no cambian. Detalle en [CAMBIOS-lote-Y-columnas.md](CAMBIOS-lote-Y-columnas.md).

## 3. La hoja de llamado al estilo Apple (pantalla y PDF), con la misma estructura
- Los mismos bloques, en el mismo orden y con los mismos datos. Cambia la forma:
  - **Letras:** una sola escala con siete tamaños (etiqueta 11,5 · nota 12,5 · texto 13,5 · sección 17 · fecha 19 ·
    título 26 · llamado general 56 px) y todo en la letra de la app.
  - **Grises y etiquetas:** tres tonos de gris salidos de la tinta (texto, secundario y etiqueta). Las etiquetas van en
    minúsculas, ya no en MAYÚSCULAS espaciadas, y sin cursivas en los ejemplos de los campos vacíos.
  - **Líneas:** finas entre filas y una más clara entre los planos de una escena. Debajo del título de cada sección,
    una regla fina de tinta.
  - **Márgenes y detalles:** márgenes y espacios parejos (más aire alrededor de cada bloque), los campos de la cabecera
    alineados con su etiqueta, y el número del plano sin recuadro. El número del personaje en la tabla de personas ya
    no va en un círculo.
- El PDF usa la misma escala: cada tamaño de la pantalla por 8,6/13,5 (el texto de 13,5 px sale en 8,6 pt), así todo
  guarda entre sí lo mismo que en la pantalla. Lleva los mismos grises, las mismas líneas, las etiquetas en minúsculas y
  la letra de la app en los títulos (antes, otra letra). También:
  - los títulos de las tablas, sin fondo de color;
  - la nota en su recuadro amarillo de esquinas redondeadas;
  - las etiquetas en gris y los valores en negrita, como en la pantalla («Máx. **30°**», «Listos motor **07:00**»);
  - las escenas de cada personaje debajo de su nombre;
  - en las páginas siguientes, una línea fina con el proyecto en lugar de la barra de color.
- El nombre del proyecto, si es largo, se achica para entrar en la columna del centro del PDF.
- Igual en el modo oscuro y en el teléfono.

## Pruebas
- Nuevas: `test/lote-y.test.js` (el clima con su unidad y la escala del PDF proporcional a la de la pantalla) y
  `test/columnas-y.test.js` (el ancho de las columnas).
  `test/pdf-diseno.test.js` ahora espera las etiquetas en minúsculas.
- Todas las pruebas de la app pasan, salvo `test/pdf.test.js`, que ya fallaba antes (le falta el módulo canvas).
- En el navegador: la hoja de llamado en la computadora (claro y oscuro) y en el teléfono, y su PDF (dos páginas), sin
  errores.
