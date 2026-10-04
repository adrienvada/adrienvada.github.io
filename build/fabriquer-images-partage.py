#!/usr/bin/env python3
"""
============================================================
 LES IMAGES DE PARTAGE — ressources/images/partage/<slug>.jpg
============================================================
 POURQUOI
 --------
 Une page spectacle envoyée par WhatsApp, Messages, LinkedIn ou un mail
 s'annonce par son image de partage (og:image). C'était la première photo
 du montage, telle quelle : une photo de plateau au format du fichier,
 que chaque application recadrait à sa façon — souvent sur un bout de
 décor —, et rien n'y disait de quel spectacle il s'agissait.

 Chaque spectacle a désormais la sienne, au format que toutes attendent
 (1200 × 630, 1,91:1) : sa photo de couverture, recadrée sur le point que
 le montage lui donne, le titre en Cinzel, la ligne de la feuille de salle
 (sous-titre · genre), « Adrien Vada » et le filet à la couleur du spectacle.

 CE QU'ELLE LIT
 --------------
 univers.js (SHOW_UNIVERSES : titre, sous-titre, genre, palette, montage),
 les photos de ressources/images/univers/, les polices du site
 (ressources/polices/*.woff2, converties à la volée : Pillow ne lit pas le
 WOFF2). Le paquet Python `fonttools` (et `brotli`) est donc nécessaire :

     pip install fonttools brotli

 QUAND LA REFAIRE
 ----------------
 Après un changement de photos, de titre ou de palette d'un univers :

     python3 build/fabriquer-images-partage.py
     npm --prefix build run pages     # les pages les annoncent

 Rejouable : même entrée, même image.
"""

import io
import json
import pathlib
import subprocess
import sys
import tempfile

from PIL import Image, ImageChops, ImageDraw, ImageFont

RACINE = pathlib.Path(__file__).resolve().parent.parent
SORTIE = RACINE / 'ressources' / 'images' / 'partage'
POLICES = RACINE / 'ressources' / 'polices'
L, H = 1200, 630

# Les données des univers, relues comme le fait le générateur des pages
# (voir chargerUnivers dans generer-pages-spectacles.js) : la déclaration
# de SHOW_UNIVERSES, découpée et évaluée seule.
EXTRAIRE = r"""
const fs = require('fs');
const src = fs.readFileSync(process.argv[1], 'utf8');
const debut = src.indexOf('const SHOW_UNIVERSES = {');
const fin = src.indexOf('\n(function () {', debut);
if (debut === -1 || fin === -1) { console.error('SHOW_UNIVERSES introuvable'); process.exit(1); }
const U = new Function(src.slice(debut, fin) + '\nreturn SHOW_UNIVERSES;')();
const out = {};
for (const [cle, u] of Object.entries(U)) {
    if (!u || !u.slug) continue;
    out[cle] = { slug: u.slug, title: u.title || cle, subtitle: u.subtitle || '', genre: u.genre || '',
        kind: u.kind || '', palette: u.palette || {}, cvAccent: u.cvAccent || '', affiche: !!u.affiche,
        sequence: (u.sequence || []).filter(b => b && Array.isArray(b.p)).map(b => ({ p: b.p, cadre: b.cadre || {} })) };
}
console.log(JSON.stringify(out));
"""

MOTS = {
    'haut': (50, 0), 'bas': (50, 100), 'gauche': (0, 50), 'droite': (100, 50), 'centre': (50, 50),
    'haut gauche': (0, 0), 'haut droite': (100, 0), 'bas gauche': (0, 100), 'bas droite': (100, 100),
}


def univers():
    r = subprocess.run(['node', '-e', EXTRAIRE, str(RACINE / 'univers.js')],
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def police(nom, poids, taille, dossier):
    """Le WOFF2 du site, converti une fois en TTF dans un dossier jetable ;
    l'axe de graisse est posé sur la valeur demandée."""
    from fontTools.ttLib import TTFont
    ttf = pathlib.Path(dossier) / f'{nom}.ttf'
    if not ttf.exists():
        f = TTFont(POLICES / f'{nom}.woff2')
        f.flavor = None
        f.save(ttf)
    p = ImageFont.truetype(str(ttf), taille)
    try:
        p.set_variation_by_axes([poids])
    except (OSError, AttributeError):
        pass
    return p


def couleur(hexa, defaut):
    s = str(hexa or '').strip().lstrip('#')
    if len(s) == 6:
        try:
            return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))
        except ValueError:
            pass
    return defaut


def couverture(u):
    """La photo de couverture : l'affiche d'un film qui en a une, sinon la
    première photo du montage — la même règle que les pages (photosDe)."""
    base = RACINE / 'ressources' / 'images' / 'univers' / u['slug']
    if u['affiche'] and (base / 'affiche.jpg').exists():
        return base / 'affiche.jpg', (50, 30)
    for bloc in u['sequence']:
        for n in bloc['p']:
            f = base / f'{n}.jpg'
            if f.exists():
                c = str(bloc['cadre'].get(str(n), '') or '').strip()
                if c in MOTS:
                    return f, MOTS[c]
                parts = c.replace('%', '').split()
                if len(parts) == 2 and all(x.replace('.', '', 1).isdigit() for x in parts):
                    return f, (float(parts[0]), float(parts[1]))
                return f, (50, 50)
    return None, (50, 50)


def recadrer(im, pos):
    """object-fit: cover, object-position: pos — comme dans le montage."""
    r = max(L / im.width, H / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x = round((im.width - L) * pos[0] / 100)
    y = round((im.height - H) * pos[1] / 100)
    return im.crop((x, y, x + L, y + H))


def ajuster(draw, texte, police_de, poids, maxi, largeur, dossier):
    """La plus grande taille (≤ maxi) à laquelle le titre tient sur une
    ligne dans `largeur`, et jamais sous 54 px : un titre très long passe
    alors à la ligne (voir couper)."""
    for t in range(maxi, 53, -2):
        p = police_de('cinzel-latin', poids, t, dossier)
        if draw.textlength(texte, font=p) <= largeur:
            return p, [texte]
    p = police_de('cinzel-latin', poids, 54, dossier)
    return p, couper(draw, texte, p, largeur)


def couper(draw, texte, p, largeur):
    lignes, ligne = [], ''
    for mot in texte.split():
        essai = (ligne + ' ' + mot).strip()
        if draw.textlength(essai, font=p) <= largeur or not ligne:
            ligne = essai
        else:
            lignes.append(ligne)
            ligne = mot
    if ligne:
        lignes.append(ligne)
    return lignes[:3]


def image(cle, u, dossier):
    photo, pos = couverture(u)
    pal = u['palette']
    fond = couleur(pal.get('bg'), (10, 9, 7))
    accent = couleur(u['cvAccent'] or pal.get('accent'), (191, 169, 138))
    largeur_texte = L - 2 * 64
    affiche = photo is not None and photo.name == 'affiche.jpg'
    if affiche:
        # L'AFFICHE D'UN FILM porte déjà son titre : recadrée au format
        # paysage, elle le coupait, et le nôtre s'écrivait par-dessus. Elle
        # est donc posée entière, à droite, sur un fond flou d'elle-même,
        # et le texte prend la place qui reste à gauche.
        src = Image.open(photo).convert('RGB')
        # Très flou et très sombre : le texte de l'affiche ne doit pas s'y
        # lire en fantôme derrière le nôtre.
        im = recadrer(src, (50, 50)).resize((L // 24, H // 24)).resize((L, H), Image.BICUBIC)
        im = Image.blend(im, Image.new('RGB', (L, H), (8, 7, 6)), 0.72)
        h_aff = H
        w_aff = round(src.width * h_aff / src.height)
        im.paste(src.resize((w_aff, h_aff), Image.LANCZOS), (L - w_aff, 0))
        largeur_texte = L - w_aff - 2 * 64
    elif photo:
        im = recadrer(Image.open(photo).convert('RGB'), pos)
    else:
        im = Image.new('RGB', (L, H), fond)
    # Le noir de la salle monte du bas et de la gauche : le texte s'y pose,
    # la photo garde sa lumière à droite.
    voile = Image.new('L', (L, H), 0)
    d = ImageDraw.Draw(voile)
    for y in range(H):
        a = max(0.0, (y - H * 0.25) / (H * 0.75))
        d.line([(0, y), (L, y)], fill=int(235 * a ** 1.2))
    gauche = Image.new('L', (L, H), 0)
    dg = ImageDraw.Draw(gauche)
    for x in range(L):
        a = max(0.0, 1 - x / (L * 0.72))
        dg.line([(x, 0), (x, H)], fill=int(170 * a ** 1.5))
    masque = ImageChops.lighter(voile, gauche)
    if affiche:
        # L'affiche reste entière et nette : seul le fond, à gauche, se voile.
        masque.paste(0, (L - round(Image.open(photo).width * H / Image.open(photo).height), 0, L, H))
    noir = Image.new('RGB', (L, H), (8, 7, 6))
    im = Image.composite(noir, im, masque)

    draw = ImageDraw.Draw(im)
    marge = 64
    titre = u['title']
    p_titre, lignes = ajuster(draw, titre, police, 700, 104, largeur_texte, dossier)
    p_ligne = police('inter-latin', 600, 26, dossier)
    p_nom = police('inter-latin', 700, 24, dossier)

    # De bas en haut : le nom, le titre, la ligne de salle.
    y = H - marge
    nom = 'ADRIEN VADA · COMÉDIEN'
    y_nom = y - 24
    draw.text((marge, y_nom), nom, font=p_nom, fill=(242, 236, 224))
    # Le filet à la couleur du spectacle, sous le titre.
    y_filet = y_nom - 30
    draw.rectangle([marge, y_filet, marge + 96, y_filet + 5], fill=accent)
    hl = round(p_titre.size * 1.08)
    y_titre = y_filet - 22 - hl * len(lignes)
    for i, l in enumerate(lignes):
        draw.text((marge, y_titre + i * hl), l, font=p_titre, fill=(255, 255, 255))
    sur = ' · '.join(x for x in [u['subtitle'], u['genre']] if x)
    if sur:
        sur = sur.upper() if len(sur) < 46 else sur
        while draw.textlength(sur, font=p_ligne) > largeur_texte and ' · ' in sur:
            sur = sur.rsplit(' · ', 1)[0]   # le genre d'abord, s'il ne tient pas
        draw.text((marge, y_titre - 44), sur, font=p_ligne, fill=(225, 214, 196))
    SORTIE.mkdir(parents=True, exist_ok=True)
    f = SORTIE / f"{u['slug']}.jpg"
    tampon = io.BytesIO()
    im.save(tampon, 'JPEG', quality=84, optimize=True, progressive=True)
    f.write_bytes(tampon.getvalue())
    return f


def main():
    try:
        import fontTools  # noqa: F401
    except ImportError:
        sys.exit('  ARRÊT — il faut fonttools et brotli : pip install fonttools brotli')
    with tempfile.TemporaryDirectory() as dossier:
        for cle, u in univers().items():
            f = image(cle, u, dossier)
            print(f'  {f.relative_to(RACINE)} : {f.stat().st_size // 1024} Ko')


if __name__ == '__main__':
    main()
