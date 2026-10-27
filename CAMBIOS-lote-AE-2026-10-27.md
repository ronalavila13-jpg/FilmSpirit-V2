# Lote AE · el ejemplo sin degradado y dos arreglos (27-oct-2026)

Base: lote AD. Rama `lote-ae`.

**Cómo aplicarlo.** En la VPS, como siempre:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Viene sin los maniquíes 3D (el actualizador conserva los instalados). No hay variables ni migraciones nuevas.

1. **La tarjeta del ejemplo, sin degradado.** En Inicio y en la lista de Proyectos, «La última función (ejemplo)» es
   del rojo de la marca liso (#CE0C1C), con un borde simple y la letra blanca; sin el naranja ni el resplandor rojo de
   alrededor. Al pasar el mouse, un rojo un poco más oscuro. El resto del programa no cambia.
2. **Error del servidor al abrir un proyecto o guardar el storyboard** («Algo falló en el servidor»). El paquete del
   servidor no traía el archivo con las reglas de permisos que comparten la app y el servidor (`areas.js`), así que el
   servidor seguía con una versión vieja, sin la regla nueva de quién ve Historia y Guion. Ya se corrigió con el zip
   del lote AD que se mandó después, y desde ahora ese archivo va siempre en el paquete.
3. **Un error escondido al volver a Inicio** con la pestaña del Guion rayado guardada de antes: las notas al margen
   buscaban el guion sin que hubiera un proyecto abierto. No se veía en pantalla; ya no pasa.

## Pruebas
- Nueva: `test/lote-ae.test.js`. Todas las pruebas de la app pasan, salvo `test/pdf.test.js`, que ya fallaba antes (le
  falta el módulo canvas). Las del servidor pasan todas.
- En el navegador, con un servidor local y una cuenta del plan gratis con proyectos propios y uno compartido: Inicio y
  la lista de Proyectos con la tarjeta en rojo liso, abrir proyectos sin errores del servidor ni de la app.
