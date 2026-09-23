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
 *  et ses données structurées. Quelqu'un qui cherche « Bérénice Compagnie
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
const { execFileSync } = require('child_process');

// LE MOTEUR DE MONTAGE, celui-là même dont se sert le panneau plein écran de
// la page d'accueil (voir univers-montage.js). C'est tout l'objet de ce
// fichier : une page spectacle n'est plus une pâle copie de son univers, elle
// EST son univers — mêmes chapitres, mêmes cartons, mêmes incrustations,
// mêmes groupes de vignettes. Il n'y a plus qu'un endroit où corriger le
// montage, et plus qu'une feuille de style (univers.css) où corriger le
// visage. La version précédente en avait deux, et la seconde aplatissait la
// séquence en une grille de photos.
const MONTAGE = require('../univers-montage.js');

// ════════════════════════════════════════════════════════════════
//  LA BALISE DE MESURE
//  Ces pages existent POUR ÊTRE TROUVÉES : c'est la raison d'être de ce
//  script tout entier. Elles sont pourtant restées longtemps les seules
//  du site à ne rien compter — douze adresses sur treize dans le
//  sitemap, et pas une ligne de statistique. Quelqu'un qui arrivait de
//  Google sur /spectacles/berenice/ n'existait nulle part : on fabriquait
//  la porte sans jamais regarder qui la passait.
//
//  Une seule écriture ici, pour les deux gabarits — la page de spectacle
//  et le répertoire. Le jour où le compte change, il n'y a qu'un
//  identifiant à toucher dans ce fichier, et non onze pages générées.
//
//  `data-domains` : indispensable, et pour la même raison qu'en page
//  d'accueil — Cloudflare sert une copie de tout le site à chaque
//  branche, et sans cette restriction chaque relecture de maquette
//  gonflerait les chiffres du vrai domaine.
// ════════════════════════════════════════════════════════════════
const MESURE = `    <!-- Mesure d'audience — Umami, sans cookie ni identifiant persistant.
         Balise identique à celle du <head> d'index.html ; elle est écrite
         ici par build/generer-pages-spectacles.js, ne la modifiez pas à la
         main. Voir README-build.md, § Mesure d'audience. -->
    <script defer src="https://cloud.umami.is/script.js" data-website-id="23c34c7a-c28c-4b5b-b237-a154139b62da"
        data-domains="adrienvada.fr"></script>
`;

// Toute espace — insécable, fine, insécable étroite — vaut une espace
// ordinaire, et toute apostrophe vaut l'apostrophe droite. Voir
// universeFor() dans univers.js : c'est la même règle, et elle doit le
// rester. Sans la seconde moitié, soigner la typographie d'un titre d'un
// seul côté détacherait sa page spectacle de sa ligne de CV — en silence.
const ESPACES = /[\s\u00a0\u202f\u2009\u2007\u2060]+/g;
const APOSTROPHES = /[\u2019\u02bc\u055a\uff07\u2018\u201b]/g;
const normaliserTitre = (t) => String(t || '')
    .replace(ESPACES, ' ').replace(APOSTROPHES, "'").trim();

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
        if (fs.existsSync(path.join(RACINE, rel))) out.push({ src: rel, legende: 'Affiche', cadre: '' });
    }
    (uni.sequence || []).forEach(bloc => {
        if (!bloc || !Array.isArray(bloc.p)) return;
        bloc.p.forEach((n, i) => {
            if (vues.has(n)) return;
            vues.add(n);
            const rel = `ressources/images/univers/${uni.slug}/${n}.jpg`;
            if (!fs.existsSync(path.join(RACINE, rel))) return;
            // Le cadre du montage voyage avec la photo : le répertoire
            // recadre ses kakemonos sur le même point que l'univers.
            out.push({ src: rel, legende: (bloc.c && bloc.c[i]) || '', cadre: (bloc.cadre && bloc.cadre[n]) || '' });
        });
    });
    return out.slice(0, MAX_PHOTOS);
}

// Un `cadre` d'univers.js devient un object-position CSS. Les mots-clés
// sont ceux du montage (voir framePos dans univers-montage.js) ; une paire
// de pourcentages passe telle quelle. Valeur inconnue : cadrage par défaut.
function posCss(cadre) {
    const c = String(cadre || '').trim();
    if (/^\d{1,3}%\s+\d{1,3}%$/.test(c)) return c;
    const mots = {
        'haut': '50% 0%', 'bas': '50% 100%', 'gauche': '0% 50%',
        'droite': '100% 50%', 'centre': '50% 50%',
        'haut gauche': '0% 0%', 'haut droite': '100% 0%',
        'bas gauche': '0% 100%', 'bas droite': '100% 100%'
    };
    return mots[c] || '';
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
//  L'ŒUVRE, puis UNE REPRÉSENTATION = UN ÉVÉNEMENT. Les événements sont
//  fabriqués par le moteur partagé (evenementTheatre, dans
//  univers-montage.js), le MÊME que la page d'accueil appelle en direct :
//  heure et fuseau de Paris, adresse structurée, organisateur, billetterie.
//  Ils étaient écrits ici à la main, en plus pauvre — une date sans heure,
//  un lieu pour toute adresse — et Google les refusait pour ces manques.
//  Les séances SCOLAIRES n'en sont pas : elles ne sont pas ouvertes au
//  public, et les annoncer dans un moteur promettrait des places qui
//  n'existent pas.
function donneesStructurees(uni, titre, desc, dates, urlPage, photoOg, cv) {
    const adrien = { '@type': 'Person', '@id': SITE + '/#adrien-vada', name: 'Adrien Vada' };
    const graphe = [];
    const annee = (String(cv.annee || '').match(/\d{4}/) || [])[0];
    const passee = annee && +annee <= new Date().getFullYear();

    if (uni.kind === 'film') {
        const film = {
            '@context': 'https://schema.org', '@type': 'Movie',
            name: titre, description: desc, url: urlPage, inLanguage: 'fr',
            image: photoOg || undefined, actor: adrien
        };
        // « Réalisé par X et Y » : la ligne de CV nomme les réalisateurs.
        const realise = String(cv.compagnie || '').match(/^R[ée]alis[ée]e?s?\s+par\s+(.+)$/i);
        if (realise) {
            film.director = realise[1].split(/\s*(?:,|\bet\b)\s*/).filter(Boolean)
                .map(nom => ({ '@type': 'Person', name: nom }));
        }
        if (passee) film.dateCreated = annee;
        graphe.push(film);
    } else {
        const oeuvre = {
            '@context': 'https://schema.org', '@type': 'CreativeWork',
            name: titre, description: desc, url: urlPage, inLanguage: 'fr',
            genre: uni.genre || 'Théâtre',
            image: photoOg || undefined, contributor: adrien
        };
        const producteur = MONTAGE.organisateurs(cv.compagnie || '');
        if (producteur) oeuvre.producer = producteur;
        if (passee) oeuvre.dateCreated = annee;
        graphe.push(oeuvre);
        dates.filter(d => d.iso && !d.scolaire).forEach(d => {
            const ev = MONTAGE.evenementTheatre({
                titre: uni.title || titre, sousTitre: uni.subtitle || '', lieu: d.lieu, ville: d.ville,
                jour: d.iso, heure: d.heure, billetterie: d.billetterie
            }, { uni, compagnie: cv.compagnie || '' });
            if (ev) graphe.push(ev);
        });
    }
    return graphe;
}

// ── Le titre et le résumé que montre un moteur ──────────────────────
//  C'était « Bérénice · Adrien Vada », et pour résumé les trois cents
//  premiers caractères du synopsis, coupés au milieu d'un mot. Or c'est
//  tout ce qu'on lit d'une page dans une liste de résultats : il faut
//  qu'on y trouve ce qu'on a cherché. On cherche une pièce par sa
//  COMPAGNIE (« Bérénice Crescite ») et un comédien par son RÔLE.
//
//  La compagnie ne garde que son nom (« Compagnie Crescite », sans le
//  metteur en scène qui la suit sur la ligne du CV), et seulement si le
//  titre reste lisible : au-delà de 65 signes, Google le tronque, et
//  c'est elle qu'on sacrifie. Un film dit qu'il en est un.
const LONGUEUR_TITRE = 65;
const LONGUEUR_RESUME = 155;

const compagnieCourte = (cie) => String(cie || '').split(/\s+—\s+|\s+\/\s+/)[0].trim();

function titreDe(uni, titre, cv) {
    const base = `${titre}${uni.subtitle ? ' — ' + uni.subtitle : ''}`;
    const film = uni.kind === 'film';
    const contexte = film ? (uni.subtitle ? '' : 'court-métrage') : compagnieCourte(cv.compagnie);
    const riche = contexte ? `${base} · ${contexte} · Adrien Vada` : '';
    return riche && riche.length <= LONGUEUR_TITRE ? riche : `${base} · Adrien Vada`;
}

//  Le résumé dit QUI, OÙ et AVEC QUEL RÔLE, puis ouvre le synopsis ; il
//  s'arrête à 155 signes, sur un mot entier, par des points de
//  suspension. « Bérénice, Compagnie Crescite — avec Adrien Vada
//  (Antiochus). Rome, an 79. Huit jours après… »
function descriptionDe(uni, titre, cv) {
    const role = String(uni.role || cv.role || '').replace(/^R[oô]les?\s*·\s*/i, '').trim();
    const cie = compagnieCourte(cv.compagnie);
    const qui = uni.kind === 'film'
        ? (cie ? `${titre}, ${cie.charAt(0).toLowerCase()}${cie.slice(1)}` : titre)
        : (cie ? `${titre}, ${cie}` : titre);
    const tete = `${qui} — avec Adrien Vada${role ? ` (${role})` : ''}.`;
    const synopsis = lignes(uni.synopsis).join(' ').replace(/\s+/g, ' ').trim();
    const tout = synopsis ? `${tete} ${synopsis}` : tete;
    if (tout.length <= LONGUEUR_RESUME) return tout;
    const coupe = tout.slice(0, LONGUEUR_RESUME - 1);
    return coupe.slice(0, coupe.lastIndexOf(' ')).replace(/[\s,;:.—–-]+$/, '') + '…';
}

// ── Le sprite de la page, et lui seul ───────────────────────────────
//  Le sprite complet — quarante et un dessins — était recopié dans chaque
//  page. On n'y garde que ceux que la page peut montrer : les icônes que
//  cite son HTML, plus toutes celles que les deux scripts du moteur
//  peuvent poser en direct (agenda, lecture vidéo, dates rafraîchies…).
//  On les relit dans leur source plutôt que d'en tenir une liste : une
//  icône ajoutée au moteur y est aussitôt comptée.
const ICONES_DU_MOTEUR = (() => {
    const ids = new Set();
    ['univers.js', 'univers-montage.js'].forEach(f => {
        const src = lire(f);
        for (const m of src.matchAll(/#i-([a-z0-9-]+)/g)) ids.add('i-' + m[1]);
        // setIcon(el, 'solid-pause') : le nom sans son préfixe.
        for (const m of src.matchAll(/['"`]((?:solid|brands|regular)-[a-z0-9-]+)['"`]/g)) ids.add('i-' + m[1]);
    });
    return ids;
})();

function spriteUtile(html) {
    const ids = new Set(ICONES_DU_MOTEUR);
    for (const m of html.matchAll(/#i-([a-z0-9-]+)/g)) ids.add('i-' + m[1]);
    const symboles = [...SPRITE.matchAll(/<symbol id="([^"]+)"[\s\S]*?<\/symbol>/g)]
        .filter(m => ids.has(m[1])).map(m => m[0]);
    // L'enveloppe du sprite (son <svg> et ses repères) est reprise telle
    // quelle : seuls les <symbol> sont triés.
    const ouverture = SPRITE.match(/<svg\b[^>]*>/);
    return ouverture
        ? `<!-- Sprite d'icônes : les ${symboles.length} dessins dont cette page peut avoir
         besoin, pris dans celui d'index.html. Icônes FontAwesome Free,
         licence CC BY 4.0 (fontawesome.com). -->\n    ${ouverture[0]}${symboles.join('')}</svg>`
        : SPRITE;
}

// ── Gabarit d'une page ──────────────────────────────────────────────
function pageSpectacle(uni, cle, cv, SHOW_DATA) {
    const titre = uni.title || cle;
    const dates = datesDe(cle, SHOW_DATA);
    const photos = photosDe(uni);
    const urlPage = `${SITE}/spectacles/${uni.slug}/`;
    const desc = descriptionDe(uni, titre, cv);
    const photoOg = photos[0] ? `${SITE}/${photos[0].src}` : `${SITE}/ressources/images/og-adrien-vada.jpg`;
    const p = uni.palette || {};
    const titreComplet = titreDe(uni, titre, cv);

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
    // icsDate et bookingUrl alimentent les boutons « agenda » et « réserver » ;
    // title/subtitle sont constants pour la page, pas portés par datesDe().
    const perfs = dates.map(d => ({
        dateLabel: d.label, location: d.lieu, time: d.heure, isSchool: d.scolaire,
        icsDate: d.iso, bookingUrl: d.billetterie, title: titre, subtitle: uni.subtitle || ''
    }));

    const panneau = MONTAGE.panelHtml(info, uni, {
        dates: MONTAGE.datesHtml(perfs),
        enCreation,
        statique: true
    });

    // Les chemins d'images du montage sont relatifs à la racine du site ;
    // cette page vit deux dossiers plus bas. On les rebase plutôt que de
    // toucher au moteur, dont ce n'est pas le problème.
    // TOUS les candidats d'un srcset, et pas seulement le premier : les
    // versions allégées des photos (640, 1280, 1920) s'y suivent, séparées
    // par des virgules — seule la première gardait son chemin.
    const corps = panneau
        .replace(/(src|data-u-src)="ressources\//g, '$1="../../ressources/')
        .replace(/srcset="([^"]*)"/g, (_, v) => `srcset="${v.replace(/(^|,\s*)ressources\//g, '$1../../ressources/')}"`)
        .replace(/url\((['"]?)ressources\//g, 'url($1../../ressources/');

    const jsonld = donneesStructurees(uni, titre, desc, dates, urlPage, photoOg, cv)
        .map(o => `<script type="application/ld+json">\n${MONTAGE.jsonLd(o)}\n</script>`)
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

${MESURE}
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

    <!-- Les polices du site, servies par le site (ressources/polices/). Le
         titre est en Cinzel et le synopsis en Inter : ce sont les deux
         premières choses qui s'écrivent, on les demande donc d'avance. -->
    <link rel="preload" href="../../ressources/polices/cinzel-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="../../ressources/polices/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="../../ressources/polices/polices.css">
    <link rel="stylesheet" href="../../univers.css">

    <!-- Le repli quand le script ne charge pas. Les mots du montage attendent
         à opacity 0 : sans JavaScript, la page serait un écran vide, et son
         texte invisible à qui doit l'indexer. Ce <noscript> les rend visibles
         d'un coup. Il ne coûte rien quand tout va bien : le navigateur ne
         charge cette feuille que s'il n'exécute pas de script. -->
    <noscript><link rel="stylesheet" href="../../univers-statique.css"></noscript>

    <script>
        // Visiter une fiche, c'est être entré : le retour vers l'accueil ne
        // doit pas lever le rideau d'introduction — « entrer par une porte
        // dérobée reste entrer » (intro.js).
        try { localStorage.setItem('avIntroSeen', '1'); } catch (e) { }
    </script>

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
            font: 700 .74rem/1 'Montserrat', system-ui, sans-serif;
            letter-spacing: .16em; text-transform: uppercase;
            color: var(--u-muted); text-decoration: none;
        }
        .u-retour:hover { color: var(--u-accent-ink); }
        /* Le morphing depuis le répertoire : les deux documents y
           consentent, et le panneau porte le nom que la carte cliquée
           prend au départ — sa vignette glisse jusqu'à devenir cette
           page. Navigateurs plus anciens : navigation ordinaire. */
        @view-transition { navigation: auto; }
        #show-universe { view-transition-name: fiche-${uni.slug}; }
        ::view-transition-group(*) { animation-duration: .5s; animation-timing-function: cubic-bezier(.2, .6, .2, 1); }
        ::view-transition-old(root), ::view-transition-new(root) { animation-duration: .3s; }
        @media (prefers-reduced-motion: reduce) {
            ::view-transition-group(*), ::view-transition-image-pair(*),
            ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
        }
    </style>

    ${jsonld}
</head>

<!-- La classe u-page-spectacle est le signal que guette univers.js : elle lui
     dit que le panneau est déjà rempli et qu'il n'a qu'à lui donner vie —
     l'écriture du titre, la parallaxe, les révélations au défilement,
     l'agrandissement des photos. C'est le MÊME moteur que sur l'accueil, et
     c'est pourquoi la page ne se contente pas de ressembler à son univers :
     elle se comporte comme lui.

     data-u-show porte le titre EXACT du spectacle — la clé de SHOW_UNIVERSES,
     celle qu'écrit aussi dates.js. C'est par elle qu'univers.js retrouve les
     représentations de CETTE page au moment de rafraîchir son pied.

     data-u-creation dit ce qu'un pied sans date ne peut pas deviner : un
     spectacle sans représentation à venir est-il ARRÊTÉ ou PAS ENCORE CRÉÉ ?
     Sur l'accueil c'est le badge de la ligne du CV qui tranche ; cette page
     n'a pas de CV, on le lui écrit donc noir sur blanc. -->
<body class="u-page-spectacle" data-u-show="${MONTAGE.escape(cle)}"${enCreation ? ' data-u-creation="1"' : ''}>
    ${spriteUtile(corps)}
    <!-- <main> : le contenu principal de la page, annoncé comme tel. Un
         lecteur d'écran y saute d'une touche ; un moteur sait où commence
         ce qui compte. -->
    <main id="show-universe">
        <a class="u-retour" href="../../"><span aria-hidden="true">←</span> Adrien Vada</a>
        ${corps}
    </main>

    <!-- LES DATES, LUES ICI COMME SUR L'ACCUEIL.
         Le pied de cette page a été écrit à la génération : c'est un repli
         honnête — il s'affiche sans JavaScript et part avec le fichier —
         mais il vieillit. Il ne bougeait qu'au prochain passage des deux
         scripts de build, si bien qu'une date saisie dans /admin/ pouvait
         rester invisible ici pendant des semaines, alors que l'accueil
         l'annonçait déjà.

         Ces deux fichiers rendent la page vivante, dans l'ordre qu'ils ont
         sur l'accueil : dates.js pose la copie de repli, dates-live.js la
         remplace si Supabase répond. univers.js, chargé ensuite, redessine
         le pied à partir de l'une ou de l'autre. Le HTML généré ne sert donc
         plus qu'à celui qui n'exécute rien — un robot, un navigateur sans
         script — et le visiteur voit toujours l'état du jour. -->
    <script src="../../dates.js"></script>
    <script src="../../dates-live.js"></script>

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

// ── L'image d'une carte ─────────────────────────────────────────────
//  Les kakemonos chargeaient la photo ENTIÈRE du montage — 2 400 px et
//  jusqu'à 900 ko — pour une carte de 240 px : 4,7 Mo pour la page. Ils
//  prennent désormais la version allégée qui suffit (640 ou 1 280 px, voir
//  build/variantes-images.py), l'original restant le repli.
//
//  CE QUE `sizes` ANNONCE, C'EST LA TAILLE AFFICHÉE DE LA PHOTO, pas celle
//  de la carte. Une photo en paysage recadrée dans une carte en portrait
//  (2/3) est agrandie jusqu'à en couvrir la HAUTEUR : elle s'affiche sur
//  1,5 × (largeur ÷ hauteur) fois la largeur de la carte — 2,25 fois pour
//  un 3/2. Annoncer la seule largeur de la carte ferait choisir une
//  version deux fois trop petite, et l'affiche serait floue. Ce facteur
//  est lu dans l'en-tête du JPEG, photo par photo, et voyage sur la carte
//  (data-couverture) : le script le reprend quand la densité change.
function dimensionsJpeg(rel) {
    try {
        const b = fs.readFileSync(path.join(RACINE, rel));
        let i = 2;
        while (i + 9 < b.length) {
            if (b[i] !== 0xFF) { i++; continue; }
            const m = b[i + 1];
            // Les marqueurs SOF portent la taille de l'image (hors DHT,
            // JPG et DAC, qui partagent la plage sans la porter).
            if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
                return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
            }
            i += 2 + b.readUInt16BE(i + 2);
        }
    } catch (e) { /* illisible : facteur par défaut */ }
    return null;
}

const couverture = (rel) => {
    const d = dimensionsJpeg(rel);
    return d && d.h ? Math.max(1, 1.5 * d.w / d.h) : 2.25;
};

//  Au repos : deux colonnes au téléphone, quatre cartes de 240 px au plus
//  sur grand écran. Le script réécrit ces tailles à chaque changement de
//  densité (voir majTailles).
const taillesCarte = (f, colonnesMobile = 2, colonnesEcran = 4) =>
    `(max-width: 640px) ${Math.ceil(f * 100 / colonnesMobile)}vw, ${Math.ceil(f * 960 / colonnesEcran)}px`;

function imageCarte(src, pos, f) {
    const base = '../' + src.replace(/\.jpg$/, '');
    return `<picture><source type="image/webp" srcset="${esc(base)}-640.webp 640w, ${esc(base)}-1280.webp 1280w" sizes="${taillesCarte(f)}">`
        + `<img src="../${esc(src)}"${pos ? ` style="--pos:${esc(pos)}"` : ''} alt="" loading="lazy" decoding="async"></picture>`;
}

function pageRepertoire(fiches, misAJour) {
    const url = `${SITE}/spectacles/`;
    const titrePage = 'Répertoire : spectacles et films — Adrien Vada';
    const desc = 'Les spectacles et films d’Adrien Vada : rôles, distributions, dates et photographies.';

    const carte = (f, i) => {
        // La couleur du spectacle signe sa carte — filet sous le titre, halo
        // au survol. C'est l'accent de sa ligne de CV quand elle en porte un,
        // celui de sa palette sinon : jamais une couleur inventée ici.
        const accent = f.accent || '#bfa98a';
        const fil = [f.annee, f.genre].filter(Boolean).join(' ·\u00A0');
        // Un kakemono : l'affiche haute d'un hall de production. La photo est
        // recadrée en portrait sur le point du montage (--pos), et le
        // deuxième regard attend dans data-src2 — il ne se charge qu'au
        // premier survol, jamais d'avance.
        const f1 = f.vignette ? couverture(f.vignette) : 1;
        const media = f.vignette
            ? `<span class="media media--photo">${imageCarte(f.vignette, f.vignettePos, f1)}</span>`
            : `<span class="media"><span class="carton" style="--cbg:${esc(f.paletteBg || '#171410')};--ctx:${esc(f.paletteText || '#f2ece0')}">
                    <span class="carton-orne" aria-hidden="true">✦</span>
                    <span class="carton-titre">${esc(f.titre)}</span>
                    <span class="carton-orne" aria-hidden="true">✦</span>
                </span></span>`;
        // Le deuxième regard, en version allégée lui aussi ; l'original en
        // repli, pour un navigateur qui ne lirait pas le WebP.
        const second = f.vignette && f.vignette2
            ? ` data-src2="../${esc(f.vignette2.replace(/\.jpg$/, ''))}-1280.webp" data-src2-repli="../${esc(f.vignette2)}"${f.vignette2Pos ? ` data-pos2="${esc(f.vignette2Pos)}"` : ''}`
            : '';
        return `
        <li class="carte" style="--ac:${esc(accent)};--i:${i}" data-slug="${esc(f.slug)}" data-vt="fiche-${esc(f.slug)}"${f.vignette ? ` data-couverture="${f1.toFixed(3)}"` : ''}${second}>
            <a href="${esc(f.slug)}/">
                <span class="cadre">${media}${f.vignette ? '<span class="volet-couleur" aria-hidden="true"></span>' : ''}<span class="lueur" aria-hidden="true"></span>${f.synopsis ? `<span class="chuchote" aria-hidden="true"><span class="voile"></span><p>${f.synopsis.split(/\s+/).map((m, k) => `<span class="mot" style="--m:${k}">${esc(m)}</span>`).join(' ')}</p></span>` : ''}</span>
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

    // ── LA SALLE AUX COULEURS DU SPECTACLE ──
    // Survoler une carte teinte l'ambiance de toute la page — la lueur de la
    // manchette, le fleuron, les filets prennent la palette du spectacle
    // visé, puis l'or revient. Les règles sont écrites ICI, une par
    // spectacle : le CSS ne sait pas lire la couleur d'une carte survolée,
    // le générateur, lui, les connaît toutes.
    const ambiances = fiches.map(f =>
        `        body:has(.carte[data-slug="${f.slug}"] a:hover),
        body:has(.carte[data-slug="${f.slug}"].regarde) { --ambiance: ${f.accent || '#bfa98a'}; }`
    ).join('\n');

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
    <title>${esc(titrePage)}</title>
    <meta name="description" content="${esc(desc)}">
    <link rel="canonical" href="${url}">
    <script>
        // Thème appliqué AVANT le premier rendu — même clé et même logique
        // que la page d'accueil (avTheme) : le choix fait là-bas vaut ici.
        (function () {
            var t = 'dark';
            var stored = null;
            try { stored = localStorage.getItem('avTheme'); } catch (e) { }
            if (stored === 'light' || stored === 'dark') { t = stored; }
            else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) { t = 'light'; }
            document.documentElement.setAttribute('data-theme', t);
            // Visiter le répertoire, c'est être entré : le retour vers
            // l'accueil ne doit pas lever le rideau d'introduction —
            // « entrer par une porte dérobée reste entrer » (intro.js).
            try { localStorage.setItem('avIntroSeen', '1'); } catch (e) { }
        })();
    </script>
    <meta name="theme-color" content="#0a0907">

${MESURE}
    <meta property="og:type" content="website">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:site_name" content="Adrien Vada">
    <meta property="og:title" content="${esc(titrePage)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:image" content="${SITE}/ressources/images/og-adrien-vada.jpg">
    <meta property="og:url" content="${url}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/svg+xml" href="../favicon_io/favicon.svg">
    <!-- Les polices du site, servies par le site (ressources/polices/). -->
    <link rel="preload" href="../ressources/polices/cinzel-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="../ressources/polices/polices.css">
    <link rel="stylesheet" href="spectacle.css">
    <style>
        :root {
            --bg: #0a0907; --surface: #171410; --text: #f2ece0; --muted: #b0a798;
            --accent: #bfa98a; --accent-ink: #c9b494; --on-accent: #0a0907;
            --line: rgba(255, 255, 255, 0.13);
        }
${ambiances}
    </style>
    <script type="application/ld+json">
${JSON.stringify(liste, null, 2)}
    </script>
</head>

<body>
    ${miniSprite(['i-solid-masks-theater', 'i-solid-film', 'i-solid-sun', 'i-solid-moon'])}
    <!-- La sentinelle : un point posé au-dessus de la barre. Tant qu'il est
         visible, la barre est chez elle ; dès qu'il sort, elle flotte —
         le même guet que la barre d'onglets de l'accueil. -->
    <div class="barre-sentinelle" aria-hidden="true"></div>
    <header class="barre">
        <a class="retour" href="../"><span aria-hidden="true">←</span> Adrien Vada</a>
        <div class="outils">
            <!-- La densité du mur : moins d'affiches par rang (+), plus (−).
                 Cachés sans script, qui seul sait les faire agir. -->
            <div class="densite" role="group" aria-label="Taille des affiches">
                <button type="button" class="densite-btn" data-densite="1" hidden aria-label="Affiches plus petites" title="Affiches plus petites"><span aria-hidden="true">−</span></button>
                <button type="button" class="densite-btn" data-densite="-1" hidden aria-label="Affiches plus grandes" title="Affiches plus grandes"><span aria-hidden="true">+</span></button>
            </div>
            <button type="button" class="bascule" data-bascule aria-label="Passer au thème clair" title="Passer au thème clair">
                <svg class="ico" data-bascule-icone aria-hidden="true"><use href="#i-solid-sun"></use></svg>
            </button>
        </div>
    </header>
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

    <!-- Trois gestes, rien de plus : l'appui maintenu qui vaut survol (le
         même que le murmure du CV), le deuxième regard qui ne se charge
         qu'au premier survol, et le nom de transition posé sur la seule
         carte cliquée. Sans JavaScript, la page reste entière — survols
         souris compris, hors fondu du deuxième regard. -->
    <script>
    (function () {
        'use strict';
        var APPUI = 400; // ms — l'appui maintenu du murmure, à l'identique
        var cartes = Array.prototype.slice.call(document.querySelectorAll('.carte'));

        function regarde(c, oui) { c.classList.toggle('regarde', oui); }

        // Le deuxième regard : la photo suivante du montage n'est pas dans
        // la page — elle naît au premier survol, jamais d'avance.
        function eveille(c) {
            if (!c.dataset.src2 || c.querySelector('.img2')) return;
            var i = new Image();
            i.className = 'img2'; i.alt = ''; i.decoding = 'async';
            if (c.dataset.pos2) i.style.setProperty('--pos', c.dataset.pos2);
            // Le fondu n'a de sens que sur une image ENTIÈRE : la classe
            // n'arrive qu'au décodage — jamais de pixels qui surgissent.
            if (c.dataset.src2Repli) {
                i.onerror = function () {
                    i.onerror = null;
                    i.src = c.dataset.src2Repli;
                };
            }
            i.src = c.dataset.src2;
            var prete = function () { i.classList.add('prete'); };
            if (i.decode) { i.decode().then(prete).catch(prete); } else { i.onload = prete; }
            // Ceinture : si le décodage ne répond pas, le fondu part
            // quand même — une image tardive vaut mieux qu'aucune.
            setTimeout(prete, 1200);
            var m = c.querySelector('.media'); if (m) m.appendChild(i);
        }

        cartes.forEach(function (c) {
            // La souris survole…
            c.addEventListener('pointerenter', function (e) {
                if (e.pointerType === 'touch') return;
                eveille(c); regarde(c, true);
            });
            c.addEventListener('pointerleave', function (e) {
                if (e.pointerType === 'touch') return;
                regarde(c, false);
            });
            // …le doigt appuie. Mêmes règles que le murmure du CV : l'appui
            // maintenu allume la carte, le doigt qui glisse annule, et le
            // relâchement après l'appui n'ouvre pas la fiche.
            var minuteur = 0, tenu = false, appuye = false, x0 = 0, y0 = 0;
            c.addEventListener('touchstart', function (e) {
                var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; tenu = false; appuye = true;
                clearTimeout(minuteur);
                minuteur = setTimeout(function () { tenu = true; eveille(c); regarde(c, true); }, APPUI);
            }, { passive: true });
            // Android ouvre le menu contextuel du lien vers 500 ms : il
            // couperait l'appui maintenu net. On le retient pendant le
            // geste — le clic droit d'une souris, lui, garde son menu.
            c.addEventListener('contextmenu', function (e) {
                if (appuye || tenu) e.preventDefault();
            });
            c.addEventListener('touchmove', function (e) {
                var t = e.touches[0];
                if (Math.hypot(t.clientX - x0, t.clientY - y0) > 12) {
                    clearTimeout(minuteur);
                    if (tenu) { regarde(c, false); tenu = false; }
                }
            }, { passive: true });
            c.addEventListener('touchend', function (e) {
                clearTimeout(minuteur); appuye = false;
                if (tenu) { e.preventDefault(); regarde(c, false); tenu = false; }
            });
            c.addEventListener('touchcancel', function () {
                clearTimeout(minuteur); appuye = false; regarde(c, false); tenu = false;
            });
        });

        // Le morphing vers la fiche : au départ, SEULE la carte cliquée
        // porte un nom de transition — dix groupes muets pèseraient pour
        // rien. Au retour, la carte d'où l'on revient reprend son nom avant
        // la première image, et la fiche vient s'y ranger.
        function nomme(chemin) {
            cartes.forEach(function (c) {
                var a = c.querySelector('a'), cadre = c.querySelector('.cadre');
                if (!a || !cadre) return;
                cadre.style.viewTransitionName =
                    (new URL(a.href).pathname === chemin) ? c.dataset.vt : 'none';
            });
        }
        addEventListener('pageswap', function (e) {
            if (!e.viewTransition || !e.activation) return;
            nomme(new URL(e.activation.entry.url).pathname);
        });
        // L'entrée en scène, liée au geste : à chaque défilement, une
        // image d'animation repose la progression --p des seules cartes
        // à l'écran — 0 au bas de l'écran, 1 aux deux tiers de la
        // montée, adoucie ici pour que la feuille n'ait que des règles
        // de trois. Une carte qui ressort par le bas revient à zéro :
        // remonter la rejoue, c'est le geste qui commande. Les deux
        // surprises une-fois (dorure, filet) partent au passage du
        // milieu, échelonnées selon la place dans la rangée.
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
            document.documentElement.classList.add('scrolly');
            var suivies = [];
            var enMouvement = false;
            var adoucit = function (t) { return 1 - Math.pow(1 - t, 3); };
            // L'INERTIE : la progression ne saute pas à sa cible, elle la
            // poursuit — un huitième du chemin par image. Une pichenette
            // rapide laisse donc les cartes finir leur entrée en douceur,
            // au niveau des yeux, au lieu de l'expédier sous le pouce.
            // La boucle ne tourne que tant qu'il reste du chemin.
            var boucle = function () {
                var vh = innerHeight;
                // Au fond de la page, plus personne ne reste en l'air : la
                // dernière rangée ne peut plus voyager, alors sur le
                // dernier tiers d'écran de défilement restant, un plancher
                // monte vers 1 et achève toutes les entrées.
                var doc = document.documentElement;
                var reste = doc.scrollHeight - vh - (window.scrollY || doc.scrollTop || 0);
                var plancher = Math.max(0, Math.min(1, 1 - reste / (vh * .3)));
                var encore = false;
                for (var k = 0; k < suivies.length; k++) {
                    var carte = suivies[k];
                    var r = carte.getBoundingClientRect();
                    var base = Math.max(0, Math.min(1, (vh - r.top) / (vh * .75)));
                    // La vague gauche-droite : chaque colonne prend un
                    // retard de phase sur sa voisine. La phase S'ÉTEINT à
                    // mesure que la montée s'achève — une carte peut être
                    // en retard sur sa voisine, jamais empêchée d'arriver.
                    var cible = Math.max(0, Math.min(1,
                        base - (Math.max(0, r.left) / innerWidth) * .22 * (1 - base)));
                    cible = Math.max(cible, plancher);
                    var p = parseFloat(carte.dataset.p || '0');
                    p += (cible - p) * .13;
                    if (Math.abs(cible - p) > .002) { encore = true; } else { p = cible; }
                    carte.dataset.p = p;
                    // Deux horloges tirées de la même poursuite : la linéaire
                    // (--pl) pour le fondu, qui doit partir de zéro au bord ;
                    // la souple (--p) pour les mouvements, vifs puis posés.
                    carte.style.setProperty('--pl', p.toFixed(4));
                    carte.style.setProperty('--p', adoucit(p).toFixed(4));
                    if (cible >= .45 && !carte.classList.contains('en-scene')) {
                        carte.style.setProperty('--retard',
                            Math.round(Math.max(0, r.left) / innerWidth * 280) + 'ms');
                        carte.classList.add('en-scene');
                    }
                }
                if (encore) { requestAnimationFrame(boucle); } else { enMouvement = false; }
            };
            var replanifieScene = function () {
                if (!enMouvement) { enMouvement = true; requestAnimationFrame(boucle); }
            };
            var ioScene = new IntersectionObserver(function (entrees) {
                entrees.forEach(function (e) {
                    var i = suivies.indexOf(e.target);
                    if (e.isIntersecting && i === -1) suivies.push(e.target);
                    if (!e.isIntersecting && i !== -1) {
                        suivies.splice(i, 1);
                        // Sortie par le haut : posée. Par le bas : à zéro,
                        // prête à rejouer son entrée.
                        var repos = e.boundingClientRect.top < 0 ? '1' : '0';
                        e.target.dataset.p = repos;
                        e.target.style.setProperty('--p', repos);
                        e.target.style.setProperty('--pl', repos);
                    }
                });
                replanifieScene();
            }, { rootMargin: '8% 0%' });
            cartes.forEach(function (c) { ioScene.observe(c); });
            addEventListener('scroll', replanifieScene, { passive: true });
            addEventListener('resize', replanifieScene);
            replanifieScene();

            // La vitrine scintille : toutes les quelques secondes, une
            // carte posée — jamais celle qu'on regarde — reçoit un
            // nouveau passage de dorure. Une seule à la fois, rien quand
            // l'onglet dort. TROIS FOIS, puis la vitrine se tient
            // tranquille : un éclat qui revient sans fin dans le coin de
            // l'œil empêche de lire le reste, et rien ne permettait de
            // l'arrêter (WCAG 2.2.2).
            var passages = 0;
            var scintille = setInterval(function () {
                if (document.hidden) return;
                var posees = cartes.filter(function (c) {
                    return c.classList.contains('en-scene') &&
                        !c.classList.contains('regarde') && !c.classList.contains('reluit');
                });
                if (!posees.length) return;
                var elue = posees[Math.floor(Math.random() * posees.length)];
                elue.classList.add('reluit');
                setTimeout(function () { elue.classList.remove('reluit'); }, 1450);
                if (++passages >= 3) clearInterval(scintille);
            }, 4600);
        }

        // ── La densité du mur, aux boutons − et + ──
        // Elle se réglait au pincement, façon Google Photos. Mais pour
        // cela la page confisquait le pincement au navigateur
        // (touch-action), et plus personne ne pouvait AGRANDIR LA PAGE —
        // le geste même dont a besoin qui voit mal (WCAG 1.4.4). Le
        // pincement est rendu au navigateur ; la densité passe à deux
        // boutons, que le clavier atteint aussi. Les affiches glissent
        // toujours jusqu'à leur nouvelle place (View Transition) ; sans
        // soutien, ou en mouvement réduit, la grille bascule d'un coup.
        var reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
        // Une colonne unique au téléphone : l'affiche en grand, pour qui
        // voit mal — le pincement ne l'offrait pas.
        var NIVEAUX = function () { return innerWidth < 640 ? [1, 2, 3, 4] : [2, 3, 4, 5]; };
        var zoomRepos = function () { return innerWidth < 640 ? 2 : 4; };
        var zoomCourant = function () {
            return parseInt(document.documentElement.dataset.zoom || '0', 10) || zoomRepos();
        };
        var boutonsDensite = Array.prototype.slice.call(document.querySelectorAll('[data-densite]'));
        function majBoutons() {
            var n = NIVEAUX(), c = zoomCourant();
            boutonsDensite.forEach(function (b) {
                // +1 : une colonne de plus, donc des affiches plus petites.
                b.disabled = +b.dataset.densite > 0 ? c >= n[n.length - 1] : c <= n[0];
            });
        }
        // Les photos annoncent leur nouvelle taille affichée : le
        // navigateur va chercher la version plus grande si elle manque.
        function majTailles(colonnes) {
            cartes.forEach(function (c) {
                var f = parseFloat(c.dataset.couverture || '1');
                var s = '(max-width: 640px) ' + Math.ceil(f * 100 / colonnes) + 'vw, ' +
                    Math.ceil(f * 960 / colonnes) + 'px';
                var source = c.querySelector('source');
                if (source) source.setAttribute('sizes', s);
            });
        }
        function poseDensite(v) {
            var applique = function () {
                document.documentElement.dataset.zoom = v;
                majTailles(v);
                majBoutons();
                if (typeof replanifieScene === 'function') replanifieScene();
            };
            if (document.startViewTransition && !reduit) {
                cartes.forEach(function (c) { c.style.viewTransitionName = 'c-' + c.dataset.slug; });
                var t = document.startViewTransition(applique);
                t.finished.then(function () { }, function () { }).then(function () {
                    cartes.forEach(function (c) { c.style.viewTransitionName = ''; });
                });
            } else { applique(); }
        }
        boutonsDensite.forEach(function (b) {
            b.hidden = false;
            b.addEventListener('click', function () {
                var n = NIVEAUX(), i = n.indexOf(zoomCourant());
                if (i === -1) i = n.indexOf(zoomRepos());
                var v = n[i + (+b.dataset.densite)];
                if (v) poseDensite(v);
            });
        });
        majBoutons();
        addEventListener('resize', majBoutons);

        // La barre flotte dès que sa sentinelle sort de l'écran — le même
        // guet que la barre d'onglets de l'accueil : aucun calcul au fil
        // des pixels, c'est le navigateur qui prévient au bon instant.
        var barre = document.querySelector('.barre');
        var sentinelle = document.querySelector('.barre-sentinelle');
        if (barre && sentinelle && 'IntersectionObserver' in window) {
            new IntersectionObserver(function (entrees) {
                barre.classList.toggle('est-collee', !entrees[0].isIntersecting);
            }, { threshold: 0 }).observe(sentinelle);
        }

        // La bascule de thème : même clé que l'accueil (avTheme), mêmes
        // astres — soleil pour aller au clair, lune pour revenir au soir.
        var bascule = document.querySelector('[data-bascule]');
        function appliqueTheme(theme, retenir) {
            document.documentElement.setAttribute('data-theme', theme);
            if (retenir) { try { localStorage.setItem('avTheme', theme); } catch (e) { } }
            var versClair = theme === 'dark';
            var action = versClair ? 'Passer au thème clair' : 'Passer au thème sombre';
            if (bascule) {
                bascule.setAttribute('aria-label', action);
                bascule.setAttribute('title', action);
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

        addEventListener('pagereveal', function (e) {
            if (!e.viewTransition) return;
            // Revenir par morphing ET lever les cartes une à une se
            // disputeraient l'écran : au retour, elles sont déjà en place.
            document.documentElement.classList.add('retour-vt');
            var act = (typeof navigation !== 'undefined') && navigation.activation;
            if (act && act.from) nomme(new URL(act.from.url).pathname);
        });
    })();
    </script>
</body>

</html>
`;
}

// ── Feuille de style du répertoire ──────────────────────────────────
//  Chargée par la seule page /spectacles/ — les fiches, elles, portent
//  univers.css et leur palette.
const FEUILLE = `/* RÉPERTOIRE (/spectacles/) — feuille générée (build/generer-pages-spectacles.js)
   Le costume du site : Cinzel, or sur noir, la couleur de chaque spectacle
   (--ac, posée sur sa carte) en signature — et quatre mises en scène :
   le grain de pellicule, les kakemonos, la vitrine en profondeur, la
   salle qui prend les couleurs du spectacle survolé (--ambiance). */
*, *::before, *::after { box-sizing: border-box; }

/* L'ambiance est une COULEUR ENREGISTRÉE : déclarée en <color>, elle
   s'interpole — le passage d'un or à un carmin est un glissement, pas un
   claquement. Les règles qui la changent sont écrites dans la page, une
   par spectacle : le générateur les connaît toutes. */
@property --ambiance {
    syntax: '<color>';
    inherits: true;
    initial-value: #bfa98a;
}

/* Les deux thèmes — mêmes valeurs que la page d'accueil (avTheme). Les
   couvertures des spectacles, elles, gardent leurs palettes : une affiche
   ne change pas de couleurs selon la salle. */
:root {
    --ombre: rgba(0, 0, 0, .8);
    --vignette: rgba(0, 0, 0, .28);
    --or-defaut: #bfa98a;
    /* Part d'accent gardée dans l'encre des pastilles d'état — voir .etat. */
    --etat-encre: 65%;
}
:root[data-theme="light"] {
    --etat-encre: 45%;
    --bg: #faf9f5; --surface: #ffffff; --text: #1a1a1f; --muted: #575761;
    --accent: #967e5b; --accent-ink: #826c4a; --on-accent: #ffffff;
    --line: rgba(26, 26, 31, 0.14);
    --ombre: rgba(41, 37, 36, .28);
    --vignette: rgba(41, 37, 36, .10);
    --or-defaut: #967e5b;
}

body {
    position: relative; /* l'ancre de la sentinelle de barre */
    margin: 0; padding: 0 1.25rem 3.5rem;
    background: var(--bg); color: var(--text);
    font: 400 16px/1.65 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    --ambiance: var(--or-defaut);
    transition: --ambiance .55s ease, background-color .35s ease, color .35s ease;
}

/* Sous la page, la lueur — elle prend la couleur d'ambiance. */
body::before {
    content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
    background: radial-gradient(58rem 30rem at 50% -8rem,
            color-mix(in srgb, var(--ambiance) 9%, transparent), transparent 68%);
}

/* Sur la page, la matière : un grain de pellicule (bruit SVG de 600 octets,
   opacité gravée dans son alpha) et un vignettage de salle éteinte. */
body::after {
    content: ''; position: fixed; inset: 0; z-index: 40; pointer-events: none;
    background:
        radial-gradient(130% 110% at 50% 12%, transparent 58%, var(--vignette) 100%),
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.06'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E") repeat;
}

main { max-width: 64rem; margin: 0 auto; }
a { color: var(--accent-ink); }

/* ── La barre — retour à gauche, bascule à droite ──
   Chez elle en haut de page, transparente et sans cadre. Dès que la
   sentinelle sort de l'écran, elle flotte à une petite marge du bord :
   pastille presque opaque (du texte défile dessous), verre flouté,
   filet d'or — le même costume que la barre d'onglets de l'accueil. */
.barre-sentinelle { position: absolute; top: 0; left: 0; width: 1px; height: 1px; }
.barre {
    position: sticky; top: .75rem; z-index: 30;
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    max-width: 64rem; margin: .65rem auto 0; padding: .4rem .55rem;
    border: 1px solid transparent; border-radius: 999px;
}
.barre.est-collee {
    /* Le fond, le filet et le halo suivent l'ambiance : survoler
       Bérénice rosit aussi la barre — la salle entière est au spectacle. */
    background: color-mix(in srgb, var(--surface) 94%, var(--ambiance));
    -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
    border-color: color-mix(in srgb, var(--ambiance) 30%, transparent);
    box-shadow: 0 8px 22px -10px rgba(0, 0, 0, .55),
        0 0 20px -6px color-mix(in srgb, var(--ambiance) 38%, transparent);
    padding-left: .9rem; padding-right: .55rem;
}
@media (prefers-reduced-motion: no-preference) {
    .barre { transition: background-color 240ms ease, box-shadow 240ms ease, border-color 240ms ease, padding 240ms ease; }
}
.retour {
    display: inline-block;
    font-size: .72rem; letter-spacing: .14em; text-transform: uppercase;
    text-decoration: none; color: var(--muted);
    transition: color .25s ease;
}
.retour:hover { color: var(--accent-ink); }

/* La bascule de thème — même geste qu'à l'accueil. Soleil d'ambre pour
   aller au clair, lune d'encre pour revenir au soir. */
.bascule {
    display: grid; place-items: center; width: 2.3rem; height: 2.3rem; flex: none;
    border: 1px solid var(--line); border-radius: 999px;
    background: var(--surface); color: #fbbf24; cursor: pointer;
    transition: border-color .3s ease, color .3s ease, background-color .35s ease;
}
:root[data-theme="light"] .bascule { color: #6366a8; }
.bascule:hover { border-color: color-mix(in srgb, var(--accent) 55%, transparent); }
.bascule .ico { font-size: .95rem; }
.outils { display: flex; align-items: center; gap: .5rem; }
/* La densité du mur — mêmes pastilles que la bascule, un signe dedans. */
.densite { display: flex; gap: .3rem; }
.densite-btn {
    display: grid; place-items: center; width: 2.3rem; height: 2.3rem; flex: none;
    border: 1px solid var(--line); border-radius: 999px;
    background: var(--surface); color: var(--text); cursor: pointer;
    font: 500 1.15rem/1 'Inter', system-ui, sans-serif;
    transition: border-color .3s ease, opacity .3s ease, background-color .35s ease;
}
.densite-btn:hover:not(:disabled) { border-color: color-mix(in srgb, var(--accent) 55%, transparent); }
/* Au bout de l'échelle, le bouton s'éteint (et le clavier le saute). */
.densite-btn:disabled { opacity: .35; cursor: default; }
.densite-btn:focus-visible, .bascule:focus-visible, .retour:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 3px;
}

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
/* Le fleuron suit l'ambiance : il est la première chose qui rosit quand on
   survole Bérénice, la première qui reprend l'or quand la main s'en va. */
.ornement {
    position: relative; margin: 1.5rem auto 0; width: 11rem; height: 1px;
    background: linear-gradient(90deg, transparent,
            color-mix(in srgb, var(--ambiance) 60%, transparent), transparent);
}
.ornement span {
    position: absolute; left: 50%; top: 50%; width: 7px; height: 7px;
    transform: translate(-50%, -50%) rotate(45deg);
    background: var(--ambiance); box-shadow: 0 0 0 3px var(--bg);
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
    background: var(--surface); color: var(--ambiance);
}
.ico { display: block; width: 1em; height: 1em; fill: currentColor; font-size: .8rem; }
.groupe-filet {
    flex: 1; height: 1px;
    background: linear-gradient(90deg,
            color-mix(in srgb, var(--ambiance) 26%, var(--line)), transparent);
}

/* ── Les kakemonos ──
   Des affiches hautes (2/3), serrées comme dans le hall d'une maison de
   production. Le recadrage portrait vise le point du montage (--pos). */
.repertoire {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: 1.9rem 1.5rem; margin: 0; padding: 1.8rem 0 .6rem;
    list-style: none; align-items: start;
}
.carte a {
    display: block; text-decoration: none; color: inherit;
    -webkit-touch-callout: none; -webkit-user-select: none; user-select: none;
}
.carte a:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: .65rem; }
.cadre {
    position: relative; display: block; aspect-ratio: 2 / 3;
    /* hidden ferait du cadre un CONTENEUR DE DÉFILEMENT : la timeline
       view() de la dérive s'y accrocherait et ne progresserait jamais.
       clip rogne pareil sans créer de boîte — le même piège, et le même
       remède, que la barre collante du CV (voir README). */
    overflow: hidden; overflow: clip;
    border-radius: .65rem; border: 1px solid var(--line); background: var(--surface);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04), 0 10px 28px -18px var(--ombre);
    transition: border-color .35s ease, box-shadow .35s ease, transform .35s ease;
}
.media { position: absolute; inset: 0; display: block; }
/* Le rai de la dorure : hors champ à gauche, il ne traverse qu'une
   fois, à l'entrée en scène. Doré, léger, au-dessus de l'affiche et
   sous le murmure. */
.cadre::after {
    content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
    background: linear-gradient(105deg, transparent 42%, rgba(255, 236, 200, .2) 50%, transparent 58%);
    transform: translateX(-135%);
}
.media img {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; object-position: var(--pos, 50% 32%);
    transition: transform .6s cubic-bezier(.2, .6, .2, 1);
}
/* Le deuxième regard : la photo suivante du montage, née au premier survol
   (voir le script de la page), fond par-dessus la première. */
.img2 { opacity: 0; transition: opacity .6s ease, transform .6s cubic-bezier(.2, .6, .2, 1); }
.carte.regarde .img2.prete { opacity: 1; }
.lueur { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, transparent 55%, rgba(0, 0, 0, .3)); }

/* Le murmure du kakemono — le synopsis se révèle mot à mot dans la
   carte, comme sur les lignes du CV, par-dessus le deuxième regard. Un
   voile monte d'abord pour asseoir la lecture ; chaque mot sort d'un
   flou, l'un après l'autre (--m, posé au balisage). Toujours ivoire :
   il se lit sur une photographie, pas sur la page. */
.chuchote {
    position: absolute; inset: 0; z-index: 2; pointer-events: none;
    display: flex; align-items: flex-end; padding: 1rem .95rem;
}
.voile {
    position: absolute; inset: 0; opacity: 0; transition: opacity .5s ease;
    background: linear-gradient(180deg, rgba(10, 9, 7, 0) 0%, rgba(10, 9, 7, .34) 42%, rgba(10, 9, 7, .82) 100%);
}
.chuchote p { position: relative; margin: 0; font: 400 .74rem/1.6 'Inter', system-ui, sans-serif; color: #f2ece0; }
.mot {
    display: inline-block; opacity: 0; filter: blur(5px); transform: translateY(4px);
    transition: opacity .45s ease, filter .45s ease, transform .45s ease;
}
.carte a:hover .voile, .carte.regarde .voile { opacity: 1; }
.carte a:hover .mot, .carte.regarde .mot {
    opacity: 1; filter: none; transform: none;
    transition-delay: calc(140ms + var(--m, 0) * 26ms);
}

/* La couverture des spectacles sans photographie : l'aplat de leur palette,
   leur titre en Cinzel entre deux fleurons — une affiche d'attente. */
.carton {
    position: absolute; inset: 0; display: grid; place-content: center; gap: .8rem;
    padding: 1.2rem; text-align: center;
    background: linear-gradient(165deg, color-mix(in srgb, var(--cbg) 88%, #f2ece0), var(--cbg));
}
.carton::after {
    content: ''; position: absolute; inset: .6rem; pointer-events: none;
    border: 1px solid color-mix(in srgb, var(--ctx) 22%, transparent); border-radius: .4rem;
}
.carton-orne { font-size: .68rem; color: var(--ac, var(--accent)); }
.carton-titre { font: 600 1.1rem/1.35 'Cinzel', Georgia, serif; color: var(--ctx); text-wrap: balance; }

/* Le survol — et son jumeau .regarde, posé par l'appui maintenu du doigt. */
.carte a:hover .cadre, .carte.regarde .cadre, .carte a:focus-visible .cadre {
    border-color: color-mix(in srgb, var(--ac, var(--accent)) 55%, transparent);
    box-shadow: 0 16px 38px -14px color-mix(in srgb, var(--ac, var(--accent)) 40%, transparent),
        0 10px 28px -18px rgba(0, 0, 0, .8);
    transform: translateY(-3px);
}
.carte a:hover .media img, .carte.regarde .media img { transform: scale(1.05); }

.txt { display: block; padding-top: .7rem; }
/* L'année sur sa ligne, la pastille d'état TOUJOURS sur la sienne :
   « En création » n'est pas la suite de la date, c'est un tampon. */
.fil { display: block; }
.annee { display: block; }
.etat { display: inline-block; margin-top: .35rem; }
.annee {
    font-size: .7rem; line-height: 1.4; letter-spacing: .16em;
    text-transform: uppercase; color: var(--accent-ink);
}
/* LA PASTILLE PORTE LA COULEUR DE SON SPECTACLE, comme le badge du CV.
   Elle prenait l'or du site : toutes les cartes disaient donc leur état
   de la même voix, alors que chacune a déjà sa teinte — le fleuron, le
   filet sous le nom, la lueur au survol la portent. La pastille était le
   dernier élément à ne pas suivre.

   L'encre est l'accent ramené vers --text, jamais l'accent brut : sur
   onze spectacles, les plus foncés tombent sous 2 de contraste en thème
   sombre, les plus vifs en font autant en clair, et ce texte-ci est
   petit (.69rem, 11 px : il faisait 9 px, et 7,7 au téléphone). Le mélange va toujours à l'opposé du fond. La proportion suit
   le thème pour la même raison que sur le CV — voir --cv-badge-encre
   dans index.html, où le calcul est détaillé.

   Mesuré ici sur les onze cartes, encre contre fond de pastille composé :
   5,06 au pire en sombre, 4,89 en clair. Le cas serré est le tilleul
   d'As You Like It sur fond clair — c'est lui qui a fait descendre le
   clair à 45 %, où 48 % le laissaient pile sur le seuil de 4,5. */
.etat {
    font: 600 .69rem/1 'Inter', system-ui, sans-serif; letter-spacing: .1em;
    text-transform: uppercase; white-space: nowrap;
    color: color-mix(in srgb, var(--ac, var(--accent)) var(--etat-encre, 65%), var(--text));
    border: 1px solid color-mix(in srgb, var(--ac, var(--accent)) 45%, transparent);
    border-radius: 999px; padding: .22rem .5rem;
    background: color-mix(in srgb, var(--ac, var(--accent)) 9%, transparent);
}
.nom {
    position: relative; display: block; margin-top: .3rem; padding-bottom: .5rem;
    font: 600 1.02rem/1.3 'Cinzel', Georgia, serif; color: var(--text);
    transition: color .3s ease;
}
.nom::after {
    content: ''; position: absolute; left: 0; bottom: 0; width: 1.4rem; height: 2px;
    background: var(--ac, var(--accent)); opacity: .55;
    transition: width .35s ease, opacity .35s ease;
}
.carte a:hover .nom, .carte.regarde .nom { color: var(--accent-ink); }
.carte a:hover .nom::after, .carte.regarde .nom::after { width: 2.6rem; opacity: 1; }
.role { display: block; margin-top: .3rem; font-size: .78rem; color: var(--muted); }

@media (prefers-reduced-motion: no-preference) {
    html { scroll-behavior: smooth; }
    /* Le fleuron respire — à peine : la manchette n'est pas un aplat mort.
       UNE respiration (l'aller, puis le retour au repos), et non plus sans
       fin : un mouvement perpétuel à côté du texte doit pouvoir être
       arrêté (WCAG 2.2.2) — le plus simple est qu'il s'arrête seul. */
    .ornement span { animation: fleuron-respire 5.5s ease-in-out 2 alternate; }
}
@keyframes fleuron-respire {
    from { transform: translate(-50%, -50%) rotate(45deg); box-shadow: 0 0 0 3px var(--bg); }
    to {
        transform: translate(-50%, -50%) rotate(45deg) scale(1.16);
        box-shadow: 0 0 0 3px var(--bg), 0 0 13px 2px color-mix(in srgb, var(--ambiance) 55%, transparent);
    }
}

/* ── L'entrée en scène, LIÉE AU GESTE ──
   La règle des univers vaut ici : une révélation pilotée par la
   position de défilement, jamais par un déclencheur — c'est le lien
   direct entre le doigt et l'image qui fait l'effet. Le script pose
   sur chaque carte une progression --p (0 en bas de l'écran, 1 aux
   deux tiers de la montée, déjà adoucie) ; tout le reste est du
   calcul de feuille. Redescendre rembobine, remonter rejoue —
   l'apparition appartient au geste. Sans script ou en mouvement
   réduit, --p vaut 1 : tout est là, immobile.

   La carte se lève et se resserre en s'éveillant ; l'affiche se tasse
   doucement dans son cadre ; LE VOLET AUX COULEURS DU SPECTACLE glisse
   vers le haut et la découvre, bord adouci en dégradé. Restent deux
   surprises une-fois, au passage du milieu (.en-scene) : le rai de
   dorure, puis le filet du titre qui s'embrase. */
html.scrolly .carte { --p: 0; --pl: 0; }
.carte {
    /* Le fondu suit l'horloge LINÉAIRE (--pl) : la courbe souple charge
       tant le départ que, posée sur elle, l'opacité était pleine dès le
       bord de l'écran. Ici : zéro au bord, pleine au premier quart de la
       montée. Elle l'était au tiers — mais au repos, sans défilement, les
       cartes du bas de l'écran restaient alors à demi fondues, leur texte
       sous le contraste minimal tant qu'on ne bougeait pas. Le fondu
       s'achève désormais avant qu'une carte ne soit vraiment à l'écran ;
       la montée, le resserrement et le volet gardent toute leur course. */
    opacity: min(1, calc(var(--pl, 1) / .3));
    transform: translateY(calc((1 - var(--p, 1)) * 72px)) scale(calc(.94 + var(--p, 1) * .06));
}
.media { transform: scale(calc(1.1 - var(--p, 1) * .1)); }
.volet-couleur {
    position: absolute; inset: -2% 0; z-index: 1; pointer-events: none;
    opacity: .42;
    background: linear-gradient(to top,
            transparent 0%,
            color-mix(in srgb, var(--ac, var(--accent)) 88%, transparent) 13%,
            var(--ac, var(--accent)) 40%,
            color-mix(in srgb, var(--ac, var(--accent)) 76%, #14100b) 100%);
    transform: translateY(calc(clamp(0, (var(--p, 1) - .22) / .6, 1) * -118%));
}
html.scrolly .carte:not(.en-scene) .nom::after { width: 0; opacity: 0; }
html.scrolly .carte.en-scene .nom::after { animation: filet-embrase .5s ease calc(var(--retard, 0ms) + 420ms) backwards; }
html.scrolly .carte.en-scene .cadre::after { animation: dorure .9s ease var(--retard, 0ms) both; }
/* La vitrine scintille : de temps en temps, une carte posée reçoit un
   nouveau passage de dorure (classe posée par le script, retirée après).
   La devanture vit, sans jamais gigoter. */
html.scrolly .carte.reluit .cadre::after { animation: dorure 1.3s ease both; }
@keyframes filet-embrase { from { width: 0; opacity: 0; } }
@keyframes dorure { from { transform: translateX(-135%); } to { transform: translateX(135%); } }

/* Au retour par morphing, les cartes sont déjà en place : rejouer
   l'entrée disputerait l'écran à la fiche qui vient s'y ranger. */
html.retour-vt .carte { --p: 1 !important; --pl: 1 !important; }
html.retour-vt .carte .nom::after,
html.retour-vt .carte .cadre::after { animation: none !important; }


/* ── Le morphing vers la fiche ──
   Les deux documents y consentent (celui-ci ici, les fiches dans leur
   propre <style>) ; le script ne nomme que la carte cliquée, et la vignette
   glisse jusqu'à devenir le panneau du spectacle. Navigateurs plus
   anciens : navigation ordinaire, rien de cassé. */
@view-transition { navigation: auto; }
::view-transition-group(*) { animation-duration: .5s; animation-timing-function: cubic-bezier(.2, .6, .2, 1); }
::view-transition-old(root), ::view-transition-new(root) { animation-duration: .3s; }
@media (prefers-reduced-motion: reduce) {
    ::view-transition-group(*), ::view-transition-image-pair(*),
    ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}

footer {
    max-width: 64rem; margin: 2.6rem auto 0; padding-top: 1.4rem;
    border-top: 1px solid var(--line);
    font-size: .8rem; color: var(--muted); text-align: center;
}
footer a { text-decoration: none; }
footer a:hover { color: var(--accent-ink); }
.maj { margin: .4rem 0 0; font-size: .72rem; letter-spacing: .06em; }

/* ── La densité du mur ──
   Les boutons − et + resserrent ou élargissent le mur : le script pose
   data-zoom sur <html>, la grille suit, et les kakemonos glissent
   jusqu'à leur nouveau rang (View Transitions même-document — sans
   soutien, bascule nette). Aux rangs serrés, la carte redevient une
   image : le fil et le rôle s'effacent, le titre se fait discret.
   Le pincement, lui, appartient de nouveau au navigateur : c'est le
   geste qui agrandit la page. */
html[data-zoom] .repertoire { grid-template-columns: repeat(var(--colonnes, 2), 1fr); }
html[data-zoom="1"] { --colonnes: 1; }
html[data-zoom="2"] { --colonnes: 2; }
html[data-zoom="3"] { --colonnes: 3; }
html[data-zoom="4"] { --colonnes: 4; }
html[data-zoom="5"] { --colonnes: 5; }
html[data-zoom="6"] { --colonnes: 6; }
html[data-zoom="1"] .nom { font-size: 1.12rem; }
@media (max-width: 640px) {
    html[data-zoom="3"] .repertoire { gap: .9rem .5rem; }
    html[data-zoom="3"] .nom { font-size: .62rem; padding-bottom: .28rem; }
    html[data-zoom="3"] .fil, html[data-zoom="3"] .role { display: none; }
    html[data-zoom="3"] .txt { padding-top: .35rem; }
    /* Au rang le plus serré, la carte n'est plus qu'une image : un mur
       de galerie, le titre attend dans la fiche. */
    html[data-zoom="4"] .repertoire { gap: .45rem .4rem; }
    html[data-zoom="4"] .txt { display: none; }
}

/* ── Téléphone : un mur d'affiches, pas une liste ── */
@media (max-width: 640px) {
    body { padding: 0 .9rem 2.6rem; }
    .tete { padding: 2.3rem 0 1.8rem; }
    .sur-titre { font-size: .69rem; letter-spacing: .2em; margin-bottom: .8rem; }
    .ornement { margin-top: 1.1rem; width: 8.5rem; }
    .groupe { margin-top: 2rem; gap: .6rem; font-size: .7rem; letter-spacing: .16em; }
    .groupe-ico { width: 1.65rem; height: 1.65rem; }
    .repertoire { grid-template-columns: repeat(2, 1fr); gap: 1.3rem .75rem; padding: 1.2rem 0 .4rem; }
    .txt { padding-top: .5rem; }
    .etat { margin-top: .28rem; }
    .annee { font-size: .69rem; letter-spacing: .1em; }
    .etat { font-size: .66rem; padding: .2rem .42rem; }
    .nom { font-size: .84rem; margin-top: .22rem; padding-bottom: .4rem; }
    .nom::after { height: 1.5px; }
    .role { font-size: .68rem; margin-top: .2rem; }
    .carton-titre { font-size: .9rem; }
    .carton-orne { font-size: .56rem; }
    .chuchote { padding: .8rem .7rem; }
    .chuchote p { font-size: .66rem; line-height: 1.55; }
    .barre { top: .55rem; margin-top: .5rem; }
    .bascule, .densite-btn { width: 2.1rem; height: 2.1rem; }
    footer { margin-top: 2rem; }
}
`;

// ── Les dates de dernière modification ──────────────────────────────
//  Le sitemap datait TOUTES les adresses du jour de la génération : pour
//  un moteur, le site entier changeait à chaque passage du script. Une
//  date qui ment toujours finit ignorée — y compris le jour où elle dit
//  vrai. Chaque adresse porte désormais le jour où son contenu a
//  réellement changé :
//    · une page générée qui sort identique à l'octet garde la date de
//      son dernier commit ; si elle a changé, c'est aujourd'hui ;
//    · l'accueil et la galerie, faits ailleurs, prennent la date du
//      dernier commit de leurs fichiers — ou aujourd'hui s'ils ont été
//      modifiés depuis sans être encore enregistrés.
//  Le script redevient ainsi idempotent pour de bon : relancé sans rien
//  changer, il ne réécrit pas une date.
const AUJOURDHUI = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

function lireSiExiste(rel) {
    try { return fs.readFileSync(path.join(RACINE, rel), 'utf8'); } catch (e) { return null; }
}

function dateGit(...fichiers) {
    const opt = { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
    try {
        if (execFileSync('git', ['status', '--porcelain', '--', ...fichiers], opt).trim()) return AUJOURDHUI;
        return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...fichiers], opt).trim() || AUJOURDHUI;
    } catch (e) {
        return AUJOURDHUI;   // pas de git (copie sans historique) : on ne sait pas, on date du jour
    }
}

// Écrit une page générée et rend la date de son dernier vrai changement.
function ecrirePage(rel, html, anciens) {
    fs.writeFileSync(path.join(RACINE, rel), html);
    return anciens[rel] === html ? dateGit(rel) : AUJOURDHUI;
}

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

    // Ce qui existait avant de tout effacer : c'est à cet état-là que
    // chaque page nouvelle est comparée (voir ecrirePage).
    const anciens = {};
    if (fs.existsSync(SORTIE)) {
        fs.readdirSync(SORTIE, { withFileTypes: true }).forEach(e => {
            const rel = e.isDirectory() ? `spectacles/${e.name}/index.html` : `spectacles/${e.name}`;
            const contenu = lireSiExiste(rel);
            if (contenu !== null) anciens[rel] = contenu;
        });
    }
    const dates = {};

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
        const ligneCv = cvParTitre[cle] || cvParTitre[normaliserTitre(cle)] || null;
        const cv = ligneCv || {};
        const dossier = path.join(SORTIE, uni.slug);
        fs.mkdirSync(dossier, { recursive: true });
        dates[uni.slug] = ecrirePage(`spectacles/${uni.slug}/index.html`, pageSpectacle(uni, cle, cv, SHOW_DATA), anciens);
        const photos = photosDe(uni);
        faites.push({
            slug: uni.slug,
            titre: uni.title || cle,
            annee: cv.annee || '',
            // L'année en nombre, pour trier. « 2018 - 2021 » donne 2018 : on
            // range sur le premier millésime venu, faute de mieux.
            anneeNum: parseInt((cv.annee || '').match(/\d{4}/)?.[0] || '0', 10),
            role: (uni.role || cv.role || '').replace(/^R[oô]les?\s*·\s*/i, ''),
            // Le murmure du kakemono : le synopsis de l'univers, plafonné —
            // au-delà de trente-quatre mots, la carte n'est plus une carte.
            synopsis: (() => {
                const mots = lignes(uni.synopsis).join(' ').split(/\s+/).filter(Boolean);
                return mots.length > 34 ? mots.slice(0, 34).join(' ') + '…' : mots.join(' ');
            })(),
            vignette: photos[0] ? photos[0].src : '',
            vignettePos: photos[0] ? posCss(photos[0].cadre) : '',
            // Le deuxième regard : au maintien du survol, la carte fond vers
            // la photo suivante du montage. Elle n'est chargée qu'à ce
            // moment-là (voir le script du répertoire), jamais d'avance.
            vignette2: photos[1] ? photos[1].src : '',
            vignette2Pos: photos[1] ? posCss(photos[1].cadre) : '',
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
            // LA MÊME RÉSOLUTION QUE CI-DESSUS, ET SURTOUT PAS UNE AUTRE.
            // Ce booléen ne sert qu'au rapport de fin — « aucune ligne de CV
            // appariée ». Il interrogeait `cvParTitre[cle]` sans normaliser,
            // alors que la lecture réelle, elle, normalise : le jour où les
            // deux écritures ont divergé, la page a été correctement
            // fabriquée ET signalée comme orpheline. Une alarme qui se trompe
            // coûte plus cher que pas d'alarme du tout.
            cv: Boolean(ligneCv)
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

    // « Mis à jour en septembre 2026 » : le mois où une fiche a changé
    // pour la dernière fois — et non plus celui où le script a tourné, qui
    // réécrivait la page chaque mois sans que rien n'ait bougé.
    const plusRecente = Object.values(dates).sort().pop() || AUJOURDHUI;
    const [an, mois] = plusRecente.split('-').map(Number);
    const misAJour = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
        .format(new Date(an, mois - 1, 1));
    const dateRepertoire = ecrirePage('spectacles/index.html', pageRepertoire(faites, misAJour), anciens);

    // ── sitemap ──
    const url = (loc, lastmod, freq, prio) => `    <url>
        <loc>${loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>${freq}</changefreq>
        <priority>${prio}</priority>
    </url>`;
    const urls = [
        url(`${SITE}/`, dateGit('index.html', 'dates.js'), 'weekly', '1.0'),
        url(`${SITE}/galerie/`, dateGit('galerie/index.html'), 'monthly', '0.9'),
        url(`${SITE}/spectacles/`, dateRepertoire, 'monthly', '0.9')
    ].concat(faites.map(f => url(`${SITE}/spectacles/${f.slug}/`, dates[f.slug], 'monthly', '0.8')));

    fs.writeFileSync(path.join(RACINE, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

    console.log(`  ${faites.length} pages spectacle générées dans /spectacles/`);
    faites.forEach(f => console.log(`    /spectacles/${f.slug}/   ${f.titre}${f.cv ? '' : '   (aucune ligne de CV appariée)'}`));
    console.log(`  /spectacles/            répertoire (plaque tournante)`);
    console.log(`  /galerie/               galerie photo`);
    console.log(`  sitemap.xml : ${faites.length + 3} adresses`);
}

main();
