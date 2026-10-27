# Lote AD · diecinueve observaciones (27-oct-2026)

Base: lote AC (que trae los lotes T a AC). Rama `lote-ad`. El detalle de cada parte está en su propia nota:
`CAMBIOS-lote-AD-figuras.md`, `-escenarios.md`, `-dibujo.md`, `-script.md`, `-zoom.md`, `-historia.md`,
`-planes.md` y `-acceso.md`.

**Cómo aplicarlo.** En la VPS, como siempre:
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
Viene sin los maniquíes 3D (el actualizador conserva los instalados). Trae la **migración 12**, que se aplica sola:
agrega a la lista de espera la marca de a quién ya se avisó que Studio abrió y **borra las huellas de navegador y de
cuentas eliminadas**, que solo servían para que el mes gratis no se repitiera. No hay variables nuevas: `STUDIO_OPEN`
ya no hace falta (si está en el `.env`, se ignora) y los precios de prueba de Paddle quedan sin uso (se pueden archivar
desde el panel de Paddle, no es obligatorio).

## Qué cambió

1. **Zoom con dos dedos en el celular** (Guion rayado, Guion y guion AV): se agranda solo la hoja, alrededor de los
   dedos, sin correrse de costado ni esconder la barra de arriba. El editor del Guion ahora también tiene zoom con dos
   dedos. Conviene probarlo en tu iPhone (aquí solo se pudo con el simulador de Chrome).
2. **Sin constructor de escenarios.** Se quitaron el editor y todo lo que llevaba a él.
3. **La gorra va sobre el pelo** (también el gorro, el sombrero y los cascos): el pelo asoma solo por debajo y la
   visera sale del borde de la gorra.
4. **19 peinados nuevos (33 en total)**, y el selector muestra primero los que le van al tipo de figura; los demás,
   detrás de «Ver todos».
5. **La ropa dibujada se adapta** al cambiar de hombre a niño, mujer, anciano, etc., y al mover las proporciones.
6. **Un modelo 3D importado sobre un entorno** (la casa sobre la playa o el bosque), ubicado desde arriba, el mismo en
   todos los planos de la locación. Exclusivo de Studio.
7. **«Plano» es la primera pestaña** del editor de la viñeta, y se abre ahí.
8. **Bote de pintura** en el editor 2D (tecla F), con tolerancia y «cerrar huecos».
9. **Historia** tiene dos vistas nuevas: «Premisa y mundo» y «Estructura».
10. **El Lazo** nunca cambia solo: suma, resta con Ctrl y abre la caja con Ctrl + clic. Copiar, cortar y pegar la
    selección.
11. **Las flechas nuevas salen sin contorno.**
12. **Botón grande «Agregar imagen»** en las capas del editor 2D.
13. **Hoja de script nueva**, como la muestra: computadora, celular para el set, escenas terminadas contraídas,
    cronómetro, dictado de notas, fotos de continuidad (~200 kB), MOS y sonido wild, carga rápida, fotos de las hojas
    de papel, y la **hoja para imprimir** (una hoja A4 por escena, con planos extra en blanco) con el parte diario.
14. (Descartada: exportar el animatic en segundo plano.)
15. **Exportar una parte del animatic**: I marca la entrada y O la salida; se exporta todo, el tramo o una escena.
16. **El ejemplo destacado**: en el plan gratis es la primera fila, en rojo y naranja. Desde la portada se puede
    explorar sin cuenta; para guardar o crear un proyecto se pide registrarse (con Google, en la misma página).
17. **Ningún plan tiene prueba gratis.** Donde se ofrecía, ahora: «Ver planes de suscripción» y «Explorar con un
    proyecto de ejemplo». Quien ya esté en su prueba la termina normalmente.
18. **Studio a la venta**, con los mapas de Scouting y los escenarios 3D importados como exclusivos (según el plan
    del dueño del proyecto; lo que ya existe se sigue viendo). En el panel de administración, un botón para avisar a
    la lista de espera cuando tú decidas: no se envía nada solo.
19. **Historia y Guion** los ven solo los cargos Guion y de producción (y quien administra el proyecto); el resto
    lee el guion en el Guion rayado. El material de Historia no se envía a los demás. Presupuesto y Gastos, como antes.

## Para tener en cuenta
- Dirección (u otro cargo que no sea Guion ni de producción) ya no ve la pestaña Guion aunque tenga permiso de editar
  el guion. Para que edite el texto, producción le da el cargo «Guion» o lo autoriza en el guion cerrado.
- El programa de escritorio conserva su propia prueba de 15 días (licencia sin internet, aparte de las suscripciones).
- La hoja de script impresa sale en negro y gris, sin los logos que llevaba el parte diario anterior.

## Pruebas
- Todas las pruebas de la app pasan, salvo `test/pdf.test.js`, que ya fallaba antes (le falta el módulo canvas).
  Las del servidor pasan todas (110).
- En el navegador, con las ocho partes unidas: todas las pestañas del ejemplo en computadora y en celular (en español
  y en inglés), sin errores; la hoja de script nueva en computadora y celular. Cada parte se probó además por separado
  (ver su nota).
