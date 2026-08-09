/**
 * ============================================================
 *  OUVERTURE DE SCÈNE — masque de théâtre en particules + nom
 * ============================================================
 *  Une fois par session (voir le garde anti-scintillement dans
 *  index.html), avant de révéler le CV :
 *
 *   1. Un masque de théâtre reconstitué en poussière de particules,
 *      en rotation lente, qui réagit localement au curseur/doigt
 *      (les points s'écartent puis reviennent, comme de la poussière
 *      qu'on écarte de la main). La forme vient de mask-points.js —
 *      un nuage de points généré hors-ligne à partir d'un modèle 3D
 *      fourni (voir ce fichier).
 *   2. Un tambour de roulette : les rôles DÉFILENT de haut en bas sur
 *      un axe qui s'enfonce dans l'écran — le suivant se décode déjà,
 *      atténué, loin au-dessus ; celui du centre se laisse lire, net
 *      et de face ; le précédent descend en s'éloignant. En parallèle,
 *      « Adrien Vada » — superposé à la position centrale — apparaît
 *      en fondu et REMPLACE peu à peu les rôles (pas de concaténation
 *      lettre à lettre : juste un fondu enchaîné entre les deux).
 *   3. Un sceau qui se trace mais N'OUVRE PAS le site tout seul :
 *      il faut cliquer dessus (ou sur le rideau, ou une touche).
 *
 *  Aucune librairie : Canvas 2D avec une vraie rotation 3D (matrice
 *  simplifiée) et une projection en perspective sur un nuage de
 *  points fixe — pas de rendu de maillage/texture, juste des points.
 *  Le site reste sous les 170 Ko.
 *
 *  Pour ajuster : les constantes en haut de l'IIFE.
 * ============================================================
 */
(function () {
    'use strict';

    var overlay = document.getElementById('intro-overlay');
    if (!overlay || overlay.hidden) return; // déjà vue cette session / reduced-motion

    var canvas = document.getElementById('intro-canvas');
    var tickerEl = document.getElementById('intro-scramble');
    var nameFadeEl = document.getElementById('intro-name-fade');
    var ctaEl = document.getElementById('intro-cta');
    var sealRing = document.getElementById('intro-seal-ring');
    var sealRingInner = document.getElementById('intro-seal-ring-inner');
    var skipBtn = document.getElementById('intro-skip');
    // LE DÉCOR PEUT MANQUER À L'APPEL, et ça ne doit pas coûter le site.
    // getContext renvoie null quand le contexte 2D n'est pas accordé —
    // mémoire contrainte, contexte déjà pris par une autre API. Sans cette
    // précaution, resize() levait dès la première ligne, start() s'arrêtait
    // là, le garde-fou de sortie n'était jamais posé, et le rideau restait
    // à l'écran POUR TOUJOURS : un visiteur devant un site qui ne s'ouvre
    // pas, à cause d'une poussière décorative. Sans contexte, on se passe
    // simplement du masque ; le texte et le sceau, eux, jouent normalement.
    var ctx = canvas ? canvas.getContext('2d') : null;

    // ── Rôles joués, dans l'ordre d'apparition. Antiochus ouvre au
    //    centre du tambour, Le Juge se décode déjà au-dessus de lui ;
    //    tous deux défilent à un rythme lisible, l'accélération ne
    //    démarrant qu'ensuite, à partir de Steven (3e rôle).
    //
    //    « ADRIEN » EST EN DERNIER, ET CE N'EST PAS UN HASARD. C'est un
    //    rôle joué comme les autres — il était jusqu'ici perdu au milieu
    //    de la liste. Mis au bout, c'est celui sur lequel la roulette
    //    s'arrête : le nom n'est pas une conclusion plaquée par-dessus
    //    les rôles, c'est le rôle qui restait. Le déplacer ailleurs
    //    casserait toute la fin de la séquence.
    //
    //    LE MILIEU DE LA LISTE N'EST PAS FAIT POUR ÊTRE LU, et c'est le but :
    //    on doit arriver au nom sans savoir combien de rôles ont défilé. Ces
    //    rôles-là ne sont donc pas rangés par importance — ils sont la masse
    //    qu'on traverse. Seuls comptent les trois premiers, lisibles, et les
    //    trois derniers, que le freinage rend de nouveau lisibles.
    var ROLES = [
        'ANTIOCHUS', 'LE JUGE',
        'STEVEN', 'SGANARELLE', 'TOUCHSTONE', 'TITUS ANDRONICUS', 'LE PROCUREUR', "L'ACCUSÉ",
        'LE GREFFIER', "L'AVOCAT", 'LE NARRATEUR',
        'ARTHUR', 'INSPECTEUR TOUTOU', 'CYRANO', 'ROBERT', 'PONTAGNAC', 'SMIRNOV',
        'LE PROFESSEUR', 'LE MÉDECIN',
        'LE JEUNE MEC', 'JEREM', 'ADRIEN'
    ];

    // On raisonne en DURÉE CIBLE par mot, pas en vitesse par caractère :
    // sinon « TITUS ANDRONICUS » durerait trois fois plus longtemps que
    // « STEVEN », et le rythme partirait en vrille.
    var OPENING_STEP_MS = 22, OPENING_FRAMES = 3;    // rythme des rôles d'ouverture (lisibles)
    var DECODE_BASE_MS = 300, DECODE_FLOOR_MS = 55;  // temps de résolution d'un mot
    var HOLD_BASE_MS = 260, HOLD_FLOOR_MS = 8;      // temps de lecture une fois résolu
    var FRAMES_BASE = 4, FRAMES_FLOOR = 2;           // images de brouillage par groupe
    var STEP_MS = 20;                                // durée d'une image de brouillage
    var CHURN_BASE_MS = 230, CHURN_FLOOR_MS = 0;    // durée du « mouline » entre deux rôles
    var OPENING_INDEX = 2;                           // rôles décodés lettre à lettre, sans blocs

    // ════════════════════════════════════════════════════════════
    //  LE PROFIL DE VITESSE : UNE COURBE, PAS UNE CASCADE
    // ════════════════════════════════════════════════════════════
    //  Le rythme suivait une décroissance géométrique, puis un freinage
    //  plaqué sur les trois derniers rôles. Deux mécanismes séparés, donc
    //  deux ruptures : ça s'emballait d'un coup au 3e rôle, et ça refreinait
    //  d'un coup à l'avant-dernier. Une roulette, elle, ne fait ni l'un ni
    //  l'autre — elle est lancée, elle file, elle s'épuise.
    //
    //  Un seul geste désormais, sur toute la liste : une cloche en cosinus
    //  surélevé, dont la dérivée est NULLE aux deux extrémités. Le départ
    //  s'amorce donc en douceur au lieu de plonger, et la fin s'éteint en
    //  douceur au lieu de s'arrêter. La contrepartie est voulue : pour tenir
    //  la même durée totale avec des épaules aussi étalées, la vitesse de
    //  pointe du milieu doit être bien plus élevée qu'avant.
    //
    //    PROFIL_POW  — aplatit les épaules et resserre le sommet. Au-dessus
    //                  de 1, le départ et l'arrivée sont plus progressifs, et
    //                  la pointe plus violente.
    //    PROFIL_BIAIS — déplace le sommet. En dessous de 1, il arrive plus
    //                  tôt : l'accélération est courte, la décélération
    //                  longue. C'est ce qui donne au dernier rôle le temps
    //                  de tomber comme une pierre dans du miel.
    //    VITESSE_MAX — le rythme au sommet, en fraction du rythme d'ouverture
    //                  (0,008 = quatre-vingts fois plus rapide, avant que les
    //                  planchers ne s'en mêlent).
    var VITESSE_MAX = 0.003;
    var PROFIL_POW = 2.8;
    var PROFIL_BIAIS = 0.92;

    function accelK(i) {
        var n = ROLES.length - 1;
        if (n <= 0) return 1;
        var p = Math.pow(i / n, PROFIL_BIAIS);
        var cloche = Math.pow(Math.sin(Math.PI * p), PROFIL_POW);
        return Math.pow(VITESSE_MAX, cloche);
    }

    // Comment un mot se décode. Au lieu de raccourcir indéfiniment le temps
    // par caractère (qui bute vite sur la fréquence d'écran), on révèle
    // PLUSIEURS caractères par étape : les rôles rapides se décodent par
    // blocs, plus lettre à lettre. Les deux premiers gardent le décodage
    // lettre à lettre, qui est ce qu'on regarde vraiment au lever de rideau.
    function wordTiming(i, word) {
        if (i < OPENING_INDEX) {
            return { step: OPENING_STEP_MS, frames: OPENING_FRAMES, chunk: 1 };
        }
        var k = accelK(i);
        var decode = Math.max(DECODE_FLOOR_MS, Math.round(DECODE_BASE_MS * k));
        var frames = Math.max(FRAMES_FLOOR, Math.round(FRAMES_BASE * k));
        var letters = Math.max(1, String(word || '').replace(/ /g, '').length);
        var maxSteps = Math.max(1, Math.round(decode / (frames * STEP_MS)));
        var chunk = Math.max(1, Math.ceil(letters / maxSteps));
        return { step: STEP_MS, frames: frames, chunk: chunk };
    }

    // Combien de temps le décodage d'un mot occupe réellement l'écran.
    function decodeDuration(i, word) {
        var t = wordTiming(i, word);
        var letters = Math.max(1, String(word || '').replace(/ /g, '').length);
        return Math.ceil(letters / t.chunk) * t.frames * t.step;
    }

    function churnDuration(i) {
        return Math.max(CHURN_FLOOR_MS, Math.round(CHURN_BASE_MS * accelK(i)));
    }

    // ════════════════════════════════════════════════════════════
    //  LA DURÉE EST UNE CONSIGNE, PAS UNE CONSÉQUENCE
    // ════════════════════════════════════════════════════════════
    //  Jusqu'ici, chaque rôle ajouté à la liste rallongeait l'ouverture, et
    //  il fallait re-régler les constantes à la main jusqu'à retomber sur ses
    //  pieds. C'est l'inverse maintenant : on FIXE la durée du défilé, et
    //  l'on cherche le facteur de rythme qui l'atteint. Le profil de vitesse
    //  décide de la FORME, cette consigne décide de la DURÉE, et les deux ne
    //  se marchent plus dessus. Ajouter dix rôles ne rallonge donc plus rien :
    //  ça densifie.
    //
    //  La recherche se fait par dichotomie et non par une simple règle de
    //  trois, parce que les planchers rendent la somme non proportionnelle au
    //  facteur : en dessous d'un certain rythme, un rôle ne raccourcit plus.
    //  La somme reste en revanche croissante, ce qui suffit à la dichotomie.
    //  Une trentaine d'itérations, une seule fois au chargement.
    var SEQUENCE_CIBLE_MS = 4455;  // du lever de rideau à l'arrêt sur « Adrien »
    var SHIFT_BASE_MS = 380, SHIFT_FLOOR_MS = 38;   // durée d'un cran du tambour
    var LOCK_SHIFT_FACTOR = 3.8;   // le dernier cran : « Adrien » tombe au ralenti

    function shiftAvec(i, facteur) {
        var lock = i === ROLES.length - 1 ? LOCK_SHIFT_FACTOR : 1;
        return Math.max(SHIFT_FLOOR_MS, Math.round(SHIFT_BASE_MS * accelK(i) * lock * facteur));
    }

    function holdAvec(i, facteur) {
        return Math.max(HOLD_FLOOR_MS, Math.round(HOLD_BASE_MS * accelK(i) * facteur));
    }

    // Le déroulé complet : le premier rôle se décode au centre, les suivants
    // arrivent déjà décodés et ne coûtent que leur cran plus leur lecture. Le
    // dernier n'a pas de lecture : c'est le verrouillage qui prend la suite.
    function dureeSequence(facteur) {
        var total = decodeDuration(0, ROLES[0]) + holdAvec(0, facteur);
        for (var i = 1; i < ROLES.length; i++) {
            total += shiftAvec(i, facteur);
            if (i < ROLES.length - 1) total += holdAvec(i, facteur);
        }
        return total;
    }

    var rythme = (function () {
        if (ROLES.length < 2) return 1;
        var bas = 0.01, haut = 20;
        if (dureeSequence(haut) < SEQUENCE_CIBLE_MS) return haut;  // liste trop courte : au plus lent
        for (var n = 0; n < 40; n++) {
            var mid = (bas + haut) / 2;
            if (dureeSequence(mid) < SEQUENCE_CIBLE_MS) bas = mid; else haut = mid;
        }
        return (bas + haut) / 2;
    })();

    function shiftDuration(i) { return shiftAvec(i, rythme); }
    function holdDuration(i) { return holdAvec(i, rythme); }

    var SEAL_DELAY_MS = 200;     // délai avant de dessiner le sceau après le nom final
    var SEAL_DRAW_MS = 850;      // durée du tracé du sceau (doit couvrir les 2 transitions CSS)
    var FADE_MS = 700;           // durée du fondu de sortie (doit matcher le CSS)
    var MAX_INTRO_MS = 20000;    // garde-fou anti-blocage (onglet gelé, erreur…) — pas un rythme normal

    var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÉÈÀÇ';

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ════════════════════════════════════════════════════════════
    //  NUAGE DE PARTICULES — masque de théâtre, rotation, réaction au
    //  pointeur. Chaque particule est ancrée près d'un point fixe de la
    //  surface du masque (pas de dérive libre) : c'est ce qui donne une
    //  forme reconnaissable plutôt qu'un nuage de poussière random.
    //  Les points viennent de mask-points.js (voir ce fichier : généré
    //  hors-ligne à partir d'un modèle 3D fourni, à ne pas éditer à la main).
    // ════════════════════════════════════════════════════════════
    var particles = [];
    var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var pointer = { x: -9999, y: -9999, nx: 0, active: false };
    var rafId = null;
    var running = false;
    // Turbulence : 0 → 1, suit l'accélération du défilé de rôles. Elle ne
    // touche PLUS à l'échelle du masque (c'était la source du zoom/dézoom) :
    // elle ne fait plus que RESSERRER la poussière autour de la surface du
    // masque. Plus le défilé des rôles s'emballe, plus les particules se
    // rassemblent et plus la forme devient nette ; à l'apparition d'« Adrien
    // Vada », la consigne retombe à 0 et la poussière s'éparpille de nouveau.
    // La valeur consigne saute d'un rôle à l'autre : on ne l'applique jamais
    // telle quelle mais via une valeur lissée image par image.
    var turbulenceTarget = 0;
    var turbulence = 0;
    var shapeBirth = null;   // timestamp d'apparition du masque (effet de matérialisation)
    var rotYNudge = 0;       // rotation additionnelle, lissée, suivant le pointeur

    // MASK_POINTS (mask-points.js) est un tableau plat [x,y,z, x,y,z, …] ;
    // on le regroupe une fois en triplets.
    var maskPoints = [];
    if (typeof MASK_POINTS !== 'undefined') {
        for (var mp = 0; mp < MASK_POINTS.length; mp += 3) {
            maskPoints.push([MASK_POINTS[mp], MASK_POINTS[mp + 1], MASK_POINTS[mp + 2]]);
        }
    }

    function particleCount() {
        // Le masque occupant tout l'écran, il lui faut beaucoup de points pour
        // rester lisible : agrandir la forme dilue la densité par unité de
        // surface. On garde un plancher élevé même sur mobile plutôt que
        // d'économiser — quelques milliers d'estampilles restent peu
        // coûteuses en Canvas 2D.
        //
        // CE NOMBRE EST UN POINT DE DÉPART, PAS UNE DÉCISION. C'est
        // l'auto-régulation qui tranche, en mesurant (voir loop) : sur une
        // machine à l'aise le nuage reste entier, sur un téléphone qui peine
        // il maigrit jusqu'à ce que l'animation tienne. Une valeur écrite ici
        // ne saurait valoir pour les deux.
        //
        // LE PLAFOND DU NUAGE NE S'APPLIQUE PLUS. mask-points.js n'a que
        // 3 201 points de surface, et c'était la limite. Or chaque particule
        // s'écarte déjà de son point d'ancrage d'un hasard qui lui est propre
        // (voir makeParticle) : deux particules nées du même point ne se
        // superposent pas, elles forment une petite grappe autour de lui. On
        // peut donc repasser sur le nuage autant de fois qu'on veut — la
        // silhouette ne bouge pas d'un pixel, seule la densité monte. La
        // porte reste ouverte si un jour la lisibilité redemande du nombre.
        var area = window.innerWidth * window.innerHeight;
        return Math.max(1800, Math.min(3200, Math.round(area / 320)));
    }

    function resize() {
        if (!ctx) return false;   // pas de décor : il n'y a rien à dimensionner
        // window.innerWidth/Height peuvent être à 0 lors d'un tout premier
        // appel synchrone (webview pas encore mise en page) : on retombe
        // alors sur les dimensions du <canvas> déjà posées par le CSS.
        W = window.innerWidth || document.documentElement.clientWidth || canvas.clientWidth || 0;
        H = window.innerHeight || document.documentElement.clientHeight || canvas.clientHeight || 0;
        if (!W || !H) return false;
        canvas.width = W * DPR;
        canvas.height = H * DPR;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        // La nappe de lumière : le canevas au huitième. Elle se refait avec
        // lui — un canevas redimensionné perd tout son contenu, et une
        // nappe restée à l'ancienne taille serait étirée de travers.
        if (!nappe) {
            nappe = document.createElement('canvas');
            nappeCtx = nappe.getContext('2d');
        }
        nappe.width = Math.max(1, Math.round(canvas.width / NAPPE_DIV));
        nappe.height = Math.max(1, Math.round(canvas.height / NAPPE_DIV));
        return true;
    }

    // Mélange de Fisher-Yates : détermine quels points du masque sont
    // utilisés (et dans quel ordre, sans conséquence visuelle) à chaque
    // ouverture — variation discrète d'une session à l'autre.
    function shuffledIndices(n) {
        var arr = new Array(n);
        for (var i = 0; i < n; i++) arr[i] = i;
        for (var j = n - 1; j > 0; j--) {
            var k = Math.floor(Math.random() * (j + 1));
            var tmp = arr[j]; arr[j] = arr[k]; arr[k] = tmp;
        }
        return arr;
    }

    function makeParticle(srcIndex) {
        var base = maskPoints[srcIndex];
        // Dispersion fine autour du point de surface — d'où l'épaisseur
        // "duveteuse" façon poussière plutôt qu'une coque parfaitement lisse.
        // Le point d'ancrage (bx,by,bz) et l'écart (jx,jy,jz) sont gardés
        // SÉPARÉS : c'est ce qui permet de resserrer puis de relâcher la
        // poussière au fil de la séquence (voir `spread` dans stepAndDraw)
        // sans jamais toucher à l'échelle du masque.
        var jitter = 0.015 + Math.random() * 0.045;
        var ja = Math.random() * Math.PI * 2, jb = Math.random() * Math.PI * 2;
        return {
            bx: base[0], by: base[1], bz: base[2],
            jx: Math.cos(ja) * Math.sin(jb) * jitter,
            jy: Math.sin(ja) * Math.sin(jb) * jitter,
            jz: Math.cos(jb) * jitter,
            r: 0.55 + Math.random() * 1.5,
            twinklePhase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.5 + Math.random() * 1.2,
            offX: 0, offY: 0,   // déplacement ressort (réaction au pointeur)
            energy: 0            // 0→1, "étincelle" quand le pointeur passe à proximité
        };
    }

    function initParticles() {
        var n = particleCount();
        particles = [];
        if (maskPoints.length) {
            // On repasse sur le nuage en boucle quand il en faut plus que de
            // points : le mélange garantit qu'un deuxième tour ne redouble
            // pas les points dans l'ordre où ils ont été tirés au premier.
            var order = shuffledIndices(maskPoints.length);
            for (var i = 0; i < n; i++) particles.push(makeParticle(order[i % order.length]));
        }
        // On repart du nuage entier : c'est à l'auto-régulation de dire, en
        // mesurant, ce que cette machine peut tenir.
        dessines = particles.length;
        coutLisse = 0;
        shapeBirth = performance.now();
    }

    // Matérialisation avec un léger rebond (easeOutBack), puis rotation
    // lente continue et wobble doux.
    //
    // Il n'y a PLUS de « respiration » (contraction puis retour) au moment où
    // le nom se résout : cette impulsion était symétrique — le masque
    // reculait de 20 % puis revenait — ce qui se lisait comme un zoom/dézoom
    // parasite, en contradiction directe avec le travelling avant qui, lui,
    // ne recule jamais. Rien ne la remplace : l'arrivée du nom se joue
    // uniquement sur le texte et le sceau, l'échelle du masque ne bouge plus
    // que par l'avancée continue de la caméra.
    function shapeScaleEnvelope(nowMs) {
        var scale = 1;
        if (shapeBirth !== null) {
            var e = Math.min(1, (nowMs - shapeBirth) / 550);
            var c1 = 1.28, c3 = c1 + 1;
            var eb = 1 + c3 * Math.pow(e - 1, 3) + c1 * Math.pow(e - 1, 2);
            scale *= Math.max(0, eb);
        }
        if (isDismissed) {
            var fe = Math.min(1, (nowMs - dismissedAt) / FADE_MS);
            scale *= Math.max(0, 1 - fe);
        }
        return scale;
    }

    // ── TRAVELLING AVANT ─────────────────────────────────────────
    // Très lent, presque imperceptible image par image, mais nettement
    // sensible sur la durée : la caméra avance vers le masque. On ne se
    // contente pas d'agrandir la forme (ce serait un zoom, plat) — on
    // RACCOURCIT aussi la focale, ce qui accentue la perspective : les
    // reliefs proches (front, nez, pommettes) s'écartent plus vite que le
    // reste, exactement comme quand on entre dans le masque.
    var DOLLY_MS = 16000;        // course complète du travelling
    var FOCAL_START = 2.6, FOCAL_END = 2.15;
    var DOLLY_SCALE_GAIN = 0.12; // +12 % d'échelle en fin de course

    // Resserrement maximal de la poussière (fraction de l'écart au repos)
    // atteint juste avant l'apparition du nom. Plus bas = coque plus nette,
    // donc éparpillement plus spectaculaire quand « Adrien Vada » arrive.
    var SPREAD_TIGHT = 0.2;

    // ══════════════════════════════════════════════════════════════
    //  LA LISIBILITÉ VIENT DE LA LUMIÈRE — ET ELLE NE DOIT RIEN COÛTER
    // ══════════════════════════════════════════════════════════════
    //  Le masque ne se lisait pas : des grains de 1,4 px de rayon pour 12 px
    //  d'écart couvrent MOINS DE 5 % DE LA SURFACE. On ne voyait que le
    //  contour — un nuage projeté s'entasse toujours sur sa silhouette — et
    //  l'intérieur du visage restait vide.
    //
    //  DEUX FAUSSES PISTES, SUCCESSIVEMENT ÉCARTÉES.
    //  Grossir le grain : ça marche, et à trois pixels de diamètre un grain
    //  n'est plus une poussière mais un DISQUE — l'œil voit des confettis.
    //  Poser un halo sur chaque grain et doubler leur nombre : c'était joli,
    //  et deux fois plus cher.
    //
    //  CE QUI COÛTE VRAIMENT, MESURÉ. Ni les pixels peints, ni le fondu, ni
    //  la résolution : 6 400 points NUS de 1 px coûtent 4,3 ms quand 6 400
    //  grains avec halo en coûtent 3,9. Ce qui coûte, c'est le NOMBRE
    //  D'APPELS — un `fillStyle` et un dessin par grain, ~0,55 µs pièce,
    //  quelle que soit la taille. Réduire les halos ne gagnait rien ; diviser
    //  la résolution par deux non plus. Toute la facture est là.
    //
    //  D'OÙ LE PARTI PRIS ACTUEL, en trois temps :
    //
    //  1. LES GRAINS SONT GROUPÉS PAR COULEUR. Teinte et opacité sont
    //     arrondies à une palette de quelques dizaines de cases ; on remplit
    //     les cases, puis on dessine case par case. Un `fillStyle` par case
    //     au lieu d'un par grain : 64 changements d'état par image au lieu de
    //     6 400. Mesuré : 3,9 ms → 1,0 ms. L'ordre de dessin change, et c'est
    //     sans conséquence — sous `lighter` l'addition est commutative.
    //
    //  2. LA LUEUR EST UNE NAPPE, PAS 6 400 HALOS. On dessine les points
    //     nets, on réduit le canevas sur lui-même au huitième, on le réétire
    //     par-dessus en `lighter` : l'agrandissement bilinéaire du navigateur
    //     EST le flou, et il est gratuit. La lumière monte exactement là où
    //     les grains se pressent — la silhouette, l'arête du nez, le bord des
    //     orbites — et le coût ne dépend plus du nombre de grains :
    //     deux opérations d'image, +0,3 ms.
    //
    //  3. LE NUAGE SE REDESSINE UNE IMAGE SUR DEUX. Une poussière dérive
    //     lentement : à 30 images par seconde personne ne le voit, et c'est
    //     la moitié du travail. Le texte, lui, garde ses 60.
    //
    //  Total mesuré : 1,3 ms par image — moitié moins que la version d'avant
    //  tout ce chantier, avec la forme en plus. Et si une machine peine
    //  malgré tout, l'auto-régulation (voir plus bas) retire des grains
    //  jusqu'à ce que ça tienne.
    var DUST_GAIN = 1.0;

    //  Le rayon vise une COUVERTURE CONSTANTE plutôt qu'une taille fixe :
    //  r ∝ échelle / √nombre. Sans cela le téléphone serait sur-encré —
    //  il affiche un masque bien plus petit avec à peine moins de points.
    var GRAIN_REF = 328 / Math.sqrt(3200);

    // ── LA PALETTE ───────────────────────────────────────────────────
    //  4 teintes (doré profond → blanc chaud, qui disent la profondeur)
    //  × 16 paliers d'opacité. Assez fin pour que l'arrondi ne se voie pas
    //  sur des grains d'un pixel semés au hasard, assez grossier pour que
    //  le nombre de changements d'état devienne négligeable.
    var TEINTES = 4, PALIERS = 16;
    var CASES = TEINTES * PALIERS;
    //  Chaque case garde ses grains en attente : x, y, taille. Au-delà, on
    //  la vide en cours de route — la borne est là pour que la mémoire soit
    //  connue d'avance, pas pour limiter quoi que ce soit.
    var CASE_MAX = 768;
    var caseStyle = null, caseBuf = null, caseN = null;

    function buildPalette() {
        caseStyle = new Array(CASES);
        caseBuf = new Array(CASES);
        caseN = new Int32Array(CASES);
        for (var t = 0; t < TEINTES; t++) {
            var k = t / (TEINTES - 1);
            var r = Math.round(191 + (255 - 191) * k);
            var g = Math.round(169 + (248 - 169) * k);
            var b = Math.round(138 + (222 - 138) * k);
            for (var a = 0; a < PALIERS; a++) {
                var i = t * PALIERS + a;
                // Le centre du palier, pas son bord : l'arrondi ne biaise
                // alors ni vers le clair ni vers le sombre.
                caseStyle[i] = 'rgba(' + r + ',' + g + ',' + b + ','
                    + ((a + 0.5) / PALIERS).toFixed(3) + ')';
                caseBuf[i] = new Float32Array(CASE_MAX * 3);
            }
        }
    }

    function videCase(i) {
        var n = caseN[i];
        if (!n) return;
        var buf = caseBuf[i];
        ctx.fillStyle = caseStyle[i];
        for (var j = 0; j < n; j++) {
            var o = j * 3;
            ctx.fillRect(buf[o], buf[o + 1], buf[o + 2], buf[o + 2]);
        }
        caseN[i] = 0;
    }

    // ── LA NAPPE DE LUMIÈRE ──────────────────────────────────────────
    //  Le canevas réduit au huitième, puis réétiré par-dessus. Un huitième
    //  parce que c'est le point où la nappe cesse de dessiner les grains un
    //  à un pour ne plus donner que leur densité — ce qu'on veut.
    //  Au huitième, l'agrandissement bilinéaire laissait voir ses blocs :
    //  chaque pixel de la nappe devenait un carré de 8, et la lueur se
    //  lisait en damier. Au quart, la nappe reste seize fois moins chère
    //  qu'une image pleine et le damier disparaît.
    var NAPPE_DIV = 4;
    var NAPPE_FORCE = 0.85;   // opacité de la nappe reposée sur les points
    var nappe = null, nappeCtx = null;

    // ── L'AUTO-RÉGULATION ────────────────────────────────────────────
    //  Aucune mesure faite sur cette machine ne dit ce que vaudra un
    //  téléphone de cinq ans. Plutôt que de deviner, on chronomètre le
    //  dessin et on retire des grains jusqu'à tenir le budget — puis on en
    //  remet quand la marge revient. Le nuage étant tiré au hasard, en
    //  dessiner les N premiers en donne un sous-ensemble uniforme : la
    //  silhouette maigrit, elle ne se déforme pas.
    var BUDGET_MS = 5;        // part d'une image réservée à la poussière
    var dessines = 0;         // grains effectivement dessinés
    var coutLisse = 0;        // durée du dessin, lissée

    function dollyProgress(nowMs) {
        if (shapeBirth === null) return 0;
        var t = Math.min(1, Math.max(0, (nowMs - shapeBirth) / DOLLY_MS));
        // Démarrage en douceur (le masque finit de se matérialiser), puis
        // avancée régulière : pas de coup d'accélérateur perceptible.
        return t * t * (3 - 2 * t);
    }

    function stepAndDraw(now, dt, tSec) {
        // Le masque OSCILLE autour de la position de face, il ne tourne pas
        // sur lui-même : un visage ne se reconnaît que de face ou presque.
        // Une rotation continue (l'ancien `tSec * 0.16`) le rendait illisible
        // dès qu'il dépassait ~25° — c'était la cause principale du problème,
        // bien avant le nombre de points.
        var rotY = Math.sin(tSec * 0.27) * 0.20 + rotYNudge;   // ±11° d'oscillation
        var rotX = Math.sin(tSec * 0.19) * 0.09;               // ±5° de tangage
        var targetNudge = pointer.active ? pointer.nx * 0.16 : 0; // ±9° au pointeur
        rotYNudge += (targetNudge - rotYNudge) * Math.min(1, dt * 2.2);
        turbulence += (turbulenceTarget - turbulence) * Math.min(1, dt * 1.6);

        var cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        var cosX = Math.cos(rotX), sinX = Math.sin(rotX);
        var scaleEnv = shapeScaleEnvelope(now);
        // Le masque s'étend de y=-1.5 à +1.5 et de x=-1.17 à +1.17 : nettement
        // plus haut que large. On le dimensionne au plus grand possible en le
        // contraignant sur les DEUX axes — se caler sur la seule hauteur le
        // faisait déborder à 200 % de largeur en écran portrait. Les facteurs
        // dépassent volontairement le strict ajustement : il déborde un peu du
        // cadre, ce qui donne le sentiment d'être face à lui plutôt que de le
        // regarder de loin.
        // EN PORTRAIT, L'ÉCHELLE BAISSE — ET LE MASQUE REMONTE. Le cadrage
        // débordant du grand écran y poussait les yeux, le signal le plus
        // fort d'un visage, exactement sous le nom et le sceau empilés au
        // centre : réduire seul ne suffisait pas, les yeux convergeaient
        // encore vers le centre. Plus petit, le visage tient en entier ;
        // plus haut, ses yeux passent au-dessus du nom et restent visibles.
        var portrait = W < H && W < 768;
        var byHeight = H * (portrait ? 0.34 : 0.40);
        var byWidth = W * (portrait ? 0.42 : 0.48);
        var dolly = dollyProgress(now);
        var shapeScale = Math.min(byHeight, byWidth) * scaleEnv * (1 + dolly * DOLLY_SCALE_GAIN);
        // Resserrement de la poussière : 1 = dispersion pleine (état de repos),
        // SPREAD_TIGHT = au plus serré, en fin de défilé des rôles.
        var spread = 1 - turbulence * (1 - SPREAD_TIGHT);
        var focal = FOCAL_START + (FOCAL_END - FOCAL_START) * dolly;
        var cx = W / 2, cy = H * (portrait ? 0.42 : 0.5);
        // Calculé une fois par image, pas une fois par grain.
        var grain = (shapeScale / Math.sqrt(particles.length || 1)) / GRAIN_REF;
        var springBack = Math.min(1, dt * 4.2);
        var energyDecay = Math.pow(0.9, dt * 60);

        ctx.clearRect(0, 0, W, H);
        if (!caseStyle) buildPalette();
        // Les lueurs s'ajoutent au lieu de se recouvrir : c'est de là que
        // vient la lisibilité de la forme (voir DUST_GAIN plus haut). C'est
        // aussi ce qui autorise à dessiner les grains dans le désordre,
        // groupés par couleur : une addition ne dépend pas de l'ordre.
        ctx.globalCompositeOperation = 'lighter';

        // Combien de grains cette machine peut tenir — ajusté image après
        // image par l'auto-régulation, jamais deviné.
        if (!dessines) dessines = particles.length;
        var vus = dessines < particles.length ? dessines : particles.length;

        for (var i = 0; i < vus; i++) {
            var p = particles[i];

            // Position locale = ancrage sur la surface + écart de poussière,
            // ce dernier dosé par le resserrement en cours.
            var lx = p.bx + p.jx * spread;
            var ly = p.by + p.jy * spread;
            var lz = p.bz + p.jz * spread;

            // Rotation 3D (Y puis X) autour du centre du ruban
            var x1 = lx * cosY - lz * sinY;
            var z1 = lx * sinY + lz * cosY;
            var y1 = ly * cosX - z1 * sinX;
            var z2 = ly * sinX + z1 * cosX;

            var persp = focal / (focal - z2);
            var sx = cx + x1 * shapeScale * persp;
            var sy = cy + y1 * shapeScale * persp;

            // Réaction au pointeur : à peine un frémissement — une caresse,
            // pas un souffle. Les particules proches s'illuminent doucement
            // et s'écartent à peine, puis reviennent sans à-coup.
            if (pointer.active) {
                var dx = sx - pointer.x, dy = sy - pointer.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var influence = 90;
                if (dist < influence) {
                    var f = 1 - dist / influence;
                    p.energy = Math.min(1, p.energy + f * 0.12);
                    var push = f * f * 5 * dt * 60;
                    var inv = 1 / (dist || 1);
                    p.offX += dx * inv * push;
                    p.offY += dy * inv * push;
                }
            }
            p.offX -= p.offX * springBack;
            p.offY -= p.offY * springBack;
            p.energy *= energyDecay;

            // La profondeur (luminosité/taille des points) reste calibrée sur
            // la focale de départ : sinon le travelling écraserait le contraste
            // entre l'avant et l'arrière du masque au fur et à mesure qu'on
            // s'approche, et la forme se délaverait.
            var perspRef = FOCAL_START / (FOCAL_START - z2);
            var depth = Math.max(0, Math.min(1, (perspRef - 0.62) / 1.35));

            // LA PROFONDEUR EST CREUSÉE, au carré. En proportion directe,
            // l'arrière du masque restait presque aussi clair que l'avant :
            // on lisait une coque, pas un visage. Élevée au carré, la
            // courbe éteint le fond du crâne et garde la lumière pour ce
            // qui vient vers nous — le front, le nez, les pommettes.
            var prof = depth * depth;

            // Scintillement resserré : à chaque instant une part des grains
            // s'éteignait, ce qui hachait la forme et coûtait de la lumière
            // pour rien. Il en reste ce qu'il faut pour que ça respire.
            var twinkle = 0.92 + 0.08 * Math.sin(tSec * p.twinkleSpeed + p.twinklePhase);
            var glow = Math.min(1, prof + p.energy * 0.7);

            // L'opacité reste modeste : ce sont les recouvrements et la
            // nappe qui font la lumière, et un grain trop opaque ferait
            // blanchir la silhouette avant que l'intérieur n'apparaisse.
            var alpha = (0.17 + prof * 0.95) * twinkle + p.energy * 0.5;
            if (alpha > 1) alpha = 1;

            // `p.r` était tiré au sort à la naissance de chaque particule et
            // n'avait jamais servi : il entre ici. Des grains fins et des
            // flocons plus larges dans la même poussière — c'est cette
            // inégalité qui la rend vivante plutôt que tramée.
            var radius = (0.75 + depth * 1.35) * DUST_GAIN * p.r * grain
                * (1 + p.energy * 0.8);

            // Le grain rejoint sa case de couleur au lieu d'être dessiné
            // tout de suite : un `fillStyle` par case, et non par grain.
            var t = (glow * TEINTES) | 0; if (t >= TEINTES) t = TEINTES - 1;
            var a = (alpha * PALIERS) | 0; if (a >= PALIERS) a = PALIERS - 1;
            var ci = t * PALIERS + a;
            // LE CÔTÉ RESTE SOUS LES DEUX PIXELS ET DEMI. Un grain n'est plus
            // un disque tracé au compas mais un carré — c'est ce qui permet
            // de le poser sans changer d'état. À un ou deux pixels l'œil ne
            // fait pas la différence avec un rond ; à quatre il voit des
            // briques. Le halo perdu est rendu par la nappe, pas par la
            // taille. Les coordonnées restent fractionnaires : le lissage du
            // navigateur adoucit les bords, et c'est ce qu'on veut.
            var cote = radius < 0.9 ? 0.9 : (radius > 2.4 ? 2.4 : radius);
            var n = caseN[ci], buf = caseBuf[ci], o = n * 3;
            buf[o] = sx + p.offX - cote * 0.5;
            buf[o + 1] = sy + p.offY - cote * 0.5;
            buf[o + 2] = cote;
            if (++caseN[ci] >= CASE_MAX) videCase(ci);
        }

        for (var c = 0; c < CASES; c++) videCase(c);

        // LA NAPPE. Le canevas réduit au huitième — les grains y fondent en
        // densité — puis réétiré par-dessus : l'agrandissement bilinéaire
        // fait le flou, et il ne coûte que deux opérations d'image, quel que
        // soit le nombre de grains.
        if (nappe) {
            nappeCtx.globalCompositeOperation = 'copy';
            nappeCtx.drawImage(canvas, 0, 0, nappe.width, nappe.height);
            ctx.globalAlpha = NAPPE_FORCE;
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(nappe, 0, 0, W, H);
            ctx.globalAlpha = 1;
        }

        ctx.globalCompositeOperation = 'source-over';
    }

    var lastT = null;
    // Une poussière dérive lentement : 30 images par seconde lui suffisent,
    // et c'est la moitié du travail. On ne compte pas les images — on
    // regarde le temps écoulé, ce qui donne le même rythme sur un écran à
    // 60 Hz comme à 120, et laisse le texte tourner à la vitesse de l'écran.
    var DUST_MIN_DT = 1 / 34;
    function loop(now) {
        if (!running) return;
        rafId = requestAnimationFrame(loop);
        if (lastT === null) lastT = now;
        var dt = (now - lastT) / 1000;
        if (dt < DUST_MIN_DT) return;   // l'image précédente reste à l'écran
        lastT = now;

        var t0 = performance.now();
        stepAndDraw(now, dt > 0.05 ? 0.05 : dt, now / 1000);

        // AUTO-RÉGULATION. On chronomètre le dessin et on ajuste le nombre
        // de grains pour tenir le budget. La mesure est lissée : une image
        // longue arrive pour cent raisons qui ne nous regardent pas (le
        // ramasse-miettes, un autre onglet), et il ne faut pas que le nuage
        // maigrisse à chaque hoquet. Les corrections sont lentes et
        // asymétriques — on retire vite, on remet doucement.
        var cout = performance.now() - t0;
        coutLisse += (cout - coutLisse) * 0.12;
        var plancher = particles.length < 900 ? particles.length : 900;
        if (coutLisse > BUDGET_MS && dessines > plancher) {
            dessines = Math.max(plancher, (dessines * 0.94) | 0);
        } else if (coutLisse < BUDGET_MS * 0.6 && dessines < particles.length) {
            dessines = Math.min(particles.length, (dessines * 1.02 | 0) + 12);
        }
    }

    function startParticleLoop() {
        if (running || !ctx) return;
        running = true;
        lastT = null;
        rafId = requestAnimationFrame(loop);
    }

    function stopParticleLoop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
    }

    // Pause quand l'onglet est masqué (batterie / propreté)
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            stopParticleLoop();
        } else if (overlay && !overlay.hidden && !overlay.classList.contains('intro-out')) {
            lastT = null;
            // Le canevas a pu être dimensionné à 0 pendant que l'onglet était
            // caché : on le remesure avant de relancer la boucle.
            if (!particles.length) startParticlesWhenReady(0);
            else { resize(); startParticleLoop(); }
        }
    });

    function updatePointer(x, y) {
        pointer.x = x;
        pointer.y = y;
        pointer.nx = (x / (W || 1) - 0.5) * 2; // -1 (gauche) → 1 (droite)
        pointer.active = true;
    }
    canvas.addEventListener('pointermove', function (e) { updatePointer(e.clientX, e.clientY); }, { passive: true });
    canvas.addEventListener('pointerleave', function () { pointer.active = false; }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches[0]) updatePointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('resize', resize);

    // ════════════════════════════════════════════════════════════
    //  TEXTE : UN TAMBOUR DE ROULETTE
    // ════════════════════════════════════════════════════════════
    //  Les rôles ne se remplacent plus sur place : ils DÉFILENT, comme
    //  les symboles d'une machine à sous, sur un axe qui s'enfonce dans
    //  l'écran. Quatre positions visibles :
    //
    //    haut   — atténué, plus petit, loin dans la profondeur : le rôle
    //             SUIVANT s'y décode déjà, à l'avance ;
    //    centre — net, de face, pleine taille : le rôle en cours. C'est
    //             aussi, exactement, la place d'« Adrien Vada » ;
    //    bas1   — le rôle qu'on vient de quitter. Il descend et s'atténue
    //             mais NE S'ÉTEINT PAS : on le lit encore, en retrait,
    //             tout le temps que son successeur tient le centre ;
    //    bas2   — un cran plus tard seulement, il repart dans la
    //             profondeur et disparaît pour de bon.
    //
    //  C'est ce QUATRIÈME temps qui donne au tambour son épaisseur : à
    //  l'instant où Le Juge prend le centre, Antiochus est encore là,
    //  en dessous, à demi éteint ; il ne s'efface qu'à l'arrivée de
    //  Steven. On voit donc toujours d'où l'on vient et où l'on va.
    //
    //  À chaque cran tout descend d'un rang : le centre part vers le bas,
    //  le haut prend le centre (déjà décodé, donc lisible dès son
    //  arrivée), et le rôle d'après apparaît en haut pour s'y décoder à
    //  son tour. Une CINQUIÈME cellule tourne dans le lot sans jamais
    //  être vue : c'est celle qui remonte du bas vers le haut, ce qu'on
    //  fait pendant qu'elle est à opacité nulle pour que le saut passe
    //  inaperçu.
    //
    //  Le tambour porte l'accélération existante (accelK) : plus le
    //  défilé s'emballe, plus le cran est bref — et la roulette finit par
    //  tourner trop vite pour qu'on lise, ce qui est le but.
    // ════════════════════════════════════════════════════════════
    var reelEl = tickerEl;   // #intro-scramble : le tambour lui-même
    var cells = [].slice.call(reelEl.querySelectorAll('.intro-cell'));
    var seqTimer = null;     // minuteur du défilé (les crans)

    // La durée d'un cran (shiftDuration) et le temps de lecture d'un rôle
    // (holdDuration) sont définis plus haut, avec le profil de vitesse et la
    // consigne de durée : c'est là que se règle tout le tempo.

    // Les cinq places du tambour. `y` est en em (donc solidaire de la
    // taille du texte, qui varie avec l'écran) ; `z` en pixels, lu à
    // travers la perspective de 900 px posée en CSS — c'est lui qui donne
    // le rétrécissement, sans qu'aucune échelle ne soit écrite à la main.
    //  Les `y` paraissent généreux : ils sont mesurés AVANT la perspective,
    //  qui les rabote ensuite (× 0,75 en haut, × 0,59 puis × 0,5 en bas). À
    //  l'écran, les crans se tiennent à un peu plus d'une hauteur de ligne
    //  l'un de l'autre.
    //  `fade` raccourcit la seule opacité par rapport au reste du mouvement :
    //  le rôle arrivé au fond est ÉTEINT avant d'avoir fini sa course. C'est ce
    //  qui rend sa remontée en coulisse invisible même si le navigateur saute
    //  une image ou deux — sans quoi on le verrait réapparaître en haut, encore
    //  lumineux, par-dessus le rôle qui s'y décode.
    var SLOTS = {
        haut: { y: -1.8, z: -300, opacity: 0.42, blur: 0.6 },
        centre: { y: 0, z: 0, opacity: 1, blur: 0 },
        // Premier temps de la sortie : en retrait, mais toujours lisible.
        bas1: { y: 2.2, z: -620, opacity: 0.32, blur: 1.4 },
        // Second temps, un cran plus tard : la profondeur l'avale.
        bas2: { y: 4.3, z: -900, opacity: 0, blur: 3, fade: 0.68 },
        // « Coulisse » : la place du haut, mais invisible. Une cellule y
        // remonte du fond sans être vue, puis n'a plus qu'à s'y allumer.
        coulisse: { y: -1.8, z: -300, opacity: 0, blur: 0.6 }
    };

    // Le chemin d'une cellule, dans l'ordre :
    //   coulisse → haut → centre → bas1 → bas2 → coulisse → …
    // ring[i] occupe SLOT_ORDER[i] ; un cran est une simple rotation à
    // gauche du tableau, qui reproduit exactement ce chemin.
    var SLOT_ORDER = ['centre', 'haut', 'coulisse', 'bas2', 'bas1'];
    var ring = cells.slice(0, SLOT_ORDER.length);

    function placeCell(cell, slot, durationMs) {
        var s = SLOTS[slot];
        var d = durationMs || 0;
        // `calc()` veut un opérateur et une valeur, jamais deux signes qui se
        // suivent : on écrit « - 1.8em » et non « + -1.8em », que tous les
        // navigateurs n'acceptent pas.
        var dy = s.y < 0 ? ' - ' + (-s.y) + 'em' : ' + ' + s.y + 'em';
        // Trois durées, dans l'ordre des propriétés déclarées en CSS :
        // transform, opacity, filter.
        cell.style.transitionDuration = d + 'ms, ' + Math.round(d * (s.fade || 1)) + 'ms, ' + d + 'ms';
        cell.style.transform = 'translate3d(0, calc(-50%' + dy + '), ' + s.z + 'px)';
        cell.style.opacity = s.opacity;
        cell.style.filter = s.blur ? 'blur(' + s.blur + 'px)' : 'none';
    }

    function placeRing(durationMs) {
        for (var i = 0; i < ring.length; i++) placeCell(ring[i], SLOT_ORDER[i], durationMs);
    }

    // Un cran. La cellule du fond (éteinte depuis un moment, cf. `fade`) est
    // TÉLÉPORTÉE en coulisse avant la rotation.
    //
    // La lecture de getComputedStyle entre les deux est indispensable : elle
    // force le navigateur à recalculer les styles, donc à prendre acte de la
    // téléportation. Sans elle il ne verrait que l'état final du tour et
    // animerait un remontage bien visible. (Lire offsetWidth ne suffirait
    // pas : transform et opacity ne salissent pas la mise en page, le
    // navigateur est donc libre de rendre une valeur déjà calculée sans
    // rien recalculer.)
    function shiftReel(durationMs) {
        var remonte = ring[3];   // celle qui est au fond (bas2)
        placeCell(remonte, 'coulisse', 0);
        void window.getComputedStyle(remonte).opacity;
        ring = ring.slice(1).concat(ring[0]);
        placeRing(durationMs);
    }

    function renderCell(cell, target, revealCount) {
        var html = '';
        for (var i = 0; i < target.length; i++) {
            var ch = target[i];
            if (ch === ' ') { html += ' '; continue; }
            var settled = i < revealCount;
            var displayCh = settled ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
            html += '<span class="ch' + (settled ? '' : ' ch-dim') + '">' + displayCh + '</span>';
        }
        cell.innerHTML = html || '&nbsp;';
    }

    // Décode un mot caractère par caractère (façon "cyber-reveal") DANS une
    // cellule donnée, puis appelle onDone. Chaque cellule porte son propre
    // minuteur : le haut se décode pendant que le centre se laisse lire.
    function decodeCell(cell, target, timing, onDone) {
        var revealCount = 0, frameInChar = 0;
        var chunk = timing.chunk || 1;

        function skipSpaces() {
            while (revealCount < target.length && target[revealCount] === ' ') revealCount++;
        }
        skipSpaces();

        function tick() {
            if (isDismissed) return;
            if (revealCount >= target.length) {
                renderCell(cell, target, target.length);
                onDone && onDone();
                return;
            }
            renderCell(cell, target, revealCount);
            frameInChar++;
            if (frameInChar >= timing.frames) {
                revealCount += chunk;
                frameInChar = 0;
                skipSpaces();
            }
            cell.introTimer = setTimeout(tick, timing.step);
        }
        tick();
    }

    // « Ça mouline » : un bref brouillage sans mot lisible, le temps que le
    // rôle suivant se présente en haut du tambour.
    function churnCell(cell, noiseLen, durationMs, onDone) {
        if (durationMs <= 0) { onDone(); return; }
        var elapsed = 0, stepMs = 24;
        var placeholder = new Array(Math.max(1, noiseLen) + 1).join('X');
        function tick() {
            if (isDismissed) return;
            renderCell(cell, placeholder, 0);
            elapsed += stepMs;
            if (elapsed >= durationMs) { onDone(); return; }
            cell.introTimer = setTimeout(tick, stepMs);
        }
        tick();
    }

    // Charge le rôle `i` dans la cellule du haut et l'y décode. Passé le
    // dernier rôle, le haut reste vide : le tambour se vide par le bas.
    function armTopCell(i) {
        var cell = ring[1];
        clearTimeout(cell.introTimer);
        if (i >= ROLES.length) { cell.innerHTML = '&nbsp;'; return; }
        var role = ROLES[i];
        var timing = wordTiming(i, role);
        // Deux rôles se décodent d'emblée, sans « ça mouline » préalable.
        // Le premier du haut (« Le Juge ») : au lever de rideau, personne
        // n'attend. Et le dernier (« Adrien ») : le freinage ne lui laisse
        // pas assez de temps pour brouiller PUIS se résoudre, et il doit
        // être entièrement formé quand il descend prendre le centre —
        // c'est un arrêt sur un mot, pas sur un mot qui se cherche encore.
        var churn = (i <= 1 || i === ROLES.length - 1) ? 0 : Math.round(churnDuration(i) * 0.5);
        churnCell(cell, role.length, churn, function () {
            decodeCell(cell, role, timing);
        });
    }

    function stopTicker() {
        clearTimeout(seqTimer);
        for (var i = 0; i < cells.length; i++) clearTimeout(cells[i].introTimer);
    }

    // ════════════════════════════════════════════════════════════
    //  L'ARRÊT SUR « ADRIEN », PUIS « VADA »
    // ════════════════════════════════════════════════════════════
    //  Ce qu'il y avait avant : un fondu enchaîné entre le tambour et le
    //  nom, tous deux posés au même endroit. Pendant deux secondes on
    //  lisait donc les deux à la fois, c'est-à-dire ni l'un ni l'autre —
    //  les relevés image par image donnaient « ADRIENRATEUR ». Le réglage
    //  n'était pas en cause : le principe l'était.
    //
    //  Ce qu'il y a maintenant : PLUS AUCUNE SUPERPOSITION. La roulette
    //  freine, s'arrête sur « ADRIEN » — qui est un rôle joué comme les
    //  autres —, marque un silence, puis « VADA » vient se poser à côté.
    //  Le nom ne remplace pas les rôles : il est le dernier d'entre eux,
    //  auquel on ajoute un mot.
    //
    //  Quatre temps, dans l'ordre :
    //    1. le défilé s'épuise — le profil de vitesse ramène les derniers
    //       rôles à un rythme lisible, sur une bonne demi-douzaine de crans ;
    //    2. « ADRIEN » descend au centre en dépassant d'un cheveu, puis
    //       revient s'y caler — le « clac » d'une roulette qui verrouille ;
    //    3. les rôles restés en dessous achèvent leur chute et s'éteignent,
    //       pendant que le centre, lui, ne bouge plus. Silence ;
    //    4. « VADA » s'allume à droite tandis qu'« ADRIEN » glisse vers la
    //       gauche pour lui faire place — le nom entier se centre.
    // ════════════════════════════════════════════════════════════
    var VIDAGE_MS = 900;           // chute des rôles restants une fois la machine à l'arrêt
    var SILENCE_MS = 380;          // le temps qu'on laisse à « Adrien » seul, avant « Vada »
    var VADA_MS = 460;             // « Vada » s'allume et le nom se recentre

    // La courbe du dernier cran. Le dépassement — le 1.55, au-delà de 1 —
    // est tout l'effet : sans lui la roulette ne s'arrête pas, elle
    // s'immobilise, et ce n'est pas la même chose. Il vaut environ 9 % de la
    // course, ce qui se lit doublement : le mot passe sous le centre d'un
    // sixième de ligne, ET il grossit de 3 % en passant devant le plan de
    // l'écran, puisque la profondeur dépasse elle aussi. Un vrai « clac ».
    var LOCK_EASE = 'cubic-bezier(0.26, 1.55, 0.56, 1), linear, cubic-bezier(0.4, 0, 0.2, 1)';

    // ════════════════════════════════════════════════════════════
    //  SÉQUENCE PRINCIPALE
    // ════════════════════════════════════════════════════════════
    function runSequence() {
        if (isDismissed) return;
        // Le tambour a besoin de ses cinq cellules (quatre places visibles
        // + la coulisse). S'il en manque, on saute droit au nom plutôt que
        // de faire tourner une roulette bancale.
        if (ring.length < SLOT_ORDER.length) { finish(); return; }

        placeRing(0);
        void ring[0].offsetWidth;

        turbulenceTarget = 0;

        // Lever de rideau : Antiochus se décode droit au centre — et, dans
        // le même temps, Le Juge se décode déjà tout en haut, atténué et
        // plus loin. Le premier cran ne tombe qu'une fois Antiochus lu.
        decodeCell(ring[0], ROLES[0], wordTiming(0, ROLES[0]), function () {
            seqTimer = setTimeout(function () { step(1); }, holdDuration(0));
        });
        armTopCell(1);
    }

    // Un cran du tambour : `idx` est le rôle qui prend la place centrale.
    function step(idx) {
        if (isDismissed) return;

        var dernier = idx === ROLES.length - 1;
        var dur = shiftDuration(idx);

        // Le dépassement se règle sur la cellule QUI VA prendre le centre,
        // donc avant la rotation : à ce stade elle est encore en haut.
        if (dernier) ring[1].style.transitionTimingFunction = LOCK_EASE;

        shiftReel(dur);
        armTopCell(idx + 1);   // au-delà du dernier rôle, le haut reste vide

        if (dernier) {
            // La course est finie : la poussière se relâche au moment même
            // où la machine se pose.
            turbulenceTarget = 0;
            seqTimer = setTimeout(verrouille, dur);
            return;
        }

        turbulenceTarget = Math.min(1, idx / ROLES.length);
        seqTimer = setTimeout(function () { step(idx + 1); }, dur + holdDuration(idx));
    }

    // TEMPS 3. La roulette s'est arrêtée sur « Adrien ». Les rôles encore
    // visibles en dessous ne remontent pas et ne disparaissent pas d'un
    // coup : ils achèvent tranquillement leur chute et s'éteignent, pendant
    // que le centre, lui, ne bouge plus. La machine est à l'arrêt, mais son
    // inertie s'écoule encore — c'est ce décalage qui rend l'arrêt crédible.
    function verrouille() {
        if (isDismissed) return;
        placeCell(ring[1], 'coulisse', VIDAGE_MS);  // la place du haut, désormais vide
        placeCell(ring[4], 'bas2', VIDAGE_MS);      // le rôle qu'« Adrien » a chassé
        seqTimer = setTimeout(revele, SILENCE_MS);
    }

    // TEMPS 4. « Adrien » est un rôle ; reste à en faire un nom.
    //
    // Toute la difficulté est que les lettres d'« ADRIEN » ne doivent pas
    // sauter d'un pixel au passage — sinon on voit la ficelle. On procède
    // donc par substitution invisible : le texte net (#intro-name-fade)
    // porte déjà « ADRIEN VADA » dans la typo du logotype, découpé lettre
    // par lettre comme le tambour. On le pose DÉCALÉ VERS LA DROITE de la
    // demi-largeur de ce que « VADA » occupera, « VADA » encore éteint :
    // son « ADRIEN » tombe alors exactement sur celui du tambour, qu'on
    // éteint dans la même image. Puis on ramène le nom à sa vraie place —
    // « ADRIEN » glisse vers la gauche — pendant que « VADA » s'allume.
    function revele() {
        if (isDismissed) return;

        var lettresVada = nameFadeEl.querySelectorAll('.ch-vada');
        var lettres = nameFadeEl.querySelectorAll('.ch');
        var reference = ring[0].querySelector('.ch');   // le « A » qu'affiche le tambour
        if (!lettresVada.length || !lettres.length || !reference) { finish(); return; }

        // On rend le nom visible mais « VADA » éteint. L'opacité ne change
        // rien à la mise en page : « VADA » occupe déjà sa place alors qu'on
        // ne le voit pas encore, et le nom est donc mesurable tel qu'il sera.
        nameFadeEl.style.transition = 'none';
        nameFadeEl.style.transform = 'none';
        nameFadeEl.style.opacity = '1';
        var i;
        for (i = 0; i < lettresVada.length; i++) {
            lettresVada[i].style.transition = 'none';
            lettresVada[i].style.opacity = '0';
        }

        // CALAGE PAR MESURE, PAS PAR CALCUL. On pourrait déduire le décalage
        // horizontal de la largeur que « VADA » ajoute ; ce serait juste, et
        // ce serait insuffisant. Les lettres de « VADA » sont en Cinzel, dont
        // les métriques ne sont pas celles du Montserrat : elles rendent la
        // ligne du nom un pixel plus haute que celle du tambour, et le nom
        // retombe donc un demi-pixel trop haut. Plutôt que de corriger ce
        // symptôme-là, on superpose directement le « A » du nom sur le « A »
        // du tambour, dans les deux axes. C'est vrai quelles que soient les
        // fontes, la largeur de l'écran, et même si les polices n'ont pas
        // fini de se charger.
        var cible = reference.getBoundingClientRect();
        var depart = lettres[0].getBoundingClientRect();
        var dx = cible.left - depart.left;
        var dy = cible.top - depart.top;
        nameFadeEl.style.transform = 'translate(' + dx.toFixed(2) + 'px, ' + dy.toFixed(2) + 'px)';

        // On force la prise en compte de cet état de départ avant de rendre
        // la main aux transitions (même raison que dans shiftReel).
        void window.getComputedStyle(nameFadeEl).transform;

        // Le tambour s'efface sous le nom, sans fondu : les deux « ADRIEN »
        // sont superposés au pixel près, la coupe est donc invisible — et un
        // fondu, lui, aurait risqué de faire baver la substitution.
        reelEl.style.transition = 'none';
        reelEl.style.opacity = '0';

        nameFadeEl.style.transition = 'transform ' + VADA_MS + 'ms cubic-bezier(0.22, 0.7, 0.28, 1)';
        for (i = 0; i < lettresVada.length; i++) {
            lettresVada[i].style.transition =
                'opacity ' + VADA_MS + 'ms ease-out ' + Math.round(VADA_MS * 0.22) + 'ms';
        }
        requestAnimationFrame(function () {
            if (isDismissed) return;
            nameFadeEl.style.transform = 'translate(0, 0)';
            for (var j = 0; j < lettresVada.length; j++) lettresVada[j].style.opacity = '1';
        });

        seqTimer = setTimeout(finish, VADA_MS + 180);
    }

    // Le nom est entier et posé : on amène le sceau — qui, lui, attend un
    // clic et ne referme jamais la scène tout seul.
    function finish() {
        if (isDismissed) return;
        nameFadeEl.style.opacity = '1';
        turbulenceTarget = 0;
        setTimeout(showSeal, SEAL_DELAY_MS);
    }

    function showSeal() {
        if (isDismissed) return;
        sceauMontre = true;
        ctaEl.classList.add('intro-cta-visible');
        sealRing.style.transition = 'stroke-dashoffset ' + SEAL_DRAW_MS + 'ms cubic-bezier(0.4,0,0.2,1)';
        sealRingInner.style.transition = 'stroke-dashoffset ' + (SEAL_DRAW_MS - 150) + 'ms cubic-bezier(0.4,0,0.2,1) 0.18s';
        requestAnimationFrame(function () {
            sealRing.style.strokeDashoffset = '0';
            sealRingInner.style.strokeDashoffset = '0';
        });
        // Invite discrète au clic, une fois le tampon posé
        setTimeout(function () {
            if (!isDismissed) ctaEl.classList.add('intro-cta-pulse');
        }, SEAL_DRAW_MS);
    }

    // ════════════════════════════════════════════════════════════
    //  CYCLE DE VIE : lancement / sortie (skip ou clic sur le sceau)
    // ════════════════════════════════════════════════════════════
    var isDismissed = false;
    var dismissedAt = 0;
    var sceauMontre = false;   // la séquence est-elle allée jusqu'au tampon ?
    var demarreA = 0;          // début réel de l'intro (0 = elle n'a pas joué)

    function dismiss() {
        if (isDismissed) return;
        isDismissed = true;
        dismissedAt = performance.now();
        stopTicker();

        // L'ouverture fait-elle fuir ? La réponse tient en deux chiffres :
        // combien de temps on est resté, et si l'on a vu le sceau — c'est-à-dire
        // si la séquence est allée à son terme ou si on l'a coupée en route.
        // Rien n'est envoyé quand l'intro n'a pas joué (mouvement réduit,
        // deuxième visite dans la session) : ce serait compter des spectateurs
        // à qui l'on n'a rien montré.
        if (demarreA) {
            window.track?.('intro', {
                fin: sceauMontre ? 'sceau' : 'coupee',
                secondes: Math.round((dismissedAt - demarreA) / 1000)
            });
        }

        overlay.classList.add('intro-out');
        document.body.classList.remove('modal-open');

        var focusWasInside = overlay.contains(document.activeElement);
        setTimeout(function () {
            stopParticleLoop();
            overlay.hidden = true;
            if (focusWasInside) {
                var header = document.querySelector('header');
                if (header) {
                    header.setAttribute('tabindex', '-1');
                    header.focus({ preventScroll: true });
                    header.addEventListener('blur', function onBlur() {
                        header.removeAttribute('tabindex');
                        header.removeEventListener('blur', onBlur);
                    }, { once: true });
                }
            }
        }, FADE_MS);
    }

    skipBtn.addEventListener('click', dismiss);
    // Cliquer/toucher n'importe où sur le rideau — et en particulier sur le
    // sceau une fois qu'il est apparu — fait disparaître l'intro. Avant que
    // le sceau soit là, rien n'ouvre automatiquement le site : il faut agir.
    overlay.addEventListener('click', dismiss);
    // Toute interaction clavier saute directement l'intro (Tab, Entrée, Échap…)
    // pour ne jamais laisser un utilisateur au clavier bloqué derrière le voile.
    // dismiss() est idempotent (protégé par isDismissed), donc pas besoin de
    // retirer l'écouteur explicitement.
    document.addEventListener('keydown', dismiss);

    // Le décor (particules) est facultatif : s'il ne peut pas démarrer tout de
    // suite — onglet en arrière-plan, mise en page pas encore faite, dimensions
    // à 0 — on réessaie sans jamais bloquer la séquence de texte ni la sortie.
    function startParticlesWhenReady(attempt) {
        attempt = attempt || 0;
        // Sans contexte 2D il n'y a pas de décor, et rien à réessayer non
        // plus : ce n'est pas une mise en page qui tarde, c'est un refus.
        if (isDismissed || !ctx) return;
        if (resize()) {
            initParticles();
            startParticleLoop();
            return;
        }
        if (attempt < 40) {
            setTimeout(function () { startParticlesWhenReady(attempt + 1); }, 100);
        }
    }

    function start() {
        if (reduceMotion) {
            // Filet de sécurité si le CSS n'a pas pu masquer l'overlay à temps
            dismiss();
            return;
        }
        demarreA = performance.now();

        // LE GARDE-FOU EST POSÉ EN PREMIER, ET C'EST TOUT L'INTÉRÊT. Il ne
        // sert qu'aux cas anormaux — onglet resté en arrière-plan avec ses
        // minuteurs gelés, erreur imprévue… — et en usage normal la sortie
        // attend toujours un clic sur le sceau : ce délai ne doit jamais se
        // déclencher pendant une lecture tranquille.
        //
        // Mais il était posé en DERNIER, après le décor et la séquence. Une
        // exception dans l'un ou l'autre et il n'existait tout simplement
        // pas : le rideau restait alors à l'écran pour toujours, sans issue
        // ni bouton. Une promesse de sortie qui dépend du bon déroulement de
        // ce dont elle protège n'en est pas une. Elle est donc tenue d'abord.
        setTimeout(dismiss, MAX_INTRO_MS);

        // Empêche la page de défiler derrière le voile
        document.body.classList.add('modal-open');
        startParticlesWhenReady(0);
        runSequence();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
