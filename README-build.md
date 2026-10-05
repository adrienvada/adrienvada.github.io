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

`build/verifier-site.js` ouvre le site dans Chromium et vérifie, en moins
de quatre minutes, ce qui a déjà cassé ou casserait sans bruit :

- l'accueil se charge sans erreur de script ;
- un lien direct entre sans rideau ; depuis un autre site, l'ouverture joue une
  fois ;
- l'ouverture démarre après le chargement (plafonné à 1,5 s), tient sa durée
  processeur ralenti 4×, et « Passer » pendant l'attente ne la relance pas
  (voir [Elle attend que la salle se taise](#elle-attend-que-la-salle-se-taise)) ;
- « Ajouter au calendrier » ouvre sa fenêtre dans un univers ouvert depuis le
  CV (une représentation fictive est glissée dans les dates le temps du test :
  il ne dépend pas de la saison) ;
- un univers ouvert depuis le CV : la page qu'il couvre cesse d'être rendue
  tant qu'il est ouvert, son montage est posé après le passage, sa lumière
  ne l'est qu'une fois ; la fermeture rend la page, la ligne à sa place et le
  focus dessus ; « Accéder aux dates » touché pendant le passage ou dès sa
  fin arrive au pied, le montage entier au-dessus (voir [Les passages](#les-passages-view-transitions)) ;
- un univers fermé puis rouvert aussitôt, sans View Transitions : le panneau
  rouvert n'est pas vidé par la fermeture d'avant ;
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
  répète pas le titre et la frise prend la couleur du spectacle ; sommaire
  replié, que les années de la saison ouvrent et referment sans en animer
  la hauteur — la liste glisse en `translate`, et rien ne traîne une fois
  arrivée —, et qui mène à la bonne ligne ; une image pour chaque
  représentation annoncée aux moteurs ; la prochaine date en tête du CV, et nulle part dans l'onglet
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
- les démos voix suivent (voir [le mini-lecteur](#démos-voix--le-mini-lecteur-lenchaînement-lécran-verrouillé)) :
  aucun mini-lecteur avant qu'une démo joue ; ensuite une région nommée, ses
  quatre boutons nommés de 44 px, posée 4 à 16 px au-dessus de la barre
  d'onglets du bas au téléphone, et à 16 px du coin bas droit sur
  ordinateur ; l'écran verrouillé a le titre, « Adrien Vada », « Démos
  voix » et le portrait en 192 et 384 ; la démo continue sur l'onglet CV ;
  à sa fin la suivante joue, annoncée et mesurée (`demo_suivante`), mais
  rien après la dernière, où le lecteur reste en pause ; la croix arrête
  tout et oublie la démo ; le lecteur ne s'imprime pas ;
- les pastilles ▶ ne s'impriment pas ;
- la ligne à vignette du CV : chaque spectacle et chaque film ont leur
  vignette, qui dit l'année et l'état de la ligne (cachée aux lecteurs
  d'écran, qui les lisent dans le texte) ; l'année se lit sur chaque vignette
  à l'écran, même posée tout en bas ; les lignes d'une liste ont la même
  hauteur, l'année y tombe au même endroit, et le texte tient dans la hauteur
  de la vignette — au téléphone comme sur ordinateur ; les formations n'ont
  pas d'image ; rien de tout cela sur papier, où aucune ligne n'est voilée ;
- sans JavaScript, le site reste lisible, et l'aperçu de la lettre écrit en Caveat ;
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
  surtitre et les deux cadres de son rideau, auteur et rôle et leurs lignes,
  synopsis et sa lumière, bouton), du carton du chapitre et de la poursuite,
  relevées aux mêmes endroits du défilement ;
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
  le synopsis est écrit et le bouton répond ; aucune animation du récit ne
  fait varier de coupe (`clip-path`), qui se repeindrait à chaque image
  (voir [Les scènes d'un univers](#les-scènes-dun-univers)). Puis le carton du chapitre, en
  tête du montage, tient l'écran (deux écrans de défilement au moins), sa
  phrase écrite ; il finit dans le noir si la salle est sombre (À la barre,
  Cléophène), s'efface sans noir si elle est claire (Bérénice, L'Homme
  moderne), et la première photo attend dans la pénombre ou dans le papier
  selon la salle, éteinte au bas de l'écran, allumée à l'entrée de son quart
  inférieur ;
- ce qu'on voit d'abord part d'abord, sur chaque page spectacle au
  téléphone : la première photo du travelling est demandée d'avance par
  l'en-tête, exactement comme l'image la demandera, hors mouvement réduit ;
  aucune image du montage ne part d'emblée ; le fond du titre passe après ;
  la photo paraît, et ne reste jamais cachée ; son fondu part d'un
  centième, pas de zéro. Dans le panneau ouvert depuis le CV, les deux
  premières photos du travelling partent d'emblée, la première en tête —
  aucune en mouvement réduit ; viser une ligne du CV prépare la première
  photo de son travelling, et non la couverture, qui ne l'est qu'en
  mouvement réduit. L'affiche d'une vidéo
  YouTube est son WebP, et la petite affiche le remplace, source retirée,
  quand il manque ; la connexion au lecteur s'ouvre à l'appui, pas au
  survol (voir [Fluidité](#fluidité--ce-qui-a-été-fait-et-pourquoi-ne-pas-le-défaire)) ;
- en mouvement réduit, chaque scène a un état fixe : l'ouverture réduite au
  haut de la page posé — titre, photo, textes, bouton, sans coupe ni
  déplacement, et tout entier dans sa scène (synopsis, rôle et bouton de
  « À la barre » au téléphone, en mouvement réduit comme sans JavaScript) —,
  le carton du chapitre à un carton, sans noir, la poursuite à sa photo en
  plein feux, la première photo allumée, le texte écrit, plus rien d'animé
  au défilement ;
- les défauts réparés de l'audit du mouvement : le verrou de défilement posé
  sur `<html>` et la place de la barre réservée, le changement d'onglet et sa
  pastille — son sens n'est pas écrit en ligne sur `<html>` —, le fragment
  d'une couche refermée qui ramène l'onglet déjà affiché sans déplacer la
  page, la bascule de thème qui ne lance aucune transition et ne pose
  `vt-theme` que dans le rappel du passage (retirée ensuite), « Passer » qui
  répond avant l'arrivée d'`intro.js`, Maj seule qui ne lève pas le rideau
  (Échap, si), le zoom de l'avatar dans `styles.css`, la phrase posée sur un
  groupe de photos (« Jusqu'où serez-vous semblables ? ») ;
- la fenêtre d'agenda de l'onglet Dates : le focus y entre au geste, la page
  devient inerte et cesse de défiler une image après, tout revient à la
  fermeture (focus sur le bouton) ; rouverte pendant son fondu de sortie,
  elle n'est pas cachée par lui ;
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
- les gestes sur une ligne du CV : aucun mot de murmure au chargement ; au
  survol comme au clavier, le murmure s'écrit, en fondu depuis zéro ; la
  salle ne s'allume qu'une fois le pointeur posé, et sa cible va à `<body>`
  et à la barre, jamais à `<html>`, sans descendre jusqu'aux lignes ; au
  téléphone, un glissement commencé sur une ligne n'allume rien, l'appui se
  marque après 110 ms, le murmure vient mot à mot à 400 ms et reste une fois
  le doigt levé, un tap bref ouvre l'univers ; un « resize » de hauteur
  seule (la barre d'adresse) ne relance pas l'égalisation des lignes, un
  changement de largeur si ; avec `?repli`, le bouton d'une ligne reçoit sa
  place (`--ph`), son titre non ;
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
- arriver par un lien vers un onglet (`/#page_dates`) : la page visée dès le
  premier rendu, sans CV ni repli qui glisse — et le CV revient si le script
  de la page ne démarre pas (voir [Le portrait d'affiche](#le-portrait-daffiche)) ;
- la salle de projection : la bobine a ses deux extraits à leur début
  (L'Homme moderne à 0:00, Le rapt à 1:21), le halo est peint, « Le rapt »
  éteint la salle et lance le lecteur à 1:21 avec son API de messages, la
  bobine de la salle noire montre l'extrait en cours et suit ce que le lecteur
  annonce, Échap rallume et arrête le lecteur ;
- la salle de projection, en chapitres : la durée sous l'écran est celle de
  `DUREE`, chaque chapitre va de son début (`data-salle-debut`) au début du
  suivant, le dernier jusqu'à la durée ; le bouton de l'écran dit « Lancer
  la projection » et la durée ;
- l'aperçu de la bande démo : aucune de ses photos ne part avec l'accueil,
  ni sur un écran à moins de moitié dans la fenêtre ; ouvert, il passe deux
  fois ses cinq photos (chacune demandée une fois, après l'ouverture de
  l'onglet), revient à l'affiche entre deux et s'y pose, en n'animant que
  transformation et opacité, puis ses photos quittent la page ; il ne
  rejoue pas ensuite ; quitter l'onglet
  rend l'affiche, le bouton « Arrêter l'aperçu » (44 px) l'arrête et rend le
  focus à l'écran ; rien en mouvement réduit ni en économie de données ;
- la salle noire au téléphone couché (844 × 390) : le lecteur fait toute la
  hauteur, en 16:9 centré, sans bobine ni halo, la croix de 44 px dans
  l'écran ; le plein écran ne fait pas d'erreur ;
- les bandes-annonces du CV : la pastille ▶ garde son lien vers YouTube ou
  Vimeo, mais son clic joue la vidéo dans la salle noire, sur la page (pas
  de nouvel onglet), sans la bobine de la bande démo, avec un halo et le
  titre du spectacle ; Échap arrête le lecteur ; la bande démo retrouve
  ensuite sa bobine et son titre ;
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
- ce que l'accueil demande d'abord : Cinzel d'avance ; ni la signature de la
  lettre, ni l'affiche de la salle de projection, ni Caveat avant la fin du
  chargement ; l'aperçu de la lettre reçoit sa plume ensuite, et la lettre
  ouverte, sa signature (voir [Polices](#polices--servies-par-le-site)) ;
- la mesure attend : chaque page publique charge Umami par le chargeur,
  avant ses feuilles, jamais par une balise ; la balise insérée porte ses
  attributs ; `entree` attend en file tant qu'Umami n'est pas là ; une page
  spectacle pré-rendue ne charge pas Umami et n'écrit pas son titre avant
  d'être montrée, puis fait les deux (voir [Mesure
  d'audience](#mesure-daudience)) ;
- la publication : l'accueil des sources reçoit ses deux feuilles dans la
  page (adresses des polices absolues), et ses règles de spéculation — un
  seul jeu, toutes en `moderate` — se relisent ;
- les pages générées s'affichent sans attendre : chaque fiche est écrite
  ouverte (`is-open`), et, son moteur retenu 2,5 s, elle est déjà peinte et
  Chrome a vu son premier affichage ; le répertoire et la galerie n'ont
  aucune feuille en `<link>` (polices dans la page, adresses menant au
  dossier, Cinzel seule en `font-display: block`), et leurs anciennes
  feuilles n'existent plus ; aucune page
  publique ne déclare `favicon.svg`, toutes les PNG de 32 et 96 px ; les
  fiches, le répertoire et la galerie pré-rendent les fiches et la galerie,
  préchargent l'accueil et le répertoire, en `moderate` (voir [Préparées au
  survol](#préparées-au-survol-le-pré-rendu)) ;
- les passages entre documents : du répertoire à une fiche, c'est la
  première photo du travelling qui porte le nom, rognée à sa carte ; de
  l'accueil à la galerie, la première vue de la planche, et au retour le
  cadre de l'affiche, la pastille « Galerie photo » invisible jusqu'à ce
  qu'il soit posé ; aucun nom ne reste posé ; en mouvement réduit, la
  galerie ne nomme rien ;
- la galerie : les neuf premières vues partent avec la page et les suivantes
  attendent, une ou deux en priorité haute, des tailles à deux branches
  (quatre colonnes au téléphone, cinq au-delà) ; à 390 px (×3), 412 px
  (×1,75) et 1 440 px, aucune vignette téléchargée deux fois, et les vues du
  premier écran allumées ; sans JavaScript, aucune n'est cachée ;
- le service worker : inscrit par chaque page publique, pas par `/admin/` ni
  sur l'aperçu Cloudflare (`.workers.dev`), il ne garde que des polices et
  des images de `/ressources/` — à son installation, les seules polices que
  l'accueil précharge —, ni la page ni un script n'est passé par lui, et son
  interrupteur est là, levé (voir [Le
  service worker](#le-service-worker-swjs--les-polices-et-les-images-rien-dautre)) ;
- le sitemap annonce toutes les pages spectacle, et elles seules ;
- les [variantes d'images](#images-générées-à-ne-pas-écraser-sans-les-régénérer)
  qui dépendent d'autre chose que de la photo : la vignette du CV de chaque
  couverture existe, en 144 × 192, recadrée au `cadre` que lui donne
  aujourd'hui `univers.js` et tirée du JPEG d'aujourd'hui ; une version écran
  large existe là où `variantes.json` l'annonce, et nulle part ailleurs ; la
  liste `ECRAN_LARGE` d'`univers-montage.js` est la sienne, et chaque page
  spectacle propose la version écran large de chacune de ses photos qui en a
  une ; aucune page écrite en dur ne demande une version écran large, une
  vignette recadrée ou un AVIF absent ; le portrait a ses trois AVIF, chacun
  plus léger que sa WebP ;
- chaque écran prend sa version : sur une page spectacle à 1 440 px (×2), la
  version écran large pour les photos qui en ont une — sans que leur JPEG
  parte en plus — et le JPEG pour les autres ; au téléphone (×3), ni l'une
  ni l'autre ; le portrait en AVIF (960 px au téléphone) ; les vignettes du
  CV en 144 × 192 recadrées, celles des Dates (par date, par spectacle) aussi,
  et la couverture de 240 px ne part plus avec l'accueil.

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
| le **vocabulaire du mouvement** dans `index.html` (`--ease-*`, `--dur-*`) | `npm --prefix build run pages` (la galerie, puis les pages spectacle) | `/galerie/…`, `/spectacles/…` : les pages spectacle, le répertoire et la galerie le relisent (voir [Un seul moteur](#un-seul-moteur-un-seul-visage) et [Le vocabulaire](#le-vocabulaire)) |
| **`ressources/polices/polices.css`** — une police ajoutée, une adresse | `npm --prefix build run pages` | `/spectacles/index.html` et `/galerie/index.html`, qui en portent une copie dans leur page (voir [Polices](#polices--servies-par-le-site)) ; l'accueil publié la recopie de lui-même |
| une **date** dans [`/admin/`](#mettre-à-jour-les-dates-de-représentation) (base Supabase) | rien d'urgent — le site l'affiche déjà. Avant un commit : `node build/exporter-dates.js`, puis `node build/generer-pages-spectacles.js` | `dates.js`, puis `/spectacles/…` |
| une **ligne du CV**, ou une règle `@media print` | `node build/generer-cv-pdf.js` | `ressources/cv-adrien-vada.pdf` |
| le **montage photo** d'un univers (les `p: [...]`) | `python3 build/prepare-univers-photos.py` | `ressources/images/univers/…`, versions allégées, copies floues (`-flou.webp`), versions écran large (`-2400.webp`) et vignettes (`-v.webp`) comprises — et la liste `ECRAN_LARGE` d'`univers-montage.js` : s'il annonce qu'elle a changé, la commande des pages |
| le **`cadre` de la couverture** d'un univers (celui de la première photo de son montage) | `python3 build/variantes-images.py`, en plus de la commande des pages | sa vignette du CV recadrée (`<nom>-v.webp`) et `variantes.json` — le [contrôle automatique](#vérifier-le-site) le rappelle si on l'oublie |
| une **scène** d'un univers — `lumiere`, `ouverture`, `poursuite`, une césure ` \| ` | `node build/generer-pages-spectacles.js` | `/spectacles/…` (voir [Le mouvement](#le-mouvement--la-régie-les-scènes-les-passages)) |
| une **démo voix** ajoutée ou remplacée (`<audio>` de l'onglet Démos voix) | `node build/ondes.js` | les ondes (`data-onde`, `data-duree`) dans `index.html` — voir [Les ondes](#démos-voix--les-ondes) |
| le **portrait** de l'en-tête (la première photo de `galerie.js`) | `python3 build/variantes-images.py --tout`, ou effacer `portrait-affiche-*` puis le relancer | `ressources/images/portrait-affiche-*` (WebP, AVIF et JPEG) |
| une **icône** ajoutée quelque part | `python3 build/construire-sprite-icones.py`, puis `npm --prefix build run pages` | le sprite, dans `index.html`, puis sa copie dans `/galerie/` |
| la **bande démo** remplacée sur YouTube | rien à fabriquer — tout est à récrire à la main : les débuts des extraits, la durée, les plans de la bobine (voir [La salle de projection](#la-salle-de-projection)) | `DEBUTS`, `DUREE`, la bobine et « 3:01 » dans `index.html` ; le vérificateur les confronte |
| la **signature** — un nouvel export reMarkable | `python3 build/signature-vers-svg.py <export.pdf>` | `signature.webp` + le bloc SVG à coller |

Chacune a sa section plus bas, avec ce qu'elle fait et pourquoi.

**Une image refaite sous le même nom** — le portrait, une photo du montage,
une vignette recadrée par un nouveau `cadre`, la signature — est servie
ancienne **une fois** aux visiteurs revenus, par le service worker :
augmenter `VERSION` n'y change rien (voir [Le service
worker](#le-service-worker-swjs--les-polices-et-les-images-rien-dautre)).

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
compiler, le JSON-LD et les règles de spéculation se relire, la page garder
le même nombre de balises de chaque sorte) ; puis les pages sont ouvertes
dans le Chromium de l'étape du PDF, et **une seule erreur de script de plus
qu'avant** remet tout à l'original. L'étape est en `continue-on-error`, comme
celle du PDF : au pire, le site part tel qu'il est dans le dépôt.

**Une exception à « on retire, on ne transforme pas » : les deux feuilles de
l'accueil entrent dans la page.** `styles.css` et `polices.css` bloquaient
le premier affichage, un aller-retour de plus chacune ; recopiées dans des
`<style>` **à la place même de leurs `<link>`** — même rang dans la cascade,
le `<noscript>` entre les deux garde le sien —, elles ne bloquent plus rien :
premier affichage 676 → 496 ms en 4G lente émulée (téléphone, processeur ×4,
5 passes, distributions disjointes), Cinzel 116 ms plus tôt, décalage de
mise en page 0,026 → 0,009, pour 6 ko compressés de plus (60 → 66). Rendu
final identique au pixel, téléphone et ordinateur, deux thèmes. Les
adresses des polices y deviennent absolues. C'est une étape à part, après
l'allègement, avec son propre contrôle (deux `<link>` de moins, deux `<style>`
de plus, rien d'autre) ; si elle échoue, l'accueil part avec ses `<link>`. Les
sources de l'accueil, les pages spectacle et `/admin/` gardent leurs `<link>`.
Le répertoire et la galerie n'en ont plus : leurs générateurs écrivent
directement leur feuille et `polices.css` dans la page (voir [Pages
spectacle](#pages-spectacle-spectacles--à-régénérer) et [La planche
contact](#la-planche-contact)).
`build/verifier-site.js` rejoue cette étape sur l'accueil des sources : un
`<link>` retouché ferait sinon échouer l'intégration sans bruit.

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

Le **service worker** ne s'y inscrit pas (voir [Le service
worker](#le-service-worker-swjs--les-polices-et-les-images-rien-dautre)) : une
photo poussée sous le même nom paraît dès le premier rechargement.

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

Le temps du passage, `vt-theme` coupe toute transition — sur tous les
éléments, donc elle recalcule la page entière. Elle est posée **dans le
rappel** du passage, avec le thème (un seul recalcul pour les deux), et
retirée **au repos** (`requestIdleCallback`, une image de marge sous
Safari). Posée avant, elle recalculait tout le document pour l'image de
l'ancien état, où elle ne sert à rien : au téléphone à ×4, la bascule
répondait en 152 à 184 ms au lieu de 80 à 88, et le cercle partait 60 à
120 ms plus tard. Même chose au répertoire (104-112 → 72-80 ms) et au book.

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

### Elle attend que la salle se taise

Arrivé, `intro.js` ne lève pas le rideau tout de suite : il attend la fin du
chargement (`load`), puis deux images (`auCalme`, en bas du fichier). Il
démarrait sur `DOMContentLoaded`, dans la même tâche que tout le CV — 614 ms
d'un seul tenant sur un téléphone moyen (processeur ralenti 4×) : le premier
rôle restait figé, brouillé, puis le masque surgissait d'un coup en taille
finale, sans sa matérialisation. Mesuré à 4× : dans les 600 ms qui suivent le
lever de rideau, le plus long écart entre deux images tombe de 540-590 ms à
60-90. Le prix : la première image du défilé arrive 40 à 140 ms plus tard.

- l'attente est **plafonnée à 1,5 s** (`ATTENTE_MAX_MS`) : `load` attend aussi
  les images, et le rideau ne reste pas noir pour un portrait que retient un
  réseau qui cale. En « 4G lente » émulée, `load` suit `DOMContentLoaded` d'une
  demi-seconde : le plafond n'y sert pas ;
- le rideau noir et « Passer » sont à l'écran pendant l'attente, et
  « Passer » y répond : la scène est passée, et `start()` ne la relance pas
  (vérifié par `build/verifier-site.js`, portrait retenu trois secondes) ;
- en mouvement réduit, rien n'attend : `start()` lève le rideau aussitôt ;
- le garde d'`index.html` n'a pas changé : `__introPret` est posé dès
  l'exécution d'`intro.js`, avant l'attente.

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
  part ailleurs, qu'on rend l'intro plus longue ou plus courte. Elle est
  **tenue sur un téléphone lent** aussi : voir plus bas « L'heure, pas les
  images ».
- `ROLES` — la liste et l'ordre des rôles. **Seuls les premiers et les derniers
  sont faits pour être lus** : entre les deux, c'est une masse qu'on traverse
  sans pouvoir la compter, et c'est le but. `'ADRIEN'` doit rester en dernier
  (voir plus haut).
- `PROFIL_POW` — resserre le sommet et aplatit les épaules. Près de 1, la courbe
  s'étale ; au-dessus, la pointe se fait plus étroite et plus violente.
- `PROFIL_BIAIS` — déplace le sommet. Au-dessus de 1 il arrive plus tard :
  l'accélération prend son temps, la décélération est plus serrée.
- `SHIFT_FLOOR_MS` / `HOLD_FLOOR_MS` — le plancher (38 + 8 ms par rôle).
  **C'est lui, et lui seul, qui fixe la vitesse de pointe** — voir juste en
  dessous. Les descendre encore ferait se chevaucher les mots sur un appareil
  lent. 38 ms, c'est 2,3 images à 60 Hz : sur un appareil qui en affiche moins,
  le plancher monte de lui-même (`IMAGES_PAR_CRAN`, `PLANCHER_MAX_MS`, voir
  plus bas) ; il ne descend jamais sous 38.
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

#### L'heure, pas les images

La consigne ne vaut que si l'horloge est tenue. Chaque cran programmait le
suivant « dans tant de millisecondes », et le décodage d'un mot avançait d'une
lettre tous les trois minuteurs : sur un téléphone lent, chaque retard
s'ajoutait au suivant. Processeur ralenti 4×, « Antiochus » et sa lecture
prenaient 2,1 à 2,7 s au lieu de 0,72, la chaîne des crans 0,7 s de trop, et
les mots du milieu arrivaient au centre à moitié brouillés. Trois règles, dans
`intro.js` (section « L'horloge du défilé ») :

| Règle | Où | Ce qu'elle fait |
|---|---|---|
| **Chaque cran a une heure** | `echeance`, `aLHeure` | calculée depuis le lever de rideau en ajoutant les durées prévues : un cran parti en retard ne décale plus le suivant. Le décodage et le « ça mouline » lisent l'heure eux aussi (`decodeCell`, `churnCell`) : un appareil lent voit moins d'images du brouillage, pas un mot plus long. Seul le dernier cran garde sa durée quoi qu'il arrive : `revele()` mesure « Adrien » pour y caler le nom, il doit être posé |
| **Au moins une image par cran** | `cranPeint`, `marquerCran` | rattraper un retard fait partir deux crans coup sur coup ; s'ils tombent entre les deux mêmes images, un rôle disparaît sans avoir paru. Le suivant attend donc que l'image soit passée. Onglet caché, le défilé attend qu'on revienne |
| **Le plancher suit la cadence** | `calerLePlancher` | la cadence est mesurée (médiane des écarts entre images) pendant les deux premiers rôles ; le plancher garde ses 2,3 images par cran, jamais sous 38 ms, jamais au-dessus de 76 (2,3 images à 30 i/s : au-delà, la pointe s'aplatit et la roulette défile au lieu de s'emballer). La dichotomie est relancée sur les crans qui restent pour tenir `SEQUENCE_CIBLE_MS` ; la chute d'« Adrien » (`dureeVerrou`) ne bouge pas |

Mesuré, du démarrage au sceau (téléphone simulé, passes alternées avant et
après) : 5,8 → 5,7 s à 1×, 7,6-8,2 → 5,8 s à 4×, 9,7-10,1 → 6 s à 6×. À 4×,
au plus fort du défilé, 3,2 à 4,3 images par cran au lieu de 1,9 à 2,5 sans
plancher calé. Sur un appareil lent, le prix est dans la forme : la pointe y
est moins folle et les épaules un peu plus vives — l'arbitrage ci-dessus, fait
par la machine.

`build/verifier-site.js` le garde : à 4×, le défilé doit tenir sa consigne à
20 % près (il en prenait 40 % de plus).

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
  `renderListe()` les confie à la régie à chaque rendu). En mouvement réduit
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
- **Chaque spectacle à sa couleur, sur sa ligne** : le titre à l'**encre du
  spectacle** — sa couleur (`palette.accent`), mêlée au noir sur la salle
  claire et au blanc sur la salle sombre juste ce qu'il faut pour un
  contraste de 4,5 au moins (`dlEncre`, qui pose `--dl-encre-c` et
  `--dl-encre-s` avec `dlStyle`) : l'or de Cléophène, tel quel, se perdait
  sur le papier clair ; le souligné du titre, 2 px, à sa couleur franche ;
  les puces des séances cernées d'elle ; la feuille d'éphéméride dans un
  cadre de sa couleur. Sans couleur de spectacle : l'encre du texte et l'or
  du site. La vérification exige tout cela, et le contraste.
- **Le sommaire**, en tête de la carte : la saison d'un regard — les
  spectacles en lignes, les mois en colonnes. Il ne filtre rien : un mois, un
  spectacle ou un rond **mènent** aux lignes qu'ils résument. **Il est
  replié** : les années de la saison (« Saison 2026 - 2027 », en tête de la
  carte, un bouton `#dates-saison-bouton` qui garde l'allure du titre, sa
  flèche en plus) l'ouvrent et le referment (`dlSaisonOuvrir`). Il se retire
  pendant une recherche, où seule la liste compte : le titre redevient alors
  un simple titre. **Il ne pousse pas la liste image par image** : lui et le
  panneau de recherche se dépliaient en animant leur hauteur, et chaque
  image déplaçait la liste, dont la frise suit la place à l'écran — une
  image sur trois perdue au téléphone à ×4. Leur hauteur est posée d'un
  coup ; la liste et la carte des archives glissent de leur ancienne place à
  la nouvelle en `translate`, le panneau se découvre au même pas
  (`clip-path`) et son contenu paraît en fondu ; au repli, la hauteur ne
  tombe qu'à l'arrivée (`dlDeplier`). Le glissement part après l'image du
  geste, qui montre déjà la flèche ou le libellé du bouton. Images au-delà
  de 20 ms pendant le dépliement ou le repli : 7 à 12 sur 30 → 0 à 2.
- **Le nom d'un spectacle mène à sa page** (`spectacles/<slug>/`), partout où
  l'onglet l'écrit : la ligne, l'en-tête du rangement par spectacle, les
  archives (`dlVersPage()`). Chaque univers a sa
  page ; un spectacle sans univers garde son nom en simple texte, jamais un
  lien mort. Le retour du navigateur ramène à l'onglet Dates : changer
  d'onglet inscrit `#page_dates` dans l'historique.
- **Dessiné quand il sert, pas au chargement.** Caché, l'onglet pesait le
  tiers de la page (861 éléments), et son dessin — puces, liste, sommaire,
  archives, données structurées — 110 ms de la tâche de démarrage à ×4, pour
  un onglet que la plupart des visiteurs n'ouvrent pas. Il se dessine à son
  ouverture (dans `poserPage`, avant de paraître), à l'arrivée sur
  `#page_dates` et par « Voir toutes les dates » d'un spectacle ; sinon **au
  repos** après le chargement (`requestIdleCallback`, une seconde et demie
  sous Safari), **en quatre tranches** de moins de 50 ms à ×4 — les puces,
  la liste et le sommaire, les archives, les données structurées —, la page
  reprenant la main entre deux (`scheduler.yield()` où il existe). Avant ce
  premier dessin, `renderDates()` et `buildFilterChips()` ne font rien : il
  lira l'état du moment, filtres et dates en direct compris. Démarrage à ×4
  (quatre passes) : 190 → 52 ms pour le script de démarrage, 349 → 232 ms
  pour sa tâche.
- **Un geste ne refait que ce qu'il change.** Le rangement ne redessine que
  la liste (`renderListe`) ; le sommaire (`renderSommaire`) ne l'est que
  quand un filtre s'active ou se lève ; pendant la recherche, la liste suit
  à l'image (plusieurs lettres tapées avant elle ne la redessinent qu'une
  fois), les archives (`renderArchives`) une fois l'image peinte, et le
  compte — que lisent les lecteurs d'écran — à la frappe. Au téléphone à ×4 :
  bascule de rangement 220 → 164 ms (sous le seuil de 200), frappe 80 → 72
  ms, première frappe 192 → 144 ms.

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
**couverture** de l'univers — la première de son montage —, recadrée comme
la vignette du CV (`<n>-v.webp`, fabriquée par `build/variantes-images.py`,
voir [La vignette](#la-vignette--lannée-et-létat-sur-la-ligne-du-cv)) ; si
elle manque, la page se rabat sur la version de 640 px.

### Comment ça tient — et ce qui peut lâcher

- **`dates-live.js`** interroge la table au chargement de l'accueil. Si elle
  répond en moins de trois secondes, il remplace les dates et relance les
  rendus — **seulement si elles diffèrent** de celles de `dates.js`
  (identifiants de la base mis à part) : au lendemain d'un export, rien ne
  se redessine, et le tableau de gare ne repart pas de blanc. L'onglet
  Dates n'est redessiné que s'il l'a déjà été (`datesMisesAJour`) ; sinon
  il se dessinera avec elles. Si la base ne répond pas, rien ne se passe :
  `dates.js` reste affiché. Aucune erreur visible dans les deux cas.
- **La clé dans le code est publique par construction** (« publishable ») :
  elle ne permet que ce que les règles d'accès autorisent aux anonymes,
  c'est-à-dire lire. La clé « secret » du projet ne doit jamais entrer dans
  ce dépôt.
- **La lecture est une requête simple, préparée d'avance.** La clé passe
  dans l'adresse (`&apikey=…`) et non dans un en-tête : un en-tête inventé
  coûtait un pré-vol `OPTIONS`, un aller-retour de plus à la première
  visite, pris sur les trois secondes. Elle ne demande que les colonnes que
  le site lit (`COLONNES`, dans `dates-live.js`) — à compléter si
  `versShowData` en lit un jour une nouvelle, sans quoi elle arrivera vide.
  L'accueil ouvre la connexion dès son `<head>` (`preconnect`). `/admin/`
  n'est pas concerné : il passe par supabase-js, avec son en-tête.
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
aspect habituel ; collée, elle prend un fond opaque et une ombre
(`#nav-barre.est-collee`). **Opaque, et sans flou** : elle a été presque
opaque (98,5 %) sur un flou de 16 px, recalculé à chaque image puisque le
texte défile dessous, pour cacher un pour cent et demi de transparence — le
verre ne s'y voyait plus. Le fond plein empêche seul le texte de fantômer
derrière les onglets, au même rendu (au plus 8/255, sur 0,04 % des pixels),
et le compositeur travaille moins (0,43 → 0,31 s en défilant le CV au
téléphone à ×4). Moins opaque sans le flou, le texte réapparaît.

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
bon instant. **Collée seulement si la sentinelle est sortie par le haut** :
une sentinelle sous l'écran n'est pas à l'écran non plus, et sur un téléphone
où la barre est sous la ligne de flottaison au chargement (390 × 664, la
surface d'un iPhone sous Safari ; 360 × 640 ; 412 × 823), elle se croyait
collée, se « décollait » en entrant dans l'écran puis se recollait en haut —
douze transitions de fond, de bordure et d'ombre au lieu de six. La zone
observée descend donc loin sous l'écran (`rootMargin`, 10 000 px) : la
sentinelle n'en sort que par le haut. Lire sa position dans le rappel ne
suffisait pas — l'observateur ne prévient que d'une entrée ou d'une sortie,
et un saut d'en dessous de l'écran à au-dessus (la prochaine date qui mène à
sa ligne dans l'onglet Dates) laissait la barre décollée, translucide sur le
texte.

**Changer d'onglet a un sens.** La nouvelle page arrive du côté de l'onglet
choisi — de la droite vers « Démos voix », de la gauche en revenant au CV —,
par une View Transition (`showPage` → `poserPage`) : l'ancienne s'efface d'un
côté pendant que la nouvelle arrive de l'autre ; l'en-tête et la barre ne
bougent pas — sauf le portrait, qui se range dans le médaillon en quittant le
CV et en ressort au retour (voir [Le portrait d'affiche](#le-portrait-daffiche)).
Le fond et le filet de l'onglet actif sont une **pastille** qui
glisse d'un onglet à l'autre sur un ressort (`placerPastille`, et
`--ease-ressort`) ; l'onglet ne garde que sa couleur, et sa bordure reste
transparente (l'onglet actif prenait le gris par défaut de Tailwind, hors
thème). Elle se **recale** sans glisser (`recalerPastille`, seulement si elle
n'est plus sous son onglet) quand la barre ou un onglet change de taille,
quand une police arrive (`loadingdone` : `fonts.ready` peut se résoudre avant
qu'elle soit demandée) et à la fin de chaque passage d'onglet. Sur une machine
chargée, Montserrat arrivait après le clic et la pastille restait 4 px à côté
de l'onglet Dates. **Les onglets naissent dans leur couleur** : le balisage porte celle
du CV actif et des trois autres au repos — posées au démarrage, après le
premier rendu, elles glissaient 300 ms à chaque arrivée —, et ils n'ont plus
de `transition-all` : la règle commune des liens (couleurs, enfoncement) leur
suffit. Sans View Transitions, une animation d'entrée fait arriver
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
l'appelle ; une fois paru, il reste quand le doigt se lève — épinglé
jusqu'au prochain toucher, où qu'il soit : le pouce couvrait le texte qu'il
fallait tenir pour le lire (voir `bindLongPress`) —, et le clic qui suit
n'ouvre pas l'univers. Un doigt qui glisse annule : le défilement passe
avant.

Le texte n'est pas recopié — c'est le `synopsis` de l'univers, relu par
`ecrireLeMurmure()`. Le corriger à un seul endroit le corrige partout.

**Il n'est écrit qu'à la demande.** Au chargement, la ligne ne reçoit que sa
place, vide (`addWhisper()`) : elle suffit à la mise en page, identique à onze
largeurs de 360 à 1 440 px. Les mots n'y entrent que la première fois qu'on la
désigne — le pointeur qui s'y pose, le clavier qui l'atteint, le doigt qui y
reste 110 ms. Écrits d'avance, ils faisaient 355 mots (393 éléments) de plus,
un sur sept de la page, calculés au démarrage pour un texte que personne ne
voit au repos. Chaque mot naît dans son état de repos (invisible, teinté du
spectacle), posé en ligne le temps d'une lecture, puis rendu au CSS : sans
cela, un mot entré dans une ligne déjà survolée paraissait d'emblée, sans
fondu. (`@starting-style` le dirait en CSS, mais la publication allégée le
casse — voir le commentaire dans `index.html`.)

- **Sur grand écran**, il s'inscrit dans le vide de la ligne, entre le texte
  et la flèche. Rien n'est déplacé : la liste reste immobile. Trois lignes
  tiennent ; au-delà, le texte se dissout par le bas.
- **Sur petit écran**, ce vide n'existe pas : la ligne s'ouvre par le bas,
  sous le texte, tant que le murmure est là. Au repos elle ne coûte pas un
  pixel.

Un spectacle sans `synopsis` n'a pas de murmure — rien à corriger.

### La vignette — l'année et l'état sur la ligne du CV

Chaque ligne de spectacle ou de film s'ouvre sur une **vignette** : la
couverture de son univers (la première photo du montage — la même que dans
l'onglet Dates), ou ses initiales sur sa couleur tant qu'il n'a pas de
photos. L'**année** s'imprime au bas de la photo, en blanc sur un voile ;
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

**Une image faite pour elle** (`<nom>-v.webp`) : la couverture recadrée en
144 × 192 au `cadre` de son montage — la vignette au pixel, à la densité 3.
Elle prenait la version de 240 px, qui garde le cadre de la photo : en
paysage, il n'en restait que 100 à 181 px de haut pour les 192 qu'il faut, et
la vignette était floue (Le rapt, L'Homme moderne, Peau d'anges) ; Bérénice,
en portrait, pesait 18 Ko pour 144 px utiles. Le cadrage est le même, net, et
les neuf pèsent 35 Ko au lieu de 54 (l'accueil lu jusqu'au bout au téléphone :
113 → 76 Ko d'images, avec le portrait en AVIF). L'onglet Dates prend la même
image : un fichier par spectacle pour les deux onglets. Ses vignettes, moins
hautes (40 × 50, et 48 × 56 sous la feuille), en rognent encore un peu, au
même cadre : 7 à 14 % plus serrées qu'avant, et nettes elles aussi. La
version de 240 px reste là où il faut le cadre entier : le halo de la salle
noire, quand on joue une bande-annonce. Changer le `cadre` de la couverture
demande de relancer `python3 build/variantes-images.py` : le contrôle
automatique le rappelle.

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

La jaquette YouTube est servie **en WebP** (`vi_webp/…/maxresdefault.webp`,
34 à 92 Ko au lieu de 76 à 137 en JPEG pour les quatre vidéos des pages), le
JPEG en repli dans le même `<picture>`. Quand YouTube n'a pas de grande
jaquette, il renvoie un timbre-poste de 120 px : `wireVideoPosters` le
reconnaît, **retire la source WebP** — tant qu'elle est là, changer le `src`
de l'image ne change rien — et prend la petite (`hqdefault.jpg`). Il veille
aussi sur les pages spectacle, où il ne veillait pas.

**La connexion vers le lecteur s'ouvre à l'appui** sur la jaquette ou sur une
pastille ▶ du CV (`bindPreconnexion`), une fois par page : le doigt précède
le clic de 100 à 250 ms, autant de pris sur la poignée de main avec
`youtube-nocookie.com` (l'audit a mesuré −0,36 s sur 8,2 du clic au
lecteur, en 4G lente : peu, mais pour rien).
**Jamais au survol** : ce serait ouvrir une connexion vers Google avant tout
geste, ce que la jaquette est là pour éviter.

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

**Le cadre de la couverture** (la première photo du montage) fait aussi la
vignette des lignes du CV et de l'onglet Dates, recadrée une fois pour toutes
(`<nom>-v.webp`) : le changer demande `python3 build/variantes-images.py`,
qui s'en aperçoit et la refait.

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

Une réplique trop longue pour sa ligne s'y replie en **équilibrant ses
dernières lignes** (`text-wrap: pretty` sur `.u-fit`) : cinq des trente
citations des pages finissaient, au téléphone, sur un quart ou un tiers de
ligne ; les fins de vers voulues (`\n`) ne bougent pas.

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
Sur une page spectacle **pré-rendue** (voir [Préparées au
survol](#préparées-au-survol-le-pré-rendu)), l'écriture — et son garde-fou
avec elle — attend que la page soit montrée : sans quoi, pré-rendue plus de
quelques secondes, elle s'ouvrait sur un titre déjà écrit.

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
  le fichier dans `Images spectacles/…`, relancez le script. Rien d'autre —
  sauf s'il annonce que la liste des versions écran large a changé (une
  photo de 2400 px gagne ou perd sa `-2400`) : régénérez alors les pages,
  `npm --prefix build run pages`. Les visiteurs revenus verront encore
  l'ancienne une fois : le service worker la leur sert de son cache (voir
  [Le service worker](#le-service-worker-swjs--les-polices-et-les-images-rien-dautre)).
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
  d'ouverture. **La première, c'est celle qu'on voit d'abord**
  (`awaitFirstPhoto`) : la première photo du travelling ; en mouvement
  réduit, où le travelling n'est pas montré, la couverture ; sans ouverture,
  la première photo du montage, ou l'affiche d'un film. On attendait la
  première du montage, six à dix écrans sous le travelling.
- **Ce qu'on voit d'abord part d'abord.** Ouvert depuis le CV, les deux
  premières photos du travelling partent d'emblée, la première en priorité
  haute ; en mouvement réduit, aucune (`travellingVu`, voir `ouvertureHtml`).
  Une page spectacle ne sait pas, en s'écrivant, si le mouvement sera
  réduit : ses photos attendent (`loading="lazy"`), et son en-tête précharge
  la première, hors mouvement réduit, exactement comme l'image la demandera
  (`imagesDuPlan`, partagé avec le générateur). Après un travelling, rien du
  montage ne part avant d'approcher — ni sa première photo, ni l'affiche
  d'un film, ni les copies floues —, et le fond du titre, qui ne paraît
  qu'au bout du travelling, passe en priorité basse. Mesuré au téléphone,
  en 4G lente à ×4 (trois passes, médianes) : la première photo arrive à
  2,3 s au lieu de 4,9 sur Cléophène, 2,0 au lieu de 5,5 sur Bérénice, 0,7
  au lieu de 3,0 sur Le rapt, sans plus rien devant elle (290 Ko sur
  Cléophène) ; le moteur est prêt 0,6 à 2,7 s plus tôt ; les images parties
  dans les cinq premières secondes pèsent 20 à 50 % de moins. Ouvert depuis
  le CV, la photo est prête 0,4 à 0,9 s plus tôt.
- **Les photos du travelling s'allument, elles ne claquent pas.** Tant
  qu'elles ne sont pas arrivées, elles attendent invisibles, carte comprise —
  son ombre dessinait un cadre vide au point de fuite, un rectangle clair
  dans une salle claire —, puis paraissent en fondu, ombre comprise : elle
  est portée par la photo (`allumerLesPlans`, `.est-decodee`). Une image déjà
  là est posée d'emblée. Sur une page spectacle, c'est l'en-tête qui les
  allume, dès leur arrivée : attendre le moteur, qui n'arrive qu'après
  elles, retenait la première 2,5 à 3,2 s de plus (4G lente, ×4). Le fondu
  part d'**un centième**, comme celui des vues de la galerie (voir [La
  planche contact](#la-planche-contact)) : la première photo est le plus
  grand affichage (LCP) de la page, et Chrome ne compte pas une image peinte
  à opacité nulle — partie de zéro, elle n'était retenue qu'à la fin de son
  fondu, 0,36 à 0,46 s après son arrivée. En mouvement réduit, pas de
  fondu ; sans JavaScript, rien n'est caché.
- La **croix et le bouton « Accéder aux dates » restent actifs** pendant ce
  chargement : on doit toujours pouvoir renoncer.
- Pas de `backdrop-filter` sur les légendes, qui défilent (il reste sur la
  croix, immobile).
- **Pas de `backdrop-filter` sur ce qui défile au-dessus d'un fond fixe**,
  sur l'accueil non plus. Les cartes (`.glass-card` : l'en-tête, les sections
  du CV et des Dates, le pied de page) portaient un flou de 8 px ; leur
  arrière-plan changeant à chaque image du défilement, chaque carte à l'écran
  coûtait à chaque image une passe de rendu, une relecture et un flou — pour
  ne rien flouter : une carte blanche à 3,5 % sur des dégradés lisses en
  sombre, opaque à 85 % en clair. Retiré, l'écran est le même (au plus
  0,02 % de pixels changés de plus de 3/255). Mesuré en défilant le CV
  (trois passes, médianes) : sur ordinateur, 34 % d'images perdues → aucune,
  2,0 → 0,57 s de travail du compositeur — en composition logicielle, sans
  carte graphique, où l'écart sera moindre ; au téléphone à ×4, 1,57 → 0,31 s
  de compositeur. Sur les Dates, avec le reste de ce lot : 36 % → 0 sur
  ordinateur, 1,2 → 0,17 s de compositeur au téléphone. La barre
  collée n'a plus le sien (voir [La barre d'onglets](#la-barre-donglets-reste-en-haut-mobile-et-desktop)) ;
  seules les fenêtres posées sur une page immobile gardent le leur —
  l'agenda de l'accueil, celui d'un univers ; la carte du lecteur vidéo,
  noire et opaque, n'en montrait rien (12/255 au plus, sur 0,05 % des
  pixels).
- **Un seul fond plein écran.** La radiale du thème (`--page-glow`) était
  peinte par le `<body>` en `background-attachment: fixed` — un calque de la
  taille de l'écran (11 Mo en DPR 3) — sous la lueur de salle (`body::before`,
  fixe, un second calque). Elle est passée dans `body::before`, sous la
  lueur. Même rendu (2/255 au plus) ; en défilant le CV sur ordinateur,
  212 → 80 peintures et 0,79 → 0,57 s de compositeur, au téléphone à ×4
  0,38 → 0,31 s. Et Safari sur iPhone, qui ignore `fixed`, étirait
  la radiale sur toute la hauteur du document.
- `contain: paint` sur les figures, mais **pas** `content-visibility: auto` :
  celui-ci faisait s'effondrer leur hauteur. (La page du CV, elle, passe en
  `content-visibility: hidden` sous le panneau ouvert, sa hauteur retenue :
  voir [Les passages](#les-passages-view-transitions).)
- **Rien ne se mesure pendant le passage** qui ouvre un univers depuis le CV,
  et le montage n'est posé qu'après lui : à ×4, le passage dure 0,7 s en 26
  images, au lieu de 2,7 s en 15 dont une figée 1,9 s (voir
  [Les passages](#les-passages-view-transitions)). La lumière se mesure une
  fois, en lisant tout avant d'écrire (voir
  [L'écriture à la lumière](#lécriture-à-la-lumière)).
- **Le CV démarre en une mesure.** `univers.js` lit le fond (`--c-bg`, pour
  la crête du lavis) avant d'écrire quoi que ce soit dans les lignes ; il
  égalise leurs hauteurs en trois temps, toutes listes confondues (tout
  retirer, tout mesurer, tout poser), place les pastilles ▶ de même, et
  n'écrit pas les murmures (voir
  [Le murmure](#le-murmure--le-synopsis-sur-la-ligne-du-cv)). Lire le fond
  après avoir écrit, puis mesurer liste par liste, recalculait trois fois
  les mêmes lignes. Mesuré au téléphone à ×4 (quatre passes, médianes,
  deux thèmes) : `init` 296-311 → 129-133 ms, la tâche du chargement
  539-563 → 346-355 ms, 393 éléments de moins. L'égalisation ne se refait
  qu'à un changement de **largeur**, et à l'arrivée des polices seulement
  si l'une est en route : la barre d'adresse du téléphone, qui se replie au
  premier défilement, la relançait pour rien (30 ms forcées à ×4, au départ
  du geste) — de même la mesure de la barre d'onglets pour les
  intercalaires des Dates, que son observateur suit déjà.
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
photo, qui se refloutait sous les yeux. `--ph` et `--pt`, la place des lignes
de la frise (`.rg-ligne`), non plus : ce qui les lit dans une ligne porte
`.rg-relais` et reçoit les mêmes valeurs qu'elle (voir
[Le CV, le bandeau](#le-cv-le-bandeau-la-page-404)). Le drapeau du repli est
posé **avant le premier rendu**, dans l'en-tête de l'accueil et des pages
spectacle, avec le même test que `regie.js` (le contrôle automatique compare
les deux).

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
  C'est le cas de `.u-fig--plein`, du cadre de l'affiche, comme du `<body>`
  pour la barre collante. Et quand l'élément suivi n'est pas celui qui
  bouge, la ligne de temps se **nomme** sur un ancêtre qui ne rogne pas
  (`view-timeline-name`) : la photo de l'affiche suit l'en-tête entier,
  jamais son cadre (voir [Le portrait d'affiche](#le-portrait-daffiche)) ;
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
JavaScript** (`univers-statique.css`), même chose. La scène d'ouverture y
quitte son confinement de taille (`container-type: normal`) : tenue, elle
mesure ses photos (les `cq*` de `.u-of-photo`) ; posée, sa hauteur ignorait
alors son contenu, retombait sur ses 60svh, et la scène, qui rogne, coupait
le synopsis, le rôle et « Accéder aux dates » sur les 9 fiches à ouverture
(jusqu'à 239 px sur « À la barre » au téléphone) — le Tab menait à un
bouton invisible.

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

**Le rideau et la trappe ne rognent rien à chaque image.** Ils faisaient
varier une coupe (`clip-path`), que le navigateur repeint à chaque image : le
récit était la phase la moins fluide après le zoom. Le même dessin vient
désormais de cadres fixes qui rognent (`overflow: clip`) et de déplacements.
Le surtitre et un cadre intérieur (`.u-rideau`) glissent en sens contraire,
d'une demi-largeur et d'une largeur : leur recoupement est une fenêtre qui
s'ouvre du milieu, et le texte (`.u-rideau-texte`), qui glisse d'autant en
retour, ne bouge pas. L'auteur et le rôle montent dans leur couche immobile,
qui les rogne à son bord bas ; leur marge y devient un retrait intérieur,
pour qu'ils montent de toute la hauteur de la couche, comme la couche
montait. Mesuré à ×4 au téléphone (Cléophène, trois passes) : peinture du
récit 25 → 3 ms, images lentes 6 → 2 %. Captures identiques à cinq points de
chaque course, au sous-pixel près, dans une salle claire et une sombre.

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
sur la page, au bord du trait. Le zoom se fait autour de ce point,
jusqu'à `--lettre-z` : l'écran entier dans l'encre de la lettre, mais **pas
plus de 2 400 px de corps sur un écran tactile** (12 000 ailleurs) — au-delà,
un téléphone renonce à dessiner la lettre en masque, et la photo s'en allait
par carreaux. Il s'accélère, comme une caméra qui passe une porte, et se
termine aux 85 % du zoom.

**Ce que le zoom coûte encore.** C'est la seule scène sous soixante images
par seconde : la lettre grandit dans un masque, que le navigateur ne sait ni
composer ni garder d'une image à l'autre, et il redessine la photo masquée à
chaque image. Deux dépenses invisibles s'y ajoutaient. Le masque, l'aplat qui
le fonde et la nuit couvraient neuf écrans (de −W à 2W, de −H à 2H) : ils
sont bornés à la scène, qui rogne de toute façon. Le filet des lettres, une
copie du mot qui en garde le zoom, continuait de grandir une fois éteint —
un calque de 14 273 × 10 840 px au bout du zoom de Cléophène — : il est caché
au bout de son fondu (`u-lettre-filet`, `visibility`). Mesuré à ×4 au
téléphone (Cléophène, trois passes) : pixellisation du zoom 329 → 152 ms,
tuiles au plus fort 382 → 204 ; la cadence ne change pas (33 ms par image).
Au-delà, raccourcir la course du zoom (`OUVERTURE_ZOOM`) ou changer la
technique du masque est un choix d'écriture à faire sur un vrai téléphone :
la pixellisation mesurée ici est logicielle, et le plafond de 2 400 px reste
à y éprouver.

**La porte s'ouvre** : de 70 % à 95 % du zoom, le trait des lettres du masque
s'épaissit (`--lettre-gonfle`, en unités de la lettre, calculé sans compter
sur l'encre autour du point de la porte, qui peut être à deux pixels de sa
place) jusqu'à ce que l'écran entier y tienne. Les bords de la lettre partent
vers ceux de l'écran ; la photo déjà dans la lettre ne bouge pas. Rien ne
monte en fondu sur une photo déjà là.

**La salle s'éteint** autour de la porte (`.u-lettre-nuit`, un aplat de la
couleur de la salle sous la photo), de 40 % à 80 % du zoom : les textes ne
transparaissent jamais. **La photo entière** (`.u-lettre-plein`), la même au
même endroit, ne paraît qu'après, sur les 4 derniers pour cent : invisible à
l'œil, elle garantit la fin sur la photo si un navigateur dessinait mal la
lettre.

La vérification exige la salle éteinte aux 83 % du zoom ; la lettre sous
2 400 px sur écran tactile ; et, aux 95,5 %, la salle repeinte en magenta
invisible sur une capture — la porte ouverte couvre l'écran à elle seule.

En mouvement réduit, le titre détoure la photo, posé, sans zoom. Sans photo de
couverture, pas de calque : le titre d'avant.

La porte d'une lettre ne dépend que de la lettre et de sa police : elle est
gardée (`porteDe`), et une réouverture ne redessine plus rien. Seulement une
fois la police du titre arrivée — tracée avec la police de secours, elle
serait fausse et le resterait.

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

**Une seule mesure, en trois temps** (`ecrireALaLumiere`) : toutes les
fenêtres retirées, tous les blocs mesurés sans rien écrire
(`mesurerLaLumiere`), puis tous posés (`poserLaLumiere`). Bloc par bloc, la
mesure d'un bloc suivait l'écriture du précédent, et le navigateur
recalculait tout le document entre les deux : 1,4 s de fil principal bloqué
à ×4 sur un téléphone, contre 45 à 60 ms désormais (la page couverte n'étant
plus rendue non plus), fenêtres identiques au pixel sur cinq spectacles.
Elle n'est plus doublée : la seconde mesure, sur `document.fonts.ready`, n'a
lieu que si une police est encore en route une fois la première faite
(`mesurerLesLignes`). Ouvert depuis le CV, tout attend la fin du passage
(voir [Les passages](#les-passages-view-transitions)).

### Les passages (View Transitions)

| Passage | Ce qui voyage |
|---|---|
| une ligne du CV → son univers, et retour | la boîte de la ligne, sa vignette (qui devient le **fond du titre**, `heroFondHtml`), son titre — `open`/`close` dans univers.js. Quand l'univers s'ouvre sur son travelling, le titre est au fond de la scène, pas encore là : seule la boîte voyage, et le titre s'écrit lettre à lettre au fond (`titreAuFond`) |
| le répertoire, l'onglet Dates → une page spectacle, et retour | la vignette → le fond du titre de la page (`fiche-<slug>`, entre documents). Quand la page s'ouvre sur son travelling, le fond du titre est au fond de la scène, invisible : la vignette s'enfonce dans la **première photo du travelling**, et la page en repart au retour (nom posé au `pagereveal` et au `pageswap`, rendu à la fin du passage). La paire d'images est rognée à la boîte qui voyage (`::view-transition-image-pair(*.fiche) { overflow: clip }`, dans les deux documents) : une image de passage ne rogne pas ce qui déborde de son cadrage, et la photo, en paysage, s'étalait hors de la carte en portrait, sur la carte voisine |
| une vignette du book → la photo, et retour | la photo (`book-photo`) |
| un onglet → un autre | la page, dans le sens de l'onglet ; la pastille glisse ; en quittant le CV ou en y revenant, le portrait, de l'affiche au médaillon (`portrait`, voir [Le portrait d'affiche](#le-portrait-daffiche)) |
| l'accueil → la galerie, et retour | le cadre de l'affiche, poursuite comprise → la première vue de la planche (`book-portrait`, nommé de part et d'autre s'il est à l'écran), sur le ressort. À l'aller, le nom et la pastille ont leur groupe (`book-nom`, `book-pastille`) et s'effacent au-dessus de la photo ; au retour, ils attendent invisibles (`vt-book-retour`) et reviennent en fondu, comme au retour sur l'onglet CV |
| le thème | un cercle depuis le bouton |
| l'ouverture → le site | un iris depuis le sceau ; le nom rejoint l'en-tête |

Chaque passage nomme ses éléments **juste avant** et retire les noms juste
après : un nom qui traîne sur un élément fausse le passage suivant. La petite
image ne se montre jamais en grand : une vignette de 48 px agrandie à l'écran
n'est qu'un flou vif — elle s'efface tôt à l'aller, et arrive tard au retour.
Navigateur sans View Transitions, ou mouvement réduit : l'ancien comportement
(dépliement en `clip-path`, fondu, coupe franche).

**Le sens d'un changement d'onglet est une classe** (`onglet-retour`, sur
`<html>`, posée seulement quand il change) ; la valeur du glissement
(`--onglet-dx`, ±28 px) est déclarée sur ses seuls lecteurs : les deux
images du passage et la page qui arrive, quand il n'y a pas de passage.
Écrite en ligne sur `<html>`, la variable était héritée par tout le
document, recalculé avant la capture : au téléphone à ×4, le passage partait
50 à 150 ms plus tard selon l'onglet, et le bandeau « Prochaine date »
répondait en 200 à 224 ms au lieu de 112.

**La boîte rogne ce qu'elle montre** (`u-boite`) : le panneau entier y était
posé à pleine largeur, hauteur libre, dans une boîte partie de la ligne ; au
début du passage, le surtitre, l'auteur, le rôle et « Le spectacle »
flottaient sous elle, par-dessus la liste du CV. Le panneau s'y découvre
désormais par le haut à mesure qu'elle grandit, et la ligne y garde sa
taille, épinglée en haut, sans s'étirer. Au retour, les rôles s'échangent —
la même règle au seul aller aurait agrandi la ligne douze fois, en texte
flou. Pas de rayon fixe : il aurait claqué à la dernière image.

**Pendant le passage d'une ligne du CV à son univers, le fil principal reste
libre.** Chaque image du passage attend qu'il le soit : tant que la
construction et les mesures du panneau tombaient dedans, la vignette mettait
2,7 s à devenir page au lieu de 620 ms, figée jusqu'à 1,9 s, et le geste
finissait 4 s après le toucher (téléphone, processeur ralenti ×4).
Désormais :

- **la première image est décodée avant** — dès l'appui au doigt, après 90 ms
  de survol à la souris (`prechaufferCouverture`), une fois par univers : le
  clic la trouve prête (3 à 6 ms entre le clic et le passage sur ordinateur,
  contre 40 à 65), toujours plafonné à 350 ms. Ce n'est la couverture, qui
  devient le fond du titre, que pour un univers sans travelling, ou en
  mouvement réduit : un univers qui s'ouvre sur son travelling — aujourd'hui,
  tous ceux qui ont des photos — ne montre d'abord que sa première photo, et
  c'est elle qu'on prépare, aux tailles où le panneau la demandera.
  Préparer la couverture, que ce passage ne montre pas, la faisait passer
  devant la seule image visible : au téléphone en 4G lente (×4, trois
  passes, cache comme en ligne), la première photo s'allume désormais à
  0,9 s de l'appui au lieu de 2,2 sur Cléophène, 0,8 au lieu de 2,5 sur
  Bérénice, 3,1 au lieu de 5,7 sur Audiences — le passage partant au plus
  0,2 s plus tard, le temps qu'elle arrive ;
- **la page couverte cesse d'être rendue** : le rappel du passage verrouille la
  page et pose `html.u-page-cachee` avant de construire le panneau —
  `content-visibility: hidden` sur `#site`, sa hauteur retenue par
  `contain-intrinsic-size: auto` (voir `univers.css`). Ce que le panneau fait
  recalculer ne porte plus que sur lui, et le CV n'est plus recalculé à chaque
  image du passage. Personne ne le voit : à l'aller, le nouvel état de la
  racine est invisible. Sans passage (mouvement réduit, navigateur sans View
  Transitions, historique), la page reste visible pendant le dépliement et
  n'est cachée qu'à sa fin (ou à la fin du fondu du panneau, quand rien ne se
  déplie) — d'emblée en mouvement réduit, où rien ne bouge. Toute fermeture la
  rend en premier (`fermer`) ; à l'impression, elle reste là ;
- **le rappel ne pose que l'ouverture et le pied** (« Accéder aux dates »
  répond tout de suite) ; le montage suit le passage, par tranches de quatre
  temps, une image entre chacune (`monterLeMontage`). Un saut aux dates avant
  la fin pose d'un coup ce qui manque — **pendant le passage aussi**, où les
  tranches ne sont pas encore parties (`poserToutLeMontage`) : au clavier ou
  d'un lecteur d'écran, le saut allait au pied posé sous l'ouverture, puis le
  montage s'insérait au-dessus, et l'on restait au milieu des photos, le pied
  10 000 à 13 000 px plus bas ;
- **la lumière et la lettre ne se mesurent qu'ensuite**, une seule fois (voir
  [L'écriture à la lumière](#lécriture-à-la-lumière)).

Mesuré à ×4 sur Cléophène et Bérénice : le passage part 0,69 à 0,72 s après
le toucher au lieu de 1,49 s, finit 1,39 à 1,44 s après au lieu de 4,1 à
4,2 s, et la plus longue image figée tombe de 1,8-1,9 s à 0,35 s ; sur
ordinateur, il finit à 1,1-1,2 s au lieu de 1,6 s. Vérifié : le panneau, la
lumière, la lettre et la page refermée sont identiques au pixel, et les
quatre chemins de fermeture rendent la page à la même position qu'avant.

### Le vocabulaire

`--ease-out` pour ce qui apparaît, `--ease-panel` pour ce qui se replie,
**`--ease-ressort`** (une courbe `linear()` qui dépasse sa cible de 4 % et s'y
pose) pour ce qui se **déplace** — la pastille des onglets, une vignette qui
devient page. `--dur-scene` (460 ms) pour un changement d'onglet,
`--dur-morph` (620 ms) pour une vignette qui s'ouvre. Les pages générées —
les pages spectacle, le répertoire, la galerie — relisent ce vocabulaire dans
`index.html` : les régénérer après l'avoir changé
(`npm --prefix build run pages`).

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
  ligne sous l'écran, le voile la suppose lue. **Ils n'héritent pas**
  (`@property`) : écrits à chaque image sur une liste de 500 éléments et sur
  chaque ligne, ils les faisaient tous recalculer pour cinq lecteurs — le
  fil, le point, le halo, le voile du bouton. Les pseudo-éléments les
  prennent à leur élément (`inherit`), et `regie.js` les écrit aussi sur les
  relais de la ligne (`.rg-relais` : le bouton et la vignette, marqués par
  `markCvRows`). Mesuré au téléphone à ×4 avec `?repli` (trois passes) :
  8 % d'images perdues au défilement du CV → 0,5 %, 19 tâches longues → 0,
  calcul de style 1,8 → 0,96 s ; sur les Dates, 12 tâches longues → 0,
  0,94 → 0,53 s. Une ligne loin
  de l'écran, pas encore mesurée, n'emprunte plus la place de sa liste :
  elle prend le repli ci-dessus.
  Voir « La frise » dans `index.html`. **L'année, elle, ne bouge pas** : elle
  montait sur la vignette depuis le bas du cadre, et toutes les années ont un
  jour disparu (voir ci-dessous) ; même réparée, la montée laissait sans année
  les vignettes du bas de l'écran. Une information ne s'anime pas.
- **L'ambiance** (la salle aux couleurs du spectacle survolé) n'hérite plus :
  la cible (`--ambiance-cible`) change une fois par geste, et seuls ses deux
  consommateurs — la lueur et la barre collée — glissent vers elle. Survoler
  une ligne recalculait les 2 276 éléments du document à chaque image.
  **La cible non plus n'hérite pas** : posée sur `<html>`, chaque geste
  recalculait encore tout le document — 1 199 éléments, 130 à 160 ms à ×4
  sous le doigt, une image perdue par ligne survolée sur ordinateur. Elle
  est déclarée sur `<body>` (dont la lueur, `body::before`, l'hérite
  explicitement) et sur la barre, et `univers.js` l'écrit sur ces deux-là.
- **La salle attend le geste.** À la souris, elle ne prend la couleur d'une
  ligne qu'après 120 ms du pointeur posé dessus ; une ligne amenée sous le
  pointeur par la molette attend qu'on cesse de défiler (400 ms) — la salle
  passait par sept à neuf couleurs en deux secondes. Le lavis et le murmure,
  eux, répondent toujours au survol. Au doigt, l'appui (lavis, salle, grain)
  n'est marqué qu'après 110 ms sans glisser, comme le navigateur le fait
  pour son propre `:active` : presque tout défilement du CV commence sur une
  ligne, et chaque glissement allumait puis éteignait la salle — un éclair
  coloré, et deux tâches longues (110 à 210 ms à ×4). Défiler le CV au
  doigt (téléphone, ×4, quatre passes) : 9 % d'images perdues → 4 %, calcul
  de style 394 → 137 ms. Un tap plus bref ouvre l'univers comme avant ;
  l'appui maintenu murmure toujours à 400 ms.
- **La prochaine date du CV** (`renderNextDate`). Une ligne de tableau de
  gare, en palettes : chaque palette est faite de quatre
  moitiés — le haut et le bas fixes, et deux volets qui battent en `rotateX`
  (Web Animations API) : le haut de l'ancienne lettre tombe, le bas de la
  nouvelle se pose. Chaque palette passe par trois à sept lettres de son jeu
  (un chiffre parmi les chiffres, une lettre parmi les lettres ; une lettre
  accentuée se pose sur son accent en dernier), dans l'ordre de lecture,
  22 ms d'une palette à l'autre : moins de deux secondes. Une seule fois, quand
  le tableau est à l'écran, après le rideau et les polices — et s'il ne l'est
  pas au moment de battre (une adresse qui vise l'onglet Dates : le CV n'y
  paraît plus, voir [Le portrait d'affiche](#le-portrait-daffiche)), il
  attend qu'on revienne. Pendant le
  battement (classe `td-roule`), les volets restent sur leur calque, repliés
  hors de vue entre deux battements, et chaque palette est isolée
  (`contain: strict`) : mesuré sur un téléphone lent simulé (processeur
  ralenti six fois), l'image médiane reste à 60 par seconde pendant le
  battement. Des données qui changent pendant le battement (la base en
  direct) posent aussitôt les bonnes lettres ; avant, elles le relancent.
  À la fin, les palettes sont toutes lues, puis toutes posées : lues une à
  une entre deux écritures, elles forçaient 50 recalculs — une tâche de 55 à
  85 ms à ×4. **Le voyant** du titre frappe ses deux coups en `transform` et
  en opacité : l'anneau est un disque derrière le point (`::after`), qui
  grandit et s'efface, après 3,43 s d'attente sans battre. Il était une
  ombre (`box-shadow`) animée sur sept secondes, et chaque image des sept
  secondes repassait par le fil principal : au téléphone à ×4, 368 images
  du fil principal dans les 8,6 premières secondes, 117 désormais, et
  517 ms de travail en moins — à chaque retour sur le CV.
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

**Le premier écran part avec la page.** Les dix-neuf vignettes attendaient
leur tour (`loading="lazy"`), celles du premier écran comprises : la plus
grande — celle que Chrome retient comme le plus grand affichage (LCP),
photo2 aujourd'hui — n'était demandée qu'après la mise en page, en priorité
basse (43 % de ce premier affichage à l'attendre, selon Lighthouse en
ligne). Les neuf premières partent désormais avec le HTML (le premier écran
au téléphone ; sept à l'ordinateur), et la plus grande à l'écran passe
devant (`fetchpriority="high"`) : le générateur la trouve en rejouant la
planche comme la feuille la compose, sur un téléphone et un ordinateur de
référence (`plusGrandeVue`). Les tailles écrites dans le HTML ont **deux
branches**, comme la planche à l'arrivée : quatre colonnes sous 640 px,
cinq au-delà (`SEUIL_TELEPHONE`, la même constante pour le script de tête,
l'échelle des boutons et la feuille). Elles n'en disaient qu'une, pour cinq
colonnes ; tant que tout était paresseux, la réécriture du script passait
avant les requêtes, mais des vignettes parties avec la page sur une taille
fausse se téléchargeaient deux fois. Vérifié à 390 px (×3), 412 px (×1,75)
et 1 440 px : chacune une seule fois.

**La planche n'attend aucune feuille** : sa feuille et `polices.css` sont
écrites dans la page par le générateur, comme au répertoire. Les deux
ensemble, au téléphone en 4G lente (×4, copie publiée, cinq passes) :
premier affichage 560 → 408 ms, plus grand affichage 1 860 → 1 576 ms.

**Les vues s'allument, elles ne claquent pas.** Chaque case passait du fond
sombre à la photo d'une image à l'autre, dix-neuf fois de suite. Une vignette
attend désormais invisible jusqu'à son arrivée, puis paraît en fondu
(`.allume-vignettes`, posée par le script de tête, qui marque chaque
arrivée d'un `est-decodee`). Une vignette arrivée garde sa marque : les
boutons − et +, la visionneuse (`book-photo`) et l'historique ne la font
pas repartir du noir. Le fondu part d'**un centième** et non de zéro :
Chrome ne compte pas une image peinte à opacité nulle, et la plus grande
vignette n'était retenue qu'à la fin de son fondu, 350 à 400 ms après son
arrivée ; un centième ne se voit pas, et avant son arrivée l'image n'a rien
à montrer. En mouvement réduit, pas de fondu ; sans JavaScript, la marque
manque et rien n'est caché.

**De l'accueil à la planche, le portrait.** La page consent aux passages
entre documents : la photo de l'affiche, nommée `book-portrait` au départ
de l'accueil, se range dans la première vue de la planche, que la page
nomme de même à son arrivée ; au retour vers l'accueil, l'inverse. Sur le
ressort (`--dur-morph`, `--ease-ressort`, relus dans `index.html`), les deux
images cadrées sur le visage comme l'affiche (50 % 28 %). Seulement si la
vue est à l'écran, jamais en mouvement réduit ; le nom est rendu à la fin du
passage. C'était la seule navigation du site sans passage.

---

## Images générées (à ne pas écraser sans les régénérer)

| Fichier | Rôle |
|---|---|
| `ressources/images/portrait-affiche-{480,720,960}.{webp,avif}` et `-720.jpg` | le [portrait d'affiche](#le-portrait-daffiche) de l'en-tête — `python3 build/variantes-images.py`, depuis la première photo du book. L'AVIF, réglé au SSIM de la WebP, pèse 27 à 38 % de moins : la page le propose en premier, la WebP ensuite, le JPEG en dernier |
| `ressources/images/profil-192.webp` | le médaillon de l'en-tête **imprimé** (le CV en PDF) ; `profil-192.jpg` et `profil-384.*` ne servent plus |
| `ressources/images/miniatures/bande-demo-{hommemoderne,lerapt}-640.webp` | les deux plans de la [bobine](#la-salle-de-projection) : les images que YouTube tire lui-même de la vidéo (`maxres2.jpg`, `maxres3.jpg`), bandes noires ôtées — à refaire à la main si la bande démo change |
| `ressources/images/og-adrien-vada.jpg` | vignette de partage (réseaux sociaux, 1200×630) |
| `ressources/images/miniatures/bande-demo-camera.{jpg,webp}` | miniature de la bande démo |
| `ressources/images/galerie/vignettes/<nom>-{320,640,960}.webp` | vignettes du book — `python3 build/variantes-images.py` |
| `ressources/images/univers/<slug>/<nom>-{640,1280}.webp` (et `-1920` pour un plein cadre) | versions allégées des photos d'univers, servies aux écrans de moins de 900 px et au répertoire, et au-delà avec la `-2400` quand elle existe — même script, lancé aussi par `prepare-univers-photos.py` |
| `ressources/images/univers/<slug>/<nom>-2400.webp` | la version **écran large** d'une photo de plus de 1920 px, à pleine définition — seulement quand elle pèse au moins 25 % de moins que le JPEG au même SSIM (voir plus bas) — même script, qui en écrit aussi la liste dans `univers-montage.js` (`ECRAN_LARGE`) |
| `ressources/images/univers/<slug>/<nom>-240.webp` | la **couverture** de chaque univers (la première photo de son montage), à son cadre entier : le halo de la salle noire quand on y joue sa bande-annonce, et le nom d'où l'on tire ses grandes versions — même script |
| `ressources/images/univers/<slug>/<nom>-v.webp` | la **vignette** : la même couverture, recadrée en 144 × 192 (48 × 64 à la densité 3) au `cadre` de son montage — sur chaque ligne du CV et dans l'onglet Dates — même script |
| `ressources/images/univers/<slug>/<nom>-flou.webp` | la **photo hors point**, 200 px passés au flou : la mise au point des univers fond la photo nette dessus (voir [Le mouvement](#le-mouvement--la-régie-les-scènes-les-passages)) — même script |
| `ressources/images/univers/variantes.json` | la **mémoire du script** : la qualité de chaque `-2400` ou la raison de son absence, le cadre de chaque vignette du CV, l'empreinte du JPEG d'où elles viennent — écrite par lui seul |

Les **sources** de ces images restent dans le dépôt et ne sont plus servies aux
visiteurs : `profil2_1080x1080.png` (avatar) et `profil_1000x1000.jpg`
(vignette de partage + book). Les régénérer si l'on change de portrait.

`build/variantes-images.py` ne refait que ce qui manque (pour ne pas laisser
de diff sans objet) ; `--tout` refait tout, `--nettoyer` efface les versions
dont l'original a disparu. Seules la `-2400` et la vignette se refont
d'elles-mêmes quand leur JPEG ou leur cadre a changé : `variantes.json` s'en
souvient. Pourquoi 1920 px pour un plein cadre : sur un téléphone tenu droit,
une photo en paysage y est agrandie jusqu'à couvrir toute la hauteur — trois
à quatre fois la largeur de l'écran.

**L'écran large.** L'écran d'ordinateur recevait les JPEG d'origine :
2,76 Mo de JPEG pour la page Cléophène, dont 696 Ko pour une seule photo. Une
version WebP de même définition est là pour le remplacer — seulement où elle
ne coûte rien à l'œil. Le script prend la qualité la plus basse, de 78 à 94, qui garde
un SSIM de 0,98 face au JPEG (la mesure de l'audit : luminance, fenêtres de
8 × 8 px), et n'écrit la version que si elle pèse au moins 25 % de moins.
Treize photos sur seize y gagnent 59 % (2,1 Mo pour 5,1 Mo de JPEG) ; le grain
de certaines demande plus (Cléophène 9 : q82, Fulguré.e.s 10 : q92). Trois
restent en JPEG, leur grain ne se laissant pas alléger : Cléophène 21,
À la barre 19, Audiences 8 — `variantes.json` dit pourquoi, chiffres à
l'appui. Les photos de groupe (1500 px) n'en ont pas. L'affiche d'un film non
plus : elle ne dépasse jamais 540 px à l'écran.

La page la propose par une **seconde source**, sans condition de largeur,
après celle des écrans de moins de 900 px (`pictureHtml`, univers-montage.js) :
les versions de la photo, `-2400` comprise, et le JPEG reste le `<img>` — le
repli de qui ne lit pas le WebP, et ce que montre l'agrandissement. Le
téléphone n'y gagne ni n'y perd rien : sa source passe avant, et plafonne à
1920 px. Une photo sans `-2400` n'a pas de seconde source : le navigateur y
prendrait la 1920 à la place d'un original plus fin. Lues jusqu'au bout sur
un écran de 1 440 px (densité 2), les pages s'allègent de 0,25 à 0,8 Mo —
Cléophène 3,06 → 2,26 Mo d'images, Bérénice 4,02 → 3,46, Audiences 4,31 →
3,78, As You Like It 3,10 → 2,62, Fulguré.e.s 1,50 → 1,05, À la barre 2,59 →
2,34 — et de 38 % à la densité 1, où suffit la 1920 (Cléophène 3,00 →
1,87 Mo).

**La liste des photos qui ont leur `-2400`** (`ECRAN_LARGE`, en tête de
`pictureHtml`) est écrite par le script, d'après `variantes.json` : une
version proposée mais absente serait une image cassée sur ordinateur. Quand
elle change — une photo remplacée gagne ou perd sa version écran large —, le
script le dit, et il faut régénérer les pages (`npm --prefix build run
pages`) ; le [contrôle automatique](#vérifier-le-site) échoue sinon. Les
plein-cadres de 1920 px (les films, Bérénice 2) n'ont pas de seconde source
non plus : leur `-1920`, à la définition de l'original, ne tient pas toujours
le SSIM de 0,98 (0,947 à 0,988 selon la photo, en q78).

**L'AVIF, pour le portrait seul.** C'est la première image de l'accueil, celle
qu'on attend : au SSIM de sa WebP, l'AVIF pèse 14, 22 et 30 Ko contre 19, 33 et
49 ; proposé avant elle (une `<source type="image/avif">`, après celle du
papier), il fait paraître l'accueil 0,33 s plus tôt (4G lente, processeur
ralenti ×4, téléphone : 4,11 → 3,78 s en médiane de cinq passes alternées,
sans recouvrement). Ailleurs, il ne vaut pas son
décodage, plus lent de 20 à 40 % : sur les photos de plateau, le gain allait
de 44 % à… une perte de 17 % (Cléophène 9 en 1280), selon le grain. Trop
incertain pour le généraliser.

Le script demande Pillow 11.3 ou plus (l'AVIF y est intégré) et numpy (le
SSIM) : `pip install pillow numpy`. numpy n'est chargé que s'il y a une
version écran large ou un AVIF à fabriquer ; sans lui, le script le dit et
s'arrête.

---

## Référencement

- Le domaine canonique est **`https://adrienvada.fr`** : ne pas réintroduire
  d'URL en `adrienvada.github.io` dans les balises `og:`, `canonical`,
  `robots.txt` ou `sitemap.xml`.
- Les données structurées « fiche artiste » (`Person`) sont dans le `<head>` ;
  les représentations (`TheaterEvent`) sont générées automatiquement depuis
  les dates, au repos après le chargement ou à l'ouverture de l'onglet Dates
  (voir [L'onglet Dates](#longlet-dates--une-ligne-deux-rangements-un-sommaire)),
  puis à l'arrivée de dates en direct qui diffèrent — rien à maintenir à la
  main. Toujours sur **toutes** les dates à venir, jamais sur la liste
  filtrée : pendant une recherche, elles ne gardaient que les dates
  trouvées. Elles sont
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
la page-répertoire `/spectacles/` — sa feuille et les polices écrites dans
son `<head>` —, et réécrit `sitemap.xml`.

**La fiche s'affiche avant son moteur.** Son panneau est écrit ouvert
(`<main id="show-universe" class="is-open">`) : sur l'accueil, le panneau
part d'une opacité nulle que le moteur lève en l'ouvrant ; ici il n'y a rien
à ouvrir, et ce fondu, joué par le compositeur après les cinq scripts de
fin de page, n'était pas compté par Chrome comme un affichage. Sur les
sources, aucun premier affichage émis (0 fois sur 3 sur Le rapt et
Bérénice ; Lighthouse : « NO_FCP ») : les pages faites pour être trouvées
n'avaient pas de mesure. Sur la copie publiée, il ne venait qu'au lever du
panneau. Au téléphone en 4G lente (×4), copie publiée, cinq passes : premier
affichage 1 848 → 900 ms sur Le rapt, 2 216 → 908 ms sur Bérénice. Ce que le
moteur écrit — le titre, le synopsis —
reste caché jusqu'à lui (`.u-anime`), et le repli sans JavaScript ne
change pas.

**Le répertoire n'attend aucune feuille.** Sa feuille, faite pour lui seul
(aucun cache partagé à perdre), et `polices.css` (adresses réécrites vers
`../ressources/polices/`) sont écrites dans son `<head>` : premier affichage
680 → 432 ms au téléphone en 4G lente (×4, copie publiée, cinq passes).
`polices.css` reste
la déclaration de référence. Les fiches gardent `univers.css` en `<link>`,
partagée par les onze.

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

**Le fragment revenu ne change plus d'onglet.** Il réveillait aussi le
gestionnaire `hashchange` de l'accueil, qui rappelait `showPage('page_cv')`
sur le CV déjà affiché — et `showPage` recadre la page au seuil de la barre
d'onglets. C'était la vraie source du déplacement, et les 320 ms ne la
couvraient que sur une machine rapide : sur ordinateur, le recadrage tombait
dedans (un éclair de 45 à 60 ms au mauvais endroit) ; sur un téléphone lent
(processeur ralenti ×4), il arrivait 1,4 à 2 s après le geste, et la page
restait au seuil (916 → 821 px). Le gestionnaire ne fait désormais rien
quand la page visée est déjà affichée : un showPage de moins, et son
recalcul, pendant le passage du retour.

Vérifié sur les quatre chemins de fermeture, en mobile (×4 compris) et en
desktop.

La page, cachée sous le panneau pendant qu'il est ouvert (voir
[Les passages](#les-passages-view-transitions)), est rendue **en tout premier**
à la fermeture, avant la position à reposer et le focus à rendre : c'est
elle qu'ils lisent. Sa hauteur étant retenue pendant qu'elle est cachée,
rien ne bouge dessous.

**Le panneau n'est vidé que si personne ne l'a rouvert.** Sans passage
(navigateur sans View Transitions, ou Échap en plein passage), la fermeture
vide le panneau 420 ms plus tard, le temps de son fondu. Une ligne rouverte
dans ce délai se faisait vider et cacher sous ses pieds : plus rien à
l'écran, la page inerte et verrouillée derrière jusqu'à Échap. Le vidage
retient le jeton de sa fermeture, et ne fait rien si une ouverture l'a
changé — la garde que `closeModal` a déjà dans `index.html`.

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

### Préparées au survol (le pré-rendu)

Chaque clic vers une fiche depuis l'accueil (67 liens dans l'onglet Dates)
refaisait tout : la page, ses feuilles, ses scripts, puis le démarrage du
moteur. Des **règles de spéculation**, dans le `<head>` de l'accueil,
demandent à Chrome de **pré-rendre** `/spectacles/<slug>/` et `/galerie/` dès
qu'on marque l'intention d'y aller. Au clic, la page est déjà faite : première
image 362 → 139 ms (100 ms par requête, mesure de l'audit), moteur prêt à
l'instant au lieu de 560 ms plus tard, et le passage entre les deux pages est
conservé.

- **`moderate`, jamais `eager` ni `immediate`** : ceux-là préparent toutes les
  pages d'un coup — données, requêtes Supabase —, pour des pages qu'on
  n'ouvrira pas, et Chrome n'en garde que dix. Deux pré-rendus au plus à la
  fois.
- **Au téléphone, `moderate` n'attend pas le toucher.** À la souris, c'est un
  survol de 200 ms. Au doigt, depuis 2025, Chrome prépare les liens restés à
  l'écran une demi-seconde après l'arrêt du défilement : plus de pages
  préparées sans clic, et certaines longtemps avant lui.
- **Une page préparée pour rien ne fait rien de visible** : elle ne compte pas
  de vue (le [chargeur de mesure](#mesure-daudience) attend
  `prerenderingchange`) et n'écrit pas son titre en cachette (`playWriting`
  attend aussi). Vérifié : préparée 15 s puis ouverte, la fiche commence son
  écriture à l'ouverture (0 lettre sur 8), et Umami compte une vue, au clic,
  avec le bon référent ; préparée sans clic, elle ne compte rien.
- **Le rideau d'ouverture n'est pas concerné** : les pages préparées n'en ont
  pas, et revenir à l'accueil depuis l'une d'elles se fait depuis le site, qui
  ne le lève pas.
- Les règles sont du **JSON**, pas du JavaScript : `alleger-publication.js`
  les relit comme telles (compilées comme un script, elles faisaient partir
  l'accueil non allégé). Safari et Firefox les ignorent, sans dommage.
- **Les pages générées en ont aussi** — les fiches, le répertoire, la
  galerie (`SPECULATION` dans `generer-pages-spectacles.js`, la même dans
  `generer-page-galerie.js`) : du répertoire, les onze fiches sont préparées
  comme depuis l'onglet Dates (le cas mesuré par l'audit, 362 → 139 ms), et
  la galerie d'une fiche. L'accueil et le répertoire n'y sont que
  **préchargés** (`prefetch` : le document seul, sans ses feuilles ni ses
  scripts) : l'accueil est lourd à préparer pour rien, et le retour arrière
  passe déjà par le cache avant/arrière. L'accueil, lui, ne pré-rend que les
  fiches et la galerie.

---

## Polices — servies par le site

Inter, Montserrat, Cinzel et Caveat sont dans `ressources/polices/`, déclarées
par `polices.css` ; licence SIL OFL 1.1 (voir `LISEZMOI.txt`). Elles venaient
de Google Fonts : une feuille bloquante sur un autre domaine, deux connexions
de plus avant le premier rendu, et l'adresse de chaque visiteur transmise à
Google. Chaque famille tient en deux fichiers (`latin`, `latin-ext`, ce
dernier ne se chargeant que pour un caractère qu'il est seul à avoir).
Pour changer de version : voir `LISEZMOI.txt`.

- **Demandées d'avance** (`preload`) : sur l'accueil, Cinzel, Montserrat et
  Inter ; sur les pages spectacle, Cinzel et Inter. Cinzel manquait à
  l'accueil — le préchargement datait d'un nom en Montserrat, et le nom est
  passé en Cinzel sans lui : le texte le plus en vue de la page s'affichait
  en serif de secours, puis changeait de forme 0,6 à 0,8 s plus tard. Inter
  reste : la retirer pour faire place à Cinzel lui coûtait 120 à 280 ms.
- **Le secours du nom tient la place de Cinzel** (« Cinzel repli », dans le
  `<head>` de l'accueil). En réseau lent la bascule demeure ; Georgia (Noto
  Serif sur Android) y reçoit les hampe et jambage de Cinzel — la ligne de
  base ne saute plus — et, mot par mot, la largeur de « Adrien » et de
  « VADA » en Cinzel (`size-adjust`), à 2 % près. Réglé sur ces deux mots :
  à refaire si l'on écrivait autre chose en Cinzel dans l'en-tête. Le
  changement de casse (Cinzel écrit ses minuscules en petites capitales),
  lui, reste.
- **Caveat vient après la page.** Elle n'écrit que la lettre et son aperçu, au
  pied du CV, mais l'aperçu la réclamait dès la première mise en page, devant
  le portrait (49 Ko, le portrait 170 à 230 ms plus tard en 4G lente).
  L'aperçu ne l'emploie plus qu'avec la classe `plume`, posée au premier
  moment de calme après le chargement, ou à l'ouverture de la lettre. Elle
  reste déclarée dans `polices.css` : la déclarer plus tard par l'API
  FontFace faisait recalculer le style de tout le document (76 à 126 ms à
  ×4). Sans JavaScript, le `<noscript>` du `<head>` la donne d'emblée — sous
  `:root .bio-handwritten`, pour passer devant la règle de base, qui vient
  après lui dans la page et l'emportait à poids égal.
- **Sur l'accueil publié, `polices.css` est dans la page** (voir [Ce qui part
  en ligne](#ce-qui-part-en-ligne-perd-ses-commentaires--pas-le-dépôt)) : le
  fichier reste la déclaration de référence, recopié à la publication. **Au
  répertoire et à la galerie aussi**, recopié cette fois par leurs
  générateurs (`policesEnLigne`), commentaires ôtés et adresses réécrites :
  relancer `npm --prefix build run pages` après avoir changé `polices.css`.
  Sur cette copie, **Cinzel passe en `font-display: block`** : la feuille
  écrite dans la page ne retient plus le premier affichage, qui précède
  désormais Cinzel, et le titre (« Galerie photo », « Répertoire ») paraissait
  en serif du système, en casse mixte, puis sautait aux petites capitales de
  Cinzel 130 à 170 ms plus tard sur la galerie, 45 à 65 ms sur le répertoire
  (4G lente, ×4). Il attend désormais ces quelques dizaines de
  millisecondes, invisible, et paraît dans sa police — au plus 3 s si elle
  ne vient pas. L'accueil garde `swap` : son repli est calé sur Cinzel.

---

## Le service worker (`sw.js`) — les polices et les images, rien d'autre

GitHub Pages sert **tout** avec `cache-control: max-age=600` — les polices et
le portrait comme la page —, et on ne règle pas ces en-têtes depuis le
dépôt. Au-delà de dix minutes, chaque revisite redemande chaque fichier au
serveur (« a-t-il changé ? », 25 fois « non » sur l'accueil), et la page
attendait chaque réponse — les polices avant le premier affichage.
`/sw.js` garde les **polices** et les **images** du site, les sert tout de
suite, et demande au serveur, derrière, s'il y a plus neuf pour la fois
suivante (*stale-while-revalidate*).

Revisite de l'accueil publié après expiration du cache, au téléphone en 4G
lente (×4), le service worker arrêté avant la visite — le cas réel au-delà
de dix minutes —, cinq passes alternées : premier affichage 416 → 348 ms,
plus grand affichage 432 → 348 ms, 25 → 6 requêtes que la page attend du
réseau (la page, ses scripts, ses feuilles) ; les 19 autres, polices et
images, lui sont servies d'emblée. **Le serveur, lui, n'en reçoit pas
moins** : le worker lui repose ces 19 questions derrière la page (304), plus
celle sur `sw.js` — 26 → 27 à la revisite (relevé sur la copie publiée,
deux passes alternées). Le gain est l'attente, pas le nombre de requêtes ni
les données. Rien pour une première visite ; le public est
celui qui revient sur le même appareil — Adrien d'abord, et Safari efface
tout d'un site non visité depuis sept jours.

**Prudent par construction.** Un service worker persiste chez le visiteur,
et un service worker trop zélé sert un site périmé sans que personne ne
sache pourquoi. Celui-ci :

- ne garde que `/ressources/polices/*.woff2` et les images de
  `/ressources/images/`, du même domaine, en réponse entière (200) ;
- ne touche **à rien d'autre** : ni les pages, ni les scripts, ni les
  feuilles, ni les dates (`dates.js`, `dates-live.js`, Supabase), ni
  `/admin/`, ni Umami. Dans Chrome (123 et plus), ces requêtes ne le
  réveillent même pas : il déclare à son installation des routes qui les
  envoient droit au réseau (`addRoutes`) ; ailleurs, son gestionnaire les
  laisse filer sans y répondre ;
- garde, dès son installation, les trois polices du premier écran (celles
  que l'accueil précharge), et ce que la première page a déjà chargé avant
  lui (elle lui en envoie la liste ; il le reprend du cache du navigateur,
  rien ne repart sur le réseau). Pas Caveat : elle ne vient qu'après la page,
  sur l'accueil seulement (voir [Polices](#polices--servies-par-le-site)) —
  l'installer d'office la faisait télécharger (49 Ko) par une fiche, la
  galerie ou la 404, qui ne l'emploient pas ; il la garde à son premier
  usage ;
- plafonne son stockage à 400 fichiers, les plus anciens partant d'abord ;
- n'empêche pas le cache avant/arrière (vérifié : accueil, répertoire, fiche,
  galerie restaurés).

Une image **remplacée sous le même nom** (portrait, photo d'un montage,
vignette recadrée, signature) est servie ancienne une fois à qui revient,
puis la nouvelle la remplace : l'ancienne à la visite qui suit la
publication, la nouvelle à la suivante. **Augmenter `VERSION` n'y change
rien**, contrairement à ce que ce paragraphe a longtemps promis : le nouveau
worker efface bien les caches des versions précédentes en s'activant, mais
la visite qui le découvre est encore servie par l'ancien, depuis son cache.
Rejoué (portrait remplacé, revisite au-delà de dix minutes, VERSION augmentée
ou non) : l'ancien à la 2e visite, le nouveau à la 3e, dans les deux cas.
Pour qu'une image paraisse dès la première revisite, il faut lui donner un
**autre nom**. `VERSION` reste l'outil pour purger un cache abîmé, ou après
avoir changé ce que le worker garde.

**Inscrit après le chargement**, par un petit bloc identique sur chaque page
publique — l'accueil et la 404 (dans le premier script du `<head>`), les
pages spectacle et le répertoire (`SERVICE_WORKER`, dans
`generer-pages-spectacles.js`), la galerie (`generer-page-galerie.js`) —,
pas par `/admin/` : rien de ce que la page demande ne l'attend.

**Pas sur l'aperçu Cloudflare.** Sur une adresse en `.workers.dev` (voir
[Regarder une branche](#regarder-une-branche-avant-quelle-ne-touche-le-site-cloudflare)),
le même bloc n'inscrit rien, et retire le worker qu'une visite passée y
aurait inscrit, ses caches avec. On y garde la page ouverte et on recharge
après chaque poussée : une photo remplacée sous le même nom y était servie
ancienne au premier rechargement (rejoué : l'ancien portrait au 1er, le
nouveau au 2e ; désormais le nouveau dès le 1er), et l'aperçu ne montrait
plus ce qui sera publié.

**L'interrupteur.** Pour le retirer : passer `RETIRE` à `true` dans `sw.js`
et publier. À sa visite suivante, chaque visiteur reçoit ce fichier, qui vide
ses caches et se désinscrit : le site redevient exactement celui d'avant.
Puis retirer le bloc d'inscription des pages (les quatre endroits ci-dessus,
régénérer les pages) — tant qu'il y reste, chaque visite réinscrit le
fichier, qui se désinscrit aussitôt : inoffensif, mais inutile. Vérifié :
bascule faite, la visite suivante n'a plus ni worker ni cache.

`alleger-publication.js` allège `sw.js` comme les autres scripts ; le
contrôle automatique vérifie qu'il ne garde que des polices et des images,
que ni la page ni un script ne passent par lui, et que l'interrupteur est là.

---

## Accessibilité — ce qui est tenu, et comment

Contrôlé avec axe (WCAG 2.2 AA) sur les quatre onglets, les deux thèmes,
mobile et bureau, l'univers ouvert, les pages spectacle, le répertoire, la
galerie et l'administration. À garder en tête en modifiant le site :

- **Une couche ouverte rend le reste inerte.** Univers, photo agrandie,
  agenda, récit, visionneuse de la galerie : tout ce qui est dessous reçoit
  `inert` (voir `isolerCouche` dans `univers.js`) — la touche Tab ne
  s'échappe plus derrière, un lecteur d'écran ne lit plus la page cachée —
  et le focus revient à la fermeture sur ce qui l'avait ouverte. **L'inertie
  arrive une image après la couche** (le focus, lui, y entre tout de
  suite) : posée dans le geste, elle faisait recalculer tout le document
  avant la première image de la couche — au téléphone à ×4, la lettre
  s'ouvrait en 224 ms (136 désormais), la photo agrandie en 184 (104),
  l'agenda en 240 (88). Une couche refermée avant annule la pose. Les
  fenêtres de l'accueil (agenda, salle noire) posent aussi leur verrou une
  image après, et à la fermeture rendent verrou, inertie et focus deux
  images après le départ de leur fondu (`openModal`, `closeModal`).
- **Un panneau replié est hors d'atteinte** : `visibility: hidden` en plus de
  la hauteur nulle (tiroirs du CV, séries de dates, filtres, archives). Sans
  cela, le clavier parcourait des liens invisibles. Il est aussi **hors du
  calcul** : `content-visibility: hidden`, qui bascule comme la visibilité, à
  la fin du repli — là où ce changement discret existe
  (`transition-behavior: allow-discrete`). Rien ne change pour le lecteur
  d'écran, le clavier ni la recherche dans la page (mêmes arrêts de
  tabulation, même arbre d'accessibilité, texte introuvable replié et trouvé
  déplié), et un changement d'onglet part 20 à 40 ms plus tôt à ×4.
- **Un texte animé lettre à lettre reste un mot** : lettres en
  `aria-hidden`, mot entier en `aria-label` (titre des univers). Pas de
  copie masquée du texte : un moteur la lirait collée aux lettres.
- **Une page, une hiérarchie** : sur une page spectacle le titre est un h1 et
  tous les titres du montage montent d'un cran (voir la fin de `panelHtml`).
- **Rien ne bouge sans fin** : voyant de la prochaine date, halo des univers, sceau de
  l'ouverture, fleuron et dorures du répertoire jouent une fois (ou trois)
  puis se taisent (WCAG 2.2.2) ; l'aperçu de la bande démo fait deux tours
  et se pose sur l'affiche — et, comme il bouge près d'une minute, un
  bouton l'arrête avant (voir [L'aperçu](#laperçu--lécran-vit-sans-vidéo)) ;
  la frise du CV et les scènes des univers ne bougent qu'avec le défilement.
  Le réglage « réduire les animations » coupe tout, et chaque scène a alors
  un état fixe qui a du sens.
- **Pas de texte sous 11 px** (la bulle du temps sur l'onde des démos voix
  était à 10,5), pas de cible sous 24 px (la piste des démos voix et les
  icônes du pied de page ont une zone de clic agrandie sans changer
  d'aspect) ; 44 px pour les boutons du mini-lecteur, l'arrêt de l'aperçu,
  le carré YouTube de la salle et la croix de la salle noire couchée.
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
  annonce la taille de l'affiche, la plus grande. **En AVIF d'abord** : c'est
  l'image qu'on attend, et au même SSIM elle pèse 27 à 38 % de moins que la
  WebP (30 Ko au lieu de 49 au téléphone) — l'accueil paraît 0,33 s plus tôt
  en 4G lente (voir [Images générées](#images-générées-à-ne-pas-écraser-sans-les-régénérer)).
  Qui ne lit pas l'AVIF prend la WebP, puis le JPEG. Le médaillon la cadre comme
  l'affiche (`object-position: 50% 28%`) : centrée, elle y mettait les yeux
  à 23 % de la hauteur contre 30 % sur l'affiche, et le passage de l'une à
  l'autre montrait deux visages.
- **Hors de l'onglet CV**, l'en-tête redevient la carte compacte d'avant,
  portrait en médaillon (`.replie`, posé par `showPage`, à côté du repli de la
  bio). **Le visage s'y range** : le portrait a son propre groupe dans le
  passage d'onglet (`portrait`, sur `.affiche-cadre`, poursuite comprise),
  qui le mène d'une place à l'autre sur `--dur-scene` et `--ease-ressort`
  et ferme l'arrondi en chemin — ou le rouvre au retour. Il passait de
  l'affiche (37 % de l'écran au téléphone) au médaillon d'une image à
  l'autre, pendant que tout le reste glissait. Seulement en quittant le CV
  ou en y revenant, et s'il est à l'écran ; en mouvement réduit, le
  changement reste net. Son groupe coûte peu — au téléphone à ×4, 15 à 30 ms
  de fil principal sur le passage, 1 à 4 points d'images perdues —, et le
  flou des cartes retiré, le changement d'onglet en perd moins qu'avant
  (40 → 30 % à l'aller, 39 → 21 % au retour). Au retour, ce qui se pose sur
  la photo — le nom et le métier au téléphone, la pastille « Galerie photo »
  partout — attend invisible sous elle, puis vient en fondu : il paraissait,
  disparaissait sous la photo qui grandissait, et revenait d'un coup. Le nom
  n'a pas son propre groupe : de deux lignes à une, le fondu montrait deux
  textes.
- **Arriver sur un autre onglet** (`#page_dates`, `#demos_camera`,
  `#demos_voix`) pose `arrivee-hors-cv` et `data-arrivee` sur `<html>` avant
  le premier rendu : l'affiche n'est jamais peinte pour être repliée, et la
  page visée paraît d'emblée, son onglet allumé, la bio et la prochaine date
  déjà repliées, sans transition, aux valeurs de `.bio-hidden`. Le premier
  `poserPage` retire les deux drapeaux dans le même calcul que les vraies
  classes : rien ne change de valeur, rien ne glisse. Le lien qu'on envoie à
  un théâtre, `adrienvada.fr/#page_dates`, montrait le CV 0,1 s au
  téléphone (0,5 à 0,7 s à ×4), puis repliait la bio et la prochaine date
  sous les yeux : la barre d'onglets remontait de 263 px. **Si le script de
  la page n'a pas démarré** (Safari 12 ou 13, qui lit le garde du `<head>`
  mais pas la syntaxe du reste ; une erreur avant le premier `poserPage`, le
  dessin des Dates compris), le filet de `js-revele` retire aussi les deux
  drapeaux, qu'il trouve encore posés après `DOMContentLoaded` : on retombe
  sur le CV, au lieu d'une page vide qui le cachait. Le vérificateur le
  rejoue, le script de la page rendu illisible.
- **La poursuite** : sur le portrait, la salle autour du visage est dans
  l'ombre ; à la souris, la lumière suit le pointeur (`suivrePoursuite`).
  Fixe au doigt et en mouvement réduit.
- **Le travelling arrière** : quand l'affiche sort par le haut, la photo
  glisse un peu moins vite que son cadre et s'approche (7 %, × 1,06), une
  animation menée par le défilement (`affiche-recul`), en transformation
  seule. La ligne de temps est nommée sur l'en-tête (`--affiche`, encart nul
  — l'encart par défaut retranche les 84 px du `scroll-padding-top`), et le
  cadre rogne en `clip` (voir [Ce que suit une animation au défilement](#ce-que-suit-une-animation-au-défilement)).
  La bande que la photo laisse en haut du cadre (4 % au plus) est toujours
  déjà sortie de l'écran, et le visage ne glisse que de 5 px au plus sous la
  poursuite, posée sur le cadre, tant qu'il se voit. Sans ligne de temps (Firefox), en
  mouvement réduit, pour une arrivée sur un autre onglet : rien ne bouge — un
  décor, que le repli de la régie ne mène pas.
- **Vers la galerie, le portrait** : au départ vers `/galerie/`, s'il est à
  l'écran, le cadre de l'affiche prend le nom `book-portrait` (retiré au
  `pageshow`) — c'est la première photo du book —, et se range dans la
  première vue de la planche, que la galerie nomme de même (voir [La planche
  contact](#la-planche-contact)). **Au retour**, la vue revient se poser
  dans l'affiche : l'accueil nomme son cadre à l'arrivée depuis la galerie,
  s'il le voit et hors mouvement réduit, et le rend à la fin du passage.
  **Le cadre, pas la seule photo**, comme pour le passage d'onglet : la
  photo seule nommée, la poursuite, le nom et le métier (posés sur l'affiche
  au téléphone) et la pastille « Galerie photo » restaient dans la page,
  sous elle. À l'aller, ils disparaissaient en une image et la photo
  s'éclaircissait avant de bouger ; au retour, ils restaient cachés tout le
  passage (0,9 s) puis claquaient ensemble en une image — l'écart au rendu
  final, dans la zone du nom, tombait de 43 à 0 d'une image à l'autre. La
  poursuite voyage désormais avec la photo ; à l'aller, le nom et la
  pastille ont leur propre groupe (`book-nom`, `book-pastille`, sans pendant
  dans la galerie) et s'effacent au-dessus d'elle ; au retour, ils attendent
  invisibles sous `vt-book-retour` et reviennent en fondu une fois la photo
  posée (l'écart descend de 23 à 0 en 0,35 s).
  Cette écoute (`pagereveal`) vit dans le premier script du `<head>` : le
  passage se prépare au premier rendu, pendant que la page se lit encore, et
  le script principal arrivait trop tard pour nommer quoi que ce soit. Au
  retour de la galerie, le même script fait attendre ce premier rendu
  jusqu'au portrait (`<link rel="expect" blocking="render">`, vers
  `#portrait-affiche`) : il pouvait le précéder, et la vue revenait sans se
  poser — trois retours sur dix-huit, avant comme après l'AVIF ; aucun
  depuis. Ailleurs, rien n'attend.
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
dessous **la bobine** — un plan par extrait, qui lance le film à ce
moment-là. Les extraits y sont présentés en **chapitres** — le numéro, le
titre, le début et la fin —, et la **durée** de la bande démo est écrite sous
l'écran (3:01) :

| Chapitre | Début (`data-salle-debut`) | Fin |
|---|---|---|
| 1 · L'Homme moderne | 0 s | 1:21 (le début du suivant) |
| 2 · Le rapt | 81 s (1:21) | 3:01 (la durée) |

- **La durée, 181 s, n'était écrite nulle part** dans le dépôt — ni dans les
  données structurées, ni sur la page —, et la fin du dernier extrait non
  plus. Elle a été lue le 4 octobre 2026 dans ce que YouTube répond à son
  lecteur intégré pour cette vidéo (« VADA - Démo caméra 2026 », champ
  `videoDurationSeconds` de l'aperçu d'intégration,
  `youtube-nocookie.com/embed/GOeL5AMGb_s`), et posée en constante :
  `DUREE`, à côté de `DEBUTS` (`index.html`, « LA SALLE DE PROJECTION »),
  avec ce commentaire. Elle est écrite à trois endroits : la constante, le
  « 3:01 » sous l'écran, la fin du dernier chapitre — **le vérificateur les
  confronte**, et confronte chaque chapitre à son début.
- Le bouton de l'écran dit ce qu'il lance et combien de temps : « Lancer la
  projection : bande démo caméra d'Adrien Vada, 3 min 01 » — le mot qu'on
  voit sur l'écran est dans son nom.
- **La légende est sur le halo.** Sous une photo claire de l'aperçu, la
  lumière qui déborde de l'écran monte, au téléphone, jusqu'à une luminance
  de 0,16 sous le titre : le crème d'avant n'y tenait que 3,5:1. Le titre et
  la durée sont passés à un blanc chaud (`#f8f3ea`, 4,5:1 au pire, mesuré),
  avec une ombre douce ; le carré YouTube, une icône, à 3,3:1 ; le numéro et
  le minutage des chapitres à 5,8:1 sur le noir.
- **Le halo** : le plan réduit à 32 × 14 points dans un canevas, agrandi et
  flouté une fois pour toutes par la feuille (`.salle-halo`) — le flou n'est
  jamais animé, seule l'opacité l'est, en passant d'un canevas à l'autre. Sur
  la page, il peint ce que montre l'écran — l'affiche au repos, la photo que
  l'aperçu y fait passer (peinte depuis l'image déjà là, sans la redemander)
  — et l'extrait survolé sur la bobine.
  L'affiche de l'écran est en `loading="lazy"` : l'onglet est caché au
  chargement, et ses 16 Ko ne passent plus devant le portrait ; le halo
  attend son arrivée et se peint à la première ouverture de l'onglet.
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
  moitié et aux trois quarts), remettre les débuts des extraits dans la
  bobine et dans `DEBUTS` (`index.html`, « LA SALLE DE PROJECTION »), et la
  durée dans `DUREE`, sous l'écran et à la fin du dernier chapitre.

**Les bandes-annonces du CV** passent dans la même salle noire. La pastille ▶
d'une ligne (`addTrailerPill`, `univers.js`) appelle `ouvrirBandeAnnonce`
(`index.html`) avec la première vidéo du montage du spectacle : YouTube
(`youtube-nocookie.com`) ou Vimeo (`player.vimeo.com`, `dnt=1`). La salle
prend alors la classe `.bande-annonce` : pas de bobine, le halo pris à la
photo de couverture du spectacle (celle de sa vignette), et « Bande-annonce ·
titre » en tête. La pastille reste un vrai lien : clic du milieu, Ctrl-clic
ou « ouvrir dans un nouvel onglet » mènent toujours à la plateforme.

### L'aperçu — l'écran vit, sans vidéo

L'écran montrait une image fixe : rien ne disait qu'un film attendait
derrière. Il n'y a aucun fichier vidéo dans le dépôt, et l'on n'en ajoutera
pas : **l'écran vit avec les photos des deux films**. Un fondu enchaîné lent
de cinq photos — Arthur à la table, la chanson de Melvin, la tête sur la
table (L'Homme moderne) ; Steven ligoté, puis riant sur la plage (Le rapt) —,
chacune dans un léger travelling, puis le retour à l'affiche. Le bouton
« Lancer la projection » reste au centre, et ouvre la salle noire comme
avant. Pendant qu'une photo passe, la bobine éclaire son chapitre, et le
halo prend sa lumière.

- **Deux tours, puis l'affiche, pour de bon** : rien ne bouge sans fin sur ce
  site. Et comme deux tours font près d'une minute de mouvement à côté du
  reste de la page, un bouton **« Arrêter l'aperçu »** (le rond ❚❚ dans le
  coin de l'écran, cible de 44 px) l'arrête tout de suite (WCAG 2.2.2) ; il
  n'existe que pendant l'aperçu, et rend le focus à l'écran. Lancer la
  projection l'arrête aussi : il a fait son office. Posé pour de bon, il
  rend sa mémoire : ses photos quittent la page (décodées, les cinq
  occupaient une quinzaine de mégaoctets).
- **Il ne joue que si l'on peut le voir** : l'onglet Caméra ouvert, l'écran à
  moitié au moins dans la fenêtre (un `IntersectionObserver` — aucun travail
  au défilement), la page au premier plan. Sorti du champ, il attend, son
  travelling figé, et reprend où il en était. Quitter l'onglet l'arrête et
  rend l'affiche ; y revenir rejoue les tours qui restent — pas ceux qui sont
  faits.
- **Ses photos ne partent qu'à sa première projection** : jamais avec
  l'accueil, et, quand on arrive par un lien sur l'onglet Caméra, après la
  fin du chargement de la page. Elles sont fabriquées à ce moment-là (le
  balisage n'en contient aucune : `.apercu` est vide), en 640 ou 1280 px
  selon la hauteur de l'écran et sa densité (`srcset`, et un `sizes` calculé
  sur la photo telle qu'elle s'affiche, plus large que l'écran) : 54 à
  131 Ko pour les cinq, une requête chacune.
- **Il ne joue pas du tout** en mouvement réduit, ni quand le navigateur
  demande d'économiser les données (`navigator.connection.saveData`, et
  `prefers-reduced-data`) : pas une photo demandée, l'affiche reste. Le
  réglage changé pendant l'aperçu le rend à l'affiche.
- **Transformation et opacité, rien d'autre.** Le travelling est un
  `transform: scale()` de 1,01 à 1,11 (ou l'inverse, une photo sur deux),
  autour du point que cadre l'univers du film (son `cadre`, dans
  `univers.js`) ; le fondu, l'opacité. Le survol de l'écran assombrissait
  l'affiche par un filtre (`brightness`) en transition : c'est désormais un
  voile noir à 15 %, même rendu, et seule son opacité bouge. Une photo qui
  arrive se pose **sur** la précédente, restée pleine dessous, qui disparaît
  d'un coup une fois couverte : deux fondus croisés laisseraient voir
  l'affiche à travers les deux.
- **Le zoom ne montre jamais un bord** : une mise à l'échelle supérieure à 1
  autour d'un point de l'image garde l'écran couvert. Les photos de L'Homme
  moderne ont leurs bandes noires de cinémascope dans le fichier (7,34 % en
  haut et en bas) : `.a-barres` agrandit leur boîte pour qu'elles tombent
  hors de l'écran.
- **Régler l'aperçu** : le rythme est dans la feuille, `--apercu-plan`
  (4,6 s par photo) et `--apercu-fondu` (1,6 s) sur `.salle` ; le script les
  lit et le travelling les reprend. Les photos et le nombre de tours sont
  dans `PLANS` et `TOURS` (« L'APERÇU », dans le script) : une photo est
  désignée par son dossier et son numéro dans `ressources/images/univers/`
  — ses versions 640 et 1280 existent déjà, `variantes-images.py` les fait
  pour tout le montage —, avec son point de cadrage et le chapitre qu'elle
  éclaire.

### Le téléphone couché

On couche son téléphone pour regarder un film. La salle noire y gardait sa
carte, son bandeau, sa bobine et ses marges : sur 390 px de haut, la vidéo
n'en avait plus que 220. Couché et bas (`orientation: landscape` et 500 px
de haut au plus — pas une tablette), **le lecteur prend toute la hauteur**
(100dvh), au format 16:9 tant que la largeur le permet, centré dans le noir.
La page est en `viewport-fit=cover` : le lecteur reste dans la zone sûre
(`env(safe-area-inset-*)`), hors de l'encoche et de la barre d'accueil. Le
titre, la bobine et le halo disparaissent ; la croix reste, seule dans le
coin haut droit, sur le noir de côté (presque tous les téléphones sont plus
larges que 16:9), et Échap ou le geste de retour referment la salle.

Le plein écran de YouTube (son bouton, dans l'iframe) fait de l'iframe
l'élément plein écran de la page : au doigt, on demande alors l'écran couché
(`screen.orientation.lock('landscape')`) et on le rend à la sortie.
L'API n'existe pas partout et ne s'accorde qu'en plein écran (sur iPhone, ou
hors plein écran, la promesse est refusée) : on ne la demande qu'en plein
écran, et un refus ne dit rien.

### Un seul son à la fois

La salle noire — bande démo ou bande-annonce — met en pause la démo voix qui
joue (voir [le mini-lecteur](#démos-voix--le-mini-lecteur-lenchaînement-lécran-verrouillé)) :
elle reste dans le mini-lecteur, prête à reprendre. C'est la coupure que
faisait autrefois tout changement d'onglet, gardée là où deux sons se
recouvriraient vraiment.

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
qui est lu, `--c-s300` pour ce qui reste), à la densité de l'écran, sans
plafond (plafonnées à 2, les barres bavaient à DPR 3). La barre garde son rôle
de curseur, son clic, ses flèches et le repli sans en-têtes Range. Sans
script, la piste d'avant.

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
jouait. Clic, toucher et clavier passent par le même chemin — y compris sur
une démo pas encore chargée : on vise avec `data-duree`, et le point est posé
dès que le fichier répond.

**Une démo n'est demandée que quand on s'en approche** (`amorcerDemo`).
L'onglet Voix amorçait les huit à son ouverture : 821 Ko en seize requêtes,
pour des durées que `data-duree` donne déjà, et un toucher précoce sur la
quatrième démo attendait derrière les sept autres. Seule la première est
amorcée à l'ouverture ; les autres au doigt qui se pose (une centaine de
millisecondes avant le clic), à la souris qui entre sur la carte, au
clavier qui y arrive. Mesuré en 4G lente simulée (trois passes) :
l'ouverture tire 127 Ko au lieu de 821 ; toucher la quatrième démo 0,3 s
après l'ouverture fait entendre la voix en 0,47 s au lieu de 0,69 ; le
revers — une démo jamais approchée, touchée tard — 0,35 s au lieu de 0,15.

## Démos voix — le mini-lecteur, l'enchaînement, l'écran verrouillé

Changer d'onglet **coupait la démo** et la remettait au début (`poserPage`) :
on ne pouvait pas écouter une voix en lisant le CV — ce que fait justement
un directeur de casting. La lecture continue désormais d'un onglet à
l'autre, et un **mini-lecteur** (`#lecteur-voix`, `lecteurVoix` dans
`index.html`) la suit.

- **Il paraît dès qu'une démo joue** : le nom de la démo et sa nuance, le
  temps (« 0:12 / 0:39 »), précédente, lecture/pause, suivante, et une piste
  fine qui avance par une transformation (`scaleX`) — rien à remettre en
  page quatre fois par seconde. La croix arrête la démo, la remet au début,
  et le referme. Les cartes ne changent pas : au repos, la durée seule
  (« 0:39 ») ; pendant la lecture, « 0:12 / 0:39 ».
- **Sa place.** Au téléphone, juste au-dessus de la barre d'onglets du bas,
  8 px plus haut, sur la même largeur : la hauteur de la barre est
  **mesurée** (un `ResizeObserver`, jamais au défilement), pas devinée — elle
  suit la taille du texte. Sur grand écran, en bas à droite (420 px). La
  page garde sa fin visible au-dessus de lui (`.lecteur-ouvert` : la place
  réservée en bas de `#site` grandit de 64 px, et le défilement au clavier
  s'arrête au-dessus). Le changement d'onglet ne l'emporte pas avec la
  page : il a son propre groupe dans la View Transition, comme la barre.
- **Ce qui est peint suit l'élément `<audio>`, pas le geste** : le bouton
  d'une carte et le mini-lecteur se repeignent sur `play` et `pause`. Une
  démo peut s'arrêter ou partir sans qu'on touche sa carte — l'écran
  verrouillé, un casque, la salle noire, l'enchaînement —, et tout le dit
  pareil. `activeAudioId` est la démo du mini-lecteur, en pause comprise ;
  elle ne redevient `null` qu'à la croix.
- **L'enchaînement** : à la fin d'une démo, la suivante démarre, dans
  l'ordre de la page — sauf après la dernière, où le lecteur reste sur
  elle, en pause, revenu au début. La suivante est amorcée aux trois quarts
  de celle qui joue (`amorcerDemo`) : elle part sans attendre son fichier.
  Elle est lancée dans l'événement `ended` lui-même, sans délai : Safari ne
  laisse partir un son sans geste que dans la seconde où le précédent, lancé
  d'un geste, vient de finir. Si un navigateur la refuse quand même, elle
  attend dans le mini-lecteur, prête (« Reprendre la lecture »), et
  l'annonce dit « En pause : … » au lieu de « Lecture : … ».
- **L'écran verrouillé, le casque, les touches multimédia** passent par
  l'API Media Session : titre (« L'Oréal — Grave, doux, sincère (home
  studio) »), « Adrien Vada », « Démos voix », et le portrait
  (`profil-192.jpg`, `profil-384.jpg`) ; lecture, pause, arrêt, précédente
  et suivante (absentes sur la première et la dernière démo), aller à un
  point, reculer et avancer de dix secondes. La position est posée à chaque
  départ, pause, saut ou changement de vitesse ; le système l'extrapole
  entre deux.
- **Accessibilité** : une région nommée (« Lecteur des démos voix »), quatre
  boutons nommés de 44 px, le focus visible. « Lecture : L'Oréal, grave,
  doux, sincère… » est annoncé à chaque démo qui part vraiment — celle qu'on
  touche comme celle qui s'enchaîne —, par une région discrète (`polite`)
  posée **à côté** du lecteur : une région qui paraît en même temps que son
  texte n'est pas toujours lue. La précédente et la suivante absentes sont
  `aria-disabled`, pas `disabled` : le bouton qu'on vient de presser garde
  le focus. Fermé au clavier, le lecteur rend le focus au bouton de la démo
  s'il est à l'écran, sinon à l'onglet affiché. Rien ne s'imprime
  (`no-print`).
- **Un seul son à la fois** : la salle noire met la démo en pause (voir
  [Un seul son à la fois](#un-seul-son-à-la-fois)).

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

Umami (compte européen), chargé dans le `<head>` de **toutes** les pages. Sans
cookie, sans identifiant persistant, sans recoupement entre sites : la mesure
reste dans le cadre que la CNIL exempte de consentement, et le site n'a donc
pas de bandeau à imposer en premier écran.

**Un chargeur, pas une balise.** Umami n'est plus une balise
`<script defer src>` mais un petit script en ligne qui l'insère — le même
partout, seuls ses attributs changent. Deux raisons :

- **`defer` faisait attendre le démarrage.** Un script différé s'exécute
  avant `DOMContentLoaded`, que l'événement attend — et tout le site y est
  branché. Umami servi avec 2,5 s de retard, et tout l'accueil démarrait
  d'autant plus tard : `DOMContentLoaded` à 2,6 s au lieu de 0,2 s sur une
  machine rapide, à 3,2 s au lieu de 2,4 s en 4G lente. Inséré par script, il
  est `async` : personne ne l'attend.
- **Une page pré-rendue n'a pas été vue.** L'accueil fait préparer les pages
  spectacle et la galerie au survol de leurs liens (voir [Préparées au
  survol](#préparées-au-survol-le-pré-rendu)) ; Umami, lui, compte la vue dès
  que la page est prête, qu'on y aille ou non. Le chargeur attend
  `prerenderingchange` quand `document.prerendering` est vrai : une page
  préparée pour rien ne compte rien, et la vue d'une page préparée part au
  clic, avec le bon référent (vérifié avec le vrai traceur, servi en local).

Le chargeur recopie les attributs qu'Umami lit sur sa propre balise
(`document.currentScript`, défini aussi pour un script inséré) :
`data-website-id`, `data-domains`, et sur l'accueil `data-before-send`. Il
vit **avant les feuilles de style** : un script en ligne placé après une
feuille l'attend, et toute la suite de la page avec lui.

**Les gestes d'avant son arrivée attendent.** En `async`, Umami arrive souvent
après le démarrage — or `entree` part au démarrage : sans file, il était perdu
à chaque fois dans l'essai à 2,5 s de retard. `track()` range donc ce qui
vient trop tôt dans `window.avMesureEnAttente` — **vingt gestes au plus**, pour
qu'une page où Umami ne vient jamais (bloqueur) n'accumule rien —, et le
chargeur rejoue la file à l'arrivée d'Umami. Le verrou « `?sansmesure` » ne
change pas : un geste muet n'entre pas dans la file.

**Où vit le chargeur.** Quatre endroits, et pas un de plus :

| Page | Écrite par |
|---|---|
| `index.html` | à la main, dans le premier script du `<head>`, avec l'interrupteur (voir plus bas) |
| `404.html` | à la main |
| `/spectacles/` et les onze pages spectacle | `build/generer-pages-spectacles.js`, constante `MESURE` |
| `/galerie/` | `build/generer-page-galerie.js` |

Ne pas oublier une page en ajoutant une page : pendant longtemps `index.html`
était seule à compter, alors que les pages spectacle sont précisément celles
qu'on fabrique pour être trouvées — douze adresses du sitemap sur treize ne
disaient rien.

Tout passe par **`track(nom, details)`** — aucun appel direct à `umami`
ailleurs dans le code, pour n'avoir qu'un endroit à changer le jour où l'on
change d'outil. Si l'outil n'est pas encore là, le geste attend dans la file ;
s'il ne vient pas (bloqueur, réseau), rien ne part : aucune fonctionnalité du
site ne dépend de la mesure.

`track()` est défini par `index.html`. Les pages spectacle, qui ne chargent pas
ce script, reçoivent le **même** `track()` et la même délégation des
`data-track` de `univers.js` (`brancherMesure`), avec le même verrou
« `?sansmesure` » et la même file d'attente : leurs clics « Réserver » ne
comptaient nulle part auparavant. Les boutons « Réserver » des univers portent `date_booking`,
comme ceux de l'onglet Dates — sur l'accueil comme sur les pages spectacle.

Deux façons de relever un geste :

| Voie | Comment |
|---|---|
| **Déclarative** | `data-track="nom"` sur un lien ou un bouton, `data-track-detail="…"` en option. Fonctionne aussi sur ce qui est fabriqué après coup (dates, bandeau, filtres). |
| **Explicite** | `track('nom', { … })` là où le geste n'est pas un clic. |

Événements en place. Ce qu'on a **regardé** :

`entree` (onglet d'arrivée), `intro` (coupée ou menée au sceau, et durée),
`univers_ouvert` / `univers_ferme` (spectacle, durée de lecture), `demo_ecoute`
(jalons 25 / 50 / 75 / 100 %, une seule fois par démo et par visite — une
démo enchaînée compte comme une autre), `demo_suivante` (une démo voix a
démarré sans qu'on la choisisse dans la liste : son nom, et `par` —
`enchainement` quand la précédente a fini, `lecteur` pour le bouton
« suivante » du mini-lecteur, `systeme` pour l'écran verrouillé, le casque
ou le clavier ; il dit si l'on reste écouter la démo d'après),
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
2. `data-before-send="avAvantEnvoi"`, que le chargeur d'`index.html` pose sur
   la balise — Umami demande son avis avant chaque envoi.
3. le garde en tête de `track()` — le seul démontrable : cette fonction est
   l'unique point de sortie du site.

Le verrou nº 2 existe parce que le nº 1 est [rapporté comme n'arrêtant pas les
événements sur mesure](https://github.com/umami-software/umami/issues/3031) —
or ce site n'est presque que ça.

Ça n'efface pas le passé, et ça ne vaut que sur l'appareil et le navigateur où
l'on s'est armé. Vider ses données le désarme.

**`data-domains="adrienvada.fr"`**, recopié par chaque chargeur : la mesure ne
compte que le domaine public. Le même `index.html` est aussi servi par les aperçus de branche
Cloudflare ; sans cette restriction, chaque relecture d'une maquette viendrait
gonfler les chiffres du vrai site. Ailleurs que sur le domaine listé, le script
se charge et ne compte rien — c'est à retoucher le jour où le site changerait
de nom de domaine, sans quoi la mesure s'arrêterait en silence.
