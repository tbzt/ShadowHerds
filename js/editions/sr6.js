"use strict";

/* ============================================================
   ÉDITION SR6 — Shadowrun 6e édition
   Sources :
   - LdB SR6 (BBE, fr) : attributs p.69, PNJ p.212-220, contacts p.243-249, armures p.274-275
   - Feu Nourri (BBE, fr) : armes p.16-29
   - Compagnon du Sixième Monde (BBE, fr) : métavariantes p.75-90

   Différences clés SR6 vs SR5 :
   - Pas de Limites → Score Défensif (SD)
   - Potentiel d'Actions (PA) : MAJ + MIN par round
   - Compétences regroupées (Athlétisme, Combat rapproché, Armes à feu…)
   - Moniteur d'état unique (8 + CON/2)
   - ATO (Atout) remplace CHC
   - Scores Offensifs (SO) sur les armes au lieu de VD seul
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
import { Spirits } from "../catalogs/spirits.js";
import { Sprites } from "../catalogs/sprites.js";
import { Utils } from "../core/utils.js";
import { WeaponRoll } from "../rules/weaponroll.js";

export const EditionSR6 = {
  id: "sr6",
  label: "Shadowrun 6e",
  // Accent DA lu par le générateur de plan de lieu (MapGen) — liseré + objectif.
  mapAccent: "#d64bd6",
  badgeLabel: "SR6",
  useMetavariants: true,

  /* ---- Contrat commun édition (résorption des branches) ---- */
  attributes: ["CON", "AGI", "RÉA", "FOR", "VOL", "LOG", "INT", "CHA"],
  /** Légende des symboles affichée dans l'Aide (?), lue par
      App._renderHelpLegend — la légende SR5
      était affichée telle quelle en SR6 alors que « PA » y désigne le
      Potentiel d'Actions (MAJ+MIN, cf. commentaire d'en-tête), pas la
      Pénétration d'Armure : collision de sigle, pas juste un vocabulaire
      démodé. SO (Score Offensif) remplace PRE — SR6 n'a pas de limite de
      précision (weaponModel.accuracyLimit=false). */
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
      keys: "SD",
      html: "Score Défensif du PNJ (remplace les Limites de SR5).",
    },
    {
      keys: "SO",
      html: "Score Offensif de l'arme (remplace la Précision de SR5 — pas de limite en SR6).",
    },
    {
      keys: "VD",
      html: "Valeur de Dégâts — <strong>P</strong> physique, <strong>E</strong> étourdissant.",
    },
    {
      keys: "PA",
      html: "<strong>Potentiel d'Actions</strong> (Majeures + Mineures par round) — ⚠ sens différent de SR5, où PA désigne la Pénétration d'Armure.",
    },
    {
      keys: "Modes",
      html: "<strong>CC</strong> Coup par Coup · <strong>SA</strong> Semi-Auto · <strong>TR</strong> Tir en Rafales · <strong>TA</strong> Tir Automatique.",
    },
  ],
  /** Neutre : SR6 utilise le lanceur de dés classique, pas le panneau
      de prise de risque (propre à Anarchy 2.0). */
  usesRiskPanel: false,
  /** Neutre : la réserve de menace (compteur MJ global) est propre à
      Anarchy 2.0 (p.138) — en SR6 la ressource de relance est l'Atout
      (ATO), porté par chaque PNJ (attrs.ATO). */
  usesThreatReserve: false,
  /** Action de relance « Relancer les ratés » (p.50-51) : relance les dés
      ratés (mode "misses"), interdite dès qu'il y a une bévue OU un échec
      critique (blockedBy "glitch" couvre les deux — plus strict que SR5),
      coûte des points d'Atout du PNJ. */
  rerollAction: {
    label: "Relancer les ratés",
    mode: "misses",
    blockedBy: "glitch",
    costAttr: "ATO",
  },
  /** Edge PRÉ-jet (Atout, p.50-51) : deux dépenses « avant le jet ». *Prendre
      un risque* (1 Atout → +1 dé libre, sans explosion) et *Ajouter son rang
      d'Atout* (4 Atouts → +rang de dés à 6 explosifs). Contrat neutre miroir
      de rerollAction, lu par DiceRoller.preRollEdgeOptions. SR6 n'a pas de
      Limite → `ignoreLimit:false`. `dice:"rating"` = valeur de `costAttr`. */
  preRollEdge: {
    costAttr: "ATO",
    resourceLabel: "Atout", // nom VF de la ressource (jamais « Edge ») — lu par le journal des jets
    options: [
      {
        id: "takeRisk",
        label: "Prendre un risque",
        cost: 1,
        dice: 1,
        explode: false,
        ignoreLimit: false,
        hint: "1 Atout · +1 dé libre",
      },
      {
        id: "edgeRating",
        label: "Ajouter son rang d'Atout",
        cost: 4,
        dice: "rating",
        explode: true,
        ignoreLimit: false,
        hint: "4 Atouts · +rang, 6 explosifs",
      },
    ],
  },
  /** Gain d'Atout AVANT le jet (SR6 core p.109-112) — propre à SR6, absent
      des autres éditions (clé non définie → pas d'étape de gain, lu par
      DiceRoller.preRollGainSpec). On compare le Score Offensif de l'ARME de
      l'attaquant au Score Défensif de la cible : si l'un dépasse l'autre d'au
      moins 4, le camp le plus haut gagne 1 point d'Atout (plafond 2/tour,
      réserve max 7). Le SO varie selon la bande de Portée (armes à distance) ;
      en mêlée il vaut SO_arme + Force, à mains nues Force + Réaction (p.112).
      Contrat : `offense(pnj, weapon)` renvoie les SO du lanceur ; le panneau
      saisit le SD adverse et motive le crédit. */
  preRollGain: {
    costAttr: "ATO",
    max: 7,
    perTurn: 2,
    threshold: 4,
    rangeBands: [
      { key: "contact", label: "Contact" },
      { key: "courte", label: "Courte" },
      { key: "moyenne", label: "Moyenne" },
      { key: "longue", label: "Longue" },
      { key: "extreme", label: "Extrême" },
    ],
    defaultBand: 2, // Moyenne
    /** SO du lanceur pour cette arme.
        → { isRanged, bands:[{key,label,so}] } : à distance = un SO par bande de
        Portée (null = hors portée) ; en mêlée/mains nues = une seule entrée.
        Le module RÉSOUT ce que `WeaponRoll.parse` n'a fait qu'extraire (tokens
        bruts « 6+FOR », « 10 », null). */
    offense(pnj, weapon) {
      const parsed = WeaponRoll.parse(weapon);
      const name = parsed.name || String(weapon || "");
      const FOR = Actor.attr(pnj, "FOR");
      const fam = WeaponRoll.combatFamily(name, "sr6");
      // Vraies mains nues (FOR + RÉA) — surtout PAS « coup de poing américain »
      // (arme à SO 6+FOR, résolue par la branche mêlée ci-dessous).
      const unarmed = /mains? nues/i.test(name);
      // Résout un token de SO : « 6+FOR » → 6 + Force ; « 10 »/« 1* » → nombre.
      const resolve = (tok) => {
        if (tok == null) return null;
        const m = String(tok).match(/(\d+)\s*\+\s*FOR/i);
        if (m) return parseInt(m[1], 10) + FOR;
        const n = parseInt(tok, 10);
        return Number.isFinite(n) ? n : null;
      };
      if (
        unarmed ||
        (fam === "melee" && (!parsed.so || parsed.so[0] == null))
      ) {
        return {
          isRanged: false,
          bands: [
            {
              key: "melee",
              label: "Mêlée (mains nues)",
              so: FOR + Actor.attr(pnj, "RÉA"),
            },
          ],
        };
      }
      if (fam !== "ranged") {
        // Mêlée : seule la 1ʳᵉ bande porte le SO de l'arme (+FOR déjà résolu).
        const so = parsed.so ? resolve(parsed.so[0]) : null;
        return {
          isRanged: false,
          bands: [
            {
              key: "melee",
              label: "Mêlée",
              so: so != null ? so : FOR + Actor.attr(pnj, "RÉA"),
            },
          ],
        };
      }
      const bands = this.rangeBands.map((b, i) => ({
        key: b.key,
        label: b.label,
        so: parsed.so ? resolve(parsed.so[i]) : null,
      }));
      return { isRanged: true, bands };
    },
  },

  /* ---- Action magique : lu par MagicAction via le contrat. ---- */
  /** SR6 : pas de Puissance de sort à choisir — la VD est fixe (p.135-136). */
  spellUsesForce: false,
  spellSkill: "Sorcellerie",
  conjureSkill: "Conjuration",
  /** VD d'un sort SR6 : valeur fixe portée par le sort (Content.spells.sr6). */
  spellDrainValue(entry) {
    return Magic.drainValue(entry.drain, 0);
  },
  /** VD d'invocation (p.150) : succès de l'esprit (pas de doublement ni de
      minimum documenté en SR6, contrairement à SR5). */
  conjureDrainValue(spiritHits) {
    return Math.max(0, spiritHits | 0);
  },
  /** Réserve de résistance de l'esprit (p.150) : Puissance × 2. */
  spiritResistPool(force) {
    return force * 2;
  },
  /** Bannissement (p.151) — inverse de l'invocation, socle « Renvoi » partagé
      avec la décompilation. Test opposé Conjuration + Magie contre Puissance ×
      2 (pas de bonus de lien en SR6, contrairement à SR5) ; chaque succès net
      retire un service ; Drain = 2 × succès de l'esprit (≠ invocation, non
      doublée en SR6 — vérifié p.150/151), physique si dégâts après résistance
      > Magie (drainDamageType). `ownerMag` ignoré (pas de clause de lien). */
  banishSkill: "Conjuration",
  banishOppose(spirit) {
    return (spirit.force || 0) * 2;
  },
  banishDrainValue(spiritHits) {
    return Magic.drainValue(spiritHits * 2, 0);
  },
  /** Type de dégâts du Drain (p.136 sort / p.150 invocation) : SR6 tranche sur
      les dégâts APRÈS résistance — Physique s'ils dépassent la Magie, sinon
      Étourdissant. (Corrige un cas qui renvoyait toujours « stun ».) */
  drainDamageType(ctx, pnj) {
    const mag = Actor.attr(pnj, "MAG");
    return (ctx.drainDamage || 0) > mag ? "physical" : "stun";
  },
  /** Moniteur unique (8 + CON/2, posé sur pnj.me) par défaut : le Drain y
      ajoute des cases, sans distinction Physique/Étourdissant (un seul
      moniteur). Si le réglage separateMonitors était actif à la génération
      du PNJ (pnj.stunMon posé, cf. generate()), on bascule Phys/Étourd comme
      SR5. Renvoie `{ field, delta }` réellement appliqué (annulation d'une
      Seconde chance sur le Drain). */
  applyDrainDamage(pnj, amount, type) {
    if (!amount) return { field: "physFilled", delta: 0 };
    if (pnj.stunMon !== undefined) {
      const field = type === "physical" ? "physFilled" : "stunFilled";
      const max = type === "physical" ? pnj.physMon : pnj.stunMon;
      const before = pnj[field] || 0;
      pnj[field] = Utils.clamp(before + amount, 0, max ?? 99);
      return { field, delta: pnj[field] - before };
    }
    const before = pnj.physFilled || 0;
    pnj.physFilled = Utils.clamp(before + amount, 0, pnj.me ?? 99);
    return { field: "physFilled", delta: pnj.physFilled - before };
  },
  /* ---- Tissage de forme complexe (T2 SR6) : même flux que SR5 (MagicAction,
     kind:"complexForm"), mais trois différences de RÈGLE portées ici, jamais
     par une branche côté widget (p.191-193) :
     - pas de Niveau (technoFormUsesLevel:false → tissage direct, sans panneau) ;
     - Technodrain FIXE (nombre sur l'entrée) ou « succès » (Hacker vaillant,
       p.63 : le coût vaut le nombre de succès du tissage) ;
     - résistance Volonté + Logique (posée en generate/recalc, pas RES+VOL) ;
     - physique si VD APRÈS résistance > RES (comme le Drain des sorts SR6). ---- */
  /** Score Offensif d'une forme = Électronique + Résonance (p.191). Pic de
      Résonance déroge (Piratage) via `entry.skill`, lu par MagicAction. */
  technoFormSkill: "Électronique",
  /** SR6 : aucune forme n'a de Niveau (p.192) → pas de sélecteur, tissage
      direct (jumeau de `spellUsesForce: false`). */
  technoFormUsesLevel: false,
  technoCostLabel: "Technodrain",
  /** Technodrain d'une forme SR6 : valeur fixe (nombre sur l'entrée) ou, pour
      le régime « succès » de Hacker vaillant (p.63), le nombre de succès du
      tissage (`ctx.castHits` — total, pas les nets). `ctx.level` est ignoré
      (SR6 n'a pas de Niveau). */
  technoDrainValue(entry, ctx) {
    return entry.vt === "succès" ? ctx.castHits || 0 : Number(entry.vt) || 0;
  },
  /** Type de dégâts du Technodrain (p.191) : SR6 tranche sur la VD APRÈS
      résistance — Physique si elle dépasse la Résonance, sinon Étourdissant
      (même logique que le Drain des sorts SR6, RES au lieu de MAG). */
  technoDrainType(ctx, pnj) {
    const res = Actor.attr(pnj, "RES");
    return (ctx.drainDamage || 0) > res ? "physical" : "stun";
  },
  /** Catalogue de formes complexes pour l'EditModal (mirroir sr5). */
  complexFormCatalog() {
    return Content.complexFormCatalogFor(this.id);
  },
  ratingBadge: {
    field: "proRating",
    label: "Professionnalisme",
    options: null,
  },
  /** Réglage propre à SR6 remonté ici (prohibition n°1). Reçoit Settings (S). */
  settingsHTML(S) {
    const sep = S.get("separateMonitors", false);
    return `<div class="settings-section">
      <h3>Moniteur de condition</h3>
      <p>Par défaut, les PNJ SR6 ont un moniteur unique. Vous pouvez activer les moniteurs séparés (physique + étourdissement).</p>
      <div class="radio-group">
        ${S._radio("separateMonitors", "false", "Moniteur unique (standard SR6)", !sep)}
        ${S._radio("separateMonitors", "true", "Moniteurs séparés (Physique + Étourd.)", sep)}
      </div>
      <p class="settings-note">Ce réglage s'applique aux PNJ générés après ce point.</p>
    </div>`;
  },
  /** Initiative chiffrée (base + dés) pour le tracker de combat : lue sur
      pnj.initBase/pnj.initDice, posés par generate() (Réaction + Intuition). */
  initiativeFor(pnj) {
    return { base: pnj.initBase, dice: pnj.initDice };
  },
  /** Spec d'un combattant CI lancé dans l'initiative. Init du livre SR6 :
      Traitement de données ×2 + 3D6 (p.188). La règle vit ici (prohibition
      n°1) ; repli sur l'indice si le serveur n'a pas d'attributs ASDF posés. */
  icCombatant(ic, srv) {
    const td = (srv.attrs && srv.attrs.dataProcessing) || srv.indice;
    return { name: ic.label, initBase: td * 2, initDice: 3 };
  },
  /** Budget d'actions du tour actif (vérifié Livre de base p.42) — 1 majeure
      + 1 mineure de base, +1 mineure par dé d'initiative (max 5 dés → 6 mineures).
      Lu par le tracker via l'API neutre, jamais une branche d'édition. */
  actionBudget(pnj) {
    return [
      { key: "major", label: "Majeure", total: 1 },
      {
        key: "minor",
        label: "Mineures",
        total: Math.min(1 + (pnj.initDice || 1), 6),
      },
    ];
  },
  /** Règles de round pour le tracker de combat. SR6 : l'initiative est
      relancée à chaque round mais il n'y a plus de passes d'initiative
      (une seule passe par round, p.44) → `passDecrement: 0`. */
  /** edgeTracker : SR6 pilote l'Atout en combat (rangée de 7 jetons sur
      la fiche active, gain plafonné à +2/tour de personnage, p.50). Le tracker
      lit ce drapeau, jamais une branche d'édition. */
  combatModel: { rerollEachRound: true, passDecrement: 0, edgeTracker: true },
  /** Disposition de combat (Vague D) : { down, morale }. SR6 « figurants »
      (p.211) : DEUX couches. Groupe (comme SR5) selon le Professionnalisme sur
      la proportion d'alliés hors de combat ; et individuel — si les cases de
      dommages cochées dépassent le Professionnalisme, test de Sang-froid pour
      décamper ('shaky'). down = moniteur unique plein (isDestroyed). */
  combatDisposition(pnj, group) {
    const down = this.conditionMonitor.isDestroyed(pnj);
    if (down) return { down: true, morale: null };
    const pr = pnj.proRating;
    if (pr == null) return { down: false, morale: null };
    let flee = false;
    if (group && group.total) {
      const frac = group.down / group.total;
      if (pr <= 0)
        flee = group.down >= 1; // 0 : un neutralisé → les autres fuient
      else if (pr <= 4)
        flee = frac > 0.25; // 1-4 : > ¼ perdus → retraite
      else if (pr <= 7)
        flee = frac > 0.5; // 5-7 : > ½ → retraite en tirant
      else flee = false; // 8-10 : élite, ne cède jamais
    }
    if (flee) return { down: false, morale: "flee" };
    // Individuel : cases cochées > Professionnalisme → test de Sang-froid.
    const boxes = pnj.physFilled || 0;
    if (pr <= 7 && boxes > pr) return { down: false, morale: "shaky" };
    return { down: false, morale: "steady" };
  },
  summonPower: {
    field: "force",
    label: "Puissance",
    steps: () =>
      [2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: n, label: String(n) })),
  },
  skillModel: { shape: "simple", valRange: [1, 12], hasGroups: false },
  hasEdges: false,
  /** Attribut MAG chiffré (mécanique identique à SR5) : absent en Anarchy
      (magie narrative, pas d'attribut). Gate EditModal — MAG toujours
      affiché (0 par défaut, éditable) + verrouille Sorts/Pouvoirs à 0. */
  magicAttr: "MAG",
  /** Attribut RES chiffré, jumeau de magicAttr — même gate EditModal. */
  resonanceAttr: "RES",
  /** Verrou d'accès arcanique pour l'EditModal (contrat neutre, cf. sr5.js).
      `discipline` ∈ {"magic","resonance"}. Gate sur l'attribut chiffré. */
  arcaneLock(pnj, discipline) {
    const attr = discipline === "resonance" ? this.resonanceAttr : this.magicAttr;
    if (!attr || Actor.attr(pnj, attr) > 0) return null;
    const what = discipline === "resonance" ? "de la Résonance" : "de la Magie";
    return { hint: `Nécessite ${what} (${attr} > 0).` };
  },
  /** Régime persona SR6 — lu par Resonance via App.editionModule.technoModel.
      Mappage attributs mentaux → matriciels identique à SR5 (p.191, table
      « Équivalences des attributs mentaux/matriciels »), PLUS un pool de
      points bonus égal à la Résonance, répartissable par le joueur
      (`redistributable: true`) : cap ⌈50 % de l'attribut mental de base⌉,
      max +4 par attribut (p.191). */
  technoModel: {
    label: "Résonance",
    resonanceAttr: "RES",
    livingPersona: true,
    redistributable: true,
  },
  /** Régime Initiation/Submersion SR6, lu par Esoteric via
      App.editionModule.esotericModel[voie]. Coût Karma (10 + Grade),
      p.169-170 (Initiation) / p.197 (Submersion, même table). Délai NON
      motorisé : le livre se contredit lui-même (1 mois/jet p.169 vs
      (Grade+1) mois forfait p.71, jamais reliés — arbitrage 4). */
  esotericModel: {
    initiation: { attr: "MAG", acquisLabel: "Métamagie", costLabel: "Karma", cost: (grade) => 10 + grade },
    submersion: { attr: "RES", acquisLabel: "Écho", costLabel: "Karma", cost: (grade) => 10 + grade },
  },
  /** Connaissances éditables à la main (nom libre + catégorie →
      Logique/Intuition, cf. SkillCatalog.knowledgeCategories) — modèle
      absent en Anarchy (pas de pool de connaissances chiffré). */
  hasKnowledges: true,
  /** Neutre : les drogues SR6 sont des équipements, pas des atouts au
      choix (concept propre à Anarchy 2.0 p.150). */
  drugModel: { matchAll: false },
  /** Invocation d'esprits : SR6 invoque via Conjuration,
      types = éléments classiques (Spirits.SR_TYPES). */
  spiritModel: { canSummon: true, types: () => Spirits.SR_TYPES },
  /** Compilation de sprites (T3) : mêmes profils chiffrés qu'en SR5
      (attrs matriciels ligne pour ligne), compétences Électronique/
      Piratage, +5 types de Hacker vaillant. Régime « sr ». */
  spriteModel: {
    regime: "sr",
    skillKey: "skillsSR6",
    types: () => ({ ...Sprites.SR_TYPES, ...Sprites.SR6_TYPES }),
    compilePower: {
      field: "level",
      label: "Niveau",
      steps: () => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: n, label: String(n) })),
    },
    /** Jet de compilation (T3c, Livre de base p.193) : Technomancie +
        Résonance contre **Niveau × 2** ; succès nets = tâches. Technodrain =
        **succès du sprite** (pas ×2 comme SR5), résisté VOL+LOG
        (pnj.technoDrainResist), physique si dégâts après résistance > RES
        (technoDrainType SR6, régime dégâts). */
    compileSkill: "Technomancie",
    compileOpposeDice: (level) => level * 2,
    compileFading: (spriteHits) => spriteHits,
    /** Décompilation (p.194) — inverse de la compilation, jumeau du
        bannissement. Test opposé Technomancie + Résonance contre Niveau du
        sprite (+ Résonance du compilateur si inscrit — noter : Niveau simple,
        pas ×2 comme la compilation) ; chaque succès net retire une tâche.
        **Aucun Technodrain** (ni règle ni exemple ne l'évoquent, p.194) →
        `decompileFading: null`, asymétrie assumée avec le bannissement SR6. */
    decompileSkill: "Technomancie",
    decompileOppose: (sprite, ownerRes) =>
      (sprite.level || 0) + (sprite.registered ? ownerRes || 0 : 0),
    decompileEffect: "tasks",
    decompileFading: null,
  },
  /** Réserves de dés et initiative des véhicules/drones liés : pas de
      distinction Attaque/Capteurs séparée sur l'Autopilote (Score
      Offensif direct via autosoft + Senseurs), Encaissement = Structure
      seule (pas de Blindage ajouté en SR6, cf. Riggers p.203-208). */
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
        d'attaque autonome, distinct de l'autopilote (Riggers p.203-208). */
    formExtraFields: [["autosoft", "Autosoft"]],
    pools(v) {
      const s = v.stats || {};
      const autosoft = s.autosoft || s.pilote || s.autopilote || 0;
      return [
        {
          label: "Attaque",
          pool: autosoft + (s.senseurs || 0),
          title: "Autosoft Acquisition + Senseurs",
          weaponOnly: true,
        },
        {
          label: "Défense",
          pool: (s.pilote || 0) + autosoft,
          title: "Autopilote + autosoft Évasion",
        },
        {
          label: "Perception",
          pool: autosoft + (s.senseurs || 0),
          title: "Autosoft Acuité + Senseurs",
        },
        {
          label: "Encaissement",
          pool: s.structure || 0,
          title: "Résistance aux dommages : Structure",
        },
      ];
    },
    initiative(v) {
      const p = (v.stats && v.stats.pilote) || 0;
      return { base: p * 2, dice: 4 };
    },
  },
  /** Bloc « mécanique de table » du PJ léger.
      SR6 standard = UN SEUL moniteur d'état (champ `me`) — mais le réglage
      `separateMonitors` (cf. `settingsHTML` plus haut, option de table
      p.??) bascule vers deux pistes Phys/Étourd séparées, comme SR5.
      `monitorKind` est ici une fonction (résolue à chaque lecture, pas au
      moment de la création du PJ léger — il n'a pas de « génération » où
      baker la valeur) plutôt qu'une chaîne fixe : signalé en vérifiant que
      `separateMonitors` n'était en réalité consulté nulle part ailleurs
      dans le code (mort partout, y compris pour les PNJ complets — bug
      pré-existant hors scope, signalé séparément). `monitorMaxKey` indique
      quel champ porte la capacité (saisie MJ, le PJ léger n'a pas
      d'attribut CON pour la dériver). */
  /** Réputation SR6 (p.239-241) : un seul score de Réputation (peut être
      NÉGATIF, selon les seuils favorables/défavorables) + la Pression (menace
      des autorités, accumulée en fin de séance). Le registre de campagne
      encaisse nativement les deltas négatifs et l'accumulation (cf. Campaign). */
  reputationTracks: [
    { key: "reputation", label: "Réputation" },
    { key: "pression", label: "Pression" },
  ],

  pcTableBlock: {
    fields: [
      { key: "initBase", label: "Initiative (base)", kind: "number" },
      { key: "initDice", label: "Dés d'initiative", kind: "number" },
      { key: "defense", label: "Indice de défense", kind: "number" },
      { key: "perception", label: "Perception", kind: "number" },
      { key: "volonte", label: "Volonté", kind: "number" },
    ],
    monitorKind: () =>
      Settings.get("separateMonitors", false) ? "double" : "single",
    monitorMaxKey: "me",
  },
  /** Malus de dés dû aux effets MAINTENUS : −2 dés à tout test d'action par
      sort (p.136, « Coûts de maintien ») OU forme complexe (p.129) maintenu,
      cumulatif. Compte neutre (Utils.sustainedCount), mapping −2/effet propre
      à SR6. */
  sustainMalus(pnj) {
    return Utils.sustainedCount(pnj) * 2;
  },
  /** Malus de dés lié aux cases de moniteur remplies : −1D par tranche de
      3 cases. Modèle par défaut = moniteur d'état unique (8 + CON/2), mais
      un PNJ généré avec separateMonitors actif porte physMon/stunMon (comme
      SR5, cf. generate()) — chaque fonction ci-dessous bascule sur la
      présence de `stunMon` plutôt que de relire le réglage courant, pour
      rester fidèle au modèle figé à la génération du PNJ. */
  conditionMonitor: {
    model:
      "moniteur d'état unique (8 + CON/2), ou séparé Phys/Étourd (8+CON/2 / 8+VOL/2) si separateMonitors",
    fields: { primary: "me" },
    woundMalus(pnj) {
      // Compensateur de dommages (p.301) ignore N cases pour
      // les modificateurs de blessure — mécanique identique à SR5.
      const ignore = Utils.woundBoxesIgnored(pnj);
      if (pnj.stunMon !== undefined) {
        // p.43 : -1 par rangée PLEINE, cumulé sur les deux moniteurs — donc
        // par piste puis somme (cf. Utils.woundMalusTracks), pas sur le total.
        return Utils.woundMalusTracks(
          pnj.physFilled,
          pnj.stunFilled,
          3,
          ignore,
        );
      }
      // Moniteur d'état unique (`me`) : une seule piste, rien à répartir.
      return Math.floor(Math.max(0, (pnj.physFilled || 0) - ignore) / 3);
    },
    /** Moniteur d'un esprit invoqué : (Puissance/2)+8, p.224 — distinct
        de la formule PNJ (basée sur CON) puisqu'un esprit n'a pas de
        CON à proprement parler. */
    spiritMonitor(force) {
      return Math.ceil((force || 0) / 2) + 8;
    },
    /** Forme du moniteur d'un véhicule/drone lié : "total" (monTotal/
        monFilled, ⌈Structure/2⌉+8) en SR5/SR6, cf. vehicles.js:_monitor. */
    vehicleFields: "total",
    /** Détruit : véhicule/drone dont le moniteur total est plein, esprit
        dont le moniteur unique (me, cf. spirits.js:_spawnSR) est plein, ou
        PNJ dont la piste Physique (physMon) est pleine en mode séparé —
        cohérent avec SR5, seul le Physique compte pour la destruction. */
    isDestroyed(entity) {
      // Sprite = entité matricielle : moniteur `matFilled`/`matrixMonitor`
      // (universel, cf. Utils.matrixDestroyed), jamais le moniteur chair.
      if (entity.type === "sprite") return Utils.matrixDestroyed(entity);
      if (entity.type === "vehicle")
        return (
          (entity.monTotal || 0) > 0 &&
          (entity.monFilled || 0) >= entity.monTotal
        );
      if (entity.stunMon !== undefined)
        return (
          (entity.physMon || 0) > 0 &&
          (entity.physFilled || 0) >= entity.physMon
        );
      return (entity.me || 0) > 0 && (entity.physFilled || 0) >= entity.me;
    },
    /** Mise hors de combat immédiate (Vague C) : remplit le moniteur unique
        (ou la piste Physique en mode séparé, total pour un véhicule, matriciel
        pour un sprite). Réversible par _resetMonitors (✚). */
    knockOut(entity) {
      if (entity.type === "sprite") Utils.matrixKnockOut(entity);
      else if (entity.type === "vehicle") entity.monFilled = entity.monTotal || 0;
      else if (entity.stunMon !== undefined)
        entity.physFilled = entity.physMon || 0;
      else entity.physFilled = entity.me || 0;
    },
    /** Descripteur de moniteur pour les jauges (barre fine + cases spectateur).
        Forme ÉCHELLE (`Utils.ladderGauge`) : moniteur unique `me`, ou les deux
        pistes cumulées en mode séparé (comme SR5). `null` si pas de moniteur. */
    gauge(entity) {
      if (entity.type === "sprite") return Utils.matrixGauge(entity);
      if (entity.type === "vehicle")
        return Utils.ladderGauge(entity.monFilled || 0, entity.monTotal || 0);
      if (entity.stunMon !== undefined)
        return Utils.ladderGauge(
          (entity.physFilled || 0) + (entity.stunFilled || 0),
          (entity.physMon || 0) + (entity.stunMon || 0),
        );
      return Utils.ladderGauge(entity.physFilled || 0, entity.me || 0);
    },
    /** Résultat NET de dégâts appliqué au moniteur — unique par défaut,
        ou piste Physique si `separateMonitors` (stunMon posé) ; `opts.type`
        ("phys"/"stun") ne sert qu'en mode séparé. */
    applyDamage(entity, n, opts) {
      const amount = Math.max(0, n || 0);
      const sep = entity.stunMon !== undefined;
      const type = sep && opts && opts.type === "stun" ? "stun" : "phys";
      const field = type === "stun" ? "stunFilled" : "physFilled";
      const max =
        type === "stun" ? entity.stunMon : sep ? entity.physMon : entity.me;
      const before = entity[field] || 0;
      entity[field] = Utils.clamp(before + amount, 0, max ?? 99);
      return { field, applied: entity[field] - before };
    },
    /** Descripteur neutre — la bascule P/S n'apparaît qu'en mode
        `separateMonitors` (sinon moniteur d'état unique, pas de type à choisir). */
    damageUI(entity) {
      const sep = entity && entity.stunMon !== undefined;
      return {
        kind: "numeric",
        chips: [1, 2, 3, 5],
        hasType: sep,
        defaultType: "phys",
      };
    },
  },
  /** Résolution du jet d'arme (WeaponRoll) : synergie smartgun/smartlink
      flat +1 (pas de distinction implanté/externe en SR6), pas de limite
      de précision (Score Offensif, pas de PRE), spécialité = +2 dés,
      armes lues dans pnj.equip. */
  weaponModel: {
    smartlinkBonus: { implanted: 1, external: 1 },
    accuracyLimit: false,
    specMechanic: "diceBonus",
    source: "equip",
    // SR6 renomme la Précision en Score Offensif (SO) ; le libellé de facette
    // remonte ici pour ne pas laisser fuir le mot SR5 dans le rendu neutre.
    // « PA » reste tel quel (Pénétration d'Armure de la facette d'objet) — à
    // ne pas confondre avec le Potentiel d'Actions, cf. helpLegend.
    facetLabels: { accuracy: "SO" },
  },

  /* Ordre d'affichage des armes sur la carte (léger → lourd), lu par
     `weaponCategoryRank`. Ce sont les clés d'`equipPools` : aucune
     nouvelle taxonomie, juste l'ordre où le catalogue les déclare déjà. */
  _WEAPON_CATEGORY_ORDER: [
    "meleeWeapons",
    "armesJet",
    "pistoletsPoche",
    "pistoletsLegers",
    "pistoletsAutomatiques",
    "pistoletsLourds",
    "tasers",
    "mitraillettes",
    "fusils",
    "shotguns",
    "snipersLourds",
    "armesSpeciales",
  ],

  /** Rang de tri d'une arme pour l'affichage carte (Mains nues → mêlée →
      pistolets → armes d'épaule → lourd). Plus petit = affiché plus tôt.
      Match direct dans `equipPools` (les armes du catalogue sont poussées
      telles quelles dans `pnj.equip`) ; repli par famille de combat pour
      un nom hors catalogue (import, arme custom). */
  weaponCategoryRank(name) {
    if (WeaponRoll.isUnarmed(name)) return -1;
    for (let i = 0; i < this._WEAPON_CATEGORY_ORDER.length; i++) {
      const key = this._WEAPON_CATEGORY_ORDER[i];
      const idx = (this.equipPools[key] || []).indexOf(name);
      if (idx !== -1) return i * 1000 + idx;
    }
    const tail = this._WEAPON_CATEGORY_ORDER.length * 1000;
    const family = WeaponRoll.combatFamily(name, "sr6");
    return family === "melee" ? tail : tail + 100000;
  },

  /* Régime Matrice SR6 — lu par Matrix via App.editionModule.matrixModel.
     Comme SR5 (CI à jets de dés, attributs ASDF) mais Score de Surveillance
     par accès illégaux maintenus (p.178) et pas d'encaissement de CI ni de
     limite d'attribut. Réutilise les profils d'indice de SR5. */
  matrixModel: {
    hasAttrs: true,
    indiceRange: [1, 12],
    profileKey: "sr5",
    // Brickage d'appareil — SR6 a le même moniteur matriciel d'appareil
    // que SR5 (8+Indice/2 arrondi sup., p.182) : cases cliquables + indice.
    deviceBricking: "monitor",
    // Cf. sr5.js — taxonomie tranchée. `matrice`/`tasers` OUI (spécifique
    // SR6) ; cyberware/equipSpecial restent NON par défaut (override regex).
    connectedByCat: {
      commlinks: true,
      cyberdecks: true,
      matrice: true,
      tasers: true,
      pistoletsPoche: false,
      pistoletsLegers: false,
      pistoletsAutomatiques: false,
      pistoletsLourds: false,
      mitraillettes: false,
      shotguns: false,
      armesJet: false,
      armesSpeciales: false,
      fusils: false,
      snipersLourds: false,
      meleeWeapons: false,
      armesSupplement: false,
      armures: false,
      grenades: false,
      roquettes: false,
      explosifs: false,
      cyberware: false,
      bioware: false,
      equipSpecial: false,
    },
    icMonitorSize(indice) {
      return 8 + Math.ceil(indice / 2);
    },
    /** Descripteur de combat d'une CH (SR6), lu par le cockpit + les handlers de
        jet via Matrix.icCombat. « Toutes les CH utilisent indice×2 pour la
        majorité de leurs jets » (p.188) → attaque/défense/perception = indice×2.
        Encaissement = indice×2 aussi : on résiste aux dommages matriciels « avec
        Firewall » (p.180), sans règle de soak dédiée aux CH → on applique la
        convention CH indice×2 (et NON indice + Firewall, qui n'est pas au livre). */
    icCombat(kind, host) {
      const i = host.indice;
      if (kind === "atk") return { roll: true, pool: i * 2, limit: this.attrLimit("atk", host), suffix: "attaque" };
      if (kind === "def") return { roll: true, pool: i * 2, limit: null, suffix: "défense" };
      if (kind === "soak") return { roll: true, pool: i * 2, limit: null, suffix: "encaissement" };
      if (kind === "per") return { roll: true, pool: i * 2, limit: this.attrLimit("per", host), suffix: "perception matricielle" };
      return null;
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
    overwatchDelta(illUser, illAdmin) {
      return illUser * 1 + illAdmin * 3;
    },
    pickCount(indice, candLen) {
      return Utils.clamp(
        2 + Math.ceil(indice / 3) + Utils.randInt(-1, 1),
        2,
        candLen,
      );
    },
    icThresholdsText(srv) {
      const a = srv.attrs || {};
      return `jets ${srv.indice * 2} dés · SO ${(a.attack || 0) + (a.sleaze || 0)} · moniteur ${this.icMonitorSize(srv.indice)} cases · init TdD×2+3D6 · max ${srv.indice} CI active${srv.indice > 1 ? "s" : ""}`;
    },
    actionRoll(kind, srv) {
      const i = srv.indice;
      if (kind === "per")
        return {
          txt: `Perception ${i * 2}d`,
          tip: "Perception matricielle de la Patrouilleuse : indice × 2",
        };
      if (kind === "atk")
        return {
          txt: `Attaque ${i * 2}d`,
          tip: "Jet d'attaque de la CI : indice × 2 (p.188)",
        };
      if (kind === "def")
        return {
          txt: `Défense ${i * 2}d`,
          tip: "Jet de défense de la CI : indice × 2 (p.188)",
        };
      return null;
    },
    convergenceText() {
      return "l'appareil de la dernière action illégale est brické, éjection avec choc, localisation signalée aux autorités (p.178).";
    },
    /** T6c — asymétrie SR6 (p.195) : un sprite accumule un SS comme toute
        entité matricielle ; à la Convergence il disparaît ET révèle la
        position physique du technomancien qui l'a compilé. Le bandeau de
        convergence nomme alors les compilateurs de sprites en jeu. */
    spriteConvergenceReveal: true,
    attrLimit() {
      return null;
    },
    /** Score Défensif matriciel (p.177) = Traitement de données + Firewall
        de la cible — pool d'opposition de Forcer l'accès / Sonder l'accès
        (p.183/186), miroir des marks SR5 mais chiffré plutôt que compté.
        Backlog "Score Défensif / accès SR6", vérifié au livre 2026-07-14. */
    defenseScore(srv) {
      const a = srv.attrs || {};
      return (a.dataProcessing || 0) + (a.firewall || 0);
    },
    /** Les 3 niveaux d'accès matriciels (p.179), dans l'ordre de progression. */
    accessLevels: ["Invité", "Utilisateur", "Administrateur"],
  },

  /* Régime cyberdeck SR6 — 4 attributs ACTF, réallouables. Reconfigurer
     les attributs matriciels (I) : Légale, action Mineure, aucun test, aucun
     accès nécessaire — échange les valeurs de deux attributs non nuls du
     persona matriciel, change aussi les programmes actifs (p.185). Confirmé
     au livre par l'utilisateur (traducteur officiel Anarchy, 2026-07-13).
     Moniteur/Score Défensif. */
  cyberdeckModel: {
    attrKeys: ["attack", "sleaze", "dataProcessing", "firewall"],
    reallocatable: true,
    reallocCostLabel: "action mineure (p.185)",
    hasReroll: false,
    hasBiofeedbackFilter: false,
    label: "Cyberdeck",
    /** Moniteur du deck ≈ 8 + (Indice/2), comme SR5 (à confirmer au
        livre) — même approximation « attribut le plus élevé = Indice ». */
    monitorSize(deck) {
      const vals = Object.values((deck && deck.attrs) || {});
      const top = vals.length ? Math.max(...vals) : 0;
      return 8 + Math.ceil(top / 2);
    },
    /* Catalogue d'actions matricielles OFFENSIVES. SR6 remplace les marks
       par l'accès (Invité/Utilisateur/Admin), d'où « Forcer l'accès » (dépend
       de l'Attaque, p.183) et « Sonder l'accès » (dépend de la Corruption,
       p.186) au lieu des actions de markage SR5. Pool simplifié = attribut du
       deck concerné ; VD chiffrée pour le pic de données (p.184, même modèle de
       dommages matriciels que SR5, VD = indice d'Attaque). */
    actions: [
      {
        key: "spike",
        name: "Pic de données",
        type: "attack",
        page: 184,
        pool: (d) => (d.attrs || {}).attack || 0,
        dv: (d) => (d.attrs || {}).attack || 0,
      },
      {
        key: "forceaccess",
        name: "Forcer l'accès",
        type: "access",
        page: 183,
        pool: (d) => (d.attrs || {}).attack || 0,
        dv: () => null,
      },
      {
        key: "probeaccess",
        name: "Sonder l'accès",
        type: "access",
        page: 186,
        pool: (d) => (d.attrs || {}).sleaze || 0,
        dv: () => null,
      },
      {
        key: "crash",
        name: "Planter un programme",
        type: "crash",
        page: 184,
        pool: (d) => (d.attrs || {}).attack || 0,
        dv: () => null,
      },
    ],
    /* Programmes matriciels (chapitre Matrice, p.187 ; collecte 2026-07-15).
       La plupart des effets SR6 touchent des actions non codées (Crypter/Éditer/
       Se cacher…) ou le Score Offensif/Défensif (non stocké comme attribut de
       deck ici) → `effect: null`. Motorisés : Toolbox (+1 Traitement de données,
       via `attr`, visible sur la carte) et Overclock (+2 dés à une action
       matricielle, `poolAll`). */
    programs: [
      { key: "configurateur", name: "Configurateur", page: 187, effect: null }, // config alternative rechargeable
      { key: "cryptage", name: "Cryptage", page: 187, effect: null }, // +2 dés « Crypter un fichier » (action non codée)
      { key: "editeur", name: "Éditeur", page: 187, effect: null }, // remise d'Atout sur « Éditer un fichier »
      {
        key: "machine-virtuelle",
        name: "Machine virtuelle",
        page: 187,
        effect: null,
      }, // +2 emplacements, +1 case dégât non résistée
      { key: "navigateur", name: "Navigateur", page: 187, effect: null }, // remise d'Atout sur les recherches
      {
        key: "nettoyeur-signal",
        name: "Nettoyeur de signal",
        page: 187,
        effect: null,
      }, // −2 Bruit
      { key: "surveillance", name: "Surveillance", page: 187, effect: null }, // affiche le Score de Surveillance
      {
        key: "toolbox",
        name: "Toolbox",
        page: 187,
        effect: { attr: { dataProcessing: 1 } },
      }, // +1 Traitement de données
      { key: "armure", name: "Armure", page: 187, effect: null }, // +2 Score Défensif (non stocké comme attribut de deck)
      { key: "biofeedback", name: "Biofeedback", page: 187, effect: null }, // change le type de dégâts (lié à Attaque)
      { key: "blackout", name: "Blackout", page: 187, effect: null }, // dégâts étourdissants (lié à Attaque)
      { key: "decryptage", name: "Décryptage", page: 187, effect: null }, // +2 dés « Décrypter un fichier » (action non codée)
      { key: "desamorcage", name: "Désamorçage", page: 187, effect: null }, // encaisser une bombe avec Indice/CON
      { key: "exploitation", name: "Exploitation", page: 187, effect: null }, // +2 Score Offensif (non stocké comme attribut de deck)
      {
        key: "filtre-biofeedback",
        name: "Filtre de biofeedback",
        page: 187,
        effect: null,
      }, // encaisser le biofeedback avec Indice/CON
      { key: "fork", name: "Fork", page: 187, effect: null }, // touche deux cibles en une action
      { key: "furtivite", name: "Furtivité", page: 187, effect: null }, // remise d'Atout sur « Se cacher »
      {
        key: "overclock",
        name: "Overclock",
        page: 187,
        effect: { poolAll: 2 },
      }, // +2 dés à une action matricielle
      { key: "traceur", name: "Traceur", page: 187, effect: null }, // remise d'Atout sur « Traquer une icône »
      { key: "verrouillage", name: "Verrouillage", page: 187, effect: null }, // verrouillage de connexion sur dégât
    ],
  },

  /* ----
     ATTRIBUTS PAR MÉTATYPE — table officielle p.69 LdB SR6
     Format : [min, max]
  ---- */
  attrRange: {
    Humain: {
      CON: [1, 6],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 7],
    },
    Elfe: {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 8],
      ATO: [1, 6],
    },
    Nain: {
      CON: [1, 7],
      AGI: [1, 6],
      RÉA: [1, 5],
      FOR: [1, 8],
      VOL: [1, 7],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Ork: {
      CON: [1, 8],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 8],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 5],
      ATO: [1, 6],
    },
    Troll: {
      CON: [1, 9],
      AGI: [1, 5],
      RÉA: [1, 6],
      FOR: [1, 9],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 5],
      ATO: [1, 6],
    },
    // --- Métavariantes Elfes (Compagnon p.77) ---
    Dalakitnon: {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 8],
      INT: [1, 7],
      CHA: [1, 8],
      ATO: [1, 6],
    },
    Dryade: {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 5],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 8],
      ATO: [1, 6],
    },
    Nocturna: {
      CON: [1, 5],
      AGI: [1, 8],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 6],
    },
    Wakyambi: {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 7],
    },
    "Xapiri thëpë": {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 6],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 6],
    },
    // --- Métavariantes Humains (Compagnon p.79) ---
    Nartaki: {
      CON: [1, 8],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 8],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Valkyrie: {
      CON: [1, 7],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    // --- Métavariantes Nains (Compagnon p.81-82) ---
    Duende: {
      CON: [1, 7],
      AGI: [1, 6],
      RÉA: [1, 8],
      FOR: [1, 6],
      VOL: [1, 7],
      LOG: [1, 6],
      INT: [1, 7],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Gnome: {
      CON: [1, 4],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 4],
      VOL: [1, 7],
      LOG: [1, 7],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Hanuman: {
      CON: [1, 6],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 7],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Koborokuru: {
      CON: [1, 7],
      AGI: [1, 6],
      RÉA: [1, 7],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Menehune: {
      CON: [1, 7],
      AGI: [1, 7],
      RÉA: [1, 5],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    // --- Métavariantes Orks (Compagnon p.84-85) ---
    Hobgobelin: {
      CON: [1, 6],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 6],
    },
    Ogre: {
      CON: [1, 9],
      AGI: [1, 6],
      RÉA: [1, 5],
      FOR: [1, 8],
      VOL: [1, 7],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    Oni: {
      CON: [1, 8],
      AGI: [1, 7],
      RÉA: [1, 6],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 6],
    },
    Satyre: {
      CON: [1, 7],
      AGI: [1, 6],
      RÉA: [1, 7],
      FOR: [1, 7],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 6],
      ATO: [1, 6],
    },
    // --- Métavariantes Trolls (Compagnon p.86-88) ---
    Cyclope: {
      CON: [1, 9],
      AGI: [1, 5],
      RÉA: [1, 6],
      FOR: [1, 10],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 5],
      ATO: [1, 6],
    },
    Fomori: {
      CON: [1, 9],
      AGI: [1, 6],
      RÉA: [1, 6],
      FOR: [1, 8],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 7],
      ATO: [1, 6],
    },
    Géant: {
      CON: [1, 9],
      AGI: [1, 5],
      RÉA: [1, 6],
      FOR: [1, 10],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 5],
      ATO: [1, 6],
    },
    Minotaure: {
      CON: [1, 10],
      AGI: [1, 5],
      RÉA: [1, 6],
      FOR: [1, 9],
      VOL: [1, 6],
      LOG: [1, 6],
      INT: [1, 6],
      CHA: [1, 5],
      ATO: [1, 6],
    },
  },

  /* ----
     ATTRIBUTS DE BASE PAR PROFESSIONNALISME
     Calibrés sur les 20 PNJ de référence p.212-220
     Prof 0-10 (0=inexpérimenté, 10=élite des forces spéciales)
  ---- */
  attrByProf: {
    0: { CON: 2, AGI: 2, RÉA: 2, FOR: 2, VOL: 2, LOG: 2, INT: 2, CHA: 1 },
    1: { CON: 2, AGI: 2, RÉA: 2, FOR: 2, VOL: 2, LOG: 2, INT: 2, CHA: 1 },
    2: { CON: 3, AGI: 2, RÉA: 2, FOR: 4, VOL: 2, LOG: 1, INT: 2, CHA: 1 },
    3: { CON: 3, AGI: 3, RÉA: 3, FOR: 3, VOL: 3, LOG: 2, INT: 3, CHA: 2 },
    4: { CON: 3, AGI: 4, RÉA: 4, FOR: 3, VOL: 4, LOG: 4, INT: 4, CHA: 3 },
    5: { CON: 4, AGI: 3, RÉA: 3, FOR: 4, VOL: 4, LOG: 4, INT: 4, CHA: 3 },
    6: { CON: 4, AGI: 4, RÉA: 5, FOR: 4, VOL: 5, LOG: 5, INT: 5, CHA: 3 },
    7: { CON: 5, AGI: 5, RÉA: 5, FOR: 4, VOL: 5, LOG: 4, INT: 5, CHA: 4 },
    8: { CON: 6, AGI: 5, RÉA: 6, FOR: 5, VOL: 5, LOG: 5, INT: 6, CHA: 4 },
    9: { CON: 5, AGI: 7, RÉA: 5, FOR: 6, VOL: 4, LOG: 6, INT: 6, CHA: 6 },
    10: { CON: 5, AGI: 6, RÉA: 5, FOR: 5, VOL: 5, LOG: 4, INT: 6, CHA: 5 },
  },

  /* Modificateurs métatype sur la base des PNJ (p.212) */
  metaMod: {
    Humain: {},
    Elfe: { AGI: +1, CHA: +2 },
    Nain: { CON: +2, FOR: +2, VOL: +1, RÉA: -1 },
    Ork: { CON: +3, FOR: +2, CHA: -1 },
    Troll: { CON: +4, FOR: +3, AGI: -1, CHA: -2 },
    // Métavariantes — mods supplémentaires vs métatype parent
    Dalakitnon: { AGI: +1, CHA: +2, LOG: +2 },
    Dryade: { AGI: +1, CHA: +2, FOR: -1 },
    Nocturna: { AGI: +2, CHA: +1, CON: -1 },
    Wakyambi: { AGI: +1, CHA: +1 },
    "Xapiri thëpë": { AGI: +1, CHA: +1 },
    Nartaki: { CON: +2, FOR: +2 },
    Valkyrie: { CON: +1, FOR: +1 },
    Duende: { CON: +1, RÉA: +2, VOL: +1, INT: +1 },
    Gnome: { CON: -2, FOR: -2, LOG: +1 },
    Hanuman: { AGI: +1, FOR: +1, INT: +1 },
    Koborokuru: { CON: +1, RÉA: +2, FOR: +1 },
    Menehune: { CON: +1, AGI: +1, RÉA: -1, FOR: +1 },
    Hobgobelin: { CHA: +2, FOR: +1 },
    Ogre: { CON: +5, FOR: +4, RÉA: -1 },
    Oni: { CON: +4, AGI: +1, FOR: +3, CHA: +2 },
    Satyre: { CON: +3, AGI: +1, RÉA: +3, FOR: +3 },
    Cyclope: { CON: +5, AGI: -1, FOR: +5, CHA: -1 },
    Fomori: { CON: +5, FOR: +3, CHA: +1 },
    Géant: { CON: +5, AGI: -1, FOR: +5, CHA: -1 },
    Minotaure: { CON: +6, AGI: -1, FOR: +4, CHA: -1 },
  },

  /** Archétype utilisé pour un spider (decker de sécurité lié à un serveur)
      — toujours le même en SR6. */
  spiderArchetype() {
    return "Decker freelance";
  },
  /** Valeur du champ "special" du générateur PNJ pour un spider. */
  spiderSpecial: "Decker",

  /** Bonus d'indice quand le serveur gère aussi la sécurité physique.
      Neutre : SR6 n'a pas cette règle (concept propre à Anarchy 2.0). */
  secPhysBonus: null,

  /* ---- Score Défensif de base par proRating ---- */
  sdByProf: {
    0: 2,
    1: 4,
    2: 5,
    3: 6,
    4: 6,
    5: 12,
    6: 14,
    7: 16,
    8: 15,
    9: 8,
    10: 16,
  },

  /* ---- Initiative ----
     Initiative = RÉA + INT + 1D6. Les dés supplémentaires viennent UNIQUEMENT
     des augmentations/pouvoirs (BonusEngine), jamais de la cote de prof :
     base 1D6 pour tout métahumain (`dice` = 1 partout). */
  initByProf: {
    0: { dice: 1 },
    1: { dice: 1 },
    2: { dice: 1 },
    3: { dice: 1 },
    4: { dice: 1 },
    5: { dice: 1 },
    6: { dice: 1 },
    7: { dice: 1 },
    8: { dice: 1 },
    9: { dice: 1 },
    10: { dice: 1 },
  },

  /* Plafond de dés d'initiative (max 5D6). Lu par BonusEngine. */
  maxInitDice: 5,

  /* Sources de dés d'initiative issues des livres (cyber/bioware), reconnues
     par BonusEngine.CYBER_BONUS. Pool DÉDIÉ pour varier l'origine des dés des
     combattants mundains (pas toujours « Réflexes câblés »). */
  initAugPool: [
    { label: "Réflexes câblés 1 [+1D6 initiative, +1 PA MIN]", dice: 1 },
    { label: "Réflexes câblés 2 [+2D6 initiative, +1 PA]", dice: 2 },
    { label: "Réflexes câblés 3 [+3D6 initiative, +1 PA MAJ]", dice: 3 },
    { label: "Booster synaptique 1 [bioware, +1D6 initiative]", dice: 1 },
    { label: "Booster synaptique 2 [bioware, +2D6 initiative]", dice: 2 },
    { label: "Move-by-Wire 2 [+2D6 initiative]", dice: 2 },
  ],

  /** Tire une source d'init aléatoire, dés bornés par la cote (plafond 5D6
      final géré par BonusEngine). Renvoie un libellé. */
  initAugFor(proRating) {
    const maxBonus = proRating >= 6 ? 3 : 2;
    const eligible = this.initAugPool.filter((s) => s.dice <= maxBonus);
    return Utils.rand(eligible).label;
  },

  /* ---- Potentiel d'actions par prof ---- */
  paByProf: {
    0: "MAJ 1, MIN 2",
    1: "MAJ 1, MIN 2",
    2: "MAJ 1, MIN 2",
    3: "MAJ 1, MIN 2",
    4: "MAJ 1, MIN 2",
    5: "MAJ 1, MIN 3",
    6: "MAJ 1, MIN 4",
    7: "MAJ 1, MIN 4",
    8: "MAJ 1, MIN 5",
    9: "MAJ 1, MIN 4",
    10: "MAJ 1, MIN 6",
  },

  /* ---- Options du formulaire ---- */
  formOptions: {
    meta: [
      "Aléatoire",
      // Métatypes de base
      "Humain",
      "Elfe",
      "Nain",
      "Ork",
      "Troll",
      // Métavariantes Elfes
      "Dalakitnon",
      "Dryade",
      "Nocturna",
      "Wakyambi",
      "Xapiri thëpë",
      // Métavariantes Humains
      "Nartaki",
      "Valkyrie",
      // Métavariantes Nains
      "Duende",
      "Gnome",
      "Hanuman",
      "Koborokuru",
      "Menehune",
      // Métavariantes Orks
      "Hobgobelin",
      "Ogre",
      "Oni",
      "Satyre",
      // Métavariantes Trolls
      "Cyclope",
      "Fomori",
      "Géant",
      "Minotaure",
    ],
    gender: ["Aléatoire", "M", "F", "NB"],
    proRating: [
      "Aléatoire",
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
    ],
    archetype: [
      "Aléatoire",
      // Bas de l'échelle
      "Civil",
      "Voyou de rue",
      "Décérébré / Foule en colère",
      // Gangs
      "Ganger de rue",
      "Ganger vétéran",
      "Go-ganger",
      "Chef de gang",
      "Ganger Halloweeners",
      "Ganger Ancients",
      "Magogang (éveillé)",
      "Techno-ganger (émergé)",
      // Sécurité corpo
      "Agent de sécurité corpo",
      "Garde corpo (patrouille)",
      "Rigger de sécurité",
      "Technomancien de sécurité",
      "Agent de sécurité Renraku",
      "Samouraï rouge Renraku",
      "Agent de sécurité Ares",
      "Séraphin Ares",
      "Agent de sécurité Aztechnology",
      "Commando Aztlan",
      "Équipe IHR DocWagon",
      // Police
      "Patrouilleur Lone Star",
      "Officier Knight Errant",
      "Détective Lone Star",
      "SWAT Lone Star",
      "Officier SWAT Knight Errant",
      "Mage combat Lone Star",
      // Crime organisé
      "Soldato Mafia",
      "Collecteur Mafia",
      "Gros bras Yakuza",
      "Maître des Lames Yakuza",
      "Coursier Triade",
      "Vory v Zakone",
      "Koshari",
      // Militaire & mercenaire
      "Soldat UCAS",
      "Commando NAN",
      "Wildcats Sioux",
      "Mercenaire freelance",
      "Mercenaire Ares",
      "Ghost de Tír",
      "Navy SEAL",
      "Force d'Intervention Spéciale Marines",
      // Spécialisés
      "Contrebandier",
      "Assassin freelance",
      "Espion industriel",
      "Cambrioleur professionnel",
      "Decker freelance",
      // Éveillés
      "Chaman urbain",
      "Adepte de rue",
      // Matrice & riggers
      "Technicien de terrain",
      // Corpo & contacts
      "Cadre corpo",
      "Agent corpo",
      "Négociateur corpo (Johnson)",
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
    ],
  },

  /* ---- Pools de compétences par archetype ---- */
  skillPools: {
    Civil: [
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
    ],
    "Voyou de rue": [
      "Athlétisme",
      "Armes à feu",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
    ],
    "Décérébré / Foule en colère": [
      "Athlétisme",
      "Combat rapproché",
      "Intimidation",
    ],
    "Ganger de rue": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Ganger vétéran": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Leadership",
      "Perception",
    ],
    "Go-ganger": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Influence",
      "Perception",
      "Pilotage",
      "Ingénierie",
    ],
    "Chef de gang": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Influence",
      "Intimidation",
      "Leadership",
      "Perception",
    ],
    "Ganger Halloweeners": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Ganger Ancients": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Magogang (éveillé)": [
      "Astral",
      "Combat rapproché",
      "Conjuration",
      "Influence",
      "Perception",
      "Sorcellerie",
    ],
    // Technomancien de rue — cœur matriciel (Électronique/Piratage) sur un
    // fond de ganger ; specialSkills.Technomancien ajoute la Résonance
    // (Compilation/Décompilation/Cybercombat). Base = compétences SR6 réelles.
    "Techno-ganger (émergé)": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Intimidation",
      "Piratage",
    ],
    "Agent de sécurité corpo": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Garde corpo (patrouille)": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Influence",
      "Perception",
    ],
    "Rigger de sécurité": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
      "Pilotage",
      "Piratage",
    ],
    // Antagoniste matriciel corpo (Anarchistes) — profil sécurité + intrusion ;
    // la Résonance vient de specialSkills.Technomancien.
    "Technomancien de sécurité": [
      "Armes à feu",
      "Athlétisme",
      "Électronique",
      "Ingénierie",
      "Perception",
      "Piratage",
    ],
    "Agent de sécurité Renraku": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Influence",
      "Perception",
    ],
    "Samouraï rouge Renraku": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Furtivité",
      "Perception",
    ],
    "Agent de sécurité Ares": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
    ],
    "Séraphin Ares": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Furtivité",
      "Perception",
    ],
    "Agent de sécurité Aztechnology": [
      "Armes à feu",
      "Astral",
      "Athlétisme",
      "Combat rapproché",
      "Influence",
      "Perception",
    ],
    "Commando Aztlan": [
      "Armes à feu",
      "Astral",
      "Athlétisme",
      "Combat rapproché",
      "Conjuration",
      "Furtivité",
      "Perception",
    ],
    "Équipe IHR DocWagon": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
      "Pilotage",
    ],
    "Patrouilleur Lone Star": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Officier Knight Errant": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Furtivité",
      "Influence",
      "Perception",
    ],
    "Détective Lone Star": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Influence",
      "Perception",
      "Piratage",
    ],
    "SWAT Lone Star": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Influence",
      "Perception",
    ],
    "Officier SWAT Knight Errant": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Influence",
      "Perception",
    ],
    "Mage combat Lone Star": [
      "Armes à feu",
      "Astral",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Conjuration",
      "Influence",
      "Perception",
      "Sorcellerie",
    ],
    "Soldato Mafia": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
      "Pilotage",
    ],
    "Collecteur Mafia": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
    ],
    "Gros bras Yakuza": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Influence",
      "Perception",
    ],
    "Maître des Lames Yakuza": [
      "Armes à feu",
      "Astral",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Furtivité",
      "Influence",
      "Perception",
    ],
    "Coursier Triade": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Furtivité",
      "Pilotage",
      "Perception",
    ],
    "Vory v Zakone": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Influence",
      "Intimidation",
      "Perception",
    ],
    Koshari: [
      "Armes à feu",
      "Astral",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Furtivité",
      "Pilotage",
    ],
    "Soldat UCAS": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
    ],
    "Commando NAN": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Furtivité",
      "Perception",
      "Survie",
    ],
    "Wildcats Sioux": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Ingénierie",
      "Perception",
      "Pilotage",
    ],
    "Mercenaire freelance": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
      "Pilotage",
    ],
    "Mercenaire Ares": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
    ],
    "Ghost de Tír": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Ingénierie",
      "Perception",
      "Pilotage",
    ],
    "Navy SEAL": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Furtivité",
      "Ingénierie",
      "Perception",
      "Piratage",
      "Pilotage",
    ],
    "Force d'Intervention Spéciale Marines": [
      "Armes à feu",
      "Athlétisme",
      "Biotech",
      "Combat rapproché",
      "Électronique",
      "Ingénierie",
      "Perception",
    ],
    Contrebandier: [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Pilotage",
    ],
    "Assassin freelance": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Escroquerie",
      "Furtivité",
      "Perception",
    ],
    "Espion industriel": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Piratage",
    ],
    "Cambrioleur professionnel": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Furtivité",
      "Ingénierie",
    ],
    "Decker freelance": [
      "Armes à feu",
      "Athlétisme",
      "Combat rapproché",
      "Électronique",
      "Escroquerie",
      "Piratage",
    ],
    // --- Éveillés ---
    "Chaman urbain": [
      "Sorcellerie",
      "Conjuration",
      "Astral",
      "Perception",
      "Influence",
      "Survie",
    ],
    "Adepte de rue": [
      "Combat rapproché",
      "Athlétisme",
      "Armes à feu",
      "Furtivité",
      "Perception",
      "Intimidation",
    ],
    // --- Matrice & riggers ---
    "Technicien de terrain": [
      "Électronique",
      "Ingénierie",
      "Piratage",
      "Perception",
      "Pilotage",
      "Biotech",
    ],
    // --- Corpo & contacts ---
    "Cadre corpo": [
      "Influence",
      "Leadership",
      "Perception",
      "Électronique",
      "Armes à feu",
      "Escroquerie",
    ],
    "Agent corpo": [
      "Armes à feu",
      "Combat rapproché",
      "Perception",
      "Influence",
      "Électronique",
      "Athlétisme",
    ],
    "Négociateur corpo (Johnson)": [
      "Influence",
      "Leadership",
      "Escroquerie",
      "Perception",
      "Armes à feu",
    ],
    "Mage salarié": [
      "Sorcellerie",
      "Conjuration",
      "Astral",
      "Perception",
      "Influence",
      "Électronique",
    ],
  },

  skillCount: {
    0: 3,
    1: 3,
    2: 4,
    3: 4,
    4: 5,
    5: 5,
    6: 6,
    7: 6,
    8: 7,
    9: 7,
    10: 8,
  },

  specialSkills: {
    Lieutenant: [
      { name: "Leadership", bonus: 3 },
      { name: "Intimidation", bonus: 2 },
    ],
    Decker: [
      { name: "Piratage", bonus: 5 },
      { name: "Électronique", bonus: 4 },
      { name: "Cybercombat", bonus: 5 },
    ],
    Rigger: [
      { name: "Pilotage", bonus: 5 },
      { name: "Ingénierie", bonus: 5 },
      { name: "Électronique", bonus: 3 },
    ],
    Adepte: [
      { name: "Combat rapproché", bonus: 3 },
      { name: "Furtivité", bonus: 2 },
    ],
    "Mage hermétique": [
      { name: "Conjuration", bonus: 4 },
      { name: "Sorcellerie", bonus: 4 },
      { name: "Astral", bonus: 4 },
    ],
    Chaman: [
      { name: "Conjuration", bonus: 5 },
      { name: "Sorcellerie", bonus: 3 },
      { name: "Astral", bonus: 4 },
    ],
    Technomancien: [
      { name: "Compilation", bonus: 5 },
      { name: "Cybercombat", bonus: 5 },
      { name: "Décompilation", bonus: 5 },
      { name: "Électronique", bonus: 4 },
    ],
  },

  spellsByTradition: {
    "Mage hermétique": [
      "Barrière physique",
      "Boule étourdissante",
      "Armure",
      "Clairvoyance",
      "Détection de la vie",
      "Éclair de force",
      "Lumière",
      "Silence",
      "Foudre",
    ],
    Chaman: [
      "Guérison",
      "Invisibilité",
      "Soins",
      "Sphère de feu",
      "Agonie",
      "Éclair mana",
      "Confusion",
      "Armure",
    ],
    "Mage combat Lone Star": [
      "Armure",
      "Barrière physique",
      "Clairvoyance",
      "Détection des ennemis",
      "Éclair de force",
      "Lumière",
    ],
    "Magogang (éveillé)": [
      "Agonie",
      "Éclair mana",
      "Invisibilité",
      "Soins",
      "Sphère de feu",
    ],
  },

  /* ----
     POOLS D'ÉQUIPEMENT SR6
     Armures : Score Défensif (SD) ajouté au SD de base
     Armes : format SR6 avec Scores Offensifs (SO)
  ---- */
  equipPools: {
    commlinks: {
      bas: [
        "Commlink (IA 1)",
        "Commlink Aztechnology Calible (IA 1)",
        "Commlink Sony (IA 2)",
      ],
      moyen: [
        "Commlink (IA 3)",
        "Commlink Renraku Sensei (IA 3)",
        "Commlink Hermes Ikon (IA 4)",
      ],
      haut: [
        "Commlink (IA 4)",
        "Commlink Erika Elite (IA 4)",
        "Commlink Novatech (IA 5)",
      ],
      elite: [
        "Commlink (IA 5)",
        "Commlink Hermes Ikon (IA 5)",
        "Commlink Sony CIY-720 (IA 5)",
      ],
    },
    // Cyberdecks p.184-185 (Att/Corr/TDD/FW) — mêmes paliers de prof que
    // commlinks (cf. _deckTier). Lu par Cyberdeck.parseLegacy à la génération.
    cyberdecks: {
      bas: [
        "Cyberdeck Erika MCD-1 (Att 3, Corr 3, TDD 2, FW 2)",
        "Cyberdeck Microdeck Summit (Att 2, Corr 2, TDD 3, FW 3)",
      ],
      moyen: [
        "Cyberdeck Hermes Chariot (Att 4, Corr 4, TDD 3, FW 3)",
        "Cyberdeck Novatech Navigator (Att 3, Corr 3, TDD 4, FW 4)",
      ],
      haut: [
        "Cyberdeck Renraku Tsurugi (Att 5, Corr 4, TDD 4, FW 4)",
        "Cyberdeck Sony CIY-720 (Att 4, Corr 4, TDD 5, FW 5)",
      ],
      elite: [
        "Cyberdeck Shiawase Cyber-6 (Att 6, Corr 5, TDD 5, FW 5)",
        "Cyberdeck Fairlight Excalibur (Att 6, Corr 6, TDD 6, FW 5)",
      ],
    },
    pistoletsPoche: [
      "Fichetti Tiffani Needler [Pistolet de poche, VD 3P, SO 10/6/2/-/-, CC, 4(c)]",
      "Streetline Special [Pistolet de poche, VD 2P, SO 8/8/-/-/-, CC, 6(c)]",
      "Walther Palm Pistol [Pistolet de poche, VD 2P, SO 12/7/-/-/-, CC/TR, 6(cb)]",
    ],
    pistoletsLegers: [
      "Ares Light Fire 70 [Pistolet léger, VD 2P, SO 9/6/5/-/-, SA, 16(c)]",
      "Ares Light Fire 75 [Pistolet léger, VD 2P, SO 9/6/5/-/-, SA, 16(c), smartlink]",
      "Beretta 101T [Pistolet léger, VD 2P, SO 9/8/6/-/-, SA, 21(c)]",
      "Beretta 201T [Pistolet léger, VD 2P, SO 9/8/6/-/-, SA/TA, 21(c)]",
      "Colt America L36 [Pistolet léger, VD 2P, SO 8/8/6/-/-, SA, 11(c)]",
      "Fichetti Security 600 [Pistolet léger, VD 2P, SO 9/8/5/-/-, SA, 30(c), crosse pliable]",
      "Ruger Redhawk [Pistolet léger, VD 3P, SO 7/10/7/-/-, SA/TR, 8(b)]",
    ],
    pistoletsAutomatiques: [
      "Ares Crusader II [Pistolet auto, VD 2P, SO 9/9/7/-/-, SA/TR, 40(c), smartgun]",
      "Ceska Black Scorpion [Pistolet auto, VD 2P, SO 10/9/8/-/-, SA/TR, 35(c), crosse pliable]",
      "Steyr TMP [Pistolet auto, VD 2P, SO 7/7/5/-/-, SA/TA, 30(c), visée laser]",
    ],
    pistoletsLourds: [
      "Ares Predator VI [Pistolet lourd, VD 3P, SO 10/10/8/-/-, SA/TR, 15(c), smartgun]",
      "Browning Ultra Power [Pistolet lourd, VD 3P, SO 9/8/5/-/-, SA, 10(c), visée laser]",
      "Colt Government 2076/Manhunter [Pistolet lourd, VD 3P, SO 9/7/7/-/-, SA, 14(c), smartgun]",
      "Ruger Super Warhawk [Pistolet lourd, VD 4P, SO 8/11/8/-/-, SA, 6(b)]",
      "Ares Viper Silvergun [Pistolet lourd, VD 3P, SO 12/8/6/-/-, SA/TR, 30(c), crosse pliable, visée laser]",
    ],
    mitraillettes: [
      "Colt Cobra TZ-120 [Mitraillette, VD 3P, SO 9/9/6/-/-, SA/TR, 32(c)]",
      "FN P93 Praetor [Mitraillette, VD 4P, SO 8/11/6/-/-, SA/TR/TA, 50(c), silencieux]",
      "HK-227 [Mitraillette, VD 3P, SO 10/11/8/-/-, SA/TR, 28(c), crosse rétractable, smartgun, silencieux]",
      "Ingram Smartgun XI [Mitraillette, VD 3P, SO 11/9/8/-/-, SA/TR, 32(c), smartgun]",
      "SCK Model 100 [Mitraillette, VD 3P, SO 10/10/7/-/-, SA/TR, 30(c), smartgun]",
      "Uzi V [Mitraillette, VD 3P, SO 7/7/6/-/-, SA/TR/TA, 24(c), visée laser]",
      "Colt Cobra TZ-100 [Mitraillette, VD 3P, SO 9/9/6/-/-, SA/TR, 32(c)]",
      "Colt Cobra TZ-210 [Mitraillette, VD 3P, SO 9/9/6/-/-, SA/TR, 32(c)]",
    ],
    shotguns: [
      "Defiance T-250 [Shotgun, VD 4P, SO 7/10/6/-/-, CC/SA, 5(m)]",
      "Mossberg CMDT [Shotgun, VD 4P, SO 3/10/8/-/-, SA/TR, 10(c), visée laser]",
      "PJSS Model 55 [Shotgun, VD 4P, SO 3/12/8/-/-, SA/TR courte, 2(cb)]",
      "Remington Roomsweeper [Shotgun, VD 5P, SO 9/8/4/-/-, SA, 8(m)]",
      "Defiance T-250 (canon court) [Shotgun, VD 3P, SO 8/8/4/-/-, CC/SA, 5(m), canon court]",
    ],
    // Tasers (absents de la sélection initiale, catégorie électrique dédiée).
    tasers: [
      "Defiance Super Shock [Taser, VD 6E(e), SO 10/6/-/-/-, CC, 4(m), portée max 20m]",
      "Yamaha Pulsar I/II [Taser, VD 4E(e), SO 9/9/-/-/-, SA, 4(m), portée max 20m]",
    ],
    // Armes de jet/trait (absentes de la sélection initiale, p.260-268).
    armesJet: [
      "Arbalète légère [VD 2P, SO 6/8/2/-/-, 3(m)]",
      "Arbalète standard [VD 3P, SO 2/10/4/2/-, 3(m)]",
      "Arbalète lourde [VD 4P, SO 2/8/4/4/-, 4(m)]",
      "Arc [VD 2P-4P selon indice, SO variable]",
      "Couteau de lancer [VD 2P, SO 10/9/3/-/-, 2(m)]",
      "Shuriken [VD 2P, SO 9/11/5/-/-, 2(m)]",
    ],
    // Armes spéciales : lance-grenades (p.267).
    armesSpeciales: [
      "Lance-grenades [VD selon grenade, SO 4/10/6/2/-, CC, 6(c) ou 1(m)]",
    ],
    fusils: [
      "AK-97 [Fusil d'assaut, VD 5P, SO 4/11/9/7/1, SA/TR/TA, 38(c)]",
      "Ares Alpha [Fusil d'assaut, VD 4P, SO 4/10/9/7/2, SA/TR/TA, 42(c), smartgun, lance-grenades]",
      "Colt M23 [Fusil d'assaut, VD 4P, SO 5/8/8/1, SA/TR/TA, 40(c), smartgun]",
      "FN HAR [Fusil d'assaut, VD 5P, SO 2/10/9/5/-, SA/TR/TA, 35(c)]",
      "Yamaha Raiden [Fusil d'assaut, VD 5P, SO 4/10/11/7/2, SA/TR/TA, 60(c), silencieux, smartgun]",
    ],
    snipersLourds: [
      "Ares Desert Strike [Fusil de précision, VD 5P, SO 3/10/10/10, SA, 14(c)]",
      "Cavalier Arms Crockett EBR [Fusil de précision, VD 5P, SO 3/8/11/8, SA/TR, 20(c)]",
      "Ranger Arms SM-6 [Fusil de précision, VD 5P, SO 3/6/9/11/2, SA, 15(c), silencieux]",
      "Remington 900 [Fusil de précision, VD 5P, SO 2/7/10/12/11, CC, 5(m)]",
      "Barret Model 122 [Fusil antimatériel, VD 6P, SO 1/8/11/16/14, SA, 10(c)]",
    ],
    meleeWeapons: [
      "Couteau [VD 2P, SO 6+FOR/1*/-/-/-, portée max 20m]",
      "Couteau de combat [VD 3P, SO 8+FOR/2*/-/-/-, portée max 20m]",
      "Épée [VD 3P, SO 9+FOR/-/-/-/-]",
      "Katana [VD 4P, SO 10+FOR/-/-/-/-]",
      "Hache de combat [VD 5P, SO 9+FOR/-/-/-/-]",
      "Bâton télescopique [VD 4E, SO 8+FOR/-/-/-/-]",
      "Électromatraque [VD 5E(e), SO 6+FOR/-/-/-/-, perte d'action]",
      "Matraque télescopique [VD 2E, SO 5+FOR/-/-/-/-]",
      "Électro-gants [VD 4E(e), SO 5+FOR/-/-/-/-]",
      "Arme d'hast [VD 4P, SO 8+FOR/-/-/-/-]",
      "Lames d'avant-bras [VD 3P, SO 6+FOR/-/-/-/-]",
      "Bâton [VD 4E, SO 8+FOR/-/-/-/-]",
      "Masque (arme de mêlée) [VD 3E, SO 6+FOR/-/-/-/-]",
      "Nerf de bœuf [VD 2E, SO 6+FOR/-/-/-/-]",
      "Chaîne de moto [VD 2E, SO 5+FOR/-/-/-/-]",
      "Coup de poing américain [VD 3P, SO 6+FOR/-/-/-/-]",
      "Fouet monofilament [VD 4P, SO 14+BRA/-/-/-/-]",
      "Kukri [VD 3P, SO 9+FOR/—/—/—/—]",
      "Gladius Xiphos [VD 3P, SO 10+FOR/—/—/—/—]",
      "Kami Standard [VD 3P, SO 8+FOR/—/—/—/—]",
      "Kami pliable [VD 3P, SO 8+FOR/—/—/—/—]",
      "Nodachi [VD 5P, SO 10+FOR/—/—/—/—]",
      "Épée [VD 3P, SO 11/—/—/—/—]",
      "Glaive Xiphos [VD 3P, SO 15/—/—/—/—]",
      "Couteau de combat [VD 3P, SO 9/2*/—/—/—]",
      "Couteau de combat Iron Fang [VD 3P, SO 14/1*/—/—/—]",
      "Couteau de survie [VD 3P, SO 10/2*/—/—/—]",
      "Urban Tribe Tomahawk Mk II [VD 2P, SO 16/9*/—/—/—]",
      "Bâton [VD 4E, SO 9/—/—/—/—]",
      "Bâton enflammé [VD 4E, SO 11/—/—/—/—]",
      "Batte de base-ball enflammée [VD 3E, SO 10/—/—/—/—]",
      "Coup de poing américain [VD 3P, SO 11/—/—/—/—]",
      "Électromatraque [VD 5E(e), SO 10/—/—/—/—]",
      "Garrot [VD 3P, SO 13/—/—/—/—]",
      "Arc rEVOlution Iron Hawk (Indice 6) [VD 4P, CC, SO 4/8/2/2/—]",
      "Couteaux de lancer (2) [VD 2P, SO 10/9/3/—/—]",
      "Lame intégrée [VD 2P, SO 7/—/—/—/—]",
      "Grenade étourdissante [VD 10E, SO 10/9/4/—/—]",
      "Lance-flammes artisanal [VD 3P, CC, SO 5/8/—/—/—]",
      "rEVOlution Hell Turtle [VD 3–5P*, CC, SO 6/10/—/—/—]",
      "Mains nues [VD 2E, SO 10/—/—/—/—]",
      "Électro-gants [VD 4E(e), SO 8/—/—/—/—]",
      "Bottes de combat Bates-Brown [VD 3P, SO 10/—/—/—/—]",
    ],
    // Armes à feu et armures supplémentaires (Bazar de l'Hexagone, Feu Nourri).
    armesSupplement: [
      "Revolvers FN Manurhin MR2073 GIGN (canon court) [VD=CC, Mode=11/27/--/--, SO=6(c), Capacité=4(L)]",
      "Revolvers FN Manurhin MR2073 GIGN (classique) [VD=4P, Mode=CC, SO=9(1)/8/--/--, Capacité=6(c)]",
      "Revolvers FN Manurhin MR2073 GIGN (sniper) [VD=4P, Mode=CC, SO=7(1)/9/2/--, Capacité=6(c)]",
      "Pistolet Lourd FN FNPL-70 [VD=3P, Mode=SA, SO=7(9)/9/--/--, Capacité=15(c)]",
      "Pistolet Léger FN PPA-1 [VD=2P, Mode=SA, SO=12(11)/8/--/--, Capacité=20(c)]",
      "Pistolet Léger Monobe PMAS-70 (normal) [VD=2P, Mode=SA, SO=8(7)/--/--/--, Capacité=12(c)]",
      "Pistolet Léger Monobe PMAS-70 (version civile) [VD=2E, Mode=SA, SO=8(7)/--/--/--, Capacité=12(c)]",
      "Lille36 [VD=2P, Mode=SA, SO=8/8/--/--, Capacité=11(c)]",
      "Monobe FC-MAS (Fusil) [VD=5P, Mode=CC, SO=4/10(9)/4/--, Capacité=2(c)]",
      "Monobe FC-MAS (Fusil) [VD=5P, Mode=CC, SO=2/7(10)/7/3, Capacité=--]",
      "Monobe LGAE (Lance-grenade suivant grenade) [VD=7E, Mode=SA, SO=4/8/8/3/--, Capacité=6(c)]",
      "Fusil d'Assaut Esprit/Dassault PAPOP IV [VD=4P, Mode=SA/TR/TA, SO=6/(1)/8/7/2, Capacité=4c(c)]",
      "Fusil d'Assaut Esprit/Dassault PAPOP IV (Lance-grenade) [VD=--, Mode=CC, SO=4/10/6/2/--, Capacité=6(c)]",
      "Fusil de Précision PGM Hecate III F3 [VD=6P, Mode=SA, SO=2/8/10/16/14, Capacité=4c(c)]",
      'Canon d\'Assaut GIAT Industries CCT "Ultima Ratio" [VD=7P, Mode=SA/TR, SO=1/9/10/10/6, Capacité=12(c)]',
      "Esprit Gladius (Mitrailleuse) [VD=5A, Mode=SA/TR/TA, SO=10/12/7/--/--, Capacité=30(c)]",
      "Esprit Pugio [VD=3P, Mode=SA, SO=11/9/5/--/--, Capacité=14(c)]",
      "Esprit Spatha [VD=5P, Mode=SA/TR/TA, SO=8/12/7/5/--, Capacité=35(c)]",
      "Esprit Hasta [VD=5P, Mode=SA/TR/TA, SO=6/11/7/7/1, Capacité=35(c)]",
      "Esprit Pilum [VD=5P, Mode=SA, SO=4/7/8/2/10, Capacité=15(c)]",
      "Pistolets de Duel Cartier [VD=4P, Mode=CC, SO=10/2/--/-/--, Capacité=1c(b)]",
      "Rapière de Duel Hermès [VD=3, Mode=--, SO=11(F)/--/--/-/-, Capacité=--]",
      "Canne à Systèmes Louis Vuitton (lame tranchante) [VD=3P, Mode=--, SO=7(F)/--/--/-/-, Capacité=--]",
      "Canne à Systèmes Louis Vuitton (fût contondant) [VD=3E, Mode=--, SO=6+(F)/--/--/-/-, Capacité=--]",
      "Canne à Systèmes Louis Vuitton (pistolet de poche) [VD=2P, Mode=CC/TR, SO=8/8/--/-/--, Capacité=4(b)]",
      "Espelette (grenade toxine) [Effet: État Aweigué & État Désorienté, dégâts étourdissants, Souffle 2m]",
      "Pelle Pliante Multifonction Décathlon [VD=3P, Mode=10+F/--/--/-/-, Capacité=--, Effet: Dilacé]",
      "Kit de Dissimulation d'Arme [Effet: Permet de dissimuler une arme démontrée; 300€ armes de poing, 400€ mitraillettes/shotguns]",
      "Ares Light Fire 70 [VD 2P, SA, SO 11/8/7/—/—, Cap. 14(c)]",
      "Ares Light Fire 75 [VD 3P, SA, SO 11/8/7/—/—, Cap. 15(c)]",
      "Ares Light Fire 75 implanté [VD 3P, SA, SO 9/6/5/—/—, Cap. 15(c)]",
      "HK P50 [VD 3P, SA, SO 11/9/6/—/—, Cap. 17(c)]",
      "Colt America L36 [VD 2P, SA, SO 10/10/8/—/—, Cap. 21(c)]",
      "Beretta 101T [VD 2P, SA, SO 9/8/6/—/—, Cap. 21(c)]",
      "Colt Manhunter [VD 3P, SA, SO 11/9/7/—/—, Cap. variab]",
      "Ares Predator VI [VD 4P, SO 12/12/10/—/—, Cap. variab]",
      "Browning Ultra Power [VD 3P, SA, SO 11/10/7/—/—, Cap. 11(c)]",
      "Colt Government 2076 [VD 4P, SA, SO 11/9/7/—/—, Cap. 14(c)]",
      "Nemesis Arms Praetorian II [VD 3P, SA, SO 11/10/10/—/—, Cap. 16(c)]",
      "Ruger Super Warhawk [VD 3P, SA, SO 10/13/10/—/—, Cap. 6(c)]",
      "Ocelot rEVOlutionArms [VD 2P, SA/TR/TA, SO 11/13/8/—/—, Cap. variab]",
      "Defiance Super Shock [VD 6E(e), CC, SO 12/8*/—/—/—, Cap. 1(c)]",
      "SCK Model 100 [VD 3P, SA/TR, SO 12/12/9/—/—, Cap. 20(c)]",
      "Ingram Smartgun XI [VD 4P, SA/TR, SO 11/9/6/—/—, Cap. variab]",
      "FN P93 Praetor [VD 4P, SA/TR, SO 10/13/8/—/—, Cap. variab]",
      "Mossberg CMDT [VD 5P, SA/TR, SO 5/12/8/—/—, Cap. variab]",
      "Ranger Arms AA-16 [VD 5P, SA/TR/TA, SO 7/13/9/—/—, Cap. 12(c)]",
      "Colt M23 [VD 5P, SA/TR/TA, SO 7/10/10/10/3, Cap. variab]",
      "Ares Alpha [VD 5P, SA/TR/TA, SO 6/12/11/9/4, Cap. variab]",
      "Shiawase Arms Model 73 [VD 4P, SA/TR/TA, fusil d'assaut, Cap. variab]",
      "Shiawase Arms Tactical Model 69 [VD 6P, SA, fusil de précision, Cap. variab]",
      "Cavalier Arms Crockett EBR [VD 5P, SA/TR, SO 5/10/13/10/10, Cap. 20(c)]",
      "PSG Enforcer II [VD 5P, CC, SO 3/11/15/15/9, Cap. 12×2(c)]",
      "Ares Viper Slivergun [VD 4P, SA/TR, SO 14/10/8/—/—, Cap. 15(c)]",
      "Grenade incendiaire [VD Feu 6P/4P/2P, SO 9/8/3/—/—, Souffle 15m]",
      "Cocktail Molotov (2) [VD 4P/3P/2P, SO 6/5/0/—/—, Souffle 15m]",
      "Grenades incendiaires (4) [VD Feu 6P/4P/2P, SO 9/8/3/—/—, Souffle 15m]",
    ],
    // Focus magiques (SR6 p.157-158) — pool du slot `focus` du générateur
    // (Éveillés uniquement). Un seul type motorisé : le « Focus de pouvoir »
    // (universel à tout test de Magie, cf. SkillEffects → Sorcellerie +
    // Conjuration) — les focus de sort/qi SR6 sont verrouillés par catégorie
    // ou par pouvoir précis, non génerables sans appariement correct
    // (cf. commentaire buildLoadout). Libellé de base ; la Puissance est
    // apposée à la génération, adossée au professionnalisme. Non listé dans
    // `_equipLabels` → hors sélecteur « ＋ Catalogue » (générateur seulement).
    fociCaster: ["Focus de pouvoir"],
    armures: {
      legere: [
        "Vêtements pare-balles [SD+2]",
        "Gilet pare-balles [SD+3]",
        "Veste en cuir synthétique [SD+1]",
      ],
      moyenne: [
        "Veste pare-balles [SD+4]",
        "Manteau renforcé [SD+3]",
        "Costume Actioneer [SD+2]",
        "Combinaison Urban Explorer [SD+3]",
        "Armure Militaire Seper Armatura [SD+9 (Défense), Score Social=-8]",
        "Casque Seper Armatura [SD+2 (Défense), Score Social=4]",
        "Camps de Luca (costume) [SD+3 (Défense), Score Social=+10]",
        "Chanel (robe et tailleur) [SD+1 (Défense), Score Social=+10]",
        "Dior (ensemble) [SD+2 (Défense), Score Social=+6]",
        "Yves Saint-Laurent (costume et tailleur) [SD+3 (Défense), Score Social=+5]",
        "Ares « Bug Stomper » MK II Armor [SD+8, Cap. 12]",
        "Casque [SD+2, Cap. 6]",
        "Armure anti-meurtre [SD+6]",
        "Armure de classe militaire [SD+8]",
        "Armure de sécurité [SD+6]",
        "Armure Parashield « Protection mystique » [SD+5]",
        "Armure SecureTech Invisi-Shield [SD+6]",
        "Gilet pare-balles tactique SEM [SD+4]",
        "Masque balistique [SD+2]",
        "Securetech SkinShield [SD+3]",
        "Système d'équipement modulaire (SEM) [SD+variab, modulable]",
        "Système de Renfort d'Armure Securetech (SRA) [SD+2]",
        "Tenues de service standard (TSS) [SD+3]",
        "Armure ReaLeather [Style rue, SD+1]",
        "Collection NightShade & Moonsilver [Vêtements armantés]",
        "Collections Ares Victory [Combat style]",
        "Costume/robe Armanté [SD+2]",
        "Costumes Mortimer of London [SD+1–2]",
        "CycleWear [Modulaire]",
        "Manteaux Mortimer of London [SD+1]",
        "Vashon Island [Prestige]",
        "Système de camouflage d'armure au ruthénium [Dissimulation +1]",
      ],
      lourde: [
        "Armure corporelle intégrale [SD+5]",
        "Armure corporelle intégrale + casque [SD+7]",
        "Combinaison caméléon [SD+2, Furtivité+1]",
      ],
      militaire: [
        "Armure corporelle intégrale + casque [SD+7]",
        "Armure corporelle intégrale + casque + isolation chimique [SD+7]",
        "Veste pare-balles + casque [SD+6]",
      ],
      // Casques/boucliers p.275 : s'ajoutent à l'indice d'armure corporelle.
      accessoires: [
        "Casque [SD+1]",
        "Bouclier antiémeute [SD+2]",
        "Bouclier balistique [SD+2]",
      ],
      // Modifications d'armure p.275 (coût en Capacité de l'armure hôte).
      modifications: [
        "Isolation chimique [neutralise Corrodé, indice fois]",
        "Protection chimique [Indice, neutralise Corrodé]",
        "Résistance à l'électricité [Indice, neutralise Électrocuté]",
        "Résistance au feu [Indice, neutralise Enflammé]",
        "Résistance au froid [Indice, neutralise Frigorifié]",
      ],
    },
    // Grenades/roquettes/explosifs p.272-273 (absents de la sélection initiale).
    grenades: [
      "Grenade incapacitante [6E/5E/4E selon distance, Souffle 15m]",
      "Grenade à fragmentation [8P/7P/5P selon distance, Souffle 20m]",
      "Grenade explosive [9P/6P/3P selon distance, Souffle 15m]",
      "Grenade à gaz [effet spécial, Souffle 5m]",
      "Grenade fumigène thermique [effet spécial, Souffle 5m]",
      "Cocktail Molotov [6P(f)/3P(f)/2P(f) selon distance, Souffle 5m]",
    ],
    roquettes: [
      "Roquette anti-véhicule [9P/7P/5P selon distance, Souffle 10m]",
      "Roquette à fragmentation [10P/9P/7P selon distance, Souffle 30m]",
      "Roquette explosive [11P/9P/7P selon distance, Souffle 20m]",
      "Roquette à gaz [effet spécial, Souffle 10m]",
      "Roquette fumigène thermique [effet spécial, Souffle 10m]",
    ],
    explosifs: [
      "Explosif Indice 1-3 [Indice × 10¥]",
      "Explosif Indice 4-6 [Indice × 50¥]",
      "Explosif Indice 7-9 [Indice × 100¥]",
      "Explosif Indice 10-12 [Indice × 250¥]",
      "Explosif Indice 16-18 [Indice × 1 000¥]",
      "Explosif Indice 19-20 [Indice × 5 000¥]",
      "Détonateur",
    ],
    cyberware: [
      "Réflexes câblés 1 [+1D6 initiative, +1 PA MIN]",
      "Réflexes câblés 2 [+2D6 initiative, +1 PA]",
      "Amplificateur de réaction 2 [RÉA+2]",
      "Amplificateurs synaptiques 2 [INT+2]",
      "Tonification musculaire 3 [FOR+3]",
      "Renforcement musculaire 3 [FOR+3]",
      "Armure dermique 3 [SD+3]",
      "Armure dermique 4 [SD+4]",
      "Oreilles cybernétiques [indice 3, filtre son sélectif, amortisseur sonore]",
      "Yeux cybernétiques [indice 2, interface visuelle, caméra, vision nocturne]",
      "Yeux cybernétiques [indice 3, vision thermique, compensation antiflash, smartlink]",
      "Ossature renforcée [CON+2]",
      "Substituts musculaires [AGI+2]",
      "Datajack [connexion directe]",
      "Câblage de contrôle [Rigger]",
      // Implants cérébraux (p.291-292)
      "Amplificateur gustatif [Indice 1-3, bonus Perception (goût)]",
      "Amplificateur olfactif [Indice 1-3, bonus Perception (odorat)]",
      "Bombe corticale (nano) [tue le porteur]",
      "Bombe corticale (micro) [détruit un implant ciblé]",
      "Bombe corticale (zone) [dégâts de zone façon grenade]",
      "Commlink implanté [Indice d'appareil]",
      "Compartiment dentaire [stockage minuscule dissimulé]",
      "Cyberdeck implanté [hacking mobile]",
      "Datalock [Indice 1-12, coffre-fort numérique implanté]",
      "Détecteur à ultrasons [sonar actif/passif]",
      "Modulateur vocal [Indice 1-3, bonus Escroquerie sur la voix]",
      "Simrig implanté [enregistrement simsens]",
      "Skilljack [Indice 1-6, compétences logicielles implantées]",
      "Cyberjack [Indice 1-6, bonus dés initiative matricielle]",
      // Implants oculaires (p.293)
      "Amplification visuelle [portée/clarté]",
      "Compensation antiflash [protection contre éclairs]",
      "Drone oculaire [œil-drone détachable, contrôlable à distance]",
      "Duplication rétinienne [reproduction de rétine, illégal]",
      "Interface visuelle [affichage d'informations]",
      "Vision thermographique [cyberyeux]",
      "Zoom [grossissement visuel]",
      // Implants auriculaires (p.294)
      "Amélioration d'équilibre [bonus tests d'équilibre]",
      "Amortisseur sonore [protection bruit excessif]",
      "Amplification auditive [portée accrue]",
      "Filtre sonore sélectif [Indice jusqu'à 6, filtre bruits indésirables]",
      "Interface sonore [réception audio matricielle]",
      "Reconnaissance spatiale [localisation des sons]",
      // Implants corporels (p.294-295)
      "Câblage de compétences [Indice 1-6, compétence implantée]",
      "Compartiment de contrebande [Indice 5, stockage dissimulé]",
      "Compartiment digital [stockage dans un doigt]",
      "Ossature renforcée (plastique) [+1 CON, +1 SD]",
      "Ossature renforcée (aluminium) [+2 CON, +1 SD]",
      "Ossature renforcée (titane) [+2 CON, +2 SD]",
      "Pistolet grappin implanté [microcâble intégré 60m]",
      "Réservoir d'air interne [Indice 1-4, apnée prolongée]",
      // Membres cybernétiques (p.296-297)
      "Crâne cybernétique [remplacement, apparent ou synthétique]",
      "Torse cybernétique [remplacement, apparent ou synthétique]",
      "Bras cybernétique [remplacement, apparent ou synthétique]",
      "Jambe cybernétique [remplacement, apparent ou synthétique]",
      "Gyrostabilisateur [bonus tir, membre cybernétique]",
      "Étui implanté [dissimule une arme]",
      "Vérins hydrauliques [Indice 1-4, bonus saut]",
      // Armes cybernétiques (p.298)
      "Cybermâchoire [VD 5P, morsure de combat rapproché]",
      "Renfort (mains nues) [VD 3P]",
      "Électro-membre [VD 4E(e), attaque électrique intégrée]",
      "Lame de poing [VD 3P, rétractable en option]",
      "Griffes cybernétiques [VD 2P, rétractables en option]",
      "Éperons [VD 3P, perforant, rétractables en option]",
      "Antennes [Réduit le bruit de 2 points (4 en amplification)]",
      "Dictaphone perpétuel [Enregistre la dernière minute et peut la stocker définitivement]",
      "Oreille absolue [1 point d'Atout sur tests impliquant performance musicale]",
      "Spectre auditif étendu [Réduit coût bonus d'Atout de 1 pour tests perception auditive]",
      "Stabilisateur vestibulaire [Immunisé à l'état Nauséeux]",
      "Système d'orientation [Réduit seuil tests Plein air (Orientation) de 3]",
      "Traducteur auriculaire [Traduction en temps réel de langues étrangères]",
      "Caméra perpétuelle [Enregistre la dernière minute et peut la stocker définitivement]",
      "Lentilles microscopiques [Zoome jusqu'à 1000X, 1 point d'Atout pour détails fins]",
      "Œil cybernétique unique [Version monoculaire à coût réduit (moitié Essence/nuyens)]",
      "Système Clair-voyant [Émetteurs lumineux pour vision nocturne, 1 point d'Atout avec lumière noire]",
      "Yeux d'araignée [Réduit seuil Surprise de 2, détection de mouvement améliorée]",
      "Câblage de contrôle actif [Contrôle moteur de véhicules (pas RV, câble physique obligatoire)]",
      "Coprocesseur d'attention [Ajoute indice à tests de défense et Perception]",
      "Émetteur d'infrasons [Version non-magique du pouvoir Peur dans rayon 5 mètres]",
      "Interface onirique [Enregistrement et révision de rêves, stocke 8 heures de simsens]",
      "Sculpture crânienne [Traits anthropomorphiques animaux, surcoût 10% équipement tête/visage]",
      "Senseur radar [Vision radar 60° jusqu'à 20 mètres, passe obstacles Structure ≤15]",
      "Sous-processeur mathématique [Réduit coût bonus d'Atout de 1 pour Piratage/Électronique/Fabrication]",
      "Visualisateur matriciel [Imprimer images mentales comme iconographie matricielle]",
      "Accélérateur [+actions mineures déplacement/esquive par point indice]",
      "Ailes cybernétiques [vol 10/30/+3, constitution minutes autonomie]",
      "Ancre podale [immobilisation, réduit malus attaques distance]",
      "Auto-injecteur [injection sur demande, drogues/toxines/poisons]",
      "Biomoniteur [surveille essence, coordonne soins médicaux]",
      "Branchies cybernétiques [respiration aquatique]",
      "Griffes d'escalade rétractables [+1 atout escalade, réduit seuil]",
      "Implants de compétence [compétence artificielle indice 1-6]",
      "Interface tactile [retours haptiques réalité augmentée]",
      "Move-by-wire [Indice 1-2, +2 réaction/agilité par point + 2 actions mineures mouvement]",
      "Palmes cybernétiques [natation +1 atout, vitesse +2m/round]",
      "Pulvérisateur gastrique [digestion acides et matériaux]",
      "Queues cybernétiques - Stabilisatrice [trait félin]",
      "Queues cybernétiques - Préhensile [contrôle membre supplémentaire]",
      "Queues cybernétiques - Nageoire caudale [natation +2 dés]",
      "Queues cybernétiques - À pointes [arme 4P, augmente SD]",
      "Revêtement mana Grey [indice 1-4, défense magique augmentée]",
      "Routeur interne [indice 1-4, sans-fil via réseau neural]",
      "Stockage de biodéchets [indice 1-7, jours de déchets stockés]",
      "Système de nutrition interne [indice 1-6, jours alimentation]",
      "Système magnétique [adhérence fer/acier, force 6-8]",
      "Bras complet [force/agilité 2, capacité 20]",
      "Avant-bras [force/agilité 2, capacité 15]",
      "Jambe complète [force/agilité 2, capacité 25]",
      "Bas de jambe [force/agilité 2, capacité 15]",
      "Bras cybernétiques supplémentaires [force/agilité 1.2, +action mineure]",
      "Bras simien [allonge augmentée, touche sol penché]",
      "Bras tentacule [flexibilité, réduit coût atout lutte]",
      "Coprocesseur d'ambidextrie [ignore pénalité non-dominant]",
      "Connecteur modulaire [échange rapide membres]",
      "Doigt cybernétique [briquet/clé/grenade/revolver/torche options]",
      "Doigts serpentins [extensibles, réduit évasion/escamotage]",
      "Jambe digitigrade [bonus déplacement +1/+2/+1, +4 saut]",
      "Hydrojet [natation +1 succès bonus]",
      "Main-grappin [treuil 30m, traction corps]",
      "Médikit implanté [outils chirurgicaux cybernétiques]",
      "Kit implanté [accessoires techniques spécialisés]",
      "Membre cybernétique rudimentaire [pinces/butoirs, moins cher]",
      "Membre télescopique [extension +1m par indice, malus -1 force/m]",
      "Modification d'emport [+1 capacité par indice]",
      "Monture d'arme articulée [support arme épaule, tir ciblé]",
      "Monture modulaire [échange rapide plug-and-play]",
      "Pied préhensile [main du pied, pénalité -2 sprint]",
      "Prises adhésives [gecko, escalade gecko sans matériel]",
      "Roulettes rétractables [patinage déplacement 10/30/+2]",
      "Serre de rapace [griffes aviaires, bonus déplacement doublé]",
      "Substitut de membres inférieurs - Arachnide [6 pattes, escalade +1 atout]",
      "Substitut de membres inférieurs - Centaure [quadrupède, déplacement 10/20/+4]",
      "Substitut de membres inférieurs - Roues [véhicule, accel/vitesse]",
      "Substitut de membres inférieurs - Serpentin [queue, nage +3m succès]",
      "Arme cybernétique lourde [fusil/mitraille/canon/missiles implantés]",
      "Bobine Tesla [cône électrique aspersion, batterie énergivore]",
      "Bras-tronçonneuse [chaîne dentelée, avant-bras/main]",
      "Cornes perforantes [arme encornure, dégâts perforants]",
      "Crache-flamme [projection flamme aspersion, batterie]",
      "Crocs [dents renforcées, morsure VD augmentée]",
      "Démolisseur [poing renforcé, bonus dégâts combat rapproché]",
      "Égide de poignet [épée/lame rétractable poignet]",
      "Pince de crabe [pinces arthropode, étreinte/saisie]",
      "Rack pour drones [montage drones d'attaque intégré]",
      "Shotgun de genou [shotgun genou rétractable, tir]",
      "Trancheur buccal [lames buccales rétractables, morsure]",
      "Batterie de mana [Indice 1-6, contient (50 × indice) unités de mana, portables ou fixes, usage Disien uniquement]",
      "Cristal mémoire [Indice 1-6, Firewall/Traitement données équivalents cyberjacks, communication mentale, enregistrement multi-sensoriel]",
      "Générateur de sort [Indice 1-6, contient jusqu'à (indice) sorts, tradition hermétique, drain renforcé]",
      "Tube de stase [Cylindre ~2m × 1m diamètre, maintient occupant vivant inconscient, drainable d'Essence si connecté]",
      "Générateur de portail disien [Portail métaplanaire 2m diamètre, 6 pts Essence initial, +1 min par Essence supplémentaire]",
      "Générateur de portail MCT [2× efficacité, 3 pts Essence initial, +2 min par Essence]",
      "Armure dermique TMG [Indice 1-6, +indice au SD contre sorts mana, Essence: indice×0.4, Coût: indice×9000¥]",
      "Kit d'upgrade armure dermique TMG [Essence: indice×0.1, Coût: indice×7000¥]",
      "Ossature renforcée TMG (Plastique) [+1 SD et dés défense, Essence: 0.7, Coût: 18000¥]",
      "Ossature renforcée TMG (Aluminium) [+1 SD et dés défense, Essence: 1.2, Coût: 28000¥]",
      "Ossature renforcée TMG (Titane) [+1 SD et dés défense, Essence: 1.7, Coût: 40000¥]",
      "Revêtement TMG cybermembre (apparent) [Capacité: 0, Coût: 5000¥]",
      "Revêtement TMG cybermembre (synthétique) [Capacité: 1, Coût: 6000¥]",
      "Kit d'upgrade revêtement (apparent) [Capacité: 1, Coût: 10000¥]",
      "Kit d'upgrade revêtement (synthétique) [Capacité: 2, Coût: 12000¥]",
    ],
    bioware: [
      "Articulations améliorées [+1 AGI, bonus espaces étroits]",
      "Augmentation de densité osseuse [Indice 1-4, bonus VD/SO mains nues]",
      // Plage d'indice ajoutée au libellé pour que
      // ItemResolver.ratingRange détecte l'item et propose le
      // stepper — sans quoi l'indice ne peut jamais être résolu.
      "Orthoderme [Indice 1-4, bonus Score Défensif égal à l'indice]",
      "Phéromones optimisées [bonus Charisme social]",
      "Poche corporelle [stockage dissimulé, seuil Dissimulation 10]",
      "Pompe à adrénaline [boost temporaire FOR/AGI/RÉA/VOL]",
      "Producteurs de plaquettes [réduit dégâts physiques]",
      "Renforcement musculaire [Indice 1-4, bonus FOR]",
      "Glande suprathyroïdienne [+1 AGI/CON/RÉA, +25% FOR, appétit doublé]",
      "Extracteur de toxines [bonus résistance toxines]",
      "Filtre trachéal [bonus résistance toxines inhalées]",
      // Compensateur de dommages (p.301, absent du
      // catalogue jusqu'ici) — ignore N cases pour les modificateurs de
      // blessure (motorisé dans conditionMonitor.woundMalus via
      // Utils.woundBoxesIgnored).
      "Compensateur de dommages [Indice 1-12, ignore N cases pour malus de blessure]",
      // Correction Canon (p.301, vérifiée) : Filtre antalgique est un
      // BIOWARE (déplacé depuis cyberware), SANS indice, qui ignore TOUS les
      // modificateurs de blessure quand ACTIF (item à activation → non
      // motorisé, comme la Pompe à adrénaline). L'ancien libellé « Filtre
      // antalgique 2 [résiste à 2 malus] » était faux sur les 3 points.
      "Filtre antalgique [ignore tous les malus de blessure quand actif]",
      "Modification de genre/ethnicité [Transformer l'apparence selon nouvelle identité]",
      "Modification mineure [Injections, chirurgie légère]",
      "Modification modérée [Plastie faciale/crânienne, modifications plus invasives]",
      "Modification lourde [Transformation radicale d'apparence, changement de taille]",
      "Changement de métatype [Ressembler à un autre métatype similaire]",
      "Réduction pour troll/ork [Devenir plus attirant humanoïdement, +2 dés déguisement]",
      "Croissance capillaire [Croissance de cheveux/fourrure modulable en couleur, longueur, texture]",
      "Croissance capillaire intégrale [Couverture complète du corps]",
      "Glamour métahumain [Mouvements gracieux et apparence radieuse, remise Atout 1 tests sociaux non-agressifs]",
      "Métabolisme propre [Supprime odeurs corporelles, difficile à pister olfactivement]",
      "Pigmentation de la peau [Teinte temporaire (1 semaine) ou permanente]",
      "Régimeware [Inhibe digestion/assimilation nourriture, maintient minceur]",
      "Yeux parfaits [Correction vision parfaite garantie 10 ans]",
      "Altération du sens de l'équilibre [Remise Atout 1 tests équilibre, escalade, réception]",
      "Altération vocale - Améliorateur de portée [8 octaves vocales, remise Atout 1 représentation]",
      "Altération vocale - Amplificateur de portée [Infrasons/ultrasons 20 Hz - 200 kHz, trompe reconnaissance vocale]",
      "Altération vocale - Banshee [Cri figeant immobilisant dans zone 25m, test Escroquerie vs Intuition]",
      "Altération vocale - Growler [Voix primitive effrayante, remise Atout 1 Intimidation]",
      "Amortisseur métabolique [Ralentit métabolisme en traumatisme, +2 cases surplus dommages avant mort]",
      "Augmentation de volume (indice 1-4) [Réduit état Fatigué du niveau du bioware]",
      "Bouclier rénal [Halve durée drogue, réduit poison 1/round, tolérance drogues 1]",
      "Branchies [Respire dans eau, plonge (Constitution × 20) mètres, fatigué à l'air libre]",
      "Fausse apparence (indice 1-4) [Changement rapide d'apparence, bonus dés déguisement égal à l'indice]",
      "Fausse apparence - Mimétisme [Reproduit apparence d'une personne spécifique]",
      "Glande à soie arachnide [Projette soie arachnide, immobilise cibles, escalade bonus]",
      "Glande chimique [Produit substance chimique unique]",
      "Glande chimique - Crachat [Crache composé jusqu'à 5m, compétence Cracheur]",
      "Glande chimique - Libération interne [Auto-injecteur biologique]",
      "Glande chimique - Pulvérisateur buccal [Exhale aérosol en cône 2x2m, compétence Pulvérisateur]",
      "Glande chimique - Réservoir d'arme [Enrobe armes/crocs avec substance]",
      "Glande chimique - Réservoir agrandi [Jusqu'à 4 réservoirs additionnels]",
      "Mains et pieds palmés [+1 dé natation par paire, -1 dé pour manipulation précise]",
      "Membrane nictitante [Protège yeux, option tintée ou adaptée eau]",
      "Membre de remplacement - Doigt/orteil [Remplacement type-O naturel]",
      "Membre de remplacement - Main/pied [Remplacement type-O naturel]",
      "Membre de remplacement - Bras/jambe partiel [Remplacement type-O naturel]",
      "Membre de remplacement - Bras/jambe intégral [Remplacement type-O naturel]",
      "Phéromones optimisées de créatures (indice 1-3) [Attire/influence espèce choisie, bonus dés égal à l'indice]",
      "Quadmod (indice 1-3) [Sauts augmentés et sprint +1m/niveau]",
      "Queue [Organe naturel greffé sur colonne vertébrale]",
      "Queue - À pointes [Arme naturelle 3P, VD 3P, SO 8]",
      "Queue - Fouet [3m préhensile, type Fouet]",
      "Queue - Pagaie [Natation +1 Atout]",
      "Queue - Préhensile [Contrôlable, Force = moitié Force, escalade +2 Atout]",
      "Queue - Stabilisatrice [Améliore équilibre, escalade, saut, tous tests équilibre +1 Atout]",
      "Réalignement vertébral [+2 dés escalade, supprime Fatigué de retour de l'espace]",
      "Sétules [Adhésion surfaces, escalade +2 dés, escalade verticale mains nues +4 dés]",
      "Substitut articulaire [Renforce articulation, soigne blessure chronique articulaire]",
      "Système immunitaire renforcé (indice 1-4) [Ajoute indice à Constitution pour résistance maladies]",
      "Adaptation climatique [Adapté froid ou chaud, remise Atout survie, réduit Fatigué de 1]",
      "Camouflage [Fourrure sombre/motifs, +1 dés Discrétion faible éclairage]",
      "Chloroplastie [Photosynthèse réduit coût Infrastructure, +1 Atout tests jour, -2 dés obscurité]",
      "Cuir de rhino [Peau épaisse rugueuse, +3 SD cumulable armure]",
      "Épines [Excroissances pointues, +1 SO combat rapproché, dommages Physiques]",
      "Granite [Formations calcite/kératine, +6 SD (non cumulable), bonus succès vs 6+ dommages]",
      "Isolation chimique [Immunité DMSO, remise Atout 1 résistance toxines contact]",
      "Lard [Isolation thermique, +1 Atout résistance froid, annule Frigorifié non-magique]",
      "Peau caméléon - Basique [Adaptation lente tempérée, +1 dés Furtivité (40% expo) ou +2 (80%)]",
      "Peau caméléon - Dynamique [S'adapte tant qu'immobile, mêmes bonus si ≤ moitié mouvement]",
      "Peau d'écorce [Apparence écorce, +2 SD cumulable armure]",
      "Peau de dragon [Ignifuge, remise Atout 1 feu, annule Enflammé non-magique]",
      "Peau glissante [Lubrifiant huileux, +4 SD contre lutte >50% expo cutanée]",
      "Pelage isolant [Fourrure épaisse, remise Atout survie froid, +4 SD froid]",
      "Sécrétions défensives [Acide cutané stressant, -1 dés 24h contact sans protection]",
      "Bioware de culture [Version moins invasive et plus chère de membres de remplacement type-O]",
    ],
    // Matrice / cyberdecks / programmes (Hacker Vaillant, absent du livre de base).
    matrice: [
      "Intervention [Donne un bonus en défense au propriétaire d'un appareil connecté]",
      "Marquage de cible [Marque une cible dans la vision RA pour les alliés]",
      "Popup [Surcharge l'affichage RA de la cible avec des ORA]",
      "Traitement par lot [Coupe tous les programmes actifs du deck]",
      "Au boulot [Module d'Attaque avec ensemble de puces pour hacking offensif]",
      "Coeur [Module de Corruption pour action matricielle]",
      "Cyberhacks [Éléments discrets de piratage sans bonus d'initiative]",
      "Armoire [Installation stationnaire pour deck (capacité illimitée)]",
      "Boitier de CCR [Boîtier compact pour cyberdeck (8/0 capacité)]",
      "Boitier de commlink [Boîtier pour commlink (4/0 capacité)]",
      "Boitier extravagant [Boîtier de luxe (2/2 capacité)]",
      "Boitier portatif [Boîtier portatif (2/0 capacité)]",
      "Keytar [Deck intégré dans instrument musical (10/4 capacité)]",
      "Mallette [Deck portatif dans mallette (12/6 capacité)]",
      "Armorlink [Application pour améliorer l'armure]",
      "Assistant personnel [Agent IA d'assistance personnelle (indice 1-6)]",
      "CI-P [Application de commlink pour rassurer les utilisateurs de la Matrice]",
      "Coffre-fort virtuel [Stockage sécurisé virtuel (indice 3)]",
      "SimShare [Partage d'expériences matricielles]",
      "Booster de cyberjack [Améliore la connexion cybernétique]",
      "Booster de persona [Augmente les attributs du persona]",
      "Installation de programmation [Outils pour développer des programmes (8000 ¥)]",
      "Bombes fumigènes [Crée un écran de fumée virtuelle pour se cacher]",
      "Bouclier directionnel [Offre une protection directionnelle dans la Matrice]",
      "Enveloppe protectrice [Réduit les dommages matriciels reçus]",
      "Lance-roquette [Lance un spike de résonance puissant]",
      "Maître des drones [Contrôle avancé des drones matriciels]",
      "Pic de données [Attaque matricielle classique améliorée]",
      "Quartier-maître [Gestion des ressources matricielles]",
      "Supercharge [Augmente les dommages matriciels]",
      "Analyse de menace [Détecte les menaces émergentes]",
      "Sentinelle [Permet de voir les actions de la cible avant qu'elle ne les execute]",
      "Surveillance [Surveille les activités matricielles en temps réel]",
      "Visée virtuelle [Bonus de dés à la réserve pour actions matricielles]",
      "Boîte à agent [Conteneur pour héberger des agents IA]",
      "Marqueurs logiciels [Marques virtuelles pour suivi d'activités]",
      "Amplificateur de smartgun [Forme complexe pour augmenter les smartguns]",
      "Arc réactif [Crée un arc électrique contre les cibles]",
      "Fusion avec la machine [Permet de fusionner temporairement avec un appareil]",
      "Maquillage de données [Modifie l'apparence des données]",
      "Rétablissement [Récupère les points de Surveillance perdus]",
      "Grappin dérivateur [Augmente la portée du réseau sans-fil]",
      "Jack laser [Connexion laser longue portée]",
      "Relai matriciel [Relaie la connexion matricielle]",
    ],
    equipSpecial: [
      "Lunettes smartlink [indice 2]",
      "Visière tactique [vision nocturne, compensation antiflash, smartlink]",
      "Inhalateur de jazz [×2, RÉA+1, INT+2, DI+2]",
      "Inhalateur de Jazz [×3, *Réaction +1, Intuition +2, Dés Initiative +2]",
      "Kit de premiers soins",
      "Grenade fumigène",
      "Flash-paks [VD : Aveuglé III, Souffle 10m]",
      "Lance-grappin",
      "Menottes magnétiques",
      "Scanner biomédical",
      "Détecteur de Matrice",
      // Appareils optiques/imagerie et auditifs (p.282-284)
      "Binoculaires [indice 1-6, zoom intégré]",
      "Caméra [indice 1-6, photo/vidéo/tridéo]",
      "Endoscope [câble optique, coins/espaces étroits]",
      "Jumelles [indice 1-3, zoom]",
      "Lentilles de contact [améliorations visuelles, sans fil]",
      "Lunette de visée [indice 3, fixée sur arme]",
      "Monocle [indice 1-4, bandeau ou chaîne]",
      "Périscope [regarder/tirer/lancer un sort par-delà un angle]",
      "Casque audio [indice 1-6, améliorations auditives]",
      "Écouteurs [indice 1-3]",
      "Microphone directionnel [indice 1-6, écoute à 100m]",
      "Microphone laser [écoute à travers une vitre, 100m]",
      "Microphone omnidirectionnel [indice 1-6, portée 10m]",
      // Senseurs (p.284-285)
      "Senseur simple [indice 1-8, une seule fonction]",
      "Batterie de senseurs [indice 2-8, plusieurs fonctions]",
      "Compteur Geiger [détection radioactivité]",
      "Détecteur de mouvement [portée 25m]",
      "Scanner de cyberware [détecte implants/contrebande, 15m]",
      "Scanner magnétique (MAD) [détecte armes/métaux, 5m]",
      "Scanner olfactif [analyse moléculaire de l'air]",
      "Senseur à ultrasons [carte topographique, textures]",
      "Senseur atmosphérique [analyse météo temps réel]",
      "Télémètre laser [calcul de distance précis]",
      // Marqueurs RFID et contre-mesures (p.278-279)
      "Marqueurs RFID standards [indice 1]",
      "Marqueurs RFID sécurité/furtifs [indice 3]",
      "Marqueurs RFID senseurs [indice 2]",
      "Brouilleur crânien [indice 1-6, neutralise implants]",
      "Brouilleur de zone [indice 1-6, sphérique]",
      "Brouilleur directionnel [indice 1-6, cône 30°]",
      "Démarqueur [détruit marqueurs RFID à courte portée]",
      "Dérivateur de données [piratage de câble de données]",
      "Générateur de bruit blanc [indice 1-6, masque les sons]",
      "Microtransmetteur [communication courte portée sécurisée]",
      "Scanner de fréquences [détecte signaux sans fil, 20m]",
      // Accessoires électroniques (p.276-277)
      "Électrodes [interface neurale directe, bandeau/casque]",
      "Gants RA [interaction tactile augmentée]",
      "Holo-projecteur [hologramme 3D, cube 5m]",
      "Imprimante [couleur, portable]",
      "Lecteur biométrique [empreintes/rétine/voix]",
      "Liaison satellite [indice 4, accès Matrice hors réseau sans fil]",
      "Papier électronique [affichage flexible, sans fil]",
      "Puce de données [stockage hors ligne]",
      // Systèmes de sécurité / intrusion (p.286)
      "Maglock [indice 1-9]",
      "Menottes métalliques [Structure 10]",
      "Menottes en plastique [Structure 6, jetables]",
      "Menottes de contention [Structure 10]",
      "Autocrocheteur [remise d'Atout 1 pour crocheter]",
      "Copieur de clé magnétique [copie une carte magnétique]",
      "Kit de serrurerie [crochetage de serrures mécaniques]",
      "Mini-poste à souder [VD 6, découpe/soudure]",
      "Mouleur d'empreinte [relève empreinte digitale/palmaire]",
      "Passe maglock [passe-partout maglock, bonus +1]",
      "Pied de biche [double la Force pour forcer]",
      "Séquenceur [crochetage maglock à clavier, bonus +1]",
      "Tronçonneuse monofilament [VD 8, découpe obstacles]",
      // Identité (p.281)
      "Faux SIN [indice 1-6]",
      "Fausse licence [indice 1-6]",
    ],
  },

  /* ---- Catalogue d'équipement (API neutre lue par EditModal) ----
     Même socle que SR5 : `_equipLabels` ordonne/nomme les catégories,
     ItemResolver aplatit `equipPools`. Armes SR6 = chaînes dans `pnj.equip`. */
  _equipLabels: {
    commlinks: "Commlinks",
    cyberdecks: "Cyberdecks",
    pistoletsPoche: "Pistolets de poche",
    pistoletsLegers: "Pistolets légers",
    pistoletsAutomatiques: "Pistolets automatiques",
    pistoletsLourds: "Pistolets lourds",
    mitraillettes: "Mitraillettes",
    shotguns: "Fusils à pompe",
    tasers: "Tasers",
    fusils: "Fusils d'assaut",
    snipersLourds: "Fusils de précision",
    armesSpeciales: "Armes spéciales",
    armesSupplement: "Armes (suppléments)",
    meleeWeapons: "Corps à corps",
    armesJet: "Armes de jet/trait",
    armures: "Armures",
    grenades: "Grenades",
    roquettes: "Roquettes/Missiles",
    explosifs: "Explosifs",
    cyberware: "Cyberware",
    bioware: "Bioware",
    matrice: "Matrice",
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
  AUGS_KEYS: ["cyberware", "bioware"],
  /** #66 : groupes métatype/métavariante pour le sélecteur d'édition PNJ
      (EditModal, `SingleSelect.create({groups})`), même source que le
      générateur (`Metavariants.pickerGroups`). */
  metaOptions() {
    return { groups: Metavariants.use("sr6").pickerGroups() };
  },
  /* Sorts/pouvoirs d'adepte : catalogues partagés (taxonomie commune aux
     4 éditions), source unique dans Content — cf. Content.spellCatalogFor. */
  spellCatalog() {
    return Content.spellCatalogFor(this.id);
  },
  addSpellItem(pnj, id) {
    Content.addSpellItem(pnj, this.id, id);
  },
  powerCatalog() {
    return Content.powerCatalogFor(this.id);
  },
  addPowerItem(pnj, id) {
    Content.addPowerItem(pnj, this.id, id);
  },
  /* Métamagies/échos (P3/P4) : même patron délégué. */
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

  /* ----
     PROFIL DE LOADOUT (V3, recalibré V4) — miroir du profil SR5 (sr5.js),
     adapté à l'échelle de professionnalisme SR6 (0-10, contre 0-6 en SR5)
     et aux clés d'`equipPools` propres à cette édition. Même doctrine :
     rareté (tier, chevauchement doux) × affinité (tags rôle/milieu
     Coherence), consommées par LoadoutEngine (neutre). SIDECAR : les
     chaînes d'`equipPools` restent inchangées. Pools sous-bucketés
     (commlinks/armures) exclus : déjà tierés par sous-bucket ci-dessous.

     V4 — RECALIBRAGE IMPORTANT (vérifié Shadowrun 6e — Livre de Règles
     p.254-255 + table d'équipement p.265-266). L'échelle de Disponibilité
     SR6 n'est PAS celle de SR5 : le livre le dit explicitement, « la
     Disponibilité a un indice qui oscille généralement entre 1 et 6, mais
     dans certaines circonstances cet indice peut atteindre 9 » — les
     indices >9 sont réservés au cyberware alpha/beta/delta, pas aux armes.
     Vérifié ligne à ligne dans la table d'armes : AK-97 Dispo 2, Ares Alpha
     Dispo 5, Ares Desert Strike Dispo 4, Cavalier Arms Crockett EBR Dispo 5,
     Barret Model 122 (fusil antimatériel) Dispo 6, Steyr TMP Dispo 3 — TOUT
     le catalogue d'armes standard tient entre 1 et 6. Les 4 tiers restent
     les mêmes LIBELLÉS que SR5 (courant/pro/militaire/blackops, cohérence
     inter-édition du vocabulaire), mais leurs SEUILS sont propres à SR6 :
     courant ≈ 1-3, pro ≈ 4-6, militaire ≈ 7-9 et/ou légalité (I) (corpo/
     gouvernement/sécurité uniquement, cf. p.255), blackops = au-delà de
     l'échelle achetable normale (rare/absent du catalogue de base — cf.
     cyberware alpha/beta/delta, seule famille où le livre mentionne des
     indices plus élevés). tierByCat ci-dessous reflète ce recalibrage ;
     seules les catégories d'armes à feu ont été vérifiées item par item
     (fusils/snipersLourds) — armesSpeciales/roquettes/explosifs/grenades
     restent tierées "militaire" par nature de l'équipement (munitions de
     guerre, cf. légalité (I) p.255) plutôt que par indice numérique
     vérifié un par un (non chiffrées dans la même table).
  ---- */
  loadoutProfile: {
    proRatingBuckets: [
      [1, "grouille"],
      [3, "amateur"],
      [5, "pro"],
      [7, "vet"],
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
      pistoletsAutomatiques: "courant",
      pistoletsLourds: "pro",
      mitraillettes: "pro",
      shotguns: "pro",
      tasers: "courant",
      // fusils/snipersLourds : "pro" — RECALIBRÉ V4 (était "militaire" pour
      // snipersLourds, contredit par le Dispo réel 4-6 des fusils de
      // précision du livre ; voir AK-97 override ci-dessous pour l'outlier
      // bas de gamme au sein de "fusils").
      fusils: "pro",
      snipersLourds: "pro",
      // Ordnance militaire : tierée par nature de l'équipement (légalité
      // (I), corpo/gouv/sécu uniquement) plutôt que par indice numérique
      // vérifié item par item — ces catégories ne sont pas dans la même
      // table chiffrée que les armes à feu standard.
      armesSpeciales: "militaire",
      roquettes: "militaire",
      explosifs: "militaire",
      grenades: "militaire",
      meleeWeapons: "courant",
      cyberware: "pro",
      bioware: "pro",
      equipSpecial: "courant",
      fociCaster: "pro",
    },
    tierByItem: {
      // "Barret Model 122" retiré : Dispo réelle 6 (vérifié p.266), déjà
      // correctement "pro" via la catégorie snipersLourds recalibrée
      // ci-dessus — l'ancien tag "blackops" était une supposition non
      // vérifiée (V3), corrigée en V4.
      "AK-97": "courant", // Dispo 2 (L), livre p.265 — nettement sous la
      // moyenne de la catégorie "fusils" (Ares Alpha etc. tournent à 5).
      // Focus de pouvoir : pas de table de Dispo au catalogue (objet
      // fabriqué sur mesure, jamais acheté en boutique, cf. p.157-158) —
      // "militaire" reste un choix de conception (rare/coûteux à créer),
      // pas une valeur vérifiée au livre comme les armes ci-dessus.
      "Focus de pouvoir": "militaire",
    },
    tagsByCat: {
      meleeWeapons: ["melee", "adepte", "gang"],
      snipersLourds: ["sniper", "militaire"],
      armesSpeciales: ["heavy", "militaire"],
      fusils: ["combattant"],
      pistoletsPoche: ["holdout", "stealth"],
      pistoletsLegers: ["holdout"],
      fociCaster: ["magical", "mage", "chamane"],
    },
    affinity: {
      combattant: {
        tags: { combattant: 3 },
        cats: { fusils: 2, pistoletsLourds: 2 },
      },
      adepte: { tags: { melee: 4, magical: 3 }, cats: { meleeWeapons: 3 } },
      mage: { tags: { magical: 4, mage: 3 } },
      chamane: { tags: { magical: 4, chamane: 3 } },
      infiltrateur: { tags: { stealth: 4, holdout: 3 } },
      social: { tags: { holdout: 2 } },
      militaire: { tags: { heavy: 4, sniper: 3, militaire: 3 } },
      // Pas d'entrée police/securite_corpo : l'électromatraque leur est déjà
      // garantie par un pick déterministe ci-dessous (buildLoadout), pas par
      // l'affinité — aucun tag "police" n'existe dans tagsByCat, une entrée
      // ici serait un no-op mort.
      gang: { tags: { melee: 3, holdout: 2, gang: 2 } },
      crime: { tags: { holdout: 2, melee: 2 } },
      ombres: { tags: { stealth: 2, holdout: 2 } },
    },
  },

  buildLoadout(archetype, proRating, awakened, role, milieu, special) {
    const p = proRating;
    const pools = this.equipPools;
    const profile = this.loadoutProfile;
    const ctx = { proRating: p, role, milieu, archetype, awakened };
    // Un technomancien est aussi sensible à l'Essence qu'un Éveillé : chaque
    // point perdu réduit sa Résonance (comme la MAG). On ne lui génère donc
    // ni augmentation d'initiative ni cyberware de saveur — même garde que
    // l'Éveillé pour tout matériel qui grignote l'Essence.
    const essenceSensitive = awakened || special === "Technomancien";
    const pick = (cats) =>
      LoadoutEngine.weightedPick(
        LoadoutEngine.gatherCandidates(pools, cats),
        ctx,
        profile,
      );

    // Commlink / armure : pools sous-bucketés, déjà tierés par prof — inchangés.
    const commlink =
      p <= 1
        ? Utils.rand(pools.commlinks.bas)
        : p <= 3
          ? Utils.rand(pools.commlinks.moyen)
          : p <= 6
            ? Utils.rand(pools.commlinks.haut)
            : Utils.rand(pools.commlinks.elite);

    const armure =
      p <= 1
        ? Utils.rand(pools.armures.legere)
        : p <= 4
          ? Utils.rand(pools.armures.moyenne)
          : p <= 7
            ? Utils.rand(pools.armures.lourde)
            : Utils.rand(pools.armures.militaire);

    // Arme principale : tout l'éventail à distance. La matrice de rareté
    // (proRating→tier) + l'affinité (militaire→heavy/sniper) remplacent les
    // anciens seuils de prof ET les listes isSniper/isHeavy en dur.
    const primaryWeapon = pick([
      "pistoletsPoche",
      "pistoletsLegers",
      "pistoletsAutomatiques",
      "pistoletsLourds",
      "mitraillettes",
      "shotguns",
      "fusils",
      "snipersLourds",
      "armesSpeciales",
    ]);

    const result = [commlink, primaryWeapon];
    result.push("Mains nues [VD 2E, SO FOR+RÉA/–/–/–/–]");

    // Arme supplémentaire cohérente (aléa d'arsenal) — via le moteur.
    const secondaryWeapon = pick([
      "meleeWeapons",
      "pistoletsLegers",
      "pistoletsAutomatiques",
    ]);
    if (
      Utils.randBool(0.6) &&
      secondaryWeapon &&
      secondaryWeapon !== primaryWeapon
    ) {
      result.push(secondaryWeapon);
    }

    // Arme de mêlée : l'affinité de rôle/milieu (adepte, gang, crime organisé)
    // remplace l'ancienne liste isMelee en dur.
    const meleeAffinity =
      role === "adepte" || milieu === "gang" || milieu === "crime";
    if (meleeAffinity || Utils.randBool(0.35))
      result.push(pick(["meleeWeapons"]));

    // Électromatraque : pick déterministe conservé (pas de problème de
    // rareté — l'électromatraque EST le standard non-létal SR6, cf. p.157 —
    // seul le déclencheur passe de l'archétype nommé au rôle/milieu résolu.
    const policeLike = milieu === "police" || milieu === "securite_corpo";
    if (policeLike) {
      const shockBaton = pools.meleeWeapons.find((w) =>
        w.startsWith("Électromatraque"),
      );
      if (shockBaton) result.push(shockBaton);
    }

    result.push(armure);
    // Mundain aguerri : une source d'init variée (dés selon la cote), puis un
    // cyber de saveur à haute cote. Le plafond 5D6 est appliqué par BonusEngine.
    if (!essenceSensitive && p >= 3) result.push(EditionSR6.initAugFor(p));
    if (!essenceSensitive && p >= 6)
      result.push(pick(["cyberware"]) || Utils.rand(pools.cyberware));
    if (p >= 4 && Utils.randBool(0.4))
      result.push(pick(["equipSpecial"]) || Utils.rand(pools.equipSpecial));

    // Focus / fétiche : matériel magique des Éveillés (comble le même trou
    // que sr5.js — aucun n'était généré). Simplification Canon-fidèle p.157 :
    // seul le « Focus de pouvoir » (universel à tout test de Magie) est
    // motorisé — les focus de sort SR6 sont verrouillés par catégorie de
    // sort, le focus de qi lié à un pouvoir précis ; les générer pour un PNJ
    // tiré au hasard sans les apparier correctement serait faux au livre.
    // Adepte pur exclu : le Focus de pouvoir ne contribue qu'aux tests de
    // Magie (Sorcellerie/Conjuration, cf. SkillEffects) — un adepte n'en
    // lance jamais, le focus serait purement décoratif. SR6 n'a pas
    // d'équivalent simple/universel pour l'adepte (focus de qi = lié à un
    // pouvoir précis, cf. commentaire plus haut) : lacune assumée, pas une
    // omission — mieux vaut rien qu'un objet qui ne fait rien.
    if (awakened && special !== "Adepte") {
      const focus = pick(["fociCaster"]);
      // « indice » = convention interne de l'app pour tout item à valeur
      // réglable (ItemResolver.itemRating ne reconnaît que ce mot — déjà le
      // cas en SR5 malgré le terme livre « Force »/« Puissance » selon
      // l'édition ; le libellé affiché reste « Focus de pouvoir », le mot
      // clé parseur est invisible à la table).
      if (focus)
        result.push(
          `${focus} (indice ${Utils.clamp(1 + Math.floor(p / 3), 1, 6)})`,
        );
    }

    // Drones et véhicules : riggers (stats du catalogue js/vehicles.js) — le
    // rôle Coherence remplace le test de libellé (même correctif que sr5.js).
    const rigger = role === "rigger" || archetype.includes("Rigger");
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
          "Fourgon GMC Bulldog Step-Van",
          "Ares Roadmaster",
          "Toyota Gopher",
        ]),
      );
    }

    return result.filter(Boolean);
  },

  /* ---- Génération principale ---- */
  generate(opts) {
    Metavariants.use("sr6");
    let meta =
      opts.meta === "Aléatoire" ? Metavariants.randomMeta() : opts.meta;

    // Résolution métavariante SR6 (Compagnon du Sixième Monde)
    const mv = Metavariants.resolve(meta);
    // Résolution Infecté (Compagnon du Sixième Monde, p.102-113) — remplace
    // la résolution métavariante habituelle : un Infecté n'est pas *en
    // plus* une métavariante aléatoire.
    const infected = !mv ? Infected.use("sr6").resolve(meta) : null;
    const baseMetatype = mv
      ? mv.baseMetatype
      : infected
        ? infected.baseMetatype
        : meta;
    let originPoolOverride = null;
    if (
      mv &&
      mv.originPools &&
      (!opts.originPool || opts.originPool === "Aléatoire")
    ) {
      originPoolOverride = Utils.rand(mv.originPools);
    }
    const effectiveOrigin =
      opts.originPool && opts.originPool !== "Aléatoire"
        ? opts.originPool
        : originPoolOverride;

    const gender =
      opts.gender === "Aléatoire" ? Utils.randGender() : opts.gender;
    const proRating =
      opts.proRating === "Aléatoire"
        ? Utils.randInt(0, 10)
        : parseInt(opts.proRating, 10);

    const archetypeList = this.formOptions.archetype.slice(1);
    const archetype =
      opts.archetype === "Aléatoire"
        ? Utils.rand(archetypeList)
        : opts.archetype;

    // Cohérence : rôle/milieu résolus depuis l'archétype (ProfCategories +
    // mots-clés), pour piocher des attributs/compétences variés mais
    // cohérents (cf. js/rules/coherence.js).
    const { role, milieu } = Coherence.resolveTuple("sr6", archetype);

    let special = opts.special || "Aucun";
    if (special === "Aléatoire") {
      special = Utils.randBool(0.2)
        ? Utils.rand([
            "Lieutenant",
            "Decker",
            "Rigger",
            "Adepte",
            "Mage hermétique",
            "Chaman",
            "Technomancien",
          ])
        : "Aucun";
    }
    // Éveillés implicites : un archétype nommé « Chaman/Adepte/Mage… » sans
    // spécialisation explicite dérive sa nature magique de son nom (même patron
    // que SR5), pour que Mage salarié / Chaman urbain / Adepte de rue soient
    // réellement éveillés (isMagicSpec) et castent — ou non, pour l'adepte.
    if (special === "Aucun") {
      if (archetype.includes("Chaman")) special = "Chaman";
      else if (archetype.includes("Adepte")) special = "Adepte";
      else if (archetype.includes("Mage")) special = "Mage hermétique";
      // Émergés nommés (Techno-ganger, Technomancien de sécurité) : router
      // vers la persona/formes complexes AVANT l'override decker ci-dessous —
      // sans quoi Coherence.resolveRole (technoman/techno- → "decker") les
      // aplatirait en deckers à cyberdeck, sans Résonance. Ne capte pas
      // « Technicien » (« techni », pas « techno »).
      else if (/technoman|techno-ganger/i.test(archetype))
        special = "Technomancien";
    }

    // Un archétype matriciel implique la spécialisation Decker (cyberdeck),
    // sauf spécialisation déjà fixée — même patron que sr5.js.
    if (
      special === "Aucun" &&
      (role === "decker" || /matriciel/i.test(archetype))
    )
      special = "Decker";

    // V3 : même réconciliation pour le rigger (cf. V2b sr5.js) — seul le
    // decker en bénéficiait. Sans elle, un archétype nommé dont le rôle
    // résout à "rigger" restait sur special="Aucun", privé de
    // specialSkills.Rigger (Pilotage/Ingénierie/Électronique) ET du câblage
    // de contrôle rigger (cf. augs plus bas) — seuls les drones (déjà
    // gatés sur `role`, cf. buildLoadout) étaient corrects.
    if (special === "Aucun" && role === "rigger") special = "Rigger";

    const p = Utils.clamp(proRating, 0, 10);
    const baseAttrs = { ...this.attrByProf[p] };
    const mods = this.metaMod[baseMetatype] || {};
    let range = mv
      ? mv.ranges
      : this.attrRange[baseMetatype] || this.attrRange["Humain"];

    // Infecté : étend le maximum de la souche/métaconscience du
    // modificateur imprimé dans le livre (règle p.106 : "ajoute au
    // maximum du métatype"). Sasquatch/Centaure/Naga/Triton n'ont pas
    // d'entrée dans attrRange : on va chercher leurs bornes propres via
    // Metavariants (métaconsciences).
    if (infected && infected.attrMod) {
      const mcRange = Metavariants.use("sr6").resolve(
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
    for (const k of ["CON", "AGI", "RÉA", "FOR", "VOL", "LOG", "INT", "CHA"]) {
      const raw = (baseAttrs[k] || 2) + (mods[k] || 0) + Utils.randInt(-1, 1);
      attrs[k] = Utils.clamp(raw, range[k]?.[0] ?? 1, range[k]?.[1] ?? 6);
    }
    // Repondération par rôle (ex. RÉA/LOG pour un rigger) — reclampée
    // dans les mêmes bornes de métatype, pour varier sans sortir du cadre.
    const roleAttrs = Coherence.reweightAttrs(attrs, role, 1, { REA: "RÉA" });
    for (const k of Object.keys(roleAttrs)) {
      attrs[k] = Utils.clamp(
        roleAttrs[k],
        range[k]?.[0] ?? 1,
        range[k]?.[1] ?? 6,
      );
    }

    // Attributs spéciaux — MAG/RES seulement si profession explicitement magique ou special magique
    const magicalArchetypes = [
      "Magogang (éveillé)",
      "Mage combat Lone Star",
      "Commando Aztlan",
      "Agent de sécurité Aztechnology",
      "Maître des Lames Yakuza",
    ];
    const isMagicProf = magicalArchetypes.some((p) => archetype.includes(p));
    const isMagicSpec = ["Mage hermétique", "Chaman", "Adepte"].includes(
      special,
    );

    if (isMagicProf || isMagicSpec) {
      attrs.MAG = Utils.clamp(Math.floor(p / 2) + Utils.randInt(1, 3), 1, 12);
    }
    if (special === "Technomancien") {
      attrs.RES = Utils.clamp(Math.floor(p / 2) + Utils.randInt(1, 2), 1, 12);
    }

    // Atout (ATO, p.69) : attribut suivant la souche métatype (attrRange du
    // baseMetatype, toujours présent — les mv.ranges/infected peuvent
    // l'omettre). Le centre du tirage monte avec le professionnalisme (0-10 :
    // un figurant reste au plancher racial, une élite atteint ~60 % de la
    // plage), toujours borné par attrRange. Ressource de relance « Relancer
    // les ratés ».
    const atoR = this.attrRange[baseMetatype]?.ATO || [1, 6];
    const atoCenter =
      atoR[0] +
      Math.round((atoR[1] - atoR[0]) * Utils.clamp(p / 10, 0, 1) * 0.6);
    attrs.ATO = Utils.clamp(atoCenter + Utils.randInt(0, 1), atoR[0], atoR[1]);

    // Moniteur d'état : unique (me, standard SR6) par défaut, ou séparé
    // Phys/Étourd (physMon/stunMon, comme SR5) si la table a activé le
    // réglage separateMonitors (settingsHTML ci-dessus) — figé au moment de
    // la génération, cf. conditionMonitor.* qui bascule sur pnj.stunMon.
    const separateMonitors = Settings.get("separateMonitors", false);
    const me = separateMonitors ? null : 8 + Math.ceil(attrs.CON / 2);
    const physMon = separateMonitors ? 8 + Math.ceil(attrs.CON / 2) : null;
    const stunMon = separateMonitors ? 8 + Math.ceil(attrs.VOL / 2) : null;

    // SD base profil + armure (ajoutée dans equip)
    const sdBase = this.sdByProf[p] || 4;

    // Initiative
    const initData = this.initByProf[p];
    const initBase = attrs.RÉA + attrs.INT;

    // PA
    const pa = this.paByProf[p] || "MAJ 1, MIN 2";

    // Réserves utiles au MJ (SR6, LdB)
    const defense = attrs.RÉA + attrs.INT; // test de Défense
    const damageResist = attrs.CON; // encaisser les dommages
    const composure = attrs.VOL + attrs.CHA; // sang-froid
    const judgeIntentions = attrs.INT + attrs.CHA; // jauger les intentions
    const memory = attrs.LOG + attrs.VOL; // mémoire
    // Tradition magique & esprit mentor (corrélés à l'origine).
    const isAwakened = isMagicProf || isMagicSpec;
    const castsSpells = isAwakened && special !== "Adepte" && !!attrs.MAG;
    const tradition = castsSpells
      ? Magic.pickTradition("sr6", effectiveOrigin, special, archetype)
      : null;
    const mentorSpirit =
      isAwakened && attrs.MAG
        ? Magic.pickMentor(
            "sr6",
            effectiveOrigin,
            Magic.mentorKind(tradition, special),
          )
        : null;

    // Résistance au Drain : Volonté + attribut de la tradition.
    const drainResist = tradition
      ? attrs.VOL + (attrs[tradition.drainAttr] || 0)
      : null;
    // Résistance au Technodrain (T2, p.191) : Volonté + Logique — propre au
    // technomancien, distincte du Drain magique (RES+VOL en SR5, VOL+LOG ici).
    const technoDrainResist =
      special === "Technomancien" ? attrs.VOL + attrs.LOG : null;

    // Compétences — le pool figé du livre reste le plancher, le rôle/milieu
    // résolu ajoute de la variété cohérente autour (cf. coherence.js).
    const basePool = this.skillPools[archetype] || this.skillPools["Civil"];
    const coherentPool = [
      ...Coherence.skillsForRole("sr6", role),
      ...Coherence.skillsForMilieu("sr6", milieu),
    ];
    const pool = [...new Set([...basePool, ...coherentPool])];
    const count = this.skillCount[p] || 4;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const existingNames = new Set();
    const skills = shuffled.slice(0, count).map((name) => {
      existingNames.add(name);
      return { name, val: Utils.clamp(p + 1 + Utils.randInt(0, 2), 1, 12) };
    });
    for (const s of this.specialSkills[special] || []) {
      if (!existingNames.has(s.name)) {
        skills.push({
          name: s.name,
          val: Utils.clamp(p + s.bonus + Utils.randInt(0, 1), 1, 12),
        });
        existingNames.add(s.name);
      }
    }

    // Tags d'archétype pour la sélection de contenu cohérent
    const awakened = isMagicProf || isMagicSpec;
    const contentTags = Flavor.tagsFor({ archetype, special });

    // Sorts — enrichis avec descriptions cliquables.
    // Un adepte « pur » utilise des pouvoirs, pas des sorts.
    let spells = [];
    const adeptePur = special === "Adepte";
    if (awakened && !adeptePur) {
      spells = Content.pickSorts("sr6", p, contentTags);
    } else if (!adeptePur) {
      const spellsTrad =
        this.spellsByTradition[archetype] ||
        this.spellsByTradition[special] ||
        null;
      spells = spellsTrad ? spellsTrad.slice(0, 2 + Math.floor(p / 3)) : [];
    }

    // Pouvoirs d'adepte
    const powers =
      special === "Adepte"
        ? Content.pickPouvoirs("sr6", p, p >= 4 ? 3 : 2)
        : [];

    // Formes complexes (T2) — technomanciens seulement ; connues max RES×2
    // (p.191). Le pool de génération = cœur (Hacker vaillant est `gen: false`).
    const complexFormsList =
      special === "Technomancien"
        ? Content.pickComplexForms("sr6", p).slice(
            0,
            Math.max(1, attrs.RES * 2),
          )
        : [];

    // Trait de couleur cohérent (parfois)
    const traits = Utils.randBool(0.5)
      ? Content.pickTraits("sr6", contentTags, p, 1)
      : [];

    // Équipement — pas de cyberware pour un Éveillé (coût en Essence)
    const equip = this.buildLoadout(
      archetype,
      p,
      awakened,
      role,
      milieu,
      special,
    );
    if (infected) equip.push(...infected.naturalWeapons);
    if (mv && mv.naturalWeapons) equip.push(...mv.naturalWeapons);

    // Augmentations corpo — jamais pour un Éveillé ; un decker reçoit son
    // cyberdeck ici (pas de augsBySpecial en SR6, contrairement à sr5.js).
    // V3 : le rigger reçoit son câblage de contrôle au même titre — même
    // motif que le decker juste au-dessus (item garanti par spécialisation),
    // catalogue réel (equipPools.cyberware), pas de string inventée.
    const augs =
      special === "Decker"
        ? [
            "Datajack",
            Utils.rand(this.equipPools.cyberdecks[this._deckTier(p)]),
          ]
        : special === "Rigger"
          ? ["Câblage de contrôle [Rigger]"]
          : !awakened && special !== "Technomancien" && p >= 5
            ? [Utils.rand(this.equipPools.cyberware)]
            : [];

    const pnj = {
      id: Utils.uid(),
      edition: "sr6",
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
      proRating: p,
      archetype,
      special,
      attrs,
      role,
      milieu,
      ...(separateMonitors ? { physMon, stunMon, stunFilled: 0 } : { me }),
      sdBase,
      initBase,
      initDice: initData.dice,
      pa,
      defense,
      damageResist,
      drainResist,
      technoDrainResist,
      tradition: tradition ? tradition.name : null,
      traditionDrainAttr: tradition ? tradition.drainAttr : null,
      traditionDesc: tradition ? tradition.desc : null,
      mentorSpirit,
      composure,
      judgeIntentions,
      memory,
      skills,
      spells,
      complexForms: complexFormsList,
      powers,
      traits,
      equip,
      augs,
      infected: infected ? infected.name : null,
      infectedPowers: infected ? infected.powersFixed : [],
      infectedWeaknesses: infected ? infected.weaknesses : [],
      physFilled: 0,
      notes: "",
    };
    if (infected && infected.bonus) pnj._infectedBonus = infected.bonus;
    // Cohérence arme <-> compétence (renomme une compétence de combat si besoin)
    WeaponRoll.reconcile(pnj, "sr6");
    BonusEngine.apply(pnj, "sr6");
    Flavor.apply(pnj);
    Cyberdeck.hydrate(pnj, "sr6");
    Resonance.hydrate(pnj, "sr6");

    // Progression ésotérique (P6) : chance croissante avec le
    // professionnalisme d'être déjà initié/submergé — variété du
    // générateur, pas une règle du livre (aucun archétype SR6 nommé
    // « Initié » à restituer, contrairement à SR5).
    if (awakened) {
      Esoteric.rollForGeneration(pnj, "sr6", "initiation", { proRating: p });
    } else if (special === "Technomancien") {
      Esoteric.rollForGeneration(pnj, "sr6", "submersion", { proRating: p });
    }
    return pnj;
  },

  /** Décompose une réserve dérivée en contributions nommées {label,value}
      (source unique consommée par le popover ⓘ et le résultat du jet — ne
      duplique pas la formule de recalc, lit les mêmes attributs totaux).
      damageResist = Constitution seule (l'armure est un Score Défensif à
      part en SR6, pas mêlée à l'Encaissement). */
  reserveBreakdown(pnj, key) {
    const A = (k) => Actor.attr(pnj, k);
    switch (key) {
      case "defense":
        return [
          { label: Utils.attrFullName("RÉA"), value: A("RÉA") },
          { label: Utils.attrFullName("INT"), value: A("INT") },
        ];
      case "damageResist":
        return [{ label: Utils.attrFullName("CON"), value: A("CON") }];
      case "drainResist": {
        let attr = pnj.traditionDrainAttr;
        if (!attr) {
          if (!A("MAG") || pnj.special === "Adepte") return null;
          attr =
            String(pnj.archetype).includes("Chaman") || pnj.special === "Chaman"
              ? "CHA"
              : "LOG";
        }
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
      default:
        return null;
    }
  },

  recalc(pnj) {
    // Atout : init douce pour les PNJ sauvegardés avant l'ajout du champ
    // (plancher racial d'attrRange, pas de migration versionnée).
    if (pnj.attrs && pnj.attrs.ATO == null)
      pnj.attrs.ATO = this.attrRange[pnj.meta]?.ATO?.[0] ?? 3;
    Actor.refreshAttrs(pnj); // Trait : total = base + Σ mods, avant les dérivées
    const A = (k) => Actor.attr(pnj, k);
    // Recalcule selon le modèle figé à la génération du PNJ (pnj.stunMon
    // présent = separateMonitors était actif) plutôt que le réglage courant.
    if (pnj.stunMon !== undefined) {
      pnj.physMon = 8 + Math.ceil(A("CON") / 2);
      pnj.stunMon = 8 + Math.ceil(A("VOL") / 2);
    } else {
      pnj.me = 8 + Math.ceil(A("CON") / 2);
    }
    pnj.initBase = A("RÉA") + A("INT");
    pnj.defense = A("RÉA") + A("INT");
    pnj.damageResist = A("CON");
    pnj.composure = A("VOL") + A("CHA");
    pnj.judgeIntentions = A("INT") + A("CHA");
    pnj.memory = A("LOG") + A("VOL");
    if (pnj.traditionDrainAttr) {
      pnj.drainResist = A("VOL") + A(pnj.traditionDrainAttr);
    } else if (A("MAG") && pnj.special !== "Adepte") {
      // fallback anciens PNJ sans tradition
      const tradAttr =
        String(pnj.archetype).includes("Chaman") || pnj.special === "Chaman"
          ? A("CHA")
          : A("LOG");
      pnj.drainResist = A("VOL") + tradAttr;
    } else {
      pnj.drainResist = null;
    }
    pnj.technoDrainResist =
      pnj.special === "Technomancien" ? A("VOL") + A("LOG") : null;
    return pnj;
  },
};

// Pont couche 3 (migration modules ES) — retiré en fin de migration.
window.EditionSR6 = EditionSR6;
