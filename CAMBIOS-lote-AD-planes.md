# Lote AD · planes (27 de octubre de 2026)

Dos cambios que pediste: **ningún plan tiene prueba gratis** (para probar está el proyecto de ejemplo) y **Studio se
vende siempre**, con los mapas del Scouting y los escenarios 3D importados como lo exclusivo de Studio.

## 1. Sin prueba gratis

**En la app**
- Donde antes decía «Pro 30 días gratis» ahora hay dos botones: **«Ver planes de suscripción»** y **«Explorar con un
  proyecto de ejemplo»**. Están en:
  - el aviso de solo lectura de un proyecto de producción en el plan gratis (junto a «Descargar ZIP»);
  - las pestañas de producción de un guion (Desglose, Storyboard…) y la tarjeta del guion en la pestaña Proyecto;
  - el botón de la cuenta (para cuentas gratis);
  - el menú «+ Nuevo» (una opción nueva, «Proyecto de ejemplo»).
- «Explorar con un proyecto de ejemplo» abre «La última función» con todas sus pestañas, en la misma pestaña en que
  estabas (si estabas en Desglose, se abre en Desglose). Avisa que lo que cambies ahí no se guarda.
- En la ventana de planes ya no aparece «Hoy no pagas nada, tienes 30 días gratis…»: dice «Se cobra hoy». La nota
  de la prueba cambió por «Ningún plan tiene prueba gratis: para ver la producción, explora el proyecto de ejemplo»,
  con su botón (cuentas gratis). En los cinco idiomas de esa ventana.
- El diálogo «Guardar el ejemplo» dice «Ver planes de suscripción» en lugar de «Probar Pro 30 días gratis».

**En el servidor**
- Mercado Pago, Paddle y Lemon Squeezy: la suscripción se crea siempre sin días gratis (Paddle usa siempre el precio
  normal, nunca el de prueba).
- Los códigos de descuento ya no suman días gratis; el descuento en dinero sigue igual. En el panel ya no está el
  campo «Días extra de prueba» y un código nuevo tiene que dar un descuento. Un código viejo que **solo** daba días
  gratis ahora responde «Ese código daba días de prueba gratis, que ya no se ofrecen» (puedes apagarlo en el panel).
  La columna «Días de prueba (antes)» se sigue viendo en la lista si algún código viejo los tenía.
- **Quien ya está en su prueba la termina normalmente**: sigue con su plan hasta el primer cobro, recibe el aviso
  3 días antes y valen las reglas de siempre (un mes gratis por pagador de Mercado Pago, el precio de prueba de Paddle
  se sigue reconociendo).
- Ya no se marca el navegador (la cookie `fs_dev`, que solo servía para que el mes gratis no se repitiera; al entrar
  se borra la que quedó) ni se guarda la huella de las cuentas eliminadas. La actualización de la base (la número 12)
  borra esas dos tablas de datos (`devices` y `gone`), que ya no sirven para nada.
- Portada, términos, cancelaciones y reembolsos, privacidad y los textos de la portada en los 5 idiomas: sin prueba
  gratis. La pregunta «¿Cómo funciona la prueba de Pro?» pasó a «¿Puedo probar antes de pagar?» (el plan Guion y el
  proyecto de ejemplo). En reembolsos queda dicho que quien empezó una prueba antes la termina como se acordó.
- `LEEME-VPS.md` y `deploy/filmspirit.env.ejemplo`: ya no hacen falta los precios de prueba de Paddle. **Si ya los
  creaste y alguien empezó su prueba con ellos, deja `PADDLE_PRICE_PRO_MONTH_TRIAL` y `PADDLE_PRICE_PRO_YEAR_TRIAL`
  en el `.env` hasta que esas pruebas terminen.**

## 2. Studio abierto

- Studio está a la venta sin configurar nada (`STUDIO_OPEN` ya no se usa). En la app, Pro ve «Pasar a Studio» y el
  precio de Studio en la ventana de planes; en la portada, «Elegir Studio» en lugar de la lista de espera.
- Términos: Studio es todo lo de Pro, 20 proyectos de producción activos (200 archivados), hasta 60 personas por
  proyecto, 100 GB, y solo en Studio los mapas en Scouting y los escenarios 3D importados. Revisé la app: el
  **casting existe pero es de Indie, Pro y Studio** (no exclusivo), y **no existen** las plantillas de productora, los
  varios administradores ni el resumen de proyectos, así que los saqué de los términos, de la tabla de la portada y de
  la ventana de planes. En Indie agregué «casting» y «scouting (sin mapas)» para que la lista sea exacta.
- Privacidad: ya no dice que te avisaremos cuando abra Studio (ni la cookie del navegador, ni la huella para la
  prueba).
- **Panel › Lista de espera**: botón **«Avisar a la lista de espera que Studio abrió»**. Envía un correo a cada
  persona que aún no lo recibió, en el idioma con que se anotó (es, en, pt, fr, it), una sola vez: queda marcado
  «enviado el …». Pide confirmación y no envía nada solo. Necesita el correo configurado (`MAIL_PROVIDER`…); si no lo
  está, no marca a nadie. El formulario de la lista de espera se quitó de la portada y de la app.

### Lo exclusivo de Studio

- **Mapas en Scouting**: el campo «Mapa» de cada candidata y la vista «Mapa general».
- **Escenarios 3D importados**: importar, «Ajustar…» y «Versión liviana». La interfaz la bloquea el frente de
  escenarios con la API de abajo; yo hice el control del servidor.
- Va **según el plan de quien es dueño del proyecto**: si el dueño tiene Studio, todo su equipo los usa en ese
  proyecto aunque cada persona tenga otro plan. En el programa de escritorio, según su licencia. En el proyecto de
  ejemplo, abierto para todos (para explorarlo).
- **Lo ya hecho no se borra**: en Indie y Pro, el enlace que ya tenía una candidata se sigue viendo (con «Abrir») y
  sale en el PDF; solo no se escribe ni se cambia. Al duplicar una candidata sin Studio, la copia no lleva el mapa.
- En Indie y Pro, el campo «Mapa» y «Mapa general» llevan un candado con la etiqueta «Studio»; al tocarlos se abre
  una ventana que lo explica, con «Ver planes de suscripción». Si eres parte del equipo (no quien administra), te
  dice que en ese proyecto depende del plan de quien lo administra.
- **El servidor también lo controla**: el enlace corto de un mapa (`/api/maps/resolve`) y la subida de los modelos de
  escenarios (`m3~s~…`) y sus plantas (`m3p~…`) se aceptan solo en proyectos cuyo dueño tiene Studio; si no, responde
  403 con un mensaje amable. Los modelos de personajes (`m3~c~…`) siguen igual. Quitar lo que ya estaba sí se puede.
- API para otras partes de la app (en `src/proyectos.js`): `studioFeat(k)`, `studioLockHTML(k)` y `studioAsk(k)`,
  con `k` = `'mapas'` o `'set3d'`. No toqué `src/escenarios-3d.js`.

## Cómo lo probé

- Servidor: `cd server && node --test --test-force-exit` → 104 pruebas, todas bien (actualicé billing, paddle,
  plans, cuenta, api, mapas, rendimiento y seguridad-web; agregué la de mapas según el dueño del proyecto y la del
  aviso a la lista de espera).
- App: todas las pruebas de `test/` siguen pasando (salvo `pdf.test.js`, que fallaba desde antes) y agregué
  `test/planes-ad.test.js`.
- En el navegador, con el servidor completo y cuentas de prueba: cuenta gratis (botón de la cuenta, ventana de
  planes, aviso de un guion, explorar el ejemplo), Pro (candado en Scouting, la ventana de Studio, «Mapa general»),
  Studio (todo abierto), alguien de Pro en un proyecto de Studio (abierto) y al revés (candado), aviso de solo
  lectura con los tres botones, el panel (lista de espera y códigos), la portada y las páginas legales; también en
  inglés y en el teléfono.

## Para que decidas

- **El programa de escritorio** tiene su propia prueba de Pro de 15 días (`desktop/license.js`, `trialDays` en
  `desktop/brand.json`). No la toqué: es otra cosa (licencia sin conexión, no un plan de suscripción). Si también la
  quieres quitar, avísame (hay que cuidar que a quien ya la empezó no se le corte).
- Si cuando aprietes «Avisar a la lista de espera» quieres que la política de privacidad lo mencione, se agrega una
  línea; ahora solo dice que si te anotaste en la antigua lista de espera, borramos tu correo cuando lo pidas.
- Un proyecto con escenarios 3D importados que se copia, se importa de un archivo o se guarda desde el ejemplo en
  una cuenta que no es Studio no sube esos modelos (el servidor los rechaza y la app muestra la ventana de Studio).
