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

  /* ---- API ---- */

  /** Index plat nom→entrée (construit une fois) */
  _index: null,
  _buildIndex() {
    if (this._index) return this._index;
    const idx = {};
    for (const [name, d] of Object.entries(this.metavariants))
      idx[name] = { ...d, name, famille: "metavariant" };
    for (const [name, d] of Object.entries(this.metaconsciences))
      idx[name] = { ...d, name, famille: "metaconscience" };
    for (const [name, d] of Object.entries(this.zoocanthropes)) {
      idx[name] = {
        ...d,
        name,
        famille: "zoocanthrope",
        traits: [...d.traits, ...this.zooTraitsCommuns],
      };
    }
    this._index = idx;
    return idx;
  },

  /** true si `meta` est une métavariante/conscience/zoo */
  is(meta) {
    return !!this._buildIndex()[meta];
  },

  /**
   * Résout une valeur de métatype.
   * Retourne null si `meta` est un métatype de base (Humain/Elfe/Nain/Ork/Troll).
   * Sinon : { name, souche, ranges, traits[], bassins?, mag?, init?, famille }
   */
  resolve(meta) {
    return this._buildIndex()[meta] || null;
  },

  /** Souche (métatype parent) d'une valeur quelconque */
  souche(meta) {
    const r = this.resolve(meta);
    return r ? r.souche : meta;
  },

  /** Toutes les entrées d'une souche donnée, par famille */
  bySouche(souche, famille = "metavariant") {
    const src =
      famille === "metaconscience"
        ? this.metaconsciences
        : famille === "zoocanthrope"
          ? this.zoocanthropes
          : this.metavariants;
    return Object.keys(src).filter((n) => src[n].souche === souche);
  },

  /** Structure pour construire le <select> hiérarchique du formulaire */
  groupedOptions() {
    const souches = ["Humain", "Elfe", "Nain", "Ork", "Troll"];
    return souches.map((s) => ({
      souche: s,
      metavariants: this.bySouche(s, "metavariant"),
    }));
  },

  /** Toutes les métaconsciences (liste plate) */
  allMetaconsciences() {
    return Object.keys(this.metaconsciences);
  },

  /** Tous les zoocanthropes (liste plate) */
  allZoocanthropes() {
    return Object.keys(this.zoocanthropes);
  },
};
