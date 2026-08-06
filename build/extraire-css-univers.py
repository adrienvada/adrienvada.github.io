#!/usr/bin/env python3
"""
============================================================
 EXTRACTION DU CSS DES UNIVERS — opération unique
============================================================
 Sort le bloc de règles `#show-universe` / `.u-*` du <style> d'index.html
 vers un fichier `univers.css`, chargé désormais par DEUX endroits :
 la page d'accueil (pour le panneau plein écran) et les pages spectacle
 générées (pour qu'elles aient enfin le même visage).

 CE QUI RESTE DANS index.html, ET POURQUOI
 -----------------------------------------
 Trois règles isolées, dans la requête média mobile :
     #show-universe .u-title
     #show-universe .u-chapter h3
     #show-universe .u-foot-title
 Elles ne décrivent pas l'univers : elles REPRENNENT LA MAIN sur les
 `!important` que la page d'accueil impose à tous ses titres sur petit
 écran. Ce conflit n'existe que là. Les déplacer les rendrait à la fois
 inutiles et incompréhensibles.

 LA CASCADE
 ----------
 Le <link> est posé exactement là où le bloc se trouvait dans l'ordre de
 lecture : après styles.css, avant le reste du <style>. Sans cela, des
 règles de même spécificité changeraient de gagnant en silence. La preuve
 que rien n'a bougé se fait par empreinte des styles calculés, avant et
 après — pas à l'œil.

 Ce script ne sert qu'une fois. Il est gardé pour que l'opération soit
 relisible, pas pour être rejoué : une fois le bloc sorti, il ne trouve
 plus ses repères et s'arrête sans rien faire.
"""

import pathlib
import re
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
INDEX = RACINE / 'index.html'
SORTIE = RACINE / 'univers.css'

# Bornes du bloc, reconnues par leur texte et non par leur numéro de ligne :
# un numéro serait faux à la première modification d'index.html.
DEBUT = '''        /* ══════════════════════════════════════════════════════════════
           UNIVERS DES SPECTACLES (voir univers.js)'''
FIN = '''        @media print {
            #show-universe {
                display: none !important;
            }
        }
'''

ENTETE = '''/* ══════════════════════════════════════════════════════════════════════
   UNIVERS D'UN SPECTACLE — la feuille commune
   ══════════════════════════════════════════════════════════════════════
   Ces règles habillaient le panneau plein écran de la page d'accueil.
   Elles sont sorties d'index.html pour être PARTAGÉES avec les pages
   /spectacles/<slug>/, qui affichent le même montage et doivent donc
   avoir le même visage — il n'y a plus deux endroits où le corriger.

   Rien n'a été réécrit au passage : mêmes règles, même ordre, mêmes
   sélecteurs `#show-universe`. Les pages générées enveloppent leur
   contenu dans un élément portant cet identifiant pour en hériter.

   TROIS RÈGLES SONT RESTÉES DANS index.html, dans sa requête média
   mobile : elles reprennent la main sur les `!important` que la page
   d'accueil impose à ses titres, un conflit qui n'existe que là.

   ── L'ÉTAT LISIBLE (.u-statique) ──
   Sur la page d'accueil, les mots du montage arrivent masqués
   (`.u-rw { opacity: 0 }`) et c'est le défilement qui les révèle. Une
   page spectacle n'a pas ce script : servie telle quelle, elle serait
   blanche. La classe `.u-statique`, posée sur le <body> des pages
   générées, remet tout à l'état lisible — c'est exactement ce que fait
   déjà le bloc `prefers-reduced-motion` en fin de fichier, réemployé
   plutôt que réinventé.
   ══════════════════════════════════════════════════════════════════════ */

'''

STATIQUE = '''

/* ══════════════════════════════════════════════════════════════════════
   L'ÉTAT LISIBLE — pages spectacle autonomes
   ══════════════════════════════════════════════════════════════════════
   Quelqu'un qui arrive depuis un moteur de recherche vient LIRE, pas
   assister à une ouverture de scène. Et sans le script du panneau, les
   mots masqués ne se révéleraient jamais : la page serait vide.

   D'où cette classe de portée, qui annule les états de départ sans
   toucher au reste du dessin — les couleurs, les rythmes typographiques
   et les cadrages sont ceux du panneau, à l'identique.
   ══════════════════════════════════════════════════════════════════════ */

.u-statique .u-rw,
.u-statique .u-ch,
.u-statique .u-wd,
.u-statique .u-word,
.u-statique .u-line,
.u-statique .u-reveal,
.u-statique .u-fig,
.u-statique .u-fig-media,
.u-statique figcaption,
.u-statique .u-aside,
.u-statique .u-cap {
    opacity: 1 !important;
    filter: none !important;
    transform: none !important;
    transition: none !important;
    visibility: visible !important;
    clip-path: none !important;
}

/* Le panneau se pose en `position: fixed` par-dessus la page d'accueil et
   défile dans sa propre boîte. Sur une page autonome il EST la page :
   c'est le document qui défile, sinon la hauteur d'écran couperait le
   montage au premier tiers. */
.u-statique #show-universe {
    position: static !important;
    inset: auto !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    opacity: 1 !important;
    visibility: visible !important;
    clip-path: none !important;
    transform: none !important;
}
'''


def main():
    t = INDEX.read_text(encoding='utf-8')

    i = t.find(DEBUT)
    if i == -1:
        raise SystemExit(
            "  RIEN À FAIRE — le bloc CSS des univers n'est plus dans index.html.\n"
            "  C'est le cas normal après le premier passage : ce script ne sert qu'une fois."
        )
    j = t.find(FIN, i)
    if j == -1:
        raise SystemExit(
            "  ARRÊT — début du bloc trouvé, mais pas sa fin.\n"
            f"  La borne cherchée est la règle d'impression :\n{FIN}"
        )
    j += len(FIN)

    bloc = t[i:j]

    # Les règles vivaient indentées de huit espaces dans le <style>.
    # On les désindente pour qu'elles se lisent comme une vraie feuille.
    lignes = [l[8:] if l.startswith(' ' * 8) else l for l in bloc.split('\n')]
    SORTIE.write_text(ENTETE + '\n'.join(lignes).strip() + STATIQUE + '\n', encoding='utf-8')

    # ── LA PLACE DU <link> DÉCIDE DE TOUT ──
    # Le <style> d'index.html se lit comme une suite : [A] avant le bloc
    # univers, [B] le bloc, [C] après. B l'emportait sur A, simple effet de
    # l'ordre. Poser le <link> avant tout le <style> mettrait B AVANT A, et
    # A gagnerait — ce qui s'est vu au premier essai : une règle globale
    #     :focus-visible { border-radius: 3px }
    # écrite dans A reprenait le dessus sur `.u-close { border-radius: 999px }`,
    # et la croix de fermeture, qui reçoit le focus à l'ouverture, cessait
    # d'être ronde. Même spécificité, ordre inversé, régression silencieuse.
    #
    # On coupe donc le <style> en deux et on glisse le <link> entre les
    # morceaux, exactement là où le bloc se trouvait. L'ordre de lecture est
    # rigoureusement celui d'avant.
    lien = (
        '        </style>\n\n'
        '        <!-- Le visage des univers, partagé entre le panneau plein écran de\n'
        '             cette page et les pages /spectacles/ (voir\n'
        '             build/generer-pages-spectacles.js).\n\n'
        '             CE <link> EST POSÉ ICI, ENTRE DEUX MORCEAUX DU <style>, et pas\n'
        '             ailleurs : ces règles doivent continuer à l\'emporter sur celles\n'
        '             qui les précédaient et à céder devant celles qui les suivaient.\n'
        '             Le remonter avant le <style> a suffi, au premier essai, à rendre\n'
        '             carrée une croix de fermeture qui est ronde depuis toujours. -->\n'
        '        <link rel="stylesheet" href="univers.css">\n\n'
        '        <style type="text/css">\n'
    )

    t = t[:i] + lien + t[j:]

    INDEX.write_text(t, encoding='utf-8')
    print(f"  univers.css écrit : {len(SORTIE.read_text(encoding='utf-8').splitlines())} lignes")
    print(f"  index.html allégé de {len(bloc.splitlines())} lignes")
    print(f"  <link> posé à la place exacte du bloc, en coupant le <style> en deux")


main()
