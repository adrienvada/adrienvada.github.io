# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# adrienvada.fr — consignes pour Claude

Site d'Adrien Vada, comédien. Statique, servi par GitHub Pages depuis `main` :
**fusionner dans `main`, c'est publier.** La référence technique complète est
`README-build.md` ; ce fichier-ci ne couvre que les tâches courantes.

Adrien écrit souvent depuis son téléphone, en peu de mots. Réponds en français,
court, et termine par ce qui a changé sur le site et ce qui lui reste à faire.

Ce fichier est publié avec le site (adrienvada.fr/CLAUDE.md) : n'y écris jamais
de clé, de mot de passe ni d'information privée.

---

## Ajouter, modifier ou supprimer une date

Demande typique : « J'ai une date en plus, voilà le mail, ajoute-la au site. »

### Où vivent les dates

- **Supabase**, table `representations`. **C'est elle qui fait foi.** Le site la
  lit en direct à chaque visite (`dates-live.js`). Schéma et règles :
  `supabase/schema.sql`.
- **`dates.js`**, une copie de la table, enregistrée dans le dépôt. Elle sert de
  repli si Supabase ne répond pas, et c'est d'elle que sont fabriquées les pages
  spectacle (`/spectacles/…`). Elle doit être **identique** à la table : sinon la
  page se redessine à chaque visite, et la vérification du site échoue.

On n'édite donc **jamais `dates.js` à la main** pour une date à venir. On écrit
dans Supabase, puis on régénère `dates.js`.

### Accès en écriture

La clé est dans la variable d'environnement `SUPABASE_SECRET_KEY` (une clé
`sb_secret_…` réglée dans l'environnement cloud).

- Ne l'affiche jamais, ne l'écris dans aucun fichier, aucun commit, aucun
  message. Utilise-la seulement via `"$SUPABASE_SECRET_KEY"` dans les commandes.
- Si la variable est vide, dis-le à Adrien : il peut faire la modification
  lui-même dans https://adrienvada.fr/admin/, ou ajouter la clé dans les
  réglages de l'environnement (menu de l'environnement cloud, *Edit*), puis
  ouvrir une nouvelle session.
- Cette clé donne tous les droits sur le projet Supabase. Ne touche qu'à la
  table `representations`, et seulement aux lignes concernées par la demande.

### Une ligne = une représentation

| Colonne | Format | Exemple |
|---|---|---|
| `spectacle` | Le titre **exact**, tel qu'il existe déjà dans la table et dans le CV (`index.html`). Apostrophe typographique `’`. | `L’imaginaire forcé` |
| `lieu` | `Salle, Ville (département)` | `Le Forum, Falaise (14)` |
| `ville` | La ville seule, sans département | `Falaise` |
| `jour` | `AAAA-MM-JJ` | `2027-02-02` |
| `heure` | `20h30`, ou `''` si l'horaire n'est pas connu | `14h15` |
| `reservation_url` | Lien `https://…` de billetterie, ou `''` | |
| `scolaire` | `true` pour une séance scolaire (alors pas de lien de réservation) | `false` |

- Deux représentations le même jour = deux lignes. Le site regroupe tout seul en
  « série » les dates d'un même spectacle au même lieu.
- Ne remplis pas `id`, `cree_le`, `modifie_le` : la base s'en charge.
- Titres en usage (relis la table, la liste peut avoir grandi) :
  `À la barre, peine perdue ?` · `L’imaginaire forcé` ·
  `Cléophène, d’après Rodogune` · `Bérénice`.
- **Spectacle qui n'est pas encore dans la table** : vérifie qu'il a une ligne
  dans le CV (`index.html`) et une page dans `spectacles/`. Sinon, ajoute la date
  mais signale-le à Adrien : il n'aura ni page spectacle ni lien depuis le CV.

### Étapes

**1. Rassembler les informations.** Depuis le mail (connecteur Gmail s'il est
disponible, sinon le texte qu'Adrien colle), le site du théâtre, ou Adrien. Pour
une séance scolaire et une séance publique le même jour, ce sont deux lignes.
S'il manque une information indispensable (spectacle, lieu, jour), demande. Une
heure ou un lien inconnus restent vides : le site affiche « horaire à
confirmer » et « réservations pas encore ouvertes ».

**2. Relire la table** pour éviter un doublon, et pour reprendre exactement
l'écriture d'un lieu déjà utilisé :

```bash
URL=https://omekkqjinvppadsoinvj.supabase.co/rest/v1/representations
curl -sS "$URL?select=*&order=jour.asc,heure.asc,id.asc" -H "apikey: $SUPABASE_SECRET_KEY"
```

**3. Montrer à Adrien la ou les lignes**, dans un petit tableau lisible, et
**attendre son accord** avant d'écrire. La base est lue en direct par le site :
ce qu'on y écrit est en ligne aussitôt, avant toute PR. Seule exception : Adrien
a dit explicitement de ne pas lui demander.

**4. Écrire.** Seulement l'en-tête `apikey`. N'ajoute pas
`Authorization: Bearer` avec cette clé : ce n'est pas un jeton JWT.

```bash
# Ajouter (une ou plusieurs lignes)
curl -sS -X POST "$URL" -H "apikey: $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '[{"spectacle":"Bérénice","lieu":"Le Forum, Falaise (14)","ville":"Falaise",
        "jour":"2027-03-05","heure":"20h30","reservation_url":"","scolaire":false}]'

# Modifier une ligne (par son id)
curl -sS -X PATCH "$URL?id=eq.28" -H "apikey: $SUPABASE_SECRET_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"lieu":"Collège Charles Gounod, Canteleu (76)"}'

# Supprimer une ligne (par son id, jamais sans filtre)
curl -sS -X DELETE "$URL?id=eq.28" -H "apikey: $SUPABASE_SECRET_KEY" \
  -H "Prefer: return=representation"
```

Une modification ou une suppression vise **toujours** un `id=eq.N` précis.
Vérifie que la réponse renvoie bien la ou les lignes attendues. Une erreur
`23505` signale un doublon, `23514` une règle de contenu (lien qui n'est pas en
`https://`, texte trop long…).

**5. Régénérer la copie, les pages et vérifier.**

```bash
npm --prefix build ci          # une fois par session, si build/node_modules manque
npm --prefix build run dates   # Supabase → dates.js
npm --prefix build run pages   # galerie, pages spectacle, sitemap
npm --prefix build run verifier
```

`git diff` ne doit montrer que ce qui était attendu : `dates.js`, les pages
spectacle concernées, `sitemap.xml`. Si l'export change autre chose, c'est que
la table et `dates.js` divergeaient déjà : explique à Adrien ce qui diffère
avant d'aller plus loin. La vérification doit tout passer. En cas d'échec, relis
le message, et relance seule l'épreuve concernée
(`SEUL=mot node build/verifier-site.js`) avant de conclure à un problème de
timing.

**6. Committer, pousser, ouvrir la PR.** Message de commit en français, qui dit
quelle date a changé. Puis réponds à Adrien en quelques lignes :

- ce qui a changé ;
- que c'est déjà visible sur le site, puisque la base est lue en direct ;
- que la PR met à jour la copie de repli et les pages spectacle, et qu'elle sera
  publiée quand il dira « fusionne » (fusionne seulement à sa demande, et quand
  les tests sont verts).

---

## Autres modifications : commandes et pièges

Pas de framework : HTML/CSS/JS à la main, servis tels quels. `build/` ne
contient que les outils qui fabriquent des fichiers **générés** (jamais à éditer
à la main : le prochain passage les écrase). Installation, une fois par session :
`npm --prefix build ci`, puis `npm --prefix build run navigateur` (Chromium de
Playwright, pour le PDF et les vérifications ; il est déjà installé dans
l'environnement cloud, voir `PLAYWRIGHT_BROWSERS_PATH`).

| Commande (depuis la racine) | Rôle |
|---|---|
| `npm --prefix build run css` | `styles.css` (Tailwind) : après tout changement de classe dans `index.html`, `404.html`, `dates.js`, `galerie.js`, `admin/` |
| `npm --prefix build run pages` | galerie **puis** pages spectacle + `sitemap.xml` (cet ordre compte) |
| `npm --prefix build run pdf` | CV en PDF : après un changement du CV ou de `@media print` |
| `npm --prefix build run verifier` | vérifie le site dans Chromium (tourne aussi sur chaque PR) ; une seule épreuve : `SEUL=mot node build/verifier-site.js` |
| `npx --yes serve -l 8080 .` | aperçu local (les chemins absolus cassent en ouvrant le fichier) |

Le tableau « Ce qu'il faut relancer, selon ce qu'on a modifié » de
`README-build.md` dit quelle commande suit quelle modification (univers,
photos, icônes, polices, ondes des démos voix…). Le lire avant de committer :
un fichier généré périmé est publié sans le moindre signal.

Architecture en bref :

- `index.html` est le gros fichier : CV, onglets, thèmes, CSS inline, commentaires
  abondants (retirés de la copie publiée par `build/alleger-publication.js`).
- `univers.js` / `univers-montage.js` décrivent le « univers » de chaque
  spectacle (textes, photos, scènes) ; `regie.js` pilote le mouvement ;
  `intro.js` + `mask-points.js` (généré) l'ouverture de scène.
- `spectacles/`, `galerie/`, `sitemap.xml` sont **générés** à partir de
  `index.html`, `univers.js`, `dates.js` et `galerie.js`. Une ligne du CV ou un
  texte d'univers modifié impose donc `npm --prefix build run pages`.
- `sw.js` : service worker limité aux polices et images de `/ressources/`.
  Une image refaite **sous le même nom** reste servie ancienne une fois aux
  visiteurs revenus.
- Les couleurs passent par des variables CSS ; l'échelle Tailwind `stone` est
  **inversée en thème sombre** (raisonner en niveaux, pas en « clair/foncé »).

Règles de travail :

- **Une poussée toutes les dix minutes au plus** : GitHub Pages plafonne à 10
  publications par heure ; au-delà le site reste figé sans message. Groupe les
  commits.
- Pour un changement qui touche l'allure, la structure ou plusieurs pages,
  **propose une branche à Adrien avant de commencer** ; l'aperçu est à
  `<branche>-adrienvada-apercu.djerby-adrien.workers.dev`.
- Ne force jamais une poussée : l'historique a été réécrit en août 2026 ; une
  branche locale `main` ancienne se supprime (`git branch -D main`), elle ne se
  force pas.
- Toute correction de défaut mérite son épreuve dans `build/verifier-site.js`
  et sa ligne dans `README-build.md`.
