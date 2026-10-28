# Lote AI · hoja de script, «En cámara» (28 de octubre de 2026)

Lo que pediste: **«Que haya un botón de rec para iniciar el contador. MOS tiene dos activadores, borrar uno. Que se
pueda navegar entre planos sin necesidad de que se marquen como grabados.»**

## Qué cambia (para Ronald)

### REC para el cronómetro
- Junto al cronómetro de la toma hay un botón rojo **● REC**. Al tocarlo se anota la hora de la toma y arranca el
  contador. Mientras graba, el recuadro de la toma se pone con borde rojo, dice **● Rodando** y el mismo botón pasa a
  **■ Parar**: tócalo para pararlo (queda anotada la duración).
- **«+ Toma N»** ahora solo **deja la toma lista**: su número, la tarjeta y el sonido en uso, sin hora y sin contador.
  En la tarjeta y en la tabla esa toma dice **«Lista»**. Mientras haya una toma lista, «+ Toma» queda apagado (no
  agrega otra).
- En el set **basta con tocar REC**: si no hay una toma lista (o la última ya se grabó), REC crea la siguiente y
  arranca.
- **Buena / OK / NG** siguen parando el contador. Si se marca una toma lista sin haber tocado REC, queda grabada con
  la hora de ese momento.
- La toma que quedó lista y nunca se grabó **no cuenta** en el avance ni sale en los PDF (hoja de script, parte
  diario, reportes de cámara y sonido). Si pasas al siguiente plano con «✓ Rodado · siguiente», se quita sola (salvo
  que le hayas escrito una nota). En la carga rápida, la fila de papel con ese número la reemplaza.

### Un solo MOS
- En la tarjeta queda solo la casilla **«Plano MOS»** (en el set el MOS se decide por plano). Salió el botón «MOS» de
  la toma.
- Si alguna vez una toma suelta se grabó sin sonido, se marca en su ventana: toca la toma en la tabla → «MOS» junto a
  Sonido.

### Pasar de plano sin marcarlo
- En «En cámara», junto al número del plano, hay **‹ ›**: van al plano anterior o al siguiente de la jornada, rodados o
  no, en el orden de la jornada. **Solo cambian el plano en cámara**: no marcan nada como rodado ni paran el contador.
  Si el plano ya está rodado, la tarjeta lo dice (**✓ Rodado**).
- En el **celular**, además, se puede **deslizar la tarjeta** al costado: hacia la izquierda, el siguiente; hacia la
  derecha, el anterior. Las flechas son grandes para el dedo y nada tapa la tarjeta.
- El botón que marca el plano como rodado y pasa al siguiente sin rodar ahora se llama **«✓ Rodado · siguiente»**
  (en la tarjeta y en la barra de abajo del celular).
- Cuando todos los planos están rodados, **‹** vuelve al último.

Funciona en la computadora y en el celular, en claro y oscuro, y en inglés (REC, Stop, Ready, «✓ Done · next»).

## Lo que decidí al interpretar
- **REC va en el recuadro de la toma**, entre el número y el contador, también en el celular. En el celular la barra de
  abajo queda con «+ Toma» y «✓ Rodado · siguiente», como antes; no repetí REC ahí para no tener dos botones iguales.
- REC y «Rodando» usan el **rojo de grabar** (en la tabla también); «+ Toma» pasó a un botón suave para que lo
  principal sea REC.
- **‹ › no paran el contador**: si navegas con una toma corriendo, sigue corriendo (se ve «● Rodando» en la tabla) y
  se para al tocar REC o Buena/OK/NG, o al grabar en otro plano.
- En la computadora, al pasar de plano la tabla se acomoda para que se vea su fila.
- Quien no puede editar la hoja (solo lectura o sin permiso) no ve REC ni las flechas, igual que antes no podía poner
  otro plano en cámara.

## Archivos y pruebas
- `src/tab-sup.js`: REC (`supRec`), toma lista (`supTakeNew`, `supTakeAdd`, `supMarkTake`, `supRolled`, `rdy` en
  `supClean`), flechas (`supStepHTML`, acción `sup-step`, `supSwipe`), tarjeta y barra (`supCamHTML`,
  `supClockHTML`, `supMarkHTML`, `supPhoneHTML`, `supDockHTML`), carga rápida y ayuda.
- `src/sup-partes.js`: los PDF cuentan solo las tomas grabadas.
- `src/shell.html`: estilos de REC, «Lista», flechas y la barra del celular (CSS `.hs-*`).
- `i18n/en-manual.json`: bloque «// lote AI · sup».
- Pruebas: `test/sup-ai.test.js` (nueva, 15) y `test/script-ad.test.js` (una línea: carga `supRolled`).
