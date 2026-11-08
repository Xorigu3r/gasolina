"""Genera les icones de l'app: el falcó Xoriguer (eines/falco.png, el mateix de Pla Cardíac) i, a sota,
un sortidor de gasolina amb el contorn taronja lluminós i detalls crema, sobre el fons negre de la família.

    py -I eines\\genera_icones.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ARREL = Path(__file__).resolve().parent.parent
FONS = (10, 10, 12)
TARONJA = (255, 137, 19)
CREMA = (246, 238, 226)
M = 1024  # mida de treball


def sortidor():
    """Capa RGBA amb el sortidor (coordenades sobre 1024)."""
    lin = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    d = ImageDraw.Draw(lin)
    g = 30  # gruix
    # cos
    d.rounded_rectangle([330, 430, 610, 860], radius=46, outline=TARONJA, width=g)
    # base
    d.rounded_rectangle([280, 850, 660, 900], radius=22, fill=TARONJA)
    # mànega i broquet
    d.line([(610, 520), (690, 520), (735, 575), (735, 760)], fill=TARONJA, width=g, joint="curve")
    d.ellipse([735 - g / 2, 760 - g / 2, 735 + g / 2, 760 + g / 2], fill=TARONJA)
    d.line([(735, 760), (735, 800), (770, 800), (790, 780), (790, 560), (750, 505)], fill=TARONJA, width=g, joint="curve")
    d.ellipse([750 - g / 2, 505 - g / 2, 750 + g / 2, 505 + g / 2], fill=TARONJA)

    crema = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    c = ImageDraw.Draw(crema)
    # pantalla
    c.rounded_rectangle([385, 490, 555, 610], radius=18, outline=CREMA, width=18)
    # gota
    cx, top, r = 470, 665, 52
    c.polygon([(cx, top), (cx - r * 0.86, top + r * 1.55), (cx + r * 0.86, top + r * 1.55)], fill=CREMA)
    c.ellipse([cx - r, top + r * 1.1, cx + r, top + r * 3.1], fill=CREMA)

    # brillantor al voltant del taronja (com el cor de Pla Cardíac)
    halo = lin.filter(ImageFilter.GaussianBlur(22))
    halo.putalpha(halo.getchannel("A").point(lambda a: int(a * 0.85)))
    capa = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    capa.alpha_composite(halo)
    capa.alpha_composite(lin)
    capa.alpha_composite(crema)
    return capa


def contingut():
    """Falcó + sortidor sobre transparent, 1024×1024."""
    im = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    falco = Image.open(ARREL / "eines" / "falco.png").convert("RGB")
    w = 820
    falco = falco.resize((w, round(falco.height * w / falco.width)), Image.LANCZOS)
    # el falcó té el fons negre: el fem transparent segons la lluminositat
    mask = falco.convert("L").point(lambda v: 0 if v < 16 else min(255, (v - 16) * 6))
    falco_rgba = falco.convert("RGBA"); falco_rgba.putalpha(mask)
    im.alpha_composite(falco_rgba, (M // 2 - w // 2 + 10, 95))
    im.alpha_composite(sortidor(), (-20, 0))
    return im


def icona(mida, rodona=True, escala=1.0):
    base = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    if rodona:
        d.rounded_rectangle([0, 0, M - 1, M - 1], radius=int(M * 0.22), fill=FONS + (255,))
    else:
        d.rectangle([0, 0, M, M], fill=FONS + (255,))
    c = contingut()
    if escala != 1.0:
        n = round(M * escala)
        c = c.resize((n, n), Image.LANCZOS)
        base.alpha_composite(c, ((M - n) // 2, (M - n) // 2))
    else:
        base.alpha_composite(c)
    return base.resize((mida, mida), Image.LANCZOS)


sortida = ARREL / "icons"
sortida.mkdir(exist_ok=True)
icona(1024).save(sortida / "logo-1024.png")
icona(192).save(sortida / "icon-192.png")
icona(512).save(sortida / "icon-512.png")
icona(512, rodona=False, escala=0.8).convert("RGB").save(sortida / "maskable-512.png")
icona(180, rodona=False, escala=0.92).convert("RGB").save(sortida / "apple-touch-icon.png")
icona(256).save(sortida / "mark-256.png")
icona(64).save(sortida / "favicon-64.png")
print("Icones fetes a", sortida)
