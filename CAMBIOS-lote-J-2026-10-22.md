# FilmSpirit · lote J (22 de octubre de 2026): Gastos

Mejora 5. Una pestaña nueva, **Gastos**, en Producción junto a Presupuesto: lo gastado de verdad contra lo
presupuestado. Solo en la **web con cuentas**, con **Pro y Studio**. No aparece en la página publicada ni en la app
de escritorio.

**Cómo aplicarlo.** Usa `filmspirit-servidor.zip` (el que arma el hilo principal con todos los lotes). En la VPS:

`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`

- **No hay migración de datos.** Los gastos van en una sección nueva del proyecto, `gastos`, que nace vacía la
  primera vez que alguien guarda algo. Los proyectos de antes no cambian.
- **No hay variables nuevas** en `/etc/filmspirit/filmspirit.env`.
- Las fotos de los recibos se guardan como las del desglose y cuentan en el espacio del plan.
- Free e Indie no tienen Gastos: el servidor responde «Gastos … es parte de FilmSpirit Pro y Studio».

## Qué cambió

### 1. Resumen
Cada partida del presupuesto con lo **presupuestado** (sin imprevistos ni impuesto), lo **comprometido** (órdenes y
reembolsos aprobados sin pagar), lo **gastado** y el **saldo**. Una barra fina: gris, ámbar desde el 90 % y roja al
pasarse. Arriba, cuatro cifras (presupuestado, comprometido, gastado con «jornada 2 de 5», disponible) y la lista de
partidas que se pasaron. Producción escribe el **motivo** de cada sobrecosto; va al reporte.

### 2. Órdenes de compra
- El número lo pone el servidor: OC-001, OC-002…
- Las que crea producción **nacen aprobadas**; las que pide un jefe de área quedan **en borrador** hasta que
  producción las apruebe.
- El jefe de área solo elige partidas de su área (arte: arte y transporte; vestuario: vestuario…); producción puede
  cambiarla.
- Pagar (con la fecha) y anular (con un motivo). Lo pagado no se edita.
- Cada orden lleva su foto (cotización o comprobante) si se quiere.

### 3. Caja chica y reembolsos
- **Una tarjeta por persona**: entregado, rendido y saldo en mano, con sus recibos (foto, comercio, qué se compró,
  partida, monto y tipo: boleta, factura, recibo por honorarios o sin comprobante).
- **Entregar dinero** a alguien del equipo (o a otra persona, por su nombre). Si ya tiene caja abierta, se suma ahí.
- **En el teléfono**, «Recibo (abre la cámara)»: se toma la foto y se completa el monto y la partida. La foto se
  achica a unos 250 kB.
- Producción y la jefatura **revisan** cada recibo; un recibo revisado ya no cambia (solo se anula con motivo).
- **Cerrar la caja** (producción, con todo revisado): lo que sobró se devuelve y lo gastado de más se le reembolsa.
  El saldo queda en cero.
- **Reembolsos**: un gasto o kilometraje (km × tarifa). El jefe de área lo pide; producción lo aprueba y lo paga.

### 4. Pagos
Todo lo que salió de producción, por fecha: órdenes pagadas **con su impuesto**, reembolsos pagados y la caja chica
(entregas, menos lo devuelto). Filtros por partida, persona o proveedor, y semana. En dólares si el presupuesto los usa.

### 5. Documentos
- **Orden de compra (PDF)**, para el proveedor: RUC, partida, forma de pago, monto con IGV, firmas.
- **Sobre de caja chica (PDF)**: entregas, recibos, sumas por partida, firmas y las fotos de los comprobantes.
- **Pagos (Excel)**, para el contador: lo de la vista Pagos y una hoja por partida.
- **Reporte de sobrecostos (PDF)**, en Exportar de Gastos y de Presupuesto: cada partida que se pasó, cuánto, el % y
  el motivo.

### 6. Columna «Gastado» en Presupuesto
Junto a cada partida y a cada línea, lo comprometido y gastado (solo producción). La cabecera de Presupuesto no se tocó.

### 7. Quién ve qué (lo decide el servidor)
Un permiso nuevo, **Gastos**, en Equipo y permisos.

| Quién | Ve | Hace |
|---|---|---|
| Producción y producción ejecutiva con «editar» | Todo | Crea, aprueba, paga, anula, entrega, revisa y cierra |
| Jefatura de producción con «editar» | Todo | Crea y aprueba órdenes, entrega dinero y revisa recibos |
| Producción con «ver» | Todo | Nada |
| Jefe de área con «editar» | Sus órdenes, su caja, sus reembolsos | Pide órdenes y reembolsos, rinde su caja |
| Los demás | Solo su caja chica, si tienen una | Rinden su caja |

- El servidor **recorta** lo que manda a cada persona: una asistente no recibe la caja de otra ni el presupuesto.
- El servidor **guarda solo lo permitido** y anota quién aprobó, pagó, revisó o anuló (no el navegador).
- Montos con dos decimales, fechas válidas, textos con largo máximo y topes por lista.
- Los avisos «Fulano aprobó OC-003» solo llegan a quien ve todo Gastos.
- Si el presupuesto está protegido con código, el Resumen y los Pagos también.

## Lo que queda para otra ronda y por qué
- **En la página publicada y en la app de escritorio** Gastos no está: pidieron empezar por la web con cuentas.
- **Los cinco idiomas:** está en español e inglés, como el resto de la app.
- **El jefe de área no paga ni cierra cajas:** solo producción, como dice el plan. Si se quiere, es un cambio de una línea.
- **Quien no es jefe de área no pide reembolsos:** producción los registra a su nombre.
- **Las órdenes cuentan sin IGV** contra el presupuesto (que suma el impuesto aparte); en Pagos y en el PDF, con IGV.
- **Qué partidas tiene cada área** sale de su cargo (tabla en `src/areas.js`, `GA_ROLE_SECS`). Revisarla con un caso real.
- **Las invitaciones pendientes** no salen en «Entregar dinero»: se entrega por nombre hasta que acepten.

## Pruebas
- **`server/test/gastos.test.js`** (nueva, 11 pruebas): solo Pro y Studio; numeración y aprobación de órdenes; el
  jefe de área no pide fuera de su partida; recorte por persona; quién aprueba, paga y anula; caja chica (no ve la de
  otra, no se revisa a sí misma, lo revisado no cambia, el cierre); reembolsos; fotos (quién las ve y sube, caja
  cerrada, espacio del plan); avisos con detalle solo a producción; limpieza de datos; el impuesto para quien no ve
  el presupuesto.
- **`test/gastos.test.js`** (nueva, 11): las partidas coinciden con el presupuesto; sumas por partida; caja chica;
  el cierre deja el saldo en cero; orden con IGV; pagos; el resumen y el reporte de sobrecostos.
- **`server/test/plans.test.js`:** el plan Studio trae Gastos.
- Pasan las 79 del servidor, las del programa (`test/*.test.js`), las del equipo (11 + 21) y `smoke.py` (español e
  inglés, computadora, tableta y teléfono, claro y oscuro: 0 errores).

En el navegador, con la web con cuentas local y cinco personas (producción, jefatura, dirección de arte, vestuario sin
permisos y producción ejecutiva con «ver»):
- órdenes, aprobación, pago y anulación; caja chica desde el teléfono con la cámara; revisión y cierre; reembolso de
  kilometraje; pagos con filtros;
- cada persona ve solo lo suyo; vestuario ve la pestaña solo cuando tiene caja;
- claro y oscuro, computadora y teléfono, español e inglés (sin textos sin traducir);
- los totales del PDF de la orden, del Excel de pagos, del reporte de sobrecostos y del sobre son los mismos de la
  pantalla, con IGV y en dólares;
- en la página publicada la pestaña no aparece.

## Archivos
- **Nuevos:** `src/tab-gastos.js`, `test/gastos.test.js`, `server/test/gastos.test.js`
- **Reglas (servidor y app):** `src/areas.js` (se copia a `server/areas.js` y `desktop/areas.js`)
- **Servidor:** `server/lib/api.js`, `lib/perm.js`, `lib/auth.js`, `lib/billing.js`, `test/plans.test.js`
- **App:** `src/core.js`, `src/share.js`, `src/tab-budget.js` (columna Gastado), `src/shell.html` (pestaña y estilos),
  `src/cuenta.js`, `src/notas.js`, `src/proyectos.js`, `build.sh`
- **Inglés:** `i18n/en-manual.json` (bloque «// lote J»), `i18n/hacer.js` (nombres de archivo)
- Raíz: `CAMBIOS-lote-J-2026-10-22.md`
