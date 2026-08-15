# Notes techniques — adrienvada.fr

Site statique hébergé sur GitHub Pages, servi sur le domaine **adrienvada.fr**
(fichier `CNAME`). Pousser sur `main` publie le site — mais **plusieurs
fichiers du dépôt sont générés**, et pousser sans les avoir régénérés met en
ligne une version incohérente.

Rien ne le signale : le site se publie très bien avec un fichier généré
périmé. Il affiche simplement l'état d'avant.

## Ce qu'il faut relancer, selon ce qu'on a modifié

| Ce que vous modifiez | À relancer | Ce que ça réécrit |
|---|---|---|
| une classe Tailwind dans `index.html`, `404.html`, `dates.js`, `galerie.js` | [la commande Tailwind](#régénérer-stylescss-obligatoire-après-modification-des-classes) | `styles.css` |
| **`univers.js`** — un texte, un montage, un genre, une palette | `node build/generer-pages-spectacles.js` | `/spectacles/…`, `sitemap.xml` |
| une **ligne du CV** dans `index.html` — titre, année, badge, rôle, compagnie | la même commande | idem : les pages spectacle lisent le CV |
| une **ligne du CV**, ou une règle `@media print` | `node build/generer-cv-pdf.js` | `ressources/cv-adrien-vada.pdf` |
| le **montage photo** d'un univers (les `p: [...]`) | `python3 build/prepare-univers-photos.py` | `ressources/images/univers/…` |
| une **icône** ajoutée quelque part | `python3 build/construire-sprite-icones.py` | le sprite, dans `index.html` |
| la **signature** — un nouvel export reMarkable | `python3 build/signature-vers-svg.py <export.pdf>` | `signature.webp` + le bloc SVG à coller |

Chacune a sa section plus bas, avec ce qu'elle fait et pourquoi.

> **Ne modifiez jamais un fichier généré à la main** : la prochaine
> régénération l'écrasera sans rien dire. La liste est au chapitre
> [Images générées](#images-générées-à-ne-pas-écraser-sans-les-régénérer)
> et au chapitre [Pages spectacle](#pages-spectacle-spectacles-à-régénérer).
>
> Le piège s'est déjà refermé : une copie de travail de `spectacles/index.html`
> antérieure à l'ajout des genres, committée telle quelle, aurait effacé les
> genres du répertoire — sans qu'aucun outil ne proteste. Un passage du
> générateur remet tout d'aplomb ; le réflexe est de le lancer **avant** de
> committer, pas après.

Trois scripts de `build/` sont des **opérations uniques**, déjà faites, à ne
pas relancer : `extraire-css-univers.py`, `extraire-montage.py` et
`ordonner-univers.py`. Ils ont servi à découper ou réordonner des fichiers une
fois pour toutes ; leur en-tête le dit.

Pour prévisualiser le site en local (les chemins absolus type `/favicon_io/…`
ne fonctionnent pas en ouvrant simplement le fichier) :

```bash
npx --yes serve -l 8080 .
```

---

## Publier

Pousser sur `main` déclenche `.github/workflows/publier.yml`, qui refait le
[CV en PDF](#le-cv-en-pdf-ressourcescv-adrien-vadapdf) puis dépose le dépôt tel
quel sur GitHub Pages. Une minute environ, dont l'essentiel pour installer
Chromium — et cette étape-là ne peut pas faire échouer la publication.

**Ce n'était pas le cas avant août 2026**, et le changement a une raison. Le
bâtisseur historique de Pages reclonait le dépôt ENTIER à chaque publication :
441 Mo d'historique pour un site de 67 — les originaux des photos de spectacle
y ont vécu avant d'en sortir, et un objet git ne s'oublie jamais. La dernière
publication réussie par cette voie a pris **9 min 58**, contre une limite de
dix minutes ; les suivantes ont toutes échoué sur un laconique « Page build
failed ». `actions/checkout` ne prend que le dernier commit : le poids de
l'historique ne compte plus.

### ⚠️ L'historique a été réécrit — ce que ça fait aux copies de travail

L'historique du dépôt a été dégraissé (les originaux des photos de spectacle y
avaient vécu, et un objet git ne s'oublie jamais). Une réécriture de ce genre
**refabrique tous les commits** : même travail, même message, même date, mais
une empreinte neuve. L'ancienne chaîne et la nouvelle n'ont plus un seul commit
en commun.

Conséquence : **toute copie locale antérieure à la réécriture est piégée.** Elle
ne se met pas à jour toute seule et ne dit pas qu'elle est périmée — elle se
plaint d'avoir *divergé* :

```
$ git branch -vv
  main   d0f398b [origin/main: ahead 56, behind 88] Univers : le palmarès…

$ git merge origin/main
fatal: refusing to merge unrelated histories
```

Ces deux messages sont trompeurs. Il n'y a ni travail à sauver, ni divergence :
il y a une branche restée accrochée à l'ancienne chaîne. La preuve se fait en
deux commandes — le même changement existe des deux côtés, sous deux empreintes :

```bash
git log --format='%h %s' origin/main | grep "<le message du commit>"
git show <ancien> | git patch-id --stable   # → même patch-id
git show <nouveau> | git patch-id --stable  # → que celui-ci
```

**Le remède est de supprimer la branche locale, jamais de forcer.**

```bash
git branch -D main        # rien n'est perdu : le travail est déjà en amont
git checkout main         # git la recrée depuis origin/main, au bon endroit
```

`--force` sur une poussée « pour régler ça » écraserait la nouvelle chaîne avec
l'ancienne — c'est-à-dire remettrait en ligne un site d'avant, et lui rendrait
les 441 Mo de photos qu'on venait de lui retirer.

Pour repérer d'un coup si une branche locale est du mauvais côté :

```bash
for b in $(git for-each-ref --format='%(refname:short)' refs/heads/); do
  git merge-base "$b" origin/main >/dev/null 2>&1 \
    || echo "⚠ $b est sur l'ancienne chaîne"
done
```

Aucun ancêtre commun = ancienne chaîne = à supprimer.

> Le cas s'est produit le 15 août 2026 : une branche `main` locale, créée avant
> la réécriture, ramenait l'état du site au 5 août à chaque `git checkout main`.
> Elle a été supprimée ; les autres branches locales étaient saines.

### ⚠️ Une poussée toutes les dix minutes, pas plus

**GitHub Pages n'accepte que 10 publications par heure.** Au-delà, les
déploiements ne sont plus pris en charge : ils restent en file et expirent au
bout de dix minutes, sans autre message que « Page build failed ». Le site
reste alors figé sur sa dernière version publiée — et rien, dans le dépôt, ne
laisse deviner pourquoi.

**La règle : au plus une poussée toutes les dix minutes.** Elle découle du
quota — six par heure laisse une marge confortable pour les imprévus. Committez
autant que vous voulez, mais **groupez les poussées** : dix commits partent
aussi vite qu'un seul, alors que dix poussées coûtent dix publications.

Le 6 août 2026, quatorze publications en une heure ont bloqué le site pendant
plus de deux heures. Le code partait bien à chaque fois ; il n'était
simplement plus publié.

Avant de pousser, vérifier le compteur :

```bash
gh api "repos/adrienvada/adrienvada.github.io/deployments?environment=github-pages&per_page=20" --jq '[.[] | select((now - (.created_at | fromdate)) < 3600)] | length'
```

Si le site semble figé, c'est la première chose à regarder.

Où regarder quand ça coince :

```bash
gh run list --limit 5
gh api repos/adrienvada/adrienvada.github.io/pages --jq .status
```

Le workflow a des journaux (`gh run view --log-failed`), là où le bâtisseur
historique ne disait rien de plus que « Page build failed ».

---

## Une branche pour les gros changements — à proposer, jamais à décider seul

**Règle de travail avec Adrien.** Avant d'entamer un changement qui touche
l'allure du site, sa structure ou plusieurs pages à la fois, **lui demander
s'il veut une branche** plutôt que d'écrire directement sur `main`. Et si
c'est le cas, **lui donner l'adresse où il pourra la regarder** — la question
n'a d'intérêt que si elle vient avec le moyen de voir.

Ce qui mérite la question :

- une refonte visuelle (couleurs, mise en page, animations d'ensemble) ;
- un changement de structure (déplacer une section, changer une URL, toucher
  au balisage d'une page entière) ;
- tout ce qui se juge à l'œil et se discute — un aplat, un rythme, une
  respiration ;
- ce qui est difficile à défaire une fois publié.

Ce qui ne la mérite pas : une correction de texte, un réglage de valeur, un
commentaire, une régénération. On ne fabrique pas une branche pour trois mots.

L'adresse où il pourra la regarder est donnée au chapitre suivant,
[Regarder une branche](#regarder-une-branche-avant-quelle-ne-touche-le-site-cloudflare) —
et la question n'a d'intérêt que si elle vient avec cette adresse.

### La forme de la question

Une phrase, avant de commencer, pas après :

> « Ce changement touche l'allure de toutes les lignes du CV. Je le fais sur
> une branche `guirlande-droite` ? Tu pourras la regarder sur ton téléphone à
> l'adresse d'aperçu, et on ne touche à `main` que si elle te plaît. »

Et si Adrien préfère `main`, on fait sur `main` — la question est là pour
qu'il choisisse, pas pour lui imposer un détour.
---

## Regarder une branche avant qu'elle ne touche le site (Cloudflare)

GitHub Pages ne publie qu'une seule version : celle de `main`. Une branche de
travail n'existe donc nulle part — on la relit dans un éditeur, jamais dans un
navigateur, et surtout jamais sur un téléphone. Cloudflare comble ce trou : il
publie une copie du dépôt **à chaque branche**, chacune à son adresse.

Rien de tout cela ne concerne adrienvada.fr, qui reste servi par GitHub Pages
et ignore Cloudflare. Si le projet Cloudflare disparaissait demain, le site
n'en saurait rien.

| Ce qu'on pousse | Ce qu'on obtient |
|---|---|
| `main` | `adrienvada-apercu.djerby-adrien.workers.dev` |
| une autre branche | `<branche>-adrienvada-apercu.djerby-adrien.workers.dev` |

L'adresse d'une branche est stable : elle suit son dernier commit. On peut donc
la garder ouverte et recharger.

**Trois fichiers, et c'est tout :**

- **`wrangler.jsonc`** — un nom, une date de référence, et `"directory": "."`.
  Pas de champ `main` : le site n'a aucun programme à exécuter, c'est un
  serveur de fichiers. La racine du dépôt EST le site, exactement comme pour
  GitHub Pages, pour que l'aperçu montre ce qui sera publié et rien d'autre.
- **`.assetsignore`** — écarte `.git`, `.github`, `node_modules`. GitHub Pages
  le fait sans le dire ; Cloudflare, non. Sans ce fichier la construction
  échoue sur `✘ Asset too large` — l'historique du dépôt dépasse à lui seul la
  limite de 25 Mio par fichier.
- **`_headers`** — pose `X-Robots-Tag: noindex, nofollow` sur tout l'aperçu,
  pour que Google n'y voie pas un second site au contenu identique. Lu par
  Cloudflare uniquement ; GitHub Pages l'ignore. **Il faudrait le supprimer
  avant de basculer adrienvada.fr chez Cloudflare** — la règle ne connaît pas
  les noms de domaine, elle sortirait le vrai site de Google sans aucune
  alerte.

**Ces aperçus ne coûtent aucune publication GitHub Pages** : Cloudflare clone
le dépôt de son côté. Le quota des dix par heure ne compte que les poussées,
qui elles déclenchent bien les deux à la fois.

Les visites sur `.workers.dev` **ne sont pas comptées** par Umami — voir plus
bas, `data-domains`.

Vérifier la configuration sans rien publier :

```bash
npx wrangler deploy --dry-run
```

Le « Read N files » affiché est le comptage brut du parcours de dossier, avant
filtrage : il ne dit pas combien de fichiers seront publiés, et ne bouge pas
quand on ajoute une ligne à `.assetsignore`. Ce qui se vérifie, c'est
l'absence d'erreur.

---

## Régénérer `styles.css` (obligatoire après modification des classes)

Le site n'utilise plus le CDN Tailwind (qui générait le CSS dans le navigateur :
plus lent, et déconseillé en production). `styles.css` est un fichier compilé,
qui ne contient **que** les classes réellement utilisées.

Conséquence : si vous ajoutez, supprimez ou modifiez une classe Tailwind dans
`index.html`, `404.html`, `dates.js` ou `galerie.js`, il faut relancer :

```bash
npx --yes tailwindcss@3 -c tailwind.config.js -i build/tailwind-input.css -o styles.css --minify
```

Puis committer le `styles.css` mis à jour.

> Si une classe semble « ne rien faire » après une modification, c'est presque
> toujours qu'on a oublié cette commande.

Les couleurs et polices personnalisées (`luxury-gold`, `font-cinzel`, …) sont
définies dans `tailwind.config.js`.

---

## Thèmes sombre / clair

Le site est **sombre par défaut**, dans le prolongement de l'ouverture à
particules. Un bouton en pied de page bascule vers le thème clair ; le choix est
mémorisé (`localStorage`, clé `avTheme`).

**Toutes les couleurs passent par des variables CSS** définies en haut du
`<style>` de `index.html`, sous forme de triplets « R V B » (et non de `#hex`) —
c'est ce qui permet aux modificateurs d'opacité de Tailwind (`border-stone-200/60`,
`bg-black/25`…) de continuer à fonctionner, via `rgb(var(--x) / <alpha-value>)`
dans `tailwind.config.js`.

⚠️ **L'échelle `stone` de Tailwind est redéfinie** et ne correspond plus aux
gris d'origine : elle est devenue sémantique et s'inverse en thème sombre
(`stone-50` = surface la plus sombre, `stone-800` = texte le plus clair). C'est
ce qui a permis de basculer tout le site sans réécrire des centaines de classes
dans le balisage. Conséquence : **ne pas raisonner en « gris clair / gris
foncé »** en ajoutant du markup, mais en niveaux (50–200 = surfaces et bordures,
400–800 = textes).

Jetons spécifiques ajoutés :

| Classe | Rôle |
|---|---|
| `bg-luxury-bg` | fond de page |
| `bg-luxury-surface` | surface de carte opaque (ex-`bg-white`) |
| `bg-luxury-stripe` | rayure une ligne sur deux (ex-`bg-black/[0.015]`) |
| `text-luxury-onGold` | texte posé SUR un aplat doré — blanc en clair, quasi noir en sombre |
| `text-luxury-warn` | avertissements (réservations, séances scolaires) |
| `text-luxury-goldInk` | or assombri pour les petits textes (contraste AA) |

Trois surfaces gardent la palette sombre **quel que soit le thème** : le book
photo, le lecteur vidéo et l'ouverture de scène. Leurs variables sont
redéfinies localement (voir le sélecteur `#gallery-modal, #video-modal,
#intro-overlay`) — sans cela leurs contenus deviendraient illisibles sur noir
lorsque le site est en thème clair.

**L'impression reste toujours claire**, même quand le site est affiché en
sombre : le bloc `@media print` réimpose la palette claire à la racine. Un CV
imprimé sur fond noir gâcherait l'encre et passerait mal en photocopie.

---

## Ouverture de scène (`intro.js` + `mask-points.js`)

Au premier chargement : un **masque de théâtre en particules** tourne lentement
au centre, pendant que les rôles joués défilent de plus en plus vite. Le défilé
est un **tambour de roulette** : le rôle en cours occupe le centre, net et de
face ; le suivant se décode déjà au-dessus de lui, atténué et plus loin dans la
profondeur ; le précédent est descendu d'un rang, en retrait mais **toujours
lisible** ; celui d'avant, plus bas encore, achève de se faire avaler par la
profondeur. À chaque cran, tout descend d'une place.

Ce sont donc **quatre temps**, pas deux : quand Le Juge prend le centre,
Antiochus est encore là, en dessous, à demi éteint — il ne disparaît qu'à
l'arrivée de Steven. On voit toujours d'où l'on vient et où l'on va.

Le tambour compte **cinq cellules pour quatre places visibles** : la cinquième
attend en coulisse, invisible, le temps d'être remontée du fond vers le haut sans
qu'on la voie sauter. Ses réglages (hauteurs, éloignement, opacités, flou) sont
dans `SLOTS`, en haut de la section « tambour » d'`intro.js` ; la durée d'un cran
est `SHIFT_BASE_MS`, qui suit la même accélération que le reste du défilé.

### La roulette s'arrête sur « Adrien »

**« ADRIEN » est le dernier rôle de la liste, et ce n'est pas un hasard** : c'est
un rôle joué comme les autres, et c'est celui sur lequel la machine cale. Le nom
n'est pas une conclusion plaquée par-dessus les rôles — c'est le rôle qui
restait. Déplacer `'ADRIEN'` ailleurs dans `ROLES` casse toute la fin.

La séquence se termine donc en quatre temps :

1. **le freinage** — le défilé s'épuise de lui-même : le profil de vitesse (voir
   plus bas) ramène les derniers rôles à un rythme lisible sur une bonne
   demi-douzaine de crans. C'est ce qui rend la fin lisible alors qu'on vient de
   traverser une vingtaine de rôles sans pouvoir en compter un seul ;
2. **l'arrêt** — « Adrien » descend au centre en dépassant d'environ 9 % puis
   revient s'y caler (`LOCK_EASE`). Le dépassement joue sur les deux axes : le
   mot passe sous le centre, et il grossit en passant devant le plan de l'écran,
   puisque la profondeur dépasse aussi. C'est le « clac » d'une roulette qui se
   verrouille — sans lui elle ne s'arrête pas, elle s'immobilise ;
3. **le silence** — les rôles restés en dessous achèvent leur chute et
   s'éteignent, pendant que le centre ne bouge plus (`VIDAGE_MS`, `SILENCE_MS`) ;
4. **« Vada »** — le mot s'allume en Cinzel doré à droite pendant qu'« Adrien »
   glisse vers la gauche, et le nom entier se recentre (`VADA_MS`).

Le quatrième temps repose sur une **substitution invisible** : le texte net
(`#intro-name-fade`) vient prendre la place exacte du rôle affiché par le
tambour. Pour que les lettres ne sautent pas d'un pixel, deux précautions —
toutes deux vérifiées à la mesure, et toutes deux nécessaires :

- le nom est **découpé lettre par lettre, à plat**, comme le fait `renderCell`.
  Un mot d'un seul tenant n'aurait pas le même crénage ; un `<span>` groupant les
  deux mots décalait la hauteur de ligne d'un demi-pixel ;
- le calage se fait **par mesure, pas par calcul** : `revele()` superpose le
  « A » du nom sur le « A » du tambour dans les deux axes. Un décalage déduit de
  la largeur ajoutée par « VADA » serait juste horizontalement, mais laisserait
  un demi-pixel vertical — les lettres de « VADA » sont en Cinzel, dont les
  métriques rendent la ligne du nom un pixel plus haute que celle du tambour.
  La mesure, elle, reste vraie quelles que soient les fontes, la largeur de
  l'écran, et même si les polices n'ont pas fini de se charger.

Un **sceau** se trace enfin : il faut **cliquer dessus pour entrer** (l'intro ne
se referme jamais toute seule).

Le nuage de points du masque est dans `mask-points.js` : **fichier généré, à ne
pas éditer à la main**. Il a été produit hors-ligne à partir du modèle 3D FBX
fourni, en ne gardant que la surface avant et en pondérant la densité par la
courbure locale du maillage (dense sur les paupières, le nez et la bouche,
clairsemé sur les joues). Pour le régénérer il faut le FBX d'origine, le
convertir en glTF (`fbx2gltf`) puis rééchantillonner — la procédure n'est pas
automatisée ici.

**Comment la revoir alors qu'on l'a déjà vue ?** Elle ne se joue qu'une fois par
session de navigation, sinon elle deviendrait pénible. Pour la rejouer :

| Moyen | Comment |
|---|---|
| **Le plus simple** | ajouter `?intro=1` à l'URL → `http://localhost:8080/?intro=1` |
| Fermer l'onglet et le rouvrir | le marqueur est en `sessionStorage`, il meurt avec l'onglet |
| Depuis la console (F12) | `sessionStorage.removeItem('avIntroSeen')` puis recharger |

Attention : un simple rechargement (F5 / Cmd+R) **ne suffit pas**, le
`sessionStorage` survit aux rechargements dans le même onglet.

### Elle ne se joue qu'à la porte d'entrée

L'ouverture est le rideau du site : elle ne vaut que pour qui arrive à
**l'adresse nue** (`adrienvada.fr/`). Toute adresse qui désigne un endroit
précis la saute — l'univers d'un spectacle (`#/univers/berenice`), les dates
(`#page_dates`) : ce lien a été partagé POUR ce qu'il montre, et un directeur
de casting qui l'ouvre doit voir le spectacle, pas un rideau devant.

`#page_cv` ne compte pas comme adresse profonde : c'est l'onglet par défaut,
donc l'adresse nue sous un autre nom.

Le test se fait dans le garde en ligne d'`index.html`, **avant** que le routage
d'`univers.js` ne remplace le fragment par `#page_cv`. `?intro=1` force
l'ouverture même sur un lien profond, pour pouvoir la régler.

La session est marquée comme « déjà entrée » dans tous les cas, y compris
quand l'ouverture est sautée : sans cela, revenir à l'adresse nue en cours de
visite lèverait le rideau au milieu du spectacle.

### Régler l'animation

Tout est dans les constantes en haut de `intro.js` :

Tout se joue à deux endroits, et **c'est la séparation des deux qui compte** :
un profil décide de la FORME du rythme, une consigne décide de sa DURÉE. On peut
donc rendre le défilé plus fou sans qu'il s'allonge, et allonger le nom sans le
ralentir. Ils ne se marchent plus dessus.

- `SEQUENCE_CIBLE_MS` — **la durée du défilé, du lever de rideau à l'arrêt sur
  « Adrien ».** C'est une consigne : `intro.js` cherche au chargement, par
  dichotomie, le facteur de rythme qui l'atteint. Conséquence directe : ajouter
  dix rôles ne rallonge plus l'ouverture, ça la densifie. C'est ici, et nulle
  part ailleurs, qu'on rend l'intro plus longue ou plus courte.
- `ROLES` — la liste et l'ordre des rôles. **Seuls les premiers et les derniers
  sont faits pour être lus** : entre les deux, c'est une masse qu'on traverse
  sans pouvoir la compter, et c'est le but. `'ADRIEN'` doit rester en dernier
  (voir plus haut).
- `PROFIL_POW` — resserre le sommet et aplatit les épaules. Près de 1, la courbe
  s'étale ; au-dessus, la pointe se fait plus étroite et plus violente.
- `PROFIL_BIAIS` — déplace le sommet. Au-dessus de 1 il arrive plus tard :
  l'accélération prend son temps, la décélération est plus serrée.
- `SHIFT_FLOOR_MS` / `HOLD_FLOOR_MS` — le plancher absolu (38 + 8 ms par rôle).
  **C'est lui, et lui seul, qui fixe la vitesse de pointe** — voir juste en
  dessous. Les descendre encore ferait se chevaucher les mots sur un appareil
  lent.
- `VITESSE_MAX` — **l'amplitude de la courbe, et le piège du réglage.** On
  croirait qu'elle règle la vitesse de pointe : elle ne la règle pas. Au sommet,
  le rythme bute depuis longtemps sur le plancher ci-dessus. Elle ne décide que
  de la hauteur de la falaise à descendre pour l'atteindre — et une falaise plus
  courte se descend par des marches plus petites. La passer de 0,003 à 0,13 n'a
  pas changé la pointe d'une milliseconde, mais a fait tomber le pire écart
  entre deux rôles consécutifs de 2,1× à 1,3× : c'est tout le ressaut qu'on
  sentait vers « Sganarelle ». **Pour lisser l'accélération, c'est ici qu'on
  agit — en montant cette valeur, contre l'intuition.**
- `LOCK_SHIFT_FACTOR` — de combien le DERNIER cran est plus lent que les autres.
  À 5, « Adrien » met près d'une seconde à descendre : la roulette n'a plus
  d'élan, elle se laisse tomber.
- `OPENING_STEP_MS` / `OPENING_FRAMES` / `OPENING_INDEX` — le décodage lettre à
  lettre des premiers rôles, celui qu'on regarde vraiment au lever de rideau.
- `MAX_INTRO_MS` — garde-fou : au-delà, le voile disparaît quoi qu'il arrive.
  Ne jamais le descendre sous la durée naturelle de la séquence (environ 6 s
  jusqu'au sceau), sinon l'animation serait coupée avant la fin.

Un mot sur l'arbitrage, parce qu'il se represente à chaque réglage : à durée
constante, une décélération plus longue et une chute finale plus lente se
financent forcément sur le reste. Étaler les deux extrémités impose une pointe
plus rapide au milieu, et comprime un peu l'ouverture. Il n'y a pas de réglage
qui donne tout à la fois — seulement des équilibres.

### Régler le grain (et pourquoi il ne faut pas le grossir)

Le masque se lit mal si les grains couvrent trop peu de surface — c'est le
défaut d'origine. **La tentation est de les grossir : c'est le mauvais
remède.** À trois pixels de diamètre un grain n'est plus une poussière, c'est
un disque, et l'œil voit des confettis. Ce qui manque n'est pas de l'encre,
c'est de la **lumière**.

**Ce qui coûte, mesuré.** Ni les pixels peints, ni le fondu `lighter`, ni la
résolution : 6 400 points **nus** de 1 px coûtent 4,3 ms quand 6 400 grains
**avec halo** en coûtent 3,9. Ce qui coûte, c'est le **nombre d'appels** — un
`fillStyle` et un dessin par grain, ~0,55 µs pièce, quelle que soit la taille.
Donc : ne jamais chercher à économiser des pixels, toujours à économiser des
appels.

Trois mécanismes portent le rendu actuel :

| Mécanisme | Où | Ce qu'il fait |
|---|---|---|
| **Grains groupés par couleur** | `buildPalette`, `videCase` | teinte et opacité arrondies à 4 × 16 cases ; un `fillStyle` par case au lieu d'un par grain. 3,9 ms → 1,0 ms |
| **La lueur est une nappe** | `NAPPE_DIV`, `NAPPE_FORCE` | le canevas réduit au quart puis réétiré en `lighter` : l'agrandissement bilinéaire EST le flou. Coût constant, indépendant du nombre de grains |
| **Une image sur deux** | `DUST_MIN_DT` | la poussière à 30 i/s, le texte à 60. Moitié du travail, invisible |

L'ordre de dessin change avec le groupement, et c'est sans conséquence : sous
`lighter`, l'addition est commutative.

**Total mesuré : 0,49 ms par image** (3 200 grains, nappe comprise), contre
2,4 ms avant tout ce chantier et 3,9 ms pour la version à halos individuels.

**L'auto-régulation** (`BUDGET_MS`, `dessines`, `coutLisse` dans `loop`)
chronomètre le dessin et retire des grains jusqu'à tenir le budget, puis en
remet quand la marge revient. Aucune mesure faite sur une machine de
développement ne dit ce que vaudra un téléphone de cinq ans — celle-ci le
découvre toute seule. Le nuage étant tiré au hasard, en dessiner les N
premiers en donne un sous-ensemble uniforme : la silhouette maigrit, elle ne
se déforme pas.

Les molettes de lisibilité, toutes gratuites :

| Constante | Effet |
|---|---|
| `prof = depth * depth` (dans `stepAndDraw`) | creuse le contraste avant/arrière : un visage, pas une coque |
| le coefficient de `twinkle` (0.92 + 0.08) | moins de grains éteints à chaque instant = masque plus brillant |
| `NAPPE_FORCE` | la force de la lueur |
| le fond de `#intro-overlay` (index.html) | le noir est au CENTRE, la chaleur en couronne — le masque se détache sur du noir et non sur la partie la plus claire de l'écran |
| `DUST_GAIN` (1.0) | **taille du grain — à ne pas monter**, ça fait de la craie |
| `particleCount()` | le nombre de départ, que l'auto-régulation ajuste ensuite |

`mask-points.js` n'a que 3 201 points, mais ce **n'est plus un plafond** :
chaque particule s'écarte de son ancre d'un hasard qui lui est propre, donc on
repasse sur le nuage autant de fois qu'il faut. La silhouette ne bouge pas,
seule la densité monte.

---

## Le CV en PDF (`ressources/cv-adrien-vada.pdf`)

Le bouton du CV appelait `window.print()`. Le libellé disait « Imprimer /
PDF », donc rien n'était mensonger — mais ce n'était pas un fichier : il
fallait traverser la boîte de dialogue du navigateur, choisir « Enregistrer au
format PDF », et l'on repartait avec un document nommé `adrienvada.fr.pdf`.
Sur iPhone, le même geste passe par la feuille de partage et demande trois
manipulations.

Or le métier fait circuler des CV en pièce jointe. Ce que reçoit un directeur
de casting doit s'appeler `cv-adrien-vada.pdf`, et s'obtenir d'un seul geste.
Le bouton est donc devenu un `<a download>` qui pointe sur un vrai fichier.

```bash
node build/generer-cv-pdf.js
```

**Rien de la mise en page n'est écrit dans le script.** Il ouvre le site dans
le Chromium de Playwright et lui demande d'imprimer : le PDF sort du **même
moteur**, sous les **mêmes règles `@media print`** que Ctrl+P — la palette
claire réimposée quel que soit le thème, les tiroirs de spectacle écartés, les
rôles longs qui passent à la ligne, le récit retiré. Corriger une de ces règles
corrige le PDF du même coup.

C'est pour cette raison qu'on n'a **pas** pris jsPDF ni html2pdf : 350 à 700 Ko
de bibliothèque — plus que `intro.js`, `styles.css` et `mask-points.js`
réunis — pour une mise en page approximative là où Chromium applique son propre
moteur d'impression.

### Trois précautions, dans le script

- **`avIntroSeen` et `avTheme`** sont posés avant le premier rendu. Sans le
  premier, on attendrait cinq secondes de rideau et le canevas des particules
  tournerait pendant l'impression ; sans le second, le rendu à l'écran qui
  précède le tirage chargerait les variables sombres.
- **`document.fonts.ready`** : imprimer avant l'arrivée de Cinzel et Montserrat
  donnerait un CV en police de repli, aux césures — donc à la pagination —
  différentes.
- **Le titre du document est réécrit** juste avant le tirage. Chromium recopie
  `document.title` dans le champ `/Title` du PDF, et c'est lui que montrent
  l'Aperçu de macOS, Acrobat et la liste des pièces jointes d'un courriel. Le
  titre du site — « Dates, CV & démos » — promettrait des dates et des démos
  que le fichier ne contient pas.

### Pourquoi le fichier est versionné ET refait à la publication

Les deux, et ce n'est pas une ceinture avec des bretelles :

- **versionné**, parce que c'est lui que servent les aperçus Cloudflare (qui
  ne lisent que le dépôt, sans rien exécuter), et parce qu'il est le filet du
  site si la régénération échouait un jour ;
- **refait à chaque publication** (`.github/workflows/publier.yml`), pour
  qu'un oubli de relance ne puisse pas laisser un CV périmé **en ligne**.

L'étape porte `continue-on-error: true`, et c'est délibéré : si Playwright,
Chromium ou le rendu tombent, la publication continue et sert la version
versionnée. Un CV en retard d'une modification vaut infiniment mieux qu'un site
qui ne se publie plus — c'est exactement la panne que ce workflow a été écrit
pour éviter.

Le pire risque restant est donc un fichier versionné en retard, visible
**seulement en aperçu de branche**. D'où la ligne du tableau en haut de ce
document : après une modification du CV, on relance.

### Le CV tient sur UNE page — et il faut qu'il continue

Un CV de comédien se lit debout, en pile, entre deux auditions. La seconde page
ne se lit pas : elle se perd, ou elle attend. Le CV en faisait deux ; il en fait
une.

Tout est dans le bloc `@media print` d'`index.html`, section
**« LE CV TIENT SUR UNE PAGE »** — **l'écran ne bouge pas d'un pixel**. Et rien
n'a été retiré : la coupe porte sur des retours à la ligne, pas sur du contenu.
Un contrôle automatique le vérifie (55 fragments de CV relus dans le DOM, tous
retrouvés dans le PDF).

La cible est **1032 px** : la hauteur utile d'un A4 à 96 dpi, marges de 12 mm
retirées. Où sont passés les 504 px de trop :

| | avant | après | comment |
|---|---|---|---|
| En-tête | 250 | 132 | mis en ligne, portrait à 68 px, « Voir le book » retiré |
| Théâtre (8 lignes) | 628 | 271 | **cinq lignes par spectacle ramenées à deux** |
| Courts-métrages | 156 | 78 | une seule ligne : pas de rôle à afficher |
| Profil | 237 | 208 | interlignage et gouttières resserrés |
| Formation | 156 | 78 | une seule ligne, et le `py-2` enfin atteint |
| **total** | **1536** | **854** | il reste **178 px** de marge |

Trois pièges rencontrés, tous dus à des règles qui existaient pour de bonnes
raisons ailleurs :

- **La page imprimée fait 703 px de large, donc moins que le seuil `md`** de
  Tailwind : elle héritait de la mise en page du téléphone (portrait empilé,
  tout centré) alors que le papier a sa propre largeur. D'où l'en-tête remis en
  ligne à la main.
- **`.cv-title>span::before { content: "\A" }`** impose un retour avant
  l'auteur sous 767 px, pour que les lignes du CV aient toutes la même hauteur
  sur écran étroit. À l'impression, c'était une ligne perdue onze fois. Annulé.
- **`.cv-row-toggle *  { display: revert !important }`** existe pour que la
  rubrique Théâtre survive au masquage global des `<button>` — mais `revert`
  emporte aussi le flex de la ligne, et le badge « En tournée » tombait seul sur
  sa ligne. La rangée est rétablie explicitement, calée sur la ligne de base.

**Si le CV redéborde un jour** (Adrien joue, la liste s'allonge), les 178 px de
marge valent environ six spectacles. Ensuite, dans l'ordre du moins au plus
coûteux : resserrer `Profil`, passer Théâtre sur une seule ligne comme les
courts métrages, ou mettre Courts-métrages et Formation côte à côte sur deux
colonnes. Le mesureur qui a servi à tout cela tient en quarante lignes — il
relit les hauteurs sous le média `print` à 703 px, et c'est la seule mesure qui
compte.

> `:not(:has(.cv-role))` sélectionne les lignes sans rôle — courts métrages et
> formations — pour les mettre sur une seule ligne. Un navigateur qui ne connaît
> pas `:has()` ignore la règle et retombe sur deux lignes : le CV déborde d'un
> cheveu, il ne casse pas.

### « Profil » : une grille à l'écran, une fiche sur le papier

À l'écran, chaque rubrique du profil est une carte — un cadre, un lavis, une
ombre — et la grille les range. À l'impression, la règle `.glass-panel` retire le
cadre, le lavis et l'ombre : il ne restait que la grille, c'est-à-dire des textes
posés à des fers différents sans rien pour dire où commence une rubrique. Sept
cartes devenaient une bouillie sur trois colonnes.

Le papier abandonne donc la grille (`.cv-fiche` passe en `display: block`). Une
rubrique par ligne, l'intitulé dans une gouttière, la valeur en regard — la mise
en page d'une fiche de renseignements. Les cadres qui séparaient les valeurs
multiples sont remplacés par des points médians, et les couples
employeur/lieu ou langue/niveau par des parenthèses.

**L'intitulé flotte à gauche**, tiré hors de la gouttière par une marge négative.
Un retrait négatif (`text-indent`) aurait donné le même effet à l'œil, à trois
pixels près : l'espace qui sépare l'intitulé de sa valeur dans la source décale
la première ligne, et elle seule. Contre un flottant, cette espace tombe en début
de ligne et disparaît. Mesuré dans le PDF : intitulés à x = 75,38, valeurs à
x = 196,88 — **toutes** les lignes, continuations comprises.

> ⚠️ **La gouttière fait 162 px parce que le plus long intitulé — « Expériences
> professionnelles » — en mesure 155.** Un intitulé plus long passerait à la
> ligne, et sa valeur descendrait avec lui : l'alignement de toute la fiche se
> romprait, sans que rien ne le signale. Renommer une rubrique du profil, c'est
> donc remesurer.

`cv-fiche` et `cv-fiche-cle` n'existent que pour ces règles-là : aucun style
d'écran ne s'y accroche. Elles évitent aux sélecteurs d'impression de descendre
dans la structure des cadres, qui n'est pas la même d'une rubrique à l'autre.

### Le piano au même rang que le chant

Deux endroits le disaient autrement, et tous deux sont dans `index.html` :

- **La signature casting** (l'en-tête, visible sur tous les onglets) rangeait le
  piano dans le groupe des aptitudes physiques — « Escrime artistique · Piano ·
  Tir » — en gris de service, quand le chant avait sa case à lui, en pleine
  encre. Le piano a désormais la sienne, juste après « Baryton-basse ».
- **La fiche Profil** donnait au piano une case double, en deuxième rangée, sous
  les trois « vraies » cases : plus large, mais plus bas, et donc lu comme un
  complément. Il est remonté à côté du chant, dans une case de même taille
  (`md:col-span-2 lg:col-span-1` retiré).

Ce sont deux musiques, et un rôle qui demande l'une demande souvent l'autre.
Même rang, même place, même case — c'est la seule façon qu'a une grille de dire
que deux choses comptent autant.

---

## Mettre à jour les dates de représentation

Tout se passe dans `dates.js`.

Les dates **passées basculent automatiquement** dans « Archives & dates
passées » : plus besoin de les déplacer à la main. Une représentation reste
affichée dans « prochaines dates » pendant toute la journée où elle a lieu,
puis rejoint les archives le lendemain. Le champ `icsDate` (format
`AAAA-MM-JJ`) est ce qui pilote ce comportement — il est donc **obligatoire**.

`archives` ne sert plus qu'aux saisons antérieures, conservées telles quelles.

---

## La barre d'onglets reste en haut (téléphone uniquement)

Sur petit écran, la barre se colle en haut au moment où elle allait sortir de
l'écran. En haut de page, elle garde exactement son aspect habituel ; collée,
elle prend un fond presque opaque et une ombre (`#nav-barre.est-collee`).

⚠️ **Ne pas remettre `overflow-x: hidden` sur le `<body>`.** C'est ce qui
empêchait `position: sticky` de fonctionner : `hidden` fait du `<body>` une
boîte de défilement, et une barre collante se cale alors sur cette boîte, qui
ne défile pas. Le `<body>` porte maintenant `overflow-x: clip`, qui rogne de la
même façon **sans** créer de boîte de défilement. `hidden` reste déclaré juste
avant, pour les navigateurs qui ignorent encore `clip` (Safari d'avant 16) :
ils gardent le rognage et n'auront simplement pas la barre collante.

L'état « collée » est détecté par une **sentinelle** placée juste au-dessus de
la barre et surveillée par un `IntersectionObserver` (`suivreBarreCollante`) :
aucun calcul à chaque pixel parcouru, et c'est le navigateur qui prévient au
bon instant. L'observateur n'existe que sous 768 px, et se défait à la rotation
de l'écran.

---

## Univers des spectacles (`univers.js`)

Un clic sur une ligne du CV n'ouvre plus un tiroir de dates, mais une **page
plein écran aux couleurs du spectacle** : titre, ambiance, défilé de photos en
parallaxe, puis les prochaines représentations. Les dates ne sont pas
dupliquées : elles restent lues dans `dates.js`.

Tout se configure dans `SHOW_UNIVERSES`, en haut de `univers.js`. **La clé doit
être exactement la valeur de `data-cv-show`** du `<li class="cv-item">`
correspondant dans `index.html` — même appariement que pour les dates, pas de
rapprochement approximatif.

Chaque entrée porte :

| Champ | Rôle |
|---|---|
| `palette` | les couleurs du spectacle, injectées en variables `--u-*` sur le panneau. Le reste du site n'est **pas** repeint : le panneau le recouvre. |
| `title` / `subtitle` | *(facultatif)* quand le titre du CV est trop long pour du Cinzel 5rem — « Cléophène », et « d'après Rodogune » en dessous |
| `cvAccent` | *(facultatif)* couleur du filet sur la ligne du CV, quand l'accent de l'univers y dirait autre chose que le spectacle |
| `synopsis` | s'inscrit mot à mot sous le titre. Une chaîne, ou un tableau de lignes. Sert aussi de **murmure** sur la ligne du CV — voir ci-dessous |
| `cast` | **la distribution**, en générique de fin. Y mettre le nom d'Adrien comme les autres, en dernier — rien ne l'en distingue : c'est un générique, pas une affiche |
| `castNote` | *(facultatif)* précision sous la distribution — « * en alternance », « Jeu et mise en scène collective. » |
| `prix` | *(facultatif)* le **palmarès**, au générique juste avant la distribution. Une entrée par ligne, le point médian séparant la distinction du lieu : `'Prix du jury · Jeju International Film Festival, 2024'`. La distinction prend l'accent, le reste le gris |
| `credit` | photographe, affiché au pied du panneau |
| `kind` | `'film'` pour un court métrage. Un film n'est pas « à l'affiche », n'a pas de tournée : le pied renvoie à sa fiche au lieu des dates. Absent = spectacle |
| `affiche` | *(films)* `true` pour ouvrir la page sur **l'affiche du film**, entière et agrandissable, avant le montage. Déposer l'original `affiche.jpg` dans le dossier source ; le script le prépare en `ressources/images/univers/<slug>/affiche.jpg` |
| `role` | *(facultatif)* remplace le rôle lu sur la ligne du CV, quand celle-ci n'en porte pas |
| `sequence` | **le montage** — voir ci-dessous. `[]` est légitime : un spectacle pas encore créé n'a pas d'images |

### Le murmure — le synopsis sur la ligne du CV

Au survol d'une ligne de spectacle, son synopsis paraît en gris clair. Au
doigt, où il n'y a pas de survol, c'est l'**appui maintenu** (400 ms) qui
l'appelle ; il se tait quand le doigt se lève, et le clic qui suit n'ouvre
pas l'univers. Un doigt qui glisse annule : le défilement passe avant.

Le texte n'est pas recopié — c'est le `synopsis` de l'univers, relu par
`addWhisper()`. Le corriger à un seul endroit le corrige partout.

- **Sur grand écran**, il s'inscrit dans le vide de la ligne, entre le titre
  et le badge. Rien n'est déplacé : la liste reste immobile. Trois lignes
  tiennent ; au-delà, le texte se dissout par le bas.
- **Sur petit écran**, ce vide n'existe pas : la ligne s'ouvre par le bas,
  le temps de l'appui. Au repos elle ne coûte pas un pixel.

Un spectacle sans `synopsis` n'a pas de murmure — rien à corriger.

### Le montage

`sequence` est écrit à la main : un élément = un temps du défilé, dans
l'ordre. **Le nombre de photos suffit à décider de la mise en page** :

| Écriture | Mise en page |
|---|---|
| `{ p: [12] }` | plein cadre recadré, parallaxe — l'ambiance |
| `{ p: [12, 7] }` | duo, la seconde décalée vers le bas |
| `{ p: [1, 9, 11] }` | trio : une haute à gauche, deux empilées à droite |
| `{ p: [9, 5, 6, 7] }` | quatuor en cascade, lu en diagonale |

#### Une vidéo

```js
{ video: 'dQw4w9WgXcQ', c: ['Teaser du spectacle'] }
```

Un extrait **YouTube ou Vimeo** sur **toute la largeur**, en 16/9. On accepte
l'identifiant seul ou l'adresse entière — ce qu'on a sous la main en copiant.
`c` donne la légende.

**Rien n'est demandé à l'hébergeur avant le clic.** Le bloc n'affiche d'abord
qu'une jaquette ; le lecteur — un mégaoctet de scripts et ses traceurs —
n'est fabriqué qu'au moment où l'on veut voir, servi par `youtube-nocookie.com`
ou `player.vimeo.com` avec `dnt=1`.

YouTube fournit sa jaquette tout seul ; **Vimeo non** : une vidéo Vimeo demande
`jaquette: 'teaser.jpg'` — déposer le fichier dans le dossier source de
l'univers, le script le prépare comme l'affiche.

Une valeur non reconnue est **signalée dans la console** et le bloc est ignoré :
jamais de lecteur monté sur une adresse qu'on n'a pas comprise.

#### Cadrer une photo

Les cadres du défilé recadrent en `object-fit: cover`. Sans mention, c'est le
**centre du fichier** qui survit — pas forcément le sujet. `cadre` désigne le
point à garder :

```js
{ p: [9, 5, 6], cadre: { 9: 'haut', 5: '38% 22%' } }
```

| Écriture | Effet |
|---|---|
| *(rien)* | la photo garde son cadrage centré — **le comportement d'origine** |
| `'haut'` `'bas'` `'gauche'` `'droite'` `'centre'` | le bord ou le milieu à garder |
| `'haut gauche'` `'haut droite'` `'bas gauche'` `'bas droite'` | les quatre coins |
| `'38% 22%'` | viser juste : horizontal puis vertical, de 0 à 100 |

La clé est le **numéro de la photo**, pas son rang dans `p` : rien à compter,
et l'ordre du montage peut changer sans que le cadrage suive au mauvais
endroit. Le réglage appartient au **temps du montage** : la même photo peut
être cadrée autrement dans un autre bloc.

Une valeur non reconnue — faute de frappe, mot inventé, pourcentage au-delà
de 100 — est **signalée dans la console** (`[univers] cléophène · photo 5 :
cadre « hault » non reconnu…`) et la photo reste centrée. Rien d'autre que
les valeurs ci-dessus n'arrive jamais dans la page.

**L'agrandissement au clic n'est pas concerné** : il montre la photo entière,
jamais recadrée.

### Les six emplacements de texte

| Écriture | Où ça tombe |
|---|---|
| `{ chapter: 'I', chapterTitle: 'Le palais' }` | intertitre : un chiffre romain et deux mots, qui donnent au défilé une structure d'actes |
| `{ q: 'phrase', by: 'qui la dit' }` | carton plein écran en Cinzel ; `\n` = fin de vers |
| `{ text: 'un paragraphe…' }` | prose posée : note d'intention, mot de mise en scène |
| `{ p:[12], over:'texte', overAt:'bas' }` | **incrustation SUR la photo**. `overAt` : `gauche`, `centre`, `droite`, `bas`. Plein cadre uniquement — sur une vignette de groupe le texte couvrirait toute l'image |
| `{ p:[12,7], aside:'texte' }` | note en marge, sous les vignettes d'un groupe |
| `{ p:[12], c:['légende'] }` | légende discrète, en petites capitales |

**Tous s'écrivent mot à mot au rythme du défilement** (`updateReveals`) : chaque
mot est un `<span class="u-rw">` qui s'allume quand le bloc traverse l'écran.
La révélation est *pilotée par la position de défilement*, pas déclenchée une
fois pour toutes par un `IntersectionObserver` — c'est ce lien direct entre le
geste et le texte qui fait l'effet, et il se perd dès qu'on se contente d'un
déclencheur.

Le **titre et le synopsis accompagnent le début du défilement**, puis
s'effacent : ils restent intacts jusqu'à 62 % de la course du hero collé, et
ont entièrement disparu — opacité, léger recul, flou — quand la première photo
arrive (`fadeHero`). Un texte encore lisible par-dessus la photo brouillerait
l'entrée dans l'univers.

Les **numéros** sont ceux des fichiers de `ressources/spectacles/<spectacle>/`
— le même langage que les planches-contact. ⚠️ Le dictionnaire `SEQUENCES` de
`build/prepare-univers-photos.py` doit rester synchronisé : c'est lui qui
décide quelles photos sont préparées.

Duos, trios et quatuors passent dans des **cadres de hauteur fixe** (`--tile-h`,
en `svh`). Les photos mêlant portrait et paysage, des proportions libres
faisaient déborder un trio sur deux écrans. Elles y sont donc recadrées — et
c'est l'agrandissement au clic qui les montre entières.

**Toutes les photos sont agrandissables au clic** (loupe en bas à droite).
C'est indispensable : le plein cadre et le duo recadrent, et on ne comprend
pas toujours ce qu'on regarde. L'agrandissement est le seul endroit où la
photo est montrée **entière** (`object-fit: contain`), avec flèches, clavier
et fermeture au clic sur le fond.

⚠️ **Citations : domaine public uniquement.** Racine, Corneille, Shakespeare
sont libres. Les pièces contemporaines — Fulguré.e.s, Audiences, À la barre —
n'ont volontairement aucune citation : reproduire leur texte en ligne demande
l'accord de l'autrice ou de l'auteur.

### Le récit s'écrit

Le hero reste **collé** pendant environ deux écrans (`.u-hero-wrap`). Pendant
ce temps le titre se pose lettre à lettre, vite (34 ms), puis le synopsis
s'inscrit mot à mot, doucement (108 ms), en sortant d'un flou. **Défiler
accélère l'écriture** au lieu de l'emporter hors de l'écran : le premier geste
écrit la page avant de la quitter, puis le tempo retombe.

Tout est piloté par un compteur en millisecondes dans `playWriting()`, **et
non par des `animation-delay` CSS** — on ne pourrait pas les accélérer en
cours de route. Un garde-fou (`writeGuard`) affiche le texte quoi qu'il arrive
si `requestAnimationFrame` est étranglé, ce qui arrive dans un onglet en
arrière-plan : un titre resté invisible serait pire que pas d'animation.

Le bouton **« Accéder aux dates »** est posé sous le titre, dès la première
page : il saute directement au pied du panneau. Sans lui il fallait traverser
tout le défilé de photos pour savoir quand voir le spectacle — or c'est
souvent la seule raison de la visite.

**Bouton « précédent » du navigateur.** Chaque couche plein écran (univers,
book photo, lecteur vidéo, calendrier) ajoute une entrée d'historique, gérée
au même endroit dans `index.html` (chercher « HISTORIQUE DES COUCHES »). Le
retour referme la couche au lieu de quitter le site — le réflexe dominant sur
mobile. La fermer par la croix ou par Échap fait un `history.back()`, pour que
l'écran et l'historique ne divergent jamais.

Un spectacle **sans entrée** garde l'ancien tiroir. C'est volontaire pour
« L'imaginaire forcé » et « Le discours de Cassandre », dont la direction
visuelle n'est pas arrêtée — ce n'est pas un cas d'erreur à corriger.

### Les photos — deux dossiers, un seul à éditer

| Dossier | Rôle |
|---|---|
| `../Images spectacles/<spectacle>/` | **vos originaux**, numérotés (`bérénice_12.jpg`), **hors du dépôt**. Lourds, jamais servis aux visiteurs. C'est le seul endroit où l'on dépose ou remplace une image. Étant hors du dépôt, ils ne sont **plus sauvegardés par git** : gardez-en une copie ailleurs. |
| `ressources/images/univers/<slug>/<n>.jpg` | **copies allégées** que le site charge : 2400 px / < 900 Ko en plein cadre, 1500 px / < 260 Ko en vignette. Régénérées par le script, **jamais éditées à la main**. |

Le numéro du fichier est conservé de bout en bout : c'est le langage commun
entre les planches-contact, le montage et le site.

**`univers.js` est la seule source des numéros.** Le script vient y lire les
`sequence` — il n'y a aucune liste à tenir en double, donc rien qui puisse
diverger.

```bash
python3 build/prepare-univers-photos.py
```

Le script ne prépare que les photos **effectivement au montage**. Une photo
retirée laisse son fichier derrière elle : il le signale, et `--nettoyer`
l'efface.

#### Remplacer une photo

- **Changer l'image derrière un numéro** (retouche, autre prise) : remplacez
  le fichier dans `Images spectacles/…`, relancez le script. Rien d'autre.
  Le script cherche ce dossier à côté du dépôt, puis à son ancienne place ;
  `UNIVERS_PHOTOS=/chemin` permet d'en désigner un autre.
- **Changer quelle photo apparaît** : modifiez le numéro dans la `sequence`
  de `univers.js`, relancez le script.

**Crédit photo** : le champ `credit` d'un univers s'affiche au pied du
panneau. Les photos de Cléophène sont d'Arnaud Bertereau — le crédit est déjà
en place ; le renseigner pour toute série qui en demande un.

### Fluidité — ce qui a été fait, et pourquoi ne pas le défaire

- Le titre s'affiche **immédiatement** ; les photos n'apparaissent qu'une fois
  la première *décodée* (`img.decode()`), avec un minuteur de secours de 2,5 s.
  C'est le décodage, pas le téléchargement, qui faisait tomber l'animation
  d'ouverture.
- La **croix et le bouton « Accéder aux dates » restent actifs** pendant ce
  chargement : on doit toujours pouvoir renoncer.
- Pas de `backdrop-filter` sur les légendes, qui défilent (il reste sur la
  croix, immobile).
- `contain: paint` sur les figures, mais **pas** `content-visibility: auto` :
  celui-ci faisait s'effondrer leur hauteur.

---

## Ajouter une photo au book

1. Déposer l'image dans `ressources/images/galerie/`
2. Générer sa vignette (176×176) — sans elle, la bande de miniatures aura un trou :

```bash
python3 -c "from PIL import Image,ImageOps;import glob,os;[ImageOps.fit(Image.open(f).convert('RGB'),(176,176),Image.LANCZOS,centering=(0.5,0.35)).save('ressources/images/galerie/thumbs/'+os.path.splitext(os.path.basename(f))[0]+'.jpg',quality=78,optimize=True) for f in glob.glob('ressources/images/galerie/*.jpe*g')]"
```

3. Ajouter le nom du fichier dans `GALLERY_IMAGES` (`galerie.js`)

Les photos en pleine résolution ne sont téléchargées qu'à l'ouverture du book,
une par une : inutile de les compresser à l'extrême, mais rester sous ~300 Ko.

---

## Images générées (à ne pas écraser sans les régénérer)

| Fichier | Rôle |
|---|---|
| `ressources/images/profil-192.{jpg,webp}` / `profil-384.*` | avatar de l'en-tête |
| `ressources/images/og-adrien-vada.jpg` | vignette de partage (réseaux sociaux, 1200×630) |
| `ressources/images/miniatures/bande-demo-camera.{jpg,webp}` | miniature de la bande démo |
| `ressources/images/galerie/thumbs/*.jpg` | miniatures du book |

Les **sources** de ces images restent dans le dépôt et ne sont plus servies aux
visiteurs : `profil2_1080x1080.png` (avatar) et `profil_1000x1000.jpg`
(vignette de partage + book). Les régénérer si l'on change de portrait.

---

## Référencement

- Le domaine canonique est **`https://adrienvada.fr`** : ne pas réintroduire
  d'URL en `adrienvada.github.io` dans les balises `og:`, `canonical`,
  `robots.txt` ou `sitemap.xml`.
- Les données structurées « fiche artiste » (`Person`) sont dans le `<head>` ;
  les représentations (`TheaterEvent`) sont générées automatiquement depuis
  `dates.js` au chargement — rien à maintenir à la main.
- `sitemap.xml` **n'est plus écrit à la main** : il est régénéré par le script
  des pages spectacle (ci-dessous), `<lastmod>` compris.

---

## Pages spectacle (`/spectacles/`) — à régénérer

Le site est une page unique dont les univers sont fabriqués par JavaScript :
un moteur de recherche qui lit `index.html` n'y voit ni synopsis, ni
distribution, ni palmarès. Une page réelle par spectacle corrige cela.

```bash
node build/generer-pages-spectacles.js
```

Écrit `/spectacles/<slug>/index.html` pour chaque entrée de `SHOW_UNIVERSES`,
la page-répertoire `/spectacles/`, la feuille `/spectacles/spectacle.css`, et
réécrit `sitemap.xml`.

**À relancer après toute modification de `univers.js`, `dates.js`, ou d'une
ligne de CV dans `index.html`.** Rien n'y est ressaisi : tout est relu depuis
ces trois fichiers. Ne jamais modifier un fichier de `/spectacles/` à la main,
il sera écrasé.

Le lien vers le répertoire, en pied de page d'`index.html`, est le seul chemin
interne vers ces pages : sans lui, le sitemap les ferait indexer mais elles
resteraient sans rien qui y mène. Ne pas le retirer.

### Refermer un univers rend la page où elle était

Ouvrir un univers pose `u-locked` (donc `overflow: hidden`) sur `<html>` : la
page cesse d'être défilable et le navigateur ramène aussitôt son défilement à
zéro. On retient donc la position avant de verrouiller, et on la repose à la
fermeture.

Ce n'est pas la restauration de défilement du navigateur qu'il faut contrer,
contrairement à ce qu'on croirait : c'est **l'adresse**. Le retour ramène le
fragment à `#page_cv`, et le navigateur défile vers cet élément — en douceur,
puisque `<html>` porte `scroll-smooth`. La page glissait donc vers le haut bien
après notre remise en place.

D'où la méthode : couper le glissement le temps du retour, puis **insister
image par image pendant 320 ms** — chercher LE bon instant est une course
perdue, les moments d'application diffèrent selon le chemin (croix, Échap,
bouton du navigateur). On lâche prise dès le premier geste de l'utilisateur
(`wheel`, `touchstart`, `keydown`, `pointerdown`) pour ne jamais lutter contre
lui.

Vérifié sur les quatre chemins de fermeture, en mobile et en desktop.

### Un seul moteur, un seul visage

Ces pages ne sont pas des copies de leurs univers : elles **sont** leurs
univers. Elles chargent la même feuille (`univers.css`), le même moteur de
montage (`univers-montage.js`) et le même script d'animation (`univers.js`).
Le titre s'y écrit, le synopsis s'y inscrit, le montage s'y révèle au
défilement, les photos s'y agrandissent — comme depuis le CV.

Ce qui les distingue : pas de croix de fermeture (rien à refermer), pas
d'ouverture en clip-path (aucune ligne de CV d'où partir), et le bouton
« Voir toutes les dates » est un lien vers `/#page_dates`.

C'est la classe `u-page-spectacle` sur le `<body>` qui déclenche tout :
`univers.js` la reconnaît et appelle `demarrerStatique()`.

**Corriger le montage ou son dessin à un endroit le corrige partout.** Il y a
eu deux moteurs pendant un temps, et le second aplatissait la séquence en une
grille de photos : les chapitres, les citations et les incrustations
disparaissaient. Ne pas recommencer.

### L'ordre des spectacles

Le répertoire va **du plus récent au plus ancien**, comme se lit un CV.
L'année vient de la ligne de CV correspondante dans `index.html` — elle n'est
écrite nulle part ailleurs.

Le tri se fait dans le générateur, pas en se fiant à l'ordre de
`SHOW_UNIVERSES` : une entrée ajoutée à la va-vite en fin de fichier ne doit
pas se retrouver en fin de page. **À année égale, l'ordre du fichier tranche** —
c'est un choix éditorial, et le tri ne le bouscule pas.

`SHOW_UNIVERSES` est rangé dans ce même ordre, par confort de lecture
(`build/ordonner-univers.py`, passé une fois). Si vous ajoutez un spectacle,
mettez-le à sa place chronologique ; sinon ce n'est pas grave, la page sera
juste quand même.

Chaque carte porte **`année · genre · badge`**, exactement comme le bandeau du
panneau (`u-eyebrow`) : un répertoire dit quand, quoi, et où ça en est. Le
badge (« En création », « En tournée ») vient de la ligne de CV — il explique
au passage pourquoi un spectacle n'a pas encore de photographie. Le `genre` vient de
`SHOW_UNIVERSES` ; c'est une étiquette libre (« Tragédie », « Théâtre
documentaire », « Film sur l'art »), pas une valeur contrainte, et elle ne sert
jamais au tri.

**Deux groupes**, sous les intitulés du CV : « Théâtre » puis
« Courts-métrages », chacun du plus récent au plus ancien. Sans intitulé, un
2019 venant s'intercaler après un 2022 se lirait comme un tri cassé — c'est le
titre qui dit que le classement recommence. Le marqueur de groupe est
`kind: 'film'`, pas `genre`, qui n'est qu'une étiquette descriptive.

L'ancienne section « EN CRÉATION » de `SHOW_UNIVERSES` a disparu : elle
couvrait Cassandres et L'imaginaire forcé, mais « À la barre » est aussi de
2026 et vient s'insérer entre eux. Son contenu est remonté dans l'en-tête,
où il vaut pour toutes les entrées.

### Le repli sans JavaScript (`univers-statique.css`)

Les mots du montage attendent à `opacity: 0` — c'est le script qui les
révèle. Sans lui, la page serait un écran vide et son texte invisible à qui
doit l'indexer.

D'où `univers-statique.css`, chargée **uniquement dans un `<noscript>`** : elle
ne coûte rien quand tout va bien, et remet tout à l'état lisible quand rien ne
va. Elle n'a pas de préfixe de portée — sa seule présence signifie déjà
qu'elle doit s'appliquer.

Si vous ajoutez une règle qui masque un élément au départ dans `univers.css`,
**ajoutez-la aussi à `univers-statique.css`**, sinon ce morceau du montage
sera invisible sans JavaScript, et seulement là.

---

## Icônes (`sprite SVG`) — à régénérer après ajout

Le site n'utilise plus FontAwesome depuis un CDN (100 ko de CSS bloquant le
rendu, puis 276 ko de polices, pour 41 dessins). Les icônes vivent dans un
sprite `<symbol>` inséré juste après `<body>`, entre les repères
`SPRITE-ICONES:DEBUT` / `SPRITE-ICONES:FIN`.

```bash
npm i @fortawesome/fontawesome-free@6.4.0     # une fois
python3 build/construire-sprite-icones.py
```

Le script relève les icônes employées, va chercher leur tracé dans le paquet,
réécrit le sprite et convertit les éventuelles balises `<i class="fa-…">`
restantes. Il est **rejouable** : un second passage ne change rien.

**Poser une icône dans le balisage :**

```html
<svg class="ico text-[11px] text-luxury-goldInk" aria-hidden="true">
    <use href="#i-solid-masks-theater"></use>
</svg>
```

`ico` donne la taille du texte courant (`1em`) et sa couleur (`currentColor`) :
les classes Tailwind de taille et de couleur continuent donc de piloter
l'icône exactement comme du temps de la police.

**Changer une icône à l'exécution** : jamais en échangeant des classes — sur un
SVG, `className` est un `SVGAnimatedString` en lecture seule et l'affectation
est ignorée en silence. Passer par `setIcon(el, 'solid-pause')`, et par
`el.setAttribute('class', …)` si les classes doivent changer aussi.

Une icône posée **uniquement** par `setIcon` (jamais écrite dans le balisage)
doit être ajoutée à la liste `SUPPLEMENT` du script, sinon elle manquera au
sprite — c'est le cas de la lune de la bascule de thème.

---

## Démos voix — poids des fichiers

Les studios livrent des masters : 320 kbps, stéréo, 48 kHz. C'est ce qu'il faut
pour archiver, pas pour écouter en 4G dans un couloir de théâtre.

```bash
bash build/optimiser-sons.sh
```

Ré-encode les sept démos servies (21,2 Mo → 8,2 Mo). Le script traite chaque
fichier selon ce qu'il contient réellement : repli mono pour les
enregistrements dont les deux canaux sont identiques (vérifié, pas supposé),
VBR stéréo pour les publicités et documentaires, qui ont une nappe musicale.

**Garder les masters ailleurs que dans ce dépôt** : le script écrase les
fichiers sur place, et un ré-encodage n'est pas réversible.

---

## Le château-mystère

`/chateau-mystere-2026-V1/` est une page privée. Elle reste accessible par son
adresse directe, mais porte `<meta name="robots" content="noindex, nofollow">`.

Elle n'est **volontairement pas** interdite dans `robots.txt` : un robot doit
pouvoir entrer pour lire la consigne de désindexation. Un `Disallow` ferait
l'inverse de ce qu'on cherche — l'adresse resterait indexable depuis un lien
extérieur, sans qu'aucune consigne ne puisse plus l'en déloger. **Ne pas
ajouter de `Disallow` sur ce dossier.**

---

## Mesure d'audience

Umami (compte européen), balise dans le `<head>` d'`index.html`. Sans cookie,
sans identifiant persistant, sans recoupement entre sites : la mesure reste
dans le cadre que la CNIL exempte de consentement, et le site n'a donc pas de
bandeau à imposer en premier écran.

Tout passe par **`track(nom, details)`** — aucun appel direct à `umami`
ailleurs dans le code, pour n'avoir qu'un endroit à changer le jour où l'on
change d'outil. Si l'outil n'a pas chargé (bloqueur, réseau), `track()` ne fait
rien : aucune fonctionnalité du site ne dépend de la mesure.

Deux façons de relever un geste :

| Voie | Comment |
|---|---|
| **Déclarative** | `data-track="nom"` sur un lien ou un bouton, `data-track-detail="…"` en option. Fonctionne aussi sur ce qui est fabriqué après coup (dates, bandeau, filtres). |
| **Explicite** | `track('nom', { … })` là où le geste n'est pas un clic. |

Événements en place : `entree` (onglet d'arrivée), `intro` (coupée ou menée au
sceau, et durée), `univers_ouvert` / `univers_ferme` (spectacle, durée de
lecture), `demo_ecoute` (jalons 25 / 50 / 75 / 100 %, une seule fois par démo
et par visite), `date_agenda`, `banner_next_date`.

**Ne jamais transmettre autre chose que ce que la page affiche déjà** : noms de
spectacle, noms de démo. Rien qui identifie qui que ce soit.

**`data-domains="adrienvada.fr"`** sur la balise : la mesure ne compte que le
domaine public. Le même `index.html` est aussi servi par les aperçus de branche
Cloudflare ; sans cette restriction, chaque relecture d'une maquette viendrait
gonfler les chiffres du vrai site. Ailleurs que sur le domaine listé, le script
se charge et ne compte rien — c'est à retoucher le jour où le site changerait
de nom de domaine, sans quoi la mesure s'arrêterait en silence.
