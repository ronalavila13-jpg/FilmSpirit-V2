# Fotos en WebP al 90 % y el clima de la hoja de llamado (30 de octubre de 2026)

## Fotos
Toda imagen que se sube al programa (desglose, scouting, casting, hoja de llamado, gastos, hoja de script, storyboard,
personajes, logos, planos) pasa por `imgEncode` (`src/imagenes.js`) y sale en **WebP con calidad 90 %**, de una sola
pasada. Antes se buscaba la mejor calidad que cupiera en unos 170 kB (200 kB en la hoja de script), con lo que muchas
fotos bajaban de 90 %.

- El lado mayor sigue con tope (1600 px en una foto), así que el peso por foto queda en unos cientos de kB, no más.
- Sin tope de peso, cada foto ocupa más del espacio del plan (el servidor acepta hasta 8 MB por imagen).
- Con `o.top` (las texturas de un modelo 3D, que no pasan de lo que acepta el servidor) se conserva el ajuste de antes.
- Safari no genera WebP: ahí sale JPEG al 90 % (y PNG, con tope, si hay transparencia).
- Las fotos que ya estaban guardadas no se tocan.

## Hoja de llamado
El clima (con máxima, mínima, humedad, lluvia, viento, amanecer y anochecer) pasa al pie de la columna de la derecha, bajo
la locación y el centro de salud, que tenía mucho espacio libre. La columna del centro, la más alta, ya no decide el alto
del recuadro: la hoja de ejemplo vuelve a caber en 2 páginas.

Archivos: `src/imagenes.js`, `src/laminas.js`, `src/tab-sup.js`, `src/pdf-llamado.js`, `i18n/en-manual.json`.
Pruebas: `test/imagenes.test.js`, `test/script-ad.test.js`, `test/pdf-diseno.test.js`.
