#!/usr/bin/env python3
"""Fabrique les versions allégées des photos que le site sert aux téléphones.

POURQUOI. Un téléphone de 390 px de large téléchargeait les mêmes fichiers
qu'un écran de bureau : 2400 px et jusqu'à 900 Ko pour une photo plein
cadre, alors que 1280 px suffisent à le remplir, même sur un écran « retina ».
La page Bérénice pesait ainsi 2 Mo, le répertoire 4,7 Mo — ses vignettes de
200 px de large étaient les photos entières. Et la galerie faisait l'inverse :
des vignettes de 176 px étirées sur 300 à 500 pixels d'écran, donc floues.

CE QUE LE SCRIPT PRODUIT, à côté des originaux servis :

  ressources/images/univers/<slug>/<nom>-640.webp     les photos des univers,
  ressources/images/univers/<slug>/<nom>-1280.webp    l'affiche et la jaquette
  ressources/images/univers/<slug>/<nom>-1920.webp    (plein cadre seulement)
      Même cadrage que la photo (proportions intactes). Les pages les
      proposent au navigateur avec `srcset` : il prend la plus petite qui
      suffit à l'écran. Sur un écran large, rien ne change — la photo
      d'origine reste servie, et c'est elle que montre l'agrandissement.

      POURQUOI 1920 POUR LE PLEIN CADRE. Sur un téléphone tenu droit, le
      plein cadre est un écran HAUT : une photo en paysage y est agrandie
      jusqu'à couvrir toute la hauteur, puis encore de 22 % par la
      parallaxe. Elle s'affiche alors sur trois à quatre fois la largeur de
      l'écran, et 1280 px s'y verraient mous. Les numéros des photos en
      plein cadre sont lus dans univers.js, comme le fait
      prepare-univers-photos.py.

  ressources/images/univers/<slug>/<nom>-240.webp     la COUVERTURE seule
      La première photo du montage de chaque univers — celle que montrent
      le répertoire et l'onglet Dates — reçoit en plus une version de
      240 px. L'onglet Dates l'affiche sur 40 px de large, en tête de
      chaque spectacle quand on range les dates par spectacle : la plus
      petite des autres versions, 640 px, pesait jusqu'à 86 Ko pour cette
      vignette.

  ressources/images/galerie/vignettes/<nom>-{320,640,960}.webp
      Les vignettes du book, recadrées en 3:4 (le format de la grille),
      en visant le haut du cadre — là où sont les visages.

Il ne REFAIT RIEN de ce qui existe déjà : seules les versions manquantes
sont fabriquées, pour ne pas réécrire à l'octet près des fichiers inchangés
— un encodeur d'une autre version les réécrirait légèrement autrement, et
chaque passage laisserait un diff sans objet.

    python3 build/variantes-images.py              les manquantes seulement
    python3 build/variantes-images.py --tout       tout refaire
    python3 build/variantes-images.py --nettoyer   effacer les orphelines

`build/prepare-univers-photos.py` l'appelle lui-même pour les photos qu'il
vient de refaire : remplacer une photo de spectacle ne demande donc toujours
qu'une commande. Après un AJOUT AU BOOK (galerie.js), le lancer à la main.
"""
import os
import re
import sys
import glob
from PIL import Image, ImageOps

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
UNIVERS = os.path.join(ROOT, "ressources", "images", "univers")
GALERIE = os.path.join(ROOT, "ressources", "images", "galerie")
VIGNETTES = os.path.join(GALERIE, "vignettes")

# Deux largeurs pour les univers. 640 : une vignette de groupe sur un
# écran ordinaire. 1280 : la même sur un écran dense. Au-delà, c'est
# l'original qui sert. Le plein cadre y ajoute 1920 (voir plus haut).
LARGEURS_UNIVERS = (640, 1280)
LARGEUR_PLEIN = 1920
LARGEUR_COUVERTURE = 240
# Trois pour la galerie : sa grille passe de quatre colonnes à une seule
# (boutons − / +), et la vignette doit rester nette à chaque cran.
LARGEURS_GALERIE = (320, 640, 960)
# 78 : le seuil où la compression cesse de se voir dans les fonds sombres
# des photos de plateau, mesuré sur Bérénice et Fulguré.e.s. Plus bas, les
# aplats noirs se pommèlent.
QUALITE = 78

# Le format de la grille du book, et le point visé en recadrant : le même
# que l'ancienne commande des vignettes (35 % depuis le haut).
RAPPORT_GALERIE = 3 / 4
VISEE_GALERIE = (0.5, 0.35)


def ouvrir(chemin):
    im = Image.open(chemin)
    # L'orientation portée par l'EXIF est appliquée une fois pour toutes :
    # la version allégée ne transporte pas l'EXIF, et un portrait tourné
    # par l'appareil arriverait couché.
    im = ImageOps.exif_transpose(im)
    return im.convert("RGB")


def ecrire_webp(im, chemin):
    tmp = chemin + ".tmp"
    im.save(tmp, "WEBP", quality=QUALITE, method=6)
    os.replace(tmp, chemin)


def photos_plein_cadre():
    """{(slug, numéro)} des photos montées seules, donc en plein cadre.

    Même lecture que read_sequences() dans prepare-univers-photos.py : on
    repère chaque `slug: '…'` d'univers.js, puis les `p: [...]` qui suivent
    jusqu'au slug suivant. Un temps à UNE photo est un plein cadre.
    """
    src = open(os.path.join(ROOT, "univers.js"), encoding="utf-8").read()
    cut = src.find("MOTEUR —")
    if cut > 0:
        src = src[:cut]
    marks = [(m.start(), m.group(1)) for m in re.finditer(r"slug:\s*'([a-z]+)'", src)]
    out = set()
    for i, (pos, slug) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(src)
        for grp in re.findall(r"\bp:\s*\[([0-9,\s]+)\]", src[pos:end]):
            nums = [int(n) for n in grp.replace(" ", "").split(",") if n]
            if len(nums) == 1:
                out.add((slug, nums[0]))
    return out


def couvertures():
    """{(slug, numéro)} : la première photo du montage de chaque univers.

    C'est la règle de photoPrincipale() dans univers-montage.js : le
    premier temps qui montre des photos, sa première photo.
    """
    src = open(os.path.join(ROOT, "univers.js"), encoding="utf-8").read()
    cut = src.find("MOTEUR —")
    if cut > 0:
        src = src[:cut]
    marks = [(m.start(), m.group(1)) for m in re.finditer(r"slug:\s*'([a-z]+)'", src)]
    out = set()
    for i, (pos, slug) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(src)
        m = re.search(r"\bp:\s*\[\s*(\d+)", src[pos:end])
        if m:
            out.add((slug, int(m.group(1))))
    return out


PLEIN_CADRE = None
COUVERTURES = None


def largeurs_pour(source):
    """Les largeurs à fabriquer pour cette photo d'univers."""
    global PLEIN_CADRE, COUVERTURES
    if PLEIN_CADRE is None:
        PLEIN_CADRE = photos_plein_cadre()
        COUVERTURES = couvertures()
    slug = os.path.basename(os.path.dirname(source))
    nom = os.path.basename(source)[:-len(".jpg")]
    plein = nom.isdigit() and (slug, int(nom)) in PLEIN_CADRE
    couverture = nom.isdigit() and (slug, int(nom)) in COUVERTURES
    return (((LARGEUR_COUVERTURE,) if couverture else ())
            + LARGEURS_UNIVERS + ((LARGEUR_PLEIN,) if plein else ()))


def variantes_univers(source, forcer):
    """<nom>.jpg → [<nom>-240.webp, ]<nom>-640.webp, <nom>-1280.webp[, <nom>-1920.webp]."""
    base = source[:-len(".jpg")]
    faites = []
    im = None
    for largeur in largeurs_pour(source):
        cible = f"{base}-{largeur}.webp"
        if os.path.exists(cible) and not forcer:
            continue
        if im is None:
            im = ouvrir(source)
        w, h = im.size
        # UNE PHOTO PLUS ÉTROITE QUE LA CIBLE N'EST PAS AGRANDIE : elle est
        # simplement réencodée à sa taille. Le fichier doit exister quand
        # même — les pages le demandent sans savoir la taille de l'original.
        r = im if w <= largeur else im.resize((largeur, round(h * largeur / w)), Image.LANCZOS)
        ecrire_webp(r, cible)
        faites.append(cible)
    return faites


def fichiers_du_book():
    """Les photos du book, lues dans galerie.js — la seule liste qui fait foi."""
    src = open(os.path.join(ROOT, "galerie.js"), encoding="utf-8").read()
    photos = []
    for fichier, dossier in re.findall(r"file:\s*'([^']+)'\s*,\s*folder:\s*'([^']+)'", src):
        chemin = (os.path.join(ROOT, "ressources", "images", fichier) if dossier == "profil"
                  else os.path.join(GALERIE, fichier))
        photos.append(chemin)
    if not photos:
        raise SystemExit("galerie.js : aucune photo trouvée (GALLERY_IMAGES).")
    return photos


def vignettes_galerie(source, forcer):
    nom = os.path.splitext(os.path.basename(source))[0]
    faites = []
    im = None
    for largeur in LARGEURS_GALERIE:
        cible = os.path.join(VIGNETTES, f"{nom}-{largeur}.webp")
        if os.path.exists(cible) and not forcer:
            continue
        if im is None:
            im = ouvrir(source)
        taille = (largeur, round(largeur / RAPPORT_GALERIE))
        # Une photo plus petite que la vignette voulue n'est pas agrandie :
        # on la recadre à ses propres dimensions, au même rapport.
        if im.size[0] < taille[0] or im.size[1] < taille[1]:
            k = min(im.size[0] / taille[0], im.size[1] / taille[1])
            taille = (int(taille[0] * k), int(taille[1] * k))
        ecrire_webp(ImageOps.fit(im, taille, Image.LANCZOS, centering=VISEE_GALERIE), cible)
        faites.append(cible)
    return faites


def orphelines():
    """Les versions allégées dont l'original a disparu."""
    out = []
    for v in glob.glob(os.path.join(UNIVERS, "*", "*-*.webp")):
        base = re.sub(r"-\d+\.webp$", "", v)
        if not os.path.exists(base + ".jpg"):
            out.append(v)
    book = {os.path.splitext(os.path.basename(p))[0] for p in fichiers_du_book()}
    for v in glob.glob(os.path.join(VIGNETTES, "*.webp")):
        if re.sub(r"-\d+$", "", os.path.splitext(os.path.basename(v))[0]) not in book:
            out.append(v)
    return out


def main(arguments):
    forcer = "--tout" in arguments
    # Des chemins donnés à la suite : ne traiter qu'eux, et de force. C'est
    # l'appel de prepare-univers-photos.py, qui sait ce qu'il vient d'écrire.
    cibles = [a for a in arguments if not a.startswith("--")]
    if cibles:
        n = sum(len(variantes_univers(os.path.abspath(c), True)) for c in cibles if c.endswith(".jpg"))
        print(f"  {n} version(s) allégée(s) refaite(s)")
        return

    if "--nettoyer" in arguments:
        for v in orphelines():
            os.remove(v)
            print(f"  effacé : {os.path.relpath(v, ROOT)}")
        return

    os.makedirs(VIGNETTES, exist_ok=True)
    faites = []
    for source in sorted(glob.glob(os.path.join(UNIVERS, "*", "*.jpg"))):
        faites += variantes_univers(source, forcer)
    for source in fichiers_du_book():
        if not os.path.exists(source):
            print(f"  ⚠ introuvable : {os.path.relpath(source, ROOT)} (galerie.js)")
            continue
        faites += vignettes_galerie(source, forcer)

    for f in faites:
        print(f"  {os.path.relpath(f, ROOT)}  {os.path.getsize(f) // 1024} Ko")
    print(f"{len(faites)} fichier(s) écrit(s)." if faites else "Rien à faire : tout est à jour.")
    restes = orphelines()
    if restes:
        print(f"  · {len(restes)} version(s) orpheline(s) — `--nettoyer` pour les effacer")


if __name__ == "__main__":
    main(sys.argv[1:])
