# Lote X · dos observaciones del 26-oct-2026

Base: lote W (que trae los lotes T, U, V y el lote V · rendimiento). Rama `lote-x`.

**Cómo aplicarlo.** El `filmspirit-servidor.zip` de este lote trae todo lo anterior (T, U, V, V · rendimiento y W) más
estos arreglos. En la VPS, como siempre:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Viene sin los maniquíes 3D (el actualizador conserva los instalados). No hay variables ni migraciones nuevas en este
lote; si el lote W todavía no se instaló, se aplican solas las migraciones 10 y 11 (con respaldo antes).

## 1. Hoja de llamado: datos recortados
- **El llamado general** («07:00» salía como «07:0C»): el campo de la hora grande crece con lo que tiene, con cualquier
  letra que use la computadora, y «del plan» pasa debajo si no cabe al lado. En navegadores viejos, el campo es más
  ancho que antes.
- **Los títulos de las columnas de los planos** («PERSONAJ…»): la columna de personajes es más ancha y los títulos ya no
  se cortan con «…»; si no caben, pasan a la línea siguiente.
- **La sinopsis de cada escena** salía cortada con «…»: en la hoja de llamado (pantalla, PDF y Excel, y también en el
  avance) sale entera hasta unas dos líneas; si la acción es más larga, se corta al final de una oración. La sinopsis
  escrita a mano en el desglose sale siempre entera. En el resto de la app sigue corta, como antes.
- Revisada la hoja entera en la computadora (1024 a 1366 px), en el teléfono y en el PDF: nada más sale recortado. La
  raya junto a «PÁGS.» no apareció en ninguna de esas pruebas; si sigue viéndose, una captura con el navegador y el
  zoom ayuda a ubicarla.

## 2. Stripboard: el reparto sin círculos
- La columna Reparto muestra los números simples, separados por comas («1, 2, 3, 5»), en la pantalla (computadora y
  teléfono) y en el PDF del stripboard. Al pasar el mouse por un número se ve el personaje. El Excel ya los ponía así.
  El modo «Por nombre» no cambia.

## Pruebas
- Nueva: `test/lote-x.test.js` (la sinopsis larga con su corte en una oración y el reparto en números simples).
- Todas las pruebas de la app pasan, salvo `test/pdf.test.js`, que ya fallaba antes (le falta el módulo canvas).
- En el navegador: la hoja de llamado en 1024, 1180 y 1366 px y en el teléfono, sin recortes ni errores; el llamado
  medido también con otras tres letras; el PDF de la hoja y el del stripboard.
