"use strict";

/* ============================================================
   ÉDITION SR5 — Shadowrun 5e édition
   Données calibrées sur le Livre de Règles SR5 (BBE, fr)
   Table des attributs : p.68
   PNJ de référence : p.382-388
   Contacts : p.388-394
   ============================================================ */
const EditionSR5 = {
  id: "sr5",
  label: "Shadowrun 5e",
  badgeLabel: "SR5",
  useMetavariants: true,

  /* ----
     ATTRIBUTS PAR MÉTATYPE — table officielle p.68
     Format : { min, max } pour chaque attribut
     CON/AGI/REA/FOR/VOL/LOG/INT/CHA/CHC
  ---- */
  attrRange: {
    Humain: {
      CON: [1, 6],
      AGI: [1, 6],
      REA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      CHC: [2, 7],
    },
    Elfe: {
      CON: [1, 6],
      AGI: [2, 7],
      REA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [3, 8],
      CHC: [1, 6],
    },
    Nain: {
      CON: [3, 8],
      AGI: [1, 6],
      REA: [1, 5],
      FOR: [3, 8],
      VOL: [2, 7],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      CHC: [1, 6],
    },
    Ork: {
      CON: [4, 9],
      AGI: [1, 6],
      REA: [1, 6],
      FOR: [3, 8],
      VOL: [1, 6],
      LOG: [1, 5],
      INT: [1, 6],
      CHA: [1, 5],
      CHC: [1, 6],
    },
    Troll: {
      CON: [5, 10],
      AGI: [1, 5],
      REA: [1, 6],
      FOR: [5, 10],
      VOL: [1, 6],
      LOG: [1, 5],
      INT: [1, 5],
      CHA: [1, 4],
      CHC: [1, 6],
    },
  },

  /* ----
     ATTRIBUTS DE BASE PAR NIVEAU DE PROFESSIONNALISME
     Calibrés sur les PNJ de référence du livre (p.382-388)
     Prof 0 = Voyou décérébré, Prof 6 = Forces spéciales
  ---- */
  attrByProf: {
    //        CON  AGI  REA  FOR  VOL  LOG  INT  CHA  ESS
    0: {
      CON: 3,
      AGI: 3,
      REA: 3,
      FOR: 3,
      VOL: 3,
      LOG: 2,
      INT: 3,
      CHA: 2,
      ESS: 6,
    }, // Voyou/décérébré
    1: {
      CON: 4,
      AGI: 4,
      REA: 3,
      FOR: 4,
      VOL: 3,
      LOG: 2,
      INT: 3,
      CHA: 3,
      ESS: 6,
    }, // Ganger
    2: {
      CON: 4,
      AGI: 4,
      REA: 4,
      FOR: 3,
      VOL: 3,
      LOG: 2,
      INT: 3,
      CHA: 3,
      ESS: 6,
    }, // Sécu corpo de base
    3: {
      CON: 4,
      AGI: 3,
      REA: 4,
      FOR: 3,
      VOL: 3,
      LOG: 2,
      INT: 3,
      CHA: 3,
      ESS: 6,
    }, // Police de rue
    4: {
      CON: 4,
      AGI: 5,
      REA: 4,
      FOR: 4,
      VOL: 4,
      LOG: 3,
      INT: 4,
      CHA: 3,
      ESS: 6,
    }, // Crime organisé / sécu entraînée
    5: {
      CON: 6,
      AGI: 5,
      REA: 5,
      FOR: 4,
      VOL: 4,
      LOG: 4,
      INT: 5,
      CHA: 3,
      ESS: 1.9,
    }, // Sécu d'élite corpo (cyberware)
    6: {
      CON: 6,
      AGI: 6,
      REA: 5,
      FOR: 5,
      VOL: 5,
      LOG: 4,
      INT: 6,
      CHA: 4,
      ESS: 2.3,
    }, // Forces spéciales (full cyberware)
  },

  /* Modificateurs métatype sur les attributs de base des PNJ (p.382) */
  metaMod: {
    Humain: {},
    Elfe: { AGI: +1, CHA: +2 },
    Nain: { CON: +2, REA: -1, FOR: +2, VOL: +1 },
    Ork: { CON: +3, FOR: -1, LOG: -1, CHA: -1 },
    Troll: { CON: +4, AGI: -1, FOR: +4, LOG: -1, INT: -1, CHA: -2 },
  },

  /* ---- Armure officielle par prof ---- */
  armureByProf: { 0: 0, 1: 9, 2: 12, 3: 12, 4: 9, 5: 18, 6: 18 },

  /* ---- Initiative par prof ---- */
  initByProf: {
    0: { base: 6, dice: 1 },
    1: { base: 6, dice: 1 },
    2: { base: 7, dice: 1 },
    3: { base: 7, dice: 1 },
    4: { base: 8, dice: 1 },
    5: { base: 10, dice: 3 },
    6: { base: 11, dice: 4 },
  },

  /* ---- Options du formulaire ---- */
  formOptions: {
    meta: ["Aléatoire", "Humain", "Elfe", "Nain", "Ork", "Troll"],
    gender: ["Aléatoire", "M", "F", "NB"],
    prof: ["Aléatoire", "0", "1", "2", "3", "4", "5", "6"],
    profession: [
      "Aléatoire",
      // Bas de l'échelle
      "Civil ordinaire",
      "Voyou de bas étage",
      "Décérébré / Foule en colère",
      "Sans-abri des Barrens",
      "Travailleur usine / docker",
      // Gangs
      "Ganger de rue",
      "Ganger vétéran",
      "Go-ganger",
      "Lieutenant de gang",
      "Ganger Halloweeners",
      "Ganger Ancients (elfe)",
      "Ganger Ork Rights",
      // Sécurité corpo
      "Agent de sécurité corpo (entrée)",
      "Garde corpo (patrouille)",
      "Garde corpo (VIP)",
      "Agent de sécurité Renraku",
      "Agent de sécurité Ares",
      "Agent de sécurité Aztechnology",
      "Samouraï rouge Renraku",
      "Séraphin Ares",
      "Commando Aztlan",
      // Police et maintien de l'ordre
      "Flic des rues (Lone Star)",
      "Officier Knight Errant",
      "Détective Lone Star",
      "SWAT Knight Errant",
      "Unité anti-magie",
      // Crime organisé
      "Soldat Mafia",
      "Capo Mafia",
      "Enforcer Yakuza",
      "Wakagashira Yakuza",
      "Courier Triade",
      "Enforcer Triade",
      "Vory v Zakone (muscle)",
      "Koshari (contrebandier amérindien)",
      // Militaire & mercenaire
      "Soldat UCAS",
      "Soldat CAS",
      "Commando NAN",
      "Mercenaire freelance",
      "Mercenaire Ares private",
      "Pilote militaire",
      "Agent de renseignement",
      // Professionnels spécialisés
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
      // Éveillés divers
      "Mage hermétique de rue",
      "Chaman urbain",
      "Adepte de rue",
      "Mage Aztechnology (sacrifice)",
      "Initié hermétique",
      // Techniciens
      "Rigger go-ganger",
      "Rigger militaire",
      "Decker freelance",
      "Technicien matriciel corpo",
      "Spécialiste contre-mesures",
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
      "Mage Aztechnology",
    ],
  },

  /* ----
     POOL DE COMPÉTENCES PAR ARCHÉTYPE
     Chaque profession tire 3-5 compétences dans son pool.
     Le niveau final = base + prof + variation aléatoire.
  ---- */
  skillPools: {
    // --- Bas de l'échelle ---
    "Civil ordinaire": [
      "Armes contondantes",
      "Combat à mains nues",
      "Perception",
      "Étiquette",
      "Négociation",
      "Discrétion",
      "Course",
      "Premiers soins",
    ],
    "Voyou de bas étage": [
      "Armes contondantes",
      "Armes tranchantes",
      "Combat à mains nues",
      "Intimidation",
      "Discrétion",
      "Course",
      "Perception",
      "Pistolets",
    ],
    "Décérébré / Foule en colère": [
      "Armes contondantes",
      "Combat à mains nues",
      "Intimidation",
      "Course",
    ],
    "Sans-abri des Barrens": [
      "Combat à mains nues",
      "Discrétion",
      "Perception",
      "Survie",
      "Premiers soins",
      "Étiquette (La rue)",
    ],
    "Travailleur usine / docker": [
      "Armes contondantes",
      "Combat à mains nues",
      "Course",
      "Mécanique industrielle",
      "Perception",
      "Pilotage (engins de chantier)",
    ],
    // --- Gangs ---
    "Ganger de rue": [
      "Armes contondantes",
      "Armes tranchantes",
      "Combat à mains nues",
      "Intimidation",
      "Pistolets",
      "Étiquette (La rue)",
      "Course",
      "Discrétion",
    ],
    "Ganger vétéran": [
      "Armes contondantes",
      "Armes tranchantes",
      "Combat à mains nues",
      "Armes à feu",
      "Intimidation",
      "Pistolets",
      "Étiquette (La rue)",
      "Leadership",
      "Perception",
    ],
    "Go-ganger": [
      "Armes à feu",
      "Pistolets",
      "Combat à mains nues",
      "Pilotage (motos)",
      "Mécanique automobile",
      "Intimidation",
      "Perception",
    ],
    "Lieutenant de gang": [
      "Armes automatiques",
      "Armes tranchantes",
      "Combat à mains nues",
      "Intimidation",
      "Leadership",
      "Pistolets",
      "Étiquette (La rue)",
      "Perception",
    ],
    "Ganger Halloweeners": [
      "Armes tranchantes",
      "Combat à mains nues",
      "Intimidation",
      "Explosifs",
      "Pistolets",
      "Étiquette (La rue)",
      "Discrétion",
    ],
    "Ganger Ancients (elfe)": [
      "Armes tranchantes",
      "Combat à mains nues",
      "Armes à feu",
      "Discrétion",
      "Étiquette (La rue)",
      "Perception",
      "Pilotage (motos)",
    ],
    "Ganger Ork Rights": [
      "Armes contondantes",
      "Combat à mains nues",
      "Intimidation",
      "Leadership",
      "Étiquette (Métahumains)",
      "Perception",
    ],
    // --- Sécurité corpo ---
    "Agent de sécurité corpo (entrée)": [
      "Armes automatiques",
      "Combat à mains nues",
      "Course",
      "Étiquette",
      "Perception",
      "Pistolets",
    ],
    "Garde corpo (patrouille)": [
      "Armes automatiques",
      "Combat à mains nues",
      "Course",
      "Étiquette",
      "Perception",
      "Pistolets",
      "Premiers soins",
    ],
    "Garde corpo (VIP)": [
      "Armes automatiques",
      "Armes à feu",
      "Combat à mains nues",
      "Discrétion",
      "Étiquette (Corporations)",
      "Perception",
      "Pistolets",
      "Premiers soins",
    ],
    "Agent de sécurité Renraku": [
      "Armes automatiques",
      "Combat à mains nues",
      "Cybercombat",
      "Électronique",
      "Perception",
      "Pistolets",
      "Samouraï (Arts martiaux)",
    ],
    "Agent de sécurité Ares": [
      "Armes automatiques",
      "Armes à feu",
      "Combat à mains nues",
      "Explosifs",
      "Perception",
      "Pistolets",
    ],
    "Agent de sécurité Aztechnology": [
      "Armes automatiques",
      "Combat à mains nues",
      "Armes à feu",
      "Connaissance ésotérique",
      "Perception",
      "Pistolets",
    ],
    "Samouraï rouge Renraku": [
      "Armes à feu (GC)",
      "Athlétisme (GC)",
      "Combat rapproché (GC)",
      "Discrétion",
      "Électronique",
      "Perception",
    ],
    "Séraphin Ares": [
      "Armes à feu (GC)",
      "Athlétisme (GC)",
      "Combat rapproché (GC)",
      "Explosifs",
      "Perception",
      "Pilotage",
    ],
    "Commando Aztlan": [
      "Armes à feu (GC)",
      "Athlétisme (GC)",
      "Combat rapproché (GC)",
      "Conjuration",
      "Perception",
      "Survie",
    ],
    // --- Police ---
    "Flic des rues (Lone Star)": [
      "Armes contondantes",
      "Armes automatiques",
      "Combat à mains nues",
      "Course",
      "Perception",
      "Pistolets",
      "Criminalité locale",
      "Maintien de l'ordre",
    ],
    "Officier Knight Errant": [
      "Armes automatiques",
      "Combat à mains nues",
      "Course",
      "Étiquette",
      "Perception",
      "Pistolets",
      "Procédures de sécurité",
    ],
    "Détective Lone Star": [
      "Armes à feu",
      "Combat à mains nues",
      "Enquête",
      "Étiquette (La rue)",
      "Informatique",
      "Perception",
      "Pistolets",
      "Psychologie",
    ],
    "SWAT Knight Errant": [
      "Armes à feu (GC)",
      "Armes automatiques",
      "Athlétisme (GC)",
      "Combat rapproché (GC)",
      "Explosifs",
      "Perception",
    ],
    "Unité anti-magie": [
      "Armes à feu",
      "Combat à mains nues",
      "Observation astrale",
      "Perception",
      "Pistolets",
      "Résistance aux sorts",
    ],
    // --- Crime organisé ---
    "Soldat Mafia": [
      "Armes automatiques",
      "Armes tranchantes",
      "Combat à mains nues",
      "Intimidation",
      "Perception",
      "Pistolets",
    ],
    "Capo Mafia": [
      "Armes automatiques",
      "Armes tranchantes",
      "Combat à mains nues",
      "Intimidation",
      "Leadership",
      "Négociation",
      "Pistolets",
      "Perception",
    ],
    "Enforcer Yakuza": [
      "Armes tranchantes",
      "Combat à mains nues",
      "Intimidation",
      "Pistolets",
      "Étiquette (Yakuza)",
    ],
    "Wakagashira Yakuza": [
      "Armes tranchantes",
      "Combat à mains nues",
      "Intimidation",
      "Leadership",
      "Négociation",
      "Pistolets",
      "Étiquette (Yakuza)",
    ],
    "Courier Triade": [
      "Armes tranchantes",
      "Combat à mains nues",
      "Discrétion",
      "Pilotage",
      "Perception",
      "Pistolets",
    ],
    "Enforcer Triade": [
      "Armes tranchantes",
      "Combat à mains nues",
      "Intimidation",
      "Pistolets",
      "Arts martiaux",
      "Perception",
    ],
    "Vory v Zakone (muscle)": [
      "Armes automatiques",
      "Armes tranchantes",
      "Combat à mains nues",
      "Intimidation",
      "Pistolets",
      "Survie",
    ],
    "Koshari (contrebandier amérindien)": [
      "Armes à feu",
      "Combat à mains nues",
      "Discrétion",
      "Pilotage (aéronefs T-bird)",
      "Connaissance ésotérique",
      "Survie",
    ],
    // --- Militaire & mercenaire ---
    "Soldat UCAS": [
      "Armes à feu (GC)",
      "Athlétisme (GC)",
      "Combat rapproché (GC)",
      "Explosifs",
      "Perception",
      "Survie",
    ],
    "Soldat CAS": [
      "Armes à feu (GC)",
      "Athlétisme (GC)",
      "Combat rapproché (GC)",
      "Explosifs",
      "Perception",
      "Pilotage",
    ],
    "Commando NAN": [
      "Armes à feu (GC)",
      "Athlétisme (GC)",
      "Combat rapproché (GC)",
      "Discrétion",
      "Perception",
      "Survie",
      "Connaissance ésotérique",
    ],
    "Mercenaire freelance": [
      "Armes à feu (GC)",
      "Athlétisme (GC)",
      "Combat rapproché (GC)",
      "Explosifs",
      "Perception",
      "Pilotage",
      "Premiers soins",
    ],
    "Mercenaire Ares private": [
      "Armes à feu (GC)",
      "Athlétisme (GC)",
      "Combat rapproché (GC)",
      "Explosifs",
      "Électronique",
      "Perception",
    ],
    "Pilote militaire": [
      "Armes à feu",
      "Athlétisme",
      "Combat à mains nues",
      "Pilotage (aéronefs)",
      "Pilotage (drones)",
      "Perception",
      "Mécaniques aéro",
    ],
    "Agent de renseignement": [
      "Armes à feu",
      "Combat à mains nues",
      "Discrétion",
      "Électronique",
      "Étiquette",
      "Hacking",
      "Perception",
      "Psychologie",
    ],
    // --- Spécialisés ---
    Contrebandier: [
      "Armes à feu",
      "Combat à mains nues",
      "Discrétion",
      "Mécanique",
      "Pilotage (GC)",
      "Perception",
    ],
    "Passeur de frontière": [
      "Armes à feu",
      "Discrétion",
      "Étiquette",
      "Pilotage (GC)",
      "Survie",
      "Perception",
    ],
    "Pilote de location": [
      "Armes à feu",
      "Combat à mains nues",
      "Discrétion",
      "Pilotage (GC)",
      "Perception",
    ],
    "Trafiquant d'armes": [
      "Armes à feu",
      "Combat à mains nues",
      "Étiquette (La rue)",
      "Hardware",
      "Négociation",
      "Perception",
    ],
    "Dealer de rue": [
      "Armes tranchantes",
      "Combat à mains nues",
      "Discrétion",
      "Étiquette (La rue)",
      "Intimidation",
      "Perception",
    ],
    "Chimiste clandestin": [
      "Armes à feu",
      "Chimie",
      "Combat à mains nues",
      "Électronique",
      "Perception",
      "Premiers soins",
    ],
    "Cambrioleur professionnel": [
      "Acrobaties",
      "Armes à feu",
      "Combat à mains nues",
      "Crochetage",
      "Discrétion",
      "Électronique",
      "Perception",
    ],
    "Assassin freelance": [
      "Armes à feu",
      "Armes tranchantes",
      "Combat à mains nues",
      "Discrétion",
      "Imposition",
      "Perception",
      "Pistolets",
    ],
    Faussaire: [
      "Armes à feu",
      "Combat à mains nues",
      "Contrefaçon",
      "Électronique",
      "Hacking",
      "Perception",
    ],
    "Espion industriel": [
      "Armes à feu",
      "Combat à mains nues",
      "Discrétion",
      "Électronique",
      "Étiquette (Corporations)",
      "Hacking",
      "Perception",
    ],
    // --- Éveillés ---
    "Mage hermétique de rue": [
      "Contresort",
      "Conjuration (GC)",
      "Lancer de sorts",
      "Observation astrale",
      "Perception",
    ],
    "Chaman urbain": [
      "Conjuration (GC)",
      "Lancer de sorts",
      "Observation astrale",
      "Perception",
      "Survie",
    ],
    "Adepte de rue": [
      "Armes à feu",
      "Armes tranchantes",
      "Combat rapproché (GC)",
      "Discrétion",
      "Perception",
    ],
    "Mage Aztechnology (sacrifice)": [
      "Contresort",
      "Conjuration (GC)",
      "Lancer de sorts",
      "Observation astrale",
      "Perception",
      "Rituel sacrificiel",
    ],
    "Initié hermétique": [
      "Contresort",
      "Conjuration (GC)",
      "Lancer de sorts",
      "Magie rituelle",
      "Observation astrale",
      "Perception",
    ],
    // --- Techniciens ---
    "Rigger go-ganger": [
      "Armes à feu",
      "Combat à mains nues",
      "Hardware",
      "Pilotage (GC)",
      "Ingénierie (drones)",
      "Perception",
    ],
    "Rigger militaire": [
      "Armes à feu",
      "Athlétisme",
      "Hardware",
      "Pilotage (GC)",
      "Ingénierie (drones)",
      "Perception",
      "Explosifs",
    ],
    "Decker freelance": [
      "Cybercombat",
      "Électronique (GC)",
      "Hacking (GC)",
      "Informatique",
      "Perception",
      "Pistolets",
    ],
    "Technicien matriciel corpo": [
      "Cybercombat",
      "Électronique (GC)",
      "Hacking (GC)",
      "Informatique",
      "Perception",
    ],
    "Spécialiste contre-mesures": [
      "Cybercombat",
      "Électronique (GC)",
      "Hacking (GC)",
      "Hardware",
      "Informatique",
      "Perception",
    ],
  },

  /* ---- Nombre de compétences tirées par prof ---- */
  skillCount: { 0: 3, 1: 4, 2: 4, 3: 4, 4: 5, 5: 5, 6: 6 },

  /* ---- Compétences spéciales par spécialisation ---- */
  specialSkills: {
    Lieutenant: [
      { name: "Leadership", bonus: 3 },
      { name: "Intimidation", bonus: 2 },
    ],
    Decker: [
      { name: "Cybercombat", bonus: 5 },
      { name: "Électronique (GC)", bonus: 4 },
      { name: "Hacking (GC)", bonus: 6 },
      { name: "Informatique", bonus: 4 },
    ],
    Rigger: [
      { name: "Pilotage (GC)", bonus: 5 },
      { name: "Ingénierie (drones)", bonus: 5 },
      { name: "Hardware", bonus: 3 },
      { name: "Cybercombat (drones)", bonus: 3 },
    ],
    Adepte: [
      { name: "Combat rapproché (GC)", bonus: 3 },
      { name: "Discrétion", bonus: 2 },
    ],
    "Mage hermétique": [
      { name: "Contresort", bonus: 4 },
      { name: "Lancer de sorts", bonus: 4 },
      { name: "Observation astrale", bonus: 4 },
      { name: "Conjuration (GC)", bonus: 3 },
    ],
    Chaman: [
      { name: "Conjuration (GC)", bonus: 5 },
      { name: "Lancer de sorts", bonus: 3 },
      { name: "Observation astrale", bonus: 4 },
    ],
    Technomancien: [
      { name: "Compilation", bonus: 7 },
      { name: "Cybercombat", bonus: 6 },
      { name: "Décompilation", bonus: 6 },
      { name: "Informatique", bonus: 6 },
    ],
    "Mage Aztechnology": [
      { name: "Conjuration (GC)", bonus: 5 },
      { name: "Lancer de sorts", bonus: 5 },
      { name: "Observation astrale", bonus: 4 },
      { name: "Rituel sacrificiel", bonus: 3 },
    ],
  },

  sortsByTradition: {
    "Mage hermétique": [
      "Barrière physique",
      "Boule étourdissante",
      "Détection de la vie",
      "Éclair de force",
      "Lumière",
      "Silence",
      "Armure",
      "Clairvoyance",
      "Manipulation physique",
    ],
    Chaman: [
      "Guérison",
      "Invisibilité",
      "Lumière",
      "Manipulation physique",
      "Sommeil",
      "Confusion",
      "Armure",
      "Détection des ennemis",
    ],
    "Mage Aztechnology": [
      "Foudre sanglante",
      "Terreur",
      "Armure",
      "Éclair de force",
      "Invocation de serviteurs",
    ],
    "Initié hermétique": [
      "Barrière physique",
      "Boule étourdissante",
      "Détection de la vie",
      "Éclair de force",
      "Lumière",
      "Armure",
      "Clairvoyance",
      "Magie rituelle",
      "Initiation astrale",
    ],
  },

  augsBySpecial: {
    Lieutenant: (prof) =>
      prof >= 3
        ? [
            "Réflexes câblés 1",
            "Yeux cybernétiques (smartlink, vision nocturne)",
          ]
        : [],
    Decker: () => [
      "Datajack",
      "Cyberdeck Shiawase Cyber-5 (Att 8, FW 7, DP 5)",
    ],
    Rigger: () => [
      "Câblage de contrôle de véhicules",
      "Console de commande rigger",
    ],
    Adepte: () => [],
    "Mage hermétique": () => [],
    Chaman: () => [],
    Technomancien: () => ["Renfort naturel"],
    "Mage Aztechnology": () => [],
    Aucun: (prof) =>
      prof >= 4
        ? [
            Utils.rand([
              "Réflexes câblés 1",
              "Yeux cybernétiques (smartlink, vision nocturne)",
              "Accroissement de réaction 1",
              "Tonification musculaire 1",
              "Armure dermique 1",
            ]),
          ]
        : [],
  },

  /* ----
     POOLS D'ÉQUIPEMENT — par catégorie
     generate() tire dans la catégorie correspondant au prof/profession
  ---- */
  equipPools: {
    commlinks: {
      bas: [
        "Commlink Aztechnology Calible",
        "Commlink Meta Link (Indice 1)",
        "Commlink Sony Emperor (Indice 2)",
      ],
      moyen: [
        "Commlink Renraku Sensei (Indice 3)",
        "Commlink Hermes Ikon (Indice 4)",
      ],
      haut: [
        "Commlink Hermes Ikon (Indice 4)",
        "Commlink Erika Elite (Indice 4)",
        "Commlink Novatech Airware (Indice 5)",
      ],
      elite: [
        "Commlink Erika Elite (Indice 4)",
        "Commlink Hermes Ikon (Indice 5)",
        "Commlink Sony CIY-720 (Indice 5)",
      ],
    },
    pistoletsLegers: [
      "Ares Light Fire 75 [VD 6P, PA —, SA, 16(c)]",
      "Colt America L36 [VD 7P, PA —, SA, 11(c)]",
      "Fichetti Security 600 [PRE 6(7), VD 7P, PA —, SA, 30(c)]",
      "Heckler & Koch 227 [VD 7P, SA/TR, 10(c)]",
      "Ruger Super Warhawk [VD 9P, PA -2, CA, 6(c)] [bruyant]",
    ],
    pistoletsLourds: [
      "Ares Predator V [PRE 5(7), VD 8P, PA -1, SA, 15(c)]",
      "Browning Ultra-Power [PRE 5(6), VD 8P, PA -1, SA, 10(c)]",
      "Colt Manhunter [VD 8P, PA -1, SA, 16(c)]",
      "Ruger Super Warhawk [VD 9P, PA -2, CA, 6(c)]",
      "Sig Sauer P232 [VD 8P, PA -1, SA, 10(c)]",
    ],
    mitraillettes: [
      "Ares Sigma-3 [VD 7P, PA -1, SA/TR, 28(c)]",
      "Ceska Black Scorpion [PRE 5(7), VD 6P, SA/TR, 35(c)]",
      "Colt Cobra TZ-120 [PRE 4(5), VD 7P, SA/TR/TA, 32(c)]",
      "HK MP-5 TX [VD 7P, PA -2, SA/TR, 30(c)]",
      "Ingram Smartgun X [PRE 4(5), VD 8P, SA/TR, 32(c)]",
    ],
    fusilsAssaut: [
      "Ares Alpha [PRE 5(7), VD 11P, PA -2, SA/TR/TA, 42(c)]",
      "AK-97 [VD 10P, PA -6, SA/TR/TA, 38(c)]",
      "Colt M23 [VD 9P, PA -4, SA/TR, 40(c)]",
      "FN HAR [VD 10P, PA -6, SA/TR/TA, 35(c)]",
      "HK XM30 [VD 10P, PA -4, SA/TR, 36(c)]",
    ],
    snipers: [
      "Ares Desert Strike [VD 14P, PA -6, CA, 14(c)]",
      "Ranger Arms SM-5 [VD 14P, PA -6, CA, 15(c)]",
      "Remington 750 [VD 9P, PA -4, SA, 5(c)]",
      "Walther MA-2100 [VD 10P, PA -5, CA, 10(c)]",
    ],
    armesMelee: [
      "Couteau [PRE 5, Allonge —, VD 4P, PA -1]",
      "Couteau de combat [PRE 6, Allonge —, VD 6P, PA -2]",
      "Épée [PRE 6, Allonge 1, VD 7P, PA -2]",
      "Katana [PRE 6, Allonge 1, VD 7P, PA -2]",
      "Hache de combat [PRE 5, Allonge 1, VD 9P, PA -4]",
      "Matraque [PRE 4, Allonge 1, VD 6P, PA —]",
      "Massue [PRE 4, Allonge 1, VD 6P, PA —]",
      "Barre de métal [PRE 4, Allonge 1, VD 5P, PA —]",
      "Lame rétractable [cyberware, VD 7P, PA -2]",
      "Griffes de sabre [cyberware, VD 8P, PA -4]",
    ],
    electroarmes: [
      "Électromatraque [VD 9E(e), PA -5, Allonge 1, 10 charges]",
      "Defiance EX Shocker [Taser, VD 11E(e), PA -5, CC, 4(m)]",
      "Shock gloves [VD 8E(e), PA -5]",
    ],
    armures: {
      legere: [
        "Veste pare-balles [9]",
        "Armure légère [12]",
        "Manteau renforcé [9]",
        "Vêtements pare-balles [6]",
      ],
      moyenne: [
        "Armure corporelle [12]",
        "Veste blindée [12]",
        "Combinaison de sécurité [13]",
      ],
      lourde: [
        "Armure corporelle intégrale [15]",
        "Armure corporelle intégrale + Casque [15+3]",
        "Armure lourde [16]",
      ],
      militaire: [
        "Armure corporelle intégrale [15] + Casque [+3] + Isolation chimique",
        "Armure militaire EVO [17] + Casque intégral",
      ],
    },
    grenades: [
      "Grenade à fragmentation [VD 16P, Souffle 3m]",
      "Grenade fumigène [Souffle 10m de rayon]",
      "Grenade fumigène thermique [Souffle 10m de rayon]",
      "Grenade à plasma [VD 14P]",
      "Grenade flash-bang [VD 8S, Aveuglement]",
    ],
    cyberware: [
      "Réflexes câblés 1 [+1D6 initiative, +1 passe]",
      "Réflexes câblés 2 [+2D6 initiative, +2 passes]",
      "Accroissement de réaction (+1 REA)",
      "Tonification musculaire (+1 FOR)",
      "Yeux cybernétiques [Indice 2, smartlink, vision nocturne]",
      "Yeux cybernétiques [Indice 3, compensation antiflash, vision thermique]",
      "Oreilles cybernétiques [Indice 2, filtre de son]",
      "Bras cybernétique [FOR +2 à bras]",
      "Armure dermique (+1 armure)",
      "Lame rétractable [VD 7P, PA -2]",
      "Datajack [connexion directe commlink]",
    ],
    equipSpecial: [
      "Lunettes de soleil [interface visuelle, smartlink]",
      "Lunettes smartlink [Indice 2]",
      "Visière tactique [vision nocturne, smartlink]",
      "Lance-grappin",
      "Kit de premiers soins",
      "Menottes magnétiques",
      "Scanner de signatures magiques",
      "Détecteur de matrice [Indice 3]",
    ],
  },

  /* ----
     RÈGLE DE SÉLECTION D'ÉQUIPEMENT
     Par profession et professionnalisme, on sélectionne un profil
     qui tire dans les pools ci-dessus.
  ---- */
  equipProfile(profession, prof) {
    const p = prof;
    const pools = this.equipPools;

    // Commlink selon prof
    const commlink =
      p <= 1
        ? Utils.rand(pools.commlinks.bas)
        : p <= 3
          ? Utils.rand(pools.commlinks.moyen)
          : p <= 5
            ? Utils.rand(pools.commlinks.haut)
            : Utils.rand(pools.commlinks.elite);

    // Armure selon prof
    const armure =
      p <= 1
        ? Utils.rand(pools.armures.legere)
        : p <= 3
          ? Utils.rand(pools.armures.moyenne)
          : p <= 5
            ? Utils.rand(pools.armures.lourde)
            : Utils.rand(pools.armures.militaire);

    // Arme principale selon profession et prof
    const isHeavy = [
      "Samouraï rouge Renraku",
      "Séraphin Ares",
      "Commando Aztlan",
      "Soldat UCAS",
      "Soldat CAS",
      "Commando NAN",
      "Mercenaire freelance",
      "Mercenaire Ares private",
      "Forces spéciales / militaire",
      "SWAT Knight Errant",
      "Rigger militaire",
    ].some((p) => profession.includes(p.split(" ")[0]));

    let armePrincipale;
    if (p >= 5 || isHeavy) {
      armePrincipale = Utils.rand(pools.fusilsAssaut);
    } else if (p >= 3) {
      armePrincipale = Utils.rand([
        ...pools.mitraillettes,
        ...pools.fusilsAssaut,
      ]);
    } else if (p >= 1) {
      armePrincipale = Utils.rand([
        ...pools.pistoletsLourds,
        ...pools.mitraillettes,
      ]);
    } else {
      armePrincipale = Utils.rand([
        ...pools.pistoletsLegers,
        ...pools.pistoletsLourds,
      ]);
    }

    // Arme secondaire / de mêlée
    const armeSecondaire = Utils.rand([
      ...pools.armesMelee,
      ...pools.pistoletsLegers,
      ...pools.pistoletsLourds,
    ]);

    const result = [commlink, armePrincipale];

    // Arme de mêlée : gangs et pros du corps à corps
    const melee = [
      "Ganger",
      "Yakuza",
      "Triade",
      "Mafia",
      "Assassin",
      "Vory",
      "Adepte",
      "Cambrioleur",
      "Koshari",
    ].some((k) => profession.includes(k));
    if (melee || Utils.randBool(0.4)) {
      result.push(Utils.rand(pools.armesMelee));
    }

    // Électromatraque : flics et sécu
    const police = [
      "Flic",
      "Knight Errant",
      "Lone Star",
      "Agent de sécurité",
    ].some((k) => profession.includes(k));
    if (police) result.push(Utils.rand(pools.electroarmes));

    // Armure
    result.push(armure);

    // Grenades : prof 4+
    if (p >= 4 && Utils.randBool(0.5)) result.push(Utils.rand(pools.grenades));

    // Cyberware : prof 3+
    if (p >= 3) result.push(Utils.rand(pools.cyberware));
    if (p >= 5) result.push(Utils.rand(pools.cyberware));

    // Équip spécial : flics et sécu
    if (police || p >= 3) result.push(Utils.rand(pools.equipSpecial));

    return result;
  },

  /* ---- Génération principale ---- */
  generate(opts) {
    if (typeof Metavariants !== "undefined") Metavariants.use("sr5");
    let meta = opts.meta === "Aléatoire" ? Utils.randMeta() : opts.meta;

    // Résolution métavariante : une métavariante/conscience/zoocanthrope
    // remplace les ranges de sa souche et porte ses traits raciaux.
    const mv =
      typeof Metavariants !== "undefined" ? Metavariants.resolve(meta) : null;
    const souche = mv ? mv.souche : meta;
    // Bassin de noms : si non imposé, hériter de la métavariante
    let bassinOverride = null;
    if (mv && mv.bassins && (!opts.bassin || opts.bassin === "Aléatoire")) {
      bassinOverride = Utils.rand(mv.bassins);
    }

    const gender =
      opts.gender === "Aléatoire" ? Utils.randGender() : opts.gender;
    const prof =
      opts.prof === "Aléatoire" ? Utils.randInt(0, 6) : parseInt(opts.prof, 10);
    const profession =
      opts.profession === "Aléatoire"
        ? Utils.rand(this.formOptions.profession.slice(1))
        : opts.profession;

    // Spécialisation
    let special = opts.special || "Aucun";
    if (special === "Aléatoire") {
      special = Utils.randBool(0.18)
        ? Utils.rand([
            "Lieutenant",
            "Decker",
            "Adepte",
            "Mage hermétique",
            "Chaman",
            "Technomancien",
          ])
        : "Aucun";
    }

    // Attributs de base selon professionnalisme
    const profIdx = Utils.clamp(prof, 0, 6);
    const baseAttrs = { ...this.attrByProf[profIdx] };
    // Les modificateurs de PNJ suivent la souche (métatype parent)
    const mods = this.metaMod[souche] || {};
    // Les ranges suivent la métavariante si présente, sinon la souche
    const range = mv
      ? mv.ranges
      : this.attrRange[souche] || this.attrRange["Humain"];

    const attrs = {};
    for (const k of ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"]) {
      const raw = (baseAttrs[k] || 3) + (mods[k] || 0) + Utils.randInt(-1, 1);
      const lo = range[k] ? range[k][0] : 1;
      const hi = range[k] ? range[k][1] : 6;
      attrs[k] = Utils.clamp(raw, lo, hi);
    }
    attrs.ESS = baseAttrs.ESS;

    // Spécialisations magiques
    if (["Mage hermétique", "Chaman", "Adepte"].includes(special)) {
      attrs.MAG = Utils.clamp(prof + Utils.randInt(1, 2), 1, 6);
    }
    if (special === "Technomancien") {
      attrs.RES = Utils.clamp(prof + Utils.randInt(1, 2), 1, 6);
    }
    if (special === "Decker") {
      attrs.ESS = Utils.clamp(6 - Utils.randInt(1, 2), 3, 6);
    }

    // Limites naturelles
    const limPhys = Math.ceil((attrs.FOR * 2 + attrs.CON + attrs.REA) / 3);
    const limMent = Math.ceil((attrs.LOG * 2 + attrs.INT + attrs.VOL) / 3);
    const limSoc = Math.ceil((attrs.CHA * 2 + attrs.VOL + (prof || 0)) / 3);

    // Initiative
    const initData = this.initByProf[profIdx];
    const init = attrs.REA + attrs.INT;
    const initDice = special === "Adepte" && prof >= 3 ? 2 : initData.dice;

    // Résistance au Drain
    const drainResist = ["Mage hermétique", "Chaman"].includes(special)
      ? attrs.VOL + attrs.LOG
      : null;

    // Moniteurs
    const physMon = 8 + Math.ceil(attrs.CON / 2);
    const stunMon = 8 + Math.ceil(attrs.VOL / 2);

    // Compétences
    const skills = this._buildSkills(profession, prof, special);

    // Équipement
    const equip = this._buildEquip(profession, prof);

    // Augmentations
    const augsProducer =
      this.augsBySpecial[special] || this.augsBySpecial["Aucun"];
    const augs = augsProducer(prof);

    // Sorts
    const sortsList = this.sortsByTradition[special]
      ? this.sortsByTradition[special].slice(0, 2 + Math.floor(prof / 2))
      : [];

    const pnj = {
      id: Utils.uid(),
      edition: "sr5",
      name:
        opts.name && opts.name.trim()
          ? opts.name.trim()
          : Utils.genName(
              opts.bassin && opts.bassin !== "Aléatoire"
                ? opts.bassin
                : bassinOverride,
            ),
      meta: souche,
      metavariant: mv ? mv.name : null,
      metaFamille: mv ? mv.famille : null,
      metaTraits: mv ? mv.traits : [],
      gender,
      prof,
      profession,
      special,
      attrs,
      limPhys,
      limMent,
      limSoc,
      init,
      initDice,
      drainResist,
      physMon,
      stunMon,
      physFilled: 0,
      stunFilled: 0,
      armure: this.armureByProf[profIdx] || 0,
      skills,
      equip,
      augs,
      sorts: sortsList,
      notes: "",
    };

    // Couche d'habillage cohérente
    if (typeof Flavor !== "undefined") Flavor.apply(pnj);
    return pnj;
  },

  _buildSkills(profession, prof, special) {
    const p = Utils.clamp(prof, 0, 6);
    const pool =
      this.skillPools[profession] || this.skillPools["Voyou de bas étage"];
    const count = this.skillCount[p] || 4;

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const skills = shuffled.slice(0, count).map((name) => ({
      name,
      val: Utils.clamp(p + 2 + Utils.randInt(-1, 2), 1, 12),
    }));

    // Compétences de spécialisation — sans doublon avec le pool
    const existingNames = new Set(skills.map((s) => s.name));
    const specialList = this.specialSkills[special] || [];
    for (const s of specialList) {
      if (!existingNames.has(s.name)) {
        skills.push({
          name: s.name,
          val: Utils.clamp(p + s.bonus + Utils.randInt(0, 1), 1, 12),
        });
        existingNames.add(s.name);
      }
    }

    return skills;
  },

  _buildEquip(profession, prof) {
    return this.equipProfile(profession, prof);
  },

  recalc(pnj) {
    const { attrs, prof } = pnj;
    pnj.limPhys = Math.ceil((attrs.FOR * 2 + attrs.CON + attrs.REA) / 3);
    pnj.limMent = Math.ceil((attrs.LOG * 2 + attrs.INT + attrs.VOL) / 3);
    pnj.limSoc = Math.ceil((attrs.CHA * 2 + attrs.VOL + (prof || 0)) / 3);
    pnj.physMon = 8 + Math.ceil(attrs.CON / 2);
    pnj.stunMon = 8 + Math.ceil(attrs.VOL / 2);
    pnj.init = attrs.REA + attrs.INT;
    pnj.drainResist = ["Mage hermétique", "Chaman"].includes(pnj.special)
      ? attrs.VOL + attrs.LOG
      : null;
    return pnj;
  },
};
