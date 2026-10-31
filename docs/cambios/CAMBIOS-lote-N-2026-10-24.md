# FilmSpirit · lote N (24 de octubre de 2026): series de TV

FilmSpirit ya puede llevar una serie: todos los episodios en un mismo proyecto, con un solo reparto, locaciones,
plan de rodaje y presupuesto, y cada escena numerada con su episodio delante (101-1, 101-2, 102-1…). Base: lote M.

**Cómo aplicarlo.** Igual que siempre: en la VPS,
`cd /root && unzip -o filmspirit-servidor.zip && cd server && sudo bash deploy/actualizar.sh`.
No hay migración ni variables nuevas. Los proyectos que ya existen no cambian: una película sigue siendo una película
hasta que alguien la convierte en serie. En el código fuente, descomprime encima de tu carpeta y arma como siempre.

## Cómo funciona

Una serie es un proyecto con los guiones de sus episodios uno tras otro. El primer encabezado de cada episodio
marca dónde empieza, y desde ahí sus escenas se cuentan dentro del episodio. Como todo sigue siendo un solo proyecto,
el desglose, el casting, el plan, la hoja de llamado y el presupuesto ven todos los episodios a la vez. Eso es lo que
pide el rodaje por bloques: una jornada en la casona puede llevar escenas del 101, del 102 y del 105.

## Qué hay de nuevo

1. **Convertir en serie** (Proyecto › tarjeta «Serie de TV», o Guion › ⋯ › Serie de TV). El guion que ya tiene el
   proyecto pasa a ser el primer episodio (101 por defecto, o el número que elijas). Sus escenas cambian de número
   (la 5 pasa a ser la 101-5), y el desglose, el plan, los planos, las notas y la hoja de script siguen a su escena.
2. **Agregar episodios.** Hay tres formas: «Agregar episodio desde un archivo…» (Final Draft, Fountain o PDF), «Agregar
   episodio en blanco» (un encabezado listo para escribir) o, al importar un guion, la opción nueva «Agregar como
   episodio de…». Si el archivo trae sus números de escena, se conservan con el episodio delante (12 → 104-12). El
   desglose automático marca el reparto y los elementos del episodio nuevo y reconoce a los personajes que ya están.
3. **Ventana «Episodios»**: número, título, escenas, páginas, reparto y qué parte ya está en el plan (y en qué
   jornadas). Desde aquí se cambia el número de un episodio (101 → 201, y sus escenas van con él), se renumeran sus
   escenas (101-1, 101-2…), se une con el anterior o se empieza un episodio nuevo en cualquier escena (sirve para un
   guion de varios episodios importado de una sola vez).
4. **Guion**: cada episodio empieza en página nueva, con su número y título arriba, en la pantalla, en el editor y en
   el PDF. La lista de escenas los agrupa por episodio, y el buscador encuentra «101-» o el título. «Renumerar»
   renumera cada episodio desde 1. Al escribir, una escena nueva toma el número de su episodio (102-5, o 102-4A si
   va entre dos). Fountain guarda dónde empieza cada episodio con una línea `# Episodio 101: Piloto` y la vuelve a
   leer al importar.
5. **Plan de rodaje por bloques**: el botón «+ Bloque» aparece solo en las series. Eliges los episodios del bloque,
   su nombre y quién lo dirige. Sus escenas sin programar se ordenan por locación, juntando los episodios, en jornadas
   nuevas al final, dentro de una etapa «Bloque 1 · Ep. 101, 102». Cada jornada muestra sus episodios
   («Ep. 101 · 102»). Se puede deshacer, y las jornadas se mueven como siempre.
6. **Reparto compartido**: cada personaje existe una sola vez para toda la serie, con un solo número en el plan y en
   la hoja de llamado. En Casting, cada personaje dice si es **fijo** (sale en la mayoría de los episodios),
   **recurrente** o **invitado** (uno o dos episodios), y en cuáles sale.
7. **Hoja de llamado**: la cabecera dice los episodios de la jornada. En el PDF y en el Excel van en «Episodios».
8. **Exportar escenas sueltas** (Elegir… en Exportar): en una serie, «101» es todo el episodio 101 y un rango se
   escribe «102-3-102-9».

Pruebas nuevas: `node test/series.test.js` (10). Cubren la numeración por episodio, convertir, agregar desde un
archivo, cambiar el número, renumerar, unir, la página nueva de cada episodio, fijo o invitado y Fountain de ida y
vuelta. Pasan también las pruebas que ya había de la app (escenas, core, compartir, gastos…) y las 83 del servidor.
También lo probé en el navegador con una serie de 3 episodios (capturas en claro, oscuro y teléfono).

## Lo que queda para otra ronda

- **Presupuesto por episodio**: hoy hay un solo presupuesto para la serie. El paso que sigue es un presupuesto modelo
  por episodio, los costos de toda la serie (sets fijos, equipo por semanas) y el total de la temporada.
- **Contratos del elenco**: por episodio o por semana, con los días de trabajo de cada actor cruzando episodios.
  Los días por actor del plan ya los cuentan.
- **Continuidad entre episodios**: día de la historia, vestuario y utilería que pasan de un episodio a otro.
- **Final Draft (.fdx)** todavía no guarda dónde empieza cada episodio al exportar (Fountain sí). Al importar un
  .fdx por episodio no hay problema.
- Un episodio no se borra desde la ventana: se borra su texto en el Guion, o se une con el anterior.
