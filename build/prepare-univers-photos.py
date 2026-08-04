#!/usr/bin/env python3
"""Prépare les photos de plateau des univers de spectacle (voir univers.js).

Les originaux vivent dans `ressources/spectacles/<spectacle>/`, numérotés
(`bérénice_12.jpg`). Ce sont des fichiers lourds : ils ne sont PAS servis aux
visiteurs et ne doivent pas être modifiés.

Ce script sort `ressources/images/univers/<slug>/<n>.jpg`, redimensionnés et
plafonnés en poids. **Le numéro est conservé** : c'est lui qui sert de langage
commun entre les planches-contact, le montage donné par Adrien et les
séquences de `univers.js`.

Le cadrage n'est PAS forcé en 16:10 : les proportions d'origine sont
préservées, parce que les mises en page `duo`, `trio`, `quatuor` et
`medaillon` montrent la photo entière. Seul `plein` recadre, et c'est le
navigateur qui s'en charge (`object-fit: cover`).

    python3 build/prepare-univers-photos.py

Seules les photos RÉFÉRENCÉES dans SEQUENCES sont produites : inutile
d'alourdir le dépôt avec 120 images dont la moitié ne sert pas.
"""
import os
import glob
import re
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "ressources", "spectacles")
OUT = os.path.join(ROOT, "ressources", "images", "univers")

MAX_SIDE = 1600
MAX_BYTES = 260 * 1024

# slug de sortie -> dossier source
FOLDERS = {
    "alabarre":    "à la barre",
    "audiences":   "audiences",
    "asyoulikeit": "ayli",
    "berenice":    "bérénice",
    "cleophene":   "cléophène",
    "fulgurees":   "fulgurés",
}

# Le montage donné par Adrien : un groupe = un temps du défilé.
# 1 photo = plein cadre, 2 = duo, 3 = trio, 4 = quatuor.
# ⚠️ Doit rester synchronisé avec SEQUENCES dans univers.js.
SEQUENCES = {
    "alabarre":    [[19], [20, 8], [22], [4, 13], [14, 12], [9, 5, 6, 7], [25, 26]],
    "audiences":   [[8], [6, 5], [4, 1], [2, 3]],
    "asyoulikeit": [[8], [10, 7], [9], [1, 6], [3], [4, 5], [11, 12]],
    "berenice":    [[2], [3], [12, 7], [1, 9, 11], [18], [13, 5, 16], [17, 19]],
    "cleophene":   [[7], [10, 17], [21], [23], [20, 15], [16], [18, 13, 9], [5]],
    "fulgurees":   [[10], [7], [8, 5, 19], [23], [3, 1, 4], [2], [27, 26]],
}


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
    total = 0
    for slug, folder in FOLDERS.items():
        srcs = source_by_number(folder)
        if not srcs:
            print(f"— {slug} : dossier « {folder} » vide ou non numéroté")
            continue
        dest = os.path.join(OUT, slug)
        os.makedirs(dest, exist_ok=True)

        wanted = sorted({n for group in SEQUENCES.get(slug, []) for n in group})
        for n in wanted:
            if n not in srcs:
                print(f"!! {slug} : photo {n} absente du dossier")
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
            print(f"{slug}/{n}.jpg  {im.width}x{im.height}  "
                  f"{os.path.getsize(p) // 1024} Ko")
    print(f"\n{total} photos préparées.")


if __name__ == "__main__":
    main()
