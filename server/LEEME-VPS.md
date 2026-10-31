# Poner FilmSpirit en internet (VPS de Hostinger)

Guía paso a paso. Toma alrededor de una hora la primera vez. Necesitas:

- La VPS **KVM 1** de Hostinger con **Ubuntu 24.04** (1 núcleo, 4 GB de RAM y 50 GB alcanzan para empezar: cientos de usuarios).
- Un **dominio** (por ejemplo `filmspirit.pe`).
- Una **cuenta de Google** para crear el acceso con Google.
- Una **cuenta de Mercado Pago** de vendedor (para cobrar Pro; puede esperar).
- El archivo **`filmspirit-servidor.zip`** (la carpeta `server` lista para subir).

> Las claves (de Google, de Mercado Pago, de correo) se escriben **solo en la VPS**, en el archivo de configuración. No las pegues en chats, correos ni documentos.

## 1. Apunta el dominio a la VPS

1. En Hostinger, abre **VPS › Resumen** y copia la **dirección IP**.
2. En el panel donde compraste el dominio, abre el **DNS** y crea:
   - Registro **A**, nombre `@`, valor: la IP de la VPS.
   - Registro **A**, nombre `www`, valor: la misma IP (o un **CNAME** `www` que apunte a tu dominio).
   - Si ya había un registro **A** de `@` o de `www` (la página de estacionamiento de Hostinger), **edítalo**: no dejes dos registros A con valores distintos.
3. Espera unos minutos (a veces hasta una hora). Puedes comprobarlo con `ping tudominio.pe` desde tu computadora.

## 2. Sube la app

Desde tu computadora (PowerShell en Windows, Terminal en Mac):

```
scp filmspirit-servidor.zip root@IP_DE_TU_VPS:/root/
ssh root@IP_DE_TU_VPS
```

Ya dentro de la VPS:

```
apt-get update && apt-get install -y unzip
cd /root && unzip -o filmspirit-servidor.zip
cd /root/server
```

(También puedes usar la **Terminal del navegador** de Hostinger y subir el zip con WinSCP o FileZilla.)

## 3. Instala

```
sudo bash deploy/instalar.sh tudominio.pe tu@correo.com
```

El instalador pone Node 22, nginx, el certificado HTTPS gratuito (se renueva solo), el cortafuegos, el servicio que arranca solo y el respaldo diario. Al terminar debe decir **«FilmSpirit está funcionando»**. Si el certificado falla, revisa el paso 1 y vuelve a ejecutar el mismo comando: no rompe nada.

## 4. Entrar con Google

1. Entra a <https://console.cloud.google.com> y crea un proyecto llamado **FilmSpirit**.
2. Abre **Google Auth Platform** (antes «Pantalla de consentimiento de OAuth»):
   - **Información de la marca:** nombre «FilmSpirit», tu correo de soporte, el logo (`server/public/favicon.svg` convertido a PNG de 120 × 120), la página principal `https://tudominio.pe`, la política de privacidad `https://tudominio.pe/privacidad` y las condiciones `https://tudominio.pe/terminos`. Agrega `tudominio.pe` en **Dominios autorizados**.
   - **Público:** tipo **Externo**, y pulsa **Publicar la aplicación** (pasa a «En producción»). FilmSpirit solo pide nombre, correo y foto, así que no requiere la verificación larga de Google.
3. En **Clientes › Crear cliente**: tipo **Aplicación web**, nombre «FilmSpirit web».
   - **Orígenes autorizados de JavaScript:** `https://tudominio.pe` y `https://www.tudominio.pe`.
   - No hace falta poner URI de redireccionamiento.
4. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`).

**Si no se puede entrar con Google**, revisa lo que muestra la ventana de Google al tocar el botón:
- «Acceso bloqueado» o «Error 403: access_denied»: la app sigue **en prueba** (solo entran los usuarios de prueba). En **Público**, pulsa **Publicar la aplicación**.
- «Error 400: origin_mismatch»: falta tu dirección en **Orígenes autorizados de JavaScript** (con y sin `www`). Los cambios de Google tardan unos minutos.
- Un mensaje rojo debajo del botón: lo explica el propio mensaje (por ejemplo, el `GOOGLE_CLIENT_ID` del archivo de configuración no es el mismo del cliente). El servidor lleva solo a la dirección de `BASE_URL` a quien entra por la otra (con o sin `www`).

## 5. Configura FilmSpirit

```
sudo nano /etc/filmspirit/filmspirit.env
```

Completa como mínimo:

```
GOOGLE_CLIENT_ID=el-id-que-copiaste.apps.googleusercontent.com
ADMIN_EMAILS=tu-correo-de-google@gmail.com
SUPPORT_EMAIL=hola@tudominio.pe
BUSINESS_NAME=Razón social S.A.C.
BUSINESS_RUC=20XXXXXXXXX
BUSINESS_ADDRESS=Dirección fiscal, Trujillo, La Libertad
LEGAL_DATE=15 de octubre de 2026
```

Guarda (Ctrl+O, Enter, Ctrl+X) y aplica:

```
sudo systemctl restart filmspirit
```

Abre `https://tudominio.pe`, entra con Google y crea un proyecto. Con tu correo en `ADMIN_EMAILS` verás **Panel de administración** en el botón de tu cuenta (o en `https://tudominio.pe/admin`).

## 6. Cobrar en el Perú con Mercado Pago

Primero en **modo de prueba**, luego en producción.

1. Entra a <https://www.mercadopago.com.pe/developers> › **Tus integraciones › Crear aplicación** (tipo pagos en línea, producto **Suscripciones**).
2. **Pruebas:** en la aplicación, crea dos **cuentas de prueba** (una de vendedor y otra de comprador). Entra con la de vendedor y copia su **Access Token** de prueba.
3. En la aplicación, abre **Webhooks › Configurar notificaciones**:
   - URL: `https://tudominio.pe/api/billing/webhook`
   - Eventos: **Planes y suscripciones** (suscripciones y pagos autorizados).
   - Guarda y copia la **clave secreta**.
4. En la VPS:
   ```
   MP_ACCESS_TOKEN=el-access-token
   MP_WEBHOOK_SECRET=la-clave-secreta
   ```
   y `sudo systemctl restart filmspirit`. La clave secreta es obligatoria: sin ella el servidor rechaza los avisos de
   Mercado Pago (por seguridad) y las suscripciones se activan recién en el repaso de cada hora.
5. Prueba con la cuenta de comprador de prueba: botón de tu cuenta › **Ver planes de suscripción** › Pro › Perú · soles › Continuar a Mercado Pago. Al volver, la app debe decir «¡Ya tienes FilmSpirit Pro!». En el panel, pestaña **Suscripciones**, la verás activa.
6. **Producción:** activa las credenciales de producción (Mercado Pago pide los datos de tu negocio), reemplaza el Access Token por el de producción y reinicia. La URL del webhook es la misma (en el modo productivo).

> El correo que la persona escribe en «Correo de tu cuenta de Mercado Pago» debe ser el de la cuenta con la que pagará; por eso la app lo pregunta.

## 7. Cobrar fuera del Perú con Paddle

Quien entra desde el Perú ve los precios en soles y paga con Mercado Pago; desde otro país ve dólares y paga con tarjeta, PayPal o Apple Pay en Paddle (que cobra los impuestos de cada país, emite los comprobantes y te paga a ti). El país se detecta por la conexión, la zona horaria y el idioma del navegador; la persona puede cambiarlo a mano en la ventana de planes.

1. Crea tu cuenta en <https://www.paddle.com> y, para probar, otra en <https://sandbox-vendors.paddle.com> (la cuenta de prueba). Paddle revisa tu web antes de aprobar la cuenta real: deben verse los precios, los términos, la privacidad y la política de devoluciones (están en la portada y en `/terminos`).
2. **Catalog › Products**: crea tres productos, «FilmSpirit Indie», «FilmSpirit Pro» y «FilmSpirit Studio». A cada uno, dos precios recurrentes:
   - Indie: **US$ 7,99 al mes** y **US$ 79 al año**
   - Pro: **US$ 14,99 al mes** y **US$ 149 al año**
   - Studio: **US$ 39 al mes** y **US$ 390 al año**

   Copia el id de cada precio (`pri_…`). Ningún plan tiene prueba gratis: ya no hacen falta precios con **Trial period** (si ya creaste los de Pro con 30 días y alguien empezó su prueba con ellos, deja `PADDLE_PRICE_PRO_MONTH_TRIAL` y `PADDLE_PRICE_PRO_YEAR_TRIAL` en el `.env` hasta que esas pruebas terminen: el servidor los sigue reconociendo, pero no los ofrece a nadie).
3. **Catalog › Discounts › New discount**: código `FUNDADOR`, 20 %, **Recurring** (se repite en cada cobro), válido para Pro y con fecha de fin **28 de febrero de 2027**. Copia su id (`dsc_…`).
4. **Developer tools › Authentication**: crea una **API key** (con permisos de escritura) y un **Client-side token**.
5. **Developer tools › Notifications › New destination**:
   - URL: `https://tudominio.pe/api/billing/paddle-webhook`
   - Eventos: `subscription.created`, `subscription.activated`, `subscription.updated`, `subscription.canceled`, `subscription.paused`, `subscription.resumed`, `subscription.past_due`, `transaction.completed`, `transaction.paid`, `adjustment.created`, `adjustment.updated`.
   - Copia la **Secret key** del destino.
6. **Checkout › Checkout settings › Default payment link**: `https://tudominio.pe/pagar` (la página de pago de FilmSpirit abre el pago de Paddle encima).
7. En la VPS (`sudo nano /etc/filmspirit/filmspirit.env`), primero con los datos de la cuenta de prueba:
   ```
   PADDLE_ENV=sandbox
   PADDLE_API_KEY=la-api-key
   PADDLE_CLIENT_TOKEN=test_…
   PADDLE_WEBHOOK_SECRET=pdl_ntfset_…
   PADDLE_PRICE_INDIE_MONTH=pri_…
   PADDLE_PRICE_INDIE_YEAR=pri_…
   PADDLE_PRICE_PRO_MONTH=pri_…
   PADDLE_PRICE_PRO_YEAR=pri_…
   PADDLE_PRICE_STUDIO_MONTH=pri_…
   PADDLE_PRICE_STUDIO_YEAR=pri_…
   PADDLE_DISCOUNT_FUNDADOR=dsc_…
   ```
   y `sudo systemctl restart filmspirit`.
8. Prueba desde la ventana de planes con «Otro país · dólares» y la tarjeta de prueba `4242 4242 4242 4242` (cualquier fecha futura, CVC `100`). Al volver, la app debe decir «¡Ya tienes FilmSpirit Pro!». Las personas ven sus recibos, cambian la tarjeta o cancelan desde el botón de su cuenta (portal de Paddle).
9. Cuando Paddle apruebe tu cuenta real: repite los pasos 2 a 6 en ella (los id cambian), cambia `PADDLE_ENV=production`, pon los datos nuevos y reinicia.

> Si Paddle está vacío y Lemon Squeezy configurado (`LS_*`), los pagos de fuera del Perú siguen yendo a Lemon Squeezy como antes.

> **Studio** está siempre a la venta (ya no hace falta `STUDIO_OPEN`; si está en el `.env`, se ignora). Lo exclusivo de Studio son los mapas en Scouting y los escenarios 3D importados. La lista de espera se cerró: en el panel, pestaña **Lista de espera**, el botón «Avisar a la lista de espera que Studio abrió» envía un correo a cada persona que aún no lo recibió (una sola vez; necesita el correo configurado). No se envía nada solo: tú decides cuándo.

> **Precio de fundador:** hasta `FOUNDER_UNTIL` (28 de febrero de 2027), Pro cuesta S/ 39 al mes en el Perú y, fuera, se aplica solo el código FUNDADOR. Quien se suscribe en ese plazo mantiene el precio mientras siga suscrito.

> **País más preciso:** si algún día pones Cloudflare delante del dominio (plan gratuito), el país llega en la cabecera `CF-IPCountry`: escribe `GEO_HEADER=CF-IPCountry` en la configuración y la detección es exacta. Sin eso se usa la zona horaria y el idioma del navegador.

## 8. Trabajo sin conexión

No hay que configurar nada. La primera vez que alguien abre la app con internet, el navegador guarda la app (página, código, librerías y fuentes) y, al abrir cada proyecto, una copia del proyecto. Sin internet:

- la app abre igual desde `https://tudominio.pe/app/` (con la cuenta que entró antes en ese navegador);
- se abren los proyectos que ya tenían copia en ese equipo, se editan y se exportan (PDF, Excel, video, ZIP);
- los cambios quedan guardados en el equipo («Sin conexión · guardado en este equipo») y se envían solos al volver internet, fusionándose con lo que hizo el equipo mientras tanto.

Al cerrar sesión se borran las copias de ese navegador. Cada vez que actualizas la app en la VPS, los navegadores descargan la versión nueva en la siguiente visita con internet.

## 9. Correos automáticos (opcional)

Para enviar la copia del libro de reclamaciones y los avisos de suscripción, crea una cuenta en **Resend** o **Brevo**, verifica tu dominio y completa:

```
MAIL_PROVIDER=resend
MAIL_API_KEY=la-clave
MAIL_FROM=FilmSpirit <hola@tudominio.pe>
```

Sin esto todo funciona; solo no se envían correos (la persona igual ve e imprime su hoja de reclamación).

Si el servicio de correo falla (caído, sin cupo), FilmSpirit reintenta solo: al minuto, a los 5, a los 15, a la hora… hasta unas 48 horas. Lo que el servicio rechaza (una dirección inválida, el remitente sin verificar) o lo que no sale en ese plazo queda anotado en el panel de administración, pestaña **Bitácora**, como `mail_failed`. Para ver la cola: `sudo sqlite3 /var/lib/filmspirit/filmspirit.db "SELECT id, kind, to_addr, tries, err FROM outbox WHERE sent IS NULL AND dead IS NULL"`.

## Actualizar la web a una versión nueva

Tus datos (`/var/lib/filmspirit`) y tus claves (`/etc/filmspirit/filmspirit.env`) no se tocan: solo se reemplaza la app en `/opt/filmspirit`. Cuenta con **1 o 2 minutos** en los que la web se reinicia.

1. **En tu computadora**, con el `filmspirit-servidor.zip` nuevo (PowerShell en Windows, Terminal en Mac):

   ```
   scp filmspirit-servidor.zip root@IP_DE_TU_VPS:/root/
   ssh root@IP_DE_TU_VPS
   ```

2. **Ya dentro de la VPS**, descomprime en una carpeta limpia (la carpeta `/root/server` solo es de paso: se puede borrar sin riesgo) y entra a ella:

   ```
   cd /root && rm -rf server && unzip -o filmspirit-servidor.zip
   cd /root/server
   ```

3. **Actualiza:**

   ```
   sudo bash deploy/actualizar.sh
   ```

   El programa hace un respaldo de la base de datos, copia la versión nueva, actualiza los límites de nginx, reinicia el servicio y comprueba que responde. Al terminar debe decir **«✔ Actualizado y funcionando»** y, más abajo, **«✔ Respaldo diario funcionando»**. Si algo falla, se detiene con un mensaje y la versión instalada sigue igual.

4. **Compruébalo:** abre `https://tudominio.pe` y recarga sin caché (`Ctrl + Shift + R`, o `Cmd + Shift + R` en Mac). Las pestañas que ya estaban abiertas siguen con la versión anterior hasta que se recargan. También puedes mirar `curl -fsS https://tudominio.pe/healthz` (debe responder `ok`).

5. **Si algo sale mal:** mira los registros con `journalctl -u filmspirit -n 50`. Para volver atrás, sube y descomprime el zip de la versión anterior y repite los pasos 2 y 3; si la base de datos quedó mal, restaúrala con el respaldo de la sección «Restaurar un respaldo».

**Antes de actualizar** conviene bajar a tu computadora el último respaldo (ver «Copia fuera de la VPS»). Si cambiaste a mano archivos dentro de `/opt/filmspirit`, se pierden al actualizar: lo propio va en `/etc/filmspirit/filmspirit.env`.

## Día a día

| Para | Comando |
|---|---|
| Ver si está funcionando | `systemctl status filmspirit` |
| Ver los registros en vivo | `journalctl -u filmspirit -f` |
| Reiniciar | `sudo systemctl restart filmspirit` |
| Actualizar a una versión nueva | sube y descomprime el zip nuevo, entra a su carpeta y ejecuta `sudo bash deploy/actualizar.sh` (hace un respaldo antes; si el zip llega sin los maniquíes 3D, conserva los que ya estaban instalados) |
| Respaldo ahora | `sudo systemctl start filmspirit-respaldo` |
| Dónde están los respaldos | `/var/lib/filmspirit/respaldos` (uno por día, 14 días) |

**Copia fuera de la VPS:** activa las **copias de seguridad** semanales de Hostinger y, de vez en cuando, descarga el último respaldo a tu computadora:

```
scp root@IP_DE_TU_VPS:/var/lib/filmspirit/respaldos/filmspirit-AAAA-MM-DD.db.gz .
```

**Restaurar un respaldo:**

```
sudo systemctl stop filmspirit
gunzip -c /var/lib/filmspirit/respaldos/filmspirit-AAAA-MM-DD.db.gz > /var/lib/filmspirit/filmspirit.db
rm -f /var/lib/filmspirit/filmspirit.db-wal /var/lib/filmspirit/filmspirit.db-shm
chown filmspirit: /var/lib/filmspirit/filmspirit.db
sudo systemctl start filmspirit
```

## Imágenes con IA (plan Studio): la key de Google de cada persona

Cada persona con plan Studio guarda en su cuenta (menú de la cuenta › «Inteligencia artificial (Studio)…») su **propia key de Google**; Google le cobra a ella. El servidor la guarda **cifrada** (AES-256-GCM) en la base de datos y solo la usa para llamar a Google desde la VPS: no vuelve al navegador ni se escribe en los registros.

El cifrado usa un secreto de 32 bytes que el servidor crea solo la primera vez en `/var/lib/filmspirit/ia-secreto.key` (permiso 600), o el que pongas tú en `IA_KEY_SECRET` en `/etc/filmspirit/filmspirit.env`.

- **Respáldalo, pero aparte de los respaldos de la base** (por ejemplo en tu gestor de contraseñas). Los respaldos diarios solo copian la base: sin `ia-secreto.key` (o sin el mismo `IA_KEY_SECRET`), una base restaurada no puede abrir las keys guardadas y cada persona tendría que pegar la suya otra vez; nada se pierde más que eso. Si lo guardas junto a los `.db.gz`, quien robe ese respaldo podría descifrar las keys. Cópialo con: `scp root@IP_DE_TU_VPS:/var/lib/filmspirit/ia-secreto.key .`
- No lo subas a ningún repositorio (el `.gitignore` ya excluye `*.key`).
- La VPS sale a `generativelanguage.googleapis.com` (HTTPS). Cada imagen tarda de 10 a 40 s: nginx ya da 120 s a `/`.
- Límites por persona: 12 imágenes por minuto y 150 por día (`IA_MAX_DIA` en `/etc/filmspirit/filmspirit.env`; el contador diario se reinicia al reiniciar el servicio). Así una sesión robada no puede gastar sin límite la key de Google de la víctima.
- `IA_KEY_SECRET`, si lo usas, debe ser aleatorio de 32 caracteres o más; con una frase corta el servidor avisa en el registro. Lo más simple es dejarlo vacío.
- Guardar, cambiar o quitar una key queda anotado (persona, hora e IP, nunca la key) en la bitácora de auditoría.

## Seguridad de la VPS

- Entra por SSH con una **llave** y desactiva la contraseña de root (Hostinger › VPS › Configuración › Llaves SSH).
- Ubuntu suele instalar solas las actualizaciones de seguridad. Una vez al mes: `sudo apt-get update && sudo apt-get upgrade -y` y reinicia la VPS.
- El cortafuegos deja pasar solo SSH, HTTP y HTTPS. La app escucha solo dentro de la VPS (puerto 8080) y nginx la publica con HTTPS.
- **Límites por IP en nginx** (`/etc/nginx/conf.d/filmspirit-limites.conf`): los pone el instalador y los actualiza `deploy/actualizar.sh`. Para ponerlos a mano: `sudo bash deploy/nginx-limites.sh`. Lo que pasa el límite recibe 429; para verlo: `grep " 429 " /var/log/nginx/access.log | tail`.
- **El panel de administración** pide haber entrado con Google en las últimas 12 horas (`ADMIN_SESSION_HOURS`). Su pestaña **Seguridad** muestra los bloqueos, los inicios rechazados y los avisos de pago con firma falsa de las últimas 24 horas.

**Verificación en dos pasos** (gratis, en cada servicio): las cuentas de Google de `ADMIN_EMAILS`, Hostinger, el registrador del dominio, Mercado Pago, Paddle, el servicio de correo (Resend o Brevo) y Google Cloud (donde está el «ID de cliente» para entrar con Google).

**Que te avise si la web se cae:** un monitor gratuito (por ejemplo UptimeRobot) que revise `https://tudominio.pe/healthz` cada 5 minutos y te escriba si no responde.

**DNSSEC:** si tu registrador lo ofrece, actívalo (protege que nadie falsifique a dónde apunta tu dominio). Se comprueba en dnsviz.net.
