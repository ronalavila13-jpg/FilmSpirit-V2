# Lote AH · vista previa de los PDF, plan de rodaje, hoja de llamado e historial (27-oct-2026)

Base: lote AG. Las observaciones de Ronald del 27-oct, hechas en cuatro frentes en paralelo y unidas en la rama `lote-ah`.
El detalle de cada frente (cómo se usa, decisiones, archivos y pruebas) está en su propia nota:

- [CAMBIOS-lote-AH-pdf.md](CAMBIOS-lote-AH-pdf.md): vista previa antes de exportar, imprimir directo, papel A4 o Carta, y
  todos los PDF de producción en cuadro, tipo Excel (sin encabezado ni pie de página, líneas negras, columnas claras)
- [CAMBIOS-lote-AH-plan.md](CAMBIOS-lote-AH-plan.md): el documento exportado se llama «Plan de rodaje», casilla de
  miniaturas del storyboard (y el arreglo de las miniaturas que no salían), «Tiempo aprox.»
- [CAMBIOS-lote-AH-llamado.md](CAMBIOS-lote-AH-llamado.md): los quince puntos de la hoja de llamado
- [CAMBIOS-lote-AH-historial.md](CAMBIOS-lote-AH-historial.md): historial por pestaña y deshacer un cambio suelto

**Cómo aplicarlo.** En la VPS, como siempre:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Viene sin los maniquíes 3D (el actualizador conserva los instalados). No hay variables nuevas ni migraciones de la base
de datos: todo lo nuevo de la hoja de llamado se guarda dentro de cada proyecto, y los proyectos de antes se abren igual.
Después de instalar, recarga con Ctrl+F5 si todavía ves la versión anterior.

## Lo que se decidió con Ronald
- **Fecha de la hoja de llamado:** al cambiarla, quien edita elige cada vez entre «Solo esta hoja» (el plan y el
  calendario no se tocan; «Volver a la fecha del plan») y «Correr esta jornada y las siguientes» (se corren en el plan y
  el calendario).
- **Estilo en cuadro:** en todos los PDF de producción. El guion conserva su formato de guion.
- **Jefes de área:** en un recuadro propio bajo la cabecera de la hoja de llamado, con su teléfono.
- **Columnas claras:** líneas negras entre columnas en las tablas, tipo Excel.

## Cómo se leyó lo demás (dilo si no es así)
- La **utilería especial** y el **centro de salud con los canales de radio** no se borran: bajan a cuadros al final de la
  hoja de llamado (la cabecera y el pie quedan limpios).
- El **número de página** de los PDF va dentro del cuadro de arriba («Página 1 de 2»), ya que el pie se quitó.
- **Ctrl+Z** deshace lo último de la pestaña en la que estás (antes, lo último de cualquier pestaña).
- La **casilla de miniaturas** del plan está en el menú Exportar (no ocupa lugar en la pantalla) y se guarda con el
  proyecto; las miniaturas de la pantalla del stripboard siguen siendo una preferencia de cada persona.
- **Correr las fechas** desde la hoja de llamado corre todas las jornadas siguientes, también las de otras etapas.

## Pruebas
App: todas pasan (51) salvo `test/pdf.test.js`, que ya fallaba antes (le falta el módulo canvas). Servidor: 20 de 20.
Pruebas nuevas: `test/pdf-ah.test.js`, `test/plan-ah.test.js`, `test/llamado-ah.test.js`, `test/historial-ah.test.js`.
Recorrido en el navegador con todo unido: hoja de llamado en pantalla y en PDF (Carta y A4), plan de rodaje con
miniaturas, desglose, presupuesto con la vista previa, historial en varias pestañas; computadora y celular, claro y oscuro.
