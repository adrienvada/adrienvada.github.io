/**
 * DATES EN DIRECT — lecture de la table Supabase
 * ------------------------------------------------------------------
 *  dates.js reste chargé AVANT ce fichier et reste la version de repli :
 *  si Supabase ne répond pas en trois secondes (projet en pause, réseau
 *  coupé, clé révoquée), le visiteur voit la dernière version figée,
 *  exactement comme avant. Rien ne clignote : le site s'affiche avec
 *  dates.js, puis se réactualise si la base répond.
 *
 *  Ce fichier fait deux choses, volontairement séparées :
 *    1. `versShowData(lignes)` — transforme les lignes de la table
 *       (une par soirée) en la structure que index.html attend déjà
 *       (SHOW_DATA.upcoming : dates uniques et séries). C'est du calcul
 *       pur, sans réseau, réutilisé tel quel par build/exporter-dates.js
 *       sous Node pour régénérer dates.js.
 *    2. Dans le navigateur seulement : interroger la table, et si elle
 *       répond, remplacer SHOW_DATA.upcoming puis relancer les rendus
 *       de la page qui en dépendent.
 *
 *  LA CLÉ CI-DESSOUS EST PUBLIQUE PAR CONSTRUCTION. Supabase l'appelle
 *  « publishable » : elle ne donne que ce que les règles d'accès de la
 *  table autorisent aux anonymes, c'est-à-dire lire. Écrire demande une
 *  session ouverte avec adrien.vada@gmail.com (voir /admin/ et
 *  supabase/schema.sql). La clé « secret », elle, ne doit JAMAIS
 *  apparaître dans ce dépôt.
 * ------------------------------------------------------------------
 */
(function (racine) {
    'use strict';

    const SUPABASE_URL = 'https://omekkqjinvppadsoinvj.supabase.co';
    const SUPABASE_CLE = 'sb_publishable_TODW6NdmDly8eR9UxjG-6g_eyAa4gjB';
    const TABLE = 'representations';
    const DELAI_MS = 3000;

    // Mêmes abréviations que celles écrites à la main dans dates.js — et
    // mêmes ESPACES INSÉCABLES : « 25 nov. 2026 » ne doit jamais se couper
    // en fin de ligne. C'est ce que les libellés manuscrits faisaient déjà.
    const NB = '\u00a0';
    const MOIS_COURT = ['janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin',
        'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    function decouper(iso) {
        const [a, m, j] = String(iso).split('-').map(Number);
        return { a, m, j };
    }
    function jourCourt(iso) { const d = decouper(iso); return `${d.j}${NB}${MOIS_COURT[d.m - 1]}${NB}${d.a}`; }
    function jourLong(iso) { const d = decouper(iso); return `${d.j}${NB}${MOIS_LONG[d.m - 1]}${NB}${d.a}`; }

    // « 22 - 23 oct. 2026 », « 30 oct. - 2 nov. 2026 », « 30 déc. 2026 - 2 janv. 2027 »
    function etiquetteSerie(premier, dernier) {
        const p = decouper(premier), d = decouper(dernier);
        if (premier === dernier) return jourCourt(premier);
        if (p.a === d.a && p.m === d.m) return `${p.j}${NB}-${NB}${d.j}${NB}${MOIS_COURT[d.m - 1]}${NB}${d.a}`;
        if (p.a === d.a) return `${p.j}${NB}${MOIS_COURT[p.m - 1]}${NB}-${NB}${d.j}${NB}${MOIS_COURT[d.m - 1]}${NB}${d.a}`;
        return `${jourCourt(premier)}${NB}-${NB}${jourCourt(dernier)}`;
    }

    function slug(s) {
        return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // Typographie française : espace insécable avant ? ! : ; et à
    // l'intérieur des guillemets. C'est ainsi que les titres sont écrits
    // dans le CV (index.html), et c'est sur le titre exact qu'une date
    // retrouve sa ligne du CV — une espace ordinaire romprait le lien.
    function typographie(s) {
        return String(s ?? '')
            .replace(/[ \u202f]+([?!:;])/g, NB + '$1')
            .replace(/«[ ]+/g, '«' + NB).replace(/[ ]+»/g, NB + '»')
            .replace(/[ \t\r\n]+/g, ' ')
            .trim();
    }

    function utc(iso) { const d = decouper(iso); return Date.UTC(d.a, d.m - 1, d.j); }
    function joursEntre(isoA, isoB) { return Math.round((utc(isoB) - utc(isoA)) / 86400000); }

    /**
     * Lignes de la table → SHOW_DATA.upcoming.
     *
     * Une SÉRIE, c'est plusieurs soirées d'un même spectacle au même lieu,
     * rapprochées dans le temps (au plus une semaine entre deux). Le même
     * spectacle au même lieu six mois plus tard fait une autre série :
     * c'est ce qu'on aurait écrit à la main.
     */
    function versShowData(lignes) {
        const tri = lignes.map(l => Object.assign({}, l, {
            spectacle: typographie(l.spectacle), lieu: typographie(l.lieu), ville: typographie(l.ville)
        })).sort((x, y) =>
            x.jour < y.jour ? -1 : x.jour > y.jour ? 1 : String(x.heure).localeCompare(String(y.heure)));

        const groupes = [];
        tri.forEach(l => {
            const cle = `${l.spectacle} ${l.lieu}`;
            const g = groupes.find(g => g.cle === cle && joursEntre(g.dernier, l.jour) <= 7);
            if (g) { g.lignes.push(l); g.dernier = l.jour; }
            else groupes.push({ cle, lignes: [l], premier: l.jour, dernier: l.jour });
        });

        // `id` : l'identifiant de la ligne en base. Le site l'ignore ; la
        // page d'administration s'en sert pour retrouver la ligne à modifier.
        const soiree = l => ({
            id: l.id,
            dateLabel: jourCourt(l.jour),
            time: l.heure || '',
            bookingUrl: l.reservation_url || '',
            isSchool: !!l.scolaire,
            icsDate: l.jour
        });

        return groupes.map(g => {
            const t = g.lignes[0];
            if (g.lignes.length === 1) {
                return Object.assign({
                    type: 'single',
                    dateLabel: jourCourt(t.jour),
                    fullDate: jourLong(t.jour),
                    title: t.spectacle,
                    location: t.lieu, city: t.ville
                }, soiree(t));
            }
            return {
                type: 'series',
                id: `panel-${slug(t.spectacle)}-${slug(t.ville)}-${g.premier}`,
                dateLabel: etiquetteSerie(g.premier, g.dernier),
                title: t.spectacle,
                location: t.lieu, city: t.ville,
                shows: g.lignes.map(soiree)
            };
        });
    }

    // Toute la table, triée par jour : le site fait lui-même le partage
    // entre à-venir et passé (splitUpcoming), comme pour dates.js.
    const ADRESSE_LECTURE = `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=jour.asc,heure.asc`;

    const api = { SUPABASE_URL, SUPABASE_CLE, TABLE, ADRESSE_LECTURE, versShowData, typographie, jourCourt, jourLong };

    // ── Node (build/exporter-dates.js) : on n'exporte que le calcul ──
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
    racine.DatesLive = api;

    // ── Navigateur : lecture, puis mise à jour de la page ──
    if (typeof fetch !== 'function' || typeof AbortController !== 'function') return;

    const garde = new AbortController();
    const minuteur = setTimeout(() => garde.abort(), DELAI_MS);

    fetch(ADRESSE_LECTURE, { headers: { apikey: SUPABASE_CLE }, signal: garde.signal })
        .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
        .then(lignes => {
            if (!Array.isArray(lignes) || !lignes.length) return;
            appliquer(versShowData(lignes));
        })
        .catch(() => { /* repli silencieux : dates.js reste affiché */ })
        .finally(() => clearTimeout(minuteur));

    function appliquer(upcoming) {
        const rendre = () => {
            if (typeof SHOW_DATA === 'undefined') return;
            SHOW_DATA.upcoming = upcoming;
            SHOW_DATA.source = 'supabase';
            if (typeof buildFilterChips === 'function') buildFilterChips();
            if (typeof renderDates === 'function') renderDates();
            if (typeof renderNextDate === 'function') renderNextDate();
            // Une page /spectacles/ : son pied a été écrit à la génération
            // et peut annoncer « les dates seront annoncées ici » alors que
            // la base en porte six. univers.js le refait à partir de ce qui
            // vient d'arriver. Sur l'accueil, la fonction existe aussi et ne
            // fait rien — elle commence par vérifier la classe du <body>.
            if (typeof rafraichirDatesSpectacle === 'function') rafraichirDatesSpectacle();
            // Un tiroir du CV déjà déplié a été rempli depuis dates.js :
            // on le vide pour qu'il se remplisse à nouveau, à jour.
            document.querySelectorAll('.cv-drawer-body[data-filled="1"]').forEach(corps => {
                delete corps.dataset.filled;
                corps.innerHTML = '';
                const li = corps.closest('.cv-item');
                if (li && typeof fillCvDrawer === 'function') fillCvDrawer(li);
            });
            document.dispatchEvent(new CustomEvent('dates:mises-a-jour'));
        };
        // Après le DÉMARRAGE de index.html (qui écoute DOMContentLoaded avant
        // nous, mais qu'on laisse passer en premier par prudence).
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(rendre, 0));
        } else {
            rendre();
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
