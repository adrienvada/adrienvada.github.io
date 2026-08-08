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
#  ET POURTANT ON NE TRACE PAS. Il y avait ici tout un mécanisme pour
#  découvrir la signature dans l'ordre du geste — un masque suivant la
#  trajectoire de la main. Il marchait. Il a été retiré quand même :
#  l'écriture manuscrite suffit à donner l'organique, et une signature
#  qui se dessine pendant que le reste de la lettre paraît en fondu
#  faisait deux langages sur la même page. Elle paraît donc comme les
#  mots, en fondu, mot après mot.
#
#  D'où DEUX IMAGES et non une : « Adrien » puis « Vada ». Elles sont
#  découpées au plus grand blanc horizontal, et gardent LA MÊME
#  HAUTEUR — celle de la signature entière — sans quoi la mise à
#  l'échelle par le CSS les rendrait de deux tailles différentes.
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


def remplir_pair_impair(taille, formes, couleur):
    """LE REMPLISSAGE PAIR-IMPAIR, à la main.

    reMarkable ferme chaque trait par `f*` — la règle pair-impair — et
    ce n'est pas un détail : un trait qui BOUCLE (le A, le d, les a de
    Vada) enferme son contre-poinçon entre deux contours emboîtés. En
    pair-impair, l'intérieur s'annule et reste blanc, comme sous une
    vraie plume. Rempli sous-tracé par sous-tracé, il devient noir — et
    la signature n'est plus la sienne.

    Pillow ne sait pas faire ça : son polygon() remplit chaque contour
    séparément. On balaie donc l'image ligne par ligne, on compte les
    traversées de contour, et l'on ne peint qu'entre la première et la
    deuxième, la troisième et la quatrième — ce qui laisse le dedans des
    boucles intact.
    """
    L, H = taille
    img = Image.new("RGBA", (L, H), (0, 0, 0, 0))
    px = img.load()
    for forme in formes:
        aretes = []
        for s in forme:
            for i in range(len(s)):
                x0, y0 = s[i]
                x1, y1 = s[(i + 1) % len(s)]
                if y0 != y1:
                    aretes.append((min(y0, y1), max(y0, y1), x0, y0, x1, y1))
        if not aretes:
            continue
        # Sans ce classement par tranche, chaque ligne rejouerait les
        # cinq mille arêtes de la signature entière.
        hmin = max(0, int(min(a[0] for a in aretes)))
        hmax = min(H - 1, int(max(a[1] for a in aretes)) + 1)
        seaux = {}
        for a in aretes:
            for y in range(max(0, int(a[0])), min(H, int(a[1]) + 1)):
                seaux.setdefault(y, []).append(a)
        for y in range(hmin, hmax + 1):
            yc = y + 0.5
            croix = []
            for y0, y1, ax, ay, bx, by in seaux.get(y, ()):
                if y0 <= yc < y1:
                    croix.append(ax + (bx - ax) * (yc - ay) / (by - ay))
            croix.sort()
            for i in range(0, len(croix) - 1, 2):
                for x in range(max(0, int(croix[i] + .5)), min(L, int(croix[i + 1] + .5))):
                    px[x, y] = couleur
    return img


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
    art = remplir_pair_impair((L, H), [[[T(x, y) for x, y in s] for s in f] for f in formes],
                              (255, 255, 255, 255)).convert("L")
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

    #  Le plus grand blanc horizontal sépare les deux mots.
    boites = sorted((min(x for sp in f for x, _ in sp),
                     max(x for sp in f for x, _ in sp)) for f in formes)
    blocs = []
    for a0, b0 in boites:
        if blocs and a0 <= blocs[-1][1] + 1:
            blocs[-1][1] = max(blocs[-1][1], b0)
        else:
            blocs.append([a0, b0])
    coupe = max(((blocs[i][1] + blocs[i + 1][0]) / 2, blocs[i + 1][0] - blocs[i][1])
                for i in range(len(blocs) - 1))[0]

    ECHELLE = 3
    dossier = RACINE / "ressources" / "images" / "papier"
    dossier.mkdir(parents=True, exist_ok=True)
    tailles = []
    for i, garde in enumerate(((lambda cx: cx < coupe), (lambda cx: cx >= coupe))):
        groupe = [f for f in formes
                  if garde(sum(x for sp in f for x, _ in sp) / sum(len(sp) for sp in f))]
        xs = [x for f in groupe for sp in f for x, _ in sp]
        # Le trait d'attaque du A sort loin à gauche : une marge trop
        # courte le tranchait net.
        x0, x1 = min(xs) - marge * 3, max(xs) + marge * 3
        L = int((x1 - x0) * ECHELLE)
        H = int((ey + marge * 2) * ECHELLE)
        place_i = lambda pl: [((x - mx - (x0 - 0)) * ECHELLE, (ey - (y - my) + marge) * ECHELLE)
                              for x, y in pl]
        # place() ramène déjà à l'origine du dessin : on ne décale
        # ensuite que du bord gauche du mot.
        dec = x0 - 0
        groupes = [[[(px - dec, py) for px, py in place(sp)] for sp in f] for f in groupe]
        a_lechelle = [[[(px * ECHELLE, py * ECHELLE) for px, py in sp] for sp in f] for f in groupes]
        img = remplir_pair_impair((L, H), a_lechelle, (107, 83, 52, 255))
        nom = f"signature-{i + 1}.webp"
        img.save(dossier / nom, "WEBP", quality=94, method=6)
        tailles.append((nom, img.size, (dossier / nom).stat().st_size // 1024))

    print(f"  {len(formes)} formes · coupe entre les deux mots à x = {coupe:.0f}")
    for nom, taille, poids in tailles:
        print(f"  {nom:18} {taille[0]}×{taille[1]}  {poids} Ko")
