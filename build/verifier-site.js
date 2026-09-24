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
 *      des lignes de même hauteur, rien de tout cela sur papier ;
 *    · le site sans JavaScript ;
 *    · les pages spectacle (h1, <main>, données structurées, une image
 *      pour chaque représentation) ;
 *    · les mêmes pages, qui doivent s'animer et s'ouvrir comme leur
 *      univers ouvert depuis le CV ;
 *    · la régie (regie.js) : la même détection partout, et le repli qui
 *      rejoue les mêmes images que le navigateur, scène par scène ;
 *    · un état fixe qui a du sens pour chaque scène, en mouvement réduit ;
 *    · les défauts réparés de l'audit du mouvement : verrou de
 *      défilement, changement d'onglet, « Passer » et les touches de
 *      l'ouverture, zoom de l'avatar, course du book, phrase posée sur un
 *      groupe de photos ;
 *    · la frise du CV, liée au défilement, et la page 404 ;
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

        await verifie('l’onglet Dates : feuilles, liserés, séances en cases, liens vers les pages spectacle, rangement par spectacle, sommaire, une image par représentation — et la prochaine date, au CV seulement', async () => {
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
                renderNextDate();
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

            // Une date seule a sa case, comme chaque soir d'une série : son
            // heure et « Réserver » s'y lisent au même endroit.
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
                `une date seule n’a pas sa case (heure, « Réserver ») : ${JSON.stringify(seule)}`);

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

            // Chaque mois porte son liseré, à sa couleur — douze couleurs, qui
            // suivent les saisons, toutes différentes —, et son intercalaire
            // le prolonge.
            const lisere = await p.evaluate(() => {
                const page = document.getElementById('page_dates');
                const g = document.querySelector('#upcoming-dates-container .dl-groupe[data-mois]');
                const avant = g && getComputedStyle(g, '::before');
                const entete = g && g.querySelector('.dl-intercalaire');
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
                return {
                    trait: !!avant && avant.width === '3px' && avant.backgroundColor === attendue,
                    entete: !!entete && /inset/.test(getComputedStyle(entete).boxShadow),
                    douze: couleurs.every(Boolean) && new Set(couleurs).size === 12,
                    initiales: initiales.length > 0 && !initiales.includes(grise) && new Set(initiales).size === initiales.length
                };
            });
            exige(lisere.trait && lisere.entete && lisere.douze,
                `le liseré des mois manque ou n’a pas la couleur de son mois : ${JSON.stringify(lisere)}`);
            exige(lisere.initiales, 'les initiales des mois, dans la saison d’un regard, n’ont pas leur couleur');

            // L'agenda d'une case de série ouvre sa fenêtre.
            await p.locator('#upcoming-dates-container .dl--serie .dl-seance .dl-agenda').first().click();
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
                    // Les volets seulement : le voyant de l'en-tête bat sept secondes.
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

        await verifie('les démos voix : toucher la barre de lecture mène au point touché, même quand le serveur ne sert pas de morceaux de fichier', async () => {
            // Le serveur local, comme l'aperçu de branche sur Cloudflare, ne
            // répond pas aux requêtes Range : sans le repli en mémoire (voir
            // allerDansLaDemo), le navigateur ne saute nulle part et l'extrait
            // repart du début — le défaut constaté sur téléphone.
            const c = await visiteur({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
            const p = await c.newPage();
            const erreurs = guette(p);
            await p.goto(base + '/#demos_voix', { waitUntil: 'load' });
            await p.waitForFunction(() => document.getElementById('audio-nexity').duration > 0, null, { timeout: 10000 });
            // L'onglet arrive en glissant, ses cartes en montant (0,6 s) : on
            // touche la barre une fois la page posée, comme un visiteur.
            await p.waitForTimeout(1200);
            const barre = await p.locator('[data-audio-seek="audio-nexity"]').boundingBox();
            await p.touchscreen.tap(barre.x + barre.width * 0.5, barre.y + barre.height / 2);
            await p.waitForTimeout(1000);
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
        await verifie('le CV : une vignette par spectacle et par film, l’année et l’état dessus, les lignes à la même hauteur et l’année au même endroit — au téléphone comme sur ordinateur ; ni image pour les formations, ni vignette sur papier', async () => {
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
                        // La règle de la mise en page : tout le texte tient dans
                        // la hauteur de la vignette. Un titre qui repasserait à
                        // la ligne la dépasserait — et c'est ce qui faisait
                        // varier les hauteurs.
                        debordent: lignes.filter((li) => {
                            const v = li.querySelector('.cv-vignette'), t = li.querySelector('.cv-row-toggle .min-w-0');
                            return v && t && t.getBoundingClientRect().height > v.getBoundingClientRect().height + 0.5;
                        }).map((li) => li.dataset.cvShow),
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
                // Un pixel de jeu : la première ligne d'une liste n'a pas le
                // filet de séparation des suivantes.
                cv.ecarts.forEach((e, i) => {
                    exige(e.hauteur <= 1.5, `${ici} : les lignes de la liste ${i + 1} n’ont pas la même hauteur (écart ${e.hauteur.toFixed(1)} px)`);
                    exige(e.annee <= 1.5, `${ici} : l’année ne tombe pas au même endroit dans la liste ${i + 1} (écart ${e.annee.toFixed(1)} px)`);
                });
                exige(cv.formation >= 1, `${ici} : la liste des formations n’est plus marquée .cv-formation`);
                exige(!cv.imagesFormation, `${ici} : une formation porte une image`);
                exige(!erreurs.length, erreurs.join(' | '));

                // Sur papier : ni vignette ni genre, et l'année revient.
                await p.emulateMedia({ media: 'print' });
                const papier = await p.evaluate(() => ({
                    vues: [...document.querySelectorAll('#page_cv .cv-vignette, #page_cv .cv-genre')]
                        .filter((e) => getComputedStyle(e).display !== 'none').length,
                    annees: [...document.querySelectorAll('#page_cv li.cv-item .cv-year')]
                        .filter((e) => e.getBoundingClientRect().width > 1).length
                }));
                exige(!papier.vues, `${papier.vues} vignette(s) ou ligne(s) de genre sur le CV imprimé`);
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
                    .filter((s) => getComputedStyle(s).opacity !== '1').length
            }));
            exige(etat.rideau === 'none', 'le rideau d’ouverture couvre la page');
            exige(etat.cachees === 0, `${etat.cachees} section(s) restent invisibles`);
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
                    '.u-hero-fond', '.u-fig-point', '.u-flou', '.u-of-photo', '.u-of-carton', '.u-of-invite',
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
            const ecarts = [];
            for (const slug of dossiers) {
                await p.goto(`${base}/#/univers/${slug}`, { waitUntil: 'load' });
                await p.waitForFunction(() => document.getElementById('show-universe')?.classList.contains('is-open'), null, { timeout: 8000 })
                    .catch(() => { throw new Error(`${slug} : l’univers ne s’ouvre pas à son adresse`); });
                await p.waitForTimeout(400);
                const panneau = await p.evaluate(releve);
                await p.goto(`${base}/spectacles/${slug}/`, { waitUntil: 'load' });
                await p.waitForTimeout(400);
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
                        ['.u-ouverture', [0.2, 0.5, 0.8, 0.95], ['.u-of-photo', '.u-of-carton', '.u-of-noir', '.u-of-invite']],
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
                    carton: cs('.u-of-carton') && +cs('.u-of-carton').opacity,
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
            exige(etat.plans === 'none' && etat.carton === 1, 'l’ouverture ne se réduit pas à son carton');
            exige(etat.poursuite < 1.2 && etat.faisceaux === 'none' && etat.plein === 1, 'la poursuite ne montre pas sa photo en plein feux');
            exige(etat.voile === 'none', 'la première photo attend un allumage qui ne viendra pas');
            exige(!etat.lumieres && !etat.mots, 'le texte attend une lumière qui ne viendra pas');
            exige(!etat.animees, `${etat.animees} élément(s) encore animé(s) au défilement`);
            exige(!erreurs.length, erreurs.join(' | '));
            await c.close();
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
            await p.waitForTimeout(900);
            const onglet = await p.evaluate(() => {
                const t = document.getElementById('tab-page_dates').getBoundingClientRect();
                const pa = document.querySelector('.onglet-pastille').getBoundingClientRect();
                return { page: document.querySelector('.page.active')?.id, ecart: Math.abs(t.left - pa.left) + Math.abs(t.width - pa.width) };
            });
            exige(onglet.page === 'page_dates', 'le changement d’onglet ne pose pas la page');
            exige(onglet.ecart < 2, `la pastille n’a pas rejoint l’onglet (${onglet.ecart.toFixed(1)} px d’écart)`);
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

        await verifie('la frise du CV suit la ligne de lecture, sans horloge — avec les deux pilotes', async () => {
            for (const repli of [false, true]) {
                const c = await visiteur({ viewport: { width: 1280, height: 860 } });
                const p = await c.newPage();
                const erreurs = guette(p);
                await p.goto(base + '/' + (repli ? '?repli' : ''), { waitUntil: 'load' });
                await p.waitForTimeout(600);
                const etat = await p.evaluate(async () => {
                    const liste = document.getElementById('cv-theatre-list');
                    const lignes = [...liste.querySelectorAll('li.cv-has-universe')];
                    document.documentElement.style.scrollBehavior = 'auto';
                    // La quatrième ligne sur la ligne de lecture.
                    const y = lignes[3].getBoundingClientRect().top + scrollY - innerHeight * 0.5 + 4;
                    window.scrollTo(0, y);
                    await new Promise((r) => setTimeout(r, 400));
                    const filet = (li) => +getComputedStyle(li, '::before').opacity;
                    return {
                        frise: liste.classList.contains('cv-frise'),
                        haut: filet(lignes[0]), bas: filet(lignes[lignes.length - 1]),
                        horloge: [...document.styleSheets].some((f) => { try { return [...f.cssRules].some((r) => /cv-guirlande|cv-pastille-lueur\b/.test(r.cssText)); } catch (e) { return false; } })
                    };
                });
                const nom = repli ? 'avec le repli' : 'en natif';
                exige(etat.frise, 'la liste du CV ne porte pas la frise');
                exige(etat.haut > 0.9, `${nom}, le filet d’une ligne déjà lue n’est pas allumé (${etat.haut})`);
                exige(etat.bas < 0.6, `${nom}, le filet d’une ligne pas encore lue est allumé (${etat.bas})`);
                exige(!etat.horloge, 'la guirlande à horloge est revenue');
                exige(!erreurs.length, erreurs.join(' | '));
                await c.close();
            }
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
