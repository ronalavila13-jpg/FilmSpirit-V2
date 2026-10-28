# Lote AH · historial (27 de octubre de 2026)

Lo que pediste: **«Historial por pestaña y que se pueda deshacer algo individual»**.

## Qué cambia (para Ronald)

### El historial de la pestaña
- Arriba, junto a deshacer ↶ y rehacer ↷, hay un botón nuevo con un **reloj**. Abre el panel **«Historial»** a la
  derecha, igual que «Personalización»: el área de trabajo se corre (no se tapa) y se sigue viendo lo que se deshace.
  Se cierra con la ✕, con el mismo reloj o con **Esc**.
- El panel muestra **los cambios de la pestaña abierta, del más nuevo al más viejo**: qué se cambió, hace cuánto y un
  botón **Deshacer** en cada uno. Arriba, dos opciones: el nombre de la pestaña (Plan de rodaje, Presupuesto…) o
  **«Todas las pestañas»** (entonces cada cambio dice también de qué pestaña es). El panel recuerda cuál elegiste.
- Cada cambio se nombra para que se entienda. Si el cambio ya tenía nombre («Eliminar «Grúa»», «Quitar un vehículo»)
  se usa ese; si no, se arma con lo que cambió. Por ejemplo:
  - Plan: «Escena 4 a la jornada 2», «Nuevo orden en la jornada 1», «Jornada nueva», «Evento «Almuerzo» agregado»,
    «Escena 3: duración 45 min → 1 h», «Llamado general 07:00 → 06:00».
  - Hoja de llamado: «Jornada 2: llamado 07:00 → 06:30», «Jornada 1: llamado de Juan 07:00 → 06:15»,
    «Jornada 1: nota para el equipo», «Equipo: «Sonidista» agregado».
  - Desglose: «Linterna» (atrezzo) en la escena 3», «Revólver»: categoría atrezzo → armas», «Sugerencias confirmadas».
  - Presupuesto: «Cámara»: tarifa 150 → 200», «Línea nueva: «Grúa»», «Imprevistos (%) 10 → 15».
  - Storyboard, calendario, hoja de script y proyecto: «Plano 2.3: lente 24 → 35», «Tarea nueva: «Casting»»…
  - En las demás (Historia, Scouting, Casting…) dice honestamente dónde fue y cuánto: «Historia · 3 cambios».
  - Si en el mismo momento cambiaste más de una cosa, lo dice: «… y 2 cambios más».
- Lo que deshaces no desaparece: queda en su lugar, tachado, con **«Rehacer»**.
- En el **guion al escribir** y en el **animatic**, que tienen su propio deshacer, el panel lo explica en una línea
  («Al escribir, el guion tiene su propio deshacer: ↶ ↷ en su barra o Ctrl + Z»). Ahí puedes ver igual los cambios de
  todas las pestañas.
- **En el teléfono** el reloj no cabe en la barra de arriba: está en el menú «⋯» como **«Historial de cambios ·
  Deshacer algo de antes»**. Se abre como una hoja que sube hasta un poco más de la mitad, para que arriba se vea lo
  que se deshace. Funciona en modo oscuro y en inglés.
- El historial dura mientras el proyecto está abierto (como antes); el panel lo dice al pie.

### Deshacer algo de antes, aunque después hiciste otras cosas
- Ahora se puede deshacer **un cambio viejo aunque después hiciste otros en la misma pestaña**, mientras esos otros no
  hayan tocado **lo mismo**. Ejemplo: mueves la escena 4 a la jornada 2, después la escena 7 a la jornada 3 y cambias
  el llamado general: puedes deshacer solo lo de la escena 4 y lo demás queda.
- «Lo mismo» es el mismo dato: el llamado de la misma jornada, la tarifa de la misma línea, el mismo elemento del
  desglose, la misma escena del plan. Cambiar el almuerzo no choca con cambiar el llamado; mover la escena 7 no choca
  con mover la escena 4.
- Si algo posterior sí tocó lo mismo, **no se pisa**: ese cambio no se deshace (nada de él) y se avisa qué choca, por
  ejemplo «No se puede deshacer «Jornada 2: llamado 07:00 → 06:30»: lo volviste a cambiar después (Jornada 2: llamado
  06:30 → 06:00)». En el panel ese cambio aparece en gris, sin botón, con la razón debajo. Si deshaces primero el de
  después, el de antes vuelve a poder deshacerse.
- Lo que se borró y se devuelve vuelve **a su lugar**, junto al que tenía al lado (aunque después agregaste o moviste
  otros).
- **Ctrl + Z y los botones de arriba** deshacen **lo último de la pestaña abierta** (en el presupuesto, lo último del
  presupuesto; no lo de otra pestaña). Ctrl + Mayús + Z rehace lo último que deshiciste en esa pestaña.
- Las imágenes que se recuperan al deshacer (por ejemplo, al borrar un plano) y las versiones ya enviadas de la hoja
  de llamado siguen como antes: una hoja enviada no se «des-envía».
- Los cambios que llegan de tu equipo siguen sin deshacerse desde aquí y ahora solo dejan sin deshacer los tuyos que
  tocaban lo mismo (antes, cualquiera de la misma parte del proyecto).

### Más liviano
- Cada paso guarda solo lo que cambió, no la foto entera de esa parte del proyecto. Medido (caracteres que guarda un
  paso, ahora contra antes):

  | Cambio | Ejemplo | Proyecto grande (×40 escenas) |
  |---|---|---|
  | Llamado de una jornada | 44 contra 238 | 44 contra 308 |
  | Una escena a otra jornada | 64 contra 472 | 64 contra 10 872 |
  | Una tarifa del presupuesto | 30 contra 12 314 | 31 contra 73 239 |
  | Una marca del desglose | 125 contra 6 870 | 125 contra 290 642 |
  | La descripción de un plano | 82 contra 6 234 | 65 contra 254 563 |
  | Una línea del guion al escribir | 226 contra 6 348 | 234 contra 260 026 |

  Tomar un paso tarda 1 a 6 ms en el proyecto grande. Los topes de siempre (80 pasos, 24 millones de caracteres)
  ahora alcanzan para mucho más; si un cambio enorme pesara más en partes que entero, se guarda entero (nunca más
  pesado que antes).

## Decisiones que tomé al interpretar el pedido
- **Ctrl + Z por pestaña.** El encargo dice que Ctrl + Z «deshace lo último de la pestaña», pero el código de antes
  deshacía lo último de **cualquier** pestaña (y avisaba «… en Plan de rodaje»). Lo dejé por pestaña, como dice el
  encargo y la nota de la versión 1.2 («cada pestaña deshace lo suyo»); lo de otras pestañas está en «Todas las
  pestañas» del historial. Para que cada cambio quede en la pestaña donde se hizo, al cambiar de pestaña lo que estaba
  por anotarse se anota antes (una línea en `setTab`).
- **No se deshace a medias.** Si un cambio tiene partes que chocan, no se deshace ninguna: un paso es una acción
  (eliminar un plano quita el plano, sus tomas y sus dibujos juntos) y deshacer una parte podría dejar datos que no
  calzan (una toma sin su plano). Se avisa qué choca y, deshaciendo primero lo de después, se puede.
- **Mover cuenta como «lo mismo» solo para el mismo elemento.** Cada elemento de una lista recuerda a sus vecinos y su
  lugar tiene una «versión», como un dato más: mover la escena 7 no impide deshacer el movimiento de la escena 4, pero
  mover dos veces la escena 4 sí (primero se deshace el último). Al devolverla, vuelve justo después de la que tenía
  antes. En el plan, cuando no se sabe si se movió la escena o la jornada, se toma que se movió la escena.
- **Listas sin identidad.** Las que tienen elementos repetidos (por ejemplo, un guion con varios «CORTE A:») son una sola
  ruta, como pide el encargo; si son largas, el paso guarda solo el tramo que cambió y una huella de la lista entera, y
  solo se deshace si la lista sigue igual. Las que no tienen id pero ningún elemento repetido (los días de descanso, el
  registro del presupuesto) se comparan por contenido, para que agregar dos cosas seguidas no choque.
- **Rehacer suelto se guarda.** Antes, cualquier cambio nuevo borraba lo que se podía rehacer. Ahora lo deshecho queda
  en el historial con «Rehacer» mientras no choque (Ctrl + Mayús + Z, en cambio, no rehace lo deshecho antes de un
  cambio nuevo en esa pestaña, como en cualquier programa).
- **Panel en el teléfono a media altura, sin velo.** «Personalización» sube casi entera con un velo; el historial
  sube un poco más de la mitad y sin velo, para ver arriba el efecto de deshacer. El reloj va en el menú «⋯» porque en
  la barra del teléfono no cabe.
- **Un panel a la vez.** Abrir el historial cierra Notas y Personalización, y al revés.
- **La vista previa de los PDF (frente «pdf») manda.** Con la vista previa abierta, Ctrl + Z no deshace nada del
  proyecto (como con cualquier ventana) y Esc cierra solo la vista previa: el historial queda abierto detrás. Para eso
  el Esc del historial se escucha antes que el Esc general, que cerraba la ventana sin avisar y dejaba que el mismo Esc
  cerrara también el panel.

## Archivos
- `src/historial.js`: reescrito. Diferencias finas por ruta (`histDiff`, `histListDiff`, `histChanges`), revisión y
  aplicación por ruta (`histMiss`, `histPut`, `histListPut`), lugar con versión (`HIST.pos`), descripciones (`HD`,
  `histDescribe`, `histText`), deshacer y rehacer sueltos con aviso de choque (`histUndo(id)`, `histRedo(id)`,
  `histBlock`, `histWhy`), `histRemote` por ruta, `histFlush`, y el panel (`histPanel`, `histPanelClose`,
  `histPanelPaint`). Se mantienen `histNote`, `histSoon`, `histCapture`, `histQuiet`, `toastUndo`, `histPaint`,
  `HIST.label`, `TAB_NAME` (los usan otros archivos).
- `src/shell.html`: el botón `#histBtn` (reloj) dentro de `.tb-hist`, después de rehacer; CSS nuevo «(lote AH)
  Historial» (`.np.hp`, `.hp-*`) junto al de «Personalización».
- `src/barra.js` (`phoneMenu`): «Historial de cambios» en el menú del teléfono.
- `src/pestanas.js` (`setTab`): una línea, `histFlush()` antes de cambiar de pestaña.
- `src/leyenda.js` (`lookPanel`) y `src/notas.js` (`npOpen`): una línea cada uno, cierran el historial al abrirse.
- `i18n/en-manual.json`: bloque `// lote AH · historial`.
- `test/historial-ah.test.js`: nuevo.

## Pruebas
- `node test/historial-ah.test.js`: 29 pruebas (diferencias por ruta, listas con y sin id, deshacer suelto sin choque
  y con choque, desde otra pestaña, Ctrl + Z por pestaña, agregar/quitar/mover en listas con id, rehacer, pasos del
  guion al escribir, cambios del equipo, versiones enviadas de la hoja, imágenes, guion largo con repetidos, el peso de
  un paso, las descripciones, el cambio de pestaña y 600 historias al azar: nunca se traba, deshacer en orden inverso
  es exacto y nunca se pierde nada).
- Todas las de antes, ya unido con `lote-ah` (frentes «pdf» y «plan»): app 50 bien (solo falla `test/pdf.test.js`, que
  ya fallaba por el módulo canvas); servidor 20 archivos bien.
- En el navegador (proyecto de ejemplo, sin errores en la consola): cambios en plan, hoja de llamado (escribiendo en
  su campo), desglose y presupuesto (escribiendo en su campo); el historial de la pestaña y de todas; deshacer uno del
  medio (el de la hoja de llamado) y comprobar que lo de antes y lo de después quedó; choque en el presupuesto (la
  misma tarifa dos veces) y su aviso; Ctrl + Z y Ctrl + Mayús + Z; Ctrl + Z en otra pestaña; animatic y guion al
  escribir; un panel a la vez; Inicio sin margen; Esc; la vista previa de un PDF abierta con el historial (Ctrl + Z no
  deshace, Esc cierra solo la vista previa). En 1366 y 390 px, claro y oscuro, español e inglés.
- Capturas en `…/scratchpad/historial/capturas/`: `antes-barra-*.png` y `antes-plan-*.png` (antes), `despues-barra-1366`,
  `panel-plan-*`, `panel-todas-*`, `panel-deshecho-*` (1366 y 390, claro, oscuro e inglés), `choque-1366`,
  `choque-despues-1366`, `animatic-1366`, `menu-telefono-390`, `vista-previa-con-historial-1366`.
