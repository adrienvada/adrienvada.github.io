#!/usr/bin/env node
/**
 * ============================================================
 *  GALERIE PHOTO — une page dédiée pour le book photographique
 * ============================================================
 *  Ce script fabrique la page /galerie/index.html et /galerie/galerie.css
 *  à partir de la liste déclarée dans galerie.js (GALLERY_IMAGES).
 *
 *  Il reprend l'architecture tactile et visuelle du répertoire de spectacles :
 *    · Grille responsive multi-colonnes
 *    · Pincement tactile (pinch-to-zoom 2 à 5 colonnes avec FLIP)
 *    · Visionneuse plein écran haute définition (navigation, swipe, clavier)
 *    · Barre d'en-tête collante, retour accueil et bascule de thème
 *
 *  QUAND LE RELANCER
 *  -----------------
 *  Après toute modification de galerie.js :
 *      node build/generer-page-galerie.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RACINE = path.join(__dirname, '..');
const SITE = 'https://adrienvada.fr';
const SORTIE_DIR = path.join(RACINE, 'galerie');

const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');

// Échappement HTML sécurisé
function esc(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Extraction du sprite d'icônes depuis index.html
function chargerSprite() {
    const src = lire('index.html');
    const d = src.indexOf('<!-- SPRITE-ICONES:DEBUT -->');
    const f = src.indexOf('<!-- SPRITE-ICONES:FIN -->');
    if (d === -1 || f === -1) {
        throw new Error('index.html : repères SPRITE-ICONES introuvables.');
    }
    return src.slice(d, f + '<!-- SPRITE-ICONES:FIN -->'.length);
}

// Extraction des images depuis galerie.js
function chargerGalerie() {
    const src = lire('galerie.js');
    const ctx = {};
    vm.runInNewContext(src + '\n; this.GALLERY_IMAGES = GALLERY_IMAGES;', ctx);
    if (!Array.isArray(ctx.GALLERY_IMAGES)) {
        throw new Error('galerie.js : GALLERY_IMAGES introuvable.');
    }
    return ctx.GALLERY_IMAGES;
}

const SPRITE = chargerSprite();
const IMAGES = chargerGalerie();

function genererCss() {
    return `/* GALERIE PHOTO (/galerie/) — feuille générée (build/generer-page-galerie.js)
   Même univers visuel que le répertoire de spectacles : Cinzel, Inter, Montserrat,
   or sur noir, grain de pellicule, grille zoomable au pincement. */
*, *::before, *::after { box-sizing: border-box; }

@property --ambiance {
    syntax: '<color>';
    inherits: true;
    initial-value: #bfa98a;
}

:root {
    --bg: #0a0907;
    --surface: #171410;
    --text: #f2ece0;
    --muted: #b0a798;
    --accent: #bfa98a;
    --accent-ink: #c9b494;
    --on-accent: #0a0907;
    --line: rgba(255, 255, 255, 0.13);
    --ombre: rgba(0, 0, 0, .8);
    --vignette: rgba(0, 0, 0, .28);
    --or-defaut: #bfa98a;
}

:root[data-theme="light"] {
    --bg: #faf9f5;
    --surface: #ffffff;
    --text: #1a1a1f;
    --muted: #575761;
    --accent: #967e5b;
    --accent-ink: #826c4a;
    --on-accent: #ffffff;
    --line: rgba(26, 26, 31, 0.14);
    --ombre: rgba(41, 37, 36, .28);
    --vignette: rgba(41, 37, 36, .10);
    --or-defaut: #967e5b;
}

body {
    position: relative;
    margin: 0;
    padding: 0 1.25rem 3.5rem;
    background: var(--bg);
    color: var(--text);
    font: 400 16px/1.65 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    --ambiance: var(--or-defaut);
    transition: background-color .35s ease, color .35s ease;
}

body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: radial-gradient(58rem 30rem at 50% -8rem,
            color-mix(in srgb, var(--ambiance) 9%, transparent), transparent 68%);
}

body::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 40;
    pointer-events: none;
    background:
        radial-gradient(130% 110% at 50% 12%, transparent 58%, var(--vignette) 100%),
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.06'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E") repeat;
}

main {
    max-width: 68rem;
    margin: 0 auto;
    touch-action: pan-y;
}

a { color: var(--accent-ink); }

/* ── La barre d'en-tête flottante ── */
.barre-sentinelle {
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
}

.barre {
    position: sticky;
    top: .75rem;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    max-width: 68rem;
    margin: .65rem auto 0;
    padding: .4rem .55rem;
    border: 1px solid transparent;
    border-radius: 999px;
}

.barre.est-collee {
    background: color-mix(in srgb, var(--surface) 94%, var(--ambiance));
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    border-color: color-mix(in srgb, var(--ambiance) 30%, transparent);
    box-shadow: 0 8px 22px -10px rgba(0, 0, 0, .55),
        0 0 20px -6px color-mix(in srgb, var(--ambiance) 38%, transparent);
    padding-left: .9rem;
    padding-right: .55rem;
}

@media (prefers-reduced-motion: no-preference) {
    .barre {
        transition: background-color 240ms ease, box-shadow 240ms ease, border-color 240ms ease, padding 240ms ease;
    }
}

.retour {
    display: inline-block;
    font-size: .72rem;
    letter-spacing: .14em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--muted);
    transition: color .25s ease;
}

.retour:hover { color: var(--accent-ink); }

.bascule {
    display: grid;
    place-items: center;
    width: 2.3rem;
    height: 2.3rem;
    flex: none;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    color: #fbbf24;
    cursor: pointer;
    transition: border-color .3s ease, color .3s ease, background-color .35s ease;
}

:root[data-theme="light"] .bascule { color: #6366a8; }
.bascule:hover { border-color: color-mix(in srgb, var(--accent) 55%, transparent); }
.bascule .ico { font-size: .95rem; }
.ico { display: block; width: 1em; height: 1em; fill: currentColor; }

/* ── Titre et manchette ── */
.tete {
    padding: 3.2rem 0 2.2rem;
    text-align: center;
}

.sur-titre {
    margin: 0 0 1rem;
    font: 700 .68rem/1.5 'Montserrat', system-ui, sans-serif;
    letter-spacing: .26em;
    text-transform: uppercase;
    color: var(--accent-ink);
}

h1 {
    margin: 0;
    font: 700 clamp(2.4rem, 6.5vw, 3.8rem)/1.05 'Cinzel', Georgia, serif;
    letter-spacing: .04em;
    color: var(--text);
    text-wrap: balance;
}

.ornement {
    position: relative;
    margin: 1.5rem auto 0;
    width: 11rem;
    height: 1px;
    background: linear-gradient(90deg, transparent,
            color-mix(in srgb, var(--ambiance) 60%, transparent), transparent);
}

.ornement span {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 7px;
    height: 7px;
    transform: translate(-50%, -50%) rotate(45deg);
    background: var(--ambiance);
    box-shadow: 0 0 0 3px var(--bg);
}

.sous-titre-galerie {
    margin: 1.2rem 0 0;
    font: 500 .72rem/1.5 'Montserrat', system-ui, sans-serif;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: var(--muted);
}

/* ── Grille de photographies ── */
.repertoire {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
    gap: 1.5rem 1.2rem;
    margin: 0;
    padding: 1.8rem 0 .6rem;
    list-style: none;
    align-items: start;
}

.carte {
    position: relative;
    list-style: none;
}

.carte-btn {
    display: block;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-align: left;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}

.carte-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
    border-radius: .65rem;
}

.cadre {
    position: relative;
    display: block;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    overflow: clip;
    border-radius: .65rem;
    border: 1px solid var(--line);
    background: var(--surface);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04), 0 10px 28px -18px var(--ombre);
    transition: border-color .35s ease, box-shadow .35s ease, transform .35s ease;
}

.media {
    position: absolute;
    inset: 0;
    display: block;
}

.media img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 30%;
    transition: transform .6s cubic-bezier(.2, .6, .2, 1);
}

.lueur {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(180deg, transparent 65%, rgba(0, 0, 0, .4));
}

.zoom-indic {
    position: absolute;
    bottom: .6rem;
    right: .6rem;
    display: grid;
    place-items: center;
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 999px;
    background: rgba(10, 9, 7, .65);
    color: var(--accent-ink);
    border: 1px solid var(--line);
    font-size: .75rem;
    opacity: 0;
    transform: scale(.85);
    transition: opacity .3s ease, transform .3s ease;
    pointer-events: none;
}

.carte-btn:hover .zoom-indic,
.carte.regarde .zoom-indic,
.carte-btn:focus-visible .zoom-indic {
    opacity: 1;
    transform: scale(1);
}

.carte-btn:hover .cadre,
.carte.regarde .cadre,
.carte-btn:focus-visible .cadre {
    border-color: color-mix(in srgb, var(--accent) 65%, transparent);
    box-shadow: 0 16px 36px -12px color-mix(in srgb, var(--accent) 45%, transparent),
        0 10px 28px -18px rgba(0, 0, 0, .8);
    transform: translateY(-3px);
}

.carte-btn:hover .media img,
.carte.regarde .media img {
    transform: scale(1.05);
}

/* Scintillement ponctuel */
.cadre::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 42%, rgba(255, 236, 200, .2) 50%, transparent 58%);
    transform: translateX(-135%);
}

.carte.reluit .cadre::after {
    transform: translateX(135%);
    transition: transform 1.3s cubic-bezier(.2, .6, .2, 1);
}

/* ── Gestion du zoom multi-colonnes (Pinch-to-zoom) ── */
html[data-zoom] .repertoire {
    grid-template-columns: repeat(var(--colonnes, 3), 1fr);
}
html[data-zoom="1"] { --colonnes: 1; }
html[data-zoom="2"] { --colonnes: 2; }
html[data-zoom="3"] { --colonnes: 3; }
html[data-zoom="4"] { --colonnes: 4; }
html[data-zoom="5"] { --colonnes: 5; }
html[data-zoom="6"] { --colonnes: 6; }

@media (max-width: 640px) {
    html[data-zoom="3"] .repertoire { gap: .8rem .5rem; }
    html[data-zoom="4"] .repertoire { gap: .45rem .35rem; }
}

/* ── Visionneuse plein écran (Lightbox) ── */

/* LE FOND NE DÉFILE PAS DERRIÈRE LA PHOTO. Sans cela, le pouce qui glisse
   à côté de l'image fait courir la grille par-dessous : on rouvre en ayant
   perdu sa place, et le geste de balayage qui doit passer à la photo
   suivante entre en concurrence avec le défilement de la page. C'est la
   même technique que le panneau plein écran de l'accueil (u-locked), avec
   la même conséquence à réparer : poser overflow:hidden sur <html> fait
   ramener le défilement à zéro par le navigateur, et le retirer ne le rend
   pas. C'est au script de le remettre — voir closeZoom(). */
html.galerie-verrou {
    overflow: hidden;
}

.galerie-zoom {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 4vh 4vw;
    background: color-mix(in srgb, var(--bg) 95%, black);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    opacity: 0;
    pointer-events: none;
    transition: opacity .28s ease;
    cursor: zoom-out;
}

.galerie-zoom[hidden] {
    display: none;
}

.galerie-zoom.is-open {
    opacity: 1;
    pointer-events: auto;
}

.zoom-fig {
    position: relative;
    margin: 0;
    max-width: 100%;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    cursor: default;
    transform: scale(.96);
    transition: transform .32s cubic-bezier(.2, .6, .2, 1);
}

.galerie-zoom.is-open .zoom-fig {
    transform: none;
}

.zoom-img {
    max-width: 88vw;
    max-height: 80svh;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 16px 48px -8px rgba(0, 0, 0, .85);
    transition: opacity .18s ease, transform .18s ease;
    /* Le grossissement part du centre : c'est ce que suppose le calcul
       d'ancrage du script, qui replace la translation pour que le point
       sous les doigts ne bouge pas. Changer cette origine fausserait
       l'ancrage sans rien casser de visible au premier coup d'œil. */
    transform-origin: center center;
}

/* LE PINCEMENT EST À NOUS, PAS AU NAVIGATEUR. Sans cette ligne, deux
   doigts sur la photo déclenchent le zoom natif de la page : c'est toute
   l'interface qui grossit — les flèches, la croix, le compteur — et l'on
   se retrouve à devoir dézoomer le site pour reprendre la main. En
   coupant les gestes par défaut sur la visionneuse, le pincement ne
   grossit plus que l'image. Le reste de la page garde le sien : la règle
   ne vaut que tant que la visionneuse est ouverte, puisqu'elle est seule
   à porter cette classe. */
.galerie-zoom {
    touch-action: none;
}

.zoom-img.est-agrandie {
    cursor: grab;
}

.zoom-img.est-agrandie:active {
    cursor: grabbing;
}

.zoom-caption {
    font-family: 'Montserrat', sans-serif;
    font-size: .68rem;
    font-weight: 600;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--muted);
    text-align: center;
}

.zoom-close {
    position: absolute;
    top: 1.4rem;
    right: 1.4rem;
    z-index: 110;
    display: grid;
    place-items: center;
    width: 2.7rem;
    height: 2.7rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface) 75%, transparent);
    color: var(--text);
    border: 1px solid var(--line);
    cursor: pointer;
    transition: background-color .25s ease, color .25s ease, transform .25s ease;
}

.zoom-close:hover {
    background: var(--accent);
    color: var(--on-accent);
    transform: scale(1.05);
}

.zoom-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 110;
    display: grid;
    place-items: center;
    width: 2.9rem;
    height: 2.9rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface) 65%, transparent);
    color: var(--text);
    border: 1px solid var(--line);
    cursor: pointer;
    transition: background-color .25s ease, color .25s ease, transform .25s ease;
}

.zoom-nav:hover {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
}

.zoom-nav:active {
    transform: translateY(-50%) scale(.92);
}

.zoom-prev { left: 1.8vw; }
.zoom-next { right: 1.8vw; }

/* ── Version mobile ── */
@media (max-width: 640px) {
    body { padding: 0 .9rem 2.6rem; }
    .tete { padding: 2.3rem 0 1.6rem; }
    .sur-titre { font-size: .58rem; letter-spacing: .22em; margin-bottom: .8rem; }
    .ornement { margin-top: 1.1rem; width: 8.5rem; }
    .repertoire { grid-template-columns: repeat(2, 1fr); gap: 1rem .65rem; padding: 1.2rem 0 .4rem; }
    .barre { top: .55rem; margin-top: .5rem; }
    .bascule { width: 2.1rem; height: 2.1rem; }
    .zoom-close { top: .8rem; right: .8rem; width: 2.3rem; height: 2.3rem; }
    .zoom-nav { width: 2.4rem; height: 2.4rem; }
    .zoom-prev { left: 8px; }
    .zoom-next { right: 8px; }
    .galerie-zoom { padding: 6vh 2vw; }
    .zoom-img { max-width: 94vw; max-height: 76svh; }
}

@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation: none !important;
        transition-duration: 0.01ms !important;
    }
}
`;
}

function genererHtml() {
    const url = `${SITE}/galerie/`;
    const titre = 'Galerie photo — Adrien Vada';
    const desc = 'Le book photographique d’Adrien Vada : portraits et photographies de plateau.';

    const photosJson = IMAGES.map((img, i) => {
        const full = img.folder === 'profil'
            ? `../ressources/images/${img.file}`
            : `../ressources/images/galerie/${img.file}`;
        const thumb = `../ressources/images/galerie/thumbs/${img.file.replace(/\.[^.]+$/, '')}.jpg`;
        return {
            full,
            thumb,
            alt: `Photo ${i + 1} du book d’Adrien Vada`,
            index: i
        };
    });

    const cartes = photosJson.map((p, i) => `
        <li class="carte" style="--ac:#bfa98a;--i:${i}" data-index="${i}">
            <button type="button" class="carte-btn" data-zoom-photo="${i}" aria-label="Agrandir la photo ${i + 1}">
                <span class="cadre">
                    <span class="media media--photo">
                        <img src="${esc(p.thumb)}" alt="${esc(p.alt)}" loading="lazy" decoding="async">
                    </span>
                    <span class="lueur" aria-hidden="true"></span>
                    <span class="zoom-indic" aria-hidden="true">
                        <svg class="ico"><use href="#i-solid-expand"></use></svg>
                    </span>
                </span>
            </button>
        </li>`).join('');

    const schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'ImageGallery',
        'name': titre,
        'description': desc,
        'url': url,
        'image': `${SITE}/ressources/images/og-adrien-vada.jpg`,
        'author': {
            '@type': 'Person',
            '@id': `${SITE}/#adrien-vada`,
            'name': 'Adrien Vada'
        },
        'itemListElement': photosJson.map((p, i) => ({
            '@type': 'ImageObject',
            'position': i + 1,
            'contentUrl': `${SITE}/${p.full.replace(/^\.\.\//, '')}`,
            'thumbnailUrl': `${SITE}/${p.thumb.replace(/^\.\.\//, '')}`,
            'name': p.alt
        }))
    };

    return `<!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- PAGE GÉNÉRÉE — ne pas modifier à la main (build/generer-page-galerie.js). -->
    <title>${esc(titre)}</title>
    <meta name="description" content="${esc(desc)}">
    <link rel="canonical" href="${url}">
    <script>
        // Thème appliqué AVANT le premier rendu — synchronisé avec l'accueil (avTheme)
        (function () {
            var t = 'dark';
            var stored = null;
            try { stored = localStorage.getItem('avTheme'); } catch (e) { }
            if (stored === 'light' || stored === 'dark') { t = stored; }
            else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) { t = 'light'; }
            document.documentElement.setAttribute('data-theme', t);
            try { localStorage.setItem('avIntroSeen', '1'); } catch (e) { }
        })();

        // ════════════════════════════════════════════════════════════════
        //  LE BOOK S'OUVRE AU PLUS LARGE — planche contact, pas diaporama
        //  ----------------------------------------------------------------
        //  On arrivait sur deux colonnes au téléphone, quatre à l'écran :
        //  trois photos visibles, et le reste à découvrir en faisant
        //  défiler. Or ce n'est pas ce qu'on vient chercher dans un book.
        //  Un directeur de casting veut EMBRASSER la série d'un coup d'œil,
        //  juger la variété des visages avant d'en regarder un ; c'est le
        //  geste de la planche contact, où l'on entoure ensuite la bonne.
        //  Le pincement reste là pour se rapprocher, et il n'a plus qu'un
        //  sens à offrir en arrivant : écarter.
        //
        //  ON LE POSE ICI, ET NON AU CHARGEMENT DU SCRIPT PRINCIPAL, parce
        //  qu'un attribut posé après le premier rendu se verrait : la grille
        //  se peindrait à deux colonnes, puis se recomposerait à quatre sous
        //  les yeux. Ce script-ci s'exécute avant que quoi que ce soit ne
        //  soit peint, comme celui du thème juste au-dessus.
        //
        //  LE CHIFFRE EST CELUI DU HAUT DE L'ÉCHELLE, et il est écrit à un
        //  seul endroit : la même expression sert de borne au pincement
        //  (voir NIVEAUX plus bas). Le seuil de 640 px est celui de la
        //  feuille de style, pas un choix indépendant.
        // ════════════════════════════════════════════════════════════════
        (function () {
            document.documentElement.dataset.zoom = innerWidth < 640 ? '4' : '5';
        })();
    </script>
    <meta name="theme-color" content="#0a0907">

    <!-- Mesure d'audience Umami -->
    <script defer src="https://cloud.umami.is/script.js" data-website-id="23c34c7a-c28c-4b5b-b237-a154139b62da"
        data-domains="adrienvada.fr"></script>

    <meta property="og:type" content="website">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:site_name" content="Adrien Vada">
    <meta property="og:title" content="${esc(titre)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:image" content="${SITE}/ressources/images/og-adrien-vada.jpg">
    <meta property="og:url" content="${url}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/svg+xml" href="../favicon_io/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600&family=Montserrat:wght@600;700&display=swap">
    <link rel="stylesheet" href="galerie.css">
    <script type="application/ld+json">
${JSON.stringify(schemaJson, null, 2)}
    </script>
</head>

<body>
    ${SPRITE}

    <!-- Sentinelle de barre collante -->
    <div class="barre-sentinelle" aria-hidden="true"></div>
    <header class="barre">
        <a class="retour" href="../">← Adrien Vada</a>
        <button type="button" class="bascule" data-bascule aria-pressed="false" aria-label="Passer au thème clair" title="Passer au thème clair">
            <svg class="ico" data-bascule-icone aria-hidden="true"><use href="#i-solid-sun"></use></svg>
        </button>
    </header>

    <main>
        <header class="tete">
            <p class="sur-titre">Adrien Vada — Artiste interprète</p>
            <h1>Galerie photo</h1>
            <p class="ornement" aria-hidden="true"><span></span></p>
            <p class="sous-titre-galerie">${photosJson.length} photographies</p>
        </header>

        <section>
            <ul class="repertoire" id="galerie-grille">${cartes}
            </ul>
        </section>
    </main>

    <!-- Visionneuse plein écran -->
    <div class="galerie-zoom" id="galerie-zoom" hidden role="dialog" aria-modal="true" aria-label="Photo agrandie">
        <button type="button" class="zoom-close" id="zoom-close" aria-label="Fermer la photo">
            <svg class="ico" aria-hidden="true"><use href="#i-solid-xmark"></use></svg>
        </button>
        <button type="button" class="zoom-nav zoom-prev" id="zoom-prev" aria-label="Photo précédente">
            <svg class="ico" aria-hidden="true"><use href="#i-solid-chevron-left"></use></svg>
        </button>
        <button type="button" class="zoom-nav zoom-next" id="zoom-next" aria-label="Photo suivante">
            <svg class="ico" aria-hidden="true"><use href="#i-solid-chevron-right"></use></svg>
        </button>
        <figure class="zoom-fig" id="zoom-fig">
            <!-- LA CLASSE, ET PAS SEULEMENT L'IDENTIFIANT. Cette image n'en
                 portait pas : l'identifiant servait au script, et toute la
                 mise à l'échelle — max-width, max-height, object-fit — était
                 écrite pour la classe .zoom-img, qui ne visait donc rien.
                 La photo
                 s'affichait à sa taille naturelle, 955 × 1280, dans un écran
                 de 390 : elle débordait de 573 px sous le bord bas et la page
                 se mettait à défiler derrière la visionneuse. Sur ordinateur
                 le défaut passait presque inaperçu, l'écran étant plus grand
                 que la photo. Sur téléphone, il rendait la visionneuse
                 inutilisable. -->
            <img class="zoom-img" id="zoom-img" alt="" decoding="async">
            <figcaption class="zoom-caption" id="zoom-caption"></figcaption>
        </figure>
    </div>

    <script>
    (function () {
        'use strict';

        var PHOTOS = ${JSON.stringify(photosJson)};
        var currentIndex = 0;
        var zoomModal = document.getElementById('galerie-zoom');
        var zoomImg = document.getElementById('zoom-img');
        var zoomCaption = document.getElementById('zoom-caption');
        var zoomFig = document.getElementById('zoom-fig');
        var cartes = Array.from(document.querySelectorAll('.carte'));

        // ════════════════════════════════════════════════════════════════
        //  VISIONNEUSE PLEIN ÉCRAN
        // ════════════════════════════════════════════════════════════════
        function updateZoomDisplay() {
            var item = PHOTOS[currentIndex];
            if (!item) return;
            // L'ENTRÉE NE SE FAIT PLUS QU'EN OPACITÉ. Elle ajoutait un
            // scale(0.97) qui grandissait jusqu'à 1 : depuis que la photo est
            // agrandissable, cette propriété appartient au pincement, et deux
            // écritures concurrentes sur la même transformation se seraient
            // écrasées l'une l'autre — la photo serait retombée à sa taille
            // d'origine au premier chargement d'image. La figure entière garde
            // son propre scale(.96) à l'ouverture de la visionneuse (voir
            // .zoom-fig) : le mouvement d'entrée n'est pas perdu, il est
            // seulement porté par le cadre plutôt que par l'image.
            zoomImg.style.opacity = '0';
            remetAPlat(false);
            zoomCaption.textContent = (currentIndex + 1) + ' / ' + PHOTOS.length;

            setTimeout(function () {
                zoomImg.src = item.full;
                zoomImg.alt = item.alt;
                zoomImg.onload = function () {
                    zoomImg.style.opacity = '1';
                };
                // Précharge adjacente discrète
                var next = new Image();
                next.src = PHOTOS[(currentIndex + 1) % PHOTOS.length].full;
                var prev = new Image();
                prev.src = PHOTOS[(currentIndex - 1 + PHOTOS.length) % PHOTOS.length].full;
            }, 80);
        }

        // On retient où l'on en était dans la planche AVANT de la verrouiller :
        // le navigateur ramène le défilement à zéro dès qu'on pose
        // overflow:hidden, et ne le rend pas au déverrouillage.
        var defilementAvant = 0;

        function openZoom(index) {
            currentIndex = (index + PHOTOS.length) % PHOTOS.length;
            defilementAvant = window.scrollY || document.documentElement.scrollTop || 0;
            zoomModal.hidden = false;
            void zoomModal.offsetHeight;
            zoomModal.classList.add('is-open');
            document.documentElement.classList.add('galerie-verrou');
            updateZoomDisplay();
            document.getElementById('zoom-close')?.focus();
        }

        function closeZoom() {
            zoomModal.classList.remove('is-open');
            document.documentElement.classList.remove('galerie-verrou');
            window.scrollTo(0, defilementAvant);
            setTimeout(function () {
                zoomModal.hidden = true;
                zoomImg.src = '';
            }, 280);
        }

        function nextPhoto(e) {
            if (e) e.stopPropagation();
            currentIndex = (currentIndex + 1) % PHOTOS.length;
            updateZoomDisplay();
        }

        function prevPhoto(e) {
            if (e) e.stopPropagation();
            currentIndex = (currentIndex - 1 + PHOTOS.length) % PHOTOS.length;
            updateZoomDisplay();
        }

        // Clic sur les cartes
        document.querySelectorAll('[data-zoom-photo]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                var idx = parseInt(btn.dataset.zoomPhoto, 10);
                openZoom(idx);
            });
        });

        document.getElementById('zoom-close')?.addEventListener('click', closeZoom);
        document.getElementById('zoom-next')?.addEventListener('click', nextPhoto);
        document.getElementById('zoom-prev')?.addEventListener('click', prevPhoto);

        // Fermeture au clic sur le fond — sauf si ce clic est la fin d'un
        // déplacement de photo agrandie relâché à côté d'elle : on ne ferme
        // pas ce qu'on vient de déplacer.
        zoomModal.addEventListener('click', function (e) {
            if (aTireSouris) { aTireSouris = false; return; }
            if (!zoomFig.contains(e.target) && !e.target.closest('.zoom-nav')) {
                closeZoom();
            }
        });

        // Clavier
        window.addEventListener('keydown', function (e) {
            if (zoomModal.hidden) return;
            if (e.key === 'Escape') closeZoom();
            else if (e.key === 'ArrowRight') nextPhoto();
            else if (e.key === 'ArrowLeft') prevPhoto();
        });

        // ════════════════════════════════════════════════════════════════
        //  GROSSIR LA PHOTO, ET ELLE SEULE
        //  ----------------------------------------------------------------
        //  Deux doigts sur une photo ouverte déclenchaient le zoom natif du
        //  navigateur : c'est TOUTE la page qui grossissait — les flèches, la
        //  croix, le compteur — et il fallait ensuite dézoomer le site pour
        //  reprendre la main. Un book de comédien se regarde de près : on
        //  veut voir un grain de peau, une lumière dans l'œil, pas une
        //  interface agrandie.
        //
        //  Le geste est donc repris ici. La feuille de style coupe les
        //  gestes par défaut sur la visionneuse (touch-action), et ce qui
        //  suit les rejoue sur la seule image : pincement pour grossir,
        //  glissement pour se déplacer dedans, double frappe pour aller et
        //  venir entre les deux. Le reste de la page garde le zoom du
        //  navigateur — la règle ne vaut que sur la visionneuse.
        //
        //  L'ANCRAGE EST LE POINT DÉLICAT. Grossir depuis le centre de
        //  l'image fait fuir sous les doigts ce qu'on visait. On garde donc
        //  fixe le point pincé : la translation est recalculée à chaque
        //  changement d'échelle pour que ce point-là reste où il est
        //  (grossitVers). C'est ce qui distingue un zoom qu'on pilote d'un
        //  zoom qu'on subit.
        //
        //  ET LA PHOTO NE PEUT PAS S'ÉCHAPPER. Le déplacement est borné à ce
        //  qui dépasse de l'écran : à échelle 1 il n'y a rien à déplacer, et
        //  une fois agrandie on ne peut pas tirer l'image au point d'en
        //  laisser voir le vide à côté.
        //
        //  LES GESTES NE SE MARCHENT PAS DESSUS : tant que la photo est à sa
        //  taille, un glissement navigue — gauche/droite pour changer de
        //  photo, vers le bas pour fermer, comme avant. Dès qu'elle est
        //  agrandie, le même glissement la déplace, et ni la navigation ni
        //  la fermeture ne se déclenchent : on ne quitte pas une photo qu'on
        //  est en train d'examiner.
        // ════════════════════════════════════════════════════════════════
        var ECHELLE_MAX = 5;
        var echelle = 1, tx = 0, ty = 0;

        function borne(v, min, max) { return v < min ? min : (v > max ? max : v); }

        // Ce qui dépasse de l'écran, de chaque côté : la moitié de l'excédent.
        // offsetWidth donne la taille SANS transformation, contrairement à
        // getBoundingClientRect — c'est ce qu'il faut ici, l'échelle étant
        // appliquée à la main juste après.
        function debordement() {
            return {
                x: Math.max(0, (zoomImg.offsetWidth * echelle - innerWidth) / 2),
                y: Math.max(0, (zoomImg.offsetHeight * echelle - innerHeight) / 2)
            };
        }

        function applique(anime) {
            var d = debordement();
            tx = borne(tx, -d.x, d.x);
            ty = borne(ty, -d.y, d.y);
            zoomImg.style.transition = anime
                ? 'opacity .18s ease, transform .22s cubic-bezier(.2,.6,.2,1)'
                : 'opacity .18s ease';
            zoomImg.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1)
                + 'px) scale(' + echelle.toFixed(3) + ')';
            zoomImg.classList.toggle('est-agrandie', echelle > 1.01);
        }

        function remetAPlat(anime) {
            echelle = 1; tx = 0; ty = 0;
            applique(anime);
        }

        // Change l'échelle en gardant immobile le point visé (px, py en
        // coordonnées d'écran). Voir le commentaire ci-dessus : la position
        // écran d'un point vaut centre + translation + position_locale ×
        // échelle ; pour qu'elle ne bouge pas, la translation doit absorber
        // la différence d'échelle.
        function grossitVers(voulue, px, py, anime) {
            var nouvelle = borne(voulue, 1, ECHELLE_MAX);
            if (Math.abs(nouvelle - echelle) < 0.0005) return;
            var r = zoomImg.getBoundingClientRect();
            var ux = (px - (r.left + r.width / 2)) / echelle;
            var uy = (py - (r.top + r.height / 2)) / echelle;
            tx += ux * (echelle - nouvelle);
            ty += uy * (echelle - nouvelle);
            echelle = nouvelle;
            applique(anime);
        }

        var doigts = 0, departX = 0, departY = 0, glisseX = 0, glisseY = 0;
        var pincement = 0, echelleAvant = 1, aBouge = false, dernierTap = 0;
        // Instant de la dernière double frappe tactile traitée — voir le
        // garde du dblclick plus bas, qui sans lui défaisait le travail.
        var frappeTraitee = 0;

        function ecartDoigts(t) {
            return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
        }

        function saisitUnDoigt(t) {
            departX = t.clientX; departY = t.clientY;
            glisseX = tx; glisseY = ty;
        }

        zoomModal.addEventListener('touchstart', function (e) {
            doigts = e.touches.length;
            aBouge = false;
            if (doigts === 2) {
                pincement = ecartDoigts(e.touches);
                echelleAvant = echelle;
            } else if (doigts === 1) {
                saisitUnDoigt(e.touches[0]);
            }
        }, { passive: true });

        zoomModal.addEventListener('touchmove', function (e) {
            if (e.touches.length === 2 && pincement) {
                var ecart = ecartDoigts(e.touches);
                grossitVers(echelleAvant * (ecart / pincement),
                    (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    (e.touches[0].clientY + e.touches[1].clientY) / 2, false);
                aBouge = true;
            } else if (e.touches.length === 1 && echelle > 1.01) {
                tx = glisseX + (e.touches[0].clientX - departX);
                ty = glisseY + (e.touches[0].clientY - departY);
                applique(false);
                aBouge = true;
            }
        }, { passive: true });

        zoomModal.addEventListener('touchend', function (e) {
            // Un doigt levé sur deux : on ne termine rien, on repart du doigt
            // qui reste. Sans cela, relâcher une pince en gardant un doigt
            // posé faisait sauter l'image d'un coup, la saisie datant encore
            // du premier contact.
            if (e.touches.length === 1) {
                pincement = 0;
                saisitUnDoigt(e.touches[0]);
                return;
            }
            if (e.touches.length > 0) return;
            var etaitPince = pincement > 0;
            pincement = 0;
            if (!e.changedTouches.length) return;
            var fx = e.changedTouches[0].clientX, fy = e.changedTouches[0].clientY;

            // Double frappe : aller et venir entre la taille d'écran et un
            // grossissement de deux et demi, ancré là où l'on a frappé.
            if (!aBouge && !etaitPince) {
                var t = Date.now();
                if (t - dernierTap < 300) {
                    dernierTap = 0;
                    frappeTraitee = t;
                    if (echelle > 1.01) remetAPlat(true);
                    else grossitVers(2.5, fx, fy, true);
                    return;
                }
                dernierTap = t;
            }

            if (echelle > 1.01) return;   // agrandie : le glissement l'a déplacée
            var dx = departX - fx, dy = departY - fy;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) nextPhoto(); else prevPhoto();
            } else if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) {
                closeZoom();
            }
        }, { passive: true });

        // À la molette, sur ordinateur : le curseur tient lieu de doigts.
        zoomModal.addEventListener('wheel', function (e) {
            if (zoomModal.hidden) return;
            e.preventDefault();
            grossitVers(echelle * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY, false);
        }, { passive: false });

        // Double-clic, à la souris. LE GARDE N'EST PAS UNE PRÉCAUTION, C'EST
        // UNE RÉPARATION : le navigateur fabrique un dblclick à partir d'une
        // double frappe tactile, après le touchend. Sans lui, les deux
        // gestionnaires se déclenchaient l'un après l'autre sur le même
        // geste — le premier grossissait, le second voyait une photo
        // agrandie et la remettait à plat. Au doigt, la double frappe ne
        // faisait donc rien du tout, sans la moindre erreur pour le dire.
        zoomImg.addEventListener('dblclick', function (e) {
            e.stopPropagation();
            if (Date.now() - frappeTraitee < 700) return;
            if (echelle > 1.01) remetAPlat(true);
            else grossitVers(2.5, e.clientX, e.clientY, true);
        });

        // Déplacement à la souris, une fois agrandie. Le drapeau aTireSouris
        // empêche le clic de fin de course de refermer la visionneuse quand
        // on a relâché hors de l'image.
        var souris = null, aTireSouris = false;
        zoomImg.addEventListener('mousedown', function (e) {
            if (echelle <= 1.01) return;
            e.preventDefault();
            souris = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
            aTireSouris = false;
        });
        addEventListener('mousemove', function (e) {
            if (!souris) return;
            tx = souris.tx + (e.clientX - souris.x);
            ty = souris.ty + (e.clientY - souris.y);
            aTireSouris = true;
            applique(false);
        });
        addEventListener('mouseup', function () { souris = null; });

        // Tourner l'écran change ce qui dépasse : on reborne, sans quoi la
        // photo resterait tirée au-delà de son nouveau cadre.
        addEventListener('resize', function () {
            if (!zoomModal.hidden) applique(false);
        });

        // ════════════════════════════════════════════════════════════════
        //  PINCH-TO-ZOOM SUR LA GRILLE (façon Répertoire spectacles)
        // ════════════════════════════════════════════════════════════════
        var mur = document.querySelector('main');
        var NIVEAUX = function () { return innerWidth < 640 ? [2, 3, 4] : [2, 3, 4, 5]; };
        // LE REPOS EST LE HAUT DE L'ÉCHELLE, comme à l'arrivée : c'est la
        // planche contact qui fait le repos de cette page, et le pincement
        // n'en écarte que pour se rapprocher (voir le script du <head>).
        // Cette valeur ne sert plus qu'à deux choses — retrouver son rang
        // dans l'échelle si l'attribut a disparu, et servir de secours à
        // zoomCourant() — mais elle doit dire la même chose que lui, sans
        // quoi le premier pincement partirait d'un cran qu'on ne voit pas.
        var zoomRepos = function () { var n = NIVEAUX(); return n[n.length - 1]; };
        var zoomCourant = function () {
            return parseInt(document.documentElement.dataset.zoom || '0', 10) || zoomRepos();
        };
        var niveauVoisin = function (sens) {
            var n = NIVEAUX();
            var i = n.indexOf(zoomCourant());
            if (i === -1) i = n.indexOf(zoomRepos());
            var v = n[i + sens];
            return v === undefined ? 0 : v;
        };
        var mesure = function () {
            var m = {};
            cartes.forEach(function (c, idx) { m[idx] = c.getBoundingClientRect(); });
            return m;
        };
        var poseNiveau = function (v) {
            if (v) document.documentElement.dataset.zoom = v;
            else delete document.documentElement.dataset.zoom;
        };

        // UN QUART DE TOUR PEUT RENDRE LE NIVEAU IMPOSSIBLE. L'échelle n'a
        // pas les mêmes barreaux des deux côtés du seuil de 640 px : cinq
        // colonnes existent à l'écran, pas au téléphone. Ouvrir la page en
        // paysage la pose donc à cinq, et la remettre en portrait garderait
        // ces cinq colonnes sur 390 px de large — des vignettes de 78 px, et
        // un pincement qui repartirait d'un cran introuvable. On ramène le
        // niveau dans l'échelle du moment dès qu'il en sort. Le sens inverse
        // n'a rien à corriger : quatre colonnes existent des deux côtés.
        addEventListener('resize', function () {
            if (NIVEAUX().indexOf(zoomCourant()) === -1) poseNiveau(zoomRepos());
        });
        var pincement = 0, rapport = 1, sensVol = 0, versVol = 0,
            departs = null, cibles = null, tVol = 0, demandeVol = 0, verrou = false;
        var ecart = function (t) {
            return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
        };
        var nettoieVol = function () {
            if (demandeVol) { cancelAnimationFrame(demandeVol); demandeVol = 0; }
            cartes.forEach(function (c) {
                c.style.transform = ''; c.style.transformOrigin = ''; c.style.transition = '';
            });
        };
        var oublieVol = function () { sensVol = 0; versVol = 0; departs = cibles = null; tVol = 0; };
        var prepareVol = function (sens) {
            nettoieVol();
            var vers = niveauVoisin(sens);
            if (!vers) { oublieVol(); return; }
            var courant = document.documentElement.dataset.zoom || '';
            departs = mesure();
            poseNiveau(vers);
            cibles = mesure();
            if (courant) document.documentElement.dataset.zoom = courant;
            else delete document.documentElement.dataset.zoom;
            sensVol = sens; versVol = vers;
        };
        var animeVol = function () {
            demandeVol = 0;
            if (!departs || !cibles) return;
            var t = Math.max(0, Math.min(1, tVol));
            cartes.forEach(function (c, idx) {
                var d = departs[idx], f = cibles[idx];
                if (!d || !f) return;
                var sx = (d.width + (f.width - d.width) * t) / d.width;
                var sy = (d.height + (f.height - d.height) * t) / d.height;
                var dx = (f.left - d.left) * t;
                var dy = (f.top - d.top) * t;
                c.style.transformOrigin = 'top left';
                c.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
            });
        };

        mur.addEventListener('touchstart', function (e) {
            if (e.touches.length === 2 && !verrou && !zoomModal.classList.contains('is-open')) {
                pincement = ecart(e.touches);
                rapport = 1;
                oublieVol();
            }
        }, { passive: true });

        mur.addEventListener('touchmove', function (e) {
            if (e.touches.length !== 2 || !pincement || verrou) return;
            var nouveau = ecart(e.touches);
            rapport = nouveau / pincement;
            var sens = 0;
            if (rapport > 1.05) sens = -1; // Écarter = zoomer (moins de colonnes)
            else if (rapport < 0.95) sens = 1; // Pincer = dézoomer (plus de colonnes)
            if (!sens) {
                if (sensVol) { oublieVol(); nettoieVol(); }
                return;
            }
            if (sens !== sensVol) prepareVol(sens);
            if (!versVol) return;
            tVol = sens > 0 ? (1 - rapport) / 0.38 : (rapport - 1) / 0.38;
            if (!demandeVol) demandeVol = requestAnimationFrame(animeVol);
        }, { passive: true });

        mur.addEventListener('touchend', function (e) {
            if (e.touches.length > 0) return;
            pincement = 0;
            if (verrou) return;
            if (versVol && tVol >= 0.32) {
                var vers = versVol;
                oublieVol(); nettoieVol();
                verrou = true;
                var applique = function () {
                    poseNiveau(vers);
                    setTimeout(function () { verrou = false; }, 80);
                };
                if (document.startViewTransition) {
                    cartes.forEach(function (c, idx) { c.style.viewTransitionName = 'photo-' + idx; });
                    var vt = document.startViewTransition(applique);
                    vt.finished.then(function () { }, function () { }).then(function () {
                        cartes.forEach(function (c) { c.style.viewTransitionName = ''; });
                    });
                } else { applique(); }
            } else if (versVol) {
                oublieVol();
                if (demandeVol) { cancelAnimationFrame(demandeVol); demandeVol = 0; }
                cartes.forEach(function (c) {
                    c.style.transition = 'transform .22s ease';
                    c.style.transform = '';
                });
                setTimeout(function () {
                    cartes.forEach(function (c) {
                        c.style.transition = ''; c.style.transformOrigin = '';
                    });
                }, 240);
            }
        });

        mur.addEventListener('touchcancel', function () {
            pincement = 0;
            if (verrou) return;
            oublieVol(); nettoieVol();
        });

        // Scintillement régulier
        setInterval(function () {
            if (document.hidden || zoomModal.classList.contains('is-open')) return;
            var elue = cartes[Math.floor(Math.random() * cartes.length)];
            if (!elue) return;
            elue.classList.add('reluit');
            setTimeout(function () { elue.classList.remove('reluit'); }, 1450);
        }, 4500);

        // ════════════════════════════════════════════════════════════════
        //  BARRE COLLANTE & THÈME
        // ════════════════════════════════════════════════════════════════
        var barre = document.querySelector('.barre');
        var sentinelle = document.querySelector('.barre-sentinelle');
        if (barre && sentinelle && 'IntersectionObserver' in window) {
            new IntersectionObserver(function (entrees) {
                barre.classList.toggle('est-collee', !entrees[0].isIntersecting);
            }, { threshold: 0 }).observe(sentinelle);
        }

        var bascule = document.querySelector('[data-bascule]');
        function appliqueTheme(theme, retenir) {
            document.documentElement.setAttribute('data-theme', theme);
            if (retenir) { try { localStorage.setItem('avTheme', theme); } catch (e) { } }
            var versClair = theme === 'dark';
            var action = versClair ? 'Passer au thème clair' : 'Passer au thème sombre';
            if (bascule) {
                bascule.setAttribute('aria-label', action);
                bascule.setAttribute('title', action);
                bascule.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
                var u = bascule.querySelector('use');
                if (u) u.setAttribute('href', versClair ? '#i-solid-sun' : '#i-solid-moon');
            }
            var meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.setAttribute('content', theme === 'light' ? '#FAF9F5' : '#0a0907');
        }
        appliqueTheme(document.documentElement.getAttribute('data-theme') || 'dark', false);
        if (bascule) bascule.addEventListener('click', function () {
            var t = document.documentElement.getAttribute('data-theme');
            appliqueTheme(t === 'light' ? 'dark' : 'light', true);
        });

    })();
    </script>
</body>

</html>
`;
}

// ── Point d'entrée ──────────────────────────────────────────────────
function main() {
    if (!fs.existsSync(SORTIE_DIR)) {
        fs.mkdirSync(SORTIE_DIR, { recursive: true });
    }

    const cssContent = genererCss();
    const cssPath = path.join(SORTIE_DIR, 'galerie.css');
    fs.writeFileSync(cssPath, cssContent, 'utf8');
    console.log(`✓ ${path.relative(RACINE, cssPath)} (${Buffer.byteLength(cssContent)} octets)`);

    const htmlContent = genererHtml();
    const htmlPath = path.join(SORTIE_DIR, 'index.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log(`✓ ${path.relative(RACINE, htmlPath)} (${Buffer.byteLength(htmlContent)} octets, ${IMAGES.length} photos)`);
}

main();
