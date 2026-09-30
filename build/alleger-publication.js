#!/usr/bin/env node
/**
 * ============================================================
 *  ALLÉGER LA COPIE PUBLIÉE — sans toucher aux sources
 * ============================================================
 *  Les sources de ce site sont écrites pour être relues : chaque
 *  décision y est expliquée, parfois sur vingt lignes. C'est leur
 *  valeur, et elles restent telles quelles dans le dépôt. Mais un
 *  visiteur les téléchargeait aussi — index.html pesait 470 ko, dont
 *  bien plus de la moitié de commentaires, qu'un téléphone devait
 *  recevoir et lire avant d'afficher la première ligne du CV.
 *
 *  Ce script retire commentaires et blancs de la COPIE que le
 *  workflow de publication empaquette (.github/workflows/publier.yml).
 *  Le dépôt n'est jamais modifié : la copie de l'action est jetée
 *  après le dépôt sur Pages.
 *
 *  PRUDENT PAR CONSTRUCTION. Rien n'est réécrit : on retire, on ne
 *  transforme pas — à UNE exception près, faite à part (voir plus bas,
 *  « Les deux feuilles de l'accueil, dans la page »).
 *    • JavaScript : terser SANS compression — commentaires et blancs
 *      ôtés, noms de variables LOCALES raccourcis, rien d'autre. Les
 *      noms globaux (openShowUniverse, closeVideoModal…) ne bougent
 *      pas : des attributs onclick les appellent par leur nom.
 *    • CSS : clean-css au niveau 1 — pas de fusion ni de réordonnance
 *      de règles, dont la cascade de ce site dépend.
 *    • HTML : blancs réduits À UNE ESPACE, jamais à zéro
 *      (conservativeCollapse) : le rendu d'un texte en ligne ne peut
 *      pas changer. Aucun attribut retiré ni réécrit — `alt=""` reste.
 *
 *  L'EXCEPTION : l'accueil reçoit styles.css et polices.css DANS la
 *  page, à la place de leurs <link>. Deux feuilles bloquantes, c'était
 *  un aller-retour de plus avant le premier affichage (FCP 676 → 496 ms
 *  en 4G lente). C'est une étape à part, après l'allègement, avec son
 *  propre contrôle : exactement deux <link> de moins, deux <style> de
 *  plus, et rien d'autre de changé. Les sources gardent leurs <link>.
 *
 *  ET CHAQUE FICHIER EST VÉRIFIÉ AVANT D'ÊTRE ÉCRIT : le JavaScript
 *  produit doit se compiler, les scripts en ligne aussi, le JSON-LD et
 *  les règles de spéculation se relire, et la page garder exactement le
 *  même nombre de balises de chaque sorte. Au moindre doute, le fichier
 *  reste l'original.
 *  Puis, si Playwright est là (l'étape du PDF l'installe), les pages
 *  sont ouvertes pour de bon : une seule erreur de script, et TOUT
 *  est remis dans l'état d'origine. Le pire cas est donc le site
 *  d'avant, jamais un site cassé.
 *
 *    node build/alleger-publication.js                 (dans l'action)
 *    node build/alleger-publication.js --racine <dir>  (sur une copie)
 *
 *  Il refuse de réécrire le dépôt lui-même hors de GitHub Actions :
 *  lancé par mégarde dans une copie de travail, il en effacerait tous
 *  les commentaires.
 * ============================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const { servir } = require('./serveur-local');

const DEPOT = path.resolve(__dirname, '..');

function lireOption(nom) {
    const i = process.argv.indexOf(nom);
    return i > 0 ? process.argv[i + 1] : null;
}
const RACINE = path.resolve(lireOption('--racine') || DEPOT);

if (require.main === module && RACINE === DEPOT && process.env.GITHUB_ACTIONS !== 'true') {
    console.error(
        'Refusé : ce script réécrit les fichiers en place, commentaires compris.\n' +
        'Il ne tourne que dans l\'action de publication, ou sur une copie :\n' +
        '  node build/alleger-publication.js --racine /chemin/vers/une/copie'
    );
    process.exit(1);
}

// Les outils sont installés globalement par l'action (comme Playwright,
// pour ne pas glisser un node_modules dans le site empaqueté).
let RACINE_GLOBALE = null;
function charger(nom) {
    try { return require(nom); } catch (e) { /* on tente la globale */ }
    try {
        if (!RACINE_GLOBALE) {
            RACINE_GLOBALE = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
        }
        return require(path.join(RACINE_GLOBALE, nom));
    } catch (e) {
        return null;
    }
}

// ────────────────────────────────────────────────────────────
//  CE QUI EST ALLÉGÉ
// ────────────────────────────────────────────────────────────
//  Les pages publiques et ce qu'elles chargent. PAS l'administration
//  (admin/) : peu de visites, et c'est l'outil d'Adrien — il ne doit
//  courir aucun risque pour quelques kilo-octets. PAS styles.css :
//  Tailwind le sort déjà minifié. PAS les fichiers de configuration.
function fichiersDuSite() {
    const lister = (dossier, ext) => {
        const abs = path.join(RACINE, dossier);
        if (!fs.existsSync(abs)) return [];
        return fs.readdirSync(abs, { withFileTypes: true }).flatMap(e => {
            const rel = path.join(dossier, e.name);
            if (e.isDirectory()) return lister(rel, ext);
            return e.name.endsWith(ext) ? [rel] : [];
        });
    };
    const existants = liste => liste.filter(f => fs.existsSync(path.join(RACINE, f)));
    return {
        html: existants(['index.html', '404.html'])
            .concat(lister('spectacles', '.html'))
            .concat(lister('galerie', '.html')),
        js: existants([
            'regie.js', 'univers.js', 'univers-montage.js', 'intro.js', 'mask-points.js',
            'dates.js', 'dates-live.js',
        ]),
        // Le répertoire et la galerie n'ont plus de feuille à eux : leurs
        // générateurs l'écrivent dans la page, allégée avec elle.
        css: existants(['univers.css', 'univers-statique.css', 'ressources/polices/polices.css']),
    };
}

// ────────────────────────────────────────────────────────────
//  LES TROIS ALLÈGEMENTS
// ────────────────────────────────────────────────────────────
const OPTIONS_TERSER = {
    compress: false,
    mangle: true,          // noms LOCAUX seulement (toplevel reste à false)
    format: { comments: false },
};

function verifierJs(code, nom) {
    // Compiler sans exécuter : une erreur de syntaxe lève ici.
    new vm.Script(code, { filename: nom });
}

async function allegerJs(source, nom, terser) {
    const sortie = await terser.minify(source, OPTIONS_TERSER);
    if (!sortie.code) throw new Error('terser n\'a rien produit');
    verifierJs(sortie.code, nom);
    return sortie.code;
}

function allegerCss(source, CleanCSS) {
    const sortie = new CleanCSS({ level: 1, inline: false, rebase: false }).minify(source);
    if (sortie.errors.length) throw new Error(sortie.errors.join(' ; '));
    const ouvrantes = (sortie.styles.match(/\{/g) || []).length;
    const fermantes = (sortie.styles.match(/\}/g) || []).length;
    if (ouvrantes !== fermantes || !sortie.styles.trim()) throw new Error('accolades déséquilibrées');
    return sortie.styles;
}

// Le décompte des balises : si l'allègement en avait avalé une seule,
// la page n'aurait plus la même charpente. On lit le document dans
// l'ordre, comme un navigateur : un commentaire se saute d'un bloc, et le
// CORPS d'un <script> ou d'un <style> aussi — les commentaires du
// JavaScript citent des balises (« le <span> du titre… ») que terser
// efface à bon droit, et qu'il ne faut donc pas compter.
function charpente(html) {
    const compte = {};
    const lecteur = /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<([a-zA-Z][\w-]*)/g;
    let m;
    while ((m = lecteur.exec(html))) {
        const nom = (m[1] || m[2] || '').toLowerCase();
        if (nom) compte[nom] = (compte[nom] || 0) + 1;
    }
    return compte;
}

function verifierHtml(original, allege, nom) {
    const avant = charpente(original), apres = charpente(allege);
    for (const b of new Set(Object.keys(avant).concat(Object.keys(apres)))) {
        if (avant[b] !== apres[b]) throw new Error(`<${b}> : ${avant[b] || 0} avant, ${apres[b] || 0} après`);
    }
    const scripts = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m, n = 0;
    while ((m = scripts.exec(allege))) {
        const attributs = m[1], corps = m[2];
        if (/\bsrc=/.test(attributs) || !corps.trim()) continue;
        // Deux sortes de <script> ne sont pas du JavaScript, mais du JSON :
        // les données structurées, et les règles de spéculation (voir le
        // <head> de l'accueil). Compilées comme du JavaScript, les secondes
        // levaient « Unexpected token ':' » — et la page partait non
        // allégée, 636 ko au lieu de 240, sans autre bruit qu'un
        // avertissement.
        if (/application\/ld\+json|speculationrules/.test(attributs)) JSON.parse(corps);
        else verifierJs(corps, `${nom} (script en ligne n° ${++n})`);
    }
}

async function allegerHtml(source, nom, minifierHtml) {
    const allege = await minifierHtml(source, {
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeComments: true,
        // SAUF l'attribution des icônes : elles sont sous licence CC BY 4.0,
        // qui exige que la mention les accompagne là où elles sont servies.
        ignoreCustomComments: [/^!/, /^\s*#/, /FontAwesome Free/],
        caseSensitive: true,
        minifyCSS: { level: 1 },
        minifyJS: OPTIONS_TERSER,
    });
    verifierHtml(source, allege, nom);
    return allege;
}

// ────────────────────────────────────────────────────────────
//  LES DEUX FEUILLES DE L'ACCUEIL, DANS LA PAGE
// ────────────────────────────────────────────────────────────
//  Le premier affichage de l'accueil attendait deux feuilles externes,
//  alors que la page porte déjà l'essentiel de son CSS en ligne :
//  styles.css (Tailwind, 24 ko, 5,6 compressés) et polices.css (les
//  @font-face). Chacune bloque le rendu — un aller-retour de plus avant
//  la première image. Recopiées dans la page, À LA MÊME PLACE, elles ne
//  bloquent plus rien : premier affichage 676 → 496 ms en 4G lente
//  émulée (téléphone, processeur ×4, 5 passes, distributions
//  disjointes), Cinzel arrivée 116 ms plus tôt, et le décalage de mise en
//  page divisé par trois (0,026 → 0,009). Le prix : 6 ko compressés de
//  plus dans la page (60 → 66), que le cache de GitHub Pages (dix
//  minutes) ne gardait guère de toute façon.
//
//  À la même place, et c'est ce qui rend l'opération sûre : un <style> et
//  un <link> placés au même endroit ont le même rang dans la cascade. Le
//  <noscript> posé entre les deux garde le sien. Les adresses des polices
//  sont relatives à polices.css : elles deviennent absolues, puisque
//  c'est désormais la page qui les lit. styles.css, à la racine comme
//  l'accueil, n'a rien à réécrire (et ne contient aucune url()).
//
//  Seulement l'accueil, et seulement la copie publiée. Le répertoire et
//  la galerie ont déjà les leurs dans la page, écrites par leur
//  générateur (mêmes raisons, mêmes mesures) ; les pages spectacle lient
//  polices.css à côté d'univers.css, partagée par les onze ; /admin/
//  garde ses <link> ; les sources aussi — le développement et la
//  régénération de Tailwind ne changent pas.
//
//  SON PROPRE CONTRÔLE, puisque verifierHtml exige une charpente
//  identique et refuserait celle-ci : exactement deux <link> de moins et
//  deux <style> de plus, rien d'autre, et aucune des deux feuilles ne
//  doit contenir de quoi fermer sa balise. L'épreuve du navigateur passe
//  ensuite, comme pour tout le reste.
const FEUILLES_EN_LIGNE = [
    { lien: 'href="/ressources/polices/polices.css"', fichier: 'ressources/polices/polices.css', dossier: '/ressources/polices/' },
    { lien: 'href="styles.css"', fichier: 'styles.css', dossier: null },
];

const echapper = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function integrerFeuilles(html, lire) {
    let sortie = html;
    for (const f of FEUILLES_EN_LIGNE) {
        const balise = new RegExp(`<link rel="stylesheet" ${echapper(f.lien)}\\s*/?>`, 'g');
        const trouvees = sortie.match(balise) || [];
        if (trouvees.length !== 1) throw new Error(`${f.fichier} : ${trouvees.length} <link> trouvé(s), 1 attendu`);
        let css = lire(f.fichier);
        if (/<\/style/i.test(css)) throw new Error(`${f.fichier} contient « </style »`);
        if (f.dossier) {
            css = css.replace(/url\((['"]?)(?![a-z]+:|\/)([^'")]+)\1\)/gi, (m, q, u) => `url(${q}${f.dossier}${u}${q})`);
        }
        sortie = sortie.replace(balise, () => `<style>${css}</style>`);
    }
    const avant = charpente(html), apres = charpente(sortie);
    for (const b of new Set(Object.keys(avant).concat(Object.keys(apres)))) {
        const attendu = (avant[b] || 0) + (b === 'link' ? -FEUILLES_EN_LIGNE.length : b === 'style' ? FEUILLES_EN_LIGNE.length : 0);
        if ((apres[b] || 0) !== attendu) throw new Error(`<${b}> : ${apres[b] || 0} après l'intégration, ${attendu} attendu(s)`);
    }
    return sortie;
}

// ────────────────────────────────────────────────────────────
//  L'ÉPREUVE DU NAVIGATEUR
// ────────────────────────────────────────────────────────────
//  Une page qui se compile peut encore planter à l'exécution. On ouvre
//  donc les pages dans un vrai navigateur et l'on guette la moindre
//  exception non rattrapée — AVANT et APRÈS l'allègement : seule compte
//  une erreur que l'original n'avait pas (une page qui trébucherait déjà
//  sans lui, faute de réseau par exemple, ne doit pas faire tout jeter).
//  Même serveur que les autres scripts (serveur-local.js) : file:// n'est
//  pas le site.
// Renvoie, page par page, le nombre d'erreurs relevées — ou null si le
// navigateur n'est pas disponible.
async function epreuveNavigateur(pages) {
    const playwright = charger('playwright');
    if (!playwright) {
        console.log('  (Playwright absent : épreuve du navigateur sautée, les vérifications de syntaxe tiennent seules)');
        return null;
    }
    let navigateur;
    try {
        navigateur = await playwright.chromium.launch();
    } catch (e) {
        console.log(`  (Chromium ne démarre pas : épreuve sautée — ${e.message.split('\n')[0]})`);
        return null;
    }
    const { serveur, base } = await servir(RACINE);
    const bilan = {};
    try {
        for (const page of pages) {
            const erreurs = bilan[page] = [];
            const onglet = await navigateur.newPage();
            // Rien ne doit sortir vers l'extérieur : mesure d'audience,
            // base des dates. Leur absence est un cas que le site gère.
            await onglet.route(u => !u.href.startsWith(base), r => r.abort());
            onglet.on('pageerror', e => erreurs.push(e.message));
            await onglet.goto(base + page, { waitUntil: 'load', timeout: 30000 });
            await onglet.waitForTimeout(1500);
            // Le script principal de l'accueil est-il allé jusqu'au bout ?
            if (page === '/') {
                const pret = await onglet.evaluate(() => window.__revelePret === true
                    && typeof window.openShowUniverse === 'function');
                if (!pret) erreurs.push('le script de la page ne s\'est pas exécuté jusqu\'au bout');
            }
            await onglet.close();
        }
    } finally {
        await navigateur.close();
        serveur.close();
    }
    return bilan;
}

// ────────────────────────────────────────────────────────────
async function main() {
    const terser = charger('terser');
    const CleanCSS = charger('clean-css');
    const htmlMin = charger('html-minifier-terser');
    if (!terser || !CleanCSS || !htmlMin) {
        console.log('Outils absents (terser, clean-css, html-minifier-terser) : rien n\'est allégé.');
        return;
    }

    const fichiers = fichiersDuSite();
    const pages = ['/', '/404.html', '/spectacles/', '/galerie/'];
    const premier = fichiers.html.find(f => /^spectacles[\\/][^\\/]+[\\/]index\.html$/.test(f));
    if (premier) pages.push('/' + path.dirname(premier).split(path.sep).join('/') + '/');
    let temoin = null;
    try {
        temoin = await epreuveNavigateur(pages);
    } catch (e) {
        console.log(`  (épreuve de l'original interrompue : ${e.message})`);
    }

    const originaux = new Map();
    let avant = 0, apres = 0;

    const traiter = async (rel, faire) => {
        const abs = path.join(RACINE, rel);
        const source = fs.readFileSync(abs, 'utf8');
        try {
            const allege = await faire(source, rel);
            if (Buffer.byteLength(allege) >= Buffer.byteLength(source)) return;
            originaux.set(abs, source);
            fs.writeFileSync(abs, allege);
            avant += Buffer.byteLength(source);
            apres += Buffer.byteLength(allege);
        } catch (e) {
            console.warn(`  ⚠ ${rel} laissé tel quel : ${e.message}`);
        }
    };

    for (const f of fichiers.js) await traiter(f, (s, n) => allegerJs(s, n, terser));
    for (const f of fichiers.css) await traiter(f, s => allegerCss(s, CleanCSS));
    for (const f of fichiers.html) await traiter(f, (s, n) => allegerHtml(s, n, htmlMin.minify));

    const ko = n => Math.round(n / 1024);
    console.log(`${originaux.size} fichier(s) allégé(s) : ${ko(avant)} ko → ${ko(apres)} ko`);

    // L'exception, à part : les deux feuilles de l'accueil dans la page —
    // polices.css telle qu'elle vient d'être allégée. Si elle échoue,
    // l'accueil garde ses <link>, allégé ou non.
    const accueil = path.join(RACINE, 'index.html');
    if (fs.existsSync(accueil)) {
        const html = fs.readFileSync(accueil, 'utf8');
        try {
            const integre = integrerFeuilles(html, f => fs.readFileSync(path.join(RACINE, f), 'utf8'));
            if (!originaux.has(accueil)) originaux.set(accueil, html);
            fs.writeFileSync(accueil, integre);
            console.log(`Accueil : styles.css et polices.css dans la page (+${ko(Buffer.byteLength(integre) - Buffer.byteLength(html))} ko).`);
        } catch (e) {
            console.warn(`  ⚠ accueil : feuilles laissées en <link> — ${e.message}`);
        }
    }

    if (!temoin) {
        console.log('Copie allégée sans épreuve du navigateur (vérifications de syntaxe seules).');
        return;
    }
    let bon = false;
    try {
        const bilan = await epreuveNavigateur(pages);
        bon = !!bilan;
        for (const page of pages) {
            const nouvelles = (bilan ? bilan[page] : []).length - temoin[page].length;
            if (nouvelles > 0) {
                bon = false;
                bilan[page].forEach(e => console.error(`  ✗ ${page} : ${e}`));
            }
        }
    } catch (e) {
        console.error(`  ✗ épreuve du navigateur interrompue : ${e.message}`);
    }
    if (!bon) {
        for (const [abs, source] of originaux) fs.writeFileSync(abs, source);
        console.error('Épreuve échouée : tous les fichiers ont été remis dans leur état d\'origine.');
        process.exitCode = 1;
        return;
    }
    console.log('Épreuve du navigateur réussie : la copie allégée part en ligne.');
}

// build/verifier-site.js relit l'accueil des sources avec la même
// fonction : un <link> retouché, et l'intégration échouerait en silence
// à la publication (l'accueil partirait simplement avec ses <link>).
if (require.main === module) {
    main().catch(e => {
        console.error(e);
        process.exitCode = 1;
    });
}

module.exports = { integrerFeuilles, verifierHtml };
