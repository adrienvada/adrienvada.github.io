#!/usr/bin/env python3
"""
============================================================
 SPRITE D'ICÔNES — remplace FontAwesome par ce qu'on utilise
============================================================
 POURQUOI
 --------
 Le site affichait ses icônes avec FontAwesome, chargé depuis un CDN :
 100 ko de CSS bloquant le rendu, puis 276 ko de polices (fa-solid 147,
 fa-brands 105, fa-regular 24) — pour 39 dessins réellement employés.
 Le sprite ci-dessous pèse une quinzaine de kilo-octets, vit dans la page,
 et ne demande rien à personne.

 CE QUE FAIT CE SCRIPT
 ---------------------
   1. relève TOUTES les icônes utilisées dans index.html, univers.js et
      404.html — y compris celles écrites dans des chaînes JavaScript ;
   2. extrait leur tracé du paquet @fortawesome/fontawesome-free ;
   3. écrit le sprite entre les deux repères SPRITE-ICONES d'index.html ;
   4. remplace chaque <i class="fa-solid fa-x"> par son <svg><use></svg>.

 Les icônes FontAwesome Free sont sous licence CC BY 4.0 (fontawesome.com).

 QUAND LE RELANCER
 -----------------
 Après avoir ajouté une icône. Installer le paquet d'abord :

     npm i @fortawesome/fontawesome-free@6.4.0
     python3 build/construire-sprite-icones.py

 Le script est idempotent : les <i> ont déjà disparu, seul le sprite est
 réécrit. Il refuse de tourner si une icône demandée n'existe pas dans le
 paquet, plutôt que de laisser un trou invisible dans la page.
"""

import json
import re
import pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
FICHIERS = ['index.html', 'univers.js', '404.html']


def paquet():
    """
    Où sont les tracés FontAwesome. On cherche d'abord dans le dépôt, puis
    dans le dossier parent — selon qu'on ait fait le `npm i` ici ou à côté.
    Le paquet n'a pas à être versionné : il ne sert qu'à fabriquer le sprite,
    et le sprite, lui, vit dans index.html.
    """
    for base in (RACINE, RACINE.parent):
        p = base / 'node_modules' / '@fortawesome' / 'fontawesome-free' / 'svgs'
        if p.is_dir():
            return p
    raise SystemExit(
        '  ARRÊT — paquet FontAwesome introuvable.\n'
        '  Installez-le à la racine du dépôt, puis relancez :\n'
        '      npm i @fortawesome/fontawesome-free@6.4.0\n'
        '      python3 build/construire-sprite-icones.py'
    )


PAQUET = paquet()

DEBUT = '<!-- SPRITE-ICONES:DEBUT -->'
FIN = '<!-- SPRITE-ICONES:FIN -->'

STYLES = {'solid': 'solid', 'regular': 'regular', 'brands': 'brands'}

# Le site écrit ses icônes de deux façons, héritées de deux époques de
# FontAwesome : la forme longue (`fa-solid fa-play`) et la forme courte
# (`fas fa-file-pdf`). Les deux sont valides et coexistent dans le fichier ;
# ne reconnaître que la première laisserait des icônes muettes.
COURTES = {'fas': 'solid', 'far': 'regular', 'fab': 'brands'}

# Icônes qu'aucun relevé du texte ne peut trouver, parce qu'elles ne sont
# jamais écrites à côté de leur style : elles sont posées à l'exécution, par
# échange de `href` sur un <use> (voir setIcon dans index.html). La lune est
# la contrepartie du soleil dans la bascule de thème — sans cette liste, elle
# manquerait au sprite et le bouton deviendrait muet une fois sur deux.
SUPPLEMENT = [('solid', 'moon')]


def alias():
    """
    `fa-history` n'existe plus en version 6 : le dessin s'appelle désormais
    `clock-rotate-left`, et l'ancien nom n'est qu'un alias que la feuille de
    style du CDN résolvait pour nous. Sans cette table, le script s'arrêterait
    sur des noms parfaitement valides côté site.
    """
    meta = PAQUET.parent / 'metadata' / 'icon-families.json'
    if not meta.exists():
        return {}
    table = {}
    for canonique, infos in json.loads(meta.read_text(encoding='utf-8')).items():
        for ancien in (infos.get('aliases') or {}).get('names') or []:
            table[ancien] = canonique
    return table


ALIAS = alias()


def icones_utilisees():
    """Toutes les paires (style, nom) rencontrées, balisage et chaînes JS."""
    trouvees = set()
    longue = re.compile(r'fa-(solid|regular|brands)\s+fa-([a-z0-9-]+)')
    courte = re.compile(r'\b(fas|far|fab)\s+fa-([a-z0-9-]+)')
    # Le balisage DÉJÀ converti compte autant que celui qui reste à convertir :
    # sans ces deux motifs, un second passage ne verrait plus une seule icône
    # et le sprite se réduirait au supplément. C'est ce qui rend le script
    # rejouable — la première version ne l'était pas.
    pose = re.compile(r'href="#i-(solid|regular|brands)-([a-z0-9-]+)"')
    posee_js = re.compile(r"setIcon\([^,]+,\s*'(solid|regular|brands)-([a-z0-9-]+)'\)")
    for f in FICHIERS:
        p = RACINE / f
        if not p.exists():
            continue
        texte = p.read_text(encoding='utf-8')
        for motif in (longue, pose, posee_js):
            for style, nom in motif.findall(texte):
                trouvees.add((style, ALIAS.get(nom, nom)))
        for court, nom in courte.findall(texte):
            trouvees.add((COURTES[court], ALIAS.get(nom, nom)))
    trouvees.update(SUPPLEMENT)
    return sorted(trouvees)


def tracé(style, nom):
    fichier = PAQUET / STYLES[style] / f'{nom}.svg'
    if not fichier.exists():
        raise SystemExit(
            f"  ARRÊT — icône introuvable dans le paquet : fa-{style} fa-{nom}\n"
            f"  ({fichier})\n"
            f"  Vérifiez le nom, ou que le paquet FontAwesome est bien installé."
        )
    svg = fichier.read_text(encoding='utf-8')
    viewbox = re.search(r'viewBox="([^"]+)"', svg)
    # On ne garde que la géométrie : le <svg> extérieur, ses dimensions et sa
    # couleur d'origine n'ont rien à faire dans un <symbol>, qui doit hériter
    # de la taille et de la couleur du texte qui l'entoure.
    corps = re.sub(r'</?svg[^>]*>', '', svg).strip()
    corps = re.sub(r'\s*<!--.*?-->\s*', '', corps, flags=re.S).strip()
    return viewbox.group(1), corps


def construire_sprite(icones):
    symboles = []
    for style, nom in icones:
        vb, corps = tracé(style, nom)
        symboles.append(
            f'        <symbol id="i-{style}-{nom}" viewBox="{vb}">{corps}</symbol>')
    return (
        f'{DEBUT}\n'
        '    <!-- Les 39 icônes du site, et rien d\'autre. Généré par\n'
        '         build/construire-sprite-icones.py — ne pas modifier à la main.\n'
        '         Icônes FontAwesome Free, licence CC BY 4.0 (fontawesome.com).\n'
        '         `aria-hidden` + `display:none` : ce bloc est une réserve de\n'
        '         dessins, jamais du contenu. -->\n'
        '    <svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">\n'
        + '\n'.join(symboles) +
        '\n    </svg>\n'
        f'    {FIN}'
    )


def remplacer_balises(texte):
    """<i class="fa-solid fa-x autres"> …  →  <svg class="ico autres"><use …>"""
    motif = re.compile(r'<i\s+([^>]*?)>\s*</i>', re.S)

    def rendu(m):
        attrs = m.group(1)
        cls = re.search(r'class="([^"]*)"', attrs)
        if not cls:
            return m.group(0)
        classes = cls.group(1).split()
        style = nom = marqueur = brut = None
        for i, c in enumerate(classes):
            if c in ('fa-solid', 'fa-regular', 'fa-brands'):
                style, marqueur = c[3:], c
            elif c in COURTES:
                style, marqueur = COURTES[c], c
            else:
                continue
            # le nom suit toujours le style dans le code du site
            for suivant in classes[i + 1:]:
                if suivant.startswith('fa-'):
                    brut = suivant[3:]
                    nom = ALIAS.get(brut, brut)
                    break
            break
        if not style or not nom:
            return m.group(0)      # pas une icône FontAwesome : on n'y touche pas

        # On retire les deux classes FontAwesome, on garde tout le reste
        # (tailles, couleurs, marges Tailwind) et on ajoute `ico`.
        restantes = [c for c in classes if c not in (marqueur, f'fa-{brut}')]
        nouvelles = ' '.join(['ico'] + restantes)

        autres = re.sub(r'class="[^"]*"', '', attrs).strip()
        autres = re.sub(r'\s+', ' ', autres)
        if 'aria-hidden' not in autres:
            autres = (autres + ' aria-hidden="true"').strip()

        return (f'<svg class="{nouvelles}"{" " + autres if autres else ""}>'
                f'<use href="#i-{style}-{nom}"></use></svg>')

    return motif.sub(rendu, texte)


def main():
    icones = icones_utilisees()
    if not icones:
        raise SystemExit('  Aucune icône trouvée — rien à faire.')

    sprite = construire_sprite(icones)

    index = RACINE / 'index.html'
    t = index.read_text(encoding='utf-8')
    if DEBUT not in t or FIN not in t:
        raise SystemExit(
            f'  ARRÊT — repères {DEBUT} / {FIN} absents d\'index.html.\n'
            '  Posez-les à l\'endroit où le sprite doit vivre (juste après <body>).')
    t = re.sub(re.escape(DEBUT) + r'.*?' + re.escape(FIN), lambda _: sprite, t, flags=re.S)
    t = remplacer_balises(t)
    index.write_text(t, encoding='utf-8')

    for f in ['univers.js', '404.html']:
        p = RACINE / f
        if p.exists():
            p.write_text(remplacer_balises(p.read_text(encoding='utf-8')), encoding='utf-8')

    restants = sum(len(re.findall(r'<i\s+[^>]*fa-(?:solid|regular|brands)', (RACINE / f).read_text(encoding='utf-8')))
                   for f in FICHIERS if (RACINE / f).exists())

    print(f'  {len(icones)} icônes dans le sprite ({len(sprite) // 1024} ko)')
    for style, nom in icones:
        print(f'    fa-{style} fa-{nom}')
    print(f'  balises <i> FontAwesome restantes : {restants}')
    if restants:
        print('  ↑ ces balises sont construites dynamiquement : à traiter à la main.')


main()
