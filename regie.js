/**
 * ============================================================
 *  LA RÉGIE — le défilement mène les scènes
 * ============================================================
 *  Au théâtre, la régie envoie les lumières et les changements de
 *  décor au bon moment. Ici, c'est le défilement qui donne les tops :
 *  une photo fait le point quand elle arrive au milieu de l'écran, une
 *  réplique s'écrit quand on la lit, une scène se tient à l'écran le
 *  temps qu'il faut pour qu'il s'y passe quelque chose.
 *
 *  DEUX RÉGIMES, UNE SEULE ÉCRITURE
 *  --------------------------------
 *  Chaque mouvement est écrit UNE FOIS, en CSS : des @keyframes, et
 *  deux nombres qui disent quand il commence et quand il finit dans la
 *  progression de sa scène (--s et --e, entre 0 et 1). Puis :
 *
 *    · le navigateur récent (Chrome, Edge, Safari 26) fait avancer ces
 *      animations LUI-MÊME au défilement (animation-timeline). Rien ne
 *      tourne sur le fil principal : le mouvement reste fluide même
 *      quand la page travaille. C'est déclaré en CSS, dans un @supports,
 *      et ce fichier n'a alors RIEN à faire ;
 *
 *    · ailleurs, c'est ce fichier qui mesure où en est chaque scène
 *      visible et l'écrit dans --p. La même animation, mise en pause,
 *      avance alors par un délai négatif calculé sur --p (voir la règle
 *      .regie-repli dans univers.css). Les images sont les mêmes au
 *      pixel près — vérifié côte à côte sur les douze démonstrations de
 *      l'audit du mouvement.
 *
 *  LES DEUX SORTES DE SCÈNES
 *  -------------------------
 *    .rg-scene  une scène TENUE : un conteneur haut, dont le décor reste
 *               collé à l'écran (position: sticky) pendant qu'on défile.
 *               0 quand son haut touche le haut de l'écran, 1 quand son
 *               bas touche le bas (plage « contain »).
 *    .rg-vue    un élément qui TRAVERSE l'écran. 0 quand son haut entre
 *               par le bas, 1 quand son bas sort par le haut (« cover »).
 *    .rg-ligne  un élément réglé sur la LIGNE DE LECTURE — la frise du CV.
 *               Ses plages ne sont pas des fractions de sa course mais des
 *               hauteurs d'écran (« quand son haut passe au milieu ») :
 *               on lui écrit donc où est son haut (--ph) et sa hauteur
 *               (--pt), en hauteurs d'écran, et ses règles de repli font
 *               le calcul (voir « La frise » dans index.html).
 *
 *  Les éléments animés portent .rg-k et le nom de leur animation dans
 *  --rg-anim ; ils suivent la scène la plus proche qui les contient —
 *  ou eux-mêmes, s'ils portent aussi .rg-vue.
 *
 *  POURQUOI UN NOM EN VARIABLE PLUTÔT QU'EN animation-name : sans pilote
 *  (un navigateur ancien SANS JavaScript), une animation déclarée se
 *  jouerait d'un coup au chargement et s'arrêterait sur sa dernière
 *  image — des photos parties, un titre effacé. Portée par --rg-anim,
 *  elle n'est posée que par l'un des deux pilotes : sans pilote, rien ne
 *  bouge, et c'est l'état lisible qui s'affiche.
 *
 *  ?repli dans l'adresse force le second régime — pour le vérifier dans
 *  un navigateur qui a le premier (build/verifier-site.js s'en sert).
 * ============================================================
 */
(function () {
    'use strict';

    const racine = document.documentElement;
    const REPLI_FORCE = /[?&]repli(?:[=&]|$)/.test(location.search);
    const NATIF = !REPLI_FORCE && !!(window.CSS && CSS.supports &&
        CSS.supports('animation-timeline: view()') &&
        CSS.supports('view-timeline: --rg block'));

    if (!NATIF) racine.classList.add('regie-repli');

    // Les scènes suivies, et celles qui sont à l'écran ou tout près.
    const suivies = new Set();
    const visibles = new Set();
    let guet = null, image = 0;

    function planifier() {
        if (!image) image = requestAnimationFrame(calculer);
    }

    // TOUT LIRE, PUIS TOUT ÉCRIRE. Mesurer une scène juste après en avoir
    // écrit une autre forcerait le navigateur à recalculer les styles
    // entre les deux ; on relève donc d'abord toutes les positions, et on
    // n'écrit qu'ensuite.
    function calculer() {
        image = 0;
        if (NATIF || !visibles.size) return;
        const mesures = [];
        for (const el of visibles) {
            const boite = el._rgBoite;
            mesures.push([el, el.getBoundingClientRect(),
                boite ? boite.getBoundingClientRect().top : 0,
                boite ? boite.clientHeight : window.innerHeight]);
        }
        for (const [el, r, origine, h] of mesures) {
            const haut = r.top - origine;
            if (el._rgLigne) {
                const ph = haut / h, pt = r.height / h;
                if (el._rgPh === undefined || Math.abs(el._rgPh - ph) > 0.0004) {
                    el._rgPh = ph;
                    el.style.setProperty('--ph', ph.toFixed(4));
                }
                if (el._rgPt === undefined || Math.abs(el._rgPt - pt) > 0.0004) {
                    el._rgPt = pt;
                    el.style.setProperty('--pt', pt.toFixed(4));
                }
                continue;
            }
            let p = el.classList.contains('rg-scene')
                ? -haut / Math.max(1, r.height - h)
                : (h - haut) / (h + r.height);
            p = p < 0 ? 0 : p > 1 ? 1 : p;
            // Un écart invisible ne vaut pas un recalcul de style.
            if (el._rgP === undefined || Math.abs(el._rgP - p) > 0.0004) {
                el._rgP = p;
                el.style.setProperty('--p', p.toFixed(4));
            }
        }
    }

    function guetteur() {
        if (guet) return guet;
        guet = new IntersectionObserver((entrees) => {
            for (const e of entrees) {
                if (e.isIntersecting) visibles.add(e.target);
                else visibles.delete(e.target);
                // Signalé dans les deux régimes : c'est ce qui permet
                // d'arrêter ce qui tourne tout seul quand on ne le voit pas.
                e.target.classList.toggle('rg-visible', e.isIntersecting);
            }
            planifier();
        }, { rootMargin: '30% 0px' });
        return guet;
    }

    // Prend en charge les scènes d'un morceau de page — tout le document
    // au chargement, le panneau d'un univers à chaque ouverture.
    function observer(zone) {
        const io = guetteur();
        (zone || document).querySelectorAll('.rg-scene, .rg-vue, .rg-ligne').forEach(el => {
            if (suivies.has(el)) return;
            el._rgLigne = el.classList.contains('rg-ligne');
            // La boîte qui défile : le panneau d'un univers défile pour son
            // compte, le reste du site défile avec la page.
            el._rgBoite = el.closest('#show-universe') || null;
            suivies.add(el);
            io.observe(el);
        });
        planifier();
    }

    // Ce qu'un panneau refermé emporte avec lui ne doit plus être suivi.
    function oublier(zone) {
        if (!guet) return;
        for (const el of [...suivies]) {
            if (zone && !zone.contains(el) && el.isConnected) continue;
            guet.unobserve(el);
            suivies.delete(el);
            visibles.delete(el);
        }
    }

    // Le défilement d'une boîte (le panneau) ne remonte pas jusqu'à la
    // fenêtre : on l'écoute en phase de capture, qui voit tout.
    if (!NATIF) {
        document.addEventListener('scroll', planifier, { capture: true, passive: true });
        window.addEventListener('resize', planifier);
    }

    window.Regie = { natif: NATIF, observer, oublier, rafraichir: planifier };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => observer(document));
    else observer(document);
})();
