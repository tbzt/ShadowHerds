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
import { Statuses } from "../rules/statuses.js";
import { Utils } from "../core/utils.js";
import { Vehicles } from "../catalogs/vehicles.js";
import { WeaponRoll } from "../rules/weaponroll.js";

export const EditionSR6 = {
  /** Ce PNJ a-t-il de quoi PILOTER — un engin, ou l'interface qui permet d'y
      plonger ? Lu par `actionModel.domains.pilotage` (G1). Jumeau exact de
      `EditionSR5._hasRig` ; le raisonnement est là-bas. Dupliqué plutôt que
      partagé parce qu'un prédicat de domaine vit dans son édition (prohibition
      n°1) — et que rien ne garantit que les deux vocabulaires resteront
      identiques quand SR6 gagnera ses propres libellés de CCR. */
  _hasRig(pnj) {
    if (!pnj) return false;
    const items = [...(pnj.equip || []), ...(pnj.augs || [])];
    if (items.some((i) => Vehicles.matchItem(i, pnj.edition))) return true;
    const txt = items.map((i) => ItemResolver.itemStr(i)).join(" ");
    return /c[âa]blage de contr[ôo]le|console de commande|\bCCR\b|rigger/i.test(txt);
  },
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
      ratés (mode "misses"), interdite dès qu'il y a une complication OU un échec
      critique (blockedBy "glitch" couvre les deux — plus strict que SR5),
      coûte des points d'Atout du PNJ. */
  rerollAction: {
    label: "Relancer les ratés",
    mode: "misses",
    blockedBy: "glitch",
    costAttr: "ATO",
  },
  /** Modèle de complication du pool (SR6 p.40) : « Si plus de la moitié des
      dés que vous avez lancés affichent un 1 » → complication ; complication
      + 0 succès → échec critique. Même seuil que SR5, même terme VF officiel
      « Complication » (jamais « Bévue »). `kind:"pool"` = règle déjà posée par
      Dice.computeRoll. */
  complicationModel: { kind: "pool", glitchLabel: "Complication" },
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
      <div class="stack stack--tight radio-group">
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
  /** Défense totale (SR6 p.48) : action majeure qui ajoute la Volonté aux
      tests de défense jusqu'à la fin du round. Pas de coût d'initiative en SR6
      (le modèle de passes −10 de SR5 n'existe plus, p.44) → initCost 0.

      `actionCost` — SR6 facture la Défense totale en ACTION MAJEURE (p.45,
      colonne « Actions majeures » ; détail p.48). C'est le miroir exact du
      choix SR5, qui la paie en initiative et pas en phase d'action. La note le
      disait depuis toujours ; le budget ne le débitait pas. */
  fullDefenseFor(pnj) {
    return {
      label: "Défense totale",
      bonus: Actor.attr(pnj, "VOL"),
      initCost: 0,
      initGate: false,
      actionCost: { key: "major", n: 1 },
      note: "action majeure · fin du round",
    };
  },
  /** LIMITE D'ATTAQUE (lot G4) — SR6 n'écrit pas d'interdiction ; il pose une
      ÉCONOMIE, et c'est elle qui limite. Attaquer coûte l'action majeure, on en
      a une par tour : donc une attaque par tour, par construction.

      ⚠ ET LE LIVRE PRÉVOIT LA SECONDE, explicitement — p.42, verbatim : « en
      utilisant 4 ACTIONS MINEURES pour effectuer 1 ACTION MAJEURE (pouvant
      permettre d'effectuer une SECONDE ATTAQUE au cours du même tour d'un
      joueur) ». C'est même le seul exemple que le livre donne de l'échange.
      Annoncer « une seule attaque par tour » sans dire cela serait donc faux :
      la limite est une limite de BUDGET, et l'échange est la porte de sortie
      que la règle nomme. D'où `buys`, que la rangée de jetons affiche à côté du
      bouton d'échange qui la réalise.

      L'unité est le TOUR et non la phase : SR6 n'a plus de passes d'initiative
      (p.44), il a un tour par personnage et un budget dedans. */
  attackLimit: {
    n: 1,
    counted: true, // catalogue d'actions + `useAction` : l'app sait compter
    scope: "turn",
    scopeLabel: "ce tour",
    page: "p.42",
    why: "attaquer coûte l'action majeure, et il n'y en a qu'une par tour",
    buys: "échanger 4 mineures contre 1 majeure en rend une seconde possible",
  },
  /** CONTRESORT (lot G4, corrigé au livre p.146) — le contrat que la console
      de réaction lit à l'aveugle. `null` quand ce PNJ ne peut pas contrer.

      ⚠ CE N'EST PAS « LA DÉFENSE CONTRE SORTS ». Première version de ce lot :
      un bouton unique, une réserve, un jet. Le livre décrit autre chose —
      « le contresort […] peut se manifester de DEUX MANIÈRES : Défense
      augmentée ou Dissipation » (p.146), et les deux ne visent pas la même
      chose. La Défense augmentée est préventive et son seuil est libre : ses
      succès NETS deviennent un bonus de défense pour tout le monde dans une
      sphère de 2 m. La Dissipation, elle, s'oppose à un sort DÉJÀ actif et se
      joue contre un seuil chiffré, « la Valeur de Drain du sort × 2 ». Même
      réserve de dés, deux tests, deux cibles — d'où `uses` et pas un `pool`
      seul (correction utilisateur : « ça peut nécessiter des jets différents
      en fonction du type du sort »).

      ── Pourquoi la console et pas la feuille ────────────────────────────────
      L'action est notée `(L)` : déclarable à n'importe quel moment, donc jamais
      à son propre tour — on contre le sort de quelqu'un d'AUTRE. Dans la
      feuille du combattant ACTIF elle ne pouvait littéralement pas servir.

      ── La compétence, en fonction de l'édition ──────────────────────────────
      SR6 n'a pas de compétence Contresort séparée : Sorcellerie couvre le
      lancement ET le contresort (cf. `skilleffects.js`), et les deux usages
      roulent « Sorcellerie + Magie ». On exige donc `spellSkill`, jamais la
      chaîne en dur.

      ⚠ EXIGE LA COMPÉTENCE SUR LA FICHE, pas seulement de la Magie :
      `Magic.actionPool` rend `compétence + MAG`, donc un nombre non nul même
      sans la ligne de compétence. Le prédicat regarde la fiche ; la réserve ne
      sert qu'à remplir le bouton.

      `arcaneLock` — le même verrou que la chip ✦ Bannir (`_spiritChipRow`) :
      un magicien coupé de l'astral ne contre rien. */
  counterspellFor(pnj) {
    if (!pnj || pnj._adhoc) return null;
    const skill = this.spellSkill; // Sorcellerie — pas de Contresort séparé en SR6
    if (!(pnj.skills || []).some((s) => s && s.name === skill)) return null;
    if (this.arcaneLock(pnj, "magic") !== null) return null;
    const pool = Magic.actionPool(pnj, skill, "sr6");
    const mag = Actor.attr(pnj, "MAG") || 0;
    return {
      label: "Contresort",
      skill,
      page: "p.146",
      // Les DEUX usages passent par la même action majeure : c'est elle qu'on
      // débite, quel que soit l'usage choisi.
      actionKey: "contrerSort",
      cost: "1 action majeure",
      uses: [
        {
          key: "defense",
          label: "Défense augmentée",
          pool,
          roll: `${skill} + Magie`,
          vs: "aucun seuil — les succès NETS deviennent le bonus",
          note: `Sphère de 2 m dans la ligne de vue ; les succès nets s'ajoutent à la défense de tous ceux qui s'y trouvent, contre n'importe quel sort, pendant ${mag || "Magie"} round${mag > 1 ? "s" : ""} de combat`,
        },
        {
          key: "dissipation",
          label: "Dissipation",
          pool,
          roll: `${skill} + Magie`,
          vs: "Valeur de Drain du sort × 2",
          note: "Contre un sort maintenu ou à effet prolongé. Chaque succès net annule un succès net du sort ; à zéro succès net, le sort est totalement dissipé",
        },
      ],
    };
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
  /** ÉCHANGE D'ACTIONS (lot E5) — SR6 p.42, verbatim :

        « Les joueurs peuvent échanger des actions mineures et des actions
        majeures, en utilisant UNE ACTION MAJEURE pour effectuer UNE ACTION
        MINEURE ou en utilisant 4 ACTIONS MINEURES pour effectuer 1 ACTION
        MAJEURE (pouvant permettre d'effectuer une seconde attaque au cours du
        même tour d'un joueur). »

      Le budget de jetons portait le COMPTE mais pas la MONNAIE : deux rangées
      étanches, alors que le livre les fait converser. La parenthèse du livre
      dit pourquoi ça compte — c'est le seul moyen d'attaquer deux fois dans
      un tour, et l'app le rendait impossible.

      ⚠ L'échange est ASYMÉTRIQUE et donc À PERTE : descendre puis remonter
      coûte 3 mineures. Ce n'est pas un défaut de modélisation, c'est la règle ;
      d'où un geste d'annulation qui rend les jetons échangés plutôt qu'un
      aller-retour qui en mangerait.

      Le tracker lit ce contrat à l'aveugle, comme `actionBudget`. */
  actionExchange: [
    { key: "downgrade", label: "1 majeure → 1 mineure", from: { key: "major", n: 1 }, to: { key: "minor", n: 1 } },
    { key: "upgrade", label: "4 mineures → 1 majeure", from: { key: "minor", n: 4 }, to: { key: "major", n: 1 } },
  ],
  /** CATALOGUE D'ACTIONS (lot F1) — la table de combat p.45, détails p.46-49.
      Lu par `Actions` via ce contrat neutre, comme `statusModel` l'est par
      `Statuses`. Le budget savait COMPTER, il ne savait pas NOMMER.

      `timing` — la trouvaille du dépouillement, verbatim p.45 : « c'est soit au
      moment de l'initiative du joueur (I) soit un choix libre à n'importe quel
      moment (L). […] pour pouvoir effectuer une action Libre, vous devez avoir
      ENCORE UNE ACTION EN RÉSERVE durant ce round. »

      `(L)` n'est pas une catégorie de coût, c'est un MOMENT : l'action coûte
      toujours sa mineure ou sa majeure, mais se déclare hors de son tour. La
      table de combat en compte NEUF (deux de plus vivent dans les tables
      magique et matricielle, hors périmètre F1) — quand l'app affirmait que SR6
      n'en avait qu'UNE, la Défense totale. Elles ne se confondent pas avec les
      interruptions SR5, qui ne coûtent aucun jeton et se paient en score
      d'initiative : deux mécaniques, deux surfaces.

      `combine` — le livre écrit noir sur blanc que cinq mineures « doivent être
      utilisées avec l'action majeure Attaquer ». Le champ le DIT dans
      l'infobulle ; il ne force rien (garde-fou (e) : informer, jamais décider).

      ⚠ Périmètre : la table de COMBAT seulement. Les actions magiques (4 min,
      7 maj) et matricielles (6 min, 26 maj) ont déjà leur surface motorisée
      (`MagicAction`, le tiroir d'Intrusion, `cyberdeckModel.actions`) ; les
      faire entrer ici créerait deux sources de vérité sur les mêmes gestes.
      Elles recevront leur COÛT — leur seul manque — au lot F1b.

      ⚠ Pas de `shot` sur « Attaquer » : SR6 n'a pas de recul progressif (le
      Score Offensif l'a remplacé), et l'action couvre indistinctement la mêlée
      et la distance. Le drapeau est une notion SR5, il vit dans sr5.js. */
  actionModel: {
    /* ---- DOMAINES (lot F5b, complétés au lot G1) : où ce PNJ peut-il
       seulement AGIR ? -----------------------------------------------------
       48 des 78 actions SR6 sont magiques, matricielles ou de pilotage. Sur
       l'écrasante majorité des PNJ — un ganger, un vigile, un molosse — elles
       ne serviront JAMAIS : proposer « Lancer un sort » à qui n'a pas une once
       de Magie, c'est du bruit qui coûte à chaque ouverture de feuille.

       Le prédicat vit ici et pas dans le magasin neutre (prohibition n°1) :
       lui ne sait pas ce qu'est un cyberdeck. Le combat n'a pas d'entrée —
       personne n'a besoin d'une condition pour frapper.

       ⚠ G1 — ces prédicats étaient JUSTES et INOPÉRANTS : la feuille ne les
       lisait que si DEUX rubriques au moins restaient ouvertes, c'est-à-dire
       jamais chez le PNJ qu'ils visaient (cf. `_actionSheet`). Ils fermaient
       la magie et la Matrice du mage-decker, et rien chez le ganger. */
    domains: {
      magie: {
        why: "ce PNJ n'a ni Magie, ni sort, ni pouvoir",
        when: (pnj) =>
          (Actor.attr(pnj, "MAG") || 0) > 0 ||
          !!(pnj.spells && pnj.spells.length) ||
          !!(pnj.powers && pnj.powers.length) ||
          !!pnj.tradition,
      },
      matrice: {
        why: "ce PNJ n'a ni cyberjack, ni cyberdeck, ni Résonance",
        // ⚠ `ItemResolver.itemStr` et non `String` (lot G1) : un item peut
        // être un OBJET (`{ str, cat, rating }`), et `String(objet)` rend
        // « [object Object] » — le motif ne voyait donc pas un cyberdeck ajouté
        // depuis l'éditeur. Jumeau de la correction faite en SR5.
        //
        // Pas de domaine « resonance » ici : le catalogue SR6 ne porte aucune
        // action de sprite ni de forme complexe (elles vivent dans les surfaces
        // du technomancien, pas dans la table matricielle p.183-186). Le jour
        // où il en portera, la rubrique existe déjà côté magasin neutre.
        when: (pnj) =>
          (Actor.attr(pnj, "RES") || 0) > 0 ||
          !!pnj.cyberdeck ||
          !!pnj.persona ||
          !!(pnj.complexForms && pnj.complexForms.length) ||
          /cyberjack|cyberdeck/i.test((pnj.equip || []).map((i) => ItemResolver.itemStr(i)).join(" ")),
      },
      // PILOTAGE (G1) — QUATRE actions que le livre imprime dans la table de
      // COMBAT (p.45) et qui n'appartiennent pourtant qu'au rigger : Commander
      // un drone, Contrôler un drone à distance, Plonger (rigger), Utiliser
      // une CCR. Chacune nomme son matériel dans sa propre description — « via
      // une Console de commande pour rigger », « avec un câblage de contrôle
      // de véhicule et un véhicule ou drone adapté ». La condition était donc
      // ÉCRITE ; elle n'était simplement portée par aucun prédicat.
      //
      // C'est le premier domaine qui ne calque pas une table du livre. Le
      // critère de F5b n'a pas changé pour autant — « ce PNJ peut-il seulement
      // agir là ? » — et il répond non pour un molosse, exactement comme pour
      // « Lancer un sort ».
      pilotage: {
        why: "ce PNJ n'a ni drone, ni véhicule, ni interface de rigger",
        when: (pnj) => EditionSR6._hasRig(pnj),
      },
    },
    catalog: [
      /* ---------------- ACTIONS MINEURES (19) ---------------- */
      { key: "ajuster", name: "Ajuster", cost: [{ key: "minor", n: 1 }], timing: "I", quick: true, lines: [
        "+1 dé à l'attaque, une seule fois par round de combat",
        "Le bonus non utilisé reste valable au round suivant et se cumule",
        "Bonus maximum égal à la Volonté du personnage",
        "Un tour sans Ajuster ni Attaquer fait perdre le bonus accumulé",
        "Requise pour bénéficier d'une lunette de visée ou d'un agrandissement d'image",
      ] },
      // `noSurcharge` — cette action EST la mineure supplémentaire que l'état
      // Couvert facture (p.56, « Attaquer à couvert nécessite une action mineure
      // supplémentaire »). Le livre écrit la même règle deux fois, d'un côté
      // comme une action, de l'autre comme un effet d'état : lui appliquer la
      // surtaxe reviendrait à la faire payer deux fois.
      { key: "attaquerCouvert", name: "Attaquer depuis un couvert", cost: [{ key: "minor", n: 1 }], timing: "I", combine: "attaquer", noSurcharge: true, lines: [
        "À effectuer conjointement avec Attaquer, quand on bénéficie de l'état Couvert et qu'on souhaite le conserver",
        "C'est l'action mineure supplémentaire que l'état Couvert facture — elle ne se cumule pas avec elle",
      ] },
      { key: "attaquesMultiples", name: "Attaques multiples", cost: [{ key: "minor", n: 1 }], timing: "I", quick: true, combine: "attaquer", lines: [
        "Attaquer plusieurs adversaires à portée, si les munitions et la position le permettent",
        "Répartir la réserve entre les cibles, ou moitié de réserve par méthode d'attaque (arrondi à l'inférieur)",
      ] },
      { key: "bloquer", name: "Bloquer", cost: [{ key: "minor", n: 1 }], timing: "L", lines: [
        "Ajoute la compétence de Combat rapproché à un unique test de défense au corps à corps",
        "Le jet doit être effectué au moment où l'action est utilisée",
      ] },
      { key: "changerModeAppareil", name: "Changer le mode d'un appareil", cost: [{ key: "minor", n: 1 }], timing: "L", lines: [
        "Activer, désactiver ou changer le mode d'un appareil connecté à une interface neurale directe",
        "Inclut cyberware, mode de tir d'un smartgun, mode silencieux d'un commlink, coupure du sans-fil",
      ] },
      { key: "cibler", name: "Cibler", cost: [{ key: "minor", n: 1 }], timing: "I", quick: true, combine: "attaquer", lines: [
        "+2 à la Valeur de Dommages contre −4 dés",
        "Des actions d'Atout permettent des ciblages plus précis, sans malus ou avec un malus réduit",
      ] },
      { key: "commanderDrone", name: "Commander un drone", cost: [{ key: "minor", n: 1 }], timing: "I", domain: "pilotage", lines: [
        "Donner un ordre à un drone contrôlé",
        "Le même ordre à tous les drones via une CCR ; des ordres différents coûtent autant d'actions mineures",
      ] },
      { key: "degainerRapidement", name: "Dégainer rapidement", cost: [{ key: "minor", n: 1 }], timing: "I", combine: "attaquer", lines: [
        "Dégainer un pistolet, une arme de taille comparable ou une petite arme de jet, puis attaquer immédiatement",
        "Nécessite l'équipement, l'augmentation ou le trait approprié — sans quoi l'action est impossible",
      ] },
      { key: "esquiver", name: "Esquiver", cost: [{ key: "minor", n: 1 }], timing: "L", lines: [
        "Ajoute la compétence d'Athlétisme à un unique test de défense en combat",
        "Le jet doit être effectué au moment où l'action est utilisée",
      ] },
      // `maySet` — PROPOSÉ, jamais appliqué : le livre subordonne l'état au
      // CHOIX du joueur (« Si le personnage choisit de se déplacer de plus de
      // 2 mètres »). L'app ne connaît pas la distance parcourue, et deviner
      // serait décider. La puce le rappelle, le MJ pose s'il y a lieu.
      { key: "eviter", name: "Éviter", cost: [{ key: "minor", n: 1 }], timing: "L",
        maySet: [{ status: "aterre", level: 1, when: "s'il s'est déplacé de plus de 2 mètres" }], lines: [
        "Hors de son tour : éviter le souffle d'une explosion ou une attaque au gaz",
        "Réaction + Athlétisme − malus d'évitement (point d'impact −6, proche −4, courte −2)",
        "Déplacement d'autant de mètres que de succès, direction choisie avant de connaître la déviation",
        "Au-delà de 2 mètres, le personnage plonge et subit l'état À terre",  // → maySet
        "Impossible si Éviter, Se déplacer ou Sprinter a déjà servi ce round — et les interdit pour le reste du round",
      ] },
      { key: "faireTrebucher", name: "Faire trébucher", cost: [{ key: "minor", n: 1 }], timing: "I", combine: "attaquer", lines: [
        "Mêlée uniquement, avec l'action majeure Attaquer — vise la mise à terre, pas les dommages",
        "Dégâts de base réduits de 2",
        "Si l'attaque réussit : test d'Athlétisme + Agilité de la cible, seuil égal à la VD ajustée, sinon état À terre",
      ] },
      { key: "intercepter", name: "Intercepter", cost: [{ key: "minor", n: 1 }], timing: "L", lines: [
        "Un adversaire arrive à portée proche : Attaquer hors de l'ordre d'initiative",
        "Exige qu'il reste ENCORE une action mineure ET une action majeure ce round",
        "Impossible avec une arme à distance",
      ] },
      { key: "lacherObjet", name: "Lâcher un objet", cost: [{ key: "minor", n: 1 }], timing: "L", lines: [
        "Lâcher ce qu'on tient en main ; les objets peuvent être endommagés selon la chute",
      ] },
      { key: "rechargerSmartgun", name: "Recharger un smartgun", cost: [{ key: "minor", n: 1 }], timing: "I", reload: "smart", via: "rechargement", lines: [
        "Connecté à un smartgun prêt : éjecte le chargeur et en engage un autre d'une simple pensée",
        "Exige qu'un nouveau chargeur soit disponible",
      ] },
      { key: "seCoucher", name: "Se coucher", cost: [{ key: "minor", n: 1 }], timing: "I",
        sets: [{ status: "aterre", level: 1 }], lines: [
        "Obtient l'état À terre jusqu'à ce qu'il choisisse l'action Se relever",
      ] },
      { key: "seDeplacer", name: "Se déplacer", cost: [{ key: "minor", n: 1 }], timing: "I", quick: true, lines: [
        "Déplacement de 10 mètres",
        "Une seule action Se déplacer par tour de personnage",
      ] },
      { key: "seJeterParTerre", name: "Se jeter par terre", cost: [{ key: "minor", n: 1 }], timing: "L", quick: true,
        sets: [{ status: "aterre", level: 1 }], lines: [
        "+2 dés au test de défense contre une attaque",
        "Obtient l'état À terre",
        "−2 dés à tous les tests de compétences actives jusqu'à la fin de son prochain tour, ou jusqu'à Se relever",
      ] },
      // ⚠ PLANCHER, pas valeur exacte : le livre octroie « Couvert I, II, III
      // ou IV » selon la part du corps protégée, et l'app ne voit pas l'abri.
      // Elle pose le niveau I — le minimum, jamais une largesse — et le MJ
      // monte d'un cran d'un tap sur la pastille (patron `edge-step`). Même
      // raisonnement que le −1 mineure de Nauséeux au lot F3.
      { key: "seMettreACouvert", name: "Se mettre à couvert", cost: [{ key: "minor", n: 1 }], timing: "I", quick: true,
        sets: [{ status: "couvert", level: 1, note: "niveau I posé — montez d'un cran selon l'abri" }], lines: [
        "Octroie les états Couvert I, II, III ou IV selon l'abri",
        "Le personnage doit agir en fonction des contraintes de cet abri",
      ] },
      { key: "seRelever", name: "Se relever", cost: [{ key: "minor", n: 1 }], timing: "I", quick: true,
        sets: [{ status: "aterre", level: 0 }], lines: [
        "Se débarrasse de l'état À terre",
      ] },

      /* ---- Deux actions que seule la PROSE du livre décrit (lot F4) --------
         Elles ne figurent pas dans la table p.45 : le livre les écrit dans la
         description de l'état qu'elles traitent. Les omettre laisserait deux
         états sans porte de sortie alors que le livre en donne une — c'est le
         même arbitrage qui a fait entrer les 5 états des suppléments au lot E1,
         source citée plutôt que masquée. */
      { key: "retrouverEquilibre", name: "Retrouver l'équilibre", cost: [{ key: "minor", n: 1 }], timing: "I",
        sets: [{ status: "desequilibre", level: 0 }], lines: [
        "Retire l'état Déséquilibré, qui persiste sinon",
        "Source : Cartes d'états A02 (l'action n'est pas dans la table p.45)",
      ] },
      // `maySet` et non `sets` : « effectuer un test d'Agilité + Réaction (2) ;
      // SI VOUS RÉUSSISSEZ, le feu s'éteint ». L'app tend les dés et ne lit pas
      // le résultat — exactement ce que fait le bilan de round pour Nauséeux
      // et le Mourant d'Anarchy 1 (lot E3b).
      { key: "eteindreFlammes", name: "Éteindre les flammes", cost: [{ key: "major", n: 1 }], timing: "I",
        maySet: [{ status: "enflamme", level: 0, when: "sur une réussite du test" }], lines: [
        "Test d'Agilité + Réaction (2) — sur une réussite, l'état Enflammé s'éteint",
        "Sauter dans l'eau y met fin sans aucun test",
        "Source : description de l'état Enflammé (l'action n'est pas dans la table p.45)",
      ] },

      /* ---------------- ACTIONS MAJEURES (13) ---------------- */
      { key: "assister", name: "Assister", cost: [{ key: "major", n: 1 }], timing: "L", lines: [
        "Devenir assistant au cours d'un test d'équipe, pour aider un équipier sur une tâche",
      ] },
      { key: "attaquer", name: "Attaquer", viaWeapon: true, cost: [{ key: "major", n: 1 }], timing: "I", quick: true, lines: [
        "Porter un type d'attaque : physique, magique ou de véhicule",
      ] },
      { key: "controlerDrone", name: "Contrôler un drone à distance", cost: [{ key: "major", n: 1 }], timing: "I", domain: "pilotage", lines: [
        "Piloter un drone à distance via une Console de commande pour rigger (CCR)",
        "Sans CCR, voir l'action matricielle Contrôler un appareil",
      ] },
      { key: "defenseTotale", name: "Défense totale", cost: [{ key: "major", n: 1 }], timing: "L", quick: true, lines: [
        "Ajoute la Volonté à ses tests de défense jusqu'à la fin du round de combat",
      ] },
      { key: "observerAttentivement", name: "Observer attentivement", cost: [{ key: "major", n: 1 }], timing: "I", lines: [
        "Autorise un test de Perception ou d'Observation astrale",
        "Sert à remarquer les détails que le rythme du combat occulte (équipement, identité)",
      ] },
      { key: "plongerRigger", name: "Plonger (rigger)", cost: [{ key: "major", n: 1 }], timing: "I", domain: "pilotage", lines: [
        "Avec un câblage de contrôle de véhicule et un véhicule ou drone adapté au rigging : en prendre le contrôle",
      ] },
      { key: "preparerArme", name: "Préparer une arme", cost: [{ key: "major", n: 1 }], timing: "I", lines: [
        "Rendre une arme prête à être utilisée : dégainer, sortir du fourreau, armer une grenade…",
        "Requise pour presque toutes les armes",
        "Plusieurs petites armes de jet d'un coup : autant que l'Agilité, dans l'autre main",
      ] },
      { key: "ramasserPoserObjet", name: "Ramasser / poser un objet", cost: [{ key: "major", n: 1 }], timing: "I", lines: [
        "Ramasser un objet à portée ou en poser un, en y faisant attention",
        "Une arme ainsi ramassée est considérée comme prête à être utilisée",
      ] },
      { key: "rechargerArme", name: "Recharger une arme", cost: [{ key: "major", n: 1 }], timing: "I", reload: "full", via: "rechargement", lines: [
        "Pour une arme sans smartlink, ou dont le smartlink est désactivé",
        "L'arme est rechargée à sa pleine capacité, tant que le personnage a assez de munitions",
      ] },
      { key: "sprinter", name: "Sprinter", cost: [{ key: "major", n: 1 }], timing: "I", lines: [
        "Déplacement de base de 15 mètres, +1 mètre par succès à un test d'Athlétisme + Agilité",
        "Une seule action Sprinter par tour, non combinable avec Se déplacer ni Éviter",
      ] },
      { key: "utiliserAppareilSimple", name: "Utiliser un appareil simple", cost: [{ key: "major", n: 1 }], timing: "I", lines: [
        "Un appareil activé en un seul mouvement : bouton, touche, icône unique",
        "Un appareil connecté à une IND activée ne coûte qu'une action mineure",
      ] },
      { key: "utiliserCCR", name: "Utiliser une CCR", cost: [{ key: "major", n: 1 }], timing: "I", domain: "pilotage", lines: [
        "Manœuvres de rigging depuis une Console de commande pour rigger",
      ] },
      { key: "utiliserCompetence", name: "Utiliser une compétence", cost: [{ key: "major", n: 1 }], timing: "I", lines: [
        "Utiliser n'importe quelle compétence appropriée",
      ] },

      /* ================ ACTIONS MAGIQUES (lot F1b) — 4 + 7 ================
         Le livre les sort dans une table à part, mais l'économie est la MÊME :
         elles se paient en mineures et en majeures comme le reste. F1 les avait
         différées parce qu'elles ont déjà leur surface motorisée (MagicAction) ;
         ce qui leur manquait, c'était uniquement leur COÛT. Rien ici ne touche
         à leurs jets — `domain` sert au rangement de la feuille, pas au calcul.

         ⚠ « Contrer un sort » est la 10ᵉ action `timing: "L"` de SR6, et
         « Défense matricielle totale » la 11ᵉ (plus bas) : les deux que la table
         de combat ne portait pas. */
      { key: "activerFocus", name: "Activer (désactiver) un focus", cost: [{ key: "minor", n: 1 }], timing: "I", domain: "magie", lines: [
        "Active ou désactive un focus lié",
      ] },
      { key: "declencherPreparation", name: "Déclencher une préparation", cost: [{ key: "minor", n: 1 }], timing: "I", domain: "magie", lines: [
        "Déclenche une préparation dont le déclencheur est une commande",
      ] },
      { key: "commanderEsprit", name: "Commander un esprit", cost: [{ key: "minor", n: 1 }], timing: "I", domain: "magie", lines: [
        "Donne un ordre à un esprit lié ou invoqué",
      ] },
      { key: "modifierPerception", name: "Modifier sa perception", cost: [{ key: "minor", n: 1 }], timing: "I", domain: "magie", lines: [
        "Bascule la perception entre le monde physique et l'astral",
      ] },
      { key: "bannirEsprit", name: "Bannir un esprit", cost: [{ key: "major", n: 1 }], timing: "I", domain: "magie", via: "bannissement", lines: [
        "Tente de renvoyer un esprit dans son plan",
      ] },
      { key: "contrerSort", name: "Contrer un sort", cost: [{ key: "major", n: 1 }], timing: "L", domain: "magie", via: "reactions", lines: [
        "Oppose son Contresort à un sort en cours de lancement",
      ] },
      { key: "invoquerEsprit", name: "Invoquer un esprit", cost: [{ key: "major", n: 1 }], timing: "I", domain: "magie", via: "invocation", lines: [
        "Invoque un esprit et négocie ses services",
      ] },
      { key: "lancerSort", name: "Lancer un sort", cost: [{ key: "major", n: 1 }], timing: "I", domain: "magie", via: "sorts", lines: [
        "Lance un sort connu, avec son Drain",
      ] },
      { key: "purifier", name: "Purifier", cost: [{ key: "major", n: 1 }], timing: "I", domain: "magie", lines: [
        "Purifie une zone ou un objet de son empreinte astrale",
      ] },
      { key: "seManifester", name: "Se manifester", cost: [{ key: "major", n: 1 }], timing: "I", domain: "magie", lines: [
        "Un personnage projeté apparaît sous forme spectrale dans le monde physique",
      ] },
      { key: "seProjeterAstral", name: "Se projeter dans l'astral", cost: [{ key: "major", n: 1 }], timing: "I", domain: "magie", lines: [
        "Projette son esprit dans l'espace astral",
      ] },

      /* ================ ACTIONS MATRICIELLES (lot F1b) — 6 + 27 ============
         ⚠ NE PAS CONFONDRE avec `cyberdeckModel.actions` (plus bas) : celles-là
         portent une RÉSERVE et une VD pour le moteur d'intrusion, qui les lance
         réellement. Celles-ci portent un COÛT D'ACTION, et rien d'autre. Quatre
         gestes existent des deux côtés (Pic de données, Forcer l'accès, Sonder
         l'accès, Planter un programme) : c'est voulu, ce sont deux facettes du
         même geste, et aucune des deux tables n'a vocation à porter l'autre. */
      { key: "mxChangerIcone", name: "Changer son icône", cost: [{ key: "minor", n: 1 }], timing: "I", domain: "matrice", lines: ["Modifie l'apparence de son icône"] },
      { key: "mxChangerInterface", name: "Changer de mode d'interface", cost: [{ key: "minor", n: 1 }], timing: "I", domain: "matrice", lines: ["Bascule entre RA et RV"] },
      { key: "mxEntrerServeur", name: "Entrer / sortir d'un serveur", cost: [{ key: "minor", n: 1 }], timing: "I", domain: "matrice", lines: ["Franchit la frontière d'un serveur"] },
      { key: "mxEnvoyerMessage", name: "Envoyer un message", cost: [{ key: "minor", n: 1 }], timing: "L", domain: "matrice", lines: ["Envoie un message matriciel"] },
      { key: "mxPercevoirRV", name: "Percevoir la Matrice en RV", cost: [{ key: "minor", n: 1 }], timing: "I", domain: "matrice", lines: ["Perception matricielle depuis la réalité virtuelle"] },
      { key: "mxReconfigurer", name: "Reconfigurer les attributs matriciels", cost: [{ key: "minor", n: 1 }], timing: "I", domain: "matrice", lines: [
        "Échange les valeurs de deux attributs non nuls du persona (légale, aucun test, aucun accès nécessaire)",
      ] },
      { key: "mxBrouiller", name: "Brouiller des signaux", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Brouille les communications d'une zone"] },
      { key: "mxControlerAppareil", name: "Contrôler un appareil", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Prend le contrôle d'un appareil accessible"] },
      { key: "mxCrypter", name: "Crypter un fichier", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Protège un fichier par cryptage"] },
      { key: "mxDecrypter", name: "Décrypter un fichier", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Lève le cryptage d'un fichier"] },
      { key: "mxDefenseTotale", name: "Défense matricielle totale", cost: [{ key: "major", n: 1 }], timing: "L", domain: "matrice", lines: ["Se défend activement contre les actions matricielles jusqu'à la fin du round"] },
      { key: "mxDesamorcerBombe", name: "Désamorcer une bombe matricielle", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Neutralise une bombe matricielle repérée"] },
      { key: "mxEditerFichier", name: "Éditer un fichier", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Crée, modifie, copie ou supprime un fichier"] },
      { key: "mxEffacerSignature", name: "Effacer une signature matricielle", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Efface la trace laissée par une action matricielle"] },
      { key: "mxEmpetrer", name: "Empêtrer", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Entrave une icône adverse"] },
      { key: "mxForcerAcces", name: "Forcer l'accès", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", via: "matrice", lines: ["Obtient un niveau d'accès par la force (dépend de l'Attaque)"] },
      { key: "mxFormaterAppareil", name: "Formater un appareil", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Reformate un appareil pour en changer le propriétaire"] },
      { key: "mxFureter", name: "Fureter", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Fouille un serveur à la recherche de fichiers"] },
      { key: "mxImiterOrdre", name: "Imiter un ordre", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Fait passer un ordre pour légitime auprès d'un appareil"] },
      { key: "mxPercevoirMatrice", name: "Percevoir la Matrice", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Analyse un objet matriciel ou scanne les environs"] },
      { key: "mxPicDonnees", name: "Pic de données", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", via: "matrice", lines: ["Attaque matricielle infligeant des dommages (VD = indice d'Attaque)"] },
      { key: "mxPlanterProgramme", name: "Planter un programme", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", via: "matrice", lines: ["Met hors service un programme actif de la cible"] },
      { key: "mxPlongerAppareil", name: "Plonger dans un appareil riggé", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Prend le contrôle direct d'un appareil riggé"] },
      { key: "mxPoserBombe", name: "Poser une bombe matricielle", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Piège un fichier ou un appareil"] },
      { key: "mxRebooter", name: "Rebooter un appareil", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Redémarre un appareil, ce qui purge son état matriciel"] },
      { key: "mxRechercheMatricielle", name: "Recherche matricielle", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Recherche une information dans la Matrice"] },
      { key: "mxEmpreinteNumerique", name: "Rechercher une empreinte numérique", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Remonte la piste laissée par une icône"] },
      { key: "mxSeCacher", name: "Se cacher", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Passe son icône en mode silencieux vis-à-vis d'une cible"] },
      { key: "mxSeDebrancher", name: "Se débrancher", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Quitte la Matrice"] },
      { key: "mxSonderAcces", name: "Sonder l'accès", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", via: "matrice", lines: ["Prépare un accès en discrétion (dépend de la Corruption)"] },
      { key: "mxTraquerIcone", name: "Traquer une icône", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Localise physiquement le porteur d'une icône"] },
      { key: "mxBackdoor", name: "Utiliser une backdoor", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Réutilise un accès préparé par Sonder l'accès"] },
      { key: "mxVerifierSurveillance", name: "Vérifier son Score de Surveillance", cost: [{ key: "major", n: 1 }], timing: "I", domain: "matrice", lines: ["Consulte son Score de Surveillance courant"] },
    ],
  },
  /** ACTIONS D'ATOUT (lot F5) — le contrat, lu par `EdgeActions`.

      82 entrées dépouillées sur quatre ouvrages : livre de base (14 combat +
      5 matricielles), Feu Nourri (33), À tombeau ouvert (24 + 2 bonus),
      Compagnon du Sixième Monde (4 optionnelles). Les afficher toutes serait
      pire que rien — d'où les trois axes de filtre, qui sont la phrase du MJ :
      **au bon moment, au bon endroit, au bon PNJ**.

      Ce bloc porte les GARDES et les CONTEXTES ; l'en-tête d'`edgeactions.js`
      porte le raisonnement. Le catalogue se remplit ouvrage par ouvrage —
      ci-dessous, la tranche qui exerce les trois axes. */
  edgeActionModel: {
    /* ---- AXE « au bon PNJ » : capacités lues sur la fiche ---------------
       Elles sont évaluées ICI parce que le magasin neutre ne sait pas ce
       qu'est un cyberjack (prohibition n°1). Le livre écrit « un cyberjack
       implanté OU un score de Résonance » : `who` est donc une disjonction. */
    gates: {
      resonance: (pnj) => (Actor.attr(pnj, "RES") || 0) > 0,
      // Même patron que `BonusEngine.detectSmartlink` : on lit l'équipement,
      // qui porte « Cyberjack [Indice 1-6, …] » depuis toujours.
      cyberjack: (pnj) => /cyberjack/i.test((pnj.equip || []).map(String).join(" ")),
      // Dérogation Hacker Vaillant : les protoconsciences « ont accès à
      // l'ensemble des actions d'Atout matricielles SANS CONDITION de matériel
      // ou attribut spécial ». Une exception écrite au livre mérite un champ.
      vieNumerique: (pnj) => !!(pnj && (pnj.kind === "sprite" || pnj.isProtoconscience)),
      pilote: (pnj) =>
        typeof Vehicles !== "undefined" &&
        (Vehicles.linkedTo(pnj.id) || []).some((v) => v.deployed),
    },
    gateLabels: {
      resonance: "un score de Résonance",
      cyberjack: "un cyberjack implanté",
      pilote: "un véhicule ou un drone déployé",
    },

    /* ---- AXE « au bon endroit » : le contexte de scène ------------------
       `derive` présent = l'app sait le voir toute seule. Absent = c'est au MJ
       de le déclarer, et la bascule apparaît au-dessus de la feuille. */
    contexts: {
      vehicule: {
        label: "En véhicule",
        derive: (pnj) =>
          typeof Vehicles !== "undefined" &&
          (Vehicles.linkedTo(pnj.id) || []).some((v) => v.deployed),
      },
      matrice: {
        label: "En Matrice",
        derive: (pnj) =>
          (Actor.attr(pnj, "RES") || 0) > 0 ||
          /cyberjack|cyberdeck/i.test((pnj.equip || []).map(String).join(" ")),
      },
      // ✅ L'app modélise ce type de scène depuis le moteur ⇉ (lots P1-P3) :
      // participants, rôle cible/poursuivant, catégories de distance,
      // environnement et test par round. Le contexte reste sans `derive` —
      // non par impuissance, mais par COUCHE : l'état d'une poursuite vit
      // dans la scène (couche 5) et une édition (couche 3) ne remonte jamais
      // l'y chercher. C'est le contrôleur qui l'ajoute aux contextes
      // déclarés dès qu'un PNJ est sur la piste (`Encounter.edgeContextsFor`),
      // et la bascule manuelle reste là pour le MJ qui joue la poursuite
      // sans ouvrir la piste.
      poursuite: {
        label: "Course-poursuite",
        hint: "Déclaré tout seul dès qu'une piste de poursuite est ouverte",
      },
    },

    /* ---- Le catalogue ---------------------------------------------------
       Tranche de contrat : chaque entrée ci-dessous exerce un axe différent,
       pour que la machinerie soit vérifiable avant que les 82 y entrent. */
    catalog: [
      // AXE « au bon moment » — hôte nommé, du catalogue F1.
      { key: "arracher", name: "Arracher", cost: 2, source: "SR6",
        host: ["bloquer"], hostLabel: "Bloquer", when: "avantJet", lines: [
        "En mêlée, après un Bloquer réussi : test de Combat rapproché + Agilité, seuil = Force de l'adversaire",
        "Seuil atteint : l'arme tombe · succès excédentaires : vous vous en emparez",
      ] },
      { key: "coupAssommant", name: "Coup assommant", cost: 2, source: "SR6",
        host: ["attaquerMelee"], hostLabel: "Attaquer en mêlée", when: "avantJet", lines: [
        "Si les dommages dépassent la Volonté de la cible, son moniteur étourdissant est rempli d'un coup",
        "La cible est inconsciente · aucun dommage ne passe au moniteur physique",
      ] },
      // `cancels` — annule la surtaxe d'état de F3. Trois entrées du corpus le
      // font ; sans ce champ l'app ferait payer une mineure déjà achetée.
      { key: "tirerDepuisCouvert", name: "Tirer depuis un couvert", cost: 2, source: "SR6",
        host: ["attaquerDistance"], hostLabel: "Attaquer à distance", when: "avantJet",
        cancels: ["couvert"], lines: [
        "Attaquer en restant à couvert, sans dépenser l'action mineure Attaquer depuis un couvert",
      ] },

      // AXE « au bon PNJ » + « au bon endroit » — les matricielles.
      { key: "optimisationUrgence", name: "Optimisation d'urgence", cost: 1, source: "SR6",
        where: "matrice", who: ["cyberjack", "resonance"], waivedBy: ["vieNumerique"],
        hostLabel: "bonus, avant le jet", when: "avantJet", lines: [
        "Augmente temporairement un attribut matriciel de 1 point pour un test",
      ] },
      // ⚠ Celle-ci coûte AUSSI une action majeure : la règle « les actions
      // d'Atout ne coûtent pas d'action » ne vaut que pour la section combat.
      { key: "saturation", name: "Saturation", cost: 2, source: "SR6",
        where: "matrice", who: ["cyberjack", "resonance"], waivedBy: ["vieNumerique"],
        actionCost: [{ key: "major", n: 1 }], hostLabel: "action majeure · légale", lines: [
        "Sature un serveur ou un persona : −2 en Traitement de données et −1 emplacement de programme actif",
        "Jusqu'à la fin du prochain round · aucun accès nécessaire",
      ] },
      { key: "technobavardage", name: "Technobavardage", cost: 2, source: "SR6",
        where: "matrice", who: ["resonance"], hostLabel: "bonus, avant le jet", when: "avantJet", lines: [
        "Technomanciens uniquement : Charisme au lieu de Logique pour la prochaine action matricielle",
      ] },

      // AXE « au bon endroit » — véhicule dérivable.
      { key: "dansMaBulle", name: "Dans ma bulle", cost: 4, source: "À tombeau ouvert",
        where: "vehicule", who: ["pilote"], hostLabel: "Pilotage", when: "avantJet", lines: [
        "Ignore les malus modifiant la Maniabilité du véhicule pour ce test",
      ] },

      // AXE « au bon endroit » — contexte NON dérivable, plus un rôle de scène.
      { key: "freinageBrutal", name: "Freinage brutal", cost: 2, source: "À tombeau ouvert",
        where: "poursuite", role: "cible", hostLabel: "Pilotage", lines: [
        "Tous les participants sont rapprochés d'une catégorie de distance de votre position",
      ] },
      { key: "semerPoursuivants", name: "Semer les poursuivants", cost: 4, costLabel: "4 ou 8 points",
        source: "À tombeau ouvert", where: "poursuite", role: "cible",
        hostLabel: "Pilotage ou Athlétisme", lines: [
        "+1 catégorie de distance pour 4 points d'Atout, +2 pour 8",
        "Un adversaire déjà à distance extrême y reste · vous gagnez un avantage positionnel",
      ] },

      // Règle OPTIONNELLE, et coût en FORMULE : deux champs que le corpus impose.
      { key: "eliminationSilencieuse", name: "Élimination silencieuse", cost: 1,
        costLabel: "le Professionnalisme de la cible (minimum 1)",
        source: "Compagnon du Sixième Monde", optional: true,
        host: ["attaquerMelee"], hostLabel: "attaque de mêlée", when: "avantJet", lines: [
        "Test de compétence d'arme + Agilité, seuil 4 : le moniteur de la cible est entièrement rempli",
        "Figurants uniquement, à portée de combat rapproché, totalement inconscients de votre présence",
      ] },

      { key: "desarmement", name: "Désarmement", cost: 5, source: "SR6", host: ["attaquerMelee", "attaquerDistance"], hostLabel: "toute attaque", when: "avantJet", lines: [
        "Une attaque réussie ne blesse pas la cible mais lui arrache son arme des mains",
      ] },
      { key: "encouragement", name: "Encouragement", cost: 4, source: "SR6", hostLabel: "Utiliser une compétence (Influence)", when: "avantJet", lines: [
        "Test d'Influence + Charisme : la cible regagne un point d'Atout par succès",
        "Sans pouvoir dépasser son rang d'Atout + 1",
      ] },
      { key: "haranguer", name: "Haranguer", cost: 4, source: "SR6", hostLabel: "Utiliser une compétence (Influence)", when: "avantJet", lines: [
        "Test d'Influence + Charisme : chaque succès fait gagner 1 point d'Atout",
        "À une personne différente à chaque fois, au choix du MJ, parmi ceux que le personnage harangue",
      ] },
      { key: "inspirationSoudaine", name: "Inspiration soudaine", cost: 1, source: "SR6", hostLabel: "toutes", when: "avantJet", lines: [
        "Effectuer une action pour laquelle on n'a aucun rang de compétence, sans malus",
        "N'autorise pas les compétences inutilisables quand on est Inexpérimenté",
      ] },
      { key: "amiDunAmi", name: "L'ami d'un ami", cost: 1, costLabel: "Réseau + Loyauté du contact temporaire", source: "SR6", hostLabel: "Utiliser une compétence (Influence)", when: "avantJet", lines: [
        "Être mis en relation avec une personne servant de contact, pour une unique requête",
      ] },
      { key: "placementParfait", name: "Placement parfait", cost: 4, source: "SR6", host: ["attaquerDistance"], hostLabel: "Attaquer à distance", when: "avantJet", lines: [
        "En attaquant plusieurs adversaires (Attaques multiples ou mode de tir), réserve de dés COMPLÈTE pour chaque cible",
      ] },
      { key: "poignarder", name: "Poignarder", cost: 1, source: "SR6", host: ["attaquerMelee"], hostLabel: "Attaquer en mêlée", when: "avantJet", lines: [
        "Avec une lame : réduit le malus de Cibler de 2",
      ] },
      { key: "renverser", name: "Renverser", cost: 1, source: "SR6", host: ["attaquerMelee"], hostLabel: "Attaquer en mêlée", when: "avantJet", maySet: [{ status: "aterre", level: 1, when: "si les dommages dépassent la Constitution de la cible" }], lines: [
        "Si les dommages dépassent la Constitution de la cible, elle tombe et subit l'état À terre",
      ] },
      { key: "rouladeTactique", name: "Roulade tactique", cost: 1, source: "SR6", host: ["seJeterParTerre"], hostLabel: "Se jeter par terre", when: "avantJet", lines: [
        "Une attaque de mêlée le même round ne subit pas le malus de l'état À terre",
        "Au round suivant : ni le −2 dés d'À terre à portée proche/courte, ni le malus de Se jeter par terre",
      ] },
      { key: "dansLaPoche", name: "Se mettre quelqu'un dans la poche", cost: 4, source: "SR6", hostLabel: "Utiliser une compétence (Influence (Étiquette))", when: "avantJet", lines: [
        "Test d'Influence (Étiquette) réussi : le PNJ garde une bonne impression et évite de vous nuire",
        "Tant que cela ne lui est pas directement néfaste",
      ] },
      { key: "organesVitaux", name: "Viser les organes vitaux", cost: 5, source: "SR6", host: ["attaquerMelee", "attaquerDistance"], hostLabel: "toute attaque", when: "avantJet", lines: [
        "L'attaque touche un organe vital : +3 aux dégâts si elle réussit, en plus des succès nets",
      ] },
      { key: "signalHurlant", name: "Signal hurlant", cost: 2, source: "SR6", family: "bonus", where: "matrice", who: ["cyberjack", "resonance"], waivedBy: ["vieNumerique"], hostLabel: "bonus, avant le jet", when: "avantJet", lines: [
        "La prochaine action ignore tous les malus dus au Bruit",
      ] },
      { key: "sousLeRadar", name: "Sous le radar", cost: 3, source: "SR6", family: "bonus", where: "matrice", who: ["cyberjack", "resonance"], waivedBy: ["vieNumerique"], hostLabel: "bonus, avant le jet", when: "avantJet", lines: [
        "La prochaine action illégale de ce tour n'augmente pas le Score de Surveillance",
        "L'action ne devient pas légale pour autant",
      ] },
      { key: "adroitSinge", name: "Adroit comme un singe", cost: 2, source: "Feu Nourri", hostLabel: "Escalade", when: "avantJet", lines: [
        "Modifie la distance d'escalade de 1,2 m par succès (1,3 m avec Allonge)",
      ] },
      { key: "ancreAuSol", name: "Ancré au sol", cost: 2, source: "Feu Nourri", hostLabel: "Défense", when: "avantJet", lines: [
        "Test d'Agilité + Athlétisme : les succès s'ajoutent à la Constitution pour déterminer la mise à terre",
        "Vaut aussi contre Faire trébucher et Renverser",
      ] },
      { key: "armoireAGlace", name: "Armoire à glace", cost: 2, source: "Feu Nourri", host: ["intercepter"], hostLabel: "Intercepter", when: "avantJet", lines: [
        "Chaque succès réduit le déplacement de l'adversaire de 1 mètre",
        "Résultat de l'attaque supérieur à l'Agilité de l'adversaire : il s'arrête à côté du personnage",
      ] },
      { key: "neutraliser", name: "Attaque ciblée : Neutraliser", cost: 2, source: "Feu Nourri", host: ["attaquerMelee", "attaquerDistance"], hostLabel: "toute attaque", when: "avantJet", lines: [
        "VD modifiée supérieure à la Réaction de la cible : elle gagne l'état Désorienté (durée = succès nets en rounds)",
      ] },
      { key: "destructionArme", name: "Attaque ciblée : Destruction d'arme", cost: 5, source: "Feu Nourri", host: ["attaquerMelee", "attaquerDistance"], hostLabel: "toute attaque", when: "avantJet", lines: [
        "La cible ne subit aucun dommage — c'est son ARME qui encaisse (même test que détruire un obstacle)",
        "VD modifiée supérieure à la Structure de l'arme : elle est détruite",
        "Sinon son Score Offensif baisse de 1 par succès net, DÉFINITIVEMENT et à toutes les portées — un SO tombé à 0 rend l'arme inutilisable à cette distance",
        "Structure à la discrétion du MJ, entre 8 et 12 selon le type et la fabrication",
      ] },
      { key: "bequille", name: "Béquille", cost: 2, source: "Feu Nourri", host: ["attaquerMelee", "attaquerDistance"], hostLabel: "toute attaque", when: "avantJet", lines: [
        "Vise le tendon, le genou ou la jambe : VD modifiée supérieure à l'Agilité de l'adversaire → état Entravé (durée = succès nets en rounds)",
        "Cette attaque n'inflige aucun dommage",
      ] },
      { key: "claqueAssourdissante", name: "Claque assourdissante", cost: 2, source: "Feu Nourri", host: ["attaquerMelee", "attaquerDistance"], hostLabel: "toute attaque", when: "avantJet", lines: [
        "Succès nets supérieurs à la Volonté de l'adversaire : il gagne l'état Assourdi (durée = succès nets en rounds)",
        "Cette attaque n'inflige aucun dommage",
      ] },
      { key: "clouer", name: "Clouer", cost: 2, source: "Feu Nourri", hostLabel: "Attaque avec arme de jet ou de trait", when: "avantJet", lines: [
        "VD modifiée supérieure à l'Agilité : la cible est clouée au mur ou au sol et gagne l'état Immobilisé",
        "Elle doit dépenser Ramasser/Poser un objet pour s'en défaire",
      ] },
      { key: "coupBas", name: "Coup bas", cost: 2, source: "Feu Nourri", host: ["attaquerMelee"], hostLabel: "toute attaque de mêlée", when: "avantJet", lines: [
        "VD modifiée supérieure à la Volonté de l'adversaire : il gagne l'état Confus (durée = succès nets en rounds)",
        "Cette attaque n'inflige aucun dommage",
      ] },
      { key: "demonstrationForce", name: "Démonstration de force", cost: 1, source: "Feu Nourri", host: ["bloquer"], hostLabel: "Bloquer", when: "avantJet", lines: [
        "Tant que le personnage n'a pas été touché et qu'il manie une arme de mêlée, son Score Défensif est remplacé par le Score Offensif de son arme",
      ] },
      { key: "diversion", name: "Diversion", cost: 2, source: "Feu Nourri", host: ["attaquerMelee"], hostLabel: "Attaque de mêlée", when: "avantJet", lines: [
        "Une action mineure + test d'Athlétisme + Agilité (3) : −3 dés à la Défense de la cible contre votre prochaine attaque en Combat rapproché",
        "Un objet accroché à l'arme de mêlée se détache sans dépenser Préparer une arme",
      ] },
      { key: "enchevetrer", name: "Enchevêtrer", cost: 2, source: "Feu Nourri", host: ["attaquerMelee"], hostLabel: "Lutte avec armes exotiques", when: "avantJet", lines: [
        "Fouet, chaîne, bolas, lasso en lutte : après une attaque réussie, test d'Agilité + succès nets contre l'Agilité de la cible",
        "Réussi : la cible gagne l'état Entravé (durée = succès nets en rounds)",
        "Tant qu'elle est entravée, quiconque l'attaque gagne AUTOMATIQUEMENT un point d'Atout",
      ] },
      { key: "evasionKarmique", name: "Évasion karmique", cost: 2, source: "Feu Nourri", host: ["bloquer", "esquiver"], hostLabel: "Bloquer, Esquiver", when: "avantJet", lines: [
        "S'utilise APRÈS avoir ÉCHOUÉ à bloquer ou esquiver une attaque qui inflige un état",
        "Une action mineure de plus : on troque l'état contre des DOMMAGES — les succès nets frappent comme s'ils avaient infligé des dégâts",
      ] },
      { key: "faireLeMort", name: "Faire le mort", cost: 3, source: "Feu Nourri", hostLabel: "Utiliser une compétence (Influence)", when: "avantJet", lines: [
        "Test d'Escroquerie + Charisme contre Volonté + Intuition (le MJ module selon la crédibilité de la mise en scène)",
        "Gagné : le personnage prend 1 point d'Atout, l'adversaire est surpris et ne peut pas dépenser d'Atout à sa prochaine action contre lui",
        "Le MJ peut attendre l'attaque suivante pour révéler si ça a marché",
      ] },
      { key: "fracture", name: "Fracture", cost: 4, source: "Feu Nourri", host: ["attaquerMelee", "attaquerDistance"], hostLabel: "toute attaque", when: "avantJet", lines: [
        "Vise un membre précis, au prix d'un malus de −4 à la réserve : attaque réussie → le membre gagne l'état Estropié",
        "VD modifiée supérieure à la Constitution de l'adversaire : Estropié II (durée = succès nets en rounds)",
        "Reproductible sur le même membre jusqu'à Estropié III · la durée se cumule",
      ] },
      { key: "frappeGorge", name: "Frappe à la gorge", cost: 2, source: "Feu Nourri", host: ["attaquerMelee"], hostLabel: "toute attaque de mêlée", when: "avantJet", lines: [
        "Succès nets supérieurs à l'Agilité de l'adversaire : il gagne l'état Muet (durée = succès nets en rounds)",
        "Cette attaque n'inflige aucun dommage",
      ] },
      { key: "frappeAveuglante", name: "Frappe aveuglante", cost: 4, source: "Feu Nourri", host: ["attaquerMelee", "attaquerDistance"], hostLabel: "toute attaque", when: "avantJet", lines: [
        "Attaque réussie : la cible subit l'état Aveuglé au niveau (succès nets ÷ 2), arrondi au supérieur",
        "Durée = succès nets en rounds · cette attaque n'inflige aucun autre dommage",
      ] },
      { key: "parkour", name: "Parkour", cost: 2, source: "Feu Nourri", host: ["sprinter"], hostLabel: "Sprinter", when: "avantJet", lines: [
        "Déplacements horizontaux ET verticaux pour une seule action majeure (au lieu de plusieurs mineures)",
        "En sprintant, retire des succès de Sprinter pour de la distance VERTICALE, jusqu'à son Agilité en mètres",
        "Doit finir sur une surface horizontale, sinon il tombe · un adepte avec Course sur les murs porte sa base de sprint à 18 m",
      ] },
      { key: "porteeEtendue", name: "Portée étendue", cost: 1, source: "Feu Nourri", host: ["attaquerMelee"], hostLabel: "Attaque de mêlée", when: "avantJet", lines: [
        "En maniant DEUX armes de mêlée : la portée Proche est étendue de 2 mètres pour toute la rencontre",
      ] },
      { key: "presenceIntimidante", name: "Présence intimidante", cost: 2, source: "Feu Nourri", hostLabel: "Utiliser une compétence (Influence)", when: "avantJet", lines: [
        "Test d'Influence + Force contre Volonté + Force : les succès nets réduisent le Score Offensif de l'adversaire ce round, un pour un",
        "Succès nets supérieurs à son Score Offensif : il ne peut ni gagner ni dépenser d'Atout de tout le round",
        "Touche quiconque peut voir ET entendre le personnage",
      ] },
      { key: "projection", name: "Projection", cost: 4, source: "Feu Nourri", hostLabel: "Lutte", when: "avantJet", lines: [
        "L'adversaire doit d'abord être saisi · test de Combat rapproché + Force contre Constitution + Force",
        "L'attaquant utilise son SO à mains nues ; le défenseur ne subit pas le malus d'immobilisation",
        "Projeté d'un mètre par succès excédentaire, libéré de la prise, il gagne l'état À terre · le MJ peut ajouter des dommages selon l'atterrissage",
        "⚠ Le texte du livre dit « 2 points, ou 4 pour choisir l'endroit » ; sa table des coûts ne retient que 4 — c'est elle qui fait foi ici",
      ] },
      { key: "promptADegainer", name: "Prompt à dégainer", cost: 2, source: "Feu Nourri", host: ["degainerRapidement", "attaquer"], hostLabel: "Dégainer rapidement, Attaque", when: "avantJet", lines: [
        "Autorise Dégainer rapidement avec N'IMPORTE QUELLE arme de mêlée",
        "Doit être employée avec l'action majeure Attaquer",
      ] },
      { key: "protegerEssentiel", name: "Protéger l'essentiel", cost: 2, source: "Feu Nourri", host: ["intercepter"], hostLabel: "Intercepter", when: "avantJet", lines: [
        "Si le personnage peut rejoindre l'allié en 1 action mineure, il encaisse les dommages à sa place",
        "Il lui est impossible de bloquer ou d'esquiver cette attaque",
      ] },
      { key: "provocation", name: "Provocation", cost: 1, source: "Feu Nourri", hostLabel: "Utiliser une compétence (Influence)", when: "avantJet", lines: [
        "Test d'Influence + Charisme contre Volonté + Intuition",
        "Les succès nets augmentent le Score Défensif de L'ALLIÉ visé contre cet adversaire, pendant un round",
      ] },
      { key: "repousserAdversaire", name: "Repousser un adversaire", cost: 2, source: "Feu Nourri", host: ["attaquer", "seDeplacer"], hostLabel: "Attaque de mêlée, Déplacement", when: "avantJet", lines: [
        "Exige de s'être déplacé d'au moins 5 mètres avant l'attaque",
        "Les succès nets convertissent des dommages en déplacement, jusqu'à concurrence de la Constitution de l'attaquant",
        "Recul = Force de l'attaquant + succès transférés − Constitution du défenseur, en mètres",
        "Si l'attaque blesse, calculer la mise à terre comme si la VD était supérieure de 2 AVANT le transfert",
      ] },
      { key: "retourEnvoyeur", name: "Retour à l'envoyeur !", cost: 3, source: "Feu Nourri", host: ["eviter"], hostLabel: "Éviter", when: "avantJet", lines: [
        "L'action mineure Éviter place le personnage au point d'impact de la grenade",
        "Puis Ramasser un objet + test d'Athlétisme + Réaction : 10 mètres par succès, dans une direction ALÉATOIRE",
        "Pour la renvoyer précisément à l'envoyeur, le test passe à Athlétisme + Réaction (2)",
      ] },
      { key: "riposte", name: "Riposte", cost: 4, source: "Feu Nourri", host: ["bloquer"], hostLabel: "Bloquer", when: "avantJet", lines: [
        "La dépense réduit d'abord la base de dommages reçus de 2",
        "Test de Défense réussi : l'attaquant subit des dommages égaux aux succès nets de ce test",
      ] },
      { key: "rouleBoule", name: "Roulé-boulé", cost: 1, source: "Feu Nourri", hostLabel: "le personnage obtient l'état À terre", when: "avantJet", lines: [
        "Se déplacer jusqu'à 1 mètre du point de chute — de quoi changer de catégorie de portée ou gagner un couvert",
        "Le personnage reste au sol : l'état À terre s'applique quand même",
      ] },
      { key: "rattraperBranches", name: "Se rattraper aux branches", cost: 2, source: "Feu Nourri", hostLabel: "Tomber", when: "avantJet", lines: [
        "Exige un mur, une falaise ou des arbres à portée pendant la chute",
        "Test d'Athlétisme + Agilité : chaque succès ajoute 1 mètre de chute SANS dommage à la distance de sécurité",
      ] },
      { key: "simuler", name: "Simuler", cost: 2, source: "Feu Nourri", host: ["attaquerMelee", "attaquerDistance"], hostLabel: "toute attaque", when: "avantJet", lines: [
        "Au lieu d'infliger des dommages, les succès nets réduisent le Score Défensif de la cible au round suivant, un pour un",
        "Ce Score Défensif vaut pour TOUT attaquant ciblant cet individu",
      ] },
      { key: "tirDeCouverture", name: "Tir de couverture", cost: 3, source: "Feu Nourri", host: ["attaquerDistance"], hostLabel: "Attaque TR ou TA", when: "avantJet", cancels: ["couvert"], lines: [
        "Tir en Rafale : deux alliés gagnent +2 de Couvert (jusqu'à Couvert IV) si les adversaires ciblés ripostent",
        "Tir Automatique : VD réduite de 2, les alliés gagnent Couvert IV",
        "Les alliés peuvent attaquer sans l'action mineure Attaquer depuis un couvert",
      ] },
      { key: "transfertForce", name: "Transfert de force", cost: 3, source: "Feu Nourri", host: ["faireTrebucher"], hostLabel: "Faire trébucher", when: "avantJet", lines: [
        "Test de défense Athlétisme + Agilité : succès nets supérieurs à l'Agilité de l'adversaire → aucun dommage et l'adversaire gagne À terre",
      ] },
      { key: "vifCommeVent", name: "Vif comme le vent", cost: 3, source: "Feu Nourri", host: ["sprinter"], hostLabel: "Sprinter", when: "avantJet", cancels: ["couvert"], lines: [
        "En sprintant, retire des succès de Sprinter pour se mettre à couvert (jusqu'à Couvert IV) pendant un round",
        "Les autres actions comptent comme à couvert, y compris gagner et dépenser de l'Atout",
        "Peut attaquer sans l'action mineure Attaquer depuis un couvert",
      ] },
      { key: "assaut", name: "Assaut", cost: 4, source: "À tombeau ouvert", where: "vehicule", who: ["pilote"], hostLabel: "Ingénierie ‹Armes de véhicule›", when: "avantJet", lines: [
        "Action majeure pour attaquer : ajoutez votre rang en Pilotage au test d'Ingénierie (Armes de véhicule) + Logique",
        "Jusqu'à la fin du round, tout adversaire attaquant votre véhicule gagne un point d'Atout",
      ] },
      { key: "solGlissant", name: "Attention, sol glissant", cost: 2, source: "À tombeau ouvert", where: "vehicule", who: ["pilote"], hostLabel: "Pulvérisateur d'huile · action mineure", when: "avantJet", lines: [
        "Une flaque d'huile devant une cible à distance proche : elle ne peut ni gagner ni dépenser d'Atout sur son test d'Accident",
      ] },
      { key: "autoStop", name: "Auto-stop", cost: 4, source: "À tombeau ouvert", where: "vehicule", who: ["pilote"], hostLabel: "Pilotage", when: "avantJet", lines: [
        "Faire déraper le véhicule devant une cible proche pour l'attraper au vol",
        "La cible subit 5 cases de dommages étourdissants (non résistables), réduits de 1 par succès net",
      ] },
      { key: "ciblageAuto", name: "Ciblage automatique", cost: 6, source: "À tombeau ouvert", where: "vehicule", who: ["pilote"], hostLabel: "Ingénierie ‹Armes de véhicule›", when: "avantJet", lines: [
        "Au moins un succès net avec une arme montée : succès nets supplémentaires égaux à l'indice Senseurs du véhicule",
      ] },
      { key: "ecranFumee", name: "Écran de fumée", cost: 1, source: "À tombeau ouvert", where: "vehicule", who: ["pilote"], hostLabel: "Diffuseur de fumée · action mineure", when: "avantJet", lines: [
        "Un niveau de Couvert par point d'Atout dépensé (Couvert I pour 1, II pour 2…)",
        "Seulement contre les attaques venant de derrière vous",
      ] },
      { key: "feuCroise", name: "Feu croisé", cost: 6, source: "À tombeau ouvert", where: "vehicule", who: ["pilote"], hostLabel: "Test de Défense", when: "avantJet", lines: [
        "À annoncer AVANT le test de Défense : attire le feu vers une autre cible proche ou courte",
        "Tout succès net compte comme un succès contre la cible choisie, qui ne peut ni gagner ni dépenser d'Atout",
      ] },
      { key: "interception", name: "Interception", cost: 5, source: "À tombeau ouvert", where: "vehicule", hostLabel: "toute attaque", when: "avantJet", lines: [
        "Action majeure pour attaquer un missile, une torpille ou une grenade lancée vers vous",
        "Seuil 5 · exige une arme à distance prête · échec : ni Éviter ni Se jeter par terre pour se protéger",
      ] },
      { key: "avantageRigger", name: "L'avantage du rigger", cost: 6, source: "À tombeau ouvert", where: "vehicule", who: ["pilote"], hostLabel: "Pilotage ou Défense", when: "avantJet", lines: [
        "Ajoutez l'indice de votre câblage de contrôle à votre nombre de succès total",
      ] },
      { key: "parIciLaSortie", name: "Par ici la sortie", cost: 6, source: "À tombeau ouvert", where: "vehicule", who: ["pilote"], hostLabel: "Pilotage", when: "avantJet", lines: [
        "Réduit sa vitesse pour s'échapper du véhicule en sécurité, au prix d'une action mineure supplémentaire",
        "Au moins 5 succès : le véhicule s'arrête sans dommage ; sinon l'autopilote teste l'Accident",
      ] },
      { key: "aspiration", name: "Aspiration", cost: 2, source: "À tombeau ouvert", where: "poursuite", role: "poursuivant", hostLabel: "Pilotage", lines: [
        "Si un participant est devant vous à distance proche ou courte, avancez d'une catégorie de distance par rapport à la cible",
      ] },
      { key: "changementEnv", name: "Changement d'environnement", cost: 5, source: "À tombeau ouvert", where: "poursuite", hostLabel: "Pilotage ou Athlétisme", lines: [
        "Choisissez un environnement dégagé, étroit ou encombré à partir du prochain round",
        "Si plusieurs tentent l'action, seul le meilleur succès net la réalise ; les autres ne dépensent pas d'Atout",
      ] },
      { key: "compteursAZero", name: "Compteurs à zéro", cost: 2, source: "À tombeau ouvert", where: "poursuite", hostLabel: "Pilotage ou Athlétisme", lines: [
        "Réussi ou non, annule tous les avantages positionnels des participants vis-à-vis de vous pour tout le round",
      ] },
      { key: "concentration", name: "Concentration", cost: 3, source: "À tombeau ouvert", where: "poursuite", hostLabel: "Pilotage ou Athlétisme", lines: [
        "Réduit la Maniabilité du véhicule de 1 pour ce test, ou le seuil du test d'Athlétisme (Course) de 1",
      ] },
      { key: "culDeSac", name: "Cul-de-sac", cost: 5, source: "À tombeau ouvert", where: "poursuite", role: "poursuivant", hostLabel: "Pilotage ou Athlétisme", lines: [
        "Test opposé de Plein air (Orientation) + Intuition : la cible s'engage dans une voie sans issue",
        "Met fin à la course-poursuite · un round doit s'écouler avant qu'une nouvelle s'engage",
      ] },
      { key: "dansLeRouge", name: "Dans le rouge", cost: 4, source: "À tombeau ouvert", where: "poursuite", hostLabel: "Pilotage", lines: [
        "Rapproche d'une à deux catégories de distance de la cible ; votre véhicule subit 4P non résistables",
        "Si vous êtes la cible : empêche vos poursuivants de vous rattraper jusqu'à la fin du round",
      ] },
      { key: "demiTour", name: "Demi-tour", cost: 2, source: "À tombeau ouvert", where: "poursuite", role: "cible", hostLabel: "Pilotage ou Athlétisme", lines: [
        "Virage brusque : ajuste d'une catégorie la position relative de TOUS les participants",
      ] },
      { key: "fuite", name: "Fuite !", cost: 4, source: "À tombeau ouvert", where: "poursuite", role: "cible", hostLabel: "Pilotage ou Athlétisme", lines: [
        "Si tous vos adversaires sont à distance extrême en véhicule (ou moyenne à pied), vous vous échappez",
        "Ils doivent obtenir autant de succès nets que votre test ou être semés",
      ] },
      { key: "manoeuvreSubtile", name: "Manœuvre subtile", cost: 3, source: "À tombeau ouvert", where: "poursuite", hostLabel: "Pilotage", lines: [
        "Lors d'un test de Furtivité, ajoutez un nombre de dés bonus égal à votre rang en Pilotage",
        "Seulement en dirigeant un véhicule ou un drone",
      ] },
      { key: "pouleMouillee", name: "Poule mouillée", cost: 6, source: "À tombeau ouvert", where: "poursuite", role: "cible", hostLabel: "Pilotage", lines: [
        "Celui de vous deux qui obtient le moins de succès nets au test de Pilotage doit réussir un test d'Accident ou sortir de la route",
        "Impossible en environnement dégagé",
      ] },
      { key: "surenchere", name: "Surenchère", cost: 2, costLabel: "2, 4 ou 6 points", source: "À tombeau ouvert", where: "poursuite", role: "cible", hostLabel: "Pilotage ou Athlétisme", lines: [
        "Environnement encombré uniquement : +1 de malus à votre Maniabilité (ou au seuil d'Athlétisme) tous les 2 points d'Atout",
        "Vos adversaires doivent accepter le malus ou abandonner la poursuite",
      ] },
      { key: "tokyoDrift", name: "Tokyo drift", cost: 2, source: "À tombeau ouvert", where: "poursuite", role: "cible", hostLabel: "Pilotage ou Athlétisme", lines: [
        "Une action de Dérapage réussie empêche vos poursuivants de changer de position, sauf autant de succès nets que vous",
      ] },
      { key: "manoeuvreEvitement", name: "Manœuvre d'évitement", cost: 4, source: "À tombeau ouvert", family: "bonus", where: "vehicule", who: ["pilote"], hostLabel: "bonus · test Défensif", when: "avantJet", lines: [
        "Ajoutez votre rang en Pilotage à votre réserve lors d'un test Défensif contre une attaque ciblant un véhicule que vous pilotez",
      ] },
      { key: "quitteOuDouble", name: "Quitte ou double", cost: 2, costLabel: "2, 4 ou 6 points", source: "À tombeau ouvert", family: "bonus", where: "vehicule", hostLabel: "bonus · avant ou après le jet", lines: [
        "Jusqu'à trois dés libres, un par tranche de 2 points d'Atout",
        "Utilisable avant OU après le jet — le dé libre peut aider ou empirer",
        "Un 1 sur un dé libre : tous les 5 sont ignorés, y compris sur les autres dés libres",
      ] },
      { key: "departEnPart", name: "De part en part", cost: 1, costLabel: "la Constitution de la cible (APDS −2, minimum 1)", source: "Compagnon du Sixième Monde", optional: true, host: ["attaquerMelee", "attaquerDistance"], hostLabel: "munitions APDS et normales", when: "avantJet", lines: [
        "La balle traverse la cible : la VD de l'arme est augmentée de moitié, arrondi au supérieur",
      ] },
      { key: "dispersionShotgun", name: "Dispersion du shotgun", cost: 2, costLabel: "2 points (1 pour les smartguns)", source: "Compagnon du Sixième Monde", optional: true, host: ["attaquerMelee", "attaquerDistance"], hostLabel: "balles fléchettes pour shotgun", when: "avantJet", lines: [
        "À portée Proche ou Courte : règle le cône pour un tir en rafale large ne consommant qu'une cartouche",
        "Même si le shotgun ne peut pas tirer en mode rafale",
      ] },
      { key: "munitionDefectueuse", name: "Munition défectueuse !", cost: 5, source: "Compagnon du Sixième Monde", optional: true, host: ["attaquerMelee", "attaquerDistance"], hostLabel: "attaque explosive", when: "avantJet", lines: [
        "Une grenade ou une roquette ne détonne pas après avoir été tirée",
        "À déclarer juste après la résolution de la dispersion · l'explosion est annulée",
      ] },
    ],
  },
  /** MODES DE TIR (lot F2) — chapitre Combat, caractéristiques des armes.

      SR6 ne paie pas en modificateur de défense mais en SCORE OFFENSIF : « SA :
      quand vous tirez deux balles, réduisez le Score Offensif de votre arme de
      2 points et augmentez sa Valeur de Dommages de 1 point » ; « TR : quatre
      balles par attaque […] rafale ciblée, qui réduit votre Score Offensif de 4
      et augmente votre Valeur de Dommages de 2 » ; « TA : ce mode utilise dix
      balles et réduit le Score Offensif de 6 points ».

      Pas de `defense` ici, et pas de `recoil` non plus : SR6 n'a PAS de recul
      progressif — le Score Offensif a remplacé toute cette mécanique. Le
      contrat s'en tait plutôt que de porter des zéros trompeurs.

      La rafale LARGE est une entrée à part parce que le livre en fait un choix
      distinct de la rafale ciblée, au même coût en balles : « répartir votre
      réserve de dés entre deux cibles […] en considérant chacune de ces
      attaques comme étant effectuée en mode SA et sans avoir recours à l'action
      mineure Attaques multiples ». */
  fireModes: [
    { key: "cc", name: "Coup par coup", requires: "CC", actionKey: "attaquer", bullets: 1, so: 0, dv: 0 },
    { key: "sa1", name: "Semi-automatique (1 balle)", requires: "SA", actionKey: "attaquer", bullets: 1, so: 0, dv: 0 },
    { key: "sa2", name: "Semi-automatique (2 balles)", requires: "SA", actionKey: "attaquer", bullets: 2, so: -2, dv: 1 },
    { key: "trCiblee", name: "Rafale ciblée", requires: "TR", actionKey: "attaquer", bullets: 4, so: -4, dv: 2 },
    { key: "trLarge", name: "Rafale large", requires: "TR", actionKey: "attaquer", bullets: 4, so: 0, dv: 0,
      note: "deux cibles proches, réserve répartie, chaque attaque traitée comme SA — sans l'action Attaques multiples" },
    { key: "ta", name: "Tir automatique", requires: "TA", actionKey: "attaquer", bullets: 10, so: -6, dv: 0,
      note: "toutes les cibles valides dans un rayon d'1 m · +1 m par −2 SO supplémentaire, tant que le SO reste positif" },
  ],
  /** RECHARGEMENT (lot F2) — deux entrées du catalogue d'actions, et le
      smartlink décide laquelle. « Il faut utiliser une action majeure pour
      recharger une arme SANS SMARTLINK ou dont le smartlink est désactivé » ;
      le smartgun, lui, « éjecte le chargeur de son arme et en engage un autre
      en un seul mouvement » pour une mineure.

      ⚠ SYNERGIE À DEUX MOITIÉS. La mineure suppose « un personnage CONNECTÉ à
      un smartgun prêt à être utilisé » : le système sur l'arme ET le smartlink
      du personnage qui l'y relie. Le libellé de l'action majeure le confirme en
      creux — elle vise l'arme « sans smartlink OU DONT LE SMARTLINK EST
      DÉSACTIVÉ », donc la liaison, pas la quincaillerie. Sans `pnj.smartlink`,
      le rechargement reste une majeure. Même condition que le bonus de dés
      (`weaponModel.smartlinkBonus`), qui exigeait déjà les deux moitiés.

      Le contrat renvoie des clés d'action, jamais un coût : `actionModel` les
      porte déjà. */
  reloadPlan(parsed, pnj) {
    if (!parsed || !parsed.capacity || !parsed.capacity.length) return [];
    const connecte = !!(parsed.smart && pnj && pnj.smartlink);
    return connecte ? ["rechargerSmartgun"] : ["rechargerArme"];
  },
  /** ÉTATS DE COMBAT (lot E1) — le catalogue, lu par `Statuses` via ce contrat
      neutre. SR6 est la seule édition à avoir un vrai système d'états : une
      table, pas de la prose.

      SOURCES. 23 états viennent du livre de base p.55-58 (`page: "p.55-58"`).
      Les 5 derniers (Déséquilibré, Estropié, Muet, Sanguinolent, Paralysé)
      n'y sont PAS : ils viennent des suppléments et la seule source paginable
      dont on dispose est le jeu de cartes officiel (`page: "Cartes d'états
      A02"`). C'est dit plutôt que masqué — la doctrine impose une source, pas
      une page inventée.

      NIVEAUX — deux notations que le livre distingue et qu'on ne confond pas
      (p.55) : chiffres romains au titre = plafond (`levels: 3|4`) ; `#` seul =
      niveau LIBRE donné par la source (`levels: null`) — « Le nombre qui suit
      l'état est le malus à votre réserve de dés » ; rien = binaire
      (`levels: 0`).

      `quick` — les 8 états qui sortent en accès direct sur la pastille. Critère
      : ce sont ceux que le MJ POSE, pas ceux qu'un autre état pose (Entravé
      arrive par Estropié III, À terre par Déséquilibré). Les 20 autres restent
      derrière « tous ».

      `lines` — les effets, RECOPIÉS du livre, affichés et sourcés, JAMAIS
      appliqués au lot E1 (même arbitrage qu'ActorEffects : on ne motorise pas
      un jet qui n'existe pas dans l'app). L'auto-application viendra au lot E3
      et ne concernera qu'une poignée d'entre eux. */
  statusModel: {
    unit: "round", // unité de durée de l'édition (Anarchy comptera en narrations)
    catalog: [
      // INTERDICTION CIBLÉE (F3b) : « La vitesse de déplacement du personnage
      // est réduite à 2 mètres et IL NE PEUT PAS SPRINTER » — le livre nomme
      // l'action, la phrase ne porte aucune condition. Cf. l'en-tête de
      // `Actions.forbidden` pour ce qui distingue ça d'un arrêt large.
      { key: "aterre", name: "À terre", levels: 0, quick: true, page: "p.55-58",
        forbids: [{ actions: ["sprinter"], why: "à terre, on ne peut pas Sprinter" }], lines: [
        "Vitesse de déplacement : 2 m, sprint impossible",
        "−2 dés en défense contre les attaques à portée proche/courte",
        "+2 dés en défense contre les attaques à distance (moyenne et plus)",
        "−2 à la VD subie des attaques explosives",
        "−4 dés aux attaques de mêlée ou avec un arc",
        "+2 au SO des armes à feu / à projectiles (sauf arcs)",
      ] },
      { key: "assourdi", name: "Assourdi", levels: 3, page: "p.55-58", lines: [
        "(I, II) −3 dés / niveau aux tests liés à l'audition",
        "(III) échec automatique des tests liés à l'audition",
      ] },
      { key: "aveugle", name: "Aveuglé", levels: 3, quick: true, page: "p.55-58", lines: [
        "(I, II) −3 dés / niveau aux tests liés à la vision",
        "(III) échec automatique des tests liés à la vision",
      ] },
      // AUTO-APPLIQUÉ (E3) : le seul état à niveau libre qui dise « toutes les
      // actions » sans réserve → il entre dans Utils.dicePenalty.
      { key: "confus", name: "Confus", levels: null, quick: true, page: "p.55-58",
        globalDice: { perLevel: 1 }, lines: [
        "−(niveau) dés à TOUTES les actions",
      ] },
      { key: "corrode", name: "Corrodé", levels: null, page: "p.55-58",
        periodic: { when: "endOfRound", vd: "level", type: "phys", resisted: true }, lines: [
        "Chaque round, résister à (niveau)P",
        "Ni Trempé ni l'eau ne l'annulent forcément — arbitrage MJ",
      ] },
      // SURTAXE AUTO (E3/F3) : « Attaquer à couvert nécessite une action mineure
      // supplémentaire afin de se dégager suffisamment pour faire feu ». C'est
      // la seule surtaxe d'action INCONDITIONNELLE du catalogue : l'état est
      // posé, l'action est nommée, il n'y a rien à arbitrer.
      // ⚠ Elle vise `attaquer` et PAS `attaquerCouvert` : cette mineure-là EST
      // l'action « Attaquer depuis un couvert » du livre, vue de l'autre côté.
      // Les cumuler ferait payer deux fois la même règle.
      { key: "couvert", name: "Couvert", levels: 4, quick: true, page: "p.55-58",
        surcharge: { auto: true, rules: [
          { targets: ["attaquer"], cost: [{ key: "minor", n: 1 }],
            why: "se dégager du couvert pour faire feu" },
        ] },
        lines: [
        "+1 au SD par niveau",
        "+1 dé / niveau aux tests de défense",
        "Attaquer à couvert coûte 1 action mineure supplémentaire",
        "−2 dés pour attaquer au niveau IV",
        "Impossible de gagner de l'Atout en attaquant",
      ] },
      // AUTO-APPLIQUÉ (E3) : les deux effets sont inconditionnels et ont chacun
      // une valeur à corriger dans l'app (le score d'init, le panneau pré-jet).
      { key: "desoriente", name: "Désorienté", levels: 0, quick: true, page: "p.55-58",
        initMalus: 4, edge: { spend: false, gain: false }, lines: [
        "−4 au score d'initiative",
        "Ni gain ni dépense d'Atout (Cramer reste possible)",
      ] },
      { key: "effraye", name: "Effrayé", levels: 0, page: "p.55-58", lines: [
        "−4 dés aux tests contre la source de l'état ou pour y résister",
      ] },
      // AUTO-APPLIQUÉ (E3) pour ses deux premiers effets ; « sprinter
      // impossible » reste du texte (l'app n'a pas de déplacement).
      // INTERDICTION CIBLÉE (F3b) : « il ne peut effectuer une action
      // Sprinter ». Le livre écrit « une action Sprinter » mot pour mot — c'est
      // le cas le plus net du catalogue.
      { key: "electrocute", name: "Électrocuté", levels: 0, page: "p.55-58",
        globalDice: { flat: 1 }, initMalus: 2,
        forbids: [{ actions: ["sprinter"], why: "les muscles ne répondent plus" }], lines: [
        "−2 au score d'initiative",
        "−1 dé à toutes les actions",
        "Sprinter impossible",
      ] },
      // `decay: 1` — « VD réduite de 1 par round ». C'est le seul état qui
      // s'éteint SEUL, sans que personne n'agisse : le niveau décroît, et à 0
      // l'état disparaît. Arithmétique pure sur un état posé par le MJ, donc
      // automatique au même titre que le malus de dés (critère E3).
      { key: "empoisonne", name: "Empoisonné", levels: null, quick: true, page: "p.55-58",
        periodic: { when: "endOfRound", vd: "level", type: "choice", resisted: true },
        decay: 1, lines: [
        "Chaque fin de round, résister à une VD de (niveau)P ou E selon l'effet",
        "VD réduite de 1 par round",
      ] },
      { key: "enflamme", name: "Enflammé", levels: null, quick: true, page: "p.55-58",
        cancels: ["trempe", "frigorifie"], cancelledBy: ["trempe", "frigorifie"],
        periodic: { when: "endOfRound", vd: "level", type: "phys", resisted: true }, lines: [
        "Chaque round, résister à une VD de (niveau)P",
        "Action majeure + test Agilité + Réaction (2) pour l'éteindre",
        "Annule et est annulé par Trempé et Frigorifié",
      ] },
      { key: "entrave", name: "Entravé", levels: 0, page: "p.55-58", lines: [
        "Vitesse de déplacement à pied divisée par 2 (arrondi au supérieur)",
      ] },
      // AUTO-APPLIQUÉ (E3). `exceptSoak` est DOCUMENTAIRE et porteur : la
      // réserve d'encaissement n'a jamais soustrait dicePenalty (elle affiche
      // pnj.damageResist brut, cf. cardrenderer.sr5/sr6 et encounterrenderer),
      // donc l'exception du livre est honorée par construction. Le champ est là
      // pour que personne ne « corrige » un jour cette omission sans voir que
      // deux états en dépendent.
      { key: "fatigue", name: "Fatigué", levels: 3, page: "p.55-58",
        globalDice: { perLevel: 2, exceptSoak: true }, lines: [
        "−2 dés / niveau à tous les jets SAUF résistance aux dommages",
        "Vitesse : 5 m (marche), 10 m (sprint)",
      ] },
      // ARRÊT LARGE (F3b) : « vous ne pouvez pas faire d'actions autre que
      // Perception et communication mentale ». C'est une LISTE BLANCHE, pas une
      // interdiction ciblée : elle se dit une fois en tête de feuille et ne
      // grise aucune puce (cf. `Actions.halts`).
      { key: "fige", name: "Figé", levels: 0, page: "p.55-58",
        halts: { why: "aucune action possible", except: "Perception, communication mentale, résistance aux dommages" }, lines: [
        "Déplacement impossible · tests de défense impossibles",
        "−10 au SD contre les attaques (minimum 0)",
        "Dommages continus et effets persistants SUSPENDUS",
        "Actions permises : Perception, communication mentale, résistance aux dommages",
      ] },
      // AUTO-APPLIQUÉ (E3) — même exception d'encaissement que Fatigué.
      { key: "frigorifie", name: "Frigorifié", levels: 0, page: "p.55-58",
        globalDice: { flat: 1, exceptSoak: true }, initMalus: 4,
        cancels: ["enflamme"], cancelledBy: ["enflamme"], lines: [
        "−4 au score d'initiative",
        "−1 dé à tous les jets SAUF résistance aux dommages",
        "Annule et est annulé par Enflammé",
      ] },
      // INTERDICTION CIBLÉE (F3b) : « les personnages subissant cet état NE
      // PEUVENT PAS SE DÉPLACER mais peuvent tout de même effectuer toute
      // action réalisable en ayant les pieds rivés au sol ».
      // ⚠ Le livre nomme « se déplacer » et pas « Sprinter ». On interdit les
      // DEUX quand même : sprinter est un déplacement à pied, et un Immobilisé
      // qui pourrait sprinter serait lu comme un bug, pas comme de la rigueur.
      // Le corollaire « aucun chiffre non calculé » vise les VALEURS, pas la
      // portée d'une interdiction que le livre écrit en clair.
      { key: "immobilise", name: "Immobilisé", levels: 0, quick: true, page: "p.55-58",
        forbids: [{ actions: ["seDeplacer", "sprinter"], why: "les pieds sont rivés au sol" }], lines: [
        "Déplacement impossible",
        "−3 au SO · −3 dés aux attaques",
        "Réaction réduite à 0 pour les tests de défense",
      ] },
      { key: "invisible", name: "Invisible", levels: null, page: "p.55-58", lines: [
        "Repéré sur une réussite de Perception (seuil = niveau)",
        "Les caméras et détecteurs inorganiques voient normalement",
        "Version supérieure : les appareils sont affectés aussi",
      ] },
      // Test de DÉBUT de round : l'app le rappelle et offre le jet, elle ne
      // lit pas le résultat (« échec : impossible d'agir » est un arbitrage,
      // pas une soustraction — cf. ce qu'E3 refuse d'automatiser).
      // MALUS DE BUDGET (F3) — mécanique distincte de la surtaxe : ce n'est pas
      // une action qui coûte plus, c'est le TOUR qui en contient une de moins.
      // Le livre : « S'ils échouent, ils ne peuvent agir au cours de ce round.
      // S'ils réussissent, ils peuvent agir, mais PERDENT UNE ACTION MINEURE. »
      //
      // Retrancher le jeton d'office est conditionnel au jet — donc en dehors
      // de ce qu'E3 automatise — SAUF que la branche « échec » est STRICTEMENT
      // PIRE : elle retire toutes les actions. Le −1 mineure est donc un
      // PLANCHER, jamais une largesse : l'app ne peut pas accorder plus que le
      // livre, seulement moins. C'est ce qui le rend applicable sans lire le
      // résultat du jet, que le bilan de round (E3b) propose déjà par ailleurs.
      { key: "nauseeux", name: "Nauséeux", levels: 0, page: "p.55-58",
        roundTest: { when: "startOfRound", pool: ["CON", "VOL"], threshold: 2 },
        budgetMalus: [{ key: "minor", n: 1 }], lines: [
        "Début de round : test Constitution + Volonté (2)",
        "Échec : impossible d'agir ce round",
        "Réussite : −1 action mineure",
      ] },
      { key: "panique", name: "Paniqué", levels: 0, page: "p.55-58",
        halts: { why: "aucune action cohérente", except: "éviter la source de l'état" }, lines: [
        "Aucune action possible, sauf pour éviter la source de l'état",
      ] },
      // `cancelsDamaging` et non un `cancels` en dur : le livre (p.57) écrit
      // « Cela annule tout autre état infligeant des dommages QUE POURRAIT
      // SUBIR LE PERSONNAGE » — une CATÉGORIE, pas une liste. Les quatre
      // concernés aujourd'hui (Enflammé, Empoisonné, Corrodé, Sanguinolent)
      // sont exactement ceux qui déclarent un `periodic` ; les nommer ici les
      // aurait figés, et le cinquième qu'un supplément ajoutera serait passé au
      // travers en silence. `Statuses.set` résout la catégorie contre le
      // catalogue de l'édition du PNJ. « Annule » = retire, à ne pas confondre
      // avec Figé, dont le livre dit « SUSPENDUS » (et qui reste du texte :
      // suspendre puis rendre est une autre mécanique, pas celle-ci).
      { key: "petrifie", name: "Pétrifié", levels: 0, page: "p.55-58",
        cancelsDamaging: true,
        halts: { why: "le personnage est transformé en matériau solide" }, lines: [
        "Aucune action possible",
        "+10 à l'indice d'Armure",
        "Annule tout autre état infligeant des dommages",
      ] },
      { key: "silencieux", name: "Silencieux", levels: null, page: "p.55-58", lines: [
        "Repéré sur une réussite de Perception (seuil = niveau)",
        "Les micros et détecteurs inorganiques entendent normalement",
        "Version supérieure : les appareils sont affectés aussi",
      ] },
      // CT-4 (tranché par l'utilisateur le 2026-07-31 : Surprise oui, Port non
      // — Port est descriptif, il n'a rien à motoriser).
      //
      // ⚠ Surprise N'EST PAS dans le chapitre des états (p.55-58) : elle vit
      // p.112, côté Initiative. Elle entre quand même au catalogue, et le
      // précédent est dans la maison — SR5 porte son propre `surpris` sourcé
      // « p.193-194 », soit son chapitre Combat. Un état est ici ce que le MJ
      // POSE sur une ligne, pas une section de sommaire.
      //
      // `halts` et non `forbids` : le livre n'interdit aucune action NOMMÉE, il
      // dit « ils ne peuvent pas agir » avec une liste blanche (se défendre,
      // encaisser). C'est exactement la frontière posée en F3b — `forbids`
      // grise une puce que le livre désigne, `halts` pose un rappel en tête de
      // feuille et ne grise RIEN, parce que la liste blanche est un arbitrage.
      //
      // `until: "round"` : le livre borne l'effet au PREMIER round de combat
      // (« une fois le premier round terminé, ils peuvent agir normalement »),
      // ce qui est l'unité de tour de SR6 — pas besoin de l'échelle de portées
      // qu'exigeait le Surpris SR5, borné lui à la passe.
      //
      // « Ne peut pas dépenser d'Atout » reste du TEXTE : aucun canal ne bloque
      // l'Atout aujourd'hui, et le catalogue affiche sans appliquer tant que la
      // mécanique n'existe pas (doctrine E1). Ne pas inventer le canal ici.
      //
      // Le test qui détermine la surprise (Réaction + Intuition, seuil 3) n'est
      // PAS motorisé : c'est un jet d'ouverture de scène que l'app ne tient pas,
      // et les embusqués ne le lancent même pas. Il est dit, le MJ le fait.
      { key: "surpris", name: "Surpris", levels: 0, quick: true, page: "p.112", until: "round",
        halts: { why: "surpris, le personnage ne peut pas agir de son propre chef", except: "se défendre contre les attaques, encaisser les dommages" }, lines: [
        "Test pour l'éviter : Réaction + Intuition (3) — les embusqués ne le lancent pas",
        "Lance son initiative et prend son rang, mais n'agit pas du premier round",
        "Ne peut pas dépenser de points d'Atout pendant ce round",
        "Se défend et encaisse normalement — seules les actions de son propre chef sont refusées",
        "Le premier round terminé, il agit normalement",
      ] },
      { key: "trempe", name: "Trempé", levels: 0, page: "p.55-58",
        cancels: ["enflamme"], cancelledBy: ["enflamme"], lines: [
        "−6 dés pour résister aux dommages de froid et d'électricité",
        "Annule et est annulé par Enflammé · peut affecter Corrodé",
      ] },
      { key: "embrume", name: "Embrumé", levels: 0, page: "p.55-58", lines: [
        "Passage physique ↔ astral impossible (projection, manifestation)",
        "Perception astrale toujours possible",
      ] },
      // ── Hors livre de base : suppléments, source = jeu de cartes officiel ──
      { key: "desequilibre", name: "Déséquilibré", levels: 0, page: "Cartes d'états A02", lines: [
        "Pas de dépense d'Atout sur une action d'attribut physique ni en défense",
        "À terre en cas de complication sur ces actions",
        "Persiste jusqu'à une action mineure pour retrouver l'équilibre",
      ] },
      // SURTAXE CONDITIONNELLE (F3) : `auto: false`. Le livre dit « les actions
      // […] IMPLIQUANT LE MEMBRE », et l'app ne sait pas quel membre une action
      // mobilise — Se déplacer implique une jambe, Recharger implique deux bras,
      // Observer attentivement n'implique rien. Deviner à la place du MJ serait
      // décider ; l'app SIGNALE la surtaxe sur les actions qu'elle pourrait
      // frapper et laisse le geste au MJ (jetons tappables un par un).
      // Même arbitrage qu'E3 pour « Aveuglé −3 aux tests liés à la vision ».
      { key: "estropie", name: "Estropié", levels: 3, page: "Cartes d'états A02",
        surcharge: { auto: false, why: "si l'action implique le membre estropié", rules: [
          { minLevel: 1, group: "minor", cost: [{ key: "minor", n: 1 }],
            why: "une action mineure impliquant le membre" },
          { minLevel: 2, group: "major", cost: [{ key: "minor", n: 1 }],
            why: "une action majeure impliquant le membre" },
        ] },
        lines: [
        "I : les actions mineures impliquant le membre en coûtent deux",
        "II : + les actions majeures impliquant le membre coûtent une mineure de plus",
        "III : + Entravé si jambe ; si bras, −4 dés aux tests de compétence l'utilisant",
      ] },
      { key: "muet", name: "Muet", levels: 0, page: "Cartes d'états A02", lines: [
        "Perte de la communication orale (signes, texto… restent possibles)",
        "Le MJ décide si des compétences comme Influence sont empêchées",
      ] },
      // `resisted: false` — le livre dit « 1P NON RÉSISTÉ ». Pas de jet à
      // proposer : le chiffre est déjà net, donc directement applicable au
      // moniteur (qui n'accepte que du net). Seul état du catalogue dans ce cas.
      { key: "sanguinolent", name: "Sanguinolent", levels: null, page: "Cartes d'états A02",
        periodic: { when: "endOfRound", vd: 1, type: "phys", resisted: false }, lines: [
        "1P NON RÉSISTÉ à chaque fin de round, pendant (niveau) unités de temps",
        "Annulé par un traitement médical (Premiers soins, médikit, Soins)",
      ] },
      { key: "paralyse", name: "Paralysé", levels: 0, page: "Cartes d'états A02", lines: [
        "Déplacement impossible · tests de défense impossibles",
        "−10 au SD contre les attaques (minimum 0)",
        "Actions permises : Perception, communication mentale, résistance aux dommages",
      ] },
    ],
  },
  /** Règles de round pour le tracker de combat. SR6 : l'initiative est
      relancée à chaque round mais il n'y a plus de passes d'initiative
      (une seule passe par round, p.44) → `passDecrement: 0`. */
  /** edgeTracker : SR6 pilote l'Atout en combat (rangée de 7 jetons sur
      la fiche active, gain plafonné à +2/tour de personnage, p.50). Le tracker
      lit ce drapeau, jamais une branche d'édition. */
  combatModel: { rerollEachRound: true, passDecrement: 0, edgeTracker: true, hasSoak: true },

  /* ========================================================
     COURSE-POURSUITE (moteur ⇉) — « À tombeau ouvert », L'avantage du
     rigger, p. 173-180. **Le seul système complet du corpus**, et le seul
     qui règle explicitement les poursuites À PIED : le chapitre ouvre en
     disant que les règles véhicule s'y appliquent, « seule une mention
     explicite fait foi » pour les adaptations.

     Ce que ce contrat porte, et que les trois autres éditions n'ont pas :
     un test OBLIGATOIRE par round, un attribut COMPARÉ qui change avec
     l'environnement, et une réserve dédiée. Cf. `js/rules/chase.js`.
     ======================================================== */

  /* ========================================================
     DÉPLACEMENT À PIED (lot P7) — SR6 p. 48

     ⚠ **SR6 est FORFAITAIRE**, et c'est l'écart le plus net avec SR5 : le
     livre ne fait varier la distance ni par métatype, ni par Agilité. Deux
     actions, deux nombres fixes :

       · « Un personnage peut utiliser cette action mineure pour se déplacer
         de 10 mètres. Une seule action Se déplacer est autorisée par tour. »
       · « Un personnage peut Sprinter avec une action majeure. Le déplacement
         de base est de 15 mètres et il est augmenté de 1 mètre par succès
         obtenu à un test d'Athlétisme + Agilité. »

     Il n'y a donc PAS de palier « course » intermédiaire en SR6, et les
     métavariantes de cette édition ne chiffrent aucun déplacement propre. Le
     contrat de `movement.js` est une LISTE de paliers précisément pour que
     cette table-là puisse n'en déclarer que deux, au lieu de remplir un
     troisième champ avec un chiffre que personne n'a écrit.
     ======================================================== */
  movementModel: {
    unit: "m",
    note: "une seule action Se déplacer par tour ; Sprinter n'est combinable ni avec Se déplacer ni avec Éviter",
    /** Les deux états du livre qui touchent la vitesse à pied — cf.
        `statusRates` plus bas, qui dit COMMENT. */
    statusKeys: ["fatigue", "entrave"],
    /** Forfaitaire pour les métahumains — le livre ne distingue AUCUN métatype
        (10 m / 15 m pour tout le monde), contrairement à SR5.
        En revanche les CRÉATURES ont bien un déplacement propre, en mètres
        ABSOLUS (« DÉPLACEMENT 10/25/+2 », p.220-223) : quand `racial` en porte
        un (`abs`), il l'emporte — un grand félin ne court pas à 15 m. */
    rates(pnj, { racial } = {}) {
      if (racial && racial.abs) {
        return {
          unit: "m",
          note: this.note,
          steps: [
            { key: "deplacer", label: "Se déplacer", value: racial.walk, note: "action mineure" },
            { key: "sprinter", label: "Sprinter", value: racial.run, note: "action majeure" },
          ],
          sprint: {
            perHit: racial.sprint,
            label: `Sprint : +${racial.sprint} m par succès d'Athlétisme + AGI`,
          },
        };
      }
      return {
        unit: "m",
        note: this.note,
        steps: [
          { key: "deplacer", label: "Se déplacer", value: 10, note: "action mineure" },
          { key: "sprinter", label: "Sprinter", value: 15, note: "action majeure" },
        ],
        sprint: { perHit: 1, label: "Sprint : +1 m par succès d'Athlétisme + AGI" },
      };
    },
    /** Deux états du livre touchent la vitesse à pied, et ils la touchent
        différemment : Fatigué la FIXE (« Vitesse : 5 m (marche), 10 m
        (sprint) »), Entravé la DIVISE (« divisée par 2, arrondi au
        supérieur »). L'app les lit, elle ne les invente pas — et elle dit
        d'où vient le chiffre, parce qu'un 5 sans cause se lit comme un bug. */
    statusRates(base, statuses) {
      const a = (k) => (statuses || []).includes(k);
      if (!a("fatigue") && !a("entrave")) return null;
      let steps = base.steps;
      let cause = "";
      if (a("fatigue")) {
        steps = [
          { ...steps[0], value: 5 },
          { ...steps[1], value: 10 },
        ];
        cause = "Fatigué";
      }
      if (a("entrave")) {
        steps = steps.map((s) => ({ ...s, value: Math.ceil(s.value / 2) }));
        cause = cause ? `${cause} + Entravé` : "Entravé";
      }
      return { ...base, steps, capped: cause, note: `${cause} — ${base.note}` };
    },
    sprintSpec(pnj) {
      const skills = (pnj && pnj.skills) || [];
      const s = skills.find((k) => k && /athl|course|sprint/i.test(k.name || ""));
      const rank = s ? Number(s.rank != null ? s.rank : s.val) || 0 : null;
      if (rank == null) return null;
      const attr = (k) => (typeof Actor !== "undefined" ? Actor.attr(pnj, k) : 0) || 0;
      return {
        pool: rank + attr("AGI"),
        label: "Athlétisme + AGI",
        action: "1 majeure",
        maxTests: 1, // « il ne peut utiliser qu'une seule action Sprinter à son tour »
      };
    },
  },

  chaseModel: {
    glyph: "⇉",
    defaultTerrain: "vehicule",
    terrains: {
      pied: {
        label: "À pied",
        // Action majeure Sprinter, Athlétisme + Agilité. Le seuil vient de
        // l'environnement (0 / 3 / 4), pas de la Maniabilité d'un engin.
        testLabel: "Athlétisme + AGI (Sprinter)",
      },
      vehicule: {
        label: "En véhicule",
        // Action majeure Pilotage ; le seuil est la Maniabilité du véhicule,
        // modifiée par l'environnement (−2 / 0 / +1), et c'est la Maniabilité
        // HORS ROUTE dès qu'on quitte le bitume — d'où `maniaHors` au
        // catalogue (lot P0).
        testLabel: "Pilotage + RÉA",
      },
    },
    /** Les catégories de distance sont RELATIVES à la cible de la
        course-poursuite (« toutes les autres positions sont définies selon
        la sienne »). Les mètres ne sont donnés qu'à titre indicatif : le
        livre dit qu'on n'a besoin que des catégories. */
    lanes: [
      { key: "proche", label: "Proche", hint: { vehicule: "≤ 10 m", pied: "≤ 3 m" } },
      { key: "courte", label: "Courte", hint: { vehicule: "11-50 m", pied: "4-50 m" } },
      { key: "moyenne", label: "Moyenne", hint: { all: "51-250 m" } },
      { key: "longue", label: "Longue", hint: { all: "251-500 m" } },
      { key: "extreme", label: "Extrême", hint: { all: "> 500 m" } },
    ],
    /** Trois environnements, chacun avec SES trois effets — c'est lui qui
        décide de l'attribut comparé, du modificateur de Maniabilité et du
        prix d'un échec. En dégagé et étroit, réussir donne l'avantage
        positionnel ; en encombré, échouer coûte un test d'Accident (4E à
        pied, résistables avec la Constitution). */
    envs: [
      {
        key: "degage", label: "Dégagé", maniaMod: -2, footThreshold: 0,
        examples: "autoroutes, ciel dégagé, grands espaces",
        onFail: null,
      },
      {
        key: "etroit", label: "Étroit", maniaMod: 0, footThreshold: 3,
        examples: "boulevards urbains, vol entre les tours, intérieurs",
        onFail: null,
      },
      {
        key: "encombre", label: "Encombré", maniaMod: 1, footThreshold: 4,
        examples: "embouteillages, ruelles, foules, forêts denses",
        onFail: { vehicule: "test d'Accident", pied: "4E (résistance CON)" },
      },
    ],
    /** L'attribut COMPARÉ du round : le plus haut gagne 1 point d'Atout
        (un seul, le MJ arbitre en cas d'égalité). `optional` reste absent
        ici — la règle n'est pas optionnelle en SR6. */
    attr(envKey, terrain) {
      const vehicule = terrain !== "pied";
      if (envKey === "encombre")
        return vehicule
          ? { short: "ACC", label: "Accélération", meaning: "+1 point d'Atout" }
          : { short: "AGI", label: "Agilité", meaning: "+1 point d'Atout" };
      return vehicule
        ? { short: "IdV", label: "Intervalle de vitesse", meaning: "+1 point d'Atout" }
        : envKey === "degage"
          ? { short: "FOR", label: "Force", meaning: "+1 point d'Atout" }
          : { short: "AGI", label: "Agilité", meaning: "+1 point d'Atout" };
    },
    /** Valeur de cet attribut sur la fiche — ou `undefined` quand l'app ne
        la tient PAS du livre, ce qui arrive deux fois :
          · un PJ léger n'a ni Agilité ni Force (son bloc de table ne porte
            que l'initiative, la défense, la perception et la volonté) ;
          · un véhicule venu d'un autre ouvrage n'a pas encore d'Intervalle
            de vitesse au catalogue (lot P0 : livre de base seulement).
        Dans les deux cas la piste écrit « — » et propose la saisie. */
    attrValue(pnj, { terrain, env, ride } = {}) {
      if (terrain === "pied") {
        const key = env === "degage" ? "FOR" : "AGI";
        const v = typeof Actor !== "undefined" ? Actor.attr(pnj, key) : null;
        return Number.isFinite(v) && v > 0 ? v : undefined;
      }
      const s = (this._engin(pnj, ride) || {}).stats || null;
      if (!s) return undefined;
      const v = env === "encombre" ? s.accel : s.intervalle;
      return Number.isFinite(v) ? v : undefined;
    },
    /** L'engin dont on lit les caractéristiques (lot P6).

        `ride` — la monture DÉCLARÉE sur la piste — l'emporte, parce qu'elle
        est la seule à savoir qu'on a sauté dans un taxi qui n'appartient à
        personne, ou que trois runners partagent la même bagnole.

        Sans elle, on garde le repli d'origine : le premier véhicule déployé
        depuis l'ÉQUIPEMENT du participant. Il reste juste pour le rigger qui
        joue sa propre moto et n'a rien eu à déclarer. */
    _engin(pnj, ride) {
      if (ride) return ride;
      if (typeof Vehicles === "undefined" || !pnj) return null;
      const liste = Vehicles.linkedTo(pnj.id) || [];
      return liste.find((v) => v.deployed) || liste[0] || null;
    },
    /** Le seuil du test de Pilotage : Maniabilité du véhicule (hors route
        dès que l'environnement l'est), plus le modificateur d'environnement.
        À pied, c'est le seuil d'Athlétisme de l'environnement. */
    threshold(pnj, { terrain, env, ride } = {}) {
      const e = this.envs.find((x) => x.key === env) || null;
      if (terrain === "pied") return e ? e.footThreshold : null;
      const s = (this._engin(pnj, ride) || {}).stats || null;
      if (!s) return null;
      const base = env === "encombre" && Number.isFinite(s.maniaHors) ? s.maniaHors : s.mania;
      return Number.isFinite(base) ? Math.max(0, base + (e ? e.maniaMod : 0)) : null;
    },
    /** Réserve du test du round. Recherche TOLÉRANTE de la compétence (les
        fiches n'écrivent pas toutes le même libellé) et `null` dès qu'elle
        manque — un PJ léger n'a pas de compétences : il annonce, l'app ne
        fabrique pas une réserve. */
    testPool(pnj, { terrain } = {}) {
      const skills = (pnj && pnj.skills) || [];
      const rank = (re) => {
        const s = skills.find((k) => k && re.test(k.name || ""));
        return s ? Number(s.rank != null ? s.rank : s.val) || 0 : null;
      };
      const attr = (k) => (typeof Actor !== "undefined" ? Actor.attr(pnj, k) : 0) || 0;
      if (terrain === "pied") {
        const r = rank(/athl|course|sprint/i);
        return r == null ? null : { pool: r + attr("AGI"), label: "Athlétisme + AGI (Sprinter)" };
      }
      const r = rank(/pilotage|véhicule/i);
      return r == null ? null : { pool: r + attr("RÉA"), label: "Pilotage + RÉA" };
    },
    round: {
      /** Le seul du corpus à l'imposer : « une action majeure Pilotage est
          requise » / « une action majeure Sprinter est nécessaire à chaque
          round ». Ne pas le faire, c'est perdre la course-poursuite. */
      test: { required: true, cost: "1 majeure" },
      onSuccess: "positional",
      onSkip: "lost",
      move: { onSuccess: 1, targetMoves: false },
    },
    edge: {
      compare: true,
      /** « Tout véhicule avec un Intervalle de vitesse trois fois plus élevé
          qu'un autre obtient automatiquement un avantage positionnel et peut
          choisir sa position, quel que soit le résultat des tests. » */
      outclassFactor: 3,
      riggerPerTest: 1,
      chasePool: true,
      poolLabel: "Réserve ⇉",
      /** Les 14 actions d'Atout de poursuite (déjà au catalogue
          `edgeActionModel`) se filtrent par ce rôle. */
      roles: ["cible", "poursuivant"],
    },
    variants: ["course", "filature"],
    /* ---- LES TROIS MODES (lot P5) ------------------------------------
       « À tombeau ouvert » donne deux variantes à la course-poursuite, et
       elles ne demandent PAS un écran de plus : la course ne change que
       trois libellés, la filature change le rythme et les tests. Tout ce
       qui suit est déclaré ici pour que le rendu n'ait rien à deviner. */
    modes: {
      poursuite: { label: "Poursuite", counter: "Round", next: "Round suivant" },
      /** « Le participant en première position est considéré comme la cible
          de la course-poursuite, peu importe la situation. Pour pouvoir
          utiliser les actions d'Atout appliquées aux cibles, vous devez être
          premier. » → même composant, même rôle, autre nom. */
      course: {
        label: "Course",
        counter: "Tour",
        next: "Tour suivant",
        anchorLabel: "Meneur",
        hasTotal: true,
        note: "Le premier tient le rôle de cible — les actions d'Atout de cible lui sont réservées. Au dernier tour, tous ceux à distance proche refont un test pour la ligne d'arrivée.",
      },
      /** La filature n'est PAS une poursuite au ralenti : phases d'environ
          une minute (le MJ en fixe le nombre, moyenne 3), deux tests par
          phase, et un Atout qui change de camp selon l'environnement. La
          réserve de course-poursuite n'y est pas accessible. */
      filature: {
        label: "Filature",
        counter: "Phase",
        next: "Phase suivante",
        anchorLabel: "Cible filée",
        hasTotal: true,
        defaultTotal: 3,
        noPool: true,
        note: "Une phase ≈ 1 minute. Ce n'est pas un combat : s'il faut déterminer l'initiative, c'est qu'on est passé à la course-poursuite.",
        tests: [
          {
            key: "perception",
            label: "Perception ou Plein air (Pistage / Orientation)",
            threshold: "3 si la cible ne se méfie pas — sinon opposé à Furtivité + AGI",
            fail: "cible perdue de vue · Plein air (Pistage) seuil 6 pour reprendre la piste · deux échecs de suite : trace perdue",
          },
          {
            key: "furtivite",
            label: "Furtivité",
            threshold: "opposé à Perception + INT de la cible",
            fail: "succès nets de la cible : vous êtes pris la main dans le sac",
          },
        ],
        /** Qui gagne le point d'Atout, et qui a le droit d'en dépenser, par
            environnement — le livre en fait trois cas distincts. */
        edgeByEnv: {
          degage: {
            perception: "les traqueurs gagnent 1 point d'Atout",
            furtivite: "seule la cible peut gagner ou dépenser de l'Atout",
          },
          etroit: {
            perception: "la cible gagne 1 point d'Atout",
            furtivite: "—",
          },
          encombre: {
            perception: "la cible gagne 1 point d'Atout, et elle seule peut en gagner ou en dépenser",
            furtivite: "la cible ne peut ni gagner ni dépenser d'Atout",
          },
        },
        /** Le dé libre suit la DISTANCE, et il change de camp : « si les
            traqueurs les moins éloignés sont à distance proche ou courte,
            la cible obtient un dé libre ; s'ils restent éloignés ou à
            distance extrême, ce sont eux qui l'obtiennent. » */
        freeDie: { near: ["proche", "courte"], toTarget: true },
      },
    },
    outcomes: {
      poursuite: {
        caught: { label: "Rattrapé", cond: { all: "au contact : percuter, Auto-stop, mêlée" } },
        lost: {
          label: "Semé",
          cond: {
            vehicule: "accident, aucun test joué, ou « Fuite ! » à distance extrême",
            pied: "accident, aucun test joué, ou « Fuite ! » à distance moyenne ou plus",
          },
        },
      },
      /** Variante « course » : le livre dit que **le premier tient le rôle de
          cible**. Le composant ne change pas — seuls les libellés. */
      course: {
        caught: { label: "1ᵉʳ", cond: { all: "la place à prendre — dernier test à distance proche" } },
        lost: { label: "Hors course", cond: { all: "distancé" } },
      },
      filature: {
        caught: { label: "Repéré", cond: { all: "la cible obtient des succès nets sur votre Furtivité" } },
        lost: { label: "Perdue", cond: { all: "échec en Perception / Plein air — seuil 6 pour reprendre la piste" } },
      },
    },
  },
  /** AJUSTER (p.46) — jumeau du contrat SR5, avec TROIS différences que le
      livre écrit et qui interdisent de partager les valeurs :

      · `accuracy: 0` — SR6 n'a pas de Limite de succès. « Le personnage gagne
        un bonus de +1 dé », rien d'autre.
      · `max` = la Volonté ENTIÈRE (« le bonus maximum à la réserve de dés en
        utilisant cette action est égal à la Volonté du personnage »), là où
        SR5 la divise par deux.
      · `oncePerRound` — « cette action ne peut être choisie qu'une seule fois
        par round de combat ». SR5 laisse au contraire enchaîner les Ajuster
        dans la même phase.

      `breaksOnIdleTurn` et non `breaksOnOtherAction` : SR6 est BEAUCOUP plus
      permissif — « si le bonus n'est pas utilisé, il est toujours valable pour
      le prochain round de combat et peut donc être combiné avec des actions
      prises au cours de plusieurs rounds. Si un personnage utilise son tour de
      jeu SANS CHOISIR les actions Ajuster ou Attaquer, tout bonus issu de
      rounds précédents est perdu. » Le cumul ne se casse donc pas sur une
      autre action, mais sur un TOUR ENTIER passé sans viser ni attaquer. */
  aimModel: {
    key: "ajuster",
    dice: 1,
    accuracy: 0,
    max: (pnj) => Actor.attr(pnj, "VOL") || 0,
    maxLabel: "Volonté",
    oncePerRound: true,
    breaksOnIdleTurn: true,
    keepOn: ["ajuster", "attaquer"],
    page: "p.46",
  },
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
    /** Champs de stats affichés en pills (card) et édités (modal).

        `IdV` = Intervalle de vitesse. **N'était pas là**, et ce n'était pas
        un oubli de rendu mais un trou de DONNÉES : la fiche de véhicule SR6
        porte cinq caractéristiques de mouvement (Man route / Man hors route /
        Accél / Intervalle / Vitesse max), le catalogue n'en tenait que trois
        et demie. Lot P0 du chantier ⇉ (course-poursuite), qui en fait
        l'attribut COMPARÉ des environnements dégagé et étroit. Il sert aussi,
        hors poursuite, au malus de −1 dé par intervalle franchi.
        Le rendu filtre les valeurs nulles : un véhicule d'un autre ouvrage,
        qui ne le porte pas encore, n'affiche simplement pas la cellule. */
    statFields: [
      ["mania", "Man"],
      ["vitesse", "Vit"],
      ["intervalle", "IdV"],
      ["accel", "Acc"],
      ["structure", "Str"],
      ["blindage", "Blind"],
      ["pilote", "Auto"],
      ["senseurs", "Sens"],
    ],
    /** Champs supplémentaires édités (pas affichés en pill) :
        · `autosoft` — attaque autonome, distinct de l'autopilote (Riggers) ;
        · `maniaHors` — Maniabilité HORS ROUTE, la seconde valeur que le livre
          imprime sous « Mania. (route/hors route) ». Éditée mais pas en pill :
          elle ne concerne qu'une partie des engins (bateaux, aéronefs et
          plusieurs drones n'ont qu'une Maniabilité) et ne sert que quand on
          quitte le bitume. Son lecteur retombe sur `mania` quand elle manque. */
    formExtraFields: [
      ["autosoft", "Autosoft"],
      ["maniaHors", "Man hors route"],
    ],
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
  /** Malus de dés dû aux ÉTATS posés (lot E3) — miroir exact de `sustainMalus`
      : le contrat déclare que l'édition a la mécanique, le comptage neutre vit
      dans `Statuses.globalDiceMalus`. Seuls les états marqués `globalDice`
      comptent, c'est-à-dire ceux que le livre écrit « à toutes les actions » :
      Confus, Électrocuté, Fatigué, Frigorifié. Quatre sur vingt-huit. */
  statusMalus(pnj) {
    return Statuses.globalDiceMalus(pnj);
  },
  /** Malus d'initiative dû aux états posés — lu par `_rollInit`. */
  statusInitMalus(pnj) {
    return Statuses.initMalus(pnj);
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
    /** Descripteur de combat d'une CI (SR6), lu par le cockpit + les handlers de
        jet via Matrix.icCombat. « Toutes les CI utilisent indice×2 pour la
        majorité de leurs jets » (p.188) → attaque/défense/perception = indice×2.
        Encaissement = indice×2 aussi : on résiste aux dommages matriciels « avec
        Firewall » (p.180), sans règle de soak dédiée aux CI → on applique la
        convention CI indice×2 (et NON indice + Firewall, qui n'est pas au livre). */
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
    /* Topologie externe (schéma d'architecture, lot A) — lue par
       Matrix.topology* / TopologyGen. SR6 : chaîne + WAN (appareils asservis,
       corebook) + serveurs IMBRIQUÉS (Hacker Vaillant p.~133 « les serveurs
       imbriqués sont inclus les uns dans les autres », « un serveur de sécurité
       imbriqué dans un serveur public ») — l'imbrication distingue SR6 de SR5. */
    topology: {
      archetypes: [
        { id: "chain", label: "Chaîne de serveurs" },
        { id: "wan", label: "Serveur + appareils asservis (WAN)" },
        { id: "nested", label: "Serveurs imbriqués" },
      ],
      entryModes: [
        { id: "matrix", label: "Matrice publique", glyph: "◎" },
        { id: "direct", label: "Connexion directe (câble)", glyph: "⎇" },
      ],
      targetLabel: "fichiers (Archive)",
      nodeBadge(srv) {
        const a = srv.attrs || {};
        return `Ind. ${srv.indice} · A${a.attack} C${a.sleaze} T${a.dataProcessing} F${a.firewall}`;
      },
    },

    /* Fondations du serveur (lot B, donjon de 7 nœuds) — lues par
       Matrix.foundation* / FoundationView. Données SOURCÉES : Hacker Vaillant VF
       « Au cœur des serveurs » p.137-142 (voir REFERENCE/FONDATIONS_SERVEUR_BT1.md).
       ⚠ SR6 oppose UNIFORMÉMENT `Indice × 2` (là où SR5 oppose `Indice + attribut
       spécifique`, mapping attribut→Fondation swappé) : les chaînes `roll` sont
       écrites ICI, jamais composées par un accesseur neutre. Seuil de Variance
       SR6 = 80 − 5×Indice (≠ « 5×Indice »). hasFoundation ABSENT en Anarchy. */
    hasFoundation: true,
    foundation: {
      entryText:
        "Entrer via cyberdeck / cyberjack / persona incarné ; protocole Nexus " +
        "(« Livre d'argent », Dispo 6(I), 1 000¥) pour une plongée UV emmenant des " +
        "autostoppeurs. Poser une ancre au portail verrouille le paradigme.",
      paradigmHint:
        "Le paradigme EST le mécanisme de défense : agir hors-thème monte la Variance. " +
        "Réutilise la sculpture du serveur ci-dessus.",
      varianceNote:
        "Variance : chaque test opposé réussi contre les Fondations ajoute des Points " +
        "de variance. Alerte à partir de 80 − (5 × Indice du serveur) ; en alerte, les " +
        "Fondations attaquent chaque avatar chaque round (réserve Indice × 2, dégâts " +
        "physiques ½ Indice).",
      /** Seuil d'alerte, BT1 § 1.c (Hacker Vaillant p.139) : 80 − 5×Indice. */
      varianceThreshold(indice) {
        return 80 - 5 * indice;
      },
      /** Pistes stables du donjon (BT1 § 2, Hacker Vaillant p.139-142) —
          squelette fixe : Échafaudage/Sécurité/Régie sont chacun reliés aux
          2 AUTRES nœuds opérationnels (il n'y en a que 2 sur 3, donc rien
          à tirer au hasard malgré la formulation « 2 nœuds opérationnels »
          du livre). Table 2D6 d'orientation des pistes = arbitrage MJ en
          direct, jamais motorisée ici. */
      edges: [
        { from: "portail", to: "archive" },
        { from: "portail", to: "vide" },
        { from: "archive", to: "echafaudage" },
        { from: "archive", to: "securite" },
        { from: "archive", to: "regie" },
        { from: "echafaudage", to: "controle" },
        { from: "securite", to: "controle" },
        { from: "regie", to: "controle" },
        { from: "echafaudage", to: "securite" },
        { from: "echafaudage", to: "regie" },
        { from: "securite", to: "regie" },
        { from: "controle", to: "vide" },
      ],
      nodes: [
        {
          id: "portail",
          label: "Le Portail",
          role: "Principal point de sortie ; on y pose l'ancre qui verrouille le paradigme.",
          actions: [
            { name: "Créer une ancre", roll: "Électronique + Logique vs Indice × 2", effect: "Empêche le changement de paradigme ; succès nets pour maquiller/renforcer." },
            { name: "Détruire une ancre", roll: "Perception matricielle (seuil 1 / succès nets) puis attaque (réserve Indice × 2 + succès nets)." },
            { name: "Sortir des Fondations", roll: "Piratage + Intuition vs Indice × 2" },
          ],
        },
        {
          id: "archive",
          label: "L'Archive",
          role: "Fichiers stockés à l'abri. Pistes stables : Portail, Échafaudage, Régie, Sécurité.",
          actions: [
            { name: "Trouver un fichier", roll: "Électronique + Logique vs Indice × 2" },
            { name: "Copier un fichier", roll: "Électronique + Logique vs Indice × 2", effect: "Copie sans protection." },
            { name: "Éditer un fichier", roll: "Piratage + Logique vs Indice × 2", effect: "Modification indétectable." },
            { name: "Effacer un fichier", roll: "Électronique + Logique vs Indice × 2", effect: "Sans laisser de trace." },
          ],
        },
        {
          id: "echafaudage",
          label: "L'Échafaudage",
          role: "Niveaux supérieurs du serveur. Pistes : Archive, Centre de contrôle, 2 opérationnels.",
          actions: [
            { name: "Observer le serveur", roll: "Électronique + Intuition vs Indice × 2" },
            { name: "Éditer la sculpture du serveur", roll: "Électronique + Logique vs Indice × 2", effect: "1 détail modifié par succès net." },
            { name: "Rebooter le serveur", roll: "Piratage + Logique vs Indice × 2", effect: "Éjecte les personas ; redémarre en (succès nets) minutes." },
          ],
        },
        {
          id: "securite",
          label: "Le Nœud de sécurité",
          role: "CI et systèmes de sécurité. Pistes : Archive, Centre de contrôle, 2 opérationnels.",
          actions: [
            { name: "Déployer une CI", roll: "Piratage + Intuition vs Indice × 2", effect: "1 CI par succès net." },
            { name: "Rappeler une CI", roll: "Piratage + Intuition vs Indice × 2" },
            { name: "Reconfigurer les CI", roll: "Électronique (Logiciels) + Intuition vs Indice × 2", effect: "Change l'ordre de déploiement." },
          ],
        },
        {
          id: "regie",
          label: "La Régie d'asservissement",
          role: "Appareils liés au serveur. Pistes : Archive, Centre de contrôle, 2 opérationnels.",
          actions: [
            { name: "Trouver un appareil", roll: "Électronique + Logique vs Indice × 2" },
            { name: "Contrôler un appareil lié", roll: "Piratage (Guerre électronique) + Logique vs Indice × 2", effect: "Remise d'Atout de 1 pour ce test." },
            { name: "Bricker un appareil lié", roll: "Piratage (Cybercombat) + Logique vs Indice × 2", effect: "Cases de moniteur = 2 × succès nets." },
          ],
        },
        {
          id: "controle",
          label: "Le Centre de contrôle",
          role: "Contrôle toutes les fonctions des Fondations. Pistes : Nœud vide + 3 autres.",
          actions: [
            { name: "Altérer la réalité des Fondations", roll: "Électronique + Intuition vs Indice × 2", effect: "Ajoute/retire/altère une phrase du paradigme." },
            { name: "Cartographie des Fondations", roll: "Électronique + Logique vs Indice × 2", effect: "Révèle nom/emplacement/pistes d'1 nœud par succès net." },
            { name: "Voyager", roll: "Électronique + Logique vs Indice × 2", effect: "Ouvre une piste double sens temporaire / modifie un statut de piste." },
            { name: "Calmer la bête", roll: "Piratage + Logique vs Indice × 2", effect: "− 5 points de variance par succès net." },
            { name: "Détruire le serveur", roll: "Piratage (Cybercombat) + Logique vs Indice × 2", effect: "Série de tests d'une traite." },
            { name: "Configurer les attributs du serveur", roll: "Électronique + Logique vs Indice × 2", effect: "Intervertit l'Indice de deux attributs." },
          ],
        },
        {
          id: "vide",
          label: "Le Nœud vide",
          role: "Source d'énergie et entrée vers les Abysses des Fondations. La variance y est doublée.",
          actions: [
            { name: "Entrer dans les Abysses des Fondations", roll: "Test étendu Électronique + Logique (12, 1 round de combat)" },
          ],
        },
      ],
    },
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
       dommages matriciels que SR5, VD = indice d'Attaque).

       `actionKey` (lot G2) — la CLÉ DU CATALOGUE que cette ligne débite quand
       on la tape. Miroir de `fireModes[].actionKey`. L'en-tête d'`actionModel`
       ci-dessus assumait le chevauchement de ces quatre gestes (« c'est voulu,
       ce sont deux facettes du même geste ») ; l'arbitrage tenait tant que les
       deux facettes coûtaient pareil. Elles ne coûtaient pas pareil : celle-ci
       était GRATUITE. Le râtelier débite désormais, et la facette de la feuille
       s'efface (`via: "matrice"`) — un geste, une porte, un prix. */
    actions: [
      {
        key: "spike",
        actionKey: "mxPicDonnees",
        name: "Pic de données",
        type: "attack",
        page: 184,
        pool: (d) => (d.attrs || {}).attack || 0,
        dv: (d) => (d.attrs || {}).attack || 0,
      },
      {
        key: "forceaccess",
        actionKey: "mxForcerAcces",
        name: "Forcer l'accès",
        type: "access",
        page: 183,
        pool: (d) => (d.attrs || {}).attack || 0,
        dv: () => null,
      },
      {
        key: "probeaccess",
        actionKey: "mxSonderAcces",
        name: "Sonder l'accès",
        type: "access",
        page: 186,
        pool: (d) => (d.attrs || {}).sleaze || 0,
        dv: () => null,
      },
      {
        key: "crash",
        actionKey: "mxPlanterProgramme",
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
      // « TR courte » cassait la lecture des modes (le segment doit ne contenir
      // QUE des modes) : l'arme perdait SA et TR d'un seul mot. La restriction
      // n'est pas perdue pour autant — elle se CALCULE désormais : le chargeur à
      // 2 cartouches affiche « 2/4 » terni sur les deux rafales (vérifié).
      "PJSS Model 55 [Shotgun, VD 4P, SO 3/12/8/-/-, SA/TR, 2(cb)]",
      "Remington Roomsweeper [Shotgun, VD 5P, SO 9/8/4/-/-, SA, 8(m)]",
      "Defiance T-250 (canon court) [Shotgun, VD 3P, SO 8/8/4/-/-, CC/SA, 5(m), canon court]",
    ],
    // Tasers (absents de la sélection initiale, catégorie électrique dédiée).
    tasers: [
      "Defiance Super Shock [Taser, VD 6E(e), SO 10/6/-/-/-, CC, 4(m), portée max 20m]",
      "Yamaha Pulsar I/II [Taser, VD 4E(e), SO 9/9/-/-/-, SA, 4(m), portée max 20m]",
    ],
    // Armes de jet/trait (absentes de la sélection initiale, p.260-268).
    //
    // ⚠ AUCUNE CAPACITÉ ICI, ET C'EST LA TABLE QUI LE DIT. La table « ARMES DE
    // JET/DE TRAIT » du livre a cinq colonnes — ARME | VD | SCORES OFFENSIFS |
    // DISPONIBILITÉ | COÛT — là où celle des armes à feu en a six, avec une
    // colonne MUNITIONS entre les Scores Offensifs et la Disponibilité. Une
    // arbalète n'a donc ni mode de tir ni chargeur : elle se recharge carreau
    // par carreau, et le livre compte ça en actions, pas en magasin.
    //
    // Les `3(m)` / `4(m)` / `2(m)` qui figuraient ici étaient la colonne
    // DISPONIBILITÉ prise pour une capacité — MÊME glissement d'un cran que le
    // `4(L)` du bloc `armesSupplement` (cf. son en-tête). Le livre écrit
    // « Arbalète, standard … 3 (L) » et « Arbalète, lourde … 4 (L) » en
    // Disponibilité : le `(L)` s'était perdu, le chiffre était resté.
    //
    // Conséquence dans l'app, et raison de ce correctif : `Ammo.capacity` les
    // faisait entrer dans `ammoWeapons`, donc le panneau d'attaque leur
    // affichait un chargeur — qui ne se vidait JAMAIS, faute de mode de tir
    // pour passer par `fire`. Retirer la fausse capacité éteint la surface
    // munitions pour ces armes, ce qui est exactement ce que le livre décrit.
    //
    // ⚠ Ne pas confondre avec les `(m)` LÉGITIMES des armes à feu (Defiance
    // T-250 5(m), Remington Roomsweeper 8(m), Yamaha Pulsar 4(m), Remington
    // 900 5(m)) : ceux-là sont dans la colonne MUNITIONS du livre, vérifiés.
    armesJet: [
      "Arbalète légère [VD 2P, SO 6/8/2/—/—]",
      "Arbalète standard [VD 3P, SO 2/10/4/2/—]",
      // SO corrigé au livre : la 3ᵉ bande vaut 6, pas 4 (transcription fautive).
      "Arbalète lourde [VD 4P, SO 2/8/6/4/—]",
      "Arc [VD 2P-4P selon indice, SO variable]",
      "Couteau de lancer [VD 2P, SO 10/9/3/—/—]",
      "Shuriken [VD 2P, SO 9/11/5/—/—]",
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
    //
    // ✔ PREMIÈRE MOITIÉ RECOUPÉE AU LIVRE (2026-07-31, jusqu'au Kit de
    // dissimulation). Le « Bazar de l'Hexagone » a été retrouvé et TOUTES ces
    // lignes portent désormais les valeurs de ses tables, plus aucune n'est
    // reconstruite. Ce que le recoupement a corrigé, une fois pour toutes :
    //   · trois SO avaient perdu un rang, exactement comme le prédisait la règle
    //     de corruption — Manurhin sniper `7/1/9/2` → `7/11/9/2`, Pilum
    //     `4/7/8/2/10` → `4/7/8/12/10`, Cartier `10/2` → `10/12` ; les PMAS-70
    //     et le Lille36 avaient perdu leur TROISIÈME bande (`8/7/—` → `8/7/6`)
    //   · huit TYPES étaient faux : le Gladius est une mitraillette (VD 3P,
    //     SA/TR) et non une mitrailleuse `VD 5A` — ce « A » n'a jamais existé,
    //     c'était la colonne voisine ; le Spatha est un fusil d'assaut carabine,
    //     le Pilum et le Manurhin sniper ne sont pas ce qu'on croyait
    //   · le FC-MAS n'a pas deux « configurations indécidables » : c'est un
    //     fusil de chasse à 3 canons, deux de calibre 12 (shotgun) et un de
    //     fusil, chacun avec sa ligne et son canon basculant `(cb)`
    //   · deux VD étaient celles de la ligne d'EN DESSOUS (LGAE ← Balle de
    //     Défense), deux capacités manquaient (Hecate 40(c), Cartier 1(cb))
    //   · `Dilacé` n'existe pas : c'est **Dikote**, et le kit de dissimulation
    //     coûte 600 € pour mitraillettes/shotguns, pas 400 €.
    // La seule chose NON transcrite est le SO de l'Espelette (`R+F/…`), cf. sa
    // ligne. La SECONDE moitié (à partir des Ares Light Fire) vient d'une autre
    // source et n'est pas concernée par ce recoupement.
    armesSupplement: [
      "Revolvers FN Manurhin MR2073 GIGN (canon court) [Pistolet lourd, VD 4P, SO 11/12/—/—/—, CC, 6(c)]",
      "Revolvers FN Manurhin MR2073 GIGN (classique) [Pistolet lourd, VD 4P, SO 9/11/8/—/—, CC, 6(c)]",
      "Revolvers FN Manurhin MR2073 GIGN (sniper) [Pistolet lourd, VD 4P, SO 7/11/9/2/—, CC, 6(c)]",
      "Pistolet Lourd FN FNPL-70 [Pistolet lourd, VD 3P, SO 7/9/9/—/—, SA, 15(c)]",
      "Pistolet Léger FN PPA-1 [Pistolet léger, VD 2P, SO 12/11/8/—/—, SA, 20(c)]",
      "Pistolet Léger Monobe PMAS-70 (normal) [Pistolet léger, VD 2P, SO 8/7/6/—/—, SA, 12(c)]",
      "Pistolet Léger Monobe PMAS-70 (version civile) [Pistolet léger, VD 2E, SO 8/7/6/—/—, SA, 12(c)]",
      "Lille36 [Pistolet léger, VD 2P, SO 8/8/6/—/—, SA, 11(c)]",
      // Deux LIGNES de la même table, et le livre les nomme : le FC-MAS est un
      // fusil de chasse à 3 canons — deux canons de calibre 12 (shotgun) sur le
      // dessus, un canon de fusil dessous. Ce ne sont donc pas deux
      // « configurations » indécidables mais les deux armes de l'objet.
      "Monobe FC-MAS (canons de calibre 12) [Shotgun, VD 4P, SO 4/10/6/—/—, CC, 2(cb)]",
      "Monobe FC-MAS (canon de fusil) [Fusil, VD 5P, SO 2/7/10/7/3, CC, 1(cb)]",
      // La VD dépend de la grenade chargée : le livre écrit « suivant grenade »
      // dans la colonne, et `VD 7E` était celle de la Balle de Défense (BDD),
      // la SECONDE ligne de la table — pas celle du lance-grenade.
      "Monobe LGAE (Lance-grenade anti-émeute) [Lance-grenades, VD selon la grenade, SO 4/8/8/3/—, SA, 6(c)]",
      "Monobe LGAE — Balle de Défense (BDD) [Munition de lance-grenade, VD 7E]",
      "Fusil d'Assaut Esprit/Dassault PAPOP IV [Fusil d'assaut, VD 4P, SO 6/11/8/7/2, SA/TR/TA, 40(c)]",
      "Fusil d'Assaut Esprit/Dassault PAPOP IV (Lance-grenade) [Lance-grenades, VD selon la grenade, SO 4/10/6/2/—, CC, 6(c)]",
      "Fusil de Précision PGM Hecate III F3 [Fusil de précision, VD 6P, SO 2/8/10/16/14, SA, 40(c)]",
      'Canon d\'Assaut GIAT Industries CCT "Ultima Ratio" [Canon d\'assaut, VD 7P, SO 1/9/10/10/6, SA/TR, 12(c)]',
      "Esprit Gladius [Mitraillette, VD 3P, SO 10/12/7/—/—, SA/TR, 30(c)]",
      "Esprit Pugio [Pistolet lourd, VD 3P, SO 11/9/5/—/—, SA, 14(c)]",
      "Esprit Spatha [Fusil d'assaut carabine, VD 5P, SO 8/12/7/5/—, SA/TR/TA, 35(c)]",
      "Esprit Hasta [Fusil d'assaut, VD 5P, SO 6/11/7/7/1, SA/TR/TA, 35(c)]",
      "Esprit Pilum [Fusil de précision, VD 5P, SO 4/7/8/12/10, SA, 15(c)]",
      "Pistolets de Duel Cartier [Pistolet lourd, VD 4P, SO 10/12/—/—/—, CC, 1(cb)]",
      "Rapière de Duel Hermès [Arme tranchante, VD 2P, SO 11+FOR/—/—/—/—]",
      "Canne à Systèmes Louis Vuitton (lame tranchante) [Arme tranchante, VD 3P, SO 7+FOR/—/—/—/—]",
      "Canne à Systèmes Louis Vuitton (fût contondant) [Arme contondante, VD 3E, SO 6+FOR/—/—/—/—]",
      "Canne à Systèmes Louis Vuitton (pistolet de poche) [Pistolet de poche, VD 2P, SO 8/8/—/—/—, CC/TR, 4(b)]",
      // SO du livre : `R+F/R+F-1/R+F-6/—/—` — NON transcrit dans la chaîne : ces
      // jetons ne sont résolus par aucune édition (contrairement à `+FOR`), le
      // parseur les rendrait tels quels sous le nom de l'arme. Effet et souffle
      // suffisent ici ; la réserve se calcule à la main.
      "Espelette (grenade toxine) [Effet: État Aveuglé I, État Désorienté & État Nauséeux, dégâts étourdissants, Souffle 5m]",
      // `Dilacé` était une lecture fautive de **Dikote** (le revêtement), porté
      // par la colonne MUNITIONS de la table. Plier/déplier = action mineure ;
      // bonus sans fil : une fois par round, sans dépenser d'action.
      "Pelle Pliante Multifonction Décathlon [Arme tranchante, VD 3P, SO 10+FOR/—/—/—/—, Dikote]",
      "Kit de Dissimulation d'Arme [Effet: dissimule une arme DÉMONTÉE (dissimulation +3, seuil 4 au détecteur d'anomalie magnétique); 300€ armes de poing, 600€ mitraillettes/shotguns]",
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

  /* ---- POUVOIRS PERMANENTS au bilan de round ------------------------------
     Un pouvoir n'est PAS un état : `Statuses.roundReport` ne parcourt que
     `Statuses.active`. Ce contrat est le second collecteur, lu par
     `Encounter._bilanDeRound`. Pur : il décrit, il n'applique rien — le
     panneau propose, le MJ tranche, comme pour les dégâts périodiques. ---- */
  creaturePowers: {
    /** Régénération — SR6 p. 232. « À la fin de chaque round de combat, si la
        créature a subi des dommages, elle effectue un test de Magie +
        Constitution, ajoute sa Constitution aux succès obtenus et récupère
        d'autant de cases » — Surplus, puis physique, puis étourdissant.
        Ne régénèrent PAS : cerveau (attaque ciblée à la tête), focus d'arme,
        Vulnérabilité, Drain. L'Allergie se soigne, mais aucun test tant que la
        créature touche l'allergène — d'où le rappel porté par la ligne. */
    /** Drain d'Essence — SR6 p. 228. Test ÉTENDU Charisme + Magie, seuil
        (10 − Essence de la cible), intervalle 1 minute ; interrompu, aucun
        point n'est drainé. La cible doit être physique, consciente de nature,
        et consentante ou maîtrisée — l'app ne vérifie pas ces conditions de
        fiction, elle les RAPPELLE. Une cible tombée à 0 meurt. Le draineur ne
        dépasse jamais le DOUBLE de son Essence naturelle ; au-delà, le point
        est perdu. La victime subit
        l'état Fatigué à un indice égal aux points drainés. */
    essenceDrain: {
      action: "Majeure",
      pool: ["CHA", "MAG"],
      threshold: (cible) => 10 - (Actor.attr(cible, "ESS") || 0),
      interval: "1 minute",
      fatigue: true,
      rappel: "cible physique, consciente de nature, consentante ou maîtrisée ; lien émotionnel focalisé sur le draineur",
      page: "SR6 p. 228",
    },
    roundLines(pnj, when) {
      if (when !== "endOfRound") return [];
      if (!Actor.hasPower(pnj, /r[ée]g[ée]n[ée]ration/i)) return [];
      if (!((pnj.physFilled || 0) > 0 || (pnj.stunFilled || 0) > 0)) return [];
      return [{
        kind: "pouvoir",
        name: "Régénération",
        pool: ["MAG", "CON"],
        effet: "soigne Constitution + succès — surplus, puis physique, puis étourdissant",
        rappel: "ni cerveau, ni focus d'arme, ni Vulnérabilité, ni Drain ; aucun test au contact d'un allergène",
      }];
    },
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
