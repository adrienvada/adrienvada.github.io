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

  ressources/images/univers/<slug>/<nom>-flou.webp    la photo HORS POINT
      200 px de large, passée au flou. C'est la photo telle qu'on la voit
      avant la mise au point : posée sur la vraie, elle s'efface quand la
      photo arrive au milieu de l'écran, et revient à peine quand elle
      s'en va (voir .u-flou dans univers.css). Flouter en direct — un
      filter: blur() animé — recalculerait l'image entière à chaque image
      du défilement, sur des photos de 2400 px : un téléphone y cale. Un
      fondu entre deux images toutes faites ne coûte presque rien. Et
      l'image floue n'a pas besoin de pixels : 200 px agrandis sous un
      tel flou ne se distinguent pas de l'original flouté, pour 3 Ko.

  ressources/images/galerie/vignettes/<nom>-{320,640,960}.webp
      Les vignettes du book, AU CADRE DE LA PHOTO : la galerie est une
      planche contact, où chaque photo garde sa largeur naturelle (voir
      build/generer-page-galerie.js). Elles étaient recadrées en 3:4, le
      format de l'ancienne grille : douze photos sur dix-neuf, plus larges
      que hautes, y perdaient la moitié de leur image — le décor, le
      partenaire, la salle. La largeur donnée est celle de la vignette ;
      la page lit ses proportions dans le fichier.

  ressources/images/portrait-affiche-{480,720,960}.webp (+ -720.jpg)
      Le portrait d'affiche de l'en-tête de l'accueil : la photo de
      présentation du book (vignette_principale.jpeg), à son cadre, en
      trois largeurs — l'en-tête la montre sur toute la largeur d'un
      téléphone, sur 340 px à l'écran. Le JPEG est le repli des
      navigateurs sans WebP.

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
from PIL import Image, ImageFilter, ImageOps

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
# La photo hors point : sa largeur, le rayon du flou à cette largeur (4 px
# sur 200, soit 2 % : une vraie photo hors point, pas une bouillie), et une
# qualité plus basse — le flou n'a pas de détail à perdre.
LARGEUR_FLOU = 200
RAYON_FLOU = 4
QUALITE_FLOU = 75
# Trois pour la galerie : sa planche passe de rangées serrées à une photo
# par rangée (boutons − / +), et la vignette doit rester nette à chaque cran.
LARGEURS_GALERIE = (320, 640, 960)
# 78 : le seuil où la compression cesse de se voir dans les fonds sombres
# des photos de plateau, mesuré sur Bérénice et Fulguré.e.s. Plus bas, les
# aplats noirs se pommèlent.
QUALITE = 78



def ouvrir(chemin):
    im = Image.open(chemin)
    # L'orientation portée par l'EXIF est appliquée une fois pour toutes :
    # la version allégée ne transporte pas l'EXIF, et un portrait tourné
    # par l'appareil arriverait couché.
    im = ImageOps.exif_transpose(im)
    return im.convert("RGB")


def ecrire_webp(im, chemin, qualite=QUALITE):
    tmp = chemin + ".tmp"
    im.save(tmp, "WEBP", quality=qualite, method=6)
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
    """<nom>.jpg → [<nom>-240.webp, ]<nom>-640.webp, <nom>-1280.webp[, <nom>-1920.webp], <nom>-flou.webp."""
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
    cible = f"{base}-flou.webp"
    if forcer or not os.path.exists(cible):
        if im is None:
            im = ouvrir(source)
        w, h = im.size
        r = im if w <= LARGEUR_FLOU else im.resize((LARGEUR_FLOU, round(h * LARGEUR_FLOU / w)), Image.LANCZOS)
        ecrire_webp(r.filter(ImageFilter.GaussianBlur(RAYON_FLOU)), cible, QUALITE_FLOU)
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
        # Le cadre de la photo, réduit — jamais agrandi : une photo plus
        # étroite que la vignette voulue est écrite à sa propre taille.
        w, h = im.size
        taille = (largeur, round(h * largeur / w)) if w > largeur else (w, h)
        ecrire_webp(im.resize(taille, Image.LANCZOS), cible)
        faites.append(cible)
    return faites


# Le portrait d'affiche : la photo de présentation du book (la première de
# galerie.js), celle que l'en-tête montrait déjà en médaillon.
PORTRAIT = os.path.join(GALERIE, "vignette_principale.jpeg")
LARGEURS_PORTRAIT = (480, 720, 960)


def portrait_affiche(forcer):
    faites = []
    im = None
    cibles = [(l, "webp") for l in LARGEURS_PORTRAIT] + [(720, "jpg")]
    for largeur, fmt in cibles:
        cible = os.path.join(ROOT, "ressources", "images", f"portrait-affiche-{largeur}.{fmt}")
        if os.path.exists(cible) and not forcer:
            continue
        if im is None:
            im = ouvrir(PORTRAIT)
        w, h = im.size
        r = im.resize((largeur, round(h * largeur / w)), Image.LANCZOS) if w > largeur else im
        if fmt == "webp":
            ecrire_webp(r, cible)
        else:
            tmp = cible + ".tmp"
            r.save(tmp, "JPEG", quality=82, optimize=True, progressive=True)
            os.replace(tmp, cible)
        faites.append(cible)
    return faites


def orphelines():
    """Les versions allégées dont l'original a disparu."""
    out = []
    for v in glob.glob(os.path.join(UNIVERS, "*", "*-*.webp")):
        base = re.sub(r"-(?:\d+|flou)\.webp$", "", v)
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
    faites += portrait_affiche(forcer)

    for f in faites:
        print(f"  {os.path.relpath(f, ROOT)}  {os.path.getsize(f) // 1024} Ko")
    print(f"{len(faites)} fichier(s) écrit(s)." if faites else "Rien à faire : tout est à jour.")
    restes = orphelines()
    if restes:
        print(f"  · {len(restes)} version(s) orpheline(s) — `--nettoyer` pour les effacer")


if __name__ == "__main__":
    main(sys.argv[1:])
