#!/usr/bin/env python3
"""Prépare les photos de plateau des univers de spectacle (voir univers.js).

Les originaux vivent dans `ressources/spectacles/<spectacle>/`, numérotés
(`bérénice_12.jpg`). Ce sont des fichiers lourds : ils ne sont PAS servis aux
visiteurs et ne doivent pas être modifiés.

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
SRC = os.path.join(ROOT, "ressources", "spectacles")
OUT = os.path.join(ROOT, "ressources", "images", "univers")
UNIVERS_JS = os.path.join(ROOT, "univers.js")

MAX_SIDE = 1600
MAX_BYTES = 260 * 1024

# slug de sortie -> dossier source. Les noms de dossiers sont ceux
# d'Adrien ; les slugs, ceux des URL. Seul endroit où les deux se croisent.
FOLDERS = {
    "alabarre":    "à la barre",
    "audiences":   "audiences",
    "asyoulikeit": "ayli",
    "berenice":    "bérénice",
    "cleophene":   "cléophène",
    "fulgurees":   "fulgurés",
}


def read_sequences():
    """{slug: [numéros]} — lus directement dans les `sequence` d'univers.js.

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
        nums = []
        for grp in re.findall(r"\bp:\s*\[([0-9,\s]+)\]", src[pos:end]):
            nums += [int(n) for n in grp.replace(" ", "").split(",") if n]
        out[slug] = nums
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

    unknown = set(sequences) - set(FOLDERS)
    if unknown:
        print(f"!! slug(s) d'univers.js sans dossier source : {sorted(unknown)}")

    total = 0
    for slug, folder in FOLDERS.items():
        wanted = sorted(set(sequences.get(slug, [])))
        if not wanted:
            print(f"— {slug} : aucune photo dans son montage (univers.js)")
            continue

        srcs = source_by_number(folder)
        if not srcs:
            print(f"— {slug} : dossier « {folder} » vide ou non numéroté")
            continue

        dest = os.path.join(OUT, slug)
        os.makedirs(dest, exist_ok=True)
        print(f"\n{slug}  ({len(wanted)} photos : {', '.join(map(str, wanted))})")

        for n in wanted:
            if n not in srcs:
                print(f"  !! photo {n} absente de « {folder} »")
                continue
            im = ImageOps.exif_transpose(Image.open(srcs[n])).convert("RGB")
            im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            p = os.path.join(dest, f"{n}.jpg")
            # Plafond de poids : une dizaine de photos plein cadre
            # s'enchaînent, et certaines compressent très mal.
            for q in (82, 74, 66, 58):
                im.save(p, quality=q, optimize=True, progressive=True)
                if os.path.getsize(p) <= MAX_BYTES:
                    break
            total += 1
            print(f"  {n}.jpg  {im.width}x{im.height}  "
                  f"{os.path.getsize(p) // 1024} Ko")

        # Photos retirées d'un montage : leur fichier traîne encore ici.
        # On ne le supprime que sur demande explicite — effacer des images
        # sans le dire est le genre de service qu'on ne rend à personne.
        orphans = [f for f in os.listdir(dest)
                   if f.endswith(".jpg") and int(f[:-4]) not in wanted]
        for f in sorted(orphans):
            if clean:
                os.remove(os.path.join(dest, f))
                print(f"  supprimé (plus au montage) : {f}")
            else:
                print(f"  · {f} n'est plus au montage — `--nettoyer` pour l'effacer")

    print(f"\n{total} photos préparées depuis les originaux.")


if __name__ == "__main__":
    main()
