/**
 * ============================================================
 *  GALERIE PHOTOS — Configuration
 * ============================================================
 *  Pour mettre à jour la galerie :
 *    - Ajoutez le nom du fichier (sans le chemin) dans le tableau
 *    - L'ordre des photos dans la galerie suit l'ordre ci-dessous
 *    - Les photos doivent être placées dans : ressources/images/galerie/
 *    - Exception : profil_1000x1000.jpg est dans : ressources/images/
 *
 *  `alt` : CE QUE MONTRE LA PHOTO, en une phrase — pour qui ne la voit
 *  pas (lecteur d'écran), et pour les moteurs de recherche d'images, qui
 *  ne lisent que ce texte. Il remplace « Photo 3 du book », qui ne disait
 *  rien. Les photos de plateau à plusieurs ne disent pas qui est qui :
 *  décrire la scène suffit, et ne se trompe pas.
 *
 *  IMPORTANT — vignettes :
 *    Chaque photo a trois vignettes WebP recadrées en 3:4 (320, 640 et
 *    960 px de large) dans ressources/images/galerie/vignettes/. Après un
 *    ajout, les fabriquer à la racine du site :
 *      python3 build/variantes-images.py
 *    puis régénérer la page : node build/generer-page-galerie.js
 *    (Les anciennes vignettes de 176 px, étirées sur 300 à 500 pixels
 *    d'écran, étaient floues : elles ont disparu avec thumbs/.)
 * ============================================================
 */

const GALLERY_IMAGES = [
    // ── Photo de présentation (cliquée depuis le profil) ──────────────
    { file: 'vignette_principale.jpeg', folder: 'galerie', alt: 'Portrait serré en pull gris, regard étonné vers l’objectif, sur fond gris clair' },

    // ── Book photos ───────────────────────────────────────────────────
    { file: 'photo1.jpeg', folder: 'galerie', alt: 'Portrait en pied, chemise bleue ouverte et jean, devant un mur de pierre' },
    { file: 'profil_1000x1000.jpg', folder: 'profil', alt: 'Portrait de face, regard grave, sur fond bleu nuit' },
    { file: 'photo2.jpeg', folder: 'galerie', alt: 'Dans une salle d’audience tapissée de fleurs de lys, un comédien en robe d’avocat plaide devant le public' },
    { file: 'photo4.jpeg', folder: 'galerie', alt: 'Même salle d’audience : un comédien en tee-shirt noir, bras ouverts, s’adresse au public' },
    { file: 'photo8.jpeg', folder: 'galerie', alt: 'Seul en scène dans un halo de lumière, casquette rouge et pull bordeaux' },
    { file: 'photo10.jpeg', folder: 'galerie', alt: 'Plateau couvert de sable sous des voilages violets : un roi couronné à genoux, entre deux comédiens' },
    { file: 'photo11.jpeg', folder: 'galerie', alt: 'Étreinte sur un sol de sable : un comédien en manteau et une comédienne en robe claire' },
    { file: 'photo12.jpeg', folder: 'galerie', alt: 'Deux comédiens devant un décor de bois, l’un en bleu de travail et bonnet, l’autre en casquette et veste de survêtement' },
    { file: 'photo13.jpeg', folder: 'galerie', alt: 'Deux comédiens vêtus de blanc, face à face, l’un tenant l’autre par le bras' },
    { file: 'photo14.jpeg', folder: 'galerie', alt: 'Image de film : sur une plage, un homme en costume rit au téléphone près d’une jeune femme aux cheveux au vent' },
    { file: 'photo15.jpeg', folder: 'galerie', alt: 'Portrait à lunettes, col roulé noir, sur fond clair' },
    { file: 'photo16.jpeg', folder: 'galerie', alt: 'Portrait en blouson de cuir marron, sur fond sombre' },
    { file: 'photo17.jpeg', folder: 'galerie', alt: 'Portrait en chemise verte, la main contre la tempe, sur fond bleu' },
    { file: 'photo18.jpeg', folder: 'galerie', alt: 'Crâne rasé et barbe, en extérieur devant un canyon rocheux' },
    { file: 'photo19.jpeg', folder: 'galerie', alt: 'Portrait éclatant de rire, chemisette beige, sur fond gris' },
    { file: 'photo20.jpeg', folder: 'galerie', alt: 'Image de film : gros plan en tee-shirt marron, regard inquiet vers un interlocuteur' },
    { file: 'photo21.jpeg', folder: 'galerie', alt: 'Salle d’audience lambrissée : en robe d’avocat, mains jointes devant un micro, l’air pensif' },
    { file: 'photo22.jpeg', folder: 'galerie', alt: 'Salle d’audience lambrissée : en tee-shirt noir, debout devant un micro, la main tendue' },
];
