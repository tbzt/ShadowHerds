'use strict';

/* ============================================================
   ÉDITION ANARCHY 2E — Shadowrun Anarchy 2e édition
   STATUS : stub — interface accessible, données de base,
   génération complète à venir.
   ============================================================ */
const EditionAnarchy = {

  id: 'anarchy',
  label: 'Anarchy 2e',
  badgeLabel: 'ANARCHY 2E',
  isWip: true,

  formOptions: {
    meta:       ['Aléatoire','Humain','Elfe','Nain','Ork','Troll'],
    gender:     ['Aléatoire','M','F','NB'],
    rang:       ['Aléatoire','Figurant','Lieutenant','Boss'],
    profession: ['Aléatoire','Civil','Voyou','Ganger','Garde corpo','Policier','Crime organisé','Runner','Corpo'],
  },

  attrBase: {
    'Humain': { CON:3, AGI:3, REA:3, FOR:3, VOL:3, LOG:3, INT:3, CHA:3 },
    'Elfe':   { CON:3, AGI:4, REA:3, FOR:3, VOL:3, LOG:3, INT:3, CHA:4 },
    'Nain':   { CON:4, AGI:3, REA:2, FOR:4, VOL:4, LOG:3, INT:3, CHA:3 },
    'Ork':    { CON:5, AGI:3, REA:3, FOR:5, VOL:3, LOG:3, INT:3, CHA:2 },
    'Troll':  { CON:6, AGI:2, REA:3, FOR:6, VOL:3, LOG:2, INT:3, CHA:1 },
  },

  /**
   * Clichés de base par profession.
   * Format : [nom, pool_de_dés_base]
   * Le pool sera ajusté selon le Rang.
   */
  clichesByProfession: {
    'Civil':         [['Travail de bureau', 6], ['Survie urbaine', 4], ['Réseau social', 5]],
    'Voyou':         [['Combat de rue', 7],      ['Filature', 5],       ['Intimidation', 6]],
    'Ganger':        [['Combat brutal', 8],      ['Tir instinctif', 7], ['Territoire', 5]],
    'Garde corpo':   [['Protection rapprochée', 9], ['Tir de précision', 8], ['Vigilance', 7]],
    'Policier':      [['Application de la loi', 8], ['Investigation', 7], ['Conduite d\'urgence', 6]],
    'Crime organisé':[['Pression et intimidation', 8], ['Combat armé', 7], ['Réseau criminel', 6]],
    'Runner':        [['Infiltration', 9],        ['Combat tactique', 8], ['Débrouillardise extrême', 7]],
    'Corpo':         [['Négociation corpo', 8],  ['Surveillance discrète', 6], ['Ressources corpo', 7]],
  },

  equipByProfession: {
    'Civil':         ['Commlink basique'],
    'Voyou':         ['Pistolet','Couteau'],
    'Ganger':        ['Pistolet','Arme de mêlée improvisée'],
    'Garde corpo':   ['Pistolet Ares','SMG','Armure légère'],
    'Policier':      ['Pistolet de service','Armure de patrouille'],
    'Crime organisé':['Pistolet lourd','SMG'],
    'Runner':        ['Pistolet','Commlink chiffré','Kit de crochetage'],
    'Corpo':         ['Pistolet de poche','Commlink haut de gamme'],
  },

  generate(opts) {
    const meta = opts.meta === 'Aléatoire' ? Utils.randMeta() : opts.meta;
    const gender = opts.gender === 'Aléatoire' ? Utils.randGender() : opts.gender;
    const rang = opts.rang === 'Aléatoire'
      ? Utils.rand(['Figurant','Figurant','Figurant','Lieutenant','Boss'])
      : opts.rang;
    const profession = opts.profession === 'Aléatoire'
      ? Utils.rand(this.formOptions.profession.slice(1))
      : opts.profession;

    const base = { ...this.attrBase[meta] };
    const rangBonus = { 'Figurant': 0, 'Lieutenant': 1, 'Boss': 2 }[rang] || 0;
    const attrs = {};
    for (const k in base) {
      attrs[k] = Utils.clamp(base[k] + Utils.randInt(0, rangBonus + 1), 1, 12);
    }

    const allCliches = this.clichesByProfession[profession]
      || this.clichesByProfession['Voyou'];
    const nbCliches = rang === 'Figurant' ? 2 : 3;
    const rangDiceMod = { 'Figurant': -1, 'Lieutenant': 0, 'Boss': 2 }[rang] || 0;

    const cliches = allCliches.slice(0, nbCliches).map(([name, baseDice]) => ({
      name,
      dice: Utils.clamp(baseDice + rangDiceMod + Utils.randInt(-1, 1), 4, 14),
    }));

    const init    = attrs.REA + attrs.INT;
    const monitor = 8 + Math.ceil(attrs.CON / 2);
    const narcos  = { 'Figurant': 1, 'Lieutenant': 2, 'Boss': 3 }[rang] || 1;
    const equip   = [...(this.equipByProfession[profession] || ['Pistolet'])];
    if (rang === 'Boss') equip.push('Équipement signature');

    return {
      id:        Utils.uid(),
      edition:   'anarchy',
      name:      opts.name && opts.name.trim() !== '' ? opts.name.trim() : Utils.genName(),
      meta,
      gender,
      rang,
      profession,
      attrs,
      cliches,
      init,
      monitor,
      monFilled: 0,
      narcos,
      narcoUsed: 0,
      equip,
      notes:     '',
    };
  },

  recalc(pnj) {
    pnj.monitor = 8 + Math.ceil(pnj.attrs.CON / 2);
    pnj.init    = pnj.attrs.REA + pnj.attrs.INT;
    return pnj;
  },
};
