/**
 * ============================================================
 *  UNIVERS DES SPECTACLES — plein écran depuis le CV
 * ============================================================
 *  Au clic sur une ligne du CV, au lieu du simple tiroir de dates,
 *  on ouvre une page plein écran qui prend la palette du spectacle :
 *  le titre s'écrit, le synopsis s'inscrit, puis le montage photo se
 *  déroule et se termine sur les prochaines dates.
 *
 *  AJOUTER / MODIFIER UN UNIVERS
 *  -----------------------------
 *  La clé de chaque entrée doit être EXACTEMENT la valeur de
 *  `data-cv-show` sur le <li class="cv-item"> correspondant dans
 *  index.html — même appariement que pour les dates, sans rapprochement
 *  approximatif. Un spectacle sans entrée ici garde l'ancien tiroir :
 *  c'est le cas volontaire de « L'imaginaire forcé » et « Cassandres »,
 *  dont la direction visuelle n'est pas arrêtée.
 *
 *  CHAMPS
 *  ------
 *  palette   les couleurs du spectacle, injectées en variables --u-*
 *            sur le seul panneau (le reste du site n'est pas repeint).
 *  synopsis  s'inscrit mot à mot sous le titre. 2 à 4 phrases.
 *  credit    photographe, affiché au pied du panneau.
 *  sequence  LE MONTAGE. Un élément = un temps du défilé, dans l'ordre.
 *              { p: [12] }           une photo, plein cadre
 *              { p: [12, 7] }        duo, la seconde décalée
 *              { p: [1, 9, 11] }     trio, composition asymétrique
 *              { p: [9, 5, 6, 7] }   quatuor, cascade
 *              { q: 'texte', by: '…' }   un carton de texte
 *            `c: [...]` porte les légendes, dans l'ordre des photos.
 *            Les NUMÉROS sont ceux des fichiers de
 *            `ressources/spectacles/<spectacle>/` — le même langage que
 *            les planches-contact. `build/prepare-univers-photos.py`
 *            en tire `ressources/images/univers/<slug>/<n>.jpg`.
 *            ⚠️ SEQUENCES dans ce script Python doit rester synchronisé.
 *
 *  DROITS SUR LES TEXTES
 *  ---------------------
 *  Les cartons `q:` marqués « REMPLISSAGE » sont de la prose neutre
 *  écrite pour tenir la place — ce ne sont PAS des répliques des pièces.
 *  Les seules vraies citations sont celles du domaine public (Racine,
 *  Corneille, Shakespeare). Reproduire le texte d'une pièce
 *  contemporaine — Fulguré.e.s, Audiences, À la barre — demande
 *  l'accord de l'autrice ou de l'auteur.
 * ============================================================
 */

const SHOW_UNIVERSES = {

    'Bérénice': {
        slug: 'berenice',
        // Blanc majeur, rose et noir mineurs : la lumière crue d'une
        // séparation, le rose seulement là où ça touche.
        palette: {
            bg: '#f6f3ef', surface: '#ffffff', text: '#181215', muted: '#6d5d63',
            accent: '#c0637e', accentInk: '#a34a66', onAccent: '#ffffff',
            line: 'rgba(24,18,21,0.13)', glow: 'rgba(192,99,126,0.30)'
        },
        synopsis: 'Titus est empereur depuis huit jours. Il aime Bérénice, ' +
            'et Rome ne veut pas d’une reine. Antiochus les aime tous les deux, ' +
            'et se tait depuis cinq ans. Personne ici ne fait de mal à personne : ' +
            'c’est bien ce qui rend la séparation insoutenable.',
        quotesAreRealText: true,
        sequence: [
            { p: [2], c: ['Le cercle blanc, le public tout autour'] },
            { q: 'Dans l’Orient désert quel devint mon ennui !', by: 'Antiochus, acte I' },
            { p: [3], c: ['Titus'] },
            { p: [12, 7], c: ['Assis côte à côte, déjà séparés', 'L’étreinte'] },
            {
                q: 'Pour jamais ! Ah, Seigneur ! songez-vous en vous-même\n' +
                    'Combien ce mot cruel est affreux quand on aime ?', by: 'Bérénice, acte IV'
            },
            { p: [1, 9, 11], c: ['', '', ''] },
            { p: [18], c: ['Ce que Rome exige'] },
            {
                q: 'Que le jour recommence et que le jour finisse\n' +
                    'Sans que jamais Titus puisse voir Bérénice.', by: 'Bérénice, acte V'
            },
            { p: [13, 5, 16], c: ['', '', ''] },
            { p: [17, 19], c: ['', ''] }
        ]
    },

    "Cléophène, d'après Rodogune": {
        slug: 'cleophene',
        // Chaleur désertique : or, brun sombre, une lumière basse.
        palette: {
            bg: '#150c05', surface: '#241608', text: '#f5e8d2', muted: '#b59878',
            accent: '#d9a24a', accentInk: '#e6b767', onAccent: '#150c05',
            line: 'rgba(217,162,74,0.20)', glow: 'rgba(217,162,74,0.32)'
        },
        credit: 'Arnaud Bertereau',
        synopsis: 'Une reine a deux fils jumeaux et une couronne pour un seul. ' +
            'Elle promet le trône à celui qui tuera la femme qu’ils aiment. ' +
            'Le sable monte, la coupe passe de main en main.',
        sequence: [
            { p: [7], c: ['Le sable, et personne pour s’y agenouiller à sa place'] },
            // REMPLISSAGE — prose neutre, à remplacer.
            { q: 'Régner, ou n’être plus rien.', by: '' },
            { p: [10, 17], c: ['', ''] },
            { p: [21], c: ['La coupe levée'] },
            { q: 'Tombe sur moi le ciel, pourvu que je me venge !', by: 'Cléopâtre, acte II' },
            { p: [23], c: [''] },
            { p: [20, 15], c: ['', ''] },
            // REMPLISSAGE
            { q: 'Le trône est étroit. On y tient à un.', by: '' },
            { p: [16], c: [''] },
            { p: [18, 13, 9], c: ['', '', ''] },
            { p: [5], c: ['Front contre front'] }
        ]
    },

    'As You Like It': {
        slug: 'asyoulikeit',
        // La forêt d'Ardenne : verts superposés, et les couleurs
        // criardes du bouffon qui viennent dérégler l'ensemble.
        palette: {
            bg: '#0c2013', surface: '#153322', text: '#eaf7e2', muted: '#9dc3a0',
            accent: '#c2d94b', accentInk: '#cfe36a', onAccent: '#0c2013',
            line: 'rgba(194,217,75,0.22)', glow: 'rgba(217,79,43,0.35)'
        },
        synopsis: 'Bannis de la cour, ils partent se cacher dans la forêt d’Ardenne. ' +
            'Rosalinde s’y déguise en garçon et fait répéter à celui qu’elle aime ' +
            'comment l’aimer. On y perd son nom, son rang, sa gravité — ' +
            'et on en revient marié.',
        sequence: [
            { p: [8], c: ['La forêt d’Ardenne, en survêtement'] },
            {
                q: 'Le monde entier est un théâtre, et tous, hommes et femmes,\n' +
                    'n’en sont que les acteurs.', by: 'Jaques, acte II'
            },
            { p: [10, 7], c: ['', ''] },
            { p: [9], c: [''] },
            // REMPLISSAGE
            { q: 'On entre en forêt pour se perdre. C’est le programme.', by: '' },
            { p: [1, 6], c: ['', ''] },
            { p: [3], c: [''] },
            { p: [4, 5], c: ['', ''] },
            { p: [11, 12], c: ['', ''] }
        ]
    },

    'Audiences': {
        slug: 'audiences',
        // Noir institutionnel, bleu-blanc-rouge sourds : la République
        // vue d'une salle d'audience, sur fond de violence.
        palette: {
            bg: '#08080b', surface: '#131620', text: '#ececef', muted: '#9899a4',
            accent: '#c8102e', accentInk: '#e2455c', onAccent: '#ffffff',
            line: 'rgba(236,236,239,0.14)', glow: 'rgba(31,58,147,0.40)'
        },
        synopsis: 'La justice se rend en public, et la salle est vide. ' +
            'On y juge des gens ordinaires pour des faits ordinaires, ' +
            'dans une langue qui n’est celle de personne.',
        sequence: [
            { p: [8], c: [''] },
            // REMPLISSAGE — le texte de Ronan Chéneau n'est pas cité.
            { q: 'La salle est ouverte à tous. Il n’y a personne.', by: '' },
            { p: [6, 5], c: ['', ''] },
            { p: [4, 1], c: ['', ''] },
            // REMPLISSAGE
            { q: 'On appelle l’affaire suivante.', by: '' },
            { p: [2, 3], c: ['', ''] }
        ]
    },

    'À la barre, peine perdue ?': {
        slug: 'alabarre',
        palette: {
            bg: '#08080b', surface: '#131620', text: '#ececef', muted: '#9899a4',
            accent: '#c8102e', accentInk: '#e2455c', onAccent: '#ffffff',
            line: 'rgba(236,236,239,0.14)', glow: 'rgba(31,58,147,0.40)'
        },
        synopsis: 'Juge, accusé, greffier, avocat, narrateur — et la même voix ' +
            'pour tous. Le procès se rejoue à chaque fois qu’on change de place, ' +
            'et chaque place a ses raisons.',
        sequence: [
            { p: [19], c: [''] },
            // REMPLISSAGE — le texte de Ronan Chéneau n'est pas cité.
            { q: 'Levez-vous. Asseyez-vous. Approchez de la barre.', by: '' },
            { p: [20, 8], c: ['', ''] },
            { p: [22], c: [''] },
            { p: [4, 13], c: ['', ''] },
            // REMPLISSAGE
            { q: 'Qui parle, quand la loi parle ?', by: '' },
            { p: [14, 12], c: ['', ''] },
            { p: [9, 5, 6, 7], c: ['', '', '', ''] },
            { p: [25, 26], c: ['', ''] }
        ]
    },

    'Fulguré.e.s': {
        slug: 'fulgurees',
        // La nuit et la foudre : bleus profonds, éclats blancs.
        palette: {
            bg: '#04050d', surface: '#0c1226', text: '#eef1ff', muted: '#8f9ac2',
            accent: '#8fa8ff', accentInk: '#a7bbff', onAccent: '#04050d',
            line: 'rgba(143,168,255,0.20)', glow: 'rgba(255,255,255,0.45)'
        },
        synopsis: 'Ils ont vingt ans et quelque chose leur est tombé dessus. ' +
            'La nuit, la vitesse, les corps qui se cherchent sous les néons — ' +
            'et ce qui reste, au matin, quand la foudre est passée.',
        sequence: [
            { p: [10], c: ['Avant l’orage'] },
            // REMPLISSAGE — le texte de Jérémie Fabre n'est pas cité.
            { q: 'On n’entend pas la foudre. On la reçoit.', by: '' },
            { p: [7], c: [''] },
            { p: [8, 5, 19], c: ['', '', ''] },
            { p: [23], c: [''] },
            // REMPLISSAGE
            { q: 'Après, il faut bien se relever et aller travailler.', by: '' },
            { p: [3, 1, 4], c: ['', '', ''] },
            { p: [2], c: [''] },
            { p: [27, 26], c: ['', ''] }
        ]
    },
};


/* ══════════════════════════════════════════════════════════════
   MOTEUR — ouverture, palette, parallaxe, fermeture
   ══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let overlay, scroller, lastFocus = null, isOpen = false, rafId = 0;

    // esc() vit dans le script en ligne d'index.html ; repli au cas où
    // l'ordre de chargement changerait.
    const escape = (v) => (typeof esc === 'function'
        ? esc(v)
        : String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

    function universeFor(li) {
        return SHOW_UNIVERSES[li?.dataset?.cvShow || ''] || null;
    }

    // ── Dates : relues dans dates.js, jamais dupliquées ici ──────────
    function datesBlock(key) {
        if (typeof upcomingPerformances !== 'function') return '';
        const dates = upcomingPerformances().filter(p => p.title === key);
        if (!dates.length) return '';
        const rows = dates.map(p => {
            const t = (typeof performanceTimeStr === 'function' ? performanceTimeStr(p) : (p.time || ''));
            const school = p.isSchool ? ' <span class="u-warn">· séance scolaire</span>' : '';
            return `<li class="u-date">
                <span class="u-date-when">${escape(p.dateLabel)}</span>
                <span class="u-date-where">${escape(p.location)}</span>
                <span class="u-date-time">${t ? escape(t) : 'horaire à confirmer'}${school}</span>
            </li>`;
        }).join('');
        return `<ul class="u-dates">${rows}</ul>`;
    }

    // Les titres du CV portent souvent une incise en <span> — l'auteur,
    // « (Racine) ». En plein écran elle ne peut pas rester dans le titre
    // en Cinzel 5rem : on la sépare pour la poser sous le titre.
    function titleParts(li) {
        const el = li.querySelector('.cv-title');
        if (!el) return { main: '', author: '' };
        const main = [...el.childNodes]
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
        const author = el.querySelector('span')?.textContent.trim().replace(/^\(|\)$/g, '') || '';
        return { main: main || el.textContent.trim(), author };
    }

    function rowInfo(li) {
        const txt = (sel) => li.querySelector(sel)?.textContent.trim() || '';
        const t = titleParts(li);
        return {
            year: txt('.cv-year'),
            title: t.main,
            author: t.author,
            role: txt('.cv-role'),
            company: txt('.cv-subtitle'),
            badge: txt('.cv-badge'),
            url: li.dataset.cvUrl || '',
            key: li.dataset.cvShow || ''
        };
    }

    // ── Le récit s'écrit ─────────────────────────────────────────────
    //  Le titre se pose lettre à lettre, vite ; le synopsis s'inscrit
    //  mot à mot, lentement, en sortant d'un flou. Deux tempos, deux
    //  natures : une frappe, puis une voix.
    //
    //  Tout est piloté par un compteur en millisecondes que l'on fait
    //  avancer plus ou moins vite — et NON par des animation-delay CSS,
    //  qu'on ne pourrait pas accélérer en cours de route. Défiler pousse
    //  ce compteur : le texte s'écrit plus vite sous le geste, puis
    //  retrouve son tempo. Le hero reste collé pendant ce temps (voir
    //  .u-hero-wrap), de sorte que le premier geste écrit la page avant
    //  de la quitter.
    const CH_STEP = 34;      // ms par lettre du titre — rapide
    const WORD_STEP = 108;   // ms par mot du synopsis — doux
    const BREATH = 320;      // respiration entre le titre et le synopsis
    const MAX_RATE = 9;

    function splitChars(str) {
        return String(str).split('').map((ch, i) => ch === ' '
            ? ' '
            : `<span class="u-ch" style="--i:${i}">${escape(ch)}</span>`).join('');
    }

    function splitWords(str) {
        return String(str).split(/\s+/).filter(Boolean)
            .map((w, i) => `<span class="u-wd" style="--i:${i}">${escape(w)}</span>`)
            .join(' ');
    }

    let writeRaf = 0, writeRate = 1, writeGuard = 0;

    function stopWriting() {
        if (writeRaf) cancelAnimationFrame(writeRaf);
        if (writeGuard) clearTimeout(writeGuard);
        writeRaf = writeGuard = 0;
    }

    function playWriting() {
        stopWriting();
        const chars = [...overlay.querySelectorAll('.u-ch')];
        const words = [...overlay.querySelectorAll('.u-wd')];
        const hero = overlay.querySelector('.u-hero');
        if (!hero) return;

        const finish = () => {
            stopWriting();
            chars.forEach(el => el.classList.add('is-lit'));
            words.forEach(el => el.classList.add('is-lit'));
            hero.classList.add('is-titled', 'is-written');
        };
        if (REDUCED) { finish(); return; }

        // Garde-fou : requestAnimationFrame ne s'exécute pas dans un onglet
        // en arrière-plan, et certains navigateurs l'étranglent. Un titre
        // qui resterait invisible serait pire que pas d'animation du tout —
        // au-delà de ce délai, le texte s'affiche quoi qu'il arrive.
        const natural = chars.length * CH_STEP + BREATH + words.length * WORD_STEP;
        writeGuard = setTimeout(finish, natural + 6000);

        let clock = 0, last = performance.now();
        writeRate = 1;
        let litChars = 0, litWords = 0;

        const frame = (now) => {
            writeRaf = 0;
            clock += Math.min(now - last, 64) * writeRate;   // Math.min : un
            last = now;                                      // onglet revenu
            // au premier plan ne doit pas tout écrire d'un coup.

            const nCh = Math.min(chars.length, Math.floor(clock / CH_STEP));
            while (litChars < nCh) chars[litChars++].classList.add('is-lit');

            const after = clock - chars.length * CH_STEP - BREATH;
            const nWd = Math.min(words.length, Math.floor(after / WORD_STEP));
            while (litWords < nWd) words[litWords++].classList.add('is-lit');

            // Le raccourci vers les dates apparaît dès le titre posé :
            // c'est souvent la seule chose qu'on est venu chercher.
            if (litChars >= chars.length) hero.classList.add('is-titled');

            // Le tempo forcé par le défilement retombe tout seul.
            writeRate += (1 - writeRate) * 0.045;

            if (litWords >= words.length && litChars >= chars.length) {
                hero.classList.add('is-written');
                stopWriting();
                return;
            }
            if (isOpen) writeRaf = requestAnimationFrame(frame);
        };
        writeRaf = requestAnimationFrame(frame);
    }

    // Appelé par le défilement : pousse le tempo sans jamais le figer.
    function nudgeWriting(amount) {
        if (!writeRaf) return;
        writeRate = Math.min(MAX_RATE, writeRate + amount);
    }

    // ── Le montage ───────────────────────────────────────────────────
    //  La séquence est écrite à la main dans SHOW_UNIVERSES : c'est un
    //  montage, pas un diaporama, et le nombre de photos d'un temps
    //  suffit à décider de sa mise en page.
    //
    //  1 photo  → `plein`    plein cadre recadré, parallaxe : l'ambiance
    //  2 photos → `duo`      côte à côte, la seconde décalée
    //  3 photos → `trio`     une haute à gauche, deux empilées à droite
    //  4 photos → `quatuor`  cascade en quinconce
    //
    //  Duos, trios et quatuors passent dans des cadres de hauteur fixe :
    //  les photos du dossier mêlent portrait et paysage, et à proportions
    //  libres un portrait faisait déborder la composition sur deux écrans.
    //  Elles y sont donc recadrées, comme le plein cadre. D'où la règle :
    //  TOUTE photo s'agrandit au clic, et n'est montrée entière que là.
    const LAYOUT_BY_COUNT = { 1: 'plein', 2: 'duo', 3: 'trio', 4: 'quatuor' };

    function photoSrc(uni, n) {
        return `ressources/images/univers/${uni.slug}/${n}.jpg`;
    }

    // Aplatit la séquence en une liste de photos, dans l'ordre du défilé :
    // c'est elle qui indexe `data-u-zoom` et la navigation de
    // l'agrandissement.
    function flatPhotos(uni) {
        const out = [];
        (uni.sequence || []).forEach(beat => {
            if (!beat.p) return;
            beat.p.forEach((n, i) => out.push({
                src: photoSrc(uni, n),
                caption: (beat.c && beat.c[i]) || ''
            }));
        });
        return out;
    }

    function figureHtml(ph, layout, index, title, eager) {
        const cap = ph.caption || '';
        return `<figure class="u-fig u-fig--${layout}" style="--i:${index}">
            <button type="button" class="u-fig-media" data-u-zoom="${index}"
                    aria-label="Agrandir : ${escape(cap || title)}">
                <img src="${escape(ph.src)}" alt="${escape(cap || title)}"
                     loading="${eager ? 'eager' : 'lazy'}" decoding="async">
                <span class="u-fig-loupe" aria-hidden="true"><i class="fa-solid fa-expand"></i></span>
            </button>
            ${cap ? `<figcaption class="u-cap"><span>${escape(cap)}</span></figcaption>` : ''}
        </figure>`;
    }

    function beatsHtml(uni, title) {
        let index = 0;
        return (uni.sequence || []).map(beat => {
            if (beat.q) {
                // Les alexandrins se coupent au vers, pas à la largeur de
                // l'écran : \n dans le texte = fin de vers.
                return `<blockquote class="u-quote">
                    <p>${escape(beat.q).replace(/\n/g, '<br>')}</p>
                    ${beat.by ? `<cite>${escape(beat.by)}</cite>` : ''}
                </blockquote>`;
            }
            if (!beat.p || !beat.p.length) return '';
            const layout = LAYOUT_BY_COUNT[beat.p.length] || 'plein';
            const inner = beat.p.map((n, i) => figureHtml(
                { src: photoSrc(uni, n), caption: (beat.c && beat.c[i]) || '' },
                layout, index, title, index++ < 3
            )).join('');
            return layout === 'plein'
                ? inner
                : `<div class="u-group u-${layout}">${inner}</div>`;
        }).join('');
    }

    function render(li, uni) {
        const info = rowInfo(li);
        const figures = beatsHtml(uni, info.title);
        const dates = datesBlock(info.key);

        overlay.innerHTML = `
        <button type="button" class="u-close" aria-label="Fermer l’univers du spectacle">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
        <div class="u-progress" aria-hidden="true"><span></span></div>

        <div class="u-hero-wrap">
        <header class="u-hero">
            <p class="u-eyebrow">${escape(info.year)}${info.badge ? ' · ' + escape(info.badge) : ''}</p>
            <h2 class="u-title">${splitChars(info.title)}</h2>
            ${info.author ? `<p class="u-author">${escape(info.author)}</p>` : ''}
            ${uni.synopsis ? `<p class="u-synopsis">${splitWords(uni.synopsis)}</p>` : ''}
            <p class="u-meta">${escape(info.role)}${info.company ? '<br>' + escape(info.company) : ''}</p>

            <!-- Raccourci vers les dates dès le titre : sans lui, il faut
                 traverser tout le défilé de photos pour savoir quand voir le
                 spectacle — or c'est souvent la seule raison de la visite. -->
            <div class="u-hero-actions">
                <button type="button" class="u-btn" data-u-jump>
                    ${dates ? 'Accéder aux dates' : 'Voir les représentations'}
                    <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>
                </button>
            </div>

            <span class="u-scroll" aria-hidden="true"><i class="fa-solid fa-arrow-down"></i></span>
            <span class="u-loader" role="status" aria-label="Chargement des visuels"></span>
        </header>
        </div>

        <div class="u-figs">${figures}</div>

        <footer class="u-foot">
            <h3 class="u-foot-title">${dates ? 'Prochaines représentations' : 'Ce spectacle n’est plus à l’affiche'}</h3>
            ${dates || `<p class="u-empty">Les représentations passées sont dans l’onglet Dates.</p>`}
            <div class="u-actions">
                ${info.url ? `<a class="u-btn" href="${escape(info.url)}" target="_blank" rel="noopener">Page du spectacle <i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i></a>` : ''}
                <button type="button" class="u-btn u-btn-ghost" data-u-dates="${escape(info.key)}">Voir toutes les dates</button>
            </div>
            ${uni.credit ? `<p class="u-credit">Photographies : ${escape(uni.credit)}</p>` : ''}
        </footer>

        <!-- Agrandissement : la photo entière, jamais recadrée. C'est le
             recours quand le plein cadre ne dit pas ce qu'on regarde. -->
        <div class="u-zoom" hidden role="dialog" aria-modal="true" aria-label="Photo agrandie">
            <button type="button" class="u-close u-zoom-close" aria-label="Fermer la photo">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
            <button type="button" class="u-zoom-nav u-zoom-prev" aria-label="Photo précédente">
                <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            </button>
            <button type="button" class="u-zoom-nav u-zoom-next" aria-label="Photo suivante">
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
            <figure>
                <img alt="" decoding="async">
                <figcaption></figcaption>
            </figure>
        </div>`;
    }

    function applyPalette(p) {
        const s = overlay.style;
        s.setProperty('--u-bg', p.bg);
        s.setProperty('--u-surface', p.surface);
        s.setProperty('--u-text', p.text);
        s.setProperty('--u-muted', p.muted);
        s.setProperty('--u-accent', p.accent);
        s.setProperty('--u-accent-ink', p.accentInk);
        s.setProperty('--u-on-accent', p.onAccent);
        s.setProperty('--u-line', p.line);
        s.setProperty('--u-glow', p.glow);
        // La barre du navigateur sur mobile suit aussi la palette : c'est
        // là que se joue vraiment le « le site change de peau ».
        document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
            if (!m.dataset.uPrev) m.dataset.uPrev = m.content;
            m.content = p.bg;
        });
    }

    function restoreThemeColor() {
        document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
            if (m.dataset.uPrev) m.content = m.dataset.uPrev;
        });
    }

    // ── Parallaxe + révélation ───────────────────────────────────────
    let lastScrollTop = 0;

    function onScroll() {
        // Le geste pousse l'écriture avant même d'avoir bougé la page :
        // c'est ce qui donne l'impression que le récit répond à la main.
        const moved = Math.abs(overlay.scrollTop - lastScrollTop);
        lastScrollTop = overlay.scrollTop;
        if (moved) nudgeWriting(moved / 90);

        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            const h = overlay.clientHeight;
            const total = scroller.scrollHeight - h;
            const bar = overlay.querySelector('.u-progress span');
            if (bar) bar.style.transform = `scaleX(${total > 0 ? scroller.scrollTop / total : 0})`;
            if (REDUCED) return;

            // Plein cadre : l'image glisse dans son cadre.
            overlay.querySelectorAll('.u-fig--plein').forEach(fig => {
                const r = fig.getBoundingClientRect();
                if (r.bottom < -200 || r.top > h + 200) return;
                // -1 (figure sous l'écran) → +1 (figure au-dessus)
                const t = (h / 2 - (r.top + r.height / 2)) / (h / 2 + r.height / 2);
                const img = fig.querySelector('img');
                if (img) img.style.transform = `translate3d(0, ${(t * 9).toFixed(2)}%, 0) scale(1.22)`;
            });

            // Trios et quatuors : chaque vignette avance à sa propre
            // vitesse. C'est ce décalage — quelques pour cent — qui donne
            // de la profondeur à une composition plate, plutôt qu'un bloc
            // d'images qui monte d'un seul tenant.
            overlay.querySelectorAll('.u-group').forEach(group => {
                const gr = group.getBoundingClientRect();
                if (gr.bottom < -200 || gr.top > h + 200) return;
                const t = (h / 2 - (gr.top + gr.height / 2)) / (h / 2 + gr.height / 2);
                group.querySelectorAll('.u-fig').forEach((fig, i) => {
                    const depth = 1 + (i % 3) * 0.9;   // 1, 1.9, 2.8
                    const img = fig.querySelector('img');
                    if (img) img.style.transform =
                        `translate3d(0, ${(t * depth * 2.4).toFixed(2)}%, 0) scale(1.10)`;
                });
            });
        });
    }

    const REVEALED = '.u-fig, .u-group, .u-quote, .u-foot';

    function observeCaptions() {
        if (!('IntersectionObserver' in window)) {
            overlay.querySelectorAll(REVEALED).forEach(el => el.classList.add('is-in'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
        }, { threshold: 0.25, root: overlay });
        overlay.querySelectorAll(REVEALED).forEach(el => io.observe(el));
    }

    // ── Agrandissement d'une photo ───────────────────────────────────
    //  Le défilé recadre : plein cadre en 16:10, en duo, en médaillon.
    //  L'agrandissement est le seul endroit où la photo est montrée
    //  ENTIÈRE (object-fit: contain), avec sa légende.
    let zoomPhotos = [], zoomIndex = 0;

    function zoomEl() { return overlay.querySelector('.u-zoom'); }

    function showZoom(i) {
        const box = zoomEl();
        if (!box || !zoomPhotos.length) return;
        zoomIndex = (i + zoomPhotos.length) % zoomPhotos.length;
        const ph = zoomPhotos[zoomIndex];
        const img = box.querySelector('img');
        const cap = box.querySelector('figcaption');
        img.src = ph.src;
        img.alt = ph.caption || '';
        cap.textContent = ph.caption || '';
        box.querySelectorAll('.u-zoom-nav').forEach(b => b.hidden = zoomPhotos.length < 2);
    }

    function openZoom(i) {
        const box = zoomEl();
        if (!box) return;
        showZoom(i);
        box.hidden = false;
        void box.offsetHeight;
        box.classList.add('is-open');
        window.pushOverlayState?.('u-zoom');
        box.querySelector('.u-zoom-close')?.focus({ preventScroll: true });
    }

    function closeZoom() {
        const box = zoomEl();
        if (!box || box.hidden) return;
        box.classList.remove('is-open');
        window.dropOverlayState?.('u-zoom');
        const done = () => { if (box.isConnected) { box.hidden = true; box.querySelector('img').src = ''; } };
        if (REDUCED) done(); else setTimeout(done, 300);
    }

    function zoomIsOpen() {
        const box = zoomEl();
        return !!box && !box.hidden;
    }

    // Le titre s'affiche tout de suite ; les photos n'apparaissent qu'une
    // fois la première DÉCODÉE. Sans cette attente, l'image se peint au
    // milieu de l'animation d'ouverture et la fait tomber à ~20 i/s : c'est
    // le décodage, pas le téléchargement, qui saccadait.
    // La croix et le bouton « Accéder aux dates » restent actifs pendant ce
    // temps : on doit toujours pouvoir renoncer.
    const MAX_WAIT_MS = 2500;

    function awaitFirstPhoto(uni) {
        const first = flatPhotos(uni)[0]?.src;
        if (!first) return Promise.resolve();
        return Promise.race([
            new Promise(resolve => {
                const im = new Image();
                im.src = first;
                (im.decode ? im.decode() : Promise.resolve()).then(resolve, resolve);
                im.onload = im.onerror = resolve;
            }),
            // Filet : une image manquante ou un réseau qui traîne ne doit
            // jamais laisser le panneau bloqué sur son voile de chargement.
            new Promise(resolve => setTimeout(resolve, MAX_WAIT_MS))
        ]);
    }

    // ── Ouverture : le panneau se déplie depuis la ligne cliquée ─────
    let openToken = 0;

    function open(li) {
        const uni = universeFor(li);
        if (!uni) return false;

        const token = ++openToken;
        lastFocus = document.activeElement;
        render(li, uni);
        applyPalette(uni.palette);
        overlay.dataset.slug = uni.slug;
        scroller = overlay;
        zoomPhotos = flatPhotos(uni);   // même ordre que les data-u-zoom du défilé

        const r = li.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        overlay.hidden = false;
        // APRÈS avoir rendu le panneau visible : tant qu'il est `hidden`, il
        // n'a pas de boîte de défilement et l'affectation est ignorée. Sans
        // cela, ouvrir un second spectacle après avoir lu le premier jusqu'aux
        // dates faisait arriver directement en bas de page.
        overlay.scrollTop = 0;
        overlay.classList.add('is-loading');
        if (!REDUCED) {
            overlay.style.willChange = 'clip-path';
            overlay.style.clipPath = `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px round 10px)`;
            // Reflow imposé : sans lui, le navigateur fusionne l'état de
            // départ et l'état d'arrivée et rien ne s'anime.
            void overlay.offsetHeight;
        }
        overlay.classList.add('is-open');
        overlay.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';

        awaitFirstPhoto(uni).then(() => {
            // Panneau refermé, ou déjà rouvert sur un autre spectacle,
            // pendant le chargement : ce résultat ne vaut plus rien.
            if (token !== openToken || !isOpen) return;
            overlay.classList.remove('is-loading');
            overlay.style.willChange = '';
            onScroll();
        });

        document.documentElement.classList.add('u-locked');
        // Une entrée d'historique de plus : « précédent » referme l'univers
        // et rend le CV, au lieu de quitter le site (voir index.html).
        window.pushOverlayState?.('univers');
        isOpen = true;
        overlay.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        observeCaptions();
        lastScrollTop = 0;
        playWriting();
        overlay.querySelector('.u-close')?.focus({ preventScroll: true });
        return true;
    }

    function close() {
        if (!isOpen) return;
        // L'agrandissement est empilé PAR-DESSUS l'univers : le dépiler
        // d'abord, sinon l'historique garderait une entrée orpheline.
        closeZoom();
        stopWriting();
        isOpen = false;
        openToken++;
        overlay.classList.remove('is-open', 'is-loading');
        overlay.style.willChange = '';
        overlay.removeEventListener('scroll', onScroll);
        document.documentElement.classList.remove('u-locked');
        restoreThemeColor();
        window.dropOverlayState?.('univers');
        const done = () => { overlay.hidden = true; overlay.innerHTML = ''; };
        if (REDUCED) done(); else setTimeout(done, 420);
        lastFocus?.focus?.({ preventScroll: true });
    }

    function init() {
        overlay = document.getElementById('show-universe');
        if (!overlay) return;

        overlay.addEventListener('click', (e) => {
            // L'agrandissement d'abord : sa croix porte aussi la classe
            // .u-close, elle ne doit pas refermer tout l'univers.
            if (e.target.closest('.u-zoom-close')) { closeZoom(); return; }
            if (e.target.closest('.u-zoom-prev')) { showZoom(zoomIndex - 1); return; }
            if (e.target.closest('.u-zoom-next')) { showZoom(zoomIndex + 1); return; }
            // Clic sur le fond noir de l'agrandissement (pas sur l'image)
            if (zoomIsOpen() && e.target.closest('.u-zoom') && !e.target.closest('figure')) {
                closeZoom(); return;
            }

            const zoomBtn = e.target.closest('[data-u-zoom]');
            if (zoomBtn) { openZoom(Number(zoomBtn.dataset.uZoom)); return; }

            if (e.target.closest('.u-close')) { close(); return; }

            // « Accéder aux dates » : on saute au pied du panneau. Les
            // photos restent au-dessus, on ne les a pas perdues.
            if (e.target.closest('[data-u-jump]')) {
                const foot = overlay.querySelector('.u-foot');
                if (!foot) return;
                foot.classList.add('is-in');
                overlay.querySelectorAll(REVEALED).forEach(f => f.classList.add('is-in'));
                foot.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
                return;
            }

            const toDates = e.target.closest('[data-u-dates]');
            if (toDates) {
                const key = toDates.dataset.uDates;
                close();
                if (typeof goToDatesForShow === 'function') setTimeout(() => goToDatesForShow(key), 60);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!isOpen) return;
            if (zoomIsOpen()) {
                if (e.key === 'Escape') { e.stopPropagation(); closeZoom(); }
                else if (e.key === 'ArrowLeft') showZoom(zoomIndex - 1);
                else if (e.key === 'ArrowRight') showZoom(zoomIndex + 1);
                return;
            }
            if (e.key === 'Escape') { e.stopPropagation(); close(); }
        }, true);

        // Le CV appelle openShowUniverse() avant de replier son tiroir.
        window.openShowUniverse = open;
        window.closeShowUniverse = close;
        window.closeUniverseZoom = closeZoom;
        window.hasShowUniverse = (li) => !!universeFor(li);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
