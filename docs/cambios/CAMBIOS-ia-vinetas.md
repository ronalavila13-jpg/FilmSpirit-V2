# Studio · viñetas generadas con IA (30 de octubre de 2026)

En el plan **Studio** y solo en la **versión web con servidor**, la imagen de una viñeta del storyboard se puede generar con
el modelo de imagen de Google («Nano Banana»), con la **key propia** de cada persona: Google le cobra a ella, FilmSpirit no
maneja saldos. La imagen de IA **no reemplaza a los muñecos 3D**: se guarda aparte y se activa o desactiva desde fuera de la viñeta.

## Cómo funciona

- **La key vive en el servidor, cifrada** (AES-256-GCM, `server/lib/ia.js`) y nunca vuelve al navegador ni a los registros.
  El navegador le pide al servidor la imagen; el servidor llama a Google. Por eso la CSP no cambia y funciona en cualquier navegador.
- **Quién genera:** quien tiene *su propio* plan Studio y su key guardada. En un proyecto compartido, cada colaborador Studio usa su key.
  Sin Studio: el aviso de siempre (`studioAsk('ia')`).
- **Modelos** (constante `IA_MODELS` en `server/lib/ia.js`, los ID de Google cambian seguido; confirmados el 30-oct-2026 en
  <https://ai.google.dev/gemini-api/docs/image-generation>): `gemini-nano-banana-2.1` (por defecto), `gemini-3.1-flash-lite-image`
  (económico, 1K) y `gemini-3-pro-image` (premium). Todas las imágenes llevan la marca SynthID de Google.

## Servidor

- `users.ia_key` (cifrada) y `users.ia_model`: migración 13 en `server/lib/db.js`.
- `GET|PUT|DELETE /api/me/ia`: estado (`studio`, `hasKey`, `last4`, `model`, `models`), guardar (valida la key con Google antes) y quitar.
- `POST /api/ia/imagen` `{ prompt ≤ 4000, refs ≤ 6 (cada una ≤ 2 MB), aspect }` → `{ image }` (data URL). No guarda nada. 12 por minuto.
  Errores: `plan_studio` (403), `ia_nokey` (409), `ia_key` (400), `ia_quota` (402), `ia_blocked` (422), `ia_timeout` (504), `too_large` (413).
- `/api/me` agrega solo `ia: { key: bool }`.
- Secreto de cifrado: `IA_KEY_SECRET` o `DATA_DIR/ia-secreto.key` (se crea solo). **Hay que respaldarlo con la base de datos**
  (ver `server/LEEME-VPS.md`).

## Cliente (`src/ia.js`, solo en la versión servidor)

- **Ajustes:** menú de la cuenta › «Inteligencia artificial (Studio)…»: enlace para crear la key, campo de contraseña, modelo, «Quitar la key».
- **Ficha del personaje › pestaña «IA»:** descripción (≤ 600 car.; si está vacía se usa su «Apariencia» de Historia), hasta 3 fotos de
  referencia (`FRAMES['ai~<id>~<n>']`), «Usar también las fotos de Cuerpo» y «Generar retrato de referencia». Se confirma con «Guardar»
  y se descarta con «Cancelar». `look.ai` no entra en las claves de las miniaturas (`lookNoAi`): escribir la descripción no las rehace.
- **Viñeta:** «⋯ › Generar imagen con IA…» (también clic derecho, en Cuadros, Plantas y Lista): estilo (boceto / color / realista),
  «Respetar el encuadre de la viñeta 3D» (manda la escena 3D sola como guía), indicaciones y avisos de personajes sin descripción.
  El pedido (`iaShotPrompt`) lleva el encabezado de la escena, tamaño, ángulo, movimiento, lente, acción, personajes y estilo, con
  hasta 6 imágenes (la guía + 2 por personaje). «Usar en la viñeta» la guarda en `FRAMES[<plano>~ia]` (WebP 90 %, cuenta en el espacio del plan).
- **Activar / desactivar sin abrir el editor:** pastilla «IA» en la tarjeta (`sh.ia`) y el interruptor «Viñetas: 3D | IA» de la barra del
  Storyboard (`P.meta.iaOff`). Con «3D» todas muestran los muñecos aunque tengan imagen de IA. Tarjetas, plantas y PDF siguen lo que se ve
  (`drawShotFrame` → `shotThumb`). Todo se deshace (`histNote` + `toastUndo`).

## Pruebas

- `server/test/ia.test.js` (Google simulado): cifrado, validación de la key, la key no sale en ninguna respuesta, plan, límites y errores.
- `test/ia-cliente.test.js`: el pedido, la proporción, el tope de referencias y que la imagen de IA se vea solo con `sh.ia` y sin `iaOff`.

## Fuera de este cambio

Generar todas las viñetas de una escena de una vez; historial de versiones generadas; actualizar la política de privacidad pública con el
envío a Google (hay que hacerlo antes de abrirlo a clientes).

## Límites conocidos

- Deshacer «Imagen de IA…» solo vuelve el plano a mostrar lo anterior: la imagen reemplazada no se restaura (si se restaurara, rehacer borraría la nueva del servidor).
- Lo generado y no usado se conserva en memoria por plano (`IA_LAST`) hasta usarlo o recargar la página.
- Deshacer la *primera* imagen de IA de un plano oculta la imagen (`sh.ia` vuelve a nada) pero deja el archivo guardado hasta «Borrar la imagen de IA».
- El animatic sigue mostrando la escena 3D animada.
