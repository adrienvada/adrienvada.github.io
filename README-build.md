# Notes techniques — adrienvada.fr

Site statique hébergé sur GitHub Pages, servi sur le domaine **adrienvada.fr**
(fichier `CNAME`). Pousser sur `main` publie le site — mais **plusieurs
fichiers du dépôt sont générés**, et pousser sans les avoir régénérés met en
ligne une version incohérente.

Rien ne le signale : le site se publie très bien avec un fichier généré
périmé. Il affiche simplement l'état d'avant.

## Les outils — une installation, des versions figées

Le site n'a aucune dépendance : rien de ce qui suit n'est servi aux visiteurs.
Mais pour le **fabriquer** — la feuille Tailwind, le CV en PDF, l'allègement de
la copie publiée, les vérifications — il faut Tailwind, Playwright et trois
minifieurs. Ils étaient installés à la volée, « la dernière version », et
pouvaient donc changer de comportement d'un jour à l'autre sans qu'une ligne du
dépôt ait bougé. Ils sont maintenant déclarés dans **`build/package.json`**, aux
versions exactes, et `build/package-lock.json` fige tout le reste.

Une fois, sur une machine neuve (Node 18 ou plus) :

```bash
cd build
npm ci                 # les outils, aux versions du dépôt (build/node_modules, ignoré par git)
npm run navigateur     # le Chromium de Playwright, pour le PDF et les vérifications
```

Ensuite, depuis la racine du dépôt :

| Commande | Ce qu'elle fait |
|---|---|
| `npm --prefix build run css` | régénère `styles.css` |
| `npm --prefix build run pages` | régénère la galerie **puis** les pages spectacle et le sitemap (dans cet ordre) |
| `npm --prefix build run pdf` | refait le CV en PDF |
| `npm --prefix build run dates` | recopie les dates de Supabase dans `dates.js` |
| `npm --prefix build run ondes` | écrit [les ondes des démos voix](#démos-voix--les-ondes) dans `index.html` |
| `npm --prefix build run verifier` | [vérifie le site](#vérifier-le-site) dans un vrai navigateur |

Les commandes `node build/…` citées plus bas marchent toujours telles quelles ;
`npm run` ne fait que les appeler. Le workflow de publication installe les
outils **depuis le même fichier de verrouillage** : ce qui part en ligne est
fabriqué avec les versions qu'on a vérifiées ici. Pour monter une version,
changer le numéro dans `build/package.json`, relancer `npm install` dans
`build/`, regarder le résultat (le PDF, la feuille), et committer les deux
fichiers.

## Vérifier le site

`build/verifier-site.js` ouvre le site dans Chromium et vérifie, en une
minute, ce qui a déjà cassé ou casserait sans bruit :

- l'accueil se charge sans erreur de script ;
- un lien direct entre sans rideau ; depuis un autre site, l'ouverture joue une
  fois ;
- « Ajouter au calendrier » ouvre sa fenêtre dans un univers ouvert depuis le
  CV (une représentation fictive est glissée dans les dates le temps du test :
  il ne dépend pas de la saison) ;
- l'onglet Dates, à la densité du CV : une série de deux soirs tient en
  80 px au plus au téléphone ; la feuille d'éphéméride posée sur la photo du
  spectacle, les jours d'une série écrits avec un tiret ; la ville et la
  salle ; une puce par séance, une date seule comprise (et pas de lien de
  réservation sur une séance scolaire) ; un seul bouton d'agenda par ligne,
  dont la fenêtre propose d'abord la séance publique d'une série, change de
  date quand on en choisit une autre, et ne demande rien pour une date
  seule ; pas de total dans les intercalaires ; la frise des mois (un liseré
  à la couleur de son mois dans la marge de la carte, sa trace pâle, son
  point posé dessus devant le nom du mois) ; nom du spectacle qui mène à sa
  page (et aucun lien pour un spectacle sans page, aucun lien mort) ;
  rangement par spectacle retenu, la feuille y redevient papier, la ligne ne
  répète pas le titre et la frise prend la couleur du spectacle ; sommaire qui
  mène à la bonne ligne ; une image pour chaque représentation annoncée aux
  moteurs ; la prochaine date en tête du CV, et nulle part dans l'onglet
  Dates — sur une saison fictive, elle aussi ;
- la prochaine date du CV, une ligne de tableau de gare : titrée « Prochaine
  date », jamais « Départs » ; la date et elle seule (la ville abrégée sans
  trait d'union, l'heure du public plutôt que celle d'une séance scolaire,
  l'heure et la ville en clair dessous sur téléphone) ; des palettes muettes
  pour les lecteurs d'écran et le texte en clair dans le bouton ; rien ne
  bat avant que le CV soit à l'écran, puis les palettes passent par d'autres
  lettres et se posent toutes sur la bonne, sans volet resté à mi-course —
  et, observé image par image, la moitié basse ne prend jamais la nouvelle
  lettre avant que le haut soit tombé ; un rendu identique ne la fait pas
  rejouer ; elle mène à sa ligne dans l'onglet Dates, juste sous
  l'intercalaire de son mois ; en mouvement réduit, elle est posée
  d'emblée ;
- « Télécharger le CV » : un seul lien, sous la prochaine date, sur
  téléphone comme sur ordinateur, et la mesure qui dit toujours `mobile` ou
  `bureau` ;
- les démos voix : toucher la barre de lecture mène au point touché, même
  servi par un hôte qui ne découpe pas les fichiers (en-têtes Range : c'est
  le cas du serveur de vérification comme de l'aperçu Cloudflare) ;
- les pastilles ▶ ne s'impriment pas ;
- la ligne à vignette du CV : chaque spectacle et chaque film ont leur
  vignette, qui dit l'année et l'état de la ligne (cachée aux lecteurs
  d'écran, qui les lisent dans le texte) ; l'année se lit sur chaque vignette
  à l'écran, même posée tout en bas ; les lignes d'une liste ont la même
  hauteur, l'année y tombe au même endroit, et le texte tient dans la hauteur
  de la vignette — au téléphone comme sur ordinateur ; les formations n'ont
  pas d'image ; rien de tout cela sur papier, où aucune ligne n'est voilée ;
- sans JavaScript, le site reste lisible ;
- chaque page spectacle a son `h1`, son `<main>` et des données structurées
  lisibles, où chaque représentation a son image ;
- chaque page spectacle s'anime et s'ouvre comme son univers ouvert depuis le
  CV : mêmes transitions d'apparition (opacité, mouvement, flou) et mêmes
  animations, élément par élément — scènes de défilement comprises —, et même
  haut de page (année, titre, auteur, rôle, compagnie) ;
- la régie (voir [Le mouvement](#le-mouvement--la-régie-les-scènes-les-passages)) :
  l'en-tête de l'accueil et des pages spectacle teste la même chose que
  `regie.js`, et le second pilote (`?repli`) rejoue les images du navigateur —
  opacité et transformation des éléments de l'ouverture (photos, titre,
  surtitre, auteur, synopsis et sa lumière, bouton), du carton du chapitre et
  de la poursuite, relevées aux mêmes endroits du défilement ;
- chaque animation menée par le défilement, sur l'accueil, dans l'onglet
  Dates et sur chaque page spectacle, suit la page ou le panneau de
  l'univers — jamais un cadre rogné
  en `overflow: hidden`, qui ne défile pas (voir [Ce que suit une animation au
  défilement](#ce-que-suit-une-animation-au-défilement)) ;
- les pages spectacle s'ouvrent sur le travelling, puis le récit s'écrit :
  le titre (`h1`) au bout de la scène, invisible au premier écran où une
  photo est déjà là ; en plein travelling il avance SEUL ; posé, rien d'autre
  encore ; en pleine écriture, des lignes du synopsis écrites et d'autres
  non, le bouton ni visible ni cliquable ; au bout de la scène, tout a paru,
  le synopsis est écrit et le bouton répond. Puis le carton du chapitre, en
  tête du montage, tient l'écran (deux écrans de défilement au moins), sa
  phrase écrite ; il finit dans le noir si la salle est sombre (À la barre,
  Cléophène), s'efface sans noir si elle est claire (Bérénice, L'Homme
  moderne), et la première photo attend dans la pénombre ou dans le papier
  selon la salle, éteinte au bas de l'écran, allumée à l'entrée de son quart
  inférieur ;
- en mouvement réduit, chaque scène a un état fixe : l'ouverture réduite au
  haut de la page posé — titre, photo, textes, bouton, sans coupe ni
  déplacement —, le carton du chapitre à un carton, sans noir, la poursuite à
  sa photo en plein feux, la première photo allumée, le texte écrit, plus
  rien d'animé au défilement ;
- les défauts réparés de l'audit du mouvement : le verrou de défilement posé
  sur `<html>` et la place de la barre réservée, le changement d'onglet et sa
  pastille, « Passer » qui répond avant l'arrivée d'`intro.js`, Maj seule qui
  ne lève pas le rideau (Échap, si), le zoom de l'avatar dans `styles.css`, la
  phrase posée sur un groupe de photos (« Jusqu'où serez-vous semblables ? ») ;
- le book : fermer puis rouvrir aussitôt ne laisse pas une page morte ;
- la frise du CV, comme le prototype de l'audit, avec les deux pilotes : la
  ligne de lecture aux trois quarts de l'écran, la pointe du fil dessus
  (à 12 px près, aux deux tiers de la liste) ; le
  fil d'or à gauche de la liste, un point rond par spectacle centré dessus ;
  une ligne déjà lue est pleine avec son point, une ligne à venir voilée et
  sans point ; aucun lavis ne passe plus à droite ; tout est posé en mouvement
  réduit, et la guirlande à horloge n'est pas revenue ; au téléphone, une
  ligne touchée avant le fil (le survol que garde le navigateur) reste voilée,
  sans point ; à la souris et au clavier, elle est pleine ;
- la frise des mois de l'onglet Dates, avec les deux pilotes, sur une saison
  fictive de cinq mois : un espace entre deux mois ; le mois déjà lu est
  tracé, son point posé ; celui qu'on lit est tracé jusqu'à la ligne de
  lecture, pas plus ; celui qu'elle n'a pas atteint n'est pas tracé, sans
  point ; tout est tracé en mouvement réduit ;
- les ondes de la voix : chaque démo a ses 200 niveaux (`data-onde`) et sa
  durée (`data-duree`), son onde est dessinée, elle ne dit jamais « 0:00 » de
  durée avant d'être chargée, et à mi-lecture la moitié lue n'a pas la couleur
  de ce qui reste ;
- la planche contact, au téléphone et sur ordinateur : chaque case a les
  proportions de sa vignette (lues dans le fichier), aucune photo n'est
  recadrée, les photos d'une rangée ont la même hauteur, chaque rangée sauf
  la dernière va au bout ; le crayon gras n'est pas tracé au repos, il l'est
  au survol ;
- le portrait d'affiche : sur l'onglet CV, le portrait fait au moins
  300 × 360 px à l'écran et toute la largeur de l'en-tête au téléphone, le nom
  est en Cinzel, la fiche a ses six cases étiquetées ; sur un autre onglet,
  le médaillon rond d'avant — dès le premier rendu quand on arrive sur un
  autre onglet ; sur papier, l'en-tête d'avant (médaillon de 68 px, nom en
  Montserrat) ;
- la salle de projection : la bobine a ses deux extraits à leur début
  (L'Homme moderne à 0:00, Le rapt à 1:21), le halo est peint, « Le rapt »
  éteint la salle et lance le lecteur à 1:21 avec son API de messages, la
  bobine de la salle noire montre l'extrait en cours et suit ce que le lecteur
  annonce, Échap rallume et arrête le lecteur ;
- la photo dans la lettre, avec les deux pilotes, au téléphone et sur
  ordinateur, dans une salle claire et une salle sombre : la photo où l'on
  entre n'est pas la première du montage ; le masque a une
  lettre par lettre du titre, posée dessus au pixel près ; rien dans les
  lettres en plein travelling, où le titre se voit ; le titre posé détoure la
  photo, et le vrai titre s'est effacé dessous (il ne reparaît pas quand la
  lettre s'ouvre) ; le zoom ne
  commence qu'une fois le récit écrit ; au bout, la photo remplit l'écran. En
  mouvement réduit, le titre détoure la photo, posé, sans zoom ;
- la fiche de casting : six rubriques étiquetées, le chant et le piano sur la
  même ligne, moins de 650 px de haut au téléphone ;
- la page 404 : son titre, son retour, sa lampe, sans erreur ;
- le sitemap annonce toutes les pages spectacle, et elles seules.

Pour ne passer que quelques vérifications — celles dont le nom contient un
mot : `SEUL=planche npm --prefix build run verifier`.

Il tourne sur **chaque demande de fusion** (`.github/workflows/verifier.yml`) :
une coche verte ou rouge sur la demande, avant que rien ne touche `main`. À la
main : `npm --prefix build run verifier`. Un défaut corrigé mérite sa ligne
ici : c'est ce qui l'empêche de revenir.

## Ce qu'il faut relancer, selon ce qu'on a modifié

| Ce que vous modifiez | À relancer | Ce que ça réécrit |
|---|---|---|
| une classe Tailwind dans `index.html`, `404.html`, `dates.js`, `galerie.js`, `admin/` | [la commande Tailwind](#régénérer-stylescss-obligatoire-après-modification-des-classes) | `styles.css` |
| **`galerie.js`** — ajout ou ordre des photos du book, texte `alt` | [`python3 build/variantes-images.py`](#ajouter-une-photo-au-book), puis `node build/generer-page-galerie.js` | les vignettes, puis `/galerie/…` |
| **`univers.js`** — un texte, un montage, un genre, une palette | `node build/generer-pages-spectacles.js` | `/spectacles/…`, `sitemap.xml` |
| une **ligne du CV** dans `index.html` — titre, auteur, année, badge, rôle, compagnie | la même commande | idem : les pages spectacle lisent le CV |
| le **vocabulaire du mouvement** dans `index.html` (`--ease-*`, `--dur-*`) | la même commande | idem : les pages spectacle le relisent (voir [Un seul moteur](#un-seul-moteur-un-seul-visage)) |
| une **date** dans [`/admin/`](#mettre-à-jour-les-dates-de-représentation) (base Supabase) | rien d'urgent — le site l'affiche déjà. Avant un commit : `node build/exporter-dates.js`, puis la commande ci-dessus | `dates.js`, puis `/spectacles/…` |
| une **ligne du CV**, ou une règle `@media print` | `node build/generer-cv-pdf.js` | `ressources/cv-adrien-vada.pdf` |
| le **montage photo** d'un univers (les `p: [...]`) | `python3 build/prepare-univers-photos.py` | `ressources/images/univers/…`, versions allégées et copies floues (`-flou.webp`) comprises |
| une **scène** d'un univers — `lumiere`, `ouverture`, `poursuite`, une césure ` \| ` | `node build/generer-pages-spectacles.js` | `/spectacles/…` (voir [Le mouvement](#le-mouvement--la-régie-les-scènes-les-passages)) |
| une **démo voix** ajoutée ou remplacée (`<audio>` de l'onglet Démos voix) | `node build/ondes.js` | les ondes (`data-onde`, `data-duree`) dans `index.html` — voir [Les ondes](#démos-voix--les-ondes) |
| le **portrait** de l'en-tête (la première photo de `galerie.js`) | `python3 build/variantes-images.py --tout`, ou effacer `portrait-affiche-*` puis le relancer | `ressources/images/portrait-affiche-*` |
| une **icône** ajoutée quelque part | `python3 build/construire-sprite-icones.py` | le sprite, dans `index.html` |
| la **signature** — un nouvel export reMarkable | `python3 build/signature-vers-svg.py <export.pdf>` | `signature.webp` + le bloc SVG à coller |

Chacune a sa section plus bas, avec ce qu'elle fait et pourquoi.

**L'ordre compte entre les deux générateurs** : la galerie d'abord, les pages
spectacle ensuite. C'est le second qui écrit `sitemap.xml`, et il date
l'adresse `/galerie/` d'après l'état de `galerie/index.html` au moment où il
passe (voir [Référencement](#référencement)).

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
[CV en PDF](#le-cv-en-pdf-ressourcescv-adrien-vadapdf), allège la copie à
publier (ci-dessous) puis la dépose sur GitHub Pages. Une minute environ, dont l'essentiel pour installer
Chromium — et cette étape-là ne peut pas faire échouer la publication.

**Ce n'était pas le cas avant août 2026**, et le changement a une raison. Le
bâtisseur historique de Pages reclonait le dépôt ENTIER à chaque publication :
441 Mo d'historique pour un site de 67 — les originaux des photos de spectacle
y ont vécu avant d'en sortir, et un objet git ne s'oublie jamais. La dernière
publication réussie par cette voie a pris **9 min 58**, contre une limite de
dix minutes ; les suivantes ont toutes échoué sur un laconique « Page build
failed ». `actions/checkout` ne prend que le dernier commit : le poids de
l'historique ne compte plus.

### Ce qui part en ligne perd ses commentaires — pas le dépôt

Les sources sont écrites pour être relues : les commentaires pèsent plus de
la moitié d'`index.html` (470 ko, dont 115 compressés, que chaque téléphone
devait recevoir avant d'afficher le CV). L'étape « Alléger les fichiers
servis » les retire de la **copie** que l'action empaquette, et de rien
d'autre : `build/alleger-publication.js` réécrit les pages publiques, leurs
scripts et leurs feuilles (pas `admin/`, pas `styles.css`, déjà minifié).
`index.html` descend à 180 ko, 41 compressés.

Il est prudent par construction : terser **sans compression** (commentaires,
blancs, noms de variables locales — rien d'autre), clean-css au niveau 1 (pas
de réordonnancement de la cascade), blancs HTML réduits à une espace et jamais
à zéro. Chaque fichier est vérifié avant d'être écrit (le JavaScript doit se
compiler, le JSON-LD se relire, la page garder le même nombre de balises de
chaque sorte) ; puis les pages sont ouvertes dans le Chromium de l'étape du
PDF, et **une seule erreur de script de plus qu'avant** remet tout à
l'original. L'étape est en `continue-on-error`, comme celle du PDF : au pire,
le site part tel qu'il est dans le dépôt.

Pour l'essayer sur une copie (il refuse de réécrire le dépôt lui-même hors de
l'action), les [outils](#les-outils--une-installation-des-versions-figées)
une fois installés :

```bash
node build/alleger-publication.js --racine /chemin/vers/une/copie
```

Les versions de ces outils, et celle de Playwright, sont **figées** par
`build/package-lock.json`, que le workflow installe hors du dossier publié :
une nouvelle version ne doit pas changer le site sans qu'on l'ait décidé.

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
npm --prefix build run css
```

Puis committer le `styles.css` mis à jour. (C'est Tailwind 3.4.19, la version
de `build/package.json` ; l'ancienne commande, `npx --yes tailwindcss@3 …`,
prenait la dernière version 3 du moment.)

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

**Le thème bascule en cercle** depuis le bouton pressé, par une View
Transition (`basculerTheme`, dans `index.html` ; la même chose au répertoire et
au book) : deux images de la page, et un cercle qui grandit. Aucune couleur ne
transitionne. ⚠️ **Ne pas remettre de transition de couleur sur `*`** : chaque
élément de la page en portait une, pour ce seul geste — une image figée de
0,13 à 0,22 s au moment de basculer (près d'une seconde sur un téléphone
modeste), et des éléments qui ne changeaient pas ensemble.

**L'impression reste toujours claire**, même quand le site est affiché en
sombre : le bloc `@media print` réimpose la palette claire à la racine. Un CV
imprimé sur fond noir gâcherait l'encre et passerait mal en photocopie.

---

## Ouverture de scène (`intro.js` + `mask-points.js`)

À la première arrivée **depuis un autre site** (voir plus bas : un lien direct
entre sans rideau) : un **masque de théâtre en particules** tourne lentement
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

Un **sceau** se trace enfin : il faut **cliquer dessus pour entrer** — ou sur
le rideau, ou appuyer sur une touche, ou « Passer ». Un garde-fou la referme
de lui-même au bout de **20 secondes** (`MAX_INTRO_MS` dans `intro.js`) : il
n'est pas là pour le rythme, mais pour qu'un onglet resté en arrière-plan ou
une erreur imprévue ne laisse jamais le rideau baissé pour toujours.

Le nuage de points du masque est dans `mask-points.js` : **fichier généré, à ne
pas éditer à la main**. Il a été produit hors-ligne à partir du modèle 3D FBX
fourni, en ne gardant que la surface avant et en pondérant la densité par la
courbure locale du maillage (dense sur les paupières, le nez et la bouche,
clairsemé sur les joues). Pour le régénérer il faut le FBX d'origine, le
convertir en glTF (`fbx2gltf`) puis rééchantillonner — la procédure n'est pas
automatisée ici.

**Comment la revoir alors qu'on l'a déjà vue ?** Elle ne se joue qu'**une fois
par appareil** (le marqueur `avIntroSeen` est dans le `localStorage`, qui
survit à la fermeture du navigateur), sinon elle deviendrait pénible. Et elle
ne joue jamais pour une arrivée directe — adresse tapée comprise. Pour la
rejouer :

| Moyen | Comment |
|---|---|
| **Le plus simple** | ajouter `?intro=1` à l'URL → `http://localhost:8080/?intro=1` : elle joue, quoi qu'il arrive |
| Depuis la console (F12) | `localStorage.removeItem('avIntroSeen'); sessionStorage.removeItem('avIntroSeen')`, puis revenir **depuis un autre site** (un lien tapé ne suffit pas) |

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

### Elle ne joue pas pour un lien direct

Qui arrive **directement** vient voir Adrien : c'est le directeur de casting à
qui l'on a envoyé l'adresse. Il entre tout de suite au CV. Qui arrive
**d'ailleurs** — un moteur de recherche, Instagram, le site d'un théâtre —
découvre le site : l'ouverture joue pour lui, une fois.

La différence tient à la page d'où l'on vient (`document.referrer`), lue par le
garde d'`index.html` :

| On arrive… | Ouverture |
|---|---|
| sans page d'origine : adresse tapée, favori, lien d'un mail ou d'un SMS ouvert dans une application, lien du CV en PDF | non |
| d'une application Android (`android-app://…`, ce que posent Gmail ou les SMS) | non |
| d'une messagerie en ligne (`mail.…`, `webmail.…`, Outlook) | non |
| d'une autre page du site | non (la visite est commencée) |
| par `adrienvada.fr/?direct` | non, jamais |
| de tout autre site : Google, Instagram, Facebook, un théâtre… | **oui, si elle n'a jamais joué sur cet appareil** |

**La limite, et son remède.** Gmail ouvert *dans un navigateur* fait passer
ses liens par `google.com`, qu'on ne distingue pas d'une recherche Google : un
destinataire qui lit ses mails ainsi verrait l'ouverture. Pour une
candidature, envoyer **`adrienvada.fr/?direct`** : on entre sans rideau quel que
soit le chemin, et le paramètre s'efface aussitôt de l'adresse.

**Deux mémoires, et non plus une.** Le `localStorage` retient que l'ouverture
a **joué** sur l'appareil — et seulement cela : une entrée directe ne compte
plus comme vue, et le jour où ce visiteur arrive d'ailleurs, il y a droit. Le
`sessionStorage` retient que la **visite** a commencé, par quelque porte que ce
soit : revenir à l'accueil en cours de route ne lève jamais le rideau au milieu
du spectacle. Les pages `/spectacles/` et `/galerie/` posent la seconde, pas la
première.

### Elle n'est téléchargée que si elle joue

`intro.js` et `mask-points.js` (130 ko, 45 compressés) ne sont plus appelés
par des balises `<script>` : c'est le garde en ligne d'`index.html` qui les
ajoute, **seulement** si le rideau est encore baissé quand il a tranché.
Qui a déjà vu l'ouverture ne les télécharge plus. Ils s'exécutent dans
l'ordre (`async = false`) sans retenir la lecture de la page.

Le même garde pose `modal-open` sur le `<body>` dès cet instant : la page
ne défile pas sous le rideau (le verrou tient sur `<html>`, la boîte qui
défile), et les animations du CV (le voyant et les palettes de la prochaine date)
attendent qu'il se lève pour jouer — elles ne jouent qu'une fois.

Trois filets restent en place : sans JavaScript, un `<noscript>` escamote le
rideau ; si `intro.js` n'a pas démarré quand la page a fini de charger
(fichier perdu, navigateur trop ancien), le garde lève le rideau lui-même ; et
**« Passer » répond dès qu'il est à l'écran** — tant qu'`intro.js` n'est pas
arrivé, le garde lève le rideau sans animation et marque la scène passée
(`__introPassee`), qu'`intro.js` trouve en arrivant et ne démarre pas. Il la
relançait derrière le rideau fermé, et la page restait verrouillée.

### La sortie : l'iris, et le nom qui rejoint l'en-tête

Au clic sur le sceau (ou sur « Passer »), le rideau **s'ouvre en iris depuis
le sceau**, et « Adrien Vada » quitte le centre de la scène pour aller se poser
à sa place dans l'en-tête (`ouvrirEnIris`, dans `intro.js`) : une View
Transition, deux images — le rideau et la page — et le nom qui voyage de l'une
à l'autre. Le nom ne voyage que s'il est à l'écran. Sans View Transitions, le
fondu d'avant.

Au clavier, seules les touches qui veulent dire « aller au site » lèvent le
rideau : Échap, Entrée, Espace, Tab et les touches de défilement. Maj ou Ctrl
seuls — le début d'un raccourci, un lecteur d'écran qui prend la parole — le
fermaient aussi. Le sceau respire trois fois, puis se tient.

**La densité du canevas est plafonnée à 1,5**, et l'auto-régulation regarde
aussi le rythme réel des images : sur un portable Retina, le canevas faisait
2 560 × 1 800 pixels, relus puis recouverts en entier à chaque image par la
nappe — 28 images par seconde. Si l'écart entre deux images dépasse
durablement 48 ms alors que le dessin tient son budget, c'est la carte
graphique qui peine : la densité baisse d'un cran (`jugerLeRythme`).

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
Il n'y en a qu'un, **sous la prochaine date**, sur téléphone comme
sur ordinateur : on lit d'abord où Adrien joue, puis on emporte le CV (il
était auparavant dans la barre d'onglets sur ordinateur, et au-dessus du
carton sur téléphone).

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

### « Profil » : la fiche de casting, à l'écran comme sur le papier

Le profil était une grille de sept cadres, dont plusieurs à moitié vides
(« 187 cm » seul dans une boîte) : on le lisait case après case. C'est
désormais **une fiche de casting** — une liste de définitions (`dl.fiche`),
une ligne par rubrique, l'intitulé en regard de la valeur, comme une fiche
d'agence. Deux colonnes sur ordinateur, la musique et les sports sur toute la
largeur ; au téléphone, 559 px au lieu de 787, sans rien retirer.

- **Taille**, **Langues** (« Français *langue maternelle* · Russe, anglais
  *bilingue, accent français* »), **Musique**, **Combat & sport**,
  **Expériences**, **Permis**.
- **Le chant et le piano restent au même rang** : une seule ligne, « Musique »,
  qui les pose côte à côte (l'un sous l'autre au téléphone).
- **Les combats viennent en tête des sports**, parce que ce sont eux qu'on
  cherche pour un rôle.
- Les précisions (le niveau d'une langue, le lieu d'un employeur) sont dans
  un `<em>`, en gris de service à l'écran.

Le papier avait déjà cette mise en page (`.cv-fiche` en `display: block`) :
une rubrique par ligne, l'intitulé dans une gouttière, la valeur en regard.
Les valeurs multiples sont séparées par des points médians dans le texte même ;
sur papier, chaque `<em>` prend des parenthèses, et la ligne « Musique » se lit
« Chant : baryton-basse · Piano : … ».

**L'intitulé flotte à gauche**, tiré hors de la gouttière par une marge négative.
Un retrait négatif (`text-indent`) aurait donné le même effet à l'œil, à trois
pixels près : l'espace qui sépare l'intitulé de sa valeur dans la source décale
la première ligne, et elle seule. Contre un flottant, cette espace tombe en début
de ligne et disparaît. Mesuré dans le PDF : intitulés à x = 75,38, valeurs à
x = 196,88 — **toutes** les lignes, continuations comprises.

> ⚠️ **La gouttière fait 162 px** : c'était la mesure du plus long intitulé
> d'avant, « Expériences professionnelles » (155 px). Les intitulés sont plus
> courts depuis la fiche (« Combat & sport », le plus long) ; la gouttière
> reste, pour que le papier ne bouge pas. Un intitulé plus long que 162 px
> passerait à la ligne, et sa valeur descendrait avec lui : renommer une
> rubrique du profil, c'est donc remesurer.

`cv-fiche` et `cv-fiche-cle` servent aux règles d'impression ; l'écran
s'accroche à `.fiche`.

### Le piano au même rang que le chant

Deux endroits le disaient autrement, et tous deux sont dans `index.html` :

- **La signature casting** (l'en-tête, visible sur tous les onglets) rangeait le
  piano dans le groupe des aptitudes physiques — « Escrime artistique · Piano ·
  Tir » — en gris de service, quand le chant avait sa case à lui, en pleine
  encre. Le piano a désormais la sienne, juste après « Baryton-basse ».
- **La fiche Profil** donnait au piano une case double, en deuxième rangée, sous
  les trois « vraies » cases : plus large, mais plus bas, et donc lu comme un
  complément. Il était remonté à côté du chant, dans une case de même taille ;
  depuis la fiche de casting, les deux partagent la ligne « Musique ».

Ce sont deux musiques, et un rôle qui demande l'une demande souvent l'autre.
Même rang, même place — c'est la seule façon qu'a une fiche de dire que deux
choses comptent autant. Dans le [portrait d'affiche](#le-portrait-daffiche), la
signature casting devient six cases étiquetées ; le piano y a la sienne
(« Instrument »), à côté du chant.

---

## Mettre à jour les dates de représentation

Les dates à venir ne s'écrivent plus dans un fichier : elles vivent dans une
**base Supabase**, et se modifient depuis **[adrienvada.fr/admin/](https://adrienvada.fr/admin/)**
— depuis un téléphone, en tournée, sans commit ni publication. Le site les
lit en direct.

### Depuis le téléphone : `/admin/`

1. Ouvrir `/admin/` et entrer par **mot de passe**. La première fois, ou
   s'il est oublié : « Recevoir un lien de connexion par mail », puis, une
   fois entré, « Mot de passe » en haut de la page pour le définir. Le lien
   mail est limité par Supabase à quelques envois par heure sur le compte
   gratuit — c'est pour ça que le mot de passe existe. La session reste
   ouverte sur l'appareil.
2. La page montre les dates **comme sur l'accueil** — mêmes pastilles,
   mêmes séries dépliables — avec, sur chaque soirée, trois gestes :
   **Modifier**, **Dupliquer** (même spectacle, même lieu, le lendemain :
   le geste d'une série), **Supprimer**. Le bouton doré ajoute une date ;
   au pied d'une série, « Ajouter une soirée à cette série » fait de même
   sans rien retaper. Chaque enregistrement est **immédiatement visible**
   sur le site.

Une ligne = une soirée. Deux représentations le même jour, c'est deux
lignes. Les soirées d'un même spectacle au même lieu, rapprochées, sont
regroupées en « série » par le site lui-même — rien à saisir pour ça.

Le **spectacle se choisit parmi des puces**, pas dans un champ libre : les
spectacles du CV marqués « En tournée » puis « En création », puis ceux
qui ont déjà des dates, puis « Autre… » pour un titre nouveau. La liste
est lue dans `index.html` (les `data-cv-show` et leur badge) : une seule
source, la même que l'accueil. C'est important, parce que le **titre doit
être exactement celui du CV** — au caractère près, apostrophe comprise :
c'est lui qui relie une date à sa ligne du CV et à sa page spectacle. La
page corrige aussi la typographie (espace insécable avant `?`, `!`, `:`).

La page est faite de `admin/index.html`, `admin/admin.css` (les jetons de
thème y sont **recopiés** depuis le `:root` d'`index.html` — si l'accueil
change une couleur, la recopier) et `admin/admin.js`. Elle emprunte ses
classes Tailwind à `styles.css` : `admin/` est déclaré dans
`tailwind.config.js`, donc **toute classe nouvelle dans admin/ demande de
régénérer `styles.css`**, comme pour l'accueil. Pour juger de sa mise en
page sans se connecter, sur la machine de développement seulement :
`http://localhost:8749/admin/?apercu` (lecture seule, la base refuse
d'écrire sans session).

Seule l'adresse **adrien.vada@gmail.com** peut écrire : c'est une règle de
la base (`supabase/schema.sql`), pas de la page. Un autre compte, même
connecté, est refusé.

**Le lien de réservation doit être une adresse web** (`https://…`, ou
`www.…` que la page complète) : la page refuse le reste, et le site ne fait
pas un lien d'une adresse douteuse (`lienSur`, dans `dates-live.js` et
`univers-montage.js`). La base le refuse aussi, pour le jour où une écriture
passerait par ailleurs — mais seulement une fois ses **garde-fous** posés :
`supabase/contraintes-2026-09.sql`, **à exécuter une fois** dans l'éditeur
SQL de Supabase (il échoue sans rien changer si une ligne existante ne s'y
plie pas : la corriger d'abord). Dans le tableau de bord, *Authentication →
Sign In / Providers* : désactiver « Allow new users to sign up » (seul le
compte d'Adrien a lieu d'exister) et laisser « Confirm email » activé.

### Sur l'ordinateur, avant un commit : `exporter-dates.js`

**Une date saisie dans `/admin/` est en ligne tout de suite**, sur l'accueil
comme sur les pages `/spectacles/…` : les deux lisent la base en direct. Il
n'y a rien à relancer dans l'urgence, et surtout rien à committer pour
qu'une date paraisse.

Ce qui lit encore la COPIE de `dates.js` — et qui vieillit donc jusqu'au
prochain export :

- le **repli** quand la base ne répond pas (projet en pause, réseau coupé) ;
- le **HTML généré** des pages spectacle : ce que voit un visiteur sans
  JavaScript, et ce que lisent les robots d'indexation, `TheaterEvent`
  compris — une date absente de `dates.js` ne remontera pas dans les
  résultats enrichis de Google, même si la page l'affiche ;
- le **PDF du CV**.

Aucun des trois n'est urgent, aucun ne doit être oublié. Avant le prochain
commit, donc :

```bash
node build/exporter-dates.js
node build/generer-pages-spectacles.js
```

Le premier recopie la base entre les repères `⇊ ⇈` de `dates.js` ; tout ce
qui est hors des repères (titre de saison, archives) reste à la main. Le
second refait les pages spectacle avec les nouvelles dates.

**Ne modifiez plus la partie `upcoming` de `dates.js` à la main** : le
prochain export l'écraserait sans prévenir. Le bon endroit, c'est `/admin/`.

### Pourquoi les pages spectacle lisent les dates elles aussi

Elles ne le faisaient pas : leur pied était écrit une fois pour toutes à la
génération. Une date saisie dans `/admin/` s'affichait donc sur l'accueil et
restait invisible sur `/spectacles/…` jusqu'à ce que quelqu'un relance les
deux commandes ci-dessus et committe — ce qui est arrivé à *L'Imaginaire
forcé*, qui annonçait « les dates de tournée seront annoncées ici » pendant
que l'accueil en affichait six.

Ces pages chargent donc maintenant `dates.js` et `dates-live.js`, comme
l'accueil, et `univers.js` refait leur pied au chargement
(`rafraichirDatesSpectacle`). Il ne refait QUE ce que les dates commandent —
le bouton du hero, le titre du pied, la liste, le renvoi vers l'agenda ;
les quatre fragments viennent d'`univers-montage.js`, les mêmes qui ont servi
à écrire la page. Le montage de photos n'est pas touché.

Deux effets à connaître :

- le HTML généré reste **le repli sans JavaScript**, et c'est à ce titre
  qu'il faut continuer de le régénérer (voir ci-dessus) ;
- une date **passée** disparaît d'elle-même du pied le lendemain, sans
  régénération : « à venir » se calcule désormais au jour de la visite, plus
  au jour de la génération.

### Ce qui n'a pas changé

Les dates **passées basculent automatiquement** dans « Archives & dates
passées » : une représentation reste dans « prochaines dates » toute la
journée où elle a lieu, puis rejoint les archives le lendemain. `archives`
ne sert qu'aux saisons antérieures, conservées à la main dans `dates.js`.

### L'onglet Dates : une ligne, deux rangements, un sommaire

Le rendu est dans `index.html`, autour de `renderDates()` : les fonctions
`dl…()` juste au-dessus dessinent tout, et leur en-tête explique pourquoi.

- **La ligne, à la densité du CV.** Chaque entrée (une date seule, ou une
  série : même spectacle, même lieu, soirées rapprochées) tient en une ligne
  de la hauteur d'une ligne du CV — 69 px au téléphone, contre près de 200
  quand chaque séance avait sa case. À la place de la vignette du CV, une
  **feuille d'éphéméride posée sur la photo du spectacle** (48 × 56) : le mois
  dans le bandeau du haut, à la couleur du spectacle ; au centre le jour, ou
  les jours d'une série avec un tiret (« 22–23 ») ; en bas le jour de la
  semaine, là où le CV écrit l'année. Sans photo, la feuille prend la couleur
  du spectacle. À côté, trois lignes : le titre, **la ville et la salle**
  (`dlLieu()` retire la ville du libellé du lieu), puis **une puce par
  séance** — son heure, et le jour de la semaine pour une série de plusieurs
  jours. Une puce publique mène à la billetterie (↗) ; une séance scolaire,
  ou dont la billetterie n'est pas ouverte, a sa puce en pointillé, sans lien.
  **Un seul bouton d'agenda**, au bout de la rangée : pour une série, la
  fenêtre « Ajouter à l'agenda » demande quelle séance ajouter
  (`data-cal-serie`, voir `openCalendarModal()`), et propose d'abord la
  première séance publique. La feuille est décorative : la date en toutes
  lettres reste écrite pour les lecteurs d'écran.
- **Deux rangements.** « Par date » range les lignes sous un intercalaire par
  mois, sans total : la frise suffit à borner le mois, et le sommaire compte
  déjà les représentations. « Par spectacle », sous chaque pièce, avec sa
  photo : la feuille des lignes redevient alors papier, et la ligne ne répète
  pas le titre. L'intercalaire reste accroché sous la barre d'onglets pendant
  qu'on parcourt son mois ou sa pièce. Le choix du visiteur est retenu
  (`localStorage`, clé `av.datesVue`).
- **La frise des mois.** Comme le fil du CV, chaque groupe porte son liseré
  dans la marge de la carte, du point posé devant le nom du mois jusqu'à sa
  dernière ligne ; **un espace le sépare du suivant** : on voit où finit un
  mois et où commence le suivant. Il **se trace à mesure qu'on lit** : sa
  trace pâle est là d'emblée, le trait plein descend avec la ligne de
  lecture (aux trois quarts de l'écran, comme au CV), et le point du mois
  éclôt quand elle atteint l'intercalaire — accroché avec lui en haut de l'écran, il dit quel
  mois on lit. Les mêmes images que la frise du CV (`cv-fil`, `cv-point`),
  les deux mêmes pilotes : `view()` dans les navigateurs récents, `regie.js`
  ailleurs (le groupe et son intercalaire portent `.rg-ligne`, et
  `renderDates()` les confie à la régie à chaque rendu). En mouvement réduit
  et sur papier, tout est tracé d'emblée. **Chaque mois a sa couleur, qui
  suit les saisons** (`--dl-mois-1` à `--dl-mois-12`) :

  | Saison | Mois |
  |---|---|
  | Automne, roux | septembre ambre, octobre orange, novembre corail |
  | Hiver, froid | décembre prune, janvier pervenche, février bleu ciel |
  | Printemps, vert | mars sarcelle, avril vert, mai olive |
  | Été, doré | juin, juillet, août, du jaune à l'ambre |

  Les douze sont à la même clarté perçue (OKLCH, L = 0,63) : aucune ne domine,
  et chacune garde au moins 3,3:1 de contraste sur le fond clair comme sur le
  fond sombre. Rangé par spectacle, le liseré et son point prennent la
  couleur de la pièce (`--dl-lisere`). **Les initiales des mois, dans la saison d'un regard,
  portent le même code couleur**, mêlé d'un quart de la couleur du texte : une
  lettre de 11 px doit garder 4,5:1, là où un trait se contente de 3:1 (5,1:1
  au pire, dans les deux thèmes).
- **Pas de prochaine date ici.** Elle n'est qu'en tête du CV
  (`renderNextDate()`, voir [La prochaine date](#la-prochaine-date-en-tête-du-cv)) :
  la liste de l'onglet Dates commence déjà par elle, et c'est là que mène sa
  ligne — chaque ligne de la liste porte une clé (`data-dl-cle` : le premier
  jour et le titre) qui la retrouve quels que soient les filtres.
- **Le sommaire**, en tête de la carte : la saison d'un regard — les
  spectacles en lignes, les mois en colonnes. Il ne filtre rien : un mois, un
  spectacle ou un rond **mènent** aux lignes qu'ils résument. Il se retire
  pendant une recherche, où seule la liste compte.
- **Le nom d'un spectacle mène à sa page** (`spectacles/<slug>/`), partout où
  l'onglet l'écrit : la ligne, l'en-tête du rangement par spectacle, les
  archives (`dlVersPage()`). Chaque univers a sa
  page ; un spectacle sans univers garde son nom en simple texte, jamais un
  lien mort. Le retour du navigateur ramène à l'onglet Dates : changer
  d'onglet inscrit `#page_dates` dans l'historique.

### La prochaine date, en tête du CV

`renderNextDate()`, dans le script écrit juste après son emplacement : la
prochaine date comme **une ligne de tableau de gare**, sous le titre
« Prochaine date » — la date, l'heure, le spectacle, la ville, en palettes
noires ; la date et l'heure en jaune, le spectacle et la ville en blanc,
l'intitulé de chaque colonne au-dessus, le trait à la couleur du spectacle.
Noire dans les deux thèmes : c'est un tableau, pas une carte du site.

- **Une seule date**, la prochaine entrée de la liste (un soir, ou une série
  au même endroit). Sur ordinateur, les quatre colonnes ; sur tablette, la
  ville passe dessous ; sur téléphone, la date et le spectacle en palettes,
  l'heure et la ville en clair dessous.
- **Ce qui ne tient pas est abrégé sans rien inventer** : « Saint- » devient
  « ST », un nom trop long est coupé entre deux mots (« ST PIERRE » pour
  Saint-Pierre-lès-Elbeuf), le trait d'union devient un blanc — la charnière
  d'une palette le coupait en deux. L'heure est celle du public quand une
  séance scolaire la précède ; « CE SOIR » et « DEMAIN » remplacent la date
  les deux jours où ils disent plus qu'elle.
- **Elle mène à sa date** dans l'onglet Dates, juste sous l'intercalaire de
  son mois — c'est là qu'on réserve et qu'on garde la date dans son agenda.
  Une recherche en cours est levée d'abord. Le texte complet (la date en
  lettres, toutes les heures, le lieu exact) est dans le bouton, pour les
  lecteurs d'écran ; les palettes leur sont cachées.
- **Rendue pendant la lecture de la page**, pas au chargement : la taille des
  palettes ne dépend que de la largeur du tableau, et le CV qui suit ne bouge
  pas. Les jours, les mois et la date en lettres (`dlJour`,
  `dlDateEnLettres`…) sont donc écrits dans ce premier script ; l'onglet
  Dates les y trouve. La couleur du spectacle vient d'univers.js, qui arrive
  en fin de document : le rendu du chargement la pose sans rien redessiner.
- **Les lettres battent une fois** (voir [Le mouvement](#le-mouvement--la-régie-les-scènes-les-passages)),
  quand le tableau est à l'écran — pas sous le rideau, ni pour une adresse
  qui vise un autre onglet. En mouvement réduit, il est posé d'emblée.

Rien de tout cela ne se saisit : **la couleur, le genre, le sous-titre et la
photo d'un spectacle viennent de son univers** (`univers.js`), retrouvé par
son titre comme pour le CV. Un spectacle sans univers prend l'or du site et,
rangé par spectacle, ses initiales à la place d'une photo. Un titre écrit
autrement que la clé de l'univers ne le retrouve pas : pas de rapprochement
approximatif. Pour un spectacle annoncé sous un autre nom, l'univers déclare
ses **`autresTitres`** : `['À la barre']` relie ainsi les archives 2024 - 2025
à « À la barre, peine perdue ? ». La photo est la
**couverture** de l'univers — la première de son montage — en 240 px
(`<n>-240.webp`, fabriquée par `build/variantes-images.py`) ; si elle manque,
la page se rabat sur la version de 640 px.

### Comment ça tient — et ce qui peut lâcher

- **`dates-live.js`** interroge la table au chargement de l'accueil. Si elle
  répond en moins de trois secondes, il remplace les dates et relance les
  rendus. Sinon, rien ne se passe : `dates.js` reste affiché. Aucune erreur
  visible dans les deux cas.
- **La clé dans le code est publique par construction** (« publishable ») :
  elle ne permet que ce que les règles d'accès autorisent aux anonymes,
  c'est-à-dire lire. La clé « secret » du projet ne doit jamais entrer dans
  ce dépôt.
- **Le projet Supabase gratuit se met en pause après une semaine sans
  requête.** Le workflow `.github/workflows/reveiller-supabase.yml` fait une
  lecture deux fois par semaine pour l'en empêcher. Si malgré tout le site
  retombe sur `dates.js` (dates figées), c'est là qu'il faut regarder : le
  tableau de bord Supabase propose de relancer le projet en un clic.
- Le projet s'appelle **adrienvada-site**, dans l'organisation
  « adrienvada's Org » — distinct du projet du jeu Godot. La table est
  décrite dans `supabase/schema.sql`, l'import initial dans
  `supabase/import-initial.sql` ; les deux ont déjà été joués et servent de
  mémoire.

---

## La barre d'onglets reste en haut (mobile et desktop)

Quelle que soit la taille de l'écran, la barre se colle en haut au moment où
elle allait sortir de l'écran. En haut de page, elle garde exactement son
aspect habituel ; collée, elle prend un fond presque opaque et une ombre
(`#nav-barre.est-collee`).

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
bon instant.

**Changer d'onglet a un sens.** La nouvelle page arrive du côté de l'onglet
choisi — de la droite vers « Démos voix », de la gauche en revenant au CV —,
par une View Transition (`showPage` → `poserPage`) : l'ancienne s'efface d'un
côté pendant que la nouvelle arrive de l'autre ; l'en-tête et la barre ne
bougent pas. Le fond et le filet de l'onglet actif sont une **pastille** qui
glisse d'un onglet à l'autre sur un ressort (`placerPastille`, et
`--ease-ressort`). Sans View Transitions, une animation d'entrée fait arriver
la nouvelle page ; en mouvement réduit, le changement est net. `showPage` rend
une promesse : qui veut poser le focus dans la nouvelle page doit l'attendre
(voir `goToDatesForShow`).

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
| `cvAccent` | *(facultatif)* couleur du filet et de la vignette sur la ligne du CV, quand l'accent de l'univers y dirait autre chose que le spectacle |
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

- **Sur grand écran**, il s'inscrit dans le vide de la ligne, entre le texte
  et la flèche. Rien n'est déplacé : la liste reste immobile. Trois lignes
  tiennent ; au-delà, le texte se dissout par le bas.
- **Sur petit écran**, ce vide n'existe pas : la ligne s'ouvre par le bas,
  sous le texte, le temps de l'appui. Au repos elle ne coûte pas un pixel.

Un spectacle sans `synopsis` n'a pas de murmure — rien à corriger.

### La vignette — l'année et l'état sur la ligne du CV

Chaque ligne de spectacle ou de film s'ouvre sur une **vignette** : la
couverture de son univers (la première photo du montage, en 240 px — la même
que dans l'onglet Dates), ou ses initiales sur sa couleur tant qu'il n'a pas
de photos. L'**année** s'imprime au bas de la photo, en blanc sur un voile ;
l'**état** (« création », « tournée ») en bandeau, en haut, comme sur la
feuille des Dates. Au passage du lavis (voir la frise, au chapitre
[Le mouvement](#le-mouvement--la-régie-les-scènes-les-passages)), c'est la
vignette d'un spectacle qui se joue encore qui s'allume, là où s'allumait le
badge.

Pourquoi : collée au titre, l'année en suivait les retours à la ligne, et le
contenu se centrait dans la hauteur commune de la liste — l'année tombait
plus haut ou plus bas d'une ligne à l'autre. La vignette a la même taille
partout : l'année y tombe au même endroit, toujours.

**Rien n'est recopié dans le balisage.** `addVignette()` lit l'année et l'état
dans la ligne (`.cv-year`, `.cv-badge`), qui les garde : c'est là que les
lisent les lecteurs d'écran (la vignette leur est cachée), l'impression, et
le CV sans JavaScript, qui reste tel qu'il était. Changer une année ou un
badge, c'est donc toujours changer la ligne du CV dans `index.html`. La
couverture vient de `UniversMontage.couverture()` (univers-montage.js),
partagée avec l'onglet Dates : changer la première photo d'un montage change
les deux, après `python3 build/variantes-images.py`.

La mise en page, à l'écran (`LA LIGNE À VIGNETTE`, dans `index.html`) :

- **trois lignes de texte, une seule chacune** — le titre (en Cinzel), le rôle,
  la compagnie. Ce qui déborde s'arrête sur des points de suspension ; le
  texte reste entier dans le document et dans l'univers. C'est ce qui donne à
  toutes les lignes la hauteur de la vignette, et le contrôle automatique le
  vérifie ;
- **l'auteur**, entre parenthèses, sur grand écran seulement ;
- **un film** porte en plus son genre sous le titre, lu dans l'univers
  (`genre`), avec l'incise du titre quand il en a une : « Mini-série ·
  Comédie » (`addGenre()`) ;
- **la colonne de droite** — la flèche, la pastille ▶ dessous — a la même
  largeur sur toutes les lignes (44 px, celle de la pastille), pour que le
  texte s'arrête partout au même endroit.

Les **formations** n'ont pas d'illustration : leur année prend seule la
colonne de la vignette, par le CSS seul (`.cv-formation`, pas de script). Une
période s'y lit sur deux lignes, « 2018 » puis « → 2021 ».

Sur **papier**, rien de tout cela : ni vignette, ni ligne de genre, l'année en
pastille et l'état en badge comme avant. Le PDF est identique à celui d'avant
la vignette, au pixel près.

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
| `{ q: 'phrase', by: 'qui la dit' }` | carton plein écran en Cinzel ; `\n` = fin de vers ; ` \| ` = la césure d'un alexandrin (voir plus bas) |
| `{ text: 'un paragraphe…' }` | prose posée : note d'intention, mot de mise en scène |
| `{ p:[12], over:'texte', overAt:'bas' }` | **incrustation SUR la photo**. `overAt` : `gauche`, `centre`, `droite`, `bas`. Sur un groupe (`p: [23, 16]`), elle traverse la composition d'un bord à l'autre — elle y était ignorée sans avertissement |
| `{ p:[12,7], aside:'texte' }` | note en marge, sous les vignettes d'un groupe |
| `{ p:[12], c:['légende'] }` | légende discrète, en petites capitales |

**Tous s'écrivent à la lumière pendant qu'on les lit** (voir
[L'écriture à la lumière](#lécriture-à-la-lumière)) : la lumière part quand la
première ligne passe aux trois quarts de l'écran, et la dernière est écrite
quand elle arrive un peu au-dessus du milieu — lignes l'une après l'autre,
avec un temps à la césure.

**La césure** s'écrit ` | ` dans le vers — `'Que le jour recommence | et que le
jour finisse'` : la lumière s'y arrête un instant, et un filet fin la marque.
La barre ne s'affiche jamais telle quelle.

Le **hero s'en va par couches** au premier geste : le surtitre, la flèche, le
synopsis, puis le titre et l'auteur, qui glissent un peu moins vite que la page
et partent en dernier (`.u-eyebrow`, `.u-couche-*` dans `univers.css`). Les
couches ne se croisent jamais : le synopsis est parti quand l'auteur se met en
route.

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

Le hero fait **exactement un écran**. Le titre s'y pose lettre à lettre, vite
(34 ms), puis le synopsis s'inscrit mot à mot, doucement (108 ms). **Défiler
accélère l'écriture** : le premier geste écrit la page en même temps qu'il la
quitte.

**Avec une ouverture** (voir [Les scènes d'un univers](#les-scènes-dun-univers)),
le synopsis ne s'écrit plus au chronomètre : il s'écrivait dès l'ouverture de
la page, caché au fond de la scène, et paraissait déjà écrit. Il est rendu
en mots de lumière (`revealWords`, `data-ecrire="scene"`), et la lumière
l'écrit ligne à ligne sur la course de la scène, le titre posé — sous le
geste, comme les citations. Ouvert depuis le CV par le passage de la vignette (voir
[Le mouvement](#le-mouvement--la-régie-les-scènes-les-passages)), le titre
arrive déjà écrit — c'est lui qui voyage depuis la ligne — et seul le synopsis
s'inscrit.

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
- **Rien n'est animé en JavaScript au défilement.** Les scènes sont des
  animations CSS que le navigateur fait avancer lui-même ; ailleurs,
  `regie.js` n'écrit qu'un nombre par scène visible (voir
  [Le mouvement](#le-mouvement--la-régie-les-scènes-les-passages)). Aucun
  `filter: blur()` animé : les photos floues sont des copies floutées d'avance.

---

## Le mouvement — la régie, les scènes, les passages

Le mouvement du site suit trois règles : **ne bouger que ce que la carte
graphique sait bouger seule** (transform, opacité — jamais de flou calculé à
chaque image), **confier le défilement au navigateur** quand il sait le lire,
et **donner à chaque scène un état fixe qui a du sens** en mouvement réduit.
Rien ne bat sans fin, rien ne rejoue sans raison.

### La régie (`regie.js`)

Dans un univers, c'est le défilement qui donne les tops : une photo fait le
point quand elle arrive au milieu de l'écran, une réplique s'écrit quand on la
lit, une scène se tient à l'écran le temps qu'il s'y passe quelque chose.

Chaque mouvement est écrit **une fois**, en CSS : des `@keyframes`, un nom
(`--rg-anim`) et une plage dans la progression de sa scène (`--s`, `--e`,
entre 0 et 1) sur un élément `.rg-k`. Deux sortes de scènes : `.rg-scene`, une
scène **tenue** (un conteneur haut dont le décor reste collé), et `.rg-vue`, un
élément qui **traverse** l'écran. Puis deux pilotes :

- le navigateur récent (Chrome, Edge, Safari 26) fait avancer ces animations
  lui-même (`animation-timeline`), hors du fil principal — déclaré dans un
  `@supports`, sans une ligne de script ;
- ailleurs, `regie.js` écrit la progression de chaque scène visible dans `--p`,
  et la même animation, en pause, avance d'un délai négatif (`.regie-repli`).

Le bloc est entre `/* régie:début */` et `/* régie:fin */` dans `univers.css`.
`--s` et `--e` **n'héritent pas** (`@property`) : une vignette de groupe entre
entre 2 et 26 % de sa course, et cette plage, héritée, devenait celle de sa
photo, qui se refloutait sous les yeux. Le drapeau du repli est posé **avant
le premier rendu**, dans l'en-tête de l'accueil et des pages spectacle, avec
le même test que `regie.js` (le contrôle automatique compare les deux).

**Pour regarder le second pilote dans un navigateur qui a le premier :**
ajouter `?repli` à l'adresse (`/spectacles/cleophene/?repli`). Le contrôle
automatique relève les deux et exige les mêmes images.

### Ce que suit une animation au défilement

`view()` — comme une scène `.rg-vue`, qui déclare sa propre ligne de temps —
suit **la boîte de défilement la plus proche**, et `overflow: hidden` en fait
une, même quand rien n'y défile. Une animation posée sous un cadre ainsi rogné
suit ce cadre immobile, et reste figée. Seulement dans les navigateurs
récents : le repli, qui lit la place de la ligne à l'écran, jouait juste, et
rien ne le signalait. C'est arrivé à trois endroits à la fois : l'année des
vignettes du CV restait sous la photo, les citations posées sur les photos
plein cadre ne s'écrivaient pas, leurs légendes restaient à mi-fondu.

D'où deux règles :

- **pour rogner ce qui contient des scènes, `overflow: clip`**, qui rogne de
  la même façon sans créer de boîte de défilement, précédé
  d'`overflow: hidden` pour les navigateurs qui ne connaissent pas `clip`
  (ils n'ont pas de ligne de temps non plus : c'est le repli qui les mène).
  C'est le cas de `.u-fig--plein`, comme du `<body>` pour la barre collante ;
- **une information ne s'anime pas.** L'année des vignettes ne monte plus sur
  la photo : même réparée, la montée la cachait sur les vignettes du bas de
  l'écran tant qu'on n'avait pas défilé.

Le contrôle automatique relève chaque animation menée par le défilement, sur
l'accueil et sur chaque page spectacle, et exige qu'elle suive la page ou le
panneau de l'univers.

### Les scènes d'un univers

| Scène | Ce qu'on voit | Où |
|---|---|---|
| **L'écriture à la lumière** | chaque ligne d'une citation, d'un texte ou d'une incrustation s'écrit pendant qu'on la lit : une fenêtre de lumière la parcourt, avec un temps à la césure | `ecrireALaLumiere` (univers.js) |
| **La mise au point** | chaque photo arrive floue, fait le point au milieu de l'écran, se refloute un peu en partant | `.u-flou`, `-flou.webp` |
| **Le travelling, puis le récit** | la première chose qu'on voit : des photos arrivent du fond du plateau et passent de part et d'autre ; le titre, **seul**, avance avec elles jusqu'à sa place — la page entière qui avançait faisait un grand rectangle. La scène se tient ensuite, le titre posé, et le reste paraît **sous le geste**, un temps après l'autre : la photo du fond se lève de l'ombre, le surtitre s'ouvre du milieu comme un rideau, l'auteur monte d'une trappe, le synopsis paraît en réserve et la lumière l'écrit ligne à ligne ; le rôle monte à son tour, puis le bouton et la flèche, une fois le récit écrit — tout arrivait d'un bloc, déjà écrit. Le bouton ne répond au doigt qu'une fois paru ; au clavier, Tab mène d'un coup au bout de la scène. « Avancer », et une lumière qui descend un rail, invitent à défiler. **La scène a la longueur de son synopsis** : deux écrans de travelling, puis un demi-écran pour cent signes (entre 60 et 140 svh), calculés par `tempoOuverture` et posés en ligne (`--of-hauteur`, `--of-*`) | `tempoOuverture`, `ouvertureHtml`, `panelHtml` (univers-montage.js), `.u-ouverture`, `.u-of-titre` |
| **La photo dans la lettre** | au bout du travelling, le titre posé **détoure la photo** du spectacle : elle paraît dans ses lettres, en pleine lumière. Le récit s'écrit ; alors seulement, une lettre — la porte — grandit jusqu'à ce que l'écran entier y tienne, et l'on entre dans la photo, plein écran ; la page reprend son cours. Voir [La photo dans la lettre](#la-photo-dans-la-lettre) | `detourerLeTitre` (univers.js), `tempoOuverture` (univers-montage.js), `.u-lettre` |
| **Le carton du chapitre** | le premier carton — la durée, une phrase — tient **l'écran entier**, dans sa propre scène tenue, entre le haut de la page et la première photo ; sa phrase s'écrit à la lumière pendant qu'on s'y arrête, et la caméra s'en approche imperceptiblement. Puis **le noir, dans une salle sombre** ; dans une salle claire, le carton s'efface dans le papier — un écran noir sur le parchemin de L'Homme moderne passait pour une page cassée. La salle est lue sur le fond de la palette (luminance relative sous 0,18 : sombre) | `cartonHtml`, `salleDe` (univers-montage.js), `.u-carton` |
| **La signature lumineuse** | après le carton, la première photo attend dans la pénombre — un cinquième de sa lumière, plus un rectangle noir —, ou, dans une salle claire, dans le papier, comme une épreuve dans le révélateur ; elle s'allume — ou se révèle — à la façon du spectacle — foudre, néon, guirlande, torche, lumière crue, projecteur — dès qu'elle entre dans le quart inférieur de l'écran | `voileHtml`, `.u-allumage` (`--u-voile-teinte`), `guetterAllumage` |
| **La poursuite** | sur une photo de groupe choisie, la pénombre, une ou deux poursuites qui vont d'un comédien à l'autre, puis plein feux | `poursuiteHtml`, `.u-poursuite` |

Ce que les données en disent (voir aussi l'en-tête de `univers.js`) :

```js
lumiere: 'foudre',            // foudre | neon | guirlande | torche | crue | projecteur
                              // sans mention : crue (spectacle), projecteur (film)
ouverture: [5, 21, 20, 7],    // les photos du travelling — sans mention, quatre
                              // photos réparties dans le montage, jamais la première ;
                              // moins de deux photos : pas de travelling, le titre
                              // ouvre la page
{ p: [9], poursuite: { etapes: [ [[20, 48], [83, 48]], [[51, 60]] ] } }
                              // chaque étape éclaire un ou deux points, en %
                              // de la photo (horizontal, vertical) ; `ratio`
                              // si la photo n'est pas en 3:2
```

Pour placer une poursuite : ouvrir la photo (`ressources/images/univers/<slug>/<n>.jpg`),
relever la position des visages en pourcentage, écrire les étapes, régénérer
les pages, et regarder la scène — la photo y est montrée entière.

**En mouvement réduit** : l'ouverture se réduit au haut de la page, posé, le
carton du chapitre à un carton, sans noir, la poursuite à sa photo en plein
feux, la première photo est allumée d'emblée, le texte est écrit. **Sans
JavaScript** (`univers-statique.css`), même chose.

**Le haut de la page, dans le travelling, ne se défait pas par couches** comme
en tête de page : ses couches y ARRIVENT, sur la course de la scène, et
repartent d'un bloc avec elle. Leurs animations de sortie suivraient ici la
course de la scène entière et les effaceraient en plein travelling — vérifié
dans Chromium : un élément dans une scène collée (`sticky`) a une course
étalée sur toute la scène. La scène rogne en `overflow: clip`, pas `hidden`,
qui en ferait une boîte de défilement : tout ce qu'elle contient suivrait ce
cadre immobile. Le titre garde la perspective de la scène — chaque niveau
entre les deux est en `preserve-3d`, sans rien qui groupe (opacité, rognage,
filtre) : il part du point de fuite des photos, au milieu de l'écran. Ce
`preserve-3d` fait aussi du hero le repère de ce qu'il place en absolu : la
flèche suivait sa boîte, un écran plus ses marges, et tombait sous l'écran ;
marges comprises (`box-sizing: border-box`), il fait un écran. Sur un écran
bas (moins de 700 px), la flèche tombait sur le bouton : elle n'y est pas.

### La photo dans la lettre

Demandé ainsi : « après le travelling avant, on arrive sur le titre qui
détoure la photo de fond ; quand on défile, ça fait apparaître tous les textes
(synopsis, auteur…), et ensuite seulement on zoome dans le titre sur la
photo ». La scène de l'ouverture a donc un temps de plus :

1. **le travelling**, le titre qui avance seul (inchangé) ;
2. **le titre posé détoure la photo** (`--of-lettre-*`, autour de la pose) ;
3. **le récit s'écrit** (inchangé) ;
4. **une pause**, puis **la lettre s'ouvre** (`--of-zoom-*`, 130 svh), et la
   photo tient l'écran 30 svh avant que la page reprenne.

**La photo où l'on entre n'est pas la couverture.** La couverture reste le fond
du titre (c'est elle que devient la vignette du CV), mais c'est aussi la
première photo du montage, celle qui s'allume juste après le carton : on
l'aurait vue deux fois de suite. `photoLettre` (univers-montage.js) prend une
photo plein cadre — elle a sa version 1920, faite pour remplir un écran —,
la plus loin dans le montage, qui n'est pas passée dans le travelling ; elle
est cadrée comme dans le montage (`data-lettre-pos`). Un univers peut la
choisir lui-même :

```js
lettre: 12,      // la photo où l'on entre par le titre (sans mention :
                 // la dernière photo plein cadre hors du travelling)
```

`tempoOuverture` compte ces temps en svh (`OUVERTURE_PAUSE`, `OUVERTURE_ZOOM`,
`OUVERTURE_TENUE`) ; la scène s'allonge d'autant.

**C'est un calque SVG posé sur le titre** (`detourerLeTitre`, dans
`univers.js`), pas le titre lui-même : la photo de couverture (`<image>`, cadrée
comme `.u-hero-fond`) n'y paraît qu'à travers un masque fait des lettres du
titre, placées une à une là où la mise en page a posé chacune
(`offsetLeft`/`offsetTop`, qui ignorent la perspective de la scène), sur leur
ligne de base (mesurée par une sonde). Le vrai `h1` reste dessous, du texte,
lu par les lecteurs d'écran et les moteurs ; le calque est décoratif. Un trait
d'un pixel et demi autour de chaque lettre du masque couvre les écarts
d'arrondi. Refait quand la largeur change, comme l'écriture à la lumière.

**Le calque est peint sur la scène, hors de sa profondeur** : enfant direct
de `.u-of-scene`, qui n'est pas en 3D, avec un `z-index`. Posé à côté du titre,
dans le haut de la page en perspective, il était à la même profondeur que les
textes, et le navigateur décidait qui passait devant : sur téléphone, les
textes repassaient par-dessus la photo au bout du zoom.

**Lire le titre quelle que soit la photo.** Une photo sombre dans les lettres,
sur une salle sombre, les rendait illisibles par endroits (le noir d'une robe
sur le noir du plateau). Deux aides, dans la couleur du texte de la salle
(`--u-text` : claire dans une salle sombre, sombre dans une salle claire) : un
voile à 30 % sur la photo des lettres, et un filet d'1,2 px autour de chacune
(`.u-lettre-aide`). Elles s'effacent sur le premier tiers du zoom — dans la
photo, il n'y a plus de titre à lire — et restent en mouvement réduit.

**Les mots du vrai titre s'effacent** pendant que leurs lettres de photo
paraissent (`.u-lettre-sous`, sur la même plage) : posées exactement dessus,
elles le couvraient au repos, mais la porte qui s'ouvre le découvrait — un
second titre, blanc, derrière la photo (vu sur téléphone, sur *À la barre*).
Ce sont les mots qui s'effacent, pas le `h1`, qui garde sa propre course.

**La porte** est la lettre au trait le plus épais près du milieu de l'écran :
chaque lettre est dessinée dans un canevas, et une transformée de distance y
trouve le point le plus loin de tout bord — celui dont même le pire voisin, à
quatre pixels, reste loin d'un bord : le canevas et la page ne posent pas la
lettre au pixel près, et un point pris à la jonction de deux traits tombait,
sur la page, au bord du trait. Le zoom se fait autour de ce point, jusqu'à
`--lettre-z` (l'écran entier dans l'encre de la lettre, 120 fois au plus : au
delà, le navigateur cesse de dessiner le glyphe). Il s'accélère, comme une
caméra qui passe une porte. Sur le dernier sixième du zoom, **la photo entière**
(`.u-lettre-plein`) prend le relais : la scène finit toujours sur la photo,
plein écran, quelle que soit la lettre.

La photo, par-dessus le reste du haut de la page, efface le récit en
grandissant : rien d'autre n'a à partir. En mouvement réduit, le titre détoure
la photo, posé, sans zoom. Sans photo de couverture, pas de calque : le titre
d'avant.

### L'écriture à la lumière

Les mots restent dans la page — lus par les lecteurs d'écran, indexés —, en
retrait ; la lumière est une copie décorative de chaque ligne, posée dessus
(`poserLaLumiere`) : une fenêtre qui glisse de gauche à droite pendant que son
texte glisse en sens inverse. Deux déplacements, rien à repeindre.

Les lignes sont **mesurées dans la mise en page** (`offsetLeft`, `offsetTop`),
pas à l'écran : un texte posé dans une scène en profondeur (le synopsis, dans
l'ouverture) serait mesuré réduit par la perspective, et ses fenêtres ne
couvriraient qu'un coin du texte. Elles sont refaites quand la largeur change.
Dans une scène tenue (`data-ecrire="scene"`), le texte s'écrit sur la course
de la scène, entre les deux fractions qu'il porte (`data-de`, `data-a`) :
c'est le cas du synopsis dans l'ouverture et de la phrase du carton.

### Les passages (View Transitions)

| Passage | Ce qui voyage |
|---|---|
| une ligne du CV → son univers, et retour | la boîte de la ligne, sa vignette (qui devient le **fond du titre**, `heroFondHtml`), son titre — `open`/`close` dans univers.js. Quand l'univers s'ouvre sur son travelling, le titre est au fond de la scène, pas encore là : seule la boîte voyage, et le titre s'écrit lettre à lettre au fond (`titreAuFond`) |
| le répertoire, l'onglet Dates → une page spectacle | la vignette → le fond du titre de la page (`fiche-<slug>`, entre documents) |
| une vignette du book → la photo, et retour | la photo (`book-photo`) |
| un onglet → un autre | la page, dans le sens de l'onglet ; la pastille glisse |
| le thème | un cercle depuis le bouton |
| l'ouverture → le site | un iris depuis le sceau ; le nom rejoint l'en-tête |

Chaque passage nomme ses éléments **juste avant** et retire les noms juste
après : un nom qui traîne sur un élément fausse le passage suivant. La petite
image ne se montre jamais en grand : une vignette de 48 px agrandie à l'écran
n'est qu'un flou vif — elle s'efface tôt à l'aller, et arrive tard au retour.
Navigateur sans View Transitions, ou mouvement réduit : l'ancien comportement
(dépliement en `clip-path`, fondu, coupe franche).

### Le vocabulaire

`--ease-out` pour ce qui apparaît, `--ease-panel` pour ce qui se replie,
**`--ease-ressort`** (une courbe `linear()` qui dépasse sa cible de 4 % et s'y
pose) pour ce qui se **déplace** — la pastille des onglets, une vignette qui
devient page. `--dur-scene` (460 ms) pour un changement d'onglet,
`--dur-morph` (620 ms) pour une vignette qui s'ouvre. Les pages spectacle
relisent ce vocabulaire dans `index.html` : les régénérer après l'avoir changé.

### Le CV, le bandeau, la page 404

- **La frise**, telle que le prototype de l'audit la proposait (« La frise
  qui s'allume »). Une **ligne de lecture** court aux trois quarts de
  l'écran, à l'entrée de son quart inférieur (`--ligne-lecture: .75`, une
  seule valeur pour la frise du CV, celle des mois de l'onglet Dates, les
  deux pilotes et les vérifications) : ce qu'on va lire arrive par le bas
  et se découvre dès qu'il monte dans l'écran — au milieu, où elle était, le
  bas de l'écran restait voilé. Un fil
  d'or se trace le long du bord **gauche** de la liste, dans la marge de la
  carte, jusqu'à elle ; sur le fil, au milieu de chaque ligne, un **point**
  dans la couleur du spectacle éclôt quand elle l'atteint (× 1,3, puis il se
  pose) ; et le fil **découvre** les lignes : chacune reste voilée (opacité
  .38) tant qu'il ne l'a pas atteinte, et elle est pleine quand la pointe du
  fil touche son haut. Voilée, jamais effacée : tout s'y lit, et la souris,
  le clavier ou le murmure la rendent pleine à l'instant — **pas le doigt qui
  fait défiler** : le téléphone garde le survol de la dernière ligne touchée,
  qui restait pleine avant que le fil l'atteigne. Le point ne répond qu'au
  fil. Rien de coloré ne court
  plus à droite — ni filet, ni lavis au passage (le lavis ne répond plus qu'à
  la souris et au doigt) ; le halo des vignettes « tournée » et « création »
  s'allume avec le point. Tout est lié au défilement — plus d'horloge, donc
  rien qui rejoue après un survol, comme le faisait la guirlande. Pilotes : `view(0px)` en natif — sans cet encart nul, `view()`
  retranche de l'écran le `scroll-padding-top` du html (84 px), et le fil
  courait jusqu'à 84 px devant la ligne de lecture ; `--ph` et `--pt` (la
  place de la ligne, en hauteurs d'écran) écrits par `regie.js` ailleurs
  (`.rg-ligne`) — tant qu'ils manquent, le fil et les points supposent la
  ligne sous l'écran, le voile la suppose lue.
  Voir « La frise » dans `index.html`. **L'année, elle, ne bouge pas** : elle
  montait sur la vignette depuis le bas du cadre, et toutes les années ont un
  jour disparu (voir ci-dessous) ; même réparée, la montée laissait sans année
  les vignettes du bas de l'écran. Une information ne s'anime pas.
- **L'ambiance** (la salle aux couleurs du spectacle survolé) n'hérite plus :
  la cible (`--ambiance-cible`) change une fois par geste, et seuls ses deux
  consommateurs — la lueur et la barre collée — glissent vers elle. Survoler
  une ligne recalculait les 2 276 éléments du document à chaque image.
- **La prochaine date du CV** (`renderNextDate`). Une ligne de tableau de
  gare, en palettes : chaque palette est faite de quatre
  moitiés — le haut et le bas fixes, et deux volets qui battent en `rotateX`
  (Web Animations API) : le haut de l'ancienne lettre tombe, le bas de la
  nouvelle se pose. Chaque palette passe par trois à sept lettres de son jeu
  (un chiffre parmi les chiffres, une lettre parmi les lettres ; une lettre
  accentuée se pose sur son accent en dernier), dans l'ordre de lecture,
  22 ms d'une palette à l'autre : moins de deux secondes. Une seule fois, quand
  le tableau est à l'écran, après le rideau et les polices — et s'il ne l'est
  plus au moment de battre (une adresse qui vise l'onglet Dates montre le CV
  un instant), il attend qu'on revienne. Pendant le
  battement (classe `td-roule`), les volets restent sur leur calque, repliés
  hors de vue entre deux battements, et chaque palette est isolée
  (`contain: strict`) : mesuré sur un téléphone lent simulé (processeur
  ralenti six fois), l'image médiane reste à 60 par seconde pendant le
  battement. Des données qui changent pendant le battement (la base en
  direct) posent aussitôt les bonnes lettres ; avant, elles le relancent.
- **La servante** (`404.html`). La page perdue est un plateau vide où la
  servante reste allumée ; l'ampoule hésite deux fois puis se tient, le
  pointeur éclaire la scène comme une lampe de poche. Thème clair compris.

---

## Ajouter une photo au book

1. Déposer l'image dans `ressources/images/galerie/`
2. L'ajouter dans `GALLERY_IMAGES` (`galerie.js`), **avec son `alt`** : une
   phrase qui dit ce que montre la photo. C'est tout ce qu'en perçoit un
   lecteur d'écran, et tout ce qu'en lit un moteur de recherche d'images.
   Sur une photo de plateau à plusieurs, décrire la scène, pas qui est qui.
3. Fabriquer ses vignettes, puis la page :

```bash
python3 build/variantes-images.py
node build/generer-page-galerie.js
node build/generer-pages-spectacles.js   # pour la date du sitemap
```

Les vignettes gardent **le cadre de la photo**, en trois largeurs — 320, 640
et 960 px — dans `ressources/images/galerie/vignettes/`. La page en annonce la
taille affichée (`sizes`) et le navigateur prend la plus petite qui suffit ;
les boutons − et + de la page la réécrivent quand la planche change. Les
anciennes vignettes de 176 px (`thumbs/`) étaient étirées sur 300 à 500 pixels
d'écran : floues, justement là où l'on juge un visage.

### La planche contact

La galerie coupait chaque photo en 3:4, le format de sa grille : douze photos
sur dix-neuf sont plus larges que hautes, et y perdaient en moyenne la moitié
de leur image — le décor, le partenaire, la salle —, jusqu'à 58 % pour les
images de film en 16:9. C'est désormais une **planche contact** : chaque photo
garde le cadre du photographe, et chaque rangée a la même hauteur.

**Sans une ligne de script pour la mise en page.** Le générateur lit les
proportions de chaque vignette dans l'en-tête du fichier WebP
(`dimensionsWebp`) et les écrit sur la case (`--r`, largeur sur hauteur). Une
case part de la largeur qu'aurait sa photo à la hauteur visée
(`flex-basis: --r × --h`), et grandit à proportion de `--r`
(`flex-grow: --r`) pour remplir la rangée : deux cases qui grandissent à
proportion de leur largeur gardent la même hauteur. La dernière rangée ne
s'étire pas (`::after`, qui prend le reste). La hauteur visée `--h` suit la
densité — la largeur de la planche divisée par `--colonnes`, le nombre de
colonnes qu'avait la grille à ce cran : les boutons − et + gardent leur sens.

Sous chaque photo, son numéro de vue (`01A`, `02A`…), orangé comme les
marques d'un film ; au survol ou au clavier, **le crayon gras** — un cercle
rouge un peu tremblé, tracé d'un geste, comme on entoure sur une vraie planche
la vue qu'on garde. Posé d'un coup en mouvement réduit.

Les photos en pleine résolution ne sont téléchargées qu'à l'ouverture de la
visionneuse, une par une : inutile de les compresser à l'extrême, mais rester
sous ~300 Ko.

---

## Images générées (à ne pas écraser sans les régénérer)

| Fichier | Rôle |
|---|---|
| `ressources/images/portrait-affiche-{480,720,960}.webp` et `-720.jpg` | le [portrait d'affiche](#le-portrait-daffiche) de l'en-tête — `python3 build/variantes-images.py`, depuis la première photo du book |
| `ressources/images/profil-192.webp` | le médaillon de l'en-tête **imprimé** (le CV en PDF) ; `profil-192.jpg` et `profil-384.*` ne servent plus |
| `ressources/images/miniatures/bande-demo-{hommemoderne,lerapt}-640.webp` | les deux plans de la [bobine](#la-salle-de-projection) : les images que YouTube tire lui-même de la vidéo (`maxres2.jpg`, `maxres3.jpg`), bandes noires ôtées — à refaire à la main si la bande démo change |
| `ressources/images/og-adrien-vada.jpg` | vignette de partage (réseaux sociaux, 1200×630) |
| `ressources/images/miniatures/bande-demo-camera.{jpg,webp}` | miniature de la bande démo |
| `ressources/images/galerie/vignettes/<nom>-{320,640,960}.webp` | vignettes du book — `python3 build/variantes-images.py` |
| `ressources/images/univers/<slug>/<nom>-{640,1280}.webp` (et `-1920` pour un plein cadre) | versions allégées des photos d'univers, servies aux écrans de moins de 900 px et au répertoire — même script, lancé aussi par `prepare-univers-photos.py` |
| `ressources/images/univers/<slug>/<nom>-240.webp` | la **couverture** de chaque univers (la première photo de son montage), en vignette dans l'onglet Dates rangé par spectacle et sur chaque ligne du CV — même script |
| `ressources/images/univers/<slug>/<nom>-flou.webp` | la **photo hors point**, 200 px passés au flou : la mise au point des univers fond la photo nette dessus (voir [Le mouvement](#le-mouvement--la-régie-les-scènes-les-passages)) — même script |

Les **sources** de ces images restent dans le dépôt et ne sont plus servies aux
visiteurs : `profil2_1080x1080.png` (avatar) et `profil_1000x1000.jpg`
(vignette de partage + book). Les régénérer si l'on change de portrait.

`build/variantes-images.py` ne refait que ce qui manque (pour ne pas laisser
de diff sans objet) ; `--tout` refait tout, `--nettoyer` efface les versions
dont l'original a disparu. Pourquoi 1920 px pour un plein cadre : sur un
téléphone tenu droit, une photo en paysage y est agrandie jusqu'à couvrir
toute la hauteur — trois à quatre fois la largeur de l'écran. Sur un écran
large, rien ne change : c'est l'original qui est servi.

---

## Référencement

- Le domaine canonique est **`https://adrienvada.fr`** : ne pas réintroduire
  d'URL en `adrienvada.github.io` dans les balises `og:`, `canonical`,
  `robots.txt` ou `sitemap.xml`.
- Les données structurées « fiche artiste » (`Person`) sont dans le `<head>` ;
  les représentations (`TheaterEvent`) sont générées automatiquement depuis
  les dates au chargement — rien à maintenir à la main. Elles sont
  fabriquées par **une seule fonction**, `evenementTheatre` dans
  `univers-montage.js`, que l'accueil appelle en direct et le générateur des
  pages spectacle à la génération : heure et fuseau de Paris, adresse
  structurée (ville, pays, département), organisateur, billetterie, fin
  déduite de la durée. Les **séances scolaires** n'y figurent pas : elles ne
  sont pas ouvertes au public.
- **L'image** d'une représentation est la photo du spectacle (son affiche, ou
  la première photo de son montage). Un spectacle sans photo prend celle de
  l'interprète, `og-adrien-vada.jpg`, la photo de partage du site : la Search
  Console relevait « Champ "image" manquant ».
- **Ni prix ni devise** dans l'offre de billetterie : la base des dates n'en a
  pas, et les inventer serait pire que le silence. La Search Console relève
  « Champ "price" manquant » et « "priceCurrency" manquant » : ce sont des
  suggestions, pas des erreurs, et l'événement s'affiche quand même. Pour
  les faire taire, il faudrait un tarif par date dans `/admin/`.
- Le titre et la description de chaque page spectacle sont écrits pour une
  liste de résultats : « Bérénice · Compagnie Crescite · Adrien Vada », puis
  « Bérénice, Compagnie Crescite — avec Adrien Vada (Antiochus). Rome, an
  79… », coupée à 155 signes sur un mot entier (voir `titreDe` et
  `descriptionDe` dans le générateur).
- `sitemap.xml` **n'est plus écrit à la main** : il est régénéré par le script
  des pages spectacle (ci-dessous). Chaque `<lastmod>` est le **jour où la page
  a réellement changé** — la date de son dernier commit si elle ressort
  identique, celle du jour sinon — et non plus la date du passage du script,
  qui datait tout le site du jour à chaque fois (un moteur finit par ignorer
  une date qui ment toujours).

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

**Le mouvement aussi vient de l'accueil.** `univers.css` règle ses transitions
sur le vocabulaire du site — deux courbes, quatre durées (`--ease-out`,
`--dur-base`…) — qu'il ne définit pas : c'est `index.html` qui le pose sur sa
racine. Une page spectacle ne charge pas `index.html`, et une `transition`
qui nomme une variable absente est rejetée en bloc par le navigateur : sur
ces pages, les lettres du titre, les mots du synopsis et les photos
arrivaient d'un coup, sans leur flou ni leur fondu, alors que le moteur
tournait. Le générateur relit donc ce vocabulaire dans `index.html`
(`chargerMouvement()`) et le pose dans le `<style>` de chaque page ; il
échoue si `univers.css` nomme une durée qu'`index.html` ne définit pas.
**Changer une courbe ou une durée dans `index.html`, c'est donc relancer
le générateur.**

**Le haut de page aussi.** La page lit la ligne du CV comme le panneau
(`rowInfo()`) : l'auteur de l'incise du titre (« Racine ») sous le titre
quand l'univers n'a pas de `subtitle`, et le rôle avec son libellé
(« Rôle · Antiochus »). Le contrôle automatique compare les deux, spectacle
par spectacle.

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

## Polices — servies par le site

Inter, Montserrat, Cinzel et Caveat sont dans `ressources/polices/`, déclarées
par `polices.css` ; licence SIL OFL 1.1 (voir `LISEZMOI.txt`). Elles venaient
de Google Fonts : une feuille bloquante sur un autre domaine, deux connexions
de plus avant le premier rendu, et l'adresse de chaque visiteur transmise à
Google. Chaque famille tient en deux fichiers (`latin`, `latin-ext`, ce
dernier ne se chargeant que pour un caractère qu'il est seul à avoir).
L'accueil demande d'avance Montserrat et Inter (`preload`), les pages
spectacle Cinzel et Inter. Pour changer de version : voir `LISEZMOI.txt`.

---

## Accessibilité — ce qui est tenu, et comment

Contrôlé avec axe (WCAG 2.2 AA) sur les quatre onglets, les deux thèmes,
mobile et bureau, l'univers ouvert, les pages spectacle, le répertoire, la
galerie et l'administration. À garder en tête en modifiant le site :

- **Une couche ouverte rend le reste inerte.** Univers, photo agrandie,
  agenda, récit, visionneuse de la galerie : tout ce qui est dessous reçoit
  `inert` (voir `isolerCouche` dans `univers.js`) — la touche Tab ne
  s'échappe plus derrière, un lecteur d'écran ne lit plus la page cachée —
  et le focus revient à la fermeture sur ce qui l'avait ouverte.
- **Un panneau replié est hors d'atteinte** : `visibility: hidden` en plus de
  la hauteur nulle (tiroirs du CV, séries de dates, filtres, archives). Sans
  cela, le clavier parcourait des liens invisibles.
- **Un texte animé lettre à lettre reste un mot** : lettres en
  `aria-hidden`, mot entier en `aria-label` (titre des univers). Pas de
  copie masquée du texte : un moteur la lirait collée aux lettres.
- **Une page, une hiérarchie** : sur une page spectacle le titre est un h1 et
  tous les titres du montage montent d'un cran (voir la fin de `panelHtml`).
- **Rien ne bouge sans fin** : voyant de la prochaine date, halo des univers, sceau de
  l'ouverture, fleuron et dorures du répertoire jouent une fois (ou trois)
  puis se taisent (WCAG 2.2.2) ; la frise du CV et les scènes des univers ne
  bougent qu'avec le défilement. Le réglage « réduire les animations » coupe
  tout, et chaque scène a alors un état fixe qui a du sens.
- **Pas de texte sous 11 px**, pas de cible sous 24 px (la piste des démos
  voix et les icônes du pied de page ont une zone de clic agrandie sans
  changer d'aspect).
- **Le pincement appartient au navigateur** : il agrandit la page. La densité
  du répertoire et de la galerie se règle aux boutons − et +.
- **Un lien qui ouvre un onglet le dit** (« nouvel onglet », en texte masqué).
- **Les couleurs de spectacle sont mesurées** : un accent trop pâle pour le
  texte a son encre (`accentInk`) plus foncée — voir les palettes de
  `univers.js`.

Ce qu'axe signale encore, et qui n'est pas un défaut : les cartes du
répertoire encore sous l'écran (transparentes jusqu'à leur entrée — elles
restent lisibles par un lecteur d'écran) et un bouton d'agenda qui passe un
instant sous la croix de fermeture en défilant.

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

## Le portrait d'affiche

Pour un comédien, le visage est la première information. L'en-tête le
montrait dans un médaillon de 90 px : 0,7 % du premier écran d'un ordinateur
(1280 × 900), 1,6 % d'un téléphone. Sur l'onglet CV, **l'en-tête devient une
affiche** : le portrait sur toute sa hauteur à gauche (340 × 425 px, 12 % de
l'écran), toute la largeur au téléphone (37 %), le nom posé sur le bas de la
photo ; en regard, le nom en Cinzel, la fiche de casting en six cases
étiquetées (taille, chant, instrument, langues, armes, conduite), le mail et
les liens. Le nom mêlait Montserrat et Cinzel ; il est en Cinzel, comme au
répertoire, à la galerie et à la 404.

- **Une seule image pour l'affiche et le médaillon** : la photo de
  présentation du book (la première de `galerie.js`), à son cadre, en trois
  largeurs (`portrait-affiche-*`, faites par `variantes-images.py`). `sizes`
  annonce la taille de l'affiche, la plus grande.
- **Hors de l'onglet CV**, l'en-tête redevient la carte compacte d'avant,
  portrait en médaillon (`.replie`, posé par `showPage`, à côté du repli de la
  bio). Arriver sur un autre onglet (`#page_dates`, `#demos_camera`,
  `#demos_voix`) pose `arrivee-hors-cv` sur `<html>` avant le premier rendu :
  l'affiche n'est jamais peinte pour être repliée.
- **La poursuite** : sur le portrait, la salle autour du visage est dans
  l'ombre ; à la souris, la lumière suit le pointeur (`suivrePoursuite`).
  Fixe au doigt et en mouvement réduit.
- **Le papier ne bouge pas.** Toute la mise en page de l'affiche est en
  `@media screen` ; les classes Tailwind du balisage et les règles d'impression
  sont celles d'avant, et le médaillon imprimé est `profil-192.webp` (une
  `<source media="print">`) — le PDF garde son poids (259 Ko) et sa page.
  Quelques règles de l'affiche portent `!important` : elles répondent à celles
  de la mise à l'échelle du téléphone (« Global text scale-down »).

## La salle de projection

La bande démo était une vignette dans une carte, et rien ne disait ce
qu'elle contenait. Elle est posée dans **une salle** (`#salle`, noire dans
les deux thèmes) : l'écran au milieu, sa lumière qui déborde autour, et
dessous **la bobine** — un plan par extrait, qui lance le film à ce moment-là :

| Extrait | Début (`data-salle-debut`) |
|---|---|
| L'Homme moderne | 0 s |
| Le rapt | 81 s (1:21) |

- **Le halo** : le plan réduit à 32 × 14 points dans un canevas, agrandi et
  flouté une fois pour toutes par la feuille (`.salle-halo`) — le flou n'est
  jamais animé, seule l'opacité l'est, en passant d'un canevas à l'autre. Sur
  la page, il peint l'affiche au repos et l'extrait survolé sur la bobine.
- **La salle noire** : lancer la projection ouvre `#video-modal`, dont la
  lumière baisse lentement (1 s) ; l'écran y garde son halo, et une bobine
  mène d'un extrait à l'autre sans quitter la salle. Le lecteur YouTube est
  chargé avec `enablejsapi=1` : on lui parle par messages (`seekTo`,
  `playVideo`) et il annonce son temps écoulé, sans charger son script. Le
  halo suit ainsi **l'extrait en cours** — pas chaque image : YouTube ne
  laisse pas lire les siennes.
- Les deux plans de la bobine sont des images que YouTube tire lui-même de la
  vidéo, bandes noires ôtées. **Si la bande démo change**, les refaire
  (`https://i.ytimg.com/vi/<id>/maxres1.jpg` à `maxres3.jpg`, au quart, à la
  moitié et aux trois quarts), et remettre les débuts des extraits dans la
  bobine et dans `DEBUTS` (`index.html`, « LA SALLE DE PROJECTION »).

## Démos voix — les ondes

Chaque barre de lecture montre **la forme de son enregistrement** : on voit
la voix monter, respirer, se poser, avant même d'écouter, et on touche l'onde
là où l'on veut entendre. Les huit démos avaient toutes la même barre plate.

La forme n'est pas calculée chez le visiteur — il faudrait télécharger et
décoder chaque fichier (jusqu'à 3 Mo) pour dessiner une barre. Elle l'est une
fois pour toutes par **`build/ondes.js`**, qui décode chaque MP3 dans le
Chromium des vérifications et écrit sur sa barre :

- `data-onde` : 200 niveaux, un caractère chacun (`0`–`9` puis `a`–`z`) —
  l'énergie de la voix tranche par tranche, adoucie (puissance 0,8) pour que
  les passages murmurés restent visibles. 200 octets par démo ;
- `data-duree` : la durée, en secondes — la bulle du survol dit le temps visé
  avant même que le fichier soit chargé (`preload="none"`).

```bash
node build/ondes.js     # après avoir ajouté ou remplacé une démo
```

Le dessin (`dessinerOnde`, dans `index.html`) est un canevas par barre,
redessiné quand la lecture avance, au survol, quand la largeur change et quand
le thème bascule — ses couleurs sont lues dans les jetons (`--c-gold` pour ce
qui est lu, `--c-s300` pour ce qui reste). La barre garde son rôle de curseur,
son clic, ses flèches et le repli sans en-têtes Range. Sans script, la piste
d'avant.

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

**La barre de lecture** (`allerDansLaDemo`, dans `index.html`). Un navigateur
ne saute au milieu d'un fichier que si le serveur lui en sert des morceaux
(en-têtes Range). GitHub Pages le fait ; l'aperçu de branche sur Cloudflare,
non — toucher la barre y ramenait au début de l'extrait. Quand le point visé
n'est pas atteignable, le fichier est lu en mémoire (il vient d'ordinaire du
cache, puisque la démo joue) et l'on saute dedans ; la lecture reprend si elle
jouait. Clic, toucher et clavier passent par le même chemin.

---

## Pages privées (le château-mystère)

Le château-mystère (`/chateau-mystere-2026-V1/`) vivait dans son propre dépôt,
que GitHub servait sous ce même domaine. **Il n'est plus servi** : l'adresse
rend une erreur 404 depuis septembre 2026. `robots.txt` ne le mentionne plus —
ce fichier est public, et y désigner une page privée revenait à la signaler à
qui le lit.

La règle vaut pour toute page privée à venir : elle porte
`<meta name="robots" content="noindex, nofollow">`, et elle n'est **volontairement
pas** interdite dans `robots.txt`. Un robot doit pouvoir entrer pour lire la
consigne de désindexation ; un `Disallow` ferait l'inverse de ce qu'on cherche
— l'adresse resterait indexable depuis un lien extérieur, sans qu'aucune
consigne ne puisse plus l'en déloger. **Ne pas ajouter de `Disallow`.**

---

## Mesure d'audience

Umami (compte européen), balise dans le `<head>` de **toutes** les pages. Sans
cookie, sans identifiant persistant, sans recoupement entre sites : la mesure
reste dans le cadre que la CNIL exempte de consentement, et le site n'a donc
pas de bandeau à imposer en premier écran.

**Où vit la balise.** Trois endroits, et pas un de plus :

| Page | Écrite par |
|---|---|
| `index.html` | à la main, avec l'interrupteur (voir plus bas) |
| `404.html` | à la main |
| `/spectacles/` et les onze pages spectacle | `build/generer-pages-spectacles.js`, constante `MESURE` |

Ne pas oublier une page en ajoutant une page : pendant longtemps `index.html`
était seule à compter, alors que les pages spectacle sont précisément celles
qu'on fabrique pour être trouvées — douze adresses du sitemap sur treize ne
disaient rien.

Tout passe par **`track(nom, details)`** — aucun appel direct à `umami`
ailleurs dans le code, pour n'avoir qu'un endroit à changer le jour où l'on
change d'outil. Si l'outil n'a pas chargé (bloqueur, réseau), `track()` ne fait
rien : aucune fonctionnalité du site ne dépend de la mesure.

`track()` est défini par `index.html`. Les pages spectacle, qui ne chargent pas
ce script, reçoivent le **même** `track()` et la même délégation des
`data-track` de `univers.js` (`brancherMesure`), avec le même verrou
« `?sansmesure` » : leurs clics « Réserver » ne comptaient nulle part
auparavant. Les boutons « Réserver » des univers portent `date_booking`,
comme ceux de l'onglet Dates — sur l'accueil comme sur les pages spectacle.

Deux façons de relever un geste :

| Voie | Comment |
|---|---|
| **Déclarative** | `data-track="nom"` sur un lien ou un bouton, `data-track-detail="…"` en option. Fonctionne aussi sur ce qui est fabriqué après coup (dates, bandeau, filtres). |
| **Explicite** | `track('nom', { … })` là où le geste n'est pas un clic. |

Événements en place. Ce qu'on a **regardé** :

`entree` (onglet d'arrivée), `intro` (coupée ou menée au sceau, et durée),
`univers_ouvert` / `univers_ferme` (spectacle, durée de lecture), `demo_ecoute`
(jalons 25 / 50 / 75 / 100 %, une seule fois par démo et par visite),
`dates_vue` (rangement choisi dans l'onglet Dates : `date` ou `spectacle`),
`date_spectacle` (la page d'un spectacle ouverte depuis l'onglet Dates : son
nom).

Ce qu'on a **fait** — les gestes qui sortent du site, et les seuls qui disent
qu'un directeur de casting a fini de regarder :

`contact_mail` (`en-tête` ou `pied` — l'e-mail figure deux fois, et l'on veut
savoir lequel travaille), `cv_pdf` (`bureau` ou `mobile` : un seul lien,
dont le détail suit la largeur de l'écran, 768 px), `fiche_pro`
(`agences-artistiques`, `filmmakers`), `reseau` (`instagram`, `linkedin`,
`spotify`), `demo_youtube`, `date_agenda`, `date_booking`, `banner_next_date`
(la prochaine date du CV, ouverte dans l'onglet Dates : le nom du spectacle).

**Ne jamais transmettre autre chose que ce que la page affiche déjà** : noms de
spectacle, noms de démo. Rien qui identifie qui que ce soit.

### Ne pas se compter soi-même

`adrienvada.fr/?sansmesure` coupe la mesure sur l'appareil, `?sansmesure=0` la
rétablit. Une adresse, donc un signet : la méthode officielle d'Umami passe par
la console du navigateur, ce qui sur un téléphone n'est pas une manœuvre qu'on
refait volontiers. Tant que c'est coupé, un petit mot passe en bas de l'écran
à chaque visite — un interrupteur qu'on ne voit pas est un interrupteur auquel
on ne croit pas.

Trois verrous, posés ensemble parce qu'aucun des deux premiers n'a pu être
vérifié depuis l'atelier (le proxy n'atteint pas `cloud.umami.is`) :

1. `umami.disabled` — le verrou d'Umami, qui coupe les pages vues. Le stockage
   local étant commun au domaine, il vaut d'un coup pour les quatorze pages.
2. `data-before-send="avAvantEnvoi"` sur la balise d'`index.html` — Umami
   demande son avis avant chaque envoi.
3. le garde en tête de `track()` — le seul démontrable : cette fonction est
   l'unique point de sortie du site.

Le verrou nº 2 existe parce que le nº 1 est [rapporté comme n'arrêtant pas les
événements sur mesure](https://github.com/umami-software/umami/issues/3031) —
or ce site n'est presque que ça.

Ça n'efface pas le passé, et ça ne vaut que sur l'appareil et le navigateur où
l'on s'est armé. Vider ses données le désarme.

**`data-domains="adrienvada.fr"`** sur la balise : la mesure ne compte que le
domaine public. Le même `index.html` est aussi servi par les aperçus de branche
Cloudflare ; sans cette restriction, chaque relecture d'une maquette viendrait
gonfler les chiffres du vrai site. Ailleurs que sur le domaine listé, le script
se charge et ne compte rien — c'est à retoucher le jour où le site changerait
de nom de domaine, sans quoi la mesure s'arrêterait en silence.
