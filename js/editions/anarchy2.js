"use strict";

/* ============================================================
   ÉDITION ANARCHY 2E — Shadowrun Anarchy 2e édition
   Basé sur les profils officiels du livre de base (BBE, 2026)

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
const EditionAnarchy2 = {
  id: "anarchy2",
  label: "Anarchy 2e",
  badgeLabel: "ANARCHY 2E",
  isWip: false,

  /* ---- Contrat commun édition (résorption des branches, issue #14) ---- */
  attributes: ["FOR", "AGI", "VOL", "LOG", "CHA"],
  /** Anarchy 2.0 : tout jet de dés passe par le panneau de prise de
      risque (dés de risque, RR) plutôt que le lanceur classique. */
  usesRiskPanel: true,
  /** Anarchy 2.0 : la ressource de relance côté MJ est la Réserve de
      menace (p.138), un compteur global de scénario (pas une valeur par
      PNJ) — pilote l'affichage du badge topbar via DiceRoller. */
  usesThreatReserve: true,
  /** Action de relance « Relancer tous les dés » (p.77) : relance
      intégrale (mode "all"), jamais bloquée (la complication du 1er jet
      reste figée, gérée par Dice.rerollAnarchyAll). Pas d'attribut de
      coût par PNJ — la dépense vient de la Réserve de menace. */
  rerollAction: {
    label: "Relancer tous les dés",
    mode: "all",
    blockedBy: null,
    costAttr: null,
  },
  /* ---- Action magique (CH-M7c) : Drain déjà couvert par les complications
     du jet de risque (p.170), aucune VD séparée → tout neutre. ---- */
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
  /** Neutre : Anarchy 2.0 n'a pas de Valeur de Drain séparée — le Drain est
      déjà couvert par le système de complications du jet de risque (p.170),
      aucune pastille Drain ni conversion Physique/Étourdissant à câbler. */
  drainDamageType() {
    return "stun";
  },
  /** Neutre : pas de Drain chiffré à appliquer (cf. drainDamageType). */
  applyDrainDamage() {},

  /* ---- Drain par complication (CH-M7d, p.170) : le Drain d'Anarchy 2 n'est
     pas une VD à résister mais un effet supplémentaire lors des complications
     d'un jet de risque magique. « Tous les tests de Sorcellerie et Conjuration
     sont sujets au drain » → magicSkills liste les compétences concernées
     (donnée d'édition, lue par DiceRoller sans branche). ---- */
  magicSkills: ["Sorcellerie", "Conjuration"],

  /** Moniteur de blessures Anarchy 2 : gravité croissante + cap de chaque cran
      (2 légères / 1 grave / 1 incapacitante, p.68, `+ *CapBonus` par Atout). */
  _woundTiers(pnj) {
    return [
      { sev: "leger", label: "légère", cap: 2 + (pnj.legerCapBonus || 0) },
      { sev: "grave", label: "grave", cap: 1 + (pnj.graveCapBonus || 0) },
      { sev: "incap", label: "incapacitante", cap: 1 },
    ];
  },

  /** Encaisse une blessure d'une gravité donnée avec **cascade** (p.68) : si
      toutes les cases de ce cran sont pleines, la blessure s'aggrave au cran
      supérieur (ex. 3ᵉ légère → grave, 4ᵉ → incapacitante). Modèle général des
      blessures Anarchy 2, réutilisable par toute source de dégât automatique.
      Renvoie le cran réellement appliqué : { sev, label } (ou null si tout est
      déjà plein). */
  applyWound(pnj, severity) {
    const tiers = this._woundTiers(pnj);
    let i = tiers.findIndex((t) => t.sev === severity);
    if (i < 0) i = 0;
    for (; i < tiers.length; i++) {
      const t = tiers[i];
      const cur = pnj[`${t.sev}Filled`] || 0;
      if (cur < t.cap) {
        pnj[`${t.sev}Filled`] = cur + 1;
        return { sev: t.sev, label: t.label };
      }
    }
    return null; // moniteur saturé (déjà incapacité)
  },

  /** Applique l'effet de Drain d'une complication sur un jet magique (p.170),
      via applyWound (donc avec cascade p.68) : critique → blessure légère,
      désastre → blessure incapacitante, mineure → désavantage narratif (non
      modélisé, simple rappel). Renvoie { wound, label } pour le toast. */
  drainOnComplication(pnj, level) {
    if (level === "critical" || level === "disaster") {
      const requested = level === "critical" ? "légère" : "incapacitante";
      const applied = this.applyWound(pnj, level === "critical" ? "leger" : "incap");
      if (!applied) {
        return { wound: false, label: "Drain : moniteur déjà saturé" };
      }
      // Cascade : la blessure a été aggravée au-delà de la gravité de base.
      const escalated = applied.label !== requested;
      return {
        wound: true,
        label: `Drain : blessure ${applied.label}${escalated ? " (aggravée)" : ""}`,
      };
    }
    // minor : désavantage magique jusqu'à la prochaine narration — état flou
    // que l'app ne ferme pas ; on se contente d'un rappel (choix produit).
    return { wound: false, label: "Drain : désavantage magique jusqu'à la prochaine narration" };
  },
  ratingBadge: {
    field: "tier",
    label: "Rang",
    options: ["Figurant", "Figurant d'élite", "Lieutenant", "Boss"],
  },
  /** Neutre : Anarchy 2.0 ne documente pas de jet d'initiative chiffré pour
      les PNJ (contrairement aux véhicules autonomes, cf. vehicleModel plus
      bas) — le tracker de combat classe ces PNJ manuellement. */
  initiativeFor() {
    return null;
  },
  /** Règles de round pour le tracker de combat. Anarchy 2.0 : pas d'initiative
      chiffrée, l'ordre est narratif (combativité, cf. p.180). narrative:true →
      le tracker passe en mode dépouillé (tap-to-grise), sans init/tri/réordre. */
  combatModel: { rerollEachRound: false, passDecrement: 0, narrative: true },
  /** Disposition de combat (Vague D) : { down, morale }. Anarchy 2.0 COMBATIVITÉ
      (p.180) — champ threatLevel (nulle/faible/forte/extrême). Déclencheur
      individuel (1re blessure légère/grave, ou incapacité) OU proportion
      d'alliés hors combat (¼ / ½ / ¾). down = case incapacitante pleine
      (isDestroyed). */
  combatDisposition(pnj, group) {
    const down = this.conditionMonitor.isDestroyed(pnj);
    if (down) return { down: true, morale: null };
    const lvl = pnj.threatLevel;
    if (!lvl) return { down: false, morale: null };
    const frac = group && group.total ? group.down / group.total : 0;
    const anyWound =
      (pnj.legerFilled || 0) >= 1 || (pnj.graveFilled || 0) >= 1 || (pnj.incapFilled || 0) >= 1;
    const graveWound = (pnj.graveFilled || 0) >= 1 || (pnj.incapFilled || 0) >= 1;
    let flee;
    if (lvl === "nulle") flee = true; // évite le combat, se rend
    else if (lvl === "faible") flee = anyWound || frac >= 0.25; // 1re blessure légère / ¼
    else if (lvl === "forte") flee = graveWound || frac >= 0.5; // 1re blessure grave / ½
    else if (lvl === "extrême") flee = frac >= 0.75; // sinon seulement incapacité (= down)
    else flee = false;
    return { down: false, morale: flee ? "flee" : "steady" };
  },
  // steps() est lazy : spirits.js (catalogs) charge après les modules
  // d'édition (foyer), Spirits.ANARCHY_TIERS n'existe pas encore ici.
  summonPower: {
    field: "tier",
    label: "Niveau",
    steps: () => Spirits.ANARCHY_TIERS.map((label, i) => ({ value: i, label })),
  },
  skillModel: { shape: "extended", valRange: [0, 6], hasGroups: false },
  hasEdges: true,
  /** Les drogues Anarchy 2.0 sont vendues comme « atouts d'équipement »
      (p.150) : elles peuvent apparaître aussi bien dans les atouts que
      dans l'équipement, la source d'origine n'est pas filtrée. */
  drugModel: { matchAll: true },
  /** Neutre : Anarchy 2.0 n'a pas de compétence de Conjuration jouable
      par un PNJ généré (les esprits y sont des figurants statBlocks
      indépendants, cf. statBlocks) ; `canSummon: false` documenté.
      `types` reste fourni pour les esprits libres du générateur. */
  spiritModel: { canSummon: false, types: () => Spirits.ANARCHY_TYPES },
  /** Véhicules/drones liés (p.230) : l'Autopilote seul sert de réserve
      en autonome, pas d'initiative autonome distincte documentée dans
      le livre — neutre `initiative: null`. */
  vehicleModel: {
    /** Champs de stats affichés en pills (card) et édités (modal) :
        libellés d'équipement Anarchy auto-descriptifs, pas de
        pilote/senseurs/accel distincts (cf. commentaire de fichier). */
    statFields: [
      ["autopilote", "Autopilote"], ["structure", "Structure"],
      ["mania", "Maniabilité"], ["vitesse", "Vitesse"], ["blindage", "Blindage"],
    ],
    /** Neutre : pas d'autosoft distinct de l'autopilote en Anarchy 2.0. */
    formExtraFields: [],
    pools(v) {
      const s = v.stats || {};
      return [
        { label: "Autonome", pool: s.autopilote || 0, title: "Autopilote seul (véhicule autonome, p.230)" },
        { label: "Défense", pool: s.autopilote || 0, title: "Défense autonome : Autopilote (piloté : Pilotage + AGI du pilote)" },
      ];
    },
    initiative: null,
  },
  /** Anarchy 2.0 n'a pas de malus de dés lié aux cases remplies (le
      moniteur fonctionne par seuils de blessure — cf. statBlocks — pas par
      malus cumulatif). Neutre documenté : pas de champ "primary" unique
      non plus (physMonitor/mentMonitor/matrixMonitor séparés). */
  conditionMonitor: {
    model: "seuils de blessure (légère/grave/incapacitante), pas de malus cumulatif",
    fields: { primary: null },
    woundMalus() {
      return 0;
    },
    /** Neutre : les esprits Anarchy 2.0 sont des figurants statBlocks
        (seuils de blessure), pas de moniteur numérique dédié. */
    spiritMonitor: null,
    /** Forme du moniteur d'un véhicule/drone lié : "thresholds" (2 légères
        / 1 grave / 1 incapacitante, p.68 & 230), pas de total cumulatif. */
    vehicleFields: "thresholds",
    /** Détruit : case incapacitante pleine (case unique, cf.
        cardrenderer.anarchy.js:_monitorBoxesAnarchy CAPS.incap). Valable
        pour un véhicule/drone lié comme pour un esprit. */
    isDestroyed(entity) {
      return (entity.incapFilled || 0) >= 1;
    },
  },
  /** Résolution du jet d'arme (WeaponRoll) : pas de règle smartlink/
      smartgun en Anarchy 2.0 (neutre `null`, doc), pas de limite de
      précision, spécialité = Réduction de Risque (RR), armes lues dans
      pnj.weapons (pas pnj.equip). */
  weaponModel: {
    smartlinkBonus: null,
    accuracyLimit: false,
    specMechanic: "rr",
    source: "weapons",
  },

  /* Régime Matrice Anarchy 2.0 (p.222-223) — lu par Matrix via
     App.editionModule.matrixModel. CI à SUCCÈS FIXES (pas de jets ni
     d'attributs ASDF), Firewall fixe 1, moniteur 2L/1G/1I (4 cases), indice
     2-8, surveillance du DIEU (modèle propre). Les méthodes SR (jets, seuils,
     convergence, limites) renvoient null : chemins gardés par hasAttrs. */
  matrixModel: {
    hasAttrs: false,
    indiceRange: [2, 8],
    profileKey: "anarchy2",
    icMonitorSize() {
      return 4;
    },
    maxActiveIC() {
      return Infinity;
    },
    profileRangeText(p) {
      return ` (${p.indice})`;
    },
    monitorBoxLabel(n) {
      return ["Légère", "Légère", "Grave", "Incapacitante"][n - 1];
    },
    monitorBoxSep(n) {
      return n === 3 || n === 4 ? ' style="margin-left:3px;"' : "";
    },
    firewallLabel: " (Firewall 1)",
    overwatchDelta() {
      return 0;
    },
    pickCount(indice, candLen) {
      return Utils.clamp(1 + Math.round(indice / 2) + Utils.randInt(-1, 1), 1, candLen);
    },
    icThresholdsText() {
      return null;
    },
    /** Badges de la carte serveur (p.222) : Indice et Firewall (fixe = indice). */
    serverAttrs(srv) {
      return [
        { label: "Indice", value: srv.indice },
        { label: "Firewall", value: srv.indice },
      ];
    },
    /** Seuils d'élévation de Piratage (p.223). */
    thresholdsText(srv) {
      return `Seuils de Piratage : sans élévation <b>${srv.indice}</b> · élever à Utilisateur <b>${srv.indice + 1}</b> · à Administrateur <b>${srv.indice + 2}</b> · décryptage <b>${srv.indice}</b>`;
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

  /* ========================================================
     CATALOGUE D'ARMES OFFICIEL (Shadowrun : Anarchy 2.0, p.141-144)
     ------------------------------------------------------
     - Corps à corps ("melee") : VD = FOR + bonus (Force PLEINE réelle du
       PNJ, déjà résolue avec sa métavariante).
     - Distance ("fixed") : VD fixe, indépendant du métatype.
     Portées : 4 bandes officielles CONTACT / COURTE / MOYENNE / LONGUE,
     chacune notée OK (aucun malus), Dés. (désavantage) ou – (impossible).
     resolveWeapon() fait la correspondance par nom ; si un nom ne
     correspond à aucune catégorie officielle (ex. attaque Matrice), on
     retombe sur les vdBase/vdMeta/ranges fournis par le statBlock.
     ======================================================== */
  WEAPON_CATALOG: {
    // Anarchy 2.0 (« Bien s'armer », p.141-144). VD de mêlée = (FOR+X) :
    // Force PLEINE + bonus de catégorie. VD à distance fixe. Portées sur
    // 4 bandes [CONTACT/COURTE/MOYENNE/LONGUE], notation OK / Dés. / –.
    "Mains nues": { type: "melee", bonus: 0, dmg: "E", ranges: "[OK/–/–/–]" },
    Couteau: { type: "melee", bonus: 1, dmg: "P", ranges: "[OK/–/–/–]" },
    "Couteau de combat": { type: "melee", bonus: 1, dmg: "P", ranges: "[OK/–/–/–]" },
    Matraque: { type: "melee", bonus: 2, dmg: "P", ranges: "[OK/–/–/–]" },
    "Arme longue (katana, hache, épée)": {
      type: "melee",
      bonus: 2,
      dmg: "P",
      ranges: "[OK/–/–/–]",
    },
    Électromatraque: { type: "fixed", vd: 5, dmg: "E", ranges: "[OK/–/–/–]" },
    Taser: { type: "fixed", vd: 5, dmg: "E", ranges: "[OK/OK/–/–]" },
    "Pistolet de poche": { type: "fixed", vd: 3, dmg: "P", ranges: "[OK/OK/Dés./–]" },
    "Pistolet léger": { type: "fixed", vd: 4, dmg: "P", ranges: "[OK/OK/Dés./–]" },
    "Pistolet lourd": { type: "fixed", vd: 5, dmg: "P", ranges: "[OK/OK/Dés./–]" },
    "Pistolet automatique": { type: "fixed", vd: 4, dmg: "P", ranges: "[OK/OK/Dés./–]" },
    Mitraillette: { type: "fixed", vd: 5, dmg: "P", ranges: "[Dés./OK/OK/–]" },
    "Fusil d'assaut": { type: "fixed", vd: 7, dmg: "P", ranges: "[Dés./OK/OK/Dés.]" },
    "Fusil de précision": { type: "fixed", vd: 10, dmg: "P", ranges: "[–/Dés./Dés./OK]" },
    Shotgun: { type: "fixed", vd: 8, dmg: "P", ranges: "[Dés./OK/Dés./–]" },
    Mitrailleuse: { type: "fixed", vd: 9, dmg: "P", ranges: "[–/OK/OK/OK]" },
    Grenades: { type: "fixed", vd: 7, dmg: "P", ranges: "[OK/OK/Dés./–]" },
  },

  /** Résout une entrée d'arme (objet du statBlock) en {name, vd, ranges},
      en cherchant son nom dans le catalogue officiel (après avoir retiré
      un éventuel suffixe parenthésé, ex. "Mitraillette (sur Doberman)" →
      "Mitraillette"). Si la catégorie n'existe pas (ex. Cybercombat),
      on retombe sur les valeurs fournies par le statBlock. */
  resolveWeapon(entry, attrs, meta) {
    const baseName = entry.name.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const cat = this.WEAPON_CATALOG[entry.name] || this.WEAPON_CATALOG[baseName];
    if (!cat) {
      return {
        name: entry.name,
        vd: entry.vdMeta && entry.vdMeta[meta] ? entry.vdMeta[meta] : entry.vdBase,
        ranges: entry.ranges,
      };
    }
    const vd =
      cat.type === "melee"
        ? (attrs.FOR || 0) + cat.bonus // Anarchy 2.0 : VD mêlée = (FOR+X)
        : cat.vd;
    return {
      name: entry.name,
      vd: `${vd}${cat.dmg}`,
      ranges: cat.ranges,
    };
  },

  /** Archétype utilisé pour un spider (decker de sécurité lié à un serveur,
      issue #14) — le meilleur decker disponible dépend de l'indice défendu. */
  spiderArchetype(indice) {
    return indice >= 6 ? "Decker d'élite" : "Decker de sécurité";
  },
  /** Neutre : Anarchy 2.0 n'a pas de catégorie "special" dédiée aux
      deckers/spiders (pas de distinction implanté/externe type SR). */
  spiderSpecial: "Aucun",

  /** Bonus d'indice quand le serveur gère aussi la sécurité physique
      (Anarchy 2.0 p.222). SR5/SR6 n'ont pas cette règle : neutre `null`. */
  secPhysBonus: 1,

  /* ---- Options du formulaire ---- */
  formOptions: {
    meta: ["Aléatoire", "Humain", "Elfe", "Nain", "Ork", "Troll"],
    gender: ["Aléatoire", "M", "F", "NB"],
    tier: ["Aléatoire", "Figurant", "Figurant d'élite", "Lieutenant", "Boss"],
    archetype: [
      "Aléatoire",
      "Ganger",
      "Ganger d'élite",
      "Ganger éveillé",
      "Ganger adepte",
      "Ganger chaman",
      "Ganger decker",
      "Go-ganger",
      "Agent de sécurité",
      "Officier de sécurité",
      "Officier d'élite",
      "Mage de sécurité",
      "Mage d'élite",
      "Chaman de sécurité",
      "Chaman d'élite",
      "Adepte de sécurité",
      "Adepte d'élite",
      "Decker de sécurité",
      "Decker d'élite",
      "Rigger de sécurité",
      "Rigger d'élite",
      "Médecin de combat",
      "Militaire",
      "Commando militaire",
      "Johnson",
      "Employé corporatiste",
      "Cadre corporatiste",
      "Enquêteur",
      "Coyote",
      // Crime organisé
      "Soldat de syndicat",
      "Lieutenant de syndicat (capo)",
      // Police & ordre
      "Flic des rues",
      "Officier de police",
      "Détective",
      // Bas de l'échelle / rue
      "Civil",
      "Voyou de rue",
      "Technicien de rue",
      // Ombres
      "Ombre",
    ],
  },

  /* ---- Attributs de base par métatype ----
     Anarchy 2e : FOR / AGI / VOL / LOG / CHA uniquement
     Les valeurs entre parenthèses sont des variantes métatype
  ---- */
  attrBase: {
    // [FOR, AGI, VOL, LOG, CHA]
    Humain: { FOR: 3, AGI: 3, VOL: 3, LOG: 3, CHA: 3 },
    Elfe: { FOR: 3, AGI: 3, VOL: 3, LOG: 3, CHA: 3 }, // bonus CHA/AGI selon profil
    Nain: { FOR: 3, AGI: 3, VOL: 3, LOG: 3, CHA: 3 }, // bonus VOL/LOG/FOR
    Ork: { FOR: 4, AGI: 3, VOL: 3, LOG: 3, CHA: 2 },
    Troll: { FOR: 5, AGI: 2, VOL: 3, LOG: 2, CHA: 1 },
  },

  /* ---- Stat blocks complets ----
     Format par statBlock :
     {
       label,       // nom affiché
       attrs,       // { FOR, AGI, VOL, LOG, CHA } valeurs humain de base
       attrsMeta,   // overrides par métatype { 'Ork': { FOR:4 }, ... }
       skills,      // [ { name, val, attr, rr, spec?, specVal?, specAttr?, specRR? } ]
       edges,       // atouts fixes (toujours présents)
       edgeChoices, // nb d'atouts au choix parmi edgeOptions
       edgeOptions,
       weapons,     // [ { name, vd, ranges } ]  ranges = string '[OK/OK/...]'
       equip,       // string[]
       threatLevel, // 'nulle'|'faible'|'forte'|'extrême'
       // Seuils de blessures (p.68) : VD > FOR/VOL/FW(+Protection) → légère,
       // +3 → grave, +6 → incapacitante, selon le type de dommage (phys/
       // ment/matriciel). Le personnage n'a qu'UN SEUL moniteur d'état,
       // à cases fixes (2 légères / 1 grave / 1 incapacitante, cf. js/ui.js
       // _monitorBoxesAnarchy()), commun à tous les types de dommages —
       // ces seuils ne servent qu'à déterminer la gravité d'un coup, pas
       // à définir des moniteurs séparés. Cases cochées stockées sur le
       // PNJ sous legerFilled/graveFilled/incapFilled (pas dans ce fichier).
       physMonitor,  // [leger, grave, incapacitante]  base humain
       physMonitorMeta, // { 'Ork': [5,8,11], ... }
       mentMonitor, // [leger, grave, incapacitante]
       mentMonitorMeta,
       matrixMonitor,   // null ou [leger, grave, incapacitante]  (deckers)
       awakened,     // null | 'hermétique' | 'adepte' | 'chamanique'
       spells,       // string[] (si éveillé)
     }
  ---- */
  statBlocks: {
    /* ======== GANGERS (p.244-248 Anarchy V2) ======== */

    Ganger: {
      label: "Ganger",
      attrs: { FOR: 3, AGI: 2, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 4 },
        Troll: { FOR: 5 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 3,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Combat rapproché",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Lames",
          specVal: 4,
          specAttr: "AGI",
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
          specAttr: "CHA",
          specRR: 0,
        },
      ],
      edges: [],
      edgeChoices: 1,
      edgeOptions: [
        "Substituts musculaires (cyberware) : VD +1 en combat rapproché",
        "Jazz (drogue) : +1 action par combat",
        "Bras cybernétique (cyberware) : RR 1 aux tests de Combat rapproché",
        "Zélé (trait) : Avantage pour résister à l'intimidation ou la peur ; combativité forte",
        "Armure dermique (cyberware) : Armure +1",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Couteau",
          vdBase: 4,
          vdMeta: { Ork: 5, Troll: 6 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Pistolet léger",
          vdBase: 4,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Synthécuir aux couleurs du gang (Armure 1)"],
      threatLevel: "faible",
      physMonitor: [4, 7, 10],
      physMonitorMeta: { Ork: [5, 8, 11], Troll: [6, 9, 12] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    "Ganger d'élite": {
      label: "Ganger d'élite / Membre d'un syndicat du crime",
      attrs: { FOR: 3, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 4 },
        Troll: { FOR: 5 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Lames",
          specVal: 4,
          specAttr: "AGI",
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
          specAttr: "CHA",
          specRR: 0,
          specMeta: { Elfe: { specVal: 4 } },
        },
      ],
      edges: [],
      edgeChoices: 2,
      edgeOptions: [
        "Substituts musculaires (cyberware) : VD +1 en combat rapproché",
        "Jazz (drogue) : +1 action par combat",
        "Bras cybernétique (cyberware) : RR 1 aux tests de Combat rapproché",
        "Zélé (trait) : Avantage pour résister à l'intimidation ou la peur ; combativité forte",
        "Armure dermique (cyberware) : Armure +1",
        "Yeux cybernétiques avec smartlink (cyberware) : RR 1 aux tests d'Armes à distance (mitraillettes), vision nocturne",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Arme longue (katana, hache, épée)",
          vdBase: 5,
          vdMeta: { Ork: 6, Troll: 7 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        {
          name: "Mitraillette",
          vdBase: 5,
          vdMeta: {},
          ranges: "[Dés./OK/OK/–]",
        },
      ],
      equip: ["Commlink", "Manteau renforcé (Armure 2)"],
      threatLevel: "faible",
      physMonitor: [5, 8, 11],
      physMonitorMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    "Ganger éveillé": {
      label: "Ganger éveillé",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 3,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Ork: { val: 3 }, Troll: { val: 3 } },
        },
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
          specAttr: "VOL",
          specRR: 0,
          specMeta: { Nain: { val: 4 } },
        },
        {
          name: "Conjuration",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Esprits du feu",
          specVal: 4,
          specAttr: "LOG",
          specRR: 0,
        },
        {
          name: "Influence",
          val: 2,
          attr: "CHA",
          rr: 0,
          spec: "Intimidation",
          specVal: 3,
          specAttr: "CHA",
          specRR: 0,
        },
      ],
      edges: [
        "Éveillé (tradition au choix) : Perception & projection astrale, Sorcellerie, Conjuration",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Focus de combat (équipement) : RR 1 aux tests de Sorcellerie (Combat)",
        "Focus de feu (équipement) : RR 1 aux tests de Conjuration (esprits du feu)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Couteau",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          ranges: "[OK/–/–/–]",
        },
      ],
      equip: ["Commlink", "Synthécuir aux couleurs du gang (Armure 1)"],
      threatLevel: "faible",
      physMonitor: [3, 6, 9],
      physMonitorMeta: { Ork: [4, 7, 10], Troll: [5, 8, 11] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: "hermétique",
      spells: [
        "Armure (Manipulation, Armure +1 par 3 succès)",
        "Trait de feu (Combat indirect, VD = VOL, dommages physiques)",
        "Éclair mana (Combat direct, VD = succès, dommages mentaux)",
        "Invisibilité (Illusion indirect)",
        "Soins (Santé, seuil selon blessure)",
      ],
    },

    "Ganger adepte": {
      label: "Ganger adepte",
      attrs: { FOR: 2, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Ork: { val: 4 }, Troll: { val: 4 } },
        },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Mains nues",
          specVal: 5,
          specAttr: "AGI",
          specRR: 0,
        },
        {
          name: "Furtivité",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 3,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        {
          name: "Influence",
          val: 2,
          attr: "CHA",
          rr: 0,
          spec: "Intimidation",
          specVal: 3,
          specAttr: "CHA",
          specRR: 0,
        },
      ],
      edges: ["Éveillé : Adepte"],
      edgeChoices: 1,
      edgeOptions: [
        "Sens du combat (pouvoir d'adepte) : RR 1 aux tests d'Athlétisme (défense à distance) et Combat rapproché (défense)",
        "Frappe élémentaire électrique (pouvoir d'adepte) : VD +1 à mains nues, fait perdre une action à la cible en cas de blessure",
        "Réflexes améliorés (pouvoir d'adepte) : +1 action par combat",
        "Furtivité améliorée (pouvoir d'adepte) : RR 1 aux tests de Furtivité (discrétion physique)",
        "Combat rapproché amélioré (pouvoir d'adepte) : RR 1 aux tests de Combat rapproché (mains nues)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
      ],
      equip: ["Commlink", "Synthécuir aux couleurs du gang (Armure 1)"],
      threatLevel: "faible",
      physMonitor: [3, 6, 9],
      physMonitorMeta: { Ork: [4, 7, 10], Troll: [5, 8, 11] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: "adepte",
    },

    "Ganger decker": {
      label: "Ganger decker",
      attrs: { FOR: 2, AGI: 2, VOL: 2, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 2,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Ork: { val: 3 }, Troll: { val: 3 } },
        },
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
          specAttr: "LOG",
          specRR: 0,
        },
        {
          name: "Piratage",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Force brute",
          specVal: 4,
          specAttr: "LOG",
          specRR: 0,
        },
        { name: "Cybercombat", val: 3, attr: "VOL", rr: 0 },
      ],
      edges: [
        "Cyberdeck (Attaque 1, Firewall 2)",
        "Datajack (cyberware) : IND, RV cold-sim",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Programme Exploitation (équipement) : RR 1 aux tests de Piratage (force brute)",
        "Programme Agresseur (équipement) : RR 1 aux tests de Piratage (cybercombat)",
        "Programme Navigateur (équipement) : RR 1 aux tests d'Électronique (recherche matricielle)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Couteau",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Pistolet léger",
          vdBase: 4,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        { name: "Cybercombat", vdBase: 1, vdMeta: {}, ranges: "[matriciel]" },
      ],
      equip: ["Commlink", "Synthécuir aux couleurs du gang (Armure 1)"],
      threatLevel: "faible",
      physMonitor: [3, 6, 9],
      physMonitorMeta: { Ork: [4, 7, 10], Troll: [5, 8, 11] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: [2, 5, 8],
      awakened: null,
    },

    "Go-ganger": {
      label: "Go-ganger / Rigger",
      attrs: { FOR: 2, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 3,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Ork: { val: 3 }, Troll: { val: 3 } },
        },
        {
          name: "Armes à distance",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Pistolets",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        {
          name: "Pilotage",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Motos",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
        },
        {
          name: "Influence",
          val: 2,
          attr: "CHA",
          rr: 0,
          spec: "Intimidation",
          specVal: 3,
          specAttr: "CHA",
          specRR: 0,
        },
        {
          name: "Ingénierie",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Armes contrôlées à distance",
          specVal: 4,
          specAttr: "LOG",
          specRR: 0,
        },
      ],
      edges: [],
      edgeChoices: 1,
      edgeOptions: [
        "Moto de course (véhicule) : Autopilote 6, Structure 4, Maniabilité 2, Vitesse 6, Blindage 0",
        "Chopper (véhicule) : Autopilote 6, Structure 5, Maniabilité 2, Vitesse 5, Blindage 0",
        "Voiture sportive (véhicule) : Autopilote 6, Structure 5, Maniabilité 2, Vitesse 5, Blindage 0",
        "Moto personnalisée (véhicule) : RR 1 aux tests de Pilotage (motos)",
        "Yeux cybernétiques (cyberware) : RR 1 aux tests d'Armes à distance (pistolets)",
        "Jazz (drogue) : +1 action par combat",
        "Zélé (trait) : Avantage pour résister à l'intimidation ou la peur ; combativité forte",
        "Armure dermique (cyberware) : Armure +1",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Couteau",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Pistolet automatique",
          vdBase: 4,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        {
          name: "Mitraillette (sur Doberman)",
          vdBase: 5,
          vdMeta: {},
          ranges: "[Dés./OK/OK/–]",
        },
      ],
      equip: ["Commlink", "Synthécuir aux couleurs du gang (Armure 1)"],
      threatLevel: "faible",
      physMonitor: [3, 6, 9],
      physMonitorMeta: { Ork: [4, 7, 10], Troll: [5, 8, 11] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    /* ======== SÉCURITÉ / POLICE NORMAUX (p.247-249) ======== */

    "Agent de sécurité": {
      label: "Agent de sécurité / Flic des rues",
      attrs: { FOR: 3, AGI: 2, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 4 },
        Troll: { FOR: 5 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 3,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Troll: { val: 4 } },
        },
        {
          name: "Armes à distance",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Pistolets",
          specVal: 3,
          specAttr: "AGI",
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
          specAttr: "LOG",
          specRR: 0,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
        {
          name: "Intimidation",
          val: 3,
          attr: "CHA",
          rr: 0,
          specMeta: { Elfe: { val: 4 } },
        },
      ],
      edges: [],
      edgeChoices: 1,
      edgeOptions: [
        "Smartlink (cyberware) : RR 1 aux tests d'Armes à distance (pistolets)",
        "Yeux cybernétiques (cyberware) : RR 1 aux tests de Perception (physique)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/–/–/–]",
          note: "perte d'une action en cas de dommages",
        },
        {
          name: "Pistolet léger",
          vdBase: 4,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Gilet pare-balles (Armure 3)"],
      threatLevel: "faible",
      physMonitor: [6, 9, 12],
      physMonitorMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    "Officier de sécurité": {
      label: "Officier de sécurité / Police",
      attrs: { FOR: 3, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 4 },
        Troll: { FOR: 5 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 4,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
        },
        {
          name: "Armes à distance",
          val: 5,
          attr: "AGI",
          rr: 1,
          spec: "Mitraillettes / Shotguns",
          specVal: 5,
          specAttr: "AGI",
          specRR: 1,
        },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Armes contondantes",
          specVal: 4,
          specAttr: "AGI",
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
          specAttr: "LOG",
          specRR: 1,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [
        "Yeux cybernétiques avec identification de cibles (cyberware) : RR 1 aux tests d'Armes à distance et de Perception (physique), vision nocturne",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Réflexes câblés (cyberware) : +1 action par combat",
        "Armure dermique (cyberware) : Armure +1",
        "Smartlink (cyberware) : RR 1 aux tests d'Armes à distance (mitraillettes ou shotguns)",
        "Câblage de compétence (cyberware) : RR 1 aux tests de Combat rapproché (armes contondantes)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/–/–/–]",
          note: "perte d'une action en cas de dommages",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        {
          name: "Arme principale au choix",
          choices: [
            {
              name: "Mitraillette",
              vdBase: 5,
              vdMeta: {},
              ranges: "[Dés./OK/OK/–]",
            },
            {
              name: "Shotgun",
              vdBase: 8,
              vdMeta: {},
              ranges: "[Dés./OK/Dés./–]",
            },
          ],
        },
      ],
      equip: [
        "Commlink",
        "Gilet pare-balles (Armure 3) + bouclier anti-émeutes optionnel (Armure +1)",
      ],
      threatLevel: "faible",
      physMonitor: [6, 9, 12],
      physMonitorMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    "Mage de sécurité": {
      label: "Mage de sécurité / Police",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 4, attr: "LOG", rr: 0 },
        { name: "Astral", val: 4, attr: "LOG", rr: 0 },
        {
          name: "Sorcellerie",
          val: 5,
          attr: "VOL",
          rr: 0,
          spec: "Sorts de combat",
          specVal: 4,
          specAttr: "VOL",
          specRR: 0,
          specMeta: { Nain: { val: 6, spec: "Sorts de combat", specVal: 5 } },
        },
        {
          name: "Conjuration",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Esprits des aînés",
          specVal: 4,
          specAttr: "LOG",
          specRR: 0,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [
        "Éveillé (tradition hermétique) : Perception & projection astrale, Sorcellerie, Conjuration",
        "Focus de maintien : permet de maintenir 2 sorts sans malus et 4 avec un désavantage",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Focus de combat (équipement) : RR 2 aux tests de Sorcellerie (sorts de combat)",
        "Focus de détection (équipement) : RR 2 aux tests de Sorcellerie (sorts de détection)",
        "Focus d'illusion (équipement) : RR 1 aux tests de Sorcellerie (sorts d'illusion)",
        "Focus de manipulation (équipement) : RR 1 aux tests de Sorcellerie (sorts de manipulation)",
        "Focus des aînés (équipement) : RR 2 aux tests de Conjuration (esprits des aînés)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/–/–/–]",
          note: "perte d'une action en cas de dommages",
        },
        {
          name: "Pistolet léger",
          vdBase: 4,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Gilet pare-balles (Armure 3)"],
      threatLevel: "faible",
      physMonitor: [5, 8, 11],
      physMonitorMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: "hermétique",
      spells: [
        "Analyse de véracité (Détection, Seuil CHA+VOL)",
        "Armure (Manipulation, Armure +1 par 3 succès)",
        "Confusion (Illusion, Seuil VOL+LOG, inflige un désavantage)",
        "Détection des ennemis (Détection, 2 succès par portée)",
        "Éclair étourdissant (Combat direct, VD = succès, dommages mentaux étourdissants)",
        "Foudre (Combat indirect, VD = VOL, dommages physiques)",
        "Sens du combat (Détection, Seuil 5, avantages en Combat rapproché et défense à distance)",
        "Soins (Santé, seuil selon blessure)",
      ],
    },

    "Decker de sécurité": {
      label: "Decker de sécurité / Police",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 3,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Ork: { val: 3 }, Troll: { val: 3 } },
        },
        { name: "Armes à distance", val: 2, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 2, attr: "AGI", rr: 0 },
        {
          name: "Furtivité",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        { name: "Matricielle", val: 4, attr: "LOG", rr: 0 },
        {
          name: "Électronique",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Protection matricielle",
          specVal: 4,
          specAttr: "LOG",
          specRR: 0,
        },
        {
          name: "Piratage",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Cybercombat",
          specVal: 4,
          specAttr: "VOL",
          specRR: 0,
        },
      ],
      edges: [
        "Cyberdeck (Attaque 4, Firewall 4)",
        "Datajack (cyberware) : IND, RV cold-sim",
        "Cyberjack (cyberware) : remplacement du datajack ; IND, RV cold-sim, +1 action par narration en RV",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Programme Agresseur (équipement) : RR 2 aux tests de Piratage (cybercombat)",
        "Programme Exploitation (équipement) : RR 2 aux tests de Piratage (force brute)",
        "Programme Moniteur (équipement) : RR 2 aux tests d'Électronique (protection matricielle)",
        "Programme Navigateur (équipement) : RR 2 aux tests d'Électronique (recherche matricielle)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/–/–/–]",
          note: "perte d'une action en cas de dommages",
        },
        {
          name: "Pistolet léger",
          vdBase: 4,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        { name: "Cybercombat", vdBase: 4, vdMeta: {}, ranges: "[matriciel]" },
      ],
      equip: ["Commlink", "Gilet pare-balles (Armure 3)"],
      threatLevel: "faible",
      physMonitor: [5, 8, 11],
      physMonitorMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: [4, 7, 10],
      awakened: null,
    },

    "Adepte de sécurité": {
      label: "Adepte de sécurité / Police",
      attrs: { FOR: 3, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 4 },
        Troll: { FOR: 5 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 4,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
        },
        {
          name: "Course",
          val: 4,
          attr: "FOR",
          rr: 0,
          specMeta: { Ork: { val: 5 }, Troll: { val: 5 } },
        },
        { name: "Armes à distance", val: 4, attr: "AGI", rr: 0 },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Mains nues",
          specVal: 5,
          specAttr: "AGI",
          specRR: 1,
        },
        {
          name: "Furtivité",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [
        "Éveillé : Adepte",
        "Combat rapproché amélioré (pouvoir d'adepte) : RR 1 aux tests de Combat rapproché (mains nues)",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Sens du combat (pouvoir d'adepte) : RR 1 aux tests d'Athlétisme (défense à distance) et Combat rapproché (défense)",
        "Frappe élémentaire électrique (pouvoir d'adepte) : VD +2 à mains nues, fait perdre une action à la cible en cas de blessure",
        "Réflexes améliorés (pouvoir d'adepte) : +1 action par combat",
        "Furtivité améliorée (pouvoir d'adepte) : RR 1 aux tests de Furtivité (discrétion physique)",
        "Perception améliorée (pouvoir d'adepte) : RR 2 aux tests de Perception (physique)",
        "Course sur les murs (pouvoir d'adepte) : permet de courir une courte distance sur les murs. RR 1 aux tests d'Athlétisme (course)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Frappe élémentaire électrique",
          vdBase: 5,
          vdMeta: { Ork: 6, Troll: 7 },
          ranges: "[OK/–/–/–]",
          note: "perte d'une action en cas de dommage",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Gilet pare-balles (Armure 3)"],
      threatLevel: "faible",
      physMonitor: [6, 9, 12],
      physMonitorMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: "adepte",
    },

    "Rigger de sécurité": {
      label: "Rigger de sécurité / Police",
      attrs: { FOR: 2, AGI: 3, VOL: 2, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 3,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Ork: { val: 3 }, Troll: { val: 3 } },
        },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Furtivité",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 5,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Perception", val: 4, attr: "LOG", rr: 0 },
        { name: "Pilotage", val: 5, attr: "AGI", rr: 1 },
        {
          name: "Ingénierie",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Armes contrôlées à distance",
          specVal: 5,
          specAttr: "LOG",
          specRR: 1,
        },
      ],
      edges: [
        "Câblage de contrôle de véhicules (cyberware) : IND, RV cold-sim, permet de plonger dans un drone",
        "Console de commande pour rigger (équipement) : mode siège du capitaine, 2 drones concurrents. RR 1 aux tests de Pilotage et d'Ingénierie (armes contrôlées à distance)",
        "Lockheed Optic-X2 (petit drone volant) : Autopilote 6, Structure 1, Maniabilité 9, Vitesse 4, Blindage 0. RR 2 aux tests de Furtivité (discrétion physique) et de Perception (physique)",
      ],
      edgeChoices: 0,
      edgeOptions: [],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Pistolet automatique",
          vdBase: 4,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        {
          name: "Fusil d'assaut (drones)",
          vdBase: 7,
          vdMeta: {},
          ranges: "[Dés./OK/OK/Dés.]",
        },
      ],
      equip: ["Commlink", "Gilet pare-balles (Armure 3)"],
      threatLevel: "faible",
      physMonitor: [5, 8, 11],
      physMonitorMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    /* ======== SÉCURITÉ / POLICE ÉLITE (p.250-253) ======== */

    "Médecin de combat": {
      label: "Médecin de combat",
      attrs: { FOR: 2, AGI: 3, VOL: 3, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
        },
        {
          name: "Armes à distance",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Mitraillettes",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 4, attr: "AGI", rr: 0 },
        {
          name: "Perception",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Physique",
          specVal: 5,
          specAttr: "LOG",
          specRR: 1,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
        {
          name: "Survie",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Premiers soins",
          specVal: 6,
          specAttr: "LOG",
          specRR: 1,
        },
      ],
      edges: [
        "Câblage de compétence (cyberware) : RR 1 aux tests de Survie (premiers soins)",
        "Yeux cybernétiques (cyberware) : RR 1 aux tests de Perception (physique), vision thermographique",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Médikit autonome DocWagon Pro+ (drone) Autopilote 9, fixe",
        "Réflexes câblés (cyberware) : +1 action par combat",
        "Armure dermique (cyberware) : Armure +1",
        "Smartlink (cyberware) : RR 1 aux tests d'Armes à distance (mitraillettes)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Couteau de combat",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        {
          name: "Mitraillette",
          vdBase: 5,
          vdMeta: {},
          ranges: "[Dés./OK/OK/–]",
        },
      ],
      equip: [
        "Commlink",
        "Gilet pare-balles (Armure 3)",
        "Stim patches et trauma patches",
      ],
      threatLevel: "forte",
      physMonitor: [5, 8, 11],
      physMonitorMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },

    "Mage d'élite": {
      label: "Mage d'élite de sécurité / Police",
      attrs: { FOR: 2, AGI: 3, VOL: 4, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 5 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Ork: { val: 4 }, Troll: { val: 4 } },
        },
        { name: "Combat rapproché", val: 4, attr: "AGI", rr: 0 },
        { name: "Armes à distance", val: 4, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 4, attr: "AGI", rr: 0 },
        { name: "Perception", val: 4, attr: "LOG", rr: 0 },
        { name: "Astral", val: 5, attr: "LOG", rr: 0 },
        {
          name: "Sorcellerie",
          val: 5,
          attr: "VOL",
          rr: 0,
          spec: "Sorts de combat",
          specVal: 8,
          specAttr: "VOL",
          specRR: 3,
          specMeta: {
            Nain: { val: 6, spec: "Sorts de combat", specVal: 8, specRR: 3 },
          },
        },
        {
          name: "Conjuration",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Esprits des aînés",
          specVal: 5,
          specAttr: "LOG",
          specRR: 0,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [
        "Éveillé (tradition hermétique) : Perception & projection astrale, Sorcellerie, Conjuration",
        "Focus de sorcellerie (équipement) : RR 1 aux tests de Sorcellerie",
        "Focus de combat (équipement) : RR 2 aux tests de Sorcellerie (sorts de combat)",
        "Focus de maintien : permet de maintenir 3 sorts sans malus et 6 avec malus",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Focus de détection (équipement) : RR 1 aux tests de Sorcellerie (sorts de détection)",
        "Focus d'illusion (équipement) : RR 1 aux tests de Sorcellerie (sorts d'illusion)",
        "Focus de manipulation (équipement) : RR 1 aux tests de Sorcellerie (sorts de manipulation)",
        "Focus des aînés (équipement) : RR 2 aux tests de Conjuration (esprits des aînés)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/–/–/–]",
          note: "perte d'une action en cas de dommages",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Armure intégrale + Casque (Armure 4)"],
      threatLevel: "forte",
      physMonitor: [6, 9, 12],
      physMonitorMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      mentMonitor: [4, 7, 10],
      mentMonitorMeta: { Nain: [5, 8, 11] },
      matrixMonitor: null,
      awakened: "hermétique",
      spells: [
        "Armure (Manipulation, Armure +1 par 3 succès)",
        "Augmentation de réflexes (Santé, effets selon succès 3/5/7)",
        "Barrière physique (Manipulation, Force 1 par succès, 1 succès par tranche de 3 mètres)",
        "Confusion (Illusion, Seuil VOL+LOG, inflige un désavantage)",
        "Détection des ennemis (Détection, 2 succès par portée)",
        "Éclair étourdissant (Combat direct, VD = succès, dommages mentaux étourdissants)",
        "Foudre (Combat indirect, VD = VOL, dommages physiques)",
        "Invisibilité (Illusion indirect)",
        "Sens du combat (Détection, Seuil 5, avantages en Combat rapproché et défense à distance)",
        "Soins (Santé, seuil selon blessure)",
      ],
    },

    "Officier d'élite": {
      label: "Officier d'élite de sécurité / Police",
      attrs: { FOR: 3, AGI: 4, VOL: 3, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 4 },
        Troll: { FOR: 5 },
        Nain: { VOL: 4 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 4,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 5,
          specAttr: "AGI",
          specRR: 0,
        },
        {
          name: "Armes à distance",
          val: 5,
          attr: "AGI",
          rr: 1,
          spec: "Arme principale",
          specVal: 8,
          specAttr: "AGI",
          specRR: 3,
        },
        {
          name: "Combat rapproché",
          val: 5,
          attr: "AGI",
          rr: 1,
          spec: "Armes contondantes",
          specVal: 5,
          specAttr: "AGI",
          specRR: 1,
        },
        {
          name: "Furtivité",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 5,
          specAttr: "AGI",
          specRR: 0,
        },
        {
          name: "Perception",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Physique",
          specVal: 5,
          specAttr: "LOG",
          specRR: 1,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [
        "Réflexes câblés (cyberware) : +1 action par narration",
        "Yeux cybernétiques avec réseau tactique (cyberware) : RR 1 aux tests d'Armes à distance et de Perception (physique), compensation anti-flash, vision nocturne",
        "Smartlink (cyberware) : RR 2 aux tests d'Armes à distance (arme principale)",
        "Câblage de compétence (cyberware) : RR 1 aux tests de Combat rapproché",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Armure dermique (cyberware) : Armure +1",
        "Combinaison caméléon (équipement) : RR 1 aux tests de Furtivité (discrétion physique)",
        "Producteur de plaquettes (bioware) : +1 blessure légère",
        "Réseau tactique avancé (amélioration de cyberware) : RR 1 aux tests d'Athlétisme (défense à distance)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/–/–/–]",
          note: "perte d'une action en cas de dommages",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        {
          name: "Arme principale au choix",
          choices: [
            {
              name: "Mitraillette",
              vdBase: 5,
              vdMeta: {},
              ranges: "[Dés./OK/OK/–]",
            },
            {
              name: "Shotgun",
              vdBase: 8,
              vdMeta: {},
              ranges: "[Dés./OK/Dés./–]",
            },
            {
              name: "Fusil d'assaut",
              vdBase: 7,
              vdMeta: {},
              ranges: "[Dés./OK/OK/Dés.]",
            },
            {
              name: "Fusil de précision",
              vdBase: 10,
              vdMeta: {},
              ranges: "[–/Dés./Dés./OK]",
            },
            {
              name: "Mitrailleuse",
              vdBase: 9,
              vdMeta: {},
              ranges: "[–/OK/OK/OK]",
            },
          ],
        },
      ],
      equip: [
        "Commlink",
        "Armure intégrale + Casque (Armure 4) + bouclier balistique optionnel (Armure +1)",
      ],
      threatLevel: "forte",
      physMonitor: [7, 10, 13],
      physMonitorMeta: { Ork: [8, 11, 14], Troll: [9, 12, 15] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },

    "Ganger chaman": {
      label: "Ganger chaman",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 3 }, Troll: { FOR: 4 }, Nain: { VOL: 4 }, Elfe: { CHA: 3 } },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 3,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Ork: { val: 3 }, Troll: { val: 3 } },
        },
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
          specAttr: "VOL",
          specRR: 0,
          specMeta: { Nain: { val: 4 } },
        },
        {
          name: "Conjuration",
          val: 3,
          attr: "CHA",
          rr: 0,
          spec: "Esprits des bêtes",
          specVal: 4,
          specAttr: "CHA",
          specRR: 0,
        },
        {
          name: "Influence",
          val: 2,
          attr: "CHA",
          rr: 0,
          spec: "Intimidation",
          specVal: 3,
          specAttr: "CHA",
          specRR: 0,
        },
      ],
      edges: [
        "Éveillé (tradition chamanique) : Perception & projection astrale, Sorcellerie, Conjuration",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Focus de combat (équipement) : RR 1 aux tests de Sorcellerie (sorts de combat)",
        "Focus des bêtes (équipement) : RR 1 aux tests de Conjuration (esprits des bêtes)",
      ],
      weapons: [
        { name: "Mains nues", vdBase: 2, vdMeta: { Ork: 3, Troll: 4 }, ranges: "[OK/–/–/–]" },
        { name: "Couteau", vdBase: 3, vdMeta: { Ork: 4, Troll: 5 }, ranges: "[OK/–/–/–]" },
      ],
      equip: ["Commlink", "Synthécuir aux couleurs du gang (Armure 1)", "Matériaux pour loge magique"],
      threatLevel: "faible",
      physMonitor: [3, 6, 9],
      physMonitorMeta: { Ork: [4, 7, 10], Troll: [5, 8, 11] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: "chamanique",
      spells: [
        "Trait de feu (Combat indirect : VD Volonté + succès, enflamme)",
        "Éclair mana (Combat direct : VD succès nets, mentaux)",
        "Armure (Manipulation : +1 Armure par 3 succès)",
        "Détection de la vie (Détection : sens étendu)",
        "Soins (Santé : soigne selon la gravité)",
      ],
    },

    "Chaman de sécurité": {
      label: "Chaman de sécurité / Police",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 2, CHA: 3 },
      attrsMeta: { Ork: { FOR: 3 }, Troll: { FOR: 4 }, Nain: { VOL: 4 }, Elfe: { CHA: 4 } },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 4, attr: "LOG", rr: 0 },
        { name: "Astral", val: 4, attr: "LOG", rr: 0 },
        {
          name: "Sorcellerie",
          val: 5,
          attr: "VOL",
          rr: 0,
          spec: "Sorts de combat",
          specVal: 4,
          specAttr: "VOL",
          specRR: 0,
          specMeta: { Nain: { val: 6, spec: "Sorts de combat", specVal: 5 } },
        },
        {
          name: "Conjuration",
          val: 4,
          attr: "CHA",
          rr: 0,
          spec: "Esprits des bêtes",
          specVal: 4,
          specAttr: "CHA",
          specRR: 0,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [
        "Éveillé (tradition chamanique) : Perception & projection astrale, Sorcellerie, Conjuration",
        "Focus de maintien : permet de maintenir 2 sorts sans malus",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Focus de combat (équipement) : RR 2 aux tests de Sorcellerie (sorts de combat)",
        "Focus de détection (équipement) : RR 2 aux tests de Sorcellerie (sorts de détection)",
        "Focus de santé (équipement) : RR 1 aux tests de Sorcellerie (sorts de santé)",
        "Focus des bêtes (équipement) : RR 2 aux tests de Conjuration (esprits des bêtes)",
      ],
      weapons: [
        { name: "Mains nues", vdBase: 2, vdMeta: { Ork: 3, Troll: 4 }, ranges: "[OK/–/–/–]" },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/–/–/–]",
          note: "perte d'une action en cas de dommages",
        },
        { name: "Pistolet léger", vdBase: 4, vdMeta: {}, ranges: "[OK/OK/Dés./–]" },
      ],
      equip: ["Commlink", "Gilet pare-balles (Armure 3)", "Matériaux pour loge magique"],
      threatLevel: "faible",
      physMonitor: [5, 8, 11],
      physMonitorMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: "chamanique",
      spells: [
        "Éclair étourdissant (Combat direct : VD succès nets, mentaux étourdissants)",
        "Foudre (Combat indirect : VD Volonté + succès, fait perdre une action)",
        "Détection des ennemis (Détection : sens étendu)",
        "Sens du combat (Détection : avantage CaC et défense à distance)",
        "Armure (Manipulation : +1 Armure par 3 succès)",
        "Soins (Santé)",
      ],
    },

    "Chaman d'élite": {
      label: "Chaman d'élite de sécurité / Police",
      attrs: { FOR: 2, AGI: 3, VOL: 4, LOG: 2, CHA: 3 },
      attrsMeta: { Ork: { FOR: 3 }, Troll: { FOR: 4 }, Nain: { VOL: 5 }, Elfe: { CHA: 4 } },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Ork: { val: 4 }, Troll: { val: 4 } },
        },
        { name: "Combat rapproché", val: 4, attr: "AGI", rr: 0 },
        { name: "Armes à distance", val: 4, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 4, attr: "AGI", rr: 0 },
        { name: "Perception", val: 4, attr: "LOG", rr: 0 },
        { name: "Astral", val: 5, attr: "LOG", rr: 0 },
        {
          name: "Sorcellerie",
          val: 5,
          attr: "VOL",
          rr: 0,
          spec: "Sorts de combat",
          specVal: 8,
          specAttr: "VOL",
          specRR: 3,
          specMeta: { Nain: { val: 6, spec: "Sorts de combat", specVal: 8, specRR: 3 } },
        },
        {
          name: "Conjuration",
          val: 4,
          attr: "CHA",
          rr: 0,
          spec: "Esprits des bêtes",
          specVal: 5,
          specAttr: "CHA",
          specRR: 0,
        },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [
        "Éveillé (tradition chamanique) : Perception & projection astrale, Sorcellerie, Conjuration",
        "Focus de sorcellerie (équipement) : RR 1 aux tests de Sorcellerie",
        "Focus de combat (équipement) : RR 2 aux tests de Sorcellerie (sorts de combat)",
        "Focus de maintien : permet de maintenir 3 sorts sans malus",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Focus de détection (équipement) : RR 1 aux tests de Sorcellerie (sorts de détection)",
        "Focus de santé (équipement) : RR 1 aux tests de Sorcellerie (sorts de santé)",
        "Focus de manipulation (équipement) : RR 1 aux tests de Sorcellerie (sorts de manipulation)",
        "Focus des bêtes (équipement) : RR 2 aux tests de Conjuration (esprits des bêtes)",
      ],
      weapons: [
        { name: "Mains nues", vdBase: 2, vdMeta: { Ork: 3, Troll: 4 }, ranges: "[OK/–/–/–]" },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/–/–/–]",
          note: "perte d'une action en cas de dommages",
        },
        { name: "Pistolet lourd", vdBase: 5, vdMeta: {}, ranges: "[OK/OK/Dés./–]" },
      ],
      equip: ["Commlink", "Armure intégrale + Casque (Armure 4)", "Matériaux pour loge magique"],
      threatLevel: "forte",
      physMonitor: [6, 9, 12],
      physMonitorMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      mentMonitor: [4, 7, 10],
      mentMonitorMeta: { Nain: [5, 8, 11] },
      matrixMonitor: null,
      awakened: "chamanique",
      spells: [
        "Éclair étourdissant (Combat direct)",
        "Foudre (Combat indirect : fait perdre une action)",
        "Lance de glace (Combat indirect : ralentit)",
        "Détection des ennemis (Détection)",
        "Sens du combat (Détection)",
        "Confusion (Illusion : désavantage à tous les tests)",
        "Armure (Manipulation)",
        "Soins (Santé)",
      ],
    },
    "Adepte d'élite": {
      label: "Adepte d'élite de sécurité / Police",
      attrs: { FOR: 4, AGI: 4, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 5 },
        Troll: { FOR: 6 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 4,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 6,
          specAttr: "AGI",
          specRR: 1,
        },
        {
          name: "Course",
          val: 5,
          attr: "FOR",
          rr: 0,
          specMeta: { Ork: { val: 6 }, Troll: { val: 6 } },
        },
        { name: "Armes à distance", val: 4, attr: "AGI", rr: 0 },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Mains nues",
          specVal: 8,
          specAttr: "AGI",
          specRR: 3,
        },
        {
          name: "Furtivité",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 5,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Perception", val: 4, attr: "LOG", rr: 0 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [
        "Éveillé : Adepte",
        "Armure mystique (pouvoir d'adepte) : Armure +1 (physique et magique)",
        "Combat rapproché amélioré (pouvoir d'adepte) : RR 3 aux tests de Combat rapproché (mains nues)",
        "Sens du combat (pouvoir d'adepte) : RR 1 aux tests d'Athlétisme (défense à distance) et Combat rapproché (défense)",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Frappe élémentaire électrique (pouvoir d'adepte) : VD +2 à mains nues, fait perdre une action à la cible en cas de blessure",
        "Réflexes améliorés (pouvoir d'adepte) : +1 action par combat",
        "Furtivité améliorée (pouvoir d'adepte) : RR 2 aux tests de Furtivité (discrétion physique)",
        "Perception améliorée (pouvoir d'adepte) : RR 2 aux tests de Perception (physique)",
        "Course sur les murs (pouvoir d'adepte) : permet de courir une courte distance sur les murs",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 4,
          vdMeta: { Ork: 5, Troll: 6 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Frappe élémentaire",
          vdBase: 6,
          vdMeta: { Ork: 7, Troll: 8 },
          ranges: "[OK/–/–/–]",
          note: "perte d'une action en cas de dommage",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Armure intégrale + Casque (Armure 4)"],
      threatLevel: "forte",
      physMonitor: [8, 11, 14],
      physMonitorMeta: { Ork: [9, 12, 15], Troll: [10, 13, 16] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: "adepte",
    },

    "Rigger d'élite": {
      label: "Rigger d'élite de sécurité / Police",
      attrs: { FOR: 2, AGI: 4, VOL: 3, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Furtivité",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 5,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Perception", val: 4, attr: "LOG", rr: 0 },
        {
          name: "Pilotage",
          val: 5,
          attr: "AGI",
          rr: 1,
          spec: "Spécialisation selon véhicule ou drone",
          specVal: 6,
          specAttr: "AGI",
          specRR: 1,
        },
        {
          name: "Ingénierie",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Armes contrôlées à distance",
          specVal: 6,
          specAttr: "LOG",
          specRR: 1,
        },
      ],
      edges: [
        "Câblage de contrôle de véhicules (cyberware) : IND, RV hot-sim, permet de plonger dans un drone, +1 action par narration en RV",
        "Console de commande pour rigger (équipement) : mode siège du capitaine, 4 drones concurrents. RR 1 aux tests de Pilotage et d'Ingénierie (armes contrôlées à distance)",
        "Lockheed Optic-X2 (petit drone volant) : Autopilote 6, Structure 1, Maniabilité 9, Vitesse 4, Blindage 0. RR 2 aux tests de Furtivité (discrétion physique) et de Perception (physique)",
      ],
      edgeChoices: 2,
      edgeOptions: [
        "2 MCT-Nissan Roto-drone (drones volants moyens) : Autopilote 6, Structure 2, Maniabilité 7, Vitesse 6, Blindage 2, avec fusil d'assaut",
        "2 GM-Nissan Doberman (drones moyens) : Autopilote 6, Structure 2, Maniabilité 7, Vitesse 3, Blindage 2, avec fusil d'assaut",
        "Voiture de patrouille (véhicule) : Autopilote 6, Structure 6, Maniabilité 2, Vitesse 4, Blindage 3",
        "Fourgon (véhicule) : Autopilote 6, Structure 8, Maniabilité 1, Vitesse 3, Blindage 4",
        "Ambulance blindée (véhicule) : Autopilote 6, Structure 7, Maniabilité 2, Vitesse 3, Blindage 5",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        {
          name: "Fusil d'assaut (drones)",
          vdBase: 7,
          vdMeta: {},
          ranges: "[Dés./OK/OK/Dés.]",
        },
      ],
      equip: ["Commlink", "Armure intégrale + Casque (Armure 4)"],
      threatLevel: "faible",
      physMonitor: [6, 9, 12],
      physMonitorMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },

    "Decker d'élite": {
      label: "Decker d'élite de sécurité / Police",
      attrs: { FOR: 2, AGI: 3, VOL: 3, LOG: 4, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Troll: { val: 4 } },
        },
        { name: "Armes à distance", val: 4, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Furtivité",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 5,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Perception", val: 4, attr: "LOG", rr: 0 },
        { name: "Matricielle", val: 5, attr: "LOG", rr: 0 },
        {
          name: "Électronique",
          val: 5,
          attr: "LOG",
          rr: 1,
          spec: "Protection matricielle",
          specVal: 6,
          specAttr: "LOG",
          specRR: 1,
        },
        {
          name: "Piratage",
          val: 5,
          attr: "LOG",
          rr: 1,
          spec: "Cybercombat",
          specVal: 6,
          specAttr: "VOL",
          specRR: 1,
        },
      ],
      edges: [
        "Cyberdeck (Attaque 5, Firewall 5, filtre de biofeedback: Armure +1)",
        "Cyberjack (cyberware) : IND, RV hot-sim, +1 action par narration en RV",
        "Compétences câblées (cyberware) : RR 1 aux tests d'Électronique et de Piratage",
      ],
      edgeChoices: 2,
      edgeOptions: [
        "Programme Agresseur (équipement) : RR 2 aux tests de Piratage (cybercombat)",
        "Programme Exploitation (équipement) : RR 2 aux tests de Piratage (force brute)",
        "Programme Biofeedback (équipement) : inflige des dommages de biofeedback en cybercombat",
        "Programme Marteau (équipement) : VD +2 en cybercombat",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Électromatraque",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/–/–/–]",
          note: "perte d'une action en cas de dommages",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        {
          name: "Cybercombat",
          vdBase: 5,
          vdMeta: {},
          ranges: "[matriciel]",
          note: "si marteau VD 7",
        },
      ],
      equip: ["Commlink", "Armure intégrale + Casque (Armure 4)"],
      threatLevel: "forte",
      physMonitor: [6, 9, 12],
      physMonitorMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: [5, 8, 11],
      awakened: null,
    },

    /* ======== MILITAIRES (p.252-253) ======== */

    Militaire: {
      label: "Militaire",
      attrs: { FOR: 3, AGI: 3, VOL: 3, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 4 },
        Troll: { FOR: 5 },
        Nain: { VOL: 4 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 4,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 5,
          specAttr: "AGI",
          specRR: 1,
        },
        {
          name: "Armes à distance",
          val: 5,
          attr: "AGI",
          rr: 1,
          spec: "Arme principale",
          specVal: 6,
          specAttr: "AGI",
          specRR: 2,
        },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Lames",
          specVal: 5,
          specAttr: "AGI",
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
          specAttr: "LOG",
          specRR: 1,
        },
        { name: "Survie", val: 3, attr: "LOG", rr: 0 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [
        "Yeux cybernétiques avec réseau tactique et identification de cibles (cyberware) : RR 1 aux tests d'Armes à distance, de Perception (physique) et d'Athlétisme (défense à distance), vision nocturne",
        "Smartlink (cyberware) : RR 1 aux tests d'Armes à distance (arme principale)",
        "Câblage de compétence (cyberware) : RR 1 aux tests de Combat rapproché (lames)",
      ],
      edgeChoices: 0,
      edgeOptions: [],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 3,
          vdMeta: { Ork: 4, Troll: 5 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Couteau de combat",
          vdBase: 4,
          vdMeta: { Ork: 5, Troll: 6 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        { name: "Grenades", vdBase: 7, vdMeta: {}, ranges: "[OK/OK/Dés./–]" },
        {
          name: "Arme principale au choix",
          choices: [
            {
              name: "Shotgun",
              vdBase: 8,
              vdMeta: {},
              ranges: "[Dés./OK/Dés./–]",
            },
            {
              name: "Fusil d'assaut",
              vdBase: 7,
              vdMeta: {},
              ranges: "[Dés./OK/OK/Dés.]",
            },
            {
              name: "Mitrailleuse",
              vdBase: 9,
              vdMeta: {},
              ranges: "[–/OK/OK/OK]",
            },
          ],
        },
      ],
      equip: ["Commlink", "Armure militaire (Armure 5)"],
      threatLevel: "forte",
      physMonitor: [8, 11, 14],
      physMonitorMeta: { Ork: [9, 12, 15], Troll: [10, 13, 16] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },

    "Commando militaire": {
      label: "Commando militaire",
      attrs: { FOR: 4, AGI: 4, VOL: 3, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 5 },
        Troll: { FOR: 6 },
        Nain: { VOL: 4 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 4,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 6,
          specAttr: "AGI",
          specRR: 1,
          specMeta: { Ork: { val: 5 }, Troll: { val: 5 } },
        },
        {
          name: "Armes à distance",
          val: 6,
          attr: "AGI",
          rr: 1,
          spec: "Fusils",
          specVal: 9,
          specAttr: "AGI",
          specRR: 3,
        },
        {
          name: "Combat rapproché",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Lames",
          specVal: 7,
          specAttr: "AGI",
          specRR: 2,
        },
        {
          name: "Furtivité",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 5,
          specAttr: "AGI",
          specRR: 0,
        },
        {
          name: "Perception",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Physique",
          specVal: 5,
          specAttr: "LOG",
          specRR: 1,
        },
        { name: "Survie", val: 5, attr: "LOG", rr: 1 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [
        "Yeux cybernétiques avec réseau tactique et identification de cibles (cyberware) : RR 1 aux tests d'Armes à distance, de Perception (physique) et d'Athlétisme (défense à distance), vision nocturne",
        "Smartlink (cyberware) : RR 2 aux tests d'Armes à distance (fusils)",
        "Câblage de compétence (cyberware) : RR 2 aux tests de Combat rapproché (lames)",
        "Réflexes câblés (cyberware) : +1 action par narration",
        "Armure dermique : Armure +1",
        "Kit de survie en milieu hostile (équipement) : RR 1 aux tests de Survie",
      ],
      edgeChoices: 0,
      edgeOptions: [],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 4,
          vdMeta: { Ork: 5, Troll: 6 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Couteau de combat",
          vdBase: 5,
          vdMeta: { Ork: 6, Troll: 7 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
        {
          name: "Fusil d'assaut",
          vdBase: 7,
          vdMeta: {},
          ranges: "[Dés./OK/OK/Dés.]",
        },
        { name: "Grenades", vdBase: 7, vdMeta: {}, ranges: "[OK/OK/Dés./–]" },
      ],
      equip: ["Commlink", "Armure corporelle intégrale (Armure 4)"],
      threatLevel: "extrême",
      physMonitor: [9, 12, 15],
      physMonitorMeta: { Ork: [10, 13, 16], Troll: [11, 14, 17] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },

    /* ======== DIVERS (p.254-255) ======== */

    Johnson: {
      label: "Johnson",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 3, CHA: 3 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: { CHA: 4 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 3,
          specAttr: "AGI",
          specRR: 0,
        },
        {
          name: "Armes à distance",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Pistolets",
          specVal: 4,
          specAttr: "AGI",
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
          specAttr: "AGI",
          specRR: 0,
        },
        {
          name: "Perception",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Physique",
          specVal: 4,
          specAttr: "LOG",
          specRR: 1,
        },
        {
          name: "Influence",
          val: 5,
          attr: "CHA",
          rr: 1,
          spec: "Bluff",
          specVal: 5,
          specAttr: "CHA",
          specRR: 0,
          specMeta: { Elfe: { val: 6, specVal: 6 } },
        },
        {
          name: "Négociation",
          val: 5,
          attr: "CHA",
          rr: 1,
          specMeta: { Elfe: { val: 6 } },
        },
        { name: "Réseau", val: 5, attr: "CHA", rr: 1 },
      ],
      edges: [
        "Yeux cybernétiques (cyberware) : RR 1 aux tests d'Armes à distance (pistolets) et de Perception (physique), vision nocturne",
        "Très bien connecté (trait) : RR 1 aux tests de Réseau",
        "Phéromones optimisées (bioware) : RR 1 aux tests d'Influence",
        "Récepteur de phéromones (bioware) : RR 1 aux tests de Perception (sociale)",
      ],
      edgeChoices: 0,
      edgeOptions: [],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Vêtements blindés (Armure 2)"],
      threatLevel: "faible",
      physMonitor: [4, 7, 10],
      physMonitorMeta: { Ork: [5, 8, 11], Troll: [6, 9, 12] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },

    "Employé corporatiste": {
      label: "Employé corporatiste",
      attrs: { FOR: 2, AGI: 2, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 2,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Perception", val: 2, attr: "LOG", rr: 0 },
        { name: "Influence", val: 2, attr: "CHA", rr: 0 },
      ],
      edges: ["Datajack (cyberware) : IND, RV cold-sim"],
      edgeChoices: 1,
      edgeOptions: [
        "Électronique 3 (4+L, RR 0) ◊ Recherche matricielle 4 (6+L, RR 0)",
        "Influence 3 (4+C, RR 0) ◊ Négociation 4 (6+C, RR 0)",
        "Ingénierie 3 (4+L, RR 0) ◊ Construction & Réparation au choix 4 (6+L, RR 0)",
        "Pilotage 3 (4+A, RR 0) ◊ Type de véhicule au choix 4 (6+A, RR 0)",
        "Survie 3 (4+L, RR 0) ◊ Premiers soins 4 (6+L, RR 0)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Taser",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/–/–]",
          note: "perte d'une action en cas de dommages",
        },
      ],
      equip: ["Commlink", "Vêtements pare-balles (Armure 1)"],
      threatLevel: "nulle",
      physMonitor: [3, 6, 9],
      physMonitorMeta: { Ork: [4, 7, 10], Troll: [5, 8, 11] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    Enquêteur: {
      label: "Enquêteur",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 3, CHA: 3 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 4 },
        Elfe: { CHA: 4 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 3,
          specAttr: "AGI",
          specRR: 0,
          specMeta: { Troll: { val: 4 } },
        },
        {
          name: "Armes à distance",
          val: 3,
          attr: "AGI",
          rr: 0,
          spec: "Pistolets",
          specVal: 4,
          specAttr: "AGI",
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
          specAttr: "AGI",
          specRR: 0,
        },
        {
          name: "Perception",
          val: 5,
          attr: "LOG",
          rr: 0,
          spec: "Physique",
          specVal: 7,
          specAttr: "LOG",
          specRR: 1,
        },
        {
          name: "Électronique",
          val: 3,
          attr: "LOG",
          rr: 0,
          spec: "Recherche matricielle",
          specVal: 4,
          specAttr: "LOG",
          specRR: 0,
        },
        { name: "Influence", val: 4, attr: "CHA", rr: 0 },
        { name: "Intimidation", val: 5, attr: "CHA", rr: 0 },
        {
          name: "Réseau",
          val: 4,
          attr: "CHA",
          rr: 0,
          spec: "Gouvernemental",
          specVal: 4,
          specAttr: "CHA",
          specRR: 0,
          specMeta: { Elfe: { specVal: 5 } },
        },
      ],
      edges: [
        "Yeux cybernétiques (cyberware) : RR 1 aux tests de Perception (physique), vision nocturne",
        "Base de données de la Lone Star (équipement) : RR 1 aux tests d'Électronique (recherche matricielle)",
        "Smartlink (cyberware) : RR 1 aux tests d'Armes à distance (pistolets)",
      ],
      edgeChoices: 0,
      edgeOptions: [],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Pistolet lourd",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/Dés./–]",
        },
      ],
      equip: ["Commlink", "Manteau renforcé (Armure 2)"],
      threatLevel: "faible",
      physMonitor: [4, 7, 10],
      physMonitorMeta: { Ork: [5, 8, 11], Troll: [6, 9, 12] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },

    "Cadre corporatiste": {
      label: "Cadre corporatiste",
      attrs: { FOR: 2, AGI: 2, VOL: 2, LOG: 3, CHA: 3 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 4 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 2,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 2,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        { name: "Sociale", val: 4, attr: "CHA", rr: 0 },
        {
          name: "Influence",
          val: 3,
          attr: "CHA",
          rr: 0,
          specMeta: { Elfe: { val: 4 } },
        },
      ],
      edges: [
        "Datajack (cyberware) : IND, RV cold-sim",
        "Coprocesseur cortical (cyberware) : RR 1 aux tests de la spécialisation en lien avec son métier (cadres supérieurs uniquement)",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Application navigateur (équipement) : RR 1 aux tests d'Électronique (recherche matricielle)",
        "Base de données commerciale (équipement) : RR 1 aux tests d'Influence (négociation)",
        "Base de données techniques en RA (équipement) : RR 1 aux tests d'Ingénierie (C&R au choix)",
        "Passe ses journées sur les réseaux (trait) : RR 1 aux tests de Réseau (corporatiste)",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Taser",
          vdBase: 5,
          vdMeta: {},
          ranges: "[OK/OK/–/–]",
          note: "perte d'une action en cas de dommages",
        },
      ],
      equip: [
        "Commlink",
        "Vêtements pare-balles (Armure 1) ou manteau (Armure 2)",
      ],
      threatLevel: "nulle",
      physMonitor: [3, 6, 9],
      physMonitorMeta: { Ork: [4, 7, 10], Troll: [5, 8, 11] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    Coyote: {
      label: "Coyote / Contrebandier",
      attrs: { FOR: 2, AGI: 3, VOL: 2, LOG: 3, CHA: 2 },
      attrsMeta: {
        Ork: { FOR: 3 },
        Troll: { FOR: 4 },
        Nain: { VOL: 3 },
        Elfe: { CHA: 3 },
      },
      skills: [
        {
          name: "Athlétisme",
          val: 3,
          attr: "FOR",
          rr: 0,
          spec: "Défense à distance",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        {
          name: "Furtivité",
          val: 4,
          attr: "AGI",
          rr: 0,
          spec: "Discrétion physique",
          specVal: 4,
          specAttr: "AGI",
          specRR: 0,
        },
        { name: "Perception", val: 4, attr: "LOG", rr: 0 },
        {
          name: "Pilotage",
          val: 5,
          attr: "AGI",
          rr: 1,
          spec: "Véhicule sélectionné",
          specVal: 7,
          specAttr: "AGI",
          specRR: 2,
        },
        {
          name: "Ingénierie",
          val: 4,
          attr: "LOG",
          rr: 0,
          spec: "Armes contrôlées à distance",
          specVal: 5,
          specAttr: "LOG",
          specRR: 1,
        },
      ],
      edges: [
        "Câblage de contrôle de véhicules (cyberware) : IND, RV cold-sim ou hot-sim ; permet de plonger dans un véhicule ; +1 action par combat en plongée ; RR 1 aux tests de Pilotage et d'Ingénierie (armes contrôlées à distance)",
        "Lockheed Optic-X2 (petit drone volant) : Autopilote 6, Structure 1, Maniabilité 9, Vitesse 4, Blindage 0. RR 1 aux tests de Furtivité (discrétion physique) et de Perception (physique)",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Voiture de sport tunée (véhicule) : Autopilote 6, Structure 5, Maniabilité 2, Vitesse 6, Blindage 3 ; RR 1 aux tests de Pilotage (voitures)",
        "Fourgon (véhicule) : Autopilote 6, Structure 8, Maniabilité 1, Vitesse 3, Blindage 4 ; RR 1 aux tests de Pilotage (voitures), avec mitrailleuse en tourelle",
        "T-bird Ares Venture (véhicule) : Autopilote 6, Vitesse 10, Blindage 4 ; RR 1 aux tests de Pilotage (véhicules volants), avec mitrailleuse en tourelle",
      ],
      weapons: [
        {
          name: "Mains nues",
          vdBase: 2,
          vdMeta: { Ork: 3, Troll: 4 },
          ranges: "[OK/–/–/–]",
        },
        {
          name: "Mitraillette",
          vdBase: 5,
          vdMeta: {},
          ranges: "[Dés./OK/OK/–]",
        },
        {
          name: "Mitrailleuse (véhicule)",
          vdBase: 9,
          vdMeta: {},
          ranges: "[–/OK/OK/OK]",
        },
      ],
      equip: ["Commlink", "Gilet pare-balles (Armure 3)"],
      threatLevel: "faible",
      physMonitor: [5, 8, 11],
      physMonitorMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    /* ======== CRIME ORGANISÉ (adapté des blocs « syndicat du crime » V2,
       cf. « Ganger d'élite / Membre d'un syndicat du crime » p.244-246) ======== */

    "Soldat de syndicat": {
      label: "Soldat de syndicat (Mafia / Yakuza / Triade)",
      attrs: { FOR: 3, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 4 }, Troll: { FOR: 5 }, Nain: { VOL: 3 }, Elfe: { CHA: 3 } },
      skills: [
        { name: "Athlétisme", val: 3, attr: "FOR", rr: 0, spec: "Défense à distance", specVal: 4, specAttr: "AGI", specRR: 0 },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0, spec: "Pistolets", specVal: 4, specAttr: "AGI", specRR: 0 },
        { name: "Combat rapproché", val: 4, attr: "AGI", rr: 0, spec: "Lames", specVal: 4, specAttr: "AGI", specRR: 0 },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0, spec: "Intimidation", specVal: 4, specAttr: "CHA", specRR: 0 },
      ],
      edges: [],
      edgeChoices: 2,
      edgeOptions: [
        "Substituts musculaires (cyberware) : VD +1 en combat rapproché",
        "Jazz (drogue) : +1 action par combat",
        "Bras cybernétique (cyberware) : RR 1 aux tests de Combat rapproché",
        "Zélé (trait) : Avantage pour résister à l'intimidation ou la peur ; combativité forte",
        "Armure dermique (cyberware) : Armure +1",
        "Yeux cybernétiques avec smartlink (cyberware) : RR 1 aux tests d'Armes à distance (pistolets), vision nocturne",
      ],
      weapons: [
        { name: "Mains nues", vdBase: 3, vdMeta: { Ork: 4, Troll: 5 }, ranges: "[OK/–/–/–]" },
        { name: "Arme longue (katana, batte)", vdBase: 5, vdMeta: { Ork: 6, Troll: 7 }, ranges: "[OK/–/–/–]" },
        { name: "Pistolet lourd", vdBase: 5, vdMeta: {}, ranges: "[OK/OK/Dés./–]" },
        { name: "Mitraillette", vdBase: 5, vdMeta: {}, ranges: "[Dés./OK/OK/–]" },
      ],
      equip: ["Commlink", "Costume blindé (Armure 2)"],
      threatLevel: "faible",
      physMonitor: [5, 8, 11],
      physMonitorMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    "Lieutenant de syndicat (capo)": {
      label: "Lieutenant de syndicat (capo / wakagashira)",
      attrs: { FOR: 3, AGI: 3, VOL: 3, LOG: 3, CHA: 3 },
      attrsMeta: { Ork: { FOR: 4 }, Troll: { FOR: 5 }, Nain: { VOL: 4 }, Elfe: { CHA: 4 } },
      skills: [
        { name: "Athlétisme", val: 3, attr: "FOR", rr: 0 },
        { name: "Armes à distance", val: 4, attr: "AGI", rr: 0, spec: "Pistolets", specVal: 5, specAttr: "AGI", specRR: 0 },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 4, attr: "LOG", rr: 0, spec: "Physique", specVal: 4, specAttr: "LOG", specRR: 0 },
        { name: "Influence", val: 5, attr: "CHA", rr: 0, spec: "Négociation", specVal: 5, specAttr: "CHA", specRR: 1 },
        { name: "Intimidation", val: 4, attr: "CHA", rr: 0 },
        { name: "Réseau", val: 4, attr: "CHA", rr: 0 },
      ],
      edges: [],
      edgeChoices: 2,
      edgeOptions: [
        "Réflexes câblés (cyberware) : +1 action par combat",
        "Garde du corps (allié) : soutien en combat rapproché",
        "Smartlink (cyberware) : RR 1 aux tests d'Armes à distance (pistolets)",
        "Réseau d'informateurs (contacts) : RR 1 aux tests de Réseau",
      ],
      weapons: [
        { name: "Mains nues", vdBase: 3, vdMeta: { Ork: 4, Troll: 5 }, ranges: "[OK/–/–/–]" },
        { name: "Lame dissimulée", vdBase: 4, vdMeta: { Ork: 5, Troll: 6 }, ranges: "[OK/–/–/–]" },
        { name: "Pistolet lourd (dissimulé)", vdBase: 5, vdMeta: {}, ranges: "[OK/OK/Dés./–]" },
      ],
      equip: ["Commlink haut de gamme", "Costume blindé de luxe (Armure 3)"],
      threatLevel: "moyen",
      physMonitor: [6, 9, 12],
      physMonitorMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },

    /* ======== POLICE & ORDRE (adapté des blocs « … de sécurité / police » V2) ======== */

    "Flic des rues": {
      label: "Flic des rues (Lone Star / Knight Errant)",
      attrs: { FOR: 3, AGI: 2, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 4 }, Troll: { FOR: 5 }, Nain: { VOL: 3 }, Elfe: { CHA: 3 } },
      skills: [
        { name: "Athlétisme", val: 3, attr: "FOR", rr: 0, spec: "Défense à distance", specVal: 3, specAttr: "AGI", specRR: 0 },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0, spec: "Pistolets", specVal: 3, specAttr: "AGI", specRR: 0 },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 2, attr: "AGI", rr: 0 },
        { name: "Perception", val: 3, attr: "LOG", rr: 0, spec: "Physique", specVal: 4, specAttr: "LOG", specRR: 0 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
        { name: "Intimidation", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [],
      edgeChoices: 1,
      edgeOptions: [
        "Smartlink (cyberware) : RR 1 aux tests d'Armes à distance (pistolets)",
        "Yeux cybernétiques (cyberware) : RR 1 aux tests de Perception (physique)",
      ],
      weapons: [
        { name: "Mains nues", vdBase: 3, vdMeta: { Ork: 4, Troll: 5 }, ranges: "[OK/–/–/–]" },
        { name: "Électromatraque", vdBase: 5, vdMeta: {}, ranges: "[OK/–/–/–]", note: "perte d'une action en cas de dommages" },
        { name: "Pistolet léger", vdBase: 4, vdMeta: {}, ranges: "[OK/OK/Dés./–]" },
      ],
      equip: ["Commlink", "Uniforme blindé (Armure 3)"],
      threatLevel: "faible",
      physMonitor: [6, 9, 12],
      physMonitorMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    "Officier de police": {
      label: "Officier de police (SWAT / brigade d'intervention)",
      attrs: { FOR: 3, AGI: 3, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 4 }, Troll: { FOR: 5 }, Nain: { VOL: 3 }, Elfe: { CHA: 3 } },
      skills: [
        { name: "Athlétisme", val: 4, attr: "FOR", rr: 0, spec: "Défense à distance", specVal: 4, specAttr: "AGI", specRR: 0 },
        { name: "Armes à distance", val: 5, attr: "AGI", rr: 1, spec: "Mitraillettes / Shotguns", specVal: 5, specAttr: "AGI", specRR: 1 },
        { name: "Combat rapproché", val: 4, attr: "AGI", rr: 0, spec: "Armes contondantes", specVal: 4, specAttr: "AGI", specRR: 0 },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 3, attr: "LOG", rr: 0, spec: "Physique", specVal: 4, specAttr: "LOG", specRR: 1 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [
        "Yeux cybernétiques avec identification de cibles (cyberware) : RR 1 aux tests d'Armes à distance et de Perception (physique), vision nocturne",
      ],
      edgeChoices: 1,
      edgeOptions: [
        "Réflexes câblés (cyberware) : +1 action par combat",
        "Armure dermique (cyberware) : Armure +1",
        "Smartlink (cyberware) : RR 1 aux tests d'Armes à distance (mitraillettes ou shotguns)",
      ],
      weapons: [
        { name: "Mains nues", vdBase: 3, vdMeta: { Ork: 4, Troll: 5 }, ranges: "[OK/–/–/–]" },
        { name: "Électromatraque", vdBase: 5, vdMeta: {}, ranges: "[OK/–/–/–]", note: "perte d'une action en cas de dommages" },
        { name: "Mitraillette", vdBase: 5, vdMeta: {}, ranges: "[Dés./OK/OK/–]" },
        { name: "Shotgun", vdBase: 8, vdMeta: {}, ranges: "[Dés./OK/Dés./–]" },
      ],
      equip: ["Commlink", "Armure d'intervention (Armure 4)"],
      threatLevel: "faible",
      physMonitor: [6, 9, 12],
      physMonitorMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    "Détective": {
      label: "Détective / Enquêteur de police",
      attrs: { FOR: 2, AGI: 2, VOL: 3, LOG: 3, CHA: 3 },
      attrsMeta: { Ork: { FOR: 3 }, Troll: { FOR: 4 }, Nain: { VOL: 4 }, Elfe: { CHA: 4 } },
      skills: [
        { name: "Perception", val: 5, attr: "LOG", rr: 1, spec: "Enquête", specVal: 5, specAttr: "LOG", specRR: 1 },
        { name: "Influence", val: 4, attr: "CHA", rr: 0, spec: "Interrogatoire", specVal: 4, specAttr: "CHA", specRR: 0 },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0, spec: "Pistolets", specVal: 3, specAttr: "AGI", specRR: 0 },
        { name: "Combat rapproché", val: 2, attr: "AGI", rr: 0 },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        { name: "Réseau", val: 4, attr: "CHA", rr: 0 },
        { name: "Matricielle", val: 3, attr: "LOG", rr: 0 },
      ],
      edges: [],
      edgeChoices: 1,
      edgeOptions: [
        "Yeux cybernétiques (cyberware) : RR 1 aux tests de Perception (physique)",
        "Datajack (cyberware) : RR 1 aux tests Matriciels d'analyse",
      ],
      weapons: [
        { name: "Mains nues", vdBase: 2, vdMeta: { Ork: 3, Troll: 4 }, ranges: "[OK/–/–/–]" },
        { name: "Pistolet léger", vdBase: 4, vdMeta: {}, ranges: "[OK/OK/Dés./–]" },
      ],
      equip: ["Commlink", "Manteau blindé (Armure 2)", "Kit d'analyse forensique"],
      threatLevel: "faible",
      physMonitor: [5, 8, 11],
      physMonitorMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },

    /* ======== BAS DE L'ÉCHELLE / RUE (customs assumés, calqués sur Ganger) ======== */

    Civil: {
      label: "Civil",
      attrs: { FOR: 2, AGI: 2, VOL: 2, LOG: 2, CHA: 3 },
      attrsMeta: { Ork: { FOR: 3 }, Troll: { FOR: 4 }, Nain: { VOL: 3 }, Elfe: { CHA: 4 } },
      skills: [
        { name: "Athlétisme", val: 1, attr: "FOR", rr: 0 },
        { name: "Combat rapproché", val: 1, attr: "AGI", rr: 0 },
        { name: "Perception", val: 2, attr: "LOG", rr: 0 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0, spec: "Étiquette", specVal: 3, specAttr: "CHA", specRR: 0 },
        { name: "Ingénierie", val: 2, attr: "LOG", rr: 0 },
      ],
      edges: [],
      edgeChoices: 0,
      edgeOptions: [],
      weapons: [
        { name: "Mains nues", vdBase: 2, vdMeta: { Ork: 3, Troll: 4 }, ranges: "[OK/–/–/–]" },
      ],
      equip: ["Commlink", "Vêtements civils"],
      threatLevel: "faible",
      physMonitor: [4, 7, 10],
      physMonitorMeta: { Ork: [5, 8, 11], Troll: [6, 9, 12] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },

    "Voyou de rue": {
      label: "Voyou de rue",
      attrs: { FOR: 3, AGI: 2, VOL: 2, LOG: 2, CHA: 2 },
      attrsMeta: { Ork: { FOR: 4 }, Troll: { FOR: 5 }, Nain: { VOL: 3 }, Elfe: { CHA: 3 } },
      skills: [
        { name: "Athlétisme", val: 3, attr: "FOR", rr: 0, spec: "Défense à distance", specVal: 3, specAttr: "AGI", specRR: 0 },
        { name: "Armes à distance", val: 3, attr: "AGI", rr: 0 },
        { name: "Combat rapproché", val: 3, attr: "AGI", rr: 0, spec: "Lames", specVal: 4, specAttr: "AGI", specRR: 0 },
        { name: "Furtivité", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        { name: "Influence", val: 2, attr: "CHA", rr: 0, spec: "Intimidation", specVal: 3, specAttr: "CHA", specRR: 0 },
      ],
      edges: [],
      edgeChoices: 1,
      edgeOptions: [
        "Jazz (drogue) : +1 action par combat",
        "Couteau à cran (équipement) : VD +1 en combat rapproché",
        "Zélé (trait) : Avantage pour résister à l'intimidation ou la peur",
      ],
      weapons: [
        { name: "Mains nues", vdBase: 3, vdMeta: { Ork: 4, Troll: 5 }, ranges: "[OK/–/–/–]" },
        { name: "Couteau", vdBase: 4, vdMeta: { Ork: 5, Troll: 6 }, ranges: "[OK/–/–/–]" },
        { name: "Pistolet léger", vdBase: 4, vdMeta: {}, ranges: "[OK/OK/Dés./–]" },
      ],
      equip: ["Commlink d'occasion", "Veste de cuir (Armure 1)"],
      threatLevel: "faible",
      physMonitor: [5, 8, 11],
      physMonitorMeta: { Ork: [6, 9, 12], Troll: [7, 10, 13] },
      mentMonitor: [2, 5, 8],
      mentMonitorMeta: { Nain: [3, 6, 9] },
      matrixMonitor: null,
      awakened: null,
    },

    "Technicien de rue": {
      label: "Technicien / mécano de rue",
      attrs: { FOR: 2, AGI: 2, VOL: 2, LOG: 3, CHA: 2 },
      attrsMeta: { Ork: { FOR: 3 }, Troll: { FOR: 4 }, Nain: { VOL: 3 }, Elfe: { CHA: 3 } },
      skills: [
        { name: "Ingénierie", val: 4, attr: "LOG", rr: 0, spec: "Mécanique", specVal: 5, specAttr: "LOG", specRR: 1 },
        { name: "Électronique", val: 4, attr: "LOG", rr: 0, spec: "Réparation", specVal: 4, specAttr: "LOG", specRR: 0 },
        { name: "Matricielle", val: 3, attr: "LOG", rr: 0 },
        { name: "Pilotage", val: 3, attr: "AGI", rr: 0 },
        { name: "Perception", val: 3, attr: "LOG", rr: 0 },
        { name: "Armes à distance", val: 2, attr: "AGI", rr: 0 },
      ],
      edges: [],
      edgeChoices: 1,
      edgeOptions: [
        "Atelier portatif (équipement) : RR 1 aux tests d'Ingénierie",
        "Datajack (cyberware) : RR 1 aux tests Matriciels",
        "Drone utilitaire (équipement) : assistance aux réparations",
      ],
      weapons: [
        { name: "Mains nues", vdBase: 2, vdMeta: { Ork: 3, Troll: 4 }, ranges: "[OK/–/–/–]" },
        { name: "Pistolet léger", vdBase: 4, vdMeta: {}, ranges: "[OK/OK/Dés./–]" },
      ],
      equip: ["Commlink", "Combinaison de travail (Armure 1)", "Kit d'outils"],
      threatLevel: "faible",
      physMonitor: [4, 7, 10],
      physMonitorMeta: { Ork: [5, 8, 11], Troll: [6, 9, 12] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },

    /* ======== OMBRES (custom assumé : professionnel calqué sur les blocs d'élite) ======== */

    Ombre: {
      label: "Ombre / Runner professionnel",
      attrs: { FOR: 3, AGI: 3, VOL: 3, LOG: 3, CHA: 2 },
      attrsMeta: { Ork: { FOR: 4 }, Troll: { FOR: 5 }, Nain: { VOL: 4 }, Elfe: { CHA: 3 } },
      skills: [
        { name: "Athlétisme", val: 4, attr: "FOR", rr: 0, spec: "Défense à distance", specVal: 4, specAttr: "AGI", specRR: 0 },
        { name: "Armes à distance", val: 4, attr: "AGI", rr: 0, spec: "Pistolets", specVal: 4, specAttr: "AGI", specRR: 0 },
        { name: "Combat rapproché", val: 4, attr: "AGI", rr: 0, spec: "Lames", specVal: 4, specAttr: "AGI", specRR: 0 },
        { name: "Furtivité", val: 5, attr: "AGI", rr: 1, spec: "Infiltration", specVal: 5, specAttr: "AGI", specRR: 1 },
        { name: "Perception", val: 4, attr: "LOG", rr: 0 },
        { name: "Ingénierie", val: 3, attr: "LOG", rr: 0 },
        { name: "Influence", val: 3, attr: "CHA", rr: 0 },
      ],
      edges: [],
      edgeChoices: 2,
      edgeOptions: [
        "Réflexes câblés (cyberware) : +1 action par combat",
        "Smartlink (cyberware) : RR 1 aux tests d'Armes à distance",
        "Armure dermique (cyberware) : Armure +1",
        "Camouflage thermo-optique (équipement) : RR 1 aux tests de Furtivité",
      ],
      weapons: [
        { name: "Mains nues", vdBase: 3, vdMeta: { Ork: 4, Troll: 5 }, ranges: "[OK/–/–/–]" },
        { name: "Lame monofilament", vdBase: 5, vdMeta: { Ork: 6, Troll: 7 }, ranges: "[OK/–/–/–]" },
        { name: "Pistolet lourd silencieux", vdBase: 5, vdMeta: {}, ranges: "[OK/OK/Dés./–]" },
        { name: "Mitraillette", vdBase: 5, vdMeta: {}, ranges: "[Dés./OK/OK/–]" },
      ],
      equip: ["Commlink sécurisé", "Combinaison furtive (Armure 2)", "Kit d'infiltration"],
      threatLevel: "moyen",
      physMonitor: [6, 9, 12],
      physMonitorMeta: { Ork: [7, 10, 13], Troll: [8, 11, 14] },
      mentMonitor: [3, 6, 9],
      mentMonitorMeta: { Nain: [4, 7, 10] },
      matrixMonitor: null,
      awakened: null,
    },
  },

  /**
   * Détecte les catégories de sorts ("combat"/"sante"/"detection"/
   * "illusion"/"manipulation") vers lesquelles le tirage de sorts doit
   * être biaisé : la spécialisation de la compétence Sorcellerie
   * (ex. spec: "Sorts de combat") et tout atout choisi qui donne RR sur
   * une catégorie de sorts (ex. "Focus de soins (équipement) : RR 1 aux
   * tests de Sorcellerie (sorts de soins)", déjà reconnu par
   * BonusEngine.parseAnarchyRR). Sans ça, un mage avec une spé combat et
   * un focus de soins pouvait se voir tirer des sorts d'illusion sans
   * rapport avec ce qu'il sait faire.
   */
  _preferredSpellCats(skills, edgeTexts) {
    const catFromText = (text) => {
      if (/combat/i.test(text)) return "combat";
      if (/soin/i.test(text)) return "sante";
      if (/d[ée]tection/i.test(text)) return "detection";
      if (/illusion/i.test(text)) return "illusion";
      if (/manipulation/i.test(text)) return "manipulation";
      return null;
    };
    const cats = new Set();
    const sorc = (skills || []).find((s) => s.name === "Sorcellerie");
    if (sorc && sorc.spec) {
      const c = catFromText(sorc.spec);
      if (c) cats.add(c);
    }
    for (const text of edgeTexts || []) {
      const parsed = BonusEngine.parseAnarchyRR(text);
      if (!parsed) continue;
      for (const { name, subspec } of parsed.skills) {
        if (name.toLowerCase() !== "sorcellerie" || !subspec) continue;
        const c = catFromText(subspec);
        if (c) cats.add(c);
      }
    }
    return [...cats];
  },

  /* ---- Génération ---- */
  generate(opts) {
    // Id de l'édition courante — permet à un clone (ex. EditionAnarchy1) de
    // réutiliser ce generate() en produisant des PNJ correctement taggés.
    // `this` n'est pas disponible dans les IIFE plus bas : on le capture ici.
    const edId = this.id;
    const meta = opts.meta === "Aléatoire" ? Utils.randMeta() : opts.meta;
    const gender =
      opts.gender === "Aléatoire" ? Utils.randGender() : opts.gender;

    // Sélection du profil
    const archetypeList = Object.keys(this.statBlocks).filter((k) => k !== "Aléatoire");
    let statBlockKey =
      opts.archetype === "Aléatoire" ? Utils.rand(archetypeList) : opts.archetype;
    if (!this.statBlocks[statBlockKey]) statBlockKey = Utils.rand(archetypeList);

    const statBlock = this.statBlocks[statBlockKey];

    // Cohérence : rôle/milieu résolus depuis le nom du profil (ProfCategories
    // + mots-clés), pour varier légèrement attributs/compétences autour du
    // stat-block du livre sans sortir de son cadre (cf. js/rules/coherence.js).
    const { role, milieu } = Coherence.resolveTuple(edId, statBlockKey);

    // Attributs : petite variance (±1, comme SR5/SR6) puis repondération par
    // rôle, avant les surcharges fixes de métatype (qui priment toujours —
    // ce sont des valeurs imprimées, pas négociables).
    const attrs = {};
    for (const k of Object.keys(statBlock.attrs)) {
      attrs[k] = Math.max(1, statBlock.attrs[k] + Utils.randInt(-1, 1));
    }
    const roleAttrs = Coherence.reweightAttrs(attrs, role, 1);
    for (const k of Object.keys(roleAttrs)) {
      attrs[k] = Utils.clamp(roleAttrs[k], 1, 6);
    }
    const metaOverrides = statBlock.attrsMeta?.[meta] || {};
    for (const k in metaOverrides) attrs[k] = metaOverrides[k];

    // Atouts au choix — on en tire aléatoirement
    const chosenEdges = [];
    if (statBlock.edgeChoices > 0 && statBlock.edgeOptions.length > 0) {
      const shuffled = [...statBlock.edgeOptions].sort(
        () => Math.random() - 0.5,
      );
      chosenEdges.push(...shuffled.slice(0, statBlock.edgeChoices));
    }

    // Seuils de blessures avec variantes métatype
    const physMonitor = statBlock.physMonitorMeta?.[meta] || statBlock.physMonitor;
    const mentMonitor = statBlock.mentMonitorMeta?.[meta] || statBlock.mentMonitor;

    // Rang selon profil
    const tierMap = {
      Ganger: "Figurant",
      "Go-ganger": "Figurant",
      "Agent de sécurité": "Figurant",
      "Employé corporatiste": "Figurant",
      "Ganger chaman": "Figurant",
      "Ganger d'élite": "Figurant d'élite",
      "Officier de sécurité": "Figurant d'élite",
      "Mage de sécurité": "Figurant d'élite",
      "Chaman de sécurité": "Figurant d'élite",
      "Adepte de sécurité": "Figurant d'élite",
      "Decker de sécurité": "Figurant d'élite",
      "Rigger de sécurité": "Figurant d'élite",
      "Médecin de combat": "Figurant d'élite",
      Coyote: "Figurant d'élite",
      Militaire: "Figurant d'élite",
      Johnson: "Lieutenant",
      Enquêteur: "Lieutenant",
      "Cadre corporatiste": "Lieutenant",
      "Officier d'élite": "Lieutenant",
      "Mage d'élite": "Lieutenant",
      "Chaman d'élite": "Lieutenant",
      "Adepte d'élite": "Lieutenant",
      "Decker d'élite": "Lieutenant",
      "Rigger d'élite": "Lieutenant",
      "Commando militaire": "Boss",
      "Soldat de syndicat": "Figurant",
      "Lieutenant de syndicat (capo)": "Lieutenant",
      "Flic des rues": "Figurant",
      "Officier de police": "Figurant d'élite",
      "Détective": "Figurant d'élite",
      "Ombre": "Figurant d'élite",
      "Voyou de rue": "Figurant",
      "Technicien de rue": "Figurant",
      "Civil": "Figurant",
    };
    const tier =
      opts.tier && opts.tier !== "Aléatoire"
        ? opts.tier
        : tierMap[statBlockKey] || "Figurant";

    const pnj = {
      id: Utils.uid(),
      edition: edId,
      name:
        opts.name && opts.name.trim()
          ? opts.name.trim()
          : Utils.genName(opts.originPool !== "Aléatoire" ? opts.originPool : null),
      meta,
      gender,
      tier,
      role,
      milieu,
      statBlockKey,
      archetype: statBlock.label,
      attrs,
      // Compétences du stat-block copiées telles quelles, avec une petite
      // variance (±1) sur celles qui font le cœur du rôle (ex. Sorcellerie
      // pour un mage) — le reste (saveur) reste fidèle au livre.
      skills: statBlock.skills.map((s) => {
        const copy = { ...s };
        if (s.specMeta && s.specMeta[meta])
          copy.val = s.specMeta[meta].val ?? s.val;
        delete copy.specMeta;
        const roleRegex = Coherence.ROLES[role]?.skillRegex;
        if (roleRegex && roleRegex.test(copy.name) && typeof copy.val === "number") {
          copy.val = Math.max(1, copy.val + Utils.randInt(-1, 1));
        }
        return copy;
      }),
      edges: [...statBlock.edges, ...chosenEdges],
      // Trace des atouts tirés parmi edgeOptions : BonusEngine ne motorise
      // « Armure +N » que sur ceux-là (les fixes sont déjà dans les seuils).
      chosenEdges,
      weapons: statBlock.weapons.map((a) => {
        // Arme à choix multiples → on en tire une au hasard
        if (a.choices) {
          const choix = Utils.rand(a.choices);
          return this.resolveWeapon(choix, attrs, meta);
        }
        // Arme simple — VD/portée résolues via le catalogue officiel
        const resolved = this.resolveWeapon(a, attrs, meta);
        return a.note ? { ...resolved, note: a.note } : resolved;
      }),
      equip: statBlock.equip,
      threatLevel: statBlock.threatLevel,
      physMonitor,
      mentMonitor,
      matrixMonitor: statBlock.matrixMonitor,
      awakened: statBlock.awakened,
      mentorSpirit:
        statBlock.awakened
          ? Magic.pickMentor(
              edId,
              opts.originPool !== "Aléatoire" ? opts.originPool : null,
              { chamanique: "shamanic", hermétique: "hermetic", adepte: "adept" }[
                statBlock.awakened
              ] || null,
            )
          : null,
      spells: (function () {
        // Si l'archétype est éveillé, on enrichit ses sorts avec les
        // descriptifs Anarchy cliquables ; sinon on garde l'existant.
        if (statBlock.awakened) {
          const tags = Flavor.tagsFor({ archetype: statBlock.label });
          tags.add("magique");
          const proRatingNum =
            { Figurant: 1, "Figurant d'élite": 2, Lieutenant: 3, Boss: 4 }[
              tier
            ] || 2;
          const preferredCats = EditionAnarchy2._preferredSpellCats(
            statBlock.skills,
            [...statBlock.edges, ...chosenEdges],
          );
          const picked = Content.pickSorts(
            edId,
            proRatingNum,
            tags,
            preferredCats,
          );
          if (picked.length) return picked;
        }
        return statBlock.spells || [];
      })(),
      legerFilled: 0,
      graveFilled: 0,
      incapFilled: 0,
      notes: "",
    };
    // Cohérence arme <-> compétence (renomme une compétence de combat si besoin)
    WeaponRoll.reconcile(pnj, edId);
    BonusEngine.apply(pnj, edId);
    Flavor.apply(pnj);
    return pnj;
  },

  recalc(pnj) {
    return pnj;
  },
};
