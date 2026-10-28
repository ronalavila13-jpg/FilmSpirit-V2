# Lote AD · Historia: «Premisa y mundo» y «Estructura»

La pestaña **Historia** tiene dos vistas nuevas para tener a mano todo lo que se piensa antes de escribir el guion.
Ahora las vistas van en este orden: **Argumento, Premisa y mundo, Biografías, Estructura, Escaleta, Tarjetas**.

## Premisa y mundo

Es la misma hoja del Argumento, pero con todas sus partes a la vista, agrupadas:

- **La idea**: *Tema*, *Premisa* (qué dice la historia) y *Tono y género*. Cada cuadro cuenta sus palabras y dice lo
  usual (es una guía, no un límite), igual que el logline o la sinopsis.
- **Referencias**: una lista de películas, series, libros, fotos o imágenes, música u otras. Cada una lleva su tipo,
  su título, una nota («qué tomar de ella») y, si quieres, un enlace; con enlace aparece «Abrir». «+ Referencia»
  agrega una y la ✕ la quita (se puede deshacer).
- **El mundo**: *Época*, *Lugares* y *Reglas*.
- **Investigación**: las notas de lo que averiguaste.

A la izquierda, la lista de partes lleva a cada una y muestra cuántas palabras tiene (en el teléfono y la tableta no
aparece: la hoja ya muestra todo).

**Imágenes de referencia:** no se suben fotos aquí. Las fotos del programa se guardan por sección del equipo
(desglose, scouting, storyboard…) y la Historia no tiene la suya: para subirlas habría que cambiar permisos, el
servidor y los proyectos «solo guion» (que hoy no guardan imágenes). No salía simple, así que cada referencia lleva un
enlace: puede ser a la película, a una foto en la web o a una carpeta de Drive.

## Estructura

Los seis puntos clave en una **línea de tiempo vertical** que baja por los actos de la Escaleta:
**Detonante, Primer punto de giro, Punto medio, Crisis, Clímax y Desenlace**.

- Cada punto tiene su descripción (con una ayuda de qué es) y dónde suele caer («lo usual: hacia el 25 %»).
- **Acto**: en qué acto va. Sin elegir, va donde suele ir (con tres actos: detonante y giro en el I, punto medio y
  crisis en el II, clímax y desenlace en el III).
- **Escena**: si quieres, lo unes a una escena o tarjeta de la Escaleta (se elige de una lista, agrupada por actos;
  también las escenas por escribir). Unido, va en el acto de esa escena (si la escena cambia de acto, el punto la
  sigue), dice en qué parte del guion cae («al 18 %», según el largo de las escenas escritas) y ofrece «Ver en el
  guion» o «Ver en la escaleta».
- Los actos son los de la Escaleta: ahí se agregan, se quitan y se renombran.
- Si una escena unida pasa al guion («Pasar al guion»), el punto sigue a la escena nueva; si las escenas se
  renumeran, también la sigue. Si la escena se borra, el punto se queda en su acto y avisa, con «Soltarla».

## Exportar

En «Exportar» de la Historia hay dos PDF nuevos, en el orden de las vistas:

- **Premisa y mundo**: la idea, las referencias en una tabla (con la columna del enlace solo si alguna lo tiene),
  el mundo y la investigación.
- **Estructura**: la línea de tiempo por actos, con cada punto, su escena y dónde cae.

Los dos entran también en el ZIP de «Archivar» (02 y 04; los demás documentos se corrieron un número). En inglés,
los archivos salen como `_premise_and_world.pdf` y `_structure.pdf`.

## Equipo, deshacer y lo demás

- Los datos viajan con el guion (sección «guion» del equipo), dentro de la Historia. Si dos personas trabajan a la
  vez, se unen parte por parte: cada referencia por su cuenta (dos personas pueden agregar referencias a la vez) y
  cada punto clave por campo.
- El registro de actividad y los avisos del equipo ahora dicen «cambió la estructura de la historia», «cambió la
  premisa y el mundo de la historia», «cambió el argumento», etc. (antes un cambio en la Historia aparecía como
  «editó la escena N»).
- Todo se deshace y rehace como el resto del proyecto.
- En solo lectura se ve todo y no se edita nada.
- Se ve bien en el celular y en modo oscuro.
- Todo está en inglés también (Premise & World, Structure, Inciting incident, First plot point, Midpoint, Crisis,
  Climax, Resolution).
- El proyecto de ejemplo («La última función») trae una premisa, tres referencias y los seis puntos clave unidos a
  sus escenas, en los dos idiomas.
- Los proyectos de antes se abren igual: las vistas nuevas aparecen vacías.

## Cómo lo probé

- `test/historia-ad.test.js` (nueva): el orden de las vistas, lo que se dibuja (también en solo lectura), los datos
  viejos o rotos al abrir, que viajen con la sección «guion» y se unan los cambios de dos personas, que el punto
  siga a su escena al renumerar, el aviso del equipo, el menú Exportar, el ZIP y el inglés.
- Todas las demás pruebas siguen pasando (solo `test/pdf.test.js` falla, como antes, por el módulo canvas). La prueba
  del diseño de los PDF exporta también los dos nuevos sin error ni rellenos.
- En el navegador (Playwright): escritorio, tableta y celular, claro y oscuro, español e inglés; escribir y deshacer,
  agregar y quitar referencias, cambiar el acto, unir a una tarjeta y pasarla al guion, «Ver en el guion», y los PDF
  (también con textos largos que pasan de página).
