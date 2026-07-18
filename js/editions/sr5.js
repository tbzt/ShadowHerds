"use strict";

/* ============================================================
   ÉDITION SR5 — Shadowrun 5e édition
   Données calibrées sur le Livre de Règles SR5 (BBE, fr)
   Table des attributs : p.68
   PNJ de référence : p.382-388
   Contacts : p.388-394
   ============================================================ */
import { Actor } from "../rules/actor.js";
import { BonusEngine } from "../rules/bonusengine.js";
import { Coherence } from "../rules/coherence.js";
import { Content } from "../rules/content.js";
import { Cyberdeck } from "../rules/cyberdeck.js";
import { Esoteric } from "../rules/esoteric.js";
import { Flavor } from "../rules/flavor.js";
import { Infected } from "../rules/infected.js";
import { ItemResolver } from "../rules/itemresolver.js";
import { LoadoutEngine } from "../rules/loadoutengine.js";
import { Magic } from "../rules/magic.js";
import { Metavariants } from "../rules/metavariants.js";
import { Resonance } from "../rules/resonance.js";
import { SkillCatalog } from "../rules/skillcatalog.js";
import { Spirits } from "../catalogs/spirits.js";
import { Utils } from "../core/utils.js";
import { WeaponRoll } from "../rules/weaponroll.js";

export const EditionSR5 = {
  id: "sr5",
  label: "Shadowrun 5e",
  badgeLabel: "SR5",
  useMetavariants: true,

  /* ---- Contrat commun édition (résorption des branches) ---- */
  attributes: ["CON", "AGI", "REA", "FOR", "VOL", "LOG", "INT", "CHA"],
  /** Légende des symboles affichée dans l'Aide (?), lue par
      App._renderHelpLegend — jamais de branche d'édition côté app.js
      Sens vérifiés au Livre de Règles
      (chap. Combat) : CC Coup par Coup · SA Semi-Auto · TR Tir en Rafales ·
      TA Tir Automatique ; PRE plafonne les succès ; P physique / E étourdissant. */
  helpLegend: [
    {
      keys: "⚄ N",
      html: "Réserve de dés <strong>cliquable</strong> — un clic lance le test à N dés.",
    },
    {
      keys: "Init",
      html: "Initiative : score de base + dés d'initiative (ex. 8+2D6).",
    },
    {
      keys: "PRE",
      html: "Précision — plafonne le nombre de succès ; <em>(n)</em> = avec accessoire.",
    },
    {
      keys: "VD",
      html: "Valeur de Dégâts — <strong>P</strong> physique, <strong>E</strong> étourdissant.",
    },
    { keys: "PA", html: "Pénétration d'Armure (« — » = nulle)." },
    {
      keys: "Modes",
      html: "<strong>CC</strong> Coup par Coup · <strong>SA</strong> Semi-Auto · <strong>TR</strong> Tir en Rafales · <strong>TA</strong> Tir Automatique.",
    },
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
  /** Edge PRÉ-jet « Repousser les limites » (p.58) : dépenser 1 point de
      Chance AVANT le jet pour ajouter son indice de Chance en dés à Règle des
      six ET ignorer toute Limite. Contrat neutre miroir de rerollAction, lu
      par le lanceur (DiceRoller.preRollEdgeOptions), jamais de branche
      d'édition. `dice:"rating"` = valeur de l'attribut de coût (`costAttr`),
      résolue par le lanceur ; `explode` = Règle des six ; `ignoreLimit` ne
      mord que là où une Limite existe (rollWeapon). `null` si l'édition n'a
      pas d'Edge pré-jet par PNJ. */
  preRollEdge: {
    costAttr: "CHC",
    options: [
      {
        id: "pushLimit",
        label: "Repousser les limites",
        cost: 1,
        dice: "rating",
        explode: true,
        ignoreLimit: true,
        hint: "1 Chance · +indice, Règle des six, ignore la Limite",
      },
    ],
  },
  /* ---- Action magique : sorts + invocation, tout lu par
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
    const mag = Actor.attr(pnj, "MAG");
    const cmp = ctx.kind === "conjuration" ? ctx.force || 0 : ctx.castHits || 0;
    return cmp > mag ? "physical" : "stun";
  },
  /** Applique des dégâts de Drain au moniteur du PNJ (deux moniteurs
      séparés en SR5), plafonnés à leur taille respective. Renvoie
      `{ field, delta }` — le champ touché et la quantité RÉELLEMENT ajoutée
      (après plafonnement), pour permettre d'annuler l'encaissement lors d'une
      Seconde chance sur le Drain. */
  applyDrainDamage(pnj, amount, type) {
    const field = type === "physical" ? "physFilled" : "stunFilled";
    if (!amount) return { field, delta: 0 };
    const max = type === "physical" ? pnj.physMon : pnj.stunMon;
    const before = pnj[field] || 0;
    pnj[field] = Utils.clamp(before + amount, 0, max ?? 99);
    return { field, delta: pnj[field] - before };
  },
  /* ---- Tissage de forme complexe (T2) : même flux que sorts/invocation
     (MagicAction, kind:"complexForm"), mirroir exact des 3 clés ci-dessus
     mais scopé Résonance au lieu de Magie — un technomancien n'a pas MAG. ---- */
  /** Compétence utilisée pour tisser une forme complexe (p.252). */
  technoFormSkill: "Logiciels",
  /** SR5 : la forme complexe a un Niveau, choisi au tissage (1 à RES×3, p.252)
      — jumeau de `spellUsesForce`. Le panneau de MagicAction s'ouvre pour le
      choisir. (SR6 : formes sans Niveau → `false`, tissage direct.) */
  technoFormUsesLevel: true,
  /** Libellé du coût affiché sous la forme (le livre nomme l'objet) : SR5 = VT
      (Valeur de Tissage), SR6 = Technodrain. Lu par les renderers, neutre. */
  technoCostLabel: "VT",
  /** VT d'une forme (p.252) : Niveau + code de l'entrée (« N+2 »…), min 2 —
      `Magic.parseDrainMod` ignore la lettre, seul le modificateur signé
      compte : fonctionne tel quel sur "N±x" comme sur "P±x". `ctx.level` est
      le Niveau choisi (SR6 lit `ctx.castHits` pour son régime « succès »). */
  technoDrainValue(entry, ctx) {
    return Magic.drainValue(ctx.level, Magic.parseDrainMod(entry.vt));
  },
  /** Type de dégâts du Technodrain (p.252) : physique si les succès au
      tissage dépassent la Résonance, sinon étourdissant. */
  technoDrainType(ctx, pnj) {
    const res = Actor.attr(pnj, "RES");
    return (ctx.castHits || 0) > res ? "physical" : "stun";
  },
  ratingBadge: {
    field: "proRating",
    label: "Professionnalisme",
    options: null,
  },
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
  /** Spec d'un combattant CI lancé dans l'initiative (fiche CI minimale +
      jeton Matrice). Init du livre SR5 : indice de l'hôte ×2 + 4D6 (p.249).
      La règle vit ici (prohibition n°1) ; Encounter lit le spec neutre. */
  icCombatant(ic, srv) {
    return { name: ic.label, initBase: srv.indice * 2, initDice: 4 };
  },
  /** Budget d'actions par phase d'action (= passe d'init, déjà motorisée)
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
    if (pr == null || !group || !group.total)
      return { down: false, morale: null };
    const frac = group.down / group.total;
    let flee;
    if (pr <= 0)
      flee = group.down >= 1; // 0 : un allié tombe → le reste fuit
    else if (pr <= 2)
      flee = frac > 0.25; // 1-2 : > ¼ de l'équipe hors combat
    else if (pr <= 4)
      flee = frac > 0.5; // 3-4 : > ½ de l'effectif
    else flee = false; // 5-6 : élite, ne craque pas
    return { down: false, morale: flee ? "flee" : "steady" };
  },
  summonPower: {
    field: "force",
    label: "Puissance",
    steps: () =>
      [2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: n, label: String(n) })),
  },
  skillModel: { shape: "simple", valRange: [1, 12], hasGroups: true },
  hasEdges: false,
  /** Attribut MAG chiffré (Livre de Règles p.68, table Attributs par
      métatype) : absent en Anarchy (magie narrative, pas d'attribut).
      Gate EditModal — MAG toujours affiché (0 par défaut, éditable) +
      verrouille Sorts/Pouvoirs à 0. */
  magicAttr: "MAG",
  /** Attribut RES chiffré, jumeau de magicAttr — même gate EditModal. */
  resonanceAttr: "RES",
  /** Régime persona SR5 — lu par Resonance via App.editionModule.technoModel.
      Mappage DIRECT attributs mentaux → matriciels (p.252, table
      « Persona incarné »), aucun point bonus à répartir (contrairement à
      SR6) : `redistributable` absent/false. */
  technoModel: {
    label: "Résonance",
    resonanceAttr: "RES",
    livingPersona: true,
  },
  /** Régime Initiation/Submersion SR5, lu par Esoteric via
      App.editionModule.esotericModel[voie]. Coût Karma p.257 (Initiation
      ET Submersion, même table — le livre renvoie l'une à l'autre) :
      10 + (Grade × 3). Délai (mois/épreuves) NON motorisé (arbitrage 4
      du plan — trop de variantes de réduction pour un chiffre unique). */
  esotericModel: {
    initiation: { attr: "MAG", acquisLabel: "Métamagie", costLabel: "Karma", cost: (grade) => 10 + grade * 3 },
    submersion: { attr: "RES", acquisLabel: "Écho", costLabel: "Karma", cost: (grade) => 10 + grade * 3 },
  },
  /** Connaissances éditables à la main (nom libre + catégorie →
      Logique/Intuition, cf. SkillCatalog.knowledgeCategories) — modèle
      absent en Anarchy (pas de pool de connaissances chiffré). */
  hasKnowledges: true,
  /** Neutre : les drogues SR5 sont des équipements, pas des atouts au
      choix — matchItem() filtre déjà par source, pas de correspondance
      universelle nécessaire (concept propre à Anarchy 2.0 p.150). */
  drugModel: { matchAll: false },
  /** Invocation d'esprits : SR5 invoque via Conjuration,
      types = éléments classiques (Spirits.SR_TYPES). `types` est lazy
      car spirits.js (catalogs) charge après les modules d'édition. */
  spiritModel: { canSummon: true, types: () => Spirits.SR_TYPES },
  /** Réserves de dés et initiative des véhicules/drones liés (js/catalogs/
      vehicles.js) : Autopilote + autosoft, limite de précision inexistante
      ici (pas de PRE sur un drone). */
  vehicleModel: {
    /** Champs de stats affichés en pills (card) et édités (modal). */
    statFields: [
      ["mania", "Man"],
      ["vitesse", "Vit"],
      ["accel", "Acc"],
      ["structure", "Str"],
      ["blindage", "Blind"],
      ["pilote", "Auto"],
      ["senseurs", "Sens"],
    ],
    /** Champ supplémentaire édité (pas affiché en pill) : autosoft
        d'attaque autonome, distinct de l'autopilote (Riggers p.265-272). */
    formExtraFields: [["autosoft", "Autosoft"]],
    pools(v) {
      const s = v.stats || {};
      const autosoft = s.autosoft || s.pilote || s.autopilote || 0;
      return [
        {
          label: "Attaque",
          pool: (s.pilote || 0) + autosoft,
          title: "Autopilote + autosoft Acquisition [Précision]",
          weaponOnly: true,
        },
        {
          label: "Défense",
          pool: (s.pilote || 0) + autosoft,
          title: "Autopilote + autosoft Évasion [Maniabilité]",
        },
        {
          label: "Capteurs",
          pool: (s.pilote || 0) + (s.senseurs || 0),
          title: "Autopilote + autosoft Acuité [Senseurs]",
        },
        {
          label: "Encaissement",
          pool: (s.structure || 0) + (s.blindage || 0),
          title: "Structure + Blindage",
        },
      ];
    },
    initiative(v) {
      const p = (v.stats && v.stats.pilote) || 0;
      return { base: p * 2, dice: 4 };
    },
  },
  /** Bloc « mécanique de table » du PJ léger
      (`pcLight`) — ce que le MJ demande dix fois par soirée, saisi une fois.
      Optionnel, jamais dérivé (le PJ léger n'a pas d'attributs) : chaque
      valeur est un nombre entré à la main. `monitorKind:"double"` réutilise
      physMon/stunMon + physFilled/stunFilled, exactement le modèle des PNJ
      complets SR5 (cf. `conditionMonitor` ci-dessous) — mêmes champs, donc
      `CardRenderer._monitorBoxes`/`UI.toggleMonitor` s'appliquent tels quels. */
  /** Réputation SR5 (Livre de Règles p.374) : trois scores distincts —
      Crédibilité (accomplissements), Rumeur (côté négatif), Renommée
      (reconnaissance publique). Suivis librement par le MJ (compteurs de
      campagne, cf. Campaign) : la Crédibilité dérive du Karma dans le livre
      mais d'autres facteurs l'altèrent, on ne l'auto-calcule donc pas. */
  reputationTracks: [
    { key: "cred", label: "Crédibilité" },
    { key: "rumeur", label: "Rumeur" },
    { key: "renommee", label: "Renommée" },
  ],

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
  /** Malus de dés dû aux effets MAINTENUS : −2 dés à TOUS les tests par sort
      (p.284, « Étape 7 ») OU forme complexe (p.253, « Tissage ») maintenu,
      cumulatif. Le compte (effets marqués) est neutre — Utils.sustainedCount —,
      le mapping −2/effet est la règle SR5. */
  sustainMalus(pnj) {
    return Utils.sustainedCount(pnj) * 2;
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
      // Chap. Dommages : « -1 par tranche de trois cases dans l'UN des
      // moniteurs […] les modificateurs issus de CHACUN se cumulent » — donc
      // par piste puis somme, jamais sur le total (cf. Utils.woundMalusTracks).
      // Le Compensateur (p.464) fournit un stock de cases librement réparti.
      return Utils.woundMalusTracks(
        pnj.physFilled,
        pnj.stunFilled,
        div,
        Utils.woundBoxesIgnored(pnj),
      );
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
        return (
          (entity.monTotal || 0) > 0 &&
          (entity.monFilled || 0) >= entity.monTotal
        );
      return (
        (entity.physMon || 0) > 0 && (entity.physFilled || 0) >= entity.physMon
      );
    },
    /** Mise hors de combat immédiate (Vague C) : remplit le moniteur physique
        (ou total pour un véhicule) → isDestroyed devient vrai. Réversible par
        _resetMonitors (bouton ✚). Inverse de isDestroyed. */
    knockOut(entity) {
      if (entity.type === "vehicle") entity.monFilled = entity.monTotal || 0;
      else entity.physFilled = entity.physMon || 0;
    },
    /** Descripteur de moniteur pour les jauges (barre fine + cases spectateur).
        Forme ÉCHELLE (`Utils.ladderGauge`) : physique + étourdissement cumulés
        (mêmes champs que isDestroyed/knockOut), l'alarme suit la fraction de
        cases. `null` si pas de moniteur. */
    gauge(entity) {
      if (entity.type === "vehicle")
        return Utils.ladderGauge(entity.monFilled || 0, entity.monTotal || 0);
      return Utils.ladderGauge(
        (entity.physFilled || 0) + (entity.stunFilled || 0),
        (entity.physMon || 0) + (entity.stunMon || 0),
      );
    },
    /** Résultat NET de dégâts (déjà résisté par le MJ hors app) appliqué au
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
    /** Descripteur neutre lu par le cockpit pour bâtir les chips de
        dégâts — SR5 a deux pistes (Physique/Étourdissant), défaut Physique. */
    damageUI() {
      return {
        kind: "numeric",
        chips: [1, 2, 3, 5],
        hasType: true,
        defaultType: "phys",
      };
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
    // Régime de brickage des appareils (armes) — SR5 a un vrai moniteur
    // matriciel d'appareil (8+Indice/2, p.229) : cases cliquables + indice.
    deviceBricking: "monitor",
    // Table « connecté » par catégorie d'`equipPools` (dérivée par
    // Matrix._resolveCat, jamais besoin de tagger chaque item), taxonomie
    // tranchée. cyberware/equipSpecial restent NON par défaut : le
    // sans-fil réel (cyberyeux/oreilles, cyberdeck implanté, antenne…) passe
    // par l'override regex de Matrix.deviceConnected, pas cette table.
    connectedByCat: {
      commlinks: true,
      cyberdecks: true,
      electroarmes: true,
      pistoletsPoche: false,
      pistoletsLegers: false,
      pistoletsLourds: false,
      mitraillettes: false,
      fusilsAssaut: false,
      shotguns: false,
      mitrailleuses: false,
      snipers: false,
      armesSpeciales: false,
      armesExotiques: false,
      meleeWeapons: false,
      armures: false,
      grenades: false,
      explosifs: false,
      cyberware: false,
      bioware: false,
      nanotechnologie: false,
      equipSpecial: false,
    },
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
      return Utils.clamp(
        2 + Math.ceil(indice / 3) + Utils.randInt(-1, 1),
        2,
        candLen,
      );
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

  /* Régime cyberdeck SR5 — lu par Cyberdeck
     via App.editionModule.cyberdeckModel. 4 attributs ASDF réallouables par
     action gratuite (p.229, réallocation motorisée) ; moniteur du deck
     et Limites d'attribut. */
  cyberdeckModel: {
    attrKeys: ["attack", "sleaze", "dataProcessing", "firewall"],
    reallocatable: true,
    reallocCostLabel: "action gratuite (p.229)",
    hasReroll: false,
    hasBiofeedbackFilter: false,
    label: "Cyberdeck",
    /** Moniteur matriciel du deck = 8 + (Indice d'appareil / 2), p.229.
        L'app ne porte pas de champ « Indice » séparé pour un deck (seulement
        ses 4 attributs) : approximation assumée = l'attribut le plus élevé,
        cohérent avec la fourchette officielle « Indice à Indice+3 » (p.441) où
        l'attribut haut plafonne près de l'Indice réel. */
    monitorSize(deck) {
      const vals = Object.values((deck && deck.attrs) || {});
      const top = vals.length ? Math.max(...vals) : 0;
      return 8 + Math.ceil(top / 2);
    },
    /* Catalogue d'actions matricielles OFFENSIVES (colonne « ATTAQUE »
       p.247, compétence Cybercombat). Pool simplifié = l'attribut du deck lié
       à la Limite entre crochets ([Attaque] → attack, [Corruption] → sleaze) ;
       VD chiffrée seulement pour le pic de données (VD = indice d'Attaque,
       p.242 — les +1/succès exc. et +2/mark s'ajoutent live, côté MJ). */
    actions: [
      {
        key: "spike",
        name: "Pic de données",
        type: "attack",
        page: 242,
        pool: (d) => (d.attrs || {}).attack || 0,
        dv: (d) => (d.attrs || {}).attack || 0,
      },
      {
        key: "crash",
        name: "Planter un programme",
        type: "crash",
        page: 243,
        pool: (d) => (d.attrs || {}).attack || 0,
        dv: () => null,
      },
      {
        key: "erasemark",
        name: "Effacer une mark",
        type: "erase",
        page: 242,
        pool: (d) => (d.attrs || {}).attack || 0,
        dv: () => null,
      },
      {
        key: "hackfly",
        name: "Hacker à la volée",
        type: "access",
        page: 242,
        pool: (d) => (d.attrs || {}).sleaze || 0,
        dv: () => null,
      },
    ],
    /* Programmes matriciels (CYBERPROGRAMMES, p.246-248 ; collecte 2026-07-15).
       Dans cette app, les 4 attributs du deck (attack/sleaze/dataProcessing/
       firewall) SONT les limites matricielles et alimentent pools d'actions,
       défense (Firewall) et affichage — un programme qui relève un attribut/
       limite est donc pleinement motorisé via `attr:{…}` (effectiveAttrs).
       `dvByType`/`poolByType` restent pour les rares bonus purement liés à une
       action (Marteau = +VD au pic). `effect: null` = réellement non
       motorisable ici : bonus sur une action non modélisée (éditer/traquer un
       fichier…), résistance à un jet non tracké, ou effet narratif/règle. */
    programs: [
      { key: "configurateur", name: "Configurateur", page: 246, effect: null }, // config alternative rechargeable (narratif)
      {
        key: "cryptage",
        name: "Cryptage",
        page: 246,
        effect: { attr: { firewall: 1 } },
      }, // +1 Firewall (défense)
      { key: "edition", name: "Édition", page: 247, effect: null }, // +2 limite TdD pour « éditer un fichier » (action non modélisée)
      {
        key: "gommage-de-bruit",
        name: "Gommage de bruit",
        page: 247,
        effect: null,
      }, // réduction de bruit 2 (non tracké)
      {
        key: "machine-virtuelle",
        name: "Machine virtuelle",
        page: 247,
        effect: null,
      }, // +2 emplacements, +1 case dégât encaissé
      { key: "navigateur", name: "Navigateur", page: 247, effect: null }, // ÷2 temps de recherche matricielle
      {
        key: "toolbox",
        name: "Toolbox",
        page: 247,
        effect: { attr: { dataProcessing: 1 } },
      }, // +1 Traitement de données
      { key: "armure", name: "Armure", page: 247, effect: null }, // +2 dés résistance dommages matriciels (jet non tracké)
      { key: "agresseur", name: "Agresseur", page: 247, effect: null }, // +1 dégâts des marks (hors actions codées)
      { key: "biofeedback", name: "Biofeedback", page: 247, effect: null }, // dégâts biofeedback si cible organique (narratif)
      { key: "blackout", name: "Blackout", page: 247, effect: null }, // Biofeedback étourdissant seul (narratif)
      { key: "carapace", name: "Carapace", page: 247, effect: null }, // +1 dé résistance matriciel & biofeedback (jet non tracké)
      {
        key: "decryptage",
        name: "Décryptage",
        page: 247,
        effect: { attr: { attack: 1 } },
      }, // +1 Attaque (limite du Pic de données)
      { key: "demolition", name: "Démolition", page: 247, effect: null }, // +1 indice bombes matricielles
      { key: "desamorcage", name: "Désamorçage", page: 247, effect: null }, // +4 dés résistance bombes (jet non tracké)
      { key: "discretion", name: "Discrétion", page: 247, effect: null }, // +2 dés défense contre pistage (jet non tracké)
      {
        key: "exploitation",
        name: "Exploitation",
        page: 247,
        effect: { attr: { sleaze: 2 } },
      }, // +2 Corruption (Hacker à la volée)
      {
        key: "filtre-de-biofeedback",
        name: "Filtre de biofeedback",
        page: 247,
        effect: null,
      }, // +2 dés résistance biofeedback (jet non tracké)
      { key: "fork", name: "Fork", page: 247, effect: null }, // 2 cibles/1 action (règle)
      {
        key: "furtivite",
        name: "Furtivité",
        page: 247,
        effect: { attr: { sleaze: 1 } },
      }, // +1 Corruption
      { key: "garde", name: "Garde", page: 247, effect: null }, // réduit les dégâts des marks (défense, jet non tracké)
      { key: "maquillage", name: "Maquillage", page: 247, effect: null }, // apparence des icônes (narratif)
      {
        key: "marteau",
        name: "Marteau",
        page: 247,
        effect: { dvByType: { attack: 2 } },
      }, // +2 cases de dégâts au Pic de données
      { key: "pistage", name: "Pistage", page: 248, effect: null }, // +2 limite TdD pour « traquer une icône » (action non modélisée)
      { key: "surveillance", name: "Surveillance", page: 248, effect: null }, // connaît son Score de Surveillance (narratif)
      { key: "verrouillage", name: "Verrouillage", page: 248, effect: null }, // verrouille la connexion sur dégât (règle)
    ],
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

  /** Archétype utilisé pour un spider (decker de sécurité lié à un serveur)
      — toujours le même en SR5. */
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
    Decker: (proRating) => [
      "Datajack",
      Utils.rand(
        EditionSR5.equipPools.cyberdecks[EditionSR5._deckTier(proRating)],
      ),
    ],
    Rigger: () => [
      "Câblage de contrôle de véhicules",
      "Console de commande rigger",
    ],
    // V2b : les 4 entrées Éveillées (Adepte/Mage hermétique/Chaman/Mage
    // Aztechnology) ont été retirées — mortes depuis toujours. `_isAwakened`
    // les classe TOUTES comme Éveillées (magSpecials), et generate() force
    // `augs = []` pour tout Éveillé AVANT même d'appeler ce producteur (le
    // ternaire ne l'évalue pas). Les supprimer ne change rien au résultat ;
    // le lookup retombe sur "Aucun" ci-dessous, dont le retour est de toute
    // façon jeté par ce même garde-fou.
    Technomancien: () => ["Renfort naturel"],
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
    // Cyberdecks p.439-441 (Att/Corr/TDD/FW) — mêmes paliers de prof que
    // commlinks (cf. _deckTier). Lu par Cyberdeck.parseLegacy à la génération.
    cyberdecks: {
      bas: [
        "Cyberdeck Erika MCD-1 (Att 4, Corr 3, TDD 3, FW 2)",
        "Cyberdeck Microdeck Summit (Att 2, Corr 2, TDD 3, FW 4)",
      ],
      moyen: [
        "Cyberdeck Hermes Chariot (Att 3, Corr 5, TDD 4, FW 3)",
        "Cyberdeck Novatech Navigator (Att 3, Corr 3, TDD 5, FW 4)",
      ],
      haut: [
        "Cyberdeck Renraku Tsurugi (Att 5, Corr 4, TDD 4, FW 3)",
        "Cyberdeck Sony CIY-720 (Att 4, Corr 3, TDD 5, FW 6)",
      ],
      elite: [
        "Cyberdeck Shiawase Cyber-5 (Att 5, Corr 4, TDD 6, FW 7)",
        "Cyberdeck Fairlight Excalibur (Att 8, Corr 6, TDD 5, FW 4)",
      ],
    },
    // Pistolets de poche p.427 (catégorie absente de la sélection initiale).
    pistoletsPoche: [
      "Fichetti Tiffani Needler [PRE 5, VD 8P(f), PA +5, SA, 4(c)]",
      "Streetline Special [PRE 4, VD 6P, PA —, SA, 6(c)]",
      "Walther Palm Pistol [PRE 4, VD 7P, PA —, CC/TR, 2(cb)]",
      "Fichetti Tiffani Self-Defender 2075 [PRE 4, VD 6P, PA —, CC, 4(c)]",
      "Revolver Colt New Model [PRE 6, VD 4P, PA —, SA, 5(b)]",
    ],
    pistoletsLegers: [
      "Fichetti Security 600 [PRE 6(7), VD 7P, PA —, SA, 30(c)]",
      "Colt America L36 [PRE 7, VD 7P, PA —, SA, 11(c)]",
      "Ares Light Fire 75 [PRE 6(8), VD 6P, PA —, SA, 16(c), smartgun]",
      "Ares Light Fire 70 [PRE 7, VD 6P, PA —, SA, 16(c)]",
      "Beretta 201T [PRE 6, VD 6P, PA —, SA, 21(c), crosse détachable]",
      "Taurus Omni-6 [PRE 5(6), VD 6P/7P, PA 0/-1, SA/CC, 6(cy), visée laser]",
      "Colt Agent Special [PRE 5, VD 8P, PA —, SA, 8(c)]",
      "Fichetti Executive Action [PRE 6, VD 7P, PA —, SA, 18(c)]",
      "Nitama Sporter [PRE 6(7), VD 6P, PA —, SA, 5(c)]",
      "Shiawase Arms Puzzler [PRE 4, VD 6P, PA —, SA, 12(c)]",
    ],
    pistoletsLourds: [
      "Ares Predator V [PRE 5(7), VD 8P, PA -1, SA, 15(c), smartgun]",
      "Browning Ultra-Power [PRE 5(6), VD 8P, PA -1, SA, 10(c)]",
      "Colt Government 2066 [PRE 6, VD 7P, PA -1, SA, 14(c)]",
      "Ruger Super Warhawk [PRE 5, VD 9P, PA -2, CC, 6(b)]",
      "Remington Roomsweeper [PRE 4, VD 7P, PA -1, SA, 8(m)]",
      "Ares Viper Slivergun [PRE 4, VD 9P(f), PA +4, SA/TR, 30(c), silencieux intégré]",
      "Cavalier Deputy [PRE 6, VD 7P, PA -1, SA, 7(b)]",
      "Colt Future Frontier [PRE 6, VD 8P, PA -1, CC, 7(b)]",
      "Cavalier Deputy [PRE 6, VD 7P, PA -1, SA, 7 (b)]",
      "Colt Future Frontier [PRE 5, VD 8P, PA -1, CC, 7 (b)]",
      "Onotari Arms Violator [PRE 5 (7), VD 7P, PA -1, SA, 10 (c)]",
      "Pistolet Lourd Pliant PSK-3 [PRE 4, VD 8P, PA -1, SA, 10 (c)]",
      "Pistolet Lourd Pliant PSK-3 v2 [PRE 5 (7), VD 7P, PA -1, SA, 10 (c)]",
      "Savalette Guardian [PRE 5 (7), VD 8P, PA -1, SA, 12 (c)]",
    ],
    mitraillettes: [
      "HK-227 [PRE 5(7), VD 7P, PA —, SA/TR/TA, 28(c), smartgun, silencieux]",
      "Ceska Black Scorpion [PRE 5, VD 6P, PA —, SA/TR, 35(c)]",
      "Colt Cobra TZ-120 [PRE 4(5), VD 7P, PA —, SA/TR/TA, 32(c)]",
      "HK Urban Combat [PRE 7(9), VD 8P, PA —, SA/TR/TA, 36(c)]",
      "Ingram Smartgun X [PRE 4(6), VD 8P, PA —, TR/TA, 32(c)]",
      "FN P93 Praetor [PRE 6, VD 8P, PA —, SA/TR/TA, 50(c), lampe torche]",
      "SCK Model 100 [PRE 5(7), VD 8P, PA —, SA/TR, 30(c), smartgun, crosse pliable]",
      "Uzi IV [PRE 4(5), VD 7P, PA —, TR, 24(c), crosse pliable, visée laser]",
      "Ares Crusader II [PRE 5(7), VD 7P, PA —, SA/TR, 40(c), smartgun]",
      "Steyr TMP [PRE 4(5), VD 7P, PA —, SA/TR/TA, 30(c), visée laser]",
      "Cavalier Evanator [PRE 5 (6), VD 6P, PA —, TR/TA, 20 (c)]",
      "Fianchetti Military 100 [PRE 5 (7), VD 6P, PA —, SA/TR/TA, 20 (c)]",
      "Onotari Arms Equalizer [PRE 4 (5), VD 7P, PA —, TR/TA, 12 (c)]",
      "Pistolet Mitrailleur Pliant PPSK-4 [PRE 5 (6), VD 6P, PA —, SA/TR, 30 (c)]",
      "Remington Suppressor [PRE 6, VD 7P, PA -1, SA/TR, 15 (c)]",
      "Ares Executioner [PRE 4 (6), VD 7P, PA —, SA/TR/TA, 30 (c)]",
      "Ultimax 70 [PRE 5 (6), VD 6P, PA —, TR/TA, 15 (c)]",
      "Ares Sigma-3 [PRE 4 (6), VD 8P, PA —, SA/TR/TA, 50 (t)]",
      "Cavalier Arms Gladius [PRE 3 (4), VD 7P, PA —, TR/TA, 32 (c)]",
      "HK Urban Combat [PRE 7 (9), VD 8P, PA —, SA/TR/TA, 36 (c)]",
      "Krime Spree [PRE 4, VD 7P, PA —, TA, 30 (c)]",
    ],
    fusilsAssaut: [
      "Ares Alpha [PRE 5(7), VD 11P, PA -2, SA/TR/TA, 42(c), lance-grenades]",
      "AK-97 [PRE 5, VD 10P, PA -2, SA/TR/TA, 38(c)]",
      "Colt M23 [PRE 4, VD 9P, PA -2, SA/TR/TA, 40(c)]",
      "FN HAR [PRE 5(6), VD 10P, PA -2, SA/TR/TA, 35(c)]",
      "HK XM30 [PRE 6(8), VD 9P, PA -2, SA/TR/TA, 30(c)]",
      "Yamaha Raiden [PRE 6(8), VD 11P, PA -2, TR/TA, 60(c), smartgun, silencieux]",
      "AK-98 [PRE 5 (7), VD 10P, PA -2, SA/TR/TA, 38 (c)]",
      "Ares HVAR [PRE 5 (7), VD 8P, PA —, SA/TR/TA, 50 (c)]",
      "Colt Inception [PRE 7 (8), VD 10P, PA -1, SA/TR, 35 (c)]",
      "HK XM30 - Carabine [PRE 6 (8), VD 9P, PA -2, SA/TR/TA, 30 (c)]",
      "HK XM30 - Fusil [PRE 5 (7), VD 8P, PA -2, SA/TR/TA, 30 (c)]",
      "HK XM30 - Mitrailleuse légère [PRE 6 (8), VD 9P, PA -2, TR/TA, 30 (c)]",
      "HK XM30 - Shotgun [PRE 3 (5), VD 10P, PA -1, SA, 10 (c)]",
      "HK XM30 - Lance-grenades [PRE 4, VD *, PA —, CC, 6 (m)]",
      "Krupp Arms Kriegfaust [PRE 8, VD 9P, PA -1, SA/TR, 25 (t)]",
      "Nitama Optimum II [PRE 5 (7), VD 9P, PA -2, SA/TR/TA, 30 (c)]",
      "Nitama Optimum II - Shotgun [PRE 4 (6), VD 10P, PA -1, SA, 5 (m)]",
      "Carabine Ultimax Rain Forest [PRE 7, VD 14P, PA -4, SA, 18 (c)]",
      "SBD-44 [PRE 3, VD 10P, PA -1, SA/TR/TA, 32 (c)]",
      "Shiawase Arms Monsoon [PRE 5 (7), VD 10P, PA -1, SA/TA, 20 (cn)×6]",
    ],
    // Fusils à pompe (absents de la sélection initiale, p.429).
    shotguns: [
      "Defiance T-250 [PRE 4, VD 10P, PA -1, CC/SA, 5(m)]",
      "Enfield AS-7 [PRE 4(5), VD 13P, PA -1, SA/TR, 10(c) ou 24(t), visée laser]",
      "PJSS Model 55 [PRE 6, VD 11P, PA -1, CC, 2(cb)]",
      "Auto-Assault 16 [PRE 4, VD 13P, PA -1, SA/TR/TA, 10 (c) ou 32 (t)]",
      "Cavalier Falchion [PRE 5 (7), VD 12P, PA -1, SA/TR, 8 (m)]",
      "Franchi SPAS-24 [PRE 4 (6), VD 12P, PA -1, SA/TR, 10 (c)]",
      "Krime Boss [PRE 3, VD 13P, PA -1, SA, 15 (t)]",
      "Mossberg AM-CMDT [PRE 5 (7), VD 12P, PA -1, SA/TR/TA, 10 (c)]",
      "Remington 990 [PRE 4, VD 11P, PA -1, SA, 8 (c)]",
      "Shiawase Arms Rain [PRE 4, VD 10P, PA -1, SA, 5 (cn)]",
      "Winchester Model 201 [PRE 8, VD 11P, PA -1, SA, 2 (cb)]",
      "Winchester Model 2054 [PRE 4 (5), VD 11P, PA -1, SA, 7 (m)]",
      "Winchester Model 2066 [PRE 8, VD 11P, PA -1, CC, 5 (m)]",
    ],
    // Mitrailleuses lourdes (absentes de la sélection initiale, p.430).
    mitrailleuses: [
      "Ingram Valiant [PRE 5(6), VD 9P, PA -2, TR/TA, 50(c) ou 100(bande), visée laser]",
      "Stoner-Ares M202 [PRE 5, VD 10P, PA -3, TA, 50(c) ou 100(bande)]",
      "RPK HMG [PRE 5, VD 12P, PA -4, TA, 50(c) ou 100(bande)]",
      "GE Vindicator Minigun [PRE 4 (6), VD 9P, PA -4, TA, 100 ou 200 (bande)]",
      "Krime Wave [PRE 5, VD 10P, PA -2, TA, 50 (c) ou 100 (bande)]",
      "SA Nemesis [PRE 5 (7), VD 9P, PA -2, TR/TA, 50 (c) ou 100 (bande)]",
      "FN MAG-5 [PRE 4 (5), VD 11P, PA -3, TA, 50 (c) ou 100 (bande)]",
      "Ultimax MMG [PRE 5 (6), VD 10P, PA -2, TR/TA, 50 (c) ou 100 (bande)]",
      "Ruhrmetall SF-20 [PRE 5 (6), VD 12P, PA -4, TA, 50 (c) ou 100 (bande)]",
      "Ultimax HMG-2 [PRE 4 (5), VD 11P, PA -4, TA, 50 (c) ou 100 (bande)]",
    ],
    snipers: [
      "Ares Desert Strike [PRE 7, VD 13P, PA -4, SA, 14(c)]",
      "Ranger Arms SM-5 [PRE 8, VD 14P, PA -5, SA, 15(c), silencieux]",
      "Remington 950 [PRE 7, VD 12P, PA -4, CC, 5(m)]",
      "Onotari JP-K50 [PRE 7, VD 12P, PA -3, SA/TR, 25(c)]",
      "Cavalier Arms Crockett EBR [PRE 6, VD 12P, PA -3, SA/TR, 20(c)]",
      "Ruger 101 [PRE 6, VD 11P, PA -3, SA, 8(m), lunette de visée intégrée]",
      "Barret Model 122 [PRE 7 (9), VD 14P, PA -6, SA, 14 (c)]",
      "M1 Garand [PRE 5, VD 12P, PA -1, SA, 8 (c)]",
      "Marlin 3041 BL [PRE 5, VD 10P, PA -3, SA, 6 (m)]",
      "Marlin 3468SS [PRE 4, VD 13P, PA -1, CC, 4 (m)]",
      "Marlin 79S [PRE 4, VD 6P, PA —, SA, 10 (c)]",
      "Marlin X71 [PRE 5, VD 12P, PA -4, CC, 5 (m)]",
      "Onotari Arms JP-K50 [PRE 7, VD 12P, PA -3, SA/TR, 25 (c)]",
      "Pioneer 60 [PRE 5, VD 9P, PA —, SA, 10 (c)]",
      "Springfield 2003 [PRE 9, VD 12P, PA -2, CC, 5 (m)]",
      "Springfield M1A [PRE 6, VD 12P, PA -1, SA, 20 (c)]",
      "Springfield Reproduction du Model 1855 [PRE 2, VD 10P, PA —, CC, 1 (ca)]",
      "Terracotta Arms AM-47 [PRE 7 (9), VD 15P, PA -4, SA, 18 (c)]",
      "Winchester Model 2024 [PRE 6, VD 12P, PA —, SA, 7 (m)]",
      "Winchester Model 2067 [PRE 5, VD 8P, PA -1, SA, 15 (m)]",
    ],
    // Armes spéciales : lance-grenades/missiles + projectiles chimiques (p.431-433).
    armesSpeciales: [
      "Ares Antioch-2 [lance-grenades, PRE 4(6), VD selon grenade, CC, 8(m), smartgun]",
      "ArmTech MGL-12 [lance-grenades, PRE 4, VD selon grenade, SA, 12(c)]",
      "Aztechnology Striker [lance-missiles, PRE 5, VD selon missile, CC, 1(canon)]",
      "Onotari Interceptor [lance-missiles, PRE 4(6), VD selon missile, CC, 2(canon), smartgun]",
      "Ares S-III Super Squirt [projecteur chimique, PRE 3, VD produit chimique, SA, 20(c)]",
      "Fusil à fléchettes Parashield [PRE 6, VD comme drogue/toxine, SA, 6(m), lunette de visée]",
      "Pistolet à fléchettes Parashield [PRE 5, VD comme drogue/toxine, SA, 5(c)]",
      "Canon d'Assaut Ares Vigorous [PRE 4, VD 16P, PA -4, SA, 6 (c)]",
      "Canon d'Assaut Ogre Hammer SWS [PRE 4, VD 16P, PA -6, CC, 12 (c)]",
      "Fusil Gauss Ares Thunderstruck [PRE 7 (8), VD 15P, PA -8, SA, 10 (c) + Énergie]",
      "Krime Bomb [PRE 6 (7), VD 16P, PA -6, CC, 4 (m)]",
      "Mitsubishi Yakusoku MRL [PRE 2 × 2, VD 20P, PA selon missile, SA/TR, selon missile]",
      "Onotari Arms Ballista MML [PRE CC, VD selon missile, PA selon missile, CC, 4 (m)]",
      "Ares Redline [PRE 9, VD 14P, PA -10, SA, 10 (c) ou source externe]",
      "Ares Lancer MP Laser [PRE 7, VD 7P, PA -10, SA, 2 × 10 (c) ou source externe]",
    ],
    // Armes à distance exotiques (Run & Gun, absentes du livre de base).
    armesExotiques: [
      "Bolas - Modèle Standard [PRE Phys, VD [FOR+3]E, PA +4, 6]",
      "Bolas - Monofilament [PRE Phys, VD [FOR+3]E/12P, PA +4/-8, 18P]",
      "Ares Shocknet (Bolas) [PRE Phys -2, VD 6E[e], PA —]",
      "Bracelet Pistolet [PRE 6[d], VD 7P, PA —, CC, 1(c)]",
      "Fusil Sonique Ares Screech [PRE 9, VD —, PA —, CC, —, 10[é]]",
      "Canne Pistolet Trafalgar [PRE 6, VD 7P, PA —, CC, 1(cb)]",
      "Canne Pistolet Contrefaite [PRE 5, VD 9P, PA —, CC, —]",
      "Lance-Filet - Modèle Standard [PRE 5, VD —, PA —, CC, 4(cb), 9, 750/]",
      "Lance-Filet - Modèle XL [PRE 5, VD —, PA —, CC, 2(cb), 9, 1000/]",
      "Shocknet [PRE flexible, VD 6E[e], PA -5, flexible, flexible, 10R, +]",
      "Pistolet FN-AAL Gyrojet [PRE 5, VD 10P, PA -2, SA, 10(c), 12P]",
      "Sarbacane [PRE 8, VD 1P, PA —, CC, 1(canon), 4]",
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
      "Bâton [PRE 6, VD (FOR+3)P]",
      "Nerf-de-bœuf [PRE 5, VD (FOR+2)E]",
      "Arme d'hast [PRE 5, Allonge 2, VD (FOR+3)P, PA -2]",
      "Couteau de survie [PRE 5, VD (FOR+2)P, PA -1, sans fil]",
      "Lames d'avant-bras [PRE 4, VD (FOR+2)P, PA -2, sans fil]",
      "Fouet monofilament [PRE 5(7 sans fil), Allonge 2, VD 12P, PA -8]",
      "Poing américain [VD (FOR+1)P]",
      "Arbalète légère [PRE 7, VD 5P, CC, 4(m)]",
      "Arbalète moyenne [PRE 6, VD 7P, PA -1, CC, 4(m)]",
      "Arbalète lourde [PRE 5, VD 10P, PA -3, CC, 4(m)]",
      "Arc [PRE 6, VD (indice+2)P, PA -(indice/4), CC]",
      "Couteaux de lancer / Shurikens [VD (FOR+1)P, PA -1]",
      "Masse d'osmium (Le Complete Trog, p.185) [VD (FOR+4)P, Allonge 2, PA -1, réservée trolls/orks forts]",
      "Claymore « Highland Forge » [PRE 5, ALLONGÉ 2, VD [FOR+5]P, PA -5]",
      "Cougar Fineblade - Lame Courte [PRE 7, VD [FOR+2]P, PA -1]",
      "Cougar Fineblade - Lame Longue [PRE 7, VD [FOR+3]P, PA -1]",
      "Épée Monofilament Ares « One » [PRE 5, ALLONGÉ 1, VD [FOR+3]P, PA -3]",
      "Lame à Mémoire Victorinox [PRE 5, ALLONGÉ 1, VD [FOR+2]P, PA -2]",
      "Dague [PRE 5, VD [FOR+1]P, PA -2]",
      "Rapière Horizon-Flynn [PRE 7, ALLONGÉ 1, VD [FOR+2]P, PA -3]",
      "Bâton Étourdissant Nemesis [PRE 6, ALLONGÉ 2, VD 3[Et(e)], PA —]",
      "Fouet [PRE 6, ALLONGÉ 2, VD [FOR+1]P, PA +3, 6]",
      "Garrot Standard [PRE 5, VD [FOR+4]E, PA -6, —]",
      "Garrot Monofilament [PRE 5, VD [FOR+0]P, PA -8, 18P]",
      "Tronçonneuse de Combat [PRE 5, ALLONGÉ 1, VD 8P, PA -4]",
      "Tronçonneuse Monofilament [PRE 5, ALLONGÉ 1, VD 12P, PA -8]",
      "Tronçonneuse de Combat Ash Arms [PRE 5, ALLONGÉ 1, VD 8P, PA -4]",
      "Tronçonneuse Monofilament Ash Arms [PRE 5, ALLONGÉ 1, VD 12P, PA -8]",
      "Bouteille (entière) [PRE 3, VD [FOR+1]E, PA —]",
      "Bouteille (brisée, après 1er coup) [PRE 3, VD [FOR]P, PA —]",
      "Chaîne (version 1) [PRE 4, ALLONGÉ 2, VD [FOR+1]P, PA —]",
      "Chaîne (version 2) [PRE 3, ALLONGÉ 1, VD [FOR+2]E, PA —]",
      "Crosse de Fusil [PRE 3, VD [FOR+3]P, PA —]",
      "Fourchette [PRE 4, VD [FOR-1]P, PA +1]",
      "Poêle à Frire [PRE 3, VD [FOR+1]P, PA —]",
      "Marteau [PRE 3, ALLONGÉ 1, VD [FOR-1]P, PA -1/2²]",
      "Masse [PRE 3, ALLONGÉ 2, VD [FOR+4]P, PA —, 1]",
      "Pistolets [PRE 4, VD [FOR+1]P, PA —]",
      "Queue de Billard [PRE 4, VD [FOR]P, PA —]",
      "Arbalète de Poing Ranger Sliver [PRE 7, VD 4P, PA —, CC]",
      "Fronde Ares Giantslayer [PRE 7, VD 2P, PA —, CC]",
      "Lance-Harpon Standard [PRE 5, VD 9P, PA -2, CC, 1(m)]",
      "Lance-Harpon Aquadyne Shark-XS [PRE 5, VD 9P, PA -2, CC, —]",
      "Boomerang - Modèle Standard [PRE Phys -1, VD [FOR+2]P, PA —, 4]",
      "Boomerang - Horizon BoomEye [PRE Phys -1, VD —, PA —, 4]",
      "Filet - Modèle Standard [PRE Phys -2, VD —, PA —, 6]",
      "Filet - Terracotta Shrednet [PRE Phys -2, VD 4P, PA —]",
      "Filet - Ares Shocknet [PRE Phys -2, VD 6E[e], PA —]",
      "Harpon/Javelot [PRE Phys +1, VD [FOR+2]P, PA -1, 4]",
      "Tomahawk Urban Tribe [PRE Phys +1, VD [FOR+2]P, PA -1, 4]",
    ],
    electroarmes: [
      "Électromatraque [VD 9E(e), PA -5, Allonge 1, 10 charges]",
      "Defiance EX Shocker [Taser, VD 9E(e), PA -5, CC, 4(m)]",
      "Électro-gants [VD 8E(e), PA -5]",
      "Bâton étourdissant Nemesis Arms Maul [PRE 6, Allonge 2, VD 9E(e), PA -5]",
      "Yamaha Pulsar [Taser, PRE 5, VD 7E(e), PA -5, SA, 4(m), sans fil]",
      "Cavalier Safeguard [PRE 5(6), VD 6E(e), PA -5, SA, 6(m), —]",
      "Tiffani-Defiance Protector [PRE 5(6), VD 7E(u), PA -5, SA, 3(m), 2]",
    ],
    // Foci magiques (SR5 p.318) — pools du slot `focus` du générateur (Éveillés
    // uniquement). Libellés de BASE ; l'indice est apposé à la génération
    // (« … (indice N) »), adossé au professionnalisme. Motorisés : les foci
    // caster via SkillEffects (+ Magic.actionPool), le focus d'arme via
    // WeaponEffects (réserve d'attaque en mêlée). Non listés dans _equipLabels
    // → hors sélecteur « ＋ Catalogue » (générateur seulement).
    fociCaster: [
      "Focus d'incantation",
      "Focus de contresort",
      "Fétiche de conjuration",
      "Focus de puissance",
    ],
    fociAdepte: ["Focus d'arme", "Focus de puissance"],
    armures: {
      legere: [
        "Veste pare-balles [9]",
        "Armure légère [12]",
        "Manteau renforcé [9]",
        "Vêtements pare-balles [6]",
        "Gilet pare-balles [9]",
        "Costume Armanté [8]",
        "Robe Armanté [8]",
        "Costume Berwick [9]",
        "Robe Berwick [8]",
        "Costume Crimson Sky [8]",
        "Costume Summit [8]",
        "Robe Summit [7]",
        "Ace of Cups [9]",
        "Ace of Swords [7]",
        "Ace of Wands [6]",
        "Ace of Coins [7]",
        "Ace of Spades [7]",
        "Ace of Clubs [7]",
        "Ace of Hearts [7]",
        "Ace of Diamonds [8]",
        "Synergist Business Line [9]",
        "Heritage [4/6/8/10/12]",
        "Nightshade/Moonsilver [7]",
        "Second Skin [6/+2]",
        "Gilet Globetrotter [9]",
        "Vêtements Globetrotter [7]",
        "Industrious [9]",
        "Rapid Transit [9]",
        "Armure moulante corporelle [8]",
        "Combinaison de moto de course [8]",
        "Combinaison de pompier [6]",
        "Armure corporelle en sac [8]",
        "Cotte de mailles [8]",
        "Armure rembourrée en cuir [7]",
      ],
      moyenne: [
        "Armure corporelle [12]",
        "Veste blindée [12]",
        "Combinaison de sécurité [13]",
        "Costume Actioneer [8]",
        "Combinaison Urban Explorer [9]",
        "Combinaison caméléon [9]",
        "Manteau Greatcoat [10/+3]",
        "Manteau Ulysses [10/+3]",
        "Manteau Argentum [12/+4]",
        "Steampunk [10]",
        "Manteau Long Synergist Business Line [10/+3]",
        "Sleeping Tiger [13]",
        "Executive Suite [12]",
        "Veste Globetrotter [12]",
        "Wild Hunt [12]",
        "Big Game Hunter [14]",
        "Armure anti-émeutes [14]",
      ],
      lourde: [
        "Armure corporelle intégrale [15]",
        "Armure corporelle intégrale + Casque [15+3]",
        "Armure lourde [16]",
        "Armure militaire renforcée légère [15]",
        "Armure militaire renforcée moyenne [18]",
        "Armure militaire renforcée lourde [20]",
        "Armure de sécurité légère [15]",
        "Armure de sécurité moyenne [18]",
        "Armure de sécurité lourde [20]",
        "Armure SWAT [15]",
      ],
      militaire: [
        "Armure corporelle intégrale [15] + Casque [+3] + Isolation chimique",
        "Armure militaire EVO [17] + Casque intégral",
      ],
      // Casques/boucliers p.440 : s'ajoutent à l'indice d'armure corporelle,
      // pas une catégorie séparée dans le sélecteur (aplatis avec le reste).
      accessoires: [
        "Casque [+2 à +3]",
        "Bouclier anti-émeutes [+6]",
        "Bouclier balistique [+6]",
        "Chemise blindée signature Rockblood (Le Complete Trog, p.187) [8]",
        "Casque armure militaire [+3]",
        "Casque armure de sécurité [+3]",
        "Casque moto de course [+2]",
        "Casque pompier [+2]",
        "Casque anti-émeutes [+2]",
        "Casque SWAT [+3]",
        "Kit SecureTech PPP pour bras [+1]",
        "Kit SecureTech PPP pour jambes [+1]",
        "Kit SecureTech PPP pour organes vitaux [+1]",
        "Ares FlaShield [+6]",
      ],
    },
    grenades: [
      "Grenade à fragmentation [VD 16P, Souffle 3m]",
      "Grenade fumigène [Souffle 10m de rayon]",
      "Grenade fumigène thermique [Souffle 10m de rayon]",
      "Grenade à plasma [VD 14P]",
      "Grenade flash-bang [VD 8S, Aveuglement]",
      "Grenade gaz [chimique, Souffle 10m]",
      "Grenade hautement explosive [VD 16P, Souffle -2/m]",
    ],
    // Explosifs p.438 (indice = disponibilité/puissance selon quantité).
    explosifs: [
      "Explosifs civils [Indice 5]",
      "Mousse explosive [Indice 6-25]",
      "Plastic [Indice 6-25]",
      "Détonateur",
    ],
    cyberware: [
      "Réflexes câblés 1 [+1D6 initiative, +1 passe]",
      "Réflexes câblés 2 [+2D6 initiative, +2 passes]",
      "Accroissement de réaction (+1 REA)",
      "Tonification musculaire (+1 AGI)",
      "Yeux cybernétiques [Indice 2, smartlink, vision nocturne]",
      "Yeux cybernétiques [Indice 3, compensation antiflash, vision thermique]",
      "Oreilles cybernétiques [Indice 2, filtre de son]",
      "Bras cybernétique [FOR +2 à bras]",
      "Armure dermique (+1 armure)",
      "Datajack [connexion directe commlink]",
      // Céphaloware (p.454-456)
      "Amplificateur gustatif [Indice 1-6, bonus Perception (goût)]",
      "Amplificateur olfactif [Indice 1-6, bonus Perception (odorat)]",
      "Bombe corticale (nano) [détruit un cyberware ciblé]",
      "Bombe corticale (micro) [tue le porteur]",
      "Câblage de contrôle de véhicules [Indice 1-3, bonus Pilotage à distance]",
      "Compartiment dentaire [stockage minuscule dissimulé]",
      "Cyberdeck implanté [hacking mobile]",
      "Datalock [Indice 1-12, coffre-fort numérique implanté]",
      "Modulateur vocal [Indice 1-6, imitation de voix, bonus Imposture]",
      "Senseur à ultrasons [Indice 1-6, sonar actif/passif]",
      "Skilljack [Indice 1-6, compétences logicielles implantées]",
      // Implants oculaires (p.456-458)
      "Amplification visuelle [Indice 1-3, portée/clarté]",
      "Compensation antiflash [protection contre éclairs]",
      "Drone oculaire [spyball implanté, contrôlable à distance]",
      "Vision thermographique [cyberyeux]",
      "Vision nocturne [cyberyeux]",
      // Auriculoware (p.458-459)
      "Oreilles cybernétiques [Indice 1-4, remplacement auditif]",
      "Amplification auditive [Indice 1-3, portée accrue]",
      "Amortisseur sonore [protection bruit excessif]",
      "Filtre sonore sélectif [Indice 1-6, bonus Perception (ouïe)]",
      // Somatoware (p.459-460)
      "Blindage dermique [armure supplémentaire]",
      "Câblage de compétences [Indice 1-6, compétence implantée]",
      "Réservoir d'air interne [Indice 1-3, apnée prolongée]",
      "Substitut musculaire [Indice 1-4, bonus FOR]",
      "Synthétique dermique [peau de remplacement, armure bonus]",
      // Cybermembres (p.460-462)
      "Main/pied cybernétique [remplacement, apparent ou synthétique]",
      "Avant-bras cybernétique [remplacement, apparent ou synthétique]",
      "Bras entier cybernétique [remplacement, apparent ou synthétique]",
      "Jambe entière cybernétique [remplacement, apparent ou synthétique]",
      "Cybermembre : Agilité [Indice 1-3, bonus AGI au membre]",
      "Cybermembre : Force [Indice 1-3, bonus FOR au membre]",
      "Cybermembre : Armure [Indice 1-3, armure = indice×5]",
      "Monture gyroscopique [bonus tir équivalent gyrostabilisateur 3]",
      "Vérin hydraulique [Indice 1-6, saut/sprint, réduit dégâts de chute]",
      // Armes cyber-implantées (p.462)
      "Griffes rétractables [VD (FOR+2)P, PA -2]",
      "Électro-main [VD 9E(e), PA -5]",
      "Pistolet de poche implanté [PRE 4(6), VD 6P, SA, 2(m)/6(c)]",
      "Pistolet lourd implanté [PRE 4(6), VD 7P, PA -1, SA, 8(m)/12(c)]",
      "Antenne [Essence 0.1, récepteur longues distances]",
      "Augmentation du spectre auditif [Essence 0.1, détection infrason/ultrasonic]",
      "Lampe oculaire [Essence 0.1, vision à portée 2m + lumière nocturne]",
      "Lentilles microscopiques [Essence 0.2, vision à 50x]",
      "Monture oculaire supplémentaire [Essence 0.2, +2 aux tests de surprise]",
      "Protections oculaires [Essence 0.1, armure +3 pour yeux]",
      "Yeux d'araignée [Essence 0.2, détection à 10m minimum]",
      "Système d'orientation [Essence 0.2, bonus +2 à Orientation]",
      "USP mathématique [Essence 0.1, bonus +4 à compétences scientifiques]",
      "Visualiseur [Essence 0.1, créer image mentale en 5 secondes]",
      "Senseur radar [Indice 1-4, détection obstacles/mouvements]",
      "Synthlink [Essence 0.1, interface instruments musicaux intelligents]",
      "Autoinjectoreur [Essence 0.05, administration de médicaments/drogues]",
      "Articulations intelligentes [Essence 0.5, Limite physique +2]",
      "Biomoniteur [Essence 0.1, suivi données de santé constant]",
      "Ancres de pied [Essence 0.25, bonus +1 à équilibre/escalade]",
      "Griffe d'escalade rétractiles [Essence 0.2, escalade facilitée]",
      "Interface tactile [Essence 0.1, sens tactile +2 pour tests Perception]",
      "Main flexible [Essence 0.15, compression/déformation mains]",
      "Neuro-stimulateur gastrique [Essence 0.2, immunité nausée/poison]",
      "Palmes cybernétiques [Essence 0.1, vitesse nage +150%]",
      "Pointeur laser [Essence 0.2, Précision d'arme +1]",
      "Queue balancier [Essence 0.25, Équilibre bonus +1]",
      "Routeur interne [Essence 0.7, système sans fil intégré]",
      "Système magnétique [Essence 0.25, Force de 6 pour soulever métal]",
      "Système move-by-wire [Indice 1-3, réflexes +1 à +3 selon indice]",
      "Membres modulaires connecteurs [Essence 0.35-1.3, configuration flexible]",
      "Corps liminaire [Essence 3.0, restructuration abdominale complète]",
      "Crâne cybernétique partiel [Essence 0.4, remplacement os du crâne]",
      "Doigts cybernétiques [Essence 0.05, configuration spécialisée]",
      "Doigts serpentiformes [Essence variable, articulations rotatives]",
      "Glisseurs [Essence variable, vitesse nage x2-3]",
      "Hydrojet [Essence variable, vitesse nage augmentée]",
      "Jambe de digitigrade [Essence variable, forme animale]",
      "Kit utilitaire intégré [Essence 0.45, outils spécialisés embarqués]",
      "Main grappin [Essence 0.45, lancer projectile ou grappin]",
      "Médikit intégré [Essence 0.45, kit médical embarqué]",
      "Branchies cybernétiques OXSYS [Essence 0.25, respiration aquatique]",
      "Compétence câblée [Indice variable, compétence active liée Matrix]",
      "Cran de sûreté cybernétique [—, freinage arme intégrée]",
      "Extension de stockage des excréments [Indice variable, stockage journée]",
      "Chipjack [Essence Indice 0.05, Capacité Indice x2, accès logiciels]",
      "Connaissance câblée [Essence Indice 0.05, Capacité Indice x4, savoir embarqué]",
      "Coprocesseur attentionnel [Essence 0.3, Limite mentale +1 à Perception]",
      "Enregistreur onrique [Essence 0.1, enregistrement rêves]",
      "Faux visage [Essence 0.5, apparence humanoïde modifiable]",
      "Camouflage vocal [Essence 0.1, voix modifiable +8P]",
      "Réduction de métaype [Essence 0.2, apparence humaine sans payer Karma]",
      "Tatouages LED [Essence petit/moyen/grand, affichage LEDs sous peau]",
      "Modification d'enveloppe [Essence variable, cybernétique personnalisée]",
      "Organes génitaux cybernétiques [Essence 0.25, configuration modulaire]",
    ],
    bioware: [
      "Augmentation de densité osseuse [Indice 1-4, bonus résistance dégâts]",
      "Défenses immunitaires optimisées [Indice 1-6, résistance maladies]",
      "Extracteur de toxines [Indice 1-6, réduit dégâts toxines]",
      "Filtre trachéal [Indice 1-6, protège gaz/pathogènes]",
      "Orthoderme [Indice 1-4, armure bonus]",
      "Phéromones optimisées [Indice 1-3, bonus Charisme social]",
      "Pompe à adrénaline [Indice 1-3, boost temporaire FOR/AGI/REA/VOL]",
      "Renforcement musculaire [Indice 1-4, bonus FOR]",
      "Symbiotes [Indice 1-4, bonus tests de guérison]",
      "Synthécarde [Indice 1-3, bonus Athlétisme cardio]",
      "Yeux de chat [vision nocturne naturelle]",
      "Amélioration mnémonique [Indice 1-3, bonus Connaissances]",
      "Booster cérébral [Indice 1-3, bonus LOG/INT]",
      "Booster synaptique [Indice 1, +1 REA, bonus initiative]",
      "Compensateur de dommages [Indice 1-12, récupération accélérée]",
      "Augmentation de densité musculaire [Indice 1-4, bonus dégâts à mains nues]",
      "Résistance aux drogues [réduit effets drogues/poisons]",
      "Modification d'enveloppe [—, chirurgie mineure/modérée/importante]",
      "Modification ethnique/changement de sexe [Essence —, restructuration faciale]",
      "Augmentation mammaire [Essence —, modification taille implants]",
      "Oreilles pointues [Essence —, modification esthétique]",
      "Peau de caméléon [Essence —, camouflage thermique/colorimétrique]",
      "Peau soyeuse [Essence —, aspect esthétique]",
      "Pigmentation dermique [Essence —, tatouages biologiques]",
      "Nouveaux cheveux [Essence —, croissance naturelle]",
      "Rucoloation des yeux [Essence —, coloration oculaire]",
      "Réduction du poids [Essence —, allègement corporel]",
      "Régimeware [Essence 0.1, métabolisme accéléré]",
      "Réduction de troll [Essence 0.2-0.5, réduction physique troll]",
      "Peau à chloroplastes [Essence 0.2, bonus +2 aux tests Survie]",
      "Peau sensible [Essence —, augmentation sensibilité tactile]",
      "Croissance capillaire [Essence —, croissance rapide cheveux]",
      "Métabolisme propre [Essence 0.1, système digestif optimisé]",
      "Amélioration de l'ouïe [Essence 0.1, +1 test Perception auditive]",
      "Articulations élastiques [Essence 0.2, Limite physique +1 en glisr espaces]",
      "Augmentation de spectre vocal [Essence 0.1-0.2, sons supplémentaires]",
      "Expansion du spectre auditif [Essence 0.1, détection 5-20kHz/200kHz]",
      "Bouclier rénal [Essence Indice, résistance drogues/poisons]",
      "Glande à soies d'araignée [Essence 0.3, soies projectiles]",
      "Glande chimique [Essence 0.1, production substances chimiques]",
      "Membrane nictitante [Essence 0.05, protection oculaire anti-flash]",
      "Phéromones de créatures optimisées [Essence Indice 1-3, influence animale]",
      "Réalignement spinal [Essence 0.1, traitement colonne vertébrale]",
      "Remplacement d'un membre [Essence 0.1-0.4, bras/jambe/main]",
      "Replacement d'articulations [Essence 0.05, restructuration osseuse]",
      "Sensibilité tactile [Essence 0.1, +2 tests Perception tactile]",
      "Système immunitaire amplifié [Essence Indice, résistance maladies]",
      "Volume respiratoire étendu [Essence Indice 1-4, résistance fatigue]",
      "Yeux de trolls [Essence 0.2, vision thermique]",
      "Croissance capillaire [Essence —, surface equivalent tête humaine]",
      "Accroissement de la neuro-rétention [Essence 0.1, mémoire photographique gratuite]",
      "Accroissement de traitement sensoriel [Essence 0.2, traitement données sensorielles]",
      "Cervelet amplifié [Essence —, amplification coordination]",
      "Réaction [hormone transgenique de stress]",
      "Qualia [hormone reptilienne - stimule cortex sensoriel]",
      "Pushed [protéine HyperDensité - augmente cellules]",
      "Pneumacité squelettique [résistance osseuse]",
      "Synch [protéine nootropique - perception/intuition]",
      "Vasocon [régule flux sanguin]",
      "Vision tétrachromatique [vision métamaine type cône]",
      "Adaptation à la chaleur [résiste dommages froid]",
      "Adaptation à la microgravité [résiste dégâts chutes/microgravité]",
      "Adaptation au froid [résiste dommages froid extrême]",
      "Cryotolélrance [ensemble modifications génétiques - résistance froid]",
      "Tolérance à la pollution [réduit dommages toxines chimiques]",
      "Tolérance aux radiations [réduit dommages radiations]",
      "Tolérance à l'hypoxie [retient souffle prolongé]",
      "Tolérance aux allergènes [réduit allergies]",
      "Immunisation [immunité complète une maladie/toxine]",
      "Altération transgenique [modifie phénotype]",
      "Optimisation d'accroissement de réaction [+1 Initiative]",
      "Optimisation de fixateur de réflexes [pas modifiateur supplémentaire]",
      "Optimisation de la pompe à adrénaline [retarde cortisol]",
      "Optimisation des réflexes câblés [réduit vitesse déclenchement]",
      "Optimisation du câblage de contrôle de véhicules [+1 Pilotage]",
      "Symbiose améliorée [améliore fonctionnement pancréas]",
      "Infusions génétiques [traitement génétique]",
      "Restauration génétique [guérison essence de l'expérience de vie]",
      "Extension de l'espérance de vie [augmente longévité]",
      "Guérison augmentée [plus rapide de 25%]",
      "Réparation cellulaire [traitement régénérant]",
      "Revitalisation [vitesse réaction essence]",
      "Vigeur physique [détection origine magnétique]",
    ],
    // Nanotechnologie (Chrome Flesh, absente du livre de base).
    nanotechnologie: [
      "Amplificateur d'interface de rigging [+modifiateur pour Pilotage de véhicules/drones]",
      "Antirad [réduit dommages radiations]",
      "Chasseur de nanites [détruit nanites actives]",
      "Nanodonnées [transporte données sensibles]",
      "Nanomarqueurs [marque/identifie nanites]",
      "Nanotatouages [afficheur d'images cutané programmable]",
      "Soigneur d'implant [répare implants endommagés]",
      "Amplificateur neuraux - Stimulateur d'apprentissage [améliore compréhension]",
      "Amplificateur neuraux - Limbique [modifiateur réflexes câblés]",
      "Amplificateur neuraux - Néocortical [améliore pensée abstraite]",
      "Amplificateur neuraux - Rappel [améliore mémoire]",
      "Antitoxine [réduit puissance toxines]",
      "Carcérande-plus [transporte drogue en sphères moléculaires]",
      "Cellules-O [réduit indices pathogènes viraux/bactériens]",
      "Nanosymbiótes [colonnes nanites spécialisées]",
      "Nantidotes [immunité toxines]",
      "Oxyrush [stabilise oxygène sanguin]",
      "Nanocybernétique [hybride nanoware/cyberware]",
      "Imitateur vocal [modifie voix du sujet]",
      "Nanoruche [implant de coordination/control]",
      "Peau intelligente [polymères intelligents pour camouflage]",
      "Système flash-back [sauvegarde souvenirs/stimulation mémoire]",
      "Alternapeau [couche réactive de nanites]",
      "Graveurs [inscrit permanemment sur os]",
      "Médikit Savior [soins nanométriques]",
      "Monofilaments [câbles super fins]",
      "Nanoscanner [détecte nanoware implanté]",
      "Nanospion [surveillance discrète]",
      "Nanocréme de maquillage [déguisement cosmétique]",
      "Corrosifs intelligents [nanites en solution chimique]",
      "Enduit universel [nanites en suspension]",
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
      // Gear général p.440-448 (hors commlinks/cyberdecks, déjà catalogués).
      "Binoculaires [zoom, accepte améliorations vision]",
      "Jumelles électroniques [zoom + améliorations vision]",
      "Lentilles de contact [sans fil, capacité réduite]",
      "Holo-projecteur [Indice 3, hologramme 5m]",
      "Lecteur biométrique [empreintes, rétinien, vocal, ADN]",
      "Liaison satellite [Indice 4, hors zones sans fil]",
      "Microphone subvocal [communication discrète, -4 détection]",
      "Simrig [enregistrement simsens]",
      "Marqueurs RFID standards [Indice 1, géomarquage]",
      "Marqueurs RFID de sécurité [Indice 3, blindés]",
      "Marqueurs RFID furtifs [Indice 3, mode silencieux]",
      "Démarqueur [destruction RFID]",
      "Brouilleur crânien [Indice 1-6, neutralise implants]",
      "Brouilleur de zone [Indice 1-6, sphérique]",
      "Brouilleur directionnel [Indice 1-6, cône 30°]",
      "Générateur de bruit blanc [Indice 1-6, masque les sons]",
      "Scanner de fréquence [détection 20m, mesure signal RF]",
      "Vêtements électrochromes [changement de couleur, indice variable]",
      "Caméra [photo/vidéo/tridéo + son]",
      "Caméra micro [Capacité 1, dissimulée]",
      "Jumelles optiques [zoom, sans amélioration électronique]",
      "Monocle [affichage unique, bandeau/chaîne]",
      "Électrodes [interface neurale directe, bandeau/filet/chapeau]",
      "Gants RA [interaction tactile augmentée, retour sensoriel]",
      "Imprimante [couleur, portable]",
      "Puces de données [stockage, transfert physique, Indice 1]",
      "Dérivateur de données [piratage de câble de communication]",
      "Atelier [van, réparations/constructions spécialisées]",
      "Installation [bâtiment, constructions avancées]",
      "Vêtements à retour haptique [feedback tactile RA]",
      "Grille d'antenne (Le Complete Trog, p.184) [Essence 0,1, double portée réseau sans fil]",
      "Chaise Meta pliante (Le Complete Trog, p.184) [ajustable morphologie troll/ork]",
      "Compartiment de corne (Le Complete Trog, p.184) [rangement discret dissimulé]",
      "Cordes renforcées (Le Complete Trog, p.185) [charge 600kg, standard/furtif/microcâble]",
      "Injecteur chimique portable [3 tailles de doses : 3 doses/500 nuyens, 5 doses/750 nuyens, 20 doses/2500 nuyens]",
      "Pharmacie quotidienne [contraceptifs, analgésiques, antihistaminiques]",
      "Préparation de drogues [accessoires de rue]",
      "Ensemble de drogues customisées [à faible, modéré ou haut coût]",
    ],
  },

  /* ---- Catalogue d'équipement (API neutre lue par EditModal) ----
     `_equipLabels` fixe l'ordre et les libellés lisibles des catégories du
     sélecteur « ＋ Catalogue » ; ItemResolver aplatit `equipPools` (dont les
     sous-listes commlinks/armures). Tout item du catalogue est une chaîne
     poussée telle quelle dans `pnj.equip` (les armes SR5 y vivent déjà). */
  _equipLabels: {
    commlinks: "Commlinks",
    cyberdecks: "Cyberdecks",
    pistoletsPoche: "Pistolets de poche",
    pistoletsLegers: "Pistolets légers",
    pistoletsLourds: "Pistolets lourds",
    mitraillettes: "Mitraillettes",
    fusilsAssaut: "Fusils d'assaut",
    shotguns: "Fusils à pompe",
    mitrailleuses: "Mitrailleuses",
    snipers: "Fusils de précision",
    armesSpeciales: "Armes spéciales",
    armesExotiques: "Armes exotiques",
    meleeWeapons: "Corps à corps",
    electroarmes: "Électro-armes",
    armures: "Armures",
    grenades: "Grenades",
    explosifs: "Explosifs",
    cyberware: "Cyberware",
    bioware: "Bioware",
    nanotechnologie: "Nanotechnologie",
    equipSpecial: "Équipement spécial",
  },
  equipCatalog() {
    return ItemResolver.flattenEquipPools(this.equipPools, this._equipLabels);
  },
  addCatalogItem(pnj, id) {
    ItemResolver.addEquipString(pnj, this.equipPools, id, this.AUGS_KEYS);
  },
  // #63 : clés du catalogue reconnues comme augmentation (routage affichage
  // « Augmentations », cf. ItemResolver.augItems) — donnée d'édition, pas
  // une branche.
  AUGS_KEYS: ["cyberware", "bioware", "nanotechnologie"],
  /** #66 : groupes métatype/métavariante pour le sélecteur d'édition PNJ
      (EditModal, `SingleSelect.create({groups})`), même source que le
      générateur (`Metavariants.pickerGroups`). */
  metaOptions() {
    return { groups: Metavariants.use("sr5").pickerGroups() };
  },
  /* Sorts/pouvoirs d'adepte : catalogues partagés (taxonomie commune aux
     4 éditions), source unique dans Content — cf. Content.spellCatalogFor. */
  spellCatalog() {
    return Content.spellCatalogFor(this.id);
  },
  addSpellItem(pnj, id) {
    Content.addSpellItem(pnj, this.id, id);
  },
  /* Formes complexes (T2) : même patron délégué que les sorts ci-dessus. */
  complexFormCatalog() {
    return Content.complexFormCatalogFor(this.id);
  },
  addComplexFormItem(pnj, id, attr) {
    Content.addComplexFormItem(pnj, this.id, id, attr);
  },
  powerCatalog() {
    return Content.powerCatalogFor(this.id);
  },
  addPowerItem(pnj, id) {
    Content.addPowerItem(pnj, this.id, id);
  },
  /* Métamagies/échos (P3/P4) : même patron délégué, catalogue partagé
     via Content.metamagics/echoes. */
  metamagicCatalog(includeAntagonist = false) {
    return Content.metamagicCatalogFor(this.id, includeAntagonist);
  },
  addMetamagicItem(pnj, id) {
    Content.addMetamagicItem(pnj, this.id, id);
  },
  echoCatalog(includeAntagonist = false) {
    return Content.echoCatalogFor(this.id, includeAntagonist);
  },
  addEchoItem(pnj, id) {
    Content.addEchoItem(pnj, this.id, id);
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

  /** Palier de matériel selon le professionnalisme — mêmes seuils que le
      tirage de commlink ci-dessous, réutilisé pour les cyberdecks. */
  _deckTier(proRating) {
    return proRating <= 1
      ? "bas"
      : proRating <= 3
        ? "moyen"
        : proRating <= 5
          ? "haut"
          : "elite";
  },

  /** true si `name` désigne une arme de mêlée du catalogue SR5 (utilisé par
      WeaponEffects pour gater le Focus d'arme). Détection par le pool
      `meleeWeapons` (base name) + repli sur la stat-line « Allonge » — jamais
      de liste d'armes en dur dans le moteur neutre. */
  isMeleeWeapon(name) {
    const base = String(name || "")
      .split(" [")[0]
      .trim()
      .toLowerCase();
    if (!base) return false;
    return (
      this.equipPools.meleeWeapons.some(
        (w) => String(w).split(" [")[0].trim().toLowerCase() === base,
      ) || /\ballonge\b/i.test(String(name))
    );
  },

  /* ----
     PROFIL DE LOADOUT (V2) — données d'affinage consommées par LoadoutEngine.
     Rareté (`tier`) : gate par proRating (chevauchement doux). Affinité
     (`tags`) : dérivée des rôles/milieux Coherence déjà portés par le PNJ.
     SIDECAR : les chaînes d'`equipPools` restent inchangées. Les pools
     SOUS-BUCKETÉS (commlinks/armures) sont exclus : déjà tierés par leurs
     sous-buckets dans buildLoadout.
  ---- */
  loadoutProfile: {
    proRatingBuckets: [
      [1, "grouille"],
      [2, "amateur"],
      [4, "pro"],
      [5, "vet"],
      [Infinity, "elite"],
    ],
    tierWeights: {
      grouille: { courant: 85, pro: 15, militaire: 0, blackops: 0 },
      amateur: { courant: 55, pro: 40, militaire: 5, blackops: 0 },
      pro: { courant: 25, pro: 55, militaire: 18, blackops: 2 },
      vet: { courant: 10, pro: 40, militaire: 42, blackops: 8 },
      elite: { courant: 5, pro: 25, militaire: 50, blackops: 20 },
    },
    tierByCat: {
      pistoletsPoche: "courant",
      pistoletsLegers: "courant",
      pistoletsLourds: "courant",
      mitraillettes: "pro",
      fusilsAssaut: "pro",
      shotguns: "pro",
      snipers: "militaire",
      mitrailleuses: "militaire",
      armesSpeciales: "militaire",
      armesExotiques: "militaire",
      meleeWeapons: "courant",
      electroarmes: "courant",
      grenades: "militaire",
      explosifs: "militaire",
      cyberware: "pro",
      bioware: "pro",
      nanotechnologie: "militaire",
      equipSpecial: "courant",
      fociCaster: "pro",
      fociAdepte: "pro",
    },
    // V4 — vérifié au livre (Shadowrun 5 - Livre de Règles + Run & Gun) :
    // valeurs de Dispo réelles cross-checkées ligne à ligne dans les tables
    // du chapitre équipement, pas des suppositions. Bandes D1 : courant≤6,
    // pro 7-11, militaire 12-17, blackops 18+.
    tierByItem: {
      "Fusil Gauss": "blackops", // Ares Thunderstruck, Run & Gun p.62 : Dispo 24 — CONFIRMÉ
      "Ares Lancer MP Laser": "blackops", // Run & Gun p.64 : Dispo 18 — CONFIRMÉ (à la limite)
      "Ares Redline": "militaire", // Run & Gun p.64 : Dispo 14 — CORRIGÉ (était blackops, deviné avant vérif)
      Monofilament: "militaire",
      Katana: "pro", // Livre de Règles p.421 : Dispo 9R — CONFIRMÉ
      "AK-97": "courant", // Livre de Règles p.427 : Dispo 4R — le fusil d'assaut de base est bien plus
      // répandu que la catégorie fusilsAssaut (pro) ne le laisse supposer par défaut.
      Fétiche: "courant",
      "Focus de puissance": "militaire",
    },
    tagsByCat: {
      meleeWeapons: ["melee", "adepte", "gang"],
      electroarmes: ["nonlethal", "police", "securite_corpo"],
      snipers: ["sniper", "militaire"],
      mitrailleuses: ["heavy", "militaire"],
      armesSpeciales: ["heavy", "militaire"],
      fusilsAssaut: ["combattant"],
      pistoletsPoche: ["holdout", "stealth"],
      pistoletsLegers: ["holdout"],
      fociCaster: ["magical", "mage", "chamane"],
      fociAdepte: ["magical", "adepte"],
      nanotechnologie: ["militaire"],
    },
    affinity: {
      combattant: {
        tags: { combattant: 3 },
        cats: { fusilsAssaut: 2, pistoletsLourds: 2 },
      },
      adepte: { tags: { melee: 4, magical: 3 }, cats: { meleeWeapons: 3 } },
      mage: { tags: { magical: 4, mage: 3 } },
      chamane: { tags: { magical: 4, chamane: 3 } },
      infiltrateur: { tags: { stealth: 4, holdout: 3 } },
      social: { tags: { holdout: 2 } },
      militaire: { tags: { heavy: 4, sniper: 3, militaire: 3 } },
      police: { tags: { nonlethal: 4, police: 3 }, cats: { electroarmes: 4 } },
      securite_corpo: { tags: { nonlethal: 2 }, cats: { electroarmes: 2 } },
      gang: { tags: { melee: 3, holdout: 2, gang: 2 } },
      crime: { tags: { holdout: 2, melee: 2 } },
      ombres: { tags: { stealth: 2, holdout: 2 } },
    },
  },

  buildLoadout(archetype, proRating, special, role, milieu) {
    const p = proRating;
    const pools = this.equipPools;
    const awakened = this._isAwakened(archetype, special);
    const profile = this.loadoutProfile;
    const ctx = { proRating: p, role, milieu, archetype, special, awakened };
    // Tire un item pondéré (rareté × affinité) dans une ou plusieurs catégories
    // PLATES d'equipPools. Remplace `Utils.rand(pool)`.
    const pick = (cats) =>
      LoadoutEngine.weightedPick(
        LoadoutEngine.gatherCandidates(pools, cats),
        ctx,
        profile,
      );

    // Commlink / armure : pools SOUS-BUCKETÉS, déjà tierés par prof — inchangés.
    const commlink =
      p <= 1
        ? Utils.rand(pools.commlinks.bas)
        : p <= 3
          ? Utils.rand(pools.commlinks.moyen)
          : p <= 5
            ? Utils.rand(pools.commlinks.haut)
            : Utils.rand(pools.commlinks.elite);
    const armure =
      p <= 1
        ? Utils.rand(pools.armures.legere)
        : p <= 3
          ? Utils.rand(pools.armures.moyenne)
          : p <= 5
            ? Utils.rand(pools.armures.lourde)
            : Utils.rand(pools.armures.militaire);

    // Arme principale : tout l'éventail à distance. La matrice de rareté
    // (proRating→tier) + l'affinité (militaire→heavy/sniper) remplacent les
    // anciens seuils de prof ET la liste `isHeavy` en dur.
    const primaryWeapon = pick([
      "pistoletsPoche",
      "pistoletsLegers",
      "pistoletsLourds",
      "mitraillettes",
      "fusilsAssaut",
      "shotguns",
      "snipers",
      "mitrailleuses",
      "armesSpeciales",
    ]);

    const result = [commlink, primaryWeapon];
    result.push("Mains nues [Allonge —, VD (FOR)E, PA —]");

    // Arme secondaire (aléa d'arsenal) — pistolets/mêlée, via le moteur.
    const secondaryWeapon = pick([
      "pistoletsLegers",
      "pistoletsLourds",
      "meleeWeapons",
    ]);
    if (
      Utils.randBool(0.6) &&
      secondaryWeapon &&
      secondaryWeapon !== primaryWeapon
    ) {
      result.push(secondaryWeapon);
    }

    // Arme de mêlée : l'affinité de rôle/milieu (adepte, gang, crime organisé)
    // remplace l'ancienne liste `melee` en dur.
    const meleeAffinity =
      role === "adepte" || milieu === "gang" || milieu === "crime";
    if (meleeAffinity || Utils.randBool(0.4))
      result.push(pick(["meleeWeapons"]));

    // Électromatraque : l'affinité police/sécu remplace la liste `police`.
    const policeLike = milieu === "police" || milieu === "securite_corpo";
    if (policeLike) result.push(pick(["electroarmes"]));

    // Armure
    result.push(armure);

    // Grenades : prof 4+
    if (p >= 4 && Utils.randBool(0.5)) result.push(pick(["grenades"]));

    // Cyberware : prof 3+ — JAMAIS pour un Éveillé (coût en Essence). Second
    // tirage (prof 5+) distinct du premier (anti-doublon de bonus, cf.
    // BonusEngine.CYBER_BONUS reconnu par préfixe).
    if (!awakened && p >= 3) {
      const firstCyber = pick(["cyberware"]);
      if (firstCyber) result.push(firstCyber);
      if (p >= 5) {
        const secondCyber = pick(["cyberware"]);
        if (secondCyber && secondCyber !== firstCyber) result.push(secondCyber);
      }
    }

    // Focus / fétiche : matériel magique des Éveillés (comble le trou §9.7 —
    // aucun n'était généré). Caster → foci d'incantation/invocation/puissance ;
    // adepte → focus d'arme/de puissance. L'indice est adossé au prof (grouille
    // → fétiche d'indice 1, éveillé chevronné → focus de puissance d'indice 4).
    // Motorisé : SkillEffects (caster) / WeaponEffects (focus d'arme).
    if (awakened) {
      const isAdept = special === "Adepte" || role === "adepte";
      const focus = pick([isAdept ? "fociAdepte" : "fociCaster"]);
      if (focus)
        result.push(
          `${focus} (indice ${Utils.clamp(1 + Math.floor(p / 2), 1, 4)})`,
        );
    }

    // Équip spécial : flics/sécu ou pros
    if (policeLike || p >= 3) result.push(pick(["equipSpecial"]));

    // Drones et véhicules : riggers (stats du catalogue js/vehicles.js) — hors
    // equipPools, inchangés. Le rôle Coherence remplace le test de libellé.
    const rigger =
      role === "rigger" || archetype.includes("Rigger") || special === "Rigger";
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
        Utils.rand(["Fourgon GMC Bulldog", "Ares Roadmaster", "Toyota Gopher"]),
      );
    }

    return result.filter(Boolean);
  },

  /* ---- Génération principale ---- */
  generate(opts) {
    Metavariants.use("sr5");
    let meta =
      opts.meta === "Aléatoire" ? Metavariants.randomMeta() : opts.meta;

    // Résolution métavariante : une métavariante/conscience/zoocanthrope
    // remplace les ranges de sa souche et porte ses traits raciaux.
    const mv = Metavariants.resolve(meta);
    // Résolution Infecté (Livre de Règles p.406-408) — remplace la
    // résolution métavariante habituelle.
    const infected = !mv ? Infected.use("sr5").resolve(meta) : null;
    const baseMetatype = mv
      ? mv.baseMetatype
      : infected
        ? infected.baseMetatype
        : meta;
    // Bassin de noms : si non imposé, hériter de la métavariante
    let originPoolOverride = null;
    if (
      mv &&
      mv.originPools &&
      (!opts.originPool || opts.originPool === "Aléatoire")
    ) {
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
      opts.proRating === "Aléatoire"
        ? Utils.randInt(0, 6)
        : parseInt(opts.proRating, 10);
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

    // Un archétype matriciel implique la spécialisation Decker (compétences
    // matricielles + cyberdeck), sauf spécialisation déjà fixée. `role` vient
    // de Coherence.resolveTuple (ci-dessus) ; /matriciel/ rattrape les
    // archétypes typés « technicien » (ex. « Technicien matriciel corpo »).
    if (
      special === "Aucun" &&
      (role === "decker" || /matriciel/i.test(archetype))
    )
      special = "Decker";

    // V2b : même réconciliation pour le rigger — jusqu'ici SEUL le decker
    // en bénéficiait. Un archétype nommé dont le rôle résout à "rigger"
    // (ex. « Rigger de gang ») restait sur special="Aucun" par défaut,
    // silencieusement privé à la fois des compétences de spécialisation
    // (specialSkills.Rigger : Pilotage/Ingénierie/Hardware/Cybercombat
    // drones) ET de l'équipement de contrôle (augsBySpecial.Rigger :
    // câblage + console) — les drones eux-mêmes restaient corrects (déjà
    // gatés sur `role`, cf. buildLoadout ci-dessous), mais un rigger sans
    // console pour s'y jacker n'a rien d'un rigger. Sans risque de doublon
    // (specialSkills fusionne par nom déjà unique, cf. _buildSkills).
    if (special === "Aucun" && role === "rigger") special = "Rigger";

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
        attrs[k] = Utils.clamp(
          infected.attrFixed[k] + Utils.randInt(-1, 1),
          1,
          15,
        );
      }
    }

    // Spécialisations magiques
    if (["Mage hermétique", "Chaman", "Adepte"].includes(special)) {
      attrs.MAG = Utils.clamp(proRating + Utils.randInt(1, 2), 1, 6);
    }
    if (special === "Technomancien") {
      // Plafond RES ≤ ⌊Essence⌋ (p.252) — attrs.ESS déjà posé ci-dessus.
      attrs.RES = Utils.clamp(
        Math.min(proRating + Utils.randInt(1, 2), Math.floor(attrs.ESS)),
        1,
        6,
      );
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
    const chcCenter =
      chcR[0] +
      Math.round((chcR[1] - chcR[0]) * Utils.clamp(proRating / 6, 0, 1) * 0.6);
    attrs.CHC = Utils.clamp(chcCenter + Utils.randInt(0, 1), chcR[0], chcR[1]);

    // Limites naturelles
    const limPhys = Math.ceil((attrs.FOR * 2 + attrs.CON + attrs.REA) / 3);
    const limMent = Math.ceil((attrs.LOG * 2 + attrs.INT + attrs.VOL) / 3);
    const limSoc = Math.ceil(
      (attrs.CHA * 2 + attrs.VOL + (proRating || 0)) / 3,
    );

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
    // Résistance au Technodrain (T2, p.252) : Résonance + Volonté.
    const technoDrainResist =
      special === "Technomancien" ? attrs.RES + attrs.VOL : null;

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
    const { skills, knowledges } = this._buildSkills(
      archetype,
      proRating,
      special,
      role,
      milieu,
    );

    // Équipement
    const equip = this._buildEquip(archetype, proRating, special, role, milieu);
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
      .filter((prefix) =>
        equip.some((e) => typeof e === "string" && e.startsWith(prefix)),
      );
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

    // Formes complexes (T2) — seulement pour les technomanciens ; connues
    // max RES×2 (p.252), plafond appliqué après le tirage (pickComplexForms
    // ne le connaît pas, il est propre à SR5).
    const complexFormsList =
      special === "Technomancien"
        ? Content.pickComplexForms("sr5", proRating).slice(
            0,
            Math.max(1, attrs.RES * 2),
          )
        : [];

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
      technoDrainResist,
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
      complexForms: complexFormsList,
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
    Cyberdeck.hydrate(pnj, "sr5");
    Resonance.hydrate(pnj, "sr5");

    // Progression ésotérique (P6) : « Initié hermétique » restitue enfin
    // l'intention perdue par le fourre-tout retiré en P1 — un GRADE et des
    // MÉTAMAGIES, pas un nom. Les autres Éveillés/technomanciens ont une
    // chance croissante avec proRating d'être déjà initiés/submergés
    // (variété du générateur, pas une règle du livre).
    if (awakened) {
      Esoteric.rollForGeneration(pnj, "sr5", "initiation", {
        forced: archetype.includes("Initié"),
        proRating,
      });
    } else if (special === "Technomancien") {
      Esoteric.rollForGeneration(pnj, "sr5", "submersion", { proRating });
    }
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

  _buildEquip(archetype, proRating, special, role, milieu) {
    return this.buildLoadout(archetype, proRating, special, role, milieu);
  },

  /** Décompose une réserve dérivée en contributions nommées {label,value}
      (source unique consommée par le popover ⓘ et le résultat du jet — ne
      duplique pas la formule de recalc, lit les mêmes attributs totaux). */
  reserveBreakdown(pnj, key) {
    const A = (k) => Actor.attr(pnj, k);
    switch (key) {
      case "defense":
        return [
          { label: Utils.attrFullName("REA"), value: A("REA") },
          { label: Utils.attrFullName("INT"), value: A("INT") },
        ];
      case "damageResist": {
        const armure = pnj.armure || 0;
        const pieces = ItemResolver.armorPieces(pnj);
        const armorContrib = { label: "Armure", value: armure };
        // Réconciliation Lot C (Failsafe) : detail imbriqué SEULEMENT si la
        // somme des pièces lues dans l'équipement colle exactement à la
        // valeur stockée — jamais de contradiction avec pnj.armure/
        // pnj.damageResist (armure motorisée séparément par palier de pro,
        // pas dérivée de l'équipement choisi ; coïncide surtout après une
        // édition manuelle cohérente).
        if (
          pieces.length &&
          pieces.reduce((s, p) => s + p.value, 0) === armure
        ) {
          armorContrib.detail = pieces;
        }
        return [
          { label: Utils.attrFullName("CON"), value: A("CON") },
          armorContrib,
        ];
      }
      case "drainResist": {
        const attr =
          pnj.traditionDrainAttr ||
          (["Mage hermétique", "Chaman"].includes(pnj.special) ? "LOG" : null);
        if (!attr) return null;
        return [
          { label: Utils.attrFullName("VOL"), value: A("VOL") },
          { label: Utils.attrFullName(attr), value: A(attr) },
        ];
      }
      case "composure":
        return [
          { label: Utils.attrFullName("VOL"), value: A("VOL") },
          { label: Utils.attrFullName("CHA"), value: A("CHA") },
        ];
      case "judgeIntentions":
        return [
          { label: Utils.attrFullName("INT"), value: A("INT") },
          { label: Utils.attrFullName("CHA"), value: A("CHA") },
        ];
      case "memory":
        return [
          { label: Utils.attrFullName("LOG"), value: A("LOG") },
          { label: Utils.attrFullName("VOL"), value: A("VOL") },
        ];
      case "liftCarry":
        return [
          { label: Utils.attrFullName("FOR"), value: A("FOR") },
          { label: Utils.attrFullName("CON"), value: A("CON") },
        ];
      case "surprise":
        return [
          { label: Utils.attrFullName("REA"), value: A("REA") },
          { label: Utils.attrFullName("INT"), value: A("INT") },
        ];
      default:
        return null;
    }
  },

  recalc(pnj) {
    const { proRating } = pnj;
    // Chance : init douce pour les PNJ sauvegardés avant l'ajout du champ
    // (plancher racial d'attrRange, pas de migration versionnée).
    if (pnj.attrs && pnj.attrs.CHC == null)
      pnj.attrs.CHC = this.attrRange[pnj.meta]?.CHC?.[0] ?? 3;
    Actor.refreshAttrs(pnj); // Trait : total = base + Σ mods, avant les dérivées
    const A = (k) => Actor.attr(pnj, k);
    // Seau de mods de Limite (BonusEngine : Phéromones→soc, Amélioration
    // mnémonique→ment, traits→phys…). Ré-ajouté APRÈS la formule de base à
    // chaque recalc pour survivre à la recomputation (fix tranche 4) —
    // miroir de Actor.addMod/refreshAttrs pour les attributs.
    const lm = pnj._limitMods || {};
    pnj.limPhys =
      Math.ceil((A("FOR") * 2 + A("CON") + A("REA")) / 3) + (lm.phys || 0);
    pnj.limMent =
      Math.ceil((A("LOG") * 2 + A("INT") + A("VOL")) / 3) + (lm.ment || 0);
    pnj.limSoc =
      Math.ceil((A("CHA") * 2 + A("VOL") + (proRating || 0)) / 3) +
      (lm.soc || 0);
    pnj.physMon = 8 + Math.ceil(A("CON") / 2);
    pnj.stunMon = 8 + Math.ceil(A("VOL") / 2);
    pnj.init = A("REA") + A("INT") + (pnj._initMod || 0);
    pnj.drainResist = pnj.traditionDrainAttr
      ? A("VOL") + A(pnj.traditionDrainAttr)
      : ["Mage hermétique", "Chaman"].includes(pnj.special)
        ? A("VOL") + A("LOG") // fallback anciens PNJ sans tradition
        : null;
    // Résistance au Technodrain (T2) : Résonance + Volonté (p.252), même
    // patron que drainResist ci-dessus — RES n'existe que sur un
    // Technomancien (attrs.RES posé en génération, cf. ligne ~2634).
    pnj.technoDrainResist =
      pnj.special === "Technomancien" ? A("RES") + A("VOL") : null;
    const armure = pnj.armure || 0;
    pnj.defense = A("REA") + A("INT");
    pnj.damageResist = A("CON") + armure;
    pnj.composure = A("VOL") + A("CHA");
    pnj.judgeIntentions = A("INT") + A("CHA");
    pnj.memory = A("LOG") + A("VOL");
    pnj.liftCarry = A("FOR") + A("CON");
    pnj.surprise = A("REA") + A("INT");
    return pnj;
  },
};

// Pont couche 3 (migration modules ES) — retiré en fin de migration.
window.EditionSR5 = EditionSR5;
