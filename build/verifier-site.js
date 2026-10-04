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
 *  Ce script ouvre le site dans un vrai navigateur et vérifie, en moins
 *  de quatre minutes, ce qui a déjà cassé ou ce qui casserait sans bruit :
 *    · l'accueil se charge sans erreur de script ;
 *    · la règle de l'ouverture (lien direct : pas de rideau ; depuis un
 *      autre site : une fois) ;
 *    · la fenêtre d'agenda d'un univers ouvert depuis le CV ;
 *    · celle de l'onglet Dates, au téléphone une feuille posée en bas qu'on
 *      renvoie en la tirant, et « Partager cette date » ;
 *    · l'agenda à s'abonner (dates.ics) : à jour avec dates.js, lisible par
 *      tous les agendas, sans séance scolaire ;
 *    · le même univers ne charge que son panneau : la page couverte
 *      cesse d'être rendue, le montage suit le passage, la lumière est
 *      posée une fois — et la fermeture rend la page où elle était ;
 *    · l'onglet Dates : feuilles, intercalaires de mois et leur liseré
 *      (une couleur par mois, que reprennent les initiales de la saison
 *      d'un regard), séances en cases (une date seule aussi),
 *      nom du spectacle qui mène à sa page, rangement par spectacle,
 *      sommaire qui mène aux dates, une image pour chaque représentation
 *      annoncée aux moteurs ; la prochaine date, en tête du CV et nulle
 *      part ailleurs ;
 *    · la prochaine date du CV, une ligne de tableau de gare : ses
 *      palettes battent une fois, image par image sans faute, puis se
 *      posent ; elle mène à sa ligne dans l'onglet Dates ;
 *    · « Télécharger le CV », un seul lien, sous la prochaine date ;
 *    · la barre de lecture des démos voix, qui va au point touché même
 *      sans en-têtes Range ;
 *    · l'impression sans les pastilles ▶ ;
 *    · la ligne à vignette du CV : l'année et l'état sur chaque vignette,
 *      l'année lisible même au bas de l'écran, des lignes de même
 *      hauteur, rien de tout cela sur papier ;
 *    · le site sans JavaScript ;
 *    · les pages spectacle (h1, <main>, données structurées, une image
 *      pour chaque représentation) ;
 *    · les mêmes pages, qui doivent s'animer et s'ouvrir comme leur
 *      univers ouvert depuis le CV ;
 *    · la régie (regie.js) : la même détection partout, et le repli qui
 *      rejoue les mêmes images que le navigateur, scène par scène ;
 *    · chaque animation menée par le défilement suit la page ou le
 *      panneau de l'univers, jamais un cadre rogné qui ne défile pas ;
 *    · un état fixe qui a du sens pour chaque scène, en mouvement réduit ;
 *    · les défauts réparés de l'audit du mouvement : verrou de
 *      défilement, changement d'onglet, « Passer » et les touches de
 *      l'ouverture, zoom de l'avatar, course du book, phrase posée sur un
 *      groupe de photos ;
 *    · la frise du CV, comme le prototype de l'audit : le fil d'or à
 *      gauche, un point par spectacle posé dessus, les lignes voilées tant
 *      que le fil ne les a pas atteintes, rien de coloré à droite — avec
 *      les deux pilotes, et tout posé en mouvement réduit ; le doigt qui
 *      fait défiler n'y dévoile rien, la souris et le clavier si ;
 *    · la page 404 ;
 *    · les pages générées, qui s'affichent sans attendre : la fiche écrite
 *      ouverte et peinte avant son moteur, le répertoire et la galerie
 *      sans feuille à attendre, des icônes en PNG, les pages voisines
 *      préparées au survol ;
 *    · les passages entre documents, qui atterrissent sur ce qu'on voit
 *      (la première photo du travelling, la première vue de la planche) ;
 *    · la galerie : le premier écran part avec la page, à la bonne taille
 *      et une seule fois, allumé en fondu, visible sans JavaScript ;
 *    · le service worker, qui ne garde que les polices et les images ;
 *    · le sitemap, qui doit annoncer toutes les pages spectacle ;
 *    · les variantes d'images qui suivent le montage : la vignette du CV
 *      recadrée au cadre de sa couverture, la version écran large là où
 *      variantes.json l'annonce — et proposée par les pages là seulement —,
 *      le portrait en AVIF ;
 *    · chaque écran prend sa version : l'ordinateur la version écran
 *      large sans le JPEG en plus, le téléphone jamais plus de 1920 px,
 *      le portrait en AVIF, les vignettes du CV et des Dates recadrées.
 *
 *  Rien ne sort vers l'extérieur : la mesure d'audience et la base des
 *  dates sont coupées (le site sait s'en passer). Des représentations
 *  fictives sont glissées dans les dates le temps des tests de l'agenda
 *  et de l'onglet Dates : ils ne dépendent donc pas de la saison en
 *  cours.
 *
 *      cd build && npm ci && npm run navigateur   (une fois)
 *      npm --prefix build run verifier
 *      SEUL=planche npm --prefix build run verifier   (celles dont le nom
 *                                                  contient « planche »)
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

// SEUL=mot : ne passer que les vérifications dont le nom contient ce mot
// (« SEUL=planche node build/verifier-site.js ») — pour travailler sur une
// épreuve sans attendre les autres. Sans lui, toutes passent.
const SEUL = (process.env.SEUL || '').toLowerCase();

async function verifie(nom, epreuve) {
    if (SEUL && !nom.toLowerCase().includes(SEUL)) return;
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

    // Un contexte = un visiteur : stockage vide, rien de mémorisé — à une
    // exception près. L'onglet Dates s'ouvre « par spectacle » depuis la
    // PR #16, et les vérifications écrites pour le rangement par date (la
    // feuille sur la photo, la frise des mois, l'intercalaire du mois, la
    // ligne qui porte le titre) le demandent comme un visiteur qui l'a choisi
    // la fois d'avant : `av.datesVue` vaut « date » tant que la page ne l'a
    // pas changé. Un visiteur `neuf` arrive vraiment sans rien : c'est lui
    // qui vérifie le rangement par défaut.
    const visiteur = async (options) => {
        const { neuf, ...reste } = options || {};
        const c = await navigateur.newContext(reste);
        await c.route((u) => !u.href.startsWith(base), (r) => r.abort());
        if (!neuf) {
            await c.addInitScript(() => {
                try {
                    if (!localStorage.getItem('av.datesVue')) localStorage.setItem('av.datesVue', 'date');
                } catch (e) { /* stockage indisponible */ }
            });
        }
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

        await verifie('l’ouverture démarre au calme et tient sa durée sur un téléphone lent ; « Passer » pendant l’attente ne la relance pas', async () => {
            // Le premier rôle (le tambour qui se remplit), la fin du défilé
            // (revele() éteint le tambour sous le nom) et la fin du chargement.
            const guetteTambour = () => {
                window.__t = {};
                addEventListener('load', () => { window.__t.load = performance.now(); });
                addEventListener('DOMContentLoaded', () => {
                    window.__t.dcl = performance.now();
                    const reel = document.getElementById('intro-scramble');
                    if (!reel) return;
                    new MutationObserver(() => {
                        if (!window.__t.role && reel.textContent.trim()) window.__t.role = performance.now();
                        if (!window.__t.nom && reel.style.opacity === '0') window.__t.nom = performance.now();
                    }).observe(reel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style'] });
                });
            };
            const source = fs.readFileSync(path.join(RACINE, 'intro.js'), 'utf8');
            const cible = +source.match(/SEQUENCE_CIBLE_MS = (\d+)/)[1] + +source.match(/SILENCE_MS = (\d+)/)[1];

            // Téléphone moyen : processeur ralenti 4×. Le défilé partait dans
            // la tâche qui installe le CV, et chaque minuteur en retard
            // retardait les suivants : 6,7 à 7,2 s au lieu de 4,8.
            const c = await visiteur({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
            await c.addInitScript(guetteTambour);
            const p = await c.newPage();
            const erreurs = guette(p);
            await (await c.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
            await p.goto(base + '/?intro=1', { waitUntil: 'commit' });
            await p.waitForFunction(() => window.__t && window.__t.nom, null, { timeout: 20000, polling: 100 })
                .catch(() => { throw new Error('le défilé ne s’arrête pas sur le nom'); });
            const t = await p.evaluate(() => window.__t);
            exige(t.role > t.load, `le défilé démarre avant la fin du chargement (${Math.round(t.load - t.role)} ms avant)`);
            exige(t.nom - t.role < cible * 1.2,
                `le défilé s’allonge sur un téléphone lent : ${Math.round(t.nom - t.role)} ms pour ${cible} prévues`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();

            // Le portrait retenu trois secondes (un réseau qui cale) : le
            // défilé n'attend pas `load` au-delà d'une seconde et demie…
            const retenir = async (ctx) => ctx.route(/portrait-affiche-/, async (r) => {
                await new Promise((ok) => setTimeout(ok, 3000));
                await r.continue().catch(() => { });
            });
            const c2 = await visiteur();
            await retenir(c2);
            await c2.addInitScript(guetteTambour);
            const p2 = await c2.newPage();
            await p2.goto(base + '/?intro=1', { waitUntil: 'commit' });
            await p2.waitForFunction(() => window.__t && window.__t.role, null, { timeout: 6000, polling: 50 })
                .catch(() => { throw new Error('le défilé attend le portrait au-delà du plafond'); });
            const t2 = await p2.evaluate(() => window.__t);
            exige(!t2.load && t2.role - t2.dcl < 2500, `le plafond de l’attente ne tient pas (${Math.round(t2.role - t2.dcl)} ms après DOMContentLoaded)`);
            await c2.close();

            // … et « Passer » pressé pendant cette attente lève le rideau pour
            // de bon : le défilé ne part pas derrière, le verrou ne revient pas.
            const c3 = await visiteur();
            await retenir(c3);
            await c3.addInitScript(guetteTambour);
            const p3 = await c3.newPage();
            const erreurs3 = guette(p3);
            await p3.goto(base + '/?intro=1', { waitUntil: 'commit' });
            await p3.waitForFunction(() => window.__introPret === true, null, { timeout: 8000, polling: 20 });
            exige(!(await p3.evaluate(() => window.__t.role)), 'le défilé est déjà parti : l’attente n’a pas eu lieu');
            await p3.click('#intro-skip', { timeout: 2000 });
            await p3.waitForTimeout(2500);
            const apres = await p3.evaluate(() => ({
                rideau: document.getElementById('intro-overlay').hidden,
                verrou: document.body.classList.contains('modal-open'),
                role: window.__t.role
            }));
            exige(apres.rideau && !apres.verrou, '« Passer » pendant l’attente ne lève pas le rideau pour de bon');
            exige(!apres.role, 'le défilé démarre derrière le rideau levé');
            exige(!erreurs3.length, erreurs3.join(' | '));
            await c3.close();
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

        // ── LE PASSAGE D'OUVERTURE NE CHARGE QUE LE PANNEAU ──
        // Ouvert depuis le CV, le panneau cache la page qu'il couvre (elle
        // cesse d'être rendue : html.u-page-cachee), pose son montage une
        // fois le passage fini et mesure la lumière UNE fois — elle l'était
        // deux, et le passage gelait. Toute fermeture rend la page, à sa
        // place, le focus sur la ligne ; un saut aux dates pendant le
        // passage ou dès sa fin arrive au pied, le montage posé au-dessus.
        await verifie('un univers ouvert depuis le CV : la page couverte n’est plus rendue, le montage suit le passage, la lumière est posée une fois — et la fermeture rend la page où elle était', async () => {
            const c = await visiteur({ viewport: { width: 1280, height: 900 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(800);
            const viser = () => p.evaluate(() => {
                const li = [...document.querySelectorAll('#page_cv li.cv-has-universe[data-cv-show]')]
                    .find((l) => window.spectacleParTitre?.(l.dataset.cvShow)?.uni.slug === 'cleophene');
                if (!li) return null;
                li.id = li.id || 'verif-cleophene';
                li.scrollIntoView({ block: 'center', behavior: 'instant' });
                return '#' + CSS.escape(li.id) + ' .cv-row-toggle';
            });
            const sel = await viser();
            exige(sel, 'la ligne de Cléophène n’ouvre pas d’univers');
            await p.waitForTimeout(300);
            const avant = await p.evaluate((sel) => {
                window.__lumieres = 0;
                new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
                    if (n.nodeType === 1 && n.classList.contains('u-lum')) window.__lumieres++;
                }))).observe(document.getElementById('show-universe'), { childList: true, subtree: true });
                return { y: scrollY, haut: document.querySelector(sel).getBoundingClientRect().top };
            }, sel);
            // Un clic sur la ligne qui n'aboutit pas dit ce qui l'en empêche :
            // vu une fois sur la machine des demandes de fusion (délai de 30 s
            // dépassé), jamais ici, même au processeur ralenti huit fois.
            const cliquerLigne = async (sel, etape) => {
                try {
                    await p.click(sel, { timeout: 15000 });
                } catch (e) {
                    const etat = await p.evaluate((sel) => {
                        const el = document.querySelector(sel);
                        const r = el && el.getBoundingClientRect();
                        const dessus = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                        const o = document.getElementById('show-universe');
                        return `panneau ${o.hidden ? 'caché' : 'affiché'}${o.classList.contains('is-open') ? ', ouvert' : ''}`
                            + `, page ${document.getElementById('site')?.inert ? 'inerte' : 'active'}`
                            + `, <html> « ${document.documentElement.className} »`
                            + `, sous le pointeur ${dessus ? dessus.tagName.toLowerCase() + (dessus.id ? '#' + dessus.id : '') + '.' + String(dessus.className).split(' ')[0] : 'rien'}`;
                    }, sel).catch(() => 'état illisible');
                    throw new Error(`${etape} : la ligne ne se laisse pas cliquer (${etat})`);
                }
            };
            const finDuPassage = () => p.waitForFunction(() => document.getElementById('show-universe').classList.contains('is-open')
                && !document.documentElement.classList.contains('vt-univers'), null, { timeout: 8000, polling: 5 });
            await cliquerLigne(sel, 'première ouverture');
            await finDuPassage();
            await p.waitForTimeout(2500);
            const ouvert = await p.evaluate(() => {
                const o = document.getElementById('show-universe');
                return {
                    cachee: document.documentElement.classList.contains('u-page-cachee'),
                    rendue: getComputedStyle(document.getElementById('site')).contentVisibility,
                    temps: o.querySelectorAll('.u-figs > *').length,
                    lumieres: o.querySelectorAll('.u-lum').length, posees: window.__lumieres
                };
            });
            exige(ouvert.cachee && ouvert.rendue === 'hidden', `la page sous le panneau est encore rendue (${ouvert.rendue})`);
            exige(ouvert.temps > 0, 'le montage n’a pas été posé après le passage');
            exige(ouvert.lumieres > 0 && ouvert.posees === ouvert.lumieres,
                `la lumière n’est pas posée une seule fois : ${ouvert.posees} fenêtres créées pour ${ouvert.lumieres}`);
            await p.keyboard.press('Escape');
            await p.waitForTimeout(1800);
            const ferme = await p.evaluate((sel) => ({
                cachee: document.documentElement.classList.contains('u-page-cachee'),
                rendue: getComputedStyle(document.getElementById('site')).contentVisibility,
                haut: document.querySelector(sel).getBoundingClientRect().top,
                focus: document.activeElement === document.querySelector(sel)
            }), sel);
            exige(!ferme.cachee && ferme.rendue === 'visible', 'la page reste cachée après la fermeture');
            exige(Math.abs(ferme.haut - avant.haut) <= 20, `la ligne n’est pas revenue à sa place : ${Math.round(avant.haut)} px puis ${Math.round(ferme.haut)} px`);
            exige(ferme.focus, 'le focus n’est pas revenu sur la ligne');
            // Rouvert, et « Accéder aux dates » dès la fin du passage.
            await p.waitForTimeout(300);
            await cliquerLigne(await viser(), 'réouverture');
            await finDuPassage();
            await p.evaluate(() => document.querySelector('#show-universe [data-u-jump]').click());
            await p.waitForTimeout(2000);
            const saut = await p.evaluate(() => {
                const o = document.getElementById('show-universe');
                return {
                    temps: o.querySelectorAll('.u-figs > *').length, pied: o.querySelector('.u-foot').getBoundingClientRect().top,
                    auBout: Math.abs(o.scrollTop - (o.scrollHeight - o.clientHeight)) <= 2
                };
            });
            exige(saut.temps === ouvert.temps, `le montage est incomplet après le saut : ${saut.temps} temps sur ${ouvert.temps}`);
            exige(Math.abs(saut.pied) <= 2 || (saut.pied > 0 && saut.auBout), `le saut aux dates n’arrive pas au pied (${Math.round(saut.pied)} px)`);
            // Et PENDANT le passage — au clavier, ou d'un lecteur d'écran qui
            // active sans viser : le montage n'est pas encore parti, il doit
            // être posé avant d'aller au pied, sinon il s'insère au-dessus
            // une fois le passage fini et le pied part 10 000 px plus bas.
            await p.keyboard.press('Escape');
            await p.waitForTimeout(1500);
            await cliquerLigne(await viser(), 'ouverture pour le saut pendant le passage');
            await p.waitForFunction(() => document.documentElement.classList.contains('vt-univers')
                && document.querySelector('#show-universe.is-open [data-u-jump]'), null, { timeout: 8000, polling: 5 });
            const dansLePassage = await p.evaluate(() => {
                const vt = document.documentElement.classList.contains('vt-univers');
                document.querySelector('#show-universe [data-u-jump]').click();
                return vt;
            });
            exige(dansLePassage, 'le saut n’a pas pu être essayé pendant le passage');
            await finDuPassage();
            await p.waitForTimeout(2000);
            const sautPendant = await p.evaluate(() => {
                const o = document.getElementById('show-universe');
                const t = o.querySelector('.u-foot-title').getBoundingClientRect();
                return {
                    temps: o.querySelectorAll('.u-figs > *').length, titre: t.top,
                    focus: document.activeElement === o.querySelector('.u-foot-title')
                };
            });
            exige(sautPendant.temps === ouvert.temps, `un saut pendant le passage laisse le montage incomplet : ${sautPendant.temps} temps sur ${ouvert.temps}`);
            exige(sautPendant.titre >= -2 && sautPendant.titre < 900 && sautPendant.focus,
                `un saut pendant le passage n’arrive pas aux dates : leur titre est à ${Math.round(sautPendant.titre)} px`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('l’onglet Dates à la densité du CV : la feuille sur la photo, le spectacle, la ville et la salle, une puce par séance, un agenda qui demande la séance ; la frise des mois, liens vers les pages spectacle, rangement par spectacle, sommaire, une image par représentation — et la prochaine date, au CV seulement', async () => {
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
                // Comme à l'arrivée des dates en direct : l'onglet, et les
                // données structurées avec lui.
                datesMisesAJour();
                renderNextDate();
            });
            const parDate = await p.evaluate(() => {
                const liste = document.getElementById('upcoming-dates-container');
                const serie = liste.querySelector('.dl--serie');
                const berenice = [...liste.querySelectorAll('.dl')].find((l) => /Bérénice/.test(l.querySelector('.dl-titre')?.textContent || ''));
                return {
                    intercalaires: liste.querySelectorAll('.dl-intercalaire h4').length,
                    feuilles: liste.querySelectorAll('.dl-feuille .dl-num').length,
                    // Les jours d'une série, au centre de la feuille, avec un tiret.
                    jours: serie ? serie.querySelector('.dl-feuille .dl-num').textContent : '',
                    photo: !!berenice && !!berenice.querySelector('.dl-feuille img'),
                    cases: serie ? serie.querySelectorAll('.dl-seance').length : 0,
                    scolaireSansReserver: serie ? !serie.querySelector('.dl-seance--scolaire .dl-reserver') : false,
                    reserver: liste.querySelectorAll('.dl-reserver').length,
                    agendas: serie ? serie.querySelectorAll('.dl-agenda').length : 0,
                    lieu: serie ? serie.querySelector('.dl-lieu').textContent : '',
                    hauteur: serie ? serie.getBoundingClientRect().height : 0,
                    totaux: [...liste.querySelectorAll('.dl-intercalaire')].filter((x) => /représentation/.test(x.textContent)).length,
                    sommaire: !document.getElementById('dates-sommaire').hidden
                        && !!document.querySelector('#dates-sommaire .dl-grille [data-dl-aller]'),
                    // Repliée tant qu'on n'a pas touché les années de la saison.
                    replie: document.getElementById('dates-saison-bouton').getAttribute('aria-expanded') === 'false'
                        && getComputedStyle(document.getElementById('dates-saison-panneau')).visibility === 'hidden'
                };
            });
            exige(parDate.intercalaires >= 1, 'aucun intercalaire de mois');
            exige(parDate.feuilles === 3, `${parDate.feuilles} feuille(s) d’éphéméride pour trois lignes`);
            exige(/^\d{1,2}–\d{1,2}$/.test(parDate.jours), `la feuille d’une série n’écrit pas ses jours avec un tiret : « ${parDate.jours} »`);
            exige(parDate.photo, 'la feuille de Bérénice n’est pas posée sur la photo du spectacle');
            exige(parDate.cases === 2, `la série montre ${parDate.cases} puce(s) de séance au lieu de deux`);
            exige(parDate.scolaireSansReserver, 'une séance scolaire propose « Réserver »');
            exige(parDate.reserver === 2, `${parDate.reserver} lien(s) de réservation au lieu de deux`);
            exige(parDate.agendas === 1, `la série a ${parDate.agendas} bouton(s) d’agenda au lieu d’un`);
            exige(parDate.lieu === 'Rouen · Salle de vérification (76)', `la ville et la salle : « ${parDate.lieu} »`);
            // La densité du CV : une série de deux soirs tient dans la
            // hauteur d'une ligne du CV, au téléphone (près de 200 px avant).
            exige(parDate.hauteur > 0 && parDate.hauteur <= 80, `une série occupe ${Math.round(parDate.hauteur)} px au téléphone (80 au plus)`);
            exige(!parDate.totaux, 'un intercalaire écrit encore un total de représentations');
            exige(parDate.sommaire, 'le sommaire de la saison n’est pas là');
            // Chaque spectacle à sa couleur, sur sa ligne : le titre à son
            // encre (lisible : contraste de 4,5 au moins sur la ligne), le
            // souligné, les puces et le cadre de la feuille à sa couleur.
            const couleurs = await p.evaluate(() => {
                const sonde = document.createElement('span');
                document.body.appendChild(sonde);
                const rgb = (c) => { sonde.style.color = ''; sonde.style.color = c; return getComputedStyle(sonde).color; };
                const lum = (c) => { const v = c.match(/[\d.]+/g).slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
                const fond = lum('rgb(244, 242, 237)');
                const lignes = [...document.querySelectorAll('#upcoming-dates-container .dl')].filter((l) => l.style.getPropertyValue('--dl-a'));
                const res = lignes.map((l) => {
                    const a = rgb(l.style.getPropertyValue('--dl-a'));
                    const t = l.querySelector('.dl-titre');
                    const lien = l.querySelector('.dl-vers-page');
                    const puce = l.querySelector('a.dl-puce');
                    const encre = getComputedStyle(t).color;
                    const x = lum(encre);
                    return {
                        titre: t.textContent.trim().slice(0, 20),
                        contraste: (Math.max(x, fond) + 0.05) / (Math.min(x, fond) + 0.05),
                        encre: encre !== getComputedStyle(document.body).color,
                        souligne: !lien || getComputedStyle(lien).textDecorationColor === a,
                        puce: !puce || getComputedStyle(puce).borderTopColor !== rgb('rgb(var(--c-gold) / 0.55)'),
                        feuille: getComputedStyle(l.querySelector('.dl-feuille')).boxShadow.includes(a)
                    };
                });
                sonde.remove();
                return res;
            });
            exige(couleurs.length >= 1, `${couleurs.length} ligne(s) à la couleur d’un spectacle`);
            couleurs.forEach((c) => {
                exige(c.encre && c.contraste >= 4.5, `${c.titre} : le titre n’est pas à l’encre lisible de son spectacle (contraste ${c.contraste.toFixed(2)})`);
                exige(c.souligne && c.puce && c.feuille, `${c.titre} : le souligné, les puces ou le cadre de la feuille ne sont pas à la couleur du spectacle (${JSON.stringify(c)})`);
            });
            exige(parDate.replie, 'la saison d’un regard est ouverte d’emblée : elle ne doit paraître qu’au toucher des années de la saison');
            // Les années de la saison l'ouvrent, et la referment. La hauteur
            // du panneau ne s'anime pas : elle est posée d'un coup, et c'est
            // la liste dessous qui glisse, en translate (voir dlDeplier) —
            // rien ne traîne une fois arrivé.
            const saisonVue = () => p.evaluate(() => {
                const liste = document.getElementById('upcoming-dates-container');
                const panneau = document.getElementById('dates-saison-panneau');
                return {
                    ouvert: document.getElementById('dates-saison-bouton').getAttribute('aria-expanded'),
                    haut: document.getElementById('dates-sommaire').getBoundingClientRect().height,
                    visible: getComputedStyle(panneau).visibility,
                    hauteurAnimee: getComputedStyle(panneau).transitionProperty.includes('grid-template-rows'),
                    glisse: liste.getAnimations().some((a) => a.effect && a.effect.getKeyframes().some((k) => k.translate)),
                    reste: panneau.style.cssText + getComputedStyle(liste).translate
                };
            });
            await p.click('#dates-saison-bouton');
            // Le glissement part après l'image du geste : on le prend en route.
            await p.waitForTimeout(120);
            const enRoute = await saisonVue();
            exige(!enRoute.hauteurAnimee && enRoute.glisse, `la saison d’un regard pousse la liste en animant sa hauteur, au lieu de la faire glisser (${JSON.stringify(enRoute)})`);
            await p.waitForTimeout(700);
            const ouverte = await saisonVue();
            exige(ouverte.ouvert === 'true' && ouverte.visible === 'visible' && ouverte.haut > 40, `toucher les années de la saison n’ouvre pas la saison d’un regard (${JSON.stringify(ouverte)})`);
            exige(!ouverte.glisse && ouverte.reste === 'none', `la liste n’a pas fini de glisser, ou le panneau garde un style posé en route (${ouverte.reste})`);
            await p.click('#dates-saison-bouton');
            await p.waitForTimeout(700);
            const refermee = await saisonVue();
            exige(refermee.ouvert === 'false' && refermee.visible === 'hidden', `les années de la saison ne referment pas la saison d’un regard (${JSON.stringify(refermee)})`);
            exige(!refermee.glisse && refermee.reste === 'none', `la liste n’a pas fini de remonter, ou le panneau garde sa hauteur (${refermee.reste})`);
            await p.click('#dates-saison-bouton');
            await p.waitForTimeout(700);

            // Une date seule a sa puce, comme chaque soir d'une série : son
            // heure y mène à la billetterie.
            const seule = await p.evaluate(() => {
                const l = [...document.querySelectorAll('#upcoming-dates-container .dl--seule')]
                    .find((x) => /Spectacle de vérification/.test(x.querySelector('.dl-titre')?.textContent || ''));
                return l ? {
                    cases: l.querySelectorAll('.dl-seance').length,
                    heure: l.querySelector('.dl-seance .dl-s-heure')?.textContent || '',
                    reserver: !!l.querySelector('.dl-seance .dl-reserver')
                } : null;
            });
            exige(seule && seule.cases === 1 && seule.heure === '20h00' && seule.reserver,
                `une date seule n’a pas sa puce (heure, réservation) : ${JSON.stringify(seule)}`);

            // Les représentations annoncées aux moteurs ont toutes une image,
            // même celles d'un spectacle sans photo (la Search Console le
            // relève) : ici, le spectacle fictif.
            const evenements = await p.evaluate(() => {
                const el = document.getElementById('events-jsonld');
                const liste = el ? JSON.parse(el.textContent) : [];
                return { n: liste.length, sansImage: liste.filter((e) => !e.image).map((e) => e.name) };
            });
            exige(evenements.n >= 2, `${evenements.n} représentation(s) annoncée(s) aux moteurs`);
            exige(!evenements.sansImage.length, `représentation(s) sans image : ${evenements.sansImage.join(', ')}`);

            // Le nom d'un spectacle mène à sa page ; sans page, pas de lien,
            // jamais un lien mort : chaque adresse visée doit répondre.
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
                    morts
                };
            });
            exige(liens.ligne.join() === 'spectacles/berenice/', `la ligne de Bérénice ne mène pas à sa page : ${JSON.stringify(liens.ligne)}`);
            exige(!liens.sansPage, 'le nom d’un spectacle sans page porte un lien');
            exige(!liens.morts.length, `lien(s) mort(s) : ${liens.morts.join(', ')}`);

            // La prochaine date est en tête du CV, et seulement là : l'onglet
            // Dates n'en affiche pas, sa liste commence par elle. Sa ligne
            // mène à sa date dans cet onglet (le CV est masqué pendant ce
            // test, d'où le clic donné par le script).
            const carton = await p.evaluate(() => {
                const cv = document.getElementById('next-date-banner');
                return {
                    cv: !!cv && !cv.hidden && /Bérénice/.test(cv.textContent) && cv.querySelectorAll('.td-dep').length === 1,
                    dates: !document.querySelector('#page_dates .td, #page_dates .fl, #page_dates [data-depart]')
                };
            });
            exige(carton.cv, 'la prochaine date manque en tête du CV');
            exige(carton.dates, 'l’onglet Dates affiche une prochaine date : elle ne doit être qu’au CV');
            await p.evaluate(() => document.querySelector('#next-date-banner [data-depart]').click());
            await p.waitForTimeout(900);
            exige(await p.evaluate(() => {
                const a = document.activeElement;
                return !!a && a.classList.contains('dl') && a.classList.contains('dl-eclaire') && /Bérénice/.test(a.textContent);
            }), 'la prochaine date du CV ne mène pas à sa ligne dans l’onglet Dates');

            // LA FRISE DES MOIS. Chaque mois a son liseré dans la marge de la
            // carte, à sa couleur — douze couleurs, qui suivent les saisons,
            // toutes différentes : une trace pâle, et le trait qui s'y trace
            // au défilement (voir la vérification de la frise, plus bas). Son
            // point est posé devant le nom du mois, centré sur le liseré.
            const frise = await p.evaluate(() => {
                const page = document.getElementById('page_dates');
                const g = document.querySelector('#upcoming-dates-container .dl-groupe[data-mois]');
                const inter = g && g.querySelector('.dl-intercalaire');
                const trace = g && getComputedStyle(g, '::before');
                const trait = g && getComputedStyle(g, '::after');
                const point = inter && getComputedStyle(inter, '::after');
                const style = getComputedStyle(page);
                const couleurs = Array.from({ length: 12 }, (_, i) => style.getPropertyValue(`--dl-mois-${i + 1}`).trim());
                // La couleur attendue, telle que le navigateur la rend.
                const sonde = document.createElement('span');
                sonde.style.color = g ? `var(--dl-mois-${g.dataset.mois})` : '';
                page.appendChild(sonde);
                const attendue = getComputedStyle(sonde).color;
                // Dans la saison d'un regard, les initiales des mois portent
                // le même code couleur : toutes différentes, aucune restée grise.
                sonde.style.color = 'rgb(var(--c-muted))';
                const grise = getComputedStyle(sonde).color;
                sonde.remove();
                const initiales = [...document.querySelectorAll('#dates-sommaire .dl-grille-mois')].map((x) => getComputedStyle(x).color);
                const px = (v) => parseFloat(v) || 0;
                const bord = g ? g.getBoundingClientRect().left : 0;
                return {
                    trait: !!trait && trait.width === '3px' && trait.backgroundColor === attendue && px(trait.left) < 0,
                    trace: !!trace && trace.width === '3px' && trace.left === trait.left
                        && !['rgba(0, 0, 0, 0)', attendue].includes(trace.backgroundColor),
                    point: !!point && point.backgroundColor === attendue && px(point.width) === 8 && px(point.height) === 8,
                    // Le centre du point et celui du liseré, depuis le bord de la liste.
                    ecart: point ? Math.abs((inter.getBoundingClientRect().left - bord + px(point.left) + px(point.width) / 2)
                        - (px(trait.left) + px(trait.width) / 2)) : 99,
                    douze: couleurs.every(Boolean) && new Set(couleurs).size === 12,
                    initiales: initiales.length > 0 && !initiales.includes(grise) && new Set(initiales).size === initiales.length
                };
            });
            exige(frise.trait && frise.trace && frise.douze,
                `le liseré des mois manque, n’est pas dans la marge ou n’a pas la couleur de son mois : ${JSON.stringify(frise)}`);
            exige(frise.point && frise.ecart < 0.6, `le point du mois manque, ou n’est pas posé sur le liseré : ${JSON.stringify(frise)}`);
            exige(frise.initiales, 'les initiales des mois, dans la saison d’un regard, n’ont pas leur couleur');

            // L'agenda d'une série : un seul bouton ; la fenêtre demande
            // quelle séance ajouter, et propose d'abord la séance publique.
            await p.locator('#upcoming-dates-container .dl--serie .dl-agenda').first().click();
            await p.waitForTimeout(300);
            const lireAgenda = () => p.evaluate(() => {
                const choix = document.getElementById('cal-modal-seances');
                const boutons = [...choix.querySelectorAll('button')];
                return {
                    titre: document.getElementById('cal-modal-title')?.textContent || '',
                    visible: !choix.hidden,
                    seances: boutons.map((b) => b.textContent),
                    choisie: boutons.findIndex((b) => b.getAttribute('aria-pressed') === 'true'),
                    sous: document.getElementById('cal-modal-subtitle')?.textContent || ''
                };
            });
            const agenda = await lireAgenda();
            exige(/vérification/.test(agenda.titre), 'la fenêtre d’agenda ne s’ouvre pas depuis une série');
            exige(agenda.visible && agenda.seances.length === 2,
                `la fenêtre d’agenda ne propose pas les deux séances de la série : ${JSON.stringify(agenda.seances)}`);
            exige(agenda.choisie === 1 && /scolaire/.test(agenda.seances[0]) && /20h00/.test(agenda.seances[1]),
                `la séance proposée d’abord n’est pas la séance publique : ${JSON.stringify(agenda)}`);
            await p.locator('#cal-modal-seances button').first().click();
            const autre = await lireAgenda();
            exige(autre.choisie === 0 && autre.sous !== agenda.sous, 'choisir une autre séance ne change pas la date à ajouter');
            await p.keyboard.press('Escape');
            await p.waitForTimeout(300);
            // Une date seule n'a rien à choisir.
            await p.locator('#upcoming-dates-container .dl--seule .dl-agenda').first().click();
            await p.waitForTimeout(300);
            const seuleAgenda = await lireAgenda();
            exige(/Bérénice/.test(seuleAgenda.titre) && !seuleAgenda.visible, 'la fenêtre d’agenda d’une date seule propose de choisir une séance');
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
            // La photo est en tête du groupe : la feuille redevient papier, la
            // ligne ne répète pas le titre, et la frise prend la couleur du
            // spectacle.
            const groupeSpectacle = await p.evaluate(() => {
                const g = document.querySelector('#upcoming-dates-container .dl-groupe--spectacle');
                const sonde = document.createElement('span');
                sonde.style.color = 'var(--dl-a)';
                g.appendChild(sonde);
                const attendue = getComputedStyle(sonde).color;
                sonde.remove();
                return {
                    couleur: getComputedStyle(g, '::after').backgroundColor === attendue
                        && getComputedStyle(g.querySelector('.dl-intercalaire'), '::after').backgroundColor === attendue,
                    papier: !g.querySelector('.dl .dl-feuille img') && !!g.querySelector('.dl-feuille--papier'),
                    titres: g.querySelectorAll('.dl-titre').length
                };
            });
            exige(groupeSpectacle.couleur, 'rangé par spectacle, le liseré et le point n’ont pas la couleur du spectacle');
            exige(groupeSpectacle.papier, 'rangé par spectacle, la feuille garde une photo, déjà en tête du groupe');
            exige(!groupeSpectacle.titres, 'rangé par spectacle, la ligne répète le titre');

            // Un rond du sommaire ramène par date, jusqu'à sa ligne.
            await p.locator('#dates-sommaire [data-dl-aller]').first().click();
            await p.waitForTimeout(300);
            exige(await p.evaluate(() => document.querySelector('[data-dates-vue][aria-pressed="true"]').dataset.datesVue === 'date'
                && !!document.querySelector('#upcoming-dates-container .dl.dl-eclaire')),
                'le sommaire ne mène pas à la ligne visée');
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('l’onglet Dates ne se dessine que quand il sert : rien au démarrage, tout au repos ou à l’ouverture — même d’un toucher précoce —, avec les dates du moment ; les données structurées disent toute la saison, même pendant une recherche ; la recherche compte à la frappe, le rangement ne refait que la liste ; des dates en direct identiques ne redessinent rien', async () => {
            // Une saison fictive, posée à la fin du démarrage (un écouteur sur
            // window passe après ceux du document) : le premier dessin, qui
            // vient après, doit la montrer.
            const c = await visiteur({ viewport: { width: 390, height: 844 } });
            await c.addInitScript(() => window.addEventListener('DOMContentLoaded', () => {
                if (typeof SHOW_DATA === 'undefined') return;   // un cadre de la page, pas l'accueil
                window.__auDemarrage = {
                    compte: document.getElementById('dates-count')?.textContent || '',
                    ld: !!document.getElementById('events-jsonld')
                };
                const iso = (n) => {
                    const d = new Date();
                    d.setDate(d.getDate() + n);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                };
                const date = (n, titre) => ({ type: 'single', title: titre, location: 'Scène de vérification (76)', city: 'Rouen', dateLabel: iso(n), icsDate: iso(n), time: '20h00', bookingUrl: '', isSchool: false });
                SHOW_DATA.upcoming = [date(20, 'Bérénice'), date(30, 'Spectacle de vérification')];
            }));
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/', { waitUntil: 'load' });
            const demarrage = await p.evaluate(() => window.__auDemarrage);
            exige(demarrage && !demarrage.compte && !demarrage.ld, `l’onglet Dates, caché, est dessiné au démarrage : ${JSON.stringify(demarrage)}`);
            await p.waitForFunction(() => !!document.getElementById('events-jsonld'), null, { timeout: 8000 }).catch(() => { });
            const repos = await p.evaluate(() => ({
                lignes: document.querySelectorAll('#upcoming-dates-container .dl').length,
                ld: JSON.parse(document.getElementById('events-jsonld')?.textContent || '[]').map((e) => e.name).join(),
                cache: !document.getElementById('page_dates').classList.contains('active')
            }));
            exige(repos.cache && repos.lignes === 2 && repos.ld === 'Bérénice,Spectacle de vérification',
                `au repos, l’onglet Dates n’est pas dessiné avec les dates du moment, ou les données structurées manquent : ${JSON.stringify(repos)}`);

            // La recherche : le compte (lu par les lecteurs d'écran) change à
            // la frappe, la liste à l'image suivante ; les données
            // structurées ne bougent pas.
            await p.click('#tab-page_dates');
            await p.waitForTimeout(700);
            const recherche = await p.evaluate(() => new Promise((fin) => {
                const ld = () => document.getElementById('events-jsonld')?.textContent || '';
                const avant = ld();
                const s = document.getElementById('dates-search');
                s.value = 'zzzz';
                s.dispatchEvent(new Event('input', { bubbles: true }));
                const compte = document.getElementById('dates-count').textContent;
                requestAnimationFrame(() => setTimeout(() => {
                    const r = { compte, vide: !!document.querySelector('#upcoming-dates-container .dl-vide'), ld: !!avant && ld() === avant };
                    s.value = '';
                    s.dispatchEvent(new Event('input', { bubbles: true }));
                    fin(r);
                }, 50));
            }));
            exige(recherche.compte === 'Aucune représentation' && recherche.vide,
                `la recherche ne compte pas à la frappe, ou ne vide pas la liste : ${JSON.stringify(recherche)}`);
            exige(recherche.ld, 'les données structurées ont changé pendant une recherche : elles doivent dire toute la saison');
            await p.waitForTimeout(300);
            // Le rangement ne refait que la liste : le sommaire et les archives restent les mêmes nœuds.
            const rangement = await p.evaluate(() => {
                const sommaire = document.querySelector('#dates-sommaire nav');
                const archives = document.getElementById('archived-seasons-container').firstElementChild;
                document.querySelector('[data-dates-vue="spectacle"]').click();
                const r = {
                    liste: document.querySelectorAll('#upcoming-dates-container .dl-groupe--spectacle').length,
                    sommaire: !!sommaire && sommaire === document.querySelector('#dates-sommaire nav'),
                    archives: archives === document.getElementById('archived-seasons-container').firstElementChild
                };
                document.querySelector('[data-dates-vue="date"]').click();
                return r;
            });
            exige(rangement.liste === 2 && rangement.sommaire && rangement.archives,
                `changer de rangement refait plus que la liste : ${JSON.stringify(rangement)}`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();

            // Un toucher sur l'onglet dès le démarrage, avant le repos : tout est là.
            const c2 = await visiteur({ viewport: { width: 390, height: 844 } });
            const p2 = await c2.newPage();
            const erreurs2 = guette(p2);
            await p2.goto(base + '/', { waitUntil: 'domcontentloaded' });
            await p2.click('#tab-page_dates');
            await p2.waitForTimeout(700);
            const tot = await p2.evaluate(() => ({
                actif: document.getElementById('page_dates').classList.contains('active'),
                compte: document.getElementById('dates-count').textContent,
                puces: document.querySelectorAll('#filter-shows [data-filter-group]').length,
                haut: document.getElementById('upcoming-dates-container').offsetHeight
            }));
            exige(tot.actif && tot.compte && tot.puces > 0 && tot.haut > 0, `un toucher précoce sur l’onglet Dates ouvre un onglet incomplet : ${JSON.stringify(tot)}`);
            exige(!erreurs2.length, erreurs2.join(' | '));
            await c2.close();

            // Les dates en direct : la base répond ce que dates.js contient
            // déjà (le lendemain d'un export) — rien n'est redessiné ; une
            // heure change — l'onglet et le tableau de gare suivent.
            const donnees = new Function(fs.readFileSync(path.join(RACINE, 'dates.js'), 'utf8') + '; return SHOW_DATA;')();
            const lignes = [];
            donnees.upcoming.forEach((e) => (e.type === 'series' ? e.shows : [e]).forEach((r) => lignes.push({
                id: lignes.length + 1, jour: r.icsDate, heure: r.time, spectacle: e.title, lieu: e.location, ville: e.city,
                reservation_url: r.bookingUrl, scolaire: r.isSchool
            })));
            for (const change of [false, true]) {
                const c3 = await visiteur({ viewport: { width: 390, height: 844 } });
                await c3.addInitScript(() => window.addEventListener('DOMContentLoaded', () => {
                    if (typeof window.renderNextDate !== 'function') return;   // un cadre de la page
                    const compte = window.__rendus = { tableau: 0, onglet: 0 };
                    const tableau = window.renderNextDate, onglet = window.datesMisesAJour;
                    window.renderNextDate = function () { compte.tableau++; return tableau.apply(this, arguments); };
                    window.datesMisesAJour = function () { compte.onglet++; return onglet.apply(this, arguments); };
                }));
                const p3 = await c3.newPage();
                const erreurs3 = guette(p3);
                const corps = lignes.map((l, i) => (change && i === 0 ? Object.assign({}, l, { heure: '23h59' }) : l));
                await p3.route(/supabase\.co/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corps), headers: { 'access-control-allow-origin': '*' } }));
                await p3.goto(base + '/', { waitUntil: 'load' });
                await p3.waitForTimeout(600);
                const vu = await p3.evaluate(() => ({ source: SHOW_DATA.source, rendus: window.__rendus }));
                exige(vu.source === 'supabase', 'les dates en direct simulées ne sont pas arrivées');
                if (!change) exige(!vu.rendus.tableau && !vu.rendus.onglet, `des dates en direct identiques à dates.js redessinent la page : ${JSON.stringify(vu.rendus)}`);
                else exige(vu.rendus.tableau === 1 && vu.rendus.onglet === 1, `des dates en direct qui diffèrent ne redessinent pas la page une fois : ${JSON.stringify(vu.rendus)}`);
                exige(!erreurs3.length, erreurs3.join(' | '));
                await c3.close();
            }
        });

        await verifie('un visiteur neuf trouve les dates rangées par spectacle, et la prochaine date du CV le mène à sa ligne, éclairée, sous son spectacle', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 844 }, neuf: true });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(500);
            // Une date de Bérénice à trois semaines : la saison réelle peut
            // être vide, la vérification ne doit pas en dépendre.
            await p.evaluate(() => {
                const d = new Date();
                d.setDate(d.getDate() + 20);
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                SHOW_DATA.upcoming = [{
                    type: 'single', title: 'Bérénice', location: 'Scène de vérification (76)', city: 'Rouen',
                    dateLabel: iso, icsDate: iso, time: '20h00', bookingUrl: '', isSchool: false
                }];
                datesMisesAJour();
                renderNextDate();
            });
            // Au téléphone, la barre d'onglets flotte en bas de l'écran et
            // couvre le bas du tableau à l'arrivée : un visiteur fait défiler
            // un peu, puis touche. Sans ce défilement, Playwright cherche
            // lui-même où cliquer derrière la barre, et Chromium sans écran
            // cesse alors de produire des images une à deux secondes — le
            // passage d'onglet attend sa première image, et la vérification
            // mesurerait l'outil, pas le site.
            await p.evaluate(() => document.querySelector('#next-date-banner .td-dep').scrollIntoView({ block: 'center', behavior: 'instant' }));
            await p.click('#next-date-banner .td-dep');
            await p.waitForTimeout(1400);
            const arrivee = await p.evaluate(() => {
                const a = document.activeElement;
                const groupe = a && a.closest('.dl-groupe');
                return {
                    vue: document.querySelector('[data-dates-vue][aria-pressed="true"]')?.dataset.datesVue,
                    retenu: localStorage.getItem('av.datesVue'),
                    ligne: !!a && a.classList.contains('dl') && a.classList.contains('dl-eclaire'),
                    spectacle: groupe?.querySelector('.dl-intercalaire--spectacle h4')?.textContent || null
                };
            });
            exige(arrivee.vue === 'spectacle', `un visiteur neuf trouve les dates rangées « ${arrivee.vue} »`);
            exige(arrivee.retenu === null, 'le rangement par défaut est écrit dans le stockage sans que le visiteur l’ait choisi');
            exige(arrivee.ligne && /Bérénice/.test(arrivee.spectacle || ''),
                `la prochaine date ne mène pas à sa ligne sous son spectacle (ligne : ${arrivee.ligne}, spectacle : ${arrivee.spectacle})`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('la prochaine date du CV : une ligne de tableau de gare, « Prochaine date » et jamais « Départs », des palettes qui battent une fois puis se posent, qui mènent à sa date — posée d’emblée en mouvement réduit', async () => {
            // Une date fictive, choisie pour éprouver les règles du tableau :
            // une ville trop longue (abrégée, coupée entre deux mots, sans
            // trait d'union), et deux séances le même soir, dont la première
            // est scolaire — l'heure affichée est celle du public.
            const donnees = () => {
                const d = new Date();
                d.setDate(d.getDate() + 20);
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                SHOW_DATA.upcoming = [{
                    type: 'series', id: 'panel-verification-departs', title: 'Bérénice', city: 'Saint-Pierre-lès-Elbeuf',
                    location: 'Théâtre de vérification, Saint-Pierre-lès-Elbeuf (76)', dateLabel: iso, shows: [
                        { dateLabel: iso, icsDate: iso, time: '14h00', bookingUrl: '', isSchool: true },
                        { dateLabel: iso, icsDate: iso, time: '20h30', bookingUrl: '', isSchool: false }
                    ]
                }, {
                    type: 'single', title: 'Cléophène, d’après Rodogune', city: 'Falaise', location: 'Le Forum, Falaise (14)',
                    dateLabel: 'plus tard', icsDate: '2099-01-01', time: '20h00', bookingUrl: '', isSchool: false
                }];
                renderDates();
                renderNextDate();
                return String(d.getDate()).padStart(2, '0');
            };
            const lire = (p) => p.evaluate(() => {
                const t = document.getElementById('next-date-banner');
                const col = (c) => [...t.querySelectorAll(`.td-col.${c} .fl`)];
                const vu = (c) => col(c).map((f) => f.querySelector('.fl-h i').textContent).join('');
                const bas = (c) => col(c).map((f) => f.querySelector('.fl-b i').textContent).join('');
                const cible = (c) => col(c).map((f) => f.dataset.c).join('');
                const cols = ['date', 'heure', 'titre', 'ville'];
                return {
                    cache: t.hidden,
                    titre: t.querySelector('.td-sur')?.textContent.trim() || '',
                    departs: /départs/i.test(t.textContent),
                    lignes: t.querySelectorAll('.td-dep').length,
                    cibles: cols.map(cible),
                    vus: cols.map(vu),
                    bas: cols.map(bas),
                    roule: t.classList.contains('td-roule'),
                    volets: t.querySelectorAll('.fl-v1').length,
                    // Les volets seulement : le voyant du titre frappe ses deux coups à part.
                    enVol: document.getAnimations().filter((a) => a.effect && a.effect.target
                        && a.effect.target.closest && a.effect.target.closest('#next-date-banner .fl')).length,
                    clair: t.querySelector('.td-dep .sr-only')?.textContent || '',
                    muet: t.querySelector('.td-ligne')?.getAttribute('aria-hidden'),
                    sous: (() => { const x = t.querySelector('.td-sous'); return x && x.offsetHeight ? x.innerText.replace(/\s+/g, ' ').trim() : ''; })()
                };
            });

            // On part de l'onglet Dates : le CV, et sa prochaine date, sont
            // masqués — rien ne doit battre avant d'être vu.
            const c = await visiteur({ viewport: { width: 390, height: 844 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/#page_dates', { waitUntil: 'load' });
            await p.waitForTimeout(300);
            const jour = await p.evaluate(donnees);
            const avant = await lire(p);
            exige(!avant.cache && avant.lignes === 1, `la prochaine date n’a pas une ligne et une seule : ${avant.lignes}`);
            exige(avant.titre === 'Prochaine date' && !avant.departs, `le titre du tableau : « ${avant.titre} » (« Départs » affiché : ${avant.departs})`);
            exige(avant.vus.join('').trim() === '' && !avant.roule, 'le tableau a battu avant d’être vu');
            exige(avant.cibles[0].startsWith(jour + ' ') && /^\d\d [A-ZÉÛ]{3,4} ?$/.test(avant.cibles[0]),
                `la date du tableau : « ${avant.cibles[0]} »`);
            exige(avant.cibles.slice(1).join('|') === '20H30|BÉRÉNICE    |ST PIERRE   ',
                `l’heure du public, le spectacle ou la ville abrégée : ${avant.cibles.slice(1).join('|')}`);
            exige(/Bérénice/.test(avant.clair) && /14h00 et 20h30/.test(avant.clair) && /Saint-Pierre-lès-Elbeuf/.test(avant.clair)
                && avant.muet === 'true', `le texte lu par un lecteur d’écran : « ${avant.clair} » (palettes aria-hidden : ${avant.muet})`);

            // Le CV s'ouvre : les palettes passent par d'autres lettres, puis
            // se posent toutes sur la bonne, et les volets s'arrêtent. À
            // chaque image, tant que le volet du haut tombe, la moitié basse
            // doit encore montrer l'ancienne lettre : la nouvelle n'y paraît
            // qu'avec le volet du bas (ce qui voit se relire le volet resté à
            // plat, écrit trop tôt, lettre nouvelle sous lettre ancienne).
            await p.evaluate(() => {
                const o = window.__tdImages = { images: 0, vues: 0, fautes: 0 };
                const face = (el) => getComputedStyle(el).visibility === 'visible' && new DOMMatrix(getComputedStyle(el).transform).m22 > 0.02;
                const image = () => {
                    o.images++;
                    document.querySelectorAll('#next-date-banner .fl').forEach((f) => {
                        if (f.children.length !== 4) return;
                        const [, b, v1, v2] = f.children;
                        if (!face(v1)) return;
                        o.vues++;
                        if ((face(v2) ? v2 : b).textContent !== v1.textContent) o.fautes++;
                    });
                    if (!o.fin) requestAnimationFrame(image);
                };
                requestAnimationFrame(image);
            });
            await p.click('#tab-page_cv');
            let passage = false, roule = false, fin = null;
            for (let i = 0; i < 160 && !fin; i++) {
                await p.waitForTimeout(50);
                const e = await lire(p);
                roule = roule || e.roule;
                passage = passage || e.vus.some((v, n) => v.trim() && v !== e.cibles[n]);
                if (!e.roule && e.vus.join('|') === e.cibles.join('|')) fin = e;
            }
            exige(roule && passage, `le tableau n’a pas battu (volets : ${roule}, lettres de passage : ${passage})`);
            exige(fin, 'les palettes ne se sont pas posées en huit secondes');
            const images = await p.evaluate(() => { window.__tdImages.fin = true; return window.__tdImages; });
            exige(images.vues > 0 && !images.fautes,
                `la moitié basse change de lettre avant que le haut ne soit tombé : ${images.fautes} fois sur ${images.vues}`);
            exige(fin.bas.join('|') === fin.cibles.join('|') && !fin.enVol,
                `une palette reste à moitié tournée : ${fin.bas.join('|')} (${fin.enVol} animation(s) en cours)`);
            // Sur téléphone, l'heure et la ville s'écrivent en clair dessous.
            exige(fin.sous === '20h30 · Saint-Pierre-lès-Elbeuf', `sous les palettes, sur téléphone : « ${fin.sous} »`);

            // Il ne rejoue pas : le même rendu ne redessine rien.
            await p.evaluate(() => renderNextDate());
            const rendu = await lire(p);
            exige(!rendu.roule && rendu.vus.join('|') === rendu.cibles.join('|'), 'la prochaine date rejoue sur un rendu identique');

            // La ligne mène à sa date dans l'onglet Dates, sous l'intercalaire
            // de son mois — ni dessous, ni caché par lui.
            await p.click('#next-date-banner .td-dep');
            await p.waitForTimeout(1400);
            const arrivee = await p.evaluate(() => {
                const a = document.activeElement;
                const inter = a && a.closest('.dl-groupe')?.querySelector('.dl-intercalaire');
                return {
                    ok: !!a && a.classList.contains('dl') && a.classList.contains('dl-eclaire') && /Bérénice/.test(a.textContent),
                    ecart: a && inter ? Math.round(a.getBoundingClientRect().top - inter.getBoundingClientRect().bottom) : null
                };
            });
            exige(arrivee.ok, 'la prochaine date ne mène pas à sa ligne dans l’onglet Dates');
            exige(arrivee.ecart !== null && arrivee.ecart >= 0 && arrivee.ecart <= 24,
                `la ligne visée n’arrive pas juste sous l’intercalaire de son mois (écart : ${arrivee.ecart} px)`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();

            // Mouvement réduit : les palettes sont posées d'emblée, sans volets.
            const r = await visiteur({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
            const q = await r.newPage();
            await q.goto(base + '/', { waitUntil: 'load' });
            await q.waitForTimeout(300);
            const calme = await lire(q);
            exige(calme.lignes === 1 && calme.volets === 0 && !calme.roule && calme.vus.join('|') === calme.cibles.join('|')
                && calme.cibles.join('').trim() !== '', 'en mouvement réduit, la prochaine date n’est pas posée d’emblée');
            await r.close();
        });

        await verifie('« Télécharger le CV » : un seul lien, après la prochaine date', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 844 } });
            const p = await c.newPage();
            await p.goto(base + '/', { waitUntil: 'load' });
            const avant = async () => p.evaluate(() => {
                const liens = document.querySelectorAll('a[href$="cv-adrien-vada.pdf"]');
                const carton = document.getElementById('next-date-banner');
                const lien = liens[0];
                return {
                    n: liens.length,
                    apres: !!lien && !carton.hidden && !!(carton.compareDocumentPosition(lien) & Node.DOCUMENT_POSITION_FOLLOWING)
                        && carton.getBoundingClientRect().bottom <= lien.getBoundingClientRect().top,
                    visible: !!lien && lien.getBoundingClientRect().height > 0,
                    detail: lien?.getAttribute('data-track-detail')
                };
            });
            const tel = await avant();
            exige(tel.n === 1, `${tel.n} lien(s) « Télécharger le CV » au lieu d’un`);
            exige(tel.apres && tel.visible, 'sur téléphone, « Télécharger le CV » ne vient pas après la prochaine date');
            exige(tel.detail === 'mobile', `la mesure ne dit pas « mobile » sur téléphone : ${tel.detail}`);
            await p.setViewportSize({ width: 1280, height: 860 });
            await p.waitForTimeout(200);
            const bureau = await avant();
            exige(bureau.apres && bureau.visible, 'sur ordinateur, « Télécharger le CV » ne vient pas après la prochaine date');
            exige(bureau.detail === 'bureau', `la mesure ne dit pas « bureau » sur ordinateur : ${bureau.detail}`);
            await c.close();
        });

        await verifie('les démos voix : l’onglet n’amorce que la première démo ; toucher la barre d’une autre mène au point touché, avant même qu’elle soit chargée, et même quand le serveur ne sert pas de morceaux de fichier', async () => {
            // Le serveur local, comme l'aperçu de branche sur Cloudflare, ne
            // répond pas aux requêtes Range : sans le repli en mémoire (voir
            // allerDansLaDemo), le navigateur ne saute nulle part et l'extrait
            // repart du début — le défaut constaté sur téléphone.
            const c = await visiteur({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/#demos_voix', { waitUntil: 'load' });
            // L'onglet arrive en glissant, ses cartes en montant (0,6 s) : on
            // touche la barre une fois la page posée, comme un visiteur.
            await p.waitForTimeout(1200);
            // Seule la première démo est demandée à l'ouverture ; les autres
            // attendent qu'on s'en approche (voir amorcerDemo).
            const amorcees = await p.evaluate(() => [...document.querySelectorAll('#demos_voix audio')]
                .map((a) => a.preload !== 'none' || a.readyState > 0));
            exige(amorcees[0] && amorcees.slice(1).every((x) => !x),
                `l’ouverture de l’onglet Voix doit amorcer la première démo, et elle seule : ${JSON.stringify(amorcees)}`);
            const barre = await p.locator('[data-audio-seek="audio-nexity"]').boundingBox();
            await p.touchscreen.tap(barre.x + barre.width * 0.5, barre.y + barre.height / 2);
            await p.waitForFunction(() => document.getElementById('audio-nexity').currentTime > 0, null, { timeout: 10000 }).catch(() => { });
            await p.waitForTimeout(300);
            const r = await p.evaluate(() => {
                const a = document.getElementById('audio-nexity');
                return { t: a.currentTime, d: a.duration, largeur: parseFloat(document.getElementById('progress-audio-nexity').style.width) };
            });
            exige(Math.abs(r.t - r.d / 2) < r.d * 0.08 && Math.abs(r.largeur - 50) < 8,
                `toucher le milieu de la barre mène à ${r.t.toFixed(1)} s sur ${r.d.toFixed(1)} (barre à ${r.largeur} %)`);
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

        // LA LIGNE À VIGNETTE (index.html, univers.js : addVignette). Sa
        // promesse tient en trois points, vérifiés aux deux largeurs où elle
        // se dessine différemment : chaque spectacle et chaque film ont leur
        // vignette, qui dit la même année et le même état que la ligne ;
        // toutes les lignes d'une liste ont la même hauteur, et l'année y
        // tombe au même endroit ; le papier n'en voit rien.
        await verifie('le CV : une vignette par spectacle et par film, l’année et l’état dessus — l’année lisible sur toute vignette à l’écran, même tout en bas —, les lignes à la même hauteur et l’année au même endroit — au téléphone comme sur ordinateur ; ni image pour les formations, ni vignette sur papier', async () => {
            for (const largeur of [390, 1280]) {
                const c = await visiteur({ viewport: { width: largeur, height: 900 } });
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(base + '/', { waitUntil: 'load' });
                await p.evaluate(() => document.fonts.ready);
                await p.waitForTimeout(600);
                const cv = await p.evaluate(() => {
                    const lire = (e) => (e?.textContent || '').replace(/\s+/g, ' ').trim();
                    const lignes = [...document.querySelectorAll('#page_cv li.cv-item')];
                    const listes = [...document.querySelectorAll('#page_cv ul')]
                        .map((ul) => [...ul.querySelectorAll(':scope > li.cv-item')]).filter((l) => l.length);
                    return {
                        lignes: lignes.length,
                        vignettes: lignes.filter((li) => li.querySelector('.cv-vignette')).length,
                        // L'année de la vignette est celle de la ligne ; son
                        // bandeau, le badge sans son « en ».
                        faux: lignes.filter((li) => {
                            const v = li.querySelector('.cv-vignette');
                            if (!v) return false;
                            const etat = lire(v.querySelector('.cv-vignette-etat')).toLowerCase();
                            const badge = lire(li.querySelector('.cv-badge')).toLowerCase().replace(/^en /, '');
                            return lire(v.querySelector('.cv-vignette-annee')) !== lire(li.querySelector('.cv-year'))
                                || etat !== badge;
                        }).map((li) => li.dataset.cvShow),
                        // Une photo chargée, ou des initiales : jamais un cadre vide.
                        vides: lignes.filter((li) => {
                            const img = li.querySelector('.cv-vignette img');
                            return img ? !(img.complete && img.naturalWidth)
                                : !lire(li.querySelector('.cv-vignette-initiales'));
                        }).map((li) => li.dataset.cvShow),
                        // L'année et le badge ne se voient plus dans le texte…
                        visibles: lignes.filter((li) => ['.cv-year', '.cv-badge'].some((s) => {
                            const e = li.querySelector(s);
                            return e && e.getBoundingClientRect().width > 1;
                        })).map((li) => li.dataset.cvShow),
                        // … mais la vignette qui les montre est cachée aux
                        // lecteurs d'écran : c'est dans le texte qu'ils les lisent.
                        parlantes: lignes.filter((li) => li.querySelector('.cv-vignette')
                            && li.querySelector('.cv-vignette').getAttribute('aria-hidden') !== 'true').length,
                        // Sur grand écran, tout le texte tient dans la hauteur de
                        // la vignette : un titre qui repasserait à la ligne la
                        // dépasserait — et c'est ce qui faisait varier les
                        // hauteurs. Au téléphone, depuis l'expertise d'octobre
                        // 2026, le texte passe à la ligne plutôt que d'être
                        // coupé : la ligne grandit, et toute sa liste avec elle.
                        debordent: innerWidth < 768 ? [] : lignes.filter((li) => {
                            const v = li.querySelector('.cv-vignette'), t = li.querySelector('.cv-row-toggle .min-w-0');
                            return v && t && t.getBoundingClientRect().height > v.getBoundingClientRect().height + 0.5;
                        }).map((li) => li.dataset.cvShow),
                        // RIEN N'EST COUPÉ : ni « … » ni ligne rognée, sur le
                        // titre, le rôle, la compagnie ou le genre — « sur un
                        // CV, une information tronquée est une information
                        // perdue ».
                        coupes: lignes.flatMap((li) => ['.cv-title-row', '.cv-role', '.cv-subtitle', '.cv-genre'].map((s) => {
                            const e = li.querySelector(s);
                            if (!e || !e.getBoundingClientRect().width) return null;
                            return e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1
                                ? `${li.dataset.cvShow} (${s})` : null;
                        })).filter(Boolean),
                        ecarts: listes.map((l) => {
                            const haut = (li) => li.getBoundingClientRect().top;
                            const h = l.map((li) => li.getBoundingClientRect().height);
                            const y = l.map((li) => li.querySelector('.cv-vignette-annee').getBoundingClientRect().top - haut(li));
                            return { hauteur: Math.max(...h) - Math.min(...h), annee: Math.max(...y) - Math.min(...y) };
                        }),
                        formation: document.querySelectorAll('#page_cv .cv-formation > li').length,
                        imagesFormation: document.querySelectorAll('#page_cv .cv-formation img, #page_cv .cv-formation .cv-vignette').length
                    };
                });
                const ici = `à ${largeur} px`;
                exige(cv.lignes >= 2 && cv.vignettes === cv.lignes, `${ici} : ${cv.vignettes} vignette(s) pour ${cv.lignes} lignes`);
                exige(!cv.faux.length, `${ici} : la vignette ne dit pas l’année ou l’état de sa ligne — ${cv.faux.join(', ')}`);
                exige(!cv.vides.length, `${ici} : vignette sans photo ni initiales — ${cv.vides.join(', ')}`);
                exige(!cv.visibles.length, `${ici} : l’année ou le badge se voient encore dans le texte — ${cv.visibles.join(', ')}`);
                exige(!cv.parlantes, `${ici} : ${cv.parlantes} vignette(s) lue(s) par les lecteurs d’écran, en double du texte`);
                exige(!cv.debordent.length, `${ici} : le texte dépasse la hauteur de la vignette — ${cv.debordent.join(', ')}`);
                exige(!cv.coupes.length, `${ici} : du texte est coupé — ${cv.coupes.join(', ')}`);
                // Un pixel de jeu : la première ligne d'une liste n'a pas le
                // filet de séparation des suivantes.
                cv.ecarts.forEach((e, i) => {
                    exige(e.hauteur <= 1.5, `${ici} : les lignes de la liste ${i + 1} n’ont pas la même hauteur (écart ${e.hauteur.toFixed(1)} px)`);
                    exige(e.annee <= 1.5, `${ici} : l’année ne tombe pas au même endroit dans la liste ${i + 1} (écart ${e.annee.toFixed(1)} px)`);
                });
                exige(cv.formation >= 1, `${ici} : la liste des formations n’est plus marquée .cv-formation`);
                exige(!cv.imagesFormation, `${ici} : une formation porte une image`);

                // L'année se lit sur chaque vignette posée à l'écran, même
                // tout en bas, au repos. Elle montait depuis le bas du cadre en
                // arrivant — et un jour toutes les années sont restées dessous.
                // C'est une information : on la cherche là où elle se cachait.
                const sansAnnee = await p.evaluate(async () => {
                    document.documentElement.style.scrollBehavior = 'auto';
                    const manquent = [];
                    for (const li of document.querySelectorAll('#page_cv li.a-vignette')) {
                        const cadre = li.querySelector('.cv-vignette-cadre');
                        window.scrollTo(0, cadre.getBoundingClientRect().bottom + scrollY - innerHeight + 2);
                        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                        const a = li.querySelector('.cv-vignette-annee').getBoundingClientRect(), k = cadre.getBoundingClientRect();
                        const vu = Math.min(a.bottom, k.bottom) - Math.max(a.top, k.top);
                        if (vu < a.height - 0.5) manquent.push(`${li.dataset.cvShow} (${Math.max(0, vu).toFixed(0)} px sur ${a.height.toFixed(0)})`);
                    }
                    return manquent;
                });
                exige(!sansAnnee.length, `${ici} : l’année ne se voit pas sur la vignette au bas de l’écran — ${sansAnnee.join(', ')}`);
                exige(!erreurs.length, erreurs.join(' | '));

                // Sur papier : ni vignette ni genre, et l'année revient.
                await p.emulateMedia({ media: 'print' });
                const papier = await p.evaluate(() => ({
                    vues: [...document.querySelectorAll('#page_cv .cv-vignette, #page_cv .cv-genre')]
                        .filter((e) => getComputedStyle(e).display !== 'none').length,
                    // La frise voile les lignes à l'écran ; le papier ne défile pas.
                    voilees: [...document.querySelectorAll('#page_cv .cv-row-toggle')]
                        .filter((e) => +getComputedStyle(e).opacity < 0.99).length,
                    annees: [...document.querySelectorAll('#page_cv li.cv-item .cv-year')]
                        .filter((e) => e.getBoundingClientRect().width > 1).length
                }));
                exige(!papier.vues, `${papier.vues} vignette(s) ou ligne(s) de genre sur le CV imprimé`);
                exige(!papier.voilees, `${papier.voilees} ligne(s) voilée(s) sur le CV imprimé`);
                exige(papier.annees === cv.lignes, `sur papier, ${papier.annees} année(s) visibles pour ${cv.lignes} lignes`);
                await c.close();
            }
        });

        await verifie('sans JavaScript, le site reste lisible', async () => {
            const c = await visiteur({ javaScriptEnabled: false });
            const p = await c.newPage();
            await p.goto(base + '/', { waitUntil: 'load' });
            const etat = await p.evaluate(() => ({
                rideau: getComputedStyle(document.getElementById('intro-overlay')).display,
                cachees: [...document.querySelectorAll('section')]
                    .filter((s) => getComputedStyle(s).opacity !== '1').length,
                // La plume de l'aperçu, que le script pose après le
                // chargement : sans lui, le <noscript> la donne d'emblée.
                plume: getComputedStyle(document.querySelector('.bio-handwritten')).fontFamily
            }));
            exige(etat.rideau === 'none', 'le rideau d’ouverture couvre la page');
            exige(etat.cachees === 0, `${etat.cachees} section(s) restent invisibles`);
            exige(/^"?Caveat/.test(etat.plume), `l’aperçu de la lettre s’écrit sans Caveat (${etat.plume})`);
            await c.close();
        });

        const dossiers = fs.readdirSync(path.join(RACINE, 'spectacles'), { withFileTypes: true })
            .filter((e) => e.isDirectory()).map((e) => e.name);

        await verifie(`les ${dossiers.length} pages spectacle ont leur h1, leur <main> et des données structurées lisibles, chaque représentation avec son image`, async () => {
            const c = await visiteur();
            for (const slug of dossiers) {
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(`${base}/spectacles/${slug}/`, { waitUntil: 'load' });
                const etat = await p.evaluate(() => {
                    let jsonld = 0, illisibles = 0;
                    const sansImage = [];
                    // Tout objet du bloc, à toute profondeur (tableaux, @graph).
                    const parcourir = (o) => {
                        if (Array.isArray(o)) return o.forEach(parcourir);
                        if (!o || typeof o !== 'object') return;
                        if (o['@type'] === 'TheaterEvent' && !o.image) sansImage.push(o.startDate);
                        Object.values(o).forEach(parcourir);
                    };
                    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
                        jsonld++;
                        try { parcourir(JSON.parse(s.textContent)); } catch (e) { illisibles++; }
                    });
                    return {
                        h1: document.querySelectorAll('h1').length,
                        main: document.querySelectorAll('main').length,
                        jsonld, illisibles, sansImage
                    };
                });
                exige(etat.h1 === 1, `${slug} : ${etat.h1} titre(s) h1`);
                exige(etat.main === 1, `${slug} : ${etat.main} élément(s) <main>`);
                exige(etat.jsonld > 0 && !etat.illisibles, `${slug} : données structurées absentes ou illisibles`);
                exige(!etat.sansImage.length, `${slug} : représentation(s) sans image (${etat.sansImage.join(', ')})`);
                exige(!erreurs.length, `${slug} : ${erreurs.join(' | ')}`);
                await p.close();
            }
            await c.close();
        });

        // UN SEUL MOTEUR, UN SEUL MOUVEMENT. Une page /spectacles/ charge le
        // même univers.css que le panneau de l'accueil — mais c'est index.html
        // qui pose le vocabulaire du mouvement (--ease-*, --dur-*). Sans lui,
        // sur la page, toute transition qui le nommait était rejetée : les
        // lettres, les mots et les photos arrivaient d'un coup, sans flou ni
        // fondu, et rien ne le signalait. On compare donc, spectacle par
        // spectacle, ce qui fait l'effet — les transitions d'opacité, de
        // mouvement, de flou, et les animations — et ce que dit le haut de
        // page, entre le panneau ouvert à son adresse et la page.
        await verifie(`les ${dossiers.length} pages spectacle s’animent et s’ouvrent comme leur univers ouvert depuis le CV`, async () => {
            const c = await visiteur({ viewport: { width: 1280, height: 900 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            const releve = () => {
                const o = document.getElementById('show-universe');
                const ELEMENTS = ['.u-ch', '.u-wd', '.u-rw', '.u-reveal', '.u-fig', '.u-fig img', '.u-fig-media',
                    '.u-group .u-fig-media', '.u-cap span', '.u-quote', '.u-chapter', '.u-text', '.u-foot', '.u-meta',
                    '.u-hero-actions', '.u-scroll', '.u-author', '.u-synopsis', '.u-progress span',
                    '.u-hero-fond', '.u-fig-point', '.u-flou', '.u-of-photo', '.u-of-photo img', '.u-of-titre .u-title', '.u-of-invite',
                    '.u-pa-faisceau', '.u-pa-plein', '.u-lum', '.u-voile'];
                const out = {};
                for (const s of ELEMENTS) {
                    const e = o && o.querySelector(s);
                    if (!e) continue;
                    const cs = getComputedStyle(e);
                    const props = cs.transitionProperty.split(/,\s*/), durees = cs.transitionDuration.split(/,\s*/);
                    // La couleur, elle, n'est pas l'effet d'apparition qu'on
                    // vérifie.
                    const effet = props.map((pr, i) => [pr, durees[i % durees.length]])
                        .filter(([pr, d]) => /^(all|opacity|transform|filter|clip-path|translate|scale)$/.test(pr) && d !== '0s')
                        .map((x) => x.join(' ')).join(', ');
                    out[s] = `${effet || 'aucune transition'} · ${cs.animationName} ${cs.animationDuration}`;
                }
                const texte = (s) => (o && o.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim();
                out.haut = ['.u-eyebrow', '.u-title', '.u-author', '.u-meta'].map(texte).join(' | ');
                return out;
            };
            // LA MISE AU POINT ATTEND LA PHOTO NETTE (.est-nette) : tant
            // qu'elle n'est pas arrivée, la copie floue n'a pas d'animation.
            // La première photo floue est loin sous le haut de la page, et ne
            // se charge qu'à l'approche : on l'approche, on attend qu'elle
            // soit là, et l'on revient en haut — dans le panneau comme sur la
            // page, sans quoi on comparerait deux chargements.
            const nette = () => p.evaluate(async () => {
                const S = document.getElementById('show-universe');
                const fig = S && S.querySelector('.u-flou')?.closest('.u-fig');
                if (!fig) return;
                S.scrollTop = fig.offsetTop;
                for (let i = 0; i < 60 && !fig.classList.contains('est-nette'); i++) await new Promise((f) => setTimeout(f, 100));
                S.scrollTop = 0;
                await new Promise((f) => setTimeout(f, 150));
            });
            const ecarts = [];
            for (const slug of dossiers) {
                await p.goto(`${base}/#/univers/${slug}`, { waitUntil: 'load' });
                await p.waitForFunction(() => document.getElementById('show-universe')?.classList.contains('is-open'), null, { timeout: 8000 })
                    .catch(() => { throw new Error(`${slug} : l’univers ne s’ouvre pas à son adresse`); });
                // Une ligne à l'écran à l'arrivée (Cassandres, en tête du CV)
                // s'ouvre par le passage : son montage n'est posé qu'après.
                await p.waitForFunction(() => !document.documentElement.classList.contains('vt-univers'), null, { timeout: 8000 });
                await p.waitForTimeout(400);
                // Ouvert sans passage, le panneau se déplie depuis la ligne ;
                // la lumière et le titre détouré ne sont mesurés qu'à la fin
                // du dépliement (voir finDuDepliement, univers.js).
                await p.waitForFunction(() => !document.getElementById('show-universe').style.clipPath, null, { timeout: 3000 }).catch(() => { });
                await p.waitForTimeout(150);
                await nette();
                const panneau = await p.evaluate(releve);
                await p.goto(`${base}/spectacles/${slug}/`, { waitUntil: 'load' });
                await p.waitForTimeout(400);
                await nette();
                const page = await p.evaluate(releve);
                exige(page['.u-ch'] && !page['.u-ch'].startsWith('aucune'), `${slug} : les lettres du titre n’ont plus de transition sur la page`);
                for (const k of new Set([...Object.keys(panneau), ...Object.keys(page)])) {
                    if (panneau[k] !== page[k]) ecarts.push(`${slug} ${k} — panneau « ${panneau[k] ?? 'absent'} », page « ${page[k] ?? 'absent'} »`);
                }
            }
            exige(!ecarts.length, `${ecarts.length} écart(s), dont ${ecarts.slice(0, 2).join(' ; ')}`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        // ── LA RÉGIE : UN SEUL MOUVEMENT, DEUX PILOTES ──
        // Le navigateur récent fait avancer les scènes lui-même ; ailleurs,
        // regie.js écrit la progression et la même animation avance en
        // pause. Les deux doivent donner les mêmes images : on relève, aux
        // mêmes endroits du défilement, l'opacité et la transformation des
        // éléments qui bougent — natif, puis avec ?repli, qui force le
        // second pilote. Et le drapeau du repli, posé avant le premier rendu
        // dans l'en-tête des pages, doit suivre le même test que regie.js.
        await verifie('la régie : même détection partout, et le repli rejoue les images du navigateur', async () => {
            const tests = (texte) => [...texte.matchAll(/CSS\.supports\('([^']+)'\)/g)].map((m) => m[1]).sort().join(' & ');
            const regie = fs.readFileSync(path.join(RACINE, 'regie.js'), 'utf8');
            const accueil = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
            const fiche = fs.readFileSync(path.join(RACINE, 'spectacles', 'cleophene', 'index.html'), 'utf8');
            const attendu = tests(regie);
            exige(attendu.includes('animation-timeline: view()'), 'regie.js ne teste plus animation-timeline');
            const tete = (html) => html.slice(0, html.indexOf('</head>'));
            exige(tests(tete(accueil)) === attendu, `l’en-tête de l’accueil ne teste pas comme regie.js (${tests(tete(accueil))})`);
            exige(tests(tete(fiche)) === attendu, `l’en-tête des pages spectacle ne teste pas comme regie.js (${tests(tete(fiche))})`);
            exige(/<script src="regie\.js"><\/script>\s*<script src="univers-montage\.js">/.test(accueil), 'l’accueil ne charge pas regie.js avant le montage');

            const releve = async (repli) => {
                const c = await visiteur({ viewport: { width: 1280, height: 860 } });
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(`${base}/spectacles/cleophene/${repli ? '?repli' : ''}`, { waitUntil: 'load' });
                await p.waitForTimeout(1200);
                const mesures = await p.evaluate(async () => {
                    const S = document.getElementById('show-universe');
                    const dort = (ms) => new Promise((r) => setTimeout(r, ms));
                    const lire = (sel) => [...S.querySelectorAll(sel)].slice(0, 4).map((e) => {
                        const cs = getComputedStyle(e);
                        return [+cs.opacity, cs.transform];
                    });
                    const out = { classe: document.documentElement.className, points: [] };
                    for (const [scene, fractions, sels] of [
                        ['.u-ouverture', [0.2, 0.5, 0.62, 0.8, 0.95], ['.u-of-photo', '.u-of-titre .u-title', '.u-of-titre .u-hero-fond',
                            '.u-of-titre .u-eyebrow', '.u-of-titre .u-rideau', '.u-of-titre .u-rideau-texte',
                            '.u-of-titre .u-couche-auteur', '.u-of-titre .u-author', '.u-of-titre .u-meta',
                            '.u-of-titre .u-synopsis', '.u-of-titre .u-synopsis .u-lum',
                            '.u-of-titre .u-couche-actions', '.u-of-invite']],
                        ['.u-carton', [0.2, 0.5, 0.8, 0.97], ['.u-carton-texte', '.u-carton .u-lum', '.u-carton-noir']],
                        ['.u-poursuite', [0.1, 0.4, 0.62, 0.85], ['.u-pa-a', '.u-pa-b', '.u-pa-plein', '.u-pa-leg2']],
                    ]) {
                        const el = S.querySelector(scene);
                        if (!el) { out.points.push([scene, 'absente']); continue; }
                        for (const f of fractions) {
                            S.scrollTop = el.offsetTop + f * (el.offsetHeight - S.clientHeight);
                            await dort(250);
                            out.points.push([scene, f, sels.map((s) => [s, lire(s)])]);
                        }
                    }
                    return out;
                });
                await c.close();
                exige(!erreurs.length, erreurs.join(' | '));
                return mesures;
            };
            const natif = await releve(false);
            const repli = await releve(true);
            exige(!/regie-repli/.test(natif.classe), 'le navigateur de vérification n’a pas le pilote natif');
            exige(/regie-repli/.test(repli.classe), '?repli ne force pas le second pilote');
            const nombres = (t) => (t.match(/-?[\d.]+(e-?\d+)?/g) || []).map(Number);
            const ecarts = [];
            natif.points.forEach((pt, i) => {
                const autre = repli.points[i];
                if (pt[1] === 'absente') { ecarts.push(`${pt[0]} absente`); return; }
                pt[2].forEach(([sel, valeurs], j) => valeurs.forEach(([op, tf], k) => {
                    const [op2, tf2] = autre[2][j][1][k] || [];
                    if (Math.abs(op - op2) > 0.06) ecarts.push(`${pt[0]} à ${pt[1]} : ${sel} opacité ${op} / ${op2}`);
                    const a = nombres(tf), b = nombres(tf2 || '');
                    if (a.length !== b.length || a.some((v, n) => Math.abs(v - b[n]) > Math.max(2, Math.abs(v) * 0.06))) {
                        ecarts.push(`${pt[0]} à ${pt[1]} : ${sel} ${tf} / ${tf2}`);
                    }
                }));
            });
            exige(!ecarts.length, `${ecarts.length} écart(s) entre les deux pilotes, dont ${ecarts.slice(0, 2).join(' ; ')}`);
        });

        // ── CE QUE SUIT UNE ANIMATION AU DÉFILEMENT ──
        // view() suit la boîte de défilement la plus proche, et
        // `overflow: hidden` en fait une. Sous un cadre ainsi rogné,
        // l'animation suivait le cadre, qui ne défile jamais : l'année des
        // vignettes restait sous la photo, les citations posées sur les
        // photos ne s'écrivaient pas, les légendes restaient à mi-fondu — et
        // seulement dans les navigateurs récents, le repli, lui, jouait
        // juste. Aucune ne doit suivre autre chose que la page ou le
        // panneau de l'univers.
        await verifie('chaque animation menée par le défilement suit la page ou l’univers, jamais un cadre qui ne défile pas', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 844 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            const fautes = [];
            let menees = 0;
            // L'onglet Dates d'abord : de « / » à « /#page_dates », le
            // navigateur ne recharge pas la page, il suit l'ancre.
            for (const url of ['/#page_dates', '/', ...dossiers.map((d) => `/spectacles/${d}/`)]) {
                await p.goto(base + url, { waitUntil: 'load' });
                await p.waitForTimeout(500);
                const r = await p.evaluate(async () => {
                    const S = document.getElementById('show-universe');
                    const defileur = S && S.scrollHeight > S.clientHeight ? S : document.scrollingElement;
                    // Tout le montage passe à l'écran : chaque animation existe.
                    for (let y = 0; y <= defileur.scrollHeight; y += defileur.clientHeight) {
                        defileur.scrollTop = y;
                        await new Promise((r) => requestAnimationFrame(r));
                    }
                    const nom = (e) => e.nodeName.toLowerCase() + [...e.classList].slice(0, 2).map((k) => '.' + k).join('');
                    const liees = document.getAnimations().filter((a) => a.timeline && 'source' in a.timeline);
                    return {
                        n: liees.length,
                        fautes: [...new Set(liees.filter((a) => a.timeline.source !== document.scrollingElement && a.timeline.source !== S)
                            .map((a) => `${a.animationName} (${nom(a.effect.target)}${a.effect.pseudoElement || ''}) suit ${a.timeline.source ? nom(a.timeline.source) : 'rien'}`))]
                    };
                });
                menees += r.n;
                r.fautes.forEach((f) => fautes.push(`${url} ${f}`));
            }
            exige(menees > 100, `${menees} animation(s) menée(s) par le défilement en tout : le navigateur de vérification ne les mène plus ?`);
            exige(!fautes.length, `${fautes.length} animation(s) accrochée(s) ailleurs, dont ${fautes.slice(0, 3).join(' ; ')}`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        // LE TRAVELLING OUVRE LA PAGE, PUIS LE RÉCIT S'ÉCRIT. La première
        // chose qu'on voit, c'est la scène : des photos qui arrivent du fond,
        // et le titre, SEUL, qui avance jusqu'à sa place — la page entière
        // qui avançait faisait un grand rectangle. Le titre posé, la scène
        // se tient : le reste paraît sous le geste, et la lumière écrit le
        // synopsis ligne à ligne — tout arrivait d'un bloc, déjà écrit. Le
        // bouton ne vient, cliquable, qu'une fois le récit écrit. Puis le
        // carton du chapitre tient l'écran, dans sa propre scène, et finit
        // dans le noir si la salle est sombre, dans le papier si elle est
        // claire : un écran noir sur le parchemin de L'Homme moderne passait
        // pour une page cassée. La première photo s'allume — ou se révèle
        // dans le papier — dès qu'elle entre dans le quart inférieur de
        // l'écran.
        await verifie('les pages spectacle s’ouvrent sur le travelling, puis le récit s’écrit sous le geste ; le carton du chapitre tient l’écran, et le noir ne vient que dans une salle sombre', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 844 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            for (const [slug, attendue] of [['alabarre', 'sombre'], ['berenice', 'claire'], ['cleophene', 'sombre'], ['hommemoderne', 'claire']]) {
                await p.goto(`${base}/spectacles/${slug}/`, { waitUntil: 'load' });
                await p.waitForTimeout(700);
                const etat = await p.evaluate(async () => {
                    const S = document.getElementById('show-universe');
                    const dort = (ms) => new Promise((f) => setTimeout(f, ms));
                    const scene = S.querySelector('.u-ouverture');
                    const zone = scene && scene.querySelector('.u-of-titre');
                    const figs = S.querySelector('.u-figs');
                    const carton = S.querySelector('.u-carton');
                    const identite = (t) => t === 'none' || /^matrix(3d)?\((1, 0, 0, 1, 0, 0|1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)\)$/.test(t);
                    const op = (e) => (e ? +getComputedStyle(e).opacity : null);
                    const out = {
                        enTete: !!scene && !!zone && !!zone.querySelector('h1.u-title')
                            && !!(scene.compareDocumentPosition(figs) & Node.DOCUMENT_POSITION_FOLLOWING),
                        dansLaScene: !!scene.querySelector('.u-of-noir, .u-of-carton, .u-carton'),
                        // Le premier temps du montage, après l'affiche d'un film.
                        carton: !!carton && [...figs.children].find((e) => !e.classList.contains('u-affiche')) === carton,
                        salle: carton && carton.dataset.salle,
                        ecrans: carton ? +(carton.offsetHeight / S.clientHeight).toFixed(2) : 0
                    };
                    const titre = zone.querySelector('.u-title');
                    const syn = zone.querySelector('.u-synopsis');
                    const bouton = zone.querySelector('.u-couche-actions');
                    const reste = ['.u-hero-fond', '.u-eyebrow', '.u-couche-auteur', '.u-synopsis', '.u-couche-meta', '.u-couche-actions']
                        .map((sel) => zone.querySelector(sel)).filter(Boolean);
                    // Une ligne est écrite quand sa fenêtre de lumière est arrivée.
                    const ecrites = (el) => [...el.querySelectorAll('.u-lum')].map((l) => identite(getComputedStyle(l).transform));
                    const lire = () => {
                        const l = ecrites(syn);
                        return {
                            titre: op(titre),
                            face: identite(getComputedStyle(titre).transform),
                            // Le plus visible, et le moins visible, de ce qui accompagne le titre.
                            reste: Math.max(...reste.map(op)),
                            tout: Math.min(...reste.map(op)),
                            bouton: op(bouton),
                            clic: getComputedStyle(bouton).pointerEvents,
                            lignes: `${l.filter(Boolean).length}/${l.length}`
                        };
                    };
                    const aller = async (el, f) => {
                        S.scrollTop = el.offsetTop + (el.offsetHeight - S.clientHeight) * f;
                        await dort(300);
                    };
                    // Les plages que le montage a calculées pour cette scène.
                    const pose = parseFloat(getComputedStyle(scene).getPropertyValue('--of-titre'));
                    const de = +syn.dataset.de, a = +syn.dataset.a;
                    out.plages = { pose, de, a };
                    // LE RÉCIT NE ROGNE RIEN À CHAQUE IMAGE : le rideau et la
                    // trappe sont des déplacements sous des cadres fixes ;
                    // une coupe (clip-path) animée repeignait leurs couches à
                    // chaque image.
                    out.rogne = document.getAnimations()
                        .filter((an) => an.effect && an.effect.target && scene.contains(an.effect.target))
                        .filter((an) => an.effect.getKeyframes().some((k) => 'clipPath' in k))
                        .map((an) => an.effect.target.className.baseVal ?? an.effect.target.className);
                    // Le premier écran : le travelling, sans le titre.
                    await aller(scene, 0);
                    out.debut = lire();
                    out.debut.photo = Math.max(...[...scene.querySelectorAll('.u-of-photo')].map(op));
                    // En route : le titre, seul, pas encore à sa place.
                    await aller(scene, pose * 0.6);
                    out.milieu = lire();
                    // Posé — un pixel plus loin : le défilement s'arrondit au
                    // pixel, et le titre serait encore à un millième du bout.
                    // Rien d'autre encore.
                    await aller(scene, pose + 0.002);
                    out.pose = lire();
                    // En pleine écriture : des lignes écrites, d'autres non,
                    // et le bouton pas encore là.
                    await aller(scene, (de + a) / 2);
                    out.ecriture = lire();
                    // Au bout : le synopsis écrit, tout paru, le bouton qui répond.
                    await aller(scene, 1);
                    out.fin = lire();
                    // Le carton : l'écran entier, sa phrase écrite ; puis le noir,
                    // ou le papier.
                    if (carton) {
                        const texte = carton.querySelector('.u-carton-texte');
                        const noir = carton.querySelector('.u-carton-noir');
                        await aller(carton, 0.5);
                        const r = carton.querySelector('.u-carton-scene').getBoundingClientRect();
                        const l = ecrites(carton);
                        out.tenu = { ecran: Math.round(r.top) === 0 && Math.round(r.height) === S.clientHeight, ecrit: l.length > 0 && l.every(Boolean), texte: op(texte), noir: op(noir) };
                        await aller(carton, 1);
                        out.bout = { texte: op(texte), noir: op(noir) };
                    }
                    // La première photo : encore dans l'ombre — ou dans le papier —
                    // au bas de l'écran, allumée dès qu'elle entre dans son quart
                    // inférieur.
                    const fig = S.querySelector('.u-allumage');
                    if (fig) {
                        const bg = getComputedStyle(fig.querySelector('.u-voile')).backgroundColor;
                        const n = (bg.match(/[\d.]+/g) || []).map(Number);
                        const canaux = bg.startsWith('color(') ? n.slice(0, 3) : n.slice(0, 3).map((v) => v / 255);
                        out.voile = { salle: fig.dataset.salle, clair: canaux.reduce((x, y) => x + y, 0) / 3 > 0.5, bg };
                    }
                    const placer = async (f) => {
                        S.scrollTop += fig.getBoundingClientRect().top - S.clientHeight * f;
                        await dort(350);
                        return fig.classList.contains('est-allume');
                    };
                    out.allumage = fig ? [await placer(0.92), await placer(0.7)] : null;
                    return out;
                });
                const sombre = attendue === 'sombre';
                const [ecr, tot] = etat.ecriture.lignes.split('/').map(Number);
                exige(etat.enTete, `${slug} : la page ne s’ouvre pas sur le travelling, le titre au bout`);
                exige(!etat.rogne.length, `${slug} : une animation du récit fait encore varier clip-path (${etat.rogne.join(', ')})`);
                exige(!etat.dansLaScene, `${slug} : un carton ou un noir est resté dans le travelling`);
                exige(etat.debut.titre < 0.05 && etat.debut.reste < 0.05 && etat.debut.photo > 0.5,
                    `${slug} : au premier écran, le titre ou la page devance le travelling (${JSON.stringify(etat.debut)})`);
                exige(etat.milieu.titre > 0.5 && !etat.milieu.face && etat.milieu.reste < 0.05,
                    `${slug} : en plein travelling, le titre n’avance pas seul (${JSON.stringify(etat.milieu)})`);
                exige(etat.pose.titre === 1 && etat.pose.face && etat.pose.reste < 0.05,
                    `${slug} : le titre posé, le reste est déjà là — il arrive d’un bloc (${JSON.stringify(etat.pose)})`);
                exige(tot > 1 && ecr > 0 && ecr < tot && etat.ecriture.bouton < 0.05 && etat.ecriture.clic === 'none',
                    `${slug} : le synopsis ne s’écrit pas sous le geste, ou le bouton devance le récit (${JSON.stringify(etat.ecriture)} ; plages ${JSON.stringify(etat.plages)})`);
                exige(etat.fin.titre === 1 && etat.fin.face && etat.fin.tout === 1 && etat.fin.clic === 'auto' && etat.fin.lignes === `${tot}/${tot}`,
                    `${slug} : au bout de la scène, le récit n’est pas écrit ou le haut de la page n’a pas paru (${JSON.stringify(etat.fin)})`);
                exige(etat.carton && etat.ecrans >= 2, `${slug} : le carton du chapitre ne tient pas l’écran après le titre (${etat.ecrans} écran)`);
                exige(etat.salle === attendue && etat.voile && etat.voile.salle === attendue && etat.voile.clair === !sombre,
                    `${slug} : la salle devrait être ${attendue} (carton ${etat.salle}, photo ${JSON.stringify(etat.voile)})`);
                exige(etat.tenu && etat.tenu.ecran && etat.tenu.ecrit && etat.tenu.texte === 1 && (sombre ? etat.tenu.noir < 0.05 : etat.tenu.noir === null),
                    `${slug} : le carton ne tient pas l’écran, sa phrase écrite (${JSON.stringify(etat.tenu)})`);
                exige(sombre ? etat.bout.noir === 1 : (etat.bout.noir === null && etat.bout.texte < 0.05),
                    `${slug} : au bout du carton, ${sombre ? 'le noir n’est pas venu' : 'le carton ne s’est pas effacé dans le papier, ou un noir est venu'} (${JSON.stringify(etat.bout)})`);
                exige(etat.allumage && !etat.allumage[0] && etat.allumage[1],
                    `${slug} : la première photo ne s’allume pas à l’entrée du quart inférieur (${JSON.stringify(etat.allumage)})`);
            }
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        // ── CE QU'ON VOIT D'ABORD PART D'ABORD ──
        // La première photo du travelling est la seule image du premier
        // écran d'une page spectacle ; elle attendait derrière la première
        // photo du montage et ses dix copies floues, six à dix écrans plus
        // bas. Elle est désormais demandée d'avance (en-tête, hors mouvement
        // réduit), rien du montage ne part avant d'approcher, et elle paraît
        // en fondu une fois arrivée — sans jamais rester cachée. Dans le
        // panneau ouvert depuis le CV, les deux premières partent d'emblée,
        // sauf en mouvement réduit, où le travelling n'est pas montré.
        // L'affiche d'une vidéo YouTube est son WebP ; s'il manque, la
        // petite affiche prend le relais, la source retirée. Et la connexion
        // vers le lecteur ne s'ouvre qu'à l'appui, jamais au survol.
        await verifie('ce qu’on voit d’abord part d’abord : la photo du travelling demandée d’avance, rien du montage avant elle, allumée en fondu ; l’affiche d’une vidéo en WebP, qui retombe sur la petite ; le lecteur préparé à l’appui, pas au survol', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
            const p = await c.newPage();
            const erreurs = guette(p);
            const allumee = () => p.evaluate(async () => {
                const img = document.querySelector('#show-universe .u-of-photo img');
                for (let i = 0; i < 40 && !img.classList.contains('est-decodee'); i++) await new Promise((f) => setTimeout(f, 100));
                await new Promise((f) => setTimeout(f, 500));
                return img.classList.contains('est-decodee') && getComputedStyle(img).opacity === '1';
            });
            for (const slug of dossiers) {
                await p.goto(`${base}/spectacles/${slug}/`, { waitUntil: 'load' });
                const etat = await p.evaluate(() => {
                    const S = document.getElementById('show-universe');
                    const plans = [...S.querySelectorAll('.u-of-photo img')];
                    if (!plans.length) return null;
                    const pre = [...document.querySelectorAll('link[rel="preload"][as="image"]')];
                    return {
                        prechargee: pre.length === 1 && pre[0].getAttribute('imagesrcset') === plans[0].getAttribute('srcset')
                            && pre[0].getAttribute('imagesizes') === plans[0].getAttribute('sizes')
                            && pre[0].getAttribute('fetchpriority') === 'high' && pre[0].media === '(prefers-reduced-motion: no-preference)',
                        partent: [...S.querySelectorAll('.u-figs img')].filter((i) => i.loading !== 'lazy').map((i) => i.getAttribute('src')),
                        fond: S.querySelector('.u-hero-fond img')?.getAttribute('fetchpriority')
                    };
                });
                if (!etat) continue;
                exige(etat.prechargee, `${slug} : la première photo du travelling n’est pas demandée d’avance, telle que l’image la demandera`);
                exige(!etat.partent.length, `${slug} : une image du montage part d’emblée, six écrans plus bas (${etat.partent[0]})`);
                exige(etat.fond === 'low', `${slug} : le fond du titre passe devant la photo du travelling`);
                exige(await allumee(), `${slug} : la première photo du travelling reste cachée`);
            }

            // Le fondu de la photo du travelling part d'un centième, pas de
            // zéro : à opacité nulle, Chrome ne la compterait comme plus
            // grand affichage qu'à la fin du fondu (voir .u-of-photo img dans
            // univers.css).
            await p.goto(`${base}/spectacles/cleophene/`, { waitUntil: 'load' });
            const depart = await p.evaluate(() => {
                const img = document.querySelector('#show-universe .u-of-photo img');
                const decodee = img.classList.contains('est-decodee');
                img.style.transition = 'none';
                img.classList.remove('est-decodee');
                const o = getComputedStyle(img).opacity;
                img.classList.toggle('est-decodee', decodee);
                img.style.transition = '';
                return o;
            });
            exige(depart === '0.01', `la photo du travelling part d’une opacité ${depart}, et non d’un centième`);

            // L'affiche de la vidéo : le WebP d'abord ; ici, rien ne sort
            // vers YouTube, le WebP échoue donc — la petite affiche le remplace.
            const affiche = await p.evaluate(async () => {
                const img = document.querySelector('.u-video-play img');
                const source = img.parentElement.querySelector('source[type="image/webp"]');
                const out = { webp: !!source && /\/vi_webp\/[\w-]{11}\/maxresdefault\.webp$/.test(source.srcset) };
                img.scrollIntoView({ block: 'center' });
                for (let i = 0; i < 30 && img.dataset.uPoster; i++) await new Promise((f) => setTimeout(f, 100));
                out.repli = !img.parentElement.querySelector('source') && /\/hqdefault\.jpg$/.test(img.src);
                const liens = () => document.querySelectorAll('link[rel="preconnect"][href^="https://www.youtube-nocookie.com"]').length;
                const bouton = document.querySelector('.u-video-play');
                bouton.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
                bouton.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
                out.survol = liens();
                bouton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
                out.appui = liens();
                return out;
            });
            exige(affiche.webp, 'l’affiche YouTube n’est plus servie en WebP');
            exige(affiche.repli, 'le WebP manquant, la petite affiche ne prend pas le relais');
            exige(affiche.survol === 0 && affiche.appui === 1, `la connexion au lecteur s’ouvre au survol, ou pas à l’appui (${JSON.stringify(affiche)})`);

            // Le panneau ouvert depuis le CV : les deux premières photos
            // partent d'emblée, la première avant tout — sauf en mouvement
            // réduit.
            const plansDuPanneau = (q) => q.evaluate(() => [...document.querySelectorAll('#show-universe .u-of-photo img')]
                .map((i) => `${i.getAttribute('loading') || 'eager'}/${i.getAttribute('fetchpriority') || '-'}`).join(' '));
            await p.goto(`${base}/#/univers/cleophene`, { waitUntil: 'load' });
            await p.waitForFunction(() => document.getElementById('show-universe')?.classList.contains('is-open'), null, { timeout: 8000 });
            const vus = await plansDuPanneau(p);
            exige(vus === 'eager/high eager/- lazy/- lazy/-', `panneau : les premières photos du travelling ne partent pas d’emblée (${vus})`);
            exige(await allumee(), 'panneau : la première photo du travelling reste cachée');
            const r = await visiteur({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
            const pr = await r.newPage();
            await pr.goto(`${base}/#/univers/cleophene`, { waitUntil: 'load' });
            await pr.waitForFunction(() => document.getElementById('show-universe')?.classList.contains('is-open'), null, { timeout: 8000 });
            const reduits = await plansDuPanneau(pr);
            exige(reduits === 'lazy/- lazy/- lazy/- lazy/-', `panneau, mouvement réduit : le travelling, qui n’est pas montré, part quand même (${reduits})`);

            // Viser une ligne du CV prépare ce que le passage montrera
            // d'abord (prechaufferCouverture) : la première photo du
            // travelling — pas la couverture, que ce passage ne montre pas
            // et qui passait devant elle. En mouvement réduit, où la
            // couverture ouvre la page, la couverture.
            const viser = async (ctx) => {
                const q = await ctx.newPage();
                const parties = [];
                q.on('request', (x) => {
                    const m = /\/ressources\/images\/univers\/cleophene\/(\d+)-(?:640|1280)\.webp$/.exec(x.url());
                    if (m) parties.push(m[1]);
                });
                await q.goto(`${base}/?direct`, { waitUntil: 'load' });
                const attendu = await q.evaluate(() => {
                    const uni = Object.values(SHOW_UNIVERSES).find((u) => u.slug === 'cleophene');
                    const li = [...document.querySelectorAll('.cv-item.cv-has-universe')].find((l) => /Cléophène/.test(l.textContent));
                    li.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
                    return {
                        plan: String(UniversMontage.photosOuverture(uni)[0]),
                        couverture: UniversMontage.couverture(uni).src.replace(/^.*\/|-240\.webp$/g, '')
                    };
                });
                await q.waitForTimeout(1500);
                await q.close();
                return { parties, ...attendu };
            };
            const vise = await viser(c);
            exige(vise.parties.includes(vise.plan) && !vise.parties.includes(vise.couverture),
                `viser Cléophène prépare ${vise.parties.join(', ') || 'rien'} — la photo ${vise.plan} du travelling attendue, pas la couverture ${vise.couverture}`);
            const viseReduit = await viser(r);
            exige(viseReduit.parties.includes(viseReduit.couverture) && !viseReduit.parties.includes(viseReduit.plan),
                `mouvement réduit : viser Cléophène prépare ${viseReduit.parties.join(', ') || 'rien'} — la couverture ${viseReduit.couverture} attendue`);
            await r.close();
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('en mouvement réduit, chaque scène a un état fixe qui a du sens', async () => {
            const c = await visiteur({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce' });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(`${base}/spectacles/cleophene/`, { waitUntil: 'load' });
            await p.waitForTimeout(1000);
            const etat = await p.evaluate(() => {
                const S = document.getElementById('show-universe');
                const h = S.clientHeight;
                const cs = (sel) => { const e = S.querySelector(sel); return e ? getComputedStyle(e) : null; };
                return {
                    ouverture: S.querySelector('.u-ouverture')?.offsetHeight / h,
                    plans: cs('.u-of-plans')?.display,
                    titre: ['.u-of-titre .u-title', '.u-of-titre .u-hero-fond', '.u-of-titre .u-eyebrow', '.u-of-titre .u-rideau', '.u-of-titre .u-rideau-texte',
                        '.u-of-titre .u-couche-auteur', '.u-of-titre .u-author', '.u-of-titre .u-meta', '.u-of-titre .u-synopsis', '.u-of-titre .u-couche-actions']
                        .every((sel) => cs(sel) && +cs(sel).opacity === 1 && cs(sel).transform === 'none' && cs(sel).clipPath === 'none'),
                    carton: S.querySelector('.u-carton')?.offsetHeight / h,
                    cartonTexte: cs('.u-carton-texte') && +cs('.u-carton-texte').opacity === 1 && cs('.u-carton-texte').transform === 'none',
                    noir: cs('.u-carton-noir')?.display,
                    faisceaux: cs('.u-pa-faisceau')?.display,
                    plein: cs('.u-pa-plein') && +cs('.u-pa-plein').opacity,
                    poursuite: S.querySelector('.u-poursuite')?.offsetHeight / h,
                    lumieres: S.querySelectorAll('.u-lum').length,
                    voile: cs('.u-voile')?.display,
                    animees: [...S.querySelectorAll('.rg-k')].filter((e) => getComputedStyle(e).animationName !== 'none').length,
                    mots: [...S.querySelectorAll('.u-quote .u-rw')].filter((e) => getComputedStyle(e).opacity !== '1').length
                };
            });
            exige(etat.ouverture < 1.2, `l’ouverture reste une scène tenue (${etat.ouverture?.toFixed(2)} écran)`);
            exige(etat.plans === 'none' && etat.titre, 'l’ouverture ne se réduit pas au titre, posé à la face');
            exige(etat.carton < 1.2 && etat.cartonTexte && etat.noir === 'none', `le carton du chapitre reste une scène tenue, ou finit dans le noir (${etat.carton?.toFixed(2)} écran)`);
            exige(etat.poursuite < 1.2 && etat.faisceaux === 'none' && etat.plein === 1, 'la poursuite ne montre pas sa photo en plein feux');
            exige(etat.voile === 'none', 'la première photo attend un allumage qui ne viendra pas');
            exige(!etat.lumieres && !etat.mots, 'le texte attend une lumière qui ne viendra pas');
            exige(!etat.animees, `${etat.animees} élément(s) encore animé(s) au défilement`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();

            // LE TITRE POSÉ TIENT DANS SA SCÈNE, qui rogne : sous son
            // confinement de taille, elle retombait sur ses 60svh et coupait
            // le synopsis, le rôle et « Accéder aux dates » — le Tab menait à
            // un bouton invisible. « À la barre », au synopsis le plus long,
            // au téléphone ; en mouvement réduit et sans JavaScript.
            for (const [mode, options] of [['mouvement réduit', { reducedMotion: 'reduce' }], ['sans JavaScript', { javaScriptEnabled: false }]]) {
                const t = await visiteur({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...options });
                const q = await t.newPage();
                await q.goto(`${base}/spectacles/alabarre/`, { waitUntil: 'load' });
                await q.waitForTimeout(600);
                const coupes = await q.evaluate(() => {
                    const scene = document.querySelector('.u-of-scene')?.getBoundingClientRect();
                    if (!scene) return ['pas de scène d’ouverture'];
                    return [...document.querySelectorAll('.u-of-titre .u-synopsis, .u-of-titre .u-meta, .u-of-titre .u-hero-actions')]
                        .map((e) => [e.className.split(' ')[0], e.getBoundingClientRect()])
                        .filter(([, r]) => r.height && (r.bottom > scene.bottom + 1 || r.top < scene.top - 1))
                        .map(([nom, r]) => `${nom} (${Math.round(r.bottom - scene.bottom)} px)`);
                });
                exige(!coupes.length, `${mode}, « À la barre » au téléphone : la scène coupe ${coupes.join(', ')}`);
                await t.close();
            }
        });

        await verifie('les défauts réparés tiennent : verrou, onglets, « Passer », touches, zoom de l’avatar, phrase sur un groupe', async () => {
            // Le verrou est posé sur <html>, la boîte qui défile, et la place
            // de la barre de défilement reste réservée.
            const c = await visiteur({ viewport: { width: 1280, height: 860 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(600);
            const verrou = await p.evaluate(() => {
                const avant = getComputedStyle(document.documentElement);
                document.body.classList.add('modal-open');
                const pendant = getComputedStyle(document.documentElement).overflowY;
                document.body.classList.remove('modal-open');
                return { gouttiere: avant.scrollbarGutter, pendant };
            });
            exige(verrou.gouttiere === 'stable', 'la place de la barre de défilement n’est plus réservée');
            exige(verrou.pendant === 'hidden', 'une fenêtre ouverte ne bloque pas le défilement de la page');
            // L'onglet change, la pastille rejoint l'onglet choisi.
            await p.click('#tab-page_dates');
            // On attend que le passage ait posé la page et que la pastille soit
            // arrivée, plutôt qu'un délai fixe. Le clic rend la main plus tôt
            // depuis le chantier de fluidité, et 900 ms après lui ne suffisaient
            // plus sur la machine lente des demandes de fusion : la page s'y
            // pose vers 1,5 s après le geste, comme avant le chantier. Au-delà
            // de cinq secondes, c'est un vrai défaut, et les exigences
            // ci-dessous disent lequel.
            await p.waitForFunction(() => {
                const t = document.getElementById('tab-page_dates').getBoundingClientRect();
                const pa = document.querySelector('.onglet-pastille').getBoundingClientRect();
                return document.querySelector('.page.active')?.id === 'page_dates'
                    && Math.abs(t.left - pa.left) + Math.abs(t.width - pa.width) < 2;
            }, null, { timeout: 5000 }).catch(() => { /* voir les exigences */ });
            const onglet = await p.evaluate(() => {
                const t = document.getElementById('tab-page_dates').getBoundingClientRect();
                const pa = document.querySelector('.onglet-pastille').getBoundingClientRect();
                const pastille = document.querySelector('.onglet-pastille');
                return {
                    page: document.querySelector('.page.active')?.id,
                    ecart: Math.abs(t.left - pa.left) + Math.abs(t.width - pa.width),
                    // De quoi comprendre un écart vu ailleurs qu'ici.
                    detail: `onglet ${t.left.toFixed(1)} + ${t.width.toFixed(1)}, pastille ${pa.left.toFixed(1)} + ${pa.width.toFixed(1)}`
                        + ` (--x ${pastille.style.getPropertyValue('--x')}, --w ${pastille.style.getPropertyValue('--w')}, ${pastille.className}),`
                        + ` polices ${document.fonts.status}, barre « ${document.getElementById('nav-barre')?.className || ''} », défilement ${Math.round(scrollY)}`
                        + `, glissement ${pastille.getAnimations().map((a) => `${a.transitionProperty || a.animationName} ${a.playState} ${Math.round(a.currentTime)} ms`).join(' / ') || 'fini'}`
                        + `, horloge ${Math.round(document.timeline.currentTime)} ms, page ${document.visibilityState}, <html> « ${document.documentElement.className} »`
                };
            });
            exige(onglet.page === 'page_dates', 'le changement d’onglet ne pose pas la page');
            exige(onglet.ecart < 2, `la pastille n’a pas rejoint l’onglet (${onglet.ecart.toFixed(1)} px d’écart : ${onglet.detail})`);
            // Le sens du passage est une classe : écrit sur <html>, il
            // recalculait tout le document avant chaque changement d'onglet.
            exige(!(await p.evaluate(() => document.documentElement.style.getPropertyValue('--onglet-dx'))),
                'le sens du passage d’onglet est encore écrit en ligne sur <html> (--onglet-dx)');
            // Le fragment d'une couche refermée ramène la page déjà affichée :
            // rien ne bouge (le recadrage au seuil de la barre, sur un
            // téléphone lent, tombait après la remise en place de l'univers).
            await p.click('#tab-page_cv');
            await p.waitForTimeout(900);
            const garde = await p.evaluate(() => new Promise((ok) => {
                document.documentElement.style.scrollBehavior = 'auto';
                scrollTo(0, 1500);
                const y = scrollY;
                history.replaceState(null, '', '#page_cv');
                dispatchEvent(new HashChangeEvent('hashchange'));
                setTimeout(() => { document.documentElement.style.scrollBehavior = ''; ok({ y, apres: scrollY }); }, 600);
            }));
            exige(garde.y > 1000 && Math.abs(garde.apres - garde.y) <= 1, `le retour d’un fragment vers l’onglet déjà affiché déplace la page (${garde.y} → ${garde.apres} px)`);
            // Le thème bascule sans rien faire transitionner, et la classe qui
            // l'empêche n'est posée que dans le rappel du passage : posée
            // avant, elle recalculait le document dans l'image de l'ancien
            // état. Retirée ensuite, au repos.
            await p.evaluate(() => scrollTo(0, 0));
            const theme = await p.evaluate(() => new Promise((ok) => {
                const html = document.documentElement;
                const origine = document.startViewTransition;
                const depart = html.dataset.theme;
                let enPassage = false, avant = null;
                const lancees = [];
                addEventListener('transitionrun', (e) => { if (enPassage) lancees.push(e.propertyName); }, true);
                document.startViewTransition = function (rappel) {
                    document.startViewTransition = origine;
                    avant = html.classList.contains('vt-theme');
                    const t = origine.call(document, () => { enPassage = true; rappel(); });
                    t.finished.finally(() => {
                        enPassage = false;
                        setTimeout(() => ok({ avant, lancees, reste: html.classList.contains('vt-theme'), depart, theme: html.dataset.theme }), 900);
                    });
                    return t;
                };
                document.querySelector('[data-theme-toggle]').click();
            }));
            exige(theme.theme && theme.theme !== theme.depart, `le thème n’a pas basculé (${theme.depart} → ${theme.theme})`);
            exige(theme.avant === false, 'vt-theme est posée avant le passage du thème : le document entier se recalcule pour l’image de l’ancien état');
            exige(!theme.lancees.length, `une bascule de thème lance des transitions : ${theme.lancees.join(', ')}`);
            exige(!theme.reste, 'vt-theme reste posée après le passage du thème');
            exige(fs.readFileSync(path.join(RACINE, 'styles.css'), 'utf8').includes('group-hover\\:scale-103'),
                'le zoom de l’avatar (scale-103) n’existe pas dans styles.css');
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();

            // « Passer » répond avant l'arrivée d'intro.js — retardé ici de
            // trois secondes, comme sur une connexion qui traîne. (Perdu en
            // route, il serait remplacé par le garde de fin de chargement.)
            const c2 = await visiteur();
            await c2.route(/\/(intro|mask-points)\.js$/, async (r) => {
                await new Promise((ok) => setTimeout(ok, 3000));
                await r.continue().catch(() => { });
            });
            const p2 = await c2.newPage();
            await p2.goto(base + '/?intro=1', { waitUntil: 'domcontentloaded' });
            exige(await rideauBaisse(p2), 'le rideau n’est pas baissé en attendant intro.js');
            await p2.click('#intro-skip', { timeout: 2000 });
            const passe = await p2.evaluate(() => ({ rideau: document.getElementById('intro-overlay').hidden, verrou: document.body.classList.contains('modal-open') }));
            exige(passe.rideau && !passe.verrou, '« Passer » ne répond pas tant qu’intro.js n’est pas là');
            await c2.close();

            // Maj seule ne lève pas le rideau ; Échap, si.
            const c3 = await visiteur();
            const p3 = await c3.newPage();
            await p3.goto(base + '/?intro=1', { waitUntil: 'load' });
            await p3.waitForFunction(() => window.__introPret === true, null, { timeout: 8000 });
            await p3.keyboard.press('Shift');
            await p3.waitForTimeout(300);
            exige(await rideauBaisse(p3), 'la touche Maj lève le rideau');
            await p3.keyboard.press('Escape');
            await p3.waitForFunction(() => document.getElementById('intro-overlay').hidden, null, { timeout: 4000 })
                .catch(() => { throw new Error('Échap ne lève pas le rideau'); });
            exige(!(await p3.evaluate(() => document.body.classList.contains('modal-open'))), 'le verrou reste posé après l’ouverture');
            await c3.close();

            // « Jusqu'où serez-vous semblables ? » : la phrase posée sur un
            // groupe de photos est rendue.
            const cleo = fs.readFileSync(path.join(RACINE, 'spectacles', 'cleophene', 'index.html'), 'utf8');
            exige(/class="u-group[^"]*"[\s\S]*?class="u-over[\s\S]*?semblables/.test(cleo), 'la phrase posée sur un groupe de photos n’est pas rendue');
        });

        // ── LA FENÊTRE D'ABORD, LA PAGE ENSUITE ──
        // Le verrou et l'inertie de la page suivent l'ouverture d'une image
        // (voir isolerCouche et openModal) ; le focus, lui, entre tout de
        // suite. Refermée, la fenêtre rend tout ; rouverte pendant son fondu
        // de sortie, elle ne doit être ni cachée par lui ni laisser la page
        // vivante dessous.
        await verifie('la fenêtre d’agenda : le focus y entre tout de suite, la page devient inerte et se fige une image après, tout revient à la fermeture — et la rouvrir aussitôt ne la cache pas', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/#page_dates', { waitUntil: 'load' });
            await p.waitForTimeout(800);
            // Une date à venir, quelle que soit la saison du dépôt.
            await p.evaluate(() => {
                const d = new Date(Date.now() + 20 * 86400000);
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                SHOW_DATA.upcoming = [{
                    type: 'single', title: 'Bérénice', location: 'Scène de vérification (76)', city: 'Rouen',
                    dateLabel: iso, icsDate: iso, time: '20h00', bookingUrl: '', isSchool: false
                }];
                datesMisesAJour();
            });
            const bouton = p.locator('#page_dates .dl-agenda').first();
            await bouton.scrollIntoViewIfNeeded();
            await p.waitForTimeout(300);
            const etat = () => p.evaluate(() => ({
                dedans: !!document.activeElement?.closest('#calendar-modal'),
                surLeBouton: !!document.activeElement?.classList.contains('dl-agenda'),
                inertes: [...document.body.children].filter((e) => e.inert).length,
                fige: getComputedStyle(document.documentElement).overflowY === 'hidden',
                cachee: document.getElementById('calendar-modal').hidden
            }));
            await bouton.tap();
            const aussitot = await etat();
            exige(aussitot.dedans, 'le focus n’entre pas dans la fenêtre au geste');
            await p.waitForTimeout(400);
            const ouverte = await etat();
            exige(ouverte.dedans && ouverte.inertes > 0 && ouverte.fige && !ouverte.cachee, `fenêtre ouverte : ${JSON.stringify(ouverte)}`);
            await p.keyboard.press('Escape');
            await p.waitForTimeout(600);
            const fermee = await etat();
            exige(fermee.surLeBouton && !fermee.inertes && !fermee.fige && fermee.cachee, `fenêtre refermée : ${JSON.stringify(fermee)}`);
            // Rouverte pendant le fondu de sortie.
            await bouton.tap();
            await p.waitForTimeout(400);
            await p.keyboard.press('Escape');
            await bouton.tap();
            await p.waitForTimeout(900);
            const rouverte = await etat();
            exige(!rouverte.cachee && rouverte.dedans && rouverte.inertes > 0 && rouverte.fige, `fenêtre rouverte aussitôt : ${JSON.stringify(rouverte)}`);
            await p.keyboard.press('Escape');
            await p.waitForTimeout(600);
            const finale = await etat();
            exige(!finale.inertes && !finale.fige && finale.cachee, `fenêtre refermée pour de bon : ${JSON.stringify(finale)}`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        // ── LA FEUILLE D'AGENDA, AU TÉLÉPHONE ──
        // Sous 768 px, la fenêtre d'agenda est une feuille posée au bas de
        // l'écran, au-dessus de la barre d'onglets, qu'on referme en la
        // tirant vers le bas par sa poignée (de vrais touchers : la prise ne
        // doit pas défiler, sans quoi le navigateur coupe le suivi). Un petit
        // glissement la rend à sa place ; un lancer bref la renvoie, même
        // court. « Partager cette date » envoie le texte de la date et le lien
        // de la page du spectacle, ou les copie sans partage du navigateur.
        // En mouvement réduit, elle paraît sans glisser ; sur ordinateur, la
        // fenêtre reste au centre, sans poignée. La date fictive, un jeudi
        // 12 novembre lointain, ne dépend pas de la saison.
        await verifie('la fenêtre d’agenda au téléphone : une feuille collée en bas, au-dessus de la barre d’onglets, qu’on referme en la tirant vers le bas — un petit glissement la rend, un lancer la renvoie ; « Partager cette date » partage, ou copie ; sans glissement en mouvement réduit, et au centre sur ordinateur', async () => {
            const preparer = async (options) => {
                const c = await visiteur(Object.assign({ permissions: ['clipboard-read', 'clipboard-write'] }, options));
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(base + '/#page_dates', { waitUntil: 'load' });
                await p.waitForTimeout(800);
                await p.evaluate(() => {
                    SHOW_DATA.upcoming = [{
                        type: 'single', title: 'Bérénice', location: 'Le Forum, Falaise (14)', city: 'Falaise',
                        dateLabel: '12 nov. 2099', icsDate: '2099-11-12', time: '20h00', bookingUrl: '', isSchool: false
                    }];
                    datesMisesAJour();
                });
                const bouton = p.locator('#page_dates .dl-agenda').first();
                await bouton.scrollIntoViewIfNeeded();
                await p.waitForTimeout(300);
                return { c, p, erreurs, bouton };
            };
            const lire = (p) => p.evaluate(() => {
                const m = document.getElementById('calendar-modal');
                const k = document.getElementById('calendar-modal-card');
                const r = k.getBoundingClientRect();
                return {
                    cachee: m.hidden, haut: r.top, bas: r.bottom, gauche: r.left, droite: r.right,
                    vh: innerHeight, vw: innerWidth,
                    surLeBouton: !!document.activeElement?.classList.contains('dl-agenda'),
                    inertes: [...document.body.children].filter((e) => e.inert).length,
                    fige: getComputedStyle(document.documentElement).overflowY === 'hidden'
                };
            });

            // ── Au téléphone ──
            const { c, p, erreurs, bouton } = await preparer({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
            await bouton.tap();
            await p.waitForTimeout(600);
            const feuille = await p.evaluate(() => {
                const m = document.getElementById('calendar-modal');
                const k = document.getElementById('calendar-modal-card');
                const s = getComputedStyle(k);
                const poignee = k.querySelector('.cal-poignee');
                const croix = k.querySelector('.cal-fermer').getBoundingClientRect();
                const partage = document.getElementById('cal-option-partager');
                // Ce qui est au-dessus, là où est la barre d'onglets : la
                // page sous la feuille est inerte, et un élément inerte
                // échappe au test de position — on la rend vivante le temps
                // de regarder.
                const barre = document.getElementById('nav-barre').getBoundingClientRect();
                const inertes = [...document.body.children].filter((e) => e.inert);
                inertes.forEach((e) => { e.inert = false; });
                const dessus = document.elementFromPoint(barre.left + barre.width / 2, barre.top + barre.height / 2);
                inertes.forEach((e) => { e.inert = true; });
                return {
                    dialogue: m.getAttribute('role') === 'dialog' && m.getAttribute('aria-modal') === 'true'
                        && !!document.getElementById(m.getAttribute('aria-labelledby'))?.textContent.trim(),
                    coins: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomLeftRadius, s.borderBottomRightRadius].map(parseFloat),
                    poignee: !!poignee && poignee.getBoundingClientRect().height > 0,
                    prise: [...k.querySelectorAll('[data-feuille-prise]')].map((x) => getComputedStyle(x).touchAction),
                    croix: [croix.width, croix.height],
                    auDessus: !!dessus && k.contains(dessus),
                    partage: !!partage && partage.getBoundingClientRect().height >= 44 && /Partager cette date/.test(partage.textContent),
                    dedans: !!document.activeElement?.closest('#calendar-modal')
                };
            });
            const ouverte = await lire(p);
            exige(feuille.dialogue && feuille.dedans, `la feuille n’est plus une fenêtre accessible (rôle, nom, focus) : ${JSON.stringify(feuille)}`);
            exige(!ouverte.cachee && Math.abs(ouverte.bas - ouverte.vh) <= 1 && ouverte.gauche <= 1 && Math.abs(ouverte.droite - ouverte.vw) <= 1,
                `la feuille n’est pas posée au bas de l’écran, d’un bord à l’autre : ${JSON.stringify(ouverte)}`);
            exige(feuille.coins[0] >= 12 && feuille.coins[1] >= 12 && !feuille.coins[2] && !feuille.coins[3], `les coins de la feuille : ${feuille.coins.join(', ')}`);
            exige(feuille.poignee && feuille.prise.length >= 2 && feuille.prise.every((x) => x === 'none'),
                `la poignée manque, ou la prise défile au lieu de suivre le doigt : ${JSON.stringify(feuille.prise)}`);
            exige(feuille.croix[0] >= 44 && feuille.croix[1] >= 44, `la croix fait ${feuille.croix.join(' × ')} px au doigt (44 au moins)`);
            exige(feuille.auDessus, 'la barre d’onglets passe au-dessus de la feuille');
            exige(feuille.partage, '« Partager cette date » manque à la feuille, ou fait moins de 44 px');

            // De vrais touchers sur la poignée.
            const cdp = await c.newCDPSession(p);
            const toucher = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
            const prise = await p.evaluate(() => {
                const r = document.querySelector('#calendar-modal .cal-poignee').getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            });
            const glisser = async (pas, ecart, attente) => {
                await toucher('touchStart', prise.x, prise.y);
                for (let i = 1; i <= pas; i++) {
                    await toucher('touchMove', prise.x, prise.y + i * ecart);
                    await p.waitForTimeout(attente);
                }
            };
            // Un petit glissement, lent : la feuille suit, puis revient.
            await glisser(4, 10, 40);
            const suivie = await lire(p);
            await toucher('touchEnd');
            await p.waitForTimeout(600);
            const rendue = await lire(p);
            exige(suivie.bas > suivie.vh + 30, `la feuille ne suit pas le doigt (${Math.round(suivie.bas - suivie.vh)} px pour 40)`);
            exige(!rendue.cachee && Math.abs(rendue.bas - rendue.vh) <= 1, `un petit glissement ne rend pas la feuille à sa place : ${JSON.stringify(rendue)}`);
            // Tirée loin : elle se referme, et tout revient comme à la croix.
            await glisser(16, 20, 20);
            await toucher('touchEnd');
            await p.waitForTimeout(700);
            const tiree = await lire(p);
            exige(tiree.cachee && tiree.surLeBouton && !tiree.inertes && !tiree.fige,
                `tirée vers le bas, la feuille ne se referme pas, ou ne rend pas la page : ${JSON.stringify(tiree)}`);
            // Un lancer bref (60 px en une quinzaine de millisecondes) : en
            // dessous du seuil de distance, c'est la vitesse qui la renvoie.
            await bouton.tap();
            await p.waitForTimeout(600);
            await p.evaluate(() => {
                const poignee = document.querySelector('#calendar-modal .cal-poignee');
                const r = poignee.getBoundingClientRect();
                const x = r.left + r.width / 2, y = r.top + r.height / 2;
                const patienter = (ms) => { const f = performance.now() + ms; while (performance.now() < f) { /* l'horloge avance */ } };
                const pousser = (type, dy) => poignee.dispatchEvent(new PointerEvent(type, {
                    bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y + dy
                }));
                pousser('pointerdown', 0);
                [20, 40, 60].forEach((dy) => { patienter(5); pousser('pointermove', dy); });
                patienter(3);
                pousser('pointerup', 60);
            });
            await p.waitForTimeout(700);
            const lancee = await lire(p);
            exige(lancee.cachee && lancee.surLeBouton, `un lancer bref vers le bas ne renvoie pas la feuille : ${JSON.stringify(lancee)}`);

            // « Partager cette date » : le texte de la date et la page du
            // spectacle, à la feuille de partage du téléphone…
            await bouton.tap();
            await p.waitForTimeout(600);
            await p.evaluate(() => {
                window.__partage = null;
                Object.defineProperty(navigator, 'share', {
                    configurable: true, value: (d) => { window.__partage = d; return Promise.resolve(); }
                });
            });
            await p.locator('#cal-option-partager').tap();
            await p.waitForTimeout(700);
            const partage = await p.evaluate(() => window.__partage);
            const apresPartage = await lire(p);
            exige(partage && partage.text === 'Bérénice — jeu. 12 nov. à 20h00, Le Forum, Falaise (14)'
                && partage.url === 'https://adrienvada.fr/spectacles/berenice/',
                `« Partager cette date » n’envoie pas la date et la page du spectacle : ${JSON.stringify(partage)}`);
            exige(apresPartage.cachee && apresPartage.surLeBouton, 'la date partagée, la fenêtre reste ouverte');
            // … ou copiés, sans partage du navigateur, et la ligne le dit.
            await p.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
            await bouton.tap();
            await p.waitForTimeout(600);
            const aideAvant = await p.evaluate(() => document.getElementById('cal-partager-aide').textContent.trim());
            await p.locator('#cal-option-partager').tap();
            await p.waitForTimeout(400);
            const copie = await p.evaluate(async () => ({
                presse: await navigator.clipboard.readText().catch(() => ''),
                aide: document.getElementById('cal-partager-aide').textContent.trim(),
                annonce: document.getElementById('annonce-copie').textContent,
                dedans: !!document.activeElement?.closest('#calendar-modal')
            }));
            exige(/^Copier/.test(aideAvant), `sans partage du navigateur, la ligne ne dit pas qu’elle copie : « ${aideAvant} »`);
            exige(copie.presse === 'Bérénice — jeu. 12 nov. à 20h00, Le Forum, Falaise (14)\nhttps://adrienvada.fr/spectacles/berenice/',
                `le texte copié : ${JSON.stringify(copie.presse)}`);
            exige(/^Copiée/.test(copie.aide) && /^Date copiée : Bérénice/.test(copie.annonce) && copie.dedans,
                `la copie n’est pas dite, ou le focus a quitté la fenêtre : ${JSON.stringify(copie)}`);
            await p.keyboard.press('Escape');
            await p.waitForTimeout(600);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();

            // ── En mouvement réduit : posée d'emblée, sans glisser ──
            const calme = await preparer({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
            await calme.bouton.tap();
            await calme.p.waitForTimeout(100);
            const posee = await lire(calme.p);
            exige(!posee.cachee && Math.abs(posee.bas - posee.vh) <= 1 && posee.haut > posee.vh / 3,
                `en mouvement réduit, la feuille glisse encore (100 ms après le toucher : ${JSON.stringify(posee)})`);
            await calme.p.keyboard.press('Escape');
            await calme.p.waitForTimeout(150);
            exige((await lire(calme.p)).cachee, 'en mouvement réduit, la feuille ne disparaît pas d’un coup');
            exige(!calme.erreurs.length, calme.erreurs.join(' | '));
            await calme.c.close();

            // ── Sur ordinateur : la fenêtre d'avant, au centre ──
            const ordi = await preparer({ viewport: { width: 1440, height: 900 } });
            await ordi.bouton.click();
            await ordi.p.waitForTimeout(600);
            const centre = await ordi.p.evaluate(() => {
                const r = document.getElementById('calendar-modal-card').getBoundingClientRect();
                return {
                    ecart: Math.abs((r.top + r.bottom) / 2 - innerHeight / 2), largeur: r.width,
                    poignee: getComputedStyle(document.querySelector('#calendar-modal .cal-poignee')).display,
                    partage: !!document.getElementById('cal-option-partager')?.offsetParent
                };
            });
            exige(centre.ecart < 30 && centre.largeur <= 448 && centre.poignee === 'none' && centre.partage,
                `sur ordinateur, la fenêtre d’agenda n’est plus celle d’avant (au centre, sans poignée) : ${JSON.stringify(centre)}`);
            exige(!ordi.erreurs.length, ordi.erreurs.join(' | '));
            await ordi.c.close();
        });

        // ── L'AGENDA À S'ABONNER ──
        // dates.ics est fabriqué par build/fabriquer-agenda.js, que lance le
        // générateur des pages. Il doit être refait après chaque export des
        // dates (sinon les abonnés retardent sans bruit), et rester un
        // iCalendar que tous les agendas lisent : lignes CRLF de 75 octets
        // au plus, blocs appariés, un UID par événement. Il annonce chaque
        // séance publique de dates.js (passée de moins de 60 jours au jour
        // de la copie, ou à venir), et jamais une séance scolaire.
        await verifie('l’agenda à s’abonner (dates.ics) : à jour avec dates.js, des lignes CRLF de 75 octets au plus, chaque BEGIN fermé par son END, des UID uniques, chaque séance publique et aucune scolaire — et l’onglet Dates y mène', async () => {
            const AGENDA = require('./fabriquer-agenda.js');
            const texte = fs.readFileSync(path.join(RACINE, 'dates.ics'), 'utf8');
            exige(texte === AGENDA.fabriquer(RACINE).texte, 'dates.ics n’est pas à jour avec dates.js et univers.js : npm --prefix build run pages');
            exige(!/(^|[^\r])\n/.test(texte) && !/\r(?!\n)/.test(texte) && texte.endsWith('\r\n'), 'dates.ics : une fin de ligne n’est pas CRLF');
            const physiques = texte.slice(0, -2).split('\r\n');
            const longues = physiques.filter((l) => Buffer.byteLength(l, 'utf8') > 75);
            exige(!longues.length, `dates.ics : ${longues.length} ligne(s) de plus de 75 octets, dont « ${(longues[0] || '').slice(0, 40)}… »`);
            const lignes = texte.slice(0, -2).replace(/\r\n[ \t]/g, '').split('\r\n');
            const pile = [];
            lignes.forEach((l) => {
                const m = l.match(/^(BEGIN|END):(.+)$/);
                if (!m) return;
                if (m[1] === 'BEGIN') pile.push(m[2]);
                else exige(pile.pop() === m[2], `dates.ics : END:${m[2]} ne ferme pas le bloc ouvert`);
            });
            exige(!pile.length && lignes[0] === 'BEGIN:VCALENDAR' && lignes[lignes.length - 1] === 'END:VCALENDAR',
                `dates.ics : des blocs restent ouverts (${pile.join(', ')})`);
            ['VERSION:2.0', 'X-WR-CALNAME:Adrien Vada — dates', 'REFRESH-INTERVAL;VALUE=DURATION:P1D', 'X-PUBLISHED-TTL:P1D', 'TZID:Europe/Paris']
                .forEach((x) => exige(lignes.includes(x), `dates.ics : « ${x} » manque`));

            const evenements = [];
            let ev = null;
            lignes.forEach((l) => {
                if (l === 'BEGIN:VEVENT') ev = {};
                else if (l === 'END:VEVENT') { evenements.push(ev); ev = null; }
                else if (ev) {
                    const i = l.indexOf(':');
                    ev[l.slice(0, i).split(';')[0]] = { tete: l.slice(0, i), valeur: l.slice(i + 1) };
                }
            });
            const lisible = (v) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
            evenements.forEach((e) => {
                exige(e.UID && e.DTSTAMP && e.DTSTART && e.DTEND && e.SUMMARY && e.LOCATION && e.URL,
                    `dates.ics : un événement incomplet (${Object.keys(e).join(', ')})`);
                exige(/^\d{8}T\d{6}Z$/.test(e.DTSTAMP.valeur), `dates.ics : DTSTAMP « ${e.DTSTAMP.valeur} »`);
                exige(/^DTSTART(;TZID=Europe\/Paris|;VALUE=DATE)$/.test(e.DTSTART.tete), `dates.ics : « ${e.DTSTART.tete} » — l’heure de Paris, ou le jour seul`);
                exige(/^https:\/\//.test(e.URL.valeur), `dates.ics : URL « ${e.URL.valeur} »`);
            });
            const uids = evenements.map((e) => e.UID.valeur);
            exige(new Set(uids).size === uids.length, 'dates.ics : deux événements portent le même UID');

            // Ce que la copie annonce, relu ici à part : chaque séance
            // publique — une par heure —, et aucune scolaire.
            const source = fs.readFileSync(path.join(RACINE, 'dates.js'), 'utf8');
            const copie = AGENDA.dateDeLaCopie(source);
            exige(copie, 'dates.js : la ligne « Dernier export : … » ne se lit plus, et c’est elle qui date dates.ics (voir build/fabriquer-agenda.js)');
            const depuis = AGENDA.decaler(copie.jour, -AGENDA.JOURS_GARDES);
            const donnees = new Function(source + '; return SHOW_DATA;')();
            const publiques = [], scolaires = [];
            donnees.upcoming.forEach((e) => (e.type === 'series' ? e.shows : [e]).forEach((r) => {
                if (!r.icsDate || r.icsDate < depuis) return;
                const brute = Array.isArray(r.times) ? r.times.join(' & ') : String(r.time || '');
                const heures = /confirmer/i.test(brute) ? [] : [...brute.matchAll(/(\d{1,2})\s*[hH:]\s*(\d{2})?/g)];
                const jour = r.icsDate.replace(/-/g, '');
                const debuts = heures.length ? heures.map((h) => `${jour}T${h[1].padStart(2, '0')}${h[2] || '00'}00`) : [jour];
                debuts.forEach((debut) => ((r.isSchool || e.isSchool) ? scolaires : publiques).push({ debut, lieu: e.location, titre: e.title }));
            }));
            const annonce = (s) => evenements.some((x) => x.DTSTART.valeur === s.debut && lisible(x.LOCATION.valeur) === s.lieu);
            const manquantes = publiques.filter((s) => !annonce(s));
            exige(!manquantes.length, `dates.ics n’annonce pas : ${manquantes.map((s) => `${s.titre} ${s.debut}`).join(', ')}`);
            exige(evenements.length === publiques.length, `dates.ics annonce ${evenements.length} événement(s) pour ${publiques.length} séance(s) publique(s)`);
            const intruses = scolaires.filter((s) => annonce(s) && !publiques.some((x) => x.debut === s.debut && x.lieu === s.lieu));
            exige(!intruses.length, `dates.ics annonce une séance scolaire : ${intruses.map((s) => `${s.titre} ${s.debut}`).join(', ')}`);

            // Servi comme un agenda, et l'onglet Dates y mène : webcal pour
            // Calendrier et Outlook, l'adresse https à copier pour Google.
            const servi = await fetch(base + '/dates.ics');
            exige(servi.ok && /^text\/calendar/.test(servi.headers.get('content-type') || ''), `dates.ics servi en « ${servi.headers.get('content-type')} »`);
            const accueil = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
            const bloc = (accueil.match(/<div class="dates-abonnement[^"]*"[\s\S]*?<\/div>/) || [''])[0];
            exige(/no-print/.test(bloc) && /href="webcal:\/\/adrienvada\.fr\/dates\.ics"/.test(bloc) && /data-copier="https:\/\/adrienvada\.fr\/dates\.ics"/.test(bloc)
                && (bloc.match(/data-track="agenda_abonnement"/g) || []).length === 2,
                'l’onglet Dates ne propose pas l’abonnement (webcal, l’adresse https à copier, la mesure agenda_abonnement), ou l’imprime');
        });

        await verifie('le book : fermer puis rouvrir aussitôt ne laisse pas une page morte', async () => {
            const c = await visiteur({ viewport: { width: 1100, height: 760 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/galerie/', { waitUntil: 'load' });
            await p.waitForTimeout(600);
            await p.click('[data-zoom-photo="2"]');
            await p.waitForTimeout(900);
            await p.keyboard.press('Escape');
            await p.waitForTimeout(200);
            await p.keyboard.press('Enter');
            await p.waitForTimeout(1200);
            const etat = await p.evaluate(() => ({
                cachee: document.getElementById('galerie-zoom').hidden,
                inertes: [...document.body.children].filter((e) => e.inert).length
            }));
            exige(!etat.cachee, 'la visionneuse rouverte a été cachée par la fermeture d’avant');
            await p.keyboard.press('Escape');
            await p.waitForTimeout(1000);
            const apres = await p.evaluate(() => [...document.body.children].filter((e) => e.inert).length);
            exige(!apres, `${apres} élément(s) restent inertes après la fermeture`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        // Même piège pour un univers, là où la fermeture vide le panneau
        // 420 ms plus tard : sans View Transitions (Firefox avant 144), le
        // rouvrir dans ce délai le laissait vide et caché, la page inerte et
        // verrouillée derrière.
        await verifie('un univers : fermer puis rouvrir aussitôt, sans View Transitions, ne laisse pas un panneau vide', async () => {
            const c = await visiteur({ viewport: { width: 1280, height: 900 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.addInitScript(() => { delete Document.prototype.startViewTransition; });
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(800);
            const sel = await p.evaluate(() => {
                const li = [...document.querySelectorAll('#page_cv li.cv-has-universe[data-cv-show]')]
                    .find((l) => window.spectacleParTitre?.(l.dataset.cvShow)?.uni.slug === 'cleophene');
                if (!li) return null;
                li.id = li.id || 'verif-cleophene';
                li.scrollIntoView({ block: 'center', behavior: 'instant' });
                return '#' + CSS.escape(li.id) + ' .cv-row-toggle';
            });
            exige(sel, 'la ligne de Cléophène n’ouvre pas d’univers');
            await p.waitForTimeout(300);
            await p.click(sel);
            await p.waitForTimeout(1500);
            await p.evaluate(() => document.querySelector('#show-universe .u-close').click());
            await p.waitForTimeout(100);
            await p.evaluate((sel) => document.querySelector(sel).click(), sel);
            await p.waitForTimeout(1500);
            const etat = await p.evaluate(() => {
                const o = document.getElementById('show-universe');
                return { cache: o.hidden, ouvert: o.classList.contains('is-open'), temps: o.querySelectorAll('.u-figs > *').length };
            });
            exige(etat.ouvert && !etat.cache && etat.temps > 0,
                `l’univers rouvert a été vidé par la fermeture d’avant (caché : ${etat.cache}, ${etat.temps} temps)`);
            await p.keyboard.press('Escape');
            await p.waitForTimeout(1000);
            const apres = await p.evaluate(() => ({
                inerte: document.getElementById('site').inert,
                verrou: document.documentElement.classList.contains('u-locked'),
                cache: document.getElementById('show-universe').hidden
            }));
            exige(!apres.inerte && !apres.verrou && apres.cache, 'la page reste inerte ou verrouillée après la fermeture');
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        // ── LA FRISE, COMME LE PROTOTYPE DE L'AUDIT ──
        // Le fil d'or court à GAUCHE de la liste ; sur lui, au milieu de
        // chaque ligne, un point dans la couleur du spectacle, qui éclôt
        // quand la ligne de lecture l'atteint ; les lignes que le fil n'a
        // pas encore atteintes sont voilées (transparence). Plus rien de
        // coloré ne court à droite : ni filet, ni lavis au passage.
        await verifie('la frise du CV comme le prototype : le fil d’or à gauche, un point par spectacle posé dessus, les lignes voilées tant que le fil ne les a pas atteintes, rien de coloré à droite — avec les deux pilotes, sans horloge, tout posé en mouvement réduit ; le doigt qui fait défiler ne dévoile rien, la souris et le clavier si', async () => {
            for (const [repli, reduit] of [[false, false], [true, false], [false, true]]) {
                const c = await visiteur({ viewport: { width: 1280, height: 860 }, reducedMotion: reduit ? 'reduce' : 'no-preference' });
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(base + '/' + (repli ? '?repli' : ''), { waitUntil: 'load' });
                await p.waitForTimeout(600);
                const etat = await p.evaluate(async () => {
                    const liste = document.getElementById('cv-theatre-list');
                    const lignes = [...liste.querySelectorAll('li.cv-has-universe')];
                    document.documentElement.style.scrollBehavior = 'auto';
                    // La ligne de lecture, telle que la page la déclare
                    // (une fraction de l'écran, depuis son haut).
                    const L = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ligne-lecture'));
                    // La quatrième ligne sur la ligne de lecture.
                    const y = lignes[3].getBoundingClientRect().top + scrollY - innerHeight * L + 4;
                    window.scrollTo(0, y);
                    await new Promise((r) => setTimeout(r, 400));
                    const px = (v) => parseFloat(v) || 0;
                    const fil = getComputedStyle(liste, '::after');
                    const point = (li) => getComputedStyle(li, '::before');
                    const echelle = (li) => { const t = point(li).transform; return t === 'none' ? 1 : +(t.match(/matrix\(([-\d.e]+)/) || [0, NaN])[1]; };
                    const voile = (li) => +getComputedStyle(li.querySelector('.cv-row-toggle')).opacity;
                    const p0 = point(lignes[0]);
                    const etat = {
                        frise: liste.classList.contains('cv-frise'),
                        lecture: L,
                        filGauche: px(fil.left),
                        // Le centre du point et celui du fil, depuis le bord gauche de la liste.
                        ecartPointFil: Math.abs((px(p0.left) + px(p0.width) / 2) - (px(fil.left) + px(fil.width) / 2)),
                        rond: px(p0.width) === px(p0.height) && px(p0.width) > 0,
                        pointsHaut: echelle(lignes[0]), pointsBas: echelle(lignes[lignes.length - 1]),
                        pleineHaut: voile(lignes[0]), voileBas: voile(lignes[lignes.length - 1]),
                        lavis: lignes.filter((li) => +getComputedStyle(li, '::after').opacity > 0.01).length,
                        horloge: [...document.styleSheets].some((f) => { try { return [...f.cssRules].some((r) => /cv-guirlande|cv-pastille-lueur\b/.test(r.cssText)); } catch (e) { return false; } }),
                        tout: lignes.every((li) => voile(li) > 0.99 && echelle(li) === 1)
                    };
                    // LA POINTE DU FIL EST SUR LA LIGNE DE LECTURE : le haut du
                    // fil, plus sa part tracée. Mesurée aux deux tiers de la
                    // liste : view() sans encart retranchait de l'écran les
                    // 84 px de scroll-padding-top, et le fil prenait de
                    // l'avance à mesure qu'il descendait — jusqu'à 84 px.
                    const r = liste.getBoundingClientRect();
                    window.scrollTo(0, r.top + scrollY + r.height * 0.67 - innerHeight * L);
                    await new Promise((f) => setTimeout(f, 400));
                    const f2 = getComputedStyle(liste, '::after');
                    const trace = f2.transform === 'none' ? 1 : +(f2.transform.match(/matrix\(([^)]+)\)/) || [0, 'NaN'])[1].split(',')[3];
                    etat.ecartPointe = Math.abs(liste.getBoundingClientRect().top + px(f2.top) + trace * px(f2.height) - innerHeight * L);
                    return etat;
                });
                const nom = reduit ? 'en mouvement réduit' : repli ? 'avec le repli' : 'en natif';
                exige(etat.frise, 'la liste du CV ne porte pas la frise');
                // Aux trois quarts de l'écran : ce qui monte par le bas se
                // découvre sans attendre d'en avoir atteint le milieu.
                exige(etat.lecture === 0.75, `la ligne de lecture n’est plus aux trois quarts de l’écran (--ligne-lecture : ${etat.lecture})`);
                exige(etat.filGauche < 0, `${nom}, le fil d’or n’est plus à gauche de la liste (left ${etat.filGauche} px)`);
                exige(etat.rond, `${nom}, le repère de la ligne n’est plus un point (filet revenu ?)`);
                exige(etat.ecartPointFil < 0.6, `${nom}, le point n’est pas centré sur le fil (écart ${etat.ecartPointFil.toFixed(2)} px)`);
                exige(!etat.lavis, `${nom}, le lavis passe encore au défilement sur ${etat.lavis} ligne(s)`);
                if (reduit) {
                    exige(etat.tout, 'en mouvement réduit, une ligne reste voilée ou sans son point');
                } else {
                    exige(etat.pointsHaut === 1 && etat.pleineHaut > 0.99, `${nom}, une ligne déjà lue n’est pas pleine avec son point (${etat.pleineHaut}, point × ${etat.pointsHaut})`);
                    exige(etat.pointsBas === 0, `${nom}, le point d’une ligne pas encore atteinte est déjà là (× ${etat.pointsBas})`);
                    // Le voile est à .62 depuis l'audit d'octobre 2026 (il était à .38 :
                    // une ligne voilée passait pour désactivée à l'arrêt).
                    exige(etat.voileBas < 0.7, `${nom}, une ligne pas encore atteinte n’est pas voilée (${etat.voileBas})`);
                    exige(etat.ecartPointe < 12, `${nom}, la pointe du fil est à ${Math.round(etat.ecartPointe)} px de la ligne de lecture`);
                }
                exige(!etat.horloge, 'la guirlande à horloge est revenue');
                exige(!erreurs.length, erreurs.join(' | '));
                await c.close();
            }

            // LE DOIGT QUI FAIT DÉFILER NE DÉVOILE RIEN. Au téléphone, on pose
            // le doigt sur une ligne pour défiler, et le navigateur garde le
            // survol de la dernière ligne touchée : elle restait pleine, son
            // point posé, avant que le fil l'atteigne. À la souris, la ligne
            // pointée est pleine ; au clavier aussi. Le point, lui, n'attend
            // que le fil.
            for (const [appareil, options] of [
                ['au téléphone', { viewport: { width: 412, height: 839 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
                ['à la souris', { viewport: { width: 1280, height: 860 } }]
            ]) {
                const c = await visiteur(options);
                const p = await c.newPage();
                await p.goto(base + '/', { waitUntil: 'load' });
                await p.waitForTimeout(600);
                // La 6e ligne juste sous la ligne de lecture, où son voile
                // commence à peine à se lever : voilée, sans point, et
                // entière à l'écran — la survoler ne fait rien défiler.
                await p.evaluate(() => {
                    document.documentElement.style.scrollBehavior = 'auto';
                    const L = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ligne-lecture'));
                    const r = document.querySelectorAll('#cv-theatre-list > li.cv-has-universe')[5].getBoundingClientRect();
                    window.scrollTo(0, r.top + scrollY - innerHeight * (L + 0.14));
                });
                await p.waitForTimeout(300);
                const lire = () => p.evaluate(() => {
                    const li = document.querySelectorAll('#cv-theatre-list > li.cv-has-universe')[5];
                    const t = getComputedStyle(li, '::before').transform;
                    return { voile: +getComputedStyle(li.querySelector('.cv-row-toggle')).opacity, point: t === 'none' ? 1 : +(t.match(/matrix\(([-\d.e]+)/) || [0, NaN])[1] };
                });
                // Au téléphone, la barre d'onglets flotte en bas de l'écran :
                // le milieu de la vignette, si bas, est sous elle — le survol
                // de Playwright ferait alors défiler la page pour l'atteindre,
                // et la ligne passerait la ligne de lecture. Le pointeur va
                // donc droit sur le haut de la vignette, qui dépasse au-dessus
                // de la barre, sans rien faire défiler.
                const vignette = await p.locator('#cv-theatre-list > li.cv-has-universe').nth(5).locator('.cv-vignette').boundingBox();
                await p.mouse.move(vignette.x + vignette.width / 2, vignette.y + (options.isMobile ? 4 : vignette.height / 2));
                await p.waitForTimeout(250);
                const survol = await lire();
                // Voilée à .62 depuis l'audit d'octobre 2026 : pleine, elle serait à 1.
                if (options.isMobile) exige(survol.voile < 0.7, `${appareil}, une ligne touchée avant le fil s’allume (${survol.voile})`);
                else exige(survol.voile > 0.99, `${appareil}, la ligne pointée reste voilée (${survol.voile})`);
                exige(survol.point === 0, `${appareil}, le point d’une ligne désignée éclôt avant le fil (× ${survol.point})`);
                // Au clavier : depuis la ligne d'après, Maj+Tab.
                await p.mouse.move(1, 1);
                await p.evaluate(() => document.querySelectorAll('#cv-theatre-list > li.cv-has-universe .cv-row-toggle')[6].focus({ preventScroll: true }));
                await p.keyboard.press('Shift+Tab');
                await p.waitForTimeout(250);
                const clavier = await lire();
                exige(clavier.voile > 0.99, `${appareil}, la ligne atteinte au clavier reste voilée (${clavier.voile})`);
                await c.close();
            }
        });

        // LES GESTES SUR UNE LIGNE DU CV, ET CE QU'ILS NE COÛTENT PLUS. Les
        // murmures ne sont pas écrits au chargement, mais à la première
        // désignation — et s'écrivent quand même mot à mot, en fondu. La
        // cible de la salle ne descend plus de <html> : elle va à <body> et
        // à la barre, sans héritage. Au doigt, un glissement n'allume rien ;
        // l'appui se marque à 110 ms, le murmure vient à 400, un tap bref
        // ouvre l'univers. La barre d'adresse (hauteur seule) ne relance pas
        // l'égalisation des lignes. En repli, --ph n'hérite pas : la ligne
        // et ses relais le portent, rien d'autre.
        await verifie('les gestes sur une ligne du CV : le murmure écrit à la première désignation et toujours en fondu, la salle sans héritage et après un temps d’arrêt ; au doigt, un glissement n’allume rien, l’appui se marque à 110 ms, le murmure à 400, un tap ouvre l’univers ; la barre d’adresse ne remesure rien ; en repli, la place d’une ligne n’hérite pas', async () => {
            // À LA SOURIS ET AU CLAVIER
            {
                const c = await visiteur({ viewport: { width: 1280, height: 860 } });
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(base + '/', { waitUntil: 'load' });
                await p.waitForTimeout(600);
                const repos = await p.evaluate(() => ({
                    mots: document.querySelectorAll('#page_cv .cv-wd').length,
                    places: document.querySelectorAll('#page_cv .cv-whisper').length
                }));
                exige(repos.places >= 5, `${repos.places} places de murmure au chargement`);
                exige(repos.mots === 0, `${repos.mots} mots de murmure écrits dès le chargement`);
                const lire = (n) => p.evaluate((n) => {
                    const li = document.querySelectorAll('#cv-theatre-list > li.cv-has-universe')[n];
                    const mots = [...li.querySelectorAll('.cv-wd')];
                    return {
                        mots: mots.length,
                        fondus: document.getAnimations().filter((a) => mots.includes(a.effect && a.effect.target)).length,
                        premier: mots.length ? +getComputedStyle(mots[0]).opacity : -1,
                        salle: document.documentElement.classList.contains('salle-allumee'),
                        surHtml: document.documentElement.style.getPropertyValue('--ambiance-cible'),
                        surBody: document.body.style.getPropertyValue('--ambiance-cible').trim(),
                        surBarre: document.getElementById('nav-barre').style.getPropertyValue('--ambiance-cible').trim(),
                        heritee: getComputedStyle(li.querySelector('.cv-title')).getPropertyValue('--ambiance-cible').trim(),
                        accent: li.style.getPropertyValue('--cv-accent').trim()
                    };
                }, n);
                await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelectorAll('#cv-theatre-list > li.cv-has-universe')[1].scrollIntoView({ block: 'center' }); });
                await p.waitForTimeout(200);
                const b = await p.locator('#cv-theatre-list > li.cv-has-universe').nth(1).locator('.cv-vignette').boundingBox();
                await p.mouse.move(b.x - 80, b.y + b.height / 2);
                await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
                await p.waitForTimeout(40);
                const tot = await lire(1);
                exige(tot.mots > 5, `le murmure survolé n’est pas écrit (${tot.mots} mots)`);
                exige(tot.fondus > 0 && tot.premier < 0.05, `le murmure survolé paraît d’un bloc (${tot.fondus} fondus, premier mot à ${tot.premier})`);
                exige(!tot.salle, 'la salle s’allume sans attendre que le pointeur se pose');
                await p.waitForTimeout(400);
                const pose = await lire(1);
                exige(pose.salle, 'la salle ne s’allume pas sous le pointeur posé');
                exige(!pose.surHtml, 'la cible de la salle est encore posée sur <html>');
                exige(pose.surBody === pose.accent && pose.surBarre === pose.accent, `la cible de la salle ne va pas à <body> et à la barre (${pose.surBody}, ${pose.surBarre}, accent ${pose.accent})`);
                exige(!pose.heritee, `la cible de la salle descend encore jusqu’aux lignes (${pose.heritee})`);
                // Au clavier : jusqu'au bouton de la 6e ligne.
                await p.mouse.move(2, 2);
                await p.evaluate(() => document.querySelectorAll('#cv-theatre-list > li.cv-has-universe .cv-row-toggle')[4].focus({ preventScroll: true }));
                for (let k = 0; k < 4; k++) {
                    await p.keyboard.press('Tab');
                    if (await p.evaluate(() => document.activeElement === document.querySelectorAll('#cv-theatre-list > li.cv-has-universe .cv-row-toggle')[5])) break;
                }
                await p.waitForTimeout(40);
                const clavier = await lire(5);
                exige(clavier.mots > 5 && clavier.fondus > 0, `au clavier, le murmure ne s’écrit pas en fondu (${clavier.mots} mots, ${clavier.fondus} fondus)`);
                exige(!erreurs.length, erreurs.join(' | '));
                await c.close();
            }
            // AU DOIGT
            {
                const c = await visiteur({ viewport: { width: 412, height: 839 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
                const p = await c.newPage();
                const erreurs = guette(p);
                const cdp = await c.newCDPSession(p);
                await p.goto(base + '/', { waitUntil: 'load' });
                await p.waitForTimeout(600);
                await p.evaluate(() => {
                    window.__allumages = 0; window.__appuis = 0;
                    new MutationObserver((ms) => ms.forEach((m) => {
                        const avant = m.oldValue || '';
                        if (m.target === document.documentElement && m.target.classList.contains('salle-allumee') && !avant.includes('salle-allumee')) window.__allumages++;
                        if (m.target.classList.contains('is-pressed') && !avant.includes('is-pressed')) window.__appuis++;
                    })).observe(document.documentElement, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
                });
                const viser = () => p.evaluate(() => {
                    document.documentElement.style.scrollBehavior = 'auto';
                    const li = document.querySelectorAll('#cv-theatre-list > li.cv-has-universe')[1];
                    li.scrollIntoView({ block: 'center' });
                    const r = li.getBoundingClientRect();
                    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
                });
                const etat = () => p.evaluate(() => {
                    const li = document.querySelectorAll('#cv-theatre-list > li.cv-has-universe')[1];
                    const mots = [...li.querySelectorAll('.cv-wd')];
                    return {
                        appui: li.classList.contains('is-pressed'), murmure: li.classList.contains('is-whispering'),
                        salle: document.documentElement.classList.contains('salle-allumee'),
                        mots: mots.length, fondus: document.getAnimations().filter((a) => mots.includes(a.effect && a.effect.target)).length,
                        allumages: window.__allumages, appuis: window.__appuis,
                        ouvert: document.getElementById('show-universe').classList.contains('is-open')
                    };
                });
                // Un glissement commencé sur la ligne.
                let pt = await viser();
                await p.waitForTimeout(200);
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
                for (let k = 1; k <= 6; k++) {
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pt.x, y: pt.y - k * 14 }] });
                    await p.waitForTimeout(12);
                }
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                await p.waitForTimeout(300);
                const glisse = await etat();
                exige(!glisse.allumages && !glisse.appuis, `un glissement sur une ligne allume la salle (${glisse.allumages}) ou marque l’appui (${glisse.appuis})`);
                // L'appui maintenu.
                pt = await viser();
                await p.waitForTimeout(200);
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
                await p.waitForTimeout(40);
                const tot = await etat();
                await p.waitForTimeout(160);
                const marque = await etat();
                await p.waitForTimeout(400);
                const tenu = await etat();
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                await p.waitForTimeout(300);
                const leve = await etat();
                exige(!tot.appui && !tot.salle, 'l’appui est marqué dès le contact');
                exige(marque.appui && marque.salle && !marque.murmure, `l’appui n’est pas marqué à 110 ms (${JSON.stringify(marque)})`);
                exige(tenu.murmure && tenu.mots > 5 && tenu.fondus > 0, `l’appui maintenu ne murmure pas mot à mot (${JSON.stringify(tenu)})`);
                exige(leve.murmure && !leve.ouvert, 'relevé, le doigt referme le murmure ou ouvre l’univers');
                // Toucher ailleurs referme ; un tap bref ouvre l'univers.
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 6, y: 6 }] });
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                await p.waitForTimeout(300);
                pt = await viser();
                await p.waitForTimeout(200);
                await p.touchscreen.tap(pt.x, pt.y);
                await p.waitForTimeout(1200);
                exige((await etat()).ouvert, 'un tap bref sur la ligne n’ouvre plus l’univers');
                exige(!erreurs.length, erreurs.join(' | '));
                await c.close();
            }
            // LA BARRE D'ADRESSE, ET LE REPLI
            {
                const c = await visiteur({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
                const p = await c.newPage();
                await p.goto(base + '/?repli', { waitUntil: 'load' });
                await p.waitForTimeout(600);
                const effacer = () => p.evaluate(() => document.querySelector('#cv-theatre-list > li.cv-item').style.removeProperty('min-height'));
                const hauteur = () => p.evaluate(() => document.querySelector('#cv-theatre-list > li.cv-item').style.minHeight);
                await effacer();
                await p.setViewportSize({ width: 390, height: 788 });
                await p.waitForTimeout(400);
                exige(!(await hauteur()), 'la barre d’adresse (hauteur seule) relance l’égalisation des lignes');
                await p.setViewportSize({ width: 430, height: 788 });
                await p.waitForTimeout(400);
                exige(!!(await hauteur()), 'un changement de largeur ne relance plus l’égalisation des lignes');
                const repli = await p.evaluate(() => {
                    const li = [...document.querySelectorAll('#cv-theatre-list > li.cv-has-universe')].find((l) => l.style.getPropertyValue('--ph'));
                    if (!li) return null;
                    return {
                        ligne: li.style.getPropertyValue('--ph'),
                        bouton: li.querySelector('.cv-row-toggle').style.getPropertyValue('--ph'),
                        titre: getComputedStyle(li.querySelector('.cv-title')).getPropertyValue('--ph').trim()
                    };
                });
                exige(repli, 'en repli, aucune ligne du CV ne reçoit sa place (--ph)');
                exige(repli.bouton === repli.ligne, `en repli, le bouton de la ligne ne reçoit pas sa place (${repli.bouton} au lieu de ${repli.ligne})`);
                exige(!repli.titre, `en repli, la place de la ligne descend jusqu’à son titre (${repli.titre})`);
                await c.close();
            }
        });

        // LA FRISE DES MOIS DE L'ONGLET DATES. Comme le fil du CV : chaque
        // mois a son liseré dans la marge, qui se trace jusqu'à la ligne de
        // lecture, au milieu de l'écran ; son point, devant le nom du mois,
        // éclôt quand elle l'atteint. Un espace sépare deux mois.
        await verifie('la frise des mois de l’onglet Dates : chaque mois son liseré, séparé du suivant par un espace, tracé jusqu’à la ligne de lecture, son point posé quand elle atteint le nom du mois — avec les deux pilotes, tout tracé en mouvement réduit', async () => {
            // Une saison fictive : deux lignes par mois, cinq mois de suite,
            // à partir du mois prochain.
            const saison = () => {
                const iso = (a, m, j) => `${a}-${String(m + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
                const titres = ['Bérénice', 'Cléophène, d’après Rodogune'];
                const t = new Date();
                SHOW_DATA.upcoming = [];
                for (let k = 1; k <= 5; k++) {
                    const d = new Date(t.getFullYear(), t.getMonth() + k, 1);
                    const a = d.getFullYear(), m = d.getMonth();
                    const seance = (j) => ({ dateLabel: iso(a, m, j), icsDate: iso(a, m, j), time: '20h00', bookingUrl: 'https://example.org/billets', isSchool: false });
                    SHOW_DATA.upcoming.push(
                        Object.assign({ type: 'single', title: titres[k % 2], location: 'Scène de vérification (76)', city: 'Rouen' }, seance(5)),
                        { type: 'series', id: `frise-${k}`, title: titres[(k + 1) % 2], location: 'Salle de vérification (76)', city: 'Rouen', dateLabel: iso(a, m, 20), shows: [seance(20), seance(21)] }
                    );
                }
                renderDates();
            };
            for (const [repli, reduit] of [[false, false], [true, false], [false, true]]) {
                const c = await visiteur({ viewport: { width: 390, height: 844 }, reducedMotion: reduit ? 'reduce' : 'no-preference' });
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(`${base}/${repli ? '?repli' : ''}#page_dates`, { waitUntil: 'load' });
                await p.waitForTimeout(600);
                await p.evaluate(saison);
                const etat = await p.evaluate(async () => {
                    document.documentElement.style.scrollBehavior = 'auto';
                    const groupes = [...document.querySelectorAll('#upcoming-dates-container .dl-groupe')];
                    // La ligne de lecture (déclarée par la page) au milieu du
                    // deuxième mois.
                    const L = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ligne-lecture'));
                    const r = groupes[1].getBoundingClientRect();
                    window.scrollTo(0, r.top + scrollY + r.height / 2 - innerHeight * L);
                    await new Promise((f) => setTimeout(f, 500));
                    // matrix(a, b, c, d, e, f) : a, l'échelle du point ; d, la hauteur tracée du liseré.
                    const echelle = (t, n) => (t === 'none' ? 1 : +((t.match(/matrix\(([^)]+)\)/) || [0, 'NaN'])[1].split(',')[n]));
                    const lire = (g) => ({
                        trait: echelle(getComputedStyle(g, '::after').transform, 3),
                        point: echelle(getComputedStyle(g.querySelector('.dl-intercalaire'), '::after').transform, 0)
                    });
                    return {
                        n: groupes.length,
                        espace: groupes[1].getBoundingClientRect().top - groupes[0].getBoundingClientRect().bottom,
                        lu: lire(groupes[0]), enCours: lire(groupes[1]), aVenir: lire(groupes[groupes.length - 1]),
                        tous: groupes.map(lire)
                    };
                });
                const nom = reduit ? 'en mouvement réduit' : repli ? 'avec le repli' : 'en natif';
                exige(etat.n === 5, `${etat.n} mois au lieu de cinq`);
                exige(etat.espace >= 8, `${nom}, pas d’espace entre deux mois (${etat.espace} px)`);
                if (reduit) {
                    exige(etat.tous.every((x) => x.trait === 1 && x.point === 1),
                        `en mouvement réduit, un liseré n’est pas tracé ou un point pas posé : ${JSON.stringify(etat.tous)}`);
                } else {
                    exige(etat.lu.trait > 0.99 && etat.lu.point === 1, `${nom}, le mois déjà lu n’est pas tracé, son point posé : ${JSON.stringify(etat.lu)}`);
                    exige(etat.enCours.point === 1 && etat.enCours.trait > 0.2 && etat.enCours.trait < 0.8,
                        `${nom}, le liseré du mois en cours ne s’arrête pas à la ligne de lecture : ${JSON.stringify(etat.enCours)}`);
                    exige(etat.aVenir.trait === 0 && etat.aVenir.point === 0,
                        `${nom}, un mois que la ligne de lecture n’a pas atteint est déjà tracé : ${JSON.stringify(etat.aVenir)}`);
                }
                exige(!erreurs.length, erreurs.join(' | '));
                await c.close();
            }
        });

        // ════════════════════════════════════════════════════════════
        //  LES CHANTIERS DU REGARD (septembre 2026) : les ondes de la voix,
        //  la planche contact, le portrait d'affiche, la salle de
        //  projection, la photo dans la lettre, la fiche de casting.
        // ════════════════════════════════════════════════════════════

        await verifie('les ondes de la voix : chaque démo montre la forme de son enregistrement, ce qui est lu d’une autre couleur que ce qui reste', async () => {
            const c = await visiteur({ viewport: { width: 412, height: 915 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/#demos_voix', { waitUntil: 'load' });
            await p.waitForTimeout(1200);
            const barres = await p.evaluate(() => [...document.querySelectorAll('[data-audio-seek]')].map((b) => {
                const t = b.querySelector('canvas.onde-toile');
                let peinte = false;
                if (t && t.width) {
                    const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
                    for (let i = 3; i < d.length; i += 4) if (d[i]) { peinte = true; break; }
                }
                return {
                    id: b.dataset.audioSeek, onde: /^[0-9a-z]{200}$/.test(b.dataset.onde || ''),
                    duree: +b.dataset.duree, peinte, role: b.getAttribute('role'),
                    temps: document.getElementById('time-' + b.dataset.audioSeek)?.textContent.trim()
                };
            }));
            exige(barres.length >= 8, `${barres.length} démo(s) seulement`);
            const sans = barres.filter((b) => !b.onde || !(b.duree > 0));
            exige(!sans.length, `sans onde (build/ondes.js à relancer ?) : ${sans.map((b) => b.id).join(', ')}`);
            const vides = barres.filter((b) => !b.peinte);
            exige(!vides.length, `onde non dessinée : ${vides.map((b) => b.id).join(', ')}`);
            exige(barres.every((b) => b.role === 'slider'), 'une barre a perdu son rôle de curseur');
            exige(barres.every((b) => !/\/ 0:00$/.test(b.temps)), 'une démo annonce 0:00 de durée avant d’être chargée');
            // À mi-parcours, la moitié gauche est dorée, la droite non.
            const couleurs = await p.evaluate(async () => {
                // Par le chemin du site : la démo n'est pas encore chargée
                // (seule la première l'est à l'ouverture), on vise avec la
                // durée connue d'avance ; et le serveur local ne sert pas de
                // morceaux de fichier (voir allerDansLaDemo).
                const a = document.getElementById('audio-nexity');
                allerDansLaDemo('audio-nexity', dureeDemo('audio-nexity') / 2);
                for (let i = 0; i < 50 && a.currentTime < 1; i++) await new Promise((f) => setTimeout(f, 100));
                a.dispatchEvent(new Event('timeupdate'));
                await new Promise((f) => requestAnimationFrame(f));
                const t = document.querySelector('[data-audio-seek="audio-nexity"] canvas');
                const g = t.getContext('2d');
                const teinte = (fx) => {
                    const x = Math.floor(t.width * fx);
                    for (let dx = 0; dx < 12; dx++) {
                        const d = g.getImageData(x + dx, 0, 1, t.height).data;
                        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) return [d[i], d[i + 1], d[i + 2]].join(',');
                    }
                    return null;
                };
                return [teinte(0.2), teinte(0.8)];
            });
            exige(couleurs[0] && couleurs[1] && couleurs[0] !== couleurs[1], `lu et reste de la même couleur (${couleurs.join(' / ')})`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('la planche contact : chaque photo à son cadre, les rangées d’une même hauteur et pleines, le crayon gras au survol', async () => {
            for (const vue of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
                const c = await visiteur({ viewport: vue });
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(base + '/galerie/', { waitUntil: 'load' });
                await p.waitForTimeout(600);
                const etat = await p.evaluate(async () => {
                    const cartes = [...document.querySelectorAll('.carte')];
                    const grille = document.querySelector('.repertoire').getBoundingClientRect();
                    const cases = cartes.map((c) => {
                        const r = c.querySelector('.cadre').getBoundingClientRect();
                        return { r: parseFloat(c.style.getPropertyValue('--r')), l: r.width, h: r.height, x: r.left, y: r.top, d: r.right };
                    });
                    // Le cadre de la vignette elle-même, lu dans le fichier.
                    const vraies = await Promise.all(cartes.map(async (c) => {
                        const src = c.querySelector('source').getAttribute('srcset').split(' ')[0];
                        const im = new Image(); im.src = src; await im.decode();
                        return im.naturalWidth / im.naturalHeight;
                    }));
                    const rangs = {};
                    cases.forEach((k) => { (rangs[Math.round(k.y)] = rangs[Math.round(k.y)] || []).push(k); });
                    const lignes = Object.values(rangs);
                    const crayon = getComputedStyle(document.querySelector('.crayon path')).strokeDashoffset;
                    return {
                        n: cartes.length,
                        recadrees: cases.filter((k, i) => Math.abs(k.l / k.h - vraies[i]) / vraies[i] > 0.03).length,
                        faux: cases.filter((k, i) => Math.abs(k.r - vraies[i]) / vraies[i] > 0.01).length,
                        inegales: lignes.filter((l) => Math.max(...l.map((k) => k.h)) - Math.min(...l.map((k) => k.h)) > 1.5).length,
                        creuses: lignes.slice(0, -1).filter((l) => Math.abs(Math.max(...l.map((k) => k.d)) - grille.right) > 3).length,
                        lignes: lignes.length,
                        crayon
                    };
                });
                exige(etat.n >= 10, `${etat.n} photo(s) seulement`);
                exige(!etat.faux, `${etat.faux} case(s) dont --r ne dit pas le cadre de la vignette`);
                exige(!etat.recadrees, `${etat.recadrees} photo(s) recadrée(s) à ${vue.width} px`);
                exige(!etat.inegales, `${etat.inegales} rangée(s) aux hauteurs inégales à ${vue.width} px`);
                exige(!etat.creuses, `${etat.creuses} rangée(s) qui ne vont pas au bout à ${vue.width} px`);
                exige(parseFloat(etat.crayon) > 1, `le crayon est tracé au repos (${etat.crayon})`);
                if (vue.width > 1000) {
                    await p.hover('.carte-btn >> nth=2');
                    await p.waitForTimeout(700);
                    const trace = await p.evaluate(() => getComputedStyle(document.querySelectorAll('.crayon path')[2]).strokeDashoffset);
                    exige(parseFloat(trace) < 0.05, `le crayon ne se trace pas au survol (${trace})`);
                }
                exige(!erreurs.length, erreurs.join(' | '));
                await c.close();
            }
        });

        await verifie('le portrait d’affiche : le visage en grand sur l’onglet CV, le nom en Cinzel, la fiche en six cases, la photo qui recule au défilement ; ailleurs, le médaillon, où le visage se range — et le papier inchangé', async () => {
            for (const vue of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
                const c = await visiteur({ viewport: vue });
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(base + '/', { waitUntil: 'load' });
                await p.waitForTimeout(700);
                const lire = () => p.evaluate(() => {
                    const t = document.getElementById('en-tete');
                    const r = t.querySelector('.affiche-cadre').getBoundingClientRect();
                    const cases = [...t.querySelectorAll('.signature-casting [data-cle]')];
                    return {
                        replie: t.classList.contains('replie'),
                        l: r.width, h: r.height, rond: getComputedStyle(t.querySelector('.affiche-cadre')).borderTopLeftRadius,
                        entete: t.getBoundingClientRect().width,
                        police: getComputedStyle(t.querySelector('h1')).fontFamily,
                        etiquettes: cases.map((k) => getComputedStyle(k, '::before').content).filter((x) => x && x !== 'none').length
                    };
                });
                const cv = await lire();
                exige(!cv.replie, 'l’en-tête est replié sur l’onglet CV');
                exige(/Cinzel/.test(cv.police), `le nom n’est pas en Cinzel (${cv.police})`);
                exige(cv.etiquettes === 6, `la fiche de l’affiche a ${cv.etiquettes} case(s) étiquetée(s) sur 6`);
                if (vue.width > 1000) exige(cv.l >= 300 && cv.h >= 360, `le portrait fait ${cv.l.toFixed(0)} × ${cv.h.toFixed(0)} px à l’écran`);
                else exige(cv.l >= cv.entete - 2 && cv.h >= 300, `le portrait ne tient pas la largeur de l’en-tête au téléphone (${cv.l.toFixed(0)} px sur ${cv.entete.toFixed(0)})`);
                // Le travelling arrière : immobile en haut de page, la photo
                // recule dans son cadre quand l'affiche sort par le haut —
                // menée par l'en-tête, pas par le cadre qui rogne.
                const recul = await p.evaluate(async () => {
                    const img = document.querySelector('#en-tete .affiche-cadre img');
                    const lu = () => getComputedStyle(img).translate;
                    const haut = lu();
                    document.documentElement.style.scrollBehavior = 'auto';
                    scrollTo(0, 250);
                    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                    const bas = lu();
                    scrollTo(0, 0);
                    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                    const a = document.getAnimations().find((x) => x.animationName === 'affiche-recul');
                    return { haut, bas, sujet: a && a.timeline && a.timeline.subject ? a.timeline.subject.id : null };
                });
                exige(/^(none|0px( 0(px|%))?)$/.test(recul.haut) && /%|px/.test(recul.bas) && recul.bas !== recul.haut && recul.sujet === 'en-tete',
                    `le portrait ne recule pas au défilement, ou pas mené par l’en-tête (en haut « ${recul.haut} », à 250 px « ${recul.bas} », suit ${recul.sujet})`);
                // Le visage se range dans le médaillon : un groupe à lui dans
                // le passage d'onglet, nommé juste avant, retiré juste après.
                await p.evaluate(() => {
                    const vus = window.__groupes = new Set();
                    const fin = performance.now() + 1500;
                    const pas = () => {
                        document.getAnimations().forEach((a) => a.effect && a.effect.pseudoElement && vus.add(a.effect.pseudoElement));
                        if (performance.now() < fin) requestAnimationFrame(pas);
                    };
                    requestAnimationFrame(pas);
                });
                await p.click('#tab-page_dates');
                // La fin du passage, et non un délai fixe : sur une machine
                // chargée, 900 ms ne suffisaient pas toujours à le finir.
                await p.waitForFunction(() => !document.documentElement.classList.contains('vt-onglet'), null, { timeout: 5000 }).catch(() => { });
                await p.waitForTimeout(300);
                const dates = await lire();
                exige(dates.replie && dates.l <= 100 && /50%|9\dpx|4\dpx/.test(dates.rond), `hors du CV, le portrait n’est pas redevenu un médaillon (${dates.l.toFixed(0)} px, ${dates.rond})`);
                const passage = await p.evaluate(() => ({
                    groupe: window.__groupes.has('::view-transition-group(portrait)'),
                    nom: document.querySelector('#en-tete .affiche-cadre').style.viewTransitionName,
                    cadrage: getComputedStyle(document.querySelector('#en-tete .affiche-cadre img')).objectPosition
                }));
                exige(passage.groupe && !passage.nom, `le portrait ne voyage pas jusqu’au médaillon (groupe ${passage.groupe ? 'présent' : 'absent'}, nom resté : « ${passage.nom} »)`);
                exige(passage.cadrage === '50% 28%', `le médaillon ne cadre pas le visage comme l’affiche (${passage.cadrage})`);
                exige(!erreurs.length, erreurs.join(' | '));
                await c.close();
            }
            // Arriver sur un autre onglet : le médaillon dès le premier rendu.
            const c = await visiteur({ viewport: { width: 1280, height: 900 } });
            const p = await c.newPage();
            await p.goto(base + '/#demos_voix', { waitUntil: 'domcontentloaded' });
            const l = await p.evaluate(() => document.querySelector('#en-tete .affiche-cadre').getBoundingClientRect().width);
            exige(l <= 100, `arrivée sur les démos voix : l’affiche est peinte avant de se replier (${l.toFixed(0)} px)`);
            // Le papier garde son en-tête, réglé pour que le CV tienne sur une page.
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.emulateMedia({ media: 'print' });
            const papier = await p.evaluate(() => ({
                l: document.querySelector('#en-tete .affiche-cadre').getBoundingClientRect().width,
                police: getComputedStyle(document.querySelector('#en-tete h1')).fontFamily
            }));
            exige(papier.l <= 72 && /Montserrat/.test(papier.police), `l’en-tête imprimé a changé (${papier.l.toFixed(0)} px, ${papier.police})`);
            await c.close();
        });

        // ── L'ARRIVÉE, LA BARRE, LES ONGLETS, LE VERRE ──
        // Le lien qu'on envoie à un théâtre (/#page_dates) montrait le CV,
        // puis repliait la bio sous les yeux : la page visée doit être là
        // avant que le script ne tourne (relevé à « interactive », juste
        // avant DOMContentLoaded), et rien ne doit glisser quand il pose les
        // vraies classes. Sur un écran où la barre est sous la ligne de
        // flottaison (390 × 664), elle se croyait collée au chargement — et
        // un saut d'en dessous de l'écran à au-dessus doit, lui, la coller ;
        // les onglets glissaient de la crème à leur couleur. Et rien de ce
        // qui défile au-dessus du fond fixe ne floute ce qui est derrière.
        await verifie('arriver par un lien vers un onglet le montre dès le premier rendu, sans CV ni repli qui glisse ; la barre ne se dit collée que sortie par le haut, les onglets naissent dans leur couleur, et rien de ce qui défile ne floute son arrière-plan', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 664 } });
            await c.addInitScript(() => {
                if (window.top !== window) return;   // la page, pas ses cadres
                window.__glisse = [];
                addEventListener('transitionrun', (e) => {
                    const t = e.target;
                    if (!t.closest) return;
                    const barre = t.closest('#nav-barre');
                    // Le repli lui-même (hauteur, visibilité) : l'opacité du
                    // bandeau suit aussi l'apparition des sections, sous
                    // `visibility: hidden` — elle ne se voit pas.
                    const repli = t.classList.contains('bio-collapse') && /grid-template-rows|visibility|margin|padding|border/.test(e.propertyName);
                    if (barre || repli) window.__glisse.push(`${t.id || t.className} ${e.propertyName}`);
                }, true);
                document.addEventListener('readystatechange', () => {
                    if (document.readyState !== 'interactive') return;
                    const vu = (id) => getComputedStyle(document.getElementById(id)).display !== 'none';
                    window.__avantScript = {
                        cv: vu('page_cv'), dates: vu('page_dates'),
                        bio: [...document.querySelectorAll('.bio-collapse')].filter((e) => getComputedStyle(e).visibility !== 'hidden').length,
                        onglets: [...document.querySelectorAll('#nav-tabs-container a')].map((a) => getComputedStyle(a).color)
                    };
                });
            });
            const lire = () => p.evaluate(() => ({
                avant: window.__avantScript, glisse: window.__glisse,
                onglets: [...document.querySelectorAll('#nav-tabs-container a')].map((a) => getComputedStyle(a).color),
                actif: document.querySelector('.page.active')?.id,
                drapeaux: document.documentElement.hasAttribute('data-arrivee') || document.documentElement.classList.contains('arrivee-hors-cv'),
                collee: document.getElementById('nav-barre').classList.contains('est-collee')
            }));
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/#page_dates', { waitUntil: 'load' });
            await p.waitForTimeout(700);
            const dates = await lire();
            exige(dates.avant && !dates.avant.cv && dates.avant.dates, `arrivée sur /#page_dates : avant le script, le CV ${dates.avant?.cv ? 'est affiché' : 'est caché'}, les Dates ${dates.avant?.dates ? 'aussi' : 'non'}`);
            exige(dates.avant.bio === 0, `arrivée sur /#page_dates : ${dates.avant.bio} repli(s) de la bio encore ouvert(s) avant le script`);
            exige(dates.actif === 'page_dates' && !dates.drapeaux, `arrivée sur /#page_dates : page ${dates.actif}, drapeaux d’arrivée ${dates.drapeaux ? 'restés' : 'retirés'}`);
            exige(dates.avant.onglets.join() === dates.onglets.join(), `arrivée sur /#page_dates : les onglets changent de couleur au démarrage (${dates.avant.onglets.join(' / ')} → ${dates.onglets.join(' / ')})`);
            exige(!dates.glisse.length, `arrivée sur /#page_dates : ${dates.glisse.length} transition(s) au démarrage, dont ${dates.glisse.slice(0, 3).join(', ')}`);
            exige(!dates.collee, 'arrivée sur /#page_dates : la barre se dit collée');

            // Contre-épreuve : le script de la page ne démarre pas (Safari 12
            // ou 13 lit le garde du <head>, pas la syntaxe du reste). Les
            // drapeaux d'arrivée cachaient alors le CV pour toujours ; le
            // filet du <head> doit les retirer et rendre le CV.
            const c2 = await visiteur({ viewport: { width: 390, height: 664 } });
            await c2.route(/\/(univers|univers-montage|dates-live)\.js$/, (r) => r.fulfill({ contentType: 'text/javascript', body: '@' }));
            await c2.route((u) => u.href === base + '/', async (r) => {
                const rep = await r.fetch();
                const h = await rep.text();
                const blocs = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];
                const principal = blocs.reduce((a, m) => (m[1].length > a[1].length ? m : a));
                r.fulfill({ response: rep, body: h.slice(0, principal.index) + '<script>@' + h.slice(principal.index + 8) });
            });
            const p2 = await c2.newPage();
            await p2.goto(base + '/#page_dates', { waitUntil: 'load' });
            await p2.waitForTimeout(300);
            const panne = await p2.evaluate(() => ({
                cv: getComputedStyle(document.getElementById('page_cv')).display !== 'none',
                drapeaux: document.documentElement.hasAttribute('data-arrivee') || document.documentElement.classList.contains('arrivee-hors-cv')
            }));
            exige(panne.cv && !panne.drapeaux, `arrivée sur /#page_dates sans le script de la page : le CV ${panne.cv ? 'est là' : 'reste caché'}, drapeaux d’arrivée ${panne.drapeaux ? 'restés' : 'retirés'}`);
            await c2.close();

            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(700);
            const cv = await lire();
            exige(!cv.collee, 'au chargement, la barre sous la ligne de flottaison se dit collée');
            exige(cv.avant.onglets.join() === cv.onglets.join(), `les onglets changent de couleur au démarrage (${cv.avant.onglets.join(' / ')} → ${cv.onglets.join(' / ')})`);
            exige(!cv.glisse.length, `${cv.glisse.length} transition(s) de la barre ou de la bio au chargement, dont ${cv.glisse.slice(0, 3).join(', ')}`);
            const verre = await p.evaluate(async () => {
                const floues = [...document.querySelectorAll('.glass-card')]
                    .filter((e) => !e.closest('[role="dialog"]') && getComputedStyle(e).backdropFilter !== 'none').map((e) => e.id || e.tagName.toLowerCase());
                const fixe = getComputedStyle(document.body).backgroundAttachment;
                document.documentElement.style.scrollBehavior = 'auto';
                scrollTo(0, 1500);
                await new Promise((r) => setTimeout(r, 300));
                const barre = document.getElementById('nav-barre'), cs = getComputedStyle(barre);
                const fond = cs.backgroundColor.match(/[\d.]+/g).map(Number);
                return { floues, fixe, collee: barre.classList.contains('est-collee'), flouBarre: cs.backdropFilter, opaque: fond.length === 3 || fond[3] === 1 };
            });
            exige(!verre.floues.length, `${verre.floues.length} carte(s) qui défilent floutent leur arrière-plan : ${verre.floues.slice(0, 3).join(', ')}`);
            exige(!/fixed/.test(verre.fixe), 'le fond du <body> est redevenu fixe : un second calque plein écran');
            exige(verre.collee && verre.flouBarre === 'none' && verre.opaque, `la barre collée : ${verre.collee ? '' : 'pas collée, '}flou ${verre.flouBarre}, fond ${verre.opaque ? 'opaque' : 'translucide'}`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('les bandes-annonces du CV : la pastille ▶ joue la vidéo dans la salle noire, sur la page, sans la bobine de la bande démo', async () => {
            const c = await visiteur({ viewport: { width: 1280, height: 900 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForFunction(() => document.querySelectorAll('.cv-trailer-lien').length >= 2, null, { timeout: 8000 });
            const liens = await p.evaluate(() => [...document.querySelectorAll('.cv-trailer-lien')].map((a) => a.href));
            exige(liens.some((h) => /youtube\.com\/watch\?v=/.test(h)) && liens.some((h) => /vimeo\.com\/\d+/.test(h)), `les pastilles ne gardent pas leur lien vers la vidéo (${liens.join(' ')})`);
            const salle = () => p.evaluate(() => {
                const m = document.getElementById('video-modal');
                const peint = (t) => { const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false; };
                return {
                    ouverte: !m.hidden && +getComputedStyle(m).opacity > 0.9,
                    src: document.getElementById('video-iframe').getAttribute('src'),
                    bande: m.classList.contains('bande-annonce'),
                    bobine: getComputedStyle(m.querySelector('.bobine--noire')).display !== 'none',
                    titre: document.getElementById('video-modal-titre').textContent,
                    nom: m.getAttribute('aria-label'),
                    halo: [...m.querySelectorAll('.salle-halo canvas')].some(peint)
                };
            });
            for (const [plateforme, lecteur] of [['youtube.com', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?autoplay=1/], ['vimeo.com', /^https:\/\/player\.vimeo\.com\/video\/\d+\?autoplay=1&dnt=1$/]]) {
                const i = liens.findIndex((h) => h.includes(plateforme));
                const avant = c.pages().length;
                await p.locator('.cv-trailer-lien').nth(i).click();
                await p.waitForTimeout(1300);
                const e = await salle();
                exige(c.pages().length === avant, `${plateforme} : la bande-annonce s'ouvre encore dans un nouvel onglet`);
                exige(e.ouverte && lecteur.test(e.src || ''), `${plateforme} : la bande-annonce ne se joue pas dans la salle noire (${JSON.stringify(e)})`);
                exige(e.bande && !e.bobine && /^BANDE-ANNONCE · .+/.test(e.titre) && /bande-annonce — .+/.test(e.nom), `${plateforme} : la salle n'est pas habillée pour une bande-annonce (${JSON.stringify(e)})`);
                exige(e.halo, `${plateforme} : l'écran de la bande-annonce n'a pas son halo`);
                await p.keyboard.press('Escape');
                await p.waitForTimeout(700);
                exige(await p.evaluate(() => !document.getElementById('video-iframe').getAttribute('src')), `${plateforme} : la bande-annonce continue une fois la salle rallumée`);
            }
            // La bande démo retrouve sa salle : sa bobine, son titre.
            await p.evaluate(() => openVideoModal('GOeL5AMGb_s', 0));
            await p.waitForTimeout(1300);
            const demo = await salle();
            exige(!demo.bande && demo.bobine && demo.titre === 'LECTURE VIDÉO' && demo.nom === 'Lecture de la bande démo', `la bande démo ne retrouve pas sa salle après une bande-annonce (${JSON.stringify(demo)})`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('la salle de projection : la bobine lance chaque extrait à son début, la salle s’éteint, le halo suit l’extrait', async () => {
            const c = await visiteur({ viewport: { width: 1280, height: 900 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/#demos_camera', { waitUntil: 'load' });
            await p.waitForTimeout(1200);
            const salle = await p.evaluate(() => {
                const peint = (t) => { const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return true; return false; };
                return {
                    plans: [...document.querySelectorAll('#salle .bobine [data-salle-debut]')].map((b) => [b.querySelector('b').textContent, +b.dataset.salleDebut]),
                    halo: [...document.querySelectorAll('#salle .salle-halo canvas')].some(peint)
                };
            });
            exige(JSON.stringify(salle.plans) === JSON.stringify([['L’Homme moderne', 0], ['Le rapt', 81]]), `la bobine n’a pas les deux extraits à leur début (${JSON.stringify(salle.plans)})`);
            exige(salle.halo, 'le halo de la salle n’est pas peint');
            await p.click('#salle .bobine [data-salle-plan="1"]');
            await p.waitForTimeout(1300);
            const noire = await p.evaluate(() => {
                const m = document.getElementById('video-modal');
                const f = document.getElementById('video-iframe');
                return {
                    ouverte: !m.hidden && +getComputedStyle(m).opacity > 0.9,
                    src: f.getAttribute('src'),
                    courant: document.querySelector('#video-modal [data-salle-plan="1"]').getAttribute('aria-current')
                };
            });
            exige(noire.ouverte, 'la salle ne s’éteint pas');
            exige(/start=81/.test(noire.src) && /enablejsapi=1/.test(noire.src), `le lecteur ne part pas de 1:21 (${noire.src})`);
            exige(noire.courant === 'true', 'la bobine de la salle noire ne montre pas le plan en cours');
            // Le lecteur annonce qu'il en est à 0:05 : le plan en cours change.
            const suit = await p.evaluate(async () => {
                window.dispatchEvent(new MessageEvent('message', {
                    origin: 'https://www.youtube-nocookie.com',
                    data: JSON.stringify({ event: 'infoDelivery', info: { currentTime: 5 } })
                }));
                await new Promise((f) => setTimeout(f, 50));
                return document.querySelector('#video-modal [data-salle-plan="0"]').getAttribute('aria-current');
            });
            exige(suit === 'true', 'le halo ne suit pas l’extrait que le lecteur annonce');
            await p.keyboard.press('Escape');
            await p.waitForTimeout(600);
            exige(await p.evaluate(() => !document.getElementById('video-iframe').getAttribute('src')), 'le lecteur continue une fois la salle rallumée');
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('la photo dans la lettre : le titre posé détoure la photo, le récit s’écrit, puis on entre dans la photo par une lettre — avec les deux pilotes ; posée d’emblée en mouvement réduit', async () => {
            const cas = [['berenice', '', 390], ['alabarre', '', 390], ['cleophene', '', 1280], ['hommemoderne', '?repli', 390]];
            for (const [slug, q, largeur] of cas) {
                const c = await visiteur({ viewport: { width: largeur, height: largeur > 1000 ? 800 : 844 }, hasTouch: largeur < 1000 });
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(`${base}/spectacles/${slug}/${q}`, { waitUntil: 'load' });
                await p.waitForFunction(() => document.querySelector('.u-lettre'), null, { timeout: 8000 });
                await p.waitForTimeout(400);
                const etat = await p.evaluate(async () => {
                    const S = document.getElementById('show-universe');
                    const scene = S.querySelector('.u-ouverture');
                    const svg = scene.querySelector('.u-lettre');
                    const mot = svg.querySelector('.u-lettre-mot');
                    const plein = svg.querySelector('.u-lettre-plein');
                    const dort = (ms) => new Promise((f) => setTimeout(f, ms));
                    const v = (k) => parseFloat(getComputedStyle(scene).getPropertyValue('--of-' + k));
                    const aller = async (f) => { S.scrollTop = scene.offsetTop + (scene.offsetHeight - S.clientHeight) * f; await dort(350); };
                    const echelle = () => { const m = getComputedStyle(mot).transform; return m === 'none' ? 1 : +m.slice(7).split(',')[0]; };
                    const op = (e) => +getComputedStyle(e).opacity;
                    const zone = scene.querySelector('.u-of-titre');
                    const textes = ['.u-eyebrow', '.u-couche-auteur', '.u-synopsis', '.u-couche-actions'].map((s) => zone.querySelector(s)).filter(Boolean);
                    // Chaque lettre du masque est posée sur sa lettre du titre.
                    const titre = zone.querySelector('.u-title');
                    const chars = [...titre.querySelectorAll('.u-ch')].filter((ch) => ch.textContent.trim());
                    const pos = (el) => { let x = 0; for (let n = el; n; n = n.offsetParent) x += n.offsetLeft; return x; };
                    const x0 = pos(zone.querySelector('.u-hero-wrap'));
                    const ecarts = [...mot.querySelectorAll('text')].map((t, i) => Math.abs(+t.getAttribute('x') - (pos(chars[i]) - x0)));
                    const out = { lettres: mot.querySelectorAll('text').length, chars: chars.length, ecart: Math.max(...ecarts), z: parseFloat(svg.style.getPropertyValue('--lettre-z')) };
                    // La photo où l'on entre n'est pas la première du montage
                    // (celle qui s'allume juste après le carton) : on l'aurait
                    // vue deux fois de suite.
                    const numero = (u) => (/\/(\d+)-[^/]*$/.exec(u || '') || [])[1];
                    out.photos = [numero(svg.querySelector('image').getAttribute('href')), numero(S.querySelector('.u-figs img')?.getAttribute('src'))];
                    // Le vrai titre, sous ses lettres de photo : visible en
                    // plein travelling, effacé une fois qu'elles l'ont
                    // remplacé — sinon la porte qui s'ouvre le découvre.
                    const mots = () => Math.max(...[...titre.querySelectorAll('.u-word')].map(op));
                    await aller(v('titre') * 0.5);
                    out.avant = op(svg);
                    out.titreAvant = mots();
                    await aller(v('lettre-e') + 0.005);
                    const aides = () => Math.min(...[...svg.querySelectorAll('.u-lettre-aide')].map(op));
                    out.pose = { calque: op(svg), echelle: echelle(), plein: op(plein), titre: mots(), aides: aides() };
                    // Le calque est peint après tout le haut de la page, hors
                    // de sa profondeur : sinon, sur téléphone, les textes
                    // repassaient par-dessus la photo au bout du zoom.
                    out.horsProfondeur = svg.parentElement.classList.contains('u-of-scene') && +getComputedStyle(svg).zIndex > 0;
                    await aller(v('zoom-s') + (v('zoom-e') - v('zoom-s')) * 0.5);
                    out.titreZoom = mots();
                    // La salle s'est éteinte sous la photo avant que la photo
                    // entière prenne le relais : rien ne transparaît. Et la
                    // lettre reste d'une taille qu'un téléphone sait
                    // dessiner en masque : au-delà, la photo s'y en allait
                    // par carreaux.
                    const nuit = svg.querySelector('.u-lettre-nuit');
                    await aller(v('zoom-s') + (v('zoom-e') - v('zoom-s')) * 0.83);
                    const corps = +mot.querySelector('text').getAttribute('font-size') * out.z;
                    out.eteinte = { nuit: nuit ? op(nuit) : 0, plein: op(plein), corps: Math.round(corps), tactile: matchMedia('(pointer: coarse)').matches };
                    await aller(v('fleche-e') + 0.005);
                    out.recit = { echelle: echelle(), textes: Math.min(...textes.map(op)), nuit: nuit ? op(nuit) : 1 };
                    await aller(Math.min(0.999, v('zoom-e') + 0.01));
                    const r = plein.getBoundingClientRect(), e = S.getBoundingClientRect();
                    out.fin = { aides: Math.max(...[...svg.querySelectorAll('.u-lettre-aide')].map(op)), echelle: echelle(), plein: op(plein), couvre: r.left <= e.left + 1 && r.top <= e.top + 1 && r.right >= e.right - 1 && r.bottom >= e.bottom - 1 };
                    return out;
                });
                const ou = `${slug}${q} à ${largeur} px`;
                // La porte ouverte couvre l'écran avant que la photo entière
                // la double : la salle, repeinte en magenta, ne se voit
                // nulle part sur une capture.
                const salle = await p.evaluate(async () => {
                    const S = document.getElementById('show-universe');
                    const scene = S.querySelector('.u-ouverture');
                    const v = (k) => parseFloat(getComputedStyle(scene).getPropertyValue('--of-' + k));
                    S.scrollTop = scene.offsetTop + (scene.offsetHeight - S.clientHeight) * (v('zoom-s') + (v('zoom-e') - v('zoom-s')) * 0.955);
                    await new Promise((f) => setTimeout(f, 350));
                    scene.querySelector('.u-lettre-nuit').style.fill = '#f0f';
                    await new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(f)));
                    return +getComputedStyle(scene.querySelector('.u-lettre-plein')).opacity;
                });
                const capture = (await p.screenshot()).toString('base64');
                const magenta = await p.evaluate(async (b64) => {
                    const img = new Image();
                    img.src = 'data:image/png;base64,' + b64;
                    await img.decode();
                    const cv = document.createElement('canvas');
                    cv.width = img.width; cv.height = img.height;
                    const ctx = cv.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
                    let n = 0;
                    for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] > 200) n++;
                    return n / (d.length / 4);
                }, capture);
                exige(salle < 0.05 && magenta < 0.002, `${ou} : la porte ouverte ne couvre pas l'écran avant la photo entière — des pans de salle restent (${(magenta * 100).toFixed(2)} % de l'écran, photo entière à ${salle})`);
                exige(etat.lettres === etat.chars && etat.ecart < 1, `${ou} : le masque ne suit pas les lettres du titre (${etat.lettres}/${etat.chars}, écart ${etat.ecart.toFixed(2)} px)`);
                exige(etat.photos[0] && etat.photos[0] !== etat.photos[1], `${ou} : on entre par la lettre dans la première photo du montage — vue deux fois de suite (${etat.photos.join(' / ')})`);
                exige(etat.avant < 0.05, `${ou} : la photo paraît dans les lettres en plein travelling (${etat.avant})`);
                exige(etat.titreAvant > 0.95, `${ou} : le titre ne se voit pas en plein travelling (${etat.titreAvant})`);
                exige(etat.pose.titre < 0.05 && etat.titreZoom < 0.05, `${ou} : le vrai titre reste visible sous ses lettres de photo — un second titre derrière la photo quand la lettre s'ouvre (${etat.pose.titre} posé, ${etat.titreZoom} en plein zoom)`);
                exige(etat.pose.calque > 0.95 && Math.abs(etat.pose.echelle - 1) < 0.01 && etat.pose.plein < 0.05, `${ou} : le titre posé ne détoure pas la photo (${JSON.stringify(etat.pose)})`);
                exige(etat.pose.aides > 0.95, `${ou} : le titre posé n'a pas son voile et son filet de lecture (${etat.pose.aides})`);
                exige(etat.horsProfondeur, `${ou} : le calque de la lettre est dans la profondeur du haut de la page — les textes peuvent repasser par-dessus la photo`);
                exige(etat.fin.aides < 0.05, `${ou} : le voile et le filet restent sur la photo au bout du zoom (${etat.fin.aides})`);
                exige(etat.eteinte.nuit > 0.95 && etat.eteinte.plein < 0.05, `${ou} : la salle n'est pas éteinte sous la photo avant le relais de la photo entière — les textes peuvent transparaître au bout du zoom (${JSON.stringify(etat.eteinte)})`);
                exige(largeur > 1000 || (etat.eteinte.tactile && etat.eteinte.corps <= 2410), `${ou} : sur un écran tactile, la lettre grandit au-delà de ce qu'un téléphone sait dessiner en masque (${JSON.stringify(etat.eteinte)})`);
                exige(etat.recit.nuit < 0.05, `${ou} : la salle s'éteint avant que la lettre s'ouvre (${etat.recit.nuit})`);
                exige(Math.abs(etat.recit.echelle - 1) < 0.01 && etat.recit.textes > 0.95, `${ou} : le zoom commence avant que le récit soit écrit (${JSON.stringify(etat.recit)})`);
                exige(Math.abs(etat.fin.echelle - etat.z) < 0.5 && etat.fin.plein > 0.95 && etat.fin.couvre, `${ou} : au bout, la photo ne remplit pas l’écran (${JSON.stringify(etat.fin)})`);
                exige(!erreurs.length, erreurs.join(' | '));
                await c.close();
            }
            const c = await visiteur({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
            const p = await c.newPage();
            await p.goto(`${base}/spectacles/berenice/`, { waitUntil: 'load' });
            await p.waitForFunction(() => document.querySelector('.u-lettre'), null, { timeout: 8000 });
            const calme = await p.evaluate(() => {
                const svg = document.querySelector('.u-lettre');
                return { calque: +getComputedStyle(svg).opacity, mot: getComputedStyle(svg.querySelector('.u-lettre-mot')).transform, plein: +getComputedStyle(svg.querySelector('.u-lettre-plein')).opacity, nuit: +getComputedStyle(svg.querySelector('.u-lettre-nuit')).opacity };
            });
            exige(calque(calme), `en mouvement réduit, le titre ne détoure pas la photo, posé (${JSON.stringify(calme)})`);
            await c.close();
            function calque(k) { return k.calque === 1 && k.mot === 'none' && k.plein === 0 && k.nuit === 0; }
        });

        await verifie('la fiche de casting : le profil en lignes étiquetées, le chant et le piano sur la même, moins haut au téléphone', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 844 } });
            const p = await c.newPage();
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(500);
            const etat = await p.evaluate(() => {
                const f = document.querySelector('#page_cv dl.fiche.cv-fiche');
                if (!f) return null;
                const duo = [...f.querySelectorAll('.fiche-duo > span b')].map((b) => b.textContent);
                return {
                    rubriques: [...f.querySelectorAll(':scope > div > dt')].map((d) => d.textContent.trim()),
                    duo,
                    memeLigne: f.querySelector('.fiche-duo')?.closest('div')?.parentElement === f,
                    hauteur: f.closest('section').getBoundingClientRect().height
                };
            });
            exige(etat, 'la fiche du profil a disparu (dl.fiche.cv-fiche)');
            exige(etat.rubriques.length === 6, `${etat.rubriques.length} rubrique(s) : ${etat.rubriques.join(', ')}`);
            exige(etat.duo.join('|') === 'Chant|Piano' && etat.memeLigne, 'le chant et le piano ne sont plus sur la même ligne');
            exige(etat.hauteur < 650, `le profil fait ${etat.hauteur.toFixed(0)} px au téléphone`);
            await c.close();
        });

        await verifie('la page 404 : la servante, lisible, sans erreur', async () => {
            const c = await visiteur();
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/404.html', { waitUntil: 'load' });
            const etat = await p.evaluate(() => ({
                titre: document.querySelector('h1')?.textContent || '',
                retour: document.querySelector('a.retour')?.getAttribute('href'),
                lampe: !!document.querySelector('.ampoule')
            }));
            exige(/affiche/.test(etat.titre) && etat.retour === '/' && etat.lampe, 'la page 404 a perdu son titre, son retour ou sa lampe');
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('ce que l’accueil demande d’abord : Cinzel d’avance, rien de caché avant le portrait, la plume après le chargement, la signature à l’ouverture de la lettre', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
            const p = await c.newPage();
            const erreurs = guette(p);
            const demandes = [];
            let charge = false;
            p.on('request', (r) => demandes.push({ url: r.url(), avantLoad: !charge }));
            p.on('load', () => { charge = true; });
            await p.goto(base + '/', { waitUntil: 'load' });
            const tot = demandes.filter((d) => d.avantLoad).map((d) => d.url);
            exige(await p.evaluate(() => !!document.querySelector('link[rel="preload"][as="font"][href$="/cinzel-latin.woff2"][crossorigin]')),
                'Cinzel n’est pas demandée d’avance : le nom s’afficherait en police de secours');
            const cachees = tot.filter((u) => /signature-\d\.webp|bande-demo-camera|caveat-/.test(u));
            exige(!cachees.length, `parti avant la fin du chargement sans être à l’écran : ${cachees.map((u) => u.split('/').pop()).join(', ')}`);
            // La plume vient au calme, après load : l'aperçu la reçoit.
            await p.waitForFunction(() => document.querySelector('.recit-extrait')?.classList.contains('plume'), null, { timeout: 5000 })
                .catch(() => { throw new Error('l’aperçu de la lettre ne reçoit jamais sa plume (Caveat)'); });
            // La lettre ouverte demande sa signature tout de suite.
            await p.evaluate(() => document.querySelector('[data-recit-ouvrir]').click());
            await p.waitForFunction(() => [...document.querySelectorAll('.recit-signature img')].every((i) => i.complete && i.naturalWidth), null, { timeout: 5000 })
                .catch(() => { throw new Error('la signature n’est pas chargée à l’ouverture de la lettre'); });
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        await verifie('la mesure attend : un chargeur partout et jamais un script différé, les gestes d’avant Umami en file, rien d’une page pré-rendue — ni vue, ni titre écrit', async () => {
            // Chaque page publique charge Umami par le chargeur, avant ses feuilles.
            const pages = ['index.html', '404.html', 'galerie/index.html', 'spectacles/index.html']
                .concat(dossiers.map((d) => `spectacles/${d}/index.html`));
            for (const f of pages) {
                const h = fs.readFileSync(path.join(RACINE, f), 'utf8');
                exige(!/<script[^>]*\bsrc="https:\/\/cloud\.umami\.is/.test(h), `${f} : Umami en balise, que DOMContentLoaded attend`);
                exige(/document\.prerendering\)\s*document\.addEventListener\('prerenderingchange', charger/.test(h), `${f} : pas de chargeur de mesure`);
                const debut = h.indexOf("s.src = 'https://cloud.umami.is/script.js'"), feuille = h.search(/<link rel="stylesheet"/);
                exige(feuille < 0 || debut < feuille, `${f} : le chargeur suit une feuille de style, qu'il attendrait`);
            }
            // Umami n'arrive pas ici (rien ne sort) : « entree » attend en file.
            const c = await visiteur();
            const p = await c.newPage();
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(300);
            const accueil = await p.evaluate(() => ({
                file: (window.avMesureEnAttente || []).map((g) => g[0]),
                balise: (() => { const s = document.querySelector('script[src="https://cloud.umami.is/script.js"]'); return s && s.async && s.dataset.beforeSend === 'avAvantEnvoi' && s.dataset.domains === 'adrienvada.fr'; })()
            }));
            exige(accueil.balise, 'la balise insérée par le chargeur n’a pas ses attributs (async, data-domains, data-before-send)');
            exige(accueil.file.includes('entree') && accueil.file.length <= 20, `les gestes d’avant Umami ne sont pas mis en file (${accueil.file.join(', ')})`);
            await c.close();
            // Une page pré-rendue ne charge pas Umami et n'écrit pas son
            // titre avant d'être montrée. (Le vrai pré-rendu est refusé à un
            // navigateur piloté ; on joue ses deux signaux.)
            const c2 = await visiteur();
            await c2.addInitScript(() => {
                let pr = true;
                Object.defineProperty(document, 'prerendering', { get: () => pr, configurable: true });
                window.__montrer = () => { pr = false; document.dispatchEvent(new Event('prerenderingchange')); };
            });
            const p2 = await c2.newPage();
            const erreurs = guette(p2);
            await p2.goto(base + `/spectacles/${dossiers[0]}/`, { waitUntil: 'load' });
            await p2.waitForTimeout(1500);
            const cache = await p2.evaluate(() => ({
                umami: !!document.querySelector('script[src*="cloud.umami.is"]'),
                ecrites: document.querySelectorAll('.u-hero .u-ch.is-lit').length
            }));
            exige(!cache.umami, 'une page pré-rendue charge Umami avant d’être montrée : elle compterait une vue');
            exige(cache.ecrites === 0, `une page pré-rendue écrit son titre avant d’être montrée (${cache.ecrites} lettres)`);
            await p2.evaluate(() => window.__montrer());
            await p2.waitForTimeout(1200);
            const montre = await p2.evaluate(() => ({
                umami: !!document.querySelector('script[src*="cloud.umami.is"]'),
                ecrites: document.querySelectorAll('.u-hero .u-ch.is-lit').length
            }));
            exige(montre.umami && montre.ecrites > 0, `montrée, la page ne charge pas Umami ou n’écrit pas son titre (${JSON.stringify(montre)})`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c2.close();
        });

        await verifie('la publication : l’accueil reçoit ses deux feuilles dans la page, ses règles de spéculation se relisent et restent modérées', async () => {
            const { integrerFeuilles, verifierHtml } = require('./alleger-publication.js');
            const source = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
            const integre = integrerFeuilles(source, (f) => fs.readFileSync(path.join(RACINE, f), 'utf8'));
            exige(!/<link rel="stylesheet" href="(styles\.css|\/ressources\/polices\/polices\.css)"/.test(integre), 'une feuille de l’accueil est restée en <link>');
            exige(/url\(\/ressources\/polices\/cinzel-latin\.woff2\)/.test(integre), 'les adresses des polices ne sont pas devenues absolues');
            verifierHtml(source, source, 'index.html');   // lève si les règles ne se relisent pas
            const regles = [...source.matchAll(/<script type="speculationrules">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
            exige(regles.length === 1, `${regles.length} jeu(x) de règles de spéculation, 1 attendu`);
            const toutes = [].concat(...['prerender', 'prefetch'].map((k) => regles[0][k] || []));
            exige(toutes.length && toutes.every((r) => r.eagerness === 'moderate'), 'une règle de spéculation n’est pas « moderate » : elle préparerait des pages pour rien');
        });

        await verifie('les pages générées s’affichent sans attendre : la fiche ouverte d’emblée, peinte avant son moteur ; le répertoire et la galerie sans feuille à attendre ; des icônes en PNG ; les pages voisines préparées au survol, en « moderate »', async () => {
            const publiques = ['index.html', '404.html', 'galerie/index.html', 'spectacles/index.html']
                .concat(dossiers.map((d) => `spectacles/${d}/index.html`));
            for (const f of publiques) {
                const h = fs.readFileSync(path.join(RACINE, f), 'utf8');
                exige(!/<link[^>]*favicon\.svg/.test(h), `${f} : déclare encore favicon.svg (128 Ko pour une icône de 16 px)`);
                exige(/favicon-32x32\.png/.test(h) && /favicon-96x96\.png/.test(h), `${f} : pas d’icône PNG de 32 et 96 px`);
            }
            for (const d of dossiers) {
                const h = fs.readFileSync(path.join(RACINE, `spectacles/${d}/index.html`), 'utf8');
                exige(/<main id="show-universe" class="is-open">/.test(h), `spectacles/${d} : le panneau n’est pas écrit ouvert — Chrome n’y verrait aucun premier affichage`);
            }
            for (const f of ['spectacles/index.html', 'galerie/index.html']) {
                const h = fs.readFileSync(path.join(RACINE, f), 'utf8');
                exige(!/<link rel="stylesheet"/.test(h), `${f} : une feuille est restée en <link>, à attendre avant le premier affichage`);
                exige(/url\(\.\.\/ressources\/polices\/cinzel-latin\.woff2\)/.test(h), `${f} : les polices ne sont pas dans la page, ou leurs adresses ne mènent pas au dossier`);
                // Le titre attend Cinzel au lieu de paraître en repli, puis
                // de sauter aux petites capitales ; les autres polices, non.
                const faces = [...h.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
                const cinzel = faces.filter((x) => /'Cinzel'/.test(x));
                exige(cinzel.length && cinzel.every((x) => /font-display: block/.test(x)) && faces.filter((x) => !/'Cinzel'/.test(x)).every((x) => /font-display: swap/.test(x)),
                    `${f} : Cinzel n’est pas en font-display: block (ou une autre police l’est)`);
            }
            for (const f of ['spectacles/spectacle.css', 'galerie/galerie.css']) {
                exige(!fs.existsSync(path.join(RACINE, f)), `${f} existe encore : plus rien ne la lit`);
            }
            for (const f of ['galerie/index.html', 'spectacles/index.html', `spectacles/${dossiers[0]}/index.html`]) {
                const h = fs.readFileSync(path.join(RACINE, f), 'utf8');
                const regles = [...h.matchAll(/<script type="speculationrules">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
                exige(regles.length === 1, `${f} : ${regles.length} jeu(x) de règles de spéculation, 1 attendu`);
                const cibles = (k) => (regles[0][k] || []).flatMap((r) => (r.where.or || [r.where]).map((w) => w.href_matches)).sort().join(' ');
                exige([].concat(regles[0].prerender || [], regles[0].prefetch || []).every((r) => r.eagerness === 'moderate'), `${f} : une règle n’est pas « moderate »`);
                exige(cibles('prerender') === '/galerie/ /spectacles/*/', `${f} : pré-rendu de « ${cibles('prerender')} »`);
                exige(cibles('prefetch') === '/ /spectacles/', `${f} : préchargement de « ${cibles('prefetch')} »`);
            }
            // Le moteur retenu 2,5 s : la fiche est déjà peinte, et Chrome l'a vue.
            const c = await visiteur({ viewport: { width: 390, height: 844 } });
            await c.route(/\/univers\.js$/, async (r) => { await new Promise((f) => setTimeout(f, 2500)); r.continue().catch(() => { }); });
            const p = await c.newPage();
            await p.goto(`${base}/spectacles/${dossiers[0]}/`, { waitUntil: 'commit' });
            await p.waitForTimeout(1500);
            const avant = await p.evaluate(() => ({
                moteur: !!window.__universPret,
                fcp: performance.getEntriesByName('first-contentful-paint').length,
                opacite: getComputedStyle(document.getElementById('show-universe')).opacity
            }));
            exige(!avant.moteur, 'le moteur a démarré malgré le retard : l’épreuve ne prouve rien');
            exige(avant.opacite === '1' && avant.fcp === 1, `avant le moteur, la fiche est ${avant.opacite === '1' ? 'visible' : 'invisible'} et ${avant.fcp ? '' : 'sans '}premier affichage`);
            await c.close();
        });

        await verifie('les passages entre documents atterrissent sur ce qu’on voit : la carte du répertoire dans la première photo du travelling, le portrait de l’accueil dans la première vue de la planche, et retour — rien de nommé en mouvement réduit', async () => {
            // Ce qui porte un nom au moment où le passage se prépare.
            const noter = () => {
                if (window !== top) return;   // les cadres vides de l'accueil partagent son stockage
                const relever = (type, e) => {
                    const noms = [...document.querySelectorAll('*')].filter((el) => {
                        const n = getComputedStyle(el).viewTransitionName;
                        return n && n !== 'none' && el !== document.documentElement;
                    }).map((el) => `${getComputedStyle(el).viewTransitionName}@${el.matches('.u-of-photo') ? 'photo' : el.matches('.u-hero-fond') ? 'fond' : el.matches('.carte .media img') ? 'vignette' : el.matches('.affiche-cadre') ? 'affiche' : el.tagName}`);
                    // La paire d'images de chaque nom rogne-t-elle à sa boîte ?
                    // Une image de passage ne rogne pas ce qui déborde de son
                    // cadrage (object-fit: cover).
                    const rognes = noms.map((n) => e.viewTransition ? getComputedStyle(document.documentElement, `::view-transition-image-pair(${n.split('@')[0]})`).overflow : '');
                    // Ce qui se pose sur l'affiche attend, invisible, que le
                    // portrait revenu de la galerie s'y soit posé.
                    const pastille = document.querySelector('#en-tete .affiche-galerie');
                    const attend = pastille ? getComputedStyle(pastille).opacity : null;
                    try { sessionStorage.setItem('__vt-' + type, JSON.stringify({ vt: !!e.viewTransition, noms, rognes, attend, page: location.pathname })); } catch (x) { }
                };
                addEventListener('pagereveal', (e) => { if (e.viewTransition) e.viewTransition.ready.then(() => relever('reveal', e), () => relever('reveal', e)); else relever('reveal', e); });
            };
            const lire = (p) => p.evaluate(() => JSON.parse(sessionStorage.getItem('__vt-reveal') || 'null'));
            const c = await visiteur({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
            await c.addInitScript(noter);
            const p = await c.newPage();
            await p.goto(`${base}/spectacles/`, { waitUntil: 'load' });
            await p.waitForTimeout(400);
            await p.evaluate(() => document.querySelector('a[href="lerapt/"]').scrollIntoView({ block: 'center' }));
            await p.click('a[href="lerapt/"]');
            await p.waitForURL(/lerapt/);
            await p.waitForTimeout(1200);
            const fiche = await lire(p);
            exige(fiche && fiche.vt, 'répertoire → fiche : pas de passage');
            exige(fiche.noms.join() === 'fiche-lerapt@photo', `répertoire → fiche : ${fiche.noms.join(', ') || 'rien'} nommé, au lieu de la première photo du travelling`);
            exige(fiche.rognes.join() === 'clip', `répertoire → fiche : la photo, en paysage, déborde de la carte en portrait (overflow ${fiche.rognes.join()})`);
            await p.goto(`${base}/?direct`, { waitUntil: 'load' });
            await p.waitForTimeout(800);
            await p.click('a.affiche-portrait');
            await p.waitForURL(/galerie/);
            await p.waitForTimeout(1200);
            const planche = await lire(p);
            exige(planche && planche.vt && planche.noms.join() === 'book-portrait@vignette', `accueil → galerie : ${JSON.stringify(planche)}`);
            await p.goBack();
            await p.waitForTimeout(1200);
            const retour = await lire(p);
            exige(retour && retour.page === '/' && retour.vt && retour.noms.join() === 'book-portrait@affiche', `galerie → accueil : ${JSON.stringify(retour)}`);
            exige(retour.attend === '0', `galerie → accueil : la pastille « Galerie photo » reste sous la photo qui revient (opacité ${retour.attend}), et claquera à la fin`);
            const restants = await p.evaluate(() => [...document.querySelectorAll('[style*="view-transition-name"]')].filter((el) => el.style.viewTransitionName).length
                + document.documentElement.classList.contains('vt-book-retour'));
            exige(!restants, `${restants} nom(s) de passage — ou vt-book-retour — restés posés après le retour`);
            await c.close();
            // Mouvement réduit : la galerie ne nomme rien.
            const r = await visiteur({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
            await r.addInitScript(noter);
            const pr = await r.newPage();
            await pr.goto(`${base}/?direct`, { waitUntil: 'load' });
            await pr.waitForTimeout(800);
            await pr.click('a.affiche-portrait');
            await pr.waitForURL(/galerie/);
            await pr.waitForTimeout(1000);
            const reduit = await lire(pr);
            exige(reduit && !reduit.noms.length, `en mouvement réduit, la galerie nomme ${reduit && reduit.noms.join(', ')}`);
            await r.close();
        });

        await verifie('la galerie : le premier écran part avec la page, la plus grande vue devant, chacune à sa taille et une seule fois — au téléphone comme à l’ordinateur ; les vues s’allument en fondu, et sans JavaScript elles sont là', async () => {
            const h = fs.readFileSync(path.join(RACINE, 'galerie/index.html'), 'utf8');
            const imgs = [...h.matchAll(/<picture><source[^>]*sizes="([^"]*)"[^>]*><img([^>]*)>/g)];
            const paresseuses = imgs.map((m) => /loading="lazy"/.test(m[2]));
            exige(imgs.length >= 10 && paresseuses.slice(0, 9).every((x) => !x) && paresseuses.slice(9).every((x) => x), 'les neuf premières vues ne partent pas avec la page, ou les suivantes n’attendent pas');
            const devant = imgs.filter((m) => /fetchpriority="high"/.test(m[2])).length;
            exige(devant >= 1 && devant <= 2, `${devant} vue(s) en priorité haute`);
            exige(imgs.every((m) => /^\(max-width: [\d.]+px\) calc\(100vw \* [\d.]+\), calc\(min\(100vw, 68rem\) \* [\d.]+\)$/.test(m[1])), 'les tailles écrites ne disent pas les deux planches (quatre colonnes au téléphone, cinq au-delà)');
            for (const [vue, dpr, mobile] of [[{ width: 390, height: 844 }, 3, true], [{ width: 412, height: 915 }, 1.75, true], [{ width: 1440, height: 900 }, 1, false]]) {
                const c = await visiteur({ viewport: vue, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
                const p = await c.newPage();
                const demandes = [];
                p.on('request', (q) => { const m = q.url().match(/vignettes\/(.+)-(\d+)\.webp$/); if (m) demandes.push(m[1]); });
                const erreurs = guette(p);
                await p.goto(base + '/galerie/', { waitUntil: 'load' });
                await p.waitForTimeout(900);
                const doublons = demandes.filter((v, i) => demandes.indexOf(v) !== i);
                exige(!doublons.length, `à ${vue.width} px (×${dpr}) : ${doublons.join(', ')} téléchargée(s) deux fois`);
                const etat = await p.evaluate(() => {
                    const vues = [...document.querySelectorAll('.carte .media img')].slice(0, 9);
                    return { eteintes: vues.filter((i) => !i.classList.contains('est-decodee') || getComputedStyle(i).opacity !== '1').length };
                });
                exige(!etat.eteintes, `à ${vue.width} px : ${etat.eteintes} vue(s) du premier écran restées éteintes`);
                exige(!erreurs.length, erreurs.join(' | '));
                await c.close();
            }
            const s = await visiteur({ javaScriptEnabled: false });
            const ps = await s.newPage();
            await ps.goto(base + '/galerie/', { waitUntil: 'load' });
            const cachees = await ps.evaluate(() => [...document.querySelectorAll('.carte .media img')].filter((i) => getComputedStyle(i).opacity !== '1').length);
            exige(!cachees, `sans JavaScript, ${cachees} vue(s) de la planche sont invisibles`);
            await s.close();
        });

        await verifie('le service worker ne garde que les polices et les images : ni page, ni script, ni feuille, ni dates ; inscrit par chaque page publique, pas par /admin/ ni sur l’aperçu Cloudflare, et il sait se retirer', async () => {
            const sw = fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8');
            exige(/const RETIRE = false;/.test(sw) && /self\.registration\.unregister\(\)/.test(sw), 'sw.js : l’interrupteur (RETIRE, et la désinscription) a disparu — ou il est baissé');
            // Les polices gardées à l'installation sont celles que l'accueil
            // précharge, et elles seules : Caveat, demandée après la page,
            // serait téléchargée par la première page venue, qui ne
            // l'emploie pas.
            const installees = ((/const POLICES = \[([^\]]*)\]/.exec(sw) || [])[1] || '').match(/[\w-]+/g) || [];
            const prechargees = [...fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8')
                .matchAll(/<link rel="preload" href="\/ressources\/polices\/([\w-]+)\.woff2"/g)].map((m) => m[1]);
            exige(installees.length && installees.sort().join() === prechargees.sort().join(),
                `sw.js garde à l’installation ${installees.join(', ') || 'rien'} ; l’accueil précharge ${prechargees.join(', ')}`);
            const publiques = ['index.html', '404.html', 'galerie/index.html', 'spectacles/index.html']
                .concat(dossiers.map((d) => `spectacles/${d}/index.html`));
            for (const f of publiques) {
                const h = fs.readFileSync(path.join(RACINE, f), 'utf8');
                exige(/navigator\.serviceWorker\.register\('\/sw\.js'\)/.test(h), `${f} : n’inscrit pas le service worker`);
                // Pas sur l'aperçu Cloudflare, où l'on recharge après chaque
                // poussée : une photo remplacée y paraissait ancienne.
                exige(h.includes('/\\.workers\\.dev$/.test(location.hostname)'), `${f} : inscrit le service worker sur l’aperçu Cloudflare (.workers.dev)`);
            }
            exige(!/serviceWorker/.test(fs.readFileSync(path.join(RACINE, 'admin/index.html'), 'utf8')), '/admin/ inscrit le service worker');
            const c = await visiteur({ viewport: { width: 390, height: 844 } });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/?direct', { waitUntil: 'load' });
            await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 8000 });
            await p.waitForTimeout(800);
            await p.goto(`${base}/spectacles/${dossiers[0]}/`, { waitUntil: 'load' });
            await p.waitForTimeout(1200);
            const etat = await p.evaluate(async () => {
                const noms = await caches.keys();
                const gardees = [];
                for (const n of noms) (await (await caches.open(n)).keys()).forEach((r) => gardees.push(new URL(r.url).pathname));
                const nav = performance.getEntriesByType('navigation')[0];
                const parLui = performance.getEntriesByType('resource')
                    .filter((r) => r.workerStart > 0 && r.workerMatchedSourceType !== 'network')
                    .map((r) => new URL(r.name).pathname);
                return { noms, gardees, nav: nav.workerStart > 0 && nav.workerMatchedSourceType !== 'network', parLui };
            });
            const permis = /^\/ressources\/(polices|images)\/[^?#]*\.(woff2|webp|jpe?g|png|avif|gif|svg)$/;
            exige(etat.noms.length === 1 && /^av-statique-v\d+$/.test(etat.noms[0]), `caches : ${etat.noms.join(', ')}`);
            exige(etat.gardees.length >= 4, `le service worker n’a presque rien gardé (${etat.gardees.length})`);
            const intrus = etat.gardees.filter((u) => !permis.test(u));
            exige(!intrus.length, `le service worker garde ${intrus.join(', ')}`);
            exige(!etat.nav, 'la page elle-même est passée par le service worker');
            const detournes = etat.parLui.filter((u) => !/^\/ressources\/(polices|images)\//.test(u));
            exige(!detournes.length, `passés par le service worker : ${detournes.join(', ')}`);
            exige(!erreurs.length, erreurs.join(' | '));
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

        // LES VARIANTES QUI DÉPENDENT D'AUTRE CHOSE QUE DE LA PHOTO (voir
        // build/variantes-images.py). La vignette du CV (<nom>-v.webp) est
        // recadrée au `cadre` de la couverture : changer ce cadre sans
        // relancer le script la laisserait cadrée ailleurs, sans un mot. La
        // version écran large (<nom>-2400.webp) n'existe que pour les photos
        // qui y gagnent : une page qui en demanderait une absente montrerait
        // une image cassée sur ordinateur. variantes.json dit ce que le
        // script a fait ; on le confronte à univers.js, aux JPEG et au disque.
        await verifie('les variantes d’images suivent le montage : la vignette du CV recadrée au cadre de chaque couverture, en 144 × 192 ; une version écran large là où variantes.json l’annonce, et nulle part ailleurs ; le portrait en AVIF, plus léger que sa WebP', async () => {
            const crypto = require('crypto');
            const UNIVERS = path.join(RACINE, 'ressources/images/univers');
            const memoire = JSON.parse(fs.readFileSync(path.join(UNIVERS, 'variantes.json'), 'utf8'));
            const empreinte = (cle) => crypto.createHash('sha1')
                .update(fs.readFileSync(path.join(UNIVERS, cle + '.jpg'))).digest('hex').slice(0, 12);

            const c = await visiteur();
            const p = await c.newPage();
            await p.goto(base + '/', { waitUntil: 'load' });
            const couvertures = await p.evaluate(async () => {
                const out = [];
                for (const uni of Object.values(SHOW_UNIVERSES)) {
                    const cv = UniversMontage.couverture(uni);
                    if (!cv) continue;
                    const img = new Image();
                    img.src = cv.vignette;
                    const lue = await img.decode().then(() => true, () => false);
                    out.push({
                        cle: cv.vignette.replace(/^.*univers\//, '').replace(/-v\.webp$/, ''),
                        cadre: cv.pos || '50% 50%', lue, l: img.naturalWidth, h: img.naturalHeight
                    });
                }
                return out;
            });
            await c.close();
            exige(couvertures.length >= 5, `${couvertures.length} couverture(s) seulement`);
            for (const v of couvertures) {
                const m = memoire.v[v.cle];
                exige(v.lue && v.l === 144 && v.h === 192, `${v.cle}-v.webp manque ou n’est pas en 144 × 192 : python3 build/variantes-images.py`);
                exige(m && m.cadre === v.cadre, `${v.cle}-v.webp est cadrée à « ${m && m.cadre} », la couverture à « ${v.cadre} » : python3 build/variantes-images.py`);
                exige(m.empreinte === empreinte(v.cle), `${v.cle}.jpg a changé depuis sa vignette : python3 build/variantes-images.py`);
            }

            for (const [cle, m] of Object.entries(memoire['2400'])) {
                const existe = fs.existsSync(path.join(UNIVERS, `${cle}-2400.webp`));
                exige(existe === (m.qualite != null), `${cle}-2400.webp ${existe ? 'existe alors que variantes.json dit qu’elle n’a pas lieu d’être' : 'manque'}`);
                exige(m.empreinte === empreinte(cle), `${cle}.jpg a changé depuis sa version écran large : python3 build/variantes-images.py`);
            }
            const inconnues = fs.readdirSync(UNIVERS, { withFileTypes: true }).filter((d) => d.isDirectory())
                .flatMap((d) => fs.readdirSync(path.join(UNIVERS, d.name)).filter((f) => f.endsWith('-2400.webp'))
                    .map((f) => `${d.name}/${f.replace(/-2400\.webp$/, '')}`))
                .filter((cle) => !(memoire['2400'][cle] && memoire['2400'][cle].qualite != null));
            exige(!inconnues.length, `version(s) écran large inconnue(s) de variantes.json : ${inconnues.join(', ')}`);

            // La liste des photos à qui les pages proposent leur -2400
            // (ECRAN_LARGE, univers-montage.js) est celle de variantes.json,
            // ni plus ni moins — le script l'écrit ; une main qui l'aurait
            // touchée, ou un passage oublié, se voit ici. pictureHtml la suit.
            const MONTAGE = require(path.join(RACINE, 'univers-montage.js'));
            const annoncees = Object.entries(memoire['2400']).filter(([, m]) => m.qualite != null).map(([cle]) => cle).sort();
            const listees = [...MONTAGE.ECRAN_LARGE].sort();
            exige(annoncees.join() === listees.join(), `ECRAN_LARGE (univers-montage.js) dit ${listees.join(', ') || 'rien'}, variantes.json ${annoncees.join(', ') || 'rien'} : python3 build/variantes-images.py, puis npm --prefix build run pages`);
            for (const cle of Object.keys(memoire['2400'])) {
                const html = MONTAGE.pictureHtml(`ressources/images/univers/${cle}.jpg`, 'plein', 'alt=""');
                exige(html.includes(`${cle}-2400.webp 2400w`) === listees.includes(cle), `pictureHtml ${listees.includes(cle) ? 'ne propose pas' : 'propose'} ${cle}-2400.webp`);
            }

            // Ce que citent les pages écrites en dur : aucune version écran
            // large, aucune vignette recadrée, aucun AVIF qui n'existe pas —
            // et, dans une page spectacle, chaque photo de la liste propose
            // bien la sienne (une page d'avant la liste en manquerait).
            const pages = ['index.html', 'galerie/index.html', ...dossiers.map((d) => `spectacles/${d}/index.html`)];
            for (const page of pages) {
                const html = fs.readFileSync(path.join(RACINE, page), 'utf8');
                for (const [, cible] of html.matchAll(/((?:\.\.\/)*ressources\/images\/[^"'\s,]+(?:-2400\.webp|-v\.webp|\.avif))/g)) {
                    exige(fs.existsSync(path.join(RACINE, cible.replace(/^(\.\.\/)+/, ''))), `${page} demande ${cible}, qui n’existe pas`);
                }
                for (const [, cle] of html.matchAll(/<img src="(?:\.\.\/)*ressources\/images\/univers\/([a-z]+\/\d+)\.jpg"/g)) {
                    exige(!listees.includes(cle) || html.includes(`${cle}-2400.webp 2400w`), `${page} ne propose pas ${cle}-2400.webp : npm --prefix build run pages`);
                }
            }

            for (const l of [480, 720, 960]) {
                const avif = path.join(RACINE, `ressources/images/portrait-affiche-${l}.avif`);
                exige(fs.existsSync(avif), `portrait-affiche-${l}.avif manque : python3 build/variantes-images.py`);
                const webp = fs.statSync(path.join(RACINE, `ressources/images/portrait-affiche-${l}.webp`)).size;
                exige(fs.statSync(avif).size < webp, `portrait-affiche-${l}.avif ne pèse pas moins que sa WebP`);
            }
        });

        // CHAQUE ÉCRAN PREND SA VERSION (voir pictureHtml, univers-montage.js,
        // et « Images générées » dans le README). L'ordinateur recevait les
        // JPEG de 2400 px ; il prend désormais la -2400 là où elle existe —
        // sans le JPEG en plus, ce qui doublerait le poids au lieu de
        // l'alléger —, et le JPEG là où elle n'existe pas (une 1920 le
        // remplacerait par moins fin). Le téléphone n'en voit rien : jamais
        // plus de 1920 px. Le portrait part en AVIF ; les vignettes du CV
        // et des Dates sont la couverture recadrée (-v), et la version de
        // 240 px, qu'elles prenaient, ne part plus avec l'accueil.
        await verifie('chaque écran prend sa version : l’ordinateur la version écran large là où elle existe, jamais le JPEG en plus, le JPEG ailleurs ; le téléphone jamais plus de 1920 px ; le portrait en AVIF ; les vignettes du CV et des Dates recadrées, sans la couverture de 240 px', async () => {
            const MONTAGE = require(path.join(RACINE, 'univers-montage.js'));
            const larges = [...MONTAGE.ECRAN_LARGE];
            // La page qui a le plus de photos de la liste, et au moins une
            // sans : les deux cas à la fois.
            const page = dossiers.map((d) => {
                const html = fs.readFileSync(path.join(RACINE, `spectacles/${d}/index.html`), 'utf8');
                const cles = [...html.matchAll(/<img src="(?:\.\.\/)*ressources\/images\/univers\/([a-z]+\/\d+)\.jpg"/g)].map((m) => m[1]);
                return { d, avec: cles.filter((k) => larges.includes(k)).length, sans: cles.filter((k) => !larges.includes(k)).length };
            }).filter((x) => x.avec && x.sans).sort((a, b) => b.avec - a.avec)[0];
            exige(page, 'aucune page spectacle n’a à la fois des photos avec et sans version écran large');
            const toutes = async (p) => p.evaluate(async () => {
                const imgs = [...document.querySelectorAll('picture img')];
                imgs.forEach((i) => { i.loading = 'eager'; });
                await Promise.race([Promise.all(imgs.map((i) => i.decode().catch(() => { }))), new Promise((ok) => setTimeout(ok, 15000))]);
                return imgs.map((i) => ({ src: i.getAttribute('src'), vu: i.currentSrc, l: i.naturalWidth }));
            });
            const cle = (u) => (u.match(/univers\/([a-z]+\/\d+)(?:-[\w]+)?\.(?:jpg|webp)$/) || [])[1];

            for (const [vue, dpr, mobile] of [[{ width: 1440, height: 900 }, 2, false], [{ width: 390, height: 844 }, 3, true]]) {
                const c = await visiteur({ viewport: vue, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
                const p = await c.newPage();
                const demandes = [];
                p.on('request', (q) => { if (/\/univers\/[a-z]+\/\d+(-\d+)?\.(jpg|webp)$/.test(q.url())) demandes.push(new URL(q.url()).pathname); });
                const erreurs = guette(p);
                await p.goto(`${base}/spectacles/${page.d}/`, { waitUntil: 'load' });
                const imgs = (await toutes(p)).filter((i) => /univers\/[a-z]+\/\d+\.jpg$/.test(i.src));
                exige(imgs.length >= 3, `${page.d} : ${imgs.length} photo(s) seulement`);
                for (const i of imgs) {
                    const k = cle(i.src);
                    exige(i.l > 0, `${page.d} : ${k} ne s’affiche pas (${i.vu})`);
                    if (!mobile) {
                        const attendu = larges.includes(k) ? `${k}-2400.webp` : `${k}.jpg`;
                        exige(i.vu.endsWith(attendu), `à 1 440 px (×2), ${k} prend ${i.vu.split('/').pop()} au lieu de ${attendu.split('/').pop()}`);
                    } else {
                        exige(!/-2400\.webp$|\.jpg$/.test(i.vu), `au téléphone, ${k} prend ${i.vu.split('/').pop()}`);
                    }
                }
                if (!mobile) {
                    const doubles = larges.filter((k) => demandes.some((u) => u.endsWith(`/${k}.jpg`)));
                    exige(!doubles.length, `à 1 440 px, le JPEG de ${doubles.join(', ')} part en plus de sa version écran large`);
                } else {
                    const trop = demandes.filter((u) => /-2400\.webp$|\.jpg$/.test(u));
                    exige(!trop.length, `au téléphone : ${trop.join(', ')}`);
                }
                exige(!erreurs.length, erreurs.join(' | '));
                await c.close();
            }

            // L'accueil, au téléphone : le portrait, les vignettes du CV,
            // puis celles des Dates — deux dates fictives de spectacles qui
            // ont des photos, rangées par date puis par spectacle.
            const c = await visiteur({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
            const p = await c.newPage();
            const couvertures = [];
            p.on('request', (q) => { if (/-240\.webp$/.test(q.url())) couvertures.push(new URL(q.url()).pathname); });
            const erreurs = guette(p);
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(600);
            const accueil = await p.evaluate(async () => {
                const portrait = document.querySelector('#en-tete .affiche-cadre img');
                const vign = [...document.querySelectorAll('.cv-vignette img')];
                vign.forEach((i) => { i.loading = 'eager'; });
                await Promise.all(vign.map((i) => i.decode().catch(() => { })));
                return { portrait: portrait.currentSrc, vign: vign.map((i) => ({ vu: i.currentSrc, l: i.naturalWidth, h: i.naturalHeight })) };
            });
            exige(/portrait-affiche-960\.avif$/.test(accueil.portrait), `le portrait prend ${accueil.portrait.split('/').pop()} au téléphone (×3), pas portrait-affiche-960.avif`);
            exige(accueil.vign.length >= 5, `${accueil.vign.length} vignette(s) au CV`);
            const floues = accueil.vign.filter((v) => !/-v\.webp$/.test(v.vu) || v.l !== 144 || v.h !== 192);
            exige(!floues.length, `vignette(s) du CV qui ne sont pas la couverture recadrée en 144 × 192 : ${floues.map((v) => v.vu.split('/').slice(-2).join('/')).join(', ')}`);
            await p.click('#tab-page_dates');
            await p.waitForTimeout(400);
            const dates = await p.evaluate(async () => {
                const iso = (n) => {
                    const d = new Date();
                    d.setDate(d.getDate() + n);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                };
                SHOW_DATA.upcoming = ['Bérénice', 'Cléophène, d’après Rodogune'].map((title, i) => ({
                    type: 'single', title, location: 'Scène de vérification (76)', city: 'Rouen',
                    dateLabel: iso(20 + i), icsDate: iso(20 + i), time: '20h00', bookingUrl: '', isSchool: false
                }));
                datesMisesAJour();
                const lire = async (sel) => {
                    const imgs = [...document.querySelectorAll(sel)];
                    imgs.forEach((i) => { i.loading = 'eager'; });
                    await Promise.all(imgs.map((i) => i.decode().catch(() => { })));
                    return imgs.map((i) => i.currentSrc);
                };
                const parDate = await lire('#page_dates .dl-feuille img');
                document.querySelector('[data-dates-vue="spectacle"]').click();
                await new Promise((ok) => setTimeout(ok, 300));
                return { parDate, parSpectacle: await lire('#page_dates .dl-vignette img') };
            });
            exige(dates.parDate.length >= 2 && dates.parSpectacle.length >= 2, `onglet Dates : ${dates.parDate.length} feuille(s) sur photo, ${dates.parSpectacle.length} vignette(s) de spectacle`);
            const autres = [...dates.parDate, ...dates.parSpectacle].filter((u) => !/-v\.webp$/.test(u));
            exige(!autres.length, `onglet Dates : ${autres.map((u) => u.split('/').slice(-2).join('/')).join(', ')} au lieu de la vignette recadrée`);
            exige(!couvertures.length, `l’accueil télécharge encore la couverture de 240 px : ${couvertures.join(', ')}`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
        });

        // ── L'EXPERTISE D'OCTOBRE 2026, CÔTÉ ACCUEIL ──
        // Au téléphone, la barre d'onglets flotte en bas de l'écran, dans la
        // zone du pouce, ses quatre destinations visibles dès l'arrivée, en
        // mots courts ; sur grand écran elle reste en haut, en mots longs.
        // L'adresse se copie, la fiche contact se télécharge, et plus aucun
        // texte de l'accueil n'est sous les onze pixels.
        await verifie('l’accueil d’après l’expertise : la barre d’onglets en bas au téléphone, en haut sur grand écran ; « Copier » l’adresse, la fiche contact ; rien sous onze pixels', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
            await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/', { waitUntil: 'load' });
            await p.waitForTimeout(600);
            const barre = await p.evaluate(() => {
                const n = document.getElementById('nav-barre');
                const r = n.getBoundingClientRect();
                const visibles = (a) => [...a.querySelectorAll('span')].filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.textContent.trim()).join('');
                return {
                    position: getComputedStyle(n).position, bas: innerHeight - r.bottom, haut: r.top,
                    mots: [...document.querySelectorAll('#nav-tabs-container a')].map(visibles),
                    cibles: [...document.querySelectorAll('#nav-tabs-container a')].map((a) => Math.round(a.getBoundingClientRect().height))
                };
            });
            exige(barre.position === 'fixed' && barre.bas >= 0 && barre.bas < 40 && barre.haut > 600,
                `au téléphone, la barre d’onglets n’est pas en bas de l’écran (${barre.position}, à ${Math.round(barre.haut)} px du haut)`);
            exige(barre.mots.join('·') === 'CV·Dates·Caméra·Voix', `au téléphone, les onglets ne disent pas « CV · Dates · Caméra · Voix » (${barre.mots.join(' · ')})`);
            exige(barre.cibles.every((h) => h >= 44), `au téléphone, un onglet fait moins de 44 px de haut (${barre.cibles.join(', ')})`);
            // « Copier » met l'adresse dans le presse-papiers et le dit.
            await p.locator('header [data-copier]').scrollIntoViewIfNeeded();
            await p.click('header [data-copier]');
            await p.waitForTimeout(300);
            const copie = await p.evaluate(async () => ({
                presse: await navigator.clipboard.readText(),
                annonce: document.getElementById('annonce-copie')?.textContent || '',
                vcard: document.querySelector('header a[href$=".vcf"]')?.getAttribute('href') || ''
            }));
            exige(copie.presse === 'adrien.vada@gmail.com' && /copiée/i.test(copie.annonce), `« Copier » : presse-papiers « ${copie.presse} », annonce « ${copie.annonce} »`);
            const vcf = await p.evaluate(async (h) => { const r = await fetch(h); return { ok: r.ok, texte: await r.text() }; }, copie.vcard);
            exige(vcf.ok && /^BEGIN:VCARD\r\n/.test(vcf.texte) && /FN:Adrien Vada/.test(vcf.texte) && /END:VCARD\r\n$/.test(vcf.texte),
                'la fiche contact (.vcf) est absente ou mal formée');
            // Rien sous onze pixels, dans les onglets CV et Dates (la seule
            // exception écrite : « janv–févr », à dix et demi).
            const petits = async () => p.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => {
                if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false;
                // .cv-cie : le mot « Compagnie », gardé à corps nul pour les
                // lecteurs d'écran ; l'œil lit « Cie », dessiné à 12 px.
                if (e.closest('svg, .sr-only, [aria-hidden="true"] .sr-only, .dl-bande--2, #intro-overlay, .td-fl, .cv-cie')) return false;
                const texte = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
                return texte && parseFloat(getComputedStyle(e).fontSize) < 10.99;
            }).map((e) => `${e.className || e.tagName} (${getComputedStyle(e).fontSize})`).slice(0, 6));
            const cv = await petits();
            await p.click('#tab-page_dates');
            await p.waitForTimeout(1200);
            const dates = await petits();
            exige(!cv.length && !dates.length, `du texte sous onze pixels : ${[...cv, ...dates].join(', ')}`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
            // Sur grand écran, la barre reste en haut, en mots longs.
            const c2 = await visiteur({ viewport: { width: 1280, height: 860 } });
            const p2 = await c2.newPage();
            await p2.goto(base + '/', { waitUntil: 'load' });
            await p2.waitForTimeout(400);
            const grand = await p2.evaluate(() => ({
                position: getComputedStyle(document.getElementById('nav-barre')).position,
                mots: [...document.querySelectorAll('#nav-tabs-container a')].map((a) => [...a.querySelectorAll('span')]
                    .filter((s) => getComputedStyle(s).display !== 'none').map((s) => s.textContent.trim()).join(''))
            }));
            exige(grand.position === 'sticky' && grand.mots.join('·') === 'CV·Dates théâtres·Démos caméra·Démos voix',
                `sur grand écran, la barre d’onglets a changé (${grand.position}, ${grand.mots.join(' · ')})`);
            await c2.close();
        });

        // ── L'EXPERTISE D'OCTOBRE 2026, CÔTÉ UNIVERS ──
        // Le premier écran nomme le spectacle ; qui arrive d'un moteur de
        // recherche voit d'abord le haut de page complet ; les dates du pied
        // ont le dessin de l'onglet Dates, une série sur une ligne et un
        // agenda qui demande la séance ; les chapitres se suivent et se
        // touchent ; le pied finit sur le spectacle suivant ; et « Cléophène »
        // tient dans l'écran du plus petit téléphone.
        await verifie('les univers d’après l’expertise : un repère au premier écran, le haut de page complet depuis un moteur de recherche, les dates au dessin de l’onglet Dates, des chapitres qu’on touche, le spectacle suivant, un titre qui tient', async () => {
            const c = await visiteur({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/spectacles/berenice/', { waitUntil: 'load' });
            await p.waitForTimeout(900);
            const premier = await p.evaluate(() => ({
                titre: document.querySelector('.u-of-repere-titre')?.textContent.trim() || '',
                ligne: document.querySelector('.u-of-invite-sur')?.textContent.trim() || '',
                pastille: document.querySelector('.u-chapitres')?.classList.contains('est-visible')
            }));
            exige(premier.titre === 'Bérénice' && /2022/.test(premier.ligne), `le premier écran ne nomme pas le spectacle (« ${premier.titre} », « ${premier.ligne} »)`);
            exige(premier.pastille === false, 'la pastille des chapitres paraît dès le premier écran');
            // Les chapitres : la pastille paraît avec le montage, et « Dates » mène au pied.
            const chap = await p.evaluate(async () => {
                const o = document.getElementById('show-universe');
                o.scrollTop = o.scrollHeight * 0.4;
                await new Promise((r) => setTimeout(r, 400));
                const nav = document.querySelector('.u-chapitres');
                return { visible: nav.classList.contains('est-visible'), n: nav.querySelectorAll('[data-u-chapitre]').length, reperes: document.querySelectorAll('.u-progress-repere').length };
            });
            exige(chap.visible && chap.n >= 4 && chap.reperes === chap.n - 1, `les chapitres : pastille ${chap.visible ? 'visible' : 'absente'}, ${chap.n} chapitre(s), ${chap.reperes} repère(s) sur la barre`);
            await p.tap('.u-chapitres-bouton');
            await p.tap('[data-u-chapitre="pied"]');
            await p.waitForTimeout(1600);
            const pied = await p.evaluate(() => {
                const f = document.getElementById('u-foot').getBoundingClientRect();
                return { haut: Math.round(f.top), nom: document.querySelector('[data-u-chapitre-nom]').textContent };
            });
            exige(Math.abs(pied.haut) < 40 && pied.nom === 'Dates', `« Dates » ne mène pas au pied (${pied.haut} px, chapitre « ${pied.nom} »)`);
            // Les dates : une série sur une ligne, l'agenda demande la séance.
            const serie = p.locator('#u-foot .u-dl--serie .u-date-cal').first();
            exige(await serie.count(), 'aucune série sur une ligne au pied de Bérénice');
            await serie.click();
            await p.waitForTimeout(400);
            const seances = await p.locator('#u-cal-modal [data-u-cal-seance]').count();
            exige(seances >= 2, `l’agenda d’une série ne demande pas la séance (${seances} choix)`);
            await p.keyboard.press('Escape');
            // Le spectacle suivant, dans l'ordre du CV : As You Like It.
            const suite = await p.evaluate(() => document.querySelector('.u-suivant a')?.getAttribute('href'));
            exige(suite === '/spectacles/asyoulikeit/', `le pied de Bérénice ne mène pas à As You Like It (${suite})`);
            exige(!erreurs.length, erreurs.join(' | '));
            // Depuis un moteur de recherche : le haut de page complet.
            const p2 = await c.newPage();
            await p2.goto(base + '/spectacles/berenice/', { waitUntil: 'load', referer: 'https://www.google.com/' });
            await p2.waitForTimeout(900);
            const g = await p2.evaluate(() => {
                const b = document.querySelector('.u-hero-actions .u-btn');
                const r = b.getBoundingClientRect();
                return { y: document.getElementById('show-universe').scrollTop, dedans: r.top >= 0 && r.bottom <= innerHeight };
            });
            exige(g.y > 0 && g.dedans, `depuis un moteur de recherche, le haut de page n’est pas posé (défilement ${g.y}, bouton ${g.dedans ? 'visible' : 'hors de l’écran'})`);
            await c.close();
            // Le titre le plus large tient dans le plus petit téléphone.
            const c3 = await visiteur({ viewport: { width: 360, height: 740 }, isMobile: true, reducedMotion: 'reduce' });
            const p3 = await c3.newPage();
            await p3.goto(base + '/spectacles/cleophene/', { waitUntil: 'load' });
            await p3.evaluate(() => document.fonts.ready);
            const marge = await p3.evaluate(() => {
                let g = 1e9, d = 0;
                document.querySelectorAll('.u-title .u-word').forEach((w) => { const r = w.getBoundingClientRect(); g = Math.min(g, r.left); d = Math.max(d, r.right); });
                return Math.round(Math.min(g, innerWidth - d));
            });
            exige(marge >= 16, `« Cléophène » ne laisse que ${marge} px au bord de l’écran à 360 px`);
            await c3.close();
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
