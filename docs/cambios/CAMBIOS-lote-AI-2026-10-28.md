# Lote AI · hoja de script con REC, estilo Excel | Apple y Grafito sin tocar las etapas (28-oct-2026)

Base: lote AH (con el arreglo del total del presupuesto). Las observaciones de Ronald de la mañana del 28-oct, en dos
frentes en paralelo y un arreglo chico, unidos en la rama `lote-ai`. El detalle de cada parte está en su nota:

- [CAMBIOS-lote-AI-sup.md](CAMBIOS-lote-AI-sup.md): la hoja de script en el set. Botón **● REC** para el contador de la
  toma («+ Toma» la deja lista; REC graba y para), un solo MOS (la casilla «Plano MOS»), flechas **‹ ›** para pasar de
  plano sin marcarlo como rodado (en el celular también se desliza) y «✓ Rodado · siguiente» para lo que antes era
  «Siguiente plano».
- [CAMBIOS-lote-AI-estilo.md](CAMBIOS-lote-AI-estilo.md): botón **Excel | Apple** en la hoja de llamado y en el
  stripboard (en el celular, en el menú «⋯»). Cambia la pantalla y el PDF (y el DOOD con el plan); la estructura del lote
  AH se queda en los dos. Cada documento guarda su estilo en el proyecto. **Apple es el de entrada.**
- [CAMBIOS-lote-AI-grafito.md](CAMBIOS-lote-AI-grafito.md): con Grafito, la barra de las etapas y su menú se ven como en
  Vivos (cada etapa en su color, la elegida con la placa entera de su color).

**Cómo aplicarlo.** En la VPS, como siempre:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Sin variables ni migraciones nuevas; sin maniquíes 3D (el actualizador conserva los instalados). Trae también todo el
lote AH. Después, recarga con Ctrl+F5.

## Pruebas
App: todas pasan (55) salvo `test/pdf.test.js`, que ya fallaba (le falta el módulo canvas). Servidor: 20 de 20. Nuevas:
`test/sup-ai.test.js`, `test/estilo-ai.test.js`, `test/grafito-ai.test.js`. Recorrido con todo unido: la hoja de llamado en
Apple (de entrada) y en Excel, en pantalla y en PDF; el stripboard en Excel; la hoja de script con REC en computadora y
celular; Grafito.
