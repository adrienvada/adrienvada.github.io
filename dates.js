/**
 * FICHIER DE CONFIGURATION DES DATES DE SPECTACLE
 *
 * DEUX PARTIES, DEUX RÈGLES.
 *
 *  · Les DATES À VENIR (`upcoming`) vivent désormais dans la table
 *    Supabase `representations`, qu'on modifie depuis /admin/ — depuis
 *    un téléphone, sans commit. Le site les lit en direct (dates-live.js)
 *    et ce fichier n'en garde qu'une COPIE, entre les repères ⇊ ⇈,
 *    régénérée par :
 *
 *        node build/exporter-dates.js
 *
 *    Cette copie sert de repli si la base ne répond pas, et alimente les
 *    pages spectacle générées. Ne modifiez pas cette partie à la main :
 *    le prochain export l'écraserait.
 *
 *  · Les ARCHIVES (`archives`) et le titre de saison restent ici, à la
 *    main, comme avant. Respectez bien la syntaxe (virgules, guillemets,
 *    crochets).
 */

const SHOW_DATA = {
  // Titre de la saison en cours (pour la section des prochaines dates)
  currentSeasonTitle: "Saison 2026 - 2027",

  // -------------------------------------------------------------
  // PROCHAINES DATES (Saison en cours)
  // Options de configuration d'un spectacle / représentation :
  // - time: "19h00" (ou pour plusieurs horaires par jour sur la même ligne : time: "14h30 & 19h00" ou times: ["14h30", "19h00"])
  // - bookingUrl: "" (vide affiche "Les réservations ne sont pas encore ouvertes" sous le titre du spectacle)
  // - city: "Rouen" -> OBLIGATOIRE. Nom de la ville seule, sans le département.
  //   `location` reste le lieu exact affiché au public ("Le Forum, Falaise (14)"),
  //   tandis que `city` alimente les filtres de recherche. Sans ce champ, la
  //   représentation n'apparaîtra dans aucun filtre de lieu.
  // -------------------------------------------------------------
  upcoming: [
    // ⇊ GÉNÉRÉ — build/exporter-dates.js recopie ici la table Supabase. Ne pas éditer à la main. ⇊
    // Dernier export : 21 septembre 2026 à 17:42 — 24 soirée(s), 14 entrée(s).
    // ── 22 - 23 oct. 2026 : À la barre, peine perdue ? (Rouen) [Série] ──
    {
      type: "series",
      id: "panel-a-la-barre-peine-perdue-rouen-2026-10-22",
      dateLabel: "22 - 23 oct. 2026",
      title: "À la barre, peine perdue ?",
      location: "Tribunal judiciaire de Rouen (76)", city: "Rouen",
      shows: [
        {
          dateLabel: "22 oct. 2026",
          time: "19h00",
          bookingUrl: "https://www.cdn-normandierouen.fr/saison-26-27/la-barre-peine-perdue",
          isSchool: false,
          icsDate: "2026-10-22"
        },
        {
          dateLabel: "23 oct. 2026",
          time: "19h00",
          bookingUrl: "https://www.cdn-normandierouen.fr/saison-26-27/la-barre-peine-perdue",
          isSchool: false,
          icsDate: "2026-10-23"
        }
      ]
    },

    // ── 12 nov. 2026 : À la barre, peine perdue ? (Saint-Quentin) [Série] ──
    {
      type: "series",
      id: "panel-a-la-barre-peine-perdue-saint-quentin-2026-11-12",
      dateLabel: "12 nov. 2026",
      title: "À la barre, peine perdue ?",
      location: "Tribunal judiciaire de Saint-Quentin (02)", city: "Saint-Quentin",
      shows: [
        {
          dateLabel: "12 nov. 2026",
          time: "14h15",
          bookingUrl: "",
          isSchool: true,
          icsDate: "2026-11-12"
        },
        {
          dateLabel: "12 nov. 2026",
          time: "20h00",
          bookingUrl: "https://billetterie-saint-quentin.mapado.com/event/757061-a-la-barre-peine-perdue",
          isSchool: false,
          icsDate: "2026-11-12"
        }
      ]
    },

    // ── 25 nov. 2026 : À la barre, peine perdue ? (Grand-Quevilly) [Date unique] ──
    {
      type: "single",
      dateLabel: "25 nov. 2026",
      fullDate: "25 novembre 2026",
      title: "À la barre, peine perdue ?",
      location: "Hôtel de Ville de Grand-Quevilly (76)", city: "Grand-Quevilly",
      time: "20h00",
      bookingUrl: "https://mediatheque.ville-grand-quevilly.fr/cms/articleview/id/1155",
      isSchool: false,
      icsDate: "2026-11-25"
    },

    // ── 1 déc. 2026 : L’imaginaire forcé (Saint-Pierre-lès-Elbeuf) [Série] ──
    {
      type: "series",
      id: "panel-l-imaginaire-force-saint-pierre-les-elbeuf-2026-12-01",
      dateLabel: "1 déc. 2026",
      title: "L’imaginaire forcé",
      location: "Espace Culturel Philippe Torreton, Saint-Pierre-lès-Elbeuf (76)", city: "Saint-Pierre-lès-Elbeuf",
      shows: [
        {
          dateLabel: "1 déc. 2026",
          time: "14h00",
          bookingUrl: "",
          isSchool: true,
          icsDate: "2026-12-01"
        },
        {
          dateLabel: "1 déc. 2026",
          time: "19h00",
          bookingUrl: "https://www.vostickets.net/billet/FR/representation-ST_PIERRE_LES_ELBEUF-34764-0.wb?REFID=_hE3AAAAAAAAAAAAegA",
          isSchool: false,
          icsDate: "2026-12-01"
        }
      ]
    },

    // ── 18 déc. 2026 : Cléophène, d’après Rodogune (Pont-Audemer) [Série] ──
    {
      type: "series",
      id: "panel-cleophene-d-apres-rodogune-pont-audemer-2026-12-18",
      dateLabel: "18 déc. 2026",
      title: "Cléophène, d’après Rodogune",
      location: "L’Éclat, Pont-Audemer (27)", city: "Pont-Audemer",
      shows: [
        {
          dateLabel: "18 déc. 2026",
          time: "14h00",
          bookingUrl: "https://www.ville-pont-audemer.fr/agenda/cleophene-cie-crescite/cleophene-cie-crescite-2026-12-18/",
          isSchool: false,
          icsDate: "2026-12-18"
        },
        {
          dateLabel: "18 déc. 2026",
          time: "20h00",
          bookingUrl: "https://www.ville-pont-audemer.fr/agenda/cleophene-cie-crescite/cleophene-cie-crescite-2026-12-18/",
          isSchool: false,
          icsDate: "2026-12-18"
        }
      ]
    },

    // ── 26 janv. 2027 : Cléophène, d’après Rodogune (Falaise) [Date unique] ──
    {
      type: "single",
      dateLabel: "26 janv. 2027",
      fullDate: "26 janvier 2027",
      title: "Cléophène, d’après Rodogune",
      location: "Le Forum, Falaise (14)", city: "Falaise",
      time: "20h00",
      bookingUrl: "https://www.vostickets.net/billet/FR/representation-FALAISE-34843-0.wb?REFID=RBI2AAAAAAAAAAAAQQA",
      isSchool: false,
      icsDate: "2027-01-26"
    },

    // ── 29 - 30 janv. 2027 : Bérénice (Saint-Lô) [Série] ──
    {
      type: "series",
      id: "panel-berenice-saint-lo-2027-01-29",
      dateLabel: "29 - 30 janv. 2027",
      title: "Bérénice",
      location: "Théâtre de la ville de Saint-Lô (50)", city: "Saint-Lô",
      shows: [
        {
          dateLabel: "29 janv. 2027",
          time: "",
          bookingUrl: "",
          isSchool: true,
          icsDate: "2027-01-29"
        },
        {
          dateLabel: "30 janv. 2027",
          time: "18h00",
          bookingUrl: "https://www.vostickets.net/billet/FR/representation-SAINT_LO-32786-0.wb?REFID=coU2AAAAAAAAAAAAkwE",
          isSchool: false,
          icsDate: "2027-01-30"
        }
      ]
    },

    // ── 29 - 30 janv. 2027 : Cléophène, d’après Rodogune (Saint-Lô) [Série] ──
    {
      type: "series",
      id: "panel-cleophene-d-apres-rodogune-saint-lo-2027-01-29",
      dateLabel: "29 - 30 janv. 2027",
      title: "Cléophène, d’après Rodogune",
      location: "Théâtre de la ville de Saint-Lô (50)", city: "Saint-Lô",
      shows: [
        {
          dateLabel: "29 janv. 2027",
          time: "",
          bookingUrl: "",
          isSchool: true,
          icsDate: "2027-01-29"
        },
        {
          dateLabel: "30 janv. 2027",
          time: "20h30",
          bookingUrl: "https://www.vostickets.net/billet/FR/representation-SAINT_LO-32787-0.wb?REFID=coU2AAAAAAAAAAAAkwE",
          isSchool: false,
          icsDate: "2027-01-30"
        }
      ]
    },

    // ── 2 fév. 2027 : Cléophène, d’après Rodogune (Guyancourt) [Date unique] ──
    {
      type: "single",
      dateLabel: "2 fév. 2027",
      fullDate: "2 février 2027",
      title: "Cléophène, d’après Rodogune",
      location: "La Ferme de Bel Ebat, Guyancourt (78)", city: "Guyancourt",
      time: "",
      bookingUrl: "https://www.scenes2guyancourt.fr/agenda/cleophene/",
      isSchool: false,
      icsDate: "2027-02-02"
    },

    // ── 12 mars 2027 : À la barre, peine perdue ? (Barentin) [Date unique] ──
    {
      type: "single",
      dateLabel: "12 mars 2027",
      fullDate: "12 mars 2027",
      title: "À la barre, peine perdue ?",
      location: "Salle du Conseil Communautaire Caux Austreberthe, Hôtel de Ville de Barentin (76)", city: "Barentin",
      time: "",
      bookingUrl: "",
      isSchool: false,
      icsDate: "2027-03-12"
    },

    // ── 8 avr. 2027 : L’imaginaire forcé (Déville-lès-Rouen) [Date unique] ──
    {
      type: "single",
      dateLabel: "8 avr. 2027",
      fullDate: "8 avril 2027",
      title: "L’imaginaire forcé",
      location: "Collège Sainte-Marie, Déville-lès-Rouen (76)", city: "Déville-lès-Rouen",
      time: "",
      bookingUrl: "",
      isSchool: true,
      icsDate: "2027-04-08"
    },

    // ── 12 avr. 2027 : L’imaginaire forcé (Darnétal) [Date unique] ──
    {
      type: "single",
      dateLabel: "12 avr. 2027",
      fullDate: "12 avril 2027",
      title: "L’imaginaire forcé",
      location: "Collège, Darnétal (76)", city: "Darnétal",
      time: "matin",
      bookingUrl: "",
      isSchool: true,
      icsDate: "2027-04-12"
    },

    // ── 15 avr. 2027 : L’imaginaire forcé (Cherbourg) [Série] ──
    {
      type: "series",
      id: "panel-l-imaginaire-force-cherbourg-2027-04-15",
      dateLabel: "15 avr. 2027",
      title: "L’imaginaire forcé",
      location: "Collège, Cherbourg (50)", city: "Cherbourg",
      shows: [
        {
          dateLabel: "15 avr. 2027",
          time: "après-midi",
          bookingUrl: "",
          isSchool: true,
          icsDate: "2027-04-15"
        },
        {
          dateLabel: "15 avr. 2027",
          time: "matin",
          bookingUrl: "",
          isSchool: true,
          icsDate: "2027-04-15"
        }
      ]
    },

    // ── 18 - 21 mai 2027 : Bérénice (Rouen) [Série] ──
    {
      type: "series",
      id: "panel-berenice-rouen-2027-05-18",
      dateLabel: "18 - 21 mai 2027",
      title: "Bérénice",
      location: "Lycée Corneille, Rouen (76)", city: "Rouen",
      shows: [
        {
          dateLabel: "18 mai 2027",
          time: "",
          bookingUrl: "",
          isSchool: true,
          icsDate: "2027-05-18"
        },
        {
          dateLabel: "19 mai 2027",
          time: "",
          bookingUrl: "",
          isSchool: true,
          icsDate: "2027-05-19"
        },
        {
          dateLabel: "20 mai 2027",
          time: "",
          bookingUrl: "",
          isSchool: true,
          icsDate: "2027-05-20"
        },
        {
          dateLabel: "21 mai 2027",
          time: "",
          bookingUrl: "",
          isSchool: false,
          icsDate: "2027-05-21"
        }
      ]
    }
    // ⇈ FIN DE LA PARTIE GÉNÉRÉE ⇈
  ],

  // -------------------------------------------------------------
  // ARCHIVES (Dates passées regroupées par saison)
  // L'ordre d'affichage des saisons suit l'ordre ci-dessous.
  // -------------------------------------------------------------
  archives: {
    "Saison 2025 - 2026": [
      { date: "13 mai 2026", title: "Cléophène, d’après Rodogune", location: "Salle Louis Jouvet, Rouen (76)", city: "Rouen" },
      { date: "26 mars 2026", title: "Théâtre-forum", location: "UFR Santé, Rouen (76)", city: "Rouen" },
      { date: "3 mars 2026", title: "Cléophène, d’après Rodogune", location: "Le Rive Gauche, St-Étienne-du-Rouvray (76)", city: "Saint-Étienne-du-Rouvray" },
      { date: "15 janvier 2026", title: "Bérénice", location: "Lycée Le Corbusier, Saint-Étienne-du-Rouvray (76)", city: "Saint-Étienne-du-Rouvray" },
      { date: "18 décembre 2025", title: "Bérénice", location: "Lycée La Salle, Rouen (76)", city: "Rouen" },
      { date: "9 décembre 2025", title: "Cléophène, d’après Rodogune", location: "L’Archipel, Granville (50)", city: "Granville" },
      { date: "6 novembre 2025", title: "Bérénice", location: "Lycée Dumont d’Urville - Laplace, Caen (14)", city: "Caen" },
      { date: "4 novembre 2025", title: "Bérénice", location: "Institut Saint-Lô, Saint-Lô (50)", city: "Saint-Lô" },
      { date: "16 octobre 2025", title: "Cléophène, d’après Rodogune", location: "Théâtre Le Sillon, Petit-Couronne (76)", city: "Petit-Couronne" }
    ],
    "Saison 2024 - 2025": [
      { date: "8 - 18 juillet 2025", title: "À la barre", location: "La Manufacture / Palais de justice d’Avignon (84)", city: "Avignon" },
      { date: "25 juin 2025", title: "Audiences", location: "Festival théâtre à la cité - Quartier Saint-Sever, Rouen (76)", city: "Rouen" },
      { date: "10 juin 2025", title: "Audiences", location: "Canteleu (76)", city: "Canteleu" },
      { date: "11 mars 2025", title: "À la barre", location: "Hôtel de Ville de Rouen (76)", city: "Rouen" },
      { date: "5 mars 2025", title: "Cassandres", location: "Labo Victor Hugo, Rouen (76)", city: "Rouen" },
      { date: "8 février 2025", title: "À la barre", location: "Hôtel de Ville de Canteleu (76)", city: "Canteleu" },
      { date: "17 janvier 2025", title: "Audiences", location: "Centre André Malraux, Rouen (76)", city: "Rouen" },
      { date: "12 décembre 2024", title: "Bérénice", location: "Lycée Raymond Queneau, Yvetot (76)", city: "Yvetot" },
      { date: "6 décembre 2024", title: "Bérénice", location: "Lycée Jean-Baptiste de la Salle, Rouen (76)", city: "Rouen" },
      { date: "29 novembre 2024", title: "Cléophène, d’après Rodogune", location: "Athanor, Guérande (44)", city: "Guérande" },
      { date: "26 novembre 2024", title: "Cléophène, d’après Rodogune", location: "Théâtre Le Rayon Vert, Saint-Valéry-en-Caux (76)", city: "Saint-Valéry-en-Caux" },
      { date: "25 novembre 2024", title: "À la barre", location: "Lycée les Buyères, Sotteville-lès-Rouen (76)", city: "Sotteville-lès-Rouen" },
      { date: "22 novembre 2024", title: "À la barre", location: "Hotel de ville de Notre-Dame de Bondeville (76)", city: "Notre-Dame-de-Bondeville" },
      { date: "21 novembre 2024", title: "Bérénice", location: "Lycée Vallée du Cailly, Déville-lès-Rouen (76)", city: "Déville-lès-Rouen" },
      { date: "18 novembre 2024", title: "Audiences", location: "Collège Boieldieu, Rouen (76)", city: "Rouen" },
      { date: "2 novembre 2024", title: "Bérénice", location: "La Rotonde, Fauville-en-Caux (76)", city: "Fauville-en-Caux" },
      { date: "10 - 11 octobre 2024", title: "Cléophène, d’après Rodogune", location: "Théâtre Le Rayon Vert, Rouen (76)", city: "Rouen" }
    ],
    "Saison 2023 - 2024": [
      { date: "14 juin 2024", title: "Bérénice", location: "Centre culturel Voltaire, Déville-lès-Rouen (76)", city: "Déville-lès-Rouen" },
      { date: "1 juin 2024", title: "À la barre", location: "Historial Jeanne d’Arc, Rouen (76)", city: "Rouen" },
      { date: "25 - 26 mai 2024", title: "À la barre", location: "Palais de justice de Rouen (76)", city: "Rouen" },
      { date: "9 avril 2024", title: "L’Avenir de la planète se joue maintenant", location: "École élémentaire Pierre Corneille, Bolbec (76)", city: "Bolbec" },
      { date: "26 mars 2024", title: "Bérénice", location: "Lycée Jean-Baptiste de La Salle, Rouen (76)", city: "Rouen" },
      { date: "1 février 2024", title: "Bérénice", location: "Collège Yard, Buchy (76)", city: "Buchy" },
      { date: "25 janvier 2024", title: "Bérénice", location: "Lycée Vallée du Cailly, Déville-lès-Rouen (76)", city: "Déville-lès-Rouen" },
      { date: "12 avril 2023", title: "As You Like It", location: "Halle Ô Grains, Bayeux (14)", city: "Bayeux" }
    ],
    "Saison 2022 - 2023": [
      { date: "26 mai 2023", title: "Bérénice", location: "Lycée Jean-Baptiste de La Salle, Rouen (76)", city: "Rouen" },
      { date: "25 novembre 2022", title: "Fulguré.e.s", location: "Théâtre Le Passage, Fécamp (76)", city: "Fécamp" },
      { date: "23 - 24 novembre 2022", title: "Bérénice", location: "Le Rayon Vert, Saint-Valéry-en-Caux (76)", city: "Saint-Valéry-en-Caux" },
      { date: "10 novembre 2022", title: "Fulguré.e.s", location: "La Cité-Théâtre, Caen (14)", city: "Caen" },
      { date: "8 novembre 2022", title: "Fulguré.e.s", location: "Le Sillon, Petit-Couronne (76)", city: "Petit-Couronne" }
    ],
    "Saison 2021 - 2022": [
      { date: "2 - 3 août 2022", title: "As You Like It", location: "Villa Montebello, Trouville (14)", city: "Trouville" },
      { date: "28 - 29 avril 2022", title: "Bérénice", location: "Espace Jean Legendre, Compiègne (60)", city: "Compiègne" },
      { date: "26 avril 2022", title: "Bérénice", location: "La Cidrerie, Beuzeville (27)", city: "Beuzeville" },
      { date: "7 - 10 avril 2022", title: "As You Like It", location: "Studio Théâtre d’Asnières, Asnières-sur-Seine (92)", city: "Asnières-sur-Seine" },
      { date: "28 - 31 mars 2022", title: "As You Like It", location: "Théâtre de Lisieux, Normandie (14)", city: "Lisieux" },
      { date: "25 février 2022", title: "Bérénice", location: "Lycée de Sotteville-lès-Rouen (76)", city: "Sotteville-lès-Rouen" },
      { date: "1 février 2022", title: "Bérénice", location: "Lycée de Neufchâtel-en-Bray (76)", city: "Neufchâtel-en-Bray" },
      { date: "30 janvier 2022", title: "Bérénice", location: "Siroco, Saint-Romain-de-Colbosc (76)", city: "Saint-Romain-de-Colbosc" },
      { date: "15 novembre 2021", title: "Bérénice", location: "Lycée Pablo Neruda, Dieppe (76)", city: "Dieppe" },
      { date: "14 octobre 2021", title: "Bérénice", location: "Lycée de la Vallée du Cailly, Déville-lès-Rouen (76)", city: "Déville-lès-Rouen" }
    ],
    "Saison 2020 - 2021": [
      { date: "26 - 28 août 2021", title: "As You Like It", location: "Festival de Villerville (14)", city: "Villerville" },
      { date: "20 juillet 2021", title: "Bérénice", location: "Festival Les Échappées Belles, Alençon (61)", city: "Alençon" },
      { date: "16 - 17 juillet 2021", title: "Bérénice", location: "Aître Saint-Maclou, Rouen (76)", city: "Rouen" },
      { date: "15 juillet 2021", title: "Bérénice", location: "Salle La Seine, Tourville-la-Rivière (76)", city: "Tourville-la-Rivière" },
      { date: "10 juillet 2021", title: "Bérénice", location: "Centre culturel Simone Signoret, Amfreville-La-Mivoie (76)", city: "Amfreville-la-Mivoie" }
    ]
  }
};
