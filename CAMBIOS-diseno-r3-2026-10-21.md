# FilmSpirit · lo que diagnosticó la crítica de diseño, corregido (21 de octubre de 2026, tercera entrega)

Este ZIP trae solo los archivos nuevos o modificados, con las mismas rutas del proyecto. Descomprímelo **encima** de tu
carpeta `octavos/`, después de las dos entregas anteriores del mismo día.

## Cómo aplicarlo

1. **Web (página interactiva):** `sh build.sh`, como siempre.
2. **Web con cuentas (VPS):** `node server/make.js`, sube `server/` y en la VPS `sudo bash deploy/actualizar.sh`.
   El servidor no cambia en esta entrega: basta con la app.
3. **Escritorio:** `cd desktop && node make.js`.

## Qué cambia

### Hoja de llamado: lista para enviar
- **Arriba de la hoja, un recuadro con lo que falta** para enviarla: la fecha, el llamado general, la dirección de
  citación, el centro de salud, quién hace a cada personaje y el equipo. Cada falta es un enlace que lleva a su campo.
  Los campos que faltan llevan una raya ámbar debajo.
- **El menú Exportar avisa antes**: dice qué falta y deja exportar igual. El aviso dice lo que de verdad imprime el
  PDF donde falta un dato: «-».
- **Versiones:**
  - cada PDF y cada Excel sale con su versión y su hora, por ejemplo «v2 · 21 oct 23:04»;
  - si nada cambió, se vuelve a exportar la misma versión;
  - si el plan, el equipo o la jornada cambian después de exportar, la hoja avisa en rojo que quedó vieja y ofrece «Enviar v3»;
  - si ese cambio se hace en otra pestaña, avisa una sola vez con «Ver la hoja»;
  - la versión no depende del idioma: la misma hoja es la misma versión en español y en inglés;
  - el ZIP del proyecto, un PDF de solo algunas páginas o una exportación de quien solo puede leer no estrenan número:
    llevan la última versión si la hoja no cambió, y ninguna si cambió (para que no circulen dos «v2» distintas);
  - «Deshacer» no borra que una hoja ya salió.
- **En la apariencia oscura,** las filas de escena de la hoja ya no se ven verde oliva: un velo leve y el color del día o
  de la noche entero en una franja a la izquierda.
- **En el teléfono**, el orden es fecha y llamado general, locación con su enlace al mapa, datos de la jornada y, al
  final, el clima. En la computadora se ve igual que antes.
- **«Enviar PDF»**: en el teléfono abre el menú de compartir del sistema (WhatsApp, correo…) con el PDF. Donde no se
  puede, lo descarga.
- **«Copiar resumen»** copia la fecha, el llamado, la locación con su mapa y el centro de salud, para pegarlos en el
  chat junto al PDF.
- **Una hora que no es hora** («25:99», «abc») ya no se guarda: el campo vuelve a lo que tenía y un aviso dice cómo
  escribirla. Antes pasaba tal cual a la hoja de llamado.
- **«Elegir…» del PDF** ya no dice «Todo»: dice «Esta jornada (1)» o «Todas las jornadas».
- **Ejemplos que ya no parecen datos:**
  - «Actor o actriz» pasó a «Sin asignar»;
  - «Soleado, lluvia…» pasó a «ej.: soleado»;
  - el llamado vacío dice «--:--» en vez de «07:00».
- **El equipo vacío** explica dónde se carga y tiene un enlace al directorio en Proyecto.

### Navegación
- **Arriba de cada pestaña, en la computadora, una franja con su etapa y sus pestañas.** Es la misma en todas: de Plan a
  Calendario es un clic. En el teléfono, el nombre de la pestaña abre un menú de sus hermanas.
- **Un clic en una etapa de la franja de la izquierda** lleva a la última pestaña que usaste en ella, sin abrir un menú.
  Con el teclado, la flecha abre la lista.
- **Atajos de teclado:**
  - **Ctrl + K** abre «Ir a…»: escribiendo aparecen las pestañas, los temas de la ayuda de todas las pestañas y los atajos;
  - **Alt + 1…5** va a cada etapa, y otra vez a su pestaña siguiente; así se llega a las 14 pestañas;
  - **Atajos de teclado** está en la Ayuda (y en Ctrl + K), con todos, por pestaña.
  - Alt + número no hace nada mientras escribes: en el Mac, Opción + 2 es la arroba;
  - Ctrl + K y Alt + número no saltan por encima de una ventana o un editor abierto (planta, accesorios, fotos, ficha);
  - en inglés, Ctrl + K encuentra también las palabras en inglés.
- **La jornada se comparte** entre la hoja de llamado y la hoja de script. En el plan de rodaje, el menú de cada jornada
  abre «su hoja de llamado» o «su hoja de script», y el de cada escena, «Llamado J1».
- **Proyecto (datos, logos y equipo)** se abre desde el título del proyecto, arriba. En el teléfono, desde «⋯».
- **«Construcción» ahora se llama «Historia»** (en inglés seguía siendo «Story»).
- **Lectores de pantalla:**
  - cada etapa dice adónde lleva;
  - cada vista tiene su título: proyecto · pestaña;
  - la página declara su idioma (español o inglés), para que se lea con la voz y las reglas correctas.
- **«Pestañas visibles»** sigue el orden de la franja, por etapa.
- **Los títulos van en orden** (h1 → h2 → h3) en las 14 pestañas, para quien navega por títulos con un lector de
  pantalla. Se ven igual que antes.
- **En tablet (de 761 a 1000 px),** Compartir y Proyectos quedan solo con su ícono: el título del proyecto se lee y el
  botón del idioma ya no queda cortado fuera de la pantalla.

### Color: solo el del oficio
- **Se retiró el pastel por pestaña** y el estilo «Color»: hay una sola maqueta para claro y oscuro. El color queda
  para lo que significa algo en un rodaje: día y noche, eventos, departamentos, fases y revisiones.
- **En la apariencia clara, las tiras del plan y las cabeceras de escena de la hoja de script** van en su color entero
  de día o de noche, como un stripboard. En la oscura siguen con el velo de siempre.
- **El calendario** perdió los pasteles por columna y por mes.
- **Los PDF y los Excel** salen con barras grises en lugar del color de la pestaña. Los colores de pestaña guardados
  en un proyecto no se borran: solo dejan de usarse.
- **Colores y temas:**
  - ya no tiene «Colores de cada pestaña»;
  - las barras pueden ser grises o blancas;
  - el tema de siempre se llama «Estándar».
- **La etapa elegida** se marca con el rojo de la marca. El logo usa el mismo rojo que el botón Nuevo, que no cambió.
- **El presupuesto** dibuja sus barras en tinta (antes, verde azulado y luego rojo).

### El marco, más callado
- **La leyenda de colores** se pliega en un botón «Leyenda» con sus colores (en todas las pantallas). Abierta se recuerda
  por pestaña.
- **Una sola ayuda:** el «?» de arriba abre «Cómo se usa [pestaña]», «Ir a…», los atajos, las preguntas frecuentes y
  soporte. La barra de cada pestaña ya no repite su «?». El idioma queda en el globo.
- **Scouting y Casting** tienen un solo botón rojo por vista: «+ Candidata» arriba (o en el estado vacío), y «Elegir»
  en gris en cada tarjeta.
- **Animatic:** las herramientas van en grupos, con nombre a la vista en pantallas anchas (Cortar, Imán, Título, Negro),
  y las cuatro pistas van juntas en un menú «Pistas».
- **Los avisos de ayuda** no aparecen uno por pestaña: después de uno, el siguiente espera unos minutos, y nunca quedan
  flotando sobre Inicio.
- **Los menús** cerca del borde derecho se alinean con su botón.
- **«Elegir…» del PDF** pone el foco en la opción marcada, no en otro campo (antes había dos marcos rojos a la vez). El
  anillo de foco de las opciones es redondo, como el control.
- **Las pestañas sin guion** dicen cuál son («Hoja de llamado · se arma con el guion») encima de «Escribe o importa tu
  guion». Inicio sin proyectos dice «Todavía no tienes proyectos.»
- **El foco de los campos** es un anillo rojo que se ve, también sobre las tiras amarillas. Las ventanas ya no se
  enmarcan en rojo al abrirse.
- **Los «+» para agregar** (en Citación, Proyecto…) van en gris y se oscurecen al pasar. El contador de Proyectos ya no
  es una burbuja roja de aviso.
- **Los encabezados de escena** van siempre en la letra del guion (también en la hoja de desglose). En la lista de
  escenas ocupan dos líneas como máximo.
- **Las fichas del plan** ya no alternan gris y blanco.
- **La imagen de Inicio** se muestra solo donde existe (en la web con cuentas). En la página suelta y en el escritorio
  ya no queda un recuadro vacío.

### El teléfono en el set (hoja de script)
- **La cabecera de la jornada** se pliega en una línea («Tarjeta A003 · Sonido S002 · Llamado 07:00») y se abre al tocarla.
- **«+ Toma» del plano que se está rodando** va fijo abajo, al alcance del pulgar. Muestra el número de la toma que
  viene y la última.
- **Con el dedo (y en cualquier pantalla angosta),** las tomas, «+ Toma», el «⋯» y la casilla de rodado miden 44 px.
- **Sin conexión,** una franja con palabras («Sin conexión: lo que anotes queda en este equipo…») además del punto
  del menú.
- **El resumen del plan y el de la hoja de script** muestran una sombra en el borde cuando hay más para deslizar.
- **La última toma, en la barra de abajo,** es un botón («T2 · OK»): un toque y se marca NG, OK o Buena, con su tarjeta
  y su nota.
- **Los avisos** aparecen encima de la barra de abajo, no tapados por ella. La franja «Sin conexión» no se vuelve a leer
  en voz alta cada vez que se guarda.
- **Al abrir la app** se cargan 3 tipografías en lugar de 7. Lora, IBM Plex Sans, Nunito y Comic Neue se bajan solo si
  alguien las elige o abre «Colores y temas».

### Plan de rodaje
- **Las columnas de notas vacías** (Notas técnicas, Observaciones) ceden su ancho a la escena: el encabezado entra en una
  línea. Cuando alguna fila tiene una nota, la columna vuelve a su ancho.
- **La sinopsis** va en la letra del guion sin itálica: la itálica queda para los textos de ejemplo de los campos.
- **«Fig.», «1/8» y «Pág.»** explican qué son al pasar el mouse. En el animatic, el tiempo explica «minutos : segundos :
  cuadros».

### Contraste y letra
- **Gris secundario y textos de ejemplo** a 4,5:1 o más en los dos temas:
  - claro: secundario #5F6977;
  - oscuro: secundario y ejemplos #A8A8A8.
  - El gris tenue ya no se usa para texto.
- **Los textos de ejemplo de los campos van en itálica:** se distinguen de lo escrito sin perder contraste.
- **Sobre las tiras de color,** los textos secundarios toman un poco del color de la tira, y la nota de una toma NG se
  lee.
- **Las descripciones de escena** suben a 12 px; las etiquetas del resumen del plan en el teléfono, también.
- **Los errores** («No se pudo…») duran más, tienen botón para cerrarlos y dicen qué hacer. El de generar el PDF tiene
  «Reintentar».
- **Medido con el detector de Impeccable** sobre las vistas reales, los hallazgos bajaron de 196 a 12, y los 12 son
  falsos positivos (los colores de las etiquetas sugeridas del desglose, la letra pareja de un documento denso como el
  guion y la hoja de llamado, y el nombre de un personaje repetido en el guion):
  - hoja de llamado: de 53 a 0; en oscuro, de 56 a 0;
  - plan de rodaje: de 15 a 0; en oscuro, de 38 a 0.

### Inglés
- Todo lo nuevo está traducido en `i18n/en-manual.json`.
- Además se tradujeron textos que seguían en español: las categorías al pasar el mouse sobre el guion rayado, el largo
  en octavos de la revisión del guion, «quién hace a…», «Todas las jornadas» y «Exportar: …» en Ctrl + K.

## La nota, antes y después

Una revisión independiente, con el mismo método de Impeccable (las 10 heurísticas de Nielsen, de 0 a 4), pasó de
**27/40 a 31/40** («Bueno»). Subieron consistencia, prevención de errores, flexibilidad y estética. Las dos revisiones
quedan en `.impeccable/critique/`.

## Lo que queda abierto (de la última revisión)

- **Tablas anchas en tablet y teléfono:** el plan, el cronograma de la hoja de llamado y el presupuesto se desplazan de
  lado, pero nada avisa que hay más columnas a la derecha.
- **El plan en la apariencia oscura:** día y noche se distinguen casi solo por la raya de la izquierda.
- **Dos cuentas de páginas:** el guion dice «3 págs.» (hojas) y el plan «2 1/8» (octavos).
- **Un proyecto nuevo** ya muestra un presupuesto de ejemplo (S/ 42,240) antes de tener guion.
- **La jornada activa** se comparte entre la hoja de llamado y la de script, todavía no con el plan ni el calendario.

## Archivos

`src/`:
- **Hoja de llamado:** `tab-call.js`, `pdf.js`, `pdf-rango.js`
- **Navegación y barras:** `barra.js`, `ui.js`, `historial.js`, `inicio.js`, `i18n.js`
- **Color:** `leyenda.js`, `tab-plan.js`, `tab-budget.js`
- **Teléfono:** `tab-sup.js`
- **Marco y mensajes:** `tab-animatic.js`, `tab-board.js`, `tab-breakdown.js`, `tab-scout.js`, `tab-casting.js`,
  `tab-project.js`, `tab-script.js`, `guion-revision.js`, `charphoto.js`, `floorplan.js`, `s2d-editor.js`
- **Estilos:** `shell.html` (además, sin las reglas del estilo Color: unos 15 KB menos)

`i18n/`: `en-manual.json`, `glosario-en.md`

Raíz: `CAMBIOS-diseno-r3-2026-10-21.md`, `.impeccable/critique/` (las dos revisiones, para ver la tendencia)
