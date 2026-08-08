#!/usr/bin/env python3
# ============================================================
#  LA SIGNATURE D'ADRIEN — du PDF reMarkable au SVG de la lettre
# ============================================================
#  Entrée  : un export PDF de la tablette (Menu → Envoyer en PDF).
#  Sortie  : le bloc <svg> à coller dans index.html, et une image
#            de contrôle pour vérifier le tracé avant de coller.
#
#  POURQUOI CE DÉTOUR PLUTÔT QU'UNE POLICE.
#  Une police contient le CONTOUR REMPLI d'une lettre, jamais le
#  trajet du stylo : la parcourir au stroke-dasharray détoure la
#  silhouette au lieu d'écrire. Un export reMarkable, lui, contient
#  ce que la main a fait. C'est la seule source du site où le
#  « tracé qui s'écrit » ne soit pas une imitation.
#
#  CE QUE reMARKABLE ÉCRIT VRAIMENT, et c'est le piège : pas des
#  traits, mais des SURFACES REMPLIES — un tampon par échantillon de
#  pression, plus quelques longs rubans. Il n'y a donc pas de
#  trajectoire à lire directement, et la reconstruire par le milieu
#  des rubans ne marche pas (essayé : le squelette part en vrille dès
#  que la plume tourne).
#
#  CE QU'ON FAIT À LA PLACE. On garde l'encre telle quelle — c'est
#  son écriture, on n'y touche pas — et l'on ne se sert de l'ordre du
#  fichier que pour la DÉCOUVRIR. L'ordre des sous-tracés est celui
#  de la main ; un trait épais qui les suit balaie donc la signature
#  dans le sens où elle a été écrite. La trajectoire n'a pas à être
#  belle, elle doit seulement être dans le bon ordre et tout couvrir :
#  mesuré à 99 % de couverture, ce qui reste sous le trait.
#
#  Relancer :  python3 build/signature-vers-svg.py <fichier.pdf>
# ============================================================

import math
import re
import sys
from pathlib import Path

from pypdf import PdfReader
from PIL import Image, ImageDraw

RACINE = Path(__file__).resolve().parent.parent
CONTROLE = Path("/tmp/signature-controle.png")

EPAISSEUR_PLUME = 34      # largeur du trait qui découvre, en unités du dessin
GRAIN = 0.35              # points plus proches que ça : inutiles
DECIMALES = 1


def lire_les_formes(pdf):
    """Les surfaces noires du PDF, dans l'ordre où elles ont été posées."""
    data = PdfReader(pdf).pages[0].get_contents().get_data().decode("latin-1")
    num = r'-?\d+\.?\d*'
    jetons = re.compile(rf'({num})\s+({num})\s+([ml])\b')
    formes = []
    for bloc in re.findall(r'q 0 0 0 rg 0 0 0 RG(.*?)\bf\*?\s+Q', data, re.S):
        sous, cour = [], []
        for x, y, op in jetons.findall(bloc):
            x, y = float(x), float(y)
            if op == 'm':
                if len(cour) > 2:
                    sous.append(cour)
                cour = [(x, y)]
            else:
                cour.append((x, y))
        if len(cour) > 2:
            sous.append(cour)
        # Chaque forme s'ouvre par un « 0 0 m » d'amorce : il ne dessine
        # rien mais tirerait tout vers le coin de la page.
        sous = [s for s in sous if not (abs(s[0][0]) < .01 and abs(s[0][1]) < .01)]
        if sous:
            formes.append(sous)
    return formes


def alleger(points, grain=GRAIN):
    """Deux points à un tiers d'unité l'un de l'autre pèsent autant qu'un
       seul et se voient autant : on n'en garde qu'un."""
    out = [points[0]]
    for pt in points[1:]:
        if math.dist(pt, out[-1]) >= grain:
            out.append(pt)
    if out[-1] != points[-1]:
        out.append(points[-1])
    return out


def trajectoire(formes):
    """L'ordre de la main. Un petit sous-tracé est un tampon : son centre
       suffit. Un long est un ruban : on l'échantillonne le long de
       lui-même, ses points en parcourent toute l'étendue."""
    chemin = []
    for forme in formes:
        for s in forme:
            if len(s) <= 8:
                chemin.append((sum(x for x, _ in s) / len(s),
                               sum(y for _, y in s) / len(s)))
            else:
                pas = max(1, len(s) // 60)
                chemin.extend(s[::pas])
    return alleger(chemin, GRAIN * 1.2)


def vers_svg(points, ferme):
    d = f"M{points[0][0]:.{DECIMALES}f} {points[0][1]:.{DECIMALES}f}"
    for x, y in points[1:]:
        d += f"L{x:.{DECIMALES}f} {y:.{DECIMALES}f}"
    return d + ("Z" if ferme else "")


def controler(formes, chemin, boite, part=0.72):
    """Une image de vérification : l'encre en gris, ce que la plume a
       déjà découvert en noir. On regarde avant de coller."""
    mx, my, ex, ey = boite
    L, H = 1100, max(200, int(1100 * ey / ex))
    e = (L - 40) / ex
    T = lambda x, y: (20 + (x - mx) * e, H - 20 - (y - my) * e)
    art = Image.new("L", (L, H), 0)
    da = ImageDraw.Draw(art)
    for f in formes:
        for s in f:
            da.polygon([T(x, y) for x, y in s], fill=255)
    msk = Image.new("L", (L, H), 0)
    ImageDraw.Draw(msk).line([T(x, y) for x, y in chemin[:int(len(chemin) * part)]],
                             fill=255, width=int(EPAISSEUR_PLUME * e), joint="curve")
    img = Image.new("RGB", (L, H), "white")
    ImageDraw.Draw(img).bitmap((0, 0), art, fill=(226, 226, 226))
    img.paste((26, 22, 15), (0, 0), Image.composite(art, Image.new("L", (L, H), 0), msk))
    img.save(CONTROLE)
    couvert = sum(1 for a, b in zip(art.getdata(), msk.getdata()) if a and b)
    total = sum(1 for a in art.getdata() if a)
    return couvert * 100 // total


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage : python3 build/signature-vers-svg.py <export.pdf>")
    formes = lire_les_formes(sys.argv[1])
    chemin = trajectoire(formes)

    pts = [pt for f in formes for s in f for pt in s]
    mx = min(x for x, _ in pts); my = min(y for _, y in pts)
    ex = max(x for x, _ in pts) - mx; ey = max(y for _, y in pts) - my
    marge = ex * 0.02

    #  L'AXE VERTICAL SE RETOURNE. Le PDF compte de bas en haut, le SVG
    #  de haut en bas ; sans cette inversion la signature serait écrite
    #  la tête en bas.
    def place(p):
        return [((x - mx + marge), (ey - (y - my) + marge)) for x, y in p]

    #  L'ENCRE PART EN IMAGE, LA TRAJECTOIRE RESTE EN LIGNE.
    #  Les cinq mille points de la signature pèsent 59 Ko de données de
    #  chemin, chargés à chaque visite du site pour une image que seuls
    #  voient ceux qui ouvrent la lettre. Une image en pèse le tiers et
    #  ne coûte rien tant qu'on ne l'ouvre pas. La trajectoire, elle,
    #  doit rester du SVG : c'est elle que le CSS anime.
    ECHELLE = 3
    LI, HI = int((ex + marge * 2) * ECHELLE), int((ey + marge * 2) * ECHELLE)
    img = Image.new("RGBA", (LI, HI), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for f in formes:
        for sp in f:
            d.polygon([(x * ECHELLE, y * ECHELLE) for x, y in place(sp)], fill=(107, 83, 52, 255))
    dossier = RACINE / "ressources" / "images" / "papier"
    dossier.mkdir(parents=True, exist_ok=True)
    img.save(dossier / "signature.webp", "WEBP", quality=94, method=6, lossless=False)
    poids = (dossier / "signature.webp").stat().st_size // 1024

    plume = vers_svg(place(chemin), False)
    couverture = controler(formes, chemin, (mx, my, ex, ey))
    l, h = ex + marge * 2, ey + marge * 2

    svg = (f'<svg class="recit-paraphe" viewBox="0 0 {l:.1f} {h:.1f}"'
           ' aria-hidden="true" focusable="false">\n'
           '    <defs>\n'
           f'        <mask id="paraphe-plume" maskUnits="userSpaceOnUse"'
           f' x="0" y="0" width="{l:.1f}" height="{h:.1f}">\n'
           f'            <path class="paraphe-plume" pathLength="1" fill="none" stroke="#fff"'
           f' stroke-width="{EPAISSEUR_PLUME}" stroke-linecap="round" stroke-linejoin="round"\n'
           f'                d="{plume}" />\n'
           '        </mask>\n'
           '    </defs>\n'
           f'    <image mask="url(#paraphe-plume)" x="0" y="0" width="{l:.1f}" height="{h:.1f}"\n'
           '        href="ressources/images/papier/signature.webp" />\n'
           '</svg>')

    sortie = RACINE / "build" / "signature.svg.txt"
    sortie.write_text(svg, encoding="utf-8")
    print(f"  {len(formes)} formes · trajectoire de {len(chemin)} points")
    print(f"  couverture du trait : {couverture} %")
    print(f"  contrôle : {CONTROLE}")
    print(f"  encre : signature.webp  {poids} Ko")
    print(f"  bloc SVG : {sortie}  ({len(svg) // 1024} Ko)")
