#!/usr/bin/env node
/**
 * ============================================================
 *  PAGES SPECTACLE — une adresse indexable par univers
 * ============================================================
 *  POURQUOI CE SCRIPT EXISTE
 *  -------------------------
 *  Le site est une page unique dont tout le contenu d'univers est fabriqué
 *  par JavaScript au moment du clic. Un moteur de recherche qui lit
 *  index.html n'y voit donc ni synopsis, ni distribution, ni palmarès :
 *  la meilleure matière du site lui est invisible, et adrienvada.fr n'existe
 *  dans l'index que comme UNE page.
 *
 *  Ce script fabrique, pour chaque spectacle, une page réelle à son adresse —
 *  /spectacles/berenice/ — avec son texte dans le HTML, ses photos, ses dates
 *  et ses données structurées. Quelqu'un qui cherche « Bérénice Théâtre des
 *  Crescite » peut désormais tomber sur Adrien plutôt que sur la billetterie.
 *
 *  LA SOURCE RESTE UNIQUE
 *  ----------------------
 *  Rien n'est ressaisi ici. Tout est relu :
 *    · univers.js  → SHOW_UNIVERSES (titre, synopsis, distribution, palmarès,
 *                    palette, photos, crédit photo)
 *    · dates.js    → SHOW_DATA (les représentations à venir)
 *    · index.html  → la ligne de CV du spectacle (année, rôle, compagnie)
 *  Corriger un synopsis dans univers.js et relancer ce script suffit ; il n'y
 *  a pas de second endroit où la faute pourrait survivre.
 *
 *  QUAND LE RELANCER
 *  -----------------
 *  Après toute modification d'univers.js, de dates.js, ou d'une ligne de CV :
 *
 *      node build/generer-pages-spectacles.js
 *
 *  Le script réécrit /spectacles/ et sitemap.xml de bout en bout. Il est
 *  idempotent : le relancer sans rien changer ne produit aucune différence.
 *  Ne modifiez jamais un fichier de /spectacles/ à la main — il sera écrasé.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// LE MOTEUR DE MONTAGE, celui-là même dont se sert le panneau plein écran de
// la page d'accueil (voir univers-montage.js). C'est tout l'objet de ce
// fichier : une page spectacle n'est plus une pâle copie de son univers, elle
// EST son univers — mêmes chapitres, mêmes cartons, mêmes incrustations,
// mêmes groupes de vignettes. Il n'y a plus qu'un endroit où corriger le
// montage, et plus qu'une feuille de style (univers.css) où corriger le
// visage. La version précédente en avait deux, et la seconde aplatissait la
// séquence en une grille de photos.
const MONTAGE = require('../univers-montage.js');

// Toute espace — insécable, fine, insécable étroite — vaut une espace
// ordinaire. Voir universeFor() dans univers.js : c'est la même règle, et
// elle doit le rester.
const ESPACES = /[\s\u00a0\u202f\u2009\u2007\u2060]+/g;
const normaliserTitre = (t) => String(t || '').replace(ESPACES, ' ').trim();

const RACINE = path.join(__dirname, '..');
const SITE = 'https://adrienvada.fr';
const SORTIE = path.join(RACINE, 'spectacles');
const MAX_PHOTOS = 8;

const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');

// Le sprite d'icônes, relu dans index.html entre ses deux repères. Le montage
// pose des <use href="#i-solid-…"> : sans les <symbol> correspondants dans la
// page, les flèches et les croix seraient des trous. On le relit plutôt que de
// le recopier — il est lui-même généré (build/construire-sprite-icones.py).
function chargerSprite() {
    const src = lire('index.html');
    const d = src.indexOf('<!-- SPRITE-ICONES:DEBUT -->');
    const f = src.indexOf('<!-- SPRITE-ICONES:FIN -->');
    if (d === -1 || f === -1) {
        throw new Error('index.html : repères SPRITE-ICONES introuvables. ' +
            'Les pages spectacle en ont besoin — leurs icônes viennent de là.');
    }
    return src.slice(d, f + '<!-- SPRITE-ICONES:FIN -->'.length);
}

const SPRITE = chargerSprite();

// ── Extraction des données ──────────────────────────────────────────
//  On n'exécute pas univers.js (il lui faudrait un DOM) : on en découpe la
//  seule déclaration qui nous intéresse, celle qui précède l'IIFE, et on
//  l'évalue isolément. Si la structure du fichier changeait, l'assertion
//  ci-dessous romprait franchement plutôt que de produire des pages vides.
function chargerUnivers() {
    const src = lire('univers.js');
    const debut = src.indexOf('const SHOW_UNIVERSES = {');
    const fin = src.indexOf('\n(function () {', debut);
    if (debut === -1 || fin === -1) {
        throw new Error('univers.js : SHOW_UNIVERSES introuvable, ou l\'IIFE ne le suit plus. ' +
            'Le découpage de ce script part de ces deux repères — vérifiez-les avant de le corriger.');
    }
    return new Function(src.slice(debut, fin) + '\nreturn SHOW_UNIVERSES;')();
}

function chargerDates() {
    return new Function(lire('dates.js') + '\nreturn SHOW_DATA;')();
}

// La ligne de CV porte l'année, le rôle et la compagnie — trois informations
// qui ne sont nulle part dans univers.js et qu'un moteur a tout intérêt à
// lire. On les prélève dans index.html plutôt que de les recopier ici.
function lireLignesCv() {
    const src = lire('index.html');
    const lignes = {};
    // On découpe d'ABORD la ligne entière, puis on y cherche les attributs.
    // L'ordre des attributs varie d'une ligne à l'autre — certaines portent un
    // `data-cv-url` après `data-cv-show`, d'autres referment le tag à la ligne
    // suivante. Un motif qui exigerait « data-cv-show puis > » n'en attraperait
    // que deux sur dix, silencieusement.
    const bloc = /<li class="cv-item[\s\S]*?<\/li>/g;
    let m;
    while ((m = bloc.exec(src)) !== null) {
        const corps = m[0];
        const nom = corps.match(/data-cv-show="([^"]*)"/);
        if (!nom) continue;
        const cle = decodeEntites(nom[1]);
        const url = corps.match(/data-cv-url="([^"]*)"/);
        // La balise fermante est passée explicitement : `cv-role` est un <p> qui
        // CONTIENT un <span> (le mot « Rôle » en doré). Fermer sur la première
        // balise venue ne ramènerait que ce libellé, jamais le nom du rôle.
        const champ = (classe, tag) => {
            const r = new RegExp('class="[^"]*' + classe + '[^"]*"[^>]*>([\\s\\S]*?)<\\/' + tag + '>');
            const t = corps.match(r);
            return t ? texteSeul(t[1]) : '';
        };
        lignes[cle] = {
            annee: champ('cv-year', 'span'),
            // « Rôle · Antiochus » → « Antiochus » : le libellé est déjà porté
            // par le gabarit de la page générée.
            role: champ('cv-role', 'p').replace(/^R[oô]les?\s*·\s*/i, ''),
            compagnie: champ('cv-subtitle', 'p'),
            badge: champ('cv-badge', 'span'),
            url: url ? decodeEntites(url[1]) : ''
        };
    }
    return lignes;
}

const texteSeul = (html) => decodeEntites(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

function decodeEntites(s) {
    return String(s)
        .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── Lecture d'un univers ────────────────────────────────────────────

// Un synopsis peut être une chaîne OU un tableau — et un élément de tableau
// peut lui-même contenir des retours à la ligne, comme celui de Cassandres :
//     synopsis: ['Paris, 2077.\nPas de guerre nucléaire, …']
// Ne découper que les chaînes laissait donc passer ces retours jusque dans la
// balise <meta description>, où un saut de ligne n'a rien à faire. On aplatit
// des deux côtés, comme le fait toLines() dans le moteur de montage.
const lignes = (v) => (Array.isArray(v) ? v : [v])
    .flatMap(s => String(s == null ? '' : s).split('\n'))
    .map(s => s.trim()).filter(Boolean);

// Les photos du montage, dans l'ordre où on les rencontre, sans doublon, et
// seulement celles qui existent vraiment sur le disque : une vignette morte
// dans une page indexée est pire que pas de vignette.
function photosDe(uni) {
    const vues = new Set();
    const out = [];
    // `affiche: true` : le film ouvre son univers sur son affiche entière.
    // La page le suit — c'est elle qui devient la vignette de partage, et une
    // affiche se reconnaît là où un photogramme de tournage ne dit rien.
    if (uni.affiche) {
        const rel = `ressources/images/univers/${uni.slug}/affiche.jpg`;
        if (fs.existsSync(path.join(RACINE, rel))) out.push({ src: rel, legende: 'Affiche' });
    }
    (uni.sequence || []).forEach(bloc => {
        if (!bloc || !Array.isArray(bloc.p)) return;
        bloc.p.forEach((n, i) => {
            if (vues.has(n)) return;
            vues.add(n);
            const rel = `ressources/images/univers/${uni.slug}/${n}.jpg`;
            if (!fs.existsSync(path.join(RACINE, rel))) return;
            out.push({ src: rel, legende: (bloc.c && bloc.c[i]) || '' });
        });
    });
    return out.slice(0, MAX_PHOTOS);
}

// Les représentations à venir du spectacle, relues dans dates.js. La clé est
// le titre EXACT, comme partout ailleurs dans le site : pas de rapprochement
// approximatif, qui finirait par attribuer une date au mauvais spectacle.
function datesDe(cle, SHOW_DATA) {
    const jour = new Date();
    const aujourdhui = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate()).getTime();
    const enTemps = (ics) => {
        const p = String(ics || '').split('-');
        return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]).getTime() : NaN;
    };
    const out = [];
    (SHOW_DATA.upcoming || []).forEach(e => {
        if (e.title !== cle) return;
        const reps = (e.type === 'series' && Array.isArray(e.shows)) ? e.shows : [e];
        reps.forEach(r => {
            const t = enTemps(r.icsDate);
            if (!isNaN(t) && t < aujourdhui) return;
            out.push({
                iso: r.icsDate || '',
                label: r.dateLabel || e.dateLabel || '',
                heure: Array.isArray(r.times) ? r.times.join(' & ') : (r.time || ''),
                lieu: e.location || '',
                ville: e.city || '',
                scolaire: Boolean(r.isSchool || e.isSchool),
                billetterie: r.bookingUrl || e.bookingUrl || ''
            });
        });
    });
    return out;
}

// ── Données structurées ─────────────────────────────────────────────
function donneesStructurees(uni, titre, desc, dates, urlPage, photoOg) {
    const adrien = { '@type': 'Person', '@id': SITE + '/#adrien-vada', name: 'Adrien Vada' };
    const graphe = [];

    if (uni.kind === 'film') {
        graphe.push({
            '@context': 'https://schema.org', '@type': 'Movie',
            name: titre, description: desc, url: urlPage,
            image: photoOg || undefined, actor: adrien
        });
    } else {
        graphe.push({
            '@context': 'https://schema.org', '@type': 'CreativeWork',
            name: titre, description: desc, url: urlPage,
            image: photoOg || undefined, contributor: adrien
        });
        // Une représentation datée = un événement. C'est ce qui permet à une
        // date de remonter dans les résultats enrichis, comme sur la page
        // d'accueil (voir l'injection TheaterEvent dans index.html).
        dates.filter(d => d.iso).forEach(d => {
            graphe.push({
                '@context': 'https://schema.org', '@type': 'TheaterEvent',
                name: titre, startDate: d.iso, url: urlPage,
                eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                location: { '@type': 'Place', name: d.lieu, address: d.lieu },
                performer: adrien,
                organizer: uni.compagnie ? { '@type': 'Organization', name: uni.compagnie } : undefined
            });
        });
    }
    return graphe;
}

// ── Gabarit d'une page ──────────────────────────────────────────────
function pageSpectacle(uni, cle, cv, SHOW_DATA) {
    const titre = uni.title || cle;
    const dates = datesDe(cle, SHOW_DATA);
    const photos = photosDe(uni);
    const urlPage = `${SITE}/spectacles/${uni.slug}/`;
    const desc = lignes(uni.synopsis).join(' ').replace(/\s+/g, ' ').trim().slice(0, 300)
        || `${titre} — avec Adrien Vada.`;
    const photoOg = photos[0] ? `${SITE}/${photos[0].src}` : `${SITE}/ressources/images/og-adrien-vada.jpg`;
    const p = uni.palette || {};
    const titreComplet = `${titre}${uni.subtitle ? ' — ' + uni.subtitle : ''} · Adrien Vada`;

    // `info` a exactement la forme que rowInfo() produit dans le navigateur en
    // lisant la ligne du CV. Ici c'est le même contenu, relu dans index.html
    // au lieu du DOM — le gabarit ne fait pas la différence.
    const info = {
        year: cv.annee || '',
        title: titre,
        author: uni.subtitle ?? '',
        role: uni.role ?? cv.role ?? '',
        company: cv.compagnie || '',
        badge: cv.badge || '',
        url: cv.url || '',
        key: cle
    };

    // Un spectacle sans date à venir peut être arrêté OU pas encore créé :
    // c'est le badge de la ligne du CV qui les distingue, comme sur le site.
    const enCreation = /cr[ée]ation/i.test(cv.badge || '');

    // datesHtml attend le vocabulaire de dates.js (dateLabel, location,
    // isSchool) ; datesDe() renvoie le sien. On traduit ici plutôt que de
    // tordre l'un des deux : le moteur partagé ne doit pas connaître ce script.
    const perfs = dates.map(d => ({
        dateLabel: d.label, location: d.lieu, time: d.heure, isSchool: d.scolaire
    }));

    const panneau = MONTAGE.panelHtml(info, uni, {
        dates: MONTAGE.datesHtml(perfs),
        enCreation,
        statique: true
    });

    // Les chemins d'images du montage sont relatifs à la racine du site ;
    // cette page vit deux dossiers plus bas. On les rebase plutôt que de
    // toucher au moteur, dont ce n'est pas le problème.
    const corps = panneau
        .replace(/(src|data-u-src|srcset)="ressources\//g, '$1="../../ressources/')
        .replace(/url\((['"]?)ressources\//g, 'url($1../../ressources/');

    const jsonld = donneesStructurees(uni, titre, desc, dates, urlPage, photoOg)
        .map(o => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`)
        .join('\n    ');

    return `<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- PAGE GÉNÉRÉE — ne pas modifier à la main.
         Source : build/generer-pages-spectacles.js, qui appelle le MÊME
         moteur de montage que le panneau plein écran de la page d'accueil
         (univers-montage.js) et la MÊME feuille de style (univers.css). -->
    <title>${esc(titreComplet)}</title>
    <meta name="description" content="${esc(desc)}">
    <link rel="canonical" href="${urlPage}">
    <meta name="theme-color" content="${esc(p.bg || '#0a0907')}">

    <meta property="og:type" content="article">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:site_name" content="Adrien Vada">
    <meta property="og:title" content="${esc(titreComplet)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:image" content="${esc(photoOg)}">
    <meta property="og:url" content="${urlPage}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(titreComplet)}">
    <meta name="twitter:description" content="${esc(desc)}">
    <meta name="twitter:image" content="${esc(photoOg)}">

    <link rel="icon" type="image/png" href="../../favicon_io/favicon-96x96.png" sizes="96x96">
    <link rel="icon" type="image/svg+xml" href="../../favicon_io/favicon.svg">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@200;300;400;500;600;700&display=swap"
        rel="stylesheet">
    <link rel="stylesheet" href="../../univers.css">

    <!-- Le repli quand le script ne charge pas. Les mots du montage attendent
         à opacity 0 : sans JavaScript, la page serait un écran vide, et son
         texte invisible à qui doit l'indexer. Ce <noscript> les rend visibles
         d'un coup. Il ne coûte rien quand tout va bien : le navigateur ne
         charge cette feuille que s'il n'exécute pas de script. -->
    <noscript><link rel="stylesheet" href="../../univers-statique.css"></noscript>

    <!-- La palette du spectacle, injectée comme le panneau l'injecte sur
         #show-universe. Mêmes variables, mêmes valeurs : c'est ce qui donne
         à la page la couleur exacte de son univers. -->
    <style>
        body { margin: 0; background: ${p.bg || '#0a0907'}; }
        #show-universe {
            --u-bg: ${p.bg || '#0a0907'};
            --u-surface: ${p.surface || '#171410'};
            --u-text: ${p.text || '#f2ece0'};
            --u-muted: ${p.muted || '#b0a798'};
            --u-accent: ${p.accent || '#bfa98a'};
            --u-accent-ink: ${p.accentInk || p.accent || '#bfa98a'};
            --u-on-accent: ${p.onAccent || '#0a0907'};
            --u-line: ${p.line || 'rgba(255,255,255,0.14)'};
            --u-glow: ${p.glow || 'rgba(191,169,138,0.30)'};
        }
        /* Le retour au site : la seule chose que la page ajoute au montage. */
        .u-retour {
            position: absolute; top: 1.2rem; left: 1.4rem; z-index: 4;
            font: 700 .68rem/1 'Montserrat', system-ui, sans-serif;
            letter-spacing: .16em; text-transform: uppercase;
            color: var(--u-muted); text-decoration: none;
        }
        .u-retour:hover { color: var(--u-accent-ink); }
    </style>

    ${jsonld}
</head>

<!-- La classe u-page-spectacle est le signal que guette univers.js : elle lui
     dit que le panneau est déjà rempli et qu'il n'a qu'à lui donner vie —
     l'écriture du titre, la parallaxe, les révélations au défilement,
     l'agrandissement des photos. C'est le MÊME moteur que sur l'accueil, et
     c'est pourquoi la page ne se contente pas de ressembler à son univers :
     elle se comporte comme lui. -->
<body class="u-page-spectacle">
    ${SPRITE}
    <div id="show-universe">
        <a class="u-retour" href="../../">← Adrien Vada</a>
        ${corps}
    </div>

    <!-- Le moteur, dans l'ordre : le montage d'abord (univers.js s'en sert),
         puis univers.js, qui reconnaît la classe du <body> et anime le
         panneau déjà en place. Aucun des deux n'est propre à cette page. -->
    <script src="../../univers-montage.js"></script>
    <script src="../../univers.js"></script>
</body>

</html>
`;
}

// ── Le répertoire ───────────────────────────────────────────────────
//  Une plaque tournante, à /spectacles/. Un sitemap suffit à faire INDEXER
//  des pages, pas à leur donner du poids : sans un seul lien depuis le site,
//  chaque page de spectacle reste une île. Cette page les relie entre elles
//  et au reste — et elle a sa propre utilité, comme sommaire du répertoire.
//
//  Google la montre en lien de site sous adrienvada.fr : c'est une DEVANTURE
//  autant qu'un sommaire, et elle porte le même costume que le reste du
//  site — Cinzel, or sur noir, la couleur de chaque spectacle en signature
//  de sa carte.

// Le sprite complet pèse quarante et un dessins ; la page n'en montre que
// deux. On découpe les seuls <symbol> utiles — les mêmes icônes que les
// intitulés du CV, pour que le répertoire parle la même langue que lui.
function miniSprite(ids) {
    const symboles = ids.map(id => {
        const m = SPRITE.match(new RegExp(`<symbol id="${id}"[\\s\\S]*?</symbol>`));
        return m ? m[0] : '';
    }).filter(Boolean).join('');
    return symboles
        ? `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${symboles}</svg>`
        : '';
}

function pageRepertoire(fiches) {
    const url = `${SITE}/spectacles/`;
    const desc = 'Les spectacles et films d’Adrien Vada : rôles, distributions, dates et photographies.';
    // « août 2026 » — le répertoire est réécrit à chaque passage du script,
    // autant le dire au visiteur : une devanture datée inspire confiance.
    const misAJour = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
        .format(new Date());

    const carte = (f, i) => {
        // La couleur du spectacle signe sa carte — filet sous le titre, halo
        // au survol. C'est l'accent de sa ligne de CV quand elle en porte un,
        // celui de sa palette sinon : jamais une couleur inventée ici.
        const accent = f.accent || '#bfa98a';
        // Année · genre en fil de carte ; l'état (« En création », « En
        // tournée ») devient une pastille, comme un tampon de production —
        // il ne se mélange plus à la date. Espace normale avant le point
        // médian, insécable après : le retour à la ligne se fait devant le
        // point, qui part avec ce qu'il annonce.
        const fil = [f.annee, f.genre].filter(Boolean).join(' ·\u00A0');
        // Un spectacle sans photographie reçoit une COUVERTURE à ses
        // couleurs — titre en Cinzel sur l'aplat de sa palette, comme une
        // affiche d'attente. Un cadre vide se lisait comme une image en
        // panne ; une couverture dessinée dit « à venir ».
        const media = f.vignette
            ? `<img src="../${esc(f.vignette)}" alt="" loading="lazy" decoding="async" width="600" height="400">`
            : `<span class="carton" style="--cbg:${esc(f.paletteBg || '#171410')};--ctx:${esc(f.paletteText || '#f2ece0')}">
                    <span class="carton-orne" aria-hidden="true">✦</span>
                    <span class="carton-titre">${esc(f.titre)}</span>
                </span>`;
        return `
        <li class="carte" style="--ac:${esc(accent)};--i:${i}">
            <a href="${esc(f.slug)}/">
                <span class="cadre">${media}<span class="lueur" aria-hidden="true"></span></span>
                <span class="txt">
                    ${fil || f.badge ? `<span class="fil">
                        ${fil ? `<span class="annee">${esc(fil)}</span>` : ''}
                        ${f.badge ? `<span class="etat">${esc(f.badge)}</span>` : ''}
                    </span>` : ''}
                    <span class="nom">${esc(f.titre)}</span>
                    ${f.role ? `<span class="role">${esc(f.role)}</span>` : ''}
                </span>
            </a>
        </li>`;
    };

    // ── DEUX GROUPES ──
    // Le théâtre puis les films, chacun du plus récent au plus ancien. Mêlés,
    // un 2019 venait s'intercaler entre deux 2022 sans rien qui l'explique :
    // ça se lisait comme un tri cassé. Les intitulés reprennent ceux du CV,
    // jusqu'à leurs icônes — masques pour la scène, pellicule pour l'écran.
    const groupes = [
        { titre: 'Théâtre', icone: 'i-solid-masks-theater', fiches: fiches.filter(f => !f.film) },
        { titre: 'Courts-métrages', icone: 'i-solid-film', fiches: fiches.filter(f => f.film) }
    ].filter(g => g.fiches.length);

    const sections = groupes.map(g => `
        <section>
            <h2 class="groupe">
                <span class="groupe-ico" aria-hidden="true"><svg class="ico"><use href="#${g.icone}"></use></svg></span>
                <span>${esc(g.titre)}</span>
                <span class="groupe-filet" aria-hidden="true"></span>
            </h2>
            <ul class="repertoire">${g.fiches.map(carte).join('')}
            </ul>
        </section>`).join('');

    const liste = {
        '@context': 'https://schema.org', '@type': 'ItemList', name: 'Répertoire — Adrien Vada', url,
        itemListElement: fiches.map((f, i) => ({
            '@type': 'ListItem', position: i + 1, name: f.titre,
            url: `${SITE}/spectacles/${f.slug}/`
        }))
    };

    return `<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- PAGE GÉNÉRÉE — ne pas modifier à la main (build/generer-pages-spectacles.js). -->
    <title>Répertoire — Adrien Vada</title>
    <meta name="description" content="${esc(desc)}">
    <link rel="canonical" href="${url}">
    <meta name="theme-color" content="#0a0907">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:site_name" content="Adrien Vada">
    <meta property="og:title" content="Répertoire — Adrien Vada">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:image" content="${SITE}/ressources/images/og-adrien-vada.jpg">
    <meta property="og:url" content="${url}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/svg+xml" href="../favicon_io/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600&family=Montserrat:wght@600;700&display=swap">
    <link rel="stylesheet" href="spectacle.css">
    <style>
        :root {
            --bg: #0a0907; --surface: #171410; --text: #f2ece0; --muted: #b0a798;
            --accent: #bfa98a; --accent-ink: #c9b494; --on-accent: #0a0907;
            --line: rgba(255, 255, 255, 0.13);
        }
    </style>
    <script type="application/ld+json">
${JSON.stringify(liste, null, 2)}
    </script>
</head>

<body>
    ${miniSprite(['i-solid-masks-theater', 'i-solid-film'])}
    <a class="retour" href="../">← Adrien Vada</a>
    <main>
        <header class="tete">
            <p class="sur-titre">Adrien Vada — Artiste interprète</p>
            <h1>Répertoire</h1>
            <p class="ornement" aria-hidden="true"><span></span></p>
        </header>
        ${sections}
    </main>
    <footer>
        <p><a href="../">adrienvada.fr</a> · <a href="mailto:adrien.vada@gmail.com">adrien.vada@gmail.com</a></p>
        <p class="maj">Répertoire mis à jour en ${misAJour}.</p>
    </footer>
</body>

</html>
`;
}

// ── Feuille de style du répertoire ──────────────────────────────────
//  Chargée par la seule page /spectacles/ — les fiches, elles, portent
//  univers.css et leur palette. L'ancienne feuille gardait les règles d'une
//  première maquette des fiches (.bloc, .cast, .photos…) que plus aucune
//  page ne chargeait : elles sont parties avec elle.
const FEUILLE = `/* RÉPERTOIRE (/spectacles/) — feuille générée (build/generer-pages-spectacles.js)
   Le costume du site : Cinzel, or sur noir — et la couleur de chaque
   spectacle (--ac, posée sur sa carte) en signature. */
*, *::before, *::after { box-sizing: border-box; }
body {
    margin: 0; padding: 0 1.25rem 3.5rem;
    background: var(--bg); color: var(--text);
    font: 400 16px/1.65 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    /* Une lueur d'or au lever de rideau, rien de plus. */
    background-image: radial-gradient(58rem 26rem at 50% -6rem, rgba(191, 169, 138, .07), transparent 68%);
    background-repeat: no-repeat;
}
main { max-width: 64rem; margin: 0 auto; }
a { color: var(--accent-ink); }

.retour {
    display: inline-block; margin-top: 1.4rem;
    font-size: .72rem; letter-spacing: .14em; text-transform: uppercase;
    text-decoration: none; color: var(--muted);
    transition: color .25s ease;
}
.retour:hover { color: var(--accent-ink); }

/* ── La manchette ── */
.tete { padding: 3.2rem 0 2.4rem; text-align: center; }
.sur-titre {
    margin: 0 0 1rem; font: 700 .68rem/1.5 'Montserrat', system-ui, sans-serif;
    letter-spacing: .26em; text-transform: uppercase; color: var(--accent-ink);
}
h1 {
    margin: 0; font: 700 clamp(2.6rem, 7vw, 4rem)/1.05 'Cinzel', Georgia, serif;
    letter-spacing: .04em; color: var(--text); text-wrap: balance;
}
.ornement {
    position: relative; margin: 1.5rem auto 0; width: 11rem; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(191, 169, 138, .55), transparent);
}
.ornement span {
    position: absolute; left: 50%; top: 50%; width: 7px; height: 7px;
    transform: translate(-50%, -50%) rotate(45deg);
    background: var(--accent); box-shadow: 0 0 0 3px var(--bg);
}

/* ── Intitulés de groupe — les mêmes que le CV, icône comprise ── */
.groupe {
    display: flex; align-items: center; gap: .8rem; margin: 2.6rem 0 0;
    font: 700 .72rem/1 'Montserrat', system-ui, sans-serif;
    letter-spacing: .2em; text-transform: uppercase; color: var(--accent-ink);
}
.groupe-ico {
    display: grid; place-items: center; width: 1.9rem; height: 1.9rem;
    border: 1px solid var(--line); border-radius: .45rem;
    background: var(--surface); color: var(--accent-ink);
}
.ico { display: block; width: 1em; height: 1em; fill: currentColor; font-size: .8rem; }
.groupe-filet { flex: 1; height: 1px; background: linear-gradient(90deg, var(--line), transparent); }

/* ── Les cartes ── */
.repertoire {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(13.5rem, 1fr));
    gap: 1.9rem 1.6rem; margin: 0; padding: 1.8rem 0 .6rem;
    list-style: none; align-items: start;
}
.carte a { display: block; text-decoration: none; color: inherit; }
.carte a:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: .65rem; }
.cadre {
    position: relative; display: block; aspect-ratio: 3 / 2; overflow: hidden;
    border-radius: .65rem; border: 1px solid var(--line); background: var(--surface);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04), 0 10px 28px -18px rgba(0, 0, 0, .8);
    transition: border-color .35s ease, box-shadow .35s ease, transform .35s ease;
}
/* Le "height: 100%" prime sur l'attribut height="400" du balisage : les
   vignettes remplissent leur cadre 3/2 quel que soit le cadrage du fichier. */
.cadre img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .6s cubic-bezier(.2, .6, .2, 1); }
.lueur { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, transparent 55%, rgba(0, 0, 0, .3)); }

/* La couverture des spectacles sans photographie : l'aplat de leur palette,
   leur titre en Cinzel, un filet intérieur — une affiche d'attente, pas un
   cadre vide. */
.carton {
    position: absolute; inset: 0; display: grid; place-content: center; gap: .55rem;
    padding: 1rem 1.2rem; text-align: center;
    background: linear-gradient(155deg, color-mix(in srgb, var(--cbg) 88%, #f2ece0), var(--cbg));
}
.carton::after {
    content: ''; position: absolute; inset: .55rem; pointer-events: none;
    border: 1px solid color-mix(in srgb, var(--ctx) 22%, transparent); border-radius: .35rem;
}
.carton-orne { font-size: .7rem; color: var(--ac, var(--accent)); }
.carton-titre { font: 600 1.05rem/1.3 'Cinzel', Georgia, serif; color: var(--ctx); text-wrap: balance; }

.carte a:hover .cadre, .carte a:focus-visible .cadre {
    border-color: color-mix(in srgb, var(--ac, var(--accent)) 55%, transparent);
    box-shadow: 0 14px 34px -14px color-mix(in srgb, var(--ac, var(--accent)) 38%, transparent),
        0 10px 28px -18px rgba(0, 0, 0, .8);
    transform: translateY(-3px);
}
.carte a:hover .cadre img { transform: scale(1.045); }

.txt { display: block; padding-top: .7rem; }
.fil { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.annee {
    font-size: .6rem; line-height: 1.4; letter-spacing: .16em;
    text-transform: uppercase; color: var(--accent-ink);
}
.etat {
    font: 600 .55rem/1 'Inter', system-ui, sans-serif; letter-spacing: .12em;
    text-transform: uppercase; white-space: nowrap; color: var(--accent-ink);
    border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
    border-radius: 999px; padding: .22rem .5rem;
    background: color-mix(in srgb, var(--accent) 9%, transparent);
}
.nom {
    position: relative; display: block; margin-top: .3rem; padding-bottom: .5rem;
    font: 600 1.04rem/1.3 'Cinzel', Georgia, serif; color: var(--text);
    transition: color .3s ease;
}
.nom::after {
    content: ''; position: absolute; left: 0; bottom: 0; width: 1.4rem; height: 2px;
    background: var(--ac, var(--accent)); opacity: .55;
    transition: width .35s ease, opacity .35s ease;
}
.carte a:hover .nom { color: var(--accent-ink); }
.carte a:hover .nom::after { width: 2.6rem; opacity: 1; }
.role { display: block; margin-top: .3rem; font-size: .78rem; color: var(--muted); }

/* Entrée en scène : les cartes se lèvent une à une (--i, posé au balisage). */
@media (prefers-reduced-motion: no-preference) {
    html { scroll-behavior: smooth; }
    .carte { animation: se-lever .55s cubic-bezier(.2, .6, .2, 1) backwards; animation-delay: calc(var(--i, 0) * 55ms); }
}
@keyframes se-lever { from { opacity: 0; transform: translateY(14px); } }

footer {
    max-width: 64rem; margin: 2.6rem auto 0; padding-top: 1.4rem;
    border-top: 1px solid var(--line);
    font-size: .8rem; color: var(--muted); text-align: center;
}
footer a { text-decoration: none; }
footer a:hover { color: var(--accent-ink); }
.maj { margin: .4rem 0 0; font-size: .68rem; letter-spacing: .06em; opacity: .75; }

/* ── Téléphone : un catalogue, pas une liste ──
   Deux colonnes serrées — la grille reste une grille, et dix cartes
   tiennent en trois écrans au lieu de dix. */
@media (max-width: 640px) {
    body { padding: 0 .9rem 2.6rem; }
    .tete { padding: 2.3rem 0 1.8rem; }
    .sur-titre { font-size: .58rem; letter-spacing: .22em; margin-bottom: .8rem; }
    .ornement { margin-top: 1.1rem; width: 8.5rem; }
    .groupe { margin-top: 2rem; gap: .6rem; font-size: .64rem; letter-spacing: .16em; }
    .groupe-ico { width: 1.65rem; height: 1.65rem; }
    .repertoire { grid-template-columns: repeat(2, 1fr); gap: 1.25rem .8rem; padding: 1.2rem 0 .4rem; }
    .txt { padding-top: .5rem; }
    .fil { gap: .35rem; }
    .annee { font-size: .52rem; letter-spacing: .12em; }
    .etat { font-size: .48rem; padding: .18rem .4rem; }
    .nom { font-size: .84rem; margin-top: .22rem; padding-bottom: .4rem; }
    .nom::after { height: 1.5px; }
    .role { font-size: .68rem; margin-top: .2rem; }
    .carton-titre { font-size: .84rem; }
    .carton-orne { font-size: .58rem; }
    footer { margin-top: 2rem; }
}
`;

// ── Exécution ───────────────────────────────────────────────────────
function main() {
    const SHOW_UNIVERSES = chargerUnivers();
    const SHOW_DATA = chargerDates();
    const cvParTitre = lireLignesCv();
    // Les mêmes lignes, indexées sur leur titre normalisé : c'est ce
    // second jeu de clés qui sauve le rapprochement quand la typographie
    // diffère d'un fichier à l'autre.
    Object.keys(cvParTitre).forEach(k => {
        const n = normaliserTitre(k);
        if (!(n in cvParTitre)) cvParTitre[n] = cvParTitre[k];
    });

    fs.rmSync(SORTIE, { recursive: true, force: true });
    fs.mkdirSync(SORTIE, { recursive: true });
    fs.writeFileSync(path.join(SORTIE, 'spectacle.css'), FEUILLE);

    const faites = [];
    Object.keys(SHOW_UNIVERSES).forEach(cle => {
        const uni = SHOW_UNIVERSES[cle];
        if (!uni || !uni.slug) return;
        // Le titre est écrit deux fois — dans index.html et dans
        // SHOW_UNIVERSES — et une espace insécable a déjà suffi à les
        // séparer. On rapproche donc sur le titre normalisé, comme le fait
        // universeFor() dans univers.js.
        const cv = cvParTitre[cle] || cvParTitre[normaliserTitre(cle)] || {};
        const dossier = path.join(SORTIE, uni.slug);
        fs.mkdirSync(dossier, { recursive: true });
        fs.writeFileSync(path.join(dossier, 'index.html'), pageSpectacle(uni, cle, cv, SHOW_DATA));
        const photos = photosDe(uni);
        faites.push({
            slug: uni.slug,
            titre: uni.title || cle,
            annee: cv.annee || '',
            // L'année en nombre, pour trier. « 2018 - 2021 » donne 2018 : on
            // range sur le premier millésime venu, faute de mieux.
            anneeNum: parseInt((cv.annee || '').match(/\d{4}/)?.[0] || '0', 10),
            role: (uni.role || cv.role || '').replace(/^R[oô]les?\s*·\s*/i, ''),
            vignette: photos[0] ? photos[0].src : '',
            film: uni.kind === 'film',
            // Le genre voyage avec la fiche : il se lit dans le même souffle
            // que l'année, exactement comme dans le bandeau du panneau
            // (voir u-eyebrow dans univers-montage.js). Un répertoire dit
            // quand ET quoi — « 2024 · Tragédie » choisit mieux qu'une date.
            genre: uni.genre || '',
            // Le badge dit l'état — « En création », « En tournée ». Il vient
            // de la ligne de CV et complète le bandeau exactement comme dans
            // le panneau : année · genre · badge. Il explique au passage
            // pourquoi deux spectacles n'ont pas encore de photographie.
            badge: cv.badge || '',
            // La couleur du spectacle, pour signer sa carte : l'accent de sa
            // ligne de CV s'il en a un (cvAccent), celui de sa palette sinon.
            // Le fond et l'encre servent aux couvertures des spectacles sans
            // photo — leur carte est peinte à leurs couleurs, pas en gris.
            accent: uni.cvAccent || (uni.palette && uni.palette.accent) || '',
            paletteBg: (uni.palette && uni.palette.bg) || '',
            paletteText: (uni.palette && uni.palette.text) || '',
            cv: Boolean(cvParTitre[cle])
        });
    });

    // ── L'ORDRE DU RÉPERTOIRE ──
    // Du plus récent au plus ancien, comme se lit un CV. On trie ICI plutôt
    // que de se fier à l'ordre de SHOW_UNIVERSES : celui-ci est rangé de la
    // même façon (voir build/ordonner-univers.py), mais une entrée ajoutée à
    // la va-vite en fin de fichier ne doit pas se retrouver en fin de page.
    // À année égale, l'ordre du fichier tranche — c'est un choix éditorial,
    // pas un hasard, et le tri ne doit pas le bousculer.
    faites.forEach((f, i) => { f.rang = i; });
    // Les films après les spectacles, chacun par année décroissante.
    faites.sort((a, b) => (a.film - b.film) || (b.anneeNum - a.anneeNum) || (a.rang - b.rang));

    fs.writeFileSync(path.join(SORTIE, 'index.html'), pageRepertoire(faites));

    // ── sitemap ──
    const jour = new Date().toISOString().slice(0, 10);
    const urls = [`    <url>
        <loc>${SITE}/</loc>
        <lastmod>${jour}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>`,
    `    <url>
        <loc>${SITE}/spectacles/</loc>
        <lastmod>${jour}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.9</priority>
    </url>`].concat(faites.map(f => `    <url>
        <loc>${SITE}/spectacles/${f.slug}/</loc>
        <lastmod>${jour}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>`));

    fs.writeFileSync(path.join(RACINE, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

    console.log(`  ${faites.length} pages spectacle générées dans /spectacles/`);
    faites.forEach(f => console.log(`    /spectacles/${f.slug}/   ${f.titre}${f.cv ? '' : '   (aucune ligne de CV appariée)'}`));
    console.log(`  /spectacles/            répertoire (plaque tournante)`);
    console.log(`  sitemap.xml : ${faites.length + 2} adresses`);
}

main();
