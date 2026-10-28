# Lote AB · los cuatro errores de la revisión «thermos» (26-oct-2026)

Base: lote AA (que trae los lotes T a AA). Rama `lote-ab`. Revisión de los lotes X a AA: sin problemas graves ni de
seguridad; estos cuatro errores chicos, ya corregidos.

**Cómo aplicarlo.** En la VPS, como siempre:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Viene sin los maniquíes 3D (el actualizador conserva los instalados). No hay variables ni migraciones nuevas.

1. **La versión de la hoja de llamado vuelve a notar los cambios en la sinopsis.** Desde el lote X la hoja imprime la
   sinopsis más larga, pero su «huella» (lo que decide si la hoja cambió desde que salió) seguía mirando solo los
   primeros 110 caracteres: una corrección más adelante en la acción no la dejaba vieja y al exportar salía otra vez
   con el mismo número. Ahora mira la sinopsis tal como sale impresa. Las hojas que ya salieron antes siguen contando
   como la misma si no cambió nada (no aparece un aviso de «quedó vieja» de más al actualizar); desde su próxima
   exportación usan la huella nueva.
2. **El stripboard ya no corta el contador de respuestas de las notas clavadas en una fila** (venía de la regla que
   corta el texto de las columnas angostas, lote Y).
3. **El zoom y la opacidad de las capas del editor 2D cambiados con las flechas del teclado** ahora se pueden deshacer
   y, al guardar, la viñeta del storyboard, el PDF y el animatic se vuelven a armar con el cambio. El deslizador
   conserva el foco, así que las flechas siguen funcionando después del primer paso.
4. **PDF de la hoja en inglés:** el catering ya no queda corrido de su etiqueta (el ancho se medía con el texto
   traducido dos veces) y, si la línea de «Listos motor · Almuerzo · Catering» no entra en la columna del centro,
   sigue en una segunda línea, centrada.

## Pruebas
- Nueva: `test/lote-ab.test.js`. Todas las pruebas de la app pasan, salvo `test/pdf.test.js`, que ya fallaba antes
  (le falta el módulo canvas). Las del servidor pasan todas.
- En el navegador: una acción larga cambiada después del carácter 150 deja la hoja vieja; una hoja exportada antes
  y sin cambios no; la nota clavada en el stripboard con su contador entero; el zoom con las flechas y deshacer; el
  PDF de la hoja en inglés con el catering en su lugar.
