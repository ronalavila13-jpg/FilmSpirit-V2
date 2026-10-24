"""Cada tipo de cuerpo de FilmSpirit: parámetros MakeHuman, prenda y colores por defecto."""

SPECS = {
    'hombre': dict(
        info=dict(gender=1., age=.5, muscle=.55, weight=.5),
        top=dict(kind='chaqueta', hem=-.035, sleeve=.95, trim=1, trim_extra=.005, collar=1, off=.016, boxy=.012,
                 open=(.055, .03), inner_off=.004, neck_back=.04, neck_front_dip=.035),
        shoe_top=.045, shoe_off=.013, pants_bottom=.025, pants_off=.008, flare=.008,
        colors=dict(camisa='#2B3A63', camisa_borde='#1E2A48', interior='#F4F2EE', pantalon='#8C7A62',
                    zapato='#2E2A28', suela='#1E1B1A', pelo='#4A3426', piel='#E2BD98'),
        hair='corto'),
    'mujer': dict(
        info=dict(gender=0., age=.62, muscle=.5, weight=.42),
        top=dict(kind='chaqueta', hem=-.07, sleeve=.95, trim=0, collar=1, off=.012, boxy=.008, trim_extra=.004,
                 open=(.06, .045, 1.0), inner_off=.003, neck_back=.035, neck_front_dip=.03),
        shoe_top=.04, shoe_off=.012, pants_bottom=.03, pants_off=.006, flare=.004, sole=.03,
        colors=dict(camisa='#2F8F83', camisa_borde='#2A8075', interior='#F4F2EE', pantalon='#1E1E22',
                    zapato='#F2F2EF', suela='#E6E6E2', pelo='#8E8A84', piel='#F2D9C4'),
        hair='corto', hair_over={'corto': dict(front=.05, side=.0, back=-.11, base=.008, top=.018, sidevol=.008,
                                               backvol=.012, cover_ears=False)}),
    'anciano': dict(
        info=dict(gender=1., age=.9, muscle=.4, weight=.62),
        top=dict(kind='cardigan', hem=-.13, sleeve=.94, trim=1, trim_extra=.003, collar=0, off=.014, boxy=.016,
                 open=(.075, .012, 1.6), inner_off=.004, neck_back=.035, neck_front_dip=.04),
        shoe_top=.04, shoe_off=.013, pants_bottom=.02, pants_off=.008, flare=.008,
        colors=dict(camisa='#7A7C7E', camisa_borde='#6E7072', interior='#F4F2EE', pantalon='#2A2A2C',
                    zapato='#6B3F22', suela='#3A2516', pelo='#CFCAC2', piel='#E2BD98'),
        hair='corto', beard=True, buttons=True),
    'anciana': dict(
        info=dict(gender=0., age=.88, muscle=.4, weight=.6),
        top=dict(kind='cardigan', hem=-.12, sleeve=.94, trim=1, trim_extra=.003, collar=0, off=.013, boxy=.012,
                 open=(.07, .012, 1.6), inner_off=.004, neck_back=.035, neck_front_dip=.04),
        shoe_top=.035, shoe_off=.012, pants_bottom=.03, pants_off=.008, flare=.006,
        colors=dict(camisa='#9C6B7A', camisa_borde='#8E5F6E', interior='#F4F2EE', pantalon='#4A4A52',
                    zapato='#3A302A', suela='#2A221E', pelo='#D8D4CC', piel='#F2D9C4'),
        hair='recogido', buttons=True),
    'nino': dict(
        info=dict(gender=1., age=.168, muscle=.5, weight=.5),
        top=dict(kind='sudadera', hem=-.07, sleeve=.94, trim=1, trim_extra=.004, collar=0, off=.012, boxy=.008,
                 hood=1, neck_back=.025, neck_front_dip=.02),
        shoe_top=.04, shoe_off=.012, pants_bottom=.03, pants_off=.007, flare=.006, pants_cuff=.04, sole=.02,
        colors=dict(camisa='#C8352E', camisa_borde='#B32E28', interior='#F4F2EE', pantalon='#3E5F8A',
                    pantalon_borde='#4F72A0', zapato='#2F7A4A', suela='#F2F2EF', pelo='#5A3A26', piel='#F2D9C4'),
        hair='corto'),
    'nina': dict(
        info=dict(gender=0., age=.168, muscle=.5, weight=.48),
        top=dict(kind='sudadera', hem=-.07, sleeve=.94, trim=1, trim_extra=.004, collar=0, off=.011, boxy=.006,
                 neck_back=.025, neck_front_dip=.025),
        shoe_top=.04, shoe_off=.012, pants_bottom=.03, pants_off=.007, flare=.004, sole=.02,
        colors=dict(camisa='#E3A33B', camisa_borde='#D6952F', interior='#F4F2EE', pantalon='#3E5F8A',
                    zapato='#C2457A', suela='#F2F2EF', pelo='#3B2A20', piel='#F2D9C4'),
        hair='colitas'),
}
DEFAULT_COLORS = dict(ojo='#F7F5F0', pupila='#2A2420', cejas=None, boca='#7A3434', boton='#3A332E',
                      pantalon_borde=None)
