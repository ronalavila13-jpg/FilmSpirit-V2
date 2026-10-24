# FilmSpirit · lote B de la revisión thermos (22 de octubre de 2026): el servidor

Este ZIP trae solo los archivos nuevos o modificados. Descomprímelo **encima** de tu carpeta `octavos/`, **después del
lote A**. Casi todo es del servidor: para la VPS usa `filmspirit-servidor.zip`, que ya trae los lotes A y B.

En la VPS: `cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.

## Qué se arregló

### A6. El respaldo diario ya no se rompe con una base grande ni llena el disco
- **Ahora comprime por partes.** Antes leía la base entera en memoria, y Node no puede leer archivos de más de 2 GB.
  Como las imágenes van dentro de la base, se iba a llegar ahí. Desde ese día:
  - cada respaldo habría fallado y dejado una copia temporal del tamaño de la base;
  - el disco se habría llenado sin aviso.
- **Si un respaldo se corta,** su copia temporal se borra siempre, y la próxima vez se limpian las que hayan quedado.
- **Si falla,** termina con error, así queda en el registro del sistema (`journalctl -u filmspirit-respaldo`).

### M3. Dos guardados casi a la vez ya no pierden uno
Antes, el servidor leía la versión guardada antes de recibir el cuerpo del pedido. Si otra persona guardaba en ese
momento, los dos recibían «listo» y uno se perdía, también del historial.

Ahora primero recibe el cuerpo y luego compara y guarda sin esperas en medio. El segundo recibe «Otra persona guardó
antes» y la app fusiona y vuelve a guardar, como ya hacía con los demás conflictos.

### M4. Los pagos no se pueden activar esquivando las comprobaciones
- **Pagos que quedaron a medias:**
  - **Se cancelan también en Mercado Pago o Paddle** cuando se descartan, sea a los 7 días o porque se activó otro
    pago. Antes solo se marcaban aquí y en el medio de pago se podían completar después.
  - **Si igual se completan,** se activan con las mismas comprobaciones del primer pago. El mes gratis no se repite
    con el mismo pagador, la prueba queda usada y el código cuenta.
- **Paddle:** el precio con prueba de 30 días solo vale si la prueba se ofreció en ese pago. Si alguien arma el pago
  por su cuenta con el precio de prueba, la suscripción se cancela al instante y no se activa. El registro lo anota
  como `paddle_trial_denied`.

### M5. El espacio de la cuenta cuenta lo eliminado hasta que se borra del todo
Antes, crear y eliminar proyectos en ciclo esquivaba la cuota y podía llenar el disco, porque lo eliminado se guarda
30 días sin contar. Ahora cuenta mientras se guarda.

El aviso de espacio lleno lo dice: «Lo que eliminas sigue ocupando espacio 30 días.» Además, una cuenta puede crear
hasta 60 proyectos por hora.

### M6. Una cuenta ya no puede trabar el servidor
- **Espacio de la cuenta:** se recalcula a lo más una vez por minuto, y entre medio se suma lo que crece. Antes cada
  guardado sumaba de nuevo todo lo de la cuenta, y con mucho texto eso tardaba.
- **Lecturas pesadas:** el proyecto entero, una sección y las imágenes tienen un tope de 1,5 GB por persona cada 5
  minutos. Un uso normal no llega ni cerca.

### Límites y registro
- **«Ya pagué» y «Cancelar»:** tienen un tope por persona: 30 y 10 cada 10 minutos. Cada uno consulta al medio de pago
  con la clave de la tienda.
- **Avisos de pago con firma falsa:** se cuentan y se anota una fila por medio de pago por hora, con cuántos llegaron y
  de qué IP. Antes era una fila por intento y podían llenar el registro y tapar lo importante.

## Pruebas nuevas

- `server/test/robustez.test.js`: guardados casi a la vez, cuota con proyectos eliminados y el tope de «Ya pagué».
- `server/test/billing.test.js`: un pago a medias descartado se cancela en Mercado Pago y, si se completa igual, no
  regala otro mes.
- `server/test/paddle.test.js`: la prueba no ofrecida no se activa, y las firmas falsas no llenan el registro.

Cada prueba nueva falla con el código de antes y pasa con el de ahora.

## Probado

- **Servidor:** pasan las 62 pruebas (56 de antes y 6 nuevas).
- **Respaldo:** se probó con una copia de la base de prueba y limpió las copias temporales que quedaban.
- **App contra el servidor nuevo:** se repitió la prueba del lote A (cambiar de proyecto mientras se guarda y las copias
  sin conexión) y funciona igual.

## Archivos

`server/`:
- **Código:** `lib/api.js`, `lib/billing.js`, `tools/respaldo.js`
- **Pruebas:** `test/robustez.test.js`, `test/billing.test.js`, `test/paddle.test.js`

`i18n/`: `en-manual.json` (el aviso de espacio lleno, en inglés)

Raíz: `CAMBIOS-lote-B-2026-10-22.md`
