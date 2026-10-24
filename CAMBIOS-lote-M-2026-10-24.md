# FilmSpirit · lote M (24 de octubre de 2026): revisión legal y de accesibilidad de la web

Revisé la web pública (portada, entrar, pago, términos, privacidad, libro de reclamaciones) y la ventana de pago de la
app sobre el código del lote L. No pude abrir https://filmspiritpro.com desde aquí (la red de esta máquina no llega a tu
dominio), así que todo lo que digo sale del código y de una copia del servidor corriendo en local.

**No es asesoría legal.** Señalo lo que encontré y lo que cambié con criterio de buenas prácticas y de las normas que
cito; antes de dar por cerrados los textos legales, que los revise un abogado en el Perú.

**Cómo aplicarlo.** Igual que el lote L: en la VPS,
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
No hay migración ni variables nuevas. En el código fuente, descomprime encima de tu carpeta y arma como siempre.

## Lo que ya estaba bien (no lo toqué)

- **Términos, privacidad y Libro de Reclamaciones virtual ya existían**, enlazados en el pie de la portada y en la
  página de entrar. El libro tiene número correlativo, los datos que pide el reglamento, la copia al correo y el plazo de
  15 días hábiles.
- **No hay analytics ni píxeles de seguimiento.** No hay Google Analytics, Meta, Hotjar ni nada parecido. El único
  contenido de terceros es el botón de Google en /entrar y la ventana de Paddle en /pagar (Mercado Pago se abre en su
  propia página).
- **No hay reseñas falsas.** La portada solo muestra un testimonio si existe `testimonio.json` en la VPS, escrito por ti.
- **Imágenes y fuentes:** las de la portada son capturas de la propia app y tu logotipo; las fuentes son SIL OFL; los
  maniquíes 3D salen de MakeHuman (CC0) y la ropa y el pelo se generan por código. Todo está en `/licencias.txt`.
- **Accesibilidad:** pasé axe (WCAG 2.2 AA y buenas prácticas) por las 6 páginas públicas en claro y oscuro, escritorio
  y celular: cero problemas de contraste, textos alternativos o etiquetas.
- **Afirmaciones:** revisé las de la portada contra el código. «Copias de seguridad diarias» es cierto (respaldo diario de
  la base, donde también están las imágenes), igual que «sin internet sigues trabajando» y los límites de cada plan.

## Qué cambié

1. **Una cookie se ponía a todas las visitas.** `fs_dev` (la marca del navegador para que la prueba gratis no se repita)
   se ponía, por 2 años, a cualquiera que abría la portada, aunque nunca creara cuenta. Ahora se pone solo al entrar con
   Google, que es el único momento en que se usa. Quien solo mira la web no recibe ninguna cookie. (`server.js`)
2. **Política de privacidad completada** (`web/privacidad.html`): la lista de espera de Studio, el servicio de correos,
   que hay datos que salen del Perú (Google, Paddle, correos), que no hay analytics ni perfiles, la portabilidad (la pide
   el reglamento nuevo de la Ley 29733), menores de edad, y una sección de **cookies** con tabla (nombre, para qué,
   duración) y lo que se guarda en el navegador.
3. **Página nueva de cancelaciones y reembolsos** (`/reembolsos`): resume lo que ya decían los Términos (cancelas cuando
   quieras, sin reembolso de periodos parciales salvo la ley, la prueba no cobra si cancelas antes) y agrega cómo pedir
   una devolución, por Mercado Pago o por Paddle. Enlazada en el pie, en las condiciones de los planes y en los Términos.
4. **La renovación automática ahora se dice antes de pagar.** En la ventana de pago de la app: «Se renueva sola en cada
   periodo hasta que la canceles… Al continuar aceptas los Términos y la política de cancelaciones y reembolsos», con
   enlaces. En la portada, una línea nueva en Condiciones. En los 5 idiomas. (`src/cuenta.js`, `i18n/*.json`)
5. **Aviso de privacidad en los formularios**: bajo la lista de espera de Studio y en el Libro de Reclamaciones, para
   qué se usa el dato y el enlace a la política. No puse casillas de «acepto» porque no hacen falta (ver abajo).
6. **Casting y Locaciones** en la portada decían «Incluido en el plan Studio» sin aclarar que Studio todavía no se vende.
   Ahora llevan la etiqueta «Lista de espera» mientras `STUDIO_OPEN=0` (se quita sola al abrir Studio).
7. **Términos:** cómo avisarte si alguien cree que un contenido subido infringe sus derechos de autor, y el enlace a
   reembolsos.
8. **Teclado y lectores de pantalla:**
   - La hoja de guion de la portada atrapaba el Tab en una línea vacía (cambiaba el tipo de línea sin fin). Ahora, después
     de pasar por los 4 tipos, el Tab sale de la hoja.
   - Libro de Reclamaciones: los grupos Servicio/Producto y Reclamo/Queja tienen nombre para el lector de pantalla, el
     error se anuncia, el foco va al número de la hoja al enviarla y el nombre del apoderado pasa a ser obligatorio al
     marcar «soy menor de edad».
   - Enlaces entre los cuatro documentos legales al pie de cada uno.

Probado: pasan las pruebas del servidor (los 14 archivos); axe sin problemas en las páginas cambiadas; en el navegador, la
portada no deja cookies, entrar sí pone `fs_dev` y `fs_s`, la ventana de pago muestra el texto nuevo y el libro registra
la hoja y lleva el foco al número.

## Lo que pediste y no hace falta (por eso no lo agregué)

- **Banner de consentimiento de cookies:** no hace falta. Solo hay cookies propias necesarias (sesión, idioma y
  antifraude de la prueba) y ninguna de analítica ni publicidad. En el Perú no hay una regla específica que pida banner
  para esas; en Europa tampoco se pide consentimiento para cookies estrictamente necesarias. Si algún día agregas
  analytics o píxeles de anuncios, ahí sí hace falta.
- **Página aparte de cookies:** la puse como sección de la política de privacidad (`/privacidad#cookies`), con su tabla.
  Con tres cookies, una página propia no agrega nada.
- **Casillas de consentimiento en los formularios:** los datos de la cuenta se tratan para darte el servicio que
  contratas, y los del Libro de Reclamaciones los exige la ley; en esos casos la Ley 29733 no pide un consentimiento
  aparte, sino informar (que es lo que agregué). Una casilla solo haría falta si usaras los correos para publicidad.
- **Quitar reseñas falsas o recortar datos:** no había reseñas, y los formularios ya piden solo lo necesario.
- **Ley de accesibilidad:** en el Perú la obligación de accesibilidad web es para el Estado; en la Unión Europea, la
  European Accessibility Act exime a las microempresas que prestan servicios. Igual la web ya cumple WCAG AA en lo que mide
  axe.
- **CCPA (California):** no aplica a tu tamaño (pide, entre otras cosas, unos 25 millones de dólares de ingresos al año).

## Lo que necesito de ti

1. **Datos del negocio.** Las páginas legales y el libro toman la razón social, el RUC, el domicilio fiscal, la fecha y el
   correo de `BUSINESS_NAME`, `BUSINESS_RUC`, `BUSINESS_ADDRESS`, `LEGAL_DATE` y `SUPPORT_EMAIL` en
   `/etc/filmspirit/filmspirit.env`. Si están vacíos, la web publicada muestra «[razón social]» y «[RUC]», y eso es lo
   más urgente: el Código de Consumo y el reglamento del libro exigen que esos datos estén visibles. Confírmame que están
   puestos (o dime cuáles son y te digo dónde van).
2. **El aviso «Borrador para revisión legal»** sigue arriba de cada documento legal. Quítalo cuando el abogado los
   apruebe (es una línea `<p class="draft">` en cada archivo de `web/`).
3. **Cobros por error:** en la página de reembolsos escribí que un cobro duplicado o equivocado se devuelve completo.
   Es lo razonable y la ley lo exige de todos modos, pero confirma que estás de acuerdo.

## Riesgos que quedan fuera de la web (para tu abogado o para ti)

- **Inscribir el banco de datos** de clientes ante la Autoridad Nacional de Protección de Datos Personales (Ley 29733).
- **Reglamento nuevo de la Ley 29733** (D. S. 016-2024-JUS, vigente desde el 31 de marzo de 2025): pide designar un
  **oficial de datos personales** en ciertos casos y **avisar a la Autoridad dentro de 48 horas** si hay una filtración
  de datos importante. Conviene que el abogado te diga si y desde cuándo te aplica el oficial, y tener por escrito qué
  hacer si hay un incidente.
- **Clientes en Europa:** la portada está en 5 idiomas y vendes fuera del Perú, así que el GDPR puede aplicarte para
  esas personas. Paddle es quien les vende, pero los datos de la cuenta los tratas tú. Pregunta si necesitas un
  representante en la UE y si los textos legales deben estar traducidos (hoy están solo en español; la portada lo avisa).
- **Paddle** revisa el dominio antes de activar los cobros y pide términos, privacidad y política de reembolsos visibles:
  ya están las tres.
- **Respaldos en la misma VPS:** el respaldo diario queda en el mismo servidor. Activa las copias de Hostinger y baja
  una copia de vez en cuando (ya está en `LEEME-VPS.md`).
- **La app por dentro** (las 14 pestañas) no entró en esta revisión de accesibilidad: es mucho más grande y conviene
  hacerla aparte.
