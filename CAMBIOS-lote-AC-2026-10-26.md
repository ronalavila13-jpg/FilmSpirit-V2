# Lote AC · orden del código (26-oct-2026)

Base: lote AB (que trae los lotes T a AB). Rama `lote-ac`. Es la segunda parte de las correcciones de la revisión
«thermos» de los lotes X a AA: ordenar el código para que los próximos cambios sean más fáciles y no se repitan
errores. **No cambia nada de lo que ves**, salvo dos detalles casi invisibles (al final).

**Cómo aplicarlo.** En la VPS, como siempre:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Viene sin los maniquíes 3D (el actualizador conserva los instalados). No hay variables ni migraciones nuevas.

## Qué se ordenó

1. **Estilo de la hoja de llamado en un solo lugar.** El estilo «Apple» del lote Y estaba escrito como un bloque
   aparte que pisaba las reglas de antes; ahora está fundido en las reglas de la hoja (una regla por cosa, no dos).
2. **Una sola tabla de tamaños de letra y de grises para la hoja**, que usan la pantalla y el PDF. Antes estaban
   escritos dos veces y podían separarse.
3. **Las escenas a todo color de la hoja usan las mismas reglas de color que el stripboard** (antes eran una copia).
   El color de cada escena se calcula una vez y lo usan la pantalla, el PDF y el Excel.
4. **El PDF de la hoja de llamado pasó a su propio archivo** (`pdf-llamado.js`), con las piezas que se repetían
   (pares de etiqueta y valor, títulos de sección) escritas una sola vez.
5. **El clima (máxima, mínima, humedad) en una sola lista** con su unidad, para la pantalla, el PDF y el Excel.
6. **La sinopsis de la hoja** se pide con una opción clara («cortar en el final de una frase») en lugar de una
   excepción escondida.
7. **Editor 2D:** una sola regla decide si se puede dibujar en una capa (oculta, bloqueada o con zoom) y una sola
   función cambia el zoom. Arreglo chico de paso: después de mover un deslizador con el mouse, las letras de las
   herramientas (V, L…) vuelven a funcionar enseguida; con las flechas del teclado el deslizador conserva el foco.
8. **Columnas del stripboard:** el código del ancho de las columnas pasó a su propio archivo (`plan-columnas.js`).
   Los anchos guardados se revisan una sola vez al abrir el proyecto (un valor raro se corrige ahí y no cada vez que
   se dibuja el tablero) y un solo lugar recibe el arrastre del asa.
9. **Pruebas:** un ayudante común para leer el código en las pruebas, en lugar de copiarlo en cada una.

## Detalles visibles (casi imperceptibles)

- La hora grande de la hoja usa números de ancho fijo (como el resto de la hoja): ~2 píxeles de diferencia.
- En las escenas a todo color de la hoja, los grises del texto secundario y la línea entre filas son exactamente los
  del stripboard.

## Pruebas
- Todas las pruebas de la app pasan, salvo `test/pdf.test.js`, que ya fallaba antes (le falta el módulo canvas).
  Las del servidor pasan todas.
- En el navegador, contra el lote AB: la hoja de llamado en español e inglés, clara y oscura, en computadora y en
  celular, con las mismas medidas; los PDF de la hoja idénticos píxel a píxel; escribir el clima; el zoom y el
  encuadre de las fotos del editor 2D, con el mouse y con el teclado, y deshacer; 59 capturas del stripboard
  (anchos automáticos y guardados, celular, arrastre de columnas y de filas, deshacer) iguales a las de antes.
