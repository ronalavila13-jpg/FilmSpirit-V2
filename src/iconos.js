/* ============================================================
   ÍCONOS DE LAS ETAPAS Y LAS PESTAÑAS
   Estilo «recorte» (manual de marca 2026): papel recortado, como las letras de FilmSpirit Recorte. Cada ícono es una
   pieza plena del color de su etapa (b, --m) sobre una hoja de atrás girada, en el tono claro (c, --l); los detalles
   van en el tono hondo (a, --d) y las líneas y huecos son cortes (k) que dejan ver lo que hay detrás.
   --k es el color de lo que hay detrás; lo pone quien dibuja el ícono.
   Los colores de cada familia van en el CSS (.icg0 … .icg4), en claro, oscuro y monocromo.
   ============================================================ */
const STG_ICO = {
  // Guion: las hojas del guion, con sus broches y sus líneas recortadas
  0: '<rect class="c" x="9.5" y="3.6" width="16.5" height="22.6" rx="1.5" transform="rotate(-8 17.7 14.9)"/><rect class="b" x="6.2" y="5.6" width="17.6" height="23" rx="1.5"/><circle class="a" cx="10" cy="10.2" r="1.35"/><circle class="a" cx="10" cy="17.1" r="1.35"/><circle class="a" cx="10" cy="24" r="1.35"/><rect class="k" x="13" y="9.3" width="7.6" height="1.9" rx=".5"/><rect class="k" x="13" y="13.3" width="5.4" height="1.9" rx=".5"/><rect class="k" x="13" y="17.3" width="7.6" height="1.9" rx=".5"/><rect class="k" x="13" y="21.3" width="4.4" height="1.9" rx=".5"/>',
  // Desarrollo: la carpeta del proyecto, con la ficha de alguien del equipo asomando
  1: '<path class="a" d="M4 9.6c0-.8.7-1.5 1.5-1.5h5.4c.4 0 .8.2 1.1.5l1.9 2.1h12.6c.8 0 1.5.7 1.5 1.5v3.2H4Z"/><g transform="rotate(7 18.2 11)"><rect class="c" x="11" y="3.4" width="14.4" height="14.6" rx="1.3"/><circle class="k" cx="18.2" cy="7.8" r="2.2"/><path class="k" d="M14.2 13.6c0-2.2 1.8-3.6 4-3.6s4 1.4 4 3.6Z"/></g><path class="b" d="M3 14.2h26l-1.2 12.1c-.1.8-.7 1.3-1.5 1.3H5.7c-.8 0-1.4-.5-1.5-1.3Z"/><rect class="k" x="8" y="18.4" width="8.4" height="1.9" rx=".5"/>',
  // Imagen: el encuadre, con el paisaje recortado
  2: '<rect class="c" x="8" y="4.2" width="20" height="15" rx="1.4" transform="rotate(-7 18 11.7)"/><rect class="b" x="4" y="9" width="23" height="17.4" rx="1.5"/><path class="k" d="M7.2 23.6l5.1-6.3c.3-.4.9-.4 1.2 0l3 3.6 2.2-2.4c.3-.4.9-.4 1.2 0l4.6 5.1Z"/><circle class="a" cx="21.6" cy="13.8" r="2.2"/>',
  // Producción: la tablilla del coordinador, con su lista
  3: '<rect class="c" x="9.6" y="4.8" width="17" height="22" rx="1.3" transform="rotate(7 18.1 15.8)"/><rect class="b" x="5.4" y="5.6" width="19" height="23.2" rx="1.6"/><path class="a" d="M10.9 3.2h8.2c.6 0 1 .4 1 1v4H9.9v-4c0-.6.4-1 1-1Z"/><circle class="k" cx="15" cy="5.4" r="1"/><rect class="k" x="8.8" y="12" width="2.6" height="2.6" rx=".5"/><rect class="k" x="13.2" y="12.35" width="8" height="1.9" rx=".5"/><rect class="k" x="8.8" y="17" width="2.6" height="2.6" rx=".5"/><rect class="k" x="13.2" y="17.35" width="6" height="1.9" rx=".5"/><rect class="k" x="8.8" y="22" width="2.6" height="2.6" rx=".5"/><rect class="k" x="13.2" y="22.35" width="7" height="1.9" rx=".5"/>',
  // Rodaje: la claqueta, abierta
  4: '<g transform="rotate(-15 4.6 10)"><rect class="a" x="4" y="5.4" width="24" height="3.8" rx=".9"/><path class="k" d="M9.2 5.4h3l-2.1 3.8h-3Z M15.4 5.4h3l-2.1 3.8h-3Z M21.6 5.4h3l-2.1 3.8h-3Z"/></g><rect class="c" x="4" y="10.6" width="24" height="3.4" rx=".9"/><path class="k" d="M8.8 10.6h3l-2 3.4h-3Z M15 10.6h3l-2 3.4h-3Z M21.2 10.6h3l-2 3.4h-3Z"/><rect class="b" x="4" y="15" width="24" height="12.6" rx="1.5"/><rect class="k" x="7.6" y="18.8" width="10.4" height="1.9" rx=".5"/><rect class="k" x="7.6" y="22.6" width="6.6" height="1.9" rx=".5"/>',
};
const TAB_ICO = {
  // Historia: las tarjetas de la escaleta
  build: '<rect class="c" x="8.6" y="3.6" width="19" height="13" rx="1.4" transform="rotate(8 18.1 10.1)"/><rect class="b" x="4.2" y="10" width="21" height="15.4" rx="1.5"/><circle class="a" cx="14.7" cy="10.6" r="2"/><rect class="k" x="7.6" y="15.4" width="13.6" height="1.9" rx=".5"/><rect class="k" x="7.6" y="19.4" width="9" height="1.9" rx=".5"/>',
  // Guion: la hoja y el lápiz
  script: '<rect class="b" x="5" y="3.8" width="17.4" height="23.4" rx="1.5"/><rect class="k" x="8.4" y="8" width="10.4" height="1.9" rx=".5"/><rect class="k" x="8.4" y="12" width="7" height="1.9" rx=".5"/><rect class="k" x="11.6" y="16" width="7.2" height="1.9" rx=".5"/><path class="k" d="M15.6 28.6l1.2-5 10-10 4.1 4.1-10 10Z"/><path class="a" d="M17.6 26.6l.8-3.4 8.4-8.4 2.6 2.6-8.4 8.4Z"/><path class="c" d="M17.6 26.6l.8-3.4 2.6 2.6Z"/>',
  // Proyecto: la ficha del proyecto, con su gente y sus datos
  project: '<rect class="c" x="7.4" y="4.6" width="21" height="14" rx="1.4" transform="rotate(-7 17.9 11.6)"/><rect class="b" x="3.6" y="8.6" width="24.4" height="17.6" rx="1.6"/><circle class="k" cx="10.4" cy="14.2" r="2.7"/><path class="k" d="M6 22.2c.5-2.7 2.2-4 4.4-4s3.9 1.3 4.4 4Z"/><rect class="a" x="17" y="12.6" width="7.6" height="2.2" rx=".6"/><rect class="k" x="17" y="17" width="7.6" height="1.9" rx=".5"/><rect class="k" x="17" y="20.6" width="5" height="1.9" rx=".5"/>',
  // Guion rayado: la hoja con los elementos marcados en color
  lined: '<rect class="c" x="9.4" y="3.8" width="16.6" height="22.6" rx="1.4" transform="rotate(7 17.7 15.1)"/><rect class="b" x="6" y="4.4" width="18" height="23.6" rx="1.5"/><rect class="k" x="9.2" y="8.6" width="11.6" height="1.9" rx=".5"/><rect class="a" x="9.2" y="12.3" width="6.4" height="2.6" rx=".5"/><rect class="k" x="16.6" y="12.65" width="4.2" height="1.9" rx=".5"/><rect class="k" x="9.2" y="17" width="11.6" height="1.9" rx=".5"/><rect class="k" x="9.2" y="21" width="3.6" height="1.9" rx=".5"/><rect class="c" x="13.8" y="20.65" width="7" height="2.6" rx=".5"/>',
  // Desglose: la etiqueta, con su ojal
  breakdown: '<path class="c" d="M8.2 4.6h7.4c.5 0 1 .2 1.4.6l9.6 9.6c.8.8.8 2 0 2.8l-1.4 1.4L12.4 6.2Z" transform="rotate(-4 17 12)"/><path class="b" d="M4.4 9.6c0-1.1.9-2 2-2h7.6c.5 0 1 .2 1.4.6l10 10c.8.8.8 2 0 2.8l-7.6 7.6c-.8.8-2 .8-2.8 0l-10-10c-.4-.4-.6-.9-.6-1.4Z"/><circle class="k" cx="9.6" cy="12.8" r="2"/><path class="k" d="M13 18.2l1.3-1.3 6.3 6.3-1.3 1.3Z"/><circle class="a" cx="9.6" cy="12.8" r=".9"/>',
  // Scouting: el pin sobre el mapa doblado
  scout: '<path class="c" d="M2.6 21.4l7.2-3 6.2 3 7.2-3 6.2 2.4v8.4l-6.2-2.4-7.2 3-6.2-3-7.2 3Z"/><path class="k" d="M9.2 18.6h1.2v9.6H9.2Z M22.6 18.6h1.2v9.6h-1.2Z"/><path class="b" d="M16 25.6s-8-6.8-8-13.2a8 8 0 0 1 16 0c0 6.4-8 13.2-8 13.2Z"/><circle class="k" cx="16" cy="12.2" r="3.4"/><circle class="a" cx="16" cy="12.2" r="1.5"/>',
  // Casting: la foto de alguien, con su estrella
  casting: '<rect class="c" x="5.4" y="5" width="17.6" height="22" rx="1.4" transform="rotate(-6 14.2 16)"/><circle class="b" cx="13.4" cy="12.6" r="4.6"/><path class="b" d="M4.6 27.4c0-5 3.9-8.6 8.8-8.6s8.8 3.6 8.8 8.6Z"/><path class="k" d="M24 1.2l2 4.1 4.5.6-3.3 3.1.8 4.5-4-2.2-4 2.2.8-4.5-3.3-3.1 4.5-.6Z"/><path class="a" d="M24 3.6l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4Z"/>',
  // Storyboard: la hoja con sus viñetas
  board: '<rect class="c" x="7.4" y="3.6" width="21.4" height="20" rx="1.4" transform="rotate(-6 18.1 13.6)"/><rect class="b" x="3.6" y="6.4" width="24.4" height="21" rx="1.6"/><rect class="k" x="6.6" y="9.4" width="8.4" height="6.6" rx=".6"/><rect class="c" x="16.6" y="9.4" width="8.4" height="6.6" rx=".6"/><rect class="k" x="6.6" y="17.6" width="8.4" height="6.6" rx=".6"/><rect class="k" x="16.6" y="17.6" width="8.4" height="6.6" rx=".6"/><path class="a" d="M7.8 15l2.6-3.2 1.6 1.9 1-1 1.8 2.3Z"/>',
  // Animatic: el cuadro que corre, con su barra
  animatic: '<rect class="c" x="7.8" y="3.4" width="20.6" height="14" rx="1.4" transform="rotate(7 18.1 10.4)"/><rect class="b" x="3.6" y="8" width="24.4" height="18.4" rx="1.6"/><path class="k" d="M12.8 11.6v7.4c0 .8.8 1.2 1.5.8l6-3.7c.6-.4.6-1.2 0-1.6l-6-3.7c-.7-.4-1.5 0-1.5.8Z"/><rect class="k" x="6.6" y="22" width="18.4" height="1.9" rx=".5"/><rect class="a" x="6.6" y="22" width="8.2" height="1.9" rx=".5"/>',
  // Plan de rodaje: el tablero con sus tiras de día y de noche
  plan: '<rect class="b" x="4" y="4" width="24" height="24" rx="1.6"/><rect class="c" x="7" y="7.6" width="18" height="4" rx=".6"/><rect class="k" x="7" y="14" width="18" height="4" rx=".6"/><rect class="a" x="7" y="20.4" width="18" height="4" rx=".6"/>',
  // Calendario: la hoja del mes, con sus anillas y el día marcado
  cal: '<rect class="b" x="4" y="7" width="24" height="21" rx="1.6"/><rect class="a" x="9" y="3.6" width="2.8" height="6.4" rx="1.2"/><rect class="a" x="20.2" y="3.6" width="2.8" height="6.4" rx="1.2"/><rect class="k" x="7.4" y="13.4" width="4.6" height="4.2" rx=".6"/><rect class="k" x="13.7" y="13.4" width="4.6" height="4.2" rx=".6"/><rect class="k" x="20" y="13.4" width="4.6" height="4.2" rx=".6"/><rect class="k" x="7.4" y="19.8" width="4.6" height="4.2" rx=".6"/><rect class="c" x="13.7" y="19.8" width="4.6" height="4.2" rx=".6"/><rect class="k" x="20" y="19.8" width="4.6" height="4.2" rx=".6"/>',
  // Presupuesto: el billete y la moneda
  budget: '<rect class="c" x="5.4" y="3.6" width="20" height="12.4" rx="1.3" transform="rotate(-8 15.4 9.8)"/><rect class="b" x="2.8" y="8" width="21.6" height="14" rx="1.5"/><circle class="k" cx="13.6" cy="15" r="3.2"/><rect class="k" x="5.4" y="10.6" width="2.6" height="2.6" rx="1.3"/><circle class="k" cx="23.2" cy="22.4" r="7.4"/><circle class="a" cx="23.2" cy="22.4" r="6"/><rect class="k" x="22.2" y="18.4" width="2" height="8" rx=".6"/>',
  // Hoja de llamado: la hoja con la hora del llamado
  call: '<rect class="c" x="7.6" y="2.8" width="17" height="21.4" rx="1.3" transform="rotate(-7 16.1 13.5)"/><rect class="b" x="3.8" y="4.4" width="18.6" height="23.4" rx="1.5"/><rect class="k" x="7.2" y="8.6" width="11" height="1.9" rx=".5"/><rect class="k" x="7.2" y="12.6" width="7" height="1.9" rx=".5"/><rect class="k" x="7.2" y="16.6" width="5" height="1.9" rx=".5"/><circle class="k" cx="22" cy="21.8" r="7.8"/><circle class="a" cx="22" cy="21.8" r="6.4"/><path class="k" d="M21 17.6h2v4.4l2.8 2-1.1 1.6L21 23Z"/>',
  // Hoja de script: el cronómetro de la continuista
  sup: '<rect class="c" x="5" y="6" width="22" height="22" rx="1.4" transform="rotate(-7 16 17)"/><circle class="b" cx="16" cy="18" r="10"/><rect class="a" x="13.4" y="2.6" width="5.2" height="3.4" rx="1"/><rect class="a" x="15" y="5" width="2" height="3.6"/><rect class="a" x="24.2" y="6.4" width="3.6" height="3" rx="1" transform="rotate(45 26 7.9)"/><circle class="k" cx="16" cy="18" r="7.2"/><path class="a" d="M15 12.2h2v5.4l3.6 2.4-1.1 1.7-4.5-3Z"/>',
};
// las clases cortas de arriba llevan un prefijo para no chocar con otras reglas del programa
const icoFix = s => s.replace(/class="(a|b|c|x|k|ln|lm|kl)"/g, 'class="i-$1"');
for (const o of [STG_ICO, TAB_ICO]) for (const k in o) o[k] = icoFix(o[k]);
const icoSvg = (inner, sz) => inner ? `<svg class="lf" viewBox="0 0 32 32"${sz ? ` width="${sz}" height="${sz}"` : ''} aria-hidden="true" focusable="false">${inner}</svg>` : '';
const stgIco = (g, sz) => icoSvg(STG_ICO[g], sz);
const tabIco = (k, sz) => icoSvg(TAB_ICO[k], sz);
