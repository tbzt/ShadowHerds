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
import { Actor } from "../rules/actor.js";
import { BonusEngine } from "../rules/bonusengine.js";
import { Coherence } from "../rules/coherence.js";
import { Content } from "../rules/content.js";
import { Cyberdeck } from "../rules/cyberdeck.js";
import { Flavor } from "../rules/flavor.js";
import { ItemResolver } from "../rules/itemresolver.js";
import { Magic } from "../rules/magic.js";
import { Metavariants } from "../rules/metavariants.js";
import { Spirits } from "../catalogs/spirits.js";
import { Utils } from "../core/utils.js";
import { WeaponRoll } from "../rules/weaponroll.js";

export const EditionAnarchy1 = {
  id: "anarchy1",
  label: "Anarchy 1re",
  badgeLabel: "ANARCHY 1RE",
  isWip: false,
  useMetavariants: true,

  /* ---- Contrat commun édition ---- */
  attributes: ["FOR", "AGI", "VOL", "LOG", "CHA", "CHC"],
  /** Légende des symboles affichée dans l'Aide (?), lue par

  App._renderHelpLegend. V1 ≈ un SR5
      simplifié (cf. cardrenderer.anarchy1.js) mais SANS PRE ni PA sur les
      armes : weaponModel.accuracyLimit=false, et _resolveWeaponV1 ne pose
      que VD + portées (« Nom [VD XP, C OK · I −2] », imprimé au livre). */
  helpLegend: [
    { keys: "⚄ N", html: "Réserve de dés <strong>cliquable</strong> — un clic lance le test à N dés." },
    { keys: "Init", html: "Initiative : score de base + dés d'initiative (ex. 8+2D6)." },
    { keys: "VD", html: "Valeur de Dégâts — <strong>P</strong> physique, <strong>E</strong> étourdissant (imprimée au livre, pas recalculée)." },
    { keys: "Portées", html: "<strong>C</strong> Courte · <strong>I</strong> Intermédiaire · <strong>L</strong> Longue — « OK » sans malus, sinon le malus de dés est indiqué (ex. « I −2 »)." },
  ],
  /** V1 n'a pas de panneau de Réduction de Risque (propre à Anarchy 2.0) :
      elle retombe sur les chemins « SR » des gates de Phase 1. */
  usesRiskPanel: false,
  /** Les points d'Anarchy (réserve MJ) réutilisent le panneau
      de réserve de menace existant — sémantique proche. */
  usesThreatReserve: true,
  /** Seconde chance via la Chance (CHC), comme en SR5 (p.58 V1). */
  rerollAction: {
    label: "Seconde chance",
    mode: "misses",
    blockedBy: "critGlitch",
    costAttr: "CHC",
  },
  /* ---- Action magique : Anarchy n'a pas de Drain chiffré →
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
  /** Initiative V1 : base = max(AGI, LOG), 2D6 (pas de passes
      d'initiative — combat narratif). */
  initiativeFor(pnj) {
    const attrs = pnj.attrs || {};
    return { base: Math.max(attrs.AGI || 0, attrs.LOG || 0), dice: 2 };
  },
  /** Spec d'un combattant CI lancé dans l'initiative. Comme Anarchy 2,
      combat narratif → jeton sans init chiffrée. */
  icCombatant(ic) {
    return { name: ic.label, narrative: true };
  },
  /** Budget d'actions par narration (vérifié p.155) — 1 action + déplacement
      gratuit. Atouts (Réflexes câblés) et points d'Anarchy ajoutent des actions :
      au MJ d'incrémenter. */
  actionBudget() {
    return [{ key: "action", label: "Action", total: 1 }];
  },
  /** narrative:true — combat sans initiative chiffrée ni ordre figé (le livre
      A1 gère l'ordre par la narration). Le tracker bascule en mode dépouillé
      (pool de jetons qu'on éteint), cf. EncounterRenderer._rowNarrative. */
  /** threatReserve : miroir de la Réserve de menace (badge topbar visible
      aussi en A1, cf. CSS `[data-edition^="anarchy"]`) dans l'en-tête du
      cockpit — même source (DiceRoller._threat), pas d'état doublé. */
  combatModel: { rerollEachRound: false, passDecrement: 0, narrative: true, threatReserve: true },
  /** Disposition de combat (Vague D) : Anarchy 1 n'a PAS de règle de combativité
      imprimée (seulement « Dangerosité », niveaux de dés) → morale toujours null
      (pas de drapeau « devrait fuir »). Seul « hors de combat » (moniteur
      physique plein) est signalé. */
  combatDisposition(pnj) {
    return { down: this.conditionMonitor.isDestroyed(pnj), morale: null };
  },
  /** 3 puissances par esprit V1 (mineur/normal/majeur) —
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

  /** Bloc « mécanique de table » du PJ léger. Pas
      d'initiative chiffrée en A1 (narrative:true, ci-dessus) ni de règle de
      combativité imprimée (cf. combatDisposition ci-dessus) → aucun champ
      numérique à demander au joueur, seulement les moniteurs (mêmes champs
      physMon/stunMon que les PNJ complets A1, cf. conditionMonitor). */
  /** Anarchy (1re éd.) n'a pas de réputation chiffrée : valeur neutre `[]`
      (contrat commun — une propriété asymétrique forcerait un branchement
      d'édition chez le consommateur). Le suivi de campagne reste possible via
      les nuyens, le Karma et les compteurs libres (cf. Campaign). */
  reputationTracks: [],

  pcTableBlock: {
    fields: [],
    monitorKind: "double",
  },
  /* ---- Moniteurs & combat ----
     Deux moniteurs numériques P/E, comme en SR5, mais taille
     dérivée de FOR/VOL (pas CON/VOL) : phys = 8 + ⌈FOR/2⌉,
     étourd. = 8 + ⌈VOL/2⌉. Malus : −1 dé par ligne de 3 cases remplies
     (cumul phys+étourd.), non réglable (contrairement au woundMod SR5/SR6). */
  conditionMonitor: {
    model: "double physique+étourdissement, cases = 8 + FOR|VOL /2",
    fields: { primary: "physMon" },
    /** p.156, « Lignes de dommages » : « chaque fois qu'une ligne est remplie,
        sur le moniteur physique OU étourdissant, le personnage subit
        immédiatement un modificateur cumulatif de -1 dé […] Les modificateurs
        des moniteurs physique et étourdissant se cumulent. » → par piste puis
        somme (cf. Utils.woundMalusTracks), jamais sur le total.
        Pas de Compensateur de dommages en Anarchy 1 → aucun stock à répartir.
        NON MODÉLISÉ : la même règle ajoute AUSSI un dé de complication par
        ligne pleine (« remplacer un dé par un dé de complication »). */
    woundMalus(pnj) {
      return Utils.woundMalusTracks(pnj.physFilled, pnj.stunFilled, 3, 0);
    },
    spiritMonitor: null,
    /** Drones V1 = Blindage/Résistance/Mobilité/Autopilote,
        pas de seuils comme en V2. */
    vehicleFields: "total",
    isDestroyed(entity) {
      if (entity.type === "vehicle")
        return (entity.monTotal || 0) > 0 && (entity.monFilled || 0) >= entity.monTotal;
      return (entity.physMon || 0) > 0 && (entity.physFilled || 0) >= entity.physMon;
    },
    /** Mise hors de combat immédiate (Vague C) : remplit le moniteur physique
        (ou total pour un véhicule). Réversible par _resetMonitors (✚). */
    knockOut(entity) {
      if (entity.type === "vehicle") entity.monFilled = entity.monTotal || 0;
      else entity.physFilled = entity.physMon || 0;
    },
    /** Descripteur de moniteur pour les jauges (barre fine + cases spectateur).
        Forme ÉCHELLE (`Utils.ladderGauge`) : physique + étourdissement cumulés
        (comme SR5). `null` si pas de moniteur. */
    gauge(entity) {
      if (entity.type === "vehicle")
        return Utils.ladderGauge(entity.monFilled || 0, entity.monTotal || 0);
      return Utils.ladderGauge(
        (entity.physFilled || 0) + (entity.stunFilled || 0),
        (entity.physMon || 0) + (entity.stunMon || 0),
      );
    },
    /** Résultat NET de dégâts appliqué au moniteur (comme SR5, deux
        pistes Physique/Étourdissant, défaut Physique). */
    applyDamage(entity, n, opts) {
      const amount = Math.max(0, n || 0);
      const type = opts && opts.type === "stun" ? "stun" : "phys";
      const field = type === "stun" ? "stunFilled" : "physFilled";
      const max = type === "stun" ? entity.stunMon : entity.physMon;
      const before = entity[field] || 0;
      entity[field] = Utils.clamp(before + amount, 0, max ?? 99);
      return { field, applied: entity[field] - before };
    },
    damageUI() {
      return { kind: "numeric", chips: [1, 2, 3, 5], hasType: true, defaultType: "phys" };
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

  /* ---- Catalogue d'équipement (armes/armures/gear, p.71-77) ----
     Même socle que SR5/SR6 : `equipPools` + `_equipLabels`, ItemResolver
     aplatit et résout (id "clé::index"). Armes = chaînes poussées dans
     `pnj.equip` (weaponModel.source: "equip", comme SR5). Les Atouts
     (cyberware/bioware/pouvoirs/sorts, fondus dans un système narratif
     unique en Anarchy) restent hors de ce catalogue — cf. `powerCatalog`
     `null` et `spellCatalog` séparé plus bas. */
  equipPools: {
    armesCorpsACorps: [
      "Mains nues [(FOR/2)E, courte]",
      "Armes courtes [(FOR/2+1)P, courte]",
      "Marques [(FOR/2+2)P, courte]",
      "Marques étourdissantes [7E, courte]",
      "Armes longues [(FOR/2+3)P, courte]",
    ],
    armesProjectiles: [
      "Armes de jet [(FOR/2+1)P, courte, -2 intermédiaire]",
      "Arcs [(FOR/2+1)P, -2 courte, OK intermédiaire, -2 longue]",
      "Arbalètes [5P, courte, -2 intermédiaire]",
      "Grenades [12P, courte/intermédiaire]",
      "Grenades étourdissantes [8E, courte/intermédiaire]",
    ],
    armesFeu: [
      "Tasers/Pistolets tranquillisants [6E, courte, -4 intermédiaire]",
      "Pistolets légers [5P, courte, -2 intermédiaire]",
      "Pistolets lourds [6P, courte, -2 intermédiaire]",
      "Pistolets mitrailleurs [5P, courte, -2 intermédiaire]",
      "Mitrailleuses [6P, courte/intermédiaire]",
      "Fusils d'assaut [8P, courte/intermédiaire, -2 longue]",
      "Fusils de précision [9P, -4 courte, -2 intermédiaire, OK longue]",
      "Shotguns [9P, courte, -2 intermédiaire]",
    ],
    armesLourdes: [
      "Mitrailleuses lourdes [8P, tous rangs]",
      "Canons/Lanceurs [12P, tous rangs]",
    ],
    armures: {
      legere: ["Armure légère [Armure 6, veste synthécuir/costume Actioner, +1 point de compétence]"],
      moyenne: ["Armure moyenne [Armure 9, gilet/armure corporelle]"],
      lourde: ["Armure lourde [Armure 12, veste/armure corporelle, -1 point de compétence]"],
    },
    // Cyberdecks (Anarchy 1re, p.68). Un seul attribut tracké = Firewall ;
    // les modèles nommés illustrent chaque palier. Le préfixe « Cyberdeck »
    // est requis pour que l'ajout configure aussi le deck mécanique
    // (Cyberdeck.setFromLine → parseLegacy, qui lit « FW N »).
    cyberdecks: [
      "Cyberdeck premier prix (FW 1) — ex. Erika MCD-1, Microdeck Summit",
      "Cyberdeck entrée de gamme (FW 2) — ex. Microtrónica Azteca 200, Hermes Chariot",
      "Cyberdeck de gamme intermédiaire (FW 3) — ex. Novatech Navigator, Renraku Tsurugi",
      "Cyberdeck haut de gamme (FW 3) — ex. Sony CIY-720",
    ],
    equipSpecial: [
      "Brouilleur de zone [bloque les communications, zone large]",
      "Commlink [device de communication]",
      "Contrat DocWagon [services médicaux d'urgence]",
      "Fausse licence [légalise un équipement]",
      "Faux SIN [identité synthétique]",
      "Générateur de bruit blanc [masque les conversations]",
      "Grenade fumigène [écran de fumée]",
      "Lunettes/Lentilles [lien visuel, vision thermographique, zoom optique]",
      "Lunettes de vision nocturne [ignore les modificateurs de vision]",
      "Mallette blindée [protège le matériel transporté]",
      "Matériel pour loge magique [pour sorciers]",
      "Médikit [soins basiques]",
      "Menottes métalliques ou plastique [entrave]",
      "Pied de biche [forçage]",
      "Sac de coursier [transport]",
      "Stim patch [soigne un personnage blessé]",
      "Trauma patch [stabilise un personnage]",
      "Kit de survie [ressources en milieu sauvage]",
      "Kit d'outillage [à préciser selon le métier]",
      "Kit d'effraction [bonus aux tests de crochetage]",
      "Combinaison caméléon [Armure 9, bonus Furtivité]",
      "Console de commande Rigger [contrôle de drones]",
    ],
    // Drogues et toxines (Anarchistes, p.76-79).
    drogues: [
      "Alcool [réduit douleur / mauvais en combat]",
      "Bliss (Extase) [tranquillisant, réduit douleur]",
      "Cram [alerter, paranoia, contrecoup]",
      "Deepweed [force perception astrale des Éveillés]",
      "Jazz [nervosité, hyperactivité, désorienation]",
      "Kamikaze [augmente capacités physiques/mentales]",
      "Long Cours [rester éveillé longtemps]",
      "Nitro [énergie, volatilité, augmente force]",
      "Novacoke [affable/alerte, humeur exécrable après]",
      "Psyché [+2 dés pour sortilèges/formes]",
      "Zen [Volonté +1, agit dernier]",
    ],
    toxines: [
      "Bêta-endgorphine [dommages 2E/tour, -1 dé]",
      "Gamma-Scopolamine [paralysie, sérum de vérité]",
      "Gaz lacrymogène [irrite yeux/peau, panique]",
      "Gaz Neuro-Stun [inconscience rapide ~30s]",
      "Gaz Neuro-Stun IX [dommages 3P/tour]",
      "Gaz vomitif [nausée persistante, -2 dés]",
      "Gaz Seven-7 [crampes/nausées, mortel haute dose]",
      "Leäl [amnésie 1-2 heures]",
      "Narcoject [sédatif sans effet secondaire]",
      "Narcsea [sédatif tranquillisant, -3 dés]",
    ],
  },
  _equipLabels: {
    armesCorpsACorps: "Corps à corps",
    armesProjectiles: "Armes de trait/jet",
    armesFeu: "Armes à feu",
    armesLourdes: "Armes lourdes",
    armures: "Armures",
    cyberdecks: "Cyberdecks",
    equipSpecial: "Équipement spécial",
    drogues: "Drogues",
    toxines: "Toxines",
  },
  equipCatalog() {
    return ItemResolver.flattenEquipPools(this.equipPools, this._equipLabels);
  },
  addCatalogItem(pnj, id) {
    ItemResolver.addEquipString(pnj, this.equipPools, id);
  },
  /** #66 : groupes métatype/métavariante pour le sélecteur d'édition PNJ
      (EditModal, `SingleSelect.create({groups})`), même source que le
      générateur (`Metavariants.pickerGroups`). */
  metaOptions() {
    return { groups: Metavariants.use("anarchy1").pickerGroups() };
  },
  /* Sorts : catalogue partagé (taxonomie commune aux 4 éditions), source
     unique dans Content. Ajout surchargé (pas de délégation directe) pour
     garder la forme enrichie {name,cat,niveau,desc,note} des sorts générés
     (cf. _enrichSpell), plutôt que l'objet brut de Content.spells.anarchy1. */
  spellCatalog() {
    return Content.spellCatalogFor(this.id);
  },
  addSpellItem(pnj, id) {
    pnj.spells = pnj.spells || [];
    pnj.spells.push(this._enrichSpell(id));
  },
  /* Pas de pouvoirs d'adepte séparés en Anarchy (mécanique fondue dans les
     Atouts). */
  powerCatalog() {
    return null;
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

  /** Drones V1 : Blindage/Résistance/Mobilité/Autopilote —
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

  /* Régime Matrice V1 : le serveur lance un POOL DE
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
    // Anarchy 1re ne décrit pas le brickage d'appareil au texte — pas de
    // régime (ni moniteur, ni bascule). `null` explicite : Matrix.deviceBricking()
    // renvoie null → la section « Appareils matriciels » ne s'affiche jamais.
    deviceBricking: null,
    // R1d : jamais consultée (deviceBricking null coupe la section en amont)
    // — présente pour le contrat symétrique des 4 modules (CONTRIBUTING).
    connectedByCat: {},
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
    /** Badge de carte serveur : le pool de défense, pas
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

  /* Régime cyberdeck Anarchy 1re (sran_01 p.62-65) —
     Firewall seul (pas d'ASDF) + relance de N échecs aux tests de Hacking
     (Erika 1 … Fairlight Excalibur 3). Pas de réallocation (Canon). */
  cyberdeckModel: {
    attrKeys: ["firewall"],
    reallocatable: false,
    hasReroll: true,
    hasBiofeedbackFilter: false,
    label: "Cyberdeck",
    /** Moniteurs des 3 decks catalogués (p.62-65) — Erika
        MCD-1 (FW1) 6 cases, Novatech Navigator (FW2) 9, Shiawase Cyber-5
        (FW3) 15. Pas de formule imprimée pour un Firewall hors de ces 3
        modèles : extrapolation linéaire documentée (6 + 3×(FW−1)) au-delà,
        à corriger si un futur decker sort de cette fourchette. */
    monitorSize(deck) {
      const table = { 1: 6, 2: 9, 3: 15 };
      const fw = (deck && deck.attrs && deck.attrs.firewall) || 1;
      return table[fw] ?? 6 + 3 * (fw - 1);
    },
    // Pas de catalogue `actions` (râtelier matriciel offensif) — décision
    // Canon. Le deck Anarchy 1re n'a qu'un Firewall (pas d'attribut Attaque
    // motorisé) et le livre ne décrit pas d'actions matricielles chiffrées côté
    // decker : Cyberdeck.catalog() renvoie donc [] et aucun bouton d'arsenal
    // n'est monté pour cette édition (absence volontaire, pas un oubli).
    /* Programmes matriciels (Anarchy 1re, p.68). Catalogués et sélectionnables
       (l'atout de deck en précise le nombre simultané), mais NON motorisés
       (`effect: null`) : A1 n'a ni actions matricielles chiffrées ni attribut
       de deck hors Firewall auquel rattacher un bonus de pool/VD. Leurs effets
       (bonus de dés en cybercombat/hors cybercombat, dégâts, moniteur, défense)
       n'ont pas de support mécanique côté decker dans cette édition. */
    programs: [
      { key: "agresseur", name: "Agresseur", page: 68, effect: null }, // +dés Hacking en cybercombat
      { key: "exploitation", name: "Exploitation", page: 68, effect: null }, // +dés Hacking hors cybercombat
      { key: "marteau", name: "Marteau", page: 68, effect: null }, // +dommages en cybercombat
      { key: "armure", name: "Armure", page: 68, effect: null }, // +cases moniteur matriciel
      { key: "cryptage", name: "Cryptage", page: 68, effect: null }, // +dés en défense cybercombat
      { key: "biofeedback", name: "Biofeedback", page: 68, effect: null }, // dommages physiques/étourdissants (narratif)
      { key: "furtivite", name: "Furtivité", page: 68, effect: null }, // −dés à qui piste le personnage
      { key: "pistage", name: "Pistage", page: 68, effect: null }, // +dés au Pistage matriciel
    ],
  },

  /* Régime technomancien Anarchy 1re — pas de formalisme SR5/SR6 (4
     attributs matriciels dérivés + Résonance chiffrée) : le cœur A1 n'a
     aucun technomancien joueur, et *Anarchistes* (supplément, T5) modélise
     la Résonance comme un Atout narratif (« Technomancie N »), pas un
     attribut. `livingPersona: null` → Resonance ne rend aucun bloc persona
     pour cette édition (même polymorphisme que technoModel: null en A2,
     en moins radical : A1 aura bien des technomanciens, juste pas ce
     formalisme). `essenceResonanceMalus` = table p.150 (vérifiée au livre,
     partagée avec la Magie), conservée ici comme donnée d'édition en
     attendant son consommateur (le duel Matrice, T6 — aucun test de
     Résonance n'est encore lancé côté A1). */
  technoModel: {
    label: "Résonance",
    resonanceAttr: null,
    livingPersona: null,
    essenceResonanceMalus: [
      { min: 5.5, max: 6, malus: 0 },
      { min: 3.5, max: 5, malus: -1 },
      { min: 1.5, max: 3, malus: -2 },
      { min: 0.5, max: 1, malus: -3 },
    ],
  },

  /* ----
     ATTRIBUTS PAR MÉTATYPE — table des indices max V1
     FOR/AGI/VOL/LOG/CHA/CHC
  ---- */
  attrRange: {
    Humain: { FOR: [1, 6], AGI: [1, 6], VOL: [1, 6], LOG: [1, 6], CHA: [1, 6], CHC: [1, 7] },
    Elfe: { FOR: [1, 6], AGI: [1, 7], VOL: [1, 6], LOG: [1, 6], CHA: [1, 8], CHC: [1, 6] },
    Nain: { FOR: [1, 8], AGI: [1, 6], VOL: [1, 7], LOG: [1, 6], CHA: [1, 6], CHC: [1, 6] },
    Ork: { FOR: [1, 8], AGI: [1, 6], VOL: [1, 6], LOG: [1, 6], CHA: [1, 5], CHC: [1, 6] },
    Troll: { FOR: [1, 10], AGI: [1, 5], VOL: [1, 6], LOG: [1, 5], CHA: [1, 4], CHC: [1, 6] },
  },

  /* Modificateurs plats métatype (recoupés avec la règle de
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
      physique (accès/caméras). */
  secPhysBonus: 2,

  /* ---- Options du formulaire ----
     Niveau de jeu V1 remplace le proRating SR5. */
  formOptions: {
    meta: ["Aléatoire", "Humain", "Elfe", "Nain", "Ork", "Troll"],
    gender: ["Aléatoire", "M", "F", "NB"],
    tier: ["Aléatoire", "Ganger", "Runner", "Élite"],
    get archetype() {
      return ["Aléatoire", ...Object.keys(EditionAnarchy1.statBlocks)];
    },
  },

  /* Catalogue d'Atouts (édition manuelle d'un PNJ) : pas de liste globale
     dans le livre — dédupliqué à partir des `edgeOptions` de tous les
     statBlocks (déduplication par chaîne exacte, sans fusion approximative :
     un même Atout peut apparaître en plusieurs variantes selon l'archétype
     d'origine, ex. Essence différente — accepté, cf. CHANGELOG). */
  _edgeCatalogCache: null,
  edgeCatalog() {
    if (!this._edgeCatalogCache) {
      const set = new Set();
      for (const sb of Object.values(this.statBlocks))
        for (const e of sb.edgeOptions || []) set.add(e);
      this._edgeCatalogCache = [...set]
        .sort((a, b) => a.localeCompare(b, "fr"))
        .map((e) => ({ id: e, label: e }));
    }
    return this._edgeCatalogCache;
  },
  addEdgeItem(pnj, id) {
    pnj.edges = pnj.edges || [];
    pnj.edges.push(id);
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

    /* ---- Customs D5/couverture (2026-07-14) : peuplement des rôles/milieux
       sans archétype (rue, crime, police, ombres · chamane, adepte,
       technicien, infiltrateur, civil), signalés par Coherence._selfTest.
       Le livre de base (p.182-190) ne couvre que gangers/corpo/sécurité/
       militaire/Johnson — customs assumés dans le même esprit que le
       peuplement Anarchy 2 (cf. mémoire project_coherence_content_gaps). */
    "Civil de quartier": {
      label: "Civil de quartier",
      tier: "Figurant",
      attrs: { FOR: 2, AGI: 2, VOL: 2, LOG: 2, CHA: 3, CHC: 2 },
      skills: [
        { name: "Étiquette", val: 3, attr: "CHA" },
        { name: "Comédie", val: 1, attr: "CHA" },
        { name: "Véhicules terrestres", val: 1, attr: "AGI" },
      ],
      weapons: [{ name: "Mains nues", dmg: 1, dmgType: "E" }],
      armor: 0,
    },

    "Adepte de rue": {
      label: "Adepte de rue",
      tier: "Sbire",
      awakened: true,
      attrs: { FOR: 4, AGI: 4, VOL: 3, LOG: 2, CHA: 2, CHC: 2 },
      skills: [
        { name: "Corps à corps", val: 4, attr: "AGI" },
        { name: "Athlétisme", val: 3, attr: "FOR" },
        { name: "Acrobaties", val: 2, attr: "AGI" },
        { name: "Intimidation", val: 1, attr: "CHA" },
      ],
      edges: [
        "Réflexes améliorés (pouvoir d'adepte, +1 attaque/Narration, +1 pt Anarchy/Scène)",
        "Peau d'acier (pouvoir d'adepte, +3 Armure naturelle)",
      ],
      weapons: [
        { name: "Mains nues", dmg: 3, dmgType: "E" },
        { name: "Poing américain/Couteau", dmg: 4, dmgType: "P" },
      ],
      armor: 9,
    },

    "Cambrioleur": {
      label: "Cambrioleur",
      tier: "Sbire",
      attrs: { FOR: 2, AGI: 4, VOL: 2, LOG: 3, CHA: 2, CHC: 3 },
      skills: [
        { name: "Furtivité", val: 4, attr: "AGI" },
        { name: "Pistage", val: 2, attr: "LOG" },
        { name: "Corps à corps", val: 2, attr: "AGI" },
        { name: "Comédie", val: 1, attr: "CHA" },
      ],
      edges: ["Kit d'intrusion optimisé (relance 1 échec Furtivité en intrusion)"],
      weapons: [
        { name: "Mains nues", dmg: 1, dmgType: "E" },
        { name: "Poing américain/Couteau", dmg: 2, dmgType: "P" },
        { name: "Pistolet léger", dmg: 5, dmgType: "P", ranges: "C OK · I −2" },
      ],
      armor: 6,
    },

    "Officier de patrouille": {
      label: "Officier de patrouille",
      tier: "Sbire",
      essence: 5,
      attrs: { FOR: 3, AGI: 3, VOL: 3, LOG: 3, CHA: 3, CHC: 2 },
      skills: [
        { name: "Armes à feu", val: 3, attr: "AGI" },
        { name: "Athlétisme", val: 2, attr: "FOR" },
        { name: "Intimidation", val: 2, attr: "CHA" },
        { name: "Pistage", val: 1, attr: "LOG" },
      ],
      edges: ["Yeux cybernétiques (relance 1 dé Perception)"],
      weapons: [
        { name: "Mains nues", dmg: 2, dmgType: "E" },
        { name: "Matraque", dmg: 5, dmgType: "P" },
        { name: "Pistolet léger", dmg: 5, dmgType: "P", ranges: "C OK · I −2" },
      ],
      armor: 9,
    },

    "Chaman des rues": {
      label: "Chaman des rues",
      tier: "Sbire",
      awakened: true,
      attrs: { FOR: 2, AGI: 2, VOL: 4, LOG: 2, CHA: 3, CHC: 2 },
      skills: [
        { name: "Conjuration", val: 3, attr: "VOL" },
        { name: "Sorcellerie", val: 3, attr: "VOL" },
        { name: "Survie", val: 2, attr: "VOL" },
        { name: "Comédie", val: 1, attr: "CHA" },
      ],
      spellChoices: 2,
      spellOptions: [
        { name: "Éclair mana", note: "6P/CA" },
        { name: "Boule de feu", note: "7P aire" },
        { name: "Confusion", note: "−2 dés" },
        { name: "Armure", note: "6 cases" },
        { name: "Invisibilité" },
      ],
      weapons: [{ name: "Mains nues", dmg: 2, dmgType: "E" }],
      armor: 6,
    },

    "Technicien indépendant": {
      label: "Technicien indépendant",
      tier: "Sbire",
      attrs: { FOR: 2, AGI: 3, VOL: 2, LOG: 4, CHA: 2, CHC: 2 },
      skills: [
        { name: "Ingénierie", val: 3, attr: "LOG" },
        { name: "Électronique", val: 3, attr: "LOG" },
        { name: "Véhicules terrestres", val: 2, attr: "AGI" },
        { name: "Négociation", val: 1, attr: "CHA" },
      ],
      edges: ["Kit d'outils spécialisé (relance 1 échec Ingénierie/Électronique)"],
      weapons: [
        { name: "Mains nues", dmg: 1, dmgType: "E" },
        { name: "Pistolet léger", dmg: 5, dmgType: "P", ranges: "C OK · I −2" },
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

    // Métavariantes (Anarchistes) : une métavariante
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

    // Esprit mentor (Éveillés uniquement) : pas de
    // tradition motorisée en V1 (traditions.anarchy1 vide) — kind "shamanic"
    // fixe, cohérent avec l'absence de split Hermétique/Chamanique du livre.
    if (statBlock.awakened) {
      pnj.mentorSpirit = Magic.pickMentor(edId, null, "shamanic");
    }

    // Cohérence arme <-> compétence (renomme une compétence de combat si besoin)
    WeaponRoll.reconcile(pnj, edId);
    BonusEngine.apply(pnj, edId);
    Flavor.apply(pnj);
    Cyberdeck.hydrate(pnj, edId);
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

  /** Décompose une réserve dérivée en contributions nommées {label,value}
      (source unique consommée par le popover ⓘ et le résultat du jet).
      damageResist/drainResist : Anarchy 1 n'a pas ces réserves motorisées
      (drainResist toujours null, cf. plus haut) → null neutre documenté. */
  reserveBreakdown(pnj, key) {
    const A = (k) => Actor.attr(pnj, k);
    switch (key) {
      case "defense":
        return [
          { label: Utils.attrFullName("AGI"), value: A("AGI") },
          { label: Utils.attrFullName("LOG"), value: A("LOG") },
        ];
      default:
        return null;
    }
  },

  /** Recalcule moniteurs/Défense/Init après édition manuelle des attributs
      (façon sr5.js recalc). */
  recalc(pnj) {
    Actor.refreshAttrs(pnj); // Trait : total = base + Σ mods, avant les dérivées
    const A = (k) => Actor.attr(pnj, k);
    pnj.physMon = 8 + Math.ceil(A("FOR") / 2);
    pnj.stunMon = 8 + Math.ceil(A("VOL") / 2);
    pnj.defense = A("AGI") + A("LOG");
    pnj.init = Math.max(A("AGI"), A("LOG"));
    return pnj;
  },
};

// Pont couche 3 (migration modules ES) — retiré en fin de migration.
window.EditionAnarchy1 = EditionAnarchy1;
