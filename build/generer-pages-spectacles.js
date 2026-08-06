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

const RACINE = path.join(__dirname, '..');
const SITE = 'https://adrienvada.fr';
const SORTIE = path.join(RACINE, 'spectacles');
const MAX_PHOTOS = 8;

const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');

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

const lignes = (v) => (Array.isArray(v) ? v : String(v || '').split('\n'))
    .map(s => s.trim()).filter(Boolean);

// Les photos du montage, dans l'ordre où on les rencontre, sans doublon, et
// seulement celles qui existent vraiment sur le disque : une vignette morte
// dans une page indexée est pire que pas de vignette.
function photosDe(uni) {
    const vues = new Set();
    const out = [];
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
    const sousTitre = uni.subtitle || '';
    // `uni.role` sert d'étiquette libre dans le panneau plein écran, où elle
    // s'affiche telle quelle : elle peut donc porter son propre libellé
    // (« Rôle · Steven ») ou tout autre chose (« Court métrage · 12 minutes »).
    // Ici le libellé est déjà dans le gabarit — on retire le doublon, et on
    // n'affiche « Rôle » que quand la valeur en est bien un.
    const roleBrut = uni.role || cv.role || '';
    const estUnRole = !uni.role || /^R[oô]les?\s*·/i.test(uni.role) || Boolean(cv.role);
    const role = roleBrut.replace(/^R[oô]les?\s*·\s*/i, '');
    const desc = lignes(uni.synopsis).join(' ').slice(0, 300)
        || `${titre} — ${role ? role + ', ' : ''}avec Adrien Vada.`;
    const photos = photosDe(uni);
    const dates = datesDe(cle, SHOW_DATA);
    const urlPage = `${SITE}/spectacles/${uni.slug}/`;
    const photoOg = photos[0] ? `${SITE}/${photos[0].src}` : `${SITE}/ressources/images/og-adrien-vada.jpg`;
    const p = uni.palette || {};

    const titreComplet = `${titre}${sousTitre ? ' — ' + sousTitre : ''} · Adrien Vada`;

    const blocPalmares = (uni.prix && uni.prix.length) ? `
      <section class="bloc">
        <h2>Distinctions</h2>
        <ul class="palmares">
          ${lignes(uni.prix).map(l => {
        const i = l.indexOf('·');
        return i === -1
            ? `<li><span class="prix">${esc(l)}</span></li>`
            : `<li><span class="prix">${esc(l.slice(0, i).trim())}</span> <span class="ou">${esc(l.slice(i + 1).trim())}</span></li>`;
    }).join('\n          ')}
        </ul>
      </section>` : '';

    const blocDistribution = (uni.cast && uni.cast.length) ? `
      <section class="bloc">
        <h2>Distribution</h2>
        <ul class="cast">
          ${uni.cast.map(n => `<li>${esc(n)}</li>`).join('\n          ')}
        </ul>
        ${uni.castNote ? `<p class="note">${esc(uni.castNote)}</p>` : ''}
      </section>` : '';

    const blocDates = dates.length ? `
      <section class="bloc">
        <h2>Prochaines représentations</h2>
        <ul class="dates">
          ${dates.map(d => `<li>
            <span class="quand">${esc(d.label)}${d.heure ? ' · ' + esc(d.heure) : ''}</span>
            <span class="ou">${esc(d.lieu)}</span>
            ${d.scolaire ? '<span class="note">Séance scolaire, accès restreint</span>' : ''}
            ${d.billetterie && !d.scolaire ? `<a class="lien" href="${esc(d.billetterie)}" rel="noopener">Réserver</a>` : ''}
          </li>`).join('\n          ')}
        </ul>
      </section>` : '';

    const blocPhotos = photos.length ? `
      <section class="bloc">
        <h2>Photographies</h2>
        <div class="photos">
          ${photos.map((ph, i) => `<figure>
            <img src="../../${esc(ph.src)}" alt="${esc(titre)} — photographie ${i + 1}${ph.legende ? ' : ' + ph.legende : ''}"
                 loading="lazy" decoding="async" width="1200" height="800">
            ${ph.legende ? `<figcaption>${esc(ph.legende)}</figcaption>` : ''}
          </figure>`).join('\n          ')}
        </div>
        ${uni.credit ? `<p class="note">Photographies : ${esc(uni.credit)}</p>` : ''}
      </section>` : '';

    const jsonld = donneesStructurees(uni, titre, desc, dates, urlPage, photoOg)
        .map(o => `<script type="application/ld+json">\n${JSON.stringify(o, null, 2)}\n</script>`)
        .join('\n    ');

    return `<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- PAGE GÉNÉRÉE — ne pas modifier à la main.
         Source : build/generer-pages-spectacles.js, à partir d'univers.js,
         dates.js et index.html. Toute retouche ici sera écrasée au prochain
         passage du script. -->
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
    <link rel="stylesheet" href="../spectacle.css">

    <!-- La page prend les couleurs du spectacle, comme son univers sur le site. -->
    <style>
        :root {
            --bg: ${p.bg || '#0a0907'};
            --surface: ${p.surface || '#171410'};
            --text: ${p.text || '#f2ece0'};
            --muted: ${p.muted || '#b0a798'};
            --accent: ${p.accent || '#bfa98a'};
            --accent-ink: ${p.accentInk || p.accent || '#bfa98a'};
            --on-accent: ${p.onAccent || '#0a0907'};
            --line: ${p.line || 'rgba(255,255,255,0.14)'};
        }
    </style>

    ${jsonld}
</head>

<body>
    <a class="retour" href="../../">← Adrien Vada</a>

    <main>
        <header class="tete">
            ${cv.annee ? `<p class="annee">${esc(cv.annee)}${cv.badge ? ' · ' + esc(cv.badge) : ''}</p>` : ''}
            <h1>${esc(titre)}</h1>
            ${sousTitre ? `<p class="sous-titre">${esc(sousTitre)}</p>` : ''}
            ${role ? `<p class="role">${estUnRole ? '<span>Rôle</span> ' : ''}${esc(role)}</p>` : ''}
            ${cv.compagnie ? `<p class="compagnie">${esc(cv.compagnie)}</p>` : ''}
            ${cv.url ? `<p class="compagnie"><a href="${esc(cv.url)}" rel="noopener">${uni.kind === 'film' ? 'Fiche du film' : 'Page officielle du spectacle'}</a></p>` : ''}
        </header>

        ${lignes(uni.synopsis).length ? `<section class="bloc synopsis">
          ${lignes(uni.synopsis).map(l => `<p>${esc(l)}</p>`).join('\n          ')}
        </section>` : ''}
        ${blocPalmares}
        ${blocDates}
        ${blocPhotos}
        ${blocDistribution}

        <!-- Le vrai lieu de ce spectacle reste son univers sur le site : le
             montage, les cartons, le générique. Cette page en est la porte
             d'entrée pour un moteur de recherche, pas le remplacement. -->
        <p class="cta">
            <a href="../../#/univers/${esc(uni.slug)}">Voir l'univers de ${esc(titre)}</a>
        </p>
    </main>

    <footer>
        <p><a href="../../">adrienvada.fr</a> · <a href="mailto:adrien.vada@gmail.com">adrien.vada@gmail.com</a></p>
    </footer>
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
    const items = fiches.map((f, i) => `
        <li>
            <a href="${esc(f.slug)}/">
                ${f.vignette ? `<img src="../${esc(f.vignette)}" alt="" loading="lazy" decoding="async" width="600" height="400">` : '<span class="sans-photo" aria-hidden="true"></span>'}
                <span class="txt">
                    ${f.annee ? `<span class="annee">${esc(f.annee)}</span>` : ''}
                    <span class="nom">${esc(f.titre)}</span>
                    ${f.role ? `<span class="role">${esc(f.role)}</span>` : ''}
                </span>
            </a>
        </li>`).join('');

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
        <ul class="repertoire">${items}
        </ul>
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
.repertoire { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 1.25rem; padding: 2rem 0; }
.repertoire a { display: block; text-decoration: none; color: inherit; }
/* Le "height: auto" n'est pas décoratif : l'attribut height="400" du balisage
   agit comme indication de présentation et fixe une hauteur définie. Avec une
   largeur ET une hauteur définies, l'aspect-ratio n'a plus rien à calculer :
   les vignettes reprennent le cadrage du fichier — portrait pour les unes,
   paysage pour les autres — et la grille part en dents de scie. Le repasser
   à auto redonne la main au ratio. */
.repertoire img, .repertoire .sans-photo {
    display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover;
    border-radius: .5rem; background: var(--surface);
    transition: opacity .35s ease;
}
.repertoire a:hover img { opacity: .78; }
.repertoire .txt { display: block; padding-top: .6rem; }
.repertoire .annee { display: block; font-size: .65rem; letter-spacing: .16em; color: var(--accent-ink); }
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
            role: (uni.role || cv.role || '').replace(/^R[oô]les?\s*·\s*/i, ''),
            vignette: photos[0] ? photos[0].src : '',
            cv: Boolean(cvParTitre[cle])
        });
    });

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
