"use strict";

/* ============================================================
   ÉDITION SR6 — Shadowrun 6e édition
   Sources :
   - LdB SR6 (BBE, fr) : attributs p.69, PNJ p.212-220, contacts p.243-249, armures p.274-275
   - Feu Nourri (BBE, fr) : armes p.16-29
   - Compagnon du Sixième Monde (BBE, fr) : métavariantes p.75-90

   Différences clés SR6 vs SR5 :
   - Pas de Limites → Score Défensif (SD)
   - Potentiel d'Actions (PA) : MAJ + MIN par round
   - Compétences regroupées (Athlétisme, Combat rapproché, Armes à feu…)
   - Moniteur d'état unique (8 + CON/2)
   - ATO (Atout) remplace CHC
   - Scores Offensifs (SO) sur les armes au lieu de VD seul
   ============================================================ */

const EditionSR6 = {
  id: "sr6",
  label: "Shadowrun 6e",
  badgeLabel: "SR6",

  /* ----
     ATTRIBUTS PAR MÉTATYPE — table officielle p.69 LdB SR6
     Format : [min, max]
  ---- */
  attrRange: {
    Humain: {
      CON: [1, 6],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 7],
    },
    Elfe: {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 8],
      ATO: [1, 6],
    },
    Nain: {
      CON: [1, 7],
      AGI: [1, 6],
      RÉA: [1, 5],
      FOR: [1, 8],
      VOL: [1, 7],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Ork: {
      CON: [1, 8],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 8],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 5],
      ATO: [1, 6],
    },
    Troll: {
      CON: [1, 9],
      AGI: [1, 5],
      RÉA: [1, 6],
      FOR: [1, 9],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 5],
      ATO: [1, 6],
    },
    // --- Métavariantes Elfes (Compagnon p.77) ---
    Dalakitnon: {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 8],
      INT: [1, 7],
      CHA: [1, 8],
      ATO: [1, 6],
    },
    Dryade: {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 5],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 8],
      ATO: [1, 6],
    },
    Nocturna: {
      CON: [1, 5],
      AGI: [1, 8],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 6],
    },
    Wakyambi: {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 7],
    },
    "Xapiri thëpë": {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 6],
    },
    // --- Métavariantes Humains (Compagnon p.79) ---
    Nartaki: {
      CON: [1, 8],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 8],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Valkyrie: {
      CON: [1, 7],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    // --- Métavariantes Nains (Compagnon p.81-82) ---
    Duende: {
      CON: [1, 7],
      AGI: [1, 6],
      RÉA: [1, 8],
      FOR: [1, 6],
      VOL: [1, 7],
      LOG: [1, 6],
      INT: [1, 7],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Gnome: {
      CON: [1, 4],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 4],
      VOL: [1, 7],
      LOG: [1, 7],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Hanuman: {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 7],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Koborokuru: {
      CON: [1, 7],
      AGI: [1, 6],
      RÉA: [1, 7],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Menehune: {
      CON: [1, 7],
      AGI: [1, 7],
      RÉA: [1, 5],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    // --- Métavariantes Orks (Compagnon p.84-85) ---
    Hobgobelin: {
      CON: [1, 6],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 6],
    },
    Ogre: {
      CON: [1, 9],
      AGI: [1, 6],
      RÉA: [1, 5],
      FOR: [1, 8],
      VOL: [1, 7],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Oni: {
      CON: [1, 8],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 6],
    },
    Satyre: {
      CON: [1, 7],
      AGI: [1, 6],
      RÉA: [1, 7],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    // --- Métavariantes Trolls (Compagnon p.86-88) ---
    Cyclope: {
      CON: [1, 9],
      AGI: [1, 5],
      RÉA: [1, 6],
      FOR: [1, 10],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 5],
      ATO: [1, 6],
    },
    Fomori: {
      CON: [1, 9],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 8],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 6],
    },
    Géant: {
      CON: [1, 9],
      AGI: [1, 5],
      RÉA: [1, 6],
      FOR: [1, 10],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 5],
      ATO: [1, 6],
    },
    Minotaure: {
      CON: [1, 10],
      AGI: [1, 5],
      RÉA: [1, 6],
      FOR: [1, 9],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 5],
      ATO: [1, 6],
    },
  },

  /* ----
     ATTRIBUTS DE BASE PAR PROFESSIONNALISME
     Calibrés sur les 20 PNJ de référence p.212-220
     Prof 0-10 (0=inexpérimenté, 10=élite des forces spéciales)
  ---- */
  attrByProf: {
    0: { CON: 2, AGI: 2, RÉA: 2, FOR: 2, VOL: 2, LOG: 2, INT: 2, CHA: 1 },
    1: { CON: 2, AGI: 2, RÉA: 2, FOR: 2, VOL: 2, LOG: 2, INT: 2, CHA: 1 },
    2: { CON: 3, AGI: 2, RÉA: 2, FOR: 4, VOL: 2, LOG: 1, INT: 2, CHA: 1 },
    3: { CON: 3, AGI: 3, RÉA: 3, FOR: 3, VOL: 3, LOG: 2, INT: 3, CHA: 2 },
    4: { CON: 3, AGI: 4, RÉA: 4, FOR: 3, VOL: 4, LOG: 4, INT: 4, CHA: 3 },
    5: { CON: 4, AGI: 3, RÉA: 3, FOR: 4, VOL: 4, LOG: 4, INT: 4, CHA: 3 },
    6: { CON: 4, AGI: 4, RÉA: 5, FOR: 4, VOL: 5, LOG: 5, INT: 5, CHA: 3 },
    7: { CON: 5, AGI: 5, RÉA: 5, FOR: 4, VOL: 5, LOG: 4, INT: 5, CHA: 4 },
    8: { CON: 6, AGI: 5, RÉA: 6, FOR: 5, VOL: 5, LOG: 5, INT: 6, CHA: 4 },
    9: { CON: 5, AGI: 7, RÉA: 5, FOR: 6, VOL: 4, LOG: 6, INT: 6, CHA: 6 },
    10: { CON: 5, AGI: 6, RÉA: 5, FOR: 5, VOL: 5, LOG: 4, INT: 6, CHA: 5 },
  },

  /* Modificateurs métatype sur la base des PNJ (p.212) */
  metaMod: {
    Humain: {},
    Elfe: { AGI: +1, CHA: +2 },
    Nain: { CON: +2, FOR: +2, VOL: +1, RÉA: -1 },
    Ork: { CON: +3, FOR: +2, CHA: -1 },
    Troll: { CON: +4, FOR: +3, AGI: -1, CHA: -2 },
    // Métavariantes — mods supplémentaires vs métatype parent
    Dalakitnon: { AGI: +1, CHA: +2, LOG: +2 },
    Dryade: { AGI: +1, CHA: +2, FOR: -1 },
    Nocturna: { AGI: +2, CHA: +1, CON: -1 },
    Wakyambi: { AGI: +1, CHA: +1 },
    "Xapiri thëpë": { AGI: +1, CHA: +1 },
    Nartaki: { CON: +2, FOR: +2 },
    Valkyrie: { CON: +1, FOR: +1 },
    Duende: { CON: +1, RÉA: +2, VOL: +1, INT: +1 },
    Gnome: { CON: -2, FOR: -2, LOG: +1 },
    Hanuman: { AGI: +1, FOR: +1, INT: +1 },
    Koborokuru: { CON: +1, RÉA: +2, FOR: +1 },
    Menehune: { CON: +1, AGI: +1, RÉA: -1, FOR: +1 },
    Hobgobelin: { CHA: +2, FOR: +1 },
    Ogre: { CON: +5, FOR: +4, RÉA: -1 },
    Oni: { CON: +4, AGI: +1, FOR: +3, CHA: +2 },
    Satyre: { CON: +3, AGI: +1, RÉA: +3, FOR: +3 },
    Cyclope: { CON: +5, AGI: -1, FOR: +5, CHA: -1 },
    Fomori: { CON: +5, FOR: +3, CHA: +1 },
    Géant: { CON: +5, AGI: -1, FOR: +5, CHA: -1 },
    Minotaure: { CON: +6, AGI: -1, FOR: +4, CHA: -1 },
  },

  /* ---- Score Défensif de base par prof ---- */
  sdByProf: {
    0: 2,
    1: 4,
    2: 5,
    3: 6,
    4: 6,
    5: 12,
    6: 14,
    7: 16,
    8: 15,
    9: 8,
    10: 16,
  },

  /* ---- Initiative base/dés par prof ---- */
  initByProf: {
    0: { base: 4, dice: 1 },
    1: { base: 4, dice: 1 },
    2: { base: 4, dice: 1 },
    3: { base: 6, dice: 1 },
    4: { base: 8, dice: 1 },
    5: { base: 9, dice: 2 },
    6: { base: 11, dice: 3 },
    7: { base: 12, dice: 3 },
    8: { base: 15, dice: 4 },
    9: { base: 14, dice: 3 },
    10: { base: 15, dice: 5 },
  },

  /* ---- Potentiel d'actions par prof ---- */
  paByProf: {
    0: "MAJ 1, MIN 2",
    1: "MAJ 1, MIN 2",
    2: "MAJ 1, MIN 2",
    3: "MAJ 1, MIN 2",
    4: "MAJ 1, MIN 2",
    5: "MAJ 1, MIN 3",
    6: "MAJ 1, MIN 4",
    7: "MAJ 1, MIN 4",
    8: "MAJ 1, MIN 5",
    9: "MAJ 1, MIN 4",
    10: "MAJ 1, MIN 6",
  },

  /* ---- Options du formulaire ---- */
  formOptions: {
    meta: [
      "Aléatoire",
      // Métatypes de base
      "Humain",
      "Elfe",
      "Nain",
      "Ork",
      "Troll",
      // Métavariantes Elfes
      "Dalakitnon",
      "Dryade",
      "Nocturna",
      "Wakyambi",
      "Xapiri thëpë",
      // Métavariantes Humains
      "Nartaki",
      "Valkyrie",
      // Métavariantes Nains
      "Duende",
      "Gnome",
      "Hanuman",
      "Koborokuru",
      "Menehune",
      // Métavariantes Orks
      "Hobgobelin",
      "Ogre",
      "Oni",
      "Satyre",
      // Métavariantes Trolls
      "Cyclope",
      "Fomori",
      "Géant",
      "Minotaure",
    ],
    gender: ["Aléatoire", "M", "F", "NB"],
    prof: ["Aléatoire", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    profession: [
      "Aléatoire",
      // Bas de l'échelle
      "Civil",
      "Voyou de rue",
      "Décérébré / Foule en colère",
      // Gangs
      "Ganger de rue",
      "Ganger vétéran",
      "Go-ganger",
      "Chef de gang",
      "Ganger Halloweeners",
      "Ganger Ancients",
      "Magogang (éveillé)",
      // Sécurité corpo
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
      // Police
      "Patrouilleur Lone Star",
      "Officier Knight Errant",
      "Détective Lone Star",
      "SWAT Lone Star",
      "Officier SWAT Knight Errant",
      "Mage combat Lone Star",
      // Crime organisé
      "Soldato Mafia",
      "Collecteur Mafia",
      "Enforcer Yakuza",
      "Maître des Lames Yakuza",
      "Courier Triade",
      "Vory v Zakone",
      "Koshari",
      // Militaire & mercenaire
      "Soldat UCAS",
      "Commando NAN",
      "Wildcats Sioux",
      "Mercenaire freelance",
      "Mercenaire Ares",
      "Ghost de Tír",
      "Navy SEAL",
      "Force d'Intervention Spéciale Marines",
      // Spécialisés
      "Contrebandier",
      "Assassin freelance",
      "Espion industriel",
      "Cambrioleur professionnel",
      "Decker freelance",
    ],
    special: [
      "Aucun",
      "Aléatoire",
      "Lieutenant",
      "Decker",
      "Rigger",
      "Adepte",
      "Mage hermétique",
      "Chaman",
      "Technomancien",
    ],
  },

  /* ---- Pools de compétences par profession ---- */
  skillPools: {
    Civil: [
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
    ],
    "Voyou de rue": [
      "Athlétisme",
      "Armes à feu",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
    ],
    "Décérébré / Foule en colère": [
      "Athlétisme",
      "Combat rapproché",
      "Intimidation",
    ],
    "Ganger de rue": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Ganger vétéran": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Leadership",
      "Perception",
    ],
    "Go-ganger": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Influence",
      "Perception",
      "Pilotage",
      "Ingénierie",
    ],
    "Chef de gang": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Influence",
      "Intimidation",
      "Leadership",
      "Perception",
    ],
    "Ganger Halloweeners": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Ganger Ancients": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Magogang (éveillé)": [
      "Astral",
      "Combat rapproché",
      "Conjuration",
      "Influence",
      "Perception",
      "Sorcellerie",
    ],
    "Agent de sécurité corpo": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Garde corpo (patrouille)": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Influence",
      "Perception",
    ],
    "Rigger de sécurité": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
      "Pilotage",
      "Piratage",
    ],
    "Agent de sécurité Renraku": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Influence",
      "Perception",
    ],
    "Samouraï rouge Renraku": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Furtivité",
      "Perception",
    ],
    "Agent de sécurité Ares": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
    ],
    "Séraphin Ares": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Furtivité",
      "Perception",
    ],
    "Agent de sécurité Aztechnology": [
      "Armes à feu",
      "Astral",
      "Athlétisme",
      "Combat rapproché",
      "Influence",
      "Perception",
    ],
    "Commando Aztlan": [
      "Armes à feu",
      "Astral",
      "Athlétisme",
      "Combat rapproché",
      "Conjuration",
      "Furtivité",
      "Perception",
    ],
    "Équipe IHR DocWagon": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
      "Pilotage",
    ],
    "Patrouilleur Lone Star": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Officier Knight Errant": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Furtivité",
      "Influence",
      "Perception",
    ],
    "Détective Lone Star": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Influence",
      "Perception",
      "Piratage",
    ],
    "SWAT Lone Star": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Influence",
      "Perception",
    ],
    "Officier SWAT Knight Errant": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Influence",
      "Perception",
    ],
    "Mage combat Lone Star": [
      "Armes à feu",
      "Astral",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Conjuration",
      "Influence",
      "Perception",
      "Sorcellerie",
    ],
    "Soldato Mafia": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Collecteur Mafia": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
    ],
    "Enforcer Yakuza": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
    ],
    "Maître des Lames Yakuza": [
      "Armes à feu",
      "Astral",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Furtivité",
      "Influence",
      "Perception",
    ],
    "Courier Triade": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Furtivité",
      "Pilotage",
      "Perception",
    ],
    "Vory v Zakone": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Influence",
      "Intimidation",
      "Perception",
    ],
    Koshari: [
      "Armes à feu",
      "Astral",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Furtivité",
      "Pilotage",
    ],
    "Soldat UCAS": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
    ],
    "Commando NAN": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Furtivité",
      "Perception",
      "Survie",
    ],
    "Wildcats Sioux": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Ingénierie",
      "Perception",
      "Pilotage",
    ],
    "Mercenaire freelance": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
      "Pilotage",
    ],
    "Mercenaire Ares": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
    ],
    "Ghost de Tír": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Ingénierie",
      "Perception",
      "Pilotage",
    ],
    "Navy SEAL": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Furtivité",
      "Ingénierie",
      "Perception",
      "Piratage",
      "Pilotage",
    ],
    "Force d'Intervention Spéciale Marines": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
    ],
    Contrebandier: [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Pilotage",
    ],
    "Assassin freelance": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Furtivité",
      "Perception",
    ],
    "Espion industriel": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Piratage",
    ],
    "Cambrioleur professionnel": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Ingénierie",
    ],
    "Decker freelance": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Piratage",
    ],
  },

  skillCount: {
    0: 3,
    1: 3,
    2: 4,
    3: 4,
    4: 5,
    5: 5,
    6: 6,
    7: 6,
    8: 7,
    9: 7,
    10: 8,
  },

  specialSkills: {
    Lieutenant: [
      { name: "Leadership", bonus: 3 },
      { name: "Intimidation", bonus: 2 },
    ],
    Decker: [
      { name: "Piratage", bonus: 5 },
      { name: "Électronique", bonus: 4 },
      { name: "Cybercombat", bonus: 5 },
    ],
    Rigger: [
      { name: "Pilotage", bonus: 5 },
      { name: "Ingénierie", bonus: 5 },
      { name: "Électronique", bonus: 3 },
    ],
    Adepte: [
      { name: "Combat rapproché", bonus: 3 },
      { name: "Furtivité", bonus: 2 },
    ],
    "Mage hermétique": [
      { name: "Conjuration", bonus: 4 },
      { name: "Sorcellerie", bonus: 4 },
      { name: "Astral", bonus: 4 },
    ],
    Chaman: [
      { name: "Conjuration", bonus: 5 },
      { name: "Sorcellerie", bonus: 3 },
      { name: "Astral", bonus: 4 },
    ],
    Technomancien: [
      { name: "Compilation", bonus: 5 },
      { name: "Cybercombat", bonus: 5 },
      { name: "Décompilation", bonus: 5 },
      { name: "Électronique", bonus: 4 },
    ],
  },

  sortsByTradition: {
    "Mage hermétique": [
      "Barrière physique",
      "Boule étourdissante",
      "Armure",
      "Clairvoyance",
      "Détection de la vie",
      "Éclair de force",
      "Lumière",
      "Silence",
      "Foudre",
    ],
    Chaman: [
      "Guérison",
      "Invisibilité",
      "Soins",
      "Sphère de feu",
      "Agonie",
      "Éclair mana",
      "Confusion",
      "Armure",
    ],
    "Mage combat Lone Star": [
      "Armure",
      "Barrière physique",
      "Clairvoyance",
      "Détection des ennemis",
      "Éclair de force",
      "Lumière",
    ],
    "Magogang (éveillé)": [
      "Agonie",
      "Éclair mana",
      "Invisibilité",
      "Soins",
      "Sphère de feu",
    ],
  },

  /* ----
     POOLS D'ÉQUIPEMENT SR6
     Armures : Score Défensif (SD) ajouté au SD de base
     Armes : format SR6 avec Scores Offensifs (SO)
  ---- */
  equipPools: {
    commlinks: {
      bas: [
        "Commlink (IA 1)",
        "Commlink Aztechnology Calible (IA 1)",
        "Commlink Sony (IA 2)",
      ],
      moyen: [
        "Commlink (IA 3)",
        "Commlink Renraku Sensei (IA 3)",
        "Commlink Hermes Ikon (IA 4)",
      ],
      haut: [
        "Commlink (IA 4)",
        "Commlink Erika Elite (IA 4)",
        "Commlink Novatech (IA 5)",
      ],
      elite: [
        "Commlink (IA 5)",
        "Commlink Hermes Ikon (IA 5)",
        "Commlink Sony CIY-720 (IA 5)",
      ],
    },
    pistoletsLegers: [
      "Colt Agent Special [Pistolet léger, VD 3P, SO 10/8/-/-/-, CC/SA, 8(c)]",
      "HK P50 Tactical [Pistolet léger, VD 2P, SO 9/7/4/-, SA, 15(c), smartlink, visée laser]",
      "Fichetti Security 600 [Pistolet léger, VD 2P, SO 11/10/7/-/-, SA, 30(c), crosse pliable]",
      "Streetline Special [Pistolet de poche, VD 2P, SO 8/8/6/-, CC, 6(c)]",
      "Colt Secret Agent [Pistolet de poche, VD 2P, SO 9/7/-/-/-, CC, 6(c), indétectable]",
    ],
    pistoletsLourds: [
      "HK P60 Tactical [Pistolet lourd, VD 3P, SO 8/9/5/-, SA, 15(c), smartlink]",
      "Cavalier Arms Marshal [Pistolet lourd, VD 3P, SO 8/10/6/-/-, CC/SA, 6(cy), smartgun]",
      "Nemesis Arms Praetorian II [Pistolet lourd, VD 3P, SO 9/8/-/-/-, SA, 12(c), smartgun]",
      "Ares Predator VI [Pistolet lourd, VD 3P, SO 9/8/5/-, SA, 15(c)]",
      "Beretta 201T [Pistolet léger, VD 2P, SO 9/8/6/-, SA/TR, 21(c)]",
    ],
    pistoletsAutomatiques: [
      "Colt M24 [Pistolet auto, VD 3P, SO 8/9/8/-/-, SA/TR/TA, 30(c)]",
      "Ultimax 71 [Pistolet auto, VD 2P, SO 9/7/7/-/-, TR/TA, 15(c), visée laser]",
    ],
    mitraillettes: [
      "Ares Sigma [Mitraillette, VD 4P, SO 8/9/8/3, SA/TR/TA, 30(c)]",
      "Colt Cobra TZ-120 [Mitraillette, VD 4P, SO 7/10/9/3, SA/TR/TA, 32(c)]",
      "HK MP5-TX [Mitraillette, VD 4P, SO 8/10/8/2, SA/TR, 30(c)]",
      "Ingram Smartgun X [Mitraillette, VD 4P, SO 8/10/9/3, SA/TR, 32(c), smartgun]",
      "Shiawase Arms Model 71 [Mitraillette, VD 4P, SO 4/11/10/8/3, SA/TR/TA, 100(c)]",
    ],
    shotguns: [
      "Colt MS-27 [Shotgun, VD 4P, SO 5/11/8/-/-, SA/TR/TA, 12(c)/32(t)]",
      "Defiance T-285 [Shotgun, VD 4P*, SO 8/11/6/-/-, CC, 3(m)]",
      "Franchi SPAS-25 [Shotgun, VD 5P, SO 7/10/6/-/-, SA/CC, 10(c), smartgun]",
      "Onotari War Hound [Shotgun, VD 3P, SO 7/10/6/-/-, CC/SA, 6(c), smartgun]",
    ],
    fusils: [
      "Onotari Arms Kali II [Fusil d'assaut, VD 4P, SO 7/11/9/4/-/-, SA/TR/TA, 32(c), renfort de mêlée]",
      "Onotari Arms JP-K51 [Carabine, VD 5P, SO 1/7/11/7/7, SA/BF, 26(m), visée laser]",
      "Onotari Arms War Hound [Fusil bullpup, VD 5P, SO 4/11/9/6/2, SA/TR/TA, 38(c), smartgun]",
      "Shiawase Arms Tactical 73 [Fusil d'assaut, VD 4P, SO 4/11/10/8/3, SA/TR/TA, 100(c)]",
      "Colt M23 [Fusil d'assaut, VD 5P, SO 7/10/10/10/3, SA/TR/TA, avec smartgun, munitions explosives]",
      "AK-97 [Fusil d'assaut, VD 5P, SO 4/11/9/7/1]",
      "Ares Alpha [Fusil d'assaut, VD 4P, SO 6/12/11/9/4, SA/TR/TA, avec smartgun]",
    ],
    snipersLourds: [
      "Onotari Arms Rhino Hunter Alpha [Fusil de précision, VD 6P, SO 1/4/11/11/10, CC, 7(m)]",
      "Shiawase Arms Tactical 69 [Fusil antimatériel, VD 8P, SO 1/2/8/11/-]",
      "Ares Desert Strike [Fusil de précision, VD 7P, SO 1/3/9/11/9]",
      "FN P93 Praetor [Mitraillette, VD 4P, SO 10/13/8/-, SA/TR, avec silencieux]",
    ],
    armesMelee: [
      "Couteau [VD 3P, SO 9/2*/-/-/-, portée max 20m]",
      "Couteau de combat [VD 4P, SO 9/2*/-/-/-, portée max 20m]",
      "Katana [VD 4P, SO 13/-/-/-/-]",
      "Épée [VD 4P, SO 13/-/-/-/-]",
      "Bâton télescopique [VD 4E, SO 10/-/-/-/-]",
      "Électro-gants [VD 4E, SO 7/-/-/-/-]",
      "Électromatraque [VD 5E, SO 9/-/-/-/-, perte d'action]",
      "Lame rétractable [cyberware, VD 4P, SO 9/-/-/-/-]",
    ],
    armures: {
      legere: [
        "Vêtements pare-balles [SD+2]",
        "Gilet pare-balles [SD+3]",
        "Veste en cuir synthétique [SD+1]",
      ],
      moyenne: [
        "Veste pare-balles [SD+4]",
        "Manteau renforcé [SD+3]",
        "Costume Actioneer [SD+2]",
        "Combinaison Urban Explorer [SD+3]",
      ],
      lourde: [
        "Armure corporelle intégrale [SD+5]",
        "Armure corporelle intégrale + casque [SD+7]",
        "Combinaison caméléon [SD+2, Furtivité+1]",
      ],
      militaire: [
        "Armure corporelle intégrale + casque [SD+7]",
        "Armure corporelle intégrale + casque + isolation chimique [SD+7]",
        "Veste pare-balles + casque [SD+6]",
      ],
    },
    cyberware: [
      "Réflexes câblés 1 [+1D6 initiative, +1 PA MIN]",
      "Réflexes câblés 2 [+2D6 initiative, +1 PA]",
      "Amplificateur de réaction 2 [RÉA+2]",
      "Amplificateurs synaptiques 2 [INT+2]",
      "Tonification musculaire 3 [FOR+3]",
      "Renforcement musculaire 3 [FOR+3]",
      "Armure dermique 3 [SD+3]",
      "Armure dermique 4 [SD+4]",
      "Oreilles cybernétiques [indice 3, filtre son sélectif, amortisseur sonore]",
      "Yeux cybernétiques [indice 2, interface visuelle, caméra, vision nocturne]",
      "Yeux cybernétiques [indice 3, vision thermique, compensation antiflash, smartlink]",
      "Ossature renforcée [CON+2]",
      "Substituts musculaires [AGI+2]",
      "Datajack [connexion directe]",
      "Câblage de contrôle [Rigger]",
      "Filtre antalgique 2 [résiste à 2 malus de blessure]",
    ],
    equipSpecial: [
      "Lunettes smartlink [indice 2]",
      "Visière tactique [vision nocturne, compensation antiflash, smartlink]",
      "Inhalateur de jazz [×2, RÉA+1, INT+2, DI+2]",
      "Inhalateur de Jazz [×3, *Réaction +1, Intuition +2, Dés Initiative +2]",
      "Kit de premiers soins",
      "Grenade fumigène",
      "Flash-paks [VD : Aveuglé III, Souffle 10m]",
      "Lance-grappin",
      "Menottes magnétiques",
      "Scanner biomédical",
      "Détecteur de Matrice",
    ],
  },

  equipProfile(profession, prof) {
    const p = prof;
    const pools = this.equipPools;

    const commlink =
      p <= 1
        ? Utils.rand(pools.commlinks.bas)
        : p <= 3
          ? Utils.rand(pools.commlinks.moyen)
          : p <= 6
            ? Utils.rand(pools.commlinks.haut)
            : Utils.rand(pools.commlinks.elite);

    const armure =
      p <= 1
        ? Utils.rand(pools.armures.legere)
        : p <= 4
          ? Utils.rand(pools.armures.moyenne)
          : p <= 7
            ? Utils.rand(pools.armures.lourde)
            : Utils.rand(pools.armures.militaire);

    const isSniper = [
      "Ghost de Tír",
      "Wildcats Sioux",
      "Navy SEAL",
      "Onotari",
    ].some((k) => profession.includes(k));
    const isHeavy = [
      "Commando",
      "Marines",
      "SEAL",
      "Wildcats",
      "Séraphin",
      "Samouraï rouge",
      "Mercenaire",
      "Forces",
    ].some((k) => profession.includes(k));

    let armePrinc;
    if (p >= 8 || isSniper) {
      armePrinc = Utils.rand([...pools.fusils, ...pools.snipersLourds]);
    } else if (p >= 5 || isHeavy) {
      armePrinc = Utils.rand([...pools.fusils, ...pools.mitraillettes]);
    } else if (p >= 3) {
      armePrinc = Utils.rand([
        ...pools.mitraillettes,
        ...pools.shotguns,
        ...pools.fusils.slice(0, 3),
      ]);
    } else {
      armePrinc = Utils.rand([
        ...pools.pistoletsLourds,
        ...pools.pistoletsAutomatiques,
      ]);
    }

    const result = [commlink, armePrinc];

    const isMelee = [
      "Yakuza",
      "Maître des Lames",
      "Ganger",
      "Sons of Sauron",
      "Halloweeners",
      "Ancients",
      "Vory",
    ].some((k) => profession.includes(k));
    if (isMelee || Utils.randBool(0.35))
      result.push(Utils.rand(pools.armesMelee));

    const isPolice = [
      "Lone Star",
      "Knight Errant",
      "SWAT",
      "Patrouilleur",
    ].some((k) => profession.includes(k));
    if (isPolice)
      result.push("Électromatraque [VD 5E, SO 9/-/-/-/-, perte d'action]");

    result.push(armure);
    if (p >= 3) result.push(Utils.rand(pools.cyberware));
    if (p >= 6) result.push(Utils.rand(pools.cyberware));
    if (p >= 4 && Utils.randBool(0.4))
      result.push(Utils.rand(pools.equipSpecial));

    return result;
  },

  /* ---- Génération principale ---- */
  generate(opts) {
    const metaList = this.formOptions.meta.slice(1);
    const meta = opts.meta === "Aléatoire" ? Utils.rand(metaList) : opts.meta;
    const gender =
      opts.gender === "Aléatoire" ? Utils.randGender() : opts.gender;
    const prof =
      opts.prof === "Aléatoire"
        ? Utils.randInt(0, 10)
        : parseInt(opts.prof, 10);

    const profList = this.formOptions.profession.slice(1);
    const profession =
      opts.profession === "Aléatoire" ? Utils.rand(profList) : opts.profession;

    let special = opts.special || "Aucun";
    if (special === "Aléatoire") {
      special = Utils.randBool(0.2)
        ? Utils.rand([
            "Lieutenant",
            "Decker",
            "Rigger",
            "Adepte",
            "Mage hermétique",
            "Chaman",
            "Technomancien",
          ])
        : "Aucun";
    }

    const p = Utils.clamp(prof, 0, 10);
    const baseAttrs = { ...this.attrByProf[p] };
    const mods = this.metaMod[meta] || {};
    const range = this.attrRange[meta] || this.attrRange["Humain"];

    const attrs = {};
    for (const k of ["CON", "AGI", "RÉA", "FOR", "VOL", "LOG", "INT", "CHA"]) {
      const raw = (baseAttrs[k] || 2) + (mods[k] || 0) + Utils.randInt(-1, 1);
      attrs[k] = Utils.clamp(raw, range[k]?.[0] ?? 1, range[k]?.[1] ?? 6);
    }

    // Attributs spéciaux — MAG/RES seulement si profession explicitement magique ou special magique
    const profMagiques = [
      "Magogang (éveillé)",
      "Mage combat Lone Star",
      "Commando Aztlan",
      "Agent de sécurité Aztechnology",
      "Maître des Lames Yakuza",
    ];
    const isMagicProf = profMagiques.some((p) => profession.includes(p));
    const isMagicSpec = ["Mage hermétique", "Chaman", "Adepte"].includes(
      special,
    );

    if (isMagicProf || isMagicSpec) {
      attrs.MAG = Utils.clamp(Math.floor(p / 2) + Utils.randInt(1, 3), 1, 12);
    }
    if (special === "Technomancien") {
      attrs.RES = Utils.clamp(Math.floor(p / 2) + Utils.randInt(1, 2), 1, 12);
    }

    // Moniteur d'état
    const me = 8 + Math.ceil(attrs.CON / 2);

    // SD base profil + armure (ajoutée dans equip)
    const sdBase = this.sdByProf[p] || 4;

    // Initiative
    const initData = this.initByProf[p];
    const initBase = attrs.RÉA + attrs.INT;

    // PA
    const pa = this.paByProf[p] || "MAJ 1, MIN 2";

    // Compétences
    const pool = this.skillPools[profession] || this.skillPools["Civil"];
    const count = this.skillCount[p] || 4;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const existingNames = new Set();
    const skills = shuffled.slice(0, count).map((name) => {
      existingNames.add(name);
      return { name, val: Utils.clamp(p + 1 + Utils.randInt(0, 2), 1, 12) };
    });
    for (const s of this.specialSkills[special] || []) {
      if (!existingNames.has(s.name)) {
        skills.push({
          name: s.name,
          val: Utils.clamp(p + s.bonus + Utils.randInt(0, 1), 1, 12),
        });
        existingNames.add(s.name);
      }
    }

    // Sorts
    const sortsTrad =
      this.sortsByTradition[profession] ||
      this.sortsByTradition[special] ||
      null;
    const sorts = sortsTrad ? sortsTrad.slice(0, 2 + Math.floor(p / 3)) : [];

    // Équipement
    const equip = this.equipProfile(profession, p);

    // Augmentations corpo
    const augs = p >= 5 ? [Utils.rand(this.equipPools.cyberware)] : [];

    const pnj = {
      id: Utils.uid(),
      edition: "sr6",
      name:
        opts.name && opts.name.trim()
          ? opts.name.trim()
          : Utils.genName(
              opts.bassin && opts.bassin !== "Aléatoire" ? opts.bassin : null,
            ),
      meta,
      gender,
      prof: p,
      profession,
      special,
      attrs,
      me,
      sdBase,
      initBase,
      initDice: initData.dice,
      pa,
      skills,
      sorts,
      equip,
      augs,
      physFilled: 0,
      notes: "",
    };
    if (typeof Flavor !== "undefined") Flavor.apply(pnj);
    return pnj;
  },

  recalc(pnj) {
    const { attrs } = pnj;
    pnj.me = 8 + Math.ceil(attrs.CON / 2);
    pnj.initBase = attrs.RÉA + attrs.INT;
    return pnj;
  },
};
