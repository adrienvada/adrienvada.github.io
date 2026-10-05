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
  repli si Supabase ne répond pas, et c'est d'elle que sont fabriqués les pages
  spectacle (`/spectacles/…`), l'agenda à s'abonner (`dates.ics`) et la carte de
  la saison. **Le workflow « Recopier les dates » la refait chaque nuit** et
  publie seul, sans PR, si la table a changé : c'est le choix d'Adrien
  (`README-build.md`, « La copie de la nuit »).

On n'édite donc **jamais `dates.js` à la main** pour une date à venir. On écrit
dans Supabase ; la copie suit.

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

**5. Lancer la copie tout de suite**, sans attendre la nuit : le workflow
« Recopier les dates », sur `main` — outil GitHub `actions_run_trigger`, méthode
`run_workflow`, `workflow_id` `recopier-dates.yml`, `ref` `main`. Il recopie la
table dans `dates.js`, refait les pages spectacle, `sitemap.xml`, `dates.ics` et
la carte de la saison, committe sur `main` et publie. **Pas de commit ni de PR
de ta part pour une date.**

Suis la course jusqu'au bout (`actions_list`, `list_workflow_runs`, puis
`actions_get`) — deux minutes environ, la publication ensuite :

- son résumé liste les soirées ajoutées, modifiées ou retirées : ce doit être
  ce que tu viens d'écrire. S'il en montre d'autres, la table avait changé
  ailleurs (Adrien dans `/admin/`) : dis-le à Adrien ;
- un avertissement « Sans place sur la carte » (faute de frappe, ou ville hors
  de Normandie, des Hauts-de-France et de l'Île-de-France) : dis-le à Adrien —
  la date est en ligne, seule la carte ne la montre pas ;
- un échec : lis le journal (`get_job_logs`) et explique-le à Adrien. Rien
  n'est poussé ; la copie réessaie chaque nuit.

**6. Répondre à Adrien**, en quelques lignes :

- ce qui a changé ;
- que c'est déjà visible sur le site, puisque la base est lue en direct ;
- que l'agenda à s'abonner, la version de secours et les pages spectacle ont
  suivi (ou suivront cette nuit, si la copie a échoué), et que les applications
  d'agenda des abonnés relisent l'agenda environ une fois par jour.
