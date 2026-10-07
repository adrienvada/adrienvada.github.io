'use strict';
// ════════════════════════════════════════════════════════════════════
//  INCRUSTÉE DANS L'ACCUEIL — le bloc commun aux pages générées
//  --------------------------------------------------------------------
//  Quand une démo voix joue, l'accueil ouvre la galerie, le répertoire et
//  les fiches DANS un cadre, par-dessus lui, au lieu de les quitter : la
//  démo continue (voir pageIncrustee dans index.html, et README-build.md,
//  « La galerie et les spectacles par-dessus l'accueil »). Ce bloc, posé
//  dans le <head> de chacune par generer-page-galerie.js et
//  generer-pages-spectacles.js, la fait se savoir dans le cadre AVANT le
//  premier rendu (classe `incrustee`) :
//
//    • elle laisse au mini-lecteur de l'accueil, qui flotte au bas de
//      l'écran au-dessus du cadre, la place sous sa fin ;
//    • un lien vers l'accueil referme le cadre au lieu de le recharger
//      (son ancre suit : « Accéder aux dates » ouvre l'onglet Dates) ;
//    • un lien vers une autre page du site s'ouvre dans le cadre, EN
//      REMPLAÇANT la page (location.replace) : l'historique de la fenêtre
//      ne garde que l'entrée de la couche, que le retour referme d'un coup ;
//    • un lien vers un autre site s'ouvre dans un nouvel onglet — une
//      billetterie refuse souvent d'être encadrée, et quitter l'accueil
//      couperait la démo.
//
//  Seulement si la page parente est l'accueil de ce même site, et qu'il a
//  la couche : nulle part ailleurs la page ne change de comportement.
// ════════════════════════════════════════════════════════════════════
const INCRUSTEE = `    <script>
        // INCRUSTÉE DANS L'ACCUEIL — voir build/incrustee.js.
        (function () {
            try {
                if (window.parent === window || parent.location.origin !== location.origin
                    || !parent.document.getElementById('page-incrustee')) return;
            } catch (e) { return; }
            document.documentElement.classList.add('incrustee');
            function refermer(ancre) {
                parent.postMessage({ av: 'fermer-incrustee', ancre: ancre || '' }, location.origin);
            }
            window.refermerIncrustee = refermer;
            document.addEventListener('click', function (e) {
                if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                var a = e.target.closest && e.target.closest('a[href]');
                if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
                var u = new URL(a.href, location.href);
                if (!/^https?:$/.test(u.protocol)) return;
                if (u.origin === location.origin && u.pathname === location.pathname && u.search === location.search) return;
                e.preventDefault();
                if (u.origin !== location.origin) window.open(u.href, '_blank', 'noopener');
                else if (u.pathname === '/' || u.pathname === '/index.html') refermer(u.hash.slice(1));
                else location.replace(u.href);
            });
        })();
    </script>
    <style>
        html.incrustee body {
            padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px)) !important;
        }
    </style>
`;

module.exports = { INCRUSTEE };
