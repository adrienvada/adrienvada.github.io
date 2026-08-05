/**
 * ============================================================
 *  UNIVERS DES SPECTACLES — plein écran depuis le CV
 * ============================================================
 *  Au clic sur une ligne du CV, au lieu du simple tiroir de dates,
 *  on ouvre une page plein écran qui prend la palette du spectacle :
 *  le titre s'écrit, le synopsis s'inscrit, puis le montage se déroule
 *  et se termine sur les prochaines dates.
 *
 *  AJOUTER / MODIFIER UN UNIVERS
 *  -----------------------------
 *  La clé de chaque entrée doit être EXACTEMENT la valeur de
 *  `data-cv-show` sur le <li class="cv-item"> correspondant dans
 *  index.html — même appariement que pour les dates, sans rapprochement
 *  approximatif. Un spectacle sans entrée ici garde l'ancien tiroir :
 *  c'est le cas volontaire de « L'imaginaire forcé » et « Cassandres »,
 *  dont la direction visuelle n'est pas arrêtée.
 *
 *  CHAMPS
 *  ------
 *  palette   les couleurs du spectacle, injectées en variables --u-*
 *            sur le seul panneau (le reste du site n'est pas repeint).
 *  synopsis  s'inscrit mot à mot sous le titre. 2 à 4 phrases.
 *  cast      la distribution, en générique de fin. Le nom d'Adrien y figure
 *            comme les autres — c'est la vérité du plateau — et le moteur
 *            le souligne tout seul.
 *  castNote  précision sous la distribution : « * en alternance »…
 *  prix      le palmarès, au générique juste avant la distribution. Une
 *            entrée par ligne ; le point médian sépare la distinction de
 *            l'endroit où elle a été remise :
 *              'Prix du jury · Jeju International Film Festival, 2024'
 *            La distinction prend l'accent, le reste le gris. Sans point
 *            médian, toute la ligne prend l'accent.
 *  credit    photographe, affiché au pied du panneau.
 *  kind      'film' pour un court métrage : un film n'est pas « à
 *            l'affiche », n'a pas de tournée, et son pied de page renvoie à
 *            sa fiche au lieu des dates. Absent = spectacle.
 *  role      remplace le rôle lu sur la ligne du CV, quand celle-ci n'en
 *            porte pas (les courts métrages) ou en dit autre chose.
 *  sequence  LE MONTAGE. Un élément = un temps du défilé, dans l'ordre.
 *            `sequence: []` est un état légitime : un spectacle qui n'est
 *            pas encore créé n'a pas d'images à montrer.
 *
 *  LES SIX EMPLACEMENTS DE TEXTE
 *  -----------------------------
 *    { chapter: 'I', chapterTitle: 'Le palais' }
 *        intertitre : un chiffre et deux mots, qui donnent au défilé une
 *        structure d'actes.
 *    { q: 'une phrase', by: 'qui la dit' }
 *        carton plein écran, en Cinzel. `\n` = fin de vers.
 *    { text: 'un paragraphe…' }
 *        prose posée, plus longue : note d'intention, mot de mise en scène.
 *    { p: [12], over: 'texte', overBy: '…', overAt: 'gauche' }
 *        INCRUSTATION sur la photo. `overAt` : gauche | centre | droite |
 *        bas. Réservé au plein cadre — sur une vignette de groupe le texte
 *        couvrirait toute l'image.
 *    { p: [12, 7], aside: 'texte' }
 *        note en marge d'un groupe, sous les vignettes.
 *    { p: [12], c: ['légende'] }
 *        légende de photo, discrète, en petites capitales.
 *
 *  UNE VIDÉO
 *  ---------
 *    { video: 'dQw4w9WgXcQ', c: ['Teaser du spectacle'] }
 *        Un extrait YouTube sur toute la largeur, en 16/9. On accepte
 *        l'identifiant seul ou l'adresse entière — youtu.be, watch?v=,
 *        /embed/, /shorts/ : ce qu'on a sous la main en copiant depuis
 *        YouTube. `c` donne la légende, comme pour une photo.
 *        Une valeur non reconnue est signalée dans la console et le bloc
 *        est ignoré — jamais de lecteur monté sur une adresse douteuse.
 *        RIEN N'EST DEMANDÉ À YOUTUBE AVANT LE CLIC : on ne montre que
 *        l'affiche du film. Le lecteur — un mégaoctet de scripts et ses
 *        traceurs — n'est fabriqué qu'au moment où l'on veut voir.
 *
 *  LE CADRAGE D'UNE PHOTO
 *  ----------------------
 *    { p: [9, 5, 6], cadre: { 9: 'haut', 5: '38% 22%' } }
 *        Les cadres du défilé recadrent en `object-fit: cover` : sans
 *        mention, c'est le centre du fichier qui survit, pas le sujet.
 *        `cadre` désigne le point à garder — par NUMÉRO de photo, jamais
 *        par rang dans le tableau. Une photo non mentionnée ne bouge pas.
 *        Le réglage appartient au temps du montage : la même photo peut
 *        être cadrée autrement plus loin.
 *        Mots : haut, bas, gauche, droite, centre, et les quatre coins
 *        (« haut gauche »…). Ou deux pourcentages, horizontal puis
 *        vertical, pour viser juste. Une valeur non reconnue est signalée
 *        dans la console et la photo reste centrée.
 *        L'agrandissement au clic montre toujours la photo entière.
 *
 *  Tous s'écrivent MOT À MOT au rythme du défilement (voir updateReveals).
 *
 *  LES PHOTOS
 *  ----------
 *  1 photo = plein cadre, 2 = duo, 3 = trio, 4 = quatuor. Les NUMÉROS sont
 *  ceux des fichiers de `ressources/spectacles/<spectacle>/` — le même
 *  langage que les planches-contact.
 *
 *  CE FICHIER EST LA SEULE SOURCE des numéros de photos :
 *  `build/prepare-univers-photos.py` vient les lire ici. Changer un montage
 *  se fait donc ici seulement, puis on relance :
 *      python3 build/prepare-univers-photos.py
 *  qui copie les originaux allégés dans `ressources/images/univers/<slug>/`.
 *
 *  DROITS SUR LES TEXTES
 *  ---------------------
 *  Les textes marqués « REMPLISSAGE » sont de la prose neutre écrite pour
 *  tenir la place — ce ne sont PAS des répliques des pièces. Les seules
 *  vraies citations sont celles du domaine public (Racine, Corneille,
 *  Shakespeare). Reproduire le texte d'une pièce contemporaine —
 *  Fulguré.e.s, Audiences, À la barre — demande l'accord de l'auteur.
 * ============================================================
 */

const SHOW_UNIVERSES = {

    // ── EN CRÉATION ──────────────────────────────────────────────────
    //  Deux spectacles qui n'existent pas encore. Leur univers n'a donc
    //  pas de montage : un titre, ce qu'on en sait, et le pied de page.
    //  `sequence: []` n'est pas un oubli — c'est l'état juste.

    'Cassandres': {
        slug: 'cassandres',
        // ⚠️ PALETTE PROVISOIRE. Rien n'est public sur ce spectacle et sa
        // direction visuelle n'est pas arrêtée : ces couleurs disent le nom,
        // pas la mise en scène. La cendre et le rouge de l'alerte qu'on
        // n'écoute pas — à remplacer dès que le plateau existe.
        palette: {
            bg: '#0f0e10', surface: '#1b191d', text: '#eeeaea', muted: '#9a9298',
            accent: '#b8452f', accentInk: '#cf5a41', onAccent: '#ffffff',
            line: 'rgba(238,234,234,0.14)', glow: 'rgba(184,69,47,0.30)'
        },
        // Pas de synopsis : je n'en sais rien, et en inventer un serait pire
        // que de n'en pas mettre. La page se tient très bien sans — et le
        // murmure du CV reste muet tant qu'il n'y a rien à murmurer.
        sequence: []
    },

    "L'imaginaire forcé": {
        slug: 'imaginaireforce',
        title: 'L’Imaginaire forcé',
        subtitle: 'd’après Le Mariage forcé, de Molière',
        // La bougie et les tréteaux : l'or chaud d'une salle du XVIIe,
        // le rouge de la farce, le brun d'un plateau de bois.
        palette: {
            bg: '#160f0a', surface: '#241811', text: '#f6ead8', muted: '#b79b7d',
            accent: '#d4823c', accentInk: '#e39a58', onAccent: '#160f0a',
            line: 'rgba(212,130,60,0.20)', glow: 'rgba(212,130,60,0.30)'
        },
        synopsis: ['Sganarelle veut se marier.',
            'Il demande conseil à tout le monde,',
            'et n’écoute personne.'],
        sequence: []
    },

    'Bérénice': {
        slug: 'berenice',
        // Blanc majeur, rose et noir mineurs : la lumière crue d'une
        // séparation, le rose seulement là où ça touche.
        palette: {
            bg: '#f6f3ef', surface: '#ffffff', text: '#181215', muted: '#6d5d63',
            accent: '#c0637e', accentInk: '#a34a66', onAccent: '#ffffff',
            line: 'rgba(24,18,21,0.13)', glow: 'rgba(192,99,126,0.30)'
        },
        cast: ['Angelo Jossec', 'Manon Rivier', 'Lauren Toulin', 'Adrien Vada'],
        credit: 'Olivier Héron',
        synopsis: 'Rome, an 79. \n Huit jours après la mort soudaine de l\'empereur Vespasien, le destin de Bérénice, Titus et Antiochus bascule.',
        sequence: [
            { chapter: '1h25', chapterTitle: 'Une mise en scène resserrée, accessible et exigeante, au service d\'un des plus beaux poèmes en alexandrin' },
            { p: [2], c: ['Un triangle amoureux élevé au rang de la tragédie.'] },
            {
                q: ['« Que le jour recommence et que le jour finisse', 'Sans que jamais Titus puisse voir Bérénice. »'], by: 'Bérénice, acte V'
            },
            { p: [18], c: ['La scène est une arène en hyper proximité avec le public, baignée dans une ambiance sonore et musicale live.'] },
            {
                p: [12, 5], c: ['Bérénice, Antiochus, Acte III', 'Paulin, Titus, Bérénice, Acte II'],
                // REMPLISSAGE
                aside: 'Une des plus belles partitions classique pour un personnage féminin qui sert « d\'exemple à l\'univers ».'
            },
            {
                q: '« Depuis huit jours je règne ; et jusques à ce jour,\n' +
                    'Qu\'ai-je fait pour l\'honneur ? J\'ai tout fait pour l\'amour. »', by: 'Titus, acte IV'
            },
            {
                p: [1, 9, 11], c: ['Bérénice, Titus, Acte II', 'Antiochus, Acte V', 'Paulin, Antiochus, Acte I'],
                // REMPLISSAGE
                aside: 'La pureté des émotions transposée en thriller psychologique.'
            },
            {
                p: [3], c: ['Un travail au plus plus proche de l\'alexandrin racinien pour en éprouver la virtuosité.'],
            },
            {
                q: ['« Vous m’aimez, vous me le soutenez,', 'Et cependant je pars, et vous me l’ordonnez ! »'],
                by: 'Bérénice, acte IV'
            },
            { p: [7, 13, 16], c: ['Bérénice, Antiochus, Acte I', 'Antiochus, Paulin, Titus, Acte IV', 'Bérénice, Antiochus, Titus, Acte V'] },
            {
                text: 'Un spectacle exigeant qui déconstruit les a priori sur le théâtre classique pour transmettre ce patrimoine universel.'
            },
            { p: [17, 19], c: ['Lycée La Salle, Rouen', 'Espace Jean Legendre, Compiègne'] }
        ]
    },

    "Cléophène, d'après Rodogune": {
        slug: 'cleophene',
        // Le CV écrit le titre entier ; en Cinzel 5rem il tiendrait sur
        // trois lignes. Le titre se réduit donc au nom, le reste passe
        // en sous-titre.
        title: 'Cléophène',
        subtitle: 'd’après Rodogune, de Corneille',
        // Chaleur désertique : or, brun sombre, une lumière basse.
        palette: {
            bg: '#150c05', surface: '#241608', text: '#f5e8d2', muted: '#b59878',
            accent: '#d9a24a', accentInk: '#e6b767', onAccent: '#150c05',
            line: 'rgba(217,162,74,0.20)', glow: 'rgba(217,162,74,0.32)'
        },
        cast: ['Angelo Jossec', 'Manon Rivier', 'Lauren Toulin', 'Johann Abiola',
            'Adrien Vada'],
        credit: 'Arnaud Bertereau',
        synopsis: ['Royaume de Pyrie, 124 av. J-C.',
            'Lorsqu’un roi meurt et qu’il est père de jumeaux,',
            'lequel des deux est l’aîné et doit prendre sa place ?'],
        sequence: [
            {
                p: [7],
                c: ['Adaptation et mise en scène : Angelo Jossec — compagnie Crescite']
            },
            {
                chapter: '1h30',
                chapterTitle: 'Un drame familial de l’amour et de la haine'
            },
            {
                p: [10, 17], c: ['', ''],
                aside: ['La reine n’a jamais prévu de révéler la primogéniture.',
                    'Elle promet le trône à celui de ses fils',
                    'qui lui donnera la vie de la princesse parthe.']
            },
            {
                p: [21], c: ['La coupe'],
                over: ['« Cette coupe est suspecte,', 'elle vient de la reine »'], overAt: 'bas'
            },
            {
                q: ['« Tombe sur moi le ciel, pourvu que je me venge ! »'],
                by: 'Cléophène'
            },
            { p: [23], c: [''] },
            {
                p: [20, 15], c: ['', ''],
                aside: ['Deux jeunes princes vertueux et inexpérimentés,',
                    'face à deux reines assoiffées de sang,',
                    'et ils aiment la même femme.']
            },
            {
                p: [16], c: [''],
                over: ['« Jusqu’où serez-vous', 'semblables ? »'], overAt: 'droite'
            },
            {
                text: 'Au prologue, un spectateur reçoit un poignard et distribue les rôles : ' +
                    'c’est lui qui décide, ce soir-là, lequel des deux comédiens sera l’aîné. ' +
                    'Ce poignard servira.'
            },
            { p: [18, 13, 9], c: ['', '', ''] },
            {
                q: ['« Rodogune ? Shakespeare n’a rien écrit de plus beau. »'],
                by: 'Stendhal, 16 juillet 1804'
            },
            { p: [5], c: ['Front contre front'] }
        ]
    },

    'As You Like It': {
        slug: 'asyoulikeit',
        // La forêt d'Ardenne : verts superposés, et les couleurs
        // criardes du bouffon qui viennent dérégler l'ensemble.
        palette: {
            bg: '#0c2013', surface: '#153322', text: '#eaf7e2', muted: '#9dc3a0',
            accent: '#c2d94b', accentInk: '#cfe36a', onAccent: '#0c2013',
            line: 'rgba(194,217,75,0.22)', glow: 'rgba(217,79,43,0.35)'
        },
        cast: ['Alexis Debieuvre*', 'Noémie Fourdan', 'Nicolas Gaspar', 'Nanou Harry',
            'Clotilde Maurin', 'Laurent Prache*', 'Bastien Spiteri', 'Laurène Thomas',
            'Adrien Vada'],
        castNote: '* en alternance',
        credit: 'Clara Delmas',
        synopsis: ['Bannie de la cour, Rosalind s’enfuit dans la forêt des Ardennes. Déguisée en berger sous le nom de Ganymède, elle est accompagnée de son bouffon Touchstone et de sa cousine Celia. Elle y retrouvera d\'autre membres de la cour exilés, les bergers du pays et le jeune homme dont elle est tombée amoureuse.'],
        sequence: [
            {
                chapter: '2h',
                chapterTitle: 'La comédie shakespearienne traduite et adaptée en spectacle théâtral et musical tout terrain, pour un public dès 12 ans.'
            },
            {
                p: [3],
                over: ['« Le monde entier est un théâtre... »'], overAt: 'centre'
            },
            {
                q: ['« ...et tous les hommes et les femmes rien d’autre que des acteurs.', 'Ils ont leurs entrées et leurs sorties. »'],
                by: 'Jaques, ACTE II'
            },
            {
                p: [16, 14, 9], c: ['Extérieur, ACTE I', 'Extérieur, ACTE V', 'Intérieur, ACTE V'],
                aside: 'Neuf comédiens incarnant gens de cour et paysans réunis dans la même forêt.'
            },
            {
                p: [8], c: ['Dans As you like it, le rythme surprend et change à chaque instant. C\'est lui qui doit nous emporter.'],
            },
            {
                q: ['« Un humain au cours de sa vie joue plusieurs rôles,',
                    'ses actes étant les sept âges. »'],
                by: 'Jaques, ACTE II'
            },
            {
                p: [11, 1, 4], c: ['Adurey, Touchstone, ACTE V', 'Rosalind, Duke Frederick, Celia, ACTE I', 'Celia, Rosalind, ACTE II'],
            },
            {
                text: 'Des comédiens et des musiciens forment un joyeux orchestre. C’est comme une fête ! Et dans toute bonne fête, le rythme, la musique et le paysage sonore priment.'
            },
            {
                p: [15, 13],
                c: ['Château de Villerville', 'Le Studio d\'Asnières'],
            },
        ]
    },

    'Audiences': {
        slug: 'audiences',
        // Salle de classe plutôt que salle d'audience : Audiences se joue au
        // collège, et c'est d'abord un outil de transmission. D'où le fond
        // clair — papier, lumière de salle, lisibilité — et le bleu d'encre
        // scolaire en accent. Le noir des robes n'a pas disparu : il est
        // passé dans le texte et les filets, et il est déjà partout dans les
        // photos. La palette de À la barre, elle, reste noire et rouge :
        // même sujet, mais pas le même geste.
        palette: {
            bg: '#edeff1', surface: '#ffffff', text: '#14171c', muted: '#59606b',
            accent: '#4573c4', accentInk: '#2e5799', onAccent: '#ffffff',
            line: 'rgba(20,23,28,0.15)', glow: 'rgba(69,115,196,0.20)'
        },
        // Sur le CV, l'accent ne peut pas servir tel quel : il est sombre
        // pour porter du texte blanc sur le fond clair de l'univers, et il
        // paraîtrait alors plus nocturne que Fulguré.e.s — l'inverse de ce
        // que disent les deux spectacles. Le filet prend donc un bleu de
        // craie : l'école, le tableau, la clarté.
        cvAccent: '#8fbfe8',
        cast: ['Steeve Brunet', 'Marine Chambrier', 'Adrien Vada'],
        synopsis: ['Un spectacle de prévention, joué au collège.',
            'Violences sexistes et sexuelles, stéréotypes, consentement —',
            'à travers le prisme de la justice.'],
        sequence: [
            {
                p: [8],
                c: ['Écriture collective, mise en scène : Steeve Brunet — Cie du P’tit Ballon']
            },
            {
                chapter: '40 min',
                chapterTitle: 'Puis 30 minutes de débat — niveaux 4ᵉ et 3ᵉ'
            },
            {
                q: ['Victime. Irréparable. Accusé. Avocat.',
                    'Émotion. Juge. Défendre. Sursis.',
                    'Acquitté. Procédure. Peine. Vérité.'],
                by: 'Les mots de la justice'
            },
            {
                p: [6, 5], c: ['', ''],
                aside: ['Adapté d’À la barre pour le collège,',
                    'créé en résidence-jumelage au collège Boieldieu, à Rouen,',
                    'avec tout le niveau de 4ᵉ.']
            },
            {
                p: [4, 1], c: ['', ''],
                aside: ['Les différents tribunaux, leur composition,',
                    'le déroulé d’un procès — et ce qu’on y dit vraiment.']
            },
            {
                text: 'Un spectacle très léger dans son installation, qui se joue à une ' +
                    'comédienne et deux comédiens, au sein des établissements scolaires ' +
                    'comme dans les théâtres. Après la représentation, le débat s’appuie ' +
                    'sur un violentomètre : « Pourquoi suis-je violent ? »'
            },
            {
                q: ['C’est un outil de prévention.'],
                by: ''
            },
            { p: [2, 3], c: ['', ''] }
        ]
    },

    'À la barre, peine perdue ?': {
        slug: 'alabarre',
        palette: {
            bg: '#08080b', surface: '#131620', text: '#ececef', muted: '#9899a4',
            accent: '#c8102e', accentInk: '#e2455c', onAccent: '#ffffff',
            line: 'rgba(236,236,239,0.14)', glow: 'rgba(31,58,147,0.40)'
        },
        cast: ['Marion Casabianca', 'Anne Cosmao', 'Rémi Dessenoix', 'Valérie Diome',
            'Adrien Vada'],
        castNote: 'Jeu et mise en scène collective.',
        credit: 'Arnaud Bertereau',
        synopsis: ['Inspirés d’affaires réelles, les échanges entre magistrat·es,',
            'accusé·es, victimes et avocat·es révèlent la complexité',
            'd’une justice en souffrance.'],
        sequence: [
            {
                p: [19],
                c: ['Texte : Ronan Chéneau — CDN de Normandie-Rouen, création 2026']
            },
            {
                chapter: '1h05',
                chapterTitle: 'Puis 45 minutes de débat — tout public dès 15 ans'
            },
            {
                q: ['« Comment, dans ces conditions,', 'réussir à “rendre justice” ? »'],
                by: ''
            },
            {
                p: [20, 8], c: ['', ''],
                aside: ['Les agressions se dissimulent au cœur du quotidien :',
                    'dans le couple, la famille, les ami·es, au travail.']
            },
            {
                p: [22], c: ['Rôle · juge, accusé, greffier, avocat, narrateur'],
                over: ['« Avant d’entrer dans la fiction,', 'nous allons passer par le réel. »'], overAt: 'gauche'
            },
            {
                p: [4, 13], c: ['', ''],
                aside: ['Créé en 2024 au palais de justice de Rouen.',
                    'Joué à Avignon dans le tribunal',
                    'où fut tenu le procès des viols de Mazan.']
            },
            {
                q: ['« Not all men, but always a man. »',
                    'Pas tous les hommes, mais toujours un homme.'],
                by: ''
            },
            { p: [14, 12], c: ['', ''] },
            {
                text: 'La justice est imparfaite parce qu’elle est humaine, faite par des ' +
                    'êtres humains qui ont leurs failles, leurs fatigues, en dépit de leur ' +
                    'responsabilité immense. Elle répond pourtant à une des vocations les ' +
                    'plus hautes de notre humanité : briser la loi du plus fort. ' +
                    'Pour cela, elle doit savoir écouter — il faut lui en donner le temps.'
            },
            {
                p: [9, 5, 6, 7], c: ['', '', '', ''],
                aside: ['« Peine perdue, alors ? »',
                    '« Non, au contraire : on travaille, on continue. »']
            },
            { p: [25, 26], c: ['', ''] }
        ]
    },

    'Fulguré.e.s': {
        slug: 'fulgurees',
        // La nuit et la foudre : bleus profonds, éclats blancs.
        palette: {
            bg: '#04050d', surface: '#0c1226', text: '#eef1ff', muted: '#8f9ac2',
            accent: '#8fa8ff', accentInk: '#a7bbff', onAccent: '#04050d',
            line: 'rgba(143,168,255,0.20)', glow: 'rgba(255,255,255,0.45)'
        },
        // L'accent est clair parce qu'il doit se détacher de la nuit de
        // l'univers. Sur le CV il n'a plus rien à éclairer : le filet prend
        // un bleu de nuit franc, plus sombre que la craie d'Audiences.
        cvAccent: '#4d5fc4',
        cast: ['Lia Alamichel', 'Amélie Chalmey', 'Adrien Vada'],
        credit: 'Thypa Photographie',
        synopsis: ['Une fratrie. Un village. Perdu.',
            'La foudre y a frappé il y a quelques années et y a laissé des survivant.e.s : les fulguré.e.s.',
            'À l’occasion d’un nouvel an, la fratrie s’y perd et rencontre ses habitants.',
            'Alors que « tout est chaos », la foudre frappe à nouveau.'],
        sequence: [
            {
                chapter: '1h15',
                chapterTitle: 'Spectacle tout public à partir de 14 ans.'
            },
            {
                p: [10],
                c: ['Cette pièce réjouira les amateurs de musique électro, de relations familiales compliquées, et de phénomènes naturels extrêmes.']
            },
            {
                q: ['« Il n’est pas mort.', 'Il s’est fait FULGURER. »'],
                by: ''
            },
            {
                p: [7], cadre: { 7: '15% 20%' },
                over: ['« La foudre frappe n’importe où,', 'n’importe qui, n’importe quand :', 'il n’y a aucun sens à ça. »'], overAt: 'droite'
            },
            {
                p: [8, 5, 19], c: ['', '', ''],
                aside: ['La cellule familiale, subterfuge',
                    'qui permet de passer l’humain au microscope.']
            },
            {
                p: [23], c: [''],
                over: ['« Quand la foudre frappe,', 'elle entre en toi en faisant un trou. »'], overAt: 'centre'
            },
            {
                text: 'Vivre comme une succession de coups de foudre dont on réchappe en ' +
                    'boitant, chargé·e·s à bloc, déformé·e·s, sublimé·e·s par la brûlure. ' +
                    'La capacité à se débattre et à trouver des réponses face à la peur, ' +
                    'à l’incompréhensible et à l’injustice.'
            },
            {
                p: [3, 1, 4], c: ['', '', ''], cadre: { 3: 'droite' },
                aside: ['« Si tu ne trouves pas de deuxième trou,',
                    'celui de la sortie, la charge est restée dans ton corps.',
                    'Tu n’es plus fulguré·e, tu es FOUDROYÉ·E. »']
            },
            {
                q: ['« Je cherche une âme qui pourra m’aider.',
                    'Je suis d’une génération désenchantée. »'],
                by: 'Mylène Farmer, en exergue de la pièce'
            },
            { p: [2], c: [''] },
            { p: [27, 26], c: ['', ''] }
        ]
    },

    // ── COURTS MÉTRAGES ──────────────────────────────────────────────
    //  `kind: 'film'` change le vocabulaire : un film n'est pas « à
    //  l'affiche », n'a pas de tournée, et son pied de page ne renvoie pas
    //  aux dates. Le montage viendra quand il y aura des images — ou un
    //  extrait, avec un bloc { video: … }.

    "La peau des anges n'est pas si douce": {
        slug: 'peaudesanges',
        kind: 'film',
        role: 'Court métrage · 12 minutes',
        // Vermeer, littéralement : le plâtre clair d'un mur éclairé par la
        // gauche, l'outremer du turban, et le jaune de plomb-étain en
        // guise de lueur. La palette du film est celle des tableaux dont
        // il raconte l'histoire.
        palette: {
            bg: '#efe9dd', surface: '#ffffff', text: '#1c1a17', muted: '#6b6357',
            accent: '#2c4a8f', accentInk: '#223d78', onAccent: '#ffffff',
            line: 'rgba(28,26,23,0.15)', glow: 'rgba(199,158,58,0.30)'
        },
        synopsis: ['L’histoire secrète des trente-deux tableaux',
            'de Johannes Vermeer.',
            'Elle est entièrement vraie,',
            'puisque la cinéaste l’a entièrement imaginée.'],
        prix: ['Prix du jury · Jeju International Film Festival, 2024',
            'Meilleur court métrage · Albany International Film Festival, 2023'],
        sequence: []
    },

    'Le rapt': {
        slug: 'lerapt',
        kind: 'film',
        role: 'Rôle · Steven',
        // Le nord : une mer grise, un ciel bas, une usine. Et l'ocre chaud
        // de la comédie, qui refuse de se laisser éteindre par le temps
        // qu'il fait.
        palette: {
            bg: '#1a1e1f', surface: '#262c2d', text: '#eceeed', muted: '#98a1a0',
            accent: '#d08a3c', accentInk: '#e0a058', onAccent: '#1a1e1f',
            line: 'rgba(236,238,237,0.14)', glow: 'rgba(208,138,60,0.26)'
        },
        synopsis: ['Deux ouvrières enlèvent le fils de leur patron',
            'pour en tirer une rançon.',
            'Elles se trompent d’homme : c’est un vendeur de ventilation',
            'qu’elles ramènent — ravi d’échapper à son quotidien.'],
        cast: ['Cécile Dessillons', 'Ladane Dehdar', 'Adrien Vada'],
        sequence: []
    },
};

/* ══════════════════════════════════════════════════════════════
   MOTEUR — ouverture, palette, parallaxe, fermeture
   ══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let overlay, scroller, lastFocus = null, isOpen = false, rafId = 0;

    // esc() vit dans le script en ligne d'index.html ; repli au cas où
    // l'ordre de chargement changerait.
    const escape = (v) => (typeof esc === 'function'
        ? esc(v)
        : String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

    function universeFor(li) {
        return SHOW_UNIVERSES[li?.dataset?.cvShow || ''] || null;
    }

    // ── Dates : relues dans dates.js, jamais dupliquées ici ──────────
    function datesBlock(key) {
        if (typeof upcomingPerformances !== 'function') return '';
        const dates = upcomingPerformances().filter(p => p.title === key);
        if (!dates.length) return '';
        const rows = dates.map(p => {
            const t = (typeof performanceTimeStr === 'function' ? performanceTimeStr(p) : (p.time || ''));
            const school = p.isSchool ? ' <span class="u-warn">· séance scolaire</span>' : '';
            return `<li class="u-date">
                <span class="u-date-when">${escape(p.dateLabel)}</span>
                <span class="u-date-where">${escape(p.location)}</span>
                <span class="u-date-time">${t ? escape(t) : 'horaire à confirmer'}${school}</span>
            </li>`;
        }).join('');
        return `<ul class="u-dates">${rows}</ul>`;
    }

    // Les titres du CV portent souvent une incise en <span> — l'auteur,
    // « (Racine) ». En plein écran elle ne peut pas rester dans le titre
    // en Cinzel 5rem : on la sépare pour la poser sous le titre.
    function titleParts(li) {
        const el = li.querySelector('.cv-title');
        if (!el) return { main: '', author: '' };
        const main = [...el.childNodes]
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
        const author = el.querySelector('span')?.textContent.trim().replace(/^\(|\)$/g, '') || '';
        return { main: main || el.textContent.trim(), author };
    }

    function rowInfo(li, uni) {
        const txt = (sel) => li.querySelector(sel)?.textContent
            .replace(/\s+/g, ' ').trim() || '';
        const t = titleParts(li);
        return {
            year: txt('.cv-year'),
            // Le CV écrit le titre en entier — « Cléophène, d'après
            // Rodogune ». En Cinzel 5rem c'est trop long : les univers
            // peuvent donner un titre court et renvoyer le reste en
            // sous-titre (champs `title` et `subtitle`).
            title: uni?.title || t.main,
            author: uni?.subtitle ?? t.author,
            // Les lignes de courts métrages du CV ne portent pas de rôle —
            // il n'y aurait pas la place. L'univers peut le donner lui-même.
            role: uni?.role ?? txt('.cv-role'),
            company: txt('.cv-subtitle'),
            badge: txt('.cv-badge'),
            url: li.dataset.cvUrl || '',
            key: li.dataset.cvShow || ''
        };
    }

    // ── Le récit s'écrit ─────────────────────────────────────────────
    //  Le titre se pose lettre à lettre, vite ; le synopsis s'inscrit
    //  mot à mot, lentement, en sortant d'un flou. Deux tempos, deux
    //  natures : une frappe, puis une voix.
    //
    //  Tout est piloté par un compteur en millisecondes que l'on fait
    //  avancer plus ou moins vite — et NON par des animation-delay CSS,
    //  qu'on ne pourrait pas accélérer en cours de route. Défiler pousse
    //  ce compteur : le texte s'écrit plus vite sous le geste, puis
    //  retrouve son tempo. Le hero reste collé pendant ce temps (voir
    //  .u-hero-wrap), de sorte que le premier geste écrit la page avant
    //  de la quitter.
    const CH_STEP = 34;      // ms par lettre du titre — rapide
    const WORD_STEP = 108;   // ms par mot du synopsis — doux
    const BREATH = 320;      // respiration entre le titre et le synopsis
    const MAX_RATE = 9;

    // Chaque lettre est un bloc, pour tomber une à une. Mais des blocs
    // juxtaposés se coupent n'importe où : le navigateur les traite comme
    // autant d'éléments indépendants, et « d'après » se retrouvait scindé
    // en « d'apr / ès ». Les lettres sont donc regroupées par MOT, et c'est
    // le mot qui est insécable.
    function splitChars(str) {
        let i = 0;
        return String(str).split(/\s+/).filter(Boolean).map(word =>
            `<span class="u-word">` + word.split('').map(ch =>
                `<span class="u-ch" style="--i:${i++}">${escape(ch)}</span>`
            ).join('') + `</span>`
        ).join(' ');
    }

    // Les deux mesures qui dimensionnent le titre (voir .u-title). On COMPTE
    // plutôt qu'on ne MESURE, pour la même raison qu'en .u-fit : mesurer
    // suppose une mise en page déjà calculée — ce qui n'est pas le cas au
    // moment où le panneau se fabrique — et rend zéro sans le dire.
    //
    //   le mot le plus long  ce qui peut déborder en LARGEUR : un titre se
    //       replie entre deux mots, jamais dans un mot (voir .u-word).
    //   la longueur totale   ce qui peut déborder en HAUTEUR : « La peau des
    //       anges n'est pas si douce » n'a que des mots courts, et passerait
    //       la première mesure à une taille qui lui vaudrait cinq lignes.
    function titleMetrics(str) {
        const words = String(str).split(/\s+/).filter(Boolean);
        return {
            chars: words.reduce((m, w) => Math.max(m, w.length), 0) || 1,
            len: String(str).trim().length || 1
        };
    }

    // Le synopsis accepte les mêmes coupes que le reste : un tableau de
    // lignes, ou des \n. Sans cela, `split(/\s+/)` avalait les retours à la
    // ligne comme de simples espaces — la coupe voulue disparaissait.
    // Ici les lignes se replient si l'écran est trop étroit : c'est de la
    // prose, pas des vers.
    function splitWords(value) {
        let i = 0;
        return toLines(value).map(line => {
            const words = line.split(/\s+/).filter(Boolean)
                .map(w => `<span class="u-wd" style="--i:${i++}">${escape(w)}</span>`)
                .join(' ');
            return `<span class="u-line">${words || '&nbsp;'}</span>`;
        }).join('');
    }

    let writeRaf = 0, writeRate = 1, writeGuard = 0;

    function stopWriting() {
        if (writeRaf) cancelAnimationFrame(writeRaf);
        if (writeGuard) clearTimeout(writeGuard);
        writeRaf = writeGuard = 0;
    }

    function playWriting() {
        stopWriting();
        const chars = [...overlay.querySelectorAll('.u-ch')];
        const words = [...overlay.querySelectorAll('.u-wd')];
        const hero = overlay.querySelector('.u-hero');
        if (!hero) return;

        const finish = () => {
            stopWriting();
            chars.forEach(el => el.classList.add('is-lit'));
            words.forEach(el => el.classList.add('is-lit'));
            hero.classList.add('is-titled', 'is-written');
        };
        if (REDUCED) { finish(); return; }

        // Garde-fou : requestAnimationFrame ne s'exécute pas dans un onglet
        // en arrière-plan, et certains navigateurs l'étranglent. Un titre
        // qui resterait invisible serait pire que pas d'animation du tout —
        // au-delà de ce délai, le texte s'affiche quoi qu'il arrive.
        const natural = chars.length * CH_STEP + BREATH + words.length * WORD_STEP;
        writeGuard = setTimeout(finish, natural + 6000);

        let clock = 0, last = performance.now();
        writeRate = 1;
        let litChars = 0, litWords = 0;

        const frame = (now) => {
            writeRaf = 0;
            clock += Math.min(now - last, 64) * writeRate;   // Math.min : un
            last = now;                                      // onglet revenu
            // au premier plan ne doit pas tout écrire d'un coup.

            const nCh = Math.min(chars.length, Math.floor(clock / CH_STEP));
            while (litChars < nCh) chars[litChars++].classList.add('is-lit');

            const after = clock - chars.length * CH_STEP - BREATH;
            const nWd = Math.min(words.length, Math.floor(after / WORD_STEP));
            while (litWords < nWd) words[litWords++].classList.add('is-lit');

            // Le raccourci vers les dates apparaît dès le titre posé :
            // c'est souvent la seule chose qu'on est venu chercher.
            if (litChars >= chars.length) hero.classList.add('is-titled');

            // Le tempo forcé par le défilement retombe tout seul.
            writeRate += (1 - writeRate) * 0.045;

            if (litWords >= words.length && litChars >= chars.length) {
                hero.classList.add('is-written');
                stopWriting();
                return;
            }
            if (isOpen) writeRaf = requestAnimationFrame(frame);
        };
        writeRaf = requestAnimationFrame(frame);
    }

    // Appelé par le défilement : pousse le tempo sans jamais le figer.
    function nudgeWriting(amount) {
        if (!writeRaf) return;
        writeRate = Math.min(MAX_RATE, writeRate + amount);
    }

    // ── Le montage ───────────────────────────────────────────────────
    //  La séquence est écrite à la main dans SHOW_UNIVERSES : c'est un
    //  montage, pas un diaporama, et le nombre de photos d'un temps
    //  suffit à décider de sa mise en page.
    //
    //  1 photo  → `plein`    plein cadre recadré, parallaxe : l'ambiance
    //  2 photos → `duo`      côte à côte, la seconde décalée
    //  3 photos → `trio`     une haute à gauche, deux empilées à droite
    //  4 photos → `quatuor`  cascade en quinconce
    //
    //  Duos, trios et quatuors passent dans des cadres de hauteur fixe :
    //  les photos du dossier mêlent portrait et paysage, et à proportions
    //  libres un portrait faisait déborder la composition sur deux écrans.
    //  Elles y sont donc recadrées, comme le plein cadre. D'où la règle :
    //  TOUTE photo s'agrandit au clic, et n'est montrée entière que là.
    const LAYOUT_BY_COUNT = { 1: 'plein', 2: 'duo', 3: 'trio', 4: 'quatuor' };

    function photoSrc(uni, n) {
        return `ressources/images/univers/${uni.slug}/${n}.jpg`;
    }

    // ── LE CADRAGE ───────────────────────────────────────────────────
    //  Les cadres du défilé recadrent en `object-fit: cover`. Sans autre
    //  indication, c'est le CENTRE GÉOMÉTRIQUE du fichier qui survit — pas
    //  le sujet. Un visage haut dans un portrait, deux comédiens serrés à
    //  gauche : la photo est bonne, et le cadre la coupe.
    //
    //  `cadre` corrige cela, photo par photo, DANS LE TEMPS CONCERNÉ :
    //
    //      { p: [9, 5, 6], cadre: { 9: 'haut', 5: '38% 22%' } }
    //
    //  On y lit un numéro de photo, jamais un rang dans un tableau : rien
    //  à compter, et le réglage appartient au temps du montage, pas à
    //  l'image — une photo qui revient plus loin peut demander un autre
    //  cadrage sans que le premier bouge.
    //
    //  Les mots sont ceux d'`overAt`, plus les quatre coins. Une valeur
    //  précise est acceptée quand il faut viser juste : deux pourcentages,
    //  horizontal puis vertical, comme `object-position`.
    //
    //  L'AGRANDISSEMENT N'EST PAS CONCERNÉ : il montre la photo entière,
    //  dans une autre image qui ne reçoit que la source et la légende.
    const FRAMES = {
        'centre': '50% 50%',
        'haut': '50% 0%',
        'bas': '50% 100%',
        'gauche': '0% 50%',
        'droite': '100% 50%',
        'haut gauche': '0% 0%',
        'haut droite': '100% 0%',
        'bas gauche': '0% 100%',
        'bas droite': '100% 100%'
    };

    // Deux pourcentages, et RIEN d'autre : cette valeur finit dans un
    // attribut `style`. On ne recopie d'ailleurs jamais la chaîne reçue —
    // on réécrit les deux nombres qu'on y a lus.
    const FRAME_PAIR = /^(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/;

    function framePos(uni, beat, n) {
        const raw = beat.cadre && beat.cadre[n];
        if (raw == null || raw === '') return '';
        const key = String(raw).trim().replace(/\s+/g, ' ').toLowerCase();
        if (FRAMES[key]) return FRAMES[key];

        const m = key.match(FRAME_PAIR);
        if (m) {
            const x = +m[1], y = +m[2];
            // Au-delà de 100 %, `cover` laisserait du vide : c'est une
            // faute de frappe, pas une intention.
            if (x <= 100 && y <= 100) return `${x}% ${y}%`;
        }

        // Une valeur non comprise doit s'entendre. Sans ce mot, la photo
        // resterait centrée et l'on chercherait longtemps pourquoi le
        // réglage « ne marche pas ».
        console.warn(`[univers] ${uni.slug} · photo ${n} : cadre « ${raw} » ` +
            `non reconnu — la photo reste centrée. Attendu : ` +
            `${Object.keys(FRAMES).join(', ')}, ou deux pourcentages de 0 à 100 ` +
            `(par exemple « 38% 22% »).`);
        return '';
    }

    // Aplatit la séquence en une liste de photos, dans l'ordre du défilé.
    // Ne sert qu'à connaître la PREMIÈRE photo, celle qu'on attend avant
    // d'afficher le montage. L'agrandissement, lui, relit le DOM (zoomList) :
    // une seconde liste tenue en parallèle finissait par se désaccorder de
    // ce qui était réellement affiché.
    function flatPhotos(uni) {
        const out = [];
        (uni.sequence || []).forEach(beat => {
            if (!beat.p) return;
            beat.p.forEach((n, i) => out.push({
                src: photoSrc(uni, n),
                caption: (beat.c && beat.c[i]) || ''
            }));
        });
        return out;
    }

    // Mot à mot, pour la révélation pilotée par le défilement.
    //
    //  DEUX ÉCRITURES POSSIBLES, au choix :
    //    'une seule ligne'                      → texte courant
    //    ['premier vers', 'deuxième vers']      → un vers par entrée
    //    'premier vers\ndeuxième vers'          → même chose, en plus court
    //
    //  Chaque ligne devient un bloc distinct. Dans les citations et les
    //  incrustations, elle NE SE COUPE PAS : un alexandrin se termine où
    //  l'auteur l'a voulu, pas où l'écran manque de place (voir fitLines,
    //  qui ajuste la taille du texte pour que le vers le plus long tienne).
    function toLines(value) {
        return Array.isArray(value) ? value.map(String) : String(value).split('\n');
    }

    // Longueur du vers le plus long, en caractères. C'est elle qui fixe la
    // taille du texte des blocs à ligne insécable — voir --chars dans le
    // CSS. On COMPTE plutôt que de MESURER : mesurer suppose une mise en
    // page déjà calculée, ce qui n'est pas garanti au moment où le panneau
    // s'ouvre, et une mesure qui échoue rend zéro sans le dire.
    function longestLine(value) {
        return toLines(value).reduce((m, l) => Math.max(m, l.length), 0) || 1;
    }

    function revealWords(value) {
        const lines = toLines(value);
        return lines.map(line => {
            const words = line.split(/\s+/).filter(Boolean)
                .map(w => `<span class="u-rw">${escape(w)}</span>`).join(' ');
            return `<span class="u-line">${words || '&nbsp;'}</span>`;
        }).join('');
    }

    function figureHtml(ph, layout, index, title, eager, over) {
        const cap = ph.caption || '';
        return `<figure class="u-fig u-fig--${layout}" style="--i:${index}">
            <button type="button" class="u-fig-media" data-u-zoom="${index}"
                    aria-label="Agrandir : ${escape(cap || title)}">
                <img src="${escape(ph.src)}" alt="${escape(cap || title)}"
                     ${ph.pos ? `style="object-position:${ph.pos}"` : ''}
                     loading="${eager ? 'eager' : 'lazy'}" decoding="async">
                <span class="u-fig-loupe" aria-hidden="true"><i class="fa-solid fa-expand"></i></span>
            </button>
            ${over || ''}
            ${cap ? `<figcaption class="u-cap"><span>${escape(cap)}</span></figcaption>` : ''}
        </figure>`;
    }

    // Incrustation : du texte POSÉ SUR la photo. Réservé au plein cadre —
    // sur une vignette de groupe il couvrirait l'image entière.
    function overHtml(beat) {
        if (!beat.over) return '';
        return `<div class="u-over u-reveal u-over--${escape(beat.overAt || 'centre')}">
            <p class="u-fit" style="--chars:${longestLine(beat.over)}">${revealWords(beat.over)}</p>
            ${beat.overBy ? `<cite>${escape(beat.overBy)}</cite>` : ''}
        </div>`;
    }

    // ── LA VIDÉO ─────────────────────────────────────────────────────
    //  Un temps du montage peut être un extrait filmé :
    //
    //      { video: 'dQw4w9WgXcQ', c: ['Teaser du spectacle'] }
    //
    //  On accepte l'identifiant seul ou l'adresse entière — youtu.be,
    //  watch?v=, /embed/, /shorts/ : c'est ce qu'on a sous la main quand
    //  on copie depuis YouTube, et rien ne sert de le faire retaper.
    //
    //  RIEN NE PART VERS YOUTUBE TANT QU'ON N'A PAS CLIQUÉ. Le bloc
    //  n'affiche d'abord que l'affiche du film et un bouton ; le lecteur
    //  n'est fabriqué qu'au clic. Une iframe YouTube pèse un mégaoctet de
    //  scripts et pose ses traceurs à l'affichage : en poser quatre dans
    //  un univers ruinerait le défilé qu'on vient tout juste d'alléger.
    const YT_ID = /^[A-Za-z0-9_-]{11}$/;

    function videoId(uni, raw) {
        const s = String(raw || '').trim();
        if (YT_ID.test(s)) return s;
        const m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
        if (m) return m[1];
        console.warn(`[univers] ${uni.slug} : vidéo « ${raw} » non reconnue — le bloc est ignoré. ` +
            `Attendu : un identifiant YouTube de 11 signes, ou l'adresse complète de la vidéo.`);
        return '';
    }

    function videoHtml(uni, beat, title) {
        const id = videoId(uni, beat.video);
        if (!id) return '';
        const cap = (beat.c && beat.c[0]) || '';
        return `<figure class="u-video u-reveal">
            <button type="button" class="u-video-play" data-u-video="${id}"
                    aria-label="Lire la vidéo : ${escape(cap || title)}">
                <img src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg"
                     data-u-poster="${id}" alt="" loading="lazy" decoding="async">
                <span class="u-video-icon" aria-hidden="true"><i class="fa-solid fa-play"></i></span>
            </button>
            ${cap ? `<figcaption class="u-cap"><span>${escape(cap)}</span></figcaption>` : ''}
        </figure>`;
    }

    // L'affiche est demandée en haute définition — le bloc fait toute la
    // largeur, et le format courant de YouTube (480 px) y serait mou.
    // `maxresdefault` n'existe pourtant pas pour toutes les vidéos.
    //
    // ET SON ABSENCE NE SE SIGNALE PAS : YouTube ne renvoie pas d'erreur,
    // il rend une vignette grise de 120 × 90 en statut 200. Un repli monté
    // sur `error` ne se déclencherait donc jamais, et l'on afficherait ce
    // timbre-poste étiré sur toute la largeur. On mesure ce qui est arrivé
    // plutôt que d'attendre une erreur qui ne viendra pas.
    //
    // Le repli est posé ici et non en attribut `onerror` : pas de script
    // dans le balisage, et l'attribut retiré interdit toute boucle.
    const YT_PLACEHOLDER = 120;

    function wireVideoPosters() {
        overlay.querySelectorAll('img[data-u-poster]').forEach(img => {
            const secours = () => {
                const id = img.dataset.uPoster;
                if (!id || !YT_ID.test(id)) return;
                img.removeAttribute('data-u-poster');
                img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
            };
            img.addEventListener('error', secours);
            img.addEventListener('load', () => {
                if (img.naturalWidth > YT_PLACEHOLDER) return;
                secours();
            });
        });
    }

    function beatsHtml(uni, title) {
        let index = 0;

        return (uni.sequence || []).map(beat => {

            if (beat.video) return videoHtml(uni, beat, title);

            // ── Cartons de texte, sans photo ──
            if (beat.chapter || beat.chapterTitle) {
                return `<div class="u-chapter u-reveal">
                    ${beat.chapter ? `<span class="u-chapter-num">${escape(beat.chapter)}</span>` : ''}
                    ${beat.chapterTitle ? `<h3>${revealWords(beat.chapterTitle)}</h3>` : ''}
                </div>`;
            }
            if (beat.q) {
                return `<blockquote class="u-quote u-reveal">
                    <p class="u-fit" style="--chars:${longestLine(beat.q)}">${revealWords(beat.q)}</p>
                    ${beat.by ? `<cite>${escape(beat.by)}</cite>` : ''}
                </blockquote>`;
            }
            if (beat.text) {
                return `<div class="u-text u-reveal">
                    <p>${revealWords(beat.text)}</p>
                </div>`;
            }

            if (!beat.p || !beat.p.length) return '';

            // ── Photos ──
            const layout = LAYOUT_BY_COUNT[beat.p.length] || 'plein';
            const inner = beat.p.map((n, i) => figureHtml(
                {
                    src: photoSrc(uni, n), caption: (beat.c && beat.c[i]) || '',
                    pos: framePos(uni, beat, n)
                },
                layout, index, title, index++ < 3,
                (layout === 'plein' && i === 0) ? overHtml(beat) : ''
            )).join('');

            if (layout === 'plein') return inner;

            // Note en marge : la place du texte à côté d'un groupe, là où
            // l'incrustation n'a pas de sens.
            const aside = beat.aside
                ? `<p class="u-aside u-reveal">${revealWords(beat.aside)}</p>` : '';
            return `<div class="u-group u-${layout}">${inner}${aside}</div>`;
        }).join('');
    }

    // ── Le palmarès ──────────────────────────────────────────────────
    //  Les distinctions vivent au générique, pas dans le défilé : ce n'est
    //  pas un temps du montage, c'est ce qui est arrivé au film après.
    //
    //      prix: ['Prix du jury · Jeju International Film Festival, 2024']
    //
    //  Le point médian sépare la distinction de l'endroit où elle a été
    //  remise — le même signe que le CV emploie pour « Rôle · Antiochus ».
    //  La distinction prend l'accent, le reste le gris. Sans point médian,
    //  toute la ligne prend l'accent : rien à découper, rien à casser.
    function prixBlock(uni) {
        if (!uni.prix || !uni.prix.length) return '';
        const lignes = uni.prix.map(p => {
            const i = String(p).indexOf('·');
            const quoi = i < 0 ? String(p) : String(p).slice(0, i).trim();
            const ou = i < 0 ? '' : String(p).slice(i + 1).trim();
            return `<li><span class="u-prix-quoi">${escape(quoi)}</span>${ou ? `<span class="u-prix-ou">${escape(ou)}</span>` : ''}</li>`;
        }).join('');
        return `<div class="u-prix">
            <h4>Palmarès</h4>
            <ul>${lignes}</ul>
        </div>`;
    }

    // ── Le générique ─────────────────────────────────────────────────
    //  La distribution ferme l'univers : après les dates, avant le crédit
    //  photo. Le nom d'Adrien est dans la liste comme les autres — c'est
    //  la vérité du plateau — mais l'accent le désigne : sur son propre
    //  site, on doit pouvoir le repérer sans qu'il passe devant la troupe.
    //  La couleur suffit ; ni le gras ni la taille ne s'en mêlent.
    const ME = 'Adrien Vada';

    function castBlock(uni) {
        if (!uni.cast || !uni.cast.length) return '';
        // Chaque nom est insécable : un patronyme coupé en fin de ligne,
        // dans un générique, ne se fait pas. La virgule reste collée au
        // nom qui précède, la seule coupe possible est l'espace d'après.
        const names = uni.cast.map(n =>
            `<span class="u-cast-name${n === ME ? ' u-cast-me' : ''}">${escape(n)}</span>`
        ).join(', ');
        return `<div class="u-cast">
            <h4>Distribution</h4>
            <p class="u-cast-names">${names}</p>
            ${uni.castNote ? `<p class="u-cast-note">${escape(uni.castNote)}</p>` : ''}
        </div>`;
    }

    function render(li, uni) {
        const info = rowInfo(li, uni);
        const figures = beatsHtml(uni, info.title);
        const dates = datesBlock(info.key);
        // Sans date à venir, un spectacle peut être arrêté OU pas encore
        // créé : le badge de la ligne du CV est ce qui les distingue.
        const enCreation = window.cvShowIsEnCreation?.(li) || false;
        // Un film n'est pas « à l'affiche » et n'a pas de tournée : le
        // vocabulaire du plateau ne lui va pas. `kind` le dit une fois, et
        // le hero comme le pied s'y accordent.
        const isFilm = uni.kind === 'film';
        const tm = titleMetrics(info.title);

        overlay.innerHTML = `
        <button type="button" class="u-close" aria-label="Fermer l’univers du spectacle">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
        <div class="u-progress" aria-hidden="true"><span></span></div>

        <div class="u-hero-wrap">
        <header class="u-hero">
            <p class="u-eyebrow">${escape(info.year)}${info.badge ? ' · ' + escape(info.badge) : ''}</p>
            <h2 class="u-title" style="--u-title-chars:${tm.chars};--u-title-len:${tm.len}">${splitChars(info.title)}</h2>
            ${info.author ? `<p class="u-author">${escape(info.author)}</p>` : ''}
            ${uni.synopsis ? `<p class="u-synopsis">${splitWords(uni.synopsis)}</p>` : ''}
            <p class="u-meta">${escape(info.role)}${info.company ? '<br>' + escape(info.company) : ''}</p>

            <!-- Raccourci vers les dates dès le titre : sans lui, il faut
                 traverser tout le défilé de photos pour savoir quand voir le
                 spectacle — or c'est souvent la seule raison de la visite.

                 SAUF POUR UN SPECTACLE ARRÊTÉ : il n'y a rien à quoi accéder,
                 et un bouton d'action promettant des représentations qui
                 n'existent plus ferait une promesse en l'air. La ligne le dit
                 simplement, et n'appelle pas le clic. Les représentations
                 passées restent au pied de l'univers. -->
            <div class="u-hero-actions">
                ${isFilm
                ? `<button type="button" class="u-btn" data-u-jump>
                        Le film
                        <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>
                    </button>`
                : dates || enCreation
                    ? `<button type="button" class="u-btn" data-u-jump>
                        ${dates ? 'Accéder aux dates' : 'Le spectacle'}
                        <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>
                    </button>`
                    : `<p class="u-hero-note">Ce spectacle n’est plus à l’affiche</p>`}
            </div>

            <span class="u-scroll" aria-hidden="true"><i class="fa-solid fa-arrow-down"></i></span>
            <!-- Le masque neutre : l'objet du plateau, pas le rouage du
                 navigateur. Un ovoïde lisse, deux yeux, l'arête du nez, pas
                 de bouche — rien qui exprime, tout qui attend. Tracé ici
                 plutôt qu'en CSS : une forme se dessine, elle ne se bricole
                 pas en bordures et rayons. -->
            <span class="u-loader" role="status" aria-label="Chargement des visuels">
                <svg viewBox="0 0 100 128" aria-hidden="true" focusable="false">
                    <path fill-rule="evenodd" d="M50 8C71 8 85 25 85 49c0 33-15 71-35 71S15 82 15 49C15 25 29 8 50 8z
                        M26 56q10-9 20 0-10 9-20 0z
                        M54 56q10-9 20 0-10 9-20 0z
                        M50 63q3 9 0 17-3-8 0-17z" />
                </svg>
            </span>
        </header>
        </div>

        <div class="u-figs">${figures}</div>

        <footer class="u-foot">
            <h3 class="u-foot-title">${isFilm ? 'Le film'
                : dates ? 'Prochaines représentations'
                    : enCreation ? 'Spectacle en création' : 'Ce spectacle n’est plus à l’affiche'}</h3>
            ${isFilm ? '' : dates || (enCreation
                ? `<p class="u-empty">Les dates de tournée seront annoncées ici.</p>`
                : `<p class="u-empty">Les représentations passées sont dans l’onglet Dates.</p>`)}
            <div class="u-actions">
                ${info.url ? `<a class="u-btn" href="${escape(info.url)}" target="_blank" rel="noopener">${isFilm ? 'Fiche du film' : 'Page du spectacle'} <i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i></a>` : ''}
                ${isFilm || (enCreation && !dates) ? ''
                : `<button type="button" class="u-btn u-btn-ghost" data-u-dates="${escape(info.key)}">Voir toutes les dates</button>`}
            </div>
            ${prixBlock(uni)}
            ${castBlock(uni)}
            ${uni.credit ? `<p class="u-credit">Photographies : ${escape(uni.credit)}</p>` : ''}
        </footer>

        <!-- Agrandissement : la photo entière, jamais recadrée. C'est le
             recours quand le plein cadre ne dit pas ce qu'on regarde. -->
        <div class="u-zoom" hidden role="dialog" aria-modal="true" aria-label="Photo agrandie">
            <button type="button" class="u-close u-zoom-close" aria-label="Fermer la photo">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
            <button type="button" class="u-zoom-nav u-zoom-prev" aria-label="Photo précédente">
                <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            </button>
            <button type="button" class="u-zoom-nav u-zoom-next" aria-label="Photo suivante">
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
            <figure>
                <img alt="" decoding="async">
                <figcaption></figcaption>
            </figure>
        </div>`;
    }

    function applyPalette(p) {
        const s = overlay.style;
        s.setProperty('--u-bg', p.bg);
        s.setProperty('--u-surface', p.surface);
        s.setProperty('--u-text', p.text);
        s.setProperty('--u-muted', p.muted);
        s.setProperty('--u-accent', p.accent);
        s.setProperty('--u-accent-ink', p.accentInk);
        s.setProperty('--u-on-accent', p.onAccent);
        s.setProperty('--u-line', p.line);
        s.setProperty('--u-glow', p.glow);
        // La barre du navigateur sur mobile suit aussi la palette : c'est
        // là que se joue vraiment le « le site change de peau ».
        document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
            if (!m.dataset.uPrev) m.dataset.uPrev = m.content;
            m.content = p.bg;
        });
    }

    function restoreThemeColor() {
        document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
            if (m.dataset.uPrev) m.content = m.dataset.uPrev;
        });
    }

    // ── Parallaxe + révélation ───────────────────────────────────────
    let lastScrollTop = 0;
    const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;

    // Le titre et le synopsis accompagnent le début du défilement, puis
    // cèdent la place : ils s'effacent et s'éloignent sur le dernier tiers
    // du hero, de sorte qu'à l'arrivée de la première photo il ne reste
    // plus rien d'eux. Un texte encore lisible par-dessus la photo
    // brouillerait l'entrée dans l'univers.
    // Portion parcourue d'un segment [a, b] de la course du hero.
    const stage = (p, a, b) => clamp01((p - a) / (b - a));

    // Le hero se DÉFAIT PAR COUCHES au lieu d'être retenu en bloc.
    //
    //   Retenir tout le hero puis l'effacer d'un coup à la fin donnait
    //   l'impression de défiler pour rien : l'écran ne changeait pas, le
    //   geste semblait buter contre une résistance. Ici chaque élément part
    //   à son tour, du moins essentiel au plus essentiel — la date, puis le
    //   rôle, puis le synopsis, puis le bouton, puis le titre. Il se passe
    //   donc quelque chose dès le premier pixel, et l'on comprend qu'on
    //   avance avant même de voir la première photo.
    const HERO_EXITS = [
        ['.u-eyebrow', 0.00, 0.20, 3],
        ['.u-scroll', 0.00, 0.14, 0],
        ['.u-meta', 0.06, 0.28, 3],
        ['.u-synopsis', 0.18, 0.54, 5],
        ['.u-hero-actions', 0.34, 0.60, 4],   // le bouton part tard : il sert
        ['.u-author', 0.52, 0.86, 6],
        ['.u-title', 0.58, 1.00, 8]
    ];

    function fadeHero(h) {
        const wrap = overlay.querySelector('.u-hero-wrap');
        const hero = overlay.querySelector('.u-hero');
        if (!wrap || !hero) return;
        // Avancement de la SORTIE du hero, mesuré sur sa position à l'écran :
        // 0 quand il l'occupe entièrement, 1 quand il vient d'en sortir.
        // On ne se fonde plus sur une course de collage — il n'y en a plus,
        // le hero fait exactement un écran et la première image suit.
        const p = clamp01(-wrap.getBoundingClientRect().top / h);
        if (p <= 0) {
            // Remonté tout en haut : on rend la main au CSS d'un seul coup,
            // sinon les éléments resteraient figés sur leur dernier état.
            for (const [sel] of HERO_EXITS) {
                const el = hero.querySelector(sel);
                if (!el) continue;
                el.style.opacity = el.style.transform = el.style.filter = el.style.animation = '';
            }
            hero.style.removeProperty('--u-hero-glow');
            hero.style.pointerEvents = '';
            return;
        }

        for (const [sel, a, b, drift] of HERO_EXITS) {
            const el = hero.querySelector(sel);
            if (!el) continue;
            const out = stage(p, a, b);
            if (!out) {
                // Tant que rien ne sort, on laisse la main au CSS : c'est lui
                // qui gère l'ARRIVÉE de ces éléments pendant que le titre
                // s'écrit. Deux règles sur la même propriété, et l'inline
                // gagnerait toujours.
                el.style.opacity = '';
                el.style.transform = '';
                el.style.filter = '';
                el.style.animation = '';
                continue;
            }
            // La flèche se balance en boucle, et une animation l'emporte sur
            // une opacité en ligne : il faut l'arrêter pour pouvoir l'effacer.
            el.style.animation = 'none';
            el.style.opacity = String(1 - out);
            el.style.transform = `translate3d(0, ${(-out * drift).toFixed(2)}svh, 0)`;
            el.style.filter = out > 0.05 ? `blur(${(out * 5).toFixed(2)}px)` : '';
        }

        // Le halo de couleur s'éteint avec le titre, pas avant : c'est lui
        // qui tient l'écran pendant que le texte se retire.
        const glow = stage(p, 0.55, 1);
        hero.style.setProperty('--u-hero-glow', String(1 - glow));
        // Une fois vidé, le hero ne doit plus intercepter le moindre clic.
        hero.style.pointerEvents = p > 0.9 ? 'none' : '';
    }

    // ── Les vers tiennent sur une ligne ──────────────────────────────
    //  Dans une citation ou une incrustation, la coupe est une décision
    //  d'écriture : un alexandrin ne se termine pas là où l'écran manque de
    //  place. Ces blocs sont donc en `nowrap`, et leur taille de texte est
    //  calculée EN CSS à partir de --chars, la longueur du vers le plus
    //  long (voir .u-fit). Aucune mesure de mise en page n'est faite : une
    //  mesure suppose un rendu déjà calculé, ce qui n'est pas garanti au
    //  moment où le panneau s'ouvre, et elle rend zéro sans le dire quand
    //  elle échoue.

    // Révélation mot à mot PILOTÉE PAR LE DÉFILEMENT — et non déclenchée
    // une fois pour toutes à l'entrée dans l'écran. La phrase s'écrit à la
    // vitesse de la main : c'est ce lien direct entre le geste et le texte
    // qui fait l'effet, et il se perd dès qu'on se contente d'un
    // IntersectionObserver.
    function updateReveals(h) {
        const start = h * 0.94, end = h * 0.36;
        overlay.querySelectorAll('.u-reveal').forEach(block => {
            const r = block.getBoundingClientRect();
            if (r.bottom < -100 || r.top > h + 100) return;
            const p = clamp01((start - r.top) / (start - end));
            const words = block._uWords || (block._uWords = [...block.querySelectorAll('.u-rw')]);
            if (!words.length) return;
            // Le dernier mot doit s'allumer un peu avant la fin de la
            // course, sinon la phrase n'est jamais complète à l'écran.
            const n = Math.round(clamp01(p * 1.12) * words.length);
            if (block._uLit === n) return;
            if (n > (block._uLit || 0)) {
                for (let i = block._uLit || 0; i < n; i++) words[i].classList.add('is-lit');
            } else {
                for (let i = n; i < (block._uLit || 0); i++) words[i].classList.remove('is-lit');
            }
            block._uLit = n;
            block.classList.toggle('is-lit', n >= words.length);
        });
    }

    function onScroll() {
        // Le geste pousse l'écriture avant même d'avoir bougé la page :
        // c'est ce qui donne l'impression que le récit répond à la main.
        const moved = Math.abs(overlay.scrollTop - lastScrollTop);
        lastScrollTop = overlay.scrollTop;
        if (moved) nudgeWriting(moved / 90);

        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            const h = overlay.clientHeight;
            const total = scroller.scrollHeight - h;
            const bar = overlay.querySelector('.u-progress span');
            if (bar) bar.style.transform = `scaleX(${total > 0 ? scroller.scrollTop / total : 0})`;
            if (REDUCED) return;

            fadeHero(h);
            updateReveals(h);

            // Plein cadre : l'image glisse dans son cadre.
            overlay.querySelectorAll('.u-fig--plein').forEach(fig => {
                const r = fig.getBoundingClientRect();
                if (r.bottom < -200 || r.top > h + 200) return;
                // -1 (figure sous l'écran) → +1 (figure au-dessus)
                const t = (h / 2 - (r.top + r.height / 2)) / (h / 2 + r.height / 2);
                const img = fig.querySelector('img');
                if (img) img.style.transform = `translate3d(0, ${(t * 9).toFixed(2)}%, 0) scale(1.22)`;
            });

            // Trios et quatuors : chaque vignette avance à sa propre
            // vitesse. C'est ce décalage — quelques pour cent — qui donne
            // de la profondeur à une composition plate, plutôt qu'un bloc
            // d'images qui monte d'un seul tenant.
            overlay.querySelectorAll('.u-group').forEach(group => {
                const gr = group.getBoundingClientRect();
                if (gr.bottom < -200 || gr.top > h + 200) return;
                const t = (h / 2 - (gr.top + gr.height / 2)) / (h / 2 + gr.height / 2);
                group.querySelectorAll('.u-fig').forEach((fig, i) => {
                    const depth = 1 + (i % 3) * 0.9;   // 1, 1.9, 2.8
                    const img = fig.querySelector('img');
                    if (img) img.style.transform =
                        `translate3d(0, ${(t * depth * 2.4).toFixed(2)}%, 0) scale(1.10)`;
                });
            });
        });
    }

    const REVEALED = '.u-fig, .u-group, .u-quote, .u-chapter, .u-text, .u-foot';

    function observeCaptions() {
        if (!('IntersectionObserver' in window)) {
            overlay.querySelectorAll(REVEALED).forEach(el => el.classList.add('is-in'));
            return;
        }
        if (REDUCED) {
            overlay.querySelectorAll('.u-rw').forEach(w => w.classList.add('is-lit'));
            overlay.querySelectorAll('.u-reveal').forEach(b => b.classList.add('is-lit'));
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
        }, { threshold: 0.25, root: overlay });
        overlay.querySelectorAll(REVEALED).forEach(el => io.observe(el));
    }

    // ── Agrandissement d'une photo ───────────────────────────────────
    //  Le défilé recadre : plein cadre en 16:10, en duo, en médaillon.
    //  L'agrandissement est le seul endroit où la photo est montrée
    //  ENTIÈRE (object-fit: contain), avec sa légende.
    let zoomIndex = 0, zoomToken = 0;

    function zoomEl() { return overlay.querySelector('.u-zoom'); }

    // La liste des photos est relue DANS LE DÉFILÉ, à chaque ouverture.
    // Elle était auparavant reconstruite en parallèle depuis les données,
    // et les deux pouvaient se désaccorder : on cliquait sur une photo,
    // c'en était une autre qui s'agrandissait. Le DOM affiché est la seule
    // source qui ne puisse pas mentir sur ce qu'on vient de cliquer.
    function zoomList() {
        return [...overlay.querySelectorAll('.u-figs [data-u-zoom]')].map(btn => ({
            src: btn.querySelector('img')?.getAttribute('src') || '',
            caption: btn.closest('.u-fig')?.querySelector('.u-cap span')?.textContent.trim() || ''
        }));
    }

    function showZoom(i) {
        const box = zoomEl();
        const list = zoomList();
        if (!box || !list.length) return;
        zoomIndex = (i + list.length) % list.length;
        const ph = list[zoomIndex];
        const img = box.querySelector('img');
        const cap = box.querySelector('figcaption');
        img.src = ph.src;
        img.alt = ph.caption || '';
        cap.textContent = ph.caption || '';
        box.querySelectorAll('.u-zoom-nav').forEach(b => b.hidden = list.length < 2);
    }

    // On passe le BOUTON cliqué, pas un numéro : sa position dans le défilé
    // fait foi.
    function openZoom(btn) {
        const box = zoomEl();
        if (!box) return;
        const all = [...overlay.querySelectorAll('.u-figs [data-u-zoom]')];
        zoomToken++;
        showZoom(Math.max(0, all.indexOf(btn)));
        box.hidden = false;
        void box.offsetHeight;
        box.classList.add('is-open');
        window.pushOverlayState?.('u-zoom');
        box.querySelector('.u-zoom-close')?.focus({ preventScroll: true });
    }

    function closeZoom() {
        const box = zoomEl();
        if (!box || box.hidden) return;
        box.classList.remove('is-open');
        window.dropOverlayState?.('u-zoom');
        // Le vidage est différé le temps du fondu. S'il a été rouvert
        // entre-temps sur une autre photo, ce vidage-là n'a plus lieu d'être :
        // il effacerait l'image qu'on vient d'ouvrir.
        const token = ++zoomToken;
        const done = () => {
            if (token !== zoomToken || !box.isConnected) return;
            box.hidden = true;
            box.querySelector('img').src = '';
        };
        if (REDUCED) done(); else setTimeout(done, 300);
    }

    function zoomIsOpen() {
        const box = zoomEl();
        return !!box && !box.hidden;
    }

    // Le titre s'affiche tout de suite ; les photos n'apparaissent qu'une
    // fois la première DÉCODÉE. Sans cette attente, l'image se peint au
    // milieu de l'animation d'ouverture et la fait tomber à ~20 i/s : c'est
    // le décodage, pas le téléchargement, qui saccadait.
    // La croix et le bouton « Accéder aux dates » restent actifs pendant ce
    // temps : on doit toujours pouvoir renoncer.
    const MAX_WAIT_MS = 2500;

    function awaitFirstPhoto(uni) {
        const first = flatPhotos(uni)[0]?.src;
        if (!first) return Promise.resolve();
        return Promise.race([
            new Promise(resolve => {
                const im = new Image();
                im.src = first;
                (im.decode ? im.decode() : Promise.resolve()).then(resolve, resolve);
                im.onload = im.onerror = resolve;
            }),
            // Filet : une image manquante ou un réseau qui traîne ne doit
            // jamais laisser le panneau bloqué sur son voile de chargement.
            new Promise(resolve => setTimeout(resolve, MAX_WAIT_MS))
        ]);
    }

    // ── Ouverture : le panneau se déplie depuis la ligne cliquée ─────
    let openToken = 0;

    function open(li) {
        const uni = universeFor(li);
        if (!uni) return false;

        const token = ++openToken;
        lastFocus = document.activeElement;
        render(li, uni);
        wireVideoPosters();
        applyPalette(uni.palette);
        overlay.dataset.slug = uni.slug;
        scroller = overlay;

        const r = li.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        overlay.hidden = false;
        // APRÈS avoir rendu le panneau visible : tant qu'il est `hidden`, il
        // n'a pas de boîte de défilement et l'affectation est ignorée. Sans
        // cela, ouvrir un second spectacle après avoir lu le premier jusqu'aux
        // dates faisait arriver directement en bas de page.
        overlay.scrollTop = 0;
        overlay.classList.add('is-loading');
        if (!REDUCED) {
            overlay.style.willChange = 'clip-path';
            overlay.style.clipPath = `inset(${r.top}px ${vw - r.right}px ${vh - r.bottom}px ${r.left}px round 10px)`;
            // Reflow imposé : sans lui, le navigateur fusionne l'état de
            // départ et l'état d'arrivée et rien ne s'anime.
            void overlay.offsetHeight;
        }
        overlay.classList.add('is-open');
        overlay.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';

        awaitFirstPhoto(uni).then(() => {
            // Panneau refermé, ou déjà rouvert sur un autre spectacle,
            // pendant le chargement : ce résultat ne vaut plus rien.
            if (token !== openToken || !isOpen) return;
            overlay.classList.remove('is-loading');
            overlay.style.willChange = '';
            onScroll();
        });

        document.documentElement.classList.add('u-locked');
        // Une entrée d'historique de plus : « précédent » referme l'univers
        // et rend le CV, au lieu de quitter le site (voir index.html).
        window.pushOverlayState?.('univers');
        isOpen = true;
        overlay.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        observeCaptions();
        lastScrollTop = 0;
        playWriting();
        overlay.querySelector('.u-close')?.focus({ preventScroll: true });
        return true;
    }

    function close() {
        if (!isOpen) return;
        // L'agrandissement est empilé PAR-DESSUS l'univers : le dépiler
        // d'abord, sinon l'historique garderait une entrée orpheline.
        closeZoom();
        stopWriting();
        isOpen = false;
        openToken++;
        overlay.classList.remove('is-open', 'is-loading');
        overlay.style.willChange = '';
        overlay.removeEventListener('scroll', onScroll);
        document.documentElement.classList.remove('u-locked');
        restoreThemeColor();
        window.dropOverlayState?.('univers');
        const done = () => { overlay.hidden = true; overlay.innerHTML = ''; };
        if (REDUCED) done(); else setTimeout(done, 420);
        lastFocus?.focus?.({ preventScroll: true });
    }

    function init() {
        overlay = document.getElementById('show-universe');
        if (!overlay) return;

        overlay.addEventListener('click', (e) => {
            // L'agrandissement d'abord : sa croix porte aussi la classe
            // .u-close, elle ne doit pas refermer tout l'univers.
            if (e.target.closest('.u-zoom-close')) { closeZoom(); return; }
            if (e.target.closest('.u-zoom-prev')) { showZoom(zoomIndex - 1); return; }
            if (e.target.closest('.u-zoom-next')) { showZoom(zoomIndex + 1); return; }
            // Clic sur le fond noir de l'agrandissement (pas sur l'image)
            if (zoomIsOpen() && e.target.closest('.u-zoom') && !e.target.closest('figure')) {
                closeZoom(); return;
            }

            const zoomBtn = e.target.closest('[data-u-zoom]');
            if (zoomBtn) { openZoom(zoomBtn); return; }

            // La vidéo n'existe qu'à partir d'ici : le lecteur remplace
            // l'affiche, et démarre — on vient de cliquer sur « lire ».
            const play = e.target.closest('[data-u-video]');
            if (play) {
                const id = play.dataset.uVideo;
                if (!YT_ID.test(id)) return;
                const frame = document.createElement('iframe');
                frame.src = `https://www.youtube-nocookie.com/embed/${id}` +
                    '?autoplay=1&rel=0&modestbranding=1';
                frame.title = play.getAttribute('aria-label') || 'Vidéo';
                frame.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen';
                frame.allowFullscreen = true;
                frame.loading = 'lazy';
                play.replaceWith(frame);
                return;
            }

            if (e.target.closest('.u-close')) { close(); return; }

            // « Accéder aux dates » : on saute au pied du panneau. Les
            // photos restent au-dessus, on ne les a pas perdues.
            if (e.target.closest('[data-u-jump]')) {
                const foot = overlay.querySelector('.u-foot');
                if (!foot) return;
                foot.classList.add('is-in');
                overlay.querySelectorAll(REVEALED).forEach(f => f.classList.add('is-in'));
                overlay.querySelectorAll('.u-rw').forEach(w => w.classList.add('is-lit'));
                foot.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
                return;
            }

            const toDates = e.target.closest('[data-u-dates]');
            if (toDates) {
                const key = toDates.dataset.uDates;
                close();
                if (typeof goToDatesForShow === 'function') setTimeout(() => goToDatesForShow(key), 60);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!isOpen) return;
            if (zoomIsOpen()) {
                if (e.key === 'Escape') { e.stopPropagation(); closeZoom(); }
                else if (e.key === 'ArrowLeft') showZoom(zoomIndex - 1);
                else if (e.key === 'ArrowRight') showZoom(zoomIndex + 1);
                return;
            }
            if (e.key === 'Escape') { e.stopPropagation(); close(); }
        }, true);

        // Le CV appelle openShowUniverse() avant de replier son tiroir.
        window.openShowUniverse = open;
        window.closeShowUniverse = close;
        window.closeUniverseZoom = closeZoom;
        window.hasShowUniverse = (li) => !!universeFor(li);

        markCvRows();
        bindLongPress();
    }

    // ── Ce que le CV promet ──────────────────────────────────────────
    //  Deux signaux, posés ici plutôt que dans le balisage : c'est ce
    //  fichier qui sait quelles lignes ont un univers, et la marque suit
    //  donc automatiquement les univers qu'on ajoute ou qu'on retire.
    //
    //  1. L'ICÔNE. Le chevron annonçait « ceci se déplie » — un tiroir.
    //     Or la ligne ouvre une page plein écran. Les lignes dotées d'un
    //     univers portent donc une flèche oblique : on va quelque part.
    //     Les autres gardent leur chevron, qui redevient exact.
    //
    //  2. LA COULEUR. Un filet à gauche, dans la couleur du spectacle.
    //     Presque muet au repos, franc au survol. Le CV devient un
    //     sommaire : huit lignes, et derrière chacune un monde qui a
    //     déjà sa couleur avant qu'on y entre.
    function markCvRows() {
        let rang = 0;
        document.querySelectorAll('.cv-item').forEach(li => {
            const uni = universeFor(li);
            if (!uni) return;
            li.classList.add('cv-has-universe');
            // `cvAccent` prime sur l'accent de l'univers quand les deux ne
            // peuvent pas être la même couleur — voir Audiences et
            // Fulguré.e.s. Sinon l'accent suffit.
            li.style.setProperty('--cv-accent', uni.cvAccent || uni.palette.accent);
            // Le rang dans la guirlande (voir .cv-has-universe::after sur
            // petit écran) : c'est lui qui retarde l'allumage, de sorte que
            // la couleur descende le CV ligne après ligne. On compte les
            // lignes À UNIVERS, pas toutes les lignes du CV — ce sont les
            // seules qui s'allument, et un trou dans la numérotation ferait
            // sauter la vague. querySelectorAll rend l'ordre du document,
            // qui est ici l'ordre de lecture : théâtre, puis courts métrages.
            li.style.setProperty('--cv-rang', rang++);

            const icon = li.querySelector('.cv-chevron');
            if (icon) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-arrow-right');
            }

            addWhisper(li, uni);
        });
    }

    //  3. LE MURMURE. Au survol, la ligne laisse entrevoir de quoi parle
    //     le spectacle. Le texte est le synopsis de l'univers — relu ici,
    //     jamais recopié : il n'y a qu'un endroit où le corriger.
    //
    //     L'élément se glisse entre la colonne de texte et le badge. Sur
    //     grand écran il occupe le vide de la ligne ; sur petit il passe
    //     à la ligne suivante. Une seule place dans le balisage, deux
    //     mises en page (voir .cv-whisper dans index.html).
    function addWhisper(li, uni) {
        if (!uni.synopsis || li.querySelector('.cv-whisper')) return;
        const lines = toLines(uni.synopsis).map(l => l.trim()).filter(Boolean);
        if (!lines.length) return;

        const row = li.querySelector('.cv-row-toggle > div');
        const badges = row && row.lastElementChild;
        if (!badges) return;

        const el = document.createElement('div');
        el.className = 'cv-whisper';
        // Caché aux lecteurs d'écran : l'élément vit DANS le bouton, et son
        // texte s'ajouterait au nom de la ligne — « Cassandres, Rôle…,
        // Théâtre des Crescite, Rome an 79, huit jours après la mort… ».
        // Le synopsis leur est donné en entier dans l'univers, à un clic.
        el.setAttribute('aria-hidden', 'true');
        // Mot à mot, comme le synopsis s'inscrit dans l'univers : `--i` est
        // le rang du mot, et le CSS en fait un retard. Le compteur court
        // d'une ligne à l'autre, sinon chaque ligne repartirait de zéro et
        // les trois s'écriraient en même temps.
        let i = 0;
        const html = lines.map(line =>
            `<span class="cv-whisper-line">` + line.split(/\s+/).filter(Boolean)
                .map(w => `<span class="cv-wd" style="--i:${i++}">${escape(w)}</span>`)
                .join(' ') + `</span>`
        ).join('');
        el.innerHTML = `<div class="cv-whisper-clip"><p>${html}</p></div>`;
        // Chaque murmure s'écrit dans le même temps, quelle que soit sa
        // longueur : c'est une phrase, pas un métronome. Les cinquante et
        // un mots d'As You Like It couleraient sinon deux fois plus
        // longtemps que les dix-huit d'À la barre.
        el.style.setProperty('--wd-step',
            Math.min(240, Math.max(56, Math.round(3280 / i))) + 'ms');
        row.insertBefore(el, badges);
    }

    // ── L'appui maintenu ─────────────────────────────────────────────
    //  Le survol n'existe pas au doigt. On lui substitue l'appui tenu :
    //  au bout de 400 ms sans que le doigt ait bougé, la ligne murmure ;
    //  elle se tait dès qu'il se lève.
    //
    //  Trois précautions. Un doigt qui glisse fait défiler la page : au
    //  delà de 10 px on abandonne — et les écouteurs sont passifs, le
    //  défilement n'est jamais retenu. Le relâchement produit ensuite un
    //  clic, qui ouvrirait l'univers : on l'avale, puisque l'appui avait
    //  un autre but. Enfin Android propose son menu contextuel sur appui
    //  long : on le refuse, mais seulement pendant un appui en cours, de
    //  sorte que le clic droit reste normal partout ailleurs.
    const PRESS_DELAY = 400;
    const PRESS_SLOP = 10;

    function bindLongPress() {
        let timer = 0, row = null, x0 = 0, y0 = 0, shown = false;

        const disarm = () => { clearTimeout(timer); timer = 0; };
        const hush = () => {
            if (row) row.classList.remove('is-whispering');
            row = null;
        };

        document.addEventListener('touchstart', (e) => {
            disarm(); hush(); shown = false;
            const li = e.target.closest?.('.cv-item.cv-has-universe');
            if (!li || !li.querySelector('.cv-whisper')) return;
            const t = e.touches[0];
            row = li; x0 = t.clientX; y0 = t.clientY;
            timer = setTimeout(() => {
                timer = 0; shown = true;
                li.classList.add('is-whispering');
            }, PRESS_DELAY);
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!row) return;
            const t = e.touches[0];
            if (Math.abs(t.clientX - x0) > PRESS_SLOP ||
                Math.abs(t.clientY - y0) > PRESS_SLOP) {
                disarm(); hush(); shown = false;
            }
        }, { passive: true });

        document.addEventListener('touchend', () => { disarm(); hush(); }, { passive: true });
        document.addEventListener('touchcancel', () => {
            disarm(); hush(); shown = false;
        }, { passive: true });

        // Le clic qui suit un appui maintenu n'en est pas un.
        document.addEventListener('click', (e) => {
            if (!shown) return;
            shown = false;
            if (!e.target.closest?.('.cv-item.cv-has-universe')) return;
            e.preventDefault();
            e.stopPropagation();
        }, true);

        document.addEventListener('contextmenu', (e) => { if (row) e.preventDefault(); });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
