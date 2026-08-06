#!/usr/bin/env python3
"""Prépare les photos de plateau des univers de spectacle (voir univers.js).

Les originaux sont numérotés (`ayli_14.jpg`) et vivent HORS DU DÉPÔT, dans
`Images spectacles/<spectacle>/`, à côté de lui. Ce sont des fichiers lourds
— une centaine de mégaoctets — qui n'ont pas à être versionnés ni servis aux
visiteurs.

⚠️ Étant hors du dépôt, ils ne sont plus sauvegardés par git : ce script sait
les retrouver, il ne sait pas les recréer. Une copie ailleurs s'impose.

Ce script sort `ressources/images/univers/<slug>/<n>.jpg`, redimensionnés et
plafonnés en poids. **Le numéro est conservé** : c'est lui qui sert de langage
commun entre les planches-contact, le montage donné par Adrien et les
séquences de `univers.js`.

Le cadrage n'est PAS forcé : les proportions d'origine sont préservées.
Ce sont les cadres du site qui recadrent (`object-fit: cover`), et
l'agrandissement au clic qui montre la photo entière.

    python3 build/prepare-univers-photos.py

**UNE SEULE SOURCE.** Les numéros de photos ne sont écrits qu'à un endroit :
les `sequence` de `univers.js`. Ce script les y lit. Changer un montage se
fait donc dans `univers.js` seul, puis on relance ce script — il n'y a pas de
liste à tenir à jour en double, et donc pas de risque qu'elles divergent.

Seules les photos RÉFÉRENCÉES sont produites : inutile d'alourdir le dépôt
avec 120 images dont la moitié ne sert pas. Une photo retirée d'un montage
laisse son fichier derrière elle — voir `--nettoyer` pour les balayer.
"""
import os
import sys
import glob
import re
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "ressources", "images", "univers")
UNIVERS_JS = os.path.join(ROOT, "univers.js")


def find_src():
    """Le dossier des originaux, cherché aux endroits où il a vécu.

    Il était d'abord dans le dépôt (`ressources/spectacles`) ; il est
    aujourd'hui à côté (`../Images spectacles`). On essaie les deux plutôt
    que d'inscrire un chemin absolu, qui ne vaudrait que sur cette machine.
    UNIVERS_PHOTOS permet de passer un autre dossier au besoin.
    """
    candidats = [
        os.environ.get("UNIVERS_PHOTOS"),
        os.path.join(ROOT, "..", "Images spectacles"),
        os.path.join(ROOT, "ressources", "spectacles"),
    ]
    for c in candidats:
        if c and os.path.isdir(c):
            return c
    raise SystemExit(
        "Dossier des originaux introuvable. Essayé :\n  " +
        "\n  ".join(os.path.abspath(c) for c in candidats if c) +
        "\nIndiquez-le avec UNIVERS_PHOTOS=/chemin/vers/le/dossier")


SRC = find_src()

# Deux qualités, selon l'usage de la photo dans le montage.
#
#   Une vignette de trio fait 30 % de la hauteur d'écran ; une photo en
#   plein cadre en occupe la totalité, souvent agrandie par la parallaxe.
#   Le même réglage pour les deux, c'était forcément trop peu pour l'une ou
#   trop pour l'autre : sur les plein-cadre, la compression se voyait — des
#   aplats sales dans les fonds sombres et les ciels.
#
#   Une photo utilisée à la fois en plein cadre et en vignette est traitée
#   au régime le plus exigeant des deux.
PLEIN = {"side": 2400, "quality": 90, "floor": 78, "max_bytes": 900 * 1024}
VIGNETTE = {"side": 1500, "quality": 82, "floor": 66, "max_bytes": 260 * 1024}

# slug de sortie -> dossier source. Les noms de dossiers sont ceux
# d'Adrien ; les slugs, ceux des URL. Seul endroit où les deux se croisent.
FOLDERS = {
    "alabarre":    "à la barre",
    "audiences":   "audiences",
    "asyoulikeit": "ayli",
    "berenice":    "bérénice",
    "cleophene":   "cléophène",
    "fulgurees":   "fulgurés",
    "hommemoderne": "homme moderne",
    "lerapt":      "le rapt",
    "peaudesanges": "peau des anges",
}


def read_sequences():
    """{slug: [[numéros d'un temps], …]} — lus dans les `sequence` d'univers.js.

    Les groupes sont conservés tels quels : leur TAILLE dit comment la photo
    sera affichée (1 = plein cadre, 2+ = vignette), donc à quelle qualité la
    préparer.

    On ne parse pas le JavaScript : on repère chaque `slug: 'xxx'`, puis on
    ramasse tous les `p: [...]` qui suivent jusqu'au slug suivant. La forme
    du fichier est stable et écrite à la main ; en cas de doute, le script
    dit ce qu'il a compris avant de travailler.
    """
    src = open(UNIVERS_JS, encoding="utf-8").read()
    # On s'arrête au moteur : lui aussi contient le mot « slug ».
    cut = src.find("MOTEUR —")
    if cut > 0:
        src = src[:cut]

    marks = [(m.start(), m.group(1))
             for m in re.finditer(r"slug:\s*'([a-z]+)'", src)]
    out = {}
    for i, (pos, slug) in enumerate(marks):
        end = marks[i + 1][0] if i + 1 < len(marks) else len(src)
        groups = []
        for grp in re.findall(r"\bp:\s*\[([0-9,\s]+)\]", src[pos:end]):
            nums = [int(n) for n in grp.replace(" ", "").split(",") if n]
            if nums:
                groups.append(nums)
        out[slug] = groups
    return out


def profiles(groups):
    """{numéro: réglage} — plein cadre l'emporte sur vignette."""
    out = {}
    for g in groups:
        prof = PLEIN if len(g) == 1 else VIGNETTE
        for n in g:
            if out.get(n) is not PLEIN:
                out[n] = prof
    return out


def source_by_number(folder):
    """{numéro: chemin} — le suffixe numérique du nom de fichier fait foi."""
    out = {}
    for f in glob.glob(os.path.join(SRC, folder, "*")):
        if not f.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        m = re.search(r"_(\d+)\.[^.]+$", os.path.basename(f))
        if m:
            out[int(m.group(1))] = f
    return out


def main():
    sequences = read_sequences()
    clean = "--nettoyer" in sys.argv

    # On ne s'alarme que pour les univers qui RÉCLAMENT des photos. Ceux
    # qui n'en ont pas — un spectacle pas encore créé, un court métrage
    # sans images — n'ont pas besoin d'un dossier source, et le signaler à
    # chaque passage ferait crier au loup pour rien.
    unknown = sorted(s for s in set(sequences) - set(FOLDERS) if sequences[s])
    if unknown:
        print(f"!! slug(s) d'univers.js avec des photos mais sans dossier source : {unknown}")

    total = 0
    for slug, folder in FOLDERS.items():
        groups = sequences.get(slug, [])
        prof_of = profiles(groups)
        wanted = sorted(prof_of)
        if not wanted:
            print(f"— {slug} : aucune photo dans son montage (univers.js)")
            continue

        srcs = source_by_number(folder)
        if not srcs:
            print(f"— {slug} : dossier « {folder} » vide ou non numéroté")
            continue

        dest = os.path.join(OUT, slug)
        os.makedirs(dest, exist_ok=True)
        pleins = [n for n in wanted if prof_of[n] is PLEIN]
        print(f"\n{slug}  {len(wanted)} photos, dont {len(pleins)} en plein cadre")

        for n in wanted:
            if n not in srcs:
                print(f"  !! photo {n} absente de « {folder} »")
                continue
            prof = prof_of[n]
            im = ImageOps.exif_transpose(Image.open(srcs[n])).convert("RGB")
            im.thumbnail((prof["side"], prof["side"]), Image.LANCZOS)
            p = os.path.join(dest, f"{n}.jpg")

            # On part de la qualité voulue et on ne descend qu'en cas de
            # dépassement — jamais sous le plancher du profil. Mieux vaut un
            # fichier un peu lourd qu'un aplat sale en plein écran.
            q = prof["quality"]
            while True:
                im.save(p, quality=q, optimize=True, progressive=True)
                if os.path.getsize(p) <= prof["max_bytes"] or q <= prof["floor"]:
                    break
                q -= 4

            total += 1
            tag = "PLEIN CADRE" if prof is PLEIN else "vignette"
            print(f"  {n}.jpg  {im.width}x{im.height}  q{q}  "
                  f"{os.path.getsize(p) // 1024} Ko  {tag}")

        # LES INVITÉES NON NUMÉROTÉES, en nombre fermé. `affiche` ouvre la
        # page d'un film (champ `affiche` de l'univers) ; `teaser` sert de
        # jaquette locale à sa bande-annonce (champ `jaquette` d'un temps
        # vidéo) — rien ne part vers l'hébergeur avant le clic. Toutes deux
        # au régime PLEIN.
        for nom in ("affiche", "teaser"):
            for src_aff in glob.glob(os.path.join(SRC, folder, nom + ".*")):
                im = ImageOps.exif_transpose(Image.open(src_aff)).convert("RGB")
                im.thumbnail((PLEIN["side"], PLEIN["side"]), Image.LANCZOS)
                p = os.path.join(dest, nom + ".jpg")
                q = PLEIN["quality"]
                while True:
                    im.save(p, quality=q, optimize=True, progressive=True)
                    if os.path.getsize(p) <= PLEIN["max_bytes"] or q <= PLEIN["floor"]:
                        break
                    q -= 4
                total += 1
                print(f"  {nom}.jpg  {im.width}x{im.height}  q{q}  "
                      f"{os.path.getsize(p) // 1024} Ko  {nom.upper()}")

        # Photos retirées d'un montage : leur fichier traîne encore ici.
        # On ne le supprime que sur demande explicite — effacer des images
        # sans le dire est le genre de service qu'on ne rend à personne.
        # (`isdigit` : l'affiche et tout nom non numéroté ne sont pas des
        # orphelins, ce sont des invités.)
        orphans = [f for f in os.listdir(dest)
                   if f.endswith(".jpg") and f[:-4].isdigit()
                   and int(f[:-4]) not in wanted]
        for f in sorted(orphans):
            if clean:
                os.remove(os.path.join(dest, f))
                print(f"  supprimé (plus au montage) : {f}")
            else:
                print(f"  · {f} n'est plus au montage — `--nettoyer` pour l'effacer")

    print(f"\n{total} photos préparées depuis les originaux.")


if __name__ == "__main__":
    main()
