# Lote R · desenfoque de lente en la viñeta (25-oct-2026)

Base: lote Q. Solo la app; no cambia el servidor. Nuevo dato del plano: `s3.dof` (encendido) y `s3.focus` (id de a quién
se enfoca; si falta, a quien sigue la cámara o a la primera figura).

- **Cámara › Desenfoque (profundidad de campo)**: casilla, Diafragma (f/1.4 a f/22) y «Foco en» (automático o una
  figura u objeto). Debajo: «Foco a 2.50 m · nítido de 2.42 a 2.59 m».
- El diafragma es el mismo de Luz › Exposición (elegirlo aquí quita el automático de la exposición).
- La viñeta (editor, storyboard, PDF y animatic) se desenfoca por píxel con el círculo de confusión del lente real:
  c = f² / (N (s − f)) · |z − s| / z, con el ancho del sensor del plano. Es la misma cuenta del «background blur» de
  dofsimulator (85 mm f/1.8 a 2,10 m: 1,99 mm en el sensor). El foco va a los ojos de quien se enfoca, sobre el eje de la
  cámara. Lo de atrás no se derrama sobre lo nítido; lo de adelante desenfocado sí lo cubre.
- Tope del desenfoque: un 9 % del ancho del cuadro (diámetro). Cuesta un 30 % más de tiempo de dibujo, solo en los
  planos que lo tienen encendido.
- En la planta, con el desenfoque encendido, la franja verde de la zona nítida aparece sola alrededor de quien se enfoca.

Archivos: src/s3d-render.js (r3Dof), src/s3d-model.js (dofFocus, dofF), src/s3d-plan.js, src/shot-editor.js (dofRows).
