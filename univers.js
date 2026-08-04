/**
 * ============================================================
 *  UNIVERS DES SPECTACLES — plein écran depuis le CV
 * ============================================================
 *  Au clic sur une ligne du CV, au lieu du simple tiroir de dates,
 *  on ouvre une page plein écran qui prend la palette du spectacle :
 *  titre, ambiance, défilé de photos, puis les prochaines dates.
 *
 *  AJOUTER / MODIFIER UN UNIVERS
 *  -----------------------------
 *  La clé de chaque entrée doit être EXACTEMENT la valeur de
 *  `data-cv-show` sur le <li class="cv-item"> correspondant dans
 *  index.html — c'est le même appariement que pour les dates.
 *  Un spectacle sans entrée ici garde l'ancien tiroir : c'est le cas
 *  volontaire de « L'imaginaire forcé » et « Le discours de Cassandre »,
 *  dont la direction visuelle n'est pas arrêtée.
 *
 *  photos : chemins servis tels quels, en 1600x1000 et < 300 Ko.
 *    - `<slug>-photo-N.jpg` = VRAIES photos de plateau, découpées depuis
 *      `ressources/spectacles/` par `build/prepare-univers-photos.py`.
 *    - `<slug>-N.jpg` = visuels témoins générés (`build/gen-univers.py`),
 *      encore en place pour Audiences et À la barre, dont les dossiers
 *      de photos sont vides. À remplacer dès qu'il y aura des images.
 *
 *  credit : nom du ou de la photographe, affiché au pied du panneau.
 *  À renseigner dès que les photos ne sont pas libres de crédit.
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
        tagline: 'Trois personnes qui s’aiment et que rien ne sauve.',
        photos: [
            { src: 'ressources/images/univers/berenice-photo-1.jpg', caption: 'Le cercle blanc, le public tout autour' },
            { src: 'ressources/images/univers/berenice-photo-2.jpg', caption: 'Assis côte à côte, déjà séparés' },
            { src: 'ressources/images/univers/berenice-photo-3.jpg', caption: 'L’étreinte' },
            { src: 'ressources/images/univers/berenice-photo-4.jpg', caption: 'Ce qui emporte les corps' },
            { src: 'ressources/images/univers/berenice-photo-5.jpg', caption: 'Rouge — le seul endroit où l’on saigne' }
        ]
    },

    'Cléophène': {
        slug: 'cleophene',
        // Chaleur désertique : or, brun sombre, une lumière basse.
        palette: {
            bg: '#150c05', surface: '#241608', text: '#f5e8d2', muted: '#b59878',
            accent: '#d9a24a', accentInk: '#e6b767', onAccent: '#150c05',
            line: 'rgba(217,162,74,0.20)', glow: 'rgba(217,162,74,0.32)'
        },
        tagline: 'Une couronne, deux frères, et du sable dans la bouche.',
        credit: 'Arnaud Bertereau',
        photos: [
            { src: 'ressources/images/univers/cleophene-photo-1.jpg', caption: 'Le sable, et personne pour s’y agenouiller à sa place' },
            { src: 'ressources/images/univers/cleophene-photo-2.jpg', caption: 'La coupe levée' },
            { src: 'ressources/images/univers/cleophene-photo-3.jpg', caption: 'Les mains sur la tête du fils' },
            { src: 'ressources/images/univers/cleophene-photo-4.jpg', caption: 'À terre' },
            { src: 'ressources/images/univers/cleophene-photo-5.jpg', caption: 'Front contre front' }
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
        tagline: 'On part se perdre en forêt, on en revient amoureux.',
        // Une seule photo au dossier pour l'instant : mieux vaut une vraie
        // image que quatre ambiances inventées autour d'elle.
        photos: [
            { src: 'ressources/images/univers/asyoulikeit-photo-1.jpg', caption: 'La forêt d’Ardenne, en survêtement' }
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
        tagline: 'La justice se rend en public. Personne ne regarde.',
        photos: [
            { src: 'ressources/images/univers/audiences-1.jpg', caption: 'La salle, avant l’audience' },
            { src: 'ressources/images/univers/audiences-2.jpg', caption: 'Bleu administratif' },
            { src: 'ressources/images/univers/audiences-3.jpg', caption: 'Le prévenu' },
            { src: 'ressources/images/univers/audiences-4.jpg', caption: 'Rouge — ce que le procès recouvre' },
            { src: 'ressources/images/univers/audiences-5.jpg', caption: 'Le délibéré' }
        ]
    },

    'À la barre, peine perdue ?': {
        slug: 'audiences',
        palette: {
            bg: '#08080b', surface: '#131620', text: '#ececef', muted: '#9899a4',
            accent: '#c8102e', accentInk: '#e2455c', onAccent: '#ffffff',
            line: 'rgba(236,236,239,0.14)', glow: 'rgba(31,58,147,0.40)'
        },
        tagline: 'Juge, accusé, greffier, avocat — et la même voix pour tous.',
        photos: [
            { src: 'ressources/images/univers/audiences-3.jpg', caption: 'La barre' },
            { src: 'ressources/images/univers/audiences-1.jpg', caption: 'Un tribunal vide est un décor' },
            { src: 'ressources/images/univers/audiences-5.jpg', caption: 'Les rôles changent de côté' },
            { src: 'ressources/images/univers/audiences-2.jpg', caption: 'Le code, la loi, la lenteur' },
            { src: 'ressources/images/univers/audiences-4.jpg', caption: 'Peine perdue ?' }
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
        tagline: 'Ce qui reste quand la foudre est passée par vous.',
        photos: [
            { src: 'ressources/images/univers/fulgurees-photo-1.jpg', caption: 'Avant l’orage' },
            { src: 'ressources/images/univers/fulgurees-photo-2.jpg', caption: 'L’éclat' },
            { src: 'ressources/images/univers/fulgurees-photo-3.jpg', caption: 'Les rayons' },
            { src: 'ressources/images/univers/fulgurees-photo-4.jpg', caption: 'Dans la brume, à deux' },
            { src: 'ressources/images/univers/fulgurees-photo-5.jpg', caption: 'Ce qui reste' }
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

    function render(li, uni) {
        const info = rowInfo(li);
        const figures = uni.photos.map((ph, i) => `
            <figure class="u-fig" data-i="${i}">
                <div class="u-fig-media"><img src="${escape(ph.src)}" alt="${escape(ph.caption || info.title)}" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async"></div>
                <figcaption class="u-cap"><span>${escape(ph.caption || '')}</span></figcaption>
            </figure>`).join('');

        const dates = datesBlock(info.key);

        overlay.innerHTML = `
        <button type="button" class="u-close" aria-label="Fermer l’univers du spectacle">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
        <div class="u-progress" aria-hidden="true"><span></span></div>

        <header class="u-hero">
            <p class="u-eyebrow">${escape(info.year)}${info.badge ? ' · ' + escape(info.badge) : ''}</p>
            <h2 class="u-title">${escape(info.title)}</h2>
            ${info.author ? `<p class="u-author">${escape(info.author)}</p>` : ''}
            ${uni.tagline ? `<p class="u-tagline">${escape(uni.tagline)}</p>` : ''}
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

        <div class="u-figs">${figures}</div>

        <footer class="u-foot">
            <h3 class="u-foot-title">${dates ? 'Prochaines représentations' : 'Ce spectacle n’est plus à l’affiche'}</h3>
            ${dates || `<p class="u-empty">Les représentations passées sont dans l’onglet Dates.</p>`}
            <div class="u-actions">
                ${info.url ? `<a class="u-btn" href="${escape(info.url)}" target="_blank" rel="noopener">Page du spectacle <i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i></a>` : ''}
                <button type="button" class="u-btn u-btn-ghost" data-u-dates="${escape(info.key)}">Voir toutes les dates</button>
            </div>
            ${uni.credit ? `<p class="u-credit">Photographies : ${escape(uni.credit)}</p>` : ''}
        </footer>`;
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

    // ── Parallaxe + révélation des légendes ──────────────────────────
    function onScroll() {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            const h = overlay.clientHeight;
            const total = scroller.scrollHeight - h;
            const bar = overlay.querySelector('.u-progress span');
            if (bar) bar.style.transform = `scaleX(${total > 0 ? scroller.scrollTop / total : 0})`;
            if (REDUCED) return;
            overlay.querySelectorAll('.u-fig').forEach(fig => {
                const r = fig.getBoundingClientRect();
                if (r.bottom < -200 || r.top > h + 200) return;
                // -1 (figure sous l'écran) → +1 (figure au-dessus)
                const t = (h / 2 - (r.top + r.height / 2)) / (h / 2 + r.height / 2);
                const img = fig.querySelector('img');
                if (img) img.style.transform = `translate3d(0, ${(t * 9).toFixed(2)}%, 0) scale(1.22)`;
            });
        });
    }

    function observeCaptions() {
        if (!('IntersectionObserver' in window)) {
            overlay.querySelectorAll('.u-fig, .u-foot').forEach(el => el.classList.add('is-in'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
        }, { threshold: 0.25, root: overlay });
        overlay.querySelectorAll('.u-fig, .u-foot').forEach(el => io.observe(el));
    }

    // Le titre s'affiche tout de suite ; les photos n'apparaissent qu'une
    // fois la première DÉCODÉE. Sans cette attente, l'image se peint au
    // milieu de l'animation d'ouverture et la fait tomber à ~20 i/s : c'est
    // le décodage, pas le téléchargement, qui saccadait.
    // La croix et le bouton « Accéder aux dates » restent actifs pendant ce
    // temps : on doit toujours pouvoir renoncer.
    const MAX_WAIT_MS = 2500;

    function awaitFirstPhoto(uni) {
        const first = uni.photos[0]?.src;
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
        overlay.querySelector('.u-close')?.focus({ preventScroll: true });
        return true;
    }

    function close() {
        if (!isOpen) return;
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
            if (e.target.closest('.u-close')) { close(); return; }

            // « Accéder aux dates » : on saute au pied du panneau. Les
            // photos restent au-dessus, on ne les a pas perdues.
            if (e.target.closest('[data-u-jump]')) {
                const foot = overlay.querySelector('.u-foot');
                if (!foot) return;
                foot.classList.add('is-in');
                overlay.querySelectorAll('.u-fig').forEach(f => f.classList.add('is-in'));
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
            if (e.key === 'Escape' && isOpen) { e.stopPropagation(); close(); }
        }, true);

        // Le CV appelle openShowUniverse() avant de replier son tiroir.
        window.openShowUniverse = open;
        window.closeShowUniverse = close;
        window.hasShowUniverse = (li) => !!universeFor(li);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
