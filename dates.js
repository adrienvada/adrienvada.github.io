/**
 * FICHIER DE CONFIGURATION DES DATES DE SPECTACLE
 * 
 * Pour ajouter, modifier ou retirer une date, modifiez simplement ce fichier.
 * Respectez bien la syntaxe (virgules, guillemets, crochets).
 */

const SHOW_DATA = {
  // Titre de la saison en cours (pour la section des prochaines dates)
  currentSeasonTitle: "Saison 2026 - 2027",

  // -------------------------------------------------------------
  // PROCHAINES DATES (Saison en cours)
  // -------------------------------------------------------------
  upcoming: [
    {
      date: "22 - 23 Octobre 2026",
      title: "À la barre, peine perdue ?",
      location: "Palais de justice de Rouen (76)"
    },
    {
      date: "12 Novembre 2026",
      title: "À la barre, peine perdue ?",
      location: "Saint Quentin (02)"
    },
    {
      date: "25 Novembre 2026",
      title: "À la barre, peine perdue ?",
      location: "Le Grand-Quevilly (76)"
    },
    {
      date: "18 Décembre 2026",
      title: "Cléophène, d'après Rodogune",
      location: "L'Eclat, Pont-Audemer (27)"
    },
    {
      date: "26 Janvier 2027",
      title: "Cléophène, d'après Rodogune",
      location: "Le Forum, Falaise (14)"
    },
    {
      date: "29 - 30 Janvier 2027",
      title: "Bérénice",
      location: "Théâtre de la ville de Saint-Lô (50)"
    },
    {
      date: "29 - 30 Janvier 2027",
      title: "Cléophène, d'après Rodogune",
      location: "Théâtre de la ville de Saint-Lô (50)"
    },
    {
      date: "02 Février 2027",
      title: "Cléophène, d'après Rodogune",
      location: "La Ferme de Bel Ebat, Guyancourt (78)"
    },
    {
      date: "18 - 21 Mai 2027",
      title: "Bérénice",
      location: "Lycée Corneille <span class=\"italic text-[9px] text-gray-500\">(tout public le vendredi 21)</span>, Rouen (76)"
    }
  ],

  // -------------------------------------------------------------
  // ARCHIVES (Dates passées regroupées par saison)
  // L'ordre d'affichage des saisons suit l'ordre ci-dessous.
  // -------------------------------------------------------------
  archives: {
    "Saison 2025 - 2026": [
      { date: "13 Mai 2026", title: "Cléophène", location: "Salle Louis Jouvet, Rouen (76)" },
      { date: "26 Mars 2026", title: "Théâtre Forum", location: "UFR Santé, Rouen (76)" },
      { date: "03 Mars 2026", title: "Cléophène", location: "Le Rive Gauche, St-Étienne-du-Rouvray (76)" },
      { date: "15 Janvier 2026", title: "Bérénice", location: "Lycée Le Corbusier, Saint-Étienne-du-Rouvray (76)" },
      { date: "18 Décembre 2025", title: "Bérénice", location: "Lycée La Salle, Rouen (76)" },
      { date: "09 Décembre 2025", title: "Cléophène", location: "L'Archipel, Granville (50)" },
      { date: "06 Novembre 2025", title: "Bérénice", location: "Lycée Dumont d'Urville - Laplace, Caen (14)" },
      { date: "04 Novembre 2025", title: "Bérénice", location: "Institut Saint-Lô, Saint-Lô (50)" },
      { date: "16 Octobre 2025", title: "Cléophène", location: "Théâtre Le Sillon, Petit-Couronne (76)" }
    ],
    "Saison 2024 - 2025": [
      { date: "08 - 18 Juillet 2025", title: "À la barre", location: "La Manufacture / Palais de justice d'Avignon (84)" },
      { date: "25 Juin 2025", title: "Audiences", location: "Festival théâtre à la cité - Quartier Saint-Sever, Rouen (76)" },
      { date: "10 Juin 2025", title: "Audiences", location: "Canteleu (76)" },
      { date: "11 Mars 2025", title: "À la barre", location: "Hôtel de Ville de Rouen (76)" },
      { date: "05 Mars 2025", title: "Le discours de Cassandre", location: "Labo Victor Hugo, Rouen (76)" },
      { date: "08 Février 2025", title: "À la barre", location: "Hôtel de Ville de Canteleu (76)" },
      { date: "17 Janvier 2025", title: "Audiences", location: "Centre André Malraux, Rouen (76)" },
      { date: "12 Décembre 2024", title: "Bérénice", location: "Lycée Raymond Queneau, Yvetot (76)" },
      { date: "06 Décembre 2024", title: "Bérénice", location: "Lycée Jean-Baptiste de la Salle, Rouen (76)" },
      { date: "29 Novembre 2024", title: "Rodogune", location: "Athanor, Guérande (44)" },
      { date: "26 Novembre 2024", title: "Rodogune", location: "Théâtre Le Rayon Vert, Saint-Valéry-en-Caux (76)" },
      { date: "25 Novembre 2024", title: "À la barre", location: "Lycée les Buyères, Sotteville-lès-Rouen (76)" },
      { date: "22 Novembre 2024", title: "À la barre", location: "Hotel de ville de Notre-Dame de Bondeville (76)" },
      { date: "21 Novembre 2024", title: "Bérénice", location: "Lycée Vallée du Cailly, Déville-lès-Rouen (76)" },
      { date: "18 Novembre 2024", title: "Audiences", location: "Collège Boieldieu, Rouen (76)" },
      { date: "02 Novembre 2024", title: "Bérénice", location: "La Rotonde, Fauville-en-Caux (76)" },
      { date: "10 - 11 Octobre 2024", title: "Rodogune", location: "Théâtre Le Rayon Vert, Rouen (76)" }
    ],
    "Saison 2023 - 2024": [
      { date: "14 Juin 2024", title: "Bérénice", location: "Centre culturel Voltaire, Déville-lès-Rouen (76)" },
      { date: "01 Juin 2024", title: "À la barre", location: "Historial Jeanne d'Arc, Rouen (76)" },
      { date: "25 - 26 Mai 2024", title: "À la barre", location: "Palais de justice de Rouen (76)" },
      { date: "09 Avril 2024", title: "Spectacle environnement", location: "École élémentaire Pierre Corneille, Bolbec (76)" },
      { date: "26 Mars 2024", title: "Bérénice", location: "Lycée Jean-Baptiste de La Salle, Rouen (76)" },
      { date: "01 Février 2024", title: "Bérénice", location: "Collège Yard, Buchy (76)" },
      { date: "25 Janvier 2024", title: "Bérénice", location: "Lycée Vallée du Cailly, Déville-lès-Rouen (76)" },
      { date: "12 Avril 2023", title: "As You Like It", location: "Halle Ô Grains, Bayeux (14)" }
    ],
    "Saison 2022 - 2023": [
      { date: "26 Mai 2023", title: "Bérénice", location: "Lycée Jean-Baptiste de La Salle, Rouen (76)" },
      { date: "25 Novembre 2022", title: "Fulguré.e.s", location: "Théâtre Le Passage, Fécamp (76)" },
      { date: "23 - 24 Novembre 2022", title: "Bérénice", location: "Le Rayon Vert, Saint-Valéry-en-Caux (76)" },
      { date: "10 Novembre 2022", title: "Fulguré.e.s", location: "La Cité-Théâtre, Caen (14)" },
      { date: "08 Novembre 2022", title: "Fulguré.e.s", location: "Le Sillon, Petit-Couronne (76)" }
    ],
    "Saison 2021 - 2022": [
      { date: "02 - 03 Août 2022", title: "As You Like It", location: "Villa Montebello, Trouville (14)" },
      { date: "28 - 29 Avril 2022", title: "Bérénice", location: "Espace Jean Legendre, Compiègne (60)" },
      { date: "26 Avril 2022", title: "Bérénice", location: "La Cidrerie, Beuzeville (27)" },
      { date: "07 - 10 Avril 2022", title: "As You Like It", location: "Studio Théâtre d’Asnières, Asnières-sur-Seine (92)" },
      { date: "28 - 31 Mars 2022", title: "As You Like It", location: "Théâtre de Lisieux, Normandie (14)" },
      { date: "25 Février 2022", title: "Bérénice", location: "Lycée de Sotteville-lès-Rouen (76)" },
      { date: "01 Février 2022", title: "Bérénice", location: "Lycée de Neufchâtel-en-Bray (76)" },
      { date: "30 Janvier 2022", title: "Bérénice", location: "Siroco, Saint-Romain-de-Colbosc (76)" },
      { date: "15 Novembre 2021", title: "Bérénice", location: "Lycée Pablo Neruda, Dieppe (76)" },
      { date: "14 Octobre 2021", title: "Bérénice", location: "Lycée de la Vallée du Cailly, Déville-lès-Rouen (76)" }
    ],
    "Saison 2020 - 2021": [
      { date: "26 - 28 Août 2021", title: "As You Like It", location: "Festival de Villerville (14)" },
      { date: "20 Juillet 2021", title: "Bérénice", location: "Festival Les Échappées Belles, Alençon (61)" },
      { date: "16 - 17 Juillet 2021", title: "Bérénice", location: "Aître Saint-Maclou, Rouen (76)" },
      { date: "15 Juillet 2021", title: "Bérénice", location: "Salle La Seine, Tourville-la-Rivière (76)" },
      { date: "10 Juillet 2021", title: "Bérénice", location: "Centre culturel Simone Signoret, Amfreville-La-Mivoie (76)" }
    ]
  }
};
