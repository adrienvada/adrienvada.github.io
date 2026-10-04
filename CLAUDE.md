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

La clé d'écriture est une clé `sb_secret_…` du projet Supabase. Elle peut être
réglée de deux façons dans l'environnement cloud :

- **En identifiant API** (*API credentials*, la façon recommandée) : le proxy de
  l'environnement ajoute lui-même l'en-tête `apikey` aux requêtes vers
  `omekkqjinvppadsoinvj.supabase.co`. La clé n'est jamais visible dans la
  session ; n'envoie pas d'en-tête `apikey` toi-même.
- **En variable d'environnement** `SUPABASE_SECRET_KEY` : il faut alors ajouter
  l'en-tête `apikey` à chaque requête.

Les commandes ci-dessous gèrent les deux cas avec `"${CLE[@]}"`. Commence par
vérifier que l'accès est là :

```bash
URL=https://omekkqjinvppadsoinvj.supabase.co/rest/v1/representations
CLE=(); [ -n "$SUPABASE_SECRET_KEY" ] && CLE=(-H "apikey: $SUPABASE_SECRET_KEY")
curl -sS -o /dev/null -w '%{http_code}\n' "$URL?select=id&limit=1" "${CLE[@]}"
# 200 : accès en écriture. 401 : aucune clé n'est réglée.
```

- Si la réponse est `401`, n'écris rien. Dis à Adrien qu'il peut faire la
  modification lui-même dans https://adrienvada.fr/admin/, ou régler la clé
  dans l'environnement (sélecteur d'environnement de la zone de saisie d'une
  nouvelle session, roue dentée, *API credentials*), puis ouvrir une nouvelle
  session.
- N'affiche jamais la clé, ne l'écris dans aucun fichier, aucun commit, aucun
  message.
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
curl -sS "$URL?select=*&order=jour.asc,heure.asc,id.asc" "${CLE[@]}"
```

**3. Montrer à Adrien la ou les lignes**, dans un petit tableau lisible, et
**attendre son accord** avant d'écrire. La base est lue en direct par le site :
ce qu'on y écrit est en ligne aussitôt, avant toute PR. Seule exception : Adrien
a dit explicitement de ne pas lui demander.

**4. Écrire.** N'ajoute pas `Authorization: Bearer` avec cette clé : ce n'est
pas un jeton JWT.

```bash
# Ajouter (une ou plusieurs lignes)
curl -sS -X POST "$URL" "${CLE[@]}" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '[{"spectacle":"Bérénice","lieu":"Le Forum, Falaise (14)","ville":"Falaise",
        "jour":"2027-03-05","heure":"20h30","reservation_url":"","scolaire":false}]'

# Modifier une ligne (par son id)
curl -sS -X PATCH "$URL?id=eq.28" "${CLE[@]}" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"lieu":"Collège Charles Gounod, Canteleu (76)"}'

# Supprimer une ligne (par son id, jamais sans filtre)
curl -sS -X DELETE "$URL?id=eq.28" "${CLE[@]}" \
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
