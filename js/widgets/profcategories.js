"use strict";

/* ============================================================
   PROF CATEGORIES — regroupement des professions par archétype
   (Gang, Crime organisé, Sécurité corpo, Matrice, …)

   Sert au filtre « double niveau » du générateur : on choisit
   une ou plusieurs catégories, puis on affine les professions.
   Les libellés de profession DOIVENT correspondre exactement à
   ceux de formOptions.profession de chaque édition, car la
   génération s'appuie dessus (pools de compétences / profils).
   ============================================================ */
const ProfCategories = {
  /* ---- SR5 ---- */
  sr5: [
    {
      cat: "Bas de l'échelle",
      items: [
        "Civil ordinaire",
        "Voyou de bas étage",
        "Décérébré / Foule en colère",
        "Sans-abri des Barrens",
        "Travailleur usine / docker",
      ],
    },
    {
      cat: "Gangs",
      items: [
        "Ganger de rue",
        "Ganger vétéran",
        "Go-ganger",
        "Lieutenant de gang",
        "Ganger Halloweeners",
        "Ganger Ancients (elfe)",
        "Ganger Ork Rights Commission",
      ],
    },
    {
      cat: "Sécurité corpo",
      items: [
        "Agent de sécurité corpo (entrée)",
        "Garde corpo (patrouille)",
        "Garde corpo (VIP)",
        "Agent de sécurité Renraku",
        "Agent de sécurité Ares",
        "Agent de sécurité Aztechnology",
        "Samouraï rouge Renraku",
        "Séraphin Ares",
        "Commando Aztlan",
      ],
    },
    {
      cat: "Police & ordre",
      items: [
        "Flic des rues (Lone Star)",
        "Officier Knight Errant",
        "Détective Lone Star",
        "SWAT Knight Errant",
        "Unité anti-magie",
      ],
    },
    {
      cat: "Crime organisé",
      items: [
        "Soldat Mafia",
        "Capo Mafia",
        "Gros bras Yakuza",
        "Wakagashira Yakuza",
        "Coursier Triade",
        "Gros bras Triade",
        "Vory v Zakone",
        "Koshari (contrebandier amérindien)",
      ],
    },
    {
      cat: "Militaire & mercenaire",
      items: [
        "Soldat UCAS",
        "Soldat CAS",
        "Commando NAN",
        "Mercenaire freelance",
        "Mercenaire Ares private",
        "Pilote militaire",
        "Agent de renseignement",
      ],
    },
    {
      cat: "Professionnels spécialisés",
      items: [
        "Contrebandier",
        "Passeur de frontière",
        "Pilote de location",
        "Trafiquant d'armes",
        "Dealer de rue",
        "Chimiste clandestin",
        "Cambrioleur professionnel",
        "Assassin freelance",
        "Faussaire",
        "Espion industriel",
      ],
    },
    {
      cat: "Éveillés",
      items: [
        "Mage hermétique de rue",
        "Chaman urbain",
        "Adepte de rue",
        "Mage Aztechnology (sacrifice)",
        "Initié hermétique",
      ],
    },
    {
      cat: "Matrice & riggers",
      items: [
        "Rigger go-ganger",
        "Rigger militaire",
        "Decker freelance",
        "Technicien matriciel corpo",
        "Spécialiste contre-mesures",
      ],
    },
    {
      cat: "Corpo & contacts",
      items: ["Cadre corpo", "Agent corpo", "Négociateur corpo", "Mage salarié"],
    },
  ],

  /* ---- SR6 ---- */
  sr6: [
    {
      cat: "Bas de l'échelle",
      items: ["Civil", "Voyou de rue", "Décérébré / Foule en colère"],
    },
    {
      cat: "Gangs",
      items: [
        "Ganger de rue",
        "Ganger vétéran",
        "Go-ganger",
        "Chef de gang",
        "Ganger Halloweeners",
        "Ganger Ancients",
        "Magogang (éveillé)",
      ],
    },
    {
      cat: "Sécurité corpo",
      items: [
        "Agent de sécurité corpo",
        "Garde corpo (patrouille)",
        "Rigger de sécurité",
        "Agent de sécurité Renraku",
        "Samouraï rouge Renraku",
        "Agent de sécurité Ares",
        "Séraphin Ares",
        "Agent de sécurité Aztechnology",
        "Commando Aztlan",
        "Équipe IHR DocWagon",
      ],
    },
    {
      cat: "Police & ordre",
      items: [
        "Patrouilleur Lone Star",
        "Officier Knight Errant",
        "Détective Lone Star",
        "SWAT Lone Star",
        "Officier SWAT Knight Errant",
        "Mage combat Lone Star",
      ],
    },
    {
      cat: "Crime organisé",
      items: [
        "Soldato Mafia",
        "Collecteur Mafia",
        "Gros bras Yakuza",
        "Maître des Lames Yakuza",
        "Coursier Triade",
        "Vory v Zakone",
        "Koshari",
      ],
    },
    {
      cat: "Militaire & mercenaire",
      items: [
        "Soldat UCAS",
        "Commando NAN",
        "Wildcats Sioux",
        "Mercenaire freelance",
        "Mercenaire Ares",
        "Ghost de Tír",
        "Navy SEAL",
        "Force d'Intervention Spéciale Marines",
      ],
    },
    {
      cat: "Professionnels spécialisés",
      items: [
        "Contrebandier",
        "Assassin freelance",
        "Espion industriel",
        "Cambrioleur professionnel",
      ],
    },
    {
      cat: "Matrice & riggers",
      items: ["Decker freelance", "Technicien de terrain"],
    },
    {
      cat: "Éveillés",
      items: ["Chaman urbain", "Adepte de rue"],
    },
    {
      cat: "Corpo & contacts",
      items: ["Cadre corpo", "Agent corpo", "Négociateur corpo (Johnson)", "Mage salarié"],
    },
  ],

  /* ---- Anarchy ---- */
  anarchy: [
    {
      cat: "Gangs",
      items: [
        "Ganger",
        "Ganger d'élite",
        "Ganger éveillé",
        "Ganger adepte",
        "Ganger chaman",
        "Ganger decker",
        "Go-ganger",
      ],
    },
    {
      cat: "Sécurité corpo",
      items: [
        "Agent de sécurité",
        "Officier de sécurité",
        "Officier d'élite",
        "Mage de sécurité",
        "Mage d'élite",
        "Chaman de sécurité",
        "Chaman d'élite",
        "Adepte de sécurité",
        "Adepte d'élite",
        "Decker de sécurité",
        "Decker d'élite",
        "Rigger de sécurité",
        "Rigger d'élite",
        "Médecin de combat",
      ],
    },
    {
      cat: "Militaire",
      items: ["Militaire", "Commando militaire"],
    },
    {
      cat: "Corpo & contacts",
      items: [
        "Johnson",
        "Employé corporatiste",
        "Cadre corporatiste",
        "Enquêteur",
        "Coyote",
      ],
    },
    {
      cat: "Bas de l'échelle",
      items: ["Civil", "Voyou de rue", "Technicien de rue"],
    },
    {
      cat: "Crime organisé",
      items: ["Soldat de syndicat", "Lieutenant de syndicat (capo)"],
    },
    {
      cat: "Police & ordre",
      items: ["Flic des rues", "Officier de police", "Détective"],
    },
    {
      cat: "Professionnels spécialisés",
      items: ["Ombre"],
    },
  ],

  /**
   * Renvoie la liste des catégories pour une édition, en filtrant
   * pour ne garder que les professions réellement présentes dans
   * formOptions (sécurité si une liste évolue).
   * @param {string} editionId
   * @param {string[]} validProfessions - formOptions.profession sans "Aléatoire"
   */
  forEdition(editionId, validProfessions) {
    const groups = this[editionId] || [];
    const valid = new Set(validProfessions);
    const seen = new Set();
    const result = [];
    for (const g of groups) {
      const items = g.items.filter((i) => valid.has(i));
      items.forEach((i) => seen.add(i));
      if (items.length) result.push({ cat: g.cat, items });
    }
    // Professions non classées → catégorie « Autres »
    const orphans = validProfessions.filter((p) => !seen.has(p));
    if (orphans.length) result.push({ cat: "Autres", items: orphans });
    return result;
  },
};
