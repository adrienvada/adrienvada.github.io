#!/usr/bin/env python3
"""Prépare les photos de plateau pour les univers de spectacle (univers.js).

Les originaux vivent dans `ressources/spectacles/<spectacle>/` : ce sont des
fichiers lourds (jusqu'à 8 Mo), aux noms de captation ou d'appareil photo.
Ils ne sont PAS servis aux visiteurs et ne doivent pas être modifiés.

Ce script en sélectionne quelques-uns, les recadre en 16:10 et les sort en
`ressources/images/univers/<slug>-photo-N.jpg`, à ~1600x1000 et < 300 Ko.

    python3 build/prepare-univers-photos.py

Pour changer la sélection : modifier PICKS ci-dessous (les index sont ceux de
l'ordre alphabétique du dossier, tel que l'affiche `ls`), puis relancer et
mettre à jour les légendes dans `univers.js`.

`centering` cadre le recadrage vertical : 0.5 = centre, plus petit = on garde
le haut (utile quand les visages sont hauts dans l'image).
"""
import os
import glob
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC = os.path.join(ROOT, "ressources", "spectacles")
OUT = os.path.join(ROOT, "ressources", "images", "univers")

W, H = 1600, 1000
MAX_BYTES = 260 * 1024

# slug de sortie -> (dossier source, [index], centrage vertical)
PICKS = {
    "berenice":  ("bérénice",  [0, 1, 2, 6, 3],       0.42),
    "cleophene": ("cléophène", [3, 4, 11, 17, 19],    0.42),
    "fulgurees": ("fulgurees", [26, 24, 14, 27, 29],  0.45),
    "asyoulikeit": ("ayli",    [0],                   0.30),
}

# Le dossier « fulgurés » porte un accent ; on le retrouve par tolérance.
ALIASES = {"fulgurees": "fulgurés"}


def source_files(folder):
    d = os.path.join(SRC, ALIASES.get(folder, folder))
    if not os.path.isdir(d):
        d = os.path.join(SRC, folder)
    files = [f for f in sorted(glob.glob(os.path.join(d, "*")))
             if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    return files


def main():
    os.makedirs(OUT, exist_ok=True)
    for slug, (folder, picks, centering) in PICKS.items():
        files = source_files(folder)
        if not files:
            print(f"— {slug} : aucun original, on garde le visuel témoin")
            continue
        for n, idx in enumerate(picks, start=1):
            if idx >= len(files):
                print(f"!! {slug} : index {idx} hors du dossier ({len(files)} fichiers)")
                continue
            im = ImageOps.exif_transpose(Image.open(files[idx])).convert("RGB")
            im = ImageOps.fit(im, (W, H), Image.LANCZOS, centering=(0.5, centering))
            p = os.path.join(OUT, f"{slug}-photo-{n}.jpg")
            # Plafond de poids : cinq photos plein cadre s'enchaînent, et
            # certaines (brume, grain de captation) compressent très mal.
            for q in (82, 74, 66, 58):
                im.save(p, quality=q, optimize=True, progressive=True)
                if os.path.getsize(p) <= MAX_BYTES:
                    break
            print(f"{os.path.basename(p)}  <- {os.path.basename(files[idx])}"
                  f"  ({os.path.getsize(p) // 1024} Ko)")


if __name__ == "__main__":
    main()
