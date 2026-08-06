#!/usr/bin/env python3
"""
============================================================
 EXTRACTION DU MOTEUR DE MONTAGE — opération unique
============================================================
 Sort d'univers.js les fonctions qui FABRIQUENT le montage d'un univers
 — chapitres, cartons de citation, incrustations, groupes de vignettes,
 vidéo, affiche, palmarès, générique — vers `univers-montage.js`, un
 fichier lisible aussi bien par le navigateur que par Node.

 POURQUOI
 --------
 Le panneau plein écran de l'accueil et les pages /spectacles/ montrent
 le même montage. Tant que le moteur vivait enfermé dans l'IIFE
 d'univers.js, le script de build ne pouvait pas l'appeler : il en a
 écrit un second, qui aplatissait la séquence en une grille de photos et
 perdait toute la dramaturgie. Un seul moteur, donc, et plus deux.

 CE QUI BOUGE, CE QUI RESTE
 --------------------------
 Bougent : les constructeurs de chaînes, qui ne dépendent que de leurs
 arguments et de quelques constantes. Vérifié fonction par fonction.
 Restent : tout ce qui touche au DOM ou à l'état du panneau — rowInfo,
 datesBlock, applyPalette, l'écriture, la parallaxe, le zoom, l'ouverture
 en clip-path. Rien de ce qui s'anime ne quitte l'accueil.

 L'ESPACE DE NOMS
 ----------------
 Le module se referme sur lui-même et n'expose que `UniversMontage`. Sans
 cela, son `escape` deviendrait une variable globale et masquerait le
 `window.escape` du navigateur. L'IIFE d'univers.js redéclare les noms en
 tête par déstructuration : AUCUN POINT D'APPEL NE CHANGE, ce qui est
 précisément ce qui rend l'opération vérifiable.

 Ce script ne sert qu'une fois ; il est gardé pour que l'opération reste
 relisible. Rejoué, il ne trouve plus ses repères et s'arrête.
"""

import pathlib
import re

RACINE = pathlib.Path(__file__).resolve().parent.parent
UNIVERS = RACINE / 'univers.js'
MODULE = RACINE / 'univers-montage.js'
INDEX = RACINE / 'index.html'

# Constantes dont les constructeurs ont besoin. Elles descendent avec eux.
CONSTANTES = ['escape', 'FRAMES', 'FRAME_PAIR', 'YT_ID', 'LAYOUT_BY_COUNT']

# Les constructeurs, dans l'ordre où on veut les relire.
FONCTIONS = ['toLines', 'splitWords', 'splitChars', 'titleMetrics', 'revealWords',
             'longestLine', 'photoSrc', 'framePos', 'figureHtml', 'overHtml',
             'videoId', 'videoHtml', 'afficheHtml', 'beatsHtml', 'prixBlock', 'castBlock']

ENTETE = '''/**
 * ============================================================
 *  LE MONTAGE D'UN UNIVERS — moteur partagé
 * ============================================================
 *  Ces fonctions fabriquent le HTML d'un univers de spectacle :
 *  l'affiche, les intertitres, les cartons de citation, les
 *  incrustations sur photo, les groupes de vignettes et leurs légendes,
 *  la vidéo, le palmarès, le générique.
 *
 *  DEUX LECTEURS, UN SEUL MOTEUR
 *  -----------------------------
 *    · le navigateur, pour le panneau plein écran ouvert depuis le CV
 *      (univers.js redéclare ces noms en tête de son IIFE) ;
 *    · Node, pour les pages /spectacles/<slug>/
 *      (build/generer-pages-spectacles.js fait un require).
 *
 *  C'est ce partage qui garantit qu'une page spectacle a le même visage
 *  que son univers. Il y avait auparavant deux moteurs, et le second
 *  aplatissait la séquence en une grille de photos : les chapitres, les
 *  citations et les incrustations disparaissaient. Corriger le montage à
 *  un endroit le corrige désormais partout.
 *
 *  RIEN ICI NE TOUCHE AU DOM. C'est la condition pour que Node puisse
 *  s'en servir : toute fonction qui lit un élément ou l'état du panneau
 *  reste dans univers.js.
 *
 *  Le module se referme sur lui-même et n'expose que `UniversMontage` :
 *  laisser son `escape` au niveau global masquerait le `window.escape`
 *  du navigateur.
 * ============================================================
 */
const UniversMontage = (function () {
    'use strict';

'''

PIED = '''
    return {
        escape, toLines, splitWords, splitChars, titleMetrics, revealWords,
        longestLine, photoSrc, framePos, figureHtml, overHtml, videoId,
        videoHtml, afficheHtml, beatsHtml, prixBlock, castBlock,
        FRAMES, FRAME_PAIR, YT_ID, LAYOUT_BY_COUNT
    };
})();

// Node : c'est par ici que le script de build entre.
if (typeof module !== 'undefined' && module.exports) module.exports = UniversMontage;
'''


def bloc_fonction(lignes, nom):
    """Bornes d'une fonction déclarée à l'indentation 4, accolades comptées."""
    for i, l in enumerate(lignes):
        if re.match(r'^    function ' + re.escape(nom) + r'\(', l):
            # On remonte les lignes de commentaire qui la précèdent : elles
            # expliquent la fonction, elles doivent la suivre.
            deb = i
            while deb > 0 and (lignes[deb - 1].strip().startswith(('//', '*', '/*')) or
                               (lignes[deb - 1].strip() == '' and
                                deb > 1 and lignes[deb - 2].strip().startswith(('//', '*', '/*')))):
                deb -= 1
            prof = 0
            j = i
            while j < len(lignes):
                prof += lignes[j].count('{') - lignes[j].count('}')
                if prof == 0 and j > i:
                    return deb, j
                j += 1
    return None


def bloc_constante(lignes, nom):
    """Bornes d'une const déclarée à l'indentation 4 (mono ou multi-lignes)."""
    for i, l in enumerate(lignes):
        if re.match(r'^    const ' + re.escape(nom) + r'\b', l):
            deb = i
            while deb > 0 and lignes[deb - 1].strip().startswith(('//', '*', '/*')):
                deb -= 1
            prof = 0
            j = i
            while j < len(lignes):
                prof += (lignes[j].count('{') + lignes[j].count('(') + lignes[j].count('[')
                         - lignes[j].count('}') - lignes[j].count(')') - lignes[j].count(']'))
                if prof <= 0 and (lignes[j].rstrip().endswith(';') or
                                  (j > i and lignes[j].strip() == '')):
                    return deb, j
                j += 1
    return None


def main():
    src = UNIVERS.read_text(encoding='utf-8')
    lignes = src.split('\n')

    a_sortir = []
    for nom in CONSTANTES:
        b = bloc_constante(lignes, nom)
        if not b:
            raise SystemExit(f"  ARRÊT — constante « {nom} » introuvable dans univers.js.")
        a_sortir.append((nom, b))
    for nom in FONCTIONS:
        b = bloc_fonction(lignes, nom)
        if not b:
            raise SystemExit(f"  ARRÊT — fonction « {nom} » introuvable dans univers.js.")
        a_sortir.append((nom, b))

    # Chevauchement = un repère mal posé. On préfère s'arrêter.
    plages = sorted((d, f, n) for n, (d, f) in a_sortir)
    for (d1, f1, n1), (d2, f2, n2) in zip(plages, plages[1:]):
        if d2 <= f1:
            raise SystemExit(f"  ARRÊT — « {n1} » et « {n2} » se chevauchent ({d1}-{f1} / {d2}-{f2}).")

    morceaux = {n: '\n'.join(lignes[d:f + 1]) for n, (d, f) in a_sortir}
    corps = '\n\n'.join(morceaux[n] for n, _ in a_sortir)
    MODULE.write_text(ENTETE + corps + '\n' + PIED, encoding='utf-8')

    # Retrait d'univers.js, du bas vers le haut pour ne pas décaler les index.
    for d, f, _ in sorted(plages, reverse=True):
        del lignes[d:f + 1]

    # Les noms sont redéclarés en tête de l'IIFE : aucun appel ne change.
    src2 = '\n'.join(lignes)
    ancre = "(function () {\n    'use strict';\n"
    if ancre not in src2:
        raise SystemExit("  ARRÊT — impossible de situer l'ouverture de l'IFFE d'univers.js.")
    recup = '''
    // Le moteur de montage vit dans univers-montage.js, partagé avec le
    // script qui fabrique les pages /spectacles/. On redéclare ici ses noms :
    // tout le fichier continue de les appeler comme avant, et l'opération
    // se relit sans avoir à vérifier deux cents points d'appel.
    const {
        escape, toLines, splitWords, splitChars, titleMetrics, revealWords,
        longestLine, photoSrc, framePos, figureHtml, overHtml, videoId,
        videoHtml, afficheHtml, beatsHtml, prixBlock, castBlock,
        FRAMES, FRAME_PAIR, YT_ID, LAYOUT_BY_COUNT
    } = UniversMontage;
'''
    src2 = src2.replace(ancre, ancre + recup, 1)
    UNIVERS.write_text(src2, encoding='utf-8')

    # Le module doit être lu AVANT univers.js.
    t = INDEX.read_text(encoding='utf-8')
    if 'univers-montage.js' not in t:
        cible = '    <script src="univers.js"></script>'
        if cible not in t:
            raise SystemExit("  ARRÊT — balise <script src=\"univers.js\"> introuvable dans index.html.")
        t = t.replace(cible,
                      '    <!-- Le moteur de montage, avant univers.js qui s\'en sert.\n'
                      '         Même fichier que celui dont se sert build/generer-pages-spectacles.js :\n'
                      '         c\'est ce qui garantit qu\'une page spectacle a le visage de son univers. -->\n'
                      '    <script src="univers-montage.js"></script>\n' + cible, 1)
        INDEX.write_text(t, encoding='utf-8')

    print(f"  univers-montage.js : {len(MODULE.read_text(encoding='utf-8').splitlines())} lignes, "
          f"{len(CONSTANTES)} constantes et {len(FONCTIONS)} fonctions")
    print(f"  univers.js allégé de {sum(f - d + 1 for d, f, _ in plages)} lignes")
    print("  <script> posé avant univers.js")


main()
