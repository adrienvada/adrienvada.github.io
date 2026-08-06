# Notes techniques — adrienvada.fr

Site statique hébergé sur GitHub Pages, servi sur le domaine **adrienvada.fr**
(fichier `CNAME`). Aucune étape de build n'est nécessaire pour publier : il
suffit de pousser sur `main`.

Une seule exception : **la feuille de style**.

Pour prévisualiser le site en local (les chemins absolus type `/favicon_io/…`
ne fonctionnent pas en ouvrant simplement le fichier) :

```bash
npx --yes serve -l 8080 .
```

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
au centre, pendant que les rôles joués défilent de plus en plus vite. En
parallèle, « Adrien Vada » — superposé au même endroit que les rôles — apparaît
en fondu et les remplace peu à peu. Un **sceau** se trace enfin : il faut
**cliquer dessus pour entrer** (l'intro ne se referme jamais toute seule).

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

### Régler l'animation

Tout est dans les constantes en haut de `intro.js` :

- `ROLES` — la liste et l'ordre des rôles. Les 2 premiers (Antiochus, Le Juge)
  se décodent lettre à lettre pour rester lisibles ; les suivants s'emballent.
- `ACCEL_START_INDEX` — à partir de quel rôle l'accélération démarre (2).
- `ACCEL_RATE` — brutalité de l'accélération (0.72 ; plus petit = plus violent).
- `OPENING_STEP_MS` / `OPENING_FRAMES` — rythme des rôles d'ouverture.
- `updateFade()` — courbe du fondu rôles → nom (exposant 1.6 : le nom reste
  discret au début, puis prend le dessus sur la seconde moitié).
- `MAX_INTRO_MS` — garde-fou : au-delà, le voile disparaît quoi qu'il arrive.
  Ne jamais le descendre sous la durée naturelle de la séquence, sinon
  l'animation serait coupée avant la fin.

Le script `/private/tmp/.../timing.js` n'est pas versionné ; pour vérifier la
durée totale après un réglage, le plus simple est de compter à l'œil ou de
rouvrir avec `?intro=1`.

### Garde-fous en place

L'ouverture ne doit jamais empêcher d'accéder au site. Sont déjà couverts :
`prefers-reduced-motion` (intro désactivée), clic n'importe où, n'importe quelle
touche, bouton « Passer », onglet en arrière-plan (le décor attend sans bloquer
la séquence), et le minuteur de sécurité `MAX_INTRO_MS` (20 s). Le contenu réel
est dans le DOM dès le départ : les moteurs de recherche et les lecteurs d'écran
ne voient jamais le voile.

⚠️ Comme la sortie attend désormais un **clic sur le sceau**, `MAX_INTRO_MS` est
le seul filet en cas de blocage. Ne pas le descendre : il ne doit se déclencher
que dans les situations anormales, jamais pendant une contemplation tranquille.

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

Un extrait YouTube sur **toute la largeur**, en 16/9. On accepte l'identifiant
seul ou l'adresse entière — `youtu.be/…`, `watch?v=…`, `/embed/…`, `/shorts/…` :
ce qu'on a sous la main en copiant depuis YouTube. `c` donne la légende.

**Rien n'est demandé à YouTube avant le clic.** Le bloc n'affiche d'abord que
l'affiche du film ; le lecteur — un mégaoctet de scripts et ses traceurs —
n'est fabriqué qu'au moment où l'on veut voir. Le lecteur est ensuite servi
par `youtube-nocookie.com`.

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
- Penser à mettre à jour `<lastmod>` dans `sitemap.xml` lors d'une refonte.
