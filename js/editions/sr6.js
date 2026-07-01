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
  useMetavariants: true,

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

  /* ---- Score Défensif de base par proRating ---- */
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

  /* ---- Initiative base/dés par proRating ---- */
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
    proRating: ["Aléatoire", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    archetype: [
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
      "Gros bras Yakuza",
      "Maître des Lames Yakuza",
      "Coursier Triade",
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

  /* ---- Pools de compétences par archetype ---- */
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
    "Gros bras Yakuza": [
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
    "Coursier Triade": [
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

  spellsByTradition: {
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
    pistoletsPoche: [
      "Fichetti Tiffani Needler [Pistolet de poche, VD 3P, SO 10/6/2/-/-, CC, 4(c)]",
      "Streetline Special [Pistolet de poche, VD 2P, SO 8/8/-/-/-, CC, 6(c)]",
      "Walther Palm Pistol [Pistolet de poche, VD 2P, SO 12/7/-/-/-, CC/TR, 6(cb)]",
    ],
    pistoletsLegers: [
      "Ares Light Fire 70 [Pistolet léger, VD 2P, SO 9/6/5/-/-, SA, 16(c)]",
      "Ares Light Fire 75 [Pistolet léger, VD 2P, SO 9/6/5/-/-, SA, 16(c), smartlink]",
      "Beretta 101T [Pistolet léger, VD 2P, SO 9/8/6/-/-, SA, 21(c)]",
      "Beretta 201T [Pistolet léger, VD 2P, SO 9/8/6/-/-, SA/TA, 21(c)]",
      "Colt America L36 [Pistolet léger, VD 2P, SO 8/8/6/-/-, SA, 11(c)]",
      "Fichetti Security 600 [Pistolet léger, VD 2P, SO 9/8/5/-/-, SA, 30(c), crosse pliable]",
      "Ruger Redhawk [Pistolet léger, VD 3P, SO 7/10/7/-/-, SA/TR, 8(b)]",
    ],
    pistoletsAutomatiques: [
      "Ares Crusader II [Pistolet auto, VD 2P, SO 9/9/7/-/-, SA/TR, 40(c), smartgun]",
      "Ceska Black Scorpion [Pistolet auto, VD 2P, SO 10/9/8/-/-, SA/TR, 35(c), crosse pliable]",
      "Steyr TMP [Pistolet auto, VD 2P, SO 7/7/5/-/-, SA/TA, 30(c), visée laser]",
    ],
    pistoletsLourds: [
      "Ares Predator VI [Pistolet lourd, VD 3P, SO 10/10/8/-/-, SA/TR, 15(c), smartgun]",
      "Browning Ultra Power [Pistolet lourd, VD 3P, SO 9/8/5/-/-, SA, 10(c), visée laser]",
      "Colt Government 2076/Manhunter [Pistolet lourd, VD 3P, SO 9/7/7/-/-, SA, 14(c), smartgun]",
      "Ruger Super Warhawk [Pistolet lourd, VD 4P, SO 8/11/8/-/-, SA, 6(b)]",
    ],
    mitraillettes: [
      "Colt Cobra TZ-120 [Mitraillette, VD 3P, SO 9/9/6/-/-, SA/TR, 32(c)]",
      "FN P93 Praetor [Mitraillette, VD 4P, SO 8/11/6/-/-, SA/TR/TA, 50(c), silencieux]",
      "HK-227 [Mitraillette, VD 3P, SO 10/11/8/-/-, SA/TR, 28(c), crosse rétractable, smartgun, silencieux]",
      "Ingram Smartgun XI [Mitraillette, VD 3P, SO 11/9/8/-/-, SA/TR, 32(c), smartgun]",
      "SCK Model 100 [Mitraillette, VD 3P, SO 10/10/7/-/-, SA/TR, 30(c), smartgun]",
      "Uzi V [Mitraillette, VD 3P, SO 7/7/6/-/-, SA/TR/TA, 24(c), visée laser]",
    ],
    shotguns: [
      "Defiance T-250 [Shotgun, VD 4P, SO 7/10/6/-/-, CC/SA, 5(m)]",
      "Mossberg CMDT [Shotgun, VD 4P, SO 3/10/8/-/-, SA/TR, 10(c), visée laser]",
      "PJSS Model 55 [Shotgun, VD 4P, SO 3/12/8/-/-, SA/TR courte, 2(cb)]",
      "Remington Roomsweeper [Shotgun, VD 5P, SO 9/8/4/-/-, SA, 8(m)]",
    ],
    fusils: [
      "AK-97 [Fusil d'assaut, VD 5P, SO 4/11/9/7/1, SA/TR/TA, 38(c)]",
      "Ares Alpha [Fusil d'assaut, VD 4P, SO 4/10/9/7/2, SA/TR/TA, 42(c), smartgun, lance-grenades]",
      "Colt M23 [Fusil d'assaut, VD 4P, SO 5/8/8/1, SA/TR/TA, 40(c), smartgun]",
      "FN HAR [Fusil d'assaut, VD 5P, SO 2/10/9/5/-, SA/TR/TA, 35(c)]",
      "Yamaha Raiden [Fusil d'assaut, VD 5P, SO 4/10/11/7/2, SA/TR/TA, 60(c), silencieux, smartgun]",
    ],
    snipersLourds: [
      "Ares Desert Strike [Fusil de précision, VD 5P, SO 3/10/10/10, SA, 14(c)]",
      "Cavalier Arms Crockett EBR [Fusil de précision, VD 5P, SO 3/8/11/8, SA/TR, 20(c)]",
      "Ranger Arms SM-6 [Fusil de précision, VD 5P, SO 3/6/9/11/2, SA, 15(c), silencieux]",
      "Remington 900 [Fusil de précision, VD 5P, SO 2/7/10/12/11, CC, 5(m)]",
      "Barret Model 122 [Fusil antimatériel, VD 6P, SO 1/8/11/16/14, SA, 10(c)]",
    ],
    meleeWeapons: [
      "Couteau [VD 2P, SO 6+FOR/1*/-/-/-, portée max 20m]",
      "Couteau de combat [VD 3P, SO 8+FOR/2*/-/-/-, portée max 20m]",
      "Épée [VD 3P, SO 9+FOR/-/-/-/-]",
      "Katana [VD 4P, SO 10+FOR/-/-/-/-]",
      "Hache de combat [VD 5P, SO 9+FOR/-/-/-/-]",
      "Bâton télescopique [VD 4E, SO 8+FOR/-/-/-/-]",
      "Électromatraque [VD 5E(e), SO 6+FOR/-/-/-/-, perte d'action]",
      "Matraque télescopique [VD 2E, SO 5+FOR/-/-/-/-]",
      "Électro-gants [VD 4E(e), SO 5+FOR/-/-/-/-]",
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

  buildLoadout(archetype, proRating, awakened) {
    const p = proRating;
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
    ].some((k) => archetype.includes(k));
    const isHeavy = [
      "Commando",
      "Marines",
      "SEAL",
      "Wildcats",
      "Séraphin",
      "Samouraï rouge",
      "Mercenaire",
      "Forces",
    ].some((k) => archetype.includes(k));

    let primaryWeapon;
    if (p >= 8 || isSniper) {
      primaryWeapon = Utils.rand([...pools.fusils, ...pools.snipersLourds]);
    } else if (p >= 5 || isHeavy) {
      primaryWeapon = Utils.rand([...pools.fusils, ...pools.mitraillettes]);
    } else if (p >= 3) {
      primaryWeapon = Utils.rand([
        ...pools.mitraillettes,
        ...pools.shotguns,
        ...pools.fusils.slice(0, 3),
      ]);
    } else if (p >= 1) {
      primaryWeapon = Utils.rand([
        ...pools.pistoletsLourds,
        ...pools.pistoletsAutomatiques,
      ]);
    } else {
      primaryWeapon = Utils.rand([
        ...pools.pistoletsPoche,
        ...pools.pistoletsLegers,
      ]);
    }

    const result = [commlink, primaryWeapon];

    // Arme supplémentaire cohérente (aléa d'arsenal) — tirée du même pool
    // que l'arme principale pour ne jamais contredire ses stats.
    const secondaryWeapon = Utils.rand([
      ...pools.meleeWeapons,
      ...pools.pistoletsLegers,
      ...pools.pistoletsAutomatiques,
    ]);
    if (Utils.randBool(0.6) && secondaryWeapon !== primaryWeapon) {
      result.push(secondaryWeapon);
    }

    const isMelee = [
      "Yakuza",
      "Maître des Lames",
      "Ganger",
      "Sons of Sauron",
      "Halloweeners",
      "Ancients",
      "Vory",
    ].some((k) => archetype.includes(k));
    if (isMelee || Utils.randBool(0.35))
      result.push(Utils.rand(pools.meleeWeapons));

    const isPolice = [
      "Lone Star",
      "Knight Errant",
      "SWAT",
      "Patrouilleur",
    ].some((k) => archetype.includes(k));
    if (isPolice) result.push(pools.meleeWeapons.find((w) => w.startsWith("Électromatraque")));

    result.push(armure);
    if (!awakened && p >= 3) result.push(Utils.rand(pools.cyberware));
    if (!awakened && p >= 6) result.push(Utils.rand(pools.cyberware));
    if (p >= 4 && Utils.randBool(0.4))
      result.push(Utils.rand(pools.equipSpecial));

    return result;
  },

  /* ---- Génération principale ---- */
  generate(opts) {
    if (typeof Metavariants !== "undefined") Metavariants.use("sr6");
    const metaList = this.formOptions.meta.slice(1);
    let meta =
      opts.meta === "Aléatoire"
        ? typeof Metavariants !== "undefined"
          ? Metavariants.randomMeta()
          : Utils.rand(metaList)
        : opts.meta;

    // Résolution métavariante SR6 (Compagnon du Sixième Monde)
    const mv =
      typeof Metavariants !== "undefined" ? Metavariants.resolve(meta) : null;
    // Résolution Infecté (Compagnon du Sixième Monde, p.102-113) — remplace
    // la résolution métavariante habituelle : un Infecté n'est pas *en
    // plus* une métavariante aléatoire.
    const infected =
      !mv && typeof Infected !== "undefined"
        ? Infected.use("sr6").resolve(meta)
        : null;
    const baseMetatype = mv ? mv.baseMetatype : infected ? infected.baseMetatype : meta;
    let originPoolOverride = null;
    if (mv && mv.originPools && (!opts.originPool || opts.originPool === "Aléatoire")) {
      originPoolOverride = Utils.rand(mv.originPools);
    }
    const effectiveOrigin =
      opts.originPool && opts.originPool !== "Aléatoire"
        ? opts.originPool
        : originPoolOverride;

    const gender =
      opts.gender === "Aléatoire" ? Utils.randGender() : opts.gender;
    const proRating =
      opts.proRating === "Aléatoire"
        ? Utils.randInt(0, 10)
        : parseInt(opts.proRating, 10);

    const archetypeList = this.formOptions.archetype.slice(1);
    const archetype =
      opts.archetype === "Aléatoire" ? Utils.rand(archetypeList) : opts.archetype;

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

    const p = Utils.clamp(proRating, 0, 10);
    const baseAttrs = { ...this.attrByProf[p] };
    const mods = this.metaMod[baseMetatype] || {};
    let range = mv
      ? mv.ranges
      : this.attrRange[baseMetatype] || this.attrRange["Humain"];

    // Infecté : étend le maximum de la souche/métaconscience du
    // modificateur imprimé dans le livre (règle p.106 : "ajoute au
    // maximum du métatype"). Sasquatch/Centaure/Naga/Triton n'ont pas
    // d'entrée dans attrRange : on va chercher leurs bornes propres via
    // Metavariants (métaconsciences).
    if (infected && infected.attrMod) {
      const mcRange =
        typeof Metavariants !== "undefined" &&
        Metavariants.use("sr6").resolve(infected.baseMetatype)?.ranges;
      const src = mcRange || range;
      const extended = {};
      for (const k of Object.keys(src)) {
        extended[k] = [src[k][0], src[k][1] + (infected.attrMod[k] || 0)];
      }
      range = extended;
    }

    const attrs = {};
    for (const k of ["CON", "AGI", "RÉA", "FOR", "VOL", "LOG", "INT", "CHA"]) {
      const raw = (baseAttrs[k] || 2) + (mods[k] || 0) + Utils.randInt(-1, 1);
      attrs[k] = Utils.clamp(raw, range[k]?.[0] ?? 1, range[k]?.[1] ?? 6);
    }

    // Attributs spéciaux — MAG/RES seulement si profession explicitement magique ou special magique
    const magicalArchetypes = [
      "Magogang (éveillé)",
      "Mage combat Lone Star",
      "Commando Aztlan",
      "Agent de sécurité Aztechnology",
      "Maître des Lames Yakuza",
    ];
    const isMagicProf = magicalArchetypes.some((p) => archetype.includes(p));
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

    // Réserves utiles au MJ (SR6, LdB)
    const defense = attrs.RÉA + attrs.INT; // test de Défense
    const damageResist = attrs.CON; // encaisser les dommages
    const composure = attrs.VOL + attrs.CHA; // sang-froid
    const judgeIntentions = attrs.INT + attrs.CHA; // jauger les intentions
    const memory = attrs.LOG + attrs.VOL; // mémoire
    // Tradition magique & esprit mentor (corrélés à l'origine).
    const isAwakened = isMagicProf || isMagicSpec;
    const castsSpells = isAwakened && special !== "Adepte" && !!attrs.MAG;
    const tradition = castsSpells
      ? Magic.pickTradition("sr6", effectiveOrigin, special, archetype)
      : null;
    const mentorSpirit =
      isAwakened && attrs.MAG ? Magic.pickMentor("sr6", effectiveOrigin) : null;

    // Résistance au Drain : Volonté + attribut de la tradition.
    const drainResist = tradition
      ? attrs.VOL + (attrs[tradition.drainAttr] || 0)
      : null;

    // Compétences
    const pool = this.skillPools[archetype] || this.skillPools["Civil"];
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

    // Tags d'archétype pour la sélection de contenu cohérent
    const awakened = isMagicProf || isMagicSpec;
    const contentTags =
      typeof Flavor !== "undefined"
        ? Flavor.tagsFor({ archetype, special })
        : new Set(["rue"]);

    // Sorts — enrichis avec descriptions cliquables.
    // Un adepte « pur » utilise des pouvoirs, pas des sorts.
    let spells = [];
    const adeptePur = special === "Adepte";
    if (awakened && !adeptePur && typeof Content !== "undefined") {
      spells = Content.pickSorts("sr6", p, contentTags);
    } else if (!adeptePur) {
      const spellsTrad =
        this.spellsByTradition[archetype] ||
        this.spellsByTradition[special] ||
        null;
      spells = spellsTrad ? spellsTrad.slice(0, 2 + Math.floor(p / 3)) : [];
    }

    // Pouvoirs d'adepte
    const powers =
      special === "Adepte" && typeof Content !== "undefined"
        ? Content.pickPouvoirs("sr6", p, p >= 4 ? 3 : 2)
        : [];

    // Trait de couleur cohérent (parfois)
    const traits =
      typeof Content !== "undefined" && Utils.randBool(0.5)
        ? Content.pickTraits("sr6", contentTags, p, 1)
        : [];

    // Équipement — pas de cyberware pour un Éveillé (coût en Essence)
    const equip = this.buildLoadout(archetype, p, awakened);
    if (infected) equip.push(...infected.naturalWeapons);
    if (mv && mv.naturalWeapons) equip.push(...mv.naturalWeapons);

    // Augmentations corpo — jamais pour un Éveillé
    const augs =
      !awakened && p >= 5 ? [Utils.rand(this.equipPools.cyberware)] : [];

    const pnj = {
      id: Utils.uid(),
      edition: "sr6",
      name:
        opts.name && opts.name.trim()
          ? opts.name.trim()
          : Utils.genName(
              opts.originPool && opts.originPool !== "Aléatoire"
                ? opts.originPool
                : originPoolOverride,
            ),
      meta: baseMetatype,
      metavariant: mv ? mv.name : null,
      metaFamily: mv ? mv.family : null,
      metaTraits: mv ? mv.traits : [],
      gender,
      proRating: p,
      archetype,
      special,
      attrs,
      me,
      sdBase,
      initBase,
      initDice: initData.dice,
      pa,
      defense,
      damageResist,
      drainResist,
      tradition: tradition ? tradition.name : null,
      traditionDrainAttr: tradition ? tradition.drainAttr : null,
      traditionDesc: tradition ? tradition.desc : null,
      mentorSpirit,
      composure,
      judgeIntentions,
      memory,
      skills,
      spells,
      powers,
      traits,
      equip,
      augs,
      infected: infected ? infected.name : null,
      infectedPowers: infected ? infected.powersFixed : [],
      infectedWeaknesses: infected ? infected.weaknesses : [],
      physFilled: 0,
      notes: "",
    };
    if (infected && infected.bonus) pnj._infectedBonus = infected.bonus;
    // Cohérence arme <-> compétence (renomme une compétence de combat si besoin)
    if (typeof WeaponRoll !== "undefined") WeaponRoll.reconcile(pnj, "sr6");
    if (typeof BonusEngine !== "undefined") BonusEngine.apply(pnj, "sr6");
    if (typeof Flavor !== "undefined") Flavor.apply(pnj);
    return pnj;
  },

  recalc(pnj) {
    const { attrs } = pnj;
    pnj.me = 8 + Math.ceil(attrs.CON / 2);
    pnj.initBase = attrs.RÉA + attrs.INT;
    pnj.defense = attrs.RÉA + attrs.INT;
    pnj.damageResist = attrs.CON;
    pnj.composure = attrs.VOL + attrs.CHA;
    pnj.judgeIntentions = attrs.INT + attrs.CHA;
    pnj.memory = attrs.LOG + attrs.VOL;
    if (pnj.traditionDrainAttr) {
      pnj.drainResist = attrs.VOL + (attrs[pnj.traditionDrainAttr] || 0);
    } else if (attrs.MAG && pnj.special !== "Adepte") {
      // fallback anciens PNJ sans tradition
      const tradAttr =
        String(pnj.archetype).includes("Chaman") || pnj.special === "Chaman"
          ? attrs.CHA
          : attrs.LOG;
      pnj.drainResist = attrs.VOL + tradAttr;
    } else {
      pnj.drainResist = null;
    }
    return pnj;
  },
};
