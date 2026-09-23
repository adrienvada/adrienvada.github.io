#!/usr/bin/env node
/**
 * ============================================================
 *  LE CV EN PDF — un fichier, et non une boîte de dialogue
 * ============================================================
 *  POURQUOI CE SCRIPT EXISTE
 *  -------------------------
 *  Le bouton du CV appelait `window.print()`. C'est un chemin honnête —
 *  le libellé disait « Imprimer / PDF » — mais ce n'est pas un fichier :
 *  il faut traverser la boîte de dialogue du navigateur, choisir
 *  « Enregistrer au format PDF », et l'on repart avec un document appelé
 *  `adrienvada.fr.pdf`. Sur iPhone, le même geste passe par la feuille de
 *  partage et demande trois manipulations.
 *
 *  Or le métier d'Adrien fait circuler des CV en pièce jointe. Ce que
 *  reçoit un directeur de casting doit s'appeler `cv-adrien-vada.pdf`, et
 *  s'obtenir d'un seul geste. Ce script fabrique ce fichier ; le bouton
 *  devient un vrai lien de téléchargement.
 *
 *  CE QU'IL NE RÉINVENTE PAS
 *  -------------------------
 *  Rien de la mise en page n'est écrit ici. Le script ouvre le site dans
 *  le Chromium de Playwright et lui demande d'imprimer — le PDF est donc
 *  produit par le MÊME moteur, sous les MÊMES règles `@media print` que
 *  Ctrl+P (index.html : la palette claire réimposée quel que soit le
 *  thème, les tiroirs de spectacle écartés, les rôles longs qui passent à
 *  la ligne, le récit retiré). Toute correction apportée à ces règles
 *  arrive dans le PDF sans qu'on ait à y toucher.
 *
 *  C'est la raison pour laquelle on n'a PAS pris jsPDF ou html2pdf : ces
 *  bibliothèques pèsent de 350 à 700 Ko — plus que intro.js, styles.css et
 *  mask-points.js réunis — et rejouent une mise en page approximative là
 *  où Chromium applique son propre moteur d'impression.
 *
 *  QUAND LE RELANCER
 *  -----------------
 *      node build/generer-cv-pdf.js
 *
 *  Après toute modification du CV ou des règles d'impression. Le fichier
 *  produit, `ressources/cv-adrien-vada.pdf`, EST versionné : c'est lui que
 *  servent les aperçus Cloudflare, et c'est le filet du site si jamais la
 *  régénération échouait un jour.
 *
 *  Il est aussi régénéré à CHAQUE publication (.github/workflows/publier.yml),
 *  juste avant l'empaquetage. Un oubli de relance ne peut donc pas laisser
 *  en ligne un CV périmé — le pire risque restant est un fichier versionné
 *  en retard d'une modification, visible seulement en aperçu de branche.
 *
 *  CE QU'IL FAUT INSTALLER
 *  -----------------------
 *  Playwright et son Chromium. Le script accepte une installation locale
 *  comme une installation globale (voir chargerPlaywright), et respecte
 *  PLAYWRIGHT_BROWSERS_PATH si le navigateur vit ailleurs.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RACINE = path.resolve(__dirname, '..');
const SORTIE = path.join(RACINE, 'ressources', 'cv-adrien-vada.pdf');

// ────────────────────────────────────────────────────────────
//  PLAYWRIGHT, D'OÙ QU'IL VIENNE
// ────────────────────────────────────────────────────────────
//  Il vient normalement de build/package.json, à la version figée par
//  son package-lock.json (`cd build && npm ci`) — ou, dans le workflow
//  de publication, du dossier que NODE_PATH désigne. Une installation
//  globale reste acceptée, en dernier recours.
function chargerPlaywright() {
    try {
        return require('playwright');
    } catch (e) { /* pas d'installation locale : on tente la globale */ }
    try {
        const global = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
        return require(path.join(global, 'playwright'));
    } catch (e) {
        console.error(
            'Playwright est introuvable. Une fois pour toutes :\n' +
            '  cd build && npm ci && npm run navigateur'
        );
        process.exit(1);
    }
}

// Le PDF doit être fait de ce que voit un visiteur : la page est servie
// en HTTP, par le petit serveur commun aux scripts (serveur-local.js).
const { servir } = require('./serveur-local');

// ────────────────────────────────────────────────────────────
//  LA FABRICATION
// ────────────────────────────────────────────────────────────
(async () => {
    const { chromium } = chargerPlaywright();
    const { serveur, port } = await servir(RACINE);
    const adresse = `http://127.0.0.1:${port}/index.html`;

    let navigateur;
    try {
        navigateur = await chromium.launch();
        const page = await navigateur.newPage({ viewport: { width: 1280, height: 1600 } });

        const erreurs = [];
        page.on('pageerror', (e) => erreurs.push(e.message));

        // AVANT LE PREMIER RENDU. Deux réglages posés dans le stockage de
        // la page, exactement là où le site va les lire (index.html, le
        // script anti-scintillement et applyTheme) :
        //
        //  · `avIntroSeen` fait sauter l'ouverture de scène. Sans lui, on
        //    attendrait cinq secondes de rideau pour rien — et le canevas
        //    des particules tournerait pendant l'impression.
        //  · `avTheme` force le thème clair. Les règles @media print
        //    réimposent déjà la palette claire, mais le rendu à l'écran
        //    qui précède l'impression chargerait sinon les variables
        //    sombres, et certaines images décoratives avec.
        //
        //  `avIntroSeen` EST POSÉ DANS LES DEUX STOCKAGES, à dessein. Le
        //  garde-fou a lu sessionStorage, puis localStorage — et ce jour-là
        //  le rideau s'est remis à jouer pendant le tirage sans que rien ne
        //  le dise : le PDF restait juste, mais il portait le canevas des
        //  particules en image de fond, 1280 × 1600, et pesait quatre fois
        //  son poids. Écrire les deux coûte une ligne et survit au prochain
        //  changement d'avis, dans un sens comme dans l'autre.
        await page.addInitScript(() => {
            try {
                sessionStorage.setItem('avIntroSeen', '1');
                localStorage.setItem('avIntroSeen', '1');
                localStorage.setItem('avTheme', 'light');
            } catch (e) { }
        });

        await page.goto(adresse, { waitUntil: 'load' });

        // L'onglet CV est celui par défaut ; on le demande tout de même,
        // pour que ce script continue de produire un CV le jour où cette
        // valeur par défaut changerait.
        await page.evaluate(() => {
            if (typeof showPage === 'function') showPage('page_cv', false);
        });

        // Le média d'impression est appliqué maintenant, et non au moment
        // du tirage : ce qui suit — polices, images — doit se stabiliser
        // sous les règles qui vaudront pour le PDF, pas sous celles de
        // l'écran.
        await page.emulateMedia({ media: 'print' });

        // Cinzel et Montserrat sont servies par le site lui-même
        // (ressources/polices/), mais elles arrivent quand même APRÈS la
        // page : le navigateur ne les demande qu'en rencontrant un texte qui
        // les emploie. Imprimer avant leur chargement donnerait un CV en
        // police de repli, aux césures différentes — et donc à la pagination
        // différente.
        await page.evaluate(() => document.fonts.ready);

        // Le portrait est la seule image du CV imprimé. On attend qu'elle
        // soit décodée : une image encore vide ne réserve pas sa hauteur,
        // et tout le document glisserait d'une ligne.
        await page.evaluate(() => Promise.all(
            [...document.images]
                .filter((img) => img.offsetParent !== null || img.closest('header'))
                .map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => { })))
        ));

        // LE TITRE DU DOCUMENT, ET NON CELUI DU SITE. Chromium recopie
        // `document.title` dans le champ /Title du PDF — c'est ce que
        // montrent la fenêtre d'Aperçu, l'onglet d'Acrobat et la liste des
        // pièces jointes d'un courriel. « Adrien Vada — Comédien | Dates,
        // CV & démos » est le titre d'un SITE : il promet des dates et des
        // démos que le fichier ne contient pas.
        await page.evaluate(() => { document.title = 'Adrien Vada — CV, artiste interprète'; });

        // Les sections apparaissent au défilement (IntersectionObserver).
        // Les règles d'impression les rendent toutes visibles, mais la
        // transition d'opacité, elle, a une durée : on lui laisse le temps
        // de finir plutôt que d'imprimer un CV à moitié fondu.
        await page.waitForTimeout(400);

        fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
        await page.pdf({
            path: SORTIE,
            format: 'A4',
            printBackground: true,
            // Le site n'a pas de règle @page : les marges sont posées ici.
            // Douze millimètres, soit la marge d'un courrier — assez pour
            // que rien ne se perde à la reliure ou à la photocopie, assez
            // peu pour que le CV tienne sans se disloquer.
            margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
        });

        if (erreurs.length) {
            console.warn('⚠ Erreurs JS pendant le rendu :\n  ' + erreurs.join('\n  '));
        }

        const poids = (fs.statSync(SORTIE).size / 1024).toFixed(0);
        console.log(`✓ ${path.relative(RACINE, SORTIE)} — ${poids} Ko`);
    } finally {
        if (navigateur) await navigateur.close();
        serveur.close();
    }
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
