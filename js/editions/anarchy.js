"use strict";

/* ============================================================
   ÉDITION ANARCHY 2E — Shadowrun Anarchy 2e édition

   MÉCANIQUE CLEF :
   - 5 attributs : FOR / AGI / VOL / LOG / CHA
   - Compétences avec pool composé : score + attribut associé
   - Réduction de Risque (RR) : dés retirés au pool adverse
   - Seuils de blessures : Physiques / Mentales (/ Matricielles)
   - Combativité : nulle / faible / forte / extrême
   - Atouts au choix (cyberware, drogues, traits, équipements)
   - PNJ "second rôle" : on utilise le nombre de succès moyen
   - PNJ "premier rôle" : on lance les dés + points d'Anarchy
   ============================================================ */
const EditionAnarchy = {
  id: "anarchy",
  label: "Anarchy 2e",
  badgeLabel: "ANARCHY 2E",
  isWip: false,

  /* ---- Options du formulaire ---- */
  formOptions: {
    meta: ["Aléatoire", "Humain", "Elfe", "Nain", "Ork", "Troll"],
    gender: ["Aléatoire", "M", "F", "NB"],
    rang: ["Aléatoire", "Figurant", "Figurant d'élite", "Lieutenant", "Boss"],
    profession: [
      "Aléatoire",
      "Ganger",
      "Ganger d'élite",
      "Ganger éveillé",
      "Ganger adepte",
      "Ganger decker",
      "Agent de sécurité",
      "Officier de sécurité",
      "Officier d'élite",
      "Mage de sécurité",
      "Mage d'élite",
      "Adepte de sécurité",
      "Adepte d'élite",
      "Decker de sécurité",
      "Decker d'élite",
      "Militaire",
      "Commando militaire",
      "Johnson",
      "Employé corporatiste",
      "Enquêteur",
    ],
  },

  /* ---- Attributs de base par métatype ----
     Anarchy 2e : FOR / AGI / VOL / LOG / CHA uniquement
     Les valeurs entre parenthèses dans le livre sont des variantes métatype
  ---- */
  attrBase: {
    // [FOR, AGI, VOL, LOG, CHA]
    Humain: { FOR: 3, AGI: 3, VOL: 3, LOG: 3, CHA: 3 },
    Elfe: { FOR: 3, AGI: 3, VOL: 3, LOG: 3, CHA: 3 }, // bonus CHA/AGI selon profil
    Nain: { FOR: 3, AGI: 3, VOL: 3, LOG: 3, CHA: 3 }, // bonus VOL/LOG/FOR
    Ork: { FOR: 4, AGI: 3, VOL: 3, LOG: 3, CHA: 2 },
    Troll: { FOR: 5, AGI: 2, VOL: 3, LOG: 2, CHA: 1 },
  },

  /* ---- Profils complets tirés du livre de base ----
     Format par profil :
     {
       label,       // nom affiché
       attrs,       // { FOR, AGI, VOL, LOG, CHA } valeurs humain de base
       attrsMeta,   // overrides par métatype { 'Ork': { FOR:4 }, ... }
       skills,      // [ { name, val, attr, rr, spec?, specVal?, specAttr?, specRR? } ]
       atouts,      // atouts fixes (toujours présents)
       atoutsChoix, // nb d'atouts au choix parmi atoutsOptions
       atoutsOptions,
       armes,       // [ { name, vd, portees } ]  portees = string '[OK/OK/...]'
       equip,       // string[]
       combativite, // 'nulle'|'faible'|'forte'|'extrême'
       seuilsPhys,  // [leger, moyen, grave]  base humain
       seuilsPhysMeta, // { 'Ork': [5,8,11], ... }
       seuils_ment, // [leger, moyen, grave]
       seuils_ment_meta,
       seuilsMat,   // null ou [leger, moyen, grave]  (deckers)
       eveille,     // null | 'hermétique' | 'adepte' | 'chamanique'
       sorts,       // string[] (si éveillé)
     }
  ---- */
  profils: {
    /* ======== GANGERS ======== */
    Ganger: {
      label: "Ganger",
      attrs: { FOR: 3, AGI: 2, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 4 }, Troll: { FOR: 5 }, Nain: {}, Elfe: {} },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Déf. à distance", val: 3, attr: "AGI", rr: 0, spec: true },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Combat rapproché",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Lames",
          specVal: 4,
          specRR: 0,
        },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        {
          name: "Influence",
          val: 2,
          attr: "CHA",
          rr: 0,
          spec: "Intimidation",
          specVal: 3,
          specRR: 0,
        },
      ],
      atouts: [],
      atoutsChoix: 1,
      atoutsOptions: [
        "Substituts musculaires (cyberware) : VD +1 en combat rapproché",
        "Jazz (drogue) : +1 action par combat",
        "Bras cybernétique (cyberware) : RR 1 aux tests de Combat rapproché",
        "Zélé (trait) : Avantage vs intimidation/peur ; combativité forte",
        "Armure dermique (cyberware) : Armure +1",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Couteau",
          vdBase: 4,
          vdMeta: { Ork: 5, Troll: 6 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Pistolet léger",
          vdBase: 4,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Synthécuir aux couleurs du gang (Armure 1)"],
      combativite: "faible",
      seuilsPhys: [4, 7, 10],
      seuilsPhysMeta: {
        Ork: [5, 8, 11],
        Troll: [6, 9, 12],
        Nain: null,
        Elfe: null,
      },
      seuils_ment: [2, 5, 8],
      seuils_ment_meta: { Nain: [3, 6, 9] },
      seuilsMat: null,
      eveille: null,
    },

    "Ganger d'élite": {
      label: "Ganger d'élite / Membre syndicat",
      attrs: { FOR: 3, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 4 },
        Troll: { FOR: 5 },
        Nain: {},
        Elfe: { AGI: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Déf. à distance", val: 4, attr: "AGI", rr: 0, spec: true },
        {
          name: "Armes à distance",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Mitraillettes",
          specVal: 4,
          specRR: 0,
        },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Lames",
          specVal: 4,
          specRR: 0,
        },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        {
          name: "Influence",
          val: 3,
          attr: "CHA",
          rr: 0,
          spec: "Intimidation",
          specVal: 3,
          specRR: 0,
        },
      ],
      atouts: [],
      atoutsChoix: 2,
      atoutsOptions: [
        "Substituts musculaires (cyberware) : VD +1 en combat rapproché",
        "Jazz (drogue) : +1 action par combat",
        "Bras cybernétique (cyberware) : RR 1 au Combat rapproché",
        "Zélé (trait) : Avantage vs intimidation/peur ; combativité forte",
        "Armure dermique (cyberware) : Armure +1",
        "Yeux cybernétiques + smartlink (cyberware) : RR 1 aux Armes à distance (mitraillettes), vision nocturne",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Arme longue",
          vdBase: 5,
          vdMeta: { Ork: 6, Troll: 7 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
        {
          name: "Mitraillette",
          vdBase: 5,
          vdMeta: {},
          portees: "[Dés./OK/OK/–]",
        },
      ],
      equip: ["Commlink", "Manteau renforcé (Armure 2)"],
      combativite: "faible",
      seuilsPhys: [5, 8, 11],
      seuilsPhysMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      seuils_ment: [2, 5, 8],
      seuils_ment_meta: { Nain: [3, 6, 9] },
      seuilsMat: null,
      eveille: null,
    },

    "Ganger éveillé": {
      label: "Ganger éveillé",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: { VOL: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          specMeta: { Ork: { val: 3 }, Troll: { val: 3 } },
        },
        { name: "Déf. à distance", val: 3, attr: "AGI", rr: 0, spec: true },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        {
          name: "Sorcellerie",
          val: 3,
          attr: "VOL",
          rr: 0,
          spec: "Sorts de combat",
          specVal: 4,
          specRR: 0,
        },
        {
          name: "Conjuration",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Esprits du feu",
          specVal: 4,
          specRR: 0,
        },
        { name: "Influence", val: 2, attr: "CHA", rr: 0 },
        { name: "Intimidation", val: 3, attr: "CHA", rr: 0 },
      ],
      atouts: [
        "Éveillé (tradition au choix) : Perception & projection astrale, Sorcellerie, Conjuration",
      ],
      atoutsChoix: 1,
      atoutsOptions: [
        "Focus de combat (équipement) : RR 1 aux tests de Sorcellerie (combat)",
        "Focus de feu (équipement) : RR 1 aux tests de Conjuration (esprits du feu)",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Couteau",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          portees: "[OK/–/–/–]",
        },
      ],
      equip: ["Commlink", "Synthécuir aux couleurs du gang (Armure 1)"],
      combativite: "faible",
      seuilsPhys: [3, 6, 9],
      seuilsPhysMeta: { Ork: [4, 7, 10], Troll: [5, 8, 11] },
      seuils_ment: [3, 6, 9],
      seuils_ment_meta: { Nain: [4, 7, 10] },
      seuilsMat: null,
      eveille: "hermétique",
      sorts: ["Armure", "Trait de feu", "Éclair mana", "Invisibilité", "Soins"],
    },

    "Ganger adepte": {
      label: "Ganger adepte",
      attrs: { FOR: 2, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 3 }, Troll: { FOR: 4 }, Nain: {}, Elfe: {} },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          specMeta: { Ork: { val: 4 }, Troll: { val: 4 } },
        },
        { name: "Déf. à distance", val: 4, attr: "AGI", rr: 0, spec: true },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Mains nues",
          specVal: 4,
          specRR: 0,
        },
        {
          name: "Furtivité",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 3,
          specRR: 0,
        },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        { name: "Influence", val: 2, attr: "CHA", rr: 0 },
        { name: "Intimidation", val: 3, attr: "CHA", rr: 0 },
      ],
      atouts: ["Éveillé : Adepte"],
      atoutsChoix: 1,
      atoutsOptions: [
        "Sens du combat : RR 1 aux tests d'Athlétisme (déf. dist.) et Combat rapproché (défense)",
        "Frappe élémentaire électrique : VD +1 à mains nues, fait perdre une action en cas de blessure",
        "Réflexes améliorés : +1 action par combat",
        "Furtivité améliorée : RR 1 aux tests de Furtivité (discrétion physique)",
        "Combat rapproché amélioré : RR 1 aux tests de Combat rapproché (mains nues)",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          portees: "[OK/–/–/–]",
        },
      ],
      equip: ["Commlink", "Synthécuir aux couleurs du gang (Armure 1)"],
      combativite: "faible",
      seuilsPhys: [3, 6, 9],
      seuilsPhysMeta: { Ork: [4, 7, 10], Troll: [5, 8, 11] },
      seuils_ment: [2, 5, 8],
      seuils_ment_meta: { Nain: [3, 6, 9] },
      seuilsMat: null,
      eveille: "adepte",
      sorts: [],
    },

    "Ganger decker": {
      label: "Ganger decker",
      attrs: { FOR: 2, AGI: 2, VOL: 2, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { LOG: 4 },
        Elfe: {},
      },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          specMeta: { Ork: { val: 3 }, Troll: { val: 3 } },
        },
        { name: "Déf. à distance", val: 2, attr: "AGI", rr: 0, spec: true },
        { name: "Armes à distance", val: 2, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 2, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        {
          name: "Électronique",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Recherche matricielle",
          specVal: 3,
          specRR: 0,
        },
        {
          name: "Piratage",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Force brute",
          specVal: 4,
          specRR: 0,
        },
        { name: "Cybercombat", val: 3, attr: "VOL", rr: 0 },
      ],
      atouts: [
        "Cyberdeck (Attaque 1, Firewall 2)",
        "Datajack (cyberware) : IND, RV cold-sim",
      ],
      atoutsChoix: 1,
      atoutsOptions: [
        "Programme Exploitation : RR 1 aux tests de Piratage (force brute)",
        "Programme Agresseur : RR 1 aux tests de Cybercombat",
        "Programme Navigateur : RR 1 aux tests d'Électronique (recherche matricielle)",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Couteau",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Pistolet léger",
          vdBase: 4,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
        { name: "Cybercombat", vdBase: 1, vdMeta: {}, portees: "[matriciel]" },
      ],
      equip: ["Commlink", "Synthécuir aux couleurs du gang (Armure 1)"],
      combativite: "faible",
      seuilsPhys: [3, 6, 9],
      seuilsPhysMeta: { Ork: [4, 7, 10], Troll: [5, 8, 11] },
      seuils_ment: [2, 5, 8],
      seuils_ment_meta: { Nain: [3, 6, 9] },
      seuilsMat: [2, 5, 8],
      eveille: null,
    },

    /* ======== SÉCURITÉ / POLICE ======== */
    "Agent de sécurité": {
      label: "Agent de sécurité / Flic des rues",
      attrs: { FOR: 3, AGI: 2, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 4 }, Troll: { FOR: 5 }, Nain: {}, Elfe: {} },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Déf. à distance", val: 3, attr: "AGI", rr: 0, spec: true },
        {
          name: "Armes à distance",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Pistolets",
          specVal: 3,
          specRR: 0,
        },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 2, attr: "AGI", rr: 0 },
        {
          name: "Perception",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Physique",
          specVal: 4,
          specRR: 0,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
        { name: "Intimidation", val: 3, attr: "CHA", rr: 0 },
      ],
      atouts: [],
      atoutsChoix: 1,
      atoutsOptions: [
        "Smartlink (cyberware) : RR 1 aux tests d'Armes à distance (pistolets)",
        "Yeux cybernétiques (cyberware) : RR 1 aux tests de Perception (physique)",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/–/–/–], perte action",
        },
        {
          name: "Pistolet léger",
          vdBase: 4,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Gilet pare-balles (Armure 3)"],
      combativite: "faible",
      seuilsPhys: [6, 9, 12],
      seuilsPhysMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      seuils_ment: [2, 5, 8],
      seuils_ment_meta: { Nain: [3, 6, 9] },
      seuilsMat: null,
      eveille: null,
    },

    "Officier de sécurité": {
      label: "Officier de sécurité / Police",
      attrs: { FOR: 3, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 4 }, Troll: { FOR: 5 }, Nain: {}, Elfe: {} },
      skills: [
        { name: "Athlétisme", val: 4, attr: "FOR", rr: 0 },
        { name: "Déf. à distance", val: 4, attr: "AGI", rr: 0, spec: true },
        {
          name: "Armes à distance",
          val: 5,
          attr: "AGI",
          rr: 1,
          spec: "Mitraillettes/Shotguns",
          specVal: 5,
          specRR: 1,
        },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Armes contondantes",
          specVal: 4,
          specRR: 0,
        },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Perception",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Physique",
          specVal: 4,
          specRR: 1,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      atouts: [
        "Yeux cybernétiques avec identification de cibles : RR 1 Armes à distance et Perception (physique), vision nocturne",
      ],
      atoutsChoix: 1,
      atoutsOptions: [
        "Réflexes câblés (cyberware) : +1 action par combat",
        "Armure dermique (cyberware) : Armure +1",
        "Smartlink (cyberware) : RR 1 aux tests d'Armes à distance (mitraillettes ou shotguns)",
        "Câblage de compétence (cyberware) : RR 1 aux tests de Combat rapproché (armes contondantes)",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/–/–/–], perte action",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
        {
          name: "Mitraillette OU Shotgun",
          choices: [
            {
              name: "Mitraillette",
              vdBase: 5,
              vdMeta: {},
              portees: "[Dés./OK/OK/–]",
            },
            {
              name: "Shotgun",
              vdBase: 8,
              vdMeta: {},
              portees: "[Dés./OK/Dés./–]",
            },
          ],
        },
      ],
      equip: [
        "Commlink",
        "Gilet pare-balles (Armure 3)",
        "Bouclier anti-émeutes optionnel (Armure +1)",
      ],
      combativite: "faible",
      seuilsPhys: [6, 9, 12],
      seuilsPhysMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      seuils_ment: [2, 5, 8],
      seuils_ment_meta: { Nain: [3, 6, 9] },
      seuilsMat: null,
      eveille: null,
    },

    "Officier d'élite": {
      label: "Officier d'élite de sécurité / Police",
      attrs: { FOR: 3, AGI: 4, VOL: 3, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 4 },
        Troll: { FOR: 5 },
        Nain: { AGI: 4 },
        Elfe: {},
      },
      skills: [
        {
          name: "Athlétisme",
          val: 4,
          attr: "FOR",
          rr: 0,
          specMeta: { Troll: { val: 5 } },
        },
        { name: "Déf. à distance", val: 5, attr: "AGI", rr: 0, spec: true },
        {
          name: "Armes à distance",
          val: 5,
          attr: "AGI",
          rr: 1,
          spec: "Arme principale",
          specVal: 8,
          specRR: 3,
        },
        {
          name: "Combat rapproché",
          val: 5,
          attr: "AGI",
          rr: 1,
          spec: "Armes contondantes",
          specVal: 6,
          specRR: 1,
        },
        {
          name: "Furtivité",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 5,
          specRR: 0,
        },
        {
          name: "Perception",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Physique",
          specVal: 5,
          specRR: 1,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      atouts: [
        "Réflexes câblés (cyberware) : +1 action par narration",
        "Yeux cybernétiques + réseau tactique : RR 1 Armes à distance et Perception (physique), anti-flash, vision nocturne",
        "Smartlink (cyberware) : RR 2 aux tests d'Armes à distance (arme principale)",
        "Câblage de compétence (cyberware) : RR 1 aux tests de Combat rapproché",
      ],
      atoutsChoix: 1,
      atoutsOptions: [
        "Armure dermique (cyberware) : Armure +1",
        "Combinaison caméléon : RR 1 aux tests de Furtivité (discrétion physique)",
        "Producteur de plaquettes (bioware) : +1 blessure légère",
        "Réseau tactique avancé : RR 1 aux tests d'Athlétisme (défense à distance)",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/–/–/–], perte action",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
        {
          name: "Arme lourde au choix",
          choices: [
            {
              name: "Shotgun",
              vdBase: 8,
              vdMeta: {},
              portees: "[Dés./OK/Dés./–]",
            },
            {
              name: "Fusil d'assaut",
              vdBase: 7,
              vdMeta: {},
              portees: "[Dés./OK/OK/Dés.]",
            },
            {
              name: "Fusil de précision",
              vdBase: 10,
              vdMeta: {},
              portees: "[–/Dés./Dés./OK]",
            },
            {
              name: "Mitrailleuse",
              vdBase: 9,
              vdMeta: {},
              portees: "[–/OK/OK/OK]",
            },
          ],
        },
      ],
      equip: [
        "Commlink",
        "Armure intégrale + Casque (Armure 4)",
        "Bouclier balistique optionnel (Armure +1)",
      ],
      combativite: "forte",
      seuilsPhys: [7, 10, 13],
      seuilsPhysMeta: { Ork: [8, 11, 14], Troll: [9, 12, 15] },
      seuils_ment: [3, 6, 9],
      seuils_ment_meta: { Nain: [4, 7, 10] },
      seuilsMat: null,
      eveille: null,
    },

    "Mage de sécurité": {
      label: "Mage de sécurité / Police",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: {},
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Déf. à distance", val: 4, attr: "AGI", rr: 0, spec: true },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Perception",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Astrale",
          specVal: 4,
          specRR: 0,
        },
        {
          name: "Sorcellerie",
          val: 4,
          attr: "VOL",
          rr: 0,
          spec: "Sorts de combat",
          specVal: 4,
          specRR: 0,
        },
        {
          name: "Conjuration",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Esprits des aînés",
          specVal: 4,
          specRR: 0,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      atouts: [
        "Éveillé (tradition hermétique) : Perception & projection astrale, Sorcellerie, Conjuration",
        "Focus de maintien : maintien de 2 sorts sans malus, 4 avec désavantage",
      ],
      atoutsChoix: 1,
      atoutsOptions: [
        "Focus de combat : RR 2 aux tests de Sorcellerie (sorts de combat)",
        "Focus de détection : RR 2 aux tests de Sorcellerie (sorts de détection)",
        "Focus des aînés : RR 2 aux tests de Conjuration (esprits des aînés)",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/–/–/–], perte action",
        },
        {
          name: "Pistolet léger",
          vdBase: 4,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Gilet pare-balles (Armure 3)"],
      combativite: "faible",
      seuilsPhys: [5, 8, 11],
      seuilsPhysMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      seuils_ment: [3, 6, 9],
      seuils_ment_meta: { Nain: [4, 7, 10] },
      seuilsMat: null,
      eveille: "hermétique",
      sorts: [
        "Analyse de véracité",
        "Armure",
        "Confusion",
        "Détection des ennemis",
        "Éclair étourdissant",
        "Foudre",
        "Sens du combat",
        "Soins",
      ],
    },

    "Mage d'élite": {
      label: "Mage d'élite de sécurité / Police",
      attrs: { FOR: 2, AGI: 3, VOL: 4, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 5 },
        Elfe: {},
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          specMeta: { Ork: { val: 4 }, Troll: { val: 4 } },
        },
        { name: "Déf. à distance", val: 4, attr: "AGI", rr: 0, spec: true },
        { name: "Combat rapproché", val: 4, attr: "AGI", rr: 0 },
        { name: "Armes à distance", val: 4, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 4, attr: "AGI", rr: 0 },
        {
          name: "Perception",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Astrale",
          specVal: 5,
          specRR: 0,
        },
        {
          name: "Sorcellerie",
          val: 5,
          attr: "VOL",
          rr: 1,
          spec: "Sorts de combat",
          specVal: 8,
          specRR: 3,
        },
        {
          name: "Conjuration",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Esprits des aînés",
          specVal: 5,
          specRR: 0,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      atouts: [
        "Éveillé (tradition hermétique) : Perception & projection astrale, Sorcellerie, Conjuration",
        "Focus de maintien : maintien de 3 sorts sans malus, 6 avec malus",
        "Focus de sorcellerie : RR 1 aux tests de Sorcellerie",
        "Focus de combat : RR 2 aux tests de Sorcellerie (sorts de combat)",
      ],
      atoutsChoix: 1,
      atoutsOptions: [
        "Focus de détection : RR 1 aux tests de Sorcellerie (sorts de détection)",
        "Focus d'illusion : RR 1 aux tests de Sorcellerie (sorts d'illusion)",
        "Focus de manipulation : RR 1 aux tests de Sorcellerie (sorts de manipulation)",
        "Focus des aînés : RR 2 aux tests de Conjuration (esprits des aînés)",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/–/–/–], perte action",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Armure intégrale + Casque (Armure 4)"],
      combativite: "forte",
      seuilsPhys: [6, 9, 12],
      seuilsPhysMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      seuils_ment: [4, 7, 10],
      seuils_ment_meta: { Nain: [5, 8, 11] },
      seuilsMat: null,
      eveille: "hermétique",
      sorts: [
        "Armure",
        "Augmentation de réflexes",
        "Barrière physique",
        "Confusion",
        "Détection des ennemis",
        "Éclair étourdissant",
        "Foudre",
        "Invisibilité",
        "Sens du combat",
        "Soins",
      ],
    },

    "Adepte de sécurité": {
      label: "Adepte de sécurité / Police",
      attrs: { FOR: 3, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 4 }, Troll: { FOR: 5 }, Nain: {}, Elfe: {} },
      skills: [
        { name: "Athlétisme", val: 4, attr: "FOR", rr: 0 },
        { name: "Déf. à distance", val: 4, attr: "AGI", rr: 0, spec: true },
        { name: "Armes à distance", val: 4, attr: "AGI", rr: 0 },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Mains nues",
          specVal: 5,
          specRR: 1,
        },
        {
          name: "Furtivité",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 4,
          specRR: 0,
        },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      atouts: [
        "Éveillé : Adepte",
        "Combat rapproché amélioré (pouvoir d'adepte) : RR 1 aux tests de Combat rapproché (mains nues)",
      ],
      atoutsChoix: 1,
      atoutsOptions: [
        "Sens du combat : RR 1 aux tests d'Athlétisme (déf. dist.) et Combat rapproché (défense)",
        "Frappe élémentaire électrique : VD +2 mains nues, perte action cible si blessure",
        "Réflexes améliorés : +1 action par combat",
        "Furtivité améliorée : RR 1 aux tests de Furtivité (discrétion physique)",
        "Combat rapproché amélioré (amélioration) : RR 2 aux tests de Combat rapproché (mains nues)",
        "Course sur les murs : RR 1 aux tests d'Athlétisme (course)",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Gilet pare-balles (Armure 3)"],
      combativite: "faible",
      seuilsPhys: [6, 9, 12],
      seuilsPhysMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      seuils_ment: [2, 5, 8],
      seuils_ment_meta: { Nain: [3, 6, 9] },
      seuilsMat: null,
      eveille: "adepte",
      sorts: [],
    },

    "Adepte d'élite": {
      label: "Adepte d'élite de sécurité / Police",
      attrs: { FOR: 4, AGI: 4, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 5 }, Troll: { FOR: 6 }, Nain: {}, Elfe: {} },
      skills: [
        {
          name: "Athlétisme",
          val: 4,
          attr: "FOR",
          rr: 0,
          specMeta: { Ork: { val: 5 }, Troll: { val: 5 } },
        },
        { name: "Déf. à distance", val: 6, attr: "AGI", rr: 1, spec: true },
        { name: "Armes à distance", val: 4, attr: "AGI", rr: 0 },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Mains nues",
          specVal: 8,
          specRR: 3,
        },
        {
          name: "Furtivité",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 5,
          specRR: 0,
        },
        { name: "Perception", val: 4, attr: "LOG", rr: 0 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      atouts: [
        "Éveillé : Adepte",
        "Combat rapproché amélioré : RR 3 aux tests de Combat rapproché (mains nues)",
        "Sens du combat : RR 1 aux tests d'Athlétisme (déf. dist.) et Combat rapproché (défense)",
        "Réflexes améliorés : +1 action par narration",
      ],
      atoutsChoix: 1,
      atoutsOptions: [
        "Armure mystique : Armure +1 (physique et magique)",
        "Frappe élémentaire électrique : VD +2 mains nues, perte action cible si blessure",
        "Course sur les murs : RR 1 aux tests d'Athlétisme (course)",
        "Furtivité améliorée : RR 2 aux tests de Furtivité (discrétion physique)",
        "Perception améliorée : RR 2 aux tests de Perception (physique)",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 4,
          vdMeta: { Ork: 5, Troll: 6 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Armure intégrale + Casque (Armure 4)"],
      combativite: "forte",
      seuilsPhys: [8, 11, 14],
      seuilsPhysMeta: { Ork: [9, 12, 15], Troll: [10, 13, 16] },
      seuils_ment: [2, 5, 8],
      seuils_ment_meta: { Nain: [3, 6, 9] },
      seuilsMat: null,
      eveille: "adepte",
      sorts: [],
    },

    "Decker de sécurité": {
      label: "Decker de sécurité / Police",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { LOG: 4 },
        Elfe: {},
      },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          specMeta: { Ork: { val: 3 }, Troll: { val: 3 } },
        },
        { name: "Déf. à distance", val: 3, attr: "AGI", rr: 0, spec: true },
        { name: "Armes à distance", val: 2, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 2, attr: "AGI", rr: 0 },
        {
          name: "Furtivité",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 4,
          specRR: 0,
        },
        {
          name: "Perception",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Matricielle",
          specVal: 4,
          specRR: 0,
        },
        {
          name: "Électronique",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Protection matricielle",
          specVal: 4,
          specRR: 0,
        },
        {
          name: "Piratage",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Cybercombat",
          specVal: 4,
          specRR: 0,
        },
      ],
      atouts: [
        "Cyberdeck (Attaque 4, Firewall 4)",
        "Datajack (cyberware) : IND, RV cold-sim",
      ],
      atoutsChoix: 1,
      atoutsOptions: [
        "Programme Agresseur : RR 2 aux tests de Piratage (cybercombat)",
        "Programme Exploitation : RR 2 aux tests de Piratage (force brute)",
        "Programme Moniteur : RR 2 aux tests d'Électronique (protection matricielle)",
        "Programme Navigateur : RR 2 aux tests d'Électronique (recherche matricielle)",
        "Cyberjack : IND, RV cold-sim, +1 action par narration en RV",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/–/–/–], perte action",
        },
        {
          name: "Pistolet léger",
          vdBase: 4,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
        { name: "Cybercombat", vdBase: 4, vdMeta: {}, portees: "[matriciel]" },
      ],
      equip: ["Commlink", "Gilet pare-balles (Armure 3)"],
      combativite: "faible",
      seuilsPhys: [5, 8, 11],
      seuilsPhysMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      seuils_ment: [3, 6, 9],
      seuils_ment_meta: { Nain: [4, 7, 10] },
      seuilsMat: [4, 7, 10],
      eveille: null,
    },

    "Decker d'élite": {
      label: "Decker d'élite de sécurité / Police",
      attrs: { FOR: 2, AGI: 3, VOL: 3, LOG: 4, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { LOG: 4 },
        Elfe: {},
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Déf. à distance", val: 4, attr: "AGI", rr: 0, spec: true },
        { name: "Armes à distance", val: 4, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Furtivité",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 5,
          specRR: 0,
        },
        {
          name: "Perception",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Matricielle",
          specVal: 5,
          specRR: 0,
        },
        {
          name: "Électronique",
          val: 5,
          attr: "LOG",
          rr: 1,
          spec: "Protection matricielle",
          specVal: 6,
          specRR: 1,
        },
        {
          name: "Piratage",
          val: 5,
          attr: "LOG",
          rr: 1,
          spec: "Cybercombat",
          specVal: 6,
          specRR: 1,
        },
      ],
      atouts: [
        "Cyberdeck (Attaque 5, Firewall 5, filtre biofeedback : Armure +1)",
        "Cyberjack : IND, RV hot-sim, +1 action par narration en RV",
        "Compétences câblées : RR 1 aux tests d'Électronique et de Piratage",
      ],
      atoutsChoix: 2,
      atoutsOptions: [
        "Programme Exploitation : RR 2 aux tests de Piratage (force brute)",
        "Programme Agresseur : RR 2 aux tests de Piratage (cybercombat)",
        "Programme Biofeedback : inflige des dommages de biofeedback en cybercombat",
        "Programme Marteau : VD +2 en cybercombat",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/–/–/–], perte action",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
        {
          name: "Cybercombat",
          vdBase: 5,
          vdMeta: {},
          portees: "[matriciel]",
          note: "VD 7 avec programme Marteau",
        },
      ],
      equip: ["Commlink", "Armure intégrale + Casque (Armure 4)"],
      combativite: "forte",
      seuilsPhys: [6, 9, 12],
      seuilsPhysMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      seuils_ment: [3, 6, 9],
      seuils_ment_meta: { Nain: [4, 7, 10] },
      seuilsMat: [5, 8, 11],
      eveille: null,
    },

    /* ======== MILITAIRES ======== */
    Militaire: {
      label: "Militaire",
      attrs: { FOR: 3, AGI: 3, VOL: 3, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 4 },
        Troll: { FOR: 5 },
        Nain: { VOL: 4 },
        Elfe: {},
      },
      skills: [
        { name: "Athlétisme", val: 4, attr: "FOR", rr: 0 },
        { name: "Déf. à distance", val: 5, attr: "AGI", rr: 1, spec: true },
        {
          name: "Armes à distance",
          val: 5,
          attr: "AGI",
          rr: 1,
          spec: "Arme principale",
          specVal: 6,
          specRR: 2,
        },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Lames",
          specVal: 5,
          specRR: 1,
        },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Perception",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Physique",
          specVal: 4,
          specRR: 1,
        },
        { name: "Survie", val: 3, attr: "LOG", rr: 0 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      atouts: [
        "Yeux cybernétiques + réseau tactique + identification de cibles : RR 1 Armes à distance, Perception (physique) et Athlétisme (déf. dist.), vision nocturne",
        "Smartlink : RR 1 aux tests d'Armes à distance (arme principale)",
        "Câblage de compétence : RR 1 aux tests de Combat rapproché (lames)",
      ],
      atoutsChoix: 0,
      atoutsOptions: [],
      armes: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Couteau de combat",
          vdBase: 4,
          vdMeta: { Ork: 5, Troll: 6 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
        { name: "Grenades", vdBase: 7, vdMeta: {}, portees: "[OK/OK/Dés./–]" },
        {
          name: "Arme principale au choix",
          choices: [
            {
              name: "Shotgun",
              vdBase: 8,
              vdMeta: {},
              portees: "[Dés./OK/Dés./–]",
            },
            {
              name: "Fusil d'assaut",
              vdBase: 7,
              vdMeta: {},
              portees: "[Dés./OK/OK/Dés.]",
            },
            {
              name: "Mitrailleuse",
              vdBase: 9,
              vdMeta: {},
              portees: "[–/OK/OK/OK]",
            },
          ],
        },
      ],
      equip: ["Commlink", "Armure militaire (Armure 5)"],
      combativite: "forte",
      seuilsPhys: [8, 11, 14],
      seuilsPhysMeta: { Ork: [9, 12, 15], Troll: [10, 13, 16] },
      seuils_ment: [3, 6, 9],
      seuils_ment_meta: { Nain: [4, 7, 10] },
      seuilsMat: null,
      eveille: null,
    },

    "Commando militaire": {
      label: "Commando militaire",
      attrs: { FOR: 4, AGI: 4, VOL: 3, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 5 }, Troll: { FOR: 6 }, Nain: {}, Elfe: {} },
      skills: [
        {
          name: "Athlétisme",
          val: 4,
          attr: "FOR",
          rr: 0,
          specMeta: { Ork: { val: 5 }, Troll: { val: 5 } },
        },
        { name: "Déf. à distance", val: 6, attr: "AGI", rr: 1, spec: true },
        {
          name: "Armes à distance",
          val: 6,
          attr: "AGI",
          rr: 1,
          spec: "Fusils",
          specVal: 8,
          specRR: 3,
        },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Lames",
          specVal: 7,
          specRR: 2,
        },
        {
          name: "Furtivité",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 5,
          specRR: 0,
        },
        {
          name: "Perception",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Physique",
          specVal: 5,
          specRR: 1,
        },
        { name: "Survie", val: 5, attr: "LOG", rr: 1 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      atouts: [
        "Yeux cybernétiques + réseau tactique + identification de cibles : RR 1 Armes à distance, Perception (physique) et Athlétisme (déf. dist.), vision nocturne",
        "Smartlink : RR 2 aux tests d'Armes à distance (fusils)",
        "Câblage de compétence : RR 2 aux tests de Combat rapproché (lames)",
        "Réflexes câblés : +1 action par narration",
        "Armure dermique : Armure +1",
        "Kit de survie en milieu hostile : RR 1 aux tests de Survie",
      ],
      atoutsChoix: 0,
      atoutsOptions: [],
      armes: [
        {
          name: "Mains nues",
          vdBase: 4,
          vdMeta: { Ork: 5, Troll: 6 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Couteau de combat",
          vdBase: 5,
          vdMeta: { Ork: 6, Troll: 7 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
        {
          name: "Fusil d'assaut",
          vdBase: 7,
          vdMeta: {},
          portees: "[Dés./OK/OK/Dés.]",
        },
        { name: "Grenades", vdBase: 7, vdMeta: {}, portees: "[OK/OK/Dés./–]" },
      ],
      equip: ["Commlink", "Armure corporelle intégrale (Armure 4)"],
      combativite: "extrême",
      seuilsPhys: [9, 12, 15],
      seuilsPhysMeta: { Ork: [10, 13, 16], Troll: [11, 14, 17] },
      seuils_ment: [3, 6, 9],
      seuils_ment_meta: { Nain: [4, 7, 10] },
      seuilsMat: null,
      eveille: null,
    },

    /* ======== DIVERS ======== */
    Johnson: {
      label: "Johnson",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 3, CHA: 3 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: { VOL: 4, CHA: 4 },
      },
      skills: [
        { name: "Athlétisme", val: 3, attr: "FOR", rr: 0 },
        { name: "Déf. à distance", val: 3, attr: "AGI", rr: 0, spec: true },
        {
          name: "Armes à distance",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Pistolets",
          specVal: 4,
          specRR: 1,
        },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Furtivité",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 4,
          specRR: 0,
        },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        {
          name: "Influence",
          val: 5,
          attr: "CHA",
          rr: 1,
          spec: "Négociation/Bluff",
          specVal: 5,
          specRR: 1,
        },
        { name: "Réseau", val: 5, attr: "CHA", rr: 1 },
      ],
      atouts: [
        "Yeux cybernétiques : RR 1 Armes à distance (pistolets) et Perception (physique), vision nocturne",
        "Très bien connecté (trait) : RR 1 aux tests de Réseau",
        "Phéromones optimisées (bioware) : RR 1 aux tests d'Influence",
        "Récepteur de phéromones (bioware) : RR 1 aux tests de Perception (sociale)",
      ],
      atoutsChoix: 0,
      atoutsOptions: [],
      armes: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Vêtements blindés (Armure 2)"],
      combativite: "faible",
      seuilsPhys: [4, 7, 10],
      seuilsPhysMeta: { Ork: [5, 8, 11], Troll: [6, 9, 12] },
      seuils_ment: [3, 6, 9],
      seuils_ment_meta: { Nain: [4, 7, 10] },
      seuilsMat: null,
      eveille: null,
    },

    "Employé corporatiste": {
      label: "Employé corporatiste",
      attrs: { FOR: 2, AGI: 2, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 3 }, Troll: { FOR: 4 }, Nain: {}, Elfe: {} },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          specMeta: { Ork: { val: 3 }, Troll: { val: 3 } },
        },
        { name: "Déf. à distance", val: 2, attr: "AGI", rr: 0, spec: true },
        { name: "Perception", val: 2, attr: "LOG", rr: 0 },
        { name: "Influence", val: 2, attr: "CHA", rr: 0 },
      ],
      atouts: ["Datajack (cyberware) : IND, RV cold-sim"],
      atoutsChoix: 1,
      atoutsOptions: [
        "Électronique 3 / Recherche matricielle 4",
        "Influence 3 / Négociation 4",
        "Ingénierie 3 / Construction & Réparation 4",
        "Pilotage 3 / Type de véhicule 4",
        "Survie 3 / Premiers soins 4",
      ],
      armes: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Taser",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/–/–], perte action",
        },
      ],
      equip: ["Commlink", "Vêtements pare-balles (Armure 1)"],
      combativite: "nulle",
      seuilsPhys: [3, 6, 9],
      seuilsPhysMeta: { Ork: [4, 7, 10], Troll: [5, 8, 11] },
      seuils_ment: [2, 5, 8],
      seuils_ment_meta: { Nain: [3, 6, 9] },
      seuilsMat: null,
      eveille: null,
    },

    Enquêteur: {
      label: "Enquêteur",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 3, CHA: 3 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: { VOL: 4, CHA: 4 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Déf. à distance", val: 3, attr: "AGI", rr: 0, spec: true },
        {
          name: "Armes à distance",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Pistolets",
          specVal: 4,
          specRR: 1,
        },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Furtivité",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 4,
          specRR: 0,
        },
        {
          name: "Perception",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Physique",
          specVal: 5,
          specRR: 1,
        },
        {
          name: "Électronique",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Recherche matricielle",
          specVal: 5,
          specRR: 1,
        },
        {
          name: "Influence",
          val: 4,
          attr: "CHA",
          rr: 0,
          spec: "Intimidation",
          specVal: 5,
          specRR: 0,
        },
        {
          name: "Réseau",
          val: 4,
          attr: "CHA",
          rr: 0,
          spec: "Gouvernemental",
          specVal: 4,
          specRR: 0,
        },
      ],
      atouts: [
        "Yeux cybernétiques : RR 1 aux tests de Perception (physique), vision nocturne",
        "Base de données Lone Star : RR 1 aux tests d'Électronique (recherche matricielle)",
        "Smartlink : RR 1 aux tests d'Armes à distance (pistolets)",
      ],
      atoutsChoix: 0,
      atoutsOptions: [],
      armes: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          portees: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          portees: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Manteau renforcé (Armure 2)"],
      combativite: "faible",
      seuilsPhys: [4, 7, 10],
      seuilsPhysMeta: { Ork: [5, 8, 11], Troll: [6, 9, 12] },
      seuils_ment: [3, 6, 9],
      seuils_ment_meta: { Nain: [4, 7, 10] },
      seuilsMat: null,
      eveille: null,
    },
  },

  /* ---- Génération ---- */
  generate(opts) {
    const meta = opts.meta === "Aléatoire" ? Utils.randMeta() : opts.meta;
    const gender =
      opts.gender === "Aléatoire" ? Utils.randGender() : opts.gender;

    // Sélection du profil
    const profList = Object.keys(this.profils).filter((k) => k !== "Aléatoire");
    let profKey =
      opts.profession === "Aléatoire" ? Utils.rand(profList) : opts.profession;
    if (!this.profils[profKey]) profKey = Utils.rand(profList);

    const profil = this.profils[profKey];

    // Attributs avec variantes métatype
    const attrs = { ...profil.attrs };
    const metaOverrides = profil.attrsMeta?.[meta] || {};
    for (const k in metaOverrides) attrs[k] = metaOverrides[k];

    // Atouts au choix — on en tire aléatoirement
    const atoutsChoisis = [];
    if (profil.atoutsChoix > 0 && profil.atoutsOptions.length > 0) {
      const shuffled = [...profil.atoutsOptions].sort(
        () => Math.random() - 0.5,
      );
      atoutsChoisis.push(...shuffled.slice(0, profil.atoutsChoix));
    }

    // Seuils de blessures avec variantes métatype
    const seuilsPhys = profil.seuilsPhysMeta?.[meta] || profil.seuilsPhys;
    const seuils_ment = profil.seuils_ment_meta?.[meta] || profil.seuils_ment;

    // Rang selon profil
    const rangMap = {
      Ganger: "Figurant",
      "Agent de sécurité": "Figurant",
      "Employé corporatiste": "Figurant",
      "Ganger d'élite": "Figurant d'élite",
      "Officier de sécurité": "Figurant d'élite",
      "Mage de sécurité": "Figurant d'élite",
      "Adepte de sécurité": "Figurant d'élite",
      "Decker de sécurité": "Figurant d'élite",
      Militaire: "Figurant d'élite",
      Johnson: "Lieutenant",
      Enquêteur: "Lieutenant",
      "Officier d'élite": "Lieutenant",
      "Mage d'élite": "Lieutenant",
      "Adepte d'élite": "Lieutenant",
      "Decker d'élite": "Lieutenant",
      "Commando militaire": "Boss",
    };
    const rang =
      opts.rang && opts.rang !== "Aléatoire"
        ? opts.rang
        : rangMap[profKey] || "Figurant";

    return {
      id: Utils.uid(),
      edition: "anarchy",
      name:
        opts.name && opts.name.trim()
          ? opts.name.trim()
          : Utils.genName(opts.bassin !== "Aléatoire" ? opts.bassin : null),
      meta,
      gender,
      rang,
      profKey,
      profession: profil.label,
      attrs,
      skills: profil.skills.map((s) => {
        const copy = { ...s };
        if (s.specMeta && s.specMeta[meta])
          copy.val = s.specMeta[meta].val ?? s.val;
        delete copy.specMeta;
        return copy;
      }),
      atouts: [...profil.atouts, ...atoutsChoisis],
      armes: profil.armes.map((a) => {
        // Arme à choix multiples → on en tire une au hasard
        if (a.choices) {
          const choix = Utils.rand(a.choices);
          return {
            name: choix.name,
            vd:
              choix.vdMeta && choix.vdMeta[meta]
                ? choix.vdMeta[meta]
                : choix.vdBase,
            portees: choix.portees,
          };
        }
        // Arme simple
        return {
          name: a.name,
          vd: a.vdMeta && a.vdMeta[meta] ? a.vdMeta[meta] : a.vdBase,
          portees: a.portees,
          ...(a.note ? { note: a.note } : {}),
        };
      }),
      equip: profil.equip,
      combativite: profil.combativite,
      seuilsPhys,
      seuils_ment,
      seuilsMat: profil.seuilsMat,
      eveille: profil.eveille,
      sorts: profil.sorts || [],
      physFilled: 0,
      mentFilled: 0,
      matFilled: 0,
      notes: "",
    };
  },

  recalc(pnj) {
    return pnj;
  },
};
