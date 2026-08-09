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
 *      et de face ; le précédent descend en s'éloignant. Ils gardent
 *      leur pleine lumière jusqu'au dernier : rien ne les efface.
 *   3. Le tambour vidé, LE MASQUE ABANDONNE SA FORME : les particules
 *      se détachent du visage et vont se ranger sur les lettres
 *      d'« ADRIEN VADA », qu'elles écrivent de gauche à droite. Les
 *      cibles sont relevées sur le texte HTML lui-même, redessiné dans
 *      un canevas hors écran et relu au pixel (getImageData) — aucun
 *      fichier de points supplémentaire. Le texte net se pose ensuite
 *      sur la poussière arrivée, sans décalage. Voir la section
 *      « LE NOM S'ÉCRIT AVEC LA POUSSIÈRE DU MASQUE ».
 *   4. Un sceau qui se trace mais N'OUVRE PAS le site tout seul :
 *      il faut cliquer dessus (ou sur le rideau, ou une touche). Au
 *      clic, la poussière se relâche et retourne au masque pendant
 *      que le rideau tombe.
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
            energy: 0,           // 0→1, "étincelle" quand le pointeur passe à proximité
            // Cible sur le nom, remplie une seule fois par construitCibles.
            // Les champs sont déclarés ICI, même inutiles au départ : une
            // particule doit garder la même forme d'objet du début à la fin,
            // sinon le moteur JS la déclasse et le nuage entier ralentit.
            tx: 0, ty: 0, tdore: 0, tdelay: 0, tarc: 0
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
        // Le nuage est neuf : les cibles calculées pour l'ancien ne valent
        // plus rien (elles étaient appariées grain par grain).
        ciblesPretes = false;
        ciblesPerimees = true;
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
    //  LE NOM S'ÉCRIT AVEC LA POUSSIÈRE DU MASQUE
    // ══════════════════════════════════════════════════════════════
    //  CE QUI N'ALLAIT PAS. Le nom arrivait en FONDU ENCHAÎNÉ par-dessus le
    //  tambour : deux textes différents, à la même place, tous deux à
    //  mi-opacité pendant près de deux secondes. On ne lisait ni « LE
    //  PROCUREUR » ni « ADRIEN VADA », on lisait une bouillie. Le défaut
    //  n'était pas dans le réglage de la courbe, il était dans le principe :
    //  deux textes lisibles au même endroit ne peuvent pas cohabiter.
    //
    //  CE QU'ON FAIT À LA PLACE. Le masque ABANDONNE SA FORME. Les
    //  particules se détachent du visage et vont se ranger sur les lettres
    //  d'« ADRIEN VADA » — c'est la poussière elle-même qui porte le nom.
    //  Rien ne se superpose : à l'instant où la poussière part écrire, le
    //  tambour a déjà vidé sa place centrale.
    //
    //  COMMENT ON OBTIENT LES CIBLES, SANS UN OCTET DE PLUS. Pas de nouveau
    //  fichier de points, pas de génération hors-ligne : on DESSINE le nom
    //  dans un canevas hors écran, on relit ses pixels avec getImageData, et
    //  on sème des cibles là où il y a de l'encre. Une fois pour toutes —
    //  jamais par image, ce serait ruineux sur téléphone.
    //
    //  ET ON LE DESSINE À PARTIR DU TEXTE HTML LUI-MÊME : boîte, corps,
    //  graisse, interlettrage et famille sont relevés sur les <span> réels
    //  d'#intro-name-fade. Le calque hors écran est donc, au pixel près, le
    //  même nom au même endroit que celui du DOM. C'est ce qui rend le
    //  passage de relais possible à la fin (voir poseTexteNet) : le texte net
    //  se pose EXACTEMENT sur la poussière déjà arrivée, sans décalage, comme
    //  si les grains durcissaient.
    //
    //  POURQUOI LE TEXTE NET REPREND LA MAIN. On aurait pu s'arrêter à la
    //  poussière. Mais un logotype se lit à la lettre près, et le logotype
    //  d'Adrien a une typographie : ADRIEN en Montserrat 700 blanc cassé,
    //  VADA en Cinzel doré. Des grains, si serrés soient-ils, rendent la
    //  silhouette des lettres, pas leurs pleins et déliés — et surtout pas la
    //  différence entre une grotesque et une romane à empattements. La
    //  poussière fait l'ARRIVÉE (c'est elle qu'on regarde), le texte net fait
    //  la SIGNATURE (c'est lui qu'on lit). Les grains ne s'effacent pas pour
    //  autant : ils restent dessous et deviennent le halo du nom.
    //
    //  LES GRAINS PRENNENT LA COULEUR DE LEUR LETTRE. La palette du nuage va
    //  déjà du doré #bfa98a au blanc chaud — soit très exactement les deux
    //  couleurs du logotype. Un grain qui atterrit sur VADA vire donc au bout
    //  doré de la palette, un grain d'ADRIEN au bout blanc, sans une seule
    //  teinte de plus à fabriquer.
    // ══════════════════════════════════════════════════════════════

    var FORM_MS = 1500;        // durée de la traversée masque → nom
    var FORM_STAGGER = 0.42;   // part de cette durée mangée par le décalage gauche→droite
    // Le relâchement est plus court que le fondu de sortie (FADE_MS) : il doit
    // se jouer PENDANT que le rideau est encore visible, pas en même temps
    // qu'il s'efface — sinon on ne verrait rien du retour au masque.
    var RELEASE_MS = 460;
    var CIBLE_SS = 2;          // suréchantillonnage du calque de texte (bords moins escaliers)
    var CIBLE_SEUIL = 140;     // alpha à partir duquel un pixel du calque est « de l'encre »
    var GRAIN_NOM = 1.0;       // taille du grain du nom, en fraction de l'écart moyen entre cibles
    var ALPHA_NOM = 0.62;      // opacité d'un grain posé sur une lettre (l'addition fait le reste)

    var formPhase = 0;         // 0 = masque, 1 = la poussière part écrire, -1 = elle se relâche
    var formT0 = 0;
    var formProgres = 0;       // horloge globale de la traversée, 0 → 1
    var formDepart = 0;        // valeur de cette horloge à l'instant du relâchement
    var ciblesPretes = false;
    var ciblesPerimees = false;
    var rayonNom = 1.2;        // côté du grain une fois posé sur une lettre, en px CSS
    var FORM_SPAN_INV = 1 / (1 - FORM_STAGGER);

    // Tri par comptage, STABLE, sur une clé quantifiée en `cases` paliers.
    //   `ordre` : l'ordre d'entrée, qui départage les ex æquo ;
    //   `cle`   : un tableau indexé par élément (pas par rang).
    //
    // POURQUOI PAS `Array.prototype.sort`. Deux tris de trois mille éléments
    // plus une cinquantaine de petits tris coûtaient 34 ms sur la machine de
    // mesure — non pas à cause de l'algorithme, mais parce qu'une fonction de
    // comparaison appelée cent mille fois DANS UNE FONCTION QU'ON N'EXÉCUTE
    // QU'UNE SEULE FOIS n'est jamais optimisée par le moteur : elle reste
    // interprétée du début à la fin. Ici, aucun appel de fonction, trois
    // parcours linéaires : 34 ms deviennent 2. La quantification (quelques
    // centaines de paliers) ne coûte rien en qualité — on ne cherche pas un
    // ordre exact, on cherche à ce que la gauche aille à gauche.
    function trieParCase(ordre, cle, cases) {
        var n = ordre.length, i, c, v;
        var mn = Infinity, mx = -Infinity;
        for (i = 0; i < n; i++) { v = cle[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
        var ech = (cases - 1) / ((mx - mn) || 1);
        var casDe = new Int32Array(n), seau = new Int32Array(cases + 1);
        for (i = 0; i < n; i++) { c = ((cle[i] - mn) * ech) | 0; casDe[i] = c; seau[c + 1]++; }
        for (c = 0; c < cases; c++) seau[c + 1] += seau[c];
        var out = new Int32Array(n);
        for (i = 0; i < n; i++) { v = ordre[i]; out[seau[casDe[v]]++] = v; }
        return out;
    }

    // Relève le nom tel que le DOM le pose, le redessine dans un canevas hors
    // écran, et sème sur son encre autant de cibles qu'il y a de particules.
    // Renvoie false si quoi que ce soit manque — auquel cas la séquence
    // retombe sur le texte net, sans poussière (voir demarreFormation).
    function construitCibles() {
        // On ne renonce PAS aux cibles précédentes avant d'en avoir de
        // nouvelles : toutes les sorties en échec sont plus haut que la
        // première écriture. Un relevé qui échoue en plein vol — le temps
        // d'un redimensionnement, la boîte du nom peut être à zéro — laisse
        // donc la poussière sur les lettres d'avant, quitte à ce qu'elles
        // soient un peu décalées le temps d'une image ; la faire retomber
        // d'un coup sur le masque se verrait bien davantage.
        ciblesPerimees = false;
        var n = particles.length;
        if (!n || !nameFadeEl) return false;
        var morceaux = nameFadeEl.querySelectorAll('.ch');
        if (!morceaux.length) return false;

        // Le cadre de travail est celui du texte HTML : on relève la boîte de
        // chaque morceau (ADRIEN, VADA), et le calque hors écran ne fait que
        // les contenir tous, avec quatre pixels de marge pour les débords.
        var boites = [], x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i, k;
        for (i = 0; i < morceaux.length; i++) {
            var r = morceaux[i].getBoundingClientRect();
            if (!r.width || !r.height) return false;
            boites.push({
                el: morceaux[i], r: r,
                cs: window.getComputedStyle(morceaux[i]),
                dore: morceaux[i].classList.contains('ch-vada')
            });
            if (r.left < x0) x0 = r.left;
            if (r.top < y0) y0 = r.top;
            if (r.right > x1) x1 = r.right;
            if (r.bottom > y1) y1 = r.bottom;
        }
        x0 -= 4; y0 -= 4;
        var lw = Math.ceil(x1 - x0) + 4, lh = Math.ceil(y1 - y0) + 4;
        if (lw < 8 || lh < 8) return false;

        var cv = document.createElement('canvas');
        cv.width = Math.round(lw * CIBLE_SS);
        cv.height = Math.round(lh * CIBLE_SS);
        var g = cv.getContext('2d');
        if (!g) return false;
        // On travaille en pixels CSS, le suréchantillonnage étant porté par la
        // transformation : les coordonnées relevées sur le DOM s'écrivent alors
        // telles quelles, sans multiplication éparpillée dans le code.
        g.setTransform(CIBLE_SS, 0, 0, CIBLE_SS, 0, 0);
        g.fillStyle = '#fff';
        g.textBaseline = 'alphabetic';

        for (i = 0; i < boites.length; i++) {
            var b = boites[i], cs = b.cs;
            var corps = parseFloat(cs.fontSize) || 16;
            // 'normal' ne se parse pas en nombre : c'est un interlettrage nul.
            var inter = parseFloat(cs.letterSpacing) || 0;
            g.font = (cs.fontStyle && cs.fontStyle !== 'normal' ? cs.fontStyle + ' ' : '')
                + cs.fontWeight + ' ' + corps + 'px ' + cs.fontFamily;

            // LE FIL DE BASE, calculé et non deviné. CSS ne centre pas l'encre
            // dans la boîte : il centre la boîte de LIGNE, dont la hauteur vient
            // des métriques de la police, puis pose le fil de base sous
            // l'ascendante. On refait le même calcul avec les métriques que le
            // canevas expose — c'est à ce prix que la poussière tombe sur les
            // lettres du DOM et pas trois pixels à côté.
            var met = g.measureText('H');
            var asc = met.fontBoundingBoxAscent, desc = met.fontBoundingBoxDescent;
            var fil = (asc && desc != null)
                ? b.r.top + (b.r.height - (asc + desc)) / 2 + asc
                : b.r.top + b.r.height * 0.78;   // repli si le navigateur tait ses métriques

            // Lettre à lettre, avec l'interlettrage ajouté à la main : la
            // propriété `letterSpacing` du contexte 2D n'existe pas partout, et
            // le nom doit s'aligner sur le DOM sur TOUS les navigateurs.
            var txt = b.el.textContent || '';
            var plume = b.r.left;
            for (k = 0; k < txt.length; k++) {
                g.fillText(txt[k], plume - x0, fil - y0);
                plume += g.measureText(txt[k]).width + inter;
            }
            b.gx0 = b.r.left - x0;
            b.gx1 = b.r.right - x0;
        }

        var img;
        try { img = g.getImageData(0, 0, cv.width, cv.height); }
        catch (e) { return false; }   // canevas souillé : impossible ici, mais on ne parie pas
        var d = img.data, cw = cv.width, chh = cv.height;

        // Surface d'encre, estimée sur un pixel sur quatre : on ne cherche
        // qu'un ordre de grandeur pour en déduire un pas d'échantillonnage,
        // et parcourir le million et demi d'octets en entier coûterait trois
        // millisecondes pour affiner un chiffre qu'on arrondit ensuite.
        var encre = 0;
        for (k = 3; k < d.length; k += 16) if (d[k] > CIBLE_SEUIL) encre++;
        encre *= 4;
        if (encre < 64) return false;

        // ON NE CHOISIT PAS UNE DENSITÉ, ON CHOISIT UN NOMBRE. Le pas de la
        // grille d'échantillonnage se déduit de la surface d'encre et du
        // nombre de particules : il y aura donc autant de cibles que de
        // grains, ni plus ni moins. C'est la réponse aux deux questions qui
        // se posent d'habitude — que faire des particules en trop, que faire
        // des trous quand il en manque : il n'y en a jamais ni des unes ni
        // des autres. Un grand écran a plus de particules ET un nom plus
        // grand ; les deux varient ensemble et se compensent.
        //
        // La grille est TREMBLÉE (un décalage au hasard dans chaque maille) :
        // un pas régulier ferait apparaître des rangées et des moirés dans
        // les pleins des lettres, exactement ce qu'une poussière ne fait pas.
        var pas = Math.sqrt(encre / n);
        if (pas < 0.5) pas = 0.5;   // sous le demi-pixel, on repasserait à l'infini sur la même encre
        var xs = [], ys = [], dor = [], gx, gy;
        for (gy = 0; gy < chh; gy += pas) {
            for (gx = 0; gx < cw; gx += pas) {
                var px = (gx + Math.random() * pas) | 0;
                var py = (gy + Math.random() * pas) | 0;
                if (px >= cw || py >= chh) continue;
                if (d[(py * cw + px) * 4 + 3] <= CIBLE_SEUIL) continue;
                var lx = px / CIBLE_SS;
                var dore = 0;
                for (i = 0; i < boites.length; i++) {
                    if (boites[i].dore && lx >= boites[i].gx0 && lx <= boites[i].gx1) { dore = 1; break; }
                }
                xs.push(x0 + lx);
                ys.push(y0 + py / CIBLE_SS);
                dor.push(dore);
            }
        }
        var m = xs.length;
        if (m < 16) return false;

        // Le tirage tombe rarement pile sur n : on complète en repassant sur
        // les mêmes cibles avec un écart supplémentaire (deux grains nés d'une
        // même cible ne se superposent donc pas), ou l'on tronque.
        var perm = shuffledIndices(m);
        var ecart = pas / CIBLE_SS;   // écart moyen entre deux cibles, en px CSS
        var tx = new Float32Array(n), ty = new Float32Array(n), td = new Uint8Array(n);
        for (i = 0; i < n; i++) {
            var s = perm[i % m];
            var bis = i >= m ? ecart * 0.5 : 0;
            tx[i] = xs[s] + (bis ? (Math.random() - 0.5) * bis * 2 : 0);
            ty[i] = ys[s] + (bis ? (Math.random() - 0.5) * bis * 2 : 0);
            td[i] = dor[s];
        }

        // ── L'APPARIEMENT PARTICULE → CIBLE ─────────────────────────────
        //  Apparier au hasard donnerait un plat de spaghettis : chaque grain
        //  traverserait tout l'écran en croisant tous les autres. On préserve
        //  donc grossièrement la position. Les deux nuages sont rangés par
        //  COLONNE puis, dans chaque colonne, de haut en bas ; on apparie
        //  ensuite rang par rang. La joue gauche du masque part vers le A
        //  d'ADRIEN, le front vers le haut des lettres — les trajectoires
        //  restent grossièrement parallèles, et l'on voit un visage se défaire
        //  en écriture plutôt qu'un nuage se mélanger.
        //
        //  L'ORDRE SE FAIT EN DEUX TRIS STABLES, PAS EN CINQUANTE PETITS.
        //  On range d'abord tout le monde par ordonnée, puis — de façon
        //  stable — par colonne : chaque colonne se retrouve donc rangée de
        //  haut en bas sans qu'on ait eu à la découper ni à la trier à part.
        //
        //  On range sur les ANCRES du masque (bx, by), pas sur la position à
        //  l'écran : les ancres ne bougent jamais, l'appariement est donc le
        //  même d'une image à l'autre et survit à un redimensionnement — les
        //  cibles se déplacent, aucun grain ne change de lettre.
        var colonnes = Math.max(6, Math.min(72, Math.round(Math.sqrt(n))));
        var pbx = new Float32Array(n), pby = new Float32Array(n);
        var identite = new Int32Array(n);
        for (i = 0; i < n; i++) {
            pbx[i] = particles[i].bx; pby[i] = particles[i].by; identite[i] = i;
        }
        var ip = trieParCase(trieParCase(identite, pby, 512), pbx, colonnes);
        var it = trieParCase(trieParCase(identite, ty, 512), tx, colonnes);
        for (k = 0; k < n; k++) {
            var P = particles[ip[k]], q = it[k];
            P.tx = tx[q]; P.ty = ty[q]; P.tdore = td[q];
        }

        // Le nom s'écrit de gauche à droite : chaque grain attend son tour
        // selon l'abscisse de SA cible. Le retard mange FORM_STAGGER de la
        // durée totale, le reste étant la traversée d'un grain donné.
        var minx = 1e9, maxx = -1e9;
        for (i = 0; i < n; i++) {
            if (tx[i] < minx) minx = tx[i];
            if (tx[i] > maxx) maxx = tx[i];
        }
        var etendue = (maxx - minx) || 1;
        for (i = 0; i < n; i++) {
            var Q = particles[i];
            Q.tdelay = ((Q.tx - minx) / etendue) * FORM_STAGGER;
            // Trajectoire légèrement courbe, d'un côté ou de l'autre : en
            // ligne droite, mille grains parallèles font un balayage de
            // machine, pas de la poussière emportée.
            Q.tarc = (Math.random() - 0.5) * 0.26;
        }

        // Le grain du nom suit l'écart entre cibles : les lettres se
        // remplissent sans se boucher, quelle que soit la taille de l'écran.
        rayonNom = Math.max(0.9, Math.min(2.4, ecart * GRAIN_NOM));
        ciblesPretes = true;
        return true;
    }

    function demarreFormation() {
        if (formPhase === 1) return true;
        if (!ciblesPretes && !construitCibles()) return false;
        formPhase = 1;
        formT0 = performance.now();
        // La poussière part d'un masque RESSERRÉ : le départ est net, et
        // l'on voit une forme se défaire plutôt qu'un brouillard se déplacer.
        turbulenceTarget = 1;
        setTimeout(poseTexteNet, FORM_MS);
        return true;
    }

    // Le texte net se pose sur la poussière arrivée. Il ne la remplace pas :
    // les deux disent la même chose au même endroit — ce n'est pas la
    // superposition qu'on reprochait au fondu enchaîné, c'est un durcissement.
    function poseTexteNet() {
        if (isDismissed) return;
        nameFadeEl.style.transition = 'opacity 520ms ease';
        nameFadeEl.style.opacity = '1';
        nameFadeEl.classList.add('intro-final');
    }

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
        // ── Où en est la recomposition du nom ? ──────────────────────
        // Une seule horloge globale, dont chaque particule tire son propre
        // avancement selon le retard que lui vaut l'abscisse de sa cible.
        if (formPhase !== 0 && ciblesPerimees) construitCibles();
        if (formPhase === 1) {
            formProgres = Math.min(1, (now - formT0) / FORM_MS);
        } else if (formPhase === -1) {
            formProgres = formDepart * Math.max(0, 1 - (now - formT0) / RELEASE_MS);
        }
        var forme = ciblesPretes ? formProgres : 0;

        // Le masque OSCILLE autour de la position de face, il ne tourne pas
        // sur lui-même : un visage ne se reconnaît que de face ou presque.
        // Une rotation continue (l'ancien `tSec * 0.16`) le rendait illisible
        // dès qu'il dépassait ~25° — c'était la cause principale du problème,
        // bien avant le nombre de points.
        //
        // L'OSCILLATION S'ÉTEINT PENDANT QUE LE NOM SE FORME. Les cibles sont
        // posées en coordonnées d'écran, donc le nom est de face quoi qu'il
        // arrive ; mais tant qu'une partie des grains est encore accrochée au
        // visage, un masque qui continue de dodeliner tire les trajectoires
        // en travers. On amortit donc la rotation à mesure que la poussière
        // part — sans à-coup, puisque c'est la même horloge qui la commande.
        var calme = 1 - forme;
        var rotY = (Math.sin(tSec * 0.27) * 0.20 + rotYNudge) * calme;   // ±11° d'oscillation
        var rotX = Math.sin(tSec * 0.19) * 0.09 * calme;                 // ±5° de tangage
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

            // ── LA TRAVERSÉE : de l'ancre du masque à la lettre ──────────
            //  `m` est l'avancement de CETTE particule : l'horloge globale,
            //  moins le retard que lui vaut l'abscisse de sa cible, ramené sur
            //  la fenêtre qui lui reste. Lissé (courbe en S) pour qu'elle
            //  décolle et se pose en douceur.
            var m = 0;
            if (forme > 0) {
                m = (forme - p.tdelay) * FORM_SPAN_INV;
                if (m < 0) m = 0; else if (m > 1) m = 1;
                m = m * m * (3 - 2 * m);
                if (m > 0) {
                    // Quadratique de Bézier : le point de contrôle est décalé
                    // perpendiculairement à la trajectoire, d'un côté ou de
                    // l'autre selon la particule. Trois multiplications de
                    // plus, et la poussière s'envole en s'enroulant au lieu
                    // de glisser sur des rails.
                    var ax = sx, ay = sy;
                    var vx = p.tx - ax, vy = p.ty - ay;
                    var ctlx = ax + vx * 0.5 - vy * p.tarc;
                    var ctly = ay + vy * 0.5 + vx * p.tarc;
                    var u = 1 - m, uu = 2 * u * m;
                    sx = u * u * ax + uu * ctlx + m * m * p.tx;
                    sy = u * u * ay + uu * ctly + m * m * p.ty;
                }
            }

            // Réaction au pointeur : à peine un frémissement — une caresse,
            // pas un souffle. Les particules proches s'illuminent doucement
            // et s'écartent à peine, puis reviennent sans à-coup. Elle cesse
            // dès que la poussière est en route : un nom qu'on peut brouiller
            // du doigt en cesserait d'être lisible.
            if (pointer.active && forme < 0.35) {
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

            // ARRIVÉ SUR SA LETTRE, LE GRAIN OUBLIE LE MASQUE. Profondeur,
            // scintillement et inégalité de taille disaient un volume ; sur un
            // nom à plat ils ne disent plus rien et ne font que le troubler.
            // On glisse donc, du même `m` que la position, vers une taille et
            // une opacité communes — et vers la teinte de la lettre visée :
            // le bout doré de la palette pour VADA, le bout blanc pour ADRIEN.
            if (m > 0) {
                var im = 1 - m;
                glow = glow * im + (p.tdore ? 0.02 : 0.99) * m;
                alpha = alpha * im + ALPHA_NOM * m;
                radius = radius * im + rayonNom * m;
            }

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
            // Le ressort du pointeur s'efface avec la traversée : sur la
            // lettre, la cible est la cible, à rien près.
            buf[o] = sx + p.offX * (1 - m) - cote * 0.5;
            buf[o + 1] = sy + p.offY * (1 - m) - cote * 0.5;
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

    // Un redimensionnement déplace le nom HTML, donc les cibles relevées sur
    // lui. On ne les refait pas ici (l'événement part en rafale pendant qu'on
    // tire une fenêtre) : on les marque périmées, et la boucle les reconstruit
    // à l'image suivante si elle en a besoin. L'appariement, fondé sur les
    // ancres du masque qui ne bougent pas, reste le même : les cibles se
    // déplacent, les grains ne changent pas de lettre.
    window.addEventListener('resize', function () {
        resize();
        if (ciblesPretes) ciblesPerimees = true;
    });

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

    // IL N'Y A PLUS DE FONDU ENCHAÎNÉ (l'ancien updateFade). Le tambour
    // gardait naguère une opacité qu'on baissait pendant que le nom montait :
    // les rôles finissaient donc leur course à demi effacés, illisibles, et le
    // nom montait sur eux, illisible lui aussi. Le tambour garde maintenant sa
    // pleine lumière du premier au dernier rôle, il se vide par le bas comme il
    // l'a toujours fait, et le nom n'arrive qu'ensuite — porté par la
    // poussière (voir la section « LE NOM S'ÉCRIT AVEC LA POUSSIÈRE »).

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
            // LE MOMENT EXACT OÙ LA POUSSIÈRE PART ÉCRIRE : ce premier cran à
            // vide est celui qui libère la place centrale. Le dernier rôle en
            // descend à l'instant même, et il aura fini de s'éteindre bien
            // avant que le nom ne devienne lisible — rien ne se superpose.
            // Partir d'ici plutôt qu'après le second cran évite un temps mort :
            // le visage se défait pendant que le tambour finit de se vider.
            if (idx === ROLES.length) demarreFormation();
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

    // Le tambour est vide. On amène le sceau — qui, lui, attend un clic et ne
    // referme jamais la scène tout seul.
    //
    // LE SCEAU ATTEND QUE LE NOM SOIT ÉCRIT. finish() tombe quelques dixièmes
    // après le départ de la poussière (deux crans à vide, très brefs), alors
    // que la traversée dure une seconde et demie : poser le tampon tout de
    // suite le ferait naître au milieu d'un nom encore en vol. On lui laisse
    // donc ce qui reste de la traversée, puis le délai habituel.
    function finish() {
        if (isDismissed) return;
        // Filet : si la poussière n'a pas pu prendre le relais (canevas
        // indisponible, nuage vide, cibles introuvables), le nom se pose
        // quand même — en net, directement. L'ouverture ne dépend jamais
        // de son décor.
        if (formPhase !== 1 && !demarreFormation()) poseTexteNet();
        var reste = formPhase === 1
            ? Math.max(0, FORM_MS - (performance.now() - formT0))
            : 0;
        setTimeout(showSeal, reste + SEAL_DELAY_MS);
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

        // ON ENTRE : LA POUSSIÈRE SE RELÂCHE. Le nom écrit lâche prise et
        // chaque grain refait le chemin inverse vers son ancre sur le
        // masque — de droite à gauche, puisque c'est la même horloge qui
        // remonte et que le retard était pris sur l'abscisse. L'enveloppe de
        // sortie rétrécit le masque dans le même temps : le visage se
        // reforme en s'éloignant pendant que le rideau tombe. Rien de tout
        // cela ne conditionne la sortie, qui suit son cours.
        if (formPhase === 1) {
            formDepart = formProgres;
            formPhase = -1;
            formT0 = dismissedAt;
            turbulenceTarget = 0;
        }

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
