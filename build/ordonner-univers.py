#!/usr/bin/env python3
"""
============================================================
 ORDRE CHRONOLOGIQUE DE SHOW_UNIVERSES — opération unique
============================================================
 Réordonne les entrées de SHOW_UNIVERSES dans univers.js, de la plus
 récente à la plus ancienne, pour que l'ordre du FICHIER soit celui du
 répertoire (/spectacles/). L'année est lue dans la ligne de CV
 correspondante d'index.html — jamais recopiée ici.

 À ANNÉE ÉGALE, l'ordre actuel est conservé : trois spectacles de 2022 ne
 doivent pas se réarranger au hasard d'un tri, les choix éditoriaux
 existants sont respectés.

 CE QUE LE TRI COÛTE, ET POURQUOI C'EST ASSUMÉ
 ---------------------------------------------
 Deux commentaires de section disparaissent, parce qu'ils décrivaient des
 groupes que l'ordre chronologique disperse :

   « EN CRÉATION »     couvrait Cassandres et L'imaginaire forcé. Mais
                       « À la barre » est aussi de 2026 et vient s'insérer
                       entre eux : le titre couvrirait alors une entrée
                       qu'il ne décrit pas.
   « COURTS MÉTRAGES » couvrait les deux films, désormais mêlés aux
                       spectacles selon leur année.

 Leur CONTENU n'est pas perdu : il remonte dans l'en-tête de
 SHOW_UNIVERSES, où il vaut pour toutes les entrées.

 Ce script ne sert qu'une fois. Le générateur trie de son côté (voir
 build/generer-pages-spectacles.js) : l'ordre du fichier est un confort de
 lecture, pas ce sur quoi le site s'appuie.
"""

import pathlib
import re

RACINE = pathlib.Path(__file__).resolve().parent.parent
UNIVERS = RACINE / 'univers.js'
INDEX = RACINE / 'index.html'


def annees_du_cv():
    """L'année de chaque spectacle, lue dans sa ligne de CV."""
    src = INDEX.read_text(encoding='utf-8')
    out = {}
    for m in re.finditer(r'<li class="cv-item[\s\S]*?</li>', src):
        nom = re.search(r'data-cv-show="([^"]*)"', m.group(0))
        if not nom:
            continue
        cle = (nom.group(1).replace('&#39;', "'").replace('&quot;', '"')
               .replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>'))
        an = re.search(r'class="[^"]*cv-year[^"]*"[^>]*>([\s\S]*?)</span>', m.group(0))
        chiffres = re.search(r'\d{4}', re.sub(r'<[^>]*>', '', an.group(1))) if an else None
        out[cle] = int(chiffres.group(0)) if chiffres else 0
    return out


NOUVEL_ENTETE = '''
    // ── L'ORDRE ──────────────────────────────────────────────────────
    //  De la plus récente à la plus ancienne, comme le répertoire
    //  (/spectacles/) et comme se lit un CV. À année égale, l'ordre est
    //  celui qu'on a choisi — le tri ne le bouscule pas.
    //  Le générateur des pages spectacle trie de son côté : cet ordre-ci
    //  est un confort de lecture, rien ne s'appuie dessus.
    //
    //  DEUX CONVENTIONS, qui valent pour n'importe quelle entrée et qui
    //  avaient jusqu'ici leur propre section — l'ordre chronologique les
    //  a dispersées :
    //
    //   · `sequence: []` n'est pas un oubli. Un spectacle qui n'existe
    //     pas encore n'a pas d'images à montrer : un titre, ce qu'on en
    //     sait, et le pied de page. C'est l'état juste.
    //
    //   · `kind: 'film'` change le vocabulaire : un film n'est pas « à
    //     l'affiche », n'a pas de tournée, et son pied de page ne renvoie
    //     pas aux dates. Le montage viendra quand il y aura des images —
    //     ou un extrait, avec un bloc { video: … }.
'''

# Les deux en-têtes de section à retirer, reconnus par leur première ligne.
SECTIONS = ('// ── EN CRÉATION', '// ── COURTS MÉTRAGES')


def main():
    src = UNIVERS.read_text(encoding='utf-8')
    deb = src.index('const SHOW_UNIVERSES = {')
    ouverture = src.index('\n', deb) + 1
    # Fin de l'objet : l'accolade fermante au niveau 0
    prof = 0
    i = deb
    while i < len(src):
        if src[i] == '{':
            prof += 1
        elif src[i] == '}':
            prof -= 1
            if prof == 0:
                break
        i += 1
    fin = i                      # index du '}' final

    corps = src[ouverture:fin]
    lignes = corps.split('\n')

    # Découpage en entrées : chacune part de la ligne qui suit la précédente
    # (commentaires compris) et s'arrête quand ses accolades se referment.
    entrees = []
    debut_bloc = 0
    j = 0
    while j < len(lignes):
        if re.match(r"""^    (?:'|")""", lignes[j]):
            cle = re.match(r"""^    (?:'([^']*)'|"([^"]*)")\s*:""", lignes[j])
            nom = (cle.group(1) if cle.group(1) is not None else cle.group(2))
            prof = 0
            k = j
            while k < len(lignes):
                prof += lignes[k].count('{') - lignes[k].count('}')
                if prof == 0 and k > j:
                    break
                k += 1
            entrees.append({'cle': nom, 'texte': '\n'.join(lignes[debut_bloc:k + 1])})
            debut_bloc = k + 1
            j = k
        j += 1

    if len(entrees) < 2:
        raise SystemExit('  ARRÊT — aucune entrée reconnue dans SHOW_UNIVERSES.')

    # Les en-têtes de section sortent des blocs où ils ont atterri.
    for e in entrees:
        gardees = []
        for l in e['texte'].split('\n'):
            if any(s in l for s in SECTIONS):
                gardees.append('\x00')          # marque le début d'un bloc à sauter
            else:
                gardees.append(l)
        # On retire la ligne marquée et les lignes de commentaire qui la suivent
        propre, saut = [], False
        for l in gardees:
            if l == '\x00':
                saut = True
                continue
            if saut:
                if l.strip().startswith('//') or l.strip() == '':
                    continue
                saut = False
            propre.append(l)
        e['texte'] = '\n'.join(propre).strip('\n')

    annees = annees_du_cv()
    manquantes = [e['cle'] for e in entrees if e['cle'] not in annees]
    if manquantes:
        print('  Sans ligne de CV (placés en fin) : ' + ', '.join(manquantes))

    # Tri STABLE : à année égale, l'ordre d'origine est conservé.
    for rang, e in enumerate(entrees):
        e['rang'] = rang
        e['annee'] = annees.get(e['cle'], 0)
    entrees.sort(key=lambda e: (-e['annee'], e['rang']))

    corps2 = NOUVEL_ENTETE + '\n' + '\n\n'.join(e['texte'] for e in entrees) + '\n'
    UNIVERS.write_text(src[:ouverture] + corps2 + src[fin:], encoding='utf-8')

    print(f'  {len(entrees)} univers réordonnés :')
    for e in entrees:
        print(f"    {e['annee']}  {e['cle']}")


main()
