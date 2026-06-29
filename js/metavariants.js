"use strict";

/* ============================================================
   MÉTAVARIANTES SR5 — Run Faster (BBE, fr), p.76-78
   Base de données commune. Trois familles :
     - metavariants : 17 métavariantes jouables (souches elfe/nain/ork/troll/humain)
     - metaconsciences : 4 métaconsciences (Centaure, Naga, Pixie, Sasquatch)
     - zoocanthropes : 12 formes anthropes (porteurs du virus zoocanthrope)

   Chaque entrée porte :
     - souche : métatype parent (pour la pondération et les fallbacks moteur)
     - ranges : { CON, AGI, REA, FOR, VOL, LOG, INT, CHA } — bornes officielles
                (REA = RÉA en SR6 ; le moteur fait la correspondance)
     - traits : liste de traits raciaux (texte affiché sur la fiche)
     - bassins : origines culturelles cohérentes (peuplement « crédible »)
     - mag : pour métaconsciences/zoocanthropes (êtres à nature duale)
     - init : dés d'initiative animale, le cas échéant (zoocanthropes)

   Les ranges remplacent ceux du métatype parent ; les traits sont injectés
   sur la fiche. Le moteur d'édition appelle Metavariants.resolve(meta).
   ============================================================ */

const Metavariants = {
  /* ---- Métavariantes jouables (p.76) ---- */
  metavariants: {
    // — Souche TROLL —
    Cyclope: {
      souche: "Troll",
      ranges: {
        CON: [5, 10],
        AGI: [1, 5],
        REA: [1, 6],
        FOR: [6, 11],
        VOL: [1, 6],
        LOG: [1, 4],
        INT: [1, 5],
        CHA: [1, 4],
      },
      traits: [
        "Allonge +1",
        "Œil cyclopéen",
        "Vision thermographique",
        "+100 % au coût du style de vie",
      ],
      bassins: ["euro", "arabe"],
    },
    Fomori: {
      souche: "Troll",
      ranges: {
        CON: [4, 9],
        AGI: [1, 5],
        REA: [1, 6],
        FOR: [5, 10],
        VOL: [1, 5],
        LOG: [1, 4],
        INT: [1, 4],
        CHA: [1, 5],
      },
      traits: [
        "Allonge +1",
        "Amortisseur magique (1)",
        "Vision thermographique",
        "+100 % au coût du style de vie",
      ],
      bassins: ["euro"],
    },
    Géant: {
      souche: "Troll",
      ranges: {
        CON: [5, 10],
        AGI: [1, 5],
        REA: [1, 5],
        FOR: [5, 10],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [1, 5],
        CHA: [1, 5],
      },
      traits: [
        "Allonge +1",
        "Altération dermique (écorce)",
        "Vision thermographique",
        "+100 % au coût du style de vie",
      ],
      bassins: ["euro", "russe"],
    },
    Minotaure: {
      souche: "Troll",
      ranges: {
        CON: [6, 11],
        AGI: [1, 5],
        REA: [1, 6],
        FOR: [5, 10],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [1, 4],
      },
      traits: [
        "Allonge +1",
        "Cornes perforantes",
        "Vision thermographique",
        "+100 % au coût du style de vie",
      ],
      bassins: ["euro", "arabe"],
    },

    // — Souche ORK —
    Hobgobelin: {
      souche: "Ork",
      ranges: {
        CON: [3, 8],
        AGI: [1, 6],
        REA: [1, 6],
        FOR: [2, 7],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [2, 7],
        CHA: [1, 5],
      },
      traits: [
        "Crocs",
        "Ouïe fine",
        "Problèmes de maîtrise de soi (Vindicatif)",
        "Vision nocturne",
      ],
      bassins: ["arabe", "asiacentral"],
    },
    Ogre: {
      souche: "Ork",
      ranges: {
        CON: [4, 9],
        AGI: [1, 6],
        REA: [1, 5],
        FOR: [3, 8],
        VOL: [2, 7],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [1, 4],
      },
      traits: ["Estomac d'ogre", "Vision nocturne"],
      bassins: ["euro", "russe"],
    },
    Oni: {
      souche: "Ork",
      ranges: {
        CON: [3, 8],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [2, 7],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [2, 7],
      },
      traits: ["Pigmentation extraordinaire", "Vision nocturne"],
      bassins: ["japonais"],
    },
    Satyre: {
      souche: "Ork",
      ranges: {
        CON: [2, 7],
        AGI: [1, 6],
        REA: [2, 7],
        FOR: [2, 7],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 5],
      },
      traits: ["Jambes de satyre", "Vision nocturne"],
      bassins: ["euro", "latino"],
    },

    // — Souche NAIN —
    Gnome: {
      souche: "Nain",
      ranges: {
        CON: [1, 4],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 4],
        VOL: [2, 7],
        LOG: [2, 7],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        "Amortisseur magique (2)",
        "Néoténie",
        "Vision thermographique",
        "+20 % au coût du style de vie",
      ],
      bassins: ["euro"],
    },
    Hanuman: {
      souche: "Nain",
      ranges: {
        CON: [1, 6],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [2, 7],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [1, 5],
      },
      traits: [
        "Pattes de singes",
        "Pilosité étrange (corps)",
        "Queue fonctionnelle (préhensile)",
        "Vision thermographique",
        "+20 % au coût du style de vie",
      ],
      bassins: ["asiacentral"],
    },
    Koborokuru: {
      souche: "Nain",
      ranges: {
        CON: [2, 7],
        AGI: [1, 6],
        REA: [1, 6],
        FOR: [2, 7],
        VOL: [2, 7],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        "Célérité",
        "Pilosité étrange",
        "Résistance aux pathogènes / toxines",
        "Vision thermographique",
        "+20 % au coût du style de vie",
      ],
      bassins: ["japonais"],
    },
    Menehune: {
      souche: "Nain",
      ranges: {
        CON: [2, 7],
        AGI: [2, 7],
        REA: [1, 5],
        FOR: [2, 7],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        "Doigts palmés",
        "Résistance aux pathogènes",
        "Vision sous-marine",
        "Vision thermographique",
        "+20 % au coût du style de vie",
      ],
      bassins: ["polynesien"],
    },

    // — Souche ELFE —
    Dryade: {
      souche: "Elfe",
      ranges: {
        CON: [1, 6],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 5],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [3, 8],
      },
      traits: ["Éclat", "Symbiose", "Vision nocturne"],
      bassins: ["euro", "latino"],
    },
    Nocturna: {
      souche: "Elfe",
      ranges: {
        CON: [1, 5],
        AGI: [3, 8],
        REA: [1, 6],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [2, 7],
      },
      traits: [
        "Allergie (Soleil, légère)",
        "Nocturne",
        "Ouïe fine",
        "Pilosité étrange (fourrure colorée)",
        "Vision nocturne",
      ],
      bassins: ["euro", "latino"],
    },
    Wakyambi: {
      souche: "Elfe",
      ranges: {
        CON: [1, 6],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [1, 6],
      },
      traits: ["Célérité", "Membres allongés", "Vision nocturne"],
      bassins: ["africain"],
    },
    "Xapiri thëpë": {
      souche: "Elfe",
      ranges: {
        CON: [1, 6],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [2, 7],
      },
      traits: [
        "Allergie (Polluants, légère)",
        "Photométabolisme",
        "Vision nocturne",
      ],
      bassins: ["latino", "amerindien"],
    },

    // — Souche HUMAIN —
    Nartaki: {
      souche: "Humain",
      ranges: {
        CON: [1, 6],
        AGI: [1, 6],
        REA: [1, 6],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: ["Bras de Shiva", "Pigmentation extraordinaire"],
      bassins: ["arabe", "asiacentral"],
    },
  },

  /* ---- Métaconsciences (p.77) — êtres à nature duale, MAG 1 ---- */
  metaconsciences: {
    Centaure: {
      souche: "Humain",
      ranges: {
        CON: [3, 8],
        AGI: [1, 6],
        REA: [1, 6],
        FOR: [3, 8],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 5],
        CHA: [1, 5],
      },
      traits: [
        "Arme naturelle (Coup de pied : VD (FOR+2)P, PA +1, Allonge 1)",
        "Déplacement (×1/×4/+4)",
        "Recherche",
        "Sens magique",
        "Vision nocturne",
        "Vision thermographique",
        "+150 % au coût de style de vie",
      ],
      bassins: ["euro", "asiacentral"],
      mag: 1,
    },
    Naga: {
      souche: "Humain",
      ranges: {
        CON: [3, 8],
        AGI: [1, 4],
        REA: [2, 7],
        FOR: [4, 9],
        VOL: [2, 7],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [2, 7],
      },
      traits: [
        "Animal à sang froid",
        "Arme naturelle (Crocs : VD (FOR+1)P, PA -2, Allonge -1)",
        "Armure 8",
        "Déplacement (×1/×4/+1 ; nage ×2/×4/+2)",
        "Garde",
        "Nature duale",
        "Venin",
        "+150 % au coût de style de vie",
        "Pas de bras ni jambes",
      ],
      bassins: ["arabe", "africain"],
      mag: 1,
    },
    Pixie: {
      souche: "Elfe",
      ranges: {
        CON: [1, 2],
        AGI: [3, 8],
        REA: [3, 8],
        FOR: [1, 2],
        VOL: [3, 8],
        LOG: [2, 7],
        INT: [2, 7],
        CHA: [3, 8],
      },
      traits: [
        "Déplacement (×1/×2/+1 ; vol ×2/×6/+2)",
        "Disparition (mort)",
        "Dissimulation (sur soi)",
        "Illettré",
        "Perception astrale",
        "+100 % au coût de style de vie",
      ],
      bassins: ["euro", "generique"],
      mag: 1,
    },
    Sasquatch: {
      souche: "Troll",
      ranges: {
        CON: [6, 11],
        AGI: [1, 6],
        REA: [1, 6],
        FOR: [5, 10],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        "Arme naturelle (Griffes : VD (FOR+1)P, PA —, Allonge +1)",
        "Déplacement (×2/×4/+2)",
        "Illettré",
        "Imitation",
        "Nature duale",
        "+100 % au coût de style de vie",
      ],
      bassins: ["amerindien", "generique"],
      mag: 1,
    },
  },

  /* ---- Zoocanthropes (p.77) — porteurs anthropes du virus ---- */
  /* Traits communs : Allergie (Grave, argent), Nature duale, Régénération,
     Transformation (Forme métahumaine), Vulnérabilité (Argent) */
  zoocanthropes: {
    Bovin: {
      souche: "Humain",
      ranges: {
        CON: [3, 8],
        AGI: [1, 4],
        REA: [1, 4],
        FOR: [4, 9],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: ["Cornes perforantes", "Déplacement (×1/×4/+1)", "Illettré"],
      mag: 1,
      init: "1D6",
    },
    Canin: {
      souche: "Humain",
      ranges: {
        CON: [1, 5],
        AGI: [1, 6],
        REA: [2, 7],
        FOR: [1, 5],
        VOL: [2, 7],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [2, 7],
      },
      traits: [
        "Arme naturelle (Crocs : VD (FOR+1)P, PA -1)",
        "Déplacement (×2/×8/+4)",
        "Organe voméronasal",
        "Spectre auditif élargi (Ultrasons)",
        "Vision nocturne",
      ],
      mag: 1,
      init: "1D6",
    },
    Équin: {
      souche: "Humain",
      ranges: {
        CON: [4, 9],
        AGI: [1, 4],
        REA: [1, 6],
        FOR: [5, 10],
        VOL: [1, 6],
        LOG: [1, 6],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: ["Déplacement (×3/×10/+6)", "Illettré", "Ouïe fine"],
      mag: 1,
      init: "1D6",
    },
    Falcin: {
      souche: "Humain",
      ranges: {
        CON: [1, 4],
        AGI: [2, 7],
        REA: [3, 8],
        FOR: [1, 4],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [2, 7],
      },
      traits: [
        "Armes naturelles (Crocs : VD (FOR+2)P, PA -1, Allonge -1 ; Serres : VD (FOR)P)",
        "Déplacement (×1/×2/+0,5 ; vol ×2/×6/+2)",
        "Illettré",
        "Œil de lynx",
      ],
      mag: 1,
      init: "2D6",
    },
    Léonin: {
      souche: "Humain",
      ranges: {
        CON: [3, 8],
        AGI: [1, 6],
        REA: [2, 7],
        FOR: [4, 9],
        VOL: [1, 5],
        LOG: [1, 4],
        INT: [2, 7],
        CHA: [2, 7],
      },
      traits: [
        "Armes naturelles (Crocs : VD (FOR+1)P, PA -1 ; Griffes : VD (FOR+1)P, PA -1, Allonge +1)",
        "Déplacement (×2/×6/+4)",
        "Illettré",
        "Sens de l'équilibre",
        "Spectre auditif élargi (Ultrasons)",
        "Vision nocturne",
      ],
      mag: 1,
      init: "2D6",
    },
    Lupin: {
      souche: "Humain",
      ranges: {
        CON: [1, 6],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [2, 7],
      },
      traits: [
        "Arme naturelle (Crocs : VD (FOR+1)P, PA -1)",
        "Déplacement (×2/×6/+4)",
        "Illettré",
        "Organe voméronasal",
        "Spectre auditif élargi (Ultrasons)",
        "Vision nocturne",
      ],
      mag: 1,
      init: "2D6",
    },
    Panthérin: {
      souche: "Humain",
      ranges: {
        CON: [2, 7],
        AGI: [2, 7],
        REA: [2, 7],
        FOR: [1, 6],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [3, 8],
        CHA: [3, 8],
      },
      traits: [
        "Armes naturelles (Crocs : VD (FOR+2)P, PA -3 ; Griffes : VD (FOR+1)P, PA —)",
        "Déplacement (×2/×6/+4)",
        "Illettré",
        "Sens de l'équilibre",
        "Spectre auditif élargi (Ultrasons)",
        "Vision nocturne",
      ],
      mag: 1,
      init: "2D6",
    },
    Tigrin: {
      souche: "Humain",
      ranges: {
        CON: [3, 8],
        AGI: [2, 7],
        REA: [2, 7],
        FOR: [3, 8],
        VOL: [1, 5],
        LOG: [1, 4],
        INT: [3, 8],
        CHA: [2, 7],
      },
      traits: [
        "Armes naturelles (Crocs : VD (FOR+2)P, PA -2 ; Griffes : VD (FOR+1)P, PA -1, Allonge +1)",
        "Déplacement (×2/×6/+4)",
        "Illettré",
        "Sens de l'équilibre",
        "Spectre auditif élargi (Ultrasons)",
        "Vision nocturne",
      ],
      mag: 1,
      init: "2D6",
    },
    Ursin: {
      souche: "Humain",
      ranges: {
        CON: [6, 11],
        AGI: [1, 5],
        REA: [1, 5],
        FOR: [7, 12],
        VOL: [1, 5],
        LOG: [1, 5],
        INT: [1, 6],
        CHA: [1, 6],
      },
      traits: [
        "Armes naturelles (Crocs : VD (FOR+2)P, PA -2 ; Griffes : VD (FOR+3)P, PA -1, Allonge +1)",
        "Déplacement (×1/×3/+2)",
        "Illettré",
        "Organe voméronasal",
        "Ouïe fine",
        "Spectre auditif élargi (Ultrasons)",
        "Vision nocturne",
      ],
      mag: 1,
      init: "1D6",
    },
    Vulpin: {
      souche: "Humain",
      ranges: {
        CON: [1, 4],
        AGI: [2, 7],
        REA: [1, 6],
        FOR: [1, 4],
        VOL: [1, 6],
        LOG: [1, 5],
        INT: [2, 7],
        CHA: [2, 7],
      },
      traits: [
        "Arme naturelle (Crocs : VD (FOR+1)P, PA —)",
        "Déplacement (×1/×3/+2)",
        "Illettré",
        "Organe voméronasal",
        "Ouïe fine",
        "Spectre auditif élargi (Ultrasons)",
        "Vision nocturne",
      ],
      mag: 1,
      init: "2D6",
    },
  },

  /* Traits communs à tous les zoocanthropes */
  zooTraitsCommuns: [
    "Allergie (Grave, argent)",
    "Nature duale",
    "Régénération",
    "Transformation (forme métahumaine)",
    "Vulnérabilité (Argent)",
  ],

  /* ============================================================
     MÉTAVARIANTES SR6 — Le Compagnon du Sixième Monde (BBE, fr), p.196-197
     Format SR6 : clé d'attribut RÉA (accentuée) + attribut spécial ATO.
     Ranges officiels (bornes 1–N). Traits innés propres à la 6e édition.
     Ensemble plus large que SR5 : ajoute Dalakitnon, Valkyrie, Duende, Triton.
     ============================================================ */
  sr6: {
    metavariants: {
      // — Souche ELFE —
      Dalakitnon: {
        souche: "Elfe",
        ranges: {
          CON: [1, 6],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 6],
          VOL: [1, 6],
          LOG: [1, 8],
          INT: [1, 7],
          CHA: [1, 8],
        },
        traits: ["Allergie (épices, Moyenne)", "Vision nocturne"],
        bassins: ["asiacentral", "latino"],
      },
      Dryade: {
        souche: "Elfe",
        ranges: {
          CON: [1, 6],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 5],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 8],
        },
        traits: ["Éclat", "Symbiose", "Vision nocturne"],
        bassins: ["euro", "latino"],
      },
      Nocturna: {
        souche: "Elfe",
        ranges: {
          CON: [1, 5],
          AGI: [1, 8],
          RÉA: [1, 6],
          FOR: [1, 6],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: [
          "Allergie (lumière du soleil, moyenne)",
          "Nocturne",
          "Ouïe fine",
          "Pilosité étrange (pelage coloré)",
          "Vision nocturne",
        ],
        bassins: ["euro", "latino"],
      },
      Wakyambi: {
        souche: "Elfe",
        ranges: {
          CON: [1, 6],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 6],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: ["Célérité", "Membres allongés", "Vision nocturne"],
        bassins: ["africain"],
      },
      "Xapiri thëpë": {
        souche: "Elfe",
        ranges: {
          CON: [1, 6],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 6],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: [
          "Allergie (polluants, moyenne)",
          "Bioluminescence (spectre UV)",
          "Photométabolisme",
          "Vision nocturne",
        ],
        bassins: ["latino", "amerindien"],
      },

      // — Souche HUMAIN —
      Nartaki: {
        souche: "Humain",
        ranges: {
          CON: [1, 8],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 8],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: ["Bras de Shiva (1 ou 2)", "Pigmentation extraordinaire"],
        bassins: ["arabe", "asiacentral"],
      },
      Valkyrie: {
        souche: "Humain",
        ranges: {
          CON: [1, 7],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: ["Ailes fonctionnelles (Type 2)"],
        bassins: ["euro", "russe"],
      },

      // — Souche NAIN —
      Duende: {
        souche: "Nain",
        ranges: {
          CON: [1, 7],
          AGI: [1, 6],
          RÉA: [1, 8],
          FOR: [1, 6],
          VOL: [1, 7],
          LOG: [1, 6],
          INT: [1, 7],
          CHA: [1, 6],
        },
        traits: [
          "Allergie (lumière du soleil, extrême)",
          "Pilosité étrange",
          "Résistance aux toxines",
          "Vision nocturne",
          "Vision thermographique",
        ],
        bassins: ["latino", "euro"],
      },
      Gnome: {
        souche: "Nain",
        ranges: {
          CON: [1, 4],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 4],
          VOL: [1, 7],
          LOG: [1, 7],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          "Néoténie",
          "Résistance à la magie",
          "Résistance aux toxines",
          "Vision thermographique",
        ],
        bassins: ["euro"],
      },
      Hanuman: {
        souche: "Nain",
        ranges: {
          CON: [1, 6],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 7],
          CHA: [1, 6],
        },
        traits: [
          "Pattes de singe",
          "Pilosité étrange (Corps)",
          "Queue préhensile",
          "Résistance aux toxines",
        ],
        bassins: ["asiacentral"],
      },
      Koborokuru: {
        souche: "Nain",
        ranges: {
          CON: [1, 7],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 7],
          VOL: [1, 7],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          "Célérité",
          "Pilosité étrange",
          "Résistance aux toxines",
          "Vision thermographique",
        ],
        bassins: ["japonais"],
      },
      Menehune: {
        souche: "Nain",
        ranges: {
          CON: [1, 7],
          AGI: [1, 7],
          RÉA: [1, 5],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          "Doigts palmés",
          "Résistance aux toxines",
          "Vision sous-marine",
          "Vision thermographique",
        ],
        bassins: ["polynesien"],
      },

      // — Souche ORK —
      Hobgobelin: {
        souche: "Ork",
        ranges: {
          CON: [1, 6],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: ["Crocs", "Regard dément", "Vision nocturne"],
        bassins: ["arabe", "asiacentral"],
      },
      Ogre: {
        souche: "Ork",
        ranges: {
          CON: [1, 9],
          AGI: [1, 6],
          RÉA: [1, 5],
          FOR: [1, 8],
          VOL: [1, 7],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: ["Boyaux d'acier", "Vision nocturne"],
        bassins: ["euro", "russe"],
      },
      Oni: {
        souche: "Ork",
        ranges: {
          CON: [1, 8],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: ["Pigmentation extraordinaire", "Vision nocturne"],
        bassins: ["japonais"],
      },
      Satyre: {
        souche: "Ork",
        ranges: {
          CON: [1, 7],
          AGI: [1, 6],
          RÉA: [1, 7],
          FOR: [1, 7],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: ["Jambes de satyre", "Vision nocturne"],
        bassins: ["euro", "latino"],
      },

      // — Souche TROLL —
      Cyclope: {
        souche: "Troll",
        ranges: {
          CON: [1, 9],
          AGI: [1, 5],
          RÉA: [1, 6],
          FOR: [1, 10],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 5],
        },
        traits: ["Œil cyclopéen", "Robuste 2", "Vision thermographique"],
        bassins: ["euro", "arabe"],
      },
      Fomori: {
        souche: "Troll",
        ranges: {
          CON: [1, 9],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 8],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: [
          "Résistance à la magie",
          "Robuste 2",
          "Vision thermographique",
        ],
        bassins: ["euro"],
      },
      Géant: {
        souche: "Troll",
        ranges: {
          CON: [1, 9],
          AGI: [1, 5],
          RÉA: [1, 6],
          FOR: [1, 10],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 5],
        },
        traits: ["Écorce", "Robuste 2", "Vision thermographique"],
        bassins: ["euro", "russe"],
      },
      Minotaure: {
        souche: "Troll",
        ranges: {
          CON: [1, 10],
          AGI: [1, 5],
          RÉA: [1, 6],
          FOR: [1, 9],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 5],
        },
        traits: ["Cornes perforantes", "Robuste 2", "Vision thermographique"],
        bassins: ["euro", "arabe"],
      },
    },

    metaconsciences: {
      Centaure: {
        souche: "Humain",
        ranges: {
          CON: [1, 8],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 9],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          "Arme naturelle (Coup de pied : VD 3E, 7+FOR)",
          "Déplacement : 10/20/+4",
          "Manaception",
          "Recherche",
          "Vision nocturne",
          "Vision thermographique",
        ],
        bassins: ["euro", "asiacentral"],
        mag: 1,
      },
      Naga: {
        souche: "Humain",
        ranges: {
          CON: [1, 8],
          AGI: [1, 7],
          RÉA: [1, 6],
          FOR: [1, 9],
          VOL: [1, 7],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 7],
        },
        traits: [
          "Animal à sang froid",
          "Arme naturelle (Morsure : VD 3P, 8+FOR)",
          "Armure 4",
          "Déplacement : 5/15/+1 (à terre), 3/12/+2 (nage)",
          "Garde",
          "Nature duale",
          "Robuste 2",
          "Venin",
        ],
        bassins: ["arabe", "africain"],
        mag: 1,
      },
      Pixie: {
        souche: "Elfe",
        ranges: {
          CON: [1, 3],
          AGI: [1, 8],
          RÉA: [1, 8],
          FOR: [1, 2],
          VOL: [1, 8],
          LOG: [1, 7],
          INT: [1, 7],
          CHA: [1, 8],
        },
        traits: [
          "Allergie (fer, moyenne)",
          "Déplacement : 2/5/+1 (marche), 10/40/+2 (vol)",
          "Disparition",
          "Dissimulation (soi)",
          "Perception astrale",
        ],
        bassins: ["euro", "generique"],
        mag: 1,
      },
      Sasquatch: {
        souche: "Troll",
        ranges: {
          CON: [1, 10],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 10],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          "Arme naturelle (Griffes : VD 3P, 7+FOR)",
          "Déplacement : 10/15/+1",
          "Imitation",
          "Nature duale",
        ],
        bassins: ["amerindien", "generique"],
        mag: 1,
      },
      Triton: {
        souche: "Humain",
        ranges: {
          CON: [1, 9],
          AGI: [1, 6],
          RÉA: [1, 6],
          FOR: [1, 9],
          VOL: [1, 6],
          LOG: [1, 6],
          INT: [1, 6],
          CHA: [1, 6],
        },
        traits: [
          "Biosonar",
          "Déplacement : 1/3/+0,5 (à terre), 10/25/+2 (nage)",
          "Nature duale",
          "Robuste 2",
          "Vision nocturne",
          "Vision sous-marine",
        ],
        bassins: ["polynesien", "africain"],
        mag: 1,
      },
    },

    zoocanthropes: {},
  },

  /* ============================================================
     API — sélection d'édition active
     SR5 et SR6 appellent Metavariants.use(edition) avant resolve().
     Par défaut : SR5 (rétrocompatibilité totale).
     ============================================================ */

  _edition: "sr5",

  /** Sélectionne le jeu de données actif ("sr5" | "sr6") */
  use(edition) {
    if (edition !== this._edition) {
      this._edition = edition === "sr6" ? "sr6" : "sr5";
      this._index = null; // invalider l'index
    }
    return this;
  },

  /** Renvoie le jeu de métavariantes actif */
  _data() {
    return this._edition === "sr6" ? this.sr6.metavariants : this.metavariants;
  },
  _dataMC() {
    return this._edition === "sr6"
      ? this.sr6.metaconsciences
      : this.metaconsciences;
  },
  _dataZoo() {
    return this._edition === "sr6"
      ? this.sr6.zoocanthropes
      : this.zoocanthropes;
  },

  /** Index plat nom→entrée pour l'édition active */
  _index: null,
  _indexEdition: null,
  _buildIndex() {
    if (this._index && this._indexEdition === this._edition) return this._index;
    const idx = {};
    for (const [name, d] of Object.entries(this._data()))
      idx[name] = { ...d, name, famille: "metavariant" };
    for (const [name, d] of Object.entries(this._dataMC()))
      idx[name] = { ...d, name, famille: "metaconscience" };
    for (const [name, d] of Object.entries(this._dataZoo())) {
      idx[name] = {
        ...d,
        name,
        famille: "zoocanthrope",
        traits: [...d.traits, ...this.zooTraitsCommuns],
      };
    }
    this._index = idx;
    this._indexEdition = this._edition;
    return idx;
  },

  /** true si `meta` est une métavariante/conscience/zoo dans l'édition active */
  is(meta) {
    return !!this._buildIndex()[meta];
  },

  /**
   * Résout une valeur de métatype dans l'édition active.
   * null si métatype de base. Sinon { name, souche, ranges, traits[], ... }
   */
  resolve(meta) {
    return this._buildIndex()[meta] || null;
  },

  /** Souche (métatype parent) d'une valeur quelconque */
  souche(meta) {
    const r = this.resolve(meta);
    return r ? r.souche : meta;
  },

  /** Toutes les entrées d'une souche donnée, par famille (édition active) */
  bySouche(souche, famille = "metavariant") {
    const src =
      famille === "metaconscience"
        ? this._dataMC()
        : famille === "zoocanthrope"
          ? this._dataZoo()
          : this._data();
    return Object.keys(src).filter((n) => src[n].souche === souche);
  },

  /** Structure pour construire le <select> hiérarchique du formulaire */
  groupedOptions() {
    const souches = ["Humain", "Elfe", "Nain", "Ork", "Troll"];
    return souches
      .map((s) => ({
        souche: s,
        metavariants: this.bySouche(s, "metavariant"),
      }))
      .filter((g) => g.metavariants.length > 0 || true);
  },

  /** Toutes les métaconsciences de l'édition active (liste plate) */
  allMetaconsciences() {
    return Object.keys(this._dataMC());
  },

  /** Tous les zoocanthropes de l'édition active (liste plate) */
  allZoocanthropes() {
    return Object.keys(this._dataZoo());
  },

  /* ============================================================
     PONDÉRATION DÉMOGRAPHIQUE — tirage « Aléatoire » réaliste
     Source : Run Faster, « Plus qu'une couleur de peau » (population
     mondiale 2076) — données les plus récentes disponibles.
       Humains 39 %, Orks 22 %, Elfes 15 %, Nains 14 %, Trolls 5 %.
     (Les 5 % « Autres » regroupent métavariantes + consciences, gérés
      séparément ci-dessous comme sous-population de chaque souche.)
     ============================================================ */
  souchePoids: { Humain: 39, Ork: 22, Elfe: 15, Nain: 14, Troll: 5 },

  /* Probabilité, une fois la souche tirée, qu'il s'agisse d'une
     métavariante plutôt que du métatype de base. Les métaconsciences
     (Pixie, Naga, Sasquatch…) sont quasi introuvables au hasard :
     population mondiale de l'ordre de 50 000–200 000 individus. */
  P_METACONSCIENCE: 0.004,

  /* Ajustement par souche : certaines souches ont plusieurs métavariantes
     répandues, d'autres une seule et marginale. Humain n'a qu'une
     métavariante exotique (Nartaki / Valkyrie) qui ne doit pas capter
     toute la part « variante » de la population la plus nombreuse. */
  _pMetavarianteSouche: {
    Humain: 0.012,
    Elfe: 0.06,
    Nain: 0.08,
    Ork: 0.09,
    Troll: 0.09,
  },

  _weightedSouche() {
    const entries = Object.entries(this.souchePoids);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [souche, w] of entries) {
      r -= w;
      if (r <= 0) return souche;
    }
    return "Humain";
  },

  /**
   * Tirage aléatoire pondéré d'un métatype pour l'édition active.
   * Renvoie soit un métatype de base, soit (rarement) une métavariante
   * de la souche tirée, soit (très rarement) une métaconscience.
   * Respecte la démographie canonique du Sixième Monde.
   */
  randomMeta() {
    // Métaconscience : extrêmement rare, indépendante de la souche
    const mc = this.allMetaconsciences();
    if (mc.length && Math.random() < this.P_METACONSCIENCE) {
      return Utils.rand(mc);
    }
    // Sinon : souche pondérée, puis éventuellement une de ses métavariantes
    const souche = this._weightedSouche();
    const variantes = this.bySouche(souche, "metavariant");
    const pVar = this._pMetavarianteSouche[souche] ?? 0.08;
    if (variantes.length && Math.random() < pVar) {
      return Utils.rand(variantes);
    }
    return souche;
  },
};
