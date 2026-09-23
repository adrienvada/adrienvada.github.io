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
 *      annoncée aux moteurs ; le carton « Prochainement », en tête du CV
 *      et nulle part ailleurs ;
 *    · l'impression sans les pastilles ▶ ;
 *    · la ligne à vignette du CV : l'année et l'état sur chaque vignette,
 *      des lignes de même hauteur, rien de tout cela sur papier ;
 *    · le site sans JavaScript ;
 *    · les pages spectacle (h1, <main>, données structurées, une image
 *      pour chaque représentation) ;
 *    · les mêmes pages, qui doivent s'animer et s'ouvrir comme leur
 *      univers ouvert depuis le CV ;
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

        await verifie('l’onglet Dates : feuilles, liserés, séances en cases, liens vers les pages spectacle, rangement par spectacle, sommaire, une image par représentation — et le carton « Prochainement », au CV seulement', async () => {
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
                    prochaine: document.querySelector('#next-date-banner a.dl-vers-page')?.getAttribute('href') || null,
                    morts
                };
            });
            exige(liens.ligne.join() === 'spectacles/berenice/', `la ligne de Bérénice ne mène pas à sa page : ${JSON.stringify(liens.ligne)}`);
            exige(!liens.sansPage, 'le nom d’un spectacle sans page porte un lien');
            exige(liens.prochaine === 'spectacles/berenice/', 'la prochaine représentation ne mène pas à la page du spectacle');
            exige(!liens.morts.length, `lien(s) mort(s) : ${liens.morts.join(', ')}`);

            // Le carton « Prochainement » est en tête du CV, et seulement là :
            // l'onglet Dates n'en a pas, sa liste commence par la prochaine
            // date. Son agenda ouvre la fenêtre de la prochaine date (le CV
            // est masqué pendant ce test, d'où le clic donné par le script).
            const carton = await p.evaluate(() => {
                const cv = document.getElementById('next-date-banner');
                return {
                    cv: !!cv && !cv.hidden && /Bérénice/.test(cv.textContent),
                    dates: !document.querySelector('#page_dates .next-date-shine')
                };
            });
            exige(carton.cv, 'le carton « Prochainement » manque en tête du CV');
            exige(carton.dates, 'l’onglet Dates a un carton « Prochainement » : il ne doit être qu’au CV');
            await p.evaluate(() => document.querySelector('#next-date-banner [data-cal-prochaine]').click());
            await p.waitForTimeout(300);
            exige(await p.evaluate(() => /Bérénice/.test(document.getElementById('cal-modal-title')?.textContent || '')),
                'l’agenda du carton « Prochainement » n’ouvre pas sa fenêtre');
            await p.keyboard.press('Escape');
            await p.waitForTimeout(300);

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
                    '.u-hero-actions', '.u-scroll', '.u-author', '.u-synopsis', '.u-progress span'];
                const out = {};
                for (const s of ELEMENTS) {
                    const e = o && o.querySelector(s);
                    if (!e) continue;
                    const cs = getComputedStyle(e);
                    const props = cs.transitionProperty.split(/,\s*/), durees = cs.transitionDuration.split(/,\s*/);
                    // La couleur, elle, suit le changement de thème sur
                    // l'accueil (une règle générale d'index.html) : ce n'est
                    // pas l'effet d'apparition qu'on vérifie.
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
