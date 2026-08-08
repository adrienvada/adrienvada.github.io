#!/usr/bin/env python3
# ============================================================
#  LE PAPIER DE LA LETTRE — génération des textures
# ============================================================
#  Sortie : ressources/images/papier/fibre.webp  (tuile sans couture)
#           ressources/images/papier/pli.webp    (un pli, posé une fois)
#
#  POURQUOI GÉNÉRER PLUTÔT QUE PHOTOGRAPHIER OU TÉLÉCHARGER.
#  Une texture prise sur un site de « textures gratuites » a une
#  provenance invérifiable, et ce site est public et professionnel :
#  une image mal licenciée y est un risque réel. Une photographie
#  d'Adrien serait la meilleure source — c'est proposé, ça reste
#  ouvert — mais en attendant, générer nous-mêmes donne une image
#  dont on possède tout, reproductible d'une commande, et qu'on peut
#  régler au dixième.
#
#  POURQUOI PAS feTurbulence, QUI EST DÉJÀ DANS LA PAGE.
#  Le bruit fractal du navigateur est mathématiquement homogène :
#  à toutes les échelles, la même densité, la même orientation
#  moyenne. Du papier ne fait pas ça. Ses fibres sont des SEGMENTS,
#  couchés à plat, qui s'agglutinent par paquets et laissent des
#  zones nues. C'est ce qu'on reproduit ici : d'abord des nuages
#  basse fréquence pour l'épaisseur inégale de la feuille, puis
#  quelques milliers de fibres tirées une à une.
#
#  LA TUILE EST SANS COUTURE, et par construction : le bruit est
#  interpolé sur une grille qui se referme sur elle-même (modulo),
#  et chaque fibre qui sort d'un bord est redessinée de l'autre
#  côté. Rien n'est raccordé après coup, il n'y a donc rien à
#  raccorder de travers.
#
#  Relancer :  python3 build/generer-papier.py
# ============================================================

import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "ressources" / "images" / "papier"

TAILLE = 512          # côté de la tuile, en pixels
GRAINE = 20260808     # la même image à chaque exécution


# ── Bruit de valeur, tuilable ────────────────────────────────
#  Une grille de valeurs au hasard, interpolée en douceur. Le
#  modulo sur les index de grille est TOUT le secret de l'absence
#  de couture : la case qui suit la dernière est la première.
def bruit(cotes, cellules, rng):
    grille = [[rng.random() for _ in range(cellules)] for _ in range(cellules)]
    pas = cotes / cellules
    out = [0.0] * (cotes * cotes)
    for y in range(cotes):
        gy = y / pas
        j0 = int(gy) % cellules
        j1 = (j0 + 1) % cellules
        fy = gy - int(gy)
        # lissage en S : sans lui, on verrait la grille en losanges
        sy = fy * fy * (3 - 2 * fy)
        for x in range(cotes):
            gx = x / pas
            i0 = int(gx) % cellules
            i1 = (i0 + 1) % cellules
            fx = gx - int(gx)
            sx = fx * fx * (3 - 2 * fx)
            a = grille[j0][i0] + (grille[j0][i1] - grille[j0][i0]) * sx
            b = grille[j1][i0] + (grille[j1][i1] - grille[j1][i0]) * sx
            out[y * cotes + x] = a + (b - a) * sy
    return out


def nuages(cotes, octaves, rng):
    """Somme d'octaves : la grosse forme, puis le détail."""
    total = [0.0] * (cotes * cotes)
    amplitude, somme = 1.0, 0.0
    #  On PART DE CINQ CASES, pas de trois. Les grandes taches
    #  d'une grille grossière sont mémorables : l'œil les reconnaît
    #  d'une tuile à l'autre et voit la répétition. Plus la maille
    #  de départ est fine, moins il y a de forme à retenir.
    cellules = 5
    for _ in range(octaves):
        couche = bruit(cotes, cellules, rng)
        for i in range(len(total)):
            total[i] += couche[i] * amplitude
        somme += amplitude
        amplitude *= 0.5
        cellules *= 2
    return [v / somme for v in total]


# ── Les fibres ───────────────────────────────────────────────
#  Des segments courts, couchés, groupés. Le regroupement compte
#  autant que les fibres elles-mêmes : réparties uniformément,
#  elles redonneraient le bruit homogène qu'on cherche à fuir.
def poser_les_fibres(dessin, cotes, rng, nombre, longueur, teinte, alpha):
    grappes = max(1, nombre // 7)
    centres = [(rng.uniform(0, cotes), rng.uniform(0, cotes)) for _ in range(grappes)]
    for _ in range(nombre):
        cx, cy = centres[rng.randrange(grappes)]
        x = cx + rng.gauss(0, cotes * 0.055)
        y = cy + rng.gauss(0, cotes * 0.055)
        angle = rng.uniform(0, math.pi)
        lg = rng.uniform(*longueur)
        dx, dy = math.cos(angle) * lg / 2, math.sin(angle) * lg / 2
        a = int(rng.uniform(*alpha))
        # Redessinée de l'autre côté quand elle franchit un bord :
        # c'est ce qui rend la tuile continue.
        for ox in (-cotes, 0, cotes):
            for oy in (-cotes, 0, cotes):
                dessin.line(
                    [(x - dx + ox, y - dy + oy), (x + dx + ox, y + dy + oy)],
                    fill=teinte + (a,), width=1)


def fabriquer_fibre():
    rng = random.Random(GRAINE)
    c = TAILLE

    # 1. l'épaisseur inégale de la feuille
    fond = nuages(c, 5, rng)
    # 2. de larges taches, plus lentes, qui donnent les zones nues
    taches = nuages(c, 3, random.Random(GRAINE + 7))

    px = bytearray(c * c)
    for i in range(c * c):
        # Les taches larges pèsent moins : c'est la fibre qui doit
        # porter la texture, pas le nuage.
        v = 0.78 * fond[i] + 0.22 * taches[i]
        # ramené autour du blanc : cette image sera multipliée sur le
        # papier, elle ne doit donc l'assombrir que d'un souffle.
        #  CONTRASTE FAIBLE, ET C'EST CE QUI REND LA RÉPÉTITION
        #  INVISIBLE. Une tuile se répète six fois sur la hauteur de
        #  la lettre ; tout ce qui s'y voit assez pour être reconnu
        #  se verra donc six fois. À vingt-deux niveaux d'écart, il
        #  n'y a plus de forme à reconnaître — seulement de la
        #  matière.
        px[i] = max(0, min(255, int(255 - (v - 0.5) * 22)))
    base = Image.frombytes("L", (c, c), bytes(px)).convert("RGBA")

    # 3. les fibres, en deux passes : les sombres puis les claires
    calque = Image.new("RGBA", (c, c), (0, 0, 0, 0))
    d = ImageDraw.Draw(calque)
    poser_les_fibres(d, c, rng, 4200, (5, 26), (108, 92, 66), (7, 20))
    poser_les_fibres(d, c, rng, 1800, (4, 18), (255, 252, 243), (8, 22))
    calque = calque.filter(ImageFilter.GaussianBlur(0.4))

    img = Image.alpha_composite(base, calque).convert("RGB")
    # un voile de flou très court : une fibre parfaitement nette est
    # un cheveu, pas une fibre.
    img = img.filter(ImageFilter.GaussianBlur(0.3))
    return img


# ── Le pli ───────────────────────────────────────────────────
#  Un pli n'est pas une ligne droite : son arête ondule de quelques
#  pixels, et sa force varie sur la longueur — plus marquée là où la
#  feuille a été appuyée, presque nulle ailleurs. C'est cette
#  irrégularité-là qu'aucun dégradé CSS ne sait produire, et la
#  raison d'en faire une image.
def fabriquer_pli(largeur=1400, hauteur=150):
    rng = random.Random(GRAINE + 31)
    img = Image.new("RGBA", (largeur, hauteur), (0, 0, 0, 0))
    px = img.load()
    milieu = hauteur / 2

    ondulation = nuages(64, 3, rng)          # l'axe du pli, qui serpente
    force = nuages(64, 2, random.Random(GRAINE + 41))   # sa vigueur

    for x in range(largeur):
        t = x / largeur * 63
        i = int(t)
        f = t - i
        o = ondulation[i] + (ondulation[min(i + 1, 63)] - ondulation[i]) * f
        g = force[i] + (force[min(i + 1, 63)] - force[i]) * f
        axe = milieu + (o - 0.5) * hauteur * 0.30
        vigueur = 0.30 + g * 1.05
        for y in range(hauteur):
            dy = (y - axe) / (hauteur * 0.30)
            #  Les deux lobes ne se touchent pas : ils sont écartés
            #  d'un cinquième, ce qui laisse une mince zone neutre à
            #  l'endroit de l'arête. Collés, ils faisaient une ligne
            #  franche — un trait de règle plutôt qu'un pli.
            if dy < 0:      # au-dessus : le creux, qui perd la lumière
                a = math.exp(-(dy + 0.20) ** 2 * 2.0) * 0.32 * vigueur
                px[x, y] = (104, 86, 56, int(max(0, a) * 255))
            else:           # en dessous : l'arête, qui la prend
                a = math.exp(-(dy - 0.20) ** 2 * 3.0) * 0.42 * vigueur
                px[x, y] = (255, 253, 245, int(max(0, a) * 255))
    return img.filter(ImageFilter.GaussianBlur(1.1))


def enregistrer(img, nom, qualite):
    SORTIE.mkdir(parents=True, exist_ok=True)
    chemin = SORTIE / nom
    img.save(chemin, "WEBP", quality=qualite, method=6)
    print(f"  {nom:14} {img.size[0]}×{img.size[1]}  {chemin.stat().st_size // 1024} Ko")


if __name__ == "__main__":
    print("Papier de la lettre —")
    enregistrer(fabriquer_fibre(), "fibre.webp", 88)
    enregistrer(fabriquer_pli(), "pli.webp", 92)
