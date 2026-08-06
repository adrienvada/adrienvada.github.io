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
 *   2. Un texte unique : le rôle en cours défile, lisible, à son
 *      rythme propre ; en parallèle, « Adrien Vada » — superposé au
 *      même endroit — apparaît en fondu et REMPLACE peu à peu les
 *      rôles (pas de concaténation lettre à lettre : juste un
 *      fondu enchaîné entre les deux).
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
    var ctx = canvas.getContext('2d');

    // ── Rôles joués, dans l'ordre d'apparition. Antiochus et Le Juge
    //    défilent à un rythme lisible ; l'accélération démarre ensuite,
    //    à partir de Touchstone (3e rôle).
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
    var ACCEL_START_INDEX = 2;                       // dès Touchstone (3e rôle) : ça s'emballe
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
        // d'économiser — quelques milliers de cercles pleins restent peu
        // coûteux en Canvas 2D.
        var area = window.innerWidth * window.innerHeight;
        var target = Math.max(1800, Math.min(3200, Math.round(area / 320)));
        return maskPoints.length ? Math.min(target, maskPoints.length) : target;
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
            var order = shuffledIndices(maskPoints.length).slice(0, n);
            for (var i = 0; i < order.length; i++) particles.push(makeParticle(order[i]));
        }
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

    // ── LA TAILLE DU GRAIN ───────────────────────────────────────────
    //  Le masque ne se lisait pas, et ce n'était ni la forme ni le nombre
    //  de points : les grains faisaient 1,4 px de rayon pour 12 px d'écart,
    //  soit MOINS DE 5 % DE LA SURFACE COUVERTE. On ne voyait que le
    //  contour — un nuage projeté s'entasse toujours sur sa silhouette,
    //  là où la surface devient tangente au regard — et l'intérieur du
    //  visage restait vide. Les trous des yeux et de la bouche existent
    //  pourtant bel et bien dans le nuage : ils n'avaient simplement rien
    //  autour d'eux pour se détacher.
    //
    //  Grossir le grain ne coûte RIEN : ce sont les mêmes cercles, au même
    //  nombre, simplement plus larges. Aucun lien entre particules, aucun
    //  remplissage, aucun filtre — tout cela aurait coûté cher et, pour
    //  les liens, refermé les yeux en reliant les deux bords de l'orbite.
    var DUST_GAIN = 2.7;

    //  Le rayon vise une COUVERTURE CONSTANTE plutôt qu'une taille fixe :
    //  r ∝ échelle / √nombre. Sans cela le téléphone serait sur-encré —
    //  il affiche un masque bien plus petit avec à peine moins de points.
    var GRAIN_REF = 328 / Math.sqrt(3200);

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
        var byHeight = H * 0.40;   // ~120 % de la hauteur d'écran
        var byWidth = W * 0.48;    // ~112 % de la largeur d'écran
        var dolly = dollyProgress(now);
        var shapeScale = Math.min(byHeight, byWidth) * scaleEnv * (1 + dolly * DOLLY_SCALE_GAIN);
        // Resserrement de la poussière : 1 = dispersion pleine (état de repos),
        // SPREAD_TIGHT = au plus serré, en fin de défilé des rôles.
        var spread = 1 - turbulence * (1 - SPREAD_TIGHT);
        var focal = FOCAL_START + (FOCAL_END - FOCAL_START) * dolly;
        var cx = W / 2, cy = H * 0.5;
        // Calculé une fois par image, pas une fois par grain.
        var grain = (shapeScale / Math.sqrt(particles.length || 1)) / GRAIN_REF;
        var springBack = Math.min(1, dt * 4.2);
        var energyDecay = Math.pow(0.9, dt * 60);

        ctx.clearRect(0, 0, W, H);

        for (var i = 0; i < particles.length; i++) {
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
            // Scintillement resserré : trop d'amplitude et une partie du
            // masque s'éteignait à chaque image, ce qui hachait la forme.
            var twinkle = 0.82 + 0.18 * Math.sin(tSec * p.twinkleSpeed + p.twinklePhase);
            var glow = Math.min(1, depth + p.energy * 0.7);

            // L'opacité RETOMBE quand le grain grossit : à taille multipliée
            // par trois, l'encre l'est par neuf, et les recouvrements
            // viraient à l'aplat blanc. Moins opaque et plus large, un grain
            // se superpose à ses voisins sans les effacer — c'est ce qui
            // fait une poussière plutôt qu'une peinture.
            var alpha = (0.24 + depth * 0.34) * twinkle + p.energy * 0.5;
            alpha = Math.min(1, alpha);

            var r = Math.round(191 + (255 - 191) * glow);
            var g = Math.round(169 + (248 - 169) * glow);
            var b = Math.round(138 + (222 - 138) * glow);
            // `p.r` était tiré au sort à la naissance de chaque particule et
            // n'avait jamais servi : il entre ici. Des grains fins et des
            // flocons plus larges dans la même poussière — c'est cette
            // inégalité qui la rend vivante plutôt que tramée.
            var radius = (0.75 + depth * 1.35) * DUST_GAIN * p.r * grain
                * (1 + p.energy * 0.8);

            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')';
            ctx.arc(sx + p.offX, sy + p.offY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    var lastT = null;
    function loop(now) {
        if (!running) return;
        if (lastT === null) lastT = now;
        var dt = Math.min((now - lastT) / 1000, 0.05);
        lastT = now;
        stepAndDraw(now, dt, now / 1000);
        rafId = requestAnimationFrame(loop);
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
    //  TEXTE : le rôle en cours défile normalement ; « Adrien Vada »,
    //  superposé au même endroit, apparaît en fondu par-dessus et le
    //  remplace peu à peu — aucune concaténation, juste une opacité
    //  qui glisse d'un texte à l'autre.
    // ════════════════════════════════════════════════════════════
    var tickerTimer = null;

    function renderTickerFrame(target, revealCount) {
        var html = '';
        for (var i = 0; i < target.length; i++) {
            var ch = target[i];
            if (ch === ' ') { html += ' '; continue; }
            var settled = i < revealCount;
            var displayCh = settled ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
            html += '<span class="ch' + (settled ? '' : ' ch-dim') + '">' + displayCh + '</span>';
        }
        tickerEl.innerHTML = html || '&nbsp;';
    }

    // Décode un mot caractère par caractère (façon "cyber-reveal"), puis
    // appelle onDone.
    function scrambleTicker(target, timing, onDone) {
        var revealCount = 0, frameInChar = 0;
        var chunk = timing.chunk || 1;

        function skipSpaces() {
            while (revealCount < target.length && target[revealCount] === ' ') revealCount++;
        }
        skipSpaces();

        function tick() {
            if (revealCount >= target.length) {
                renderTickerFrame(target, target.length);
                onDone && onDone();
                return;
            }
            renderTickerFrame(target, revealCount);
            frameInChar++;
            if (frameInChar >= timing.frames) {
                revealCount += chunk;
                frameInChar = 0;
                skipSpaces();
            }
            tickerTimer = setTimeout(tick, timing.step);
        }
        tick();
    }

    // « Ça mouline » : un bref brouillage sans mot lisible entre deux rôles.
    function churnThen(noiseLen, durationMs, onDone) {
        var elapsed = 0, stepMs = 24;
        var placeholder = new Array(Math.max(1, noiseLen) + 1).join('X');
        function tick() {
            if (isDismissed) return;
            renderTickerFrame(placeholder, 0);
            elapsed += stepMs;
            if (elapsed >= durationMs) { onDone(); return; }
            tickerTimer = setTimeout(tick, stepMs);
        }
        tick();
    }

    // Fondu enchaîné : plus la séquence avance, plus « Adrien Vada »
    // devient opaque et plus le rôle en cours s'estompe — une courbe
    // légèrement concave pour que les premiers rôles restent nets et
    // pleinement lisibles, le remplacement se faisant surtout sur la
    // seconde moitié du défilé.
    function updateFade(idx) {
        var p = Math.pow(Math.min(1, idx / ROLES.length), 1.6);
        nameFadeEl.style.opacity = p.toFixed(3);
        tickerEl.style.opacity = (1 - p).toFixed(3);
    }

    // ════════════════════════════════════════════════════════════
    //  SÉQUENCE PRINCIPALE
    // ════════════════════════════════════════════════════════════
    function runSequence() {
        if (isDismissed) return;

        function next(idx) {
            if (isDismissed) return;
            updateFade(idx);

            if (idx >= ROLES.length) { finish(); return; }

            var role = ROLES[idx];
            var timing = wordTiming(idx, role);
            turbulenceTarget = Math.min(1, idx / ROLES.length);

            function decode() {
                scrambleTicker(role, timing, function () {
                    if (isDismissed) return;
                    tickerTimer = setTimeout(function () { next(idx + 1); }, timing.hold);
                });
            }

            if (idx === 0) {
                decode(); // démarre directement par Antiochus, sans brouillage préalable
            } else {
                churnThen(role.length, churnDuration(idx), decode);
            }
        }
        next(0);
    }

    // Le fondu est déjà à son terme (Adrien Vada pleinement opaque, le
    // rôle effacé) : on amène le sceau — qui, lui, attend un clic et ne
    // referme jamais la scène tout seul.
    function finish() {
        if (isDismissed) return;
        updateFade(ROLES.length);
        nameFadeEl.classList.add('intro-final');
        turbulenceTarget = 0;
        setTimeout(showSeal, SEAL_DELAY_MS);
    }

    function showSeal() {
        if (isDismissed) return;
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

    function dismiss() {
        if (isDismissed) return;
        isDismissed = true;
        dismissedAt = performance.now();
        clearTimeout(tickerTimer);

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
