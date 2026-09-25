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
                buildFilterChips();
                renderDates();
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
                        && !!document.querySelector('#dates-sommaire .dl-grille [data-dl-aller]')
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
                    '.u-hero-fond', '.u-fig-point', '.u-flou', '.u-of-photo', '.u-of-titre .u-title', '.u-of-invite',
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
                await p.waitForTimeout(400);
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
                            '.u-of-titre .u-eyebrow', '.u-of-titre .u-couche-auteur', '.u-of-titre .u-synopsis', '.u-of-titre .u-synopsis .u-lum',
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
                    titre: ['.u-of-titre .u-title', '.u-of-titre .u-hero-fond', '.u-of-titre .u-eyebrow', '.u-of-titre .u-couche-auteur', '.u-of-titre .u-synopsis', '.u-of-titre .u-couche-actions']
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
                    exige(etat.voileBas < 0.5, `${nom}, une ligne pas encore atteinte n’est pas voilée (${etat.voileBas})`);
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
                await p.locator('#cv-theatre-list > li.cv-has-universe').nth(5).locator('.cv-vignette').hover();
                await p.waitForTimeout(250);
                const survol = await lire();
                if (options.isMobile) exige(survol.voile < 0.5, `${appareil}, une ligne touchée avant le fil s’allume (${survol.voile})`);
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
            await p.waitForFunction(() => document.getElementById('audio-nexity').duration > 0, null, { timeout: 10000 });
            const couleurs = await p.evaluate(async () => {
                // Par le chemin du site : le serveur local ne sert pas de
                // morceaux de fichier (voir allerDansLaDemo).
                const a = document.getElementById('audio-nexity');
                allerDansLaDemo('audio-nexity', a.duration / 2);
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

        await verifie('le portrait d’affiche : le visage en grand sur l’onglet CV, le nom en Cinzel, la fiche en six cases ; ailleurs, le médaillon — et le papier inchangé', async () => {
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
                await p.click('#tab-page_dates');
                await p.waitForTimeout(900);
                const dates = await lire();
                exige(dates.replie && dates.l <= 100 && /50%|9\dpx|4\dpx/.test(dates.rond), `hors du CV, le portrait n’est pas redevenu un médaillon (${dates.l.toFixed(0)} px, ${dates.rond})`);
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
                const c = await visiteur({ viewport: { width: largeur, height: largeur > 1000 ? 800 : 844 } });
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
                    // entière prenne le relais : si un téléphone renonce à
                    // dessiner la lettre géante, rien ne transparaît. Et la
                    // porte a son disque, net à toute taille.
                    const nuit = svg.querySelector('.u-lettre-nuit');
                    const disque = mot.querySelector('circle');
                    await aller(v('zoom-s') + (v('zoom-e') - v('zoom-s')) * 0.83);
                    out.eteinte = { nuit: nuit ? op(nuit) : 0, plein: op(plein), disque: disque ? +disque.getAttribute('r') : 0 };
                    await aller(v('fleche-e') + 0.005);
                    out.recit = { echelle: echelle(), textes: Math.min(...textes.map(op)), nuit: nuit ? op(nuit) : 1 };
                    await aller(Math.min(0.999, v('zoom-e') + 0.01));
                    const r = plein.getBoundingClientRect(), e = S.getBoundingClientRect();
                    out.fin = { aides: Math.max(...[...svg.querySelectorAll('.u-lettre-aide')].map(op)), echelle: echelle(), plein: op(plein), couvre: r.left <= e.left + 1 && r.top <= e.top + 1 && r.right >= e.right - 1 && r.bottom >= e.bottom - 1 };
                    return out;
                });
                const ou = `${slug}${q} à ${largeur} px`;
                exige(etat.lettres === etat.chars && etat.ecart < 1, `${ou} : le masque ne suit pas les lettres du titre (${etat.lettres}/${etat.chars}, écart ${etat.ecart.toFixed(2)} px)`);
                exige(etat.photos[0] && etat.photos[0] !== etat.photos[1], `${ou} : on entre par la lettre dans la première photo du montage — vue deux fois de suite (${etat.photos.join(' / ')})`);
                exige(etat.avant < 0.05, `${ou} : la photo paraît dans les lettres en plein travelling (${etat.avant})`);
                exige(etat.titreAvant > 0.95, `${ou} : le titre ne se voit pas en plein travelling (${etat.titreAvant})`);
                exige(etat.pose.titre < 0.05 && etat.titreZoom < 0.05, `${ou} : le vrai titre reste visible sous ses lettres de photo — un second titre derrière la photo quand la lettre s'ouvre (${etat.pose.titre} posé, ${etat.titreZoom} en plein zoom)`);
                exige(etat.pose.calque > 0.95 && Math.abs(etat.pose.echelle - 1) < 0.01 && etat.pose.plein < 0.05, `${ou} : le titre posé ne détoure pas la photo (${JSON.stringify(etat.pose)})`);
                exige(etat.pose.aides > 0.95, `${ou} : le titre posé n'a pas son voile et son filet de lecture (${etat.pose.aides})`);
                exige(etat.horsProfondeur, `${ou} : le calque de la lettre est dans la profondeur du haut de la page — les textes peuvent repasser par-dessus la photo`);
                exige(etat.fin.aides < 0.05, `${ou} : le voile et le filet restent sur la photo au bout du zoom (${etat.fin.aides})`);
                exige(etat.eteinte.nuit > 0.95 && etat.eteinte.plein < 0.05 && etat.eteinte.disque > 0, `${ou} : la salle n'est pas éteinte sous la photo avant le relais de la photo entière, ou la porte n'a pas son disque — les textes peuvent transparaître au bout du zoom (${JSON.stringify(etat.eteinte)})`);
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
