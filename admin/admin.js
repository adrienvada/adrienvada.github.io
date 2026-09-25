/**
 * ADMINISTRATION DES DATES — logique de /admin/
 * ------------------------------------------------------------------
 *  Cette page écrit dans la table Supabase `representations`, celle que
 *  l'accueil lit en direct (dates-live.js). Elle en reprend l'allure :
 *  les soirées sont affichées comme dans l'onglet Dates (intercalaire
 *  par mois et sa frise, feuille d'éphéméride sur la photo du spectacle,
 *  une puce par séance, même vocabulaire). Ici, toucher une puce ouvre la
 *  fiche de sa séance ; le « + » en fin de rangée ajoute une soirée à la
 *  suite ; dupliquer et supprimer sont dans la fiche.
 *
 *  LE CHOIX DU SPECTACLE. La liste proposée vient du CV lui-même
 *  (index.html) : les spectacles marqués « En tournée » ou « En
 *  création » arrivent en tête, puis ceux qui ont déjà des dates dans
 *  la table, puis « Autre… » pour saisir un titre à la main. Le titre
 *  doit être celui du CV au caractère près — c'est ce qui relie une
 *  date à sa ligne du CV et à sa page spectacle — d'où les puces : on
 *  ne retape pas un titre qui existe déjà.
 *
 *  SANS MOT DE PASSE. Connexion par lien reçu par mail ; la session
 *  reste ouverte sur l'appareil. Seule l'adresse adrien.vada@gmail.com
 *  a le droit d'écrire : c'est une règle de la base
 *  (supabase/schema.sql), pas de cette page.
 * ------------------------------------------------------------------
 */
(function () {
    'use strict';

    const L = window.DatesLive;
    const COMPTE_AUTORISE = 'adrien.vada@gmail.com';
    const sb = window.supabase.createClient(L.SUPABASE_URL, L.SUPABASE_CLE);

    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const NB = ' ';

    let lignes = [];            // les lignes de la table, telles quelles
    let spectaclesCV = [];      // [{ titre, statut, url }] relevés dans le CV
    let passeesOuvertes = false;
    let spectacleChoisi = '';   // valeur courante de la puce sélectionnée

    const isoLocal = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const aujourdhui = isoLocal(new Date());
    const lendemain = iso => { const [a, m, j] = iso.split('-').map(Number); return isoLocal(new Date(a, m - 1, j + 1)); };
    const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    const jourSemaine = iso => { const [a, m, j] = iso.split('-').map(Number); return JOURS[new Date(a, m - 1, j).getDay()]; };

    // Clé de rapprochement entre un titre du CV et un titre de la table :
    // apostrophes et espaces normalisés, accents ignorés, casse ignorée.
    const cleTitre = s => L.typographie(s).replace(/['’]/g, "'").normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    // ── État de la page ────────────────────────────────────────────
    const ETATS = ['etat-chargement', 'etat-connexion', 'etat-refus', 'etat-edition'];
    function montrer(id) { ETATS.forEach(e => { $(e).hidden = e !== id; }); }

    let toastMinuteur = 0;
    function toast(texte, erreur) {
        const el = $('toast');
        el.innerHTML = (erreur ? '' : '<svg class="ico" aria-hidden="true"><use href="#i-adm-check"></use></svg>') + esc(texte);
        el.classList.toggle('erreur', !!erreur);
        el.classList.add('visible');
        clearTimeout(toastMinuteur);
        toastMinuteur = setTimeout(() => el.classList.remove('visible'), erreur ? 6000 : 2800);
    }

    // ── Session ────────────────────────────────────────────────────
    async function demarrer() {
        // Mode aperçu, hors production seulement (machine de développement,
        // aperçus de branche Cloudflare) : la page s'affiche comme connectée
        // pour juger de sa mise en page, sans session. Toute écriture est
        // refusée par la base (règles d'accès) — on ne peut rien y casser.
        if (/^(localhost|127\.0\.0\.1|.*\.workers\.dev)$/.test(location.hostname) && new URLSearchParams(location.search).has('apercu')) {
            montrer('etat-edition'); chargerTout(); return;
        }
        const { data: { session } } = await sb.auth.getSession();
        appliquerSession(session);
        sb.auth.onAuthStateChange((_evt, s) => appliquerSession(s));
    }
    // `undefined` tant qu'aucune session n'a été examinée, puis l'adresse
    // connectée ou `null` : on ne redessine que si l'état change vraiment.
    let sessionCourante;
    function appliquerSession(session) {
        const mail = (session && session.user && session.user.email) || null;
        if (mail === sessionCourante) return;
        sessionCourante = mail;
        $('compte').hidden = !mail;
        $('compte-mail').textContent = mail || '';
        if (!mail) { montrer('etat-connexion'); return; }
        if (mail.toLowerCase() !== COMPTE_AUTORISE) { montrer('etat-refus'); return; }
        montrer('etat-edition');
        chargerTout();
    }

    function direConnexion(texte, ton) {
        const msg = $('msg-connexion');
        msg.hidden = !texte;
        msg.className = 'text-xs mt-3 ' + (ton === 'erreur' ? 'adm-erreur' : ton === 'ok' ? 'text-luxury-goldInk' : 'text-luxury-textMuted');
        msg.textContent = texte || '';
    }

    // Par mot de passe : le chemin normal, sans mail.
    $('form-connexion').addEventListener('submit', async e => {
        e.preventDefault();
        const email = $('mail').value.trim(), password = $('mdp').value;
        if (!password) { direConnexion('Saisis ton mot de passe, ou demande un lien par mail.', 'erreur'); $('mdp').focus(); return; }
        $('btn-entrer').disabled = true;
        direConnexion('Connexion…');
        const { error } = await sb.auth.signInWithPassword({ email, password });
        $('btn-entrer').disabled = false;
        if (error) {
            direConnexion(/invalid/i.test(error.message)
                ? 'Mot de passe refusé. Pas encore de mot de passe ? Entre par le lien mail, puis choisis-le dans « Mot de passe ».'
                : 'Connexion impossible : ' + error.message, 'erreur');
            return;
        }
        direConnexion('');
    });

    // Par lien mail : la première fois, ou en secours.
    $('btn-lien').addEventListener('click', async () => {
        const email = $('mail').value.trim();
        $('btn-lien').disabled = true;
        direConnexion('Envoi du lien…');
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
        $('btn-lien').disabled = false;
        if (error) {
            direConnexion(/rate|limit|seconds/i.test(error.message)
                ? 'Trop de demandes : le compte gratuit n\'envoie que quelques mails par heure. Réessaie dans quelques minutes, ou entre par mot de passe.'
                : 'Impossible d\'envoyer le lien : ' + error.message, 'erreur');
            return;
        }
        direConnexion('Lien envoyé à ' + email + '. Ouvre-le sur cet appareil : tu arriveras ici, connecté.', 'ok');
    });
    $('btn-sortir').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });

    // ── Définir ou changer le mot de passe (session ouverte) ───────
    const ficheMdp = $('fiche-mdp');
    function ouvrirMdp() {
        $('mdp-nouveau').value = ''; $('mdp-confirme').value = ''; $('msg-mdp').hidden = true;
        if (sessionCourante) $('mdp-mail').value = sessionCourante;
        if (!ficheMdp.open) ficheMdp.showModal();
        setTimeout(() => $('mdp-nouveau').focus(), 50);
    }
    function fermerMdp() { if (ficheMdp.open) ficheMdp.close(); }
    $('btn-mdp').addEventListener('click', ouvrirMdp);
    $('btn-annuler-mdp').addEventListener('click', fermerMdp);
    $('btn-fermer-mdp').addEventListener('click', fermerMdp);
    ficheMdp.addEventListener('click', e => { if (e.target === ficheMdp) fermerMdp(); });
    $('form-mdp').addEventListener('submit', async e => {
        e.preventDefault();
        const a = $('mdp-nouveau').value, b = $('mdp-confirme').value, msg = $('msg-mdp');
        const erreur = t => { msg.hidden = false; msg.textContent = t; };
        if (a.length < 8) { erreur('Huit caractères au moins.'); return; }
        if (a !== b) { erreur('Les deux saisies ne sont pas identiques.'); return; }
        $('btn-enregistrer-mdp').disabled = true;
        const { error } = await sb.auth.updateUser({ password: a });
        $('btn-enregistrer-mdp').disabled = false;
        if (error) { erreur('Impossible d\'enregistrer : ' + error.message); return; }
        fermerMdp();
        toast('Mot de passe enregistré');
    });

    // ── Lecture ────────────────────────────────────────────────────
    async function chargerTout() {
        // La liste s'affiche dès que la base répond ; les couleurs et les
        // photos des spectacles la rejoignent quand univers.js est lu.
        await Promise.all([charger(), chargerSpectaclesDuCV(), chargerUnivers().then(() => { if (lignes.length) rendre(); })]);
    }

    async function charger() {
        const { data, error } = await sb.from(L.TABLE).select('*').order('jour').order('heure');
        if (error) {
            // Une session périmée que Supabase ne parvient plus à rafraîchir
            // renvoie 401 : on repasse par la connexion plutôt que d'afficher
            // une liste vide sans explication.
            if (error.code === 'PGRST301' || /JWT|401/i.test(error.message)) {
                await sb.auth.signOut(); sessionCourante = undefined; appliquerSession(null);
                direConnexion('La session avait expiré : reconnecte-toi.', 'erreur');
                return;
            }
            $('liste-a-venir').innerHTML = `<p class="dl-vide adm-erreur">Lecture impossible : ${esc(error.message)}</p>`;
            toast('Lecture impossible : ' + error.message, true);
            return;
        }
        lignes = data || [];
        try { rendre(); }
        catch (e) {
            // Ne devrait pas arriver ; si ça arrive (fichier du site plus
            // ancien que celui-ci, juste après une publication), on le dit.
            $('liste-a-venir').innerHTML = `<p class="dl-vide adm-erreur">Affichage impossible (${esc(e.message)}). Recharge la page dans une minute.</p>`;
        }
    }

    /**
     * Les spectacles du CV, lus dans index.html : titre exact, badge
     * (« En tournée », « En création »…) et lien officiel. Une seule
     * source de vérité, la même que l'accueil ; mise en cache une heure
     * dans le navigateur pour ne pas recharger la page d'accueil à chaque
     * visite.
     */
    async function chargerSpectaclesDuCV() {
        const CLE = 'admin.spectaclesCV', DUREE = 3600 * 1000;
        try {
            const memo = JSON.parse(sessionStorage.getItem(CLE) || 'null');
            if (memo && Date.now() - memo.t < DUREE) { spectaclesCV = memo.liste; return; }
        } catch (e) { /* pas de cache : on lit */ }
        try {
            const html = await fetch('../index.html', { cache: 'force-cache' }).then(r => r.text());
            const doc = new DOMParser().parseFromString(html, 'text/html');
            spectaclesCV = [...doc.querySelectorAll('[data-cv-show]')].map(li => ({
                titre: L.typographie(li.dataset.cvShow),
                statut: (li.querySelector('.cv-badge')?.textContent || '').replace(/\s+/g, ' ').trim(),
                url: li.dataset.cvUrl || ''
            })).filter(s => s.titre);
            try { sessionStorage.setItem(CLE, JSON.stringify({ t: Date.now(), liste: spectaclesCV })); } catch (e) { }
        } catch (e) {
            spectaclesCV = []; // la liste se rabattra sur les titres déjà en base
        }
    }

    /**
     * LA COULEUR ET LA PHOTO DE CHAQUE SPECTACLE, lues dans univers.js —
     * là où l'onglet Dates les prend. On n'exécute pas univers.js (c'est
     * le moteur des univers, il lui faut l'accueil) : on en découpe la
     * seule déclaration SHOW_UNIVERSES, avec les deux mêmes repères que
     * build/generer-pages-spectacles.js. Si le fichier changeait de
     * structure, la liste resterait lisible, dans l'or du site.
     */
    let univers = [];   // [{ cles: Set, accent, surAccent, couverture }]
    async function chargerUnivers() {
        try {
            const src = await fetch('../univers.js', { cache: 'force-cache' }).then(r => r.text());
            const debut = src.indexOf('const SHOW_UNIVERSES = {');
            const fin = src.indexOf('\n(function () {', debut);
            if (debut === -1 || fin === -1) return;
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
        } catch (e) { univers = []; }
    }
    const universDe = titre => { const k = cleTitre(titre); return univers.find(u => u.cles.has(k)) || null; };
    // Une couverture de 240 px manque : la version de 640 px, qui existe toujours.
    document.addEventListener('error', e => {
        const img = e.target;
        if (img && img.tagName === 'IMG' && img.dataset && img.dataset.repli) { img.src = img.dataset.repli; delete img.dataset.repli; }
    }, true);

    // ── La liste, à l'image de l'onglet Dates ──────────────────────
    //  Mêmes intercalaires de mois et même frise dans la marge, même
    //  feuille d'éphéméride posée sur la photo du spectacle, même titre en
    //  Cinzel, même « Ville · salle ». Une différence, et c'est tout
    //  l'outil : chaque PUCE DE SÉANCE est un bouton qui ouvre sa fiche, et
    //  le « + » qui ferme la rangée (là où le site met l'agenda) ajoute une
    //  soirée à la suite.
    const DL_JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    const DL_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const DL_MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const DL_MOIS_BREFS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    const jourDe = iso => { const [a, m, j] = iso.split('-').map(Number); const d = new Date(a, m - 1, j); return { iso, t: d.getTime(), a, m: m - 1, j, js: d.getDay() }; };

    function feuille(e) {
        const d = e.jours[0], z = e.jours[e.jours.length - 1];
        const plusieurs = z.iso !== d.iso, deuxMois = plusieurs && (z.m !== d.m || z.a !== d.a);
        const c = e.u && e.u.couverture;
        const photo = c ? `<img src="${esc(c.src)}" data-repli="${esc(c.repli)}" alt="" width="48" height="56" loading="lazy" decoding="async"${c.pos ? ` style="object-position:${esc(c.pos)}"` : ''}>` : '';
        return `<span class="dl-feuille${plusieurs ? ' dl-feuille--2' : ''}${c ? ' dl-feuille--photo' : ' dl-feuille--sans-photo'}" aria-hidden="true">${photo}`
            + `<span class="dl-bande${deuxMois ? ' dl-bande--2' : ''}">${deuxMois ? `${DL_MOIS_BREFS[d.m]}–${DL_MOIS_BREFS[z.m]}` : DL_MOIS_COURTS[d.m]}</span>`
            + `<span class="dl-num">${plusieurs ? `${d.j}–${z.j}` : d.j}</span>`
            + `<span class="dl-jour">${plusieurs ? `${DL_JOURS_COURTS[d.js]}–${DL_JOURS_COURTS[z.js]}` : DL_JOURS_COURTS[d.js]}</span></span>`;
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
    function puceSeance(l, e) {
        const j = jourDe(l.jour);
        const longue = e.jours.length > 1 && e.jours[e.jours.length - 1].t - e.jours[0].t > 6.5 * 864e5;
        const jour = e.jours.length > 1 ? `<span class="dl-s-jour">${DL_JOURS_COURTS[j.js]}${longue ? ` ${j.j}` : ''}</span> ` : '';
        const heure = l.heure ? `<span class="dl-s-heure">${esc(l.heure)}</span>` : '<span class="dl-s-heure dl-s-heure--flou">horaire à confirmer</span>';
        const etat = l.scolaire ? `${l.heure ? heure + ' ' : ''}<i>scolaire</i>`
            : L.lienSur(l.reservation_url) ? heure
                : `${l.heure ? heure + ' · ' : ''}<i>billetterie à venir</i>`;
        const muette = l.scolaire || !L.lienSur(l.reservation_url);
        const nom = `${l.spectacle}, ${DL_JOURS_COURTS[j.js]} ${L.jourCourt(l.jour)}${l.heure ? ' à ' + l.heure : ''}`;
        return `<li><button type="button" class="dl-puce adm-seance${muette ? ' dl-puce--muette' : ''}" data-action="modifier" data-id="${l.id}" aria-label="Modifier : ${esc(nom)}">`
            + `${jour}${etat}<svg class="ico" aria-hidden="true"><use href="#i-adm-pen"></use></svg></button></li>`;
    }

    function ligneHtml(e, passee) {
        const d = e.soirees[e.soirees.length - 1];
        const style = e.u && e.u.accent ? ` style="--dl-a:${esc(e.u.accent)};--dl-sa:${esc(e.u.surAccent || '#ffffff')}"` : '';
        return `<article class="dl${passee ? ' adm-passee' : ''}"${style}>` + feuille(e)
            + `<div class="dl-corps"><h5 class="dl-titre">${esc(e.titre)}</h5><p class="dl-lieu">${lieuHtml(e.soirees[0])}</p>`
            + `<ul class="dl-seances" role="list">${e.soirees.map(l => puceSeance(l, e)).join('')}`
            + `<li class="dl-seances-agenda"><button type="button" class="adm-plus" data-action="dupliquer" data-id="${d.id}" aria-label="Ajouter une soirée à la suite : ${esc(e.titre)}"><svg class="ico" aria-hidden="true"><use href="#i-adm-plus"></use></svg></button></li>`
            + `</ul></div></article>`;
    }

    // Les entrées de l'onglet Dates (dates-live.js les calcule : une date
    // seule, ou une série au même lieu), rangées sous leur mois.
    function rendreBloc(sousEnsemble, passee) {
        if (!sousEnsemble.length) return '';
        const parId = new Map(sousEnsemble.map(l => [l.id, l]));
        const brutes = L.versShowData(sousEnsemble);
        if (!brutes.every(e => e.type === 'series' ? e.shows.every(s => parId.has(s.id)) : parId.has(e.id))) {
            throw new Error('dates-live.js est plus ancien que cette page');
        }
        const entrees = brutes.map(e => {
            const soirees = (e.type === 'series' ? e.shows.map(s => parId.get(s.id)) : [parId.get(e.id)])
                .sort((x, y) => (x.jour + x.heure).localeCompare(y.jour + y.heure));
            const jours = [...new Set(soirees.map(l => l.jour))].sort().map(jourDe);
            return { titre: soirees[0].spectacle, soirees, jours, u: universDe(soirees[0].spectacle) };
        }).sort((x, y) => x.jours[0].t - y.jours[0].t);
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
            + g.entrees.map(e => ligneHtml(e, passee)).join('') + '</section>').join('');
    }

    function rendre() {
        const aVenir = lignes.filter(l => l.jour >= aujourdhui);
        const passees = lignes.filter(l => l.jour < aujourdhui).reverse();

        $('compteur').textContent = aVenir.length === 0 ? 'Aucune date à venir'
            : `${aVenir.length} représentation${aVenir.length > 1 ? 's' : ''} à venir`;
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

    // ── Les gestes : une puce modifie sa séance, le « + » en ajoute une ──
    document.addEventListener('click', async e => {
        const btn = e.target.closest('button[data-action][data-id]');
        if (!btn) return;
        const l = lignes.find(x => x.id === Number(btn.dataset.id));
        if (!l) return;
        if (btn.dataset.action === 'modifier') ouvrirFiche(l, 'modifier');
        if (btn.dataset.action === 'dupliquer') ouvrirFiche(Object.assign({}, l, { id: null, jour: lendemain(l.jour) }), 'copie');
    });

    async function supprimer(l) {
        if (!confirm(`Supprimer « ${l.spectacle} », ${L.jourCourt(l.jour)} à ${l.ville} ?\n\nLa date disparaîtra du site immédiatement.`)) return;
        const { error } = await sb.from(L.TABLE).delete().eq('id', l.id);
        if (error) { toast('Suppression impossible : ' + error.message, true); return; }
        toast('Date supprimée · le site est à jour');
        charger();
    }

    // ── La fiche (ajout, copie, modification) ──────────────────────
    const fiche = $('fiche');

    /**
     * Les puces de spectacle : CV d'abord (tournée et création en tête,
     * avec leur badge), puis les titres déjà en base qui ne sont pas au
     * CV, puis « Autre… ». Quand le CV et la base épellent différemment
     * le même titre, c'est l'orthographe de la base qui gagne : c'est
     * elle que les dates existantes portent déjà.
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

    function rendrePuces(valeur) {
        const liste = listeSpectacles();
        const connu = liste.some(s => s.titre === valeur);
        const autre = !!valeur && !connu;
        spectacleChoisi = valeur;
        const puce = (texte, pressed, statut, data) =>
            `<button type="button" class="filter-chip text-[12px] px-2.5 py-1.5 rounded-full border border-stone-200 bg-stone-100 text-luxury-textMuted hover:border-luxury-gold transition inline-flex items-center gap-1.5" aria-pressed="${pressed}" ${data}>${esc(texte)}${statut ? `<span class="text-[8px] uppercase tracking-widest opacity-70 font-mono">${esc(statut)}</span>` : ''}</button>`;
        $('puces-spectacles').innerHTML =
            liste.map(s => puce(s.titre, s.titre === valeur, s.statut, `data-spectacle="${esc(s.titre)}"`)).join('')
            + puce('Autre…', autre, '', 'data-spectacle-autre');
        $('f-spectacle-autre').hidden = !autre;
        $('f-spectacle-autre').required = autre;
        $('f-spectacle-autre').value = autre ? valeur : '';
    }

    $('puces-spectacles').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.hasAttribute('data-spectacle-autre')) {
            spectacleChoisi = '';
            $('puces-spectacles').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
            b.setAttribute('aria-pressed', 'true');
            $('f-spectacle-autre').hidden = false;
            $('f-spectacle-autre').required = true;
            $('f-spectacle-autre').focus();
            return;
        }
        rendrePuces(b.dataset.spectacle);
        rendrePucesLieux();
        // Le clavier ne s'ouvre que s'il n'y a pas de lieu à toucher.
        if ($('puces-lieux').hidden) $('f-lieu').focus();
    });

    function rendreListesLieux() {
        const lieux = [...new Set(lignes.map(l => l.lieu))].sort((a, b) => a.localeCompare(b, 'fr'));
        const villes = [...new Set(lignes.map(l => l.ville))].sort((a, b) => a.localeCompare(b, 'fr'));
        $('l-lieux').innerHTML = lieux.map(v => `<option value="${esc(v)}">`).join('');
        $('l-villes').innerHTML = villes.map(v => `<option value="${esc(v)}">`).join('');
    }
    // Un lieu déjà connu remplit la ville tout seul.
    $('f-lieu').addEventListener('change', () => {
        const l = lignes.find(x => x.lieu === $('f-lieu').value.trim());
        if (l && !$('f-ville').value.trim()) $('f-ville').value = l.ville;
        rendrePucesLieux();
    });

    /**
     * LES LIEUX DÉJÀ JOUÉS PAR CE SPECTACLE, EN PUCES. Sur téléphone, la
     * liste <datalist> est à peine visible (Safari la range au-dessus du
     * clavier, une suggestion à la fois) ; ici, un toucher remplit le lieu
     * ET la ville. Les plus récents d'abord, trois au plus.
     */
    function rendrePucesLieux() {
        const titre = cleTitre(spectacleChoisi || $('f-spectacle-autre').value || '');
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
    $('f-spectacle-autre').addEventListener('input', rendrePucesLieux);
    $('puces-lieux').addEventListener('click', e => {
        const b = e.target.closest('button[data-lieu]');
        if (!b) return;
        $('f-lieu').value = b.dataset.lieu;
        $('f-ville').value = b.dataset.ville;
        ['f-lieu', 'f-ville'].forEach(id => $(id).removeAttribute('aria-invalid'));
        rendrePucesLieux();
    });

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
     * plus (19h00, 20h00, matin…), plus « Sans heure ». Un toucher, sans
     * même ouvrir le cadran.
     */
    function rendrePucesHeures() {
        const compte = new Map();
        lignes.forEach(l => { if (l.heure) compte.set(l.heure, (compte.get(l.heure) || 0) + 1); });
        const heures = [...compte].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([h]) => h)
            .sort((a, b) => (/^\d/.test(a) ? a.padStart(5, '0') : 'z' + a).localeCompare(/^\d/.test(b) ? b.padStart(5, '0') : 'z' + b));
        const courant = heureChoisie();
        $('puces-heures').innerHTML = heures.map(h =>
            `<button type="button" class="adm-puce-rapide" data-heure="${esc(h)}" aria-pressed="${h === courant}">${esc(h)}</button>`).join('')
            + (heures.length ? `<button type="button" class="adm-puce-rapide" data-heure="" aria-pressed="${!courant}">Sans heure</button>` : '');
    }
    $('puces-heures').addEventListener('click', e => {
        const b = e.target.closest('button[data-heure]');
        if (b) poserHeure(b.dataset.heure);
    });
    $('f-heure').addEventListener('input', () => { heureMot = ''; rendrePucesHeures(); });

    // Ce que la fiche contenait à l'ouverture : on ne ferme pas sans
    // prévenir une fiche remplie à moitié (un toucher à côté, sur
    // téléphone, suffisait à tout perdre).
    let ficheInitiale = '';
    const etatFiche = () => JSON.stringify([spectacleChoisi, $('f-spectacle-autre').value, ...['f-lieu', 'f-ville', 'f-jour', 'f-url'].map(id => $(id).value), heureChoisie(), $('f-scolaire').checked]);
    let ligneOuverte = null;    // la soirée en cours de modification

    function ouvrirFiche(l, mode) {
        ligneOuverte = mode === 'modifier' ? l : null;
        rendreListesLieux();
        rendrePuces(l.spectacle || '');
        $('f-id').value = l.id || '';
        $('f-lieu').value = l.lieu || '';
        $('f-ville').value = l.ville || '';
        $('f-jour').value = l.jour || '';
        poserHeure(l.heure || '');
        $('f-url').value = l.reservation_url || '';
        $('f-scolaire').checked = !!l.scolaire;
        $('fiche-titre').textContent = mode === 'modifier' ? 'Modifier la soirée' : mode === 'copie' ? 'Nouvelle soirée, copiée' : 'Nouvelle soirée';
        $('fiche-sous-titre').textContent = mode === 'copie'
            ? 'Même spectacle, même lieu, le lendemain. Change ce qui doit l\'être.'
            : mode === 'modifier' ? 'La modification est en ligne dès l\'enregistrement.' : 'Elle sera en ligne dès l\'enregistrement.';
        $('gestes-fiche').hidden = mode !== 'modifier';
        ['f-lieu', 'f-ville', 'f-jour', 'f-url', 'f-heure'].forEach(id => $(id).removeAttribute('aria-invalid'));
        rendrePucesLieux();
        rendrePucesHeures();
        $('msg-fiche').hidden = true;
        ficheInitiale = etatFiche();
        if (!fiche.open) fiche.showModal();
        fiche.querySelector('.adm-fiche-corps').scrollTop = 0;
        // Sur téléphone, pas de focus automatique dans un champ : il
        // ouvrirait le clavier (ou le calendrier) par-dessus la fiche
        // avant qu'on l'ait lue. Sur ordinateur, on garde le raccourci.
        const tactile = window.matchMedia('(pointer: coarse)').matches;
        setTimeout(() => (l.spectacle && !tactile ? $('f-jour') : $('puces-spectacles').querySelector('button'))?.focus({ preventScroll: true }), 50);
    }
    function fermerFiche(force) {
        if (!fiche.open) return true;
        if (force !== true && etatFiche() !== ficheInitiale && !confirm('Fermer sans enregistrer ? Les changements seront perdus.')) return false;
        fiche.close();
        return true;
    }

    const nouvelleDate = () => ouvrirFiche({}, 'nouvelle');
    $('btn-ajouter').addEventListener('click', nouvelleDate);
    $('btn-ajouter-flottant').addEventListener('click', nouvelleDate);
    $('btn-annuler').addEventListener('click', fermerFiche);
    $('btn-fermer-fiche').addEventListener('click', fermerFiche);
    fiche.addEventListener('click', e => { if (e.target === fiche) fermerFiche(); });
    // Échap, ou le geste « retour » d'Android, ferment la fiche : même garde.
    fiche.addEventListener('cancel', e => { e.preventDefault(); fermerFiche(); });
    $('btn-supprimer-fiche').addEventListener('click', () => {
        if (ligneOuverte && fermerFiche()) supprimer(ligneOuverte);
    });
    $('btn-dupliquer-fiche').addEventListener('click', () => {
        const l = ligneOuverte;
        if (l && fermerFiche()) ouvrirFiche(Object.assign({}, l, { id: null, jour: lendemain(l.jour) }), 'copie');
    });

    // Le bouton flottant n'apparaît que quand le bouton doré du haut est
    // sorti de l'écran — et seulement sur téléphone (voir admin.css).
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => {
            $('btn-ajouter-flottant').hidden = e.isIntersecting || $('etat-edition').hidden;
        }).observe($('btn-ajouter'));
    }

    $('form-date').addEventListener('submit', async e => {
        e.preventDefault();
        const id = $('f-id').value ? Number($('f-id').value) : null;
        const spectacle = L.typographie(spectacleChoisi || $('f-spectacle-autre').value);
        const msg = $('msg-fiche');
        // LE CHAMP EN FAUTE EST DÉSIGNÉ, PAS SEULEMENT NOMMÉ : aria-invalid le
        // signale aux lecteurs d'écran, le focus y est porté, et le message
        // (role="alert") est lu aussitôt. Le formulaire est en `novalidate` —
        // les bulles du navigateur ne parlent pas la langue du site — c'est
        // donc ici que tout se vérifie.
        ['f-lieu', 'f-ville', 'f-jour', 'f-url', 'f-heure'].forEach(id => $(id).removeAttribute('aria-invalid'));
        const erreur = (t, champ) => {
            msg.hidden = false; msg.textContent = t;
            if (champ) { $(champ).setAttribute('aria-invalid', 'true'); $(champ).focus(); }
        };
        if (!spectacle) { erreur('Choisis un spectacle, ou saisis son titre.'); return; }
        if (!$('f-jour').value) { erreur('Indique le jour de la représentation.', 'f-jour'); return; }
        if (!$('f-lieu').value.trim()) { erreur('Indique le lieu, tel qu\'il doit s\'afficher.', 'f-lieu'); return; }
        if (!$('f-ville').value.trim()) { erreur('Indique la ville : c\'est elle qui sert au filtre « Ville » du site.', 'f-ville'); return; }

        // LE LIEN DE RÉSERVATION DOIT ÊTRE UNE PAGE WEB. Collé sans
        // « https:// », il devenait un lien relatif : le spectateur qui
        // cliquait « Réserver » arrivait sur la page 404 du site. Le « www. »
        // est complété d'office ; tout le reste est refusé, avec la raison.
        const urlSaisie = $('f-url').value.trim();
        const urlPropre = L.lienSur(urlSaisie);
        if (urlSaisie && !urlPropre) {
            erreur('Le lien de réservation doit être une adresse web complète, commençant par https://', 'f-url');
            return;
        }

        // Une heure à moitié saisie au clavier (ordinateur) laisse le champ
        // vide mais « invalide » : on le dit plutôt que d'enregistrer sans heure.
        if ($('f-heure').validity.badInput) { erreur('L\'heure est incomplète : choisis l\'heure et les minutes, ou « Sans heure ».', 'f-heure'); return; }
        const heure = heureChoisie();

        const ligne = {
            spectacle,
            lieu: L.typographie($('f-lieu').value),
            ville: L.typographie($('f-ville').value),
            jour: $('f-jour').value,
            heure,
            reservation_url: urlPropre,
            scolaire: $('f-scolaire').checked
        };
        $('btn-enregistrer').disabled = true;
        const req = id ? sb.from(L.TABLE).update(ligne).eq('id', id) : sb.from(L.TABLE).insert(ligne);
        const { error } = await req;
        $('btn-enregistrer').disabled = false;
        if (error) {
            erreur(error.code === '23505'
                ? 'Cette soirée existe déjà : même spectacle, même lieu, même jour, même heure.'
                : /row-level security/i.test(error.message)
                    ? 'La base a refusé l\'écriture : es-tu bien connecté avec adrien.vada@gmail.com ?'
                    : 'Enregistrement impossible : ' + error.message);
            return;
        }
        fermerFiche(true);
        toast(id ? 'Modifiée · le site est à jour' : 'Ajoutée · en ligne sur le site');
        charger();
    });

    demarrer();
})();
