"use strict";

/* ============================================================
   ÉDITION SR6 — Shadowrun 6e édition
   Suppression des Limites → Défenses d'Attribut
   Compétences fusionnées en groupes larges
   Moniteur de condition unique (configurable en séparé)
   ============================================================ */
const EditionSR6 = {
  id: "sr6",
  label: "Shadowrun 6e",
  badgeLabel: "SR6",

  /* ---- Métatypes ---- */
  attrBase: {
    Humain: {
      CON: 3,
      AGI: 3,
      REA: 3,
      FOR: 3,
      VOL: 3,
      LOG: 3,
      INT: 3,
      CHA: 3,
      ESS: 6,
    },
    Elfe: {
      CON: 3,
      AGI: 4,
      REA: 3,
      FOR: 3,
      VOL: 3,
      LOG: 3,
      INT: 3,
      CHA: 4,
      ESS: 6,
    },
    Nain: {
      CON: 4,
      AGI: 3,
      REA: 2,
      FOR: 4,
      VOL: 4,
      LOG: 3,
      INT: 3,
      CHA: 3,
      ESS: 6,
    },
    Ork: {
      CON: 5,
      AGI: 3,
      REA: 3,
      FOR: 5,
      VOL: 3,
      LOG: 3,
      INT: 3,
      CHA: 2,
      ESS: 6,
    },
    Troll: {
      CON: 6,
      AGI: 2,
      REA: 3,
      FOR: 6,
      VOL: 3,
      LOG: 2,
      INT: 3,
      CHA: 1,
      ESS: 6,
    },
  },

  attrMax: {
    Humain: { CON: 6, AGI: 6, REA: 6, FOR: 6, VOL: 6, LOG: 6, INT: 6, CHA: 6 },
    Elfe: { CON: 6, AGI: 7, REA: 6, FOR: 6, VOL: 6, LOG: 6, INT: 6, CHA: 8 },
    Nain: { CON: 8, AGI: 6, REA: 5, FOR: 8, VOL: 7, LOG: 7, INT: 7, CHA: 6 },
    Ork: { CON: 9, AGI: 6, REA: 6, FOR: 9, VOL: 6, LOG: 5, INT: 6, CHA: 5 },
    Troll: { CON: 10, AGI: 5, REA: 6, FOR: 10, VOL: 6, LOG: 5, INT: 5, CHA: 4 },
  },

  /* ---- Options du formulaire ---- */
  formOptions: {
    meta: ["Aléatoire", "Humain", "Elfe", "Nain", "Ork", "Troll"],
    gender: ["Aléatoire", "M", "F", "NB"],
    prof: ["Aléatoire", "0", "1", "2", "3", "4", "5", "6"],
    profession: [
      "Aléatoire",
      "Civil",
      "Voyou",
      "Ganger",
      "Garde de sécurité",
      "Policier",
      "Crime organisé",
      "Clergé / Politique",
      "Forces d'intervention",
      "Forces spéciales",
    ],
    special: [
      "Aucun",
      "Aléatoire",
      "Lieutenant",
      "Decker",
      "Adepte",
      "Magicien",
      "Chaman",
    ],
  },

  /**
   * SR6 : compétences fusionnées en groupes larges.
   * Chaque groupe recouvre ce que SR5 appelait plusieurs compétences distinctes.
   */
  skillsByProfession: {
    Civil: [
      { name: "Sociale", base: 3 },
      { name: "Athlétisme", base: 2 },
      { name: "Perception", base: 2 },
    ],
    Voyou: [
      { name: "Combat", base: 3 },
      { name: "Armes à feu", base: 3 },
      { name: "Furtivité", base: 2 },
      { name: "Perception", base: 2 },
    ],
    Ganger: [
      { name: "Combat", base: 4 },
      { name: "Armes à feu", base: 3 },
      { name: "Intimidation", base: 3 },
      { name: "Athlétisme", base: 2 },
    ],
    "Garde de sécurité": [
      { name: "Armes à feu", base: 4 },
      { name: "Combat", base: 3 },
      { name: "Perception", base: 3 },
      { name: "Pilotage", base: 2 },
    ],
    Policier: [
      { name: "Armes à feu", base: 4 },
      { name: "Investigation", base: 3 },
      { name: "Sociale", base: 3 },
      { name: "Pilotage", base: 2 },
    ],
    "Crime organisé": [
      { name: "Armes à feu", base: 4 },
      { name: "Combat", base: 3 },
      { name: "Intimidation", base: 3 },
      { name: "Furtivité", base: 2 },
    ],
    "Clergé / Politique": [
      { name: "Sociale", base: 5 },
      { name: "Investigation", base: 3 },
      { name: "Perception", base: 3 },
    ],
    "Forces d'intervention": [
      { name: "Armes à feu", base: 5 },
      { name: "Combat", base: 4 },
      { name: "Athlétisme", base: 3 },
      { name: "Pilotage", base: 3 },
    ],
    "Forces spéciales": [
      { name: "Armes à feu", base: 6 },
      { name: "Combat", base: 4 },
      { name: "Explosifs", base: 3 },
      { name: "Furtivité", base: 4 },
      { name: "Survie", base: 3 },
    ],
  },

  specialSkills: {
    Lieutenant: [],
    Decker: [
      { name: "Informatique", bonus: 4 },
      { name: "Cracking", bonus: 3 },
      { name: "Cybercombat", bonus: 2 },
    ],
    Adepte: [
      { name: "Athlétisme (voie)", bonus: 3 },
      { name: "Combat (voie)", bonus: 2 },
    ],
    Magicien: [
      { name: "Magie", bonus: 4 },
      { name: "Lancer de sorts", bonus: 3 },
      { name: "Invocation", bonus: 2 },
    ],
    Chaman: [
      { name: "Magie", bonus: 3 },
      { name: "Invocation", bonus: 4 },
      { name: "Lancer de sorts", bonus: 2 },
    ],
  },

  spellsBySpecial: {
    Magicien: [
      "Boule de feu",
      "Éclair",
      "Armure de mana",
      "Paralysie",
      "Détection",
    ],
    Chaman: [
      "Guérison",
      "Sommeil",
      "Confusion",
      "Convocation",
      "Barrière d'air",
    ],
  },

  adeptPowers: [
    "Mains de soie",
    "Réflexes de combat",
    "Frappe de mana",
    "Résistance à la douleur",
    "Sprint",
    "Perception accrue",
    "Réflexes améliorés",
  ],

  equipByProfession: {
    Civil: [["Pistolet léger Fichetti"], ["Pistolet", "Commlink Renraku"]],
    Voyou: [
      ["Pistolet", "Couteau"],
      ["Pistolet lourd", "Couteau vibro", "Armure légère"],
    ],
    Ganger: [
      ["Pistolet", "Arme de mêlée"],
      ["SMG", "Couteau", "Armure de cuir"],
      ["SMG", "Pistolet", "Armure chainmail", "Grenade"],
    ],
    "Garde de sécurité": [
      ["Pistolet Ares Predator VI", "Armure Armor Jacket"],
      ["Pistolet Ares", "SMG", "Armure renforcée"],
      ["Fusil d'assaut", "Pistolet", "Armure lourde", "Commlink Hermes"],
    ],
    Policier: [
      ["Pistolet Ares Predator VI", "Armure Zoe Executive", "Taser"],
      ["Pistolet Ares", "Fusil à pompe", "Armure lourde"],
    ],
    "Crime organisé": [
      ["Pistolet lourd", "Armure légère"],
      ["SMG", "Pistolet lourd", "Armure Armor Jacket"],
      ["Fusil d'assaut", "SMG", "Armure lourde", "Explosifs"],
    ],
    "Clergé / Politique": [
      ["Pistolet de poche", "Commlink Hermes Ikon"],
      ["Pistolet", "Commlink haut de gamme", "Garde du corps"],
    ],
    "Forces d'intervention": [
      ["Fusil d'assaut Ares Alpha", "Pistolet Ares", "Armure lourde"],
      [
        "Fusil d'assaut",
        "Arme lourde",
        "Armure militaire",
        "Grenades",
        "Véhicule blindé",
      ],
    ],
    "Forces spéciales": [
      ["Fusil d'assaut", "Sniper", "Armure militaire", "Explosifs"],
      [
        "Fusil d'assaut",
        "Sniper",
        "Armure militaire",
        "Explosifs",
        "Drones",
        "Grenades flash",
      ],
    ],
  },

  augsBySpecial: {
    Lieutenant: (prof) => (prof >= 3 ? ["Réflexes câblés 1"] : []),
    Decker: () => ["Cyberdeck (Hermes Chariot)", "Interface directe"],
    Adepte: () => [],
    Magicien: () => [],
    Chaman: () => [],
    Aucun: (prof) =>
      prof >= 4
        ? [
            Utils.rand([
              "Réflexes câblés 1",
              "Œil cybernétique (smart)",
              "Oreille cybernétique",
              "Commlink intégré",
            ]),
          ]
        : [],
  },

  /* ---- Génération principale ---- */
  generate(opts) {
    const meta = opts.meta === "Aléatoire" ? Utils.randMeta() : opts.meta;
    const gender =
      opts.gender === "Aléatoire" ? Utils.randGender() : opts.gender;
    const prof =
      opts.prof === "Aléatoire" ? Utils.randInt(0, 6) : parseInt(opts.prof, 10);
    const profession =
      opts.profession === "Aléatoire"
        ? Utils.rand(this.formOptions.profession.slice(1))
        : opts.profession;

    let special = opts.special || "Aucun";
    if (special === "Aléatoire") {
      special = Utils.randBool(0.18)
        ? Utils.rand(["Lieutenant", "Decker", "Adepte", "Magicien", "Chaman"])
        : "Aucun";
    }

    // --- Attributs ---
    const baseAttrs = { ...this.attrBase[meta] };
    const maxAttrs = this.attrMax[meta];
    const attrs = {};
    const profBonus = Math.ceil(prof * 0.7);

    for (const k of ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"]) {
      const spread = Utils.randInt(0, profBonus);
      attrs[k] = Utils.clamp(baseAttrs[k] + spread, 1, maxAttrs[k]);
    }

    if (["Magicien", "Chaman", "Adepte"].includes(special)) {
      attrs.MAG = Utils.clamp(prof + Utils.randInt(1, 3), 1, 9);
    }

    if (special === "Decker") {
      attrs.ESS = Utils.clamp(6 - Utils.randInt(0, 2), 3, 6);
      attrs.LOG = Utils.clamp(attrs.LOG + 2, 1, maxAttrs.LOG);
    } else {
      attrs.ESS = 6;
    }

    // --- Défenses d'Attribut (SR6 — remplace les Limites) ---
    const defAttr = {
      physique: attrs.REA + attrs.AGI,
      mental: attrs.INT + attrs.VOL,
      social: attrs.CHA + attrs.INT,
      astrale: ["Magicien", "Chaman", "Adepte"].includes(special)
        ? (attrs.MAG || 0) + attrs.INT
        : null,
    };

    // --- Initiative ---
    const init = attrs.REA + attrs.INT;
    const initDice = special === "Adepte" && prof >= 3 ? 2 : 1;

    // Résistance au Drain
    const drainResist = ["Magicien", "Chaman"].includes(special)
      ? attrs.VOL + attrs.LOG
      : null;

    // --- Moniteur (unique par défaut en SR6, optionnellement séparé) ---
    const separateMon = Settings.get("separateMonitors", false);
    const monitor = 8 + Math.ceil(attrs.CON / 2);
    const stunMon = separateMon ? 8 + Math.ceil(attrs.VOL / 2) : null;

    // --- Compétences ---
    const skills = this._buildSkills(profession, prof, special);

    // --- Équipement ---
    const equip = this._buildEquip(profession, prof);

    // --- Augmentations ---
    const augsProducer =
      this.augsBySpecial[special] || this.augsBySpecial["Aucun"];
    const augs = augsProducer(prof);

    // --- Sorts / Pouvoirs ---
    const sortsList = this.spellsBySpecial[special]
      ? this.spellsBySpecial[special].slice(0, 2 + Math.floor(prof / 2))
      : [];
    const powers =
      special === "Adepte"
        ? this.adeptPowers.slice(0, 2 + Math.floor(prof / 3))
        : [];

    return {
      id: Utils.uid(),
      edition: "sr6",
      name:
        opts.name && opts.name.trim() !== ""
          ? opts.name.trim()
          : Utils.genName(opts.bassin !== "Aléatoire" ? opts.bassin : null),
      meta,
      gender,
      prof,
      profession,
      special,
      attrs,
      defAttr,
      init,
      initDice,
      drainResist,
      monitor,
      stunMon,
      monFilled: 0,
      stunFilled: 0,
      skills,
      equip,
      augs,
      sorts: sortsList,
      powers,
      notes: "",
    };
  },

  _buildSkills(profession, prof, special) {
    const p = Utils.clamp(prof, 0, 6);
    const baseList =
      this.skillsByProfession[profession] || this.skillsByProfession["Voyou"];

    const skills = baseList.map((s) => ({
      name: s.name,
      val: Utils.clamp(s.base + p + Utils.randInt(-1, 1), 1, 12),
    }));

    const specialList = this.specialSkills[special] || [];
    for (const s of specialList) {
      skills.push({
        name: s.name,
        val: Utils.clamp(p + s.bonus + Utils.randInt(0, 1), 1, 12),
      });
    }

    return skills;
  },

  _buildEquip(profession, prof) {
    const table = this.equipByProfession[profession] || [["Pistolet légère"]];
    const idx = prof <= 2 ? 0 : prof <= 4 ? 1 : 2;
    return [...table[Math.min(idx, table.length - 1)]];
  },

  /* ---- Recalcul après édition manuelle ---- */
  recalc(pnj) {
    const { attrs } = pnj;
    pnj.defAttr = {
      physique: attrs.REA + attrs.AGI,
      mental: attrs.INT + attrs.VOL,
      social: attrs.CHA + attrs.INT,
      astrale: pnj.attrs.MAG ? pnj.attrs.MAG + attrs.INT : null,
    };
    pnj.monitor = 8 + Math.ceil(attrs.CON / 2);
    pnj.init = attrs.REA + attrs.INT;
    pnj.drainResist = ["Magicien", "Chaman"].includes(pnj.special)
      ? attrs.VOL + attrs.LOG
      : null;
    if (pnj.stunMon !== null && pnj.stunMon !== undefined) {
      pnj.stunMon = 8 + Math.ceil(attrs.VOL / 2);
    }
    return pnj;
  },
};
