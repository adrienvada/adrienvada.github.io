/**
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

    // esc() vit dans le script en ligne d'index.html ; repli au cas où
    // l'ordre de chargement changerait.
    const escape = (v) => (typeof esc === 'function'
        ? esc(v)
        : String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

    // ── UN LIEN DE RÉSERVATION NE MÈNE QU'À UNE PAGE WEB ─────────────
    //  L'adresse vient de la base (saisie dans /admin/) et finit dans un
    //  href. escape() en neutralise les guillemets, pas le PROTOCOLE : une
    //  adresse en « javascript: » s'exécuterait au clic, et une adresse
    //  sans « https:// » — le cas courant d'un copier-coller — devenait un
    //  lien relatif qui envoyait le spectateur sur la page 404 du site.
    //  On n'accepte donc que http(s), on complète le « www. » que tout le
    //  monde tape, et tout le reste ne produit pas de bouton.
    function lienSur(url) {
        const s = String(url ?? '').trim();
        if (/^https?:\/\/[^\s"'<>]+$/i.test(s)) return s;
        if (/^www\.[^\s"'<>]+$/i.test(s)) return 'https://' + s;
        return '';
    }

    // ── LE CADRAGE ───────────────────────────────────────────────────
    //  Les cadres du défilé recadrent en `object-fit: cover`. Sans autre
    //  indication, c'est le CENTRE GÉOMÉTRIQUE du fichier qui survit — pas
    //  le sujet. Un visage haut dans un portrait, deux comédiens serrés à
    //  gauche : la photo est bonne, et le cadre la coupe.
    //
    //  `cadre` corrige cela, photo par photo, DANS LE TEMPS CONCERNÉ :
    //
    //      { p: [9, 5, 6], cadre: { 9: 'haut', 5: '38% 22%' } }
    //
    //  On y lit un numéro de photo, jamais un rang dans un tableau : rien
    //  à compter, et le réglage appartient au temps du montage, pas à
    //  l'image — une photo qui revient plus loin peut demander un autre
    //  cadrage sans que le premier bouge.
    //
    //  Les mots sont ceux d'`overAt`, plus les quatre coins. Une valeur
    //  précise est acceptée quand il faut viser juste : deux pourcentages,
    //  horizontal puis vertical, comme `object-position`.
    //
    //  L'AGRANDISSEMENT N'EST PAS CONCERNÉ : il montre la photo entière,
    //  dans une autre image qui ne reçoit que la source et la légende.
    const FRAMES = {
        'centre': '50% 50%',
        'haut': '50% 0%',
        'bas': '50% 100%',
        'gauche': '0% 50%',
        'droite': '100% 50%',
        'haut gauche': '0% 0%',
        'haut droite': '100% 0%',
        'bas gauche': '0% 100%',
        'bas droite': '100% 100%'
    };

    // Deux pourcentages, et RIEN d'autre : cette valeur finit dans un
    // attribut `style`. On ne recopie d'ailleurs jamais la chaîne reçue —
    // on réécrit les deux nombres qu'on y a lus.
    const FRAME_PAIR = /^(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/;

    // ── Le montage ───────────────────────────────────────────────────
    //  La séquence est écrite à la main dans SHOW_UNIVERSES : c'est un
    //  montage, pas un diaporama, et le nombre de photos d'un temps
    //  suffit à décider de sa mise en page.
    //
    //  1 photo  → `plein`    plein cadre recadré, parallaxe : l'ambiance
    //  2 photos → `duo`      côte à côte, la seconde décalée
    //  3 photos → `trio`     une haute à gauche, deux empilées à droite
    //  4 photos → `quatuor`  cascade en quinconce
    //
    //  Duos, trios et quatuors passent dans des cadres de hauteur fixe :
    //  les photos du dossier mêlent portrait et paysage, et à proportions
    //  libres un portrait faisait déborder la composition sur deux écrans.
    //  Elles y sont donc recadrées, comme le plein cadre. D'où la règle :
    //  TOUTE photo s'agrandit au clic, et n'est montrée entière que là.
    const LAYOUT_BY_COUNT = { 1: 'plein', 2: 'duo', 3: 'trio', 4: 'quatuor' };

    // Mot à mot, pour la révélation pilotée par le défilement.
    //
    //  DEUX ÉCRITURES POSSIBLES, au choix :
    //    'une seule ligne'                      → texte courant
    //    ['premier vers', 'deuxième vers']      → un vers par entrée
    //    'premier vers\ndeuxième vers'          → même chose, en plus court
    //
    //  Chaque ligne devient un bloc distinct. Dans les citations et les
    //  incrustations, elle NE SE COUPE PAS : un alexandrin se termine où
    //  l'auteur l'a voulu, pas où l'écran manque de place (voir fitLines,
    //  qui ajuste la taille du texte pour que le vers le plus long tienne).
    function toLines(value) {
        const lines = Array.isArray(value) ? value.map(String) : [String(value)];
        return lines.flatMap(line => line.split('\n'));
    }

    // Le synopsis accepte les mêmes coupes que le reste : un tableau de
    // lignes, ou des \n. Sans cela, `split(/\s+/)` avalait les retours à la
    // ligne comme de simples espaces — la coupe voulue disparaissait.
    // Ici les lignes se replient si l'écran est trop étroit : c'est de la
    // prose, pas des vers.
    function splitWords(value) {
        let i = 0;
        return toLines(value).map(line => {
            const words = line.split(/[^\S\u00A0]+/).filter(Boolean)
                .map(w => `<span class="u-wd" style="--i:${i++}">${escape(w)}</span>`)
                .join(' ');
            return `<span class="u-line">${words || '&nbsp;'}</span>`;
        }).join('');
    }

    // Chaque lettre est un bloc, pour tomber une à une. Mais des blocs
    // juxtaposés se coupent n'importe où : le navigateur les traite comme
    // autant d'éléments indépendants, et « d'après » se retrouvait scindé
    // en « d'apr / ès ». Les lettres sont donc regroupées par MOT, et c'est
    // le mot qui est insécable.
    function splitChars(str) {
        let i = 0;
        return String(str).split(/[^\S ]+/).filter(Boolean).map(word =>
            // aria-hidden : un lecteur d'écran épellerait ces blocs lettre
            // par lettre (« B, é, r, é… »). Le titre lui est donné d'un
            // seul tenant par l'aria-label que panelHtml pose sur le titre.
            `<span class="u-word" aria-hidden="true">` + word.split('').map(ch =>
                `<span class="u-ch" style="--i:${i++}">${escape(ch)}</span>`
            ).join('') + `</span>`
        ).join(' ');
    }

    // Les deux mesures qui dimensionnent le titre (voir .u-title). On COMPTE
    // plutôt qu'on ne MESURE, pour la même raison qu'en .u-fit : mesurer
    // suppose une mise en page déjà calculée — ce qui n'est pas le cas au
    // moment où le panneau se fabrique — et rend zéro sans le dire.
    //
    //   le mot le plus long  ce qui peut déborder en LARGEUR : un titre se
    //       replie entre deux mots, jamais dans un mot (voir .u-word).
    //   la longueur totale   ce qui peut déborder en HAUTEUR : « La peau des
    //       anges n'est pas si douce » n'a que des mots courts, et passerait
    //       la première mesure à une taille qui lui vaudrait cinq lignes.
    function titleMetrics(str) {
        const words = String(str).split(/\s+/).filter(Boolean);
        return {
            chars: words.reduce((m, w) => Math.max(m, w.length), 0) || 1,
            len: String(str).trim().length || 1
        };
    }

    //  LA CÉSURE. Un alexandrin se lit en deux souffles : la sixième
    //  syllabe marque une pause. Elle s'écrit dans les données par une barre
    //  entourée d'espaces — 'Que le jour recommence | et que le jour
    //  finisse' — et devient ici une marque discrète entre les deux
    //  hémistiches. C'est elle que la lumière respecte en écrivant le vers
    //  (voir ecrireALaLumiere dans univers.js) : elle s'y arrête, puis
    //  reprend. La barre ne s'affiche jamais telle quelle.
    const CESURE = /\s+\|\s+/;

    function revealWords(value) {
        const lines = toLines(value);
        return lines.map(line => {
            const moities = line.split(CESURE).map(moitie => moitie.split(/[^\S\u00A0]+/).filter(Boolean)
                .map(w => `<span class="u-rw">${escape(w)}</span>`).join(' '));
            const words = moities.filter(Boolean).join(' <span class="u-cesure" aria-hidden="true"></span> ');
            return `<span class="u-line">${words || '&nbsp;'}</span>`;
        }).join('');
    }

    // Longueur du vers le plus long, en caractères. C'est elle qui fixe la
    // taille du texte des blocs à ligne insécable — voir --chars dans le
    // CSS. On COMPTE plutôt que de MESURER : mesurer suppose une mise en
    // page déjà calculée, ce qui n'est pas garanti au moment où le panneau
    // s'ouvre, et une mesure qui échoue rend zéro sans le dire.
    function longestLine(value) {
        return toLines(value).reduce((m, l) => Math.max(m, l.replace(CESURE, ' ').length), 0) || 1;
    }

    function photoSrc(uni, n) {
        return `ressources/images/univers/${uni.slug}/${n}.jpg`;
    }

    // ── LA BONNE TAILLE POUR CHAQUE ÉCRAN ────────────────────────────
    //  Chaque photo existe aussi en WebP de 640 et 1280 px — et 1920 pour
    //  le plein cadre (build/variantes-images.py). Un téléphone les reçoit
    //  à la place de l'original de 2400 px : trois à dix fois moins lourd.
    //
    //  SOUS 900 PX DE LARGE SEULEMENT (`media`). Au-delà, c'est l'original
    //  qui sert, exactement comme avant : un grand écran le mérite, et il
    //  n'y a rien à y regagner.
    //
    //  `sizes` dit au navigateur quelle largeur la photo OCCUPERA — pas
    //  celle de son cadre. En plein cadre, sur un téléphone tenu droit, une
    //  photo en paysage doit couvrir un cadre plus haut que large : elle
    //  s'étale alors sur 1,3 hauteur d'écran (130vh). Annoncer la largeur du
    //  cadre (100vw) ferait choisir une version trop petite — donc floue.
    const TAILLES = {
        plein: { largeurs: [640, 1280, 1920], sizes: '(orientation: portrait) 130vh, 100vw' },
        groupe: { largeurs: [640, 1280], sizes: '(orientation: portrait) 60vh, 50vw' },
        affiche: { largeurs: [640, 1280], sizes: '90vw' },
        video: { largeurs: [640, 1280], sizes: '100vw' }
    };

    // <picture> plutôt qu'un srcset nu : l'écran large et le navigateur qui
    // ne lirait pas le WebP retombent tous deux sur le <img> et l'original.
    // L'agrandissement lit le `src` du <img> : il montre toujours l'original.
    function pictureHtml(src, genre, imgAttrs) {
        const t = TAILLES[genre] || TAILLES.groupe;
        const base = String(src).replace(/\.jpg$/, '');
        const jeu = t.largeurs.map(w => `${base}-${w}.webp ${w}w`).join(', ');
        return `<picture>
                    <source type="image/webp" media="(max-width: 900px)" srcset="${escape(jeu)}" sizes="${t.sizes}">
                    <img src="${escape(src)}" ${imgAttrs}>
                </picture>`;
    }

    function framePos(uni, beat, n) {
        const raw = beat.cadre && beat.cadre[n];
        if (raw == null || raw === '') return '';
        const key = String(raw).trim().replace(/\s+/g, ' ').toLowerCase();
        if (FRAMES[key]) return FRAMES[key];

        const m = key.match(FRAME_PAIR);
        if (m) {
            const x = +m[1], y = +m[2];
            // Au-delà de 100 %, `cover` laisserait du vide : c'est une
            // faute de frappe, pas une intention.
            if (x <= 100 && y <= 100) return `${x}% ${y}%`;
        }

        // Une valeur non comprise doit s'entendre. Sans ce mot, la photo
        // resterait centrée et l'on chercherait longtemps pourquoi le
        // réglage « ne marche pas ».
        console.warn(`[univers] ${uni.slug} · photo ${n} : cadre « ${raw} » ` +
            `non reconnu — la photo reste centrée. Attendu : ` +
            `${Object.keys(FRAMES).join(', ')}, ou deux pourcentages de 0 à 100 ` +
            `(par exemple « 38% 22% »).`);
        return '';
    }

    //  LA COPIE FLOUE. Chaque photo du montage a une jumelle floutée une
    //  fois pour toutes par build/variantes-images.py (…-flou.webp, 1 à 3 ko).
    //  La mise au point est un fondu de l'une à l'autre (voir .u-flou dans
    //  univers.css) : le navigateur ne calcule plus de flou à chaque image,
    //  il mélange deux photos. Et comme la copie pèse cent fois moins que
    //  l'original, c'est elle qu'on voit d'abord pendant qu'il arrive.
    function flouSrc(src) {
        return String(src).replace(/\.jpg$/, '-flou.webp');
    }

    function figureHtml(ph, layout, index, title, eager, over, rang) {
        const cap = ph.caption || '';
        // UNE PHOTO SANS LÉGENDE GARDE UN NOM À ELLE. Elle prenait le titre
        // du spectacle : neuf boutons « Agrandir : Fulguré.e.s » à la suite,
        // qu'un lecteur d'écran ne distinguait pas. Son rang les départage.
        const nom = cap || `${title}, photo ${index + 1}`;
        // La profondeur d'une vignette dans son groupe : 1, 1,9, 2,8. C'est
        // ce décalage — quelques pour cent de glissement de plus ou de moins
        // dans son cadre — qui donne du relief à une composition plate.
        const prof = layout === 'plein' ? '' : `;--prof:${(1 + ((rang || 0) % 3) * 0.9).toFixed(1)}`;
        return `<figure class="u-fig u-fig--${layout} rg-vue" style="--i:${index}${prof}">
            <button type="button" class="u-fig-media rg-k" data-u-zoom="${index}"
                    aria-label="Agrandir : ${escape(nom)}">
                <span class="u-fig-point rg-k">
                    ${pictureHtml(ph.src, layout === 'plein' ? 'plein' : 'groupe',
                        `class="u-fig-img rg-k" alt="${escape(nom)}" ${ph.pos ? `style="object-position:${ph.pos}"` : ''}
                         loading="${eager ? 'eager' : 'lazy'}" decoding="async"`)}
                    <img class="u-flou rg-k" src="${escape(flouSrc(ph.src))}" alt="" aria-hidden="true" decoding="async"${ph.pos ? ` style="object-position:${ph.pos}"` : ''}>
                </span>
                <span class="u-fig-loupe" aria-hidden="true"><svg class="ico" aria-hidden="true"><use href="#i-solid-expand"></use></svg></span>
            </button>
            ${over || ''}
            ${cap ? `<figcaption class="u-cap rg-vue"><span class="rg-k">${escape(cap)}</span></figcaption>` : ''}
        </figure>`;
    }

    // Incrustation : du texte POSÉ SUR la photo — ou sur tout un groupe,
    // qu'elle traverse alors d'un bord à l'autre (voir .u-group > .u-over).
    // Elle s'écrit à la lumière, comme les citations.
    function overHtml(beat) {
        if (!beat.over) return '';
        return `<div class="u-over u-ecrit rg-vue u-over--${escape(beat.overAt || 'centre')}">
            <p class="u-fit" style="--chars:${longestLine(beat.over)}">${revealWords(beat.over)}</p>
            ${beat.overBy ? `<cite class="rg-k">${escape(beat.overBy)}</cite>` : ''}
        </div>`;
    }


    // ── LA VIDÉO ─────────────────────────────────────────────────────
    //  Un temps du montage peut être un extrait filmé :
    //
    //      { video: 'dQw4w9WgXcQ', c: ['Teaser du spectacle'] }
    //
    //  On accepte l'identifiant seul ou l'adresse entière — youtu.be,
    //  watch?v=, /embed/, /shorts/ : c'est ce qu'on a sous la main quand
    //  on copie depuis YouTube, et rien ne sert de le faire retaper.
    //
    //  RIEN NE PART VERS YOUTUBE TANT QU'ON N'A PAS CLIQUÉ. Le bloc
    //  n'affiche d'abord que l'affiche du film et un bouton ; le lecteur
    //  n'est fabriqué qu'au clic. Une iframe YouTube pèse un mégaoctet de
    //  scripts et pose ses traceurs à l'affichage : en poser quatre dans
    //  un univers ruinerait le défilé qu'on vient tout juste d'alléger.
    const YT_ID = /^[A-Za-z0-9_-]{11}$/;
    const VIMEO_ID = /^\d{6,12}$/;
    // Ce qui peut légitimement finir dans data-u-video — et rien d'autre.
    const VIDEO_REF = /^(yt:[A-Za-z0-9_-]{11}|vimeo:\d{6,12})$/;
    // Une jaquette est un nom de fichier du dossier de l'univers, pas un
    // chemin : pas de « / », pas d'espace, rien qui puisse sortir du dossier.
    const JAQUETTE_OK = /^[A-Za-z0-9._-]+$/;

    function videoRef(uni, raw) {
        const s = String(raw || '').trim();
        if (YT_ID.test(s)) return 'yt:' + s;
        let m = s.match(/(?:youtu\.be\/|v=|youtube\.com\/(?:embed|shorts|live)\/)([A-Za-z0-9_-]{11})/);
        if (m) return 'yt:' + m[1];
        m = s.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/);
        if (m) return 'vimeo:' + m[1];
        if (VIMEO_ID.test(s)) return 'vimeo:' + s;
        console.warn(`[univers] ${uni.slug} : vidéo « ${raw} » non reconnue — le bloc est ignoré. ` +
            `Attendu : une adresse YouTube ou Vimeo, ou l’identifiant seul.`);
        return '';
    }

    function videoHtml(uni, beat, title) {
        const ref = videoRef(uni, beat.video);
        if (!ref) return '';
        const cap = (beat.c && beat.c[0]) || '';
        // La jaquette : l'image montrée avant le clic. YouTube en fournit
        // une ; Vimeo n'en donne aucune sans appeler ses serveurs — ce qu'on
        // se refuse à faire avant le clic. Une vidéo Vimeo demande donc sa
        // jaquette locale (champ `jaquette`, fichier du dossier de
        // l'univers, préparé par le script comme l'affiche).
        let poster = '', repli = '';
        if (beat.jaquette && JAQUETTE_OK.test(String(beat.jaquette))) {
            poster = `ressources/images/univers/${uni.slug}/${beat.jaquette}`;
        } else if (ref.startsWith('yt:')) {
            const id = ref.slice(3);
            poster = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
            repli = ` data-u-poster="${id}"`;
        } else {
            console.warn(`[univers] ${uni.slug} : une vidéo Vimeo demande une ` +
                `jaquette locale (champ \`jaquette\`) — le bloc est ignoré.`);
            return '';
        }
        // La jaquette locale (Vimeo) a ses versions allégées ; l'affiche de
        // YouTube, servie par YouTube, n'en a pas chez nous.
        const imgAttrs = `alt="" loading="lazy" decoding="async"`;
        return `<figure class="u-video u-reveal">
            <button type="button" class="u-video-play" data-u-video="${ref}"
                    aria-label="Lire la vidéo : ${escape(cap || title)}">
                ${repli ? `<img src="${escape(poster)}"${repli} ${imgAttrs}>` : pictureHtml(poster, 'video', imgAttrs)}
                <span class="u-video-icon" aria-hidden="true"><svg class="ico" aria-hidden="true"><use href="#i-solid-play"></use></svg></span>
            </button>
            ${cap ? `<figcaption class="u-cap rg-vue"><span class="rg-k">${escape(cap)}</span></figcaption>` : ''}
        </figure>`;
    }


    // ── L'AFFICHE ────────────────────────────────────────────────────
    //  Un film s'ouvre sur son affiche : elle précède le montage, comme au
    //  cinéma elle précède la séance. Portrait, entière — jamais recadrée :
    //  une affiche est une composition, on ne coupe pas dedans — posée dans
    //  la lumière de la palette, et agrandissable comme le reste.
    //  Le fichier : ressources/images/univers/<slug>/affiche.jpg, préparé
    //  par le script depuis « affiche.jpg » du dossier source.
    function afficheHtml(uni, title) {
        if (!uni.affiche) return '';
        return `<figure class="u-fig u-affiche" style="--i:0">
            <button type="button" class="u-fig-media" data-u-zoom="0"
                    aria-label="Agrandir l’affiche du film">
                ${pictureHtml(`ressources/images/univers/${uni.slug}/affiche.jpg`, 'affiche',
                    `alt="Affiche — ${escape(title)}" loading="eager" decoding="async"`)}
                <span class="u-fig-loupe" aria-hidden="true"><svg class="ico" aria-hidden="true"><use href="#i-solid-expand"></use></svg></span>
            </button>
        </figure>`;
    }

    // ── L'OUVERTURE : UN TRAVELLING AVANT, PUIS LE RÉCIT S'ÉCRIT ───────
    //  La première chose qu'on voit, avant le titre : une scène tenue. Des
    //  photos du spectacle arrivent du fond du plateau et passent de part
    //  et d'autre du spectateur ; au bout du travelling, le titre, SEUL,
    //  avance du fond jusqu'à sa place. La scène se tient ensuite, le
    //  titre posé, le temps que le reste du haut de la page paraisse, un
    //  temps après l'autre, sous le geste : la photo du fond se lève, le
    //  surtitre s'ouvre comme un rideau, l'auteur monte d'une trappe, puis
    //  la lumière écrit le synopsis, ligne à ligne. Le rôle, le bouton et
    //  la flèche viennent quand le récit est écrit ; alors seulement la
    //  page reprend son cours.
    //
    //  Tout arrivait d'un bloc, un instant après le titre : le synopsis
    //  s'écrivait au chronomètre dès l'ouverture de la page, caché au fond
    //  de la scène, et paraissait déjà écrit.
    //
    //  Le carton du chapitre ne vient qu'après, dans sa propre scène tenue
    //  (voir cartonHtml).
    //
    //  LES PHOTOS : quatre, prises dans le reste du montage — la première
    //  est réservée, c'est celle qui s'allume après le titre, et la
    //  vignette du CV. Un univers peut les choisir lui-même
    //  (`ouverture: [5, 21]`). Moins de deux photos disponibles : pas
    //  d'ouverture, le titre ouvre la page comme avant.
    //
    //  ELLE INVITE À DESCENDRE. Une scène qui commence dans le noir, avec
    //  une photo minuscule au fond, peut passer pour une page vide : on y
    //  voit d'emblée une photo nettement posée au loin, et « Avancer » au
    //  bas de l'écran, qui s'efface dès le premier geste.
    function photosOuverture(uni) {
        if (Array.isArray(uni.ouverture) && uni.ouverture.length) return uni.ouverture.slice(0, 4);
        const toutes = [];
        (uni.sequence || []).forEach(b => (b && Array.isArray(b.p) ? b.p : []).forEach(n => {
            if (!toutes.includes(n)) toutes.push(n);
        }));
        const reste = toutes.slice(1);
        if (reste.length <= 4) return reste;
        // Quatre photos réparties dans tout le montage : une bande-annonce,
        // pas les quatre premières.
        return [0, 1, 2, 3].map(k => reste[Math.round(k * (reste.length - 1) / 3)]);
    }

    //  Chaque photo a sa place dans la profondeur (--x, --y, à gauche puis
    //  à droite) et sa plage de passage dans la scène. La première commence
    //  AVANT la scène (début négatif) : au premier écran, elle est déjà là,
    //  posée au loin.
    const OUVERTURE_PLACES = [[-22, -9], [21, 9], [-19, 11], [23, -8]];

    //  LE TEMPO DE LA SCÈNE, en hauteurs d'écran de défilement (svh), depuis
    //  le moment où la scène se tient. Le travelling a la longueur qu'il
    //  avait ; ce qui suit dépend du synopsis : la lumière l'écrit à raison
    //  d'un demi-écran pour cent signes — entre 60 et 140 svh, pour qu'un
    //  seul coup de pouce ne l'écrive pas d'un trait, et qu'un long synopsis
    //  ne retienne pas sans fin. La régie parle en fractions de la scène
    //  (--s, --e) : on les calcule ici, sur sa longueur réelle.
    const OUVERTURE_TITRE = 200;                 // le titre est posé
    const OUVERTURE_PLAGES = [[-41, 92], [14, 120], [41, 147], [69, 170]];

    function tempoOuverture(uni) {
        const A = OUVERTURE_TITRE;
        const signes = uni.synopsis ? toLines(uni.synopsis).join(' ').replace(/\s+/g, ' ').trim().length : 0;
        const ecriture = signes ? Math.min(140, Math.max(60, signes * 0.5)) : 0;
        const E = A + 50 + ecriture;             // le synopsis est écrit
        const total = E + 60;                    // tout est là ; la page repart
        const f = (v) => +(v / total).toFixed(4);
        return {
            hauteur: total + 100,
            plages: OUVERTURE_PLAGES.map(([de, a]) => [f(de), f(a)]),
            ecrit: [f(A + 50), f(E)],
            // Les plages des couches du haut de la page (voir « Le récit
            // s'écrit sur la scène » dans univers.css).
            vars: {
                invite: f(14), titre: f(A),
                'fond-s': f(A), 'fond-e': f(A + 45),
                'sur-s': f(A + 8), 'sur-e': f(A + 40),
                'auteur-s': f(A + 22), 'auteur-e': f(A + 52),
                'synopsis-s': f(A + 36), 'synopsis-e': f(A + 52),
                'meta-s': f(E - 4), 'meta-e': f(E + 26),
                'actions-s': f(E + 8), 'actions-e': f(E + 36),
                'fleche-s': f(E + 24), 'fleche-e': f(E + 44)
            }
        };
    }

    const aUneOuverture = (uni) => photosOuverture(uni).length >= 2;

    // `titre` : le haut de la page (voir panelHtml), qui vient du fond ;
    // `tempo` : tempoOuverture(uni), que panelHtml a déjà calculé pour y
    // régler l'écriture du synopsis.
    function ouvertureHtml(uni, titre, tempo) {
        const photos = photosOuverture(uni);
        if (photos.length < 2) return '';
        const base = `ressources/images/univers/${uni.slug}`;
        const plans = photos.map((n, i) => {
            const [x, y] = OUVERTURE_PLACES[i];
            const [de, a] = tempo.plages[i];
            return `<span class="u-of-photo rg-k" style="--x:${x}cqw;--y:${y}cqh;--s:${de};--e:${a}">
                    <img src="${base}/${n}-640.webp" srcset="${base}/${n}-640.webp 640w, ${base}/${n}-1280.webp 1280w" sizes="(orientation: portrait) 70vw, 40vw" alt="" loading="lazy" decoding="async">
                </span>`;
        }).join('');
        const reglage = `--of-hauteur:${tempo.hauteur}svh;` +
            Object.entries(tempo.vars).map(([k, v]) => `--of-${k}:${v}`).join(';');
        // Le titre est AVANT les photos dans le document : elles passent
        // devant lui tant qu'elles traversent la scène. Pas de nom de région
        // sur la scène : c'est le haut de la page, son titre y est lu en
        // premier ; les photos, décoratives, sont cachées aux lecteurs
        // d'écran.
        return `<section class="u-ouverture rg-scene" style="${reglage}">
            <div class="u-of-scene">
                <span class="u-of-fond" aria-hidden="true"></span>
                <div class="u-of-titre rg-k">${titre}</div>
                <span class="u-of-plans" aria-hidden="true">${plans}</span>
                <p class="u-of-invite rg-k" aria-hidden="true"><span>Avancer</span><span class="u-of-rail"></span></p>
            </div>
        </section>`;
    }

    // ── LA LUMIÈRE QUI MONTE, ET SA SIGNATURE ───────────────────────────
    //  Après l'ouverture et le titre, la première photo plein cadre s'allume
    //  — pas en fondu anonyme : chaque univers a sa façon d'allumer le
    //  plateau (`lumiere` dans ses données). La foudre de Fulguré.e.s, les
    //  néons du tribunal d'À la barre, la guirlande d'As You Like It, la
    //  torche de Cléophène, la lumière crue de Bérénice, le projecteur des
    //  films. Le voile est posé ici ; le top est donné par univers.js quand
    //  la photo passe la ligne de lecture, aux trois quarts de l'écran, et
    //  le CSS joue la suite.
    const LUMIERES = ['foudre', 'neon', 'guirlande', 'torche', 'crue', 'projecteur'];

    function voileHtml(uni) {
        const l = LUMIERES.includes(uni.lumiere) ? uni.lumiere : (uni.kind === 'film' ? 'projecteur' : 'crue');
        const ampoules = l === 'guirlande' ? '<i></i><i></i><i></i><i></i><i></i><i></i>' : '';
        return { lumiere: l, html: `<span class="u-voile" aria-hidden="true">${ampoules}</span><span class="u-eclat" aria-hidden="true"></span>` };
    }

    // ── LA SALLE : SOMBRE OU CLAIRE ─────────────────────────────────
    //  Le noir de théâtre n'a de sens que dans une salle sombre. Sur le
    //  parchemin de L'Homme moderne, un écran tout noir arrivait comme une
    //  panne. On lit donc la clarté du fond de la palette — sa luminance
    //  relative, celle des contrastes du WCAG : sous 0,18, le gris moyen,
    //  la salle est sombre. Aujourd'hui : À la barre, Cléophène,
    //  Fulguré.e.s, As You Like It d'un côté ; Bérénice, Audiences et les
    //  trois films de l'autre.
    function salleDe(uni) {
        const m = /^#([0-9a-f]{6})$/i.exec(String(uni.palette?.bg || '').trim());
        if (!m) return 'sombre';
        const n = parseInt(m[1], 16);
        const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
        return L < 0.18 ? 'sombre' : 'claire';
    }

    // ── LE CARTON DU CHAPITRE, PLEIN ÉCRAN ──────────────────────────
    //  Le premier carton — la durée, une phrase — tient l'écran entier, dans
    //  sa propre scène tenue, entre le haut de la page et la première photo :
    //  sa phrase s'écrit à la lumière pendant qu'on s'y arrête. Posé dans le
    //  montage comme les autres cartons, il passait sous le pouce, et la
    //  première photo arrivait dans la foulée.
    //  Puis le noir, dans une salle sombre : la lumière remonte ensuite sur
    //  la première photo. Dans une salle claire, pas de noir — le carton
    //  s'efface dans le papier, et la photo qui suit s'y révèle (voir « La
    //  lumière qui monte » dans univers.css).
    //  Ses plages sont fixes : la scène a toujours la même longueur.
    function cartonHtml(uni, beat) {
        const salle = salleDe(uni);
        return `<section class="u-carton rg-scene" data-salle="${salle}">
            <div class="u-carton-scene">
                <span class="u-carton-fond" aria-hidden="true"></span>
                <div class="u-chapter u-carton-texte rg-k">
                    ${beat.chapter ? `<span class="u-chapter-num">${escape(beat.chapter)}</span>` : ''}
                    ${beat.chapterTitle ? `<h3 class="u-ecrit" data-ecrire="scene" data-de="0.04" data-a="0.46">${revealWords(beat.chapterTitle)}</h3>` : ''}
                </div>
                ${salle === 'sombre' ? '<span class="u-carton-noir rg-k" aria-hidden="true"></span>' : ''}
            </div>
        </section>`;
    }

    // ── LA POURSUITE ─────────────────────────────────────────────────
    //  Sur une photo de groupe choisie, le plateau reste dans la pénombre
    //  et une poursuite — deux au plus — va d'un comédien à l'autre au fil
    //  du défilement, avant les plein feux. Les positions sont écrites dans
    //  les données, en pourcentage de la photo, par étapes :
    //
    //      poursuite: { etapes: [ [[20, 48], [83, 48]], [[51, 60]] ] }
    //
    //  Chaque étape éclaire un ou deux points ; la première poursuite suit
    //  le premier point de chaque étape, la seconde n'apparaît qu'aux étapes
    //  qui en demandent deux. `ratio` : largeur sur hauteur de la photo
    //  (1,5 par défaut) — le cadre la montre ENTIÈRE, sans recadrage, pour
    //  que les pourcentages visent juste.
    function poursuiteHtml(uni, beat, n, index, title) {
        const pr = beat.poursuite || {};
        const etapes = (pr.etapes || []).filter(e => Array.isArray(e) && e.length).slice(0, 3);
        if (!etapes.length) return '';
        while (etapes.length < 3) etapes.push(etapes[etapes.length - 1]);
        // La seconde poursuite, éteinte à une étape, s'y tient déjà à la
        // place où elle va s'allumer — ou reste là où elle s'est éteinte :
        // elle ne traverse jamais la scène dans le noir pour rien.
        const vars = [];
        const seconds = etapes.map(e => e[1] || null);
        etapes.forEach((e, i) => {
            const a = e[0];
            const bp = seconds[i] || seconds.slice(0, i).reverse().find(Boolean) ||
                seconds.slice(i + 1).find(Boolean) || a;
            vars.push(`--a${i}x:${+a[0]}`, `--a${i}y:${+a[1]}`,
                `--b${i}x:${+bp[0]}`, `--b${i}y:${+bp[1]}`, `--b${i}on:${seconds[i] ? 1 : 0}`);
        });
        const ratio = +pr.ratio > 0 ? +pr.ratio : 1.5;
        const src = photoSrc(uni, n);
        const cap = (beat.c && beat.c[0]) || '';
        const nom = cap || `${title}, photo ${index + 1}`;
        // La légende s'écrit en deux temps quand elle a deux parties — « La
        // figure des jumeaux : une incarnation à deux têtes… » : la première
        // quand les deux poursuites sont allumées, la seconde ensuite.
        // L'espace avant les deux-points est l'insécable fine de la
        // typographie française : \s la reconnaît, une espace tapée non.
        const deux = /\s:\s/.exec(cap);
        const i2 = deux ? deux.index : -1;
        const leg = !cap ? '' : i2 > 0
            ? `<span class="u-pa-leg1 rg-k">${escape(cap.slice(0, i2))} :</span> <span class="u-pa-leg2 rg-k">${escape(cap.slice(i2 + deux[0].length))}</span>`
            : `<span class="u-pa-leg2 rg-k">${escape(cap)}</span>`;
        const lum = `<img src="${escape(src.replace(/\.jpg$/, '-1280.webp'))}" alt="" decoding="async" loading="lazy">`;
        return `<section class="u-poursuite rg-scene" style="--ratio:${ratio};${vars.join(';')}">
            <div class="u-pa-scene">
                <div class="u-pa-cadre">
                    <span class="u-pa-base" aria-hidden="true">${lum}</span>
                    <span class="u-pa-faisceau u-pa-a rg-k" aria-hidden="true"><span class="u-pa-lum rg-k">${lum}</span></span>
                    <span class="u-pa-faisceau u-pa-b rg-k" aria-hidden="true"><span class="u-pa-lum rg-k">${lum}</span></span>
                    <button type="button" class="u-pa-plein rg-k" data-u-zoom="${index}" aria-label="Agrandir : ${escape(nom)}">
                        ${pictureHtml(src, 'plein', `alt="${escape(nom)}" loading="lazy" decoding="async"`)}
                    </button>
                </div>
                ${leg ? `<p class="u-pa-legende">${leg}</p>` : ''}
            </div>
        </section>`;
    }

    function beatsHtml(uni, title) {
        let index = 0;
        // L'ouverture n'est plus ici : elle ouvre la page, avant le titre
        // (voir panelHtml). Après elle, le premier carton tient l'écran
        // entier, puis la première photo plein cadre s'allume.
        const seq = uni.sequence || [];
        let allumage = aUneOuverture(uni);
        const premierCarton = allumage ? seq.find(b => b && (b.chapter || b.chapterTitle)) : null;

        return afficheHtml(uni, title) + seq.map(beat => {

            if (beat.video) return videoHtml(uni, beat, title);

            // ── Cartons de texte, sans photo ──
            if (beat.chapter || beat.chapterTitle) {
                if (beat === premierCarton) return cartonHtml(uni, beat);
                return `<div class="u-chapter u-ecrit rg-vue">
                    ${beat.chapter ? `<span class="u-chapter-num">${escape(beat.chapter)}</span>` : ''}
                    ${beat.chapterTitle ? `<h3>${revealWords(beat.chapterTitle)}</h3>` : ''}
                </div>`;
            }
            if (beat.q) {
                return `<blockquote class="u-quote u-ecrit rg-vue">
                    <p class="u-fit" style="--chars:${longestLine(beat.q)}">${revealWords(beat.q)}</p>
                    ${beat.by ? `<cite class="rg-k">${escape(beat.by)}</cite>` : ''}
                </blockquote>`;
            }
            if (beat.text) {
                return `<div class="u-text u-ecrit rg-vue">
                    <p>${revealWords(beat.text)}</p>
                </div>`;
            }

            if (!beat.p || !beat.p.length) return '';

            // ── Photos ──
            const layout = LAYOUT_BY_COUNT[beat.p.length] || 'plein';

            // Une poursuite remplace la figure : c'est la même photo, montrée
            // entière et éclairée par morceaux.
            if (layout === 'plein' && beat.poursuite) {
                const html = poursuiteHtml(uni, beat, beat.p[0], index, title);
                if (html) { index++; return html; }
            }

            const inner = beat.p.map((n, i) => figureHtml(
                {
                    src: photoSrc(uni, n), caption: (beat.c && beat.c[i]) || '',
                    pos: framePos(uni, beat, n)
                },
                // Seule la première photo part d'emblée : c'est elle que le
                // panneau attend avant de se dévoiler (awaitFirstPhoto, dans
                // univers.js). Les autres attendent d'approcher de l'écran —
                // elles ne concurrencent plus les scripts ni la police du
                // titre. Un film ouvre sur son affiche, déjà partie, elle.
                layout, index, title, index++ === 0 && !uni.affiche,
                (layout === 'plein' && i === 0) ? overHtml(beat) : '', i
            )).join('');

            if (layout === 'plein') {
                // La première photo plein cadre après l'ouverture s'allume —
                // dans une salle claire, elle se révèle dans le papier.
                if (!allumage) return inner;
                allumage = false;
                const v = voileHtml(uni);
                return inner.replace('<figure class="u-fig u-fig--plein rg-vue"',
                    `<figure class="u-fig u-fig--plein rg-vue u-allumage" data-lumiere="${v.lumiere}" data-salle="${salleDe(uni)}"`)
                    .replace(/(<\/button>)/, `$1\n            ${v.html}`);
            }

            // Note en marge : la place du texte à côté d'un groupe. Une
            // incrustation (`over`) traverse le groupe entier — elle était
            // ignorée ici, en silence : « Jusqu'où serez-vous semblables ? »
            // n'était jamais affichée dans Cléophène.
            const aside = beat.aside
                ? `<p class="u-aside u-ecrit rg-vue">${revealWords(beat.aside)}</p>` : '';
            return `<div class="u-group u-${layout}">${inner}${overHtml(beat)}${aside}</div>`;
        }).join('');
    }

    // ── Le palmarès ──────────────────────────────────────────────────
    //  Les distinctions vivent au générique, pas dans le défilé : ce n'est
    //  pas un temps du montage, c'est ce qui est arrivé au film après.
    //
    //      prix: ['Prix du jury · Jeju International Film Festival, 2024']
    //
    //  Le point médian sépare la distinction de l'endroit où elle a été
    //  remise — le même signe que le CV emploie pour « Rôle · Antiochus ».
    //  La distinction prend l'accent, le reste le gris. Sans point médian,
    //  toute la ligne prend l'accent : rien à découper, rien à casser.
    function prixBlock(uni) {
        if (!uni.prix || !uni.prix.length) return '';
        const lignes = uni.prix.map(p => {
            const i = String(p).indexOf('·');
            const quoi = i < 0 ? String(p) : String(p).slice(0, i).trim();
            const ou = i < 0 ? '' : String(p).slice(i + 1).trim();
            return `<li><span class="u-prix-quoi">${escape(quoi)}</span>${ou ? `<span class="u-prix-ou">${escape(ou)}</span>` : ''}</li>`;
        }).join('');
        return `<div class="u-prix">
            <h4>Palmarès</h4>
            <ul>${lignes}</ul>
        </div>`;
    }

    // ── Le générique ─────────────────────────────────────────────────
    //  La distribution ferme l'univers : après les dates, avant le crédit
    //  photo. Le nom d'Adrien y figure comme les autres, en dernier, et
    //  RIEN NE L'EN DISTINGUE : ni couleur, ni gras, ni taille. C'est un
    //  générique, pas une affiche — sur son propre site, se souligner soi-
    //  même au milieu de sa troupe se remarquerait plus que le reste.
    function castBlock(uni) {
        if (!uni.cast || !uni.cast.length) return '';
        // Chaque nom est insécable : un patronyme coupé en fin de ligne,
        // dans un générique, ne se fait pas. La virgule reste collée au
        // nom qui précède, la seule coupe possible est l'espace d'après.
        const names = uni.cast.map(n =>
            `<span class="u-cast-name">${escape(n)}</span>`
        ).join(', ');
        return `<div class="u-cast">
            <h4>Distribution</h4>
            <p class="u-cast-names">${names}</p>
            ${uni.castNote ? `<p class="u-cast-note">${escape(uni.castNote)}</p>` : ''}
        </div>`;
    }

    // ── CE QUE LES DATES CHANGENT DANS LE PANNEAU ──────────────────
    //  Quatre endroits, et quatre seulement, dépendent des dates : le
    //  bouton du hero, le titre du pied, la liste elle-même, et le
    //  renvoi vers l'agenda. Ils étaient écrits en toutes lettres dans
    //  panelHtml — ce qui allait tant que le panneau se dessinait d'un
    //  bloc, une fois pour toutes.
    //
    //  Une page /spectacles/ ne peut plus s'en contenter : elle relit
    //  les dates après coup (Supabase), et doit refaire CES QUATRE
    //  ENDROITS sans toucher au reste — ni au montage de photos, ni à
    //  l'écriture du titre déjà jouée. Les voici donc nommés une fois,
    //  et appelés des deux côtés : par panelHtml au premier dessin, par
    //  rafraichirDatesSpectacle() dans univers.js à chaque mise à jour.
    //  Un libellé changé ici change partout ; c'est bien l'intention.
    //
    //  `etat` : { isFilm, dates, enCreation, statique, key }.
    function heroActionsHtml(etat, uni) {
        const { isFilm, dates, enCreation } = etat;
        if (isFilm) {
            return `<button type="button" class="u-btn" data-u-jump>
                        ${escape((uni && uni.heroCta) || 'Le film')}
                        <svg class="ico" aria-hidden="true"><use href="#i-solid-arrow-down"></use></svg>
                    </button>`;
        }
        // SPECTACLE ARRÊTÉ : il n'y a rien à quoi accéder, et un bouton
        // d'action promettant des représentations qui n'existent plus ferait
        // une promesse en l'air. La ligne le dit, et n'appelle pas le clic.
        if (!dates && !enCreation) return `<p class="u-hero-note">Ce spectacle n’est plus à l’affiche</p>`;
        return `<button type="button" class="u-btn" data-u-jump>
                        ${dates ? 'Accéder aux dates' : 'Le spectacle'}
                        <svg class="ico" aria-hidden="true"><use href="#i-solid-arrow-down"></use></svg>
                    </button>`;
    }

    function footTitleText(etat) {
        const { isFilm, dates, enCreation } = etat;
        return isFilm ? 'Le film'
            : dates ? 'Prochaines représentations'
                : enCreation ? 'Spectacle en création' : 'Ce spectacle n’est plus à l’affiche';
    }

    function footDatesHtml(etat) {
        const { isFilm, dates, enCreation } = etat;
        if (isFilm) return '';
        return dates || (enCreation
            ? `<p class="u-empty">Les dates de tournée seront annoncées ici.</p>`
            : `<p class="u-empty">Les représentations passées sont dans l’onglet Dates.</p>`);
    }

    // Le renvoi vers l'agenda du site. Sur une page autonome c'est un vrai
    // lien ; dans le panneau, un bouton qui referme et fait défiler.
    function footGhostHtml(etat) {
        const { isFilm, dates, enCreation, statique, key } = etat;
        if (isFilm || (enCreation && !dates)) return '';
        return statique
            ? `<a class="u-btn u-btn-ghost" href="/#page_dates">Voir toutes les dates</a>`
            : `<button type="button" class="u-btn u-btn-ghost" data-u-dates="${escape(key)}">Voir toutes les dates</button>`;
    }

    // ── LE PANNEAU ENTIER ──────────────────────────────────────────
    //  Le gabarit d'un univers : l'en-tête, le montage, le générique.
    //  Il servait au seul panneau plein écran ; il sert désormais aussi
    //  aux pages /spectacles/, qui n'avaient jusque-là qu'une pâle copie.
    //
    //  `info`     ce que la ligne de CV apprend du spectacle — année, rôle,
    //             compagnie, badge, lien. Le navigateur le lit dans le DOM
    //             (rowInfo), le script de build le lit dans index.html :
    //             deux chemins, un seul format.
    //  `opts.dates`      le bloc des représentations, déjà rendu.
    //  `opts.enCreation` distingue « pas encore créé » de « plus à l'affiche ».
    //  `opts.statique`   page autonome : on retire ce qui n'a pas de sens
    //             hors du panneau — la barre de progression,
    //             l'agrandissement — et on remplace les gestes qui pilotent
    //             le site par de vrais liens. La croix elle-même reste :
    //             un directeur de casting qui atterrit ici depuis le
    //             répertoire veut un moyen évident d'y revenir, même si
    //             « refermer » n'a pas de sens sur une page à part entière.
    //             Elle redevient donc un LIEN vers le répertoire, pas un
    //             bouton qui rejoue close() — rien à rejouer ici.
    // ── LE FOND DU TITRE : LA PHOTO DE LA VIGNETTE ───────────────────
    //  La couverture — la photo même de la vignette du CV et du répertoire
    //  (voir couverture, plus bas) — tendue derrière le titre, dans le noir
    //  de la salle. C'est elle que la vignette devient en s'ouvrant (voir
    //  « La vignette devient l'univers » dans univers.js) : on touche une
    //  petite photo, elle grandit jusqu'à faire le fond de la scène.
    //  Sans photo — un spectacle pas encore créé —, pas de fond : le halo
    //  de la couleur du spectacle suffit, comme avant.
    function heroFondHtml(uni) {
        const c = couverture(uni);
        if (!c) return '';
        const base = c.src.replace(/-240\.webp$/, '');
        return `<div class="u-hero-fond rg-k" aria-hidden="true"><img src="${escape(base)}-1280.webp" srcset="${escape(base)}-640.webp 640w, ${escape(base)}-1280.webp 1280w" sizes="100vw" alt="" decoding="async"${c.pos ? ` style="object-position:${escape(c.pos)}"` : ''}></div>`;
    }

    function panelHtml(info, uni, opts) {
        const { dates = '', enCreation = false, statique = false } = opts || {};
        const figures = beatsHtml(uni, info.title);
        // Un film n'est pas « à l'affiche » et n'a pas de tournée : le
        // vocabulaire du plateau ne lui va pas. `kind` le dit une fois, et
        // le hero comme le pied s'y accordent.
        const isFilm = uni.kind === 'film';
        const tm = titleMetrics(info.title);
        // Les quatre fragments qui dépendent des dates, écrits une seule
        // fois plus haut : la page /spectacles/ les rejouera tels quels
        // quand Supabase aura répondu.
        const etat = { isFilm, dates, enCreation, statique, key: info.key };
        const niveau = statique ? 'h1' : 'h2';
        const tempo = aUneOuverture(uni) ? tempoOuverture(uni) : null;
        const ouverture = !!tempo;
        // LE SYNOPSIS. Dans l'ouverture, la lumière l'écrit ligne à ligne,
        // sur la course de la scène (data-ecrire="scene", voir
        // ecrireALaLumiere dans univers.js) : il s'écrit sous le geste, le
        // titre posé. Sans ouverture, il s'inscrit mot à mot au chronomètre
        // dès l'ouverture de la page, en tête (voir playWriting).
        const synopsis = !uni.synopsis ? '' : ouverture
            ? `<p class="u-synopsis u-ecrit rg-k" data-ecrire="scene" data-de="${tempo.ecrit[0]}" data-a="${tempo.ecrit[1]}">${revealWords(uni.synopsis)}</p>`
            : `<p class="u-synopsis rg-k">${splitWords(uni.synopsis)}</p>`;

        // LE HAUT DE LA PAGE : le titre et ce qui l'accompagne. Avec une
        // ouverture, le titre est au bout du travelling — il arrive du fond
        // de la scène, le reste paraît ensuite sous le geste (voir
        // ouvertureHtml), et tout repart avec la scène. Sans ouverture, il
        // ouvre la page et SE DÉFAIT PAR COUCHES en s'en allant, chacune sur
        // sa propre course au défilement (voir « Le héros s'en va » dans
        // univers.css) : le surtitre part d'abord, le titre en dernier.
        // L'auteur, la ligne du rôle, le bouton et la flèche sont enveloppés
        // d'une couche : ils ont déjà leur propre fondu d'arrivée, et deux
        // animations ne se partagent pas une même opacité.
        const hero = `<div class="u-hero-wrap${ouverture ? '' : ' rg-vue'}">
        ${heroFondHtml(uni)}

        <header class="u-hero">
            <!-- Année · genre · badge. Le genre se lit dans le même souffle
                 que la date et l'état de la tournée : c'est la ligne d'une
                 feuille de salle, et elle dit en trois mots ce qu'on va voir
                 avant même le titre. Il est pris sur l'univers et non sur la
                 ligne du CV, qui ne le porte pas. -->
            <p class="u-eyebrow rg-k">${escape(info.year)}${uni.genre ? ' · ' + escape(uni.genre) : ''}${info.badge ? ' · ' + escape(info.badge) : ''}</p>
            <!-- LE TITRE, D'UN SEUL TENANT POUR QUI NE LE VOIT PAS. Les lettres
                 tombent une à une et sont donc cachées aux lecteurs d'écran
                 (voir splitChars) ; aria-label leur donne le mot entier.
                 PAS de copie du titre en texte masqué : un moteur la lirait
                 collée aux lettres, « BéréniceBérénice ». Les lettres, elles,
                 restent le texte du titre pour qui l'indexe.
                 Sur une page autonome c'est le titre de la page, de premier
                 niveau ; dans le panneau de l'accueil, qui a déjà le sien, de
                 second niveau. -->
            <${niveau} class="u-title rg-k" id="u-titre" aria-label="${escape(info.title)}" style="--u-title-chars:${tm.chars};--u-title-len:${tm.len}">${splitChars(info.title)}</${niveau}>
            ${info.author ? `<div class="u-couche u-couche-auteur rg-k"><p class="u-author">${escape(info.author)}</p></div>` : ''}
            ${synopsis}
            <div class="u-couche u-couche-meta rg-k"><p class="u-meta">${escape(info.role)}${info.company ? '<br>' + escape(info.company) : ''}</p></div>

            <!-- Raccourci vers les dates dès le titre : sans lui, il faut
                 traverser tout le défilé de photos pour savoir quand voir le
                 spectacle — or c'est souvent la seule raison de la visite.
                 Ce que les dates y changent est dans heroActionsHtml. -->
            <div class="u-couche u-couche-actions rg-k"><div class="u-hero-actions">
                ${heroActionsHtml(etat, uni)}
            </div></div>

            <span class="u-couche u-couche-fleche rg-k" aria-hidden="true"><span class="u-scroll"><svg class="ico" aria-hidden="true"><use href="#i-solid-arrow-down"></use></svg></span></span>
            <span class="u-loader" role="status" aria-label="Chargement des visuels">
                <svg viewBox="0 0 100 128" aria-hidden="true" focusable="false">
                    <path fill-rule="evenodd" d="M50 8C71 8 85 25 85 49c0 33-15 71-35 71S15 82 15 49C15 25 29 8 50 8z
                        M26 56q10-9 20 0-10 9-20 0z
                        M54 56q10-9 20 0-10 9-20 0z
                        M50 63q3 9 0 17-3-8 0-17z" />
                </svg>
            </span>
        </header>
        </div>`;

        const html = `
        ${statique
                ? `<a href="/spectacles/" class="u-close" aria-label="Retour au répertoire des spectacles">
            <svg class="ico" aria-hidden="true"><use href="#i-solid-xmark"></use></svg>
        </a>`
                : `<button type="button" class="u-close" aria-label="Fermer l’univers du spectacle">
            <svg class="ico" aria-hidden="true"><use href="#i-solid-xmark"></use></svg>
        </button>`}
        <!-- La barre de progression vaut aussi pour une page autonome : le
             panneau y défile dans sa propre boîte, exactement comme ici. -->
        <div class="u-progress" aria-hidden="true"><span></span></div>

        ${ouverture ? ouvertureHtml(uni, hero, tempo) : hero}

        <div class="u-figs">${figures}</div>

        <footer class="u-foot" id="u-foot">
            <h3 class="u-foot-title">${escape(footTitleText(etat))}</h3>
            ${footDatesHtml(etat)}
            <div class="u-actions">
                ${info.url ? `<a class="u-btn" href="${escape(info.url)}" target="_blank" rel="noopener">${isFilm ? 'Fiche du film' : 'Page du spectacle'}<span class="u-sr"> (nouvel onglet)</span> <svg class="ico" aria-hidden="true"><use href="#i-solid-up-right-from-square"></use></svg></a>` : ''}
                ${footGhostHtml(etat)}
            </div>
            ${prixBlock(uni)}
            ${castBlock(uni)}
            ${uni.credit ? `<p class="u-credit">Photographies : ${escape(uni.credit)}</p>` : ''}
        </footer>

<!-- Agrandissement : la photo entière, jamais recadrée. C'est le
             recours quand le plein cadre ne dit pas ce qu'on regarde. -->
        <div class="u-zoom" hidden role="dialog" aria-modal="true" aria-label="Photo agrandie">
            <button type="button" class="u-close u-zoom-close" aria-label="Fermer la photo">
                <svg class="ico" aria-hidden="true"><use href="#i-solid-xmark"></use></svg>
            </button>
            <button type="button" class="u-zoom-nav u-zoom-prev" aria-label="Photo précédente">
                <svg class="ico" aria-hidden="true"><use href="#i-solid-chevron-left"></use></svg>
            </button>
            <button type="button" class="u-zoom-nav u-zoom-next" aria-label="Photo suivante">
                <svg class="ico" aria-hidden="true"><use href="#i-solid-chevron-right"></use></svg>
            </button>
            <figure>
                <img alt="" decoding="async">
                <figcaption></figcaption>
            </figure>
        </div>`;

        // SUR UNE PAGE AUTONOME, TOUS LES TITRES MONTENT D'UN CRAN. Le titre
        // du spectacle y est le h1 de la page : les chapitres et le pied
        // passent de h3 à h2, le palmarès et la distribution de h4 à h3.
        // Sans cela la hiérarchie sautait un niveau (h1 puis h3), ce qu'un
        // lecteur d'écran fait entendre comme un trou dans le plan. La
        // feuille de style vise les deux niveaux (voir .u-chapter).
        return statique
            ? html.replace(/<(\/?)h3\b/g, '<$1h2').replace(/<(\/?)h4\b/g, '<$1h3')
            : html;
    }

    // ── Les représentations, au pied de l'univers ──────────────────
    //  Prend une liste déjà constituée plutôt que d'aller la chercher :
    //  le navigateur la tire de dates.js par upcomingPerformances(), le
    //  script de build la lit dans le même fichier. Deux chemins, un seul
    //  dessin — les dates ne sont dupliquées nulle part.
    function datesHtml(perfs) {
        if (!perfs || !perfs.length) return '';
        const rows = perfs.map(p => {
            const t = Array.isArray(p.times) && p.times.length ? p.times.join(' & ') : (p.time || '');
            // SUPERPOSÉE, PAS ACCOLÉE : « · séance scolaire » à la suite de
            // l'horaire allongeait la ligne au point de faire passer les
            // boutons à la ligne suivante, à un endroit différent d'une
            // représentation à l'autre. Un second bloc, empilé sous le
            // premier, tient dans la même largeur quel que soit l'horaire.
            const school = p.isSchool ? `<span class="u-warn">séance scolaire</span>` : '';
            // LES DONNÉES VOYAGENT DANS L'ATTRIBUT, PAS L'OUVERTURE DU
            // CALENDRIER. Ce fichier ne touche pas au DOM (voir l'en-tête) —
            // c'est univers.js qui lit `data-cal` au clic et construit le
            // .ics / les liens Google-Outlook. Un bouton sans icsDate ne
            // mène nulle part, donc on ne le pose pas.
            // Ce qui distingue cette ligne des autres, pour les libellés.
            const quand = [p.dateLabel, p.location].filter(Boolean).join(', ');
            const calBtn = p.icsDate
                ? `<button type="button" class="u-date-cal" data-cal="${escape(JSON.stringify({
                    title: p.title || '', subtitle: p.subtitle || '', location: p.location || '',
                    dateLabel: p.dateLabel || '', icsDate: p.icsDate, time: p.time || '', times: p.times || null
                }))}" aria-label="Ajouter au calendrier : ${escape(quand)}">
                    <svg class="ico" aria-hidden="true"><use href="#i-regular-calendar-plus"></use></svg>
                </button>` : '';
            // Le lien ne part que vers une page web (voir lienSur). Son texte
            // visible est « Réserver », le même sur chaque ligne : la date et
            // le lieu le complètent pour un lecteur d'écran, qui entendrait
            // sinon six « Réserver » sans savoir lequel est lequel.
            // `data-track` : le clic est compté comme ceux de l'onglet Dates
            // (même nom d'événement), sur l'accueil comme sur les pages
            // spectacle — voir brancherMesure dans univers.js.
            const billetterie = lienSur(p.bookingUrl);
            const bookBtn = billetterie
                ? `<a href="${escape(billetterie)}" target="_blank" rel="noopener" class="u-date-book" data-track="date_booking" data-track-detail="${escape(p.title || '')}">Réserver<span class="u-sr"> — ${escape(quand)} (nouvel onglet)</span>
                       <svg class="ico" aria-hidden="true"><use href="#i-solid-arrow-right"></use></svg></a>` : '';
            // DEUX COLONNES, PAS UNE SEULE LIGNE QUI S'ENROULE. .u-date-info
            // absorbe seule le retour à la ligne (date, lieu, horaire) ;
            // .u-date-actions ne s'enroule jamais et reste donc toujours au
            // même endroit à droite, quelle que soit la longueur du reste.
            return `<li class="u-date">
                <div class="u-date-info">
                    <span class="u-date-when">${escape(p.dateLabel)}</span>
                    <span class="u-date-where">${escape(p.location)}</span>
                    <span class="u-date-time">${t ? escape(t) : 'horaire à confirmer'}${school}</span>
                </div>
                <div class="u-date-actions">${calBtn}${bookBtn}</div>
            </li>`;
        }).join('');
        return `<ul class="u-dates">${rows}</ul>`;
    }

    // ── LES REPRÉSENTATIONS POUR LES MOTEURS DE RECHERCHE ─────────────
    //  Une représentation datée devient un événement schema.org
    //  (TheaterEvent) : c'est ce qui permet à une date de remonter dans les
    //  résultats enrichis de Google. Il était fabriqué DEUX FOIS — sur
    //  l'accueil, complet, et dans les pages /spectacles/, réduit à trois
    //  champs (ni heure, ni organisateur, ni image) alors que ce sont
    //  précisément ces pages qu'on fabrique pour être trouvées. Le voici
    //  écrit une fois, pour les deux.
    //
    //  Rien n'y est inventé : chaque champ vient d'un endroit du site — le
    //  synopsis et la durée de l'univers, la compagnie de la ligne du CV,
    //  le lieu, la ville, l'heure et la billetterie de la base.
    const SITE = 'https://adrienvada.fr';

    // Sites officiels des compagnies, confirmés par Adrien — une compagnie
    // absente d'ici n'a pas d'`url` plutôt qu'une adresse devinée.
    const SITE_ORGANISATEUR = {
        'Compagnie Crescite': 'https://crescite.fr/',
        'CDN de Normandie-Rouen': 'https://www.cdn-normandierouen.fr/',
        'Compagnie Alchimie': 'https://compagnie-alchimie.fr/',
        'Compagnie Bloomsbury': 'https://labloomsbury.wixsite.com/compagnie',
    };

    //  La durée est écrite en tête du montage, telle qu'on l'annonce au
    //  public : « 1h05 », « 40 min ». Le même champ sert ailleurs à
    //  numéroter des chapitres (« 4 épisodes ») — on ne retient que ce qui
    //  EST une durée, et seulement dans le premier temps du montage.
    const DUREE_LISIBLE = /^(?:(\d{1,2})\s*h\s*(\d{0,2})|(\d{1,3})\s*min)$/;
    function dureeMinutes(uni) {
        const bloc = (uni?.sequence || []).find(b => b && b.chapter);
        const m = bloc && String(bloc.chapter).trim().match(DUREE_LISIBLE);
        if (!m) return 0;
        return m[3] ? +m[3] : (+m[1]) * 60 + (+(m[2] || 0));
    }

    //  L'affiche si le spectacle en a une, sinon la première photo de son
    //  montage — la même règle que le répertoire.
    function photoPrincipale(uni) {
        if (!uni) return '';
        if (uni.affiche) return `ressources/images/univers/${uni.slug}/affiche.jpg`;
        const bloc = (uni.sequence || []).find(b => b && Array.isArray(b.p) && b.p.length);
        return bloc ? photoSrc(uni, bloc.p[0]) : '';
    }

    //  LA COUVERTURE DES VIGNETTES : la première photo du montage, dans sa
    //  version de 240 px — la seule que build/variantes-images.py fabrique
    //  à cette taille (voir couvertures() là-bas). L'affiche n'y a pas de
    //  place : elle n'existe pas en 240 px. Deux vignettes s'en servent,
    //  celle de l'onglet Dates (rangement par spectacle) et celle des lignes
    //  du CV ; la règle est donc écrite ici, une fois.
    //
    //  `repli` est la version de 640 px, qui existe toujours : une
    //  couverture manque si la photo a été changée sans relancer le script,
    //  et l'accueil se rabat alors sur elle (écouteur `data-repli`, dans
    //  index.html). Sans photo — un spectacle pas encore créé —, rien :
    //  l'appelant pose les initiales.
    function couverture(uni) {
        const bloc = (uni?.sequence || []).find(b => b && Array.isArray(b.p) && b.p.length);
        if (!bloc) return null;
        const base = `ressources/images/univers/${uni.slug}/${bloc.p[0]}`;
        return { src: `${base}-240.webp`, repli: `${base}-640.webp`, pos: framePos(uni, bloc, bloc.p[0]) || '' };
    }

    //  La compagnie est écrite sous le titre, dans le CV, avec deux
    //  conventions constantes : la BARRE OBLIQUE sépare deux coproducteurs,
    //  le TIRET CADRATIN sépare la compagnie de son metteur en scène
    //  (« Compagnie Crescite — Angelo Jossec »). On coupe donc au tiret
    //  entouré d'espaces : un metteur en scène n'est pas l'organisation qui
    //  produit, et « CDN de Normandie-Rouen » garde son trait d'union.
    function organisateurs(compagnie) {
        const noms = String(compagnie || '').split('/')
            .map(x => x.replace(/\s+/g, ' ').trim().split(/ [—–] /)[0].trim())
            .filter(Boolean);
        if (!noms.length) return null;
        const org = noms.map(name => {
            const o = { '@type': 'Organization', name };
            if (SITE_ORGANISATEUR[name]) o.url = SITE_ORGANISATEUR[name];
            return o;
        });
        return org.length === 1 ? org[0] : org;
    }

    //  L'HEURE N'A DE SENS QU'AVEC SON FUSEAU. « 20:00 » sans décalage est
    //  une heure flottante, que Google interprète comme il peut. Toutes les
    //  représentations sont en France métropolitaine : +01:00 en hiver,
    //  +02:00 en été, selon la date elle-même.
    function decalageParis(jour) {
        try {
            const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', timeZoneName: 'longOffset' });
            const nom = f.formatToParts(new Date(`${jour}T12:00:00Z`)).find(x => x.type === 'timeZoneName');
            const m = nom && nom.value.match(/([+-]\d{2}:\d{2})/);
            return m ? m[1] : '+01:00';
        } catch (e) { return '+01:00'; }
    }

    /**
     * Une représentation → un TheaterEvent.
     *   rep : { titre, sousTitre, lieu, ville, jour (AAAA-MM-JJ), heure, billetterie }
     *   ctx : { uni, compagnie } — ce que le site sait du spectacle (facultatif)
     */
    function evenementTheatre(rep, ctx) {
        if (!rep || !rep.jour) return null;
        const { uni = null, compagnie = '' } = ctx || {};
        const m = String(rep.heure || '').match(/(\d{1,2})[hH:](\d{2})?/);
        const tz = decalageParis(rep.jour);
        const deux = (n) => String(n).padStart(2, '0');
        const debut = m ? `${rep.jour}T${deux(m[1])}:${m[2] || '00'}:00${tz}` : rep.jour;

        const lieu = { '@type': 'Place', name: rep.lieu || rep.ville || '' };
        // Une adresse STRUCTURÉE : la ville et le pays, que Google exige
        // pour situer l'événement. Le lieu seul (« Tribunal judiciaire de
        // Rouen (76) ») ne disait pas où chercher.
        lieu.address = { '@type': 'PostalAddress', addressCountry: 'FR' };
        if (rep.ville) lieu.address.addressLocality = rep.ville;
        const dept = String(rep.lieu || '').match(/\((\d{2,3})\)\s*$/);
        if (dept) lieu.address.addressRegion = dept[1];

        const ev = {
            '@context': 'https://schema.org',
            '@type': 'TheaterEvent',
            name: rep.sousTitre ? `${rep.titre} (${rep.sousTitre})` : rep.titre,
            startDate: debut,
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            location: lieu,
            performer: { '@type': 'Person', '@id': `${SITE}/#adrien-vada`, name: 'Adrien Vada' },
            // La page du spectacle quand il en a une : c'est elle qu'un
            // moteur doit montrer, pas l'onglet des dates de l'accueil.
            url: uni && uni.slug ? `${SITE}/spectacles/${uni.slug}/` : `${SITE}/#page_dates`
        };
        if (uni) {
            const syn = toLines(uni.synopsis || '').join(' ').replace(/\s+/g, ' ').trim();
            if (syn) ev.description = syn;
            const img = photoPrincipale(uni);
            if (img) ev.image = `${SITE}/${img}`;
            // L'heure de fin se déduit de la durée annoncée — seulement si
            // l'on connaît l'heure de DÉBUT.
            const min = dureeMinutes(uni);
            if (m && min) {
                const [a, mo, j] = rep.jour.split('-').map(Number);
                const f = new Date(Date.UTC(a, mo - 1, j, +m[1], +(m[2] || 0) + min));
                ev.endDate = `${f.getUTCFullYear()}-${deux(f.getUTCMonth() + 1)}-${deux(f.getUTCDate())}` +
                    `T${deux(f.getUTCHours())}:${deux(f.getUTCMinutes())}:00${tz}`;
            }
        }
        // Sans heure, on dit au moins le JOUR de la fin : une représentation
        // du 25 novembre se termine le 25 novembre.
        if (!ev.endDate) ev.endDate = rep.jour;
        // Google veut une image pour chaque événement (la Search Console le
        // relève). Sans photo du spectacle — un univers sans montage, ou pas
        // d'univers du tout —, celle de l'interprète, qui joue ce soir-là :
        // la photo de partage du site, comme pour les pages spectacle.
        if (!ev.image) ev.image = `${SITE}/ressources/images/og-adrien-vada.jpg`;
        const org = organisateurs(compagnie);
        if (org) ev.organizer = org;
        // Pas de prix ni de devise : nous n'en avons pas, et les inventer
        // serait pire que le silence. L'offre ne dit que la billetterie. La
        // Search Console le relève (« price » et « priceCurrency » manquants),
        // sans gravité : l'événement s'affiche quand même.
        const billet = lienSur(rep.billetterie);
        if (billet) {
            ev.offers = { '@type': 'Offer', url: billet, availability: 'https://schema.org/InStock', validFrom: rep.jour };
        }
        return ev;
    }

    // UN BLOC JSON-LD EST DU TEXTE DANS UN <script>. JSON.stringify n'y
    // échappe pas « </ » : un nom de lieu qui contiendrait « </script>»
    // refermerait le bloc et ferait du reste du HTML — exécuté. On échappe
    // donc les chevrons, ce que tout lecteur JSON relit à l'identique.
    function jsonLd(objet) {
        return JSON.stringify(objet, null, 2)
            .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    }

    return {
        panelHtml, datesHtml, escape, lienSur, evenementTheatre, jsonLd, dureeMinutes, photoPrincipale, couverture, organisateurs,
        toLines, splitWords, splitChars, titleMetrics, revealWords,
        heroActionsHtml, footTitleText, footDatesHtml, footGhostHtml,
        longestLine, photoSrc, pictureHtml, framePos, figureHtml, overHtml, videoRef, flouSrc,
        photosOuverture, ouvertureHtml, poursuiteHtml, LUMIERES,
        videoHtml, afficheHtml, beatsHtml, prixBlock, castBlock,
        FRAMES, FRAME_PAIR, YT_ID, VIMEO_ID, VIDEO_REF, JAQUETTE_OK, LAYOUT_BY_COUNT
    };
})();

// Node : c'est par ici que le script de build entre.
if (typeof module !== 'undefined' && module.exports) module.exports = UniversMontage;
