/**
 * ADMINISTRATION DES DATES — logique de /admin/
 * ------------------------------------------------------------------
 *  Cette page écrit dans la table Supabase `representations`, celle que
 *  l'accueil et les pages spectacle lisent en direct (dates-live.js).
 *  Elle en reprend l'allure : les soirées sont affichées comme dans
 *  l'onglet Dates (intercalaire par mois et sa frise, feuille
 *  d'éphéméride sur la photo du spectacle, une puce par séance, même
 *  vocabulaire). Ici, toucher une carte ou une puce ouvre la fiche de sa
 *  soirée ; « + soirée », en fin de rangée, en ajoute une à la suite ;
 *  dupliquer et supprimer sont dans la fiche.
 *
 *  FAITE POUR LE TÉLÉPHONE, EN TOURNÉE, ENTRE DEUX TRAINS (audit
 *  d'octobre 2026). La dernière liste connue s'affiche sans attendre le
 *  réseau ; aucune requête n'attend plus de 15 secondes sans qu'on le
 *  dise ; une erreur se lit dans le pied de la fiche, sous le pouce ; une
 *  suppression s'annule pendant 6 secondes ; une série se saisit d'un
 *  coup ; le mail d'un théâtre se colle tel quel.
 *
 *  LE CHOIX DU SPECTACLE. La liste proposée vient du CV lui-même
 *  (index.html) : les spectacles marqués « En tournée » ou « En
 *  création » arrivent en tête, puis ceux qui ont déjà des dates dans
 *  la table, puis « Autre… » pour saisir un titre à la main. Le titre
 *  doit être celui du CV au caractère près — c'est ce qui relie une
 *  date à sa ligne du CV et à sa page spectacle — d'où les puces : on
 *  ne retape pas un titre qui existe déjà.
 *
 *  LA CONNEXION. Par mot de passe, ou par lien reçu par mail ; la
 *  session reste ouverte sur l'appareil. Seule l'adresse
 *  adrien.vada@gmail.com a le droit d'écrire : c'est une règle de la
 *  base (supabase/schema.sql), pas de cette page.
 * ------------------------------------------------------------------
 */
(function () {
    'use strict';

    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const NB = '\u00a0';
    const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tactile = () => window.matchMedia('(pointer: coarse)').matches;
    const defiler = (el, bloc) => { if (el) el.scrollIntoView({ block: bloc || 'nearest', behavior: reduit() ? 'auto' : 'smooth' }); };
    const echapperRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Le stockage du navigateur peut manquer (navigation privée, réglages) :
    // ce qui y passe est un confort, jamais une condition.
    const memoire = {
        lire(cle) { try { return JSON.parse(localStorage.getItem(cle) || 'null'); } catch (e) { return null; } },
        ecrire(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { } },
        oublier(cle) { try { localStorage.removeItem(cle); } catch (e) { } }
    };

    // ── LE BANDEAU : ce qui empêche la page de servir, avec « Recharger » ──
    function bandeau(texte) {
        $('bandeau').hidden = !texte;
        $('bandeau-texte').textContent = texte || '';
    }
    document.addEventListener('click', e => { if (e.target.closest('[data-recharger]')) location.reload(); });

    const L = window.DatesLive;
    if (!L || typeof L.versShowData !== 'function') {
        bandeau('Une partie de la page n\'a pas pu être chargée (réseau ?). Recharge-la.');
        return;
    }

    const COMPTE_AUTORISE = 'adrien.vada@gmail.com';
    // Là où supabase-js garde la session : « sb-<projet>-auth-token ».
    const CLE_SESSION = `sb-${new URL(L.SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
    // Mode aperçu, hors production seulement (machine de développement,
    // aperçus de branche Cloudflare) : la page s'affiche comme connectée
    // pour juger de sa mise en page, sans session. Toute écriture est
    // refusée par la base (règles d'accès) — on ne peut rien y casser.
    const APERCU = /^(localhost|127\.0\.0\.1|.*\.workers\.dev)$/.test(location.hostname) && new URLSearchParams(location.search).has('apercu');
    // L'ordre des séances d'un même jour, en minutes (« matin » < « 9h30 »
    // < « 14h00 », sans heure en dernier) : la règle du site, dans
    // dates-live.js. Le tri du texte mettait « après-midi » avant « matin ».
    const cleHeure = typeof L.cleHeure === 'function' ? L.cleHeure : () => 0;
    const DELAI_RESEAU = 15000;        // une requête abandonnée, et dite, au-delà
    const DELAI_LENT = 10000;          // le chargement propose « Recharger » au-delà
    const ATTENTE_SUPPRESSION = 6000;  // le temps d'un « Annuler »
    const DUREE_MEMO = 24 * 3600 * 1000;
    const CLES = { liste: 'admin.liste', univers: 'admin.univers', cv: 'admin.spectaclesCV', suppressions: 'admin.suppressions' };
    const aUneSession = () => { try { return !!localStorage.getItem(CLE_SESSION); } catch (e) { return false; } };

    let sb = null;              // le client Supabase, créé quand la bibliothèque est là
    let lignes = [];            // les lignes de la table, telles quelles
    let spectaclesCV = [];      // [{ titre, statut, url }] relevés dans le CV
    let univers = [];           // [{ cles: Set, accent, surAccent, couverture }]
    let passeesOuvertes = false;
    let lectureSeule = false;   // la liste affichée vient de la mémoire : on la regarde, on ne la modifie pas
    let derniereLecture = 0;    // l'heure de la dernière lecture réussie
    let lectureEnCours = null;
    let sessionCourante;        // pas encore examinée (undefined), personne (null), ou l'adresse
    let pret = false;           // la page sert : formulaire, refus, liste — ou une panne dite
    const suppressions = new Map();  // id → { ligne, minuteur, envoi, reprise }

    // ── Dates ──────────────────────────────────────────────────────
    const isoLocal = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // Recalculé à chaque rendu : la page peut rester ouverte passé minuit.
    let aujourdhui = isoLocal(new Date());
    const decaler = (iso, n) => { const [a, m, j] = iso.split('-').map(Number); return isoLocal(new Date(a, m - 1, j + n)); };
    const DL_JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    const DL_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const DL_MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const DL_MOIS_BREFS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    // Deux jours sur une feuille de 48 px, à onze pixels : sans les points
    // (« jeu–ven »), comme sur l'accueil.
    const DL_JOURS_BREFS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
    const jourDe = iso => { const [a, m, j] = iso.split('-').map(Number); const d = new Date(a, m - 1, j); return { iso, t: d.getTime(), a, m: m - 1, j, js: d.getDay() }; };
    // « jeu. 12 nov. 2026 », insécable ; « jeu. 12 nov. » dans les listes de jours.
    const jourLisible = iso => `${DL_JOURS_COURTS[jourDe(iso).js]}${NB}${L.jourCourt(iso)}`;
    const jourBref = iso => { const j = jourDe(iso); return `${DL_JOURS_COURTS[j.js]}${NB}${j.j}${NB}${DL_MOIS_COURTS[j.m]}`; };
    const nomSoiree = l => `${jourLisible(l.jour)} · ${l.heure || 'horaire à confirmer'} · ${l.ville}`;
    // « 21 h 14 », à la française ; un autre jour : « 3 oct., 21 h 14 ».
    const heureFr = d => `${d.getHours()}${NB}h${NB}${String(d.getMinutes()).padStart(2, '0')}`;
    const quand = t => { const d = new Date(t); return isoLocal(d) === isoLocal(new Date()) ? heureFr(d) : `${d.getDate()}${NB}${DL_MOIS_COURTS[d.getMonth()]}, ${heureFr(d)}`; };
    const enumerer = l => l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}`;

    // Textes comparés sans accents, sans casse, apostrophes et espaces
    // ramenées à une seule forme.
    const sansAccents = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normaliser = s => sansAccents(s).replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
    // Clé de rapprochement entre un titre du CV et un titre de la table.
    const cleTitre = s => normaliser(L.typographie(s));

    // ── Message éphémère, avec ses gestes (« Annuler », « Voir sur le site ») ──
    let toastMinuteur = 0;
    function toast(texte, o) {
        o = o || {};
        const el = $('toast');
        const gestes = o.gestes || [];
        el.textContent = '';
        if (!o.erreur) el.insertAdjacentHTML('beforeend', '<svg class="ico" aria-hidden="true"><use href="#i-adm-check"></use></svg>');
        const t = document.createElement('span');
        t.textContent = texte;
        el.appendChild(t);
        gestes.forEach(g => {
            const b = document.createElement(g.lien ? 'a' : 'button');
            b.className = 'adm-toast-geste';
            b.textContent = g.libelle;
            if (g.lien) { b.href = g.lien; b.target = '_blank'; b.rel = 'noopener'; } else b.type = 'button';
            b.addEventListener('click', () => { masquerToast(); if (g.fn) g.fn(); });
            el.appendChild(b);
        });
        el.classList.toggle('erreur', !!o.erreur);
        el.classList.toggle('avec-gestes', gestes.length > 0);
        el.classList.add('visible');
        clearTimeout(toastMinuteur);
        toastMinuteur = setTimeout(masquerToast, o.duree || (o.erreur || gestes.length ? 6000 : 2800));
    }
    function masquerToast() { clearTimeout(toastMinuteur); $('toast').classList.remove('visible'); }

    // ══════════════════════════════════════════════════════════════
    //  LE RÉSEAU
    // ══════════════════════════════════════════════════════════════

    /**
     * AUCUNE REQUÊTE N'ATTEND PLUS DE 15 SECONDES. Dans un train, une
     * requête peut rester pendue sans fin : le bouton restait grisé, sans
     * un mot. Toutes celles de supabase-js passent par ici (createClient,
     * `global.fetch`) et sont abandonnées au bout de 15 s ; l'erreur dit
     * alors que la base n'a pas répondu, et propose de réessayer.
     *
     * UNE ANNULATION SIMPLE (AbortError), À DESSEIN. supabase-js relance
     * de lui-même une lecture qui échoue (réseau coupé, base en 503 : trois
     * fois, après 1, 2 puis 4 s) — c'est bien, un trou de réseau passe
     * inaperçu. Mais il relance aussi une erreur d'un autre nom : un
     * délai qui en porterait un (« TimeoutError ») ferait attendre quatre
     * fois 15 s. Une AbortError, il ne la relance pas.
     */
    function fetchAvecDelai(adresse, options) {
        const o = Object.assign({}, options);
        const garde = new AbortController();
        const minuteur = setTimeout(() => garde.abort(), DELAI_RESEAU);
        const amont = o.signal;
        if (amont) {
            if (amont.aborted) garde.abort(amont.reason);
            else amont.addEventListener('abort', () => garde.abort(amont.reason), { once: true });
        }
        o.signal = garde.signal;
        return fetch(adresse, o).finally(() => clearTimeout(minuteur));
    }

    /**
     * LES ERREURS, EN FRANÇAIS. « TypeError: Failed to fetch », ou la page
     * HTML d'une base en pause, s'affichaient telles quelles. On les range
     * en quelques familles, chacune avec sa phrase ; le détail technique
     * ne reste que pour les cas inconnus.
     */
    function expliquer(erreur, quoi, statut) {
        const m = String((erreur && (erreur.message || erreur.msg || erreur.error_description)) || erreur || '');
        const code = String((erreur && erreur.code) || '');
        const s = Number(statut || (erreur && erreur.status) || 0);
        const ecrire = quoi === 'enregistrement';
        if (code === '23505') return { type: 'doublon', texte: 'Cette soirée existe déjà : même spectacle, même lieu, même jour, même heure.' };
        if (code === '23514') return { type: 'regle', texte: 'La base refuse ce contenu : un lien qui n\'est pas une adresse web, ou un texte trop long.' };
        if (/TimeoutError|AbortError|délai/i.test(m)) {
            return { type: 'delai', texte: ecrire ? 'La base n\'a pas répondu en 15 secondes : l\'enregistrement est peut-être passé, peut-être pas. Réessaie — s\'il était passé, la page le reconnaîtra.' : 'La base n\'a pas répondu en 15 secondes.' };
        }
        if (/Failed to fetch|Load failed|NetworkError|network|fetch failed/i.test(m) || navigator.onLine === false) {
            return {
                type: 'reseau', texte: ecrire ? 'Pas de réseau : rien n\'est parti. Ta saisie est gardée, et repartira toute seule quand le réseau reviendra.'
                    : quoi === 'connexion' ? 'Pas de réseau : la connexion attendra qu\'il revienne.' : 'Pas de réseau.'
            };
        }
        if (code === 'PGRST301' || /JWT/i.test(m)) return { type: 'session', texte: 'La session a expiré : ferme la fiche et reconnecte-toi.' };
        if (code === '42501' || /row-level security|permission denied/i.test(m)) return { type: 'droits', texte: 'La base a refusé l\'écriture : es-tu bien connecté avec adrien.vada@gmail.com ?' };
        if (s >= 500 || /<html|Service Unavailable|Bad Gateway|Gateway Time-?out/i.test(m)) return { type: 'serveur', texte: 'La base ne répond pas (elle est peut-être en pause). Réessaie dans une minute.' };
        const detail = m.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
        return { type: 'autre', texte: `La base a répondu par une erreur${detail ? ` (${detail})` : ''}.` };
    }

    // ══════════════════════════════════════════════════════════════
    //  LA BIBLIOTHÈQUE, LA SESSION, LES ÉTATS DE LA PAGE
    // ══════════════════════════════════════════════════════════════

    // supabase-js arrive en `async` (voir index.html) : déjà là, en route,
    // ou refusée — par le réseau, ou par son empreinte.
    function attendreBibliotheque() {
        return new Promise((ok, ko) => {
            const prete = () => !!(window.supabase && window.supabase.createClient);
            if (prete()) return ok();
            if (document.documentElement.hasAttribute('data-lib-echec')) return ko();
            const s = $('lib-supabase');
            if (!s) return ko();
            s.addEventListener('load', () => (prete() ? ok() : ko()), { once: true });
            s.addEventListener('error', ko, { once: true });
        });
    }

    const ETATS = ['etat-chargement', 'etat-connexion', 'etat-refus', 'etat-edition'];
    function montrer(id) { ETATS.forEach(e => { $(e).hidden = e !== id; }); majFlottant(); }
    const peutEcrire = () => APERCU || (typeof sessionCourante === 'string' && sessionCourante.toLowerCase() === COMPTE_AUTORISE);
    const peutLire = () => !!sb && peutEcrire();

    async function initialiser() {
        try {
            sb = window.supabase.createClient(L.SUPABASE_URL, L.SUPABASE_CLE, { global: { fetch: fetchAvecDelai } });
        } catch (e) {
            pret = true;
            bandeau('La connexion à la base n\'a pas pu s\'ouvrir. Recharge la page.');
            return;
        }
        if (APERCU) {
            sessionCourante = '(aperçu)';
            pret = true; bandeau('');
            montrer('etat-edition');
            chargerTout();
            return;
        }
        let session = null;
        try { session = (await sb.auth.getSession()).data.session; } catch (e) { }
        appliquerSession(session);
        sb.auth.onAuthStateChange((_evt, s) => appliquerSession(s));
    }

    function appliquerSession(session) {
        const mail = (session && session.user && session.user.email) || null;
        if (mail === sessionCourante) return;
        if (!mail && lectureSeule && aUneSession()) {
            // UNE SESSION GARDÉE, MAIS PAS RAFRAÎCHIE, FAUTE DE RÉSEAU :
            // supabase-js la conserve et n'en rend aucune. Sans réseau, on ne
            // pourrait pas se connecter de toute façon : la dernière liste
            // connue reste affichée, et on réessaiera au retour du réseau.
            sessionCourante = null;
            pret = true; bandeau('');
            majSynchro('echec', { type: 'reseau' });
            return;
        }
        sessionCourante = mail;
        pret = true; bandeau('');
        $('compte').hidden = !mail;
        $('compte-mail').textContent = mail || '';
        if (!mail) { oublierListe(); montrer('etat-connexion'); return; }
        const autorise = mail.toLowerCase() === COMPTE_AUTORISE;
        // Un compte refusé n'a rien à faire d'un mot de passe ici : il ne
        // garde que « Se déconnecter ».
        $('btn-mdp').hidden = !autorise;
        if (!autorise) { oublierListe(); montrer('etat-refus'); return; }
        montrer('etat-edition');
        chargerTout();
    }

    function direConnexion(texte, ton) {
        const msg = $('msg-connexion');
        msg.hidden = !texte;
        msg.className = 'text-xs mt-3 ' + (ton === 'erreur' ? 'adm-erreur' : ton === 'ok' ? 'text-luxury-goldInk' : 'text-luxury-textMuted');
        msg.textContent = texte || '';
    }

    // « Afficher » / « Masquer » : le mot de passe en clair, le temps de le relire.
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-afficher]');
        if (!b) return;
        const ids = b.dataset.afficher.split(' ');
        const montre = $(ids[0]).type === 'password';
        ids.forEach(id => { $(id).type = montre ? 'text' : 'password'; });
        b.textContent = montre ? 'Masquer' : 'Afficher';
        b.setAttribute('aria-label', `${montre ? 'Masquer' : 'Afficher'} ${ids.length > 1 ? 'les mots de passe' : 'le mot de passe'}`);
    });
    // Remis en « password » avant l'envoi : c'est ainsi que le téléphone
    // reconnaît un mot de passe à retenir.
    function masquerMotsDePasse(racine) {
        racine.querySelectorAll('[data-afficher]').forEach(b => {
            const ids = b.dataset.afficher.split(' ');
            ids.forEach(id => { $(id).type = 'password'; });
            b.textContent = 'Afficher';
            b.setAttribute('aria-label', `Afficher ${ids.length > 1 ? 'les mots de passe' : 'le mot de passe'}`);
        });
    }

    // Par mot de passe : le chemin normal, sans mail.
    $('form-connexion').addEventListener('submit', async e => {
        e.preventDefault();
        masquerMotsDePasse($('form-connexion'));
        const email = $('mail').value.trim(), password = $('mdp').value;
        if (!password) { direConnexion('Saisis ton mot de passe, ou demande un lien par mail.', 'erreur'); $('mdp').focus(); return; }
        if (!sb) { direConnexion('La connexion n\'est pas encore prête : réessaie dans un instant.', 'erreur'); return; }
        $('btn-entrer').disabled = true;
        direConnexion('Connexion…');
        let error = null;
        try { ({ error } = await sb.auth.signInWithPassword({ email, password })); } catch (err) { error = err; }
        $('btn-entrer').disabled = false;
        if (error) {
            const r = expliquer(error, 'connexion', error.status);
            direConnexion(/invalid/i.test(error.message || '')
                ? 'Mot de passe refusé. Pas encore de mot de passe ? Entre par le lien mail, puis choisis-le dans « Mot de passe ».'
                : r.type === 'autre' ? 'Connexion impossible : ' + (error.message || '') : r.texte, 'erreur');
            return;
        }
        direConnexion('');
    });

    // Par lien mail : la première fois, ou en secours.
    $('btn-lien').addEventListener('click', async () => {
        const email = $('mail').value.trim();
        if (!sb) { direConnexion('La connexion n\'est pas encore prête : réessaie dans un instant.', 'erreur'); return; }
        $('btn-lien').disabled = true;
        direConnexion('Envoi du lien…');
        let error = null;
        try { ({ error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } })); } catch (err) { error = err; }
        $('btn-lien').disabled = false;
        if (error) {
            const r = expliquer(error, 'connexion', error.status);
            direConnexion(/rate|limit|seconds/i.test(error.message || '')
                ? 'Trop de demandes : le compte gratuit n\'envoie que quelques mails par heure. Réessaie dans quelques minutes, ou entre par mot de passe.'
                : r.type === 'autre' ? 'Impossible d\'envoyer le lien : ' + (error.message || '') : r.texte, 'erreur');
            return;
        }
        direConnexion('Lien envoyé à ' + email + '. Ouvre-le sur cet appareil : tu arriveras ici, connecté.', 'ok');
    });

    $('btn-sortir').addEventListener('click', async () => {
        // Une suppression encore « annulable » part avant la déconnexion :
        // c'est ce qui a été demandé.
        suppressions.forEach((s, id) => { if (s.minuteur) envoyerSuppression(id); });
        await Promise.all([...suppressions.values()].map(s => s.envoi).filter(Boolean)).catch(() => { });
        try { if (sb) await sb.auth.signOut(); } catch (e) { }
        memoire.oublier(CLES.liste);
        memoire.oublier(CLES.suppressions);
        location.reload();
    });

    // ══════════════════════════════════════════════════════════════
    //  LA LECTURE
    // ══════════════════════════════════════════════════════════════

    function passerEnLectureSeule(oui) {
        lectureSeule = !!oui;
        document.body.classList.toggle('adm-lecture-seule', lectureSeule);
    }
    function oublierListe() {
        lignes = [];
        derniereLecture = 0;
        passerEnLectureSeule(false);
        memoire.oublier(CLES.liste);
    }
    const memoriserListe = () => memoire.ecrire(CLES.liste, { t: derniereLecture || Date.now(), lignes });

    async function chargerTout() {
        await charger();
        // Couleurs et photos des spectacles : après la liste, sans la
        // retarder. Pas de liste lue (lecture impossible, rien en mémoire) :
        // rien à redessiner — le message d'erreur reste.
        chargerUnivers().then(change => { if (change && derniereLecture) rendre(); });
    }

    function charger() {
        if (!sb) return Promise.resolve(false);
        if (lectureEnCours) return lectureEnCours;
        majSynchro('lecture');
        lectureEnCours = (async () => {
            let rep;
            try { rep = await sb.from(L.TABLE).select('*').order('jour').order('heure'); } catch (e) { rep = { error: e }; }
            if (rep.error) {
                const r = expliquer(rep.error, 'lecture', rep.status);
                // Une session périmée que Supabase ne parvient plus à
                // rafraîchir : on repasse par la connexion plutôt que
                // d'afficher une liste vide sans explication.
                if (r.type === 'session' && !APERCU) {
                    try { await sb.auth.signOut(); } catch (e) { }
                    sessionCourante = undefined;
                    passerEnLectureSeule(false);
                    appliquerSession(null);
                    direConnexion('La session avait expiré : reconnecte-toi.', 'erreur');
                    return false;
                }
                majSynchro('echec', r);
                if (!lectureSeule && !lignes.length) {
                    $('compteur').textContent = '';
                    $('liste-a-venir').innerHTML = `<div class="adm-erreur-lecture"><p>Lecture impossible. ${esc(r.texte)}</p><button type="button" class="adm-secondaire" data-relire>Réessayer</button></div>`;
                }
                return false;
            }
            lignes = rep.data || [];
            derniereLecture = Date.now();
            passerEnLectureSeule(false);
            memoriserListe();
            try { rendre(); }
            catch (e) {
                // Ne devrait pas arriver ; si ça arrive (fichier du site plus
                // ancien que celui-ci, juste après une publication), on le dit.
                $('liste-a-venir').innerHTML = `<p class="dl-vide adm-erreur">Affichage impossible (${esc(e.message)}). Recharge la page dans une minute.</p>`;
            }
            majSynchro('ok');
            relancerSuppressions();
            return true;
        })().finally(() => { lectureEnCours = null; });
        return lectureEnCours;
    }

    /**
     * L'ÉTAT DE LA LISTE, en haut de la carte : « À jour · 21 h 14 », « Mise
     * à jour… », « Hors ligne · liste de 21 h 14 ». Le bouton relit la table.
     */
    let etatSynchro = { etat: 'lecture', info: null };
    function majSynchro(etat, info) {
        etatSynchro = { etat, info: info || null };
        const b = $('synchro');
        b.dataset.etat = etat;
        let texte;
        if (etat === 'lecture') texte = derniereLecture ? `Mise à jour… · liste de ${quand(derniereLecture)}` : 'Lecture…';
        else if (etat === 'ok') texte = `À jour · ${quand(derniereLecture)}`;
        else texte = `${info && info.type === 'reseau' ? 'Hors ligne' : 'Pas à jour'}${derniereLecture ? ` · liste de ${quand(derniereLecture)}` : ''}`;
        const attente = [...suppressions.values()].filter(s => !s.minuteur).length;
        if (attente) texte += ` · ${attente} suppression${attente > 1 ? 's' : ''} en attente`;
        $('synchro-texte').textContent = texte;
        b.setAttribute('aria-label', `${texte}. Toucher pour relire la liste.`);
    }
    $('synchro').addEventListener('click', () => { if (peutLire()) charger(); });

    // Les lignes d'attente, tant que la première lecture n'est pas revenue.
    function afficherAttente() {
        $('compteur').textContent = '';
        const ligne = '<div class="adm-attente-ligne"><span class="adm-attente-feuille"></span><span class="adm-attente-textes"><span></span><span></span><span></span></span></div>';
        $('liste-a-venir').innerHTML = `<div class="adm-attente" role="status" aria-label="Lecture des dates…">${ligne.repeat(4)}</div>`;
    }

    /**
     * Les spectacles du CV, lus dans index.html : titre exact, badge
     * (« En tournée », « En création »…) et lien officiel. Une seule source
     * de vérité, la même que l'accueil.
     *
     * LU À LA PREMIÈRE OUVERTURE D'UNE FICHE, plus au chargement : la page
     * d'accueil pèse 184 Ko compressés, pour onze titres qui ne servent que
     * dans la fiche. Gardé un jour dans le navigateur ; d'ici là, la
     * dernière liste sert tout de suite. Sans elle, les puces se rabattent
     * sur les titres déjà en base, et se complètent à l'arrivée du CV.
     */
    let cvPromesse = null;
    function chargerSpectaclesDuCV() {
        const memo = memoire.lire(CLES.cv);
        if (memo && Array.isArray(memo.liste) && !spectaclesCV.length) spectaclesCV = memo.liste;
        if (memo && Date.now() - memo.t < DUREE_MEMO) return Promise.resolve(false);
        if (cvPromesse) return cvPromesse;
        cvPromesse = fetch('../index.html')
            .then(r => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
            .then(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const liste = [...doc.querySelectorAll('[data-cv-show]')].map(li => ({
                    titre: L.typographie(li.dataset.cvShow),
                    statut: ((li.querySelector('.cv-badge') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
                    url: li.dataset.cvUrl || ''
                })).filter(s => s.titre);
                if (!liste.length) return false;
                const change = JSON.stringify(liste) !== JSON.stringify(spectaclesCV);
                spectaclesCV = liste;
                memoire.ecrire(CLES.cv, { t: Date.now(), liste });
                return change;
            })
            .catch(() => false);
        cvPromesse.then(change => {
            cvPromesse = null;
            if (change && fiche.open) { rendrePuces(); majApercu(); }
        });
        return cvPromesse;
    }

    /**
     * LA COULEUR ET LA PHOTO DE CHAQUE SPECTACLE, lues dans univers.js — là
     * où l'onglet Dates les prend. On n'exécute pas univers.js (c'est le
     * moteur des univers, il lui faut l'accueil) : on en découpe la seule
     * déclaration SHOW_UNIVERSES, avec les deux mêmes repères que
     * build/generer-pages-spectacles.js. Si le fichier changeait de
     * structure, la liste resterait lisible, dans l'or du site.
     *
     * APRÈS LA LISTE, ET GARDÉ UN JOUR : univers.js (67 Ko compressés) et
     * univers-montage.js (27 Ko) ne retardent plus rien ; la liste du cache
     * s'affiche déjà dans ses couleurs.
     */
    const universPourMemoire = () => univers.map(u => ({ cles: [...u.cles], accent: u.accent, surAccent: u.surAccent, couverture: u.couverture }));
    const universDepuisMemoire = liste => (liste || []).map(u => Object.assign({}, u, { cles: new Set(u.cles) }));
    const scripts = {};
    function chargerScript(src) {
        if (!scripts[src]) {
            scripts[src] = new Promise((ok, ko) => {
                const s = document.createElement('script');
                s.src = src;
                s.async = true;
                s.onload = ok;
                s.onerror = () => { delete scripts[src]; ko(new Error(src)); };
                document.head.appendChild(s);
            });
        }
        return scripts[src];
    }
    async function chargerUnivers() {
        const avant = JSON.stringify(universPourMemoire());
        const memo = memoire.lire(CLES.univers);
        if (memo && Array.isArray(memo.liste) && Date.now() - memo.t < DUREE_MEMO) {
            univers = universDepuisMemoire(memo.liste);
            return JSON.stringify(memo.liste) !== avant;
        }
        try {
            await chargerScript('../univers-montage.js').catch(() => null);
            const src = await fetch('../univers.js').then(r => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))));
            const debut = src.indexOf('const SHOW_UNIVERSES = {');
            const fin = src.indexOf('\n(function () {', debut);
            if (debut === -1 || fin === -1) return false;
            const tous = new Function(src.slice(debut, fin) + '\nreturn SHOW_UNIVERSES;')();
            univers = Object.keys(tous).map(k => {
                const u = tous[k], pal = u.palette || {};
                // UniversMontage est une constante globale, pas une propriété de window.
                const c = !u.affiche && typeof UniversMontage !== 'undefined' ? UniversMontage.couverture(u) : null;
                return {
                    cles: new Set([k, ...(u.autresTitres || [])].map(cleTitre)),
                    accent: pal.accent || '', surAccent: pal.onAccent || '',
                    couverture: c ? { src: '../' + c.src, repli: '../' + c.repli, pos: c.pos } : null
                };
            });
            memoire.ecrire(CLES.univers, { t: Date.now(), liste: universPourMemoire() });
            return JSON.stringify(universPourMemoire()) !== avant;
        } catch (e) { return false; }
    }
    const universDe = titre => { const k = cleTitre(titre); return univers.find(u => u.cles.has(k)) || null; };
    // Une couverture de 240 px manque : la version de 640 px, qui existe toujours.
    document.addEventListener('error', e => {
        const img = e.target;
        if (img && img.tagName === 'IMG' && img.dataset && img.dataset.repli) { img.src = img.dataset.repli; delete img.dataset.repli; }
    }, true);

    // ══════════════════════════════════════════════════════════════
    //  LA LISTE, À L'IMAGE DE L'ONGLET DATES
    // ══════════════════════════════════════════════════════════════
    //  Mêmes intercalaires de mois et même frise dans la marge, même
    //  feuille d'éphéméride posée sur la photo du spectacle, même titre en
    //  Cinzel, même « Ville · salle ». La différence, et c'est tout
    //  l'outil : la carte et chaque PUCE DE SÉANCE ouvrent une fiche, et
    //  « + soirée » (là où le site met l'agenda) en ajoute une à la suite.
    //  Les mêmes fonctions dessinent l'APERÇU de la fiche (o.apercu) : des
    //  puces inertes, comme sur le site.

    function feuille(e) {
        const d = e.jours[0], z = e.jours[e.jours.length - 1];
        const plusieurs = z.iso !== d.iso, deuxMois = plusieurs && (z.m !== d.m || z.a !== d.a);
        const c = e.u && e.u.couverture;
        const photo = c ? `<img src="${esc(c.src)}" data-repli="${esc(c.repli)}" alt="" width="48" height="56" loading="lazy" decoding="async"${c.pos ? ` style="object-position:${esc(c.pos)}"` : ''}>` : '';
        return `<span class="dl-feuille${plusieurs ? ' dl-feuille--2' : ''}${c ? ' dl-feuille--photo' : ' dl-feuille--sans-photo'}" aria-hidden="true">${photo}`
            + `<span class="dl-bande${deuxMois ? ' dl-bande--2' : ''}">${deuxMois ? `${DL_MOIS_BREFS[d.m]}–${DL_MOIS_BREFS[z.m]}` : DL_MOIS_COURTS[d.m]}</span>`
            + `<span class="dl-num">${plusieurs ? `${d.j}–${z.j}` : d.j}</span>`
            + `<span class="dl-jour">${plusieurs ? `${DL_JOURS_BREFS[d.js]}–${DL_JOURS_BREFS[z.js]}` : DL_JOURS_COURTS[d.js]}</span></span>`;
    }

    // « Rouen · Tribunal judiciaire (76) » : la ville, puis la salle sans sa ville.
    function lieuHtml(l) {
        const ville = l.ville || '';
        let salle = String(l.lieu || '').trim();
        const dep = salle.match(/\s*\((\d{2,3}[AB]?)\)$/i);
        if (dep) salle = salle.slice(0, dep.index).trim();
        if (ville) {
            const bas = salle.toLowerCase();
            const lien = [', ', ' de ', ' du ', ' d’', " d'", ' à '].find(x => bas.endsWith((x + ville).toLowerCase()));
            if (lien) salle = salle.slice(0, salle.length - (lien + ville).length).trim();
            else if (bas === ville.toLowerCase()) salle = '';
        }
        return (ville ? `<span class="dl-ville">${esc(ville)}</span>` : '') + (ville && salle ? ' · ' : '') + esc(salle) + (dep ? ` (${esc(dep[1])})` : '');
    }

    // Une puce par séance, écrite comme sur le site (« jeu. 19h00 »,
    // « 14h15 scolaire », « billetterie à venir »), mais qui s'ouvre.
    function puceSeance(l, e, o) {
        const j = jourDe(l.jour);
        const longue = e.jours.length > 1 && e.jours[e.jours.length - 1].t - e.jours[0].t > 6.5 * 864e5;
        const jour = e.jours.length > 1 ? `<span class="dl-s-jour">${DL_JOURS_COURTS[j.js]}${longue ? ` ${j.j}` : ''}</span> ` : '';
        const heure = l.heure ? `<span class="dl-s-heure">${esc(l.heure)}</span>` : '<span class="dl-s-heure dl-s-heure--flou">horaire à confirmer</span>';
        const etat = l.scolaire ? `${l.heure ? heure + ' ' : ''}<i>scolaire</i>`
            : L.lienSur(l.reservation_url) ? heure
                : `${l.heure ? heure + ' · ' : ''}<i>billetterie à venir</i>`;
        const muette = l.scolaire || !L.lienSur(l.reservation_url);
        if (o && o.apercu) {
            const fleche = muette ? '' : '<svg class="ico" aria-hidden="true"><use href="#i-solid-arrow-right"></use></svg>';
            return `<li><span class="dl-puce${muette ? ' dl-puce--muette' : ''}${l.id < 0 ? ' adm-puce-nouvelle' : ''}">${jour}${etat}${fleche}</span></li>`;
        }
        const nom = `${l.spectacle}, ${DL_JOURS_COURTS[j.js]} ${L.jourCourt(l.jour)}${l.heure ? ' à ' + l.heure : ''}`;
        return `<li><button type="button" class="dl-puce adm-seance${muette ? ' dl-puce--muette' : ''}" data-action="modifier" data-id="${l.id}" aria-label="Modifier : ${esc(nom)}">`
            + `${jour}${etat}<svg class="ico" aria-hidden="true"><use href="#i-adm-pen"></use></svg></button></li>`;
    }

    function ligneHtml(e, passee, o) {
        const d = e.soirees[e.soirees.length - 1];
        const style = e.u && e.u.accent ? ` style="--dl-a:${esc(e.u.accent)};--dl-sa:${esc(e.u.surAccent || '#ffffff')}"` : '';
        const corps = `<div class="dl-corps"><h5 class="dl-titre">${esc(e.titre)}</h5><p class="dl-lieu">${lieuHtml(e.soirees[0])}</p>`
            + `<ul class="dl-seances" role="list">${e.soirees.map(l => puceSeance(l, e, o)).join('')}`;
        if (o && o.apercu) return `<article class="dl"${style}>${feuille(e)}${corps}</ul></div></article>`;
        // Pas de « + soirée » sous une date passée : il proposerait un jour passé.
        const plus = passee ? '' : `<li class="dl-seances-agenda"><button type="button" class="adm-plus" data-action="dupliquer" data-id="${d.id}" aria-label="Ajouter une soirée après le ${esc(jourLisible(d.jour))} : ${esc(e.titre)}"><svg class="ico" aria-hidden="true"><use href="#i-adm-plus"></use></svg>soirée</button></li>`;
        return `<article class="dl adm-carte${passee ? ' adm-passee' : ''}"${style} data-ids="${e.soirees.map(l => l.id).join(' ')}">${feuille(e)}${corps}${plus}</ul></div></article>`;
    }

    // Les entrées de l'onglet Dates (dates-live.js les calcule : une date
    // seule, ou une série au même lieu), rangées sous leur mois.
    function rendreBloc(sousEnsemble, passee, o) {
        o = o || {};
        if (!sousEnsemble.length) return '';
        const parId = new Map(sousEnsemble.map(l => [l.id, l]));
        const brutes = L.versShowData(sousEnsemble);
        if (!brutes.every(e => e.type === 'series' ? e.shows.every(s => parId.has(s.id)) : parId.has(e.id))) {
            throw new Error('dates-live.js est plus ancien que cette page');
        }
        let entrees = brutes.map(e => {
            const soirees = (e.type === 'series' ? e.shows.map(s => parId.get(s.id)) : [parId.get(e.id)])
                .sort((x, y) => x.jour.localeCompare(y.jour) || cleHeure(x.heure) - cleHeure(y.heure) || (x.id || 0) - (y.id || 0));
            const jours = [...new Set(soirees.map(l => l.jour))].sort().map(jourDe);
            return { titre: soirees[0].spectacle, soirees, jours, u: universDe(soirees[0].spectacle) };
        }).sort((x, y) => x.jours[0].t - y.jours[0].t);
        if (o.seulement) entrees = entrees.filter(e => e.soirees.some(l => o.seulement.has(l.id)));
        if (passee) entrees.reverse(); // les plus récentes en tête, comme dans les archives
        const mois = [];
        entrees.forEach(e => {
            const cle = `${e.jours[0].a}-${e.jours[0].m + 1}`;
            let g = mois.find(x => x.cle === cle);
            if (!g) mois.push(g = { cle, a: e.jours[0].a, m: e.jours[0].m, entrees: [] });
            g.entrees.push(e);
        });
        return mois.map(g => `<section class="dl-groupe" style="--dl-lisere:var(--dl-mois-${g.m + 1})" aria-label="${esc(DL_MOIS[g.m])} ${g.a}">`
            + `<div class="dl-intercalaire"><h4>${esc(DL_MOIS[g.m].charAt(0).toUpperCase() + DL_MOIS[g.m].slice(1))} <span>${g.a}</span></h4></div>`
            + g.entrees.map(e => ligneHtml(e, passee, o)).join('') + '</section>').join('');
    }

    function rendre() {
        aujourdhui = isoLocal(new Date());
        // Une suppression demandée disparaît tout de suite, même avant son envoi.
        const visibles = lignes.filter(l => !suppressions.has(l.id));
        const aVenir = visibles.filter(l => l.jour >= aujourdhui);
        const passees = visibles.filter(l => l.jour < aujourdhui).reverse();

        $('compteur').textContent = aVenir.length === 0 ? 'Aucune date à venir'
            : `${aVenir.length} représentation${aVenir.length > 1 ? 's' : ''}`;
        $('liste-a-venir').innerHTML = aVenir.length
            ? rendreBloc(aVenir, false)
            : `<p class="dl-vide">Aucune date à venir pour le moment. Ajoute la première avec le bouton doré.</p>`;

        $('compteur-passees').textContent = passees.length ? `${passees.length}` : '';
        $('liste-passees').innerHTML = passees.length
            ? rendreBloc(passees, true)
            : `<p class="dl-vide">Aucune date passée dans la base.</p>`;
        $('panneau-passees').classList.toggle('expanded', passeesOuvertes);
        $('chevron-passees').classList.toggle('rotated', passeesOuvertes);
        $('btn-passees').setAttribute('aria-expanded', String(passeesOuvertes));
    }

    $('btn-passees').addEventListener('click', () => { passeesOuvertes = !passeesOuvertes; rendre(); });

    /**
     * APRÈS UN ENREGISTREMENT, LA SOIRÉE SE MONTRE : la liste défile
     * jusqu'à elle, et sa carte s'éclaire deux secondes. La liste se
     * redessinait en haut, et on cherchait où la date avait atterri.
     */
    function surligner(ids, deuxieme) {
        const voulus = new Set(ids);
        const puces = [...document.querySelectorAll('#liste-a-venir .adm-seance, #liste-passees .adm-seance')].filter(b => voulus.has(Number(b.dataset.id)));
        if (!puces.length) return;
        if (!deuxieme && puces[0].closest('#liste-passees') && !passeesOuvertes) {
            passeesOuvertes = true;
            rendre();
            setTimeout(() => surligner(ids, true), 450);   // le volet a fini de s'ouvrir
            return;
        }
        const cartes = [...new Set(puces.map(b => b.closest('.dl')))];
        defiler(cartes[0], 'center');
        cartes.forEach(c => { c.classList.remove('adm-surligne'); void c.offsetWidth; c.classList.add('adm-surligne'); });
        puces.forEach(b => b.classList.add('adm-puce-surlignee'));
        setTimeout(() => {
            cartes.forEach(c => c.classList.remove('adm-surligne'));
            puces.forEach(b => b.classList.remove('adm-puce-surlignee'));
        }, 2000);
    }

    // ── Les gestes de la liste : la carte ou une puce ouvre sa séance,
    //    « + soirée » en ajoute une à la suite. ──
    // Une copie propose le lendemain — jamais un jour passé : sous une date
    // passée, le jour reste à choisir.
    const copieDe = l => { const j = decaler(l.jour, 1); return Object.assign({}, l, { id: null, modifie_le: null, jour: j >= aujourdhui ? j : '' }); };

    document.addEventListener('click', e => {
        if (e.target.closest('[data-relire]')) { if (peutLire()) charger(); return; }
        const btn = e.target.closest('button[data-action][data-id]');
        const carte = btn ? null : e.target.closest('.adm-carte[data-ids]');
        if (!btn && !carte) return;
        const id = Number(btn ? btn.dataset.id : carte.dataset.ids.split(' ')[0]);
        const l = lignes.find(x => x.id === id);
        if (!l) return;
        if ((btn ? btn.dataset.action : 'modifier') === 'dupliquer') { ouvrirFiche(copieDe(l), 'copie', { modele: l }); return; }
        // LA LISTE DU CACHE NE SE MODIFIE PAS : elle peut dater. On la
        // modifie une fois relue (une copie, un ajout restent possibles).
        if (lectureSeule || !sb) {
            toast(etatSynchro.etat === 'echec' && derniereLecture
                ? `Pas de réseau : la liste date de ${quand(derniereLecture)}. On la modifie une fois relue.`
                : 'Un instant : la liste se met à jour.');
            return;
        }
        ouvrirFiche(l, 'modifier');
    });

    // ══════════════════════════════════════════════════════════════
    //  LA SUPPRESSION, AVEC SIX SECONDES POUR « ANNULER »
    // ══════════════════════════════════════════════════════════════
    //  Il n'y a plus de confirmation : la soirée disparaît de la liste, et
    //  un message propose « Annuler » pendant six secondes. La base n'est
    //  touchée qu'ensuite — le site garde la date jusque-là.
    //
    //  SI LA PAGE SE CACHE AVANT (téléphone rangé, autre appli, onglet
    //  fermé), la suppression part aussitôt : c'est ce qui a été demandé.
    //  Elle reste notée dans le navigateur jusqu'à la réponse de la base ;
    //  si l'envoi n'aboutit pas (page gelée, réseau), elle repart au retour
    //  sur la page, au retour du réseau, ou à la prochaine ouverture.

    const memoriserSuppressions = () => memoire.ecrire(CLES.suppressions, [...suppressions.values()].map(s => s.ligne));

    function demanderSuppression(l) {
        // Un seul « Annuler » à la fois : une suppression encore en attente part.
        suppressions.forEach((s, id) => { if (s.minuteur) envoyerSuppression(id); });
        suppressions.set(l.id, { ligne: l, minuteur: setTimeout(() => envoyerSuppression(l.id), ATTENTE_SUPPRESSION), envoi: null, reprise: false });
        memoriserSuppressions();
        rendre();
        toast(`Supprimée : ${l.spectacle}, ${jourBref(l.jour)}`, {
            duree: ATTENTE_SUPPRESSION,
            gestes: [{ libelle: 'Annuler', fn: () => annulerSuppression(l.id) }]
        });
    }

    function annulerSuppression(id) {
        const s = suppressions.get(id);
        if (!s || s.envoi || !s.minuteur) return;   // déjà partie : trop tard
        clearTimeout(s.minuteur);
        suppressions.delete(id);
        memoriserSuppressions();
        rendre();
        surligner([id]);
        toast('Suppression annulée');
    }

    function envoyerSuppression(id) {
        const s = suppressions.get(id);
        if (!s) return null;
        if (s.envoi) return s.envoi;
        clearTimeout(s.minuteur);
        s.minuteur = 0;
        if (!sb || !peutEcrire()) { majSynchro(etatSynchro.etat, etatSynchro.info); return null; }   // elle attend la connexion
        s.envoi = (async () => {
            let rep;
            try { rep = await sb.from(L.TABLE).delete().eq('id', id); } catch (e) { rep = { error: e }; }
            s.envoi = null;
            if (rep.error) {
                const r = expliquer(rep.error, 'suppression', rep.status);
                majSynchro(etatSynchro.etat, etatSynchro.info);
                if (document.visibilityState === 'visible') {
                    toast(`Pas encore supprimée : ${r.type === 'reseau' ? 'pas de réseau' : r.type === 'delai' ? 'la base n\'a pas répondu' : 'la base a refusé'}. Elle repartira d'elle-même.`, {
                        erreur: true, gestes: [{ libelle: 'Réessayer', fn: () => envoyerSuppression(id) }]
                    });
                }
                return false;
            }
            suppressions.delete(id);
            memoriserSuppressions();
            lignes = lignes.filter(x => x.id !== id);
            memoriserListe();
            rendre();
            majSynchro(etatSynchro.etat, etatSynchro.info);
            if (s.reprise) toast(`Suppression terminée : ${s.ligne.spectacle}, ${jourBref(s.ligne.jour)}`);
            return true;
        })();
        return s.envoi;
    }
    // Celles qui attendent (réseau tombé, page fermée trop tôt) repartent.
    function relancerSuppressions() {
        suppressions.forEach((s, id) => { if (!s.minuteur && !s.envoi) envoyerSuppression(id); });
    }

    // ══════════════════════════════════════════════════════════════
    //  LA FICHE (ajout, copie, modification)
    // ══════════════════════════════════════════════════════════════
    const fiche = $('fiche');
    const corpsFiche = fiche.querySelector('.adm-fiche-corps');
    const piedFiche = fiche.querySelector('.adm-fiche-pied');
    let ficheMode = 'nouvelle';     // 'nouvelle' | 'copie' | 'modifier'
    let ligneOuverte = null;        // la soirée en modification, telle que lue (modifie_le compris)
    let spectacleChoisi = '';       // le titre de la puce choisie
    let modeAutre = false;          // « Autre… » : le titre est dans le champ
    let pucesRepliees = false;      // une soirée existante : le titre seul, et « changer »
    let joursEnPlus = [];           // [{ jour, heure }] : la série saisie d'un coup (heure null : celle de la fiche)
    let villeDeduite = false;       // la ville vient du lieu, et le suit tant qu'on n'y touche pas
    let enregistrementEnCours = false;
    let derniereErreur = null;      // le type de l'échec précédent (réseau, délai…)
    let ficheInitiale = '';

    const titreSaisi = () => L.typographie(spectacleChoisi || (modeAutre ? $('f-spectacle-autre').value : ''));

    /**
     * Les puces de spectacle : CV d'abord (tournée et création en tête),
     * puis les titres déjà en base qui ne sont pas au CV, puis « Autre… ».
     * Quand le CV et la base épellent différemment le même titre, c'est
     * l'orthographe de la base qui gagne : c'est elle que les dates
     * existantes portent déjà.
     */
    function listeSpectacles() {
        const enBase = [...new Set(lignes.map(l => l.spectacle))];
        const parCle = new Map(enBase.map(t => [cleTitre(t), t]));
        const vus = new Set();
        const sortie = [];
        // Seuls les spectacles vivants du CV — en tournée, en création — sont
        // proposés d'emblée : un film n'a pas de dates. Les autres titres du
        // CV restent accessibles par « Autre… ».
        const rang = s => /tourn/i.test(s.statut) ? 0 : /cr[ée]ation/i.test(s.statut) ? 1 : 2;
        spectaclesCV.filter(s => rang(s) < 2).sort((a, b) => rang(a) - rang(b)).forEach(s => {
            const k = cleTitre(s.titre);
            if (vus.has(k)) return;
            vus.add(k);
            sortie.push({ titre: parCle.get(k) || s.titre, statut: s.statut });
        });
        enBase.forEach(t => { const k = cleTitre(t); if (!vus.has(k)) { vus.add(k); sortie.push({ titre: t, statut: '' }); } });
        return sortie;
    }

    function choisirSpectacle(titre, o) {
        o = o || {};
        const connu = !!titre && listeSpectacles().some(s => s.titre === titre);
        modeAutre = !!titre && !connu;
        spectacleChoisi = connu ? titre : '';
        $('f-spectacle-autre').value = modeAutre ? titre : '';
        if (o.replie !== undefined) pucesRepliees = !!o.replie;
        rendrePuces();
    }

    /**
     * LES PUCES. Le statut (« EN TOURNÉE », en 8 px, à 4:1) n'y est plus :
     * l'ordre le dit déjà. Une soirée existante ne montre que son titre, et
     * « changer » : six puces occupaient le haut de la fiche pour un titre
     * qu'on change rarement.
     */
    function rendrePuces() {
        const liste = listeSpectacles();
        // Un titre choisi que la liste ne propose plus passe dans le champ.
        if (spectacleChoisi && !liste.some(s => s.titre === spectacleChoisi)) {
            modeAutre = true;
            $('f-spectacle-autre').value = spectacleChoisi;
            spectacleChoisi = '';
        }
        const puce = (texte, presse, data) => `<button type="button" class="filter-chip text-[12px] px-2.5 py-1.5 rounded-full border border-stone-200 bg-stone-100 text-luxury-textMuted hover:border-luxury-gold transition inline-flex items-center gap-1.5" aria-pressed="${presse}" ${data}>${esc(texte)}</button>`;
        $('puces-spectacles').innerHTML = pucesRepliees && spectacleChoisi
            ? puce(spectacleChoisi, true, `data-spectacle="${esc(spectacleChoisi)}"`) + '<button type="button" class="adm-changer" data-changer>changer de spectacle</button>'
            : liste.map(s => puce(s.titre, s.titre === spectacleChoisi, `data-spectacle="${esc(s.titre)}"`)).join('') + puce('Autre…', modeAutre, 'data-spectacle-autre');
        $('f-spectacle-autre').hidden = !modeAutre;
        $('f-spectacle-autre').required = modeAutre;
        majNoteSpectacle();
    }

    $('puces-spectacles').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        oterDevine('puces-spectacles');
        if (b.hasAttribute('data-changer')) {
            pucesRepliees = false;
            rendrePuces();
            const choisie = $('puces-spectacles').querySelector('[aria-pressed="true"]');
            if (choisie) choisie.focus();
            return;
        }
        if (b.hasAttribute('data-spectacle-autre')) {
            modeAutre = true;
            spectacleChoisi = '';
            rendrePuces();
            $('f-spectacle-autre').focus();
            rendrePucesLieux();
            majApercu();
            return;
        }
        modeAutre = false;
        spectacleChoisi = b.dataset.spectacle;
        $('f-spectacle-autre').value = '';
        rendrePuces();
        rendrePucesLieux();
        majApercu();
        // Le clavier ne s'ouvre que s'il n'y a pas de lieu à toucher.
        if ($('puces-lieux').hidden && !$('f-lieu').value.trim()) $('f-lieu').focus();
    });

    /**
     * UN TITRE NOUVEAU (« Autre… ») SE VÉRIFIE PENDANT LA FRAPPE : un titre
     * presque connu propose le bon (« Tu veux dire « Cassandres » ? ») ; un
     * titre absent du CV est signalé — sa date n'aurait ni page spectacle,
     * ni lien depuis le CV.
     */
    function distance(a, b) {
        const ligne = Array.from({ length: b.length + 1 }, (_, i) => i);
        for (let i = 1; i <= a.length; i++) {
            let prec = ligne[0];
            ligne[0] = i;
            for (let j = 1; j <= b.length; j++) {
                const t = ligne[j];
                ligne[j] = Math.min(ligne[j] + 1, ligne[j - 1] + 1, prec + (a[i - 1] === b[j - 1] ? 0 : 1));
                prec = t;
            }
        }
        return ligne[b.length];
    }
    function titresConnus() {
        const t = new Map();
        spectaclesCV.forEach(s => t.set(cleTitre(s.titre), s.titre));
        lignes.forEach(l => { const k = cleTitre(l.spectacle); if (!t.has(k)) t.set(k, L.typographie(l.spectacle)); });
        return t;
    }
    const proposer = t => `<button type="button" class="adm-suggestion-titre" data-titre="${esc(t)}">Tu veux dire « ${esc(t)} » ?</button>`;
    function majNoteSpectacle() {
        const note = $('note-spectacle');
        const saisi = modeAutre ? L.typographie($('f-spectacle-autre').value) : '';
        if (!saisi) { note.hidden = true; note.innerHTML = ''; return; }
        const k = cleTitre(saisi);
        const connus = titresConnus();
        let html = '';
        if (connus.has(k)) {
            if (connus.get(k) !== saisi) html = proposer(connus.get(k));
        } else {
            let proche = '', ecart = Infinity;
            connus.forEach((titre, cle) => {
                const court = cle.split(/,| : | \(/)[0];
                const d = Math.min(distance(k, cle), distance(k, court), k.length >= 5 && cle.startsWith(k) ? 0 : Infinity);
                if (d < ecart) { ecart = d; proche = titre; }
            });
            if (proche && ecart <= Math.max(2, Math.floor(k.length / 6))) html = proposer(proche);
        }
        if (spectaclesCV.length && !spectaclesCV.some(s => cleTitre(s.titre) === k)) {
            html += '<span class="adm-note-alerte">Ce titre n\'est pas dans le CV : la date n\'aura ni page spectacle ni lien depuis le CV.</span>';
        }
        note.innerHTML = html;
        note.hidden = !html;
    }
    $('note-spectacle').addEventListener('click', e => {
        const b = e.target.closest('[data-titre]');
        if (!b) return;
        choisirSpectacle(b.dataset.titre);
        rendrePucesLieux();
        majApercu();
    });
    $('f-spectacle-autre').addEventListener('input', () => {
        oterDevine('puces-spectacles');
        majNoteSpectacle();
        rendrePucesLieux();
        majApercu();
    });

    // ── Le lieu et la ville ──────────────────────────────────────────

    // Les lieux connus, les plus récents d'abord.
    function lieuxConnus() {
        const vus = new Map();
        [...lignes].sort((a, b) => (a.jour < b.jour ? 1 : -1)).forEach(l => { if (!vus.has(l.lieu)) vus.set(l.lieu, l.ville); });
        return [...vus].map(([lieu, ville]) => ({ lieu, ville }));
    }
    function rendreListesLieux() {
        const villes = [...new Set(lignes.map(l => l.ville))].sort((a, b) => a.localeCompare(b, 'fr'));
        $('l-villes').innerHTML = villes.map(v => `<option value="${esc(v)}">`).join('');
    }

    /**
     * LA VILLE SE DÉDUIT DU LIEU : « Le Forum, Falaise (14) » donne
     * « Falaise » ; un lieu déjà connu donne sa ville ; « Tribunal
     * judiciaire de Rouen (76) », une ville déjà connue à la fin. Elle
     * suit le lieu, en pointillé, tant qu'on ne l'a pas écrite soi-même.
     */
    function villeDuLieu(lieu) {
        const s = String(lieu || '').trim();
        if (!s) return '';
        const connu = lignes.find(x => x.lieu === s);
        if (connu) return connu.ville;
        const m = s.match(/,\s*([^,()]+?)\s*\(\s*\d{2,3}[AB]?\s*\)\s*$/i);
        if (m) return m[1].trim();
        const sansDep = normaliser(s.replace(/\s*\([^)]*\)\s*$/, ''));
        const villes = [...new Set(lignes.map(x => x.ville))].sort((a, b) => b.length - a.length);
        return villes.find(v => { const kv = normaliser(v); return sansDep === kv || sansDep.endsWith(' ' + kv) || sansDep.endsWith("'" + kv); }) || '';
    }
    function majVilleDeduite() {
        if (!villeDeduite && $('f-ville').value.trim()) return;
        const v = villeDuLieu($('f-lieu').value);
        $('f-ville').value = v;
        villeDeduite = !!v;
        $('note-ville').hidden = !villeDeduite;
        $('f-ville').classList.toggle('adm-deduit', villeDeduite);
    }
    function poserLieu(lieu, ville) {
        $('f-lieu').value = lieu;
        $('f-ville').value = ville;
        villeDeduite = false;
        $('note-ville').hidden = true;
        $('f-ville').classList.remove('adm-deduit');
        ['f-lieu', 'f-ville'].forEach(id => { $(id).removeAttribute('aria-invalid'); oterDevine(id); });
        $('suggestions-lieux').hidden = true;
        rendrePucesLieux();
        majApercu();
    }

    /**
     * TOUS LES LIEUX CONNUS, FILTRÉS PENDANT LA FRAPPE (deux lettres
     * suffisent, accents et majuscules ignorés, dans le lieu ou la ville).
     * La <datalist> ne montrait au téléphone qu'une suggestion à la fois.
     */
    function surligne(texte, k) {
        // Une lettre accentuée reste une lettre : les positions concordent.
        const plat = [...texte].map(c => { const p = sansAccents(c).toLowerCase(); return p.length === 1 ? p : c; }).join('');
        const i = plat.indexOf(k);
        if (i === -1 || !k) return esc(texte);
        return esc(texte.slice(0, i)) + '<mark>' + esc(texte.slice(i, i + k.length)) + '</mark>' + esc(texte.slice(i + k.length));
    }
    function rendreSuggestionsLieux() {
        const champ = $('f-lieu'), boite = $('suggestions-lieux');
        const saisie = champ.value.trim();
        const k = normaliser(saisie);
        const trouves = document.activeElement === champ && k.length >= 2
            ? lieuxConnus().filter(x => x.lieu !== saisie && (normaliser(x.lieu).includes(k) || normaliser(x.ville).includes(k))).slice(0, 5)
            : [];
        boite.innerHTML = trouves.map(x => `<button type="button" class="adm-suggestion" data-lieu="${esc(x.lieu)}" data-ville="${esc(x.ville)}">${surligne(x.lieu, k)}</button>`).join('');
        boite.hidden = !trouves.length;
    }
    // Toucher une suggestion ne doit pas d'abord faire perdre le champ (et
    // la liste avec lui).
    ['pointerdown', 'mousedown'].forEach(t => $('suggestions-lieux').addEventListener(t, e => e.preventDefault()));
    $('suggestions-lieux').addEventListener('click', e => {
        const b = e.target.closest('button[data-lieu]');
        if (!b) return;
        poserLieu(b.dataset.lieu, b.dataset.ville);
        $('f-lieu').blur();
    });
    $('f-lieu').addEventListener('input', () => {
        oterDevine('f-lieu');
        majVilleDeduite();
        rendreSuggestionsLieux();
        rendrePucesLieux();
        majApercu();
    });
    $('f-lieu').addEventListener('focus', rendreSuggestionsLieux);
    $('f-lieu').addEventListener('blur', () => { setTimeout(() => { if (document.activeElement !== $('f-lieu')) $('suggestions-lieux').hidden = true; }, 0); });
    $('f-ville').addEventListener('input', () => {
        villeDeduite = false;
        $('note-ville').hidden = true;
        $('f-ville').classList.remove('adm-deduit');
        oterDevine('f-ville');
        majApercu();
    });

    /**
     * LES LIEUX DÉJÀ JOUÉS PAR CE SPECTACLE, EN PUCES. Sur téléphone, un
     * toucher remplit le lieu ET la ville. Les plus récents d'abord, trois
     * au plus.
     */
    function rendrePucesLieux() {
        const titre = cleTitre(titreSaisi());
        const vus = new Map();
        [...lignes].sort((a, b) => (a.jour < b.jour ? 1 : -1))
            .filter(l => titre && cleTitre(l.spectacle) === titre)
            .forEach(l => { if (!vus.has(l.lieu)) vus.set(l.lieu, l.ville); });
        // Le lieu déjà dans le champ n'est pas reproposé.
        const courant = $('f-lieu').value.trim();
        const lieux = [...vus].filter(([lieu]) => lieu !== courant).slice(0, 3);
        $('puces-lieux').innerHTML = lieux.map(([lieu, ville]) =>
            `<button type="button" class="adm-puce-rapide" data-lieu="${esc(lieu)}" data-ville="${esc(ville)}">${esc(lieu)}</button>`).join('');
        $('puces-lieux').hidden = !lieux.length;
    }
    $('puces-lieux').addEventListener('click', e => {
        const b = e.target.closest('button[data-lieu]');
        if (b) poserLieu(b.dataset.lieu, b.dataset.ville);
    });

    // ── L'heure ────────────────────────────────────────────────────

    /**
     * L'HEURE SE CHOISIT SUR LE CADRAN DU TÉLÉPHONE. Le champ est un
     * <input type="time"> : Android ouvre son horloge (l'heure, puis les
     * minutes, sur un cadran), l'iPhone ses molettes. Il rend « 19:30 » ;
     * le site écrit « 19h30 ». Les deux fonctions ci-dessous traduisent.
     *
     * Un mot (« matin », « après-midi ») ne tient pas dans un cadran : la
     * table en contient déjà. Il est gardé à part, dans `heureMot`, et se
     * choisit par sa puce ; toucher le cadran l'efface.
     */
    let heureMot = '';
    const versCadran = h => { const m = /^(\d{1,2})h(\d{2})$/.exec(h || ''); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''; };
    const depuisCadran = v => { const m = /^(\d{2}):(\d{2})/.exec(v || ''); return m ? `${Number(m[1])}h${m[2]}` : ''; };
    const heureChoisie = () => heureMot || depuisCadran($('f-heure').value);
    function poserHeure(h) {
        const cadran = versCadran(h);
        heureMot = h && !cadran ? h : '';
        $('f-heure').value = cadran;
        $('f-heure').removeAttribute('aria-invalid');
        rendrePucesHeures();
    }

    /**
     * LES HEURES HABITUELLES, EN PUCES : celles que la table emploie le
     * plus (19h00, 20h00, matin…), dans l'ordre de la journée, plus « Sans
     * heure ». Un toucher, sans même ouvrir le cadran.
     */
    function rendrePucesHeures() {
        const compte = new Map();
        lignes.forEach(l => { if (l.heure) compte.set(l.heure, (compte.get(l.heure) || 0) + 1); });
        const heures = [...compte].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([h]) => h)
            .sort((a, b) => cleHeure(a) - cleHeure(b) || a.localeCompare(b, 'fr'));
        const courant = heureChoisie();
        $('puces-heures').innerHTML = heures.map(h =>
            `<button type="button" class="adm-puce-rapide" data-heure="${esc(h)}" aria-pressed="${h === courant}">${esc(h)}</button>`).join('')
            + (heures.length ? `<button type="button" class="adm-puce-rapide" data-heure="" aria-pressed="${!courant}">Sans heure</button>` : '');
    }
    const heureChangee = () => { oterDevine('f-heure'); rendreAutresJours(); majApercu(); };
    $('puces-heures').addEventListener('click', e => {
        const b = e.target.closest('button[data-heure]');
        if (!b) return;
        poserHeure(b.dataset.heure);
        heureChangee();
    });
    // `input` et `change` : selon le téléphone, le sélecteur natif annonce
    // l'un, l'autre, ou les deux (le second passage ne change rien).
    ['input', 'change'].forEach(t => $('f-heure').addEventListener(t, () => { heureMot = ''; rendrePucesHeures(); heureChangee(); }));

    // ── Le jour, et un jour passé ──────────────────────────────────
    function majNoteJour() {
        const j = $('f-jour').value, note = $('note-jour');
        const passe = !!j && j < aujourdhui && !(ficheMode === 'modifier' && ligneOuverte && ligneOuverte.jour === j);
        note.hidden = !passe;
        note.innerHTML = passe ? '<span class="adm-note-alerte">Ce jour est déjà passé : la date ira directement dans les archives du site.</span>' : '';
    }
    ['input', 'change'].forEach(t => $('f-jour').addEventListener(t, () => {
        oterDevine('f-jour');
        $('f-jour').removeAttribute('aria-invalid');
        joursEnPlus = joursEnPlus.filter(j => j.jour !== $('f-jour').value || j.heure);
        majNoteJour();
        rendreAutresJours();
        majApercu();
    }));
    $('f-scolaire').addEventListener('change', () => { oterDevine('scolaire'); majApercu(); });

    // ══════════════════════════════════════════════════════════════
    //  UNE SÉRIE D'UN COUP : LES AUTRES JOURS
    // ══════════════════════════════════════════════════════════════
    //  Cinq soirées au même lieu, c'était cinq fiches : la première, puis
    //  « + » et Enregistrer, quatre fois. Les autres jours s'ajoutent ici —
    //  le lendemain, sept jours plus tard, ou cochés sur un calendrier — et
    //  partent avec la soirée, en un seul envoi de N lignes.

    function ajouterJour(iso, heure) {
        heure = heure || null;
        if (!iso || (iso === $('f-jour').value && !heure)) return false;
        if (joursEnPlus.some(j => j.jour === iso && (j.heure || null) === heure)) return false;
        joursEnPlus.push({ jour: iso, heure });
        joursEnPlus.sort((a, b) => a.jour.localeCompare(b.jour) || cleHeure(a.heure) - cleHeure(b.heure));
        return true;
    }
    const derniereDate = () => [$('f-jour').value].concat(joursEnPlus.map(j => j.jour)).filter(Boolean).sort().pop() || '';
    function ajouterAPartir(n) {
        const base = derniereDate();
        if (!base) { erreurChamp('Choisis d\'abord le jour de la première soirée.', 'f-jour'); return; }
        effacerMessage();
        ajouterJour(decaler(base, n));
        rendreAutresJours();
        majApercu();
    }
    $('btn-jour-suivant').addEventListener('click', () => ajouterAPartir(1));
    $('btn-semaine-suivante').addEventListener('click', () => ajouterAPartir(7));
    $('jours-en-plus').addEventListener('click', e => {
        const b = e.target.closest('[data-retirer]');
        if (!b) return;
        joursEnPlus.splice(Number(b.dataset.retirer), 1);
        rendreAutresJours();
        majApercu();
    });

    function rendreAutresJours() {
        $('jours-en-plus').innerHTML = joursEnPlus.map((j, i) =>
            `<button type="button" class="adm-puce-rapide adm-jour-en-plus" data-retirer="${i}" aria-label="Retirer le ${esc(jourLisible(j.jour))}${j.heure ? ' à ' + esc(j.heure) : ''}">${esc(jourBref(j.jour))}${j.heure ? ' · ' + esc(j.heure) : ''}<svg class="ico" aria-hidden="true"><use href="#i-solid-xmark"></use></svg></button>`).join('');
        // LE RÉCAPITULATIF : ce qui partira, en une phrase.
        const recap = $('recap-serie');
        const principal = $('f-jour').value;
        if (joursEnPlus.length && principal && ficheMode !== 'modifier') {
            const h = heureChoisie();
            const toutes = [{ jour: principal, heure: null }].concat(joursEnPlus)
                .sort((a, b) => a.jour.localeCompare(b.jour) || cleHeure(a.heure || h) - cleHeure(b.heure || h));
            const jours = toutes.map(s => `${jourBref(s.jour)}${s.heure && s.heure !== h ? ' à ' + s.heure : ''}`);
            recap.textContent = `${toutes.length} soirées en un envoi : ${enumerer(jours)} — ${h ? 'à ' + h : 'horaire à confirmer'}.`;
            recap.hidden = false;
        } else recap.hidden = true;
        rendreCalendrier();
        majBoutonEnregistrer();
    }

    // Le mini-calendrier : la soirée en or plein, les jours ajoutés cerclés.
    let calMois = '';
    $('btn-calendrier').addEventListener('click', () => {
        const cal = $('calendrier');
        cal.hidden = !cal.hidden;
        $('btn-calendrier').setAttribute('aria-expanded', String(!cal.hidden));
        if (cal.hidden) return;
        calMois = (derniereDate() || aujourdhui).slice(0, 7);
        rendreCalendrier();
        defiler(cal);
    });
    function rendreCalendrier() {
        const cal = $('calendrier');
        if (cal.hidden || !calMois) return;
        const [a, m] = calMois.split('-').map(Number);
        const decal = (new Date(a, m - 1, 1).getDay() + 6) % 7;   // lundi d'abord
        const nb = new Date(a, m, 0).getDate();
        const principal = $('f-jour').value;
        const choisis = new Set(joursEnPlus.map(j => j.jour));
        let h = `<div class="adm-cal-tete"><button type="button" data-cal="-1" aria-label="Mois précédent"${calMois <= aujourdhui.slice(0, 7) ? ' disabled' : ''}>‹</button>`
            + `<span aria-live="polite">${esc(DL_MOIS[m - 1])} ${a}</span><button type="button" data-cal="1" aria-label="Mois suivant">›</button></div><div class="adm-cal-grille">`
            + ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map(j => `<span class="adm-cal-jsem" aria-hidden="true">${j}</span>`).join('')
            + '<span></span>'.repeat(decal);
        for (let j = 1; j <= nb; j++) {
            const iso = `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
            const cls = (iso === principal ? ' est-principal' : choisis.has(iso) ? ' est-choisi' : '') + (iso === aujourdhui ? ' est-aujourdhui' : '');
            h += `<button type="button" class="adm-cal-jour${cls}" data-jour="${iso}" aria-pressed="${iso === principal || choisis.has(iso)}" aria-label="${esc(jourLisible(iso))}"${iso < aujourdhui ? ' disabled' : ''}>${j}</button>`;
        }
        cal.innerHTML = h + '</div>';
    }
    $('calendrier').addEventListener('click', e => {
        const nav = e.target.closest('[data-cal]');
        if (nav) {
            const [a, m] = calMois.split('-').map(Number);
            calMois = isoLocal(new Date(a, m - 1 + Number(nav.dataset.cal), 1)).slice(0, 7);
            rendreCalendrier();
            const meme = $('calendrier').querySelector(`[data-cal="${nav.dataset.cal}"]`);
            if (meme && !meme.disabled) meme.focus();
            return;
        }
        const b = e.target.closest('[data-jour]');
        if (!b || b.disabled) return;
        const iso = b.dataset.jour;
        if (!$('f-jour').value) {
            $('f-jour').value = iso;
            oterDevine('f-jour');
            $('f-jour').removeAttribute('aria-invalid');
            majNoteJour();
        } else if (iso === $('f-jour').value) {
            return;
        } else if (joursEnPlus.some(j => j.jour === iso)) {
            joursEnPlus = joursEnPlus.filter(j => j.jour !== iso);
        } else ajouterJour(iso);
        rendreAutresJours();
        majApercu();
        const meme = $('calendrier').querySelector(`[data-jour="${iso}"]`);
        if (meme) meme.focus();
    });

    // ── Le lien de réservation, et « Tester » ──────────────────────
    function majLien() {
        const brut = $('f-url').value.trim(), propre = L.lienSur(brut), note = $('note-url');
        $('btn-tester-lien').disabled = !propre;
        if (brut && !propre) {
            note.innerHTML = '<span class="adm-note-alerte">Ce n\'est pas une adresse web complète : elle doit commencer par https://</span>';
            note.hidden = false;
        } else if (propre && propre !== brut) {
            note.textContent = `Sera enregistré : ${propre}`;
            note.hidden = false;
        } else { note.textContent = ''; note.hidden = true; }
    }
    $('f-url').addEventListener('input', () => { oterDevine('f-url'); $('f-url').removeAttribute('aria-invalid'); majLien(); majApercu(); });
    // « Tester » ouvre la billetterie dans un autre onglet : on voit que le
    // lien mène bien à la bonne page avant de le mettre en ligne.
    $('btn-tester-lien').addEventListener('click', () => {
        const u = L.lienSur($('f-url').value.trim());
        if (u) window.open(u, '_blank', 'noopener');
    });

    // ── L'aperçu : la ligne telle que le site l'affichera ──────────
    //  Avec les autres soirées de sa série : ajouter un samedi à une série
    //  de trois soirs montre la série entière, le samedi souligné.
    function majApercu() {
        if (!fiche.open) return;
        const zone = $('apercu-ligne');
        const spectacle = titreSaisi();
        const jour = $('f-jour').value;
        if (!spectacle || !jour) {
            zone.innerHTML = '<p class="dl-vide">L\'aperçu paraît dès que le spectacle et le jour sont choisis.</p>';
            return;
        }
        const base = {
            spectacle, lieu: L.typographie($('f-lieu').value) || 'Lieu à préciser', ville: L.typographie($('f-ville').value),
            heure: heureChoisie(), reservation_url: L.lienSur($('f-url').value.trim()), scolaire: $('f-scolaire').checked
        };
        const id = Number($('f-id').value) || null;
        const nouvelles = [Object.assign({ id: -1, jour }, base)].concat(ficheMode === 'modifier' ? []
            : joursEnPlus.map((j, i) => Object.assign({}, base, { id: -2 - i, jour: j.jour, heure: j.heure || base.heure })));
        const passee = jour < aujourdhui;
        const memeCote = l => (l.jour < aujourdhui) === passee;
        const autres = lignes.filter(l => l.id !== id && !suppressions.has(l.id) && memeCote(l));
        try {
            zone.innerHTML = rendreBloc(autres.concat(nouvelles.filter(memeCote)), passee, { apercu: true, seulement: new Set(nouvelles.map(n => n.id)) });
        } catch (e) { zone.innerHTML = ''; }
    }

    // ══════════════════════════════════════════════════════════════
    //  COLLER UN MAIL
    // ══════════════════════════════════════════════════════════════
    //  Le mail du théâtre, collé tel quel. On y cherche :
    //   · les dates, en français (« mardi 2 février 2027 », « les 22 et 23
    //     octobre », « du 18 au 21 mai », « 18-21 mai », « 02/02/2027 ») —
    //     sans année, la prochaine occurrence ;
    //   · les heures (« 20h30 », « 20 h », « 14:15 »), rattachées à la date
    //     qui les précède ; une heure avant toute date vaut pour toutes ;
    //   · le lien de billetterie : le premier lien qui en a l'air
    //     (billetterie, réservation, Weezevent, Mapado…), sinon le premier
    //     lien https ;
    //   · le spectacle et le lieu, parmi ceux déjà connus (CV, table) ;
    //   · « scolaire », s'il n'y a pas aussi de séance publique.
    //  Ce qui est trouvé remplit les champs VIDES, et se signale « deviné »
    //  jusqu'à ce qu'on y touche ; plusieurs dates font une série.

    const MOIS_NUM = { janvier: 1, janv: 1, jan: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, avril: 4, avr: 4, mai: 5, juin: 6, juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, sep: 9, octobre: 10, oct: 10, novembre: 11, nov: 11, decembre: 12, dec: 12 };
    const MOIS_RE = '(janvier|janv|jan|fevrier|fevr|fev|mars|avril|avr|mai|juin|juillet|juil|aout|septembre|sept|sep|octobre|oct|novembre|nov|decembre|dec)\\.?';
    const isoSur = (a, m, j) => { const d = new Date(a, m - 1, j); return d.getFullYear() === a && d.getMonth() === m - 1 && d.getDate() === j ? isoLocal(d) : ''; };
    function anneeDe(m, j, a) {
        if (a) { a = Number(a); return a < 100 ? 2000 + a : a; }
        const cette = new Date().getFullYear();
        const iso = isoSur(cette, m, j);
        return iso && iso < aujourdhui ? cette + 1 : cette;
    }
    function lireMail(brut) {
        // Le texte, à plat : sans accents ni majuscules, « 1er » → « 1 », et
        // sans jours de la semaine devant un nombre (« jeudi 12 » → « 12 »).
        let texte = sansAccents(String(brut || '')).toLowerCase().replace(/[\u00a0\u202f]/g, ' ')
            .replace(/(\d)\s*er\b/g, '$1')
            .replace(/\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun|mar|mer|jeu|ven|sam|dim)\.?\s+(?=\d)/g, '');
        const dates = [];
        // Chaque forme trouvée est effacée du texte (des espaces, même
        // longueur) : la suivante ne la relit pas, les positions tiennent.
        const consommer = (re, fn) => {
            texte = texte.replace(re, (...args) => {
                const pos = args[args.length - 2];
                const jours = fn(args).filter(Boolean);
                if (jours.length) dates.push({ pos, jours });
                return ' '.repeat(args[0].length);
            });
        };
        const etendue = (a1, m1, j1, a2, m2, j2) => {
            const debut = isoSur(a1, m1, j1), fin = isoSur(a2, m2, j2);
            if (!debut || !fin || fin < debut) return [];
            const jours = [];
            for (let d = debut; d <= fin && jours.length < 31; d = decaler(d, 1)) jours.push(d);
            return jours;
        };
        // « du 18 au 21 mai 2027 », « du 30 avril au 2 mai »
        consommer(new RegExp(`\\b(?:du\\s+)?(\\d{1,2})(?:\\s+${MOIS_RE})?(?:\\s+(\\d{4}))?\\s+au\\s+(\\d{1,2})\\s+${MOIS_RE}(?:\\s+(\\d{4}))?`, 'g'), g => {
            const m2 = MOIS_NUM[g[5]], m1 = MOIS_NUM[g[2]] || m2, j1 = +g[1], j2 = +g[4];
            const a2 = anneeDe(m2, j2, g[6]);
            const a1 = g[3] ? +g[3] : (m1 > m2 ? a2 - 1 : a2);
            return etendue(a1, m1, j1, a2, m2, j2);
        });
        // « 18-21 mai »
        consommer(new RegExp(`\\b(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+${MOIS_RE}(?:\\s+(\\d{4}))?`, 'g'), g => {
            const m = MOIS_NUM[g[3]], a = anneeDe(m, +g[2], g[4]);
            return etendue(a, m, +g[1], a, m, +g[2]);
        });
        // « les 22 et 23 octobre », « 12, 13 et le 14 novembre 2026 »
        consommer(new RegExp(`\\b((?:\\d{1,2}\\s*(?:,|et|&)\\s*(?:le\\s+)?)+\\d{1,2})\\s+${MOIS_RE}(?:\\s+(\\d{4}))?`, 'g'), g => {
            const m = MOIS_NUM[g[2]];
            return g[1].split(/\D+/).filter(Boolean).map(Number).map(j => isoSur(anneeDe(m, j, g[3]), m, j));
        });
        // « 2 février 2027 », « 12 nov. »
        consommer(new RegExp(`\\b(\\d{1,2})\\s+${MOIS_RE}(?:\\s+(\\d{4}))?`, 'g'), g => {
            const m = MOIS_NUM[g[2]], j = +g[1];
            return [isoSur(anneeDe(m, j, g[3]), m, j)];
        });
        // « 2027-02-02 », « 02/02/2027 », « 2.2.27 »
        consommer(/\b(\d{4})-(\d{2})-(\d{2})\b/g, g => [isoSur(+g[1], +g[2], +g[3])]);
        consommer(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b/g, g => [isoSur(+g[3] < 100 ? 2000 + +g[3] : +g[3], +g[2], +g[1])]);

        // Les heures. Pas avant 7 h : « 1h30 », c'est une durée.
        const heures = [];
        texte.replace(/\b(\d{1,2})\s*(?:h|heures?)\s*(\d{2})?(?!\d)|\b(\d{1,2}):(\d{2})\b/g, (m0, h1, m1, h2, m2, pos) => {
            const h = Number(h1 ?? h2), mn = Number(m1 ?? m2 ?? 0);
            const avant = texte.slice(Math.max(0, pos - 16), pos);
            if (h >= 7 && h <= 23 && mn < 60 && !/duree|dure |pendant|environ/.test(avant)) heures.push({ pos, heure: `${h}h${String(mn).padStart(2, '0')}` });
            return m0;
        });

        dates.sort((a, b) => a.pos - b.pos);
        const globales = heures.filter(h => !dates.length || h.pos < dates[0].pos).map(h => h.heure);
        const seances = [];
        dates.forEach((d, i) => {
            const fin = i + 1 < dates.length ? dates[i + 1].pos : Infinity;
            const propres = heures.filter(h => h.pos > d.pos && h.pos < fin).map(h => h.heure);
            const hs = [...new Set(propres.length ? propres : globales)];
            d.jours.forEach(j => (hs.length ? hs : ['']).forEach(h => seances.push({ jour: j, heure: h })));
        });
        const vues = new Set();
        const uniques = seances.filter(s => {
            const k = s.jour + '|' + s.heure;
            if (vues.has(k) || s.jour < aujourdhui) return false;
            vues.add(k);
            return true;
        }).sort((a, b) => a.jour.localeCompare(b.jour) || cleHeure(a.heure) - cleHeure(b.heure));

        // Le lien de billetterie.
        const liens = (String(brut || '').match(/https?:\/\/[^\s<>"'()[\]{}]+/gi) || []).map(u => u.replace(/[.,;:!?»…]+$/, ''));
        const billet = liens.find(u => /billet|ticket|reserv|resa|booking|weezevent|helloasso|mapado|vostickets|fnacspectacles|digitick|placeminute|festik|yurplan|billetweb|shotgun|eventbrite/i.test(u));
        const url = L.lienSur(billet || liens.find(u => /^https:/i.test(u)) || '');

        // Le spectacle et le lieu, parmi ceux déjà connus.
        const tn = normaliser(brut);
        let spectacle = '', score = 0;
        [...new Set(listeSpectacles().map(s => s.titre).concat(spectaclesCV.map(s => s.titre)))].forEach(titre => {
            const k = normaliser(titre), court = normaliser(titre.split(/,|\s:\s|\s\(/)[0]);
            [k, court].forEach(c => { if (c.length >= 5 && tn.includes(c) && c.length > score) { score = c.length; spectacle = titre; } });
        });
        const contient = mot => new RegExp(`(^|[^a-z0-9])${echapperRe(mot)}([^a-z0-9]|$)`).test(tn);
        let lieu = null, force = 0;
        lieuxConnus().forEach(x => {
            const salle = normaliser(x.lieu.replace(/\s*\([^)]*\)\s*$/, '').split(',')[0]);
            // Un mail écrit « au Forum de Falaise », pas « Le Forum, Falaise » :
            // la salle se reconnaît aussi sans son article.
            const sansArticle = salle.replace(/^(le|la|les|l')\s*/, '');
            const aSalle = (salle.length >= 5 && tn.includes(salle)) || (sansArticle.length >= 5 && contient(sansArticle));
            const aVille = normaliser(x.ville).length >= 3 && contient(normaliser(x.ville));
            // Une salle seule et générique (« Collège ») ne suffit pas : il
            // faut aussi la ville, ou un nom de salle assez long.
            const f = (aSalle ? salle.length : 0) + (aVille ? 20 : 0);
            if (aSalle && (aVille || salle.length >= 10) && f > force) { force = f; lieu = x; }
        });
        let ville = lieu ? lieu.ville : '';
        if (!ville) ville = [...new Set(lignes.map(l => l.ville))].sort((a, b) => b.length - a.length).find(v => contient(normaliser(v))) || '';
        const scolaire = /\bscolaires?\b/.test(tn) && !/tout public|grand public|seance publique|representation publique|en soiree/.test(tn);
        return { spectacle, lieu, ville, seances: uniques, url, scolaire };
    }

    // « Deviné » : un liseré ambré, ôté dès qu'on touche au champ.
    const cibleDevine = id => (id === 'scolaire' ? $('f-scolaire').closest('.adm-interrupteur') : $(id));
    const marquerDevine = id => { const c = cibleDevine(id); if (c) c.classList.add('adm-devine'); };
    const oterDevine = id => { const c = cibleDevine(id); if (c) c.classList.remove('adm-devine'); };
    const effacerDevines = () => fiche.querySelectorAll('.adm-devine').forEach(c => c.classList.remove('adm-devine'));

    let dernierMail = '';
    function appliquerMail() {
        const brut = $('f-mail').value;
        const bilan = $('coller-bilan');
        if (!brut.trim()) { bilan.hidden = true; dernierMail = ''; return; }
        if (brut === dernierMail) return;
        dernierMail = brut;
        const r = lireMail(brut);
        const trouve = [];
        const deviner = (id, valeur) => {
            if (!valeur || $(id).value.trim()) return false;
            $(id).value = valeur;
            marquerDevine(id);
            return true;
        };
        if (r.spectacle && !titreSaisi()) { choisirSpectacle(r.spectacle, { replie: false }); marquerDevine('puces-spectacles'); trouve.push(r.spectacle); }
        if (r.lieu) {
            if (deviner('f-lieu', r.lieu.lieu)) trouve.push(r.lieu.lieu);
            if (deviner('f-ville', r.lieu.ville)) { villeDeduite = false; $('note-ville').hidden = true; $('f-ville').classList.remove('adm-deduit'); }
        } else if (deviner('f-ville', r.ville)) trouve.push(r.ville);
        if (r.seances.length) {
            const [p, ...autres] = r.seances;
            if (!$('f-jour').value) {
                $('f-jour').value = p.jour;
                marquerDevine('f-jour');
                if (p.heure && !heureChoisie()) { poserHeure(p.heure); marquerDevine('f-heure'); }
            }
            const h = heureChoisie();
            autres.forEach(s => ajouterJour(s.jour, s.heure && s.heure !== h ? s.heure : null));
            trouve.push(`${r.seances.length > 1 ? r.seances.length + ' dates' : '1 date'} (${r.seances.map(s => jourBref(s.jour) + (s.heure ? ' ' + s.heure : '')).join(', ')})`);
        }
        if (deviner('f-url', r.url)) trouve.push('le lien de billetterie');
        if (r.scolaire && !$('f-scolaire').checked) { $('f-scolaire').checked = true; marquerDevine('scolaire'); trouve.push('séance scolaire'); }
        const manque = [!titreSaisi() && 'le spectacle', !$('f-lieu').value.trim() && 'le lieu', !$('f-jour').value && 'la date'].filter(Boolean);
        bilan.innerHTML = trouve.length
            ? `Trouvé : ${esc(trouve.join(' · '))}. <strong>Vérifie les champs surlignés.</strong>${manque.length ? ` Reste à remplir : ${esc(enumerer(manque))}.` : ''}`
            : 'Rien de reconnu dans ce texte : remplis les champs à la main.';
        bilan.hidden = false;
        rendrePucesLieux();
        rendrePucesHeures();
        rendreAutresJours();
        majNoteJour();
        majLien();
        majApercu();
    }
    let minuteurMail = 0;
    $('f-mail').addEventListener('input', () => { clearTimeout(minuteurMail); minuteurMail = setTimeout(appliquerMail, 300); });

    // ── Ouvrir, fermer ─────────────────────────────────────────────
    const etatFiche = () => JSON.stringify([titreSaisi(), ...['f-lieu', 'f-ville', 'f-jour', 'f-url'].map(id => $(id).value), heureChoisie(), $('f-scolaire').checked, joursEnPlus]);
    const ficheModifiee = () => fiche.open && etatFiche() !== ficheInitiale;

    // Les autres soirées de la même série (comme le site les regroupe).
    function serieDe(l) {
        const memeCote = x => (x.jour < aujourdhui) === (l.jour < aujourdhui);
        const groupe = lignes.filter(x => memeCote(x) && !suppressions.has(x.id));
        const e = L.versShowData(groupe).find(x => (x.type === 'series' ? x.shows.some(s => s.id === l.id) : x.id === l.id));
        if (!e || e.type !== 'series') return [l];
        return e.shows.map(s => lignes.find(x => x.id === s.id)).filter(Boolean);
    }
    function rendreSerieFiche() {
        const serie = ficheMode === 'modifier' && ligneOuverte ? serieDe(ligneOuverte) : [];
        $('serie-fiche').hidden = serie.length < 2;
        $('serie-puces').innerHTML = serie.length < 2 ? '' : serie.map(x =>
            `<button type="button" class="adm-puce-rapide" data-soiree="${x.id}" aria-pressed="${x.id === ligneOuverte.id}">${esc(jourBref(x.jour))} · ${esc(x.heure || 'sans heure')}</button>`).join('');
    }
    $('serie-puces').addEventListener('click', e => {
        const b = e.target.closest('[data-soiree]');
        if (!b) return;
        const l = lignes.find(x => x.id === Number(b.dataset.soiree));
        if (!l || (ligneOuverte && l.id === ligneOuverte.id)) return;
        if (fermerFiche()) ouvrirFiche(l, 'modifier');
    });

    function ouvrirFiche(l, mode, o) {
        o = o || {};
        ficheMode = mode;
        ligneOuverte = mode === 'modifier' ? l : null;
        derniereErreur = null;
        chargerSpectaclesDuCV();
        rendreListesLieux();
        $('f-id').value = mode === 'modifier' ? l.id : '';
        $('f-lieu').value = l.lieu || '';
        $('f-ville').value = l.ville || '';
        villeDeduite = false;
        $('note-ville').hidden = true;
        $('f-ville').classList.remove('adm-deduit');
        $('f-jour').value = l.jour || '';
        poserHeure(l.heure || '');
        $('f-url').value = l.reservation_url || '';
        $('f-scolaire').checked = !!l.scolaire;
        joursEnPlus = [];
        effacerDevines();
        choisirSpectacle(l.spectacle || '', { replie: mode !== 'nouvelle' && !!l.spectacle });

        // LA FICHE NOMME SA SOIRÉE : « jeu. 12 nov. 2026 · 20h00 · Saint-Quentin ».
        $('fiche-titre').textContent = mode === 'modifier' ? 'Modifier la soirée' : mode === 'copie' ? 'Nouvelle soirée, copiée' : 'Nouvelle soirée';
        $('fiche-sous-titre').textContent = mode === 'modifier' ? nomSoiree(l)
            : mode === 'copie' && o.modele ? `D'après le ${jourLisible(o.modele.jour)} à ${o.modele.ville}${l.jour ? '' : ' — choisis le jour'}. Change ce qui doit l'être.`
                : 'Elle sera en ligne dès l\'enregistrement.';
        $('gestes-fiche').hidden = mode !== 'modifier';
        rendreSerieFiche();
        $('coller').hidden = mode === 'modifier';
        $('coller').open = !!o.coller;
        $('f-mail').value = '';
        dernierMail = '';
        $('coller-bilan').hidden = true;
        $('bloc-autres-jours').hidden = mode === 'modifier';
        $('calendrier').hidden = true;
        $('btn-calendrier').setAttribute('aria-expanded', 'false');
        ['f-lieu', 'f-ville', 'f-jour', 'f-url', 'f-heure', 'f-spectacle-autre'].forEach(id => $(id).removeAttribute('aria-invalid'));
        effacerMessage();
        $('suggestions-lieux').hidden = true;
        rendrePucesLieux();
        rendrePucesHeures();
        rendreAutresJours();
        majNoteJour();
        majLien();
        ficheInitiale = etatFiche();
        if (!fiche.open) fiche.showModal();
        majOuverture();
        caler();
        majPied();
        majApercu();
        corpsFiche.scrollTop = 0;
        // Sur téléphone, pas de focus automatique dans un champ : il
        // ouvrirait le clavier (ou le calendrier) par-dessus la fiche
        // avant qu'on l'ait lue. Sur ordinateur, on garde le raccourci.
        // « Coller un mail » fait exception : on vient pour coller.
        setTimeout(() => {
            if (o.coller) { $('f-mail').focus({ preventScroll: true }); return; }
            const cible = l.spectacle && !tactile() ? $('f-jour') : $('puces-spectacles').querySelector('button');
            if (cible) cible.focus({ preventScroll: true });
        }, 50);
    }

    // Fermer sans enregistrer une fiche remplie à moitié se confirme : un
    // toucher à côté, sur téléphone, suffisait à tout perdre.
    const QUESTION_FERMER = 'Fermer sans enregistrer ? Les changements seront perdus.';
    function fermerFiche(force) {
        if (!fiche.open) return true;
        if (force !== true && ficheModifiee() && !confirm(QUESTION_FERMER)) return false;
        fiche.close();
        return true;
    }
    // La croix, « Annuler », le voile : requestClose() quand le navigateur
    // le connaît — la fermeture passe alors par « cancel », comme Échap et
    // le geste « retour » d'Android, et une seule garde sert à tous. Sinon,
    // la même garde, à la main.
    function demanderFermeture() {
        if (enregistrementEnCours) return;
        if (typeof fiche.requestClose === 'function') fiche.requestClose();
        else fermerFiche();
    }
    fiche.addEventListener('cancel', e => {
        if (enregistrementEnCours) { e.preventDefault(); return; }
        if (ficheModifiee() && e.cancelable && !confirm(QUESTION_FERMER)) e.preventDefault();
    });
    $('btn-annuler').addEventListener('click', demanderFermeture);
    $('btn-fermer-fiche').addEventListener('click', demanderFermeture);
    fiche.addEventListener('click', e => { if (e.target === fiche) demanderFermeture(); });
    fiche.addEventListener('close', () => { majOuverture(); $('suggestions-lieux').hidden = true; });

    const nouvelleDate = () => ouvrirFiche({}, 'nouvelle');
    $('btn-ajouter').addEventListener('click', nouvelleDate);
    $('btn-ajouter-flottant').addEventListener('click', nouvelleDate);
    $('btn-coller').addEventListener('click', () => ouvrirFiche({}, 'nouvelle', { coller: true }));
    // Supprimer : pas de confirmation, mais six secondes pour « Annuler ».
    $('btn-supprimer-fiche').addEventListener('click', () => {
        const l = ligneOuverte;
        if (!l) return;
        fermerFiche(true);
        demanderSuppression(l);
    });
    $('btn-dupliquer-fiche').addEventListener('click', () => {
        const l = ligneOuverte;
        if (l && fermerFiche()) ouvrirFiche(copieDe(l), 'copie', { modele: l });
    });

    /**
     * LA TOUCHE ENTRÉE PASSE AU CHAMP SUIVANT. Le clavier affichait
     * « suivant » (enterkeyhint), mais la touche envoyait la fiche : un
     * lieu corrigé partait en ligne avec l'ancienne ville. Sur le dernier
     * champ, elle referme le clavier. Seul le bouton enregistre.
     */
    const ORDRE = ['f-spectacle-autre', 'f-lieu', 'f-ville', 'f-jour', 'f-heure', 'f-url'];
    $('form-date').addEventListener('keydown', e => {
        if (e.key !== 'Enter' || e.isComposing) return;
        const t = e.target;
        if (!(t instanceof HTMLInputElement) || t.type === 'checkbox') return;
        e.preventDefault();
        const visibles = ORDRE.map($).filter(el => !el.hidden && el.offsetParent !== null);
        const i = visibles.indexOf(t);
        const suivant = i === -1 ? null : visibles[i + 1];
        if (suivant) suivant.focus(); else t.blur();
    });
    $('form-date').addEventListener('submit', e => e.preventDefault());
    $('btn-enregistrer').addEventListener('click', () => enregistrer());

    // ── Le message du pied, et le champ en faute ───────────────────
    //  Le pied mesure sa hauteur (il grandit avec le message) : la fiche
    //  s'en sert pour arrêter tout défilement vers un champ au-dessus de
    //  lui (scroll-padding-bottom, voir admin.css).
    function majPied() { corpsFiche.style.setProperty('--pied-h', `${piedFiche.offsetHeight}px`); }
    if ('ResizeObserver' in window) new ResizeObserver(majPied).observe(piedFiche);

    function afficherMessage(texte, o) {
        o = o || {};
        $('msg-fiche-texte').textContent = texte;
        const g = $('msg-fiche-gestes');
        g.textContent = '';
        (o.gestes || []).forEach(x => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'adm-message-geste';
            b.textContent = x.libelle;
            b.addEventListener('click', () => x.fn());
            g.appendChild(b);
        });
        g.hidden = !g.children.length;
        $('msg-fiche').classList.toggle('est-erreur', o.erreur !== false);
        $('msg-fiche').hidden = false;
        majPied();
    }
    function effacerMessage() { $('msg-fiche').hidden = true; majPied(); }

    // LE CHAMP EN FAUTE EST DÉSIGNÉ, PAS SEULEMENT NOMMÉ : aria-invalid le
    // signale aux lecteurs d'écran, la fiche défile jusqu'à lui (au-dessus
    // du pied), le focus y est porté, et le message (role="alert") est lu
    // aussitôt — dans le pied, sous le pouce.
    function erreurChamp(texte, champ) {
        afficherMessage(texte, { erreur: true });
        const el = champ ? $(champ) : $('bloc-spectacle');
        if (champ) el.setAttribute('aria-invalid', 'true');
        defiler(el, 'nearest');
        const cible = champ ? el : el.querySelector('button');
        if (cible) cible.focus({ preventScroll: true });
        return false;
    }

    function majBoutonEnregistrer() {
        const b = $('btn-enregistrer');
        const n = ficheMode === 'modifier' ? 1 : 1 + joursEnPlus.length;
        b.setAttribute('aria-busy', String(enregistrementEnCours));
        b.disabled = enregistrementEnCours;
        b.innerHTML = enregistrementEnCours ? '<span class="adm-roue" aria-hidden="true"></span>Enregistrement…'
            : n > 1 ? `Enregistrer les ${n} soirées` : 'Enregistrer';
        $('btn-annuler').disabled = enregistrementEnCours;
        $('btn-fermer-fiche').disabled = enregistrementEnCours;
    }

    // ══════════════════════════════════════════════════════════════
    //  L'ENREGISTREMENT
    // ══════════════════════════════════════════════════════════════
    const CHAMPS = ['spectacle', 'lieu', 'ville', 'jour', 'heure', 'reservation_url', 'scolaire'];
    const memeContenu = (a, b) => CHAMPS.every(c => String(a[c] ?? '') === String(b[c] ?? ''));
    const cleSoiree = x => [cleTitre(x.spectacle), normaliser(x.lieu), x.jour, normaliser(x.heure)].join('|');
    function fusionner(ecrites) {
        ecrites.forEach(x => { const i = lignes.findIndex(y => y.id === x.id); if (i === -1) lignes.push(x); else lignes[i] = x; });
        lignes.sort((a, b) => a.jour.localeCompare(b.jour) || cleHeure(a.heure) - cleHeure(b.heure) || a.id - b.id);
    }

    async function enregistrer() {
        if (enregistrementEnCours) return;
        effacerMessage();
        ['f-lieu', 'f-ville', 'f-jour', 'f-url', 'f-heure', 'f-spectacle-autre'].forEach(id => $(id).removeAttribute('aria-invalid'));
        // Le formulaire est en `novalidate` — les bulles du navigateur ne
        // parlent pas la langue du site — c'est donc ici que tout se vérifie.
        const spectacle = titreSaisi();
        if (!spectacle) return erreurChamp('Choisis un spectacle, ou saisis son titre.', modeAutre ? 'f-spectacle-autre' : null);
        if (!$('f-jour').value) return erreurChamp('Indique le jour de la représentation.', 'f-jour');
        if (!$('f-lieu').value.trim()) return erreurChamp('Indique le lieu, tel qu\'il doit s\'afficher.', 'f-lieu');
        if (!$('f-ville').value.trim()) return erreurChamp('Indique la ville : c\'est elle qui sert au filtre « Ville » du site.', 'f-ville');
        // LE LIEN DE RÉSERVATION DOIT ÊTRE UNE PAGE WEB. Collé sans
        // « https:// », il devenait un lien relatif : le spectateur qui
        // cliquait « Réserver » arrivait sur la page 404 du site. Le « www. »
        // est complété d'office ; tout le reste est refusé, avec la raison.
        const urlSaisie = $('f-url').value.trim();
        const urlPropre = L.lienSur(urlSaisie);
        if (urlSaisie && !urlPropre) return erreurChamp('Le lien de réservation doit être une adresse web complète, commençant par https://', 'f-url');
        // Une heure à moitié saisie au clavier (ordinateur) laisse le champ
        // vide mais « invalide » : on le dit plutôt que d'enregistrer sans heure.
        if ($('f-heure').validity.badInput) return erreurChamp('L\'heure est incomplète : choisis l\'heure et les minutes, ou « Sans heure ».', 'f-heure');
        if (!sb) { afficherMessage('La connexion à la base n\'est pas encore prête : réessaie dans un instant.', { gestes: [{ libelle: 'Réessayer', fn: enregistrer }] }); return; }

        const base = {
            spectacle,
            lieu: L.typographie($('f-lieu').value),
            ville: L.typographie($('f-ville').value),
            jour: $('f-jour').value,
            heure: heureChoisie(),
            reservation_url: urlPropre,
            scolaire: $('f-scolaire').checked
        };
        const id = $('f-id').value ? Number($('f-id').value) : null;
        const aEcrire = id ? [base] : [base].concat(joursEnPlus.map(j => Object.assign({}, base, { jour: j.jour, heure: j.heure || base.heure })));

        // L'ENVOI PRÉCÉDENT S'EST PERDU EN ROUTE (réseau, délai) : il est
        // peut-être passé. On relit la table avant de renvoyer, pour le
        // reconnaître au lieu de le doubler.
        const reprise = derniereErreur === 'reseau' || derniereErreur === 'delai';
        if (reprise) await charger();
        if (!fiche.open) return;

        // Les doublons, avant d'envoyer : dans la saisie, puis dans la table.
        const vus = new Set();
        for (const x of aEcrire) {
            if (vus.has(cleSoiree(x))) return erreurChamp(`Le ${jourLisible(x.jour)} figure deux fois dans la série.`, 'f-jour');
            vus.add(cleSoiree(x));
        }
        const deja = aEcrire.filter(x => lignes.some(y => y.id !== id && !suppressions.has(y.id) && cleSoiree(y) === cleSoiree(x)));
        if (deja.length) {
            if (reprise && !id && deja.length === aEcrire.length) {
                derniereErreur = null;
                return reussite(lignes.filter(y => vus.has(cleSoiree(y))), 'Déjà enregistrée · en ligne sur le site');
            }
            const x = deja[0];
            return erreurChamp(`Le ${jourLisible(x.jour)}${x.heure ? ' à ' + x.heure : ''} existe déjà pour ce spectacle à ce lieu.`, 'f-jour');
        }

        enregistrementEnCours = true;
        majBoutonEnregistrer();
        let rep;
        try {
            if (id) {
                let req = sb.from(L.TABLE).update(base).eq('id', id);
                // N'ÉCRIRE QUE SUR CE QU'ON A LU. Si la soirée a changé
                // entre-temps — un autre appareil, ou Claude, qui écrit aussi
                // dans la table —, modifie_le a changé avec elle : la base
                // n'écrit rien, et on le dit (voir conflit()).
                if (ligneOuverte && ligneOuverte.modifie_le) req = req.eq('modifie_le', ligneOuverte.modifie_le);
                rep = await req.select();
            } else {
                rep = await sb.from(L.TABLE).insert(aEcrire).select();
            }
        } catch (e) { rep = { error: e }; }
        enregistrementEnCours = false;
        majBoutonEnregistrer();
        if (!fiche.open) return;

        if (rep.error) {
            const r = expliquer(rep.error, 'enregistrement', rep.status);
            if (r.type === 'doublon' && reprise) {
                // Le premier envoi était passé : sa réponse s'était perdue.
                derniereErreur = null;
                await charger();
                return reussite(lignes.filter(y => vus.has(cleSoiree(y))), 'Déjà enregistrée · en ligne sur le site');
            }
            derniereErreur = r.type;
            const gestes = ['reseau', 'delai', 'serveur', 'autre'].includes(r.type) ? [{ libelle: 'Réessayer', fn: enregistrer }] : [];
            afficherMessage(r.texte, { erreur: true, gestes });
            return;
        }
        if (id && (!rep.data || !rep.data.length)) return conflit(base, id);
        derniereErreur = null;
        const n = aEcrire.length;
        reussite(rep.data || [], id ? 'Modifiée · le site est à jour' : n > 1 ? `${n} soirées ajoutées · en ligne sur le site` : 'Ajoutée · en ligne sur le site');
    }

    // LA BASE REND LES LIGNES ÉCRITES : la liste se met à jour sans relire,
    // défile jusqu'à elles et les éclaire ; le message mène au site.
    function reussite(ecrites, texte) {
        fusionner(ecrites);
        memoriserListe();
        fermerFiche(true);
        rendre();
        surligner(ecrites.map(x => x.id));
        toast(texte, { gestes: [{ libelle: 'Voir sur le site', lien: '../#page_dates' }] });
    }

    // La modification n'a rien écrit : la soirée a changé (ou disparu)
    // depuis qu'on l'a lue. On relit, on montre, on laisse choisir.
    async function conflit(voulue, id) {
        let rep;
        try { rep = await sb.from(L.TABLE).select('*').eq('id', id).maybeSingle(); } catch (e) { rep = { error: e }; }
        if (!fiche.open) return;
        if (rep.error) {
            const r = expliquer(rep.error, 'lecture', rep.status);
            afficherMessage(`La modification n'a pas été enregistrée, et la soirée n'a pas pu être relue. ${r.texte}`, { erreur: true, gestes: [{ libelle: 'Réessayer', fn: enregistrer }] });
            return;
        }
        const actuelle = rep.data;
        if (!actuelle) {
            lignes = lignes.filter(x => x.id !== id);
            memoriserListe();
            rendre();
            afficherMessage('Cette soirée a été supprimée entre-temps (depuis un autre appareil). Rien n\'a été enregistré.', {
                erreur: true,
                gestes: [{ libelle: 'La recréer', fn: () => { ficheMode = 'nouvelle'; ligneOuverte = null; $('f-id').value = ''; enregistrer(); } }]
            });
            return;
        }
        fusionner([actuelle]);
        memoriserListe();
        rendre();
        if (memeContenu(actuelle, voulue)) { reussite([actuelle], 'Déjà à jour · en ligne sur le site'); return; }
        afficherMessage(`Cette soirée a été modifiée ailleurs entre-temps${actuelle.modifie_le ? ` (à ${quand(Date.parse(actuelle.modifie_le))})` : ''} : rien n'a été enregistré.`, {
            erreur: true,
            gestes: [
                { libelle: 'Voir la version en ligne', fn: () => { fermerFiche(true); ouvrirFiche(actuelle, 'modifier'); } },
                { libelle: 'Écraser avec la mienne', fn: () => { ligneOuverte = actuelle; enregistrer(); } }
            ]
        });
    }

    // ══════════════════════════════════════════════════════════════
    //  LE MOT DE PASSE (session ouverte)
    // ══════════════════════════════════════════════════════════════
    const ficheMdp = $('fiche-mdp');
    function erreurMdp(t) { $('msg-mdp-texte').textContent = t; $('msg-mdp').classList.add('est-erreur'); $('msg-mdp').hidden = false; }
    function ouvrirMdp() {
        $('mdp-nouveau').value = '';
        $('mdp-confirme').value = '';
        $('msg-mdp').hidden = true;
        masquerMotsDePasse(ficheMdp);
        if (sessionCourante) $('mdp-mail').value = sessionCourante;
        if (!ficheMdp.open) ficheMdp.showModal();
        majOuverture();
        setTimeout(() => $('mdp-nouveau').focus(), 50);
    }
    function fermerMdp() { if (ficheMdp.open) ficheMdp.close(); }
    $('btn-mdp').addEventListener('click', ouvrirMdp);
    $('btn-annuler-mdp').addEventListener('click', fermerMdp);
    $('btn-fermer-mdp').addEventListener('click', fermerMdp);
    ficheMdp.addEventListener('click', e => { if (e.target === ficheMdp) fermerMdp(); });
    ficheMdp.addEventListener('close', majOuverture);
    $('form-mdp').addEventListener('submit', async e => {
        e.preventDefault();
        masquerMotsDePasse(ficheMdp);
        const a = $('mdp-nouveau').value, b = $('mdp-confirme').value;
        if (a.length < 8) { erreurMdp('Huit caractères au moins.'); return; }
        if (a !== b) { erreurMdp('Les deux saisies ne sont pas identiques.'); return; }
        if (!sb) { erreurMdp('La connexion n\'est pas encore prête : réessaie dans un instant.'); return; }
        $('btn-enregistrer-mdp').disabled = true;
        let error = null;
        try { ({ error } = await sb.auth.updateUser({ password: a })); } catch (err) { error = err; }
        $('btn-enregistrer-mdp').disabled = false;
        if (error) {
            const m = error.message || '';
            erreurMdp(/different|same/i.test(m) ? 'C\'est déjà ton mot de passe actuel.'
                : /weak|least|short/i.test(m) ? 'Mot de passe trop faible : huit caractères au moins, et pas un mot de passe courant.'
                    : 'Impossible d\'enregistrer : ' + expliquer(error, 'connexion', error.status).texte);
            return;
        }
        fermerMdp();
        toast('Mot de passe enregistré');
    });

    // ══════════════════════════════════════════════════════════════
    //  L'ÉCRAN, LE CLAVIER, LE RETOUR SUR LA PAGE
    // ══════════════════════════════════════════════════════════════

    // Une fiche ouverte fige la page derrière elle (voir admin.css).
    function majOuverture() { document.documentElement.classList.toggle('adm-fiche-ouverte', fiche.open || ficheMdp.open); }

    /**
     * LA FICHE SUIT LE CLAVIER. Sur l'iPhone (et sur Android sans
     * interactive-widget), le clavier recouvre le bas de la page sans la
     * raccourcir : « Enregistrer », collé au bas de la fiche, passait
     * dessous. visualViewport donne la partie que le clavier laisse libre ;
     * la fiche s'y cale (--vv-h, --vv-top, lus par admin.css). Pas pendant
     * un zoom à deux doigts : la fiche suivrait le zoom.
     */
    const vv = window.visualViewport;
    function caler() {
        const r = document.documentElement.style;
        if (!vv || Math.abs(vv.scale - 1) > 0.01) { r.removeProperty('--vv-h'); r.removeProperty('--vv-top'); return; }
        r.setProperty('--vv-h', `${Math.round(vv.height)}px`);
        r.setProperty('--vv-top', `${Math.round(vv.offsetTop)}px`);
    }
    if (vv) { vv.addEventListener('resize', caler); vv.addEventListener('scroll', caler); }
    caler();

    // Le bouton flottant n'apparaît que quand le bouton doré du haut est
    // sorti de l'écran — et seulement sur téléphone (voir admin.css).
    let ajouterVisible = true;
    function majFlottant() { $('btn-ajouter-flottant').hidden = ajouterVisible || $('etat-edition').hidden; }
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { ajouterVisible = e.isIntersecting; majFlottant(); }).observe($('btn-ajouter'));
    }

    // LA LISTE SE RELIT AU RETOUR SUR LA PAGE : un autre appareil, ou
    // Claude, peut avoir écrit dans la table entre-temps. Et la page qui se
    // cache envoie tout de suite une suppression encore annulable.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            let partie = false;
            suppressions.forEach((s, id) => { if (s.minuteur) { envoyerSuppression(id); partie = true; } });
            if (partie) masquerToast();
            return;
        }
        if (peutLire() && Date.now() - derniereLecture > 20000) charger();
        else if (peutLire()) relancerSuppressions();
    });
    window.addEventListener('pageshow', e => { if (e.persisted && peutLire()) charger(); });
    // LE RÉSEAU REVIENT : la session se rafraîchit si elle l'attendait, la
    // liste se relit, et la fiche restée en échec « pas de réseau » repart.
    window.addEventListener('online', () => {
        if (!sb) return;
        if (!APERCU && sessionCourante === null && aUneSession()) {
            sb.auth.getSession().then(r => appliquerSession(r.data.session)).catch(() => { });
            return;
        }
        if (!peutLire()) return;
        charger();
        if (fiche.open && derniereErreur === 'reseau' && !enregistrementEnCours) {
            afficherMessage('Le réseau est revenu : nouvel essai…', { erreur: false });
            enregistrer();
        }
    });

    // ══════════════════════════════════════════════════════════════
    //  LE DÉMARRAGE
    // ══════════════════════════════════════════════════════════════
    function demarrer() {
        // Les suppressions demandées et pas encore confirmées par la base.
        (memoire.lire(CLES.suppressions) || []).forEach(l => {
            if (l && l.id) suppressions.set(l.id, { ligne: l, minuteur: 0, envoi: null, reprise: true });
        });
        const memoUnivers = memoire.lire(CLES.univers);
        if (memoUnivers && Array.isArray(memoUnivers.liste)) univers = universDepuisMemoire(memoUnivers.liste);

        // LA DERNIÈRE LISTE CONNUE, TOUT DE SUITE, sans attendre ni la
        // bibliothèque ni le réseau — en lecture seule, le temps de la
        // relire. Seulement si une session est gardée (ou en aperçu) : la
        // page ne montre pas la liste à qui n'est pas connecté.
        if (APERCU || aUneSession()) {
            const cache = memoire.lire(CLES.liste);
            montrer('etat-edition');
            if (cache && Array.isArray(cache.lignes)) {
                lignes = cache.lignes;
                derniereLecture = cache.t || 0;
                passerEnLectureSeule(true);
                try { rendre(); } catch (e) { afficherAttente(); }
            } else afficherAttente();
            majSynchro('lecture');
        }

        setTimeout(() => {
            if (!pret) bandeau('Le chargement prend du temps (réseau faible ?). Tu peux attendre encore, ou recharger la page.');
        }, DELAI_LENT);

        attendreBibliotheque().then(initialiser, () => {
            pret = true;
            bandeau('La bibliothèque de connexion n\'a pas pu être chargée : vérifie le réseau, puis recharge la page.');
            $('etat-chargement').querySelector('.adm-attente-texte').textContent = 'Connexion impossible pour l\'instant.';
            if (!$('etat-edition').hidden) majSynchro('echec', { type: 'reseau' });
        });
    }

    demarrer();
})();
