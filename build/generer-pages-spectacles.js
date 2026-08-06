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
function pageRepertoire(fiches) {
    const url = `${SITE}/spectacles/`;
    const desc = 'Les spectacles et films d’Adrien Vada : rôles, distributions, dates et photographies.';
    const carte = (f) => `
        <li>
            <a href="${esc(f.slug)}/">
                <!-- Pas de repli quand il n'y a pas de photo. Un spectacle en
                     création n'en a pas encore : lui dessiner un cadre vide au
                     ratio 3/2 donnait un grand rectangle sombre qui se lit
                     comme une image qui n'a pas chargé — sur mobile, en
                     colonne unique, il occupait la moitié de l'écran. Mieux
                     vaut le seul texte, qui ne promet rien. -->
                ${f.vignette ? `<img src="../${esc(f.vignette)}" alt="" loading="lazy" decoding="async" width="600" height="400">` : ''}
                <span class="txt">
                    ${f.annee || f.genre ? `<span class="annee">${esc([f.annee, f.genre].filter(Boolean).join(' · '))}</span>` : ''}
                    <span class="nom">${esc(f.titre)}</span>
                    ${f.role ? `<span class="role">${esc(f.role)}</span>` : ''}
                </span>
            </a>
        </li>`;

    // ── DEUX GROUPES ──
    // Le théâtre puis les films, chacun du plus récent au plus ancien. Mêlés,
    // un 2019 venait s'intercaler entre deux 2022 sans rien qui l'explique :
    // ça se lisait comme un tri cassé. Les intitulés reprennent ceux du CV.
    const groupes = [
        { titre: 'Théâtre', fiches: fiches.filter(f => !f.film) },
        { titre: 'Courts-métrages', fiches: fiches.filter(f => f.film) }
    ].filter(g => g.fiches.length);

    const sections = groupes.map(g => `
        <h2 class="groupe">${esc(g.titre)}</h2>
        <ul class="repertoire">${g.fiches.map(carte).join('')}
        </ul>`).join('');

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
    <a class="retour" href="../">← Adrien Vada</a>
    <main>
        <header class="tete">
            <h1>Répertoire</h1>
            <p class="sous-titre">${esc(desc)}</p>
        </header>
        ${sections}
    </main>
    <footer>
        <p><a href="../">adrienvada.fr</a> · <a href="mailto:adrien.vada@gmail.com">adrien.vada@gmail.com</a></p>
    </footer>
</body>

</html>
`;
}

// ── Feuille de style commune ────────────────────────────────────────
const FEUILLE = `/* PAGES SPECTACLE — feuille commune (générée : build/generer-pages-spectacles.js)
   Les couleurs viennent de chaque page, qui les tient de la palette de son
   spectacle dans univers.js. Ici, seulement la mise en page. */
*, *::before, *::after { box-sizing: border-box; }
body {
    margin: 0; padding: 0 1.25rem 4rem;
    background: var(--bg); color: var(--text);
    font: 400 16px/1.65 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
}
main { max-width: 46rem; margin: 0 auto; }
a { color: var(--accent-ink); }
.retour {
    display: inline-block; margin: 1.5rem auto 0; max-width: 46rem;
    font-size: .75rem; letter-spacing: .12em; text-transform: uppercase;
    text-decoration: none; color: var(--muted);
}
.retour:hover { color: var(--accent-ink); }
.tete { padding: 2.5rem 0 1.5rem; border-bottom: 1px solid var(--line); }
.annee { margin: 0 0 .75rem; font-size: .7rem; letter-spacing: .18em; text-transform: uppercase; color: var(--accent-ink); }
h1 { margin: 0; font: 700 clamp(2rem, 7vw, 3.25rem)/1.05 'Cinzel', Georgia, serif; letter-spacing: -.01em; }
.sous-titre { margin: .5rem 0 0; font-size: 1rem; font-style: italic; color: var(--muted); }
.role { margin: 1.25rem 0 0; font-size: .95rem; }
.role span { color: var(--accent-ink); font-weight: 600; }
.compagnie { margin: .25rem 0 0; font-size: .85rem; color: var(--muted); }
.bloc { padding: 2rem 0; border-bottom: 1px solid var(--line); }
.bloc h2 { margin: 0 0 1rem; font-size: .7rem; letter-spacing: .18em; text-transform: uppercase; color: var(--accent-ink); font-weight: 700; }
.synopsis p { margin: 0 0 .5rem; font-size: 1.15rem; line-height: 1.55; }
ul { margin: 0; padding: 0; list-style: none; }
.cast li, .palmares li, .dates li { padding: .45rem 0; border-bottom: 1px solid var(--line); }
.cast li:last-child, .palmares li:last-child, .dates li:last-child { border-bottom: 0; }
.prix { color: var(--accent-ink); font-weight: 600; }
.ou { color: var(--muted); }
.dates li { display: flex; flex-wrap: wrap; gap: .25rem 1rem; align-items: baseline; }
.quand { font-weight: 600; }
.note { margin: .5rem 0 0; font-size: .8rem; color: var(--muted); }
.lien {
    padding: .15rem .6rem; border-radius: .4rem;
    background: var(--accent); color: var(--on-accent);
    font-size: .7rem; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; text-decoration: none;
}
.photos { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; }
figure { margin: 0; }
figure img { width: 100%; height: auto; border-radius: .5rem; display: block; background: var(--surface); }
figcaption { margin-top: .4rem; font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.cta { padding: 2.5rem 0; text-align: center; }
.cta a {
    display: inline-block; padding: .7rem 1.4rem; border-radius: .6rem;
    background: var(--accent); color: var(--on-accent);
    font-weight: 700; font-size: .8rem; letter-spacing: .1em;
    text-transform: uppercase; text-decoration: none;
}
footer { max-width: 46rem; margin: 0 auto; padding-top: 1.5rem; border-top: 1px solid var(--line); font-size: .8rem; color: var(--muted); text-align: center; }

/* Le répertoire (/spectacles/) */
.groupe {
    margin: 2.5rem 0 0; padding-bottom: .5rem;
    border-bottom: 1px solid var(--line);
    font: 700 .7rem/1 'Montserrat', system-ui, sans-serif;
    letter-spacing: .18em; text-transform: uppercase; color: var(--accent-ink);
}
.groupe:first-of-type { margin-top: 1.5rem; }
.repertoire { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 1.25rem; padding: 2rem 0; align-items: start; }
.repertoire a { display: block; text-decoration: none; color: inherit; }
/* Le "height: auto" n'est pas décoratif : l'attribut height="400" du balisage
   agit comme indication de présentation et fixe une hauteur définie. Avec une
   largeur ET une hauteur définies, l'aspect-ratio n'a plus rien à calculer :
   les vignettes reprennent le cadrage du fichier — portrait pour les unes,
   paysage pour les autres — et la grille part en dents de scie. Le repasser
   à auto redonne la main au ratio. */
.repertoire img {
    display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover;
    border-radius: .5rem; background: var(--surface);
    transition: opacity .35s ease;
}
.repertoire a:hover img { opacity: .78; }
.repertoire .txt { display: block; padding-top: .6rem; }
.repertoire .annee {
    display: block; font-size: .65rem; line-height: 1.5; letter-spacing: .14em;
    text-transform: uppercase; color: var(--accent-ink);
}
.repertoire .nom { display: block; font: 600 1rem/1.25 'Cinzel', Georgia, serif; margin-top: .15rem; }
.repertoire .role { display: block; font-size: .78rem; color: var(--muted); margin-top: .15rem; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
`;

// ── Exécution ───────────────────────────────────────────────────────
function main() {
    const SHOW_UNIVERSES = chargerUnivers();
    const SHOW_DATA = chargerDates();
    const cvParTitre = lireLignesCv();

    fs.rmSync(SORTIE, { recursive: true, force: true });
    fs.mkdirSync(SORTIE, { recursive: true });
    fs.writeFileSync(path.join(SORTIE, 'spectacle.css'), FEUILLE);

    const faites = [];
    Object.keys(SHOW_UNIVERSES).forEach(cle => {
        const uni = SHOW_UNIVERSES[cle];
        if (!uni || !uni.slug) return;
        const cv = cvParTitre[cle] || {};
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
