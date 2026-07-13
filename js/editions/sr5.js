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

  /* ---- Contrat commun édition (résorption des branches, issue #14) ---- */
  attributes: ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"],
  /** Légende des symboles affichée dans l'Aide (?), lue par
      App._renderHelpLegend — jamais de branche d'édition côté app.js
      (CH-V6-T1.4, FIELD_STUDY REC-6). Sens vérifiés au Livre de Règles
      (chap. Combat) : CC Coup par Coup · SA Semi-Auto · TR Tir en Rafales ·
      TA Tir Automatique ; PRE plafonne les succès ; P physique / E étourdissant. */
  helpLegend: [
    { keys: "⚄ N", html: "Réserve de dés <strong>cliquable</strong> — un clic lance le test à N dés." },
    { keys: "Init", html: "Initiative : score de base + dés d'initiative (ex. 8+2D6)." },
    { keys: "PRE", html: "Précision — plafonne le nombre de succès ; <em>(n)</em> = avec accessoire." },
    { keys: "VD", html: "Valeur de Dégâts — <strong>P</strong> physique, <strong>E</strong> étourdissant." },
    { keys: "PA", html: "Pénétration d'Armure (« — » = nulle)." },
    { keys: "Modes", html: "<strong>CC</strong> Coup par Coup · <strong>SA</strong> Semi-Auto · <strong>TR</strong> Tir en Rafales · <strong>TA</strong> Tir Automatique." },
  ],
  /** Neutre : SR5 utilise le lanceur de dés classique, pas le panneau
      de prise de risque (propre à Anarchy 2.0). */
  usesRiskPanel: false,
  /** Neutre : la réserve de menace (compteur MJ global) est propre à
      Anarchy 2.0 (p.138) — en SR5 la ressource de relance est la Chance
      (CHC), portée par chaque PNJ (attrs.CHC). */
  usesThreatReserve: false,
  /** Action de relance « Seconde chance » (p.58) : relance les dés ratés
      (mode "misses"), interdite sur échec critique, coûte 1 point de Chance
      du PNJ. Lue par DiceRoller via App.editionModule, jamais de branche
      d'édition côté widget. */
  rerollAction: {
    label: "Seconde chance",
    mode: "misses",
    blockedBy: "critGlitch",
    costAttr: "CHC",
  },
  /* ---- Action magique (CH-M7c) : sorts + invocation, tout lu par
     MagicAction via le contrat, jamais de branche d'édition côté widget. ---- */
  /** SR5 : la Puissance du sort est choisie par le lanceur (p.283). */
  spellUsesForce: true,
  /** Compétence de Sorcellerie utilisée pour lancer un sort (pool + Magie). */
  spellSkill: "Lancement de sorts",
  /** Compétence de Conjuration utilisée pour invoquer (pool + Magie). */
  conjureSkill: "Invocation",
  /** VD d'un sort (p.283) : Puissance + code du sort (« P-3 »…), min 2. */
  spellDrainValue(entry, force) {
    return Magic.drainValue(force, Magic.parseDrainMod(entry.drain));
  },
  /** VD d'invocation (p.303) : 2 × succès de l'esprit, min 2. */
  conjureDrainValue(spiritHits) {
    return Magic.drainValue(spiritHits * 2, 0);
  },
  /** Réserve de résistance de l'esprit à l'invocation (p.303) : Puissance. */
  spiritResistPool(force) {
    return force;
  },
  /** Type de dégâts du Drain (p.283 sort / p.303 invocation) : SR5 compare une
      valeur connue AVANT la résistance — succès du sort, ou Puissance de
      l'esprit pour une invocation. Physique si elle dépasse la Magie. */
  drainDamageType(ctx, pnj) {
    const mag = (pnj.attrs && pnj.attrs.MAG) || 0;
    const cmp = ctx.kind === "conjuration" ? (ctx.force || 0) : (ctx.castHits || 0);
    return cmp > mag ? "physical" : "stun";
  },
  /** Applique des dégâts de Drain au moniteur du PNJ (deux moniteurs
      séparés en SR5), plafonnés à leur taille respective. Renvoie
      `{ field, delta }` — le champ touché et la quantité RÉELLEMENT ajoutée
      (après plafonnement), pour permettre d'annuler l'encaissement lors d'une
      Seconde chance sur le Drain (CH-M7e). */
  applyDrainDamage(pnj, amount, type) {
    const field = type === "physical" ? "physFilled" : "stunFilled";
    if (!amount) return { field, delta: 0 };
    const max = type === "physical" ? pnj.physMon : pnj.stunMon;
    const before = pnj[field] || 0;
    pnj[field] = Utils.clamp(before + amount, 0, max ?? 99);
    return { field, delta: pnj[field] - before };
  },
  ratingBadge: { field: "proRating", label: "Professionnalisme", options: null },
  /** Réglage propre à SR5 remonté ici (prohibition n°1 : plus de
      `if (ed==='sr5')` dans settings.js). Reçoit le contrôleur Settings (S)
      pour lire l'état et réutiliser ses helpers de rendu. */
  settingsHTML(S) {
    const woundMod = S.get("woundMod", 3);
    return `<div class="settings-section">
      <h3>Malus de blessure</h3>
      <p>Les PNJ subissent normalement −1D par tranche de cases sur leur moniteur. Choisissez la fréquence.</p>
      <div class="radio-group">
        ${S._radio("woundMod", "3", "−1D pour 3 cases (standard)", woundMod == 3)}
        ${S._radio("woundMod", "2", "−1D pour 2 cases", woundMod == 2)}
        ${S._radio("woundMod", "1", "−1D par case", woundMod == 1)}
        ${S._radio("woundMod", "0", "Pas de malus de blessure", woundMod == 0)}
      </div>
    </div>`;
  },
  /** Initiative chiffrée (base + dés) pour le tracker de combat : lue sur
      pnj.init/pnj.initDice, posés par generate() (Réaction + Intuition). */
  initiativeFor(pnj) {
    return { base: pnj.init, dice: pnj.initDice };
  },
  /** K4 : spec d'un combattant CI lancé dans l'initiative (fiche CI minimale +
      jeton Matrice). Init du livre SR5 : indice de l'hôte ×2 + 4D6 (p.249).
      La règle vit ici (prohibition n°1) ; Encounter lit le spec neutre. */
  icCombatant(ic, srv) {
    return { name: ic.label, initBase: srv.indice * 2, initDice: 4 };
  },
  /** K7 : budget d'actions par phase d'action (= passe d'init, déjà motorisée)
      — vérifié Livre de Règles p.164 : 2 actions simples OU 1 complexe, + 1
      gratuite. Le « ou » est laissé au jugement du MJ (deux rangées). */
  actionBudget() {
    return [
      { key: "simple", label: "Simples", total: 2 },
      { key: "complex", label: "Complexe", total: 1 },
      { key: "free", label: "Gratuite", total: 1 },
    ];
  },
  /** Règles de round pour le tracker de combat (lues via App.editionModule,
      jamais de branche d'édition côté Encounter). SR5 : l'initiative est
      relancée à chaque tour de combat, et chaque tour se joue en passes
      d'initiative — −10 par passe, un combattant rapide rejoue tant que son
      score reste > 0 (SR5 p.159). `passDecrement > 0` active les passes. */
  combatModel: { rerollEachRound: true, passDecrement: 10 },
  /** Disposition de combat (Vague D) : { down, morale } — lu par le tracker via
      l'API neutre, jamais de branche d'édition côté Encounter.
      SR5 « brutes » (p.381) : le moral est de GROUPE, selon le Professionnalisme,
      sur la proportion d'alliés hors de combat. group = { down, total } fourni
      par le tracker (proxy PJ-vs-reste). down réutilise isDestroyed (moniteur
      physique plein). PJ / entités sans proRating : pas de drapeau. */
  combatDisposition(pnj, group) {
    const down = this.conditionMonitor.isDestroyed(pnj);
    if (down) return { down: true, morale: null };
    const pr = pnj.proRating;
    if (pr == null || !group || !group.total) return { down: false, morale: null };
    const frac = group.down / group.total;
    let flee;
    if (pr <= 0) flee = group.down >= 1; // 0 : un allié tombe → le reste fuit
    else if (pr <= 2) flee = frac > 0.25; // 1-2 : > ¼ de l'équipe hors combat
    else if (pr <= 4) flee = frac > 0.5; // 3-4 : > ½ de l'effectif
    else flee = false; // 5-6 : élite, ne craque pas
    return { down: false, morale: flee ? "flee" : "steady" };
  },
  summonPower: {
    field: "force",
    label: "Puissance",
    steps: () => [2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: n, label: String(n) })),
  },
  skillModel: { shape: "simple", valRange: [1, 12], hasGroups: true },
  hasEdges: false,
  /** Neutre : les drogues SR5 sont des équipements, pas des atouts au
      choix — matchItem() filtre déjà par source, pas de correspondance
      universelle nécessaire (concept propre à Anarchy 2.0 p.150). */
  drugModel: { matchAll: false },
  /** Invocation d'esprits (issue #14) : SR5 invoque via Conjuration,
      types = éléments classiques (Spirits.SR_TYPES). `types` est lazy
      car spirits.js (catalogs) charge après les modules d'édition. */
  spiritModel: { canSummon: true, types: () => Spirits.SR_TYPES },
  /** Réserves de dés et initiative des véhicules/drones liés (js/catalogs/
      vehicles.js) : Autopilote + autosoft, limite de précision inexistante
      ici (pas de PRE sur un drone). */
  vehicleModel: {
    /** Champs de stats affichés en pills (card) et édités (modal). */
    statFields: [
      ["mania", "Maniabilité"], ["vitesse", "Vitesse"], ["accel", "Accél"],
      ["structure", "Structure"], ["blindage", "Blindage"],
      ["pilote", "Autopilote"], ["senseurs", "Senseurs"],
    ],
    /** Champ supplémentaire édité (pas affiché en pill) : autosoft
        d'attaque autonome, distinct de l'autopilote (Riggers p.265-272). */
    formExtraFields: [["autosoft", "Autosoft"]],
    pools(v) {
      const s = v.stats || {};
      const autosoft = s.autosoft || s.pilote || s.autopilote || 0;
      return [
        { label: "Attaque", pool: (s.pilote || 0) + autosoft, title: "Autopilote + autosoft Acquisition [Précision]", weaponOnly: true },
        { label: "Défense", pool: (s.pilote || 0) + autosoft, title: "Autopilote + autosoft Évasion [Maniabilité]" },
        { label: "Capteurs", pool: (s.pilote || 0) + (s.senseurs || 0), title: "Autopilote + autosoft Acuité [Senseurs]" },
        { label: "Encaissement", pool: (s.structure || 0) + (s.blindage || 0), title: "Structure + Blindage" },
      ];
    },
    initiative(v) {
      const p = (v.stats && v.stats.pilote) || 0;
      return { base: p * 2, dice: 4 };
    },
  },
  /** E3 (chantier Équipe) : bloc « mécanique de table » du PJ léger
      (`pcLight`) — ce que le MJ demande dix fois par soirée, saisi une fois.
      Optionnel, jamais dérivé (le PJ léger n'a pas d'attributs) : chaque
      valeur est un nombre entré à la main. `monitorKind:"double"` réutilise
      physMon/stunMon + physFilled/stunFilled, exactement le modèle des PNJ
      complets SR5 (cf. `conditionMonitor` ci-dessous) — mêmes champs, donc
      `CardRenderer._monitorBoxes`/`UI.toggleMonitor` s'appliquent tels quels. */
  pcTableBlock: {
    fields: [
      { key: "initBase", label: "Initiative (base)", kind: "number" },
      { key: "initDice", label: "Dés d'initiative", kind: "number" },
      { key: "mentalLimit", label: "Limite mentale", kind: "number" },
      { key: "perception", label: "Perception", kind: "number" },
      { key: "volonte", label: "Volonté", kind: "number" },
    ],
    monitorKind: "double",
  },
  /** Malus de dés lié aux cases de moniteur remplies : −1D par tranche de
      `woundMod` cases (physique + étourdissement cumulés), réglable en
      Réglages (défaut 3, désactivable à 0). */
  conditionMonitor: {
    model: "double physique+étourdissement, cases = 8 + attribut/2",
    fields: { primary: "physMon" },
    woundMalus(pnj) {
      const div = parseInt(Settings.get("woundMod", 3), 10);
      if (!div) return 0;
      const total = (pnj.physFilled || 0) + (pnj.stunFilled || 0);
      return Math.floor(total / div);
    },
    /** Neutre : les esprits SR5 utilisent le moniteur générique basé sur
        CON (cf. spawn), pas de formule dédiée comme en SR6. */
    spiritMonitor: null,
    /** Forme du moniteur d'un véhicule/drone lié : "total" (monTotal/
        monFilled, ⌈Structure/2⌉+8) en SR5/SR6, cf. vehicles.js:_monitor. */
    vehicleFields: "total",
    /** Détruit : véhicule/drone dont le moniteur total est plein, ou
        esprit dont le moniteur physique (physMon, cf. spirits.js:_spawnSR)
        est plein. */
    isDestroyed(entity) {
      if (entity.type === "vehicle")
        return (entity.monTotal || 0) > 0 && (entity.monFilled || 0) >= entity.monTotal;
      return (entity.physMon || 0) > 0 && (entity.physFilled || 0) >= entity.physMon;
    },
    /** Mise hors de combat immédiate (Vague C) : remplit le moniteur physique
        (ou total pour un véhicule) → isDestroyed devient vrai. Réversible par
        _resetMonitors (bouton ✚). Inverse de isDestroyed. */
    knockOut(entity) {
      if (entity.type === "vehicle") entity.monFilled = entity.monTotal || 0;
      else entity.physFilled = entity.physMon || 0;
    },
    /** K6 : résumé du moniteur pour la mini-jauge du cockpit — cases remplies
        / total, physique + étourdissement cumulés (mêmes champs que
        isDestroyed/knockOut). total 0 = pas de moniteur, pas de jauge. */
    gauge(entity) {
      if (entity.type === "vehicle")
        return { filled: entity.monFilled || 0, total: entity.monTotal || 0 };
      return {
        filled: (entity.physFilled || 0) + (entity.stunFilled || 0),
        total: (entity.physMon || 0) + (entity.stunMon || 0),
      };
    },
    /** K8 : résultat NET de dégâts (déjà résisté par le MJ hors app) appliqué au
        moniteur — le cockpit n'a pas la valeur d'attaque, il ne fait que
        remplir des cases. `opts.type` = "phys" (défaut, arme physique) ou
        "stun" (bascule un tap dans le cockpit) — jamais recalculé ici, juste
        clampé à la taille du moniteur visé (débordement laissé au MJ). */
    applyDamage(entity, n, opts) {
      const amount = Math.max(0, n || 0);
      const type = opts && opts.type === "stun" ? "stun" : "phys";
      const field = type === "stun" ? "stunFilled" : "physFilled";
      const max = type === "stun" ? entity.stunMon : entity.physMon;
      const before = entity[field] || 0;
      entity[field] = Utils.clamp(before + amount, 0, max ?? 99);
      return { field, applied: entity[field] - before };
    },
    /** K8 : descripteur neutre lu par le cockpit pour bâtir les chips de
        dégâts — SR5 a deux pistes (Physique/Étourdissant), défaut Physique. */
    damageUI() {
      return { kind: "numeric", chips: [1, 2, 3, 5], hasType: true, defaultType: "phys" };
    },
  },
  /** Résolution du jet d'arme (WeaponRoll) : synergie smartgun/smartlink
      (+2 implanté / +1 externe), la Précision (PRE) plafonne les succès,
      spécialité = +2 dés sur le pool, armes lues dans pnj.equip. */
  weaponModel: {
    smartlinkBonus: { implanted: 2, external: 1 },
    accuracyLimit: true,
    specMechanic: "diceBonus",
    source: "equip",
  },

  /* Régime Matrice SR5 — lu par Matrix via App.editionModule.matrixModel
     (jamais de branche `_edition === "sr5"` dans js/rules/matrix.js). CI à
     jets de dés, attributs ASDF, Score de Surveillance. */
  matrixModel: {
    hasAttrs: true,
    indiceRange: [1, 12],
    profileKey: "sr5",
    // M4 : régime de brickage des appareils (armes) — SR5 a un vrai moniteur
    // matriciel d'appareil (8+Indice/2, p.229) : cases cliquables + indice.
    deviceBricking: "monitor",
    icMonitorSize(indice) {
      return 8 + Math.ceil(indice / 2);
    },
    maxActiveIC(indice) {
      return indice;
    },
    profileRangeText(p) {
      return ` (${p.min}-${p.max})`;
    },
    monitorBoxLabel(n) {
      return `Case ${n}`;
    },
    monitorBoxSep() {
      return "";
    },
    firewallLabel: "",
    overwatchDelta() {
      return 0;
    },
    pickCount(indice, candLen) {
      return Utils.clamp(2 + Math.ceil(indice / 3) + Utils.randInt(-1, 1), 2, candLen);
    },
    icThresholdsText(srv) {
      const a = srv.attrs || { attack: "?" };
      return `attaque ${srv.indice * 2} dés [Attaque ${a.attack}] · moniteur ${this.icMonitorSize(srv.indice)} cases · max ${srv.indice} CI active${srv.indice > 1 ? "s" : ""}`;
    },
    actionRoll(kind, srv) {
      const i = srv.indice;
      const a = srv.attrs || {};
      if (kind === "per")
        return {
          txt: `Perception ${i * 2}d [T ${a.dataProcessing}]`,
          tip: "Perception matricielle de la Patrouilleuse : indice × 2, limitée par le Traitement de données",
        };
      if (kind === "atk")
        return {
          txt: `Attaque ${i * 2}d [A ${a.attack}]`,
          tip: "Attaque de la CI : indice × 2, limitée par l'Attaque du serveur (p.249)",
        };
      if (kind === "def")
        return {
          txt: `Défense ${i * 2}d`,
          tip: "Défense de la CI quand le decker l'attaque (indice × 2, usage — la VF ne détaille pas cette réserve)",
        };
      if (kind === "soak")
        return {
          txt: `Encaisse ${i + (a.firewall || 0)}d`,
          tip: "Résistance aux dommages matriciels : indice + Firewall du serveur (p.229)",
        };
      return null;
    },
    convergenceText() {
      return "VD 12 dommages matriciels, reboot forcé (perte des marks, éjection, choc en RV). Dans un serveur : 3 marks posées + déploiement de CI ; le demi-DIEU converge à la sortie (p.233, 249).";
    },
    attrLimit(kind, srv) {
      const a = srv.attrs || {};
      if (kind === "atk") return a.attack ?? null;
      if (kind === "per") return a.dataProcessing ?? null;
      return null;
    },
  },

  /* Régime cyberdeck SR5 (M1, PLAN_MATRICE_CYBERDECK.md) — lu par Cyberdeck
     via App.editionModule.cyberdeckModel. 4 attributs ASDF réallouables par
     action gratuite (p.229, réallocation motorisée en M2) ; moniteur du deck
     et Limites d'attribut : M2/M6. */
  cyberdeckModel: {
    attrKeys: ["attack", "sleaze", "dataProcessing", "firewall"],
    reallocatable: true,
    reallocCostLabel: "action gratuite (p.229)",
    hasReroll: false,
    hasBiofeedbackFilter: false,
    label: "Cyberdeck",
    /** M2 : moniteur matriciel du deck = 8 + (Indice d'appareil / 2), p.229.
        L'app ne porte pas de champ « Indice » séparé pour un deck (seulement
        ses 4 attributs) : approximation assumée = l'attribut le plus élevé,
        cohérent avec la fourchette officielle « Indice à Indice+3 » (p.441) où
        l'attribut haut plafonne près de l'Indice réel. */
    monitorSize(deck) {
      const vals = Object.values((deck && deck.attrs) || {});
      const top = vals.length ? Math.max(...vals) : 0;
      return 8 + Math.ceil(top / 2);
    },
  },

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

  /* ---- Armure officielle par proRating ---- */
  armureByProf: { 0: 0, 1: 9, 2: 12, 3: 12, 4: 9, 5: 18, 6: 18 },

  /** Archétype utilisé pour un spider (decker de sécurité lié à un serveur,
      issue #14) — toujours le même en SR5. */
  spiderArchetype() {
    return "Spécialiste contre-mesures";
  },
  /** Valeur du champ "special" du générateur PNJ pour un spider. */
  spiderSpecial: "Decker",

  /** Bonus d'indice quand le serveur gère aussi la sécurité physique.
      Neutre : SR5 n'a pas cette règle (concept propre à Anarchy 2.0). */
  secPhysBonus: null,

  /* ---- Initiative ----
     Règle SR5 p.159 : Initiative = RÉA + INT + 1D6. Les dés supplémentaires
     viennent UNIQUEMENT des augmentations/pouvoirs (appliqués par BonusEngine),
     jamais de la cote de prof. La base reste donc 1D6 pour tout métahumain ;
     le champ `dice` vaut 1 partout (conservé pour compat. de forme). */
  initByProf: {
    0: { dice: 1 },
    1: { dice: 1 },
    2: { dice: 1 },
    3: { dice: 1 },
    4: { dice: 1 },
    5: { dice: 1 },
    6: { dice: 1 },
  },

  /* Plafond de dés d'initiative (SR5 p.159 : max 5D6). Lu par BonusEngine. */
  maxInitDice: 5,

  /* Sources de dés d'initiative issues des livres (cyber/bioware), toutes
     reconnues par BonusEngine.CYBER_BONUS. Pool DÉDIÉ (distinct du cyber
     générique) pour varier l'origine des dés des combattants mundains sans en
     refiler au hasard à des PNJ non augmentés. */
  initAugPool: [
    { label: "Réflexes câblés 1 [+1D6 initiative, +1 passe]", dice: 1 },
    { label: "Réflexes câblés 2 [+2D6 initiative, +2 passes]", dice: 2 },
    { label: "Réflexes câblés 3 [+3D6 initiative, +3 passes]", dice: 3 },
    { label: "Booster synaptique 1 [bioware, +1D6 initiative]", dice: 1 },
    { label: "Booster synaptique 2 [bioware, +2D6 initiative]", dice: 2 },
    { label: "Move-by-Wire 2 [+2D6 initiative, +2 passes]", dice: 2 },
  ],

  /** Tire une source d'init aléatoire, dés bornés par la cote (le plafond 5D6
      final reste géré par BonusEngine). Renvoie un libellé, jamais null. */
  initAugFor(proRating) {
    const maxBonus = proRating >= 6 ? 3 : 2;
    const eligible = this.initAugPool.filter((s) => s.dice <= maxBonus);
    return Utils.rand(eligible).label;
  },

  /* ---- Options du formulaire ---- */
  formOptions: {
    meta: ["Aléatoire", "Humain", "Elfe", "Nain", "Ork", "Troll"],
    gender: ["Aléatoire", "M", "F", "NB"],
    proRating: ["Aléatoire", "0", "1", "2", "3", "4", "5", "6"],
    archetype: [
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
      "Ganger Ork Rights Commission",
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
      "Gros bras Yakuza",
      "Wakagashira Yakuza",
      "Coursier Triade",
      "Gros bras Triade",
      "Vory v Zakone",
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
      // Corpo & contacts
      "Cadre corpo",
      "Agent corpo",
      "Négociateur corpo",
      "Mage salarié",
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
    "Gros bras Yakuza": [
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
    "Coursier Triade": [
      "Armes tranchantes",
      "Combat à mains nues",
      "Discrétion",
      "Pilotage",
      "Perception",
      "Pistolets",
    ],
    "Gros bras Triade": [
      "Armes tranchantes",
      "Combat à mains nues",
      "Intimidation",
      "Pistolets",
      "Arts martiaux",
      "Perception",
    ],
    "Vory v Zakone": [
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
    // --- Corpo & contacts ---
    "Cadre corpo": [
      "Négociation",
      "Étiquette",
      "Leadership",
      "Imposture",
      "Perception",
      "Informatique",
      "Pistolets",
    ],
    "Agent corpo": [
      "Pistolets",
      "Armes automatiques",
      "Combat à mains nues",
      "Étiquette",
      "Perception",
      "Informatique",
      "Premiers soins",
    ],
    "Négociateur corpo": [
      "Négociation",
      "Étiquette",
      "Leadership",
      "Imposture",
      "Escroquerie",
      "Perception",
      "Pistolets",
    ],
    "Mage salarié": [
      "Lancement de sorts",
      "Invocation",
      "Contresort",
      "Perception",
      "Étiquette",
      "Négociation",
      "Informatique",
    ],
  },

  /* ---- Nombre de compétences tirées par proRating ---- */
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

  spellsByTradition: {
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
    Lieutenant: (proRating) =>
      proRating >= 3
        ? [
            EditionSR5.initAugFor(proRating),
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
    // Mundain aguerri (prof ≥ 4) : une source d'init variée, plus parfois un
    // autre cyber de saveur. Sous prof 4 : rien (initiative base 1D6).
    Aucun: (proRating) =>
      proRating >= 4
        ? [
            EditionSR5.initAugFor(proRating),
            ...(Utils.randBool(0.5)
              ? [
                  Utils.rand([
                    "Yeux cybernétiques (smartlink, vision nocturne)",
                    "Accroissement de réaction 1",
                    "Tonification musculaire 1",
                    "Armure dermique 1",
                  ]),
                ]
              : []),
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
      "Fichetti Security 600 [PRE 6(7), VD 7P, PA —, SA, 30(c)]",
      "Colt America L36 [PRE 7, VD 7P, PA —, SA, 11(c)]",
      "Ares Light Fire 75 [PRE 6(8), VD 6P, PA —, SA, 16(c), smartgun]",
    ],
    pistoletsLourds: [
      "Ares Predator V [PRE 5(7), VD 8P, PA -1, SA, 15(c), smartgun]",
      "Browning Ultra-Power [PRE 5(6), VD 8P, PA -1, SA, 10(c)]",
      "Colt Government 2066 [PRE 6, VD 7P, PA -1, SA, 14(c)]",
      "Ruger Super Warhawk [PRE 5, VD 9P, PA -2, CC, 6(b)]",
      "Remington Roomsweeper [PRE 4, VD 7P, PA -1, SA, 8(m)]",
    ],
    mitraillettes: [
      "HK-227 [PRE 5(7), VD 7P, PA —, SA/TR/TA, 28(c), smartgun, silencieux]",
      "Ceska Black Scorpion [PRE 5, VD 6P, PA —, SA/TR, 35(c)]",
      "Colt Cobra TZ-120 [PRE 4(5), VD 7P, PA —, SA/TR/TA, 32(c)]",
      "HK Urban Combat [PRE 7(9), VD 8P, PA —, SA/TR/TA, 36(c)]",
      "Ingram Smartgun X [PRE 4(6), VD 8P, PA —, TR/TA, 32(c)]",
    ],
    fusilsAssaut: [
      "Ares Alpha [PRE 5(7), VD 11P, PA -2, SA/TR/TA, 42(c), lance-grenades]",
      "AK-97 [PRE 5, VD 10P, PA -2, SA/TR/TA, 38(c)]",
      "Colt M23 [PRE 4, VD 9P, PA -2, SA/TR/TA, 40(c)]",
      "FN HAR [PRE 5(6), VD 10P, PA -2, SA/TR/TA, 35(c)]",
      "HK XM30 [PRE 6(8), VD 9P, PA -2, SA/TR/TA, 30(c)]",
    ],
    snipers: [
      "Ares Desert Strike [PRE 7, VD 13P, PA -4, SA, 14(c)]",
      "Ranger Arms SM-5 [PRE 8, VD 14P, PA -5, SA, 15(c), silencieux]",
      "Remington 950 [PRE 7, VD 12P, PA -4, CC, 5(m)]",
      "Onotari JP-K50 [PRE 7, VD 12P, PA -3, SA/TR, 25(c)]",
    ],
    meleeWeapons: [
      "Couteau [PRE 5, Allonge —, VD (FOR+1)P, PA -1]",
      "Couteau de combat [PRE 6, Allonge —, VD (FOR+2)P, PA -3]",
      "Épée [PRE 6, Allonge 1, VD (FOR+3)P, PA -2]",
      "Katana [PRE 7, Allonge 1, VD (FOR+3)P, PA -3]",
      "Hache de combat [PRE 4, Allonge 2, VD (FOR+5)P, PA -4]",
      "Matraque télescopique [PRE 5, Allonge 1, VD (FOR+2)P, PA —]",
      "Massue [PRE 4, Allonge 1, VD (FOR+3)P, PA —]",
      "Lame rétractable [cyberware, VD (FOR+3)P, PA -2]",
      "Griffes [cyberware, VD (FOR+2)P, PA -2]",
    ],
    electroarmes: [
      "Électromatraque [VD 9E(e), PA -5, Allonge 1, 10 charges]",
      "Defiance EX Shocker [Taser, VD 9E(e), PA -5, CC, 4(m)]",
      "Électro-gants [VD 8E(e), PA -5]",
      "Bâton étourdissant Nemesis Arms Maul [PRE 6, Allonge 2, VD 9E(e), PA -5]",
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
  /* ----
     COHÉRENCE ÉVEILLÉ / ESSENCE
     En SR, le cyberware coûte de l'Essence, qui plafonne la Magie.
     Un Éveillé (mage, chaman, adepte, prof magique) n'a donc pas
     d'augmentations cybernétiques. Ce détecteur centralise la règle.
  ---- */
  _isAwakened(archetype, special) {
    const magSpecials = [
      "Adepte",
      "Mage hermétique",
      "Chaman",
      "Mage Aztechnology",
    ];
    if (magSpecials.includes(special)) return true;
    const magProf = ["Mage", "Chaman", "Adepte", "Initié", "Conjuration"];
    return magProf.some((k) => (archetype || "").includes(k));
  },

  buildLoadout(archetype, proRating, special) {
    const p = proRating;
    const pools = this.equipPools;
    const awakened = this._isAwakened(archetype, special);

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
    ].some((p) => archetype.includes(p.split(" ")[0]));

    let primaryWeapon;
    if (p >= 5 || isHeavy) {
      primaryWeapon = Utils.rand(pools.fusilsAssaut);
    } else if (p >= 3) {
      primaryWeapon = Utils.rand([
        ...pools.mitraillettes,
        ...pools.fusilsAssaut,
      ]);
    } else if (p >= 1) {
      primaryWeapon = Utils.rand([
        ...pools.pistoletsLourds,
        ...pools.mitraillettes,
      ]);
    } else {
      primaryWeapon = Utils.rand([
        ...pools.pistoletsLegers,
        ...pools.pistoletsLourds,
      ]);
    }

    // Arme secondaire / de mêlée
    const secondaryWeapon = Utils.rand([
      ...pools.meleeWeapons,
      ...pools.pistoletsLegers,
      ...pools.pistoletsLourds,
    ]);

    const result = [commlink, primaryWeapon];
    result.push("Mains nues [Allonge —, VD (FOR)E, PA —]");

    // Arme supplémentaire cohérente (aléa d'arsenal) — tirée du même pool
    // que l'arme principale pour ne jamais contredire ses stats.
    if (Utils.randBool(0.6) && secondaryWeapon !== primaryWeapon) {
      result.push(secondaryWeapon);
    }

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
    ].some((k) => archetype.includes(k));
    if (melee || Utils.randBool(0.4)) {
      result.push(Utils.rand(pools.meleeWeapons));
    }

    // Électromatraque : flics et sécu
    const police = [
      "Flic",
      "Knight Errant",
      "Lone Star",
      "Agent de sécurité",
    ].some((k) => archetype.includes(k));
    if (police) result.push(Utils.rand(pools.electroarmes));

    // Armure
    result.push(armure);

    // Grenades : prof 4+
    if (p >= 4 && Utils.randBool(0.5)) result.push(Utils.rand(pools.grenades));

    // Cyberware : prof 3+ — JAMAIS pour un Éveillé (coût en Essence). Le
    // second tirage (prof 5+) exclut le premier : deux tirages indépendants
    // dans le même pool pouvaient piocher deux fois le même implant (ex.
    // 2x "Accroissement de réaction (+1 REA)", cumulé à tort par BonusEngine).
    if (!awakened && p >= 3) {
      const firstCyber = Utils.rand(pools.cyberware);
      result.push(firstCyber);
      if (p >= 5) result.push(Utils.rand(pools.cyberware.filter((c) => c !== firstCyber)));
    }

    // Équip spécial : flics et sécu
    if (police || p >= 3) result.push(Utils.rand(pools.equipSpecial));

    // Drones et véhicules : riggers (stats du catalogue js/vehicles.js)
    const rigger = archetype.includes("Rigger") || special === "Rigger";
    if (rigger) {
      result.push(
        Utils.rand([
          "Drone Lockheed Optic-X2 (surveillance)",
          "Drone Aztechnology Crawler",
        ]),
      );
      result.push(
        Utils.rand([
          "Drone GM-Nissan Doberman [avec fusil d'assaut]",
          "Drone MCT-Nissan Roto-drone [avec fusil d'assaut]",
        ]),
      );
      if (p >= 4)
        result.push(
          Utils.rand([
            "Drone Steel Lynx [avec mitrailleuse]",
            "Drone Cyberspace Designs Dalmatian",
          ]),
        );
      result.push(
        Utils.rand([
          "Fourgon GMC Bulldog",
          "Ares Roadmaster",
          "Toyota Gopher",
        ]),
      );
    }

    return result;
  },

  /* ---- Génération principale ---- */
  generate(opts) {
    Metavariants.use("sr5");
    let meta = opts.meta === "Aléatoire" ? Metavariants.randomMeta() : opts.meta;

    // Résolution métavariante : une métavariante/conscience/zoocanthrope
    // remplace les ranges de sa souche et porte ses traits raciaux.
    const mv = Metavariants.resolve(meta);
    // Résolution Infecté (Livre de Règles p.406-408) — remplace la
    // résolution métavariante habituelle.
    const infected = !mv ? Infected.use("sr5").resolve(meta) : null;
    const baseMetatype = mv ? mv.baseMetatype : infected ? infected.baseMetatype : meta;
    // Bassin de noms : si non imposé, hériter de la métavariante
    let originPoolOverride = null;
    if (mv && mv.originPools && (!opts.originPool || opts.originPool === "Aléatoire")) {
      originPoolOverride = Utils.rand(mv.originPools);
    }
    // Origine effective (nom + biais tradition/esprit mentor)
    const effectiveOrigin =
      opts.originPool && opts.originPool !== "Aléatoire"
        ? opts.originPool
        : originPoolOverride;

    const gender =
      opts.gender === "Aléatoire" ? Utils.randGender() : opts.gender;
    const proRating =
      opts.proRating === "Aléatoire" ? Utils.randInt(0, 6) : parseInt(opts.proRating, 10);
    const archetype =
      opts.archetype === "Aléatoire"
        ? Utils.rand(this.formOptions.archetype.slice(1))
        : opts.archetype;

    // Cohérence : rôle/milieu résolus depuis l'archétype (ProfCategories +
    // mots-clés), pour piocher des attributs/compétences variés mais
    // cohérents (cf. js/rules/coherence.js).
    const { role, milieu } = Coherence.resolveTuple("sr5", archetype);

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

    // Cohérence : une profession magique implique sa tradition si aucune
    // spécialisation n'est déjà fixée (sinon le « mage » n'aurait pas de Magie).
    if (special === "Aucun") {
      if (archetype.includes("Chaman")) special = "Chaman";
      else if (archetype.includes("Adepte")) special = "Adepte";
      else if (archetype.includes("Mage") || archetype.includes("Initié"))
        special = "Mage hermétique";
    }

    // Attributs de base selon professionnalisme
    const archetypeIdx = Utils.clamp(proRating, 0, 6);
    const baseAttrs = { ...this.attrByProf[archetypeIdx] };
    // Les modificateurs de PNJ suivent la souche (métatype parent)
    const mods = this.metaMod[baseMetatype] || {};
    // Les ranges suivent la métavariante si présente, sinon la souche
    let range = mv
      ? mv.ranges
      : this.attrRange[baseMetatype] || this.attrRange["Humain"];

    // Infecté (Run Faster p.105-111) : étend le maximum de la
    // souche/métaconscience hôte du modificateur imprimé dans le livre.
    // Sasquatch n'a pas d'entrée dans attrRange : bornes propres via
    // Metavariants (métaconsciences SR5).
    if (infected && infected.attrMod) {
      const mcRange = Metavariants.use("sr5").resolve(
        infected.baseMetatype,
      )?.ranges;
      const src = mcRange || range;
      const extended = {};
      for (const k of Object.keys(src)) {
        extended[k] = [src[k][0], src[k][1] + (infected.attrMod[k] || 0)];
      }
      range = extended;
    }

    const attrs = {};
    for (const k of ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"]) {
      const raw = (baseAttrs[k] || 3) + (mods[k] || 0) + Utils.randInt(-1, 1);
      const lo = range[k] ? range[k][0] : 1;
      const hi = range[k] ? range[k][1] : 6;
      attrs[k] = Utils.clamp(raw, lo, hi);
    }
    // Repondération par rôle (ex. LOG/INT pour un decker) — reclampée
    // dans les mêmes bornes de métatype, pour varier sans sortir du cadre.
    const roleAttrs = Coherence.reweightAttrs(attrs, role, 1);
    for (const k of Object.keys(roleAttrs)) {
      const lo = range[k] ? range[k][0] : 1;
      const hi = range[k] ? range[k][1] : 6;
      attrs[k] = Utils.clamp(roleAttrs[k], lo, hi);
    }
    attrs.ESS = baseAttrs.ESS;

    // Infecté (Howling Shadows, anglais) : certains types n'ont que des
    // fiches PNJ à stats absolues (pas de plage de chargen comme Run
    // Faster/SR6) — utilisées comme centre d'un léger tirage.
    if (infected && infected.attrFixed) {
      for (const k of Object.keys(infected.attrFixed)) {
        attrs[k] = Utils.clamp(infected.attrFixed[k] + Utils.randInt(-1, 1), 1, 15);
      }
    }

    // Spécialisations magiques
    if (["Mage hermétique", "Chaman", "Adepte"].includes(special)) {
      attrs.MAG = Utils.clamp(proRating + Utils.randInt(1, 2), 1, 6);
    }
    if (special === "Technomancien") {
      attrs.RES = Utils.clamp(proRating + Utils.randInt(1, 2), 1, 6);
    }
    if (special === "Decker") {
      attrs.ESS = Utils.clamp(6 - Utils.randInt(1, 2), 3, 6);
    }

    // Chance (CHC, p.68) : attribut suivant la souche métatype (attrRange
    // du baseMetatype, toujours présent — les mv.ranges/infected peuvent
    // l'omettre). Le centre du tirage monte avec le professionnalisme (un
    // figurant reste au plancher racial, une élite atteint ~60 % de la
    // plage), toujours borné par attrRange. Ressource de relance « Seconde
    // chance ».
    const chcR = this.attrRange[baseMetatype]?.CHC || [1, 6];
    const chcCenter = chcR[0] + Math.round((chcR[1] - chcR[0]) * Utils.clamp(proRating / 6, 0, 1) * 0.6);
    attrs.CHC = Utils.clamp(chcCenter + Utils.randInt(0, 1), chcR[0], chcR[1]);

    // Limites naturelles
    const limPhys = Math.ceil((attrs.FOR * 2 + attrs.CON + attrs.REA) / 3);
    const limMent = Math.ceil((attrs.LOG * 2 + attrs.INT + attrs.VOL) / 3);
    const limSoc = Math.ceil((attrs.CHA * 2 + attrs.VOL + (proRating || 0)) / 3);

    // Initiative
    const initData = this.initByProf[archetypeIdx];
    const init = attrs.REA + attrs.INT;
    // Base 1D6 pour tout métahumain ; les dés en plus (Réflexes câblés, pouvoir
    // adepte « Réflexes améliorés », etc.) sont ajoutés ensuite par BonusEngine.
    // Zoocanthrope : dés d'initiative animale propres (ex. "2D6") priment.
    const zooInitDice = mv && mv.init ? parseInt(mv.init, 10) : null;
    const initDice = zooInitDice || initData.dice;

    // Tradition magique & esprit mentor (corrélés à l'origine).
    // Le mage/chaman lance des sorts (drainResist) ; l'adepte « pur » non.
    const isAwakened = this._isAwakened(archetype, special);
    const castsSpells = isAwakened && special !== "Adepte";
    const tradition = castsSpells
      ? Magic.pickTradition("sr5", effectiveOrigin, special, archetype)
      : null;
    const mentorSpirit = isAwakened
      ? Magic.pickMentor(
          "sr5",
          effectiveOrigin,
          Magic.mentorKind(tradition, special),
        )
      : null;

    // Résistance au Drain : Volonté + attribut de la tradition.
    const drainResist = tradition
      ? attrs.VOL + (attrs[tradition.drainAttr] || 0)
      : null;

    // Réserves utiles au MJ (SR5, LdB p.174 & p.189)
    const armure = this.armureByProf[archetypeIdx] || 0;
    const defense = attrs.REA + attrs.INT; // test de défense
    const damageResist = attrs.CON + armure; // résistance aux dommages phys
    const composure = attrs.VOL + attrs.CHA; // sang-froid
    const judgeIntentions = attrs.INT + attrs.CHA; // jauger les intentions
    const memory = attrs.LOG + attrs.VOL; // mémoire
    const liftCarry = attrs.FOR + attrs.CON; // soulever/porter
    const surprise = attrs.REA + attrs.INT; // surprise

    // Moniteurs
    const physMon = 8 + Math.ceil(attrs.CON / 2);
    const stunMon = 8 + Math.ceil(attrs.VOL / 2);

    // Compétences
    const { skills, knowledges } = this._buildSkills(archetype, proRating, special, role, milieu);

    // Équipement
    const equip = this._buildEquip(archetype, proRating, special);
    if (infected) equip.push(...infected.naturalWeapons);
    if (mv && mv.naturalWeapons) equip.push(...mv.naturalWeapons);

    // Augmentations — supprimées pour tout Éveillé (cohérence Essence/Magie)
    const awakened = this._isAwakened(archetype, special);
    const augsProducer =
      this.augsBySpecial[special] || this.augsBySpecial["Aucun"];
    // Anti-doublon inter-source : equip (cyberware du loadout) et augs
    // (pioches spéciales) peuvent porter le même bonus sous un libellé
    // différent (« Accroissement de réaction (+1 REA) » vs « ... 1 ») ;
    // BonusEngine.CYBER_BONUS les reconnaît tous deux par préfixe, donc on
    // n'en repioche pas un déjà présent côté equip (bug constaté : +3 RÉA
    // au lieu de +1, cumulé depuis deux sources indépendantes).
    const equipCyberPrefixes = BonusEngine.CYBER_BONUS.sr5
      .map(([prefix]) => prefix)
      .filter((prefix) => equip.some((e) => typeof e === "string" && e.startsWith(prefix)));
    const augs = awakened
      ? []
      : augsProducer(proRating).filter(
          (a) => !equipCyberPrefixes.some((prefix) => a.startsWith(prefix)),
        );

    // Tags d'archétype pour la sélection de contenu cohérent
    const contentTags = Flavor.tagsFor({ archetype, special });

    // Sorts — enrichis avec descriptions cliquables.
    // Un adepte « pur » canalise sa magie en pouvoirs physiques, pas en
    // sorts ; les mages/chamans lancent des sorts.
    let spellsList = [];
    const adeptePur = special === "Adepte";
    if (awakened && !adeptePur) {
      spellsList = Content.pickSorts("sr5", proRating, contentTags);
    } else if (!adeptePur && this.spellsByTradition[special]) {
      spellsList = this.spellsByTradition[special].slice(
        0,
        2 + Math.floor(proRating / 2),
      );
    }

    // Pouvoirs d'adepte — seulement pour les adeptes
    const powers =
      special === "Adepte"
        ? Content.pickPouvoirs("sr5", proRating, proRating >= 4 ? 3 : 2)
        : [];

    // Trait de couleur cohérent (parfois)
    const traits = Utils.randBool(0.5)
      ? Content.pickTraits("sr5", contentTags, proRating, 1)
      : [];

    const pnj = {
      id: Utils.uid(),
      edition: "sr5",
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
      proRating,
      archetype,
      special,
      attrs,
      role,
      milieu,
      limPhys,
      limMent,
      limSoc,
      init,
      initDice,
      drainResist,
      tradition: tradition ? tradition.name : null,
      traditionDrainAttr: tradition ? tradition.drainAttr : null,
      traditionDesc: tradition ? tradition.desc : null,
      mentorSpirit,
      defense,
      damageResist,
      composure,
      judgeIntentions,
      memory,
      liftCarry,
      surprise,
      physMon,
      stunMon,
      physFilled: 0,
      stunFilled: 0,
      armure: this.armureByProf[archetypeIdx] || 0,
      skills,
      knowledges,
      equip,
      augs,
      spells: spellsList,
      powers,
      traits,
      infected: infected ? infected.name : null,
      infectedPowers: infected ? infected.powersFixed : [],
      infectedWeaknesses: infected ? infected.weaknesses : [],
      notes: "",
    };
    if (infected && infected.bonus) pnj._infectedBonus = infected.bonus;

    // Couche d'habillage cohérente
    // Cohérence arme <-> compétence (renomme une compétence de combat si besoin)
    WeaponRoll.reconcile(pnj, "sr5");
    BonusEngine.apply(pnj, "sr5");
    Flavor.apply(pnj);
    return pnj;
  },

  _buildSkills(archetype, proRating, special, role, milieu) {
    const p = Utils.clamp(proRating, 0, 6);
    const basePool =
      this.skillPools[archetype] || this.skillPools["Voyou de bas étage"];
    // Élargit le pool figé du livre avec les compétences du rôle/milieu
    // résolus (js/rules/coherence.js) : le pool du livre reste le plancher,
    // le rôle/milieu ajoute de la variété cohérente autour.
    const coherentPool = [
      ...Coherence.skillsForRole("sr5", role),
      ...Coherence.skillsForMilieu("sr5", milieu),
    ];
    const pool = [...new Set([...basePool, ...coherentPool])];
    const count = this.skillCount[p] || 4;

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count).map((name) => ({
      name,
      val: Utils.clamp(p + 2 + Utils.randInt(-1, 2), 1, 12),
    }));

    // Compétences de spécialisation — sans doublon avec le pool
    const existingNames = new Set(picked.map((s) => s.name));
    const specialList = this.specialSkills[special] || [];
    for (const s of specialList) {
      if (!existingNames.has(s.name)) {
        picked.push({
          name: s.name,
          val: Utils.clamp(p + s.bonus + Utils.randInt(0, 1), 1, 12),
        });
        existingNames.add(s.name);
      }
    }

    // Compétences actives vs connaissances (Livre de Règles p.130-152) —
    // certains pools de ce fichier mêlaient encore des connaissances (ex.
    // « Connaissance ésotérique ») aux compétences actives ; on route à
    // part uniquement ce qui est EXPLICITEMENT une connaissance connue
    // (SkillCatalog.sr5Knowledges). Ne pas inverser ce test (actif si
    // présent dans SkillCatalog.sr5) : plusieurs pools utilisent encore
    // une orthographe pré-nettoyage ("Armes à feu", "Athlétisme", "Combat
    // rapproché"…) absente de la liste canonique resserrée — les traiter
    // comme connaissances par défaut les sortirait à tort de pnj.skills
    // et casserait le rapprochement arme↔compétence (WeaponRoll).
    const isKnowledge = (name) => {
      const base = name.replace(/\s*\(.*\)\s*$/, "").trim();
      return !!SkillCatalog.sr5Knowledges[base];
    };
    const skills = picked.filter((s) => !isKnowledge(s.name));
    const knowledges = picked.filter((s) => isKnowledge(s.name));

    // Complète avec 1-2 connaissances suggérées (les connaissances SR5
    // sont libres dans le livre ; cette réserve n'est qu'une saveur).
    const knownNames = new Set(knowledges.map((k) => k.name));
    const knowledgePool = Object.keys(SkillCatalog.sr5Knowledges).filter(
      (n) => !knownNames.has(n),
    );
    const shuffledK = [...knowledgePool].sort(() => Math.random() - 0.5);
    for (const name of shuffledK.slice(0, Utils.randInt(1, 2))) {
      knowledges.push({
        name,
        val: Utils.clamp(p + 1 + Utils.randInt(-1, 1), 1, 12),
      });
    }

    return { skills, knowledges };
  },

  _buildEquip(archetype, proRating, special) {
    return this.buildLoadout(archetype, proRating, special);
  },

  recalc(pnj) {
    const { attrs, proRating } = pnj;
    // Chance : init douce pour les PNJ sauvegardés avant l'ajout du champ
    // (plancher racial d'attrRange, pas de migration versionnée).
    attrs.CHC ??= this.attrRange[pnj.meta]?.CHC?.[0] ?? 3;
    pnj.limPhys = Math.ceil((attrs.FOR * 2 + attrs.CON + attrs.REA) / 3);
    pnj.limMent = Math.ceil((attrs.LOG * 2 + attrs.INT + attrs.VOL) / 3);
    pnj.limSoc = Math.ceil((attrs.CHA * 2 + attrs.VOL + (proRating || 0)) / 3);
    pnj.physMon = 8 + Math.ceil(attrs.CON / 2);
    pnj.stunMon = 8 + Math.ceil(attrs.VOL / 2);
    pnj.init = attrs.REA + attrs.INT;
    pnj.drainResist = pnj.traditionDrainAttr
      ? attrs.VOL + (attrs[pnj.traditionDrainAttr] || 0)
      : ["Mage hermétique", "Chaman"].includes(pnj.special)
        ? attrs.VOL + attrs.LOG // fallback anciens PNJ sans tradition
        : null;
    const armure = pnj.armure || 0;
    pnj.defense = attrs.REA + attrs.INT;
    pnj.damageResist = attrs.CON + armure;
    pnj.composure = attrs.VOL + attrs.CHA;
    pnj.judgeIntentions = attrs.INT + attrs.CHA;
    pnj.memory = attrs.LOG + attrs.VOL;
    pnj.liftCarry = attrs.FOR + attrs.CON;
    pnj.surprise = attrs.REA + attrs.INT;
    return pnj;
  },
};
