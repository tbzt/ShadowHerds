'use strict';

/* ============================================================
   ÉDITION SR5 — Shadowrun 5e édition
   Attributs + Limites + Compétences + Moniteurs séparés
   ============================================================ */
const EditionSR5 = {

  id: 'sr5',
  label: 'Shadowrun 5e',
  badgeLabel: 'SR5',

  /* ---- Métatypes ---- */
  attrBase: {
    'Humain': { CON:3, AGI:3, REA:3, FOR:3, VOL:3, LOG:3, INT:3, CHA:3, ESS:6 },
    'Elfe':   { CON:3, AGI:4, REA:3, FOR:3, VOL:3, LOG:3, INT:3, CHA:4, ESS:6 },
    'Nain':   { CON:4, AGI:3, REA:2, FOR:4, VOL:4, LOG:3, INT:3, CHA:3, ESS:6 },
    'Ork':    { CON:5, AGI:3, REA:3, FOR:5, VOL:3, LOG:3, INT:3, CHA:2, ESS:6 },
    'Troll':  { CON:6, AGI:2, REA:3, FOR:6, VOL:3, LOG:2, INT:3, CHA:1, ESS:6 },
  },

  /** Max naturel par métatype */
  attrMax: {
    'Humain': { CON:6, AGI:6, REA:6, FOR:6, VOL:6, LOG:6, INT:6, CHA:6 },
    'Elfe':   { CON:6, AGI:7, REA:6, FOR:6, VOL:6, LOG:6, INT:6, CHA:8 },
    'Nain':   { CON:8, AGI:6, REA:5, FOR:8, VOL:7, LOG:7, INT:7, CHA:6 },
    'Ork':    { CON:9, AGI:6, REA:6, FOR:9, VOL:6, LOG:5, INT:6, CHA:5 },
    'Troll':  { CON:10,AGI:5, REA:6, FOR:10,VOL:6, LOG:5, INT:5, CHA:4 },
  },

  /* ---- Options du formulaire ---- */
  formOptions: {
    meta:       ['Aléatoire','Humain','Elfe','Nain','Ork','Troll'],
    gender:     ['Aléatoire','M','F','NB'],
    prof:       ['Aléatoire','0','1','2','3','4','5','6'],
    profession: ['Aléatoire','Civil','Voyou','Ganger','Garde de sécurité','Policier','Crime organisé','Clergé / Politique','Forces d\'intervention','Forces spéciales'],
    special:    ['Aucun','Aléatoire','Lieutenant','Decker','Adepte','Mage hermétique','Chaman'],
  },

  /* ---- Tables de compétences par profession ---- */
  skillsByProfession: {
    'Civil': [
      { name: 'Étiquette',      base: 2 },
      { name: 'Négociation',    base: 2 },
      { name: 'Perception',     base: 1 },
      { name: 'Athlétisme',     base: 1 },
    ],
    'Voyou': [
      { name: 'Armes légères',  base: 3 },
      { name: 'Combat rapproché', base: 2 },
      { name: 'Intimidation',   base: 2 },
      { name: 'Furtivité',      base: 2 },
      { name: 'Perception',     base: 2 },
    ],
    'Ganger': [
      { name: 'Armes légères',  base: 3 },
      { name: 'Combat rapproché', base: 3 },
      { name: 'Intimidation',   base: 3 },
      { name: 'Athlétisme',     base: 2 },
      { name: 'Furtivité',      base: 1 },
    ],
    'Garde de sécurité': [
      { name: 'Armes légères',  base: 4 },
      { name: 'Armes lourdes',  base: 2 },
      { name: 'Perception',     base: 3 },
      { name: 'Athlétisme',     base: 2 },
      { name: 'Étiquette',      base: 1 },
    ],
    'Policier': [
      { name: 'Armes légères',  base: 3 },
      { name: 'Enquête',        base: 3 },
      { name: 'Conduite',       base: 2 },
      { name: 'Perception',     base: 3 },
      { name: 'Étiquette',      base: 2 },
    ],
    'Crime organisé': [
      { name: 'Armes légères',  base: 4 },
      { name: 'Combat rapproché', base: 2 },
      { name: 'Intimidation',   base: 3 },
      { name: 'Furtivité',      base: 2 },
      { name: 'Perception',     base: 2 },
    ],
    'Clergé / Politique': [
      { name: 'Étiquette',      base: 4 },
      { name: 'Négociation',    base: 4 },
      { name: 'Éloquence',      base: 3 },
      { name: 'Perception',     base: 2 },
    ],
    'Forces d\'intervention': [
      { name: 'Armes légères',  base: 5 },
      { name: 'Armes lourdes',  base: 3 },
      { name: 'Combat rapproché', base: 3 },
      { name: 'Athlétisme',     base: 3 },
      { name: 'Pilotage',       base: 2 },
    ],
    'Forces spéciales': [
      { name: 'Armes légères',  base: 6 },
      { name: 'Armes lourdes',  base: 3 },
      { name: 'Explosifs',      base: 3 },
      { name: 'Infiltration',   base: 4 },
      { name: 'Survie',         base: 3 },
    ],
  },

  /** Compétences spéciales selon la spécialisation */
  specialSkills: {
    'Lieutenant':      [],
    'Decker':          [{ name: 'Piratage', bonus: 3 }, { name: 'Électronique', bonus: 2 }, { name: 'Cybercom.', bonus: 2 }],
    'Adepte':          [{ name: 'Voie de l\'adepte', bonus: 2 }, { name: 'Athlétisme (adepte)', bonus: 2 }],
    'Mage hermétique': [{ name: 'Magie', bonus: 3 }, { name: 'Lancer de sorts', bonus: 3 }, { name: 'Invocation', bonus: 2 }, { name: 'Résistance au Drain', bonus: 2 }],
    'Chaman':          [{ name: 'Magie', bonus: 3 }, { name: 'Lancer de sorts', bonus: 2 }, { name: 'Invocation', bonus: 3 }, { name: 'Résistance au Drain', bonus: 2 }],
  },

  /** Sorts par spécialisation magique */
  spellsBySpecial: {
    'Mage hermétique': ['Boule de feu','Éclair','Armure de mana','Manipulation','Détection'],
    'Chaman':          ['Guérison','Sommeil','Confusion','Invocation d\'esprit','Barrière'],
  },

  /** Pouvoirs d'adepte selon niveau */
  adeptPowers: [
    'Mains de soie','Réflexes de combat','Sens aiguisés','Frappe de mana','Résistance à la douleur','Sprint','Perception accrue'
  ],

  /* ---- Équipement par profession et professionnalisme ---- */
  equipByProfession: {
    'Civil': [
      ['Pistolet léger (Fichetti Security 600)'],
      ['Pistolet léger','Gilet pare-balles'],
    ],
    'Voyou': [
      ['Pistolet (Ares Predator V)','Couteau'],
      ['Pistolet lourd','Couteau vibro','Armure de cuir'],
    ],
    'Ganger': [
      ['Pistolet','Arme de mêlée improvisée'],
      ['SMG','Couteau','Armure de cuir'],
      ['SMG','Pistolet','Armure chainmail','Grenade à fragmentation'],
    ],
    'Garde de sécurité': [
      ['Pistolet (Ares Predator)','Armure légère corpo'],
      ['Pistolet Ares','SMG','Armure corpo renforcée'],
      ['Fusil d\'assaut','Pistolet','Armure lourde corpo','Commlink Hermes'],
    ],
    'Policier': [
      ['Pistolet Ares Predator V','Armure de patrouille Zoe','Taser'],
      ['Pistolet Ares','Fusil à pompe','Armure Zoe Exec'],
      ['Fusil d\'assaut','Pistolet','Armure lourde','Véhicule de patrouille'],
    ],
    'Crime organisé': [
      ['Pistolet lourd','Armure légère'],
      ['SMG','Pistolet lourd','Armure moyenne'],
      ['Fusil d\'assaut','SMG','Armure lourde','Explosifs'],
    ],
    'Clergé / Politique': [
      ['Pistolet de poche','Commlink'],
      ['Pistolet','Commlink haut de gamme','Garde du corps'],
    ],
    'Forces d\'intervention': [
      ['Fusil d\'assaut Ares Alpha','Pistolet Ares','Armure lourde'],
      ['Fusil d\'assaut','Arme lourde','Armure Ares Hardsuit','Grenades','Véhicule blindé'],
    ],
    'Forces spéciales': [
      ['Fusil d\'assaut','Sniper Remington 750','Armure Ares Hardsuit','Explosifs'],
      ['Fusil d\'assaut','Sniper','Armure militaire','Explosifs','Drones de reconnaissance'],
    ],
  },

  /* ---- Augmentations selon spécialisation et prof ---- */
  augsBySpecial: {
    'Lieutenant': (prof) => prof >= 3 ? ['Réflexes câblés 1','Commlink intégré'] : [],
    'Decker':     (prof) => ['Accélérateur de traitement','Commlink intégré (Hermes Ikon)','Cyberdeck'],
    'Adepte':     (prof) => [],  // les adeptes n'ont pas d'augmentations cybernetiques
    'Mage hermétique': (prof) => [],
    'Chaman':     (prof) => [],
    'Aucun':      (prof) => prof >= 4
      ? [Utils.rand(['Réflexes câblés 1','Œil cybernétique','Oreille cybernétique','Main cybernétique'])]
      : [],
  },

  /* ---- Génération principale ---- */
  generate(opts) {
    const meta = opts.meta === 'Aléatoire' ? Utils.randMeta() : opts.meta;
    const gender = opts.gender === 'Aléatoire' ? Utils.randGender() : opts.gender;
    const prof = opts.prof === 'Aléatoire'
      ? Utils.randInt(0, 6)
      : parseInt(opts.prof, 10);
    const profession = opts.profession === 'Aléatoire'
      ? Utils.rand(this.formOptions.profession.slice(1))
      : opts.profession;

    // Spécialisation
    let special = opts.special || 'Aucun';
    if (special === 'Aléatoire') {
      special = Utils.randBool(0.18)
        ? Utils.rand(['Lieutenant','Decker','Adepte','Mage hermétique','Chaman'])
        : 'Aucun';
    }

    // --- Attributs ---
    const baseAttrs = { ...this.attrBase[meta] };
    const maxAttrs  = this.attrMax[meta];
    const attrs = {};
    const profBonus = Math.ceil(prof * 0.7);

    for (const k of ['CON','AGI','REA','FOR','VOL','LOG','INT','CHA']) {
      const spread = Utils.randInt(0, profBonus);
      attrs[k] = Utils.clamp(baseAttrs[k] + spread, 1, maxAttrs[k]);
    }

    // Spécialisations magiques : MAG plutôt que ESS réduite
    if (['Mage hermétique','Chaman','Adepte'].includes(special)) {
      attrs.MAG = Utils.clamp(prof + Utils.randInt(1, 3), 1, 9);
    }
    // Deckers : RES
    if (special === 'Decker') {
      attrs.ESS = Utils.clamp(6 - Utils.randInt(0, 2), 3, 6);
      attrs.LOG = Utils.clamp(attrs.LOG + 2, 1, maxAttrs.LOG);
    } else {
      attrs.ESS = 6;
    }

    // --- Limites ---
    const limPhys = Math.ceil((attrs.FOR * 2 + attrs.CON + attrs.REA) / 3);
    const limMent = Math.ceil((attrs.LOG * 2 + attrs.INT + attrs.VOL) / 3);
    const limSoc  = Math.ceil((attrs.CHA * 2 + attrs.VOL + prof) / 3);

    // --- Initiative ---
    const init = attrs.REA + attrs.INT;
    const initDice = special === 'Adepte' && prof >= 3 ? 2 : 1;

    // Résistance au Drain (mages)
    const drainResist = ['Mage hermétique','Chaman'].includes(special)
      ? attrs.VOL + attrs.LOG
      : null;

    // --- Moniteurs ---
    const physMon = 8 + Math.ceil(attrs.CON / 2);
    const stunMon = 8 + Math.ceil(attrs.VOL / 2);

    // --- Malus de blessure (paramètre) ---
    const woundMod = Settings.get('woundMod', 3);

    // --- Compétences ---
    const skills = this._buildSkills(profession, prof, special);

    // --- Équipement ---
    const equip = this._buildEquip(profession, prof);

    // --- Augmentations ---
    const augsProducer = this.augsBySpecial[special] || this.augsBySpecial['Aucun'];
    const augs = augsProducer(prof);

    // --- Sorts / Pouvoirs ---
    const spells = this.spellsBySpecial[special]
      ? Utils.rand(this.spellsBySpecial[special].slice(0, 3 + Math.floor(prof / 2))) && this.spellsBySpecial[special].slice(0, 2 + Math.floor(prof / 2))
      : [];
    // fix : slice directly
    const sortsList = this.spellsBySpecial[special]
      ? this.spellsBySpecial[special].slice(0, 2 + Math.floor(prof / 2))
      : [];

    const powers = special === 'Adepte'
      ? this.adeptPowers.slice(0, 2 + Math.floor(prof / 3))
      : [];

    return {
      id:         Utils.uid(),
      edition:    'sr5',
      name:       opts.name && opts.name.trim() !== '' ? opts.name.trim() : Utils.genName(),
      meta,
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
      woundMod,
      skills,
      equip,
      augs,
      sorts:  sortsList,
      powers,
      notes: '',
    };
  },

  _buildSkills(profession, prof, special) {
    const p = Utils.clamp(prof, 0, 6);
    const baseList = this.skillsByProfession[profession]
      || this.skillsByProfession['Voyou'];

    // Base skills avec variation aléatoire
    const skills = baseList.map(s => ({
      name: s.name,
      val:  Utils.clamp(s.base + p + Utils.randInt(-1, 1), 1, 12),
    }));

    // Compétences de spécialisation
    const specialList = this.specialSkills[special] || [];
    for (const s of specialList) {
      skills.push({ name: s.name, val: Utils.clamp(p + s.bonus + Utils.randInt(0, 1), 1, 12) });
    }

    return skills;
  },

  _buildEquip(profession, prof) {
    const table = this.equipByProfession[profession] || [['Pistolet léger']];
    // Prof 0-2 → index 0, 3-4 → index 1, 5-6 → index 2 (ou dernier dispo)
    const idx = prof <= 2 ? 0 : prof <= 4 ? 1 : 2;
    return [...(table[Math.min(idx, table.length - 1)])];
  },

  /* ---- Recalcul après édition manuelle des attrs ---- */
  recalc(pnj) {
    const { attrs, prof } = pnj;
    pnj.limPhys     = Math.ceil((attrs.FOR * 2 + attrs.CON + attrs.REA) / 3);
    pnj.limMent     = Math.ceil((attrs.LOG * 2 + attrs.INT + attrs.VOL) / 3);
    pnj.limSoc      = Math.ceil((attrs.CHA * 2 + attrs.VOL + (prof || 0)) / 3);
    pnj.physMon      = 8 + Math.ceil(attrs.CON / 2);
    pnj.stunMon      = 8 + Math.ceil(attrs.VOL / 2);
    pnj.init         = attrs.REA + attrs.INT;
    pnj.drainResist  = ['Mage hermétique','Chaman'].includes(pnj.special)
      ? attrs.VOL + attrs.LOG : null;
    return pnj;
  },
};
