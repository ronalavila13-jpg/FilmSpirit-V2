# FilmSpirit · versión de escritorio (1.6.0)

Sitio web previsto: filmspirit.org o filmspiritstudio.com.

## Qué incluye la entrega

| Archivo | Para qué sirve |
|---|---|
| `FilmSpirit-Instalador-1.6.0.exe` | Instalador para Windows 10/11 de 64 bits. No pide permisos de administrador. Llega en 3 partes: ponlas en una carpeta con `unir-instalador.bat` y haz doble clic en el `.bat`. |
| `emisor-de-licencias.html` | Herramienta para generar claves de licencia. Funciona sin internet en cualquier navegador. |
| `filmspirit-clave-privada.json` | La clave con la que se firman las licencias. **Es secreta: no la compartas ni la subas a internet.** |
| `filmspirit-codigo-fuente.zip` | El código del programa, para modificarlo y volver a compilarlo. |

## Instalación

1. Ejecuta el instalador.
2. Mientras el instalador no tenga firma digital, Windows mostrará «Windows protegió su PC». Haz clic en **Más información** y luego en **Ejecutar de todas formas**. El aviso desaparece con un certificado de firma de código (ver «Pendientes»).
3. El instalador crea accesos directos en el escritorio y en el menú Inicio. Además, los archivos `.fsp` (y los `.fmst` de versiones anteriores) quedan asociados al programa: al hacer doble clic se abren con él.

## Guardado

- **Ubicación:** cada proyecto es un archivo `.fsp` dentro de `Documentos\FilmSpirit`. Los `.fmst` de versiones anteriores se siguen listando, abriendo y respaldando; si el proyecto tiene nombre automático, al cambiarle el título su archivo pasa a `.fsp`.
- **Cuándo se guarda:** casi medio segundo después de cada cambio, sin necesidad de pulsar nada. Ctrl+S fuerza el guardado.
- **Cierre:** si cierras la ventana con un plano abierto en el editor de storyboard, ese plano también se guarda.
- **Escritura segura:** primero se escribe un archivo temporal y luego reemplaza al anterior. Así un corte de luz no deja el proyecto a medio escribir.
- **Respaldos:** se hace uno cada 10 minutos de trabajo en `Documentos\FilmSpirit\Respaldos`, y se conservan los 15 más recientes de cada proyecto.
- **Recuperación:** si el archivo de un proyecto aparece dañado, el programa abre el último respaldo y aparta el archivo dañado.
- **Menú Archivo:** abrir proyecto, guardar como (para llevarlo a otra carpeta o a una memoria USB), mostrar el archivo en la carpeta y abrir la carpeta de respaldos.
- **Menú del proyecto** (el nombre, arriba): *Abrir*, *Guardar .fsp* (guardar como) y *Descargar ZIP*; debajo, mostrar el archivo en la carpeta y mover a la papelera.
- **Desinstalar:** no borra los proyectos.
- **Abrir y crear:** arriba, *Nuevo proyecto* crea uno vacío y lleva a la pestaña Proyecto, donde está *Importar guion*. *Abrir proyecto* lista los proyectos y permite abrir un archivo `.fsp` (o un `.fmst` o una copia `.json` de versiones anteriores). *Compartir* abre el trabajo en equipo.
- **Versión web:** las copias se descargan también como archivo `.fsp`, el mismo formato del escritorio. Con FilmSpirit para Windows instalado, ese archivo se abre con doble clic; en la página web se abre con *Abrir proyecto*.


## Trabajo en equipo (proyectos compartidos)

Cada persona trabaja en su propia computadora. El proyecto se guarda en una carpeta compartida de **Google Drive, OneDrive o Dropbox**, sincronizada en cada equipo. No hace falta servidor ni pagar mensualidad.

### Cómo comparte el productor

1. Abre el proyecto y entra a *menú del proyecto › Compartir con el equipo…*.
2. Escribe tu nombre y tu contraseña de productor, y elige una carpeta dentro de Drive, OneDrive o Dropbox.
3. Anota el **código de recuperación** que aparece. Es la única forma de recuperar el control si olvidas tu contraseña.
4. Entra a **Equipo y permisos** y agrega a cada persona. Hay permisos sugeridos por cargo: producción, producción ejecutiva, dirección, asistencia de dirección, jefatura de producción, fotografía, arte, vestuario, sonido, efectos especiales, casting, script y montaje. El cargo se puede cambiar después en la misma tabla. En cada pestaña puedes elegir **—**, **Ver** o **Editar**. En **Desglose**, «Editar» puede limitarse a sus **áreas** (ver abajo).
   Calendario y Hoja de llamado vienen en «Ver» para casi todos los cargos; producción, jefatura de producción y asistencia de dirección pueden editarlas. Quien ve la hoja de llamado recibe también el plan de rodaje (solo lectura), porque la hoja sale de él; el presupuesto sigue siendo solo de producción. En los proyectos compartidos con una versión anterior, estas pestañas aparecen cuando el productor abre el proyecto y asigna los permisos.
5. Copia la invitación de cada persona (incluye su contraseña) y envíasela por un canal privado.
6. Comparte la carpeta con esas personas desde Google Drive, OneDrive o Dropbox.

### Áreas del desglose (jefes de área)

En el desglose, cada jefe de área puede editar solo sus cajas de la hoja de desglose y ver las demás. Al elegir **Editar** en la columna Desglose aparece el botón de áreas: Personajes/Reparto, Equipo especial, Efectos especiales, Figuración, Atrezzo, Vestuario y Peluquería, Vehículos y/o animales, Efectos de sonido y Notas.

- **Cargos con áreas sugeridas:** Arte edita Atrezzo y Vehículos; Vestuario y maquillaje, Vestuario y Peluquería; Sonido, Efectos de sonido; Efectos especiales, Efectos especiales y Equipo especial; Casting, Reparto y Figuración.
- **En pantalla:** sus cajas tienen «Añadir…»; las demás dicen «solo lectura». Al marcar elementos en el guion, solo aparecen sus categorías.
- **Decorado, descripción y productora:** los edita solo quien tiene el desglose completo.
- **Si cambia algo fuera de sus áreas:** su cambio se deshace con un aviso y no se guarda. Si alguien fabrica un archivo con cambios ajenos a sus áreas, los demás lo ignoran y el productor lo repara, igual que con las pestañas.

### Presupuesto: solo producción

- **Quién lo recibe:** el productor que administra el equipo y quien tenga un cargo de producción (Producción, Producción ejecutiva o Jefatura de producción), con permiso de ver o de editar. A los demás cargos no se les puede dar el presupuesto: la columna dice «Solo producción».
- **Código de 4 dígitos:** cada persona de producción crea su propio código la primera vez que abre el presupuesto en su equipo, y lo escribe cada vez que lo abre. El botón **Bloquear** lo cierra al momento.
- **Registro de cambios:** cada cambio queda con el nombre de quien lo hizo y la hora (en *Acceso y registro de cambios*, al final del presupuesto).
- **Código olvidado:** sal del proyecto desde el menú del equipo y vuelve a entrar con tu contraseña; al abrir el presupuesto crearás un código nuevo.

### Guion final cerrado
- **Quién lo cierra:** el productor que administra el equipo o un cargo de producción con permiso para editar el guion (Guion › Ajustes → «Cerrar el guion final…»), con su código de 4 dígitos. Se muestra una vez un código de recuperación.
- **Quién lo revisa:** las personas que producción marque (por defecto producción, guion y dirección). En el equipo de escritorio, cada una necesita permiso para **editar** el guion en *Equipo y permisos*; crea su código la primera vez que abre una revisión.
- **Qué comprueba el equipo:** con el guion cerrado, el texto solo cambia en una revisión abierta y por una persona autorizada; cambiar quién revisa o reabrirlo, solo producción. Un cambio que no cumple se rechaza al recibirlo, igual que con las áreas del desglose.

### Cómo entra el equipo

1. Instala FilmSpirit y espera a que la carpeta compartida se sincronice en su computadora.
2. Abre el archivo `.fmst` de esa carpeta (los proyectos compartidos conservan esa extensión).
3. Elige su nombre y escribe su contraseña. Solo verá las pestañas que tiene asignadas.

### Qué protege

- **Cifrado por pestaña:** cada pestaña se cifra con su propia llave (AES-256). Si alguien copia la carpeta, no puede leer el presupuesto ni el plan sin la contraseña de una persona que tenga ese permiso.
- **Datos que no se cuelan:** quien no tiene el plan tampoco ve la jornada ni la fecha de rodaje en las hojas de desglose.
- **Edición firmada:** cada cambio va firmado por quien lo hizo, y la firma vale solo para esa pestaña. Si alguien sin permiso de edición altera un archivo (o copia uno de otra pestaña encima), los demás lo ignoran y el productor lo repara automáticamente.
- **Sin vuelta atrás:** no se aceptan versiones anteriores de una pestaña ni una copia vieja del proyecto restaurada en la carpeta (así nadie puede deshacer una baja del equipo). Si ves el aviso «la carpeta tiene una copia anterior del proyecto», recupera la última versión desde el historial de versiones de Drive, OneDrive o Dropbox.
- **Contraseña de producción:** al menos 12 caracteres, con letras y números: protege a todo el equipo. Las contraseñas se guardan con scrypt (2^17); las de versiones anteriores se vuelven a proteger solas al entrar.
- **Quitar o restringir a alguien:** se cambian las cerraduras de lo que esa persona podía leer. La persona deja de recibir actualizaciones, aunque conserva lo que ya vio antes.
- **«Nueva contraseña»:** invalida la contraseña anterior de esa persona.
- **Contraseña propia:** cada persona puede cambiar la suya con el botón que lleva su nombre.

### En la versión web (página publicada en Claude)

La versión web también comparte proyectos, con los mismos permisos por pestaña y por área. No usa carpeta ni contraseñas: cada persona entra con su cuenta de Claude.

1. El dueño de la página abre el proyecto y entra a *menú del proyecto › Compartir con el equipo…*.
2. Comparte la página con cada persona desde el botón **Compartir** de Claude. Para editar, una persona de tu organización necesita al menos permiso de colaborador. Si es de fuera, invítala como editor. Con permiso de lector solo puede ver.
3. En **Equipo y permisos**, búscala por nombre (personas de tu organización). Si es de fuera, ella abre la página y toca *Pedir acceso a un proyecto…*, y su pedido aparece ahí para agregarla con su cargo.

- **Solo el dueño de la página administra los equipos:** la base de datos de la página no deja que nadie más cambie los permisos.
- **Diferencia con escritorio:** aquí los datos no van cifrados por pestaña. Los permisos los aplica el programa, así que comparte la página solo con tu equipo. Para presupuestos confidenciales, usa la versión de escritorio.

### Cómo se combinan los cambios

- **Sincronización:** los cambios de los demás llegan a los pocos segundos de que la carpeta se sincroniza.
- **Si dos personas editan a la vez:** se combinan sus cambios, salvo que hayan tocado exactamente el mismo dato. En ese caso queda el más reciente.
- **Para tener en cuenta:**
  - Para trabajar juntos, todos necesitan internet.
  - Sin internet se puede seguir trabajando, y los cambios se envían al volver la conexión.
  - Solo el productor puede actualizar el guion importando una versión nueva.

### Ediciones en equipo

- **Compartir:** es parte de FilmSpirit Pro, también durante la prueba.
- **Entrar a un proyecto compartido:** funciona con FilmSpirit Free.
- **PDF:** los de un proyecto compartido salen sin marca de agua.
- **Límite de Free:** los proyectos compartidos no cuentan para el límite de 1 proyecto.

## Pestañas nuevas y cambios (versión de octubre de 2026)

### Fase 1 de la web app (en preparación)

- **Importar guiones en PDF:** *Importar guion* acepta el PDF que exportan Final Draft, Celtx, WriterDuet, Fade In o Highland. El programa reconoce encabezados, acción, personajes, diálogos, acotaciones y transiciones por su sangría, y quita números de página, «(MÁS)» y «(CONT.)». Un PDF escaneado (fotos de las páginas) no tiene texto: el programa lo avisa. Es una función de Pro; en el plan gratuito se importan FDX y Fountain.
- **Fotos del desglose en WebP:** se guardan a 1200 px por el lado mayor y calidad 90 (unos 175 kB); si una pasa de 250 kB, baja a 85 y luego a 80. En los PDF se insertan como JPEG. Safari guarda JPEG hasta que el servidor las convierta.
- **Mover jornadas:** en el plan de rodaje, arrastra una jornada por el asa ⠿ de su fecha, o usa *Opciones › Subir / Bajar jornada*. La fecha fijada a mano viaja con la jornada, las automáticas siguen el nuevo orden, cada jornada conserva su etapa y su hoja de llamado va con ella.
- **Cronograma estilo Trello:**
  - *Dos vistas:* *Línea de tiempo* (las barras se ven como tarjetas, con iniciales del responsable y avance de pendientes) y *Tablero*, con columnas por fase o por estado (por hacer, en curso, hechas). Las tarjetas se arrastran entre columnas.
  - *La tarea se abre como tarjeta:* etiqueta de color, área, responsable, fechas, lista de pendientes con su avance, notas y «Hecha».
  - *Moverse:* mantener presionado el clic y arrastrar mueve la línea de tiempo con la mano.
  - *Encuadrar:* solo un clic en el nombre de la tarea encuadra su tiempo; el lápiz junto al nombre o un clic en la barra la abren.
  - *Crear:* se dibuja en la fila «+ Nueva tarea»; Alt + arrastrar en la línea de una tarea le suma otra fecha.
  - *Barra más simple:* sin Día, Semana, Mes ni Rodaje. El zoom los reemplaza, un día se abre tocando su fecha y «Contraer todo» pasó a la esquina de la tabla.

### Novedades (1.6.0)

- **Botones de proyecto:** *Importar guion* dejó la barra de arriba. En su lugar están **Compartir**, **Abrir proyecto** y **Nuevo proyecto**. El proyecto nuevo se abre en la pestaña Proyecto, con una tarjeta grande «Importa el guion para empezar»; el guion importado se usa en ese mismo proyecto.
- **Copias `.fmst`:** el proyecto y sus copias se guardan como archivo `.fmst` con el ícono de FilmSpirit, en web y en escritorio (antes la web descargaba `.json`). Las copias `.json` viejas se siguen abriendo. *(Desde la versión siguiente el formato es `.fsp`; los `.fmst` se siguen abriendo.)*
- **Calendario sin teclear fechas:**
  - *Dibujar tareas:* en la fila vacía al final de cada fase, arrastra sobre los días para crear una tarea con esas fechas; en la línea de una tarea, arrastra en un espacio vacío para sumarle otras fechas.
  - *Varias fechas en una tarea:* por ejemplo, casting en dos tandas. Doble clic en la línea agrega un día suelto. En el editor de la tarea, *+ Otra fecha* y ✕ por fecha.
  - *Encuadrar:* un clic en el espacio vacío de una tarea, una fase o el rodaje ajusta el zoom para ver justo ese tiempo.
  - *Zoom:* barras ↔ (ancho de los días) y ↕ (alto de las filas), *Ver todo*, y Ctrl + rueda acerca donde está el puntero.
  - *Meses:* las etiquetas ya no se montan; con poco espacio se abrevian («Sep 26», «Sep»).
- **Animatic más grande:**
  - *Alto:* el separador entre el visor y la línea de tiempo se arrastra hacia arriba para agrandar las pistas (el visor se achica); doble clic lo devuelve a su tamaño. La barra ↕ hace lo mismo.
  - *Ancho:* la barra ↔ estira la línea de tiempo para recortar al cuadro.
  - *Miniaturas:* con pistas altas se ven más grandes. Las medidas se recuerdan en cada computadora.
- **Nombres sobre las figuras:** en un plano abierto, el nombre puede tapar al personaje. *Editor de plano › Plano › Nombres sobre las figuras* lo quita solo en ese plano (viñeta, animatic y PDF); los demás planos no cambian.
- **Storyboard en 2D:** el editor de plano tiene arriba **3D | 2D**. *⚙ Ajustes* del Storyboard elige si los planos nuevos se abren en 3D o en 2D. Al pasar a 2D, la referencia y las anotaciones del plano se convierten en capas, y la escena 3D puede quedar de fondo para dibujar encima.
  - *Herramientas* (con su tecla): Mover (V), Lápiz (B) con textura de grafito, Tinta (I) que engrosa con la presión del lápiz óptico, Pincel suave (R), Marcador (M), Borrador (E), Lazo (L), Flecha (A), Texto (T), Perspectiva (G) y Mano (H).
  - *Ajustes de los pinceles:* tamaño, opacidad y estabilizador. Mayúsculas traza rectas; Alt + clic toma un color de la hoja; `[` y `]` cambian el tamaño.
  - *Paleta:* 16 colores, uno a elección y los recientes.
  - *Capas:* visibles u ocultas, opacidad, nombre (doble clic), orden, duplicar, vaciar y eliminar. *Igual en todos los cuadros* sirve para fondos.
  - *Imagen para calcar:* con *Imagen…*, arrastrándola o pegándola entra en una capa propia al 50 %, lista para mover y escalar.
  - *Lazo:* rodea una zona para moverla, escalarla (por esquinas en proporción; Mayúsculas la deforma libre), estirarla por los lados, girarla o voltearla. Intro aplica y Esc cancela. Ctrl+A toma todo lo de la capa.
  - *Flechas anchas:* se trazan arrastrando. Dos puntos de doblez las curvan en arco o en ese y los extremos las estiran. Tienen grosor, punta, cola afinada, contorno y doble punta.
  - *Texto:* tamaño, negrita y fondo (caja clara u oscura, o borde).
  - *Guías de perspectiva:* 1, 2 o 3 puntos de fuga, que se mueven arrastrando. *Ajustar los trazos a las guías* hace que cada trazo siga la guía más cercana.
  - *Cuadros y papel cebolla:* *Duplicar* copia el cuadro para dibujar el siguiente gesto. El papel cebolla muestra el anterior en rojo y el siguiente en verde. Cada cuadro tiene su duración y la animación se reproduce a 6, 8, 12 o 24 cuadros por segundo, en bucle.
  - *En el resto del programa:* el storyboard, el animatic, el video y los PDF usan el dibujo, y la animación corre dentro del plano.
  - *Atajos:* Ctrl+Z / Ctrl+Mayús+Z deshacen y rehacen; la barra espaciadora o la Mano mueven la hoja; Ctrl + rueda o pellizcar acercan.
  - *Volver a 3D:* los dibujos 2D se conservan por si vuelves.

### Diseño nuevo (1.5.0)

- **Aspecto:** fondo gris perla con tarjetas blancas en modo claro y grafito con tarjetas oscuras en modo oscuro (sigue el tema de Windows o del celular). El acento es el naranja de la marca. Las pestañas se marcan con una línea corta bajo el nombre; los botones y los campos son rellenos, sin bordes; los filtros son píldoras.
- **Plan de rodaje sin cuadrícula:** cada jornada es una tarjeta con la fecha grande a la izquierda y sus escenas como filas de una lista. Día y noche se ven como una barra fina de color a la izquierda de la fila y un tinte suave; el reparto va en burbujas; el cierre de jornada es el pie de la tarjeta. Arriba, el resumen va en fichas (jornadas, completadas, fechas, páginas, sin programar).
- **Columnas a elección:** *⚙ Ajustes › Columnas en pantalla* muestra u oculta Figuración, Notas técnicas y Observaciones. Es una preferencia de cada computadora; el PDF y el Excel siempre las llevan.
- **Hoja de llamado como tarjetas:** arriba la fecha, el proyecto, dirección, producción y locaciones, con el **llamado general en grande**; debajo, fichas con almuerzo, amanecer, atardecer, clima, humedad, condiciones y catering. El cronograma, el equipo técnico, el reparto y los proveedores son listas; los campos se ven como texto y se editan al tocarlos. Sigue el modo oscuro (antes, en el celular, las celdas salían negras).
- **Hoja de desglose como tarjetas (1.5.1):** arriba la escena con su número, INT/EXT y día o noche, páginas y jornada, y los campos de decorado, productora y descripción; debajo, una tarjeta por área (reparto, equipo especial, efectos, figuración, atrezzo, vestuario, vehículos, sonido y notas) con su punto de color, la lista numerada, el botón de fotos y «Añadir…». Sigue el modo oscuro. El PDF conserva el formato de la productora con las cajas de colores.
- **Celular:** el plan se apila en dos o tres líneas por escena y la hoja de llamado en una columna, sin desplazamiento lateral.
- **Horas en 24 horas en todo el programa:** plan, hoja de script y hoja de llamado aceptan «7», «730», «19.30» o «7 pm» y lo guardan como 07:00, 07:30, 19:30, 19:00.
- **Pestañas:** se desplazan cuando no caben y el botón ⋯ queda siempre a la vista.
- **Guion:** los planos rodados llevan el sello «Rodado» en vez de salir tachados.
- **Animatic:** sin un clip elegido, el panel izquierdo se pliega y el visor ocupa todo el ancho; al tocar un clip vuelve con sus datos.
- **Copia de seguridad (versión web):** si el proyecto lleva más de una semana sin copia (o nunca la tuvo después de tres días), junto a «Guardado en este navegador» aparece un aviso que la guarda con un clic, como archivo `.fmst` (desde 1.6.0; ahora `.fsp`).

### Interfaz más simple (1.3.0)

- **Barra de cada pestaña:** a la derecha quedan tres botones fijos. **⚙ Ajustes** reúne lo que se configura una vez (moneda e impuesto del presupuesto, días sin rodaje, reparto por número o nombre, color del cierre, etapas y locaciones, cuadros por segundo del animatic, capas del rayado, nombre de quien hace script). **?** explica cómo se usa la pestaña. **Exportar ▾** reúne PDF, Excel y video.
- **Consejos:** algunas pantallas muestran un consejo corto con ✕. Al cerrarlo no vuelve; *? › Mostrar otra vez los consejos* los recupera.
- **Pestañas a elección:** el botón ⋯ al final de las pestañas permite ocultar las que no usas (por ejemplo Storyboard y Animatic si solo haces producción, o Calendario y Hoja de llamado si solo dibujas). Es una preferencia de cada computadora, no borra nada y la numeración se ajusta. Guion siempre se ve.
- **Acciones a pedido:** en el plan, la casilla y el asa aparecen al pasar el mouse; en el desglose, ✓ y ✕ también; en el presupuesto, las celdas se ven como texto hasta que pasas el mouse. En la hoja de script cada plano muestra *+ Toma* y un botón ⋯ con *No previsto*, *Pick-up*, *Nota* y *Abrir el plano*; los tiempos y la continuidad de cada escena se pliegan mientras estén vacíos.
- **Sugerir planos:** aparece solo en las escenas que aún no tienen planos.
- **Formato de cuadro:** se cambia solo en la pestaña Proyecto.

### Ficha de personaje

Cuerpo, estatura, proporciones, tallas de vestuario, fotos, tono, pelo y color de cada personaje están en su **ficha**, con una vista previa de frente, perfil y espalda. Se abre desde *Storyboard › Personajes*, tocando el nombre del personaje en la hoja de desglose, o con *Ficha…* en el editor de plano. Vale para todos los planos. El editor de plano queda con lo propio del plano: personaje, expresión, postura, articulaciones y posición. Las figuras genéricas guardan su aspecto en el plano, en *Aspecto de la figura*.

La pestaña **Expresión** de la ficha reúne las expresiones del personaje, con su cara de cerca: puede redibujar cualquier predefinida y sumar las suyas (un dibujo por expresión, para todos sus planos), y quitar los ojos predefinidos para dibujarlos a mano. Lo mismo se hace desde el editor de plano (*Expresión › Editar esta expresión* o *Nueva*), con el dibujo en vivo sobre el maniquí.

### Proyecto

La primera pestaña reúne los datos del proyecto: título, guion, versión, productora, formato de cuadro, **logo del proyecto**, **logo de la empresa**, **dirección** y **producción** (con su cargo).

- **Encabezado de los documentos:** todos los PDF llevan a la izquierda el logo del proyecto (o su nombre) y a la derecha el logo de la empresa (o su nombre). Cada uno se puede desactivar. La pestaña muestra cómo queda.
- **Logos:** PNG con fondo transparente o JPG. Se guarda una copia de hasta 600 px de ancho.

### Plan de rodaje

- **Una tarjeta por jornada:** la fecha va a la izquierda y las escenas en filas. Columnas: locación de rodaje, escena, hora, encabezado de escena, reparto, figurantes, octavos, página, notas técnicas y observaciones (las tres opcionales en pantalla). En el PDF y el Excel es una tabla por jornada, con la fecha en una celda combinada.
- **Colores:** amarillo para día y azul para noche (en pantalla, una barra fina y un tinte suave; en el PDF, la fila entera). El cierre de jornada va en negro o en blanco (*⚙ Ajustes*).
- **Menú de la escena:** clic derecho sobre una fila (o tocar el número de escena) abre *Mover a* (cualquier jornada o «sin programar»), *Insertar corte de jornada*, *Dividir la escena*, *Iniciar nueva etapa* y los colores para resaltar la fila. *Opciones* en la fecha cambia el color de toda la jornada.
- **Varias escenas a la vez:** marca la casilla de cada fila (Mayús + clic marca un tramo). La barra de abajo las mueve juntas a otra jornada; también se pueden arrastrar juntas por el asa ⠿. Un clic en el asa no mueve nada: el arrastre empieza al desplazar el puntero.
- **Dividir la escena:** la parte nueva toma la letra siguiente (5A, 5B…) y se puede llevar a otra jornada. Sus octavos se eligen en la columna 1/8; la escena principal se queda con el resto. *Unir con la escena* la devuelve.
- **Fechas:** toca la fecha de una jornada para cambiarla. Las jornadas siguientes de la misma etapa se corren con ella (saltando los días sin rodaje); las de otras etapas conservan su fecha. *Volver a la fecha automática* quita la fecha fijada. Si una fecha queda antes que la jornada anterior, aparece el aviso «⚠ fecha».
- **Agregar jornadas:** *+ Jornada* agrega una vacía al final; *Opciones › Insertar jornada después* la agrega en medio.
- **Eventos con hora:** *Opciones › Agregar evento* suma filas de salida, traslado, desayuno, almuerzo, cena, preparativos o desmontaje. Se arrastran como las escenas.
- **Jornadas completadas:** se marcan en *Opciones*. También se marcan solas cuando todos sus planos están rodados en la hoja de script. Quedan con borde verde y la etiqueta «Completada».
- **Reparto:** por número o por nombre (*⚙ Ajustes*).
- **Locaciones de rodaje:** en *⚙ Ajustes › Locaciones de rodaje* se cargan los lugares reales (con dirección o referencia) y se asigna uno a cada decorado del guion. Al cambiar el nombre de una locación ahí, cambia en todas sus escenas. En la tabla se puede cambiar escena por escena.
- **Etapas de rodaje:** en *⚙ Ajustes › Etapas de rodaje* (o con *Iniciar nueva etapa* sobre una escena) se crean etapas con nombre y lugar o país («Sierra · Santiago de Chuco, Perú»). Cada una empieza en una jornada y tiene su propio tono de fondo para la fecha y los eventos. Si la escena no abre su jornada, la jornada se corta antes de ella.
- **Excel:** *Exportar ▾ › Plan de rodaje (Excel)* descarga un .xlsx con la misma tabla del PDF (fecha en celdas combinadas, colores, etapas, cierres, reparto) y una hoja de locaciones con dirección, escenas y jornadas.
- **Primer plan:** al importar un guion se propone un plan inicial por locación y día o noche; después todo se ordena a mano. Las escenas nuevas quedan en «sin programar», con un botón para repartirlas en jornadas nuevas al final.

### Calendario

Cronograma de toda la producción, de la preproducción a la entrega.

- **Fases que se contraen o expanden:** Preproducción, Rodaje y Posproducción (y «Otras fechas»). Al tocar el nombre de una fase se pliega en una fila de resumen; *Contraer todo* pliega las tres.
- **Vistas:** *Mes* para ver toda la producción, *Semana* con más detalle (título y responsable en cada barra) y *Día* con todo lo de una fecha: tareas y, si se rueda, la jornada con sus escenas y su hoja de llamado.
- **Tareas libres:** *+ Tarea* o doble clic en una fila. Cada tarea tiene fechas, área, responsable, color, notas y «hecha». Se arrastra para moverla y desde sus bordes para cambiar inicio y fin.
- **Rodaje automático:** las jornadas y las etapas salen del plan de rodaje y se actualizan solas.
- **Tareas típicas:** *⚙ Ajustes › Agregar tareas típicas* propone casting, scouting, permisos, pruebas, ensayos, montaje, sonido, color, entrega y distribución, ubicadas según las fechas de rodaje.
- **Exportar:** PDF con todas las tareas por fase y Excel con el cronograma en barras por día.

### Hoja de llamado

Una por jornada, armada con el plan de rodaje y el desglose (se basa en la plantilla «Call Sheet»):

- **Encabezado:** proyecto, productora, fecha y jornada; producción, producción ejecutiva y dirección (de la pestaña Proyecto); centro de salud más cercano; almuerzo, catering, amanecer, atardecer y clima.
- **Llamado general** y **locaciones** con su dirección. El llamado sale del evento «Llamado» del plan o del llamado por defecto; se puede cambiar en la hoja. Las horas se escriben a mano: «7», «730» o «19:30».
- **Cronograma:** escenas y eventos de la jornada con inicio, fin, páginas, reparto y la utilería y arte de cada escena.
- **Equipo técnico** por área (producción, dirección, cámara, eléctricos y maquinistas, maquillaje, vestuario, arte, sonido), **reparto** (actor o actriz, teléfono, escenas, recojo y llamado) y **proveedores**. Nombres, teléfonos y correos se escriben una vez para todo el proyecto; los horarios son de cada jornada. Si el llamado de alguien queda vacío, vale el general.
- **Notas** de la jornada y **avance** de la siguiente.
- **Exportar:** PDF o Excel de una jornada o de todas. Las filas del equipo sin nombre no se imprimen.

### Láminas con fotos en el desglose

Cada caja de la hoja de desglose (menos Notas) tiene un botón de cámara que abre su **lámina A4**: los elementos de esa caja en la escena, con fotos y una nota (talla, color, marca, dónde conseguirlo).

- **Fotos:** JPG o PNG, con el botón *Fotos* o arrastrándolas. Se comprimen al subirlas sin pérdida visible: lado mayor hasta 1800 px y JPEG de alta calidad (una foto de 7 MB queda en unos 500 kB). Las fotos son del elemento, así que aparecen en todas sus escenas.
- **Imprimir con o sin fotos:** desde la lámina (*PDF con fotos* / *PDF sin fotos*) o desde *Exportar*: hojas de desglose con fotos (cada hoja seguida de su lámina) o una **lámina por área** con todos los elementos del proyecto.
- **Equipo:** cada jefe de área sube fotos solo en sus cajas. Las fotos viajan cifradas con la llave del desglose.

### Presupuesto

- **Monto en dólares:** *⚙ Ajustes › Mostrar montos en dólares* agrega la columna «Total US$» con el tipo de cambio que escribas a mano.
- **Impuesto:** el nombre (IGV, IVA…) y el porcentaje se escriben a mano en *⚙ Ajustes*.
- **Protección:** *⚙ Ajustes › Proteger con código…* deja el presupuesto solo para producción, cada persona con su código de 4 dígitos. Cada cambio queda en el registro con su nombre. Al proteger aparece un **código de recuperación**: sirve para poner un código nuevo si alguien olvida el suyo. En un proyecto propio es una protección dentro del programa; la protección fuerte es la del equipo en escritorio, donde el presupuesto va cifrado y solo lo reciben los cargos de producción.

### Hoja de script

- **Script / continuidad:** nombre de quien hace script (*⚙ Ajustes*); sale en el PDF.
- **Rollo o tarjeta:** el que está en cámara se anota solo en cada toma nueva; se puede corregir en la toma. La jornada muestra los rollos y tarjetas usados.
- **Plano no previsto:** *⋯ › Plano no previsto debajo* agrega un plano debajo con letra: 1.1A, 1.1B…
- **Pick-up:** *⋯ › Pick-up de este plano* agrega 1.1PU, que copia la técnica del plano para repetir una parte.
- **Plano nuevo de la escena:** el botón de la escena sigue la numeración normal (por ejemplo, *+ Plano 1.4*).

### Animatic

- **Bloquear escenas:** en la barra *Escenas*, toca una escena para bloquearla. Se oculta del montaje: no se puede modificar y no se reproduce ni se exporta (video y PDF). Toca de nuevo para mostrarla.
- **Aislar una escena:** *Aislar una escena…* bloquea todas las demás, para revisar o exportar solo esa.
- **Música:** sigue a cada escena en su lugar del montaje completo, aunque haya escenas ocultas.

## Ediciones: FilmSpirit Free y FilmSpirit Pro

Hay un solo instalador. La edición la decide la licencia:

- **Prueba de FilmSpirit Pro:** dura 15 días e incluye todas las funciones.
- **FilmSpirit Free:** empieza al terminar la prueba.
  - Permite 1 proyecto propio guardado.
  - Los PDF salen con la marca de agua «FILMSPIRIT FREE».
  - Permite entrar sin límite a proyectos compartidos por un productor con Pro.
- **FilmSpirit Pro:** se activa con una clave en el botón «Activar Pro» o en *Ayuda › Licencia*, y funciona sin internet.
  - Proyectos ilimitados.
  - PDF sin marca de agua.
  - Puede compartir proyectos con el equipo.
  - La licencia se puede quitar de un equipo para pasarla a otro.

La edición activa forma parte del logotipo (FilmSpirit FREE o FilmSpirit PRO) y aparece en el título de la ventana. La versión web no tiene límites, así que muestra PRO.

### Cómo emitir una clave

1. Abre `emisor-de-licencias.html` y carga `filmspirit-clave-privada.json`.
2. Escribe el nombre del cliente, su correo y, si quieres, una fecha de vencimiento.
3. Pulsa **Emitir licencia**. Luego **Copiar mensaje para el cliente** prepara el correo con las instrucciones.
4. El emisor lleva un registro de las claves emitidas. Exporta el `.csv` de vez en cuando como respaldo.

Desde la terminal también puedes usar `node desktop/tools/emitir.js clave-privada.json "Nombre" correo [vence]`.

**Si se pierde la clave privada**, ya no se pueden emitir claves que acepten las copias instaladas. Habría que generar otra clave y publicar una versión nueva. Guarda al menos dos copias en lugares distintos.

**Límite conocido:** la clave no está atada a un equipo. Quien la tenga puede usarla en varias computadoras, aunque siempre muestra a nombre de quién está emitida. Para limitar las activaciones hace falta un servicio en línea, por ejemplo la API de licencias de Lemon Squeezy.

## Cambiar nombre, precio o enlace de compra

Edita `desktop/brand.json`:

- `name`: nombre del producto (si lo cambias, cambia también el logotipo: ver «Logotipo»).
- `ext`: identificador del producto. Es el prefijo de las claves de licencia y el formato de los proyectos compartidos; los archivos con esta extensión (`.fmst`) se siguen abriendo.
- `fileExt`: extensión de los archivos de proyecto (`fsp`).
- `publisher`: tu empresa.
- `trialDays`: días de prueba.
- `freeProjects`: proyectos propios permitidos en FilmSpirit Free.
- `buyUrl`: página de compra. Aparece el botón «Comprar licencia».
- `supportEmail`: correo de soporte.
- `site`: sitio web.

Si cambias `name` o `ext`, genera también una clave nueva y pon su parte pública en `publicKey`. Las claves emitidas llevan el prefijo del producto (cambiar `fileExt` no afecta a las licencias).

## Logotipo

La marca sale del manual de marca 2026, guardado en `desktop/marca/manual-2026` (logotipos en SVG, la letra
FilmSpirit Recorte y las reglas en `LEEME.txt`). Todo se genera con `python3 marca/generar.py` desde `desktop`
(la letra corregida, con `python3 marca/recorte.py`) y vive en `desktop/marca`:

- `svg/`: el logotipo sin placa, solo y con cada edición (Free, Indie, Pro, Studio); la placa roja horizontal y la
  apilada cuadrada.
- `icono.svg`: el ícono, que es el logotipo apilado en su placa roja cuadrada (el ícono «Frente al monolito» del
  manual no se usa). De ahí salen `build/icon.*`, `build/doc.*` y `web/` (favicon).
- `recorte/`: FilmSpirit Recorte 2.002 en TTF, OTF y WOFF2, con la G corregida y los acentos del francés, el italiano y
  el portugués (À Â Ã Ä È Ê Ë Ì Î Ï Ò Ô Õ Ö Ù Û Ç). La app la lleva dentro
  (`src/recorte-fuente.js`) para el título de Inicio.
- `lamina.png`: las versiones sobre blanco y sobre negro, la placa y el ícono.
- `logo.png`, `logo-oscuro.png`: el logotipo sin placa para fondo claro y oscuro (emisor de licencias);
  `logo-naranja.png`: la placa roja, para fondos de color.

Dentro del programa:

- **Barra superior:** el logotipo sin placa a 120 px de ancho (el mínimo del manual): FILM negro (blanco en el modo
  oscuro) y SPIRIT naranja. La edición va al lado, chica y gris. En el celular, el apilado cuadrado.
- **Acerca de…:** la placa roja horizontal, la versión principal.
- **Colores:** el acento es el rojo de la marca (#CE0C1C) en el modo claro y el naranja (#F49B1E) con letra oscura en
  el oscuro, como las placas roja y naranja del logotipo.

## Volver a compilar

Necesitas Node.js 20 o superior.

```
npm install                 # librerías de la interfaz
cd desktop && npm install   # Electron y herramientas
node make.js                # → desktop/dist/FilmSpirit-Instalador-<versión>.exe
```

El instalador se arma con NSIS (`desktop/build/instalador.nsi`). En Linux se usa el `makensis` que descarga electron-builder. En Windows hay que instalar NSIS o indicar su ruta con la variable `MAKENSIS`.

- `sh build.sh`: versión web en un solo archivo HTML (`dist/filmspirit.html`), lista para publicarla como página interactiva en Claude.
- `node make.js --solo-app` y luego `npx electron .`: prueba rápida de la versión de escritorio.

## Maniquíes del storyboard

Las figuras del storyboard, del editor de planos y del animatic son maniquíes 3D articulados hechos con MakeHuman (activos CC0). Hay seis cuerpos: hombre, mujer, anciano, anciana, niño y niña. Los extras usan el de hombre, sin cara y en gris. Cada personaje tiene un tono, pelo opcional (melena o moño) y sus proporciones. El rostro es liso (sin relieve de ojos, nariz ni boca): la expresión se dibuja encima. Mientras un cuerpo carga, se ve el maniquí simple. Para regenerarlos, mira `fig3d/LEEME.md`.

Los objetos, los equipos de luz y los escenarios (interior, plano importado, exterior y calle) tienen el mismo estilo que los maniquíes: formas redondeadas, el mismo sombreado suave y el mismo contorno negro fino. Ese estilo está en un solo lugar, al inicio de `src/s3d-render.js` (`STY`, `toonRamp`, `outlineAll`, `rbox`, `rcyl`).

## Pendientes antes de vender

1. **Registro del nombre:** busca «FilmSpirit» en Indecopi, en las clases 9 y 42, y regístralo.
2. **Certificado de firma de código:** quita el aviso de Windows. Hay que comprarlo a una autoridad certificadora a nombre de la empresa.
3. **Tienda en línea:** Lemon Squeezy o Paddle para vender FilmSpirit Pro. Su enlace va en `buyUrl` y aparece como «Comprar FilmSpirit Pro».
4. **Actualizaciones automáticas:** todavía no están incluidas. Por ahora, para actualizar se instala la versión nueva encima de la anterior.
5. **Contrato de licencia:** está en `desktop/build/licencia.txt` y es una plantilla. Que lo revise un abogado.
