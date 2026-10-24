# FilmSpirit · lote F (22 de octubre de 2026): seguridad de la web, sin Cloudflare

Revisión con la guía de 10 pasos de Cloudflare, aplicada sin contratar Cloudflare. Todo es del servidor.

**Cómo aplicarlo.** Usa `filmspirit-servidor.zip`, que ya trae los lotes A a F. En la VPS:

`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`

`actualizar.sh` ahora también pone los límites de nginx: no hay que hacer nada más.

El ZIP del lote trae solo los archivos cambiados, para tu carpeta `octavos/`.

## Qué cambió

### 1. El panel de administración pide haber entrado hace poco
`/admin` y todo lo que hace el panel piden haber entrado con Google en las últimas 12 horas. Si la sesión es más
vieja, te lleva a «Entrar» con el aviso «Por seguridad, el panel de administración pide que vuelvas a entrar con
Google», y ahí eliges tu cuenta de nuevo.
- **Por qué:** una sesión olvidada abierta en otro equipo ya no basta para dar planes, suspender cuentas o leer los
  reclamos.
- **La app sigue igual:** la sesión de 30 días vale para todo lo demás.
- **Se puede cambiar:** con `ADMIN_SESSION_HOURS` en `/etc/filmspirit/filmspirit.env`.

### 2. Límites por IP en nginx, antes de llegar a la app
Un archivo nuevo, `/etc/nginx/conf.d/filmspirit-limites.conf`. No toca la configuración del sitio ni el certificado.

| Qué | Límite por IP |
|---|---|
| `/api/` | 30 por segundo, con margen de 300 de golpe |
| Entrar con Google | 10 por minuto, con margen de 20 |
| Conexiones abiertas a la vez | 120 |

- **Los cambios en vivo** no cuentan para las solicitudes: se reconectan solos.
- **Una oficina entera** detrás de una misma IP entra holgada.
- **Lo que pasa el límite** recibe 429 («Demasiadas solicitudes»), como los límites de la app, que siguen por persona.
- **Si nginx no aceptara el archivo,** el script lo deja como estaba y nginx sigue funcionando.

Se probó con nginx de verdad (Ubuntu 24.04, como la VPS):
- `/api/` dejó pasar 304 de 330 solicitudes de golpe;
- entrar con Google, 21 de 30;
- de 150 conexiones lentas a la vez, quedaron 120;
- los cambios en vivo no se bloquearon;
- un archivo dañado no rompió nginx.

### 3. La tabla de límites de la app tiene tope
La app guarda en memoria cuántas veces pidió algo cada IP o cuenta. Con miles de IP distintas, esa tabla crecía sin
tope durante 10 minutos. Ahora llega a 100 000 claves como mucho: primero se quitan las vencidas y luego las más viejas.

### 4. El país ya no se cree de cualquiera
La app leía el país de cabeceras como `CF-IPCountry`, que sin un servicio delante cualquiera puede inventar. Ahora solo
la lee si `GEO_HEADER` dice cuál es (con Cloudflare, `CF-IPCountry`). Sin eso, el país sale de la zona horaria y del
idioma del navegador. El riesgo era bajo: solo cambiaba la región de pago, que igual se elige a mano.

### 5. Topes en los formularios públicos
- **Libro de reclamaciones:**
  - la copia a tu correo de soporte tiene un tope de 200 al día (`RECLAMOS_SOPORTE_DIA`);
  - las hojas se guardan siempre y se ven en el panel;
  - la copia a cada persona ya tenía su tope.
- **Lista de espera de Studio:**
  - hasta 500 correos nuevos al día (`ESPERA_DIA`);
  - quien ya está se puede volver a anotar.

### 6. Pestaña «Seguridad» en el panel
Muestra las últimas 24 horas:
- **Bloqueos por límite**, por tipo (entrar con Google, guardados, lecturas pesadas, pagos, formularios…).
- **Inicios de sesión rechazados**, por motivo.
- **Avisos de pago con firma falsa**, por medio de pago.
- **Las IP o cuentas que más chocaron** con un límite.
- **Las sesiones abiertas** y quién administra el panel.

Cada hora queda una fila en la bitácora con lo que hubo, así que el resumen sobrevive a un reinicio.

## Lo que te toca en los paneles (gratis)
- **Verificación en dos pasos** en:
  - las cuentas de Google de `ADMIN_EMAILS`;
  - Hostinger;
  - el registrador del dominio;
  - Mercado Pago y Paddle;
  - el servicio de correo;
  - Google Cloud.
- **SSH solo con llave** (ya estaba en la guía).
- **Un monitor gratuito** (por ejemplo UptimeRobot) que revise `https://tudominio.pe/healthz` cada 5 minutos.
- **DNSSEC**, si tu registrador lo ofrece.

Está todo en `server/LEEME-VPS.md`, sección «Seguridad de la VPS».

## Lo que queda sin hacer, a propósito
**Ocultar la IP de la VPS** (paso 6 de la guía) no se puede sin un servicio delante. Queda como riesgo aceptado. Si
algún día hace falta, el plan gratuito de Cloudflare se suma sin rehacer nada.

Antes de encenderlo:
- nginx tiene que leer la IP real del visitante;
- pon `GEO_HEADER=CF-IPCountry`.

## Pruebas
- **`server/test/seguridad-web.test.js`** (nueva):
  - el panel con una sesión de 13 horas pide volver a entrar;
  - la pestaña Seguridad cuenta bloqueos e inicios rechazados y los guarda en la bitácora;
  - el tope de la lista de espera;
  - la copia a soporte del libro de reclamaciones;
  - el tope de la tabla de límites;
  - la cabecera de país.
- **`server/test/plans.test.js`:** la cabecera de país solo vale con `GEO_HEADER`.

Las pruebas nuevas fallan con el código de antes y pasan con el de ahora. Pasan las 68 del servidor.

En el navegador:
- el panel con una sesión vieja lleva a «Entrar» con el aviso, y no salta solo al panel;
- la pestaña Seguridad muestra el inicio rechazado.

## Archivos
`server/`:
- **Código:**
  - `lib/seguridad.js` (nuevo)
  - `lib/auth.js`, `lib/admin.js`, `lib/util.js`, `lib/api.js`, `lib/billing.js`, `lib/reclamos.js`, `lib/geo.js`
  - `server.js`
- **Páginas:** `web/admin.js`, `web/admin.html`, `web/entrar.js`, `web/entrar.html`
- **Textos:** `i18n/es.json`, `en.json`, `pt.json`, `fr.json`, `it.json` (el aviso de volver a entrar)
- **Instalación:**
  - `deploy/nginx-limites.sh` y `deploy/nginx-limites.conf` (nuevos)
  - `deploy/instalar.sh`, `deploy/actualizar.sh`, `deploy/filmspirit.env.ejemplo`
  - `LEEME-VPS.md`
- **Pruebas:** `test/seguridad-web.test.js` (nueva), `test/plans.test.js`

Raíz: `CAMBIOS-lote-F-2026-10-22.md`
