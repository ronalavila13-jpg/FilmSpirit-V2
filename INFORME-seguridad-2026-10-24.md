# FilmSpirit · informe de seguridad (24 de octubre de 2026)

## En resumen

La app está bien protegida en lo principal. No encontré ninguna forma de entrar a la cuenta de otra persona, de leer
proyectos ajenos ni de tomar el control del servidor. Encontré **3 problemas reales**. Uno importa por dinero: Pro sin
pagar con Paddle. Los otros dos son menores. Hay además **3 sospechas** que solo se pueden confirmar mirando la VPS o el
proveedor de correo. Los tres problemas del servidor y de la web ya están arreglados en el **lote O**. El de la app de
escritorio queda para su próxima versión.

**Qué se revisó y cómo.** Usé el método de auditoría de Cloudflare (`security-audit`) en su modo rápido: 9 revisores
por zonas (entrada y sesiones, proyectos y permisos, secciones, pagos, páginas públicas, la app en el navegador,
escritorio, instalación en la VPS y abuso de recursos), una revisión final de lo que faltaba y un verificador
independiente para cada posible hallazgo. Todo se probó con datos de prueba en una copia aislada y sin internet.
**No se tocó la VPS ni filmspiritpro.com.** El código revisado es el del lote N.

Es una primera pasada, no una revisión completa. Dos zonas quedaron para la siguiente (ver «Lo que falta revisar»).

## Problemas confirmados (por prioridad)

### 1. Pro gratis repitiendo la prueba de Paddle · prioridad media · ARREGLADO

**Qué pasa.** Alguien fuera del Perú que ya usó su prueba gratis podía conseguir Pro sin pagar. Primero inicia un
pago normal de Pro. Después, desde la página de pago, arma por su cuenta dos compras con el precio «con prueba» y el
mismo número de pago. La primera se rechazaba bien. La segunda se aceptaba porque el servidor ya no veía ese pago
como «nuevo», y saltaba el control. Resultado: Pro por unos 33 días, sin ningún cobro, y repetible.

**A quién afecta.** A tus ingresos y a los límites de los planes. No expone datos de nadie.

**Arreglo.** Una suscripción de Paddle solo se une a un pago que todavía está pendiente, y el precio con prueba se
rechaza siempre que el servidor no la haya ofrecido. Lo mismo para Lemon Squeezy. Lo reproduje antes del arreglo
(el usuario quedaba en Pro con 0 pagos) y hay una prueba nueva que lo comprueba.

**Conviene mirar** si ya pasó. En la VPS, este comando solo lee la base de datos y lista las suscripciones de Paddle
activas, sin prueba y sin ningún pago (debería salir `[]`):

```
sudo -u filmspirit node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/var/lib/filmspirit/filmspirit.db',{readOnly:true});console.log(d.prepare(\"SELECT s.id,s.uid,s.ext_id FROM subs s WHERE s.provider='paddle' AND s.status='authorized' AND s.trial=0 AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.sid=s.id)\").all())"
```

### 2. Se podía borrar el registro del guion cerrado · prioridad baja · ARREGLADO

**Qué pasa.** Con el guion cerrado, quien producción autoriza a revisar puede agregar líneas al registro de cambios.
Pero también podía borrar todas menos la última, borrar las revisiones cerradas anteriores y agregar líneas
inventadas. Tú ya no verías el historial real.

**Arreglo.** Ahora solo se puede agregar. Lo viejo sale solo al llegar al tope de 1500 líneas, como ya hacía la app.

### 3. App de escritorio: cambios fuera de su área que el equipo acepta · prioridad baja · PENDIENTE (escritorio)

**Qué pasa.** En proyectos compartidos por carpeta, un jefe de área solo puede tocar sus áreas del desglose, y nadie
sin autorización puede tocar el guion cerrado. Los demás rechazan un cambio que no cumple, pero solo cuando llega
justo después de la versión que tenían. Si el archivo salta números de versión, o si los demás estaban
desconectados, el cambio se acepta (a veces con un aviso) y el productor no lo repara. Para aprovecharlo hay que ser
del equipo y fabricar el archivo a mano, porque la app normal no lo deja hacer.

**Por qué no va en este lote.** Arreglarlo bien obliga a cambiar el formato de los archivos compartidos: cada cambio
tiene que decir de qué versión parte, y cada computadora tiene que recordar la última versión buena. Eso se publica
como versión nueva de la app de escritorio. Rechazar sin más haría perder cambios legítimos hechos sin conexión.

## Por confirmar (necesitan un dato de afuera)

Esto no se puede confirmar ni descartar desde el código. Te digo qué mirar.

**A. Otra cuenta de Google con el mismo correo.** Si alguien entra con una cuenta de Google distinta que tiene tu
mismo correo, el servidor le pasaba el correo, y con él las invitaciones pendientes y, si es un correo de
administración, el panel de admin. Google normalmente no permite dos cuentas con el mismo correo, así que el riesgo
depende de qué correos usas. **Ya protegí los correos de administración** (ahora se rechaza). **Qué mirar:**
- Si los correos de `ADMIN_EMAILS` son Gmail o de un dominio de Google Workspace que tú controlas.
- Si ya pasó alguna vez. En la VPS (solo lee; debería salir `[]`):

  ```
  sudo -u filmspirit node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('/var/lib/filmspirit/filmspirit.db',{readOnly:true});console.log(d.prepare(\"SELECT id,email,sub FROM users WHERE email LIKE '%#%'\").all())"
  ```

  Si sale algo, alguien entró con otra cuenta de Google y ese correo cambió de dueño.

**B. Libro de reclamaciones: copias repetidas al mismo correo.** El límite de 2 copias por correo se podía saltar
escribiendo el correo de otras formas (`ana+1@…`, `a.na@…`). **Ya lo arreglé** (cuenta por buzón y rechaza formas
raras). Lo único sin confirmar es si Resend o Brevo aceptaban esas formas. Ya no hace falta mirarlo.

**C. Nombre del escenario 3D en un aviso.** El nombre que pone un colaborador se mostraba sin escapar en el aviso
«Quitar el escenario 3D». La política de seguridad de la página ya bloquea scripts, así que no se podía ejecutar
código. No pude probar en un navegador si se podía mostrar algo engañoso. **Ya lo arreglé** (se muestra como texto).

## Mejoras recomendadas (no son fallas, pero suman)

En orden de utilidad:

1. **Si usas Cloudflare delante de la VPS:** configura nginx con `real_ip` y las IPs de Cloudflare, y cierra el
   puerto 443 para todo lo que no sea Cloudflare. Sin eso, los límites por IP ven a todos como la misma IP de
   Cloudflare.
2. **Respaldo diario:** su servicio de systemd no tiene las protecciones del servicio principal (`ProtectSystem`,
   `UMask=0077`…). Se puede copiar ese bloque. Ojo: `actualizar.sh` no reescribe los servicios, se hace una vez a mano.
3. **Sesiones:** ponerles una duración máxima absoluta, y usar el prefijo `__Host-` en la cookie.
4. **Mercado Pago:** revisar la hora del aviso firmado (rechazar los muy viejos) y usar el id firmado en lugar del
   del cuerpo.
5. **Códigos promocionales:** el tope de usos puede pasarse por uno o dos si dos personas lo usan a la vez.
6. **Invitaciones:** se aceptan con solo abrir el enlace. Mejor pedir un clic.
7. **Modo sin conexión:** los datos guardados en el navegador no se separan por cuenta. Si dos personas usan la misma
   computadora, conviene borrarlos al salir.
8. **Escritorio:** las imágenes compartidas no tienen versión (se puede «devolver» una imagen vieja firmada), y el
   número de versión de las llaves no va firmado.
9. Detalles menores: descompresión de modelos 3D en bloque (`m3Ok`), el orden del costo en `frames/get`, el
   `bdFilter` con etiquetas vacías, y `style-src 'unsafe-inline'` en la política de seguridad.

## Lo que salió bien

Inicio de sesión con Google bien verificado. Protección contra formularios falsos (cabecera propia y origen). Cada
sección se filtra en el servidor según el permiso de cada persona. Ruta de archivos estáticos sin escapes. Política
de seguridad sin scripts en línea. Avisos de pago firmados y verificados de nuevo contra el proveedor. Topes de
tamaño, cuotas y límites por IP. La app de escritorio aísla bien la ventana de los permisos del sistema.

## Lo que falta revisar (próxima pasada)

- **Imágenes de Gastos para gastos que aún no existen:** si una foto subida antes queda unida a un gasto que otra
  persona crea después con ese número.
- **Prueba gratis y códigos al entrar:** si la prueba o un código se pueden conseguir más de una vez por persona o
  computadora (usa la cookie del dispositivo y la zona horaria que manda el navegador).
- **Escritorio:** `preload.js` y `license.js` no venían en el código, así que no se revisaron.

Los archivos técnicos de la auditoría (hallazgos en el formato del método, plan de cobertura y pruebas de cada
verificador) van en `auditoria-tecnica.zip`, para una próxima pasada.
