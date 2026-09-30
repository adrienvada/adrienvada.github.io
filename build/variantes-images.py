#!/usr/bin/env python3
"""Fabrique les versions allégées des photos que sert le site.

POURQUOI. Un téléphone de 390 px de large téléchargeait les mêmes fichiers
qu'un écran de bureau : 2400 px et jusqu'à 900 Ko pour une photo plein
cadre, alors que 1280 px suffisent à le remplir, même sur un écran « retina ».
La page Bérénice pesait ainsi 2 Mo, le répertoire 4,7 Mo — ses vignettes de
200 px de large étaient les photos entières. Et la galerie faisait l'inverse :
des vignettes de 176 px étirées sur 300 à 500 pixels d'écran, donc floues.
L'écran d'ordinateur, lui, recevait les JPEG d'origine : 2,76 Mo pour la
seule page Cléophène.

CE QUE LE SCRIPT PRODUIT, à côté des originaux servis :

  ressources/images/univers/<slug>/<nom>-640.webp     les photos des univers,
  ressources/images/univers/<slug>/<nom>-1280.webp    l'affiche et la jaquette
  ressources/images/univers/<slug>/<nom>-1920.webp    (plein cadre seulement)
      Même cadrage que la photo (proportions intactes). Les pages les
      proposent au navigateur avec `srcset` : il prend la plus petite qui
      suffit à l'écran. L'agrandissement, lui, montre toujours l'original.

      POURQUOI 1920 POUR LE PLEIN CADRE. Sur un téléphone tenu droit, le
      plein cadre est un écran HAUT : une photo en paysage y est agrandie
      jusqu'à couvrir toute la hauteur, puis encore de 22 % par la
      parallaxe. Elle s'affiche alors sur trois à quatre fois la largeur de
      l'écran, et 1280 px s'y verraient mous. Les numéros des photos en
      plein cadre sont lus dans univers.js, comme le fait
      prepare-univers-photos.py.

  ressources/images/univers/<slug>/<nom>-2400.webp    l'ÉCRAN LARGE
      Une photo du montage dont l'original dépasse 1920 px de large — un
      plein cadre en paysage, préparé en 2400 px — reçoit aussi sa version
      WebP À PLEINE DÉFINITION, pour l'écran d'ordinateur, qui n'avait que
      le JPEG. Même définition, même image à l'œil, et 32 à 78 % de moins :
      Cléophène 9 passe de 696 à 374 Ko, Cléophène 5 de 403 à 148.

      LA QUALITÉ EST CHOISIE PHOTO PAR PHOTO : la plus basse, à partir de
      QUALITE, qui garde un SSIM d'au moins 0,98 face au JPEG (voir
      comparateur(), plus bas). Le grain en demande plus : q78 suffit à
      Cléophène 5, le 9 veut q82, Fulguré.e.s 10 q92. Et la version n'est
      ÉCRITE QUE SI ELLE PÈSE AU MOINS 25 % DE MOINS que le JPEG : en deçà,
      elle ne vaut pas sa place dans le dépôt, et c'est le JPEG qui reste
      servi. C'est le sort des photos au grain le plus serré — Cléophène 21
      ne tient 0,98 qu'à q94, 422 Ko pour 463. TOUTES N'ONT DONC PAS LEUR
      -2400 : variantes.json (plus bas) dit lesquelles, et pourquoi.

      L'affiche d'un film n'en a pas : elle ne dépasse jamais 540 px à
      l'écran (.u-affiche, univers.css), et sa version de 1280 lui suffit.

      Les pages ne la proposent qu'aux photos de la liste ECRAN_LARGE
      d'univers-montage.js, que ce script ÉCRIT LUI-MÊME d'après
      variantes.json (ecrire_liste_large) : une version proposée mais
      absente serait une image cassée sur ordinateur. Quand la liste
      change, il le dit — les pages sont alors à régénérer.

  ressources/images/univers/<slug>/<nom>-240.webp     la COUVERTURE seule
      La première photo du montage de chaque univers reçoit en plus une
      version de 240 px, à son cadre entier. Elle a été la vignette de
      l'onglet Dates et du CV (la plus petite des autres versions, 640 px,
      pesait jusqu'à 86 Ko pour 40 px de large) ; la vignette recadrée,
      plus bas, l'y remplace. Elle reste le halo de la salle noire, quand
      on y joue la bande-annonce du spectacle.

  ressources/images/univers/<slug>/<nom>-v.webp       la VIGNETTE DU CV
      La couverture encore, mais RECADRÉE, en 144 × 192 : la vignette d'une
      ligne du CV fait 48 × 64 px, soit 144 × 192 sur un téléphone de
      densité 3. La version de 240 px garde le cadre de la photo ; en
      paysage, il ne lui restait que 100 à 181 px de haut pour les 192
      qu'il faut (Le rapt : 100), et la vignette était floue — quand
      Bérénice, en portrait, pesait 18 Ko pour 144 px utiles. Le recadrage
      est celui que ferait `object-fit: cover` au `cadre` de la couverture
      dans univers.js (framePos, univers-montage.js) : la vignette montre
      ce qu'elle montrait, à pleine définition, et les neuf pèsent 35 Ko
      au lieu de 54. L'onglet Dates (40 × 50, 48 × 56) s'en sert aussi :
      il n'en rogne que quelques pixels de haut.

      CHANGER CE CADRE, OU LA PREMIÈRE PHOTO DU MONTAGE, demande de
      relancer le script : il voit que le cadre a changé et refait la
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

  ressources/images/univers/variantes.json            la MÉMOIRE du script
      Pour chaque photo de plus de 1920 px : la qualité de sa -2400 et son
      SSIM, ou la raison pour laquelle elle n'en a pas. Pour chaque
      couverture : le cadre de sa vignette. Chaque fois avec l'empreinte du
      JPEG d'où elle vient. C'est ce qui évite de refaire la recherche de
      qualité à chaque passage, et ce qui fait refaire une vignette dont le
      cadre a changé. Écrite par le script, jamais à la main.

  ressources/images/galerie/vignettes/<nom>-{320,640,960}.webp
      Les vignettes du book, AU CADRE DE LA PHOTO : la galerie est une
      planche contact, où chaque photo garde sa largeur naturelle (voir
      build/generer-page-galerie.js). Elles étaient recadrées en 3:4, le
      format de l'ancienne grille : douze photos sur dix-neuf, plus larges
      que hautes, y perdaient la moitié de leur image — le décor, le
      partenaire, la salle. La largeur donnée est celle de la vignette ;
      la page lit ses proportions dans le fichier.

  ressources/images/portrait-affiche-{480,720,960}.webp (+ -720.jpg, + .avif)
      Le portrait d'affiche de l'en-tête de l'accueil : la photo de
      présentation du book (vignette_principale.jpeg), à son cadre, en
      trois largeurs — l'en-tête la montre sur toute la largeur d'un
      téléphone, sur 340 px à l'écran. Le JPEG est le repli des
      navigateurs sans WebP.

      ET EN AVIF, LUI SEUL. C'est la première image de l'accueil, celle
      qu'on attend (le LCP) : au SSIM de la WebP servie, l'AVIF pèse 27 à
      38 % de moins (14, 22 et 30 Ko contre 19, 33 et 49) ; proposé avant
      elle, il fait paraître l'accueil 0,28 s plus tôt en 4G lente (3,71 →
      3,43 s, processeur ralenti ×4). Ailleurs, l'AVIF ne vaut pas
      son décodage, plus lent de 20 à 40 % : sur les photos de plateau, le
      gain allait de 44 % à… une perte de 17 % (Cléophène 9 en 1280), selon
      le grain. Trop incertain pour le généraliser.

Il ne REFAIT RIEN de ce qui existe déjà : seules les versions manquantes
sont fabriquées, pour ne pas réécrire à l'octet près des fichiers inchangés
— un encodeur d'une autre version les réécrirait légèrement autrement, et
chaque passage laisserait un diff sans objet. Seules la -2400 et la
vignette du CV sont refaites d'elles-mêmes quand leur JPEG ou leur cadre a
changé : variantes.json s'en souvient.

    python3 build/variantes-images.py              les manquantes seulement
    python3 build/variantes-images.py --tout       tout refaire
    python3 build/variantes-images.py --nettoyer   effacer les orphelines

Il lui faut Pillow 11.3 ou plus (l'AVIF y est intégré) et numpy (le SSIM) :
`pip install pillow numpy`. numpy n'est chargé que pour une -2400 ou un
AVIF à fabriquer.

`build/prepare-univers-photos.py` l'appelle lui-même pour les photos qu'il
vient de refaire : remplacer une photo de spectacle ne demande donc toujours
qu'une commande. Après un AJOUT AU BOOK (galerie.js), le lancer à la main.
"""
import io
import os
import re
import sys
import glob
import json
import hashlib
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
UNIVERS = os.path.join(ROOT, "ressources", "images", "univers")
GALERIE = os.path.join(ROOT, "ressources", "images", "galerie")
VIGNETTES = os.path.join(GALERIE, "vignettes")
MEMOIRE = os.path.join(UNIVERS, "variantes.json")

# Deux largeurs pour les univers. 640 : une vignette de groupe sur un
# écran ordinaire. 1280 : la même sur un écran dense. Le plein cadre y
# ajoute 1920 (voir plus haut), et l'écran large 2400.
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

# L'ÉCRAN LARGE (voir plus haut). On ne descend jamais sous QUALITE, même
# quand le SSIM le permettrait : c'est le plancher des fonds sombres. On
# monte de deux en deux jusqu'à 94 ; au-delà, un WebP ne pèse plus 25 % de
# moins qu'un JPEG de plateau.
LARGEUR_LARGE = 2400
QUALITES_LARGE = tuple(range(QUALITE, 96, 2))
SSIM_LARGE = 0.98
GAIN_LARGE = 0.25

# La vignette du CV : 48 × 64 px à l'écran, fois 3.
VIGNETTE_CV = (144, 192)

# Le portrait en AVIF. Chroma 4:2:0 : en 4:4:4 (le réglage de sharp),
# l'AVIF ne gagnait plus rien. Vitesse 6 : les réglages plus lents
# (4, 2, 0) donnaient les mêmes poids à 1 Ko près, trois à trente fois
# plus lentement. Un seul fil de calcul : l'encodeur n'écrit pas tout à
# fait le même fichier sur un fil et sur plusieurs — ainsi toutes les
# machines écrivent le même.
REGLAGES_AVIF = {"subsampling": "4:2:0", "speed": 6, "max_threads": 1}
QUALITES_AVIF = tuple(range(30, 92, 2))


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


def encoder(im, format_, **reglages):
    """L'image encodée, en mémoire : on la mesure avant de l'écrire."""
    tampon = io.BytesIO()
    im.save(tampon, format_, **reglages)
    return tampon.getvalue()


def ecrire(octets, chemin):
    tmp = chemin + ".tmp"
    with open(tmp, "wb") as f:
        f.write(octets)
    os.replace(tmp, chemin)


def comparateur(reference):
    """Une fonction qui donne le SSIM d'une image face à `reference`.

    LA MESURE DE L'AUDIT (juillet 2026), pour que les chiffres se
    comparent : SSIM de la luminance seule, sur des fenêtres de 8 × 8 px
    au pas de 4, moyenné sur l'image. 1 : identique ; 0,98 : la limite
    sous laquelle on commence à deviner, en grand, un aplat plus lisse ou
    un grain moins vif. Les sommes par fenêtre passent par des tables
    cumulées : une photo de 2400 px se mesure en une demi-seconde.
    """
    try:
        import numpy as np
    except ImportError:
        raise SystemExit("numpy est introuvable : il mesure le SSIM des versions "
                         "« écran large » et du portrait en AVIF.\n  pip install numpy")
    FEN, PAS = 8, 4
    N = FEN * FEN
    C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2

    def luminance(im):
        x = np.asarray(im.convert("RGB"), dtype=np.float64)
        return x[..., 0] * 0.299 + x[..., 1] * 0.587 + x[..., 2] * 0.114

    def par_fenetre(x):
        s = np.zeros((x.shape[0] + 1, x.shape[1] + 1))
        s[1:, 1:] = x.cumsum(0).cumsum(1)
        ys = np.arange(0, x.shape[0] - FEN + 1, PAS)[:, None]
        xs = np.arange(0, x.shape[1] - FEN + 1, PAS)[None, :]
        return s[ys + FEN, xs + FEN] - s[ys, xs + FEN] - s[ys + FEN, xs] + s[ys, xs]

    a = luminance(reference)
    sa, saa = par_fenetre(a), par_fenetre(a * a)
    ma = sa / N
    va = (saa - N * ma * ma) / (N - 1)

    def ssim(im):
        b = luminance(im)
        if b.shape != a.shape:
            raise ValueError(f"tailles différentes : {b.shape} contre {a.shape}")
        mb = par_fenetre(b) / N
        vb = (par_fenetre(b * b) - N * mb * mb) / (N - 1)
        cov = (par_fenetre(a * b) - N * ma * mb) / (N - 1)
        v = ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2))
        return float(v.mean())

    return ssim


def empreinte(chemin):
    """Douze caractères qui changent dès que le JPEG change."""
    with open(chemin, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()[:12]


def lire_memoire():
    try:
        with open(MEMOIRE, encoding="utf-8") as f:
            m = json.load(f)
    except FileNotFoundError:
        m = {}
    m.setdefault("2400", {})
    m.setdefault("v", {})
    return m


def ecrire_memoire(m):
    m["_"] = ("Écrit par build/variantes-images.py — ne pas modifier à la main. "
              "« 2400 » : chaque photo de plus de 1920 px, avec la qualité de sa "
              "version <nom>-2400.webp, ou null et la raison si elle n'en a pas "
              "(le JPEG reste alors servi aux écrans larges). « v » : le cadre "
              "de la vignette <nom>-v.webp de chaque couverture. « empreinte » : "
              "celle du JPEG d'où elles viennent.")
    ordre = {"_": 0, "2400": 1, "v": 2}
    m = {k: m[k] for k in sorted(m, key=lambda k: ordre.get(k, 9))}
    for k in ("2400", "v"):
        m[k] = dict(sorted(m[k].items(), key=lambda kv: cle_de_tri(kv[0])))
    tmp = MEMOIRE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(m, f, ensure_ascii=False, indent=1)
        f.write("\n")
    os.replace(tmp, MEMOIRE)
    ecrire_liste_large(m)


# La liste des photos qui ont leur -2400, dans univers-montage.js : les
# pages ne la proposent qu'à elles. Une -2400 proposée mais absente, c'est
# une image cassée sur ordinateur ; présente mais pas proposée, un gain
# perdu. Elle suit donc variantes.json, et c'est ce script qui l'écrit.
MONTAGE_JS = os.path.join(ROOT, "univers-montage.js")
LISTE_LARGE = re.compile(r"(const ECRAN_LARGE = new Set\(\[)[^\]]*(\]\);)")


def ecrire_liste_large(m):
    cles = [f"'{c}'" for c, e in m["2400"].items() if e.get("qualite") is not None]
    lignes, ligne = [], ""
    for c in cles:
        if ligne and len(ligne) + len(c) + 2 > 80:
            lignes.append(ligne + ",")
            ligne = ""
        ligne = f"{ligne}, {c}" if ligne else f"        {c}"
    if ligne:
        lignes.append(ligne)
    corps = ("\n" + "\n".join(lignes) + "\n    ") if lignes else ""
    src = open(MONTAGE_JS, encoding="utf-8").read()
    if not LISTE_LARGE.search(src):
        print("  ⚠ univers-montage.js : la liste ECRAN_LARGE est introuvable — "
              "les pages ne proposent plus aucune version écran large")
        return
    neuf = LISTE_LARGE.sub(lambda x: x.group(1) + corps + x.group(2), src, count=1)
    if neuf != src:
        tmp = MONTAGE_JS + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(neuf)
        os.replace(tmp, MONTAGE_JS)
        print("  ⚠ univers-montage.js : la liste des versions écran large a changé — "
              "régénérez les pages : npm --prefix build run pages")


def cle_de_tri(cle):
    slug, _, nom = cle.partition("/")
    return (slug, int(nom) if nom.isdigit() else 0, nom)


def sections_univers():
    """[(slug, texte de sa section)] dans univers.js, moteur exclu.

    Même lecture que read_sequences() dans prepare-univers-photos.py : on
    repère chaque `slug: '…'`, et sa section court jusqu'au slug suivant.
    """
    src = open(os.path.join(ROOT, "univers.js"), encoding="utf-8").read()
    cut = src.find("MOTEUR —")
    if cut > 0:
        src = src[:cut]
    marks = [(m.start(), m.group(1)) for m in re.finditer(r"slug:\s*'([a-z]+)'", src)]
    return [(slug, src[pos:(marks[i + 1][0] if i + 1 < len(marks) else len(src))])
            for i, (pos, slug) in enumerate(marks)]


def photos_plein_cadre():
    """{(slug, numéro)} des photos montées seules, donc en plein cadre.

    Les `p: [...]` de chaque section d'univers.js : un temps à UNE photo
    est un plein cadre.
    """
    out = set()
    for slug, section in sections_univers():
        for grp in re.findall(r"\bp:\s*\[([0-9,\s]+)\]", section):
            nums = [int(n) for n in grp.replace(" ", "").split(",") if n]
            if len(nums) == 1:
                out.add((slug, nums[0]))
    return out


# Les mots de `cadre`, comme FRAMES dans univers-montage.js.
CADRES = {
    "centre": (50, 50), "haut": (50, 0), "bas": (50, 100),
    "gauche": (0, 50), "droite": (100, 50),
    "haut gauche": (0, 0), "haut droite": (100, 0),
    "bas gauche": (0, 100), "bas droite": (100, 100),
}


def position(valeur):
    """Un `cadre` d'univers.js → (x, y) en pour cent, comme framePos().

    Un mot connu, ou deux pourcentages de 0 à 100 ; tout le reste laisse
    la photo centrée — c'est ce que fait la page, qui le signale dans la
    console.
    """
    cle = " ".join(str(valeur or "").split()).lower()
    if cle in CADRES:
        return CADRES[cle]
    m = re.fullmatch(r"(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%", cle)
    if m and float(m.group(1)) <= 100 and float(m.group(2)) <= 100:
        return (float(m.group(1)), float(m.group(2)))
    return CADRES["centre"]


def bloc_autour(src, i):
    """Le texte de l'objet `{ … }` qui contient la position i.

    Le temps du montage où se trouve un `p:` — c'est là que vit son
    `cadre`. On remonte à l'accolade ouvrante qui n'est pas refermée, puis
    on descend jusqu'à celle qui la ferme, sans compter les accolades des
    chaînes (une légende peut en contenir).
    """
    prof = 0
    debut = i
    while debut > 0:
        debut -= 1
        c = src[debut]
        if c == "}":
            prof += 1
        elif c == "{":
            if prof == 0:
                break
            prof -= 1
    prof = 0
    j = debut
    guillemet = None
    while j < len(src):
        c = src[j]
        if guillemet:
            if c == "\\":
                j += 1
            elif c == guillemet:
                guillemet = None
        elif c in "'\"`":
            guillemet = c
        elif c == "{":
            prof += 1
        elif c == "}":
            prof -= 1
            if prof == 0:
                return src[debut:j + 1]
        j += 1
    return src[debut:]


def couvertures():
    """{(slug, numéro): (x, y)} : la première photo du montage de chaque
    univers, et le cadre où la montrent ses vignettes.

    C'est la règle de couverture() dans univers-montage.js : le premier
    temps qui montre des photos, sa première photo — et le `cadre` que ce
    même temps lui donne (framePos), centrée sinon.
    """
    out = {}
    for slug, section in sections_univers():
        m = re.search(r"\bp:\s*\[\s*(\d+)", section)
        if not m:
            continue
        n = int(m.group(1))
        cadre = None
        c = re.search(r"\bcadre:\s*\{([^}]*)\}", bloc_autour(section, m.start()))
        if c:
            for num, _, valeur in re.findall(r"(\d+)\s*:\s*(['\"])(.*?)\2", c.group(1)):
                if int(num) == n:
                    cadre = valeur
        out[(slug, n)] = position(cadre)
    return out


PLEIN_CADRE = None
COUVERTURES = None


def lire_montage():
    global PLEIN_CADRE, COUVERTURES
    if PLEIN_CADRE is None:
        PLEIN_CADRE = photos_plein_cadre()
        COUVERTURES = couvertures()


def largeurs_pour(source):
    """Les largeurs à fabriquer pour cette photo d'univers."""
    lire_montage()
    slug = os.path.basename(os.path.dirname(source))
    nom = os.path.basename(source)[:-len(".jpg")]
    plein = nom.isdigit() and (slug, int(nom)) in PLEIN_CADRE
    couverture = nom.isdigit() and (slug, int(nom)) in COUVERTURES
    return (((LARGEUR_COUVERTURE,) if couverture else ())
            + LARGEURS_UNIVERS + ((LARGEUR_PLEIN,) if plein else ()))


def cle_photo(source):
    """« cleophene/9 » : le nom d'une photo dans variantes.json."""
    return os.path.basename(os.path.dirname(source)) + "/" + os.path.basename(source)[:-len(".jpg")]


def variantes_univers(source, forcer, memoire, tout=None):
    """<nom>.jpg → [<nom>-240.webp, ]<nom>-640.webp, <nom>-1280.webp[, <nom>-1920.webp],
    <nom>-flou.webp[, <nom>-2400.webp][, <nom>-v.webp].

    `forcer` refait les premières. La -2400 et la vignette du CV, elles,
    suivent variantes.json : refaites si leur JPEG ou leur cadre a changé,
    ou si `tout` (--tout) le demande.
    """
    if tout is None:
        tout = forcer
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
    faites += ecran_large(source, tout, memoire)
    faites += vignette_cv(source, tout, memoire)
    return faites


def ecran_large(source, tout, memoire):
    """<nom>-2400.webp, si la photo dépasse 1920 px et que le WebP en vaut la peine."""
    nom = os.path.basename(source)[:-len(".jpg")]
    if not nom.isdigit():
        return []
    with Image.open(source) as tete:
        if tete.width <= LARGEUR_PLEIN:
            return []
    cle = cle_photo(source)
    cible = f"{source[:-len('.jpg')]}-{LARGEUR_LARGE}.webp"
    trace = empreinte(source)
    deja = memoire["2400"].get(cle)
    if (not tout and deja and deja.get("empreinte") == trace
            and (deja.get("qualite") is not None) == os.path.exists(cible)):
        return []

    im = ouvrir(source)
    jpeg = os.path.getsize(source)
    plafond = jpeg * (1 - GAIN_LARGE)
    ssim = comparateur(im)
    retenue = None
    essai = None
    for q in QUALITES_LARGE:
        octets = encoder(im, "WEBP", quality=q, method=6)
        # Plus lourd à chaque cran de qualité : passé le plafond, la suite
        # ne ferait que peser davantage.
        if len(octets) > plafond:
            break
        s = ssim(Image.open(io.BytesIO(octets)))
        essai = (q, s, len(octets))
        if s >= SSIM_LARGE:
            retenue = octets
            break

    if retenue:
        q, s, poids = essai
        ecrire(retenue, cible)
        memoire["2400"][cle] = {"qualite": q, "ssim": round(s, 4), "ko": poids // 1024,
                                "jpeg_ko": jpeg // 1024, "empreinte": trace}
        if deja and deja.get("qualite") is None:
            print(f"  ⚠ {cle} a désormais sa version {LARGEUR_LARGE} : les pages peuvent la proposer")
        return [cible]

    if essai:
        q, s, poids = essai
        raison = (f"SSIM {s:.4f} au mieux".replace(".", ",") + f" (q{q}, {poids // 1024} Ko) ; au-delà, "
                  f"plus de {round((1 - GAIN_LARGE) * 100)} % du JPEG")
    else:
        raison = (f"dès q{QUALITES_LARGE[0]}, plus de {round((1 - GAIN_LARGE) * 100)} % "
                  f"du JPEG")
    memoire["2400"][cle] = {"qualite": None, "raison": raison, "jpeg_ko": jpeg // 1024,
                            "empreinte": trace}
    # Une -2400 d'avant, faite sur l'ancienne photo, montrerait l'ancienne
    # image aux écrans larges : elle part.
    if os.path.exists(cible):
        os.remove(cible)
        print(f"  ⚠ {cle} : sa version {LARGEUR_LARGE} est retirée ({raison}). "
              f"Les pages qui la proposent doivent la retirer aussi.")
    else:
        print(f"  · {cle} reste en JPEG sur écran large : {raison}")
    return []


def vignette_cv(source, tout, memoire):
    """<nom>-v.webp : la couverture recadrée comme la montre la vignette du CV."""
    lire_montage()
    slug = os.path.basename(os.path.dirname(source))
    nom = os.path.basename(source)[:-len(".jpg")]
    if not nom.isdigit() or (slug, int(nom)) not in COUVERTURES:
        return []
    x, y = COUVERTURES[(slug, int(nom))]
    cadre = f"{x:g}% {y:g}%"
    cle = cle_photo(source)
    cible = f"{source[:-len('.jpg')]}-v.webp"
    trace = empreinte(source)
    deja = memoire["v"].get(cle)
    if (not tout and os.path.exists(cible) and deja
            and deja.get("cadre") == cadre and deja.get("empreinte") == trace):
        return []

    # object-fit: cover, puis object-position : la photo est mise à
    # l'échelle pour couvrir le cadre 3:4, et ce qui dépasse est réparti
    # selon le cadre — x % du surplus à gauche, y % en haut.
    im = ouvrir(source)
    w, h = im.size
    lv, hv = VIGNETTE_CV
    if w / h > lv / hv:
        cw, ch = h * lv / hv, h
    else:
        cw, ch = w, w * hv / lv
    gauche, haut = (w - cw) * x / 100, (h - ch) * y / 100
    r = im.resize(VIGNETTE_CV, Image.LANCZOS, box=(gauche, haut, gauche + cw, haut + ch))
    ecrire_webp(r, cible)
    memoire["v"][cle] = {"cadre": cadre, "empreinte": trace}
    return [cible]


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
    # Les AVIF après les WebP : leur qualité se règle sur la WebP servie.
    cibles = ([(l, "webp") for l in LARGEURS_PORTRAIT] + [(720, "jpg")]
              + [(l, "avif") for l in LARGEURS_PORTRAIT])
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
        elif fmt == "avif":
            portrait_avif(r, largeur, cible)
        else:
            tmp = cible + ".tmp"
            r.save(tmp, "JPEG", quality=82, optimize=True, progressive=True)
            os.replace(tmp, cible)
        faites.append(cible)
    return faites


def portrait_avif(r, largeur, cible):
    """L'AVIF le plus léger qui vaut la WebP servie : même SSIM, face à la
    même réduction de l'original."""
    servie = os.path.join(ROOT, "ressources", "images", f"portrait-affiche-{largeur}.webp")
    ssim = comparateur(r)
    vise = ssim(Image.open(servie))
    octets = None
    for q in QUALITES_AVIF:
        octets = encoder(r, "AVIF", quality=q, **REGLAGES_AVIF)
        s = ssim(Image.open(io.BytesIO(octets)))
        if s >= vise:
            break
    ecrire(octets, cible)
    webp = os.path.getsize(servie)
    print(f"  · portrait {largeur} en AVIF : q{q}, SSIM {s:.4f} (WebP {vise:.4f}), "
          f"{len(octets) // 1024} Ko contre {webp // 1024}")
    if len(octets) >= webp:
        print(f"  ⚠ l'AVIF du portrait {largeur} ne pèse pas moins que sa WebP : "
              f"la <source type=\"image/avif\"> ne sert plus à rien")


def orphelines():
    """Les versions allégées dont l'original a disparu."""
    out = []
    for v in glob.glob(os.path.join(UNIVERS, "*", "*-*.webp")):
        base = re.sub(r"-(?:\d+|flou|v)\.webp$", "", v)
        if not os.path.exists(base + ".jpg"):
            out.append(v)
    book = {os.path.splitext(os.path.basename(p))[0] for p in fichiers_du_book()}
    for v in glob.glob(os.path.join(VIGNETTES, "*.webp")):
        if re.sub(r"-\d+$", "", os.path.splitext(os.path.basename(v))[0]) not in book:
            out.append(v)
    return out


def oublier_disparues(memoire):
    """Retire de variantes.json les photos qui n'y ont plus leur place : un
    original effacé, une photo qui n'est plus une couverture."""
    lire_montage()
    for cle in list(memoire["2400"]):
        if not os.path.exists(os.path.join(UNIVERS, cle + ".jpg")):
            del memoire["2400"][cle]
    for cle in list(memoire["v"]):
        slug, _, nom = cle.partition("/")
        if not os.path.exists(os.path.join(UNIVERS, cle + ".jpg")) or (slug, int(nom)) not in COUVERTURES:
            del memoire["v"][cle]


def main(arguments):
    forcer = "--tout" in arguments
    memoire = lire_memoire()
    # Des chemins donnés à la suite : ne traiter qu'eux, et de force. C'est
    # l'appel de prepare-univers-photos.py, qui sait ce qu'il vient d'écrire.
    # La -2400 et la vignette du CV ne sont refaites que si le JPEG a
    # vraiment changé : leur recherche de qualité est longue, et le même
    # JPEG donnerait le même fichier.
    cibles = [a for a in arguments if not a.startswith("--")]
    if cibles:
        n = sum(len(variantes_univers(os.path.abspath(c), True, memoire, tout=forcer))
                for c in cibles if c.endswith(".jpg"))
        ecrire_memoire(memoire)
        print(f"  {n} version(s) allégée(s) refaite(s)")
        return

    if "--nettoyer" in arguments:
        for v in orphelines():
            os.remove(v)
            print(f"  effacé : {os.path.relpath(v, ROOT)}")
        oublier_disparues(memoire)
        ecrire_memoire(memoire)
        return

    os.makedirs(VIGNETTES, exist_ok=True)
    faites = []
    for source in sorted(glob.glob(os.path.join(UNIVERS, "*", "*.jpg"))):
        faites += variantes_univers(source, forcer, memoire)
    for source in fichiers_du_book():
        if not os.path.exists(source):
            print(f"  ⚠ introuvable : {os.path.relpath(source, ROOT)} (galerie.js)")
            continue
        faites += vignettes_galerie(source, forcer)
    faites += portrait_affiche(forcer)
    oublier_disparues(memoire)
    ecrire_memoire(memoire)

    for f in faites:
        print(f"  {os.path.relpath(f, ROOT)}  {os.path.getsize(f) // 1024} Ko")
    print(f"{len(faites)} fichier(s) écrit(s)." if faites else "Rien à faire : tout est à jour.")
    restes = orphelines()
    if restes:
        print(f"  · {len(restes)} version(s) orpheline(s) — `--nettoyer` pour les effacer")


if __name__ == "__main__":
    main(sys.argv[1:])
