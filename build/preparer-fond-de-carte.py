#!/usr/bin/env python3
"""
============================================================
 LE FOND DE LA CARTE DE LA SAISON — build/donnees/carte-base.json
============================================================
 POURQUOI
 --------
 La saison d'un regard, dans l'onglet Dates, montre où Adrien joue : la
 Normandie et les villes de tournée, en SVG, SANS SERVICE DE CARTE
 EXTERNE (ni tuiles, ni clé, ni adresse IP envoyée à personne). Il lui
 faut un fond — les contours des trois régions où se joue la saison — et
 la place de chaque commune, pour y poser les villes.

 Ce script les prépare UNE FOIS : il lit les contours d'Admin Express
 (IGN), tels que les distribue le projet france-geojson, et écrit dans
 build/donnees/carte-base.json :
   · les contours de la Normandie, des Hauts-de-France et de
     l'Île-de-France, simplifiés (Douglas-Peucker, ~500 m) ;
   · le centre de chaque commune de leurs dix-huit départements,
     au millième de degré (une centaine de mètres).
 build/fabriquer-carte.js le relit à chaque `npm run pages`, sans réseau.

 À REFAIRE seulement si la saison sort de ces trois régions (ajouter les
 départements à DEPARTEMENTS et la région à REGIONS), ou si une commune a
 changé de nom :

     python3 build/preparer-fond-de-carte.py

 SOURCE ET LICENCE
 -----------------
 IGN, Admin Express, via https://github.com/gregoiredavid/france-geojson
 — Licence ouverte (Etalab) : réutilisation libre, avec la mention de la
 source (elle est écrite dans le fichier produit et sous la carte).
"""

import json
import math
import pathlib
import unicodedata
import urllib.request

RACINE = pathlib.Path(__file__).resolve().parent.parent
SORTIE = RACINE / 'build' / 'donnees' / 'carte-base.json'
SOURCE = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master'

REGIONS = {'28': 'Normandie', '32': 'Hauts-de-France', '11': 'Île-de-France'}
DEPARTEMENTS = [
    '14-calvados', '27-eure', '50-manche', '61-orne', '76-seine-maritime',
    '02-aisne', '59-nord', '60-oise', '62-pas-de-calais', '80-somme',
    '75-paris', '77-seine-et-marne', '78-yvelines', '91-essonne',
    '92-hauts-de-seine', '93-seine-saint-denis', '94-val-de-marne', '95-val-d-oise',
]


def lire(chemin):
    """Le fichier, depuis un cache local s'il est là (dossier geo/ à côté du
    script lancé), sinon depuis la source."""
    local = pathlib.Path.cwd() / 'geo' / pathlib.Path(chemin).name
    if local.exists():
        return json.loads(local.read_text(encoding='utf-8'))
    with urllib.request.urlopen(f'{SOURCE}/{chemin}', timeout=90) as r:
        return json.loads(r.read().decode('utf-8'))


def cle(nom):
    """« Saint-Pierre-lès-Elbeuf » → « saint pierre les elbeuf » : la forme
    sous laquelle le site cherche une ville (voir dlCarte, index.html)."""
    s = unicodedata.normalize('NFD', nom)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    s = s.replace('œ', 'oe').replace('’', "'")
    return ' '.join(''.join(c if c.isalnum() else ' ' for c in s).split())


def anneau_principal(geom):
    """Le plus grand anneau extérieur : une commune ou une région peut avoir
    des îles ; c'est le continent qu'on dessine et dont on prend le centre."""
    if geom['type'] == 'Polygon':
        anneaux = [geom['coordinates'][0]]
    else:
        anneaux = [p[0] for p in geom['coordinates']]
    return max(anneaux, key=lambda a: abs(aire(a)))


def aire(anneau):
    return sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(anneau, anneau[1:])) / 2


def centre(anneau):
    """Le centre de gravité de la surface (et non la moyenne des sommets, que
    les côtes découpées tirent vers la mer)."""
    a = aire(anneau)
    if abs(a) < 1e-12:
        xs, ys = zip(*anneau)
        return sum(xs) / len(xs), sum(ys) / len(ys)
    cx = sum((x0 + x1) * (x0 * y1 - x1 * y0) for (x0, y0), (x1, y1) in zip(anneau, anneau[1:])) / (6 * a)
    cy = sum((y0 + y1) * (x0 * y1 - x1 * y0) for (x0, y0), (x1, y1) in zip(anneau, anneau[1:])) / (6 * a)
    return cx, cy


def simplifier(points, tolerance):
    """Douglas-Peucker, en degrés (les longitudes ramenées à la latitude 49,5°)."""
    if len(points) < 3:
        return points
    k = math.cos(math.radians(49.5))

    def distance(p, a, b):
        (px, py), (ax, ay), (bx, by) = [(x * k, y) for x, y in (p, a, b)]
        dx, dy = bx - ax, by - ay
        if dx == dy == 0:
            return math.hypot(px - ax, py - ay)
        t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        return math.hypot(px - ax - t * dx, py - ay - t * dy)

    garde = [False] * len(points)
    garde[0] = garde[-1] = True
    pile = [(0, len(points) - 1)]
    while pile:
        i, j = pile.pop()
        loin, dmax = None, tolerance
        for m in range(i + 1, j):
            d = distance(points[m], points[i], points[j])
            if d > dmax:
                loin, dmax = m, d
        if loin is not None:
            garde[loin] = True
            pile += [(i, loin), (loin, j)]
    return [p for p, g in zip(points, garde) if g]


def main():
    regions = lire('regions-version-simplifiee.geojson')
    contours = []
    for f in regions['features']:
        code = f['properties']['code']
        if code not in REGIONS:
            continue
        anneau = simplifier(anneau_principal(f['geometry']), 0.005)
        contours.append({'code': code, 'nom': REGIONS[code],
                         'points': [[round(x, 3), round(y, 3)] for x, y in anneau]})
    communes = {}
    for dep in DEPARTEMENTS:
        donnees = lire(f'departements/{dep}/communes-{dep}.geojson')
        numero = dep.split('-')[0]
        table = {}
        for f in donnees['features']:
            nom = f['properties'].get('nom') or ''
            x, y = centre(anneau_principal(f['geometry']))
            table[cle(nom)] = [round(x, 3), round(y, 3)]
        communes[numero] = dict(sorted(table.items()))
    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    SORTIE.write_text(json.dumps({
        'source': 'IGN, Admin Express (via github.com/gregoiredavid/france-geojson) — Licence ouverte Etalab',
        'regions': contours,
        'communes': communes,
    }, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    n = sum(len(t) for t in communes.values())
    print(f'  {SORTIE.relative_to(RACINE)} : {len(contours)} régions, {n} communes, {SORTIE.stat().st_size // 1024} Ko')


if __name__ == '__main__':
    main()
