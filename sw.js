/**
 * ============================================================
 *  LE SERVICE WORKER — les polices et les images, et rien d'autre
 * ============================================================
 *  GitHub Pages sert TOUT avec `cache-control: max-age=600` : dix minutes,
 *  et pas une de plus, pour les polices comme pour le portrait. Au-delà,
 *  chaque revisite redemande chaque fichier au serveur (« a-t-il
 *  changé ? » — 26 fois « non », 304, sur l'accueil), et les polices
 *  attendent leur aller-retour avant le premier affichage. On ne règle pas
 *  ces en-têtes depuis le dépôt. Un service worker, si : il garde ce qui
 *  ne change presque jamais et le sert tout de suite, puis demande au
 *  serveur, en arrière-plan, s'il y a plus neuf pour la fois suivante
 *  (« stale-while-revalidate »). Revisite de l'accueil après expiration du
 *  cache, au téléphone en 4G lente (×4) : voir README-build.md, « Le
 *  service worker », pour la mesure.
 *
 *  PRUDENT PAR CONSTRUCTION. Un service worker persiste chez le visiteur,
 *  et un service worker trop zélé sert un site périmé sans que personne
 *  ne sache pourquoi. Celui-ci ne touche donc qu'à deux dossiers dont les
 *  fichiers ne changent pas de contenu sans changer de nom, ou presque :
 *    · /ressources/polices/ — les fichiers de polices (pas polices.css :
 *      rien qui se termine en .css ou .js n'est gardé) ;
 *    · /ressources/images/  — les photos et leurs variantes.
 *  JAMAIS les pages (HTML), les scripts, les feuilles, les dates (dates.js,
 *  dates-live.js, Supabase), /admin/, la mesure (Umami), ni rien d'un
 *  autre domaine : ces requêtes ne passent même pas par lui — le
 *  navigateur les envoie au réseau sans le réveiller (addRoutes, là où il
 *  existe ; ailleurs, le gestionnaire les laisse filer sans y toucher).
 *  Une image remplacée sous le même nom est servie ancienne UNE fois,
 *  puis la nouvelle la remplace : c'est le prix, et il est borné. Pour
 *  qu'elle paraisse dès la visite suivante, il faut lui donner un autre
 *  nom — rien, ici, ne peut le faire (voir VERSION plus bas).
 *
 *  POUR LE RETIRER (l'interrupteur) : passer RETIRE à true ci-dessous et
 *  publier. À sa visite suivante, chaque visiteur reçoit ce fichier-ci,
 *  qui vide ses caches et se désinscrit : le site redevient exactement
 *  celui d'avant. Puis retirer l'enregistrement des pages (voir
 *  README-build.md, « Le service worker ») — tant qu'il y reste, chaque
 *  visite réinscrit ce fichier, qui se désinscrit aussitôt : inoffensif,
 *  mais inutile.
 *
 *  POUR TOUT OUBLIER sans le retirer (un cache abîmé, une règle de garde
 *  changée) : augmenter VERSION. Le nouveau worker efface les caches des
 *  versions précédentes en s'activant. CE N'EST PAS le moyen de montrer
 *  plus tôt une image remplacée : la visite qui découvre le nouveau worker
 *  est encore servie par l'ancien, depuis son cache ; l'image paraît à la
 *  visite d'après, exactement comme sans rien toucher (rejoué : portrait
 *  remplacé, l'ancien à la 2e visite et le nouveau à la 3e, VERSION
 *  augmentée ou non).
 * ============================================================
 */
'use strict';

const RETIRE = false;
const VERSION = 1;
const CACHE = 'av-statique-v' + VERSION;

// Ce qu'on garde : deux dossiers du même domaine, et des fichiers qui ne
// sont ni du code ni du style.
const GARDE = /^\/ressources\/(polices|images)\/[^?#]*\.(woff2|webp|jpe?g|png|avif|gif|svg)$/i;

// Plafond : au-delà, les plus anciens partent. Un visiteur qui ouvre les
// onze univers en voit deux cents à peine ; le plafond n'est là que pour
// qu'un stockage ne grossisse jamais sans fin.
const MAX_ENTREES = 400;

// Les polices du premier écran, gardées dès l'installation : le navigateur
// vient de les télécharger pour la page qui l'inscrit, elles sont encore
// dans son cache, et c'est la première chose que la revisite attend. Ce
// sont celles que l'accueil précharge. PAS CAVEAT : elle n'est demandée
// qu'après le chargement, et seulement par l'accueil (la classe `plume`,
// voir index.html) ; l'installer d'office la faisait télécharger — 49 Ko
// — par la première page venue, fiche, galerie ou 404, qui ne l'emploie
// pas, et concourir avec sa propre demande sur l'accueil. Elle est gardée
// à son premier usage, comme les images.
const POLICES = ['inter-latin', 'montserrat-latin', 'cinzel-latin']
    .map((f) => `/ressources/polices/${f}.woff2`);

const gardable = (url) => url.origin === self.location.origin && GARDE.test(url.pathname);

self.addEventListener('install', (e) => {
    self.skipWaiting();
    if (RETIRE) return;
    e.waitUntil((async () => {
        // LE RÉSEAU, SANS RÉVEILLER LE WORKER, pour tout ce qui n'est pas
        // polices ou images (Chrome 123 et plus) : la page, ses scripts, les
        // dates, la mesure. Les règles se lisent dans l'ordre ; la dernière
        // attrape tout le reste. Un navigateur qui n'en comprend pas une
        // refuse l'ensemble : on se replie alors sur la seule navigation,
        // puis sur rien — le gestionnaire plus bas fait le même tri.
        if (e.addRoutes) {
            const nosDossiers = ['/ressources/polices/*.woff2', '/ressources/images/*']
                .map((pathname) => ({ condition: { urlPattern: new URLPattern({ pathname, baseURL: self.location.origin }), requestMethod: 'GET' }, source: 'fetch-event' }));
            try {
                await e.addRoutes(nosDossiers.concat({ condition: { urlPattern: new URLPattern({}) }, source: 'network' }));
            } catch (x) {
                try { await e.addRoutes({ condition: { requestMode: 'navigate' }, source: 'network' }); } catch (y) { /* sans routes */ }
            }
        }
        try {
            const cache = await caches.open(CACHE);
            await cache.addAll(POLICES);
        } catch (x) { /* hors ligne, ou une police absente : on gardera à l'usage */ }
    })());
});

self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
        // Les caches d'une version précédente — ou tous, si l'on se retire.
        for (const nom of await caches.keys()) {
            if (nom.startsWith('av-') && (RETIRE || nom !== CACHE)) await caches.delete(nom);
        }
        if (RETIRE) {
            await self.registration.unregister();
            return;
        }
        // Les pages déjà ouvertes passent par lui dès maintenant : les
        // images qu'elles demanderont encore (en défilant, en ouvrant un
        // univers) seront gardées.
        await self.clients.claim();
    })());
});

// Garder, puis tailler par le plus ancien si le plafond est dépassé.
async function ranger(cache, requete, reponse) {
    await cache.put(requete, reponse);
    const cles = await cache.keys();
    for (let i = 0; i < cles.length - MAX_ENTREES; i++) await cache.delete(cles[i]);
}

async function servir(e) {
    const cache = await caches.open(CACHE);
    const garde = await cache.match(e.request);
    const frais = fetch(e.request).then((reponse) => {
        // Seulement une réponse entière et lisible : ni erreur, ni morceau
        // (206), ni réponse opaque.
        if (reponse.status === 200 && reponse.type === 'basic') {
            e.waitUntil(ranger(cache, e.request, reponse.clone()).catch(() => { }));
        }
        return reponse;
    });
    if (garde) {
        // Servi tout de suite ; la question au serveur continue derrière.
        e.waitUntil(frais.catch(() => { }));
        return garde;
    }
    return frais;
}

self.addEventListener('fetch', (e) => {
    if (RETIRE) return;
    const req = e.request;
    if (req.method !== 'GET' || req.mode === 'navigate' || req.headers.has('range')) return;
    if (!gardable(new URL(req.url))) return;
    e.respondWith(servir(e));
});

// CE QUE LA PREMIÈRE PAGE A DÉJÀ CHARGÉ. Le worker s'inscrit après le
// chargement de la page : ses images sont passées avant lui. La page lui
// en envoie la liste (voir l'enregistrement, dans chaque page), et il les
// garde — le navigateur les a encore en cache : rien ne repart sur le
// réseau. Sans cela, la première revisite n'aurait rien trouvé.
self.addEventListener('message', (e) => {
    if (RETIRE || !e.data || e.data.type !== 'garder' || !Array.isArray(e.data.urls)) return;
    e.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        for (const u of e.data.urls.slice(0, 120)) {
            let url;
            try { url = new URL(u, self.location.origin); } catch (x) { continue; }
            if (!gardable(url) || await cache.match(url.href)) continue;
            try {
                const reponse = await fetch(url.href);
                if (reponse.status === 200 && reponse.type === 'basic') await ranger(cache, url.href, reponse);
            } catch (x) { /* tant pis : on gardera à l'usage */ }
        }
    })());
});
