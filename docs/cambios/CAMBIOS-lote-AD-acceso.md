# Lote AD · acceso (27 de octubre de 2026)

Dos cosas: el proyecto de ejemplo para quien no paga (y para quien todavía no tiene cuenta), y quién ve la etapa Guion
(Historia y Guion) y el Presupuesto en un proyecto compartido.

## 1. El proyecto de ejemplo

### Plan gratis (Guion)
- En **Inicio** y en **Proyectos**, «La última función (ejemplo)» es lo primero de la lista, en el rojo y el naranja de
  la marca, con la invitación: «Recorre todas las pestañas y juega con un proyecto completo: guion, desglose, storyboard,
  plan de rodaje y hoja de llamado». Se abre con un toque, con todas las pestañas de producción.
- No cuenta entre los 5 guiones del plan gratis y no se puede borrar ni archivar (no está guardado).
- «Guardar como mi proyecto» es el de siempre (con el límite del plan: en el plan Guion se guarda como guion).
- En los planes de pago (Indie, Pro, Studio) el ejemplo queda como estaba: el botón «Ejemplo» al pie de Proyectos y
  «Ver el proyecto de ejemplo» al pie de Inicio.

### Los cambios en el ejemplo duran mientras sigas en el programa (para todos)
- Lo que cambias en el ejemplo (y lo que dibujas) queda en la memoria: puedes pasar a otro proyecto y volver, y sigue ahí.
  En Inicio, la tarjeta dice «con tus cambios, sin guardar».
- Si cierras o recargas la página con cambios en el ejemplo, el navegador avisa antes (también si ahora tienes abierto
  otro proyecto). Recargar trae el ejemplo como nuevo.
- Solo mirar las pestañas no cuenta como cambio: no salta el aviso.

### Explorar sin cuenta
- En la portada hay un botón nuevo: **«Explorar con un proyecto de ejemplo»** (en los 5 idiomas). Abre la app en
  `/app/?ejemplo=1` sin iniciar sesión, solo con el ejemplo.
- En ese modo nada se lee ni se guarda en el servidor: la app solo pregunta si hay sesión y, si no la hay, corta todas
  las demás llamadas. El plan es el gratis (marca de agua y lo de Pro cerrado).
- Arriba aparece **«Crear cuenta gratis»**. Guardar, Nuevo (guion o proyecto), Importar, Abrir archivo, Compartir y ver
  los planes piden crear una cuenta: se abre una ventana con el botón de Google ahí mismo. Al entrar, el ejemplo sigue en
  pantalla con tus cambios y lo que pediste sigue solo (por ejemplo, «Guardar» guarda el ejemplo como tu proyecto, con el
  límite del plan). Si el botón de Google no carga, «Entrar con Google» lleva a la página de entrada de siempre.
- Con sesión, el mismo botón de la portada abre el ejemplo directamente.

Para quien programe: una sola función abre el ejemplo, `openSample()` (src/proyectos.js). La usan Inicio, Proyectos, la
portada (`?ejemplo=1`) y los demás lugares que antes armaban uno nuevo. Los botones «Explorar con un proyecto de ejemplo»
de otras partes deben llamarla.

## 2. Quién ve Historia, Guion y el Presupuesto

- **Historia y Guion** (la etapa Guion) la ven solo: el cargo «Guion», los cargos de producción (Producción, Producción
  ejecutiva, Jefatura de producción) y quien administra el proyecto. El resto del equipo no ve esas dos pestañas; lee el
  guion en el **Guion rayado**, el Desglose y las demás. En un guion (coescritura, plan Guion) no cambia nada: todos
  escriben.
- El material de **Historia** (argumento, escaleta, tarjetas, biografías) **no se envía** a quien no ve la etapa: el
  servidor lo recorta, y también las notas pegadas a la pestaña Historia (y su aviso en la actividad). Cuando esa persona
  guarda el guion (por ejemplo, el título en Proyecto), la Historia queda como estaba: no se borra ni se pisa.
- Si entra por un enlace o una notificación a Historia o Guion, va al Guion rayado.
- **Guion cerrado**: si producción autoriza a alguien sin acceso a revisar el guion cerrado, mientras esté autorizado ve
  la pestaña Guion (no la Historia). Al quitarle la autorización, vuelve al Guion rayado.
- En **Equipo y permisos** hay una línea que lo explica.
- **Presupuesto**: revisé que solo lo vean los cargos de producción en el menú de la etapa, la franja de pestañas,
  «Ir a…» (Ctrl + K), las notas y la actividad, los avisos en vivo, Personalización y las exportaciones (PDF, Excel y el
  ZIP). No encontré fugas. Gastos queda como estaba.
- El ZIP del proyecto ahora incluye el guion y el guion rayado a quien ve el Guion rayado (antes dependían de la pestaña
  Guion).
- El equipo de escritorio (carpeta compartida) sigue las mismas reglas de pestañas.

## Cómo lo probé
- Pruebas del servidor: `server/test/acceso.test.js` (la app sin sesión con `?ejemplo=1` y todo lo demás pidiendo
  sesión; quién recibe la Historia; guardar sin borrarla; las notas de Historia; el presupuesto; el cambio de cargo y la
  coescritura). Todas las del servidor pasan (109).
- Pruebas de la app: `test/acceso-ad.test.js` (pestañas por cargo, guion cerrado, lo que viaja al guardar, el ejemplo en
  memoria, primero en el plan gratis, el modo sin cuenta). Las demás siguen pasando (salvo `pdf.test.js`, que fallaba antes).
- En el navegador, con el servidor local: el ejemplo sin cuenta (computadora y teléfono, español e inglés), crear la cuenta
  desde ahí y guardar el ejemplo; una cuenta gratis (el ejemplo primero, sus cambios al ir y volver de otro guion); una
  cuenta Pro (como siempre); y un proyecto compartido con Dirección, Guion y Jefatura de producción, con el guion cerrado
  autorizando a Dirección. También la portada y la versión publicada en Claude.

## Para tener en cuenta
- Quien tenga un cargo fuera de la etapa Guion (por ejemplo, Dirección) pero con «Editar» en la columna Guion ya no ve la
  pestaña Guion: puede cambiar los datos del proyecto (pestaña Proyecto) y, para el texto, producción le pone el cargo
  «Guion» o lo autoriza en el guion cerrado.
- Quienes coescribían un guion que pasó a producción conservan su cargo: si no es «Guion» ni de producción, dejan de ver
  Historia y Guion hasta que producción se lo cambie.
