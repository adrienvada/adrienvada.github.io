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
  // Options de configuration d'un spectacle / représentation :
  // - time: "19h00" (ou pour plusieurs horaires par jour sur la même ligne : time: "14h30 & 19h00" ou times: ["14h30", "19h00"])
  // - bookingUrl: "" (vide affiche "Les réservations ne sont pas encore ouvertes" sous le titre du spectacle)
  // -------------------------------------------------------------
  upcoming: [
    // ── 22 - 23 octobre 2026 : À la barre (Rouen) [Série] ──
    {
      type: "series",
      id: "panel-rouen",
      dateLabel: "22 - 23 oct. 2026",
      title: "À la barre, peine perdue ?",
      location: "Tribunal judiciaire de Rouen (76)",
      shows: [
        {
          dateLabel: "22 oct. 2026",
          time: "19h00",
          bookingUrl: "", // Vide = "Les réservations ne sont pas encore ouvertes"
          isSchool: false,
          icsDate: "2026-10-22"
        },
        {
          dateLabel: "23 oct. 2026",
          time: "19h00",
          bookingUrl: "",
          isSchool: false,
          icsDate: "2026-10-23"
        }
      ]
    },

    // ── 12 novembre 2026 : À la barre (Saint-Quentin) [Série] ──
    {
      type: "series",
      id: "panel-saintquentin",
      dateLabel: "12 nov. 2026",
      title: "À la barre, peine perdue ?",
      location: "Tribunal judiciaire de Saint-Quentin (02)",
      shows: [
        {
          dateLabel: "12 nov. 2026",
          time: "14h15",
          bookingUrl: "",
          isSchool: false,
          icsDate: "2026-11-12"
        },
        {
          dateLabel: "12 nov. 2026",
          time: "20h00",
          bookingUrl: "",
          isSchool: false,
          icsDate: "2026-11-12"
        }
      ]
    },

    // ── 25 novembre 2026 : À la barre (Le Grand-Quevilly) [Date unique] ──
    {
      type: "single",
      dateLabel: "25 nov. 2026",
      fullDate: "25 novembre 2026",
      title: "À la barre, peine perdue ?",
      location: "Hôtel de Ville de Grand-Quevilly (76)",
      time: "",
      bookingUrl: "",
      isSchool: false,
      icsDate: "2026-11-25"
    },

    // ── 18 décembre 2026 : Cléophène (Pont-Audemer) [Date unique] ──
    {
      type: "single",
      dateLabel: "18 déc. 2026",
      fullDate: "18 décembre 2026",
      title: "Cléophène",
      subtitle: "d'après Rodogune",
      location: "L'Eclat, Pont-Audemer (27)",
      time: "",
      bookingUrl: "",
      isSchool: false,
      icsDate: "2026-12-18"
    },

    // ── 26 janvier 2027 : Cléophène (Falaise) [Date unique] ──
    {
      type: "single",
      dateLabel: "26 janv. 2027",
      fullDate: "26 janvier 2027",
      title: "Cléophène",
      subtitle: "d'après Rodogune",
      location: "Le Forum, Falaise (14)",
      time: "",
      bookingUrl: "",
      isSchool: false,
      icsDate: "2027-01-26"
    },

    // ── 29 - 30 janvier 2027 : Bérénice (Saint-Lô) [Série] ──
    {
      type: "series",
      id: "panel-saintlo-berenice",
      dateLabel: "29 - 30 janv. 2027",
      title: "Bérénice",
      location: "Théâtre de la ville de Saint-Lô (50)",
      shows: [
        {
          dateLabel: "29 janv. 2027",
          time: "",
          bookingUrl: "",
          isSchool: false,
          icsDate: "2027-01-29"
        },
        {
          dateLabel: "30 janv. 2027",
          time: "",
          bookingUrl: "",
          isSchool: false,
          icsDate: "2027-01-30"
        }
      ]
    },

    // ── 29 - 30 janvier 2027 : Cléophène (Saint-Lô) [Série] ──
    {
      type: "series",
      id: "panel-saintlo-cleophene",
      dateLabel: "29 - 30 janv. 2027",
      title: "Cléophène",
      subtitle: "d'après Rodogune",
      location: "Théâtre de la ville de Saint-Lô (50)",
      shows: [
        {
          dateLabel: "29 janv. 2027",
          time: "",
          bookingUrl: "",
          isSchool: false,
          icsDate: "2027-01-29"
        },
        {
          dateLabel: "30 janv. 2027",
          time: "",
          bookingUrl: "",
          isSchool: false,
          icsDate: "2027-01-30"
        }
      ]
    },

    // ── 2 février 2027 : Cléophène (Guyancourt) [Date unique] ──
    {
      type: "single",
      dateLabel: "2 fév. 2027",
      fullDate: "2 février 2027",
      title: "Cléophène",
      subtitle: "d'après Rodogune",
      location: "La Ferme de Bel Ebat, Guyancourt (78)",
      time: "",
      bookingUrl: "",
      isSchool: false,
      icsDate: "2027-02-02"
    },

    {
      type: "single",
      dateLabel: "12 mars 2027",
      fullDate: "12 mars 2027",
      title: "À la barre, peine perdue ?",
      location: "Hôtel de ville de Barentin (76)",
      time: "",
      bookingUrl: "",
      isSchool: false,
      icsDate: "2027-03-12"
    },

    // ── 18 - 21 mai 2027 : Bérénice (Lycée Corneille) [Série] ──
    {
      type: "series",
      id: "panel-corneille",
      dateLabel: "18 - 21 mai 2027",
      title: "Bérénice",
      location: "Lycée Corneille, Rouen (76)",
      shows: [
        {
          dateLabel: "18 mai 2027",
          time: "",
          bookingUrl: "",
          isSchool: true, // "Séances scolaires"
          icsDate: "2027-05-18"
        },
        {
          dateLabel: "19 mai 2027",
          time: "",
          bookingUrl: "",
          isSchool: true, // "Séances scolaires"
          icsDate: "2027-05-19"
        },
        {
          dateLabel: "20 mai 2027",
          time: "",
          bookingUrl: "",
          isSchool: true, // "Séances scolaires"
          icsDate: "2027-05-20"
        },
        {
          dateLabel: "21 mai 2027",
          time: "",
          bookingUrl: "",
          isSchool: false,
          icsDate: "2027-05-21"
        }
      ]
    }
  ],

  // -------------------------------------------------------------
  // ARCHIVES (Dates passées regroupées par saison)
  // L'ordre d'affichage des saisons suit l'ordre ci-dessous.
  // -------------------------------------------------------------
  archives: {
    "Saison 2025 - 2026": [
      { date: "13 mai 2026", title: "Cléophène, d'après Rodogune", location: "Salle Louis Jouvet, Rouen (76)" },
      { date: "26 mars 2026", title: "Théâtre Forum", location: "UFR Santé, Rouen (76)" },
      { date: "3 mars 2026", title: "Cléophène, d'après Rodogune", location: "Le Rive Gauche, St-Étienne-du-Rouvray (76)" },
      { date: "15 janvier 2026", title: "Bérénice", location: "Lycée Le Corbusier, Saint-Étienne-du-Rouvray (76)" },
      { date: "18 décembre 2025", title: "Bérénice", location: "Lycée La Salle, Rouen (76)" },
      { date: "9 décembre 2025", title: "Cléophène, d'après Rodogune", location: "L'Archipel, Granville (50)" },
      { date: "6 novembre 2025", title: "Bérénice", location: "Lycée Dumont d'Urville - Laplace, Caen (14)" },
      { date: "4 novembre 2025", title: "Bérénice", location: "Institut Saint-Lô, Saint-Lô (50)" },
      { date: "16 octobre 2025", title: "Cléophène, d'après Rodogune", location: "Théâtre Le Sillon, Petit-Couronne (76)" }
    ],
    "Saison 2024 - 2025": [
      { date: "8 - 18 juillet 2025", title: "À la barre", location: "La Manufacture / Palais de justice d'Avignon (84)" },
      { date: "25 juin 2025", title: "Audiences", location: "Festival théâtre à la cité - Quartier Saint-Sever, Rouen (76)" },
      { date: "10 juin 2025", title: "Audiences", location: "Canteleu (76)" },
      { date: "11 mars 2025", title: "À la barre", location: "Hôtel de Ville de Rouen (76)" },
      { date: "5 mars 2025", title: "Le discours de Cassandre", location: "Labo Victor Hugo, Rouen (76)" },
      { date: "8 février 2025", title: "À la barre", location: "Hôtel de Ville de Canteleu (76)" },
      { date: "17 janvier 2025", title: "Audiences", location: "Centre André Malraux, Rouen (76)" },
      { date: "12 décembre 2024", title: "Bérénice", location: "Lycée Raymond Queneau, Yvetot (76)" },
      { date: "6 décembre 2024", title: "Bérénice", location: "Lycée Jean-Baptiste de la Salle, Rouen (76)" },
      { date: "29 novembre 2024", title: "Cléophène, d'après Rodogune", location: "Athanor, Guérande (44)" },
      { date: "26 novembre 2024", title: "Cléophène, d'après Rodogune", location: "Théâtre Le Rayon Vert, Saint-Valéry-en-Caux (76)" },
      { date: "25 novembre 2024", title: "À la barre", location: "Lycée les Buyères, Sotteville-lès-Rouen (76)" },
      { date: "22 novembre 2024", title: "À la barre", location: "Hotel de ville de Notre-Dame de Bondeville (76)" },
      { date: "21 novembre 2024", title: "Bérénice", location: "Lycée Vallée du Cailly, Déville-lès-Rouen (76)" },
      { date: "18 novembre 2024", title: "Audiences", location: "Collège Boieldieu, Rouen (76)" },
      { date: "2 novembre 2024", title: "Bérénice", location: "La Rotonde, Fauville-en-Caux (76)" },
      { date: "10 - 11 octobre 2024", title: "Cléophène, d'après Rodogune", location: "Théâtre Le Rayon Vert, Rouen (76)" }
    ],
    "Saison 2023 - 2024": [
      { date: "14 juin 2024", title: "Bérénice", location: "Centre culturel Voltaire, Déville-lès-Rouen (76)" },
      { date: "1 juin 2024", title: "À la barre", location: "Historial Jeanne d'Arc, Rouen (76)" },
      { date: "25 - 26 mai 2024", title: "À la barre", location: "Palais de justice de Rouen (76)" },
      { date: "9 avril 2024", title: "L'avenir de la planète se joue maintenant", location: "École élémentaire Pierre Corneille, Bolbec (76)" },
      { date: "26 mars 2024", title: "Bérénice", location: "Lycée Jean-Baptiste de La Salle, Rouen (76)" },
      { date: "1 février 2024", title: "Bérénice", location: "Collège Yard, Buchy (76)" },
      { date: "25 janvier 2024", title: "Bérénice", location: "Lycée Vallée du Cailly, Déville-lès-Rouen (76)" },
      { date: "12 avril 2023", title: "As You Like It", location: "Halle Ô Grains, Bayeux (14)" }
    ],
    "Saison 2022 - 2023": [
      { date: "26 mai 2023", title: "Bérénice", location: "Lycée Jean-Baptiste de La Salle, Rouen (76)" },
      { date: "25 novembre 2022", title: "Fulguré.e.s", location: "Théâtre Le Passage, Fécamp (76)" },
      { date: "23 - 24 novembre 2022", title: "Bérénice", location: "Le Rayon Vert, Saint-Valéry-en-Caux (76)" },
      { date: "10 novembre 2022", title: "Fulguré.e.s", location: "La Cité-Théâtre, Caen (14)" },
      { date: "8 novembre 2022", title: "Fulguré.e.s", location: "Le Sillon, Petit-Couronne (76)" }
    ],
    "Saison 2021 - 2022": [
      { date: "2 - 3 août 2022", title: "As You Like It", location: "Villa Montebello, Trouville (14)" },
      { date: "28 - 29 avril 2022", title: "Bérénice", location: "Espace Jean Legendre, Compiègne (60)" },
      { date: "26 avril 2022", title: "Bérénice", location: "La Cidrerie, Beuzeville (27)" },
      { date: "7 - 10 avril 2022", title: "As You Like It", location: "Studio Théâtre d’Asnières, Asnières-sur-Seine (92)" },
      { date: "28 - 31 mars 2022", title: "As You Like It", location: "Théâtre de Lisieux, Normandie (14)" },
      { date: "25 février 2022", title: "Bérénice", location: "Lycée de Sotteville-lès-Rouen (76)" },
      { date: "1 février 2022", title: "Bérénice", location: "Lycée de Neufchâtel-en-Bray (76)" },
      { date: "30 janvier 2022", title: "Bérénice", location: "Siroco, Saint-Romain-de-Colbosc (76)" },
      { date: "15 novembre 2021", title: "Bérénice", location: "Lycée Pablo Neruda, Dieppe (76)" },
      { date: "14 octobre 2021", title: "Bérénice", location: "Lycée de la Vallée du Cailly, Déville-lès-Rouen (76)" }
    ],
    "Saison 2020 - 2021": [
      { date: "26 - 28 août 2021", title: "As You Like It", location: "Festival de Villerville (14)" },
      { date: "20 juillet 2021", title: "Bérénice", location: "Festival Les Échappées Belles, Alençon (61)" },
      { date: "16 - 17 juillet 2021", title: "Bérénice", location: "Aître Saint-Maclou, Rouen (76)" },
      { date: "15 juillet 2021", title: "Bérénice", location: "Salle La Seine, Tourville-la-Rivière (76)" },
      { date: "10 juillet 2021", title: "Bérénice", location: "Centre culturel Simone Signoret, Amfreville-La-Mivoie (76)" }
    ]
  }
};
