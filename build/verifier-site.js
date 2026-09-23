#!/usr/bin/env node
/**
 * ============================================================
 *  VÉRIFIER LE SITE — ce qui s'est déjà cassé ne doit plus casser
 * ============================================================
 *  Le site n'avait aucune vérification automatique. Deux défauts
 *  sont ainsi restés en ligne sans que rien ne les signale : le
 *  bouton « Ajouter au calendrier » d'un univers ouvert depuis le CV
 *  ne faisait rien, et le CV en PDF imprimait les pastilles ▶ des
 *  bandes-annonces. Chacun tenait en une ligne de test.
 *
 *  Ce script ouvre le site dans un vrai navigateur et vérifie, en une
 *  minute, ce qui a déjà cassé ou ce qui casserait sans bruit :
 *    · l'accueil se charge sans erreur de script ;
 *    · la règle de l'ouverture (lien direct : pas de rideau ; depuis un
 *      autre site : une fois) ;
 *    · la fenêtre d'agenda d'un univers ouvert depuis le CV ;
 *    · l'onglet Dates : feuilles, intercalaires de mois, séances en
 *      cases, nom du spectacle qui mène à sa page, rangement par
 *      spectacle, sommaire qui mène aux dates ;
 *    · l'impression sans les pastilles ▶ ;
 *    · le site sans JavaScript ;
 *    · les pages spectacle (h1, <main>, données structurées) ;
 *    · le sitemap, qui doit annoncer toutes les pages spectacle.
 *
 *  Rien ne sort vers l'extérieur : la mesure d'audience et la base des
 *  dates sont coupées (le site sait s'en passer). Des représentations
 *  fictives sont glissées dans les dates le temps des tests de l'agenda
 *  et de l'onglet Dates : ils ne dépendent donc pas de la saison en
 *  cours.
 *
 *      cd build && npm ci && npm run navigateur   (une fois)
 *      npm --prefix build run verifier
 *
 *  Il tourne aussi sur chaque demande de fusion (.github/workflows/
 *  verifier.yml). Code de sortie 1 au premier échec constaté.
 * ============================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { servir } = require('./serveur-local');

const RACINE = path.resolve(__dirname, '..');

function chargerPlaywright() {
    try {
        return require('playwright');
    } catch (e) {
        console.error('Playwright est introuvable. Une fois pour toutes :\n' +
            '  cd build && npm ci && npm run navigateur');
        process.exit(2);
    }
}

const echecs = [];
let reussies = 0;

async function verifie(nom, epreuve) {
    try {
        await epreuve();
        reussies++;
        console.log(`  ✓ ${nom}`);
    } catch (e) {
        echecs.push(nom);
        console.log(`  ✗ ${nom}\n      ${String(e.message).split('\n')[0]}`);
    }
}

function exige(condition, message) {
    if (!condition) throw new Error(message);
}

(async () => {
    const { chromium } = chargerPlaywright();
    const { serveur, base } = await servir(RACINE);
    const navigateur = await chromium.launch();

    // Un contexte = un visiteur neuf : stockage vide, rien de mémorisé.
    const visiteur = async (options) => {
        const c = await navigateur.newContext(options || {});
        await c.route((u) => !u.href.startsWith(base), (r) => r.abort());
        return c;
    };
    const guette = (page) => {
        const erreurs = [];
        page.on('pageerror', (e) => erreurs.push(e.message));
        return erreurs;
    };
    const rideauBaisse = (page) => page.evaluate(() => {
        const o = document.getElementById('intro-overlay');
        return !!o && !o.hidden;
    });

    try {
        console.log('Vérification du site :');

        await verifie('l’accueil se charge sans erreur de script', async () => {
            const c = await visiteur();
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(800);
            exige(!erreurs.length, erreurs.join(' | '));
            exige(await p.evaluate(() => window.__revelePret === true),
                'le script principal ne va pas jusqu’au bout (__revelePret absent)');
            await c.close();
        });

        await verifie('un lien direct entre sans rideau d’ouverture', async () => {
            const c = await visiteur();
            const p = await c.newPage();
            await p.goto(base + '/', { waitUntil: 'load' });
            exige(!(await rideauBaisse(p)), 'le rideau est baissé pour une arrivée directe');
            exige(!(await p.evaluate(() => [...document.scripts].some((s) => /intro\.js$/.test(s.src)))),
                'intro.js est chargé alors que l’ouverture ne joue pas');
            await c.close();
        });

        await verifie('depuis un autre site, l’ouverture joue — une seule fois', async () => {
            const c = await visiteur();
            const p = await c.newPage();
            await p.goto(base + '/', { waitUntil: 'load', referer: 'https://www.instagram.com/' });
            exige(await rideauBaisse(p), 'le rideau ne se baisse pas à la première arrivée depuis un autre site');
            const p2 = await c.newPage();
            await p2.goto(base + '/', { waitUntil: 'load', referer: 'https://www.instagram.com/' });
            exige(!(await rideauBaisse(p2)), 'l’ouverture rejoue à la seconde visite');
            await c.close();
        });

        await verifie('« Ajouter au calendrier » ouvre sa fenêtre dans un univers ouvert depuis le CV', async () => {
            const c = await visiteur({ viewport: { width: 1280, height: 900 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(500);
            // Une représentation fictive dans un mois, pour le premier
            // spectacle du CV qui a un univers.
            const titre = await p.evaluate(() => {
                const li = document.querySelector('.cv-has-universe[data-cv-show]');
                if (!li || typeof SHOW_DATA === 'undefined') return null;
                const d = new Date(Date.now() + 30 * 86400000);
                const iso = d.toISOString().slice(0, 10);
                SHOW_DATA.upcoming.push({
                    title: li.dataset.cvShow, location: 'Théâtre de vérification', city: 'Rouen',
                    dateLabel: iso, icsDate: iso, time: '20h00'
                });
                return li.dataset.cvShow;
            });
            exige(titre, 'aucune ligne du CV n’ouvre un univers');
            await p.click(`.cv-has-universe[data-cv-show="${titre.replace(/"/g, '\\"')}"] .cv-row-toggle`);
            const bouton = p.locator('#show-universe .u-date-cal').first();
            await bouton.waitFor({ state: 'attached', timeout: 8000 });
            await bouton.scrollIntoViewIfNeeded();
            await bouton.click();
            await p.waitForTimeout(400);
            exige(await p.evaluate(() => {
                const m = document.querySelector('#show-universe #u-cal-modal');
                return !!m && !m.hidden;
            }), 'la fenêtre d’agenda ne s’ouvre pas');
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('l’onglet Dates : feuilles, séances en cases, liens vers les pages spectacle, rangement par spectacle, sommaire', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 844 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/#page_dates', { waitUntil: 'load' });
            await p.waitForTimeout(500);
            // Une saison fictive, à un mois d'ici : une date seule, puis une
            // série de deux soirs dont la première séance est scolaire. Elle
            // porte un lien de billetterie : une séance scolaire ne doit pas
            // proposer « Réserver » pour autant. Avant elles, une date de
            // Bérénice, spectacle qui a sa page : son nom doit y mener. Le
            // spectacle fictif n'en a pas : son nom ne mène nulle part.
            await p.evaluate(() => {
                const iso = (n) => {
                    const d = new Date();
                    d.setDate(d.getDate() + n);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                };
                const titre = 'Spectacle de vérification';
                SHOW_DATA.upcoming = [
                    {
                        type: 'single', title: 'Bérénice', location: 'Scène de vérification (76)', city: 'Rouen',
                        dateLabel: iso(20), icsDate: iso(20), time: '20h00', bookingUrl: '', isSchool: false
                    },
                    {
                        type: 'single', title: titre, location: 'Théâtre de vérification (76)', city: 'Rouen',
                        dateLabel: iso(30), icsDate: iso(30), time: '20h00', bookingUrl: 'https://example.org/billets', isSchool: false
                    },
                    {
                        type: 'series', id: 'panel-verification', title: titre, location: 'Salle de vérification (76)', city: 'Rouen',
                        dateLabel: iso(40), shows: [
                            { dateLabel: iso(40), icsDate: iso(40), time: '14h00', bookingUrl: 'https://example.org/billets', isSchool: true },
                            { dateLabel: iso(41), icsDate: iso(41), time: '20h00', bookingUrl: 'https://example.org/billets', isSchool: false }
                        ]
                    }
                ];
                buildFilterChips();
                renderDates();
            });
            const parDate = await p.evaluate(() => {
                const liste = document.getElementById('upcoming-dates-container');
                const serie = liste.querySelector('.dl--serie');
                return {
                    intercalaires: liste.querySelectorAll('.dl-intercalaire h4').length,
                    feuilles: liste.querySelectorAll('.dl-feuille .dl-num').length,
                    cases: serie ? serie.querySelectorAll('.dl-seance').length : 0,
                    scolaireSansReserver: serie ? !serie.querySelector('.dl-seance--scolaire .dl-reserver') : false,
                    reserver: liste.querySelectorAll('.dl-reserver').length,
                    sommaire: !document.getElementById('dates-sommaire').hidden
                        && !!document.querySelector('#dates-sommaire .dl-grille [data-dl-aller]')
                };
            });
            exige(parDate.intercalaires >= 1, 'aucun intercalaire de mois');
            exige(parDate.feuilles === 3, `${parDate.feuilles} feuille(s) d’éphéméride pour trois lignes`);
            exige(parDate.cases === 2, `la série montre ${parDate.cases} case(s) au lieu de deux`);
            exige(parDate.scolaireSansReserver, 'une séance scolaire propose « Réserver »');
            exige(parDate.reserver === 2, `${parDate.reserver} bouton(s) « Réserver » au lieu de deux`);
            exige(parDate.sommaire, 'le sommaire de la saison n’est pas là');

            // Le nom d'un spectacle mène à sa page, sur sa ligne comme dans la
            // prochaine représentation ; sans page, pas de lien, jamais un
            // lien mort : chaque adresse visée doit répondre.
            const liens = await p.evaluate(async () => {
                const titres = [...document.querySelectorAll('#upcoming-dates-container .dl-titre')];
                const tous = [...document.querySelectorAll('#page_dates a.dl-vers-page')].map((a) => a.getAttribute('href'));
                const morts = [];
                for (const href of new Set(tous)) {
                    const r = await fetch(href).catch(() => null);
                    if (!r || !r.ok) morts.push(href);
                }
                return {
                    ligne: titres.filter((t) => /Bérénice/.test(t.textContent)).map((t) => t.querySelector('a.dl-vers-page')?.getAttribute('href') || null),
                    sansPage: titres.filter((t) => /vérification/.test(t.textContent)).some((t) => t.querySelector('a')),
                    prochaine: document.querySelector('#dates-sommaire .dl-prochaine a.dl-vers-page')?.getAttribute('href') || null,
                    morts
                };
            });
            exige(liens.ligne.join() === 'spectacles/berenice/', `la ligne de Bérénice ne mène pas à sa page : ${JSON.stringify(liens.ligne)}`);
            exige(!liens.sansPage, 'le nom d’un spectacle sans page porte un lien');
            exige(liens.prochaine === 'spectacles/berenice/', 'la prochaine représentation ne mène pas à la page du spectacle');
            exige(!liens.morts.length, `lien(s) mort(s) : ${liens.morts.join(', ')}`);

            // L'agenda d'une case de série ouvre sa fenêtre.
            await p.locator('#upcoming-dates-container .dl-seance .dl-agenda').first().click();
            await p.waitForTimeout(300);
            exige(await p.evaluate(() => /vérification/.test(document.getElementById('cal-modal-title')?.textContent || '')),
                'la fenêtre d’agenda ne s’ouvre pas depuis une case de séance');
            await p.keyboard.press('Escape');
            await p.waitForTimeout(300);

            // Par spectacle, et le choix est retenu.
            await p.click('[data-dates-vue="spectacle"]');
            const parSpectacle = await p.evaluate(() => {
                const entetes = [...document.querySelectorAll('#upcoming-dates-container .dl-intercalaire--spectacle h4')];
                return {
                    entetes: entetes.map((h) => h.textContent),
                    liens: entetes.map((h) => h.querySelector('a.dl-vers-page')?.getAttribute('href') || '-'),
                    retenu: localStorage.getItem('av.datesVue')
                };
            });
            exige(parSpectacle.entetes.join() === 'Bérénice,Spectacle de vérification',
                `rangement par spectacle : ${JSON.stringify(parSpectacle.entetes)}`);
            exige(parSpectacle.liens.join() === 'spectacles/berenice/,-',
                `en-têtes par spectacle et leurs pages : ${JSON.stringify(parSpectacle.liens)}`);
            exige(parSpectacle.retenu === 'spectacle', 'le rangement choisi n’est pas retenu');

            // Un rond du sommaire ramène par date, jusqu'à sa ligne.
            await p.locator('#dates-sommaire [data-dl-aller]').first().click();
            await p.waitForTimeout(300);
            exige(await p.evaluate(() => document.querySelector('[data-dates-vue][aria-pressed="true"]').dataset.datesVue === 'date'
                && !!document.querySelector('#upcoming-dates-container .dl.dl-eclaire')),
                'le sommaire ne mène pas à la ligne visée');
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('les pastilles ▶ des bandes-annonces ne sont pas imprimées', async () => {
            const c = await visiteur();
            const p = await c.newPage();
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(500);
            await p.emulateMedia({ media: 'print' });
            const visibles = await p.evaluate(() => [...document.querySelectorAll('.cv-trailer')]
                .filter((e) => getComputedStyle(e).display !== 'none').length);
            exige(visibles === 0, `${visibles} pastille(s) resteraient sur le CV imprimé`);
            await c.close();
        });

        await verifie('sans JavaScript, le site reste lisible', async () => {
            const c = await visiteur({ javaScriptEnabled: false });
            const p = await c.newPage();
            await p.goto(base + '/', { waitUntil: 'load' });
            const etat = await p.evaluate(() => ({
                rideau: getComputedStyle(document.getElementById('intro-overlay')).display,
                cachees: [...document.querySelectorAll('section')]
                    .filter((s) => getComputedStyle(s).opacity !== '1').length
            }));
            exige(etat.rideau === 'none', 'le rideau d’ouverture couvre la page');
            exige(etat.cachees === 0, `${etat.cachees} section(s) restent invisibles`);
            await c.close();
        });

        const dossiers = fs.readdirSync(path.join(RACINE, 'spectacles'), { withFileTypes: true })
            .filter((e) => e.isDirectory()).map((e) => e.name);

        await verifie(`les ${dossiers.length} pages spectacle ont leur h1, leur <main> et des données structurées lisibles`, async () => {
            const c = await visiteur();
            for (const slug of dossiers) {
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(`${base}/spectacles/${slug}/`, { waitUntil: 'load' });
                const etat = await p.evaluate(() => {
                    let jsonld = 0, illisibles = 0;
                    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
                        jsonld++;
                        try { JSON.parse(s.textContent); } catch (e) { illisibles++; }
                    });
                    return {
                        h1: document.querySelectorAll('h1').length,
                        main: document.querySelectorAll('main').length,
                        jsonld, illisibles
                    };
                });
                exige(etat.h1 === 1, `${slug} : ${etat.h1} titre(s) h1`);
                exige(etat.main === 1, `${slug} : ${etat.main} élément(s) <main>`);
                exige(etat.jsonld > 0 && !etat.illisibles, `${slug} : données structurées absentes ou illisibles`);
                exige(!erreurs.length, `${slug} : ${erreurs.join(' | ')}`);
                await p.close();
            }
            await c.close();
        });

        await verifie('le sitemap annonce toutes les pages spectacle, et elles seules', async () => {
            const sitemap = fs.readFileSync(path.join(RACINE, 'sitemap.xml'), 'utf8');
            const annoncees = [...sitemap.matchAll(/\/spectacles\/([a-z0-9-]+)\/<\/loc>/g)].map((m) => m[1]);
            const manquantes = dossiers.filter((d) => !annoncees.includes(d));
            const fantomes = annoncees.filter((a) => !dossiers.includes(a));
            exige(!manquantes.length, `absentes du sitemap : ${manquantes.join(', ')}`);
            exige(!fantomes.length, `annoncées sans exister : ${fantomes.join(', ')}`);
        });
    } finally {
        await navigateur.close();
        serveur.close();
    }

    console.log(`${reussies} vérification(s) réussie(s), ${echecs.length} échec(s).`);
    process.exitCode = echecs.length ? 1 : 0;
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
