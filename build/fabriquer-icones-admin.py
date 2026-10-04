#!/usr/bin/env python3
"""
============================================================
 LES ICÔNES DE /admin/ — admin/icone-*.png, admin/apple-touch-icon.png
============================================================
 L'administration des dates s'installe sur l'écran d'accueil du
 téléphone, sous le nom « Dates » (admin/manifest.webmanifest). Son
 icône : le portrait du site (favicon_io/android-chrome-512x512.png) et
 la feuille d'éphéméride des dates, en or, posée en bas à droite —
 dessinée quatre fois plus grande, puis réduite : des bords nets.

     python3 build/fabriquer-icones-admin.py

 À relancer après un changement de portrait. Voir README-build.md,
 « Depuis le téléphone : /admin/ ».
"""
from PIL import Image, ImageDraw
import os, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(RACINE, 'favicon_io', 'android-chrome-512x512.png')
SORTIE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RACINE, 'admin')
FOND = (10, 9, 7, 255)          # --c-bg du thème sombre (#0a0907)
OR_CORPS = (224, 210, 186, 255)  # --c-gold-light
OR_BANDE = (130, 108, 74, 255)   # --c-gold-ink du thème clair
ENCRE = (10, 9, 7, 255)
X = 4

portrait = Image.open(SOURCE).convert('RGBA')


def icone(taille, portrait_part, centre, fond_plein, arrondi=0.0):
    T = taille * X
    im = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if fond_plein:
        d.rectangle([0, 0, T, T], fill=FOND)
    else:
        d.rounded_rectangle([0, 0, T - 1, T - 1], radius=int(T * arrondi), fill=FOND)
    # Le portrait, rond (la source l'est déjà, coins transparents).
    p = int(T * portrait_part)
    pr = portrait.resize((p, p), Image.LANCZOS)
    cx, cy = int(T * centre[0]), int(T * centre[1])
    im.alpha_composite(pr, (cx - p // 2, cy - p // 2))
    # La feuille d'éphéméride, en bas à droite, cernée de fond pour se
    # détacher du portrait.
    fw, fh = int(p * 0.40), int(p * 0.44)
    fx = cx + int(p * 0.50) - fw + int(p * 0.06)
    fy = cy + int(p * 0.50) - fh + int(p * 0.06)
    r = int(fw * 0.16)
    bord = int(fw * 0.07)
    d.rounded_rectangle([fx - bord, fy - bord, fx + fw + bord, fy + fh + bord], radius=r + bord, fill=FOND)
    d.rounded_rectangle([fx, fy, fx + fw, fy + fh], radius=r, fill=OR_CORPS)
    bande = int(fh * 0.27)
    d.rounded_rectangle([fx, fy, fx + fw, fy + bande + r], radius=r, fill=OR_BANDE)
    d.rectangle([fx, fy + bande, fx + fw, fy + bande + r], fill=OR_CORPS)
    # Les deux anneaux de la feuille.
    aw, ah = int(fw * 0.09), int(fh * 0.20)
    for k in (0.30, 0.70):
        ax = fx + int(fw * k) - aw // 2
        d.rounded_rectangle([ax, fy - int(ah * 0.45), ax + aw, fy + int(ah * 0.55)], radius=aw // 2, fill=ENCRE)
    # La coche : « à venir, confirmé », comme l'icône de la liste.
    ep = max(1, int(fw * 0.11))
    zone_y0, zone_y1 = fy + bande, fy + fh
    pts = [
        (fx + fw * 0.24, zone_y0 + (zone_y1 - zone_y0) * 0.52),
        (fx + fw * 0.43, zone_y0 + (zone_y1 - zone_y0) * 0.72),
        (fx + fw * 0.77, zone_y0 + (zone_y1 - zone_y0) * 0.28),
    ]
    d.line(pts, fill=ENCRE, width=ep, joint='curve')
    for (x, y) in (pts[0], pts[2]):
        d.ellipse([x - ep / 2, y - ep / 2, x + ep / 2, y + ep / 2], fill=ENCRE)
    return im.resize((taille, taille), Image.LANCZOS)


os.makedirs(SORTIE, exist_ok=True)
# « any » : un carré arrondi sombre, le portrait presque plein.
icone(512, 0.80, (0.47, 0.47), False, 0.22).save(os.path.join(SORTIE, 'icone-512.png'), optimize=True)
icone(192, 0.80, (0.47, 0.47), False, 0.22).save(os.path.join(SORTIE, 'icone-192.png'), optimize=True)
# « maskable » : fond plein, tout dans la zone sûre (cercle de 80 %).
icone(512, 0.58, (0.48, 0.48), True).save(os.path.join(SORTIE, 'icone-masquable-512.png'), optimize=True)
# iPhone : fond plein (iOS arrondit lui-même), 180 px.
icone(180, 0.74, (0.47, 0.47), True).convert('RGB').save(os.path.join(SORTIE, 'apple-touch-icon.png'), optimize=True)
print('ok')
