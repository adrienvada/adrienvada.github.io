#!/usr/bin/env python3
"""
============================================================
 LA CARTE DE CONTACT — ressources/adrien-vada.vcf
============================================================
 POURQUOI
 --------
 Au téléphone, le geste d'un directeur de casting qui a fini de regarder,
 c'est de garder Adrien dans ses contacts. Le site ne lui offrait qu'un
 lien mailto : il fallait recopier le nom, l'adresse, le site, et le
 visage restait sur la page. « Ajouter aux contacts », dans l'affiche,
 sert ce fichier : iPhone et Android ouvrent la fiche toute faite —
 nom, métier, mail, site, et le portrait.

 CE QU'ELLE CONTIENT
 -------------------
 Ce que la page affiche déjà, et rien d'autre : nom, métier, adresse
 mail, site. Pas de téléphone ni d'adresse postale (ils ne sont pas
 publics). Le portrait est celui de l'affiche (portrait-affiche-720.jpg),
 recadré au carré sur le visage et réduit à 256 px : une vingtaine de
 kilo-octets, que les carnets d'adresses acceptent tous.

 QUAND LA REFAIRE
 ----------------
 Après un changement de portrait (voir « Le portrait d'affiche » dans
 README-build.md) ou d'adresse mail :

     python3 build/fabriquer-vcard.py

 Rejouable : même entrée, même fichier, octet pour octet.
"""

import base64
import io
import pathlib

from PIL import Image

RACINE = pathlib.Path(__file__).resolve().parent.parent
PORTRAIT = RACINE / 'ressources' / 'images' / 'portrait-affiche-720.jpg'
SORTIE = RACINE / 'ressources' / 'adrien-vada.vcf'

NOM, PRENOM = 'Vada', 'Adrien'
METIER = 'Comédien'
MAIL = 'adrien.vada@gmail.com'
SITE = 'https://adrienvada.fr/'
NOTE = 'Comédien : théâtre, cinéma, voix. CV, dates et démos sur adrienvada.fr'


def echapper(texte):
    """vCard 3.0 : virgules, points-virgules et barres obliques inverses
    s'échappent dans les valeurs de texte."""
    return texte.replace('\\', '\\\\').replace(',', '\\,').replace(';', '\\;')


def plier(ligne):
    """Une ligne de vCard ne dépasse pas 75 octets : la suite repart sur
    la ligne suivante, précédée d'une espace (RFC 2425, § 5.8.1)."""
    octets = ligne.encode('utf-8')
    if len(octets) <= 75:
        return [ligne]
    morceaux, debut = [], 0
    limite = 75
    while debut < len(octets):
        fin = min(debut + limite, len(octets))
        # Ne jamais couper au milieu d'un caractère UTF-8.
        while fin < len(octets) and (octets[fin] & 0xC0) == 0x80:
            fin -= 1
        morceaux.append(octets[debut:fin].decode('utf-8'))
        debut = fin
        limite = 74  # la suite commence par une espace
    return [morceaux[0]] + [' ' + m for m in morceaux[1:]]


def portrait_base64():
    im = Image.open(PORTRAIT).convert('RGB')
    # Le visage est en haut de la photo (le site le cadre à 50 % 28 %) :
    # un carré pris en haut, à toute la largeur.
    cote = im.width
    haut = max(0, int(im.height * 0.28 - cote * 0.28))
    im = im.crop((0, haut, cote, haut + cote)).resize((256, 256), Image.LANCZOS)
    tampon = io.BytesIO()
    im.save(tampon, 'JPEG', quality=82, optimize=True, progressive=False)
    return base64.b64encode(tampon.getvalue()).decode('ascii')


def main():
    lignes = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        f'N:{echapper(NOM)};{echapper(PRENOM)};;;',
        f'FN:{echapper(PRENOM + " " + NOM)}',
        f'TITLE:{echapper(METIER)}',
        f'EMAIL;TYPE=INTERNET,PREF:{MAIL}',
        f'URL:{SITE}',
        f'NOTE:{echapper(NOTE)}',
        f'PHOTO;ENCODING=b;TYPE=JPEG:{portrait_base64()}',
        'END:VCARD',
    ]
    pliees = [morceau for ligne in lignes for morceau in plier(ligne)]
    SORTIE.write_bytes(('\r\n'.join(pliees) + '\r\n').encode('utf-8'))
    print(f'{SORTIE.relative_to(RACINE)} : {SORTIE.stat().st_size // 1024} Ko')


if __name__ == '__main__':
    main()
