# Lote Q · medidor de distancias con distancia de foco (25-oct-2026)

Base: lote P. Solo la app (planta del editor de planos); no cambia el servidor ni los datos guardados.

Referencia: dofsimulator.net (distancia al sujeto, profundidad de campo, lente y sensor).

Revisado: la escala de la planta, el cono de visión (lente + ancho del sensor) y la vista 3D coinciden con la óptica
(24 mm en Super 35 a 7 m: la figura de 1,62 m ocupa el 39,6 % del alto del cuadro, igual que la teoría). Lo que estaba
mal era la lectura de las medidas:

- **El rótulo de la cámara** decía «24mm · 1.1 m»: el 1.1 m es la ALTURA de la cámara, pero se leía como la distancia
  al sujeto (y chocaba con los 7.00 m de la medida). Ahora: «24 mm · alt. 1.1 m».
- **De la cámara a una figura, objeto o luz** la medida es la distancia de foco, como en dofsimulator: en línea recta
  de la cámara a los ojos de la figura (o a la altura del objeto o la luz), no solo por el piso. Con la cámara a la
  altura de los ojos casi no cambia (7.00 → 7.01 m); con grúa sí (cámara a 4 m, figura a 3 m por el piso: 3.93 m).
- Debajo de esa medida: el diafragma del plano (Luz › Exposición; f/2.8 si no se eligió) y lo que queda nítido,
  p. ej. «f/2.8 · nítido 4.18–21.7 m». Fórmulas de lente delgada, círculo de confusión = diagonal del sensor / 1500
  (0,029 mm en full frame, 0,020 mm en Super 35), igual que dofsimulator.
- En el cono de la cámara se dibuja la zona nítida: una franja verde suave de la distancia cercana a la lejana, con
  una raya en el plano de foco.
- Las medidas entre otras cosas (dos figuras, dos puntos del piso) siguen siendo por el piso.
- La pirámide de la cámara (r3ShotFrustum) usaba el formato de 35 mm de three.js: ahora 36 mm, como las viñetas.

Archivos: src/s3d-plan.js (measFocus, dofOf, dofFmt, dofBand, rótulo), src/s3d-render.js (filmGauge),
src/shot-editor.js (texto de ayuda al medir), test/planta.test.js (profundidad de campo).
