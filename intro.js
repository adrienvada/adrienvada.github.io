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
 *      et de face ; le précédent descend en s'éloignant. Le tambour
 *      s'emballe jusqu'à l'illisible.
 *   3. LE TAMPON : tout s'éteint d'un coup, sur une image — la roulette
 *      ET la poussière. Un temps de noir très court, puis « ADRIEN
 *      VADA » FRAPPE : il arrive à 115 % et s'écrase à 100 % en un
 *      dixième de seconde, pendant qu'une onde de choc repousse la
 *      poussière depuis le centre. Le nom ne se révèle pas, il est
 *      asséné (voir coupure/frappe plus bas).
 *   4. Un sceau qui se trace mais N'OUVRE PAS le site tout seul :
 *      il faut cliquer dessus (ou sur le rideau, ou une touche).
 *      C'est le même geste que le tampon : sa contre-épreuve.
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
    var ctx = canvas.getContext('2d');

    // ── Rôles joués, dans l'ordre d'apparition. Antiochus ouvre au
    //    centre du tambour, Le Juge se décode déjà au-dessus de lui ;
    //    tous deux défilent à un rythme lisible, l'accélération ne
    //    démarrant qu'ensuite, à partir de Steven (3e rôle).
    var ROLES = [
        'ANTIOCHUS', 'LE JUGE',
        'STEVEN', 'SGANARELLE', 'TOUCHSTONE', 'TITUS ANDRONICUS', 'LE PROCUREUR', "L'ACCUSÉ",
        'LE GREFFIER', "L'AVOCAT", 'LE NARRATEUR', 'ADRIEN', 'LE JEUNE MEC', 'JEREM'
    ];
    var FINAL_NAME = 'ADRIEN VADA';

    // On raisonne en DURÉE CIBLE par mot, pas en vitesse par caractère :
    // sinon « TITUS ANDRONICUS » durerait trois fois plus longtemps que
    // « STEVEN », et le rythme partirait en vrille.
    var OPENING_STEP_MS = 22, OPENING_FRAMES = 3;    // rythme des rôles d'ouverture (lisibles)
    var DECODE_BASE_MS = 300, DECODE_FLOOR_MS = 55;  // temps de résolution d'un mot
    var HOLD_BASE_MS = 260, HOLD_FLOOR_MS = 18;      // temps de lecture une fois résolu
    var FRAMES_BASE = 4, FRAMES_FLOOR = 2;           // images de brouillage par groupe
    var STEP_MS = 20;                                // durée d'une image de brouillage
    var CHURN_BASE_MS = 230, CHURN_FLOOR_MS = 45;    // durée du « mouline » entre deux rôles
    var ACCEL_START_INDEX = 2;                       // dès Steven (3e rôle) : ça s'emballe
    var ACCEL_RATE = 0.72;                           // < 1 : plus petit = plus brutal

    function accelK(i) {
        return i < ACCEL_START_INDEX ? 1 : Math.pow(ACCEL_RATE, i - ACCEL_START_INDEX + 1);
    }

    // Rythme d'un rôle donné : lisible pour l'ouverture, puis décroissance
    // exponentielle — l'effet « on se perd dans les rôles ». Au lieu de
    // raccourcir indéfiniment le temps par caractère (qui bute vite sur la
    // fréquence d'écran), on révèle PLUSIEURS caractères par étape : les
    // derniers rôles se décodent par blocs, plus lettre à lettre.
    function wordTiming(i, word) {
        if (i < ACCEL_START_INDEX) {
            return { hold: HOLD_BASE_MS, step: OPENING_STEP_MS, frames: OPENING_FRAMES, chunk: 1 };
        }
        var k = accelK(i);
        var decode = Math.max(DECODE_FLOOR_MS, Math.round(DECODE_BASE_MS * k));
        var hold = Math.max(HOLD_FLOOR_MS, Math.round(HOLD_BASE_MS * k));
        var frames = Math.max(FRAMES_FLOOR, Math.round(FRAMES_BASE * k));
        var letters = Math.max(1, String(word || '').replace(/ /g, '').length);
        var maxSteps = Math.max(1, Math.round(decode / (frames * STEP_MS)));
        var chunk = Math.max(1, Math.ceil(letters / maxSteps));
        return { hold: hold, step: STEP_MS, frames: frames, chunk: chunk };
    }

    function churnDuration(i) {
        return Math.max(CHURN_FLOOR_MS, Math.round(CHURN_BASE_MS * accelK(i)));
    }

    // ── LE TAMPON ────────────────────────────────────────────────
    //  Le noir n'est pas une transition, c'est un SILENCE : sans lui la
    //  frappe arriverait par-dessus le tambour et se lirait comme un
    //  remplacement de plus. Assez long pour qu'on le remarque, assez
    //  court pour qu'on ne se demande pas si ça a planté. En dessous de
    //  ~80 ms l'œil ne l'enregistre plus ; au-delà de ~180 ms le rythme
    //  se casse et la frappe n'a plus rien à trancher.
    var NOIR_MS = 115;
    //  Durée de l'écrasement 115 % → 100 %. ELLE EST ÉCRITE DEUX FOIS :
    //  ici pour que le sceau attende que le tampon ait fini de se poser,
    //  et dans l'animation `introTampon` (index.html) qui la joue
    //  vraiment. Les garder d'accord.
    var FRAPPE_MS = 130;
    var SEAL_DELAY_MS = 200;     // temps de pose, une fois le tampon abattu, avant le sceau
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

    // ── L'ONDE DE CHOC ───────────────────────────────────────────────
    //  Au moment où le nom frappe, la poussière est repoussée depuis le
    //  centre. C'est une IMPULSION SÉPARÉE, pas un détournement de la
    //  turbulence : celle-ci est lissée sur ~600 ms et resserre la
    //  poussière vers la surface du masque, exactement le contraire de ce
    //  qu'on veut ici — un coup sec, vers l'extérieur, qui retombe seul.
    //
    //  Ce n'est pas non plus une simple dilatation d'ensemble : le
    //  déplacement suit une CRÊTE qui s'éloigne du centre à vitesse fixe.
    //  Chaque grain n'est bousculé qu'au passage de la crête et se
    //  retrouve à sa place une fois qu'elle l'a dépassé — le retour ne
    //  demande donc aucun ressort ni aucun état à mémoriser, il est dans
    //  la forme même de l'onde.
    //
    //  Tout est exprimé en fraction de la DIAGONALE de l'écran : une onde
    //  réglée en pixels traverserait un téléphone en un clin d'œil et
    //  ramperait sur un grand écran.
    var CHOC_AMPLITUDE = 0.050;  // déplacement au sommet de la crête
    var CHOC_VITESSE = 2.1;      // diagonales par seconde : la crête sort du champ en ~0,45 s
    var CHOC_EPAISSEUR = 0.19;   // largeur de la crête (écart-type de la gaussienne)
    var CHOC_AMORTI = 3.4;       // décroissance exponentielle, en s⁻¹
    var chocA = null;            // timestamp de l'impact — null tant qu'il n'a pas eu lieu
    //  L'ONDE EST ARMÉE, PAS DATÉE. Prendre l'heure au moment où l'on pose
    //  la classe du tampon paraissait plus simple — c'était faux. Le nom,
    //  lui, ne s'affiche qu'à l'image suivante (le temps que le moteur
    //  d'animation prenne acte de la classe) : sur une machine qui rend à
    //  quinze images par seconde, l'onde avait déjà traversé un tiers de
    //  l'écran quand le nom apparaissait enfin — le souffle précédait le
    //  coup. On la datera donc de la première image RÉELLEMENT dessinée
    //  après l'impact, qui est aussi celle où le nom se pose : les deux
    //  sont désormais tenus par la même cadence, quelle qu'elle soit.
    var chocArme = false;
    var enNoir = false;          // la coupure : le champ de particules est éteint

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
        // LA COUPURE. Le champ s'éteint sur une image, avant même qu'on ait
        // fait tourner quoi que ce soit : c'est un rideau de fer, pas un
        // fondu. On sort ici — la rotation, le travelling et le lissage de
        // la turbulence sont donc gelés le temps du noir, et le masque
        // reprend la pose exacte qu'il avait quand la lumière revient. Un
        // clignement, pas un redémarrage.
        if (enNoir) { ctx.clearRect(0, 0, W, H); return; }

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

        // L'onde de choc, calculée une fois par image et non par grain :
        // rayon de la crête, sa largeur, l'amplitude qui reste. Passée sous
        // 1 % de sa force elle ne déplacerait plus rien de visible — on la
        // range, et la boucle retrouve son coût habituel.
        var chocForce = 0, chocRayon = 0, chocLarg = 1, chocPousse = 0;
        if (chocArme) { chocArme = false; chocA = now; }
        if (chocA !== null) {
            var ct = (now - chocA) / 1000;
            chocForce = Math.exp(-ct * CHOC_AMORTI);
            if (chocForce < 0.01) { chocA = null; chocForce = 0; }
            else {
                var diag = Math.sqrt(W * W + H * H);
                chocRayon = ct * CHOC_VITESSE * diag;
                chocLarg = CHOC_EPAISSEUR * diag;
                chocPousse = CHOC_AMPLITUDE * diag * chocForce;
            }
        }

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

            // LE PASSAGE DE L'ONDE. Le grain est chassé DROIT DEHORS, sur le
            // rayon qui le relie au centre de l'impact, d'autant plus fort
            // qu'il est près de la crête. Il s'allume au passage : une onde
            // qu'on ne verrait pas briller ne se lirait pas comme un souffle
            // mais comme un tremblement du cadrage.
            var eclat = 0;
            if (chocForce > 0) {
                var ox = sx - cx, oy = sy - cy;
                var od = Math.sqrt(ox * ox + oy * oy) || 1;
                var e = (od - chocRayon) / chocLarg;
                var crete = Math.exp(-e * e);
                if (crete > 0.004) {
                    var pousse = chocPousse * crete / od;
                    sx += ox * pousse;
                    sy += oy * pousse;
                    eclat = crete * chocForce;
                }
            }

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
            var glow = Math.min(1, prof + p.energy * 0.7 + eclat * 0.85);

            // L'opacité reste modeste : ce sont les recouvrements et la
            // nappe qui font la lumière, et un grain trop opaque ferait
            // blanchir la silhouette avant que l'intérieur n'apparaisse.
            var alpha = (0.17 + prof * 0.95) * twinkle + p.energy * 0.5 + eclat * 0.45;
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
        // Une image sur deux SAUF pendant l'onde de choc : elle ne dure
        // qu'une demi-seconde et c'est le seul moment où la poussière ne
        // dérive plus mais se déplace vite. À 30 images par seconde la
        // crête avancerait par sauts de trente pixels et se lirait comme
        // un scintillement. Une demi-seconde à plein régime : le budget
        // de l'auto-régulation l'absorbe sans broncher.
        if (dt < DUST_MIN_DT && chocA === null && !chocArme) return;   // l'image précédente reste à l'écran
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
        if (running) return;
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

    var SHIFT_BASE_MS = 380, SHIFT_FLOOR_MS = 90;  // durée d'un cran, avant/après emballement

    // Durée d'un cran pour le rôle qui arrive au centre.
    function shiftDuration(i) {
        return Math.max(SHIFT_FLOOR_MS, Math.round(SHIFT_BASE_MS * accelK(i)));
    }

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
        // Le tout premier rôle du haut (« Le Juge ») se décode d'emblée :
        // au lever de rideau, personne n'attend qu'« ça mouline ».
        var churn = i <= 1 ? 0 : Math.round(churnDuration(i) * 0.5);
        churnCell(cell, role.length, churn, function () {
            decodeCell(cell, role, timing);
        });
    }

    function stopTicker() {
        clearTimeout(seqTimer);
        for (var i = 0; i < cells.length; i++) clearTimeout(cells[i].introTimer);
    }

    // ════════════════════════════════════════════════════════════
    //  LE TAMPON : COUPURE, NOIR, FRAPPE
    // ════════════════════════════════════════════════════════════
    //  IL Y AVAIT UN FONDU ENCHAÎNÉ ICI, et c'était le principe qui
    //  était mauvais, pas son réglage. Le nom montait en opacité pendant
    //  que le tambour redescendait, tous deux posés au même endroit :
    //  pendant près de deux secondes on lisait les deux à la fois, donc
    //  ni l'un ni l'autre — les captures image par image donnaient
    //  « ADRIENRATEUR », « LE GREFFIER » qui bavait à travers le nom.
    //  Deux textes lisibles superposés ne se remplacent pas, ils se
    //  brouillent. Aucune courbe ne rattrape ça : il faut que l'un ait
    //  entièrement disparu avant que l'autre arrive.
    //
    //  D'où trois temps, dont un vide :
    //
    //   1. LA COUPURE. Le tambour s'éteint sur une image, en pleine
    //      course, à l'instant où il est devenu illisible — et la
    //      poussière avec lui. Pas de fondu : un rideau de fer.
    //   2. LE NOIR. Rien à l'écran. C'est le silence avant le coup ;
    //      sans lui la frappe n'aurait rien à trancher.
    //   3. LA FRAPPE. Le nom apparaît d'un bloc à 115 % et s'écrase à
    //      100 % en un dixième de seconde, pendant qu'une onde de choc
    //      chasse la poussière depuis le centre. Il n'est jamais
    //      « révélé » : il est asséné, et le sceau qui se trace juste
    //      après n'est que l'empreinte du même geste.
    // ════════════════════════════════════════════════════════════

    // Le `transition: none` en ligne fait double emploi avec le CSS, où la
    // transition d'opacité du tambour a été retirée — et c'est voulu : la
    // coupure doit rester une coupure même si quelqu'un rend un jour au
    // tambour un fondu d'entrée. On arrête aussi les minuteurs de
    // brouillage, qui continueraient sinon à repeindre un tambour éteint
    // pendant tout le noir.
    function coupure() {
        stopTicker();
        reelEl.style.transition = 'none';
        reelEl.style.opacity = '0';
        // La poussière s'éteint dans la même image. On efface le canevas
        // TOUT DE SUITE au lieu d'attendre le prochain tour de boucle : à
        // 30 images par seconde, celui-ci peut être à 30 ms d'ici, et la
        // roulette partirait un tiers de noir avant la poussière.
        enNoir = true;
        if (ctx && W && H) ctx.clearRect(0, 0, W, H);
        turbulenceTarget = 0;
    }

    function frappe() {
        if (isDismissed) return;
        enNoir = false;
        chocArme = true;
        nameFadeEl.classList.add('intro-frappe');
        // Le sceau enchaîne sur l'impact, pas sur la coupure : c'est de la
        // frappe qu'il découle. On laisse d'abord le tampon finir de
        // s'écraser, puis un court temps de pose.
        setTimeout(showSeal, FRAPPE_MS + SEAL_DELAY_MS);
    }

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
        var first = wordTiming(0, ROLES[0]);
        decodeCell(ring[0], ROLES[0], first, function () {
            seqTimer = setTimeout(function () { step(1); }, first.hold);
        });
        armTopCell(1);
    }

    // Un cran du tambour : `idx` est le rôle qui prend la place centrale.
    function step(idx) {
        if (isDismissed) return;

        // Passé le dernier rôle, on continue à tourner à vide : il faut
        // DEUX crans pour vider les deux places basses, sans quoi le
        // dernier rôle resterait planté en retrait sous le nom. Le tambour
        // s'en va par le fond et ne laisse qu'« Adrien Vada ».
        if (idx >= ROLES.length) {
            var last = shiftDuration(ROLES.length - 1);
            shiftReel(last);
            armTopCell(idx);
            var cransAVide = idx - ROLES.length;
            seqTimer = setTimeout(
                cransAVide >= 1 ? finish : function () { step(idx + 1); },
                last);
            return;
        }

        var dur = shiftDuration(idx);
        shiftReel(dur);
        turbulenceTarget = Math.min(1, idx / ROLES.length);

        // Le rôle d'après se décode en haut PENDANT que celui-ci descend :
        // c'est ce chevauchement qui donne la roulette, plutôt qu'une
        // succession de mots qui attendent chacun leur tour.
        armTopCell(idx + 1);

        seqTimer = setTimeout(function () { step(idx + 1); },
            dur + wordTiming(idx, ROLES[idx]).hold);
    }

    // Le tambour a fini de tourner à vide : on abat le tampon. La scène
    // s'éteint, se tait, puis le nom frappe — et c'est seulement de là que
    // découle le sceau, qui attend un clic et ne referme jamais la scène
    // tout seul.
    function finish() {
        if (isDismissed) return;
        coupure();
        setTimeout(frappe, NOIR_MS);
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
        if (isDismissed) return;
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
        // Empêche la page de défiler derrière le voile
        demarreA = performance.now();
        document.body.classList.add('modal-open');
        startParticlesWhenReady(0);
        runSequence();

        // Garde-fou absolu : uniquement pour les cas anormaux (onglet resté
        // en arrière-plan avec timers gelés, erreur imprévue…). En usage
        // normal, la sortie attend toujours un clic sur le sceau — ce délai
        // ne doit jamais se déclencher pendant une lecture tranquille.
        setTimeout(dismiss, MAX_INTRO_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
