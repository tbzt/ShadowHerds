"use strict";

/* ============================================================
   ÉDITION ANARCHY 1RE — Shadowrun Anarchy (1re édition)
   Sources : sran_01_anarchy_web_v1a.pdf (livre de base) +
   sran_03_anarchistes_web_v0.pdf (Anarchistes).

   Anarchy 1re ≈ un SR5 simplifié : 6 attributs (dont Chance), deux
   moniteurs P/E numériques, score de Défense, compétences en pool
   indice+attribut, Matrice à jets de dés, Essence, tiers Dangerosité.
   PAS de Réduction de Risque ni de seuils 2L/1G/1I (ça, c'est la V2) —
   d'où usesRiskPanel:false, qui fait retomber le module sur les chemins
   « SR » des gates de Phase 1 (deux moniteurs, hasAttrs Matrice, etc.).

   Module complet (Lots 1-8 du plan d'implémentation) : statBlocks/generate
   (21 archétypes), Matrice V1 (GLACE à dés, 9 types), esprits (6 types ×
   3 puissances), créatures (15), esprits mentors. Restent en catalogue
   pur (saisie ultérieure, hors scope générateur) : détail des sorts/Atouts
   au-delà des statBlocks, prétirés, contenu Anarchistes étendu (créatures
   détaillées, métavariantes) — cf. plan §6.

   Doit être chargé APRÈS js/editions/sr5.js dans index.html.
   ============================================================ */
const EditionAnarchy1 = {
  id: "anarchy1",
  label: "Anarchy 1re",
  badgeLabel: "ANARCHY 1RE",
  isWip: false,
  useMetavariants: true,

  /* ---- Contrat commun édition ---- */
  attributes: ["FOR", "AGI", "VOL", "LOG", "CHA", "CHC"],
  /** V1 n'a pas de panneau de Réduction de Risque (propre à Anarchy 2.0) :
      elle retombe sur les chemins « SR » des gates de Phase 1. */
  usesRiskPanel: false,
  /** Les points d'Anarchy (réserve MJ, findings §9) réutilisent le panneau
      de réserve de menace existant — sémantique proche. */
  usesThreatReserve: true,
  /** Seconde chance via la Chance (CHC), comme en SR5 (p.58 V1). */
  rerollAction: {
    label: "Seconde chance",
    mode: "misses",
    blockedBy: "critGlitch",
    costAttr: "CHC",
  },
  /* ---- Action magique (CH-M7c) : Anarchy n'a pas de Drain chiffré →
     tout neutre. MagicAction ne déclenche rien (spellSkill/conjureSkill null). ---- */
  spellUsesForce: false,
  spellSkill: null,
  conjureSkill: null,
  spellDrainValue() {
    return 0;
  },
  conjureDrainValue() {
    return 0;
  },
  spiritResistPool() {
    return 0;
  },
  /** Neutre : Anarchy 1re n'a pas de MAG/conversion Physique-Étourdissant
      documentée pour le Drain (`drainResist` reste toujours null en V1). */
  drainDamageType() {
    return "stun";
  },
  /** Neutre : pas de Drain chiffré à appliquer en V1 (cf. drainDamageType). */
  applyDrainDamage() {},
  ratingBadge: {
    field: "tier",
    label: "Dangerosité",
    options: ["Figurant", "Sbire", "Antagoniste", "Pro", "Terreur"],
  },
  /** Initiative V1 (findings §8) : base = max(AGI, LOG), 2D6 (pas de passes
      d'initiative — combat narratif). */
  initiativeFor(pnj) {
    const attrs = pnj.attrs || {};
    return { base: Math.max(attrs.AGI || 0, attrs.LOG || 0), dice: 2 };
  },
  /** narrative:true — combat sans initiative chiffrée ni ordre figé (le livre
      A1 gère l'ordre par la narration). Le tracker bascule en mode dépouillé
      (pool de jetons qu'on éteint), cf. EncounterRenderer._rowNarrative. */
  combatModel: { rerollEachRound: false, passDecrement: 0, narrative: true },
  /** 3 puissances par esprit V1 (mineur/normal/majeur, findings §ESPRITS) —
      field:"tier" réutilise le champ à 3 paliers déjà câblé côté générateur
      (Spirits.ANARCHY_TIERS). Table réelle des esprits : Lot 6. */
  summonPower: {
    field: "tier",
    label: "Puissance",
    steps: () => ["mineur", "normal", "majeur"],
  },
  skillModel: { shape: "simple", valRange: [0, 6], hasGroups: false },
  hasEdges: true,
  /** Les drogues de combat V1 sont un Atout, pas un équipement catalogué
      comme en V2 — pas de correspondance universelle nécessaire ici. */
  drugModel: { matchAll: false },

  /* ---- Moniteurs & combat ----
     Deux moniteurs numériques P/E (findings §3), comme en SR5, mais taille
     dérivée de FOR/VOL (pas CON/VOL) : phys = 8 + ⌈FOR/2⌉,
     étourd. = 8 + ⌈VOL/2⌉. Malus : −1 dé par ligne de 3 cases remplies
     (cumul phys+étourd.), non réglable (contrairement au woundMod SR5/SR6). */
  conditionMonitor: {
    model: "double physique+étourdissement, cases = 8 + FOR|VOL /2",
    fields: { primary: "physMon" },
    woundMalus(pnj) {
      const total = (pnj.physFilled || 0) + (pnj.stunFilled || 0);
      return Math.floor(total / 3);
    },
    spiritMonitor: null,
    /** Drones V1 = Blindage/Résistance/Mobilité/Autopilote (findings §10),
        pas de seuils comme en V2. */
    vehicleFields: "total",
    isDestroyed(entity) {
      if (entity.type === "vehicle")
        return (entity.monTotal || 0) > 0 && (entity.monFilled || 0) >= entity.monTotal;
      return (entity.physMon || 0) > 0 && (entity.physFilled || 0) >= entity.physMon;
    },
  },

  /* ---- Armes ---- Pas de RR, spécialisation = +2 dés (comme SR5). Pool
     d'attaque = compétence + attribut lié. Catalogue V1 réel : Lot 3. */
  weaponModel: {
    smartlinkBonus: null,
    accuracyLimit: false,
    specMechanic: "diceBonus",
    source: "equip",
  },

  /** Invocation d'esprits V1 (6 types × 3 puissances, statblocks
      §ESPRITS). `types`/`spawn` référencent Spirits en lazy (spirits.js
      charge après les modules d'édition, même pattern que sr5/anarchy2). */
  spiritModel: {
    canSummon: true,
    types: () => Spirits.ANARCHY1_TYPES,
    /** Esprit V1 : deux moniteurs P/E + Défense (comme un PNJ V1),
        Immunité aux armes normales −1/−3/−5 selon la puissance, un Atout
        élémentaire/naturel fixe (si le type en a un) + Atouts au choix
        (1/1/2 selon puissance, cf. statblocks §Esprits « patron »). */
    spawn(owner, typeKey, opts = {}) {
      const t = Spirits.ANARCHY1_TYPES[typeKey];
      if (!t) return null;
      const ti = Utils.clamp(opts.tier ?? 1, 0, 2); // 0 mineur / 1 normal / 2 majeur
      const tierLabel = ["Mineur", "Normal", "Majeur"][ti];
      const pick = (v) => (Array.isArray(v) ? v[ti] : v);

      const attrs = {};
      for (const [k, triple] of Object.entries(t.attrs)) attrs[k] = pick(triple);
      attrs.ESS = 6;

      const immunite = [1, 3, 5][ti];
      const edgeChoices = [1, 1, 2][ti];
      const chosenEdges = [];
      if (t.edgeOptionsFor) {
        const shuffled = t.edgeOptionsFor(ti).sort(() => Math.random() - 0.5);
        chosenEdges.push(...shuffled.slice(0, edgeChoices));
      }
      const edges = [
        `Immunité aux armes normales (−${immunite} dégâts d'armes non magiques)`,
        "Matérialisation (peut se manifester dans le plan physique)",
        ...(t.fixedEdgeFor ? [t.fixedEdgeFor(ti)] : []),
        ...chosenEdges,
      ];

      const equip = [];
      if (t.fixedWeapon) {
        const w = t.fixedWeapon(ti, attrs);
        equip.push(`${w.name} [VD ${w.dmg}${w.dmgType}]`);
      }
      if (t.armor) equip.push(`Armure ${t.armor}`);

      const edition = owner ? owner.edition : opts.edition;
      const free = !owner;
      return {
        id: Utils.uid(),
        type: "spirit",
        edition,
        spiritType: typeKey,
        free,
        name: free ? `${t.label} libre` : t.label,
        ownerId: owner ? owner.id : null,
        ownerName: owner ? owner.name || "Invocateur" : null,
        tier: tierLabel,
        services: free ? 0 : Utils.clamp(opts.services ?? 3, 1, 12),
        servicesUsed: 0,
        meta: "Esprit",
        gender: "NB",
        archetype: `${t.label} (${tierLabel})`,
        attrs,
        defense: pick(t.defense),
        init: Math.max(attrs.AGI, attrs.LOG),
        initDice: 2,
        physMon: pick(t.physMon),
        stunMon: pick(t.stunMon),
        physFilled: 0,
        stunFilled: 0,
        skills: t.skills.map((s) => ({ ...s })),
        edges,
        chosenEdges,
        equip,
        armure: t.armor || 0,
        notes: "",
        deployed: true,
      };
    },
  },

  /** Créatures V1 (statblocks §CRÉATURES/ESPRITS INSECTES/DÉFRACTÉS) :
      hook lu par Creatures.spawn (js/catalogs/creatures.js), même patron
      que spiritModel.spawn — la table du catalogue (Creatures.ANARCHY1)
      est déjà au format V1 natif (attrs/skills/edges/weapons), ce hook
      se contente d'assembler l'objet PNJ standard. */
  creatureModel: {
    spawn(c) {
      return {
        id: Utils.uid(),
        type: "creature",
        edition: "anarchy1",
        creatureKey: c.label,
        name: c.label,
        meta: "Créature",
        gender: "",
        archetype: c.label,
        tier: c.tier || "Figurant",
        attrs: { ...c.attrs, ESS: c.essence != null ? c.essence : 6 },
        defense: c.attrs.AGI + c.attrs.LOG,
        init: Math.max(c.attrs.AGI, c.attrs.LOG),
        initDice: 2,
        physMon: c.physMon,
        stunMon: c.stunMon,
        physFilled: 0,
        stunFilled: 0,
        skills: c.skills.map((s) => ({ ...s })),
        edges: [...(c.edges || [])],
        chosenEdges: [],
        equip: [
          ...(c.weapons || []).map((w) => EditionAnarchy1._resolveWeaponV1(w)),
          ...(c.armor ? [`Armure ${c.armor}`] : []),
        ],
        armure: c.armor || 0,
        notes: "",
        lore: c.desc || "",
        habitat: c.habitat || [],
      };
    },
  },

  /** Drones V1 (findings §10) : Blindage/Résistance/Mobilité/Autopilote —
      pas de senseurs/autosoft distincts comme en SR5. */
  vehicleModel: {
    statFields: [
      ["autopilote", "Autopilote"],
      ["mobilite", "Mobilité"],
      ["resistance", "Résistance"],
      ["blindage", "Blindage"],
    ],
    formExtraFields: [],
    pools(v) {
      const s = v.stats || {};
      return [
        { label: "Attaque", pool: s.autopilote || 0, title: "Autopilote", weaponOnly: true },
        { label: "Défense", pool: (s.autopilote || 0) + (s.mobilite || 0), title: "Autopilote + Mobilité" },
        { label: "Encaissement", pool: (s.resistance || 0) + (s.blindage || 0), title: "Résistance + Blindage" },
      ];
    },
    initiative(v) {
      const p = (v.stats && v.stats.autopilote) || 0;
      return { base: p, dice: 2 };
    },
  },

  /* Régime Matrice V1 (findings §6/§6b) : le serveur lance un POOL DE
     DÉFENSE (4/6/8/10/12 dés selon le niveau de sécurité, +2 si sécurité
     physique) contre le Hacking du hacker ; les GLACE (9 types, effets
     cumulables) ont leur propre statblock à dés (FW 6 · LOG 5 · Défense 11
     · Hacking 8 · Pistage 8 · Moniteur M 11) et résolvent le cybercombat en
     Hacking+LOG vs LOG+Firewall, dégâts (LOG/2)E. hasAttrs:false (même
     famille « pool unique » qu'Anarchy 2.0, pas d'attributs ASDF SR5/SR6) —
     mais serverAttrs/thresholdsText restent propres à la V1 (jamais le
     texte anarchy2, cf. serverrenderer.js). Catalogues réels dans
     js/rules/matrix.js (IC.anarchy1, PROFILES.anarchy1, IC_POOLS.anarchy1). */
  matrixModel: {
    hasAttrs: false,
    indiceRange: [4, 12],
    profileKey: "anarchy1",
    icMonitorSize() {
      return 11;
    },
    maxActiveIC() {
      return Infinity;
    },
    profileRangeText(p) {
      return ` (${p.indice} dés)`;
    },
    monitorBoxLabel(n) {
      return `Case ${n}`;
    },
    monitorBoxSep() {
      return "";
    },
    firewallLabel: " (Firewall 6)",
    overwatchDelta() {
      return 0;
    },
    pickCount(indice, candLen) {
      return Utils.clamp(1 + Math.round(indice / 6) + Utils.randInt(-1, 1), 1, candLen);
    },
    icThresholdsText() {
      return null;
    },
    /** Badge de carte serveur (findings §6b) : le pool de défense, pas
        d'Indice/Firewall séparés comme en Anarchy 2.0. */
    serverAttrs(srv) {
      return [{ label: "Pool de défense", value: srv.indice }];
    },
    /** Régime de test : Hacking du hacker vs pool de défense (mark par
        succès) ; cybercombat séparé, résolu par la GLACE elle-même. */
    thresholdsText(srv) {
      return `Hacking du hacker vs <b>${srv.indice}</b> dés de défense (succès = pose une mark) · Cybercombat GLACE : Hacking+LOG vs LOG+Firewall → dégâts (LOG/2)E`;
    },
    actionRoll() {
      return null;
    },
    convergenceText() {
      return null;
    },
    attrLimit() {
      return null;
    },
  },

  /* ----
     ATTRIBUTS PAR MÉTATYPE — table des indices max V1 (findings §1)
     FOR/AGI/VOL/LOG/CHA/CHC
  ---- */
  attrRange: {
    Humain: { FOR: [1, 6], AGI: [1, 6], VOL: [1, 6], LOG: [1, 6], CHA: [1, 6], CHC: [1, 7] },
    Elfe: { FOR: [1, 6], AGI: [1, 7], VOL: [1, 6], LOG: [1, 6], CHA: [1, 8], CHC: [1, 6] },
    Nain: { FOR: [1, 8], AGI: [1, 6], VOL: [1, 7], LOG: [1, 6], CHA: [1, 6], CHC: [1, 6] },
    Ork: { FOR: [1, 8], AGI: [1, 6], VOL: [1, 6], LOG: [1, 6], CHA: [1, 5], CHC: [1, 6] },
    Troll: { FOR: [1, 10], AGI: [1, 5], VOL: [1, 6], LOG: [1, 5], CHA: [1, 4], CHC: [1, 6] },
  },

  /* Modificateurs plats métatype (findings §1, recoupés avec la règle de
     substitution PNJ des statblocks §Règle : mêmes deltas). Chance −1 hors
     Humain (Humain +1) fait partie de cette même règle. Troll porte aussi
     Armure+3, appliqué à part dans generate() (hors attributs). */
  metaMod: {
    Humain: { CHC: +1 },
    Elfe: { AGI: +1, CHA: +1, CHC: -1 },
    Nain: { FOR: +1, VOL: +1, CHC: -1 },
    Ork: { FOR: +2, CHC: -1 },
    Troll: { FOR: +2, CHC: -1 },
  },

  /** Bonus de pool de défense quand le serveur gère aussi la sécurité
      physique (accès/caméras, findings §6b). */
  secPhysBonus: 2,

  /* ---- Options du formulaire ----
     Niveau de jeu V1 (findings §10) remplace le proRating SR5. */
  formOptions: {
    meta: ["Aléatoire", "Humain", "Elfe", "Nain", "Ork", "Troll"],
    gender: ["Aléatoire", "M", "F", "NB"],
    tier: ["Aléatoire", "Ganger", "Runner", "Élite"],
    get archetype() {
      return ["Aléatoire", ...Object.keys(EditionAnarchy1.statBlocks)];
    },
  },

  /* ============================================================
     STATBLOCKS — ~21 archétypes PNJ métahumains (base p.182-190),
     transcrits tels quels (statblocks §GANGERS…JOHNSONS). Chaque arme
     porte sa VD IMPRIMÉE (pas de formule FOR/2 recalculée à la
     génération : les statblocks V1 sont des valeurs fixes, la variance
     vient des attributs/compétences, pas des armes). `fixedMeta` court-
     circuite la substitution de métatype pour les archétypes déjà
     typés dans le livre (ex. Ganger troll).
     ============================================================ */
  statBlocks: {
    "Ganger typique": {
      label: "Ganger typique",
      tier: "Sbire",
      attrs: { FOR: 4, AGI: 3, VOL: 3, LOG: 2, CHA: 2, CHC: 2 },
      skills: [
        { name: "Armes à feu", val: 3, attr: "AGI" },
        { name: "Athlétisme", val: 3, attr: "FOR" },
        { name: "Comédie", val: 2, attr: "CHA" },
        { name: "Corps à corps", val: 4, attr: "AGI" },
        { name: "Intimidation", val: 3, attr: "CHA" },
        { name: "Véhicules terrestres", val: 2, attr: "AGI" },
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Bras cybernétique (relance 2 échecs Agilité, Essence 5)",
        "Drogues de combat (+1 pt Anarchy/Scène)",
        "Zélé (+2 dés résister intimidation/peur)",
        "Armure dermique (+6 Armure, Essence 5)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Poing américain/Couteau", dmg: 3, dmgType: "P" },
        { name: "Pistolet léger", dmg: 5, dmgType: "P", ranges: "C OK · I −2" },
      ],
      armor: 9,
    },

    "Ganger troll": {
      label: "Ganger troll",
      tier: "Sbire",
      fixedMeta: "Troll",
      attrs: { FOR: 6, AGI: 3, VOL: 3, LOG: 2, CHA: 2, CHC: 1 },
      skills: [
        { name: "Armes à feu", val: 3, attr: "AGI" },
        { name: "Athlétisme", val: 3, attr: "FOR" },
        { name: "Corps à corps", val: 5, attr: "AGI" },
        { name: "Intimidation", val: 5, attr: "CHA" },
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Bras cybernétique (relance 2 échecs Agilité)",
        "Drogues de combat (+1 pt Anarchy/Scène)",
        "Zélé (+2 dés résister intimidation/peur)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 3, dmgType: "E" },
        { name: "Poing américain/Couteau", dmg: 4, dmgType: "P" },
        { name: "Pistolet léger", dmg: 5, dmgType: "P", ranges: "C OK · I −2" },
      ],
      armor: 12,
    },

    "Go-ganger": {
      label: "Go-ganger",
      tier: "Sbire",
      attrs: { FOR: 3, AGI: 4, VOL: 3, LOG: 2, CHA: 2, CHC: 2 },
      essence: 6,
      skills: [
        { name: "Armes à feu", val: 4, attr: "AGI" },
        { name: "Athlétisme", val: 3, attr: "FOR" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Ingénierie", val: 2, attr: "LOG" },
        { name: "Intimidation", val: 2, attr: "CHA" },
        { name: "Véhicules terrestres", val: 3, attr: "AGI" },
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Moto Yamaha Rapier (+3 dés Véhicules terrestres, Blindage 9/Résist. 2/Mobilité 3/Autopilote 6)",
        "Moto Harley-Davidson Scorpion chopper (+3 dés Véhicules terrestres, Blindage 12/Résist. 2/Mobilité 2/Autopilote 6)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Poing américain/Couteau", dmg: 3, dmgType: "P" },
        { name: "Pistolet léger", dmg: 5, dmgType: "P", ranges: "C OK · I −2" },
      ],
      armor: 9,
    },

    "Ganger éveillé": {
      label: "Ganger éveillé",
      tier: "Sbire",
      awakened: true,
      attrs: { FOR: 3, AGI: 3, VOL: 4, LOG: 2, CHA: 2, CHC: 2 },
      essence: 6,
      skills: [
        { name: "Athlétisme", val: 3, attr: "FOR" },
        { name: "Comédie", val: 2, attr: "CHA" },
        { name: "Conjuration", val: 1, attr: "VOL" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Intimidation", val: 2, attr: "CHA" },
        { name: "Sorcellerie", val: 3, attr: "VOL" },
      ],
      spellChoices: 2,
      spellOptions: [
        { name: "Éclair mana", note: "6P/CA" },
        { name: "Boule de feu", note: "7P aire" },
        { name: "Confusion", note: "−2 dés" },
        { name: "Armure", note: "6 cases" },
        { name: "Invisibilité" },
      ],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Poing américain/Couteau", dmg: 3, dmgType: "P" },
      ],
      armor: 9,
    },

    "Ganger decker": {
      label: "Ganger decker",
      tier: "Sbire",
      attrs: { FOR: 2, AGI: 3, VOL: 3, LOG: 4, CHA: 2, CHC: 2 },
      essence: 5,
      skills: [
        { name: "Armes à feu", val: 3, attr: "AGI" },
        { name: "Athlétisme", val: 3, attr: "FOR" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Électronique", val: 2, attr: "LOG" },
        { name: "Intimidation", val: 1, attr: "CHA" },
        { name: "Hacking", val: 4, attr: "LOG" },
      ],
      edges: [
        "Datajack (accès Matrice RV, +1 dé actions matricielles)",
        "Cyberdeck Erika MCD-1 (Firewall 1, moniteur matriciel 6 cases, 1 Programme, relance 1 échec)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 1, dmgType: "E" },
        { name: "Poing américain/Couteau", dmg: 2, dmgType: "P" },
        { name: "Pistolet léger", dmg: 5, dmgType: "P", ranges: "C OK · I −2" },
      ],
      armor: 9,
    },

    "Ganger rigger": {
      label: "Ganger rigger",
      tier: "Sbire",
      attrs: { FOR: 3, AGI: 4, VOL: 3, LOG: 2, CHA: 2, CHC: 2 },
      essence: 6,
      skills: [
        { name: "Armes à feu", val: 4, attr: "AGI" },
        { name: "Armes de véhicules", val: 3, attr: "AGI" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Ingénierie", val: 2, attr: "LOG" },
        { name: "Intimidation", val: 1, attr: "CHA" },
        { name: "Véhicules terrestres", val: 3, attr: "AGI" },
      ],
      edges: ["Console de commande pour Rigger"],
      edgeChoices: 1,
      edgeOptions: [
        "GM-Nissan Doberman (drone moyen : Blindage 9/Résist. 1/Mobilité 2/Autopilote 6, Mitraillette)",
        "Drones-espions ×2 (Blindage 3/Résist. 0/Mobilité 3/Autopilote 6, Furtivité +4, volants)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Poing américain/Couteau", dmg: 3, dmgType: "P" },
        { name: "Pistolet léger", dmg: 5, dmgType: "P", ranges: "C OK · I −2" },
        { name: "Mitraillette (sur Doberman)", dmg: 6, dmgType: "P", ranges: "C OK · I OK" },
      ],
      armor: 9,
    },

    "Employé corporatiste": {
      label: "Employé corporatiste",
      tier: "Figurant",
      attrs: { FOR: 2, AGI: 2, VOL: 2, LOG: 3, CHA: 2, CHC: 2 },
      essence: 5,
      skills: [
        { name: "Négociation", val: 2, attr: "CHA" },
        { name: "Véhicules terrestres", val: 1, attr: "AGI" },
        { name: "Électronique", val: 2, attr: "LOG" },
      ],
      edges: ["Datajack"],
      weapons: [
        { name: "Mains nues", dmg: 1, dmgType: "E" },
        { name: "Yamaha Pulsar (taser)", dmg: 6, dmgType: "E", ranges: "C OK · I −4" },
      ],
      armor: 0,
    },

    "Cadre corporatiste": {
      label: "Cadre corporatiste",
      tier: "Sbire",
      attrs: { FOR: 2, AGI: 3, VOL: 3, LOG: 5, CHA: 4, CHC: 2 },
      essence: 4.5,
      skills: [
        { name: "Étiquette", val: 2, attr: "CHA" },
        { name: "Négociation", val: 3, attr: "CHA" },
        { name: "Véhicules terrestres", val: 1, attr: "AGI" },
        { name: "Électronique", val: 5, attr: "LOG" },
      ],
      edges: [
        "Datajack",
        "Amplificateur cérébral (bioware, relance 2 échecs Logique)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 1, dmgType: "E" },
        { name: "Yamaha Pulsar (taser)", dmg: 6, dmgType: "E", ranges: "C OK · I −4" },
      ],
      armor: 0,
    },

    "Agent de sécurité / Flic des rues": {
      label: "Agent de sécurité / Flic des rues",
      tier: "Sbire",
      attrs: { FOR: 4, AGI: 4, VOL: 3, LOG: 3, CHA: 2, CHC: 2 },
      essence: 5,
      skills: [
        { name: "Armes à feu", val: 3, attr: "AGI" },
        { name: "Athlétisme", val: 3, attr: "FOR" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Intimidation", val: 3, attr: "CHA" },
        { name: "Pistage", val: 1, attr: "LOG" },
        { name: "Véhicules terrestres", val: 1, attr: "AGI" },
      ],
      edges: ["Yeux cybernétiques (relance 1 dé Armes à feu)"],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Électromatraque", dmg: 7, dmgType: "E" },
        { name: "Ares Predator V (pistolet lourd)", dmg: 6, dmgType: "P", ranges: "C OK · I −2" },
      ],
      armor: 9,
    },

    "Officier de sécurité ou police": {
      label: "Officier de sécurité ou police",
      tier: "Antagoniste",
      attrs: { FOR: 4, AGI: 4, VOL: 4, LOG: 3, CHA: 3, CHC: 2 },
      essence: 3,
      skills: [
        { name: "Armes à feu", val: 4, attr: "AGI" },
        { name: "Athlétisme", val: 4, attr: "FOR" },
        { name: "Comédie", val: 1, attr: "CHA" },
        { name: "Corps à corps", val: 4, attr: "AGI" },
        { name: "Intimidation", val: 2, attr: "CHA" },
        { name: "Pistage", val: 3, attr: "LOG" },
      ],
      edges: [
        "Yeux cybernétiques (relance 2 dés Perception)",
        "Réflexes câblés (+1 attaque/Narration, +1 pt Anarchy/Scène)",
        "Interface d'arme (+1 dé Armes à feu)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Électromatraque", dmg: 7, dmgType: "E" },
        { name: "Ares Predator V (pistolet lourd)", dmg: 6, dmgType: "P", ranges: "C OK · I −2" },
        { name: "Colt M23 (fusil d'assaut)", dmg: 8, dmgType: "P", ranges: "C OK · I OK · L −2" },
      ],
      armor: 9,
    },

    "Mage de sécurité ou police": {
      label: "Mage de sécurité ou police",
      tier: "Antagoniste",
      awakened: true,
      attrs: { FOR: 2, AGI: 3, VOL: 5, LOG: 4, CHA: 3, CHC: 2 },
      essence: 6,
      skills: [
        { name: "Athlétisme", val: 2, attr: "FOR" },
        { name: "Combat astral", val: 4, attr: "VOL" },
        { name: "Conjuration", val: 4, attr: "VOL" },
        { name: "Corps à corps", val: 2, attr: "AGI" },
        { name: "Furtivité", val: 2, attr: "AGI" },
        { name: "Sorcellerie", val: 5, attr: "VOL" },
      ],
      spells: [{ name: "Éclair étourdissant", note: "7E/CA" }],
      spellChoices: 2,
      spellOptions: [
        { name: "Boule de feu", note: "6P aire" },
        { name: "Confusion", note: "−1 dé" },
        { name: "Armure", note: "3 cases" },
        { name: "Soins" },
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Focus de maintien",
        "Focus d'invocation (+1 dé Conjuration)",
        "Focus de Sorcellerie (+1 dé)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 1, dmgType: "E" },
        { name: "Électromatraque", dmg: 7, dmgType: "E" },
      ],
      armor: 9,
    },

    "Hacker de sécurité ou police": {
      label: "Hacker de sécurité ou police",
      tier: "Antagoniste",
      attrs: { FOR: 2, AGI: 3, VOL: 5, LOG: 5, CHA: 3, CHC: 2 },
      essence: 5,
      skills: [
        { name: "Armes à feu", val: 1, attr: "AGI" },
        { name: "Électronique", val: 4, attr: "LOG" },
        { name: "Hacking", val: 5, attr: "LOG" },
        { name: "Pistage", val: 3, attr: "LOG" },
      ],
      edges: [
        "Datajack",
        "Cyberdeck Novatech Navigator (Firewall 2, moniteur matriciel 9 cases, 2 Programmes, relance 2 échecs)",
      ],
      edgeChoices: 2,
      edgeOptions: [
        "Programme Armure (+6 moniteur matriciel)",
        "Programme Biofeedback",
        "Programme Agresseur",
        "Programme Cryptage",
        "Programme Exploitation",
        "Programme Marteau",
        "Programme Pistage",
      ],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Colt America L36 (pistolet léger)", dmg: 5, dmgType: "P", ranges: "C OK · I −2" },
      ],
      armor: 6,
    },

    "Rigger de sécurité ou police": {
      label: "Rigger de sécurité ou police",
      tier: "Antagoniste",
      attrs: { FOR: 3, AGI: 5, VOL: 3, LOG: 3, CHA: 3, CHC: 2 },
      essence: 5,
      skills: [
        { name: "Armes à feu", val: 2, attr: "AGI" },
        { name: "Armes de véhicules", val: 5, attr: "AGI" },
        { name: "Ingénierie", val: 3, attr: "LOG" },
        { name: "Véhicules divers", val: 5, attr: "AGI" },
        { name: "Véhicules terrestres", val: 5, attr: "AGI" },
      ],
      edges: [
        "Datajack (niv. 2)",
        "Console de commande Rigger (relance 2 échecs)",
      ],
      edgeChoices: 2,
      edgeOptions: [
        "GM-Nissan Doberman (Blindage 9/Résist. 1/Mob. 2/Autopilote 6, Fusil d'assaut)",
        "Shiawase Kanmushi ×2 minidrones",
        "Steel Lynx (Blindage 12/Résist. 1/Mob. 2/Autopilote 6, Mitrailleuse)",
        "MCT-Nissan Roto-drone (Blindage 9, volant, Mitraillette)",
        "Horizon Flying Eye ×2 minidrones (volant, Furtivité +4)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Colt Government 2066 (pistolet lourd)", dmg: 6, dmgType: "P", ranges: "C OK · I −2" },
        { name: "Fusil d'assaut (Doberman)", dmg: 8, dmgType: "P", ranges: "C OK · I OK · L −2" },
        { name: "Mitrailleuse (Steel Lynx)", dmg: 8, dmgType: "P", ranges: "C OK · I OK · L OK" },
        { name: "Mitraillette (Roto-drone)", dmg: 6, dmgType: "P", ranges: "C OK · I OK" },
      ],
      armor: 6,
    },

    "Officier de sécurité ou police — Forces d'élite": {
      label: "Officier de sécurité ou police (Forces d'élite)",
      tier: "Pro",
      attrs: { FOR: 5, AGI: 6, VOL: 4, LOG: 3, CHA: 3, CHC: 2 },
      essence: 2,
      skills: [
        { name: "Armes à feu", val: 6, attr: "AGI" },
        { name: "Athlétisme", val: 5, attr: "FOR" },
        { name: "Corps à corps", val: 5, attr: "AGI" },
        { name: "Intimidation", val: 2, attr: "CHA" },
        { name: "Pistage", val: 3, attr: "LOG" },
      ],
      edges: [
        "Yeux cybernétiques (relance 2 dés Perception)",
        "Réflexes câblés (+1 attaque/Narration, +1 pt Anarchy/Scène)",
        "Interface d'arme (+1 dé Armes à feu)",
        "Ossature renforcée aluminium (réduit dmg de 2)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 3, dmgType: "E" },
        { name: "Électromatraque", dmg: 7, dmgType: "E" },
        { name: "Ares Predator V (pistolet lourd)", dmg: 6, dmgType: "P", ranges: "C OK · I −2" },
        { name: "Colt M23 (fusil d'assaut)", dmg: 8, dmgType: "P", ranges: "C OK · I OK · L −2" },
        { name: "Stoner-Ares M202 (mitrailleuse)", dmg: 8, dmgType: "P", ranges: "C OK · I OK · L OK" },
      ],
      armor: 12,
    },

    "Mage de sécurité ou police — Forces d'élite": {
      label: "Mage de sécurité ou police (Forces d'élite)",
      tier: "Pro",
      awakened: true,
      attrs: { FOR: 2, AGI: 3, VOL: 6, LOG: 5, CHA: 3, CHC: 2 },
      essence: 6,
      skills: [
        { name: "Athlétisme", val: 3, attr: "FOR" },
        { name: "Combat astral", val: 5, attr: "VOL" },
        { name: "Conjuration", val: 5, attr: "VOL" },
        { name: "Corps à corps", val: 2, attr: "AGI" },
        { name: "Furtivité", val: 2, attr: "AGI" },
        { name: "Sorcellerie", val: 6, attr: "VOL" },
      ],
      spellChoices: 3,
      spellOptions: [
        { name: "Éclair étourdissant", note: "8E/CA" },
        { name: "Boule de feu", note: "8P aire" },
        { name: "Confusion", note: "−3 dés" },
        { name: "Armure", note: "9 cases" },
        { name: "Invisibilité" },
        { name: "Augmentation de réflexes" },
        { name: "Soins" },
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Focus de maintien",
        "Focus d'invocation (+3 dés Conjuration)",
        "Focus de Sorcellerie (+3 dés)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 1, dmgType: "E" },
        { name: "Électromatraque", dmg: 7, dmgType: "E" },
      ],
      armor: 12,
    },

    "Hacker de sécurité ou police — Forces d'élite": {
      label: "Hacker de sécurité ou police (Forces d'élite)",
      tier: "Pro",
      attrs: { FOR: 2, AGI: 3, VOL: 6, LOG: 6, CHA: 3, CHC: 2 },
      essence: 5,
      skills: [
        { name: "Électronique", val: 4, attr: "LOG" },
        { name: "Hacking", val: 7, attr: "LOG" },
        { name: "Pistage", val: 5, attr: "LOG" },
      ],
      edges: [
        "Datajack",
        "Cyberdeck Shiawase Cyber-5 (Firewall 3, moniteur matriciel 15 cases, 2 Programmes, relance 3 échecs)",
      ],
      edgeChoices: 2,
      edgeOptions: [
        "Programme Armure niv. +3",
        "Programme Biofeedback niv. +3",
        "Programme Agresseur niv. +3",
        "Programme Cryptage niv. +3",
        "Programme Exploitation niv. +3",
        "Programme Marteau niv. +3",
        "Programme Pistage niv. +3",
      ],
      weapons: [
        { name: "Mains nues", dmg: 1, dmgType: "E" },
        { name: "Colt America L36 (pistolet léger)", dmg: 5, dmgType: "P", ranges: "C OK · I −2" },
      ],
      armor: 6,
    },

    "Rigger de sécurité ou police — Forces d'élite": {
      label: "Rigger de sécurité ou police (Forces d'élite)",
      tier: "Pro",
      attrs: { FOR: 3, AGI: 6, VOL: 3, LOG: 4, CHA: 3, CHC: 2 },
      essence: 5,
      skills: [
        { name: "Armes à feu", val: 2, attr: "AGI" },
        { name: "Armes de véhicules", val: 6, attr: "AGI" },
        { name: "Ingénierie", val: 3, attr: "LOG" },
        { name: "Véhicules divers", val: 6, attr: "AGI" },
        { name: "Véhicules terrestres", val: 6, attr: "AGI" },
      ],
      edges: [
        "Câblage de contrôle de véhicule (niv. 2)",
        "Console de commande Rigger (relance 3 échecs)",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "GM-Nissan Doberman ×3",
        "Steel Lynx blindés ×2",
        "MCT Roto-drones ×3",
        "MCT Fly-Spy ×4",
      ],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Colt Government 2066 (pistolet lourd)", dmg: 6, dmgType: "P", ranges: "C OK · I −2" },
        { name: "Fusil d'assaut (drone)", dmg: 8, dmgType: "P", ranges: "C OK · I OK · L −2" },
        { name: "Mitrailleuse (drone)", dmg: 8, dmgType: "P", ranges: "C OK · I OK · L OK" },
        { name: "Mitraillette (drone)", dmg: 6, dmgType: "P", ranges: "C OK · I OK" },
      ],
      armor: 6,
    },

    "Soldat": {
      label: "Soldat",
      tier: "Antagoniste",
      attrs: { FOR: 4, AGI: 5, VOL: 5, LOG: 3, CHA: 2, CHC: 2 },
      essence: 4,
      skills: [
        { name: "Armes à feu", val: 5, attr: "AGI" },
        { name: "Athlétisme", val: 2, attr: "FOR" },
        { name: "Corps à corps", val: 3, attr: "AGI" },
        { name: "Intimidation", val: 2, attr: "CHA" },
        { name: "Armes lourdes", val: 3, attr: "AGI" },
        { name: "Pistage", val: 3, attr: "LOG" },
      ],
      edges: [
        "Ossature renforcée aluminium (réduit dmg de 2)",
        "Inhibiteur de douleur (ignore 2 dés modif blessure)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Couteau de combat", dmg: 3, dmgType: "P" },
        { name: "Pistolet lourd", dmg: 6, dmgType: "P", ranges: "C OK · I −2" },
        { name: "Fusil d'assaut", dmg: 8, dmgType: "P", ranges: "C OK · I OK · L −2" },
        { name: "Aztechnology Striker (lance-roquettes)", dmg: 12, dmgType: "P", ranges: "C OK · I OK · L OK" },
      ],
      armor: 12,
    },

    "Soldat — Forces d'élite": {
      label: "Soldat (Forces d'élite)",
      tier: "Pro",
      attrs: { FOR: 5, AGI: 6, VOL: 6, LOG: 4, CHA: 2, CHC: 3 },
      essence: 3,
      skills: [
        { name: "Armes à feu", val: 6, attr: "AGI" },
        { name: "Athlétisme", val: 3, attr: "FOR" },
        { name: "Corps à corps", val: 4, attr: "AGI" },
        { name: "Intimidation", val: 2, attr: "CHA" },
        { name: "Pistage", val: 2, attr: "LOG" },
        { name: "Survie", val: 2, attr: "VOL" },
      ],
      edges: [
        "Ossature renforcée titane (réduit dmg de 3)",
        "Inhibiteur de douleur (ignore 2 dés modif blessure)",
        "Réflexes câblés (+1 attaque/Narration, +1 pt Anarchy/Scène)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 3, dmgType: "E" },
        { name: "Couteau de combat", dmg: 4, dmgType: "P" },
        { name: "Pistolet lourd", dmg: 6, dmgType: "P", ranges: "C OK · I −2" },
        { name: "Fusil d'assaut", dmg: 8, dmgType: "P", ranges: "C OK · I OK · L −2" },
        { name: "Grenade à fragmentation", dmg: 12, dmgType: "P", ranges: "C OK · I OK" },
      ],
      armor: 15,
    },

    "M. Johnson (corporatiste)": {
      label: "M. Johnson (corporatiste)",
      tier: "Antagoniste",
      attrs: { FOR: 3, AGI: 3, VOL: 5, LOG: 4, CHA: 5, CHC: 3 },
      essence: 5.5,
      skills: [
        { name: "Acrobaties", val: 1, attr: "AGI" },
        { name: "Armes à feu", val: 3, attr: "AGI" },
        { name: "Athlétisme", val: 2, attr: "FOR" },
        { name: "Comédie", val: 4, attr: "CHA" },
        { name: "Électronique", val: 1, attr: "LOG" },
        { name: "Intimidation", val: 2, attr: "CHA" },
        { name: "Négociation", val: 4, attr: "CHA" },
        { name: "Véhicules terrestres", val: 2, attr: "AGI" },
      ],
      edges: ["Phéromones optimisées (bioware, relance 2 dés Charisme rencontres)"],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Électromatraque", dmg: 7, dmgType: "E" },
        { name: "Ares Predator V (pistolet lourd)", dmg: 6, dmgType: "P", ranges: "C OK · I −2" },
      ],
      armor: 6,
    },

    "M. Johnson (à son compte)": {
      label: "M. Johnson (à son compte)",
      tier: "Antagoniste",
      attrs: { FOR: 4, AGI: 4, VOL: 4, LOG: 3, CHA: 4, CHC: 3 },
      essence: 4.5,
      skills: [
        { name: "Acrobaties", val: 1, attr: "AGI" },
        { name: "Armes à feu", val: 3, attr: "AGI" },
        { name: "Athlétisme", val: 2, attr: "FOR" },
        { name: "Comédie", val: 4, attr: "CHA" },
        { name: "Électronique", val: 2, attr: "LOG" },
        { name: "Intimidation", val: 1, attr: "CHA" },
        { name: "Négociation", val: 3, attr: "CHA" },
        { name: "Véhicules terrestres", val: 2, attr: "AGI" },
      ],
      edges: [
        "Phéromones optimisées (bioware, relance 2 dés Charisme rencontres)",
        "Augmentation de réaction (cyberware, +1 attaque/Narration, +1 pt Anarchy/Scène)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Matraque", dmg: 5, dmgType: "P" },
        { name: "Ruger Super Warhawk (pistolet lourd)", dmg: 6, dmgType: "P", ranges: "C OK · I −2" },
      ],
      armor: 6,
    },
  },

  /* ---- Génération principale ----
     Structure proche de sr5.js (variance ±1 clampée, repondération par
     rôle via Coherence) — PAS le generate V2 (seuils/RR). Les armes
     portent leur VD imprimée (pas de RR, pas de recalcul par formule) ;
     la substitution de métatype (statblocks §Règle) applique les mêmes
     deltas que metaMod + Chance ±1 + Armure Troll +3. */
  generate(opts) {
    const edId = this.id;
    const archetypeList = Object.keys(this.statBlocks);
    let statBlockKey =
      opts.archetype === "Aléatoire" || !this.statBlocks[opts.archetype]
        ? Utils.rand(archetypeList)
        : opts.archetype;
    const statBlock = this.statBlocks[statBlockKey];

    const { role, milieu } = Coherence.resolveTuple(edId, statBlockKey);

    // Métavariantes (Anarchistes, findings §13) : une métavariante
    // remplace les plages de sa souche et porte ses traits raciaux —
    // même patron que sr5.js/sr6.js (Metavariants.use/resolve).
    Metavariants.use(edId);
    const meta =
      statBlock.fixedMeta ||
      (opts.meta === "Aléatoire" ? Metavariants.randomMeta() : opts.meta);
    const mv = statBlock.fixedMeta ? null : Metavariants.resolve(meta);
    const baseMetatype = mv ? mv.baseMetatype : meta;
    const gender = opts.gender === "Aléatoire" ? Utils.randGender() : opts.gender;

    // Attributs : variance ±1 (comme SR5/anarchy2), repondération par rôle,
    // puis substitution de métatype (statblocks §Règle) si l'archétype
    // n'est pas déjà typé — s'applique à la souche même si une
    // métavariante est choisie (le modificateur « PNJ » reste celui de
    // la souche parente, la métavariante n'apportant que ses plages/traits).
    const attrs = {};
    for (const k of Object.keys(statBlock.attrs)) {
      attrs[k] = Math.max(1, statBlock.attrs[k] + Utils.randInt(-1, 1));
    }
    const roleAttrs = Coherence.reweightAttrs(attrs, role, 1);
    for (const k of Object.keys(roleAttrs)) attrs[k] = Math.max(1, roleAttrs[k]);

    let armorBonus = 0;
    if (!statBlock.fixedMeta && baseMetatype !== "Humain") {
      const mod = this.metaMod[baseMetatype] || {};
      for (const k of Object.keys(mod)) attrs[k] = (attrs[k] || 0) + mod[k];
      attrs.CHC = Math.max(0, attrs.CHC);
      if (baseMetatype === "Troll") armorBonus = 3;
    } else if (baseMetatype === "Humain" && !statBlock.fixedMeta) {
      attrs.CHC = (attrs.CHC || 0) + (this.metaMod.Humain.CHC || 0);
    }
    const range = (mv && mv.ranges) || this.attrRange[baseMetatype] || this.attrRange.Humain;
    for (const k of Object.keys(attrs)) {
      if (range[k]) attrs[k] = Utils.clamp(attrs[k], range[k][0], range[k][1]);
    }

    const chosenEdges = [];
    if (statBlock.edgeChoices > 0 && statBlock.edgeOptions?.length) {
      const shuffled = [...statBlock.edgeOptions].sort(() => Math.random() - 0.5);
      chosenEdges.push(...shuffled.slice(0, statBlock.edgeChoices));
    }

    // Sorts (Éveillés) : sorts fixes + N tirés du pool `spellOptions`, enrichis
    // par nom depuis Content.spells.anarchy1 (cat/niveau/desc). La `note` de
    // palier (ex. "8P aire") reste propre au profil. Distinct des Atouts : les
    // sorts vivent dans leur zone Combat, plus dans les edgeOptions.
    const chosenSpells = [...(statBlock.spells || [])];
    if (statBlock.spellChoices > 0 && statBlock.spellOptions?.length) {
      const shuffled = [...statBlock.spellOptions].sort(() => Math.random() - 0.5);
      chosenSpells.push(...shuffled.slice(0, statBlock.spellChoices));
    }
    const spells = chosenSpells.map((e) => this._enrichSpell(e));

    const armor = (statBlock.armor || 0) + armorBonus;
    const pnj = {
      id: Utils.uid(),
      edition: edId,
      name:
        opts.name && opts.name.trim()
          ? opts.name.trim()
          : Utils.genName(opts.originPool !== "Aléatoire" ? opts.originPool : null),
      meta: baseMetatype,
      metavariant: mv ? mv.name : null,
      metaFamily: mv ? mv.family : null,
      metaTraits: mv ? mv.traits : [],
      gender,
      tier: statBlock.tier,
      role,
      milieu,
      statBlockKey,
      archetype: statBlock.label,
      attrs,
      defense: attrs.AGI + attrs.LOG,
      init: Math.max(attrs.AGI, attrs.LOG),
      initDice: 2,
      physMon: 8 + Math.ceil(attrs.FOR / 2),
      stunMon: 8 + Math.ceil(attrs.VOL / 2),
      physFilled: 0,
      stunFilled: 0,
      skills: statBlock.skills.map((s) => ({ ...s })),
      edges: [...(statBlock.edges || []), ...chosenEdges],
      chosenEdges,
      spells,
      equip: [
        ...statBlock.weapons.map((w) => this._resolveWeaponV1(w)),
        `Armure ${armor}`,
      ],
      armure: armor,
      notes: "",
    };
    pnj.attrs.ESS = statBlock.essence != null ? statBlock.essence : 6;

    // Esprit mentor (Éveillés uniquement, findings §12/§13) : pas de
    // tradition motorisée en V1 (traditions.anarchy1 vide) — kind "shamanic"
    // fixe, cohérent avec l'absence de split Hermétique/Chamanique du livre.
    if (statBlock.awakened) {
      pnj.mentorSpirit = Magic.pickMentor(edId, null, "shamanic");
    }

    // Cohérence arme <-> compétence (renomme une compétence de combat si besoin)
    WeaponRoll.reconcile(pnj, edId);
    BonusEngine.apply(pnj, edId);
    Flavor.apply(pnj);
    return pnj;
  },

  /** Construit la chaîne d'arme au format bracket lu par ItemResolver/
      CardRenderer (VD imprimé au livre, pas recalculé). */
  _resolveWeaponV1(w) {
    return `${w.name} [VD ${w.dmg}${w.dmgType}${w.ranges ? ", " + w.ranges : ""}]`;
  },

  /** Enrichit un sort de statBlock ({ name, note? }) avec sa fiche catalogue
      (cat/niveau/desc, Content.spells.anarchy1). La `note` de palier propre au
      profil (ex. "8P aire") est conservée. Sort inconnu du catalogue → renvoyé
      tel quel (nom + note), sans planter le rendu. */
  _enrichSpell(entry) {
    const name = typeof entry === "string" ? entry : entry.name;
    const note = (entry && entry.note) || null;
    const found = (Content.spells.anarchy1 || []).find((s) => s.name === name);
    return found
      ? { name, cat: found.cat, niveau: found.niveau, desc: found.desc, note }
      : { name, note };
  },

  /** Recalcule moniteurs/Défense/Init après édition manuelle des attributs
      (façon sr5.js recalc). */
  recalc(pnj) {
    const { attrs } = pnj;
    pnj.physMon = 8 + Math.ceil(attrs.FOR / 2);
    pnj.stunMon = 8 + Math.ceil(attrs.VOL / 2);
    pnj.defense = attrs.AGI + attrs.LOG;
    pnj.init = Math.max(attrs.AGI, attrs.LOG);
    return pnj;
  },
};
