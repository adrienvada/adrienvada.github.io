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
 *  c'est le cas volontaire de « L'imaginaire forcé » et « Cassandres »,
 *  dont la direction visuelle n'est pas arrêtée.
 *
 *  CHAMPS
 *  ------
 *  palette   les couleurs du spectacle, injectées en variables --u-*
 *            sur le seul panneau (le reste du site n'est pas repeint).
 *  synopsis  s'inscrit mot à mot sous le titre. 2 à 4 phrases.
 *  genre     tragédie, comédie, fiction d'anticipation… Il rejoint
 *            l'année et le badge sur la ligne qui coiffe le titre :
 *            « 2027 · FICTION D'ANTICIPATION · EN CRÉATION ». Deux ou
 *            trois mots — c'est une ligne, pas une définition.
 *  cast      la distribution, en générique de fin. Le nom d'Adrien y figure
 *            comme les autres, en dernier, et rien ne l'en distingue :
 *            c'est un générique, pas une affiche.
 *  castNote  précision sous la distribution : « * en alternance »…
 *  prix      le palmarès, au générique juste avant la distribution. Une
 *            entrée par ligne ; le point médian sépare la distinction de
 *            l'endroit où elle a été remise :
 *              'Prix du jury · Jeju International Film Festival, 2024'
 *            La distinction prend l'accent, le reste le gris. Sans point
 *            médian, toute la ligne prend l'accent.
 *  credit    photographe, affiché au pied du panneau.
 *  kind      'film' pour un court métrage : un film n'est pas « à
 *            l'affiche », n'a pas de tournée, et son pied de page renvoie à
 *            sa fiche au lieu des dates. Absent = spectacle.
 *  affiche   true pour ouvrir la page sur l'affiche du film, entière et
 *            agrandissable, avant le montage. Le fichier est
 *            ressources/images/univers/<slug>/affiche.jpg — déposer
 *            l'original « affiche.jpg » dans le dossier source, le script
 *            des photos le prépare avec le reste.
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
 *    { video: 'https://vimeo.com/799006724', jaquette: 'teaser.jpg' }
 *        Un extrait YouTube OU Vimeo sur toute la largeur, en 16/9. On
 *        accepte l'identifiant seul ou l'adresse entière — ce qu'on a sous
 *        la main en copiant. `c` donne la légende, comme pour une photo.
 *        Une valeur non reconnue est signalée dans la console et le bloc
 *        est ignoré — jamais de lecteur monté sur une adresse douteuse.
 *        RIEN N'EST DEMANDÉ À L'HÉBERGEUR AVANT LE CLIC : on ne montre que
 *        la jaquette. YouTube en fournit une ; Vimeo non — une vidéo Vimeo
 *        demande donc `jaquette`, un fichier du dossier de l'univers
 *        (déposer « teaser.jpg » dans le dossier source, le script le
 *        prépare comme l'affiche). Le lecteur — un mégaoctet de scripts et
 *        ses traceurs — n'est fabriqué qu'au moment où l'on veut voir.
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
 *        (« haut gauche »…). Ou deux pourcentages, horizontal puis
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
 *  Les textes marqués « REMPLISSAGE » sont de la prose neutre écrite pour
 *  tenir la place — ce ne sont PAS des répliques des pièces. Les seules
 *  vraies citations sont celles du domaine public (Racine, Corneille,
 *  Shakespeare). Reproduire le texte d'une pièce contemporaine —
 *  Fulguré.e.s, Audiences, À la barre — demande l'accord de l'auteur.
 * ============================================================
 */

const SHOW_UNIVERSES = {

    // ── L'ORDRE ──────────────────────────────────────────────────────
    //  De la plus récente à la plus ancienne, comme le répertoire
    //  (/spectacles/) et comme se lit un CV. À année égale, l'ordre est
    //  celui qu'on a choisi — le tri ne le bouscule pas.
    //  Le générateur des pages spectacle trie de son côté : cet ordre-ci
    //  est un confort de lecture, rien ne s'appuie dessus.
    //
    //  DEUX CONVENTIONS, qui valent pour n'importe quelle entrée et qui
    //  avaient jusqu'ici leur propre section — l'ordre chronologique les
    //  a dispersées :
    //
    //   · `sequence: []` n'est pas un oubli. Un spectacle qui n'existe
    //     pas encore n'a pas d'images à montrer : un titre, ce qu'on en
    //     sait, et le pied de page. C'est l'état juste.
    //
    //   · `kind: 'film'` change le vocabulaire : un film n'est pas « à
    //     l'affiche », n'a pas de tournée, et son pied de page ne renvoie
    //     pas aux dates. Le montage viendra quand il y aura des images —
    //     ou un extrait, avec un bloc { video: … }.

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
        genre: 'Fiction d’anticipation',
        synopsis: ['Paris, 2077.\nPas de guerre nucléaire, pas de fertilité perdue, pas d’intelligence venue d’ailleurs pour nous exterminer ou nous sauver : le monde a seulement continué. Un meurtre étrange, une enquêtrice — et au bout de la piste, notre système agro-alimentaire.'],
        // Un seul bloc, tant que le plateau n'existe pas : la note
        // d'intention. Condensée des intentions d'Angelo Jossec, à la
        // troisième personne — le « je » d'un metteur en scène sur le site
        // d'un comédien se lirait comme celui d'Adrien.
        sequence: [
            {
                text: 'Sous couvert d’une enquête policière, Cassandre(s) imagine le quotidien ' +
                    'de la génération 2000 arrivée au terme de son espérance de vie : la forme est ' +
                    'au service du divertissement quand le fond est l’objet de la diversion. Pour ' +
                    'que l’anticipation ne soit pas reçue comme de la science-fiction, le spectacle ' +
                    's’ouvre sur une chronologie de notre développement agro-industriel, de 1850 à ' +
                    '2077 — un générique qui fait basculer la fiction du côté du probable.'
            },
        ]
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
        genre: 'Comédie',
        synopsis: ['Quand la censure académique leur impose Le Mariage Forcé à la place du Malade Imaginaire, des comédiens font déraper la lecture jusqu\'à transformer la classe en un chantier théâtral et musical jubilatoire.'],
        sequence: []
    },

    'À la barre, peine perdue ?': {
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
        genre: 'Théâtre documentaire',
        synopsis: ['Inspirés d’affaires réelles, des extraits de procès révèlent la complexité d’une justice en souffrance face à l\'ampleur des violences conjugales.'],
        sequence: [
            {
                chapter: '1h05',
                chapterTitle: 'Puis 45 minutes de débat — tout public dès 15 ans'
            },
            {
                p: [19], cadre: { 19: '45% 25%' },
                c: ['Créé en 2024 au palais de justice de Rouen.']
            },
            {
                q: ['« La violence est au plus proche des personnes de leurs relations,', 'au quotidien, au travail, dans la sphère familiale, la plus intime »'],
                by: 'Marion, III - L’institution judiciaire au défi du réel'
            },
            {
                p: [20, 8, 5, 9], cadre: { 20: '35% 35%', 8: '15% 18%', 5: '47% 18%', 9: '50% 15%' }, c: ['Avocate de la partie civile, IV - Le quotidien du sexisme', 'Prévenu, IV - Le quotidien du sexisme', 'Greffier, II - Face aux violences', 'Avocat de la défense, V - La défense des hommes'],
                aside: ['Comment, dans ces conditions,', 'réussir à “rendre justice” ?']
            },
            {
                q: ['« Monsieur, avez-vous quelque chose à ajouter ? »'],
                by: 'Présidente, VI - Dans le couple '
            },
            {
                p: [4, 13, 14, 12], cadre: { 4: '18% 25%', 13: '30% 15%', 14: '36% 28%', 12: '52% 25%' }, c: ['', '', ''],
                aside: ['Le spectacle, sobre, peut se jouer en tribunal comme en salle municipale ou établissement scolaire : la salle d\'audience est recrée.']
            },
            {
                q: ['« Peine perdue, alors ? » — « Non, au contraire : on travaille, on continue. »'],
                by: 'Rémi, Anne, X - Conclusion'
            },
            {
                p: [6], cadre: { 6: '57% 28%' }, c: [''],
                over: ['« La justice est imparfaite parce qu’elle est humaine... »'],
                overAt: 'bas'
            },
            {
                text: '« ... Elle répond pourtant à l’une des vocations les plus hautes de notre humanité : briser la loi du plus fort. Pour cela, elle doit savoir écouter — et il faut lui en donner le temps. »  '
            },
            {
                p: [25, 26], cadre: { 25: '55% 50%', 26: '33% 45%' }, c: ['Débat suivant une représentation au lycée des Bruyères, à Sotteville-lès-Rouen', 'Débat suivant une représentation au tribunal d\'Avignon', ''],
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
        genre: 'Spectacle de prévention',
        synopsis: ['Un spectacle de prévention, joué au collège.',
            'Violences sexistes et sexuelles, stéréotypes, consentement — à travers le prisme de la justice.'],
        sequence: [
            {
                chapter: '40 min',
                chapterTitle: 'Puis 30 minutes de débat — niveaux 4ᵉ et 3ᵉ'
            },
            {
                p: [8], cadre: { 8: '45% 55%' },
                c: ['Adapté d’À la barre pour le collège, créé en résidence-jumelage au collège Boieldieu, à Rouen, avec tout le niveau de 4ᵉ.']
            },
            {
                q: ['« Victime. Irréparable. Accusé. Avocat.',
                    'Émotion. Juge. Défendre. Sursis.',
                    'Acquitté. Procédure. Peine. Vérité. »'],
                by: 'Les mots de la justice, par les élèves du collège Boieldieu'
            },
            {
                p: [6, 5], cadre: { 6: '42% 20%', 5: '48% 18%' }, c: ['', ''],
                aside: ['Les différents tribunaux, leur composition, le déroulé d’un procès — et ce qu’on y dit vraiment.']
            },
            {
                p: [4], cadre: { 4: '62% 20%' },
                c: ['Très léger dans son installation, le spectacle se joue à une comédienne et deux comédiens, au sein des établissements scolaires comme dans les théâtres.']
            },
            {
                p: [1, 2, 3], cadre: { 1: '48% 30%', 2: '35% 40%', 3: '60% 40%' }, c: ['', '', ''],
                aside: ['Après la représentation, un échange permet d\'effectuer un travail de sensibilisation.']
            },
            {
                q: ['« Pourquoi suis-je violent ? »'],
                by: 'La question posée au débat'
            },
            {
                text: 'C’est un outil de prévention autant qu’un spectacle : ce qui se joue devant les élèves prépare ce qui se dira après.'
            },
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
        genre: 'Tragédie',
        synopsis: ['Royaume de Pyrie, 124 av. J-C.',
            'Lorsqu’un roi meurt et qu’il est père de jumeaux, lequel des deux est l’aîné et doit prendre sa place ? La reine veuve Cléophène, dépositaire du pouvoir, doit céder sa couronne, et elle seule connaît le secret de son successeur...'],
        sequence: [
            {
                chapter: '1h30',
                chapterTitle: 'Un drame familial de l’amour et de la haine'
            },
            {
                q: ['« Rodogune ? Shakespeare n’a rien écrit de plus beau. »'],
                by: 'Stendhal, 16 juillet 1804'
            },
            {
                p: [5], cadre: { 5: '15% 25%' },
                c: ['Les Crescite poursuivent le travail de l\'alexandrin entrepris sur Bérénice. Dans Cléophène, les personnages sont sanguinaires, vils, assoiffés de pouvoir.'],
            },
            {
                q: ['« Je vois dans le hasard tout les biens que j\'espère,', 'Mais ne puis être heureux sans le malheur d\'un frère. »'],
                by: 'Antiochus, Acte I'
            },
            {
                p: [9], cadre: { 9: '50% 35%' },
                c: ['La figure des jumeaux : une incarnation à deux têtes du dilemme cornéliens.'],
            },
            {
                p: [20, 15, 17], cadre: { 20: '42% 30%', 15: '48% 15%', 17: '46% 22%' }, c: ['', ''],
                aside: ['La princesse Rodogune, fille du roi ennemi, est tenue captives. Les deux princes héritiers l\'aiment, contre la loi de leur mère.']
            },
            {
                q: ['« Je puis, comme je veux, tourner le droit d’aînesse,', 'Et donne à ton rival ton sceptre et ta maîtresse. »'],
                by: 'Cléophène, Acte IV'
            },
            {
                p: [21], cadre: { 21: '38% 32%' },
                c: ['La mise en scène, volontairement spectaculaire, dépayse le spectateur dans un univers où sons et lumières soutiennent l\'immersion dans un drame antique épique.'],

            },
            {
                p: [10, 13], cadre: { 10: '50% 65%', 13: '42% 45%' }, c: ['', ''],
                aside: ['Corneille excelle lorqu\'il n\'est pas corseté par les unités ou la bienséance.']
            },
            {
                p: [7], cadre: { 7: '78% 50%' }, c: ['La rigueur sur le travail du vers sera la même que sur Bérénice.'],

            },
            {
                q: ['« Il vaut mieux mériter le sort le plus étrange.', 'Tombe sur moi le ciel, pourvu que je me venge ! »'],
                by: 'Cléophène, Acte V'
            },
            {
                p: [23, 16], cadre: { 23: '42% 30%', 16: '48% 55%' }, c: ['', ''],
                over: ['« Jusqu’où serez-vous', 'semblables ? »'], overAt: 'droite'
            },
            {
                text: 'Dans ce travail de la compagnie Crescite, les rebondissements vont arriver à chaque acte. L\'acte final termine en apothéose quasi burlesque, et donne à cette adaptation de Rodogune de Corneille toute sa dimension shakespearienne.'
            },
            {
                video: 'https://www.youtube.com/watch?v=bTr685C1YL8',
                c: ['Bande annonce — Théâtre l\'Étincelle, Ville de Rouen']
            },
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
        genre: 'Fable contemporaine',
        synopsis: ['Une fratrie. Un village. Perdu.',
            'La foudre y a frappé il y a quelques années et y a laissé des survivant.e.s : les fulguré.e.s. À l’occasion d’un nouvel an, la fratrie s’y perd et rencontre ses habitants. Alors que « tout est chaos », la foudre frappe à nouveau.'],
        sequence: [
            {
                chapter: '1h15',
                chapterTitle: 'Spectacle tout public à partir de 14 ans.'
            },
            {
                p: [10], cadre: { 10: '47% 35%' },
                c: ['Cette pièce réjouira les amateurs de musique électro, de relations familiales compliquées, et de phénomènes naturels extrêmes.']
            },
            {
                q: ['« Il n’est pas mort.', 'Il s’est fait FULGURER. »'],
                by: ''
            },
            {
                p: [3, 1, 4], cadre: { 3: '80% 25%', 1: '33% 25%', 4: '12% 35%' }, c: ['', '', ''],
                aside: ['« Quand la foudre frappe,', 'elle entre en toi en faisant un trou... »']
            },
            {
                p: [23], cadre: { 23: '25% 40%' }, c: ['La cellule familiale, subterfuge qui permet de passer l’humain au microscope.']
            },
            {
                p: [27, 5, 19], cadre: { 27: '52% 30%', 5: '62% 35%', 19: '33% 25%' }, c: ['', '', ''],
                aside: ['« Si tu ne trouves pas de deuxième trou, celui de la sortie, la charge est restée dans ton corps. Tu n’es plus fulguré·e, tu es FOUDROYÉ·E. »']
            },
            {
                p: [7], cadre: { 7: '70% 15%' },
                over: ['« La foudre frappe n\’importe où,', 'n\’importe qui, n\’importe quand :', 'il n\'y a aucun sens à ça.\»'], overAt: 'droite'
            },
            { p: [8, 26], cadre: { 8: '32% 25%', 26: '72% 28%' }, c: ['', ''] },
            { p: [2], cadre: { 2: '72% 30%' }, c: ['Envisager le fait de vivre comme une succession de coups de foudre dont on réchappe en boitant, chargé.e.s à bloc, déformé.e.s, sublimé.e.s par la brûlure.'] },

            {
                text: 'Fulguré.e.s est un spectacle qui met à l’épreuve l\'humain dans sa capacité à se débattre et à trouver des réponses face à la peur, à l’incompréhensible et à l’injustice.'
            },
        ]
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
        genre: 'Tragédie',
        synopsis: 'Rome, an 79. \n Huit jours après la mort soudaine de l\'empereur Vespasien, le destin de Bérénice, Titus et Antiochus bascule.',
        sequence: [
            { chapter: '1h25', chapterTitle: 'Une mise en scène resserrée, accessible et exigeante, au service d\'un des plus beaux poèmes en alexandrin' },
            { p: [2], cadre: { 2: '55% 55%' }, c: ['Un triangle amoureux élevé au rang de la tragédie.'] },
            {
                q: ['« Que le jour recommence et que le jour finisse', 'Sans que jamais Titus puisse voir Bérénice. »'], by: 'Bérénice, acte V'
            },
            { p: [18], cadre: { 18: '52% 45%' }, c: ['La scène est une arène en hyper proximité avec le public, baignée dans une ambiance sonore et musicale live.'] },
            {
                p: [12, 5], cadre: { 12: '58% 15%', 5: '30% 45%' }, c: ['Bérénice, Antiochus, Acte III', 'Paulin, Titus, Bérénice, Acte II'],
                // REMPLISSAGE
                aside: 'Une des plus belles partitions classique pour un personnage féminin qui sert « d\'exemple à l\'univers ».'
            },
            {
                q: '« Depuis huit jours je règne ; et jusques à ce jour,\n' +
                    'Qu\'ai-je fait pour l\'honneur ? J\'ai tout fait pour l\'amour. »', by: 'Titus, acte IV'
            },
            {
                p: [1, 9, 11], cadre: { 1: '48% 15%', 9: '68% 20%', 11: '48% 18%' }, c: ['Bérénice, Titus, Acte II', 'Antiochus, Acte V', 'Paulin, Antiochus, Acte I'],
                // REMPLISSAGE
                aside: 'La pureté des émotions transposée en thriller psychologique.'
            },
            {
                p: [3], cadre: { 3: '62% 45%' }, c: ['Un travail au plus plus proche de l\'alexandrin racinien pour en éprouver la virtuosité.'],
            },
            {
                q: ['« Vous m’aimez, vous me le soutenez,', 'Et cependant je pars, et vous me l’ordonnez ! »'],
                by: 'Bérénice, acte IV'
            },
            { p: [7, 13, 16], cadre: { 7: '55% 25%', 13: '60% 40%', 16: '55% 25%' }, c: ['Bérénice, Antiochus, Acte I', 'Antiochus, Paulin, Titus, Acte IV', 'Bérénice, Antiochus, Titus, Acte V'] },
            {
                text: 'Un spectacle exigeant qui déconstruit les a priori sur le théâtre classique pour transmettre ce patrimoine universel.'
            },
            { p: [17, 19], cadre: { 17: '50% 55%', 19: '32% 35%' }, c: ['Lycée La Salle, Rouen', 'Espace Jean Legendre, Compiègne'] },

            {
                video: 'https://www.youtube.com/watch?v=5wg0P7-Dt_w',
                c: ['Bande annonce — Centre culturel Voltaire, Déville-lès-Rouen']
            },
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
        genre: 'Comédie',
        synopsis: ['Bannie de la cour, Rosalind s’enfuit dans la forêt des Ardennes. Déguisée en berger sous le nom de Ganymède, elle est accompagnée de son bouffon Touchstone et de sa cousine Celia. Elle y retrouvera d\'autre membres de la cour exilés, les bergers du pays et le jeune homme dont elle est tombée amoureuse.'],
        sequence: [
            {
                chapter: '2h',
                chapterTitle: 'La comédie shakespearienne traduite et adaptée en spectacle théâtral et musical tout terrain, pour un public dès 12 ans.'
            },
            {
                p: [3],
                over: ['« Le monde entier est un théâtre... »'], overAt: 'centre'
            },
            {
                q: ['« ...et tous les hommes et les femmes rien d’autre que des acteurs.', 'Ils ont leurs entrées et leurs sorties. »'],
                by: 'Jaques, ACTE II'
            },
            {
                p: [16, 14, 9], cadre: { 16: '45% 50%', 14: '50% 65%', 9: '60% 45%' }, c: ['Extérieur, ACTE I', 'Extérieur, ACTE V', 'Intérieur, ACTE V'],
                aside: 'Neuf comédiens incarnant gens de cour et paysans réunis dans la même forêt.'
            },
            {
                p: [8], cadre: { 8: '38% 40%' }, c: ['Dans As you like it, le rythme surprend et change à chaque instant. C\'est lui qui doit nous emporter.'],
            },
            {
                q: ['« Un humain au cours de sa vie joue plusieurs rôles,',
                    'ses actes étant les sept âges. »'],
                by: 'Jaques, ACTE II'
            },
            {
                p: [11, 1, 4], cadre: { 11: '48% 32%', 1: '47% 30%', 4: '42% 35%' }, c: ['Adurey, Touchstone, ACTE V', 'Rosalind, Duke Frederick, Celia, ACTE I', 'Celia, Rosalind, ACTE II'],
            },
            {
                text: 'Des comédiens et des musiciens forment un joyeux orchestre. C’est comme une fête ! Et dans toute bonne fête, le rythme, la musique et le paysage sonore priment.'
            },
            {
                p: [15, 13], cadre: { 15: '50% 70%', 13: '40% 35%' },
                c: ['Château de Villerville', 'Le Studio d\'Asnières'],
            },
        ]
    },

    "L'Homme moderne": {
        slug: 'hommemoderne',
        kind: 'film',
        subtitle: 'mini-série en quatre épisodes',
        role: 'Rôle · Arthur',
        // Le parchemin du générique — un codex de Vinci où l’homme de
        // Vitruve apprend la modernité — donne le fond ; le peignoir de
        // Melvin, l’abricot de l’accent ; le pull d’Arthur, le bleu du
        // halo. La série entière tient dans ce face-à-face de couleurs.
        palette: {
            bg: '#e6dbc8', surface: '#f4edde', text: '#241b12', muted: '#6f6252',
            accent: '#cf8352', accentInk: '#a4602f', onAccent: '#ffffff',
            line: 'rgba(36,27,18,0.15)', glow: 'rgba(74,108,138,0.38)'
        },
        genre: 'Comédie',
        synopsis: ['Arthur veut devenir un homme moderne. Melvin, coach en peignoir, a la méthode : exercices, carnet, chanson. Quatre séances pour tout réapprendre — à commencer par Magali.'],
        // Le générique de fin, tel qu’il s’écrit à l’écran : « de et avec ».
        cast: ['Max Laure', 'Adèle Rawinski', 'Adrien Vada'],
        castNote: 'Co-scénariste : Louis Mallejac · Générique illustré par Daphné Laure.',
        sequence: [
            {
                chapter: '4 épisodes',
                chapterTitle: 'La méthode Melvin en quatre séances — du premier date à la cérémonie du carnet, 2022-2023.'
            },
            {
                p: [1], cadre: { 1: '74% 36%' },
                over: ['« Ah Magali…', 'Oh Magali… »'],
                overAt: 'gauche', overBy: 'Arthur'
            },
            {
                p: [2, 3], cadre: { 2: '50% 40%', 3: '43% 31%' },
                c: ['Le souvenir de Magali', 'L\'accueil de Melvin — épisode 1, Le date.']
            },
            {
                q: ['« Je sais qu’il y a pas que ça qui compte.', 'Mais c’est important, non — d’assurer ? »'],
                by: 'Arthur - épisode 2, Première séance'
            },
            {
                p: [4, 5], cadre: { 4: '80% 30%', 5: '42% 20%' },
                c: ['« Donc… je suis moderne. »', 'La séance se termine en chanson.'],
                aside: ['Un canapé pour cabinet, un carnet pour boussole : Melvin reçoit, Arthur récite.']
            },
            {
                p: [6], cadre: { 6: '33% 55%' },
                over: ['« J’avais envie d’elle, Melvin. »'],
                overAt: 'droite', overBy: 'Épisode 3, Prédateur ?'
            },
            {
                q: ['« J’aimerais que tu fasses attention aux femmes que tu croises.', 'Et surtout aux femmes qui t’attirent. »'],
                by: 'Melvin — l’exercice de la semaine'
            },
            {
                p: [7, 8], cadre: { 7: '20% 25%', 8: '58% 28%' },
                c: ['Le cabinet, à la nuit tombée.', 'Épisode 4, Le carnet — l’argile avant l’épreuve.']
            },
            {
                text: 'Écrite, tournée et montée à quatre mains avec Max Laure, la série suit ' +
                    'la méthode séance après séance : des exercices, un carnet — et la ' +
                    'modernité comme ligne d’arrivée.'
            },
            {
                p: [9, 10], cadre: { 9: '30% 33%', 10: '78% 22%' },
                c: ['Les concombres de la méthode.', 'Minuit : la cérémonie du carnet.']
            },
            {
                video: 'https://www.youtube.com/watch?v=OT85GdKWsaM',
                c: ['Épisode 1, Le date — la série commence ici.']
            },
        ]
    },

    "La peau des anges n'est pas si douce": {
        slug: 'peaudesanges',
        kind: 'film',
        affiche: true,
        role: 'Rôle · Narration',
        // Vermeer, littéralement : le plâtre clair d'un mur éclairé par la
        // gauche, l'outremer du turban, et le jaune de plomb-étain en
        // guise de lueur. La palette du film est celle des tableaux dont
        // il raconte l'histoire.
        palette: {
            bg: '#efe9dd', surface: '#ffffff', text: '#1c1a17', muted: '#6b6357',
            accent: '#2c4a8f', accentInk: '#223d78', onAccent: '#ffffff',
            line: 'rgba(28,26,23,0.15)', glow: 'rgba(199,158,58,0.30)'
        },
        genre: 'Film sur l’art',
        // Le synopsis officiel de la fiche Unifrance, tel quel.
        synopsis: ['Il était une fois la véritable histoire des tableaux de Vermeer. Tout le monde l’a oubliée. Certains détails de la vie d’une femme doivent rester secrets.'],
        // La distribution de l'affiche : luth, viole de gambe, narration.
        cast: ['Constance Grard', 'Louise Pierrard', 'Adrien Vada'],
        castNote: 'Luth, viole de gambe, narration.',
        prix: ['Prix du jury · Jeju International Film Festival, 2024',
            'Meilleur court métrage · Albany International Film Festival, 2023'],
        sequence: [
            {
                chapter: '12 min',
                chapterTitle: 'Entre documentaire et fiction, un voyage dans les tableaux de Vermeer — La Fémis, 2022.'
            },
            {
                p: [1], cadre: { 1: '50% 35%' },
                c: ['Au musée, devant « La Laitière ». C’est ici que le secret commence.']
            },
            {
                q: ['« Cette histoire est entièrement vraie,', 'puisque je l’ai imaginée d’un bout à l’autre. »'],
                by: 'Emma Fridé'
            },
            {
                p: [2, 3], cadre: { 2: '30% 45%', 3: '50% 45%' },
                c: ['Le globe du « Géographe ».', 'Un visage affleure dans les craquelures.'],
                aside: ['Le film s’approche des toiles jusqu’à ce que la peinture devienne paysage.']
            },
            {
                p: [4], cadre: { 4: '50% 40%' },
                over: ['« Lorsqu’il s’agit de la vie d’une femme,', 'certains secrets sont faits pour durer. »'],
                overAt: 'bas'
            },
            {
                text: 'Faites un voyage romanesque à travers ses peintures : découvrez ' +
                    'les paysages et les personnages issus de l’imagination du peintre.'
            },
            {
                p: [5], cadre: { 5: '50% 45%' },
                c: ['La peau des anges, au plus près.']
            },
            {
                video: 'https://vimeo.com/799006724',
                jaquette: 'teaser.jpg',
                c: ['Bande-annonce — Le FIFA 41, Montréal']
            },
        ]
    },

    'Le rapt': {
        slug: 'lerapt',
        kind: 'film',
        affiche: true,
        role: 'Rôle · Steven',
        // La palette est mesurée dans les images du film, et elle suit sa
        // note d'intention : « des couleurs vertes, marron et terreuses »
        // qui s'ouvrent vers le « bleu-rosé » de la plage. Le fond est le
        // sable des dunes, l'accent le rouge de la Fiat et des perruques —
        // le halo du titre, lui, prend le ciel.
        palette: {
            bg: '#eae4d3', surface: '#f7f3e8', text: '#211f18', muted: '#6d6857',
            accent: '#c2402f', accentInk: '#9d2f1e', onAccent: '#ffffff',
            line: 'rgba(33,31,24,0.15)', glow: 'rgba(154,180,210,0.40)'
        },
        // Le rouge de l'univers est celui d'À la barre sur le CV : le filet
        // prend un corail délavé de soleil — acidulé comme le film, et qui
        // ne se confond avec aucun voisin.
        cvAccent: '#de7a5a',
        genre: 'Comédie',
        synopsis: ['Deux ouvrières enlèvent le fils de leur patron pour en tirer une rançon. Elles se trompent d’homme : c’est un vendeur de ventilation ravi d’échapper à son quotidien.'],
        // La distribution du générique de fin du film.
        cast: ['Cécile Dessillons', 'Ladane Dehdar', 'Ardag Basmadjian',
            'Angélique Métier', 'Adrien Vada'],
        sequence: [
            {
                chapter: '25 min',
                chapterTitle: 'Une comédie de Cécile Dessillons et Ladane Dehdar, des routes de campagne aux plages du Nord.'
            },
            {
                p: [1], cadre: { 1: '66% 40%' },
                c: ['Une petite ville du Nord, à l’aube. Deux ouvrières, une Fiat rouge, un plan sans faille.']
            },
            {
                q: ['« Démarre ! Démarre ! Démarre ! »'],
                by: 'Véronique'
            },
            {
                p: [2, 3], cadre: { 2: '58% 30%', 3: '50% 50%' },
                c: ['L’otage. Encore engourdi.', '« Dis bonjour à Papa ! »'],
                aside: ['« Il a dit “Je ne comprends pas, Fabien est ici”, et il a raccroché. »']
            },
            {
                p: [4], cadre: { 4: '68% 45%' },
                over: ['« Vous êtes qui ?', 'Qu’est-ce que vous me voulez ? »'],
                overAt: 'gauche', overBy: 'Steven'
            },
            {
                q: ['« J’veux pas rentrer, c’est tout. »'],
                by: 'Steven'
            },
            {
                p: [5, 6], cadre: { 5: '45% 30%', 6: '46% 25%' },
                c: ['« Je vais pisser. »', 'Le muret des confidences.'],
                aside: ['« Elle et ma mère décident de tout : du mariage, de l’appart, de ma vie, de tout. »']
            },
            {
                p: [7], cadre: { 7: '62% 35%' },
                c: ['« Mangeons, mangeons ! On sait pas qui nous mangera demain… »']
            },
            {
                q: ['« Alors, ça te plaît l’Amérique ? »'],
                by: 'Véronique'
            },
            {
                p: [8, 9], cadre: { 8: '65% 30%', 9: '48% 50%' },
                c: ['Arsen, sa radio, la nuit qui monte.', 'Le lendemain, à l’aube.'],
                aside: ['« Téléphon, piège à con. »']
            },
            {
                p: [10], cadre: { 10: '49% 60%' },
                over: ['« Un silence profond', 'émane des arbres. »'],
                overAt: 'droite', overBy: 'Dernière séquence du scénario'
            },
            {
                text: 'Le Rapt évoque cette quête universellement partagée d’un ailleurs ' +
                    'toujours plus riche, plus gai et plus intense que la morne réalité. ' +
                    'Voyager vers la liberté, quels que soient les moyens à disposition — ' +
                    'et la personne que l’on est.'
            },
            {
                video: 'https://youtu.be/I_sibdqLJJQ',
                c: ['Le film intégral — 25 minutes']
            },
        ]
    },
};

/* ══════════════════════════════════════════════════════════════
   MOTEUR — ouverture, palette, parallaxe, fermeture
   ══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // Le moteur de montage vit dans univers-montage.js, partagé avec le
    // script qui fabrique les pages /spectacles/. On redéclare ici ses noms :
    // tout le fichier continue de les appeler comme avant, et l'opération
    // se relit sans avoir à vérifier deux cents points d'appel.
    const {
        panelHtml, datesHtml, escape, toLines, splitWords, splitChars, titleMetrics, revealWords,
        longestLine, photoSrc, framePos, figureHtml, overHtml, videoRef,
        videoHtml, afficheHtml, beatsHtml, prixBlock, castBlock,
        FRAMES, FRAME_PAIR, YT_ID, VIMEO_ID, VIDEO_REF, JAQUETTE_OK, LAYOUT_BY_COUNT
    } = UniversMontage;

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let overlay, scroller, lastFocus = null, isOpen = false, rafId = 0;


    function universeFor(li) {
        return SHOW_UNIVERSES[li?.dataset?.cvShow || ''] || null;
    }

    // ── Dates : relues dans dates.js, jamais dupliquées ici ──────────
    function datesBlock(key) {
        if (typeof upcomingPerformances !== 'function') return '';
        // Le dessin est dans univers-montage.js, partagé avec les pages
        // /spectacles/. Ici, on ne fait que réunir les représentations de
        // ce spectacle — elles restent lues dans dates.js, jamais recopiées.
        return datesHtml(upcomingPerformances().filter(p => p.title === key));
    }

    // Les titres du CV portent souvent une incise en <span> — l'auteur,
    // « (Racine) ». En plein écran elle ne peut pas rester dans le titre
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
            // Le CV écrit le titre en entier — « Cléophène, d'après
            // Rodogune ». En Cinzel 5rem c'est trop long : les univers
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





    // Le gabarit vit dans univers-montage.js, partagé avec les pages
    // /spectacles/ : c'est ce qui garantit qu'un univers et sa page ont le
    // même visage. Ici on ne fournit que ce qui vient du DOM et de l'état
    // du site — la ligne de CV, les dates du moment, le badge de création.
    function render(li, uni) {
        const info = rowInfo(li, uni);
        overlay.innerHTML = panelHtml(info, uni, {
            dates: datesBlock(info.key),
            // Sans date à venir, un spectacle peut être arrêté OU pas encore
            // créé : le badge de la ligne du CV est ce qui les distingue.
            enCreation: window.cvShowIsEnCreation?.(li) || false
        });
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
        // là que se joue vraiment le « le site change de peau ».
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
    // La croix et le bouton « Accéder aux dates » restent actifs pendant ce
    // temps : on doit toujours pouvoir renoncer.
    const MAX_WAIT_MS = 2500;

    function awaitFirstPhoto(uni) {
        // Un film s'ouvre sur son affiche : c'est donc elle qu'on attend.
        const first = uni.affiche
            ? `ressources/images/univers/${uni.slug}/affiche.jpg`
            : flatPhotos(uni)[0]?.src;
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
    let ouvertDepuis = 0;   // horodatage d'ouverture, pour mesurer la lecture

    function open(li, fromHistory) {
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
        // Une entrée d'historique de plus : « précédent » referme l'univers
        // et rend le CV, au lieu de quitter le site (voir index.html).
        // Cette entrée porte désormais UNE ADRESSE : #/univers/berenice. Un
        // univers cesse d'être un cul-de-sac qu'il fallait avoir sous les yeux
        // pour en parler — il s'envoie, se met en bio, se colle dans une
        // candidature. Quand l'ouverture VIENT de l'historique, l'entrée
        // existe déjà : on l'adopte au lieu d'en créer une seconde, sans quoi
        // la refermer retomberait sur elle-même.
        if (fromHistory) window.adoptOverlayState?.('univers');
        else window.pushOverlayState?.('univers', ROUTE + uni.slug);
        isOpen = true;
        // Quel univers ouvre-t-on, et lequel n'ouvre-t-on jamais ? La durée est
        // relevée à la fermeture : ouvrir puis refermer en deux secondes n'est
        // pas lire (voir close()).
        ouvertDepuis = Date.now();
        window.track?.('univers_ouvert', { spectacle: uni.slug, par: fromHistory ? 'historique' : 'cv' });
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
        // Combien de temps y est-on resté ? C'est cette durée, pas le nombre
        // d'ouvertures, qui dit si un univers tient ou si on le referme aussitôt.
        if (ouvertDepuis) {
            window.track?.('univers_ferme', {
                spectacle: overlay?.dataset.slug || '',
                secondes: Math.round((Date.now() - ouvertDepuis) / 1000)
            });
            ouvertDepuis = 0;
        }
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

    // ════════════════════════════════════════════════════════════════════
    //  L'ADRESSE D'UN UNIVERS
    //  Chaque spectacle a désormais la sienne : #/univers/berenice.
    //
    //  POURQUOI UN FRAGMENT ET PAS UN CHEMIN. Le site est une page unique
    //  servie telle quelle par GitHub Pages : /univers/berenice réclamerait
    //  un fichier à cet endroit et rendrait un 404 à froid. Le fragment, lui,
    //  ne quitte jamais index.html — l'adresse tient sans serveur.
    //
    //  POURQUOI ÇA NE HEURTE PAS LES ONGLETS, qui utilisent aussi le fragment
    //  (#page_cv). Leur gestionnaire ne réagit qu'aux valeurs correspondant à
    //  un identifiant réel de la page ; « /univers/… » n'en est jamais un, et
    //  passe donc à travers sans changer d'onglet.
    // ════════════════════════════════════════════════════════════════════
    const ROUTE = '#/univers/';

    function slugFromHash() {
        const h = location.hash || '';
        return h.startsWith(ROUTE) ? decodeURIComponent(h.slice(ROUTE.length)) : '';
    }

    // Retrouve la ligne de CV d'un slug. La comparaison se fait sur le dataset
    // et non par sélecteur : les clés portent apostrophes, accents et points
    // d'interrogation (« À la barre, peine perdue ? »), qu'il faudrait sinon
    // échapper — et une seule erreur d'échappement rendrait le spectacle
    // introuvable, silencieusement.
    function liForSlug(slug) {
        if (!slug) return null;
        const cle = Object.keys(SHOW_UNIVERSES).find(k => SHOW_UNIVERSES[k].slug === slug);
        if (!cle) return null;
        return Array.prototype.find.call(
            document.querySelectorAll('.cv-item'),
            li => li.dataset.cvShow === cle
        ) || null;
    }

    function initRouting() {
        // Entrée directe : l'adresse a été collée, ouverte depuis une bio,
        // un message, une candidature.
        const slugInitial = slugFromHash();
        if (slugInitial) {
            // On repose d'abord l'entrée courante sur l'onglet CV. Sans elle,
            // refermer l'univers ferait un « précédent » qui sortirait du
            // site : il n'y aurait rien derrière.
            history.replaceState(null, '', '#page_cv');
            // Un frame d'attente : `open` mesure la ligne du CV pour en faire
            // partir le panneau, et cette mesure ne vaut rien tant que la page
            // n'est pas mise en page.
            requestAnimationFrame(() => {
                const li = liForSlug(slugInitial);
                if (li) open(li);
                else history.replaceState(null, '', '#page_cv'); // slug inconnu : on reste au CV
            });
        }

        // « Suivant » du navigateur vers une adresse d'univers : l'entrée
        // existe déjà dans l'historique, on ouvre sans en créer une seconde.
        // Le retour, lui, est déjà traité par le popstate d'index.html qui
        // referme la couche — d'où le garde-fou `isOpen`, qui évite de
        // rouvrir ce qu'on vient de fermer.
        window.addEventListener('hashchange', () => {
            const slug = slugFromHash();
            if (!slug || isOpen) return;
            const li = liForSlug(slug);
            if (li) open(li, true);
        });
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
            // l'affiche, et démarre — on vient de cliquer sur « lire ».
            const play = e.target.closest('[data-u-video]');
            if (play) {
                const ref = play.dataset.uVideo;
                if (!VIDEO_REF.test(ref)) return;
                const id = ref.slice(ref.indexOf(':') + 1);
                const frame = document.createElement('iframe');
                // Les deux hébergeurs, chacun sous sa forme la plus sobre :
                // nocookie pour YouTube, dnt (do not track) pour Vimeo.
                frame.src = ref.startsWith('yt:')
                    ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`
                    : `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1&title=0&byline=0&portrait=0`;
                frame.title = play.getAttribute('aria-label') || 'Vidéo';
                frame.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen';
                frame.allowFullscreen = true;
                frame.loading = 'lazy';
                play.replaceWith(frame);
                return;
            }

            if (e.target.closest('.u-close')) { close(); return; }

            // « Accéder aux dates » : on saute au pied du panneau. Les
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
        // Après markCvRows : le routage ouvre un univers, et une ligne doit
        // déjà porter sa marque pour que le panneau en reprenne la couleur.
        initRouting();

        // Une page /spectacles/ : le panneau y est déjà rempli, il n'y a rien
        // à ouvrir. On rebranche seulement ce qui lui donne vie.
        if (document.body.classList.contains('u-page-spectacle')) demarrerStatique();
    }

    // ── LA PAGE SPECTACLE S'ANIME COMME LE PANNEAU ──────────────────
    //  Pas un second moteur d'animation — le même, dans le même
    //  environnement. La page pose son #show-universe exactement comme
    //  l'accueil : une boîte qui occupe l'écran et défile pour son compte.
    //  Du coup `scroller = overlay` reste vrai, et l'écriture, la parallaxe,
    //  les révélations au défilement, l'agrandissement des photos et le saut
    //  vers les dates fonctionnent sans qu'une ligne leur soit adaptée.
    //
    //  Ce qui n'a pas lieu d'être ici : l'ouverture en clip-path (il n'y a pas
    //  de ligne de CV d'où partir), la croix de fermeture (rien à refermer) et
    //  l'entrée d'historique (la page EST l'adresse).
    //
    //  SI LE JAVASCRIPT NE CHARGE PAS, la page ne serait qu'un écran vide :
    //  les mots attendent à `opacity: 0`. C'est pourquoi elle embarque
    //  univers-statique.css dans un <noscript>, qui remet tout à l'état
    //  lisible. Voir build/generer-pages-spectacles.js.
    function demarrerStatique() {
        scroller = overlay;
        isOpen = true;
        overlay.classList.add('is-open');
        overlay.addEventListener('scroll', onScroll, { passive: true });
        observeCaptions();
        lastScrollTop = 0;
        playWriting();
        onScroll();
    }

    // ── Ce que le CV promet ──────────────────────────────────────────
    //  Deux signaux, posés ici plutôt que dans le balisage : c'est ce
    //  fichier qui sait quelles lignes ont un univers, et la marque suit
    //  donc automatiquement les univers qu'on ajoute ou qu'on retire.
    //
    //  1. L'ICÔNE. Le chevron annonçait « ceci se déplie » — un tiroir.
    //     Or la ligne ouvre une page plein écran. Les lignes dotées d'un
    //     univers portent donc une flèche oblique : on va quelque part.
    //     Les autres gardent leur chevron, qui redevient exact.
    //
    //  2. LA COULEUR. Un filet à gauche, dans la couleur du spectacle.
    //     Presque muet au repos, franc au survol. Le CV devient un
    //     sommaire : huit lignes, et derrière chacune un monde qui a
    //     déjà sa couleur avant qu'on y entre.
    // ── L'ÉCLAT DE LA GUIRLANDE, ÉGALISÉ ─────────────────────────────
    //  La guirlande allumait toutes les lignes à la même OPACITÉ (.16). Elle
    //  ne les allumait donc pas au même ÉCLAT : sur fond sombre, le rouge
    //  profond d'À la barre rendait quatre fois moins que le vert-jaune d'As
    //  You Like It. La vague était régulière — vérifié image par image — mais
    //  l'œil sautait les lignes ternes et la lisait en dents de scie.
    //
    //  Ce qu'on égalise, c'est donc l'écart de LUMINANCE au fond, pas
    //  l'opacité. Et le calcul est simple parce que la luminance perçue est
    //  une somme pondérée des composantes : poser une couleur à l'opacité α
    //  sur un fond déplace la luminance de exactement
    //
    //      Δ = α × | L(accent) − L(fond) |
    //
    //  Pour obtenir un Δ constant, il suffit donc de α = CIBLE / écart. Une
    //  division, une fois par ligne. Rien par image.
    //
    //  LES DEUX THÈMES SONT SERVIS PAR LA MÊME FORMULE, et c'est tout
    //  l'intérêt de partir du fond réel : en thème clair le rapport
    //  s'INVERSE — le vert-jaune, éclatant sur noir, disparaît sur blanc,
    //  tandis que le bleu nuit de La peau des anges devient le plus franc.
    //  Une table de valeurs écrite à la main aurait été juste dans un thème
    //  et fausse dans l'autre.
    const ECLAT_CIBLE = 19;      // écart de luminance visé, sur 255
    const CRETE_MIN = 0.09, CRETE_MAX = 0.42;

    function luminance(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

    // Accepte « #rrggbb » et « r, g, b » — les accents viennent des palettes
    // d'univers (hexadécimal) comme des variables du thème (triplets).
    function versRgb(c) {
        const t = String(c).trim();
        let m = t.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
        m = t.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
        if (m) return [+m[1], +m[2], +m[3]];
        return null;
    }

    function calerLesCretes() {
        const fond = versRgb(getComputedStyle(document.documentElement)
            .getPropertyValue('--c-bg')) || [10, 9, 7];
        const lFond = luminance(fond[0], fond[1], fond[2]);
        document.querySelectorAll('.cv-has-universe').forEach(li => {
            const rgb = versRgb(li.style.getPropertyValue('--cv-accent'));
            if (!rgb) return;
            const ecart = Math.abs(luminance(rgb[0], rgb[1], rgb[2]) - lFond);
            // Un accent confondu avec le fond ne se rattrape pas à coups
            // d'opacité : on plafonne plutôt que de virer à l'aplat.
            const crete = ecart < 1 ? CRETE_MAX
                : Math.min(CRETE_MAX, Math.max(CRETE_MIN, ECLAT_CIBLE / ecart));
            li.style.setProperty('--cv-crete', crete.toFixed(3));
        });
    }

    // Le thème peut changer à tout moment, par le bouton comme au chargement.
    // On observe l'attribut plutôt que de se brancher sur applyTheme() : la
    // guirlande n'a pas à savoir QUI a changé le thème, seulement qu'il a
    // changé.
    function suivreLeTheme() {
        new MutationObserver(calerLesCretes).observe(document.documentElement,
            { attributes: true, attributeFilter: ['data-theme'] });
    }

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
                // Le chevron « je me déplie » devient une flèche « j'ouvre
                // autre chose ». Avec le sprite, c'est le dessin visé qui
                // change, plus la classe qui le nommait.
                window.setIcon?.(icon, 'solid-arrow-right');
            }

            addWhisper(li, uni);
        });
        calerLesCretes();
        suivreLeTheme();
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
        // texte s'ajouterait au nom de la ligne — « Cassandres, Rôle…,
        // Théâtre des Crescite, Rome an 79, huit jours après la mort… ».
        // Le synopsis leur est donné en entier dans l'univers, à un clic.
        el.setAttribute('aria-hidden', 'true');
        // Mot à mot, comme le synopsis s'inscrit dans l'univers : `--i` est
        // le rang du mot, et le CSS en fait un retard. Le compteur court
        // d'une ligne à l'autre, sinon chaque ligne repartirait de zéro et
        // les trois s'écriraient en même temps.
        let i = 0;
        const html = lines.map(line =>
            `<span class="cv-whisper-line">` + line.split(/[^\S\u00A0]+/).filter(Boolean)
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
            if (row) row.classList.remove('is-whispering', 'is-pressed');
            row = null;
        };

        document.addEventListener('touchstart', (e) => {
            disarm(); hush(); shown = false;
            const li = e.target.closest?.('.cv-item.cv-has-universe');
            if (!li) return;
            // L'APPUI EST MARQUÉ ICI, ET NON LAISSÉ À `:active`. Au doigt,
            // `:active` est repris par le navigateur dès qu'il croit
            // reconnaître autre chose qu'un tap — un début de défilement,
            // un appui long — et la couleur retombait alors à zéro sous le
            // doigt, la guirlande reprenant la main. Ce marqueur-ci ne
            // dépend que de nous : il tient de touchstart à touchend.
            li.classList.add('is-pressed');
            const t = e.touches[0];
            row = li; x0 = t.clientX; y0 = t.clientY;
            // Le murmure, lui, demande un synopsis : sans lui la ligne
            // s'allume au doigt mais n'a rien à dire (voir Cassandres).
            if (!li.querySelector('.cv-whisper')) return;
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
